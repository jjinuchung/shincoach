// 학습 기록 수집: 플레이어에서 일어나는 일(재생, 듣기, 말하기 결과, 시간, 단어 조회)을 문장별/세션별/일별로 누적
// 메모리에 모았다가 5초마다·닫을 때 IndexedDB에 저장 (문장마다 쓰지 않도록)
import {
  sentenceKey, getSentenceStats, putSentenceStats, putSession, getDaily, putDaily, bumpVocabViews,
} from './db.js';

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
  if (t.daily && !t.daily.doneKeys.includes(r.key)) { t.daily.doneKeys.push(r.key); t.dailyDirty = true; }
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

/** 오늘 푼 퍼즐 수 (모든 콘텐츠 합산) */
export function todayPuzzles() {
  return t.daily ? (t.daily.puzzles || 0) : 0;
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
