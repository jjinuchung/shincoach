// 🏪 5일장 3단계 · 💰 팔기 (2026-10-05) 테스트: node --test tests/sell.test.js
//
// 아버님 "이대로 진행" (기본값 9개): 장날에만 · 포켓몬은 2마리 이상 데리고 있는 종만(마지막 한 마리는 남는다) ·
// 값은 등급으로만 ⭐10 · ⭐⭐25 · ⭐⭐⭐60 · 전설150 · 🌌150 · 아이템은 💰로 살 수 있는 것만 산 값의 절반(스톤이 든 것도 코인만) ·
// 스톤·🌟·🌕·🍄·교환권·🌈 남은 횟수는 못 판다 · 장날마다 포켓몬 20마리(처음 5마리 → 10마리 v191 → 20마리 v219) · 두 번 눌러야 · 판 코인은 coinsEarned에 안 넣는다 ·
// 📊에 판 것 · 저장은 mons[id].sold 단조 카운터 + 한 트랜잭션 + sales 합집합
//
// ★ 판정표가 규칙을 베끼면 같이 틀린다 — 값은 이 파일이 아버님 결정대로 **손으로 적은 표**와 카탈로그 값에서 따로 계산한다
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MON_PRICE, SELL_MON_MAX, monPrice, itemSellPrice, sellableMons, sellableItems, sellCheck, salesOn, monsSoldOn, saleKey, mergeSales, copySales, salesReport } from '../js/sell.js';
import { MARKET_ANCHOR } from '../js/fusion.js';
import { cloneProfile, emptyProfile, sellRule, mergeStatRecord, unmegaRule, dyeRule, nextStamp, purchaseRule } from '../js/db.js';
import { haveOf, soldOf } from '../js/evolve.js';
import { ITEMS, itemById, SHINY_CHARGE } from '../js/items.js';
import { ROSTER } from '../js/pokemon.js';
import { ticketId } from '../js/unlock.js';
import { RARITY_IDS, sellCtx, catchAttempt, addItem, inventory, spendBall } from '../js/xp.js';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const prof = (o) => cloneProfile({ ...emptyProfile(), ...o });
const OPEN = MARKET_ANCHOR;        // 2026-10-05 첫 장날
const OPEN2 = '2026-10-10';        // 다음 장날
const CLOSED = '2026-10-06';

// ── 이 파일이 따로 세운 사실 ──
const RAR = new Map();
for (const r of Object.keys(RARITY_IDS)) for (const id of RARITY_IDS[r]) RAR.set(id, Number(r));
const rarity = (id) => RAR.get(Number(id)) || 2;
const IDS = new Set(ROSTER.map((m) => m.id));
const CTX = { rarity, known: (id) => IDS.has(Number(id)) };
const PRICE_BY_STARS = { 1: 10, 2: 25, 3: 60, 4: 150, 5: 150 }; // 아버님 승인한 표 그대로
const have = (p, id) => haveOf(p.caught[id], p.mons[id]);
const sell = (p, kind, id, day = OPEN, now = 1000) => sellRule(p, { day, kind, id }, CTX, now);
const ofRarity = (r) => [...IDS].filter((id) => rarity(id) === r);

test('💰 값: 포켓몬은 등급으로만 · 아이템은 산 값(코인)의 절반(내림) · 손으로 적은 표와 같다', () => {
  for (const r of [1, 2, 3, 4, 5]) assert.equal(monPrice(r), PRICE_BY_STARS[r], `등급 ${r}`);
  assert.equal(monPrice(99), 25, '모르는 등급은 보통');
  assert.equal(monPrice(undefined), 25);
  assert.deepEqual(MON_PRICE.slice(1), [10, 25, 60, 150, 150]);
  const table = { potion: 5, potion_big: 12, ribbon: 15, crown: 50, diamond: 75, red: 25, shiny: 75, greatball: 12, ultraball: 300, masterball: 600,
    keystone: 300, megastone: 300, radar: 50, shiny_stone: 250, beastball: 150, extend_math: 50, extend_english: 75 };
  for (const [id, p] of Object.entries(table)) assert.equal(itemSellPrice(id), p, id);
  // 산 값보다 비싸게 팔리는 것은 하나도 없다 — 사서 되팔아 코인을 버는 길이 없다
  for (const it of ITEMS) assert.ok(itemSellPrice(it.id) * 2 <= (Number(it.price) || 0), `${it.id} 되팔기로 이득`);
});

