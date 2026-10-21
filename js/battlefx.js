// 🐸 기술 그림 (v306, 2026-10-21 진우 요청 → 아버님 "이대로 진행") — 내 포켓몬이 공격할 때 그 포켓몬의 움직이는 장면을 한 번 튼다.
// 처음은 개굴닌자: 보통 공격은 지우개굴닌자 물수리검, 🌟 완벽(영어 80%↑·수학 연속 정답)은 메가리자몽X와 맞붙는 장면.
// 애니 장면이라 공개 저장소(앱 사이트)에 두지 않는다(🧢 모자 무늬와 같은 까닭) → 비공개 저장소 fx/fx.json(목록)과 fx/*.gif를
// 📤 열쇠로 받아 이 기기 그림 저장소(characters 'fx:경로')에 둔다 — 한 번 받으면 인터넷 없이도 나온다.
// 열쇠가 없거나 아직 못 받았으면 아무것도 안 하고(지금 연출 그대로) · 다른 포켓몬 그림은 목록에 한 줄 + 그림 파일이면 배포 없이 붙는다.
// 받기: 앱을 켤 때·⚔️ 배틀·🚀 로켓단을 열 때, 10분에 한 번까지 · 목록이 비었거나 못 읽으면 받아 둔 것을 그대로
import { getCharacters, putCharacter } from './db.js';

/** 비공개 저장소의 목록 — [{ id, when: 'hit'|'star', file: 'fx/….gif', ms, v, note? }] */
export const FX_PATH = 'fx/fx.json';
/** 그림 한 장 크기 상한 */
export const FX_MAX_BYTES = 8 * 1000 * 1000;
/** 한 번 트는 길이(ms) — 목록의 ms를 이 안으로 자른다 · 없으면 def */
export const FX_MS = { min: 500, max: 4000, def: 2000 };
/** 그림이 늦게 열려도 이만큼 지나면 끝낸다(배틀을 세우지 않는다) */
export const FX_LOAD_WAIT_MS = 2500;
export const SYNC_MS = 10 * 60 * 1000;
/** 받기 시간 상한 — 목록 · 그림 한 장 (와이파이가 붙은 채 멈추면 끊고 다음으로 · 🔍 Codex 112차 #2) */
export const FX_LIST_MS = 30 * 1000;
export const FX_GET_MS = 60 * 1000;
const FILE_RE = /^fx\/[a-z0-9_-]{1,60}\.gif$/;
const KEY = { list: 'shincoach.fxList', at: 'shincoach.fxAt' };
export const fxKey = (file) => `fx:${file}`;

function load(k, d) {
  try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v === null ? d : v; } catch { return d; }
}
function save(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; }
}

// ── 순수 ──

/**
 * 목록 → 쓸 줄 (순수) — id 양의 정수 · when hit|star · file은 fx/ 아래 .gif(소문자·숫자·_-) · ms는 FX_MS 안으로 · v 양의 정수(없으면 1).
 * 같은 포켓몬·같은 때가 둘이면 앞의 것 · bad = 빠진 줄 수
 * @returns {{rows: Array<{id:number, when:string, file:string, ms:number, v:number}>, bad:number}}
 */
export function fxRows(list) {
  const rows = [];
  let bad = 0;
  const seen = new Set();
  for (const r of Array.isArray(list) ? list : []) {
    const id = Number(r && r.id);
    const ok = r && typeof r === 'object' && Number.isSafeInteger(id) && id > 0 && (r.when === 'hit' || r.when === 'star')
      && typeof r.file === 'string' && FILE_RE.test(r.file) && !seen.has(`${id}:${r.when}`);
    if (!ok) { bad++; continue; }
    seen.add(`${id}:${r.when}`);
    const ms = Number(r.ms);
    const v = Number(r.v);
    rows.push({
      id, when: r.when, file: r.file,
      ms: Number.isFinite(ms) && ms > 0 ? Math.min(FX_MS.max, Math.max(FX_MS.min, Math.round(ms))) : FX_MS.def,
      v: Number.isSafeInteger(v) && v > 0 ? v : 1,
    });
  }
  return { rows, bad };
}

/**
 * 이번 공격에 틀 줄 (순수) — 🌟면 star 줄, 없으면 hit 줄 · 보통 공격은 hit 줄만 · 없으면 null
 * @param {Array} rows fxRows의 rows
 */
