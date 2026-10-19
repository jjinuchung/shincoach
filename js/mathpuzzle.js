// 🧩 수학 퍼즐 (v296, 2026-10-19 아버님 "다음 수학과 국어 문제 좀 더 만들자" → 시안 → "모두 니 제안대로 해") — 순수 규칙
//
// 국어 🧩 퍼즐처럼 짧고 부담 없는 4학년 수 퍼즐 — 새 개념이 아니라 아는 덧셈·뺄셈·자릿값으로 "생각해서 맞히기"
//  · ⬛ 마방진(magic) — 가로·세로·대각선 세 수의 합이 같다 (4-1 규칙 찾기 · 덧셈)
//  · 🔺 수 피라미드(pyramid) — 아래 두 칸을 더하면 위 칸 · 위에서 거꾸로는 뺄셈
//  · 🃏 숫자 카드(cards) — 카드를 한 번씩 써서 가장 큰 수·가장 작은 수(0은 맨 앞에 못 옴)·둘째로 큰 수·목표에 가장 가까운 수 (4-1 큰 수)
// 한 판 = 셋(꼴마다 하나) · 꼴마다 1~5단계(처음엔 1단계 · 처음 낸 답이 맞으면 다음 단계 · 틀리면 그 단계의 새 문제) ·
// 문제는 씨앗(seed)으로 만든다 — 같은 씨앗이면 같은 문제(🎒·📊를 다녀와도 그대로) · 빈칸은 늘 채워진 줄·칸으로 풀 수 있게 검사해서 낸다
// 보상(국어 퍼즐과 같은 꼴): 그날 처음 끝낸 판만 💰 REWARD.coin + 🎯 잡기 REWARD.throws · 그날 꼴마다 **처음 낸 답**이 셋 다 맞으면 🔷 REWARD.stone
//  — 처음 낸 답은 내는 순간 적는다(answerRule) · 판을 그만두고 새로 열어도 그날의 처음 답은 그대로라 🔷를 다시 뽑을 수 없다
// 저장: 수학 기록 m.puzzle { lv: { 꼴: 1~5 }, day: { 'YYYY-MM-DD': 1 | 2 }, first: { d, r: { 꼴: 0|1 } }, sets, solved } —
//  병합은 mergePuzzle(단계·보상 받은 날·센 수는 큰 쪽 · 같은 날의 처음 답은 틀린 쪽)
// ★ 이 파일은 아무것도 import하지 않는다 (db.js가 수학 기록 병합에서 쓴다 — mathchal.js와 같은 원칙)

export const KINDS = {
  magic: { icon: '⬛', ko: '마방진', ask: '가로, 세로, 대각선에 있는 세 수의 합이 모두 같아요. 빈칸에 알맞은 수를 넣어 보세요.' },
  pyramid: { icon: '🔺', ko: '수 피라미드', ask: '아래 두 칸의 수를 더하면 바로 위 칸의 수가 돼요. 빈칸을 채워 보세요.' },
  cards: { icon: '🃏', ko: '숫자 카드', ask: '카드를 한 번씩 모두 써서 수를 만들어 보세요.' },
};
/** 한 판에 내는 차례 */
export const KIND_LIST = ['magic', 'pyramid', 'cards'];
export const LV_MAX = 5;
/** 그날 처음 끝낸 판의 보상 — 국어 퍼즐과 같은 꼴 */
export const REWARD = { coin: 10, throws: 1, stone: 1 };
/** 보상 받은 날은 최근 이만큼만 남긴다 */
export const DAY_KEEP = 60;

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
const cnt = (v) => { const n = Math.floor(Number(v)); return Number.isSafeInteger(n) && n > 0 ? n : 0; };

