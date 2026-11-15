// 📰 신문 칸 (v428, 2026-11-15 아버님 기본안 다섯 「추천대로」) — 어린이신문 기사를 국어·논술 **안의** 📰 칸으로 (이 파일은 받기·사본만 · 화면 없음)
//
// 기사 글은 저작권이 있어 공개 저장소(앱 사이트)에 두지 않는다 → 비공개 저장소 news/n1~n4.json(줄마다 { card 국어 카드, topic? 논술 주제 })을
//   📤 열쇠로 받아 **이 기기의 blobs('news:list')에만** 둔다 (🎹 책 곡 pianosongs.js · 🐸 기술 그림 battlefx.js와 같은 꼴 · 백업 밖)
//   · 열쇠가 없는 기기(PC·어머님 아이폰)는 받은 것이 없어 📰 칸이 아예 안 보인다 · 기사를 더하고 고칠 때 배포가 필요 없다
// 받은 원고는 줄마다 검사한다 — 카드 korean.checkNewsCard · 주제 nonsul.checkNewsTopic(깨진 주제는 주제만 뺀다) · 깨진 줄은 📊 📥 줄에 ⚠️로
// 파일마다 따로: 한 파일을 못 받으면(빈 목록·실패·모두 깨짐) 그 파일은 받아 둔 것 그대로 · 받은 파일만 바꾼다
// ★ 받은 원고가 고쳐져도 카드 id·물음 차례는 그대로라야 별·물음 기록(korDone 'K7xx:별' · korQMiss 'K7xx-n')과 진도(kordrip bnews)가 맞는다
// 화면(koreanview·newsview·nonsulview)이 부른다: 들어올 때 loadNews() → 그다음 syncNews() · 그리는 중에는 newsNow()
// ★ 아무 화면도 import하지 않는다 — korean·nonsul(검사) · db(사본)만, upload(받기)는 쓸 때 불러온다
import { checkNewsCard } from './korean.js';
import { checkNewsTopic } from './nonsul.js';
import { getNewsCache, putNewsCache } from './db.js';

/** 비공개 저장소 원고 경로 — 이 차례로 합친다(앞 파일의 id가 이긴다) · upload.js READ_NAMES와 같은 경로(시험이 본다) */
export const NEWS_PATHS = ['news/n1.json', 'news/n2.json', 'news/n3.json', 'news/n4.json'];
/** 받기 — 10분에 한 번까지 · 파일마다 30초 넘으면 끊는다(받아 둔 것 그대로) */
export const SYNC_MS = 10 * 60 * 1000;
export const LIST_MS = 30 * 1000;
/** 받아 둘 기사 수 상한 (지금 104편 — 넉넉히) */
export const MAX_NEWS = 300;
const AT_KEY = 'shincoach.newsAt';
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

function load(k, d) {
  try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v === null ? d : v; } catch { return d; }
}
function save(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; }
}

/**
 * 원고 줄들을 out에 더한다 — ids = 이미 쓴 카드 id(겹침) · out.cards가 max면 그 뒤는 못 받음
 * @returns {{bad:number, raws:object[]}} bad = 빠진 줄 + 빠진 주제 · raws = 쓴 줄을 고친 꼴 { card, topic? }(저장용 — 깨진 주제는 뺌)
 */
function takeRows(list, out, ids, max = MAX_NEWS) {
  let bad = 0;
  const raws = [];
  for (const raw of Array.isArray(list) ? list : []) {
    if (!isObj(raw) || !isObj(raw.card) || out.cards.length >= max || checkNewsCard(raw.card, ids).length) { bad += 1; continue; }
    const card = raw.card;
    out.cards.push(card);
    if (raw.topic === undefined) { raws.push({ card }); continue; }
    if (checkNewsTopic(raw.topic, card).length) { bad += 1; raws.push({ card }); continue; } // 깨진 주제는 주제만 뺀다 — 기사는 국어로 읽는다
    out.topics.push(raw.topic);
    raws.push({ card, topic: raw.topic });
  }
  return { bad, raws };
}

/**
 * 원고 목록 하나 → 쓸 기사 (순수) — 카드는 checkNewsCard · 주제는 checkNewsTopic · 겹친 id·상한(max — 시험이 작게 줄 수 있다) 넘음은 빠진다
 *   (신문 카드 번호 몫 K701~K999가 299개라 MAX_NEWS는 겹침 검사 뒤의 마지막 보루)
 * @returns {{cards: object[], topics: object[], bad: number, raws: object[]}}
 */
