// 🌕 진짜 황금 몬스터볼 · 🌈 이로치 3회와 되돌리기 (2026-10-04) 테스트: node --test tests/truegold.test.js
//
// 진우 요청 → 아버님 "진행해줘":
//  ① 포켓몬 세계에는 황금 몬스터볼이 딱 하나 있고 무조건 잡힌다 → 🌟 황금 몬스터볼은 그대로, 🌕 진짜 황금 몬스터볼을 새로.
//     못 산다 · 잡기 화면이 열릴 때마다 0.1% · 세상에 하나뿐(가지고 있으면 안 나옴) · 쓰면 없어지고 다시 0.1%
//  ② 이로치도 원래 색으로 되돌릴 수 있게 · 이로치의 스톤은 3번 (A에 입혔다 되돌리면 1번, B·C에 입히면 스톤 끝)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  TRUE_GOLD, TRUE_GOLD_CHANCE, BALLS, ITEMS, CATCH_SHOP, SHOP_BALLS, STONE_SHOP, SHINY_STONE, SHINY_USES, SHINY_CHARGE,
  itemById, canBuy, lootBox, shinyUsesLeft,
} from '../js/items.js';
import { ballChance, rollTrueGold, trueGoldHit, spendUniqueBall, catchAttempt, inventory, buyItem, gainCoins, addItem } from '../js/xp.js';
import { cloneProfile, emptyProfile, purchaseRule, shinyRule, unshinyRule, evolveRule, mergeStatRecord } from '../js/db.js';
import { ballTip } from '../js/catch.js';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const prof = (o) => cloneProfile({ ...emptyProfile(), ...o });

test('🌕 카탈로그: 볼 줄에 나오고(던질 수 있다), 값이 없어 못 산다 — 상점·볼 상점·🎁 상자 어디에도 없다', async () => {
  assert.equal(TRUE_GOLD.id, 'truegold');
  assert.equal(itemById('truegold'), TRUE_GOLD);
  assert.ok(BALLS.includes(TRUE_GOLD), '잡기 화면 볼 줄');
  assert.ok(ITEMS.includes(TRUE_GOLD));
  assert.equal(TRUE_GOLD.price, 0);
  for (const list of [CATCH_SHOP, SHOP_BALLS, STONE_SHOP]) assert.ok(!list.includes(TRUE_GOLD), '어느 상점에도 없다');
  assert.equal(canBuy('truegold', 1e9, {}).ok, false);
  gainCoins(100000);
  assert.equal(await buyItem('truegold'), false, '코인이 아무리 많아도 못 산다');
  for (let i = 0; i < 1000; i++) assert.notEqual(lootBox(() => i / 1000), 'truegold', '🎁 레벨업 상자에서 안 나온다');
  assert.notEqual(TRUE_GOLD.emoji, itemById('goldenball').emoji, '🌟 황금 몬스터볼과 다른 그림');
  assert.ok(itemById('goldenball'), '🌟 황금 몬스터볼은 그대로');
});

test('🌕 무조건 잡힌다 — 모든 등급·레벨, 🌌 울트라비스트도 (비스트볼 없이)', () => {
  for (let r = 1; r <= 4; r++) for (let lv = 1; lv <= 60; lv++) for (const ub of [false, true]) {
    assert.equal(ballChance('truegold', r, lv, ub), 1, `등급 ${r} Lv${lv} UB ${ub}`);
  }
  assert.match(ballTip(TRUE_GOLD), /세상에 하나뿐 — 무조건 잡혀요/);
  assert.match(ballTip(TRUE_GOLD, false), /세상에 하나뿐/, '울트라비스트가 없어도 같은 말');
});

test('🌕 0.1% · 세상에 하나뿐: 가지고 있으면 굴리지 않고, 다시 0.1% · 저장이 안 되면 없던 일 (Codex 29차 #2)', async () => {
  assert.equal(TRUE_GOLD_CHANCE, 0.001);
  assert.equal(trueGoldHit({}, () => 0.001), false, '0.1% 바로 위는 안 나온다');
  assert.equal(trueGoldHit({}, () => 0.000999), true, '0.1% 안');
  let asked = 0;
  assert.equal(trueGoldHit({ truegold: 1 }, () => { asked++; return 0; }), false, '가지고 있으면 안 나온다');
  assert.equal(asked, 0, '굴리지도 않는다');
  assert.equal(trueGoldHit({ truegold: 0 }, () => 0), true, '쓰고 없어진 뒤에는 다시 나올 수 있다');
  // 이 테스트에는 IndexedDB가 없다 = 저장이 늘 실패한다 → "찾았다"도, 메모리 속 볼도 없어야 한다
  assert.equal(await rollTrueGold(() => 0), false, '저장이 안 되면 찾았다고 하지 않는다');
  assert.equal(inventory().truegold, undefined, '메모리에만 넣지 않는다 (다시 열면 사라지는 볼)');
  // 굴린 수가 많을 때 얼마나 나오나 (가지고 있지 않은 상태로 매번) — 0.1% 근처
  let hits = 0;
  let x = 12345;
  const rng = () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; };
  for (let i = 0; i < 200000; i++) if (rng() < TRUE_GOLD_CHANCE) hits++;
  assert.ok(hits > 120 && hits < 280, `20만 번에 ${hits}번 (기대 200)`);
});

