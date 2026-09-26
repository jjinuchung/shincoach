// IndexedDB 저장소: 영상(Blob) + 자막 텍스트 + 진행 상태
// items 스토어: 메타데이터(제목, 자막, 진행) / blobs 스토어: 영상 Blob (목록 조회 시 무거운 Blob을 안 읽기 위해 분리)

import { activeEgg, eggRule, eggSeenRule } from './egg.js'; // 🥚 알 규칙 (순수) — egg.js는 아무것도 import하지 않는다 (순환 없음)
import { normThrows } from './mathprog.js'; // 🎯 던지기 카운터 정규화 (mathprog·그 아래 모듈은 db를 import하지 않는다 — 순환 없음)
import { canEvolve, capReason, haveOf, lvOf, nextCost } from './evolve.js'; // 🧬 레벨업·진화 규칙 (순수) — evolve.js도 아무것도 import하지 않는다
const DB_NAME = 'shincoach';
const DB_VERSION = 4;

// 학습 기록 스토어 (v2에서 추가)
//  sentenceStats: 문장별 누적 { key: "<itemId>|<start×10>", itemId, start, en, ko, plays, listens, done, seconds,
//                 speakAttempts, speakPass, speakFail, speakSkipped, bestRatio, lastRatio, lastAt, puzzles, puzzleSolved, puzzleWrong }
//  sessions:      앱을 열고 닫은 단위 { id, itemId, title, startedAt, endedAt, seconds, sentences, firstIdx, lastIdx, speakAttempts, speakPass, puzzles, puzzleSolved }
//  daily:         날짜별 { date: "YYYY-MM-DD", doneKeys: [문장 key...], seconds, speakAttempts, speakPass, puzzles, puzzleSolved, goalRewarded, hpMissed }
//  vocabViews:    아이가 단어 패널에서 본 단어 { word, meaning, kind, views, taps, lastAt, sentence }
// characters (v3): 🎮 퍼즐 캐릭터 그림 { id, ko, en, blob, savedAt } — 인터넷에서 받아 기기에만 보관 (백업에 포함 안 함)
//  profile (v4):  ⚡ 아이 프로필 { id: 'me', xp, caught: { 포켓몬id: 마릿수 }, throws, catches,
//                 coins, coinsEarned, items: { 아이템id: 개수 }, mons: { 포켓몬id: { gear, dye, hp, losses } }, partner, updatedAt } — 백업에 포함
const STAT_STORES = ['sentenceStats', 'sessions', 'daily', 'vocabViews', 'profile'];

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('items')) {
        const items = db.createObjectStore('items', { keyPath: 'id' });
        items.createIndex('createdAt', 'createdAt');
      }
      if (!db.objectStoreNames.contains('blobs')) {
        db.createObjectStore('blobs', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('sentenceStats')) {
        const st = db.createObjectStore('sentenceStats', { keyPath: 'key' });
        st.createIndex('itemId', 'itemId');
      }
      if (!db.objectStoreNames.contains('sessions')) {
        const ss = db.createObjectStore('sessions', { keyPath: 'id' });
        ss.createIndex('startedAt', 'startedAt');
      }
      if (!db.objectStoreNames.contains('daily')) {
        db.createObjectStore('daily', { keyPath: 'date' });
      }
      if (!db.objectStoreNames.contains('vocabViews')) {
        db.createObjectStore('vocabViews', { keyPath: 'word' });
      }
      if (!db.objectStoreNames.contains('characters')) {
        db.createObjectStore('characters', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('profile')) {
        db.createObjectStore('profile', { keyPath: 'id' });
      }
    };
    // 다른 탭/옛 버전 앱이 DB를 잡고 있으면 업그레이드가 대기 상태에 빠짐 → 사용자에게 안내
    req.onblocked = () => {
      window.dispatchEvent(new CustomEvent('shincoach:dbblocked'));
    };
    req.onsuccess = () => {
      const db = req.result;
      // 새 버전 앱이 열리면 이 연결은 스스로 닫아서 업그레이드를 막지 않음
      db.onversionchange = () => { db.close(); dbPromise = null; window.dispatchEvent(new CustomEvent('shincoach:dbversionchange')); };
      resolve(db);
    };
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

/** 트랜잭션 요청을 Promise로 감싸기 */
function promisify(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 새 콘텐츠 저장
 * @param {{title:string, videoFile:File, enText:string, koText:string, duration?:number, thumb?:string}} data
 * @returns {Promise<string>} id
 */
export async function addItem({ title, videoFile, enText, koText = '', duration = 0, thumb = '' }) {
  const db = await openDb();
  const id = makeId();
  const item = {
    id,
    title,
    videoName: videoFile.name,
    videoType: videoFile.type || 'video/mp4',
    videoSize: videoFile.size,
    duration,
    thumb,
    enText,
    koText,
    lastCue: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const tx = db.transaction(['items', 'blobs'], 'readwrite');
  tx.objectStore('items').put(item);
  tx.objectStore('blobs').put({ id, blob: videoFile });
  await txDone(tx);
  return id;
}

/**
 * 전체 목록 (최신순, Blob 제외)
 *
 * ★ getAll을 쓰지 말 것 — 레코드 하나만 깨져도 요청 전체가 실패한다.
 * Chrome은 64KB가 넘는 값을 IndexedDB 옆 파일로 빼 두는데(items 레코드는 자막 전문이 들어 있어 거의 항상 넘는다),
 * 그 파일이 사라지면 NotReadableError "Data lost due to missing file"이 난다.
 * 2026-09-17 태블릿에서 영상 한 편이 이렇게 깨졌을 뿐인데 목록을 통째로 못 그려 앱이 멈췄다.
 * → 키를 먼저 읽고 한 건씩 각자 트랜잭션으로 읽는다. 깨진 것만 { broken: true }로 표시하고 나머지는 정상 동작.
 */
export async function listItems() {
  const db = await openDb();
  const keys = await promisify(db.transaction('items', 'readonly').objectStore('items').getAllKeys());
  const out = [];
  let broken = false;
  for (const id of keys) {
    try {
      const item = await promisify(db.transaction('items', 'readonly').objectStore('items').get(id));
      if (item) out.push(item);
    } catch (err) {
      console.warn('영상 정보를 읽지 못했어요:', id, err);
      broken = true;
      out.push({
        id, broken: true, errorName: (err && err.name) || '',
        title: '', enText: '', koText: '', thumb: '', duration: 0, videoSize: 0, lastCue: 0, createdAt: 0,
      });
    }
  }
  // 깨진 영상은 제목도 못 읽는다 → 세션 기록에서 되찾아 아이가 어느 영상인지 알게 한다
  if (broken) {
    const titles = await titlesFromSessions().catch(() => new Map());
    for (const it of out) if (it.broken) it.title = titles.get(String(it.id)) || '(제목을 읽지 못했어요)';
  }
  return out.sort((a, b) => b.createdAt - a.createdAt);
}

/** 세션 기록에 남은 itemId → 제목 (깨진 영상의 이름을 되찾는 용도) */
async function titlesFromSessions() {
  const db = await openDb();
  const all = await promisify(db.transaction('sessions', 'readonly').objectStore('sessions').getAll());
  const map = new Map();
  for (const s of all.sort((a, b) => a.startedAt - b.startedAt)) {
    if (s && s.itemId && s.title) map.set(String(s.itemId), s.title);
  }
  return map;
}

export async function getItem(id) {
  const db = await openDb();
  const tx = db.transaction('items', 'readonly');
  return promisify(tx.objectStore('items').get(id));
}

export async function getVideoBlob(id) {
  const db = await openDb();
  const tx = db.transaction('blobs', 'readonly');
  const rec = await promisify(tx.objectStore('blobs').get(id));
  return rec ? rec.blob : null;
}

/** 일부 필드만 갱신 (진행 위치, 제목, 자막 교체 등) */
export async function updateItem(id, patch) {
  const db = await openDb();
  const tx = db.transaction('items', 'readwrite');
  const store = tx.objectStore('items');
  const item = await promisify(store.get(id));
  if (!item) return null;
  const next = { ...item, ...patch, updatedAt: Date.now() };
  store.put(next);
  await txDone(tx);
  return next;
}

export async function deleteItem(id) {
  const db = await openDb();
  const tx = db.transaction(['items', 'blobs'], 'readwrite');
  tx.objectStore('items').delete(id);
  tx.objectStore('blobs').delete(id);
  await txDone(tx);
}

/** 저장 공간 사용량 (bytes) — 지원 안 하면 null */
export async function storageEstimate() {
  if (!navigator.storage || !navigator.storage.estimate) return null;
  try {
    return await navigator.storage.estimate();
  } catch {
    return null;
  }
}

// ───────────────────── 학습 기록 ─────────────────────

/** 문장 기록 키: 문장 합치기 설정이 바뀌어도 대체로 안정적인 "시작 시각(0.1초 단위)" 기준 */
export function sentenceKey(itemId, start) {
  return `${itemId}|${Math.round(start * 10)}`;
}

/** 한 콘텐츠의 문장 기록 전부 → Map(key → record) */
export async function getSentenceStats(itemId) {
  const db = await openDb();
  const tx = db.transaction('sentenceStats', 'readonly');
  const all = await promisify(tx.objectStore('sentenceStats').index('itemId').getAll(itemId));
  const map = new Map();
  for (const r of all) map.set(r.key, r);
  return map;
}

/** 모든 콘텐츠의 문장 기록 (대시보드용) */
export async function getAllSentenceStats() {
  const db = await openDb();
  const tx = db.transaction('sentenceStats', 'readonly');
  return promisify(tx.objectStore('sentenceStats').getAll());
}

/**
 * 문장 기록 여러 건을 한 트랜잭션으로 저장.
 * track은 콘텐츠를 열 때 읽어둔 사본을 세션 내내 고쳐 쓰므로, 그대로 put하면
 * **다른 창이 복습해 둔 진도(box·dueAt)가 통째로 사라진다** — 그 문장이 조용히 안 돌아온다.
 * 그래서 트랜잭션 안에서 최신 기록과 합친다 (백업 가져오기와 같은 규칙: mergeStatRecord).
 */
export async function putSentenceStats(records) {
  if (!records.length) return;
  const db = await openDb();
  const tx = db.transaction('sentenceStats', 'readwrite');
  const store = tx.objectStore('sentenceStats');
  for (const r of records) {
    const cur = await promisify(store.get(r.key));
    store.put(cur ? mergeStatRecord('sentenceStats', cur, r) : r);
  }
  await txDone(tx);
}

export async function putSession(session) {
  const db = await openDb();
  const tx = db.transaction('sessions', 'readwrite');
  tx.objectStore('sessions').put(session);
  await txDone(tx);
}

/** 최근 세션 (최신순, limit개) */
export async function listSessions(limit = 30) {
  const db = await openDb();
  const tx = db.transaction('sessions', 'readonly');
  const all = await promisify(tx.objectStore('sessions').getAll());
  return all.sort((a, b) => b.startedAt - a.startedAt).slice(0, limit);
}

export async function getDaily(date) {
  const db = await openDb();
  const tx = db.transaction('daily', 'readonly');
  return promisify(tx.objectStore('daily').get(date));
}

// ───────────────── 📅 오늘 기록: 증분 저장 + 하루 한 번 선점 ─────────────────
// 홈 화면 앱과 Chrome 탭을 같이 열면 각 창이 daily 사본을 들고 있다가 통째로 덮어써서
//  ① 공부한 초·문장 수가 사라지고 (나중에 저장한 창이 이김)
//  ② "하루 한 번" 보상(🌟 황금 볼·✍️ 에세이·🎯 목표·❤️ HP 벌)을 양쪽이 다 받는다.
// → 쓰기는 증분(applyDailyDelta), 하루 한 번은 **트랜잭션 안에서** 선점(claimDaily*)으로 판정한다.
//   프로필의 applyProfileDelta와 같은 원리.

const DAILY_SUMS = ['seconds', 'speakAttempts', 'speakPass', 'puzzles', 'puzzleSolved', 'battles',
  'reviewSentences', 'reviewItems', 'reviewRounds', 'reviewSkips', 'mushrooms', 'matches', 'reviewStones', // 🔶 영어스톤 — 복습 회차(전부 통과) 하루 2개까지, 트랜잭션 선점
  'mathQ', 'mathOk', 'mathRounds', 'mathSeconds']; // 🔢 수학: 푼 문항·정답·회차·시간
const DAILY_FLAGS = ['goalRewarded', 'hpMissed', 'reviewGolden', 'essayDone'];
const DAILY_LISTS = ['reviewStoneKeys']; // 🔶 영어스톤을 받은 복습 회차(문장 묶음) — 같은 회차를 두 창이 끝내도 한 번 (합집합)

/** 빈 오늘 기록 (모든 수치 0, 모든 플래그 false) */
export function emptyDaily(date) {
  const d = { date, doneKeys: [], essays: [] };
  for (const k of DAILY_SUMS) d[k] = 0;
  for (const k of DAILY_FLAGS) d[k] = false;
  return d;
}

/**
 * 저장된 오늘 기록 + 증분 → 저장할 기록 (순수 함수).
 * 수치는 더하고, 플래그는 한 번 켜지면 유지, 문장 key는 합집합, ✍️ 글은 id로 갱신·추가.
 */
export function mergeDailyDelta(cur, date, delta) {
  const out = { ...emptyDaily(date), ...(cur || {}), date };
  out.doneKeys = [...(out.doneKeys || [])];
  out.essays = [...(out.essays || [])];
  const d = delta || {};
  for (const k of DAILY_SUMS) out[k] = (Number(out[k]) || 0) + (Number(d[k]) || 0);
  for (const k of DAILY_FLAGS) out[k] = !!(out[k] || d[k]);
  for (const key of (d.doneKeys || [])) if (!out.doneKeys.includes(key)) out.doneKeys.push(key);
  for (const k of DAILY_LISTS) { out[k] = [...(out[k] || [])]; for (const key of (d[k] || [])) if (!out[k].includes(key)) out[k].push(key); }
  for (const e of (d.essays || [])) {
    if (!e || !e.id) continue;
    const at = out.essays.findIndex((x) => x && x.id === e.id);
    // 다시 쓴 글은 갱신하되, 저장된 쪽에만 있는 것(아빠 교정 coachFix·readAt)은 남긴다
    if (at >= 0) out.essays[at] = { ...out.essays[at], ...e };
    else out.essays.push(e);
  }
  return out;
}

/** 증분만 더해서 저장 (한 트랜잭션에서 최신값 읽기 → 더하기 → 쓰기). 반환: 저장된 최신 기록 */
export async function applyDailyDelta(date, delta) {
  const db = await openDb();
  const tx = db.transaction('daily', 'readwrite');
  const store = tx.objectStore('daily');
  const cur = await promisify(store.get(date));
  const next = mergeDailyDelta(cur, date, delta);
  store.put(next);
  await txDone(tx);
  return next;
}

/**
 * "하루 한 번/N번"을 선점한다 — 자리가 남아 있을 때만 +1 하고 won: true.
 * 판정이 트랜잭션 안에 있으므로 두 창이 동시에 불러도 **한 쪽만** 받는다.
 * 플래그(하루 한 번)도 max 1로 같이 쓴다 — mergeDailyDelta가 DAILY_FLAGS를 boolean으로
 * 되돌리고 Number(true)는 1이라, 세는 규칙 하나로 둘 다 맞는다.
 * max를 안 주면 상한 없이 세기만 한다 (증분이 사라지지 않게).
 * @returns {Promise<{won:boolean, count:number, daily:object}>}
 */
export async function claimDailyCount(date, field, max) {
  const db = await openDb();
  const tx = db.transaction('daily', 'readwrite');
  const store = tx.objectStore('daily');
  const cur = await promisify(store.get(date));
  const have = (cur && Number(cur[field])) || 0;
  if (max !== undefined && have >= max) { await txDone(tx); return { won: false, count: have, daily: cur || emptyDaily(date) }; }
  const next = mergeDailyDelta(cur, date, { [field]: 1 });
  store.put(next);
  await txDone(tx);
  return { won: true, count: next[field], daily: next };
}

/**
 * "이 열쇠는 오늘 한 번, 열쇠 종류는 하루 max개" — 트랜잭션 선점 (🔶 영어스톤: 같은 복습 회차를 두 창이 끝내도 한쪽만, 하루 2회차까지).
 * @returns {Promise<{won:boolean, daily:object}>}
 */
export async function claimDailyKey(date, field, key, max) {
  const db = await openDb();
  const tx = db.transaction('daily', 'readwrite');
  const store = tx.objectStore('daily');
  const cur = await promisify(store.get(date));
  const have = (cur && Array.isArray(cur[field])) ? cur[field] : [];
  if (have.includes(key) || (max !== undefined && have.length >= max)) { await txDone(tx); return { won: false, daily: cur || emptyDaily(date) }; }
  const next = mergeDailyDelta(cur, date, { [field]: [key] });
  store.put(next);
  await txDone(tx);
  return { won: true, daily: next };
}

/**
 * 오늘 기록 하나를 트랜잭션 안에서 고쳐 쓴다 (읽기 → updater → 쓰기).
 * 밖에서 읽어둔 사본으로 통째로 덮어쓰면 그 사이 아이가 공부한 기록이 날아간다.
 * @param {(cur:object) => object|null} updater null을 주면 저장하지 않음
 */
async function editDaily(date, updater) {
  const db = await openDb();
  const tx = db.transaction('daily', 'readwrite');
  const store = tx.objectStore('daily');
  const cur = await promisify(store.get(date));
  if (!cur) { await txDone(tx); return null; }
  const next = updater({ ...cur, essays: (cur.essays || []).map((e) => ({ ...e })) });
  if (next) store.put(next);
  await txDone(tx);
  return next;
}

export async function listDaily() {
  const db = await openDb();
  const tx = db.transaction('daily', 'readonly');
  const all = await promisify(tx.objectStore('daily').getAll());
  return all.sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** ✍️ 날짜별로 흩어진 에세이를 한 줄로 (최신이 뒤). 부모 화면·아이 화면이 함께 쓴다 */
export async function listEssays() {
  const days = await listDaily();
  const out = [];
  for (const d of days) {
    for (const e of (d.essays || [])) if (e && e.id) out.push({ ...e, date: d.date });
  }
  return out;
}

/**
 * ✍️ 부모가 고쳐 준 문장을 해당 에세이에 붙인다.
 * 며칠 전 글도 고쳐 줄 수 있으므로 날짜 기록을 훑어 id로 찾는다.
 * @param {Array<{id:string, fixed:string}>} fixes
 * @returns {Promise<number>} 실제로 붙은 문장 수
 */
export async function applyEssayFixes(fixes) {
  if (!fixes || !fixes.length) return 0;
  const byId = new Map(fixes.map((f) => [f.id, f.fixed]));
  const days = await listDaily();
  let n = 0;
  for (const day of days) {
    if (!Array.isArray(day.essays) || !day.essays.some((e) => e && e.id && byId.has(e.id))) continue;
    // 밖에서 읽어둔 사본을 그대로 쓰면 그 사이 아이가 공부한 기록을 덮어쓴다 → 트랜잭션 안에서 다시 읽고 고친다
    let touched = 0;
    await editDaily(day.date, (d) => {
      for (const e of (d.essays || [])) {
        if (!e || !e.id || !byId.has(e.id)) continue;
        e.coachFix = byId.get(e.id);
        e.fixedAt = Date.now();
        e.readAt = 0;             // 아이가 아직 안 읽음
        touched++;
      }
      return touched ? d : null;
    });
    n += touched;
  }
  return n;
}

/**
 * ✍️ 배포에 실려 온 교정문(coach/fixes.json)을 앱에 반영한다.
 * 태블릿에 손으로 옮겨 적지 않아도 되게, 아빠 교정을 **앱 업데이트로** 전달하는 길.
 * 이미 고쳐진 글은 건드리지 않으므로 여러 번 불려도 안전하다.
 * @returns {Promise<number>} 새로 붙은 문장 수
 */
export async function syncCoachFixes(base = './coach/') {
  let list = [];
  try {
    const res = await fetch(`${base}fixes.json`);
    if (!res.ok) return 0;
    list = await res.json();
  } catch (e) {
    return 0; // 파일이 없거나 오프라인 — 학습에는 영향 없음
  }
  if (!Array.isArray(list) || !list.length) return 0;
  const { matchFixes } = await import('./essay.js');
  const entries = await listEssays();
  const fixes = matchFixes(entries, list);
  return fixes.length ? applyEssayFixes(fixes) : 0;
}

/** 하루치 기록에서 에세이 하나에 readAt을 찍는다 (트랜잭션 안에서) */
async function markReadIn(date, id) {
  let ok = false;
  await editDaily(date, (d) => {
    const e = (d.essays || []).find((x) => x && x.id === id);
    if (!e) return null;
    e.readAt = Date.now();
    ok = true;
    return d;
  });
  return ok;
}

/**
 * ✍️ 아이가 아빠 교정문을 읽었다고 표시 (한 번만 보여주기 위해).
 * `listEssays()`가 항목마다 날짜를 붙여 주므로 부르는 쪽이 date를 넘기면 바로 그 날만 연다.
 * (안 넘기면 날짜를 찾느라 기록 전체를 훑는다)
 */
export async function markEssayRead(id, date) {
  if (date) return markReadIn(date, id);
  for (const day of await listDaily()) {
    if (!(day.essays || []).some((x) => x && x.id === id)) continue;
    if (await markReadIn(day.date, id)) return true;
  }
  return false;
}

/** 단어 조회 기록 누적 (views: 패널이 열린 채 보임, taps: 직접 눌러서 펼침) */
export async function bumpVocabViews(entries, tapped) {
  if (!entries.length) return;
  const db = await openDb();
  const tx = db.transaction('vocabViews', 'readwrite');
  const store = tx.objectStore('vocabViews');
  for (const e of entries) {
    const cur = await promisify(store.get(e.term));
    const rec = cur || { word: e.term, meaning: e.meaning, kind: e.kind, views: 0, taps: 0, lastAt: 0, sentence: '', box: 0, dueAt: '', quizzes: 0, quizPass: 0, reviewedAt: 0 };
    rec.views++;
    if (tapped) rec.taps++;
    rec.lastAt = Date.now();
    rec.sentence = e.sentence || rec.sentence;
    rec.meaning = e.meaning || rec.meaning;
    store.put(rec);
  }
  await txDone(tx);
}

/**
 * 🔁 단어 복습 결과 저장.
 * 미리 계산한 절대값(box·횟수)을 넘기면, 콘텐츠를 열 때 읽어둔 옛 값으로 최신 기록을
 * 덮어쓴다 (두 창이 같은 quizzes를 읽으면 둘 다 +1 한 값을 쓴다 — Codex #6).
 * 그래서 **트랜잭션 안에서 읽은 최신 기록**을 updater에 넘겨 거기서 계산하게 한다.
 * @param {(cur:object) => object} updater 최신 기록 → 덮어쓸 필드
 * @returns {Promise<object|null>} 저장된 기록 (없는 단어면 null)
 */
export async function updateVocabReview(word, updater) {
  const db = await openDb();
  const tx = db.transaction('vocabViews', 'readwrite');
  const store = tx.objectStore('vocabViews');
  const cur = await promisify(store.get(word));
  if (!cur) { await txDone(tx); return null; }
  const next = { ...cur, ...updater(cur), reviewedAt: Date.now() };
  store.put(next);
  await txDone(tx);
  return next;
}

/**
 * 🔤 단어 이어 주기에 쓴 단어들을 "썼다"고 표시 (한 트랜잭션에 모아서).
 * 이 표시가 있어야 다음 판은 **새 단어가 또 20개 모일 때까지** 안 열린다.
 * 한 건씩 updateVocabReview를 부르면 트랜잭션이 20번 열려 느리고, 중간에 끊기면 반만 표시된다.
 */
export async function markVocabMatched(words, at = Date.now()) {
  const list = [...new Set((words || []).filter(Boolean))];
  if (!list.length) return 0;
  const db = await openDb();
  const tx = db.transaction('vocabViews', 'readwrite');
  const store = tx.objectStore('vocabViews');
  let n = 0;
  for (const w of list) {
    const cur = await promisify(store.get(w));
    if (!cur || cur.matchedAt) continue; // 이미 다른 창이 가져간 묶음 → 보상도 그쪽 몫
    store.put({ ...cur, matchedAt: at });
    n++;
  }
  await txDone(tx);
  return n; // 0이면 이번 판은 다른 창이 먼저 끝낸 것 (보상을 두 번 주지 않는다)
}

export async function listVocabViews() {
  const db = await openDb();
  const tx = db.transaction('vocabViews', 'readonly');
  return promisify(tx.objectStore('vocabViews').getAll());
}

// ───────────────────── 🎮 캐릭터 그림 ─────────────────────

export async function getCharacters() {
  const db = await openDb();
  const tx = db.transaction('characters', 'readonly');
  return promisify(tx.objectStore('characters').getAll());
}

export async function putCharacter(rec) {
  const db = await openDb();
  const tx = db.transaction('characters', 'readwrite');
  tx.objectStore('characters').put(rec);
  await txDone(tx);
}

export async function clearCharacters() {
  const db = await openDb();
  const tx = db.transaction('characters', 'readwrite');
  tx.objectStore('characters').clear();
  await txDone(tx);
}

// ───────────────────── ⚡ 프로필 ─────────────────────

export async function getProfile() {
  const db = await openDb();
  const tx = db.transaction('profile', 'readonly');
  return promisify(tx.objectStore('profile').get('me'));
}

// ── 프로필 규칙 ──
// 규칙은 **순수 함수**로 두고 트랜잭션은 mutateProfile 한 곳만 연다.
// 규칙이 트랜잭션 안에 들어가 있으면 node 테스트에서 indexedDB가 없어 조용히 폴백으로 새고,
// 정작 태블릿에서 도는 경로에 테스트가 하나도 안 붙는다 (오늘 실제로 그랬다).

/** 프로필 기본값 */
export function emptyProfile() {
  // unlockBase = 🎟️ 직전 교환권을 산 시점의 학습 누적치 { done, reviewed }.
  // 다음 영상 조건은 여기서부터 다시 센다 (null이면 아직 기준선을 안 잡은 것)
  return { id: 'me', xp: 0, caught: {}, throws: 0, catches: 0, coins: 0, coinsEarned: 0, items: {}, mons: {}, partner: null, unlockBase: null, eggs: [], stonesSpent: 0, updatedAt: 0 };
}

/** 규칙이 마음껏 고칠 수 있게 얕은 복사 (하위 객체까지) */
export function cloneProfile(p) {
  const cur = p || emptyProfile();
  return { ...emptyProfile(), ...cur, caught: { ...(cur.caught || {}) }, items: { ...(cur.items || {}) }, mons: { ...(cur.mons || {}) }, eggs: (cur.eggs || []).map((e) => ({ ...e, days: [...((e && e.days) || [])] })) };
}

/** 개수 맵에 더하고 0 이하는 지움 (가방·잡은 마릿수 공용) */
function addCount(map, id, n) {
  const next = (map[id] || 0) + n;
  if (next > 0) map[id] = next; else delete map[id];
}

/**
 * 프로필 트랜잭션 한 번: 최신 프로필을 읽어 규칙에 넘기고, 규칙이 고친 것을 저장한다.
 * 규칙이 `{ ok: false }`를 돌려주면 아무것도 쓰지 않는다 (코인·재료가 모자란 경우).
 * @param {(profile:object) => object|void} rule 복사본을 고치고 결과를 돌려주는 순수 함수
 */
async function mutateProfile(rule) {
  const db = await openDb();
  const tx = db.transaction('profile', 'readwrite');
  const store = tx.objectStore('profile');
  const cur = (await promisify(store.get('me'))) || emptyProfile();
  const next = cloneProfile(cur);
  const out = rule(next) || {};
  if (out.ok === false) { await txDone(tx); return { ...out, profile: cur }; }
  next.updatedAt = Date.now();
  store.put(next);
  await txDone(tx);
  return { ...out, profile: next };
}

// ── 🔢 수학 진도 ──
// `profile` 스토어에 id 'math' 레코드 하나로 둔다 (스키마를 안 올린다 — v68 이후 불변).
// 개념마다 { box, dueAt, passes, fails, lastAt } — 영어 문장 복습과 같은 라이트너 규칙.
// 백업 병합은 mergeStatRecord의 'math' 가지에서 따로 한다 ('me' 규칙을 태우면 concepts가 날아간다).

const MATH_ID = 'math';

export function emptyMath() {
  return { id: MATH_ID, concepts: {}, placed: {}, miss: {}, rounds: 0, log: [], updatedAt: 0 };
}

/** 개념 기록 복사 — kinds(얼굴별 [정답, 문항])·miss(개념별 오개념)는 안쪽 객체라 따로 복사한다 */
function cloneConcept(v) {
  const out = { ...v };
  if (v.kinds) { out.kinds = {}; for (const [k, a] of Object.entries(v.kinds)) out.kinds[k] = Array.isArray(a) ? [...a] : a; }
  if (v.miss) out.miss = { ...v.miss };
  if (Array.isArray(v.notes)) out.notes = v.notes.map((n) => ({ ...n }));
  if (v.cleared) out.cleared = { ...v.cleared };
  return out;
}

/** 🔢 수학 레코드 복사 — 규칙이 마음껏 고쳐도 원본이 안 바뀌게 (테스트에서도 쓴다) */
export function cloneMath(m) {
  // ★ sp(💎 스페셜)도 안쪽 pass 맵까지 새 객체로 — 얕게 복사하면 규칙이 **입력을 변형**한다
  //   (Codex가 daily에서 잡았던 것과 같은 함정)
  const out = { ...emptyMath(), ...m, concepts: {}, placed: { ...(m.placed || {}) }, miss: { ...(m.miss || {}) }, log: [...(Array.isArray(m.log) ? m.log : [])], ...(m.tot ? { tot: { ...m.tot } } : {}), ...(m.sp ? { sp: { ...m.sp, pass: { ...(m.sp.pass || {}) } } } : {}) };
  for (const [k, v] of Object.entries(m.concepts || {})) out.concepts[k] = cloneConcept(v);
  if (Array.isArray(m.asks)) out.asks = m.asks.map(cloneAsk); // ❓ 질문은 안쪽에 답장 배열이 있어 따로 복사
  return out;
}
function cloneAsk(a) {
  return { ...a, replies: (a.replies || []).map((r) => ({ ...r })), again: (a.again || []).map((r) => ({ ...r })) };
}

/**
 * ❓ 질문 병합 — id로 합치고, 같은 질문은 u(마지막 바뀐 시각)가 늦은 쪽의 상태를, 답장·되물음은 시각으로 합집합.
 * 번호(askSeq)는 큰 값. (두 기기가 같은 번호를 다른 질문에 줬으면 번호가 겹칠 수 있는데, 한 태블릿이라 두지 않는다)
 * @returns {{asks:Array, askSeq:number}}
 */
export function mergeAsks(cur, rec) {
  const byId = new Map();
  for (const x of (Array.isArray(cur && cur.asks) ? cur.asks : [])) if (x && x.id) byId.set(x.id, cloneAsk(x));
  // 시각+본문으로 합친다 — 같은 백업에서 갈라진 두 기기가 같은 밀리초에 다른 답장을 붙이면 시각만으로는 하나가 사라진다 (Codex 4차 #6)
  const uni = (a, b) => { const seen = new Map(); for (const r of [...(a || []), ...(b || [])]) { if (!r) continue; const k = `${r.t}|${r.text || r.kid || ''}`; if (!seen.has(k)) seen.set(k, { ...r }); } return [...seen.values()].sort((p, q) => p.t - q.t); };
  for (const x of (Array.isArray(rec && rec.asks) ? rec.asks : [])) {
    if (!x || !x.id) continue;
    const mine = byId.get(x.id);
    if (!mine) { byId.set(x.id, cloneAsk(x)); continue; }
    // 늦게 바뀐 쪽 — 시각이 같으면 진행이 더 된 쪽 (asked < answered < again < understood < fixed < closed)
    const RANK = { asked: 0, answered: 1, again: 2, understood: 3, fixed: 4, closed: 5 };
    const ux = Number(x.u) || 0; const um = Number(mine.u) || 0;
    const later = (ux > um || (ux === um && (RANK[x.status] || 0) > (RANK[mine.status] || 0))) ? x : mine;
    const merged = { ...later, replies: uni(mine.replies, x.replies), again: uni(mine.again, x.again), tries: Math.max(Number(mine.tries) || 0, Number(x.tries) || 0) };
    const readAt = Math.max(Number(mine.readAt) || 0, Number(x.readAt) || 0);
    if (readAt) merged.readAt = readAt; else delete merged.readAt;
    byId.set(x.id, merged);
  }
  const asks = [...byId.values()].sort((a, b) => a.t - b.t);
  return { asks, askSeq: Math.max(Number(cur && cur.askSeq) || 0, Number(rec && rec.askSeq) || 0, ...asks.map((a) => Number(a.no) || 0)) };
}

export async function getMath() {
  const db = await openDb();
  const tx = db.transaction('profile', 'readonly');
  return (await promisify(tx.objectStore('profile').get(MATH_ID))) || emptyMath();
}

/**
 * 수학 진도를 한 트랜잭션에서 읽고-고치고-쓴다 (두 창이 열려 있어도 서로 덮어쓰지 않게).
 * @param {(m:object) => object|void} rule 복사본을 고치는 순수 함수
 */
export async function updateMath(rule) {
  const db = await openDb();
  const tx = db.transaction('profile', 'readwrite');
  const store = tx.objectStore('profile');
  const cur = (await promisify(store.get(MATH_ID))) || emptyMath();
  const next = cloneMath(cur);
  rule(next);
  next.id = MATH_ID;
  next.updatedAt = Date.now();
  store.put(next);
  await txDone(tx);
  return next;
}

/**
 * 🔢 두 수학 진도 병합 — 오개념 횟수·회차는 큰 값, 진단 여부는 OR.
 * 개념은 통째로 고르지 않는다 (Codex 리뷰 #7: 다른 기기의 늦은 실패가 앞선 통과를 지우고 사다리를 다시 잠갔다):
 *   done = OR · passes/fails = 큰 값 · lastAt = 큰 값 · 복습 일정(box·dueAt)은 **배운(done) 쪽 중 최근** 것
 */
export function mergeMath(cur, rec) {
  const out = cloneMath(cur || emptyMath());
  for (const [k, v] of Object.entries((rec && rec.concepts) || {})) {
    const mine = out.concepts[k];
    if (!mine) { out.concepts[k] = cloneConcept(v); continue; }
    const later = (Number(v.lastAt) || 0) > (Number(mine.lastAt) || 0) ? v : mine;
    // 일정(box·dueAt)은 배운 기록에서만 — 한쪽만 done이면 그쪽, 둘 다면 **일정이 바뀐 시각(schedAt)** 이 최근인 쪽.
    // lastAt으로 고르면 옛 상태의 기기에서 연습·섞어 풀기만 해도(일정은 그대로, lastAt만 올라감) 👑이 되돌아간다 (Codex 3차 #1).
    // schedAt이 없는 옛 기록은 lastAt으로 대신한다
    const schedTime = (x) => Number(x.schedAt) || Number(x.lastAt) || 0;
    const sv = schedTime(v); const sm = schedTime(mine);
    const laterSched = (sv > sm || (sv === sm && (Number(v.lastAt) || 0) > (Number(mine.lastAt) || 0))) ? v : mine; // 같은 시각이면 활동이 늦은 쪽
    const sched = (mine.done && !v.done) ? mine : (!mine.done && v.done) ? v : laterSched;
    // 얼굴별 누적·개념별 오개념은 큰 값 (오래된 백업이 최신 누적을 줄이지 않게)
    const kinds = {};
    for (const src of [mine.kinds, v.kinds]) for (const [kk, a] of Object.entries(src || {})) {
      const cur = kinds[kk] || [0, 0];
      kinds[kk] = [Math.max(cur[0], Number(a && a[0]) || 0), Math.max(cur[1], Number(a && a[1]) || 0)];
    }
    const miss = {};
    for (const src of [mine.miss, v.miss]) for (const [t, n] of Object.entries(src || {})) miss[t] = Math.max(Number(miss[t]) || 0, Number(n) || 0);
    // 🤔 오답 노트는 유형(key)별로 최근 것 하나 — 최근 12개
    // 지운 표시(cleared)는 큰 값 — 옛 백업의 노트가 그 뒤에 지운 것이면 되살리지 않는다 (Codex 2차 #3)
    const cleared = {};
    for (const src of [mine.cleared, v.cleared]) for (const [k, t] of Object.entries(src || {})) cleared[k] = Math.max(Number(cleared[k]) || 0, Number(t) || 0);
    const byKey = new Map();
    for (const src of [mine.notes, v.notes]) for (const n of (Array.isArray(src) ? src : [])) {
      if (!n || !n.key) continue;
      if ((Number(cleared[n.key]) || 0) >= (Number(n.t) || 0)) continue; // 지운 뒤의 기록이 아니면 버린다 (같은 밀리초면 지운 쪽으로)
      const cur = byKey.get(n.key);
      if (!cur || (Number(n.t) || 0) > (Number(cur.t) || 0)) byKey.set(n.key, { ...n });
    }
    const notes = [...byKey.values()].sort((a, b) => (a.t || 0) - (b.t || 0)).slice(-12);
    out.concepts[k] = {
      ...later,
      done: !!(mine.done || v.done),
      box: sched.box || 0,
      dueAt: sched.dueAt || '',
      ...(sched.schedAt ? { schedAt: Number(sched.schedAt) } : {}),
      passes: Math.max(Number(mine.passes) || 0, Number(v.passes) || 0),
      fails: Math.max(Number(mine.fails) || 0, Number(v.fails) || 0),
      lastAt: Math.max(Number(mine.lastAt) || 0, Number(v.lastAt) || 0),
      ...(Object.keys(kinds).length ? { kinds } : {}),
      ...(Object.keys(miss).length ? { miss } : {}),
      ...(notes.length ? { notes } : {}),
      ...(Object.keys(cleared).length ? { cleared } : {}),
    };
    if (!sched.placed) delete out.concepts[k].placed;
    if (!sched.schedAt) delete out.concepts[k].schedAt; // 일정을 준 쪽에 시각이 없으면 다른 쪽 시각을 달고 있으면 안 된다
  }
  for (const [k, v] of Object.entries((rec && rec.placed) || {})) out.placed[k] = out.placed[k] || v;
  for (const [k, v] of Object.entries((rec && rec.miss) || {})) out.miss[k] = Math.max(Number(out.miss[k]) || 0, Number(v) || 0);
  out.rounds = Math.max(Number(out.rounds) || 0, Number(rec && rec.rounds) || 0);
  // ❓ 질문 왕복 — 합집합 (다시 만들 수 없는 기록)
  if ((rec && Array.isArray(rec.asks) && rec.asks.length) || (Array.isArray(out.asks) && out.asks.length)) {
    const ma = mergeAsks(out, rec);
    out.asks = ma.asks;
    out.askSeq = ma.askSeq;
  }
  // ☀️ 오늘의 수학 완주 기록은 늦은 날짜 쪽, 같은 날이면 큰 횟수 — 옛 백업이 오늘 완주를 지우지 않게
  const dl = rec && rec.daily && rec.daily.d ? rec.daily : null;
  // 🌟 황금볼(하루 1개)은 같은 날이면 어느 쪽이 받았든 "받은 것" — 옛 백업이 오늘 받은 황금볼을 두 번 주지 않게
  const goldToday = !!(dl && out.daily && out.daily.d === dl.d && (out.daily.gold || dl.gold));
  if (dl && (!out.daily || !out.daily.d || dl.d > out.daily.d || (dl.d === out.daily.d && (Number(dl.n) || 0) > (Number(out.daily.n) || 0)))) out.daily = { d: dl.d, n: Number(dl.n) || 0, ...(dl.gold ? { gold: true } : {}) };
  if (goldToday && out.daily && out.daily.d === dl.d) out.daily = { ...out.daily, gold: true }; // cloneMath는 daily를 얕게 복사하므로 입력을 건드리지 않게 새 객체로
  // 🎯 던지기 카운터(earned·used·refunded)는 단조 증가 → 키마다 max (옛 백업을 되돌려도 쓴 던지기가 되살아나지 않는다, Codex 6차 #5).
  // 양쪽을 먼저 정규화(v112의 pend를 earned로 접기)한 뒤 합친다 — pend를 남겨 두면 나중에 또 접혀 두 번 더해진다 (Codex 7차 #3)
  if ((rec && (rec.throws || rec.pend !== undefined)) || out.throws || out.pend !== undefined) {
    const a = normThrows(out);
    const b = normThrows(rec || {});
    out.throws = { earned: Math.max(a.earned, b.earned), used: Math.max(a.used, b.used), refunded: Math.max(a.refunded, b.refunded) };
    delete out.pend;
  }
  // 🎟️ 누적 카운터(정답·완주·복습 통과)는 단조 증가라 키마다 max — 옛 백업이 진도를 되돌리지 않게
  if (rec && rec.tot) {
    out.tot = out.tot || { ok: 0, daily: 0, rev: 0 };
    for (const k of ['ok', 'daily', 'rev']) out.tot[k] = Math.max(Number(out.tot[k]) || 0, Number(rec.tot[k]) || 0);
  }
  // 💎 스페셜 통과 횟수·회차·🏆 보상 수령은 전부 **단조 증가** → 키마다 max.
  //    옛 백업을 되돌려도 받은 🏅 배지가 사라지지 않고, 🏆 챔피언 보상을 두 번 받지도 않는다
  if ((rec && rec.sp) || out.sp) {
    const a = (out.sp && out.sp.pass) || {};
    const b = (rec && rec.sp && rec.sp.pass) || {};
    const pass = {};
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) pass[k] = Math.max(Number(a[k]) || 0, Number(b[k]) || 0);
    out.sp = {
      pass,
      rounds: Math.max(Number(out.sp && out.sp.rounds) || 0, Number(rec && rec.sp && rec.sp.rounds) || 0),
      gym: (out.sp && out.sp.gym) || (rec && rec.sp && rec.sp.gym) ? 1 : 0,
    };
  }
  // 📒 일지는 시각(t)으로 합집합 — 같은 편이 두 기기에 있으면 하나만, 최근 400편
  const seen = new Set(out.log.map((e) => e && e.t));
  for (const e of (Array.isArray(rec && rec.log) ? rec.log : [])) if (e && e.t && !seen.has(e.t)) { seen.add(e.t); out.log.push(e); }
  out.log.sort((a, b) => (a.t || 0) - (b.t || 0));
  if (out.log.length > 400) out.log.splice(0, out.log.length - 400);
  out.updatedAt = Math.max(Number(out.updatedAt) || 0, Number(rec && rec.updatedAt) || 0);
  return out;
}

/** ⚡ 증분 더하기 규칙 (수치는 더하고, mons는 필드 덮어쓰기, partner는 정해진 값으로) */
export function mergeProfileDelta(profile, delta) {
  const d = delta || {};
  profile.xp = (Number(profile.xp) || 0) + (d.xp || 0);
  profile.throws = (Number(profile.throws) || 0) + (d.throws || 0);
  profile.catches = (Number(profile.catches) || 0) + (d.catches || 0);
  profile.coins = Math.max(0, (Number(profile.coins) || 0) + (d.coins || 0));
  profile.coinsEarned = (Number(profile.coinsEarned) || 0) + (d.coinsEarned || 0);
  for (const id of Object.keys(d.caught || {})) addCount(profile.caught, id, d.caught[id]); // ⚔️ 배틀에서 잃으면 −1
  for (const id of Object.keys(d.items || {})) addCount(profile.items, id, d.items[id]);    // 🎒 구매 +, 장착·사용 −
  for (const id of Object.keys(d.mons || {})) profile.mons[id] = { ...(profile.mons[id] || {}), ...d.mons[id] };
  if (d.partner !== undefined) profile.partner = d.partner;
  return {};
}

/**
 * ❤️ HP를 **바뀐 만큼** 더하고 0~max로 자르는 규칙.
 * 절대값(hp: 80)으로 쓰면 두 창이 100에서 −20·−10 한 것이 한쪽만 남는다(−30이어야 함).
 * spendItem을 주면 같은 판정 안에서 소모한다 → 🧪 물약 하나로 두 번 못 먹인다.
 */
export function hpChangeRule(profile, monId, by, max, spendItem) {
  const m = profile.mons[monId] || {};
  const from = Math.max(0, Math.min(max, typeof m.hp === 'number' ? m.hp : max));
  if (spendItem && (profile.items[spendItem] || 0) < 1) return { ok: false, from, to: from }; // 다른 창이 먼저 씀
  if (spendItem) addCount(profile.items, spendItem, -1);
  const to = Math.max(0, Math.min(max, from + Math.round(by || 0)));
  profile.mons[monId] = { ...m, hp: to };
  return { ok: true, from, to };
}

/**
 * ⚔️ 패배를 누적하고 "정해진 횟수면 한 마리 잃음"까지 **한 판정으로** 끝내는 규칙.
 * 밖에서 세면 두 창이 각각 "2 → 3이니 잃음"으로 판정해 두 마리를 잃는다.
 */
export function battleLossRule(profile, monId, lossesToLose) {
  const m = profile.mons[monId] || {};
  // 🧬 다른 창에서 진화로 이미 내보냈다면(보유 0) 패배를 적용하지 않는다.
  //    그냥 빼면 `caught`가 0이 돼 **도감 칸이 사라지고**, 그다음에 잡은 한 마리가 evo에 삼켜진다 (Codex 10차 #2가 재현)
  if (haveOf((profile.caught || {})[monId], m) < 1) return { losses: Number(m.losses) || 0, lost: false, stale: true };
  const losses = (Number(m.losses) || 0) + 1;
  const lost = losses >= lossesToLose;
  if (lost) addCount(profile.caught, monId, -1);
  profile.mons[monId] = { ...m, losses: lost ? 0 : losses };
  return { losses: lost ? 0 : losses, lost };
}

/**
 * 💰🎒 값을 치르고 물건을 받는 규칙 — 치를 수 있는지 판정이 여기 있어야
 * 두 창에서 같은 코인·재료로 두 번 사지 않는다 (1,200코인으로 마스터볼 두 개).
 * @param {{coins?:number, items?:Object}} cost 치를 코인·재료 (모자라면 아무것도 안 함)
 * @param {{items?:Object, mons?:Object}} gain 받을 것
 */
export function purchaseRule(profile, cost, gain) {
  const need = Number((cost && cost.coins) || 0);
  const needItems = (cost && cost.items) || {};
  const short = (Number(profile.coins) || 0) < need
    || Object.keys(needItems).some((id) => (profile.items[id] || 0) < needItems[id]);
  if (short) return { ok: false };
  profile.coins = (Number(profile.coins) || 0) - need;
  for (const id of Object.keys(needItems)) addCount(profile.items, id, -needItems[id]);
  for (const id of Object.keys((gain && gain.items) || {})) addCount(profile.items, id, gain.items[id]);
  for (const id of Object.keys((gain && gain.mons) || {})) profile.mons[id] = { ...(profile.mons[id] || {}), ...gain.mons[id] };
  // 🎟️ 교환권을 살 때는 그 시점의 학습 누적치를 기준선으로 박아 둔다 — 다음 영상은 여기서부터 다시 센다.
  // **살 수 있었을 때만** 바뀐다 (코인이 모자라 위에서 돌아가면 기준선도 그대로)
  if (gain && gain.unlockBase) profile.unlockBase = normalizeUnlockBase(gain.unlockBase);
  return { ok: true };
}

/** 기준선을 안전한 숫자 쌍으로 (저장 전에 한 번, 읽을 때 또 한 번 — unlock.normalizeBase와 같은 규칙) */
export function normalizeUnlockBase(base) {
  const n = (v) => Math.max(0, Math.floor(Number(v) || 0));
  // 🔢 수학 몫(2026-09-22)도 기준선에 — 옛 기준선엔 없으니 0
  return { done: n(base && base.done), reviewed: n(base && base.reviewed), mathOk: n(base && base.mathOk), mathDaily: n(base && base.mathDaily), mathRev: n(base && base.mathRev) };
}

/**
 * 🎟️ 기준선이 **아직 없을 때만** 박는다 (있으면 그대로 두고 ok:false).
 *
 * 교환권 기능이 생기기 전부터 쓰던 아이에게 필요하다: 진우는 이미 팬텀을 샀는데 기준선이 없어서
 * 다음 영상 조건이 처음부터 꽉 차 있었다. 앱을 열 때 지금 누적치로 한 번 박아 주면
 * "팬텀 이후에 쌓은 것"부터 세게 된다. 두 창이 같이 열려도 트랜잭션 안에서 판정하므로 한 번만 잡힌다.
 */
export function claimUnlockBase(base) {
  return mutateProfile((p) => {
    if (p.unlockBase) return { ok: false };
    p.unlockBase = normalizeUnlockBase(base);
    return { ok: true };
  });
}

// ── 프로필 쓰기 (규칙을 트랜잭션 안에서 돌린다) ──

/**
 * 프로필에 증분만 더해서 저장. 홈 화면 앱과 Chrome 탭을 같이 열어도
 * 서로의 XP·포켓몬을 덮어쓰지 않음. 반환: 저장된 최신 프로필
 */
export async function applyProfileDelta(delta) {
  const r = await mutateProfile((p) => mergeProfileDelta(p, delta));
  return r.profile;
}

/**
 * 🥚 알 사기 — 코인+스톤을 치르고(purchaseRule) 알 레코드를 붙인다. 그 과목에 품는 알이 있으면 안 판다. 한 트랜잭션
 * @param {{coins:number, items:Object}} cost
 * @param {object} egg egg.newEgg(...)
 */
export function buyEggRule(profile, cost, egg) {
  if (!egg || !egg.subject) return { ok: false };
  if (activeEgg(profile, egg.subject)) return { ok: false, why: 'active' };
  const r = purchaseRule(profile, cost, {});
  if (!r.ok) return r;
  profile.eggs = [...(profile.eggs || []), egg];
  return { ok: true };
}
export function applyBuyEgg(cost, egg) {
  return mutateProfile((p) => buyEggRule(p, cost, egg));
}
/** 🥚 완주한 날을 알에 적고, 5일이 차면 부화(도감 등록)까지 한 트랜잭션 → { ok, ticked, hatched, egg, profile } */
export function applyEggDay(subject, dateKey) {
  return mutateProfile((p) => eggRule(p, subject, dateKey));
}
/**
 * 🌈 이로치의 스톤 쓰기 — 잡은 포켓몬이고 아직 이로치가 아닐 때, 스톤 하나를 쓰고 mons[id].shiny = true를 **한 트랜잭션**에서 (영구)
 * @returns {{ok:boolean, why?:string}} why: 'caught' | 'already' | 'item'
 */
export function shinyRule(profile, monId, itemId = 'shiny_stone') {
  const id = Number(monId);
  // 🧬 진화로 다 보낸 종에는 쓸 수 없다 — 도감에만 남은 모습에 500코인을 태우면 아이가 억울하다 (Codex 10차 #4)
  if (!id || haveOf((profile.caught || {})[id], profile.mons[id]) < 1) return { ok: false, why: 'caught' };
  if (profile.mons && profile.mons[id] && profile.mons[id].shiny) return { ok: false, why: 'already' };
  const r = purchaseRule(profile, { items: { [itemId]: 1 } }, {});
  if (!r.ok) return { ok: false, why: 'item' };
  profile.mons[id] = { ...(profile.mons[id] || {}), shiny: true };
  return { ok: true };
}
export function applyShiny(monId, itemId) {
  return mutateProfile((p) => shinyRule(p, monId, itemId));
}

/**
 * ⬆️ 레벨업 — 🔷🔶 스톤과 💰 코인을 치르고 `mons[id].lv`를 한 칸 올린다. **한 트랜잭션**.
 *
 * ★ 값은 **여기서** 계산한다(밖에서 받지 않는다). 두 창을 같이 열면 다른 창이 먼저 올려 레벨이 달라져 있고,
 *   그때 밖에서 계산한 값은 낡은 것이다 — Lv5 값(스톤 1)으로 Lv6를 사게 된다.
 * @param {string} stoneId 이 포켓몬을 키우는 스톤 (과목은 종마다 고정이라 밖에서 줘도 낡지 않는다)
 * @returns {{ok:boolean, why?:string, from?:number, to?:number, cost?:object}} why: 'caught' | 'max' | 'cost'
 */
export function levelUpRule(profile, monId, stoneId) {
  const id = Number(monId);
  const m = profile.mons[id] || {};
  if (!id || haveOf((profile.caught || {})[id], m) < 1) return { ok: false, why: 'caught' }; // 데리고 있어야 키운다 (전부 진화시켰으면 못 올림)
  const from = lvOf(m);
  const next = nextCost(from, id); // 진화하는 종은 진화 레벨에서 멈춘다
  if (!next) return { ok: false, why: capReason(id, from) || 'max' };
  const cost = { coins: next.coins, items: { [stoneId]: next.stones } };
  if (!purchaseRule(profile, cost, {}).ok) return { ok: false, why: 'cost', from, cost };
  profile.mons[id] = { ...m, lv: next.toLv };
  // 📊 부모 화면이 "실제로 쓴 스톤"을 보여 줄 수 있게 여기서 센다 — 레벨에서 역산하면 진화로 물려받은 레벨을
  //    두 번 세어 부풀려진다(꼬부기 Lv5 + 어니부기 Lv5 = 8개로 보고, 실제는 4개. Codex 10차 #8)
  profile.stonesSpent = (Number(profile.stonesSpent) || 0) + next.stones;
  return { ok: true, from, to: next.toLv, cost };
}
export function applyLevelUp(monId, stoneId) {
  return mutateProfile((p) => levelUpRule(p, monId, stoneId));
}

/**
 * 🧬 진화 — 잡은 마릿수 **한 마리**를 진화형으로 옮긴다. **한 트랜잭션**.
 *
 * 진화 자체는 공짜다(값은 레벨업에서 이미 치렀다). 대신 마릿수를 하나 쓴다 —
 * 레벨이 종 단위라 이게 없으면 "Lv5로 올려 둔 꼬부기를 잡을 때마다 공짜로 어니부기"가 된다.
 *
 * 따라가는 것: 레벨(진화형이 이미 높으면 그대로) · 🌈 이로치 · 🤝 파트너(마지막 한 마리였을 때)
 * 안 따라가는 것: 🎀 장식(마지막 한 마리였으면 가방으로 돌려준다) · ⚔️ 패배 누적 · ❤️ HP(가득 차서 시작)
 * @returns {{ok:boolean, why?:string, lv?:number, first?:boolean, gearBack?:string|null, partnerMoved?:boolean}}
 */
export function evolveRule(profile, fromId, toId, hpMax = 100) {
  const from = Number(fromId);
  const to = Number(toId);
  const m = profile.mons[from] || {};
  const have = haveOf((profile.caught || {})[from], m);
  const lv = lvOf(m);
  const can = canEvolve(from, lv, have, to);
  if (!can.ok) return { ok: false, why: can.why };

  const t = profile.mons[to] || {};
  // "도감에 새로 등록"은 **누적 기록**으로 본다 — 보유로 보면 한 번 내보낸 종이 다시 "새로 등록!"이 된다 (Codex 10차 #10)
  const first = !(((profile.caught || {})[to] || 0) > 0);
  const last = have === 1; // 방금 마지막 한 마리를 보냈나

  // ★ caught를 줄이지 않고 **내보낸 수**를 센다 — 백업 병합이 caught를 max로 합치므로
  //   직접 줄이면 옛 백업을 되돌릴 때 내보낸 한 마리가 되살아나 복제된다 (evolve.haveOf 주석)
  addCount(profile.caught, to, 1);
  profile.mons[to] = {
    ...t,
    lv: Math.max(lvOf(t), lv), // 진화형이 이미 더 높으면 그대로 (성장을 되돌리지 않는다)
    hp: hpMax,
    losses: 0,
    ...(m.shiny ? { shiny: true } : {}), // 🌈 이로치는 그 종의 색 — 진화해도 이로치다
  };

  const next = { ...m, evo: (Number(m.evo) || 0) + 1 };
  let gearBack = null;
  if (last && m.gear) { addCount(profile.items, m.gear, 1); gearBack = m.gear; next.gear = null; } // 남은 애가 없으면 장식은 가방으로
  profile.mons[from] = next;

  let partnerMoved = false;
  if (last && Number(profile.partner) === from) { profile.partner = to; partnerMoved = true; } // 파트너가 떠나 버리지 않게

  return { ok: true, from, to, lv: profile.mons[to].lv, first, last, gearBack, partnerMoved };
}
export function applyEvolve(fromId, toId, hpMax) {
  return mutateProfile((p) => evolveRule(p, fromId, toId, hpMax));
}

/** 🐣 부화 알림을 보여 줬다 */
export function applyEggSeen(eggId) {
  return mutateProfile((p) => eggSeenRule(p, eggId));
}

/** ❤️ HP 바꾸기 (+🧪 물약 소모) → { ok, from, to, profile } */
export function applyHpChange(monId, by, max, spendItem) {
  return mutateProfile((p) => hpChangeRule(p, monId, by, max, spendItem));
}

/** ⚔️ 배틀 패배 누적 → { losses, lost, profile } */
export function applyBattleLoss(monId, lossesToLose) {
  return mutateProfile((p) => battleLossRule(p, monId, lossesToLose));
}

/**
 * 🎀 장식 장착(gearId) / 벗기(null) — **한 트랜잭션**.
 *
 * ★ 메모리에서 "지금 낀 것"을 읽어 환불하면 두 창에서 장식이 복제된다 (Codex 10차 #1이 재현):
 *   창 A에서 진화해 왕관이 가방으로 돌아간 뒤, 아직 왕관을 낀 줄 아는 창 B가 벗기면 왕관이 하나 더 생긴다.
 *   지금 낀 것·환불·새로 끼울 것을 **저장된 기록에서** 판정한다.
 * @returns {{ok:boolean, why?:string, gear:string|null}} why: 'item'(가방에 없음)
 */
export function gearRule(profile, monId, gearId) {
  const id = Number(monId);
  const m = profile.mons[id] || {};
  const cur = m.gear || null;
  const next = gearId || null;
  if (cur === next) return { ok: true, gear: cur };            // 이미 그 상태 (두 번째 창의 같은 요청)
  if (next && (profile.items[next] || 0) < 1) return { ok: false, why: 'item', gear: cur };
  if (cur) addCount(profile.items, cur, 1);                    // 저장된 기록에 실제로 끼워져 있을 때만 돌려준다
  if (next) addCount(profile.items, next, -1);
  profile.mons[id] = { ...m, gear: next };
  return { ok: true, gear: next };
}
export function applyGear(monId, gearId) {
  return mutateProfile((p) => gearRule(p, monId, gearId));
}

/**
 * 🤝 파트너 정하기 — **한 트랜잭션**이고 **데리고 있는** 포켓몬만 (Codex 10차 #4).
 * 메모리로 정하면 진화가 옮겨 놓은 파트너를 옛 창이 되돌린다.
 */
export function partnerRule(profile, monId) {
  const id = Number(monId);
  if (haveOf((profile.caught || {})[id], profile.mons[id]) < 1) return { ok: false, why: 'have', partner: profile.partner || null };
  profile.partner = id;
  return { ok: true, partner: id };
}
export function applyPartner(monId) {
  return mutateProfile((p) => partnerRule(p, monId));
}

/** 💰🎒 사기 → { ok, profile } */
export function applyPurchase(cost, gain) {
  return mutateProfile((p) => purchaseRule(p, cost, gain));
}

/** 기록 전체 내보내기 (영상 제외) */
export async function exportStats() {
  const db = await openDb();
  const tx = db.transaction(['items', ...STAT_STORES], 'readonly');
  const items = (await promisify(tx.objectStore('items').getAll())).map((it) => ({
    // noReview = 📊에서 부모가 고른 "🔁 복습에 쓰기" — 아이가 만든 기록이 아니라 **부모의 선택**이라
    // 기기를 옮기거나 되돌릴 때 같이 가야 한다 (Codex 9차 #8)
    id: it.id, title: it.title, duration: it.duration, lastCue: it.lastCue, createdAt: it.createdAt,
    ...(typeof it.noReview === 'boolean' ? { noReview: it.noReview } : {}),
  }));
  const out = { app: 'shincoach', version: 1, exportedAt: new Date().toISOString(), items };
  for (const name of STAT_STORES) out[name] = await promisify(tx.objectStore(name).getAll());
  return out;
}

const maxOf = (a, b) => Math.max(Number(a) || 0, Number(b) || 0);

/**
 * 가져온 기록(rec)과 기기에 있는 기록(cur) 병합 — 오래된 백업이 최신 누적을 줄이지 않도록
 * 누적 수치는 큰 값, 시각은 최근 값, 날짜별 완료 문장은 합집합
 */
/**
 * 🔁 두 문장 기록 중 "최근에 복습한 쪽"의 복습 상태(box·dueAt)를 한 쌍으로 고른다.
 * 둘 다 복습 이력이 없으면(옛 기록) 더 나아간 box 쪽, 그것도 같으면 늦은 dueAt 쪽.
 */
export function pickReviewState(a, b) {
  const state = (r) => ({ box: r.box || 0, dueAt: r.dueAt || '' });
  const ta = Number(a.reviewedAt) || 0;
  const tb = Number(b.reviewedAt) || 0;
  if (ta !== tb) return state(ta > tb ? a : b);
  const boxA = a.box || 0;
  const boxB = b.box || 0;
  if (boxA !== boxB) return state(boxA > boxB ? a : b);
  return state((a.dueAt || '') >= (b.dueAt || '') ? a : b);
}

export function mergeStatRecord(name, cur, rec) {
  if (!cur) return rec;
  const out = { ...cur, ...rec };
  if (name === 'sentenceStats') {
    for (const k of ['plays', 'listens', 'seconds', 'speakAttempts', 'speakPass', 'speakFail', 'speakSkipped', 'bestRatio', 'lastAt', 'puzzles', 'puzzleSolved', 'puzzleWrong', 'reviews', 'reviewPass', 'reviewedAt']) out[k] = maxOf(cur[k], rec[k]);
    out.done = !!(cur.done || rec.done);
    // 🎤 오늘 말하기 보상을 받았다는 표시 — 옛 백업이 덮으면 같은 문장으로 코인을 또 받는다
    out.speakPaidAt = (cur.speakPaidAt || '') >= (rec.speakPaidAt || '') ? (cur.speakPaidAt || '') : rec.speakPaidAt;
    out.lastRatio = (rec.lastAt || 0) >= (cur.lastAt || 0) ? (rec.lastRatio || 0) : (cur.lastRatio || 0);
    // 🔁 복습 진도(box·dueAt)는 "가장 큰 값"이 아니라 **가장 최근에 복습한 쪽을 한 쌍으로** 가져온다.
    // box는 틀리면 내려가는 값이라 max로 합치면, 어려워서 내일 다시 봐야 할 문장이 옛 백업 때문에
    // 더 늦게 돌아온다 (Codex #6). reviewedAt이 없는 옛 기록끼리는 더 나아간 box 쪽을 쓴다.
    const pick = pickReviewState(cur, rec);
    out.box = pick.box;
    out.dueAt = pick.dueAt;
    // 🎯 못 말한 단어 { 단어: 횟수 }는 단어마다 큰 값 (기기를 옮겨도 약점이 남게)
    if (cur.missed || rec.missed) {
      out.missed = { ...(cur.missed || {}) };
      for (const w of Object.keys(rec.missed || {})) {
        const a = Object.prototype.hasOwnProperty.call(out.missed, w) ? out.missed[w] : 0;
        out.missed[w] = maxOf(Number.isFinite(a) ? a : 0, rec.missed[w]);
      }
    }
  } else if (name === 'daily') {
    out.doneKeys = [...new Set([...(cur.doneKeys || []), ...(rec.doneKeys || [])])];
    for (const k of DAILY_LISTS) out[k] = [...new Set([...(cur[k] || []), ...(rec[k] || [])])];
    // 누적 수치는 DAILY_SUMS 그대로 — 목록을 따로 들고 있으면 새 필드(🔤 matches·🔢 math*)가 빠져
    // 옛 백업이 오늘 수치를 덮어쓴다 (Codex 리뷰 #6: 20문항 위에 4문항 백업을 넣으니 4가 됐다)
    for (const k of DAILY_SUMS) out[k] = maxOf(cur[k], rec[k]);
    out.goalRewarded = !!(cur.goalRewarded || rec.goalRewarded);
    out.hpMissed = !!(cur.hpMissed || rec.hpMissed);
    out.reviewGolden = !!(cur.reviewGolden || rec.reviewGolden); // 🌟 하루 1개 — 백업을 되돌려 다시 받는 것도 막는다
    out.essayDone = !!(cur.essayDone || rec.essayDone);             // ✍️ 하루 1번 — 백업으로 되돌려 또 받는 것 방지
    // 쓴 글은 지워지면 안 되므로 양쪽을 합친다 (같은 글은 한 번만)
    const seen = new Set();
    out.essays = [...(cur.essays || []), ...(rec.essays || [])].filter((e) => {
      const k = (e && e.id) ? `id:${e.id}` : `${e && e.origin}|${e && e.written}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  } else if (name === 'vocabViews') {
    for (const k of ['views', 'taps', 'lastAt', 'quizzes', 'quizPass', 'reviewedAt']) out[k] = maxOf(cur[k], rec[k]);
    // 🔁 복습 진도는 문장과 같은 규칙 — 최근에 복습한 쪽의 box·dueAt을 한 쌍으로
    const pv = pickReviewState(cur, rec);
    out.box = pv.box;
    out.dueAt = pv.dueAt;
  } else if (name === 'sessions') {
    for (const k of ['seconds', 'sentences', 'speakAttempts', 'speakPass', 'endedAt', 'puzzles', 'puzzleSolved', 'reviews', 'reviewPass']) out[k] = maxOf(cur[k], rec[k]);
  } else if (name === 'profile' && (rec.id === MATH_ID || cur.id === MATH_ID)) {
    return mergeMath(cur, rec); // 🔢 수학 진도는 'me' 규칙과 모양이 다르다
  } else if (name === 'profile') {
    // ⬆️ stonesSpent는 단조 카운터 — 옛 백업이 쓴 스톤 기록을 되돌리지 않게 max (Codex 10차 #8)
    for (const k of ['xp', 'throws', 'catches', 'coinsEarned', 'stonesSpent', 'updatedAt']) out[k] = maxOf(cur[k], rec[k]);
    out.caught = { ...(cur.caught || {}) };
    for (const id of Object.keys(rec.caught || {})) out.caught[id] = maxOf(out.caught[id], rec.caught[id]);
    // 💰 코인·🎒 가방·꾸밈은 구매·장착으로 줄어드는 값이라 큰 값이 아니라 "최근에 저장된 쪽"을 통째로 씀
    const latest = (Number(rec.updatedAt) || 0) > (Number(cur.updatedAt) || 0) ? rec : cur;
    out.coins = Number(latest.coins) || 0;
    out.items = { ...(latest.items || {}) };
    out.mons = { ...(latest.mons || {}) };
    out.partner = latest.partner || null;
    // 🥚 알: 산 것은 코인·가방과 한 묶음이라 최근 쪽 목록을 바탕으로 하되, **같은 알**은 진행을 합친다(날짜 합집합·부화·본 것은 한 번 됐으면 계속) —
    // 늦게 저장된 "4일째" 백업이 "부화한" 기록을 되돌려 두 번 부화시키지 않게 (Codex 7차 #5). 다른 쪽에만 있는 부화한 알(묘비)도 남긴다
    const older = latest === cur ? rec : cur;
    out.eggs = (latest.eggs || []).map((e) => {
      const o = (older.eggs || []).find((x) => x && e && x.id === e.id);
      const days = [...new Set([...((e && e.days) || []), ...((o && o.days) || [])])];
      return { ...e, days, hatchedAt: Math.max(Number(e && e.hatchedAt) || 0, Number(o && o.hatchedAt) || 0), seen: !!((e && e.seen) || (o && o.seen)) };
    });
    for (const o of (older.eggs || [])) if (o && o.hatchedAt && !out.eggs.some((e) => e && e.id === o.id)) out.eggs.push({ ...o, days: [...(o.days || [])] });
    // mons는 최근 쪽을 통째로 쓰지만, **되돌아가면 안 되는 것**은 여기서 살린다:
    //  🌈 이로치는 영구(OR) · ⬆️ 레벨은 스톤을 이미 쓴 결과(max) · 🧬 내보낸 마릿수는 단조 카운터(max —
    //  이게 max가 아니면 옛 백업이 진화를 되돌려 꼬부기가 어니부기와 함께 복제된다)
    for (const id of Object.keys(older.mons || {})) {
      const o = older.mons[id];
      if (!o) continue;
      const cur = out.mons[id] || {};
      const patch = {};
      if (o.shiny && !cur.shiny) patch.shiny = true;
      const lv = Math.max(Number(o.lv) || 0, Number(cur.lv) || 0);
      if (lv && lv !== (Number(cur.lv) || 0)) patch.lv = lv;
      const evo = Math.max(Number(o.evo) || 0, Number(cur.evo) || 0);
      if (evo && evo !== (Number(cur.evo) || 0)) patch.evo = evo;
      if (Object.keys(patch).length) out.mons[id] = { ...cur, ...patch };
    }
    // 🎟️ 기준선은 가방(교환권)과 짝이다 — 둘이 갈라지면 "샀는데 조건이 안 줄었다"가 된다.
    // 그래서 items와 같은 쪽(최근에 저장된 프로필)에서 가져온다. 옛 백업엔 이 값이 없다(그럼 null)
    out.unlockBase = latest.unlockBase || null;
  }
  return out;
}

/**
 * ★ 병합이 지켜 주는 범위 (Codex 10차 #3):
 *   이 병합은 **같은 줄기**를 합치는 것이다 — 한 기기의 두 창, 또는 옛 백업을 그 후손 기기에 되돌리는 경우.
 *   그때는 단조 카운터(throws·evo·stonesSpent·tot)와 max/OR 규칙으로 답이 맞는다.
 *   **갈라진 줄기**(같은 백업을 두 기기에 넣고 각자 다르게 진화시킨 뒤 둘을 합치는 것)는 범위 밖이다:
 *   이브이 한 마리가 샤미드와 쥬피썬더 둘로 늘어난다. 고치려면 조작마다 고유 id가 필요한데,
 *   집에서 태블릿 하나로 쓰는 앱에는 과한 구조다. 백업은 "한 기기의 안전망"으로만 쓴다.
 */
/** 기록 가져오기 (mergeStatRecord 규칙으로 병합). 반환: 처리한 레코드 수 */
export async function importStats(data) {
  if (!data || data.app !== 'shincoach') throw new Error('신코치 기록 파일이 아니에요');
  const db = await openDb();
  const tx = db.transaction([...STAT_STORES, 'items'], 'readwrite');
  let n = 0;
  for (const name of STAT_STORES) {
    const store = tx.objectStore(name);
    for (const rec of data[name] || []) {
      if (!rec || rec[store.keyPath] === undefined) continue;
      const cur = await promisify(store.get(rec[store.keyPath]));
      store.put(mergeStatRecord(name, cur, rec));
      n++;
    }
  }
  // 🚫 "복습에 쓰기"는 **부모가 고른 값**이라 되돌릴 때 같이 온다 (영상 자체는 복원하지 않는다 — 파일이 없다).
  // 기기를 옮기면 같은 영상도 id가 새로 생기므로 **제목으로도** 찾는다 (Codex 9차 #8)
  const flags = (data.items || []).filter((it) => it && typeof it.noReview === 'boolean');
  if (flags.length) {
    const store = tx.objectStore('items');
    const all = await promisify(store.getAll());
    for (const want of flags) {
      const hit = all.find((it) => String(it.id) === String(want.id))
        || all.find((it) => String(it.title || '') === String(want.title || '') && want.title);
      if (!hit || hit.noReview === want.noReview) continue;
      store.put({ ...hit, noReview: want.noReview, updatedAt: Date.now() });
      n++;
    }
  }
  await txDone(tx);
  return n;
}
