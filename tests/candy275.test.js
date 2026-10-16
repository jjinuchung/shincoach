// 🍬 그 종의 사탕 (v275, 2026-10-17 아버님 "이대로 해") 테스트: node --test tests/candy275.test.js
//
// 기본안 일곱 (승인): ① 5일장에서 포켓몬을 팔 때 [💰 코인] [🍬 그 종의 사탕 1개] 중 고른다 — 2마리 이상·장날 한도는 그대로(사탕도 한 마리로 센다)
// ② 한 마리에 사탕 1개(등급 상관없이) ③ 레벨 한 칸에 드는 사탕 = 그 칸의 스톤 개수(Lv2~5 1 · Lv6~10 2 · Lv11~12 3), 스톤·코인 없이
// ④ 그 종에만(진화 줄기의 다른 모습엔 못 씀) ⑤ 더 못 오르는 종(만렙·진화 레벨)은 사탕을 막고 까닭을 — 가진 사탕으로 이미 끝까지 오를 수 있어도 막는다
// ⑥ 사탕은 못 팔고 진화엔 안 씀 ⑦ 도감 레벨업 옆 · 가방 줄 · 📊 5일장 기록
//
// ★ 판정표가 규칙을 베끼면 같이 틀린다 — 칸마다 드는 사탕은 이 파일이 손으로 적은 표로 따로 센다
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sellCheck, salesOn, monsSoldOn, salesReport, candyState, SELL_MON_MAX, sellableMons } from '../js/sell.js';
import { MARKET_ANCHOR } from '../js/fusion.js';
import { cloneProfile, emptyProfile, sellRule, candyLevelUpRule, levelUpRule, evolveRule, mergeStatRecord } from '../js/db.js';
import { haveOf, lvOf, evoAt, levelCapOf, candyCount, candyOf, candyCost, candyRoom, MAX_LV } from '../js/evolve.js';
import { ROSTER } from '../js/pokemon.js';
import { RARITY_IDS, sellCtx } from '../js/xp.js';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const prof = (o) => cloneProfile({ ...emptyProfile(), ...o });
const OPEN = MARKET_ANCHOR; // 2026-10-05 첫 장날
const OPEN2 = '2026-10-10';
const CLOSED = '2026-10-06';

const RAR = new Map();
for (const r of Object.keys(RARITY_IDS)) for (const id of RARITY_IDS[r]) RAR.set(id, Number(r));
const rarity = (id) => RAR.get(Number(id)) || 2;
const IDS = new Set(ROSTER.map((m) => m.id));
const CTX = { rarity, known: (id) => IDS.has(Number(id)) };
const have = (p, id) => haveOf(p.caught[id], p.mons[id]);
const sellMon = (p, id, pay, day = OPEN, now = 1000, price) => sellRule(p, { day, kind: 'mon', id, pay, ...(price === undefined ? {} : { price }) }, CTX, now);

// ── 이 파일이 따로 세운 사실 ──
/** 그 레벨에 **도달하는** 한 칸에 드는 사탕 (아버님이 승인한 표 — 스톤 개수와 같다) */
const CANDY_TO = { 2: 1, 3: 1, 4: 1, 5: 1, 6: 2, 7: 2, 8: 2, 9: 2, 10: 2, 11: 3, 12: 3 };
const candiesBetween = (a, b) => { let n = 0; for (let lv = a + 1; lv <= b; lv += 1) n += CANDY_TO[lv]; return n; };
const SQUIRTLE = 7;   // 꼬부기 → Lv5에서 어니부기
const WARTORTLE = 8;  // 어니부기 → Lv10에서 거북왕
const GRENINJA = 658; // 개굴닌자 — 진화 없음, Lv12까지

test('🍬 진화 레벨 가정 — 시험이 쓰는 종의 끝 레벨 (명단이 바뀌면 여기서 먼저 알린다)', () => {
  assert.equal(evoAt(SQUIRTLE), 5);
  assert.equal(evoAt(WARTORTLE), 10);
  assert.equal(evoAt(GRENINJA), null);
  assert.equal(levelCapOf(GRENINJA), MAX_LV);
  assert.equal(MAX_LV, 12);
  for (const id of [SQUIRTLE, WARTORTLE, GRENINJA]) assert.ok(IDS.has(id), `${id} 명단`);
});

