// 🪞 M 합동과 대칭 줄기 생성기 테스트: node --test tests/mathsym.test.js
//
// ★ 핵심은 **독립 검산** — 생성기가 알려 주는 값(probe)을 믿지 않고 **문제 글과 그림 지시문의 좌표를 이 파일이 직접 읽어** 다시 푼다.
//   합동은 변 길이²·꺾이는 각(내적·외적)의 순서로, 선대칭은 축으로 뒤집기, 점대칭은 중심으로 180° 돌리기, 대칭축 개수는 네 방향 시험으로.
// ★ 이름표는 값만이 아니라 **뜻**까지 — 이름 순서대로 짝지었나, 같은 자리로 짝지었나, 옆으로 밀었나, 뒤집었나.
// ★ 씨앗은 개념마다 수백 개 (SYM_SEEDS=20000으로 넓게).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  SYM, TAGS, makeQuestion, makeRound, conceptById, ladder, placeFrom, diagnosticSet, lessonOf, checkContent, gradeLabel, valueOf,
} from '../js/mathsym.js';
import { figureSvg, figText, renderFigures } from '../js/mathdraw.js';
import { tplKey } from '../js/mathgen.js';
import { padSpec } from '../js/mathpad.js';

const OPTS = { names: ['피카츄', '리자몽', '개굴닌자'], me: '진우', worlds: { pokemon: [], toystory: [], minions: [], moana: [] } };
const SEEDS = Number(process.env.SYM_SEEDS) || 400;
const IDS = SYM.map((c) => c.id);

// ───────────────────── 독립 도구 ─────────────────────

const V = (x, y) => ({ x, y });
const dd = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
const eq = (a, b) => a.x === b.x && a.y === b.y;
/** [sym …] 지시문 읽기 (mathdraw.parseSym을 쓰지 않는다) */
function readSym(t) {
  const m = /\[sym ([^\]]+)\]/.exec(t);
  if (!m) return null;
  const out = { axis: null, center: null, len: false, open: false, polys: [[]], cands: [] };
  for (const tok of m[1].trim().split(/\s+/)) {
    let q;
    if (tok === 'len') out.len = true;
    else if (tok === 'open') out.open = true;
    else if (tok === '|') out.polys.push([]);
    else if ((q = /^x=(\d+)$/.exec(tok))) out.axis = { x: +q[1] };
    else if ((q = /^y=(\d+)$/.exec(tok))) out.axis = { y: +q[1] };
    else if ((q = /^c=([\d.]+),([\d.]+)$/.exec(tok))) out.center = V(+q[1], +q[2]);
    else if ((q = /^(.)@(\d+),(\d+)$/.exec(tok))) out.cands.push({ k: q[1], x: +q[2], y: +q[3] });
    else if ((q = /^(?:(.):)?(\d+),(\d+)$/.exec(tok))) out.polys[out.polys.length - 1].push({ name: q[1] || '', x: +q[2], y: +q[3] });
    else throw new Error(`못 읽는 조각 ${tok}`);
  }
  return out;
}
function readGpoly(t) {
  const m = /\[gpoly ([^\]]+)\]/.exec(t);
  return m ? m[1].trim().split(/\s+/).map((tok) => { const q = /^(?:(.):)?(\d+),(\d+)$/.exec(tok); return { name: q[1] || '', x: +q[2], y: +q[3] }; }) : null;
}
const byName = (poly, nm) => poly.find((p) => p.name === nm);
const nameAt = (poly, q) => (poly.find((p) => eq(p, q)) || {}).name;
/** 꼭짓점 i의 모양 (앞 변 길이², 꺾이는 각의 내적·외적 크기) */
const corner = (poly, i) => {
  const n = poly.length; const a = poly[(i + n - 1) % n]; const b = poly[i]; const c = poly[(i + 1) % n];
  const u = V(b.x - a.x, b.y - a.y); const v = V(c.x - b.x, c.y - b.y);
  return `${dd(a, b)}|${dd(b, c)}|${u.x * v.x + u.y * v.y}|${Math.abs(u.x * v.y - u.y * v.x)}`;
};
/** A를 B에 포개는 대응 — [{rev, s}] (A[i] ↔ B'[i]) 모두 */
function mappings(A, B) {
  const out = [];
  if (A.length !== B.length) return out;
  const n = A.length;
  for (const rev of [false, true]) {
    const BB = rev ? [...B].reverse() : B;
    for (let s = 0; s < n; s++) {
      const R = [...BB.slice(s), ...BB.slice(0, s)];
      // 뒤집으면 꼭짓점의 앞뒤 변이 바뀐다 — 길이 둘을 정렬해 견준다
      const key = (P, i) => { const [x, y, d, c] = corner(P, i).split('|').map(Number); return `${Math.min(x, y)}|${Math.max(x, y)}|${d}|${c}`; };
      const lens = (P, i) => dd(P[i], P[(i + 1) % n]);
      if (A.every((_, i) => key(A, i) === key(R, i)) && A.every((_, i) => lens(A, i) === lens(R, rev ? (i - 1 + n) % n : i) || lens(A, i) === lens(R, i))) {
        // 변 길이 순서까지 확인 (A의 i→i+1 변 = R의 i→i+1 변)
        if (A.every((_, i) => dd(A[i], A[(i + 1) % n]) === dd(R[i], R[(i + 1) % n]))) out.push(R);
      }
    }
  }
  return out;
}
const congruent = (A, B) => mappings(A, B).length > 0;
/** 대칭축 개수 — 무게중심을 지나는 가로·세로·두 대각선으로 뒤집어 꼭짓점 집합이 같은가 (모눈 도형의 축은 이 넷 중에 있다) */
function axesCount(poly) {
  const cx = poly.reduce((a, p) => a + p.x, 0) / poly.length; const cy = poly.reduce((a, p) => a + p.y, 0) / poly.length;
  const same = (Q) => Q.every((q) => poly.some((p) => Math.abs(p.x - q.x) < 1e-9 && Math.abs(p.y - q.y) < 1e-9));
  const flips = [(p) => V(2 * cx - p.x, p.y), (p) => V(p.x, 2 * cy - p.y), (p) => V(cx + (p.y - cy), cy + (p.x - cx)), (p) => V(cx - (p.y - cy), cy - (p.x - cx))];
  return flips.filter((f) => same(poly.map(f))).length;
}
function pointSym(poly) {
  const cx = poly.reduce((a, p) => a + p.x, 0) / poly.length; const cy = poly.reduce((a, p) => a + p.y, 0) / poly.length;
  return poly.every((p) => poly.some((q) => Math.abs(q.x - (2 * cx - p.x)) < 1e-9 && Math.abs(q.y - (2 * cy - p.y)) < 1e-9));
}
const reflA = (p, axis) => (axis.x !== undefined ? V(2 * axis.x - p.x, p.y) : V(p.x, 2 * axis.y - p.y));
const rotC = (p, c) => V(2 * c.x - p.x, 2 * c.y - p.y);
const sameSide = (a, b) => a === b || (/^변 ..$/.test(a) && /^변 ..$/.test(b) && a[2] === b[3] && a[3] === b[2]);
/** 합동인 두 도형의 대응 (대칭이 없어 하나로 정해져야 한다) */
function corrOf(fig) {
  const [A, B] = fig.polys;
  const ms = mappings(A, B);
  assert.equal(ms.length, 1, `대응이 하나로 정해지지 않는다 (${ms.length})`);
  const R = ms[0];
  return (nm) => R[A.findIndex((p) => p.name === nm)].name;
}
/** 삼각형 정보 글 하나 → 하나로 정해지나 */
function triDetermined(item) {
  let m;
  if ((m = /^세 변의 길이 (\d+) cm, (\d+) cm, (\d+) cm$/.exec(item))) { const [a, b, c] = [+m[1], +m[2], +m[3]]; return a + b > c && b + c > a && a + c > b; }
  if (/^두 변의 길이 \d+ cm, \d+ cm와 그 사이에 있는 각 \d+°$/.test(item)) return true;
  if ((m = /^한 변의 길이 \d+ cm와 그 양 끝 각 (\d+)°, (\d+)°$/.exec(item))) return +m[1] + +m[2] < 180;
  if (/^세 각의 크기 /.test(item) || /사이에 있지 않은 각/.test(item) || /^두 변의 길이 \d+ cm, \d+ cm$/.test(item)) return false;
  throw new Error(`못 읽는 삼각형 정보: ${item}`);
}
/** 도형 종류 (그린 꼭짓점으로) */
function shapeKind(poly) {
  const n = poly.length; const L = poly.map((p, i) => dd(p, poly[(i + 1) % n]));
  const right = poly.every((_, i) => corner(poly, i).split('|')[2] === '0');
  if (n === 3) return 'isoTri';
  const par = (i) => { const a = poly[i]; const b = poly[(i + 1) % n]; const c = poly[(i + 2) % n]; const d = poly[(i + 3) % n]; return (b.x - a.x) * (c.y - d.y) - (b.y - a.y) * (c.x - d.x) === 0; };
  if (right && L.every((x) => x === L[0])) return 'square';
  if (right) return 'rect';
  if (L.every((x) => x === L[0])) return 'rhombus';
  if (par(0) && par(1)) return 'para';
  return 'isoTrap';
}

