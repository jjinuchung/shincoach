// 🛒 아이템·코인 규칙 + 프로필의 가방/꾸미기 테스트: node --test tests/items.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COIN, puzzleCoins, streakCoins, GEAR, DYE, POTION, HP, GOLDEN, ITEMS, itemById, lootBox, canBuy, STONES, FUTURE_STONES, RADAR, STONE_SHOP, stoneOf, costOf, priceText, SHINY_STONE } from '../js/items.js';
import {
  coins, gainCoins, itemCount, inventory, addItem, buyItem, getLook, equipGear, applyDye, getProfileSnapshot,
  getPartner, setPartner, hpOf, isTired, changeHp, usePotion, catchAttempt, setGearPos,
  hasKeystone, hasMegaStone, hasGmax, equipMega, gainMushroom, makeSoup, ballChance, catchChance,
} from '../js/xp.js';
import { mergeStatRecord, shinyRule, cloneProfile } from '../js/db.js';
import { FORMS } from '../js/pokemon.js';
import { ROSTER } from '../js/pokemon.js';

test('카탈로그: id가 겹치지 않고 가격은 양수, 장식은 head/face', () => {
  const ids = ITEMS.map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const it of ITEMS) {
    assert.ok(it.emoji && it.ko, it.id);
    assert.ok(['gear', 'dye', 'potion', 'ball', 'mega', 'mushroom', 'stone', 'tool', 'egg'].includes(it.kind), it.id);
    // 값이 없는 것 = 코인으로 못 사는 것: 🔴 몬스터볼(무료) · 🌟 황금 볼(복습으로만) · 🍄 다이버섯(학습으로만) · 🧤 스톤(학습으로만)
    if (it.id === 'pokeball' || it.id === 'goldenball' || it.kind === 'mushroom' || it.kind === 'stone') assert.equal(it.price, 0, it.id);
    else assert.ok(it.price > 0, it.id);
  }
  for (const p of POTION) assert.ok(p.heal > 0, p.id);
  assert.equal(itemById('potion').kind, 'potion');
  assert.equal(HP.max, 100);
  assert.ok(HP.revealed < 0 && HP.speakSkipped < 0 && HP.missedDay < 0 && HP.goalHeal > 0);
  for (const g of GEAR) assert.ok(g.pos === 'head' || g.pos === 'face', g.id);
  assert.equal(itemById('crown').kind, 'gear');
  assert.equal(itemById('red').kind, 'dye');
  assert.equal(itemById('nope'), null);
  assert.ok(DYE.find((d) => d.id === 'shiny').cls === 'shiny');
  // 염색약은 CSS filter나 전용 클래스 중 하나로 색을 바꾼다 — 둘 다 없으면 사도 아무 일이 안 일어난다
  for (const d of DYE) assert.ok(d.filter || d.cls, `${d.id}: 색을 바꿀 방법이 없다`);
  // 🖤 까망 (진우 요청): hue-rotate로는 안 되고 밝기를 낮춰야 한다
  const black = DYE.find((d) => d.id === 'black');
  assert.ok(black, '까망 염색약');
  assert.match(black.filter, /brightness\(0?\.[1-5]\d*\)/, '밝기를 낮춰야 까맣다');
  assert.equal(itemById('black').kind, 'dye');
});

test('코인 규칙: 퍼즐 5/3/2, 정답 공개 0, 스트릭 5×일 최대 50', () => {
  assert.equal(puzzleCoins({ solved: true, wrong: 0 }), 5);
  assert.equal(puzzleCoins({ solved: true, wrong: 1 }), 3);
  assert.equal(puzzleCoins({ solved: true, wrong: 7 }), 2);
  assert.equal(puzzleCoins({ solved: false, wrong: 3 }), COIN.puzzleRevealed);
  assert.equal(puzzleCoins(null), 0);
  assert.equal(streakCoins(1), 5);
  assert.equal(streakCoins(4), 20);
  assert.equal(streakCoins(30), 50);
  assert.equal(streakCoins(0), 5);
});

