// 📤 Claude에게 기록 보내기 (2026-10-06, 아버님: "매번 사진을 찍어서 보여주는 거 말고 앱에서 바로 github에 올리고 그걸 니가 확인해서 피드백을 주는 방법은 없을까?")
//
// 신코치 저장소(jjinuchung/shincoach)는 **공개**라 아이 기록(이름·질문·글)을 올리면 인터넷에 그대로 공개된다
//   → 기록만 받는 **비공개** 저장소 jjinuchung/shincoach-data에 올린다. Claude는 아버님 "기록 봐 줘"에 거기서 읽는다.
// 열쇠: 아버님이 GitHub에서 만든 fine-grained token (이 저장소 하나 · Contents 읽기/쓰기 · 기한 1년).
//   📊(비밀번호 뒤)에서 한 번 넣으면 **이 기기 localStorage에만** 둔다. ★ 코드(공개 저장소)에는 절대 넣지 않는다.
//   (같은 jjinuchung.github.io 주소의 다른 Pages도 localStorage를 같이 쓰지만, 공개 Pages는 신코치뿐이다)
// 올리는 것: math/YYYY-MM-DD.md (📋 수학 기록 글 + ❓ 답할 차례인 질문 글 — 같은 날은 덮어쓴다)
//           math/latest.json (수학 기록 원본 전체 — 복사 글은 12개념까지라 진단은 원본으로)
//           essay/todo.md · essay/todo.json (✍️ 아직 아빠가 고쳐 주지 않은 글 — 📊 "📮 고쳐 주세요"와 같은 글·같은 [번호], 2026-10-06 v199)
// 언제: 앱을 열 때 · 🏠 홈으로 돌아올 때 · 앱을 내릴 때 — 10분에 한 번까지, 내용이 그대로면 안 올린다.
//       📊 "📤 지금 보내기"는 바로. 못 올려도 앱은 그대로이고 진우 화면엔 아무것도 안 뜬다 (다음에 다시).
// 받는 것 (2026-10-07 Codex 35차 #1 — 전엔 공개 저장소 coach/fixes.json·coach/math/replies.json으로 배포해 진우 글·질문이 공개됐다):
//           essay/fixes.json (✍️ 아빠 교정 — Claude가 essay/todo.json을 보고 날짜·글·교정을 적는다)
//           math/replies.json (❓ 아빠 답장 [{ no, text }]) — 같은 열쇠로 읽는다, 배포가 필요 없다

export const DATA_REPO = 'jjinuchung/shincoach-data';
export const PRIVATE_FIXES = 'essay/fixes.json';
export const PRIVATE_REPLIES = 'math/replies.json';
export const DATA_BRANCH = 'main';
export const AUTO_GAP_MS = 10 * 60 * 1000;
const TOKEN_KEY = 'shincoach.dataToken';
const STATE_KEY = 'shincoach.dataUpload';
const READ_KEY = 'shincoach.dataRead'; // 📥 받기 결과 (파일마다) — Codex 36차 #4
const API = 'https://api.github.com';

// ───────────────────── 순수 ─────────────────────

/** 올릴 파일들 (순수) — 글은 앱의 📋 복사 글과 같은 것을 넘겨받는다 */
export function reportFiles(math, today, reportText, askText) {
  const md = [String(reportText || '').trim(), '', String(askText || '').trim()].join('\n').trim() + '\n';
  return [
    { path: `math/${today}.md`, text: md },
    { path: 'math/latest.json', text: `${JSON.stringify({ day: today, math: math || null }, null, 1)}\n` },
  ];
}

/**
 * ✍️ 고칠 에세이 글 (순수) — stats.collectTodo 목록 그대로(오래된 글이 [1], 📊와 같은 번호).
 * Claude는 이걸 읽어 비공개 저장소 essay/fixes.json에 date·written → fixed로 적는다 (태블릿에 아무것도 안 넣고, 배포도 없다)
 * @param {Array<{id:string, date?:string, origin?:string, written:string, fixed?:string, notes?:string[]}>} todo
 */
