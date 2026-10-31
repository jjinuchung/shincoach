// v373 🌀 쏙쏙! 파트너 모험 (2026-10-31 아버님 「별의 커비 같은 게임」 → 기본안 「추천대로」) — node --test tests/gamessok373.test.js
//  엔진은 순수(시각·rng만) — 가짜 시계로 끝까지 돌려 본다: 안 눌러도 늘 끝남 · 둥실로 모든 구덩이를 건넘 · 빨아들이기·뱉기 · 능력 셋 · 꽈당과 능력 별 · 🤖 보스(별만으로도 이김 · 시간이 다 되면 도망)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ssokStart, ssokStage, ssokTick, ssokLeft, ssokLeftUp, ssokRight, ssokRightUp, ssokDrop, ssokShift, ssokCam, ssokHurry, runSsok,
  CHUNKS, CHUNK_N, BOSS, ARENA, SSOK_KINDS, SUCK_LEN, CEIL, FALL_SLOW, LOST_MS, STONE_MS, ROCK_CD_MS, MAX_MS, SSOK_SEC, chunkLevel,
  FRIENDS, FRIEND_MAX, FRIEND_HELP, FORCED, MOUTHFUL_MS, BALL_V, WALK_V, ssokFriendPick, ssokEndText,
} from '../js/gamessok.js';
import { GROUND, ME } from '../js/gameadv.js';
import { ROSTER } from '../js/pokemon.js';
import { GAMES } from '../js/minigame.js';
import { GAME_SONGS } from '../js/gamesong.js';
import { readFileSync } from 'node:fs';

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
/** 16ms씩 돌리며 policy(s, t)가 누르고 뗀다 — 끝나거나 ms가 지나면 멈춘다 → 모은 일 */
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
/** 시험용 메카 하나 — 내 앞 dx칸에 (ab = 능력) */
let nn = 1000;
const mecha = (s, dx, ab = null, y = GROUND) => {
  const k = SSOK_KINDS.mecha;
  const m = { n: ++nn, x: s.x + ME.w + dx, y, w: k.w, h: k.h, a: -1e9, b: 1e9, ab, vx: 0, pull: false };
  s.mechas.push(m);
  return m;
};
/** 아무것도 없는 평지 — 열매도 치운다(점수를 셀 때 섞이지 않게) */
const flat = (seed = 1) => {
  const s = ssokStart(0, seeded(seed), ['row', 'row', 'row']);
  s.fruits = [];
  return s;
};

test('🌀 게임 목록 · 음악 (v373): 열여섯째 쏙쏙! 파트너 모험 · 60초 · 달려라 파트너 곡 · 이름에 「커비」 없음', () => {
  const g = GAMES.find((x) => x.id === 'ssok');
  assert.ok(g);
  assert.deepEqual([g.emoji, g.ko, g.sec], ['🌀', '쏙쏙! 파트너 모험', SSOK_SEC]);
  assert.equal(GAMES.length, 16);
  assert.ok(GAME_SONGS.find((x) => x.id === 'run').games.includes('ssok'));
  const src = readFileSync(new URL('../js/gamessok.js', import.meta.url), 'utf8');
  assert.ok(!/커비|kirby|디디디|와들디/i.test(src.replace(/『별의 커비』/g, '')), '이름·캐릭터는 쓰지 않는다 (머리말의 아버님 말씀 하나만)');
  assert.ok(!/커비|kirby/i.test(JSON.stringify(g)));
});

test('🗺️ 길 (v373): 조각 열 · 처음 셋은 쉬움 · 둘째는 늘 능력 메카 조각 · 싸움터는 길 끝 한 화면 · 같은 조각이 잇달아 나오지 않음', () => {
  for (let seed = 1; seed <= 400; seed++) {
    const st = ssokStage(seeded(seed));
    assert.equal(st.chunks.length, CHUNK_N);
    assert.ok(CHUNKS.find((c) => c.id === st.chunks[1]).ab, `${seed} 둘째 조각 ${st.chunks[1]}`);
    for (const i of [0, 2]) assert.equal(CHUNKS.find((c) => c.id === st.chunks[i]).lv, 0, `${seed} ${i}째`);
    for (let i = 2; i < st.chunks.length; i++) assert.notEqual(st.chunks[i], st.chunks[i - 1], `${seed} 잇달아 ${st.chunks[i]}`);
    for (let i = 0; i < st.chunks.length; i++) assert.ok(CHUNKS.find((c) => c.id === st.chunks[i]).lv <= chunkLevel(i) || i === 1);
    assert.equal(st.len, st.arenaX + ARENA.len);
    assert.ok(st.pits.every(([a, b]) => b < st.arenaX - 10), '싸움터 앞에는 구덩이가 없다');
    assert.ok(st.mechas.filter((m) => m.ab).length >= 1, '능력 메카가 하나 이상');
    for (const m of [...st.mechas, ...st.drones]) assert.ok(m.a <= m.x && m.x <= m.b, `${seed} 다니는 길 안에서 시작`);
  }
});

test('⏱️ 안 눌러도 늘 끝 (v373): 피죤이 구덩이·높은 곳을 도와 싸움터까지 · 🤖 보스는 20초 뒤 도망 · 150초 안 · ⭐는 0 이상', () => {
  let worst = 0;
  for (let seed = 1; seed <= 120; seed++) {
    const s = ssokStart(0, seeded(seed));
    const evs = play(s, MAX_MS);
    assert.ok(s.done, `${seed} 끝`);
    assert.ok(s.boss && s.fled && !s.win, `${seed} 보스까지 갔다가 도망`);
    assert.equal(all(evs, 'boss').length, 1);
    assert.ok(s.score >= 0);
    worst = Math.max(worst, s.doneAt);
  }
  assert.ok(worst < 100000, `가장 오래 걸린 판 ${Math.round(worst / 1000)}초`);
});