test('lootBox: 귀한 것(🌟 황금 볼·⭐ 메가·🍄 버섯·🧤 스톤·스톤이 드는 물건)은 상자에서 안 나온다', () => {
  const loot = ITEMS.filter((i) => !['ball', 'mega', 'mushroom', 'stone'].includes(i.kind) && !i.stones);
  assert.equal(lootBox(() => 0), loot[0].id);
  assert.equal(lootBox(() => 0.999999), loot[loot.length - 1].id);
  assert.ok(itemById(lootBox()));
  const forbidden = new Set(ITEMS.filter((i) => ['ball', 'mega', 'mushroom', 'stone'].includes(i.kind) || i.stones).map((i) => i.id));
  for (let i = 0; i <= 40; i++) assert.equal(forbidden.has(lootBox(() => i / 40)), false, '상자에서 나오면 안 되는 것');
  assert.equal(canBuy(GOLDEN.id, 9999).ok, false, '코인이 아무리 많아도 못 삼');
  assert.equal(canBuy('mushroom', 9999).ok, false, '🍄 다이버섯도 돈으로 못 삼 (학습으로만)');
});

test('canBuy: 부족한 코인 계산', () => {
  assert.deepEqual(canBuy('ribbon', 30), { ok: true, short: 0, shortStones: [] });
  assert.deepEqual(canBuy('ribbon', 12), { ok: false, short: 18, shortStones: [] });
  assert.deepEqual(canBuy('nope', 999), { ok: false, short: 0, shortStones: [] });
});

test('🧤 스톤 상점: 레이더는 💰100 + 🔷1 — 스톤이 없으면 코인이 많아도 못 사고, 스톤은 돈으로 못 산다 (2026-09-22 아버님 "인피니티 스톤")', () => {
  assert.deepEqual(STONES.map((s) => s.id), ['stone_math', 'stone_english']);
  assert.equal(stoneOf('math').emoji, '🔷'); assert.equal(stoneOf('english').emoji, '🔶'); assert.equal(stoneOf('science'), null);
  assert.ok(FUTURE_STONES.length >= 1, '다음 과목 자리(🔒)가 건틀릿에 보인다');
  assert.deepEqual(costOf(RADAR), { coins: 100, items: { stone_math: 1 } });
  assert.deepEqual(costOf(itemById('ribbon')), { coins: 30, items: {} }, '스톤 없는 물건은 코인만');
  assert.equal(priceText(RADAR), '💰100 + 🔷1');
  assert.equal(priceText(itemById('ribbon')), '💰30');
  assert.deepEqual(canBuy('radar', 9999, {}), { ok: false, short: 0, shortStones: [{ id: 'stone_math', emoji: '🔷', ko: '수학스톤', n: 1 }] }, '코인이 아무리 많아도 스톤 없이는 못 산다');
  assert.deepEqual(canBuy('radar', 50, { stone_math: 2 }), { ok: false, short: 50, shortStones: [] });
  assert.deepEqual(canBuy('radar', 100, { stone_math: 1 }), { ok: true, short: 0, shortStones: [] });
  assert.equal(canBuy('stone_math', 9999, {}).ok, false, '스톤은 파는 물건이 아니다');
  assert.ok(STONE_SHOP.every((it) => it.stones && Object.keys(it.stones).length), '스톤 상점 물건은 전부 스톤이 든다');
});

test('프로필: 코인 획득·구매·가방', async () => {
  assert.equal(coins(), 0);
  assert.equal(await buyItem('ribbon'), false, '코인 없으면 못 삼');
  gainCoins(45);
  assert.equal(coins(), 45);
  assert.equal(await buyItem('ribbon'), true);
  assert.equal(coins(), 15);
  assert.equal(itemCount('ribbon'), 1);
  assert.equal(await buyItem('crown'), false);
  assert.equal(coins(), 15, '실패하면 코인 그대로');
  gainCoins(-10);
  assert.equal(coins(), 15, '음수는 무시');
  assert.equal(addItem('red', 2), true);
  assert.equal(addItem('nope'), false);
  assert.deepEqual(inventory(), { ribbon: 1, red: 2 });
  assert.equal(getProfileSnapshot().coinsEarned, 45);
});

