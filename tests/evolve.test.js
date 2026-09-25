// 🧬 레벨업 · 진화 규칙: node --test tests/evolve.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EVO, MAX_LV, COST, STONE_ID, LV_ATK, haveOf, levelCapOf, capReason, stoneIdFor, lvOf, costTo, nextCost, totalTo, costBetween, evoOf, evoAt, evoTo, evoFrom, needsChoice, soleEvo, canEvolve, lvMult } from '../js/evolve.js';
import { ROSTER, subjectOf } from '../js/pokemon.js';
import { STONE_MATH, STONE_ENGLISH } from '../js/items.js';
import { TYPE_OF, attackMult, DAMAGE, BATTLE } from '../js/battle.js';
import { growReport } from '../js/stats.js';
import { battleLossRule, cloneProfile, emptyProfile, evolveRule, gearRule, levelUpRule, mergeStatRecord, partnerRule, shinyRule } from '../js/db.js';

const ids = new Set(ROSTER.map((r) => r.id));
const links = Object.entries(EVO).flatMap(([from, list]) => list.map((e) => ({ from: Number(from), ...e })));

test('🧬 진화표: 66링크·59종, 양쪽이 모두 명단에 있다 (도감에 자리가 없으면 갈 곳이 없다)', () => {
  assert.equal(links.length, 66);
  assert.equal(Object.keys(EVO).length, 59);
  for (const l of links) {
    assert.ok(ids.has(l.from), `진화 전 ${l.from}이 명단에 없다`);
    assert.ok(ids.has(l.to), `진화 후 ${l.to}이 명단에 없다`);
    assert.notEqual(l.from, l.to, '자기 자신으로 진화할 수 없다');
  }
});

test('🧬 진화 레벨은 5 아니면 10 — 명단에서 시작인 종은 5, 한 번 진화한 종은 10', () => {
  const hasPrev = new Set(links.map((l) => l.to));
  for (const l of links) {
    assert.ok(l.at === 5 || l.at === 10, `${l.from}→${l.to} at=${l.at}`);
    assert.equal(l.at, hasPrev.has(l.from) ? 10 : 5, `${l.from}→${l.to}의 단계가 틀렸다`);
  }
  // 룰리·모노두·단단지가 명단에 없으므로 마릴·디헤드·메탕구는 **아이에겐 시작**이라 Lv5여야 한다
  assert.equal(evoAt(183), 5, '마릴');
  assert.equal(evoAt(634), 5, '디헤드');
  assert.equal(evoAt(375), 5, '메탕구');
  // 꼬부기 → 어니부기(Lv5) → 거북왕(Lv10)
  assert.equal(evoAt(7), 5);
  assert.equal(evoAt(8), 10);
  assert.equal(soleEvo(7), 8);
  assert.equal(soleEvo(8), 9);
});

test('🧬 한 종에서 갈래가 여럿인 것은 이브이뿐 (8갈래) — 나머지는 고를 것이 없다', () => {
  const many = Object.keys(EVO).filter((k) => EVO[k].length > 1).map(Number);
  assert.deepEqual(many, [133]);
  assert.equal(evoOf(133).length, 8);
  assert.equal(needsChoice(133), true);
  assert.equal(needsChoice(7), false);
  assert.equal(soleEvo(133), null, '갈래가 여럿이면 기본값이 없다');
  // 8갈래가 전부 다른 포켓몬이고 전부 명단에 있다
  const tos = evoOf(133).map((e) => e.to);
  assert.equal(new Set(tos).size, 8);
  for (const t of tos) assert.ok(ids.has(t));
});

test('🧬 진화는 고리를 이루지 않는다 (A→B→…→A 가 없어야 무한 진화가 안 생긴다)', () => {
  for (const start of Object.keys(EVO).map(Number)) {
    const seen = new Set([start]);
    let front = [start];
    for (let depth = 0; depth < 10 && front.length; depth++) {
      const next = front.flatMap((id) => evoOf(id).map((e) => e.to));
      for (const n of next) {
        assert.ok(!seen.has(n), `${start}에서 시작해 ${n}으로 돌아온다`);
        seen.add(n);
      }
      front = next;
    }
  }
});