test('🍬 한 칸 값 = 손으로 적은 표 (Lv2~5 1 · Lv6~10 2 · Lv11~12 3) · 스톤·코인은 값에 없다 · 진화 레벨·만렙에서 멈춘다', () => {
  for (let lv = 1; lv < MAX_LV; lv += 1) {
    const c = candyCost(lv, GRENINJA);
    assert.deepEqual(c, { toLv: lv + 1, candies: CANDY_TO[lv + 1] }, `개굴닌자 Lv${lv}`);
  }
  assert.equal(candyCost(MAX_LV, GRENINJA), null, '만렙');
  assert.equal(candyCost(5, SQUIRTLE), null, '꼬부기는 Lv5에서 진화해야 한다');
  assert.equal(candyCost(10, WARTORTLE), null);
  assert.deepEqual(candyCost(5, WARTORTLE), { toLv: 6, candies: 2 });
  // 끝까지 드는 사탕
  assert.equal(candyRoom(1, GRENINJA), candiesBetween(1, 12));
  assert.equal(candyRoom(1, GRENINJA), 20, '스톤으로 만렙까지와 같은 20개');
  assert.equal(candyRoom(1, SQUIRTLE), 4);
  assert.equal(candyRoom(3, SQUIRTLE), 2);
  assert.equal(candyRoom(5, SQUIRTLE), 0);
  assert.equal(candyRoom(5, WARTORTLE), candiesBetween(5, 10));
  assert.equal(candyRoom(12, GRENINJA), 0);
  assert.equal(candyRoom(undefined, SQUIRTLE), 4, '레벨 기록이 없으면 Lv1');
});

test('🍬 카운터 읽기: 받은 누적 − 쓴 누적 · 깨진 값("1e309"·음수·글·NaN)은 0 · 0 아래로 안 간다', () => {
  for (const [v, n] of [[3, 3], ['4', 4], [2.7, 2], ['1e309', 0], [Infinity, 0], [-3, 0], ['abc', 0], [NaN, 0], [null, 0], [undefined, 0], [1e20, 0]]) {
    assert.equal(candyCount(v), n, String(v));
  }
  assert.equal(candyOf({ candy: 5, candyUsed: 2 }), 3);
  assert.equal(candyOf({ candy: 1, candyUsed: 4 }), 0);
  assert.equal(candyOf({ candy: '1e309', candyUsed: 0 }), 0, '무한대 사탕은 없다');
  assert.equal(candyOf(undefined), 0);
});

test('🍬 사탕으로 팔기: 코인 대신 그 종의 사탕 1개 · 판 수(sold)·장날 한도·기록은 코인과 같다 · 등급과 상관없이 1개', () => {
  for (const id of [SQUIRTLE, GRENINJA, ...[1, 3, 4].map((r) => [...IDS].find((x) => rarity(x) === r && levelCapOf(x) > 1))]) {
    const p = prof({ caught: { [id]: 3 }, coins: 7 });
    const r = sellMon(p, id, 'candy', OPEN, 500);
    assert.deepEqual(r, { ok: true, kind: 'mon', id, coins: 0, candy: 1 }, `${id}`);
    assert.equal(p.coins, 7, '코인은 그대로');
    assert.equal(have(p, id), 2, '한 마리 판 것');
    assert.equal(p.mons[id].sold, 1);
    assert.equal(candyOf(p.mons[id]), 1);
    assert.deepEqual(salesOn(p.sales, OPEN), [{ key: `mon:${id}:1`, kind: 'mon', id, coins: 0, candy: 1, at: 500 }]);
    assert.equal(p.caught[id], 3, '도감 칸은 그대로');
    assert.equal(p.coinsEarned || 0, 0);
  }
  // 코인으로 팔면 예전 그대로 — 사탕 필드가 안 생긴다
  const q = prof({ caught: { [GRENINJA]: 3 } });
  const r = sellMon(q, GRENINJA, 'coins');
  assert.equal(r.ok, true);
  assert.equal(r.candy, undefined);
  assert.equal(q.mons[GRENINJA].candy, undefined);
  assert.equal(salesOn(q.sales, OPEN)[0].candy, undefined);
  // pay 없이(옛 호출) = 코인
  assert.equal(sellMon(q, GRENINJA, undefined).coins, r.coins);
});

