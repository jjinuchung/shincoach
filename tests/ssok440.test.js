// v440 🌀 쏙쏙 여섯 땅 여행 — 🌿 풀밭(v373 그대로) + 🌊 바다 · 끝까지 하면 다음 땅 · 이기면 🏅 · 보스 타입 배지(맞는 능력 ×2 「효과가 굉장했다!」)
// (2026-11-26 아버님 「매번 똑같은 스테이지」 → 기본안 「추천대로」 → 시안 「이대로」) — node --test tests/ssok440.test.js
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  ssokStart, ssokStage, ssokTick, ssokLeft, ssokLeftUp, ssokRight, ssokRightUp, ssokShift, runSsok, ssokFriendPick,
  CHUNKS, CHUNK_N, BOSS, ARENA, SSOK_KINDS, FORCED, FRIENDS, FRIEND_HELP, MAX_MS, chunkLevel,
} from '../js/gamessok.js';
import { GROUND, ME, ART as ADV_DRAW } from '../js/gameadv.js';
import {
  SSOK_WORLDS, SSOK_WORLD_IDS, SSOK_AB_TYPE, SSOK_MARK, ssokWorld, landKey, ssokProgress, ssokOpen, ssokPickLand, ssokTurn, ssokFresh,
  ssokLandRule, ssokEndLine, SSOK_DAILY, SSOK_DAY_LISTS, ssokDayDelta, ssokDayLine,
} from '../js/ssokworld.js';
import { mult } from '../js/journey.js';
import { MON_TYPES } from '../js/montypes.js';
import { GAMES } from '../js/minigame.js';
import { playOf, mergePlay, gameEndRule, recKey, BEST_KEYS_MAX } from '../js/homeplay.js';
import { LOOK_BASE } from '../js/avatar.js';
import { FIRST_ROOM } from '../js/house.js';
import { emptyProfile, cloneProfile, mergeStatRecord, mergeDailyDelta, emptyDaily } from '../js/db.js';
import { initProfile, flushProfile, reloadProfile, gameEnd, ssokLandsNow } from '../js/xp.js';
import { PLACES } from '../js/usage.js';
import { usageFiles } from '../js/upload.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const seeded = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
function play(s, ms, policy = null) {
  const evs = [];
  const end = s.last + ms;
  while (!s.done && s.last < end) {
    const t = s.last + 16;
    if (policy) policy(s, t);
    evs.push(ssokTick(s, t));
  }
  return evs;
}
const all = (evs, k) => evs.flatMap((e) => (Array.isArray(e[k]) ? e[k] : e[k] ? [e[k]] : []));
const GAME_KEY = /^[a-z]{2,12}$/; // homeplay.js와 같은 꼴 — 꼴이 틀린 열쇠는 저장할 때마다 조용히 사라진다

// ───────────────────── 땅 표 ─────────────────────
test('🗺️ 땅 표 (v440): 🌿 풀밭 → 🌊 바다 차례 · 열쇠는 소문자 꼴이고 다른 게임 기록과 안 겹침 · 상성은 journey.CHART와 같다(×2만) · 바다 친구는 물 타입 모두', () => {
  assert.deepEqual(SSOK_WORLD_IDS, ['grass', 'sea']);
  assert.deepEqual(SSOK_WORLDS.map((w) => `${w.emoji} ${w.ko}`), ['🌿 풀밭', '🌊 바다']);
  const others = new Set([...GAMES.map((g) => g.id), ...GAMES.map((g) => recKey(g.id)), SSOK_MARK]);
  for (const w of SSOK_WORLDS) {
    assert.match(w.id, /^[a-z]{2,8}$/, w.id);
    assert.match(landKey(w.id), GAME_KEY);
    assert.ok(!others.has(landKey(w.id)), `${w.id} 열쇠가 겹침`);
    // 상성 — 맞으면 ×2인 능력 = journey.mult가 2 이상인 능력 (×½·×0은 안 씀 — 배지 없는 풀밭은 굉장 없음)
    for (const ab of Object.keys(SSOK_AB_TYPE)) {
      const sup = !!w.type && mult(SSOK_AB_TYPE[ab], [w.type]) >= 2;
      assert.equal(w.sup.includes(ab), sup, `${w.id} ${ab}`);
    }
    if (w.type) {
      assert.ok(w.typeEmoji && Array.isArray(w.badge), `${w.id} 배지`);
      const like = FRIENDS.filter((f) => (MON_TYPES[f.id] || []).includes(w.type)).map((f) => f.id);
      assert.deepEqual([...w.friendIds].sort((a, b) => a - b), like, `${w.id} 친구 = 그 타입 친구 모두`);
    }
  }
  const g = ssokWorld('grass');
  assert.deepEqual([g.type, g.sup, g.forced, g.boss, g.bossEmoji, g.appear], [null, [], null, {}, '🤖', '🤖 로켓단 큰 메카가 나타났다!'], '풀밭은 v373 보스 그대로');
  const sea = ssokWorld('sea');
  assert.deepEqual([sea.type, sea.typeEmoji, sea.sup, sea.forced, sea.bossEmoji, sea.appear, sea.ballZap], ['water', '💧', ['elec'], { 1: 'elec' }, '🚢', '🚢 로켓단 잠수함이 나타났다!', false]);
  assert.ok(!/큰 메카/.test(GAMES.find((x) => x.id === 'ssok').how), '게임 카드 설명은 땅과 상관없이 「로켓단 보스」');
  assert.equal(mult('electric', ['water']), 2);
  assert.equal(ssokWorld('nope'), g, '모르는 땅은 풀밭');
  assert.equal(ssokWorld(undefined), g);
  assert.ok(!/^\s*import\s/m.test(read('js/ssokworld.js')), 'ssokworld.js는 아무것도 import하지 않는다(db·homeplay·upload가 부른다)');
});

test('🚫 원작 이름 (v440 — 새 파일·CSS까지 넓힘): 땅 표·쏙쏙·쏙쏙 CSS에 원작 캐릭터·지명이 없다', () => {
  const BAD = /커비|kirby|디디디|dedede|와들\s?[디두]|\bwaddle|메타\s?나이트|meta\s?knight|위스피|whispy|크래코|kracko|고르도|\bgordo|워프\s?스타|warp\s?star|팝스타|popstar|드림\s?랜드|dream\s?land|할버드|halberd|로보보|robobot/i;
  assert.ok(!BAD.test(read('js/ssokworld.js')), 'ssokworld.js');
  assert.ok(!BAD.test(read('js/gamessok.js').replace(/『별의 커비』/g, '')), 'gamessok.js (머리말 출처 한 곳만 뺌)');
  const css = read('css/style.css').split('\n').filter((l) => /gs-|is-w-|gm-game-new/.test(l)).join('\n');
  assert.ok(css.length > 1000 && !BAD.test(css), '쏙쏙 CSS');
});

