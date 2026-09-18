// 🎵 이벤트 배경음악 — 🧩 퍼즐 · ⚔️ 배틀 · 🎯 잡기가 열릴 때 깔린다.
//
// 왜 파일이 아니라 합성인가: 진짜 포켓몬 음악은 닌텐도 저작물이라 **공개 저장소에 둘 수 없다**
// (GitHub Pages 무료는 Public. 포켓몬 그림도 그래서 PokeAPI에서 받아 기기에만 둔다).
// 효과음(sfx.js)과 같은 방식으로 Web Audio에서 직접 만들면 파일이 0개라 저작권도, 용량도, 오프라인도 문제가 없다.
//
// ★ 핵심: **매번 같은 도입부가 나오지 않는다.** 이벤트가 끝난 자리를 기억했다가
//   다음 이벤트에서 그다음 마디부터 이어서 낸다 (아버님 요청). 위치는 앱을 껐다 켜도 남는다.
//
// 🎤 말하기 확인(음성 인식)이 도는 동안에는 멈춘다 — 음악이 마이크로 들어가면 인식률이 떨어진다.
//   speak.js가 'shincoach:micstart' / 'shincoach:micend'를 쏘고 여기서 받는다.
//   끝 신호를 놓쳐도 스스로 다시 시작하도록 지킴이를 둔다 (v70·v80에서 배운 것 —
//   전역 상태는 꼬여도 혼자 풀려야 한다. 안 그러면 아이가 앱을 껐다 켜야 한다).

import { audioContext, unlock } from './sfx.js';

const POS_KEY = 'shincoach.bgmPos';
const BPM = 138;
const BEAT = 60 / BPM;        // 4분음표 길이(초)
const LOOKAHEAD_MS = 25;      // 스케줄러가 도는 주기
const AHEAD_SEC = 0.3;        // 이만큼 앞의 음표까지 미리 예약
const MIC_RESUME_MS = 25000;  // 말하기 끝 신호를 놓쳤을 때 스스로 다시 시작하는 시간

// ── 곡 ──
// 음이름 → 주파수. 8비트 느낌을 위해 멜로디는 square, 베이스는 triangle.
const A4 = 440;
const STEPS = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
function freq(name) {
  if (!name) return 0; // 쉼표
  const m = /^([A-G])(#?)(\d)$/.exec(name);
  if (!m) return 0;
  const semis = STEPS[m[1]] + (m[2] ? 1 : 0) + (Number(m[3]) - 4) * 12;
  return A4 * Math.pow(2, semis / 12);
}

/**
 * 마디 = [멜로디 음이름들(8분음표 8개), 베이스 근음].
 * 솔 장조 I–V–vi–IV(G–D–Em–C) 진행 — 어떤 자리에서 시작해도 어울리게 (이어서 재생이라 중간부터 나온다).
 * null은 쉼표, 같은 음을 이어 내려면 그냥 다시 적는다.
 */
const BARS = [
  // A 구간 — 모험을 떠나는 느낌
  [['G4', 'A4', 'B4', null, 'D5', null, 'B4', null], 'G2'],
  [['A4', 'B4', 'A4', 'G4', 'E4', null, null, null], 'D2'],
  [['E4', 'G4', 'A4', null, 'B4', null, 'A4', null], 'E2'],
  [['G4', 'A4', 'G4', 'E4', 'D4', null, null, null], 'C3'],
  [['G4', 'A4', 'B4', 'D5', 'E5', null, 'D5', null], 'G2'],
  [['B4', 'D5', 'B4', 'A4', 'G4', null, null, null], 'D2'],
  [['E5', 'D5', 'B4', 'A4', 'G4', null, 'E4', null], 'E2'],
  [['D4', 'E4', 'G4', 'A4', 'G4', null, null, null], 'C3'],
  // B 구간 — 조금 씩씩하게 (배틀 분위기)
  [['B4', 'B4', 'D5', 'D5', 'E5', null, 'D5', null], 'G2'],
  [['B4', 'A4', 'B4', 'A4', 'G4', null, null, null], 'D2'],
  [['A4', 'A4', 'B4', 'D5', 'B4', null, 'A4', null], 'E2'],
  [['G4', 'E4', 'G4', 'A4', 'B4', null, null, null], 'C3'],
  [['D5', 'E5', 'G5', null, 'E5', null, 'D5', null], 'G2'],
  [['B4', 'D5', 'E5', 'D5', 'B4', null, null, null], 'D2'],
  [['A4', 'B4', 'D5', 'B4', 'A4', null, 'G4', null], 'E2'],
  [['E4', 'G4', 'A4', 'B4', 'G4', null, null, null], 'C3'],
  // C 구간 — 잔잔하게 쉬어 가기
  [['D5', null, 'B4', null, 'G4', null, 'A4', null], 'G2'],
  [['B4', null, 'A4', null, 'G4', null, null, null], 'D2'],
  [['E4', null, 'G4', null, 'B4', null, 'A4', null], 'E2'],
  [['G4', null, 'E4', null, 'D4', null, null, null], 'C3'],
  [['G4', 'B4', 'D5', null, 'B4', 'D5', 'E5', null], 'G2'],
  [['D5', 'B4', 'A4', null, 'G4', null, null, null], 'D2'],
  [['E5', null, 'D5', null, 'B4', 'A4', 'G4', null], 'E2'],
  [['A4', 'G4', 'E4', 'D4', 'G4', null, null, null], 'C3'],
];

/** 곡 전체를 8분음표 한 줄로 편다: { m: 멜로디 주파수, b: 베이스 주파수(마디 첫 박만) } */
const NOTES = [];
for (const [mel, bass] of BARS) {
  for (let i = 0; i < mel.length; i++) {
    NOTES.push({ m: freq(mel[i]), b: i === 0 ? freq(bass) : (i === 4 ? freq(bass) : 0) });
  }
}

// ── 상태 ──
let enabled = true;
let pos = loadPos();      // 다음에 낼 음표 자리 (이어서 재생의 핵심)
let timer = null;         // 스케줄러
let nextTime = 0;         // 다음 음표를 낼 시각 (AudioContext 기준)
let master = null;        // 전체 음량
let live = [];            // 예약해 둔 오실레이터 (멈출 때 같이 끈다)
let micHold = false;      // 🎤 말하기 때문에 멈춘 상태인가
let micTimer = null;      // 끝 신호를 놓쳤을 때를 대비한 지킴이
let wanted = false;       // 이벤트가 "틀어 달라"고 한 상태인가 (마이크가 끝나면 다시 시작)

function loadPos() {
  try {
    const n = Number(localStorage.getItem(POS_KEY));
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) % NOTES.length : 0;
  } catch {
    return 0;
  }
}