test('🍬 사탕으로 받아도 규칙은 그대로: 마지막 한 마리 · 장날 한도(사탕도 한 마리) · 장이 안 서는 날 · 모르는 받을 것 · 아이템엔 사탕 없음', () => {
  const p = prof({ caught: { [GRENINJA]: 1 } });
  assert.deepEqual(sellMon(p, GRENINJA, 'candy'), { ok: false, why: 'have' });
  assert.deepEqual(sellMon(prof({ caught: { [GRENINJA]: 3 } }), GRENINJA, 'candy', CLOSED), { ok: false, why: 'closed' });
  assert.deepEqual(sellMon(prof({ caught: { [GRENINJA]: 3 } }), GRENINJA, 'gold'), { ok: false, why: 'bad' });
  assert.deepEqual(sellMon(prof({ caught: { [GRENINJA]: 3 } }), GRENINJA, ''), { ok: false, why: 'bad' });
  // 장날 한도 — 사탕·코인 섞어서 SELL_MON_MAX마리
  const ids = [...IDS].filter((id) => levelCapOf(id) >= 5).slice(0, SELL_MON_MAX + 2);
  const q = prof({ caught: Object.fromEntries(ids.map((id) => [id, 3])) });
  let n = 0;
  for (const id of ids) {
    const r = sellMon(q, id, n % 2 ? 'candy' : 'coins', OPEN, n);
    if (n < SELL_MON_MAX) assert.equal(r.ok, true, `${n}`); else assert.deepEqual(r, { ok: false, why: 'limit' });
    n += 1;
  }
  assert.equal(monsSoldOn(q.sales, OPEN), SELL_MON_MAX);
  assert.equal(sellMon(q, ids[0], 'candy', OPEN2).ok, true, '다음 장날엔 다시');
  // 아이템은 pay를 보지 않는다 — 코인 절반 그대로, 사탕 없음
  const it = prof({ items: { crown: 1 } });
  assert.deepEqual(sellRule(it, { day: OPEN, kind: 'item', id: 'crown', pay: 'candy' }, CTX), { ok: true, kind: 'item', id: 'crown', coins: 50 });
});

test('🍬 쓸 데 없는 사탕은 못 받는다: 더 못 오르는 종(만렙·진화 레벨) → candy-cap · 가진 사탕으로 이미 끝까지 → candy-full · 아무것도 안 바뀜', () => {
  const capped = [
    [GRENINJA, 12], [SQUIRTLE, 5], [WARTORTLE, 10],
  ];
  for (const [id, lv] of capped) {
    const p = prof({ caught: { [id]: 3 }, mons: { [id]: { lv } } });
    const before = JSON.stringify(p);
    assert.deepEqual(sellMon(p, id, 'candy'), { ok: false, why: 'candy-cap' }, `${id} Lv${lv}`);
    assert.equal(JSON.stringify(p), before);
    assert.equal(sellMon(p, id, 'coins').ok, true, '코인으로는 판다');
  }
  // 꼬부기 Lv1 → Lv5까지 사탕 4개 — 4개째까지 받고 다섯째는 막는다
  const p = prof({ caught: { [SQUIRTLE]: 9 } });
  for (let i = 1; i <= 4; i += 1) assert.equal(sellMon(p, SQUIRTLE, 'candy', OPEN, i).ok, true, `${i}개째`);
  assert.deepEqual(sellMon(p, SQUIRTLE, 'candy', OPEN, 9), { ok: false, why: 'candy-full' });
  assert.equal(candyOf(p.mons[SQUIRTLE]), 4);
  // 사탕으로 한 칸 올려도 남은 사탕과 남은 칸이 같이 줄어 — 여전히 넉넉
  assert.equal(candyLevelUpRule(p, SQUIRTLE).ok, true);
  assert.deepEqual(sellMon(p, SQUIRTLE, 'candy', OPEN, 10), { ok: false, why: 'candy-full' });
  // 상태 함수가 같은 답 (가판대가 단추를 막는 데 쓴다)
  assert.deepEqual(candyState(p, SQUIRTLE), { have: 3, room: 3, cap: 5, ok: false, why: 'full' });
  assert.deepEqual(candyState(prof({ mons: { [GRENINJA]: { lv: 12 } } }), GRENINJA), { have: 0, room: 0, cap: 12, ok: false, why: 'cap' });
  assert.deepEqual(candyState(prof({}), GRENINJA), { have: 0, room: 20, cap: 12, ok: true, why: null });
  // 팔 수 있는 목록에도 같은 값
  const list = sellableMons(prof({ caught: { [SQUIRTLE]: 3, [GRENINJA]: 2 }, mons: { [GRENINJA]: { lv: 12 } } }), CTX);
  assert.deepEqual(list.map((m) => [m.id, m.candy.ok, m.candy.why]).sort((a, b) => a[0] - b[0]), [[SQUIRTLE, true, null], [GRENINJA, false, 'cap']]);
});

