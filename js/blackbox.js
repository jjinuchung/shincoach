// 🛑 블랙박스 — 앱이 저절로 꺼진 때를 남긴다 (v292, 2026-10-18 아버님: "영상 컨텐츠를 잘 따라하다가 갑자기 앱이 강제 종료처럼
//    되버린다고 하던데 원인 분석이 가능할려나?" → "진행하자")
//
// 꺼지는 순간에는 앱이 아무것도 못 적는다 → 살아 있는 동안 몇 초마다 "지금 어디"를 이 기기(localStorage)에 적어 두고(박동),
// 정상으로 닫히면(pagehide — 새로고침·업데이트·🚪 종료·창 닫기) 지운다. 다음에 켰을 때 남아 있는 박동 = 인사 없이 끝난 창:
//   · 보던 중 꺼짐(fg) — 마지막 박동 때 화면이 보이고 있었다 → 강제 종료로 보이는 것
//   · 내려 둔 사이 닫힘(bg) — 홈 버튼으로 내린 뒤 끝남 (최근 앱에서 밀어 닫음·안드로이드가 정리 — 참고만)
//   · 🗑 다시 열린 창이 document.wasDiscarded — Chrome이 메모리를 비우려고 내려 둔 창을 버렸다가 다시 연 것
// 무엇을 적나: 화면·겹친 창 · 영상 제목·재생 자리 · 따라 말하기 중인지 · 이 창에서 마이크를 켠 수 · 연 지 몇 분 ·
//   JS 메모리(Chrome만) · 화면 요소 수 · 마지막 오류 · 앱 판 · (v407) 화면이 걸어 둔 「지금 무엇을 하나」(setScene — 🎹 음악) · 기기 RAM(Chrome 어림)
// (v426 · 11-14 아버님 「영어 영상 하던 중에 갑자기 영어 콘텐츠에서 나가졌어 — 화면이 까매진 건 아니고 바로 다시 들어가 이어 했어」
//   · 그날 둘 다 「내려 둔 사이 닫힘」 · 연 지 58분 → 숨은 까닭·다시 켜진 길을 가르려고)
//   끝나기 전 일의 때 — 숨음·다시 보임·손댐·마이크 켬/끔·영상 재생/멈춤·❄️ 얼림/깨어남(Chrome Page Lifecycle)·오류를 「끝나기 N초 전」으로 ·
//   메모리 흐름(5분마다 한 번 · 마지막 여섯) · 다시 켜진 간격과 길(이 창의 navigation type — Chrome이 다시 불러옴 reload / 새로 엶 navigate)
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
/** 메모리 흐름 — 이만큼마다 한 번 · 마지막 몇 개 (v426) */
export const HEAP_EVERY = 5 * 60 * 1000;
export const HEAP_KEEP = 6;
/** 끝나기 전 일 — 박동에 적는 것과 글에 쓰는 이름 (가까운 것부터 쓴다 · v426) */
export const MARKS = [['hide', '숨음'], ['show', '다시 보임'], ['touch', '손댐'], ['mic', '마이크 켬'], ['micEnd', '마이크 끔'], ['play', '영상 재생'], ['pause', '영상 멈춤'], ['freeze', '❄️ 얼림'], ['resume', '깨어남'], ['err', '오류']];
/** 다음 창이 열린 방식 (그 창의 navigation type) → 글 — 있는 그대로만: reload라도 사람이 새로고침했는지 Chrome이 저절로 살렸는지는 모른다 (Codex 229차 P2) */
const NAV_KO = { reload: '다시 불러옴 reload', navigate: '새로 엶 navigate', back_forward: '앞뒤로 와서 엶 back_forward', prerender: '미리 엶 prerender' };
const navOk = (k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(NAV_KO, k); // toString 같은 상속 이름은 안 받는다 (Codex 229차 P3-2)
/** 숨었다 돌아온 순간 — 최근 몇 번 (언제·몇 초 · Codex 229차 제안 — 마이크를 켤 때마다 잠깐 숨으면 음성 인식 화면이 가리는 것) */
export const SPANS_KEEP = 5;

/** 화면 id(view-…) → 이름 · 🎹 음악은 v407 (11-09 아버님 「음악을 태블릿으로 연주할 때 앱이 닫히고 태블릿 첫 화면이 나온다」) */
const VIEW_KO = { home: '🏠 홈', library: '🎬 영어 목록', player: '🎤 영어', math: '🔢 수학', korean: '📚 국어', pokedex: '🎒 도감', stats: '📊 기록', music: '🎹 음악' };
/** 겹친 창 id → 이름 (앞에 뜨는 것부터) */
export const OVERLAY_KO = [
  ['timeup', '⏳ 잠금'], ['battle', '⚔️ 배틀'], ['rocket', '🚀 로켓단'], ['catch', '🎯 잡기'], ['evolve', '✨ 진화'], ['hatch', '🥚 부화'],
  ['review', '🔁 복습'], ['puzzle', '🧩 퍼즐'], ['essay', '✍️ 에세이'], ['match', '🔤 단어 잇기'], ['house', '🏡 집'], ['shop', '🛒 상점'], ['market', '🛒 시장'],
  ['shadow-overlay', '🗣 따라 말하기'], ['pn-arrive', '🐾 음악 포켓몬 옴'], ['pn-intro', '🐾 음악 안내'],
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
 * @param {{discarded?: boolean, now?: number, nav?: string}} o discarded = 지금 다시 열린 창이 Chrome이 버렸던 창(document.wasDiscarded) ·
 *   now = 다음 창이 켜진 때(다시 켜진 간격) · nav = 다음 창의 navigation type (v426)
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
    scene: str(beat.scene, 80), // 그 화면이 알려 준 「지금 무엇을 하나」 (v407 · 🎹 음악 — 곡·치기/듣기·연주 중·그림판 크기)
    dm: Math.max(0, num(beat.dm)), // 기기 RAM GB (Chrome 어림 navigator.deviceMemory · v407)
  };
  if (o.discarded && !beat.vis) ev.discarded = 1;
  // 끝나기 전 일 — 「끝나기 N초 전」(마지막 박동 때부터 한 시간 안 · v426)
  const t = beat.t && typeof beat.t === 'object' ? beat.t : {};
  const ago = {};
  for (const [k] of MARKS) {
    const v = num(t[k]);
    const d = ev.at - v; // 범위를 먼저(밀리초) 보고 반올림 — 아주 약간 미래·한 시간을 살짝 넘은 것이 끼지 않게 (Codex 229차 P3-1)
    if (v > 0 && d >= 0 && d <= 3600000) ago[k] = Math.round(d / 1000);
  }
  if (Object.keys(ago).length) ev.ago = ago;
  const h = Array.isArray(beat.h) ? beat.h.map(num).filter((x) => x > 0 && x < 100000).map(Math.round).slice(-HEAP_KEEP) : [];
  if (h.length) ev.mem = h;
  // 숨었다 돌아온 순간 [[숨은 때, 숨은 밀리초]] → [[몇 초 전, 몇 초]] (한 시간 안 · 마지막 SPANS_KEEP)
  const sp = Array.isArray(beat.sp) ? beat.sp.filter((x) => Array.isArray(x) && num(x[0]) > 0 && num(x[1]) >= 0 && ev.at - num(x[0]) >= 0 && ev.at - num(x[0]) <= 3600000)
    .map((x) => [Math.round((ev.at - num(x[0])) / 1000), Math.round(num(x[1]) / 1000)]).slice(-SPANS_KEEP) : [];
  if (sp.length) ev.hid = sp;
  const now = num(o.now);
  if (now > ev.at) ev.gap = Math.round((now - ev.at) / 1000);
  if (navOk(o.nav)) ev.nav = o.nav;
  return ev;
}