/** 씨앗 → 0 이상 1 미만 (mulberry32) */
export function rngOf(seed) {
  let a = (Math.floor(Number(seed)) || 1) >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const intIn = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
const shuffle = (rng, arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ───────────────────── ⬛ 마방진 ─────────────────────

const LO_SHU = [[2, 7, 6], [9, 5, 1], [4, 3, 8]];
/** 3×3의 여덟 줄 — 가로 셋 · 세로 셋 · 대각선 둘 */
export const MAGIC_LINES = [
  [[0, 0], [0, 1], [0, 2]], [[1, 0], [1, 1], [1, 2]], [[2, 0], [2, 1], [2, 2]],
  [[0, 0], [1, 0], [2, 0]], [[0, 1], [1, 1], [2, 1]], [[0, 2], [1, 2], [2, 2]],
  [[0, 0], [1, 1], [2, 2]], [[0, 2], [1, 1], [2, 0]],
];
/** 단계 — 빈칸 수 · 수 바꾸기(v → v × mul + add) */
export const MAGIC_LV = {
  1: { blanks: 2, mul: 1, add: [0, 0] },
  2: { blanks: 3, mul: 1, add: [0, 0] },
  3: { blanks: 3, mul: 1, add: [5, 15] },
  4: { blanks: 4, mul: 10, add: [0, 0] },
  5: { blanks: 4, mul: 10, add: [1, 9] },
};
function turn(sq) { return sq.map((_, r) => sq.map((row) => row[r]).reverse()); }
function flip(sq) { return sq.map((row) => row.slice().reverse()); }
/**
 * 빈칸을 채운 줄로 차례로 풀 수 있나 (순수) — 빈칸이 없는 줄이 하나는 있어야(합을 알아야) 하고,
 * 빈칸이 하나뿐인 줄을 거듭 찾아 모두 채워지면 true
 */
export function magicSolvable(blank) {
  const open = new Set(blank.map(([r, c]) => `${r},${c}`));
  if (!MAGIC_LINES.some((ln) => ln.every(([r, c]) => !open.has(`${r},${c}`)))) return false;
  let moved = true;
  while (open.size && moved) {
    moved = false;
    for (const ln of MAGIC_LINES) {
      const left = ln.filter(([r, c]) => open.has(`${r},${c}`));
      if (left.length === 1) { open.delete(`${left[0][0]},${left[0][1]}`); moved = true; }
    }
  }
  return open.size === 0;
}
function makeMagic(lv, rng) {
  const L = MAGIC_LV[lv] || MAGIC_LV[1];
  let sq = LO_SHU.map((row) => row.slice());
  for (let k = intIn(rng, 0, 3); k > 0; k--) sq = turn(sq);
  if (rng() < 0.5) sq = flip(sq);
  const add = intIn(rng, L.add[0], L.add[1]);
  const cells = sq.map((row) => row.map((v) => v * L.mul + add));
  const all = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) all.push([r, c]);
  for (let tries = 0; tries < 200; tries++) {
    const blank = shuffle(rng, all).slice(0, L.blanks).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (magicSolvable(blank)) return { kind: 'magic', lv, cells, blank, sum: cells[0].reduce((s, v) => s + v, 0) };
  }
  return null;
}

// ───────────────────── 🔺 수 피라미드 ─────────────────────

/** 단계 — 줄 수 · 맨 아래 수의 범위 · 빈칸 수 · 맨 아래 빈칸 최소(0이면 더하기만) */
export const PYRAMID_LV = {
  1: { rows: 3, lo: 1, hi: 20, blanks: 2, bottom: 0 },
  2: { rows: 3, lo: 10, hi: 50, blanks: 3, bottom: 0 },
  3: { rows: 3, lo: 5, hi: 40, blanks: 3, bottom: 1 },
  4: { rows: 4, lo: 5, hi: 30, blanks: 4, bottom: 1 },
  5: { rows: 4, lo: 10, hi: 60, blanks: 5, bottom: 2 },
};
/** 위 칸 = 아래 두 칸의 합 · 둘을 알면 셋째가 정해진다 — 그걸 거듭해 모두 채워지면 true (순수) */
export function pyramidSolvable(rows, blank) {
  const open = new Set(blank.map(([i, j]) => `${i},${j}`));
  const tri = [];
  for (let i = 0; i < rows - 1; i++) for (let j = 0; j <= i; j++) tri.push([`${i},${j}`, `${i + 1},${j}`, `${i + 1},${j + 1}`]);
  let moved = true;
  while (open.size && moved) {
    moved = false;
    for (const t of tri) {
      const left = t.filter((k) => open.has(k));
      if (left.length === 1) { open.delete(left[0]); moved = true; }
    }
  }
  return open.size === 0;
}
function makePyramid(lv, rng) {
  const L = PYRAMID_LV[lv] || PYRAMID_LV[1];
  const bottom = Array.from({ length: L.rows }, () => intIn(rng, L.lo, L.hi));
  const rows = [bottom];
  while (rows[0].length > 1) { const b = rows[0]; rows.unshift(b.slice(1).map((v, j) => b[j] + v)); }
  const cells = [];
  for (let i = 0; i < L.rows; i++) for (let j = 0; j <= i; j++) cells.push([i, j]);
  const lowest = L.rows - 1;
  for (let tries = 0; tries < 300; tries++) {
    const pool = L.bottom ? cells : cells.filter(([i]) => i < lowest);
    const blank = shuffle(rng, pool).slice(0, L.blanks).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (blank.filter(([i]) => i === lowest).length < L.bottom) continue;
    if (pyramidSolvable(L.rows, blank)) return { kind: 'pyramid', lv, rows, blank };
  }
  return null;
}

// ───────────────────── 🃏 숫자 카드 ─────────────────────

/** 단계 — 카드 수 · 0을 넣나 · 물음 */
export const CARDS_LV = {
  1: { n: 4, zero: false, ask: 'max' },
  2: { n: 5, zero: true, ask: 'max' },
  3: { n: 5, zero: true, ask: 'min' },
  4: { n: 5, zero: 'maybe', ask: 'second' },
  5: { n: 5, zero: 'maybe', ask: 'near' },
};
export const CARD_TARGETS = [30000, 40000, 50000, 60000, 70000];
/** 카드로 만들 수 있는 n자리 수 전부 (맨 앞 0은 뺀다) — 글자 */
export function cardNumbers(digits) {
  const out = [];
  const walk = (cur, left) => {
    if (!left.length) { if (cur[0] !== '0') out.push(cur); return; }
    left.forEach((d, k) => walk(cur + d, [...left.slice(0, k), ...left.slice(k + 1)]));
  };
  walk('', digits.map(String));
  return out;
}
function cardAnswer(digits, ask, target) {
  const nums = cardNumbers(digits).sort((a, b) => Number(b) - Number(a));
  if (!nums.length) return null;
  if (ask === 'max') return nums[0];
  if (ask === 'min') return nums[nums.length - 1];
  if (ask === 'second') return nums.length > 1 ? nums[1] : null;
  const d = nums.map((x) => Math.abs(Number(x) - target));
  const best = Math.min(...d);
  return d.filter((x) => x === best).length === 1 ? nums[d.indexOf(best)] : null; // 가장 가까운 수가 둘이면 쓰지 않는다
}
function makeCards(lv, rng) {
  const L = CARDS_LV[lv] || CARDS_LV[1];
  for (let tries = 0; tries < 200; tries++) {
    const zero = L.zero === true || (L.zero === 'maybe' && rng() < 0.5);
    const pool = shuffle(rng, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const digits = shuffle(rng, zero ? [0, ...pool.slice(0, L.n - 1)] : pool.slice(0, L.n));
    const target = L.ask === 'near' ? CARD_TARGETS[intIn(rng, 0, CARD_TARGETS.length - 1)] : 0;
    const answer = cardAnswer(digits, L.ask, target);
    if (answer) return { kind: 'cards', lv, digits, ask: L.ask, n: L.n, ...(target ? { target } : {}), answer };
  }
  return null;
}
/** 🃏 물음 글 (순수) */
export function cardsAsk(p) {
  const what = p.ask === 'max' ? `가장 큰 ${p.n}자리 수` : p.ask === 'min' ? `가장 작은 ${p.n}자리 수` : p.ask === 'second' ? `둘째로 큰 ${p.n}자리 수` : `${Number(p.target).toLocaleString('ko-KR')}에 가장 가까운 ${p.n}자리 수`;
  return `카드 ${p.n}장을 한 번씩 모두 써서 ${what}를 만들어 보세요.`;
}

// ───────────────────── 만들기 · 답 · 채점 · 까닭 ─────────────────────

/** 수를 읽은 소리의 끝에 받침이 있나 — 십오 → 없음 · 오십칠 → 있음 · 백·천·만으로 끝나면 있음 (조사를 맞게 붙이려고) */
export function numBatchim(n) {
  const v = Math.abs(Math.floor(Number(n)));
  if (v === 0) return true; // 영
  if (v % 10) return [true, true, false, true, false, false, true, true, true, false][v % 10]; // 영 일 이 삼 사 오 육 칠 팔 구
  return true; // 십·백·천·만 — 모두 받침
}
/** ㄹ 받침인가 ("으로" 대신 "로") — 일·칠·팔 */
const numRieul = (n) => { const v = Math.abs(Math.floor(Number(n))); return v % 10 === 1 || v % 10 === 7 || v % 10 === 8; };
/** 수 + 이에요/예요 · 과/와 · 으로/로 (순수) */
export const numEyo = (n) => `${n}${numBatchim(Number(String(n).replace(/,/g, ''))) ? '이에요' : '예요'}`;
const numGwa = (n) => (numBatchim(n) ? '과' : '와');
const numRo = (n) => (numBatchim(n) && !numRieul(n) ? '으로' : '로');

const MAKERS = { magic: makeMagic, pyramid: makePyramid, cards: makeCards };
/** 퍼즐 하나 (순수 · 같은 꼴·단계·씨앗이면 같은 퍼즐) — 모르는 꼴이면 null */
export function makePuzzle(kind, lv, seed) {
  if (!own(MAKERS, kind)) return null;
  const level = Math.min(LV_MAX, Math.max(1, Math.floor(Number(lv)) || 1));
  const p = MAKERS[kind](level, rngOf(seed));
  return p ? { ...p, seed } : null;
}
/** 빈칸 답 차례(줄 차례) — 🃏는 [만들 수] */
export function answersOf(p) {
  if (!p) return [];
  if (p.kind === 'magic') return p.blank.map(([r, c]) => p.cells[r][c]);
  if (p.kind === 'pyramid') return p.blank.map(([i, j]) => p.rows[i][j]);
  return [p.answer];
}
/** 빈칸에 넣을 수의 자릿수 상한 (숫자판) */
export function digitsOf(p) {
  return Math.max(1, ...answersOf(p).map((v) => String(v).length));
}
/**
 * 채점 (순수) — 마방진·피라미드: input = 빈칸마다 수 · 숫자 카드: input = 놓은 카드 번호 차례(한 번씩 모두) ·
 * 빈 칸·모르는 값이면 valid false · marks = 빈칸마다 맞았나
 */
export function gradePuzzle(p, input) {
  const arr = Array.isArray(input) ? input : [];
  if (!p) return { valid: false, ok: false, right: 0, n: 0, marks: [] };
  if (p.kind === 'cards') {
    const n = p.digits.length;
    let valid = arr.length === n;
    const seen = new Set();
    for (let i = 0; valid && i < n; i++) { valid = Number.isInteger(arr[i]) && arr[i] >= 0 && arr[i] < n && !seen.has(arr[i]); seen.add(arr[i]); }
    if (!valid) return { valid: false, ok: false, right: 0, n: 1, marks: [] };
    const made = arr.map((i) => p.digits[i]).join('');
    const ok = made === p.answer;
    return { valid: true, ok, right: ok ? 1 : 0, n: 1, marks: [ok], made };
  }
  const ans = answersOf(p);
  let valid = ans.length > 0 && arr.length === ans.length;
  for (let i = 0; valid && i < ans.length; i++) valid = Number.isSafeInteger(arr[i]) && arr[i] >= 0;
  if (!valid) return { valid: false, ok: false, right: 0, n: ans.length, marks: [] };
  const marks = ans.map((v, i) => arr[i] === v);
  const right = marks.filter(Boolean).length;
  return { valid: true, ok: right === ans.length, right, n: ans.length, marks };
}
/** 확인 뒤 까닭 한 줄 (순수) */
export function puzzleWhy(p) {
  if (!p) return '';
  if (p.kind === 'magic') {
    const open = new Set(p.blank.map(([r, c]) => `${r},${c}`));
    const full = MAGIC_LINES.find((ln) => ln.every(([r, c]) => !open.has(`${r},${c}`)));
    const vs = full ? full.map(([r, c]) => p.cells[r][c]) : [];
    return `한 줄의 합은 ${numEyo(p.sum)}${vs.length ? ` — ${vs.join(' + ')} = ${p.sum}` : ''}. 빈칸이 하나뿐인 줄부터 ${p.sum}에서 나머지를 빼요.`;
  }
  if (p.kind === 'pyramid') return '아래 두 칸을 더하면 위 칸이에요. 아래 칸이 비었으면 위 칸에서 옆 칸을 빼요.';
  if (p.ask === 'max') return `${p.answer} — 큰 숫자부터 차례로 놓아요.`;
  if (p.ask === 'min') return p.digits.includes(0) ? `${p.answer} — 0은 맨 앞에 올 수 없어요. 0이 아닌 가장 작은 숫자를 맨 앞에 두고, 나머지는 작은 숫자부터 놓아요.` : `${p.answer} — 작은 숫자부터 차례로 놓아요.`;
  if (p.ask === 'second') return `${p.answer} — 가장 큰 수를 먼저 만들고, 끝의 두 숫자(십의 자리와 일의 자리)를 바꿔요.`;
  const diff = Math.abs(Number(p.answer) - p.target);
  return `${p.answer} — ${Number(p.target).toLocaleString('ko-KR')}${numGwa(p.target)}의 차이가 ${diff.toLocaleString('ko-KR')}${numRo(diff)} 가장 작아요.`;
}

// ───────────────────── 저장 · 규칙 (수학 기록 m.puzzle) ─────────────────────

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
function daysOf(raw) {
  const out = {};
  if (!isObj(raw)) return out;
  const keys = Object.keys(raw).filter((k) => DAY_RE.test(k)).sort().reverse().slice(0, DAY_KEEP);
  for (const k of keys) { const v = cnt(raw[k]); if (v) out[k] = Math.min(2, v); }
  return out;
}
/** 퍼즐 기록 고쳐 읽기 (순수 · 새 객체) — 모르는 값은 처음 값으로 */
export function puzzleOf(raw) {
  const r = isObj(raw) ? raw : {};
  const lv = {};
  for (const k of KIND_LIST) lv[k] = Math.min(LV_MAX, Math.max(1, cnt(isObj(r.lv) ? r.lv[k] : 0) || 1));
  const f = isObj(r.first) ? r.first : {};
  const first = { d: typeof f.d === 'string' && DAY_RE.test(f.d) ? f.d : '', r: {} };
  if (first.d && isObj(f.r)) for (const k of KIND_LIST) if (own(f.r, k)) first.r[k] = f.r[k] === 1 ? 1 : 0;
  return { lv, day: daysOf(r.day), first, sets: cnt(r.sets), solved: cnt(r.solved) };
}
/**
 * 퍼즐 하나의 답을 냈다 (수학 기록 m을 고친다 — db.updateMath 안) — 그날 그 꼴의 **처음 답**이면 적고(그만두고 다시 열어도 그대로),
 * 맞았으면 단계를 하나 올린다. from = 판을 시작할 때의 단계(그 사이 다른 창이 올렸으면 두 번 올리지 않는다) → { lv, up, firstOfDay }
 */
export function answerRule(m, kind, ok, from, today) {
  const s = puzzleOf(m.puzzle);
  if (!own(KINDS, kind)) { m.puzzle = s; return { lv: 0, up: false, firstOfDay: false }; }
  if (s.first.d !== today) s.first = { d: today, r: {} };
  const firstOfDay = !own(s.first.r, kind);
  if (firstOfDay) s.first.r[kind] = ok === true ? 1 : 0;
  let up = false;
  if (ok === true) {
    s.solved = Math.min(Number.MAX_SAFE_INTEGER, s.solved + 1);
    if (s.lv[kind] === Number(from) && s.lv[kind] < LV_MAX) { s.lv[kind] += 1; up = true; }
  }
  m.puzzle = s;
  return { lv: s.lv[kind], up, firstOfDay };
}
/**
 * 한 판을 끝냈다 (수학 기록 m을 고친다 — 보상과 한 트랜잭션) — 그날 처음 끝낸 판이면 💰·🎯, 그날 꼴마다 처음 낸 답이 셋 다 맞았으면 🔷 →
 * { first, coin, throws, stone } (🎯는 부르는 쪽이 addPending으로 · 💰·🔷는 프로필로)
 */
export function finishRule(m, today) {
  const s = puzzleOf(m.puzzle);
  s.sets = Math.min(Number.MAX_SAFE_INTEGER, s.sets + 1);
  const first = !own(s.day, today);
  let stone = 0;
  if (first) {
    const r = s.first.d === today ? s.first.r : {};
    stone = KIND_LIST.every((k) => r[k] === 1) ? REWARD.stone : 0;
    s.day = daysOf({ ...s.day, [today]: stone ? 2 : 1 });
  }
  m.puzzle = s;
  return { first, coin: first ? REWARD.coin : 0, throws: first ? REWARD.throws : 0, stone };
}
/**
 * 두 기기의 퍼즐 기록 합치기 (순수) — 단계·센 수는 큰 쪽 · 보상 받은 날은 날마다 큰 쪽(옛 백업이 받은 보상을 되돌리지 못하게) ·
 * 처음 답은 같은 날이면 꼴마다 틀린 쪽(🔷를 다른 기기로 다시 뽑지 못하게), 다른 날이면 나중 날
 */
export function mergePuzzle(a, b) {
  const x = puzzleOf(a);
  const y = puzzleOf(b);
  const lv = {};
  for (const k of KIND_LIST) lv[k] = Math.max(x.lv[k], y.lv[k]);
  const day = { ...x.day };
  for (const [k, v] of Object.entries(y.day)) day[k] = Math.max(day[k] || 0, v);
  let first;
  if (x.first.d && x.first.d === y.first.d) {
    const r = {};
    for (const k of KIND_LIST) if (own(x.first.r, k) || own(y.first.r, k)) r[k] = own(x.first.r, k) && own(y.first.r, k) ? Math.min(x.first.r[k], y.first.r[k]) : own(x.first.r, k) ? x.first.r[k] : y.first.r[k];
    first = { d: x.first.d, r };
  } else first = (x.first.d > y.first.d ? x : y).first;
  return { lv, day: daysOf(day), first: { d: first.d, r: { ...first.r } }, sets: Math.max(x.sets, y.sets), solved: Math.max(x.solved, y.solved) };
}
/** 오늘 보상 줄 (순수) — 그날 받은 값 0·1·2 */
export function puzzleTodayLine(got) {
  if (got >= 2) return '오늘의 퍼즐 끝 ✅ 🔷까지 받았어요 — 더 풀어도 단계는 올라가요';
  if (got === 1) return '오늘의 퍼즐 끝 ✅ — 더 풀어도 단계는 올라가요';
  return `처음 끝내면 💰${REWARD.coin} · 🎯 포켓몬 잡기 ${REWARD.throws}번 · 셋 다 한 번에 맞히면 🔷 수학스톤`;
}
/** 📤 수학 요약 줄 (순수) — 단계 · 끝낸 판 · 맞힌 퍼즐 · 최근 7일 퍼즐 한 날 */
export function puzzleReport(raw, todayKey) {
  const s = puzzleOf(raw);
  const lvs = KIND_LIST.map((k) => `${KINDS[k].icon} ${KINDS[k].ko} ${s.lv[k]}단계`).join(' · ');
  const t = Date.parse(`${todayKey}T00:00:00Z`);
  const week = Number.isFinite(t) ? Object.keys(s.day).filter((d) => { const x = Date.parse(`${d}T00:00:00Z`); return x <= t && t - x < 7 * 86400000; }).length : 0;
  return `🧩 수학 퍼즐 — ${lvs} · 끝낸 판 ${s.sets} · 맞힌 퍼즐 ${s.solved} · 최근 7일 퍼즐 한 날 ${week}`;
}
