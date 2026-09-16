// 🛒 아이템·코인 규칙 + 프로필의 가방/꾸미기 테스트: node --test tests/items.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COIN, puzzleCoins, streakCoins, GEAR, DYE, POTION, HP, GOLDEN, ITEMS, itemById, lootBox, canBuy } from '../js/items.js';
import {
  coins, gainCoins, itemCount, inventory, addItem, buyItem, getLook, equipGear, applyDye, getProfileSnapshot,
  getPartner, setPartner, hpOf, isTired, changeHp, usePotion, catchAttempt, setGearPos,
  hasKeystone, hasMegaStone, hasGmax, equipMega, gainMushroom, makeSoup,
} from '../js/xp.js';
import { mergeStatRecord } from '../js/db.js';
import { FORMS } from '../js/pokemon.js';
import { ROSTER } from '../js/pokemon.js';

test('카탈로그: id가 겹치지 않고 가격은 양수, 장식은 head/face', () => {
  const ids = ITEMS.map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const it of ITEMS) {
    assert.ok(it.emoji && it.ko, it.id);
    assert.ok(['gear', 'dye', 'potion', 'ball', 'mega', 'mushroom'].includes(it.kind), it.id);
    // 값이 없는 것 = 코인으로 못 사는 것: 🌟 황금 볼(복습으로만) · 🍄 다이버섯(학습으로만 모음)
    if (it.kind === 'ball' || it.kind === 'mushroom') assert.equal(it.price, 0, it.id);
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

test('lootBox: 귀한 것(🌟 황금 볼·⭐ 메가·🍄 버섯)은 상자에서 안 나온다', () => {
  const loot = ITEMS.filter((i) => !['ball', 'mega', 'mushroom'].includes(i.kind));
  assert.equal(lootBox(() => 0), loot[0].id);
  assert.equal(lootBox(() => 0.999999), loot[loot.length - 1].id);
  assert.ok(itemById(lootBox()));
  const forbidden = new Set(ITEMS.filter((i) => ['ball', 'mega', 'mushroom'].includes(i.kind)).map((i) => i.id));
  for (let i = 0; i <= 40; i++) assert.equal(forbidden.has(lootBox(() => i / 40)), false, '상자에서 나오면 안 되는 것');
  assert.equal(canBuy(GOLDEN.id, 9999).ok, false, '코인이 아무리 많아도 못 삼');
  assert.equal(canBuy('mushroom', 9999).ok, false, '🍄 다이버섯도 돈으로 못 삼 (학습으로만)');
});

test('canBuy: 부족한 코인 계산', () => {
  assert.deepEqual(canBuy('ribbon', 30), { ok: true, short: 0 });
  assert.deepEqual(canBuy('ribbon', 12), { ok: false, short: 18 });
  assert.deepEqual(canBuy('nope', 999), { ok: false, short: 0 });
});

test('프로필: 코인 획득·구매·가방', () => {
  assert.equal(coins(), 0);
  assert.equal(buyItem('ribbon'), false, '코인 없으면 못 삼');
  gainCoins(45);
  assert.equal(coins(), 45);
  assert.equal(buyItem('ribbon'), true);
  assert.equal(coins(), 15);
  assert.equal(itemCount('ribbon'), 1);
  assert.equal(buyItem('crown'), false);
  assert.equal(coins(), 15, '실패하면 코인 그대로');
  gainCoins(-10);
  assert.equal(coins(), 15, '음수는 무시');
  assert.equal(addItem('red', 2), true);
  assert.equal(addItem('nope'), false);
  assert.deepEqual(inventory(), { ribbon: 1, red: 2 });
  assert.equal(getProfileSnapshot().coinsEarned, 45);
});

test('프로필: 장식 장착·교체·벗기 (가방 개수 보존)', () => {
  assert.deepEqual(getLook(25), { gear: null, dye: null, hp: 100, anchor: null, gearPos: null }); // anchor = 자동 머리 위치, gearPos = 아이가 옮긴 자리
  assert.equal(equipGear(25, 'crown'), false, '가방에 없음');
  assert.equal(equipGear(25, 'ribbon'), true);
  assert.equal(getLook(25).gear, 'ribbon');
  assert.equal(itemCount('ribbon'), 0, '장착하면 가방에서 빠짐');
  assert.equal(equipGear(1, 'ribbon'), false, '이미 다른 포켓몬이 씀');
  addItem('cap');
  assert.equal(equipGear(25, 'cap'), true, '교체');
  assert.equal(getLook(25).gear, 'cap');
  assert.equal(itemCount('ribbon'), 1, '이전 장식은 가방으로');
  assert.equal(itemCount('cap'), 0);
  assert.equal(equipGear(25, null), true, '벗기');
  assert.equal(getLook(25).gear, null);
  assert.equal(itemCount('cap'), 1);
  assert.equal(equipGear(25, 'red'), false, '염색약은 장착 불가');
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
  assert.deepEqual(getLook(25), { gear: null, dye: null, hp: 100, anchor: null, gearPos: null }); // anchor = 자동 머리 위치, gearPos = 아이가 옮긴 자리
});

test('❤️ 파트너·HP·물약: 처음 잡은 포켓몬이 파트너, HP는 0~100, 물약은 가방에서 소모', () => {
  assert.equal(getPartner(), null);
  assert.equal(setPartner(25), false, '안 잡은 포켓몬은 파트너 불가');
  const c = catchAttempt(25, () => 0);
  assert.equal(c.caught, true); assert.equal(c.partnerSet, true);
  assert.equal(getPartner(), 25);
  const c2 = catchAttempt(4, () => 0);
  assert.equal(c2.partnerSet, false, '이미 파트너가 있으면 그대로');
  assert.equal(setPartner(4), true);
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

test('⭐ 메가진화: 🔑 키스톤 + 💠 메가스톤, 빼면 가방으로 돌아온다', () => {
  gainCoins(2000);
  assert.equal(hasKeystone(), false);
  assert.equal(equipMega(94, true), false, '스톤이 없으면 못 끼운다');

  buyItem('keystone');
  buyItem('megastone');
  assert.equal(hasKeystone(), true);
  assert.equal(itemCount('megastone'), 1);

  assert.equal(equipMega(94, true), true, '팬텀에게 끼움');
  assert.equal(hasMegaStone(94), true);
  assert.equal(itemCount('megastone'), 0, '가방에서 빠진다');

  assert.equal(equipMega(94, false), true);
  assert.equal(hasMegaStone(94), false);
  assert.equal(itemCount('megastone'), 1, '빼면 돌아온다');
});

test('⭐ 거다이맥스: 🍄 다이버섯 10개로 🍲 다이스프 (돈으로는 못 삼)', () => {
  gainCoins(5000);
  assert.equal(buyItem('mushroom'), false, '다이버섯은 상점에서 못 산다');

  gainMushroom(9);
  assert.equal(makeSoup(25), false, '9개로는 못 만든다');
  assert.equal(hasGmax(25), false);

  gainMushroom(1);
  assert.equal(makeSoup(25), true);
  assert.equal(hasGmax(25), true, '피카츄가 거다이맥스할 수 있게 됨');
  assert.equal(itemCount('mushroom'), 0, '버섯 10개를 썼다');
  assert.equal(makeSoup(25), false, '이미 먹은 포켓몬에게 또 먹이지 않는다');
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
