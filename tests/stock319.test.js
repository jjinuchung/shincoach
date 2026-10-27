// v319 (2026-10-22 진우 제안 → 아버님 "너의 제안대로 이 방향으로 만들어 보자") — node --test tests/stock319.test.js
//  🏦 포켓몬 증권시장 — "느리고, 작고, 까닭이 보이게": 하루 한 번 값 · 다음 장 체결 · 산 뒤 3장 · 수수료 1% · 가진 것의 30%까지 · 배당 · 📤 usage/stock.md
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  STOCK, ASSETS, COMPANIES, BUY_WHY, SELL_WHY, CAP_CHOICES, stockCapOf, newStock, stockOf, copyStock, stockSync, addDays, daysBetween,
  sharesOf, sellableOf, holdValue, reserved, reserveFor, roomOf, feeOf, stockStartRule, stockOpenRule, stockBuyRule, stockSellRule,
  stockCancelRule, changePct, eventLine, positionOf, pxText, stockMd, studySecOf,
} from '../js/stock.js';
import { cloneProfile, mergeStatRecord, getProfile } from '../js/db.js';
import { initProfile, houseDo, coins } from '../js/xp.js';
import { gatherFiles, usageFiles } from '../js/upload.js';
import { PLACES, OVERLAYS } from '../js/usage.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const D0 = '2026-11-01';
const prof = (coins = 1000, seed = 7) => ({ coins, stock: newStock(seed, D0) });
/** 날마다 공부 15분 — 장은 그날 공부를 STOCK.studySec초 한 날에만 열린다 (Codex 125차 #3) */
const FULL = () => STOCK.studySec;
/** 장 k개 지나게 (하루씩) */
function pass(p, k, from) {
  let d = from || p.stock.date;
  for (let i = 0; i < k; i++) { d = addDays(d, 1); stockSync(p, d, FULL); }
  return d;
}

before(async () => {
  await getProfile(); // 가짜 저장소 열기
  await initProfile();
});

// ───────────────────── 시장 · 장 열기 ─────────────────────

test('🏦 회사 다섯 + 📦 펀드 · 처음 값 100.0 · 까닭 보기 넷씩 · 한도 보기 · 이모지는 오래된 것만(태블릿에 없는 Emoji 13 금지)', () => {
  assert.equal(COMPANIES.length, 5);
  assert.equal(ASSETS.length, 6);
  assert.equal(new Set(ASSETS.map((a) => a.id)).size, 6);
  assert.ok(COMPANIES.every((c) => c.good.length >= 3 && c.bad.length >= 3 && c.beta > 0 && c.vol > 0 && c.div >= 0));
  assert.equal(pxText(STOCK.startPx), '100.0');
  assert.deepEqual([BUY_WHY.length, SELL_WHY.length], [4, 4]);
  assert.deepEqual([stockCapOf(20), stockCapOf(35), stockCapOf('50'), stockCapOf(undefined)], [20, STOCK.capPct, 50, STOCK.capPct]);
  assert.ok(CAP_CHOICES.includes(STOCK.capPct));
  assert.deepEqual([STOCK.capPct, CAP_CHOICES], [40, [10, 20, 30, 40, 50]], '기본 40% (v351 아버님 — 30이었다)');
  for (const a of ASSETS) assert.ok(!/[\u{1FAA8}\u{1FAB4}\u{1FA9F}\u{1FAB5}]/u.test(a.emoji), `${a.name} 이모지 ${a.emoji}`);
});

test('📅 장은 새 날에만 · 같은 날은 그대로 · 빠진 날은 7장까지 · 시계가 뒤로 가면 아무 일도 없다 · 같은 씨앗이면 같은 값', () => {
  const p = prof();
  assert.equal(stockSync(p, D0, FULL).opened, 0, '같은 날');
  assert.equal(stockSync(p, addDays(D0, 1), FULL).opened, 1);
  assert.equal(p.stock.day, 1);
  assert.equal(stockSync(p, addDays(D0, 1), FULL).opened, 0, '같은 날 다시 열어도');
  assert.equal(stockSync(p, addDays(D0, 4), FULL).opened, 3);
  assert.equal(stockSync(p, addDays(D0, 60), FULL).opened, STOCK.catchUp, '빠진 날은 7장까지만');
  assert.equal(p.stock.date, addDays(D0, 60));
  const before = JSON.parse(JSON.stringify(p.stock));
  assert.equal(stockSync(p, addDays(D0, 10), FULL).opened, 0, '시계를 뒤로 돌려도 열린 장은 그대로');
  assert.deepEqual(JSON.parse(JSON.stringify(p.stock)), before);
  // 따라잡은 장의 기록 날짜는 오늘에서 거슬러 하루씩
  const q = prof(1000, 9);
  stockSync(q, addDays(D0, 3), FULL);
  assert.equal(q.stock.day, 3);
  // 같은 씨앗 = 같은 값 · 다른 씨앗 = 다른 값
  const a = prof(0, 42); const b = prof(0, 42); const c = prof(0, 43);
  pass(a, 20); pass(b, 20); pass(c, 20);
  assert.deepEqual(a.stock.px, b.stock.px);
  assert.notDeepEqual(a.stock.px, c.stock.px);
  assert.equal(daysBetween('2026-12-30', '2027-01-02'), 3);
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
});

