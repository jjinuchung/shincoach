// v354 ⚡ 3문제 한 판 (2026-10-28 아버님 「추천대로」) — 수학을 다시 켜게: 아는 칸 셋에서 한 문제씩 · 처음 답 셋 다 맞히면 🎯 1 · 하루 3번까지
// 문제 고르기(quickPlan — 4학년 먼저 · 6학년·중1 안 냄 · 🥚 뺌) · 하루 판정(quickRule — 시계가 뒤로 가도 한 번) · 저장(quickCommit — 수학 기록·프로필 한 트랜잭션) · 병합 · 연습 기록 · 📤 줄 · 홈 카드 · 화면 배선
// node --test tests/quick354.test.js
import { fakeIdb } from './fakeidb.js'; // ★ db.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  QUICK, quickPlan, quickLeft, quickRule, quickCommit, quickReport, applyMixRound, tallyRound, stoneReward, roundCatches,
  mathReportText, gradeOf, STEMS, STEM_ORDER, REST_GRADE, SCHOOL_GRADE, RELEARN_MODES, REWARD,
} from '../js/mathprog.js';
import { GRADUATED } from '../js/review.js';
import { emptyMath, cloneMath, mergeMath, updateMath, getMath, emptyProfile } from '../js/db.js';
import { cardSubject } from '../js/home.js';
import { initProfile, flushProfile, reloadProfile, commitChalRound } from '../js/xp.js';

void fakeIdb;
const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const TODAY = '2026-10-28';
/** 학년마다 칸 id (줄기 차례대로) */
const byGrade = {};
for (const k of STEM_ORDER) for (const c of (STEMS[k] ? STEMS[k].list : [])) (byGrade[gradeOf(c.id)] = byGrade[gradeOf(c.id)] || []).push(c.id);
const G = (g, i) => byGrade[g][i];
const known = (lastAt = 1, extra = {}) => ({ done: true, box: 1, lastAt, kinds: {}, ...extra });
const mathOf = (concepts) => ({ ...emptyMath(), concepts });
/** 씨앗 → 0 이상 1 미만 */
const seeded = (s) => { let x = (s * 2654435761) >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };

test('⚡ 값: 3문제 · 하루 🎯 3번 · 그날 처음 끝낸 판 💰10 · 학년 줄(지금 4학년 · 6학년부터 쉼)', () => {
  assert.deepEqual(QUICK, { n: 3, catchMax: 3, coin: 10 });
  assert.equal(SCHOOL_GRADE, 4);
  assert.equal(REST_GRADE, 6);
  for (const g of [4, 5, 6, 7]) assert.ok((byGrade[g] || []).length >= 3, `${g}학년 칸이 셋 이상 (시험 재료)`);
  assert.ok(Object.keys(byGrade).every((g) => Number(g) >= 4), '지금 줄기엔 3학년 이하 칸이 없다 — 생기면 4학년 다음 무리(quickTier 1)');
  assert.ok(RELEARN_MODES.has('quick'), '틀리면 📚 배움 한 장');
});

test('⚡ quickPlan: 아는 칸(🐣·👑·📏)만 · 🥚 배우는 중·안 배운 칸은 뺌 · 셋이 안 되면 [] · 얼굴은 ⭐ 특별 없이', () => {
  assert.deepEqual(quickPlan(null), []);
  assert.deepEqual(quickPlan(mathOf({ [G(4, 0)]: known(), [G(4, 1)]: known() })), [], '둘이면 단추 없음');
  const m = mathOf({
    [G(4, 0)]: known(5),
    [G(4, 1)]: known(6, { box: GRADUATED }),          // 👑
    [G(4, 2)]: known(7, { box: 1, placed: true }),     // 📏
    [G(4, 3)]: { done: true, box: 0, lastAt: 1 },      // 🥚 배우는 중
    [G(4, 4)]: { done: false, lastAt: 1 },             // 안 배움
    X999: known(1),                                    // 줄기에 없는 칸
  });
  const p = quickPlan(m, 7);
  assert.deepEqual(p.map((x) => x.id).sort(), [G(4, 0), G(4, 1), G(4, 2)].sort());
  for (const x of p) {
    assert.deepEqual([...x.kinds].sort(), ['calc', 'misread', 'why']);
  }
  assert.deepEqual(quickPlan(m, 7), p, '같은 씨앗이면 같은 판');
});