test('🍬 사탕은 보여 준 코인 값과 상관없다 — 그 사이 아빠가 등급을 옮겨도 사탕 1개 (코인은 예전처럼 값이 다르면 안 판다)', () => {
  const p = prof({ caught: { [GRENINJA]: 3 } });
  assert.equal(sellMon(p, GRENINJA, 'candy', OPEN, 1, 99999).ok, true);
  assert.equal(sellMon(p, GRENINJA, 'coins', OPEN, 2, 99999).why, 'price');
});

test('🍬 사탕으로 레벨업: 그 칸의 스톤 개수만큼 · 스톤·코인·스톤 통계는 그대로 · 진화 레벨에서 멈춤 · 모자라면 안 오름', () => {
  const p = prof({ caught: { [SQUIRTLE]: 2 }, mons: { [SQUIRTLE]: { candy: 6 } }, coins: 0, items: {} });
  for (let lv = 1; lv < 5; lv += 1) {
    const r = candyLevelUpRule(p, SQUIRTLE);
    assert.deepEqual(r, { ok: true, from: lv, to: lv + 1, candies: CANDY_TO[lv + 1] });
  }
  assert.equal(lvOf(p.mons[SQUIRTLE]), 5);
  assert.equal(p.mons[SQUIRTLE].candyUsed, 4);
  assert.equal(candyOf(p.mons[SQUIRTLE]), 2);
  assert.equal(p.coins, 0);
  assert.deepEqual(p.items, {});
  assert.equal(p.stonesSpent || 0, 0, '스톤 통계에 안 들어간다');
  assert.deepEqual(candyLevelUpRule(p, SQUIRTLE), { ok: false, why: 'evolve' });
  // 어니부기 Lv5 → 6은 사탕 2개 — 1개뿐이면 안 오르고 아무것도 안 바뀐다
  const q = prof({ caught: { [WARTORTLE]: 1 }, mons: { [WARTORTLE]: { lv: 5, candy: 1 } } });
  const before = JSON.stringify(q);
  assert.deepEqual(candyLevelUpRule(q, WARTORTLE), { ok: false, why: 'candy', from: 5, candies: 2 });
  assert.equal(JSON.stringify(q), before);
  // 만렙
  assert.deepEqual(candyLevelUpRule(prof({ caught: { [GRENINJA]: 1 }, mons: { [GRENINJA]: { lv: 12, candy: 9 } } }), GRENINJA), { ok: false, why: 'max' });
  // 데리고 있지 않으면(다 진화시켰거나 판 것) 못 쓴다
  assert.deepEqual(candyLevelUpRule(prof({ caught: { [SQUIRTLE]: 1 }, mons: { [SQUIRTLE]: { evo: 1, candy: 3 } } }), SQUIRTLE), { ok: false, why: 'caught' });
});

test('🍬 그 종에만: 꼬부기 사탕으로 어니부기는 못 올린다 · 진화해도 사탕은 꼬부기 쪽에 남는다', () => {
  const p = prof({ caught: { [SQUIRTLE]: 2, [WARTORTLE]: 1 }, mons: { [SQUIRTLE]: { lv: 5, candy: 5 }, [WARTORTLE]: { lv: 5 } } });
  assert.deepEqual(candyLevelUpRule(p, WARTORTLE), { ok: false, why: 'candy', from: 5, candies: 2 });
  assert.equal(lvOf(p.mons[WARTORTLE]), 5);
  assert.equal(candyOf(p.mons[SQUIRTLE]), 5);
  assert.equal(candyOf(p.mons[WARTORTLE]), 0);
  // 실제로 진화시켜도 (Codex 84차 E) — 어니부기는 Lv5를 물려받고 사탕은 꼬부기 쪽에 그대로
  const q = prof({ caught: { [SQUIRTLE]: 2 }, mons: { [SQUIRTLE]: { lv: 1, candy: 6 } } });
  for (let i = 0; i < 4; i += 1) assert.equal(candyLevelUpRule(q, SQUIRTLE).ok, true);
  assert.equal(evolveRule(q, SQUIRTLE, WARTORTLE, 100, 1000).ok, true);
  assert.equal(lvOf(q.mons[WARTORTLE]), 5, '레벨은 이어진다');
  assert.equal(candyOf(q.mons[SQUIRTLE]), 2, '꼬부기 사탕은 꼬부기 쪽에');
  assert.equal(candyOf(q.mons[WARTORTLE]), 0, '어니부기로 옮겨 가지 않는다');
  assert.equal(have(q, SQUIRTLE), 1);
  assert.deepEqual(candyLevelUpRule(q, WARTORTLE), { ok: false, why: 'candy', from: 5, candies: 2 });
  assert.deepEqual(candyLevelUpRule(q, SQUIRTLE), { ok: false, why: 'evolve' }, '꼬부기는 Lv5에서 멈춘 그대로');
});