test('🌕 저장 규칙: 저장된 가방에 이미 있으면 또 안 생긴다(두 창) · 백업을 합쳐도 하나, 쓴 볼이 옛 백업으로 되살아나지 않는다', () => {
  const stored = prof({ items: { truegold: 1 } });
  const gain = { items: { truegold: 1 }, once: 'truegold' };
  assert.equal(purchaseRule(stored, { coins: 0 }, gain).ok, false, '다른 창이 먼저 찾았다');
  assert.equal(stored.items.truegold, 1);
  const fresh = prof({});
  assert.equal(purchaseRule(fresh, { coins: 0 }, gain).ok, true);
  assert.equal(fresh.items.truegold, 1);
  const old = { id: 'me', items: { truegold: 1 }, updatedAt: 100 };
  const usedLater = { id: 'me', items: {}, updatedAt: 200 };
  assert.equal(mergeStatRecord('profile', usedLater, old).items.truegold, undefined, '쓴 뒤 옛 백업을 합쳐도 안 살아난다');
  assert.equal(mergeStatRecord('profile', old, usedLater).items.truegold, undefined);
  assert.equal(mergeStatRecord('profile', old, { id: 'me', items: { truegold: 1 }, updatedAt: 300 }).items.truegold, 1, '합쳐도 둘이 아니라 하나');
  const rollSrc = src('js/xp.js');
  assert.match(rollSrc, /if \(!trueGoldHit\(profile\.items, rng\)\) return false;/, '가지고 있으면 굴리기 전에 끝');
  assert.match(rollSrc, /const gain = \{ items: \{ \[TRUE_GOLD\.id\]: 1 \}, once: TRUE_GOLD\.id \};/, '저장은 once로');
  assert.match(rollSrc, /runProfileOp\(\(\) => applyPurchase\(cost, gain\), \(\) => \(\{ ok: false \}\)\);\s*return !!\(r && r\.ok\);\s*\}\s*\/\*\* 🌕 이번에 나오나/, '저장 실패의 대신 길은 "없던 일" (메모리 구매가 아니다)');
});

