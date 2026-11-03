// 🚤 배 낚시 (v386 — 진우 제안 「배를 타고 나가면 더 다양한 물고기」 → 기본안 「추천대로」 · 원고·시안 「이대로」) — node --test tests/boat386.test.js
// 새 11종(원고 그대로 · 별마다 🐙 문어 무리 + 물고기) · 포인트 셋(모래 바닥·물속 바위·깊은 바다) · 바다 도감 6종이면 열림(한 번 · boatOpened) ·
// 🦑 에기(문어 무리 · 배가 열린 뒤에만 팖) · 루어는 갈치·넙치·방어·부시리에도 · 배 날씨 줄 · 🌬️ 바람 부는 날 배가 쉼 · 문어 무리 글(무게 먼저 · 다리까지/몸통 · 먹물 · 바위) ·
// 🐟 물고기 수학 길이 문제엔 물고기만 · 하루 칸 fishBoat · 진짜 저장 경로 · 두 창 · 잇기(소스)
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  SPECIES, SPOTS, BOAT_SPOTS, PLACES, PLACE_KO, PLACE_EMOJI, BOAT_NEED, spotsOf, placeOfSpot, castSpot, poolAt, rollFish, starOdds,
  seaOpen, boatOpen, placeOpen, catchRule, mergeLake, GEAR, baitTilt, mixTilt, weatherTilt, pickOf, pickRule, gearBuyRule, lakeOf, badgesOf,
  weatherLine, WEATHER, BIG_KIND_BOAT, INTRO, DEX_HINT_BOAT, dexRows, lakeDayLine, FISH_BOAT, BOAT_OPENED, BOAT_GO, BOAT_SAFE, BOAT_REST, boatRest,
  softOf, lenLabel, sizeText, kindEmoji, SOFT_NOTE, STICK_HEAD, STICK_OFF, inkLine, weightOf, speciesOf, TILT_MAX,
} from '../js/fishing.js';
import { LOOKS } from '../js/fishart.js';
import { poolOf, makeFishQ, fishMathQ, fishMathReady, FM_KIND_LIST } from '../js/fishmath.js';
import { emptyProfile, emptyDaily, mergeDailyDelta } from '../js/db.js';
import { initProfile, flushProfile, reloadProfile, lakeBuy, lakePick, lakeCatch } from '../js/xp.js';
import { keepCatch, gearState } from '../js/lakeview.js';