test('💰 못 파는 것: 스톤 · 🌟 황금 볼 · 🌕 · 🍄 · 몬스터볼(공짜) · 교환권 · 🌈 남은 횟수 · 알 · 모르는 것', () => {
  const NO = ['stone_math', 'stone_english', 'goldenball', 'truegold', 'mushroom', 'pokeball', SHINY_CHARGE, 'egg_math', 'egg_english', ticketId('iconic'), ticketId('bell'), 'nope', ''];
  for (const id of NO) assert.equal(itemSellPrice(id), 0, id);
  const bag = Object.fromEntries(NO.filter(Boolean).map((id) => [id, 3]));
  assert.deepEqual(sellableItems({ ...bag, crown: 1 }).map((x) => x.id), ['crown'], '목록에도 안 나온다');
  const p = prof({ items: { ...bag } });
  for (const id of NO) assert.deepEqual(sell(p, 'item', id), { ok: false, why: 'bad' }, id);
  assert.deepEqual(p.items, bag, '아무것도 안 바뀐다');
  assert.equal(p.coins, 0);
});

test('💰 포켓몬 팔기: 판 수는 sold 단조 카운터(도감 칸은 남음) · 코인만 늘고 번 코인 통계는 그대로 · 마지막 한 마리는 못 판다', () => {
  const id = ofRarity(2)[0];
  const p = prof({ caught: { [id]: 3 }, coins: 7, coinsEarned: 100 });
  assert.deepEqual(sell(p, 'mon', id, OPEN, 1000), { ok: true, kind: 'mon', id, coins: 25 });
  assert.deepEqual([p.caught[id], soldOf(p.mons[id]), have(p, id), p.coins, p.coinsEarned], [3, 1, 2, 32, 100]);
  assert.equal(sell(p, 'mon', id, OPEN, 2000).ok, true);
  assert.equal(have(p, id), 1);
  assert.deepEqual(sell(p, 'mon', id, OPEN, 3000), { ok: false, why: 'have' }, '마지막 한 마리');
  assert.deepEqual(Object.keys(p.sales[OPEN]), [`mon:${id}:1`, `mon:${id}:2`], '같은 것을 두 번 팔면 열쇠가 다르다');
  assert.deepEqual(p.sales[OPEN][`mon:${id}:1`], { kind: 'mon', id, coins: 25, at: 1000 });
  // 레벨·이로치·장식·파트너는 종마다 하나 — 남는 한 마리에 그대로
  const q = prof({ caught: { 25: 2 }, mons: { 25: { lv: 7, shiny: true, gear: 'cap' } }, partner: 25 });
  assert.equal(sell(q, 'mon', 25).ok, true);
  assert.deepEqual([q.mons[25].lv, q.mons[25].shiny, q.mons[25].gear, q.partner, have(q, 25)], [7, true, 'cap', 25, 1]);
});

test('💰 보유는 진화·데려감·퓨전·떠남·교환·판 수를 모두 뺀 것 — 2마리 이상만 목록에, 등급 낮은 것부터', () => {
  const [a, b, c, d, f, g] = ofRarity(1), [e] = ofRarity(3);
  const p = prof({
    caught: { [a]: 2, [b]: 3, [c]: 4, [d]: 1, [e]: 2, [f]: 2, [g]: 5, 999999: 5 },
    mons: { [b]: { fused: 1, unfused: 0 }, [c]: { evo: 1, taken: 1 }, [e]: { sold: 0 }, [f]: { fused: 1 }, [g]: { traded: 1, fled: 1, sold: 2 } },
  });
  const list = sellableMons(p, CTX);
  assert.deepEqual(list.map((x) => x.id), [a, b, c, e].filter((x) => have(p, x) >= 2).sort((x, y) => rarity(x) - rarity(y) || x - y));
  assert.ok(!list.some((x) => x.id === 999999), '명단에 없는 번호는 안 판다');
  assert.ok(!list.some((x) => x.id === d), '한 마리뿐');
  assert.equal(list.find((x) => x.id === e).price, 60);
  assert.deepEqual(sell(p, 'mon', 999999), { ok: false, why: 'bad' });
  assert.deepEqual(list.map((x) => x.id).filter((x) => x === b || x === f || x === g), [b], '퓨전 1 → b는 2마리 남아 팔 수 있고 f는 1마리, g는 교환·떠남·판 수를 빼면 1마리');
  assert.deepEqual(sell(p, 'mon', f), { ok: false, why: 'have' }, '두 마리 잡았지만 하나가 퓨전에 들어가 있다');
  assert.deepEqual(sell(p, 'mon', g), { ok: false, why: 'have' }, '다섯 마리 잡았지만 교환·떠남·판 수를 빼면 하나');
  assert.equal(sell(p, 'mon', b).ok, true);
});

