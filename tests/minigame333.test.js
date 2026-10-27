// 🎮 게임기 미니 게임 아홉째 (v333 · 2026-10-25 아버님 "슈퍼마리오 같은 게임" → 기본안 "이대로") — node --test tests/minigame333.test.js
// 🗺️ 파트너 대모험: 저절로 달리고 화면이 따라간다 · 톡 낮게·꾹 높이 · 🤖 메카 밟기 · ⚡ 찌리리공 피하기 · ❓ 머리로 쿵 · 🕳️ 피죤이 건너편에 · 🚩 깃대 높이만큼 ⭐
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GAMES, gameById } from '../js/minigame.js';
import {
  ADV_SEC, ADV_W, ADV_H, GROUND, ME, RUN_V, GRAVITY, JUMP_V, CUT_V, MIN_HOLD_MS, SHORT_V, COYOTE_MS, BUFFER_MS,
  STUMBLE_MS, RESCUE_MS, HELP_MS, STAR_MS, BOUNCE_V, MAX_MS, ADV_KINDS, Q_Y, POLE_H, FLAG_STEP, START_LEN, CHUNK_N, START_X, ADV_ART,
  CHUNKS, chunkLevel, advStage, advStart, advCam, flagPoints, advTick, advPress, advRelease, advShift, ART, runAdv,
} from '../js/gameadv.js';
import { ROSTER } from '../js/pokemon.js';

const src = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
function seeded(seed = 7) {
  let x = seed >>> 0;
  return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 2 ** 32; };
}
const SEEDS = Array.from({ length: 200 }, (_, i) => i + 1);

/** 잘하는 손 — 앞에 오는 것을 보고 누르고 뗀다 (구덩이는 앞발이 넘어간 뒤 · 막는 것은 5칸 앞 · 찌리리공 2칸 · 메카 6칸 · 끝 계단 꼭대기에서 높이) */
function bot(s, t, st) {
  const f = s.x + ME.w - 1; // 막는 몸의 앞 (엔진과 같게 — 양옆 1칸 안쪽)
  if (st.releaseAt && t >= st.releaseAt) { advRelease(s, t); st.releaseAt = 0; }
  if (!s.onGround || t < s.stumbleUntil || t < s.rescueUntil) return;
  const press = (holdMs) => { if (advPress(s, t) === 'jump') st.releaseAt = t + holdMs; };
  for (const [a] of s.stage.pits) if (f >= a + 3 && s.x + 1 < a) return press(400);
  for (const b of s.stage.solids) {
    const d = b.x - f;
    if (b.top > s.y + 0.01 && d >= 0 && d <= 5) return press(b.top - s.y > 8 ? 400 : 60);
  }
  for (const v of s.volts) { const d = v.x - f; if (d > -1 && d <= 2) return press(400); }
  for (const m of s.mechas) { const d = m.x - f; if (d > 0 && d <= 6) return press(400); }
  // 머리 위 열매 — 낮으면 톡, 높으면 꾹
  for (const o of s.fruits) { const d = o.x - f; if (o.y > s.y + ME.h - 1 && d >= 1 && d <= 3) return press(o.y - s.y > 12 ? 400 : 60); }
  const last = s.stage.solids[s.stage.solids.length - 1];
  if (Math.abs(s.y - last.top) < 0.01 && last.x + last.w - s.x <= 4) press(400);
}
/** 아무렇게나 누르는 손 — 땅에 있을 때 가끔 누르고 아무 때나 뗀다 */
function randomHand(rng) {
  return (s, t, st) => {
    if (st.releaseAt && t >= st.releaseAt) { advRelease(s, t); st.releaseAt = 0; }
    if (!st.releaseAt && rng() < 0.04 && advPress(s, t) === 'jump') st.releaseAt = t + Math.floor(rng() * 500);
  };
}
/** 한 판 끝까지 (16ms씩) — hand(s, t, st)가 누를지 정한다 · 점수는 줄지 않는다 · 계단·그루터기 속에 들어가지 않는다 */
function playAll(s, hand) {
  const st = {};
  let t = s.last;
  let prev = 0;
  while (!s.done && t < s.t0 + MAX_MS + 1000) {
    t += 16;
    advTick(s, t);
    if (hand) hand(s, t, st);
    assert.ok(s.score >= prev, '점수는 줄지 않는다');
    prev = s.score;
    // 높은 계단 옆으로 내려앉다가 그 속에 들어가 땅까지 빠지던 것(막는 몸과 발의 너비가 달랐다)
    for (const b of s.stage.solids) {
      assert.ok(!(s.x + 1 < b.x + b.w - 0.01 && s.x + ME.w - 1 > b.x + 0.01 && s.y < b.top - 0.01), `계단·그루터기 속 (${s.x.toFixed(2)}, ${s.y.toFixed(2)}) · ${b.x}+${b.w}@${b.top}`);
    }
    for (const q of s.qs) {
      assert.ok(!(s.x + 1 < q.x + q.w - 0.01 && s.x + ME.w - 1 > q.x + 0.01 && s.y < q.y + q.h - 0.01 && s.y + ME.h > q.y + 0.01), `❓ 속 (${s.x.toFixed(2)}, ${s.y.toFixed(2)})`);
    }
  }
  return s;
}
/** 가장 높이 뛴 칸 — holdMs 뒤에 뗀다 */
function hop(holdMs) {
  const s = advStart(0, seeded(1), ['row']);
  advTick(s, 100);
  assert.equal(advPress(s, 100), 'jump');
  let top = 0;
  let released = false;
  for (let t = 104; t < 1600; t += 4) {
    if (!released && t >= 100 + holdMs) { advRelease(s, t); released = true; }
    advTick(s, t);
    top = Math.max(top, s.y - GROUND);
  }
  return { top, s };
}

