// 🌊 바다 방파제 (v369 — 낚시 2단계 ③ 원고 「추천대로」) — node --test tests/sea369.test.js
// 바다 9종(원고 그대로 · 별마다 두 종 짝 · 농어) · 자리 셋(방파제 안쪽·테트라포드·먼 바다) · 강 도감 6종이면 열림(한 번 · seaOpened) · 🏅 감성돔 40 cm 4짜 ·
// 🦐 크릴(감성돔·볼락 · 바다가 열린 뒤에만 팖) · 루어는 바다에서 농어·조피볼락 · 바다 날씨 줄(비·바람 안전 한 줄) · 고른 물가 sea · 진짜 저장 경로 · 잇기(소스)
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  SPECIES, SPOTS, SEA_SPOTS, PLACES, PLACE_KO, PLACE_EMOJI, SEA_NEED, spotsOf, placeOfSpot, castSpot, poolAt, rollFish, starOdds,
  riverOpen, seaOpen, placeOpen, catchRule, GEAR, gearOf, baitTilt, mixTilt, pickOf, pickRule, gearBuyRule, lakeOf, badgesOf, BADGE_KO,
  weatherTilt, weatherLine, WEATHER, BIG_KIND_SEA, INTRO, DEX_HINT_SEA, dexRows, lakeDayLine, FISH_SEA, SEA_SAFE, dayKeyOf, josaOf,
} from '../js/fishing.js';
import { LOOKS } from '../js/fishart.js';
import { emptyProfile, emptyDaily, mergeDailyDelta } from '../js/db.js';
import { initProfile, flushProfile, reloadProfile, lakeBuy, lakePick, lakeCatch } from '../js/xp.js';
import { keepCatch, gearState } from '../js/lakeview.js';