/** 문제 글을 직접 읽어 답 글자를 정한다 (생성기의 계산을 쓰지 않는다) */
function solveText(t) {
  const fig = readSym(t); let m;
  if (/서로 합동일까요\?/.test(t)) return congruent(fig.polys[0], fig.polys[1]) ? 'yes' : 'no';
  if ((m = /두 도형은 서로 합동이에요\. 점 (.)의 대응점은/.exec(t))) return `점 ${corrOf(fig)(m[1])}`;
  if ((m = /두 도형은 서로 합동이에요\. 변 (.)(.)의 대응변은/.exec(t))) { const f = corrOf(fig); return `변 ${f(m[1])}${f(m[2])}`; }
  if ((m = /두 도형은 서로 합동이에요\. 변 (.)(.)은 몇 cm/.exec(t))) {
    corrOf(fig); // 대응이 하나로 정해지는지만 (길이는 그 변을 직접 잰다 — 합동이면 대응변과 같다)
    const B = fig.polys[1]; const d = Math.sqrt(dd(byName(B, m[1]), byName(B, m[2])));
    assert.ok(Math.abs(d - Math.round(d)) < 1e-9, `변 ${m[1]}${m[2]}의 길이가 정수가 아니다`);
    return `${Math.round(d)}`;
  }
  if ((m = /각 ㄱ (\d+)° · 각 ㄴ (\d+)°\*\*\n\n각 (.)의 크기/.exec(t))) {
    const ang = { ㄱ: +m[1], ㄴ: +m[2], ㄷ: 180 - +m[1] - +m[2] };
    const pairs = Object.fromEntries([...t.matchAll(/점 (.)과 점 (.)/g)].map((z) => [z[2], z[1]]));
    return `${ang[pairs[m[3]]]}`;
  }
  if (/합동인 삼각형을 하나로 그릴 수 있는 것은/.test(t)) {
    const items = [...t.matchAll(/^([㉠-㉣]) (.+)$/gm)].map((z) => ({ k: z[1], ok: triDetermined(z[2]) }));
    const oks = items.filter((x) => x.ok);
    assert.equal(oks.length, 1, `하나로 그릴 수 있는 것이 ${oks.length}개\n${t}`);
    return oks[0].k;
  }
  if (/무엇을 더 알아야 할까요/.test(t)) return 'MORE';
  if (/대칭축은 모두 몇 개일까요/.test(t)) {
    const g = readGpoly(t);
    if (g) return `${axesCount(g)}`;
    m = /\[reg (\d) \d+\]/.exec(t);
    return `${+m[1]}`;
  }
  if (/점대칭도형일까요\?/.test(t)) return pointSym(readGpoly(t)) ? 'yes' : 'no';
  if (/대칭의 중심은 어느 점일까요/.test(t)) {
    const poly = fig.polys[0]; assert.ok(pointSym(poly), '점대칭도형이 아니다');
    const c = V(poly.reduce((a, p) => a + p.x, 0) / poly.length, poly.reduce((a, p) => a + p.y, 0) / poly.length);
    const hit = fig.cands.filter((q) => eq(q, c));
    assert.equal(hit.length, 1);
    return hit[0].k;
  }
  if ((m = /^선대칭도형이에요\. 점 (.)의 대응점은/.exec(t))) {
    const poly = fig.polys[0]; const q = reflA(byName(poly, m[1]), fig.axis);
    assert.ok(poly.every((p) => poly.some((z) => eq(z, reflA(p, fig.axis)))), '선대칭도형이 아니다');
    return `점 ${nameAt(poly, q)}`;
  }
  if ((m = /^점대칭도형이에요\. 점 (.)의 대응점은/.exec(t))) {
    const poly = fig.polys[0]; assert.ok(poly.every((p) => poly.some((z) => eq(z, rotC(p, fig.center)))), '점대칭도형이 아니다');
    return `점 ${nameAt(poly, rotC(byName(poly, m[1]), fig.center))}`;
  }
  if ((m = /점 (.)에서 대칭축까지의 거리는 (\d+) cm예요\. 점 (.)과 점 (.) 사이의 거리는/.exec(t))) {
    const poly = fig.polys[0]; const p = byName(poly, m[1]);
    assert.equal(Math.abs(fig.axis.x !== undefined ? p.x - fig.axis.x : p.y - fig.axis.y), +m[2], '글의 거리가 그림과 다르다');
    assert.ok(eq(reflA(p, fig.axis), byName(poly, m[4])), '두 점이 대응점이 아니다');
    return `${2 * +m[2]}`;
  }
  if ((m = /점 (.)과 점 (.)을 이은 선분은 (\d+) cm예요\. 점 (.)에서 대칭축까지의 거리는/.exec(t))) {
    const poly = fig.polys[0]; const p = byName(poly, m[1]);
    assert.equal(Math.abs(fig.axis.x !== undefined ? p.x - fig.axis.x : p.y - fig.axis.y) * 2, +m[3], '글의 거리가 그림과 다르다');
    return `${+m[3] / 2}`;
  }
  if ((m = /점 (.)과 점 (.)을 이은 선분과 대칭축이 만나서 이루는 각/.exec(t))) {
    const poly = fig.polys[0]; const a = byName(poly, m[1]); const b = byName(poly, m[2]);
    assert.ok(eq(reflA(a, fig.axis), b), '대응점이 아니다');
    const dx = b.x - a.x; const dy = b.y - a.y; // 축은 가로 또는 세로 — 선분이 축의 수직 방향인가
    assert.ok(fig.axis.x !== undefined ? dy === 0 : dx === 0);
    return '90';
  }
  if ((m = /대칭축의 한쪽에 있는 변의 길이를 모두 더하면 (\d+) cm예요/.exec(t))) return `${2 * +m[1]}`;
  if ((m = /대칭의 중심까지의 거리가 (\d+) cm일 때, 점 (.)과 점 (.) 사이의 거리는/.exec(t))) return `${2 * +m[1]}`;
  if ((m = /두 점을 이은 선분이 (\d+) cm일 때, 점 (.)에서 대칭의 중심까지의 거리는/.exec(t))) return `${+m[1] / 2}`;
  if ((m = /^선대칭도형이 되도록 완성하려고 해요\. 점 (.)의 대응점은/.exec(t))) {
    const q = reflA(byName(fig.polys[0], m[1]), fig.axis); const hit = fig.cands.filter((z) => eq(z, q));
    assert.equal(hit.length, 1); return hit[0].k;
  }
  if ((m = /^점대칭도형이 되도록 완성하려고 해요\. 점 (.)의 대응점은/.exec(t))) {
    const q = rotC(byName(fig.polys[0], m[1]), fig.center); const hit = fig.cands.filter((z) => eq(z, q));
    assert.equal(hit.length, 1); return hit[0].k;
  }
  throw new Error(`못 읽는 문제: ${t}`);
}
/** 답 글자와 보기 글자를 견준다 — 합동·점대칭 여부는 보기 앞말(합동이에요·네)로 */
function matches(q, want) {
  const ok = q.choices.find((x) => x.ok).text;
  if (want === 'yes') return /^(합동이에요|네) — /.test(ok);
  if (want === 'no') return /^(합동이 아니에요|아니에요) — /.test(ok);
  return sameSide(ok, want);
}

/** 문항 하나씩 — 개념·씨앗·얼굴 */
function* every(kinds = ['calc', 'misread'], n = SEEDS) {
  for (const c of SYM) for (const k of kinds) for (let s = 1; s <= n; s++) yield { c, k, s, q: makeQuestion(c.id, k, s, OPTS) };
}
const allText = (q) => [q.q, ...q.choices.map((x) => x.text), ...(q.solve ? [...q.solve.steps, ...Object.values(q.solve.why), q.solve.whyAny, q.solve.rule] : [])].join('\n');

// ───────────────────── 테스트 ─────────────────────

test('독립 도구 자체 점검 — 합동 대응·대칭축 개수·점대칭', () => {
  const A = [V(0, 0), V(4, 0), V(1, 3)].map((p, i) => ({ ...p, name: 'ㄱㄴㄷ'[i] }));
  const B = A.map((p) => ({ x: -p.y + 10, y: p.x, name: '' }));
  assert.ok(congruent(A, B));
  assert.ok(!congruent(A, A.map((p) => ({ ...p, x: p.x * 2 }))));
  assert.equal(axesCount([V(0, 0), V(4, 0), V(4, 4), V(0, 4)]), 4);
  assert.equal(axesCount([V(0, 0), V(6, 0), V(6, 3), V(0, 3)]), 2);
  assert.equal(axesCount([V(0, 0), V(5, 0), V(7, 3), V(2, 3)]), 0);
  assert.equal(axesCount([V(0, 0), V(6, 0), V(3, 4)]), 1);
  assert.equal(axesCount([V(0, 2), V(3, 0), V(6, 2), V(3, 4)]), 2);
  assert.ok(pointSym([V(0, 0), V(5, 0), V(7, 3), V(2, 3)]));
  assert.ok(!pointSym([V(0, 0), V(6, 0), V(3, 4)]));
  assert.equal(shapeKind([V(0, 0), V(8, 0), V(6, 3), V(2, 3)]), 'isoTrap');
  assert.equal(triDetermined('세 변의 길이 3 cm, 4 cm, 8 cm'), false, '삼각형이 안 되는 세 변');
});

test('사다리: 9칸, 모두 초5, needs가 바로 앞 칸 · 학년 표시', () => {
  assert.equal(SYM.length, 9);
  assert.deepEqual(IDS, ['sym.congr', 'sym.corr', 'sym.tri', 'sym.line', 'sym.lineprop', 'sym.linedraw', 'sym.point', 'sym.pointprop', 'sym.pointdraw']);
  SYM.forEach((c, i) => {
    assert.equal(c.grade, 5);
    assert.deepEqual(c.needs, i ? [SYM[i - 1].id] : []);
    assert.ok(c.idea && c.rule && c.slip && c.name, c.id);
  });
  assert.equal(gradeLabel(5), '초5');
});

test('★ 독립 검산: ① 정답이 문제 글·그림을 따로 읽어 푼 답과 같다 · 딱 하나만 맞다', () => {
  let n = 0;
  for (const { c, s, q } of every(['calc'])) {
    assert.equal(q.choices.filter((x) => x.ok).length, 1, `${c.id} #${s}`);
    const want = solveText(q.q);
    if (want === 'MORE') {
      // 더 알아야 할 것 — 두 변(ㄱㄴ·ㄴㄷ): 사이의 각 ㄴ·나머지 변 ㄱㄷ / 변 ㄴㄷ과 각 ㄴ: 다른 끝 각 ㄷ·각 ㄴ을 끼는 변 ㄱㄴ (각 ㄱ도 되지만 보기에 없어야)
      const ss = /변 ㄱㄴ \d+ cm와 변 ㄴㄷ/.test(q.q);
      const good = ss ? ['각 ㄴ의 크기', '변 ㄱㄷ의 길이'] : ['각 ㄷ의 크기', '변 ㄱㄴ의 길이', '각 ㄱ의 크기'];
      const ok = q.choices.find((x) => x.ok).text;
      assert.ok(good.includes(ok), `${c.id} #${s}: ${ok}`);
      for (const w of q.choices.filter((x) => !x.ok)) assert.ok(!good.includes(w.text), `${c.id} #${s}: 맞는 보기가 오답에 "${w.text}"`);
    } else assert.ok(matches(q, want), `${c.id} #${s}: 정답 "${q.choices.find((x) => x.ok).text}" ≠ 따로 푼 답 "${want}"\n${q.q}`);
    n++;
  }
  assert.ok(n >= 9 * SEEDS);
});

