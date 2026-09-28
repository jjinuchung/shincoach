// 🎯 도전 문제 — 문제집에 있는 문제를 **그대로** 푸는 곳 (2026-09-28, 엄마 요청)
//
// 왜 따로인가: 💎 스페셜은 문제집 **유형**을 흉내 낸 생성기라 숫자가 매번 다르다. 도전 문제는
// 아이가 안 푼 **바로 그 문제**여야 한다. 그래서 문제는 `coach/math/challenge.json`에 글로 적어 두고,
// 줄기·개념 진도와 **상관없이** 언제든 열린다.
//
// 아버님 결정 (2026-09-28):
//   ① 답은 **문제집처럼 직접** — 숫자판·고르기·여러 개 고르기·순서 놓기. 찍어서 맞힐 수 없다
//   ② 보상은 **한 문제씩 + 한 회차 보너스 + 단원 완주 큰 보상**
//   ③ ⏳ 하루 시간 제한에 **안 들어간다** — 문제집 숙제는 제한 밖(엄마가 시킨 몫)
//
// ★ 보상은 **처음 맞힌 문제에만** 준다(`fresh`). 다시 풀어도 되지만 보상은 안 나온다 —
//   같은 문제를 반복해 보상을 캐는 길을 아예 막는다(💎 스페셜의 🎟️ 농사 구멍과 같은 자리).
//
// 저장은 `math.chal` 하나: { ok: {문제키: 1}, tries: {문제키: n}, rounds: n, done: {단원: 1} }
// 전부 **단조 증가**라 백업 병합이 키마다 max — 옛 백업을 되돌려도 푼 문제가 사라지지 않는다.
//
// ★ 이 파일은 아무것도 import하지 않는다 (db.js가 트랜잭션 규칙에서 쓴다 — egg.js·evolve.js와 같은 원칙).

/** 한 회차에 내는 문제 수 */
export const ROUND_N = 5;

/** 보상 — 💎 스페셜(⚡8·💰3)보다 조금 높다. 문제집에서 온 진짜 문제라 한 문제가 더 무겁다 */
export const REWARD = {
  item: { xp: 10, coin: 4 },                                  // 처음 맞힌 문제 하나당
  round: { xp: 30, coin: 15, stone: 1, throws: 1 },           // 한 회차(5문제)를 **전부 처음 맞혔을 때**
  set: { xp: 300, coin: 400, math: 3, english: 3, ball: 'goldenball' }, // 한 단원 20문제를 다 맞혔을 때 (한 번)
};

/** 답 입력 방식 */
export const INPUTS = ['num', 'choice', 'many', 'order'];

/** 문제 키 — 단원과 번호로 (백업 병합이 키마다 max라 이름이 바뀌면 진도가 끊긴다) */
export function qid(setId, no) {
  return `${setId}-${Number(no)}`;
}

/** 문제집 자료에서 단원 하나 */
export function setOf(data, setId) {
  return ((data && data.sets) || []).find((s) => s && s.id === setId) || null;
}

/** 단원 목록 (화면에 버튼을 만들 때) */
export function setsOf(data) {
  return ((data && data.sets) || []).filter((s) => s && s.id && Array.isArray(s.items));
}

const numOf = (v) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : NaN;
  const t = String(v == null ? '' : v).trim();   // ★ 양끝만 — 가운데 공백('0.0 6')까지 지우면 틀린 답이 맞는 답이 된다
  if (!t || !/^-?\d*\.?\d*$/.test(t) || t === '.' || t === '-') return NaN;
  return Number(t);
};

/**
 * 한 칸의 답이 맞나.
 * ★ 숫자는 **값으로** 본다 — 0.06과 0.060과 .06은 같은 수다. 글자로 비교하면 아이가 억울하다.
 * @param {{input:string, answer:*}} part
 * @param {*} given 아이가 낸 답 (num: 문자열 · choice: 문자열 · many/order: 배열)
 */
export function checkPart(part, given) {
  if (!part) return false;
  const kind = part.input || 'num';
  if (kind === 'num') {
    const a = numOf(part.answer);
    const b = numOf(given);
    return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 1e-9;
  }
  if (kind === 'choice') {
    return String(given == null ? '' : given) === String(part.answer);
  }
  if (kind === 'many') {
    const want = (Array.isArray(part.answer) ? part.answer : []).map(String);
    const got = (Array.isArray(given) ? given : []).map(String);
    if (want.length !== got.length) return false;
    const a = [...want].sort();
    const b = [...new Set(got)].sort();
    return a.length === b.length && a.every((x, i) => x === b[i]);
  }
  if (kind === 'order') {
    const want = (Array.isArray(part.answer) ? part.answer : []).map(String);
    const got = (Array.isArray(given) ? given : []).map(String);
    return want.length === got.length && want.every((x, i) => x === got[i]);
  }
  return false;
}

/**
 * 한 문제(칸이 여럿일 수 있다)가 맞나 → { ok, parts:[bool] }
 * 칸이 하나라도 틀리면 그 문제는 틀린 것이다 (문제집도 그렇다).
 */