// ───────────────────── 목록 · 게임기 화면 연결 ─────────────────────

test('🎮 v333 게임 목록 — 아홉째 🗺️ 파트너 대모험 · 화면(RUNNERS)·준비(⚡ 찌리리공 · 🐦 피죤 그림) · 저장·가방을 안 만진다', () => {
  assert.deepEqual(GAMES.map((g) => g.id).slice(0, 9), ['dig', 'run', 'shadow', 'pair', 'berry', 'balloon', 'tower', 'tug', 'adv'], '아홉째까지 (v339부터 더 늘어난다 — minigame339)');
  const g = gameById('adv');
  assert.deepEqual([g.emoji, g.ko, g.sec], ['🗺️', '파트너 대모험', ADV_SEC]);
  assert.equal(g.how, '톡 하면 낮게 · 꾹 누르면 높이 폴짝 · 메카는 밟고 찌리리공은 피해 깃대까지');
  for (const x of GAMES) assert.ok(!/\d/.test(x.how), `${x.id}: 아이가 보는 설명에 숫자 없음`);
  assert.equal(ADV_SEC, 45, '보통 걸리는 시간 (끝은 깃대)');
  const gv = src('js/gameview.js');
  assert.match(gv, /import \{ runAdv, ADV_ART \} from '\.\/gameadv\.js';/);
  assert.match(gv, /\n {2}adv: \{ run: runAdv, prep: async \(\) => \(\{ art: await artFor\(\[ADV_ART\.volt, ADV_ART\.bird\]\) \}\) \},/);
  assert.deepEqual(ADV_ART, { volt: 100, bird: 17 });
  assert.equal(ROSTER.find((r) => r.id === 100).ko, '찌리리공');
  assert.equal(ROSTER.find((r) => r.id === 17).ko, '피죤');
  assert.ok(!/coins|addCoins|applyPurchase|items\[|itemCount|xp\.js|db\.js|pokemon\.js/.test(src('js/gameadv.js')), '저장·가방을 안 만진다');
});

test('🎮 서비스워커 v333 · 새 파일 · css (길 전체만 transform · 숨긴 피죤은 안 보임 · 길게 눌러도 메뉴 안 뜸)', () => {
  const sw = src('sw.js');
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(sw) || [])[1]) >= 333, 'sw v333 이상');
  assert.ok(sw.includes("'./js/gameadv.js'"));
  const css = src('css/style.css');
  assert.match(css, /\.ga-field \{[^}]*aspect-ratio: 100 \/ 64;[^}]*touch-action: manipulation;[^}]*-webkit-touch-callout: none;/);
  assert.match(css, /\.ga-field \{[^}]*#343a40 87\.5%/, '땅 높이(8/64) 아래는 어둡게 — 구덩이가 구멍으로 보인다');
  assert.match(css, /\.ga-world \{[^}]*will-change: transform;/);
  assert.ok(css.includes('.ga-world > [hidden] { display: none; }'), '피죤을 숨기면 정말 안 보인다(display:block에 덮이지 않게)');
  assert.ok(css.includes('.ga-me .gd-pal-img { transform: scaleX(-1); }'), '파트너는 달리는 쪽을 본다');
  assert.match(css, /@keyframes ga-bonk/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.ga\.is-go \.ga-me \.ga-me-in \{ animation: none; \}/);
});

// ───────────────────── 🗺️ 뛰기 ─────────────────────

test('🗺️ 뛰기 — 톡(손을 바로 떼도 처음 조금은 오른다) 약 12칸 · 꾹 약 18칸 · 중간에 떼면 그 사이 · 공중에서 한 번 더 없음', () => {
  assert.deepEqual([RUN_V, GRAVITY, JUMP_V, CUT_V, MIN_HOLD_MS, SHORT_V, COYOTE_MS, BUFFER_MS], [26, 360, 115, 45, 90, 85, 100, 150]);
  const tap = hop(0).top;
  const tap60 = hop(60).top;
  const mid = hop(150).top;
  const hold = hop(2000).top;
  assert.ok(tap > 10.5 && tap < 13, `톡 ${tap.toFixed(2)}`);
  assert.ok(Math.abs(tap - tap60) < 0.3, '90ms 안에 떼면 다 같다');
  assert.ok(mid > tap + 1 && mid < hold - 1, `중간 ${mid.toFixed(2)}`);
  assert.ok(Math.abs(hold - (JUMP_V * JUMP_V) / (2 * GRAVITY)) < 0.3, `꾹 ${hold.toFixed(2)}`);
  // 톡으로 ❓ 블록에 닿는다 · 서 있으면 안 닿는다
  assert.ok(GROUND + ME.h < Q_Y && GROUND + tap + ME.h > Q_Y, '❓는 서 있는 머리 위 · 톡으로 쿵');
  // 공중에서 다시 누르면 뛰지 않는다
  const s = advStart(0, seeded(1), ['row']);
  advTick(s, 50);
  advPress(s, 50);
  advTick(s, 150);
  const vy = s.vy;
  assert.equal(advPress(s, 150), 'air');
  assert.equal(s.vy, vy);
});

