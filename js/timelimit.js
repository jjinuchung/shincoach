// ⏳ 하루 과목별 시간 제한 (2026-09-27, 아버님: "과목마다 평일 1시간·주말 2시간, 그 이상은 부모 허락")
//
// 아버님 결정 (2026-09-27):
//   ① 세는 것은 **그 과목 화면에 머문 시간** — 앱이 뒤로 가거나 화면을 끄면 멈추고, 2분 동안 아무 입력이 없어도 멈춘다
//      (놓고 딴 데 간 것은 안 센다). "앞에 앉아 있던 시간"에 가장 가깝다
//   ② 제한에 닿으면 **하던 것만 끝내고** 잠근다 — 풀던 회차·보던 영상은 끝까지. 10분 전부터 미리 알려 준다
//   ③ 잠겨도 🎒 도감·🛒 상점·🧬 진화는 그대로 — 오늘 벌어 둔 것을 쓰고 구경하는 건 막지 않는다 (시간도 안 센다)
//   ④ 추가 시간은 부모가 🔒 비밀번호를 넣고 **+10 / +20 / +30분** 버튼으로 (오늘만)
//
// 저장 자리 (db.js `daily` 기록):
//   · `mathTime` / `enTime`   — 오늘 그 과목에 쓴 초
//   · `mathBonus` / `enBonus` — 부모가 오늘 더 준 초
//   ★ 넷 다 DAILY_SUMS라 **백업을 되돌려도 줄지 않는다**(병합이 maxOf) — 옛 백업을 넣어 시간을 되돌리는 길을 막는다.
//     평소 쓰기는 증분(applyDailyDelta)이라 +10분 뒤 +20분은 30분이 된다.
//   ★ 제한값(분)은 ⚙ 설정(기기별 localStorage)에 둔다. 지워도 기본값으로 돌아올 뿐 시간이 늘지 않는다.
//
// ★ 이 파일 위쪽(규칙)은 아무것도 import하지 않는다 — 테스트가 DOM·IndexedDB 없이 부를 수 있게.
//   아래쪽(시계)만 db.js를 쓴다.

import { applyDailyDelta, getDaily } from './db.js';

/** 과목 두 가지 */
export const SUBJECTS = ['math', 'english'];

/** 기본 제한(분) — 아버님 요청값. ⚙ 설정에서 바꿀 수 있다 */
export const DEFAULT_MIN = { weekday: 60, weekend: 120 };

/** 남은 시간을 미리 알려 주기 시작하는 지점(초) */
export const WARN_SEC = 600;

/** 🔒 부모가 한 번에 주는 추가 시간(분) */
export const GRANT_MIN = [10, 20, 30];

/** 화면 앞에 있어도 이만큼 아무 입력이 없으면 세지 않는다(초) */
export const IDLE_SEC = 120;

/** 모아 두었다가 저장하는 주기(초) — 1초마다 IndexedDB를 두드리지 않게 */
export const FLUSH_SEC = 15;

/**
 * ⏳ 시간 연장권 (2026-10-01, 진우 요청 → 아버님 "이대로 진행") — 아이가 🛒에서 산 것으로 그 과목을 15분 더.
 * 과목마다 하루 EXTEND_MAX개가 기본(⚙ 설정에서 부모가 0~3, 0이면 못 쓴다). 부모가 주는 +10/20/30분은 이 한도와 따로다.
 * 버튼은 잠겼거나 10분 안 남았을 때만 — 일찍 눌러 낭비하지 않게.
 */
export const EXTEND_MIN = 15;
export const EXTEND_MAX = 2;

/** daily 기록의 필드 이름 — ext는 오늘 그 과목에 쓴 ⏳ 연장권 수 (시간은 EXTEND_MIN × 수) */
export const FIELD = {
  math: { used: 'mathTime', bonus: 'mathBonus', ext: 'mathExt' },
  english: { used: 'enTime', bonus: 'enBonus', ext: 'enExt' },
};

/** 과목 이름 (화면에 쓰는 말) */
export const KO = { math: '🔢 수학', english: '🎤 영어' };

/**
 * "YYYY-MM-DD"가 주말(토·일)인가.
 * ★ `new Date('2026-09-27')`는 **UTC로 읽혀** 한국에선 하루 밀린다 — 조각을 따로 넣어 지역 시간으로 만든다.
 */