test('★ 보기: 정답 하나, 글자·값 겹침 없음(변 ㄱㄴ = 변 ㄴㄱ), 빈 글자·undefined·NaN 없음 · 그림 지시문은 모두 그려진다', () => {
  for (const { c, k, s, q } of every()) {
    const texts = q.choices.map((x) => x.text);
    assert.ok(q.choices.length >= 3, `${c.id} ${k} #${s}: 보기 ${q.choices.length}개`);
    for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) assert.ok(!sameSide(texts[i], texts[j]), `${c.id} ${k} #${s}: 같은 보기 ${texts}`);
    const vals = texts.map(valueOf).filter((v) => v !== null);
    assert.equal(new Set(vals).size, vals.length, `${c.id} ${k} #${s}: 값이 같은 보기 ${texts}`);
    assert.ok(!/undefined|NaN|null|\{(?!mon|me)/.test(allText(q)), `${c.id} ${k} #${s}: ${allText(q)}`);
    for (const f of q.q.match(/\[[a-z]+ [^\]]+\]/g) || []) assert.ok(figureSvg(f.slice(1, -1)), `${c.id} ${k} #${s}: 못 그리는 ${f}`);
    for (const v of vals) assert.ok(v >= 0, `${c.id} ${k} #${s}: 음수 보기`);
  }
});