/** 초 → 「4초」·「3분」·「2시간」 */
function span(s) {
  const n = Math.max(0, Math.floor(num(s)));
  return n < 60 ? `${n}초` : n < 3600 ? `${Math.floor(n / 60)}분` : `${Math.floor(n / 3600)}시간`;
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
  if (str(c.scene, 80)) parts.push(str(c.scene, 80));
  if (c.speak) parts.push('🎤 마이크 듣는 중');
  if (num(c.mic) > 0) parts.push(`마이크 ${Math.floor(num(c.mic))}번째`);
  parts.push(`연 지 ${Math.max(0, Math.floor(num(c.up)))}분`);
  if (num(c.heap) > 0) parts.push(`메모리 ${Math.round(num(c.heap))}${num(c.heapMax) > 0 ? `/${Math.round(num(c.heapMax))}` : ''} MB`);
  if (num(c.nodes) > 0) parts.push(`요소 ${Math.floor(num(c.nodes)).toLocaleString('en-US')}`);
  if (num(c.dm) > 0) parts.push(`기기 RAM 약 ${num(c.dm)} GB`);
  if (str(c.err, 120)) parts.push(`마지막 오류 "${str(c.err, 120)}"`);
  if (str(c.ver, 12)) parts.push(str(c.ver, 12));
  // v426 — 끝나기 전 일(가까운 것부터) · 최근 숨음 · 메모리 흐름 · 다음 창(간격과 열린 방식)
  const ago = c.ago && typeof c.ago === 'object' ? c.ago : {};
  const marks = MARKS.filter(([k]) => Number.isFinite(Number(ago[k])) && Number(ago[k]) >= 0).sort((a, b) => num(ago[a[0]]) - num(ago[b[0]]));
  if (marks.length) parts.push(`끝나기 전: ${marks.map(([k, ko]) => `${ko} ${span(ago[k])} 전`).join(', ')}`);
  const hid = Array.isArray(c.hid) ? c.hid.filter((x) => Array.isArray(x) && Number.isFinite(Number(x[0])) && Number.isFinite(Number(x[1]))) : [];
  if (hid.length) parts.push(`최근 숨음: ${[...hid].sort((a, b) => num(a[0]) - num(b[0])).map(([a, l]) => `${span(a)} 전 ${num(l) > 0 ? span(l) : '1초 안'}`).join(', ')}`);
  const mem = Array.isArray(c.mem) ? c.mem.map(num).filter((x) => x > 0) : [];
  if (mem.length > 1) parts.push(`메모리 흐름 ${mem.join('→')} MB`);
  if (num(c.gap) > 0) parts.push(`다음 창 ${span(c.gap)} 뒤${navOk(c.nav) ? `(${NAV_KO[c.nav]})` : ''}`);
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
    '- (v426) 끝나기 전 = 마지막으로 적어 둔 때에서 거슬러 그 일이 있었던 때(숨음·다시 보임·손댐·마이크 켬/끔·영상 재생/멈춤·❄️ 얼림/깨어남 = Chrome이 창을 얼렸다 깨움·오류) — 숨은 뒤의 일은 다음 박동이 없으면 안 남아요(기록 없음 ≠ 안 함) · 최근 숨음 = 숨었다 같은 창으로 돌아온 순간(언제·몇 초 · 최근 다섯) · 메모리 흐름 = 보이는 동안 5분마다 한 번(마지막 여섯 · JS 메모리만) · 다음 창 = 마지막으로 적어 둔 때부터 다음 창이 켜지기까지와 그 창이 열린 방식(다시 불러옴 reload · 새로 엶 navigate …) — 다시 켜진 까닭(사람이 새로고침했는지 Chrome이 저절로 살렸는지)은 몰라요',
    '',
    `## 보던 중 꺼짐 ${fg}번 · 내려 둔 사이 닫힘 ${list.length - fg}번`,
  ];
  for (const c of list) lines.push(crashLine(c));
  if (!list.length) lines.push(`(최근 ${CRASH_DAYS}일 저절로 꺼진 기록 없음)`);
  return `${lines.join('\n').trim()}\n`;
}

