// 🏞️ 강 · 🎒 채비 가게 (v368 — 낚시 2단계 ② 원고 「이대로」 · 정할 것 다섯 추천대로) — node --test tests/river368.test.js
// 강 8종(원고 그대로) · 강 자리 셋 · 저수지의 강 물고기 넷이 강에서 몫 1 · 저수지 도감 10종이면 열림(한 번) · 📸 어름치 ·
// 채비(가방 items · 값 표 · 미끼만 같은 별 안에서 ×2 · 날씨와 곱해 최대 ×3) · 고른 물가·미끼·낚싯대(fishing.pick — 늦은 쪽) · 진짜 저장 경로 · 잇기(소스)
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  SPECIES, SPOTS, RIVER_SPOTS, PLACES, PLACE_KO, RIVER_VISITORS, VISIT_W, RIVER_NEED, spotsOf, placeOfSpot, castSpot, poolAt, rollFish,
  riverOpen, catchRule, GEAR, gearOf, TILT_MAX, baitTilt, mixTilt, hasGear, pickOf, pickRule, gearBuyRule, syncPick, lakeOf, mergeLake,
  weatherTilt, weatherLine, WEATHER, BIG_KIND, BIG_KIND_RIVER, INTRO, DEX_HINT, DEX_HINT_RIVER, PHOTO_SAY, dexRows, lakeDayLine, FISH_RIVER, dayKeyOf,
} from '../js/fishing.js';
import { LOOKS } from '../js/fishart.js';
import { WEAR, wearById, LOOK_BASE } from '../js/avatar.js';
import { shopOf, closetOf } from '../js/avatarview.js';
import { poolOf, fishMathQ, fishMathReady } from '../js/fishmath.js';
import { emptyProfile, emptyDaily, mergeStatRecord, mergeDailyDelta } from '../js/db.js';
import { initProfile, flushProfile, reloadProfile, lakeBuy, lakePick, lakeCatch, getProfileSnapshot } from '../js/xp.js';
import { keepCatch, gearState } from '../js/lakeview.js';
import { OVERLAYS } from '../js/usage.js';

