// 🗺️ 파트너 대모험 — 🎮 게임기 미니 게임 아홉째 (v333 · 2026-10-25 아버님 "슈퍼마리오 같은 게임도 만들 수 있을까? 오른쪽으로 진행하면서
// 화면이 자동으로 이동, 캐릭터가 피하거나 먹거나" → 기본안 "이대로": 꾹 누른 만큼 높이 · 늘 깃대까지 · 메카는 밟기 · 이름 🗺️ 파트너 대모험)
// 🤝 파트너(없으면 내 캐릭터)가 오른쪽으로 저절로 달리고 화면이 따라간다 — 톡 하면 낮게, 꾹 누르면 높이 폴짝
// 높낮이 발판·계단·구덩이(빠지면 피죤이 건너편에) · 🍓 열매 ⭐1 · ✨ 황금 열매 ⭐3 · ❓ 몬스터볼 블록은 아래에서 머리로 쿵(열매 · 가끔 ⭐ 반짝 별 — 잠깐 무적)
// 🤖 로켓단 메카는 위에서 밟으면 펑 ⭐2 · 옆에서 부딪히면 꽈당 · ⚡ 찌리리공은 닿으면 꽈당(다른 게임과 같은 "피할 것")
// 🚩 깃대까지 가면 끝 — 높이 잡을수록 ⭐1~5 · 목숨·게임 오버·시간 제한 없음(계단 앞에서 오래 막히면 피죤이 넘겨 줘서 안 눌러도 언젠가 끝)
// 🏃 달리기와 다른 점: 높낮이가 있는 길 · 꾹 누른 만큼 높이(공중 한 번 더 없음) · 밟기·머리로 치기 · 끝이 깃대
//
// 위쪽(엔진)은 순수 — 시각(ms)과 rng만 받는다(길은 시작할 때 rng로 한 번 만든다 · node 시험이 가짜 시계로 끝까지) · 아래쪽(runAdv)이 화면
// 자리는 "칸": 화면 너비 100칸 · 높이 64칸(y는 아래에서 위로 · 땅 윗면 8) · 한 칸 = 마당 너비의 1%(정사각)
// 가만히 있는 것은 %로 한 번 놓고, 움직이는 것(길 전체·나·메카)만 transform — 구형 태블릿 · 앱을 내리면 멈췄다가 이어서
import { sfx, vibrate } from './sfx.js';
import { musicMode } from './gamesong.js'; // 🎵 게임 음악 상태 (v335 · 순수)
import { ART as RUN_ART } from './gamerun.js'; // 🍓·✨ 열매 그림은 🏃 달리기와 같게
import { FALLBACK as DIG_FALLBACK } from './gamedig.js'; // ⚡ 찌리리공 그림을 못 받았을 때

/** 보통 걸리는 시간(초) — 끝은 시간이 아니라 🚩 깃대 (게임 목록에 적는 값) */
export const ADV_SEC = 45;
/** 마당 — 너비 · 높이 · 땅 윗면 (칸) */
export const ADV_W = 100;
export const ADV_H = 64;
export const GROUND = 8;
/** 달리는 쪽 — 9×11칸 · 화면 왼쪽에서 22칸에 두고 화면이 따라간다 */
export const ME = { w: 9, h: 11, screen: 22 };
/** 달리기 (칸/초) · 뛰기: 중력 · 처음 힘 · 손을 떼면 이만큼으로 줄인다 · 손을 떼도 처음 이만큼은 오른다(ms) → 톡 약 12칸 · 꾹 약 18칸 */
export const RUN_V = 26;
export const GRAVITY = 360;
export const JUMP_V = 115;
export const CUT_V = 45;
export const MIN_HOLD_MS = 90;
/** 내려앉기 바로 앞에 눌렀다 이미 뗐으면 닿자마자 이만큼(톡 뛰기와 비슷하게) */
export const SHORT_V = 85;
/** 발판 끝에서 떨어진 바로 뒤에도 뛸 수 있다(ms) · 내려앉기 바로 앞에 누른 것은 닿자마자(ms) — 아이 손이 조금 늦거나 빨라도 */
export const COYOTE_MS = 100;
export const BUFFER_MS = 150;
/** 꽈당 · 피죤이 구덩이에서 건너편으로 · 계단 앞에서 이만큼 막히면 피죤이 넘겨 줌 · 넘겨 주는 동안 · ⭐ 반짝 별 무적 (ms) */
export const STUMBLE_MS = 1000;
export const RESCUE_MS = 1200;
export const HELP_MS = 2000;
export const HELP_ANIM_MS = 600;
export const STAR_MS = 5000;
/** 메카를 밟으면 튀어 오르는 힘 */
export const BOUNCE_V = 70;
/** 혹시 몰라 끝을 둔다(ms) — 안 눌러도 보통 80초 안에 깃대에 닿는다 */
export const MAX_MS = 150000;
/** 물건 — 크기(칸) · ⭐ (메카는 빠르기도) */
export const ADV_KINDS = {
  berry: { w: 5, h: 5, pts: 1 },
  gold: { w: 5, h: 5, pts: 3 },
  mecha: { w: 8, h: 8, pts: 2, v: 6 },
  volt: { w: 6, h: 6, pts: 0 }, // 꾹 뛰면 넘는 크기 — 넘을 때를 조금 넉넉하게
  q: { w: 7, h: 7 },
};
/** ❓ 블록 밑면 — 서 있는 머리(땅 + 11) 위로 6칸: 톡 뛰기로 닿는다 */
export const Q_Y = GROUND + 17;
/** 🚩 깃대 높이 · ⭐: 땅에서 4칸마다 하나 더(1~5) */
export const POLE_H = 44;
export const FLAG_STEP = 4;
/** 길 — 처음 평지 · 조각 수 · 처음 서 있는 자리 */
export const START_LEN = 40;
export const CHUNK_N = 18;
export const START_X = 10;
/** 받을 그림 — ⚡ 찌리리공 · 🐦 피죤 */
export const ADV_ART = { volt: 100, bird: 17 };
const STEP_MS = 16;
const EPS = 0.01;