test('★ 오개념 이름표: 그 오답이 정말 그 실수다 — 짝짓기·자리·도형·거리·옮긴 방향까지', () => {
  let checked = 0;
  for (const { c, s, q } of every(['calc'])) {
    const t = q.q; const fig = readSym(t);
    const ok = q.choices.find((x) => x.ok).text;
    for (const w of q.choices.filter((x) => !x.ok && x.tag !== '계산 실수')) {
      const tag = w.tag;
      const yes = (cond, msg = '') => { assert.ok(cond, `${c.id} #${s} [${tag}] "${w.text}" ${msg}\n${t}`); checked++; };
      let m;
      if (/서로 합동일까요\?/.test(t)) {
        const cg = congruent(fig.polys[0], fig.polys[1]);
        const areaSame = Math.abs(area(fig.polys[0]) - area(fig.polys[1])) < 1e-9;
        if (tag === TAGS.turnNot) yes(cg && /놓인 방향/.test(w.text));
        else if (tag === TAGS.scaleSame) yes(!cg && !areaSame && /모양이 같아요/.test(w.text));
        else if (tag === TAGS.areaSame) yes(!cg && areaSame && /넓이가 같아요/.test(w.text));
        else yes(tag === TAGS.lookWrong && (cg ? /^합동이 아니에요/ : /^합동이에요/).test(w.text));
        continue;
      }
      if ((m = /두 도형은 서로 합동이에요\. (점|변) (.)(.?)의 대응/.exec(t))) {
        const [A, B] = fig.polys; const f = corrOf(fig);
        const naive = (nm) => B[A.findIndex((p) => p.name === nm)].name; // 이름 순서대로 (A의 i번째 ↔ B의 i번째 이름)
        const pos = (nm) => { // 같은 자리 — A의 상자 모서리를 B의 상자 모서리에 맞춰 옮긴 자리에서 가장 가까운 B 꼭짓점
          const bx = (P) => [Math.min(...P.map((p) => p.x)), Math.min(...P.map((p) => p.y))];
          const [ax, ay] = bx(A); const [bxx, byy] = bx(B); const p = byName(A, nm); const qq = V(p.x - ax + bxx, p.y - ay + byy);
          return B.reduce((best, z) => (dd(z, qq) < dd(best, qq) ? z : best), B[0]).name;
        };
        const text = (fn) => (m[1] === '점' ? `점 ${fn(m[2])}` : `변 ${fn(m[2])}${fn(m[3])}`);
        if (tag === TAGS.nameOrder) yes(sameSide(w.text, text(naive)) && !sameSide(w.text, text(f)));
        else if (tag === TAGS.posSame) yes(sameSide(w.text, text(pos)) && !sameSide(w.text, text(f)));
        else yes(tag === TAGS.pairWrong && !sameSide(w.text, ok));
        continue;
      }
      if ((m = /두 도형은 서로 합동이에요\. 변 (.)(.)은 몇 cm/.exec(t))) {
        const [A, B] = fig.polys; const i = B.findIndex((p) => p.name === m[1]); // 이름 순서로 짝지은 A의 변
        const naiveLen = Math.round(Math.sqrt(dd(A[i], A[(i + 1) % A.length])));
        if (tag === TAGS.nameOrder) yes(valueOf(w.text) === naiveLen);
        else yes(tag === TAGS.pairWrong && A.some((p, j) => Math.round(Math.sqrt(dd(p, A[(j + 1) % A.length]))) === valueOf(w.text)), '(A의 다른 변 길이)');
        continue;
      }
      if ((m = /각 ㄱ (\d+)° · 각 ㄴ (\d+)°/.exec(t))) {
        const a = +m[1]; const b = +m[2]; const angs = [a, b, 180 - a - b];
        if (tag === TAGS.sumOne) yes(valueOf(w.text) === 180 - a);
        else yes(tag === TAGS.pairWrong && angs.includes(valueOf(w.text)));
        continue;
      }
      if (/합동인 삼각형을 하나로 그릴 수 있는 것은/.test(t)) {
        const item = new RegExp(`^${w.text} (.+)$`, 'm').exec(t)[1];
        const kind = /^세 각/.test(item) ? TAGS.threeAngles : /사이에 있지 않은/.test(item) ? TAGS.notIncluded : /^두 변의 길이 \d+ cm, \d+ cm$/.test(item) ? TAGS.twoOnly : null;
        yes(tag === kind && !triDetermined(item));
        continue;
      }
      if (/무엇을 더 알아야 할까요/.test(t)) {
        if (tag === TAGS.notIncluded) yes(/각 ㄱ|각 ㄷ|변 ㄱㄷ/.test(w.text));
        else yes((tag === TAGS.twoOnly && /변 ㄱㄴ \d+ cm와 변 ㄴㄷ/.test(t)) || (tag === TAGS.tooFew && /변 ㄴㄷ \d+ cm와 각 ㄴ/.test(t)), '(두 변 → 두 변만 · 변과 각 → 모자람)');
        continue;
      }
      if (/대칭축은 모두 몇 개일까요/.test(t)) {
        const g = readGpoly(t); const v = valueOf(w.text);
        const truth = g ? axesCount(g) : +/\[reg (\d)/.exec(t)[1];
        const kind = g ? shapeKind(g) : 'reg';
        if (tag === TAGS.diagAxis) yes((kind === 'rect' || kind === 'para') && v === 4);
        else if (tag === TAGS.paraLine) yes(kind === 'para' && v > 0);
        else if (tag === TAGS.missDiag) yes(kind === 'square' && v === 2);
        else if (tag === TAGS.likeSquare) yes(kind === 'rhombus' && v === 4);
        else if (tag === TAGS.likeRegular) yes(kind === 'isoTri' && v === 3);
        else if (tag === TAGS.likeRect) yes(kind === 'isoTrap' && v === 2);
        else if (tag === TAGS.halfCount) yes(v < truth && v > 0);
        else if (tag === TAGS.doubleCount) yes(v === 2 * truth);
        else yes(tag === TAGS.lookWrong && v !== truth);
        continue;
      }
      if (/점대칭도형일까요\?/.test(t)) {
        const ps = pointSym(readGpoly(t));
        if (tag === TAGS.rot90) yes(ps && /90°/.test(w.text));
        else if (tag === TAGS.asLine) yes(ps && /접어도/.test(w.text) && axesCount(readGpoly(t)) === 0);
        else if (tag === TAGS.lineToPoint) yes(!ps && axesCount(readGpoly(t)) > 0 && /접으면/.test(w.text));
        else if (tag === TAGS.rot360) yes(!ps && /한 바퀴/.test(w.text));
        else yes(tag === TAGS.lookWrong && ps);
        continue;
      }
      if (/대칭의 중심은 어느 점일까요/.test(t)) {
        const poly = fig.polys[0]; const cq = fig.cands.find((z) => z.k === w.text);
        const cx = poly.reduce((a, p) => a + p.x, 0) / poly.length; const cy = poly.reduce((a, p) => a + p.y, 0) / poly.length;
        if (tag === TAGS.sideMid) yes(poly.some((p, i) => { const r2 = poly[(i + 1) % poly.length]; return (p.x + r2.x) / 2 === cq.x && (p.y + r2.y) / 2 === cq.y; }));
        else if (tag === TAGS.pairWrong) yes(poly.some((p, i) => poly.some((r2, j) => j > i && (p.x + r2.x) / 2 === cq.x && (p.y + r2.y) / 2 === cq.y && !eq(r2, V(2 * cx - p.x, 2 * cy - p.y)))), '(대응점이 아닌 두 점의 가운데)');
        else yes(tag === TAGS.lookWrong && Math.max(Math.abs(cq.x - cx), Math.abs(cq.y - cy)) === 1);
        continue;
      }
      if ((m = /^(선|점)대칭도형이에요\. 점 (.)의 대응점은/.exec(t))) {
        const poly = fig.polys[0]; const p = byName(poly, m[2]); const wq = byName(poly, w.text.slice(2));
        if (tag === TAGS.asLine) yes(m[1] === '점' && wq && (eq(wq, V(2 * fig.center.x - p.x, p.y)) || eq(wq, V(p.x, 2 * fig.center.y - p.y))));
        else yes(tag === TAGS.pairWrong && !sameSide(w.text, ok));
        continue;
      }
      if (/대칭축까지의 거리|대칭의 중심까지의 거리/.test(t)) {
        const nums = [...t.matchAll(/(\d+) cm/g)].map((z) => +z[1]); const given = nums[0]; const v = valueOf(w.text);
        if (tag === TAGS.halfOnly) yes(v === given && valueOf(ok) === 2 * given);
        else yes(tag === TAGS.noHalf && v === given && valueOf(ok) * 2 === given);
        continue;
      }
      if (/이은 선분과 대칭축이 만나서 이루는 각/.test(t)) { yes(tag === TAGS.notRight && valueOf(w.text) !== 90); continue; }
      if ((m = /대칭축의 한쪽에 있는 변의 길이를 모두 더하면 (\d+) cm/.exec(t))) { yes(tag === TAGS.halfPerim && valueOf(w.text) === +m[1]); continue; }
      if ((m = /^선대칭도형이 되도록 완성하려고 해요\. 점 (.)의 대응점은/.exec(t))) {
        const half = fig.polys[0]; const p = byName(half, m[1]); const a = fig.axis; const cq = fig.cands.find((z) => z.k === w.text);
        const vert = a.x !== undefined;
        const far = vert ? Math.min(...half.map((z) => z.x)) : Math.min(...half.map((z) => z.y));
        const R = reflA(p, a);
        if (tag === TAGS.slide) yes(vert ? eq(cq, V(p.x + a.x - far, p.y)) : eq(cq, V(p.x, p.y + a.y - far)), '(축 쪽으로 그대로 민 자리)');
        else if (tag === TAGS.doubleDist) yes(vert ? eq(cq, V(a.x + 2 * (a.x - p.x), p.y)) : eq(cq, V(p.x, a.y + 2 * (a.y - p.y))), '(건너편으로 두 배)');
        // 세로 축이면 "위아래까지", 가로 축이면 "양옆까지" — 이름표가 실제로 더 뒤집은 쪽을 말한다 (헤드리스: 가로 축에 "위아래까지"가 떴다)
        else yes(vert ? tag === TAGS.flipBoth && eq(cq, V(R.x, half[0].y + half[half.length - 1].y - p.y)) : tag === TAGS.flipSide && eq(cq, V(half[0].x + half[half.length - 1].x - p.x, R.y)), '(축과 나란한 쪽까지 뒤집음)');
        continue;
      }
      if ((m = /^점대칭도형이 되도록 완성하려고 해요\. 점 (.)의 대응점은/.exec(t))) {
        const half = fig.polys[0]; const p = byName(half, m[1]); const cc = fig.center; const cq = fig.cands.find((z) => z.k === w.text);
        if (tag === TAGS.asLine) yes(eq(cq, V(2 * cc.x - p.x, p.y)) || eq(cq, V(p.x, 2 * cc.y - p.y)), '(세로·가로로 뒤집은 자리)');
        else yes(tag === TAGS.slide && eq(cq, V(p.x + 2 * (cc.x - half[0].x), p.y + 2 * (cc.y - half[0].y))), '(반쪽을 그대로 민 자리)');
        continue;
      }
      yes(false, '못 읽는 문항');
    }
  }
  assert.ok(checked > 9 * SEEDS, `확인한 오답 ${checked}`);
});
function area(poly) { return Math.abs(poly.reduce((a, p, i) => { const q = poly[(i + 1) % poly.length]; return a + p.x * q.y - q.x * p.y; }, 0)) / 2; }

test('★ ② 오개념 문항: 보여 준 말·찍은 점은 정말 틀렸다 · 고친 말만 맞다 · 갈래 열쇠', () => {
  const branches = {};
  for (const { c, s, q } of every(['misread'])) {
    const t = q.q; const fig = readSym(t); const ok = q.choices.find((x) => x.ok).text;
    (branches[c.id] = branches[c.id] || new Set()).add(q.key);
    assert.ok(/^misread:/.test(q.key), `${c.id} #${s}: 갈래 열쇠`);
    assert.ok(q.choices.some((x) => x.text === '맞게 말했어요' || x.text === '맞게 찍었어요'), `${c.id} #${s}`);
    let m;
    if (/놓인 방향이 달라서 합동이 아니에요/.test(t)) assert.ok(congruent(fig.polys[0], fig.polys[1]), `${c.id} #${s}: 정말 합동이어야 말이 틀린다`);
    else if (/넓이가 같으니까 합동이에요/.test(t)) assert.ok(!congruent(fig.polys[0], fig.polys[1]) && Math.abs(area(fig.polys[0]) - area(fig.polys[1])) < 1e-9);
    else if ((m = /점 (.)의 대응점은 이름 순서대로 점 (.)이에요/.exec(t))) { const f = corrOf(fig); assert.notEqual(f(m[1]), m[2]); assert.ok(ok.includes(`점 ${f(m[1])}`)); }
    else if ((m = /변 (.)(.)은 변 (.)(.)과 짝이니까 (\d+) cm예요/.exec(t))) {
      const B = fig.polys[1]; const real = Math.round(Math.sqrt(dd(byName(B, m[1]), byName(B, m[2]))));
      assert.notEqual(real, +m[5], `${c.id} #${s}: 이름 순서 짝의 길이가 우연히 맞다`);
      assert.ok(ok.endsWith(`${real} cm`));
    } else if ((m = /세 각이 (\d+)°, (\d+)°, (\d+)°인 삼각형은 하나로/.exec(t))) assert.equal(+m[1] + +m[2] + +m[3], 180, '세 각의 합이 180°여야 "합이 아니라서"가 엉뚱한 지적이 된다');
    else if (/그 사이에 있지 않은 각/.test(t)) assert.ok(/사이에 있어야/.test(ok));
    else if (/대각선으로 접어도 겹치니까 대칭축이 4개예요/.test(t)) assert.equal(axesCount(readGpoly(t)), 2, '정사각형이면 말이 맞아 버린다');
    else if (/가운데를 지나는 선으로 접으면 겹치니까 선대칭도형이에요/.test(t)) assert.equal(axesCount(readGpoly(t)), 0);
    else if ((m = /점 (.)과 점 (.)을 이은 선분이 (\d+) cm니까 점 (.)에서 대칭축까지도/.exec(t))) {
      const p = byName(fig.polys[0], m[1]); const d = fig.axis.x !== undefined ? Math.abs(p.x - fig.axis.x) : Math.abs(p.y - fig.axis.y);
      assert.equal(2 * d, +m[3], '글의 선분 길이가 그림과 다르다'); assert.ok(ok.endsWith(`${d} cm예요`));
    } else if (/대칭축과 비스듬히 만나요/.test(t)) assert.ok(/수직/.test(ok));
    else if ((m = /^\{mon\/이\/가\} 선대칭도형을 완성하려고 점 (.)의 대응점을 ★에 찍었어요|선대칭도형을 완성하려고 점 (.)의 대응점을 ★에 찍었어요/.exec(t))) {
      const nm = m[1] || m[2]; const star = fig.cands.find((z) => z.k === '★');
      assert.ok(!eq(star, reflA(byName(fig.polys[0], nm), fig.axis)), `${c.id} #${s}: ★이 맞는 자리`);
    } else if ((m = /점대칭도형을 완성하려고 점 (.)의 대응점을 ★에 찍었어요/.exec(t))) {
      const star = fig.cands.find((z) => z.k === '★');
      assert.ok(!eq(star, rotC(byName(fig.polys[0], m[1]), fig.center)), `${c.id} #${s}: ★이 맞는 자리`);
    } else if (/선대칭도형이니까 점대칭도형이기도 해요/.test(t)) assert.ok(!pointSym(readGpoly(t)) && axesCount(readGpoly(t)) > 0);
    else if (/90° 돌려 보면 돼요/.test(t)) assert.ok(/180°/.test(ok));
    else if ((m = /대응점 ㄱ과 ㄹ을 이은 선분이 (\d+) cm니까, 점 ㄱ에서 대칭의 중심까지도/.exec(t))) assert.ok(ok.endsWith(`${+m[1] / 2} cm예요`));
    else if ((m = /\*\*점 (.)의 대응점은 점 (.)이에요\*\*/.exec(t)) && fig && fig.center) {
      const real = nameAt(fig.polys[0], rotC(byName(fig.polys[0], m[1]), fig.center));
      assert.notEqual(real, m[2]); assert.ok(ok.includes(`점 ${real}`));
    } else assert.fail(`${c.id} #${s}: 못 읽는 ② 문항\n${t}`);
  }
  for (const c of SYM) assert.ok(branches[c.id] && branches[c.id].size >= 2, `${c.id}: 갈래가 ${branches[c.id] ? branches[c.id].size : 0}개`);
  // 요청한 갈래로 온다
  for (const c of SYM) for (const key of branches[c.id]) {
    for (let s = 1; s <= 30; s++) assert.equal(makeQuestion(c.id, 'misread', s, { ...OPTS, want: { k: 'misread', key } }).key, key, `${c.id}: ${key}`);
  }
});

test('★ 조사: 자모(점 ㄴ·변 ㄱㄴ) 뒤는 받침 쪽 · 수 뒤는 읽는 소리 · cm·° 뒤', () => {
  const BAT = new Set(['0', '1', '3', '6', '7', '8']);
  for (const { c, k, s, q } of every()) {
    const all = allText(q).replace(/\{mon\/이\/가\}/g, '');
    assert.ok(!/(점|변|각) [ㄱ-ㅎ]{1,2}(는|를|가|와|로|예요|야)(?=[\s.,!?)—*]|$)/m.test(all), `${c.id} ${k} #${s}: 자모 뒤 조사\n${all}`);
    assert.ok(!/cm(은|을|이 |과|이에요)|°(은|을|이 |과)/.test(all), `${c.id} ${k} #${s}: 단위 뒤 조사\n${all}`);
    for (const m of all.matchAll(/(\d)(을|를|은|는|이|가|과|와)(?=[\s.,!?)]|$)/g)) assert.equal(m[2], BAT.has(m[1]) ? { 을: '을', 를: '을', 은: '은', 는: '은', 이: '이', 가: '이', 과: '과', 와: '과' }[m[2]] : { 을: '를', 를: '를', 은: '는', 는: '는', 이: '가', 가: '가', 과: '와', 와: '와' }[m[2]], `${c.id} ${k} #${s}: "${m[0]}"`);
  }
});

