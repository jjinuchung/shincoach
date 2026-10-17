// 💰 v252 (2026-10-13 아버님) — 🎯 도전 문제 코인을 난이도별로 · 📦 구호품에 코인 · 🏠 책상
//  · 처음 맞힌 문제 하나: 보통(칸 1개) 10 · 칸 2개 이상 15 · '도전'·'서술형' 20 · 문제에 coin(10~20)을 적으면 그 값 — ⚡는 10 그대로
//  · 아빠 구호품(coach/gifts.json)이 💰를 보낼 수 있다(1~PARCEL_COIN_MAX) — 가방이 아니라 코인에 더한다
//  · 책상 — 이모지가 없어 그린 그림(art), 알림 글에는 ✏️
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { REWARD, ITEM_COIN, HARD_BADGES, itemCoin, itemOf, applyChalAnswer, applyChalRound, chalReward } from '../js/mathchal.js';
import { parcelOf, PARCEL_COIN, PARCEL_COIN_MAX, PARCEL_MAX } from '../js/items.js';
import { onlyCoins, afterLine, parcelLabel, COIN_ITEM } from '../js/parcel.js';
import { emptyMath, emptyProfile, parcelRule } from '../js/db.js';
import { FURN, furnById, houseCost } from '../js/house.js';

const read = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const DATA = JSON.parse(read('coach/math/challenge.json'));
const one = (o = {}) => ({ no: 1, parts: [{ input: 'num', answer: 1 }], ...o });
const SET = { id: 'S', items: [one({ no: 1 }), one({ no: 2, parts: [{}, {}] }), one({ no: 3, badge: '서술형' }), one({ no: 4, badge: '도전', parts: [{}, {}] }), one({ no: 5, coin: 18 })] };

test('💰 itemCoin: 보통 10 · 칸 2개 이상 15 · 도전·서술형 20 · coin을 적으면 그 값(10~20 정수만) · ⚡는 10 그대로', () => {
  assert.deepEqual(ITEM_COIN, { base: 10, multi: 15, hard: 20 });
  assert.deepEqual(HARD_BADGES, ['도전', '서술형']);
  assert.deepEqual(REWARD.item, { xp: 10, coin: 10 });
  assert.deepEqual(SET.items.map(itemCoin), [10, 15, 20, 20, 18]);
  assert.equal(itemCoin(one({ badge: '중요' })), 10, "'중요'는 어려움이 아니라 칸 수로");
  assert.equal(itemCoin(one({ badge: '중요', parts: [{}, {}] })), 15);
  for (const bad of [9, 21, 12.5, '20', null]) assert.equal(itemCoin(one({ coin: bad })), 10, `coin ${bad}은 무시`);
  assert.equal(itemCoin(one({ coin: 20, badge: '도전' })), 20);
  assert.equal(itemCoin(one({ coin: 10, badge: '도전' })), 10, '적어 둔 coin이 배지보다 먼저');
  assert.equal(itemCoin(null), 10);
  assert.equal(itemOf(SET, 3).badge, '서술형');
  assert.equal(itemOf(SET, '2'), SET.items[1]);
  assert.equal(itemOf(SET, 9), null);
});

test('💰 문제집 자료: 모든 문제가 10~20 · 규칙 그대로(배지·칸 수를 다시 읽어서) · coin을 적었으면 10~20 정수', () => {
  let n = 0;
  for (const s of DATA.sets) {
    for (const it of s.items) {
      const want = it.coin !== undefined ? it.coin : ['도전', '서술형'].includes(it.badge) ? 20 : it.parts.length >= 2 ? 15 : 10;
      if (it.coin !== undefined) assert.ok(Number.isInteger(it.coin) && it.coin >= 10 && it.coin <= 20, `${s.id}-${it.no} coin`);
      assert.equal(itemCoin(it), want, `${s.id}-${it.no}`);
      n += 1;
    }
  }
  assert.ok(n >= 50, `문제 ${n}개`);
});

test('💰 applyChalAnswer.coin: 처음 맞혔을 때만 그 문제의 💰 · 틀림·다시 맞힘은 0 · 틀렸던 문제도 처음 맞히면 다', () => {
  const m = emptyMath();
  assert.equal(applyChalAnswer(m, 'S', 3, false, SET).coin, 0);
  assert.equal(applyChalAnswer(m, 'S', 3, true, SET).coin, 20, '틀렸다가 처음 맞힘');
  assert.equal(applyChalAnswer(m, 'S', 3, true, SET).coin, 0, '다시 맞혀도 없음');
  assert.equal(applyChalAnswer(m, 'S', 2, true, SET).coin, 15);
  assert.equal(applyChalAnswer(m, 'S', 5, true, SET).coin, 18);
});

test('💰 applyChalRound: 저장 못 한 답 중 처음 맞힌 문제들의 💰 합 · 이미 적힌 답은 안 셈 → chalReward가 그 합을 쓴다 · coin을 안 주면 보통 값 × 문제 수(옛 부름)', () => {
  const m = emptyMath();
  const r = applyChalRound(m, 'S', [{ no: 1, ok: true }, { no: 4, ok: true }, { no: 2, ok: false }, { no: 5, ok: true, saved: true }], SET);
  assert.deepEqual([r.fresh, r.coin], [2, 30]);
  const rw = chalReward({ fresh: r.fresh, coin: r.coin, clean: 0, n: 4, setN: 5 });
  assert.deepEqual([rw.xp, rw.coin], [2 * REWARD.item.xp, 30]);
  assert.deepEqual([chalReward({ fresh: 3 }).coin, chalReward({ fresh: 1, coin: 20 }).coin, chalReward({ fresh: 0, coin: 0 }).coin], [30, 20, 0]);
  // ✨ 회차 보너스·🏅 완주 보너스는 그대로 더해진다
  const all = chalReward({ fresh: 5, coin: 83, clean: 5, n: 5, firstClear: false });
  assert.equal(all.coin, 83 + REWARD.round.coin);
});

