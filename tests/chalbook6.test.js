// 🎯 v246 도전 문제 — 문제집에서 고른 문제(5단원 LEVEL 1 19·20 · 6단원 다각형 136~137쪽 11~20) · 보기마다 까닭 · 작은 단원 보상 · ✍️ 대각선 그어 보기
// 답은 자료에 적힌 값이 아니라 **문제집 숫자·그림 좌표로 다시 푼 값**과 대조한다 (workbook-transcribe — 옮기기가 제일 위험하다)
// 「정답과 풀이」 50쪽(19 화요일 4개 · 20 134500원) · 54쪽(11 ㉡㉣ · 13 지우 · 14 2개 · 17 나다가 · 18 가다 · 19 가라 · 20 ③)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { REWARD, ROUND_N, SET_FULL, SET_BALL_MIN, setOf, checkItem, chalReward, setGiftOf, notesFor, diagKind, diagTotal } from '../js/mathchal.js';
import { parseChart, figureSvg } from '../js/mathdraw.js';
import { rightMarkSvg, tapVertex } from '../js/chalview.js'; // 맨 위에서 DOM을 건드리지 않는다 — 판은 가짜 판으로 누른다

const read = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const DATA = JSON.parse(read('coach/math/challenge.json'));
const U5B = setOf(DATA, 'u5b');
const U6 = setOf(DATA, 'u6');
const U5 = setOf(DATA, 'u5');
const item = (set, no) => set.items.find((it) => it.no === no);
const figs = (it) => [].concat(it.fig || []);
const polysOf = (it) => figs(it).find((f) => f.kind === 'polys');

// 문제집 숫자를 다시 적는다 (정답과 풀이 50쪽: 월 50 · 화 46 · 수 55 · 목 58 · 금 60)
const ERASER = { 월: 50, 화: 46, 수: 55, 목: 58, 금: 60 };
const PRICE = 500;

// ── 기하 (그림 좌표로 다시 푼다) ──
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const len = (v) => Math.hypot(v[0], v[1]);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));
function convex(P) {
  const s = P.map((p, i) => Math.sign(cross(sub(P[(i + 1) % P.length], p), sub(P[(i + 2) % P.length], P[(i + 1) % P.length]))));
  return s.every((x) => x === s[0] && x !== 0);
}
const sides = (P) => P.map((p, i) => len(sub(P[(i + 1) % P.length], p)));
function angles(P) {
  return P.map((p, i) => {
    const a = sub(P[(i + P.length - 1) % P.length], p);
    const b = sub(P[(i + 1) % P.length], p);
    return Math.acos(dot(a, b) / (len(a) * len(b)));
  });
}
const allSame = (xs) => xs.every((x) => near(x, xs[0]));
const diagsEqual = (P) => near(len(sub(P[2], P[0])), len(sub(P[3], P[1])));
const diagsPerp = (P) => near(dot(sub(P[2], P[0]), sub(P[3], P[1])) / (len(sub(P[2], P[0])) * len(sub(P[3], P[1]))) + 1, 1);
const parallel = (a, b) => near(cross(a, b) / (len(a) * len(b)) + 1, 1);
/** 사각형 이름 — 문제집 표의 이름으로 (정사각형 · 직사각형 · 마름모 · 평행사변형 · 사다리꼴) */
function quadName(P) {
  const right = angles(P).every((t) => near(t, Math.PI / 2));
  const eq = allSame(sides(P));
  if (right && eq) return '정사각형';
  if (right) return '직사각형';
  if (eq) return '마름모';
  const e = P.map((p, i) => sub(P[(i + 1) % 4], p));
  const p02 = parallel(e[0], e[2]);
  const p13 = parallel(e[1], e[3]);
  if (p02 && p13) return '평행사변형';
  if (p02 || p13) return '사다리꼴';
  return '사각형';
}

