// 📣 동료 부르기 (v324, 2026-10-23 진우 아이디어 → 아버님 "진행해") — node --test tests/callpal324.test.js
//  배틀에서 HP가 바닥날 무렵 쓰면 레벨이 같은(없으면 가장 가까운) 동료가 달려와 대신 맞고 함께 공격한다 · 한 배틀에 한 번 · 동료는 패배가 안 는다
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PAL, pickPal, palButton, palDamage, damageForTier, BATTLE } from '../js/battle.js';
import { CALL_PAL, ITEMS, itemById, canBuy, lootBox, parcelOf, POTION } from '../js/items.js';
import { itemSellPrice } from '../js/sell.js';
import { lvMult } from '../js/evolve.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const mon = (id, lv) => ({ id, ko: `#${id}`, lv });

test('📣 아이템: 💰60 · 배틀 소모품 · 등록부·상점·🎁 상자·🏪 5일장·📦 구호품에 들어간다', () => {
  assert.equal(CALL_PAL.id, 'callpal');
  assert.equal(CALL_PAL.price, 60);
  assert.equal(CALL_PAL.kind, 'battle');
  assert.ok(!CALL_PAL.stones, '코인만 (아버님 기본안)');
  assert.equal(itemById('callpal'), ITEMS.find((it) => it.id === 'callpal'));
  assert.ok(CALL_PAL.price > Math.max(...POTION.map((p) => p.price)), '큰 물약보다 비싸다');
  assert.deepEqual(canBuy('callpal', 60), { ok: true, short: 0, shortStones: [] });
  assert.equal(canBuy('callpal', 59).short, 1);
  const seen = new Set();
  for (let i = 0; i < 2000; i++) seen.add(lootBox(() => i / 2000));
  assert.ok(seen.has('callpal'), '🎁 레벨업 상자에서도 나올 수 있다 (물약처럼)');
  assert.equal(itemSellPrice('callpal'), 30, '🏪 5일장 — 산 값의 절반');
  assert.deepEqual(parcelOf({ id: 'g1', items: { callpal: 2 } }).items, { callpal: 2 }, '📦 아빠 구호품으로 보낼 수 있다');
  assert.match(CALL_PAL.hint, /HP가 30 이하/);
  // Codex 128차 #1: 같은 레벨이 없을 때 누가 오는지도 말한다 — 다른 레벨 동료가 와도 고장으로 보이지 않게
  assert.match(CALL_PAL.hint, /레벨이 같은 동료\(없으면 레벨이 가장 가까운 동료\)/);
  assert.ok(read('js/shop.js').includes('같은 레벨이 없으면 레벨이 가장 가까운 동료가 와요'));
});

test('📣 누가 오나: 지금 싸우는 포켓몬과 레벨이 같은 동료 · 없으면 가장 가까운 레벨 · 여럿이면 고르게 · 싸우는 포켓몬 자신은 빼고', () => {
  const my = mon(1, 3);
  const mine = [my, mon(2, 1), mon(3, 3), mon(4, 5), mon(5, 3)];
  const got = new Set();
  for (let i = 0; i < 30; i++) got.add(pickPal(mine, my, () => i / 30).id);
  assert.deepEqual([...got].sort(), [3, 5], '같은 Lv3 둘에서만, 고르게');
  // 같은 레벨이 없으면 가장 가까운 레벨 (Lv4 → Lv3·Lv5 둘 다 1 차이)
  const near = new Set();
  for (let i = 0; i < 30; i++) near.add(pickPal([mon(2, 1), mon(3, 3), mon(4, 5), mon(9, 4)], mon(9, 4), () => i / 30).id);
  assert.deepEqual([...near].sort(), [3, 4]);
  assert.equal(pickPal([mon(2, 1), mon(3, 12)], mon(1, 10), () => 0).id, 3, 'Lv10이면 Lv12가 Lv1보다 가깝다');
  // 레벨이 없으면 Lv1로 친다 — 레벨 없는 동료와 Lv1 동료는 같은 레벨(둘 다 올 수 있다)
  assert.equal(pickPal([{ id: 2 }, mon(3, 6)], { id: 1 }, () => 0).id, 2);
  const lv1 = new Set();
  for (let i = 0; i < 10; i++) lv1.add(pickPal([{ id: 2 }, mon(3, 1), mon(4, 2)], mon(1, 1), () => i / 10).id);
  assert.deepEqual([...lv1].sort(), [2, 3]);
  // 부를 동료가 없음
  assert.equal(pickPal([my], my), null, '나 혼자');
  assert.equal(pickPal([], my), null);
  assert.equal(pickPal(null, my), null);
  // rng가 1에 가까워도 목록 밖으로 나가지 않는다
  assert.ok([3, 5].includes(pickPal(mine, my, () => 0.9999999).id));
});

