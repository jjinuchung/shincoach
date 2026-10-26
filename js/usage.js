// 🕒 앱 사용 기록 (2026-10-16 v272, 아버님: 기록을 날마다 모아 Claude가 먼저 읽고 "아이의 AI 선생님"이 되게 — 2단계 "모자란 기록 보태기")
//
// ⏳ 시간 제한 시계(timelimit.js)는 과목 화면만, 그것도 제한에 넣는 시간만 센다(🎯 도전 문제·잠긴 뒤·🎒·🏠는 안 셈).
// 그래서 📤 기록만으로는 "앱을 안 켰는지 · 포켓몬만 했는지 · 올리기가 실패했는지"를 가를 수 없었다 →
//   · 화면마다 머문 초 — 과목·홈·🎒 도감·📊 기록에, 그 위에 뜬 🏡 집·🛒 상점·🎯 잡기·⚔️ 배틀·⏳ 잠금 화면까지
//   · 쓴 때 — 10분 칸("21:3" = 21시 30분대)
//   · 앱을 연 수 — 창을 새로 열 때마다(내렸다 다시 올린 것은 안 셈)
// 세는 규칙은 ⏳와 같다: 화면이 보이고, 2분 안에 손을 댔을 때만 (놓고 딴 데 간 것은 안 셈).
// ★ 아이 화면에는 아무것도 안 보인다 — 📤 usage/날짜.md로 아버님·Claude만 본다 (아이 화면에 셈 문구 금지, 2026-10-15)
//
// 저장 자리 (db.js `daily` 기록): 머문 초 u…·연 수 appOpens는 DAILY_SUMS(증분으로 더하고, 백업 병합은 큰 쪽) ·
//   쓴 때 useSlots는 DAILY_LISTS(합집합 — 두 창·두 기기 기록을 합쳐도 같은 칸은 한 번)
//
// ★ 이 파일 위쪽(규칙)은 아무것도 import하지 않는다 — 테스트가 DOM·IndexedDB 없이 부를 수 있게. 아래쪽(시계)만 db.js를 쓴다.

import { applyDailyDelta } from './db.js';

/** 자리 → daily 필드 · 📤에 쓰는 이름 (차례는 📤 글의 차례) */
export const PLACES = [
  { key: 'math', field: 'uMath', ko: '🔢 수학' },
  { key: 'korean', field: 'uKor', ko: '📚 국어' },
  { key: 'english', field: 'uEn', ko: '🎤 영어' },
  { key: 'home', field: 'uHome', ko: '🏠 홈' },
  { key: 'pokedex', field: 'uDex', ko: '🎒 도감' },
  { key: 'house', field: 'uHouse', ko: '🏡 집' },
  { key: 'game', field: 'uGame', ko: '🎮 게임기' }, // 🎮 미니 게임 (v307) — 집 위에 뜬 게임기 화면
  { key: 'stock', field: 'uStock', ko: '🏦 증권' }, // 🏦 포켓몬 증권시장 (v319) — 홈 위에 뜬 창
  { key: 'journey', field: 'uJourney', ko: '🎒 대여행' }, // 🎒 포켓몬 대여행 (v341) — 홈 위에 뜬 창
  { key: 'shop', field: 'uShop', ko: '🛒 상점' },
  { key: 'catch', field: 'uCatch', ko: '🎯 잡기·진화·부화' },
  { key: 'battle', field: 'uBattle', ko: '⚔️ 배틀' },
  { key: 'stats', field: 'uStats', ko: '📊 기록' },
  { key: 'lock', field: 'uLock', ko: '⏳ 잠금 화면' },
];
const FIELD_OF = Object.fromEntries(PLACES.map((p) => [p.key, p.field]));

/** 화면 이름(app.js showView) → 자리 — 🎤 영어는 목록·플레이어 둘 다 */
export function placeOfView(view) {
  if (view === 'library' || view === 'player') return 'english';
  if (view === 'nonsul') return 'korean'; // 🖊️ 논술은 국어 시간 안 — 사용 기록도 국어 자리로 (v303 · Codex 109차 #3)
  return FIELD_OF[view] ? view : null;
}

/**
 * 화면 위에 뜬 창(겹친 창) → 자리. 가장 앞에 뜨는 것부터 — ⏳ 잠금이 무엇보다 앞, 그다음 배틀·잡기·집·상점.
 * @param {(id:string) => boolean} shown 그 id의 창이 떠 있나 (테스트는 함수를 넘긴다)
 */
export const OVERLAYS = [
  { place: 'lock', ids: ['timeup'] },
  { place: 'battle', ids: ['battle', 'rocket'] },
  { place: 'catch', ids: ['catch', 'evolve', 'hatch'] },
  { place: 'game', ids: ['game'] }, // 🎮 게임기 화면은 집 위에 뜬다 (v307)
  { place: 'house', ids: ['house'] },
  { place: 'stock', ids: ['stock'] }, // 🏦 증권시장 (v319)
  { place: 'journey', ids: ['jr-trip'] }, // 🎒 대여행 (v341 — 창 id는 jr-trip: 'journey'는 영어 플레이어 막대)
  { place: 'shop', ids: ['shop', 'market'] },
];
export function placeNow(view, shown) {
  for (const o of OVERLAYS) if (o.ids.some((id) => shown(id))) return o.place;
  return placeOfView(view);
}