export function checkItem(item, given) {
  const parts = (item && item.parts) || [];
  const list = Array.isArray(given) ? given : [given];
  const flags = parts.map((p, i) => checkPart(p, list[i]));
  return { ok: flags.length > 0 && flags.every(Boolean), parts: flags };
}

const chalOf = (m) => (m && m.chal) || {};
const okMap = (m) => chalOf(m).ok || {};

/** 이 문제를 맞힌 적이 있나 */
export function solved(m, setId, no) {
  return (Number(okMap(m)[qid(setId, no)]) || 0) > 0;
}

/** 이 단원에서 맞힌 문제 수 */
export function solvedCount(m, set) {
  if (!set) return 0;
  return (set.items || []).filter((it) => solved(m, set.id, it.no)).length;
}

/** 이 단원을 다 맞혔나 */
export function setCleared(m, set) {
  return !!set && (set.items || []).length > 0 && solvedCount(m, set) >= (set.items || []).length;
}

/** 🏅 단원 완주 보상을 이미 받았나 */
export function setClaimed(m, setId) {
  return (Number((chalOf(m).done || {})[setId]) || 0) > 0;
}

/**
 * 다음 회차에 낼 문제 — **번호 순서대로**, 아직 못 맞힌 것부터.
 * 다 맞혔으면 처음부터 다시 (연습은 언제든, 보상만 안 나온다).
 * @returns {Array<object>} 문제 n개 (없으면 빈 배열)
 */
export function nextItems(set, m, n = ROUND_N) {
  const items = (set && set.items) || [];
  if (!items.length) return [];
  const todo = items.filter((it) => !solved(m, set.id, it.no));
  const pool = todo.length ? todo : items;
  return pool.slice(0, Math.max(1, Math.floor(n) || ROUND_N));
}

/** 다음에 풀 문제의 번호 (사다리 버튼의 한 줄에 쓴다) */
export function nextNo(set, m) {
  const next = nextItems(set, m, 1)[0];
  return next ? next.no : 0;
}

/**
 * 회차 결과를 진도에 적는다 — **트랜잭션 규칙** (db.updateMath 안에서 부른다).
 * @param {object} m 수학 진도 (cloneMath로 복사된 것)
 * @param {string} setId
 * @param {Array<{no:number, ok:boolean}>} results
 * @returns {{fresh:number, correct:number, solved:number, total:number, cleared:boolean, firstClear:boolean}}
 */
export function applyChalRound(m, setId, results, set) {
  m.chal = { ...(m.chal || {}) };
  m.chal.ok = { ...(m.chal.ok || {}) };
  m.chal.tries = { ...(m.chal.tries || {}) };
  m.chal.done = { ...(m.chal.done || {}) };

  let fresh = 0;
  let correct = 0;
  for (const r of results || []) {
    if (!r || !Number.isFinite(Number(r.no))) continue;
    const k = qid(setId, r.no);
    m.chal.tries[k] = (Number(m.chal.tries[k]) || 0) + 1;
    if (!r.ok) continue;
    correct += 1;
    if (!(Number(m.chal.ok[k]) || 0)) { m.chal.ok[k] = 1; fresh += 1; }   // ★ 처음 맞힌 것만 센다
  }
  m.chal.rounds = (Number(m.chal.rounds) || 0) + 1;

  const cleared = setCleared(m, set);
  const firstClear = cleared && !setClaimed(m, setId);
  if (firstClear) m.chal.done[setId] = 1;   // 단원 보상은 한 번만 (단조)

  return {
    fresh,
    correct,
    solved: solvedCount(m, set),
    total: ((set && set.items) || []).length,
    cleared,
    firstClear,
  };
}

/**
 * 회차 보상 (순수) — 저장 트랜잭션 안에서 쓰는 값.
 * ★ **처음 맞힌 문제(fresh)에만** 준다. 같은 문제를 다시 풀어 보상을 캐지 못한다.
 * @param {{fresh:number, n:number, firstClear:boolean}} o n: 이번 회차 문제 수
 */
export function chalReward({ fresh = 0, n = ROUND_N, firstClear = false } = {}) {
  const f = Math.max(0, Math.floor(Number(fresh) || 0));
  const out = { xp: REWARD.item.xp * f, coin: REWARD.item.coin * f, items: {}, stone: 0, throws: 0, round: false, set: false };
  if (f > 0 && f >= Math.max(1, Math.floor(Number(n) || ROUND_N))) {
    out.round = true;
    out.xp += REWARD.round.xp;
    out.coin += REWARD.round.coin;
    out.stone += REWARD.round.stone;
    out.throws += REWARD.round.throws;
  }
  if (firstClear) {
    out.set = true;
    out.xp += REWARD.set.xp;
    out.coin += REWARD.set.coin;
    out.items[REWARD.set.ball] = (out.items[REWARD.set.ball] || 0) + 1;
  }
  return out;
}

/** 한 단원의 진행 한 줄 — 사다리 버튼에 쓴다 */
export function setNote(m, set) {
  if (!set) return '';
  const done = solvedCount(m, set);
  const total = (set.items || []).length;
  if (done >= total && total > 0) return `🏅 ${set.unit} — ${total}문제를 다 풀었어요!`;
  const no = nextNo(set, m);
  return `${done}/${total}문제 · 다음은 ${no}번`;
}