test('📚 장은 그날 공부를 15분 한 날에만 — 시계를 7일씩 50번 앞으로 돌려도 공부가 없으면 장 0 · 날마다 따로 · 한 날은 한 번 (Codex 125차 #3)', () => {
  // Codex 재현: 💰10,000 · 잠만보 20주 주문 → 시계를 7일씩 50번 → 350장·배당 💰1,905 · "산 뒤 3장"도 건너뜀
  const p = prof(10000, 3);
  assert.equal(stockBuyRule(p, D0, { co: 'snorlax', n: 20, why: 'good' }, FULL).ok, true);
  const c0 = p.coins;
  let d = D0;
  for (let k = 0; k < 50; k++) {
    d = addDays(d, 7);
    stockSync(p, d, {});
    stockSync(p, d);
    assert.equal(stockOpenRule(p, d, () => STOCK.studySec - 1).why, 'same');
  }
  assert.deepEqual([p.stock.day, p.coins, p.stock.orders.length], [0, c0, 1], '공부가 없거나 15분이 안 되면 장도 체결도 배당도 없다');
  // 공부한 날만 장 하나씩 (오래된 날부터) · 하루에 1시간 해도 장은 하나
  const q = prof(1000, 4);
  const study = { [addDays(D0, 1)]: 900, [addDays(D0, 2)]: 899, [addDays(D0, 3)]: 3600, [addDays(D0, 5)]: 901 };
  assert.equal(stockSync(q, addDays(D0, 5), study).opened, 3, '1·3·5일만 (2일은 14분 59초 · 4일은 공부 없음)');
  assert.equal(q.stock.date, addDays(D0, 5));
  // 오늘 아직이면 어제까지만 — 오늘 공부하면 그때 오늘 장
  const s = prof(1000, 4);
  assert.equal(stockSync(s, addDays(D0, 2), { [addDays(D0, 1)]: 900 }).opened, 1);
  assert.equal(s.stock.date, addDays(D0, 1), '열린 날까지만 간다');
  assert.equal(stockSync(s, addDays(D0, 2), { [addDays(D0, 1)]: 900 }).opened, 0, '어제 장은 한 번만');
  assert.equal(stockSync(s, addDays(D0, 2), { [addDays(D0, 2)]: 900 }).opened, 1, '오늘 15분 → 오늘 장');
  assert.equal(stockSync(s, addDays(D0, 2), FULL).opened, 0, '오늘 장도 한 번만');
  // 7일 넘게 지난 날은 따라잡지 않고, 시계를 뒤로 돌린 날에 공부해도 지난 장보다 앞이면 안 열린다
  const t = prof(1000, 4);
  assert.equal(stockSync(t, addDays(D0, 30), FULL).opened, STOCK.catchUp);
  assert.equal(stockSync(t, addDays(D0, 20), FULL).opened, 0);
  // 하루 기록 → 공부한 초 (수학·영어·국어 화면에 머문 초만)
  assert.equal(studySecOf({ mathTime: 300, enTime: 200, korTime: 400, gamePlays: 9, uStock: 999, mathBonus: 600 }), 900);
  assert.deepEqual([studySecOf(null), studySecOf('x'), studySecOf({ mathTime: -5, enTime: 'x', korTime: 1.5 })], [0, 0, 0]);
});

test('📈 값 — 회사는 한 장에 ±8%까지 · 5.0 아래로 안 감 · 펀드는 다섯 회사 오른 비율의 평균 · 흐름은 40장까지', () => {
  for (let seed = 1; seed <= 300; seed++) {
    const p = prof(0, seed * 101);
    let prev = { ...p.stock.px };
    let d = D0;
    for (let k = 0; k < 60; k++) {
      d = addDays(d, 1);
      stockSync(p, d, FULL);
      const rets = COMPANIES.map((c) => p.stock.px[c.id] / prev[c.id] - 1);
      for (const r of rets) assert.ok(Math.abs(r) <= STOCK.dayClamp + 0.002, `한 장 ${r}`);
      const f = p.stock.px.fund / prev.fund - 1;
      assert.ok(Math.abs(f - rets.reduce((a, x) => a + x, 0) / rets.length) < 0.003, '펀드는 평균');
      assert.ok(Object.values(p.stock.px).every((x) => x >= STOCK.minPx));
      prev = { ...p.stock.px };
    }
    assert.ok(Object.values(p.stock.hist).every((h) => h.length <= STOCK.histLen));
    assert.ok(p.stock.news.length <= STOCK.newsLen);
  }
});

test('🧱 값은 5.0 아래로 안 간다 — 바닥 가까이에서 시작해도 (씨앗 200 · 60장)', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const p = prof(0, seed * 31);
    for (const id of Object.keys(p.stock.px)) { p.stock.px[id] = STOCK.minPx + 5; p.stock.hist[id] = [STOCK.minPx + 5]; }
    let d = D0;
    for (let k = 0; k < 60; k++) {
      d = addDays(d, 1);
      stockSync(p, d, FULL);
      assert.ok(Object.values(p.stock.px).every((x) => x >= STOCK.minPx), `씨앗 ${seed} 장 ${k}`);
    }
  }
});

