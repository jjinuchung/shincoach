// 🎬 영어 영상 시험 원고 받기 (v430, 2026-11-16 아버님 「추천대로」) — 📰 news.js 꼴 그대로 (이 파일은 받기·사본만 · 화면 없음)
//
// 시험 문제는 영상 대사로 만들어 저작권이 있다 → 공개 저장소(앱 사이트)에 두지 않고 비공개 저장소 english/tests/t1~t3.json
//   (최상위 배열 · 줄 = 문제 하나 · 영상 여섯·여섯·다섯 편)을 📤 열쇠로 받아 **이 기기의 blobs('entest:list')에만** 둔다 (백업 밖) ·
//   열쇠가 없는 기기는 받은 것이 없어 「📝 시험」이 아예 안 보인다 · 문제를 고칠 때 배포가 필요 없다
// 받은 줄은 하나씩 검사한다(entest.checkTestQ) — 깨진 줄·겹친 id·단계가 덜 찬 영상의 줄은 안 쓰고 📊 📥 줄에 ⚠️로 (noteReadCheck)
// 파일마다 따로: 한 파일을 못 받으면(빈 목록·실패·모두 깨짐) 그 파일은 받아 둔 것 그대로 · 받은 파일만 바꾼다
// ★ 받은 원고가 고쳐져도 영상 제목(from)·단계는 그대로라야 시험 기록(profile.enTest — 제목 열쇠)이 이어진다
// 화면이 부른다: 들어올 때 loadEnTests() → 그다음 syncEnTests() · 그리는 중에는 enTestsNow()
// ★ 아무 화면도 import하지 않는다 — entest(검사)·db(사본)만, upload(받기)는 쓸 때 불러온다
import { checkTestQ, testsOf } from './entest.js';
import { getEnTestCache, putEnTestCache } from './db.js';

/** 비공개 저장소 원고 경로 — 이 차례로 합친다(앞 파일의 id가 이긴다) · upload.js PRIVATE_EN_TESTS와 같은 경로(시험이 본다) */
export const EN_TEST_PATHS = ['english/tests/t1.json', 'english/tests/t2.json', 'english/tests/t3.json'];
/** 받기 — 10분에 한 번까지 · 파일마다 30초 넘으면 끊는다(받아 둔 것 그대로) */
export const SYNC_MS = 10 * 60 * 1000;
export const LIST_MS = 30 * 1000;
/** 파일 하나에서 받아 둘 줄 상한 (지금 파일마다 500~600줄 — 넉넉히) */
export const MAX_ROWS = 2000;
const AT_KEY = 'shincoach.enTestAt';
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

function load(k, d) {
  try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v === null ? d : v; } catch { return d; }
}
function save(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; }
}

/** 원고 목록 하나 → 검사를 통과한 줄 (순수 · 저장용 — 원고 줄 그대로) · MAX_ROWS까지 */
export function rowsOf(list) {
  const out = [];
  for (const q of Array.isArray(list) ? list : []) {
    if (out.length >= MAX_ROWS) break;
    if (!checkTestQ(q).length) out.push(q);
  }
  return out;
}

/**
 * 경로마다 원고 → 합친 시험 (순수) — EN_TEST_PATHS 차례로(앞 파일의 id가 이긴다) · 없는 경로는 건너뛴다
 * @param {Object<string, object[]>} files { 경로: 원고 배열 }
 * @returns {{tests: Object<string, object[][]>, closed: string[], bad: Object<string, number>}}
 *   tests = entest.testsOf의 tests · closed = 단계가 덜 차 안 연 영상 · bad = 경로마다 안 쓴 줄(깨진 줄·겹친 id·안 연 영상 줄·넘친 줄 · 상한 넘은 줄)
 */