export function isWeekend(dateKey) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey || ''));
  if (!m) return false;
  const day = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getDay();
  return day === 0 || day === 6;
}

/** 오늘의 기본 제한(초) — min은 ⚙ 설정의 { weekday, weekend } (분) */
export function limitSec(dateKey, min) {
  const conf = { ...DEFAULT_MIN, ...(min || {}) };
  const raw = isWeekend(dateKey) ? conf.weekend : conf.weekday;
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 0) return (isWeekend(dateKey) ? DEFAULT_MIN.weekend : DEFAULT_MIN.weekday) * 60;
  return n * 60;
}

const nz = (v) => {
  const n = Math.floor(Number(v) || 0);
  return n > 0 ? n : 0;
};

/** 오늘 그 과목에 쓴 시간(초) */
export function usedSec(daily, subject) {
  const f = FIELD[subject];
  return f ? nz(daily && daily[f.used]) : 0;
}

/** 부모가 오늘 더 준 시간(초) */
export function bonusSec(daily, subject) {
  const f = FIELD[subject];
  return f ? nz(daily && daily[f.bonus]) : 0;
}

/** 오늘 그 과목에 쓴 ⏳ 연장권 수 */
export function extCount(daily, subject) {
  const f = FIELD[subject];
  return f ? nz(daily && daily[f.ext]) : 0;
}

/** ⚙ "연장권 하루 최대" — 0~3, 비었거나 이상하면 기본값 */
export function extMaxOf(v) {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= 0 ? Math.min(3, n) : EXTEND_MAX;
}

/**
 * 지금 형편 → { used, limit, bonus, ext, extN, total, left, locked, warn }
 * @param {object} daily 오늘 기록
 * @param {'math'|'english'} subject
 * @param {string} dateKey "YYYY-MM-DD"
 * @param {{weekday?:number, weekend?:number}} [min] ⚙ 설정의 제한(분)
 * @param {{off?:boolean, extra?:number}} [o] off: 제한 자체를 껐다 · extra: 아직 저장 안 한 초
 */
export function statusOf(daily, subject, dateKey, min, o = {}) {
  const limit = limitSec(dateKey, min);
  const bonus = bonusSec(daily, subject);
  const extN = extCount(daily, subject);
  const ext = extN * EXTEND_MIN * 60;
  const total = limit + bonus + ext;
  const used = usedSec(daily, subject) + nz(o.extra);
  const left = Math.max(0, total - used);
  const off = !!o.off;
  return {
    used, limit, bonus, ext, extN, total, left,
    locked: !off && left <= 0,
    warn: !off && left > 0 && left <= WARN_SEC,
    off,
  };
}

/**
 * ⏳ 연장권을 지금 쓸 수 있나 → { why, can, room }
 *   why: 'off'(제한 꺼짐) · 'disabled'(부모가 0개로) · 'cap'(오늘 다 씀) · 'none'(가방에 없음) · 'early'(아직 10분보다 많이 남음) · 'ok'
 *   room: 오늘 더 쓸 수 있는 수
 * 진짜 판정(가방·한도)은 db.applyExtend 트랜잭션이 다시 한다 — 이건 화면에 무엇을 보여 줄지
 * @param {object} st statusOf 결과 · @param {{have:number, max:number}} o 가방에 있는 수 · 하루 최대
 */
export function extendPlan(st, o = {}) {
  const max = extMaxOf(o.max);
  const room = Math.max(0, max - ((st && st.extN) || 0));
  const why = !st || st.off ? 'off'
    : max <= 0 ? 'disabled'
      : room <= 0 ? 'cap'
        : nz(o.have) < 1 ? 'none'
          : !(st.locked || st.warn) ? 'early'
            : 'ok';
  return { why, can: why === 'ok', room };
}

/** 1초(또는 n초) 흘렀다 → applyDailyDelta에 넣을 증분 */
export function tickDelta(subject, sec = 1) {
  const f = FIELD[subject];
  const n = nz(sec);
  return f && n ? { [f.used]: n } : {};
}

/** 🔒 부모가 minutes분을 더 준다 → applyDailyDelta에 넣을 증분 */
export function grantDelta(subject, minutes) {
  const f = FIELD[subject];
  const n = Math.floor(Number(minutes) || 0);
  return f && n > 0 ? { [f.bonus]: n * 60 } : {};
}