const nz = (v) => {
  const n = Math.floor(Number(v) || 0);
  return n > 0 ? n : 0;
};
const overlap = (a0, a1, b0, b1) => a0 < b1 && a1 > b0;

/**
 * 길 조각 — 앞뒤 끝은 늘 평지(조각끼리 붙어도 위험한 것이 겹치지 않게) · lv 0 쉬움 → 2 어려움(뒤로 갈수록 나온다)
 * 숫자는 조각 시작에서의 칸 · 시험이 조각마다 "정말 뛰어서 넘을 수 있는지" 직접 풀어 본다
 */
export const CHUNKS = [
  { id: 'row', lv: 0, len: 46, make: (c) => { for (const dx of [10, 17, 24, 31]) c.item('berry', dx, GROUND + 2); } },
  { id: 'arc', lv: 0, len: 46, make: (c) => { for (const [dx, dy] of [[10, 9], [17, 15], [24, 15], [31, 9]]) c.item('berry', dx, GROUND + dy); } },
  { id: 'stump', lv: 0, len: 40, make: (c) => { c.solid(16, 8, 6); c.item('berry', 17.5, GROUND + 8); } },
  { id: 'q', lv: 0, len: 46, make: (c, rng) => { c.q(12, 'berry'); c.q(26, c.starOk() && rng() < 0.35 ? 'star' : 'berry'); } },
  { id: 'qrow', lv: 1, len: 48, make: (c, rng) => { c.q(14, 'berry'); c.q(21, c.starOk() && rng() < 0.5 ? 'star' : 'berry'); c.q(28, 'berry'); } },
  { id: 'pit', lv: 1, len: 42, make: (c) => { c.pit(14, 24); c.item('berry', 16.5, GROUND + 12); } },
  { id: 'mecha', lv: 1, len: 56, make: (c) => { c.mecha(40, 14, 44); } },
  { id: 'volt', lv: 1, len: 42, make: (c) => { c.volt(18); c.item('gold', 19, GROUND + 22); } },
  { id: 'stairs', lv: 1, len: 50, make: (c) => { c.solid(12, 7, 5); c.solid(19, 7, 10); c.solid(26, 7, 5); c.item('berry', 20, GROUND + 12); } },
  { id: 'high', lv: 2, len: 44, make: (c) => { c.solid(16, 9, 13); c.item('gold', 18, GROUND + 15); } },
  { id: 'pits', lv: 2, len: 56, make: (c) => { c.pit(12, 22); c.pit(32, 42); c.item('berry', 25, GROUND + 2); } },
  { id: 'mechas', lv: 2, len: 72, make: (c) => { c.mecha(30, 10, 34); c.mecha(60, 42, 62); } },
  { id: 'wide', lv: 2, len: 46, make: (c) => { c.pit(14, 30); c.item('berry', 18, GROUND + 14); c.item('berry', 24, GROUND + 16); } },
  // ❓와 메카 사이를 띄운다 — 메카를 넘으려고 뛰는 자리 위에 ❓가 있으면 머리를 박아 못 넘는다
  { id: 'qmecha', lv: 2, len: 60, make: (c) => { c.q(8, 'berry'); c.mecha(44, 30, 50); } },
];
/** 조각 차례의 어려움 — 처음 넷은 쉬운 것만 · 열째까지 보통 · 그 뒤 어려운 것도 */
export function chunkLevel(i) {
  return i < 4 ? 0 : i < 10 ? 1 : 2;
}

/**
 * 길 하나 만들기 (순수) → { len, poleX, stairX(끝 계단 첫 칸), pits, ground, solids, qs, fruits(🍓·✨ 열매), mechas, volts, chunks, stars }
 * 처음 평지 → 조각 18개(같은 조각이 잇달아 나오지 않게 · 그 어려움의 조각을 두 배로 자주) → 끝 계단 셋 → 평지 → 🚩 → 🏥 포켓몬센터
 * ids를 주면 그 조각들로만(시험이 조각 하나씩 넘을 수 있는지 볼 때)
 */
export function advStage(rng = Math.random, ids = null) {
  const st = { len: 0, poleX: 0, stairX: 0, pits: [], ground: [], solids: [], qs: [], fruits: [], mechas: [], volts: [], chunks: [], stars: 0 };
  let seq = 0;
  const maker = (x0) => ({
    item: (kind, dx, y) => { const k = ADV_KINDS[kind]; st.fruits.push({ n: ++seq, kind, x: x0 + dx, y, w: k.w, h: k.h }); },
    solid: (dx, w, h) => { st.solids.push({ n: ++seq, x: x0 + dx, w, top: GROUND + h }); },
    q: (dx, item) => { if (item === 'star') st.stars += 1; st.qs.push({ n: ++seq, x: x0 + dx, y: Q_Y, w: ADV_KINDS.q.w, h: ADV_KINDS.q.h, item }); },
    pit: (a, b) => { st.pits.push([x0 + a, x0 + b]); },
    mecha: (dx, a, b) => { const k = ADV_KINDS.mecha; st.mechas.push({ n: ++seq, x: x0 + dx, y: GROUND, w: k.w, h: k.h, a: x0 + a, b: x0 + b }); },
    volt: (dx) => { const k = ADV_KINDS.volt; st.volts.push({ n: ++seq, x: x0 + dx, y: GROUND, w: k.w, h: k.h }); },
    starOk: () => st.stars < 1,
  });
  let x = START_LEN;
  let prev = '';
  const order = Array.isArray(ids) ? ids.map((id) => CHUNKS.find((c) => c.id === id)).filter(Boolean) : null;
  for (let i = 0; i < (order ? order.length : CHUNK_N); i++) {
    let ch = order && order[i];
    if (!ch) {
      const lv = chunkLevel(i);
      const pool = CHUNKS.filter((c) => c.lv <= lv && c.id !== prev);
      const weighted = pool.flatMap((c) => (c.lv === lv ? [c, c] : [c]));
      const r = Number(rng());
      ch = weighted[Math.min(weighted.length - 1, Math.max(0, Math.floor((r >= 0 && r < 1 ? r : 0) * weighted.length)))];
    }
    ch.make(maker(x), rng);
    st.chunks.push(ch.id);
    prev = ch.id;
    x += ch.len;
  }
  // 끝 — 계단 셋(높이 5·10·15) → 평지 14칸 → 🚩 (계단 꼭대기에서 꾹 뛰면 깃대 높이)
  const end = maker(x);
  st.stairX = x + 8; // 끝 계단 첫 칸 — 화면에 보이면 🎵 음악이 서두른다(advHurry · v335)
  end.solid(8, 6, 5);
  end.solid(14, 6, 10);
  end.solid(20, 6, 15);
  st.poleX = x + 40;
  st.len = st.poleX + 80;
  // 땅 = 처음부터 끝까지에서 구덩이를 뺀 것
  let at = 0;
  for (const [a, b] of [...st.pits].sort((p, q) => p[0] - q[0])) {
    if (a > at) st.ground.push([at, a]);
    at = Math.max(at, b);
  }
  st.ground.push([at, st.len]);
  return st;
}

