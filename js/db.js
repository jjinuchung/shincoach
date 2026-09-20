// IndexedDB 저장소: 영상(Blob) + 자막 텍스트 + 진행 상태
// items 스토어: 메타데이터(제목, 자막, 진행) / blobs 스토어: 영상 Blob (목록 조회 시 무거운 Blob을 안 읽기 위해 분리)

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
  'reviewSentences', 'reviewItems', 'reviewRounds', 'reviewSkips', 'mushrooms', 'matches',
  'mathQ', 'mathOk', 'mathRounds', 'mathSeconds']; // 🔢 수학: 푼 문항·정답·회차·시간
const DAILY_FLAGS = ['goalRewarded', 'hpMissed', 'reviewGolden', 'essayDone'];

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
  return { id: 'me', xp: 0, caught: {}, throws: 0, catches: 0, coins: 0, coinsEarned: 0, items: {}, mons: {}, partner: null, unlockBase: null, updatedAt: 0 };
}

/** 규칙이 마음껏 고칠 수 있게 얕은 복사 (하위 객체까지) */
export function cloneProfile(p) {
  const cur = p || emptyProfile();
  return { ...emptyProfile(), ...cur, caught: { ...(cur.caught || {}) }, items: { ...(cur.items || {}) }, mons: { ...(cur.mons || {}) } };
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
  return { id: MATH_ID, concepts: {}, placed: {}, miss: {}, rounds: 0, updatedAt: 0 };
}

function cloneMath(m) {
  const out = { ...emptyMath(), ...m, concepts: {}, placed: { ...(m.placed || {}) }, miss: { ...(m.miss || {}) } };
  for (const [k, v] of Object.entries(m.concepts || {})) out.concepts[k] = { ...v };
  return out;
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

/** 🔢 두 수학 진도 병합 — 개념은 최근에 푼 쪽의 상태, 오개념 횟수·회차는 큰 값, 진단 여부는 OR */
export function mergeMath(cur, rec) {
  const out = cloneMath(cur || emptyMath());
  for (const [k, v] of Object.entries((rec && rec.concepts) || {})) {
    const mine = out.concepts[k];
    out.concepts[k] = (!mine || (Number(v.lastAt) || 0) > (Number(mine.lastAt) || 0)) ? { ...v } : mine;
  }
  for (const [k, v] of Object.entries((rec && rec.placed) || {})) out.placed[k] = out.placed[k] || v;
  for (const [k, v] of Object.entries((rec && rec.miss) || {})) out.miss[k] = Math.max(Number(out.miss[k]) || 0, Number(v) || 0);
  out.rounds = Math.max(Number(out.rounds) || 0, Number(rec && rec.rounds) || 0);
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
  return { done: n(base && base.done), reviewed: n(base && base.reviewed) };
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

/** ❤️ HP 바꾸기 (+🧪 물약 소모) → { ok, from, to, profile } */
export function applyHpChange(monId, by, max, spendItem) {
  return mutateProfile((p) => hpChangeRule(p, monId, by, max, spendItem));
}

/** ⚔️ 배틀 패배 누적 → { losses, lost, profile } */
export function applyBattleLoss(monId, lossesToLose) {
  return mutateProfile((p) => battleLossRule(p, monId, lossesToLose));
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
    id: it.id, title: it.title, duration: it.duration, lastCue: it.lastCue, createdAt: it.createdAt,
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
    for (const k of ['seconds', 'speakAttempts', 'speakPass', 'puzzles', 'puzzleSolved', 'battles', 'reviewSentences', 'reviewItems', 'reviewRounds', 'reviewSkips', 'mushrooms']) out[k] = maxOf(cur[k], rec[k]);
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
    for (const k of ['xp', 'throws', 'catches', 'coinsEarned', 'updatedAt']) out[k] = maxOf(cur[k], rec[k]);
    out.caught = { ...(cur.caught || {}) };
    for (const id of Object.keys(rec.caught || {})) out.caught[id] = maxOf(out.caught[id], rec.caught[id]);
    // 💰 코인·🎒 가방·꾸밈은 구매·장착으로 줄어드는 값이라 큰 값이 아니라 "최근에 저장된 쪽"을 통째로 씀
    const latest = (Number(rec.updatedAt) || 0) > (Number(cur.updatedAt) || 0) ? rec : cur;
    out.coins = Number(latest.coins) || 0;
    out.items = { ...(latest.items || {}) };
    out.mons = { ...(latest.mons || {}) };
    out.partner = latest.partner || null;
    // 🎟️ 기준선은 가방(교환권)과 짝이다 — 둘이 갈라지면 "샀는데 조건이 안 줄었다"가 된다.
    // 그래서 items와 같은 쪽(최근에 저장된 프로필)에서 가져온다. 옛 백업엔 이 값이 없다(그럼 null)
    out.unlockBase = latest.unlockBase || null;
  }
  return out;
}

/** 기록 가져오기 (mergeStatRecord 규칙으로 병합). 반환: 처리한 레코드 수 */
export async function importStats(data) {
  if (!data || data.app !== 'shincoach') throw new Error('신코치 기록 파일이 아니에요');
  const db = await openDb();
  const tx = db.transaction(STAT_STORES, 'readwrite');
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
  await txDone(tx);
  return n;
}