test('💰 수수료 1%(올림 · 최소 💰1) · 더 투자할 수 있는 코인 = (코인 + 주식 값 + 묶인 코인) × 한도 − (주식 값 + 묶인 코인)', () => {
  assert.deepEqual([feeOf(0), feeOf(50), feeOf(100), feeOf(150), feeOf(1000), feeOf(1001)], [1, 1, 1, 2, 10, 11]);
  assert.equal(reserveFor(1000, 2), 220 + 3, '200 × 1.1 = 220 + 수수료 3');
  const st = newStock(1, D0);
  st.hold.pika = [{ n: 10, s: 0, cost: 1010 }]; // 주식 값 1000
  assert.equal(holdValue(st), 1000);
  assert.equal(roomOf(st, 2000, 30), 0, '(2000 + 1000) × 30% = 900 < 주식 값 1000');
  assert.equal(roomOf(st, 2000), 200, '기본 40%(v351 아버님): (2000 + 1000) × 40% − 1000');
  assert.equal(roomOf(st, 6000, 30), 1100, '(6000 + 1000) × 30% − 1000');
  st.orders.push({ id: 1, kind: 'buy', co: 'onix', n: 1, at: 0, reserve: 100, why: 'good', drop: false });
  assert.equal(roomOf(st, 6000, 30), Math.floor(7100 * 0.3) - 1100, '묶인 코인도 투자에 든다');
  assert.equal(roomOf(st, 6000), Math.floor(7100 * 0.4) - 1100, '기본 40%');
  assert.equal(roomOf(st, 6000, 50), Math.min(6000, Math.floor(7100 * 0.5) - 1100), '부모가 고른 한도');
  assert.equal(roomOf(newStock(1, D0), 100, 50), 50);
});

test('🧮 오래 들고 나눠 담으면 덜 잃는다 (씨앗 1500 · 60장) · 기대 수익은 작게(공부 코인을 넘보지 않게)', () => {
  const lose = Object.fromEntries(ASSETS.map((a) => [a.id, 0]));
  let fundMean = 0;
  for (let seed = 1; seed <= 1500; seed++) {
    const p = prof(0, seed * 7919);
    pass(p, 60);
    for (const a of ASSETS) if (p.stock.px[a.id] < STOCK.startPx) lose[a.id]++;
    fundMean += p.stock.px.fund / STOCK.startPx - 1;
  }
  fundMean /= 1500;
  const worstCompany = Math.min(...COMPANIES.map((c) => lose[c.id]));
  assert.ok(lose.fund < worstCompany * 0.6, `펀드 잃은 수 ${lose.fund} · 회사 가장 적게 ${worstCompany}`);
  assert.ok(fundMean > 0 && fundMean < 0.2, `60장 펀드 평균 ${fundMean}`);
});

test('🧮 경제 — 💰5,000에서 한도까지 한 종목을 사서 60장 들고 팔아도(배당·수수료·묶음까지) 장 하나에 버는 코인은 공부 15분 몫보다 훨씬 작다 (씨앗 400 · Codex 125차 #5)', () => {
  const STUDY15 = 60; // 영어 15분 ≈ 💰60 (⏳ 연장권 값을 정할 때 잰 것) — 장 하나를 열려면 공부 15분
  for (const cap of [30, 50]) {
    for (const a of ASSETS) {
      const per = [];
      for (let seed = 1; seed <= 400; seed++) {
        const p = prof(5000, seed * 7919);
        const n = Math.floor(roomOf(p.stock, p.coins, cap) / reserveFor(p.stock.px[a.id], 1));
        assert.equal(stockBuyRule(p, D0, { co: a.id, n, why: 'good', capPct: cap }, FULL).ok, true);
        let d = pass(p, 60);
        assert.equal(stockSellRule(p, d, { co: a.id, n: sharesOf(p.stock, a.id), why: 'need' }, FULL).ok, true);
        d = pass(p, 1, d);
        assert.equal(sharesOf(p.stock, a.id) + reserved(p.stock), 0, '다 팔고 묶인 코인도 없다');
        per.push((p.coins - 5000) / 61);
      }
      per.sort((x, y) => x - y);
      const mean = per.reduce((x, y) => x + y, 0) / per.length;
      const p95 = per[Math.floor(0.95 * (per.length - 1))];
      const [lm, lp] = cap === 30 ? [STUDY15 / 10, STUDY15 / 3] : [STUDY15 / 6, STUDY15 / 2];
      assert.ok(mean < lm && p95 < lp, `한도 ${cap}% ${a.id}: 장당 평균 💰${mean.toFixed(1)} · 상위 5% 💰${p95.toFixed(1)}`);
    }
  }
});

// ───────────────────── 주문 · 체결 ─────────────────────

