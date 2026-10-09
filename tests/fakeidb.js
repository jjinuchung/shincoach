// 🧪 node 테스트용 작은 IndexedDB — db.js가 쓰는 만큼만 (open · transaction · objectStore get/getAll/put/delete · oncomplete/onabort)
// (테스트 파일이 아니다 — 이 파일을 **db.js·xp.js보다 먼저** import하면 globalThis.indexedDB가 생긴다)
//
// 왜 (Codex 43차 #2): node에는 indexedDB가 없어 xp.js의 저장 연산이 늘 "저장 실패 → 메모리로 이어 감"으로 통과했다.
// 그래서 태블릿에서 도는 길(트랜잭션)과 저장이 실패할 때의 길이 테스트에 하나도 안 붙어 있었다.
//  · 쓰기는 커밋 때 한꺼번에 — 중단되면 아무것도 안 남는다 (진짜 IndexedDB처럼 원자적)
//  · 트랜잭션은 하나씩 차례로 (두 쓰기가 같은 옛 값을 읽고 서로 덮지 않게)
//  · fakeIdb.failNext('profile') — 그 저장소를 쓰는 다음 쓰기 트랜잭션 하나를 중단한다 (저장 실패 흉내)
//  · fakeIdb.get / fakeIdb.put — 저장된 값을 직접 읽고 쓴다 (다른 창이 쓴 것 흉내)
const data = new Map(); // 저장소 이름 → Map(열쇠 → 값)
const keyPaths = new Map();
const fails = [];
let chain = Promise.resolve();

const copy = (v) => (v === undefined ? undefined : structuredClone(v));

function makeTx(names) {
  const scope = Array.isArray(names) ? [...names] : [names];
  const writes = [];
  let pending = 0;
  let finished = false;
  let timer = null;
  const tx = { oncomplete: null, onerror: null, onabort: null, error: null };
  let startRes;
  const started = new Promise((r) => { startRes = r; });
  let doneRes;
  const done = new Promise((r) => { doneRes = r; });
  const prev = chain;
  chain = prev.then(() => done);
  prev.then(() => { startRes(); schedule(); });

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(() => { if (pending === 0 && !finished) commit(); }, 0);
  }
  function commit() {
    finished = true;
    const fi = writes.length ? fails.findIndex((s) => scope.includes(s)) : -1;
    if (fi >= 0) {
      fails.splice(fi, 1);
      tx.error = new Error('저장 실패 (테스트가 일부러)');
      if (tx.onabort) tx.onabort();
      doneRes();
      return;
    }
    for (const w of writes) w();
    if (tx.oncomplete) tx.oncomplete();
    doneRes();
  }
  function request(fn) {
    const r = { result: undefined, error: null, onsuccess: null, onerror: null };
    pending += 1;
    started.then(() => setTimeout(() => {
      pending -= 1;
      try { r.result = fn(); if (r.onsuccess) r.onsuccess(); } catch (e) { r.error = e; if (r.onerror) r.onerror(); }
      schedule();
    }, 0));
    return r;
  }
  tx.objectStore = (n) => {
    if (!scope.includes(n)) throw new Error(`트랜잭션 범위 밖의 저장소: ${n}`);
    const m = data.get(n);
    const kp = keyPaths.get(n);
    return {
      get: (k) => request(() => copy(m.get(k))),
      getAll: () => request(() => [...m.values()].map(copy)),
      put: (v) => { const c = copy(v); writes.push(() => m.set(c[kp], c)); return request(() => c[kp]); },
      delete: (k) => { writes.push(() => m.delete(k)); return request(() => undefined); },
      createIndex() {},
    };
  };
  return tx;
}

const db = {
  objectStoreNames: { contains: (n) => data.has(n) },
  createObjectStore(n, o = {}) { data.set(n, new Map()); keyPaths.set(n, o.keyPath); return { createIndex() {} }; },
  transaction: (names) => makeTx(names),
  close() {},
  onversionchange: null,
};
let upgraded = false;

globalThis.indexedDB = {
  open() {
    const req = { result: null, error: null, onupgradeneeded: null, onsuccess: null, onerror: null, onblocked: null };
    setTimeout(() => {
      req.result = db;
      if (!upgraded) { upgraded = true; if (req.onupgradeneeded) req.onupgradeneeded(); }
      if (req.onsuccess) req.onsuccess();
    }, 0);
    return req;
  },
};

export const fakeIdb = {
  /** 저장된 값 (복사본) */
  get: (store, key) => copy((data.get(store) || new Map()).get(key)),
  /** 저장소에 직접 쓴다 — 다른 창이 쓴 것처럼 */
  put: (store, value) => { const c = copy(value); data.get(store).set(c[keyPaths.get(store)], c); },
  /** 그 저장소를 쓰는 다음 쓰기 트랜잭션 하나를 중단한다 */
  failNext: (store) => { fails.push(store); },
  /** 걸어 둔 실패가 아직 남았나 (테스트가 엉뚱한 연산에 실패를 쓰지 않았는지 확인) */
  failsLeft: () => fails.length,
};