/** 남은 초 → "1시간 5분" / "32분" / "1분도 안 남았어요" */
export function fmtLeft(sec) {
  const s = nz(sec);
  if (s <= 0) return '0분';
  if (s < 60) return '1분 안 남았어요';
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  return h ? `${h}시간 ${m % 60}분` : `${m}분`;
}

/** 쓴 시간 → "35분" (📊 부모 화면용, 0도 "0분") */
export function fmtUsed(sec) {
  const m = Math.floor(nz(sec) / 60);
  const h = Math.floor(m / 60);
  return h ? `${h}시간 ${m % 60}분` : `${m}분`;
}

// ───────────────────── 시계 (여기부터 브라우저) ─────────────────────

const clock = {
  subject: null,        // 지금 세고 있는 과목 ('math' | 'english' | null)
  pending: { math: 0, english: 0 }, // 아직 저장 안 한 초
  lastActive: 0,        // 마지막 입력 시각(ms)
  today: '',            // 지금 세고 있는 날짜
  daily: null,          // 오늘 기록 (저장할 때마다 갱신)
  timer: null,
  exempt: false,        // 🎯 도전 문제처럼 **제한 밖**인 것을 푸는 동안 (아버님 결정 2026-09-28)
  onTick: null,         // 화면(칩·잠금)에 알리는 콜백
  conf: null,           // () => ({ off, min })
};

const now = () => Date.now();
const dayKey = (d = new Date()) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** ⚙ 설정을 읽는 함수와 화면 갱신 콜백을 끼운다 (app.js가 한 번) */
export function initTimeLimit({ conf, onTick } = {}) {
  clock.conf = typeof conf === 'function' ? conf : () => ({ off: false, min: DEFAULT_MIN });
  clock.onTick = typeof onTick === 'function' ? onTick : null;
  clock.today = dayKey();
  clock.lastActive = now();
  if (typeof document !== 'undefined') {
    for (const ev of ['pointerdown', 'keydown', 'touchstart', 'wheel']) {
      document.addEventListener(ev, noteActivity, { passive: true, capture: true });
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) flushTime().catch(() => {});
      else clock.lastActive = now();   // 돌아오면 바로 센다
    });
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', () => { flushTime().catch(() => {}); });
  }
  if (clock.timer === null && typeof setInterval === 'function') clock.timer = setInterval(tick, 1000);
  return loadToday();
}

/** 오늘 기록을 읽어 둔다 (날짜가 바뀌면 다시) */
export async function loadToday() {
  clock.today = dayKey();
  try { clock.daily = await getDaily(clock.today); } catch { clock.daily = null; }
  if (clock.onTick) clock.onTick();
  return clock.daily;
}

/**
 * 🎯 도전 문제처럼 **제한에 안 들어가는** 것을 푸는 동안 켠다 (문제집 숙제는 제한 밖 — 아버님 결정 2026-09-28).
 * ★ 켰으면 **반드시 끈다** — 안 끄면 수학 시간이 영영 안 세어져 제한이 통째로 무의미해진다.
 */
export function setExempt(on) {
  const next = !!on;
  if (clock.exempt === next) return;
  flushTime().catch(() => {});   // 켜고 끌 때 모아 둔 초를 먼저 저장한다
  clock.exempt = next;
  clock.lastActive = now();
  if (clock.onTick) clock.onTick();
}

/** 지금 제한 밖인가 */
export function isExempt() {
  return clock.exempt;
}

/** 아이가 무언가 눌렀다 — 2분 쉬어도 다시 센다 */
export function noteActivity() {
  clock.lastActive = now();
}

/**
 * 지금 어느 과목을 세나 (app.js showView가 부른다).
 * 🎒 도감·📊 기록·🏠 홈은 null — 아버님 결정 ③(잠겨도 볼 수 있고, 시간도 안 센다)
 */
export function setSubject(subject) {
  const next = subject === 'math' || subject === 'english' ? subject : null;
  if (clock.subject === next) return;
  flushTime().catch(() => {});
  clock.subject = next;
  clock.lastActive = now();
  if (clock.onTick) clock.onTick();
}

/** 지금 세고 있는 과목 */
export function currentSubject() {
  return clock.subject;
}

function confNow() {
  try { return clock.conf ? clock.conf() || {} : {}; } catch { return {}; }
}