test('💰 장날마다 포켓몬 20마리까지 — 여러 종을 섞어도 · 한 종을 여러 번 팔아도 · 아이템은 한도 없음 · 다음 장날엔 다시 20마리 · 장이 안 서는 날은 못 판다', () => {
  // 아버님 결정: 처음 5마리 → "10마리까지 허용" (2026-10-05 v191) → "20마리까지 제한을 풀자" (2026-10-09) — 손으로 적은 값
  assert.equal(SELL_MON_MAX, 20);
  const ids = ofRarity(1).slice(0, 21);
  assert.equal(ids.length, 21);
  const p = prof({ caught: Object.fromEntries(ids.map((x) => [x, 3])), items: { potion: 9 } });
  for (let i = 0; i < 20; i += 1) assert.equal(sell(p, 'mon', ids[i], OPEN, 100 + i).ok, true, `${i + 1}번째`);
  assert.deepEqual(sell(p, 'mon', ids[20], OPEN), { ok: false, why: 'limit' }, '21번째는 다음 장날에');
  assert.equal(monsSoldOn(p.sales, OPEN), 20);
  for (let i = 0; i < 7; i += 1) assert.equal(sell(p, 'item', 'potion', OPEN, 200 + i).ok, true, '아이템은 한도 없음');
  assert.equal(p.items.potion, 2);
  assert.equal(sell(p, 'mon', ids[20], OPEN2).ok, true, '다음 장날');
  assert.deepEqual(sell(p, 'mon', ids[20], CLOSED), { ok: false, why: 'closed' });
  // 한 종을 여러 번 — 22마리면 21번까지 팔 수 있는 종이어도 장날 한도 20에서 멈추고, 한도는 종을 섞어 센다
  const many = ofRarity(1)[21];
  const q = prof({ caught: { [many]: 22, [ids[0]]: 5 } });
  for (let i = 0; i < 20; i += 1) assert.equal(sell(q, 'mon', many, OPEN, 300 + i).ok, true, `한 종 ${i + 1}번째`);
  assert.deepEqual(sell(q, 'mon', many, OPEN), { ok: false, why: 'limit' }, '같은 종 21번째');
  assert.deepEqual(sell(q, 'mon', ids[0], OPEN), { ok: false, why: 'limit' }, '다른 종도 그날은 끝');
  assert.equal(sell(q, 'mon', many, OPEN2, 400).ok, true, '다음 장날엔 다시');
  assert.deepEqual(sell(p, 'item', 'potion', CLOSED), { ok: false, why: 'closed' });
  assert.deepEqual(sellRule(p, { day: OPEN2, kind: 'egg', id: 1 }, CTX), { ok: false, why: 'bad' });
});

test('💰 아이템 팔기: 가방에서 하나씩 · 다 팔면 가방에서 빠진다 · 없으면 못 판다 · 판 코인은 번 코인 통계에 안 들어간다', () => {
  const p = prof({ items: { crown: 2, shiny_stone: 1, [SHINY_CHARGE]: 2 }, coins: 0, coinsEarned: 40 });
  assert.deepEqual(sell(p, 'item', 'crown'), { ok: true, kind: 'item', id: 'crown', coins: 50 });
  assert.equal(sell(p, 'item', 'crown').ok, true);
  assert.equal(p.items.crown, undefined, '0개는 가방에서 빠진다');
  assert.deepEqual(sell(p, 'item', 'crown'), { ok: false, why: 'none' });
  assert.equal(sell(p, 'item', 'shiny_stone').coins, 250, '스톤이 든 물건도 코인 절반만');
  assert.equal(p.items.stone_math, undefined, '스톤은 안 돌려준다');
  assert.equal(p.items[SHINY_CHARGE], 2, '뜯은 스톤의 남은 횟수는 그대로 (못 판다)');
  assert.deepEqual([p.coins, p.coinsEarned], [350, 40]);
  assert.deepEqual(salesOn(p.sales, OPEN).map((s) => s.key), ['item:crown:1', 'item:crown:2', 'item:shiny_stone:1']);
});

test('💰 등급은 넘겨받은 (저장된) 프로필에서 — 아빠가 옮긴 등급을 따른다 · sellCtx는 창의 프로필을 안 본다', () => {
  const id = ofRarity(1)[0];
  const stored = prof({ caught: { [id]: 2 }, mons: { [id]: { rarity: 3 } } });
  const r = sellRule(stored, { day: OPEN, kind: 'mon', id }, sellCtx(stored));
  assert.deepEqual([r.ok, r.coins], [true, 60], '⭐ → ⭐⭐⭐로 옮긴 포켓몬은 ⭐⭐⭐ 값');
  const plain = prof({ caught: { [id]: 2 } });
  assert.equal(sellRule(plain, { day: OPEN, kind: 'mon', id }, sellCtx(plain)).coins, 10);
  assert.equal(sellCtx(plain).known(999999), false);
});

