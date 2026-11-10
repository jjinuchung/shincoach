// 🎹 음악 과목 화면 (v402, 2026-11-08 — 기본안 판 3 「추천대로」 · 빠르기는 단추 대신 밀어서(아버님))
//   곡 고르기 → 무대: 위 악보(흘러감) · 가운데 떨어지는 막대(도움 1단계) · 아래 건반
//   🎹 태블릿으로 치기 — 진우가 건반을 누른다 · 맞는 건반을 칠 때까지 멈춰 기다린다 · 고르지 않은 손은 앱이 친다 → 💰 (xp.pianoTap)
//   🎧 듣고 따라 치기 — 앱이 연주하고 진우는 보면대 앞 진짜 피아노로 → 끝까지 연주한 뒤 「다 쳤어요 ✋」 → 음표 칸 (xp.pianoListen)
// 규칙은 piano.js(순수) · 곡은 pianosongs.js · ⏳ 음악 시간은 timelimit 'music'(하루 40분 · 공부 시간과 따로)
// 아이 화면엔 셈·남은 수를 쓰지 않는다 — 음표 칸은 ♪ 다섯 개가 차오르는 그림으로만
// 🐾 음악 포켓몬 안내 (v405, 11-09 아버님 「가」) — 처음 들어올 때 한 번 + ♪ 칸을 누르면 다시: 🎧에서 진짜 피아노로 끝까지 친 뒤 · 화면 건반은 💰
//   앱은 아직 피아노 소리를 못 듣는다(연결 전) — 「✋ 피아노로 다 쳤어요」는 진우의 약속 · 아버님은 📤로 보신다
// 🪶 태블릿 부담 줄이기 (v407, 11-09 아버님 — 음악을 태블릿으로 칠 때 앱이 닫히고 태블릿 첫 화면이 나온다)
//   멈춰 있고 움직이는 그림이 없으면 1초에 네 번만 그린다(전엔 늘 1초에 60번 처음부터) · 별은 세 번에 칠하고 배경 물감은 한 번 만든다 ·
//   곡을 바꾸거나 음악을 떠나면 옛 그림판의 픽셀을 바로 비운다 · 떠나거나 내리면 소리 장치를 재운다 · 🛑 블랙박스에 「지금 무엇을 하나」(setScene)
// 🎹 자유롭게 치기 (v408, 11-09 진우 바람 「곡을 정하지 않고 그냥」 → 아버님 「이대로」) — 곡 목록 맨 앞 칸 · 큰 건반 두 옥타브(◀ ▶ 한 옥타브씩) ·
//   위에 방금 친 계이름(「계이름 숨기기」로 끔) · 💰·음표 칸·음악 포켓몬 없음 · ⏳ 음악 시간에는 든다 · 📤 하루 줄에 연 번·친 시간·건반 수
//   Codex 213차 — 미끄러지듯 쳐도 ⏳ 손댐 · 같은 건반을 누른 손이 하나라도 남으면 소리 그대로 · 못 넣은 셈은 날짜째 두었다 다음에 · 자정엔 전날 몫 먼저
// 🎹 v413 (11-10 아버님 기본안 「추천대로」) — ① 🎹 태블릿으로 치기도 「곡 전체」를 잘 끝까지 치면 건반 한 칸 · 열 칸이면 음악 포켓몬(♪ 칸 자리에 건반 열 개 그림)
//   ② 「치다 보면 멈췄다가 3~4초 뒤 풀린다」 — 연주 중에 건반 위쪽을 누르면 ⏸가 되던 것(그림판 톡 = 시작·멈춤)을 시작만으로 · 건반 바로 위 띠(KEY_SLOP)는 건반 ·
//      멈춰 있으면 가운데에 크게 「⏸ 멈췄어요」 · 연주 중 화면이 STALL.ms 넘게 멈칫하면 📤 하루 칸(태블릿이 버거워 멈추는 것인지 가르려고)
//   ③ 끝날 때 박자 판정(진우 바람) — 🎉 빵빠레·꽃가루 · 👏 짝짝 · 🎺 뿌우~ (소리는 Web Audio로 새로 지음 · 점수는 📤에만 · 보상과 상관없음)
import { setScene } from './blackbox.js';
import { perform, stepsOf, keyWindow, whiteIdx, isBlack, midiOfWhite, solOf, goodPass, nextHint, slotsOf, pressKind, barNum, endingShape, bpmAt, secsOf, LEVELS, SPEED, NOTES_PER_MON,
  TAPS_PER_MON, beatScore, beatGrade, GRADE_DAILY, STALL } from './piano.js';
import { allSongs, syncSongs, saveMidiCheck } from './pianosongs.js';
import { pianoTap, pianoListen, pianoNow, pianoMonsDue, caughtCount, rarityOf, RARITY } from './xp.js';
import { ROSTER, ensureCast } from './pokemon.js'; // 🐾 음악 포켓몬 이름·그림 (v404)
import { applyDailyDelta } from './db.js';
import { clockDay, noteActivity, isLocked } from './timelimit.js';
import { guardStart } from './timeup.js';

const $ = (id) => document.getElementById(id);
const FONT = '"NotoMusicSub", "Noto Music", "Segoe UI Symbol", serif';
const COLOR = { R: '#ff5c95', L: '#3fa6f0' };
const RGB = { R: '255,92,149', L: '63,166,240' };
const LEAD = 4;      // 시작 전 준비 박
const PREF_KEY = 'shincoach.pianoPrefs';
const HAND_KO = { R: '오른손', L: '왼손', B: '양손' };
const HELP_KO = ['', '막대', '계이름', '건반 빛', '악보만'];

const S = {
  wired: false, showView: null, active: false, screen: 'list', gen: 0,
  song: null, perf: null, mode: 'tap', hands: 'R', lv: 1, sp: SPEED.def, line: -1, loop: false,
  running: false, t: -LEAD, last: 0, lastAct: 0, steps: [], si: 0, waiting: false, ok: 0, bad: 0,
  passDone: false, saving: false, retry: null,
  sounding: new Map(), flash: new Map(), held: new Map(), ptr: new Map(), auto: new Set(), win: { lo: 30, hi: 50 },
  raf: 0, ro: null, drawn: 0, busy: false,
  freeOct: 3, freeNames: true, trail: [], freeKeys: 0, freeMs: 0, freeLast: 0, freeDay: '', freeOwe: new Map(), // 🎹 자유롭게 치기 (v408)
  pcDown: new Set(), // PC 자판으로 누르고 있는 건반 (Codex 213차)
  keyAt: -1e9, passStall: 0, fx: null, // v413 — 마지막으로 건반을 누른 때(위쪽 톡과 가르기) · 이 판의 가장 긴 화면 멈칫(ms) · 판 끝 박자 효과
};
/** 건반 바로 위 이만큼(px)은 건반으로 친다 — 건반 윗부분을 누르다 살짝 위로 빗나간 손가락 (v413) */
const KEY_SLOP = 20;
/** 건반을 누른 뒤 이만큼(ms) 안에 오는 그림판 「톡」은 시작이 아니다 — 건반에서 위로 미끄러져 뗀 손가락 (v413) */
const KEY_CLICK_MS = 800;
/** 🎹 자유롭게 치기 — 왼쪽 끝 도의 옥타브(C1~C6 · 셋이면 가운데 도가 한가운데) · 방금 친 계이름 수 · 친 시간에 넣는 쉰 틈 상한 */
const FREE_OCT = { min: 1, max: 6, def: 3 };
const TRAIL_MAX = 8;
const FREE_GAP_MS = 10000;

// ───────────────────── 고른 것 기억 (이 기기) ─────────────────────

function loadPrefs() {
  try {
    const v = JSON.parse(localStorage.getItem(PREF_KEY) || 'null') || {};
    if (['tap', 'listen'].includes(v.mode)) S.mode = v.mode;
    if (['R', 'L', 'B'].includes(v.hands)) S.hands = v.hands;
    if (LEVELS.includes(v.lv)) S.lv = v.lv;
    const sp = Number(v.sp);
    if (sp >= SPEED.min && sp <= SPEED.max) S.sp = sp;
    S.loop = v.loop === true;
    if (Number.isInteger(v.freeOct) && v.freeOct >= FREE_OCT.min && v.freeOct <= FREE_OCT.max) S.freeOct = v.freeOct;
    S.freeNames = v.freeNames !== false;
    return v;
  } catch { return {}; }
}
function savePrefs() {
  try { localStorage.setItem(PREF_KEY, JSON.stringify({ mode: S.mode, hands: S.hands, lv: S.lv, sp: S.sp, loop: S.loop, song: S.song ? S.song.id : '', line: S.line, freeOct: S.freeOct, freeNames: S.freeNames })); } catch { /* 못 적어도 */ }
}

// ───────────────────── 소리 (Web Audio · 잔향 없음) ─────────────────────

let AC = null;
let master = null;
function audio() {
  if (!AC) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    try {
      AC = new C();
      master = AC.createGain();
      master.gain.value = 0.55;
      const comp = AC.createDynamicsCompressor();
      master.connect(comp);
      comp.connect(AC.destination);
    } catch { AC = null; return null; }
  }
  if (AC.state === 'suspended') AC.resume().catch(() => {});
  return AC;
}
const freq = (m) => 440 * Math.pow(2, (m - 69) / 12);
/** 건반 소리 하나 — sec를 주면 그만큼 뒤에 스스로 줄어든다 · 안 주면 noteOff까지 */
function noteOn(midi, vel, sec = 0) {
  const a = audio();
  if (!a) return null;
  try {
    const t0 = a.currentTime;
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vel, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(vel * 0.4, t0 + 0.22);
    const end = t0 + (sec > 0 ? Math.max(0.2, sec) : 2.6);
    g.gain.exponentialRampToValueAtTime(sec > 0 ? Math.max(0.0002, vel * 0.12) : 0.0001, end);
    if (sec > 0) g.gain.setTargetAtTime(0.0001, end, 0.06);
    const o1 = a.createOscillator(); o1.type = 'triangle'; o1.frequency.value = freq(midi);
    const o2 = a.createOscillator(); o2.type = 'sine'; o2.frequency.value = freq(midi) * 2;
    const g2 = a.createGain(); g2.gain.value = 0.22;
    o1.connect(g); o2.connect(g2); g2.connect(g); g.connect(master);
    o1.start(t0); o2.start(t0); o1.stop(end + 0.4); o2.stop(end + 0.4);
    const v = { g, o1, o2 };
    // 다 울리면 앱이 친 음 목록에서 빼고 연결을 끊는다
    o1.onended = () => { S.auto.delete(v); try { g.disconnect(); } catch { /* 이미 */ } };
    return v;
  } catch { return null; }
}
function noteOff(v) {
  if (!v || !AC) return;
  try {
    const t = AC.currentTime;
    v.g.gain.cancelScheduledValues(t);
    v.g.gain.setValueAtTime(Math.max(0.0001, v.g.gain.value), t);
    v.g.gain.setTargetAtTime(0.0001, t, 0.07);
    v.o1.stop(t + 0.5); v.o2.stop(t + 0.5);
  } catch { /* 이미 멈춤 */ }
}
/** 앱이 친 음을 모두 끈다 — 멈춤·떠남·숨김·판 새로 (길게 예약된 음이 떠난 화면에서 울리지 않게 · Codex 204차 P2-2) */
function hushAuto() {
  for (const v of S.auto) noteOff(v);
  S.auto.clear();
}
/** 음악을 떠났거나 앱을 내렸으면 소리 장치를 재운다 — 깨어 있는 소리 장치는 소리가 없어도 태블릿 소리 길을 계속 연다 (v407) ·
 *  끄던 음이 다 사그라진 뒤에 · 다시 누르면 audio()가 깨운다 */
function sleepAudio() {
  setTimeout(() => {
    if (!AC || AC.state !== 'running' || typeof AC.suspend !== 'function' || (S.active && !document.hidden)) return;
    const a = AC;
    let p;
    try { p = Promise.resolve(a.suspend()); } catch { return; }
    // 재우기는 늦게 끝날 수 있다 — 그사이 돌아와 건반을 누르면 audio()는 아직 깨어 있는 줄 알고 깨우지 않는다 → 끝났을 때 돌아와 있으면 다시 깨운다 (Codex 212차 P2)
    p.catch(() => {}).then(() => {
      if (AC === a && a.state === 'suspended' && S.active && !document.hidden) a.resume().catch(() => {});
    });
  }, 700);
}
function click(strong) {
  const a = audio();
  if (!a) return;
  try {
    const t0 = a.currentTime;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = 'sine'; o.frequency.value = strong ? 1760 : 1320;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.06);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + 0.08);
  } catch { /* 소리 없이도 */ }
}
// 빠르기가 바뀌는 곡(v403 tempo)은 지금 치는 마디의 빠르기로
const secPerBeat = () => 60 / (bpmAt(S.song, S.perf, S.t) * S.sp);

// ───────────────────── 화면 꺼짐 막기 ─────────────────────