/** 새 판 (순수) — now = 시작 시각(ms) · 길은 rng로 한 번 만든다 (ids — 시험용 조각 차례) */
export function advStart(now, rng = Math.random, ids = null) {
  const stage = advStage(rng, ids);
  return {
    t0: now, last: now, end: now + MAX_MS, stage,
    x: START_X, y: GROUND, vy: 0, onGround: true,
    held: false, jumpAt: 0, cutPending: false, offAt: 0, buffer: 0,
    stumbleUntil: 0, rescueUntil: 0, starUntil: 0, blockedMs: 0, helpAt: 0,
    fruits: stage.fruits.map((o) => ({ ...o })),
    qs: stage.qs.map((q) => ({ ...q, used: false })),
    mechas: stage.mechas.map((m) => ({ ...m, vx: -ADV_KINDS.mecha.v })),
    volts: stage.volts.map((v) => ({ ...v })),
    score: 0, berries: 0, golds: 0, stomps: 0, bumps: 0, qhits: 0, stars: 0, rescues: 0, helps: 0,
    done: false, flagPts: 0, doneAt: 0,
  };
}

/** 화면 왼쪽 끝(칸) (순수) — 나를 왼쪽에서 22칸에 두고 따라간다 · 길 밖은 안 보인다 */
export function advCam(s) {
  return Math.max(0, Math.min(s.stage.len - ADV_W, s.x - ME.screen));
}

/** 🎵 음악이 서두를 때인가 (순수 · v335) — 끝 계단 첫 칸이 화면 오른쪽 끝에 들어왔고 아직 깃대 전 */
export function advHurry(s) {
  return !!s && !s.done && advCam(s) + ADV_W >= s.stage.stairX;
}

/** 깃대 ⭐ (순수) — 잡은 높이(땅에서 칸) → 1~5 */
export function flagPoints(rise) {
  const r = Number(rise) || 0;
  return Math.max(1, Math.min(5, 1 + Math.floor(Math.max(0, r) / FLAG_STEP)));
}

/** 밟고 설 수 있는 것들 (땅 · 그루터기·계단 · ❓ 블록 윗면) → [{ x, w, top, bottom }] */
function boxes(s) {
  const out = [];
  for (const [a, b] of s.stage.ground) out.push({ x: a, w: b - a, top: GROUND, bottom: -100, kind: 'ground' });
  for (const o of s.stage.solids) out.push({ x: o.x, w: o.w, top: o.top, bottom: -100, kind: 'solid' });
  for (const q of s.qs) out.push({ x: q.x, w: q.w, top: q.y + q.h, bottom: q.y, kind: 'q' });
  return out;
}

/** 지금 발밑의 가장 높은 윗면 (없으면 -Infinity) — 발 양쪽 1칸은 봐준다(끝에 살짝만 걸쳐도 선다) */
function footTop(s, list, y) {
  let top = -Infinity;
  for (const b of list) if (overlap(s.x + 1, s.x + ME.w - 1, b.x, b.x + b.w) && b.top <= y + EPS && b.top > top) top = b.top;
  return top;
}

function jumpNow(s, t, v = JUMP_V) {
  s.vy = v;
  s.onGround = false;
  s.jumpAt = t;
  s.offAt = 0;
  s.buffer = 0;
  s.cutPending = false;
}

function stumble(s, t) {
  s.stumbleUntil = t + STUMBLE_MS;
  s.bumps += 1;
}