test('★ 풀이 카드: 단계 2줄↑ · 기억할 것 · 오답마다 왜 · 정답이 단계에 나온다', () => {
  for (const { c, k, s, q } of every()) {
    const sv = q.solve;
    assert.ok(sv && sv.steps.length >= 2 && sv.rule, `${c.id} ${k} #${s}`);
    for (const w of q.choices.filter((x) => !x.ok)) assert.ok(sv.why[w.tag] || sv.whyAny, `${c.id} ${k} #${s}: "${w.tag}" 설명 없음`);
    if (k === 'calc') {
      const ok = q.choices.find((x) => x.ok).text;
      const short = ok.replace(/ — .*$/, '');
      assert.ok(sv.steps.join(' ').includes(ok) || /^(합동|네|아니에요)/.test(short), `${c.id} #${s}: 정답 "${ok}"이 풀이에 없다\n${sv.steps.join('\n')}`);
    }
  }
});

test('🔁 쌍둥이·🤔 노트: 요청한 틀로 온다 · 원래 문제와 글자까지 같은 쌍둥이는 틀마다 30% 이하', () => {
  const same = {}; const tot = {};
  const P = { names: OPTS.names, me: OPTS.me };
  for (const c of SYM) {
    for (let s = 1; s <= Math.min(SEEDS, 300); s++) {
      const q = makeQuestion(c.id, 'calc', s, P);
      assert.ok(q.key, `${c.id} #${s}: 열쇠 없음`);
      const tw = makeQuestion(c.id, 'calc', s + 99991, { ...P, want: { k: 'calc', key: q.key } });
      assert.equal(tw.key, q.key, `${c.id} #${s}: 쌍둥이가 다른 틀\n${q.q}\n---\n${tw.q}`);
      tot[q.key] = (tot[q.key] || 0) + 1;
      if (tw.q === q.q) same[q.key] = (same[q.key] || 0) + 1;
    }
  }
  for (const key of Object.keys(tot)) if (tot[key] >= 10) assert.ok((same[key] || 0) / tot[key] <= 0.3, `쌍둥이가 원래와 같은 글 ${same[key]}/${tot[key]}: ${key.slice(0, 80)}`);
});

test('아직 안 배운 말을 앞 칸에서 쓰지 않는다 — 대응점·대응변·대응각 M2 · 선대칭·대칭축 M4 · 점대칭·대칭의 중심 M7', () => {
  const NEW = [['대응', 1], ['대칭', 3], ['선대칭', 3], ['대칭축', 3], ['점대칭', 6], ['대칭의 중심', 6]];
  for (const { c, k, s, q } of every()) {
    const at = IDS.indexOf(c.id);
    const all = [allText(q), ...q.choices.map((x) => x.tag || '')].join('\n');
    for (const [w, from] of NEW) if (at < from) assert.ok(!all.includes(w), `${c.id} ${k} #${s}: 아직 안 배운 "${w}"\n${all}`);
  }
  for (const [w, from] of NEW) for (const c of SYM.slice(0, from)) assert.ok(![c.idea, c.rule, c.slip, c.name].join(' ').includes(w), `${c.id}: "${w}"`);
  // 이름표 자체도 — 앞 칸에서 쓰는 이름표에 뒤 칸 말이 없게
  assert.ok(!/대칭/.test([TAGS.turnNot, TAGS.scaleSame, TAGS.areaSame, TAGS.lookWrong, TAGS.nameOrder, TAGS.posSame, TAGS.pairWrong, TAGS.sumOne, TAGS.threeAngles, TAGS.notIncluded, TAGS.twoOnly, TAGS.tooFew].join(' ')));
});

test('🎨 [sym] 그림: 그린 SVG에서 꼭짓점·축·중심·후보 점을 다시 재면 지시문과 같다 · 대칭 그림은 정말 대칭 · 이름표끼리 안 겹치고 그림 안에 · 폭 400 이하', () => {
  let n = 0;
  for (const { c, k, s, q } of every(['calc', 'misread'], 150)) {
    for (const d of q.q.match(/\[sym [^\]]+\]/g) || []) {
      const svg = figureSvg(d.slice(1, -1)); const sp = readSym(d);
      const [W, H] = /viewBox="0 0 (\d+) (\d+)"/.exec(svg).slice(1).map(Number);
      assert.ok(W <= 400 && H <= 400, `${d}: ${W}×${H}`);
      // 그린 꼭짓점 → 모눈 좌표 (두 꼭짓점으로 자를 만든다)
      const polys = [...svg.matchAll(/class="sym-poly" data-poly="(\d)"(?: data-open="1")? points="([^"]+)"/g)].map((z) => z[2].split(' ').map((p) => p.split(',').map(Number)));
      assert.equal(polys.length, sp.polys.length, d);
      const all = sp.polys.flat(); const px = polys.flat();
      // 자 — 꼭짓점과 후보 점(data-x·data-y가 있는 동그라미)을 모두 기준으로. 반쪽 선이 두 점뿐이면 x나 y가 같을 수 있다
      const refs = all.map((p, i) => ({ g: p, s: px[i] }));
      for (const z of svg.matchAll(/class="sym-(?:cand|center)"(?: data-k="[^"]+")? data-x="([\d.]+)" data-y="([\d.]+)" cx="([\d.]+)" cy="([\d.]+)"/g)) refs.push({ g: V(+z[1], +z[2]), s: [+z[3], +z[4]] });
      const r0 = refs[0]; const rx = refs.find((z) => z.g.x !== r0.g.x); const ry = refs.find((z) => z.g.y !== r0.g.y);
      const sx = (rx.s[0] - r0.s[0]) / (rx.g.x - r0.g.x); const sy = (ry.s[1] - r0.s[1]) / (ry.g.y - r0.g.y);
      assert.ok(Math.abs(sx + sy) < 1e-6, `${d}: 모눈 한 칸이 가로·세로로 다르다`);
      const toGrid = ([x, y]) => V((x - r0.s[0]) / sx + r0.g.x, (y - r0.s[1]) / sy + r0.g.y);
      px.forEach((p, i) => { const g = toGrid(p); assert.ok(Math.abs(g.x - all[i].x) < 0.05 && Math.abs(g.y - all[i].y) < 0.05, `${d}: 꼭짓점 ${i}`); });
      if (sp.axis) {
        const a = /class="sym-axis" data-(x|y)="(\d+)" x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"/.exec(svg);
        const g1 = toGrid([+a[3], +a[4]]); const g2 = toGrid([+a[5], +a[6]]);
        if (a[1] === 'x') assert.ok(Math.abs(g1.x - sp.axis.x) < 0.05 && Math.abs(g2.x - sp.axis.x) < 0.05, `${d}: 세로 축 자리`);
        else assert.ok(Math.abs(g1.y - sp.axis.y) < 0.05 && Math.abs(g2.y - sp.axis.y) < 0.05, `${d}: 가로 축 자리`);
        // 닫힌 도형이면 그린 꼭짓점이 축으로 뒤집어도 같은 집합
        if (!sp.open && sp.polys.length === 1) { const G = px.map(toGrid); for (const g of G) { const f = reflA(g, sp.axis); assert.ok(G.some((h) => Math.abs(h.x - f.x) < 0.05 && Math.abs(h.y - f.y) < 0.05), `${d}: 그린 도형이 대칭이 아니다`); } }
      }
      if (sp.center) {
        const cc = /class="sym-center" data-x="([\d.]+)" data-y="([\d.]+)" cx="([\d.]+)" cy="([\d.]+)"/.exec(svg);
        const g = toGrid([+cc[3], +cc[4]]);
        assert.ok(Math.abs(g.x - sp.center.x) < 0.05 && Math.abs(g.y - sp.center.y) < 0.05, `${d}: 중심 자리`);
        if (!sp.open) { const G = px.map(toGrid); for (const p of G) { const f = rotC(p, sp.center); assert.ok(G.some((h) => Math.abs(h.x - f.x) < 0.05 && Math.abs(h.y - f.y) < 0.05), `${d}: 그린 도형이 점대칭이 아니다`); } }
      }
      for (const cq of sp.cands) {
        const z = new RegExp(`class="sym-cand" data-k="${cq.k}" data-x="${cq.x}" data-y="${cq.y}" cx="([\\d.]+)" cy="([\\d.]+)"`).exec(svg);
        assert.ok(z, `${d}: 후보 ${cq.k}`); const g = toGrid([+z[1], +z[2]]);
        assert.ok(Math.abs(g.x - cq.x) < 0.05 && Math.abs(g.y - cq.y) < 0.05, `${d}: 후보 ${cq.k} 자리`);
      }
      // 이름표 — 서로 안 겹치고 그림 안에 (글꼴 크기는 그림에서 읽는다)
      const boxes = [...svg.matchAll(/<text(?: class="[^"]+")? x="([\d.]+)" y="([\d.]+)" font-size="(\d+)"[^>]*>([^<]+)<\/text>/g)].map((z) => {
        const fs = +z[3]; const t = z[4]; const w = ([...t].reduce((a, ch) => a + (/[ㄱ-ㅎ가-힣㉠-㉯°]/.test(ch) ? (ch === '°' ? 6 : 15) : 8.2), 0) * fs) / 15;
        return { t, x0: +z[1] - w / 2, x1: +z[1] + w / 2, y0: +z[2] - fs * 0.78, y1: +z[2] + fs * 0.22 };
      });
      assert.ok(boxes.length >= sp.polys.flat().filter((p) => p.name).length + sp.cands.length, `${d}: 이름표 수`);
      for (let i = 0; i < boxes.length; i++) {
        const a = boxes[i];
        assert.ok(a.x0 >= 0 && a.y0 >= 0 && a.x1 <= W && a.y1 <= H, `${c.id} ${k} #${s}: 이름표 "${a.t}"가 그림 밖`);
        for (let j = i + 1; j < boxes.length; j++) { const b = boxes[j]; assert.ok(!(a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1), `${c.id} ${k} #${s}: 이름표 "${a.t}"·"${b.t}" 겹침\n${d}`); }
      }
      // 글로 바꾸기
      assert.ok(!/\[sym/.test(figText(d)) && /모눈 그림/.test(figText(d)), d);
      n++;
    }
  }
  assert.ok(n > 300, `그린 그림 ${n}`);
  // 앱이 글 속 그림을 그리는 자리(renderFigures)도 [sym]을 안다 · 말이 안 되는 지시문은 빈 글자
  assert.ok(renderFigures('글 [sym x=5 ㄱ:5,4 ㄴ:2,2 ㄷ:5,0 ㄹ:8,2] 글').includes('sym-fig'));
  for (const bad of ['sym ㄱ:0,0 ㄴ:1,1', 'sym x=3 ㄱ:0,0 ㄱ:1,0 ㄷ:0,2', 'sym x=3 c=1,1 0,0 2,0 1,2', 'sym 0,0 20,0 1,1', 'sym open 0,0', 'sym ㉠@1,1 ㉡@2,2 ㉢@3,3 ㉣@4,4 ★@5,5 0,0 2,0 1,2']) assert.equal(figureSvg(bad), '', bad);
});

test('🔢 숫자판: 수가 답인 ①만 숫자판 — 점·변·㉠·문장이 답이면 보기 고르기', () => {
  for (const { c, s, q } of every(['calc'], 200)) {
    const ok = q.choices.find((x) => x.ok).text;
    const numeric = valueOf(ok) !== null;
    assert.equal(!!padSpec(q, 'sym'), numeric, `${c.id} #${s}: 정답 "${ok}" 숫자판 ${!!padSpec(q, 'sym')}`);
  }
});

test('✍️ 그리기 문항(M6·M9): draw.fig는 후보 점을 뺀 그림 · target이 정답 후보 점 · 후보 점 넷이 모두 들어 있다', () => {
  let n = 0;
  for (const { c, s, q } of every(['calc'], 200)) {
    if (!q.draw) continue;
    const ok = q.choices.find((x) => x.ok).text;
    const fig = readSym(q.q);
    assert.ok(q.q.includes(q.draw.fig.replace(/^sym /, '[sym ')), `${c.id} #${s}: 그림 시작이 같다`);
    assert.ok(!/@/.test(q.draw.fig), `${c.id} #${s}: draw.fig에 후보 점이 남았다`);
    const okc = fig.cands.find((z) => z.k === ok);
    assert.deepEqual(q.draw.target, [okc.x, okc.y]);
    assert.deepEqual(q.draw.cands.map((z) => [z.k, z.x, z.y]), fig.cands.map((z) => [z.k, z.x, z.y]));
    assert.ok(figureSvg(q.draw.fig), q.draw.fig);
    // 후보 점이 대칭축 위에 있으면 아이가 헷갈린다 (묻는 점이 축에서 가장 먼 점일 때 "밀기" 자리가 축 위에 떨어졌다)
    if (fig.axis) for (const z of fig.cands) assert.ok(fig.axis.x !== undefined ? z.x !== fig.axis.x : z.y !== fig.axis.y, `${c.id} #${s}: 후보 ${z.k}가 대칭축 위`);
    n++;
  }
  assert.ok(n > 200, `그리기 문항 ${n}`);
});

test('📏 진단·사다리·한 편·배움 예비·내용 검사', () => {
  const d = diagnosticSet(7, 5, OPTS);
  assert.equal(d.length, 5);
  assert.deepEqual(d.map((q) => q.concept), ['sym.congr', 'sym.tri', 'sym.lineprop', 'sym.point', 'sym.pointdraw']);
  const pf = placeFrom(d.map((q, i) => ({ concept: q.concept, correct: i < 2 })));
  assert.equal(pf.startId, 'sym.lineprop');
  const L0 = ladder([]);
  assert.equal(L0[0].state, 'now');
  assert.ok(L0.slice(1).every((r) => r.state === 'locked'));
  for (const c of SYM) {
    const round = makeRound(c.id, 11, OPTS);
    assert.ok(round.length >= 2 && round.every((q) => q.concept === c.id), c.id);
    const les = lessonOf(c.id, 3, OPTS);
    assert.ok(les.pages.length >= 1 && les.title === c.name);
    assert.equal(conceptById(c.id), c);
  }
  assert.ok(checkContent({}).length >= 9, '빈 원고는 칸마다 걸린다');
});

test('앱 셸: mathsym.js가 sw.js APP_SHELL에 있다 (오프라인)', () => {
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.ok(sw.includes("'./js/mathsym.js'"));
});

// ───────────────────── 2단계: 원고 coach/math/sym.json ─────────────────────

const CONTENT = JSON.parse(readFileSync(new URL('../coach/math/sym.json', import.meta.url), 'utf8'));
const CAST = { me: '진우', mon: '피카츄', mon2: '리자몽', recent: [], want: '', wantKind: '', key: '' };
const fillC = (t) => String(t).replace(/\{(me|mon|mon2)(?:\/([^/}]+)\/([^}]+))?\}/g, (_, k, a, b) => {
  const name = CAST[k];
  if (!a) return name;
  const code = name.charCodeAt(name.length - 1) - 0xac00;
  return name + (code >= 0 && code % 28 ? a : b);
});
/** 원고의 모든 글 (배움·확인·규칙·아빠 카드) — 칸마다 */
function contentText(v) {
  const parts = [];
  for (const p of v.lesson) { parts.push(p.say); if (p.check) parts.push(p.check.q, p.check.ok, ...p.check.no, p.check.why); }
  parts.push(v.rule, v.dad.goal, ...v.dad.say, v.dad.do, v.dad.pass, ...v.dad.traps.flatMap((t) => [t.kid, t.dad]));
  return parts.map(fillC).join('\n');
}
const CHECKS = IDS.flatMap((id) => CONTENT[id].lesson.map((p, i) => ({ id, i, p })).filter((x) => x.p.check));
/** 삼각형 ㄱㄴㄷ — 아는 것(변·각)만으로 하나로 정해지나: 세 변 · 두 변과 그 사이에 있는 각 · 한 변과 두 각(두 각을 알면 나머지 각도 안다) */
function triFixed(parts) {
  const S = parts.filter((x) => x.s).map((x) => x.s); const A = parts.filter((x) => x.a).map((x) => x.a);
  if (S.length >= 3 || (S.length >= 1 && A.length >= 2)) return true;
  if (S.length === 2 && A.length >= 1) { const shared = [...S[0]].find((v) => S[1].includes(v)); return A.includes(shared); }
  return false;
}
const partOf = (t) => { let m; if ((m = /^각 (.)의 크기$/.exec(t))) return [{ a: m[1] }]; if ((m = /^변 (..)의 길이$/.exec(t))) return [{ s: m[1] }]; if (t === '더 몰라도 그릴 수 있어요') return []; throw new Error(`못 읽는 보기 ${t}`); };
const DIR = /점 (.)에서 대칭의 중심까지 (왼|오른)쪽으로 (\d+)칸, (위|아래)로 (\d+)칸/;
const isYes = /^(합동이에요|네) — /; const isNo = /^(합동이 아니에요|아니에요) — /;