export function essayFiles(todo, today) {
  const list = (Array.isArray(todo) ? todo : []).filter((e) => e && e.written);
  const lines = [`✍️ 진우가 쓴 영어 문장 — 아직 아빠가 고쳐 주지 않은 글 ${list.length}개 (${today}) · 번호는 📊 "📮 고쳐 주세요"와 같아요`, ''];
  list.forEach((e, i) => {
    lines.push(`[${i + 1}] ${e.date || ''} 배운 문장: ${e.origin || ''}`);
    lines.push(`    진우: ${e.written}`);
    if (e.fixed && e.fixed !== e.written) lines.push(`    앱 교정: ${e.fixed}`);
    if (Array.isArray(e.notes) && e.notes.length) lines.push(`    앱 메모: ${e.notes.join(' · ')}`);
    lines.push('');
  });
  if (!list.length) lines.push('(고칠 글 없음)');
  const json = list.map((e, i) => ({ no: i + 1, id: e.id, date: e.date || '', origin: e.origin || '', written: e.written, fixed: e.fixed || '', notes: Array.isArray(e.notes) ? e.notes : [] }));
  return [
    { path: 'essay/todo.md', text: `${lines.join('\n').trim()}\n` },
    { path: 'essay/todo.json', text: `${JSON.stringify(json, null, 1)}\n` },
  ];
}