let wake = null;
let wakeGen = 0;
function dropWake(w) {
  try { Promise.resolve(w.release()).catch(() => {}); } catch { /* 이미 놓음 */ }
}
/** ★ 요청이 늦게 끝나면 그사이 멈췄거나 떠났을 수 있다 — 요청 세대와 지금 형편을 다시 보고, 아니면 받은 것을 바로 놓는다 (Codex 204차 P3-6) */
async function keepAwake(on) {
  const my = ++wakeGen;
  if (!on) {
    const w = wake;
    wake = null;
    if (w) dropWake(w);
    return;
  }
  if (wake || typeof navigator === 'undefined' || !navigator.wakeLock) return;
  let w = null;
  try { w = await navigator.wakeLock.request('screen'); } catch { return; }
  if (!w) return;
  if (my !== wakeGen || wake || !S.active || !S.running || document.hidden) { dropWake(w); return; }
  wake = w;
  w.addEventListener('release', () => { if (wake === w) wake = null; });
}

// ───────────────────── 진행 ─────────────────────

const isPlayer = (s) => S.mode === 'tap' && (S.hands === 'B' || s.hand === S.hands);
const focusHand = (hand) => S.hands === 'B' || hand === S.hands;

function toStart() {
  S.t = -LEAD;
  S.steps = S.mode === 'tap' ? stepsOf(S.perf, S.hands).map((s) => ({ t: s.t, need: s.need, got: new Set() })) : [];
  S.si = 0; S.waiting = false; S.ok = 0; S.bad = 0; S.passStall = 0;
  S.sounding.clear(); S.flash.clear();
  for (const h of S.perf.heads) delete h.okAt;
  S.drawn = 0; // 처음으로 — 멈춰 있어도 다음 화면에 바로 그린다 (v407 · Codex 212차)
}

function advance(db) {
  const t0 = S.t;
  let t1 = t0 + db;
  for (let k = Math.ceil(t0); k <= -1; k += 1) if (k >= t0 && k < t1) click(k === -LEAD);
  if (S.mode === 'tap') {
    const st = S.steps[S.si];
    if (st && t1 >= st.t) {
      if (st.got.size >= st.need.length) S.si += 1;
      else {
        st.late = (st.late || 0) + (t1 - st.t); // 🎺 막대가 닿은 뒤 기다리게 한 박 (v413 — 한 화면에 0.25초까지만 들어온다: 태블릿 멈칫은 아이 탓이 아니다)
        t1 = st.t;
        S.waiting = true;
      }
    }
  }
  const secOf = (s) => (secsOf(S.song, S.perf, s.t, s.dur) / S.sp) * 0.95;   // 빠르기가 바뀌는 자리를 걸치는 음은 마디마다 그 빠르기로 (Codex 208차 P2)
  for (const s of S.perf.notes) {
    if (s.t < t0 || s.t >= t1 || isPlayer(s)) continue;
    const vel = S.mode === 'tap' ? 0.18 : S.hands === 'B' ? 0.26 : focusHand(s.hand) ? 0.32 : 0.1;
    const sec = secOf(s);
    const v = noteOn(s.midi, vel, sec);
    if (v) S.auto.add(v);
    S.sounding.set(s.midi, { hand: s.hand, until: performance.now() + sec * 1000 });
  }
  S.t = t1;
  if ((S.mode !== 'tap' || S.si >= S.steps.length) && S.t >= S.perf.end + 0.6) passEnd();
}

function press(midi) {
  const st = S.steps[S.si];
  if (S.mode !== 'tap' || !S.running || !st) { flashKey(midi, 'plain'); return; }
  const kind = pressKind(st, S.t, S.waiting, midi);
  if (kind === 'ok') {
    st.got.add(midi);
    S.ok += 1;
    const s = S.perf.notes.find((x) => Math.abs(x.t - st.t) < 1e-6 && x.midi === midi && isPlayer(x));
    for (const h of S.perf.heads) if (Math.abs(h.t - st.t) < 1e-6 && h.notes.some((n) => n.midi === midi)) h.okAt = performance.now();
    flashKey(midi, 'ok', s ? s.hand : 'R');
    if (st.got.size >= st.need.length && S.waiting) { S.waiting = false; S.si += 1; }
    else if (st.got.size >= st.need.length) st.early = Math.max(0, st.t - S.t); // 🎺 막대가 닿기 전에 다 눌렀다 — 남은 박 (v413)
  } else if (kind === 'bad') {
    S.bad += 1;
    flashKey(midi, 'bad');
  } else flashKey(midi, 'plain');
}
function flashKey(midi, kind, hand) {
  S.flash.set(midi, { kind, hand, until: performance.now() + (kind === 'bad' ? 320 : 260) });
}
function keyDown(midi) {
  if (S.held.has(midi)) return;
  // 🎹 자유롭게 치기 — 음악 시간을 다 쓰면 ⏳ 잠금 화면 (판이 없어 「하던 것만 끝내고」가 없다 · v408)
  if (S.screen === 'free' && isLocked('music')) { guardStart('music', () => {}); return; }
  S.held.set(midi, noteOn(midi, 0.34));
  if (S.screen === 'free') noteFree(midi);
  press(midi);
}
function keyUp(midi) {
  noteOff(S.held.get(midi));
  S.held.delete(midi);
}
/** 손 하나를 뗐다 — 같은 건반을 아직 누르는 다른 손가락·PC 자판이 있으면 소리를 그대로 둔다 (Codex 213차 P2) */
function release(midi) {
  if (S.pcDown.has(midi)) return;
  for (const m of S.ptr.values()) if (m === midi) return;
  keyUp(midi);
}

/** 그 판(줄·곡)을 끝까지 갔다 */
function passEnd() {
  const req = { song: S.song.id, line: S.line, hand: S.hands, lv: S.lv, sp: Math.round(S.sp * 100) / 100 };
  let grade = '';
  if (S.mode === 'tap') {
    const ok = S.ok;
    const bad = S.bad;
    const g = beatScore(S.steps, ok, bad); // 🎺 박자 점수 — 아이 화면엔 안 쓴다 (v413)
    grade = beatGrade(g, ok, bad);
    // 끝낸 판의 하루 칸은 여기서 한 번 — 「🔁 다시 받기」는 💰만 다시 받는다 (Codex 204차 P3-7)
    applyDailyDelta(clockDay(), { pnTapN: 1, ...(goodPass(ok, bad) ? { pnTapOk: 1 } : {}), [GRADE_DAILY[grade]]: 1 }).catch(() => {});
    sendTap({ ...req, ok, bad, g, st: Math.round(S.passStall) });
  } else {
    S.passDone = true;
    showDone();
    if (!S.loop) toast('<b>끝까지 연주했어요</b>진짜 피아노로 끝까지 쳤으면 「✋ 피아노로 다 쳤어요」를 눌러요.', 3000);
  }
  toStart();
  if (grade) startFx(grade); // 처음으로 돌린 뒤에 — 다음 판 준비 박 동안에도 보인다
  if (!S.loop) setRun(false);
  else rerun();
}

/** 🎹 💰 받기 — 실패하면 「🔁 다시 받기」가 이것만 다시 부른다 */
function sendTap(req) {
  const gen = S.gen;
  S.retry = null;
  showRetry();
  pianoTap(req).then((r) => {
    const got = r && r.ok && Array.isArray(r.got) ? r.got : [];
    if (r && r.ok && (r.coins || r.slot === 'ok' || got.length)) {
      applyDailyDelta(clockDay(), { ...(r.coins ? { pnCoins: r.coins } : {}), ...(r.slot === 'ok' ? { pnTapSlots: 1 } : {}), ...(got.length ? { pnMons: got.length } : {}) }).catch(() => {});
    }
    if (got.length) showArrivals(got, r.firsts); // 🐾 건반 열 칸 (v413) — 판이 바뀌었어도 온 포켓몬은 보여 준다
    if (r && r.ok) renderSlots();
    if (gen !== S.gen) return;
    if (!r || !r.ok) {
      S.retry = () => sendTap(req);
      showRetry();
      toast('<b>저장이 안 됐어요</b>「🔁 다시 받기」를 눌러 주세요.', 3200);
      return;
    }
    if (got.length) return; // 🐾 온 포켓몬 창이 대신 말한다
    // 🎹 건반 칸 한 줄 (v413) — 칸 수는 쓰지 않는다 · 잘 치지 못한 판은 「한 번 더」 말만
    const slot = { ok: `<br>${keysHtml(slotsOf(r.taps, r.tapMons, TAPS_PER_MON).filled)}`, line: '<br>「곡 전체」를 끝까지 치면 🎹 건반 칸이 차요', cap: '<br>오늘 🎹 건반 칸은 다 채웠어요' }[r.slot] || '';
    if (r.coins) toast(`<b>끝까지 쳤어요! 💰 +${r.coins}</b>${nextHint(S.lv)}${slot}`, 3400);
    else if (r.why === 'cap') toast(`<b>끝까지 쳤어요!</b>오늘 💰는 다 받았어요 — 연습은 얼마든지!${slot}`, 3400);
    else toast('<b>끝까지 쳤어요!</b>한 번 더 해 볼까요? 잃는 건 없어요.', 3000);
  }).catch(() => {
    if (gen !== S.gen) return;
    S.retry = () => sendTap(req);
    showRetry();
  });
}

function sendListen() {
  if (!S.passDone || S.saving) return;
  const req = { song: S.song.id, line: S.line, hand: S.hands, lv: S.lv, sp: Math.round(S.sp * 100) / 100 };
  const gen = S.gen;
  S.saving = true;
  S.passDone = false;
  showDone();
  pianoListen(req).then((r) => {
    S.saving = false;
    const got = r && r.ok && Array.isArray(r.got) ? r.got : [];
    if (r && r.ok) applyDailyDelta(clockDay(), { pnListenN: 1, ...(r.counted ? { pnNotes: 1 } : {}), ...(got.length ? { pnMons: got.length } : {}) }).catch(() => {});
    if (got.length) showArrivals(got, r.firsts); // 🐾 판이 바뀌었어도 온 포켓몬은 보여 준다 — 도감에는 이미 들어갔다 (v404)
    if (r && r.ok) renderSlots(); // ♪ 칸은 판 것이 아니라 기록 것 — 저장하는 사이 줄·곡을 바꿨어도 새 화면에 맞게 (Codex 209차 P3)
    if (gen !== S.gen) return;
    if (!r || !r.ok) {
      S.passDone = true;
      showDone();
      toast('<b>저장이 안 됐어요</b>「✋ 피아노로 다 쳤어요」를 한 번 더 눌러 주세요.', 3200);
      return;
    }
    const sl = slotsOf(r.notes, r.mons);
    // 음표 칸은 ♪ 그림으로만 — 알림 말에도 칸 수를 쓰지 않는다 (Codex 204차 P2-4)
    if (got.length) return; // 🐾 온 포켓몬 창이 대신 말한다
    if (!r.counted) toast('<b>오늘 음표 칸은 다 채웠어요</b>연습은 얼마든지 해도 돼요!', 3200);
    else if (sl.filled === NOTES_PER_MON) toast(`<b>🎉 음표가 가득 찼어요!</b>${slotsHtml(sl.filled)}<br>음악 포켓몬을 만날 준비 끝!`, 3800);
    else toast(`<b>🎵 음표를 채웠어요!</b>${slotsHtml(sl.filled)}<br>${nextHint(S.lv)}`, 3200);
  }).catch(() => {
    S.saving = false;
    if (gen !== S.gen) return;
    S.passDone = true;
    showDone();
  });
}

function setRun(on) {
  S.running = on;
  S.last = performance.now();
  if (!on) hushAuto();
  const go = $('pn-go');
  if (go) go.textContent = on ? '⏸ 멈춤' : '▶ 시작';
  keepAwake(on);
}
/** ▶·⏸ — 새로 시작할 때만 ⏳ 관문 (하던 판은 끝까지 — 아버님 결정 ②) */
function toggle() {
  audio();
  if (S.running) { setRun(false); return; }
  guardStart('music', () => setRun(true));
}
/** 연주 중에 새 판이 시작된다(🔁 계속의 다음 판 · ⟲ 처음부터) — 이것도 새로 시작이라 ⏳ 관문 · 잠겼으면 멈춘다 (Codex 204차 P2-1) */
function rerun() {
  if (S.running && isLocked('music')) { setRun(false); guardStart('music', () => setRun(true)); }
}
function restart() {
  hushAuto();
  toStart();
  S.last = performance.now();
  rerun();
}

// ───────────────────── 그리기 ─────────────────────

const G = { W: 800, H: 480, dpr: 1, bg: null };
let cv = null;
let ctx = null;
/** 별은 밝기 세 무리로 — 무리마다 한 번에 칠한다 (v407 · 전엔 별마다 한 번씩 90번) */
const STAR_A = [0.35, 0.55, 0.75];
const STARS = Array.from({ length: 90 }, (_, i) => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.3 + 0.3, g: i % STAR_A.length }));

