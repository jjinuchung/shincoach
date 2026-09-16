// 학습 기록 수집: 플레이어에서 일어나는 일(재생, 듣기, 말하기 결과, 시간, 단어 조회)을 문장별/세션별/일별로 누적
// 메모리에 모았다가 5초마다·닫을 때 IndexedDB에 저장 (문장마다 쓰지 않도록)
import {
  sentenceKey, getSentenceStats, putSentenceStats, putSession, getDaily, putDaily, bumpVocabViews,
} from './db.js';
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
  daily: null,
  dailyDirty: false,
  flushTimer: null,
};

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

/** 자정을 넘겼으면 어제 기록을 저장하고 오늘 기록으로 바꿈 (동기; 오늘 기록이 이미 있으면 뒤에서 합침) */
function rollDailyIfNeeded() {
  const key = todayKey();
  if (!t.daily || t.daily.date === key) return;
  const old = t.daily;
  putDaily(old).catch(() => {});
  t.daily = { date: key, doneKeys: [], seconds: 0, speakAttempts: 0, speakPass: 0, puzzles: 0, puzzleSolved: 0, goalRewarded: false };
  t.dailyDirty = false;
  getDaily(key).then((existing) => {
    if (!existing || !t.daily || t.daily.date !== key) return;
    t.daily.doneKeys = [...new Set([...existing.doneKeys, ...t.daily.doneKeys])];
    t.daily.seconds += existing.seconds || 0;
    t.daily.speakAttempts += existing.speakAttempts || 0;
    t.daily.speakPass += existing.speakPass || 0;
    t.daily.puzzles += existing.puzzles || 0;
    t.daily.puzzleSolved += existing.puzzleSolved || 0;
    t.daily.goalRewarded = !!(t.daily.goalRewarded || existing.goalRewarded);
    t.daily.hpMissed = !!(t.daily.hpMissed || existing.hpMissed);
    t.daily.battles = (t.daily.battles || 0) + (existing.battles || 0);
    t.daily.reviewSentences = (t.daily.reviewSentences || 0) + (existing.reviewSentences || 0);
    t.daily.reviewItems = (t.daily.reviewItems || 0) + (existing.reviewItems || 0);
    t.daily.reviewRounds = (t.daily.reviewRounds || 0) + (existing.reviewRounds || 0);
    t.daily.reviewGolden = !!(t.daily.reviewGolden || existing.reviewGolden);
    t.daily.reviewSkips = (t.daily.reviewSkips || 0) + (existing.reviewSkips || 0);
    t.daily.essayDone = !!(t.daily.essayDone || existing.essayDone);
    t.daily.essays = [...(t.daily.essays || []), ...(existing.essays || [])];
    t.dailyDirty = true;
  }).catch(() => {});
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
  if (t.daily && t.dailyDirty) { await putDaily(t.daily).catch(() => {}); }
  t.daily = (await getDaily(key).catch(() => null)) || { date: key, doneKeys: [], seconds: 0, speakAttempts: 0, speakPass: 0, puzzles: 0, puzzleSolved: 0, goalRewarded: false };
  t.dailyDirty = false;
  return t.daily;
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
  if (t.daily && !t.daily.doneKeys.includes(r.key)) { t.daily.doneKeys.push(r.key); t.dailyDirty = true; }
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
  if (t.daily) {
    t.daily.reviewSentences = (t.daily.reviewSentences || 0) + 1;
    t.daily.reviewItems = (t.daily.reviewItems || 0) + 1;
    t.dailyDirty = true;
  }
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
  if (!t.daily) return;
  t.daily.reviewItems = (t.daily.reviewItems || 0) + 1;
  t.dailyDirty = true;
}

/** 오늘 복습에서 끝낸 문항 수 (문장 + 단어) */
export function todayReviewItems() {
  return t.daily ? (t.daily.reviewItems || 0) : 0;
}

/** 현재 콘텐츠의 문장 기록 전부 (복습 대상 고르기·현황 표시용) */
export function statsList() {
  return [...t.stats.values()];
}

/** 말하기 확인 결과 */
export function speak(cue, result) {
  const r = rec(cue); if (!r) return;
  r.speakAttempts++;
  if (t.session) t.session.speakAttempts++;
  if (t.daily) { t.daily.speakAttempts++; t.dailyDirty = true; }
  if (result.skipped) r.speakSkipped++;
  else if (result.passed) {
    r.speakPass++;
    if (t.session) t.session.speakPass++;
    if (t.daily) t.daily.speakPass++;
  } else r.speakFail++;
  if (result.score && result.score.total) {
    r.lastRatio = result.score.ratio;
    if (result.score.ratio > r.bestRatio) r.bestRatio = result.score.ratio;
  }
}