test('프로필: 장식 장착·교체·벗기 (가방 개수 보존) — 이제 한 트랜잭션이라 await', async () => {
  assert.deepEqual(getLook(25), { gear: null, dye: null, hp: 100, anchor: null, gearPos: null, shiny: false, shinyUrl: null }); // anchor = 자동 머리 위치, gearPos = 아이가 옮긴 자리, shiny = 🌈 이로치
  assert.equal(await equipGear(25, 'crown'), false, '가방에 없음');
  assert.equal(await equipGear(25, 'ribbon'), true);
  assert.equal(getLook(25).gear, 'ribbon');
  assert.equal(itemCount('ribbon'), 0, '장착하면 가방에서 빠짐');
  assert.equal(await equipGear(1, 'ribbon'), false, '이미 다른 포켓몬이 씀');
  addItem('cap');
  assert.equal(await equipGear(25, 'cap'), true, '교체');
  assert.equal(getLook(25).gear, 'cap');
  assert.equal(itemCount('ribbon'), 1, '이전 장식은 가방으로');
  assert.equal(itemCount('cap'), 0);
  assert.equal(await equipGear(25, null), true, '벗기');
  assert.equal(getLook(25).gear, null);
  assert.equal(itemCount('cap'), 1);
  assert.equal(await equipGear(25, 'red'), false, '염색약은 장착 불가');
});

test('프로필: 염색은 소모, 원래 색은 무료', () => {
  assert.equal(applyDye(25, 'blue'), false, '없음');
  assert.equal(applyDye(25, 'red'), true);
  assert.equal(getLook(25).dye, 'red');
  assert.equal(itemCount('red'), 1, '하나 소모');
  assert.equal(applyDye(25, 'red'), true, '같은 색이면 소모 없음');
  assert.equal(itemCount('red'), 1);
  assert.equal(applyDye(25, null), true);
  assert.equal(getLook(25).dye, null);
  assert.equal(itemCount('red'), 1, '원래 색으로는 공짜');
  assert.equal(applyDye(25, 'cap'), false, '장식은 염색 불가');
  assert.deepEqual(getLook(25), { gear: null, dye: null, hp: 100, anchor: null, gearPos: null, shiny: false, shinyUrl: null }); // anchor = 자동 머리 위치, gearPos = 아이가 옮긴 자리, shiny = 🌈 이로치
});

test('❤️ 파트너·HP·물약: 처음 잡은 포켓몬이 파트너, HP는 0~100, 물약은 가방에서 소모', async () => {
  assert.equal(getPartner(), null);
  assert.equal(await setPartner(25), false, '안 잡은 포켓몬은 파트너 불가');
  const c = catchAttempt(25, () => 0);
  assert.equal(c.caught, true); assert.equal(c.partnerSet, true);
  assert.equal(getPartner(), 25);
  const c2 = catchAttempt(4, () => 0);
  assert.equal(c2.partnerSet, false, '이미 파트너가 있으면 그대로');
  assert.equal(await setPartner(4), true);
  assert.equal(getPartner(), 4);
  assert.equal(hpOf(4), 100, '기록 없으면 가득');
  assert.equal(getLook(4).hp, 100);
  assert.deepEqual(changeHp(4, HP.revealed), { from: 100, to: 80 });
  assert.deepEqual(changeHp(4, -500), { from: 80, to: 0 }, '0 아래로 안 내려감');
  assert.equal(isTired(4), true);
  assert.equal(getLook(4).hp, 0);
  assert.equal(usePotion(4, 'potion').ok, false, '물약 없음');
  addItem('potion', 2); addItem('potion_big');
  assert.deepEqual(usePotion(4, 'potion'), { ok: true, from: 0, to: 30 });
  assert.equal(itemCount('potion'), 1);
  assert.equal(isTired(4), false);
  assert.deepEqual(usePotion(4, 'potion_big'), { ok: true, from: 30, to: 100 }, '큰 물약은 가득까지');
  assert.equal(usePotion(4, 'cap').ok, false, '물약이 아닌 건 못 먹임');
  assert.deepEqual(changeHp(4, 50), { from: 100, to: 100 }, '100 위로 안 올라감');
  assert.equal(itemCount('potion_big'), 0);
});