/** UTF-8 글 → base64 (GitHub contents API) — 한글·이모지까지. 긴 글은 나눠서 (spread 한계) */
export function b64(text) {
  const bytes = new TextEncoder().encode(String(text));
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** base64 → UTF-8 글 (GitHub contents API가 돌려주는 content — 60자마다 줄바꿈이 끼어 온다) */
export function unb64(s) {
  const bin = atob(String(s || '').replace(/\s+/g, ''));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

/**
 * 올릴 파일들 — 기기 기록을 읽어 만든다. ★ 읽기가 실패하면 그대로 실패한다 (Codex 35차 #2: 전엔 실패를 null·[]로 바꿔
 * "수학 기록 없음"·빈 에세이 목록을 올리고 성공으로 적어, 비공개 저장소의 좋은 기록을 덮어썼다). 읽었는데 없는 것(null·[])은 "없음"으로.
 * @param {{getMath:Function, listDaily:Function, mathReportText:Function, asksText:Function, collectTodo:Function, today:string}} o
 */
export async function gatherFiles({ getMath, listDaily, mathReportText, asksText, collectTodo, today }) {
  const math = await getMath();
  const days = await listDaily();
  return [
    ...reportFiles(math, today, math ? mathReportText(math, today) : '(수학 기록 없음)', math ? asksText(math, today) : ''),
    ...essayFiles(collectTodo(days || []), today), // ✍️ 📊 "📮 고쳐 주세요"와 같은 목록·번호
  ];
}

/** 내용 지문 (FNV-1a 32비트) — 그대로면 또 올리지 않으려고 */
export function hashOf(files) {
  let h = 0x811c9dc5;
  const s = (files || []).map((f) => `${f.path}\n${f.text}`).join('\n\u0000\n');
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

/** 열쇠 꼴 (순수) — 앞뒤 빈칸은 떼고, 빈칸이 끼었거나 너무 짧으면 null. fine-grained(github_pat_)·classic(ghp_) 다 받는다 */
export function cleanToken(raw) {
  const t = String(raw || '').trim();
  if (t.length < 20 || /\s/.test(t)) return null;
  return t;
}

/**
 * 저절로 보낼 때인가 (순수) — 열쇠가 있고 · 인터넷이 되고 · 마지막 시도에서 10분이 지났고 · 내용이 바뀌었거나 지난번에 실패했을 때
 * @param {{token:string|null, online:boolean, now:number, state:{at?:number, ok?:boolean, hash?:string}|null, hash:string}} o
 */
export function shouldAuto({ token, online, now, state, hash }) {
  if (!token || !online) return false;
  const s = state || {};
  if (s.at && now - s.at < AUTO_GAP_MS) return false;
  return !(s.ok && s.hash === hash);
}

/** HTTP 상태 → 아버님이 볼 까닭 (순수) */
export function whyOf(status) {
  if (status === 401) return '열쇠가 틀렸거나 기한이 지났어요 — GitHub에서 새로 만들어 넣어 주세요';
  if (status === 403) return '열쇠에 쓰기 권한이 없어요 — Contents를 "Read and write"로 만들어 주세요';
  if (status === 404) return `저장소를 못 찾았어요 — 열쇠를 만들 때 ${DATA_REPO.split('/')[1]}를 골라 주세요`;
  if (status === 409 || status === 422) return '다른 곳에서 동시에 올려서 겹쳤어요 — 잠시 뒤 다시';
  if (status === 0) return '인터넷이 안 돼요';
  return `GitHub가 받지 않았어요 (${status})`;
}

// ───────────────────── GitHub ─────────────────────

function httpError(status) {
  const e = new Error(whyOf(status));
  e.status = status;
  return e;
}

/**
 * 파일 하나 올리기 — 있으면 sha를 받아 덮어쓰고, 없으면 새로 만든다. 겹치면(409·422) sha를 다시 받아 한 번 더.
 * @param {{fetchFn:Function, token:string, path:string, text:string, message:string, repo?:string}} o
 */
export async function putFile({ fetchFn, token, path, text, message, repo = DATA_REPO }) {
  const url = `${API}/repos/${repo}/contents/${path}`;
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  for (let attempt = 0; attempt < 2; attempt++) {
    let sha;
    let g;
    try { g = await fetchFn(`${url}?ref=${DATA_BRANCH}`, { headers, cache: 'no-store' }); } catch { throw httpError(0); }
    if (g.status === 200) sha = (await g.json()).sha;
    else if (g.status !== 404) throw httpError(g.status);
    const body = { message, content: b64(text), branch: DATA_BRANCH, ...(sha ? { sha } : {}) };
    let p;
    try { p = await fetchFn(url, { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); } catch { throw httpError(0); }
    if (p.status === 200 || p.status === 201) return { created: p.status === 201 };
    if ((p.status === 409 || p.status === 422) && attempt === 0) continue;
    throw httpError(p.status);
  }
  throw httpError(409);
}

/**
 * 파일 하나 읽기 — 없으면(404) null · 못 읽으면 까닭과 함께 실패 (열쇠는 머리글에만, 까닭 글에는 안 넣는다)
 * @param {{fetchFn:Function, token:string, path:string, repo?:string}} o
 * @returns {Promise<string|null>}
 */
export async function getFile({ fetchFn, token, path, repo = DATA_REPO }) {
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  let g;
  try { g = await fetchFn(`${API}/repos/${repo}/contents/${path}?ref=${DATA_BRANCH}`, { headers, cache: 'no-store' }); } catch { throw httpError(0); }
  if (g.status === 404) return null;
  if (g.status !== 200) throw httpError(g.status);
  const body = await g.json();
  return unb64(body && body.content);
}

/**
 * 📥 비공개 저장소의 목록 파일(JSON 배열) — 아빠 교정 essay/fixes.json · ❓ 답장 math/replies.json (Codex 35차 #1: 공개 배포 대신).
 * 열쇠가 없으면 묻지도 않고, 없거나·못 읽거나·배열이 아니면 빈 목록 (앱은 그대로 — 다음에 다시).
 * @param {string} path
 * @param {{fetchFn?:Function, token?:string|null}} [o] 테스트용 — 안 주면 이 기기 열쇠·fetch
 * @returns {Promise<Array>}
 */
export async function readPrivateList(path, o = {}) {
  const token = 'token' in o ? o.token : getToken();
  if (!token) return [];
  // 받기 결과를 파일마다 이 기기에 적는다 — 📊 📤 카드가 한 줄로 보인다 (Codex 36차 #4: 실패가 "받을 것 없음"과 똑같이 보였다)
  const note = (kind, n) => noteRead(path, readStatus(kind, n, (o.now || Date.now)()), o.store);
  let text;
  try { text = await getFile({ fetchFn: o.fetchFn || fetch, token, path }); } catch (e) { note(e && e.status !== undefined ? e.status : 0); return []; }
  if (text === null) { note('missing'); return []; }
  let list;
  try { list = JSON.parse(text); } catch { note('json'); return []; }
  if (!Array.isArray(list)) { note('shape'); return []; }
  note('ok', list.length);
  return list;
}

/**
 * 📥 받기 결과 → 아버님이 볼 상태 (순수). kind: 'ok' · 'missing'(404 — 아직 안 올렸으면 정상) · 'json' · 'shape' · HTTP 상태 수(0 = 인터넷)
 * @returns {{at:number, ok:boolean, n?:number, missing?:boolean, why?:string}}
 */
export function readStatus(kind, n = 0, at = Date.now()) {
  if (kind === 'ok') return { at, ok: true, n };
  if (kind === 'missing') return { at, ok: true, n: 0, missing: true };
  if (kind === 'json') return { at, ok: false, why: '파일이 깨져 못 읽었어요 (JSON) — Claude에게 고쳐 달라고 해 주세요' };
  if (kind === 'shape') return { at, ok: false, why: '파일 모양이 틀렸어요 (목록이 아님) — Claude에게 고쳐 달라고 해 주세요' };
  if (kind === 403) return { at, ok: false, why: '이 열쇠로는 저장소를 읽을 수 없어요 — 열쇠의 저장소·권한(Contents)을 확인해 주세요' };
  return { at, ok: false, why: whyOf(kind) };
}
const READ_NAMES = { [PRIVATE_FIXES]: '✍️ 교정', [PRIVATE_REPLIES]: '❓ 답장' };
/**
 * 📊 📤 카드의 받기 한 줄 (순수) — "📥 받기: ✍️ 교정 ✅ 10/07 10:32 (3개) · ❓ 답장 · 아직 없음"
 * @param {Object<string, {at:number, ok:boolean, n?:number, missing?:boolean, why?:string}>|null} state readState()
 * @param {(t:number) => string} fmt 시각 글
 */
export function readSummary(state, fmt) {
  const s = state || {};
  const parts = Object.keys(READ_NAMES).filter((p) => s[p]).map((p) => {
    const r = s[p]; const name = READ_NAMES[p];
    if (!r.ok) return `${name} ❌ ${fmt(r.at)} 못 받았어요 — ${r.why}`;
    return r.missing ? `${name} · 아직 없음` : `${name} ✅ ${fmt(r.at)} (${r.n}개)`;
  });
  return parts.length ? `📥 받기: ${parts.join(' · ')}` : '📥 받기: 아직 받아 본 적이 없어요 (앱을 열 때·수학을 열 때 저절로)';
}

// ───────────────────── 이 기기의 열쇠·상태 ─────────────────────

function readJson(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
}
export function getToken() {
  try { return cleanToken(localStorage.getItem(TOKEN_KEY)); } catch { return null; }
}
/** @returns {boolean} 저장했는가 (꼴이 틀리면 false) */
export function setToken(raw) {
  const t = cleanToken(raw);
  if (!t) return false;
  try { localStorage.setItem(TOKEN_KEY, t); return true; } catch { return false; }
}
export function clearToken() {
  try { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(STATE_KEY); localStorage.removeItem(READ_KEY); } catch { /* 없으면 그만 */ }
}
/** 마지막 시도 { at, ok, why, hash, files } */
export function uploadState() {
  return readJson(STATE_KEY);
}
/** 📥 받기 결과 — { 파일 경로: readStatus } (store는 테스트용, 안 주면 이 기기 localStorage) */
export function readState(store) {
  try { return JSON.parse((store || localStorage).getItem(READ_KEY) || 'null') || {}; } catch { return {}; }
}
function noteRead(path, st, store) {
  try { const s = readState(store); s[path] = st; (store || localStorage).setItem(READ_KEY, JSON.stringify(s)); } catch { /* 적지 못해도 받기는 그대로 */ }
}

// ───────────────────── 보내기 ─────────────────────

let running = null; // 보내는 중이면 같은 약속을 돌려준다 (두 번 눌러도·홈과 내림이 겹쳐도 한 번)

/**
 * 📤 보내기. force면 10분·내용 비교 없이 바로 (📊 버튼).
 * @returns {Promise<{ok:boolean, skipped?:boolean, why?:string, at?:number}>}
 */
export function sendReport({ force = false } = {}) {
  if (running) return running;
  running = (async () => {
    const token = getToken();
    if (!token) return { ok: false, skipped: true, why: '열쇠가 없어요' };
    const [{ getMath, listDaily }, prog, ask, { todayKey }, st] = await Promise.all([import('./db.js'), import('./mathprog.js'), import('./mathask.js'), import('./track.js'), import('./stats.js')]);
    const today = todayKey();
    let files;
    try { files = await gatherFiles({ getMath, listDaily, mathReportText: prog.mathReportText, asksText: ask.asksText, collectTodo: st.collectTodo, today }); } catch {
      // 기기 기록을 못 읽었다 — 아무것도 안 올린다 (빈 기록으로 덮어쓰지 않게). 실패로 적어 두면 10분 뒤 다시
      const fail = { ok: false, at: Date.now(), why: '이 기기 기록을 못 읽었어요 — 잠시 뒤 다시' };
      try { localStorage.setItem(STATE_KEY, JSON.stringify({ at: fail.at, ok: false, why: fail.why, hash: '', files: [] })); } catch { /* 저장 못 해도 */ }
      return fail;
    }
    const hash = hashOf(files);
    const online = typeof navigator === 'undefined' || navigator.onLine !== false;
    if (!force && !shouldAuto({ token, online, now: Date.now(), state: uploadState(), hash })) return { ok: false, skipped: true };
    const at = Date.now();
    let res;
    try {
      for (const f of files) await putFile({ fetchFn: fetch, token, path: f.path, text: f.text, message: `📤 진우 기록 ${today} — ${f.path}` });
      res = { ok: true, at };
    } catch (e) {
      res = { ok: false, at, why: (e && e.message) || String(e) };
    }
    try { localStorage.setItem(STATE_KEY, JSON.stringify({ at, ok: res.ok, why: res.why || '', hash: res.ok ? hash : '', files: files.map((f) => f.path) })); } catch { /* 저장 못 해도 */ }
    return res;
  })().finally(() => { running = null; });
  return running;
}

/** 저절로 보내기 — 실패해도 조용히 (진우 화면엔 아무것도 안 뜬다) */
export function autoSend() {
  return sendReport().catch(() => ({ ok: false }));
}