export function testFilesOf(files) {
  const rows = [];
  const from = new Map();
  const bad = {};
  for (const p of EN_TEST_PATHS) {
    if (!isObj(files) || !Array.isArray(files[p])) continue;
    bad[p] = 0;
    files[p].forEach((q, k) => { if (k < MAX_ROWS) { rows.push(q); from.set(rows.length - 1, p); } else bad[p] += 1; });
  }
  const r = testsOf(rows);
  rows.forEach((q, k) => { if (!r.used.has(q)) bad[from.get(k)] += 1; });
  return { tests: r.tests, closed: r.closed, bad };
}

// 이 실행의 사본 — { files 경로마다 줄, tests, closed, at blobs 기록을 쓴 때 } · loadEnTests가 blobs에서 한 번 읽어 채우고 syncEnTests가 바꾼다
let mem = null;
let loading = null;
const EMPTY = { files: {}, tests: {}, closed: [], at: 0 };

/**
 * 지금 쓸 수 있는 시험 (동기) — { tests: { 영상 제목: [[1단계 20문제] … [5단계]] }, closed } · 아직 안 읽었으면 빈 것
 * (단계 배열은 새 배열 — 받은 쪽이 섞어도 사본은 그대로 · 문제 줄은 사본과 같은 객체라 고치지 말 것)
 */
export function enTestsNow() {
  const m = mem || EMPTY;
  const tests = {};
  for (const [t, stages] of Object.entries(m.tests)) tests[t] = stages.map((s) => s.slice());
  return { tests, closed: m.closed.slice() };
}

/** 사본 기록 → 메모리 꼴 (깨진 줄은 다시 거른다 — 옛 판 앱이 둔 사본이어도) */
function memOf(rec) {
  const files = {};
  for (const p of EN_TEST_PATHS) if (rec && isObj(rec.files) && Array.isArray(rec.files[p])) files[p] = rec.files[p];
  const all = testFilesOf(files);
  return { files, tests: all.tests, closed: all.closed, at: rec && Number(rec.at) > 0 ? Number(rec.at) : 0 };
}

/** 기기 사본(blobs)을 다시 읽어 내 메모리 사본과 쓴 때(at)가 **다르면** 바꾼다 → 바뀌었나 (📰 news.js와 같은 까닭 — 다른 창이 받아 둔 것도 보게) */
async function refreshFromCache(deps) {
  let rec = null;
  try { rec = await (deps.getCache || getEnTestCache)(); } catch { return false; }
  const at = rec && Number(rec.at) > 0 ? Number(rec.at) : 0;
  if (!rec || at === ((mem && mem.at) || 0)) return false;
  mem = memOf(rec);
  return true;
}

/**
 * blobs의 사본을 한 번 읽어 메모리에 (이 실행에서 한 번만 — 못 읽으면 빈 것) → enTestsNow()
 * @param {{getCache?:Function}} [deps] 시험용
 */
export function loadEnTests(deps = {}) {
  if (mem) return Promise.resolve(enTestsNow());
  if (!loading) {
    loading = (async () => {
      let rec = null;
      try { rec = await (deps.getCache || getEnTestCache)(); } catch { rec = null; }
      if (!mem) mem = memOf(rec);
      return enTestsNow();
    })().finally(() => { loading = null; });
  }
  return loading;
}

let syncing = null;
/**
 * 비공개 저장소에서 시험 원고를 받아 이 기기에 둔다 — 10분에 한 번까지(force면 바로) · 열쇠가 없거나 못 받으면 받아 둔 것 그대로 ·
 * 파일마다 따로(못 받은 파일·모두 깨진 파일은 받아 둔 것 그대로) · 받은 파일마다 📥 줄에 안 쓴 줄 수(noteReadCheck)
 * @param {{now?:Function, readList?:Function, noteCheck?:Function, listMs?:number, getCache?:Function, putCache?:Function}} [deps] 시험용 —
 *   readList(경로) → 원고 배열 · noteCheck(경로, { rows, bad }) · putCache({ 경로: 줄 }) (바뀐 파일만)
 * @returns {Promise<{tests: object, closed: string[], changed: boolean}>} changed = 이번에 시험이 바뀌었나(화면이 다시 그릴지)
 */