test('⚡ quickPlan: 4학년 칸 먼저 → 5학년 · 6학년·중1은 🌱 꺼져 있어도 안 냄 · 같은 무리는 오래 안 본 칸부터', () => {
  const m = mathOf({
    [G(6, 0)]: known(1), [G(6, 1)]: known(1), [G(7, 0)]: known(1),   // 가장 오래됐어도 6학년·중1은 안 냄
    [G(5, 0)]: known(2), [G(5, 1)]: known(3),
    [G(4, 0)]: known(50), [G(4, 1)]: known(40), [G(4, 2)]: known(90),
  });
  m.rest = { on: false, at: 1 };
  assert.deepEqual(quickPlan(m, 1).map((x) => x.id).sort(), [G(4, 0), G(4, 1), G(4, 2)].sort(), '5학년이 더 오래됐어도 4학년 셋');
  delete m.concepts[G(4, 2)];
  assert.deepEqual(quickPlan(m, 1).map((x) => x.id).sort(), [G(4, 0), G(4, 1), G(5, 0)].sort(), '그다음 5학년 중 오래 안 본 것');
  const four = mathOf(Object.fromEntries(byGrade[4].slice(0, 5).map((id, i) => [id, known(100 - i)])));
  assert.deepEqual(quickPlan(four, 3).map((x) => x.id).sort(), byGrade[4].slice(2, 5).sort(), '같은 무리 — lastAt이 작은(오래된) 셋');
  assert.deepEqual(quickPlan(mathOf({ [G(6, 0)]: known(), [G(7, 0)]: known(), [G(6, 1)]: known() })), [], '6학년·중1뿐이면 단추 없음');
});

test('⚡ quickPlan 무작위 기록 2000개: 늘 셋 또는 없음 · 6학년·중1·🥚·안 배운 칸이 안 나옴 · 칸이 겹치지 않음 · 더 낮은 무리를 두고 높은 무리를 고르지 않음', () => {
  const ids = Object.values(byGrade).flat();
  const tier = (id) => (gradeOf(id) === 4 ? 0 : gradeOf(id) < 4 ? 1 : 2);
  for (let s = 1; s <= 2000; s++) {
    const r = seeded(s);
    const concepts = {};
    const n = Math.floor(r() * 14);
    for (let i = 0; i < n; i++) {
      const id = ids[Math.floor(r() * ids.length)];
      const kind = Math.floor(r() * 5);
      concepts[id] = kind === 0 ? { done: false, lastAt: 1 } : kind === 1 ? { done: true, box: 0, lastAt: Math.floor(r() * 99) } : known(Math.floor(r() * 99), kind === 3 ? { box: GRADUATED } : kind === 4 ? { placed: true } : {});
    }
    const p = quickPlan(mathOf(concepts), s);
    const ok = Object.entries(concepts).filter(([id, v]) => v.done && (v.box || 0) >= 1 && gradeOf(id) > 0 && gradeOf(id) < REST_GRADE).map(([id]) => id);
    if (ok.length < QUICK.n) { assert.deepEqual(p, [], `씨앗 ${s}`); continue; }
    assert.equal(p.length, QUICK.n, `씨앗 ${s}`);
    assert.equal(new Set(p.map((x) => x.id)).size, QUICK.n);
    for (const x of p) assert.ok(ok.includes(x.id), `씨앗 ${s} 낼 수 없는 칸 ${x.id}`);
    const worst = Math.max(...p.map((x) => tier(x.id)));
    const left = ok.filter((id) => !p.some((x) => x.id === id));
    assert.ok(left.every((id) => tier(id) >= worst), `씨앗 ${s} 낮은 무리를 두고 높은 무리`);
  }
});

