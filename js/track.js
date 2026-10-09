// 학습 기록 수집: 플레이어에서 일어나는 일(재생, 듣기, 말하기 결과, 시간, 단어 조회)을 문장별/세션별/일별로 누적
// 메모리에 모았다가 5초마다·닫을 때 IndexedDB에 저장 (문장마다 쓰지 않도록)
import {
  sentenceKey, getSentenceStats, putSentenceStats, putSession, getDaily, bumpVocabViews,
  emptyDaily, mergeDailyDelta, applyDailyDelta, claimDailyCount, claimDailyKey, mergeEssayEntry } from './db.js';
import { enroll, schedule, GRADUATED } from './review.js';

export const MASTER_RATIO = 0.8; // 발음 점수 80% 이상이면 ⭐ 정복

/** 로컬 날짜 "YYYY-MM-DD" */
export function todayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const t = {
  item: null,
  stats: new Map(),   // key → record
  dirty: new Set(),   // 저장 대기 key
  session: null,
  daily: null,        // 화면에 보여줄 오늘 기록 (저장된 값 + 아직 안 쓴 증분)
  dailyDelta: null,   // 아직 저장하지 않은 증분 — 통째로 덮어쓰지 않으려고 이것만 더해 쓴다
  flushTimer: null,
};

/**
 * 오늘 기록의 증분. 홈 화면 앱과 Chrome 탭을 같이 열면 각 창이 사본을 들고 있다가
 * 통째로 덮어써서 서로의 공부 시간·문장 수가 사라졌다 → 늘어난 만큼만 모아서 더해 쓴다.
 * 수치는 bump가 `(Number(x) || 0) + n`으로 더하므로 0을 미리 깔지 않는다 — 깔아 두면
 * db.js의 DAILY_SUMS를 베낀 두 번째 목록이 되어 조용히 어긋난다 (실제로 어긋나 있었다).
 */
function emptyDelta() {
  return { doneKeys: [], essays: [] };
}

function deltaEmpty(d) {
  if (!d) return true;
  for (const k of Object.keys(d)) {
    if (k === 'date') continue; // 저장 실패로 되돌린 증분에는 날짜가 붙어 있다
    const v = d[k];
    if (Array.isArray(v) ? v.length : v) return false;
  }
  return true;
}

/** 오늘 기록의 수치 하나를 올림 (보기값 + 증분 둘 다) */
function bump(field, n = 1) {
  if (!t.daily || !n) return;
  t.daily[field] = (Number(t.daily[field]) || 0) + n;
  t.dailyDelta[field] = (Number(t.dailyDelta[field]) || 0) + n;
}

function emptyRecord(itemId, cue) {
  return {
    key: sentenceKey(itemId, cue.start), itemId, start: cue.start, en: cue.en, ko: cue.ko || '',
    plays: 0, listens: 0, done: false, seconds: 0,
    speakAttempts: 0, speakPass: 0, speakFail: 0, speakSkipped: 0, bestRatio: 0, lastRatio: 0, lastAt: 0,
    puzzles: 0, puzzleSolved: 0, puzzleWrong: 0,
    // 🔁 복습: box = 라이트너 단계, dueAt = 다음 복습 날짜('' 면 아직 복습 대상 아님)
    box: 0, dueAt: '', reviews: 0, reviewPass: 0, reviewedAt: 0,
  };
}

/** 자정을 넘겼으면 어제 몫의 증분을 어제 날짜로 저장하고 오늘 기록으로 바꿈 (동기) */
function rollDailyIfNeeded() {
  const key = todayKey();
  if (!t.daily || t.daily.date === key) return;
  const oldDate = t.daily.date;
  const oldDelta = t.dailyDelta;
  t.dailyDelta = emptyDelta();
  if (!deltaEmpty(oldDelta)) applyDailyDelta(oldDate, oldDelta).catch(() => {});
  t.daily = emptyDaily(key);
  // 저장소에 오늘 기록이 이미 있으면(다른 창이 썼거나 아침에 한 번 열었음) 보기값을 그걸로 맞춤
  getDaily(key).then((existing) => adoptSaved(key, existing)).catch(() => {});
}

function rec(cue) {
  if (!t.item || !cue) return null;
  rollDailyIfNeeded();
  const key = sentenceKey(t.item.id, cue.start);
  let r = t.stats.get(key);
  if (!r) { r = emptyRecord(t.item.id, cue); t.stats.set(key, r); }
  r.lastAt = Date.now();
  t.dirty.add(key);
  return r;
}