test('🛒 사기 — 다음 장 값으로 · 지금 코인을 묶고 남으면 돌려줌 · 수수료 · 한 회사에 기다리는 주문 하나 · 까닭 필수 · 코인·한도', () => {
  const p = prof(1000);
  assert.equal(stockBuyRule(p, D0, { co: 'pika', n: 1, why: '' }, FULL).why, 'why');
  assert.equal(stockBuyRule(p, D0, { co: 'nope', n: 1, why: 'good' }, FULL).why, 'bad');
  assert.equal(stockBuyRule(p, D0, { co: 'pika', n: 0, why: 'good' }, FULL).why, 'bad');
  assert.equal(stockBuyRule(p, D0, { co: 'pika', n: 3, why: 'good', on: false }, FULL).why, 'off');
  // 한도: 가진 것 1000의 40%(기본 — v351) = 400 → 4주(예약 💰440+수수료)는 넘는다 · 30%를 고르면 300 → 3주(💰330+수수료)도 넘는다
  assert.equal(roomOf(p.stock, p.coins), 400);
  assert.equal(roomOf(p.stock, p.coins, 30), 300);
  assert.equal(stockBuyRule(p, D0, { co: 'pika', n: 4, why: 'good' }, FULL).why, 'cap');
  assert.equal(stockBuyRule(p, D0, { co: 'pika', n: 3, why: 'good', capPct: 30 }, FULL).why, 'cap');
  const r = stockBuyRule(p, D0, { co: 'pika', n: 2, why: 'good' }, FULL);
  assert.equal(r.ok, true);
  assert.equal(r.reserve, reserveFor(STOCK.startPx, 2));
  assert.equal(p.coins, 1000 - r.reserve);
  assert.equal(stockBuyRule(p, D0, { co: 'pika', n: 1, why: 'good' }, FULL).why, 'pending');
  assert.equal(sharesOf(p.stock, 'pika'), 0, '아직 안 샀다');
  // 다음 장 — 그 장 값으로 사고 남은 코인을 돌려받는다
  stockSync(p, addDays(D0, 1), FULL);
  const px = p.stock.px.pika;
  const c = Math.ceil((px * 2) / 10);
  assert.equal(sharesOf(p.stock, 'pika'), 2);
  assert.equal(p.coins, 1000 - (c + feeOf(c)), '낸 코인 = 다음 장 값 × 2 + 수수료');
  assert.equal(p.stock.orders.length, 0);
  assert.deepEqual(p.stock.hold.pika.map((l) => [l.n, l.s]), [[2, 1]]);
  // 코인이 모자라면
  const poor = prof(50);
  assert.equal(stockBuyRule(poor, D0, { co: 'snorlax', n: 1, capPct: 50, why: 'good' }, FULL).why, 'coins');
});

test('💸 팔기 — 산 뒤 3장이 지나야 · 가진 것보다 못 팖 · 오래된 것부터 · 수수료 빼고 받음 · 묶은 주식은 또 못 팖', () => {
  const p = prof(2000);
  stockBuyRule(p, D0, { co: 'snorlax', n: 4, why: 'good' }, FULL);
  let d = addDays(D0, 1);
  stockSync(p, d, FULL); // 장 1에 삼
  assert.equal(sellableOf(p.stock, 'snorlax'), 0);
  assert.equal(stockSellRule(p, d, { co: 'snorlax', n: 1, why: 'up' }, FULL).why, 'hold');
  d = pass(p, 2, d); // 장 3
  assert.equal(stockSellRule(p, d, { co: 'snorlax', n: 1, why: 'up' }, FULL).why, 'hold', '장 3은 아직(1 + 3 = 4부터)');
  d = pass(p, 1, d); // 장 4
  assert.equal(sellableOf(p.stock, 'snorlax'), 4);
  assert.equal(stockSellRule(p, d, { co: 'snorlax', n: 5, why: 'up' }, FULL).why, 'hold', '가진 것보다 많이');
  assert.equal(stockSellRule(p, d, { co: 'snorlax', n: 1, why: '' }, FULL).why, 'why');
  const c0 = p.coins;
  assert.equal(stockSellRule(p, d, { co: 'snorlax', n: 3, why: 'need' }, FULL).ok, true);
  assert.equal(sellableOf(p.stock, 'snorlax'), 1, '주문에 묶인 3주는 빼고');
  assert.equal(p.coins, c0, '팔기 주문은 코인을 묶지 않는다');
  d = pass(p, 1, d);
  const px = p.stock.px.snorlax;
  const g = Math.floor((px * 3) / 10);
  assert.equal(sharesOf(p.stock, 'snorlax'), 1);
  assert.ok(p.coins >= c0 + g - feeOf(g), '수수료 빼고 받음 (배당이 같이 올 수 있다)');
});

test('↩️ 취소 — 사기는 묶은 코인을 다 돌려줌 · 팔기는 다시 팔 수 있게 · 다른 창이 처리했으면 changed', () => {
  const p = prof(1000);
  const r = stockBuyRule(p, D0, { co: 'onix', n: 1, why: 'news' }, FULL);
  const id = p.stock.orders[0].id;
  assert.equal(stockCancelRule(p, D0, id, FULL).ok, true);
  assert.equal(p.coins, 1000, `묶은 💰${r.reserve} 그대로`);
  assert.equal(stockCancelRule(p, D0, id, FULL).why, 'changed');
  stockBuyRule(p, D0, { co: 'onix', n: 1, why: 'news' }, FULL);
  const id2 = p.stock.orders[0].id;
  const late = stockCancelRule(p, addDays(D0, 1), id2, FULL);
  assert.deepEqual([late.ok, late.refused, late.opened], [true, 'changed', 1], '새 날이면 이미 체결 — 취소는 안 되지만 연 장은 저장(ok + refused)');
  assert.equal(sharesOf(p.stock, 'onix'), 1);
  assert.equal(late.events[0].kind, 'buy');
});