test('⏱️ 능력을 계속 눌러도 판 길이는 그대로 (v373): 🪨 돌이어도 걷는다(멈추면 100초를 넘었다) · 바위 기술 사이는 더 길다 · 🔥·⚡도', () => {
  for (const ab of ['rock', 'fire', 'elec']) {
    for (let seed = 1; seed <= 20; seed++) {
      const s = ssokStart(0, seeded(seed));
      s.ability = ab;
      play(s, MAX_MS, (x, t) => { if (!x.ability) x.ability = ab; if (t >= x.cdUntil) { ssokRight(x, t); ssokRightUp(x, t); } });
      assert.ok(s.done && s.doneAt < 80000, `${ab} ${seed} ${Math.round(s.doneAt / 1000)}초`);
    }
  }
  const r = flat();
  r.ability = 'rock';
  ssokRight(r, r.last);
  assert.equal(r.cdUntil - r.last, ROCK_CD_MS);
  play(r, 32);
  const x0 = r.x;
  play(r, 300);
  assert.ok(r.last < r.stoneUntil && r.x > x0 + 3, '돌인 동안에도 앞으로');
});

test('🫧 둥실 (v373): 꾹 누른 채 뛰면 꼭대기 근처에서 둥실 · 꼭대기 CEIL을 넘지 않음 · 떼면 천천히(FALL_SLOW) · 톡은 그냥 폴짝', () => {
  const s = flat();
  play(s, 200);
  assert.equal(ssokLeft(s, s.last), 'jump');
  const evs = play(s, 4000);
  assert.ok(all(evs, 'puffed').length >= 1 && s.puffed);
  assert.ok(Math.abs(s.y - CEIL) < 0.01, `꼭대기 ${s.y}`);
  ssokLeftUp(s, s.last);
  play(s, 1500);
  assert.ok(s.vy >= -FALL_SLOW - 0.01 && !s.onGround, '천천히 내려온다');
  const t = flat(2);
  play(t, 200);
  ssokLeft(t, t.last);
  play(t, 80);
  ssokLeftUp(t, t.last);
  play(t, 1200);
  assert.ok(t.onGround && !t.puffed, '톡 — 둥실 없이 내려앉음');
});

test('🕳️ 구덩이 (v373): 가장자리에서 폴짝하고 꾹 누르고 있으면 넓은 구덩이도 건넌다(피죤 없이) · 폴짝한 뒤 공중에서 톡 한 번(둥실 — 천천히 내려옴)이면 좁은 구덩이는 건넌다', () => {
  for (const id of ['pit', 'widepit', 'pitmecha']) {
    const s = ssokStart(0, seeded(3), [id]);
    const [a, b] = s.stage.pits[0];
    const holdUntil = b + 2;
    play(s, 30000, (x, t) => {
      if (!x.held && x.onGround && x.x + ME.w >= a - 1 && x.x < a) ssokLeft(x, t);
      if (x.held && x.x > holdUntil) ssokLeftUp(x, t);
    });
    assert.equal(s.rescues, 0, `${id} 피죤 없이`);
  }
  const s = ssokStart(0, seeded(4), ['pit']);
  const [a] = s.stage.pits[0];
  let step = 0;
  play(s, 30000, (x, t) => {
    if (step === 0 && x.onGround && x.x + ME.w >= a - 1) { ssokLeft(x, t); step = 1; return; }
    if (step === 1) { ssokLeftUp(x, t); step = 2; return; } // 톡 — 그냥 폴짝
    if (step === 2 && t - x.jumpAt >= 350) { ssokLeft(x, t); step = 3; return; } // 꼭대기쯤에서 공중 톡 → 둥실
    if (step === 3) { ssokLeftUp(x, t); step = 4; }
  });
  assert.equal(s.rescues, 0, '폴짝 + 공중 톡 — 천천히 내려와 건넌다');
  // 둥실 없이 톡 폴짝만 하면 넓은 구덩이에는 빠진다(그래도 🐦 피죤이 건너편에)
  const w = ssokStart(0, seeded(4), ['widepit']);
  const [wa] = w.stage.pits[0];
  let jumped = false;
  play(w, 30000, (x, t) => {
    if (!jumped && x.onGround && x.x + ME.w >= wa - 1) { ssokLeft(x, t); ssokLeftUp(x, t); jumped = true; }
  });
  assert.equal(w.rescues, 1);
});

test('🌀 빨아들이기 → ⭐ 뱉기 (v373): 꾹 누르면 앞의 메카가 끌려와 입에 · 톡 하면 별 · 별이 앞의 메카를 펑(+2) · 바람 밖은 안 끌려옴', () => {
  const s = flat();
  const near = mecha(s, 12);
  const farM = mecha(s, SUCK_LEN + 30);
  assert.equal(ssokRight(s, s.last), 'suck');
  let evs = play(s, 1500);
  assert.equal(s.mouth, 'mecha');
  assert.ok(!s.mechas.includes(near) && s.mechas.includes(farM), '바람 밖 메카는 그대로');
  assert.equal(all(evs, 'mouthed')[0].pts, 2);
  ssokRightUp(s, s.last);
  assert.equal(ssokRight(s, s.last), 'spit');
  evs = play(s, 1500);
  assert.equal(s.mouth, null);
  const k = all(evs, 'killed');
  assert.deepEqual(k.map((x) => [x.o.n, x.by, x.pts]), [[farM.n, 'star', 2]]);
  assert.equal(s.score, 4);
});