// ───────────────────── 🌿 풀밭은 v373 그대로 ─────────────────────
const OLD = ['len', 'arenaX', 'pits', 'ground', 'solids', 'blocks', 'fruits', 'mechas', 'drones', 'volts', 'cages', 'mballs', 'chunks', 'seq'];
const v439 = (st) => Object.fromEntries(OLD.map((k) => [k, st[k]]));
test('🌿 풀밭 = v439 판 그대로 (v440): 씨앗 400개 길(v439 칸)·안 누르는 120판이 v439로 뽑은 값과 같다 · 땅을 안 넘겨도 \'grass\'를 넘겨도 같다', () => {
  const h = createHash('sha1');
  for (let s = 1; s <= 400; s++) {
    const a = ssokStage(seeded(s));
    const b = ssokStage(seeded(s), null, 'grass');
    assert.deepEqual(v439(a), v439(b));
    assert.ok(!a.chunks.some((c) => CHUNKS.find((x) => x.id === c).world), '풀밭엔 바다 조각이 없다');
    h.update(JSON.stringify(v439(a)));
  }
  assert.equal(h.digest('hex'), 'a290fdd91d36c1fd800651ac2678219aa84308ef', 'v439 코드로 뽑은 길 해시');
  const out = [];
  for (let s = 1; s <= 120; s++) {
    const st = ssokStart(0, seeded(s));
    while (!st.done && st.last < MAX_MS) ssokTick(st, st.last + 16);
    out.push([s, st.doneAt, st.score, st.rescues, st.helps]);
  }
  assert.equal(createHash('sha1').update(JSON.stringify(out)).digest('hex'), '6038c11d7bc2997fc3eb13cbc71a34593c10cd64', 'v439 코드로 뽑은 안 누르는 판 해시');
  const st = ssokStage(seeded(1));
  assert.equal(st.world, 'grass');
  assert.deepEqual(st.boss, { ...BOSS, sup: [] }, '풀밭 보스 = BOSS · 굉장 없음');
});

// ───────────────────── 🌊 바다 길 ─────────────────────
test('🌊 바다 길 (v440): 씨앗 400개 — 조각 9 · 둘째는 늘 ⚡ 능력 메카 · 우리·몬스터볼 자리 그대로 · 바다 조각(잔교·징검다리)이 나온다 · 싸움터 앞 10칸은 평지', () => {
  const seaIds = CHUNKS.filter((c) => c.world === 'sea').map((c) => c.id);
  assert.deepEqual(seaIds.sort(), ['pier', 'stones']);
  for (const c of CHUNKS.filter((x) => x.world)) assert.ok(!c.ab && !c.forced && Number.isInteger(c.lv), `${c.id}: 능력·정해 둔 자리 조각이 아니다(풀밭 고르기를 안 바꾸게)`);
  let seaN = 0;
  for (let s = 1; s <= 400; s++) {
    const st = ssokStage(seeded(s), null, 'sea');
    assert.equal(st.world, 'sea');
    assert.deepEqual(st.boss, { ...BOSS, sup: ['elec'] }, '바다 보스 수치는 풀밭과 같게 · ⚡ 굉장');
    assert.equal(st.chunks.length, CHUNK_N);
    assert.equal(st.chunks[1], 'elec', '둘째 = ⚡ 능력 메카');
    for (const [i, id] of Object.entries(FORCED)) if (i !== '1') assert.equal(st.chunks[i], id, `${i}째`);
    for (let i = 0; i < CHUNK_N; i++) {
      const c = CHUNKS.find((x) => x.id === st.chunks[i]);
      if (!FORCED[i]) assert.ok(c.lv <= chunkLevel(i), `${s}: ${i}째 ${c.id}`);
      if (i >= 1) assert.notEqual(st.chunks[i], st.chunks[i - 1]);
    }
    assert.equal(st.len, st.arenaX + ARENA.len);
    assert.ok(st.pits.every(([, b]) => b < st.arenaX - 10));
    for (const m of [...st.mechas, ...st.drones]) assert.ok(m.x >= m.a && m.x <= m.b);
    seaN += st.chunks.filter((id) => seaIds.includes(id)).length;
  }
  assert.ok(seaN > 250, `400판에 바다 조각 ${seaN}`);
});

test('⏱️ 🌊 바다 — 안 눌러도 늘 끝 (v440): 씨앗 120개 모두 보스까지 가서 도망 · 가장 긴 판 100초 안', () => {
  let worst = 0;
  for (let s = 1; s <= 120; s++) {
    const st = ssokStart(0, seeded(s), null, 'sea');
    const evs = play(st, MAX_MS);
    assert.ok(st.done && st.boss && st.fled && !st.win, `씨앗 ${s}`);
    assert.equal(all(evs, 'boss').length, 1);
    worst = Math.max(worst, st.doneAt);
  }
  assert.ok(worst < 100000, `가장 긴 판 ${worst}ms`);
});

test('🌊 바다 조각 하나씩 (v440): 잔교는 걸어서 건넘(피죤 0) · 징검다리는 꾹 둥실이면 피죤 0 · 안 누르면 구덩이마다 피죤 한 번(같은 섬으로 되돌리는 고리 없음)', () => {
  const go = (id, mode) => {
    const st = ssokStart(0, seeded(3), [id], 'sea');
    st.mechas = []; st.drones = [];
    let held = false;
    while (!st.done && st.x < st.stage.arenaX && st.last < 40000) {
      const t = st.last + 16;
      if (mode === 'hold' && !held) { ssokLeft(st, t); held = true; }
      ssokTick(st, t);
    }
    assert.ok(st.x >= st.stage.arenaX, `${id} ${mode}: 싸움터까지 (${st.last}ms)`);
    return st;
  };
  assert.equal(go('pier', 'none').rescues, 0, '잔교 판자 사이 틈은 발보다 좁다');
  assert.equal(go('pier', 'none').bumps, 0);
  assert.equal(go('stones', 'hold').rescues, 0, '꾹 둥실이면 안 빠진다');
  const n = go('stones', 'none');
  assert.equal(n.rescues, 3, '구덩이 셋 — 하나에 한 번씩');
  assert.equal(n.stage.pits.length, 3);
  for (const [a, b] of n.stage.pits) assert.ok(b - a > ME.w - 2, '발 너비보다 넓어야 빠진다');
  const gaps = n.stage.pits.slice(1).map(([a], i) => a - n.stage.pits[i][1]);
  assert.ok(gaps.every((g) => g > 5.5), `섬 ${gaps}`);
});

test('⭐ 길 ⭐ (v440): 바다 길에서 얻을 수 있는 ⭐ 중간값이 풀밭 +10% 안 (쉬운 땅에서 기록이 부풀지 않게)', () => {
  const avail = (st) => st.fruits.reduce((a, f) => a + SSOK_KINDS[f.kind].pts, 0) + (st.mechas.length + st.drones.length) * 2 + st.blocks.length * (2 + SSOK_KINDS.gold.pts) + st.cages.length * SSOK_KINDS.cage.pts;
  const med = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
  const g = [];
  const s = [];
  for (let k = 1; k <= 400; k++) { g.push(avail(ssokStage(seeded(k)))); s.push(avail(ssokStage(seeded(k), null, 'sea'))); }
  assert.ok(med(s) <= med(g) * 1.1, `풀밭 ${med(g)} · 바다 ${med(s)}`);
  assert.ok(med(s) >= med(g) * 0.8, `바다가 너무 적지 않게 — 풀밭 ${med(g)} · 바다 ${med(s)}`);
});

