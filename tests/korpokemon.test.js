// 📚 국어 전용 포켓몬 150 + 🎯 국어 잡기 기회 (2026-10-11, 아버님 "국어에서만 나오는 포켓몬 흔함부터 전설까지 수학 비율처럼 150마리")
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ROSTER, subjectOf, forSubject, forPuzzle } from '../js/pokemon.js';
import { RARITY_IDS, initProfile, flushProfile, reloadProfile, korTakeThrow, korGiveBackThrow, korThrowsLeft, korFinish } from '../js/xp.js';
import { TYPE_OF } from '../js/battle.js';
import { EVO, evoOf, levelCapOf, stoneIdFor } from '../js/evolve.js';
import { throwsOf, pendingOf, mergeThrows, korTakeRule, korGiveBackRule, korFinishRule } from '../js/korean.js';
import { emptyProfile, cloneProfile, mergeStatRecord, applyHouseRule } from '../js/db.js';

const KOR = ROSTER.filter((r) => r.subject === 'korean');
const KOR_IDS = new Set(KOR.map((r) => r.id));
const rarityOf = (id) => Number(Object.keys(RARITY_IDS).find((k) => RARITY_IDS[k].includes(id)) || 2);
const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const pf = (o = {}) => cloneProfile({ ...emptyProfile(), ...o });

test('📚 국어 포켓몬 150: 흔함 60 · 보통 45 · 희귀 30 · 전설 15(수학과 같은 비율) · 명단에서 겹치지 않음 · 타입이 다 있음 · 이름이 비지 않음 · 과목은 국어', () => {
  assert.equal(KOR.length, 150);
  const ids = ROSTER.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length, '명단에 같은 포켓몬이 두 번 없다');
  const by = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of KOR) by[rarityOf(r.id)]++;
  assert.deepEqual(by, { 1: 60, 2: 45, 3: 30, 4: 15, 5: 0 });
  for (const k of [1, 2, 3, 4]) assert.equal(RARITY_IDS[k].length, new Set(RARITY_IDS[k]).size, `등급 ${k}에 같은 id 두 번 없다`);
  for (const r of KOR) {
    assert.ok(TYPE_OF[r.id], `${r.id} ${r.ko} 타입 — 없으면 조용히 노말이 된다`);
    assert.ok(r.ko && r.en && !r.unlock, `${r.id} 이름·Lv1`);
    assert.equal(subjectOf(r.id), 'korean');
  }
  // 수학 150과 견줘 같은 비율
  const MATH = ROSTER.filter((r) => r.subject === 'math').map((r) => r.id);
  for (const k of [1, 2, 3, 4]) assert.ok(MATH.filter((id) => rarityOf(id) === k).length >= { 1: 60, 2: 45, 3: 30, 4: 15 }[k], `수학 등급 ${k}`);
  // 몇 마리는 이름 그대로 (PokeAPI에서 받은 것 — 기억으로 쓰면 틀린다)
  const ko = (id) => ROSTER.find((r) => r.id === id).ko;
  assert.deepEqual([ko(495), ko(650), ko(810), ko(480), ko(481), ko(482), ko(648)], ['주리비얀', '도치마론', '흥나숭', '유크시', '엠라이트', '아그놈', '메로엣타']);
});

test('📚 국어 포켓몬은 국어에서만 잡힌다 — forSubject · 영어 퍼즐에는 잡은 뒤에만 놀러 온다 · 레벨업은 🟩 국어스톤', () => {
  const pool = forSubject(ROSTER, 'korean');
  assert.equal(pool.length, 150);
  assert.ok(forSubject(ROSTER, 'english').every((r) => !KOR_IDS.has(r.id)));
  assert.ok(forSubject(ROSTER, 'math').every((r) => !KOR_IDS.has(r.id)));
  const list = [{ id: 495 }, { id: 25 }];
  assert.deepEqual(forPuzzle(list, () => false).map((c) => c.id), [25], '안 잡은 국어 포켓몬은 영어 퍼즐에 안 나온다');
  assert.deepEqual(forPuzzle(list, (id) => id === 495).map((c) => c.id), [495, 25], '잡은 뒤에는 놀러 온다');
  assert.equal(stoneIdFor(subjectOf(495)), 'stone_korean');
});