/** 그 때의 10분 칸 "HH:M" (지역 시각) — 21:37 → "21:3" */
export function slotOf(t) {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, '0')}:${Math.floor(d.getMinutes() / 10)}`;
}

/** 모아 둔 것 → daily 증분 (순수) — opens = 앱을 연 수(저장될 때까지 들고 있다) · 비었으면 null */
export function usageDelta(sec, slots, opens = 0) {
  const delta = {};
  const o = Math.floor(Number(opens) || 0);
  if (o > 0) delta.appOpens = o;
  for (const [place, n] of Object.entries(sec || {})) {
    const f = FIELD_OF[place];
    const v = Math.floor(Number(n) || 0);
    if (f && v > 0) delta[f] = (delta[f] || 0) + v;
  }
  const list = [...new Set((slots || []).filter((s) => /^\d{2}:\d$/.test(s)))];
  if (list.length) delta.useSlots = list;
  return Object.keys(delta).length ? delta : null;
}

// (쓴 때 칸을 "07:40~08:20"으로 잇는 것은 📤 글을 만드는 upload.slotRanges)

// ───────────────────── 시계 (화면이 있을 때만) ─────────────────────

/** 화면 앞에 있어도 이만큼 아무 입력이 없으면 세지 않는다(초) — ⏳ IDLE_SEC와 같다 */
export const IDLE_SEC = 120;
/** 모아 두었다가 저장하는 주기(초) */
export const FLUSH_SEC = 15;

const clock = {
  view: null,
  today: '',
  lastActive: 0,
  buf: new Map(),   // 아직 저장 안 한 것 — 날짜마다 { sec: { 자리: 초 }, slots: Set(10분 칸), opens: 연 수 } (🔍 Codex 81차 #1·#4)
  pending: 0,       // 아직 저장 안 한 초의 합
  timer: null,
  saving: null,
};

/** 그 날짜의 모음 (없으면 새로) */
function bufOf(day) {
  let b = clock.buf.get(day);
  if (!b) { b = { sec: {}, slots: new Set(), opens: 0 }; clock.buf.set(day, b); }
  return b;
}
/** 저장하지 못한 모음을 그 날짜에 되돌려 놓는다 — 그새 날이 바뀌어도 그 날짜로 (오늘에 더하지 않게) */
function putBack(day, b) {
  const into = bufOf(day);
  for (const [k, v] of Object.entries(b.sec)) { into.sec[k] = (into.sec[k] || 0) + v; clock.pending += v; }
  for (const s of b.slots) into.slots.add(s);
  into.opens += b.opens;
}

const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const shownById = (id) => { const e = document.getElementById(id); return !!(e && !e.hidden); };

/** 지금 화면 (app.js showView가 부른다) */
export function setUsageView(view) {
  clock.view = view || null;
}

/**
 * 모아 둔 것을 날짜마다 그 날 기록에 더한다 — 실패한 날짜는 그 날짜로 되돌려 놓고 다음에 다시.
 * 저장 중이면 그것이 끝난 뒤 한 번 더 — 그새 모인 초가 "저장 중"에 묻혀 숨김·📤에서 빠지지 않게.
 * 자정 무렵 저장이 겹쳐도 어제 몫은 어제 모음에 남아 있다가 어제에 저장된다 (🔍 Codex 81차 #1 — 전엔 버렸다)
 */
export function flushUsage() {
  if (clock.saving) return clock.saving.then(() => flushUsage());
  const batches = [...clock.buf.entries()].map(([day, b]) => ({ day, b, delta: usageDelta(b.sec, [...b.slots], b.opens) })).filter((x) => x.delta);
  clock.buf = new Map();
  clock.pending = 0;
  if (!batches.length) return Promise.resolve(null);
  clock.saving = (async () => {
    for (const { day, b, delta } of batches) {
      try { await applyDailyDelta(day, delta); } catch { putBack(day, b); }
    }
    return null;
  })().finally(() => { clock.saving = null; });
  return clock.saving;
}

function tick() {
  const t = Date.now();
  const day = dayKey(new Date(t));
  if (day !== clock.today) { clock.today = day; if (!clock.saving) flushUsage(); } // 자정을 넘겼다 — 어제 모음은 어제 날짜로 저장된다
  if (document.hidden) return;
  if (t - clock.lastActive > IDLE_SEC * 1000) return;
  const place = placeNow(clock.view, shownById);
  if (!place) return;
  const b = bufOf(day);
  b.sec[place] = (b.sec[place] || 0) + 1;
  b.slots.add(slotOf(t));
  if (++clock.pending >= FLUSH_SEC && !clock.saving) flushUsage(); // 저장 중이면 다음 초에 (기다리는 약속을 초마다 쌓지 않게)
}

/**
 * 시계를 켠다 (app.js main이 한 번) — 앱을 연 수 +1 · 손댐·화면 숨김·창 닫힘을 듣는다.
 * 연 수도 모음에 넣어 저장될 때까지 들고 있다 (🔍 Codex 81차 #4 — 첫 저장이 실패하면 빠졌다).
 * 실패해도 앱은 그대로 (기록만 빠진다)
 */
export function initUsage() {
  if (clock.timer !== null || typeof document === 'undefined') return;
  clock.today = dayKey();
  clock.lastActive = Date.now();
  bufOf(clock.today).opens += 1;
  flushUsage();
  const active = () => { clock.lastActive = Date.now(); };
  for (const ev of ['pointerdown', 'keydown', 'touchstart', 'wheel']) document.addEventListener(ev, active, { passive: true, capture: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) flushUsage();
    else clock.lastActive = Date.now(); // 돌아오면 바로 센다
  });
  window.addEventListener('pagehide', () => { flushUsage(); });
  clock.timer = setInterval(tick, 1000);
}