test('⚡ quickRule: 그날 처음 끝낸 판만 💰10 · 셋 다 맞으면 🎯 · 하루 3번까지 · 다음 날 다시 · 입력의 quick을 바꾸지 않고 새 객체', () => {
  const m = mathOf({});
  assert.equal(quickLeft(m, TODAY), 3);
  assert.deepEqual(quickRule(m, TODAY, false), { first: true, catch: 0, coin: 10 });
  assert.deepEqual(m.quick, { d: TODAY, n: 1, c: 0 });
  const got = [];
  for (let i = 0; i < 5; i++) got.push(quickRule(m, TODAY, true));
  assert.deepEqual(got.map((x) => x.catch), [1, 1, 1, 0, 0], '🎯는 하루 3번');
  assert.ok(got.every((x) => !x.first && x.coin === 0), '💰10은 그날 처음 판만');
  assert.deepEqual(m.quick, { d: TODAY, n: 6, c: 3 });
  assert.equal(quickLeft(m, TODAY), 0);
  assert.equal(quickLeft(m, '2026-10-29'), 3, '다음 날 다시');
  const old = m.quick;
  const c = cloneMath(m);
  assert.deepEqual(quickRule(c, '2026-10-29', true), { first: true, catch: 1, coin: 10 });
  assert.deepEqual(old, { d: TODAY, n: 6, c: 3 }, '얕은 복사 입력을 건드리지 않음');
  // 깨진 값은 0으로
  const b = mathOf({}); b.quick = { d: TODAY, n: 'x', c: -4 };
  assert.deepEqual(quickRule(b, TODAY, true), { first: true, catch: 1, coin: 10 });
});

test('⚡ 시계가 뒤로 (🔍 Codex 159차 #1): 28일에 🎯를 다 받고 27일로 가도 🎯·💰10 없음 · 장부는 28일 그대로 · 28일로 돌아와도 더 없음 · 29일엔 다시', () => {
  const Y = '2026-10-27';
  const m = mathOf({});
  for (let i = 0; i < 3; i++) quickRule(m, TODAY, true);
  assert.deepEqual(m.quick, { d: TODAY, n: 3, c: 3 });
  assert.equal(quickLeft(m, Y), 0, '앞날 장부 — 단추·홈 줄은 연습 쪽');
  assert.deepEqual(quickRule(m, Y, true), { first: false, catch: 0, coin: 0 });
  assert.deepEqual(m.quick, { d: TODAY, n: 3, c: 3 }, '장부를 27일로 되돌리지 않는다');
  assert.deepEqual(quickRule(m, TODAY, true), { first: false, catch: 0, coin: 0 }, '28일로 돌아와도 그날 받은 그대로');
  assert.deepEqual(m.quick, { d: TODAY, n: 4, c: 3 });
  assert.equal(quickReport(m, Y), '⚡ 3문제 한 판 (최근 7일): 0판 · 다 맞힘 0 · 오늘 🎯 없음(장부 날짜 2026-10-28가 오늘보다 뒤 — 태블릿 시계 확인)', '📤에는 까닭을');
  assert.deepEqual(quickRule(m, '2026-10-29', true), { first: true, catch: 1, coin: 10 }, '다음 날엔 다시');
  // 🎯를 못 받은 앞날 장부도 — 그날 첫 판 💰10은 이미 받았다
  const z = mathOf({});
  quickRule(z, TODAY, false);
  assert.deepEqual(quickRule(z, Y, true), { first: false, catch: 0, coin: 0 });
  assert.deepEqual(z.quick, { d: TODAY, n: 1, c: 0 });
});