test('원고(sym.json)가 형식 검사를 통과한다 — 9칸 모두 배움 3장↑·확인 2개↑·아빠 카드 (함정·통과 기준)', () => {
  assert.deepEqual(checkContent(CONTENT), []);
  for (const id of IDS) {
    const v = CONTENT[id];
    assert.ok(v.lesson.length >= 3 && v.lesson.length <= 5, `${id}: ${v.lesson.length}장`);
    assert.ok(v.dad.traps.length >= 2 && v.dad.say.length >= 2, id);
    const les = lessonOf(id, 1, { ...OPTS, content: CONTENT });
    assert.equal(les.pages.length, v.lesson.length);
    assert.ok(!/\{(me|mon)/.test(les.pages.map((p) => p.say).join('')), `${id}: 자리표시가 남음`);
  }
});

test('★ 원고 확인 질문도 따로 풀어 대조 — 전부 읽히고, 정답은 맞고, 오답은 정말 틀렸다', () => {
  let n = 0;
  for (const { id, i, p } of CHECKS) {
    const q = fillC(p.check.q); const ok = fillC(p.check.ok); const no = p.check.no.map(fillC);
    const where = `${id}[${i}]: ${q}`;
    let want;
    if (/선대칭도형일까요\?/.test(q)) want = axesCount(readGpoly(q)) > 0 ? 'yes' : 'no';
    else if (/중심에서 어느 쪽으로 몇 칸 더/.test(q)) { const m = DIR.exec(q); want = `${m[2]}쪽으로 ${m[3]}칸, ${m[4]}로 ${m[5]}칸`; }
    else if (/무엇을 더 알아야 할까요/.test(q)) {
      // 글에 적힌 아는 것 + 보기 하나 → 하나로 정해지나 (정답만 정해지고, 아는 것만으로는 안 정해진다)
      const known = [...q.matchAll(/(변|각) ([ㄱ-ㅎ]{1,2}) \d+(?: cm|°)/g)].map((z) => (z[1] === '변' ? { s: z[2] } : { a: z[2] }));
      assert.ok(known.length === 2 && !triFixed(known), `${where}: 아는 것만으로 정해진다`);
      assert.ok(triFixed([...known, ...partOf(ok)]), `${where}: 정답 "${ok}"으로도 안 정해진다`);
      for (const x of no) assert.ok(!triFixed([...known, ...partOf(x)]), `${where}: 오답 "${x}"으로도 정해진다`);
      n++;
      continue;
    } else want = solveText(q);
    if (want === 'yes' || want === 'no') {
      assert.match(ok, want === 'yes' ? isYes : isNo, where);
      for (const x of no) assert.match(x, want === 'yes' ? isNo : isYes, `${where}: 오답 "${x}"`);
    } else if (/^\d+$/.test(want)) {
      assert.equal(valueOf(ok), Number(want), where);
      for (const x of no) assert.notEqual(valueOf(x), Number(want), `${where}: 오답 "${x}"이 맞는 답`);
    } else {
      assert.ok(sameSide(ok, want), `${where}: 정답 "${ok}" — 따로 푼 답 "${want}"`);
      for (const x of no) assert.ok(!sameSide(x, want), `${where}: 오답 "${x}"이 맞는 답`);
    }
    n++;
  }
  assert.equal(n, CHECKS.length);
  assert.ok(n >= 30, `확인 질문 ${n}`);
});

/** 글이 그림에 대해 말하는 것을 그림 좌표로 다시 잰다 — 몇 개를 쟀는지 돌려준다 */
function claimsHold(t, fig, gp, where) {
  const s = t.replace(/\*\*/g, ''); let k = 0; let m;
  const pt = (nm) => fig.polys.flat().find((p) => p.name === nm);
  const closed = fig && !fig.open && fig.polys.length === 1;
  /** 대응점 이름 — 두 도형이면 포개기, 대칭축이면 뒤집기, 대칭의 중심이면 180° 돌리기 */
  const corr = (a) => {
    if (fig.polys.length === 2) return byName(fig.polys[0], a) ? corrOf(fig)(a) : corrOf({ polys: [fig.polys[1], fig.polys[0]] })(a); // 둘째 도형 이름으로 말해도 (변 ㅂㅁ의 대응변)
    const q = fig.axis ? reflA(pt(a), fig.axis) : rotC(pt(a), fig.center);
    return nameAt(fig.polys[0], q);
  };
  if (fig) {
    for (const z of s.matchAll(/점 (.)의 대응점은 점 (.)/g)) { assert.equal(corr(z[1]), z[2], `${where}: 점 ${z[1]}의 대응점`); k++; }
    for (const z of s.matchAll(/변 (.)(.)의 대응변은 변 (..)/g)) { assert.ok(sameSide(`변 ${corr(z[1])}${corr(z[2])}`, `변 ${z[3]}`), `${where}: 변 ${z[1]}${z[2]}의 대응변`); k++; }
    for (const z of s.matchAll(/(?:점 (.)에서 대칭축까지|대칭축에서 점 (.)까지도?) (\d+) ?(?:칸|cm)/g)) {
      const p = pt(z[1] || z[2]);
      assert.equal(fig.axis.x !== undefined ? Math.abs(p.x - fig.axis.x) : Math.abs(p.y - fig.axis.y), +z[3], `${where}: "${z[0]}"`); k++;
    }
    if ((m = DIR.exec(s)) && fig.center) {
      const p = pt(m[1]);
      assert.deepEqual([fig.center.x - p.x, fig.center.y - p.y], [(m[2] === '오른' ? 1 : -1) * m[3], (m[4] === '위' ? 1 : -1) * m[5]], `${where}: "${m[0]}"`); k++;
    }
    if (fig.polys.length === 2 && /넓이가 모두 (\d+)칸/.test(s)) {
      const N = +/넓이가 모두 (\d+)칸/.exec(s)[1];
      assert.deepEqual(fig.polys.map(area), [N, N], `${where}: 넓이`); k++;
    }
    // 닫힌 대칭 그림은 정말 대칭이다 · 대칭의 중심이 있는 그림에서 "점 ㄱ과 점 ㄷ"은 180° 돌려 겹치는 짝
    if (closed && fig.axis) { for (const p of fig.polys[0]) assert.ok(fig.polys[0].some((q) => eq(q, reflA(p, fig.axis))), `${where}: 선대칭이 아니다`); k++; }
    if (closed && fig.center) {
      for (const p of fig.polys[0]) assert.ok(fig.polys[0].some((q) => eq(q, rotC(p, fig.center))), `${where}: 점대칭이 아니다`); k++;
      for (const z of s.matchAll(/점 (.)과 점 (.)/g)) { assert.equal(corr(z[1]), z[2], `${where}: "${z[0]}"은 대응점이 아니다`); k++; }
    }
  }
  if ((m = /대칭축은? (\d+)개/.exec(s)) && gp) { assert.equal(gp.reg ? gp.reg : axesCount(gp.poly), +m[1], `${where}: 대칭축 개수`); k++; }
  if (gp && gp.poly && /점대칭도형이 아니에요/.test(s)) { assert.ok(!pointSym(gp.poly), `${where}: 점대칭이다`); k++; }
  return k;
}
const gpOf = (t) => { const g = readGpoly(t); if (g) return { poly: g }; const r = /\[reg (\d) \d+\]/.exec(t); return r ? { reg: +r[1] } : null; };

test('★ 원고의 그림: 모두 그려지고, 배움 글이 말하는 것 = 그 장의 그림 (대응점·대응변·칸 수·대칭축 개수·넓이·합동·대칭)', () => {
  let figs = 0; let claims = 0;
  for (const id of IDS) {
    for (const [i, p] of CONTENT[id].lesson.entries()) {
      const where = `${id}[${i}]`;
      const say = fillC(p.say);
      for (const d of [...(say.match(/\[[a-z]+ [^\]]+\]/g) || []), ...((p.check && p.check.q.match(/\[[a-z]+ [^\]]+\]/g)) || [])]) { assert.ok(figureSvg(d.slice(1, -1)), `${where}: 못 그리는 ${d}`); figs++; }
      const sf = readSym(say);
      // 두 도형 그림: 글이 "합동이 아니에요"라고 하면 정말 안 겹치고, 아니면 겹친다 · "세 각의 크기가 같지만"이면 변의 비가 모두 같다(두 배)
      if (sf && sf.polys.length === 2) {
        assert.equal(congruent(sf.polys[0], sf.polys[1]), !/합동이 아니에요/.test(say), `${where}: 합동 여부가 글과 다르다`);
        if (/세 각의 크기가 같지만/.test(say)) {
          const L = (P) => P.map((a, j) => dd(a, P[(j + 1) % P.length])).sort((u, v) => u - v);
          const r = L(sf.polys[1]).map((v, j) => v / L(sf.polys[0])[j]);
          assert.ok(r.every((x) => x === r[0]) && r[0] !== 1, `${where}: 닮은 두 삼각형이 아니다`);
        }
        claims++;
      }
      claims += claimsHold(say, sf, gpOf(say), where);
      if (p.check) {
        const q = fillC(p.check.q);
        const qf = readSym(q) || sf; const qg = gpOf(q) || gpOf(say);
        claims += claimsHold(q, readSym(q) ? readSym(q) : sf, qg, `${where}✓ 질문`);
        claims += claimsHold(fillC(p.check.why), qf, qg, `${where}✓ 풀이`);
      }
    }
  }
  assert.ok(figs >= 45, `그림 ${figs}`);
  assert.ok(claims >= 40, `잰 말 ${claims}`);
});