test('🔥 능력 메카 (v373): 빨아들이면 바로 능력(삼키기 없음) · 불꽃탄이 덤불을 태워 ✨ · ✨를 먹으면 +3 · 별은 덤불에 막힘', () => {
  const s = ssokStart(0, seeded(5), ['fire']);
  const bush = s.blocks[0];
  play(s, 30000, (x, t) => {
    if (!x.ability && !x.sucking && x.mechas.some((m) => m.x - (x.x + ME.w) < 14)) ssokRight(x, t);
    if (x.ability && x.sucking) ssokRightUp(x, t);
    if (x.ability && x.blocks.length && bush.x - (x.x + ME.w) < 30 && t >= x.cdUntil) ssokRight(x, t);
    if (x.ability && x.sucking) ssokRightUp(x, t);
    if (x.x > bush.x + 20) x.done = true; // 덤불 뒤까지 — 시험만 여기서 멈춘다
  });
  assert.equal(s.abilities, 1);
  assert.equal(s.ability, 'fire');
  assert.equal(s.opened, 1, '덤불을 태웠다');
  assert.equal(s.golds, 1, '숨은 ✨');
  // 별은 덤불을 못 태운다
  const t = ssokStart(0, seeded(5), ['fire']);
  t.mechas = [];
  t.mouth = 'mecha';
  t.x = t.blocks[0].x - ME.w - 20;
  ssokRight(t, t.last);
  const evs = play(t, 600);
  assert.ok(all(evs, 'thud').length >= 1 && t.blocks.length === 1);
});

test('⚡ 전기 (v373): 번개는 앞의 가장 가까운 적 — 높이 나는 드론도 · 50칸 밖이면 헛방 · 기술 사이 0.6초', () => {
  const s = flat();
  s.ability = 'elec';
  const d = { n: ++nn, x: s.x + ME.w + 20, y: GROUND + 36, w: 8, h: 5, a: -1e9, b: 1e9, y0: GROUND + 36, vx: 0, pull: false };
  s.drones.push(d);
  assert.equal(ssokRight(s, s.last), 'move');
  let evs = play(s, 32);
  assert.deepEqual(all(evs, 'killed').map((k) => [k.o.n, k.by]), [[d.n, 'zap']]);
  assert.equal(ssokRight(s, s.last), 'wait', '기술 사이');
  play(s, 700);
  mecha(s, 80);
  assert.equal(ssokRight(s, s.last), 'move');
  evs = play(s, 32);
  assert.equal(all(evs, 'killed').length, 0);
  assert.ok(all(evs, 'zap')[0].miss, '헛방');
});

test('🪨 바위 (v373): 공중에서 쿵 떨어짐 · 돌인 동안 메카에 닿아도 펑(꽈당 없음) · 내려앉으면 바위가 굴러가 금 간 바위를 깨고 ✨', () => {
  const s = ssokStart(0, seeded(6), ['rock']);
  s.mechas = [];
  s.ability = 'rock';
  const crack = s.blocks[0];
  s.x = crack.x - ME.w - 30;
  ssokLeft(s, s.last);
  play(s, 200);
  ssokLeftUp(s, s.last);
  mecha(s, -6, null, s.y - 4);
  assert.equal(ssokRight(s, s.last), 'move');
  const evs = play(s, 2500);
  assert.equal(s.bumps, 0, '돌은 안 다친다');
  assert.ok(all(evs, 'killed').some((k) => k.by === 'stone' || k.by === 'rock'));
  assert.ok(all(evs, 'rocked').length === 1);
  assert.equal(s.opened, 1, '금 간 바위를 깼다');
  assert.ok(s.stoneUntil - s.last < STONE_MS);
});

test('💫 꽈당과 능력 별 (v373): 부딪히면 1초 멈칫 · 능력은 별이 되어 앞으로 · 3초 안에 빨아들이면 돌아옴 · 3초 지나면 사라짐 · 내려놓기도 별로', () => {
  const s = flat();
  s.ability = 'fire';
  mecha(s, 0);
  let evs = play(s, 300);
  assert.equal(s.bumps, 1);
  assert.equal(s.ability, null);
  assert.equal(all(evs, 'lost')[0], 'fire');
  assert.ok(s.lost && s.lost.x > s.x + ME.w);
  play(s, 900); // 멈칫이 끝날 때까지
  ssokRight(s, s.last);
  evs = play(s, 1500);
  assert.equal(all(evs, 'regained')[0], 'fire');
  assert.equal(s.ability, 'fire');
  // 3초 지나면 사라짐
  const t = flat(7);
  t.ability = 'rock';
  assert.equal(ssokDrop(t), 'drop');
  evs = play(t, 100);
  assert.ok(all(evs, 'dropped').length === 1 && t.lost && !t.ability);
  t.x -= 1e6; // 멀리 — 닿지 않게
  evs = play(t, LOST_MS + 100);
  assert.ok(all(evs, 'lostGone').length === 1 && !t.lost);
  assert.equal(ssokDrop(t), 'none');
});

