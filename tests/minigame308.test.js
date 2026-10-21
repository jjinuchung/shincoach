// 🎮 게임기 미니 게임 2단계 (v308 · 2026-10-21 아버님 "배포하고 다음 판 진행하자" → 물음 둘 모두 추천안) — node --test tests/minigame308.test.js
// 🏃 파트너 달리기(톡 점프 · 공중 한 번 더 · 🍓 ⭐1 · ✨ 황금 ⭐3 · 🪨 꽈당 1초 — 점수 안 깎음) ·
// 👤 그림자 포켓몬(앱 포켓몬 전체 · 40초 동안 몇 마리나 · 보기는 같은 타입에서 · 틀려도 감점 없음) · 게임기 화면 연결(판을 쓰기 전에 준비)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GAMES, gameById } from '../js/minigame.js';
import {
  RUN_SEC, STUMBLE_MS, RUN_W, RUN_H, ME, GRAVITY, JUMP_V, JUMP2_V, BUFFER_MS, RUN_KINDS, BERRY_Y, ROCK_GAP,
  runSpeed, runChunk, runStart, runHits, runTick, runTap, runShift, runRun,
} from '../js/gamerun.js';
import {
  SHADOW_SEC, SHADOW_CHOICES, RIGHT_MS, WRONG_MS, SHADOW_MIN, LOAD_MS,
  shadowShuffle, shadowPoolOf, shadowChoices, shadowStart, shadowNext, shadowPick, shadowTick, shadowSkip, shadowShift, runShadow,
} from '../js/gameshadow.js';
import { ROSTER } from '../js/pokemon.js';
import { typeOf } from '../js/battle.js';

const src = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
/** 정해진 차례로 도는 rng (시험이 늘 같게) */
function seeded(seed = 7) {
  let x = seed >>> 0;
  return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 2 ** 32; };
}
const SEEDS = [1, 7, 42, 2026, 99999, 31337, 5, 777];

// ───────────────────── 목록 · 게임기 화면 연결 ─────────────────────