test('🗺️ 발판 끝에서 떨어진 바로 뒤도 뛴다(0.1초) · 내려앉기 바로 앞에 누르면 닿자마자(뗐으면 낮게) · 꽈당 동안은 안 뜀', () => {
  // 구덩이 가장자리 — 발밑이 사라진 바로 그때
  const s = advStart(0, seeded(1), ['pit']);
  const [a] = s.stage.pits[0];
  let t = 0;
  while (s.onGround) { t += 16; advTick(s, t); }
  assert.ok(s.x + 1 >= a - 0.5, '구덩이 가장자리에서 발밑이 사라졌다');
  assert.equal(advPress(s, t + COYOTE_MS - 10), 'jump', '0.1초 안');
  const s2 = advStart(0, seeded(1), ['pit']);
  t = 0;
  while (s2.onGround) { t += 16; advTick(s2, t); }
  advTick(s2, t + COYOTE_MS + 20);
  assert.equal(advPress(s2, t + COYOTE_MS + 20), 'buffer', '0.1초가 지나면 그냥 떨어지는 중(내려앉기 바로 앞으로 적어 둔다)');
  // 내려앉기 바로 앞 — 누른 채면 꾹 뛰기, 뗐으면 톡 정도
  for (const [held, v] of [[true, JUMP_V], [false, SHORT_V]]) {
    const q = advStart(0, seeded(1), ['row']);
    q.onGround = false; q.y = GROUND + 2; q.vy = -20; q.last = 1000;
    assert.equal(advPress(q, 1000), 'buffer');
    if (!held) advRelease(q, 1010);
    const ev = advTick(q, 1100);
    assert.ok(ev.jumped && q.vy > 0 && q.vy <= v, `${held ? '누른 채' : '뗌'} ${q.vy.toFixed(1)}`);
  }
  // 꽈당 동안
  const z = advStart(0, seeded(1), ['row']);
  z.stumbleUntil = 500;
  assert.equal(advPress(z, 100), 'stumble');
  assert.equal(advPress(advStart(0, seeded(1)), 0), 'jump');
});

// ───────────────────── 🗺️ 길 ─────────────────────

test('🗺️ 길 만들기 — 같은 씨앗 같은 길 · 조각 18개(처음 셋 쉬움 · 일곱째까지 보통 — v351 넷·열째였다) · 같은 조각 잇달아 없음 · 땅 = 구덩이 밖 · ⭐ 별은 많아야 하나 · 끝 계단 셋 → 🚩', () => {
  assert.deepEqual([ADV_W, ADV_H, GROUND, START_LEN, CHUNK_N, START_X, POLE_H, FLAG_STEP], [100, 64, 8, 40, 18, 10, 44, 4]);
  assert.deepEqual(ME, { w: 9, h: 11, screen: 22 });
  assert.deepEqual([0, 2, 3, 6, 7, 17].map(chunkLevel), [0, 0, 1, 1, 2, 2]);
  assert.deepEqual(JSON.stringify(advStage(seeded(9))), JSON.stringify(advStage(seeded(9))));
  const lv = Object.fromEntries(CHUNKS.map((c) => [c.id, c.lv]));
  let withStar = 0;
  for (const seed of SEEDS) {
    const st = advStage(seeded(seed));
    assert.equal(st.chunks.length, CHUNK_N);
    st.chunks.forEach((id, i) => assert.ok(lv[id] <= chunkLevel(i), `${seed}: ${i}번째 ${id}`));
    for (let i = 1; i < st.chunks.length; i++) assert.notEqual(st.chunks[i], st.chunks[i - 1], '같은 조각이 잇달아');
    assert.ok(st.qs.filter((q) => q.item === 'star').length <= 1);
    if (st.stars) withStar += 1;
    assert.ok(st.qs.every((q) => q.y === Q_Y && q.w === 7 && q.h === 7));
    // 땅과 구덩이가 빈틈·겹침 없이 처음부터 끝까지
    const spans = [...st.ground.map(([a, b]) => [a, b, 'g']), ...st.pits.map(([a, b]) => [a, b, 'p'])].sort((p, q) => p[0] - q[0]);
    let at = 0;
    for (const [a, b] of spans) { assert.equal(a, at, `${seed}: 틈 ${at}`); assert.ok(b > a); at = b; }
    assert.equal(at, st.len);
    // 메카는 땅 위에서만 오간다 · 막는 것·물건은 구덩이 위에 없다(열매는 구덩이 위 하늘에 있어도 된다)
    const inPit = (x0, x1) => st.pits.some(([a, b]) => x0 < b && x1 > a);
    for (const m of st.mechas) assert.ok(!inPit(m.a, m.b + m.w) && m.a <= m.x && m.x <= m.b, `${seed}: 메카 ${m.a}~${m.b}`);
    for (const b of st.solids) assert.ok(!inPit(b.x, b.x + b.w));
    for (const v of st.volts) assert.ok(!inPit(v.x, v.x + v.w));
    // 끝 — 계단 셋(5·10·15) 다음 평지 14칸에 🚩 · 그 뒤 80칸(포켓몬센터)
    const tail = st.solids.slice(-3);
    assert.deepEqual(tail.map((b) => b.top - GROUND), [5, 10, 15]);
    assert.equal(st.poleX, tail[2].x + tail[2].w + 14);
    assert.equal(st.len, st.poleX + 80);
    assert.ok(st.len > 900 && st.len < 1250, `${seed}: 길 ${st.len}칸`);
  }
  assert.ok(withStar > SEEDS.length * 0.5 && withStar < SEEDS.length, `⭐ 별은 가끔 (${withStar}/${SEEDS.length})`);
  // 깨진 rng(1·NaN)도 길이 된다
  assert.equal(advStage(() => 1).chunks.length, CHUNK_N);
  assert.equal(advStage(() => NaN).chunks.length, CHUNK_N);
});

