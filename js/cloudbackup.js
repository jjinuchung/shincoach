// ☁️ 태블릿 자동 백업 (v361, 2026-10-28 아버님 「태블릿이 망가지면 아이가 완전 실망할 거야」 ·
//    「백업에서 가장 중요한 것은 아이가 그동안 모아놓은 포켓몬스터들이야. 이건 꼭 백업해야 하는 부분이야.」)
//
// 🛟 backup.js의 기기 안 사본은 태블릿과 같이 사라지고, 📊 파일 백업은 손으로 해야 한다 →
// 하루 한 번, 바뀐 것이 있으면 📊 내보내기와 같은 전체 기록(db.exportStats — 포켓몬·코인·가방이 든 프로필 · 수학 진도 · 하루 기록 · 문장 기록 ·
// 영상 정보. 영상 파일은 빼고)을 압축(gzip)해 비공개 저장소(upload.DATA_REPO) backup/YYYY-MM-DD.json.gz에 올린다.
//  · ⚙(부모 비밀번호 뒤) 「☁️ 이 기기를 매일 백업」을 켠 기기만 — 처음엔 꺼짐. 진우 태블릿에서만 켠다(어머님 아이폰은 안 올린다)
//  · 날마다 다른 파일 — 어느 하루가 깨져도 앞날 백업은 그대로 · 기록이 비어 있으면 안 올린다(빈 기기가 백업을 덮지 않게)
//  · 되살리기는 📊 「☁️ 백업에서 되살리기」(부모) → 파일 가져오기와 같은 병합(db.importStats — 큰 값·합집합 · 지우는 것은 없다) ·
//    영상은 아빠 PC의 같은 파일을 다시 넣으면 옛 id로 들어가 진도가 이어진다(👻 ghosts.js)
//  · 📤 열쇠·⚙ 설정(localStorage)은 백업에 넣지 않는다 — IndexedDB 기록만
//  · 못 올려도 아이 화면엔 아무것도 안 뜬다(📊·⚙에만 까닭) · 실패하면 30분 뒤 다시

import { exportStats, importStats, getProfile, listItems } from './db.js';
import { isEmptyNow } from './backup.js';
import { haveOf } from './evolve.js';
import { getToken, putFile, listDir, getRawFile } from './upload.js';
import { readGhosts } from './ghosts.js';

export const BACKUP_DIR = 'backup';
const STATE_KEY = 'shincoach.cloudBackup';
const SETTINGS_KEY = 'shincoach.settings';
/** 못 올렸으면 이만큼 뒤에 다시 */
export const FAIL_GAP_MS = 30 * 60 * 1000;
/** 바뀐 것이 없었으면 이만큼 뒤에 다시 본다 (그날 올린 것이 없을 때) */
export const SAME_GAP_MS = 60 * 60 * 1000;
/** 압축한 백업 크기 상한 — 넘으면 안 올리고 까닭을 적는다 (받을 때도 같은 상한) */
export const BACKUP_MAX_BYTES = 30 * 1000 * 1000;
/** 되살리기에서 고를 수 있는 최근 백업 수 */
export const LIST_N = 7;
/** 이만큼 안에 백업이 됐으면 📊 「💾 파일로 백업할 때가 됐어요」를 띄우지 않는다 (backup.FILE_BACKUP_DAYS와 같게) */
export const FRESH_DAYS = 7;

// ───────────────────── 순수 ─────────────────────