test('🔁 백업 병합: 판 포켓몬은 옛 백업으로 되살아나지 않는다(sold max) · 판 기록은 합집합 · 장날 한도도 그대로', () => {
  const id = ofRarity(1)[0];
  const old = prof({ caught: { [id]: 3 }, coins: 0, updatedAt: 100 });
  const now = prof({ caught: { [id]: 3 }, coins: 0, updatedAt: 50 });
  for (let i = 0; i < 2; i += 1) sell(now, 'mon', id, OPEN, 10 + i);
  now.updatedAt = 200;
  for (const [a, b] of [[now, old], [old, now]]) {
    const m = mergeStatRecord('profile', a, b);
    assert.equal(haveOf(m.caught[id], m.mons[id]), 1, '판 두 마리가 돌아오지 않는다');
    assert.equal(m.coins, 2 * PRICE_BY_STARS[1], '코인은 최근 쪽 (판 쪽)');
    assert.equal(monsSoldOn(m.sales, OPEN), 2);
  }
  // 옛 백업이 "최근" 쪽이어도(시계가 뒤틀려도) 판 수는 max로 남는다 — 코인 없이 포켓몬만 되살아나는 일은 있어도, 복제는 없다
  const skew = prof({ caught: { [id]: 3 }, updatedAt: 999 });
  const m2 = mergeStatRecord('profile', now, skew);
  assert.equal(soldOf(m2.mons[id]), 2);
  assert.equal(haveOf(m2.caught[id], m2.mons[id]), 1);
});

test('🔁 판 기록 합치기 — 장날·열쇠마다 합집합 · 같은 열쇠면 먼저 판 쪽 · 엉뚱한 값은 버림 · 복사는 깊게', () => {
  const a = { [OPEN]: { 'mon:25:1': { kind: 'mon', id: 25, coins: 25, at: 10 } } };
  const b = { [OPEN]: { 'mon:25:1': { kind: 'mon', id: 25, coins: 25, at: 5 }, 'item:crown:1': { kind: 'item', id: 'crown', coins: 50, at: 7 } }, [OPEN2]: { 'mon:1:1': { kind: 'mon', id: 1, coins: 10, at: 9 } }, bad: { x: {} }, '2026-10-15': null };
  const m = mergeSales(a, b);
  assert.deepEqual(Object.keys(m).sort(), [OPEN, OPEN2]);
  assert.equal(m[OPEN]['mon:25:1'].at, 5);
  assert.equal(Object.keys(m[OPEN]).length, 2);
  assert.deepEqual(mergeSales(b, a), m, '어느 쪽에서 합쳐도 같다');
  const c = copySales(m);
  c[OPEN]['mon:25:1'].coins = 999;
  assert.equal(m[OPEN]['mon:25:1'].coins, 25);
  assert.equal(saleKey({ 'mon:25:1': {}, 'mon:25:2': {} }, 'mon', 25), 'mon:25:3');
  // 트랜잭션은 저장된 프로필의 복사본에서 판다 — 복사본에서 판 기록이 원본(다른 창이 든 것)에 새면 안 된다
  const orig = prof({ items: { potion: 3 }, sales: { [OPEN]: { 'item:potion:1': { kind: 'item', id: 'potion', coins: 5, at: 1 } } } });
  const copy = cloneProfile(orig);
  assert.equal(sell(copy, 'item', 'potion').ok, true);
  assert.deepEqual(Object.keys(orig.sales[OPEN]), ['item:potion:1'], '원본 기록은 그대로');
  assert.equal(Object.keys(copy.sales[OPEN]).length, 2);
  assert.equal(saleKey(undefined, 'item', 'crown'), 'item:crown:1');
});

test('📊 판 것 보고: 최근 장날부터 3번 · 장날마다 합계·이름 · 판 것이 없는 장날은 뺀다', () => {
  const by = {
    '2026-10-05': [{ kind: 'mon', id: 25, coins: 25 }, { kind: 'item', id: 'crown', coins: 50 }],
    '2026-10-10': [{ kind: 'item', id: 'potion', coins: 5 }],
    '2026-10-15': [], '2026-10-20': [{ kind: 'mon', id: 1, coins: 10 }], '2026-09-30': [{ kind: 'mon', id: 4, coins: 10 }],
  };
  const r = salesReport(by, (id) => `몬${id}`, 3);
  assert.deepEqual(r.map((x) => x.day), ['2026-10-20', '2026-10-10', '2026-10-05']);
  assert.deepEqual(r[2], { day: '2026-10-05', total: 75, mons: 1, items: 1, list: [{ name: '몬25', coins: 25 }, { name: '👑 왕관', coins: 50 }] });
});