test('⚡ 찌리리공 (v373): 빨려 오지 않는다 · 닿으면 찌릿 꽈당 · 입에 문 것은 놓친다', () => {
  const s = flat();
  const v = { n: ++nn, x: s.x + ME.w + 8, y: GROUND, w: 6, h: 6 };
  s.volts.push(v);
  s.mouth = null;
  ssokRight(s, s.last);
  play(s, 200);
  assert.ok(s.volts.includes(v) && !v.pull, '안 빨려 온다');
  ssokRightUp(s, s.last);
  s.mouth = 'mecha';
  const evs = play(s, 1500);
  assert.equal(all(evs, 'hurt')[0].kind, 'volt');
  assert.ok(all(evs, 'spilled').length === 1 && !s.mouth);
});

/** 🤖 싸움터 바로 앞에 세운다 */
const toArena = (seed = 8) => {
  const s = ssokStart(0, seeded(seed), ['row']);
  s.mechas = []; s.drones = []; s.volts = []; s.fruits = []; s.blocks = [];
  s.x = s.stage.arenaX + ME.screen - 2;
  play(s, 300);
  assert.ok(s.boss);
  return s;
};
/** ⚡ 찌리리공이 코앞(3칸)에 오면 톡 폴짝 — 아이가 하듯이(꾹 누르면 천장까지 떠서 내려오는 동안 볼트를 놓친다) */
const dodge = (x, t) => {
  if (x.onGround && x.rollers.some((r) => r.kind === 'ball' && r.x > x.x && r.x - (x.x + ME.w) < 3)) { ssokLeft(x, t); ssokLeftUp(x, t); }
};

test('🤖 보스 — 별만으로 이긴다 (v373): 굴러오는 볼트를 빨아들여 되뱉으면 2칸 · ⚡ 찌리리공은 폴짝 넘는다 · 20초 안에 이기면 ⭐10 + 남은 5초마다 1', () => {
  const s = toArena();
  assert.equal(ssokCam(s), s.stage.arenaX);
  assert.ok(ssokHurry(s));
  const s0 = s.score;
  const evs = play(s, BOSS.ms + 2000, (x, t) => {
    dodge(x, t);
    if (x.mouth) { if (x.sucking) ssokRightUp(x, t); else ssokRight(x, t); return; }
    if (!x.sucking) ssokRight(x, t);
  });
  assert.ok(s.win, `이김 · 체력 ${s.boss.hp} · 꽈당 ${s.bumps}`);
  assert.ok(s.doneAt - s.boss.t0 < 15000, `${Math.round((s.doneAt - s.boss.t0) / 100) / 10}초`);
  const won = BOSS.win + Math.floor((s.boss.until - s.doneAt) / BOSS.bonusMs);
  assert.equal(all(evs, 'won')[0], won);
  assert.equal(s.bossDmg, BOSS.hp);
  assert.equal(s.score - s0, won, '보스 몫은 모두 ⭐10 + 빨리 이긴 덤 — 깎은 ⭐에 ⭐10을 또 얹지 않는다 (🔍 Codex 177차 P1)');
  assert.ok(!ssokHurry(s));
});

test('🤖 보스 — 🔥 불꽃이면 더 빨리 (v373) · 시간이 다 되면 「도망갔다!」 깎은 칸만큼만 ⭐', () => {
  const s = toArena(9);
  s.ability = 'fire';
  const s0 = s.score;
  play(s, BOSS.ms + 2000, (x, t) => { dodge(x, t); if (t >= x.cdUntil && x.ability) { ssokRight(x, t); ssokRightUp(x, t); } });
  assert.ok(s.win && s.doneAt - s.boss.t0 < 9000, `${Math.round((s.doneAt - s.boss.t0) / 100) / 10}초`);
  assert.equal(s.score - s0, s.bossPts);
  assert.equal(s.bossPts, BOSS.win + Math.floor((s.boss.until - s.doneAt) / BOSS.bonusMs));
  const t = toArena(10);
  const before = t.score;
  const evs = play(t, BOSS.ms + 2000);
  assert.ok(t.fled && !t.win && all(evs, 'fled').length === 1);
  assert.equal(t.score - before, t.bossDmg);
  assert.deepEqual(all(evs, 'thrown').slice(0, 6).map((r) => r.kind), ['bolt', 'bolt', 'ball', 'bolt', 'bolt', 'ball'], '셋째마다 ⚡ 찌리리공');
});

test('🤖 보스가 굴린 것 (v373): ⭐ 별은 지나친다(볼트를 아껴 빨아들이게) · 🔥 불꽃탄은 부수며 지나가 보스에 · ⚡ 몸 둘레 번개는 코앞 볼트를 친다', () => {
  const roller = (s, dx, kind = 'bolt') => {
    const k = SSOK_KINDS[kind];
    const r = { n: ++nn, kind, x: s.x + ME.w + dx, y: GROUND, w: k.w, h: k.h, vx: 0, pull: false };
    s.rollers.push(r);
    return r;
  };
  const a = toArena(12);
  a.boss.nextAt = 1e12; // 시험만 — 새로 굴리지 않게
  const b1 = roller(a, 12);
  a.mouth = 'bolt';
  const sc = a.score;
  ssokRight(a, a.last);
  ssokRightUp(a, a.last); // 톡 — 누르고 있으면 입이 빈 뒤 그 볼트를 다시 빨아들인다
  let evs = play(a, 1200);
  assert.ok(a.rollers.includes(b1), '별은 볼트를 지나친다');
  assert.deepEqual(all(evs, 'bossHit'), [BOSS.star]);
  assert.equal(a.score - sc, BOSS.star, '깎은 칸마다 ⭐1');
  a.x += 30; // 혹시 싸움터 자리를 넘어서도 화면은 싸움터에 멈춰 있다
  assert.equal(ssokCam(a), a.stage.arenaX);
  const f = toArena(13);
  f.boss.nextAt = 1e12;
  const b2 = roller(f, 12, 'ball');
  f.ability = 'fire';
  ssokRight(f, f.last);
  evs = play(f, 1200);
  assert.ok(!f.rollers.includes(b2) && all(evs, 'killed').some((k) => k.o === b2 && k.by === 'fire'), '불꽃탄은 찌리리공도 밀어낸다');
  assert.deepEqual(all(evs, 'bossHit'), [BOSS.move]);
  const z = toArena(14);
  z.boss.nextAt = 1e12;
  const b3 = roller(z, 4);
  z.ability = 'elec';
  ssokRight(z, z.last);
  evs = play(z, 100);
  assert.ok(all(evs, 'ring').length === 1 && all(evs, 'killed').some((k) => k.o === b3 && k.by === 'zap'));
  assert.deepEqual(all(evs, 'bossHit'), [BOSS.move], '앞으로는 보스에 번개');
});