test('🍬 목록을 본 뒤 다른 창에서 스톤으로 끝까지 올리면 — 사탕으로 팔 때 저장된 레벨로 다시 판정해 막는다 (Codex 84차 E)', () => {
  const p = prof({ caught: { [SQUIRTLE]: 3 }, mons: { [SQUIRTLE]: { lv: 4 } }, coins: 100, items: { stone_english: 1 } });
  const shown = sellableMons(p, CTX).find((m) => m.id === SQUIRTLE);
  assert.deepEqual([shown.candy.ok, shown.candy.room], [true, 1], '보여 줄 때는 사탕을 받을 수 있었다');
  assert.equal(levelUpRule(p, SQUIRTLE, 'stone_english').ok, true, '다른 창에서 🔶로 Lv5');
  const before = JSON.stringify(p);
  assert.deepEqual(sellMon(p, SQUIRTLE, 'candy', OPEN, 5, shown.price), { ok: false, why: 'candy-cap' });
  assert.equal(JSON.stringify(p), before, '아무것도 안 바뀐다');
  assert.equal(sellMon(p, SQUIRTLE, 'coins', OPEN, 6, shown.price).ok, true, '코인으로는 판다');
});

test('🍬 스톤 레벨업은 그대로 — 사탕이 있어도 스톤·코인 길은 예전 값, 사탕을 안 쓴다', () => {
  const p = prof({ caught: { [GRENINJA]: 1 }, mons: { [GRENINJA]: { candy: 3 } }, coins: 100, items: { stone_english: 2 } });
  const r = levelUpRule(p, GRENINJA, 'stone_english');
  assert.equal(r.ok, true);
  assert.equal(p.items.stone_english, 1);
  assert.equal(p.coins, 70);
  assert.equal(candyOf(p.mons[GRENINJA]), 3);
});

test('🔁 백업 병합: 받은 사탕·쓴 사탕은 큰 쪽(단조) — 옛 백업이 쓴 사탕을 되살리지도, 받은 사탕을 지우지도 못한다 · 깨진 값은 0', () => {
  const id = GRENINJA;
  // 지금: 3개 받아 2개 씀(1개 남음, Lv3) · 옛 백업: 1개 받고 안 씀
  const now = prof({ caught: { [id]: 4 }, mons: { [id]: { lv: 3, candy: 3, candyUsed: 2, sold: 3 } }, updatedAt: 200 });
  const old = prof({ caught: { [id]: 4 }, mons: { [id]: { lv: 1, candy: 1, sold: 1 } }, updatedAt: 100 });
  for (const [a, b] of [[now, old], [old, now]]) {
    const m = mergeStatRecord('profile', a, b);
    assert.equal(candyCount(m.mons[id].candy), 3);
    assert.equal(candyCount(m.mons[id].candyUsed), 2);
    assert.equal(candyOf(m.mons[id]), 1);
    assert.equal(lvOf(m.mons[id]), 3);
  }
  // 옛 백업이 "최근" 쪽이어도(시계가 뒤틀려도) 쓴 수는 max — 쓴 사탕이 돌아오지 않는다
  const skew = prof({ caught: { [id]: 4 }, mons: { [id]: { candy: 3 } }, updatedAt: 999 });
  const m2 = mergeStatRecord('profile', now, skew);
  assert.equal(candyOf(m2.mons[id]), 1);
  // 깨진 값은 이기지 못한다
  const bad = prof({ caught: { [id]: 4 }, mons: { [id]: { candy: '1e309', candyUsed: -5 } }, updatedAt: 50 });
  const m3 = mergeStatRecord('profile', now, bad);
  assert.equal(m3.mons[id].candy, 3);
  assert.equal(m3.mons[id].candyUsed, 2);
});