const src = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const T = new Date(2026, 9, 31, 15, 0, 0).getTime();
// 씨앗 난수 (mulberry32 — 이웃 씨앗도 첫 값부터 고르게)
function m32(seed) { let a = (Math.imul(seed >>> 0, 0x9e3779b1) ^ 0x2545f491) >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const LAKE_KEYS = SPECIES.filter((s) => s.home === 'lake').map((s) => s.key);
const RIVER_KEYS = SPECIES.filter((s) => s.home === 'river').map((s) => s.key);
const SEA_KEYS = SPECIES.filter((s) => s.home === 'sea').map((s) => s.key);
const minOf = (k) => SPECIES.find((s) => s.key === k).min;
/** 도감에 keys를 채운 낚시 저장값 */
const dexWith = (keys) => ({ dex: Object.fromEntries(keys.map((k) => [k, { n: 1, best: minOf(k), d: '2026-10-30' }])), paid: {} });

test('🌊 바다 9종 — 원고 그대로(이름·별·길이) · 강 뒤 · 그림 · 별마다 두 종 짝(참돔만 혼자) · 확인한 최대 길이 아래 · 외래종·📸 없음 · 소개 한 줄 원고 그대로', () => {
  assert.equal(SPECIES.length, 33);
  assert.deepEqual(SPECIES.slice(24).map((s) => s.home), Array(9).fill('sea'));
  assert.deepEqual(SPECIES.filter((s) => s.home === 'sea').map((s) => [s.ko, s.star, s.min, s.max]), [
    ['문절망둑', 1, 8, 25], ['전갱이', 1, 10, 32], ['고등어', 2, 18, 45], ['노래미', 2, 12, 28], ['볼락', 3, 10, 30],
    ['조피볼락', 3, 18, 55], ['감성돔', 4, 20, 48], ['농어', 4, 30, 85], ['참돔', 5, 30, 90],
  ]);
  assert.deepEqual(SEA_KEYS, ['munjeol', 'jeongaeng', 'godeung', 'noraemi', 'bollak', 'jopi', 'gamseong', 'nongeo', 'chamdom']);
  assert.equal(new Set(SPECIES.map((s) => s.key)).size, 33, '키가 겹치지 않음');
  // 확인한 최대 길이 아래 (FishBase — 문절망둑 30 · 전갱이 50 · 고등어 64 · 노래미 30 SL · 볼락 35.9 · 조피볼락 65 · 감성돔 50 SL · 농어 102 · 참돔 100 SL)
  const CAP = { munjeol: 30, jeongaeng: 50, godeung: 64, noraemi: 30, bollak: 35.9, jopi: 65, gamseong: 50, nongeo: 102, chamdom: 100 };
  for (const s of SPECIES.filter((x) => x.home === 'sea')) {
    assert.ok(s.max < CAP[s.key], s.key);
    assert.ok(s.a > 0 && s.w > 0 && s.min < s.max, s.key);
    assert.ok(LOOKS[s.key], `${s.ko} 그림`);
    assert.ok(!s.alien && !s.photo, s.key);
    assert.match(INTRO[s.key], /요\.$/, s.key);
  }
  for (let st = 1; st <= 4; st++) assert.equal(poolAt('sea', st).length, 2, `★${st}는 두 종 — 미끼가 같은 별 안에서만 기울어서`);
  assert.deepEqual(poolAt('sea', 5).map(([x]) => x.key), ['chamdom']);
  // Codex 173차 「추천대로」 — 표준어 「망둥이」 · 볼락은 공공 자료(국립수산과학원)에 맞게
  assert.equal(INTRO.munjeol, '바닷물과 민물이 만나는 강어귀나 바닷가의 펄·모래 바닥에 살아요. 흔히 「망둥이」라고 불러요.');
  assert.doesNotMatch(Object.values(INTRO).join(' '), /망둥어/, '비표준 「망둥어」 안 씀');
  assert.equal(INTRO.jeongaeng, '우리나라 바다 어디에나 살아요. 옆줄을 따라 단단한 비늘(모비늘)이 한 줄로 늘어서 있어요.');
  assert.equal(INTRO.godeung, '등은 푸르고 검은 물결무늬가 있어요. 떼를 지어 빠르게 헤엄쳐요.');
  assert.equal(INTRO.noraemi, '바닷가 바위 사이 해초 숲에 살아요. 닮은 쥐노래미는 옆줄이 다섯 줄인데, 노래미는 한 줄이에요.');
  assert.equal(INTRO.bollak, '눈이 아주 커요. 밤에 먹이를 찾고, 바위가 많은 바닷가에 살아요.');
  assert.equal(INTRO.jopi, '흔히 「우럭」이라고 불러요. 알을 낳지 않고, 배 속에서 깨어난 새끼를 낳아요.');
  assert.equal(INTRO.gamseong, '어릴 때는 수컷이다가 자라면서 암컷으로 바뀌는 것이 많아요. 50 cm까지 크는 데 10년쯤 걸려요.');
  assert.equal(INTRO.nongeo, '바닷물과 민물을 오가요. 어린 농어는 강을 거슬러 오르기도 해요.');
  assert.equal(INTRO.chamdom, '붉은 몸에 파란 점이 반짝여요. 26년을 산 기록도 있어요.');
  assert.deepEqual(PLACES, ['lake', 'river', 'sea']);
  assert.equal(PLACE_KO.sea, '바다');
  assert.deepEqual(PLACE_EMOJI, { lake: '🏞️', river: '🏞️', sea: '🌊' });
});

test('⚓ 바다 자리 셋 — 방파제 안쪽 8 · 테트라포드 14 · 먼 바다 20 · 열리는 수·별 몫·밑밥은 저수지와 같음 · 던지기는 바다 자리 · 바다엔 바다 물고기만', () => {
  assert.deepEqual(SEA_SPOTS.map((s) => [s.key, s.ko, s.m]), [['harbor', '방파제 안쪽', 8], ['tetra', '테트라포드', 14], ['offshore', '먼 바다', 20]]);
  SEA_SPOTS.forEach((s, i) => {
    assert.deepEqual([s.need, s.chum, s.w], [SPOTS[i].need, SPOTS[i].chum, SPOTS[i].w]);
    assert.equal(placeOfSpot(s), 'sea');
    for (const c of [0, 1, 2]) assert.deepEqual(starOdds(s, c), starOdds(SPOTS[i], c), `${s.key} 밑밥 ${c}`);
  });
  assert.equal(spotsOf('sea'), SEA_SPOTS);
  assert.equal(castSpot(true, 0, 'sea').key, 'harbor');
  assert.equal(castSpot(true, 6, 'sea').key, 'tetra');
  assert.equal(castSpot(true, 99, 'sea').key, 'offshore');
  assert.equal(castSpot(false, 99, 'sea').key, 'harbor');
  // 바다엔 바다 물고기만 · 저수지·강엔 바다 물고기가 안 나옴 (씨앗 3000개)
  for (let st = 1; st <= 5; st++) {
    assert.ok(poolAt('sea', st).every(([x]) => x.home === 'sea'), `바다 ★${st}`);
    for (const pl of ['lake', 'river']) assert.ok(poolAt(pl, st).every(([x]) => x.home !== 'sea'), `${pl} ★${st}`);
  }
  const seen = new Set();
  for (let i = 0; i < 3000; i++) {
    const r = rollFish(SEA_SPOTS[i % 3], i % 3, i % 11, m32(i));
    assert.equal(r.place, 'sea');
    assert.equal(SPECIES.find((s) => s.key === r.key).home, 'sea', r.key);
    seen.add(r.key);
  }
  assert.equal(seen.size, 9, '아홉 종 모두 나옴');
});

test('🔓 바다 열림 — 강 도감 6종(5종은 아직 · 저수지 종은 안 셈) · 바다 물고기를 낚았으면 계속 · 그 한 마리에만 seaOpened(강 opened와 따로)', () => {
  assert.equal(SEA_NEED, 6);
  assert.equal(seaOpen(null), false);
  assert.equal(seaOpen(dexWith([...LAKE_KEYS, ...RIVER_KEYS.slice(0, 5)])), false, '저수지 16종 + 강 5종');
  assert.equal(seaOpen(dexWith(RIVER_KEYS.slice(0, 6))), true);
  assert.equal(seaOpen(dexWith(['chamdom'])), true, '도감은 줄지 않으니 바다 물고기가 있으면 열린 것');
  assert.equal(placeOpen(null, 'lake'), true);
  assert.equal(placeOpen(dexWith(RIVER_KEYS.slice(0, 5)), 'sea'), false);
  assert.equal(placeOpen(dexWith(RIVER_KEYS.slice(0, 5)), 'river'), true);
  assert.equal(placeOpen(dexWith(RIVER_KEYS.slice(0, 6)), 'sea'), true);
  assert.equal(placeOpen(dexWith(RIVER_KEYS), 'moon'), false);
  const p = { coins: 0, coinsEarned: 0, fishing: dexWith([...LAKE_KEYS.slice(0, 10), ...RIVER_KEYS.slice(0, 5)]) };
  let r = catchRule(p, { key: 'munjeol', cm: 10 }, T);
  assert.ok(r.ok, '바다 물고기를 낚는 일 자체는 규칙이 막지 않음(화면이 바다를 열린 뒤에만 보임)');
  const q = { coins: 0, coinsEarned: 0, fishing: dexWith([...LAKE_KEYS.slice(0, 10), ...RIVER_KEYS.slice(0, 5)]) };
  r = catchRule(q, { key: RIVER_KEYS[0], cm: minOf(RIVER_KEYS[0]) }, T);
  assert.equal(r.seaOpened, undefined, '이미 있는 종은 안 열림');
  r = catchRule(q, { key: 'bass', cm: 30 }, T + 1);
  assert.equal(r.seaOpened, undefined, '저수지 물고기는 바다를 안 엶');
  r = catchRule(q, { key: RIVER_KEYS[5], cm: minOf(RIVER_KEYS[5]) }, T + 2);
  assert.equal(r.seaOpened, true, '강 6종째');
  assert.equal(r.opened, undefined, '강은 이미 열려 있었음');
  r = catchRule(q, { key: RIVER_KEYS[6], cm: minOf(RIVER_KEYS[6]) }, T + 3);
  assert.equal(r.seaOpened, undefined, '한 번만');
  // 바다 물고기 💰 — 별 하나에 1 · 새 종 +5
  const s = { coins: 0, coinsEarned: 0, fishing: dexWith(RIVER_KEYS.slice(0, 6)) };
  assert.deepEqual(catchRule(s, { key: 'chamdom', cm: 60 }, T), { ok: true, first: true, best: false, coins: 5 + 5 });
  assert.deepEqual(s.fishing.dex.chamdom, { n: 1, best: 60, d: dayKeyOf(T) });
  for (const cm of [29.9, 90.1]) assert.deepEqual(catchRule(s, { key: 'chamdom', cm }, T), { ok: false, why: 'bad' }, `${cm}`);
});

test('🏅 감성돔 40 cm 「4짜」 — 💰 +5(붕어 월척·4짜와 같은 몫) · 39.9는 아님 · 다른 바다 물고기는 없음 · 붕어 규칙은 그대로', () => {
  assert.deepEqual(badgesOf('gamseong', 40), ['sajja']);
  assert.deepEqual(badgesOf('gamseong', 48), ['sajja']);
  assert.deepEqual(badgesOf('gamseong', 39.9), []);
  assert.equal(BADGE_KO.sajja, '🏅 4짜');
  for (const k of SEA_KEYS.filter((x) => x !== 'gamseong')) assert.deepEqual(badgesOf(k, 99), [], k);
  assert.deepEqual(badgesOf('bungeo', 30.3), ['wolcheok']);
  assert.deepEqual(badgesOf('bungeo', 40), ['sajja']);
  const p = { coins: 0, coinsEarned: 0, fishing: dexWith(RIVER_KEYS.slice(0, 6)) };
  assert.deepEqual(catchRule(p, { key: 'gamseong', cm: 41.5 }, T), { ok: true, first: true, best: false, coins: 4 + 5 + 5 });
  assert.deepEqual(catchRule(p, { key: 'gamseong', cm: 39.9 }, T + 1), { ok: true, first: false, best: false, coins: 4 });
  // 4짜는 별을 바꾸지 않는다 — 별 몫 그대로라 하루 💰 40은 그대로
  const r = rollFish(SEA_SPOTS[2], 2, 10, () => 0.999);
  assert.ok(r.cm <= 90);
});

test('🦐 크릴·루어 — 크릴은 감성돔·볼락 · 루어는 바다에서 농어·조피볼락(같은 별 짝끼리 갈림) · 크릴은 바다가 열린 뒤에만 팖 · 흐린 날 먼 바다는 바다의 큰 물고기 · 곱해도 최대 ×3', () => {
  const kr = gearOf('g_krill');
  assert.deepEqual([kr.kind, kr.ko, kr.emoji, kr.price, kr.sea], ['bait', '크릴', '🦐', 300, true]);
  assert.deepEqual(baitTilt('g_krill'), { gamseong: 2, bollak: 2 });
  assert.equal(baitTilt('g_lure').nongeo, 2);
  assert.equal(baitTilt('g_lure').jopi, 2);
  for (const [a, b] of [['gamseong', 'nongeo'], ['bollak', 'jopi']]) {
    assert.ok(baitTilt('g_krill')[a] && !baitTilt('g_krill')[b], `크릴 ${a}`);
    assert.ok(baitTilt('g_lure')[b] && !baitTilt('g_lure')[a], `루어 ${b}`);
  }
  assert.equal(Object.keys(baitTilt('g_corn')).some((k) => SEA_KEYS.includes(k)), false, '옥수수는 바다 물고기를 늘리지 않음');
  assert.deepEqual(GEAR.filter((g) => g.sea).map((g) => g.id), ['g_krill']);
  // 크릴로 감성돔이 늘어남 (★4 안에서 · 씨앗 4000개)
  const count = (tilt) => { let n = 0; for (let i = 0; i < 4000; i++) { const r = rollFish(SEA_SPOTS[2], 2, 0, m32(i), tilt); if (r.key === 'gamseong') n++; } return n; };
  assert.ok(count(baitTilt('g_krill')) > count(null) * 1.2, '크릴이면 감성돔이 더 (★4 짝이 둘이라 1/2 → 2/3 — 별 몫은 그대로)');
  // 사기 — 바다가 열린 뒤에만
  const p = { coins: 1000, items: {}, fishing: dexWith(RIVER_KEYS.slice(0, 5)) };
  assert.deepEqual(gearBuyRule(p, 'g_krill', T), { ok: false, why: 'locked' });
  assert.equal(p.coins, 1000);
  p.fishing = dexWith(RIVER_KEYS.slice(0, 6));
  const r = gearBuyRule(p, 'g_krill', T);
  assert.equal(r.ok, true);
  assert.equal(p.coins, 700);
  assert.equal(p.items.g_krill, 1);
  assert.equal(r.pick.bait, 'g_krill', '산 미끼는 바로 씀');
  assert.deepEqual(gearBuyRule(p, 'g_krill', T + 1), { ok: false, why: 'owned' });
  // 날씨 — 흐린 날 먼 바다만 · 별마다 가장 큰 바다 물고기
  assert.deepEqual(BIG_KIND_SEA, ['jeongaeng', 'godeung', 'jopi', 'nongeo', 'chamdom']);
  assert.deepEqual(weatherTilt('cloud', 'offshore'), { jeongaeng: 2, godeung: 2, jopi: 2, nongeo: 2, chamdom: 2 });
  for (const k of ['harbor', 'tetra']) assert.equal(weatherTilt('cloud', k), null, k);
  assert.equal(Object.keys(weatherTilt('rain', 'offshore')).some((k) => SEA_KEYS.includes(k)), false, '비는 바다 물고기를 안 기울임');
  assert.deepEqual(mixTilt(weatherTilt('cloud', 'offshore'), baitTilt('g_lure')).nongeo, 3, '흐린 날 × 루어 = 3에서 멈춤');
  assert.deepEqual(mixTilt(weatherTilt('cloud', 'offshore'), baitTilt('g_krill')).gamseong, 2);
});

test('🌦️ 바다 날씨 줄 — 흐림은 먼 바다 · 비·바람은 안전 한 줄 · 맑음은 저수지와 같음 · 열릴 때 안전 한 줄 · 안 낚은 칸 힌트는 바다 자리 이름', () => {
  const w = (k) => WEATHER.find((x) => x.key === k);
  assert.equal(weatherLine(w('sun'), 'sea'), '☀️ 맑은 날이에요. 해 질 녘엔 노을이 져요.');
  assert.equal(weatherLine(w('cloud'), 'sea'), '☁️ 흐린 날엔 먼 바다에서 큰 물고기가 잘 나온대요.');
  assert.equal(weatherLine(w('rain'), 'sea'), '🌧️ 비 오는 날이에요. 진짜 방파제는 미끄러우니 천천히 걸어요.');
  assert.equal(weatherLine(w('wind'), 'sea'), '🌬️ 바람 부는 날엔 파도가 높아요. 진짜 바다에선 테트라포드에 올라가지 않아요.');
  assert.equal(weatherLine(w('wind'), 'lake'), '🌬️ 바람 부는 날이에요. 찌가 흔들려도 진짜 입질을 잘 봐요.', '저수지는 그대로');
  assert.equal(weatherLine(w('wind'), 'river'), '🌬️ 바람 부는 날이에요. 찌가 흔들려도 진짜 입질을 잘 봐요.', '강은 바람 줄이 없어 저수지 줄');
  assert.equal(weatherLine(w('rain'), 'river'), '🌧️ 비 오는 날이에요. 빗방울 사이로 찌를 잘 봐요.');
  assert.equal(SEA_SAFE, '🦺 진짜 바다 낚시는 어른과 함께, 구명조끼를 입고 해요.');
  assert.deepEqual(DEX_HINT_SEA, { 1: '방파제 안쪽에서 자주 보여요.', 2: '방파제 안쪽과 테트라포드에서 보여요.', 3: '테트라포드나 먼 바다에서 만나요.', 4: '먼 바다에 살아요.', 5: '먼 바다에서 아주 가끔 나와요.' });
  const rows = dexRows(dexWith(['gamseong', 'bungeo']));
  assert.equal(rows.length, 33);
  assert.deepEqual(rows.find((r) => r.key === 'chamdom'), { key: 'chamdom', ko: '참돔', star: 5, alien: false, home: 'sea', photo: false, caught: false, hint: DEX_HINT_SEA[5] });
  assert.equal(rows.find((r) => r.key === 'gamseong').intro, INTRO.gamseong);
  for (const r of rows.filter((x) => !x.caught)) assert.doesNotMatch(r.hint, /\d/, '힌트에 숫자 없음');
});

test('🗺️ 고른 물가 sea — 바다는 열린 뒤에만 · 읽을 때 닫혔으면 저수지 · 저장값 sea 그대로 읽힘 · 📤 줄 「(🏞️ 강 · 🌊 바다)」 · 하루 칸 fishSea', () => {
  const p = { coins: 0, items: {}, fishing: dexWith(RIVER_KEYS.slice(0, 5)) };
  assert.deepEqual(pickRule(p, { place: 'sea' }, T), { ok: false, why: 'locked' });
  p.fishing = dexWith(RIVER_KEYS.slice(0, 6));
  assert.equal(pickRule(p, { place: 'sea' }, T).ok, true);
  assert.equal(pickOf(p).place, 'sea');
  assert.equal(p.fishing.pick.place, 'sea');
  assert.deepEqual(lakeOf({ pick: { place: 'sea', bait: 'g_krill', rod: 'rod', at: 3 } }).pick, { place: 'sea', bait: 'g_krill', rod: 'rod', at: 3 });
  // 병합으로 도감이 줄어든 옛 기기 — 바다가 안 열렸으면 저수지에서
  assert.equal(pickOf({ fishing: { ...dexWith(RIVER_KEYS.slice(0, 2)), pick: { place: 'sea', bait: 'worm', rod: 'rod', at: 1 } } }).place, 'lake');
  assert.equal(pickOf({ items: {}, fishing: { ...dexWith(RIVER_KEYS.slice(0, 6)), pick: { place: 'sea', bait: 'g_krill', rod: 'rod', at: 1 } } }).bait, 'worm', '안 가진 크릴은 지렁이로');
  assert.equal(FISH_SEA, 'fishSea');
  assert.equal(emptyDaily('2026-10-31').fishSea, 0);
  const d = mergeDailyDelta(mergeDailyDelta(emptyDaily('2026-10-31'), '2026-10-31', { fishCatch: 3, fishSea: 2 }), '2026-10-31', { fishSea: 1 });
  assert.equal(d.fishSea, 3);
  assert.equal(lakeDayLine({ fishSec: 300, fishCatch: 4, fishSea: 3 }), '🎣 낚시터 5분 · 물고기 4마리(🌊 바다 3)');
  assert.equal(lakeDayLine({ fishSec: 300, fishCatch: 4, fishRiver: 1, fishSea: 3 }), '🎣 낚시터 5분 · 물고기 4마리(🏞️ 강 1 · 🌊 바다 3)');
  assert.equal(lakeDayLine({ fishSec: 300, fishCatch: 4, fishRiver: 1 }), '🎣 낚시터 5분 · 물고기 4마리(🏞️ 강 1)', 'v368 줄 그대로');
});

const stored = () => fakeIdb.get('profile', 'me');
async function fresh(extra) {
  await initProfile();
  await flushProfile();
  const cur = stored() || emptyProfile();
  fakeIdb.put('profile', { ...cur, items: {}, fishing: { dex: {}, paid: {} }, ...extra, updatedAt: (cur.updatedAt || 0) + 1 });
  await reloadProfile();
}

test('★ 진짜 저장 경로 — 강 6종째를 낚으면 seaOpened를 화면에 넘김 · 바다에서 낚으면 fishCatch와 fishSea · 크릴은 열린 뒤에만 사짐(💰 그대로) · 바다 고르기 저장 · gearState.sea', async () => {
  await fresh({ coins: 500, fishing: dexWith([...LAKE_KEYS.slice(0, 10), ...RIVER_KEYS.slice(0, 5)]) });
  assert.equal(gearState().sea, false);
  assert.deepEqual(await lakeBuy('g_krill'), { ok: false, why: 'locked' });
  assert.equal(stored().coins, 500);
  assert.equal(stored().items.g_krill, undefined);
  assert.equal((await lakePick({ place: 'sea' })).why, 'locked');
  const puts = [];
  const put = (x) => puts.push(x);
  const r1 = await keepCatch({ key: RIVER_KEYS[5], cm: minOf(RIVER_KEYS[5]), place: 'river' }, put);
  assert.equal(r1.seaOpened, true);
  assert.equal(r1.opened, undefined);
  assert.equal(gearState().sea, true);
  const r2 = await keepCatch({ key: 'godeung', cm: 30, place: 'sea' }, put);
  assert.deepEqual(r2, { ok: true, first: true, best: false, coins: 2 + 5 });
  assert.deepEqual(puts, [{ fishCatch: 1, fishRiver: 1 }, { fishCatch: 1, fishSea: 1 }]);
  assert.equal((await lakeBuy('g_krill')).ok, true);
  assert.equal(stored().items.g_krill, 1);
  assert.equal(stored().fishing.pick.bait, 'g_krill');
  assert.equal((await lakePick({ place: 'sea' })).ok, true);
  assert.equal(stored().fishing.pick.place, 'sea');
  assert.equal(gearState().pick.place, 'sea');
  const r3 = await lakeCatch({ key: 'gamseong', cm: 44 });
  assert.equal(r3.ok, true);
  assert.equal(r3.coins, 4 + 5 + 5, '🏅 4짜 +5');
  assert.equal(fakeIdb.failsLeft(), 0);
});

test('🔌 잇기 — 🗺️ 물가 셋(바다 줄은 강이 열린 뒤) · 결과 카드 바다 열림 + 안전 한 줄 · 크릴은 바다가 열린 뒤 가게에 · 📖 도감 바다 쪽 · 바다 풍경 · 하루 칸 · 📊·📤 · 서비스워커 · 판', () => {
  const fv = src('js/fishview.js');
  const body = (name) => { const i = fv.indexOf(`function ${name}(`); assert.ok(i >= 0, name); return fv.slice(i, fv.indexOf('\n}\n', i)); };
  const tp = body('togglePlaces');
  assert.match(tp, /for \(const pl of PLACES\) \{\n\s*if \(pl === 'sea' && !ui\.riverOpen\) continue;[^\n]*\n\s*const lock = !placeOk\(pl\);/);
  assert.match(tp, /el\('b', '', `\$\{PLACE_EMOJI\[pl\]\} \$\{PLACE_KO\[pl\]\}`\)/);
  assert.match(body('placeOk'), /return pl === 'lake' \|\| \(pl === 'river' && ui\.riverOpen\) \|\| \(pl === 'sea' && ui\.seaOpen\);/);
  assert.match(body('switchPlace'), /if \(!canMenu\(\) \|\| pl === ui\.place \|\| !PLACES\.includes\(pl\) \|\| !placeOk\(pl\)\) return;/);
  assert.match(body('switchPlace'), /ui\.spot = spotsOf\(pl\)\[0\];\n\s*q\$\('\.lk-spot'\)\.hidden = true;/, '앞 물가 자리 칩을 숨김');
  assert.match(body('syncGear'), /if \(st && st\.sea\) ui\.seaOpen = true;/);
  assert.match(fv, /const place = \(h\.place === 'river' && riverOk\) \|\| \(h\.place === 'sea' && seaOk\) \? h\.place : 'lake';/);
  assert.match(fv, /if \(info\.seaOpened\) \{\n\s*ui\.seaOpen = true;\n\s*card\.appendChild\(el\('p', 'lk-res-open', '🌊 바다 낚시터가 열렸어요! 🗺️ 물가에서 가 봐요'\)\);\n\s*card\.appendChild\(el\('p', 'lk-res-safe', SEA_SAFE\)\);/);
  assert.match(body('renderShop'), /GEAR\.filter\(\(x2\) => x2\.kind === kind && \(!x2\.sea \|\| ui\.seaOpen \|\| ui\.owned\[x2\.id\]\)\)/);
  assert.ok(fv.includes("locked: '🌊 바다가 열리면 살 수 있어요'"));
  assert.match(fv, /harbor: '⚓', tetra: '🧱', offshore: '🌊'/);
  assert.match(fv, /sea: \{ 2: '🧱 테트라포드가 열렸어요! 맞히고 던지면 더 멀리 가요', 3: '🌊 먼 바다가 열렸어요! 큰 물고기가 살아요' \}/);
  // 📖 도감 — 낚시터마다 · 바다 줄은 강이 열린 뒤 · 열리기 전엔 숫자 없이
  assert.match(fv, /const openOk = \{ lake: true, river: got\('river'\) > 0 \|\| got\('lake'\) >= RIVER_NEED, sea: got\('sea'\) > 0 \|\| got\('river'\) >= SEA_NEED \};/);
  assert.match(fv, /if \(!list\.some\(\(r\) => homeOf\(r\) === pl\) \|\| \(pl === 'sea' && !openOk\.river\)\) continue;/);
  const lv = src('js/lakeview.js');
  assert.ok(lv.includes('seaOpen: seaOpen(lakeRaw()),'));
  assert.ok(lv.includes('sea: seaOpen(p && p.fishing),'));
  assert.ok(lv.includes('...(r.seaOpened ? { seaOpened: true } : {})'));
  const fa = src('js/fishart.js');
  assert.match(fa, /if \(sea\) seaHorizon\(ctx, sky, x0, x1\);\n\s*else landHills\(ctx, sky, x0, x1\);/);
  assert.match(fa, /if \(sea\) \{ seaBank\(ctx, x0, x1\);/);
  assert.match(fa, /if \(place === 'sea'\) \{ seaFx\(ctx, t, lite, x0, x1, wx\); return; \}/);
  assert.match(fa, /if \(lk\.dorsal2\) ctx\.fill\(finPath\(lk, b, lk\.dorsal2, true\)\);/);
  assert.match(src('js/db.js'), /^\s*'fishSea',$/m);
  const st = src('js/stats.js');
  assert.match(st, /if \(!got\.length && !placeOpen\(pf\.fishing, pl\)\) continue;/);
  assert.ok(st.includes('🌊 바다는 강 도감 ${SEA_NEED}종이면 열려요'));
  assert.ok(src('js/upload.js').includes('물고기 N마리(🏞️ 강 M · 🌊 바다 K)'));
  assert.match(src('css/style.css'), /\.lk-res-safe \{[^}]*word-break: keep-all;/, '안전 줄은 낱말 중간에서 안 끊김');
  assert.match(src('sw.js'), /const CACHE_VERSION = 'v369';/);
  assert.match(src('js/version.js'), /APP_VERSION = 'v369'/);
  assert.match(fv, /'🔒 물고기를 더 만나면 길이 열려요'/, '잠금 줄은 숫자 없이 그대로');
  assert.doesNotMatch(fv, /\$\{SEA_NEED\}/, '아이 화면에 바다 열림 수를 안 씀');
});

test('🔤 가게 알림 조사 — 받침에 맞게(「크릴을 샀어요」 · 「옥수수 미끼를」) · 끝 괄호는 빼고 봄 · 낚싯대는 「로」 · 세 곳 모두 josaOf', () => {
  assert.equal(josaOf('크릴', '을', '를'), '을');
  assert.equal(josaOf('옥수수 미끼', '을', '를'), '를');
  assert.equal(josaOf('루어(가짜 물고기)', '을', '를'), '를', '루어 → 를');
  assert.equal(josaOf('크릴(새우 무리)', '을', '를'), '을', '끝 괄호를 빼고 「크릴」로 봄 (변이 mut369a — 루어만으론 못 가름)');
  assert.equal(josaOf('🦐 크릴', '을', '를'), '을');
  assert.equal(josaOf('금색 낚싯대', '으로', '로', true), '로');
  assert.equal(josaOf('줄', '으로', '로', true), '로', 'ㄹ 받침은 로');
  assert.equal(josaOf('책', '으로', '로', true), '으로');
  assert.equal(josaOf('줄', '을', '를'), '을', 'ㄹ 받침도 을');
  for (const w of ['', 'abc', null, '7']) assert.equal(josaOf(w, '을', '를'), '를', String(w));
  for (const g of GEAR) assert.match(`${g.ko}${josaOf(g.ko, '을', '를')}`, /(을|를)$/);
  const fv = src('js/fishview.js');
  assert.doesNotMatch(fv, /\}를 (샀어요|끼웠어요)|'를 끼웠어요'|'로 바꿨어요'/, '조사를 글자로 박지 않음');
  assert.equal((fv.match(/josaOf\(/g) || []).length, 4, '칩 끼웠어요 · 가게 끼웠어요 · 바꿨어요 · 샀어요');
});

test('★ 두 창이 함께 (Codex 173차) — 강 6종째를 동시에 낚아도 「바다 열렸어요」·새 종은 한 결과에만 · 크릴을 동시에 두 번 사도 💰 300 한 번', async () => {
  await fresh({ coins: 1000, fishing: dexWith([...LAKE_KEYS.slice(0, 10), ...RIVER_KEYS.slice(0, 5)]) });
  const k = RIVER_KEYS[5];
  const rs = await Promise.all([lakeCatch({ key: k, cm: minOf(k) }), lakeCatch({ key: k, cm: minOf(k) })]);
  assert.deepEqual(rs.map((r) => r.ok), [true, true]);
  assert.equal(rs.filter((r) => r.seaOpened).length, 1, '바다 열림은 한 결과에만');
  assert.equal(rs.filter((r) => r.first).length, 1, '새 종도 한 번');
  assert.equal(stored().fishing.dex[k].n, 2, '두 마리 모두 적힘');
  const earned = rs[0].coins + rs[1].coins;
  const bs = await Promise.all([lakeBuy('g_krill'), lakeBuy('g_krill')]);
  assert.deepEqual(bs.map((r) => r.ok).sort(), [false, true]);
  assert.equal(bs.find((r) => !r.ok).why, 'owned');
  assert.equal(stored().coins, 1000 + earned - 300, '💰 300은 한 번만');
  assert.equal(stored().items.g_krill, 1);
  assert.equal(fakeIdb.failsLeft(), 0);
});
