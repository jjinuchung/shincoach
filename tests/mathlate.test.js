// ⏰ v257 (2026-10-14, 아버님 "기본안 1~4대로") — 밀린 복습: ① 🌳 줄기 화면에 밀린 수·오래된 줄기 위로 ② ☀️는 줄기와 상관없이
//   가장 오래 기다린 확인부터 ③ 7일 넘게 기다린 확인 통과는 💰+5(하루 3번) ④ 실패가 많은 옛 분수 칸 → 그림으로 배우는 줄기로 잇기
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  STEMS, STEM_ORDER, stemDueList, stemPickOrder, oldestDue, dailyPlan, applyRound, LATE, lateBonus, lateLeft, BRIDGE, bridgeOf, bridgeOffers, KINDS, MIX_CONCEPTS,
} from '../js/mathprog.js';
import { emptyMath, mergeMath, cloneMath } from '../js/db.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const T = '2026-10-14';
const known = (dueAt, o = {}) => ({ done: true, box: 1, dueAt, passes: 1, fails: 0, lastAt: 1, schedAt: 1, ...o });
const RAT = STEMS.ratio.list[0].id;
const DEC = STEMS.decimal.list[0].id;
const pass = { correct: 4, total: 4, missTags: [], qs: KINDS.map((k) => ({ k, ok: 1 })) };
const fail = { correct: 3, total: 4, missTags: [], qs: KINDS.map((k, i) => ({ k, ok: i ? 1 : 0 })) };
/** 분수 앞 다섯 칸은 아는 칸(복습 아님) + frac.div는 9/30부터 · 비율 첫 칸은 10/1부터 · 소수 첫 칸은 오늘 차례 */
function backlog() {
  const m = emptyMath();
  ['frac.mean', 'frac.same', 'frac.mixed', 'frac.equal', 'frac.common'].forEach((id, i) => { m.concepts[id] = known('2099-01-01', { lastAt: 10 + i }); });
  m.concepts['frac.div'] = known('2026-09-30', { box: 0, fails: 3 });
  m.concepts[RAT] = known('2026-10-01');
  m.concepts[DEC] = known(T);
  return m;
}

test('⏰ 줄기마다 밀린 복습 — 오래된 줄기부터 · 며칠 기다렸나 · 🌳 화면 차례는 밀린 줄기 위로, 나머지는 원래 차례', () => {
  const m = backlog();
  assert.deepEqual(stemDueList(m, T), [
    { key: 'fraction', due: 1, oldest: '2026-09-30', late: 14 },
    { key: 'ratio', due: 1, oldest: '2026-10-01', late: 13 },
    { key: 'decimal', due: 1, oldest: T, late: 0 },
  ]);
  const order = stemPickOrder(m, T);
  assert.deepEqual(order.slice(0, 3), ['fraction', 'ratio', 'decimal']);
  assert.deepEqual(order.slice(3), STEM_ORDER.filter((k) => !['fraction', 'ratio', 'decimal'].includes(k)), '나머지는 원래 차례');
  assert.equal(order.length, STEM_ORDER.length);
  assert.deepEqual(stemDueList(emptyMath(), T), []);
  assert.deepEqual(stemPickOrder(emptyMath(), T), STEM_ORDER, '밀린 게 없으면 원래 차례 그대로');
});

