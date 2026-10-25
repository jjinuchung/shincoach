// 🎮 미니 게임 음악 — 언제 소리가 나는가 (v335 · 2026-10-25 아버님 "긴박감이 있고 신난 음악" → 기본안 "이대로" → 시험 듣기 2판 "이대로")
// 곡과 소리는 gamesong.js(순수) · 여기는 틀고 멈추기만:
//   · 게임기에서 한 판이 시작되면(gameview.startRound → gameMusicStart) 그 게임의 곡 · 판이 끝나면(끝! · 🚩 도착!) 짧게 빼서
//     게임의 끝 소리(sfx.success 띠링)가 들리게 · 끝 화면·고르기 화면·게임기를 닫으면(gameMusicStop) 없음
//   · ⏰ 시간이 있는 게임의 마지막 10초 · 🗺️ 대모험은 끝 계단이 보이면(run.music() === 'hurry') — **다음 마디부터** ×1.15 + 박마다 째깍
//     (마디 가운데서 끊으면 멜로디가 뚝 끊긴다 — 늦어도 한 마디, 1.4~1.8초)
//   · ⚙ 이벤트 배경음악(settings.bgm)을 끄면 안 남 · 게임기 머리줄 🎵 단추로 진우가 끄고 켬(이 기기에 기억 · 못 읽으면 켬)
//   · 앱을 내리면 바로 뺌 · 곡마다 끊긴 4마디 덩이 처음부터 이어서(bgm.js·calm.js처럼 매번 같은 도입부가 아니게)
//   · 효과음(sfx 한 음 0.14~0.2)보다 작게 — 곡 전체 최고점 ≈ 0.7 × GAME_BGM.volume
// ★ 지킴이: "멈춰야 하나"는 0.1초마다 처음부터 다시 따진다 (calm.js와 같이 — 켜는 신호·끄는 신호의 짝을 맞추지 않는다)
// ★ 화면(DOM)을 만지지 않는다 — 🎵 단추 모양은 gameview가 gameMusicOn()으로 그린다
// 📤 기록(v337 · calm.js와 같은 꼴): 소리가 난 초(gameMusicSec — 틀 때부터 뺄 때까지 소리 장치 시계로 · 기기 음량·음소거는 모름) · 🎵로 끈 수(gameMusicOff)·켠 수(gameMusicOn)
//   → usage/날짜.md 한 줄 — 게임 음악을 진우가 좋아하는지 "올라온 거 봐 줘"에서 본다(아이 화면엔 셈이 안 보인다)

import { songFor, barSec, makeBus, scheduleBar } from './gamesong.js';
import { audioContext, unlockMusic } from './sfx.js';
import { applyDailyDelta } from './db.js';

const ON_KEY = 'shincoach.gameMusicOn';
const POS_KEY = 'shincoach.gameMusicPos';

/** 정해 둔 값 — 시험이 tick을 0으로 두면 저절로 돌지 않는다(gameMusicTick을 직접 부른다) */
export const GAME_BGM = {
  volume: 0.18,  // 전체 음량 — 곡 최고점 약 0.7 × 0.18 ≈ 0.13 (효과음 한 음 0.14~0.2보다 작게)
  fadeIn: 0.3,   // 들어올 때(초) — 판은 30초뿐이라 짧게
  fadeOut: 0.25, // 빠질 때(초)
  tick: 100,     // 따지기·예약 주기(ms)
  ahead: 0.25,   // 이만큼 앞의 마디까지 미리 예약(초) — 짧게 두어 ⏰가 바로 다음 마디부터
  phrase: 4,     // 이어서 틀 때 이 마디 덩이의 처음부터
  secMax: 600,   // 한 번 틀어 둔 동안 세는 윗값(초) — 판은 길어야 2분 남짓 · 무엇이 꼬여도 몇 시간이 들어가지 않게
};

const st = {
  game: '',       // 지금 판의 게임 id ('' = 판 없음)
  tune: 0,        // 판마다 +1 — 판이 받은 번호표(gameMusicStart가 돌려줌) · 늦게 끝난 앞 판이 새 판 음악을 끄지 않게(🔍 Codex 139차 #1)
  probe: null,    // () => 'play' | 'hurry' | 'stop' (run.music)
  allowed: true,  // ⚙ 이벤트 배경음악
  on: loadOn(),   // 🎵 진우가 켜 두었나
  timer: null,
  run: null,      // 소리가 나는 중이면 { ctx, master, bus, song, nextAt, live, hurry }
  pos: loadPos(), // { 곡 id: 다음에 낼 마디 }
  hooked: false,  // 앱을 내림·닫음 듣기를 걸었나 (처음 틀 때 한 번 — 게임 시험의 가짜 화면에 듣기를 남기지 않게)
};