test('💝 배당 — 5장마다 가진 것의 값 × 배당률 · 💰1 아래는 없음 · 리자몽 항공은 없음', () => {
  const p = prof(100000, 3);
  stockBuyRule(p, D0, { co: 'snorlax', n: 50, why: 'good', capPct: 50 }, FULL);
  stockBuyRule(p, D0, { co: 'charizard', n: 50, why: 'good', capPct: 50 }, FULL);
  let d = addDays(D0, 1);
  stockSync(p, d, FULL); // 장 1
  const c1 = p.coins;
  d = pass(p, 3, d); // 장 4 — 아직
  assert.equal(p.coins, c1);
  const ev = stockSync(p, addDays(d, 1), FULL).events; // 장 5
  const divs = ev.filter((e) => e.kind === 'div');
  assert.deepEqual(divs.map((e) => e.co), ['snorlax']);
  assert.equal(divs[0].coins, Math.floor(Math.floor((p.stock.px.snorlax * 50) / 10) * 0.01));
  assert.equal(p.coins, c1 + divs[0].coins);
  assert.ok(eventLine(divs[0]).includes('배당 💰'));
});

test('🎲 마구 눌러도 — 코인·주식은 음수가 안 되고, 묶인 코인은 체결·취소로 늘 풀리고, 한도를 넘는 주문은 안 들어간다 (씨앗 300)', () => {
  for (let seed = 1; seed <= 300; seed++) {
    let x = seed;
    const rand = () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; };
    const p = prof(500 + Math.floor(rand() * 5000), seed);
    let d = D0;
    for (let step = 0; step < 80; step++) {
      const a = ASSETS[Math.floor(rand() * ASSETS.length)];
      const k = rand();
      if (k < 0.35) d = addDays(d, 1 + Math.floor(rand() * 3));
      else if (k < 0.6) {
        stockSync(p, d, FULL); // 새 날이면 먼저 장을 열어 둔다 — 한도는 그 뒤의 값으로
        const before = roomOf(stockOf(p.stock), p.coins);
        const r = stockBuyRule(p, d, { co: a.id, n: 1 + Math.floor(rand() * 6), why: 'guess' }, FULL);
        if (r.ok) assert.ok(r.reserve <= before, '한도 안');
      } else if (k < 0.85) stockSellRule(p, d, { co: a.id, n: 1 + Math.floor(rand() * 4), why: 'need' }, FULL);
      else if (p.stock.orders.length) stockCancelRule(p, d, p.stock.orders[0].id, FULL);
      else stockSync(p, d, FULL);
      assert.ok(Number.isSafeInteger(p.coins) && p.coins >= 0, `코인 ${p.coins}`);
      for (const id of Object.keys(p.stock.hold)) assert.ok(p.stock.hold[id].every((l) => l.n > 0 && l.cost >= 0));
      for (const o of p.stock.orders) if (o.kind === 'sell') assert.ok(o.n <= sharesOf(p.stock, o.co));
    }
    stockSync(p, addDays(d, 1), FULL);
    assert.equal(reserved(p.stock), 0, '다음 장이 열리면 묶인 코인은 다 풀린다');
  }
});

// ───────────────────── 저장 · 병합 · 깨진 값 ─────────────────────

test('🧱 깨진 시장 값 — 읽을 때 칸마다 고치고, 아예 깨졌으면 시작 전으로 · 복사는 깊게', () => {
  assert.equal(stockOf(null), null);
  assert.equal(stockOf('bad'), null);
  assert.equal(stockOf({ date: 'x', px: {} }), null);
  const s = stockOf({ date: D0, px: { pika: 'x', fund: -5 }, hist: { pika: 'no' }, hold: { pika: [{ n: 2, s: 1, cost: 200 }, { n: -1 }, 'bad'] }, orders: [{ kind: 'buy', co: 'pika', n: 1, reserve: 120 }, { kind: 'steal', co: 'pika', n: 1 }], news: [{ co: 'zzz' }], seq: 1e30 });
  assert.equal(s.px.pika, STOCK.startPx);
  assert.equal(s.px.fund, STOCK.minPx);
  assert.deepEqual(s.hold.pika, [{ n: 2, s: 1, cost: 200 }]);
  assert.equal(s.orders.length, 1);
  assert.equal(s.news.length, 0);
  assert.equal(s.seq, 0, '안전하지 않은 큰 번호는 0');
  const a = newStock(1, D0);
  a.hold.pika = [{ n: 1, s: 0, cost: 100 }];
  const b = copyStock(a);
  b.hold.pika[0].n = 9; b.px.pika = 1; b.hist.pika.push(5); b.orders.push({});
  assert.deepEqual([a.hold.pika[0].n, a.px.pika, a.hist.pika.length, a.orders.length], [1, STOCK.startPx, 1, 0]);
  const p = cloneProfile({ coins: 5, stock: a });
  p.stock.px.pika = 2;
  assert.equal(a.px.pika, STOCK.startPx, 'cloneProfile도 깊게');
});

