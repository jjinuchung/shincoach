// 📝 영어 문법 (v348, 2026-10-27 — 아버님 "한국 초·중 교과를 따라가려면 문법도" → 기본안 "이대로") — 규칙만 (화면 없음 · check.mjs·시험이 같이 쓴다)
// 원고 coach/english/grammar.json = { v, types: { 오개념: { name, what } }, units: [16단원], diag: [「🔍 어디까지 알까?」 8문제] }
//   단원 = 📘 개념 한 장(short · say 세 줄 · term 중학교 용어 다리 · ex 예문 셋) + 문제 12(고르기 8 · 쳐 넣기 2 · 순서 맞추기 2)
//   원고는 .context/grammar/review8.mjs·units16.mjs에서 만든다(검수 "이대로" — json을 손으로 고치지 않는다)
// 한 판 = 개념 한 장 → 문제 6(고르기 4 · 쳐 넣기 1 · 순서 1) — 단원의 12문제 가운데 안 본 것부터(두 판이면 다 본다) ·
//   틀려도 하트·감점 없음, 틀린 보기는 ✗와 왜 한 줄을 보고 다시 · 판을 끝낼 때 한 번 저장(그만두면 안 남는다 — 🖊️ 논술과 같다)
// 보상은 💰만 (10-27 아버님 "문법 학습에서 포켓몬을 왜 줘야 하지? … 코인 같은 보상만으로 충분" — 포켓몬은 📮 편지에서 아주 가끔):
//   그날 처음 끝낸 판 💰 · 단원을 처음 ⭐(한 번도 안 틀림)로 끝내면 💰 더(단원마다 한 번) · 🎯 잡기 없음 · 문법 전용 포켓몬 명단 없음
//   🎁 깜짝 포켓몬 — 판을 끝낼 때 GIFT_CHANCE·하루 한 번까지 · 미리 말하지 않는다(오늘 줄·홈에 없음) · 아직 못 잡은 영어 포켓몬 하나를 도감에 바로(알 부화와 같은 caught +1)
// 기록: 단원 칸 grammar { G#: { box, due, at, miss, d0 } }(korwords 꼴) · grammarDay · grammarKnown(진단으로 건너뛴 단원) ·
//   grammarSeen(단원마다 본 문제 12비트) · grammarMiss(오개념마다 틀린 수 — 늘어나기만) · grammarDiag(진단을 끝낸 날) · grammarGift { n, day, id } — 아이 화면엔 셈 없음
import { dayNum } from './korean.js';
import { stateOf, wordsOf, wordDaysOf, wordsToday } from './korwords.js';

/** 그날 처음 끝낸 판의 💰 */
export const GRAMMAR_COINS = 10;
/** 단원을 처음 ⭐로 끝냈을 때 더 주는 💰 (단원마다 한 번 — 아버님 10-27 "처음 ⭐에 💰10 더") */
export const STAR_COINS = 10;
/** 🎁 깜짝 포켓몬 확률 (판을 끝낼 때마다 · 하루 한 번까지 — 아버님 10-27 "거의 1%") */
export const GIFT_CHANCE = 0.01;
/** ⭐ — 판을 처음부터 한 번도 안 틀리고 끝낸 단원 (그 뒤엔 연습으로만) */
export const SOLVED = 1;
/** 단원 문제 꼴 · 한 판에 내는 수 */
export const UNIT_SHAPE = { pick: 8, type: 2, order: 2 };
export const ROUND_SHAPE = { pick: 4, type: 1, order: 1 };
export const UNIT_QS = 12;
const FULL = (1 << UNIT_QS) - 1;
export const KINDS = ['pick', 'type', 'order'];
/** 쳐 넣기에서 따옴표만 빠졌을 때 (오개념 apos) */
export const APOS_WHY = '거의 맞아요 — 따옴표(\')를 넣어요';
const UNIT_RE = /^G\d{1,2}$/;
const TYPE_KEY_RE = /^[a-z]{2,12}$/;
const PUNCT = new Set(['.', '?', '!', ',']);
const CURLY = /[‘’“”]/;
const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v) => typeof v === 'string' && v.trim().length > 0;
const cnt = (v) => { const n = Math.floor(Number(v)); return Number.isSafeInteger(n) && n > 0 ? n : 0; };
const big = (n) => Math.min(Number.MAX_SAFE_INTEGER, n);

// ───────────────────── 원고 ─────────────────────