test('★ 원고의 [sym] 그림: 이름표끼리 안 겹치고 그림 안에 · 폭 400 이하 · 후보 점은 대칭축 위에 없다', () => {
  let n = 0;
  for (const id of IDS) {
    for (const [i, p] of CONTENT[id].lesson.entries()) {
      for (const d of [...(p.say.match(/\[sym [^\]]+\]/g) || []), ...((p.check && p.check.q.match(/\[sym [^\]]+\]/g)) || [])]) {
        const svg = figureSvg(d.slice(1, -1)); const sp = readSym(d);
        const [W, H] = /viewBox="0 0 (\d+) (\d+)"/.exec(svg).slice(1).map(Number);
        assert.ok(W <= 400 && H <= 400, `${id}[${i}] ${d}: ${W}×${H}`);
        const boxes = [...svg.matchAll(/<text(?: class="[^"]+")? x="([\d.]+)" y="([\d.]+)" font-size="(\d+)"[^>]*>([^<]+)<\/text>/g)].map((z) => {
          const fs = +z[3]; const t = z[4]; const w = ([...t].reduce((a, ch) => a + (/[ㄱ-ㅎ가-힣㉠-㉯°]/.test(ch) ? (ch === '°' ? 6 : 15) : 8.2), 0) * fs) / 15;
          return { t, x0: +z[1] - w / 2, x1: +z[1] + w / 2, y0: +z[2] - fs * 0.78, y1: +z[2] + fs * 0.22 };
        });
        assert.ok(boxes.length >= sp.polys.flat().filter((q) => q.name).length + sp.cands.length, `${id}[${i}] ${d}: 이름표 수`);
        for (let a = 0; a < boxes.length; a++) {
          const A = boxes[a];
          assert.ok(A.x0 >= 0 && A.y0 >= 0 && A.x1 <= W && A.y1 <= H, `${id}[${i}]: 이름표 "${A.t}"가 그림 밖\n${d}`);
          for (let b = a + 1; b < boxes.length; b++) { const B = boxes[b]; assert.ok(!(A.x0 < B.x1 && B.x0 < A.x1 && A.y0 < B.y1 && B.y0 < A.y1), `${id}[${i}]: 이름표 "${A.t}"·"${B.t}" 겹침\n${d}`); }
        }
        if (sp.axis) for (const z of sp.cands) assert.ok(sp.axis.x !== undefined ? z.x !== sp.axis.x : z.y !== sp.axis.y, `${id}[${i}]: 후보 ${z.k}가 대칭축 위`);
        n++;
      }
    }
  }
  assert.ok(n >= 25, `[sym] 그림 ${n}`);
});

test('★ 원고의 조사·셈식·아직 안 배운 말 (배움 글·확인 질문·아빠 카드 전부)', () => {
  const BAT = new Set(['0', '1', '3', '6', '7', '8']);
  const NEW = [['대응', 1], ['대칭', 3], ['선대칭', 3], ['대칭축', 3], ['점대칭', 6], ['대칭의 중심', 6]];
  const ev = (expr) => Function(`return (${expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-')})`)();
  let exprs = 0;
  for (const id of IDS) {
    const all = contentText(CONTENT[id]);
    // 자모 이름(기역·니은·…)과 ㉠~㉣은 모두 받침으로 끝난다 — 점 ㄴ은·변 ㄱㄴ이에요·㉡이에요
    assert.ok(!/[ㄱ-ㅎ㉠-㉣](는|를|가|와|로|예요|야)(?=[\s.,!?)—*]|$)/m.test(all), `${id}: 자모 뒤 조사\n${(all.match(/.*[ㄱ-ㅎ㉠-㉣](는|를|가|와|로|예요|야)(?=[\s.,!?)—*]|$).*/m) || [''])[0]}`);
    assert.ok(!/cm(은|을|이 |과|이에요)|°(은|을|이 |과|이에요)/.test(all), `${id}: 단위 뒤 조사`);
    for (const m of all.matchAll(/(\d)(을|를|은|는|이|가|과|와)(?=[\s.,!?)]|$)/g)) assert.equal(m[2], BAT.has(m[1]) ? { 을: '을', 를: '을', 은: '은', 는: '은', 이: '이', 가: '이', 과: '과', 와: '과' }[m[2]] : { 을: '를', 를: '를', 은: '는', 는: '는', 이: '가', 가: '가', 과: '와', 와: '와' }[m[2]], `${id}: "${m[0]}"`);
    // 글 속 셈식 (°·cm·굵게는 떼고)
    for (const m of all.replace(/\*\*/g, '').replace(/°/g, '').matchAll(/(?<![\d.])(\d+(?: [+−×÷] \d+)+) = (\d+)/g)) { assert.ok(Math.abs(ev(m[1]) - Number(m[2])) < 1e-9, `${id}: ${m[0]}`); exprs++; }
    const at = IDS.indexOf(id);
    for (const [w, from] of NEW) if (at < from) assert.ok(!all.includes(w), `${id}: 아직 안 배운 "${w}"`);
  }
  assert.ok(exprs >= 8, `셈식 ${exprs}`);
});