test('⏸️ 멈춤 (v373): 앱을 내린 만큼 시각을 민다 — 보스 시간·꽈당·능력 별 시간도', () => {
  const s = toArena(11);
  s.stumbleUntil = s.last + 500;
  s.lost = { n: ++nn, ab: 'fire', x: s.x + 20, y: GROUND, w: 6, h: 6, vy: 0, until: s.last + 1000, pull: false };
  const b = { ...s.boss };
  ssokShift(s, 5000);
  assert.equal(s.boss.until, b.until + 5000);
  assert.equal(s.boss.nextAt, b.nextAt + 5000);
  assert.equal(s.lost.until, s.last + 1000);
  assert.equal(s.stumbleUntil, s.last + 500);
});

// ───── 2단계 (10-31 아버님 「다음 2단계 가자」) — 🔒 로켓단 우리 · 🤝 친구 · 🔴 큰 몬스터볼 머금기 ─────

test('🤝 친구 명단 (v373 2단계): 1·2세대 작은 포켓몬 20 · 앱 명단(ROSTER)과 이름이 같다 · 한 판에 겹치지 않게 셋', () => {
  assert.equal(FRIENDS.length, 20);
  assert.equal(new Set(FRIENDS.map((f) => f.id)).size, 20);
  for (const f of FRIENDS) {
    assert.ok(f.id >= 1 && f.id <= 251, `${f.ko} 1·2세대`);
    assert.equal((ROSTER.find((r) => r.id === f.id) || {}).ko, f.ko, `${f.id} 이름`);
  }
  for (let seed = 1; seed <= 300; seed++) {
    const p = ssokFriendPick(seeded(seed));
    assert.equal(p.length, FRIEND_MAX);
    assert.equal(new Set(p.map((f) => f.id)).size, FRIEND_MAX);
  }
});

test('🗺️ 길 (v373 2단계): 🔒 우리는 셋째·다섯째·여덟째 · 🔴 몬스터볼은 일곱째 · 다른 자리엔 안 나옴 · 우리 앞엔 늘 보통 메카(뱉을 별)', () => {
  assert.deepEqual(FORCED, { 1: 'ab', 2: 'cage', 4: 'cage', 6: 'mball', 7: 'cage' });
  for (let seed = 1; seed <= 300; seed++) {
    const st = ssokStage(seeded(seed));
    assert.deepEqual([st.chunks[2], st.chunks[4], st.chunks[6], st.chunks[7]], ['cage', 'cage', 'mball', 'cage'], `${seed}`);
    assert.equal(st.chunks.filter((c) => c === 'cage').length, 3);
    assert.equal(st.chunks.filter((c) => c === 'mball').length, 1);
    assert.deepEqual(st.cages.map((c) => c.fi), [0, 1, 2], '몇째 친구');
    assert.equal(st.mballs.length, 1);
    for (const c of st.cages) assert.ok(st.mechas.some((m) => !m.ab && m.x < c.x && c.x - m.x < 40), `${seed} 우리 앞 보통 메카`);
  }
});

/** 🔒 우리 하나뿐인 길 — 앞의 메카는 치우고 우리만 */
const cageOnly = (seed = 30) => {
  const s = ssokStart(0, seeded(seed), ['cage']);
  s.mechas = [];
  s.fruits = [];
  return s;
};

test('🔒 우리 (v373 2단계): 그루터기처럼 막는다(안 열면 피죤이 넘겨 줌 — 친구는 못 구함) · ⭐ 별·🔥·🪨·⚡ 무엇이든 맞히면 열림 · 친구 ⭐3', () => {
  const a = cageOnly();
  const cx = a.cages[0].x;
  play(a, 12000, (x) => { if (x.x > cx + 15) x.done = true; }); // 시험만 — 우리를 지나면 멈춘다
  assert.ok(a.helps >= 1 && a.freed.length === 0 && a.cages.length === 1, '안 열면 피죤이 넘겨 준다');
  for (const how of ['star', 'fire', 'rock', 'elec']) {
    const s = cageOnly();
    const c = s.cages[0];
    s.x = c.x - ME.w - 18;
    if (how === 'star') s.mouth = 'mecha'; else s.ability = how;
    const sc = s.score;
    ssokRight(s, s.last);
    ssokRightUp(s, s.last);
    const evs = play(s, 1500);
    assert.deepEqual(all(evs, 'freed').map((f) => [f.fi, f.pts]), [[0, 3]], how);
    assert.ok(s.score - sc >= 3 && s.freed.length === 1 && s.cages.length === 0, how);
  }
});