test('🧬 원작 조건(orig)은 모든 링크에 있다 — 진우가 아는 내용이라 비워 두면 안 된다', () => {
  for (const l of links) {
    assert.ok(l.orig && l.orig.length > 1, `${l.from}→${l.to}에 원작 조건이 없다`);
    assert.ok(!/undefined|null|\[object/.test(l.orig), `${l.from}→${l.to} orig가 깨졌다: ${l.orig}`);
    assert.ok(!/[가-힣]트을 |석를 /.test(l.orig), `조사가 틀렸다: ${l.orig}`);
  }
  // PokeAPI에서 받은 한국어명이 그대로 들어갔는지 (기억으로 쓰면 틀린다)
  assert.equal(evoTo(25, 26).orig, '천둥의돌 사용');
  assert.equal(evoTo(95, 208).orig, '금속코트를 지니고 통신교환');
  assert.equal(evoTo(79, 199).orig, '왕의징표석을 지니고 통신교환');
  assert.equal(evoTo(133, 700).orig, '페어리 기술을 배우고 친하게 지내면');
  assert.equal(evoTo(133, 470).orig, '이끼바위 근처에서 레벨업');
  assert.equal(evoTo(7, 8).orig, 'Lv16');
});

test('🧬 진화하면 과목이 바뀌는 37쌍 (아버님 결정: 원작대로) — 그다음부터 다른 스톤이 필요하다', () => {
  const crossed = links.filter((l) => subjectOf(l.from) !== subjectOf(l.to));
  assert.equal(crossed.length, 37);
  // 고라파덕(영어) → 골덕(수학)
  assert.equal(subjectOf(54), 'english');
  assert.equal(subjectOf(55), 'math');
  assert.equal(stoneIdFor(subjectOf(54)), 'stone_english');
  assert.equal(stoneIdFor(subjectOf(55)), 'stone_math');
});

test('🧬 진화로 얻는 66마리도 등급·타입이 채워져 있다 (빠지면 조용히 보통·노말이 된다)', () => {
  for (const l of links) {
    assert.ok(TYPE_OF[l.to], `${l.to}에 타입이 없다`);
    assert.ok(TYPE_OF[l.from], `${l.from}에 타입이 없다`);
  }
});

test('⬆️ 레벨업 비용: 구간마다 스톤이 늘어난다 (1개 → 2개 → 3개)', () => {
  assert.equal(MAX_LV, 12);
  assert.deepEqual(COST.map((c) => c.stones), [1, 2, 3]);
  assert.deepEqual(costTo(2), { stones: 1, coins: 30 });
  assert.deepEqual(costTo(5), { stones: 1, coins: 30 });
  assert.deepEqual(costTo(6), { stones: 2, coins: 60 });
  assert.deepEqual(costTo(10), { stones: 2, coins: 60 });
  assert.deepEqual(costTo(11), { stones: 3, coins: 100 });
  assert.deepEqual(costTo(12), { stones: 3, coins: 100 });
  assert.equal(costTo(1), null, 'Lv1은 시작이라 값이 없다');
  assert.equal(costTo(13), null, '만렙을 넘을 수 없다');
  assert.equal(costTo(0), null);
});

test('⬆️ 누적: 첫 진화(Lv5) 스톤 4개 · 최종 진화(Lv10) 14개 · 만렙(Lv12) 20개', () => {
  assert.deepEqual(totalTo(5), { stones: 4, coins: 120 });
  assert.deepEqual(totalTo(10), { stones: 14, coins: 420 });
  assert.deepEqual(totalTo(MAX_LV), { stones: 20, coins: 620 });
  assert.deepEqual(totalTo(1), { stones: 0, coins: 0 });
  // 하루에 버는 스톤이 과목당 1~3개다 → 첫 진화 이틀·최종 진화 일주일 선을 넘지 않아야
  assert.ok(totalTo(5).stones <= 4, '첫 진화가 이틀을 넘으면 아이가 포기한다');
  assert.ok(totalTo(10).stones <= 15, '최종 진화가 일주일을 크게 넘으면 안 된다');
});

test('⬆️ nextCost·costBetween: 지금 레벨에서 다음 한 칸 / 목표까지 남은 값', () => {
  assert.deepEqual(nextCost(1), { toLv: 2, stones: 1, coins: 30 });
  assert.deepEqual(nextCost(5), { toLv: 6, stones: 2, coins: 60 });
  assert.equal(nextCost(MAX_LV), null, '만렙이면 더 올릴 수 없다');
  assert.deepEqual(costBetween(1, 5), { stones: 4, coins: 120 });
  assert.deepEqual(costBetween(5, 10), { stones: 10, coins: 300 });
  assert.deepEqual(costBetween(10, 5), { stones: 0, coins: 0 }, '이미 지난 레벨은 0');
});

test('⬆️ lvOf: 기록이 없거나 깨졌으면 Lv1, 만렙을 넘지 않는다', () => {
  assert.equal(lvOf(undefined), 1);
  assert.equal(lvOf({}), 1);
  assert.equal(lvOf({ lv: 0 }), 1);
  assert.equal(lvOf({ lv: -3 }), 1);
  assert.equal(lvOf({ lv: 'abc' }), 1);
  assert.equal(lvOf({ lv: 7 }), 7);
  assert.equal(lvOf({ lv: 7.8 }), 7);
  assert.equal(lvOf({ lv: 999 }), MAX_LV);
});

test('🧬 canEvolve: 레벨·마릿수·갈래를 모두 본다', () => {
  assert.deepEqual(canEvolve(7, 5, 1), { ok: true }, '꼬부기 Lv5 한 마리');
  assert.deepEqual(canEvolve(7, 12, 3), { ok: true }, '레벨이 넘쳐도 된다');
  assert.deepEqual(canEvolve(7, 4, 1), { ok: false, why: 'level' });
  assert.deepEqual(canEvolve(7, 5, 0), { ok: false, why: 'none' }, '진화는 한 마리를 쓴다');
  assert.deepEqual(canEvolve(25, 5, 1), { ok: false, why: 'level' }, '피카츄는 Lv10');
  assert.deepEqual(canEvolve(25, 10, 1), { ok: true });
  assert.deepEqual(canEvolve(143, 12, 5), { ok: false, why: 'no-evo' }, '잠만보는 진화가 없다');
  // 이브이: 갈래를 골라야 하고, 엉뚱한 갈래는 막는다
  assert.deepEqual(canEvolve(133, 5, 1), { ok: false, why: 'to' });
  assert.deepEqual(canEvolve(133, 5, 1, 134), { ok: true }, '샤미드');
  assert.deepEqual(canEvolve(133, 5, 1, 9), { ok: false, why: 'to' }, '이브이는 거북왕이 될 수 없다');
  assert.deepEqual(canEvolve(7, 5, 1, 9), { ok: false, why: 'to' }, '꼬부기는 바로 거북왕이 될 수 없다');
  assert.deepEqual(canEvolve(7, 5, 1, 8), { ok: true });
});

test('🧬 evoFrom: 무엇이 진화해서 이 모습이 되는가 (도감 설명용)', () => {
  assert.deepEqual(evoFrom(8), [7], '어니부기 ← 꼬부기');
  assert.deepEqual(evoFrom(9), [8], '거북왕 ← 어니부기');
  assert.deepEqual(evoFrom(134), [133], '샤미드 ← 이브이');
  assert.deepEqual(evoFrom(7), [], '꼬부기는 진화해서 되는 모습이 아니다 (피츄 같은 앞 단계가 명단에 없다)');
});

test('⚔️ 레벨이 주는 힘: 레벨당 +3%, 메가진화(×1.4)보다 작다', () => {
  assert.equal(LV_ATK, 0.03);
  assert.equal(lvMult(1), 1);
  assert.equal(Number(lvMult(MAX_LV).toFixed(2)), 1.33);
  assert.ok(lvMult(MAX_LV) < 1.4, '만렙이어도 메가진화보다 세면 안 된다');
  // 레벨이 오르면 반드시 더 세진다 (같거나 줄면 키울 이유가 없다)
  for (let lv = 2; lv <= MAX_LV; lv++) assert.ok(lvMult(lv) > lvMult(lv - 1), `Lv${lv}`);
});

test('🔷🔶 스톤 id가 가방 아이템과 같다 (달라지면 값을 못 치른다)', () => {
  assert.equal(STONE_ID.math, STONE_MATH.id);
  assert.equal(STONE_ID.english, STONE_ENGLISH.id);
  assert.equal(stoneIdFor('math'), STONE_MATH.id);
  assert.equal(stoneIdFor('english'), STONE_ENGLISH.id);
  assert.equal(stoneIdFor(undefined), STONE_ENGLISH.id, '과목이 없으면 영어 (subjectOf와 같은 기본값)');
});

// ── 💾 저장 규칙 (db.js) ──

const P = (over = {}) => ({ ...emptyProfile(), ...over });

test('⬆️ levelUpRule: 스톤과 코인을 치르고 한 칸 올린다', () => {
  const p = cloneProfile(P({ caught: { 7: 1 }, coins: 100, items: { stone_english: 3 } }));
  const r = levelUpRule(p, 7, 'stone_english');
  assert.equal(r.ok, true);
  assert.equal(r.from, 1);
  assert.equal(r.to, 2);
  assert.equal(p.mons[7].lv, 2);
  assert.equal(p.coins, 70, '💰30');
  assert.equal(p.items.stone_english, 2, '🔶1');
});

test('⬆️ levelUpRule: 값이 모자라면 **아무것도** 바뀌지 않는다', () => {
  const poor = cloneProfile(P({ caught: { 7: 1 }, coins: 10, items: { stone_english: 3 } }));
  assert.deepEqual(levelUpRule(poor, 7, 'stone_english'), { ok: false, why: 'cost', from: 1, cost: { coins: 30, items: { stone_english: 1 } } });
  assert.equal(poor.coins, 10);
  assert.equal(poor.items.stone_english, 3);
  assert.equal(poor.mons[7], undefined, '레벨 기록도 안 생긴다');

  const noStone = cloneProfile(P({ caught: { 7: 1 }, coins: 999, items: {} }));
  assert.equal(levelUpRule(noStone, 7, 'stone_english').why, 'cost');
  assert.equal(noStone.coins, 999);
});

test('⬆️ levelUpRule: 만렙이면 더 못 올리고, 데리고 있지 않으면 못 키운다', () => {
  const max = cloneProfile(P({ caught: { 7: 1 }, coins: 999, items: { stone_english: 9 }, mons: { 7: { lv: MAX_LV } } }));
  assert.deepEqual(levelUpRule(max, 7, 'stone_english'), { ok: false, why: 'max' });
  assert.equal(max.coins, 999, '값을 치르지 않는다');

  const gone = cloneProfile(P({ caught: { 7: 1 }, coins: 999, items: { stone_english: 9 }, mons: { 7: { lv: 5, evo: 1 } } }));
  assert.deepEqual(levelUpRule(gone, 7, 'stone_english'), { ok: false, why: 'caught' }, '한 마리를 다 진화시켰다');
});

test('⬆️ 두 창: 스톤 하나로 두 번 올릴 수 없다 (판정이 트랜잭션 안에 있다)', () => {
  const p = cloneProfile(P({ caught: { 7: 1 }, coins: 60, items: { stone_english: 1 } }));
  assert.equal(levelUpRule(p, 7, 'stone_english').ok, true);
  assert.equal(levelUpRule(p, 7, 'stone_english').why, 'cost', '스톤이 없다');
  assert.equal(p.mons[7].lv, 2, '한 칸만 올랐다');
});

test('⬆️ 두 창: 값은 트랜잭션 안에서 다시 센다 — Lv5 값으로 Lv6를 살 수 없다', () => {
  // 잠만보(143)는 진화가 없어 만렙까지 쭉 올라간다 — 구간이 바뀌는 자리를 보기에 알맞다
  const p = cloneProfile(P({ caught: { 143: 1 }, coins: 999, items: { stone_english: 9 }, mons: { 143: { lv: 5 } } }));
  const r = levelUpRule(p, 143, 'stone_english');
  assert.deepEqual(r.cost, { coins: 60, items: { stone_english: 2 } }, 'Lv6는 스톤 2개');
  assert.equal(p.items.stone_english, 7);
});

test('🧬 evolveRule: 마릿수 한 마리가 옮겨 가고 레벨이 이어진다', () => {
  const p = cloneProfile(P({ caught: { 7: 1 }, mons: { 7: { lv: 5 } } }));
  const r = evolveRule(p, 7, 8, 100);
  assert.equal(r.ok, true);
  assert.equal(r.first, true, '어니부기는 도감에 처음');
  assert.equal(r.last, true, '마지막 한 마리였다');
  assert.equal(p.caught[8], 1);
  assert.equal(p.mons[8].lv, 5, '레벨을 이어받는다');
  assert.equal(p.mons[8].hp, 100, 'HP는 가득 차서 시작');
  // ★ caught는 줄지 않는다 — 대신 내보낸 수를 센다 (백업 병합이 max라서)
  assert.equal(p.caught[7], 1, '도감의 누적 마릿수는 그대로');
  assert.equal(p.mons[7].evo, 1, '내보낸 수');
  assert.equal(haveOf(p.caught[7], p.mons[7]), 0, '지금 데리고 있는 꼬부기는 없다');
  assert.equal(haveOf(p.caught[8], p.mons[8]), 1);
});

test('🧬 evolveRule: 진화형이 이미 더 높으면 레벨이 내려가지 않는다', () => {
  const p = cloneProfile(P({ caught: { 7: 1, 8: 1 }, mons: { 7: { lv: 5 }, 8: { lv: 9 } } }));
  evolveRule(p, 7, 8, 100);
  assert.equal(p.mons[8].lv, 9);
  assert.equal(p.caught[8], 2);
});

test('🧬 evolveRule: 레벨·마릿수가 모자라면 막는다', () => {
  const low = cloneProfile(P({ caught: { 7: 1 }, mons: { 7: { lv: 4 } } }));
  assert.deepEqual(evolveRule(low, 7, 8, 100), { ok: false, why: 'level' });
  assert.equal(low.caught[8], undefined);

  const none = cloneProfile(P({ caught: { 7: 1 }, mons: { 7: { lv: 5, evo: 1 } } }));
  assert.deepEqual(evolveRule(none, 7, 8, 100), { ok: false, why: 'none' }, '이미 다 내보냈다');

  const wrong = cloneProfile(P({ caught: { 7: 1 }, mons: { 7: { lv: 12 } } }));
  assert.deepEqual(evolveRule(wrong, 7, 9, 100), { ok: false, why: 'to' }, '꼬부기는 바로 거북왕이 못 된다');
  assert.deepEqual(evolveRule(wrong, 143, 9, 100), { ok: false, why: 'no-evo' });
});

test('🧬 evolveRule: 🌈 이로치는 따라가고, 🤝 파트너도 옮겨 가고, 🎀 장식은 가방으로', () => {
  const p = cloneProfile(P({ caught: { 7: 1 }, partner: 7, items: {}, mons: { 7: { lv: 5, shiny: true, gear: 'crown', dye: 'red', losses: 2 } } }));
  const r = evolveRule(p, 7, 8, 100);
  assert.equal(p.mons[8].shiny, true, '이로치 어니부기');
  assert.equal(p.partner, 8, '파트너가 사라지지 않게');
  assert.equal(r.partnerMoved, true);
  assert.equal(p.items.crown, 1, '👑 장식은 가방으로 돌아온다');
  assert.equal(p.mons[7].gear, null);
  assert.equal(r.gearBack, 'crown');
  assert.equal(p.mons[8].losses, 0, '패배 누적은 새로');
  assert.equal(p.mons[8].dye, undefined, '염색은 따라가지 않는다');
});

test('🧬 evolveRule: 두 마리 중 하나만 진화시키면 파트너·장식은 그대로', () => {
  const p = cloneProfile(P({ caught: { 7: 2 }, partner: 7, mons: { 7: { lv: 5, gear: 'crown' } } }));
  const r = evolveRule(p, 7, 8, 100);
  assert.equal(r.last, false);
  assert.equal(p.partner, 7, '아직 한 마리 남았다');
  assert.equal(p.mons[7].gear, 'crown');
  assert.equal(p.items.crown, undefined);
  assert.equal(haveOf(p.caught[7], p.mons[7]), 1);
});

test('🧬 이브이: 고른 갈래로만 간다', () => {
  const p = cloneProfile(P({ caught: { 133: 1 }, mons: { 133: { lv: 5 } } }));
  assert.equal(evolveRule(p, 133, 196, 100).ok, true, '에브이');
  assert.equal(p.caught[196], 1);
  const p2 = cloneProfile(P({ caught: { 133: 1 }, mons: { 133: { lv: 5 } } }));
  assert.deepEqual(evolveRule(p2, 133, 6, 100), { ok: false, why: 'to' }, '이브이는 리자몽이 못 된다');
});

test('💾 백업 병합: 옛 백업을 되돌려도 진화가 되살아나지 않는다 (복제 방지)', () => {
  // 기기 A: 꼬부기를 Lv5로 키워 어니부기로 진화시켰다
  const now = cloneProfile(P({ caught: { 7: 1 }, mons: { 7: { lv: 5 } }, updatedAt: 200 }));
  evolveRule(now, 7, 8, 100);
  now.updatedAt = 200;
  // 기기 B(옛 백업): 아직 꼬부기 한 마리, 진화 전
  const old = P({ caught: { 7: 1 }, mons: { 7: { lv: 5 } }, updatedAt: 100 });

  for (const [a, b, who] of [[now, old, '최근이 먼저'], [old, now, '옛것이 먼저']]) {
    const m = mergeStatRecord('profile', a, b);
    assert.equal(m.caught[7], 1, `${who}: 도감 누적`);
    assert.equal(m.caught[8], 1, `${who}: 어니부기는 남는다`);
    assert.equal(m.mons[7].evo, 1, `${who}: 내보낸 수는 단조 (max)`);
    assert.equal(haveOf(m.caught[7], m.mons[7]), 0, `${who}: 꼬부기가 되살아나면 복제다`);
    assert.equal(m.mons[7].lv, 5, `${who}: 스톤을 쓴 레벨은 내려가지 않는다`);
  }
});

test('💾 백업 병합: 레벨은 max, 🌈 이로치는 OR — 어느 쪽에 있든 살아남는다', () => {
  const a = P({ caught: { 7: 1 }, mons: { 7: { lv: 9 } }, updatedAt: 100 });
  const b = P({ caught: { 7: 1 }, mons: { 7: { lv: 3, shiny: true } }, updatedAt: 200 });
  const m1 = mergeStatRecord('profile', a, b);
  assert.equal(m1.mons[7].lv, 9, '더 높은 레벨');
  assert.equal(m1.mons[7].shiny, true);
  const m2 = mergeStatRecord('profile', b, a);
  assert.equal(m2.mons[7].lv, 9);
  assert.equal(m2.mons[7].shiny, true);
});

test('💾 백업 병합: 레벨 기록이 아예 없는 옛 백업도 깨지지 않는다', () => {
  const old = P({ caught: { 7: 2 }, mons: { 7: { gear: 'crown' } }, updatedAt: 50 });
  const now = P({ caught: { 7: 2 }, mons: { 7: { lv: 4 } }, updatedAt: 99 });
  const m = mergeStatRecord('profile', old, now);
  assert.equal(m.mons[7].lv, 4);
  assert.equal(haveOf(m.caught[7], m.mons[7]), 2);
});

// ── ⚔️ 배틀 · 📊 부모 화면 ──

test('⚔️ attackMult: ⭐ 변신 × 🧬 레벨 — 둘 다 곱해진다', () => {
  assert.equal(attackMult(null, 0, 1), 1);
  assert.equal(Number(attackMult(null, 0, MAX_LV).toFixed(2)), 1.33);
  assert.equal(Number(attackMult('mega', 0, 1).toFixed(2)), 1.4);
  assert.equal(Number(attackMult('mega', 0, MAX_LV).toFixed(2)), 1.86, '메가 × 만렙');
  assert.equal(Number(attackMult('gmax', 3, 1).toFixed(2)), 1.6);
  assert.equal(attackMult('gmax', 0, 1), 1, '거다이맥스는 턴이 끝나면 사라진다');
  // 레벨을 모르면(옛 기록·후보에 lv가 없음) Lv1로 본다 — 조용히 세지면 안 된다
  assert.equal(attackMult(null, 0, undefined), 1);
  assert.equal(attackMult(null, 0, null), 1);
});

test('⚔️ 레벨이 배틀을 뒤집지는 않는다 — 만렙 강한 공격도 한 방에 못 이긴다', () => {
  const strong = DAMAGE.strong.star;                       // 가장 센 공격 + 연속 정답
  const best = Math.round(strong * attackMult(null, 0, MAX_LV));
  assert.ok(best < BATTLE.hp, `만렙 한 방(${best})이 상대 HP(${BATTLE.hp}) 이상이면 배틀이 사라진다`);
  // 변신까지 겹쳐도 한 방은 안 된다 (40 → 85). 대신 레벨이 분명히 보탬이 돼야 키울 마음이 든다
  const withForm = Math.round(strong * attackMult('gmax', 3, MAX_LV));
  assert.ok(withForm < BATTLE.hp, `변신 + 만렙(${withForm})도 한 방에 끝내면 안 된다`);
  assert.ok(withForm > Math.round(strong * attackMult('gmax', 3, 1)), '레벨이 보탬이 안 되면 키울 이유가 없다');
});

test('📊 growReport: 키운 것만 모으고, 쓴 스톤과 진화 횟수를 센다', () => {
  const p = {
    stonesSpent: 18,            // 실제로 쓴 값 (레벨에서 역산하지 않는다 — Codex 10차 #8)
    mons: {
      7: { lv: 5, evo: 2 },     // 꼬부기: Lv5 + 두 번 진화
      8: { lv: 10 },            // 어니부기: Lv10
      25: { lv: 1 },            // 피카츄: 안 키움
      143: { gear: 'crown' },   // 잠만보: 레벨 기록 없음
    },
  };
  const r = growReport(p);
  assert.deepEqual(r.list.map((g) => [g.ko, g.lv, g.evo]), [['어니부기', 10, 0], ['꼬부기', 5, 2]], '레벨 높은 순');
  assert.equal(r.stones, 18);
  assert.equal(r.evolved, 2);
});

test('📊 growReport: 기록이 없거나 깨져도 안 터진다', () => {
  assert.deepEqual(growReport(null), { list: [], stones: 0, evolved: 0 });
  assert.deepEqual(growReport({}), { list: [], stones: 0, evolved: 0 });
  assert.deepEqual(growReport({ mons: { 7: null } }), { list: [], stones: 0, evolved: 0 });
  const bad = growReport({ mons: { 7: { lv: 'abc', evo: -3 } } });
  assert.deepEqual(bad, { list: [], stones: 0, evolved: 0 }, '깨진 값은 Lv1·진화 0으로');
});

// ── Codex 10차에서 나온 것들 ──

test('🧬 #7 진화 레벨에서 멈춘다 — 한 과목 스톤만으로 체인 끝까지 갈 수 없다', () => {
  // 꼬부기 Lv5 → (진화) 어니부기 Lv10 → (진화) 거북왕 Lv12
  assert.equal(levelCapOf(7), 5);
  assert.equal(levelCapOf(8), 10);
  assert.equal(levelCapOf(9), MAX_LV, '거북왕은 더 진화하지 않으니 만렙까지');
  assert.equal(levelCapOf(143), MAX_LV, '진화가 없는 종도 만렙까지');
  assert.equal(nextCost(5, 7), null, '꼬부기는 Lv5에서 멈춘다');
  assert.equal(capReason(7, 5), 'evolve');
  assert.equal(capReason(9, MAX_LV), 'max');
  assert.deepEqual(nextCost(5, 8), { toLv: 6, stones: 2, coins: 60 }, '어니부기는 이어서 올라간다');
  // 누적 비용은 그대로 20개 — 단계가 끊겼을 뿐이다
  assert.equal(totalTo(5).stones + costBetween(5, 10).stones + costBetween(10, MAX_LV).stones, 20);
  // 케이시(영어) → 윤겔라(수학) → 후딘(영어): 어느 한 과목만으로는 못 간다
  assert.equal(levelCapOf(63), 5, '캐이시');
  assert.equal(subjectOf(63), 'english');
  assert.equal(subjectOf(64), 'math', '윤겔라는 수학 — 여기서 🔷가 필요해진다');
  assert.equal(levelCapOf(64), 10, '윤겔라');
});

test('⬆️ #7 levelUpRule도 진화 레벨에서 막는다 (값을 치르지 않는다)', () => {
  const p = cloneProfile(P({ caught: { 7: 1 }, coins: 999, items: { stone_english: 9 }, mons: { 7: { lv: 5 } } }));
  assert.deepEqual(levelUpRule(p, 7, 'stone_english'), { ok: false, why: 'evolve' });
  assert.equal(p.coins, 999, '값을 치르지 않는다');
  assert.equal(p.items.stone_english, 9);
  // 진화시킨 뒤에는 이어서 올라간다
  const q = cloneProfile(P({ caught: { 7: 1 }, coins: 999, items: { stone_english: 9 }, mons: { 7: { lv: 5 } } }));
  assert.equal(evolveRule(q, 7, 8, 100).ok, true);
  const r = levelUpRule(q, 8, 'stone_english');
  assert.equal(r.ok, true);
  assert.equal(r.to, 6);
});

test('⚔️ #2 진화로 보낸 뒤 배틀이 끝나도 도감이 사라지지 않는다', () => {
  // 창 A: 마지막 꼬부기를 진화 → caught 1, evo 1 (보유 0)
  const p = cloneProfile(P({ caught: { 7: 1 }, mons: { 7: { lv: 5, losses: 2 } } }));
  assert.equal(evolveRule(p, 7, 8, 100).ok, true);
  assert.equal(haveOf(p.caught[7], p.mons[7]), 0);
  // 창 B: 그 꼬부기로 하던 배틀이 세 번째 패배로 끝난다
  const r = battleLossRule(p, 7, 3);
  assert.equal(r.lost, false);
  assert.equal(r.stale, true, '이미 없는 포켓몬이라 패배를 적용하지 않는다');
  assert.equal(p.caught[7], 1, '★ 도감 칸이 사라지면 안 된다');
  // 그 뒤에 꼬부기를 새로 잡으면 제대로 한 마리가 된다 (삼켜지지 않는다)
  p.caught[7] += 1;
  assert.equal(haveOf(p.caught[7], p.mons[7]), 1);
});

test('⚔️ 보유가 남아 있으면 배틀 패배는 그대로 적용된다', () => {
  const p = cloneProfile(P({ caught: { 7: 2 }, mons: { 7: { losses: 2 } } }));
  const r = battleLossRule(p, 7, 3);
  assert.equal(r.lost, true, '3번 지면 한 마리가 떠난다');
  assert.equal(p.caught[7], 1);
  assert.equal(p.mons[7].losses, 0, '떠나면 패배 수는 0으로');
});

test('🎀 #1 장식 환불은 저장된 기록 기준 — 두 창에서 왕관이 복제되지 않는다', () => {
  // 창 A: 왕관 쓴 마지막 꼬부기를 진화 → 왕관이 가방으로 (items.crown = 1)
  const p = cloneProfile(P({ caught: { 7: 1 }, items: {}, mons: { 7: { lv: 5, gear: 'crown' } } }));
  assert.equal(evolveRule(p, 7, 8, 100).ok, true);
  assert.equal(p.items.crown, 1);
  assert.equal(p.mons[7].gear, null);
  // 창 B: 아직 왕관을 낀 줄 알고 "벗기"를 누른다 → 저장된 기록엔 이미 없으므로 또 돌려주지 않는다
  const r = gearRule(p, 7, null);
  assert.equal(r.ok, true);
  assert.equal(p.items.crown, 1, '★ 두 개가 되면 복제다');
});

test('🎀 장식 장착·교체는 가방 개수를 지킨다', () => {
  const p = cloneProfile(P({ caught: { 25: 1 }, items: { crown: 1, ribbon: 1 } }));
  assert.equal(gearRule(p, 25, 'crown').ok, true);
  assert.equal(p.items.crown, undefined, '가방에서 빠짐');
  assert.equal(gearRule(p, 25, 'ribbon').ok, true, '교체');
  assert.equal(p.items.crown, 1, '이전 것은 가방으로');
  assert.equal(p.items.ribbon, undefined);
  assert.deepEqual(gearRule(p, 25, 'cap'), { ok: false, why: 'item', gear: 'ribbon' }, '가방에 없는 것');
  assert.equal(p.mons[25].gear, 'ribbon', '실패하면 그대로');
});

test('🤝 #4 파트너·🌈 이로치는 데리고 있는 포켓몬에만', () => {
  const gone = cloneProfile(P({ caught: { 7: 1 }, items: { shiny_stone: 1 }, mons: { 7: { lv: 5, evo: 1 } } }));
  assert.deepEqual(partnerRule(gone, 7), { ok: false, why: 'have', partner: null });
  assert.deepEqual(shinyRule(gone, 7, 'shiny_stone'), { ok: false, why: 'caught' });
  assert.equal(gone.items.shiny_stone, 1, '스톤을 쓰지 않는다');

  const here = cloneProfile(P({ caught: { 7: 1 }, items: { shiny_stone: 1 }, mons: { 7: { lv: 5 } } }));
  assert.deepEqual(partnerRule(here, 7), { ok: true, partner: 7 });
  assert.equal(shinyRule(here, 7, 'shiny_stone').ok, true);
});

test('🧬 #10 "도감에 새로 등록"은 누적 기록으로 본다', () => {
  // 어니부기를 한 번 얻었다가 거북왕으로 보낸 뒤, 다시 꼬부기를 진화시키면 "새로 등록"이 아니다
  const p = cloneProfile(P({ caught: { 7: 1, 8: 1 }, mons: { 7: { lv: 5 }, 8: { lv: 10, evo: 1 } } }));
  assert.equal(haveOf(p.caught[8], p.mons[8]), 0, '어니부기는 지금 없다');
  const r = evolveRule(p, 7, 8, 100);
  assert.equal(r.ok, true);
  assert.equal(r.first, false, '★ 도감엔 이미 있었다');
});

test('📊 #8 쓴 스톤은 레벨에서 역산하지 않고 실제로 센다', () => {
  const p = cloneProfile(P({ caught: { 7: 1 }, coins: 999, items: { stone_english: 9 } }));
  for (let i = 0; i < 4; i++) assert.equal(levelUpRule(p, 7, 'stone_english').ok, true);
  assert.equal(p.mons[7].lv, 5);
  assert.equal(p.stonesSpent, 4);
  // 진화하면 어니부기도 Lv5가 된다 — 레벨로 역산하면 8개로 부풀려진다
  assert.equal(evolveRule(p, 7, 8, 100).ok, true);
  assert.equal(p.mons[8].lv, 5);
  assert.equal(growReport(p).stones, 4, '★ 실제로 쓴 것은 4개다');
  assert.equal(growReport(p).evolved, 1);
});

test('📊 #8 쓴 스톤은 단조 카운터 — 옛 백업이 되돌리지 않는다', () => {
  const now = P({ caught: { 7: 1 }, stonesSpent: 14, mons: { 7: { lv: 10 } }, updatedAt: 200 });
  const old = P({ caught: { 7: 1 }, stonesSpent: 4, mons: { 7: { lv: 5 } }, updatedAt: 100 });
  assert.equal(mergeStatRecord('profile', now, old).stonesSpent, 14);
  assert.equal(mergeStatRecord('profile', old, now).stonesSpent, 14);
});