test('📊 판 것 보고: 사탕으로 받은 것은 🍬 — 장날 합계의 코인엔 0, 사탕 수는 따로', () => {
  const p = prof({ caught: { [GRENINJA]: 4, [SQUIRTLE]: 3 } });
  sellMon(p, GRENINJA, 'candy', OPEN, 1);
  sellMon(p, GRENINJA, 'coins', OPEN, 2);
  sellMon(p, SQUIRTLE, 'candy', OPEN, 3);
  const r = salesReport({ [OPEN]: salesOn(p.sales, OPEN) }, (id) => `몬${id}`, 3);
  assert.equal(r.length, 1);
  assert.equal(r[0].total, sellCheck(prof({ caught: { [GRENINJA]: 3 } }), { day: OPEN, kind: 'mon', id: GRENINJA }, CTX).price, '코인은 코인으로 판 것만');
  assert.equal(r[0].candy, 2);
  assert.deepEqual(r[0].list.map((x) => [x.name, x.coins, x.candy]), [[`몬${GRENINJA}`, 0, 1], [`몬${GRENINJA}`, r[0].total, 0], [`몬${SQUIRTLE}`, 0, 1]]);
  // 깨진 기록(candy: 7 · 아이템에 candy)은 사탕으로 안 센다
  const odd = salesReport({ [OPEN]: [{ kind: 'mon', id: 1, coins: 0, candy: 7 }, { kind: 'item', id: 'crown', coins: 50, candy: 1 }] }, String, 3);
  assert.equal(odd[0].candy, 0);
});

test('🎲 무작위 1,000판 × 40번 (사탕 팔기·코인 팔기·사탕 레벨업): 받은 사탕 = 사탕 판 기록 수 · 쓴 사탕 = 오른 칸의 표 합 · 가진 사탕 ≤ 끝까지 드는 사탕 · 레벨 ≤ 끝 레벨', () => {
  let seed = 275;
  const rnd = () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 2 ** 32; };
  const pool = [...IDS].slice(0, 150);
  const days = [OPEN, OPEN2, CLOSED];
  for (let n = 0; n < 1000; n += 1) {
    const caught = {}, mons = {};
    for (let i = 0; i < 6; i += 1) {
      const id = pool[Math.floor(rnd() * pool.length)];
      caught[id] = 1 + Math.floor(rnd() * 8);
      mons[id] = { lv: 1 + Math.floor(rnd() * levelCapOf(id)) };
    }
    const start = Object.fromEntries(Object.keys(mons).map((id) => [id, mons[id].lv]));
    const p = prof({ caught: { ...caught }, mons: JSON.parse(JSON.stringify(mons)), coins: 0 });
    for (let k = 0; k < 40; k += 1) {
      const ids = Object.keys(p.caught).map(Number);
      const id = ids[Math.floor(rnd() * ids.length)];
      const x = rnd();
      if (x < 0.45) sellMon(p, id, 'candy', days[Math.floor(rnd() * days.length)], k);
      else if (x < 0.6) sellMon(p, id, 'coins', days[Math.floor(rnd() * days.length)], k);
      else candyLevelUpRule(p, id);
      for (const j of ids) {
        const m = p.mons[j] || {};
        assert.ok(candyOf(m) <= candyRoom(lvOf(m), j), `쓸 데 없는 사탕 ${j}`);
        assert.ok(lvOf(m) <= Math.max(start[j], levelCapOf(j)), `끝 레벨 ${j}`);
        assert.ok(candyCount(m.candyUsed) <= candyCount(m.candy), `쓴 것 ≤ 받은 것 ${j}`);
      }
    }
    const got = {};
    let coins = 0;
    for (const d of Object.keys(p.sales || {})) for (const s of salesOn(p.sales, d)) { got[s.id] = (got[s.id] || 0) + (s.candy || 0); coins += s.coins; }
    assert.equal(p.coins, coins, '코인 = 코인으로 판 기록의 합');
    for (const j of Object.keys(p.mons)) {
      const m = p.mons[j];
      assert.equal(candyCount(m.candy), got[j] || 0, `받은 사탕 = 사탕 판 기록 ${j}`);
      assert.equal(candyCount(m.candyUsed), candiesBetween(start[j], lvOf(m)), `쓴 사탕 = 오른 칸의 표 합 ${j}`);
      assert.ok(have(p, Number(j)) >= 1, '마지막 한 마리');
    }
  }
});

