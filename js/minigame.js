// 🎮 게임기 미니 게임 — 판 규칙 (2026-10-21, 진우 "게임기로 게임도 돼?" → 아버님 "모두 다 만들고 싶어")
//
// 아버님 결정 (2026-10-21):
//   ① 판은 **과목별 공부 시간**으로 생긴다 — ⏳가 이미 재는 그 과목 화면에 머문 초(mathTime·enTime·korTime · 2분 손 안 대면 안 셈)
//      정답 점수로 걸지 않는다: 틀리면 게임을 못 하게 되면 틀림이 무서워지고 찍기를 부른다
//   ② **공부 15분에 1판 · 과목을 합친 오늘 공부 시간으로 · 하루 12판까지** (v328, 2026-10-23 아버님 — 처음 v307은 과목마다 20분에 1판·
//      과목마다 하루 2판이었는데 "너무 적다" · 과목을 나눠 하면 시간이 버려져 아이가 헷갈렸다 · 한 과목만 오래 하는 것은 ⏳ 과목별 하루 시간이 막는다)
//   ③ **그날만** — 자정이 지나면 없어진다(모아 두었다 주말에 몰아 하지 않게)
//   ④ 아이 화면: 게임기 화면에 🎮 그림(코인처럼) + 규칙 설명과 "오늘 공부 N분 · M분 더 하면 한 판"(v328 — 아이가 얼마나 해야 하는지 몰라 헷갈려서) ·
//      공부 화면엔 셈 없이 판이 생길 때 한 줄만
//   ⑤ 💰·스톤·경험치는 주지 않는다(v284 일상 행동 그대로 — 💗 사이좋음만 하루 한 번) · 🔒 부모가 오늘만 +1판 · ⚙에서 분·상한
//
// 저장 자리 (db.js `daily` 기록 — DAILY_SUMS라 백업 병합이 큰 쪽):
//   · `gamePlays` — 오늘 쓴 판 수 (판을 시작할 때 claimDailyCount로 선점 — 두 창이 같은 판을 두 번 못 쓴다)
//   · `gameBonus` — 🔒 부모가 오늘 더 준 판 수
//   받은 판은 따로 적지 않는다 — 그날 공부 시간에서 늘 다시 셈한다(백업을 되돌려도 공부 시간이 줄지 않으니 판도 안 늘어난다)
//
// ★ 이 파일은 순수 규칙만 — timelimit.js(규칙 쪽)만 쓴다. 화면은 gameview.js, 게임 하나하나는 game*.js
import { SUBJECTS, usedSec } from './timelimit.js';

/** 공부 이만큼(분)에 1판 — 아버님 2026-10-23 (v307 20분 → v328 15분) */
export const GAME_MIN = 15;
/** 하루 이만큼(판)까지 — 과목을 합쳐 (v307 과목마다 2판 → v328 하루 12판) */
export const GAME_CAP = 12;
/** ⚙에서 고를 수 있는 끝 — 분은 5~120 · 판은 0(게임기 쉼)~20 */
const MIN_RANGE = [5, 120];
const CAP_MAX = 20;
/** 🔒 부모가 더 준 판의 끝 (깨진 큰 수가 끝없는 판이 되지 않게) */
export const BONUS_MAX = 20;

const nz = (v) => {
  const n = Math.floor(Number(v) || 0);
  return n > 0 ? n : 0;
};

/** ⚙ "몇 분에 1판" — 비었거나 이상하면 15 · 5~120으로 자른다 */
export function gameMinOf(v) {
  const n = Math.floor(Number(v));
  if (v === '' || v === null || v === undefined || !Number.isFinite(n) || n <= 0) return GAME_MIN;
  return Math.min(MIN_RANGE[1], Math.max(MIN_RANGE[0], n));
}
/** ⚙ "하루 몇 판" — 비었거나 이상하면 12 · 0~20 (0이면 공부로 판이 안 생긴다 — 🔒 부모 판만) */
export function gameCapOf(v) {
  const n = Math.floor(Number(v));
  if (v === '' || v === null || v === undefined || !Number.isFinite(n) || n < 0) return GAME_CAP;
  return Math.min(CAP_MAX, n);
}
/** 설정 묶음 고쳐 읽기 — { min, cap } */
export function gameConfOf(c) {
  return { min: gameMinOf(c && c.min), cap: gameCapOf(c && c.cap) };
}