test('⚡ quickCommit: 연습 기록 + 하루 판정 + 🎯 예약 + 보상(문항 정답 · 💪 고침 · 그날 첫 판 💰10) · 처음 답 셋 다일 때만 🎯', () => {
  const ids = [G(4, 0), G(4, 1), G(4, 2)];
  const m = mathOf(Object.fromEntries(ids.map((id, i) => [id, known(i + 1)])));
  const qs = (oks) => ids.map((id, i) => ({ id, key: `k${i}`, k: 'calc', ok: oks[i] }));
  const a = quickCommit(m, qs([1, 0, 1]), TODAY, { correct: 2, fixed: 1 });
  assert.deepEqual([a.result.perfect, a.result.quick.catch, a.result.quick.first], [false, 0, true]);
  assert.deepEqual(a.reward, { xp: 2 * REWARD.q.xp + REWARD.fix.xp, coin: 2 * REWARD.q.coin + QUICK.coin, items: {} });
  assert.equal((m.throws && m.throws.earned) || 0, 0);
  const b = quickCommit(m, qs([1, 1, 1]), TODAY, { correct: 3 });
  assert.deepEqual([b.result.perfect, b.result.quick.catch], [true, 1]);
  assert.deepEqual(b.reward, { xp: 3 * REWARD.q.xp, coin: 3 * REWARD.q.coin, items: {} }, '💰10은 그날 첫 판만');
  assert.equal(m.throws.earned, 1, '🎯는 같은 기록에 예약');
  assert.deepEqual([m.log.length, m.log[1].mode], [2, 'quick']);
  const two = quickCommit(mathOf({ [ids[0]]: known(), [ids[1]]: known() }), qs([1, 1, 1]).slice(0, 2), TODAY, { correct: 2 });
  assert.equal(two.result.perfect, false, '문제가 셋이 아니면 다 맞힘이 아니다');
});

let profReady = false;
async function seedQuick(quick) {
  if (!profReady) { await initProfile(); profReady = true; }
  await flushProfile();
  const cur = fakeIdb.get('profile', 'me') || emptyProfile();
  fakeIdb.put('profile', { ...cur, coins: 0, coinsEarned: 0, id: 'me', updatedAt: (cur.updatedAt || 0) + 1 });
  await reloadProfile();
  await updateMath((s) => {
    s.concepts = { [G(4, 0)]: known(1), [G(4, 1)]: known(2), [G(4, 2)]: known(3) };
    s.log = [];
    s.throws = { earned: 0, used: 0, refunded: 0 };
    if (quick) s.quick = { d: TODAY, ...quick }; else delete s.quick;
  });
}
const allRight = () => [G(4, 0), G(4, 1), G(4, 2)].map((id, i) => ({ id, key: `k${i}`, k: 'calc', ok: 1 }));
const commitQuick = () => commitChalRound((s2) => quickCommit(s2, allRight(), TODAY, { correct: 3 }));
const earned = (m) => (m.throws && m.throws.earned) || 0;

test('★ ⚡ 저장 한 번에 (🔍 Codex 159차 #2 · 가짜 IndexedDB): 프로필 쓰기가 깨지면 기록·🎯·💰가 다 없던 일 · 💾 다시 저장하면 💰10과 🎯가 한 번씩', async () => {
  await seedQuick(null);
  fakeIdb.failNext('profile');
  const bad = await commitQuick();
  assert.equal(bad.ok, false);
  const m0 = await getMath();
  assert.deepEqual([m0.quick, m0.log.length, earned(m0), fakeIdb.get('profile', 'me').coins], [undefined, 0, 0, 0], '「첫 판」 표시만 남고 💰10이 날아가지 않는다');
  const ok = await commitQuick();
  assert.ok(ok.ok);
  assert.deepEqual(ok.reward, { xp: 3 * REWARD.q.xp, coin: 3 * REWARD.q.coin + QUICK.coin, items: {} });
  const m1 = await getMath();
  assert.deepEqual([m1.quick, m1.log.length, earned(m1)], [{ d: TODAY, n: 1, c: 1 }, 1, 1]);
  assert.equal(fakeIdb.get('profile', 'me').coins, 3 * REWARD.q.coin + QUICK.coin, '💰는 같은 트랜잭션에서 프로필에');
  const next = await commitQuick();
  assert.deepEqual([next.reward.coin, next.result.quick.catch], [3 * REWARD.q.coin, 1], '두 번째 판은 💰10 없이');
});