const src = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const T = new Date(2026, 10, 3, 15, 0, 0).getTime();
// 씨앗 난수 (mulberry32 — 이웃 씨앗도 첫 값부터 고르게)
function m32(seed) { let a = (Math.imul(seed >>> 0, 0x9e3779b1) ^ 0x2545f491) >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const LAKE_KEYS = SPECIES.filter((s) => s.home === 'lake').map((s) => s.key);
const RIVER_KEYS = SPECIES.filter((s) => s.home === 'river').map((s) => s.key);
const SEA_KEYS = SPECIES.filter((s) => s.home === 'sea').map((s) => s.key);
const BOAT_KEYS = SPECIES.filter((s) => s.home === 'boat').map((s) => s.key);
const OCTO = ['jukkumi', 'chammuneo', 'daemuneo'];
const SQUID = ['gabojing', 'changkkol'];
const minOf = (k) => SPECIES.find((s) => s.key === k).min;
const dexWith = (keys) => ({ dex: Object.fromEntries(keys.map((k) => [k, { n: 1, best: minOf(k), d: '2026-11-02' }])), paid: {} });
/** 바다까지 열린 도감(저수지 10 · 강 6) + 바다 n종 */
const upToSea = (n) => [...LAKE_KEYS.slice(0, 10), ...RIVER_KEYS.slice(0, 6), ...SEA_KEYS.slice(0, n)];

test('🚤 배 11종 — 원고 그대로(이름·별·길이·문어 무리) · 바다 뒤 · 그림 · 별마다 🐙 하나 + 물고기 · 확인한 최대 길이 아래 · 외래종·📸 없음 · 소개 한 줄 원고 그대로', () => {
  assert.equal(SPECIES.length, 44);
  assert.deepEqual(SPECIES.slice(33).map((s) => s.home), Array(11).fill('boat'));
  assert.deepEqual(SPECIES.filter((s) => s.home === 'boat').map((s) => [s.key, s.ko, s.star, s.min, s.max, s.soft || '']), [
    ['jukkumi', '주꾸미', 1, 8, 20, 'octo'], ['maljwi', '말쥐치', 1, 12, 33, ''],
    ['gabojing', '갑오징어', 2, 8, 18, 'squid'], ['munchi', '문치가자미', 2, 15, 40, ''],
    ['changkkol', '창꼴뚜기', 3, 12, 40, 'squid'], ['galchi', '갈치', 3, 50, 130, ''], ['neopchi', '넙치', 3, 25, 90, ''],
    ['chammuneo', '참문어', 4, 40, 104, 'octo'], ['bangeo', '방어', 4, 40, 110, ''], // 참문어 104 — Codex 189차(O. sinensis 최대 약 3 kg)
    ['daemuneo', '대문어', 5, 80, 300, 'octo'], ['busiri', '부시리', 5, 50, 150, ''],
  ]);
  assert.equal(new Set(SPECIES.map((s) => s.key)).size, 44, '키가 겹치지 않음');
  // 확인한 최대 길이 아래 (SeaLifeBase·FishBase — 주꾸미 20 · 말쥐치 37.4 · 갑오징어 몸통 18 · 문치가자미 45 SL · 창꼴뚜기 몸통 50 · 갈치 213 · 넙치 103 · 참문어 무리 180 · 방어 150 · 대문어 300 · 부시리 250)
  const MAX = { jukkumi: 20, maljwi: 37.4, gabojing: 18, munchi: 45, changkkol: 50, galchi: 213, neopchi: 103, chammuneo: 180, bangeo: 150, daemuneo: 300, busiri: 250 };
  assert.ok(weightOf(speciesOf('chammuneo'), speciesOf('chammuneo').max) <= 3000, '참문어 끝 무게가 우리나라 참문어 최대 약 3 kg 아래 (Codex 189차)');
  for (const s of SPECIES.filter((x) => x.home === 'boat')) {
    assert.ok(s.max <= MAX[s.key], `${s.ko} 최대 ${MAX[s.key]} 아래`);
    assert.ok(s.min > 0 && s.min < s.max, s.ko);
    assert.ok(LOOKS[s.key], `${s.ko} 그림`);
    assert.ok(!s.alien && !s.photo, `${s.ko} 외래종·📸 아님`);
    assert.match(INTRO[s.key], /요\.$/, s.ko);
  }
  // 별마다 문어 무리 하나 + 물고기(★3은 물고기 둘) — 에기·루어가 같은 별 안에서 갈리게
  for (const st of [1, 2, 3, 4, 5]) {
    const g = SPECIES.filter((x) => x.home === 'boat' && x.star === st);
    assert.equal(g.filter((x) => x.soft).length, 1, `★${st} 문어 무리 하나`);
    assert.equal(g.filter((x) => !x.soft).length, st === 3 ? 2 : 1, `★${st} 물고기`);
  }
  // 무게 어림 (원고 예시 그대로)
  const W = (k, cm) => weightOf(speciesOf(k), cm);
  assert.equal(W('jukkumi', 15), 42);
  assert.equal(W('gabojing', 15), 338);
  assert.equal(W('changkkol', 30), 324);
  assert.equal(W('galchi', 100), 660);
  assert.equal(W('neopchi', 60), 1836);
  assert.equal(W('chammuneo', 74), 1054);
  assert.equal(W('bangeo', 80), 6144);
  assert.equal(W('busiri', 120), 15552);
  assert.equal(W('daemuneo', 200), 14400);
  assert.ok(W('gabojing', 18) <= 600, '갑오징어 끝 무게가 SeaLifeBase 600 g 아래');
  assert.ok(W('jukkumi', 20) <= 100, '주꾸미 끝 무게가 SeaLifeBase 100 g 아래');
  // 소개 한 줄 — 원고 그대로 (원문 대조로 고친 두 줄 포함)
  assert.equal(INTRO.jukkumi, '다리가 시작되는 곳 양쪽에 금빛 고리 무늬가 있어요. 빈 소라 껍데기 속에 들어가 살며 알을 낳아요.');
  assert.equal(INTRO.maljwi, '쥐포를 만드는 물고기예요. 눈 위에 단단한 가시가 하나 우뚝 서 있어요.');
  assert.equal(INTRO.gabojing, '몸속에 배처럼 생긴 단단한 껍데기(갑)가 있어요. 그 모양이 갑옷 같다고 해서 붙은 이름이에요.', 'Codex 189차 — 갑은 몸속 껍데기');
  assert.doesNotMatch(INTRO.gabojing, /뼈/);
  assert.equal(INTRO.munchi, '두 눈이 몸 오른쪽에 있어요. 시장에서는 흔히 「도다리」라고 부르지만, 진짜 도다리는 따로 있는 물고기예요.');
  assert.equal(INTRO.changkkol, '흔히 「한치」라고 불러요. 다리가 한 치(약 3 cm)밖에 안 될 만큼 짧다고 해서 붙은 이름이라고 전해져요.');
  assert.equal(INTRO.galchi, '꼬리지느러미와 배지느러미가 없고, 몸이 칼처럼 길어요. 몸을 덮은 은빛 가루는 예전에 가짜 진주를 만드는 데 썼어요.');
  assert.equal(INTRO.neopchi, '흔히 「광어」라고 불러요. 두 눈이 몸 왼쪽에 있어서, 눈이 오른쪽에 있는 문치가자미와 「좌광우도」로 가려요.', 'Codex 189차 — 가자미 무리 전체로 넓히지 않음');
  assert.equal(INTRO.chammuneo, '심장이 셋이고 피는 파란색이에요. 서해와 남해에 살고, 「돌문어」라고도 불러요.');
  assert.equal(INTRO.bangeo, '떼를 지어 넓은 바다를 오가요. 어린 방어는 바다에 떠다니는 해초 밑에 모여 살아요.');
  assert.equal(INTRO.daemuneo, '세계에서 가장 큰 문어예요. 우리나라에서는 차가운 동해에 살고, 3 m 가까이 자라요.');
  assert.equal(INTRO.busiri, '방어와 아주 닮았어요. 방어는 가슴지느러미와 배지느러미 끝이 거의 나란하고, 부시리는 배지느러미 끝이 더 뒤쪽에 있어요.');
  assert.doesNotMatch(INTRO.daemuneo, /붉/, '「붉은빛」은 원문에 없어 뺐다');
  // 그림 꼴 — 문어 셋 octo · 오징어 무리 cuttle/squid · 가자미 무리는 눈 둘(넙치는 왼쪽 · 문치가자미는 늘 오른쪽) · 갈치는 띠
  for (const k of OCTO) assert.equal(LOOKS[k].form, 'octo', k);
  assert.equal(LOOKS.gabojing.form, 'cuttle');
  assert.equal(LOOKS.changkkol.form, 'squid');
  assert.ok(LOOKS.neopchi.flat && LOOKS.neopchi.eye2 && !LOOKS.neopchi.faceR, '넙치 — 머리 왼쪽');
  assert.ok(LOOKS.munchi.flat && LOOKS.munchi.eye2 && LOOKS.munchi.faceR, '문치가자미 — 늘 머리 오른쪽(좌광우도)');
  assert.equal(LOOKS.galchi.tail, 'ribbon');
  assert.ok(LOOKS.busiri.pec < 1 && !LOOKS.bangeo.pec, '부시리는 가슴지느러미가 짧다(원고)');
});

test('⚓ 배 포인트 셋 — 모래 바닥 8 · 물속 바위 14 · 깊은 바다 20 · 열리는 수·별 몫·밑밥은 저수지와 같음 · 던지기는 배 포인트 · 배엔 배 것만 · 길이는 범위 안', () => {
  assert.deepEqual(BOAT_SPOTS.map((s) => [s.key, s.ko, s.m, s.need, s.chum]), [['sandbed', '모래 바닥', 8, 0, 1], ['reef', '물속 바위', 14, 6, 2], ['abyss', '깊은 바다', 20, 16, 2]]);
  BOAT_SPOTS.forEach((s, i) => assert.deepEqual(s.w, SPOTS[i].w, s.ko));
  assert.equal(spotsOf('boat'), BOAT_SPOTS);
  assert.equal(spotsOf('nope'), SPOTS, '모르는 물가는 저수지');
  for (const s of BOAT_SPOTS) assert.equal(placeOfSpot(s), 'boat');
  assert.equal(placeOfSpot({ key: 'zzz' }), 'lake');
  assert.equal(castSpot(true, 0, 'boat').key, 'sandbed');
  assert.equal(castSpot(true, 6, 'boat').key, 'reef');
  assert.equal(castSpot(true, 16, 'boat').key, 'abyss');
  assert.equal(castSpot(false, 99, 'boat').key, 'sandbed');
  assert.deepEqual(starOdds(BOAT_SPOTS[2], 2), starOdds(SPOTS[2], 2), '별 몫은 깊은 곳과 같다');
  for (const st of [1, 2, 3, 4, 5]) for (const [x] of poolAt('boat', st)) assert.equal(x.home, 'boat');
  for (const [x] of poolAt('sea', 4)) assert.notEqual(x.home, 'boat', '바다엔 배 물고기 없음');
  const seen = new Set();
  for (let seed = 1; seed <= 4000; seed++) {
    const r = m32(seed);
    const f = rollFish(BOAT_SPOTS[seed % 3], seed % 3, seed % 11, r, null);
    const sp = speciesOf(f.key);
    assert.equal(f.place, 'boat');
    assert.equal(sp.home, 'boat', f.key);
    assert.ok(f.cm >= sp.min && f.cm <= sp.max, `${f.key} ${f.cm}`);
    assert.deepEqual(f.badges, [], '배엔 🏅 없음');
    seen.add(f.key);
  }
  assert.equal(seen.size, 11, '4천 번이면 11종 모두 나옴');
  assert.deepEqual(badgesOf('neopchi', 89), []);
});

test('🔓 배 열림 — 바다 도감 6종(5종은 아직 · 저수지·강 종은 안 셈) · 배 것을 낚았으면 계속 · 그 한 마리에만 boatOpened(바다 seaOpened와 따로) · 고른 물가 boat', () => {
  assert.equal(BOAT_NEED, 6);
  assert.equal(boatOpen(dexWith(upToSea(5))), false);
  assert.equal(boatOpen(dexWith([...LAKE_KEYS, ...RIVER_KEYS])), false, '저수지·강은 안 셈');
  assert.equal(boatOpen(dexWith(upToSea(6))), true);
  assert.equal(boatOpen(dexWith(['jukkumi'])), true, '배 것을 한 번이라도 낚았으면 계속');
  assert.equal(placeOpen(dexWith(upToSea(6)), 'boat'), true);
  assert.equal(placeOpen(dexWith(upToSea(5)), 'boat'), false);
  const p = { coins: 0, fishing: dexWith(upToSea(5)) };
  const r = catchRule(p, { key: SEA_KEYS[5], cm: minOf(SEA_KEYS[5]) }, T);
  assert.equal(r.boatOpened, true);
  assert.equal(r.seaOpened, undefined, '바다는 이미 열려 있었다');
  const r2 = catchRule(p, { key: SEA_KEYS[6], cm: minOf(SEA_KEYS[6]) }, T);
  assert.equal(r2.boatOpened, undefined, '두 번째부턴 없음');
  const r3 = catchRule(p, { key: 'daemuneo', cm: 150 }, T);
  assert.equal(r3.ok, true);
  assert.equal(r3.boatOpened, undefined);
  assert.deepEqual(catchRule(p, { key: 'daemuneo', cm: 301 }, T), { ok: false, why: 'bad' }, '길이 끝 밖');
  // 고른 물가
  const q = { coins: 0, items: {}, fishing: dexWith(upToSea(5)) };
  assert.deepEqual(pickRule(q, { place: 'boat' }, T), { ok: false, why: 'locked' });
  q.fishing = dexWith(upToSea(6));
  assert.equal(pickRule(q, { place: 'boat' }, T).ok, true);
  assert.equal(pickOf(q).place, 'boat');
  assert.deepEqual(lakeOf({ pick: { place: 'boat', bait: 'g_egi', rod: 'rod', at: 3 } }).pick, { place: 'boat', bait: 'g_egi', rod: 'rod', at: 3 });
  assert.equal(pickOf({ fishing: { ...dexWith(upToSea(2)), pick: { place: 'boat', bait: 'worm', rod: 'rod', at: 1 } } }).place, 'lake', '병합으로 줄어든 옛 기기 — 배가 안 열렸으면 저수지');
  assert.deepEqual(PLACES, ['lake', 'river', 'sea', 'boat']);
  assert.equal(PLACE_KO.boat, '배 낚시');
  assert.equal(PLACE_EMOJI.boat, '🚤');
});

test('🦑 에기·루어 — 에기는 문어 무리 다섯 · 루어는 갈치·넙치·방어·부시리도 · 에기는 배가 열린 뒤에만 팖 · 같은 별 안에서 갈림 · 흐린 날 깊은 바다는 별마다 가장 큰 것 · 곱해도 최대 ×3', () => {
  assert.deepEqual(baitTilt('g_egi'), { jukkumi: 2, gabojing: 2, changkkol: 2, chammuneo: 2, daemuneo: 2 });
  const lure = baitTilt('g_lure');
  for (const k of ['galchi', 'neopchi', 'bangeo', 'busiri']) assert.equal(lure[k], 2, k);
  for (const k of [...OCTO, ...SQUID, 'maljwi', 'munchi']) assert.equal(lure[k], undefined, k);
  const egi = GEAR.find((g) => g.id === 'g_egi');
  assert.deepEqual([egi.kind, egi.ko, egi.emoji, egi.price, egi.boat], ['bait', '에기(가짜 새우 미끼)', '🦑', 300, true]);
  assert.deepEqual(gearBuyRule({ coins: 999, items: {}, fishing: dexWith(upToSea(5)) }, 'g_egi', T), { ok: false, why: 'locked' });
  const p = { coins: 999, items: {}, fishing: dexWith(upToSea(6)) };
  assert.equal(gearBuyRule(p, 'g_egi', T).ok, true);
  assert.equal(p.coins, 699);
  assert.equal(p.items.g_egi, 1);
  assert.equal(pickOf(p).bait, 'g_egi', '산 미끼는 바로');
  // 같은 별 안에서 — ★4 참문어·방어는 반반 → 에기면 참문어 쪽 · 루어면 방어 쪽
  const share = (tilt, key, st) => { const pool = poolAt('boat', st).map(([x, w]) => [x.key, w * ((tilt && tilt[x.key]) || 1)]); const sum = pool.reduce((a, [, w]) => a + w, 0); return pool.find(([k]) => k === key)[1] / sum; };
  assert.equal(share(null, 'chammuneo', 4), 0.5);
  assert.ok(Math.abs(share(baitTilt('g_egi'), 'chammuneo', 4) - 2 / 3) < 1e-9);
  assert.ok(Math.abs(share(baitTilt('g_lure'), 'bangeo', 4) - 2 / 3) < 1e-9);
  // 흐린 날 깊은 바다 — 별마다 길이 끝이 가장 긴 것(★4는 방어 110 > 참문어 104)
  assert.deepEqual(BIG_KIND_BOAT, ['maljwi', 'munchi', 'galchi', 'bangeo', 'daemuneo']);
  assert.deepEqual(weatherTilt('cloud', 'abyss'), { maljwi: 2, munchi: 2, galchi: 2, bangeo: 2, daemuneo: 2 });
  assert.equal(weatherTilt('cloud', 'reef'), null);
  assert.equal(weatherTilt('sun', 'abyss'), null);
  assert.deepEqual(mixTilt(weatherTilt('cloud', 'abyss'), baitTilt('g_lure')).bangeo, TILT_MAX, '2×2는 3에서 멈춤');
  assert.deepEqual(mixTilt(weatherTilt('cloud', 'abyss'), baitTilt('g_egi')).daemuneo, TILT_MAX);
});

test('🌦️ 배 날씨 줄 · 🌬️ 배가 쉬는 날 — 흐림은 깊은 바다 · 비는 배 위 · 바람은 쉼 · 맑음은 저수지와 같음 · 글 원고 그대로', () => {
  const w = (k) => WEATHER.find((x) => x.key === k);
  assert.equal(weatherLine(w('sun'), 'boat'), '☀️ 맑은 날이에요. 해 질 녘엔 노을이 져요.');
  assert.equal(weatherLine(w('cloud'), 'boat'), '☁️ 흐린 날엔 깊은 바다에서 큰 녀석들이 잘 나온대요.');
  assert.equal(weatherLine(w('rain'), 'boat'), '🌧️ 비 오는 날이에요. 배 위는 미끄러우니 앉아서 낚아요.');
  assert.equal(weatherLine(w('wind'), 'boat'), BOAT_REST);
  assert.equal(weatherLine(w('cloud'), 'sea'), '☁️ 흐린 날엔 먼 바다에서 큰 물고기가 잘 나온대요.', '바다 줄 그대로');
  assert.equal(BOAT_REST, '🌬️ 파도가 높아 오늘은 배가 쉬어요. 진짜 낚싯배도 바람이 세면 뜨지 않아요.');
  assert.equal(BOAT_OPENED, '🚤 배 낚시가 열렸어요! 🗺️ 물가에서 가 봐요');
  assert.equal(BOAT_GO, '⚓ 출항! 배를 타고 먼 바다로 나가요');
  assert.equal(BOAT_SAFE, '🦺 배에서는 늘 구명조끼를 입어요.');
  assert.deepEqual(['sun', 'cloud', 'rain', 'wind'].map(boatRest), [false, false, false, true]);
  assert.equal(boatRest(undefined), false);
});

test('🐙 문어 무리 글 — 다리까지/몸통 · 결과 카드는 무게 먼저(물고기는 그대로) · 먹물 조사 · 바위 · 도감 「물고기가 아니에요」 · 힌트는 포인트 이름(숫자 없음)', () => {
  for (const k of OCTO) { assert.equal(softOf(k), 'octo'); assert.equal(lenLabel(k), '다리까지'); assert.equal(kindEmoji(k), '🐙'); }
  for (const k of SQUID) { assert.equal(softOf(k), 'squid'); assert.equal(lenLabel(k), '몸통'); assert.equal(kindEmoji(k), '🦑'); }
  for (const k of ['maljwi', 'bungeo', 'chamdom', 'nope']) { assert.equal(softOf(k), ''); assert.equal(lenLabel(k), ''); }
  assert.equal(sizeText('chammuneo', 74, 1054), '1.05kg · 다리까지 74.0cm');
  assert.equal(sizeText('gabojing', 15, 338), '338g · 몸통 15.0cm');
  assert.equal(sizeText('neopchi', 60, 1836), '60.0cm · 1.84kg', '물고기는 옛 꼴 그대로(길이 먼저)');
  assert.equal(sizeText('bungeo', 31.2, 441), '31.2cm · 441g');
  assert.equal(inkLine('gabojing'), '💨 먹물 찍! 갑오징어가 조금 멀어졌어요');
  assert.equal(inkLine('chammuneo'), '💨 먹물 찍! 참문어가 조금 멀어졌어요');
  assert.equal(inkLine('changkkol'), '💨 먹물 찍! 창꼴뚜기가 조금 멀어졌어요');
  assert.equal(STICK_HEAD, '🐙 바위에 딱 붙었어요! 맞히면 떼어 내요');
  assert.equal(STICK_OFF, '🐙 떼어 냈어요! 꾹 감아요');
  assert.equal(SOFT_NOTE, '🐙 물고기가 아니에요 — 조개·달팽이와 같은 연체동물 무리예요.');
  assert.deepEqual(DEX_HINT_BOAT, { 1: '모래 바닥에서 자주 보여요.', 2: '모래 바닥과 물속 바위에서 보여요.', 3: '물속 바위나 깊은 바다에서 만나요.', 4: '깊은 바다에 살아요.', 5: '깊은 바다에서 아주 가끔 나와요.' });
  const rows = dexRows(dexWith(['chammuneo', 'neopchi', 'bungeo']));
  assert.equal(rows.length, 44);
  assert.deepEqual(rows.find((r) => r.key === 'chammuneo'), { key: 'chammuneo', ko: '참문어', star: 4, alien: false, home: 'boat', photo: false, soft: 'octo', caught: true, n: 1, best: 40, d: '2026-11-02', intro: INTRO.chammuneo });
  assert.deepEqual(rows.find((r) => r.key === 'busiri'), { key: 'busiri', ko: '부시리', star: 5, alien: false, home: 'boat', photo: false, soft: '', caught: false, hint: DEX_HINT_BOAT[5] });
  assert.equal(rows.find((r) => r.key === 'gabojing').soft, 'squid');
  for (const r of rows.filter((x) => !x.caught)) assert.doesNotMatch(r.hint, /\d/, '힌트에 숫자 없음');
});

test('🐟 물고기 수학 — 문어 무리는 길이 문제(비교·차·합)에 안 나옴 · 무게 합·막대그래프엔 나옴 · 막대그래프에 문어 무리가 있으면 「물고기」라고 부르지 않음 · 물고기가 하나뿐이면 길이 문제 없음', () => {
  const raw = { dex: {
    chammuneo: { n: 4, best: 88.3, d: '' }, daemuneo: { n: 2, best: 150.4, d: '' }, gabojing: { n: 6, best: 15.7, d: '' }, jukkumi: { n: 8, best: 17.2, d: '' },
    neopchi: { n: 3, best: 61.7, d: '' }, bangeo: { n: 1, best: 80, d: '' }, galchi: { n: 5, best: 101.5, d: '' }, maljwi: { n: 7, best: 24.6, d: '' },
  } };
  const pool = poolOf(raw);
  assert.deepEqual(pool.filter((x) => x.soft).map((x) => x.key).sort(), ['chammuneo', 'daemuneo', 'gabojing', 'jukkumi']);
  assert.equal(pool.find((x) => x.key === 'neopchi').soft, undefined);
  const softKo = new Set(pool.filter((x) => x.soft).map((x) => x.ko));
  let softBar = 0;
  let softW = 0;
  for (let seed = 1; seed <= 3000; seed++) {
    for (const kind of ['cmp', 'sub', 'add']) {
      const q = makeFishQ(kind, pool, seed);
      assert.ok(q, `${kind} ${seed} — 물고기 넷이면 만든다`);
      for (const f of q.facts) assert.ok(![...softKo].some((ko) => f.startsWith(`${ko} `)), `${kind} ${seed} 길이 문제에 문어 무리: ${f}`);
      assert.ok(![...softKo].some((ko) => q.text.includes(ko)), `${kind} ${seed} ${q.text}`);
    }
    const b = makeFishQ('bar', pool, seed);
    if (b && b.chart.bars.some((x) => softKo.has(x.ko))) {
      softBar += 1;
      assert.doesNotMatch(b.text, /물고기/, `막대 ${seed} ${b.text}`);
      for (const h of Object.values(b.hints)) assert.doesNotMatch(h, /물고기/, `막대 힌트 ${seed} ${h}`);
    }
    const w = makeFishQ('wadd', pool, seed);
    if (w && w.facts.some((f) => [...softKo].some((ko) => f.startsWith(`${ko} `)))) softW += 1;
  }
  assert.ok(softBar > 100, `막대그래프엔 문어 무리도 나옴 (${softBar})`);
  assert.ok(softW > 100, `무게 합엔 문어 무리도 나옴 (${softW})`);
  // 물고기만 있는 막대그래프는 옛 글 그대로
  const fishOnly = poolOf({ dex: { bungeo: { n: 3, best: 31.2 }, ingeo: { n: 5, best: 60.4 }, megi: { n: 1, best: 70.2 } } });
  let old = 0;
  for (let seed = 1; seed <= 400; seed++) { const b = makeFishQ('bar', fishOnly, seed); if (b && /가장 많이 낚은 물고기는/.test(b.text)) old += 1; }
  assert.ok(old > 0, '물고기만이면 「가장 많이 낚은 물고기는」');
  // 물고기 하나 + 문어 무리 — 길이 문제는 못 만들고 다른 꼴로
  const one = poolOf({ dex: { neopchi: { n: 2, best: 61.7 }, chammuneo: { n: 1, best: 88.3 }, daemuneo: { n: 3, best: 150.4 } } });
  for (let seed = 1; seed <= 300; seed++) for (const kind of ['cmp', 'sub', 'add']) assert.equal(makeFishQ(kind, one, seed), null, `${kind} ${seed}`);
  for (let seed = 1; seed <= 300; seed++) {
    const q = fishMathQ({ dex: { neopchi: { n: 2, best: 61.7 }, chammuneo: { n: 1, best: 88.3 }, daemuneo: { n: 3, best: 150.4 } } }, seed, '', 1);
    if (q) assert.ok(!['cmp', 'sub', 'add'].includes(q.kind), `${seed} ${q.kind}`);
  }
  assert.deepEqual(FM_KIND_LIST, ['cmp', 'sub', 'add', 'wadd', 'unit', 'bar']);
  // Codex 189차 — 「낼 수 있음」은 실제로 문제가 만들어질 때만 (작은 문어 무리 둘뿐이면 아님)
  const tiny = { dex: { jukkumi: { n: 1, best: 15 }, gabojing: { n: 1, best: 15 } } };
  assert.equal(fishMathReady(tiny), false);
  for (let seed = 1; seed <= 50; seed++) assert.equal(fishMathQ(tiny, seed, '', 1), null);
  assert.equal(fishMathReady(raw), true);
  assert.equal(fishMathReady({ dex: { neopchi: { n: 2, best: 61.7 }, chammuneo: { n: 1, best: 88.3 }, daemuneo: { n: 3, best: 150.4 } } }), true, '물고기 하나 + 무거운 문어 둘 — 무게 문제는 됨');
  assert.equal(fishMathReady({ dex: { bungeo: { n: 1, best: 30.2 }, ingeo: { n: 1, best: 60 } } }), true, '옛 물고기 둘 그대로');
});

test('🛟 모르는 종 칸 맡아 두기 (Codex 189차) — 뒤 판에서 더한 종을 옛 판이 지우지 않음 · 도감·열림·💰에는 안 씀 · 병합은 큰 쪽 · 알게 되면 dex로', () => {
  const raw = { dex: { bungeo: { n: 2, best: 31.2, d: '2026-11-01' }, futurefish: { n: 3, best: 55.5, d: '2026-12-01' } }, paid: { '2026-12-01': 7 } };
  const lk = lakeOf(raw);
  assert.deepEqual(lk.dex, { bungeo: { n: 2, best: 31.2, d: '2026-11-01' } }, 'dex에는 아는 종만');
  assert.deepEqual(lk.more, { futurefish: { n: 3, best: 55.5, d: '2026-12-01' } }, '모르는 종은 more에');
  assert.deepEqual(lakeOf(lk).more, lk.more, '다시 읽어도 그대로(멱등)');
  assert.deepEqual(lakeOf({ dex: { ok_kind: { n: 1, best: 9 }, Bad: { n: 1 }, __proto__x: { n: 1 }, toolong_kind_name_over_24c: { n: 1 }, zero: { n: 0 }, constructor: { n: 2, best: 3 } } }).more, { constructor: { n: 2, best: 3, d: '' }, ok_kind: { n: 1, best: 9, d: '' } }, '꼴 맞는 이름만 · 잡은 수 0은 버림 · 객체 이름도 안전');
  // 도감 칸·열림·💰는 모르는 종을 모른다
  assert.equal(dexRows(raw).length, 44);
  assert.equal(boatOpen({ dex: dexWith(upToSea(5)).dex, more: { a1: { n: 1, best: 1 }, a2: { n: 1, best: 1 }, a3: { n: 1, best: 1 } } }), false);
  const p = { coins: 0, fishing: { ...dexWith(upToSea(5)), more: { future_sea: { n: 9, best: 40 } } } };
  const r = catchRule(p, { key: SEA_KEYS[5], cm: minOf(SEA_KEYS[5]) }, T);
  assert.equal(r.boatOpened, true, '모르는 종이 열림을 앞당기지 않음');
  assert.deepEqual(p.fishing.more, { future_sea: { n: 9, best: 40, d: '' } }, '한 마리 낚아도 맡아 둔 칸 그대로');
  assert.equal(pickRule(p, { place: 'boat' }, T).ok, true);
  assert.deepEqual(p.fishing.more, { future_sea: { n: 9, best: 40, d: '' } }, '물가를 골라도 그대로');
  assert.deepEqual(catchRule(p, { key: 'futurefish', cm: 10 }, T), { ok: false, why: 'bad' }, '모르는 종은 낚을 수 없음');
  // 병합 — 종마다 큰 쪽 · 이른 날 · 한쪽에만 있어도
  const m = mergeLake({ dex: {}, more: { futurefish: { n: 1, best: 60, d: '2026-12-03' } } }, raw);
  assert.deepEqual(m.more, { futurefish: { n: 3, best: 60, d: '2026-12-01' } });
  assert.deepEqual(mergeLake(raw, { dex: {} }).more, lk.more);
  assert.equal(mergeLake({ dex: {} }, { dex: {} }).more, undefined, '없으면 칸도 없음');
  // 뒤 판이 알게 되면 dex로 — 옛 판이 more에 맡겨 둔 아는 종(여기선 bungeo로 흉내)
  assert.deepEqual(lakeOf({ dex: { bungeo: { n: 1, best: 20, d: '2026-11-05' } }, more: { bungeo: { n: 4, best: 33, d: '2026-11-02' } } }).dex.bungeo, { n: 4, best: 33, d: '2026-11-02' });
  // 끝 수
  const many = Object.fromEntries(Array.from({ length: 80 }, (_, i) => [`k${String(i).padStart(2, '0')}`, { n: 1, best: 1 }]));
  assert.equal(Object.keys(lakeOf({ dex: many }).more).length, 64);
});

test('📤 하루 칸 fishBoat · 줄 「(… · 🚤 배)」 · 병합은 큰 쪽', () => {
  assert.equal(FISH_BOAT, 'fishBoat');
  assert.equal(emptyDaily('2026-11-03').fishBoat, 0);
  const d = mergeDailyDelta(mergeDailyDelta(emptyDaily('2026-11-03'), '2026-11-03', { fishCatch: 3, fishBoat: 2 }), '2026-11-03', { fishBoat: 1 });
  assert.equal(d.fishBoat, 3);
  assert.equal(lakeDayLine({ fishSec: 300, fishCatch: 4, fishBoat: 3 }), '🎣 낚시터 5분 · 물고기 4마리(🚤 배 3)');
  assert.equal(lakeDayLine({ fishSec: 300, fishCatch: 6, fishRiver: 1, fishSea: 2, fishBoat: 3 }), '🎣 낚시터 5분 · 물고기 6마리(🏞️ 강 1 · 🌊 바다 2 · 🚤 배 3)');
  assert.equal(lakeDayLine({ fishSec: 300, fishCatch: 4, fishSea: 3 }), '🎣 낚시터 5분 · 물고기 4마리(🌊 바다 3)', 'v369 줄 그대로');
});

const stored = () => fakeIdb.get('profile', 'me');
async function fresh(extra) {
  await initProfile();
  await flushProfile();
  const cur = stored() || emptyProfile();
  fakeIdb.put('profile', { ...cur, items: {}, fishing: { dex: {}, paid: {} }, ...extra, updatedAt: (cur.updatedAt || 0) + 1 });
  await reloadProfile();
}

test('★ 진짜 저장 경로 — 바다 6종째를 낚으면 boatOpened를 화면에 넘김 · 배에서 낚으면 fishCatch와 fishBoat · 에기는 열린 뒤에만 사짐(💰 그대로) · 배 고르기 저장 · gearState.boat', async () => {
  await fresh({ coins: 500, fishing: dexWith(upToSea(5)) });
  assert.equal(gearState().boat, false);
  assert.deepEqual(await lakeBuy('g_egi'), { ok: false, why: 'locked' });
  assert.equal(stored().coins, 500);
  assert.equal(stored().items.g_egi, undefined);
  assert.equal((await lakePick({ place: 'boat' })).why, 'locked');
  const puts = [];
  const put = (x) => puts.push(x);
  const r1 = await keepCatch({ key: SEA_KEYS[5], cm: minOf(SEA_KEYS[5]), place: 'sea' }, put);
  assert.equal(r1.boatOpened, true);
  assert.equal(r1.seaOpened, undefined);
  assert.equal(gearState().boat, true);
  const r2 = await keepCatch({ key: 'chammuneo', cm: 74, place: 'boat' }, put);
  assert.deepEqual(r2, { ok: true, first: true, best: false, coins: 4 + 5 });
  assert.deepEqual(puts, [{ fishCatch: 1, fishSea: 1 }, { fishCatch: 1, fishBoat: 1 }]);
  assert.equal((await lakeBuy('g_egi')).ok, true);
  assert.equal(stored().items.g_egi, 1);
  assert.equal(stored().fishing.pick.bait, 'g_egi');
  assert.equal((await lakePick({ place: 'boat' })).ok, true);
  assert.equal(stored().fishing.pick.place, 'boat');
  assert.equal(gearState().pick.place, 'boat');
  assert.equal(fakeIdb.failsLeft(), 0);
});

test('★ 두 창이 함께 — 바다 6종째를 동시에 낚아도 「배 낚시가 열렸어요」·새 종은 한 결과에만 · 에기를 동시에 두 번 사도 💰 300 한 번', async () => {
  await fresh({ coins: 1000, fishing: dexWith(upToSea(5)) });
  const k = SEA_KEYS[5];
  const rs = await Promise.all([lakeCatch({ key: k, cm: minOf(k) }), lakeCatch({ key: k, cm: minOf(k) })]);
  assert.deepEqual(rs.map((r) => r.ok), [true, true]);
  assert.equal(rs.filter((r) => r.boatOpened).length, 1, '배 열림은 한 결과에만');
  assert.equal(rs.filter((r) => r.first).length, 1);
  const earned = rs[0].coins + rs[1].coins;
  const bs = await Promise.all([lakeBuy('g_egi'), lakeBuy('g_egi')]);
  assert.deepEqual(bs.map((r) => r.ok).sort(), [false, true]);
  assert.equal(bs.find((r) => !r.ok).why, 'owned');
  assert.equal(stored().coins, 1000 + earned - 300);
  assert.equal(fakeIdb.failsLeft(), 0);
});

test('🔌 잇기 — 🗺️ 배 줄은 바다가 열린 뒤 · 바람 날 잠금 · ⚓ 출항(배로 갈 때마다 · 누르면 넘김 · 움직임 줄이기면 한 줄) · 🐙 바위·💨 먹물 · 결과 카드 · 도감 · 에기 가게 · 하루 칸 · 📊·📤 · 판', () => {
  const fv = src('js/fishview.js');
  const body = (name) => { const i = fv.indexOf(`function ${name}(`); assert.ok(i >= 0, name); return fv.slice(i, fv.indexOf('\n}\n', i)); };
  assert.match(fv, /const SAIL_MS = 2000;/);
  assert.match(body('switchPlace'), /if \(pl === 'boat'\) startSail\(\);\n\s*else toast\(/);
  assert.match(fv, /if \(place === 'boat'\) startSail\(\);[^\n]*\n\s*else if \(rested\)/, '배로 들어오면 출항부터 (v387 — 들어서기 안내를 enter()로 묶음)');
  assert.match(fv, /else if \(rested\) toast\(BOAT_REST, 3600\);/, '바람 날은 바다에서 + 쉼 한 줄');
  assert.match(fv, /const rested = h\.place === 'boat' && boatOk && boatRest\(wx0\);/, '마지막 물가가 배여도 바람 날이면 쉼(변이 mut386a)');
  assert.match(fv, /const wx0 = \(h\.weather && h\.weather\.key\) \|\| 'sun';/);
  const ss = body('startSail');
  assert.match(ss, /toast\(`\$\{BOAT_GO\} \$\{BOAT_SAFE\}`, 3200\);/);
  assert.match(ss, /if \(ui\.reduce\) return;\n\s*ui\.sail = \{ at: performance\.now\(\) \};\n\s*ui\.paused = true;/, '움직임 줄이기면 그림 없이 · 그동안 멈춤');
  assert.match(body('endSail'), /ui\.sail = null;\n\s*ui\.paused = false;/);
  // Codex 189차 — 늦게 뜨는 알림은 그 물가·그 출항일 때만
  assert.match(ss, /const sid = \(ui\.sailN = \(ui\.sailN \|\| 0\) \+ 1\);/);
  assert.match(ss, /if \(ui === me && ui\.sailN === sid && ui\.place === 'boat' && ui\.st === 'ready' && !ui\.sail/);
  assert.match(fv, /if \(ui === me && ui\.st === 'ready' && !ui\.dexOpen && !ui\.sail && ui\.place === place\) toast\('🎣 던지기를 눌러요'\);/);
  assert.match(fv, /pitch: st === 'fight' \? -0\.12 : 0, lite: ui\.lite \}\);/, '느린 기기면 걸린 것을 가볍게');
  assert.match(fv, /root\.addEventListener\('pointerdown', \(\) => \{ if \(ui && ui\.sail\) endSail\(\); \}/, '누르면 넘김');
  assert.match(fv, /if \(ui\.sail\) \{ if \(e\.code === 'Space' \|\| e\.key === 'Enter'\) \{ e\.preventDefault\(\); endSail\(\); \} return; \}/, '키보드로도 넘김');
  assert.match(fv, /if \(ui\.sail && now - ui\.sail\.at >= SAIL_MS\) endSail\(\);/);
  assert.match(fv, /if \(ui\.sail\) \{ drawSail\(ctx, now\); return; \}/);
  const tp = body('togglePlaces');
  assert.match(tp, /const rest = pl === 'boat' && ui\.boatOpen && boatRest\(ui\.wx\);/);
  assert.match(tp, /rest \? '🌬️ 파도가 높아 오늘은 배가 쉬어요' : lock \?/);
  const om = body('onMark');
  assert.match(om, /const stick = soft === 'octo' && ui\.marks === 0;/, '문어 셋만 · 첫 표시점만');
  assert.match(om, /await ask\('fight', stick \? STICK_HEAD : ''\)/);
  assert.match(om, /if \(soft && ok === false\) \{/);
  assert.match(om, /toast\(inkLine\(ui\.fish\.key\), 1600\);/);
  assert.match(body('hookSet'), /ui\.marks = 0;\n\s*ui\.ink = null;/, '한 마리마다 처음부터');
  const sr = body('showResult');
  assert.match(sr, /el\('div', 'lk-res-size', sizeText\(f\.key, f\.cm, f\.g\)\)/);
  assert.match(sr, /if \(info\.boatOpened\) \{\n\s*ui\.boatOpen = true;\n\s*card\.appendChild\(el\('p', 'lk-res-open', BOAT_OPENED\)\);\n\s*card\.appendChild\(el\('p', 'lk-res-safe', BOAT_SAFE\)\);/);
  const dg = body('dexGrid');
  assert.match(dg, /if \(r\.soft\) card\.appendChild\(el\('p', 'lk-dex-soft', SOFT_NOTE\)\);/);
  assert.match(fv, /\(!x2\.boat \|\| ui\.boatOpen \|\| ui\.owned\[x2\.id\]\)/, '에기는 배가 열린 뒤에 가게에');
  assert.match(fv, /'🚤 배 낚시가 열리면 살 수 있어요'/);
  assert.match(body('syncGear'), /if \(st && st\.boat\) ui\.boatOpen = true;/);
  const lv = src('js/lakeview.js');
  assert.ok(lv.includes('boatOpen: boatOpen(lakeRaw()), // 🚤 (v386)'));
  assert.ok(lv.includes('boat: boatOpen(p && p.fishing),'));
  assert.ok(lv.includes("...(r.boatOpened ? { boatOpened: true } : {})"));
  assert.match(lv, /last === 'boat' && boatRest\(weatherOf\(clockDay\(\)\)\.key\) \? 'sea' : last/, '홈 띠 — 바람 날엔 바다');
  const fa = src('js/fishart.js');
  assert.match(fa, /export function drawBoat\(ctx, x, y, s = 1\)/);
  assert.match(fa, /export function drawInk\(ctx, x, y, s, k = 0\.4\)/);
  assert.match(fa, /if \(lk\.form === 'octo'\) \{ drawOcto\(ctx, lk, L, opts\); ctx\.restore\(\); return; \}/);
  assert.match(fa, /if \(opts\.flip \|\| lk\.faceR\) ctx\.scale\(-1, 1\);/, '문치가자미는 늘 머리 오른쪽');
  assert.equal((fa.match(/const detail = L >= 70 && !(sh|opts\.shadow) && !opts\.lite;/g) || []).length, 3, '물고기·문어·오징어 모두 느린 기기면 세부를 줄임');
  assert.match(src('js/db.js'), /^\s*'fishBoat',$/m);
  const st = src('js/stats.js');
  assert.ok(st.includes('🚤 배 낚시는 바다 도감 ${BOAT_NEED}종이면 열려요(🌬️ 바람 부는 날은 배가 쉼)'));
  assert.ok(src('js/upload.js').includes('물고기 N마리(🏞️ 강 M · 🌊 바다 K · 🚤 배 J)'));
  assert.match(src('css/style.css'), /\.lk-dex-soft \{/);
  assert.match(src('sw.js'), /const CACHE_VERSION = 'v(38[6-9]|39\d|[4-9]\d\d)';/); // v386 이상 (v387이 판을 올림)
  assert.match(src('js/version.js'), /APP_VERSION = 'v(38[6-9]|39\d|[4-9]\d\d)'/);
});