/** 🔴 몬스터볼 앞 gap칸 — 꾹 빨아들인다 (바람 끝은 SUCK_LEN칸) */
const atBall = (ids = ['mball'], seed = 31, gap = 12) => {
  const s = ssokStart(0, seeded(seed), ids);
  const b = s.mballs[0];
  s.x = b.x - ME.w - gap;
  return s;
};

test('🔴 몬스터볼 머금기 (v373 2단계): 빨아들이면 3초 데굴데굴 — 걷기보다 빠름 · 닿는 메카 펑 · 찌리리공은 굴러감 · 안 다침 · 그동안 빨아들이기·뱉기·둥실 없음 · 3초 뒤 퐁', () => {
  const s = atBall();
  ssokRight(s, s.last);
  let evs = play(s, 800);
  assert.ok(all(evs, 'mouthful').length === 1 && s.rollUntil > s.last, '머금었다');
  ssokRightUp(s, s.last);
  assert.equal(ssokRight(s, s.last), 'roll');
  ssokRightUp(s, s.last);
  const x0 = s.x;
  evs = play(s, MOUTHFUL_MS);
  assert.ok(all(evs, 'mouthfulEnd').length === 1 && s.rollUntil === 0, '3초 뒤 퐁');
  assert.ok(s.x - x0 > WALK_V * 3 * 1.8, `빨리 굴러감 ${Math.round(s.x - x0)}칸`);
  assert.ok(all(evs, 'killed').filter((k) => k.by === 'ball').length >= 2, '메카 둘을 쓰러뜨림');
  assert.ok(all(evs, 'rolled').length >= 1, '찌리리공은 굴러감');
  assert.equal(s.bumps, 0, '굴러가는 동안 안 다침');
  // 둥실 없음 · 능력이 있으면 몬스터볼을 못 빨아들인다
  const p = atBall();
  ssokRight(p, p.last);
  play(p, 800);
  ssokRightUp(p, p.last);
  ssokLeft(p, p.last);
  play(p, 400);
  assert.ok(!p.puffed, '머금은 동안 둥실 없음');
  const q = atBall();
  q.ability = 'fire';
  ssokRight(q, q.last);
  ssokRightUp(q, q.last);
  q.sucking = true;
  play(q, 800);
  assert.ok(q.mballs.length === 1 && !q.rollUntil, '능력이 있으면 몬스터볼을 못 머금는다');
});

test('🔴 굴러가며 깨고 연다 (v373 2단계): 덤불·금 간 바위는 깨고(✨) · 🔒 우리는 열어 친구 · 그루터기는 그대로 막는다 · 몬스터볼 다음 조각의 우리까지 굴러간다', () => {
  for (const [ids, want, gap] of [[['mball', 'blocks'], 'opened', 2], [['mball', 'cage'], 'freed', 2], [['mball', 'blocks'], 'opened', SUCK_LEN - 1], [['mball', 'cage'], 'freed', SUCK_LEN - 1]]) {
    const s = atBall(ids, 31, gap);
    s.mechas = s.mechas.filter((m) => m.x < s.mballs[0].x + 80); // 몬스터볼 조각의 메카만
    ssokRight(s, s.last);
    play(s, 800);
    ssokRightUp(s, s.last);
    const evs = play(s, MOUTHFUL_MS);
    if (want === 'opened') assert.equal(all(evs, 'opened').length, 2, '덤불·금 간 바위 둘 다');
    else assert.deepEqual(all(evs, 'freed').map((f) => f.by), ['ball'], '굴러가서 우리를 열었다');
  }
  const t = atBall(['mball', 'stump']);
  ssokRight(t, t.last);
  play(t, 800);
  ssokRightUp(t, t.last);
  play(t, MOUTHFUL_MS);
  assert.equal(t.stage.solids.length, 1, '그루터기는 그대로');
});

test('🤝 보스 몸통박치기 (v373 2단계): 구한 친구마다 한 번(2.5초 · 3.5초 사이) · 한 방 1칸 · 앱을 내리면 그 때도 밀린다 · 친구가 없으면 없음', () => {
  const s = toArena(40);
  assert.deepEqual(s.boss.helps, [], '친구가 없으면 없음');
  const u = ssokStart(0, seeded(41), ['row']);
  u.mechas = []; u.drones = []; u.volts = []; u.fruits = []; u.blocks = [];
  u.freed = [2, 0, 1];
  u.x = u.stage.arenaX + ME.screen - 2;
  play(u, 300);
  const t0 = u.boss.t0;
  assert.deepEqual(u.boss.helps.map((h) => [h.fi, h.at - t0]), [[2, FRIEND_HELP.first], [0, FRIEND_HELP.first + FRIEND_HELP.gap], [1, FRIEND_HELP.first + FRIEND_HELP.gap * 2]]);
  ssokShift(u, 1000);
  assert.equal(u.boss.helps[0].at - u.boss.t0, FRIEND_HELP.first, '멈춤에도 같이 밀린다');
  u.boss.nextAt = 1e12; // 시험만 — 굴리기 없이
  const evs = play(u, 12000);
  assert.deepEqual(all(evs, 'friendHit').map((h) => h.fi), [2, 0, 1]);
  assert.equal(u.boss.hp, BOSS.hp - 3 * FRIEND_HELP.dmg);
  assert.equal(u.bossDmg, 3);
});