// ───────────────────── 박동 (브라우저) ─────────────────────

const bb = { sid: '', t0: 0, timer: null, mic: 0, speak: 0, err: '', ver: '', started: false, errAt: 0, closed: false, t: {}, h: [], hAt: 0, sp: [], hidAt: 0 };

/** 그 일이 있었던 때 (v426 — 끝나기 전 일) */
const mark = (k) => { bb.t[k] = Date.now(); };
/** 메모리를 5분마다 한 번 적어 둔다 (마지막 여섯 · Chrome만) */
function sampleHeap() {
  try {
    const m = typeof performance !== 'undefined' && performance.memory;
    const now = Date.now();
    if (!m || !m.usedJSHeapSize || now - bb.hAt < HEAP_EVERY) return;
    bb.hAt = now;
    bb.h = [...bb.h, Math.round(m.usedJSHeapSize / 1048576)].slice(-HEAP_KEEP);
  } catch { /* 못 재도 박동은 그대로 (Codex 229차) */ }
}
/** 이 창이 어떻게 열렸나 (reload = 다시 불러옴 · navigate = 새로 엶) — 못 알면 '' */
function navType() {
  try {
    const n = typeof performance !== 'undefined' && typeof performance.getEntriesByType === 'function' ? performance.getEntriesByType('navigation')[0] : null;
    return n && typeof n.type === 'string' ? n.type : '';
  } catch { return ''; }
}

