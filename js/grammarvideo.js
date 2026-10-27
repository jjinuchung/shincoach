// 🎬 영상 문장 문제 (v350, 2026-10-27 — 원고 두 번 검수 「이대로」 · 쪽지 안 자리 ① 고르기 하나를 영상 문장 문제로)
// 진우가 🎬 영상 따라 하기에서 끝낸 대사로 만든 문법 문제를 📝 문법 쪽지의 고르기 하나 자리에 끼운다
//   (규칙은 grammar.js — checkVideoQ·dealVideo·videoResting · 쪽지 화면은 grammarnote.js · 문장을 모으는 곳은 player.js)
// 원고는 진우가 본 영상 대사라 공개 저장소(앱 사이트)에 두지 않는다 → 비공개 저장소 grammar/video.json(배열)을 📤 열쇠로 받아
//   이 기기(localStorage)에 둔다 (🐸 기술 그림 battlefx.js와 같은 꼴) · 열쇠가 없거나 아직 못 받았으면 지금처럼 원고 쪽지만 · 배포 없이 더하고 고친다
// 고르는 차례 (검수 페이지 「어떻게 나오나」): 배운 단원(쪽지로 본 단원)의 문제 가운데
//   ① 지금 영상에서 오늘 끝낸 문장 — 최근 것부터 · 🔊 그 장면 → ② 다른 날·다른 영상에서 끝낸 문장 — 안 낸 문제 먼저, 그다음 최근에 말한 것 ·
//   영상 이름을 보인다 → 없으면 null(원고 쪽지 그대로) · 쉬는 문제(맞힘 14일 · 틀림 2일 — grammar.VIDEO_REST)는 건너뛴다
// 맞추기: 문장 글(normSay — 소문자·따옴표·문장부호 무시)과 영상 이름(원고 from = 태블릿 영상 이름)이 둘 다 같아야 한다
//   (같은 대사라도 다른 영상에선 우리말 뜻이 다를 수 있어서)
import { checkVideoQ, videoResting } from './grammar.js';

/** 비공개 저장소의 원고 — [{ id V###, unit G#, from, say, kind pick|type, ko, en|ask, opts | hint·ans·traps·why }] */
export const VIDEO_PATH = 'grammar/video.json';
/** 받기 — 10분에 한 번까지 · 30초 넘으면 끊는다(받아 둔 것 그대로) */
export const SYNC_MS = 10 * 60 * 1000;
export const VIDEO_LIST_MS = 30 * 1000;
/** 받아 둘 줄 수 상한 (원고 두 회차 148줄 — 넉넉히) */
export const VIDEO_MAX_ROWS = 600;
const KEY = { list: 'shincoach.grammarVideo', at: 'shincoach.grammarVideoAt' };

function load(k, d) {
  try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v === null ? d : v; } catch { return d; }
}
function save(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; }
}

// ── 순수 ──

/** 대사 맞추기 열쇠 — 소문자 · 둥근 따옴표 → ' · 글자·숫자·'·빈칸 밖은 빈칸 · 빈칸 하나로 (원고 검사 check_video.mjs와 같은 규칙) */
export function normSay(s) {
  return String(s == null ? '' : s).toLowerCase().replace(/[’‘]/g, '\'').replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
}
const keyOf = (say, from) => `${normSay(say)}\u0000${String(from == null ? '' : from).trim()}`;

/**
 * 원고 → 쓸 줄 (순수) — checkVideoQ를 통과하고 · 번호가 안 겹치고 · (대사, 영상)이 안 겹치는 줄 · VIDEO_MAX_ROWS까지 · bad = 빠진 줄 수
 * @returns {{rows: object[], bad: number}}
 */
export function videoRows(list, types) {
  const rows = [];
  let bad = 0;
  const ids = new Set();
  const keys = new Set();
  // 꼴이 아주 깨진 줄(en이 글이 아님 등)은 검사가 던질 수 있다 — 그 줄만 빼고 센다 (🔍 Codex 154차: 한 줄이 쪽지를 통째로 막았다)
  const broken = (q) => { try { return checkVideoQ(q, types).length > 0; } catch { return true; } };
  for (const q of Array.isArray(list) ? list : []) {
    const k = q && typeof q === 'object' ? keyOf(q.say, q.from) : '';
    if (rows.length >= VIDEO_MAX_ROWS || broken(q) || ids.has(q.id) || keys.has(k)) { bad++; continue; }
    ids.add(q.id);
    keys.add(k);
    rows.push(q);
  }
  return { rows, bad };
}

