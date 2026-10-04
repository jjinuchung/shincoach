// 🏪 5일장 2단계 · 🤝 교환 상인 (2026-10-05) 테스트: node --test tests/trade.test.js
//
// 아버님 "진행하자" (기본값 7개 그대로): 장날마다 상인 3명(⭐ · ⭐⭐ · ⭐⭐⭐) · 상인은 진우 도감에 없는 종(레벨로 열린 것,
// 원작 전설·환상·🌌 제외)을 가져오고 · 진우는 같은 등급에서 2마리 이상 데리고 있는 종을 골라 준다 · 🔢 수학은 수학끼리 ·
// 공짜 · 상인마다 장날에 한 번 · 되돌리기 없음. 저장: mons[give].traded 단조 카운터 · caught[get] +1 · trades[장날][자리] 합집합
//
// ★ 판정표가 규칙을 베끼면 같이 틀린다 — 게이트(등급·전설·🌌·레벨·과목)는 이 파일이 명단·등급표·전설 목록에서 **따로** 다시 세어 본다
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TRADERS, TRADE_TIERS, TRADER_COUNT, tradersFor, slotOk, offerFor, tradeCheck, mergeTrades, copyTrades, tradesOn, hash32, sameDeal, canGet } from '../js/trade.js';
import { MARKET_ANCHOR, marketOpen, dayNum } from '../js/fusion.js';
import { cloneProfile, emptyProfile, tradeRule, mergeStatRecord } from '../js/db.js';
import { haveOf, tradedOf } from '../js/evolve.js';
import { ROSTER, LEGENDARY, ULTRA_BEASTS, subjectOf } from '../js/pokemon.js';
import { RARITY_IDS, levelFromXp, xpToReach, tradeCtx } from '../js/xp.js';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const prof = (o) => cloneProfile({ ...emptyProfile(), ...o });
const OPEN = MARKET_ANCHOR; // 2026-10-05 첫 장날
const CLOSED = '2026-10-06';
const IDS = ROSTER.map((m) => m.id);

// ── 이 파일이 따로 세운 명단의 사실 (규칙 모듈의 판정 함수를 쓰지 않는다) ──
const RAR = new Map();
for (const r of Object.keys(RARITY_IDS)) for (const id of RARITY_IDS[r]) RAR.set(id, Number(r));
const rarity = (id) => RAR.get(Number(id)) || 2; // 명단에 없으면 보통 (xp.rarityOf와 같은 기본값)
const LEG = new Set(LEGENDARY), UB = new Set(ULTRA_BEASTS);
const UNLOCK = new Map(ROSTER.map((m) => [m.id, m.unlock || 1]));
const ctxAt = (level, art) => ({
  rarity,
  subject: (id) => subjectOf(Number(id)),
  allowed: (id) => UNLOCK.has(Number(id)) && !LEG.has(Number(id)) && !UB.has(Number(id)),
  unlocked: (id) => (UNLOCK.get(Number(id)) || 99) <= level,
  ...(art ? { art } : {}),
});
const CTX = ctxAt(20);
const have = (p, id) => haveOf(p.caught[id], p.mons[id]);
const ofTier = (t, subj) => IDS.filter((id) => rarity(id) === t && !LEG.has(id) && !UB.has(id) && (!subj || subjectOf(id) === subj));