// ───────────────────── 🚢 보스 타입 배지 ─────────────────────
const toArena = (seed, world = 'sea', freed = []) => {
  const s = ssokStart(0, seeded(seed), ['row'], world);
  s.mechas = []; s.drones = []; s.volts = []; s.fruits = []; s.blocks = [];
  s.freed = [...freed];
  s.x = s.stage.arenaX + ME.screen - 2;
  play(s, 300);
  assert.ok(s.boss);
  return s;
};
const dodge = (x, t) => {
  if (x.onGround && x.rollers.some((r) => r.kind === 'ball' && r.x > x.x && r.x - (x.x + ME.w) < 3)) { ssokLeft(x, t); ssokLeftUp(x, t); }
};
test('💥 굉장 (v440): 🌊 💧 보스에 ⚡이면 2칸 + 「효과가 굉장했다!」 · 🔥·🪨·⭐·친구는 그대로(×½·×0 없음) · 마지막 한 칸도 굉장 · 🌿 풀밭은 굉장 없음', () => {
  assert.equal(toArena(14).boss.max, BOSS.hp);
  const z = toArena(14);
  z.boss.nextAt = 1e12;
  z.ability = 'elec';
  ssokRight(z, z.last);
  let evs = play(z, 100);
  assert.deepEqual(all(evs, 'bossHit'), [BOSS.move * 2]);
  assert.deepEqual(all(evs, 'great'), [{ d: BOSS.move * 2, by: 'elec' }]);
  const f = toArena(13);
  f.boss.nextAt = 1e12;
  f.ability = 'fire';
  ssokRight(f, f.last);
  evs = play(f, 1500);
  assert.deepEqual(all(evs, 'bossHit'), [BOSS.move], '🔥은 물 보스에 ×½이지만 깎지 않는다');
  assert.deepEqual(all(evs, 'great'), []);
  const r = toArena(15);
  r.boss.nextAt = 1e12;
  r.ability = 'rock';
  ssokRight(r, r.last);
  evs = play(r, 1500);
  assert.deepEqual(all(evs, 'bossHit'), [BOSS.move]);
  assert.deepEqual(all(evs, 'great'), []);
  const a = toArena(12);
  a.boss.nextAt = 1e12;
  a.mouth = 'bolt';
  ssokRight(a, a.last);
  ssokRightUp(a, a.last);
  evs = play(a, 1200);
  assert.deepEqual(all(evs, 'bossHit'), [BOSS.star], '⭐ 별은 늘 2칸');
  assert.deepEqual(all(evs, 'great'), []);
  const p = toArena(16, 'sea', [0]);
  p.boss.nextAt = 1e12;
  evs = play(p, FRIEND_HELP.first + 200);
  assert.deepEqual(all(evs, 'bossHit'), [FRIEND_HELP.dmg], '친구 몸통박치기는 늘 1칸');
  assert.deepEqual(all(evs, 'great'), []);
  const last = toArena(17);
  last.boss.nextAt = 1e12;
  last.boss.hp = 1;
  last.ability = 'elec';
  ssokRight(last, last.last);
  evs = play(last, 100);
  assert.deepEqual(all(evs, 'bossHit'), [1]);
  assert.equal(all(evs, 'great').length, 1, '깎은 칸이 아니라 맞힌 능력으로 가른다');
  assert.ok(last.win);
  const g = toArena(14, 'grass');
  g.boss.nextAt = 1e12;
  g.ability = 'elec';
  ssokRight(g, g.last);
  evs = play(g, 100);
  assert.deepEqual(all(evs, 'bossHit'), [BOSS.move]);
  assert.deepEqual(all(evs, 'great'), [], '풀밭 큰 메카는 배지 없음');
});

test('🚢 바다 보스 (v440): 별만으로 15초 안에 이김 · ⚡만으로 더 빨리(맞힐 때마다 굉장) · 안 누르면 도망 — 깎은 만큼만 ⭐ · 셋째마다 못 빨아들이는 큰 것 · 멈춤에 처음 체력은 안 밀림', () => {
  const s = toArena(8);
  const s0 = s.score;
  play(s, BOSS.ms + 2000, (x, t) => {
    dodge(x, t);
    if (x.mouth) { if (x.sucking) ssokRightUp(x, t); else ssokRight(x, t); return; }
    if (!x.sucking) ssokRight(x, t);
  });
  assert.ok(s.win && s.doneAt - s.boss.t0 < 15000, `별만 · ${Math.round((s.doneAt - s.boss.t0) / 100) / 10}초`);
  assert.equal(s.score - s0, BOSS.win + Math.floor((s.boss.until - s.doneAt) / BOSS.bonusMs));
  const e = toArena(9);
  e.ability = 'elec';
  const evs = play(e, BOSS.ms + 2000, (x, t) => { dodge(x, t); if (t >= x.cdUntil && x.ability) { ssokRight(x, t); ssokRightUp(x, t); } });
  assert.ok(e.win && e.doneAt - e.boss.t0 < 9000, `⚡ · ${Math.round((e.doneAt - e.boss.t0) / 100) / 10}초`);
  assert.ok(all(evs, 'great').length >= 3 && all(evs, 'great').every((x) => x.by === 'elec'));
  assert.equal(e.bossDmg, BOSS.hp, '×2여도 깎은 칸은 체력만큼');
  assert.equal(e.bossPts, BOSS.win + Math.floor((e.boss.until - e.doneAt) / BOSS.bonusMs), '⚡로 이겨도 보스 몫은 ⭐10 + 빨리 이긴 덤 그대로(굉장으로 더 받지 않는다)');
  const n = toArena(10);
  const before = n.score;
  const ne = play(n, BOSS.ms + 2000);
  assert.ok(n.fled && !n.win);
  assert.equal(n.score - before, n.bossDmg);
  assert.deepEqual(all(ne, 'thrown').slice(0, 6).map((r) => r.kind), ['bolt', 'bolt', 'ball', 'bolt', 'bolt', 'ball']);
  const m = toArena(11);
  const max = m.boss.max;
  ssokShift(m, 5000);
  assert.equal(m.boss.max, max);
});