test('💰 화면 연결: 답마다(saveChalAnswer)·회차 끝(finishChal) 둘 다 coin: result.coin', () => {
  const a = read('js/math.js');
  assert.ok(a.includes('chalReward({ fresh: result.fresh ? 1 : 0, coin: result.coin, clean: 0, n: CHAL_N,'));
  assert.ok(a.includes('chalReward({ fresh: result.fresh, coin: result.coin, clean: result.clean, n,'));
  assert.ok(read('js/mathchal.js').includes('coin: fresh ? itemCoin(itemOf(set, no)) : 0,'));
});

test('📦 구호품 💰: 1~PARCEL_COIN_MAX 정수만 · 다른 물건과 함께도 · 틀리면 통째로 안 받음 · 받으면 가방이 아니라 코인에 · 한 번만', () => {
  assert.equal(PARCEL_COIN, COIN_ITEM, '영상 몫 칸과 같은 이름');
  assert.ok(PARCEL_COIN_MAX > PARCEL_MAX);
  assert.deepEqual(parcelOf({ id: 'c1', items: { coin: 335 } }).items, { coin: 335 });
  assert.deepEqual(parcelOf({ id: 'c2', items: { coin: PARCEL_COIN_MAX, potion: 1 } }).items, { coin: PARCEL_COIN_MAX, potion: 1 });
  for (const bad of [0, -5, PARCEL_COIN_MAX + 1, 1.5, '300']) assert.equal(parcelOf({ id: 'c3', items: { coin: bad } }), null, `💰 ${bad}`);
  const p = emptyProfile();
  p.coins = 100;
  const r = parcelRule(p, { id: 'c1', items: { coin: 335 } }, 1);
  assert.deepEqual([r.ok, p.coins, p.items.coin], [true, 435, undefined]);
  assert.equal(parcelRule(p, { id: 'c1', items: { coin: 335 } }, 2).why, 'done');
  assert.equal(p.coins, 435);
  parcelRule(p, { id: 'c2', items: { coin: 5, potion: 2 } }, 3);
  assert.deepEqual([p.coins, p.items.potion], [440, 2]);
});

test('📦 💰만 온 구호품: 받은 뒤 "💰 코인을 받았어요!" · 가방 말 대신 코인 말 · 칸 그림은 💰 +n', () => {
  assert.equal(onlyCoins({ coin: 5 }), true);
  assert.equal(onlyCoins({ coin: 5, potion: 1 }), false);
  assert.equal(onlyCoins({ potion: 1 }), false);
  assert.equal(onlyCoins(null), false);
  assert.match(afterLine({ coin: 5 }, 0), /^💰 코인은 바로 들어왔어요/);
  assert.equal(afterLine({ potion: 1 }, 0), '🎒 가방에서 볼 수 있어요');
  assert.deepEqual(parcelLabel('coin', 335), { emoji: '💰', name: '코인', count: '+335' });
});

test('🏠 책상: 바닥 2칸 · 💰800 코인만 · 가구 무리 · 그린 그림(art) + 알림 글은 ✏️ · 침대가 첫 2칸 가구 그대로', () => {
  const d = furnById('f_desk');
  assert.deepEqual([d.ko, d.w, d.at, d.price, d.group, d.art, d.emoji], ['책상', 2, 'floor', 800, 'furn', 'desk', '✏️']);
  assert.deepEqual(houseCost('f_desk'), { coins: 800, items: {} });
  assert.equal(FURN.find((f) => f.at === 'floor' && f.w === 2).id, 'f_bed');
  const v = read('js/houseview.js');
  for (const s of ["e.appendChild(artEl(d, 'span', 'house-emoji'));", "b.appendChild(artEl(d, 'span', 'house-drawer-emoji'));", "else b.appendChild(artEl(it, 'span', 'house-shop-emoji'));", "g.appendChild(artEl(f, 'span', `house-ghost-art${it && it.f ? ' is-flip' : ''}`));"]) assert.ok(v.includes(s), s);
  // 뒤집어 놓은 가구를 끌 때도 뒤집힌 그림 — 놓인 가구(u)의 f를 안쪽 그림에 (바깥은 onMove가 transform을 쓴다, Codex 64차)
  assert.ok(v.includes("const it = d.kind === 'move' ? ((room() || {}).items || []).find((x) => x.u === d.u) : null;"));
  assert.ok(/\.house-ghost-art\.is-flip \{ transform: scaleX\(-1\); \}/.test(read('css/style.css')));
  assert.ok(!/el\('span', 'house-(emoji|drawer-emoji|shop-emoji)', (d|it)\.emoji\)/.test(v), '이모지 글자로만 그리는 곳이 남지 않게');
  // 그림 자료는 ③ 가구 더하기(v285)부터 js/furnart.js(FURN_ART) — houseview는 그것을 import해 그린다
  const fa = read('js/furnart.js');
  assert.ok(v.includes("import { FURN_ART } from './furnart.js';"));
  for (const f of FURN.filter((x) => x.art)) assert.ok(fa.includes(`  ${f.art}: {`), `${f.id} 그림이 FURN_ART에`);
  assert.ok(read('css/style.css').includes('.house-art {'));
});