test('🔀 병합 — 시장은 코인과 같은 쪽(최근에 저장된 쪽)에서만 통째로 · 최근 쪽에 없거나 깨졌으면 시장도 없음 · 깨진 값으로 병합이 멈추지 않는다', () => {
  const s1 = newStock(1, D0); s1.hold.pika = [{ n: 3, s: 0, cost: 300 }];
  const s2 = newStock(2, D0);
  const old = { id: 'me', coins: 900, updatedAt: 10, stock: s1 };
  const neu = { id: 'me', coins: 500, updatedAt: 20, stock: s2 };
  for (const [a, b] of [[old, neu], [neu, old]]) {
    const m = mergeStatRecord('profile', a, b);
    assert.deepEqual([m.coins, m.stock.seed, sharesOf(stockOf(m.stock), 'pika')], [500, 2, 0], '코인과 시장이 같은 쪽');
  }
  const m2 = mergeStatRecord('profile', { id: 'me', updatedAt: 30, stock: 'bad' }, old);
  assert.ok(!('stock' in m2), '깨진 최근 쪽 = 시장 없음 (옛 쪽 시장을 붙이지 않는다)');
  const m3 = mergeStatRecord('profile', { id: 'me', updatedAt: 30, stock: [1] }, { id: 'me', updatedAt: 1, stock: 42 });
  assert.ok(!('stock' in m3));
  // 🔍 Codex 125차 #1 재현 — 옛 쪽: 💰1,000에서 펀드 1주 주문(💰888 + 묶음 112) · 최근 쪽: 💰1,000 · 시장 없음 → 합쳐 취소해도 💰1,000
  const o = prof(1000, 5);
  const r = stockBuyRule(o, D0, { co: 'fund', n: 1, why: 'good' }, FULL);
  assert.equal(o.coins + r.reserve, 1000);
  for (const [a, b] of [[{ id: 'me', updatedAt: 10, ...o }, { id: 'me', updatedAt: 20, coins: 1000 }], [{ id: 'me', updatedAt: 20, coins: 1000 }, { id: 'me', updatedAt: 10, ...o }]]) {
    const m = mergeStatRecord('profile', a, b);
    assert.ok(!('stock' in m), '최근 쪽에 시장이 없으면 시장도 없다');
    assert.equal(m.coins, 1000);
    assert.equal(stockCancelRule(m, D0, 1, FULL).why, 'none', '취소로 묶인 코인을 다시 받을 길이 없다');
    assert.equal(m.coins, 1000);
  }
});

test('💾 저장소 길 — houseDo로 시작·사기·취소가 한 트랜잭션 · 저장 실패면 코인도 시장도 그대로', async () => {
  const today = new Date();
  const p2 = (n) => String(n).padStart(2, '0');
  const t = `${today.getFullYear()}-${p2(today.getMonth() + 1)}-${p2(today.getDate())}`;
  // 코인 넣어 두기 (구호품처럼 저장된 프로필을 직접)
  const cur = await getProfile();
  await fakeIdb.put('profile', { ...(cur || { id: 'me' }), id: 'me', coins: 3000, updatedAt: Date.now() });
  await initProfile();
  assert.equal(coins(), 3000);
  assert.equal((await houseDo((p) => stockStartRule(p, t, 99))).ok, true);
  assert.equal((await houseDo((p) => stockStartRule(p, t, 98))).why, 'started');
  assert.equal((await houseDo((p) => stockOpenRule(p, t, FULL))).why, 'same');
  const r = await houseDo((p) => stockBuyRule(p, t, { co: 'fund', n: 5, why: 'good' }, FULL));
  assert.equal(r.ok, true);
  const saved = await getProfile();
  assert.equal(saved.coins, 3000 - r.reserve);
  assert.equal(saved.stock.orders.length, 1);
  assert.equal(coins(), 3000 - r.reserve, '메모리 프로필도 같이');
  fakeIdb.failNext('profile');
  const f = await houseDo((p) => stockCancelRule(p, t, saved.stock.orders[0].id, FULL));
  assert.equal(f.ok, false);
  const after = await getProfile();
  assert.deepEqual([after.coins, after.stock.orders.length], [3000 - r.reserve, 1], '저장이 안 되면 없던 일');
  assert.equal((await houseDo((p) => stockCancelRule(p, t, saved.stock.orders[0].id, FULL))).ok, true);
  assert.equal((await getProfile()).coins, 3000);
});

test('🌙 자정 뒤 취소·한도에 막힌 주문 — 주문은 안 돼도 그사이 연 장은 저장 · 장이 안 열렸으면 아무것도 안 씀 (저장소 길 · Codex 125차 #2)', async () => {
  const t = addDays(D0, 100);
  await fakeIdb.put('profile', { ...(await getProfile()), id: 'me', coins: 3000, stock: newStock(5, t), updatedAt: Date.now() });
  await initProfile();
  assert.equal((await houseDo((p) => stockBuyRule(p, t, { co: 'fund', n: 5, why: 'good' }, FULL))).ok, true);
  const id = (await getProfile()).stock.orders[0].id;
  // 화면을 열어 둔 채 자정을 넘겨 취소 — 규칙이 먼저 장을 열어 체결한다
  const c = await houseDo((p) => stockCancelRule(p, addDays(t, 1), id, FULL));
  assert.deepEqual([c.ok, c.refused, c.events.map((e) => e.kind)], [true, 'changed', ['buy']]);
  const s1 = await getProfile();
  assert.deepEqual([s1.stock.day, s1.stock.orders.length, sharesOf(stockOf(s1.stock), 'fund')], [1, 0, 5], '화면이 받은 체결 = 저장된 체결');
  assert.equal(s1.coins, 3000 - c.events[0].coins, '낸 코인 = 체결 값 (남은 묶음은 돌려받음)');
  assert.equal(coins(), s1.coins, '메모리 프로필도 같이');
  // 한도에 막힌 주문도 그사이 연 장은 저장
  const big = await houseDo((p) => stockBuyRule(p, addDays(t, 2), { co: 'pika', n: 10, why: 'guess' }, FULL));
  assert.deepEqual([big.ok, big.refused], [true, 'cap']);
  assert.equal((await getProfile()).stock.day, 2);
  // 장이 안 열렸으면(공부 없음) 거절은 아무것도 안 쓴다 · 일어난 일도 없다
  const before = await getProfile();
  const none = await houseDo((p) => stockBuyRule(p, addDays(t, 3), { co: 'pika', n: 10, why: 'guess' }, {}));
  assert.deepEqual([none.ok, none.why, none.events], [false, 'cap', undefined]);
  assert.equal((await getProfile()).updatedAt, before.updatedAt, '저장 안 함');
});