/** 오늘 공부한 초 (순수) — 과목을 합쳐(📚 국어 시간에 🖊️ 논술도 들어 있다) · extra = 아직 저장 안 한 초(⏳ 시계의 pending) */
export function studySec(daily, extra = {}) {
  return SUBJECTS.reduce((a, s) => a + usedSec(daily, s) + nz(extra && extra[s]), 0);
}

/** 공부 시간으로 생긴 판 (순수) — sec = 오늘 과목을 합친 공부 초 · 하루 cap판에서 멈춘다 */
export function studyPlays(sec, conf) {
  const c = gameConfOf(conf);
  return Math.min(c.cap, Math.floor(nz(sec) / (c.min * 60)));
}

/**
 * 오늘 받은 판 (순수) → { sec, study, bonus, total, max, next }
 * @param {object} daily 오늘 기록 · @param {{min?:number, cap?:number}} conf ⚙ 설정
 * @param {{math?:number, english?:number, korean?:number}} [extra] 아직 저장 안 한 초(⏳ 시계의 pending)
 * sec = 오늘 공부한 초 · study = 공부로 받은 판 · total = study + 🔒 부모 판 · max = 오늘 받을 수 있는 끝(다 받았으면 "오늘 게임은 끝") ·
 * next = 공부로 다음 판을 받기까지 남은 초 (하루 끝까지 받았거나 0판(쉼)이면 0 — 쓴 판은 안 본다: 아이에게 말할 때는 playState.next)
 */
export function earnedPlays(daily, conf, extra = {}) {
  const c = gameConfOf(conf);
  const sec = studySec(daily, extra);
  const study = studyPlays(sec, c);
  const bonus = Math.min(BONUS_MAX, nz(daily && daily.gameBonus));
  const next = study < c.cap ? (study + 1) * c.min * 60 - sec : 0;
  return { sec, study, bonus, total: study + bonus, max: c.cap + bonus, next };
}

/** 오늘 쓴 판 */
export function usedPlays(daily) {
  return nz(daily && daily.gamePlays);
}

/**
 * 게임기 화면의 형편 (순수) → { left, mood, sec, study, bonus, total, used, next, cap }
 *   mood: 'ready' 남은 판이 있다 · 'study' 공부하고 오면 생긴다 · 'done' 오늘 더 놀 판이 없다(다 받아 다 썼거나 쓴 판이 끝을 넘음) · 'rest' 부모가 0판으로(게임기 쉼)
 *   left는 🎮 그림으로 · 나머지는 설명 줄로(gameview.statusLines — v328)
 *   next = **실제로 놀 수 있는 판이 하나 더 생기기까지** 남은 공부 초 — 쓴 판이 받은 판보다 많으면(⚙에서 분을 늘림 · 다른 기기)
 *   그만큼 더 받아야 놀 수 있다(받은 판만 세면 "30분 더"라고 해 놓고 또 못 논다, 🔍 Codex 132차 #1) · 오늘 더 못 받으면 0
 */
export function playState(daily, conf, extra = {}) {
  const c = gameConfOf(conf);
  const e = earnedPlays(daily, c, extra);
  const used = usedPlays(daily);
  const left = Math.max(0, e.total - used);
  const need = Math.max(e.study + 1, used - e.bonus + 1); // 공부로 받아야 하는 판 수
  const next = c.cap > 0 && need <= c.cap ? need * c.min * 60 - e.sec : 0;
  const info = { left, sec: e.sec, study: e.study, bonus: e.bonus, total: e.total, used, next, cap: c.cap };
  if (left > 0) return { ...info, mood: 'ready' };
  if (c.cap <= 0) return { ...info, mood: 'rest' };
  return { ...info, mood: e.total >= e.max || used >= e.max ? 'done' : 'study' };
}

/** 판을 쓸 때 트랜잭션 안에서 보는 끝 (db.claimDailyCount의 max) — 저장된 오늘 기록으로 다시 셈한다 */
export function playLimit(conf) {
  const c = gameConfOf(conf);
  return (cur) => earnedPlays(cur, c).total;
}