/** 화면 id → 「지금 무엇을 하나」 한 줄을 돌려주는 함수 (v407 · 🎹 음악이 건다 — 박동 때마다 부른다) */
const scenes = new Map();
export function setScene(view, fn) {
  if (typeof view === 'string' && typeof fn === 'function') scenes.set(view, fn);
}
/** 그 화면의 한 줄 — 건 것이 없거나 던지면 '' */
export function sceneOf(view) {
  const fn = scenes.get(view);
  if (!fn) return '';
  try { return str(String(fn() || ''), 80); } catch { return ''; }
}

function readJson(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
}
/** 그 창이 보이나 — 숨은 화면 안에 남은 창(🐾 안내를 띄운 채 다른 화면으로 감)은 안 보이는 것 (Codex 212차 P3) */
const shown = (id) => {
  const e = document.getElementById(id);
  return !!(e && !e.hidden && !(typeof e.closest === 'function' && e.closest('[hidden]')));
};

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
  const scene = sceneOf(view);
  if (scene) beat.scene = scene;
  const dm = typeof navigator !== 'undefined' && Number(navigator.deviceMemory);
  if (dm > 0) beat.dm = dm;
  const m = typeof performance !== 'undefined' && performance.memory;
  if (m && m.usedJSHeapSize) { beat.heap = m.usedJSHeapSize / 1048576; beat.heapMax = m.jsHeapSizeLimit / 1048576; }
  try { beat.nodes = document.getElementsByTagName('*').length; } catch { /* 못 세도 */ }
  if (Object.keys(bb.t).length) beat.t = { ...bb.t }; // 끝나기 전 일의 때 (v426)
  if (bb.h.length) beat.h = bb.h.slice(); // 메모리 흐름
  if (bb.sp.length) beat.sp = bb.sp.map((x) => x.slice()); // 최근 숨음 [숨은 때, 밀리초]
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