export function fxPick(rows, monId, star) {
  const id = Number(monId);
  const of = (when) => (rows || []).find((r) => r.id === id && r.when === when) || null;
  return (star && of('star')) || of('hit');
}

/** GIF인가 — 첫 여섯 바이트가 GIF87a·GIF89a (받은 것이 오류 글이면 그림 저장소에 넣지 않는다) */
export async function isGif(blob) {
  try {
    const b = new Uint8Array(await blob.slice(0, 6).arrayBuffer());
    return String.fromCharCode(...b) === 'GIF87a' || String.fromCharCode(...b) === 'GIF89a';
  } catch { return false; }
}

// ── 이 기기 ──

let rows = [];
const mem = new Map(); // file → { v, blob }
let syncing = null;

/** 앱을 켤 때 — 받아 둔 목록(localStorage)과 그림(그림 저장소)을 메모리에 · 올린 그림 수 */
export async function loadFx() {
  rows = fxRows(load(KEY.list, [])).rows;
  let recs = [];
  try { recs = await getCharacters(); } catch { return 0; }
  let n = 0;
  for (const r of recs) {
    if (!r || !r.blob || typeof r.id !== 'string' || !r.id.startsWith('fx:')) continue;
    mem.set(r.id.slice(3), { v: Number(r.v) || 1, blob: r.blob });
    n++;
  }
  return n;
}

/** 앱을 다시 켠 것처럼 메모리를 비운다 (시험용) */
export function forgetFx() {
  rows = [];
  mem.clear();
  syncing = null;
}

/**
 * 받기 — 10분에 한 번까지(force면 바로) · 목록을 받아 두고, 없거나 판(v)이 바뀐 그림만 받는다 · 하나 실패해도 나머지는 받는다.
 * 빈 목록(파일 없음·인터넷 없음·열쇠 없음)이면 받아 둔 것을 그대로. 빠진 줄·못 받은 그림은 📊 📥 받기 줄에 ⚠️로(아버님이 볼 수 있게)
 * @returns {Promise<number>} 새로 받은 그림 수
 */
export function syncFx(force = false, deps = {}) {
  if (syncing) return syncing;
  syncing = doSync(force, deps).finally(() => { syncing = null; });
  return syncing;
}

async function doSync(force, deps) {
  const now = (deps.now || Date.now)();
  const at = Number(load(KEY.at, 0)) || 0;
  if (!force && now - at >= 0 && now - at < SYNC_MS) return 0;
  save(KEY.at, now);
  const readList = deps.readList || (async (p) => (await import('./upload.js')).readPrivateList(p));
  let list = [];
  // 와이파이가 붙은 채 멈춰도 받기가 끝나게 — 넘으면 빈 목록(받아 둔 것 그대로 · 🔍 Codex 112차 #2)
  try { list = await within(readList(FX_PATH), deps.listMs || FX_LIST_MS); } catch { list = []; }
  if (!Array.isArray(list) || !list.length) return 0;
  const got = fxRows(list);
  if (!got.rows.length) { await noteCheck(deps, list.length, got.bad); return 0; }
  save(KEY.list, got.rows);
  rows = got.rows;
  const getRaw = deps.getRaw || defaultGetRaw;
  let fresh = 0;
  let failed = 0;
  const want = new Map();
  for (const r of got.rows) if (!want.has(r.file)) want.set(r.file, r.v);
  let recs = null;
  for (const [file, v] of want) {
    if (mem.has(file) && mem.get(file).v === v) continue;
    if (!recs) recs = await getCharacters().catch(() => []);
    const saved = recs.find((c) => c && c.id === fxKey(file) && c.blob && (Number(c.v) || 1) === v);
    if (saved) { mem.set(file, { v, blob: saved.blob }); continue; }
    // 그림 한 장도 시간을 넘으면 끊고 실패로 — 다음 그림·다음 받기로 넘어간다 · 늦게 와도 아래 저장에 닿지 않는다 (🔍 Codex 112차 #2)
    const ctl = typeof AbortController === 'function' ? new AbortController() : null;
    try {
      const raw = await within(getRaw(file, ctl && ctl.signal), deps.getMs || FX_GET_MS, () => { if (ctl) ctl.abort(); });
      if (!raw || !(await isGif(raw))) throw new Error('GIF 아님');
      // GitHub raw는 형식이 application/vnd.github.raw로 온다 → 그림으로 다시 감싼다(<img>가 형식을 보고 안 그리는 일이 없게)
      const blob = raw.type === 'image/gif' ? raw : new Blob([raw], { type: 'image/gif' });
      await putCharacter({ id: fxKey(file), ko: '', en: '', v, blob, savedAt: now });
      mem.set(file, { v, blob });
      fresh++;
    } catch (e) {
      failed++;
      console.warn('기술 그림 받기 실패:', file, e && e.message);
    }
  }
  await noteCheck(deps, list.length, got.bad + failed);
  return fresh;
}