test('🏁 끝 글 (v373 2단계): 이김·도망 + 오늘 구한 친구 이름(구한 차례) · 친구가 없으면 끝 글만 · 이름이 없으면 「친구」', () => {
  const fr = [{ ko: '피카츄' }, { ko: '꼬부기' }, { ko: '이브이' }];
  assert.equal(ssokEndText({ win: true, fled: false, freed: [2, 0] }, fr), '🎉 이겼다! · 오늘 구한 친구: 이브이 · 피카츄');
  assert.equal(ssokEndText({ win: false, fled: true, freed: [] }, fr), '🚀 로켓단이 도망갔다! 다음엔 꼭!');
  assert.equal(ssokEndText({ win: false, fled: false, freed: [1] }, []), '끝! · 오늘 구한 친구: 친구');
});

// ───── 화면(runSsok) — 가짜 DOM · 가짜 시계 (tests/minigame333.test.js의 world 본뜸) ─────
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
  const hide = (on) => { doc.hidden = on; doc.fire('visibilitychange'); };
  const root = stage.children[0];
  const field = root.children[1];
  const down = (side, id) => field.fire('pointerdown', { pointerId: id, clientX: side === 'L' ? 20 : 80 });
  const up = (id) => doc.fire('pointerup', { pointerId: id });
  return { stage, root, field, h, doc, adv, flush, st, hide, down, up };
}

test('🖥️ 화면 (v373): 안내 · 「준비!」 뒤 길·나·바람·메카·🤖 · 두 엄지 안내는 3초 크게 · 오른쪽 꾹 = 바람 · 왼쪽 = 폴짝 · ✕는 바로 끝 · 듣기를 뗀다', async (t) => {
  const w = screen(t);
  const [top, field, hint, , banner] = w.root.children;
  assert.match(hint.textContent, /왼쪽 엄지 톡 폴짝 · 꾹 둥실 — 오른쪽 엄지 꾹 빨아들이기 · 톡 뱉기·기술/);
  assert.equal(banner.textContent, '준비!');
  w.adv(900);
  assert.ok(w.root.classList.contains('is-go') && field.classList.contains('is-intro'));
  const wld = field.children[2];
  for (const cls of ['ga-ground', 'gs-me', 'gs-wind', 'gs-mecha', 'gs-boss', 'ga-bird']) assert.ok(find(wld, cls).length > 0, cls);
  const me = find(wld, 'gs-me')[0];
  w.down('R', 1);
  w.adv(100);
  assert.ok(me.classList.contains('is-suck'), '오른쪽 꾹 — 바람');
  w.up(1);
  w.adv(100);
  assert.ok(!me.classList.contains('is-suck'));
  w.down('L', 2);
  w.adv(150);
  assert.ok(me.classList.contains('is-air'), '왼쪽 — 폴짝');
  w.up(2);
  w.adv(3000);
  assert.ok(!field.classList.contains('is-intro'), '3초 뒤 안내는 작게');
  assert.match(top.children[0].textContent, /^⭐ \d+$/);
  w.h.stop();
  await w.flush();
  assert.ok(w.st.over && w.st.over.quit === true);
  for (const k of ['visibilitychange', 'pointerup', 'pointercancel', 'keyup']) assert.equal((w.doc.listeners[k] || []).length, 0, `${k} 듣기를 뗐다`);
});

test('🖥️ 화면 2단계 (v373): 🔒 우리 셋 — 안에 이번 판 친구 그림(게임기가 준비) · 그림이 깨지면 🐾 · 🔴 몬스터볼 · 내 몸 위 몬스터볼(머금을 때만 보임)', async (t) => {
  const friends = [{ id: 25, ko: '피카츄', art: 'blob:pika' }, { id: 7, ko: '꼬부기', art: 'blob:squirtle' }, { id: 133, ko: '이브이', art: null }];
  const w = screen(t, { friends });
  w.adv(900);
  const wld = w.field.children[2];
  const cages = find(wld, 'gs-cage');
  assert.equal(cages.length, 3);
  const img = (c) => find(c, 'gs-cage-mon')[0].children[0];
  assert.equal(img(cages[0]).src, 'blob:pika');
  assert.equal(img(cages[1]).src, 'blob:squirtle');
  assert.match(find(cages[2], 'gs-cage-mon')[0].innerHTML, /🐾/, '그림이 없으면 🐾');
  img(cages[0]).fire('error');
  assert.match(find(cages[0], 'gs-cage-mon')[0].innerHTML, /🐾/, '깨지면 🐾');
  assert.equal(find(wld, 'gs-mball').length, 1);
  assert.equal(find(wld, 'gs-me-ball').length, 1);
  assert.ok(!find(wld, 'gs-me')[0].classList.contains('is-ball'));
  w.h.stop();
  await w.flush();
});

const bottomOf = (e) => Number(String(e.style.bottom).replace('%', ''));
const pctY = (y) => (y / 64) * 100;

test('🖥️ 몬스터볼 그림 (🔍 Codex 178차 P1): 빨아들이다 놓으면 그림도 땅으로 돌아온다', async (t) => {
  const w = screen(t);
  w.adv(900);
  const s = w.h.state();
  const b = s.mballs[0];
  const e = find(w.field.children[2], 'gs-mball')[0];
  s.mechas = []; s.drones = []; s.volts = []; s.fruits = []; s.blocks = []; s.cages = [];
  s.x = b.x - ME.w - 12;
  w.down('R', 1);
  w.adv(150);
  assert.ok(b.pull && b.y > GROUND + 1 && bottomOf(e) > pctY(GROUND + 1), `끌려오는 중 (y ${b.y.toFixed(1)})`);
  w.up(1);
  w.adv(100);
  assert.ok(!b.pull && b.y === GROUND, '엔진은 땅으로');
  assert.ok(Math.abs(bottomOf(e) - pctY(GROUND)) < 0.01, `그림도 땅으로 (bottom ${e.style.bottom})`);
  w.h.stop();
  await w.flush();
});