/** 지난 창의 남은 박동 → SETTLE_MS 뒤에도 그대로면 끝난 창 → 꺼진 기록에 더하고 지운다 · 다시 켜진 간격·길은 이 창이 켜진 때·열린 길로 (v426) */
function collectLeftovers(discarded) {
  const openedAt = bb.t0; // 이 창이 켜진 때 (아래 루프의 now는 저장소에서 다시 읽은 박동 글이라 이름을 달리)
  const nav = navType();
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
      // 다시 켜진 간격·길은 가장 최근에 끝난 창에만 — 이 창이 바로 그 창의 다음이다 (더 옛날 창은 그사이 다른 창이 있었을 수 있다)
      const latest = x === beats.filter((y) => y.b).sort((a, b) => num(b.b.at) - num(a.b.at))[0];
      const ev = crashOf(x.b, { discarded: discarded && x === lastBg, ...(latest ? { now: openedAt, nav } : {}) });
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
    window.addEventListener('shincoach:micstart', () => { bb.mic++; bb.speak = 1; mark('mic'); beat(); });
    window.addEventListener('shincoach:micend', () => { bb.speak = 0; mark('micEnd'); });
    // 오류는 글만 바꿔 두고, 바로 쓰는 것은 1초에 한 번까지 — 매 화면(rAF)마다 같은 오류가 나도 저장소를 두드리지 않게 (다음 박동이 적는다)
    const noteErr = (m) => { bb.err = String(m || '').slice(0, 120); mark('err'); const t = Date.now(); if (t - bb.errAt >= 1000) { bb.errAt = t; beat(); } };
    window.addEventListener('error', (e) => noteErr(e && (e.message || e.type)));
    window.addEventListener('unhandledrejection', (e) => noteErr(e && e.reason && (e.reason.message || e.reason)));
    // 내릴 때 vis 0을 바로 — 내려 둔 사이 닫힘을 보던 중 꺼짐으로 세지 않게 · 다시 보이면 다른 창이 잘못 적은 내 기록을 지운다 · 숨음/다시 보임의 때도 (v426)
    document.addEventListener('visibilitychange', () => {
      // 다시 보이면 숨었던 길이를 남긴다 (최근 SPANS_KEEP — Codex 229차 제안) · 때를 견주지 않고 숨은 때(hidAt)를 들고 있다 — 같은 밀리초에 보임→숨음이 와도 놓치지 않게
      if (document.hidden) bb.hidAt = Date.now();
      else if (bb.hidAt > 0) { bb.sp = [...bb.sp, [bb.hidAt, Date.now() - bb.hidAt]].slice(-SPANS_KEEP); bb.hidAt = 0; }
      mark(document.hidden ? 'hide' : 'show'); beat(); if (!document.hidden && !bb.closed) forgetMe();
    });
    // v426 — 끝나기 전 일: 손댐(때만 · 박동은 5초마다가 적는다) · 영상 재생/멈춤(미디어 일은 거품이 안 올라 잡기 단계로) · Chrome이 창을 얼림/깨움(얼리면 바로 적는다)
    document.addEventListener('pointerdown', () => mark('touch'), { capture: true, passive: true });
    document.addEventListener('play', () => mark('play'), true);
    document.addEventListener('pause', () => mark('pause'), true);
    document.addEventListener('freeze', () => { mark('freeze'); beat(); });
    document.addEventListener('resume', () => { mark('resume'); beat(); });
    // 정상으로 닫힘 → 박동을 지운다 · bfcache에서 돌아오면 다시 적는다
    window.addEventListener('pagehide', () => { bb.closed = true; try { localStorage.removeItem(BEAT_PREFIX + bb.sid); } catch { /* 못 지우면 다음에 내려 둔 사이 닫힘으로 */ } });
    window.addEventListener('pageshow', (e) => { if (e && e.persisted) { bb.closed = false; beat(); forgetMe(); } });
    sampleHeap();
    beat();
    bb.timer = setInterval(() => { if (!document.hidden) { sampleHeap(); beat(); } }, BEAT_MS);
  } catch { /* 블랙박스가 앱을 멈추게 하지 않는다 */ }
}