test('📊 최근 7장 집계는 장마다 따로 — 한 장에 주문·취소를 61번 해 기록 120줄이 잘려도 수는 그대로 · 오래된 장·깨진 칸은 버림 (Codex 125차 #4)', () => {
  const p = prof(100000, 8);
  for (let k = 0; k < 61; k++) {
    assert.equal(stockBuyRule(p, D0, { co: 'pika', n: 1, why: k % 2 ? 'guess' : 'news' }, FULL).ok, true);
    assert.equal(stockCancelRule(p, D0, p.stock.orders[0].id, FULL).ok, true);
  }
  assert.equal(p.stock.log.length, STOCK.logLen, '기록 줄은 120줄로 잘린다');
  assert.equal(p.coins, 100000);
  const md = stockMd(p.stock, p.coins, D0);
  assert.ok(md.includes('- 주문 61 (사기 61 · 팔기 0) · 취소 61'), md);
  assert.ok(md.includes('좋은 소식을 봐서 31') && md.includes('그냥 오를 것 같아서 30'));
  // 7장이 지나면 글에 안 셈 · tallyLen장이 지나면 집계도 지움
  let d = pass(p, 7);
  assert.ok(stockMd(p.stock, p.coins, d).includes('- 주문 0 (사기 0 · 팔기 0) · 취소 0'));
  stockBuyRule(p, d, { co: 'fund', n: 1, why: 'good' }, FULL);
  d = pass(p, STOCK.tallyLen, d);
  stockBuyRule(p, d, { co: 'pika', n: 1, why: 'good' }, FULL);
  assert.deepEqual(Object.keys(p.stock.tally), [String(p.stock.day)], '오래된 장 집계는 지움');
  // 깨진 집계 — 읽을 때 칸마다 고친다 (지금 장보다 뒤·오래된 장·모르는 까닭은 버림)
  const s = stockOf({ ...newStock(1, D0), day: 20, tally: { 20: { buy: 2, sell: 'x', why: { guess: 2, steal: 9 } }, 3: { buy: 9 }, 25: { buy: 9 }, x: 1, 19: 'bad' } });
  assert.deepEqual(s.tally, { 20: { buy: 2, sell: 0, cancel: 0, drop: 0, div: 0, why: { guess: 2 } } });
  const cp = copyStock(p.stock);
  cp.tally[p.stock.day].why.good = 99;
  assert.equal(p.stock.tally[p.stock.day].why.good, 1, '복사는 깊게');
});

// ───────────────────── 📤 기록 · 잇기 ─────────────────────

test('📤 usage/stock.md — 가진 것·주문·최근 7장 주문 수와 까닭·떨어진 뒤 바로 더 산 수·배당 · 시작 전이면 글만', () => {
  assert.ok(stockMd(null, 0, D0).includes('아직 시작하지 않았어요'));
  const p = prof(5000, 11);
  stockBuyRule(p, D0, { co: 'pika', n: 3, why: 'news' }, FULL);
  let d = pass(p, 1);
  // 떨어진 장을 만들어 그 뒤에 산다
  p.stock.hist.squirtle.push(Math.floor(p.stock.px.squirtle * 0.9));
  p.stock.px.squirtle = p.stock.hist.squirtle.at(-1);
  assert.equal(stockBuyRule(p, d, { co: 'squirtle', n: 1, why: 'cheap' }, FULL).ok, true);
  assert.ok(p.stock.orders[0].drop, '떨어진 뒤에 산 주문');
  d = pass(p, 4, d);
  stockSellRule(p, d, { co: 'pika', n: 1, why: 'scared' }, FULL);
  const md = stockMd(p.stock, p.coins, d);
  assert.ok(md.includes('## 가진 것') && md.includes('⚡ 피카 전력: 3주'));
  assert.ok(md.includes('팔기 피카 전력 1주 · 까닭: 떨어져서 무서워서'));
  assert.ok(md.includes('지난 장에 3% 넘게 떨어진 뒤 바로 더 산 주문: 1'));
  assert.ok(md.includes('고른 까닭:') && md.includes('값이 내려서 싸 보여서 1'));
  assert.ok(/투자 비율 \d+%/.test(md));
  const divs = p.stock.log.filter((l) => l.kind === 'div').reduce((a, l) => a + l.coins, 0);
  assert.ok(divs > 0 && md.includes(`- 받은 배당: 💰${divs}`), `배당 ${divs}`);
});