test('🌕 Codex 29차 #1 — 던질 때 저장소에서 먼저 쓴다: 창이 기억하는 가방으로는 못 쓰고, 다른 화면에서 썼으면 다시 고르기 · 닫히면 돌려준다', async () => {
  // 저장소 규칙: 쓰기는 저장된 가방에서 (없으면 거절), 돌려주기는 once (그 사이 새로 생겼으면 그대로 하나)
  const stored = prof({ items: { truegold: 1 } });
  assert.equal(purchaseRule(stored, { coins: 0, items: { truegold: 1 } }, {}).ok, true, '창 A가 씀');
  assert.equal(purchaseRule(stored, { coins: 0, items: { truegold: 1 } }, {}).ok, false, '창 B는 못 씀 (이미 없다)');
  assert.equal(purchaseRule(stored, { coins: 0 }, { items: { truegold: 1 }, once: 'truegold' }).ok, true, '던지기 전에 닫혀 돌려줌');
  assert.equal(purchaseRule(stored, { coins: 0 }, { items: { truegold: 1 }, once: 'truegold' }).ok, false, '돌려줘도 둘이 되지 않는다');
  // 판정: 미리 쓴 표시(paid)가 없으면 창이 기억하는 가방에 있어도 🌕로 던지지 않는다 → 몬스터볼
  addItem('truegold', 1);
  const noPaid = catchAttempt(150, () => 0.999999, { ball: 'truegold' });
  assert.equal(noPaid.ball, 'pokeball', '미리 쓰지 않은 🌕는 못 쓴다');
  assert.equal(inventory().truegold, 1, '가방에서 빼지도 않는다');
  const paid = catchAttempt(150, () => 0.999999, { ball: 'truegold', paid: 'truegold' });
  assert.deepEqual([paid.ball, paid.caught], ['truegold', true], '미리 쓴 🌕는 무조건 잡힌다');
  assert.equal(inventory().truegold, 1, '판정은 또 빼지 않는다 (이미 저장소에서 뺐다)');
  assert.equal(await spendUniqueBall('truegold'), false, '저장이 안 되면 못 쓴 것');
  assert.equal(await spendUniqueBall('greatball'), false, '하나뿐인 볼만');
  // 잡기 화면 연결
  const tb = src('js/catch.js');
  const t = tb.slice(tb.indexOf('async function throwBall('));
  assert.ok(t.indexOf('await spendBall(ballId)') > 0 && t.indexOf('await spendBall(ballId)') < t.indexOf('await sleep('), '연출 전에 쓴다 (🌕도 다른 가방 볼도 — Codex 32차 ⑨)');
  assert.match(t, /if \(picked && !picked\.free && !ui\.practice\)/, '연습·몬스터볼은 쓰지 않는다');
  assert.match(t, /다른 화면에서 이미 썼어요 — 볼을 다시 골라요/);
  assert.match(t, /if \(tg\) tg\.hidden = true; \/\/ "찾았다!" 알림이 남아 있으면 없는 볼을 가리킨다/, '못 쓰면 "찾았다" 알림도 내린다 (헤드리스가 잡음)');
  assert.match(t, /ui\.attempt\(c\.id, \{ ball: ballId, paid \}\)/);
  assert.equal((t.slice(0, t.indexOf('ui.attempt(')).match(/if \(!alive\(\)\) return giveBack\(\);/g) || []).length, 4, '판정 전에 닫히면 모두 돌려준다');
});