test('백업 병합: 코인·가방·꾸밈은 최근 저장 쪽, 누적치는 큰 값', () => {
  const cur = { id: 'me', xp: 500, coins: 20, coinsEarned: 300, items: { cap: 1 }, mons: { 25: { gear: 'cap', hp: 40 } }, partner: 25, caught: { 25: 2 }, updatedAt: 200 };
  const old = { id: 'me', xp: 400, coins: 90, coinsEarned: 250, items: { crown: 1 }, mons: { 25: { gear: 'crown' } }, partner: 1, caught: { 25: 1, 1: 1 }, updatedAt: 100 };
  const m = mergeStatRecord('profile', cur, old);
  assert.equal(m.xp, 500);
  assert.equal(m.coinsEarned, 300);
  assert.equal(m.coins, 20, '옛 백업의 코인이 되살아나지 않음');
  assert.deepEqual(m.items, { cap: 1 });
  assert.deepEqual(m.mons, { 25: { gear: 'cap', hp: 40 } });
  assert.equal(m.partner, 25, '파트너도 최근 쪽');
  assert.deepEqual(m.caught, { 25: 2, 1: 1 });
  const m2 = mergeStatRecord('profile', old, cur);
  assert.equal(m2.coins, 20, '순서를 바꿔도 최근 쪽');
  assert.deepEqual(m2.items, { cap: 1 });
  const m3 = mergeStatRecord('profile', { id: 'me', xp: 1, updatedAt: 5 }, { id: 'me', xp: 2, updatedAt: 1 });
  assert.equal(m3.coins, 0); assert.deepEqual(m3.items, {}); assert.deepEqual(m3.mons, {}); assert.equal(m3.partner, null);
  const d = mergeStatRecord('daily', { date: 'd', doneKeys: [], hpMissed: true }, { date: 'd', doneKeys: [] });
  assert.equal(d.hpMissed, true, 'HP 감소 적용 표시는 한쪽이라도 true면 true');
});

test('🎀 장식 자리를 포켓몬마다 따로 저장한다 (자동 위치가 안 맞을 때)', () => {
  assert.equal(getLook(7).gearPos, null, '처음엔 자동 위치');
  const saved = setGearPos(7, { x: 0.4213, y: 0.1789 });
  assert.deepEqual(saved, { x: 0.421, y: 0.179 }, '소수점 3자리로');
  assert.deepEqual(getLook(7).gearPos, { x: 0.421, y: 0.179 });
  assert.equal(getLook(25).gearPos, null, '다른 포켓몬은 영향 없음');

  // null이면 자동 위치로 되돌림
  assert.equal(setGearPos(7, null), null);
  assert.equal(getLook(7).gearPos, null);
});

test('🎀 이상한 값은 저장하지 않는다', () => {
  setGearPos(9, { x: 0.5, y: 0.5 });
  assert.ok(getLook(9).gearPos);
  setGearPos(9, { x: NaN, y: 0.5 });
  assert.equal(getLook(9).gearPos, null, '숫자가 아니면 자동 위치로');
});

test('⭐ 메가진화: 🔑 키스톤 + 💠 메가스톤, 빼면 가방으로 돌아온다', async () => {
  gainCoins(2000);
  assert.equal(hasKeystone(), false);
  assert.equal(await equipMega(94, true), false, '스톤이 없으면 못 끼운다');

  await buyItem('keystone');
  await buyItem('megastone');
  assert.equal(hasKeystone(), true);
  assert.equal(itemCount('megastone'), 1);

  assert.equal(await equipMega(94, true), true, '팬텀에게 끼움');
  assert.equal(hasMegaStone(94), true);
  assert.equal(itemCount('megastone'), 0, '가방에서 빠진다');

  assert.equal(await equipMega(94, false), true);
  assert.equal(hasMegaStone(94), false);
  assert.equal(itemCount('megastone'), 1, '빼면 돌아온다');
});

test('⭐ 거다이맥스: 🍄 다이버섯 10개로 🍲 다이스프 (돈으로는 못 삼)', async () => {
  gainCoins(5000);
  assert.equal(await buyItem('mushroom'), false, '다이버섯은 상점에서 못 산다');

  gainMushroom(9);
  assert.equal(await makeSoup(25), false, '9개로는 못 만든다');
  assert.equal(hasGmax(25), false);

  gainMushroom(1);
  assert.equal(await makeSoup(25), true);
  assert.equal(hasGmax(25), true, '피카츄가 거다이맥스할 수 있게 됨');
  assert.equal(itemCount('mushroom'), 0, '버섯 10개를 썼다');
  assert.equal(await makeSoup(25), false, '이미 먹은 포켓몬에게 또 먹이지 않는다');
});