test('🗺️ 조각마다 잘하는 손이면 꽈당·구덩이·피죤 없이 넘는다 (시험이 직접 풀어 봄) · 깃대 꼭대기 ⭐5', () => {
  for (const c of CHUNKS) {
    for (const seed of [1, 2, 3]) {
      const s = playAll(advStart(0, seeded(seed), [c.id]), bot);
      assert.deepEqual([s.bumps, s.rescues, s.helps], [0, 0, 0], `${c.id}`);
      assert.equal(s.flagPts, 5, `${c.id}: 끝 계단에서 꾹 뛰면 깃대 꼭대기`);
      assert.equal(s.fruits.length, 0, `${c.id}: 열매를 다 먹을 수 있다`);
      if (s.stage.mechas.length) assert.ok(s.stomps >= 1, `${c.id}: 메카를 밟는다`);
    }
  }
});

test('🗺️ 한 판 끝까지(가짜 시계 · 씨앗 200) — 안 눌러도 늘 깃대까지(피죤이 넘겨 주고 건너 줌) · 잘하는 손은 더 빨리·더 많이 · 꽈당은 아주 드묾', () => {
  let slowMax = 0;
  let botBumps = 0;
  for (const seed of SEEDS) {
    const lazy = playAll(advStart(0, seeded(seed)), null);
    assert.ok(lazy.done && lazy.flagPts === 1, `${seed}: 안 눌러도 깃대 (땅에서 잡으면 ⭐1)`);
    assert.ok(lazy.helps >= 3, '끝 계단 셋은 피죤이');
    assert.equal(lazy.stomps, 0);
    slowMax = Math.max(slowMax, lazy.doneAt);
    const good = playAll(advStart(0, seeded(seed)), bot);
    assert.ok(good.done && good.flagPts === 5);
    assert.deepEqual([good.rescues, good.helps], [0, 0], `${seed}: 잘하면 구덩이·피죤 없음`);
    botBumps += good.bumps;
    assert.ok(good.doneAt < lazy.doneAt, '잘하면 더 빨리');
    assert.ok(good.score > lazy.score, '잘하면 ⭐ 더');
    assert.ok(good.doneAt > 30000 && good.doneAt < 50000, `${seed}: 잘하면 ${(good.doneAt / 1000).toFixed(1)}초 (보통 45초 안팎)`);
    const wild = playAll(advStart(0, seeded(seed)), randomHand(seeded(seed + 1000)));
    assert.ok(wild.done && wild.flagPts >= 1, `${seed}: 아무렇게나 눌러도 깃대까지`);
  }
  assert.ok(slowMax < 90000, `안 눌러도 90초 안 (${(slowMax / 1000).toFixed(1)}초)`);
  assert.ok(botBumps <= SEEDS.length * 0.15, `잘하는 손 꽈당 ${botBumps}번`); // v351 어려운 길이 늘어 드물게 꽈당(0.05였다) — 조각 하나하나는 꽈당 없이 넘는다(위 시험)
});

// ───────────────────── 🗺️ 하나하나 ─────────────────────

/** 메카 하나가 가만히 있는 길 */
function withMecha() {
  const s = advStart(0, seeded(1), ['mecha']);
  const m = s.mechas[0];
  m.a = m.x; m.b = m.x; m.vx = 0;
  return { s, m };
}

