// 🛒 아이템·코인 규칙 + 프로필의 가방/꾸미기 테스트: node --test tests/items.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COIN, puzzleCoins, streakCoins, GEAR, DYE, POTION, HP, ITEMS, itemById, lootBox, canBuy } from '../js/items.js';
import {
  coins, gainCoins, itemCount, inventory, addItem, buyItem, getLook, equipGear, applyDye, getProfileSnapshot,
  getPartner, setPartner, hpOf, isTired, changeHp, usePotion, catchAttempt,
} from '../js/xp.js';
import { mergeStatRecord } from '../js/db.js';

test('카탈로그: id가 겹치지 않고 가격은 양수, 장식은 head/face', () => {
  const ids = ITEMS.map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const it of ITEMS) {
    assert.ok(it.price > 0, it.id);
    assert.ok(it.emoji && it.ko, it.id);
    assert.ok(it.kind === 'gear' || it.kind === 'dye' || it.kind === 'potion');
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

test('lootBox: 항상 카탈로그 안의 아이템', () => {
  assert.equal(lootBox(() => 0), ITEMS[0].id);
  assert.equal(lootBox(() => 0.999999), ITEMS[ITEMS.length - 1].id);
  assert.ok(itemById(lootBox()));
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
  assert.deepEqual(getLook(25), { gear: null, dye: null, hp: 100 });
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
  assert.deepEqual(getLook(25), { gear: null, dye: null, hp: 100 });
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