test('📚 국어 포켓몬 진화: 가족 안에서만 이어진다(과목이 갈리지 않음) · 스타터는 Lv5 → Lv10 · 진화 레벨에서 멈춘다', () => {
  let links = 0;
  for (const [from, list] of Object.entries(EVO)) {
    for (const e of list) {
      if (!KOR_IDS.has(Number(from)) && !KOR_IDS.has(e.to)) continue;
      links++;
      assert.ok(KOR_IDS.has(Number(from)) && KOR_IDS.has(e.to), `${from} → ${e.to} 둘 다 국어`);
    }
  }
  assert.ok(links >= 80, `국어 진화 ${links}갈래`);
  assert.deepEqual(evoOf(495), [{ to: 496, at: 5, orig: 'Lv17' }]);
  assert.deepEqual([levelCapOf(495), levelCapOf(496), levelCapOf(497)], [5, 10, 12]);
  assert.deepEqual(evoOf(840).map((e) => e.to).sort((a, b) => a - b), [841, 842, 1011], '과사삭벌레는 세 갈래');
});

test('🎯 국어 잡기 기회: 별을 새로 받을 때마다 하나 · 빼고(take) · 안 던지면 돌려준다(뺀 수까지만) · 세 카운터는 늘어나기만 · 병합은 max · 깨진 값', () => {
  const T0 = new Date(2026, 9, 11, 12).getTime();
  const p = pf();
  assert.equal(pendingOf(p.korThrow), 0);
  assert.deepEqual(korTakeRule(p), { ok: false, why: 'none' });
  korFinishRule(p, 'K1', T0, {}, ['K1', 'K2']);
  korFinishRule(p, 'K1', T0 + 3600000, {}, ['K1', 'K2']); // 같은 날 — 별 없음 → 기회도 없음
  korFinishRule(p, 'K2', T0, { make: 1 }, ['K1', 'K2']);
  assert.deepEqual(p.korThrow, { earned: 2, used: 0, refunded: 0 });
  assert.deepEqual(korTakeRule(p), { ok: true, left: 1 });
  assert.deepEqual(korGiveBackRule(p), { ok: true, left: 2 });
  assert.deepEqual(korGiveBackRule(p), { ok: false, why: 'none' }, '뺀 수보다 많이 돌려주지 않는다');
  korTakeRule(p); korTakeRule(p);
  assert.deepEqual(korTakeRule(p), { ok: false, why: 'none' });
  assert.deepEqual(p.korThrow, { earned: 2, used: 3, refunded: 1 });
  // 깨진 값 · 병합
  assert.deepEqual(throwsOf({ earned: '1e309', used: -2, refunded: 9 }), { earned: 0, used: 0, refunded: 0 });
  assert.deepEqual(throwsOf({ earned: 3, used: 2, refunded: 5 }), { earned: 3, used: 2, refunded: 2 }, '돌려준 수는 뺀 수를 넘지 않는다');
  assert.deepEqual(mergeThrows({ earned: 5, used: 1, refunded: 0 }, { earned: 3, used: 4, refunded: 2 }), { earned: 5, used: 4, refunded: 2 });
  const a = { ...emptyProfile(), korThrow: { earned: 4, used: 3, refunded: 0 }, updatedAt: 9 };
  const b = { ...emptyProfile(), korThrow: { earned: 4, used: 1, refunded: 1 }, updatedAt: 5 };
  for (const [x, y] of [[a, b], [b, a]]) assert.deepEqual(mergeStatRecord('profile', x, y).korThrow, { earned: 4, used: 3, refunded: 1 }, '옛 백업이 쓴 기회를 되살리지 못한다');
  const c = cloneProfile(a);
  c.korThrow.used = 99;
  assert.equal(a.korThrow.used, 3, '복사');
});

// ───────────────────── 진짜 저장 경로 (fakeidb) ─────────────────────

