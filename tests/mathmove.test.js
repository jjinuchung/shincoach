// 🔄 AB 평면도형의 이동 줄기 생성기 테스트: node --test tests/mathmove.test.js
//
// ★ 핵심은 **독립 검산** — 생성기가 알려 주는 값(probe)을 믿지 않고 **문제 글과 그림 지시문을 이 파일이 직접 읽어** 다시 움직인다.
//   · 칸 모양은 이 파일이 칸 좌표로 읽고, 뒤집기·돌리기는 **좌표를 바꿔서**(x → −x, (x, y) → (−y, x)) 한다 — 생성기는 줄 글을 뒤집고 돌린다
//   · 같은 모양인지는 칸 좌표를 왼쪽 위로 붙여 견준다 · 밀기는 칸 좌표를 그대로 옮겨 자리까지 견준다
//   · 디지털 숫자는 이 파일의 일곱 막대 표와 막대 자리 바꾸기(위↔아래 · 왼쪽↔오른쪽)로 다시 읽는다
// ★ 이름표는 값만이 아니라 **뜻**까지 — 그 틀린 생각을 문제의 그림으로 다시 해서 오답과 대조한다 (메모 stem-generator-pitfalls)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MOVE, TAGS, BASES, makeQuestion, makeRound, ladder, placeFrom, diagnosticSet, lessonOf, checkContent, gradeLabel } from '../js/mathmove.js';
import { tplKey } from '../js/mathgen.js';
import { figureSvg, renderFigures, figText } from '../js/mathdraw.js';
import { padSpec } from '../js/mathpad.js';

const OPTS = { names: ['피카츄', '리자몽', '개굴닌자'], me: '진우', worlds: { pokemon: [], toystory: [], minions: [], moana: [] } };
const SEEDS = Number(process.env.RNG_SEEDS) || 150;
const FIG_SEEDS = Number(process.env.FIG_SEEDS) || 20;
const IDS = MOVE.map((c) => c.id);
const LBL = ['㉠', '㉡', '㉢', '㉣'];

// ───────────────────── 이 파일의 읽기 도구 ─────────────────────

/** 칸 모양 글 → 칸 좌표 [[x, y]…] (x 오른쪽, y 아래쪽) — 두 꼴: "3.011110010" · "011/110/010" */
function cellsOf(val) {
  let rows;
  const m = /^(\d)\.([01]+)$/.exec(val);
  if (m) { rows = []; for (let i = 0; i < m[2].length; i += +m[1]) rows.push(m[2].slice(i, i + +m[1])); } else rows = val.split('/');
  const out = [];
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '1') out.push([x, y]); }));
  return out;
}
/** 왼쪽 위로 붙인 모양 열쇠 */
const norm = (cs) => { const x0 = Math.min(...cs.map((c) => c[0])); const y0 = Math.min(...cs.map((c) => c[1])); return cs.map(([x, y]) => [x - x0, y - y0]).sort((a, b) => a[1] - b[1] || a[0] - b[0]).map((c) => c.join(',')).join(' '); };
/** 자리까지 열쇠 */
const place = (cs) => [...cs].sort((a, b) => a[1] - b[1] || a[0] - b[0]).map((c) => c.join(',')).join(' ');
const T = {
  lr: (cs) => cs.map(([x, y]) => [-x, y]), // 왼쪽과 오른쪽이 바뀐다
  ud: (cs) => cs.map(([x, y]) => [x, -y]), // 위쪽과 아래쪽이 바뀐다
  cw: (cs) => cs.map(([x, y]) => [-y, x]), // 화면 좌표(y 아래쪽)에서 시계 방향 90°
};
/** 시계 방향 90° × k (음수면 시계 반대 방향) */
const turn = (cs, k) => { let o = cs; for (let i = 0; i < ((k % 4) + 4) % 4; i++) o = T.cw(o); return o; };
const KO = { 오른쪽: 'R', 왼쪽: 'L', 위쪽: 'U', 아래쪽: 'D' };
const NAME = { R: '오른쪽', L: '왼쪽', U: '위쪽', D: '아래쪽' };
const OPP = { R: 'L', L: 'R', U: 'D', D: 'U' };
const VEC = { R: [1, 0], L: [-1, 0], U: [0, -1], D: [0, 1] };
const flipBy = (d, cs) => (d === 'R' || d === 'L' ? T.lr(cs) : T.ud(cs));
const flipOther = (d, cs) => (d === 'R' || d === 'L' ? T.ud(cs) : T.lr(cs));
const shift = (cs, d, n) => cs.map(([x, y]) => [x + VEC[d][0] * n, y + VEC[d][1] * n]);
/** 모양을 자리(왼쪽 위 칸 x0, y0)에 놓기 */
const at = (cs, x0, y0) => { const n = norm(cs).split(' ').map((p) => p.split(',').map(Number)); return n.map(([x, y]) => [x + x0, y + y0]); };
const topLeft = (cs) => [Math.min(...cs.map((c) => c[0])), Math.min(...cs.map((c) => c[1]))];
/** 시계 방향 여부·각도 → 시계 방향 90° 횟수 */
const quarterOf = (dirKo, deg) => (dirKo === '시계 방향' ? 1 : -1) * (deg / 90);
/** 위쪽 부분이 가는 쪽 — 위쪽 칸 (0, −1)을 그만큼 돌려서 */
const topSide = (k) => { const [x, y] = turn([[0, -1]], k)[0]; return x > 0 ? '오른쪽' : x < 0 ? '왼쪽' : y > 0 ? '아래쪽' : '위쪽'; };

/** `[move …]` → { W, H, shapes:{처음:[cells 절대]…}, cands:{㉠:[cells]}, pts:{ㄱ:{x,y}} } */
function moveOf(arg) {
  const t = arg.trim().split(/\s+/);
  const [W, H] = t[0].split('x').map(Number);
  const out = { W, H, cm: t.includes('cm'), shapes: {}, cands: {}, pts: {} };
  for (const s of t.slice(1)) {
    if (s === 'cm') continue;
    let m;
    if ((m = /^(.+?)@(\d+),(\d+)=(.+)$/u.exec(s))) {
      const cs = cellsOf(m[4]).map(([x, y]) => [x + +m[2], y + +m[3]]);
      (LBL.includes(m[1]) ? out.cands : out.shapes)[m[1]] = cs;
    } else if ((m = /^(.)@(\d+),(\d+)$/u.exec(s))) out.pts[m[1]] = { x: +m[2], y: +m[3] };
  }
  return out;
}
/** `[shapes …]` → { 처음:[cells], ㉠:[cells], 4:'?' … } */
function shapesOf(arg) {
  const o = {};
  for (const s of arg.trim().split(/\s+/)) { const m = /^(.+?)=(.+)$/u.exec(s); o[m[1]] = m[2] === '?' ? '?' : cellsOf(m[2]); }
  return o;
}
const figsOf = (q) => [...String(q).matchAll(/\[(move|shapes|seg) ([^\]]+)\]/g)].map((m) => ({ kind: m[1], arg: m[2] }));
const firstLine = (q) => String(q).split('\n')[0];