test('🧪 땅 보스 수치 길 (v440 — 🌋 화산부터 쓰는 길을 가짜 수치로): 체력·시간·첫 굴림·빠르기·사이·이긴 몫을 모두 stage.boss에서 읽는다', () => {
  const B2 = { ...BOSS, hp: 6, win: 7, ms: 15000, first: 500, every: 900, roll: 30, bonusMs: 4000, sup: [] };
  const mk = (seed) => {
    const s = ssokStart(0, seeded(seed), ['row'], 'sea');
    s.stage.boss = B2;
    s.mechas = []; s.drones = []; s.volts = []; s.fruits = []; s.blocks = [];
    s.x = s.stage.arenaX + ME.screen - 2;
    play(s, 300);
    assert.ok(s.boss);
    return s;
  };
  const a = mk(31);
  assert.deepEqual([a.boss.hp, a.boss.max, a.boss.until - a.boss.t0, a.boss.nextAt - a.boss.t0], [6, 6, 15000, 500]);
  const evs = play(a, 1500);
  const th = all(evs, 'thrown');
  assert.ok(th.length >= 2 && th.every((r) => r.vx === -30), '굴러오는 빠르기');
  assert.equal(a.boss.nextAt - a.boss.t0, 500 + 900 * a.boss.seq, '굴리는 사이');
  const b = mk(32);
  b.boss.nextAt = 1e12;
  b.ability = 'fire';
  play(b, B2.ms, (x, t) => { if (t >= x.cdUntil && x.ability) { ssokRight(x, t); ssokRightUp(x, t); } });
  assert.ok(b.win && b.bossDmg === 6);
  assert.equal(b.bossPts, 7 + Math.floor((b.boss.until - b.doneAt) / 4000), '이긴 몫 = 땅 보스 win + 땅 보스 bonusMs마다');
  const c = mk(33);
  c.boss.nextAt = 1e12;
  play(c, 20000);
  assert.ok(c.fled && c.doneAt - c.boss.t0 >= 15000 && c.doneAt - c.boss.t0 < 15100, '땅 보스 시간에 도망');
});

// ───────────────────── 🤝 친구 ─────────────────────
test('🤝 친구 (v440): 바다는 물 타입 친구를 먼저 셋 · 모자라면 나머지에서 · 안 넘기면 v373과 같은 친구·같은 rng 수', () => {
  const water = ssokWorld('sea').friendIds;
  for (let s = 1; s <= 300; s++) {
    const f = ssokFriendPick(seeded(s), 3, water);
    assert.equal(f.length, 3);
    assert.equal(new Set(f.map((x) => x.id)).size, 3);
    assert.ok(f.every((x) => water.includes(x.id)), `씨앗 ${s}`);
  }
  const few = ssokFriendPick(seeded(5), 3, [7]);
  assert.equal(few[0].id, 7);
  assert.equal(new Set(few.map((x) => x.id)).size, 3);
  for (let s = 1; s <= 50; s++) {
    let n1 = 0;
    let n2 = 0;
    const r1 = seeded(s);
    const r2 = seeded(s);
    const a = ssokFriendPick(() => { n1 += 1; return r1(); });
    const b = ssokFriendPick(() => { n2 += 1; return r2(); }, 3, []);
    assert.deepEqual(a, b);
    assert.equal(n1, 3);
    assert.equal(n2, 3);
  }
});

// ───────────────────── 진행 (순수) ─────────────────────
test('🔓 진행 (v440): 처음엔 풀밭만 · 옛 쏙쏙 기록이 있으면 바다가 열림(🆕 🌊) · 표지가 생긴 뒤엔 옛 기록으로 안 읽음 · 다 가 봤으면 돌림 · 깨진 값은 0', () => {
  assert.deepEqual(ssokProgress(undefined), { grass: 0, sea: 0 });
  assert.deepEqual(ssokOpen(ssokProgress({})), ['grass']);
  assert.equal(ssokPickLand(ssokProgress({})), 'grass');
  assert.equal(ssokFresh(ssokProgress({})), '', '풀밭엔 🆕를 안 단다');
  const old = ssokProgress({ ssokh: 37 });
  assert.deepEqual(old, { grass: 1, sea: 0 }, '옛 기록 = 풀밭 끝까지');
  assert.deepEqual(ssokOpen(old), ['grass', 'sea']);
  assert.equal(ssokPickLand(old, 0), 'sea', '안 가 본 열린 땅 먼저');
  assert.equal(ssokPickLand(old, 1), 'sea');
  assert.equal(ssokFresh(old), '🆕 🌊');
  assert.deepEqual(ssokProgress({ ssokh: 37, [SSOK_MARK]: 1 }), { grass: 0, sea: 0 }, '표지 뒤 ssokh는 ✕ 판 점수일 수 있다');
  const both = ssokProgress({ ssokgrass: 2, ssoksea: 1 });
  assert.equal(ssokFresh(both), '');
  assert.deepEqual([0, 1, 2, 3].map((n) => ssokPickLand(both, n)), ['grass', 'sea', 'grass', 'sea'], '다 가 봤으면 돌아가며');
  assert.equal(ssokPickLand(both, -1), 'grass');
  assert.equal(ssokPickLand(both, NaN), 'grass');
  assert.deepEqual(ssokProgress({ ssokgrass: 7, ssoksea: '2' }), { grass: 2, sea: 0 });
  assert.deepEqual(ssokProgress({ ssokgrass: 1.5, ssoksea: -1 }), { grass: 0, sea: 0 });
  assert.deepEqual(ssokOpen({ grass: 0, sea: 2 }), ['grass'], '앞 땅을 안 했으면 뒤 땅은 안 열림');
  assert.equal(ssokTurn('2026-11-26', 3), Math.floor(Date.UTC(2026, 10, 26) / 864e5) + 3);
  assert.equal(ssokTurn('깨짐', 4), 4);
  assert.equal(ssokTurn('2026-11-26', -2), Math.floor(Date.UTC(2026, 10, 26) / 864e5));
});

test('🔓 진행 적기 ssokLandRule (v440): 옛 기록을 풀밭 열쇠로 옮기고 표지 · 늘기만 · ✕ 판(null)은 표지만 · 새로 열린 땅 · 모르는 값은 무시 · 열쇠는 저장 꼴에 맞고 병합은 큰 쪽', () => {
  let r = ssokLandRule({ ssokh: 37, digh: 9 }, { id: 'sea', v: 2 });
  assert.deepEqual(r.best, { ssokh: 37, digh: 9, ssokgrass: 1, [SSOK_MARK]: 1, ssoksea: 2 });
  assert.deepEqual(r.land, { id: 'sea', prev: 0, now: 2, opened: null });
  assert.ok(r.changed);
  r = ssokLandRule({}, null);
  assert.deepEqual(r, { best: { [SSOK_MARK]: 1 }, changed: true, land: null }, '새 프로필 첫 판을 ✕ — 표지만(풀밭은 안 열림)');
  assert.deepEqual(ssokProgress({ ...r.best, ssokh: 3 }), { grass: 0, sea: 0 });
  r = ssokLandRule({ [SSOK_MARK]: 1 }, { id: 'grass', v: 1 });
  assert.deepEqual(r.land, { id: 'grass', prev: 0, now: 1, opened: 'sea' }, '풀밭을 처음 끝까지 → 바다가 열렸다');
  r = ssokLandRule(r.best, { id: 'grass', v: 2 });
  assert.deepEqual(r.land, { id: 'grass', prev: 1, now: 2, opened: null });
  r = ssokLandRule(r.best, { id: 'grass', v: 1 });
  assert.ok(!r.changed && r.best.ssokgrass === 2, '늘기만 한다');
  for (const bad of [{ id: 'moon', v: 2 }, { id: 'sea', v: 3 }, { id: 'sea', v: '2' }, 'sea', 7]) {
    const x = ssokLandRule({ [SSOK_MARK]: 1 }, bad);
    assert.deepEqual([x.changed, x.land, x.best], [false, null, { [SSOK_MARK]: 1 }], JSON.stringify(bad));
  }
  const keys = Object.keys(ssokLandRule({ ssokh: 1 }, { id: 'sea', v: 1 }).best);
  assert.ok(keys.every((k) => GAME_KEY.test(k)), keys.join());
  // 옛 기록이 있는 채로 첫 v440 판을 ✕로 그만둠 — 표지와 함께 풀밭을 옮겨야 바다가 계속 열려 있다(표지가 있는 까닭)
  r = ssokLandRule({ ssokh: 37 }, null);
  assert.deepEqual(r.best, { ssokh: 37, ssokgrass: 1, [SSOK_MARK]: 1 });
  assert.deepEqual(ssokProgress(r.best), { grass: 1, sea: 0 });
  assert.equal(r.land, null);
  const kept = playOf({ best: { ssokgrass: 2, ssoksea: 1, [SSOK_MARK]: 1 } }).best;
  assert.deepEqual(kept, { ssokgrass: 2, ssoksea: 1, [SSOK_MARK]: 1 }, '저장 꼴(playOf)이 버리지 않는다');
  assert.deepEqual(mergePlay({ best: { ssoksea: 1, ssokgrass: 2 } }, { best: { ssoksea: 2, ssokgrass: 1 } }).best, { ssoksea: 2, ssokgrass: 2 }, '두 기기 병합 = 큰 쪽');
});