test('🔗 잇기 — 홈 🏦(부모가 끄면 숨음) · 창 #stock · 🕒 사용 기록 자리 · 📤 파일 · ⚙ 켜기·한도 · 앱 셸', async () => {
  const html = read('index.html');
  assert.ok(html.includes('<button id="btn-stock" class="btn btn-icon" data-open="stock" aria-label="포켓몬 증권시장">🏦</button>'));
  assert.ok(html.includes('<div id="stock" class="modal" hidden>'));
  assert.ok(html.includes('id="set-stock-on"') && html.includes('id="set-stock-cap"'));
  for (const v of CAP_CHOICES) assert.ok(html.includes(`<option value="${v}">${v}%</option>`));
  assert.ok(PLACES.some((p) => p.key === 'stock' && p.field === 'uStock'));
  assert.ok(OVERLAYS.some((o) => o.place === 'stock' && o.ids.includes('stock')));
  const app = read('js/app.js');
  assert.ok(app.includes('initStock({ conf: stockConf });') && app.includes("if (name === 'home') refreshStockBtn();"));
  const pl = read('js/player.js');
  assert.ok(pl.includes("settings.stockOn = $('set-stock-on').checked;") && pl.includes("settings.stockCap = stockCapOf($('set-stock-cap').value);"));
  assert.ok(pl.includes('export function stockConf()'));
  const sw = read('sw.js');
  assert.ok(sw.includes("'./js/stock.js'") && sw.includes("'./js/stockview.js'"));
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(sw) || [])[1]) >= 319);
  // 📤 — getStock이 있으면 usage/stock.md · 못 만들면 그 파일만 빠짐
  const base = { getMath: async () => null, listDaily: async () => [], mathReportText: () => '', asksText: () => '', collectTodo: () => [], today: D0 };
  const files = await gatherFiles({ ...base, getStock: () => '# 🏦\n' });
  assert.ok(files.some((f) => f.path === 'usage/stock.md'));
  const none = await gatherFiles({ ...base, getStock: () => { throw new Error('x'); } });
  assert.ok(!none.some((f) => f.path === 'usage/stock.md'));
  const [u] = usageFiles([{ date: D0, appOpens: 1, uStock: 120 }], D0, PLACES);
  assert.ok(u.text.includes('🏦 증권 2분'));
  // 아이 화면 — 재촉·셈 문구 없음 · 축하 소리 없음
  const view = read('js/stockview.js');
  assert.ok(!/sfx\.(success|levelUp|win|ding)/.test(view), '화면은 담담하게');
  assert.ok(!/남은 \d|\d+\s*\/\s*\d+/.test(view));
  // 🔍 Codex 125차 — 규칙마다 공부 초(#3) · 저장된 일만 보임(#2) · 한도 안내와 0주면 주문 단추 없음(#6) · ⚙ 묶인 코인 설명
  assert.ok(view.includes('studyNow().then((study) => houseDo((p) => rule(p, study)))'));
  assert.ok(view.includes("'오늘 공부를 하면 장이 열려요'"));
  assert.ok(!view.includes('!r.ok && r.events') && view.includes('if (r && r.ok && r.events && r.events.length)'));
  assert.ok(view.includes("if (why === 'cap') return `투자는 가진 것의 ${confNow().cap}%까지예요"));
  assert.ok(view.includes('if (max < 1) {'));
  assert.ok(!/내일 아침/.test(view), '장은 아침이 아니라 공부한 뒤에 열린다');
  assert.ok(html.includes('기다리던 주문에 묶인 코인은 다시 켤 때까지 묶여 있어요'));
});

test('🗣️ 말 — ▲▼ 지난 장보다 · 가진 것의 오른 % · 체결 한 줄', () => {
  const p = prof(3000, 5);
  stockBuyRule(p, D0, { co: 'squirtle', n: 2, why: 'good' }, FULL);
  const ev = stockSync(p, addDays(D0, 1), FULL).events;
  assert.ok(eventLine(ev[0]).startsWith('🌊 꼬부기 해운 2주를 샀어요 (한 주 '));
  const h = p.stock.hist.squirtle;
  assert.equal(changePct(p.stock, 'squirtle'), Math.round(((h.at(-1) - h.at(-2)) / h.at(-2)) * 1000) / 10);
  const q = positionOf(p.stock, 'squirtle');
  assert.equal(q.n, 2);
  assert.equal(q.value, Math.floor((p.stock.px.squirtle * 2) / 10));
  assert.equal(changePct(newStock(1, D0), 'pika'), 0);
  assert.equal(holdValue(newStock(1, D0)), 0);
});

test('🏦 v351 기본 한도 40% — 옛 기본값 30이 저장된 태블릿도 한 번만 40으로(다른 값은 그대로 · 그 뒤 30으로 되돌려도 그대로)', () => {
  const pl = read('js/player.js');
  assert.match(pl, /if \(!s\.stockCap351\) \{\n\s*if \(Number\(s\.stockCap\) === 30\) s\.stockCap = STOCK_CAP;\n\s*s\.stockCap351 = true;\n\s*try \{ localStorage\.setItem\('shincoach\.settings', JSON\.stringify\(s\)\); \} catch/);
  assert.equal(stockCapOf(40), 40);
  assert.ok(readFileSync(new URL('../index.html', import.meta.url), 'utf8').includes('<option value="40">40%</option>'));
});
