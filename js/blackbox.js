// 🛑 블랙박스 — 앱이 저절로 꺼진 때를 남긴다 (v292, 2026-10-18 아버님: "영상 컨텐츠를 잘 따라하다가 갑자기 앱이 강제 종료처럼
//    되버린다고 하던데 원인 분석이 가능할려나?" → "진행하자")
//
// 꺼지는 순간에는 앱이 아무것도 못 적는다 → 살아 있는 동안 몇 초마다 "지금 어디"를 이 기기(localStorage)에 적어 두고(박동),
// 정상으로 닫히면(pagehide — 새로고침·업데이트·🚪 종료·창 닫기) 지운다. 다음에 켰을 때 남아 있는 박동 = 인사 없이 끝난 창:
//   · 보던 중 꺼짐(fg) — 마지막 박동 때 화면이 보이고 있었다 → 강제 종료로 보이는 것
//   · 내려 둔 사이 닫힘(bg) — 홈 버튼으로 내린 뒤 끝남 (최근 앱에서 밀어 닫음·안드로이드가 정리 — 참고만)
//   · 🗑 다시 열린 창이 document.wasDiscarded — Chrome이 메모리를 비우려고 내려 둔 창을 버렸다가 다시 연 것
// 무엇을 적나: 화면·겹친 창 · 영상 제목·재생 자리 · 따라 말하기 중인지 · 이 창에서 마이크를 켠 수 · 연 지 몇 분 ·
//   JS 메모리(Chrome만) · 화면 요소 수 · 마지막 오류 · 앱 판
// ★ 아이 화면에는 아무것도 안 보인다 — 📤 usage/crash-log.md로 아버님·Claude만 본다 (아이 화면에 셈 문구 금지, 2026-10-15)
// ★ 이 파일 위쪽(규칙)은 아무것도 import하지 않는다 — 테스트가 DOM 없이 부른다. 아래쪽(박동)만 브라우저를 쓴다

/** 박동 주기 — 화면이 보일 때만 (내려 둔 창은 타이머가 멈춘다) */
export const BEAT_MS = 5000;
/** 남은 박동을 "끝난 창"으로 정하기 전에 기다리는 시간 — 다른 창(같은 기기에 두 창)이 아직 살아 있으면 그새 박동이 바뀐다 */
export const SETTLE_MS = BEAT_MS * 2 + 2000;
/** 남기는 날 수 · 줄 수 */
export const CRASH_DAYS = 14;
const CRASH_MAX = 40;
export const BEAT_PREFIX = 'shincoach.bb.';
export const LOG_KEY = 'shincoach.crashLog';

/** 화면 id(view-…) → 이름 */
const VIEW_KO = { home: '🏠 홈', library: '🎬 영어 목록', player: '🎤 영어', math: '🔢 수학', korean: '📚 국어', pokedex: '🎒 도감', stats: '📊 기록' };
/** 겹친 창 id → 이름 (앞에 뜨는 것부터) */
export const OVERLAY_KO = [
  ['timeup', '⏳ 잠금'], ['battle', '⚔️ 배틀'], ['rocket', '🚀 로켓단'], ['catch', '🎯 잡기'], ['evolve', '✨ 진화'], ['hatch', '🥚 부화'],
  ['review', '🔁 복습'], ['puzzle', '🧩 퍼즐'], ['essay', '✍️ 에세이'], ['match', '🔤 단어 잇기'], ['house', '🏡 집'], ['shop', '🛒 상점'], ['market', '🛒 시장'],
  ['shadow-overlay', '🗣 따라 말하기'],
];

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');