test('🔢 최고 기록 칸 수 (v440 — 40 → 80): 쉬울 때 열쇠(v351 전 게임 15) + 새 난이도 열쇠 + 여섯 땅 열쇠 + 표지를 다 채워도 넉넉하고 하나도 안 잘림', () => {
  const PLANNED = ['grass', 'sea', 'fire', 'mt', 'sky', 'base']; // 기본안 여섯 땅(v441~v444는 아직 표에 없음)
  const easy = GAMES.filter((g) => g.id !== 'ssok').map((g) => g.id); // 쉬울 때 열쇠는 v351 전 게임만(쏙쏙은 v373)
  assert.equal(easy.length, 15);
  const keys = [...easy, ...GAMES.map((g) => recKey(g.id)), ...PLANNED.map(landKey), SSOK_MARK];
  assert.equal(new Set(keys).size, keys.length, '열쇠가 겹치지 않는다');
  assert.ok(keys.every((k) => GAME_KEY.test(k)));
  assert.ok(keys.length + 20 <= BEST_KEYS_MAX, `${keys.length}칸 + 게임 20개 여유 ≤ ${BEST_KEYS_MAX}`);
  const best = Object.fromEntries(keys.map((k, i) => [k, i + 1]));
  assert.deepEqual(playOf({ best }).best, best, '저장 꼴이 하나도 안 버린다');
  const many = Object.fromEntries(Array.from({ length: BEST_KEYS_MAX + 5 }, (_, i) => [`k${String.fromCharCode(97 + Math.floor(i / 26))}${String.fromCharCode(97 + (i % 26))}`, 1]));
  assert.equal(Object.keys(playOf({ best: many }).best).length, BEST_KEYS_MAX, '한도를 넘으면 그만큼만');
});

