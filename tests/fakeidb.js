// 🧪 node 테스트용 작은 IndexedDB — db.js가 쓰는 만큼만 (open · transaction · objectStore get/getAll/put/delete · oncomplete/onabort)
// (테스트 파일이 아니다 — 이 파일을 **db.js·xp.js보다 먼저** import하면 globalThis.indexedDB가 생긴다)
//
// 왜 (Codex 43차 #2): node에는 indexedDB가 없어 xp.js의 저장 연산이 늘 "저장 실패 → 메모리로 이어 감"으로 통과했다.
// 그래서 태블릿에서 도는 길(트랜잭션)과 저장이 실패할 때의 길이 테스트에 하나도 안 붙어 있었다.
//  · 쓰기는 커밋 때 한꺼번에 — 중단되면 아무것도 안 남는다 (진짜 IndexedDB처럼 원자적)
//  · 트랜잭션은 하나씩 차례로 (두 쓰기가 같은 옛 값을 읽고 서로 덮지 않게)
//  · fakeIdb.failNext('profile') — 그 저장소를 쓰는 다음 쓰기 트랜잭션 하나를 중단한다 (저장 실패 흉내)
//  · fakeIdb.get / fakeIdb.put — 저장된 값을 직접 읽고 쓴다 (다른 창이 쓴 것 흉내)
//  · fakeIdb.failNextRead('daily') — 그 저장소의 다음 getAll 하나가 오류 (목록 읽기 실패 흉내, v329 🔥)
//  · fakeIdb.failNextGet('profile', 'math') — 그 저장소의 다음 get 하나가 오류 · 열쇠를 주면 그 줄만 (한 줄 읽기 실패 흉내, v396)
//  · fakeIdb.failNextOpen() — 다음 indexedDB.open 하나가 오류 · fakeIdb.throwNextOpen() — 그 자리에서 던짐 · fakeIdb.dropConnections() — 열린 연결이 끊김 ·
//    fakeIdb.lateClose() · fakeIdb.opens() (v443)
const data = new Map(); // 저장소 이름 → Map(열쇠 → 값)
const keyPaths = new Map();
const fails = [];
const readFails = [];
const getFails = [];
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
      keyPath: kp, // db.importStats가 rec[store.keyPath]로 열쇠를 읽는다 (v361 — 없으면 가져오기가 모든 줄을 조용히 건너뛰었다)
      get: (k) => request(() => {
        const fi = getFails.findIndex((f) => f.store === n && (f.key === undefined || f.key === k));
        if (fi >= 0) { const [f] = getFails.splice(fi, 1); const e = new Error(`읽기 실패 흉내: ${n}`); if (f.name) e.name = f.name; throw e; }
        return copy(m.get(k));
      }),
      getAll: () => request(() => {
        const fi = readFails.indexOf(n);
        if (fi >= 0) { readFails.splice(fi, 1); throw new Error(`읽기 실패 흉내: ${n}`); }
        return [...m.values()].map(copy);
      }),
      getAllKeys: () => request(() => [...m.keys()]),
      index: (field) => ({ getAll: (v) => request(() => [...m.values()].filter((r) => r[field] === v).map(copy)) }), // db.getSentenceStats (v396)
      put: (v) => { const c = copy(v); writes.push(() => m.set(c[kp], c)); return request(() => c[kp]); },
      delete: (k) => { writes.push(() => m.delete(k)); return request(() => undefined); },
      createIndex() {},
    };
  };
  return tx;
}

// 연결은 열 때마다 새로(자료는 함께 쓴다) — 닫힌 연결로 트랜잭션을 열면 진짜처럼 InvalidStateError (v443 — 다시 여는 길을 시험하려고)
const conns = [];
let openFails = 0;
let openThrows = 0;
let openCount = 0;
function makeConn() {
  const c = {
    closed: false,
    objectStoreNames: { contains: (n) => data.has(n) },
    createObjectStore(n, o = {}) { data.set(n, new Map()); keyPaths.set(n, o.keyPath); return { createIndex() {} }; },
    transaction: (names) => {
      if (c.closed) { const e = new Error('The database connection is closing.'); e.name = 'InvalidStateError'; throw e; }
      return makeTx(names);
    },
    close() { c.closed = true; },
    onversionchange: null,
    onclose: null,
  };
  conns.push(c);
  return c;
}
let upgraded = false;

globalThis.indexedDB = {
  open() {
    openCount += 1;
    if (openThrows > 0) { openThrows -= 1; const e = new Error('저장소 열기 실패 (테스트가 일부러 · 그 자리에서 던짐)'); e.name = 'SecurityError'; throw e; }
    const req = { result: null, error: null, onupgradeneeded: null, onsuccess: null, onerror: null, onblocked: null };
    setTimeout(() => {
      if (openFails > 0) {
        openFails -= 1;
        req.error = new Error('저장소 열기 실패 (테스트가 일부러)');
        if (req.onerror) req.onerror();
        return;
      }
      req.result = makeConn();
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
  /** 그 저장소의 다음 getAll 하나를 오류로 */
  failNextRead: (store) => { readFails.push(store); },
  /** 그 저장소의 다음 get 하나를 오류로 (key를 주면 그 줄을 읽을 때만 · name을 주면 그 이름의 오류로 — 끊긴 연결 흉내 'InvalidStateError'·'AbortError', v443) */
  failNextGet: (store, key, name) => { getFails.push({ store, key, name }); },
  /** 걸어 둔 실패가 아직 남았나 (테스트가 엉뚱한 연산에 실패를 쓰지 않았는지 확인) */
  failsLeft: () => fails.length + readFails.length + getFails.length,
  /** 모든 저장소를 비운다 — 새 기기 흉내 (☁️ 되살리기, v361) */
  clear: () => { for (const m of data.values()) m.clear(); },
  /** 다음 indexedDB.open 하나를 오류로 (저장소 열기 실패 흉내, v443) */
  failNextOpen: () => { openFails += 1; },
  /** 다음 indexedDB.open 하나가 그 자리에서 던진다 — onerror를 안 거치는 실패(SecurityError 등) 흉내 (v443) */
  throwNextOpen: () => { openThrows += 1; },
  /** 열린 연결을 모두 끊는다 — 브라우저가 연결을 닫은 흉내(그 연결은 InvalidStateError · onclose가 불린다, v443) · 끊은 수를 돌려준다 */
  dropConnections: () => {
    const live = conns.filter((c) => !c.closed);
    for (const c of live) { c.closed = true; if (c.onclose) c.onclose(); }
    return live.length;
  },
  /** 이미 끊긴 연결의 onclose를 한 번 더 — 늦게 온 닫힘 알림 흉내 (v443) */
  lateClose: () => { for (const c of conns) if (c.closed && c.onclose) c.onclose(); },
  /** indexedDB.open이 불린 수 (v443) */
  opens: () => openCount,
};