test('🖥️ 친구 마지막 일격 (🔍 Codex 178차 P1): 몸통박치기로 보스를 쓰러뜨려도 친구가 보스까지 갔다 돌아온다 · 박치기 도중 앱을 내렸다 와도 이어서', async (t) => {
  const w = screen(t, { friends: [{ id: 25, ko: '피카츄' }, { id: 7, ko: '꼬부기' }, { id: 133, ko: '이브이' }] });
  w.adv(900);
  const s = w.h.state();
  const wld = w.field.children[2];
  // 첫 우리를 별로 연다 → 친구 하나
  const c = s.cages[0];
  s.mechas = []; s.drones = []; s.volts = []; s.fruits = []; s.blocks = [];
  s.x = c.x - ME.w - 18;
  s.mouth = 'mecha';
  w.down('R', 1);
  w.up(1);
  w.adv(1200);
  assert.deepEqual(s.freed, [0]);
  const pal = find(wld, 'gs-pal')[0];
  assert.ok(pal, '친구가 따라온다');
  // 싸움터로
  s.cages = []; s.mballs = [];
  s.x = s.stage.arenaX + ME.screen - 2;
  w.adv(200);
  assert.ok(s.boss);
  s.boss.nextAt = 1e12; // 시험만 — 굴리기 없이
  const tx = (e) => Number((/translate3d\((-?[\d.]+)px/.exec(e.style.transform) || [])[1]);
  // ① 보스가 살아 있을 때 — 박치기 도중 앱을 내렸다 돌아와도 이어서(건너뛰지 않음)
  s.boss.helps[0].at = s.last + 40;
  w.adv(100);
  assert.equal(s.boss.hp, BOSS.hp - 1);
  const a0 = tx(pal);
  w.adv(100);
  const a1 = tx(pal);
  w.hide(true);
  w.adv(2000);
  w.hide(false);
  w.adv(100);
  assert.ok(tx(pal) > a1 && a1 > a0, `숨기 전후로 이어서 보스 쪽으로 (${a0} → ${a1} → ${tx(pal)})`);
  w.adv(1000);
  // ② 친구 몸통박치기가 마지막 일격 — 게임 시계가 멈춰도 친구는 갔다 온다
  s.boss.hp = 1;
  s.boss.helps.push({ fi: 0, k: 0, at: s.last + 40, done: false });
  w.adv(100);
  assert.ok(s.done && s.win, '친구 몸통박치기로 이겼다');
  const x0 = tx(pal);
  w.adv(300);
  const mid = tx(pal);
  assert.ok(mid > x0 + 10, `보스 쪽으로 (${x0} → ${mid})`);
  w.adv(400);
  assert.ok(tx(pal) < mid, '돌아온다');
  await w.flush();
});

test('🖥️ 엄지가 잠기지 않는다 (🔍 Codex 177차 P1): 꾹 누른 채 앱을 내리면 뗀 것으로 · 같은 쪽 새 손가락이 이어받음 · 키를 마당 밖에서 떼도 · 마당을 떠나면 키 엄지를 뗌', async (t) => {
  const w = screen(t);
  w.adv(900);
  const me = find(w.field.children[2], 'gs-me')[0];
  const suck = () => me.classList.contains('is-suck');
  // ① 꾹 → 앱을 내림(뗌이 안 옴) → 돌아옴 → 바람이 그쳐 있고, 새 손가락으로 다시 꾹
  w.down('R', 1);
  w.adv(100);
  assert.ok(suck());
  w.hide(true);
  w.adv(2000);
  w.hide(false);
  w.adv(100);
  assert.ok(!suck(), '숨으면 뗀 것으로');
  w.down('R', 2);
  w.adv(100);
  assert.ok(suck(), '새 손가락이 먹힌다');
  // ② 손가락 2의 뗌을 놓친 채 손가락 3이 같은 쪽을 누름 → 이어받음 · 3을 떼면 그침 · 늦게 온 2의 뗌은 아무 일 없음
  w.down('R', 3);
  w.adv(100);
  assert.ok(suck());
  w.up(3);
  w.adv(100);
  assert.ok(!suck(), '이어받은 손가락의 뗌');
  w.up(2);
  // ③ ⌨️ X를 누른 채 마당 밖에서 뗌(문서 keyup) · 눌린 채 마당을 떠남(blur)
  w.field.fire('keydown', { key: 'x' });
  w.adv(100);
  assert.ok(suck());
  w.doc.fire('keyup', { key: 'x' });
  w.adv(100);
  assert.ok(!suck(), '문서 어디서든 키 뗌');
  w.field.fire('keydown', { key: 'x' });
  w.adv(100);
  w.field.fire('blur');
  w.adv(100);
  assert.ok(!suck(), '마당을 떠나면 키 엄지를 뗀다');
  w.down('R', 4);
  w.adv(100);
  assert.ok(suck(), '그 뒤 손가락도 먹힌다');
  w.up(4);
  w.h.stop();
  await w.flush();
});