test('🏅 끝 화면 한 줄 (v440): 「🌊 바다 🏅!」 · 「🌊 바다가 열렸어요!」(받침에 맞춰 이/가) · 둘 다면 「 · 」 · 셈 글 없음', () => {
  assert.equal(ssokEndLine('sea', true), '🌊 바다 🏅!');
  assert.equal(ssokEndLine('sea', false), '');
  assert.equal(ssokEndLine('grass', true, 'sea'), '🌿 풀밭 🏅! · 🌊 바다가 열렸어요!');
  assert.equal(ssokEndLine('grass', false, 'sea'), '🌊 바다가 열렸어요!');
  assert.equal(ssokEndLine('moon', true, 'moon'), '');
  for (const w of SSOK_WORLDS) for (const o of [null, 'sea']) for (const win of [true, false]) assert.ok(!/\d|남은|몇 번|다음은|\//.test(ssokEndLine(w.id, win, o)), '아이 화면에 셈 글 금지');
  assert.ok(!/\d/.test(ssokFresh({ grass: 1, sea: 0 }).replace('🆕', '')));
});

// ───────────────────── 저장 (같은 트랜잭션) ─────────────────────
const R = FIRST_ROOM;
const T = 1_700_000_000_000;
const FROG = 658;
const pf = (extra = {}) => cloneProfile({
  ...emptyProfile(), coins: 500, items: { f_tv: 1, f_game: 1 }, caught: { [FROG]: 1 }, partner: FROG,
  house: { started: true, seq: 20, rooms: [{ id: R, wall: '', floor: '', items: [{ u: 1, id: 'f_tv', x: 3, y: 2 }, { u: 2, id: 'f_game', x: 5, y: 0 }] }] },
  avatar: { made: true, gifted: true, look: { ...LOOK_BASE }, name: '', spot: { room: R, x: 6, y: 5 }, at: T }, ...extra,
});
test('💾 gameEndRule (v440): 쏙쏙 판만 땅 열쇠 · 최고 기록보다 낮은 점수여도 땅은 적힘 · 다른 게임은 안 만듦 · 게임기가 없으면 아무것도 안 적힘', () => {
  const p = pf({ homePlay: { days: {}, bond: {}, best: { ssokh: 37 } } });
  const r = gameEndRule(p, R, 2, 'ssok', 30, T, 0, { id: 'sea', v: 2 });
  assert.ok(r.ok && !r.newBest);
  assert.deepEqual(r.land, { id: 'sea', prev: 0, now: 2, opened: null });
  assert.deepEqual(p.homePlay.best, { ssokh: 37, ssokgrass: 1, [SSOK_MARK]: 1, ssoksea: 2 });
  const q = pf();
  const rq = gameEndRule(q, R, 2, 'ssok', 0, T, 0, null);
  assert.ok(rq.ok && rq.land === null);
  assert.deepEqual(q.homePlay.best, { [SSOK_MARK]: 1 }, '✕ 판 — 표지만');
  const d = pf();
  const rd = gameEndRule(d, R, 2, 'dig', 12, T, 0, { id: 'sea', v: 2 });
  assert.ok(rd.ok && !('land' in rd));
  assert.deepEqual(d.homePlay.best, { digh: 12 }, '다른 게임은 땅 열쇠를 안 만든다');
  const g = pf({ homePlay: { days: {}, bond: {}, best: { ssokh: 37 } } });
  assert.equal(gameEndRule(g, R, 9, 'ssok', 30, T, 0, { id: 'sea', v: 2 }).why, 'gone');
  assert.deepEqual(g.homePlay.best, { ssokh: 37 });
  // 새 프로필이 풀밭을 처음 끝까지 — 이번 판 점수(ssokh)를 적기 전의 best로 셈해야 「바다가 열렸다」가 맞다
  const n = pf();
  const rn = gameEndRule(n, R, 2, 'ssok', 20, T, 0, { id: 'grass', v: 1 });
  assert.deepEqual(rn.land, { id: 'grass', prev: 0, now: 1, opened: 'sea' });
  assert.deepEqual(n.homePlay.best, { [SSOK_MARK]: 1, ssokgrass: 1, ssokh: 20 });
  // 옛 기록이 있는 진우가 첫 v440 판을 ✕로 그만둠 — 최고 기록보다 높은 점수여도 풀밭은 옮겨 두고 바다는 그대로 열림
  const j = pf({ homePlay: { days: {}, bond: {}, best: { ssokh: 37 } } });
  const rj = gameEndRule(j, R, 2, 'ssok', 99, T, 0, null);
  assert.ok(rj.ok && rj.newBest && rj.land === null);
  assert.deepEqual(j.homePlay.best, { ssokh: 99, ssokgrass: 1, [SSOK_MARK]: 1 });
  assert.deepEqual(ssokProgress(j.homePlay.best), { grass: 1, sea: 0 });
});

const stored = () => fakeIdb.get('profile', 'me');
test('★ 💾 저장 경로 (v440): gameEnd가 땅 열쇠를 저장된 프로필에 · 두 창이 동시에 끝내도 큰 쪽 · 저장이 실패하면 없던 일 · 카드·땅 고르기는 저장된 진행으로', async () => {
  await initProfile();
  await flushProfile();
  const cur = stored() || emptyProfile();
  fakeIdb.put('profile', { ...pf({ homePlay: { days: {}, bond: {}, best: { ssokh: 40 } } }), updatedAt: (cur.updatedAt || 0) + 1 });
  await reloadProfile();
  assert.deepEqual(ssokLandsNow(), { grass: 1, sea: 0 }, '옛 기록 → 풀밭 끝까지');
  const rs = await Promise.all([gameEnd(R, 2, 'ssok', 20, 0, { id: 'sea', v: 1 }), gameEnd(R, 2, 'ssok', 25, 0, { id: 'sea', v: 2 })]);
  assert.ok(rs.every((x) => x.ok));
  const best = stored().homePlay.best;
  assert.deepEqual([best.ssokh, best.ssokgrass, best[SSOK_MARK], best.ssoksea], [40, 1, 1, 2]);
  assert.deepEqual(ssokLandsNow(), { grass: 1, sea: 2 }, '창의 프로필도');
  const s0 = stored();
  fakeIdb.failNext('profile');
  const f = await gameEnd(R, 2, 'ssok', 99, 0, { id: 'grass', v: 2 });
  assert.deepEqual(f, { ok: false, why: 'save' });
  assert.deepEqual(stored().homePlay, s0.homePlay);
});

// ───────────────────── 📤 하루 기록 ─────────────────────
test('📤 하루 칸 (v440): 끝까지 한 판·🏅 판(더하기·백업은 큰 쪽) · 다녀온 땅·🏅 땅(합집합) · 📤 한 줄은 🎮 게임 줄 뒤 · 안 한 날은 없음 · 읽는 법 한 줄', () => {
  const D = '2026-11-26';
  const e = emptyDaily(D);
  for (const k of SSOK_DAILY) assert.equal(e[k], 0, k);
  assert.equal(ssokDayDelta(null), null);
  assert.equal(ssokDayDelta({ id: 'moon', v: 2 }), null);
  assert.deepEqual(ssokDayDelta({ id: 'sea', v: 1 }), { ssokPlays: 1, ssokLands: ['sea'] });
  let d = mergeDailyDelta(e, D, ssokDayDelta({ id: 'sea', v: 2 }));
  d = mergeDailyDelta(d, D, ssokDayDelta({ id: 'grass', v: 1 }));
  d = mergeDailyDelta(d, D, ssokDayDelta({ id: 'sea', v: 2 }));
  assert.deepEqual([d.ssokPlays, d.ssokWins, d.ssokLands, d.ssokMedals], [3, 2, ['sea', 'grass'], ['sea']]);
  assert.equal(ssokDayLine(d), '🌀 쏙쏙 3판(🏅 2) · 다녀온 땅 🌿🌊 · 🏅 🌊', '땅은 표 차례');
  const m = mergeStatRecord('daily', { ...e, ssokPlays: 2, ssokWins: 0, ssokLands: ['grass'] }, { ...e, ssokPlays: 1, ssokWins: 1, ssokLands: ['sea'], ssokMedals: ['sea'] });
  assert.deepEqual([m.ssokPlays, m.ssokWins, [...m.ssokLands].sort(), m.ssokMedals], [2, 1, ['grass', 'sea'], ['sea']]);
  assert.equal(ssokDayLine(e), '');
  assert.equal(ssokDayLine({ ssokPlays: '3', ssokLands: 'sea' }), '');
  assert.equal(ssokDayLine({ ssokPlays: 1, ssokLands: ['moon', 'sea'] }), '🌀 쏙쏙 1판(🏅 0) · 다녀온 땅 🌊');
  assert.deepEqual([...SSOK_DAILY, ...SSOK_DAY_LISTS], ['ssokPlays', 'ssokWins', 'ssokLands', 'ssokMedals']);
  const days = [{ ...d, gamePlays: 4 }, { ...emptyDaily('2026-11-25'), gamePlays: 2 }];
  const txt = usageFiles(days, D, PLACES)[0].text;
  assert.ok(txt.includes('🎮 게임 4판 · 🌀 쏙쏙 3판(🏅 2) · 다녀온 땅 🌿🌊 · 🏅 🌊'), txt.split('\n').find((l) => l.startsWith('- 11-26')));
  assert.ok(!txt.split('\n').find((l) => l.startsWith('- 11-25')).includes('🌀'), '안 한 날은 쏙쏙 줄 없음');
  assert.ok(txt.includes('- 🌀 쏙쏙 = 게임기 🌀 쏙쏙! 파트너 모험을 끝까지 한 판'));
});

// ───────────────────── 화면 (가짜 DOM · 가짜 시계 — gamessok373 본뜸) ─────────────────────
class FakeEl {
  constructor(tag) { this.tagName = String(tag).toUpperCase(); this.className = ''; this.children = []; this.listeners = {}; this.style = {}; this.attrs = {}; this.dataset = {}; this.textContent = ''; this.html = ''; }
  get classList() {
    const list = () => this.className.split(/\s+/).filter(Boolean);
    const set = (a) => { this.className = a.join(' '); };
    return {
      add: (...c) => set([...new Set([...list(), ...c])]),
      remove: (...c) => set(list().filter((x) => !c.includes(x))),
      toggle: (c, on) => { const want = on === undefined ? !list().includes(c) : !!on; set(want ? [...new Set([...list(), c])] : list().filter((x) => x !== c)); return want; },
      contains: (c) => list().includes(c),
    };
  }
  set innerHTML(v) { this.html = String(v); this.children = []; }
  get innerHTML() { return this.html; }
  get offsetWidth() { return 100; }
  appendChild(c) { this.children.push(c); c.parent = this; return c; }
  append(...cs) { for (const c of cs) this.appendChild(c); }
  setAttribute(k, v) { this.attrs[k] = v; }
  addEventListener(type, f) { (this.listeners[type] ||= []).push(f); }
  fire(type, extra = {}) { for (const f of this.listeners[type] || []) f({ preventDefault() {}, ...extra }); }
  getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 64 }; }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((x) => x !== this); }
}
const find = (e, cls, out = []) => { for (const c of e.children) { if (c.className.split(/\s+/).includes(cls)) out.push(c); find(c, cls, out); } return out; };
function screen(t, o = {}) {
  const doc = { hidden: false, listeners: {}, createElement: (tag) => new FakeEl(tag),
    addEventListener(type, f) { (this.listeners[type] ||= []).push(f); },
    removeEventListener(type, f) { this.listeners[type] = (this.listeners[type] || []).filter((x) => x !== f); },
    fire(type, e) { for (const f of [...(this.listeners[type] || [])]) f(e); } };
  let clock = 1000;
  const realPerf = globalThis.performance;
  Object.defineProperty(globalThis, 'performance', { value: { now: () => clock }, configurable: true, writable: true });
  globalThis.document = doc;
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  t.after(() => { Object.defineProperty(globalThis, 'performance', { value: realPerf, configurable: true, writable: true }); delete globalThis.document; });
  const stage = new FakeEl('div');
  const h = runSsok(stage, { rng: seeded(21), hero: { html: '<img class="gd-pal-img">' }, ...o });
  const st = { over: null };
  h.done.then((r) => { st.over = r; });
  const adv = (ms) => { for (let k = 0; k < ms; k += 50) { clock += 50; t.mock.timers.tick(50); } };
  const flush = () => new Promise((r) => setImmediate(r));
  const root = stage.children[0];
  const field = root.children[1];
  const down = (side, id) => field.fire('pointerdown', { pointerId: id, clientX: side === 'L' ? 20 : 80 });
  const up = (id) => doc.fire('pointerup', { pointerId: id });
  return { stage, root, field, h, doc, adv, flush, st, down, up };
}