function loadOn() {
  try { return localStorage.getItem(ON_KEY) !== '0'; } catch { return true; }
}

function loadPos() {
  const out = {};
  try {
    const p = JSON.parse(localStorage.getItem(POS_KEY) || 'null');
    if (p && typeof p === 'object' && !Array.isArray(p)) {
      for (const [k, v] of Object.entries(p)) if (Number.isInteger(v) && v >= 0 && v < 1000) out[k] = v;
    }
  } catch { /* 처음부터 */ }
  return out;
}

function savePos() {
  try { localStorage.setItem(POS_KEY, JSON.stringify(st.pos)); } catch { /* 저장 못 해도 음악은 나온다 */ }
}

function todayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 📤 하루 기록에 더하기 — 못 적어도 음악은 그대로 */
function note(delta) {
  applyDailyDelta(todayKey(), delta).catch(() => {});
}

/** 지금 상태 (시험·진단용) */
export function gameMusicState() {
  const r = st.run;
  return { game: st.game, allowed: st.allowed, on: st.on, playing: !!r, hurry: !!(r && r.hurry), song: r ? r.song.id : '', pos: { ...st.pos }, timer: st.timer !== null };
}

/** 🎵 단추 모양 — 켜 두었나 · ⚙에서 허락했나(꺼져 있으면 단추를 숨긴다) */
export function gameMusicOn() {
  return st.on;
}
export function gameMusicAllowed() {
  return st.allowed;
}

/** 판의 지금 음악 상태 — 모르는 값·깨진 함수는 'play' (판이 끝나면 gameMusicStop이 멈춘다) */
function mode() {
  try {
    const m = st.probe ? st.probe() : 'play';
    return m === 'hurry' || m === 'stop' ? m : 'play';
  } catch { return 'play'; }
}

/** 멈춰야 하는 까닭 — 없으면 '' */
export function gameMusicBlock(m = mode()) {
  if (!st.game) return 'idle';
  if (!st.allowed) return 'setting';
  if (!st.on) return 'off';
  if (typeof document !== 'undefined' && document.hidden) return 'hidden';
  if (m === 'stop') return 'over';
  return '';
}

// ── 틀기 ──

function start(ctx, song) {
  const t0 = ctx.currentTime + 0.03;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, t0);
  master.gain.exponentialRampToValueAtTime(GAME_BGM.volume, t0 + GAME_BGM.fadeIn);
  master.connect(ctx.destination);
  const b = (st.pos[song.id] || 0) % song.bars.length;
  st.pos[song.id] = b - (b % GAME_BGM.phrase); // 덩이 가운데서 시작하면 어색하다
  st.run = { ctx, master, bus: makeBus(ctx, master), song, nextAt: t0 + 0.02, live: [], hurry: false, c0: ctx.currentTime };
}

/** 앞으로 ahead초 안에 시작할 마디를 예약 — hurry면 그 마디는 빠르게 + 째깍 · 곡 끝이면 처음으로 */
function pump(ctx, hurry) {
  const r = st.run;
  // 타이머가 오래 멈췄다 돌면 놓친 마디를 한꺼번에 쌓지 않고 지금부터 다시
  if (r.nextAt < ctx.currentTime) r.nextAt = ctx.currentTime + 0.05;
  while (r.nextAt < ctx.currentTime + GAME_BGM.ahead) {
    const b = st.pos[r.song.id] || 0;
    r.live.push(...scheduleBar(ctx, r.bus, r.song, b, Math.max(r.nextAt, ctx.currentTime + 0.02), hurry));
    r.nextAt += barSec(r.song, hurry);
    r.hurry = hurry;
    st.pos[r.song.id] = (b + 1) % r.song.bars.length;
    savePos();
  }
  r.live = r.live.filter((x) => x.end > ctx.currentTime);
}