test('🤖 메카 — 위에서 밟으면 펑 ⭐2·튀어 오름 · 옆이면 꽈당(1초 멈춤 · 점수 그대로 · 메카는 튕겨 나감) · ⭐ 반짝 별이면 닿기만 해도 펑', () => {
  assert.deepEqual([ADV_KINDS.mecha.pts, ADV_KINDS.mecha.w, ADV_KINDS.mecha.h, BOUNCE_V, STUMBLE_MS], [2, 8, 8, 70, 1000]);
  const a = withMecha();
  Object.assign(a.s, { x: a.m.x, y: GROUND + 12, vy: -40, onGround: false });
  const ev = advTick(a.s, 300);
  assert.equal(ev.stomped.length, 1);
  assert.deepEqual([a.s.score, a.s.stomps, a.s.bumps, a.s.mechas.length], [2, 1, 0, 0]);
  assert.ok(a.s.vy > 0 || a.s.y > GROUND, '밟고 튀어 오른다');
  // 옆
  const b = withMecha();
  Object.assign(b.s, { x: b.m.x - 5.5, y: GROUND }); // 부딪히는 몸(양옆 2칸 봐줌)이 메카에 막 닿는 자리
  const e2 = advTick(b.s, 50);
  assert.equal(e2.knocked.length, 1);
  assert.deepEqual([b.s.score, b.s.bumps, b.s.mechas.length], [0, 1, 0]);
  const x0 = b.s.x;
  advTick(b.s, 50 + STUMBLE_MS - 100);
  assert.equal(b.s.x, x0, '꽈당 동안 멈춤');
  advTick(b.s, 50 + STUMBLE_MS + 200);
  assert.ok(b.s.x > x0, '그 뒤 다시 달린다');
  // 떨어지는 중이어도 옆에서 닿으면 밟기가 아니다 (발이 메카 윗부분보다 낮았다)
  const side = withMecha();
  Object.assign(side.s, { x: side.m.x - 5.5, y: GROUND + 2, vy: -30, onGround: false });
  const es = advTick(side.s, 40);
  assert.deepEqual([es.stomped.length, es.knocked.length, side.s.score, side.s.bumps], [0, 1, 0, 1], '옆에서 떨어지며 닿음 = 꽈당');
  // ⭐ 무적
  const c = withMecha();
  Object.assign(c.s, { x: c.m.x - 5.5, y: GROUND, starUntil: 5000 });
  const e3 = advTick(c.s, 50);
  assert.ok(e3.stomped.length === 1 && e3.stomped[0].star);
  assert.deepEqual([c.s.score, c.s.bumps], [2, 0]);
  // 메카는 정해진 사이를 오간다
  const d = advStart(0, seeded(1), ['mecha']);
  const md = d.mechas[0];
  let lo = md.x;
  let hi = md.x;
  for (let t = 0; t < 12000; t += 50) { advTick(d, t); if (d.mechas[0]) { lo = Math.min(lo, d.mechas[0].x); hi = Math.max(hi, d.mechas[0].x); } }
  assert.ok(lo >= md.a - 1e-9 && hi <= md.b + 1e-9);
});

test('⚡ 찌리리공 크기 6×6 — 꾹 뛰어 넘을 출발 자리가 5칸 넘게(약 0.2초) · 7×7이면 3.7칸뿐이라 아이 손에 빡빡했다', () => {
  assert.deepEqual(Object.fromEntries(Object.entries(ADV_KINDS).map(([k, v]) => [k, [v.w, v.h]])), { berry: [5, 5], gold: [5, 5], mecha: [8, 8], volt: [6, 6], q: [7, 7] });
  let ok = 0;
  for (let d = -6; d <= 14; d += 0.1) {
    const s = advStart(0, seeded(1), ['volt']);
    const v = s.volts[0];
    s.fruits.length = 0;
    s.x = v.x - ME.w + 1 - d; // 막는 몸 앞이 찌리리공 앞 d칸
    advPress(s, 0);
    for (let t = 16; t < 1500; t += 16) { advTick(s, t); if (t >= 400 && s.held) advRelease(s, t); }
    if (!s.bumps) ok += 1;
  }
  assert.ok(ok * 0.1 >= 5, `넘는 출발 자리 ${(ok * 0.1).toFixed(1)}칸`);
});

test('⚡ 찌리리공 — 닿으면 꽈당(점수 그대로) · ⭐ 무적이면 굴러간다 · ❓ 블록 — 머리로 쿵 열매 ⭐1 · 두 번째는 빈 소리 · ⭐ 반짝 별은 5초 무적', () => {
  const s = advStart(0, seeded(1), ['volt']);
  const v = s.volts[0];
  Object.assign(s, { x: v.x - ME.w + 2.5, y: GROUND });
  const ev = advTick(s, 50);
  assert.equal(ev.zapped.length, 1);
  assert.deepEqual([s.score, s.bumps, s.volts.length], [0, 1, 0]);
  const r = advStart(0, seeded(1), ['volt']);
  Object.assign(r, { x: r.volts[0].x - ME.w + 2.5, y: GROUND, starUntil: 9999 });
  const er = advTick(r, 50);
  assert.deepEqual([er.rolled.length, r.bumps, r.score], [1, 0, 0], '무적이면 굴러간다');
  // ❓ — 아래에서
  const q = advStart(0, seeded(1), ['q']);
  const b0 = q.qs[0];
  Object.assign(q, { x: b0.x - 1, y: GROUND });
  q.last = 0;
  advPress(q, 0);
  const eq = advTick(q, 400);
  assert.equal(eq.qs.length, 1);
  assert.deepEqual([eq.qs[0].item, q.score, q.qhits, b0.used], ['berry', 1, 1, true]);
  // 다시 쿵 — 빈 소리, 점수 그대로
  Object.assign(q, { x: b0.x - 1, y: GROUND, vy: 0, onGround: true, stumbleUntil: 0 });
  advPress(q, 2000);
  q.last = 2000;
  const eq2 = advTick(q, 2400);
  assert.ok(eq2.thud && eq2.qs.length === 0 && q.score === 1);
  // ⭐ 반짝 별
  const z = advStart(0, seeded(1), ['q']);
  z.qs[0].item = 'star';
  Object.assign(z, { x: z.qs[0].x - 1, y: GROUND });
  advPress(z, 0);
  const ez = advTick(z, 300);
  assert.ok(ez.qs[0].item === 'star' && z.stars === 1 && z.score === 0);
  assert.ok(z.starUntil > 0 && z.starUntil <= 300 + STAR_MS);
  // 서 있을 때는 ❓에 안 닿는다(머리 위)
  const n = advStart(0, seeded(1), ['q']);
  Object.assign(n, { x: n.qs[0].x - 1, y: GROUND });
  assert.equal(advTick(n, 200).qs.length, 0);
});