test('⏰ ☀️는 줄기와 상관없이 가장 오래 기다린 확인부터 — 다른 줄기면 roundStem으로 · 섞어 풀기·🤔 노트도 그 줄기 · 같은 날이면 지금 줄기 먼저 · 밀린 게 없으면 지금 줄기의 ▶', () => {
  const m = backlog();
  assert.deepEqual(oldestDue(m, T, 'bignum'), { id: 'frac.div', stem: 'fraction', dueAt: '2026-09-30', late: 14 });
  const p = dailyPlan(m, T, 'bignum', 3);
  assert.deepEqual([p.roundId, p.roundMode, p.roundStem, p.late], ['frac.div', 'review', 'fraction', 14]);
  assert.equal(p.mix.length, MIX_CONCEPTS);
  assert.ok(p.mix.every((x) => x.id.startsWith('frac.') && x.id !== 'frac.div'), '섞어 풀기는 개념 편 줄기(분수)의 아는 칸');
  // 🤔 노트도 개념 편 줄기 것 — 지금 줄기(큰 수)가 아니라
  const mn = backlog();
  mn.concepts['frac.mean'].notes = [{ k: 'calc', key: 'N1', d: '2026-10-13', t: 5 }];
  const pn = dailyPlan(mn, T, 'bignum', 3);
  assert.equal(pn.roundStem, 'fraction');
  assert.ok(pn.mix.some((x) => x.note && x.id === 'frac.mean'), '분수 줄기의 🤔 노트가 섞어 풀기에');
  // 같은 날 밀린 두 줄기 — 지금 줄기 먼저
  const m2 = emptyMath();
  m2.concepts['frac.mean'] = known('2026-10-10');
  m2.concepts[RAT] = known('2026-10-10');
  assert.equal(oldestDue(m2, T, 'ratio').id, RAT);
  assert.equal(oldestDue(m2, T, 'fraction').id, 'frac.mean');
  assert.equal(oldestDue(m2, T, 'bignum').stem, 'fraction', '지금 줄기에 없으면 STEM_ORDER 차례');
  // 밀린 게 없으면 — 지금 줄기의 ▶(learn), 줄기는 그대로
  const m3 = emptyMath();
  const p3 = dailyPlan(m3, T, 'ratio', 1);
  assert.deepEqual([p3.roundId, p3.roundMode, p3.roundStem, p3.late], [RAT, 'learn', 'ratio', 0]);
  assert.equal(dailyPlan(m3, T, 'nope', 1).roundStem, 'fraction', '모르는 줄기 이름이면 분수');
});

test('⏰ 확인 편은 며칠 밀렸는지 돌려준다(일정 바꾸기 전 dueAt으로) · 연습·처음 배우기는 0', () => {
  const m = backlog();
  const r = applyRound(m, 'frac.div', pass, T);
  assert.deepEqual([r.review, r.passed, r.late], [true, true, 14]);
  assert.ok(m.concepts['frac.div'].dueAt > T, '일정은 앞으로 옮겨졌다');
  assert.equal(applyRound(m, 'frac.div', pass, T).late, 0, '같은 날 다시 = 연습');
  assert.equal(applyRound(emptyMath(), 'frac.mean', pass, T).late, 0, '처음 배우기');
  assert.equal(applyRound(backlog(), DEC, pass, T).late, 0, '오늘 차례면 0일');
});

test('⏰ 보너스 — 7일 넘게 기다린 확인을 통과하면 💰+5 · 하루 3번까지 · 못 통과·연습·처음·6일은 없음 · 입력을 안 바꾸고 새 객체로 · 다음 날 다시', () => {
  assert.deepEqual(LATE, { days: 7, coin: 5, max: 3 });
  const m = emptyMath();
  const ok = { review: true, passed: true, late: 14 };
  const before = cloneMath(m);
  assert.equal(lateBonus(m, { mode: 'review', result: ok, today: T }), LATE.coin);
  const mid = cloneMath(m); // 얕은 복사 — late를 제자리에서 고치면 복사본도 바뀐다
  for (let i = 1; i < LATE.max; i++) assert.equal(lateBonus(m, { mode: 'review', result: ok, today: T }), LATE.coin);
  assert.deepEqual(mid.late, { d: T, n: 1 }, '하루 횟수는 새 객체로 — 복사본(트랜잭션 전 기록)을 안 바꾼다');
  assert.equal(lateBonus(m, { mode: 'review', result: ok, today: T }), 0, '하루 max번');
  assert.equal(lateLeft(m, T), 0);
  assert.deepEqual(m.late, { d: T, n: LATE.max });
  assert.equal(before.late, undefined, '복사본은 그대로');
  const fresh = () => emptyMath();
  assert.equal(lateBonus(fresh(), { mode: 'review', result: { ...ok, passed: false }, today: T }), 0, '못 통과');
  assert.equal(lateBonus(fresh(), { mode: 'review', result: { ...ok, review: false, practice: true }, today: T }), 0, '연습');
  assert.equal(lateBonus(fresh(), { mode: 'review', result: { ...ok, late: 6 }, today: T }), 0, '6일');
  assert.equal(lateBonus(fresh(), { mode: 'review', result: { ...ok, late: 7 }, today: T }), LATE.coin, '7일부터');
  assert.equal(lateBonus(fresh(), { mode: 'mix', result: ok, today: T }), 0, '섞어 풀기는 개념 편이 아니다');
  assert.equal(lateBonus(fresh(), { mode: 'review', result: ok, today: '' }), 0);
  assert.equal(lateBonus(m, { mode: 'review', result: ok, today: '2026-10-15' }), LATE.coin, '다음 날은 다시');
  assert.deepEqual(m.late, { d: '2026-10-15', n: 1 });
  // 실제 확인 편 결과로
  const b = backlog();
  const res = applyRound(b, 'frac.div', pass, T);
  assert.equal(lateBonus(b, { mode: 'review', result: res, today: T }), LATE.coin);
  const b2 = backlog();
  assert.equal(lateBonus(b2, { mode: 'review', result: applyRound(b2, 'frac.div', fail, T), today: T }), 0, '틀리면 없음');
});