test('🎯 v246 자료: 단원 u5b(19·20) · u6(11~20) · 단원 정보 · 모든 문제에 💡 한 줄', () => {
  assert.deepEqual(U5B.items.map((it) => it.no), [19, 20]);
  assert.deepEqual(U6.items.map((it) => it.no), [11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  assert.ok(U5B.unit.startsWith('5. 꺾은선그래프') && U5B.level.includes('LEVEL 1') && U5B.pages);
  assert.ok(U6.unit === '6. 다각형' && U6.pages === '136~137쪽');
  for (const it of [...U5B.items, ...U6.items]) {
    assert.ok(it.idea && it.idea.length > 10, `${it.no}번 💡 핵심 개념 한 줄이 없다`);
    assert.ok(it.why && it.why.length > 20, `${it.no}번 풀이가 없다`);
  }
  assert.match(DATA.verified, /50쪽·54쪽과 대조/);
});

test('★ 🎯 5단원 LEVEL 1 검산 — 그래프 지시문 값 = 문제집 숫자 · 19 줄어든 때와 개수 · 20 판매량 합과 값', () => {
  for (const no of [19, 20]) {
    const f = item(U5B, no).fig;
    const sp = parseChart('lgraph', f.spec.replace(/^lgraph /, ''));
    assert.ok(figureSvg(f.spec), `${no}번 그래프가 그려진다`);
    assert.deepEqual(Object.fromEntries(sp.items.map((x) => [x.label, x.v])), ERASER, `${no}번 그래프 값`);
    assert.deepEqual([sp.step, sp.base], [1, 45], '눈금 한 칸 1개 · 물결선 위 45');
  }
  // 19 — 전날보다 줄어든 날을 다시 찾는다
  const days = Object.keys(ERASER);
  const down = days.slice(1).filter((d, i) => ERASER[d] < ERASER[days[i]]);
  assert.equal(down.length, 1, '줄어든 날은 하나');
  const d = down[0];
  const prev = days[days.indexOf(d) - 1];
  const p19 = item(U5B, 19).parts;
  assert.equal(p19[0].answer, `${d}요일`);
  assert.equal(Number(p19[1].answer), ERASER[prev] - ERASER[d]);
  assert.ok(checkItem(item(U5B, 19), ['화요일', '4']).ok && !checkItem(item(U5B, 19), ['수요일', '4']).ok);
  // 20 — 합 × 값
  const sum = Object.values(ERASER).reduce((a, b) => a + b, 0);
  const p20 = item(U5B, 20).parts;
  assert.deepEqual([Number(p20[0].answer), Number(p20[1].answer)], [sum, sum * PRICE]);
  assert.deepEqual([sum, sum * PRICE], [269, 134500], '정답과 풀이 50쪽');
  assert.ok(checkItem(item(U5B, 20), ['269', '134500']).ok);
});

test('★ 🎯 6단원 다각형 그림: 모두 볼록 · 12는 네 변이 같고 각이 다른 마름모 · 14 오각형 아래 꼭짓점 표시 · 15 팔각형 · 17 사각형·육각형·오각형 · 18·19 가 정사각형 나 사다리꼴 다 직사각형 라 마름모', () => {
  for (const it of U6.items) {
    for (const f of [...figs(it), ...[].concat(it.ansFig || [])].filter((x) => x.kind === 'polys')) {
      for (const s of f.shapes) {
        assert.ok(s.pts.length >= 3 && convex(s.pts), `${it.no}번 볼록 다각형`);
        if (s.mark !== undefined) assert.ok(Number.isInteger(s.mark) && s.mark >= 0 && s.mark < s.pts.length);
      }
    }
  }
  const rh = polysOf(item(U6, 12)).shapes[0].pts;
  assert.ok(allSame(sides(rh)) && !allSame(angles(rh)), '12번: 변은 같고 각은 다르다');
  const pen = polysOf(item(U6, 14)).shapes[0];
  assert.equal(pen.pts.length, 5);
  assert.equal(pen.mark, 0);
  assert.ok(pen.pts[0][1] === Math.max(...pen.pts.map((p) => p[1])), '14번: 표시한 꼭짓점이 맨 아래(문제집처럼)');
  assert.equal(polysOf(item(U6, 15)).shapes[0].pts.length, 8);
  assert.deepEqual(polysOf(item(U6, 17)).shapes.map((s) => [s.label, s.pts.length]), [['가', 4], ['나', 6], ['다', 5]]);
  assert.equal(quadName(polysOf(item(U6, 17)).shapes[0].pts), '평행사변형');
  for (const no of [18, 19]) assert.deepEqual(polysOf(item(U6, no)).shapes.map((s) => `${s.label}:${quadName(s.pts)}`), ['가:정사각형', '나:사다리꼴', '다:직사각형', '라:마름모'], `${no}번 사각형`);
  // 답 그림은 문제 그림과 같은 도형(표시한 꼭짓점까지) — 대각선만 더 그린다
  for (const it of U6.items.filter((x) => x.ansFig)) assert.deepEqual(it.ansFig.shapes, polysOf(it).shapes, `${it.no}번 답 그림은 같은 도형`);
  assert.deepEqual(U6.items.filter((x) => x.ansFig).map((x) => x.no), [14, 15, 17, 18, 19]);
});

test('★ 🎯 6단원 검산 — 대각선 수·길이·수직을 그림 좌표로 다시 세어 자료의 답과 대조', () => {
  // 14 — 표시된 꼭짓점에서: 이웃하지 않는 꼭짓점 수
  const pen = polysOf(item(U6, 14)).shapes[0];
  const fromMark = pen.pts.filter((_, i) => diagKind(pen.pts.length, pen.mark, i) === 'diag').length;
  assert.equal(Number(item(U6, 14).parts[0].answer), fromMark);
  assert.equal(fromMark, 2, '정답과 풀이 54쪽');
  assert.equal(item(U6, 14).ansFig.lines, pen.mark, '답 그림은 표시된 꼭짓점에서만');
  // 15 — 모든 쌍 중 대각선을 하나하나 센다 (공식이 아니라)
  const oct = polysOf(item(U6, 15)).shapes[0].pts;
  let c = 0;
  for (let a = 0; a < oct.length; a++) for (let b = a + 1; b < oct.length; b++) if (diagKind(oct.length, a, b) === 'diag') c++;
  assert.equal(Number(item(U6, 15).parts[0].answer), c);
  assert.equal(c, diagTotal(8));
  assert.equal(c, 20);
  // 17 — 대각선 수가 많은 것부터
  const sh17 = polysOf(item(U6, 17)).shapes;
  const order = [...sh17].sort((a, b) => diagTotal(b.pts.length) - diagTotal(a.pts.length)).map((s) => s.label);
  assert.deepEqual(item(U6, 17).parts[0].answer, order);
  assert.deepEqual(order, ['나', '다', '가'], '정답과 풀이 54쪽');
  // 18·19 — 좌표로 길이·수직을 재고, 문제집 표의 이름으로도 다시 고른다 (두 길이 같아야)
  const quads = polysOf(item(U6, 18)).shapes;
  const table = figs(item(U6, 18)).find((f) => f.kind === 'table').rows;
  const rowOf = (head) => table.find((r) => r[0].startsWith(head))[1].split(', ');
  const eqGeo = quads.filter((s) => diagsEqual(s.pts)).map((s) => s.label);
  const eqTab = quads.filter((s) => rowOf('두 대각선의 길이가 같은').includes(quadName(s.pts))).map((s) => s.label);
  assert.deepEqual(eqGeo, eqTab);
  assert.deepEqual(item(U6, 18).parts[0].answer, eqGeo);
  assert.deepEqual(eqGeo, ['가', '다'], '정답과 풀이 54쪽');
  const pGeo = quads.filter((s) => diagsPerp(s.pts)).map((s) => s.label);
  const pTab = quads.filter((s) => rowOf('두 대각선이 서로 수직으로').includes(quadName(s.pts))).map((s) => s.label);
  assert.deepEqual(pGeo, pTab);
  assert.deepEqual(item(U6, 19).parts[0].answer, pGeo);
  assert.deepEqual(pGeo, ['가', '라'], '정답과 풀이 54쪽');
  // 나(사다리꼴)는 눈으로도 수직이 아닌 게 보여야 — 두 대각선 사이 각이 직각에서 15° 넘게
  const na = quads.find((s) => s.label === '나').pts;
  const t = (Math.acos(Math.abs(dot(sub(na[2], na[0]), sub(na[3], na[1]))) / (len(sub(na[2], na[0])) * len(sub(na[3], na[1])))) * 180) / Math.PI;
  assert.ok(t < 75, `나의 대각선 사이 각 ${t.toFixed(1)}° — 수직처럼 보이지 않게`);
  // 11·13·16·20 — 글로 된 문제
  assert.deepEqual(item(U6, 11).parts[0].answer, ['㉡', '㉣']);
  assert.equal(item(U6, 13).parts[0].answer, '지우');
  assert.match(item(U6, 13).parts[1].answer, /변의 길이가 같고, 5개의 각의 크기도 모두 같은/);
  assert.match(item(U6, 16).parts[0].answer, /이웃/);
  assert.match(item(U6, 20).parts[0].answer, /^③ 평행사변형의 한 대각선은 다른 대각선을 똑같이 둘로 나눕니다/);
  assert.match(item(U6, 12).parts[0].answer, /각의 크기가 모두 같지 않/);
});

test('🎯 보기마다 까닭(notesFor): 고른 틀린 보기 · 여러 개는 잘못 고른 것과 빠뜨린 것 · ㉠~㉣·①~⑤는 모두 · 숫자는 흔한 틀린 수 · 맞으면 없음', () => {
  const p12 = item(U6, 12).parts[0];
  assert.deepEqual(notesFor(p12, p12.answer), [], '맞으면 없음');
  const w = notesFor(p12, p12.choices[0]);
  assert.equal(w.length, 1);
  assert.deepEqual([w[0].t, w[0].ok, w[0].picked], [p12.choices[0], false, true]);
  // many — 잘못 고른 것 + 빠뜨린 것만
  const p19 = item(U6, 19).parts[0];
  const n19 = notesFor(p19, ['나', '라']);
  assert.deepEqual(n19.map((x) => [x.t, x.ok, x.picked]), [['가', true, false], ['나', false, true]]);
  assert.deepEqual(notesFor(p19, ['가', '라']), []);
  // allNotes — 맞혀도 보기 모두
  const p11 = item(U6, 11).parts[0];
  assert.deepEqual(notesFor(p11, ['㉡', '㉣']).map((x) => [x.t, x.ok]), [['㉠', false], ['㉡', true], ['㉢', false], ['㉣', true]]);
  const p20 = item(U6, 20).parts[0];
  assert.equal(notesFor(p20, p20.choices[0]).length, 5);
  assert.deepEqual(notesFor(p20, p20.choices[0]).filter((x) => x.picked).map((x) => x.t), [p20.choices[0]]);
  // num — 흔한 틀린 수
  const p15 = item(U6, 15).parts[0];
  assert.match(notesFor(p15, '40')[0].note, /두 번 센/);
  assert.match(notesFor(p15, ' 28 ')[0].note, /변/);
  assert.equal(notesFor(p15, '40')[0].num, true);
  assert.deepEqual(notesFor(p15, '20'), []);
  assert.deepEqual(notesFor(p15, '19'), [], '모르는 틀린 수는 없음');
  assert.deepEqual(notesFor(null, 'x'), []);
  // 자료 꼴 — notes 열쇠는 보기에 있고, numNotes 열쇠는 정답이 아니다 · allNotes면 보기마다 까닭
  for (const it of [...U5B.items, ...U6.items, ...U5.items]) {
    for (const p of it.parts) {
      for (const k of Object.keys(p.notes || {})) assert.ok(p.choices.includes(k), `${it.no}번 까닭 열쇠 ${k}가 보기에 없다`);
      for (const k of Object.keys(p.numNotes || {})) assert.ok(Number(k) !== Number(p.answer), `${it.no}번 numNotes에 정답이`);
      if (p.allNotes) assert.equal(Object.keys(p.notes).length, p.choices.length, `${it.no}번 모든 보기에 까닭`);
    }
  }
});

test('🏅 작은 단원 보상: 20문제는 그대로(⚡300 💰400 🌟) · 10문제는 절반 + 🌟 · 5문제 미만은 회차·완주 보너스 없이 문제 보상만 · setN 없으면 예전 그대로', () => {
  assert.deepEqual([SET_FULL, SET_BALL_MIN, ROUND_N], [20, 10, 5]);
  assert.deepEqual(setGiftOf(20), { xp: REWARD.set.xp, coin: REWARD.set.coin, ball: true });
  assert.deepEqual(setGiftOf(10), { xp: 150, coin: 200, ball: true });
  assert.deepEqual(setGiftOf(2), { xp: 0, coin: 0, ball: false });
  assert.deepEqual(setGiftOf(5), { xp: 75, coin: 100, ball: false }, '5~9문제는 🌟 없이');
  assert.equal(setGiftOf(9).ball, false);
  assert.deepEqual(setGiftOf(undefined), setGiftOf(20));
  // 20문제 단원은 예전과 같다
  const old = chalReward({ fresh: 5, n: 5, firstClear: true });
  assert.deepEqual(chalReward({ fresh: 5, n: 5, firstClear: true, setN: 20 }), old);
  assert.equal(old.items[REWARD.set.ball], 1);
  // 10문제 — 마지막 회차를 다 맞혀 완주
  const r10 = chalReward({ fresh: 5, n: 5, firstClear: true, setN: 10 });
  assert.deepEqual([r10.round, r10.set, r10.ball, r10.xp, r10.coin, r10.items[REWARD.set.ball]], [true, true, true, 5 * REWARD.item.xp + REWARD.round.xp + 150, 5 * REWARD.item.coin + REWARD.round.coin + 200, 1]);
  // 2문제 — 둘 다 처음 맞혀도 문제 보상만
  const r2 = chalReward({ fresh: 2, n: 2, firstClear: true, setN: 2 });
  assert.deepEqual([r2.round, r2.set, r2.ball, r2.xp, r2.coin, r2.stone, r2.throws, Object.keys(r2.items).length], [false, true, false, 2 * REWARD.item.xp, 2 * REWARD.item.coin, 0, 0, 0]);
  // 6~9문제 — 20문제 완주 보상을 문제 수만큼 나눠서 (🌟 없이, Codex 58차)
  assert.deepEqual([6, 7, 8, 9].map((n) => { const g = setGiftOf(n); return [g.xp, g.coin, g.ball]; }), [[90, 120, false], [105, 140, false], [120, 160, false], [135, 180, false]]);
  // 10문제 단원의 마지막 회차가 4문제(앞 회차에서 하나를 이미 맞힘) — 넷 다 처음 맞히면 문제 + 회차 + 완주 보상
  const r4 = chalReward({ fresh: 4, n: 4, firstClear: true, setN: 10 });
  assert.deepEqual([r4.xp, r4.coin, r4.stone, r4.throws, r4.round, r4.set, r4.ball, r4.items[REWARD.set.ball]], [220, 231, 1, 1, true, true, true, 1]);
  // 화면 — 단원 크기를 넘기고, 볼은 받았을 때만 말한다
  const math = read('js/math.js');
  assert.ok(math.includes('chalReward({ fresh: result.fresh, n, firstClear: result.firstClear, setN: (set.items || []).length })'));
  assert.ok(math.includes("`🏅 ${set.unit}을 다 풀었어요!${rw.ball ? ' 🌟 황금 몬스터볼을 받았어요' : ''}`"));
});

test('✍️ 대각선 그어 보기: 같은 점 · 이웃(변) · 대각선 가름 · n각형 대각선 수 · 판은 그림 꼭짓점을 누르는 단추 · 답 화면에 💡·답 그림·까닭', () => {
  assert.deepEqual([diagKind(5, 0, 0), diagKind(5, 0, 1), diagKind(5, 0, 4), diagKind(5, 0, 2), diagKind(5, 3, 1)], ['same', 'side', 'side', 'diag', 'diag']);
  assert.deepEqual([3, 4, 5, 6, 8].map(diagTotal), [0, 2, 5, 9, 20]);
  for (const no of [14, 15, 17, 18, 19]) assert.equal(polysOf(item(U6, no)).board, true, `${no}번 그어 보기 판`);
  assert.ok(!polysOf(item(U6, 12)).board, '12번은 판 없음');
  const cv = read('js/chalview.js');
  assert.ok(cv.includes("case 'polys': return polysEl(fig);") && cv.includes("import { diagKind } from './mathchal.js';"));
  assert.ok(cv.includes("const kind = diagKind(n, a, v);") && cv.includes("if (kind === 'side')") && cv.includes('if (lines.has(key))'));
  assert.ok(cv.includes("hit.setAttribute('role', 'button');") && cv.includes("board.msg.setAttribute('aria-live', 'polite');"), '꼭짓점은 키보드로도 · 알림은 읽힌다');
  const math = read('js/math.js');
  const a = math.slice(math.indexOf('function renderChalA() {'), math.indexOf('async function finishChal() {'));
  assert.ok(a.includes('const ansFig = item.ansFig ? figureEl(item.ansFig) : null;') && a.includes("el('p', 'chal-idea', `💡 ${item.idea}`)") && a.includes('notesFor(p, Array.isArray(given) ? given[i] : given)'));
  assert.ok(a.indexOf("'chal-idea'") < a.indexOf("'chal-why'"), '💡 한 줄이 풀이보다 먼저');
  assert.ok(read('css/style.css').includes('.chal-poly-hit.is-pick') && read('css/style.css').includes('.chal-idea {'));
  assert.ok(+(/const CACHE_VERSION = 'v(\d+)';/.exec(read('sw.js')) || [])[1] >= 246, 'sw 버전 v246 이상');
});

test('★ 🎯 14번 정오각형·15번 정팔각형은 정말 정다각형 — 변·각이 반올림 오차(0.5%) 안에서 같다 · 12번 마름모는 같은 잣대로 각이 다르다 (Codex 58차)', () => {
  const loose = (xs) => xs.every((x) => Math.abs(x - xs[0]) <= 0.005 * xs[0]);
  for (const [no, n] of [[14, 5], [15, 8]]) {
    const P = polysOf(item(U6, no)).shapes[0].pts;
    assert.equal(P.length, n);
    assert.ok(loose(sides(P)), `${no}번 변의 길이가 모두 같다`);
    assert.ok(loose(angles(P)), `${no}번 각의 크기가 모두 같다`);
  }
  assert.ok(!loose(angles(polysOf(item(U6, 12)).shapes[0].pts)), '12번은 각이 다르다');
  // 잣대가 헐겁지 않다 — 정오각형 꼭짓점 하나를 3만큼 옮기면 걸린다
  const bent = polysOf(item(U6, 14)).shapes[0].pts.map((p, i) => (i === 2 ? [p[0] + 3, p[1]] : p));
  assert.ok(!loose(sides(bent)));
});

test('✍️ 직각 표시(rightMarkSvg): 수직인 두 대각선이 만나는 점이 네모의 한 꼭짓점 · 두 끝은 대각선 위 7만큼 · 수직이 아니면 없음 (Codex 58차)', () => {
  const ptsOf = (svg) => /points="([^"]+)"/.exec(svg)[1].split(' ').map((q) => q.split(',').map(Number));
  const onLine = (p, I, d) => Math.abs(cross(sub(p, I), d)) / (len(sub(p, I)) * len(d)) < 0.02;
  const seen = [];
  for (const s of polysOf(item(U6, 19)).shapes) {
    const P = s.pts;
    const svg = rightMarkSvg(P);
    if (!diagsPerp(P)) { assert.equal(svg, '', `${s.label}: 수직이 아니면 표시 없음`); continue; }
    seen.push(s.label);
    const u = sub(P[2], P[0]);
    const v = sub(P[3], P[1]);
    const t = cross(sub(P[1], P[0]), v) / cross(u, v);
    const I = [P[0][0] + u[0] * t, P[0][1] + u[1] * t]; // 두 대각선이 만나는 점 (좌표로 다시 구함)
    const [a, m, b] = ptsOf(svg);
    assert.ok(Math.abs(len(sub(a, I)) - 7) < 0.15 && Math.abs(len(sub(b, I)) - 7) < 0.15, `${s.label}: 두 끝은 만나는 점에서 7`);
    assert.ok(onLine(a, I, u) && onLine(b, I, v), `${s.label}: 두 끝은 각각 다른 대각선 위`);
    assert.ok(len(sub(m, [a[0] + b[0] - I[0], a[1] + b[1] - I[1]])) < 0.15, `${s.label}: 가운데 점은 네모의 맞은편 꼭짓점`);
  }
  assert.deepEqual(seen, ['가', '라'], '정사각형·마름모에만');
  assert.equal(rightMarkSvg(polysOf(item(U6, 17)).shapes[1].pts), '', '사각형이 아니면 없음');
});