const stored = () => fakeIdb.get('profile', 'me');
async function seed(p) {
  await flushProfile();
  const cur = stored() || emptyProfile();
  fakeIdb.put('profile', { ...cur, ...p, id: 'me', updatedAt: (cur.updatedAt || 0) + 1 });
  await reloadProfile();
}

test('★ 🎯 저장 경로: 다 읽으면 기회 하나 · 두 창이 마지막 기회를 동시에 빼도 하나만 · 저장이 안 되면 그대로 · 돌려주기', async () => {
  await initProfile();
  await seed({ korDone: {}, korThrow: { earned: 0, used: 0, refunded: 0 } });
  const r = await korFinish('K1', {}, ['K1']);
  assert.deepEqual([r.ok, r.star, r.throws], [true, 1, 1]);
  assert.equal(korThrowsLeft(), 1, '창의 프로필도');
  const two = await Promise.all([applyHouseRule((p) => korTakeRule(p)), applyHouseRule((p) => korTakeRule(p))]);
  assert.deepEqual(two.map((x) => (x.ok ? 'ok' : x.why)).sort(), ['none', 'ok'], '같은 기회를 두 번 던지지 못한다');
  await reloadProfile();
  assert.equal(korThrowsLeft(), 0);
  fakeIdb.failNext('profile');
  assert.deepEqual(await korGiveBackThrow(), { ok: false, why: 'save' });
  assert.deepEqual(stored().korThrow, { earned: 1, used: 1, refunded: 0 }, '저장이 안 되면 그대로');
  assert.deepEqual((await korGiveBackThrow()).ok, true);
  assert.equal(korThrowsLeft(), 1);
  assert.deepEqual((await korTakeThrow()).ok, true);
  // 🟩 근거 실수도 xp를 거쳐 판정에 들어간다
  await seed({ items: {}, korDone: {} });
  assert.equal((await korFinish('K2', {}, ['K2'], 1)).stone, 0, '근거를 한 번 잘못 누르면 🟩 없음');
  assert.equal((await korFinish('K3', {}, ['K3'], 0)).stone, 1);
  assert.equal(stored().items.stone_korean, 1);
});

test('★ 🔍 Codex 49차 #1·#2 저장 경로: 뺀 뒤 판정 전에 새로 고치면 다음에 돌려준다 · 돌려주기 저장이 실패하면({ok:false} — 오류가 아니다) 줄이 남아 다음에 · 판정이 난 기회는 안 돌려준다', async () => {
  const { holdStore, refundOutcome } = await import('../js/throwhold.js');
  const m = new Map();
  const ls = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
  const timers = { setInterval: () => 1, clearInterval: () => {} };
  const store = () => holdStore('kor', { ls, page: 'tab1', timers });
  const giveBack = async () => { try { return refundOutcome(await korGiveBackThrow()); } catch { return 'fail'; } };
  await initProfile();
  await seed({ korThrow: { earned: 2, used: 0, refunded: 0 } });
  // 뺐다 → 잡기 창 → 새로 고침(판정 없음)
  assert.equal((await korTakeThrow()).ok, true);
  store().track('r1');
  assert.equal(korThrowsLeft(), 1);
  await reloadProfile();
  assert.equal(await store().settle(giveBack), 1, '다음에 들어오면 돌려준다');
  assert.equal(korThrowsLeft(), 2);
  assert.deepEqual(stored().korThrow, { earned: 2, used: 1, refunded: 1 });
  // 뺐다 → 판정 → 새로 고침: 쓴 기회는 그대로
  assert.equal((await korTakeThrow()).ok, true);
  store().track('r2').judged();
  assert.equal(await store().settle(giveBack), 0);
  assert.equal(korThrowsLeft(), 1);
  // 뺐다 → 안 던지고 닫음 → 돌려주기 저장 실패 → 줄이 남는다 → 다음에 들어오면
  assert.equal((await korTakeThrow()).ok, true);
  const h = store().track('r3');
  fakeIdb.failNext('profile');
  assert.equal(await h.refund(giveBack), false, '저장 실패를 놓치지 않는다');
  assert.equal(korThrowsLeft(), 0);
  assert.deepEqual(Object.keys(store().list()), ['r3']);
  assert.equal(await store().settle(giveBack), 1);
  assert.equal(korThrowsLeft(), 1);
  assert.deepEqual(store().list(), {});
});