export function newsOf(list, max = MAX_NEWS) {
  const out = { cards: [], topics: [] };
  const r = takeRows(list, out, new Set(), max);
  return { cards: out.cards, topics: out.topics, bad: r.bad, raws: r.raws };
}

/**
 * 경로마다 원고 → 합친 기사 (순수) — NEWS_PATHS 차례로(앞 파일의 id가 이긴다 · MAX_NEWS는 모두 합쳐) · bad·raws는 경로마다
 * @param {Object<string, object[]>} files { 경로: 원고 배열 } (없는 경로는 건너뛴다)
 * @returns {{cards: object[], topics: object[], bad: Object<string, number>, raws: Object<string, object[]>}}
 */
export function newsFilesOf(files) {
  const out = { cards: [], topics: [] };
  const ids = new Set();
  const bad = {};
  const raws = {};
  for (const p of NEWS_PATHS) {
    if (!isObj(files) || !Array.isArray(files[p])) continue;
    const r = takeRows(files[p], out, ids);
    bad[p] = r.bad;
    raws[p] = r.raws;
  }
  return { cards: out.cards, topics: out.topics, bad, raws };
}

// 이 실행의 사본 — { files 경로마다 줄, cards, topics, at blobs 기록을 쓴 때 } · loadNews가 blobs에서 한 번 읽어 채우고 syncNews가 바꾼다
let mem = null;
let loading = null;
const EMPTY = { files: {}, cards: [], topics: [], at: 0 };

/** 지금 쓸 수 있는 기사 (동기) — { cards, topics } · 아직 안 읽었으면 빈 목록 (목록은 새 배열 — 받은 쪽이 고쳐도 사본은 그대로) */
export function newsNow() {
  const m = mem || EMPTY;
  return { cards: m.cards.slice(), topics: m.topics.slice() };
}

/** 사본 기록 → 메모리 꼴 (깨진 줄은 다시 거른다 — 옛 판 앱이 둔 사본이어도) */
function memOf(rec) {
  const files = {};
  for (const p of NEWS_PATHS) if (rec && isObj(rec.files) && Array.isArray(rec.files[p])) files[p] = rec.files[p];
  const all = newsFilesOf(files);
  return { files, cards: all.cards, topics: all.topics, at: rec && Number(rec.at) > 0 ? Number(rec.at) : 0 };
}

/**
 * 기기 사본(blobs)을 다시 읽어 내 메모리 사본과 쓴 때(at)가 **다르면** 바꾼다 → 바뀌었나 (🔍 Codex 230차 #2 · 231차)
 *   두 창이 10분 막음(AT_KEY)은 같이 쓰지만 메모리 사본은 창마다라 — 다른 창이 받아 둔 기사를 이 창도 보게, 10분 막음·열쇠 없음·인터넷 없음과 상관없이
 *   「더 새로운가」가 아니라 「다른가」로 본다: 시계를 뒤로 돌렸거나 두 창의 저장 차례가 엇갈려도 놓치지 않게(따로 적는 표시를 두지 않는다)
 */
async function refreshFromCache(deps) {
  let rec = null;
  try { rec = await (deps.getCache || getNewsCache)(); } catch { return false; }
  const at = rec && Number(rec.at) > 0 ? Number(rec.at) : 0;
  if (!rec || at === ((mem && mem.at) || 0)) return false;
  mem = memOf(rec);
  return true;
}

/**
 * blobs의 사본을 한 번 읽어 메모리에 (이 실행에서 한 번만 — 못 읽으면 빈 것) → { cards, topics }
 * @param {{getCache?:Function}} [deps] 시험용
 */
export function loadNews(deps = {}) {
  if (mem) return Promise.resolve(newsNow());
  if (!loading) {
    loading = (async () => {
      let rec = null;
      try { rec = await (deps.getCache || getNewsCache)(); } catch { rec = null; }
      if (!mem) mem = memOf(rec);
      return newsNow();
    })().finally(() => { loading = null; });
  }
  return loading;
}

let syncing = null;
/**
 * 비공개 저장소에서 기사를 받아 이 기기에 둔다 — 10분에 한 번까지(force면 바로) · 열쇠가 없거나 못 받으면 받아 둔 것 그대로 ·
 * 파일마다 따로(못 받은 파일·모두 깨진 파일은 받아 둔 것 그대로) · 받은 파일마다 📥 줄에 받지 않은 기사 수(noteReadCheck)
 * @param {{now?:Function, readList?:Function, noteCheck?:Function, listMs?:number, getCache?:Function, putCache?:Function}} [deps] 시험용 —
 *   readList(경로) → 원고 배열 · noteCheck(경로, { rows, bad }) · putCache({ 경로: 줄 }) (바뀐 파일만)
 * @returns {Promise<{cards: object[], topics: object[], changed: boolean}>} changed = 이번에 기사 목록이 바뀌었나(화면이 다시 그릴지)
 */