async function noteCheck(deps, n, bad) {
  const note = deps.noteCheck || (async (c) => (await import('./upload.js')).noteReadCheck(FX_PATH, c));
  try { await note({ rows: n, bad }); } catch { /* 못 적어도 받기는 그대로 */ }
}

/** p가 ms 안에 안 끝나면 onLate를 부르고 실패로 */
function within(p, ms, onLate) {
  let t;
  const late = new Promise((_, reject) => { t = setTimeout(() => { if (onLate) onLate(); reject(new Error('시간 넘음')); }, ms); });
  return Promise.race([Promise.resolve(p), late]).finally(() => clearTimeout(t));
}

async function defaultGetRaw(file, signal) {
  const up = await import('./upload.js');
  const token = up.getToken();
  if (!token) return null;
  return up.getRawFile({ fetchFn: fetch, token, path: file, maxBytes: FX_MAX_BYTES, signal });
}

/**
 * 이 포켓몬의 이번 공격 그림 — 받아 둔 것만 · { blob, ms, file } 또는 null.
 * 🌟 그림을 아직 못 받았으면(목록엔 있어도) 받아 둔 보통 그림으로 대신한다 (🔍 Codex 112차 #1)
 */
export function fxFor(monId, star) {
  for (const r of star ? [fxPick(rows, monId, true), fxPick(rows, monId, false)] : [fxPick(rows, monId, false)]) {
    const m = r && mem.get(r.file);
    if (m) return { blob: m.blob, ms: r.ms, file: r.file };
  }
  return null;
}

// ── 화면 ──

const playing = new Set(); // 지금 틀고 있는 그림의 끝내기

/** 틀고 있는 그림을 모두 바로 끝낸다 — ⚔️ 배틀이 닫힐 때(다시 연 배틀 무대에 옛 그림이 겹치지 않게 · 기다리던 턴도 바로 풀린다) */
export function stopFx() {
  for (const end of [...playing]) end();
}

/**
 * box 안에 그림을 크게 한 번 튼다 → 끝나면(그림 길이만큼 · 누르면 바로) true. 그림이 없으면 바로 false.
 * 틀 때마다 새 주소 — 같은 주소를 다시 꽂으면 GIF가 처음부터 안 돈다 · 그림이 열린 뒤부터 잰다(큰 그림이 늦게 열려도 끝까지)
 * @param {HTMLElement|null} box position이 있는 칸(⚔️ #battle-stage · 🚀 .rocket-sky)
 */
export function playFx(box, monId, star) {
  const hit = fxFor(monId, star);
  if (!box || !hit || typeof document === 'undefined') return Promise.resolve(false);
  box.querySelectorAll('.fx-play').forEach((n) => n.remove()); // 앞 배틀에서 남은 것
  const url = URL.createObjectURL(hit.blob);
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'fx-play';
  btn.setAttribute('aria-label', '기술 장면 — 누르면 넘어가요');
  const img = document.createElement('img');
  img.alt = '';
  img.draggable = false;
  btn.appendChild(img);
  return new Promise((resolve) => {
    let done = false;
    let timer = setTimeout(() => end(), hit.ms + FX_LOAD_WAIT_MS); // 끝내 안 열려도
    function end() {
      if (done) return;
      done = true;
      playing.delete(end);
      clearTimeout(timer);
      btn.remove();
      URL.revokeObjectURL(url);
      resolve(true);
    }
    playing.add(end);
    // 끝난 뒤 늦게 열려도 타이머를 다시 만들지 않는다 (🔍 Codex 112차 시험)
    img.addEventListener('load', () => { if (done) return; clearTimeout(timer); timer = setTimeout(end, hit.ms); }, { once: true });
    img.addEventListener('error', end, { once: true });
    btn.addEventListener('click', (e) => { e.stopPropagation(); end(); });
    img.src = url;
    box.appendChild(btn);
  });
}