test('🎯 화면 연결: 다 읽은 카드·도감 머리에 잡기 단추 · 화면을 띄우기 전에 빼고 안 던지면 돌려준다 · 후보는 국어 전용 · 잡기 화면 말 · 🎒 📚 표시 · 상점 말', () => {
  const src = read('js/koreanview.js');
  const body = (head) => { const i = src.indexOf(head); assert.ok(i >= 0, head); return src.slice(i, src.indexOf('\n}\n', i)); };
  const run = body('export async function runKorCatch() {');
  const iTake = run.indexOf('taken = await korTakeThrow();');
  assert.ok(iTake >= 0 && iTake < run.indexOf('openCatch({') && run.includes("if (!taken || !taken.ok) { ui.catchMsg"), '띄우기 전에 뺀다 · 못 빼면 안 띄운다');
  assert.ok(run.includes("if (r && r.threw === false && !st.threw) st.hold.refund(korGiveBack)") && run.includes("subject: 'korean'"));
  // 판정(attempt)이 나면 던진 것 — 연출 중에 닫히면 attempt가 안 불려 돌려준다 (장부의 줄도 그때 지운다 — tests/throwhold.test.js)
  assert.ok(run.includes('attempt: (id, opts) => { st.threw = true; st.hold.judged(); return catchAttempt(id, Math.random, opts); },'), '판정 때 던진 것으로 적는다');
  assert.ok(run.indexOf('ui.catchState = st;') < run.indexOf('openCatch({'), '띄우기 전에 이번 창의 상태를 둔다');
  // 창이 소식 없이 닫히면(catch.closeCatch는 onDone을 안 부른다) 안 던진 기회를 돌려주고 단추를 살린다
  const settle = body('function settleLostCatch() {');
  assert.ok(settle.includes('if (!ui.catching || !st || isCatchOpen()) return null;'), '창이 아직 떠 있으면 건드리지 않는다');
  assert.ok(settle.includes('ui.catching = false;') && settle.includes('if (st.threw) return null;') && settle.includes('return st.hold.refund(korGiveBack)'), '안 던졌을 때만 돌려준다');
  assert.ok(run.indexOf('await settleLostCatch();') >= 0 && run.indexOf('await settleLostCatch();') < run.indexOf('if (ui.catching) return;'), '남은 단추를 눌러도 먼저 정리');
  assert.ok(body('function catchBtnEl() {').includes('settleLostCatch();') && body('export async function enterKorean() {').includes('settleLostCatch();'));
  assert.ok(run.includes('if (!koreanVisible()) { await st.hold.refund(korGiveBack); ui.catching = false; return; }'), '뺀 사이 나가면 돌려준다');
  assert.ok(body('async function korPool() {').includes("forSubject(chars, 'korean')"), '후보는 국어 전용');
  assert.ok(body('function finishEl() {').includes('const cb = catchBtnEl();') && body('export async function renderList() {').includes('const cb = catchBtnEl();'));
  assert.ok(body('export async function enterKorean() {').includes('topUpKorChars();'));
  assert.match(read('js/catch.js'), /o\.subject === 'korean'\n\s+\? '📚 국어에서만 만나는 포켓몬이에요!/);
  assert.match(read('js/pokedex.js'), /else if \(subjectOf\(m\.id\) === 'korean'\) cell\.appendChild\(el\('div', 'subj', '📚'\)\);/);
  assert.match(read('js/pokedex.js'), /📚 국어에서 잡아요/);
  assert.match(read('js/shop.js'), /korean: ' · 📚 국어에서 만나요'/);
  assert.match(read('js/shop.js'), /\{ math: '🔢 수학', korean: '📚 국어' \}\[subjectOf\(mon\.id\)\] \|\| '🎤 영어'/);
});