/**
 * 이번 쪽지에 끼울 영상 문제 하나 (순수) → { q, tier: 'now'|'before', title, cue } 또는 null
 * @param {{rows:object[], learned:Set<string>|string[], now?:Array<{en:string, title:string, cue?:object}>, before?:Array<{en:string, title:string, cue?:object, at?:number}>, seen?:object, today:number}} o
 *   rows = videoRows의 줄 · learned = 배운 단원 id · now = 지금 영상에서 오늘 끝낸 문장(최근 것부터) · before = 그 밖에 끝낸 문장(at = 마지막에 말한 때) ·
 *   seen = 낸 기록(grammar.videoSeenOf 꼴) · today = 날 번호
 */
export function pickVideoQ(o) {
  const learned = new Set(o && o.learned ? o.learned : []);
  const seen = o && o.seen ? o.seen : {};
  const today = o ? o.today : 0;
  const index = new Map();
  for (const q of o && Array.isArray(o.rows) ? o.rows : []) {
    if (!learned.has(q.unit) || videoResting(seen, q.id, today)) continue;
    index.set(keyOf(q.say, q.from), q);
  }
  if (!index.size) return null;
  for (const s of Array.isArray(o.now) ? o.now : []) {
    const q = s ? index.get(keyOf(s.en, s.title)) : null;
    if (q) return { q, tier: 'now', title: String(s.title), cue: s.cue || null };
  }
  let best = null;
  for (const s of Array.isArray(o.before) ? o.before : []) {
    const q = s ? index.get(keyOf(s.en, s.title)) : null;
    if (!q) continue;
    const fresh = !seen[q.id];
    const at = Number(s.at) || 0;
    if (!best || (fresh && !best.fresh) || (fresh === best.fresh && at > best.at)) best = { q, fresh, at, title: String(s.title), cue: s.cue || null };
  }
  return best ? { q: best.q, tier: 'before', title: best.title, cue: best.cue } : null;
}

// ── 이 기기 ──

/** 받아 둔 원고 (그대로 — 쓸 줄은 쪽지를 고를 때 videoRows로) */
export function videoList() {
  const v = load(KEY.list, []);
  return Array.isArray(v) ? v : [];
}

let syncing = null;
/**
 * 받기 — 10분에 한 번까지(force면 바로) · 받은 목록이 비었으면(열쇠 없음·파일 없음·인터넷 없음) 받아 둔 것 그대로 ·
 * 빠진 줄은 📊 📥 받기 줄에 ⚠️로(아버님이 볼 수 있게) · 받아 둔 줄 수를 돌려준다
 * @param {{now?:Function, readList?:Function, types?:Function, noteCheck?:Function, listMs?:number}} [deps] 시험용
 */
export function syncVideoQs(force = false, deps = {}) {
  if (syncing) return syncing;
  syncing = doSync(force, deps).finally(() => { syncing = null; });
  return syncing;
}

async function doSync(force, deps) {
  const now = (deps.now || Date.now)();
  const at = Number(load(KEY.at, 0)) || 0;
  if (!force && at > 0 && now - at >= 0 && now - at < SYNC_MS) return videoList().length; // 한 번도 안 받았으면 바로
  save(KEY.at, now);
  const readList = deps.readList || (async (p) => (await import('./upload.js')).readPrivateList(p));
  let list = [];
  try { list = await within(readList(VIDEO_PATH), deps.listMs || VIDEO_LIST_MS); } catch { list = []; }
  if (!Array.isArray(list) || !list.length) return videoList().length;
  const keep = list.slice(0, VIDEO_MAX_ROWS);
  const note = deps.noteCheck || (async (c) => (await import('./upload.js')).noteReadCheck(VIDEO_PATH, c));
  // 이 기기 저장 공간이 차서 못 두었으면 받아 둔 것 그대로 · 📥에는 ⚠️ 받지 않은 문제로 (🔍 Codex 154차: ✅로 보였다)
  if (!save(KEY.list, keep)) {
    try { await note({ rows: list.length, bad: list.length }); } catch { /* 못 적어도 */ }
    return videoList().length;
  }
  try {
    // 원고 꼴 확인용 오개념 목록도 시간 안에 — 멈추면 이번 확인만 건너뛴다(다음 받기가 묶이지 않게 · 🔍 Codex 154차)
    const types = await within((deps.types || defaultTypes)(), deps.typesMs || VIDEO_LIST_MS);
    const got = videoRows(keep, types);
    await note({ rows: list.length, bad: got.bad + (list.length - keep.length) });
  } catch { /* 못 견줘도 받기는 그대로 */ }
  return keep.length;
}

async function defaultTypes() {
  const res = await fetch('./coach/english/grammar.json');
  if (!res.ok) throw new Error(String(res.status));
  const json = await res.json();
  return json && typeof json === 'object' ? json.types : null;
}

/** p가 ms 안에 안 끝나면 실패로 */
function within(p, ms) {
  let t;
  const late = new Promise((_, reject) => { t = setTimeout(() => reject(new Error('시간 넘음')), ms); });
  return Promise.race([Promise.resolve(p), late]).finally(() => clearTimeout(t));
}