test('★ ⚡ 두 창이 같이 끝내도 (가짜 IndexedDB): 오늘 🎯가 하나 남았으면 한 창만 🎯 · 💰10도 한 창만', async () => {
  await seedQuick({ n: 2, c: 2 });
  const [a, b] = await Promise.all([commitQuick(), commitQuick()]);
  assert.ok(a.ok && b.ok);
  assert.deepEqual([a.result.quick.catch, b.result.quick.catch].sort(), [0, 1]);
  const m = await getMath();
  assert.deepEqual([m.quick, earned(m)], [{ d: TODAY, n: 4, c: 3 }, 1]);
  await seedQuick(null);
  const [c, d] = await Promise.all([commitQuick(), commitQuick()]);
  assert.deepEqual([c.reward.coin, d.reward.coin].sort((x, y) => x - y), [3 * REWARD.q.coin, 3 * REWARD.q.coin + QUICK.coin], '💰10은 한 창만');
  assert.equal(fakeIdb.get('profile', 'me').coins, 6 * REWARD.q.coin + QUICK.coin);
});

test('⚡ 병합: 늦은 날 쪽 · 같은 날은 판·🎯 칸마다 큰 쪽(옛 백업으로 🎯를 되돌려 더 받지 않게) · 입력을 바꾸지 않음', () => {
  const a = mathOf({}); a.quick = { d: TODAY, n: 2, c: 1 };
  const b = mathOf({}); b.quick = { d: TODAY, n: 1, c: 3 };
  assert.deepEqual(mergeMath(a, b).quick, { d: TODAY, n: 2, c: 3 });
  assert.deepEqual(mergeMath(b, a).quick, { d: TODAY, n: 2, c: 3 });
  const y = mathOf({}); y.quick = { d: '2026-10-27', n: 9, c: 3 };
  assert.deepEqual(mergeMath(a, y).quick, { d: TODAY, n: 2, c: 1 }, '어제 것은 오늘을 못 덮음');
  assert.deepEqual(mergeMath(y, a).quick, { d: TODAY, n: 2, c: 1 });
  assert.deepEqual(mergeMath(mathOf({}), a).quick, { d: TODAY, n: 2, c: 1 });
  assert.equal(mergeMath(mathOf({}), mathOf({})).quick, undefined);
  assert.deepEqual(a.quick, { d: TODAY, n: 2, c: 1 });
  assert.deepEqual(b.quick, { d: TODAY, n: 1, c: 3 });
});

test('⚡ 기록: 섞어 풀기와 같은 연습(칸·복습 날짜 그대로 · lastAt만) · 일지 id mix · mode quick · 🎟️·🔷·개념 편 🎯 없음', () => {
  const id = G(4, 0);
  const m = mathOf({ [id]: { done: true, box: 2, dueAt: '2026-11-01', schedAt: 5, lastAt: 1, kinds: {} } });
  const res = applyMixRound(m, [{ id, key: 'k1', k: 'calc', ok: 1 }], TODAY, 'quick');
  assert.deepEqual(res, { ok: 1, total: 1 });
  const rec = m.concepts[id];
  assert.deepEqual([rec.box, rec.dueAt, rec.schedAt], [2, '2026-11-01', 5]);
  assert.ok(rec.lastAt > 1);
  const e = m.log[m.log.length - 1];
  assert.deepEqual([e.id, e.mode, e.ok, e.n], ['mix', 'quick', 1, 1]);
  applyMixRound(m, [{ id, key: 'k2', k: 'calc', ok: 1 }], TODAY);
  assert.equal(m.log[m.log.length - 1].mode, 'mix', '섞어 풀기는 그대로');
  assert.deepEqual(tallyRound(m, { mode: 'quick', correct: 3, result: { ok: 3, total: 3 } }), { ok: 0, rev: 0 });
  assert.equal(stoneReward({ mode: 'quick', result: { ok: 3, total: 3, passed: true } }), 0);
  assert.equal(roundCatches({ mode: 'quick', result: { passed: true, first: true }, inDaily: true }), 0, '🎯는 quickRule만');
});