async function ensureDaily() {
  const key = todayKey();
  if (t.daily && t.daily.date === key) return t.daily;
  if (t.daily && !deltaEmpty(t.dailyDelta)) {
    await applyDailyDelta(t.daily.date, t.dailyDelta).catch(() => {});
  }
  t.dailyDelta = emptyDelta();
  t.daily = (await getDaily(key).catch(() => null)) || emptyDaily(key);
  return t.daily;
}

/** 저장 결과를 보기값으로 채택 (그 사이 자정을 넘겼으면 버린다) */
function adoptSaved(date, saved) {
  if (!saved || !t.daily || t.daily.date !== date) return;
  t.daily = mergeDailyDelta(saved, date, t.dailyDelta);
}

/**
 * "하루 N번"을 트랜잭션 안에서 선점한다 → 두 창이 동시에 불러도 보상은 한 쪽만.
 * 하루 한 번짜리(플래그)는 max 1로 부르면 된다 — 저장될 때 boolean으로 돌아오고 Number(true)는 1이다.
 * 저장소가 막히면 메모리로라도 상한을 지킨다 (보상을 두 번 주지 않는 쪽으로).
 * @returns {Promise<boolean>} 이번에 내가 선점했는지
 */
/**
 * 하루 상한이 있는 것을 트랜잭션으로 선점한다.
 * ★ strict면 저장이 실패했을 때 **메모리로 성공 처리하지 않는다** — ⚔️ 배틀처럼 두 과목(영어·수학)이
 *   같은 칸을 나눠 쓰는 것은 폴백이 상한을 넘게 한다 (Codex 9차 #9). 아직 시작 전이라 버려도 잃는 게 없다.
 */
async function claim(field, max, strict = false) {
  if (!t.daily) return false;
  if (max !== undefined && (Number(t.daily[field]) || 0) >= max) return false;
  await flush();                       // 보기값과 저장값을 먼저 맞춘다
  const date = t.daily.date;
  try {
    const r = await claimDailyCount(date, field, max);
    adoptSaved(date, r.daily);
    return r.won;
  } catch (e) {
    if (strict) return false; // 저장이 안 됐으면 못 쓴 것으로 — 상한을 넘기느니 한 번 덜 나오는 쪽
    if (max !== undefined && (Number(t.daily[field]) || 0) >= max) return false;
    bump(field);
    return true;
  }
}

/** 콘텐츠를 열 때: 기록 로드 + 세션 시작 */
export async function open(item) {
  await close();
  t.item = item;
  t.stats = await getSentenceStats(item.id).catch(() => new Map());
  t.dirty = new Set();
  t.session = {
    id: `${Date.now()}-${item.id}`, itemId: item.id, title: item.title,
    startedAt: Date.now(), endedAt: null, seconds: 0, sentences: 0, _keys: new Set(),
    firstIdx: null, lastIdx: null, speakAttempts: 0, speakPass: 0, puzzles: 0, puzzleSolved: 0,
    reviews: 0, reviewPass: 0,
  };
  await ensureDaily();
  t.flushTimer = setInterval(() => { flush(); }, 5000);
}

/** 문장 하나를 끝까지 재생함 */
export function play(cue, idx) {
  const r = rec(cue); if (!r) return;
  r.plays++;
  if (t.session) {
    t.session._keys.add(r.key);
    t.session.sentences = t.session._keys.size;
    if (t.session.firstIdx === null || idx < t.session.firstIdx) t.session.firstIdx = idx;
    if (t.session.lastIdx === null || idx > t.session.lastIdx) t.session.lastIdx = idx;
  }
}

/** 듣기 먼저: 영어 안 보고 한 번 다 들음 */
export function listen(cue) {
  const r = rec(cue); if (!r) return;
  r.listens++;
}

/** 문장을 "했다"고 인정 (영어 공개 상태로 끝까지 들음) → 진행률·오늘 목표에 반영 */
export function done(cue) {
  const r = rec(cue); if (!r) return;
  r.done = true;
  // 🔁 처음 "한" 문장은 내일부터 복습 큐에 들어간다
  // (이미 복습 중인 문장이나 👑 졸업한 문장의 진도는 건드리지 않음)
  if (!r.dueAt && (r.box || 0) < GRADUATED) Object.assign(r, enroll(todayKey()));
  if (t.daily && !t.daily.doneKeys.includes(r.key)) {
    t.daily.doneKeys.push(r.key);
    t.dailyDelta.doneKeys.push(r.key);
  }
}