test('🕳️ 구덩이에 빠지면 피죤이 건너편 땅에 (1.2초 · 그동안 멈춤 · 점수 그대로) · 🐦 막혀서 2초면 피죤이 들어 올려 넘겨 줌 · 🚩 깃대 높이만큼 ⭐ · 깃대 뒤로는 안 움직인다', () => {
  assert.deepEqual([RESCUE_MS, HELP_MS, STAR_MS, STUMBLE_MS], [1200, 2000, 5000, 1000]);
  const s = advStart(0, seeded(1), ['pit']);
  const [, b] = s.stage.pits[0];
  let t = 0;
  let ev = null;
  while (!(ev && ev.rescued) && t < 20000) { t += 16; ev = advTick(s, t); }
  assert.ok(ev.rescued, '건너편으로');
  assert.deepEqual([s.x, s.y, s.rescues, s.score], [b + 1, GROUND, 1, 0]);
  const x0 = s.x;
  advTick(s, t + RESCUE_MS - 50);
  assert.equal(s.x, x0, '데려가는 동안 멈춤');
  advTick(s, t + RESCUE_MS + 300);
  assert.ok(s.x > x0);
  // 높은 그루터기 앞에서 안 누르면 — 2초 뒤 피죤
  const h = advStart(0, seeded(1), ['high']);
  const wall = h.stage.solids[0];
  let th = 0;
  let helpAt = 0;
  let onTop = false;
  while (th < 20000 && !onTop) {
    th += 16;
    const e = advTick(h, th);
    if (e.helped) helpAt = th;
    if (h.onGround && Math.abs(h.y - wall.top) < 0.01) onTop = true;
  }
  assert.ok(helpAt > 0 && onTop, '들어 올려 그루터기 위로');
  const blockedFrom = (wall.x - ME.w - START_X) / RUN_V * 1000;
  assert.ok(helpAt - blockedFrom >= HELP_MS - 50 && helpAt - blockedFrom <= HELP_MS + 100, `막힌 지 ${helpAt - blockedFrom}ms`);
  // 깃대 ⭐
  assert.deepEqual([0, 3.9, 4, 8, 12, 15.9, 16, 40, -5, NaN].map(flagPoints), [1, 1, 2, 3, 4, 4, 5, 5, 1, 1]);
  const f = advStart(0, seeded(1), ['row']);
  Object.assign(f, { x: f.stage.poleX - ME.w - 0.2, y: GROUND + 9, vy: 0, onGround: false });
  const ef = advTick(f, 40);
  assert.equal(ef.flag, 3, '땅에서 8칸 남짓이면 ⭐3');
  assert.ok(f.done && f.score === 3 && f.x === f.stage.poleX - ME.w);
  const after = JSON.stringify(f);
  advTick(f, 5000);
  assert.equal(advPress(f, 5000), 'over');
  assert.equal(JSON.stringify(f), after, '끝난 뒤엔 그대로');
});

test('🗺️ 시계 — 깨진 때·뒤로 간 때는 안 움직임 · 앱을 내렸다 돌아오면(advShift) 그대로 · 화면 왼쪽 끝은 길 안 · 혹시 몰라 둔 끝(150초)', () => {
  const s = advStart(1000, seeded(1));
  advTick(s, 3000);
  const snap = JSON.stringify(s);
  advTick(s, NaN);
  advTick(s, 2000);
  assert.equal(JSON.stringify(s), snap);
  s.stumbleUntil = 3500; s.starUntil = 4000; s.buffer = 3100;
  advShift(s, 5000);
  assert.deepEqual([s.t0, s.last, s.end, s.stumbleUntil, s.starUntil, s.buffer], [6000, 8000, 6000 + MAX_MS, 8500, 9000, 8100]);
  const b = JSON.stringify(s);
  advShift(s, 0); advShift(s, -1); advShift(s, NaN);
  assert.equal(JSON.stringify(s), b);
  // 화면 왼쪽 끝
  const c = advStart(0, seeded(1));
  assert.equal(advCam(c), 0, '처음엔 0');
  c.x = 500;
  assert.equal(advCam(c), 500 - ME.screen);
  c.x = c.stage.poleX - ME.w;
  assert.ok(advCam(c) <= c.stage.len - ADV_W && advCam(c) === c.x - ME.screen, '깃대에서도 나는 왼쪽에서 22칸');
  // 혹시 몰라 둔 끝
  const z = advStart(0, seeded(1));
  z.stage.poleX = 1e9;
  advTick(z, MAX_MS + 100);
  assert.ok(z.done && z.flagPts === 0 && z.doneAt === MAX_MS);
});

// ───────────────────── 화면 (가짜 화면 · 가짜 시계) ─────────────────────