const src = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const code = (f) => src(f).split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*\*)/.test(l)).join('\n');
const T = new Date(2026, 9, 30, 15, 0, 0).getTime();
// 씨앗 난수 (mulberry32 — 이웃 씨앗도 첫 값부터 고르게)
function m32(seed) { let a = (Math.imul(seed >>> 0, 0x9e3779b1) ^ 0x2545f491) >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const LAKE_KEYS = SPECIES.filter((s) => s.home === 'lake').map((s) => s.key);
const RIVER_KEYS = SPECIES.filter((s) => s.home === 'river').map((s) => s.key);
/** 저수지 도감 n종을 채운 낚시 저장값 */
const dexWith = (keys) => ({ dex: Object.fromEntries(keys.map((k) => [k, { n: 1, best: SPECIES.find((s) => s.key === k).min, d: '2026-10-29' }])), paid: {} });

test('🏞️ 강 8종 — 원고 그대로(이름·별·길이) · 저수지 16 뒤 · 고유 키 · 그림 · 📸는 어름치만 · 소개 한 줄 원고 그대로', () => {
  assert.equal(SPECIES.length, 33, 'v369 바다 9종이 뒤에 붙음');
  assert.deepEqual(SPECIES.slice(16, 24).map((s) => s.home), Array(8).fill('river'));
  assert.deepEqual(RIVER_KEYS, ['beodeulchi', 'chamgal', 'moraemuji', 'chammaja', 'kkeokji', 'dongsari', 'sancheoneo', 'eoreumchi']);
  const R = SPECIES.filter((s) => s.home === 'river');
  assert.deepEqual(R.map((s) => [s.ko, s.star, s.min, s.max]), [
    ['버들치', 1, 5, 15], ['참갈겨니', 1, 6, 15], ['모래무지', 2, 7, 17], ['참마자', 2, 10, 24],
    ['꺽지', 3, 7, 17], ['동사리', 3, 7, 19], ['산천어', 4, 15, 28], ['어름치', 5, 15, 38],
  ]);
  // 확인한 최대 길이 아래 (버들치 FishBase 17.2 · 꺽지 18.0 · 동사리 20.2 · 모래무지 150 mm SL · 참마자 200~250 mm SL)
  const CAP = { beodeulchi: 17.2, kkeokji: 18.0, dongsari: 20.2, moraemuji: 18, chammaja: 25 };
  for (const [k, c] of Object.entries(CAP)) assert.ok(SPECIES.find((s) => s.key === k).max < c, k);
  for (const s of R) {
    assert.ok(s.a > 0 && s.w > 0 && s.min < s.max, s.key);
    assert.ok(LOOKS[s.key], `${s.ko} 그림`);
    assert.ok(!s.alien, '강 물고기는 외래종 없음');
  }
  assert.deepEqual(SPECIES.filter((s) => s.photo).map((s) => s.key), ['eoreumchi']);
  assert.equal(INTRO.chamgal, '우리나라에만 사는 물고기로, 2005년에 새 종으로 이름이 붙었어요. 물살이 빠른 곳을 좋아해요.');
  // Codex 172차 사실 확인 — 모래는 아가미 덮개 밖으로 · 산천어와 송어는 같은 종(바다를 다녀오는 무리가 송어)
  assert.equal(INTRO.moraemuji, '먹이를 모래와 함께 입에 넣고, 모래는 아가미 덮개 밖으로 내보내요. 모래 속으로 쏙 파고들어 숨기도 해요.');
  assert.equal(INTRO.sancheoneo, '차고 맑은 산골짜기 냇물에 살아요. 같은 종 가운데 바다에서 자라다가 알을 낳으러 강으로 돌아오는 무리는 「송어」라고 불러요.');
  assert.equal(INTRO.eoreumchi, '우리나라에만 사는 천연기념물이에요. 여울 바닥에 자갈을 쌓아 알을 지키는 「산란탑」을 만들어요.');
  assert.equal(INTRO.chammaja, '누치와 같은 무리(누치속)예요. 맑게 흐르는 강의 모래·자갈 바닥 가까이에 살아요.');
  for (const k of RIVER_KEYS) assert.match(INTRO[k], /요\.$/, k);
  assert.equal(PHOTO_SAY, '우리나라에만 사는 천연기념물이라 놓아줘요.');
  assert.deepEqual(PLACES, ['lake', 'river', 'sea'], 'v369 바다');
  assert.deepEqual(PLACE_KO, { lake: '저수지', river: '강', sea: '바다' });
});

test('🏞️ 강 자리 셋 — 여울 8 · 바위 밑 14 · 깊은 소 20 · 열리는 수·별 몫·밑밥은 저수지와 같음 · 던지기는 그 낚시터 자리', () => {
  assert.deepEqual(RIVER_SPOTS.map((s) => [s.key, s.ko, s.m]), [['riffle', '여울', 8], ['rock', '바위 밑', 14], ['pool', '깊은 소', 20]]);
  RIVER_SPOTS.forEach((s, i) => { assert.equal(s.need, SPOTS[i].need); assert.equal(s.chum, SPOTS[i].chum); assert.deepEqual(s.w, SPOTS[i].w); });
  assert.equal(spotsOf('river'), RIVER_SPOTS);
  assert.equal(spotsOf('lake'), SPOTS);
  assert.equal(spotsOf('???'), SPOTS);
  assert.equal(castSpot(true, 0, 'river').key, 'riffle');
  assert.equal(castSpot(true, 6, 'river').key, 'rock');
  assert.equal(castSpot(true, 16, 'river').key, 'pool');
  assert.equal(castSpot(false, 99, 'river').key, 'riffle');
  assert.equal(castSpot(true, 16).key, 'deep', '낚시터를 안 주면 저수지 (옛 부름)');
  for (const s of RIVER_SPOTS) assert.equal(placeOfSpot(s), 'river');
  for (const s of SPOTS) assert.equal(placeOfSpot(s), 'lake');
  assert.equal(placeOfSpot(null), 'lake');
});

test('🎣 강에서 나오는 물고기 — 강 8종 + 저수지의 강 물고기 넷(같은 별 안에서 몫 1) · 저수지에선 강 물고기가 안 나옴 · place 칸', () => {
  assert.deepEqual(RIVER_VISITORS, ['kkeuri', 'nuchi', 'ssogari', 'gangjun']);
  assert.equal(VISIT_W, 1);
  const pa = (pl, s) => poolAt(pl, s).map(([x, w]) => `${x.key}:${w}`);
  assert.deepEqual(pa('river', 1), ['beodeulchi:3', 'chamgal:3']);
  assert.deepEqual(pa('river', 2), ['moraemuji:3', 'chammaja:2']);
  assert.deepEqual(pa('river', 3), ['kkeokji:3', 'dongsari:2', 'kkeuri:1', 'nuchi:1']);
  assert.deepEqual(pa('river', 4), ['sancheoneo:2', 'gangjun:1']);
  assert.deepEqual(pa('river', 5), ['eoreumchi:2', 'ssogari:1']);
  for (const s of [1, 2, 3, 4, 5]) assert.ok(poolAt('lake', s).every(([x]) => x.home === 'lake'), `저수지 ★${s}`);
  const okRiver = new Set([...RIVER_KEYS, ...RIVER_VISITORS]);
  const seen = {};
  for (let i = 1; i <= 6000; i++) {
    const f = rollFish(RIVER_SPOTS[2], 2, 3, m32(i));
    assert.ok(okRiver.has(f.key), f.key);
    assert.equal(f.place, 'river');
    const sp = SPECIES.find((s) => s.key === f.key);
    assert.ok(f.cm >= sp.min && f.cm <= sp.max);
    seen[f.key] = (seen[f.key] || 0) + 1;
  }
  for (const k of okRiver) assert.ok(seen[k] > 0, `${k} 한 번은`);
  for (let i = 1; i <= 3000; i++) {
    const f = rollFish(SPOTS[2], 2, 3, m32(i));
    assert.ok(LAKE_KEYS.includes(f.key), f.key);
    assert.equal(f.place, 'lake');
  }
});

test('🎒 미끼·날씨 기울임 — 옥수수(붕어·떡붕어·잉어) · 루어(사냥하는 물고기 일곱) ×2 · 곱해도 같은 별 안에서 최대 ×3 · 흐린 날 깊은 소는 강의 큰 물고기', () => {
  assert.deepEqual(baitTilt('g_corn'), { bungeo: 2, ttokbung: 2, ingeo: 2 });
  assert.deepEqual(baitTilt('g_lure'), { bass: 2, gamulchi: 2, ssogari: 2, kkeuri: 2, gangjun: 2, kkeokji: 2, dongsari: 2, nongeo: 2, jopi: 2 }, 'v369 바다에선 농어·조피볼락도');
  for (const id of ['worm', 'g_glow', 'g_rod_gold', 'a_hat_fish', 'nope', undefined]) assert.equal(baitTilt(id), null, String(id));
  assert.equal(TILT_MAX, 3);
  assert.deepEqual(mixTilt({ megi: 2 }, { megi: 2 }), { megi: 3 }, '2×2는 3에서 멈춤');
  assert.deepEqual(mixTilt({ megi: 1.5 }, { megi: 1.5 }), { megi: 2.25 }, '더하지 않고 곱함 (변이 mut368a)');
  assert.deepEqual(mixTilt({ a: 2 }, null, { b: 2 }), { a: 2, b: 2 });
  assert.equal(mixTilt(null, undefined), null);
  assert.deepEqual(BIG_KIND_RIVER, ['beodeulchi', 'chammaja', 'dongsari', 'sancheoneo', 'eoreumchi']);
  assert.deepEqual(BIG_KIND, ['bluegill', 'bungeo', 'ingeo', 'megi', 'jangeo'], '저수지 쪽은 그대로');
  assert.deepEqual(weatherTilt('cloud', 'pool'), Object.fromEntries(BIG_KIND_RIVER.map((k) => [k, 2])));
  assert.deepEqual(weatherTilt('cloud', 'deep'), Object.fromEntries(BIG_KIND.map((k) => [k, 2])));
  for (const sp of ['riffle', 'rock', 'shore', 'weed']) assert.equal(weatherTilt('cloud', sp), null, sp);
  // 실제 비율 — 흐린 날 깊은 소 + 루어: ★3 안에서 꺽지 3×2 · 동사리 2×(2×2→3) · 끄리 1×2 · 누치 1 → 동사리 6/15
  const tilt = mixTilt(weatherTilt('cloud', 'pool'), baitTilt('g_lure'));
  assert.equal(tilt.dongsari, 3);
  let n3 = 0;
  let dong = 0;
  for (let i = 1; i <= 30000; i++) {
    const f = rollFish(RIVER_SPOTS[2], 0, 0, m32(i), tilt);
    if (f.star !== 3) continue;
    n3 += 1;
    if (f.key === 'dongsari') dong += 1;
  }
  assert.ok(n3 > 3000);
  assert.ok(Math.abs(dong / n3 - 6 / 15) < 0.03, `동사리 ${(dong / n3).toFixed(3)}`);
  // 별 몫은 기울임과 상관없음
  let a5 = 0;
  let b5 = 0;
  for (let i = 1; i <= 20000; i++) { if (rollFish(RIVER_SPOTS[2], 0, 0, m32(i), tilt).star === 5) a5 += 1; if (rollFish(RIVER_SPOTS[2], 0, 0, m32(i), null).star === 5) b5 += 1; }
  assert.equal(a5, b5, '같은 씨앗이면 별은 같다');
  // 강 날씨 한 줄 — 비·흐림은 강 말 · 나머지는 그대로
  const W = Object.fromEntries(WEATHER.map((w) => [w.key, w]));
  assert.equal(weatherLine(W.rain, 'river'), '🌧️ 비 오는 날이에요. 빗방울 사이로 찌를 잘 봐요.');
  assert.equal(weatherLine(W.cloud, 'river'), '☁️ 흐린 날엔 깊은 소에서 큰 물고기가 잘 나온대요.');
  assert.equal(weatherLine(W.rain, 'lake'), W.rain.line);
  assert.equal(weatherLine(W.sun, 'river'), W.sun.line);
  assert.equal(weatherLine(null, 'river'), '');
  assert.doesNotMatch(weatherLine(W.rain, 'river'), /메기|뱀장어/, '강엔 메기·뱀장어가 안 나온다');
});

test('🔓 강 열림 — 저수지 도감 10종(9종은 아직) · 강 물고기를 낚았으면 계속 · 그 한 마리에만 opened · 📸 어름치 💰는 별 다섯 + 새 종 5', () => {
  assert.equal(RIVER_NEED, 10);
  assert.equal(riverOpen(null), false);
  assert.equal(riverOpen(dexWith(LAKE_KEYS.slice(0, 9))), false);
  assert.equal(riverOpen(dexWith(LAKE_KEYS.slice(0, 10))), true);
  assert.equal(riverOpen(dexWith(['eoreumchi'])), true, '도감은 줄지 않으니 강 물고기가 있으면 열린 것');
  const p = { coins: 0, coinsEarned: 0, fishing: dexWith(LAKE_KEYS.slice(0, 9)) };
  let r = catchRule(p, { key: 'bungeo', cm: 20 }, T);
  assert.equal(r.opened, undefined, '이미 있는 종은 안 열림');
  r = catchRule(p, { key: LAKE_KEYS[9], cm: SPECIES.find((s) => s.key === LAKE_KEYS[9]).min }, T + 1);
  assert.equal(r.opened, true, '10종째');
  r = catchRule(p, { key: LAKE_KEYS[10], cm: SPECIES.find((s) => s.key === LAKE_KEYS[10]).min }, T + 2);
  assert.equal(r.opened, undefined, '한 번만');
  const q = { coins: 0, coinsEarned: 0, fishing: dexWith(LAKE_KEYS.slice(0, 10)) };
  r = catchRule(q, { key: 'eoreumchi', cm: 30 }, T);
  assert.deepEqual(r, { ok: true, first: true, best: false, coins: 5 + 5, photo: true });
  assert.deepEqual(q.fishing.dex.eoreumchi, { n: 1, best: 30, d: dayKeyOf(T) }, '도감엔 사진으로 남음');
  r = catchRule(q, { key: 'eoreumchi', cm: 20 }, T + 1);
  assert.deepEqual(r, { ok: true, first: false, best: false, coins: 5, photo: true });
  for (const cm of [14.9, 38.1]) assert.deepEqual(catchRule(q, { key: 'eoreumchi', cm }, T), { ok: false, why: 'bad' }, `${cm}`);
});

test('🎒 채비 표 — 원고 값 그대로 · 처음부터 있는 지렁이·나무 낚싯대 · 🪱 대신 🐛 · 모자·조끼는 avatar WEAR의 lake 옷과 같은 값 · 👕 옷 가게엔 안 나옴', () => {
  assert.deepEqual(GEAR.map((g) => [g.id, g.kind, g.price]), [
    ['worm', 'bait', 0], ['g_corn', 'bait', 200], ['g_lure', 'bait', 300], ['g_krill', 'bait', 300], ['g_glow', 'float', 150],
    ['rod', 'rod', 0], ['g_rod_blue', 'rod', 150], ['g_rod_green', 'rod', 150], ['g_rod_gold', 'rod', 150],
    ['a_hat_fish', 'wear', 300], ['a_top_fishvest', 'wear', 300],
  ]);
  assert.deepEqual(GEAR.filter((g) => g.free).map((g) => g.id), ['worm', 'rod']);
  assert.equal(new Set(GEAR.map((g) => g.id)).size, GEAR.length);
  assert.doesNotMatch(GEAR.map((g) => g.emoji).join(''), /🪱|🪨|🪝/, '옛 기기 글꼴에 없는 그림 글자');
  for (const g of GEAR.filter((x) => x.kind === 'rod')) assert.match(`${g.butt}${g.tip}`, /^#[0-9a-f]{6}#[0-9a-f]{6}$/, g.id);
  for (const g of GEAR.filter((x) => x.kind === 'wear')) {
    const w = wearById(g.id);
    assert.ok(w && w.lake, g.id);
    assert.equal(w.price, g.price, `${g.id} 값`);
    assert.ok(!w.stones && !w.special && !w.free);
  }
  assert.deepEqual(WEAR.filter((w) => w.lake).map((w) => w.id).sort(), ['a_hat_fish', 'a_top_fishvest']);
  const shop = shopOf({ items: {} });
  assert.ok(![...shop.plain, ...shop.special].some((id) => wearById(id).lake), '👕 옷 가게엔 낚시 옷 없음');
  // 사면 옷장에서 입을 수 있다
  assert.ok(closetOf({ items: { a_hat_fish: 1 } }, 'hat').includes('a_hat_fish'));
  assert.ok(!closetOf({ items: {} }, 'hat').includes('a_hat_fish'));
  assert.equal(gearOf('toString'), null);
});

test('🛒 채비 사기 규칙 — 💰 모자람·이미 있음·옷·처음부터 있는 것은 안 됨 · 가방에 1 · 산 미끼·낚싯대는 바로 씀 · 야광 찌는 고른 값 그대로 · 💰 번 수는 그대로', () => {
  const p = { coins: 199, coinsEarned: 50, items: {}, fishing: { dex: {}, paid: {} } };
  assert.deepEqual(gearBuyRule(p, 'g_corn', T), { ok: false, why: 'short', shortCoins: 1 });
  for (const id of ['worm', 'rod', 'a_hat_fish', 'a_top_fishvest', 'nope', 'toString']) assert.deepEqual(gearBuyRule(p, id, T), { ok: false, why: 'unknown' }, id);
  assert.equal(p.coins, 199);
  p.coins = 1000;
  let r = gearBuyRule(p, 'g_corn', T);
  assert.equal(r.ok, true);
  assert.deepEqual([p.coins, p.items.g_corn, p.coinsEarned], [800, 1, 50]);
  assert.equal(pickOf(p).bait, 'g_corn', '산 미끼는 바로');
  assert.deepEqual(gearBuyRule(p, 'g_corn', T), { ok: false, why: 'owned' });
  r = gearBuyRule(p, 'g_rod_gold', T + 1);
  assert.equal(r.ok, true);
  assert.deepEqual([pickOf(p).rod, pickOf(p).bait], ['g_rod_gold', 'g_corn']);
  r = gearBuyRule(p, 'g_glow', T + 2);
  assert.deepEqual(r.pick, { place: 'lake', bait: 'g_corn', rod: 'g_rod_gold', glow: true });
  assert.equal(p.coins, 1000 - 200 - 150 - 150);
  assert.ok(hasGear(p, 'worm') && hasGear(p, 'rod') && hasGear(p, 'g_glow') && !hasGear(p, 'g_lure'));
  const q = { coins: 300 };
  assert.equal(gearBuyRule(q, 'g_lure', T).ok, true, 'items·fishing이 없던 프로필도');
  assert.deepEqual([q.coins, q.items.g_lure, pickOf(q).bait], [0, 1, 'g_lure']);
});

test('🗺️ 고르기 규칙 — 강은 열린 뒤에만 · 안 가진 채비·모르는 값은 안 됨 · 바꾼 시각은 늘 앞으로 · 읽을 때 가진 것·열린 곳으로 다시 고침', () => {
  const p = { coins: 0, items: { g_corn: 1 }, fishing: dexWith(LAKE_KEYS.slice(0, 9)) };
  assert.deepEqual(pickRule(p, { place: 'river' }, T), { ok: false, why: 'locked' });
  assert.deepEqual(pickRule(p, { place: 'moon' }, T), { ok: false, why: 'bad' });
  assert.deepEqual(pickRule(p, { place: 'sea' }, T), { ok: false, why: 'locked' }, 'v369 바다도 열린 뒤에만');
  assert.deepEqual(pickRule(p, { bait: 'g_lure' }, T), { ok: false, why: 'none' });
  assert.deepEqual(pickRule(p, { bait: 'g_rod_blue' }, T), { ok: false, why: 'bad' }, '낚싯대는 미끼 칸에 못 넣음');
  assert.deepEqual(pickRule(p, { rod: 'g_rod_blue' }, T), { ok: false, why: 'none' });
  assert.equal(p.fishing.pick, undefined, '안 되면 아무것도 안 적음');
  assert.equal(pickRule(p, { bait: 'g_corn' }, T).ok, true);
  assert.deepEqual(p.fishing.pick, { place: 'lake', bait: 'g_corn', rod: 'rod', at: T });
  assert.equal(pickRule(p, { bait: 'worm' }, T - 5000).ok, true);
  assert.equal(p.fishing.pick.at, T + 1, '기기 시계가 뒤로 가도 바꾼 시각은 앞으로');
  p.fishing.dex = dexWith(LAKE_KEYS.slice(0, 10)).dex;
  const r = pickRule(p, { place: 'river', bait: 'g_corn' }, T + 10);
  assert.deepEqual(r, { ok: true, pick: { place: 'river', bait: 'g_corn', rod: 'rod', glow: false } });
  // 병합으로 안 가진 채비·안 열린 강이 골라져 있어도 — 읽을 때 기본으로
  assert.deepEqual(pickOf({ items: {}, fishing: { dex: {}, pick: { place: 'river', bait: 'g_corn', rod: 'g_rod_gold', at: 9 } } }), { place: 'lake', bait: 'worm', rod: 'rod', glow: false });
  assert.deepEqual(pickOf(null), { place: 'lake', bait: 'worm', rod: 'rod', glow: false });
  assert.deepEqual(pickOf({ items: { g_glow: 1 } }).glow, true);
});

test('💾 낚시 저장값 — 고른 값(pick) 고쳐 읽기 · 없으면 칸 없음(옛 꼴 그대로) · 병합은 나중에 바꾼 쪽 · 프로필 병합도', () => {
  assert.deepEqual(lakeOf({ dex: {}, paid: {} }), { dex: {}, paid: {} }, 'pick 없는 옛 꼴');
  assert.deepEqual(lakeOf({ pick: { place: 'moon', bait: 'g_rod_gold', rod: 'g_corn', at: 'x' } }).pick, { place: 'lake', bait: 'worm', rod: 'rod', at: 0 });
  assert.deepEqual(lakeOf({ pick: { place: 'river', bait: 'g_lure', rod: 'g_rod_blue', at: 7 } }).pick, { place: 'river', bait: 'g_lure', rod: 'g_rod_blue', at: 7 });
  assert.equal(lakeOf({ pick: 'river' }).pick, undefined);
  const a = { dex: {}, pick: { place: 'river', bait: 'worm', rod: 'rod', at: 10 } };
  const b = { dex: {}, pick: { place: 'lake', bait: 'g_corn', rod: 'rod', at: 20 } };
  assert.equal(mergeLake(a, b).pick.at, 20);
  assert.equal(mergeLake(b, a).pick.at, 20);
  assert.equal(mergeLake(a, { dex: {} }).pick.place, 'river');
  assert.equal(mergeLake({ dex: {} }, b).pick.bait, 'g_corn');
  assert.equal(mergeLake({ dex: {} }, { dex: {} }).pick, undefined);
  assert.equal(mergeLake(a, { ...a, pick: { ...a.pick, place: 'lake' } }).pick.place, 'river', '같은 시각이면 앞쪽');
  const m = mergeStatRecord('profile', { ...emptyProfile(), fishing: a, updatedAt: 50 }, { ...emptyProfile(), fishing: b, updatedAt: 9 });
  assert.equal(m.fishing.pick.bait, 'g_corn', '프로필 저장 시각과 상관없이 고른 시각으로');
});

test('📖 도감 칸 33 — 강 칸은 home river · 힌트는 강 자리 이름(여울 몫과 맞음) · 📸 칸 · 남은 수 없음', () => {
  const rows = dexRows(dexWith(['eoreumchi', 'bungeo']));
  assert.equal(rows.length, 33);
  assert.deepEqual(rows.map((r) => r.home), [...Array(16).fill('lake'), ...Array(8).fill('river'), ...Array(9).fill('sea')]);
  const e = rows.find((r) => r.key === 'eoreumchi');
  assert.equal(e.caught && e.photo, true);
  const unk = rows.find((r) => r.key === 'sancheoneo');
  assert.deepEqual(unk, { key: 'sancheoneo', ko: '산천어', star: 4, alien: false, home: 'river', photo: false, caught: false, hint: DEX_HINT_RIVER[4] });
  assert.equal(rows.find((r) => r.key === 'jangeo').hint, DEX_HINT[5], '저수지 칸은 저수지 힌트');
  for (const s of [1, 2, 3, 4, 5]) {
    assert.equal(/여울/.test(DEX_HINT_RIVER[s]), RIVER_SPOTS[0].w[s] >= 5, `★${s}`);
    assert.doesNotMatch(DEX_HINT_RIVER[s], /물가|수초|깊은 곳/, '저수지 자리 이름 없음');
  }
  assert.doesNotMatch([...Object.values(DEX_HINT_RIVER), PHOTO_SAY].join('\n'), /남은|몇 종|종 남|더 낚아야/);
});

test('🐟 물고기 수학에 강 물고기도 · 📤 🎣 줄에 (🏞️ 강 N) · 하루 칸 fishRiver(빈 기록 0 · 증분 · 병합 큰 쪽)', () => {
  // 길이 끝 정수(최소 길이)끼리는 저수지 물고기도 문제가 안 나온다(소수 한 자리 꼴) — 실제로 낚을 만한 길이로
  const raw = { dex: { eoreumchi: { n: 2, best: 30.4, d: '' }, kkeokji: { n: 3, best: 15.2, d: '' } } };
  assert.deepEqual(poolOf(raw).map((x) => x.key), ['kkeokji', 'eoreumchi']);
  assert.ok(fishMathReady(raw));
  let made = 0;
  for (let s = 1; s <= 200; s++) { const q = fishMathQ(raw, s); if (q) { made += 1; assert.equal(q.choices.filter((c) => c.ok).length, 1); } }
  assert.equal(made, 200);
  assert.equal(FISH_RIVER, 'fishRiver');
  const d = { fishSec: 600, fishCatch: 3, fishRiver: 2 };
  assert.equal(lakeDayLine(d), '🎣 낚시터 10분 · 물고기 3마리(🏞️ 강 2)');
  assert.equal(lakeDayLine({ ...d, fishRiver: 0 }), '🎣 낚시터 10분 · 물고기 3마리');
  const e = emptyDaily('2026-10-30');
  assert.equal(e.fishRiver, 0);
  assert.equal(mergeDailyDelta(e, '2026-10-30', { fishRiver: 2 }).fishRiver, 2);
  assert.equal(mergeStatRecord('daily', { ...e, fishRiver: 5 }, { ...e, fishRiver: 3 }).fishRiver, 5);
});

const stored = () => fakeIdb.get('profile', 'me');
const madeAvatar = { made: true, gifted: true, look: { ...LOOK_BASE }, name: '', spot: null, at: 1 };
async function fresh(extra) {
  await initProfile();
  await flushProfile();
  const cur = stored() || emptyProfile();
  fakeIdb.put('profile', { ...cur, items: {}, fishing: { dex: {}, paid: {} }, ...extra, updatedAt: (cur.updatedAt || 0) + 1 });
  await reloadProfile();
}

test('★ 진짜 저장 경로 — 두 창이 같은 채비를 함께 사도 💰는 한 번 · 저장 실패면 그대로 · 옷은 옷장 규칙(캐릭터 먼저 · 사면 바로 입음) · 고르기 저장', async () => {
  await fresh({ coins: 500 });
  const rs = await Promise.all([lakeBuy('g_corn'), lakeBuy('g_corn')]);
  assert.deepEqual(rs.map((r) => r.ok).sort(), [false, true]);
  assert.equal(rs.find((r) => !r.ok).why, 'owned');
  assert.equal(stored().coins, 300);
  assert.equal(stored().items.g_corn, 1);
  assert.equal(stored().fishing.pick.bait, 'g_corn');
  assert.equal(gearState().owned.g_corn, true);
  assert.equal(gearState().pick.bait, 'g_corn');
  fakeIdb.failNext('profile');
  assert.deepEqual(await lakeBuy('g_glow'), { ok: false, why: 'save' });
  assert.equal(stored().coins, 300);
  assert.equal(stored().items.g_glow, undefined);
  assert.equal(getProfileSnapshot().coins, 300, '창의 💰도 그대로');
  // 옷 — 캐릭터가 없으면 'made'
  assert.equal((await lakeBuy('a_hat_fish')).why, 'made');
  assert.equal(stored().coins, 300);
  await fresh({ coins: 600, avatar: { ...madeAvatar } });
  assert.equal((await lakeBuy('a_hat_fish')).ok, true);
  assert.equal((await lakeBuy('a_top_fishvest')).ok, true);
  assert.equal(stored().coins, 0);
  assert.deepEqual([stored().items.a_hat_fish, stored().items.a_top_fishvest], [1, 1]);
  assert.deepEqual([stored().avatar.look.hat, stored().avatar.look.top], ['a_hat_fish', 'a_top_fishvest'], '사면 바로 입음');
  assert.equal(gearState().owned.a_hat_fish, true);
  assert.equal((await lakeBuy('a_hat_fish')).why, 'owned');
  // 고르기 — 강은 열린 뒤에만
  assert.equal((await lakePick({ place: 'river' })).why, 'locked');
  await fresh({ coins: 0, fishing: dexWith(LAKE_KEYS.slice(0, 10)) });
  assert.equal((await lakePick({ place: 'river' })).ok, true);
  assert.equal(stored().fishing.pick.place, 'river');
  assert.equal(gearState().pick.place, 'river');
  assert.equal(fakeIdb.failsLeft(), 0);
});

test('★ 강에서 낚아 도감에 — 그날 마리와 fishRiver 둘 다 · 10종째면 opened를 화면에 넘김 · 저수지면 fishRiver 없음', async () => {
  await fresh({ coins: 0, fishing: dexWith(LAKE_KEYS.slice(0, 9)) });
  const puts = [];
  const put = (d) => puts.push(d);
  const r1 = await keepCatch({ key: LAKE_KEYS[9], cm: SPECIES.find((s) => s.key === LAKE_KEYS[9]).min, place: 'lake' }, put);
  assert.equal(r1.opened, true);
  const r2 = await keepCatch({ key: 'kkeokji', cm: 12, place: 'river' }, put);
  assert.deepEqual(r2, { ok: true, first: true, best: false, coins: 3 + 5 });
  assert.deepEqual(puts, [{ fishCatch: 1 }, { fishCatch: 1, fishRiver: 1 }]);
  assert.equal((await lakeCatch({ key: 'eoreumchi', cm: 25 })).photo, true);
});

test('🔌 잇기 — 🗺️ 물가·🎒 채비·🐛 미끼 칩 · 가게 보는 동안 시간 멈춤 · 던지기는 그 낚시터 자리 · 풍경·물살·낚싯대 색·야광 찌 · 📸 · 겹침 목록 · 하루 칸 · 서비스워커 · 판', () => {
  const fv = src('js/fishview.js');
  for (const c of ['lk-topbtn lk-mapbtn', 'lk-topbtn lk-gearbtn', 'lk-bait', 'lk-places']) assert.match(fv, new RegExp(`class="${c}"`), c);
  assert.match(fv, /shopRoot\.id = 'lk-gear';/);
  assert.match(fv, /if \(!ui\.dexOpen && !ui\.shopOpen\) ui\.used \+= activeStep\(/);
  assert.match(fv, /if \(!ui \|\| root\.hidden \|\| ui\.dexOpen \|\| ui\.shopOpen\) return;/, '가게 동안 Space·숫자 키 안 먹음');
  assert.match(fv, /function lakeShop\(\) \{\n\s*if \(!canMenu\(\) \|\| typeof ui\.host\.gear !== 'function'\) return;[\s\S]{0,80}ui\.paused = true;\n\s*ui\.shopOpen = true;/);
  assert.match(fv, /return !!ui && ui\.st === 'ready' && !ui\.busy && !ui\.paused;/, '던지기 전에만');
  assert.match(fv, /ui\.spot = castSpot\(ok !== false, ui\.okToday, ui\.place\);/);
  assert.match(fv, /drawWaterFx\(ctx, now, ui\.reduce, ui\.lite, v\.x0, v\.x1, ui\.wx, ui\.place\);/);
  assert.match(fv, /drawRod\(ctx, HAND\.x, HAND\.y, target\.x, target\.y, st === 'fight' \? ten \/ 100 : 0\.05, rodColor\(\)\);/);
  assert.match(fv, /drawFloat\(ctx, f\.x, Math\.max\(f\.sink \|\| 0, tw\), now, ui\.reduce, glowNow\(\)\);/);
  assert.match(fv, /if \(sp\.photo\) card\.appendChild\(el\('div', 'lk-res-photo', '📸 사진만 찍고 놓아줘요'\)\);/);
  assert.match(fv, /if \(info\.opened\) \{\n\s*ui\.riverOpen = true;/);
  assert.match(fv, /if \(!canMenu\(\) \|\| pl === ui\.place \|\| !PLACES\.includes\(pl\) \|\| !placeOk\(pl\)\) return;/);
  assert.match(fv, /return pl === 'lake' \|\| \(pl === 'river' && ui\.riverOpen\) \|\| \(pl === 'sea' && ui\.seaOpen\);/);
  assert.match(fv, /export function closeLake\(quiet\) \{\n\s*if \(!ui\) return;\n\s*closeDexView\(\);\n\s*closeShop\(\);/);
  assert.match(fv, /closeDexView\(\);[^\n]*\n\s*closeShop\(\);\n\s*if \(ui\) closeLake\(true\);/, '낚시터를 열 때 가게도 닫음');
  const lv = src('js/lakeview.js');
  for (const k of ['place: pk.place,', 'riverOpen: riverOpen(lakeRaw()),', 'pick: pk,', 'gear: () => gearState(),', 'buyGear: (id) => lakeBuy(id),', 'onPick: (want) => lakePick(want),', 'lookNow: () => avatarOf(getProfileSnapshot()).look,']) assert.ok(lv.includes(k), k);
  assert.match(lv, /put\(\{ fishCatch: 1, \.\.\.\(f\.place === 'river' \? \{ \[FISH_RIVER\]: 1 \} : \{\}\), \.\.\.\(f\.place === 'sea' \? \{ \[FISH_SEA\]: 1 \} : \{\}\) \}\);/);
  const xp = src('js/xp.js');
  assert.match(xp, /if \(g && g\.kind === 'wear'\) return houseDo\(\(p\) => wearBuyRule\(p, id, Date\.now\(\)\)\);\n\s*return houseDo\(\(p\) => lakeGearRule\(p, id, Date\.now\(\)\)\);/);
  assert.match(xp, /return houseDo\(\(p\) => lakePickRule\(p, want, Date\.now\(\)\)\);/);
  assert.match(src('js/fishart.js'), /if \(place === 'river'\) \{ riverFx\(ctx, t, lite, x0, x1, wx\); return; \}/);
  assert.match(src('js/db.js'), /^\s*'fishRiver',$/m);
  for (const f of ['js/hatch.js', 'js/parcel.js', 'js/korbattleview.js']) assert.match(src(f), /'jr-trip', 'lk-lake', 'lk-dex', 'lk-gear'\]/, `${f} 겹침 목록`);
  assert.ok(OVERLAYS.some((o) => o.place === 'lake' && o.ids.includes('lk-gear')), '🕒 가게도 낚시터 자리');
  assert.doesNotMatch(src('index.html'), /id="lk-gear"/);
  const css = src('css/style.css');
  for (const c of ['.lk-topbtn', '.lk-bait', '.lk-places', '.lk-place', '.lk-res-photo', '.lk-res-open', '.lk-dex-lock', '.lk-shop-grid', '.lk-shop-btn']) assert.ok(css.includes(`${c} {`), c);
  assert.match(src('js/stats.js'), /`\$\{PLACE_KO\[pl\]\} 도감 \$\{got\.length\}\/\$\{all\.length\}`/);
  // 서비스워커·앱 판 글자는 다음 판 시험이 본다 (v369 → sea369)
  // 아이 화면 — 남은 수·종 셈 문구 없음 · 강이 열리기 전엔 숫자 없이
  for (const f of ['js/fishview.js', 'js/lakeview.js']) assert.doesNotMatch(code(f).split('\n').filter((l) => !/lakeTodayLine|오늘 — 낚시/.test(l)).join('\n'), /남은 (시간|분|종)|몇 종|종 남|\$\{RIVER_NEED\}종/, f);
  assert.match(fv, /'🔒 물고기를 더 만나면 길이 열려요'/);
});

test('🔁 화면의 고른 값 맞추기 (Codex 172차) — 던지기 전에만 가게에서 늦게 온 바꿈을 얹음 · 던지는 중엔 그대로(바꿈은 남김) · 안 가진 채비는 기본으로 · 야광 찌는 가진 대로 · 다른 창에서 열린 강', () => {
  const own = (ids) => Object.fromEntries(GEAR.map((g) => [g.id, !!g.free || ids.includes(g.id)]));
  const pk = { bait: 'worm', rod: 'rod', glow: false };
  // 던지는 중 — 산 옥수수·야광 찌는 다음 ready까지 (지금 던진 한 마리의 기울임이 바뀌지 않게)
  let r = syncPick(pk, own(['g_corn', 'g_glow']), { bait: 'g_corn' }, false);
  assert.deepEqual(r, { pick: { bait: 'worm', rod: 'rod', glow: false }, pend: { bait: 'g_corn' } });
  // 다시 ready — 얹고 비움
  r = syncPick(r.pick, own(['g_corn', 'g_glow']), r.pend, true);
  assert.deepEqual(r, { pick: { bait: 'g_corn', rod: 'rod', glow: true }, pend: {} });
  // 낚싯대만 늦게 와도 · 미끼는 그대로
  assert.deepEqual(syncPick({ bait: 'g_corn', rod: 'rod', glow: false }, own(['g_corn', 'g_rod_green']), { rod: 'g_rod_green' }, true).pick, { bait: 'g_corn', rod: 'g_rod_green', glow: false });
  // 안 가진 채비는 기본으로 · 바꿈이 안 가진 것이면 지금 값 그대로
  assert.deepEqual(syncPick({ bait: 'g_lure', rod: 'g_rod_gold', glow: true }, own([]), {}, true).pick, { bait: 'worm', rod: 'rod', glow: false });
  assert.deepEqual(syncPick({ bait: 'g_corn', rod: 'g_rod_blue', glow: false }, own(['g_corn', 'g_rod_blue']), { bait: 'g_lure', rod: 'g_rod_gold' }, true).pick, { bait: 'g_corn', rod: 'g_rod_blue', glow: false });
  // 종류가 틀린 값 · 모르는 값 · 빈 입력
  assert.deepEqual(syncPick({ bait: 'g_rod_blue', rod: 'g_corn' }, own(['g_corn', 'g_rod_blue']), { bait: 'nope' }, true).pick, { bait: 'worm', rod: 'rod', glow: false });
  assert.deepEqual(syncPick(null, null, null, true), { pick: { bait: 'worm', rod: 'rod', glow: false }, pend: {} });
  // 받은 값을 바꾸지 않음
  const pend = { bait: 'g_corn' };
  syncPick(pk, own(['g_corn']), pend, true);
  syncPick(pk, own(['g_corn']), pend, false);
  assert.deepEqual(pk, { bait: 'worm', rod: 'rod', glow: false });
  assert.deepEqual(pend, { bait: 'g_corn' });
  // 다른 창에서 강이 열려도 — gearState.river (9종은 아직 · 10종이면)
  const p = emptyProfile();
  p.fishing = dexWith(LAKE_KEYS.slice(0, 9));
  assert.equal(gearState(p).river, false);
  p.fishing = dexWith(LAKE_KEYS.slice(0, 10));
  assert.equal(gearState(p).river, true);
  p.fishing = dexWith(['beodeulchi']);
  assert.equal(gearState(p).river, true, '강 물고기를 낚았으면 계속');
});

test('🔌 가게 결과가 늦게 와도 (Codex 172차) — 누른 때의 낚시터·가게를 기억 · 다른 낚시터면 아무것도 · 닫았다 연 가게엔 알림 없이 · 고른 값은 pendPick → syncGear(🗺️ 열 때·던지기 직전·다시 ready·가게 그리기)', () => {
  const fv = src('js/fishview.js');
  const body = (name) => { const i = fv.indexOf(`function ${name}(`); assert.ok(i >= 0, name); return fv.slice(i, fv.indexOf('\n}\n', i)); };
  const shop = body('renderShop');
  // 「쓰기」·「사기」 둘 다 누른 때를 기억하고, 다른 낚시터면 고른 값을 건드리기 전에 끝
  assert.equal((shop.match(/const me = ui;\n\s*const gen = shopGen;/g) || []).length, 2);
  assert.match(shop, /if \(ui !== me\) return;[^\n]*\n\s*const ok = !!r && r\.ok !== false;\n\s*if \(ok\) ui\.pendPick\[kind\] = g\.id;\n\s*shopAfter\(me, gen, /);
  assert.match(shop, /if \(ui !== me\) return;[^\n]*\n\s*if \(r && r\.ok\) \{\n\s*if \(gen === shopGen\) \{ try \{ sfx\.success\(\);/);
  assert.match(shop, /if \(g\.kind === 'bait' \|\| g\.kind === 'rod'\) ui\.pendPick\[g\.kind\] = g\.id;/);
  assert.doesNotMatch(shop, /ui\.pick\[/, '가게 결과는 고른 값을 바로 안 바꿈');
  assert.equal((shop.match(/shopAfter\(me, gen, /g) || []).length, 3);
  assert.match(shop, /const st = syncGear\(\) \|\| \{\};/);
  assert.match(body('shopAfter'), /if \(ui !== me\) return false;\n\s*if \(shopRoot && !shopRoot\.hidden\) renderShop\(gen === shopGen \? msg : ''\);\n\s*else syncGear\(\);/);
  // 가게를 열고 닫을 때마다 번호
  assert.match(body('lakeShop'), /const me = ui;\n\s*shopGen \+= 1;/);
  assert.match(fv, /export function closeShop\(\) \{\n\s*if \(!shopRoot \|\| shopRoot\.hidden\) return;\n\s*shopRoot\.hidden = true;\n\s*shopGen \+= 1;/);
  // syncGear — 던지기 전(ready·한가함)일 때만 얹음 · 열린 강은 닫히지 않음
  const sg = body('syncGear');
  assert.match(sg, /const st = gearNow\(ui\.host\);\n\s*ui\.owned = ownedOf\(ui\.host, st\);\n\s*if \(st && st\.river\) ui\.riverOpen = true;/);
  assert.match(sg, /const r = syncPick\(ui\.pick, ui\.owned, ui\.pendPick, ui\.st === 'ready' && !ui\.busy\);\n\s*ui\.pick = r\.pick;\n\s*ui\.pendPick = r\.pend;/);
  // 부르는 자리
  assert.match(body('togglePlaces'), /if \(!canMenu\(\) \|\| typeof ui\.host\.onPick !== 'function'\) return;\n\s*syncGear\(\);/);
  assert.match(body('startCast'), /hidePlaces\(\);\n\s*syncGear\(\);[^\n]*\n\s*ui\.busy = true;/);
  assert.match(body('resetFish'), /setBtn\('🎣 던지기'\);\n\s*syncGear\(\);/);
  assert.match(fv, /pendPick: \{\},/);
  assert.ok(fv.includes("made: '🧑 집에서 캐릭터를 먼저 만들어요'"));
  assert.match(src('js/lakeview.js'), /river: riverOpen\(p && p\.fishing\),/);
});