/** 옛 그림판을 버린다 — 떼어 낸 캔버스도 쓰레기 줍기 전까지 큰 픽셀 판(최대 약 2560×1520)을 쥐고 있어 크기를 0으로 바로 비운다 (v407) */
function dropCanvas() {
  if (S.ro) { S.ro.disconnect(); S.ro = null; }
  if (cv) { try { cv.width = 0; cv.height = 0; } catch { /* 이미 */ } }
  cv = null;
  ctx = null;
  G.bg = null;
}

function computeWindow() {
  const notes = S.mode === 'tap' ? S.perf.notes.filter((s) => focusHand(s.hand)) : S.perf.notes;
  const minKeys = S.mode === 'tap' ? (G.W >= 900 ? 15 : G.W >= 600 ? 12 : 9) : (G.W >= 900 ? 22 : G.W >= 600 ? 17 : 12);
  S.win = keyWindow((notes.length ? notes : S.perf.notes).map((s) => s.midi), S.mode === 'tap' ? 1 : 2, minKeys);
}

function layout() {
  const box = $('pn-stage');
  if (!box || !cv) return;
  G.W = Math.max(300, Math.round(box.clientWidth));
  const top = box.getBoundingClientRect().top;
  const avail = Math.round(window.innerHeight - Math.max(0, top) - 10);
  G.H = Math.round(Math.max(300, Math.min(760, avail, G.W * 0.75)));
  G.dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(G.W * G.dpr);
  cv.height = Math.round(G.H * G.dpr);
  cv.style.height = `${G.H}px`;
  G.bg = null;   // 높이가 바뀌었을 수 있다 — 배경 물감을 다시
  S.drawn = 0;   // 크기를 다시 잡으면 그림판이 비워진다 — 멈춰 있어도 다음 화면에 바로 그린다 (v407)
  cv.style.touchAction = S.mode === 'tap' || S.screen === 'free' ? 'none' : 'manipulation';
  if (S.screen === 'free') {
    // 🎹 자유롭게 치기 — 위 ⅓은 방금 친 계이름 · 아래는 큰 건반 두 옥타브(흰 건반 15개 · C부터 C까지)
    G.keysH = Math.round(G.H * 0.66);
    G.keysTop = G.H - G.keysH;
    G.mapY = G.keysTop - 13;
    const lo = whiteIdx(12 * (S.freeOct + 1));
    S.win = { lo, hi: lo + 14 };
    G.kw = G.W / 15;
    return;
  }
  G.keysH = Math.round(G.H * (S.mode === 'tap' ? 0.26 : 0.22));
  G.keysTop = G.H - G.keysH;
  G.mapY = G.keysTop - 13;
  G.sheetH = S.lv === 1 ? Math.round(G.H * 0.42) : G.keysTop - 38;
  G.s = (G.sheetH - 14) / 26.5;
  G.barsTop = S.lv === 1 ? G.sheetH : G.keysTop;
  G.ppbB = (G.keysTop - 16 - G.barsTop) / 3.3;
  computeWindow();
  G.kw = G.W / (S.win.hi - S.win.lo + 1);
}

function keyRect(midi) {
  const wi = whiteIdx(midi);
  if (wi < S.win.lo || wi > S.win.hi) return null;
  const x = (wi - S.win.lo) * G.kw;
  if (!isBlack(midi)) return { x, w: G.kw, black: false };
  if (wi + 1 > S.win.hi) return null;
  const bw = G.kw * 0.58;
  return { x: x + G.kw - bw / 2, w: bw, black: true };
}
function hitKey(px, py) {
  if (py < G.keysTop - KEY_SLOP) return null;
  py = Math.max(py, G.keysTop); // 건반 바로 위 띠는 건반 윗부분 (v413)
  if (py - G.keysTop < G.keysH * 0.62) {
    for (let wi = S.win.lo; wi < S.win.hi; wi += 1) {
      const li = ((wi % 7) + 7) % 7;
      if (li === 2 || li === 6) continue;
      const r = keyRect(midiOfWhite(wi) + 1);
      if (r && px >= r.x && px <= r.x + r.w) return midiOfWhite(wi) + 1;
    }
  }
  const wi = S.win.lo + Math.floor(px / G.kw);
  return wi >= S.win.lo && wi <= S.win.hi ? midiOfWhite(wi) : null;
}
function rr(x, y, w, h, r) {
  const q = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + q, y); ctx.lineTo(x + w - q, y); ctx.quadraticCurveTo(x + w, y, x + w, y + q);
  ctx.lineTo(x + w, y + h - q); ctx.quadraticCurveTo(x + w, y + h, x + w - q, y + h);
  ctx.lineTo(x + q, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - q);
  ctx.lineTo(x, y + q); ctx.quadraticCurveTo(x, y, x + q, y); ctx.closePath();
}

function staffGeom() {
  const s = G.s;
  const tTop = 7 + 3.6 * s;
  const tBot = tTop + 4 * s;
  const bTop = tBot + 7.4 * s;
  const bBot = bTop + 4 * s;
  const clefW = 9 * s;
  return { s, tTop, tBot, bTop, bBot, clefW, playX: clefW + 3 * s, ppb: 5.4 * s };
}
const noteY = (g, hand, d) => (hand === 'R' ? g.tBot - (d - 30) * g.s / 2 : g.bBot - (d - 18) * g.s / 2);
function ledger(g, hand, d, x) {
  const s = g.s;
  ctx.strokeStyle = '#30343f';
  ctx.lineWidth = Math.max(1, s * 0.11);
  const lines = [];
  const [lo, hi] = hand === 'R' ? [28, 40] : [16, 28];
  for (let k = lo; k >= d; k -= 2) lines.push(k);
  for (let k = hi; k <= d; k += 2) lines.push(k);
  for (const k of lines) {
    const y = noteY(g, hand, k);
    ctx.beginPath(); ctx.moveTo(x - s * 0.95, y); ctx.lineTo(x + s * 0.95, y); ctx.stroke();
  }
}
function glyph(ch, x, y, size, color, align = 'center') {
  ctx.font = `${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(ch, x, y);
}

function drawHead(g, h, x, now) {
  const s = g.s;
  const hand = h.hand;
  const col = COLOR[hand];
  const isFocus = focusHand(hand);
  const past = h.t + h.dur <= S.t - 0.05;
  ctx.globalAlpha = past ? 0.42 : isFocus ? 1 : 0.5;
  if (h.rest) {
    const ch = h.dur >= 4 ? '\u{1D13B}' : h.dur >= 2 ? '\u{1D13C}' : h.dur >= 1 ? '\u{1D13D}' : '\u{1D13E}';
    const top = hand === 'R' ? g.tTop : g.bTop;
    glyph(ch, x, top + 3.1 * s, s * 3.2, '#3a3f4b');
    ctx.globalAlpha = 1;
    return;
  }
  if (S.lv <= 3 && S.running) {
    const st = S.steps[S.si];
    if (S.mode === 'tap' && isFocus && st && Math.abs(st.t - h.t) < 1e-6) {
      const pulse = S.waiting ? 0.55 + 0.25 * Math.sin(now / 160) : 0.35;
      ctx.fillStyle = `rgba(${RGB[hand]},${pulse * 0.45})`;
      for (const n of h.notes) if (!st.got.has(n.midi)) { ctx.beginPath(); ctx.arc(x, noteY(g, hand, n.d), s * 1.35, 0, Math.PI * 2); ctx.fill(); }
    } else if (S.mode === 'listen' && h.t <= S.t && S.t < h.t + h.dur) {
      ctx.fillStyle = `rgba(${RGB[hand]},${isFocus ? 0.28 : 0.14})`;
      for (const n of h.notes) { ctx.beginPath(); ctx.arc(x, noteY(g, hand, n.d), s * 1.4, 0, Math.PI * 2); ctx.fill(); }
    }
  }
  const avg = h.notes.reduce((a, n) => a + n.d, 0) / h.notes.length;
  const up = avg < (hand === 'R' ? 34 : 22);
  const open = h.dur >= 2;
  const okNow = h.okAt && now - h.okAt < 600;
  for (const n of h.notes) {
    ledger(g, hand, n.d, x);
    const y = noteY(g, hand, n.d);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.33);
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.66, s * 0.46, 0, 0, Math.PI * 2);
    const c = okNow ? '#2fbf7a' : col;
    if (open) { ctx.lineWidth = s * 0.2; ctx.strokeStyle = c; ctx.stroke(); } else { ctx.fillStyle = c; ctx.fill(); }
    ctx.restore();
    if (n.acc) glyph(n.acc > 0 ? '♯' : '♭', x - s * 1.6, y + s * 0.7, s * 2.1, col);
    if ([0.75, 1.5, 3].some((v) => Math.abs(h.dur - v) < 1e-6)) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(x + s * 1.05, y - (n.d % 2 === 0 ? s * 0.5 : 0), s * 0.17, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (h.dur < 4 - 1e-6) {
    const ys = h.notes.map((n) => noteY(g, hand, n.d));
    const sx = up ? x + s * 0.6 : x - s * 0.6;
    const y0 = up ? Math.max(...ys) : Math.min(...ys);
    const y1 = up ? Math.min(...ys) - 3.4 * s : Math.max(...ys) + 3.4 * s;
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(1.2, s * 0.13);
    ctx.beginPath(); ctx.moveTo(sx, y0); ctx.lineTo(sx, y1); ctx.stroke();
    const flags = h.dur <= 0.25 + 1e-6 ? 2 : h.dur <= 0.75 + 1e-6 ? 1 : 0;
    const dir = up ? 1 : -1;
    for (let f = 0; f < flags; f += 1) {
      const fy = y1 + dir * f * s * 0.9;
      ctx.beginPath();
      ctx.moveTo(sx, fy);
      ctx.bezierCurveTo(sx + s * 0.2, fy + dir * s * 1.1, sx + s * 1.5, fy + dir * s * 1.3, sx + s * 1.0, fy + dir * s * 2.6);
      ctx.lineWidth = Math.max(1.4, s * 0.2);
      ctx.stroke();
    }
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const fingers = h.notes.filter((n) => n.finger).map((n) => n.finger);
  if (fingers.length) {
    ctx.fillStyle = '#2a2f3c';
    ctx.font = `700 ${Math.max(10, s * 1.3)}px Georgia, serif`;
    // 화음의 손가락 번호는 음 높이 차례로 쌓는다 — 높은 음의 번호가 위 (h.notes는 낮은 음부터)
    if (hand === 'R') {
      const topY = Math.min(...h.notes.map((n) => noteY(g, hand, n.d)));
      const baseY = Math.min(g.tTop - 1.6 * s, topY - 1.6 * s);
      fingers.forEach((f, i) => ctx.fillText(String(f), x, baseY - i * s * 1.25));
    } else {
      const lowY = Math.max(...h.notes.map((n) => noteY(g, hand, n.d)));
      const baseY = Math.max(g.bBot + 1.8 * s, lowY + 1.6 * s);
      fingers.slice().reverse().forEach((f, i) => ctx.fillText(String(f), x, baseY + i * s * 1.25));
    }
  }
  if (S.lv <= 2) {
    ctx.fillStyle = col;
    ctx.font = `700 ${Math.max(11, s * 1.3)}px "Noto Sans KR", sans-serif`;
    const baseY = hand === 'R' ? g.tBot + 3.7 * s : g.bBot + 4.6 * s;
    h.notes.slice().reverse().forEach((n, i) => ctx.fillText(solOf(n), x, baseY + i * s * 1.3));
  }
  ctx.globalAlpha = 1;
}

/** 도돌이표 — dir 1 = 여는 ‖: (마디 줄 x 오른쪽) · -1 = 닫는 :‖ (x 왼쪽) · 두 오선 모두 */
function repeatSign(g, x, dir) {
  const s = g.s;
  ctx.strokeStyle = '#2a2f3c';
  ctx.fillStyle = '#2a2f3c';
  const thick = x + dir * 0.15 * s;
  const thin = x + dir * 0.55 * s;
  const dot = x + dir * 0.85 * s;
  for (const [top, bot] of [[g.tTop, g.tBot], [g.bTop, g.bBot]]) {
    ctx.lineWidth = Math.max(2.5, s * 0.32);
    ctx.beginPath(); ctx.moveTo(thick, top); ctx.lineTo(thick, bot); ctx.stroke();
    ctx.lineWidth = Math.max(1, s * 0.12);
    ctx.beginPath(); ctx.moveTo(thin, top); ctx.lineTo(thin, bot); ctx.stroke();
    for (const k of [1.5, 2.5]) { ctx.beginPath(); ctx.arc(dot, top + k * s, s * 0.17, 0, Math.PI * 2); ctx.fill(); }
  }
}
/** 1·2번 괄호 — 오선 위(코드 이름 줄 위) 선 · 첫 마디엔 왼쪽 갈고리와 「1.」 · 되돌아가는 괄호의 끝 마디엔 오른쪽 갈고리 */
function endingMark(g, e, num, x0, x1) {
  const s = g.s;
  const y = g.tTop - 3.5 * s;
  const { open, close } = endingShape(S.song, e, num);   // 되돌아가지 않는 괄호는 열린 채로 끝난다(책처럼)
  ctx.strokeStyle = '#2a2f3c';
  ctx.lineWidth = Math.max(1, s * 0.12);
  ctx.beginPath();
  if (open) { ctx.moveTo(x0 + 0.3 * s, y + 1.2 * s); ctx.lineTo(x0 + 0.3 * s, y); } else ctx.moveTo(x0, y);
  if (close) { ctx.lineTo(x1 - 0.3 * s, y); ctx.lineTo(x1 - 0.3 * s, y + 1.2 * s); } else ctx.lineTo(x1, y);
  ctx.stroke();
  if (open) {
    ctx.fillStyle = '#2a2f3c';
    ctx.font = `700 ${Math.max(10, s * 1.1)}px Georgia, serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(e.label, x0 + 0.6 * s, y + 1.15 * s);
  }
}
/** 8va·8vb — 적힌 자리보다 옥타브 위·아래로 치는 마디 · 점선과 첫 마디의 글자 (8vb는 오선 아래 · 8va는 위) */
function ottavaMark(g, o, num, x0, x1) {
  const s = g.s;
  const top = o.hand === 'R' ? g.tTop : g.bTop;
  const bot = o.hand === 'R' ? g.tBot : g.bBot;
  // 8vb 오른손은 계이름(두 줄까지) 아래 · 낮은음자리표 덧줄 위
  // 8va 오른손은 코드 이름 바로 위(괄호 선 아래) — 더 위는 악보 그림 밖이라 잘린다 (Codex 207차 P2-1) · 글자는 코드 이름 줄에
  const y = o.shift < 0 ? bot + (o.hand === 'R' ? 6.4 : 6.2) * s : top - (o.hand === 'R' ? 3.25 : 1.4) * s;
  ctx.strokeStyle = '#2a2f3c';
  ctx.lineWidth = Math.max(1, s * 0.1);
  ctx.setLineDash([s * 0.5, s * 0.4]);
  ctx.beginPath(); ctx.moveTo(num === o.from ? x0 + 2.6 * s : x0, y); ctx.lineTo(x1, y); ctx.stroke();
  ctx.setLineDash([]);
  if (num === o.to) { ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x1, y + (o.shift < 0 ? -0.9 : 0.9) * s); ctx.stroke(); }
  if (num === o.from) {
    ctx.fillStyle = '#2a2f3c';
    ctx.font = `700 italic ${Math.max(10, s * 1.05)}px Georgia, serif`;
    ctx.textAlign = 'left';
    const above = o.shift > 0 && o.hand === 'R';
    ctx.textBaseline = above ? 'alphabetic' : 'middle';
    ctx.fillText(o.shift < 0 ? '8vb' : '8va', x0 + 0.3 * s, above ? g.tTop - 2.4 * s : y);
    ctx.textBaseline = 'alphabetic';
  }
}