// ───────────────────── 3단계: 화면 연결 · ✍️ 모눈 판 ─────────────────────

test('화면 연결 (3단계): STEMS.sym은 이 생성기·원고를 쓰고, 앱 셸이 둘 다 들고 간다 (오프라인)', async () => {
  const { STEMS, stemOf } = await import('../js/mathprog.js');
  assert.equal(STEMS.sym.code, 'M');
  assert.equal(STEMS.sym.list, SYM);
  assert.equal(STEMS.sym.gen.makeQuestion, makeQuestion);
  assert.ok(IDS.every((id) => stemOf(id) === STEMS.sym), '모든 칸이 M 줄기로 찾아진다');
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  for (const f of ['./js/mathsym.js', './coach/math/sym.json', './js/drawview.js']) assert.ok(sw.includes(`'${f}'`), `APP_SHELL에 ${f}`);
});

test('✍️ 모눈 판 (3단계): 판에는 후보 점이 없고 범위는 답한 뒤 그림과 같다 · 누른 자리 → 가장 가까운 모눈점 · 찍은 자리 말 = 풀이 카드 말 · 화면 배선', async () => {
  const { canDraw, gridOf, gridSay } = await import('../js/drawview.js');
  const { symSvg } = await import('../js/mathdraw.js');
  const vb = (svg) => /viewBox="([^"]+)"/.exec(svg)[1];
  const TO = { 오른쪽: [1, 0], 왼쪽: [-1, 0], 위: [0, 1], 아래: [0, -1] };
  /** "대칭의 중심에서 왼쪽으로 1칸, 아래로 3칸" → [-1, -3] (따로 읽기) */
  const readWay = (t) => [...t.matchAll(/(오른쪽|왼쪽|위|아래)(?:으로|로) (\d+)칸/g)].reduce((a, z) => [a[0] + TO[z[1]][0] * z[2], a[1] + TO[z[1]][1] * z[2]], [0, 0]);
  let n = 0; let flips = 0;
  for (const { c, s, q } of every(['calc'], 200)) {
    if (!q.draw) continue;
    const where = `${c.id} #${s}`;
    assert.ok(canDraw(q.draw), where);
    const g = gridOf(q.draw);
    // 판 그림: 후보 점 ㉠~㉣가 없다(답을 흘리지 않는다) · 답한 뒤 그림(후보 점 있음)과 같은 자 — 찍은 점이 같은 자리에 다시 그려진다
    const board = symSvg(g.sp); const after = symSvg({ ...g.sp, cands: q.draw.cands });
    assert.ok(!/sym-cand/.test(board), `${where}: 판에 후보 점`);
    assert.equal(vb(board), vb(after), `${where}: 판과 답한 뒤 그림의 범위가 다르다`);
    // 판 범위에 완성한 도형·후보 점이 모두 들어간다 (손가락이 닿아야 한다)
    for (const z of q.draw.cands) assert.ok(z.x >= g.G.x0 && z.x <= g.G.x1 && z.y >= g.G.y0 && z.y <= g.G.y1, `${where}: 후보 ${z.k}가 판 밖`);
    // 누른 자리(px) → 모눈점: 그 점 위든, 반 칸 안쪽으로 빗나가든 같은 점
    for (const p of [...q.draw.cands, ...g.sp.polys.flat()]) {
      for (const [ox, oy] of [[0, 0], [0.4, 0.4], [-0.4, 0.3], [0.3, -0.45]]) {
        const at = g.G.gridAt(g.G.X(p.x) + ox * g.G.C, g.G.Y(p.y) + oy * g.G.C);
        assert.deepEqual([at.x, at.y], [p.x, p.y], `${where}: (${p.x}, ${p.y}) 빗나감 ${ox},${oy}`);
      }
    }
    // 묻는 꼭짓점 = 문제 글의 "점 ㄴ의 대응점" (점선·◀▲▼▶ 시작)
    assert.equal(g.fromName, /점 (.)의 대응점은/.exec(q.q)[1], where);
    // 정답 자리의 말 = 풀이 카드의 말 — 선대칭은 "대칭축 ○○로 d칸"(높이는 그대로), 점대칭은 "중심에서" + 묻는 점에서 중심까지와 같은 쪽·같은 칸
    const say = gridSay(g, g.target);
    if (g.sp.axis) {
      const d = g.sp.axis.x !== undefined ? Math.abs(g.from.x - g.sp.axis.x) : Math.abs(g.from.y - g.sp.axis.y);
      assert.match(say, new RegExp(`^대칭축 (오른쪽|왼쪽|위|아래)(으로|로) ${d}칸$`), `${where}: ${say}`);
      assert.ok(q.solve.steps[0].includes(`${d}칸`), where);
      const F = q.choices.find((x) => x.tag === TAGS.flipBoth || x.tag === TAGS.flipSide);
      if (F) { assert.match(gridSay(g, q.draw.cands.find((z) => z.k === F.text)), /보다 \d+칸 (위|아래|오른쪽|왼쪽)$/, `${where}: 위아래까지 뒤집은 자리는 높이가 다르다고 말한다`); flips++; }
    } else {
      assert.match(say, /^대칭의 중심에서 /, where);
      assert.deepEqual(readWay(say), [g.sp.center[0] - g.from.x, g.sp.center[1] - g.from.y], `${where}: ${say}`);
    }
    // 찍은 자리 → 보기 글자: 후보 점은 모두 보기에 있고, 짐작 글자 "(8, 4)"는 어느 보기와도 안 겹친다
    for (const z of q.draw.cands) assert.ok(q.choices.some((x) => x.text === z.k), `${where}: 후보 ${z.k}가 보기에 없다`);
    assert.ok(!q.choices.some((x) => /^\(\d+, \d+\)$/.test(x.text)), where);
    n++;
  }
  assert.ok(n > 200 && flips > 50, `모눈 판 문항 ${n} · 위아래까지 뒤집은 후보 ${flips}`);
  // 말이 안 되는 draw는 판을 안 연다 (보기로 되돌아간다)
  for (const bad of [{ mode: 'grid', fig: 'sym open 0,0 2,0', target: [1, 1], cands: [{ k: '㉠', x: 1, y: 1 }, { k: '㉡', x: 2, y: 2 }] }, { mode: 'grid', fig: 'sym open x=5 ㄱ:5,7 ㄴ:2,5', target: [9, 9], cands: [{ k: '㉠', x: 8, y: 5 }, { k: '㉡', x: 7, y: 5 }] }]) assert.equal(canDraw(bad), false, JSON.stringify(bad));
  // 화면 배선 — 문항·🔁 쌍둥이 둘 다 모눈 판을 연다(숫자판 없이도), 찍은 글자로 보기를 찾는다, 문제 글에서는 후보 점 그림을 뺀다
  const src = readFileSync(new URL('../js/math.js', import.meta.url), 'utf8');
  assert.match(src, /if \(q\.draw && q\.draw\.mode === 'grid'\) return padOn\(\) && ui\.round && ui\.round\.mode !== 'special' && canDraw\(q\.draw\)/);
  assert.equal((src.match(/const typedOn = spec \|\| draw;/g) || []).length, 2, 'renderQuestion·renderTwin 둘 다');
  assert.equal((src.match(/if \(typedOn && !\(restore && [rt]\.answered\)\) list\.appendChild\(typedBox\(q, spec, draw,/g) || []).length, 2);
  assert.match(src, /const res = spec \? matchTyped\(q, typed, spec\) : \{ i: q\.choices\.findIndex\(\(c\) => c\.text === typed\.text\) \};/);
  assert.match(src, /if \(draw\.mode === 'grid'\) return String\(q\.q\)\.replace\(\/\\\[sym/);
  // 풀이 카드의 "❌ 내 답"은 후보가 아닌 자리("(6, 2)")를 좌표 대신 판 위의 빨간 점으로 가리킨다
  assert.match(src, /q\.draw\.mode === 'grid' && \/\^\\\(\\d\+, \\d\+\\\)\$\/\.test\(String\(ch\.text\)\) \? '빨간 점 자리'/);
});

test('❓ 아빠에게 묻기: 모눈 판에 찍은 답은 "모눈에 직접 찍음"으로 — 보기 ㉠~㉣는 아이가 못 본 후보 점이라고 알린다', async () => {
  const { askContext, addAsk, asksText } = await import('../js/mathask.js');
  const q = makeQuestion('sym.linedraw', 'calc', 3, OPTS);
  assert.ok(q.draw && q.draw.mode === 'grid');
  const ctx = askContext(q, { chosen: '(1, 2)', p: 1, g: '(1, 2)', w: 'u' });
  assert.equal(ctx.grid, 1);
  assert.equal(askContext(q, { chosen: q.choices[0].text }).grid, undefined, '보기를 누른 답(숫자판·판 꺼짐)은 그대로');
  const m = {};
  assert.ok(addAsk(m, ctx, '2026-10-02').ok);
  const txt = asksText(m, '2026-10-02');
  assert.match(txt, /진우 답: \(1, 2\) \(✍️ 모눈에 직접 찍음 — 보기의 ㉠~㉣는 진우가 못 본 후보 점\) ❌/);
  assert.match(txt, /\[sym /, '그림 지시문이 복사문에 그대로 (좌표로 읽힌다)');
  // 숫자판으로 쓴 답은 예전처럼
  const qn = makeQuestion('sym.lineprop', 'calc', 5, OPTS);
  assert.equal(askContext(qn, { chosen: '6', p: 1 }).grid, undefined);
});