class FakeEl {
  constructor(tag) { this.tagName = String(tag).toUpperCase(); this.className = ''; this.children = []; this.listeners = {}; this.style = { setProperty(k, v) { this[k] = v; } }; this.attrs = {}; this.textContent = ''; this.html = ''; }
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
const all = (e, cls, out = []) => { for (const c of e.children) { if (c.className.split(/\s+/).includes(cls)) out.push(c); all(c, cls, out); } return out; };
function world(t, make) {
  const doc = { hidden: false, listeners: {}, createElement: (tag) => new FakeEl(tag),
    addEventListener(type, f) { (this.listeners[type] ||= []).push(f); },
    removeEventListener(type, f) { this.listeners[type] = (this.listeners[type] || []).filter((x) => x !== f); },
    fire(type) { for (const f of [...(this.listeners[type] || [])]) f(); } };
  let clock = 1000;
  const realPerf = globalThis.performance;
  Object.defineProperty(globalThis, 'performance', { value: { now: () => clock }, configurable: true, writable: true });
  globalThis.document = doc;
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  t.after(() => { Object.defineProperty(globalThis, 'performance', { value: realPerf, configurable: true, writable: true }); delete globalThis.document; });
  const stage = new FakeEl('div');
  const h = make(stage);
  const st = { over: null };
  h.done.then((r) => { st.over = r; });
  const adv = (ms) => { for (let k = 0; k < ms; k += 50) { clock += 50; t.mock.timers.tick(50); } };
  const flush = () => new Promise((r) => setImmediate(r));
  const hide = (on) => { doc.hidden = on; doc.fire('visibilitychange'); };
  return { stage, h, doc, adv, flush, st, hide };
}
const ty = (e) => Number((/translate3d\(-?[\d.]+px, (-?[\d.]+)px/.exec(e.style.transform) || [])[1]);
const tx = (e) => Number((/translate3d\((-?[\d.]+)px/.exec(e.style.transform) || [])[1]);

test('🗺️ 화면 — 안내 · 「준비!」 뒤 길을 그림(땅·❓·열매·메카·🚩·포켓몬센터·나) · 화면이 따라간다 · 꾹 누르면 뜀 · 안 눌러도 🚩 도착! → 끝(점수) · 듣기를 뗀다', async (t) => {
  const w = world(t, (stage) => runAdv(stage, { rng: seeded(4), hero: { html: '<img class="gd-pal-img">' }, art: { 100: 'blob:volt', 17: 'blob:bird' } }));
  const root = w.stage.children[0];
  const [top, field, hint, , banner] = root.children;
  assert.equal(hint.textContent, '톡 하면 낮게 · 꾹 누르면 높이 폴짝!');
  assert.equal(field.attrs['aria-label'], '톡 하면 낮게 · 꾹 누르면 높이 폴짝');
  assert.equal(banner.textContent, '준비!');
  const wld = field.children[2];
  assert.equal(wld.children.length, 0, '「준비!」 동안은 길이 없다');
  w.adv(900);
  assert.ok(root.classList.contains('is-go'));
  for (const cls of ['ga-ground', 'ga-q', 'ga-obj', 'ga-pole', 'ga-center', 'ga-me', 'ga-bird']) assert.ok(all(wld, cls).length > 0, cls);
  const me = all(wld, 'ga-me')[0];
  assert.equal(me.children[0].innerHTML, '<img class="gd-pal-img">');
  const bird = all(wld, 'ga-bird')[0];
  assert.ok(bird.hidden, '피죤은 숨어 있다');
  assert.equal(bird.children[0].src, 'blob:bird');
  const volt = all(wld, 'ga-obj').find((e) => e.className.includes('is-volt'));
  if (volt) { assert.equal(volt.children[0].src, 'blob:volt'); volt.children[0].fire('error'); assert.match(volt.innerHTML, /<svg/, '깨지면 코드로 그린 찌리리공'); }
  const q = all(wld, 'ga-q')[0];
  assert.match(q.style.bottom, /%$/, '가만히 있는 것은 %로');
  assert.equal(q.style.bottom, `${((Q_Y / ADV_H) * 100).toFixed(3)}%`);
  // 화면이 따라간다
  w.adv(3000);
  assert.ok(tx(wld) < 0, `길이 왼쪽으로 (${wld.style.transform})`);
  // 꾹 누르면 뜬다 · 떼기
  assert.ok(!me.classList.contains('is-air'));
  field.fire('pointerdown', { pointerId: 1 });
  w.adv(200);
  assert.ok(me.classList.contains('is-air') && ty(me) < 0, '떴다');
  for (const f of w.doc.listeners.pointerup) f({ pointerId: 1 });
  // 안 눌러도 깃대까지 (피죤이 넘겨 준다) — 그동안 🐦 피죤이 나왔다가 숨는다
  let k = 0;
  let birdSeen = 0;
  while (!w.st.over && k++ < 2000) {
    w.adv(50);
    if (!bird.hidden) { birdSeen += 1; assert.ok(ty(bird) < ty(me), '피죤은 머리 위'); }
    await w.flush();
  }
  assert.ok(birdSeen > 0, '🐦 피죤이 나왔다');
  assert.ok(w.st.over && w.st.over.quit === false, '끝까지');
  assert.ok(w.st.over.score >= 1);
  assert.equal(banner.textContent, '🚩 도착!');
  assert.match(top.children[0].textContent, new RegExp(`^⭐ ${w.st.over.score}$`));
  assert.ok(all(wld, 'ga-flag')[0].classList.contains('is-down'), '깃발이 내려온다');
  assert.equal((w.doc.listeners.visibilitychange || []).length, 0, '끝나면 듣기를 뗀다');
  assert.equal((w.doc.listeners.pointerup || []).length, 0);
});

test('🗺️ 화면 (🔍 Codex 137차 #1·#2) — 꾹 누른 채 앱을 내렸다가 숨은 동안 떼도 톡 높이 그대로 · 공중에서 다른 손가락을 눌렀다 떼도 꾹 뛰기가 안 끊김', async (t) => {
  assert.deepEqual(advStage(seeded(8)).chunks.slice(0, 2), ['row', 'arc'], '처음 두 조각이 열매뿐인 길 (높이를 재는 동안 ❓·그루터기가 없게)');
  const w = world(t, (stage) => runAdv(stage, { rng: seeded(8) }));
  w.adv(900);
  const field = w.stage.children[0].children[1];
  const me = all(field.children[2], 'ga-me')[0];
  const up = (id) => { for (const f of [...(w.doc.listeners.pointerup || [])]) f({ pointerId: id }); };
  const peak = (ms) => { let top = 0; for (let k = 0; k < ms; k += 50) { w.adv(50); top = Math.max(top, -ty(me) - GROUND); } return top; };
  // #1 누름 → 50ms → 숨김 → 숨은 동안 뗌 → 돌아옴 (숨은 3초를 누른 시간으로 세면 바로 줄어 약 8칸이었다)
  field.fire('pointerdown', { pointerId: 1 });
  w.adv(50);
  w.hide(true);
  w.adv(3000);
  up(1);
  w.hide(false);
  const tap = peak(1200);
  assert.ok(tap > 9.5 && tap < 13, `톡 높이 그대로 (${tap.toFixed(1)}칸 — 50ms마다 재서 꼭대기보다 조금 낮다 · 잘못이면 약 7.6칸)`);
  // #2 손가락 1로 꾹 → 공중에서 손가락 2를 눌렀다 뗌 → 손가락 1은 아직 누르는 중
  field.fire('pointerdown', { pointerId: 1 });
  w.adv(30);
  field.fire('pointerdown', { pointerId: 2 });
  up(2);
  const hold = peak(1200);
  up(1);
  assert.ok(hold > 16, `꾹 높이 그대로 (${hold.toFixed(1)}칸 · 끊기면 약 10칸)`);
  // 땅에서 다른 손가락이 누르면 이어받는다 (첫 손가락의 뗌을 놓쳐도 막히지 않게)
  field.fire('pointerdown', { pointerId: 3 });
  w.adv(100);
  assert.ok(me.classList.contains('is-air'), '손가락 3으로 뛰었다');
  field.fire('pointerdown', { pointerId: 4 }); // 공중 — 무시
  up(4);
  up(3);
  w.h.stop();
  await w.flush();
});

test('🗺️ 화면 (🔍 Codex 137차 #3) — 「🚩 도착!」을 보여 주는 동안 ✕(stop)는 기다리지 않고 바로 끝(도착한 판 · 점수 그대로 · 한 번만)', async (t) => {
  const w = world(t, (stage) => runAdv(stage, { rng: seeded(4) }));
  const banner = w.stage.children[0].children[4];
  w.adv(900);
  let k = 0;
  while (banner.textContent !== '🚩 도착!' && k++ < 3000) w.adv(50);
  assert.equal(banner.textContent, '🚩 도착!');
  await w.flush();
  assert.equal(w.st.over, null, '아직 기다리는 중');
  w.h.stop();
  await w.flush();
  assert.ok(w.st.over && w.st.over.quit === false && w.st.over.score >= 1, `바로 끝 (${JSON.stringify(w.st.over)})`);
  const first = w.st.over;
  w.adv(3000);
  await w.flush();
  assert.equal(w.st.over, first, '한 번만');
});

test('🗺️ 화면 — 「준비!」 때 그만두면 길도 안 그리고 듣기를 뗀다 · 숨은 동안 멈췄다가 그대로 이어서 · 그림이 없으면 🐦·코드 그림', async (t) => {
  const w = world(t, (stage) => runAdv(stage, { rng: seeded(4) }));
  w.adv(300);
  w.h.stop();
  await w.flush();
  assert.deepEqual(w.st.over, { score: 0, quit: true });
  w.adv(2000);
  assert.equal(w.stage.children[0].children[1].children[2].children.length, 0);
  assert.equal((w.doc.listeners.visibilitychange || []).length, 0);
  assert.equal((w.doc.listeners.pointerup || []).length, 0);
});

test('🗺️ 화면 — 숨은 동안 멈춤 · 돌아오면 그 자리에서 · 그림이 없으면 🐦 · 파트너가 없으면 🐾', async (t) => {
  const w = world(t, (stage) => runAdv(stage, { rng: seeded(4) }));
  w.adv(900);
  const wld = w.stage.children[0].children[1].children[2];
  const me = all(wld, 'ga-me')[0];
  assert.match(me.children[0].innerHTML, /🐾/);
  assert.match(all(wld, 'ga-bird')[0].innerHTML, /🐦/);
  w.adv(1000);
  const x1 = tx(me);
  w.hide(true);
  w.adv(5000);
  w.hide(false);
  w.adv(50);
  const x2 = tx(me);
  assert.ok(x2 - x1 < RUN_V * 0.2 * 3, `숨은 5초 동안은 안 달렸다 (${x1} → ${x2})`);
  w.h.stop();
  await w.flush();
  assert.equal(w.st.over.quit, true);
});