/** 🧩 문장 퍼즐 결과 (solved: 3번 안에 맞춤, wrong: 틀린 횟수). 옛 기록에는 필드가 없을 수 있어 || 0 */
export function puzzle(cue, result) {
  const r = rec(cue); if (!r) return;
  const solved = !!(result && result.solved);
  r.puzzles = (r.puzzles || 0) + 1;
  r.puzzleSolved = (r.puzzleSolved || 0) + (solved ? 1 : 0);
  r.puzzleWrong = (r.puzzleWrong || 0) + ((result && result.wrong) || 0);
  if (t.session) { t.session.puzzles++; if (solved) t.session.puzzleSolved++; }
  if (t.daily) {
    t.daily.puzzles = (t.daily.puzzles || 0) + 1;
    t.daily.puzzleSolved = (t.daily.puzzleSolved || 0) + (solved ? 1 : 0);
    t.dailyDirty = true;
  }
}

/** 학습 시간 누적 (초) — 재생 중이거나 따라 말하는 중일 때 1초마다 호출 */
export function tick(cue, sec = 1) {
  const r = rec(cue); if (!r) return;
  r.seconds += sec;
  if (t.session) t.session.seconds += sec;
  if (t.daily) { t.daily.seconds += sec; t.dailyDirty = true; }
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
  t.dailyDirty = true;
  const at = t.daily.essays.findIndex((e) => e && e.id && e.id === entry.id);
  if (at >= 0) { t.daily.essays[at] = entry; return false; } // 다시 쓴 것 → 글은 갱신, 보상은 없음
  t.daily.essays.push(entry);
  return true;
}

/** ✍️ 오늘 몫을 전부 썼다고 기록 (완주 보상은 하루 1번) */
export function markEssayDone() {
  if (!t.daily) return;
  t.daily.essayDone = true;
  t.dailyDirty = true;
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
export function markGoalRewarded() {
  if (!t.daily) return;
  t.daily.goalRewarded = true;
  t.dailyDirty = true;
}

/** ⚔️ 오늘 배틀 횟수 / 배틀 했다고 표시 (하루 상한용) */
export function todayBattles() {
  return t.daily ? (t.daily.battles || 0) : 0;
}
export function markBattle() {
  if (!t.daily) return;
  t.daily.battles = (t.daily.battles || 0) + 1;
  t.dailyDirty = true;
}

/** 🔁 오늘 복습한 문장 수 / 완주한 회차 수 (모든 콘텐츠 합산) */
export function todayReviewSentences() {
  return t.daily ? (t.daily.reviewSentences || 0) : 0;
}
export function todayReviewRounds() {
  return t.daily ? (t.daily.reviewRounds || 0) : 0;
}
export function markReviewRound() {
  if (!t.daily) return;
  t.daily.reviewRounds = (t.daily.reviewRounds || 0) + 1;
  t.dailyDirty = true;
}

/** 🔁 오늘 복습 제안을 몇 번 건너뛰었는지 (너무 자주 묻지 않기 위해) */
export function todayReviewSkips() {
  return t.daily ? (t.daily.reviewSkips || 0) : 0;
}
export function markReviewSkip() {
  if (!t.daily) return;
  t.daily.reviewSkips = (t.daily.reviewSkips || 0) + 1;
  t.dailyDirty = true;
}

/**
 * 🌟 황금 몬스터볼을 오늘 이미 받았는지 / 받았다고 표시.
 * daily(날짜 단위 전역)에 두어야 콘텐츠를 바꿔가며 여러 번 받는 것을 막는다.
 */
export function reviewGoldenTaken() {
  return !!(t.daily && t.daily.reviewGolden);
}
export function markReviewGolden() {
  if (!t.daily) return;
  t.daily.reviewGolden = true;
  t.dailyDirty = true;
}

/** ❤️ "어제 학습 안 함" HP 감소를 오늘 이미 적용했는지 / 적용했다고 표시 (하루 한 번) */
export function hpMissedApplied() {
  return !!(t.daily && t.daily.hpMissed);
}
export function markHpMissed() {
  if (!t.daily) return;
  t.daily.hpMissed = true;
  t.dailyDirty = true;
}

/** 저장 대기 중인 것을 IndexedDB에 씀 */
export let lastFlushError = null;

export async function flush() {
  const keys = [...t.dirty];
  const recs = keys.map((k) => t.stats.get(k)).filter(Boolean);
  t.dirty = new Set();
  const wasDailyDirty = t.dailyDirty;
  t.dailyDirty = false;
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
  if (t.daily && wasDailyDirty) {
    jobs.push(putDaily(t.daily).catch((e) => { t.dailyDirty = true; throw e; }));
  }
  const results = await Promise.all(jobs.map((p) => p.then(() => null, (e) => e)));
  const err = results.find(Boolean);
  lastFlushError = err || null;
  if (err) console.warn('기록 저장 실패 (다음에 재시도):', err);
}

/** 가져오기 뒤: 메모리의 오늘 기록을 버리고 저장소에서 다시 읽음 */
export async function reloadDaily() {
  t.daily = null;
  t.dailyDirty = false;
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