test('🖥️ 🌊 바다 화면 (v440): 마당 is-w-sea · 「준비!」 밑 「🌊 바다」 · 길·체력 막대 끝 🚢 · 잠수 헬멧 메카·잠수함·💧 배지 · 차례는 그대로 · 판 도중 ✕는 땅 셈 없음', async (t) => {
  const w = screen(t, { world: 'sea' });
  const [top, field, , , banner] = w.root.children;
  assert.ok(field.classList.contains('is-w-sea') && field.classList.contains('gs-field'));
  assert.equal(banner.textContent, '준비!');
  assert.deepEqual(banner.children.map((c) => [c.className, c.textContent]), [['gs-land', '🌊 바다']]);
  assert.equal(top.children[3].children[1].textContent, '🚢', '길 막대 끝');
  assert.equal(top.children[4].children[1].textContent, '🚢', '체력 막대 끝');
  w.adv(900);
  const wld = field.children[2];
  const boss = find(wld, 'gs-boss')[0];
  assert.ok(boss.innerHTML.includes('M47 18V6h-8'), '🚢 잠수함 그림');
  const badge = find(boss, 'gs-boss-type')[0];
  assert.ok(badge && badge.textContent === '💧' && badge.classList.contains('is-t-water'));
  assert.deepEqual([badge.style.left, badge.style.top], ['30%', '69%']);
  const mechas = find(wld, 'gs-mecha');
  assert.ok(mechas.length > 0 && mechas.every((m) => m.innerHTML.includes('#c9a227')), '잠수 헬멧 메카');
  const drones = find(wld, 'gs-drone');
  assert.ok(drones.length > 0 && drones.every((m) => m.innerHTML.includes('M2 12h36l-6 9H8z')), 'R 보트 드론');
  assert.ok(find(wld, 'ga-ground').length > 0 && find(wld, 'gs-me').length === 1);
  w.h.stop();
  await w.flush();
  assert.deepEqual([w.st.over.quit, w.st.over.world, w.st.over.win, w.st.over.land, w.st.over.line], [true, 'sea', false, null, '']);
});

test('🖥️ 🌊 바다 덤불 자리 = 잔교 말뚝 (v440): 덤불이 나오는 씨앗으로 — 그림만 바뀌고 🔥로 태우는 것은 그대로', async (t) => {
  let k = 1;
  while (!ssokStage(seeded(k), null, 'sea').blocks.some((b) => b.kind === 'bush') && k < 300) k += 1;
  assert.ok(k < 300, '덤불이 나오는 바다 씨앗');
  const w = screen(t, { world: 'sea', rng: seeded(k) });
  w.adv(900);
  const bush = find(w.field.children[2], 'gs-block').filter((e) => e.classList.contains('is-bush'));
  assert.ok(bush.length > 0 && bush.every((e) => e.innerHTML.includes('rx="10" ry="3.5"')), `씨앗 ${k} 잔교 말뚝`);
  w.h.stop();
  await w.flush();
});

test('🖥️ 🌿 풀밭 화면 (v440): 그림·글은 v373 그대로(🤖 · 대모험 메카 · 배지 없음) — 땅 이름만 「준비!」 밑에', async (t) => {
  const w = screen(t);
  const [top, field, , , banner] = w.root.children;
  assert.ok(field.classList.contains('is-w-grass'));
  assert.equal(banner.textContent, '준비!');
  assert.equal(banner.children[0].textContent, '🌿 풀밭');
  assert.equal(top.children[3].children[1].textContent, '🤖');
  assert.equal(top.children[4].children[1].textContent, '🤖');
  w.adv(900);
  const wld = field.children[2];
  const boss = find(wld, 'gs-boss')[0];
  assert.equal(find(boss, 'gs-boss-type').length, 0);
  assert.ok(find(wld, 'gs-mecha').length > 0 && find(wld, 'gs-mecha').every((m) => m.innerHTML === ADV_DRAW.mecha));
  w.h.stop();
  await w.flush();
  assert.equal(w.st.over.world, 'grass');
});

test('🖥️ 끝까지 한 판 (v440): ⚡로 💧 보스를 이기면 「효과가 굉장했다!」 · 결과 land { sea, 2 } · 한 줄 「🌊 바다 🏅!」 · 도망간 판은 land { sea, 1 }', async (t) => {
  const w = screen(t, { world: 'sea' });
  w.adv(900);
  const s = w.h.state();
  s.mechas = []; s.drones = []; s.volts = []; s.fruits = []; s.blocks = []; s.cages = []; s.mballs = [];
  s.x = s.stage.arenaX + ME.screen - 2;
  w.adv(300);
  assert.ok(s.boss);
  s.boss.nextAt = 1e12;
  s.boss.hp = 1;
  s.ability = 'elec';
  w.down('R', 5);
  w.adv(100);
  w.up(5);
  assert.ok(s.win);
  const fx = w.root.children[3];
  const great = find(fx, 'is-great').find((e) => e.textContent === '효과가 굉장했다!');
  const won = fx.children.find((e) => e.textContent.startsWith('🎉 이겼다!'));
  const bang = fx.children.find((e) => e.textContent.startsWith('쾅!'));
  assert.ok(great && won && bang, '마지막 한 방이 ⚡면 세 글이 한 걸음에');
  // 가짜 마당은 한 칸 = 1px — 굉장 글은 보스 머리 위 두 글보다 18칸 넘게 위(겹치지 않게)
  assert.ok(parseFloat(great.style.top) + 18 <= Math.min(parseFloat(won.style.top), parseFloat(bang.style.top)), `${great.style.top} · ${won.style.top} · ${bang.style.top}`);
  w.adv(3000);
  await w.flush();
  assert.deepEqual([w.st.over.quit, w.st.over.win, w.st.over.land, w.st.over.line], [false, true, { id: 'sea', v: 2 }, '🌊 바다 🏅!']);
});