test('🎮 v308 게임 목록 — 🕳️ 디그다 · 🏃 파트너 달리기 30초 · 👤 그림자 포켓몬 40초 · 화면(RUNNERS)과 짝이 맞다', () => {
  assert.deepEqual(GAMES.map((g) => g.id), ['dig', 'run', 'shadow']);
  assert.equal(gameById('run').sec, RUN_SEC);
  assert.equal(gameById('shadow').sec, SHADOW_SEC);
  assert.deepEqual([RUN_SEC, SHADOW_SEC], [30, 40], '아버님 고른 40초(그림자)');
  for (const g of GAMES) {
    assert.match(g.id, /^[a-z]{2,12}$/, '최고 기록 열쇠 꼴(homeplay GAME_KEY)');
    assert.ok(g.emoji && g.ko && g.how, g.id);
    assert.ok(!/\d/.test(g.how), `${g.id}: 아이가 보는 설명에 숫자 없음`);
  }
  const gv = src('js/gameview.js');
  const runners = gv.slice(gv.indexOf('const RUNNERS = {'), gv.indexOf('};', gv.indexOf('const RUNNERS = {')));
  for (const g of GAMES) assert.match(runners, new RegExp(`\\n  ${g.id}: \\{ run: run[A-Z]\\w*, prep: `), `RUNNERS에 ${g.id}`);
  assert.equal((runners.match(/\n {2}[a-z]+: \{ run:/g) || []).length, GAMES.length, 'RUNNERS에 목록 밖 게임 없음');
});

test('🎮 게임기 흐름 — 준비(prep)는 판을 쓰기 전 · 준비가 안 되면 판을 안 쓰고 한 줄 · 준비한 것을 그대로 넘긴다', () => {
  const gv = src('js/gameview.js');
  const body = gv.slice(gv.indexOf('async function startRound('), gv.indexOf('/** 끝 화면'));
  const at = (s) => { const i = body.indexOf(s); assert.ok(i >= 0, s); return i; };
  assert.ok(at('await R.prep();') < at('await claimDailyCount('), '준비 → 판 쓰기 차례');
  assert.match(body, /const prep = await R\.prep\(\);\n\s*if \(!live\(\)\) return;[^\n]*\n\s*if \(!prep\) \{\n\s*ui\.msg = R\.none \|\| '';\n\s*ui\.busy = false;\n\s*renderPick\(\);\n\s*return;\n\s*\}\n\s*day = clockDay\(\);\n\s*let r = null;\n\s*try \{ r = await claimDailyCount\(day,/);
  assert.match(body, /const run = R\.run\(stage, \{ \.\.\.prep, hero: ctx\.hero \}\);\n\s*started = true;/);
  assert.equal((gv.match(/await claimDailyCount\(/g) || []).length, 1, '판을 쓰는 곳은 여전히 하나');
  // 👤 문제 포켓몬 — 명단 전체 가운데 기기에 그림이 있는 것 · 타입은 배틀 표 · 적으면 몇 장 더 받아 보고 넷이 안 되면 null
  assert.match(gv, /for \(const r of ROSTER\) \{\n\s*const url = characterUrl\(r\.id\) \|\| artUrl\(r\.id\);\n\s*if \(url\) out\.push\(\{ id: r\.id, ko: r\.ko, type: typeOf\(r\.id\), url \}\);/);
  assert.match(gv, /return shadowPoolOf\(pool\)\.length >= SHADOW_MIN \? \{ pool \} : null;/);
  assert.match(gv, /await Promise\.race\(\[ensureCast\(want\)\.catch\(\(\) => \[\]\), wait\(ART_WAIT_MS\)\]\);/, '기다리는 끝이 있다');
  assert.match(gv, /dig: \{ run: runDig, prep: async \(\) => \(\{ art: await artFor\(Object\.values\(DIG_KINDS\)\.map\(\(k\) => k\.id\)\) \}\) \}/, '디그다는 그대로 그림 먼저');
  const none = /none: '([^']+)'/.exec(gv)[1];
  assert.ok(!/\d/.test(none), '못 할 때 말에 숫자 없음');
  // 💰·스톤과 안 이어진다
  for (const f of ['js/gamerun.js', 'js/gameshadow.js']) assert.ok(!/coins|addCoins|applyPurchase|items\[|xp\.js|db\.js/.test(src(f)), `${f}는 저장·가방을 안 만진다`);
});

test('🎮 서비스워커 v308 · 새 파일 둘 · css', () => {
  const sw = src('sw.js');
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(sw) || [])[1]) >= 308, 'sw v308 이상');
  for (const f of ['gamerun.js', 'gameshadow.js']) assert.ok(sw.includes(`'./js/${f}'`), f);
  const css = src('css/style.css');
  for (const c of ['.gr-field', '.gr-me', '.gr-obj', '.gs-pic', '.gs-btn.is-right']) assert.ok(css.includes(c), c);
  assert.match(css, /\.gs-img\.is-dark \{ filter: brightness\(0\);/, '그림자는 까맣게');
  assert.match(css, /\.gs-img\.is-wait \{ visibility: hidden; \}/, '다 뜨기 전 그림은 감춘다 (🔍 Codex 114차 #1)');
  assert.match(css, /\.gr-me \.gd-pal-img \{ transform: scaleX\(-1\); \}/, '달리는 포켓몬은 오른쪽을 본다');
});

// ───────────────────── 🏃 파트너 달리기 — 엔진 ─────────────────────

test('🏃 빠르기 40 → 60칸/초 (끝으로 갈수록) · 묶음 비율', () => {
  assert.equal(runSpeed(0), 40);
  assert.equal(runSpeed(RUN_SEC * 1000), 60);
  assert.equal(runSpeed(99e9), 60);
  assert.equal(runSpeed(-5), 40);
  assert.equal(runSpeed(NaN), 40);
  for (let ms = 0; ms < RUN_SEC * 1000; ms += 1000) assert.ok(runSpeed(ms + 1000) >= runSpeed(ms));
  assert.deepEqual([0, 0.29, 0.3, 0.54, 0.55, 0.74, 0.75, 0.91, 0.92, 0.999].map(runChunk),
    ['rock', 'rock', 'rockBerry', 'rockBerry', 'row', 'row', 'arc', 'arc', 'gold', 'gold']);
  assert.deepEqual([RUN_W, RUN_H, ME.x, ME.w, ME.h], [100, 56, 16, 11, 13]);
  assert.deepEqual(Object.fromEntries(Object.entries(RUN_KINDS).map(([k, v]) => [k, v.pts])), { rock: 0, berry: 1, gold: 3 });
});

/** 물건 없이 뛰기만 보는 판 */
const bare = () => { const s = runStart(0); s.nextAt = 1e12; return s; };

test('🏃 뛰기 — 한 번이면 23칸쯤(0.8초) · 황금 열매는 한 번으론 못 닿고 · 꼭대기에서 한 번 더 뛰면 닿는다', () => {
  const s = bare();
  assert.equal(runTap(s, 0), 'jump');
  let peak = 0;
  let land = 0;
  for (let t = 16; t <= 1500; t += 16) { runTick(s, t); peak = Math.max(peak, s.y); if (!land && s.y === 0) land = t; }
  assert.ok(peak > 22 && peak < JUMP_V ** 2 / (2 * GRAVITY) + 0.5, `꼭대기 ${peak}`);
  assert.ok(land >= 750 && land <= 850, `내려앉음 ${land}`);
  assert.ok(peak + ME.h < BERRY_Y.high, '한 번 뛰어서는 황금 열매 아래');
  assert.ok(peak + ME.h > BERRY_Y.air, '한 번 뛰면 공중 열매에 닿는다');
  assert.ok(peak > RUN_KINDS.rock.h, '돌보다 높이');
  const d = bare();
  runTap(d, 0);
  let top = 0;
  let twice = false;
  for (let t = 16; t <= 2500; t += 16) {
    runTick(d, t);
    if (!twice && d.vy <= 0) { assert.equal(runTap(d, t), 'double'); twice = true; }
    top = Math.max(top, d.y);
  }
  assert.ok(top + ME.h > BERRY_Y.high + 1, `두 번 뛰면 황금 열매에 닿는다 (${top})`);
  assert.ok(top + ME.h < RUN_H + 4, '마당 위로 크게 넘치지 않는다');
  assert.equal(JUMP2_V < JUMP_V, true);
});

test('🏃 톡 결과 — 땅에서 jump · 공중에서 한 번 더 double · 그다음은 air · 내려앉기 바로 앞은 buffer → 닿자마자 뛴다 · 꽈당 중 · 끝', () => {
  const s = bare();
  assert.equal(runTap(s, 0), 'jump');
  runTick(s, 100);
  assert.equal(runTap(s, 100), 'double');
  runTick(s, 200);
  assert.equal(runTap(s, 200), 'air', '세 번은 못 뛴다');
  assert.equal(s.buffer, 0, '높을 때 누른 건 쌓아 두지 않는다');
  // 내려앉기 바로 앞
  let t = 200;
  while (!(s.vy < 0 && s.y < 8)) { t += 16; runTick(s, t); }
  assert.equal(runTap(s, t), 'buffer');
  assert.equal(s.buffer, t + BUFFER_MS);
  let jumped = false;
  for (let k = 0; k < 20 && !jumped; k++) { t += 16; jumped = runTick(s, t).jumped; }
  assert.ok(jumped, '닿자마자 뛰었다');
  assert.deepEqual([s.jumps, s.vy > 0], [1, true]);
  // 늦게 누른 buffer는 시간이 지나면 버린다
  const late = bare();
  late.y = 5; late.vy = -1; late.jumps = 2;
  assert.equal(runTap(late, 0), 'buffer');
  late.buffer = 1; // 이미 지난 때
  assert.equal(runTick(late, 2000).jumped, false, '지난 buffer로는 안 뛴다');
  assert.deepEqual([late.y, late.jumps, late.buffer], [0, 0, 0]);
  // 꽈당 중 · 끝
  const b = bare();
  b.stumbleUntil = 500;
  assert.equal(runTap(b, 499), 'stumble');
  assert.equal(b.vy, 0);
  assert.equal(runTap(b, 500), 'jump');
  assert.equal(runTap(runStart(0), RUN_SEC * 1000), 'over');
});

test('🏃 닿기 — 돌은 아깝게 스친 건 봐준다(6칸 위면 넘음) · 열매는 조금 넉넉히', () => {
  const s = runStart(0);
  const rock = (x) => ({ kind: 'rock', x, y: 0, w: 8, h: 8 });
  const r = ME.x + ME.w - 1.5; // 달리는 쪽 오른 가장자리(봐준 뒤)
  assert.equal(runHits(s, rock(r - 1)), false, '돌 가장자리가 닿기만 하면 안 넘어짐');
  assert.equal(runHits(s, rock(r - 1.1)), true);
  assert.equal(runHits(s, rock(ME.x)), true);
  s.y = 6;
  assert.equal(runHits(s, rock(ME.x)), false, '6칸 위면 넘는다');
  s.y = 5.9;
  assert.equal(runHits(s, rock(ME.x)), true);
  s.y = 0;
  const berry = (x, y) => ({ kind: 'berry', x, y, w: 6, h: 6 });
  assert.equal(runHits(s, berry(r + 0.9, BERRY_Y.ground)), true, '열매는 가장자리보다 1칸 넉넉히');
  assert.equal(runHits(s, berry(r + 1, BERRY_Y.ground)), false);
  assert.equal(runHits(s, berry(ME.x, BERRY_Y.air)), false, '땅에서는 공중 열매에 안 닿는다');
  s.y = 8;
  assert.equal(runHits(s, berry(ME.x, BERRY_Y.air)), true);
  assert.equal(runHits(s, berry(ME.x, BERRY_Y.ground)), false, '뛰면 땅 열매 위로 지나간다');
});

/** 한 판을 16ms씩 끝까지 — play(s, t)가 누를지 정한다 → { s, rocks, rockGaps, added, golds } */
function runAll(seed, play) {
  const rng = seeded(seed);
  const s = runStart(0);
  let lastRock = null;
  const out = { s, rocks: 0, minGap: Infinity, added: [], bumpsAt: [], gotPts: 0, late: 0 };
  for (let t = 0; t <= RUN_SEC * 1000 + 1000; t += 16) {
    const before = s.score;
    const ev = runTick(s, t, rng);
    assert.ok(s.score >= before, '점수는 줄지 않는다');
    for (const o of ev.added) {
      out.added.push(o);
      if (t > s.end) out.late += 1;
      if (o.kind === 'rock') { out.rocks += 1; if (lastRock !== null) out.minGap = Math.min(out.minGap, s.dist - lastRock); lastRock = s.dist; }
    }
    for (const g of ev.got) out.gotPts += g.pts;
    for (const b of ev.bumps) out.bumpsAt.push({ t: s.last, dist: s.dist, b });
    if (play) play(s, t);
  }
  return out;
}

test('🏃 잘 뛰는 한 판(가짜 시계 · 씨앗 여덟) — 꽈당 0 · 돌 사이는 늘 60칸 넘게 · 판 끝을 넘지 않음 · 점수 = 열매 + 황금×3', () => {
  for (const seed of SEEDS) {
    const r = runAll(seed, (s, t) => {
      if (s.y === 0 && s.objs.some((o) => o.kind === 'rock' && o.x >= 28 && o.x <= 32)) runTap(s, t);
    });
    const { s } = r;
    assert.equal(s.bumps, 0, `seed ${seed}: 꽈당 없음`);
    assert.ok(r.rocks >= 5, `seed ${seed}: 돌 ${r.rocks}`);
    assert.ok(r.minGap >= ROCK_GAP, `seed ${seed}: 돌 사이 ${r.minGap}`);
    assert.equal(s.last, s.end, '판 끝에서 멈춘다');
    assert.equal(r.late, 0, '끝난 뒤엔 새 물건 없음');
    assert.equal(s.score, s.berries + 3 * s.golds);
    assert.equal(s.score, r.gotPts);
    assert.ok(s.score >= 20 && s.score <= 80, `seed ${seed}: ⭐ ${s.score}`);
    assert.ok(s.dist > 1400 && s.dist < 1600, `seed ${seed}: 달린 거리 ${s.dist}`);
    assert.ok(s.objs.length <= 12 && s.objs.every((o) => o.x + o.w >= -4), `seed ${seed}: 지나간 물건은 지운다 (${s.objs.length})`);
    for (const o of r.added) {
      assert.ok(['rock', 'berry', 'gold'].includes(o.kind));
      if (o.kind === 'rock') assert.equal(o.y, 0);
      if (o.kind === 'gold') assert.equal(o.y, BERRY_Y.high);
    }
  }
});

test('🏃 안 누르는 한 판 — 돌마다 꽈당 · 꽈당 1초 동안 마당이 멈춤 · 점수는 안 깎고 · 땅 열매만 먹는다', () => {
  let anyBump = false;
  for (const seed of SEEDS) {
    const r = runAll(seed);
    const { s } = r;
    assert.equal(s.golds, 0, '황금 열매는 뛰어야');
    assert.ok(s.bumps >= 1 && s.bumps <= r.rocks, `seed ${seed}: 꽈당 ${s.bumps} / 돌 ${r.rocks}`);
    const groundBerries = r.added.filter((o) => o.kind === 'berry' && o.y === BERRY_Y.ground).length;
    assert.ok(s.berries <= groundBerries, '공중 열매는 못 먹는다');
    anyBump = true;
  }
  assert.ok(anyBump);
  // 꽈당 1초: 거리가 그대로 → 지나면 다시 달린다
  const rng = seeded(3);
  const s = runStart(0);
  let t = 0;
  while (!s.bumps && t < RUN_SEC * 1000) { t += 16; runTick(s, t, rng); }
  assert.equal(s.bumps, 1);
  const at = s.dist;
  const until = s.stumbleUntil;
  assert.ok(until > t - 16 + STUMBLE_MS && until <= t + STUMBLE_MS, '꽈당은 부딪힌 때부터 1초');
  runTick(s, until - 1, rng);
  assert.equal(s.dist, at, '꽈당 동안 멈춤');
  assert.equal(runTap(s, until - 1), 'stumble');
  runTick(s, until + 200, rng);
  assert.ok(s.dist > at, '1초 뒤 다시 달린다');
});

test('🏃 황금 열매 — 꼭대기에서 한 번 더 뛰면 먹는다(⭐ +3)', () => {
  let golds = 0;
  for (const seed of SEEDS) {
    const r = runAll(seed, (s, t) => {
      const goldNear = s.objs.some((o) => o.kind === 'gold' && o.x < 40 && o.x > 4);
      if (s.y === 0 && (s.objs.some((o) => o.kind === 'rock' && o.x >= 28 && o.x <= 32) || s.objs.some((o) => o.kind === 'gold' && o.x >= 30 && o.x <= 34))) runTap(s, t);
      if (goldNear && s.jumps === 1 && s.vy <= 5) runTap(s, t);
    });
    golds += r.s.golds;
    assert.equal(r.s.score, r.s.berries + 3 * r.s.golds);
  }
  assert.ok(golds >= 3, `황금 열매 ${golds}`);
});

test('🏃 시계가 한 번에 1초를 건너뛰어도(느린 태블릿) 돌을 뚫고 지나가지 않는다 — 16ms씩 나눠 움직임', () => {
  const s = bare();
  s.objs.push({ n: 1, kind: 'rock', x: 40, y: 0, w: 8, h: 8 });
  const ev = runTick(s, 1000, seeded(1));
  assert.equal(ev.bumps.length, 1, '건너뛴 사이의 돌도 부딪힌다');
  assert.equal(s.bumps, 1);
  const b = bare();
  b.objs.push({ n: 2, kind: 'berry', x: 40, y: BERRY_Y.ground, w: 6, h: 6 });
  assert.equal(runTick(b, 1000, seeded(1)).got.length, 1, '건너뛴 사이의 열매도 먹는다');
});

test('🏃 시계 — 깨진 때·뒤로 간 때는 안 움직임 · 앱을 내렸다 돌아오면(runShift) 남은 시간 그대로', () => {
  const s = runStart(1000);
  runTick(s, 2000, seeded(1));
  const snap = JSON.stringify(s);
  runTick(s, NaN, seeded(1));
  runTick(s, 1500, seeded(1));
  assert.equal(JSON.stringify(s), snap);
  s.stumbleUntil = 2500;
  s.buffer = 2100;
  runShift(s, 5000);
  assert.deepEqual([s.t0, s.end, s.last, s.stumbleUntil, s.buffer], [6000, 6000 + RUN_SEC * 1000, 7000, 7500, 7100]);
  const b = JSON.stringify(s);
  runShift(s, 0); runShift(s, -3); runShift(s, NaN);
  assert.equal(JSON.stringify(s), b);
  const z = runStart(0);
  runShift(z, 100);
  assert.deepEqual([z.stumbleUntil, z.buffer], [0, 0], '없던 꽈당·buffer는 0 그대로');
});

// ───────────────────── 👤 그림자 포켓몬 — 엔진 ─────────────────────

const mon = (id, ko, type) => ({ id, ko, type, url: `u${id}` });
const FAKE = [mon(1, '하나', 'fire'), mon(2, '둘', 'fire'), mon(3, '셋', 'fire'), mon(4, '넷', 'fire'), mon(5, '다섯', 'water'), mon(6, '여섯', 'water')];

test('👤 문제 포켓몬 고쳐 읽기 — id·이름 있는 것만 · 같은 id·같은 이름은 하나 · 타입 없으면 노말', () => {
  const p = shadowPoolOf([mon(1, '피카츄', 'electric'), mon(1, '또', 'x'), mon(2, '피카츄', 'x'), { id: 3, ko: ' 파이리 ' }, { id: -1, ko: 'a' }, { id: 4 }, null, { id: 2.5, ko: 'b' }, { id: '7', ko: '꼬부기', type: 'water' }]);
  assert.deepEqual(p.map((x) => [x.id, x.ko, x.type]), [[1, '피카츄', 'electric'], [3, '파이리', 'normal'], [7, '꼬부기', 'water']]);
  assert.deepEqual(shadowPoolOf(null), []);
  assert.equal(SHADOW_MIN, SHADOW_CHOICES);
  assert.equal(SHADOW_CHOICES, 4);
});

test('👤 보기 넷 — 정답 하나 + 같은 타입에서 셋(모자라면 다른 타입) · 이름이 다 다르다 · 진짜 명단 전체에서도', () => {
  const rng = seeded(11);
  for (let k = 0; k < 50; k++) {
    const c = shadowChoices(FAKE, FAKE[0], rng);
    assert.equal(c.length, 4);
    assert.equal(new Set(c.map((x) => x.id)).size, 4);
    assert.ok(c.some((x) => x.id === 1));
    assert.ok(c.every((x) => x.type === 'fire'), '불꽃이 넷이면 다 불꽃');
    const w = shadowChoices(FAKE, FAKE[4], rng);
    assert.equal(w.filter((x) => x.type === 'water').length, 2, '물은 둘뿐 — 나머지는 다른 타입에서');
    assert.equal(new Set(w.map((x) => x.id)).size, 4);
  }
  // 정답 자리가 고르게 섞인다
  const where = [0, 0, 0, 0];
  for (let k = 0; k < 400; k++) where[shadowChoices(FAKE, FAKE[2], rng).findIndex((x) => x.id === 3)] += 1;
  assert.ok(where.every((n) => n > 60), `정답 자리 ${where}`);
  // 진짜 명단 — 모든 포켓몬이 문제가 될 수 있고, 보기는 다 같은 타입(타입마다 넷 넘게 있다)
  const pool = shadowPoolOf(ROSTER.map((r) => ({ id: r.id, ko: r.ko, type: typeOf(r.id) })));
  assert.equal(pool.length, ROSTER.length, '명단에 이름이 겹치는 포켓몬이 없다');
  const byType = {};
  for (const p of pool) byType[p.type] = (byType[p.type] || 0) + 1;
  assert.ok(Object.values(byType).every((n) => n >= 4), JSON.stringify(byType));
  for (const ans of pool) {
    const c = shadowChoices(pool, ans, rng);
    assert.equal(new Set(c.map((x) => x.ko)).size, 4, ans.ko);
    assert.ok(c.every((x) => x.type === ans.type), ans.ko);
  }
});

test('👤 섞기 — 같은 것들 · 원래 배열은 그대로', () => {
  const a = [1, 2, 3, 4, 5];
  const b = shadowShuffle(a, seeded(4));
  assert.deepEqual([...b].sort(), a);
  assert.deepEqual(a, [1, 2, 3, 4, 5]);
  assert.deepEqual(shadowShuffle([], seeded(1)), []);
  assert.deepEqual(shadowShuffle(a, () => 0.9999999), shadowShuffle(a, () => 0.9999999), 'rng 끝값에도 자리 밖으로 안 나감');
});

test('👤 문제 차례 — 한 판 안에서 다 돌 때까지 같은 문제 없음 · 다시 섞어도 방금 것이 바로 또 안 나옴', () => {
  const rng = seeded(9);
  const s = shadowStart(0, FAKE, rng);
  const seen = [s.q.id];
  for (let k = 1; k < FAKE.length; k++) seen.push(shadowNext(s, 0, rng).id);
  assert.equal(new Set(seen).size, FAKE.length);
  let prev = s.q.id;
  for (let k = 0; k < 300; k++) {
    const q = shadowNext(s, 0, rng);
    assert.notEqual(q.id, prev, '같은 문제가 잇달아 나오지 않는다');
    assert.ok(q.choices.includes(q.id));
    prev = q.id;
  }
  // 보기가 넷이 안 되면 문제 없음
  assert.equal(shadowStart(0, FAKE.slice(0, 3), rng).q, null);
  assert.equal(shadowNext(shadowStart(0, [], rng), 0, rng), null);
});

test('👤 고르기 — 맞히면 ⭐ +1 · 틀리면 셈 없음(감점 없음) · 그림을 보여 주는 동안·보기에 없는 것·끝난 뒤는 안 받음 · 보여 준 뒤 다음 문제', () => {
  const rng = seeded(2);
  const s = shadowStart(1000, FAKE, rng);
  const q1 = s.q;
  const wrong = q1.choices.find((id) => id !== q1.id);
  assert.deepEqual(shadowPick(s, 999, 1100), { kind: 'busy' }, '보기에 없는 것');
  assert.deepEqual(shadowPick(s, q1.id, 1200), { kind: 'right', answer: q1.id, picked: q1.id, pts: 1 });
  assert.equal(shadowPick(s, q1.id, 1300).kind, 'busy', '두 번 못 받음');
  assert.deepEqual([s.score, s.right, s.miss, s.until], [1, 1, 0, 1200 + RIGHT_MS]);
  assert.equal(shadowTick(s, 1200 + RIGHT_MS - 1, rng), null);
  const q2 = shadowTick(s, 1200 + RIGHT_MS, rng);
  assert.ok(q2 && q2.n === 2 && s.phase === 'ask');
  const w2 = q2.choices.find((id) => id !== q2.id);
  const r = shadowPick(s, String(w2), 3000);
  assert.deepEqual(r, { kind: 'wrong', answer: q2.id, picked: w2, pts: 0 });
  assert.deepEqual([s.score, s.right, s.miss], [1, 1, 1], '틀려도 점수는 그대로');
  assert.equal(shadowTick(s, 3000 + RIGHT_MS, rng), null, '틀리면 그림을 더 오래 보여 준다');
  assert.ok(shadowTick(s, 3000 + WRONG_MS, rng));
  assert.ok(WRONG_MS > RIGHT_MS);
  assert.equal(shadowPick(s, s.q.id, s.end).kind, 'over');
  assert.equal(shadowTick(s, s.end + 9999, rng), null, '끝난 뒤엔 다음 문제 없음');
  assert.ok(wrong);
});

test('👤 40초 한 판 — 1초 만에 다 맞히면 20마리 넘게 · 다 틀려도 문제는 계속 나온다(⭐ 0)', () => {
  for (const seed of SEEDS.slice(0, 4)) {
    const rng = seeded(seed);
    const s = shadowStart(0, FAKE, rng);
    for (let t = 0; t <= SHADOW_SEC * 1000 + 500; t += 50) {
      if (s.phase === 'ask' && s.q && t - s.q.at >= 1000) shadowPick(s, s.q.id, t);
      shadowTick(s, t, rng);
    }
    assert.ok(s.score >= 20 && s.score <= 25, `seed ${seed}: ${s.score}`);
    assert.equal(s.miss, 0);
    const w = shadowStart(0, FAKE, rng);
    for (let t = 0; t <= SHADOW_SEC * 1000; t += 50) {
      if (w.phase === 'ask' && w.q && t - w.q.at >= 500) shadowPick(w, w.q.choices.find((id) => id !== w.q.id), t);
      shadowTick(w, t, rng);
    }
    assert.equal(w.score, 0);
    assert.ok(w.miss >= 15, `틀린 문제도 넘어간다 ${w.miss}`);
  }
});

test('👤 그림이 깨지면 셈 없이 다음 문제 — 깨진 포켓몬은 그 판의 문제·보기에서 빠짐 · 넷이 안 되면 문제 없음 · 보여 주는 중엔 안 넘김 · shadowShift (🔍 Codex 114차 #2)', () => {
  const rng = seeded(6);
  const s = shadowStart(0, FAKE, rng);
  const first = s.q.id;
  const q = shadowSkip(s, 10, rng);
  assert.ok(q && q.id !== first);
  assert.ok(!s.pool.some((p) => p.id === first), '깨진 포켓몬은 빠진다');
  for (let k = 0; k < 30; k++) {
    const n = shadowNext(s, 20, rng);
    assert.notEqual(n.id, first, '다시 문제로 안 나온다');
    assert.ok(!n.choices.includes(first), '보기에도 안 나온다');
  }
  assert.ok(shadowSkip(s, 30, rng), '다섯 → 넷: 아직 낼 수 있다');
  assert.equal(s.pool.length, 4);
  assert.equal(shadowSkip(s, 40, rng), null, '셋만 남으면 문제를 못 낸다');
  assert.equal(s.q, null, '그림 없는 문제를 내지 않는다');
  assert.deepEqual([s.score, s.miss, s.skips, s.bad.length], [0, 0, 3, 3]);
  assert.equal(shadowSkip(s, 50, rng), null, '문제가 없으면 그대로');
  const t = shadowStart(0, FAKE, rng);
  shadowPick(t, t.q.id, 100);
  assert.equal(shadowSkip(t, 150, rng), null, '그림을 보여 주는 중엔 안 넘김');
  shadowShift(t, 5000);
  assert.deepEqual([t.t0, t.end, t.until, t.q.at], [5000, 5000 + SHADOW_SEC * 1000, 5100 + RIGHT_MS, 5000]);
  const b = JSON.stringify(t);
  shadowShift(t, 0); shadowShift(t, -1); shadowShift(t, NaN);
  assert.equal(JSON.stringify(t), b);
});

// ───────────────────── 화면 (가짜 화면 · 가짜 시계) ─────────────────────

/** runRun·runShadow가 쓰는 것만 흉내 낸 가짜 화면 */
class FakeEl {
  constructor(tag) { this.tagName = String(tag).toUpperCase(); this.className = ''; this.children = []; this.listeners = {}; this.style = { setProperty() {} }; this.attrs = {}; this.textContent = ''; this.html = ''; }
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
/** 가짜 화면·가짜 시계를 깔고 한 판 → { stage, h, doc, adv, flush, st } */
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
  const adv = (ms, each) => { for (let k = 0; k < ms; k += 50) { clock += 50; t.mock.timers.tick(50); if (each) each(); } };
  const flush = () => new Promise((r) => setImmediate(r));
  const hide = (on) => { doc.hidden = on; doc.fire('visibilitychange'); };
  return { stage, h, doc, adv, flush, st, hide };
}

test('🏃 화면 — 「준비!」 때 앱을 40초 내려도 끝나지 않음 · 톡 하면 위로 · 물건이 나온다 · 30초 뒤 끝 · 듣기를 뗀다', async (t) => {
  const w = world(t, (stage) => runRun(stage, { rng: seeded(4), hero: { html: '<img class="gd-pal-img">' } }));
  const root = w.stage.children[0];
  const field = root.children[1];
  const layer = field.children[3];
  const me = field.children[5];
  assert.equal(me.children[0].innerHTML, '<img class="gd-pal-img">', '달리는 쪽은 파트너 그림');
  w.adv(400);
  w.hide(true);
  w.adv(40000);
  await w.flush();
  assert.equal(w.st.over, null, '숨은 동안 판이 끝나지 않는다');
  assert.equal(layer.children.length, 0, '숨은 동안 물건도 안 나온다');
  w.hide(false);
  w.adv(1500);
  assert.ok(layer.children.length > 0, '돌아오면 물건이 나온다');
  field.fire('pointerdown');
  w.adv(200);
  assert.match(me.style.transform, /^translate3d\(0, -\d+(\.\d)?px, 0\)$/, '톡 하면 위로');
  assert.ok(me.classList.contains('is-air'));
  w.adv(1500);
  assert.equal(me.style.transform, 'translate3d(0, 0.0px, 0)', '내려앉는다');
  w.adv(26000); // 돌아온 뒤 29.2초쯤
  await w.flush();
  assert.equal(w.st.over, null);
  w.adv(2500);
  await w.flush();
  assert.ok(w.st.over && w.st.over.quit === false, '끝까지 간다');
  assert.ok(Number.isSafeInteger(w.st.over.score) && w.st.over.score >= 0);
  assert.match(root.children[0].children[0].textContent, new RegExp(`^⭐ ${w.st.over.score}$`), '점수 칸과 같은 점수');
  assert.equal((w.doc.listeners.visibilitychange || []).length, 0, '끝나면 듣기를 뗀다');
});

test('🏃 화면 — 판 도중 그만두면(✕·집 닫기) 그때 점수로 · 그 뒤로 안 움직임', async (t) => {
  const w = world(t, (stage) => runRun(stage, { rng: seeded(2) }));
  const root = w.stage.children[0];
  w.adv(12000); // 땅 열매를 몇 개 먹을 만큼
  const shown = Number(root.children[0].children[0].textContent.replace('⭐ ', ''));
  assert.ok(shown > 0, `달리기만 해도 땅 열매 ${shown}`);
  w.h.stop();
  await w.flush();
  assert.deepEqual(w.st.over, { score: shown, quit: true });
  const me = root.children[1].children[5];
  const frozen = root.children[1].children[2].style.transform;
  root.children[1].fire('pointerdown');
  w.adv(2000);
  assert.equal(root.children[1].children[2].style.transform, frozen, '그만둔 뒤엔 땅도 안 흐른다');
  assert.equal(me.classList.contains('is-air'), false, '그만둔 뒤엔 안 뛴다');
  assert.equal((w.doc.listeners.visibilitychange || []).length, 0);
});

test('🏃 화면 — 꽈당·한 바퀴는 끝나면 꼴을 뗀다(다음 한 바퀴가 보이게 — 🔍 Codex 114차 #3) · 마당에 포커스가 있으면 키보드로 점프(꾹 누름은 한 번)', async (t) => {
  const w = world(t, (stage) => runRun(stage, { rng: seeded(3) }));
  const field = w.stage.children[0].children[1];
  const me = field.children[5];
  assert.equal(field.tabIndex, 0);
  assert.equal(field.attrs.role, 'button');
  let k = 0;
  while (!me.classList.contains('is-bonk') && k++ < 400) w.adv(50); // 안 누르면 곧 돌에 꽈당
  assert.ok(me.classList.contains('is-bonk'));
  me.fire('animationend', { animationName: 'gr-flip' });
  assert.ok(me.classList.contains('is-bonk'), '다른 움직임 끝으로는 안 뗌');
  me.fire('animationend', { animationName: 'gr-bonk' });
  assert.equal(me.classList.contains('is-bonk'), false);
  w.adv(1200); // 꽈당이 풀린 뒤
  field.fire('keydown', { key: 'a' });
  w.adv(50);
  assert.equal(me.classList.contains('is-air'), false, '다른 글쇠는 안 뜀');
  field.fire('keydown', { key: ' ' });
  w.adv(100);
  assert.ok(me.classList.contains('is-air'), '스페이스로 폴짝');
  field.fire('keydown', { key: ' ', repeat: true });
  assert.equal(me.classList.contains('is-flip'), false, '꾹 누름은 한 번 더가 아니다');
  field.fire('keydown', { key: 'ArrowUp' });
  assert.ok(me.classList.contains('is-flip'), '한 번 더 → 한 바퀴');
  me.fire('animationend', { animationName: 'gr-flip' });
  assert.equal(me.classList.contains('is-flip'), false);
  w.h.stop();
});

test('🏃 화면 — 「준비!」 때 그만두면 판이 안 열린다', async (t) => {
  const w = world(t, (stage) => runRun(stage, { rng: seeded(4) }));
  w.adv(300);
  w.h.stop();
  await w.flush();
  assert.deepEqual(w.st.over, { score: 0, quit: true });
  w.adv(3000);
  assert.equal(w.stage.children[0].children[1].children[3].children.length, 0, '그만둔 판은 안 열림');
  assert.equal((w.doc.listeners.visibilitychange || []).length, 0);
});

const POOL6 = FAKE;
test('👤 화면 — 이름 넷 · 맞히면 그림이 밝아지고 ⭐ · 틀리면 「정답은 ○○!」(점수 그대로) · 다음 문제 · 40초 뒤 끝', async (t) => {
  const w = world(t, (stage) => runShadow(stage, { pool: POOL6, rng: seeded(8), hero: { html: '<b>파트너</b>' } }));
  const root = w.stage.children[0];
  const [top, pic, list, pal] = root.children;
  const name = pic.children[1];
  const imgOf = () => pic.children[0].children[0];
  const btns = list.children;
  assert.equal(pal.innerHTML, '<b>파트너</b>');
  assert.ok(btns.every((b) => b.disabled), '「준비!」 동안은 못 누름');
  w.adv(850);
  const img = imgOf();
  assert.ok(btns.every((b) => b.textContent), '시작하면 이름 넷');
  assert.equal(new Set(btns.map((b) => b.textContent)).size, 4);
  assert.ok(btns.every((b) => b.disabled) && img.classList.contains('is-wait'), '그림이 뜨기 전엔 감추고 못 누름 (🔍 Codex 114차 #1)');
  img.fire('load');
  assert.ok(btns.every((b) => !b.disabled) && !img.classList.contains('is-wait'), '그림이 뜨면 누를 수 있다');
  assert.ok(img.classList.contains('is-dark'), '처음엔 그림자');
  assert.match(img.src, /^u\d$/);
  const id = Number(img.src.slice(1));
  const ko = POOL6.find((p) => p.id === id).ko;
  btns.find((b) => b.textContent === ko).fire('click');
  assert.equal(img.classList.contains('is-dark'), false, '맞히면 그림이 짠');
  assert.equal(name.textContent, `${ko}!`);
  assert.equal(top.children[0].textContent, '⭐ 1');
  assert.ok(btns.every((b) => b.disabled), '보여 주는 동안은 못 누름');
  assert.ok(btns.find((b) => b.textContent === ko).classList.contains('is-right'));
  w.adv(RIGHT_MS + 100);
  const img2 = imgOf();
  assert.notEqual(img2, img, '문제마다 새 그림');
  assert.ok(img2.classList.contains('is-dark') && img2.classList.contains('is-wait'), '다음 문제는 감춘 그림자부터');
  assert.equal(name.textContent, '');
  const id2 = Number(img2.src.slice(1));
  const ko2 = POOL6.find((p) => p.id === id2).ko;
  // 그림이 뜨기 전에 누르면 아무 일도 없다
  btns.find((b) => b.textContent === ko2).fire('click');
  assert.equal(top.children[0].textContent, '⭐ 1', '뜨기 전 누름은 안 셈');
  img.fire('load'); // 앞 문제 그림의 늦은 load
  assert.ok(btns.every((b) => b.disabled), '앞 그림의 늦은 load로는 안 켜진다');
  img2.fire('load');
  assert.ok(btns.every((b) => !b.disabled));
  const wrongBtn = btns.find((b) => b.textContent !== ko2);
  wrongBtn.fire('click');
  assert.equal(name.textContent, `정답은 ${ko2}!`);
  assert.ok(wrongBtn.classList.contains('is-picked'));
  assert.ok(btns.find((b) => b.textContent === ko2).classList.contains('is-right'));
  assert.equal(top.children[0].textContent, '⭐ 1', '틀려도 점수 그대로');
  w.adv(WRONG_MS + 100);
  imgOf().fire('load');
  assert.ok(btns.some((b) => !b.disabled));
  // 앱을 내렸다 돌아와도 남은 시간 그대로
  w.hide(true);
  w.adv(60000);
  await w.flush();
  assert.equal(w.st.over, null);
  w.hide(false);
  w.adv(SHADOW_SEC * 1000 - 3000);
  await w.flush();
  assert.equal(w.st.over, null);
  w.adv(3500);
  await w.flush();
  assert.deepEqual(w.st.over, { score: 1, quit: false });
  assert.ok(btns.every((b) => b.disabled), '끝나면 못 누름');
  assert.equal((w.doc.listeners.visibilitychange || []).length, 0);
});

test('👤 화면 — 그림이 깨지면 셈 없이 다음 문제 · 넷이 안 되게 깨지면 「그림을 불러오지 못했어요」로 한 번만 끝 (🔍 Codex 114차 #2)', async (t) => {
  const w = world(t, (stage) => runShadow(stage, { pool: POOL6.slice(0, 5), rng: seeded(8) }));
  w.adv(850);
  const root = w.stage.children[0];
  const pic = root.children[1];
  const btns = root.children[2].children;
  const imgOf = () => pic.children[0].children[0];
  const a = imgOf();
  a.fire('error');
  const b = imgOf();
  assert.notEqual(b, a, '깨진 그림은 넘긴다');
  assert.ok(b.classList.contains('is-dark') && b.classList.contains('is-wait'));
  a.fire('error'); // 앞 그림의 늦은 error는 무시
  assert.equal(imgOf(), b);
  assert.equal(root.children[0].children[0].textContent, '⭐ 0');
  let resolved = 0;
  w.h.done.then(() => { resolved += 1; });
  b.fire('error'); // 다섯 → 넷 → 셋: 더는 못 낸다
  assert.equal(pic.children[0].children.length, 0, '그림 없는 문제를 내지 않는다');
  assert.equal(pic.children[1].textContent, '그림을 불러오지 못했어요');
  assert.ok(btns.every((x) => x.disabled), '찍을 단추도 없다');
  w.adv(1500);
  await w.flush();
  assert.deepEqual(w.st.over, { score: 0, quit: false });
  w.h.stop();
  await w.flush();
  assert.equal(resolved, 1, '끝은 한 번만');
});

test('👤 화면 — 그림이 너무 늦으면(1.5초) 깨진 것으로 넘김 · 앱을 내려 둔 동안은 기다림에 안 셈', async (t) => {
  const w = world(t, (stage) => runShadow(stage, { pool: POOL6, rng: seeded(3) }));
  w.adv(850);
  const pic = w.stage.children[0].children[1];
  const imgOf = () => pic.children[0].children[0];
  const a = imgOf();
  w.adv(700);
  w.hide(true);
  w.adv(5000);
  w.hide(false);
  w.adv(300);
  assert.equal(imgOf(), a, '내려 둔 5초는 안 센다');
  w.adv(LOAD_MS);
  assert.notEqual(imgOf(), a, '1.5초가 넘으면 다음 문제');
  imgOf().fire('load');
  assert.ok(w.stage.children[0].children[2].children.every((x) => !x.disabled));
});

test('👤 화면 — 보기가 넷이 안 되면 빈 판으로 바로 끝 (판은 gameview가 쓰기 전에 막는다)', async (t) => {
  const v = world(t, (stage) => runShadow(stage, { pool: POOL6.slice(0, 3), rng: seeded(8) }));
  v.adv(850);
  await v.flush();
  v.adv(1000);
  await v.flush();
  assert.deepEqual(v.st.over, { score: 0, quit: false });
});