/** 쳐 넣기 답 다듬기 — 둥근 따옴표·´·` → ' · 공백 정리 · 대소문자 무시 · 끝 문장부호 빼기 */
export function normType(s) {
  return String(s == null ? '' : s).replace(/[’‘´`]/g, '\'').replace(/\s+/g, ' ').trim().toLowerCase().replace(/[.!?]+$/, '').trim();
}
/** 순서 카드를 이은 문장 — 문장부호 카드는 앞 낱말에 붙인다 */
export function joinTiles(tiles) {
  let s = '';
  for (const t of Array.isArray(tiles) ? tiles : []) s = PUNCT.has(t) ? s + t : (s ? `${s} ${t}` : String(t));
  return s;
}
const blanks = (q) => ((q.en || (Array.isArray(q.talk) ? q.talk.join(' ') : '')).match(/___/g) || []).length;

function pickProblems(q, where, types) {
  const bad = [];
  if (!str(q.ko)) bad.push(`${where}: ko(우리말 뜻)가 없어요`);
  if (q.en !== undefined || q.talk !== undefined) {
    if (q.talk !== undefined && (!Array.isArray(q.talk) || !q.talk.every(str))) bad.push(`${where}: talk는 글 목록`);
    else if (blanks(q) !== 1) bad.push(`${where}: 빈칸(___)은 하나`);
  } else if (!str(q.ask)) bad.push(`${where}: 빈칸 문장(en·talk)도 물음(ask)도 없어요`);
  if (!Array.isArray(q.opts) || q.opts.length < 3 || q.opts.length > 4) { bad.push(`${where}: 보기는 셋이나 넷`); return bad; }
  if (q.opts.filter((o) => isObj(o) && o.ok === true).length !== 1) bad.push(`${where}: 정답은 하나`);
  const seen = new Set();
  q.opts.forEach((o, k) => {
    if (!isObj(o) || !str(o.t)) { bad.push(`${where}: 보기 ${k + 1} 글이 비었어요`); return; }
    const n = normType(o.t);
    if (seen.has(n)) bad.push(`${where}: 보기 ${k + 1}가 다른 보기와 같아요`);
    seen.add(n);
    if (CURLY.test(o.t)) bad.push(`${where}: 보기 ${k + 1}에 둥근 따옴표`);
    if (o.ok === true) { if (o.type !== undefined || o.why !== undefined) bad.push(`${where}: 정답 보기에 type·why는 없어요`); return; }
    if (!own(types, o.type)) bad.push(`${where}: 보기 ${k + 1} 오개념 「${o.type}」을 몰라요`);
    if (!str(o.why)) bad.push(`${where}: 보기 ${k + 1} why가 비었어요`);
  });
  return bad;
}
function typeProblems(q, where, types) {
  const bad = [];
  if (!str(q.en) || blanks(q) !== 1) bad.push(`${where}: 쳐 넣기는 빈칸(___) 하나인 en`);
  if (!str(q.ko)) bad.push(`${where}: ko가 없어요`);
  if (!str(q.hint)) bad.push(`${where}: hint가 없어요`);
  if (!str(q.why)) bad.push(`${where}: why(맞는 답 풀이)가 없어요`);
  if (!Array.isArray(q.ans) || !q.ans.length || !q.ans.every(str)) { bad.push(`${where}: ans(맞는 답)가 없어요`); return bad; }
  if (q.ans.some((a) => CURLY.test(a))) bad.push(`${where}: 답에 둥근 따옴표`);
  const ans = new Set(q.ans.map(normType));
  if (q.traps !== undefined && !isObj(q.traps)) bad.push(`${where}: traps는 { 오답: [오개념, 풀이] }`);
  for (const [w, v] of Object.entries(isObj(q.traps) ? q.traps : {})) {
    if (w !== normType(w)) bad.push(`${where}: traps 열쇠 「${w}」는 다듬은 꼴(소문자·한 칸 띄어쓰기)로`);
    if (ans.has(normType(w))) bad.push(`${where}: traps 「${w}」가 맞는 답에도 있어요`);
    if (!Array.isArray(v) || !own(types, v[0]) || !str(v[1])) bad.push(`${where}: traps 「${w}」는 [오개념, 풀이]`);
  }
  return bad;
}
function orderProblems(q, where) {
  const bad = [];
  if (!str(q.ko)) bad.push(`${where}: ko가 없어요`);
  if (!Array.isArray(q.tiles) || q.tiles.length < 3 || !q.tiles.every(str)) { bad.push(`${where}: tiles는 셋 이상`); return bad; }
  if (joinTiles(q.tiles) !== q.ans) bad.push(`${where}: 카드를 이으면 「${joinTiles(q.tiles)}」 ≠ ans`);
  const words = q.tiles.filter((t) => !PUNCT.has(t));
  if (!words.length || !/^[A-Z]/.test(words[0])) bad.push(`${where}: 첫 낱말은 대문자로`);
  if (q.tiles.filter((t) => PUNCT.has(t)).length !== 1 || !PUNCT.has(q.tiles[q.tiles.length - 1])) bad.push(`${where}: 문장부호는 맨 끝에 하나`);
  return bad;
}

/** 단원 하나의 틀린 곳 */
function unitProblems(u, types) {
  if (!isObj(u)) return ['단원이 객체가 아님'];
  const id = str(u.id) ? u.id : '?';
  const bad = [];
  if (!UNIT_RE.test(id)) bad.push(`${id}: 번호는 G숫자`);
  if (u.band !== 'review' && u.band !== 'new') bad.push(`${id}: band는 review·new`);
  if (!str(u.title) || !str(u.short) || !str(u.term)) bad.push(`${id}: title·short·term`);
  if (!Array.isArray(u.say) || u.say.length !== 3 || !u.say.every(str)) bad.push(`${id}: 개념 설명은 세 줄`);
  if (!Array.isArray(u.ex) || u.ex.length !== 3 || !u.ex.every((e) => Array.isArray(e) && e.length === 2 && str(e[0]) && str(e[1]))) bad.push(`${id}: 예문은 [영어, 우리말] 셋`);
  if (!Array.isArray(u.qs) || u.qs.length !== UNIT_QS) { bad.push(`${id}: 문제는 ${UNIT_QS}개`); return bad; }
  const n = { pick: 0, type: 0, order: 0 };
  u.qs.forEach((q, i) => {
    const where = `${id}-${i + 1}`;
    if (!isObj(q) || !KINDS.includes(q.kind)) { bad.push(`${where}: kind는 pick·type·order`); return; }
    n[q.kind]++;
    if (q.kind === 'pick') bad.push(...pickProblems(q, where, types));
    else if (q.kind === 'type') bad.push(...typeProblems(q, where, types));
    else bad.push(...orderProblems(q, where));
  });
  for (const k of KINDS) if (n[k] !== UNIT_SHAPE[k]) bad.push(`${id}: 고르기 ${UNIT_SHAPE.pick} · 쳐 넣기 ${UNIT_SHAPE.type} · 순서 ${UNIT_SHAPE.order} (지금 ${n.pick}·${n.type}·${n.order})`);
  return bad;
}
const typesOf = (json) => (isObj(json) && isObj(json.types) ? json.types : {});

/** 원고 형식 검사 → 틀린 곳 목록(비면 통과) — check.mjs가 배포 전에, 화면은 allUnits로 깨진 단원을 뺀다 */
export function checkGrammar(json) {
  if (!isObj(json) || !Array.isArray(json.units) || !json.units.length) return ['units가 없음'];
  const types = typesOf(json);
  const bad = [];
  for (const [k, t] of Object.entries(types)) if (!TYPE_KEY_RE.test(k) || !isObj(t) || !str(t.name) || !str(t.what)) bad.push(`오개념 ${k}: { name, what }`);
  if (!Object.keys(types).length) bad.push('types(오개념)가 없음');
  const ids = new Set();
  for (const u of json.units) {
    bad.push(...unitProblems(u, types));
    if (isObj(u) && str(u.id)) { if (ids.has(u.id)) bad.push(`${u.id}: 번호가 겹침`); ids.add(u.id); }
  }
  if (!Array.isArray(json.diag)) bad.push('diag(🔍 어디까지 알까?)가 없음');
  else {
    const seen = new Set();
    json.diag.forEach((q, i) => {
      const where = `진단-${i + 1}`;
      if (!isObj(q) || q.kind !== 'pick') { bad.push(`${where}: 고르기만`); return; }
      const u = json.units.find((x) => isObj(x) && x.id === q.unit);
      if (!u || u.band !== 'review') bad.push(`${where}: 복습 단원(review)의 문제`);
      if (seen.has(q.unit)) bad.push(`${where}: 단원 ${q.unit}이 두 번`);
      seen.add(q.unit);
      bad.push(...pickProblems(q, where, types));
    });
  }
  return bad;
}

/** 쓸 수 있는 단원만 (원고 차례 · 깨진 단원은 조용히 뺀다 — 배포 전 검사는 checkGrammar) */
export function allUnits(json) {
  const types = typesOf(json);
  const list = isObj(json) && Array.isArray(json.units) ? json.units : [];
  const seen = new Set();
  return list.filter((u) => !unitProblems(u, types).length && !seen.has(u.id) && !!seen.add(u.id));
}
/** 쓸 수 있는 진단 문제만 (단원이 있는 것) */
export function allDiag(json, units) {
  const types = typesOf(json);
  const ids = new Set((Array.isArray(units) ? units : []).filter((u) => u.band === 'review').map((u) => u.id));
  const list = isObj(json) && Array.isArray(json.diag) ? json.diag : [];
  const seen = new Set();
  return list.filter((q) => isObj(q) && q.kind === 'pick' && ids.has(q.unit) && !pickProblems(q, '', types).length && !seen.has(q.unit) && !!seen.add(q.unit));
}
/** 오개념 이름표 (없는 열쇠면 열쇠 그대로) */
export function typeName(types, k) {
  return isObj(types) && isObj(types[k]) && str(types[k].name) ? types[k].name : String(k);
}

// ───────────────────── 기록 고쳐 읽기·병합 (db·xp가 같이 쓴다) ─────────────────────

/** 진단으로 건너뛴 단원 { G#: 날 } */
export function knownOf(raw) {
  const out = {};
  if (!isObj(raw)) return out;
  for (const k of Object.keys(raw).slice(0, 40)) { const d = cnt(raw[k]); if (UNIT_RE.test(k) && d) out[k] = d; }
  return out;
}
/** 병합 — 합집합 · 이른 날 */
export function mergeKnown(a, b) {
  const x = knownOf(a);
  const y = knownOf(b);
  for (const k of Object.keys(y)) x[k] = x[k] ? Math.min(x[k], y[k]) : y[k];
  return x;
}
/** 단원마다 본 문제 { G#: 12비트 } — 0도 남긴다(다 보고 처음부터 시작했다는 표시 — 옛 백업의 비트가 되살아나지 않게, 🔍 Codex 152차 #4) */
export function seenOf(raw) {
  const out = {};
  if (!isObj(raw)) return out;
  for (const k of Object.keys(raw).slice(0, 40)) {
    const n = Math.floor(Number(raw[k]));
    if (UNIT_RE.test(k) && Number.isSafeInteger(n) && n >= 0) out[k] = n & FULL;
  }
  return out;
}
/**
 * 병합 — 단원마다 최근 쪽(newer)을 따른다 · 최근 쪽에 없는 단원만 옛 쪽에서 (🔍 Codex 152차 #4: 합치기(OR)는 12문제를 다 보고 0으로 돌린 뒤
 *   옛 백업의 비트를 되살려 다음 두 판에 12문제가 다 안 나왔다) · 코인·⭐와는 상관없는 문제 차례 기록이라 최근 쪽이면 된다
 */
export function mergeSeen(newer, older) {
  const x = seenOf(older);
  const y = seenOf(newer);
  for (const k of Object.keys(y)) x[k] = y[k];
  return x;
}
/** 오개념마다 틀린 수 { 열쇠: 수 } — 늘어나기만 */
export function gMissOf(raw) {
  const out = {};
  if (!isObj(raw)) return out;
  for (const k of Object.keys(raw).slice(0, 60)) { const n = cnt(raw[k]); if (TYPE_KEY_RE.test(k) && n) out[k] = n; }
  return out;
}
/** 병합 — 열쇠마다 큰 쪽 */
export function mergeGMiss(a, b) {
  const x = gMissOf(a);
  const y = gMissOf(b);
  for (const k of Object.keys(y)) x[k] = Math.max(x[k] || 0, y[k]);
  return x;
}
/** 진단을 끝낸 날 (0 = 아직) · 병합은 이른 날 */
export const diagOf = (v) => cnt(v);
export const mergeDiag = (a, b) => { const x = cnt(a); const y = cnt(b); return x && y ? Math.min(x, y) : x || y; };
/** 🎁 깜짝 포켓몬 기록 { n 받은 수, day 마지막 날, id 마지막 포켓몬 } */
export function giftOf(raw) {
  const x = isObj(raw) ? raw : {};
  return { n: cnt(x.n), day: cnt(x.day), id: cnt(x.id) };
}
/** 병합 — 받은 수가 큰 쪽(같으면 늦은 날) · 날은 늦은 쪽(옛 백업이 "오늘 아직"으로 되돌려 하루에 두 번 나오지 않게) */
export function mergeGift(a, b) {
  const x = giftOf(a);
  const y = giftOf(b);
  const w = y.n > x.n || (y.n === x.n && y.day > x.day) ? y : x;
  return { n: w.n, day: Math.max(x.day, y.day), id: w.id };
}

// ───────────────────── 판 고르기·내기 ─────────────────────

/** ⭐ 단원인가 */
export function isSolved(st) {
  return !!st && stateOf(st).box >= SOLVED;
}

/**
 * 오늘 할 단원 하나 — 다시 볼 단원(틀린 날 다음 날부터, 오래 기다린 것부터) → 차례로 아직 안 한 단원(진단 ✅는 건너뜀) · 없으면 null ·
 * practice면 ⭐·✅ 단원을 연습으로(오래 안 본 것부터 — 진단 ✅만 있고 안 해 본 단원이 먼저)
 */
export function planUnit(units, states, known, now, practice = false) {
  const today = dayNum(now);
  const st = wordsOf(states);
  const kn = knownOf(known);
  const ls = Array.isArray(units) ? units : [];
  if (practice) {
    const pool = ls.filter((u) => (own(st, u.id) && st[u.id].box >= SOLVED) || (own(kn, u.id) && !(own(st, u.id) && st[u.id].box < SOLVED)));
    pool.sort((a, b) => (own(st, a.id) ? st[a.id].at : 0) - (own(st, b.id) ? st[b.id].at : 0));
    return pool.length ? pool[0].id : null;
  }
  const due = ls.filter((u) => own(st, u.id) && st[u.id].box < SOLVED && st[u.id].due <= today).sort((a, b) => st[a.id].due - st[b.id].due);
  if (due.length) return due[0].id;
  const fresh = ls.find((u) => !own(st, u.id) && !own(kn, u.id));
  return fresh ? fresh.id : null;
}

/** 단원 지도 칸 하나의 표시 (순수 · 셈 없이) — 'star' ⭐ · 'again' 🔁 다시 볼 단원 · 'known' ✅ 진단으로 건너뜀 · 'new' 아직 */
export function unitMark(id, states, known) {
  const st = wordsOf(states);
  if (own(st, id)) return st[id].box >= SOLVED ? 'star' : 'again';
  return own(knownOf(known), id) ? 'known' : 'new';
}

function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.max(0, Math.min(i, Math.floor((Number(rng()) || 0) * (i + 1)))); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
/** 순서 카드 섞기 — 맞는 차례 그대로 나오지 않게(카드가 모두 같은 글이면 어쩔 수 없다) */
export function shuffleTiles(tiles, rng = Math.random) {
  const idx = tiles.map((_, i) => i);
  for (let k = 0; k < 6; k++) {
    const s = shuffle(idx, rng);
    if (joinTiles(s.map((i) => tiles[i])) !== joinTiles(tiles)) return s;
  }
  return idx.slice(1).concat(idx[0]);
}

/**
 * 한 판에 낼 문제 (순수) — 단원의 12문제 가운데 kind마다 ROUND_SHAPE만큼, 안 본 것(seen 비트가 꺼진 것) 먼저 ·
 * 차례는 고르기 → 쳐 넣기 → 순서 · 고르기는 보기 차례를, 순서는 카드 차례를 섞는다
 * @returns {Array<{i:number, kind:string, opts?:number[], tiles?:number[]}>}
 */
export function dealRound(unit, seenMask, rng = Math.random) {
  const qs = Array.isArray(unit && unit.qs) ? unit.qs : [];
  let mask = cnt(seenMask) & FULL;
  if (mask === FULL) mask = 0;
  const out = [];
  for (const kind of KINDS) {
    const ids = qs.map((q, i) => (q && q.kind === kind ? i : -1)).filter((i) => i >= 0);
    const fresh = shuffle(ids.filter((i) => !(mask & (1 << i))), rng);
    const old = shuffle(ids.filter((i) => mask & (1 << i)), rng);
    for (const i of [...fresh, ...old].slice(0, ROUND_SHAPE[kind])) {
      const q = qs[i];
      if (kind === 'pick') out.push({ i, kind, opts: shuffle(q.opts.map((_, k) => k), rng) });
      else if (kind === 'order') out.push({ i, kind, tiles: shuffleTiles(q.tiles, rng) });
      else out.push({ i, kind });
    }
  }
  return out;
}
/** 이 판에서 낸 문제를 본 것으로 (다 보면 0 — 다음 판은 처음부터) */
export function seenAfter(mask, idx) {
  let m = cnt(mask) & FULL;
  if (m === FULL) m = 0;
  for (const i of Array.isArray(idx) ? idx : []) if (Number.isInteger(i) && i >= 0 && i < UNIT_QS) m |= 1 << i;
  return m === FULL ? 0 : m;
}

// ───────────────────── 채점 ─────────────────────

/**
 * 쳐 넣기 채점 (순수) → { ok, kind, type?, why } · kind: 'ok' · 'empty'(아무것도 안 씀) · 'trap'(원고가 짚은 오답 — 그 풀이) ·
 * 'apos'(따옴표만 빠짐 — 「거의 맞아요」) · 'other'(그 밖 — 「다시 해 볼까요?」 + 맞는 답 풀이)
 */
export function judgeType(q, input) {
  const n = normType(input);
  if (!n) return { ok: false, kind: 'empty', why: '' };
  const ans = (Array.isArray(q && q.ans) ? q.ans : []).map(normType);
  if (ans.includes(n)) return { ok: true, kind: 'ok', why: '' };
  const traps = isObj(q && q.traps) ? q.traps : {};
  if (own(traps, n) && Array.isArray(traps[n])) return { ok: false, kind: 'trap', type: traps[n][0], why: String(traps[n][1] || '') };
  const bare = (s) => s.replace(/'/g, '');
  if (!n.includes('\'') && ans.some((a) => a.includes('\'') && bare(a) === n)) return { ok: false, kind: 'apos', type: 'apos', why: APOS_WHY };
  return { ok: false, kind: 'other', why: `다시 해 볼까요? ${q && q.why ? `— ${q.why}` : ''}`.trim() };
}

/** 순서 맞추기 채점 (순수) — placed = 놓은 카드 글 차례 → { ok, at: 처음 어긋난 자리(맞으면 -1) } */
export function judgeOrder(q, placed) {
  const tiles = Array.isArray(q && q.tiles) ? q.tiles : [];
  const p = Array.isArray(placed) ? placed : [];
  const ok = p.length === tiles.length && joinTiles(p) === q.ans;
  if (ok) return { ok, at: -1 };
  // 처음 어긋난 자리 — 원고 차례와 견준다(같은 글 카드는 어느 것이든 같다)
  let at = 0;
  while (at < p.length && p[at] === tiles[at]) at++;
  return { ok: false, at };
}

// ───────────────────── 판 끝·진단·잡기 ─────────────────────

/** 한 판에서 오개념마다 틀린 수 다듬기 — 아는 꼴의 열쇠만 · 한 판에 열쇠마다 ROUND_MISS_MAX까지 (부풀린 기록이 📤를 흐리지 않게) */
export const ROUND_MISS_MAX = 12;
function roundMiss(raw) {
  const out = {};
  if (!isObj(raw)) return out;
  for (const k of Object.keys(raw).slice(0, 20)) { const n = Math.min(ROUND_MISS_MAX, cnt(raw[k])); if (TYPE_KEY_RE.test(k) && n) out[k] = n; }
  return out;
}
function addMiss(profile, raw) {
  const add = roundMiss(raw);
  if (!Object.keys(add).length) return;
  const m = gMissOf(profile.grammarMiss);
  for (const k of Object.keys(add)) m[k] = big((m[k] || 0) + add[k]);
  profile.grammarMiss = m;
}

/**
 * 문법 한 판을 끝냈다 — 한 트랜잭션에서: 그 단원 칸 · 본 문제 · 오개념 수 · 그날 처음 끝낸 판이면 💰 ·
 *   단원을 처음 ⭐로 끝냈으면 💰 더(starCoins — 그 단원을 오늘 앞서 푼 적이 없을 때만 · ⭐는 한 번뿐이라 단원마다 한 번) ·
 *   🎁 깜짝 포켓몬(오늘 아직 안 받았고 rng() < GIFT_CHANCE면 pool 가운데 한 번도 안 잡은 것 하나 — 없으면 안 준다)
 * @param {object} profile 저장된 프로필 (mutateProfile 안)
 * @param {{id:string, ok:boolean, from?:number, qs?:number[], miss?:object}} ans ok = 처음부터 한 번도 안 틀렸나 ·
 *   from = 판을 시작할 때 그 단원의 at(새 단원이면 0) — 그 사이 다른 창이 그 단원을 옮겼으면 이 판은 연습 · qs = 이 판에 낸 문제 번호 · miss = 오개념마다 틀린 수
 * @param {number} now @param {string[]} ids 지금 있는 단원 id (모르는 단원은 안 받는다)
 * @param {{pool?:number[], rng?:() => number}} [opt] pool = 깜짝 포켓몬 후보(못 잡은 영어 포켓몬 — 부르는 쪽이 명단에서) · rng = 확률(시험용)
 */
export function grammarRule(profile, ans, now, ids, opt = {}) {
  const id = ans && typeof ans.id === 'string' ? ans.id : '';
  if (!id || !(Array.isArray(ids) ? ids : []).includes(id)) return { ok: false, why: 'empty' };
  const today = dayNum(now);
  const at = cnt(now);
  const st = wordsOf(profile.grammar);
  const cur = st[id] || stateOf(null);
  const stale = ans.from !== undefined && Number(ans.from) !== cur.at;
  const practice = stale || cur.box >= SOLVED;
  let solved = false;
  if (!practice) {
    const d0 = st[id] && cur.d0 ? cur.d0 : today;
    const wat = big(Math.max(at, cur.at + 1)); // 고친 때는 늘 앞으로
    if (ans.ok === true) { st[id] = { box: SOLVED, due: 0, at: wat, miss: cur.miss, d0 }; solved = true; }
    else st[id] = { box: 0, due: today + 1, at: wat, miss: big(cur.miss + 1), d0 };
  }
  profile.grammar = st;
  const seen = seenOf(profile.grammarSeen);
  seen[id] = seenAfter(seen[id], ans.qs); // 다 보면 0 — 0도 남긴다(병합 때 최근 쪽이 「처음부터」를 지키게)
  profile.grammarSeen = seen;
  addMiss(profile, ans.miss);
  // ⭐ 💰 — 처음 ⭐ = 연습이 아닌 판 · 같은 날 틀린 뒤 바로 다시 푼 ⭐는 안 준다(🖊️ 논술 v338 🎯와 같은 조건)
  const starCoins = solved && dayNum(cur.at) !== today ? STAR_COINS : 0;
  const first = !wordsToday(profile.grammarDay, now);
  const days = wordDaysOf(profile.grammarDay, today);
  if (first) days[today] = 1;
  const coins = (first ? GRAMMAR_COINS : 0) + starCoins;
  if (coins) {
    profile.coins = (Number(profile.coins) || 0) + coins;
    profile.coinsEarned = (Number(profile.coinsEarned) || 0) + coins;
  }
  profile.grammarDay = wordDaysOf(days, today);
  const gift = giftRoll(profile, today, opt);
  return { ok: true, first, coins, starCoins, solved, practice, gift };
}

/**
 * 🎁 깜짝 포켓몬 후보 (순수) — 명단 가운데 영어 포켓몬 · 전설·환상 아님 · 지금 레벨에 열린 것 (못 잡은 것은 grammarRule이 트랜잭션 안에서 고른다)
 * @param {Array<{id:number}>} roster @param {(id:number) => string} subjectOf @param {number[]} legendary @param {(id:number) => boolean} unlocked
 */
export function giftPoolOf(roster, subjectOf, legendary, unlocked) {
  const legend = new Set(Array.isArray(legendary) ? legendary : []);
  return (Array.isArray(roster) ? roster : []).filter((m) => m && subjectOf(m.id) === 'english' && !legend.has(m.id) && unlocked(m.id)).map((m) => m.id);
}

/**
 * 🎁 판마다 한 번 뽑아 둔 수로 만든 난수 (순수) — 저장이 실패해 [다시 저장하기]를 눌러도 같은 판은 같은 추첨 (🔍 Codex 152차 #2) ·
 * 트랜잭션 규칙이 불릴 때마다 새로 만든다(규칙이 다시 불려도 같은 차례) · rolls가 없거나 깨졌으면 Math.random
 */
export function rngFrom(rolls) {
  const r = Array.isArray(rolls) ? rolls.map(Number).filter((x) => Number.isFinite(x) && x >= 0 && x < 1) : [];
  if (!r.length) return Math.random;
  let i = 0;
  return () => r[i++ % r.length];
}

/** 🎁 깜짝 포켓몬 (grammarRule 안) — 오늘 아직이고 확률에 들면 못 잡은 후보 하나를 도감에 · 준 포켓몬 id(없으면 0) */
function giftRoll(profile, today, opt) {
  const g = giftOf(profile.grammarGift);
  if (g.day === today) return 0;
  const rng = typeof opt.rng === 'function' ? opt.rng : Math.random;
  if (!((Number(rng()) || 0) < GIFT_CHANCE)) return 0;
  const caught = isObj(profile.caught) ? profile.caught : {};
  const pool = [...new Set((Array.isArray(opt.pool) ? opt.pool : []).filter((id) => Number.isSafeInteger(id) && id > 0))].filter((id) => !(Number(caught[id]) > 0));
  if (!pool.length) return 0;
  const id = pool[Math.min(pool.length - 1, Math.floor((Number(rng()) || 0) * pool.length))];
  profile.caught = { ...caught, [id]: Math.max(0, Number(caught[id]) || 0) + 1 }; // 깨진 음수 기록이어도 도감에 하나 (🔍 Codex 152차 #3)
  profile.grammarGift = { n: big(g.n + 1), day: today, id };
  return id;
}

/**
 * 「🔍 어디까지 알까?」를 끝냈다 — 맞힌 단원(처음 고른 답이 맞은 것)을 ✅로 · 진단을 끝낸 날 · 오개념 수 (보상 없음)
 * @param {{ok:string[], miss?:object}} ans ok = 맞힌 단원 id · @param {string[]} ids 진단 문제가 있는 단원 id
 */
export function diagRule(profile, ans, now, ids) {
  const allow = new Set(Array.isArray(ids) ? ids : []);
  if (!allow.size) return { ok: false, why: 'empty' };
  const today = dayNum(now);
  const kn = knownOf(profile.grammarKnown);
  const got = [...new Set((ans && Array.isArray(ans.ok) ? ans.ok : []).filter((x) => allow.has(x)))];
  for (const k of got) if (!kn[k]) kn[k] = today;
  profile.grammarKnown = kn;
  // 「처음 한 번」 — 이미 끝낸 기록이 있으면(다른 창에서 같이 열어 끝냄) ✅만 합치고 틀린 수는 다시 더하지 않는다 (🔍 Codex 152차 F)
  const again = diagOf(profile.grammarDiag) > 0;
  profile.grammarDiag = mergeDiag(profile.grammarDiag, today);
  if (!again) addMiss(profile, ans && ans.miss);
  return { ok: true, known: got, again };
}

// ───────────────────── 말 (아이 화면 — 셈 없이) ─────────────────────

/**
 * 판을 끝낸 말 (순수) — grammarRule 결과 → { title, lines } · giftName = 🎁 깜짝 포켓몬 이름(받았을 때만 — 그때만 말한다)
 */
export function grammarFinishText(res, giftName = '') {
  if (!res || !res.ok) {
    if (res && res.why === 'empty') return { title: '저장할 단원이 없어요', lines: ['📝 문법 처음으로 돌아가 다시 시작해 주세요'] };
    return { title: '저장이 안 됐어요', lines: ['[다시 저장하기]를 눌러 주세요 — 푼 것은 그대로예요'] };
  }
  const lines = [];
  if (res.first) lines.push(`💰 +${GRAMMAR_COINS}`);
  else lines.push('오늘의 💰는 이미 받았어요 — 한 것은 기록에 들어갔어요');
  if (res.solved) lines.push(res.starCoins ? `⭐ 처음부터 다 맞혔어요! · 💰 +${res.starCoins} 더` : '⭐ 처음부터 다 맞혔어요!');
  else if (!res.practice) lines.push(`다음에 이 단원을 처음부터 다 맞히면 ⭐와 💰${STAR_COINS}!`);
  if (res.gift) {
    const name = giftName || '포켓몬';
    const c = name.charCodeAt(name.length - 1);
    const eul = c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0 ? '을' : '를';
    lines.push(`🎁 깜짝 선물! 메타몽이 ${name}${eul} 데려왔어요 — 도감에 들어갔어요`);
  }
  const title = res.first ? '📝 오늘의 문법 끝!' : res.practice ? '📝 문법 연습 끝!' : '📝 문법 더 하기 끝!';
  return { title, lines };
}
/** 오늘 보상 말 (순수) — wordsToday(grammarDay) 0·1 · canStar = 오늘 ⭐를 받을 수 있는 단원이 남았나 · 🎁는 말하지 않는다 */
export function grammarTodayLine(today, canStar = true) {
  if (today >= 1) return canStar ? `오늘의 문법 끝 ✅ — 처음부터 다 맞히면 ⭐와 💰${STAR_COINS}!` : '오늘의 문법 끝 ✅';
  return `오늘 처음 끝내면 💰${GRAMMAR_COINS}${canStar ? ` · 처음부터 다 맞히면 ⭐와 💰${STAR_COINS} 더` : ''}`;
}

// ───────────────────── 📊·📤 (아빠 화면) ─────────────────────

/** 📊 한 줄 (순수) — ⭐ 단원 · 진단 ✅ · 다시 볼 단원 · 최근 7일 판을 끝낸 날 */
export function grammarReport(units, states, known, days, now) {
  const st = wordsOf(states);
  const kn = knownOf(known);
  const ls = Array.isArray(units) ? units : [];
  const today = dayNum(now);
  const solved = ls.filter((u) => own(st, u.id) && st[u.id].box >= SOLVED).length;
  const again = ls.filter((u) => own(st, u.id) && st[u.id].box < SOLVED).length;
  const skip = ls.filter((u) => own(kn, u.id) && !own(st, u.id)).length;
  const dd = wordDaysOf(days, today);
  const week = Object.keys(dd).filter((k) => Number(k) > today - 7 && Number(k) <= today).length;
  return `📝 문법: ⭐ 처음부터 다 맞힌 단원 ${solved}/${ls.length} · 🔍 진단으로 건너뛴 단원 ${skip} · 다시 볼 단원 ${again} · 최근 7일 중 판을 끝낸 날 ${week}`;
}

const dateOf = (n) => new Date(n * 86400000).toISOString().slice(0, 10);
/**
 * 📤 grammar/날짜.md (순수) — Claude가 "올라온 거 봐 줘" 때 읽는다 · 프로필 칸 그대로 받는다
 * @param {{units:Array, types:object, profile:object, today:string, now:number}} o
 */
export function grammarMd({ units, types, profile, today, now }) {
  const p = isObj(profile) ? profile : {};
  const ls = Array.isArray(units) ? units : [];
  const st = wordsOf(p.grammar);
  const kn = knownOf(p.grammarKnown);
  const miss = gMissOf(p.grammarMiss);
  const d = dayNum(now);
  const diag = diagOf(p.grammarDiag);
  const lines = [`📝 영어 문법 기록 (${today})`, '', grammarReport(ls, p.grammar, p.grammarKnown, p.grammarDay, now),
    `🔍 어디까지 알까?: ${diag ? `${dateOf(diag)}에 끝냄 — ✅ ${Object.keys(kn).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1))).join(' ') || '없음'}` : '아직 안 함'}`,
    `🎁 깜짝 포켓몬: ${(() => { const g = giftOf(p.grammarGift); return g.n ? `${g.n}번 · 마지막 ${dateOf(g.day)} No.${g.id}` : '아직 없음'; })()}`, '', '## 단원'];
  const MARK = { star: '⭐', again: '🔁 다시 볼 단원', known: '✅ 진단으로 건너뜀', new: '(아직)' };
  for (const u of ls) {
    const mk = unitMark(u.id, p.grammar, p.grammarKnown);
    const s = st[u.id];
    const extra = s ? ` · 틀린 판 ${s.miss} · 처음 ${dateOf(s.d0 || d)} · 마지막 ${dateOf(dayNum(s.at))}${s.box < SOLVED && s.due ? ` · 다시 볼 날 ${dateOf(s.due)}` : ''}` : '';
    lines.push(`- ${u.id} ${u.title}: ${MARK[mk]}${extra}`);
  }
  lines.push('', '## 오개념마다 틀린 수 (많은 차례)');
  const ks = Object.keys(miss).sort((a, b) => miss[b] - miss[a] || (a < b ? -1 : 1));
  for (const k of ks) lines.push(`- ${typeName(types, k)} (${k}): ${miss[k]}`);
  if (!ks.length) lines.push('(아직 없음)');
  lines.push('', '## 최근 7일 판을 끝낸 날');
  const dd = wordDaysOf(p.grammarDay, d);
  for (let k = 6; k >= 0; k--) lines.push(`- ${dateOf(d - k).slice(5)}: ${dd[d - k] ? '✅' : '—'}`);
  return `${lines.join('\n')}\n`;
}