test('🔌 화면·저장 연결: 가판대 고르기 줄 · 사탕 단추는 쓸 데가 있을 때만 · 도감 사탕 단추 · 한 트랜잭션 · 가방 줄 · 📊 · sw', () => {
  const mv = src('js/marketview.js');
  const body = (s, head) => s.slice(s.indexOf(head), s.indexOf('\n}\n', s.indexOf(head)));
  const pr = body(mv, 'function payRow(m) {');
  assert.ok(pr.includes("doSell('mon', m.id, m.price, 'coins')") && pr.includes("doSell('mon', m.id, m.price, 'candy')"), '두 단추가 고른 것을 넘긴다');
  assert.ok(pr.includes('candy.disabled = ui.busy || !m.candy.ok;'), '쓸 데 없는 사탕은 단추를 막는다');
  assert.ok(pr.includes("m.candy.why === 'cap'"), '막을 때 까닭을 보여 준다');
  assert.match(mv, /grid\.appendChild\(b\);\s*if \(armed\) grid\.appendChild\(payRow\(m\)\);/, '누른 포켓몬 바로 아래에만');
  assert.match(mv, /r\.why === 'candy-cap' \?/);
  assert.match(mv, /r\.why === 'candy-full' \?/);
  assert.match(mv, /\$\{s\.candy \? `🍬\$\{s\.candy\}` : `💰\$\{s\.coins\}`\}/, '오늘 판 것에 🍬');
  const x = src('js/xp.js');
  assert.match(x, /export async function candyLevelUpMon\(id\) \{\s*const r = await runProfileOp\(\(\) => applyCandyLevelUp\(id\), \(\) => \(\{ ok: false, why: 'save' \}\)\);/, '사탕 레벨업은 한 트랜잭션 · 저장 실패는 못 오른 것');
  assert.match(x, /candy: \{ have: candyHave, next: candyNext, ok: have > 0 && !!candyNext && candyHave >= candyNext\.candies \},/);
  const db = src('js/db.js');
  assert.match(db, /export function applyCandyLevelUp\(monId\) \{\s*return mutateProfile\(\(p\) => candyLevelUpRule\(p, monId\)\);/);
  assert.match(db, /for \(const k of \['candy', 'candyUsed'\]\) \{\s*const v = Math\.max\(candyCount\(o\[k\]\), candyCount\(cur\[k\]\)\);/, '병합은 단조 · 깨진 값 0');
  const shop = src('js/shop.js');
  const rg = body(shop, 'function renderGrow() {');
  assert.ok(rg.includes('if (g.candy.have > 0 && g.candy.next) {'), '사탕이 있을 때만 단추');
  assert.ok(rg.includes('cb.disabled = !g.candy.ok || busy;'));
  assert.ok(rg.includes('() => doLevelUp(true)'));
  assert.ok(rg.includes("if (!g.next && g.candy.have > 0) box.appendChild(el('p', 'mon-empty', `🍬 ${mon.ko}의 사탕 ${g.candy.have}개는 이제 쓸 데가 없어요"), '끝까지 다 컸는데 남은 사탕은 알려만 준다 (Codex 84차)');
  const lv = body(shop, 'async function doLevelUp(');
  assert.ok(lv.includes('r = useCandy ? await candyLevelUpMon(id) : await levelUpMon(id);'));
  assert.ok(lv.includes("why === 'candy' ?"), '모자라면 사탕이 모자라다고');
  const dex = src('js/pokedex.js');
  assert.ok(body(dex, 'function bagText() {').includes('const candy = candyTotal();'), '가방 줄에 🍬');
  const st = src('js/stats.js');
  assert.match(st, /x\.candy \? `🍬\$\{x\.candy\}` : x\.coins/, '📊 판 것에 🍬');
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(src('sw.js')) || [])[1]) >= 275, 'sw v275 이상 (판을 못 박으면 다음 판에서 깨진다)');
  // 사탕 수를 글에 숫자로 박지 않는다 — 값은 규칙(evolve.candyCost)에서
  assert.ok(!/사탕 [2-9]개/.test(mv + shop), '사탕 개수를 글에 숫자로');
});