export function syncNews(force = false, deps = {}) {
  if (syncing) return syncing;
  syncing = doSync(force, deps).finally(() => { syncing = null; });
  return syncing;
}

async function doSync(force, deps) {
  const hadMem = !!mem;
  await loadNews(deps);
  const local = hadMem ? await refreshFromCache(deps) : false; // 다른 창이 받아 둔 것부터 (Codex 230차 #2) — 방금 처음 읽었으면 두 번 읽지 않는다
  const kept = (changed = false) => ({ ...newsNow(), changed: changed || local });
  const now = (deps.now || Date.now)();
  const at = Number(load(AT_KEY, 0)) || 0;
  if (!force && at > 0 && now - at >= 0 && now - at < SYNC_MS) return kept();
  save(AT_KEY, now);
  const readList = deps.readList || (async (p) => (await import('./upload.js')).readPrivateList(p));
  const note = deps.noteCheck || (async (p, c) => (await import('./upload.js')).noteReadCheck(p, c));
  const ms = deps.listMs || LIST_MS;
  // 네 파일을 함께 받는다 — 하나가 늦거나 실패해도 나머지는 그대로
  const lists = await Promise.all(NEWS_PATHS.map(async (p) => {
    try { const l = await within(readList(p), ms); return Array.isArray(l) ? l : []; } catch { return []; }
  }));
  const got = {};
  NEWS_PATHS.forEach((p, k) => { if (lists[k].length) got[p] = lists[k]; });
  if (!Object.keys(got).length) return kept(); // 열쇠 없음·못 받음·빈 목록 — 받아 둔 것 그대로
  const base = mem || EMPTY;
  // 받은 파일마다 그 파일만으로 고친 줄 — 쓸 기사가 하나도 없으면 그 파일은 받아 둔 것 그대로
  const fresh = {};
  const oneBad = {};
  for (const [p, list] of Object.entries(got)) {
    const one = newsOf(list);
    oneBad[p] = one.bad;
    if (one.cards.length) fresh[p] = one.raws;
  }
  // 받아 둔 것과 똑같은 파일은 다시 쓰지 않는다(태블릿 저장을 아끼게)
  const write = {};
  for (const [p, raws] of Object.entries(fresh)) if (JSON.stringify(raws) !== JSON.stringify(base.files[p] || null)) write[p] = raws;
  const files = { ...base.files, ...fresh };
  const all = newsFilesOf(files);
  let saved = true;
  let rec = null;
  if (Object.keys(write).length) {
    try { rec = await (deps.putCache || putNewsCache)(write); } catch { saved = false; }
  }
  // 📥 받은 파일마다 받지 않은 기사 수 — 깨진 줄·주제 + 앞 파일과 겹친 id · 못 쓴 파일(모두 깨짐·저장 실패)은 모두
  for (const [p, list] of Object.entries(got)) {
    const used = fresh[p] && (saved || !write[p]);
    const bad = used ? oneBad[p] + (all.bad[p] || 0) : list.length;
    try { await note(p, { rows: list.length, bad }); } catch { /* 못 적어도 */ }
  }
  // 저장 공간이 차서 못 두었으면 받아 둔 것 그대로(🎹 책 곡과 같다 — 📥에는 ⚠️로)
  if (!saved) return kept();
  const changed = Object.keys(write).length > 0;
  if (changed) {
    // 저장이 돌려준 합친 기록으로 — 그사이 다른 창이 쓴 파일도 함께(트랜잭션 안에서 옛 사본에 겹쳐 넣었다)
    if (rec && isObj(rec.files)) mem = memOf(rec); else mem = { files, cards: all.cards, topics: all.topics, at: (mem && mem.at) || 0 };
  }
  return kept(changed);
}

/** p가 ms 안에 안 끝나면 실패로 */
function within(p, ms) {
  let t;
  const late = new Promise((_, reject) => { t = setTimeout(() => reject(new Error('시간 넘음')), ms); });
  return Promise.race([Promise.resolve(p), late]).finally(() => clearTimeout(t));
}