function drawSheet(now) {
  const g = staffGeom();
  const s = g.s;
  const xOf = (t) => g.playX + (t - S.t) * g.ppb;
  ctx.fillStyle = '#fbfaf6';
  rr(8, 6, G.W - 16, G.sheetH - 10, 10);
  ctx.fill();
  ctx.strokeStyle = '#3a3f4b';
  ctx.lineWidth = Math.max(1, s * 0.1);
  for (const top of [g.tTop, g.bTop]) for (let i = 0; i < 5; i += 1) { const y = top + i * s; ctx.beginPath(); ctx.moveTo(18, y); ctx.lineTo(G.W - 18, y); ctx.stroke(); }
  ctx.lineWidth = Math.max(2, s * 0.22);
  ctx.beginPath(); ctx.moveTo(18, g.tTop); ctx.lineTo(18, g.bBot); ctx.stroke();
  ctx.save();
  ctx.beginPath(); ctx.rect(g.clefW, 6, G.W - g.clefW - 10, G.sheetH - 10); ctx.clip();
  S.perf.bars.forEach((b, bi) => {
    const x0 = xOf(b.at) - 1.5 * s;
    const x1 = xOf(b.at + b.len) - 1.5 * s;
    if (x1 < g.clefW - 4 || x0 > G.W) return;
    const num = barNum(S.song, b.src);   // 책의 마디 번호 (못갖춘마디가 있으면 0부터)
    const last = bi === S.perf.bars.length - 1;
    const repEnd = (S.song.repeats || []).some((r) => r.to === num);
    ctx.strokeStyle = '#3a3f4b';
    ctx.lineWidth = last && !repEnd ? Math.max(2.5, s * 0.35) : Math.max(1, s * 0.12);
    ctx.beginPath(); ctx.moveTo(x1, g.tTop); ctx.lineTo(x1, g.tBot); ctx.moveTo(x1, g.bTop); ctx.lineTo(x1, g.bBot); ctx.stroke();
    if (repEnd) repeatSign(g, x1, -1);
    if ((S.song.repeats || []).some((r) => r.from === num)) repeatSign(g, x0, 1);
    // 마디 번호는 마디 줄 왼쪽 위 — 오른쪽에 두면 첫 음의 손가락 번호와 겹친다
    ctx.fillStyle = '#8a8f9c';
    ctx.font = `italic ${Math.max(10, s * 1.1)}px Georgia, serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    if (!(S.song.pickup && b.src === 0)) ctx.fillText(String(num), x0 - 3, g.tTop - 0.5 * s);   // 못갖춘마디는 책처럼 번호 없이
    ctx.textAlign = 'left';
    const ch = S.song.chords[String(num)] || [];
    ctx.fillStyle = '#6a7080';
    ctx.font = `600 ${Math.max(10, s * 1.05)}px Arial, sans-serif`;
    ch.forEach((c, i) => ctx.fillText(c, x0 + 2.2 * s + (i * (x1 - x0)) / ch.length, g.tTop - 2.4 * s));
    // 𝄋 세뇨 — 마디 줄 바로 오른쪽, 코드 이름 줄 높이 (손가락 번호보다 위)
    if (S.song.segno && S.song.segno === num) glyph('\u{1D10B}', x0 + 0.9 * s, g.tTop - 2.4 * s, s * 1.7, '#2a2f3c');
    for (const e of S.song.endings || []) if (e.bars.includes(num)) endingMark(g, e, num, x0, x1);
    for (const o of S.song.ottava || []) if (num >= o.from && num <= o.to) ottavaMark(g, o, num, x0, x1);
    ctx.fillStyle = '#2a2f3c';
    ctx.font = `700 italic ${Math.max(10, s * 1.05)}px Georgia, serif`;
    ctx.textAlign = 'right';
    // 세뇨·피네가 없으면 0 — 못갖춘마디 번호도 0이라 「있을 때만」 견준다
    if (S.song.fine && S.song.fine === num && S.line < 0) ctx.fillText('Fine', x1 - 4, g.bBot + 3.4 * s);
    if (S.song.ds && b.src === S.song.n - 1 && S.line < 0) ctx.fillText('D.S. al Fine', x1 - 4, g.bBot + 3.4 * s);
    // 박자가 바뀌는 마디 — 마디 줄 바로 앞에 작은 박자표 (마디 첫머리에 두면 첫 음 머리와 겹쳤다 — Codex 208차 P3)
    const mt = S.song.meter && S.song.meter[num];
    if (mt) {
      ctx.textAlign = 'center';
      ctx.font = `800 ${s * 1.9}px Georgia, serif`;
      for (const top of [g.tTop, g.bTop]) { ctx.fillText(String(mt), x0 - 0.9 * s, top + 1.75 * s); ctx.fillText('4', x0 - 0.9 * s, top + 3.75 * s); }
      ctx.font = `700 italic ${Math.max(10, s * 1.05)}px Georgia, serif`;
      ctx.textAlign = 'right';
    }
    const dy = S.song.dyn[String(num)];
    if (dy) { ctx.textAlign = 'left'; ctx.fillText(dy, x0 + 1.4 * s, g.tBot + 2.4 * s); }
  });
  ctx.fillStyle = `rgba(255,92,149,${S.waiting ? 0.55 : S.running ? 0.4 : 0.25})`;
  rr(g.playX - s * 0.9, g.tTop - 2.4 * s, s * 1.8, g.bBot - g.tTop + 4.6 * s, s * 0.9);
  ctx.fill();
  // 붙임줄
  ctx.lineWidth = Math.max(1.2, s * 0.16);
  for (const [hand, list] of [['R', S.perf.heads.filter((h) => h.hand === 'R')], ['L', S.perf.heads.filter((h) => h.hand === 'L')]]) {
    list.forEach((h, i) => {
      if (!h.tie || !list[i + 1]) return;
      const xa = xOf(h.t);
      const xb = xOf(list[i + 1].t);
      if (xb < g.clefW || xa > G.W) return;
      const y = noteY(g, hand, h.notes[0].d) + (hand === 'R' ? -s * 0.9 : s * 0.9);
      ctx.strokeStyle = COLOR[hand];
      ctx.beginPath(); ctx.moveTo(xa + s * 0.6, y); ctx.quadraticCurveTo((xa + xb) / 2, y + (hand === 'R' ? -s : s), xb - s * 0.6, y); ctx.stroke();
    });
  }
  for (const h of S.perf.heads) {
    const x = xOf(h.t);
    if (x < g.clefW - 3 * s || x > G.W + 3 * s) continue;
    drawHead(g, h, x, now);
  }
  ctx.restore();
  glyph('\u{1D11E}', 20 + s * 2.4, g.tTop + 3.0 * s, s * 4.4, '#2a2f3c');
  glyph('\u{1D122}', 20 + s * 2.4, g.bTop + 2.9 * s, s * 4.1, '#2a2f3c');
  ctx.fillStyle = '#2a2f3c';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${s * 2.3}px Georgia, serif`;
  const tsX = g.clefW - 2.4 * s;
  // 박자가 바뀌는 곡은 지금 치는 마디의 박자로 (v403)
  const here = S.perf.bars.find((b) => S.t < b.at + b.len) || S.perf.bars[S.perf.bars.length - 1];
  const nowBeats = here && Array.isArray(S.song.meters) ? S.song.meters[here.src] : S.song.beats;
  for (const top of [g.tTop, g.bTop]) { ctx.fillText(String(nowBeats), tsX, top + 1.05 * s); ctx.fillText('4', tsX, top + 3.0 * s); }
}

function drawBars() {
  const top = G.barsTop;
  const bot = G.keysTop - 16;
  ctx.save();
  ctx.beginPath(); ctx.rect(0, top, G.W, bot - top); ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  for (let wi = S.win.lo; wi <= S.win.hi; wi += 1) {
    if (((wi % 7) + 7) % 7 !== 0) continue;
    const x = (wi - S.win.lo) * G.kw;
    ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, bot); ctx.stroke();
  }
  for (const s of S.perf.notes) {
    const r = keyRect(s.midi);
    if (!r) continue;
    const yb = bot - (s.t - S.t) * G.ppbB;
    const yt = yb - s.dur * G.ppbB + 3;
    if (yt > bot || yb < top) continue;
    const isFocus = focusHand(s.hand);
    const col = COLOR[s.hand];
    ctx.globalAlpha = isFocus ? 0.95 : 0.3;
    if (isFocus && yb > bot - G.ppbB * 0.8) { ctx.shadowColor = col; ctx.shadowBlur = 14; }
    ctx.fillStyle = col;
    rr(r.x + 3, yt, r.w - 6, yb - yt, Math.min(8, r.w / 3));
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    if (isFocus && s.finger && yb - yt > 20) {
      ctx.fillStyle = '#ffffff';
      ctx.font = `800 ${Math.min(17, r.w * 0.5)}px Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(String(s.finger), r.x + r.w / 2, Math.min(yb, bot) - 4);
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

/** 건반 — names면 흰 건반마다 계이름(🎹 자유롭게 치기 · v408) · 아니면 도에만 */
function drawKeys(now, names = false) {
  const top = G.keysTop;
  const kh = G.keysH;
  ctx.fillStyle = 'rgba(255,170,205,0.85)';
  ctx.fillRect(0, top - 3, G.W, 3);
  const st = S.steps[S.si];
  const lit = (midi) => {
    const fl = S.flash.get(midi);
    if (fl && fl.until > now) {
      if (fl.kind === 'bad') return { c: '255,77,77', a: 0.9 };
      if (fl.kind === 'ok') return { c: RGB[fl.hand] || RGB.R, a: 0.95, down: true };
      return { c: '120,124,140', a: 0.35, down: true };
    }
    if (S.held.has(midi)) return { c: '120,124,140', a: 0.3, down: true };
    if (S.lv > 3) return null;
    if (S.mode === 'tap' && S.running && st && (S.waiting || st.t - S.t < 1) && st.need.includes(midi) && !st.got.has(midi)) {
      const s = S.perf.notes.find((x) => Math.abs(x.t - st.t) < 1e-6 && x.midi === midi);
      return { c: RGB[s ? s.hand : 'R'], a: S.waiting ? 0.55 + 0.3 * Math.sin(now / 160) : 0.4 };
    }
    const so = S.sounding.get(midi);
    if (so && so.until > now) return { c: RGB[so.hand], a: S.mode === 'tap' ? 0.3 : focusHand(so.hand) ? 0.85 : 0.35, down: S.mode === 'listen' };
    return null;
  };
  const paint = (r, base, l, black, h) => {
    const dy = l && l.down ? 2 : 0;
    const x = r.x + (black ? 0 : 1);
    const w = r.w - (black ? 0 : 2);
    ctx.fillStyle = base;
    rr(x, top + dy, w, h - dy, black ? 3 : 6);
    ctx.fill();
    if (l) { ctx.fillStyle = `rgba(${l.c},${l.a})`; rr(x, top + dy, w, h - dy, black ? 3 : 6); ctx.fill(); }
  };
  for (let wi = S.win.lo; wi <= S.win.hi; wi += 1) {
    const midi = midiOfWhite(wi);
    const r = keyRect(midi);
    paint(r, '#f6f6f2', lit(midi), false, kh - 2);
    const isDo = ((wi % 7) + 7) % 7 === 0;
    const fs = names ? Math.min(22, G.kw * 0.3) : Math.min(15, G.kw * 0.4);
    if (isDo || names) {
      ctx.fillStyle = isDo ? '#7b8090' : '#9aa0ae';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.font = `700 ${fs}px "Noto Sans KR", sans-serif`;
      ctx.fillText(names ? NAMES[midi % 12] : '도', r.x + r.w / 2, top + kh - 8);
    }
    if (isDo) {
      if (midi === 60) {
        ctx.fillStyle = '#d23a73';
        ctx.beginPath(); ctx.arc(r.x + r.w / 2, top + kh - 8 - fs - 7, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.font = `600 ${Math.min(11, G.kw * 0.3)}px "Noto Sans KR", sans-serif`;
        ctx.fillText('가운데', r.x + r.w / 2, top + kh - 8 - fs - 13);
      }
    }
  }
  for (let wi = S.win.lo; wi < S.win.hi; wi += 1) {
    const li = ((wi % 7) + 7) % 7;
    if (li === 2 || li === 6) continue;
    const midi = midiOfWhite(wi) + 1;
    const r = keyRect(midi);
    if (r) paint(r, '#1d1f27', lit(midi), true, kh * 0.62);
  }
  // 88건반 작은 띠 (A0~C8 · 흰건반 52개) — 지금 보이는 곳이 진짜 피아노의 어디쯤인지 · 분홍 점 = 가운데 도
  const x0 = 12;
  const w52 = (G.W - 24) / 52;
  const a0 = whiteIdx(21);
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  rr(x0, G.mapY, G.W - 24, 7, 3); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  rr(x0 + (S.win.lo - a0) * w52, G.mapY, (S.win.hi - S.win.lo + 1) * w52, 7, 3); ctx.fill();
  ctx.fillStyle = '#ff5c95';
  ctx.beginPath(); ctx.arc(x0 + (whiteIdx(60) - a0 + 0.5) * w52, G.mapY + 3.5, 3, 0, Math.PI * 2); ctx.fill();
}

function draw(now) {
  if (!ctx || (!S.perf && S.screen !== 'free')) return;
  ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
  if (!G.bg) {
    G.bg = ctx.createLinearGradient(0, 0, 0, G.H);
    G.bg.addColorStop(0, '#0a0f24');
    G.bg.addColorStop(1, '#151b3a');
  }
  ctx.fillStyle = G.bg;
  ctx.fillRect(0, 0, G.W, G.H);
  ctx.fillStyle = '#ffffff';
  for (let k = 0; k < STAR_A.length; k += 1) {
    ctx.globalAlpha = STAR_A[k];
    ctx.beginPath();
    for (const st of STARS) {
      if (st.g !== k) continue;
      const x = st.x * G.W;
      const y = st.y * G.H;
      ctx.moveTo(x + st.r, y);
      ctx.arc(x, y, st.r, 0, Math.PI * 2);
    }
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (S.screen === 'free') { drawTrail(); drawKeys(now, S.freeNames); return; } // 🎹 자유롭게 치기 (v408)
  drawSheet(now);
  if (S.lv === 1) drawBars();
  drawKeys(now);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  const fxOn = !!S.fx && now - S.fx.at < FX_MS;
  if (S.running && S.t < 0 && !fxOn) {
    const n = Math.ceil(-S.t);
    const cy = S.lv === 1 ? (G.barsTop + G.keysTop) / 2 : G.sheetH / 2;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 ${Math.round(G.H * 0.11)}px "Noto Sans KR", sans-serif`;
    if (n >= 1 && n <= LEAD) ctx.fillText(String(n), G.W / 2, cy);
    ctx.font = '700 15px "Noto Sans KR", sans-serif';
    ctx.fillText('준비', G.W / 2, cy - G.H * 0.08);
  } else if (S.running && S.waiting) {
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '600 13px "Noto Sans KR", sans-serif';
    ctx.fillText('기다릴게요 — 천천히 찾아봐요', G.W - 14, G.mapY - 6);
  } else if (!S.running && !fxOn) {
    if (S.t > -LEAD + 1e-6 || S.si > 0) drawPaused(); // 판 도중에 멈췄다 — 고장이 아니라 멈춤인 것이 보이게 (v413)
    else {
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = '700 14px "Noto Sans KR", sans-serif';
      ctx.fillText(S.mode === 'tap' ? '위쪽을 톡 = 시작' : '톡 누르면 시작', G.W - 14, G.mapY - 6);
    }
  }
  if (fxOn) drawFx(now);
}

/** 가운데 큰 글 자리 — 막대 칸(도움 1) 또는 악보 가운데 */
const midY = () => (S.lv === 1 ? (G.barsTop + G.keysTop) / 2 : G.sheetH / 2);
/** 판 도중 멈춤 (v413) — 가운데 띠에 크게 */
function drawPaused() {
  const cy = midY();
  const h = Math.min(120, G.H * 0.2);
  ctx.fillStyle = 'rgba(10,15,36,0.78)';
  rr(G.W * 0.12, cy - h / 2, G.W * 0.76, h, 18);
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 ${Math.round(h * 0.34)}px "Noto Sans KR", sans-serif`;
  ctx.fillText('⏸ 멈췄어요', G.W / 2, cy - h * 0.16);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = `600 ${Math.round(h * 0.16)}px "Noto Sans KR", sans-serif`;
  ctx.fillText(S.mode === 'tap' ? '▶ 시작을 누르면 이어서 쳐요' : '톡 누르면 이어서 들어요', G.W / 2, cy + h * 0.24);
}

// ───────────────────── 🎺 판 끝 박자 효과 (v413 진우 바람) ─────────────────────

/** 효과가 보이는 시간 */
export const FX_MS = 2400;
const FX_TEXT = {
  great: ['🎉 빠바밤!', '박자가 딱딱 맞았어요!'],
  good: ['👏 짝짝짝!', '끝까지 잘 쳤어요!'],
  boo: ['🎺 뿌우~', '다음엔 박자에 맞춰 볼까요?'],
};
const CONFETTI = ['#ff5c95', '#ffd166', '#3fa6f0', '#2fbf7a', '#c08cff', '#ff9f43'];
/** 효과 시작 — 그림(꽃가루는 🎉만 · 조각 서른여섯 · 자리는 시간으로 셈해 따로 들고 있지 않는다)과 소리 */
function startFx(kind) {
  const bits = kind === 'great' ? Array.from({ length: 36 }, (_, i) => ({
    x: Math.random(), vx: (Math.random() - 0.5) * 220, vy: -260 - Math.random() * 260, c: CONFETTI[i % CONFETTI.length], r: Math.random() * 6, spin: (Math.random() - 0.5) * 12,
  })) : null;
  S.fx = { kind, at: performance.now(), bits };
  fxSound(kind);
}
function drawFx(now) {
  const f = S.fx;
  const e = now - f.at;
  const fade = e < FX_MS * 0.75 ? 1 : Math.max(0, (FX_MS - e) / (FX_MS * 0.25));
  const [big, small] = FX_TEXT[f.kind] || FX_TEXT.good;
  const pop = 1 + 0.3 * Math.max(0, 1 - e / 220); // 처음에 톡 커졌다가
  const droop = f.kind === 'boo' ? Math.min(14, e / 60) : 0; // 🎺은 글이 축 처진다
  const h = Math.min(130, G.H * 0.22);
  const cy = G.keysTop - h / 2 - 22 + droop; // 건반 바로 위 — 가운데 위쪽의 💰 알림과 겹치지 않게
  ctx.globalAlpha = fade;
  ctx.fillStyle = f.kind === 'boo' ? 'rgba(40,44,70,0.85)' : 'rgba(10,15,36,0.8)';
  rr(G.W * 0.14, cy - h / 2, G.W * 0.72, h, 20);
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = f.kind === 'great' ? '#ffd166' : f.kind === 'good' ? '#ffffff' : '#c9cbe0';
  ctx.font = `900 ${Math.round(h * 0.36 * pop)}px "Noto Sans KR", sans-serif`;
  ctx.fillText(big, G.W / 2, cy - h * 0.14);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = `600 ${Math.round(h * 0.15)}px "Noto Sans KR", sans-serif`;
  ctx.fillText(small, G.W / 2, cy + h * 0.26);
  // 꽃가루는 띠 위로 지나가게 마지막에
  if (f.bits) {
    const sec = e / 1000;
    for (const b of f.bits) {
      const x = b.x * G.W + b.vx * sec;
      const y = G.H * 0.62 + b.vy * sec + 450 * sec * sec;
      if (y > G.H || x < -10 || x > G.W + 10) continue;
      ctx.fillStyle = b.c;
      ctx.setTransform(G.dpr, 0, 0, G.dpr, G.dpr * x, G.dpr * y);
      ctx.rotate(b.r + b.spin * sec);
      ctx.fillRect(-5, -3, 10, 6);
    }
    ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
  }
  ctx.globalAlpha = 1;
}
/** 울리고 있는 효과 소리 — 떠날 때·내릴 때·판을 새로 할 때 끈다 (안 끄면 돌아와서 남은 가락이 이어졌다 · Codex 217차 P2) */
const fxNodes = new Set();
function fxNode(n, out) {
  fxNodes.add(n);
  n.onended = () => { fxNodes.delete(n); try { out.disconnect(); } catch { /* 이미 */ } };
}
function hushFx() {
  for (const n of fxNodes) { try { n.stop(); } catch { /* 이미 멈춤 */ } }
  fxNodes.clear();
}
/** 거른 톱니파 한 음 — 나팔·트롬본 비슷한 소리 (bend: 끝으로 갈수록 내려가는 반음 수 · vib: 떨림) */
function horn(a, f, t0, dur, vol, { bend = 0, vib = 0, cut = 1800 } = {}) {
  const o = a.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(f, t0);
  if (bend) o.frequency.linearRampToValueAtTime(f * Math.pow(2, -bend / 12), t0 + dur);
  if (vib) {
    const l = a.createOscillator();
    const lg = a.createGain();
    l.frequency.value = 6;
    lg.gain.value = vib;
    l.connect(lg);
    lg.connect(o.frequency);
    l.start(t0 + dur * 0.3);
    l.stop(t0 + dur + 0.05);
    fxNode(l, lg);
  }
  const flt = a.createBiquadFilter();
  flt.type = 'lowpass';
  flt.frequency.setValueAtTime(cut * 0.5, t0);
  flt.frequency.linearRampToValueAtTime(cut, t0 + 0.06);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.025);
  g.gain.setValueAtTime(vol, t0 + dur * 0.75);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(flt); flt.connect(g); g.connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
  fxNode(o, g);
}
/** 손뼉 한 번 — 짧은 잡음 */
function clap(a, t0) {
  const n = Math.round(a.sampleRate * 0.09);
  const buf = a.createBuffer(1, n, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i += 1) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
  const src = a.createBufferSource();
  src.buffer = buf;
  const flt = a.createBiquadFilter();
  flt.type = 'bandpass';
  flt.frequency.value = 1400;
  flt.Q.value = 0.9;
  const g = a.createGain();
  g.gain.value = 0.6;
  src.connect(flt); flt.connect(g); g.connect(master);
  src.start(t0);
  fxNode(src, g);
}
/** 효과 소리 — 앱이 지은 가락(다른 게임·포켓몬 효과음을 베끼지 않음) · 소리 장치가 모자라면 그림만 */
function fxSound(kind) {
  const a = audio();
  if (!a) return;
  try {
    const t = a.currentTime + 0.05;
    if (kind === 'great') {
      // 솔·도·미 → 솔 → 도미솔도 화음
      [[392, 0, 0.12], [523.3, 0.13, 0.12], [659.3, 0.26, 0.12], [784, 0.39, 0.24]].forEach(([f, d, l]) => horn(a, f, t + d, l, 0.16));
      for (const f of [523.3, 659.3, 784, 1046.5]) horn(a, f, t + 0.68, 0.95, 0.09, { vib: 3 });
    } else if (kind === 'good') {
      for (const d of [0, 0.17, 0.34]) clap(a, t + d);
      horn(a, 1046.5, t + 0.5, 0.25, 0.06, { cut: 3000 });
    } else {
      // 뿌- 뿌- 뿌- 뿌우~ (반음씩 내려가고 마지막은 길게 떨며 처진다)
      [[293.7, 0], [277.2, 0.42], [261.6, 0.84]].forEach(([f, d]) => horn(a, f, t + d, 0.36, 0.15, { bend: 0.4, cut: 900 }));
      horn(a, 246.9, t + 1.26, 1.15, 0.15, { bend: 1.5, vib: 5, cut: 900 });
    }
  } catch { /* 소리 없이 그림만 */ }
}

/** 멈춰 있고 움직이는 그림이 없으면 이만큼에 한 번만 그린다 (v407 — 전엔 멈춰 있어도 1초에 60번 처음부터) */
export const IDLE_MS = 250;
/** 지금 움직이는 그림이 있나 — 연주 중 · 누르고 있는 건반 · 아직 사그라지는 건반 빛 · 맞힌 음표의 반짝임 */
function moving(now) {
  if (S.running || S.held.size) return true;
  if (S.fx && now - S.fx.at < FX_MS) return true; // 🎺 판 끝 효과 (v413)
  for (const f of S.flash.values()) if (f.until > now) return true;
  for (const s of S.sounding.values()) if (s.until > now) return true;
  return !!S.perf && S.perf.heads.some((h) => h.okAt && now - h.okAt < 600);
}
function frame(now) {
  S.raf = 0;
  if (!S.active || (S.screen !== 'stage' && S.screen !== 'free')) return;
  if (S.running) {
    if (now - S.last >= STALL.ms) noteStall(now - S.last); // ⚠️ 화면이 멈칫했다 (v413)
    advance(Math.min(0.25, (now - S.last) / 1000) / secPerBeat());
    // 🎧 진우는 진짜 피아노를 치느라 태블릿을 안 만진다 — 앱이 연주하는 동안은 손댄 것으로 (⏳ 음악 시간이 2분 쉼에 멈추지 않게)
    if (now - S.lastAct > 5000) { S.lastAct = now; noteActivity(); }
  }
  S.last = now;
  // 움직임이 막 끝난 화면도 한 번 더 그린다 — 사그라진 빛이 다음 그리기까지 남지 않게
  const mv = moving(now);
  if (mv || S.busy || now - S.drawn >= IDLE_MS) { S.drawn = now; draw(now); }
  S.busy = mv;
  S.raf = requestAnimationFrame(frame);
}
/** ⚠️ 연주 중 화면 멈칫 (v413) — 그 판의 가장 긴 것은 🎹 치기 기록 줄에 · 하루 칸은 번 수와 긴 것 수 (아이 화면엔 아무것도 없다) */
function noteStall(ms) {
  S.passStall = Math.max(S.passStall, ms);
  applyDailyDelta(clockDay(), { pnStallN: 1, ...(ms >= STALL.long ? { pnStallLong: 1 } : {}) }).catch(() => {});
}
function startLoop() {
  if (!S.raf) S.raf = requestAnimationFrame(frame);
}

// ───────────────────── 화면 짓기 ─────────────────────

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
function btn(text, cls, on) {
  const b = el('button', cls, text);
  b.type = 'button';
  b.addEventListener('click', on);
  return b;
}
/** 고르는 단추 묶음 — 누르면 on(값) */
function seg(label, items, cur, on, big = false) {
  const wrap = el('div', 'pn-field');
  if (label) wrap.appendChild(el('span', 'pn-label', label));
  const box = el('div', `pn-seg${big ? ' is-big' : ''}`);
  box.setAttribute('role', 'group');
  if (label) box.setAttribute('aria-label', label);
  for (const [v, t] of items) {
    const b = btn(t, '', () => {
      for (const x of box.children) x.setAttribute('aria-pressed', String(x === b));
      on(v);
    });
    b.setAttribute('aria-pressed', String(v === cur));
    box.appendChild(b);
  }
  wrap.appendChild(box);
  return wrap;
}

let toastTimer = 0;
function toast(html, ms) {
  const t = $('pn-toast');
  if (!t) return;
  t.innerHTML = html;
  t.className = S.fx && performance.now() - S.fx.at < FX_MS ? 'pn-toast is-high' : 'pn-toast'; // 판 끝 효과가 떠 있으면 위로 — 건반 위 효과 띠를 가리지 않게 (v413)
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}
const slotsHtml = (filled) => `<span class="pn-slots">${Array.from({ length: NOTES_PER_MON }, (_, i) => `<span class="${i < filled ? 'on' : ''}">♪</span>`).join('')}</span>`;
/** 🎹 건반 칸 그림 (v413) — 작은 건반 열 개가 하나씩 빛난다 · 수는 안 쓴다 */
const keysHtml = (filled) => `<span class="pn-tkeys">${Array.from({ length: TAPS_PER_MON }, (_, i) => `<span class="${i < filled ? 'on' : ''}"></span>`).join('')}</span>`;
function renderSlots() {
  const box = $('pn-slots');
  if (!box) return;
  box.hidden = false;
  const pn = pianoNow();
  // 🎹 태블릿으로 치기는 건반 열 칸(v413) · 🎧 듣고 따라 치기는 ♪ 다섯 칸 — 포켓몬이 오면 다시 0부터 (v404) · 누르면 🐾 안내 (v405)
  if (S.mode === 'tap') {
    box.innerHTML = `${keysHtml(slotsOf(pn.taps, pn.tapMons, TAPS_PER_MON).filled)}<span class="pn-slots-mon">→ 🐾</span>`;
    box.setAttribute('aria-label', '건반 칸 — 음악 포켓몬 안내');
  } else {
    box.innerHTML = `${slotsHtml(slotsOf(pn.notes, pn.mons).filled)}<span class="pn-slots-mon">→ 🐾</span>`;
    box.setAttribute('aria-label', '음표 칸 — 음악 포켓몬 안내');
  }
}

// ───────────────────── 🐾 음악 포켓몬이 왔어요 (v404) ─────────────────────

const arrive = { queue: [] };
/**
 * 온 음악 포켓몬을 차례로 — 「좋아요!」로 닫으면 다음 · 그림은 받아서(못 받으면 이름만) · 창은 음악 화면 안(다른 화면에선 안 보인다)
 * firsts = 올 때 처음 만났나(규칙이 준 것 · got과 같은 차례) — 지금 마릿수로 짐작하면 마지막 새 아이와 또 온 아이가 한꺼번에 올 때 첫 창도 「또」가 됐다 (Codex 209차 P3)
 */
function showArrivals(ids, firsts = []) {
  ids.forEach((id, i) => { if (Number.isInteger(id) && id > 0) arrive.queue.push({ id, first: typeof firsts[i] === 'boolean' ? firsts[i] : null }); });
  if (!$('pn-arrive') && !$('pn-intro')) nextArrival(); // 🐾 안내 창이 떠 있으면 닫은 뒤에 (v405)
}
function nextArrival() {
  const old = $('pn-arrive');
  if (old) old.remove();
  const host = $('view-music');
  const item = arrive.queue.shift();
  if (!host || !item) return;
  if (S.running) setRun(false); // 🔁 계속으로 치다 열째 칸 — 창이 악보를 가리니 ⏸처럼 멈춘다(안 멈추면 다음 판 첫 음이 「늦음」) · 닫은 뒤 ▶로 이어 (Codex 217차 P2)
  const { id } = item;
  const r = ROSTER.find((m) => m.id === id);
  const rank = RARITY[rarityOf(id)] || RARITY[2];
  const again = item.first === null ? caughtCount(id) > 1 : !item.first; // 50마리를 다 만난 뒤엔 만난 아이가 또 온다 (기본안 ④)
  const box = el('div', 'pn-arrive');
  box.id = 'pn-arrive';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-label', '음악 포켓몬이 왔어요');
  const card = el('div', 'pn-arrive-card');
  card.appendChild(el('b', 'pn-arrive-h', again ? '🎵 음악 포켓몬이 또 놀러 왔어요!' : '🎵 새 음악 포켓몬이 왔어요!'));
  const img = el('img', 'pn-arrive-img');
  img.alt = '';
  img.hidden = true;
  card.appendChild(img);
  card.appendChild(el('span', 'pn-arrive-name', r ? r.ko : `#${id}`));
  card.appendChild(el('small', 'pn-arrive-sub', `${rank.stars} ${rank.label} · ${again ? '도감에 한 마리 더' : '도감에 들어갔어요'}`));
  const ok = btn('좋아요!', 'btn btn-primary pn-arrive-ok', () => nextArrival());
  card.appendChild(ok);
  box.appendChild(card);
  host.appendChild(box);
  try { ok.focus(); } catch { /* 초점 없이도 */ }
  ensureCast([id]).then((c) => { if (c[0] && c[0].url && $('pn-arrive') === box) { img.src = c[0].url; img.hidden = false; } }).catch(() => {});
}

// ───────────────────── 🐾 음악 포켓몬 안내 (v405) ─────────────────────

const INTRO_KEY = 'shincoach.musicIntro';
/** 본 안내 판 — v413에 🎹 건반 칸이 생겨 한 번 더 보여 준다 (v405 판은 '1') */
const INTRO_VER = '2';
/** 안내 창에 보일 음악 포켓몬 — 랑딸랑(흔함) · 치렁(보통) · 테라파고스(전설) */
const INTRO_MONS = [433, 358, 1024];
function introSeen() {
  try { return localStorage.getItem(INTRO_KEY) === INTRO_VER; } catch { return false; }
}
/** 글 조각을 이어 붙인 한 줄 — [글, 굵게?] (innerHTML 없이) */
function introLine(tag, parts) {
  const e = el(tag);
  for (const [t, b] of parts) e.appendChild(el(b ? 'b' : 'span', '', t));
  return e;
}
/**
 * 🐾 음악 포켓몬은 어떻게 만나요? — 처음 들어올 때 한 번(「알겠어요!」로 닫아야 본 것) · ♪ 칸을 누르면 다시
 * 태블릿 화면 건반으로 얻는 줄 알 수 있어서 진짜 피아노로 끝까지 따라 쳐야 한다고 적는다 (아버님 11-09) · 셈·남은 수 없음
 * (v413) 🎹 태블릿으로 치기도 「곡 전체」를 끝까지 잘 치면 건반 칸 — 두 길을 나란히
 */
function showIntro() {
  const host = $('view-music');
  if (!host || $('pn-intro') || $('pn-arrive')) return;
  if (S.running) setRun(false); // 연주 중에 ♪ 칸을 눌렀다 — 창이 악보를 가리니 ⏸처럼 멈춘다 · 닫은 뒤 ▶로 이어 (Codex 210차 P2)
  const box = el('div', 'pn-arrive pn-intro');
  box.id = 'pn-intro';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-label', '음악 포켓몬을 만나요');
  const card = el('div', 'pn-arrive-card pn-intro-card');
  card.appendChild(el('b', 'pn-arrive-h', '🎵 음악 포켓몬을 만나요!'));
  const row = el('div', 'pn-intro-mons');
  const imgs = new Map();
  for (const id of INTRO_MONS) {
    const r = ROSTER.find((m) => m.id === id);
    const f = el('span', 'pn-intro-mon');
    const img = el('img');
    img.alt = '';
    img.hidden = true;
    f.appendChild(img);
    f.appendChild(el('small', '', r ? r.ko : ''));
    row.appendChild(f);
    imgs.set(id, img);
  }
  card.appendChild(row);
  card.appendChild(el('p', 'pn-intro-way', '🎧 진짜 피아노로'));
  const ol = el('ol', 'pn-intro-steps');
  ol.appendChild(introLine('li', [['「🎧 듣고 따라 치기」', true], ['를 골라요', false]]));
  ol.appendChild(introLine('li', [['앱이 치는 소리를 들으며 ', false], ['진짜 피아노', true], ['로 끝까지 따라 쳐요', false]]));
  ol.appendChild(introLine('li', [['「✋ 피아노로 다 쳤어요」', true], ['를 누르면 ♪ 하나', false]]));
  const last = el('li');
  const five = el('span', 'pn-slots'); // 빈 ♪ 다섯 — 무대의 칸과 같은 그림(수는 안 쓴다)
  for (let i = 0; i < NOTES_PER_MON; i++) five.appendChild(el('span', '', '♪'));
  last.appendChild(five);
  last.appendChild(el('span', '', '가 다 차면 🐾 음악 포켓몬이 와요!'));
  ol.appendChild(last);
  card.appendChild(ol);
  // 🎹 태블릿 화면 건반으로 (v413) — 「곡 전체」를 끝까지 잘 치면 건반 칸 하나 · 건반 칸이 다 차면 🐾 · 💰도
  card.appendChild(el('p', 'pn-intro-way', '🎹 태블릿 화면 건반으로'));
  const ol2 = el('ol', 'pn-intro-steps');
  ol2.appendChild(introLine('li', [['「🎹 태블릿으로 치기」', true], ['에서 ', false], ['「곡 전체」', true], ['를 골라요', false]]));
  ol2.appendChild(introLine('li', [['끝까지 잘 치면 건반 칸 하나 — ', false], ['💰', true], ['도 받아요', false]]));
  const last2 = el('li');
  const ten = el('span', 'pn-tkeys'); // 빈 건반 열 — 무대의 칸과 같은 그림(수는 안 쓴다)
  for (let i = 0; i < TAPS_PER_MON; i++) ten.appendChild(el('span', ''));
  last2.appendChild(ten);
  last2.appendChild(el('span', '', '이 다 차면 🐾 음악 포켓몬이 와요!'));
  ol2.appendChild(last2);
  card.appendChild(ol2);
  const ok = btn('알겠어요!', 'btn btn-primary pn-arrive-ok', () => {
    try { localStorage.setItem(INTRO_KEY, INTRO_VER); } catch { /* 못 적으면 다음에 또 */ }
    applyDailyDelta(clockDay(), { pnIntro: 1 }).catch(() => {}); // 📤 「🐾 안내 창 봄」 — 아버님이 안내가 닿았는지 보신다
    box.remove();
    if (!$('pn-arrive') && arrive.queue.length) nextArrival(); // 안내하는 사이 온 포켓몬
  });
  card.appendChild(ok);
  box.appendChild(card);
  host.appendChild(box);
  try { ok.focus(); } catch { /* 초점 없이도 */ }
  ensureCast(INTRO_MONS).then((cs) => {
    if ($('pn-intro') !== box) return;
    for (const c of cs) { const img = imgs.get(c.id); if (img) { img.src = c.url; img.hidden = false; } }
  }).catch(() => {});
}

/** 🐾 밀린 음악 포켓몬 — 음악 화면에 들어올 때 (v402·v403 때 찬 다섯 칸 몫 · 저장 실패로 못 받은 몫) · 받을 몫이 없으면 저장하지 않는다 */
let dueBusy = false;
function dueMons() {
  const pn = pianoNow();
  if (dueBusy || (Math.floor(pn.notes / NOTES_PER_MON) <= pn.mons && Math.floor(pn.taps / TAPS_PER_MON) <= pn.tapMons)) return; // 🎹 건반 칸 몫도 (v413)
  dueBusy = true;
  pianoMonsDue().then((r) => {
    dueBusy = false;
    const got = r && r.ok && Array.isArray(r.got) ? r.got : [];
    if (!got.length) return;
    applyDailyDelta(clockDay(), { pnMons: got.length }).catch(() => {});
    renderSlots();
    showArrivals(got, r.firsts);
  }).catch(() => { dueBusy = false; });
}
function showDone() {
  const b = $('pn-done');
  if (b) b.hidden = !(S.mode === 'listen' && S.passDone);
}
function showRetry() {
  const b = $('pn-retry');
  if (b) b.hidden = !S.retry;
}

function main() {
  return $('music-main');
}

/** 곡 고르기 — 하던 판은 버린다 */
function renderList() {
  stopPlay();
  dropCanvas();
  S.gen += 1;
  S.screen = 'list';
  const m = main();
  if (!m) return;
  m.textContent = '';
  const wrap = el('div', 'pn-list');
  wrap.appendChild(el('h2', 'pn-h', '🎹 칠 곡을 골라요'));
  const songs = allSongs();
  const grid = el('div', 'pn-songs');
  // 🎹 자유롭게 치기 — 맨 앞 칸 (v408 진우 바람 「곡을 정하지 않고 그냥」) · 들어갈 때 ⏳ 관문
  const free = btn('', 'pn-song pn-free', () => guardStart('music', () => renderFree()));
  free.id = 'pn-free';
  free.appendChild(el('span', 'pn-song-ico', '🎹'));
  const ft = el('span', 'pn-song-tx');
  ft.appendChild(el('b', '', '자유롭게 치기'));
  ft.appendChild(el('small', '', '곡 없이 마음대로'));
  free.appendChild(ft);
  grid.appendChild(free);
  for (const s of songs) {
    const b = btn('', 'pn-song', () => openSong(s.id));
    b.appendChild(el('span', 'pn-song-ico', s.book ? '📖' : '🎼'));
    const tx = el('span', 'pn-song-tx');
    tx.appendChild(el('b', '', s.ko));
    tx.appendChild(el('small', '', s.book ? '진우 책 곡' : `연습곡${s.by ? ` · ${s.by}` : ''}`));
    b.appendChild(tx);
    grid.appendChild(b);
  }
  wrap.appendChild(grid);
  if (!songs.some((s) => s.book)) wrap.appendChild(el('p', 'pn-note', '📖 진우 책 곡은 아빠가 넣어 주면 여기에 나와요.'));
  m.appendChild(wrap);
}

function openSong(id) {
  const song = allSongs().find((s) => s.id === id);
  if (!song) { renderList(); return; }
  S.song = song;
  const prefs = loadPrefs();
  S.line = prefs.song === id && Number.isInteger(prefs.line) && prefs.line >= -1 && prefs.line < song.lines.length ? prefs.line : -1;
  savePrefs();
  renderStage();
}

/** 고른 것이 바뀌면 판을 새로 */
function rebuild() {
  S.gen += 1;
  S.perf = perform(S.song, S.line);
  S.passDone = false;
  S.retry = null;
  S.fx = null;
  hushFx();
  setRun(false);
  toStart();
  layout();
  showDone();
  showRetry();
  renderSlots();
  savePrefs();
}

/** 무대 짓기 — keep이면 하던 판(t·걸음·맞힌 수·「다 쳤어요」·다시 받기)을 그대로 두고 화면만 (🎒·📊 갔다 올 때 · Codex 204차 P2-3) */
function renderStage(keep = false) {
  stopPlay();
  dropCanvas();
  S.screen = 'stage';
  const m = main();
  if (!m) return;
  m.textContent = '';
  const wrap = el('div', 'pn-stage-wrap');
  const head = el('div', 'pn-row pn-head');
  head.appendChild(btn('← 곡', 'btn pn-back', () => renderList()));
  head.appendChild(el('h2', 'pn-title', S.song.ko));
  head.appendChild(seg('', [['tap', '🎹 태블릿으로 치기'], ['listen', '🎧 듣고 따라 치기']], S.mode, (v) => { S.mode = v; rebuild(); }, true));
  wrap.appendChild(head);

  const r1 = el('div', 'pn-row');
  r1.appendChild(seg('손', [['R', '오른손'], ['L', '왼손'], ['B', '양손']], S.hands, (v) => { S.hands = v; rebuild(); }));
  r1.appendChild(seg('도움', LEVELS.map((v) => [v, `${v} ${HELP_KO[v]}`]), S.lv, (v) => { S.lv = v; layout(); savePrefs(); }));
  // 빠르기 — 단추 대신 밀어서 (아버님 11-08)
  const sp = el('label', 'pn-field pn-speed');
  sp.appendChild(el('span', 'pn-label', '빠르기'));
  sp.appendChild(el('span', 'pn-speed-ico', '🐢'));
  const range = el('input');
  range.type = 'range';
  range.id = 'pn-speed';
  range.min = String(SPEED.min);
  range.max = String(SPEED.max);
  range.step = String(SPEED.step);
  range.value = String(S.sp);
  range.setAttribute('aria-label', '빠르기');
  sp.appendChild(range);
  sp.appendChild(el('span', 'pn-speed-ico', '🐇'));
  const out = el('output', 'pn-speed-out', `${Math.round(S.sp * 100)}%`);
  sp.appendChild(out);
  range.addEventListener('input', () => {
    S.sp = Math.min(SPEED.max, Math.max(SPEED.min, Number(range.value) || SPEED.def));
    out.textContent = `${Math.round(S.sp * 100)}%`;
  });
  range.addEventListener('change', () => savePrefs());
  r1.appendChild(sp);
  wrap.appendChild(r1);

  const r2 = el('div', 'pn-row');
  r2.appendChild(seg('어디를', [[-1, '곡 전체'], ...S.song.lines.map((_, k) => [k, `${k + 1}줄`])], S.line, (v) => { S.line = v; rebuild(); }));
  r2.appendChild(seg('되풀이', [[false, '한 번'], [true, '🔁 계속']], S.loop, (v) => { S.loop = v; savePrefs(); }));
  const acts = el('div', 'pn-acts');
  const go = btn('▶ 시작', 'btn pn-go', () => toggle());
  go.id = 'pn-go';
  acts.appendChild(go);
  acts.appendChild(btn('⟲ 처음부터', 'btn', () => restart()));
  const done = btn('✋ 피아노로 다 쳤어요', 'btn pn-done', () => sendListen()); // 「피아노로」 — 화면 건반이 아니라 진짜 피아노 (v405)
  done.id = 'pn-done';
  done.hidden = true;
  acts.appendChild(done);
  const retry = btn('🔁 다시 받기', 'btn pn-retry', () => { const f = S.retry; S.retry = null; showRetry(); if (f) f(); });
  retry.id = 'pn-retry';
  retry.hidden = true;
  acts.appendChild(retry);
  const slots = btn('', 'pn-slots-box', () => showIntro()); // ♪ 칸 → 🐾 — 누르면 음악 포켓몬 안내 (v405)
  slots.id = 'pn-slots';
  slots.setAttribute('aria-label', '음표 칸 — 음악 포켓몬 안내');
  acts.appendChild(slots);
  r2.appendChild(acts);
  wrap.appendChild(r2);

  mountCanvas(m, wrap, '악보, 떨어지는 막대, 건반');
  if (keep && S.perf) {
    layout();
    showDone();
    showRetry();
    renderSlots();
  } else rebuild();
  startLoop();
}

/** 그림판 붙이기 (무대 · 🎹 자유롭게 치기) — 알림 자리 · 글꼴 · 누르기 · 너비 지켜보기 */
function mountCanvas(m, wrap, label) {
  const stage = el('div', 'pn-stage');
  stage.id = 'pn-stage';
  cv = el('canvas', 'pn-canvas');
  cv.setAttribute('aria-label', label);
  stage.appendChild(cv);
  const t = el('div', 'pn-toast');
  t.id = 'pn-toast';
  t.hidden = true;
  stage.appendChild(t);
  wrap.appendChild(stage);
  m.appendChild(wrap);
  ctx = cv.getContext('2d');
  // 캔버스는 글꼴을 스스로 불러오지 않는다 — 음악 글꼴(자리표·쉼표)을 먼저 부른다 (태블릿엔 대신 쓸 기기 글꼴이 없을 수 있음)
  try { if (document.fonts && document.fonts.load) document.fonts.load('40px "NotoMusicSub"', '\u{1D11E}\u{1D122}\u{1D13D}♯').catch(() => {}); } catch { /* 글꼴 없이도 */ }
  wireCanvas();
  // 너비가 바뀔 때만 다시 — layout이 캔버스 높이를 바꾸면 무대가 또 바뀌어 「ResizeObserver loop」 경고가 난다 (높이는 창 높이와 무대 위치로 정하고, 창 크기가 바뀌면 resize가 다시 배치한다)
  if (typeof ResizeObserver === 'function') { S.ro = new ResizeObserver(() => { if (Math.max(300, Math.round(stage.clientWidth)) !== G.W) layout(); }); S.ro.observe(stage); }
}

// ───────────────────── 🎹 자유롭게 치기 (v408) ─────────────────────

/** 곡 없이 큰 건반 두 옥타브 — 💰·음표 칸·음악 포켓몬 없음 · ⏳ 음악 시간에는 든다(들어올 때 관문) · again = 🎒·📊 갔다 옴(연 수 안 셈) */
function renderFree(again = false) {
  stopPlay();
  dropCanvas();
  S.gen += 1;
  S.screen = 'free';
  if (!again) S.trail = [];
  const m = main();
  if (!m) return;
  m.textContent = '';
  if (!again) applyDailyDelta(clockDay(), { pnFreeN: 1 }).catch(() => {});
  const wrap = el('div', 'pn-stage-wrap pn-free-wrap');
  const head = el('div', 'pn-row pn-head');
  head.appendChild(btn('← 곡', 'btn pn-back', () => renderList()));
  head.appendChild(el('h2', 'pn-title', '🎹 자유롭게 치기'));
  wrap.appendChild(head);
  const r1 = el('div', 'pn-row');
  const oct = el('div', 'pn-field pn-oct');
  oct.appendChild(el('span', 'pn-label', '건반'));
  const lo = btn('◀ 낮게', 'btn', () => shiftFree(-1));
  lo.id = 'pn-free-lo';
  const hi = btn('높게 ▶', 'btn', () => shiftFree(1));
  hi.id = 'pn-free-hi';
  oct.appendChild(lo);
  oct.appendChild(hi);
  r1.appendChild(oct);
  r1.appendChild(seg('계이름', [[true, '보이기'], [false, '숨기기']], S.freeNames, (v) => { S.freeNames = v; S.drawn = 0; savePrefs(); }));
  wrap.appendChild(r1);
  mountCanvas(m, wrap, '건반 — 마음대로 쳐요');
  layout();
  showOct();
  startLoop();
}
/** ◀ ▶ 한 옥타브씩 — 진짜 피아노 범위 안 (끝에선 그쪽 단추가 잠긴다) */
function shiftFree(d) {
  S.freeOct = Math.min(FREE_OCT.max, Math.max(FREE_OCT.min, S.freeOct + d));
  savePrefs();
  layout();
  showOct();
}
function showOct() {
  const lo = $('pn-free-lo');
  const hi = $('pn-free-hi');
  if (lo) lo.disabled = S.freeOct <= FREE_OCT.min;
  if (hi) hi.disabled = S.freeOct >= FREE_OCT.max;
}
/** 건반 하나 — 방금 친 계이름 줄 · 📤 셈(건반 수 · 친 시간 — 쉰 틈은 FREE_GAP_MS까지만) */
function noteFree(midi) {
  // ⏳ 손댐 — 손가락을 떼지 않고 미끄러지듯 쳐도 음악 시간이 「쉬는 중」이 되지 않게 (전역 손댐은 새로 누를 때만 · Codex 213차 P2)
  noteActivity();
  const now = performance.now();
  const day = clockDay();
  // 자정을 넘겼다 — 전날 몫은 전날 칸으로 · 쉰 틈도 거기서 끊는다 (Codex 213차 P3)
  if (S.freeDay && S.freeDay !== day) flushFree(true);
  S.freeDay = day;
  if (S.freeLast) S.freeMs += Math.min(FREE_GAP_MS, Math.max(0, now - S.freeLast));
  S.freeLast = now;
  S.freeKeys += 1;
  S.trail = [...S.trail, NAMES[((midi % 12) + 12) % 12]].slice(-TRAIL_MAX);
  if (S.freeKeys >= 50 || S.freeMs >= 60000) flushFree();
}
/** 모아 둔 셈을 📤 하루 칸으로 — 떠날 때·내릴 때·50번·1분마다 · 못 넣은 몫은 날짜째 두었다가 다음 저장 때 함께 (바로 되풀이하지 않음 · Codex 213차 P3) */
function flushFree(stop = false) {
  const sec = Math.floor(S.freeMs / 1000);
  const keys = S.freeKeys;
  S.freeMs -= sec * 1000;
  S.freeKeys = 0;
  if (keys || sec) oweFree(S.freeDay, keys, sec);
  if (stop) { S.freeLast = 0; S.freeMs = 0; }
  for (const [day, o] of S.freeOwe) {
    S.freeOwe.delete(day);
    applyDailyDelta(day, { ...(o.keys ? { pnFreeKeys: o.keys } : {}), ...(o.sec ? { pnFreeSec: o.sec } : {}) })
      .catch(() => oweFree(day, o.keys, o.sec));
  }
}
function oweFree(day, keys, sec) {
  const o = S.freeOwe.get(day) || { keys: 0, sec: 0 };
  S.freeOwe.set(day, { keys: o.keys + keys, sec: o.sec + sec });
}
/** 위쪽 — 방금 친 계이름이 오른쪽부터 (오래된 것일수록 작고 흐리게) */
function drawTrail() {
  if (!S.freeNames || !S.trail.length) return;
  const cy = G.keysTop / 2;
  const big = Math.min(64, G.keysTop * 0.42);
  let x = G.W / 2 + big * 1.6;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let k = S.trail.length - 1, age = 0; k >= 0; k -= 1, age += 1) {
    const size = Math.max(16, big * (1 - age * 0.11));
    ctx.globalAlpha = Math.max(0.25, 1 - age * 0.12);
    ctx.fillStyle = age === 0 ? '#ffd1e3' : '#ffffff';
    ctx.font = `800 ${Math.round(size)}px "Noto Sans KR", sans-serif`;
    ctx.fillText(S.trail[k], x, cy);
    x -= size * 1.5;
    if (x < 0) break;
  }
  ctx.globalAlpha = 1;
}

function wireCanvas() {
  cv.addEventListener('click', (e) => {
    if (S.screen === 'free') return; // 자유롭게 치기엔 ▶가 없다
    // 🎹 v413 — 위쪽 톡은 시작만: 연주 중에 건반 위쪽을 잘못 누르면 ⏸가 되어 「멈췄다가 3~4초 뒤 풀린다」였다(멈춤은 ⏸ 단추로만) ·
    //   건반·건반 바로 위 띠는 톡이 아니다 · 건반을 누른 손가락이 위로 미끄러져 뗀 톡도 시작이 아니다
    if (S.mode === 'tap' && (S.running || e.offsetY >= G.keysTop - KEY_SLOP || performance.now() - S.keyAt < KEY_CLICK_MS)) return;
    toggle();
  });
  cv.addEventListener('pointerdown', (e) => {
    if (S.mode !== 'tap' && S.screen !== 'free') return;
    const m = hitKey(e.offsetX, e.offsetY);
    if (m == null) return;
    e.preventDefault();
    S.keyAt = performance.now();
    audio();
    try { cv.setPointerCapture(e.pointerId); } catch { /* 없음 */ }
    S.ptr.set(e.pointerId, m);
    keyDown(m);
  });
  cv.addEventListener('pointermove', (e) => {
    if (!S.ptr.has(e.pointerId)) return;
    const m = hitKey(e.offsetX, e.offsetY);
    const old = S.ptr.get(e.pointerId);
    if (m === old) return;
    S.ptr.set(e.pointerId, m); // 먼저 옮겨 두고 놓는다 — 옛 건반을 다른 손가락이 누르고 있으면 그대로
    if (old != null) release(old);
    if (m != null) keyDown(m);
  });
  const lift = (e) => {
    if (!S.ptr.has(e.pointerId)) return;
    S.keyAt = performance.now(); // 건반에서 시작한 손가락을 뗄 때도 — 0.8초 넘게 누르다 위로 미끄러져 떼면 그 톡이 시작이 됐다 (Codex 217차 P3)
    const m = S.ptr.get(e.pointerId);
    S.ptr.delete(e.pointerId);
    if (m != null) release(m);
  };
  cv.addEventListener('pointerup', lift);
  cv.addEventListener('pointercancel', lift);
}

/** PC 자판 — 가온 다부터 한 옥타브(A S D F G H J K · 검은 건반 W E T Y U) · 한 옥타브 아래(Z X C V B N M) */
const PC = { a: 60, w: 61, s: 62, e: 63, d: 64, f: 65, t: 66, g: 67, y: 68, h: 69, u: 70, j: 71, k: 72, z: 48, x: 50, c: 52, v: 53, b: 55, n: 57, m: 59 };
function pcKey(e, down) {
  if (!S.active || !((S.screen === 'stage' && S.mode === 'tap') || S.screen === 'free')) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const tag = (e.target && e.target.tagName) || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  const m = PC[String(e.key || '').toLowerCase()];
  if (m == null) return;
  if (down) { if (e.repeat) return; S.pcDown.add(m); audio(); keyDown(m); } else { S.pcDown.delete(m); release(m); }
}

/** 소리·연주 멈춤 — 판은 그대로 (판을 버리는 곳은 rebuild·renderList가 S.gen을 올린다) */
function stopPlay() {
  if (S.running) setRun(false);
  for (const v of S.held.values()) noteOff(v);
  S.held.clear();
  S.ptr.clear();
  S.pcDown.clear();
  S.sounding.clear();
  hushFx(); // 🎺 판 끝 효과도 — 소리와 그림 함께 (Codex 217차 P2 · 판 끝의 setRun(false)는 효과를 끄지 않는다)
  S.fx = null;
  keepAwake(false);
  flushFree(true); // 🎹 자유롭게 치기 셈 — 떠날 때·내릴 때 (v408)
}

// ───────────────────── 🎹 ⚙ 집 피아노 연결 확인 ─────────────────────

const NAMES = ['도', '도♯', '레', '레♯', '미', '파', '파♯', '솔', '솔♯', '라', '라♯', '시'];
const midiName = (n) => `${NAMES[n % 12]}${Math.floor(n / 12) - 1}`;
function initMidiCheck() {
  const b = $('set-midi-check');
  const out = $('set-midi-out');
  if (!b || !out) return;
  b.addEventListener('click', async () => {
    if (!navigator.requestMIDIAccess) {
      out.textContent = '이 브라우저는 피아노 연결(MIDI)을 못 써요 — 안드로이드 Chrome에서 열어 주세요';
      saveMidiCheck({ ok: false, why: 'MIDI 없음' });
      return;
    }
    out.textContent = '허락 창이 뜨면 「허용」을 눌러 주세요…';
    try {
      const acc = await navigator.requestMIDIAccess();
      const ins = [...acc.inputs.values()];
      if (!ins.length) {
        out.textContent = '피아노가 안 보여요 — 케이블을 꽂고 피아노를 켠 뒤 다시 눌러 주세요';
        saveMidiCheck({ ok: false, why: '연결된 기기 없음' });
        return;
      }
      const name = ins.map((i) => i.name || '이름 없음').join(', ');
      out.textContent = `잡혔어요: ${name} — 피아노 건반을 하나 눌러 보세요`;
      saveMidiCheck({ ok: true, name });
      for (const i of ins) {
        i.onmidimessage = (ev) => {
          const [st, note, vel] = ev.data || [];
          if ((st & 0xf0) !== 0x90 || !vel) return;
          out.textContent = `잡혔어요: ${name} · 방금 누른 건반 ${midiName(note)}`;
          saveMidiCheck({ ok: true, name, note: midiName(note) });
        };
      }
    } catch (err) {
      const why = (err && err.name) || '오류';
      out.textContent = `허락을 못 받았어요 (${why}) — 다시 눌러 「허용」을 골라 주세요`;
      saveMidiCheck({ ok: false, why });
    }
  });
}

// ───────────────────── 바깥에서 부르는 것 ─────────────────────

export function initMusic({ showView } = {}) {
  if (S.wired) return;
  S.wired = true;
  S.showView = showView;
  loadPrefs();
  const back = $('btn-music-back');
  if (back) back.addEventListener('click', () => { if (S.screen === 'stage' || S.screen === 'free') renderList(); else if (S.showView) S.showView('home'); });
  window.addEventListener('keydown', (e) => pcKey(e, true));
  window.addEventListener('keyup', (e) => pcKey(e, false));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return;
    // 누른 건반·손가락까지 정리 — 누른 채 내리면 뗀 소식이 안 올 수 있다(남은 「누르고 있음」이 그리기를 쉬지 못하게 하고 같은 건반을 막는다 · Codex 212차 P3)
    stopPlay();
    sleepAudio(); // v407
  });
  window.addEventListener('resize', () => { if (S.active && (S.screen === 'stage' || S.screen === 'free')) layout(); });
  initMidiCheck();
  setScene('music', musicScene); // 🛑 v407
}