test('🖥️ 도망간 판 · 끝 글 중 ✕ (v440): 끝까지 간 판이라 land { sea, 1 } · 찌리리공 대신 큰 R 부표', async (t) => {
  const w = screen(t, { world: 'sea' });
  w.adv(900);
  const s = w.h.state();
  s.mechas = []; s.drones = []; s.volts = []; s.fruits = []; s.blocks = []; s.cages = []; s.mballs = [];
  s.x = s.stage.arenaX + ME.screen - 2;
  w.adv(300);
  assert.ok(s.boss);
  const fx = w.root.children[3];
  assert.ok(fx.children.some((e) => e.textContent === '🚢 로켓단 잠수함이 나타났다!'), '바다 보스 등장 글');
  s.boss.nextAt = s.last;
  s.boss.seq = 0; // 첫 굴림 = 작은 R 깡통(빨아들임)
  w.adv(50);
  const can = find(w.field.children[2], 'gs-roller').find((e) => e.classList.contains('is-bolt'));
  assert.ok(can && can.innerHTML.includes('x="7" y="14" width="26" height="12"'), '🌊 작은 R 깡통 그림');
  s.rollers = []; // 깡통은 치우고 부표만 맞아 본다
  s.boss.nextAt = s.last;
  s.boss.seq = 2; // 셋째 = 못 빨아들이는 큰 것
  w.adv(50);
  const roll = find(w.field.children[2], 'gs-roller').find((e) => e.classList.contains('is-ball'));
  assert.ok(roll && roll.innerHTML.includes('M4 12h32'), '🌊 큰 R 부표 그림');
  s.boss.nextAt = 1e12;
  const said = [];
  for (let k = 0; k < 80 && !s.bumps; k++) { w.adv(50); for (const e of fx.children) said.push(e.textContent); }
  assert.ok(s.bumps >= 1, '부표에 꽈당');
  assert.ok(said.includes('꽈당!') && !said.some((x) => x.includes('찌릿')), `부표는 전기가 아니다: ${[...new Set(said)].join(' / ')}`);
  s.boss.until = s.last + 50;
  w.adv(1200); // 도망 → 1초 뒤 끝 글
  w.h.stop(); // 끝 글을 보는 동안 ✕
  await w.flush();
  assert.deepEqual([w.st.over.quit, w.st.over.win, w.st.over.land, w.st.over.line], [false, false, { id: 'sea', v: 1 }, '']);
});

test('🖥️ 보스 쪽을 보는 1초 안의 ✕ (v440): quit이어도 끝까지 간 판 — land { sea, 1 } (판 도중 ✕만 진행에 안 셈)', async (t) => {
  const w = screen(t, { world: 'sea' });
  w.adv(900);
  const s = w.h.state();
  s.mechas = []; s.drones = []; s.volts = []; s.fruits = []; s.blocks = []; s.cages = []; s.mballs = [];
  s.x = s.stage.arenaX + ME.screen - 2;
  w.adv(300);
  s.boss.nextAt = 1e12;
  s.boss.until = s.last + 50;
  w.adv(400); // 도망 — 끝 글(1초 뒤) 전에
  assert.ok(s.fled);
  w.h.stop();
  await w.flush();
  assert.deepEqual([w.st.over.quit, w.st.over.land], [true, { id: 'sea', v: 1 }]);
});

// ───────────────────── 잇기 (출처 글) ─────────────────────
test('🔗 잇기 (v440): sw 목록 · 판 번호 · 게임기가 땅을 prep으로 · 카드 🆕는 이름 칸 밖 · 판은 한 곳에서만 씀 · 바다 CSS는 .gs-field.is-w-sea 안 · 대모험 마당 그대로', () => {
  const sw = read('sw.js');
  assert.ok(sw.includes("'./js/ssokworld.js'"));
  const swv = Number((sw.match(/const CACHE_VERSION = 'v(\d+)';/) || [])[1]);
  const apv = Number((read('js/version.js').match(/export const APP_VERSION = 'v(\d+)';/) || [])[1]);
  assert.ok(swv >= 440 && swv === apv, `판 ${swv} · ${apv}`);
  const gv = read('js/gameview.js');
  assert.equal((gv.match(/await claimDailyCount\(/g) || []).length, 1);
  assert.match(gv, /async function ssokPrep\(\) \{\n\s+const W = ssokWorld\(ssokPickLand\(ssokLandsNow\(\), ssokTurn\(clockDay\(\), Number\(\(todayDaily\(\) \|\| \{\}\)\.gamePlays\) \|\| 0\)\)\);\n\s+const friends = ssokFriendPick\(Math\.random, FRIEND_MAX, W\.friendIds\);/, '땅 고르기 = 날짜 + 오늘 판 수 · 친구는 그 땅 타입 먼저');
  assert.match(gv, /else sum\.why = \(end && end\.why\) \|\| 'save';\n\s+if \(id === 'ssok' && !\(end && end\.ok\)\) res\.line = '';/, '저장 안 된 판엔 🏅·열림 줄 없음');
  assert.ok(gv.includes("return { art, friends: friends.map((f) => ({ ...f, art: art[f.id] || null })), world: W.id };"));
  assert.match(gv, /if \(rec\.easy\) txt\.appendChild\(el\('span', 'gm-game-easy', rec\.easy\)\);[^\n]*\n\s+if \(g\.id === 'ssok'\) \{ const fresh = ssokFresh\(ssokLandsNow\(\)\); if \(fresh\) txt\.appendChild\(el\('span', 'gm-game-new', fresh\)\); \}/);
  assert.match(gv, /if \(id === 'ssok' && end && end\.ok\) \{[^\n]*\n\s+const dd = ssokDayDelta\(res\.land\);\n\s+if \(dd\) \{ try \{ const d = await applyDailyDelta\(day, dd\); if \(d\) adoptDaily\(d\); \} catch \{[^\n]*\n\s+if \(end\.land && end\.land\.opened\) res\.line = ssokEndLine\(res\.world, res\.win, end\.land\.opened\);\n\s+\}\n\s+if \(!live\(\)\) return;/);
  assert.ok(read('js/xp.js').includes('return houseDo((p) => gameEndRule(p, roomId, u, gameId, score, Date.now(), sec, land));'));
  const css = read('css/style.css');
  assert.match(css, /\.gs-field\.is-w-sea \{ background-color: #a5d8ff; background-image: linear-gradient\(180deg, #3d8fe0 0%/);
  assert.match(css, /\.ga-field \{[^}]*#343a40 87\.5%/, '🗺️ 대모험 마당은 그대로');
  assert.ok(!/^\.ga-(far|near|ground|solid) \{[^}]*sea/m.test(css));
  assert.match(read('js/homeplay.js'), /if \(newBest \|\| newFast \|\| \(lr && lr\.changed\)\) profile\.homePlay = hp;/);
});
