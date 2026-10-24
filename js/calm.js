// 🌿 국어·논술 잔잔한 배경 음악 — 언제 소리가 나는가 (v317, 2026-10-22 아버님 "부드럽게 지브리 느낌의 새 곡을 직접 만들어서 넣어봐")
// 곡과 소리는 calmsong.js(순수) · 여기는 틀고 멈추기만:
//   · 국어·논술 화면에 있는 동안(app.showView → enterCalm/leaveCalm) — 영어(🎤 마이크·영상 소리)·수학에는 없다
//   · 위에 창이 뜨면(⏳ 잠금·⚔️ 배틀·🎯 잡기·진화·부화·🏡·🛒 — usage.OVERLAYS) 줄였다가 닫히면 다시 — 잡기·배틀은 제 음악(bgm.js)이 있다
//   · 🎧 듣기 카드가 읽는 동안(speechSynthesis가 말하는 중) 멈춤 — 다 읽고 3초 뒤 다시 (줄과 줄 사이에 깜빡이지 않게)
//     ▶를 누르는 순간 korlistenview가 'shincoach:ttsstart'를 보내면 0.25초 만에 뺀다 — 첫 말이 음악에 묻히지 않게 (🔍 Codex 123차 #1)
//   · 🎵 단추(국어·논술 머리줄)로 진우가 끄고 켬 — 이 기기에 기억 (localStorage · 못 읽으면 켬)
//   · 앱을 내리면 멈춤 · 다시 틀면 지난번 그 곡의 그 4마디 덩이 처음부터 이어서 (bgm.js처럼 매번 같은 도입부가 아니게)
// 📤 기록: 음악을 틀어 둔 초(calmSec — 기기 음량·음소거는 모름 · 곡 사이 쉼은 들어감) · 🎵로 끈 수(calmOff)·켠 수(calmOn) → usage/날짜.md 한 줄 —
//   음악이 있던 날과 없던 날의 국어 기록을 "올라온 거 봐 줘"에서 견준다 (아이 화면엔 셈이 안 보인다) · 자정을 넘기면 쌓인 것은 전날로
// ★ 지킴이: "멈춰야 하나"는 0.1초마다 처음부터 다시 따진다 (켜는 신호·끄는 신호의 짝을 맞추지 않는다) —
//   끝 신호를 놓쳐도 혼자 풀린다 (껐다 켜야 낫는 전역 상태를 만들지 않는다 — v70·v80에서 배운 것)

import { SONGS, songBars, barSec, makeBus, scheduleBar } from './calmsong.js';
import { audioContext, unlockMusic } from './sfx.js';
import { OVERLAYS } from './usage.js';
import { applyDailyDelta } from './db.js';

const ON_KEY = 'shincoach.calmOn';
const POS_KEY = 'shincoach.calmPos';

/** 정해 둔 값 — 시험이 tick을 0으로 두면 저절로 돌지 않는다(calmTick을 직접 부른다) */
export const CALM = {
  volume: 0.25,      // 전체 음량 — 미리 만들어 잰 RMS ≈ 0.02 (bgm.js 8비트 곡과 비슷하게 작게)
  fadeIn: 2.5,       // 들어올 때(초)
  fadeOut: 0.6,      // 빠질 때(초)
  ttsFade: 0.25,     // 🎧 ▶를 눌렀을 때 빠지는 시간(초) — korlistenview.TTS_LEAD_MS가 이보다 짧지 않게
  tick: 100,         // 따지기·예약 주기(ms)
  ahead: 0.6,        // 이만큼 앞의 마디까지 미리 예약(초)
  phrase: 4,         // 이어서 틀 때 이 마디 덩이의 처음부터
  ttsRest: 3000,     // 🎧 읽기가 끝나고 다시 들어오기까지(ms)
  ttsMax: 5 * 60000, // 이만큼 넘게 "읽는 중"이면 고장으로 보고 무시(ms)
  micMax: 25000,     // 🎤 끝 신호를 놓쳐도 이만큼 뒤엔 풀림(ms)
  flushSec: 60,      // 소리 난 초를 이만큼 모아 하루 기록에
};

const st = {
  want: false,       // 국어·논술 화면인가
  on: loadOn(),      // 🎵 진우가 켜 두었나
  timer: null,
  run: null,         // 소리가 나는 중이면 { ctx, master, bus, nextAt, live }
  pos: loadPos(),    // { s 곡, b 마디, p 몇 번째 돌기 }
  micUntil: 0,
  talkFrom: 0,       // 🎧 "읽는 중"이 시작된 때
  lastTalk: 0,       // 🎧 마지막으로 읽는 중이던 때
  ms: 0,             // 아직 기록에 안 더한 틀어 둔 시간(ms)
  msDay: '',         // 그 시간이 쌓인 날 (자정을 넘기면 전날로 먼저 적는다 — 🔍 Codex 123차 #4)
  lastT: 0,
};

function loadOn() {
  try { return localStorage.getItem(ON_KEY) !== '0'; } catch { return true; }
}