/** 🛑 블랙박스 한 줄 — 곡·치기/듣기·연주 중·그림판 크기 (꺼졌을 때 음악 어디였나) */
function musicScene() {
  if (S.screen === 'free') return `🎹 자유롭게 치기${cv ? ` · 그림판 ${cv.width}×${cv.height}` : ''}`;
  if (S.screen !== 'stage' || !S.song) return '곡 고르기';
  const how = S.mode === 'tap' ? '🎹 치기' : '🎧 따라 치기';
  return `「${S.song.ko}」 ${how} · ${S.running ? '연주 중' : '멈춤'}${cv ? ` · 그림판 ${cv.width}×${cv.height}` : ''}`;
}

/** 음악 화면에 들어올 때 — 무대에 있었으면 멈춘 채 그대로 · 아니면 곡 목록 · 진우 책 곡을 받아 온다(10분에 한 번까지) */
export async function enterMusic() {
  S.active = true;
  if (S.screen === 'stage' && S.song && allSongs().some((s) => s.id === S.song.id)) {
    renderStage(true);
  } else if (S.screen === 'free') renderFree(true); // 🎒·📊 갔다 오면 치던 자리 그대로 (v408)
  else renderList();
  if (!introSeen()) showIntro(); // 🐾 처음 한 번 — 온 창이 떠 있으면 다음에 들어올 때 (v405)
  dueMons(); // 🐾 v404
  const before = allSongs().map((s) => s.id).join();
  try { await syncSongs(); } catch { /* 받아 둔 곡 그대로 */ }
  if (S.active && S.screen === 'list' && allSongs().map((s) => s.id).join() !== before) renderList();
}

/** 다른 화면으로 — 소리·연주 멈춤 (무대 자리는 기억) */
export function leaveMusic() {
  if (!S.active) return;
  S.active = false;
  stopPlay();
  if (S.raf) { cancelAnimationFrame(S.raf); S.raf = 0; }
  dropCanvas(); // 돌아오면 renderStage가 새로 짓는다 (v407)
  sleepAudio();
}

/** 걷기용 */
if (typeof window !== 'undefined') window.__piano = { S, G, toStart, advance, press, passEnd, openSong, renderList, draw, secPerBeat, hitKey };