// 디지털 숫자 — 이 파일의 표 (a 위 · b 오른쪽 위 · c 오른쪽 아래 · d 아래 · e 왼쪽 아래 · f 왼쪽 위 · g 가운데)
const SEG7 = { 0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
const SWAP = { ud: { a: 'd', d: 'a', b: 'c', c: 'b', f: 'e', e: 'f', g: 'g' }, lr: { b: 'f', f: 'b', c: 'e', e: 'c', a: 'a', d: 'd', g: 'g' } };
const segKey = (s) => [...s].sort().join('');
const digitOfSegs = (segs) => { const k = segKey(segs); const d = Object.keys(SEG7).find((x) => segKey(SEG7[x]) === k); return d === undefined ? null : +d; };
const segMove = (d, how) => {
  let s = [...SEG7[d]];
  if (how === 'ud' || how === 'turn') s = s.map((x) => SWAP.ud[x]);
  if (how === 'lr' || how === 'turn') s = s.map((x) => SWAP.lr[x]);
  return digitOfSegs(s);
};

/**
 * 문제 글·그림을 따로 읽어 풀기 → { type, ans, mis: {이름표: 그 틀린 생각이 낸 보기 글} }
 * 고르는 문항은 후보 그림을 이 파일이 다시 움직여 찾는다
 */
function solveText(q, choices) {
  const L = firstLine(q);
  const F = figsOf(q);
  const mv = F.find((f) => f.kind === 'move'); const M = mv && moveOf(mv.arg);
  const sh = F.filter((f) => f.kind === 'shapes').map((f) => shapesOf(f.arg));
  const given = sh[0] || {}; const cand = sh[1] || {};
  /** 후보 중 그 모양(모양만)인 것 */
  const byShape = (cs) => Object.keys(cand).filter((k) => norm(cand[k]) === norm(cs));
  /** 후보 중 그 자리·모양인 것 */
  const byPlace = (cs) => Object.keys(M.cands).filter((k) => place(M.cands[k]) === place(cs));
  const byPt = (p) => Object.keys(M.pts).filter((k) => LBL.includes(k) && M.pts[k].x === p.x && M.pts[k].y === p.y);
  const one = (arr, what) => { assert.equal(arr.length, 1, `${what}: 후보 ${arr.length}개\n${q}`); return arr[0]; };
  const two = (h, a, v, b) => `${NAME[h]}으로 ${a}칸, ${NAME[v]}으로 ${b}칸`;
  let m;
  // ── 점의 이동
  if ((m = /^점 ㄱ을 (오른쪽|왼쪽|위쪽|아래쪽)으로 (\d+)칸(?:, (오른쪽|왼쪽|위쪽|아래쪽)으로 (\d+)칸)? 이동한 곳은 어느 것일까요\?$/.exec(L))) {
    const p = M.pts['ㄱ']; const h = KO[m[1]]; const a = +m[2];
    const go = (s, d, n) => ({ x: s.x + VEC[d][0] * n, y: s.y + VEC[d][1] * n });
    if (!m[3]) {
      return { type: 'pt1', ans: one(byPt(go(p, h, a)), '점 한 방향'), mis: { [TAGS.startCount]: byPt(go(p, h, a - 1)), [TAGS.wayBack]: byPt(go(p, OPP[h], a)) } };
    }
    const v = KO[m[3]]; const b = +m[4];
    return {
      type: 'pt2', ans: one(byPt(go(go(p, h, a), v, b)), '점 두 방향'),
      mis: { [TAGS.swapXY]: byPt(go(go(p, h, b), v, a)), [TAGS.wayBack]: byPt(go(go(p, OPP[h], a), v, b)), [TAGS.oneWay]: byPt(go(p, h, a)) },
    };
  }
  if (/^점 ㄱ이 ㉮에 도착하려면 어떻게 이동해야 할까요\?$/.test(L)) {
    const p = M.pts['ㄱ']; const t = M.pts['㉮']; const dx = t.x - p.x; const dy = t.y - p.y;
    assert.ok(dx && dy, `두 방향이 아니다\n${q}`);
    const h = dx > 0 ? 'R' : 'L'; const v = dy > 0 ? 'D' : 'U'; const a = Math.abs(dx); const b = Math.abs(dy);
    return { type: 'how', ans: two(h, a, v, b), mis: { [TAGS.swapXY]: [two(h, b, v, a)], [TAGS.wayBack]: [two(OPP[h], a, OPP[v], b)], [TAGS.startCount]: [two(h, a + 1, v, b + 1)] } };
  }
  if ((m = /^모눈 한 칸의 길이는 1 cm예요\. 점 ㄱ을 (오른쪽|왼쪽|위쪽|아래쪽)으로 몇 cm 이동하면 ㉮에 도착할까요\?$/.exec(L))) {
    const p = M.pts['ㄱ']; const t = M.pts['㉮']; const d = KO[m[1]];
    const n = (t.x - p.x) * VEC[d][0] + (t.y - p.y) * VEC[d][1];
    assert.ok(n > 0 && (t.x - p.x) * VEC[d][1] === 0 && (t.y - p.y) * VEC[d][0] === 0, `㉮가 그 쪽에 없다\n${q}`);
    return { type: 'ptcm', ans: String(n), mis: { [TAGS.startCount]: [String(n + 1)] } };
  }
  // ── 밀기
  if ((m = /^모눈 한 칸의 길이는 1 cm예요\. 처음 도형을 (오른쪽|왼쪽|위쪽|아래쪽)으로 몇 cm 밀었을까요\?$/.exec(L)) || /^모눈 한 칸의 길이는 1 cm예요\. 처음 도형을 밀었더니 나중 도형이 되었어요\. 어느 쪽으로 몇 cm 밀었을까요\?$/.test(L)) {
    const A = M.shapes['처음']; const B = M.shapes['나중'];
    assert.equal(norm(A), norm(B), `민 도형의 모양이 다르다\n${q}`);
    const [ax, ay] = topLeft(A); const [bx, by] = topLeft(B);
    const d = bx > ax ? 'R' : bx < ax ? 'L' : by > ay ? 'D' : 'U';
    assert.ok(bx === ax || by === ay, `두 방향으로 밀었다\n${q}`);
    const n = Math.abs(bx - ax) + Math.abs(by - ay);
    const w = (d === 'R' || d === 'L') ? Math.max(...A.map((c) => c[0])) - ax + 1 : Math.max(...A.map((c) => c[1])) - ay + 1;
    assert.ok(n > w, `두 도형이 겹친다\n${q}`);
    if (m) {
      assert.equal(KO[m[1]], d, `묻는 쪽과 민 쪽이 다르다\n${q}`);
      return { type: 'far', ans: String(n), mis: { [TAGS.gapOnly]: [String(n - w)], [TAGS.spanAll]: [String(n + w)] } };
    }
    const say = (dd, k) => `${NAME[dd]}으로 ${k} cm`;
    return { type: 'way', ans: say(d, n), mis: { [TAGS.wayBack]: [say(OPP[d], n)], [TAGS.gapOnly]: [say(d, n - w)], [TAGS.spanAll]: [say(d, n + w)] } };
  }
  if ((m = /^모눈 한 칸의 길이는 1 cm예요\. 처음 도형을 (오른쪽|왼쪽|위쪽|아래쪽)으로 (\d+) cm 밀었을 때의 도형은 어느 것일까요\?$/.exec(L))) {
    const d = KO[m[1]]; const n = +m[2]; const A = M.shapes['처음'];
    const w = (d === 'R' || d === 'L') ? Math.max(...A.map((c) => c[0])) - Math.min(...A.map((c) => c[0])) + 1 : Math.max(...A.map((c) => c[1])) - Math.min(...A.map((c) => c[1])) + 1;
    const ok = shift(A, d, n);
    const flipped = at(d === 'R' || d === 'L' ? T.lr(A) : T.ud(A), ...topLeft(ok));
    return { type: 'pick', ans: one(byPlace(ok), '민 도형'), mis: { [TAGS.gapOnly]: byPlace(shift(A, d, n + w)), [TAGS.startCount]: byPlace(shift(A, d, n - 1)), [TAGS.slideFlip]: byPlace(flipped) } };
  }
  if ((m = /^모눈 한 칸의 길이는 1 cm예요\. 어떤 도형을 (오른쪽|왼쪽|위쪽|아래쪽)으로 (\d+) cm 밀었더니 나중 도형이 되었어요\. 처음 도형은 어느 것일까요\?$/.exec(L))) {
    const d = KO[m[1]]; const n = +m[2]; const B = M.shapes['나중'];
    const w = (d === 'R' || d === 'L') ? Math.max(...B.map((c) => c[0])) - Math.min(...B.map((c) => c[0])) + 1 : Math.max(...B.map((c) => c[1])) - Math.min(...B.map((c) => c[1])) + 1;
    const fits = Object.keys(M.cands).filter((k) => place(shift(M.cands[k], d, n)) === place(B));
    const ok = shift(B, OPP[d], n);
    const flipped = at(d === 'R' || d === 'L' ? T.lr(B) : T.ud(B), ...topLeft(ok));
    return { type: 'undoSlide', ans: one(fits, '처음 도형(밀기)'), mis: { [TAGS.notReverse]: byPlace(shift(B, d, n)), [TAGS.gapOnly]: byPlace(shift(B, OPP[d], n + w)), [TAGS.slideFlip]: byPlace(flipped) } };
  }
  // ── 뒤집기
  if ((m = /^처음 도형을 (오른쪽|왼쪽|위쪽|아래쪽)으로 뒤집었을 때의 도형은 어느 것일까요\?$/.exec(L))) {
    const d = KO[m[1]]; const A = given['처음'];
    return { type: 'flip', ans: one(byShape(flipBy(d, A)), '뒤집은 도형'), mis: { [TAGS.axisMix]: byShape(flipOther(d, A)), [TAGS.keep]: byShape(A), [TAGS.flipAsTurn]: byShape(turn(A, 2)) } };
  }
  if ((m = /^처음 도형을 (오른쪽|왼쪽|위쪽|아래쪽)으로 뒤집으면 어떻게 될까요\?$/.exec(L))) {
    const lr = m[1] === '오른쪽' || m[1] === '왼쪽';
    // 이 파일이 다시 확인 — 그 쪽으로 뒤집으면 정말 그 두 쪽만 바뀐다(맨 왼쪽 칸이 맨 오른쪽으로)
    const A = given['처음']; const B = flipBy(KO[m[1]], A);
    assert.notEqual(norm(A), norm(B));
    return {
      type: 'swaps', ans: lr ? '왼쪽과 오른쪽이 서로 바뀌어요' : '위쪽과 아래쪽이 서로 바뀌어요',
      mis: { [TAGS.axisMix]: [lr ? '위쪽과 아래쪽이 서로 바뀌어요' : '왼쪽과 오른쪽이 서로 바뀌어요'], [TAGS.keep]: ['모양이 바뀌지 않아요'], [TAGS.flipAsTurn]: ['위쪽과 아래쪽, 왼쪽과 오른쪽이 모두 바뀌어요'] },
    };
  }
  if ((m = /^처음 도형을 (오른쪽|왼쪽|위쪽|아래쪽)으로 뒤집었더니 가가 되었어요\. 처음 도형을 (오른쪽|왼쪽|위쪽|아래쪽)으로 뒤집었을 때의 도형은 어느 것일까요\?$/.exec(L))) {
    const d1 = KO[m[1]]; const d2 = KO[m[2]]; const A = given['처음'];
    assert.equal(norm(given['가']), norm(flipBy(d1, A)), `가가 ${m[1]}으로 뒤집은 모양이 아니다\n${q}`);
    return { type: 'pair', ans: one(byShape(flipBy(d2, A)), '반대쪽으로 뒤집은 도형'), mis: { [TAGS.upDownDiff]: byShape(A), [TAGS.axisMix]: byShape(flipOther(d2, A)), [TAGS.flipAsTurn]: byShape(turn(A, 2)) } };
  }
  if ((m = /^처음 도형을 (오른쪽|왼쪽|위쪽|아래쪽)으로 두 번 뒤집었을 때의 도형은 어느 것일까요\?$/.exec(L))) {
    const d = KO[m[1]]; const A = given['처음'];
    return { type: 'twice', ans: one(byShape(flipBy(d, flipBy(d, A))), '두 번 뒤집은 도형'), mis: { [TAGS.twiceFlip]: byShape(flipBy(d, A)), [TAGS.axisMix]: byShape(flipOther(d, A)), [TAGS.flipAsTurn]: byShape(turn(A, 2)) } };
  }
  if (/^처음 도형을 뒤집었더니 가가 되었어요\. 어느 쪽으로 뒤집었을까요\?$/.test(L)) {
    const A = given['처음']; const B = given['가'];
    const lr = norm(T.lr(A)) === norm(B); const ud = norm(T.ud(A)) === norm(B);
    assert.ok(lr !== ud, `가를 만드는 뒤집기가 하나가 아니다\n${q}`);
    const LR = '왼쪽이나 오른쪽으로 뒤집었어요'; const UD = '위쪽이나 아래쪽으로 뒤집었어요';
    return { type: 'side', ans: lr ? LR : UD, mis: { [TAGS.axisMix]: [lr ? UD : LR], [TAGS.keep]: ['뒤집지 않고 밀기만 했어요'] } };
  }
  // ── 돌리기
  if ((m = /^처음 도형을 (시계 방향|시계 반대 방향)으로 (\d+)°만큼 돌렸을 때의 도형은 어느 것일까요\?$/.exec(L))) {
    const deg = +m[2]; const k = quarterOf(m[1], deg); const A = given['처음'];
    const mis = deg === 360 ? { [TAGS.full360]: byShape(turn(A, 2)), [TAGS.turnAsFlip]: byShape(T.lr(A)) }
      : deg === 180 ? { [TAGS.turnAsFlip]: byShape(T.ud(A)), [TAGS.turnHalf]: byShape(turn(A, m[1] === '시계 방향' ? 1 : -1)), [TAGS.keep]: byShape(A) }
        : { [TAGS.turnBack]: byShape(turn(A, -k)), [TAGS.turnHalf]: byShape(turn(A, 2)), [TAGS.turnAsFlip]: byShape(T.lr(A)) };
    return { type: 'turn', ans: one(byShape(turn(A, k)), '돌린 도형'), mis };
  }
  if ((m = /^처음 도형을 (시계 방향|시계 반대 방향)으로 (\d+)°만큼 돌리면 처음 도형의 위쪽 부분은 어느 쪽으로 갈까요\?$/.exec(L))) {
    const deg = +m[2]; const k = quarterOf(m[1], deg);
    return {
      type: 'top', ans: `${topSide(k)}으로 가요`,
      mis: deg === 180
        ? { [TAGS.turnHalf]: [`${topSide(m[1] === '시계 방향' ? 1 : -1)}으로 가요`], [TAGS.keep]: ['위쪽에 그대로 있어요'] }
        : { [TAGS.turnBack]: [`${topSide(-k)}으로 가요`], [TAGS.turnHalf]: ['아래쪽으로 가요'], [TAGS.keep]: ['위쪽에 그대로 있어요'] },
    };
  }
  if ((m = /^처음 도형을 (시계 방향|시계 반대 방향)으로 (\d+)°만큼 돌린 도형과 같은 도형은 어느 것일까요\?$/.exec(L))) {
    const A = given['처음']; const goal = norm(turn(A, quarterOf(m[1], +m[2])));
    const valOf = (t) => {
      let x;
      if ((x = /^(시계 방향|시계 반대 방향)으로 (\d+)°만큼 돌린 도형$/.exec(t))) return norm(turn(A, quarterOf(x[1], +x[2])));
      if ((x = /^(오른쪽|왼쪽|위쪽|아래쪽)으로 뒤집은 도형$/.exec(t))) return norm(flipBy(KO[x[1]], A));
      if (t === '처음 도형') return norm(A);
      return null;
    };
    const hits = choices.filter((c) => valOf(c.text) === goal);
    assert.equal(hits.length, 1, `같은 도형이 되는 보기 ${hits.length}개\n${q}`);
    // 이름표의 뜻: 방향만 반대(같은 각도) · 180°(또는 90°) · 뒤집기 · 처음 도형
    const cwKo = m[1]; const otherKo = cwKo === '시계 방향' ? '시계 반대 방향' : '시계 방향';
    return {
      type: 'same', ans: hits[0].text,
      mis: {
        [TAGS.dirIgnore]: +m[2] === 180 ? [] : [`${otherKo}으로 ${m[2]}°만큼 돌린 도형`], // 180°는 어느 방향이나 같은 도형 — 틀린 생각이 아니다(원고 테스트가 잡음)
        [TAGS.turnHalf]: +m[2] === 180 ? [`${cwKo}으로 90°만큼 돌린 도형`] : [`${cwKo}으로 180°만큼 돌린 도형`],
        [TAGS.turnAsFlip]: ['오른쪽으로 뒤집은 도형', '왼쪽으로 뒤집은 도형', '위쪽으로 뒤집은 도형', '아래쪽으로 뒤집은 도형'],
        [TAGS.keep]: ['처음 도형'],
      },
    };
  }
  if ((m = /^처음 도형을 (시계 방향|시계 반대 방향)으로 몇 도만큼 돌리면 가가 될까요\? 어느 것일까요\?$/.exec(L))) {
    const A = given['처음']; const B = given['가'];
    const degs = [90, 180, 270, 360].filter((dd) => norm(turn(A, quarterOf(m[1], dd))) === norm(B));
    assert.equal(degs.length, 1, `가가 되는 각도 ${degs}\n${q}`);
    const deg = degs[0];
    return { type: 'much', ans: `${deg}°`, mis: { [TAGS.turnBack]: [`${360 - deg}°`], [TAGS.turnHalf]: deg === 180 ? [] : ['180°'], [TAGS.full360]: ['360°'] } };
  }
  // ── 무늬
  const RULES = { cw: (cs) => turn(cs, 1), ccw: (cs) => turn(cs, -1), half: (cs) => turn(cs, 2), lr: T.lr, ud: T.ud, keep: (cs) => cs };
  if (/^규칙에 따라 모양을 늘어놓았어요\. 4에 알맞은 모양은 어느 것일까요\?$/.test(L)) {
    const s = [given['1'], given['2'], given['3']];
    const rules = Object.keys(RULES).filter((k) => norm(RULES[k](s[0])) === norm(s[1]) && norm(RULES[k](s[1])) === norm(s[2]));
    assert.equal(rules.length, 1, `규칙이 하나가 아니다 ${rules}\n${q}`);
    const rule = rules[0]; const x3 = s[2];
    const mis = { [TAGS.ruleSkip]: byShape(x3) };
    if (rule === 'lr' || rule === 'ud') { mis[TAGS.axisMix] = byShape(rule === 'lr' ? T.ud(x3) : T.lr(x3)); mis[TAGS.flipAsTurn] = byShape(turn(x3, 2)); }
    else {
      mis[TAGS.turnAsFlip] = rule === 'half' ? byShape(T.ud(x3)) : [...byShape(T.lr(x3)), ...byShape(T.ud(x3))];
      if (rule === 'half') mis[TAGS.turnHalf] = [...byShape(turn(x3, 1)), ...byShape(turn(x3, -1))]; // 180°씩인데 90°만큼만
    }
    return { type: 'next', ans: one(byShape(RULES[rule](x3)), '4에 알맞은 모양'), mis };
  }
  if (/^규칙에 따라 모양을 늘어놓았어요\. 무늬를 만든 규칙은 어느 것일까요\?$/.test(L)) {
    const s = [given['1'], given['2'], given['3'], given['4']];
    const ruleOfText = (t) => {
      let x;
      if ((x = /^(시계 방향|시계 반대 방향)으로 (\d+)°만큼씩 돌렸어요$/.exec(t))) return (cs) => turn(cs, quarterOf(x[1], +x[2]));
      if ((x = /^(오른쪽|왼쪽|위쪽|아래쪽)으로 뒤집기를 되풀이했어요$/.exec(t))) return (cs) => flipBy(KO[x[1]], cs);
      if (/^(오른쪽|왼쪽|위쪽|아래쪽)으로 밀기만 했어요$/.test(t)) return (cs) => cs;
      return null;
    };
    const fits = choices.filter((c) => { const f = ruleOfText(c.text); return f && [0, 1, 2].every((i) => norm(f(s[i])) === norm(s[i + 1])); });
    assert.equal(fits.length, 1, `맞는 규칙 ${fits.length}개\n${q}`);
    const rule = Object.keys(RULES).find((k) => [0, 1, 2].every((i) => norm(RULES[k](s[i])) === norm(s[i + 1])));
    const mis = { [TAGS.keep]: ['오른쪽으로 밀기만 했어요'] };
    if (rule === 'cw' || rule === 'ccw') { mis[TAGS.turnBack] = [`${rule === 'cw' ? '시계 반대 방향' : '시계 방향'}으로 90°만큼씩 돌렸어요`]; mis[TAGS.turnAsFlip] = ['오른쪽으로 뒤집기를 되풀이했어요', '왼쪽으로 뒤집기를 되풀이했어요', '위쪽으로 뒤집기를 되풀이했어요', '아래쪽으로 뒤집기를 되풀이했어요']; }
    else { mis[TAGS.axisMix] = rule === 'lr' ? ['위쪽으로 뒤집기를 되풀이했어요', '아래쪽으로 뒤집기를 되풀이했어요'] : ['왼쪽으로 뒤집기를 되풀이했어요', '오른쪽으로 뒤집기를 되풀이했어요']; mis[TAGS.flipAsTurn] = ['시계 방향으로 180°만큼씩 돌렸어요', '시계 반대 방향으로 180°만큼씩 돌렸어요']; }
    return { type: 'rule', ans: fits[0].text, mis };
  }
  // ── ⭐ 활용
  if ((m = /^어떤 도형을 (시계 방향|시계 반대 방향)으로 (\d+)°만큼 돌렸더니 가가 되었어요\. 처음 도형은 어느 것일까요\?$/.exec(L))) {
    const k = quarterOf(m[1], +m[2]); const B = given['가'];
    const fits = Object.keys(cand).filter((x) => norm(turn(cand[x], k)) === norm(B));
    return { type: 'undoTurn', ans: one(fits, '처음 도형(돌리기)'), mis: { [TAGS.notReverse]: byShape(turn(B, k)), [TAGS.noUndo]: byShape(B), [TAGS.turnAsFlip]: byShape(T.lr(B)) } };
  }
  if ((m = /^어떤 도형을 (오른쪽|왼쪽|위쪽|아래쪽)으로 뒤집었더니 가가 되었어요\. 처음 도형은 어느 것일까요\?$/.exec(L))) {
    const d = KO[m[1]]; const B = given['가'];
    const fits = Object.keys(cand).filter((x) => norm(flipBy(d, cand[x])) === norm(B));
    return { type: 'undoFlip', ans: one(fits, '처음 도형(뒤집기)'), mis: { [TAGS.noUndo]: byShape(B), [TAGS.axisMix]: byShape(flipOther(d, B)), [TAGS.flipAsTurn]: byShape(turn(B, 2)) } };
  }
  if ((m = /^디지털 숫자 카드를 놓았어요\. 카드를 한꺼번에 (시계 방향으로 180°만큼 돌리면|아래쪽으로 뒤집으면|오른쪽으로 뒤집으면) 어떤 수가 될까요\?$/.exec(L))) {
    const how = m[1].startsWith('시계') ? 'turn' : m[1].startsWith('아래') ? 'ud' : 'lr';
    const ds = [...F.find((f) => f.kind === 'seg').arg.trim()].map(Number);
    const moved = ds.map((d) => segMove(d, how));
    assert.ok(moved.every((d) => d !== null), `숫자가 아닌 모양이 된다 ${ds}\n${q}`);
    // 줄 전체를 돌리거나 왼쪽·오른쪽으로 뒤집으면 맨 왼쪽 카드가 맨 오른쪽으로 — 위쪽·아래쪽으로 뒤집으면 그대로
    const reversed = how !== 'ud';
    const ans = (reversed ? [...moved].reverse() : moved).join('');
    return {
      type: 'cards', ans,
      mis: reversed ? { [TAGS.orderKeep]: [moved.join('')], [TAGS.digitKeep]: [[...ds].reverse().join('')] } : { [TAGS.orderSwap]: [[...moved].reverse().join('')], [TAGS.digitKeep]: [ds.join('')] },
    };
  }
  return { type: 'unknown' };
}
const tagHolds = (sv, tag, text) => !!(sv.mis && sv.mis[tag] && sv.mis[tag].includes(text));

const cache = new Map();
const qOf = (id, k, s) => { const key = `${id}|${k}|${s}`; if (!cache.has(key)) cache.set(key, makeQuestion(id, k, s, OPTS)); return cache.get(key); };
function* every(kinds = ['calc', 'misread'], n = SEEDS) {
  for (const c of MOVE) for (const k of kinds) for (let s = 1; s <= n; s++) yield { c, k, s, q: qOf(c.id, k, s) };
}
const allText = (q) => [q.q, ...q.choices.map((x) => x.text), ...(q.solve ? [...q.solve.steps, ...Object.values(q.solve.why), q.solve.whyAny, q.solve.rule] : [])].join('\n');

// ───────────────────── 테스트 ─────────────────────

test('사다리: 8칸, 모두 초4, needs가 바로 앞 칸 · 맨 뒤는 ⭐ · 학년 표시', () => {
  assert.equal(MOVE.length, 8);
  assert.deepEqual(IDS, ['mv.point', 'mv.slide', 'mv.flip', 'mv.flip2', 'mv.turn', 'mv.turn2', 'mv.pattern', 'mv.apply']);
  MOVE.forEach((c, i) => {
    assert.equal(c.grade, 4, c.id);
    assert.deepEqual(c.needs, i ? [IDS[i - 1]] : [], c.id);
    assert.ok(c.idea && c.rule && c.slip, c.id);
  });
  assert.ok(MOVE[7].name.startsWith('⭐'));
  assert.equal(gradeLabel(4), '초4');
});

test('이 파일의 읽기 도구 자체 점검 — 칸 모양 두 꼴 · 뒤집기·돌리기 · 위쪽 부분이 가는 쪽 · 디지털 숫자', () => {
  assert.deepEqual(cellsOf('3.011110010'), cellsOf('011/110/010'));
  const L = cellsOf('10/10/11'); // ㄴ자: 세로 셋 + 오른쪽 아래 하나
  assert.equal(norm(T.lr(L)), norm(cellsOf('01/01/11')), '왼쪽·오른쪽으로 뒤집기');
  assert.equal(norm(T.ud(L)), norm(cellsOf('11/10/10')), '위쪽·아래쪽으로 뒤집기');
  assert.equal(norm(turn(L, 1)), norm(cellsOf('111/100')), '시계 방향 90°: 맨 아래 오른쪽으로 뻗은 칸이 왼쪽 아래로');
  assert.equal(norm(turn(L, -1)), norm(cellsOf('001/111')), '시계 반대 방향 90°');
  assert.equal(norm(turn(L, 4)), norm(L), '360°');
  assert.equal(norm(turn(L, 2)), norm(T.lr(T.ud(L))), '180° = 두 쪽 모두 바꿈');
  assert.deepEqual([topSide(1), topSide(-1), topSide(2), topSide(3)], ['오른쪽', '왼쪽', '아래쪽', '왼쪽']);
  assert.deepEqual([segMove(6, 'turn'), segMove(2, 'ud'), segMove(2, 'lr'), segMove(5, 'turn'), segMove(3, 'lr')], [9, 5, 5, 5, null]);
});

test('🧩 모양 바탕: 4~5칸·변으로 이어짐 · 여덟 모습(돌리기 넷 × 뒤집기)이 모두 달라 뒤집기·돌리기 결과가 늘 다르다', () => {
  for (const b of BASES) {
    const cs = cellsOf(b);
    assert.ok(cs.length >= 4 && cs.length <= 5, b);
    const seen = new Set([`${cs[0]}`]); const st = [cs[0]];
    while (st.length) { const [x, y] = st.pop(); for (const [a, c] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) if (cs.some((p) => p[0] === a && p[1] === c) && !seen.has(`${a},${c}`)) { seen.add(`${a},${c}`); st.push([a, c]); } }
    assert.equal(seen.size, cs.length, `${b}: 이어지지 않음`);
    const imgs = new Set([0, 1, 2, 3].flatMap((k) => [norm(turn(cs, k)), norm(T.lr(turn(cs, k)))]));
    assert.equal(imgs.size, 8, `${b}: 대칭이 있다`);
  }
});

test('★ 독립 검산: ① 정답이 문제 글·그림 지시문을 따로 읽어 푼 답과 같다 · 딱 하나만 맞다', () => {
  const types = {};
  for (const { c, s, q } of every(['calc'])) {
    const sv = solveText(q.q, q.choices);
    assert.notEqual(sv.type, 'unknown', `${c.id} #${s}: 못 읽는 문제\n${q.q}`);
    types[sv.type] = (types[sv.type] || 0) + 1;
    const ok = q.choices.filter((x) => x.ok);
    assert.equal(ok.length, 1, `${c.id} #${s}`);
    assert.equal(ok[0].text, sv.ans, `${c.id} #${s}: 정답 ${ok[0].text} · 따로 푼 답 ${sv.ans}\n${q.q}`);
  }
  assert.ok(Object.keys(types).length >= 22, `본 문제 종류 ${Object.keys(types).length}: ${JSON.stringify(types)}`);
});

test('★ 오개념 이름표: 그 오답이 정말 그 틀린 생각이다 — 문제의 그림으로 다시 한다 · 이름표 붙은 오답이 늘 하나 이상(숫자판 문항) · 둘 이상(고르는 문항)', () => {
  let n = 0;
  for (const { c, s, q } of every(['calc'])) {
    const sv = solveText(q.q, q.choices);
    const tagged = q.choices.filter((x) => !x.ok && x.tag && x.tag !== '계산 실수');
    assert.ok(tagged.length >= (/^\d+$/.test(sv.ans) && sv.type !== 'cards' ? 1 : 2), `${c.id} #${s}: 이름표 붙은 오답 ${tagged.length}`);
    for (const w of tagged) { assert.ok(tagHolds(sv, w.tag, w.text), `${c.id} #${s}: "${w.text}"는 "${w.tag}"가 아니다 (${JSON.stringify(sv.mis[w.tag])})\n${q.q}`); n++; }
  }
  assert.ok(n > SEEDS * 8 * 2, `본 이름표 ${n}`);
});

test('★ 오답끼리 같은 값이 되지 않는다 — 보기에서 겹쳐 빠지기 전(probe.allWrong)도 · 후보 그림끼리 같은 모양·자리가 없다', () => {
  for (const { c, s, q } of every(['calc'])) {
    const all = q.probe && q.probe.allWrong;
    assert.ok(all && all.length >= 1, `${c.id} #${s}: allWrong`);
    const ok = q.choices.find((x) => x.ok).text;
    assert.equal(new Set(all.map((w) => w.text)).size, all.length, `${c.id} #${s}: 오답끼리 같다`);
    assert.ok(all.every((w) => w.text !== ok), `${c.id} #${s}: 오답이 정답과 같다`);
    const F = figsOf(q.q);
    const cf = F.filter((f) => f.kind === 'shapes').map((f) => shapesOf(f.arg)).find((o) => Object.keys(o).some((k) => LBL.includes(k)));
    if (cf) { const ks = Object.keys(cf).filter((k) => LBL.includes(k)); assert.equal(new Set(ks.map((k) => norm(cf[k]))).size, ks.length, `${c.id} #${s}: 같은 모양 후보`); }
    const mv = F.find((f) => f.kind === 'move');
    if (mv) {
      const M = moveOf(mv.arg); const ks = Object.keys(M.cands);
      if (ks.length) assert.equal(new Set(ks.map((k) => place(M.cands[k]))).size, ks.length, `${c.id} #${s}: 같은 자리 후보`);
      const pts = Object.keys(M.pts).filter((k) => LBL.includes(k));
      if (pts.length) assert.equal(new Set(pts.map((k) => `${M.pts[k].x},${M.pts[k].y}`)).size, pts.length, `${c.id} #${s}: 같은 점 후보`);
    }
  }
});

test('★ 보기: 정답 하나, 글자 겹침 없음, 3개 이상, 빈 글자·undefined·NaN·남은 자리표시 없음 · 그림 지시문은 모두 그려지고 글로도 바뀐다', () => {
  for (const { c, k, s, q } of every()) {
    const at = `${c.id} ${k} #${s}`;
    assert.ok(q.choices.length >= 3, at);
    assert.equal(q.choices.filter((x) => x.ok).length, 1, at);
    assert.equal(new Set(q.choices.map((x) => x.text)).size, q.choices.length, at);
    const all = allText(q);
    assert.ok(!/undefined|NaN|\{me|\{mon|null/.test(all), `${at}\n${all}`);
    for (const m of q.q.matchAll(/\[([a-z]+) ([^\]]+)\]/g)) assert.ok(figureSvg(`${m[1]} ${m[2]}`).startsWith('<svg'), `${at}: 못 그리는 그림 [${m[1]} ${m[2]}]`);
    assert.ok(!/\[(move|shapes|seg) /.test(renderFigures(q.q)), `${at}: 지시문이 글로 남는다`);
    assert.ok(!/\[(move|shapes|seg) /.test(figText(q.q)), `${at}: figText`);
  }
});

test('★ 고르는 문항은 "어느 것" 말투 · 숫자판은 수 답만 (㉠~㉣·말 보기·각도 보기는 보기 그대로)', () => {
  let pad = 0; let pick = 0;
  for (const { c, s, q } of every(['calc'])) {
    const ok = q.choices.find((x) => x.ok).text;
    const spec = padSpec(q, 'move');
    if (/^\d+$/.test(ok)) { assert.ok(spec, `${c.id} #${s}: 수 답인데 숫자판 없음\n${q.q}`); pad++; } else {
      assert.equal(spec, null, `${c.id} #${s}: "${ok}"에 숫자판`);
      if (/^[㉠-㉣]$|°$/.test(ok)) assert.match(q.q, /어느 것/, `${c.id} #${s}`);
      pick++;
    }
  }
  assert.ok(pad > SEEDS / 2 && pick > SEEDS * 5, `숫자판 ${pad} · 고르기 ${pick}`);
});

test('★ ② 오개념 문항: 보여 준 것이 정말 그 틀린 생각이고 고치는 말이 맞다 · 갈래 열쇠 둘씩 · "맞게 …"는 오답', () => {
  const keys = {};
  for (const { c, s, q } of every(['misread'])) {
    const at = `${c.id} #${s}`;
    keys[c.id] = keys[c.id] || new Set(); keys[c.id].add(q.key);
    const ok = q.choices.find((x) => x.ok).text;
    assert.ok(q.choices.some((x) => /^맞게 (말했|그렸)어요$/.test(x.text) && !x.ok), at);
    const F = figsOf(q.q);
    const mv = F.find((f) => f.kind === 'move'); const M = mv && moveOf(mv.arg);
    const sh = F.find((f) => f.kind === 'shapes'); const S = sh && shapesOf(sh.arg);
    const shown = (q.q.match(/\*\*(.+?)\*\*/) || [])[1] || '';
    const a = q.probe.ask;
    let m;
    if (a === 'count') {
      m = /점 ㄱ을 (오른쪽|왼쪽|위쪽|아래쪽)으로 (\d+)칸 이동해서/.exec(q.q); const d = KO[m[1]]; const n = +m[2];
      assert.deepEqual([M.pts['★'].x - M.pts['ㄱ'].x, M.pts['★'].y - M.pts['ㄱ'].y], [VEC[d][0] * (n - 1), VEC[d][1] * (n - 1)], `${at}: ★이 한 칸 덜 간 곳이 아니다`);
      assert.match(ok, new RegExp(`${n - 1}칸만 갔어요 — ★에서 ${m[1]}으로 1칸 더`), at);
    } else if (a === 'swap') {
      m = /점 ㄱ을 (오른쪽|왼쪽)으로 (\d+)칸, (위쪽|아래쪽)으로 (\d+)칸 이동해서/.exec(q.q);
      const h = KO[m[1]]; const v = KO[m[3]]; const A = +m[2]; const B = +m[4];
      assert.deepEqual([M.pts['★'].x - M.pts['ㄱ'].x, M.pts['★'].y - M.pts['ㄱ'].y], [VEC[h][0] * B, VEC[v][1] * A], `${at}: ★이 가로세로를 바꾼 곳이 아니다`);
      assert.ok(A !== B, at);
    } else if (a === 'gap') {
      const sv = solveText(`모눈 한 칸의 길이는 1 cm예요. 처음 도형을 밀었더니 나중 도형이 되었어요. 어느 쪽으로 몇 cm 밀었을까요?\n\n[move ${mv.arg}]`, []);
      assert.ok(shown.includes(sv.mis[TAGS.gapOnly][0]), `${at}: 보여 준 말이 빈칸만 센 말이 아니다 — ${shown}`);
      assert.ok(ok.endsWith(sv.ans), `${at}: 고치는 말 ${ok} · 따로 푼 답 ${sv.ans}`);
    } else if (a === 'shape') {
      assert.notEqual(norm(M.shapes['처음']), norm(M.shapes['나중']), `${at}: 나중 도형의 모양이 그대로다`);
      assert.match(ok, /모양이 바뀌었어요/);
    } else if (a === 'axis' || a === 'both') {
      m = /처음 도형을 (오른쪽|왼쪽|위쪽|아래쪽)으로 뒤집어서/.exec(q.q); const d = KO[m[1]];
      assert.equal(norm(S['가']), norm(a === 'axis' ? flipOther(d, S['처음']) : turn(S['처음'], 2)), `${at}: 가가 그 틀린 모양이 아니다`);
      assert.notEqual(norm(S['가']), norm(flipBy(d, S['처음'])), at);
    } else if (a === 'pairSaid') { assert.match(shown, /서로 달라요/); assert.match(ok, /^두 모양은 같아요/); }
    else if (a === 'twiceSaid') { assert.match(shown, /두 번 뒤집으면 .+한 번 뒤집은 모양과 같아요/); assert.match(ok, /처음 모양으로 돌아와요/); }
    else if (a === 'back') {
      m = /처음 도형을 (시계 방향|시계 반대 방향)으로 90°만큼 돌려서/.exec(q.q); const k = quarterOf(m[1], 90);
      assert.equal(norm(S['가']), norm(turn(S['처음'], -k)), `${at}: 가가 반대로 돌린 모양이 아니다`);
    } else if (a === 'flip') { assert.equal(norm(S['가']), norm(T.ud(S['처음'])), at); assert.notEqual(norm(S['가']), norm(turn(S['처음'], 2)), at); }
    else if (a === 'sameSaid') { assert.match(shown, /서로 달라요/); assert.match(ok, /^두 모양은 같아요/); }
    else if (a === 'fullSaid') { assert.match(shown, /360°만큼 돌리면 .*바뀌어요/); assert.match(ok, /처음 모양 그대로/); }
    else if (a === 'skip') {
      assert.equal(norm(S['4']), norm(S['3']), `${at}: 4가 3과 같은 모양이 아니다`);
      assert.ok([0, 1].every((i) => norm(turn(S[String(i + 1)], 1)) === norm(S[String(i + 2)])), `${at}: 시계 방향 규칙이 아니다`);
    } else if (a === 'dirSaid') {
      assert.ok([1, 2, 3].every((i) => norm(turn(S[String(i)], 1)) === norm(S[String(i + 1)])), `${at}: 시계 방향 규칙이 아니다`);
      assert.match(shown, /시계 반대 방향/); assert.match(ok, /^시계 방향으로 90°만큼씩/);
    } else if (a === 'order') {
      const ds = [...F.find((f) => f.kind === 'seg').arg.trim()].map(Number); const mm = ds.map((d) => segMove(d, 'turn'));
      assert.ok(shown.includes(`${mm.join('')}`), `${at}: 보여 준 말이 순서를 그대로 둔 수가 아니다`);
      assert.ok(ok.includes([...mm].reverse().join('')), `${at}: 고치는 말 ${ok}`);
    } else if (a === 'backSaid') { assert.match(shown, /한 번 더 돌린 모양/); assert.match(ok, /^거꾸로 해야 해요/); }
    else assert.fail(`${at}: 모르는 ② ${a}`);
  }
  for (const id of IDS) assert.equal(keys[id].size, 2, `${id}: ② 갈래 ${[...(keys[id] || [])].join(',')}`);
});

// ───────────────────── 그림 ─────────────────────

test('🎨 모눈 그림: 그린 칸·점의 자리가 지시문과 같다 · 후보 모눈은 후보 수만큼(처음 도형은 흐리게) · 이름표는 칸과 겹치지 않고 그 도형 위에', () => {
  let n = 0;
  for (const { c, k, s, q } of every(['calc', 'misread'], FIG_SEEDS)) {
    for (const f of figsOf(q.q).filter((x) => x.kind === 'move')) {
      const M = moveOf(f.arg); const svg = figureSvg(`move ${f.arg}`); const at = `${c.id} ${k} #${s}`;
      const cellsIn = (frag) => [...frag.matchAll(/class="mv-cell" data-i="(\d+)" data-j="(\d+)"/g)].map((x) => [+x[1], +x[2]]);
      // 보이는 자리 — data-*만 믿지 않는다(AA 42차): 그린 모눈선에서 칸 경계를 읽어, 칠한 칸·점이 그 칸 경계·모눈점에 그려졌는지
      const seenAt = (frag, label) => {
        const ls = [...frag.matchAll(/<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"/g)].map((x) => x.slice(1).map(Number));
        const V = [...new Set(ls.filter((l) => l[0] === l[2]).map((l) => l[0]))].sort((a, b) => a - b);
        const Hz = [...new Set(ls.filter((l) => l[1] === l[3]).map((l) => l[1]))].sort((a, b) => a - b);
        for (const x of frag.matchAll(/class="mv-cell" data-i="(\d+)" data-j="(\d+)" x="([\d.]+)" y="([\d.]+)"/g)) assert.deepEqual([+x[3], +x[4]], [V[+x[1]], Hz[+x[2]]], `${label}: 칸 (${x[1]}, ${x[2]})이 그 자리에 안 그려졌다`);
        for (const x of frag.matchAll(/class="mv-pt" data-k="[^"]+" data-x="(\d+)" data-y="(\d+)" cx="([\d.]+)" cy="([\d.]+)"/g)) assert.deepEqual([+x[3], +x[4]], [V[+x[1]], Hz[+x[2]]], `${label}: 점 (${x[1]}, ${x[2]})이 그 모눈점에 안 그려졌다`);
      };
      if (Object.keys(M.cands).length) {
        const panels = [...svg.matchAll(/<g class="mv-panel" data-k="(.)"[^>]*>([\s\S]*?)<\/g><\/g>/gu)];
        assert.equal(panels.length, Object.keys(M.cands).length, `${at}: 후보 모눈 수`);
        for (const p of panels) {
          const body = `${p[2]}</g>`; // 후보 모눈을 잘라 낸 정규식이 맨 끝 </g></g>를 먹어 도형 묶음의 닫는 </g>가 빠진다
          const shape = /<g class="mv-shape"[^>]*>([\s\S]*?)<\/g>/.exec(body); const base = /<g class="mv-base"[^>]*>([\s\S]*?)<\/g>/.exec(body);
          assert.ok(shape && base, `${at}: 후보 모눈 ${p[1]}에 도형이 없다 [move ${f.arg}]`);
          assert.equal(place(cellsIn(shape[1])), place(M.cands[p[1]]), `${at}: 후보 ${p[1]} 칸 자리`);
          assert.equal(place(cellsIn(base[1])), place(Object.values(M.shapes)[0]), `${at}: 흐린 처음 도형`);
          assert.ok(!/mv-tag/.test(p[2]), `${at}: 후보 모눈에 이름이 두 번`);
          seenAt(p[2], `${at} 후보 ${p[1]}`);
        }
      } else {
        for (const sh of svg.matchAll(/<g class="mv-shape" data-k="([^"]+)"[^>]*>([\s\S]*?)<\/g>/g)) assert.equal(place(cellsIn(sh[2])), place(M.shapes[sh[1]]), `${at}: ${sh[1]} 칸 자리`);
        // 이름표: 그 도형의 맨 위 칸보다 위, 어느 칠한 칸과도 안 겹친다
        const rects = [...svg.matchAll(/class="mv-cell" data-i="\d+" data-j="\d+" x="([\d.]+)" y="([\d.]+)" width="(\d+)"/g)].map((x) => ({ x: +x[1], y: +x[2], w: +x[3] }));
        for (const t of svg.matchAll(/class="mv-tag" data-k="([^"]+)" x="([\d.]+)" y="([\d.]+)"/g)) {
          const tx = +t[2]; const ty = +t[3]; const w = t[1].length * 13;
          assert.ok(!rects.some((r) => tx < r.x + r.w && tx + w > r.x && ty - 11 < r.y + r.w && ty > r.y), `${at}: 이름표 ${t[1]}이 칸과 겹친다`);
          const gi = svg.indexOf(`<g class="mv-shape" data-k="${t[1]}"`);
          const group = svg.slice(gi, svg.indexOf('</g>', gi));
          const ys = [...group.matchAll(/ y="([\d.]+)"/g)].map((y) => +y[1]);
          assert.ok(ys.length && ty < Math.min(...ys) && ty > Math.min(...ys) - 20, `${at}: 이름표 ${t[1]}(y ${ty})이 그 도형(맨 위 칸 y ${Math.min(...ys)}) 바로 위가 아니다`);
        }
        for (const [key, p] of Object.entries(M.pts)) assert.match(svg, new RegExp(`class="mv-pt" data-k="${key}" data-x="${p.x}" data-y="${p.y}"`), `${at}: 점 ${key}`);
        seenAt(svg, at);
      }
      n++;
    }
  }
  assert.ok(n > FIG_SEEDS * 4, `본 그림 ${n}`);
});

// 원고 검수 페이지(2단계)가 찾음 — 맨 윗줄 점의 이름표를 아래에 달아, 바로 아래 점의 이름표와 겹쳤다(위쪽으로 이동하는 문항에서 정답 ㉢·출발점도 센 ㉠)
test('🎨 모눈점 이름표: 서로 겹치지 않고 다른 점도 가리지 않는다 · 그림 안에 (맨 윗줄·맨 오른쪽 줄에 붙은 점까지)', () => {
  const figs = [];
  for (const { c, k, s, q } of every(['calc', 'misread'], SEEDS)) for (const f of figsOf(q.q)) if (f.kind === 'move' && Object.keys(moveOf(f.arg).pts).length) figs.push([`${c.id} ${k} #${s}`, f.arg]);
  // 생성기에서 드물게 나오는 자리를 일부러 — 맨 윗줄과 그 아래 · 맨 오른쪽 줄과 그 왼쪽 · 네 구석 · 1 cm 자 옆
  figs.push(['붙은 점 위', '8x6 ㄱ@3,3 ㉠@3,1 ㉡@3,6 ㉢@3,0'], ['붙은 점 오른쪽', '8x6 ㄱ@4,2 ㉠@8,2 ㉡@7,2 ㉢@0,2'], ['위 구석', '8x6 ㄱ@8,0 ㉠@7,0 ㉡@8,1 ㉢@7,1'],
    ['아래 구석', '8x6 ㄱ@8,6 ㉠@7,6 ㉡@8,5 ㉢@0,6'], ['1 cm 자 옆', '10x4 cm ㄱ@5,2 ㉠@0,4 ㉡@1,4 ㉢@2,4'],
    // 칸이 작은 모눈(한 칸 19px)에서 붙은 점 — 오른쪽 위가 막혀 다른 자리로 가야 한다
    ['작은 칸 붙은 점', '14x14 ㄱ@3,3 ㉠@4,3 ㉡@3,2 ㉢@4,4'], ['작은 칸 왼쪽 위 구석', '14x14 ㄱ@0,0 ㉠@1,0 ㉡@0,1']);
  let n = 0;
  for (const [at, arg] of figs) {
    const svg = figureSvg(`move ${arg}`);
    const [W, H] = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg).slice(1).map(Number);
    const dots = [...svg.matchAll(/class="mv-pt" data-k="([^"]+)" data-x="\d+" data-y="\d+" cx="([\d.]+)" cy="([\d.]+)"/g)].map((m) => ({ k: m[1], box: [+m[2] - 7, +m[3] - 7, +m[2] + 7, +m[3] + 7] }));
    const names = [...svg.matchAll(/class="mv-name" data-k="([^"]+)" x="([\d.]+)" y="([\d.]+)"/g)].map((m) => ({ k: m[1], box: [+m[2], +m[3] - 13, +m[2] + 15, +m[3] + 3] }));
    const ruler = /cm/.test(arg) ? [[...svg.matchAll(/<text x="([\d.]+)" y="([\d.]+)" font-size="13" fill="currentColor">1 cm<\/text>/g)].map((m) => [+m[1] - 70, +m[2] - 14, +m[1] + 30, +m[2] + 3])[0]] : [];
    assert.equal(names.length, dots.length, `${at}: 이름표 수`);
    const hit = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
    names.forEach((nm, i) => {
      assert.ok(nm.box[0] >= 0 && nm.box[1] >= 0 && nm.box[2] <= W && nm.box[3] <= H, `${at}: 이름표 ${nm.k}가 그림 밖 [move ${arg}]`);
      names.forEach((o, j) => { if (j > i) assert.ok(!hit(nm.box, o.box), `${at}: 이름표 ${nm.k}와 ${o.k}가 겹친다 [move ${arg}]`); });
      dots.forEach((d) => assert.ok(!hit(nm.box, d.box), `${at}: 이름표 ${nm.k}가 점 ${d.k}를 가린다 [move ${arg}]`));
      ruler.forEach((r) => assert.ok(!hit(nm.box, r), `${at}: 이름표 ${nm.k}가 1 cm 자를 가린다 [move ${arg}]`));
    });
    n++;
  }
  assert.ok(n > SEEDS * 2, `본 그림 ${n} (점 그림은 AB1 ①·②)`);
});

test('🎨 모양 나란히·디지털 숫자: 칸 수·모양이 지시문과 같다 · 일곱 막대는 이 파일의 표와 같다', () => {
  let n = 0;
  for (const { c, k, s, q } of every(['calc', 'misread'], FIG_SEEDS)) {
    for (const f of figsOf(q.q)) {
      const svg = figureSvg(`${f.kind} ${f.arg}`); const at = `${c.id} ${k} #${s}`;
      if (f.kind === 'shapes') {
        const o = shapesOf(f.arg);
        const items = [...svg.matchAll(/<g class="mv-item" data-k="([^"]+)" data-v="([^"]+)">([\s\S]*?)<\/g>/g)];
        assert.equal(items.length, Object.keys(o).length, at);
        for (const it of items) {
          if (o[it[1]] === '?') { assert.equal(it[2], '?'); continue; }
          assert.equal(norm(cellsOf(it[2])), norm(o[it[1]]), `${at}: ${it[1]}`);
          const cs = [...it[3].matchAll(/class="mv-cell" data-i="(\d+)" data-j="(\d+)"/g)].map((x) => [+x[1], +x[2]]);
          assert.equal(norm(cs), norm(o[it[1]]), `${at}: 그린 칸 ${it[1]}`);
        }
        n++;
      }
      if (f.kind === 'seg') {
        const cards = [...svg.matchAll(/<g class="mv-seg" data-d="(\d)">([\s\S]*?)<\/g>/g)];
        assert.equal(cards.map((x) => x[1]).join(''), f.arg.trim(), at);
        for (const cd of cards) {
          const on = [...cd[2].matchAll(/data-s="(\w)" data-on="1"/g)].map((x) => x[1]).join('');
          assert.equal(segKey(on), segKey(SEG7[cd[1]]), `${at}: 숫자 ${cd[1]} 막대`);
        }
        n++;
      }
    }
  }
  assert.ok(n > FIG_SEEDS * 6, `본 그림 ${n}`);
});

test('✍️ 판(draw): 점 찍기는 출발점만 그린 모눈 · 칠하기는 자리까지(밀기)·모양만(뒤집기·돌리기) · 판의 후보 = 문제 글의 후보 · 목표 = 따로 푼 답', () => {
  const kinds = {};
  for (const { c, s, q } of every(['calc'])) {
    if (!q.draw) continue;
    const at = `${c.id} #${s}`; const D = q.draw;
    const sv = solveText(q.q, q.choices); const okK = q.choices.find((x) => x.ok).text;
    kinds[`${D.mode}/${D.kind || ''}`] = (kinds[`${D.mode}/${D.kind || ''}`] || 0) + 1;
    if (D.mode === 'mpoint') {
      const M = moveOf(figsOf(q.q).find((f) => f.kind === 'move').arg); const B = moveOf(D.fig.replace(/^move /, ''));
      assert.deepEqual(Object.keys(B.pts), ['ㄱ'], `${at}: 판에 후보 점이 보인다`);
      assert.deepEqual(D.from, [M.pts['ㄱ'].x, M.pts['ㄱ'].y], at);
      assert.deepEqual(D.target, [M.pts[sv.ans].x, M.pts[sv.ans].y], `${at}: 목표`);
      assert.deepEqual(D.cands.map((x) => x.k).sort(), Object.keys(M.pts).filter((x) => LBL.includes(x)).sort(), at);
      for (const cd of D.cands) assert.deepEqual([cd.x, cd.y], [M.pts[cd.k].x, M.pts[cd.k].y], at);
    } else if (D.mode === 'mcells' && D.kind === 'place') {
      const M = moveOf(figsOf(q.q).find((f) => f.kind === 'move').arg); const B = moveOf(D.fig.replace(/^move /, ''));
      assert.equal(Object.keys(B.cands).length, 0, `${at}: 판에 후보가 보인다`);
      assert.equal(place(Object.values(B.shapes)[0]), place(Object.values(M.shapes)[0]), `${at}: 판의 처음(나중) 도형`);
      const tokCells = (t) => { const [xy, v] = t.split('='); const [x, y] = xy.split(',').map(Number); return cellsOf(v).map(([a, b]) => [a + x, b + y]); };
      for (const cd of D.cands) assert.equal(place(tokCells(cd.v)), place(M.cands[cd.k]), `${at}: 판 후보 ${cd.k}`);
      assert.equal(place(tokCells(D.target)), place(M.cands[sv.ans]), `${at}: 목표`);
      assert.equal(sv.ans, okK);
    } else if (D.mode === 'mcells' && D.kind === 'shape') {
      const S = shapesOf(D.fig.replace(/^shapes /, ''));
      assert.ok(q.q.includes(`[${D.fig}]`), `${at}: 판의 후보 그림이 문제 글의 것이 아니다`);
      for (const cd of D.cands) assert.equal(norm(cellsOf(cd.v)), norm(S[cd.k]), `${at}: 판 후보 ${cd.k}`);
      assert.equal(norm(cellsOf(D.target)), norm(S[sv.ans]), `${at}: 목표`);
    } else assert.fail(`${at}: 모르는 판 ${D.mode}`);
  }
  assert.ok(kinds['mpoint/'] > 10 && kinds['mcells/place'] > 10 && kinds['mcells/shape'] > SEEDS, JSON.stringify(kinds));
});

// ───────────────────── 쌍둥이·조사·말 ─────────────────────

test('🔁 쌍둥이·🤔 노트: 요청한 틀·갈래로 온다 · 같은 셈 · 쌍둥이 글이 원래 글과 같은 일은 드물다', () => {
  const same2 = {}; const tot = {};
  for (const c of MOVE) {
    for (let s = 1; s <= Math.min(SEEDS, 120); s++) {
      const q = qOf(c.id, 'calc', s);
      assert.ok(q.key, `${c.id} #${s}: 열쇠 없음`);
      const tw = makeQuestion(c.id, 'calc', s + 99991, { ...OPTS, want: { k: 'calc', key: q.key } });
      assert.equal(tw.key, q.key, `${c.id} #${s}: 쌍둥이가 다른 틀\n${q.q}\n---\n${tw.q}`);
      assert.equal(solveText(tw.q, tw.choices).type, solveText(q.q, q.choices).type, `${c.id} #${s}: 쌍둥이가 다른 셈`);
      tot[q.key] = (tot[q.key] || 0) + 1;
      if (tw.q === q.q) same2[q.key] = (same2[q.key] || 0) + 1;
      const m = qOf(c.id, 'misread', s);
      const mt = makeQuestion(c.id, 'misread', s + 99991, { ...OPTS, want: { k: 'misread', key: m.key } });
      assert.equal(mt.key, m.key, `${c.id} #${s}: ② 갈래`);
    }
  }
  for (const key of Object.keys(tot)) if (tot[key] >= 20) assert.ok((same2[key] || 0) / tot[key] <= 0.35, `쌍둥이 = 원래 글 ${same2[key]}/${tot[key]}: ${key}`);
});

test('★ 조사: 수 뒤는 읽는 소리 · ㉠~㉣은 받침 · 낱말 뒤 받침 · 쪽 뒤는 "으로"', () => {
  const BAT = new Set(['0', '1', '3', '6', '7', '8']);
  const PAIRS = [['을', '를'], ['은', '는'], ['이', '가'], ['과', '와'], ['이에요', '예요'], ['이니까', '니까'], ['이라서', '라서']];
  const jong = (ch) => { const code = ch.charCodeAt(0) - 0xac00; return code >= 0 && code < 11172 ? code % 28 : -1; };
  let hitN = 0; let hitW = 0;
  for (const { c, k, s, q } of every()) {
    const all = allText(q).replace(/\*\*/g, '').replace(/\[[a-z]+ [^\]]+\]/g, '');
    for (const [wb, nb] of PAIRS) {
      for (const m of all.matchAll(new RegExp(`(\\d)(${wb}|${nb})(?=[\\s.,!?)—]|$)`, 'g'))) { assert.equal(m[2], BAT.has(m[1]) ? wb : nb, `${c.id} ${k} #${s}: "…${m[1]}${m[2]}"\n${all}`); hitN++; }
      for (const m of all.matchAll(new RegExp(`([㉠-㉣])(${wb}|${nb})(?=[\\s.,!?)—]|$)`, 'g'))) assert.equal(m[2], wb, `${c.id} ${k} #${s}: "…${m[1]}${m[2]}"`);
      for (const m of all.matchAll(new RegExp(`(모양|도형|칸|점|부분|카드|무늬|규칙|방향)(${wb}|${nb})(?=[\\s.,!?)—]|$)`, 'g'))) { assert.equal(m[2], jong(m[1].slice(-1)) > 0 ? wb : nb, `${c.id} ${k} #${s}: "…${m[1]}${m[2]}"`); hitW++; }
    }
    assert.ok(!/쪽로|쪽에서부터로/.test(all), `${c.id} ${k} #${s}: "쪽로"`);
    assert.ok(!/(오른|왼|위|아래)쪽으로으로/.test(all), `${c.id} ${k} #${s}`);
  }
  assert.ok(hitW > SEEDS * 4, `실제로 본 곳: 수 ${hitN} · 낱말 ${hitW}`);
});

test('★ 풀이 카드: 단계 · 기억할 것 · 오답마다 왜 · 정답이 단계에 나온다', () => {
  for (const { c, k, s, q } of every()) {
    const sv = q.solve;
    assert.ok(sv && sv.steps.length >= 1 && sv.steps.length <= 4 && sv.rule, `${c.id} ${k} #${s}`);
    for (const w of q.choices.filter((x) => !x.ok)) assert.ok(sv.why[w.tag] || sv.whyAny, `${c.id} ${k} #${s}: "${w.tag}" 설명 없음`);
    const ok = q.choices.find((x) => x.ok).text;
    if (k === 'calc' && ok.length <= 16) assert.ok(sv.steps.join(' ').includes(ok.replace(/°$/, '')), `${c.id} #${s}: 정답 "${ok}"이 풀이에 없다\n${sv.steps.join('\n')}`);
  }
});

/** 처음 배우는 말 — 그 앞 칸의 글·보기·이름표에는 나오면 안 된다 */
const FIRST = [[/밀었|밀기|밀어|밀면|밀린|미끄러/, 'mv.slide'], [/뒤집|두 쪽/, 'mv.flip'], [/돌리|돌린|돌려|°|시계/, 'mv.turn'], [/무늬|규칙/, 'mv.pattern'], [/디지털|거꾸로/, 'mv.apply']];
test('★ 아직 안 배운 말을 앞 칸에 쓰지 않는다 — 밀기 AB2 · 뒤집기 AB3 · 돌리기·°·시계 AB5 · 무늬 AB7 · 거꾸로·디지털 AB8', () => {
  const idx = (id) => IDS.indexOf(id);
  for (const { c, k, s, q } of every()) {
    // ② 첫머리의 인물 이름은 뗀다 — 토이 스토리 "돌리"가 "돌리기"로 잡혔다
    const all = allText(k === 'misread' ? { ...q, q: q.q.replace(/^\S+ /, '') } : q) + ' ' + q.choices.map((x) => x.tag || '').join(' ');
    for (const [re, at] of FIRST) if (idx(at) > idx(c.id)) assert.ok(!re.test(all), `${c.id} ${k} #${s}: 아직 안 배운 ${re}\n${all}`);
  }
  for (const c of MOVE) for (const [re, at] of FIRST) if (idx(at) > idx(c.id)) assert.ok(!re.test(`${c.name} ${c.idea} ${c.rule} ${c.slip}`), `${c.id}: 설명에 ${re}`);
});

/** 참이라고 내미는 글에 틀린 말 — 오답 보기·② 보여 준 말은 빼고 */
const BAD = [
  [/밀면 모양이 바뀌/, '밀면 모양은 그대로'],
  [/위쪽으로 뒤집은 (모양|도형)과 아래쪽으로 뒤집은 \1은 (서로 )?달라/, '위쪽·아래쪽으로 뒤집은 모양은 같다'],
  [/180°만큼 돌리면 위쪽과 아래쪽만/, '180° 돌리면 왼쪽·오른쪽도 바뀐다'],
  [/360°만큼 돌리면 [^.\n]*바뀌어/, '360°는 처음 모양'],
  [/빈칸(이|을) [^.\n]*민 길이/, '민 길이는 같은 칸이 움직인 칸 수'],
];
test('★ 참말에 틀린 말이 없다 — 밀기·뒤집기·180°·360°·민 길이', () => {
  const truths = (q) => [q.choices.find((x) => x.ok).text, ...(q.solve ? [...q.solve.steps, ...Object.values(q.solve.why), q.solve.whyAny, q.solve.rule] : [])].join('\n').replace(/\*\*/g, '');
  for (const { c, k, s, q } of every()) { const t = truths(q); for (const [re, why] of BAD) assert.ok(!re.test(t), `${c.id} ${k} #${s}: ${why}\n${t}`); }
  for (const c of MOVE) for (const [re, why] of BAD) assert.ok(!re.test([c.idea, c.rule, c.slip].join('\n').replace(/\*\*/g, '')), `${c.id}: ${why}`);
});

test('🧭 범위(2022): 뒤집고 돌리기·돌리고 뒤집기 같은 두 움직임 문항 없음 · 돌리기는 90°의 배수 · 밀기·뒤집기는 네 쪽만', () => {
  for (const { c, k, s, q } of every()) {
    const t = q.q.replace(/\[[a-z]+ [^\]]+\]/g, '');
    assert.ok(!/뒤집고 돌|돌리고 뒤집|돌린 다음 뒤집|뒤집은 다음 돌/.test(t), `${c.id} ${k} #${s}: 두 움직임\n${t}`);
    for (const m of allText(q).matchAll(/(\d+)°/g)) assert.ok([90, 180, 270, 360].includes(+m[1]), `${c.id} ${k} #${s}: ${m[0]}`);
    assert.ok(!/대각선|비스듬히/.test(t), `${c.id} ${k} #${s}`);
  }
});

test('📏 진단·사다리·한 편·배움 예비·내용 검사', () => {
  const d = diagnosticSet(7, 5, OPTS);
  assert.equal(d.length, 5);
  assert.ok(d.every((q) => IDS.includes(q.concept)));
  const L0 = ladder([]);
  assert.equal(L0[0].state, 'now');
  assert.ok(L0.slice(1).every((r) => r.state === 'locked'));
  assert.ok(placeFrom(d.map((q) => ({ concept: q.concept, correct: false }))).startId);
  for (const c of MOVE) {
    const round = makeRound(c.id, 11, OPTS);
    assert.ok(round.length >= 2 && round.every((q) => q.concept === c.id), c.id);
    const les = lessonOf(c.id, 3, OPTS);
    assert.ok(les.pages.length >= 1 && les.title === c.name);
  }
  assert.equal(checkContent({}).length, 8, '원고가 없으면 칸마다 "내용 없음"');
});

// ───────────────────── 2단계: 원고 (coach/math/move.json) ─────────────────────
// 원고의 확인 질문도 문제 글·그림을 따로 읽어 **좌표로** 다시 움직여 풀고, 오답마다 이름표 있는 틀린 생각인지(한 오답 = 한 생각)를 본다.
// 배움 글의 그림은 그림을 말하는 문장("가는 처음 도형을 오른쪽으로 뒤집은 도형이에요")과 함께 — 그 말을 그림과 대조한다 (메모: 원고의 방향 말은 그림과, Z)

const CONTENT = JSON.parse(readFileSync(new URL('../coach/math/move.json', import.meta.url), 'utf8'));
const CAST = { me: '진우', mon: '피카츄', mon2: '리자몽' };
const fillC = (t) => String(t).replace(/\{(me|mon|mon2)(?:\/([^/}]+)\/([^}]+))?\}/g, (_, k, a, b) => {
  const n = CAST[k]; if (a === undefined) return n;
  const code = n.slice(-1).charCodeAt(0) - 0xac00; return n + (code >= 0 && code % 28 !== 0 ? a : b);
});
/** 원고 한 칸의 글 전부 (배움·확인 질문·보기·까닭·규칙·아빠 카드) */
const contentText = (v) => fillC([...v.lesson.flatMap((p) => [p.say, p.check.q, p.check.ok, ...p.check.no, p.check.why]), v.rule, v.dad.goal, ...v.dad.say, v.dad.do, v.dad.pass, ...v.dad.traps.flatMap((t) => [t.kid, t.dad])].join('\n'));
/** 참이라고 내미는 글 — 오답 보기·아이 말(함정 kid)은 빼고 */
const truthText = (v) => fillC([...v.lesson.flatMap((p) => [p.say, p.check.ok, p.check.why]), v.rule, v.dad.goal, ...v.dad.say, v.dad.do, v.dad.pass, ...v.dad.traps.map((t) => t.dad)].join('\n'));
const FIGS = /\[[a-z]+ [^\]]+\]/g;