function step(s, t, dt, ev) {
  if (s.done) return;
  const list = boxes(s);
  // 🤖 메카 — 정해진 사이를 오간다 (내가 멈춰도)
  for (const m of s.mechas) {
    m.x += m.vx * dt;
    if (m.x <= m.a) { m.x = m.a; m.vx = Math.abs(m.vx); }
    if (m.x >= m.b) { m.x = m.b; m.vx = -Math.abs(m.vx); }
  }
  if (t < s.rescueUntil) return; // 🐦 피죤이 구덩이에서 건너편으로 데려가는 동안
  // 손을 일찍 뗀 뛰기는 처음 조금은 오른 뒤에 줄인다(너무 낮지 않게)
  if (s.cutPending && t - s.jumpAt >= MIN_HOLD_MS) { if (s.vy > CUT_V) s.vy = CUT_V; s.cutPending = false; }
  // ➡️ 달리기(꽈당 동안은 멈춤 — 떨어지는 것은 그대로) — 앞을 막는 것(그루터기·계단·❓·구덩이 벽)이 있으면 멈춘다
  //    막는 몸은 발(footTop)과 같은 너비(양옆 1칸 안쪽) — 다르면 높은 계단 옆으로 내려앉다가 그 속에 들어가 땅까지 빠졌다
  if (t >= s.stumbleUntil) {
    const nx = s.x + RUN_V * dt;
    const front = s.x + ME.w - 1;
    let wall = null;
    for (const b of list) {
      if (b.x >= front - EPS && b.x < nx + ME.w - 1 && s.y < b.top - EPS && s.y + ME.h > b.bottom + EPS && (!wall || b.x < wall.x)) wall = b;
    }
    if (wall) {
      s.x = wall.x - ME.w + 1;
      s.blockedMs += dt * 1000;
      if (s.blockedMs >= HELP_MS && s.onGround) {
        // 🐦 피죤이 넘겨 준다 — 막은 것보다 조금 더 높이 들어 올린다(달리던 그대로 그 위에 내려앉는다)
        s.blockedMs = 0;
        jumpNow(s, t, Math.sqrt(2 * GRAVITY * Math.max(4, wall.top - s.y + 3)));
        s.helps += 1;
        s.helpAt = t;
        ev.helped = true;
      }
    } else {
      s.x = nx;
      s.blockedMs = 0;
    }
  }
  // 발밑이 사라졌으면 떨어지기 시작(조금은 뛸 수 있다)
  if (s.onGround && footTop(s, list, s.y) < s.y - EPS) { s.onGround = false; s.vy = 0; s.offAt = t; }
  // ⬆️⬇️ 뛰기·떨어지기
  const prevY = s.y;
  if (!s.onGround) {
    s.vy -= GRAVITY * dt;
    let ny = s.y + s.vy * dt;
    if (s.vy > 0) {
      // ❓ 블록에 머리 쿵
      let hit = null;
      for (const q of s.qs) {
        if (overlap(s.x + 1, s.x + ME.w - 1, q.x, q.x + q.w) && s.y + ME.h <= q.y + EPS && ny + ME.h > q.y && (!hit || q.y < hit.y)) hit = q;
      }
      if (hit) {
        ny = hit.y - ME.h;
        s.vy = 0;
        if (!hit.used) {
          hit.used = true;
          s.qhits += 1;
          if (hit.item === 'star') { s.stars += 1; s.starUntil = t + STAR_MS; ev.qs.push({ q: hit, item: 'star', pts: 0 }); } else {
            const pts = ADV_KINDS.berry.pts;
            s.score += pts;
            s.berries += 1;
            ev.qs.push({ q: hit, item: 'berry', pts });
          }
        } else ev.thud = true;
      }
    } else {
      const top = footTop(s, list, s.y);
      if (top > -Infinity && ny <= top) {
        ny = top;
        s.vy = 0;
        s.onGround = true;
        s.offAt = 0;
        if (s.buffer && t <= s.buffer) { jumpNow(s, t, s.held ? JUMP_V : SHORT_V); ev.jumped = true; }
        s.buffer = 0;
      }
    }
    s.y = ny;
  }
  // 🕳️ 구덩이 아래로 — 피죤이 건너편 땅에 내려 준다
  if (s.y < GROUND - ME.h - 2) {
    const mid = s.x + ME.w / 2;
    const pit = s.stage.pits.find(([a, b]) => mid >= a - ME.w && mid <= b + ME.w) || null;
    const land = pit ? pit[1] + 1 : s.x;
    s.x = land;
    s.y = GROUND;
    s.vy = 0;
    s.onGround = true;
    s.rescues += 1;
    s.rescueUntil = t + RESCUE_MS;
    ev.rescued = true;
    return;
  }
  const star = t < s.starUntil;
  // 부딪히는 몸은 양옆·위아래를 조금 봐준다 (아깝게 스친 것은 안 넘어지게)
  const hx0 = s.x + 2;
  const hx1 = s.x + ME.w - 2;
  const hy0 = s.y + 1;
  const hy1 = s.y + ME.h - 1;
  // 🤖 메카 — 위에서 밟으면 펑 · 옆이면 꽈당(메카는 튕겨 나간다) · ⭐ 무적이면 닿기만 해도 펑
  for (let i = s.mechas.length - 1; i >= 0; i--) {
    const m = s.mechas[i];
    if (!overlap(hx0, hx1, m.x + 1, m.x + m.w - 1) || !overlap(hy0, hy1, m.y, m.y + m.h - 1)) continue;
    const fromTop = s.vy < 0 && prevY >= m.y + m.h - 3;
    if (star || fromTop) {
      s.mechas.splice(i, 1);
      const pts = ADV_KINDS.mecha.pts;
      s.score += pts;
      s.stomps += 1;
      if (fromTop && !star) { s.vy = BOUNCE_V; s.onGround = false; }
      ev.stomped.push({ m, pts, star: star && !fromTop });
    } else if (t >= s.stumbleUntil) {
      s.mechas.splice(i, 1);
      stumble(s, t);
      ev.knocked.push(m);
    }
  }
  // ⚡ 찌리리공 — 닿으면 꽈당 · ⭐ 무적이면 그냥 지나간다(데굴데굴 굴러간다)
  for (let i = s.volts.length - 1; i >= 0; i--) {
    const v = s.volts[i];
    if (!overlap(hx0, hx1, v.x + 1, v.x + v.w - 1) || !overlap(hy0, hy1, v.y, v.y + v.h - 1)) continue;
    s.volts.splice(i, 1);
    if (star) { ev.rolled.push(v); continue; }
    if (t >= s.stumbleUntil) { stumble(s, t); ev.zapped.push(v); }
  }
  // 🍓 열매 — 조금 넉넉히
  for (let i = s.fruits.length - 1; i >= 0; i--) {
    const o = s.fruits[i];
    if (!overlap(s.x - 1, s.x + ME.w + 1, o.x, o.x + o.w) || !overlap(s.y - 1, s.y + ME.h + 1, o.y, o.y + o.h)) continue;
    s.fruits.splice(i, 1);
    const pts = ADV_KINDS[o.kind].pts;
    s.score += pts;
    if (o.kind === 'gold') s.golds += 1; else s.berries += 1;
    ev.got.push({ o, pts });
  }
  // 🚩 깃대
  if (s.x + ME.w >= s.stage.poleX) {
    s.x = s.stage.poleX - ME.w;
    s.done = true;
    s.doneAt = t;
    s.flagPts = flagPoints(s.y - GROUND);
    s.score += s.flagPts;
    ev.flag = s.flagPts;
  }
}