/** 씨앗 고정 난수 (mulberry32) */
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function marketDays(from, n) {
  const out = [];
  for (let d = dayNum(from); out.length < n; d++) {
    const t = new Date(d * 864e5);
    const k = `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
    if (marketOpen(k)) out.push(k);
  }
  return out;
}

test('🤝 상인: 일곱 중 장날마다 셋 · 같은 날이면 늘 같은 셋 · 날마다 바뀐다 · 자리마다 ⭐ · ⭐⭐ · ⭐⭐⭐', () => {
  assert.equal(TRADERS.length, 7);
  assert.equal(new Set(TRADERS.map((t) => t.id)).size, 7, '상인 id가 겹치지 않는다');
  assert.deepEqual(TRADERS.map((t) => t.name), ['반바지꼬마', '등산가', '낚시꾼', '과학자', '아로마 아가씨', '곤충채집소년', '신사'], '게임 직업 이름 — 사람·가족 이름이 아니다 (반바지꼬마·곤충채집소년은 게임 표기대로 붙여 씀, Codex 31차 #7)');
  assert.deepEqual(TRADE_TIERS, [1, 2, 3], '전설(4)·🌌(5)은 다루지 않는다');
  assert.equal(TRADER_COUNT, 3);
  const sets = new Set();
  for (const day of marketDays('2026-10-05', 30)) {
    const who = tradersFor(day);
    assert.equal(who.length, 3);
    assert.equal(new Set(who.map((t) => t.id)).size, 3, `${day} 상인 셋이 서로 다르다`);
    assert.deepEqual(tradersFor(day), who, '같은 날 다시 불러도 같다');
    sets.add(who.map((t) => t.id).join(','));
  }
  assert.ok(sets.size >= 10, `30번의 장날 동안 상인 조합이 여러 가지 (${sets.size})`);
  assert.equal(slotOk(0) && slotOk(2), true);
  assert.equal(slotOk(3) || slotOk(-1) || slotOk(1.5) || slotOk('1') || slotOk(NaN), false);
  assert.equal(hash32('a'), hash32('a'));
  assert.notEqual(hash32('2026-10-05|0|25'), hash32('2026-10-10|0|25'));
});

test('🤝 상인이 가져오는 것: 그 등급 · 도감에 없는 종 · 레벨로 열린 것 · 원작 전설·환상(⭐⭐·⭐⭐⭐ 안의 것도)·🌌 없음', () => {
  // 원작 전설인데 앱 등급이 ⭐⭐·⭐⭐⭐인 종이 실제로 있다 — 이것들이 등급만 보고 새면 안 된다
  const legInTiers = LEGENDARY.filter((id) => [2, 3].includes(rarity(id)) && UNLOCK.has(id));
  assert.ok(legInTiers.includes(144) && legInTiers.includes(888), `⭐⭐·⭐⭐⭐ 안의 원작 전설 ${legInTiers.length}종`);
  const empty = prof({});
  for (const day of marketDays('2026-10-05', 40)) {
    for (let slot = 0; slot < 3; slot++) {
      const o = offerFor(empty, day, slot, IDS, CTX);
      assert.equal(o.tier, TRADE_TIERS[slot]);
      assert.equal(o.who.id, tradersFor(day)[slot].id);
      assert.ok(o.get, `${day} ${slot} 빈 도감이면 늘 가져온다`);
      assert.equal(rarity(o.get), o.tier, '그 등급');
      assert.ok(!LEG.has(o.get) && !UB.has(o.get), `원작 전설·🌌 아님 (${o.get})`);
      assert.deepEqual(o.gives, [], '빈 도감이면 줄 것이 없다');
    }
  }
  // 레벨 1이면 Lv5 이상에 열리는 종을 가져오지 않는다 (진우 레벨 게이트)
  const lv1 = ctxAt(1);
  for (const day of marketDays('2026-10-05', 40)) for (let slot = 0; slot < 3; slot++) {
    const o = offerFor(empty, day, slot, IDS, lv1);
    if (o.get) assert.equal(UNLOCK.get(o.get), 1, `레벨 1에 ${o.get}(Lv${UNLOCK.get(o.get)}에 열림)을 가져왔다`);
  }
  // 못 가져오면 get = null과 까닭 (Codex 31차 #6 — 까닭마다 아이에게 하는 말이 다르다)
  const full = prof({ caught: Object.fromEntries(ofTier(1).map((id) => [id, 1])) });
  assert.deepEqual([offerFor(full, OPEN, 0, IDS, CTX).get, offerFor(full, OPEN, 0, IDS, CTX).why], [null, 'all'], '그 등급을 다 모았다');
  assert.ok(offerFor(full, OPEN, 1, IDS, CTX).get, '다른 등급 상인은 그대로');
  const openAll = prof({ caught: Object.fromEntries(ofTier(1).filter((id) => UNLOCK.get(id) === 1).map((id) => [id, 1])) });
  assert.ok(ofTier(1).some((id) => UNLOCK.get(id) > 1), '⭐ 중 레벨이 올라야 열리는 종이 있다');
  assert.deepEqual([offerFor(openAll, OPEN, 0, IDS, lv1).get, offerFor(openAll, OPEN, 0, IDS, lv1).why], [null, 'level'], '열린 것은 다 모았고 남은 것은 레벨 잠금');
  assert.ok(offerFor(openAll, OPEN, 0, IDS, CTX).get, '레벨이 오르면 가져온다');
  // 그림이 있는 것만 (기기에 그림이 있는 종 Set) — 넘겼으면 비어 있어도 거른다 (Codex 31차 #2)
  const art = new Set([25, 1, 4, 7]);
  const withArt = offerFor(empty, OPEN, 0, IDS, ctxAt(20, art));
  assert.ok(art.has(withArt.get), '⭐ 중 그림 있는 것');
  const noArt = offerFor(prof({ caught: { 1: 2 } }), OPEN, 0, IDS, ctxAt(20, new Set()));
  assert.deepEqual([noArt.get, noArt.why, noArt.gives], [null, 'art', []], '그림이 하나도 없으면 아무것도 안 가져온다 (Codex 재현: 759를 가져왔다)');
  const someArt = offerFor(full, OPEN, 0, IDS, ctxAt(20, new Set([25])));
  // canGet(판정이 쓰는 것)도 도감에 있는 종은 아니다 — 판정의 'got' 앞 검사와 겹치는 안전장치
  const someG = ofTier(1, 'english').find((id) => UNLOCK.get(id) === 1);
  assert.equal(canGet(prof({}), someG, 1, CTX), true);
  assert.equal(canGet(prof({ caught: { [someG]: 1 } }), someG, 1, CTX), false);
  assert.equal(someArt.why, 'all', '다 모았으면 그림과 상관없이 "다 모았다"');
});

test('🤝 같은 날 다시 열어도 같은 포켓몬 — 그것을 잡으면 다음 것으로 · 상관없는 포켓몬을 잡아도 그대로', () => {
  const p = prof({ caught: { 1: 3 } }); // 이상해씨 ⭐ 셋
  const a = offerFor(p, OPEN, 0, IDS, CTX);
  assert.deepEqual(offerFor(p, OPEN, 0, IDS, CTX), a);
  assert.ok(a.get && a.gives.includes(1));
  const other = ofTier(2, 'english').find((id) => !p.caught[id]);
  const q = prof({ caught: { 1: 3, [other]: 1 } });
  assert.equal(offerFor(q, OPEN, 0, IDS, CTX).get, a.get, '다른 등급을 잡아도 그대로');
  const r = prof({ caught: { 1: 3, [a.get]: 1 } });
  const b = offerFor(r, OPEN, 0, IDS, CTX);
  assert.ok(b.get && b.get !== a.get, '가져오려던 것을 잡았으면 다음 것');
  const days = marketDays('2026-10-05', 8).map((d) => offerFor(p, d, 0, IDS, CTX).get);
  assert.ok(new Set(days).size >= 5, `장날마다 다른 포켓몬 (${new Set(days).size}/8)`);
});

test('🔢 수학 포켓몬은 수학끼리 — 상인은 진우가 바꿀 수 있는 과목의 것을 먼저 가져온다', () => {
  const eng1 = ofTier(1, 'english')[0], math1 = ofTier(1, 'math')[0];
  assert.ok(eng1 && math1);
  for (const day of marketDays('2026-10-05', 20)) {
    const e = offerFor(prof({ caught: { [eng1]: 2 } }), day, 0, IDS, CTX);
    assert.equal(subjectOf(e.get), 'english', `${day} 영어 중복만 있으면 영어 포켓몬`);
    assert.deepEqual(e.gives, [eng1]);
    const m = offerFor(prof({ caught: { [math1]: 2 } }), day, 0, IDS, CTX);
    assert.equal(subjectOf(m.get), 'math', `${day} 수학 중복만 있으면 수학 포켓몬`);
    assert.deepEqual(m.gives, [math1]);
  }
  // 판정도: 영어 포켓몬을 주고 수학 포켓몬을 받을 수 없다
  const p = prof({ caught: { [eng1]: 2 } });
  const mathGet = ofTier(1, 'math').find((id) => UNLOCK.get(id) === 1);
  assert.deepEqual(tradeCheck(p, { day: OPEN, slot: 0, give: eng1, get: mathGet }, CTX), { ok: false, why: 'subject' });
});

test('🤝 진우가 줄 수 있는 것: 같은 등급 · 2마리 이상 데리고 있는 것만 (진화·퓨전·떠남·데려감·보낸 수를 뺀 보유) · 전설 안 받음', () => {
  const [a, b, c, d, e] = ofTier(1, 'english');
  const leg = LEGENDARY.find((id) => rarity(id) === 3 && subjectOf(id) === 'english'); // 프리져 같은 ⭐⭐⭐ 원작 전설
  const p = prof({
    caught: { [a]: 2, [b]: 3, [c]: 2, [d]: 1, [e]: 4, [leg]: 2, [ofTier(2, 'english')[0]]: 5 },
    mons: { [b]: { evo: 2 }, [c]: { fused: 1 }, [e]: { fled: 1, taken: 1 } },
  });
  const o = offerFor(p, OPEN, 0, IDS, CTX);
  assert.deepEqual(o.gives, [a, e].sort((x, y) => x - y), '보유 2 이상만 (b는 3−2=1, c는 2−1=1, d는 1, e는 4−2=2)');
  const o3 = offerFor(p, OPEN, 2, IDS, CTX);
  assert.ok(!o3.gives.includes(leg), '원작 전설은 2마리 있어도 상인이 안 받는다');
});

test('🤝 바꾸기 규칙: 보낸 수는 traded 단조 카운터(도감 칸은 남음) · 받은 종 caught +1 · 기록 · 같은 상인 한 번 · 다른 상인은 따로', () => {
  const g1 = ofTier(1, 'english').filter((id) => UNLOCK.get(id) === 1);
  const g2 = ofTier(2, 'english').filter((id) => UNLOCK.get(id) === 1);
  const [give1, get1] = g1, [give2, get2] = g2;
  const p = prof({ caught: { [give1]: 2, [give2]: 2 }, partner: give1, mons: { [give1]: { lv: 6, shiny: true } } });
  const r = tradeRule(p, { day: OPEN, slot: 0, give: give1, get: get1 }, CTX, 1000);
  assert.equal(r.ok, true);
  assert.equal(r.who, tradersFor(OPEN)[0].id, '상인은 날짜로 규칙이 정한다');
  assert.equal(p.caught[give1], 2, '도감 칸(caught)은 줄지 않는다');
  assert.equal(tradedOf(p.mons[give1]), 1);
  assert.equal(have(p, give1), 1, '한 마리는 남는다');
  assert.equal(p.mons[give1].lv, 6, '남은 포켓몬의 레벨·이로치는 그대로');
  assert.equal(p.mons[give1].shiny, true);
  assert.equal(p.caught[get1], 1, '받은 종 새로 등록');
  assert.equal(have(p, get1), 1);
  assert.equal(p.partner, give1, '파트너는 그대로 (한 마리 남았다)');
  assert.deepEqual(tradesOn(p.trades, OPEN)[0], { who: r.who, give: give1, get: get1, at: 1000 });
  // 같은 상인과 같은 날 또는 안 된다
  const p2 = prof({ ...p, caught: { ...p.caught, [give1]: 5 } });
  assert.deepEqual(tradeRule(p2, { day: OPEN, slot: 0, give: give1, get: g1[2] }, CTX), { ok: false, why: 'done' });
  // 다른 상인(⭐⭐)은 따로 된다
  assert.equal(tradeRule(p, { day: OPEN, slot: 1, give: give2, get: get2 }, CTX, 2000).ok, true);
  assert.equal(Object.keys(tradesOn(p.trades, OPEN)).length, 2);
  // 다음 장날엔 같은 자리 상인과 또 바꿀 수 있다
  const next = marketDays('2026-10-06', 1)[0];
  const p3 = prof({ ...p, caught: { ...p.caught, [give1]: 4 } });
  assert.equal(tradeRule(p3, { day: next, slot: 0, give: give1, get: g1[3] }, CTX).ok, true);
  // 파트너가 없던 아이면 받은 포켓몬이 파트너
  const p4 = prof({ caught: { [give1]: 2 }, partner: null });
  tradeRule(p4, { day: OPEN, slot: 0, give: give1, get: get1 }, CTX);
  assert.ok(p4.partner, '파트너가 생긴다');
});

test('🤝 못 바꾸는 경우 — 장 닫힘 · 자리 · 같은 종 · 이미 도감에 있음 · 한 마리뿐 · 등급 다름 · 전설·🌌 · 레벨 잠금 · 과목', () => {
  const [ga, gb, gc] = ofTier(1, 'english').filter((id) => UNLOCK.get(id) === 1);
  const g2 = ofTier(2, 'english').filter((id) => UNLOCK.get(id) === 1)[0];
  const lockedGet = ofTier(1, 'english').find((id) => UNLOCK.get(id) > 1);
  const leg2 = LEGENDARY.find((id) => rarity(id) === 2);
  const base = () => prof({ caught: { [ga]: 2, [gc]: 1, [g2]: 2, [leg2]: 2 } });
  const why = (req, ctx = CTX) => { const p = base(); const before = JSON.stringify(p); const r = tradeRule(p, req, ctx); if (!r.ok) assert.equal(JSON.stringify(p), before, `실패하면 아무것도 안 바뀐다 (${r.why})`); return r.why; };
  assert.equal(why({ day: CLOSED, slot: 0, give: ga, get: gb }), 'closed');
  assert.equal(why({ day: OPEN, slot: 3, give: ga, get: gb }), 'slot');
  assert.equal(why({ day: OPEN, slot: -1, give: ga, get: gb }), 'slot');
  assert.equal(why({ day: OPEN, slot: 0, give: ga, get: ga }), 'same');
  assert.equal(why({ day: OPEN, slot: 0, give: ga, get: gc }), 'got', '이미 도감에 있는 종은 안 받는다');
  assert.equal(why({ day: OPEN, slot: 0, give: gc, get: gb }), 'have', '한 마리뿐이면 못 준다');
  assert.equal(why({ day: OPEN, slot: 0, give: g2, get: gb }), 'offer', '⭐ 상인에게 ⭐⭐를 줄 수 없다');
  assert.equal(why({ day: OPEN, slot: 1, give: ga, get: ofTier(2, 'english').filter((id) => UNLOCK.get(id) === 1)[1] }), 'offer', '⭐⭐ 상인에게 ⭐를 줄 수 없다');
  assert.equal(why({ day: OPEN, slot: 1, give: leg2, get: ofTier(2, 'english').filter((id) => UNLOCK.get(id) === 1)[1] }), 'offer', '원작 전설은 안 받는다');
  assert.equal(why({ day: OPEN, slot: 1, give: g2, get: LEGENDARY.find((id) => rarity(id) === 2 && id !== leg2) }), 'offer', '원작 전설은 안 준다');
  assert.equal(why({ day: OPEN, slot: 2, give: ga, get: ULTRA_BEASTS[0] }), 'offer', '🌌는 안 준다');
  assert.equal(why({ day: OPEN, slot: 0, give: ga, get: lockedGet }, ctxAt(1)), 'offer', '진우 레벨로 안 열린 종은 안 준다');
  assert.equal(why({ day: OPEN, slot: 0, give: ga, get: 99999 }), 'offer', '명단에 없는 종');
});

test('🔁 백업 병합: 보낸 포켓몬이 옛 백업으로 되살아나지 않는다 · 받은 종도 남는다 · 같은 상인과 또 바꿀 수 없다', () => {
  const [give, get] = ofTier(1, 'english').filter((id) => UNLOCK.get(id) === 1);
  const before = prof({ caught: { [give]: 2 }, updatedAt: 10 });
  const after = cloneProfile(before);
  assert.equal(tradeRule(after, { day: OPEN, slot: 0, give, get }, CTX, 500).ok, true);
  after.updatedAt = 20;
  const lateOld = cloneProfile({ ...before, updatedAt: 30 }); // 옛 내용인데 저장 시각만 늦은 백업 (mons를 통째로 가져가는 쪽이 된다)
  for (const [cur, rec, label] of [[after, before, '최신 위에 옛 백업'], [before, after, '옛것 위에 최신'], [after, lateOld, '저장 시각만 늦은 옛 백업']]) {
    const m = mergeStatRecord('profile', cur, rec);
    assert.equal(have(m, give), 1, `${label}: 보낸 포켓몬이 돌아오지 않는다`);
    assert.equal(m.caught[get], 1, `${label}: 받은 종 그대로`);
    assert.equal(tradesOn(m.trades, OPEN)[0].get, get, `${label}: 교환 기록 남음`);
    const m2 = cloneProfile({ ...m, caught: { ...m.caught, [give]: 5 } });
    assert.equal(tradeRule(m2, { day: OPEN, slot: 0, give, get: ofTier(1, 'english').filter((id) => UNLOCK.get(id) === 1)[2] }, CTX).why, 'done', `${label}: 같은 상인과 또 바꿀 수 없다`);
  }
  // 옛 백업을 두 번 합쳐도 같다
  const twice = mergeStatRecord('profile', mergeStatRecord('profile', after, before), before);
  assert.equal(have(twice, give), 1);
});

test('🔁 교환 기록 합치기 — 장날·자리마다 합집합 · 같은 자리면 먼저 바꾼 쪽 · 엉뚱한 값은 버림 · 복사는 깊게', () => {
  const a = { '2026-10-05': { 0: { who: 'hiker', give: 1, get: 4, at: 100 } } };
  const b = { '2026-10-05': { 1: { who: 'fisher', give: 25, get: 26, at: 200 } }, '2026-10-10': { 2: { who: 'scientist', give: 6, get: 9, at: 300 } } };
  const m = mergeTrades(a, b);
  assert.deepEqual(Object.keys(m).sort(), ['2026-10-05', '2026-10-10']);
  assert.deepEqual(Object.keys(m['2026-10-05']).sort(), ['0', '1']);
  assert.deepEqual(mergeTrades(b, a), m, '어느 쪽이 먼저여도 같다');
  const early = { '2026-10-05': { 0: { give: 1, get: 4, at: 50 } } };
  assert.equal(mergeTrades(a, early)['2026-10-05'][0].at, 50, '먼저 바꾼 쪽');
  assert.equal(mergeTrades(early, a)['2026-10-05'][0].at, 50);
  assert.deepEqual(mergeTrades({ 'x': { 0: {} }, '2026-10-05': { 7: { at: 1 }, 1: null } }, null), {}, '날짜·자리·값이 엉뚱하면 버린다');
  const c = copyTrades(b);
  c['2026-10-05'][1].get = 999;
  assert.equal(b['2026-10-05'][1].get, 26, '복사는 안쪽까지');
  const p = prof({ trades: b });
  p.trades['2026-10-10'][2].give = 0;
  assert.equal(b['2026-10-10'][2].give, 6, 'cloneProfile도 안쪽까지 복사');
  assert.deepEqual(emptyProfile().trades, {});
  assert.deepEqual(tradesOn(undefined, OPEN), {});
});

test('🎲 무작위 도감 2,000개 × 장날 6번: 화면에 보인 교환은 전부 규칙이 받아 주고, 게이트를 하나도 넘지 않는다', () => {
  const R = rng(20261005);
  const days = marketDays('2026-10-05', 6);
  let shown = 0, accepted = 0;
  for (let n = 0; n < 2000; n++) {
    const caught = {}, mons = {};
    for (const id of IDS) if (R() < 0.35) caught[id] = 1 + Math.floor(R() * 4);
    for (const id of Object.keys(caught)) if (R() < 0.15) mons[id] = { [['evo', 'fused', 'fled', 'taken', 'traded'][Math.floor(R() * 5)]]: 1 };
    const level = 1 + Math.floor(R() * 20);
    const ctx = ctxAt(level);
    const p = prof({ caught, mons, xp: 0 });
    const day = days[n % days.length];
    for (let slot = 0; slot < 3; slot++) {
      const o = offerFor(p, day, slot, IDS, ctx);
      if (!o.get) {
        // 정말 없는지 따로 센다
        const left = IDS.filter((id) => rarity(id) === TRADE_TIERS[slot] && !LEG.has(id) && !UB.has(id) && (UNLOCK.get(id) || 99) <= level && !(caught[id] > 0));
        assert.deepEqual(left, [], `등급 ${TRADE_TIERS[slot]}에 아직 줄 수 있는 종이 있는데 get이 없다`);
        const anyLeft = IDS.some((id) => rarity(id) === TRADE_TIERS[slot] && !LEG.has(id) && !UB.has(id) && !(caught[id] > 0));
        assert.equal(o.why, anyLeft ? 'level' : 'all', '못 가져온 까닭');
        continue;
      }
      assert.ok(!(caught[o.get] > 0), '도감에 있는 종을 가져왔다');
      assert.equal(rarity(o.get), TRADE_TIERS[slot]);
      assert.ok(!LEG.has(o.get) && !UB.has(o.get));
      assert.ok(UNLOCK.get(o.get) <= level, `레벨 ${level}에 Lv${UNLOCK.get(o.get)} 종`);
      for (const g of o.gives) {
        assert.ok(have(p, g) >= 2, `보유 ${have(p, g)}마리를 달라고 했다`);
        assert.equal(rarity(g), TRADE_TIERS[slot]);
        assert.equal(subjectOf(g), subjectOf(o.get));
        assert.ok(!LEG.has(g) && !UB.has(g));
        shown++;
        const q = cloneProfile(p);
        const r = tradeRule(q, { day, slot, give: g, get: o.get }, ctx);
        assert.equal(r.ok, true, `보인 교환을 규칙이 거절 (${r.why})`);
        assert.ok(have(q, g) >= 1, '한 마리는 남는다');
        assert.equal(have(q, g), have(p, g) - 1);
        accepted++;
      }
      // 줄 수 있는 것을 빠뜨리지 않았나 (같은 등급·과목·2마리 이상)
      const should = IDS.filter((id) => have(p, id) >= 2 && rarity(id) === TRADE_TIERS[slot] && !LEG.has(id) && !UB.has(id) && subjectOf(id) === subjectOf(o.get));
      assert.deepEqual(o.gives, should.sort((x, y) => x - y));
    }
  }
  assert.ok(shown > 1000, `보인 교환 ${shown}`);
  assert.equal(accepted, shown);
});

test('🔌 화면·저장 연결: 게이트 한 곳(tradeCtx)을 상인과 판정이 같이 쓴다 · 저장 실패는 못 한 것 · 날짜는 누를 때마다 · 앱 셸', () => {
  const xp = src('js/xp.js');
  const ctxBody = xp.slice(xp.indexOf('function tradeCtx('), xp.indexOf('export function tradeOffers('));
  for (const g of ['rarityIn(pf', 'levelFromXp(Number(pf && pf.xp)', 'subjectOf(', 'isLegendary(', 'isUltraBeast(', 'isUnlocked(', 'rosterSet.has(']) assert.ok(ctxBody.includes(g), `tradeCtx 게이트: ${g}`);
  assert.ok(!/rarityOf\(|profile\.xp/.test(ctxBody), 'tradeCtx는 창의 프로필을 직접 읽지 않는다 (넘겨받은 것만)');
  const offers = xp.slice(xp.indexOf('export function tradeOffers('), xp.indexOf('export function tradedCount('));
  assert.ok(/const ctx = tradeCtx\(profile, art\);/.test(offers) && /offerFor\(profile, dateKey, slot, ROSTER_IDS, ctx\)/.test(offers), '상인이 가져오는 것 = tradeCtx(그림 목록까지)');
  assert.equal((offers.match(/tradeCtx\(/g) || []).length, 1, 'tradeOffers 안의 게이트는 한 벌');
  const doIt = xp.slice(xp.indexOf('export async function tradeMon('), xp.indexOf('export async function tradeMon(') + 400);
  assert.ok(/runProfileOp\(\(\) => applyTrade\(req, \(stored\) => tradeCtx\(stored\)\), \(\) => \(\{ ok: false, why: 'save' \}\)\)/.test(doIt), '판정 = 저장된 프로필로 만든 tradeCtx · 저장 실패면 못 한 것');
  assert.ok(doIt.includes('ensurePartner()'));
  assert.ok(/trades: copyTrades\(p\.trades\)/.test(xp), 'fromStored가 교환 기록을 복사');
  assert.ok(/fusions: \{\}, trades: \{\}/.test(xp), 'EMPTY에 trades');
  const ev = src('js/evolve.js');
  assert.ok(/- fledOf\(mon\) - tradedOf\(mon\)\)/.test(ev), 'haveOf가 보낸 수를 뺀다');
  const db = src('js/db.js');
  assert.ok(/\['fused', 'unfused', 'fled', 'traded'\]/.test(db), '병합 max에 traded');
  assert.ok(/out\.trades = mergeTrades\(cur\.trades, rec\.trades\)/.test(db));
  assert.ok(/mutateProfile\(\(p\) => tradeRule\(p, req, makeCtx\(p\)\)\)/.test(db), '트랜잭션 안의 저장된 프로필(p)로 ctx를 만든다 (Codex 31차 #1)');
  const mv = src('js/marketview.js');
  const dt = mv.slice(mv.indexOf('async function doTrade('), mv.indexOf('async function doFuse('));
  assert.ok(/const day = dayNow\(\);\s*\n\s*if \(!stillOpen\(day\)\)/.test(dt), '누를 때 오늘을 다시 읽는다');
  assert.ok(dt.includes('tradeMon({ day, slot: o.slot, give, get: o.get })'));
  assert.ok(/if \(!sameDeal\(ui\.trArm, dealOf\(o, give\), Date\.now\(\)\)\) \{[\s\S]*?return;\s*\}/.test(dt), '두 번 눌러야 (같은 거래·5초 안)');
  assert.ok(mv.includes('body.appendChild(tradeCard());'), '장날에 교환 상인 칸');
  const tb = mv.slice(mv.indexOf('function tradeBtn('), mv.indexOf('async function doTrade('));
  assert.ok(/if \(armed\) \{[\s\S]*setTimeout\([\s\S]*ui\.trArm = null;[\s\S]*b\.classList\.remove\('armed'\)/.test(tb), '"한 번 더"가 풀리면 버튼도 원래대로 (헤드리스가 잡음: 5초 뒤에도 "한 번 더!"로 보였다)');
  assert.ok(src('sw.js').includes("'./js/trade.js'"), 'APP_SHELL에 trade.js');
  // 레벨 함수가 그대로 있다 (tradeCtx가 쓴다)
  assert.equal(levelFromXp(0).level, 1);
  assert.equal(levelFromXp(xpToReach(5)).level, 5);
});

test('🔍 Codex 31차 #1 — 판정 ctx는 넘겨받은 (저장된) 프로필의 등급·레벨을 쓴다 · 창의 프로필이 아니다', () => {
  const g1 = ofTier(1, 'english').filter((id) => UNLOCK.get(id) === 1);
  const g2 = ofTier(2, 'english').filter((id) => UNLOCK.get(id) === 1);
  // 아빠가 다른 창에서 이상해씨(⭐)를 ⭐⭐로 옮겼다 — 저장된 프로필에만 있다
  const give = g1[0];
  const stored = prof({ caught: { [give]: 2 }, mons: { [give]: { rarity: 2 } } });
  assert.equal(tradeRule(cloneProfile(stored), { day: OPEN, slot: 0, give, get: g1[1] }, tradeCtx(stored)).why, 'offer', '옮긴 등급으로 판정 — ⭐ 상인에게 못 준다');
  assert.equal(tradeRule(cloneProfile(stored), { day: OPEN, slot: 1, give, get: g2[1] }, tradeCtx(stored)).ok, true, '⭐⭐ 상인에게는 준다');
  // 레벨도 넘겨받은 프로필의 xp로 — 다른 창에서 레벨이 올랐으면 새로 열린 종을 받을 수 있다
  const locked = ofTier(1, 'english').find((id) => UNLOCK.get(id) === 5);
  const low = prof({ caught: { [give]: 2 }, xp: 0 });
  assert.equal(tradeRule(cloneProfile(low), { day: OPEN, slot: 0, give, get: locked }, tradeCtx(low)).why, 'offer', '레벨 1에 Lv5 종');
  const high = prof({ caught: { [give]: 2 }, xp: xpToReach(5) });
  assert.equal(tradeRule(cloneProfile(high), { day: OPEN, slot: 0, give, get: locked }, tradeCtx(high)).ok, true, 'Lv5가 된 프로필이면 받는다');
  // 게이트는 그대로 — 원작 전설·🌌·명단 밖
  const c = tradeCtx(high);
  assert.equal(c.allowed(144) || c.allowed(ULTRA_BEASTS[0]) || c.allowed(99999), false);
  assert.equal(c.subject(ofTier(1, 'math')[0]), 'math');
});

test('🔍 Codex 31차 #4 — "한 번 더"는 장날·자리·줄 것·받을 것이 모두 같을 때만 · 5초 안', () => {
  const arm = { day: OPEN, slot: 0, give: 1, get: 759, at: 1000 };
  assert.equal(sameDeal(arm, { day: OPEN, slot: 0, give: 1, get: 759 }, 5999), true);
  assert.equal(sameDeal(arm, { day: OPEN, slot: 0, give: 1, get: 761 }, 2000), false, '상인이 다른 포켓몬을 가져왔으면 처음부터 (Codex 재현: 759 → 761)');
  assert.equal(sameDeal(arm, { day: OPEN, slot: 0, give: 4, get: 759 }, 2000), false, '줄 것이 바뀌면');
  assert.equal(sameDeal(arm, { day: OPEN, slot: 1, give: 1, get: 759 }, 2000), false, '다른 상인');
  assert.equal(sameDeal(arm, { day: '2026-10-10', slot: 0, give: 1, get: 759 }, 2000), false, '다른 장날');
  assert.equal(sameDeal(arm, { day: OPEN, slot: 0, give: 1, get: 759 }, 6000), false, '5초 지남');
  assert.equal(sameDeal(null, { day: OPEN, slot: 0, give: 1, get: 759 }, 0), false);
  // 실제로 상인이 바꾸는 경우: 가져오려던 종을 그 사이 잡으면 get이 바뀐다 → 같은 거래가 아니다
  const p = prof({ caught: { 1: 2 } });
  const a = offerFor(p, OPEN, 0, IDS, CTX);
  const b = offerFor(prof({ caught: { 1: 2, [a.get]: 1 } }), OPEN, 0, IDS, CTX);
  assert.notEqual(a.get, b.get);
  assert.equal(sameDeal({ day: OPEN, slot: 0, give: 1, get: a.get, at: 0 }, { day: OPEN, slot: 0, give: 1, get: b.get }, 10), false);
  // 화면: 버튼 모양과 두 번째 누르기 둘 다 같은 판정을 쓰고, 거래에 받을 것까지 담는다
  const mv = src('js/marketview.js');
  assert.ok(/function dealOf\(o, give\) \{\s*return \{ day: dayNow\(\), slot: o\.slot, give, get: o\.get \};/.test(mv));
  const tb = mv.slice(mv.indexOf('function tradeBtn('), mv.indexOf('async function doTrade('));
  const dt = mv.slice(mv.indexOf('async function doTrade('), mv.indexOf('async function doFuse('));
  assert.ok(tb.includes('sameDeal(ui.trArm, dealOf(o, give), Date.now())'), '버튼 모양');
  assert.ok(dt.includes('if (!sameDeal(ui.trArm, dealOf(o, give), Date.now())) {') && dt.includes('ui.trArm = { ...dealOf(o, give), at: Date.now() };'), '두 번째 누르기');
  assert.ok(!/ui\.trArm\.slot === o\.slot/.test(mv), '옛 판정(자리·줄 것만)이 남아 있지 않다');
});

test('🔍 Codex 31차 #5·#6 — 나누기 버튼도 5초 뒤 원래대로 · 못 가져온 까닭마다 다른 말 · 줄 것 없을 때 과목을 말한다', () => {
  const mv = src('js/marketview.js');
  const sb = mv.slice(mv.indexOf('function splitBtn('), mv.indexOf('// ───────────── 🤝 교환 상인'));
  assert.ok(/b\.dataset\.label = label;/.test(sb));
  assert.ok(/if \(armed\) \{[\s\S]*setTimeout\([\s\S]*if \(ui\.splitArm !== arm\) return;[\s\S]*ui\.splitArm = null;[\s\S]*querySelectorAll\('#market-body \.fz-split\.armed'\)[\s\S]*x\.dataset\.label/.test(sb), '같은 퓨전 버튼이 어디 있든 모두 원래대로');
  const box = mv.slice(mv.indexOf('function traderBox('), mv.indexOf('function givePicker('));
  assert.ok(/o\.why === 'all' \?/.test(box) && /o\.why === 'level' \?/.test(box) && /o\.why === 'art'/.test(box), '까닭 셋');
  assert.ok(box.includes('"포켓몬 캐릭터 받기"'), '그림이 없으면 아빠께 받는 곳을 알려 준다 (도감의 안내와 같은 말)');
  assert.ok(src('js/pokedex.js').includes('"포켓몬 캐릭터 받기"'), '⚙의 그 이름이 아직 있다');
  assert.ok(box.includes("${o.subject === 'math' ? '수학' : '영어'} 포켓몬을 두 마리 이상"), '영어 쪽도 과목을 말한다');
  assert.ok(!/못 찾았어/.test(box), '옛 "못 찾았어"는 없다');
});