function loadPos() {
  try {
    const p = JSON.parse(localStorage.getItem(POS_KEY) || 'null');
    const s = Number(p && p.s), b = Number(p && p.b), raw = Number(p && p.p);
    const pass = Number.isInteger(raw) && raw >= 0 ? raw % 1000 : 0;
    if (Number.isInteger(s) && s >= 0 && s < SONGS.length && Number.isInteger(b) && b >= 0) {
      const len = songBars(SONGS[s]).length;
      if (b < len) return { s, b, p: pass };
      // 마지막 마디를 예약한 뒤(b = 마디 수)에 닫았다 → 다음 곡 처음 (첫 곡으로 버리지 않는다 — 🔍 Codex 123차 #5)
      if (b === len) { const n = (s + 1) % SONGS.length; return { s: n, b: 0, p: n === 0 ? (pass + 1) % 1000 : pass }; }
    }
  } catch { /* 처음부터 */ }
  return { s: 0, b: 0, p: 0 };
}

function savePos() {
  try { localStorage.setItem(POS_KEY, JSON.stringify(st.pos)); } catch { /* 저장 못 해도 음악은 나온다 */ }
}

function todayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function note(delta) {
  applyDailyDelta(todayKey(), delta).catch(() => {});
}

/** 지금 상태 (시험·진단용) */
export function calmState() {
  return { want: st.want, on: st.on, playing: !!st.run, pos: { ...st.pos }, song: SONGS[st.pos.s].title, timer: st.timer !== null };
}

// ── 멈춰야 하나 ──

/** 🕒 사용 기록 칸은 따로 없지만 제 음악(bgm.js)이 있는 창 — 🔤 낱말 이어 주기(v329) */
const QUIET_IDS = ['match'];

function overlayShown() {
  if (typeof document === 'undefined') return false;
  const shown = (id) => { const e = document.getElementById(id); return !!(e && !e.hidden); };
  return OVERLAYS.some((o) => o.ids.some(shown)) || QUIET_IDS.some(shown);
}

/** 🎧 한국어 읽어 주기가 말하는 중이거나 막 끝났나 */
function talking(now) {
  let on = false;
  try {
    const s = typeof window !== 'undefined' ? window.speechSynthesis : null;
    on = !!(s && (s.speaking || s.pending));
  } catch { on = false; }
  if (on) {
    if (!st.talkFrom || now < st.talkFrom) st.talkFrom = now; // 시계가 뒤로 가면 다시 잡는다 — 5분 지킴이가 미뤄지지 않게 (🔍 Codex 123차 #3)
    if (now - st.talkFrom > CALM.ttsMax) return false;
    st.lastTalk = now;
    return true;
  }
  st.talkFrom = 0;
  // 기기 시계가 뒤로 가면 lastTalk가 미래가 된다 — 그때는 쉬는 시간이 끝난 것으로 (멈춤이 몇 시간씩 이어지지 않게)
  return now >= st.lastTalk && now - st.lastTalk < CALM.ttsRest;
}

/** 멈춰야 하는 까닭 — 없으면 '' */
export function calmBlock(now = Date.now()) {
  if (!st.want) return 'view';
  if (!st.on) return 'off';
  if (typeof document !== 'undefined' && document.hidden) return 'hidden';
  if (overlayShown()) return 'overlay';
  if (now < st.micUntil && st.micUntil - now <= CALM.micMax) return 'mic'; // 시계가 뒤로 가도 micMax까지만
  if (talking(now)) return 'tts';
  return '';
}

// ── 틀기 ──

function start(ctx) {
  const t0 = ctx.currentTime + 0.05;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, t0);
  master.gain.exponentialRampToValueAtTime(CALM.volume, t0 + CALM.fadeIn);
  master.connect(ctx.destination);
  st.pos.b -= st.pos.b % CALM.phrase; // 덩이 가운데서 시작하면 어색하다
  st.run = { ctx, master, bus: makeBus(ctx, master), nextAt: t0 + 0.05, live: [] };
  st.lastT = Date.now();
}

/** 앞으로 ahead초 안에 시작할 마디를 예약 · 곡이 끝나면 한 마디 쉬고 다음 곡(마지막 곡 뒤면 첫 곡 · 돌기 +1) */
function pump(ctx) {
  const r = st.run;
  // 타이머가 오래 멈췄다 돌면(무거운 화면·기기가 바쁨) 놓친 마디를 한꺼번에 쌓지 않고 지금부터 다시
  if (r.nextAt < ctx.currentTime) r.nextAt = ctx.currentTime + 0.05;
  while (r.nextAt < ctx.currentTime + CALM.ahead) {
    const song = SONGS[st.pos.s];
    if (st.pos.b >= songBars(song).length) {
      r.nextAt += barSec(song);
      const s = (st.pos.s + 1) % SONGS.length;
      st.pos = { s, b: 0, p: s === 0 ? (st.pos.p + 1) % 1000 : st.pos.p };
      continue;
    }
    r.live.push(...scheduleBar(ctx, r.bus, song, st.pos.b, st.pos.p, Math.max(r.nextAt, ctx.currentTime + 0.02)));
    r.nextAt += barSec(song);
    st.pos.b += 1;
    savePos();
  }
  r.live = r.live.filter((x) => x.end > ctx.currentTime);
}

