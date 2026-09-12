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
  };
}

function rec(cue) {
  if (!t.item || !cue) return null;
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
  t.daily = (await getDaily(key).catch(() => null)) || { date: key, doneKeys: [], seconds: 0, speakAttempts: 0, speakPass: 0 };
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
    firstIdx: null, lastIdx: null, speakAttempts: 0, speakPass: 0,
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

/** 저장 대기 중인 것을 IndexedDB에 씀 */
export async function flush() {
  const recs = [...t.dirty].map((k) => t.stats.get(k)).filter(Boolean);
  t.dirty = new Set();
  const jobs = [];
  if (recs.length) jobs.push(putSentenceStats(recs));
  if (t.session && t.session.seconds > 0) {
    const s = { ...t.session };
    delete s._keys;
    jobs.push(putSession(s));
  }
  if (t.daily && t.dailyDirty) { t.dailyDirty = false; jobs.push(putDaily(t.daily)); }
  await Promise.all(jobs.map((p) => p.catch((e) => console.warn('기록 저장 실패:', e))));
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
