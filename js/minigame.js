// 🎮 게임기 미니 게임 — 판 규칙 (2026-10-21, 진우 "게임기로 게임도 돼?" → 아버님 "모두 다 만들고 싶어")
//
// 아버님 결정 (2026-10-21):
//   ① 판은 **과목별 공부 시간**으로 생긴다 — ⏳가 이미 재는 그 과목 화면에 머문 초(mathTime·enTime·korTime · 2분 손 안 대면 안 셈)
//      정답 점수로 걸지 않는다: 틀리면 게임을 못 하게 되면 틀림이 무서워지고 찍기를 부른다
//   ② **20분에 1판 · 과목마다 하루 2판**(처음 15분 제안 → 아버님이 20분으로) → 하루 최대 6판 · 한 과목만 오래 해도 그 과목 몫까지만(골고루)
//   ③ **그날만** — 자정이 지나면 없어진다(모아 두었다 주말에 몰아 하지 않게)
//   ④ 아이 화면: 게임기 화면에만 🎮 그림(코인처럼) · 공부 화면엔 "몇 분 더" 같은 셈 없이 판이 생길 때 한 줄만
//   ⑤ 💰·스톤·경험치는 주지 않는다(v284 일상 행동 그대로 — 💗 사이좋음만 하루 한 번) · 🔒 부모가 오늘만 +1판 · ⚙에서 분·상한
//
// 저장 자리 (db.js `daily` 기록 — DAILY_SUMS라 백업 병합이 큰 쪽):
//   · `gamePlays` — 오늘 쓴 판 수 (판을 시작할 때 claimDailyCount로 선점 — 두 창이 같은 판을 두 번 못 쓴다)
//   · `gameBonus` — 🔒 부모가 오늘 더 준 판 수
//   받은 판은 따로 적지 않는다 — 그날 공부 시간에서 늘 다시 셈한다(백업을 되돌려도 공부 시간이 줄지 않으니 판도 안 늘어난다)
//
// ★ 이 파일은 순수 규칙만 — timelimit.js(규칙 쪽)만 쓴다. 화면은 gameview.js, 게임 하나하나는 game*.js
import { SUBJECTS, usedSec } from './timelimit.js';

/** 공부 이만큼(분)에 1판 — 아버님 2026-10-21 */
export const GAME_MIN = 20;
/** 과목마다 하루 이만큼(판)까지 */
export const GAME_CAP = 2;
/** ⚙에서 고를 수 있는 끝 — 분은 5~120 · 판은 0(게임기 쉼)~5 */
const MIN_RANGE = [5, 120];
const CAP_MAX = 5;
/** 🔒 부모가 더 준 판의 끝 (깨진 큰 수가 끝없는 판이 되지 않게) */
export const BONUS_MAX = 20;

const nz = (v) => {
  const n = Math.floor(Number(v) || 0);
  return n > 0 ? n : 0;
};

/** ⚙ "몇 분에 1판" — 비었거나 이상하면 20 · 5~120으로 자른다 */
export function gameMinOf(v) {
  const n = Math.floor(Number(v));
  if (v === '' || v === null || v === undefined || !Number.isFinite(n) || n <= 0) return GAME_MIN;
  return Math.min(MIN_RANGE[1], Math.max(MIN_RANGE[0], n));
}
/** ⚙ "과목마다 하루 몇 판" — 비었거나 이상하면 2 · 0~5 (0이면 공부로 판이 안 생긴다 — 🔒 부모 판만) */
export function gameCapOf(v) {
  const n = Math.floor(Number(v));
  if (v === '' || v === null || v === undefined || !Number.isFinite(n) || n < 0) return GAME_CAP;
  return Math.min(CAP_MAX, n);
}
/** 설정 묶음 고쳐 읽기 — { min, cap } */
export function gameConfOf(c) {
  return { min: gameMinOf(c && c.min), cap: gameCapOf(c && c.cap) };
}

/** 한 과목에서 생긴 판 (순수) — usedSec = 그 과목에 쓴 초 */
export function subjectPlays(sec, conf) {
  const c = gameConfOf(conf);
  return Math.min(c.cap, Math.floor(nz(sec) / (c.min * 60)));
}

/**
 * 오늘 받은 판 (순수) → { math, english, korean, bonus, total, max }
 * @param {object} daily 오늘 기록 · @param {{min?:number, cap?:number}} conf ⚙ 설정
 * @param {{math?:number, english?:number, korean?:number}} [extra] 아직 저장 안 한 초(⏳ 시계의 pending)
 * max = 오늘 공부로 받을 수 있는 끝 + 🔒 부모 판 (다 받았으면 "오늘 게임은 끝"이라고 말할 때)
 */
export function earnedPlays(daily, conf, extra = {}) {
  const c = gameConfOf(conf);
  const out = { bonus: Math.min(BONUS_MAX, nz(daily && daily.gameBonus)), total: 0, max: 0 };
  for (const s of SUBJECTS) out[s] = subjectPlays(usedSec(daily, s) + nz(extra && extra[s]), c);
  out.total = SUBJECTS.reduce((a, s) => a + out[s], 0) + out.bonus;
  out.max = SUBJECTS.length * c.cap + out.bonus;
  return out;
}

/** 오늘 쓴 판 */
export function usedPlays(daily) {
  return nz(daily && daily.gamePlays);
}

/**
 * 게임기 화면의 형편 (순수) → { left, mood }
 *   mood: 'ready' 남은 판이 있다 · 'study' 공부하고 오면 생긴다 · 'done' 오늘 받을 판을 다 받아 다 썼다 · 'rest' 부모가 0판으로(게임기 쉼)
 * (아이 화면에는 left를 🎮 그림으로만 — 몇 분 더 하면 생기는지는 말하지 않는다)
 */
export function playState(daily, conf, extra = {}) {
  const c = gameConfOf(conf);
  const e = earnedPlays(daily, c, extra);
  const left = Math.max(0, e.total - usedPlays(daily));
  if (left > 0) return { left, mood: 'ready' };
  if (c.cap <= 0) return { left, mood: 'rest' };
  return { left, mood: e.total >= e.max ? 'done' : 'study' };
}

/** 판을 쓸 때 트랜잭션 안에서 보는 끝 (db.claimDailyCount의 max) — 저장된 오늘 기록으로 다시 셈한다 */
export function playLimit(conf) {
  const c = gameConfOf(conf);
  return (cur) => earnedPlays(cur, c).total;
}

/**
 * 🎮 게임 목록 — 차례대로 만든다(아버님 2026-10-21): v307 디그다 → v308 달리기·그림자 → v309 짝 맞추기·나무열매 → v310 열기구·탑 → v311 줄다리기
 * id는 소문자(최고 기록 열쇠 — homeplay.GAME_KEY) · sec = 한 판 길이 · ★ 새 게임은 gameview.RUNNERS에도
 */
export const GAMES = [
  { id: 'dig', emoji: '🕳️', ko: '디그다 잡기', how: '톡! 쏙 나온 디그다를 잡아요 · 찌리리공은 누르지 마요', sec: 30 },
  { id: 'run', emoji: '🏃', ko: '파트너 달리기', how: '톡! 폴짝 뛰어 나무열매를 먹어요 · 돌은 넘어요', sec: 30 },
  { id: 'shadow', emoji: '👤', ko: '그림자 포켓몬', how: '까만 그림자는 누구일까? 이름을 골라요', sec: 40 },
];
export function gameById(id) {
  return GAMES.find((g) => g.id === id) || null;
}