test('📣 단추: 가방에 있고 이번 배틀에 안 불렀으면 보인다 · HP 30 이하(빨간 막대)일 때만 눌린다 · 동료가 없으면 못 누름 · 한 번 부르면 사라짐', () => {
  assert.equal(PAL.at, 30);
  assert.equal(PAL.hp, BATTLE.hp);
  assert.deepEqual(palButton({ count: 0, myHp: 10, hasPal: true }), { show: false, ok: false, why: 'bag' });
  assert.deepEqual(palButton({ count: 2, used: true, myHp: 10, hasPal: true }), { show: false, ok: false, why: 'used' });
  assert.deepEqual(palButton({ count: 1, myHp: 31, hasPal: true }), { show: true, ok: false, why: 'hp' });
  assert.deepEqual(palButton({ count: 1, myHp: 30, hasPal: true }), { show: true, ok: true, why: '' });
  assert.deepEqual(palButton({ count: 1, myHp: 5, hasPal: false }), { show: true, ok: false, why: 'none' });
  // 「HP 30 이하」는 HP 막대가 빨개지는 선과 같다
  assert.ok(read('js/battle.js').includes("$('battle-my-hp').classList.toggle('low', ui.myHp <= 30);"));
});

test('📣 함께 공격: 그 턴 내 등급으로 동료의 확실한 기술 × 동료 레벨 — 잘 말하고 잘 풀수록 세게', () => {
  for (const tier of ['star', 'pass', 'fail', 'none']) {
    assert.equal(palDamage(tier, 1), damageForTier('safe', tier), tier);
    assert.equal(palDamage(tier, 12), Math.round(damageForTier('safe', tier) * lvMult(12)), tier);
  }
  assert.ok(palDamage('star', 3) > palDamage('pass', 3) && palDamage('pass', 3) > palDamage('fail', 3) && palDamage('fail', 3) > palDamage('none', 3));
  assert.ok(palDamage('star', 1) < damageForTier('strong', 'star'), '동료는 거드는 쪽 — 내 강한 기술보다 약하다');
});

test('📣 배틀 화면 연결: 상대 공격은 동료가 대신 · 동료가 쓰러지면 물러남(패배 없음) · 내 공격 뒤 함께 공격(말하기·문제 둘 다) · 결과에 pal', () => {
  const b = read('js/battle.js');
  // 부르기 — HP·한 번·가방에서 빼고 나서야 세운다
  assert.ok(b.includes('if (!pal || ui.myHp > PAL.at || !ui.o.usePal || !ui.o.usePal()) return;'));
  assert.ok(b.includes('ui.palUsed = true;') && b.includes('ui.palHp = PAL.hp;'));
  // 새 싸움마다 처음으로
  assert.ok(b.includes('  ui.pal = null;         // 📣 아직 아무도 안 불렀다\n  ui.palHp = 0;\n  ui.palUsed = false;\n  palBox(false);'));
  // 상대 공격은 동료가 맞는다
  assert.ok(b.includes('const pal = palOn() ? ui.pal : null;'));
  assert.ok(b.includes("    ui.palHp = Math.max(0, ui.palHp - dmg);\n    hitFx('pal', dmg, false);\n  } else {\n    ui.myHp = Math.max(0, ui.myHp - dmg);"));
  // 함께 공격 — 말하기 턴·문제 턴 둘 다, 상대가 쓰러지면 바로 이김
  assert.equal(b.split("  await palAttack(tier); if (!alive()) return; // 📣 동료가 옆에 있으면 함께 공격\n  if (ui.enemyHp <= 0) { endFight('win'); return; }").length - 1, 2);
  // 결과 — 패배·보상은 my만, pal은 기록만
  assert.ok(b.includes("pal: ui.pal ? { id: ui.pal.id, ko: ui.pal.ko } : null };"));
  // 여는 곳 — 영어·수학은 가방에서 빼고, 연습은 줄지 않는다
  const p = read('js/player.js');
  assert.ok(p.includes('    palCount, // 📣 동료 부르기 (v324)\n    usePal: () => consumeItem(CALL_PAL.id),'));
  assert.ok(p.includes('palCount, usePal: () => true, nextCue: battleCue, speak: speakSentence, practice: true,'));
  const m = read('js/math.js');
  assert.ok(m.includes('    palCount: () => inventory()[CALL_PAL.id] || 0, // 📣 동료 부르기 (v324 — 영어와 같은 것)\n    usePal: () => consumeItem(CALL_PAL.id),'));
  // 상점 · 무대
  assert.ok(read('js/shop.js').includes("[CALL_PAL], boughtId));"));
  const h = read('index.html');
  for (const id of ['battle-pal', 'battle-pal-name', 'battle-pal-fig', 'battle-pal-hp', 'battle-pal-hpt']) assert.ok(h.includes(`id="${id}"`), id);
});