test('⏰ 시계를 되돌리거나 미래 날짜 기록이 들어와도 이미 쓴 날의 횟수가 다시 열리지 않는다 — 적힌 날이 오늘보다 뒤면 0, 기록은 그대로 (Codex 68차 #3)', () => {
  const ok = { review: true, passed: true, late: 14 };
  const T1 = '2026-10-15';
  const m = emptyMath();
  for (let i = 0; i < LATE.max; i++) lateBonus(m, { mode: 'review', result: ok, today: T });
  assert.equal(lateBonus(m, { mode: 'review', result: ok, today: T1 }), LATE.coin, '다음 날 하나');
  assert.deepEqual(m.late, { d: T1, n: 1 });
  // 시계를 오늘(T)로 되돌림 — 이미 다 쓴 날인데 날짜가 달라 다시 열리던 길
  assert.equal(lateLeft(m, T), 0);
  assert.equal(lateBonus(m, { mode: 'review', result: ok, today: T }), 0);
  assert.deepEqual(m.late, { d: T1, n: 1 }, '뒤 날짜 기록은 그대로');
  // 미래 날짜 기록이 합쳐져 들어온 뒤 바른 날짜로 — 이 날은 받을 수 없지만 기록도 안 바뀐다
  const fut = mergeMath(emptyMath(), { ...emptyMath(), late: { d: '2026-10-20', n: 1 } });
  assert.equal(lateLeft(fut, T), 0);
  assert.equal(lateBonus(fut, { mode: 'review', result: ok, today: T }), 0);
  assert.deepEqual(fut.late, { d: '2026-10-20', n: 1 });
  assert.equal(lateLeft(fut, '2026-10-21'), LATE.max, '그 날이 지나면 다시');
});

test('⏰ 두 기기 합치기 — 하루 횟수는 늦은 날짜 쪽, 같은 날이면 큰 횟수(옛 백업으로 되돌려 더 받지 않게)', () => {
  const a = { ...emptyMath(), late: { d: T, n: 3 } };
  const b = { ...emptyMath(), late: { d: T, n: 1 } };
  assert.deepEqual(mergeMath(a, b).late, { d: T, n: 3 });
  assert.deepEqual(mergeMath(b, a).late, { d: T, n: 3 });
  const old = { ...emptyMath(), late: { d: '2026-10-13', n: 3 } };
  assert.deepEqual(mergeMath(b, old).late, { d: T, n: 1 }, '옛 날짜는 오늘 횟수를 못 바꾼다');
  assert.deepEqual(mergeMath(old, b).late, { d: T, n: 1 });
  assert.deepEqual(mergeMath(emptyMath(), a).late, { d: T, n: 3 });
});

test('📚 그림 배움 줄기로 잇기 — 옛 분수 칸 여섯 · 오늘 확인 차례이거나 실패가 더 많은 칸만 · 그 줄기는 그림 배움(lesson) 줄기', () => {
  assert.deepEqual(BRIDGE, { 'frac.add': 'fracadd', 'frac.mulnat': 'fracmul', 'frac.mul': 'fracmul', 'frac.divnat': 'fracdiv', 'frac.div': 'fracdiv', 'mix.frac': 'fracmul' });
  for (const [id, key] of Object.entries(BRIDGE)) {
    assert.equal(bridgeOf(id), key);
    assert.ok(STEMS[key].lesson, `${key}는 한 장씩 배우는 줄기`);
    assert.ok(STEMS.fraction.list.some((c) => c.id === id) || STEMS.mixed.list.some((c) => c.id === id), `${id}는 있는 칸`);
  }
  for (const x of ['frac.mean', 'constructor', '', undefined]) assert.equal(bridgeOf(x), null);
  const m = backlog();
  m.concepts['frac.mul'] = known('2099-01-01', { box: 2, passes: 2, fails: 5 }); // 차례는 아니지만 실패가 더 많다
  m.concepts['frac.add'] = known('2099-01-01', { box: 2, passes: 4, fails: 1 }); // 잘 하는 칸
  assert.deepEqual(bridgeOffers(m, T, 'fraction'), [{ key: 'fracmul', from: ['frac.mul'] }, { key: 'fracdiv', from: ['frac.div'] }]);
  assert.deepEqual(bridgeOffers(m, T, 'ratio'), [], '다른 줄기 사다리에는 없다');
  m.concepts['mix.frac'] = known('2099-01-01', { passes: 2, fails: 14 });
  assert.deepEqual(bridgeOffers(m, T, 'mixed'), [{ key: 'fracmul', from: ['mix.frac'] }]);
});

