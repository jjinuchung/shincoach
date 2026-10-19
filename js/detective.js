// 🕵️ 나옹의 숙제 봐 주기 (v299, 2026-10-19 아버님 "③ 시안을 만들자" → 시안 "추천대로" → 원고 30문제 "이대로") — 순수 규칙
//
// 로켓단 나옹이 3~4줄로 푼 수학 숙제에서 **처음 틀린 줄**을 찾아 누르고, 그 줄을 바르게 고친 것을 보기 셋에서 고른다.
// 틀린 줄은 늘 그 칸 원고의 「흔한 실수」(coach/math/*.json dad.traps) 하나 — 틀린 사람이 진우가 아니라 틀림을 무섭지 않게 다시 본다.
//  · 원고: coach/math/detective.json { items: [{ id, cell, trap, q, lines, wrong, after?, fixed, okWhy, follow, opts, no, say, ans, chain? }] }
//    lines 나옹의 풀이 · wrong 처음 틀린 줄(0부터) · fixed 고친 풀이(틀린 줄 앞은 그대로) · after 틀린 줄 뒤인데 상관없이 맞는 줄 ·
//    나머지 뒷줄은 틀린 값을 따라간 줄 · opts[0]이 고친 줄(화면은 섞는다) · no[k] 틀린 보기 k의 말 · okWhy[i]·follow[i] 줄을 누르면 나오는 말
//    ans·chain은 시험이 문제의 수로 정답을 따로 풀 때 쓴다(앱은 안 씀)
//  · 한 판 = 셋 — 진우가 🐣 「안다」 이상인 칸의 문제만 · 줄기가 겹치지 않게 · 최근 7일 안에 본 문제는 뒤로 · 🤔 다시 볼 유형이 있는 칸 먼저
//  · 보상(🧩 퍼즐과 같은 꼴): 그날 처음 끝낸 판만 💰 REWARD.coin + 🎯 잡기 REWARD.throws ·
//    그 판의 세 문제를 모두 한 번에(줄도 고친 줄도) 맞히고, 그날 낸 처음 답에 틀린 것이 없으면 🔷 REWARD.stone
//    — 처음 답은 누르는 순간 저장한다(answerRule · answerQueue — 저장에 성공한 답만 빼고, 못 적은 답은 판 끝 트랜잭션에서 먼저 적는다) ·
//      틀린 뒤 그만두고 새 판을 열어도 그날의 틀린 답이 남아 🔷를 다시 뽑을 수 없다 (Codex 105차 #1·#2)
// 저장: 수학 기록 m.detect { day: { 'YYYY-MM-DD': 1 | 2 }, first: { d, r: { 문제 id: { l, f, s } } }, seen: { 문제 id: 'YYYY-MM-DD' },
//   sets, done, lineOk, lineN, fixOk, fixN, miss: { 칸 id: 수 } } — 병합은 mergeDetect(받은 날·센 수는 큰 쪽 · 같은 날 처음 답은 틀린 쪽 · 본 날은 나중)
// ★ 이 파일은 아무것도 import하지 않는다 (db.js가 수학 기록 병합에서 쓴다 — mathpuzzle.js와 같은 원칙)

/** 한 판에 내는 문제 수 */
export const ROUND_N = 3;
/** 이 날 수 안에 본 문제는 뒤로 미룬다 */
export const SEEN_DAYS = 7;
/** 보상 받은 날·본 날은 최근 이만큼만 남긴다 */
export const DAY_KEEP = 60;
/** 그날 처음 끝낸 판의 보상 — 🧩 퍼즐과 같은 꼴 */
export const REWARD = { coin: 10, throws: 1, stone: 1 };
/** 따라간 줄을 눌렀는데 원고에 따로 쓴 말이 없을 때 */
export const FOLLOW_SAY = '이 줄은 바로 위 줄을 따라 바르게 계산했어요. 처음 틀린 줄은 더 위에 있어요.';

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
const cnt = (v) => { const n = Math.floor(Number(v)); return Number.isSafeInteger(n) && n > 0 ? n : 0; };
const str = (v) => typeof v === 'string' && v.trim() !== '';
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const ID_RE = /^D\d+$/;
const dayNum = (d) => Date.parse(`${d}T00:00:00Z`) / 86400000;