export function syncEnTests(force = false, deps = {}) {
  if (syncing) return syncing;
  syncing = doSync(force, deps).finally(() => { syncing = null; });
  return syncing;
}

async function doSync(force, deps) {
  const hadMem = !!mem;
  await loadEnTests(deps);
  const local = hadMem ? await refreshFromCache(deps) : false; // 다른 창이 받아 둔 것부터 — 방금 처음 읽었으면 두 번 읽지 않는다
  const kept = (changed = false) => ({ ...enTestsNow(), changed: changed || local });
  const now = (deps.now || Date.now)();
  const at = Number(load(AT_KEY, 0)) || 0;
  if (!force && at > 0 && now - at >= 0 && now - at < SYNC_MS) return kept();
  save(AT_KEY, now);
  const readList = deps.readList || (async (p) => (await import('./upload.js')).readPrivateList(p));
  const note = deps.noteCheck || (async (p, c) => (await import('./upload.js')).noteReadCheck(p, c));
  const ms = deps.listMs || LIST_MS;
  // 세 파일을 함께 받는다 — 하나가 늦거나 실패해도 나머지는 그대로
  const lists = await Promise.all(EN_TEST_PATHS.map(async (p) => {
    try { const l = await within(readList(p), ms); return Array.isArray(l) ? l : []; } catch { return []; }
  }));
  const got = {};
  EN_TEST_PATHS.forEach((p, k) => { if (lists[k].length) got[p] = lists[k]; });
  if (!Object.keys(got).length) return kept(); // 열쇠 없음·못 받음·빈 목록 — 받아 둔 것 그대로
  const base = mem || EMPTY;
  // 받은 파일마다 검사를 통과한 줄 — 하나도 없으면 그 파일은 받아 둔 것 그대로
  const fresh = {};
  for (const [p, list] of Object.entries(got)) {
    const rows = rowsOf(list);
    if (rows.length) fresh[p] = rows;
  }
  // 받아 둔 것과 똑같은 파일은 다시 쓰지 않는다(태블릿 저장을 아끼게)
  const write = {};
  for (const [p, rows] of Object.entries(fresh)) if (JSON.stringify(rows) !== JSON.stringify(base.files[p] || null)) write[p] = rows;
  const files = { ...base.files, ...fresh };
  const all = testFilesOf(files);
  let saved = true;
  let rec = null;
  if (Object.keys(write).length) {
    try { rec = await (deps.putCache || putEnTestCache)(write); } catch { saved = false; }
  }
  // 📥 받은 파일마다 안 쓴 줄 수 — 깨진 줄 + 앞 파일과 겹친 id + 단계가 덜 찬 영상 줄 · 못 쓴 파일(모두 깨짐·저장 실패)은 모두
  for (const [p, list] of Object.entries(got)) {
    const used = fresh[p] && (saved || !write[p]);
    const bad = used ? (list.length - fresh[p].length) + (all.bad[p] || 0) : list.length;
    try { await note(p, { rows: list.length, bad }); } catch { /* 못 적어도 */ }
  }
  // 저장 공간이 차서 못 두었으면 받아 둔 것 그대로(📰 신문과 같다 — 📥에는 ⚠️로)
  if (!saved) return kept();
  const changed = Object.keys(write).length > 0;
  if (changed) {
    // 저장이 돌려준 합친 기록으로 — 그사이 다른 창이 쓴 파일도 함께(트랜잭션 안에서 옛 사본에 겹쳐 넣었다)
    if (rec && isObj(rec.files)) mem = memOf(rec); else mem = { files, tests: all.tests, closed: all.closed, at: (mem && mem.at) || 0 };
  }
  return kept(changed);
}

/** p가 ms 안에 안 끝나면 실패로 */
function within(p, ms) {
  let t;
  const late = new Promise((_, reject) => { t = setTimeout(() => reject(new Error('시간 넘음')), ms); });
  return Promise.race([Promise.resolve(p), late]).finally(() => clearTimeout(t));
}