/** ms → 'YYYY-MM-DD' (이 기기 시간대) — 없거나 깨졌으면 '' */
export function dayOfMs(ms) {
  const n = Number(ms);
  if (!(n > 0)) return '';
  const d = new Date(n);
  if (Number.isNaN(d.getTime())) return '';
  const p = (v) => String(v).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function hmOf(ms) {
  const d = new Date(Number(ms) || 0);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function dayBefore(day, k) {
  const [y, m, d] = day.split('-').map(Number);
  const t = new Date(y, m - 1, d - k);
  return dayOfMs(t.getTime());
}

/**
 * 남은 박동 하나 → 꺼진 기록 한 줄 (순수). 깨진 박동이면 null.
 * @param {object} beat 박동 (아래 snapshot이 만든 꼴)
 * @param {{discarded?: boolean}} o discarded = 지금 다시 열린 창이 Chrome이 버렸던 창(document.wasDiscarded)
 */
export function crashOf(beat, o = {}) {
  if (!beat || typeof beat !== 'object' || !(num(beat.at) > 0)) return null;
  const ev = {
    sid: str(beat.sid, 40), // 그 창 이름 — 살아 돌아온 창이 자기 기록을 지운다 (글에는 안 나온다)
    at: num(beat.at),
    kind: beat.vis ? 'fg' : 'bg',
    view: str(beat.view, 20),
    over: Array.isArray(beat.over) ? beat.over.filter((x) => typeof x === 'string').slice(0, 4) : [],
    title: str(beat.title, 80),
    vt: Math.max(0, Math.floor(num(beat.vt))),
    play: beat.play ? 1 : 0,
    speak: beat.speak ? 1 : 0,
    mic: Math.max(0, Math.floor(num(beat.mic))),
    up: Math.max(0, Math.floor((num(beat.at) - num(beat.t0)) / 60000)),
    heap: Math.max(0, Math.round(num(beat.heap))),
    heapMax: Math.max(0, Math.round(num(beat.heapMax))),
    nodes: Math.max(0, Math.floor(num(beat.nodes))),
    err: str(beat.err, 120),
    ver: str(beat.ver, 12),
  };
  if (o.discarded && !beat.vis) ev.discarded = 1;
  return ev;
}

/** 꺼진 기록 더하기 (순수 — 새 객체) · 같은 박동(at·kind)은 한 번 · 최근 CRASH_DAYS일 · CRASH_MAX줄 · 오래된 것부터 */
export function addCrash(log, ev, today) {
  const list = (log && Array.isArray(log.crashes) ? log.crashes : []).filter((c) => c && num(c.at) > 0 && (c.kind === 'fg' || c.kind === 'bg'));
  if (ev && num(ev.at) > 0 && !list.some((c) => c.at === ev.at && c.kind === ev.kind)) list.push(ev);
  const from = today ? dayBefore(today, CRASH_DAYS - 1) : '';
  return { crashes: list.filter((c) => !from || dayOfMs(c.at) >= from).sort((a, b) => a.at - b.at).slice(-CRASH_MAX) };
}

/** 재생 자리 초 → "23:12" · 한 시간이 넘으면 "1:02:03" */
function clock(sec) {
  const s = Math.floor(num(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const p = (v) => String(v).padStart(2, '0');
  return h ? `${h}:${p(m)}:${p(s % 60)}` : `${m}:${p(s % 60)}`;
}

/** 한 줄 (순수) — 이 기기에 적어 둔 것이 깨져 있어도(꼴이 다른 값) 던지지 않는다 */
export function crashLine(c) {
  const parts = [`${dayOfMs(c.at).slice(5)} ${hmOf(c.at)}`, c.kind === 'fg' ? '보던 중 꺼짐' : `내려 둔 사이 닫힘${c.discarded ? ' 🗑' : ''}`];
  const over = Array.isArray(c.over) ? c.over.filter((x) => typeof x === 'string') : [];
  const view = str(c.view, 20);
  parts.push([VIEW_KO[view] || view || '화면 모름', ...over.map((id) => (OVERLAY_KO.find(([k]) => k === id) || [id, id])[1])].join(' · '));
  if (view === 'player' && str(c.title, 80)) parts.push(`「${str(c.title, 80)}」 ${clock(c.vt)}${c.play ? ' 재생 중' : ' 멈춤'}`);
  if (c.speak) parts.push('🎤 마이크 듣는 중');
  if (num(c.mic) > 0) parts.push(`마이크 ${Math.floor(num(c.mic))}번째`);
  parts.push(`연 지 ${Math.max(0, Math.floor(num(c.up)))}분`);
  if (num(c.heap) > 0) parts.push(`메모리 ${Math.round(num(c.heap))}${num(c.heapMax) > 0 ? `/${Math.round(num(c.heapMax))}` : ''} MB`);
  if (num(c.nodes) > 0) parts.push(`요소 ${Math.floor(num(c.nodes)).toLocaleString('en-US')}`);
  if (str(c.err, 120)) parts.push(`마지막 오류 "${str(c.err, 120)}"`);
  if (str(c.ver, 12)) parts.push(str(c.ver, 12));
  return `- ${parts.join(' · ')}`;
}

/** usage/crash-log.md 글 (순수) — 새로 꺼진 것이 생길 때만 글이 바뀐다 (지금 시각은 안 적는다) */
export function crashLogText(log, today) {
  const from = dayBefore(today, CRASH_DAYS - 1);
  const list = (log && Array.isArray(log.crashes) ? log.crashes : []).filter((c) => c && num(c.at) > 0 && dayOfMs(c.at) >= from && dayOfMs(c.at) <= today);
  const fg = list.filter((c) => c.kind === 'fg').length;
  const lines = [
    `🛑 앱이 저절로 꺼진 기록 (최근 ${CRASH_DAYS}일 · 이 태블릿) — v292부터 · 정상으로 닫은 것(새로고침·업데이트·🚪 종료·창 닫기)은 안 셉니다`,
    '',
    '## 읽는 법',
    '- 보던 중 꺼짐 = 화면을 보고 있다가 인사 없이 끝남 → 강제 종료로 보이는 것 (메모리 부족 · Chrome 오류)',
    '- 내려 둔 사이 닫힘 = 홈 버튼으로 내려 둔 뒤 끝남 (최근 앱에서 밀어 닫았거나 안드로이드가 정리 — 참고만) · 🗑 = Chrome이 메모리를 비우려고 버렸다가 다시 연 창',
    `- 시각 = 마지막으로 적어 둔 때(${BEAT_MS / 1000}초마다 · Chrome이 통째로 꺼지면 저장이 늦어 30초~1분쯤 앞일 수 있어요) · 메모리 = 그때 이 창의 JS 메모리(Chrome만, 대략) · 요소 = 화면 요소 수 · 마이크 N번째 = 이 창에서 마이크를 켠 수`,
    '- 한 기기에서 두 창(홈 화면 앱·Chrome 탭)을 함께 열면 내려 둔 사이 닫힘이 잘못 셀 수 있어요',
    '',
    `## 보던 중 꺼짐 ${fg}번 · 내려 둔 사이 닫힘 ${list.length - fg}번`,
  ];
  for (const c of list) lines.push(crashLine(c));
  if (!list.length) lines.push(`(최근 ${CRASH_DAYS}일 저절로 꺼진 기록 없음)`);
  return `${lines.join('\n').trim()}\n`;
}

// ───────────────────── 박동 (브라우저) ─────────────────────

const bb = { sid: '', t0: 0, timer: null, mic: 0, speak: 0, err: '', ver: '', started: false, errAt: 0, closed: false };

function readJson(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
}
const shown = (id) => { const e = document.getElementById(id); return !!(e && !e.hidden); };

/** 지금 자리 (박동 한 번) */
function snapshot() {
  const view = (([...document.querySelectorAll('[id^="view-"]')].find((e) => !e.hidden) || {}).id || '').replace(/^view-/, '');
  const beat = { sid: bb.sid, t0: bb.t0, at: Date.now(), vis: document.hidden ? 0 : 1, view, over: OVERLAY_KO.map(([id]) => id).filter(shown), mic: bb.mic, speak: bb.speak, err: bb.err, ver: bb.ver };
  if (view === 'player') {
    const v = document.getElementById('video');
    const t = document.getElementById('player-title');
    beat.title = t ? String(t.textContent || '').slice(0, 80) : '';
    if (v) { beat.vt = Math.floor(Number(v.currentTime) || 0); beat.play = v.paused ? 0 : 1; }
  }
  const m = typeof performance !== 'undefined' && performance.memory;
  if (m && m.usedJSHeapSize) { beat.heap = m.usedJSHeapSize / 1048576; beat.heapMax = m.jsHeapSizeLimit / 1048576; }
  try { beat.nodes = document.getElementsByTagName('*').length; } catch { /* 못 세도 */ }
  return beat;
}

function beat() {
  if (bb.closed) return; // 정상으로 닫힌 뒤 — 떠날 때 Chrome은 pagehide 다음에 visibilitychange(숨김)를 보낸다. 그때 다시 쓰면 정상 종료가 "내려 둔 사이 닫힘"이 된다
  try { localStorage.setItem(BEAT_PREFIX + bb.sid, JSON.stringify(snapshot())); } catch { /* 못 적어도 앱은 그대로 */ }
}

/** 남은 박동(다른 창 · 지난 창) 열쇠들 */
function leftoverKeys() {
  const out = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(BEAT_PREFIX) && k !== BEAT_PREFIX + bb.sid) out.push(k);
    }
  } catch { /* 못 읽으면 이번엔 안 본다 */ }
  return out;
}

/** 지난 창의 남은 박동 → SETTLE_MS 뒤에도 그대로면 끝난 창 → 꺼진 기록에 더하고 지운다 */
function collectLeftovers(discarded) {
  const first = new Map(leftoverKeys().map((k) => [k, localStorage.getItem(k)]));
  if (!first.size) return;
  setTimeout(() => {
    let log = readJson(LOG_KEY);
    const today = dayOfMs(Date.now());
    // 🗑 표시는 가장 최근에 내려 둔 창 하나에만 — 버려졌다 다시 열린 것은 이 창 하나다
    const beats = [...first.entries()].map(([k, raw]) => { let b = null; try { b = JSON.parse(raw); } catch { /* 깨짐 */ } return { k, raw, b }; });
    const lastBg = beats.filter((x) => x.b && !x.b.vis).sort((a, b) => num(b.b.at) - num(a.b.at))[0];
    for (const x of beats) {
      let now = null;
      try { now = localStorage.getItem(x.k); } catch { /* 못 읽음 */ }
      if (now !== x.raw) continue; // 그새 바뀌었다 = 살아 있는 다른 창 (지워졌으면 그 창이 정상으로 닫힌 것)
      const ev = crashOf(x.b, { discarded: discarded && x === lastBg });
      if (ev) log = addCrash(log, ev, today);
      try { localStorage.removeItem(x.k); } catch { /* 다음에 다시 */ }
    }
    try { localStorage.setItem(LOG_KEY, JSON.stringify(addCrash(log, null, today))); } catch { /* 못 적어도 */ }
  }, SETTLE_MS);
}

/**
 * 살아 있는데 "내려 둔 사이 닫힘"으로 적힌 내 기록을 지운다 (🔍 Codex 98차 ④) — 두 창일 때 다른 창은 숨긴 창이
 * 살아 있는지 알 수 없다(숨긴 창은 박동을 안 쓴다). 내가 다시 보이면 내 이름의 기록은 틀린 것이다
 */
function forgetMe() {
  try {
    const log = readJson(LOG_KEY);
    if (!log || !Array.isArray(log.crashes) || !log.crashes.some((c) => c && c.sid === bb.sid)) return;
    localStorage.setItem(LOG_KEY, JSON.stringify({ crashes: log.crashes.filter((c) => !(c && c.sid === bb.sid)) }));
  } catch { /* 못 지우면 그대로 (참고 기록) */ }
}

/** 📤 usage/crash-log.md 글 — 적어 둔 것이 깨져 있어도 던지지 않는다 */
export function crashLogNow(today) {
  try { return crashLogText(readJson(LOG_KEY), today); } catch { return null; }
}

/** 앱 판 (서비스워커 캐시 이름 shincoach-vNNN 중 가장 큰 것) — 못 알면 '' */
async function appVersion() {
  try {
    const names = await caches.keys();
    const vs = names.map((n) => /^shincoach-v(\d+)$/.exec(n)).filter(Boolean).map((m) => Number(m[1]));
    return vs.length ? `v${Math.max(...vs)}` : '';
  } catch { return ''; }
}

/** 블랙박스를 켠다 (app.js main이 한 번) — 실패해도 앱은 그대로 (기록만 빠진다) */
export function initBlackbox() {
  if (bb.started || typeof document === 'undefined' || typeof localStorage === 'undefined') return;
  bb.started = true;
  try {
    bb.sid = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
    bb.t0 = Date.now();
    collectLeftovers(!!document.wasDiscarded);
    appVersion().then((v) => { bb.ver = v; });
    window.addEventListener('shincoach:micstart', () => { bb.mic++; bb.speak = 1; beat(); });
    window.addEventListener('shincoach:micend', () => { bb.speak = 0; });
    // 오류는 글만 바꿔 두고, 바로 쓰는 것은 1초에 한 번까지 — 매 화면(rAF)마다 같은 오류가 나도 저장소를 두드리지 않게 (다음 박동이 적는다)
    const noteErr = (m) => { bb.err = String(m || '').slice(0, 120); const t = Date.now(); if (t - bb.errAt >= 1000) { bb.errAt = t; beat(); } };
    window.addEventListener('error', (e) => noteErr(e && (e.message || e.type)));
    window.addEventListener('unhandledrejection', (e) => noteErr(e && e.reason && (e.reason.message || e.reason)));
    // 내릴 때 vis 0을 바로 — 내려 둔 사이 닫힘을 보던 중 꺼짐으로 세지 않게 · 다시 보이면 다른 창이 잘못 적은 내 기록을 지운다
    document.addEventListener('visibilitychange', () => { beat(); if (!document.hidden && !bb.closed) forgetMe(); });
    // 정상으로 닫힘 → 박동을 지운다 · bfcache에서 돌아오면 다시 적는다
    window.addEventListener('pagehide', () => { bb.closed = true; try { localStorage.removeItem(BEAT_PREFIX + bb.sid); } catch { /* 못 지우면 다음에 내려 둔 사이 닫힘으로 */ } });
    window.addEventListener('pageshow', (e) => { if (e && e.persisted) { bb.closed = false; beat(); forgetMe(); } });
    beat();
    bb.timer = setInterval(() => { if (!document.hidden) beat(); }, BEAT_MS);
  } catch { /* 블랙박스가 앱을 멈추게 하지 않는다 */ }
}