test('✍️ 14번 판은 표시된 꼭짓점에서 긋는 선만 받는다 · 15번 판은 어디서나 · 고른 꼭짓점은 aria-pressed · 판 그림은 group (Codex 58차)', () => {
  globalThis.document = { createElementNS: () => ({ setAttribute() {} }) };
  const fakeBoard = (f) => {
    const s = f.shapes[0];
    const hits = s.pts.map((_, i) => ({ dataset: { v: String(i) }, attrs: {}, classList: { toggle() {} }, setAttribute(k, val) { this.attrs[k] = val; } }));
    const svg = { querySelectorAll: () => hits, querySelector: () => ({ appendChild() {} }) };
    // polysEl과 같은 꼴: from은 boardFrom일 때 도형마다 표시된 꼭짓점
    return { hits, board: { pick: null, lines: [new Map()], msg: { textContent: '' }, svgs: [{ svg, P: s.pts }], from: f.boardFrom ? [s.mark] : null } };
  };
  try {
    const f14 = polysOf(item(U6, 14));
    assert.equal(f14.boardFrom, true);
    const { board, hits } = fakeBoard(f14);
    tapVertex(board, f14.shapes, 0, 1);
    assert.equal(hits[1].attrs['aria-pressed'], 'true', '고른 꼭짓점은 눌림');
    tapVertex(board, f14.shapes, 0, 3); // 1-3은 대각선이지만 표시된 꼭짓점(0)이 아니다
    assert.equal(board.lines[0].size, 0);
    assert.match(board.msg.textContent, /표시된 꼭짓점\(●\)에서 긋는 대각선만/);
    assert.equal(hits[1].attrs['aria-pressed'], 'false');
    for (const [p, q] of [[0, 2], [3, 0]]) { tapVertex(board, f14.shapes, 0, p); tapVertex(board, f14.shapes, 0, q); }
    assert.equal(board.lines[0].size, 2);
    assert.equal(board.msg.textContent, '✍️ 표시된 꼭짓점에서 그은 대각선 2개');
    tapVertex(board, f14.shapes, 0, 0);
    tapVertex(board, f14.shapes, 0, 1);
    assert.match(board.msg.textContent, /변이에요/, '이웃이면 변이라고 먼저');
    // 15번 — 어디서나 긋는다
    const f15 = polysOf(item(U6, 15));
    assert.ok(!f15.boardFrom);
    const b15 = fakeBoard(f15).board;
    tapVertex(b15, f15.shapes, 0, 1);
    tapVertex(b15, f15.shapes, 0, 4);
    assert.equal(b15.lines[0].size, 1);
    assert.equal(b15.msg.textContent, '✍️ 그은 대각선 1개');
  } finally {
    delete globalThis.document;
  }
  const cv = read('js/chalview.js');
  assert.ok(cv.includes('from: f.boardFrom ? shapes.map((s) => (Number.isInteger(s.mark) ? s.mark : null)) : null'), '판의 from은 도형마다 표시된 꼭짓점');
  assert.ok(cv.includes('role="group" aria-label="${esc(`${label} — ✍️ 꼭짓점을 눌러 대각선을 그어 보는 판`)}"'), '판 그림은 group — 안의 꼭짓점 단추가 읽힌다');
  assert.ok(cv.includes("${s.mark === i ? ' (표시된 꼭짓점)' : ''}"), '표시된 꼭짓점은 이름에도');
  // 18·19 도형 이름은 "사각형" 그대로 — 이름이 답을 알려 주지 않게
  assert.ok(!/정사각형|직사각형|마름모|사다리꼴/.test(cv.slice(cv.indexOf('const POLY_NAME'), cv.indexOf('function linePairs'))));
});