test('🎲 무작위 도감 1,000개 × 팔기 40번: 코인은 기록의 합만큼 · 보유는 늘 1 이상(판 종) · 도감 칸·가방은 음수가 안 된다 · 장날 한도', () => {
  let seed = 12345;
  const rnd = () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 2 ** 32; };
  const pool = [...IDS].slice(0, 120);
  const sellables = ITEMS.filter((it) => itemSellPrice(it.id) > 0).map((it) => it.id);
  const days = [OPEN, OPEN2, CLOSED, '2026-10-15'];
  for (let n = 0; n < 1000; n += 1) {
    const caught = {}, items = {};
    for (let i = 0; i < 12; i += 1) caught[pool[Math.floor(rnd() * pool.length)]] = 1 + Math.floor(rnd() * 4);
    for (let i = 0; i < 4; i += 1) items[sellables[Math.floor(rnd() * sellables.length)]] = 1 + Math.floor(rnd() * 3);
    items.stone_math = 2;
    const p = prof({ caught: { ...caught }, items: { ...items }, coins: 0 });
    for (let k = 0; k < 40; k += 1) {
      const day = days[Math.floor(rnd() * days.length)];
      if (rnd() < 0.6) {
        const ids = Object.keys(p.caught).map(Number);
        const id = ids[Math.floor(rnd() * ids.length)];
        const before = have(p, id);
        const r = sell(p, 'mon', id, day, k);
        if (r.ok) { assert.equal(have(p, id), before - 1); assert.ok(have(p, id) >= 1, '마지막 한 마리'); assert.equal(r.coins, PRICE_BY_STARS[rarity(id)]); }
      } else {
        const keys = Object.keys(p.items);
        const id = keys[Math.floor(rnd() * keys.length)] || 'crown';
        const before = Number(p.items[id]) || 0;
        const r = sell(p, 'item', id, day, k);
        if (r.ok) { assert.equal(Number(p.items[id]) || 0, before - 1); assert.equal(r.coins, Math.floor(itemById(id).price / 2)); }
      }
    }
    const total = Object.keys(p.sales || {}).reduce((a, d) => a + salesOn(p.sales, d).reduce((x, s) => x + s.coins, 0), 0);
    assert.equal(p.coins, total, '코인 = 판 기록의 합');
    for (const id of Object.keys(caught)) assert.equal(p.caught[id], caught[id], '도감 칸(caught)은 안 줄어든다');
    for (const id of Object.keys(p.items)) assert.ok(p.items[id] > 0);
    assert.equal(p.items.stone_math, 2, '스톤은 안 팔린다');
    for (const d of Object.keys(p.sales || {})) assert.ok(monsSoldOn(p.sales, d) <= SELL_MON_MAX);
    assert.ok(!p.sales[CLOSED], '장이 안 서는 날 기록 없음');
  }
});