/**
 * 시계 (순수) — 지난번부터 now까지 16ms씩 나눠 움직인다(빨라도 벽을 뚫고 지나가지 않게) · 깃대에 닿으면 멈춘다
 * → { got, qs, stomped, knocked, zapped, rolled, rescued, helped, jumped, thud, flag(⭐|0) }
 */
export function advTick(s, now) {
  const ev = { got: [], qs: [], stomped: [], knocked: [], zapped: [], rolled: [], rescued: false, helped: false, jumped: false, thud: false, flag: 0 };
  const to = Math.min(Number(now) || 0, s.end);
  while (s.last < to && !s.done) {
    const dt = Math.min(STEP_MS, to - s.last);
    s.last += dt;
    step(s, s.last, dt / 1000, ev);
  }
  if (!s.done && s.last >= s.end) { s.done = true; s.doneAt = s.last; } // 혹시 몰라 둔 끝 — 깃대 ⭐ 없이
  return ev;
}

/**
 * 누름 (순수) → 'jump'(땅에서 · 발판 끝에서 막 떨어진 바로 뒤도) | 'buffer'(내려앉기 바로 앞 — 닿자마자 뛴다) | 'air' | 'stumble'(꽈당·피죤 동안) | 'over'
 * 화면은 먼저 advTick(s, now)으로 now까지 움직인 뒤에 부른다 · 누르고 있는 동안 높이 오르고, 떼면(advRelease) 거기서 줄어든다
 */
export function advPress(s, now) {
  if (s.done) return 'over';
  s.held = true;
  if (now < s.stumbleUntil || now < s.rescueUntil) return 'stumble';
  if (s.onGround || (s.offAt && now - s.offAt <= COYOTE_MS && s.vy <= 0)) { jumpNow(s, now); return 'jump'; }
  if (s.vy < 0) { s.buffer = now + BUFFER_MS; return 'buffer'; }
  return 'air';
}

/** 뗌 (순수) — 오르는 중이면 거기서 줄인다(처음 MIN_HOLD_MS는 다 오른 뒤에) */
export function advRelease(s, now) {
  s.held = false;
  if (s.onGround || s.vy <= CUT_V) return;
  if (now - s.jumpAt >= MIN_HOLD_MS) s.vy = CUT_V; else s.cutPending = true;
}

/** 멈췄던 만큼 뒤로 민다 (순수) — 앱을 내렸다 돌아오면 그대로 이어서 */
export function advShift(s, ms) {
  const d = nz(ms);
  if (!d) return;
  s.t0 += d; s.end += d; s.last += d;
  for (const k of ['stumbleUntil', 'rescueUntil', 'starUntil', 'buffer', 'jumpAt', 'offAt', 'helpAt', 'doneAt']) if (s[k]) s[k] += d;
}

// ───────────────────── 화면 (여기부터 브라우저) ─────────────────────

/** 코드로 그린 것 — 인터넷 없이도 (열매는 🏃 달리기와 같은 그림) */
export const ART = {
  mecha: '<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="9" y="2" width="3" height="7" fill="#868e96"/><circle cx="10.5" cy="2.5" r="2.5" fill="#e8413b"/><rect x="4" y="8" width="32" height="24" rx="6" fill="#adb5bd" stroke="#495057" stroke-width="2.5"/><rect x="9" y="13" width="22" height="9" rx="3" fill="#343a40"/><circle cx="15" cy="17.5" r="2.6" fill="#ffd43b"/><circle cx="25" cy="17.5" r="2.6" fill="#ffd43b"/><circle cx="30" cy="27" r="5" fill="#e8413b" stroke="#fff" stroke-width="1.5"/><text x="30" y="30" font-size="7" font-weight="900" text-anchor="middle" fill="#fff" font-family="sans-serif">R</text><circle cx="11" cy="35" r="4.5" fill="#495057"/><circle cx="29" cy="35" r="4.5" fill="#495057"/></svg>',
  q: '<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="1.5" y="1.5" width="37" height="37" rx="7" fill="#fff" stroke="#212529" stroke-width="3"/><path d="M1.5 20V8.5a7 7 0 0 1 7-7h23a7 7 0 0 1 7 7V20z" fill="#e8413b"/><rect x="1.5" y="17.5" width="37" height="5" fill="#212529"/><circle cx="20" cy="20" r="7.5" fill="#fff" stroke="#212529" stroke-width="3"/><text x="20" y="24.5" font-size="12" font-weight="900" text-anchor="middle" fill="#212529" font-family="sans-serif">?</text></svg>',
  qUsed: '<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="1.5" y="1.5" width="37" height="37" rx="7" fill="#ced4da" stroke="#495057" stroke-width="3"/><rect x="1.5" y="17.5" width="37" height="5" fill="#868e96"/><circle cx="20" cy="20" r="7" fill="#e9ecef" stroke="#868e96" stroke-width="3"/></svg>',
  star: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 3l5 11 12 1.2-9 8 2.7 11.8L20 29l-10.7 6 2.7-11.8-9-8L15 14z" fill="#ffd43b" stroke="#e67700" stroke-width="2.5" stroke-linejoin="round"/></svg>',
  center: '<svg viewBox="0 0 80 64" aria-hidden="true"><rect x="6" y="22" width="68" height="42" fill="#fff" stroke="#495057" stroke-width="2"/><path d="M2 24 40 4l38 20z" fill="#e8413b" stroke="#a61e1e" stroke-width="2" stroke-linejoin="round"/><rect x="31" y="40" width="18" height="24" fill="#74c0fc" stroke="#495057" stroke-width="2"/><circle cx="40" cy="30" r="6" fill="#fff" stroke="#e8413b" stroke-width="2.5"/><path d="M40 26v8M36 30h8" stroke="#e8413b" stroke-width="2.5"/></svg>',
};

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
/** 애니메이션 다시 틀기 — 꼴을 뗐다가 다시 붙인다 */
function replay(node, cls) {
  node.classList.remove(cls);
  void node.offsetWidth;
  node.classList.add(cls);
}
const pctX = (x) => `${x}%`;
const pctY = (y) => `${((y / ADV_H) * 100).toFixed(3)}%`;
/** 가만히 있는 것을 % 자리에 — 화면 크기가 바뀌어도 다시 잴 것 없다 */
function place(e, x, y, w, h) {
  e.style.left = pctX(x);
  e.style.bottom = pctY(y);
  e.style.width = pctX(w);
  e.style.height = pctY(h);
}