test('🎯 5단원 LEVEL 2 11·12 풀이 보강 — 💡 한 줄 · 단위 "만 명" · 같은 간격 · 11번 흔한 틀린 한 칸 값', () => {
  const i11 = item(U5, 11);
  const i12 = item(U5, 12);
  assert.ok(i11.idea && i12.idea);
  assert.match(i11.why, /20명이 아니라 20만 명/);
  assert.match(i12.why, /같은 간격/);
  assert.match(notesFor(i11.parts[0], '10')[0].note, /28칸/);
  assert.deepEqual(notesFor(i11.parts[0], '20'), []);
});

test('★ 🎯 풀이 글은 참말만 — 성질을 "그 사각형만"으로 뒤집지 않기 · 그림 하나의 성질은 "이"로 · 쓰기 안내 (Codex 58차)', () => {
  const texts = (it) => [it.idea, it.why, ...it.parts.flatMap((p) => Object.values(p.notes || {}))];
  // 같은 대각선 → 직사각형·정사각형뿐? (등변사다리꼴도 같다) · 수직 → 마름모·정사각형뿐? (다른 사각형도 있다)
  for (const no of [18, 19, 20]) {
    for (const t of texts(item(U6, no))) {
      assert.doesNotMatch(t, /두 대각선의 길이가 같은 사각형은/, `${no}번: 거꾸로 일반화`);
      assert.doesNotMatch(t, /두 대각선이 (서로 )?수직으로 만나는 사각형은/, `${no}번: 거꾸로 일반화`);
    }
  }
  // 평행사변형·직사각형의 대각선이 "수직이 아니다"는 거짓(마름모·정사각형) — "항상 수직인 것은 아니에요"
  const p20 = item(U6, 20).parts[0];
  for (const c of [p20.choices[0], p20.choices[1]]) {
    assert.match(p20.notes[c], /항상 수직인 것은 아니에요/);
    assert.doesNotMatch(p20.notes[c], /수직으로 만나지는 않아요/);
  }
  assert.doesNotMatch(item(U6, 20).why, /수직이 아니고/);
  // 마름모는 정사각형이 아니다? (정사각형도 마름모) — "정사각형이 아닌 마름모처럼"
  assert.match(item(U6, 11).parts[0].notes['㉠'], /정사각형이 아닌 마름모처럼/);
  assert.match(item(U6, 18).parts[0].notes['라'], /이 마름모는/);
  assert.match(item(U6, 19).parts[0].notes['다'], /이 직사각형은/);
  // 눈금선 위에 찍기는 이 문제의 약속 — 꺾은선그래프의 규칙이 아니다
  assert.match(item(U5, 11).idea, /^이 문제에서는/);
  assert.match(notesFor(item(U5, 11).parts[0], '50')[0].note, /이 빈 그래프에는 알맞지 않아요/);
  // 글로 쓰는 문제를 고르기로 바꾼 12·13·16은 연습장에 쓰기 안내
  for (const no of [12, 13, 16]) assert.match(item(U6, no).write || '', /연습장에/, `${no}번 쓰기 안내`);
});

test('🎯 회차 끝 문구: 하나도 못 맞히면 "이미 맞혔던 문제라"가 아니라 다시 해 보자고 (v246 헤드리스)', () => {
  const math = read('js/math.js');
  const f = math.slice(math.indexOf('async function finishChal() {'), math.indexOf('function startSpecial() {'));
  assert.ok(f.includes("correct === 0 ? '이번엔 맞힌 문제가 없어요 — 풀이를 다시 읽고 🎯 계속 풀기로 다시 해 봐요!' : '이미 맞혔던 문제라 보상은 없어요 — 연습은 언제든 좋아요!'"));
});