test('🔌 화면·저장 연결: 장날에만 가판대 · 두 번 눌러야 · 판정은 저장된 프로필 · 저장 실패는 못 판 것 · 날짜는 누를 때마다 · 📊 · 앱 셸', () => {
  const x = src('js/xp.js');
  assert.match(x, /export async function sellThing\(req\) \{\s*const r = await runProfileOp\(\(\) => applySell\(req, \(stored\) => sellCtx\(stored\)\), \(\) => \(\{ ok: false, why: 'save' \}\)\);/);
  assert.match(x, /sales: copySales\(p\.sales\) \};/, '창의 프로필도 판 기록을 읽는다');
  assert.match(src('js/evolve.js'), /- tradedOf\(mon\) - soldOf\(mon\) - rocketHeldOf\(mon\)\);/, '보유에서 판 수를 뺀다');
  assert.match(src('js/db.js'), /for \(const k of \['fused', 'unfused', 'fled', 'traded', 'sold', 'stolen', 'back'\]\)/, '병합에서 판 수는 max');
  assert.match(src('js/db.js'), /out\.sales = mergeSales\(cur\.sales, rec\.sales\);/);
  const mv = src('js/marketview.js');
  assert.match(mv, /body\.appendChild\(tradeCard\(\)\);\s*body\.appendChild\(sellCard\(\)\);/, '장날에만 (교환 상인 다음) — 줄바꿈은 \\s로 (CRLF로 받아도)');
  assert.match(mv, /if \(!sameSell\(ui\.slArm, day, kind, id, price, Date\.now\(\)\)\) \{\s*ui\.slArm = \{ day, kind, id, price, at: Date\.now\(\) \};/, '첫 번째 누름은 "한 번 더"만');
  assert.match(mv, /return !!arm && arm\.day === day && arm\.kind === kind && arm\.id === id && arm\.price === price && now - arm\.at < 5000;/, '같은 것·같은 값을 5초 안에 (Codex 32차 #5)');
  assert.match(mv, /async function doSell\(kind, id, price\) \{\s*if \(ui\.busy\) return;\s*const day = dayNow\(\);/, '누를 때마다 오늘을 다시 읽는다');
  assert.match(mv, /if \(!stillOpen\(day\)\) \{ saySell\('🏪 장이 닫혔어요 — 다음 장날에 팔 수 있어요'\)/);
  assert.match(mv, /if \(ui\.slSay\) card\.appendChild\(el\('p', 'sl-msg', ui\.slSay\)\);/, '창 맨 위 알림 줄은 가판대에서 안 보인다 — 가판대 안에도 (헤드리스가 잡음)');
  assert.ok(!/say\(/.test(mv.slice(mv.indexOf('async function doSell'), mv.indexOf('async function doFuse'))), '팔기 말은 모두 saySell로');
  assert.match(mv, /ui\.slTab = 'mon'; ui\.slArm = null;/, '창을 열 때 "한 번 더"를 비운다');
  assert.match(mv, /\$\('market-stones'\)\.textContent = `💰 \$\{coins\(\)\} · /, '판 코인이 바로 보인다');
  const st = src('js/stats.js');
  assert.match(st, /const sold = salesReport\(salesByDay\(\), monKo, 3\);/);
  assert.match(st, /card\('🏪 5일장에서 판 것'\)/);
  // 한도를 말하는 글은 모두 SELL_MON_MAX로 — 숫자를 글에 적어 두면 한도를 바꿀 때 글만 옛 숫자로 남는다 (5 → 10, v191)
  assert.match(st, /장날마다 포켓몬은 \$\{SELL_MON_MAX\}마리까지예요/, '📊 안내');
  assert.equal((mv.match(/오늘은 포켓몬을 \$\{SELL_MON_MAX\}마리 팔았어요/g) || []).length, 2, '5일장 가판대·팔기 말');
  for (const [name, s] of [['marketview', mv], ['stats', st]]) assert.ok(!/포켓몬은? ?\d+마리|\d+마리까지|\d+마리 팔았/.test(s), `${name}에 한도 숫자를 글로 적었다`);
  assert.match(src('sw.js'), /'\.\/js\/sell\.js',/);
});

// ───────── 🔍 Codex 32차 (2026-10-05) — 💰 팔기가 생겨 "창이 기억하는 가방"의 구멍이 코인이 됐다 ─────────

test('🔍 Codex 32차 #1 — 💠 메가스톤 빼기는 저장된 기록으로: 두 창이 같이 빼도 하나만 돌아온다 → 팔아도 300 한 번', () => {
  const stored = prof({ caught: { 94: 1 }, mons: { 94: { mega: true } } });
  assert.deepEqual(unmegaRule(stored, 94), { ok: true }, '창 A');
  assert.deepEqual(unmegaRule(stored, 94), { ok: false, why: 'none' }, '창 B는 이미 빠진 것을 본다');
  assert.deepEqual([stored.items.megastone, stored.mons[94].mega], [1, false]);
  assert.equal(sell(stored, 'item', 'megastone').coins, 300);
  assert.deepEqual(sell(stored, 'item', 'megastone'), { ok: false, why: 'none' }, '두 번째는 없다');
  assert.deepEqual(unmegaRule(prof({}), 94), { ok: false, why: 'none' }, '기록이 없는 포켓몬');
  const x = src('js/xp.js');
  assert.match(x, /const r = await runProfileOp\(\(\) => applyUnmega\(id\), \(pf\) => unmegaRule\(pf, id\)\);\s*return !!\(r && \(r\.ok \|\| r\.why === 'none'\)\);/);
  assert.ok(!/addDelta\(\{ items: \{ \[MEGASTONE\.id\]: 1 \}/.test(x), '창이 기억하는 "끼워져 있음"으로 돌려주는 증분이 없다');
});

test('🔍 Codex 32차 #2 — 🎨 염색은 저장된 기록으로: 다른 창에서 판 염색약은 못 쓴다 · 데리고 있는 것만 · 이로치는 안 됨', () => {
  const stored = prof({ caught: { 25: 1 }, items: { red: 1 } });
  assert.equal(sell(stored, 'item', 'red').ok, true, '창 A가 판다');
  assert.deepEqual(dyeRule(stored, 25, 'red'), { ok: false, why: 'item' }, '창 B의 옛 가방으로는 못 쓴다');
  assert.equal(stored.mons[25], undefined, '색도 안 바뀐다');
  const q = prof({ caught: { 25: 1 }, items: { red: 2 } });
  assert.deepEqual(dyeRule(q, 7, 'red'), { ok: false, why: 'caught' }, '안 잡은 꼬부기');
  assert.deepEqual(dyeRule(q, 25, 'cap'), { ok: false, why: 'kind' }, '장식은 염색약이 아니다');
  assert.deepEqual(dyeRule(q, 25, 'red'), { ok: true });
  assert.deepEqual([q.items.red, q.mons[25].dye], [1, 'red']);
  assert.deepEqual(dyeRule(q, 25, 'red'), { ok: true, same: true }, '같은 색이면 안 쓴다');
  assert.equal(q.items.red, 1);
  assert.deepEqual(dyeRule(q, 25, null), { ok: true }, '원래 색으로는 공짜');
  assert.deepEqual([q.items.red, q.mons[25].dye], [1, null]);
  const sh = prof({ caught: { 25: 1 }, items: { red: 1 }, mons: { 25: { shiny: true } } });
  assert.deepEqual(dyeRule(sh, 25, 'red'), { ok: false, why: 'shiny' }, '저장된 기록의 이로치 (Codex 8차 #1)');
  assert.equal(sh.items.red, 1);
  const gone = prof({ caught: { 7: 1 }, items: { red: 1 }, mons: { 7: { sold: 0, traded: 1 } } });
  assert.deepEqual(dyeRule(gone, 7, 'red'), { ok: false, why: 'caught' }, '상인에게 보내 지금은 없다');
  assert.match(src('js/xp.js'), /const r = await runProfileOp\(\(\) => applyDyeTx\(monId, dyeId\), \(pf\) => dyeRule\(pf, monId, dyeId\)\);/);
  const sh2 = src('js/shop.js');
  assert.match(sh2, /async \(\) => change\(await applyDye\(mon\.id, null\), '원래 색으로 돌아왔어요'\)/);
  assert.match(sh2, /change\(await applyDye\(mon\.id, d\.id\),/);
});

test('🔍 Codex 32차 #3 — 저장 시각은 늘 직전보다 크다: 시계가 뒤로 가도 판 쪽이 "나중"이라 코인·판 기록·보유가 함께 간다', () => {
  assert.equal(nextStamp({ updatedAt: 2000 }, 1000), 2001, '시계가 뒤로 가도 앞으로');
  assert.equal(nextStamp({ updatedAt: 2000 }, 5000), 5000);
  assert.equal(nextStamp(null, 5000), 5000);
  assert.equal(nextStamp({ updatedAt: 'x' }, 5), 5);
  // Codex 재현: 백업(2000) → 시계가 뒤로 → 판매가 1000으로 저장되던 것이 이제 2001
  const id = ofRarity(1)[0];
  const backup = prof({ caught: { [id]: 2 }, coins: 0, updatedAt: 2000 });
  const now = cloneProfile(backup);
  assert.equal(sell(now, 'mon', id, OPEN, 1000).ok, true);
  now.updatedAt = nextStamp(backup, 1000);
  for (const [a, b] of [[now, backup], [backup, now]]) {
    const m = mergeStatRecord('profile', a, b);
    assert.deepEqual([m.coins, monsSoldOn(m.sales, OPEN), haveOf(m.caught[id], m.mons[id])], [10, 1, 1], '코인·판 기록·보유가 함께');
  }
  const db = src('js/db.js');
  assert.equal((db.match(/updatedAt = nextStamp\(/g) || []).length, 6, 'mutateProfile · applyExtend · updateMath · updateMathAndProfile(수학·프로필) · 🚀 applyRocketAdmit(Codex 43차)');
  assert.ok(!/(next|p|m)\.updatedAt = Date\.now\(\);/.test(db), 'Date.now()를 그대로 쓰는 프로필 저장이 남지 않았다');
});

test('🔍 Codex 32차 #5 — 두 번 누르는 사이 값이 바뀌면 안 판다(보여 준 값과 다름) · 값 없이 부르면 예전처럼', () => {
  const id = ofRarity(1)[0];
  const p = prof({ caught: { [id]: 3 }, mons: { [id]: { rarity: 4 } }, items: { crown: 1 } });
  assert.deepEqual(sellRule(p, { day: OPEN, kind: 'mon', id, price: 150 }, sellCtx(p)), { ok: true, kind: 'mon', id, coins: 150 });
  p.mons[id] = { ...p.mons[id], rarity: 1 }; // 아빠가 다른 창에서 ⭐로 되돌렸다
  assert.deepEqual(sellRule(p, { day: OPEN, kind: 'mon', id, price: 150 }, sellCtx(p)), { ok: false, why: 'price', price: 10 });
  assert.equal(have(p, id), 2, '안 팔렸다');
  assert.equal(p.coins, 150);
  assert.deepEqual(sellRule(p, { day: OPEN, kind: 'item', id: 'crown', price: 999 }, CTX), { ok: false, why: 'price', price: 50 });
  assert.equal(p.items.crown, 1);
  assert.equal(sellRule(p, { day: OPEN, kind: 'item', id: 'crown', price: 50 }, CTX).ok, true);
  assert.equal(sellRule(p, { day: OPEN, kind: 'mon', id }, sellCtx(p)).coins, 10, '값을 안 주면 지금 값으로 (옛 호출)');
  const mv = src('js/marketview.js');
  assert.match(mv, /const r = await sellThing\(\{ day, kind, id, price \}\);/);
  assert.match(mv, /r\.why === 'price' \? `값이 바뀌었어요 \(지금 💰 \$\{r\.price\}\) — 다시 두 번 눌러요`/);
});

test('🔍 Codex 32차 #8 — 키스톤을 팔아도 끼운 메가스톤은 뺄 수 있다 · 못 뺐으면 뺐다고 말하지 않는다', () => {
  const sh = src('js/shop.js');
  const i = sh.indexOf('  if (forms.mega) {');
  const blk = sh.slice(i, sh.indexOf('  if (forms.gmax) {', i));
  const a = blk.indexOf('if (megaOn) {'), b = blk.indexOf("'메가스톤 빼기'"), c = blk.indexOf('} else if (!hasKeystone()) {');
  assert.ok(a > 0 && a < b && b < c, '끼워져 있으면 키스톤을 묻기 전에 빼기 버튼');
  assert.match(blk, /change\(await equipMega\(mon\.id, false\), '💠 메가스톤을 뺐어요'\)/);
  assert.equal(sell(prof({ items: { keystone: 1 } }), 'item', 'keystone').coins, 300);
});

test('🔍 Codex 32차 ⑨ — 가방 볼도 던지기 전에 저장소에서 먼저 쓴다: 다른 창에서 판 하이퍼볼은 못 던진다 · 미리 쓴 볼은 판정이 또 빼지 않는다', async () => {
  const stored = prof({ items: { ultraball: 1 } });
  assert.equal(sell(stored, 'item', 'ultraball').coins, 300, '창 A가 판다');
  assert.equal(purchaseRule(stored, { coins: 0, items: { ultraball: 1 } }, {}).ok, false, '창 B가 던지려고 쓰기 → 이미 없다');
  addItem('ultraball', 1);
  const paid = catchAttempt(150, () => 0.999999, { ball: 'ultraball', paid: 'ultraball' });
  assert.equal(paid.ball, 'ultraball', '미리 쓴 볼로 던진다');
  assert.equal(inventory().ultraball, 1, '판정은 또 빼지 않는다 (이미 저장소에서 뺐다)');
  const wrong = catchAttempt(150, () => 0.999999, { ball: 'ultraball', paid: 'greatball' });
  assert.equal(wrong.ball, 'pokeball', '미리 쓴 것과 다른 볼은 못 쓴다');
  assert.equal(inventory().ultraball, 1);
  const old = catchAttempt(150, () => 0.999999, { ball: 'ultraball' });
  assert.equal(old.ball, 'ultraball', '미리 안 쓴 호출(옛 길)은 창의 가방에서');
  assert.equal(inventory().ultraball, undefined);
  assert.equal(await spendBall('ultraball'), false, '저장이 안 되면 못 쓴 것');
  assert.equal(await spendBall('pokeball'), false, '몬스터볼은 공짜 — 미리 쓰지 않는다');
  assert.equal(await spendBall('crown'), false, '볼이 아니다');
  const t = src('js/catch.js').slice(src('js/catch.js').indexOf('async function throwBall('));
  assert.ok(t.indexOf('await spendBall(ballId)') > 0 && t.indexOf('await spendBall(ballId)') < t.indexOf('await sleep('), '연출 전에 쓴다');
  assert.match(t, /이제 가방에 없어요 \(다른 화면에서 썼거나 팔았어요\) — 볼을 다시 골라요/);
  assert.match(t, /const giveBack = \(\) => \{ if \(paid\) refundBall\(paid\)\.catch\(\(\) => \{\}\); \};/, '못 던지고 닫히면 돌려준다');
  assert.match(src('js/xp.js'), /const spent = ballItem\.free \|\| \(opts\.paid \? opts\.paid === ballItem\.id : \(!ballItem\.unique && consumeItem\(ballItem\.id\)\)\);/);
});