test('⭐ 변신 표: 30마리, 그림 id는 겹치지 않는다', () => {
  const ids = Object.keys(FORMS).map(Number);
  assert.equal(ids.length, 30);
  const arts = [];
  for (const id of ids) {
    const f = FORMS[id];
    assert.ok(f.mega || f.gmax, `${id}는 변신이 하나는 있어야 한다`);
    if (f.mega) arts.push(f.mega);
    if (f.gmax) arts.push(f.gmax);
    assert.ok(ROSTER.some((m) => m.id === id), `${id}는 명단에 있어야 한다`);
  }
  assert.equal(new Set(arts).size, arts.length, '그림 id가 겹치면 안 됨');
  assert.deepEqual(FORMS[94], { mega: 10038, gmax: 10202 }, '팬텀은 둘 다 된다');
});

test('🔴 볼 등급: 슈퍼볼 1.5배 · 하이퍼볼 2배 · 마스터볼은 반드시 잡힘', () => {
  const legendary = 4; // 전설 (기본 3%)
  const base = ballChance('pokeball', legendary, 1);
  assert.ok(Math.abs(base - catchChance(legendary, 1)) < 1e-9, '몬스터볼은 지금까지와 같다');
  assert.ok(ballChance('greatball', legendary, 1) > base, '슈퍼볼이 더 잘 잡힌다');
  assert.ok(ballChance('ultraball', legendary, 1) > ballChance('greatball', legendary, 1), '하이퍼볼이 더 잘 잡힌다');
  assert.equal(ballChance('masterball', legendary, 1), 1, '마스터볼은 반드시');
  // 🌟 황금 볼은 하이퍼볼과 같은 2배지만 상한이 더 높다 (흔한 포켓몬에서 차이가 난다)
  assert.ok(ballChance('goldenball', 1, 20) >= ballChance('ultraball', 1, 20));
  assert.equal(ballChance('없는볼', legendary, 1), base, '모르는 볼이면 몬스터볼로');
});

test('🔴 볼은 던지면 없어지고, 가방에 없으면 몬스터볼로 던진다', async () => {
  gainCoins(3000);
  await buyItem('greatball');
  assert.equal(itemCount('greatball'), 1);

  const r1 = catchAttempt(700, () => 0.99, { ball: 'greatball' }); // 확률과 무관하게 소모 확인
  assert.equal(r1.ball, 'greatball');
  assert.equal(itemCount('greatball'), 0, '던지면 없어진다');

  const r2 = catchAttempt(700, () => 0.99, { ball: 'greatball' });
  assert.equal(r2.ball, 'pokeball', '가방에 없으면 그냥 몬스터볼');

  const r3 = catchAttempt(151, () => 0.99, { ball: 'masterball' });
  assert.equal(r3.ball, 'pokeball', '안 산 마스터볼은 못 쓴다');

  await buyItem('masterball');
  const r4 = catchAttempt(151, () => 0.99, { ball: 'masterball' });
  assert.equal(r4.ball, 'masterball');
  assert.equal(r4.caught, true, '마스터볼은 확률과 상관없이 잡힌다');
});

test('🌈 이로치의 스톤: 🔷3 🔶3 💰500, 스톤 상점에만 · shinyRule은 잡은 포켓몬·아직 아닐 때·스톤 있을 때만 한 트랜잭션에서 (스톤 소모 + shiny) · getLook에 shiny (2026-09-22 4c)', () => {
  assert.deepEqual(costOf(SHINY_STONE), { coins: 500, items: { stone_math: 3, stone_english: 3 } });
  assert.equal(SHINY_STONE.id, 'shiny_stone', "'shiny'는 염색약 id라 겹치면 안 된다");
  assert.ok(itemById('shiny') && itemById('shiny').kind === 'dye', '염색약 shiny는 그대로');
  assert.ok(STONE_SHOP.includes(SHINY_STONE));
  const p = cloneProfile({ coins: 0, caught: { 25: 1 }, items: { shiny_stone: 1 }, mons: { 25: { gear: 'cap' } } });
  assert.deepEqual(shinyRule(p, 4), { ok: false, why: 'caught' }, '안 잡은 포켓몬');
  assert.deepEqual(shinyRule(p, 25), { ok: true });
  assert.deepEqual(p.mons[25], { gear: 'cap', shiny: true }, '꾸밈은 그대로, shiny만 얹는다');
  assert.equal(p.items.shiny_stone, undefined, '스톤 하나 소모(0이면 지워짐)');
  assert.deepEqual(shinyRule(p, 25), { ok: false, why: 'already' });
  p.caught[4] = 1;
  assert.deepEqual(shinyRule(p, 4), { ok: false, why: 'item' }, '스톤이 없다');
});