/**
 * 🔁 복습 문장 하나를 끝냈을 때 (passed: 따라 말하기 통과 여부)
 * 다음 복습 날짜를 다시 잡고, 오늘 복습한 문장 수를 센다.
 */
export function review(cue, passed) {
  const r = rec(cue); if (!r) return null;
  r.reviews = (r.reviews || 0) + 1;
  if (passed) r.reviewPass = (r.reviewPass || 0) + 1;
  Object.assign(r, schedule(r.box || 0, passed, todayKey()));
  r.reviewedAt = Date.now(); // 백업 병합에서 "어느 쪽이 최신 복습인지" 판단하는 기준 (db.mergeStatRecord)
  if (t.session) {
    t.session.reviews = (t.session.reviews || 0) + 1;
    if (passed) t.session.reviewPass = (t.session.reviewPass || 0) + 1;
  }
  bump('reviewSentences');
  bump('reviewItems');
  return { box: r.box, dueAt: r.dueAt, graduated: r.box >= GRADUATED };
}

/**
 * 🎯 따라 말할 때 못 말한 단어 (소문자 기준으로 누적).
 * 자주 놓치는 소리를 부모가 볼 수 있게 — 문장 기록 안에 { 단어: 횟수 }로 둔다.
 */
export function missedWords(cue, words) {
  const r = rec(cue); if (!r || !words || !words.length) return;
  if (!r.missed) r.missed = {};
  for (const w of words) {
    const k = String(w).toLowerCase().replace(/[^a-z0-9']+/g, '');
    if (!k) continue;
    // 일반 객체라 'constructor' 같은 단어는 상속 속성이 잡힌다 → 내 속성이고 숫자일 때만 더한다
    const cur = Object.prototype.hasOwnProperty.call(r.missed, k) ? r.missed[k] : 0;
    r.missed[k] = (Number.isFinite(cur) ? cur : 0) + 1;
  }
}

/**
 * 🔤 복습의 단어 문항을 하나 끝냈을 때 — 회차 진행 수만 센다.
 * (문장 수와 따로 세지 않으면, 단어를 푼 회차는 다음번에 짧아지고 완주 보상이 또 나간다 — Codex #1)
 */
export function reviewWord() {
  bump('reviewItems');
}

/** 오늘 복습에서 끝낸 문항 수 (문장 + 단어) */
export function todayReviewItems() {
  return t.daily ? (t.daily.reviewItems || 0) : 0;
}

/** 현재 콘텐츠의 문장 기록 전부 (복습 대상 고르기·현황 표시용) */
export function statsList() {
  return [...t.stats.values()];
}

/**
 * 이 문장의 기록을 **있으면만** 돌려준다 (없으면 null — rec()과 달리 새로 만들지 않는다).
 * 화면을 그리며 "이 문장을 이미 끝냈나"를 물어볼 때 쓴다. rec()을 쓰면 묻기만 해도
 * 빈 기록이 생겨 저장 대상이 늘어난다.
 */
export function statFor(cue) {
  if (!t.item || !cue) return null;
  return t.stats.get(sentenceKey(t.item.id, cue.start)) || null;
}

/**
 * 💖 내 문장 고르기/빼기 (2026-10-01). 켜고 끄는 값이라 백업 병합은 나중에 누른 쪽(favAt)을 한 쌍으로 가져온다 (db.mergeStatRecord).
 * @returns {boolean} 바꾼 뒤 값
 */
export function setFav(cue, on) {
  const r = rec(cue); if (!r) return false;
  r.fav = !!on;
  r.favAt = Date.now();
  return r.fav;
}

/**
 * ✍️ 이 문장이 에세이 문장으로 화면에 떴다 (2026-10-06) — 한 번 나온 문장은 다시 안 낸다 (essay.pickPrompts).
 * 에세이 문장은 이미 끝낸(done) 문장이라 기록이 있다 · lastAt은 안 바꾼다(문장을 다시 들은 게 아니다) · 백업 병합은 max
 */
export function essayShown(cue) {
  if (!t.item || !cue) return;
  const key = sentenceKey(t.item.id, cue.start);
  const r = t.stats.get(key);
  if (!r) return;
  r.essayAt = Date.now();
  t.dirty.add(key);
}

/** 💖 이 문장을 골랐나 (기록을 새로 만들지 않는다 — 화면을 그리며 묻는 용도) */
export function isFav(cue) {
  const r = statFor(cue);
  return !!(r && r.fav);
}

/** 💖 복습에 덤으로 나온 내 문장을 풀었다 — 오늘 또 덤으로 안 나오게 날짜만 (복습 일정·회차 길이는 그대로) */
export function favPractice(cue) {
  const r = rec(cue); if (!r) return;
  r.favDay = todayKey();
}

/**
 * 💖 덤 문장의 ⚡💰를 오늘 이 문장으로 받을 자리를 트랜잭션으로 선점 — 두 창이 같은 덤을 내도 한쪽만 (Codex 20차 #4).
 * 저장이 막히면 메모리로 (한 창 안에서는 두 번 안 준다).
 * @returns {Promise<boolean>}
 */
export async function claimFavExtra(cue) {
  if (!t.daily || !t.item || !cue) return false;
  const key = sentenceKey(t.item.id, cue.start);
  const date = t.daily.date;
  try {
    const r = await claimDailyKey(date, 'favExtraKeys', key);
    adoptSaved(date, r.daily);
    return r.won;
  } catch (e) {
    const have = Array.isArray(t.daily.favExtraKeys) ? t.daily.favExtraKeys : [];
    if (have.includes(key)) return false;
    t.daily.favExtraKeys = [...have, key];
    return true;
  }
}

/** 말하기 확인 결과 */
/**
 * 🎤 이 문장의 말하기 보상을 오늘 이미 줬는지 / 주는 것으로 표시.
 * ◀▶로 문장을 옮겼다 돌아오면 말하기 확인이 다시 켜지므로(resetSentenceState),
 * 막지 않으면 왔다 갔다 하며 코인을 무한히 벌 수 있다 — 문장 완료 코인과 같은 규칙으로.
 * 되돌아가 다시 말하는 것 자체는 좋은 연습이라 막지 않고, **코인·XP만** 하루 한 번으로 둔다.
 * @returns {boolean} 이번에 처음이면 true
 */
export function claimSpeakReward(cue) {
  const r = rec(cue); if (!r) return false;
  const today = todayKey();
  if (r.speakPaidAt === today) return false;
  r.speakPaidAt = today;
  return true;
}

export function speak(cue, result) {
  const r = rec(cue); if (!r) return;
  r.speakAttempts++;
  if (t.session) t.session.speakAttempts++;
  bump('speakAttempts');
  if (result.skipped) r.speakSkipped++;
  else if (result.passed) {
    r.speakPass++;
    if (t.session) t.session.speakPass++;
    bump('speakPass');
  } else r.speakFail++;
  if (result.score && result.score.total) {
    r.lastRatio = result.score.ratio;
    if (result.score.ratio > r.bestRatio) r.bestRatio = result.score.ratio;
  }
}

/**
 * 🎤 "한 번 더 정확히 읽기" 결과 — **연습 반복이라 시도·통과 횟수에는 넣지 않는다**.
 * 더 잘 읽었으면 ⭐ 정복 기준(bestRatio)만 올려 준다.
 */
export function rereadScore(cue, score) {
  const r = rec(cue); if (!r || !score || !score.total) return;
  r.lastRatio = score.ratio;
  if (score.ratio > r.bestRatio) r.bestRatio = score.ratio;
}

/** 🧩 문장 퍼즐 결과 (solved: 3번 안에 맞춤, wrong: 틀린 횟수). 옛 기록에는 필드가 없을 수 있어 || 0 */
export function puzzle(cue, result) {
  const r = rec(cue); if (!r) return;
  const solved = !!(result && result.solved);
  r.puzzles = (r.puzzles || 0) + 1;
  r.puzzleSolved = (r.puzzleSolved || 0) + (solved ? 1 : 0);
  r.puzzleWrong = (r.puzzleWrong || 0) + ((result && result.wrong) || 0);
  if (t.session) { t.session.puzzles++; if (solved) t.session.puzzleSolved++; }
  bump('puzzles');
  if (solved) bump('puzzleSolved');
}

/** 학습 시간 누적 (초) — 재생 중이거나 따라 말하는 중일 때 1초마다 호출 */
export function tick(cue, sec = 1) {
  const r = rec(cue); if (!r) return;
  r.seconds += sec;
  if (t.session) t.session.seconds += sec;
  bump('seconds', sec);
}

/** 단어 패널에 보인 단어 기록 (tapped: 아이가 직접 눌러 펼침) */
export function vocab(cue, items, tapped) {
  if (!items || !items.length) return;
  const entries = items.map((it) => ({ term: it.term, meaning: it.meaning, kind: it.kind, sentence: cue ? cue.en : '' }));
  bumpVocabViews(entries, tapped).catch(() => {});
}

/** 현재 콘텐츠의 문장이 ⭐(정복)인지 */
export function isMastered(cue) {
  if (!t.item || !cue) return false;
  const r = t.stats.get(sentenceKey(t.item.id, cue.start));
  return !!(r && r.bestRatio >= MASTER_RATIO);
}

/** 현재 콘텐츠에서 "한" 문장 수 */
export function doneCount() {
  let n = 0;
  for (const r of t.stats.values()) if (r.done) n++;
  return n;
}

/** 오늘 한 문장 수 (모든 콘텐츠 합산) */
export function todayDone() {
  return t.daily ? t.daily.doneKeys.length : 0;
}

/** 🍄 오늘 얻은 다이버섯 수 / 하나 얻었다고 기록 (하루 상한용) */
export function todayMushrooms() {
  return t.daily ? (t.daily.mushrooms || 0) : 0;
}
/** @returns {Promise<boolean>} 오늘 몫이 남아 있어서 내가 받았는지 */
export function markMushroom(max) {
  return claim('mushrooms', max);
}

/** 오늘 공부한 시간(초) — ✍️ 에세이가 열리는 기준 */
export function todaySeconds() {
  return t.daily ? (t.daily.seconds || 0) : 0;
}

/** ✍️ 오늘 에세이를 이미 썼는지 */
export function essayDoneToday() {
  return !!(t.daily && t.daily.essayDone);
}

/**
 * ✍️ 문장 하나를 쓴 즉시 저장한다 — 중간에 그만둬도 아이 글이 사라지지 않게.
 * @returns {boolean} 이 문장의 보상을 처음 주는지 (같은 문장을 다시 써도 보상은 한 번만)
 */
export function markEssayWritten(entry) {
  if (!t.daily || !entry) return false;
  t.daily.essays = t.daily.essays || [];
  t.dailyDelta.essays.push(entry); // 글은 id로 합쳐 저장 (다른 창이 쓴 글도 남음)
  const at = t.daily.essays.findIndex((e) => e && e.id && e.id === entry.id);
  // 저장소(mergeDailyDelta)와 같은 규칙으로 화면 사본도 (아니면 아빠 교정이 화면에서만 사라지거나 남는다) — 글이 바뀌면 옛 교정은 지운다
  if (at >= 0) { t.daily.essays[at] = mergeEssayEntry(t.daily.essays[at], entry); return false; } // 다시 쓴 것 → 글은 갱신, 보상은 없음
  t.daily.essays.push(entry);
  return true;
}

/** ✍️ 오늘 이미 쓴 글의 id — 쓸 문장을 다 쓴 뒤에도 같은 날 같은 문장을 다시 내지 않게 (Codex 35차 #4) */
export function todayEssayIds() {
  return new Set(((t.daily && t.daily.essays) || []).filter((e) => e && e.id && e.written).map((e) => e.id));
}

/** ✍️ 오늘 몫을 전부 썼다고 기록 → 완주 보상은 하루 1번 (@returns 내가 선점했는지) */
export function markEssayDone() {
  return claim('essayDone', 1);
}

/** 오늘 푼 퍼즐 수 (모든 콘텐츠 합산) */
export function todayPuzzles() {
  return t.daily ? (t.daily.puzzles || 0) : 0;
}

/**
 * 👋 종료 인사 화면에 보여줄 오늘 한 줄 요약. 오늘 한 게 없으면 빈 문자열.
 * 라이브러리 화면에서는 track이 열려 있지 않으므로 daily 레코드를 직접 받는 순수 함수로 둔다.
 */
export function byeSummary(daily) {
  if (!daily) return '';
  const parts = [];
  const done = (daily.doneKeys || []).length;
  if (done) parts.push(`문장 ${done}개`);
  if (daily.reviewSentences) parts.push(`🔁 복습 ${daily.reviewSentences}개`);
  if (daily.puzzles) parts.push(`🧩 퍼즐 ${daily.puzzles}개`);
  const min = Math.round((daily.seconds || 0) / 60);
  if (min) parts.push(`⏱ ${min}분`);
  if (!parts.length) return '';
  return `오늘 ${parts.join(' · ')}`;
}

/** 오늘 목표 보너스를 이미 받았는지 / 받았다고 표시 (목표 수치를 바꿔도 하루 한 번만) */
export function goalRewarded() {
  return !!(t.daily && t.daily.goalRewarded);
}
/** @returns {Promise<boolean>} 목표 보너스를 내가 선점했는지 */
export function markGoalRewarded() {
  return claim('goalRewarded', 1);
}

/** ⚔️ 오늘 배틀 횟수 / 오늘 배틀 한 자리를 선점 (하루 상한) */
export function todayBattles() {
  return t.daily ? (t.daily.battles || 0) : 0;
}
export function markBattle(max) {
  return claim('battles', max, true); // 🔢 수학과 같은 칸을 쓴다 — 실패하면 안 쓴 것으로 (Codex 9차 #9)
}

/** 🚀 오늘 영어에서 로켓단이 나온 수 (영어 하루 3번 — 수학은 rocketMath를 따로 센다, 아버님 결정) */
export function todayRocketsEn() {
  return t.daily ? (Number(t.daily.rocketEn) || 0) : 0;
}
/**
 * 🚀 영어 로켓단 시작 — 오늘 몫(rocketEn)과 배틀 기록을 **한 트랜잭션**에서 (admit = xp.rocketAdmit, Codex 43차 #3).
 * 예전엔 몫을 먼저 선점(claim)하고 배틀 기록을 따로 저장해, 진행 중인 배틀이 있거나 저장이 안 되면 몫만 사라졌다.
 * 몫은 새 배틀을 열 때만 쓰인다 — 열면 저장된 오늘 기록을 받아 보기값을 맞춘다
 * @param {(date:string, field:string, max:number) => Promise<{ok:boolean, why?:string, cur:object|null, daily?:object}>} admit
 */
export async function admitRocketEn(max, admit) {
  if (!t.daily || (Number(t.daily.rocketEn) || 0) >= max) return { ok: false, why: 'cap', cur: null };
  await flush();                       // 보기값과 저장값을 먼저 맞춘다 (claim과 같다)
  const date = t.daily.date;
  const r = await admit(date, 'rocketEn', max);
  if (r && r.ok) adoptSaved(date, r.daily);
  return r || { ok: false, why: 'save', cur: null };
}

/** 🔤 오늘 단어 이어 주기를 몇 판 했는지 / 한 판 선점 (하루 상한) */
export function todayMatches() {
  return t.daily ? (t.daily.matches || 0) : 0;
}
export function markMatch(max) {
  return claim('matches', max);
}

/** 🔁 오늘 복습한 문장 수 / 완주한 회차 수 (모든 콘텐츠 합산) */
export function todayReviewSentences() {
  return t.daily ? (t.daily.reviewSentences || 0) : 0;
}
export function todayReviewRounds() {
  return t.daily ? (t.daily.reviewRounds || 0) : 0;
}
export function markReviewRound() {
  bump('reviewRounds');
}

/** 🔁 오늘 복습 제안을 몇 번 건너뛰었는지 (너무 자주 묻지 않기 위해) */
export function todayReviewSkips() {
  return t.daily ? (t.daily.reviewSkips || 0) : 0;
}
export function markReviewSkip() {
  bump('reviewSkips');
}

/**
 * 🌟 황금 몬스터볼을 오늘 이미 받았는지 / 받았다고 표시.
 * daily(날짜 단위 전역)에 두어야 콘텐츠를 바꿔가며 여러 번 받는 것을 막는다.
 */
export function reviewGoldenTaken() {
  return !!(t.daily && t.daily.reviewGolden);
}
/** @returns {Promise<boolean>} 오늘 황금 볼을 내가 선점했는지 */
export function markReviewGolden() {
  return claim('reviewGolden', 1);
}
/** 🔶 복습 영어스톤을 받을 수 있는 회차 — 하루에 */
export const REVIEW_STONE_ROUNDS = 2;
/** 🔶 오늘 복습 영어스톤을 더 받을 수 있는 회차 수 (화면 안내용 — 실제 판정은 claimReviewStone의 트랜잭션) */
export function reviewStoneRoundsLeft() {
  const have = t.daily && Array.isArray(t.daily.reviewStoneKeys) ? t.daily.reviewStoneKeys.length : 0;
  return Math.max(0, REVIEW_STONE_ROUNDS - have);
}
/**
 * 🔶 영어스톤 — 복습 회차를 전부 통과했거나 받아쓰기·단어를 다 맞혔을 때, **그 회차(문장 묶음)당 한 번**, 하루 2회차까지 (두 창이 같은 회차를 끝내도 한쪽만, Codex 7차 #6).
 * @param {string} roundKey 회차의 문장 열쇠 묶음
 * @returns {Promise<boolean>}
 */
export async function claimReviewStone(roundKey) {
  if (!t.daily) return false;
  await flush();
  const date = t.daily.date;
  try {
    const r = await claimDailyKey(date, 'reviewStoneKeys', String(roundKey || ''), REVIEW_STONE_ROUNDS);
    adoptSaved(date, r.daily);
    return r.won;
  } catch (e) {
    const have = Array.isArray(t.daily.reviewStoneKeys) ? t.daily.reviewStoneKeys : [];
    if (have.includes(roundKey) || have.length >= REVIEW_STONE_ROUNDS) return false;
    t.daily.reviewStoneKeys = [...have, roundKey];
    return true;
  }
}

/** ❤️ "어제 학습 안 함" HP 감소를 오늘 이미 적용했는지 / 적용할 자리를 선점 (하루 한 번) */
export function hpMissedApplied() {
  return !!(t.daily && t.daily.hpMissed);
}
export function markHpMissed() {
  return claim('hpMissed', 1);
}

/** 저장 대기 중인 것을 IndexedDB에 씀 */
export let lastFlushError = null;

export async function flush() {
  const keys = [...t.dirty];
  const recs = keys.map((k) => t.stats.get(k)).filter(Boolean);
  t.dirty = new Set();
  const jobs = [];
  if (recs.length) {
    // 실패하면 다시 대기 목록에 넣어 다음 flush에서 재시도
    jobs.push(putSentenceStats(recs).catch((e) => { keys.forEach((k) => t.dirty.add(k)); throw e; }));
  }
  if (t.session && t.session.seconds > 0) {
    const s = { ...t.session };
    delete s._keys;
    jobs.push(putSession(s));
  }
  // 오늘 기록은 **늘어난 만큼만** 더해 쓴다 — 다른 창이 쓴 공부 시간·문장이 지워지지 않게
  if (t.daily && !deltaEmpty(t.dailyDelta)) {
    const date = t.daily.date;
    const sent = t.dailyDelta;
    t.dailyDelta = emptyDelta();
    jobs.push(applyDailyDelta(date, sent).then(
      // 저장 결과(다른 창 몫까지 합쳐진 값) + 그 사이 또 쌓인 증분 = 지금 보여줄 값
      (saved) => adoptSaved(date, saved),
      (e) => {
        // 실패하면 보낸 증분에 그 사이 쌓인 것을 합쳐 되돌린다 (다음 flush에서 재시도).
        // 합치는 규칙은 저장할 때와 같은 것을 써야 한다 — 손으로 다시 짜면 doneKeys 중복·essays 중복이 생긴다
        t.dailyDelta = mergeDailyDelta(sent, date, t.dailyDelta);
        throw e;
      },
    ));
  }
  const results = await Promise.all(jobs.map((p) => p.then(() => null, (e) => e)));
  const err = results.find(Boolean);
  lastFlushError = err || null;
  if (err) console.warn('기록 저장 실패 (다음에 재시도):', err);
}

/** 가져오기 뒤: 메모리의 오늘 기록을 버리고 저장소에서 다시 읽음 */
export async function reloadDaily() {
  t.daily = null;
  t.dailyDelta = emptyDelta();
  if (t.item) await ensureDaily();
}

/** 콘텐츠를 닫을 때: 세션 마감 + 저장 */
export async function close() {
  if (t.flushTimer) { clearInterval(t.flushTimer); t.flushTimer = null; }
  if (t.session) t.session.endedAt = Date.now();
  await flush();
  t.item = null;
  t.session = null;
  t.stats = new Map();
}