/** 지금 형편 (아직 저장 안 한 초까지 넣어서) */
export function status(subject) {
  const s = subject || clock.subject;
  if (!s) return null;
  const c = confNow();
  return statusOf(clock.daily, s, clock.today, c.min, { off: !!c.off, extra: clock.pending[s] || 0 });
}

/** 지금 그 과목이 잠겼나 (제한을 껐으면 언제나 false) */
export function isLocked(subject) {
  const st = status(subject);
  return !!(st && st.locked);
}

/**
 * 자정을 넘겼으면 날을 바꾼다 — 모아 둔 초는 **어제 기록에** 먼저 저장하고 오늘 기록을 읽는다.
 * ★ 시계의 다른 조건(🎯 제한 밖·화면 꺼짐·쉼)보다 **먼저** 본다 — 도전 문제를 연 채 자정을 넘기면 날이 안 바뀌어
 *   ⏳ 연장권이 어제 기록에 쓰였다 (가방에서는 빠지고 오늘은 안 늘어남, Codex 21차 #4)
 */
let rolling = null;
export function ensureToday() {
  if (dayKey() === clock.today) return Promise.resolve(clock.daily);
  if (!rolling) {
    rolling = flushTime().catch(() => {}).then(() => loadToday()).finally(() => { rolling = null; });
  }
  return rolling;
}

function tick() {
  if (dayKey() !== clock.today) { ensureToday().catch(() => {}); return; } // 자정을 넘겼다 — 무엇보다 먼저
  const s = clock.subject;
  if (!s) return;
  if (clock.exempt) return;                                                // 🎯 도전 문제 — 제한 밖
  if (typeof document !== 'undefined' && document.hidden) return;          // 뒤로 갔다
  if (now() - clock.lastActive > IDLE_SEC * 1000) return;                  // 놓고 딴 데 갔다
  // 이미 다 썼으면 더 세지 않는다 — 잠금 화면에서 아이가 몇 번 눌러도 "오늘 한 시간"이 부풀지 않게.
  // 덕분에 부모가 +20분을 주면 딱 20분이 생긴다 (used가 제자리라 total−used = 20분)
  if (isLocked(s)) return;
  clock.pending[s] = (clock.pending[s] || 0) + 1;
  if (clock.onTick) clock.onTick();
  if (clock.pending[s] >= FLUSH_SEC) flushTime().catch(() => {});
}

/** 모아 둔 초를 저장한다 (과목이 바뀔 때·뒤로 갈 때·15초마다) */
export async function flushTime() {
  const s = clock.subject;
  const sec = s ? clock.pending[s] || 0 : 0;
  if (!s || sec <= 0) return clock.daily;
  clock.pending[s] = 0;
  try {
    clock.daily = await applyDailyDelta(clock.today, tickDelta(s, sec));
  } catch {
    clock.pending[s] = (clock.pending[s] || 0) + sec; // 저장이 안 됐으면 다음에 다시
  }
  if (clock.onTick) clock.onTick();
  return clock.daily;
}

/** 🔒 부모가 추가 시간을 준다 (오늘만) — @returns {Promise<object|null>} 새 형편 */
export async function grantMinutes(subject, minutes) {
  const d = grantDelta(subject, minutes);
  if (!Object.keys(d).length) return null;
  await flushTime();
  clock.daily = await applyDailyDelta(clock.today, d);
  if (clock.onTick) clock.onTick();
  return status(subject);
}

/** 테스트·화면에서 쓰는 오늘 기록 (읽기 전용) */
export function todayDaily() {
  return clock.daily;
}

/** 시계가 세고 있는 날 ("YYYY-MM-DD") — ⏳ 연장권을 이 날 기록에 적는다 */
export function clockDay() {
  return clock.today || dayKey();
}

/** ⚙ "연장권 하루 최대" (부모 설정, 기본 2) */
export function extMax() {
  return extMaxOf(confNow().extMax);
}

/**
 * ⏳ 연장권처럼 **다른 경로로** 저장한 오늘 기록을 받아 둔다 — 칩·잠금이 바로 따라오게.
 * 아직 저장 안 한 초(pending)는 그대로 두고 status가 더한다.
 */
export function adoptDaily(d) {
  if (!d || d.date !== clock.today) return;
  clock.daily = d;
  if (clock.onTick) clock.onTick();
}