/** 소리를 빼고 예약해 둔 음을 끈다 (자리는 기억) */
function fadeOut(sec = GAME_BGM.fadeOut) {
  const r = st.run;
  if (!r) return;
  st.run = null;
  // 📤 틀어 둔 초 — 뺄 때 한 번에 (판 하나는 짧아 모아 둘 까닭이 없다 · 윗값 secMax)
  //   소리 장치의 시계(currentTime)로 잰다 — 장치가 잠든(suspended) 동안은 이 시계도 멈춰 조용한 시간이 안 들어가고, 기기 시계가 건너뛰어도 상관없다 (🔍 Codex 141차)
  const played = Math.floor(Math.min(GAME_BGM.secMax, r.ctx.currentTime - r.c0));
  if (played > 0) note({ gameMusicSec: played });
  const t = r.ctx.currentTime;
  try {
    const g = r.master.gain;
    if (typeof g.cancelAndHoldAtTime === 'function') g.cancelAndHoldAtTime(t);
    else {
      const v = g.value;
      g.cancelScheduledValues(t);
      g.setValueAtTime(Math.max(v, 0.0001), t);
    }
    g.exponentialRampToValueAtTime(0.0001, t + sec);
  } catch { /* 이미 닫힌 컨텍스트 */ }
  for (const { o } of r.live) {
    try { o.stop(t + sec + 0.05); } catch { /* 이미 끝난 것 */ }
  }
  setTimeout(() => { try { r.master.disconnect(); } catch { /* 이미 끊김 */ } }, (sec + 0.3) * 1000);
  savePos();
}

/** 0.1초마다 — 멈출 까닭이 있으면 빼고, 없으면 틀고 앞 마디를 예약한다 */
export function gameMusicTick() {
  const m = mode();
  const ctx = audioContext();
  if (gameMusicBlock(m) || !ctx || ctx.state !== 'running') { fadeOut(); return; }
  const song = songFor(st.game);
  if (!st.run || st.run.ctx !== ctx || st.run.song !== song) { fadeOut(); start(ctx, song); }
  pump(ctx, m === 'hurry');
}

function hook() {
  if (st.hooked) return;
  st.hooked = true;
  // 내린 동안에는 타이머가 늦게 돌 수 있다 — 기다리지 않고 바로 뺀다 (돌아오면 다음 따지기에서 다시)
  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('visibilitychange', () => { if (document.hidden) fadeOut(); });
  }
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') window.addEventListener('pagehide', () => fadeOut());
}

// ── 게임기가 부르는 것 ──

/** 한 판이 시작됐다 — 그 게임의 곡 · probe = run.music (없으면 늘 'play') → 이 판의 번호표(gameMusicStop에 돌려준다) */
export function gameMusicStart(gameId, probe) {
  hook();
  st.tune += 1;
  st.game = String(gameId || '');
  st.probe = typeof probe === 'function' ? probe : null;
  if (st.allowed && st.on) unlockMusic();
  if (st.timer === null && GAME_BGM.tick > 0) {
    st.timer = setInterval(gameMusicTick, GAME_BGM.tick);
    if (st.timer && typeof st.timer.unref === 'function') st.timer.unref(); // node 시험이 이 타이머 때문에 안 끝나지 않게
  }
  gameMusicTick();
  return st.tune;
}

/** 게임 카드를 누른 손길 안에서 — 판 준비(그림 받기·판 쓰기 저장)를 기다리는 사이 손길이 끝나도 소리가 나게 미리 깨운다
 *  (효과음을 꺼 두면 sfx.unlock은 아무것도 안 한다 — 음악은 제 설정을 따른다) */
export function gameMusicWake() {
  if (st.allowed && st.on) unlockMusic();
}

/**
 * 판이 끝났다 · 판이 깨졌다 — tune = 그 판의 번호표: 그사이 새 판이 시작됐으면(번호가 다르면) 아무것도 안 한다
 *   (「끝!」을 0.9초 보여 주는 사이 게임기를 닫았다 다시 열어 새 판을 시작하면, 늦게 풀린 앞 판의 끝이 새 판 음악을 껐다 — 🔍 Codex 139차 #1)
 * 게임기를 닫을 때는 번호표 없이 — 늘 멈춘다 · 몇 번 불러도 된다
 */
export function gameMusicStop(tune) {
  if (tune !== undefined && tune !== st.tune) return;
  st.game = '';
  st.probe = null;
  if (st.timer !== null) { clearInterval(st.timer); st.timer = null; }
  fadeOut();
}

/** 🎵 진우가 눌렀다 — 끄기·켜기 · 이 기기에 기억 → 새 상태 */
export function toggleGameMusic() {
  st.on = !st.on;
  try { localStorage.setItem(ON_KEY, st.on ? '1' : '0'); } catch { /* 이번만 */ }
  note(st.on ? { gameMusicOn: 1 } : { gameMusicOff: 1 });
  if (st.on && st.allowed) unlockMusic(); // 누른 손길 안 — 판 도중에 다시 켜도 소리가 나게
  gameMusicTick();
  return st.on;
}

/** ⚙ 이벤트 배경음악 (player.js — 설정을 읽을 때·저장할 때) */
export function setGameBgmEnabled(on) {
  st.allowed = !!on;
  gameMusicTick();
}