function savePos() {
  try { localStorage.setItem(POS_KEY, String(pos)); } catch { /* 저장 못 해도 음악은 나온다 */ }
}

export function setBgmEnabled(on) {
  enabled = !!on;
  if (!enabled) stop();
}

/** 지금 나오고 있는지 (테스트·진단용) */
export function bgmState() {
  return { playing: !!timer, pos, notes: NOTES.length, micHold, wanted, enabled };
}

function ensureMaster(ctx) {
  if (master && master.context === ctx) return master;
  master = ctx.createGain();
  master.gain.value = 0.05; // 영상 소리·목소리를 덮지 않도록 작게
  master.connect(ctx.destination);
  return master;
}

/** 음표 하나 예약 */
function scheduleNote(ctx, note, at) {
  const out = ensureMaster(ctx);
  if (note.m) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(note.m, at);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.35, at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, at + BEAT * 0.45);
    o.connect(g).connect(out);
    o.start(at);
    o.stop(at + BEAT * 0.5);
    live.push(o);
  }
  if (note.b) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(note.b, at);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.5, at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, at + BEAT * 0.9);
    o.connect(g).connect(out);
    o.start(at);
    o.stop(at + BEAT);
    live.push(o);
  }
  if (live.length > 64) live = live.slice(-64);
}

function tick() {
  const ctx = audioContext();
  if (!ctx) { stop(); return; }
  while (nextTime < ctx.currentTime + AHEAD_SEC) {
    scheduleNote(ctx, NOTES[pos], Math.max(nextTime, ctx.currentTime + 0.01));
    nextTime += BEAT / 2; // 8분음표
    pos = (pos + 1) % NOTES.length;
  }
  savePos();
}

/**
 * 이벤트가 열릴 때 부른다. **이어서** 나온다 — 지난번에 끊긴 자리부터.
 * 사용자 터치 안에서 불려야 소리가 난다(모바일 정책) → 이벤트를 여는 탭이 그 역할을 한다.
 */
export function play() {
  wanted = true;
  if (!enabled || timer || micHold) return;
  unlock(); // 효과음과 같은 컨텍스트를 깨운다
  const ctx = audioContext();
  if (!ctx) return;
  nextTime = ctx.currentTime + 0.06;
  timer = setInterval(tick, LOOKAHEAD_MS);
  tick();
}

/** 이벤트가 끝날 때. 자리를 기억해 두고 멈춘다 */
export function stop() {
  wanted = false;
  halt();
}

function halt() {
  if (timer) { clearInterval(timer); timer = null; }
  const ctx = audioContext();
  for (const o of live) {
    try { o.stop(ctx ? ctx.currentTime + 0.02 : 0); } catch { /* 이미 끝난 것 */ }
  }
  live = [];
  savePos();
}

/** 🎤 말하기 확인이 시작됨 — 음악을 멈춘다 (마이크에 음악이 들어가지 않게) */
function onMicStart() {
  micHold = true;
  clearTimeout(micTimer);
  // 끝 신호를 못 받아도 혼자 풀린다 (그렇지 않으면 음악이 영영 안 나온다)
  micTimer = setTimeout(onMicEnd, MIC_RESUME_MS);
  halt();
}

/** 🎤 말하기 확인이 끝남 — 틀어 달라던 이벤트가 아직 열려 있으면 이어서 다시 */
function onMicEnd() {
  clearTimeout(micTimer);
  micTimer = null;
  micHold = false;
  if (wanted) play();
}

if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('shincoach:micstart', onMicStart);
  window.addEventListener('shincoach:micend', onMicEnd);
  // 화면이 꺼지거나 다른 앱으로 가면 소리를 멈춘다 (돌아오면 이벤트가 다시 틀어 준다)
  document.addEventListener('visibilitychange', () => { if (document.hidden) halt(); });
  window.addEventListener('pagehide', halt);
}
