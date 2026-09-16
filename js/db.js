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

/** 전체 목록 (최신순, Blob 제외) */
export async function listItems() {
  const db = await openDb();
  const tx = db.transaction('items', 'readonly');
  const all = await promisify(tx.objectStore('items').getAll());
  return all.sort((a, b) => b.createdAt - a.createdAt);
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

/** 문장 기록 여러 건을 한 트랜잭션으로 저장 */
export async function putSentenceStats(records) {
  if (!records.length) return;
  const db = await openDb();
  const tx = db.transaction('sentenceStats', 'readwrite');
  const store = tx.objectStore('sentenceStats');
  for (const r of records) store.put(r);
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

export async function putDaily(rec) {
  const db = await openDb();
  const tx = db.transaction('daily', 'readwrite');
  tx.objectStore('daily').put(rec);
  await txDone(tx);
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
  for (const d of days) {
    if (!Array.isArray(d.essays) || !d.essays.length) continue;
    let touched = false;
    for (const e of d.essays) {
      if (!e || !e.id || !byId.has(e.id)) continue;
      e.coachFix = byId.get(e.id);
      e.fixedAt = Date.now();
      e.readAt = 0;               // 아이가 아직 안 읽음
      touched = true;
      n++;
    }
    if (touched) await putDaily(d);
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

/** ✍️ 아이가 아빠 교정문을 읽었다고 표시 (한 번만 보여주기 위해) */
export async function markEssayRead(id) {
  const days = await listDaily();
  for (const d of days) {
    const e = (d.essays || []).find((x) => x && x.id === id);
    if (!e) continue;
    e.readAt = Date.now();
    await putDaily(d);
    return true;
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

/**
 * 프로필에 증분만 더해서 저장 (한 트랜잭션 안에서 최신값 읽기 → 더하기 → 쓰기).
 * 홈 화면 앱과 Chrome 탭을 같이 열어도 서로의 XP·포켓몬을 덮어쓰지 않음. 반환: 저장된 최신 프로필
 */
export async function applyProfileDelta(delta) {
  const db = await openDb();
  const tx = db.transaction('profile', 'readwrite');
  const store = tx.objectStore('profile');
  const cur = (await promisify(store.get('me'))) || { id: 'me', xp: 0, caught: {}, throws: 0, catches: 0, coins: 0, coinsEarned: 0, items: {}, mons: {}, partner: null, updatedAt: 0 };
  const next = { ...cur, caught: { ...(cur.caught || {}) }, items: { ...(cur.items || {}) }, mons: { ...(cur.mons || {}) } };
  next.xp = (Number(cur.xp) || 0) + (delta.xp || 0);
  next.throws = (Number(cur.throws) || 0) + (delta.throws || 0);
  next.catches = (Number(cur.catches) || 0) + (delta.catches || 0);
  next.coins = Math.max(0, (Number(cur.coins) || 0) + (delta.coins || 0));
  next.coinsEarned = (Number(cur.coinsEarned) || 0) + (delta.coinsEarned || 0);
  for (const id of Object.keys(delta.caught || {})) {
    const n = (next.caught[id] || 0) + delta.caught[id]; // ⚔️ 배틀에서 잃으면 −1
    if (n > 0) next.caught[id] = n; else delete next.caught[id];
  }
  // 🎒 가방: 개수를 더하고(구매 +, 장착·사용 −) 0 이하는 지움
  for (const id of Object.keys(delta.items || {})) {
    const n = (next.items[id] || 0) + delta.items[id];
    if (n > 0) next.items[id] = n; else delete next.items[id];
  }
  // 꾸밈: 포켓몬별로 바뀐 필드만 덮어씀
  for (const id of Object.keys(delta.mons || {})) next.mons[id] = { ...(next.mons[id] || {}), ...delta.mons[id] };
  if (delta.partner !== undefined) next.partner = delta.partner; // 🤝 파트너는 정해진 값으로
  next.updatedAt = Date.now();
  store.put(next);
  await txDone(tx);
  return next;
}

export async function putProfile(rec) {
  const db = await openDb();
  const tx = db.transaction('profile', 'readwrite');
  tx.objectStore('profile').put(rec);
  await txDone(tx);
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