/** 원고에만 있는 문제 틀 (생성기 틀은 solveText가 읽는다) */
function solveContent(q, chs) {
  const sv = solveText(q, chs);
  if (sv.type !== 'unknown') return sv;
  let m;
  // 점을 몇 cm 이동한 곳 고르기([4수03-05] '~cm') — "몇 칸" 틀로 바꿔 같은 풀이 · 그림에 1 cm 자가 있어야
  if ((m = /^모눈 한 칸의 길이는 1 cm예요\. 점 ㄱ을 (오른쪽|왼쪽|위쪽|아래쪽)으로 (\d+) cm 이동한 곳은 어느 것일까요\?\n\n\[move (\S+ cm [^\]]+)\]$/.exec(q))) {
    return { ...solveText(`점 ㄱ을 ${m[1]}으로 ${m[2]}칸 이동한 곳은 어느 것일까요?\n\n[move ${m[3]}]`, chs), type: 'pt1cm' };
  }
  return sv;
}
/** 원고 확인 질문 하나씩 — { id, i, at, q, why, chs(보기), sv(따로 읽은 문제) } */
function* checksOf() {
  for (const id of IDS) {
    for (const [i, p] of CONTENT[id].lesson.entries()) {
      const chs = [{ text: fillC(p.check.ok), ok: true }, ...p.check.no.map((t) => ({ text: fillC(t), ok: false }))];
      const q = fillC(p.check.q);
      yield { id, i, at: `${id}[${i}]`, p, q, why: fillC(p.check.why), chs, sv: solveContent(q, chs) };
    }
  }
}
/** 그림 속 후보 이름(㉠~㉣) — 모양 후보·모눈 후보·후보 점 */
function candLabels(q) {
  const out = new Set();
  for (const f of figsOf(q)) {
    if (f.kind === 'shapes') for (const k of Object.keys(shapesOf(f.arg))) if (LBL.includes(k)) out.add(k);
    if (f.kind === 'move') { const M = moveOf(f.arg); for (const k of [...Object.keys(M.cands), ...Object.keys(M.pts)]) if (LBL.includes(k)) out.add(k); }
  }
  return [...out].sort();
}
/** 까닭에 그 보기 이야기가 있나 — 수는 낱개로("6"이 "16" 속에서 잡히지 않게), 각도는 앞에 숫자 없이, 말은 그대로 */
function mentions(why, text) {
  if (/^\d+$/.test(text)) return new RegExp(`(?<!\\d)${text}(?!\\d)`).test(why);
  if (/^\d+°$/.test(text)) return new RegExp(`(?<!\\d)${text}`).test(why);
  return why.includes(text);
}