const pad = (n) => String(n).padStart(2, '0');
/** ms → 'YYYY-MM-DD' (이 기기 시간대) */
export function dayOf(ms) {
  const d = new Date(Number(ms) || 0);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 백업 파일 경로 — 압축했으면 .json.gz */
export function backupPath(day, gz) {
  return `${BACKUP_DIR}/${day}.json${gz ? '.gz' : ''}`;
}

/** 파일 이름의 날짜 ('2026-10-29.json.gz' → '2026-10-29') · 백업 이름이 아니면 '' */
export function dayOfName(name) {
  const m = /^(\d{4}-\d{2}-\d{2})\.json(\.gz)?$/.exec(String(name || ''));
  return m ? m[1] : '';
}

/** 폴더 목록 → 백업 파일만 새것부터 (같은 날 둘이면 압축한 쪽 하나) · LIST_N개까지 */
export function newestFirst(files) {
  const byDay = new Map();
  for (const f of Array.isArray(files) ? files : []) {
    const day = f && dayOfName(f.name);
    if (!day) continue;
    const had = byDay.get(day);
    if (!had || (/\.gz$/.test(f.name) && !/\.gz$/.test(had.name))) byDay.set(day, { ...f, day });
  }
  return [...byDay.values()].sort((a, b) => (a.day < b.day ? 1 : -1)).slice(0, LIST_N);
}

/** 글의 지문 (FNV-1a 32비트) — 그대로면 또 올리지 않으려고 */
export function textHash(s) {
  let h = 0x811c9dc5;
  const t = String(s);
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

/** 기기 이름 (백업을 고를 때 어느 기기 것인지 보이게 — 자세한 기종은 안 담는다) */
export function deviceOf(ua) {
  const s = String(ua || '');
  if (/iPhone/.test(s)) return 'iPhone';
  if (/iPad/.test(s)) return 'iPad';
  if (/Android/.test(s)) return 'Android';
  return 'PC';
}

/** 기록 안의 아이 프로필('me')과 수학 진도 */
const meOf = (data) => ((data && Array.isArray(data.profile) ? data.profile : []).find((r) => r && r.id === 'me')) || null;
const mathOf = (data) => ((data && Array.isArray(data.profile) ? data.profile : []).find((r) => r && r.id === 'math')) || null;

/**
 * 🎒 모은 포켓몬 셈 (순수) — 가진 마릿수(진화·퓨전·교환·판 것 등을 뺀 haveOf의 합) · 도감 종 수(한 번이라도 잡은 종) · 부화 안 한 알
 * 되살린 뒤 이 셈이 백업과 같아야 한다 (아버님 「모아놓은 포켓몬은 꼭」)
 */
export function monCount(p) {
  const caught = (p && p.caught && typeof p.caught === 'object') ? p.caught : {};
  const mons = (p && p.mons && typeof p.mons === 'object') ? p.mons : {};
  let have = 0;
  let species = 0;
  for (const id of Object.keys(caught)) {
    if ((Number(caught[id]) || 0) > 0) species++;
    have += haveOf(caught[id], mons[id]);
  }
  const eggs = (p && Array.isArray(p.eggs) ? p.eggs : []).filter((e) => e && !e.hatchedAt).length;
  return { have, species, eggs };
}

/** 백업 한 덩이의 요약 (순수) — 되살리기 전에 부모가 무엇을 되살리는지 보게 */
export function backupSummary(data) {
  const p = meOf(data) || {};
  const m = mathOf(data) || {};
  const c = monCount(p);
  return {
    ...c,
    coins: Number(p.coins) || 0,
    xp: Number(p.xp) || 0,
    items: Object.values(p.items || {}).reduce((a, n) => a + Math.max(0, Number(n) || 0), 0),
    days: (Array.isArray(data && data.daily) ? data.daily : []).filter((d) => d && (Number(d.seconds) || 0) > 0).length,
    sentences: (Array.isArray(data && data.sentenceStats) ? data.sentenceStats : []).length,
    videos: (Array.isArray(data && data.items) ? data.items : []).length,
    math: Object.keys(m.concepts || {}).length,
    device: typeof (data && data.device) === 'string' ? data.device : '',
    at: typeof (data && data.exportedAt) === 'string' ? data.exportedAt : '',
  };
}

/** 요약 한 줄 */
export function summaryLine(s) {
  const parts = [`🎒 포켓몬 ${s.have}마리 (도감 ${s.species}종)`];
  if (s.eggs) parts.push(`🥚 알 ${s.eggs}개`);
  parts.push(`💰 ${s.coins.toLocaleString()}코인`, `🎒 가방 ${s.items}개`, `⚡ ${s.xp.toLocaleString()}XP`, `📚 공부한 날 ${s.days}일`, `✍️ 문장 ${s.sentences}개`);
  if (s.math) parts.push(`🔢 수학 개념 ${s.math}개`);
  if (s.videos) parts.push(`🎬 영상 ${s.videos}편 정보`);
  return parts.join(' · ');
}

/** 기록이 비어 있는가 (= 빈 기기 — 올리면 안 된다) · backup.isEmptyNow + 수학 진도 */
export function isEmptyData(data) {
  const m = mathOf(data);
  const hasMath = m && (Object.keys(m.concepts || {}).length || Object.keys(m.placed || {}).length);
  return isEmptyNow({ profile: meOf(data), sentenceStats: data && data.sentenceStats }) && !hasMath;
}

/**
 * 지금 올릴 때인가 (순수) — '' = 올린다 · 아니면 까닭 열쇠
 * force(📊 「지금 백업하기」)는 하루 한 번·실패 뒤 기다림을 건너뛴다(⚙ 켜짐·열쇠·인터넷은 그대로 본다)
 * @param {{on:boolean, token:string|null, online:boolean, today:string, now:number, state:object|null, force?:boolean}} o
 */
export function backupDue({ on, token, online, today, now, state, force = false }) {
  if (!on) return 'off';
  if (!token) return 'token';
  if (!online) return 'offline';
  if (force) return '';
  const s = state || {};
  if (s.ok && s.ok.day === today) return 'done';
  // 「바뀐 것 없음」은 한 시간만 — 그 뒤 잡은 포켓몬이 다음 날까지 기다리지 않게 (🔍 Codex 165차 #4 · 올리는 것은 그대로 하루 한 번)
  if (Number(s.sameAt) > 0 && now - Number(s.sameAt) < SAME_GAP_MS) return 'same';
  if (s.try && !s.try.ok && Number(s.try.at) > 0 && now - Number(s.try.at) < FAIL_GAP_MS) return 'wait';
  return '';
}

/** 까닭 열쇠 → 부모가 볼 글 · t = 실패 기록(도감 줄어듦의 수) */
export function whyText(why, t = {}) {
  if (why === 'shrink') return `도감이 지난 백업보다 작아졌어요(${Number(t.from) || 0}종 → ${Number(t.to) || 0}종) — 기록이 깨졌을 수 있어 올리지 않았어요. Claude에게 알려 주세요 (지난 백업은 그대로 있어요)`;
  if (why === 'empty') return '이 기기 기록이 비어 있어 올리지 않았어요 (빈 기록이 백업을 덮지 않게)';
  if (why === 'big') return `백업이 너무 커요 (${BACKUP_MAX_BYTES / 1000 / 1000} MB 넘음) — Claude에게 알려 주세요`;
  if (why === 'read') return '이 기기 기록을 못 읽었어요 — 잠시 뒤 다시';
  if (why === 'zip') return '압축이 안 됐어요 — 잠시 뒤 다시';
  return String(why || '까닭 모름');
}

/** 바이트 → '412 KB' · '1.3 MB' */
export function sizeText(n) {
  const b = Math.max(0, Number(n) || 0);
  if (b < 1000 * 1000) return `${Math.max(1, Math.round(b / 1000))} KB`;
  return `${(b / 1000 / 1000).toFixed(1)} MB`;
}

/**
 * 📊·⚙에 보이는 한 줄 (순수)
 * @param {object|null} state readBackupState() · @param {{on:boolean, token:boolean}} o · @param {(t:number) => string} fmt 시각 글
 */
export function backupLine(state, { on, token }, fmt) {
  const s = state || {};
  const last = s.ok ? `✅ 마지막 백업 ${fmt(s.ok.at)} · ${sizeText(s.ok.bytes)}${s.ok.raw ? ` (압축 전 ${sizeText(s.ok.raw)})` : ''}` : '아직 백업한 적이 없어요';
  if (!on) return `☁️ 자동 백업: 꺼짐 — ⚙ 설정에서 「이 기기를 매일 백업」을 켜면 하루 한 번 올려요 (진우 태블릿에서만)${s.ok ? ` · ${last}` : ''}`;
  if (!token) return '☁️ 자동 백업: 켜짐 — 하지만 📤 열쇠가 없어 올리지 못해요. 📊 「📤 Claude에게 기록 보내기」에서 열쇠를 넣어 주세요';
  const bad = s.try && !s.try.ok && (!s.ok || Number(s.try.at) > Number(s.ok.at)) ? ` · ❌ ${fmt(s.try.at)} 못 올렸어요 — ${whyText(s.try.why, s.try)}` : '';
  return `☁️ 자동 백업: 켜짐 (하루 한 번) · ${last}${bad}`;
}

/** 최근 FRESH_DAYS일 안에 백업이 됐나 (순수) */
export function backupFresh(state, now = Date.now()) {
  const at = Number(state && state.ok && state.ok.at) || 0;
  return at > 0 && now - at < FRESH_DAYS * 86400000;
}

// ───────────────────── 압축 ─────────────────────

/** UTF-8 바이트 → gzip 바이트 · 이 브라우저에 압축이 없으면 null(그대로 올린다) */
export async function gzipBytes(bytes) {
  if (typeof CompressionStream !== 'function') return null;
  const s = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(s).arrayBuffer());
}

/** gzip 바이트 → 글 */
export async function gunzipText(bytes) {
  if (typeof DecompressionStream !== 'function') throw new Error('이 브라우저는 압축한 백업을 풀 수 없어요 — Chrome으로 열어 주세요');
  const s = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(s).text();
}

// ───────────────────── 이 기기 ─────────────────────

/** ⚙ 「이 기기를 매일 백업」 — 켠 기기만 (처음엔 꺼짐) */
export function cloudOn() {
  try { return (JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') || {}).cloudBackup === true; } catch { return false; }
}

/** 마지막 결과 { ok: {day, at, hash, path, bytes, raw, species} | 없음, try: {at, ok, why, from?, to?}, sameAt: 바뀐 것 없음을 본 때 } */
export function readBackupState() {
  try { return JSON.parse(localStorage.getItem(STATE_KEY) || 'null') || {}; } catch { return {}; }
}
function writeBackupState(s) {
  try { localStorage.setItem(STATE_KEY, JSON.stringify(s)); } catch { /* 못 적으면 내일 또 올릴 뿐 */ }
}

/** 📊·⚙ 한 줄 — 이 기기 상태로 */
export function backupLineNow(fmt) {
  return backupLine(readBackupState(), { on: cloudOn(), token: !!getToken() }, fmt);
}

/** 이 기기의 날짜 (track.todayKey와 같은 꼴) */
const todayOf = (now) => dayOf(now);

/**
 * 한 번 올리기 (다른 창과 겹치지 않는 자리에서)
 * @returns {Promise<{ok:boolean, skipped?:boolean, why?:string, path?:string, bytes?:number}>}
 */
async function backupOnce({ force, fetchFn, now }) {
  const token = getToken();
  const today = todayOf(now);
  const st = readBackupState();
  const online = typeof navigator === 'undefined' || navigator.onLine !== false;
  const why = backupDue({ on: cloudOn(), token, online, today, now, state: st, force });
  if (why) return { ok: false, skipped: true, why };
  const fail = (w, more = {}) => { writeBackupState({ ...readBackupState(), try: { at: now, ok: false, why: w, ...more } }); return { ok: false, why: w }; };
  // 저장을 기다리는 프로필 증분을 먼저 — 방금 잡은 포켓몬이 빠지지 않게 (📤와 같은 까닭 · 실패해도 그대로)
  await import('./xp.js').then((xp) => xp.flushProfile()).catch(() => {});
  let core;
  try { core = await exportStats(); } catch { return fail('read'); }
  if (isEmptyData(core)) return fail('empty');
  // 🎒 도감 종 수는 줄지 않는다(잡은 수는 더하기만 · 병합은 큰 값) — 지난 백업보다 작으면 기록이 깨진 것이라 올리지 않는다 (🔍 Codex 165차 B)
  //   되살리기 목록은 최신 것이 맨 위라, 깨진 기록이 그날 백업으로 올라가면 그것을 고르게 된다 · 📊 「지금 백업하기」도 막는다
  const species = monCount(meOf(core)).species;
  if (st.ok && Number(st.ok.species) > species) return fail('shrink', { from: Number(st.ok.species), to: species });
  delete core.exportedAt; // 지문은 내용만으로 (시각이 바뀌어도 같은 내용이면 같은 지문)
  const hash = textHash(JSON.stringify(core));
  if (!force && st.ok && st.ok.hash === hash) { writeBackupState({ ...st, sameAt: now }); return { ok: false, skipped: true, why: 'same' }; }
  const raw = new TextEncoder().encode(JSON.stringify({ ...core, kind: 'cloud', device: deviceOf(typeof navigator !== 'undefined' ? navigator.userAgent : ''), exportedAt: new Date(now).toISOString() }));
  let gz;
  try { gz = await gzipBytes(raw); } catch { return fail('zip'); }
  const bytes = gz || raw;
  if (bytes.length > BACKUP_MAX_BYTES) return fail('big');
  const path = backupPath(today, !!gz);
  try {
    await putFile({ fetchFn, token, path, text: bytes, message: `☁️ 백업 ${today}` }); // 메시지에는 기록을 넣지 않는다
  } catch (e) {
    return fail((e && e.message) || String(e));
  }
  writeBackupState({ ok: { day: today, at: now, hash, path, bytes: bytes.length, raw: raw.length, species }, try: { at: now, ok: true } });
  return { ok: true, path, bytes: bytes.length, raw: raw.length };
}

let running = null;
/**
 * ☁️ 백업 — 같은 창은 한 번에 하나(도는 중이면 같은 약속) · 다른 창은 Web Locks(도는 창이 있으면 이번엔 그만)
 * @param {{force?:boolean, fetchFn?:Function, now?:number, locks?:object}} [o]
 */
export function runBackup({ force = false, fetchFn, now, locks } = {}) {
  if (running) return running;
  const go = () => backupOnce({ force, fetchFn: fetchFn || fetch, now: now || Date.now() });
  const lk = locks !== undefined ? locks : (typeof navigator !== 'undefined' ? navigator.locks : undefined);
  const p = lk && typeof lk.request === 'function'
    ? lk.request('shincoach-backup', { ifAvailable: true }, (lock) => (lock ? go() : { ok: false, skipped: true, why: 'busy' }))
    : go();
  running = Promise.resolve(p).catch((e) => ({ ok: false, why: (e && e.message) || String(e) })).finally(() => { running = null; });
  return running;
}

/** 저절로 — 실패해도 조용히 (아이 화면엔 아무것도 안 뜬다) */
export function autoBackup() {
  return runBackup().catch(() => ({ ok: false }));
}

// ───────────────────── 되살리기 (📊 — 부모) ─────────────────────

/** 비공개 저장소의 백업 목록 — 새것부터 LIST_N개 */
export async function listBackups({ fetchFn } = {}) {
  const token = getToken();
  if (!token) throw new Error('📤 열쇠가 없어요 — 📊 「📤 Claude에게 기록 보내기」에서 먼저 넣어 주세요');
  return newestFirst(await listDir({ fetchFn: fetchFn || fetch, token, path: BACKUP_DIR }));
}

/** 백업 하나 받기 — 풀고 읽어 꼴을 본다 (신코치 백업이 아니면 실패) */
export async function loadBackup(file, { fetchFn } = {}) {
  const token = getToken();
  if (!token) throw new Error('📤 열쇠가 없어요');
  const blob = await getRawFile({ fetchFn: fetchFn || fetch, token, path: file.path, maxBytes: BACKUP_MAX_BYTES });
  if (!blob) throw new Error('백업 파일이 없어요');
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let data;
  try {
    data = JSON.parse(/\.gz$/.test(file.name) ? await gunzipText(bytes) : new TextDecoder().decode(bytes));
  } catch (e) {
    throw new Error(`백업 파일을 못 읽었어요 — ${(e && e.message) || e}`);
  }
  if (!data || data.app !== 'shincoach' || !Array.isArray(data.profile)) throw new Error('신코치 백업이 아니에요');
  return data;
}

/**
 * 백업이 앞서게 (순수) — 아이 프로필('me')의 저장 시각을 이 기기 것보다 뒤로 옮긴 사본.
 * 병합은 💰·🎒 가방·🥚 알·파트너·꾸밈을 "최근에 저장된 쪽"에서 통째로 쓴다(db.mergeStatRecord) — 새 태블릿에서 첫 선물(💰·스타터)을 받은 뒤 되살리면
 * 새 기기 쪽이 "최근"이라 백업의 💰 777이 400이 되고 알이 사라졌다 (v361 진짜 화면에서 찾음)
 */
export function leadData(data, before) {
  const t = Math.max(Number(before && before.updatedAt) || 0, Number((meOf(data) || {}).updatedAt) || 0) + 1;
  return { ...data, profile: data.profile.map((r) => (r && r.id === 'me' ? { ...r, updatedAt: t } : r)) };
}

/**
 * 이 기기가 그 백업을 **이은 기기가 아닌가** (순수) — 줄지 않는 수(도감 종 수 · 번 코인 누적 · XP · 잡은 수) 가운데 하나라도 백업이 크면 그렇다.
 * 이 수들은 더하기만 하고 병합도 큰 값이라, 백업 뒤에 쓴 기기(쓰던 태블릿)는 모두 백업 이상이다 — 코인을 쓰거나 알을 부화시켜도 마찬가지.
 * 새 태블릿은 첫 선물만 받았거나 몇 마리 잡았어도 어느 하나는 백업보다 작다 (도감 종 수만 보면 같을 때 놓쳤다 — 🔍 Codex 165차 #1)
 */
export function backupAhead(cur, bk) {
  if (!cur) return true;
  const n = (p, k) => Math.max(0, Number(p && p[k]) || 0);
  return monCount(cur).species < monCount(bk).species || ['coinsEarned', 'xp', 'catches'].some((k) => n(cur, k) < n(bk, k));
}

/**
 * 되살리기 — 가져오기와 같은 병합(db.importStats). 되살린 뒤 포켓몬 셈을 백업과 견준다.
 *   이 기기가 그 백업을 이은 기기가 아니면(lead — backupAhead) 백업이 앞선다(leadData — 백업 쪽 💰·가방·알·파트너) ·
 *   되살린 뒤 가진 수·도감·알이 모두 백업 이상이어야 한다.
 *   쓰던 기기(줄지 않는 수가 모두 백업 이상)에 옛 백업을 합치면 지금 쪽이 앞서고(그 뒤 진화·판 것·부화가 있다) 도감 종 수만 본다
 * @returns {Promise<{n:number, want:object, got:object, lead:boolean, same:boolean, ghosts:number, already:number}>}
 *   ghosts = 다시 넣으면 진도가 이어질 영상 수 · already = 같은 이름의 영상이 이미 다른 id로 들어 있는 수(🗑로 지우고 다시 넣으면 이어진다)
 */
export async function restoreBackup(data) {
  const before = await getProfile().catch(() => null);
  const want = monCount(meOf(data));
  const lead = backupAhead(before, meOf(data));
  const n = await importStats(lead && before ? leadData(data, before) : data); // 프로필이 아예 없으면 그대로 들어간다(옮길 시각이 없다)
  const got = monCount(await getProfile());
  const same = lead ? got.have >= want.have && got.species >= want.species && got.eggs >= want.eggs : got.species >= want.species;
  const ghostIds = new Set(readGhosts().map((g) => g.id));
  const back = (Array.isArray(data.items) ? data.items : []).filter((it) => it && ghostIds.has(it.id));
  let already = 0;
  try {
    const items = await listItems();
    already = back.filter((b) => items.some((it) => it && !it.broken && ((b.videoName && it.videoName === b.videoName) || (b.title && it.title === b.title)))).length;
  } catch { already = 0; }
  return { n, want, got, lead, same, ghosts: back.length, already };
}