/** 칸 id → 줄기 머리 ('dec.add' → 'dec') — 한 판에 같은 줄기가 둘 나오지 않게 */
export const stemOfCell = (cell) => String(cell || '').split('.')[0];

/** 줄마다 'ok'(맞는 줄) · 'wrong'(처음 틀린 줄) · 'follow'(틀린 값을 따라간 줄) */
export function kindsOf(it) {
  const after = Array.isArray(it.after) ? it.after : [];
  return it.lines.map((_, i) => (i < it.wrong || after.includes(i) ? 'ok' : i === it.wrong ? 'wrong' : 'follow'));
}
/** 줄을 눌렀을 때 나오는 말 (처음 틀린 줄은 null) */
export function lineWhy(it, i) {
  const k = kindsOf(it)[i];
  if (k === 'ok') return (it.okWhy && it.okWhy[i]) || '이 줄은 맞게 했어요.';
  if (k === 'follow') return (it.follow && it.follow[i]) || FOLLOW_SAY;
  return null;
}
/** 보기 차례 — 문제 id와 판의 씨앗으로 정한 섞기(🎒를 다녀와도 그대로) · [원고 보기 번호 ×3] */
export function optionOrder(id, seed) {
  let h = (Number(seed) >>> 0) ^ 2166136261;
  for (const ch of String(id)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const p = [0, 1, 2];
  for (let i = 2; i > 0; i--) { h = (Math.imul(h, 1103515245) + 12345) >>> 0; const j = h % (i + 1); [p[i], p[j]] = [p[j], p[i]]; }
  return p;
}

/**
 * 원고 검사 (순수) — 앱은 깨진 문제를 조용히 빼고(validItems), check.mjs·시험은 여기서 잡는다.
 * cells: { 칸 id: { rule, traps } } (coach/math/*.json에서) → 문제 목록
 */
export function checkDetective(data, cells) {
  const out = [];
  const items = data && Array.isArray(data.items) ? data.items : null;
  if (!items) return ['items가 배열이 아님'];
  const ids = new Set();
  items.forEach((it, n) => {
    const id = it && str(it.id) ? it.id : `[${n}]`;
    const bad = (m) => out.push(`${id} ${m}`);
    if (!isObj(it)) { bad('문제가 객체가 아님'); return; }
    if (!ID_RE.test(it.id)) bad('id는 D와 숫자');
    if (ids.has(it.id)) bad('id가 겹침');
    ids.add(it.id);
    const cell = cells && cells[it.cell];
    if (!cell) bad(`칸 ${it.cell}이 없음`);
    else {
      if (!Array.isArray(cell.traps) || !cell.traps[it.trap]) bad(`흔한 실수 ${it.trap}번이 칸 원고에 없음`);
      if (!str(cell.rule)) bad('칸 규칙(rule)이 없음');
    }
    if (!str(it.q) || !str(it.say)) bad('문제·나옹의 실수 글이 비었음');
    const L = it.lines; const F = it.fixed; const w = it.wrong;
    if (!Array.isArray(L) || L.length < 3 || L.length > 4 || !L.every(str)) { bad('나옹의 풀이는 글 3~4줄'); return; }
    if (!Array.isArray(F) || F.length !== L.length || !F.every(str)) { bad('고친 풀이는 나옹의 풀이와 줄 수가 같은 글'); return; }
    if (!Number.isInteger(w) || w < 0 || w >= L.length) { bad('틀린 줄 번호'); return; }
    const after = it.after === undefined ? [] : it.after;
    if (!Array.isArray(after) || !after.every((i) => Number.isInteger(i) && i > w && i < L.length)) { bad('after는 틀린 줄 뒤 줄 번호'); return; }
    const kinds = kindsOf(it);
    kinds.forEach((k, i) => {
      if (k === 'ok') {
        if (F[i] !== L[i]) bad(`${i + 1}째 줄 — 맞는 줄인데 고친 풀이와 다름`);
        if (!(Array.isArray(it.okWhy) && str(it.okWhy[i]))) bad(`${i + 1}째 줄 — 맞는 까닭(okWhy)이 없음`);
      } else if (k === 'follow') {
        if (F[i] === L[i]) bad(`${i + 1}째 줄 — 따라간 줄인데 고친 풀이와 같음(after로)`);
        if (it.follow && own(it.follow, i) && !str(it.follow[i])) bad(`${i + 1}째 줄 — follow 말이 비었음`);
      }
    });
    if (L[w] === F[w]) bad('틀린 줄이 고친 줄과 같음');
    if (isObj(it.follow)) for (const k of Object.keys(it.follow)) if (kinds[Number(k)] !== 'follow') bad(`follow ${k}는 따라간 줄이 아님`);
    const O = it.opts;
    if (!Array.isArray(O) || O.length !== 3 || !O.every(str)) { bad('보기는 글 셋'); return; }
    if (O[0] !== F[w]) bad('첫 보기가 고친 줄이 아님');
    if (new Set(O).size !== 3) bad('보기가 겹침');
    if (O.includes(L[w])) bad('보기에 나옹의 틀린 줄이 있음');
    const N = it.no;
    if (!Array.isArray(N) || N.length !== 3 || N[0] !== '' || !str(N[1]) || !str(N[2])) bad('no는 ["", 틀린 보기 1의 말, 틀린 보기 2의 말]');
  });
  return out;
}
/** 앱이 쓸 문제 — 검사에 걸린 문제는 뺀다 */
export function validItems(data, cells) {
  const items = data && Array.isArray(data.items) ? data.items : [];
  const bad = new Set(checkDetective({ items }, cells).map((m) => m.split(' ')[0]));
  return items.filter((it) => isObj(it) && !bad.has(it.id) && ID_RE.test(it.id));
}

/**
 * 한 판 고르기 (순수) — known: 🐣 이상인 칸 id 모음 · noted: 🤔 다시 볼 유형이 있는 칸 · seen: { 문제 id: 마지막으로 본 날 } ·
 * 차례: 최근 SEEN_DAYS일 안에 안 본 것 → 🤔 칸 → 오래전에 본 것(안 본 것 먼저) → 씨앗으로 섞기 · 줄기가 겹치지 않게 ROUND_N개까지
 */
export function pickRound(items, { known, noted, seen, today, seed = 0 } = {}) {
  const k = known instanceof Set ? known : new Set(known || []);
  const nt = noted instanceof Set ? noted : new Set(noted || []);
  const sn = isObj(seen) ? seen : {};
  const t = dayNum(today);
  const mix = (id) => optionOrder(id, seed).join('') + id;
  const keyed = (items || []).filter((it) => it && k.has(it.cell)).map((it) => {
    const d = typeof sn[it.id] === 'string' && DAY_RE.test(sn[it.id]) ? sn[it.id] : '';
    const recent = d && Number.isFinite(t) && t - dayNum(d) < SEEN_DAYS ? 1 : 0;
    return { it, key: [recent, nt.has(it.cell) ? 0 : 1, d, mix(it.id)] };
  });
  keyed.sort((a, b) => {
    for (let i = 0; i < 4; i++) { if (a.key[i] < b.key[i]) return -1; if (a.key[i] > b.key[i]) return 1; }
    return 0;
  });
  const used = new Set();
  const out = [];
  for (const { it } of keyed) {
    const st = stemOfCell(it.cell);
    if (used.has(st)) continue;
    used.add(st);
    out.push(it);
    if (out.length >= ROUND_N) break;
  }
  return out;
}

// ───────────────────── 저장 · 규칙 (수학 기록 m.detect) ─────────────────────

function daysOf(raw) {
  const out = {};
  if (!isObj(raw)) return out;
  const keys = Object.keys(raw).filter((k) => DAY_RE.test(k)).sort().reverse().slice(0, DAY_KEEP);
  for (const k of keys) { const v = cnt(raw[k]); if (v) out[k] = Math.min(2, v); }
  return out;
}
function seenOf(raw) {
  const out = {};
  if (!isObj(raw)) return out;
  const ent = Object.entries(raw).filter(([id, d]) => ID_RE.test(id) && typeof d === 'string' && DAY_RE.test(d));
  const last = ent.map(([, d]) => d).sort().pop();
  for (const [id, d] of ent) if (!last || dayNum(last) - dayNum(d) < DAY_KEEP) out[id] = d;
  return out;
}
function missOf(raw) {
  const out = {};
  if (!isObj(raw)) return out;
  for (const [c, v] of Object.entries(raw)) { const n = cnt(v); if (n && /^[a-z]+\.[a-z0-9]+$/i.test(c)) out[c] = n; }
  return out;
}
const bit = (v) => (v === 1 ? 1 : 0);
/** 나옹의 숙제 기록 고쳐 읽기 (순수 · 새 객체) — 모르는 값은 처음 값으로 */
export function detectOf(raw) {
  const r = isObj(raw) ? raw : {};
  const f = isObj(r.first) ? r.first : {};
  const first = { d: typeof f.d === 'string' && DAY_RE.test(f.d) ? f.d : '', r: {} };
  if (first.d && isObj(f.r)) {
    for (const [id, a] of Object.entries(f.r)) {
      if (!ID_RE.test(id) || !isObj(a)) continue;
      const x = {};
      if (own(a, 'l')) x.l = bit(a.l);
      if (own(a, 'f')) x.f = bit(a.f);
      if (a.s === 1) x.s = 1; // 그날 바르게 고쳤다(고친 숙제를 한 번만 센다 — Codex 105차 #6)
      first.r[id] = x;
    }
  }
  return { day: daysOf(r.day), first, seen: seenOf(r.seen), sets: cnt(r.sets), done: cnt(r.done), lineOk: cnt(r.lineOk), lineN: cnt(r.lineN), fixOk: cnt(r.fixOk), fixN: cnt(r.fixN), miss: missOf(r.miss) };
}
const inc = (v) => Math.min(Number.MAX_SAFE_INTEGER, v + 1);
const STEP_KEY = { line: 'l', fix: 'f', solve: 's' };
/**
 * 답을 냈다 (수학 기록 m을 고친다 — db.updateMath 안) — step 'line'(처음 누른 줄이 처음 틀린 줄인가) · 'fix'(처음 고른 보기가 고친 줄인가) ·
 * 'solve'(바르게 고쳤다 — 틀린 보기를 먼저 골랐어도, Codex 105차 #6).
 * 그날 그 문제의 그 걸음 **처음 답**만 적고 센다(다시 열어도 그대로 · 같은 답을 두 번 적어도 한 번) · 본 날을 적는다 ·
 * 처음 답이 틀리면 그 칸의 놓친 수를 하루 한 번 · d = 누른 날(저장이 늦어 자정을 넘겨도 누른 날로 — Codex 105차 #7) — 늦게 도착한 전날 답은 오늘 기록을 건드리지 않는다 → { firstOfDay }
 */
export function answerRule(m, { id, cell, step, ok, d }, today) {
  const s = detectOf(m.detect);
  const day = typeof d === 'string' && DAY_RE.test(d) ? d : today;
  if (!ID_RE.test(String(id)) || !own(STEP_KEY, step) || !DAY_RE.test(String(day))) { m.detect = s; return { firstOfDay: false }; }
  if (!s.seen[id] || s.seen[id] < day) s.seen = seenOf({ ...s.seen, [id]: day });
  if (s.first.d && day < s.first.d) { m.detect = s; return { firstOfDay: false }; } // 늦게 도착한 전날 답
  if (s.first.d !== day) s.first = { d: day, r: {} };
  const r = s.first.r[id] || {};
  const key = STEP_KEY[step];
  const firstOfDay = !own(r, key);
  if (firstOfDay) {
    if (step === 'solve') { r.s = 1; s.done = inc(s.done); } else {
      const missedBefore = r.l === 0 || r.f === 0;
      r[key] = ok === true ? 1 : 0;
      if (step === 'line') { s.lineN = inc(s.lineN); if (ok === true) s.lineOk = inc(s.lineOk); } else { s.fixN = inc(s.fixN); if (ok === true) s.fixOk = inc(s.fixOk); }
      if (ok !== true && !missedBefore && /^[a-z]+\.[a-z0-9]+$/i.test(String(cell))) s.miss[cell] = inc(s.miss[cell] || 0);
    }
    s.first.r[id] = r;
  }
  m.detect = s;
  return { firstOfDay };
}
/**
 * 한 판을 끝냈다 (수학 기록 m을 고친다 — 보상과 한 트랜잭션) — 그날 처음 끝낸 판이면 💰·🎯,
 * **이번 판**의 셋을 모두 한 번에 고쳤고(perfect — 화면이 이번 판에서 본 답 · Codex 105차 #1: 그날 처음 답만 보면 앞 판에서 맞히고 그만둔 문제를
 * 이번에 틀려도 🔷가 나갔다) 그 문제들의 그날 처음 답도 맞고, 그날 낸 처음 답에 틀린 것이 없으면 🔷 → { first, coin, throws, stone }
 */
export function finishRule(m, today, ids, perfect = false) {
  const s = detectOf(m.detect);
  s.sets = inc(s.sets);
  const first = !own(s.day, today);
  let stone = 0;
  if (first) {
    const r = s.first.d === today ? s.first.r : {};
    const list = Array.isArray(ids) ? ids : [];
    const roundOk = perfect === true && list.length === ROUND_N && list.every((id) => r[id] && r[id].l === 1 && r[id].f === 1);
    const clean = Object.values(r).every((a) => a.l !== 0 && a.f !== 0);
    stone = roundOk && clean ? REWARD.stone : 0;
    s.day = daysOf({ ...s.day, [today]: stone ? 2 : 1 });
  }
  m.detect = s;
  return { first, coin: first ? REWARD.coin : 0, throws: first ? REWARD.throws : 0, stone };
}
/**
 * 두 기기의 기록 합치기 (순수) — 받은 날은 날마다 큰 쪽 · 센 수·놓친 수는 큰 쪽 · 본 날은 나중 날 ·
 * 처음 답은 같은 날이면 문제·걸음마다 틀린 쪽(🔷를 다른 기기로 다시 뽑지 못하게), 다른 날이면 나중 날
 */
export function mergeDetect(a, b) {
  const x = detectOf(a);
  const y = detectOf(b);
  const day = { ...x.day };
  for (const [k, v] of Object.entries(y.day)) day[k] = Math.max(day[k] || 0, v);
  let first;
  if (x.first.d && x.first.d === y.first.d) {
    const r = {};
    for (const id of new Set([...Object.keys(x.first.r), ...Object.keys(y.first.r)])) {
      const p = x.first.r[id] || {}; const q = y.first.r[id] || {};
      const o = {};
      for (const k of ['l', 'f']) if (own(p, k) || own(q, k)) o[k] = own(p, k) && own(q, k) ? Math.min(p[k], q[k]) : own(p, k) ? p[k] : q[k];
      if (p.s === 1 || q.s === 1) o.s = 1;
      r[id] = o;
    }
    first = { d: x.first.d, r };
  } else {
    const w = x.first.d > y.first.d ? x.first : y.first;
    first = { d: w.d, r: Object.fromEntries(Object.entries(w.r).map(([id, o]) => [id, { ...o }])) };
  }
  const seen = { ...x.seen };
  for (const [id, d] of Object.entries(y.seen)) if (!seen[id] || d > seen[id]) seen[id] = d;
  const miss = { ...x.miss };
  for (const [c, n] of Object.entries(y.miss)) miss[c] = Math.max(miss[c] || 0, n);
  const mx = (k) => Math.max(x[k], y[k]);
  return { day: daysOf(day), first, seen: seenOf(seen), sets: mx('sets'), done: mx('done'), lineOk: mx('lineOk'), lineN: mx('lineN'), fixOk: mx('fixOk'), fixN: mx('fixN'), miss };
}
/**
 * 처음 답 줄 (Codex 105차 #2) — 판과 따로 둔다: **저장에 성공한 답만** 뺀다 · 실패하면 남겨 두고 다음 저장이나 판 끝 트랜잭션(snapshot → 성공하면 drop)에서 다시.
 * 판을 그만두고 새 판을 열어도 남은 답은 그대로라 🔷 판정에 들어간다 · 저장하는 사이 들어온 답은 같은 흐름에서 이어 저장한다.
 * save(batch) → Promise(저장된 값) · onSaved(값) — 같은 답이 두 번 적혀도 answerRule이 한 번으로 센다(판 끝과 겹쳐도 괜찮다)
 */
export function answerQueue(save, onSaved = () => {}) {
  const list = [];
  let running = null;
  let failed = false;
  const drop = (batch) => { for (const a of batch) { const i = list.indexOf(a); if (i >= 0) list.splice(i, 1); } };
  async function run() {
    while (list.length) {
      const batch = list.slice();
      let v;
      try { v = await save(batch); } catch { failed = true; return false; }
      drop(batch);
      try { onSaved(v); } catch { /* 화면 갱신은 없어도 */ }
    }
    failed = false;
    return true;
  }
  const api = {
    push(a) { list.push(a); return api.flush(); },
    flush() { if (!running) running = run().finally(() => { running = null; }); return running; },
    snapshot: () => list.slice(),
    drop,
    get size() { return list.length; },
    get busy() { return !!running; },
    get failed() { return failed; },
  };
  return api;
}

/** 오늘 보상 줄 (순수) — 그날 받은 값 0·1·2 */
export function detectTodayLine(got) {
  if (got >= 2) return '오늘의 숙제 끝 ✅ 🔷까지 받았어요 — 더 봐 줘도 돼요';
  if (got === 1) return '오늘의 숙제 끝 ✅ — 더 봐 줘도 돼요';
  return `처음 끝내면 💰${REWARD.coin} · 🎯 포켓몬 잡기 ${REWARD.throws}번 · 셋 다 한 번에 고치면 🔷 수학스톤`;
}
/** 📤 수학 요약 줄 (순수) — 끝낸 판 · 고친 숙제 · 처음 답 · 최근 7일 한 날 · 처음에 놓친 칸(많은 차례로 다섯) · name: 칸 id → 이름 */
export function detectReport(raw, todayKey, name = (c) => c) {
  const s = detectOf(raw);
  const t = dayNum(todayKey);
  const week = Number.isFinite(t) ? Object.keys(s.day).filter((d) => { const x = dayNum(d); return x <= t && t - x < 7; }).length : 0;
  const miss = Object.entries(s.miss).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 5).map(([c, n]) => `${name(c)}×${n}`);
  return `🕵️ 나옹의 숙제 — 끝낸 판 ${s.sets} · 고친 숙제 ${s.done} · 처음에 틀린 줄을 찾음 ${s.lineOk}/${s.lineN} · 처음에 바르게 고침 ${s.fixOk}/${s.fixN} · 최근 7일 한 날 ${week}${miss.length ? ` · 처음에 놓친 칸: ${miss.join(', ')}` : ''}`;
}