test('원고(move.json)가 형식 검사를 통과한다 — 8칸이 사다리 순서대로 · 배움 4~5장·장마다 확인 질문(보기 셋)·아빠 카드(말 2개↑·함정 2개↑·통과 기준)', () => {
  assert.deepEqual(checkContent(CONTENT), []);
  assert.deepEqual(Object.keys(CONTENT).filter((k) => k !== '_'), IDS);
  for (const id of IDS) {
    const v = CONTENT[id];
    assert.ok(v.lesson.length >= 4 && v.lesson.length <= 5, `${id}: 배움 ${v.lesson.length}장`);
    assert.ok(v.lesson.every((p) => p.check && p.check.no.length === 2), `${id}: 장마다 확인 질문(오답 둘)`);
    assert.ok(v.dad.say.length >= 2 && v.dad.traps.length >= 2 && /통과/.test(v.dad.pass), `${id}: 아빠 카드`);
    assert.ok(!/\{/.test([v.dad.goal, ...v.dad.say, v.dad.do, v.dad.pass, ...v.dad.traps.flatMap((t) => [t.kid, t.dad])].join(' ')), `${id}: 아빠 카드에 자리표시`);
  }
  const L = lessonOf('mv.turn', 3, { ...OPTS, content: CONTENT });
  assert.equal(L.pages.length, CONTENT['mv.turn'].lesson.length);
  assert.ok(L.pages.every((p) => p.check && p.check.ok));
  assert.equal(L.rule, CONTENT['mv.turn'].rule);
  // 형식 검사 자체 — 정답이 오답에도 있으면 잡는다
  const bad = JSON.parse(JSON.stringify(CONTENT)); bad['mv.flip'].lesson[0].check.no[0] = bad['mv.flip'].lesson[0].check.ok;
  assert.ok(checkContent(bad).some((x) => /정답이 오답에도/.test(x)));
});

test('★ 원고 확인 질문도 따로 풀어 대조 — 전부 읽히고, 맞는 보기는 정답 하나뿐 · 오답 하나하나가 **한** 틀린 생각에만 맞다 · 그림 후보 = 보기 · 까닭은 보기를 다 말한다 · 이름표 23개 다 쓰임', () => {
  let n = 0; const types = new Set(); const used = new Set();
  for (const { at, q, why, chs, sv } of checksOf()) {
    assert.notEqual(sv.type, 'unknown', `${at}: 못 읽는 확인 질문\n${q}`);
    types.add(sv.type);
    const right = chs.filter((x) => x.text === sv.ans);
    assert.ok(right.length === 1 && right[0].ok, `${at} (${sv.type}): 맞는 보기 ${right.map((x) => x.text).join(', ') || '없음'} — 따로 푼 답 ${sv.ans}\n${q}`);
    assert.ok(Object.values(sv.mis).every((list) => !list.includes(sv.ans)), `${at}: 정답이 틀린 생각에서도 나온다`);
    const labels = candLabels(q);
    if (labels.length) assert.deepEqual(chs.map((x) => x.text).sort(), labels, `${at}: 그림의 후보와 보기가 다르다`);
    for (const x of chs.filter((c) => !c.ok)) {
      const tags = Object.keys(sv.mis).filter((t) => sv.mis[t].includes(x.text));
      assert.equal(tags.length, 1, `${at} (${sv.type}): 오답 "${x.text}"에 맞는 틀린 생각 ${tags.length}개 ${tags.join(' · ')}\n${q}`);
      used.add(tags[0]);
      assert.ok(mentions(why, x.text), `${at}: 까닭에 오답 "${x.text}" 이야기가 없다\n${why}`);
      n++;
    }
    assert.ok(mentions(why, sv.ans), `${at}: 까닭에 정답 "${sv.ans}"이 없다\n${why}`);
  }
  assert.ok(n >= 66, `본 오답 ${n}`);
  assert.ok(types.size >= 20, `확인 질문 종류 ${types.size}: ${[...types]}`);
  assert.deepEqual(Object.values(TAGS).filter((t) => !used.has(t)), [], '원고 오답이 안 쓴 틀린 생각');
});

// 칸마다 그 칸의 문제
const CELL = {
  'mv.point': ['pt1', 'pt1cm', 'pt2', 'how'], 'mv.slide': ['pick', 'far', 'way'], 'mv.flip': ['flip', 'swaps'], 'mv.flip2': ['pair', 'twice', 'side'],
  'mv.turn': ['top', 'turn'], 'mv.turn2': ['same', 'turn', 'much'], 'mv.pattern': ['next', 'rule'], 'mv.apply': ['undoTurn', 'undoFlip', 'undoSlide', 'cards'],
};
test('★ 원고 확인 질문은 칸마다 그 칸의 문제(두 가지 이상) · 돌리기 칸은 90°·180°·270°, 성질 칸은 360° · 보기 꼴이 문제와 맞다(㉠~㉢ · 수 · 각도 · 말)', () => {
  const kinds = {};
  for (const { id, at, q, chs, sv } of checksOf()) {
    assert.ok(CELL[id].includes(sv.type), `${at}: 이 칸의 문제가 아니다 (${sv.type})`);
    (kinds[id] = kinds[id] || new Set()).add(sv.type);
    if (sv.type === 'turn') { const deg = +/(\d+)°만큼 돌렸을 때/.exec(q)[1]; assert.ok(id === 'mv.turn' ? deg < 360 : deg === 360, `${at}: ${deg}°`); }
    const form = /^[㉠-㉣]$/.test(sv.ans) ? /^[㉠-㉣]$/ : /^\d+$/.test(sv.ans) ? /^[1-9]\d*$/ : /^\d+°$/.test(sv.ans) ? /^(90|180|270|360)°$/ : /^[가-힣][가-힣0-9°, ]*(?: cm)?$/;
    for (const x of chs) assert.match(x.text, form, `${at} (${sv.type}): 보기 꼴 "${x.text}"`);
  }
  for (const id of IDS) assert.ok(kinds[id].size >= 2, `${id}: 확인 질문이 한 가지 문제뿐 ${[...kinds[id]]}`);
});

const DIRW = '(오른쪽|왼쪽|위쪽|아래쪽)'; const CWW = '(시계 방향|시계 반대 방향)'; const SIDE = '(?:위쪽|오른쪽|아래쪽|왼쪽)';
const ORDER = ['위쪽', '오른쪽', '아래쪽', '왼쪽'];
/** 두 도형(같은 줄·같은 칸줄) 사이의 빈칸 수 */
function gapOf(A, B) {
  const lo = (cs, i) => Math.min(...cs.map((c) => c[i])); const hi = (cs, i) => Math.max(...cs.map((c) => c[i]));
  const i = topLeft(A)[1] === topLeft(B)[1] ? 0 : 1;
  const [P, Q] = lo(A, i) < lo(B, i) ? [A, B] : [B, A];
  return lo(Q, i) - hi(P, i) - 1;
}
/**
 * 그림을 말하는 문장을 그 그림(figs)과 대조 → 본 말 수 { move, shapes, seg }
 * 점("점 ㄱ을 오른쪽으로 3칸 이동하면 ★에 가요") · 밀기("나중 도형은 처음 도형을 오른쪽으로 5 cm 민 도형" · "맨 왼쪽 칸끼리 6칸" · "빈칸 4칸") ·
 * 뒤집기·돌리기("가는 처음 도형을 …") · 거꾸로("가를 … 처음 도형이 돼요") · 무늬("1 → 2 → 3 → 4는 …씩 돌렸어요" · "1과 3이 같은 모양") · 카드
 */
function claimsOf(text, figs, at) {
  const t = text.replace(/\*\*/g, '').replace(FIGS, '');
  const mv = figs.find((f) => f.kind === 'move'); const M = mv && moveOf(mv.arg);
  const sh = figs.find((f) => f.kind === 'shapes'); const S = sh && shapesOf(sh.arg);
  const sg = figs.find((f) => f.kind === 'seg');
  const n = { move: 0, shapes: 0, seg: 0 };
  const need = (o, what) => { assert.ok(o, `${at}: ${what}이 그림에 없는데 그 말이 있다\n${t}`); return o; };
  const nm = (k) => { const v = need(S, '모양')[k]; assert.ok(v && v !== '?', `${at}: 그림에 ${k} 모양이 없다`); return v; };
  const shp = (k) => need(M && M.shapes[k], `${k} 도형`);
  const say = (m) => `${at}: "${m[0]}"이 그림과 다르다\n${t}`;
  let m;
  for (m of t.matchAll(new RegExp(`점 ㄱ을 ${DIRW}으로 (\\d+)칸(?:, ${DIRW}으로 (\\d+)칸)? 이동(?:하면|해도) (★|㉮)에 가요`, 'g'))) {
    const p = need(M && M.pts['ㄱ'], '점 ㄱ'); let x = p.x + VEC[KO[m[1]]][0] * m[2]; let y = p.y + VEC[KO[m[1]]][1] * m[2];
    if (m[3]) { x += VEC[KO[m[3]]][0] * m[4]; y += VEC[KO[m[3]]][1] * m[4]; }
    const goal = need(M.pts[m[5]], m[5]);
    assert.deepEqual([x, y], [goal.x, goal.y], say(m)); n.move++;
  }
  for (m of t.matchAll(new RegExp(`(?:나중 도형은 처음 도형을|모든 칸이) ${DIRW}으로 (\\d+)(?: cm 민 도형|칸씩)`, 'g'))) { assert.equal(place(shift(shp('처음'), KO[m[1]], +m[2])), place(shp('나중')), say(m)); n.move++; }
  for (m of t.matchAll(/맨 (왼쪽|위) 칸(?:에서 나중 도형의 맨 \1 칸까지|끼리) (\d+)칸/g)) {
    const i = m[1] === '왼쪽' ? 0 : 1; const a = topLeft(shp('처음')); const b = topLeft(shp('나중'));
    assert.ok(Math.abs(b[i] - a[i]) === +m[2] && b[1 - i] === a[1 - i], say(m)); n.move++;
  }
  for (m of t.matchAll(/사이의 빈칸 (\d+)칸/g)) { assert.equal(gapOf(shp('처음'), shp('나중')), +m[1], say(m)); n.move++; }
  for (m of t.matchAll(new RegExp(`나중 도형을 ${DIRW}으로 (\\d+) cm 밀면 처음 도형이 돼요`, 'g'))) { assert.equal(place(shift(shp('나중'), KO[m[1]], +m[2])), place(shp('처음')), say(m)); n.move++; }
  for (m of t.matchAll(new RegExp(`(가|[1-6])(?:은|는) 처음 도형을 ${DIRW}으로 뒤집은 도형`, 'g'))) { assert.equal(norm(nm(m[1])), norm(flipBy(KO[m[2]], nm('처음'))), say(m)); n.shapes++; }
  for (m of t.matchAll(new RegExp(`(가|[1-6])(?:은|는) 처음 도형을 ${CWW}으로 (\\d+)°만큼 돌린 도형`, 'g'))) { assert.equal(norm(nm(m[1])), norm(turn(nm('처음'), quarterOf(m[2], +m[3]))), say(m)); n.shapes++; }
  for (m of t.matchAll(new RegExp(`처음 도형을 ${DIRW}으로 뒤집어도 가가 돼요`, 'g'))) { assert.equal(norm(nm('가')), norm(flipBy(KO[m[1]], nm('처음'))), say(m)); n.shapes++; }
  for (m of t.matchAll(new RegExp(`처음 도형을 ${CWW}으로 (\\d+)°만큼 돌려도 가가 돼요`, 'g'))) { assert.equal(norm(nm('가')), norm(turn(nm('처음'), quarterOf(m[1], +m[2]))), say(m)); n.shapes++; }
  for (m of t.matchAll(new RegExp(`가를 ${DIRW}으로 (?:한 번 더 )?뒤집으면 처음 도형이 돼요`, 'g'))) { assert.equal(norm(flipBy(KO[m[1]], nm('가'))), norm(nm('처음')), say(m)); n.shapes++; }
  for (m of t.matchAll(new RegExp(`가를 ${CWW}으로 (\\d+)°만큼 돌리면 처음 도형이 돼요`, 'g'))) { assert.equal(norm(turn(nm('가'), quarterOf(m[1], +m[2]))), norm(nm('처음')), say(m)); n.shapes++; }
  for (m of t.matchAll(new RegExp(`처음 도형을 ${CWW}으로 ((?:[1-6](?:은|는) \\d+°만큼, )*[1-6](?:은|는) \\d+°만큼) 돌린 도형`, 'g'))) {
    for (const x of m[2].matchAll(/([1-6])(?:은|는) (\d+)°만큼/g)) assert.equal(norm(nm(x[1])), norm(turn(nm('처음'), quarterOf(m[1], +x[2]))), `${say(m)} — ${x[0]}`);
    n.shapes++;
  }
  for (m of t.matchAll(/([1-6])(?:은|는) 처음 도형과 같아요/g)) { assert.equal(norm(nm(m[1])), norm(nm('처음')), say(m)); n.shapes++; }
  for (m of t.matchAll(new RegExp(`([1-6](?: → [1-6])+)(?:은|는) (?:${CWW}으로 (\\d+)°만큼씩 돌렸어요|${DIRW}으로 뒤집기를 되풀이했어요)`, 'g'))) {
    const ks = m[1].split(' → ');
    const f = m[2] ? (cs) => turn(cs, quarterOf(m[2], +m[3])) : (cs) => flipBy(KO[m[4]], cs);
    for (let i = 0; i + 1 < ks.length; i++) assert.equal(norm(f(nm(ks[i]))), norm(nm(ks[i + 1])), `${say(m)} — ${ks[i]} → ${ks[i + 1]}`);
    n.shapes++;
  }
  for (m of t.matchAll(/([1-6])(?:과|와) ([1-6])(?:이|가) 같은 모양/g)) { assert.equal(norm(nm(m[1])), norm(nm(m[2])), say(m)); n.shapes++; }
  for (m of t.matchAll(/([1-6])의 위쪽 부분이 ([1-6])에서 (오른쪽|왼쪽|아래쪽)으로 갔어요/g)) {
    const ks = [1, 2, 3].filter((k) => norm(turn(nm(m[1]), k)) === norm(nm(m[2])));
    assert.ok(ks.length === 1 && topSide(ks[0]) === m[3], say(m)); n.shapes++;
  }
  for (m of t.matchAll(/카드 (\d+)(?:을|를) 한꺼번에 (시계 방향으로 180°만큼 돌리면|(?:오른쪽|왼쪽|위쪽|아래쪽)으로 뒤집으면)([^\n.]*?)(\d+)(?:이|가) 돼요/g)) {
    assert.equal(need(sg, '카드').arg.trim(), m[1], say(m));
    const how = m[2].startsWith('시계') ? 'turn' : /^(위쪽|아래쪽)/.test(m[2]) ? 'ud' : 'lr';
    const moved = [...m[1]].map((d) => segMove(+d, how));
    assert.equal(m[4], (how === 'ud' ? moved : [...moved].reverse()).join(''), say(m));
    for (const x of m[3].matchAll(/(\d) → (\d)/g)) assert.equal(segMove(+x[1], how), +x[2], `${say(m)} — ${x[0]}`);
    n.seg++;
  }
  return n;
}
/** 그림 없이도 참·거짓이 정해지는 방향 말 — 위쪽 부분이 가는 쪽 · "위쪽 → 오른쪽 → …" 차례 · 뒤집는 쪽과 바뀌는 쌍 → 본 말 수 */
function wordClaims(text, at) {
  let n = 0;
  for (const line of text.replace(/\*\*/g, '').replace(FIGS, '').split('\n')) {
    const say = (m) => `${at}: "${m[0]}"이 틀렸다\n${line}`;
    let m;
    // "시계 방향으로 90°만큼 돌리면 (도형의) 위쪽 부분이 오른쪽으로" · "…돌린 도형’은 위쪽 부분이 …" · 방향 없이 180°
    for (m of line.matchAll(new RegExp(`(?:${CWW}으로 )?(\\d+)°만큼 (?:돌리면|돌린 도형’?(?:은|도)) (?:도형의 |처음 도형의 )?위쪽 부분(?:은|이) (${SIDE}(?: → ${SIDE})*)(?:으로|에서)`, 'g'))) {
      const deg = +m[2]; const list = m[3].split(' → ');
      const dirs = m[1] ? [m[1]] : ['시계 방향', '시계 반대 방향'];
      for (const d of dirs) {
        const s = d === '시계 방향' ? 1 : -1;
        assert.equal(list[list.length - 1], topSide(s * deg / 90), say(m));
        if (list.length > 1) { assert.equal(list.length, deg / 90, say(m)); list.forEach((x, i) => assert.equal(x, topSide(s * (i + 1)), say(m))); }
      }
      n++;
    }
    // "시계 방향으로 90°만큼이면 오른쪽" · "180°만큼이면 아래쪽" (방향은 그 줄 앞쪽의 말)
    for (m of line.matchAll(/(\d+)°만큼이면 (오른쪽|왼쪽|아래쪽|위쪽)/g)) {
      const before = line.slice(0, m.index); const iCw = before.lastIndexOf('시계 방향'); const iCcw = before.lastIndexOf('시계 반대 방향');
      const dirs = iCw < 0 && iCcw < 0 ? [1, -1] : [iCw > iCcw ? 1 : -1];
      for (const s of dirs) assert.equal(m[2], topSide(s * +m[1] / 90), say(m));
      n++;
    }
    // "위쪽 → 왼쪽 → 아래쪽" 차례 — 그 줄 앞쪽의 방향으로 한 쪽씩 · "위쪽 부분이 오른쪽 → …"는 위쪽 다음부터
    for (m of line.matchAll(new RegExp(`${SIDE}(?: → ${SIDE})+`, 'g'))) {
      const before = line.slice(0, m.index); const iCw = before.lastIndexOf('시계 방향'); const iCcw = before.lastIndexOf('시계 반대 방향');
      assert.ok(iCw >= 0 || iCcw >= 0, `${at}: 방향 없는 차례 "${m[0]}"`);
      const s = iCw > iCcw ? 1 : -1;
      const list = m[0].split(' → ');
      if (/위쪽 부분이 $/.test(before)) list.unshift('위쪽');
      for (let i = 0; i + 1 < list.length; i++) assert.equal(list[i + 1], ORDER[(ORDER.indexOf(list[i]) + s + 4) % 4], say(m));
      n++;
    }
    // "오른쪽으로 뒤집으면 왼쪽과 오른쪽이 (서로) 바뀌어요" · "위쪽이나 아래쪽으로 …" · "오른쪽·왼쪽으로 …"
    for (m of line.matchAll(new RegExp(`((?:오른쪽|왼쪽|위쪽|아래쪽)(?:(?:·|이나 )(?:오른쪽|왼쪽|위쪽|아래쪽))?)으로 (?:뒤집으면|뒤집어도|넘기면|넘겨도) (왼쪽과 오른쪽|위쪽과 아래쪽)(?:이|만) `, 'g'))) {
      const lr = m[2] === '왼쪽과 오른쪽';
      for (const d of m[1].split(/·|이나 /)) assert.equal(d === '오른쪽' || d === '왼쪽', lr, say(m));
      n++;
    }
  }
  return n;
}

test('★ 원고의 그림 말이 그림과 맞다 — 배움 글의 그림마다 그 그림을 말하는 문장(점이 간 곳·민 길이·빈칸·뒤집은 쪽·돌린 각도·무늬의 규칙·카드의 수) · 까닭의 말도 그 문제 그림과', () => {
  let says = 0; let whys = 0; const kinds = { move: 0, shapes: 0, seg: 0 };
  for (const id of IDS) for (const [i, p] of CONTENT[id].lesson.entries()) {
    const at = `${id} ${i + 1}장`; const say = fillC(p.say);
    const figs = figsOf(say);
    assert.ok(figs.length >= 1, `${at}: 배움 글에 그림이 없다`);
    const n = claimsOf(say, figs, at);
    for (const f of figs) { assert.ok(n[f.kind] >= 1, `${at}: [${f.kind}] 그림을 말하는 문장이 없다\n${say}`); kinds[f.kind] += n[f.kind]; }
    says += n.move + n.shapes + n.seg;
    const w = claimsOf(fillC(p.check.why), figsOf(fillC(p.check.q)), `${at} 까닭`); whys += w.move + w.shapes + w.seg;
  }
  assert.ok(says >= 45 && whys >= 3 && kinds.move >= 10 && kinds.shapes >= 25 && kinds.seg >= 2, `본 그림 말: 배움 ${says} · 까닭 ${whys} · ${JSON.stringify(kinds)}`);
});

test('★ 원고의 방향 말 — 위쪽 부분이 가는 쪽("시계 방향으로 90°만큼 돌리면 위쪽 부분이 오른쪽으로") · "위쪽 → 왼쪽 → 아래쪽" 차례 · 뒤집는 쪽과 바뀌는 쌍 (배움 글·정답·까닭·규칙·아빠 카드)', () => {
  let n = 0;
  for (const id of IDS) n += wordClaims(truthText(CONTENT[id]), id);
  assert.ok(n >= 25, `본 방향 말 ${n}`);
  // 검사 자체 — 틀린 말을 잡는다
  assert.throws(() => wordClaims('시계 방향으로 90°만큼 돌리면 위쪽 부분이 왼쪽으로 가요.', 'x'));
  assert.throws(() => wordClaims('시계 반대 방향은 위쪽 → 오른쪽 → 아래쪽', 'x'));
  assert.throws(() => wordClaims('오른쪽으로 뒤집으면 위쪽과 아래쪽이 바뀌어요.', 'x'));
});

test('★ 원고 카드 문제의 까닭 — "6 → 9"처럼 숫자마다 바뀐 모양이 이 파일의 일곱 막대 표와 같다', () => {
  let n = 0;
  for (const { at, q, why, sv } of checksOf()) {
    if (sv.type !== 'cards') continue;
    const how = /시계 방향으로 180°만큼 돌리면/.test(q) ? 'turn' : /(위쪽|아래쪽)으로 뒤집으면/.test(q) ? 'ud' : 'lr';
    for (const x of why.matchAll(/(\d) → (\d)/g)) { assert.equal(segMove(+x[1], how), +x[2], `${at}: ${x[0]}`); n++; }
  }
  assert.ok(n >= 5, `본 숫자 ${n}`);
});

/** 아빠 카드 통과 기준의 문제 — 비대칭 모양 하나(그림 없이 말로 묻는 문제)를 이 파일의 좌표로 움직여 답한다 */
function solvePass(q) {
  const A = cellsOf('11/11/10');
  const D = '(오른쪽|왼쪽|위쪽|아래쪽)'; const W = '(시계 방향|시계 반대 방향)';
  const R = (s) => new RegExp(`^${s}$`);
  let m;
  if ((m = R(`모눈 한 칸의 길이가 1 cm일 때 (?:점|도형의 맨 왼쪽 칸)(?:을|이) ${D}으로 (\\d+)칸 (?:이동하면 몇 cm 이동한|움직였으면 몇 cm 민) 걸까요\\?`).exec(q))) return `${m[2]} cm`;
  if ((m = R(`점 ㄱ을 ${D}으로 (\\d+)칸, ${D}으로 (\\d+)칸 이동한 곳에서 점 ㄱ으로 돌아오려면 어떻게 이동해야 할까요\\?`).exec(q))) return `${NAME[OPP[KO[m[1]]]]}으로 ${m[2]}칸, ${NAME[OPP[KO[m[3]]]]}으로 ${m[4]}칸`;
  if ((m = R(`도형을 ${D}으로 (\\d+) cm 밀면 모양은 어떻게 될까요\\?`).exec(q))) return norm(shift(A, KO[m[1]], +m[2])) === norm(A) ? '그대로예요' : '바뀌어요';
  if ((m = R(`${D}으로 뒤집으면 무엇과 무엇이 서로 바뀔까요\\?`).exec(q))) return norm(flipBy(KO[m[1]], A)) === norm(T.lr(A)) ? '왼쪽과 오른쪽' : '위쪽과 아래쪽';
  if ((m = R(`${D}으로 뒤집은 도형과 ${D}으로 뒤집은 도형은 같을까요\\?`).exec(q))) return norm(flipBy(KO[m[1]], A)) === norm(flipBy(KO[m[2]], A)) ? '같아요' : '달라요';
  if ((m = R(`${D}으로 두 번 뒤집은 도형은 어떤 도형일까요\\?`).exec(q))) return norm(flipBy(KO[m[1]], flipBy(KO[m[1]], A))) === norm(A) ? '처음 도형' : null;
  if ((m = R(`${W}으로 (\\d+)°만큼 돌리면 위쪽 부분은 어느 쪽으로 갈까요\\?`).exec(q))) return topSide(quarterOf(m[1], +m[2]));
  if ((m = R(`${W}으로 (\\d+)°만큼 돌린 도형과 같아지려면 ${W}으로 몇 도만큼 돌려야 할까요\\?`).exec(q))) {
    const goal = norm(turn(A, quarterOf(m[1], +m[2]))); const ds = [90, 180, 270, 360].filter((d) => norm(turn(A, quarterOf(m[3], d))) === goal);
    return ds.length === 1 ? `${ds[0]}°` : null;
  }
  if ((m = R(`${W}으로 (\\d+)°만큼 돌린 도형은 어떤 도형일까요\\?`).exec(q))) return norm(turn(A, quarterOf(m[1], +m[2]))) === norm(A) ? '처음 도형' : null;
  if ((m = R(`(?:${W}으로 (\\d+)°만큼씩 돌린|${D}으로 뒤집기를 되풀이한) 무늬에서 1과 같은 모양이 처음으로 다시 나오는 것은 몇 번 모양일까요\\?`).exec(q))) {
    const f = m[1] ? (cs) => turn(cs, quarterOf(m[1], +m[2])) : (cs) => flipBy(KO[m[3]], cs);
    let cs = f(A); let j = 2; while (norm(cs) !== norm(A) && j < 9) { cs = f(cs); j++; }
    return `${j}번`;
  }
  if ((m = R(`카드 (\\d+)(?:을|를) 한꺼번에 (시계 방향으로 180°만큼 돌리면|${D}으로 뒤집으면) 어떤 수가 될까요\\?`).exec(q))) {
    const how = m[2].startsWith('시계') ? 'turn' : /^(위쪽|아래쪽)/.test(m[2]) ? 'ud' : 'lr';
    const moved = [...m[1]].map((d) => segMove(+d, how));
    return moved.includes(null) ? null : (how === 'ud' ? moved : moved.reverse()).join('');
  }
  if ((m = R(`어떤 도형을 ${W}으로 (\\d+)°만큼 돌렸더니 가가 되었어요\\. 처음 도형을 찾으려면 가를 어떻게 돌려야 할까요\\?`).exec(q))) {
    const B = turn(A, quarterOf(m[1], +m[2])); const back = m[1] === '시계 방향' ? '시계 반대 방향' : '시계 방향';
    return norm(turn(B, quarterOf(back, +m[2]))) === norm(A) ? `${back}으로 ${m[2]}°만큼` : null; // 교과서의 "거꾸로" — 반대 방향으로 같은 만큼
  }
  return null;
}
test('★ 원고 아빠 카드: 통과 기준의 문제를 따로 풀어 괄호 속 답과 대조', () => {
  let n = 0;
  for (const id of IDS) {
    const ps = fillC(CONTENT[id].dad.pass);
    const qs = [...ps.matchAll(/"([^"]+)"/g)].map((x) => x[1]);
    const ans = ((/\(([^)]+)\)/.exec(ps.replace(/"[^"]+"/g, '')) || [])[1] || '').split(' · ');
    assert.ok(qs.length >= 2, `${id}: 통과 기준의 문제 ${qs.length}개 "${ps}"`);
    assert.equal(ans.length, qs.length, `${id}: 문제 ${qs.length}개 · 답 ${ans.length}개`);
    qs.forEach((q, k) => {
      const a = solvePass(q);
      assert.ok(a, `${id}: 못 읽는 통과 기준 문제 "${q}"`);
      assert.equal(ans[k], a, `${id}: "${q}"의 답 ${ans[k]} ≠ ${a}`);
      n++;
    });
  }
  assert.ok(n >= 16, `본 통과 기준 문제 ${n}`);
});

test('🎨 원고의 그림: 모두 그려지고 글로도 바뀐다 · 배움 글엔 후보(㉠~㉣) 그림이 없다 · 확인 질문의 후보는 셋', () => {
  let n = 0;
  for (const id of IDS) for (const [i, p] of CONTENT[id].lesson.entries()) {
    const at = `${id} ${i + 1}장`;
    for (const src of [p.say, p.check.q]) {
      for (const m of fillC(src).matchAll(/\[([a-z]+) ([^\]]+)\]/g)) { assert.ok(figureSvg(`${m[1]} ${m[2]}`).startsWith('<svg'), `${at}: 못 그림 ${m[0]}`); n++; }
      assert.ok(!/\[(move|shapes|seg) /.test(renderFigures(fillC(src))) && !/\[(move|shapes|seg) /.test(figText(fillC(src))), `${at}: 지시문이 글로 남는다`);
    }
    assert.equal(candLabels(fillC(p.say)).length, 0, `${at}: 배움 글에 후보 그림`);
    const c = candLabels(fillC(p.check.q)); assert.ok(c.length === 0 || c.length === 3, `${at}: 후보 ${c.length}개`);
  }
  assert.ok(n >= 70, `본 그림 ${n}`);
});

test('★ 원고의 조사·말 (배움 글·확인 질문·아빠 카드 전부) — 수·°·cm 뒤 · ㉠~㉣·★·점 ㄱ 뒤는 받침 · ㉮ 뒤는 받침 없음 · 낱말 뒤 · "쪽로" 없음', () => {
  const BAT = new Set(['0', '1', '3', '6', '7', '8']);
  const PAIRS = [['을', '를'], ['은', '는'], ['이', '가'], ['과', '와'], ['이에요', '예요'], ['이었어요', '였어요'], ['이라서', '라서']];
  const END = '(?=[\\s.,!?)—"·’]|$)';
  const jong = (ch) => { const code = ch.charCodeAt(0) - 0xac00; return code >= 0 && code < 11172 ? code % 28 : -1; };
  let hitN = 0; let hitW = 0;
  for (const id of IDS) {
    const all = contentText(CONTENT[id]).replace(/\*\*/g, '').replace(FIGS, '');
    for (const [wb, nb] of PAIRS) {
      for (const m of all.matchAll(new RegExp(`(?<![\\d/])(\\d+)(${wb}|${nb})${END}`, 'g'))) { assert.equal(m[2], BAT.has(m[1].slice(-1)) ? wb : nb, `${id}: "…${m[1]}${m[2]}"`); hitN++; }
      for (const m of all.matchAll(new RegExp(`(°|cm|㉮)(${wb}|${nb})${END}`, 'g'))) assert.equal(m[2], nb, `${id}: "…${m[1]}${m[2]}" — 도·센티미터·가는 받침 없음`);
      for (const m of all.matchAll(new RegExp(`([㉠-㉣★]|점 ㄱ)(${wb}|${nb})${END}`, 'g'))) { assert.equal(m[2], wb, `${id}: "…${m[1]}${m[2]}"`); hitN++; }
      for (const m of all.matchAll(new RegExp(`(모양|도형|칸|점|부분|카드|무늬|규칙|방향|쪽|그림|가로|세로|순서|종이)(${wb}|${nb})${END}`, 'g'))) { assert.equal(m[2], jong(m[1].slice(-1)) > 0 ? wb : nb, `${id}: "…${m[1]}${m[2]}"`); hitW++; }
    }
    for (const m of all.matchAll(/(?<![\d/])(\d+)(으로|로)(?=[\s.,"’]|$)/g)) assert.equal(m[2], ['1', '7', '8'].includes(m[1].slice(-1)) ? '로' : BAT.has(m[1].slice(-1)) ? '으로' : '로', `${id}: "…${m[1]}${m[2]}"`);
    assert.ok(!/쪽로|쪽으로으로/.test(all), `${id}: "쪽로"`);
    assert.ok(!/-\d|\d-|\.\.\./.test(all), `${id}: ASCII 빼기·줄임표`);
  }
  assert.ok(hitN >= 80 && hitW >= 80, `실제로 본 조사: 수·기호 ${hitN} · 낱말 ${hitW}`);
});

test('★ 원고: 아직 안 배운 말을 앞 칸에 쓰지 않는다 · 참말에 틀린 말이 없다 · 범위(2022) — 두 움직임 없음·90°의 배수·네 쪽만', () => {
  const idx = (id) => IDS.indexOf(id);
  for (const id of IDS) {
    const v = CONTENT[id];
    const all = contentText(v);
    for (const [re, from] of FIRST) if (idx(from) > idx(id)) assert.ok(!re.test(all), `${id}: 아직 안 배운 ${re} — ${(all.match(re) || [])[0]}`);
    const truth = truthText(v).replace(/\*\*/g, '').replace(FIGS, '');
    for (const [re, why] of BAD) assert.ok(!re.test(truth), `${id}: ${why} — ${(truth.match(re) || [])[0]}`);
    const plain = all.replace(FIGS, '');
    assert.ok(!/뒤집고 돌|돌리고 뒤집|돌린 다음 뒤집|뒤집은 다음 돌|대각선|비스듬히/.test(plain), `${id}: 범위 밖 움직임`);
    for (const m of plain.matchAll(/(\d+)°/g)) assert.ok([90, 180, 270, 360].includes(+m[1]), `${id}: ${m[0]}`);
  }
});

test('원고는 배포 파일 검사(check.mjs)에도 걸린다 — move.json → mathmove.js의 checkContent', () => {
  const src = readFileSync(new URL('../tools/check.mjs', import.meta.url), 'utf8');
  assert.ok(src.includes("'coach/math/move.json': '../js/mathmove.js'"));
});

// ───────────────────── 3단계: 화면 연결 ─────────────────────

test('화면 연결 (3단계): STEMS.move(AB)는 이 생성기·원고를 쓰고 Z 각도 다음·J 삼각형·사각형 바로 앞 · 앱 셸이 둘 다 들고 간다 · 사다리 안내에 틀린 말 없음 · 그림을 📊·❓가 안다', async () => {
  const { STEMS, STEM_ORDER, stemOf } = await import('../js/mathprog.js');
  const S = STEMS.move;
  assert.equal(S.key, 'move');
  assert.equal(S.code, 'AB');
  assert.equal(S.label, '평면도형의 이동 줄기', '줄기 고르기·📊에 보이는 이름');
  const at = STEM_ORDER.indexOf('move');
  assert.deepEqual(STEM_ORDER.slice(at - 1, at + 2), ['angle', 'move', 'shape'], 'Z 각도 다음·J 삼각형·사각형 바로 앞 (90°·180°는 각도에서 배운다)');
  assert.equal(S.list, MOVE);
  assert.equal(S.gen.makeQuestion, makeQuestion);
  assert.equal(S.gen.lessonOf, lessonOf, '📚 배움은 이 생성기의 lessonOf');
  assert.equal(S.lesson, true);
  assert.equal(S.file, './coach/math/move.json');
  assert.equal(S.range, '초4');
  assert.ok(IDS.every((id) => stemOf(id) === S), '모든 칸이 AB 줄기로 찾아진다');
  assert.match(S.pick, /위쪽 부분/);
  const guide = `${S.pick} ${S.intro}`.replace(/\*\*/g, '');
  for (const [re, why] of BAD) assert.ok(!re.test(guide), `안내에 ${why}`);
  // 앱이 가져오는 원고(S.file)로 배움 장이 그대로 만들어진다
  const content = JSON.parse(readFileSync(new URL(S.file.replace('./', '../'), import.meta.url), 'utf8'));
  for (const id of IDS) assert.equal(S.gen.lessonOf(id, 5, { ...OPTS, content }).pages.length, content[id].lesson.length, `${id}: 원고 배움 장`);
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  for (const f of ['./js/mathmove.js', './coach/math/move.json', './js/drawview.js']) assert.ok(sw.includes(`'${f}'`), `APP_SHELL에 ${f}`);
  // 답은 ㉠~㉣·말·수 — 수 답만 숫자판(± 없음), 고르기는 보기 그대로
  for (let s = 1; s <= 40; s++) {
    const q = makeQuestion('mv.slide', 'calc', s, OPTS); const spec = padSpec(q, S.key);
    if (/^\d+$/.test(q.choices.find((x) => x.ok).text)) assert.ok(spec && spec.signed === false, `#${s}: 숫자판 ± 없음`);
    else assert.equal(spec, null, `#${s}`);
  }
  // 📊 펼친 문제 글(figText)·❓ 복사문·📊 답장 안내 — 모눈·모양·숫자 카드를 안다, 안내의 예는 그대로 그려진다
  assert.equal(figText('앞 [move 8x6 ㄱ@2,3 ★@5,3] 뒤', true), '앞 (그림) 뒤');
  const ask = readFileSync(new URL('../js/mathask.js', import.meta.url), 'utf8');
  const stats = readFileSync(new URL('../js/stats.js', import.meta.url), 'utf8');
  for (const ex of ['[move 8x6 ㄱ@2,3 ★@5,3]', '[shapes 처음=10/10/11 가=01/01/11]', '[seg 258]']) {
    assert.ok(ask.includes(ex) && stats.includes(ex), `❓ 복사문·📊 답장 안내에 ${ex}`);
    assert.ok(renderFigures(ex).startsWith('<svg'), `안내의 예도 그려진다 ${ex}`);
  }
});

/** 판이 서는 문항 하나씩 — { c, s, q, D(draw), sv(따로 푼 문제) } */
function* boardsOf(n = SEEDS) {
  for (const c of MOVE) for (let s = 1; s <= n; s++) {
    const q = qOf(c.id, 'calc', s);
    if (q.draw) yield { c, s, q, D: q.draw, sv: solveText(q.q, q.choices), at: `${c.id} #${s}` };
  }
}
/** math.js qTextOf와 같은 바꾸기 (화면 없이 문제 글만 — 소스가 이 줄 그대로인지는 아래 배선 검사가 본다) */
const boardText = (q, D) => (D.mode === 'mpoint'
  ? String(q.q).replace(/\[move [^\]]+\]/g, '').replace('어느 것일까요?', '어디일까요?').replace(/\n{3,}/g, '\n').trim()
  : (D.kind === 'place' ? String(q.q).replace(/\[move [^\]]+\]/g, '') : String(q.q).split(`[${D.fig}]`).join('')).replace(/(도형|모양)은 어느 것일까요\?/, (_, w) => `${w}을 ${D.kind === 'place' ? '모눈' : '칸'}에 칠해 보세요.`).replace(/\n{3,}/g, '\n').trim());

test('✍️ 모눈점 찍기 판 (3단계): 판에는 출발점 ㄱ만 · 목표 = 따로 푼 답 · 후보 점에 찍으면 그 보기(오개념 이름표 그대로) · 다른 자리는 "점 ㄱ에서 …"(보기와 안 겹치고 다시 읽힌다·📊 24자 안) · 문제 글은 후보 모눈을 빼고 "어디일까요?"', async () => {
  const { canDraw, mpointOf, mpointText, mpointSay, mpointFromText } = await import('../js/drawview.js');
  let n = 0;
  for (const { q, D, sv, at } of boardsOf()) {
    if (D.mode !== 'mpoint') continue;
    assert.ok(canDraw(D), at);
    const g = mpointOf(D);
    const M = moveOf(figsOf(q.q).find((f) => f.kind === 'move').arg);
    // 판 = 문제 모눈과 같은 크기, 점은 ㄱ 하나(후보를 숨겨도 판 크기가 답을 흘리지 않는다 — 문제 모눈 그대로)
    assert.deepEqual([g.sp.W, g.sp.H], [M.W, M.H], `${at}: 판 크기`);
    assert.deepEqual(g.sp.pts.map((p) => p.k), ['ㄱ'], `${at}: 판에 후보 점이 보인다`);
    assert.deepEqual(g.target, M.pts[sv.ans], `${at}: 목표 ≠ 따로 푼 답 ${sv.ans}`);
    // 모든 모눈점을 찍어 본다 — 후보면 그 이름(보기에 있고 정답 표시가 맞다), 아니면 짐작한 답
    for (let x = 0; x <= M.W; x++) for (let y = 0; y <= M.H; y++) {
      const t = mpointText(g, { x, y });
      const cand = Object.keys(M.pts).find((k) => LBL.includes(k) && M.pts[k].x === x && M.pts[k].y === y);
      if (cand) {
        assert.equal(t, cand, `${at}: (${x}, ${y})`);
        const ch = q.choices.find((z) => z.text === cand);
        assert.ok(ch && !!ch.ok === (cand === sv.ans), `${at}: 후보 ${cand} 보기·정답 표시`);
        if (!ch.ok) assert.ok(ch.tag && tagHolds(sv, ch.tag, cand), `${at}: 후보 ${cand} 이름표`);
      } else {
        assert.ok(!q.choices.some((z) => z.text === t), `${at}: 짐작한 답 "${t}"이 보기와 겹친다`);
        assert.ok(t.length <= 24, `${at}: 📊 기록이 잘린다 "${t}"`);
        assert.deepEqual(mpointFromText(g, t), { x, y }, `${at}: 답한 뒤 화면이 "${t}"을 다시 못 찍는다`);
      }
    }
    // 답한 뒤 말 = 생성기의 말 (출발점에서 가로 먼저) · 문제 글은 후보 모눈만 빼고
    assert.match(mpointSay(g, g.target), /^점 ㄱ에서 (?:(오른쪽|왼쪽)으로 \d+칸)?(?:, )?(?:(위쪽|아래쪽)으로 \d+칸)?$/);
    assert.equal(q.q.split('어느 것일까요?').length, 2, `${at}: 바꿀 말이 한 번`);
    const bt = boardText(q, D);
    assert.ok(!/\[move /.test(bt) && bt.endsWith('어디일까요?'), `${at}: ${bt}`);
    n++;
  }
  assert.ok(n > SEEDS / 3, `본 점 찍기 판 ${n}`);
  // 말이 안 되는 draw는 판을 안 연다 (보기로 되돌아간다)
  const D = [...boardsOf(30)].find((b) => b.D.mode === 'mpoint').D;
  for (const bad of [
    { ...D, fig: `${D.fig} ㉠@0,0` }, // 판에 후보 점
    { ...D, target: [99, 99] }, // 목표가 후보에 없다
    { ...D, cands: D.cands.slice(0, 1) }, // 후보 하나
    { ...D, from: [D.from[0] + 1, D.from[1]] }, // 출발점이 그림과 다르다
    (() => { const w = D.cands.filter((c) => c.x !== D.target[0] || c.y !== D.target[1]); return { ...D, cands: D.cands.map((c) => (c === w[1] ? { ...c, x: w[0].x, y: w[0].y } : c)) }; })(), // 오답 후보 둘이 한 자리 (목표는 그대로 — 변이 검사가 찾음)
    { ...D, fig: 'move 8x6' }, // 못 읽는 그림
  ]) assert.equal(canDraw(bad), false, JSON.stringify(bad));
});

test('✍️ 모눈 칸 칠하기 판 (3단계): 밀기는 문제 모눈째 자리까지 · 뒤집기·돌리기·무늬는 늘 5 × 5에 모양만 · 목표 = 따로 푼 답 · 후보를 칠하면 그 보기 · 다른 칸은 짐작한 답(보기와 안 겹치고 다시 읽힌다) · 문제 글은 후보 그림을 빼고 "칠해 보세요"', async () => {
  const { canDraw, mcellsOf, mcellsTap, mcellsText, mcellsFromText } = await import('../js/drawview.js');
  const kinds = {};
  const paint = (g, cells) => cells.reduce((v, [x, y]) => mcellsTap(g, v, x, y), '');
  for (const { c, q, D, sv, at } of boardsOf()) {
    if (D.mode !== 'mcells') continue;
    assert.ok(canDraw(D), at);
    const g = mcellsOf(D);
    kinds[`${c.id}:${g.kind}`] = (kinds[`${c.id}:${g.kind}`] || 0) + 1;
    const F = figsOf(q.q);
    let candCells;
    if (g.kind === 'place') {
      const M = moveOf(F.find((f) => f.kind === 'move').arg);
      assert.deepEqual([g.W, g.H], [M.W, M.H], `${at}: 판 = 문제 모눈 크기`);
      assert.equal(place(g.base.cells), place(Object.values(M.shapes)[0]), `${at}: 판의 처음·나중 도형 자리`);
      candCells = M.cands;
    } else {
      assert.deepEqual([g.W, g.H], [5, 5], `${at}: 모양 판은 늘 5 × 5`);
      candCells = F.map((f) => shapesOf(f.arg)).find((o) => Object.keys(o).some((k) => LBL.includes(k)));
      assert.ok(q.q.includes(`[${D.fig}]`), `${at}: 판의 후보 그림이 문제 글의 것`);
    }
    assert.deepEqual(g.cands.map((z) => z.k).sort(), Object.keys(candCells).filter((k) => LBL.includes(k)).sort(), `${at}: 판 후보`);
    assert.equal(g.target.k, sv.ans, `${at}: 목표 ≠ 따로 푼 답`);
    // 후보 모양을 빈 판에 칠하면 그 이름 — 모양 판은 판 어디에 칠해도(왼쪽 위·한 칸 옮겨서)
    for (const z of g.cands) {
      assert.equal(g.kind === 'place' ? place(z.cells) : norm(z.cells), g.kind === 'place' ? place(candCells[z.k]) : norm(candCells[z.k]), `${at}: 후보 ${z.k} 칸`);
      assert.equal(mcellsText(g, paint(g, z.cells)), z.k, `${at}: 후보 ${z.k}를 칠하면 그 이름`);
      if (g.kind === 'shape') assert.equal(mcellsText(g, paint(g, z.cells.map(([x, y]) => [x + 1, y + 1]))), z.k, `${at}: 한 칸 옮겨 칠해도 ${z.k}`);
      const ch = q.choices.find((x) => x.text === z.k);
      assert.ok(ch && !!ch.ok === (z.k === sv.ans), `${at}: 후보 ${z.k} 보기·정답 표시`);
      if (!ch.ok) assert.ok(ch.tag && tagHolds(sv, ch.tag, z.k), `${at}: 후보 ${z.k} 이름표`);
    }
    // 짐작한 답 — 자리 판: 처음(나중) 도형을 판 안 모든 자리로 옮겨 칠해 본다 · 모양 판: 후보가 아닌 모양 몇 개
    const guesses = [];
    if (g.kind === 'place') {
      for (let dx = -g.W; dx <= g.W; dx++) for (let dy = -g.H; dy <= g.H; dy++) {
        const cs = g.base.cells.map(([x, y]) => [x + dx, y + dy]);
        if (cs.every(([x, y]) => x >= 0 && y >= 0 && x < g.W && y < g.H)) guesses.push(cs);
      }
      guesses.push(g.base.cells.slice(1)); // 한 칸 덜 칠함 → 바뀐 모양
    } else {
      guesses.push([[0, 0]], [[0, 0], [1, 0], [2, 0], [3, 0]], [[0, 0], [1, 1], [2, 2]], g.target.cells.slice(1));
    }
    for (const cs of guesses) {
      const v = paint(g, cs); const t = mcellsText(g, v);
      if (LBL.includes(t)) { assert.equal(g.kind === 'place' ? place(g.cands.find((z) => z.k === t).cells) : norm(g.cands.find((z) => z.k === t).cells), g.kind === 'place' ? place(cs) : norm(cs), `${at}: ${t}`); continue; }
      assert.ok(!q.choices.some((z) => z.text === t), `${at}: 짐작한 답 "${t}"이 보기와 겹친다`);
      if (!/^(칠한|바뀐) 모양 /.test(t) || cs.length <= 5) assert.ok(t.length <= 24, `${at}: 📊 기록이 잘린다 "${t}" (${t.length}자)`);
      const back = mcellsFromText(g, t);
      if (/ 옮김$| 자리 그대로$/.test(t)) assert.equal(place(back), place(cs), `${at}: "${t}"을 다시 못 칠한다`);
      else assert.equal(norm(back), norm(cs), `${at}: "${t}"의 모양을 다시 못 칠한다`);
    }
    // 문제 글: 바꿀 말이 한 번 · 후보 그림은 빠지고(자리 판은 모눈째) 처음 도형·무늬 그림은 남는다
    assert.equal((q.q.match(/(도형|모양)은 어느 것일까요\?/g) || []).length, 1, `${at}: 바꿀 말이 한 번`);
    const bt = boardText(q, D);
    assert.ok(/(도형|모양)을 (모눈|칸)에 칠해 보세요\./.test(bt) && !/어느 것일까요/.test(bt), `${at}: ${bt}`);
    assert.ok(!/㉠/.test(bt), `${at}: 후보 그림이 남는다\n${bt}`);
    if (g.kind === 'shape') assert.ok(/\[shapes /.test(bt), `${at}: 처음 도형·무늬 그림이 사라졌다`);
  }
  for (const k of ['mv.slide:place', 'mv.apply:place', 'mv.flip:shape', 'mv.flip2:shape', 'mv.turn:shape', 'mv.turn2:shape', 'mv.pattern:shape', 'mv.apply:shape']) assert.ok(kinds[k] > 10, `${k} 판 ${kinds[k] || 0}`);
  // 칠하기는 누르면 칠하고 다시 누르면 지운다 · 판 밖은 그대로
  const g0 = { W: 5, H: 5 };
  assert.equal(mcellsTap(g0, '', 1, 2), '1,2');
  assert.equal(mcellsTap(g0, '1,2 0,3', 1, 2), '0,3');
  assert.equal(mcellsTap(g0, '0,0', 5, 0), '0,0');
  // 말이 안 되는 draw는 판을 안 연다
  const all = [...boardsOf(40)];
  const P = all.find((b) => b.D.mode === 'mcells' && b.D.kind === 'place').D;
  const Sh = all.find((b) => b.D.mode === 'mcells' && b.D.kind === 'shape').D;
  for (const bad of [
    { ...P, fig: `${P.fig} ${P.cands.slice(0, 2).map((c) => `${c.k}@${c.v}`).join(' ')}` }, // 판에 후보 도형 (둘 — 하나면 그림 읽기에서 먼저 막힌다)
    { ...P, target: '0,0=1' }, // 목표가 후보에 없다
    { ...P, cands: P.cands.slice(0, 1) }, // 후보 하나
    (() => { const w = P.cands.filter((c) => c.v !== P.target); return { ...P, cands: P.cands.map((c) => (c === w[1] ? { ...c, v: w[0].v } : c)) }; })(), // 오답 후보 둘이 같은 자리·모양 (목표는 그대로)
    (() => { const w = Sh.cands.filter((c) => c.v !== Sh.target); const cands = Sh.cands.map((c) => (c === w[1] ? { ...c, v: w[0].v } : c)); return { ...Sh, cands, fig: `shapes ${cands.map((c) => `${c.k}=${c.v}`).join(' ')}` }; })(), // 모양 판 오답 후보 둘이 같은 모양 (그림도 같게)
    { ...P, cands: P.cands.map((c, i) => (i ? c : { ...c, v: c.v.replace(/^\d+,/, '99,') })) }, // 후보가 판 밖
    { ...P, kind: 'shape' }, // 종류가 그림과 다르다
    { ...Sh, fig: Sh.fig.replace('㉠=', '#=').replace('㉡=', '㉠=').replace('#=', '㉡=') }, // 그림 후보 이름이 draw와 다르다
    { ...Sh, cands: Sh.cands.map((c, i) => (i ? c : { ...c, v: '11111' })) }, // 그림과 값이 다르다
    { ...Sh, kind: 'place' }, // 종류가 그림과 다르다
    { ...Sh, mode: 'cells' }, // 🧊 칸 칠하기 판으로는 못 연다
  ]) assert.equal(canDraw(bad), false, JSON.stringify(bad).slice(0, 160));
  assert.equal(canDraw({ ...Sh, fig: `shapes ${Sh.cands.map((c) => `${c.k}=${c.v}`).join(' ')}` }), true, '그림을 "/" 꼴로 다시 써도 연다 (위 겹침 시험의 대조군)');
  // 모양 판 5 × 5에 안 들어가는 모양(가로 5칸)은 판을 안 연다
  const wide = { mode: 'mcells', kind: 'shape', fig: 'shapes ㉠=11111 ㉡=1111', cands: [{ k: '㉠', v: '11111' }, { k: '㉡', v: '1111' }], target: '1111' };
  assert.equal(canDraw(wide), false, '가로 5칸 모양');
  assert.equal(canDraw({ ...wide, fig: 'shapes ㉠=111 ㉡=1111', cands: [{ k: '㉠', v: '111' }, { k: '㉡', v: '1111' }] }), true, '4칸까지는 연다');
});

test('✍️ 판 배선 (3단계): 문항·🔁 쌍둥이 둘 다 판을 연다(숫자판 없이도) · 찍은·칠한 글자로 보기를 찾는다 · 문제 글 바꾸기 · 판·답한 뒤 화면 · ❓ "직접 찍음·칠함"', async () => {
  const src = readFileSync(new URL('../js/math.js', import.meta.url), 'utf8');
  assert.ok(src.includes("if (q.draw && (q.draw.mode === 'grid' || q.draw.mode === 'plane' || q.draw.mode === 'cells' || q.draw.mode === 'mpoint' || q.draw.mode === 'mcells')) return done !== 'choice' && (done === 'typed' || padOn()) && ui.round && ui.round.mode !== 'special' && canDraw(q.draw) ? q.draw : null;"), 'drawFor');
  assert.ok(src.includes("if (draw.mode === 'mpoint') return String(q.q).replace(/\\[move [^\\]]+\\]/g, '').replace('어느 것일까요?', '어디일까요?').replace(/\\n{3,}/g, '\\n').trim();"), 'qTextOf 점 찍기');
  assert.ok(src.includes("if (draw.mode === 'mcells') return (draw.kind === 'place' ? String(q.q).replace(/\\[move [^\\]]+\\]/g, '') : String(q.q).split(`[${draw.fig}]`).join('')).replace(/(도형|모양)은 어느 것일까요\\?/, (_, w) => `${w}을 ${draw.kind === 'place' ? '모눈' : '칸'}에 칠해 보세요.`).replace(/\\n{3,}/g, '\\n').trim();"), 'qTextOf 칸 칠하기');
  assert.equal((src.match(/const draw = drawFor\(q, spec, done\);/g) || []).length, 2, '문항·쌍둥이 둘 다');
  assert.match(src, /const res = spec \? matchTyped\(q, typed, spec\) : \{ i: q\.choices\.findIndex\(\(c\) => c\.text === typed\.text\) \};/);
  const dv = readFileSync(new URL('../js/drawview.js', import.meta.url), 'utf8');
  for (const [mode, box, ans] of [['mpoint', 'mpointBox', 'mpointAnswered'], ['mcells', 'mcellsBox', 'mcellsAnswered']]) {
    assert.ok(dv.includes(`if (draw && draw.mode === '${mode}') return ${box}(draw, { onSubmit, onIdk });`), `drawBox ${mode}`);
    assert.ok(dv.includes(`if (draw && draw.mode === '${mode}') return ${ans}(draw, text, ok);`), `drawAnswered ${mode}`);
  }
  // 찍는 동안 칸 수를 말하지 않는다 — 이 칸에서 배우는 것이 칸 세기
  assert.ok(dv.includes("say: () => '점을 찍었어요 — 맞으면 확인을 눌러요'"), '점 찍기 판은 찍는 동안 칸 수를 말하지 않는다');
  // ❓ 아빠에게 묻기: 판에 찍은·칠한 답은 그렇게 알린다 (보기 ㉠~㉣는 진우가 못 본 후보)
  const { askContext } = await import('../js/mathask.js');
  const all = [...boardsOf(40)];
  const qp = all.find((b) => b.D.mode === 'mpoint').q; const qc = all.find((b) => b.D.mode === 'mcells').q;
  assert.equal(askContext(qp, { chosen: '점 ㄱ에서 위쪽으로 2칸', p: 1, g: '점 ㄱ에서 위쪽으로 2칸' }).grid, 1);
  assert.equal(askContext(qc, { chosen: '칠한 모양 ■■ / ■□', p: 1, g: '칠한 모양 ■■ / ■□' }).paint, 1);
  assert.equal(askContext(qp, { chosen: qp.choices[0].text }).grid, undefined, '보기를 누른 답(판 꺼짐)은 그대로');
});
