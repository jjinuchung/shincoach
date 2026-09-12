// IndexedDB 저장소: 영상(Blob) + 자막 텍스트 + 진행 상태
// items 스토어: 메타데이터(제목, 자막, 진행) / blobs 스토어: 영상 Blob (목록 조회 시 무거운 Blob을 안 읽기 위해 분리)

const DB_NAME = 'shincoach';
const DB_VERSION = 1;

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
    };
    req.onsuccess = () => resolve(req.result);
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