test('⏰📚 화면 배선 — ☀️는 고른 줄기로 옮겨 연다 · 🌳 화면은 stemPickOrder·밀린 수 · ⏰ 보너스는 저장 트랜잭션 안에서 정하고 💰에 더함 · 못 통과한 편에 📚 단추 · sw', () => {
  const src = read('js/math.js');
  const sd = src.slice(src.indexOf("function startDaily(from = 'ladder') {"), src.indexOf('\n}\n', src.indexOf("function startDaily(from = 'ladder') {"))); // v331 — 누른 곳(from)을 받는다
  assert.ok(sd.indexOf('ui.stem = plan.roundStem') > 0 && sd.indexOf('ui.stem = plan.roundStem') < sd.indexOf('startRound(plan.roundId'), '편을 열기 전에 줄기부터 옮긴다(G가 그 줄기 것)');
  const pk = src.slice(src.indexOf('function renderStemPicker(state) {'), src.indexOf('\n}\n', src.indexOf('function renderStemPicker(state) {')));
  assert.ok(pk.includes('for (const key of stemPickOrder(state, today))') && pk.includes("b.addEventListener('click', () => openStem(state, key));"));
  // v260 아버님: 🌳 화면에 얼마나 했고·남았고·며칠 밀렸는지 쓰지 않는다(압박) — 차례만 밀린 줄기가 위
  assert.ok(!/stemDueList|개를 알아요|다시 확인 \$\{|일 지난|기다려요|오늘 차례/.test(pk), '🌳 화면에 셈·밀린 날 말이 없다');
  const fin = src.slice(src.indexOf('lucky = luckyCatch(s, {'), src.indexOf('} catch (err) {', src.indexOf('lucky = luckyCatch(s, {')));
  assert.ok(fin.includes('lateCoin = lateBonus(s, { mode: r.mode, result, today });'), '보너스는 개념 편 저장 트랜잭션 안');
  assert.ok(src.includes('rw.coin += lateCoin;'));
  assert.ok(src.includes('const bk = !all ? bridgeOf(r.id) : null;') && src.includes("if (bk) card.appendChild(bridgeBtn(state, bk, '그림으로 다시 배우기'));"));
  assert.ok(src.includes('for (const bo of bridgeOffers(state, today, ui.stem))'), '사다리 위 📚');
  // Codex 68차 #1: 아이가 직접 다른 줄기를 열면 ☀️ 흐름을 끝낸다 — 📏 진단 안내는 renderLadder를 안 지나, 남은 흐름이 🎒 뒤에 섞어 풀기를 열었다
  const os = src.slice(src.indexOf('function openStem(state, key) {'), src.indexOf('\n}\n', src.indexOf('function openStem(state, key) {')));
  assert.ok(os.indexOf('ui.daily = null;') > 0 && os.indexOf('ui.daily = null;') < os.indexOf('renderDiagIntro()'), '진단 안내를 그리기 전에');
  // Codex 68차 #4의 규칙 말(🌳 위 한 줄)은 v260에 셈·밀린 날 말과 함께 뺐다 — ☀️ 미리 보기는 보너스를 받을 수 있을 때만 "(통과하면 ⏰ 💰+5)"
  assert.ok(src.includes("const wait = preview.roundMode === 'review' && preview.late >= LATE.days && lateLeft(state, today)\n        ? ` (통과하면 ⏰ 💰+${LATE.coin})` : '';") || src.includes("const wait = preview.roundMode === 'review' && preview.late >= LATE.days && lateLeft(state, today)\r\n        ? ` (통과하면 ⏰ 💰+${LATE.coin})` : '';"));
  assert.ok(!/일 넘게 기다린|일 기다림`|일 기다린 확인을 통과/.test(src), '"넘게·기다린" 말은 없다');
  assert.ok(+(/const CACHE_VERSION = 'v(\d+)';/.exec(read('sw.js')) || [])[1] >= 257);
});