test('⚡ 📤 줄: 최근 7일 판·다 맞힘·오늘 🎯 · 일지 줄 이름 「⚡3문제」', () => {
  const id = G(4, 0);
  const m = mathOf({ [id]: known(1) });
  assert.equal(quickReport(m, TODAY), '⚡ 3문제 한 판 (최근 7일): 아직 없음');
  m.log = [
    { d: '2026-10-20', id: 'mix', mode: 'quick', ok: 3, n: 3 },          // 8일 전 — 안 셈
    { d: '2026-10-21', id: 'mix', mode: 'quick', ok: 3, n: 3 },          // 7일 전 — 「최근 7일」은 오늘 포함 일곱 날이라 안 셈
    { d: '2026-10-30', id: 'mix', mode: 'quick', ok: 3, n: 3 },          // 앞날(시계·병합) — 안 셈
    { d: '2026-10-22', id: 'mix', mode: 'quick', ok: 3, n: 3 },
    { d: TODAY, id: 'mix', mode: 'quick', ok: 2, n: 3 },
    { d: TODAY, id: 'mix', mode: 'mix', ok: 3, n: 3 },                   // 섞어 풀기 — 안 셈
  ];
  m.quick = { d: TODAY, n: 1, c: 0 };
  assert.equal(quickReport(m, TODAY), '⚡ 3문제 한 판 (최근 7일): 2판 · 다 맞힘 1 · 오늘 🎯 0/3');
  const txt = mathReportText(m, TODAY);
  assert.ok(txt.includes('⚡ 3문제 한 판 (최근 7일): 2판'));
  assert.ok(txt.includes(`${TODAY} ⚡3문제 quick 2/3`) && txt.includes(`${TODAY} 🎲섞어풀기 mix 3/3`));
});

test('⚡ 홈 수학 카드: 🎯를 더 받을 수 있으면 「⚡ 3문제 — 다 맞히면 🎯」 · 📬 답장 줄이 먼저 · 아니면 원래 설명', () => {
  const s = { key: 'math', desc: '분수부터 차근차근' };
  assert.equal(cardSubject(s, { quick: true }).desc, '⚡ 3문제 — 다 맞히면 🎯');
  assert.equal(cardSubject(s, { quick: true, unread: 2 }).desc, '📬 아빠 답장 2개 — 먼저 읽어요');
  assert.equal(cardSubject(s, {}).desc, '분수부터 차근차근');
  assert.equal(cardSubject({ key: 'korean', desc: '글' }, { quick: true }).desc, '글', '수학 카드에만');
  const h = read('js/home.js');
  assert.ok(h.includes('quick = quickPlan(m, 0).length >= QUICK.n && quickLeft(m, todayKey()) > 0;'));
});

test('⚡ 저장소 왕복(가짜 IndexedDB): 한 트랜잭션에서 판·🎯 · 같은 날 네 번째 다 맞힘은 🎯 없음', async () => {
  await updateMath((s) => { s.concepts = { [G(4, 0)]: known(1), [G(4, 1)]: known(2), [G(4, 2)]: known(3) }; delete s.quick; });
  const got = [];
  for (let i = 0; i < 4; i++) await updateMath((s) => { got.push(quickRule(s, TODAY, true).catch); });
  assert.deepEqual(got, [1, 1, 1, 0]);
  const m = await getMath();
  assert.deepEqual(m.quick, { d: TODAY, n: 4, c: 3 });
  assert.equal(quickPlan(m, 0).length, 3);
});