function count(now) {
  const day = todayKey(new Date(now));
  if (st.msDay !== day) { flush(); st.msDay = day; } // 자정을 넘겼다 — 쌓인 것은 전날로 먼저
  st.ms += Math.max(0, Math.min(1000, now - st.lastT)); // 멈춘 타이머가 한꺼번에 돌아도 1초까지만
  st.lastT = now;
  if (st.ms >= CALM.flushSec * 1000) flush();
}

function flush() {
  const sec = Math.floor(st.ms / 1000);
  if (sec <= 0) return;
  st.ms -= sec * 1000;
  applyDailyDelta(st.msDay || todayKey(), { calmSec: sec }).catch(() => {});
}

/** 소리를 빼고 예약해 둔 음을 끈다 (자리는 기억) · sec = 빠지는 시간 */
function fadeOut(sec = CALM.fadeOut) {
  const r = st.run;
  if (!r) return;
  count(Date.now());
  flush();
  st.run = null;
  const t = r.ctx.currentTime;
  try {
    const g = r.master.gain;
    // 들어오던 중이면 그 자리 음량에서 — 취소한 뒤의 g.value에 기대지 않는다 (🔍 Codex 123차 작은 것)
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
export function calmTick(now = Date.now()) {
  const ctx = audioContext();
  if (calmBlock(now) || !ctx || ctx.state !== 'running') { fadeOut(); return; }
  if (!st.run || st.run.ctx !== ctx) { fadeOut(); start(ctx); }
  pump(ctx);
  count(now);
}

// ── 화면이 부르는 것 ──

/** 국어·논술 화면에 들어왔다 (app.showView) — 화면을 연 탭 안이면 소리도 깨운다 */
export function enterCalm() {
  st.want = true;
  if (st.on) unlockMusic();
  if (st.timer === null && CALM.tick > 0) st.timer = setInterval(() => calmTick(), CALM.tick);
  syncButtons();
  calmTick();
}

/** 국어·논술 밖으로 (홈·🎒·📊·영어·수학) */
export function leaveCalm() {
  st.want = false;
  if (st.timer !== null) { clearInterval(st.timer); st.timer = null; }
  fadeOut();
}

/** 🎵 진우가 눌렀다 — 끄기·켜기 · 이 기기에 기억 · 📤 끈 수·켠 수 */
export function toggleCalm() {
  st.on = !st.on;
  try { localStorage.setItem(ON_KEY, st.on ? '1' : '0'); } catch { /* 이번만 */ }
  note(st.on ? { calmOn: 1 } : { calmOff: 1 });
  if (st.on) unlockMusic();
  syncButtons();
  calmTick();
}

function syncButtons() {
  if (typeof document === 'undefined') return;
  for (const b of document.querySelectorAll('[data-calm]')) {
    b.textContent = st.on ? '🎵' : '🔇';
    b.setAttribute('aria-pressed', st.on ? 'true' : 'false');
    b.title = st.on ? '잔잔한 음악 끄기' : '잔잔한 음악 켜기';
  }
}

/** 앱을 켤 때 한 번 (app.js) — 🎵 단추 · 화면을 처음 누를 때 소리 깨우기 · 🎤 · 앱을 내림 */
export function initCalm() {
  if (typeof document === 'undefined') return;
  for (const b of document.querySelectorAll('[data-calm]')) b.addEventListener('click', toggleCalm);
  syncButtons();
  // 탭 없이 화면에 들어온 경우(다른 화면에서 이어 옴) — 처음 누르는 순간 소리를 깨운다
  document.addEventListener('pointerdown', () => { if (st.want && st.on) unlockMusic(); }, { capture: true, passive: true });
  window.addEventListener('shincoach:micstart', () => { st.micUntil = Date.now() + CALM.micMax; calmTick(); });
  window.addEventListener('shincoach:micend', () => { st.micUntil = 0; });
  // 🎧 ▶ 듣기를 눌렀다 — 말이 시작되기 전에 빨리 뺀다 (그 뒤는 speechSynthesis 검사가 이어 받는다 · 말이 안 나오면 3초 뒤 다시)
  window.addEventListener('shincoach:ttsstart', () => { st.lastTalk = Date.now(); fadeOut(CALM.ttsFade); });
  // 내린 동안에는 타이머가 늦게 돌 수 있다 — 기다리지 않고 바로 뺀다 (돌아오면 다음 따지기에서 다시)
  document.addEventListener('visibilitychange', () => { if (document.hidden) fadeOut(); });
  window.addEventListener('pagehide', () => { fadeOut(); flush(); });
}