test('🌕 잡기 화면 연결 — 열릴 때마다 굴리고(연습 빼고), 찾으면 크게 알리되 저절로 고르지 않는다 · 쓰면 "다시 세상 어딘가로"', () => {
  const c = src('js/catch.js');
  assert.match(c, /if \(!ui\.practice\) \{\s*const run = ui\.run;\s*rollTrueGold\(o\.goldRng \|\| Math\.random\)\.then\(\(got\) => \{ if \(got\) foundTrueGold\(run\); \}\)/);
  const f = c.slice(c.indexOf('function foundTrueGold('), c.indexOf('function foundTrueGold(') + 900);
  assert.match(f, /if \(!ui\.open \|\| ui\.run !== run\) return;/, '그 사이 던졌거나 닫혔으면 손대지 않는다');
  assert.match(f, /세상에 하나뿐인/);
  assert.match(f, /refreshBalls\(ui\.ball\);/, '볼 줄에 넣되 고르던 볼 그대로 (아껴 쓰게)');
  assert.ok(!/refreshBalls\([^)]*true\)/.test(f), '"샀어요"처럼 저절로 고르지 않는다');
  assert.match(c, /if \(res\.ball === TRUE_GOLD\.id\) result\.appendChild/, '쓰고 나면 다시 세상 어딘가로');
  assert.match(c, /const tg = \$\('catch-truegold'\);\s*if \(tg\) tg\.hidden = true;/, '새 잡기 화면에서는 알림을 지운다');
  assert.match(src('index.html'), /id="catch-truegold" class="catch-truegold" hidden/);
  // 🌌 울트라비스트 안내 — 진짜 황금 볼을 가지고 있으면 "비스트볼이 있어야"만 말하지 않는다 (헤드리스가 잡음)
  assert.match(c, /const gold = \(o\.ballCounts \|\| \{\}\)\[TRUE_GOLD\.id\] > 0;/);
  assert.match(c, /: gold\s*\? '🌌 울트라비스트가 나타났다! 🌕 진짜 황금 몬스터볼이면 무조건 잡혀요/);
  // 잡기 화면을 여는 곳은 모두 openCatch를 지난다 (굴리는 자리가 하나)
  for (const f2 of ['js/player.js', 'js/math.js']) assert.ok(!/rollTrueGold/.test(src(f2)), `${f2}가 따로 굴리지 않는다`);
});

test('🌈 스톤 하나 = 3번: A에 입혔다 되돌리면 1번 · B·C에 입히면 스톤이 사라진다 · 되돌려도 횟수는 안 돌아온다', () => {
  assert.equal(SHINY_USES, 3);
  assert.equal(shinyUsesLeft({}), 0);
  assert.equal(shinyUsesLeft({ shiny_stone: 2 }), 6, '지금 가방에 있는 스톤도 하나에 3번');
  assert.equal(shinyUsesLeft({ shiny_stone: 1, [SHINY_CHARGE]: 2 }), 5);
  assert.equal(itemById(SHINY_CHARGE), null, '남은 횟수는 카탈로그 밖 — 상점·🎁 상자에 안 나온다');
  const p = prof({ caught: { 25: 1, 4: 1, 7: 1, 1: 1 }, items: { shiny_stone: 1 } });
  assert.equal(shinyRule(p, 25, 'shiny_stone', 1000).ok, true, 'A');
  assert.equal(shinyUsesLeft(p.items), 2);
  assert.equal(unshinyRule(p, 25, 2000).ok, true, 'A 되돌리기');
  assert.equal(p.mons[25].shiny, false);
  assert.equal(shinyUsesLeft(p.items), 2, '되돌려도 횟수는 그대로 (돌아오지 않는다)');
  assert.equal(shinyRule(p, 4, 'shiny_stone', 3000).ok, true, 'B');
  assert.equal(shinyRule(p, 7, 'shiny_stone', 4000).ok, true, 'C');
  assert.equal(shinyUsesLeft(p.items), 0);
  assert.equal(p.items.shiny_stone, undefined, '스톤이 사라졌다');
  assert.equal(p.items[SHINY_CHARGE], undefined);
  assert.deepEqual(shinyRule(p, 25, 'shiny_stone', 5000), { ok: false, why: 'item' }, 'A를 다시 이로치로 하려면 새 스톤');
  // 새 스톤을 사면 다시 3번
  p.items.shiny_stone = 1;
  assert.equal(shinyRule(p, 25, 'shiny_stone', 6000).ok, true);
  assert.equal(shinyUsesLeft(p.items), 2);
});

test('🌈 되돌리기 규칙: 데리고 있는 이로치만 · 원래 색(염색도 없음) · 입힐 때 염색은 빠진다', () => {
  const p = prof({ caught: { 25: 1, 4: 1 }, items: { shiny_stone: 1 }, mons: { 25: { dye: 'red', gear: 'cap' } } });
  assert.deepEqual(unshinyRule(p, 25), { ok: false, why: 'not' }, '이로치가 아니다');
  assert.deepEqual(unshinyRule(p, 99), { ok: false, why: 'caught' }, '안 잡은 포켓몬');
  shinyRule(p, 25, 'shiny_stone', 1000);
  assert.equal(p.mons[25].dye, null, '입히면 염색은 빠진다 (염색약은 이미 썼다)');
  assert.equal(p.mons[25].gear, 'cap', '장식은 그대로');
  assert.deepEqual(unshinyRule(p, 25, 2000), { ok: true });
  assert.deepEqual(p.mons[25], { dye: null, gear: 'cap', shiny: false, shinyAt: 2000 }, '되돌리면 옛 염색이 아니라 원래 색');
  // 예전 규칙으로 이로치가 된 포켓몬(그때는 염색을 지우지 않았다 — 염색 뒤에 이로치)도 되돌리면 원래 색 (변이 검사가 잡은 구멍)
  const legacy = prof({ caught: { 133: 1 }, mons: { 133: { shiny: true, dye: 'red' } } });
  assert.deepEqual(unshinyRule(legacy, 133, 3000), { ok: true });
  assert.equal(legacy.mons[133].dye, null, '옛 염색이 다시 나타나지 않는다');
  // 진화로 다 보냈으면(데리고 있지 않으면) 못 바꾼다 — 입히기와 같은 규칙
  const gone = prof({ caught: { 7: 1 }, mons: { 7: { shiny: true, evo: 1 } } });
  assert.deepEqual(unshinyRule(gone, 7), { ok: false, why: 'caught' });
});

test('🌈 백업 병합: 되돌린 이로치를 옛 백업이 되살리지 않는다 — 나중에 바꾼 쪽(shinyAt)을 따른다, 옛 기록끼리는 예전처럼', () => {
  const reverted = { id: 'me', mons: { 25: { shiny: false, shinyAt: 2000 } }, updatedAt: 300 };
  const oldShiny = { id: 'me', mons: { 25: { shiny: true } }, updatedAt: 100 };
  const stampedOld = { id: 'me', mons: { 25: { shiny: true, shinyAt: 1000 } }, updatedAt: 200 };
  assert.equal(mergeStatRecord('profile', reverted, oldShiny).mons[25].shiny, false, '때가 없는 옛 이로치가 되돌린 것을 못 이긴다');
  assert.equal(mergeStatRecord('profile', oldShiny, reverted).mons[25].shiny, false);
  assert.equal(mergeStatRecord('profile', reverted, stampedOld).mons[25].shiny, false, '먼저 켠 것보다 나중에 끈 것');
  // 최근 저장이 아닌 쪽이 나중에 켰다(다른 창) → 켠 것을 따른다
  const laterOn = { id: 'me', mons: { 25: { shiny: true, shinyAt: 5000 } }, updatedAt: 100 };
  const m = mergeStatRecord('profile', reverted, laterOn).mons[25];
  assert.deepEqual([m.shiny, m.shinyAt], [true, 5000]);
  // 옛 기록끼리(둘 다 때 없음)는 예전처럼 OR
  assert.equal(mergeStatRecord('profile', { id: 'me', mons: { 25: {} }, updatedAt: 300 }, oldShiny).mons[25].shiny, true);
});

test('🌈 진화해도 이로치가 따라간다 — 새로 켜졌으면 진화한 때 (Codex 29차 #3) · 화면 연결(남은 횟수·두 번 눌러 되돌리기·🎒 가방 횟수·도감 칸)', () => {
  const p = prof({ caught: { 7: 1 }, partner: 7, mons: { 7: { lv: 5, shiny: true, shinyAt: 1234 } } });
  evolveRule(p, 7, 8, 100, 5000);
  assert.deepEqual([p.mons[8].shiny, p.mons[8].shinyAt], [true, 5000], '진화형이 새로 이로치가 됐다 = 진화한 때');
  // Codex 재현: 어니부기를 되돌린(200) 백업 → 이로치 꼬부기(100)를 진화(300) → 그 백업을 합쳐도 이로치가 남는다
  const q = prof({ caught: { 7: 1, 8: 1 }, mons: { 7: { lv: 5, shiny: true, shinyAt: 100 }, 8: { shiny: false, shinyAt: 200 } }, updatedAt: 250 });
  const backup = cloneProfile(q);
  evolveRule(q, 7, 8, 100, 300);
  q.updatedAt = 400;
  assert.deepEqual([q.mons[8].shiny, q.mons[8].shinyAt], [true, 300]);
  assert.equal(mergeStatRecord('profile', q, backup).mons[8].shiny, true, '옛 백업이 진화로 켜진 이로치를 끄지 않는다');
  // 진화형이 이미 이로치였으면 그 때 그대로
  const r = prof({ caught: { 7: 1, 8: 1 }, mons: { 7: { lv: 5, shiny: true, shinyAt: 100 }, 8: { shiny: true, shinyAt: 50 } } });
  evolveRule(r, 7, 8, 100, 900);
  assert.equal(r.mons[8].shinyAt, 50);
  // 🎒 도감 칸을 다시 그릴 때 원래 그림도 넘긴다 — 안 넘기면 되돌려도 칸에 이로치 그림이 남았다 (Codex 29차 #4)
  assert.match(src('js/pokedex.js'), /setFigure\(fig, urlById\.get\(Number\(monId\)\), getLook\(monId\)\);/);
  // ⚙ 연습에서 던진 🌕는 그대로라고 말한다 (Codex 29차 #5)
  assert.match(src('js/catch.js'), /textContent: ui\.practice \? `연습이라 \$\{TRUE_GOLD\.emoji\} \$\{TRUE_GOLD\.ko\}은 그대로예요` : /);
  const s = src('js/shop.js');
  assert.match(s, /const n = shinyLeft\(\);/, '🌈 버튼은 남은 횟수로');
  assert.match(s, /`🌈 이로치로! \(남은 횟수 \$\{n\}번\)`/);
  assert.match(s, /unshinyArm && unshinyArm\.id === id && Date\.now\(\) - unshinyArm\.at < 5000/, '5초 안에 두 번 눌러야 뺀다 (잘못 누르면 횟수 1번이 날아간다)');
  assert.match(s, /const r = await undoShiny\(id\);/);
  assert.match(s, /if \(it\.id === SHINY_STONE\.id\) \{ const left = shinyLeft\(\);/, '상점에서도 남은 횟수');
  assert.match(src('js/xp.js'), /if \(shinyLeft\(\) < 1\) return \{ ok: false, why: 'item' \};/, '입히기 전 판정도 횟수로');
  assert.match(src('js/pokedex.js'), /const left = shinyUsesLeft\(inv\);/, '🎒 가방 줄도 횟수로');
});