test('⚡ 화면 배선: 사다리 ☀️ 아래 단추 · ☀️ 흐름 밖 · 판정은 저장 트랜잭션 · 끝 카드(🟢 셀 · 한 판 더) · 아이 화면에 셈 문구 없음 · sw v354', () => {
  const src = read('js/math.js');
  const body = (head) => { const i = src.indexOf(head); assert.ok(i >= 0, head); return src.slice(i, src.indexOf('\n}\n', i)); };
  assert.ok(src.includes('const qb = quickButton(state, today);') && src.indexOf('const qb = quickButton(state, today);') < src.indexOf('head.appendChild(puzzleButton(puzzleCtx()));'), '☀️ 아래 · 🧩 위');
  const start = body('function startQuickRound() {');
  assert.ok(start.includes('if (qs.length < QUICK.n) { renderLadder(ui.state); return; }'), '셋이 안 만들어지면 판을 안 연다');
  assert.ok(start.includes('ui.daily = null;') && start.includes("mode: 'quick'"));
  const fin = body('async function finishRound() {');
  const qb = fin.slice(fin.indexOf("} else if (r.mode === 'quick') {"), fin.indexOf("} else if (r.mode === 'notes' || r.mode === 'mix') {"));
  assert.ok(qb.includes('const c = await commitChalRound((s2) => quickCommit(s2, qs, today, { correct: r.correct, fixed: r.fixed || 0 }));') && qb.includes("if (!c.ok) throw new Error('⚡ 기록을 저장하지 못했어요');"), '기록·판정·🎯·💰는 수학 기록·프로필 한 트랜잭션 (Codex 159차 #2) · 실패면 💾 다시 저장');
  assert.ok(qb.includes('spReward = c.reward;') && !qb.includes('updateMath(') && !qb.includes('gainCoins'), '보상은 트랜잭션이 이미 줬다');
  const rq = fin.slice(fin.indexOf(": r.mode === 'quick'\n"), fin.indexOf(": r.mode === 'notes' || r.mode === 'mix'\n"));
  assert.ok(rq.includes("? { xp: (spReward && spReward.xp) || 0, coin: (spReward && spReward.coin) || 0, catchOnce: false, paid: true }") && fin.includes('if (!rw.paid) rw.xp += (r.fixed || 0) * REWARD.fix.xp;'), '화면에서 두 번 주지 않는다(💪 고침 ⚡도)');
  assert.ok(read('js/mathprog.js').includes('result.perfect = result.total === QUICK.n && result.ok === QUICK.n;'), '처음 답 셋 다');
  assert.ok(!qb.includes('tallyRound') && !qb.includes('markDaily'), '🎟️·☀️ 완주에 안 셈');
  assert.ok(fin.includes("if (r.mode === 'quick') {\n    renderQuickDone(state, r, { g, c, result, catches: rw.catches });"));
  const kid = [body('function quickButton(state, today) {'), body('function renderQuickDone(state, r, { g, c, result, catches }) {')].join('\n');
  assert.ok(kid.includes("addCell(card, 'math', { live: () => card.isConnected });"), '🟢 셀');
  assert.ok(!/\d+\s*\/\s*\d+|\}\s*\/\s*\$\{|\d+\s*\/\s*\$\{|\}\s*\/\s*\d+|남은|남았|번째|개 중|몇 번|catchMax|quickLeft\([^)]*\)\s*\}/.test(kid.replace(/⚡\+\$\{g\.gained\} 💰\+\$\{c\}/, '').replace(/quickLeft\(state, today\) > 0/g, '')), '셈 문구 없음 — 숫자/숫자 · 값/값 · 남은 🎯 수');
  assert.ok(kid.includes("'오늘 🎯는 다 받았어요 — 지금은 연습이에요 (⚡💰)'"));
  assert.ok(kid.includes("${quickLeft(state, today) > 0 ? ' 셋 다 맞히면 🎯예요.' : ''}"), '오늘 🎯를 다 받았으면 틀린 판 끝에 🎯를 약속하지 않는다');
  // 강조 단추는 맞고 틀림과 상관없이 (Codex 159차 #3) — 🎯가 남았으면 [⚡ 한 판 더], 다 받았으면 [사다리로]
  const done = body('function renderQuickDone(state, r, { g, c, result, catches }) {');
  assert.ok(done.includes("el('button', `btn btn-big-wide${left ? ' btn-primary' : ''}`, left ? '⚡ 한 판 더' : '⚡ 한 판 더 (연습)')") && done.includes("el('button', `btn btn-big-wide${more && left ? '' : ' btn-primary'}`, '사다리로')"));
  assert.ok(!/btn-big-wide\$\{perfect/.test(done), '다 맞힘 여부로 강조를 바꾸지 않는다');
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(read('sw.js')) || [])[1]) >= 354);
});