/**
 * 한 판 돌리기 → { done: Promise<{ score, quit }>, stop() }
 * stage = 그릴 자리(비워서 쓴다) · o.hero = 달리는 쪽 { html } (파트너 그림 또는 캐릭터) · o.art = { 100: 찌리리공, 17: 피죤 그림 주소|null } · o.rng
 * stop()은 ✕·집을 닫을 때 — 그 자리에서 끝(quit)
 */
export function runAdv(stage, o = {}) {
  const now = () => performance.now();
  const rng = typeof o.rng === 'function' ? o.rng : Math.random;
  stage.innerHTML = '';
  const root = el('div', 'gd ga');
  const top = el('div', 'gd-top');
  const scoreEl = el('span', 'gd-score', '⭐ 0');
  const prog = el('div', 'ga-prog');
  const progIn = el('i');
  prog.append(progIn, el('span', 'ga-prog-flag', '🚩'));
  top.append(scoreEl, prog);
  const field = el('div', 'ga-field');
  field.setAttribute('aria-label', '톡 하면 낮게 · 꾹 누르면 높이 폴짝');
  const far = el('div', 'ga-far');
  const near = el('div', 'ga-near');
  const world = el('div', 'ga-world');
  field.append(far, near, world);
  const hint = el('p', 'ga-hint', '톡 하면 낮게 · 꾹 누르면 높이 폴짝!');
  const fx = el('div', 'gd-fx');
  const banner = el('div', 'gd-banner', '준비!');
  root.append(top, field, hint, fx, banner);
  stage.appendChild(root);

  let unit = 3; // 한 칸 = px (마당 너비 ÷ 100)
  const measure = () => {
    const w = field.getBoundingClientRect().width;
    if (w > 0) unit = w / ADV_W;
    far.style.backgroundSize = `${50 * unit}px 100%`;
    near.style.backgroundSize = `${30 * unit}px 100%`;
  };
  // 그림 — 받은 그림이 깨지면 코드로 그린 모습으로
  let volt = (o.art && o.art[ADV_ART.volt]) || '';
  const bird = (o.art && o.art[ADV_ART.bird]) || '';

  let s = null;
  let timer = 0;
  let frame = 0;
  let pausedAt = 0;
  let finished = false;
  let endTimer = 0;
  let resolveDone;
  const done = new Promise((r) => { resolveDone = r; });
  const els = new Map(); // 물건 n → 그림
  let me = null;
  let meIn = null;
  let birdEl = null;
  let flagEl = null;

  /** 길 그리기 — 판을 시작할 때 한 번 (가만히 있는 것은 %로) */
  const build = () => {
    const st = s.stage;
    world.innerHTML = '';
    els.clear();
    for (const [a, b] of st.ground) {
      const g = el('span', 'ga-ground');
      place(g, a, 0, b - a, GROUND);
      world.appendChild(g);
    }
    for (const b of st.solids) {
      const e = el('span', 'ga-solid');
      place(e, b.x, 0, b.w, b.top);
      world.appendChild(e);
    }
    for (const q of s.qs) {
      const e = el('span', 'ga-q');
      e.innerHTML = ART.q;
      place(e, q.x, q.y, q.w, q.h);
      world.appendChild(e);
      els.set(q.n, e);
    }
    for (const it of s.fruits) {
      const e = el('span', `ga-obj is-${it.kind}`);
      e.innerHTML = RUN_ART[it.kind];
      place(e, it.x, it.y, it.w, it.h);
      world.appendChild(e);
      els.set(it.n, e);
    }
    for (const v of s.volts) {
      const e = el('span', 'ga-obj is-volt');
      if (volt) {
        const img = el('img');
        img.alt = '';
        img.draggable = false;
        img.addEventListener('error', () => { volt = ''; e.innerHTML = DIG_FALLBACK.voltorb; });
        img.src = volt;
        e.appendChild(img);
      } else e.innerHTML = DIG_FALLBACK.voltorb;
      place(e, v.x, v.y, v.w, v.h);
      world.appendChild(e);
      els.set(v.n, e);
    }
    for (const m of s.mechas) {
      const e = el('span', 'ga-mecha');
      e.innerHTML = ART.mecha;
      place(e, 0, m.y, m.w, m.h); // 가로 자리는 움직이며 transform으로
      world.appendChild(e);
      els.set(m.n, e);
    }
    const pole = el('span', 'ga-pole');
    place(pole, st.poleX, GROUND, 0.8, POLE_H);
    flagEl = el('span', 'ga-flag');
    pole.appendChild(flagEl);
    world.appendChild(pole);
    const center = el('span', 'ga-center');
    center.innerHTML = ART.center;
    place(center, st.poleX + 24, GROUND, 24, 19);
    world.appendChild(center);
    me = el('div', 'ga-me');
    meIn = el('div', 'ga-me-in');
    meIn.innerHTML = (o.hero && o.hero.html) || '<span class="gd-pal-emoji">🐾</span>';
    me.appendChild(meIn);
    place(me, 0, 0, ME.w, ME.h);
    world.appendChild(me);
    birdEl = el('div', 'ga-bird');
    if (bird) {
      const img = el('img');
      img.alt = '';
      img.draggable = false;
      img.addEventListener('error', () => { birdEl.innerHTML = '<span>🐦</span>'; });
      img.src = bird;
      birdEl.appendChild(img);
    } else birdEl.innerHTML = '<span>🐦</span>';
    birdEl.hidden = true;
    place(birdEl, 0, 0, 14, 14);
    world.appendChild(birdEl);
  };
  const drop = (n, cls, ms = 450) => {
    const e = els.get(n);
    els.delete(n);
    if (!e) return;
    if (!cls) { e.remove(); return; }
    e.classList.add(cls);
    setTimeout(() => e.remove(), ms);
  };
  /** 떠오르는 글 — 길 위의 자리(칸)를 지금 화면 자리로 */
  const fly = (text, x, y, cls) => {
    const a = field.getBoundingClientRect();
    const b = root.getBoundingClientRect();
    const cam = s ? advCam(s) : 0;
    const f = el('span', `gd-fly ${cls || ''}`, text);
    f.style.left = `${a.left - b.left + (x - cam) * unit}px`;
    f.style.top = `${a.top - b.top + (ADV_H - y) * unit - 12}px`;
    fx.appendChild(f);
    setTimeout(() => f.remove(), 900);
  };

  const draw = () => {
    if (!s) return;
    const cam = advCam(s);
    world.style.transform = `translate3d(${(-cam * unit).toFixed(1)}px, 0, 0)`;
    far.style.transform = `translate3d(${(-((cam * 0.2) % 50) * unit).toFixed(1)}px, 0, 0)`;
    near.style.transform = `translate3d(${(-((cam * 0.5) % 30) * unit).toFixed(1)}px, 0, 0)`;
    for (const m of s.mechas) {
      const e = els.get(m.n);
      if (e) {
        e.style.transform = `translate3d(${(m.x * unit).toFixed(1)}px, 0, 0)`;
        e.classList.toggle('is-r', m.vx > 0);
      }
    }
    me.style.transform = `translate3d(${(s.x * unit).toFixed(1)}px, ${(-s.y * unit).toFixed(1)}px, 0)`;
    me.classList.toggle('is-air', !s.onGround);
    me.classList.toggle('is-star', s.last < s.starUntil);
    const carried = s.last < s.rescueUntil || (s.helpAt > 0 && s.last - s.helpAt < HELP_ANIM_MS);
    birdEl.hidden = !carried;
    if (carried) birdEl.style.transform = `translate3d(${(s.x * unit).toFixed(1)}px, ${(-(s.y + ME.h + 1) * unit).toFixed(1)}px, 0)`;
    me.classList.toggle('is-carried', carried);
    progIn.style.transform = `scaleX(${Math.max(0, Math.min(1, (s.x + ME.w - START_X) / (s.stage.poleX - START_X))).toFixed(3)})`;
  };
  const apply = (ev) => {
    for (const g of ev.got) {
      drop(g.o.n, 'is-got');
      fly(`+${g.pts}`, g.o.x + g.o.w / 2, g.o.y + g.o.h, g.pts > 1 ? 'is-big' : '');
      if (g.pts > 1) sfx.twinkle(); else sfx.ding();
    }
    for (const h of ev.qs) {
      const e = els.get(h.q.n);
      if (e) { e.innerHTML = ART.qUsed; replay(e, 'is-bump'); }
      if (h.item === 'star') {
        fly('⭐ 반짝!', h.q.x + h.q.w / 2, h.q.y + h.q.h + 2, 'is-big');
        sfx.twinkle();
      } else {
        fly(`🍓 +${h.pts}`, h.q.x + h.q.w / 2, h.q.y + h.q.h + 2, '');
        sfx.ding();
      }
    }
    if (ev.thud) sfx.tick();
    for (const st of ev.stomped) {
      drop(st.m.n, 'is-squash');
      fly(`펑! +${st.pts}`, st.m.x + st.m.w / 2, st.m.y + st.m.h + 2, 'is-big');
      sfx.boom();
    }
    const bonk = (x, y, text) => {
      fly(text, x, y, 'is-zap');
      replay(me, 'is-bonk');
      sfx.hit();
      vibrate(80);
    };
    for (const m of ev.knocked) { drop(m.n, 'is-knock'); bonk(s.x + ME.w / 2, s.y + ME.h + 6, '꽈당!'); }
    for (const v of ev.zapped) { drop(v.n, 'is-zap'); bonk(s.x + ME.w / 2, s.y + ME.h + 6, '찌릿! 꽈당!'); }
    for (const v of ev.rolled) drop(v.n, 'is-roll');
    if (ev.rescued) { fly('피죤이 건너편으로!', s.x + ME.w / 2, s.y + ME.h + 10, ''); sfx.whoosh(); }
    if (ev.helped) { fly('영차! 피죤이 올려 줬어요', s.x + ME.w / 2, s.y + ME.h + 10, ''); sfx.whoosh(); }
    if (ev.jumped) sfx.tick();
    if (ev.got.length || ev.qs.length || ev.stomped.length || ev.flag) scoreEl.textContent = `⭐ ${s.score}`;
    if (ev.flag) {
      fly(`🚩 +${ev.flag}`, s.stage.poleX, s.y + ME.h + 4, 'is-big');
      if (flagEl) flagEl.classList.add('is-down');
      sfx.success();
    }
  };

  const onVis = () => {
    if (!s || finished) return;
    if (document.hidden) { pausedAt = now(); root.classList.add('is-paused'); return; }
    if (pausedAt) { advShift(s, now() - pausedAt); pausedAt = 0; root.classList.remove('is-paused'); }
  };
  const hasWin = typeof window !== 'undefined' && typeof window.addEventListener === 'function';
  // 끝을 알리는 것은 한 번만 — 「🚩 도착!」을 보여 주는 동안 ✕·집 닫기가 오면 기다리지 않고 바로(도착한 판이라 점수 그대로 · 🔍 Codex 137차 #3)
  let settled = false;
  let settleTimer = 0;
  const settle = (r) => {
    if (settled) return;
    settled = true;
    clearTimeout(settleTimer);
    resolveDone(r);
  };
  const finish = (quit) => {
    if (finished) { if (quit) settle({ score: s ? s.score : 0, quit: false }); return; }
    finished = true;
    clearInterval(timer);
    clearTimeout(endTimer);
    if (frame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame);
    document.removeEventListener('visibilitychange', onVis);
    document.removeEventListener('pointerup', up);
    document.removeEventListener('pointercancel', up);
    if (hasWin) window.removeEventListener('resize', measure);
    const score = s ? s.score : 0;
    if (quit) { settle({ score, quit: true }); return; }
    banner.textContent = '🚩 도착!';
    banner.classList.add('is-on');
    settleTimer = setTimeout(() => settle({ score, quit: false }), 1100);
  };
  const loop = () => {
    if (!s || pausedAt || finished) return;
    const t = now();
    apply(advTick(s, t));
    draw();
    if (s.done && !endTimer) endTimer = setTimeout(() => finish(false), 900); // 깃대에서 잠깐 보고
  };
  // 그림이 부드럽게 — 브라우저면 화면 그릴 때마다, 아니면(시험) 33ms마다
  const startLoop = () => {
    if (typeof requestAnimationFrame === 'function') {
      const f = () => {
        if (finished) return;
        loop();
        if (!finished) frame = requestAnimationFrame(f);
      };
      frame = requestAnimationFrame(f);
    } else timer = setInterval(loop, 33);
  };
  // 누른 손가락 하나만 기억한다 — 꾹 누르고 있는데 다른 손가락을 눌렀다 떼도 뛰기가 끊기지 않게 (🔍 Codex 137차 #2)
  //   공중에서 다른 손가락은 무시 · 땅에 있을 때 다른 손가락이 누르면 그 손가락이 이어받는다(첫 손가락의 뗌을 놓쳐 막히지 않게) · 키보드는 'key'
  let pressing = false;
  let pressId = null;
  const down = (id) => {
    if (!s || finished || pausedAt) return;
    if (pressing && id !== pressId && !s.onGround) return;
    pressing = true;
    pressId = id;
    const t = now();
    apply(advTick(s, t)); // 누른 때까지 움직이고 나서 뛴다
    const r = advPress(s, t);
    if (r === 'jump') sfx.tick();
    draw();
  };
  function up(e) {
    if (!pressing) return;
    const id = !e ? 'key' : e.pointerId !== undefined ? e.pointerId : 'touch';
    if (id !== pressId) return;
    pressing = false;
    pressId = null;
    if (!s || finished) return;
    // 앱을 내린 동안 뗐으면 멈춘 때를 뗀 때로 — 숨은 시간까지 누른 시간으로 세면 뛰기가 낮아졌다 (🔍 Codex 137차 #1)
    const t = pausedAt || now();
    if (!pausedAt) apply(advTick(s, t));
    advRelease(s, t);
  }
  field.addEventListener('pointerdown', (e) => { e.preventDefault(); down(e.pointerId !== undefined ? e.pointerId : 'touch'); });
  document.addEventListener('pointerup', up);
  document.addEventListener('pointercancel', up);
  // ⌨️ 마당에 포커스가 있을 때만 키보드로도 — 누르고 있는 동안 높이 (✕ 단추 위의 스페이스와 겹치지 않게)
  field.tabIndex = 0;
  field.setAttribute('role', 'button');
  field.addEventListener('keydown', (e) => {
    if (e.key !== ' ' && e.key !== 'Enter' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    if (!e.repeat) down('key');
  });
  field.addEventListener('keyup', (e) => {
    if (e.key !== ' ' && e.key !== 'Enter' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    up(null);
  });
  root.addEventListener('animationend', (e) => {
    if (e.animationName === 'ga-bonk' && me) me.classList.remove('is-bonk');
  });

  // 준비! → 시작 · 앱이 내려간 것은 「준비!」 때부터 듣는다
  document.addEventListener('visibilitychange', onVis);
  if (hasWin) window.addEventListener('resize', measure);
  setTimeout(() => {
    if (finished) return;
    banner.classList.remove('is-on');
    measure();
    s = advStart(now(), rng);
    build();
    root.classList.add('is-go');
    if (document.hidden) { pausedAt = now(); root.classList.add('is-paused'); }
    draw();
    startLoop();
    if (typeof field.focus === 'function') { try { field.focus({ preventScroll: true }); } catch { /* 옛 브라우저 */ } }
  }, 800);
  banner.classList.add('is-on');
  measure();
  sfx.tick();

  // 🎵 게임 음악(v335) — 깃대에 닿으면 stop(🚩 띠링이 들리게) · 끝 계단이 보이면 hurry
  return { done, stop: () => finish(true), music: () => musicMode({ over: finished || !!(s && s.done), hurry: !!s && advHurry(s) }) };
}