/**
 * 🎮 게임 목록 — 차례대로 만들었다(아버님 2026-10-21): v307 디그다 → v308 달리기·그림자 → v309 짝 맞추기·나무열매 → v310 열기구 → v311 탑 → v312 줄다리기(여덟 모두)
 *   → v333 대모험 → v339 그림 맞추기
 * id는 소문자(최고 기록 열쇠 — homeplay.GAME_KEY) · sec = 한 판 길이 · ★ 새 게임은 gameview.RUNNERS에도
 */
export const GAMES = [
  { id: 'dig', emoji: '🕳️', ko: '디그다 잡기', how: '톡! 쏙 나온 디그다를 잡아요 · 찌리리공은 누르지 마요', sec: 30 },
  { id: 'run', emoji: '🏃', ko: '파트너 달리기', how: '톡! 폴짝 뛰어 나무열매를 먹어요 · 돌은 넘어요', sec: 30 },
  { id: 'shadow', emoji: '👤', ko: '그림자 포켓몬', how: '까만 그림자는 누구일까? 이름을 골라요', sec: 40 },
  { id: 'pair', emoji: '🃏', ko: '포켓몬 짝 맞추기', how: '카드를 뒤집어 같은 포켓몬을 찾아요', sec: 60 },
  { id: 'berry', emoji: '🍓', ko: '나무열매 받기', how: '끌어서 열매를 받아요 · 찌리리공은 피해요', sec: 30 },
  { id: 'balloon', emoji: '🎈', ko: '로켓단 열기구', how: '톡! 파트너 기술로 열기구를 터뜨려요 · 클수록 여러 번 · 꼬마 열기구는 빨라요', sec: 30 },
  { id: 'tower', emoji: '🗼', ko: '몬스터볼 탑 쌓기', how: '톡! 몬스터볼을 떨어뜨려 높이 쌓아요 · 딱 맞으면 별이 더', sec: 30 },
  { id: 'tug', emoji: '🤼', ko: '아빠랑 줄다리기', how: '톡톡! 빨리 눌러 줄을 당겨요 · 혼자면 나옹이랑', sec: 30 },
  { id: 'adv', emoji: '🗺️', ko: '파트너 대모험', how: '톡 하면 낮게 · 꾹 누르면 높이 폴짝 · 메카는 밟고 찌리리공은 피해 깃대까지', sec: 45 }, // v333 — sec은 보통 걸리는 시간(끝은 깃대)
  // v339 — 시간 제한 없이 다 맞추면 끝(sec은 보통 걸리는 시간) · clock = 최고 기록이 ⭐가 아니라 가장 빠른 시간(homeplay fast) · wide = 넓은 게임기 카드
  { id: 'jig', emoji: '🖼️', ko: '포켓몬 그림 맞추기', how: '조각을 끌어다 제자리에 놓아 그림을 완성해요 · 시간 제한은 없어요', sec: 150, clock: true, wide: true },
  // v344 (2026-10-26 아버님 "추천 순서대로" → 기본안 "이대로") — 맞혀도·낚아도 도감엔 안 들어간다(공부 없이 도감이 늘지 않게)
  { id: 'throw', emoji: '🎯', ko: '몬스터볼 던지기', how: '볼을 끌어서 위로 휙! 원이 작을 때 맞히면 별이 더 · 도감엔 안 들어가요', sec: 30 },
  { id: 'fish', emoji: '🎣', ko: '잉어킹 낚시', how: '찌가 쏙 들어가면 톡! 걸리면 꾹 눌러 초록 칸 안에 · 도감엔 안 들어가요', sec: 45 },
];
export function gameById(id) {
  return GAMES.find((g) => g.id === id) || null;
}

/** ⏱️ 걸린 시간 말 (순수 — 🖼️ 그림 맞추기 v339) — 45 → '45초' · 133 → '2분 13초' · 120 → '2분' · 깨진 값은 '' */
export function clockText(sec) {
  const n = Math.floor(Number(sec));
  if (!Number.isFinite(n) || n <= 0) return '';
  const m = Math.floor(n / 60);
  const r = n % 60;
  if (!m) return `${r}초`;
  return r ? `${m}분 ${r}초` : `${m}분`;
}
