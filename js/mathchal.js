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
// ★ v247 (2026-10-13, 아버님 "노가다 탈출구 막기 먼저"): 답은 **고른 순간** 적는다(applyChalAnswer) — 회차 끝에만 적으면
//   틀린 답과 정답을 본 뒤 그만두고 다시 열어 외운 답으로 ✨ 회차 보너스를 받을 수 있었다. 그래서
//   · ✨ 보너스는 **처음 보는 문제를 첫 번에 맞힌 것**(clean = 맞힘 전 tries 0)만 센다 — 틀렸던 문제는 문제 보상만
//   · 틀린 문제는 새 문제를 다 낸 뒤에 다시 낸다(nextItems) — 한 번 틀린 게 다음 회차 보너스까지 막지 않게
//   · 문장·수 보기는 풀 때마다 섞는다(shuffleChoices) — "1번부터 차례로"·자리 외우기가 안 통하게
//
// ★ 이 파일은 아무것도 import하지 않는다 (db.js가 트랜잭션 규칙에서 쓴다 — egg.js·evolve.js와 같은 원칙).

/** 한 회차에 내는 문제 수 */
export const ROUND_N = 5;

/** 보상 — 💎 스페셜(⚡8·💰3)보다 높다. 문제집에서 온 진짜 문제(엄마가 고른 틀렸던 문제)라 한 문제가 더 무겁다 */
export const REWARD = {
  item: { xp: 10, coin: 10 },                                 // 처음 맞힌 문제 하나당 — 💰는 난이도별(itemCoin), 이 값은 보통 문제
  round: { xp: 30, coin: 15, stone: 1, throws: 1 },           // 한 회차(5문제)를 **전부 처음 맞혔을 때**
  set: { xp: 300, coin: 400, math: 3, english: 3, ball: 'goldenball' }, // 한 단원 20문제를 다 맞혔을 때 (한 번)
};

/**
 * 💰 처음 맞힌 문제 하나의 코인 — 난이도별 (2026-10-13 아버님: "틀렸던 문제를 다시 낸 거라 10에서 20까지는 줘야", v252).
 * 보통 문제(칸 1개) 10 · 칸이 2개 이상 15 · '도전'·'서술형' 배지 20. 문제에 coin(10~20 정수)을 적으면 그 값
 */
export const ITEM_COIN = { base: 10, multi: 15, hard: 20 };
export const HARD_BADGES = ['도전', '서술형'];
export function itemCoin(item) {
  if (!item) return ITEM_COIN.base;
  const c = item.coin;
  if (Number.isInteger(c) && c >= ITEM_COIN.base && c <= ITEM_COIN.hard) return c;
  if (HARD_BADGES.includes(item.badge)) return ITEM_COIN.hard;
  return (Array.isArray(item.parts) ? item.parts.length : 1) >= 2 ? ITEM_COIN.multi : ITEM_COIN.base;
}
/** 단원에서 번호로 문제 하나 */
export function itemOf(set, no) {
  return ((set && set.items) || []).find((it) => it && Number(it.no) === Number(no)) || null;
}

/** 답 입력 방식 */
export const INPUTS = ['num', 'choice', 'many', 'order', 'plot'];

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
  if (kind === 'plot') {
    // ✍️ 점 여러 개 — 모든 날의 점이 제자리여야 (하나라도 빠지거나 틀리면 틀림, 문제집도 그렇다)
    const want = (Array.isArray(part.answer) ? part.answer : []).map(numOf);
    const got = (Array.isArray(given) ? given : []).map(numOf);
    return want.length > 0 && want.length === got.length && want.every((a, i) => Number.isFinite(a) && Number.isFinite(got[i]) && Math.abs(a - got[i]) < 1e-9);
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

/** 이 문제를 풀어 본 횟수 (답한 순간 늘어난다) */
export function triesOf(m, setId, no) {
  return Number((chalOf(m).tries || {})[qid(setId, no)]) || 0;
}

/** 못 맞힌 채 풀어 본 적이 있나 = 틀렸던 문제 (🔁) */
export function missed(m, setId, no) {
  return !solved(m, setId, no) && triesOf(m, setId, no) > 0;
}

/**
 * 다음 회차에 낼 문제 — 아직 못 맞힌 것을 **번호 순서대로**: 처음 보는 문제가 남아 있으면 **그것만**(n개가 안 돼도),
 * 다 냈으면 틀렸던 문제(🔁)만 (v247).
 * 틀린 문제를 곧바로 다음 회차에 끼우면 그 회차는 ✨ 보너스를 못 받는다 — 한 번 틀린 게 다른 회차를 막지 않게
 * (마지막 짧은 묶음에 섞여도 막았다, Codex 59차 #4), 그리고 틀린 문제는 조금 뒤에 다시 풀어야 외운 답이 아니라 이해로 푼다.
 * 다 맞혔으면 처음부터 다시 (연습은 언제든, 보상만 안 나온다).
 * @returns {Array<object>} 문제 n개까지 (없으면 빈 배열)
 */
export function nextItems(set, m, n = ROUND_N) {
  const items = (set && set.items) || [];
  if (!items.length) return [];
  const todo = items.filter((it) => !solved(m, set.id, it.no));
  const fresh = todo.filter((it) => !missed(m, set.id, it.no));
  const again = todo.filter((it) => missed(m, set.id, it.no));
  const pool = fresh.length ? fresh : again.length ? again : items;
  return pool.slice(0, Math.max(1, Math.floor(n) || ROUND_N));
}

/** 다음에 풀 문제의 번호 (사다리 버튼의 한 줄에 쓴다) */
export function nextNo(set, m) {
  const next = nextItems(set, m, 1)[0];
  return next ? next.no : 0;
}

function chalMaps(m) {
  m.chal = { ...(m.chal || {}) };
  m.chal.ok = { ...(m.chal.ok || {}) };
  m.chal.tries = { ...(m.chal.tries || {}) };
  m.chal.done = { ...(m.chal.done || {}) };
}

/**
 * 🎯 한 문제에 **답한 순간** 적는다 — 트랜잭션 규칙 (v247). 그만두거나 앱을 닫아도 답은 남는다.
 * @returns {{ok:boolean, fresh:boolean, clean:boolean, first:boolean, coin:number, cleared:boolean, firstClear:boolean, solved:number, total:number}}
 *   fresh: 처음 맞힘(문제 보상) · clean: 처음 보는 문제를 첫 번에 맞힘(✨ 회차 보너스에 센다) · firstClear: 🏅 단원 완주(한 번)
 */
export function applyChalAnswer(m, setId, no, ok, set) {
  chalMaps(m);
  const k = qid(setId, no);
  const before = Number(m.chal.tries[k]) || 0;
  m.chal.tries[k] = before + 1;
  let fresh = false;
  if (ok && !(Number(m.chal.ok[k]) || 0)) { m.chal.ok[k] = 1; fresh = true; }   // ★ 처음 맞힌 것만 센다
  const cleared = setCleared(m, set);
  const firstClear = cleared && !setClaimed(m, setId);
  if (firstClear) m.chal.done[setId] = 1;   // 단원 보상은 한 번만 (단조)
  // first: 이 문제에 처음 낸 답 — 🔍 까닭 고르기 첫 선택은 이때만 센다 · coin: 처음 맞혔으면 이 문제의 💰(난이도별) (v252)
  return { ok: !!ok, fresh, clean: fresh && before === 0, first: before === 0, coin: fresh ? itemCoin(itemOf(set, no)) : 0, cleared, firstClear, solved: solvedCount(m, set), total: ((set && set.items) || []).length };
}

/**
 * 🔍 까닭 고르기 첫 선택의 열쇠 — 문제와 칸(part)으로 (v252, 노가다 탈출구 막기 5단계)
 */
export function rfKey(setId, no, part) {
  return `${qid(setId, no)}|${Number(part) || 0}`;
}

/**
 * 🔍 🎯 까닭 고르기 **첫 선택**을 적는다 — 트랜잭션 규칙 (v252, Codex 63차 PART 3).
 * m.chal.rf = { 'setId-no|part': [맞음 0|1, 날, 시각] } — 문제·칸마다 **처음 한 번만**(이미 있으면 그대로).
 * 화면은 그 문제에 처음 낸 답(applyChalAnswer의 first)일 때만 부른다 — 다시 풀 때는 정답과 풀이를 본 뒤라 세지 않는다.
 * 답은 이미 저장된 뒤라 점수·보상·tries·ok는 건드리지 않는다. "맞는 까닭을 골랐다"일 뿐 이해의 증거는 아니다
 * @returns {boolean} 적었나
 */
export function applyReviewFirst(m, setId, no, part, ok, day, t = Date.now()) {
  const k = rfKey(setId, no, part);
  const v = [ok ? 1 : 0, String(day || ''), Number(t)];
  if (!rfOk(v)) return false;   // 날·시각이 틀린 줄은 적지 않는다 (Codex 64차)
  if (m.chal && m.chal.rf && rfOk(m.chal.rf[k])) return false;
  m.chal = { ...(m.chal || {}) };
  m.chal.rf = { ...(m.chal.rf || {}), [k]: v };
  return true;
}

/**
 * 🔍 못 적은 첫 선택을 다시 적는다 — 누른 순간의 날·시각 그대로 (Codex 64차). 처음 한 번만이라 두 번 적어도 같고,
 * 처음 틀린 것을 나중에 맞힌 것으로 바꾸지 않는다
 * @param {Array<{setId:string, no:number, part:number, ok:number, day:string, t:number}>} list
 * @returns {number} 새로 적은 수
 */
export function applyReviewFirsts(m, list) {
  let n = 0;
  for (const p of list || []) if (p && applyReviewFirst(m, p.setId, p.no, p.part, p.ok, p.day, p.t)) n += 1;
  return n;
}

const RF_DAY = /^\d{4}-\d{2}-\d{2}$/;
/** 🔍 첫 선택 한 줄의 꼴 — [0|1, 'YYYY-MM-DD', 시각(0보다 큰 수)] · null·''이 시각 0으로 모두를 이기지 않게 (Codex 64차) */
export const rfOk = (v) => Array.isArray(v) && (v[0] === 0 || v[0] === 1) && typeof v[1] === 'string' && RF_DAY.test(v[1])
  && typeof v[2] === 'number' && Number.isFinite(v[2]) && v[2] > 0;

/**
 * 🔍 첫 선택 합치기 (백업·두 기기) — 열쇠마다 **먼저 고른 것**(시각이 작은 쪽 → 같으면 0 쪽 → 같으면 이른 날). 어느 쪽에서 합쳐도 같다.
 * 꼴이 틀린 줄은 버린다
 */
export function mergeReviewFirst(a, b) {
  const out = {};
  for (const src of [a, b]) {
    for (const [k, v] of Object.entries((src && typeof src === 'object') ? src : {})) {
      if (!rfOk(v)) continue;
      const cur = out[k];
      const t = v[2];
      if (!cur || t < cur[2] || (t === cur[2] && (v[0] < cur[0] || (v[0] === cur[0] && v[1] < cur[1])))) out[k] = [v[0], v[1], t];
    }
  }
  return out;
}

/**
 * 회차를 끝낼 때 — **트랜잭션 규칙** (db.updateMath 안에서 부른다).
 * 답은 고른 순간 이미 적혔다(saved). 저장하지 못한 답(saved가 아님 — 옛 흐름·저장 실패)만 여기서 적고 그 문제 보상을 센다.
 * @param {object} m 수학 진도 (cloneMath로 복사된 것)
 * @param {string} setId
 * @param {Array<{no:number, ok:boolean, saved?:boolean, clean?:boolean}>} results
 * @returns {{fresh:number, coin:number, clean:number, correct:number, solved:number, total:number, cleared:boolean, firstClear:boolean}}
 *   fresh·coin·firstClear: **여기서** 적은 답의 몫만(coin은 그 문제들의 💰 합)(이미 적힌 답의 보상은 그때 줬다) · clean: 회차 전체에서 처음 보는 문제를 첫 번에 맞힌 수
 */
export function applyChalRound(m, setId, results, set) {
  chalMaps(m);
  let fresh = 0;
  let coin = 0;
  let clean = 0;
  let correct = 0;
  let firstClear = false;
  for (const r of results || []) {
    if (!r || !Number.isFinite(Number(r.no))) continue;
    if (r.ok) correct += 1;
    if (r.saved) { if (r.clean) clean += 1; continue; }
    const a = applyChalAnswer(m, setId, r.no, r.ok, set);
    if (a.fresh) { fresh += 1; coin += a.coin; }
    if (a.clean) clean += 1;
    if (a.firstClear) firstClear = true;
  }
  m.chal.rounds = (Number(m.chal.rounds) || 0) + 1;
  return {
    fresh,
    coin,
    clean,
    correct,
    solved: solvedCount(m, set),
    total: ((set && set.items) || []).length,
    cleared: setCleared(m, set),
    firstClear,
  };
}

/**
 * 🏅 단원 완주 보상은 **20문제 단원**이 기준이다 — 문제집에서 고른 몇 문제만 옮긴 작은 단원(2026-10-12 v246, 아버님 "기본안 가자")은
 * 문제 수만큼만: ⚡·💰는 문제 수 ÷ 20만큼 · 🌟 황금 몬스터볼은 10문제부터(아버님: 틀린 문제를 다시 다 풀면 볼) ·
 * 한 회차(5문제)도 안 되는 단원은 회차·완주 보너스 없이 문제 보상만
 */
export const SET_FULL = 20;
export const SET_BALL_MIN = 10;

/** 단원 크기에 맞춘 완주 보상 → { xp, coin, ball } (setN을 모르면 20문제 단원으로) */
export function setGiftOf(setN) {
  const n = Number.isFinite(Number(setN)) && Number(setN) > 0 ? Math.floor(Number(setN)) : SET_FULL;
  if (n < ROUND_N) return { xp: 0, coin: 0, ball: false };
  const k = Math.min(1, n / SET_FULL);
  return { xp: Math.round(REWARD.set.xp * k), coin: Math.round(REWARD.set.coin * k), ball: n >= SET_BALL_MIN };
}

/**
 * 회차 보상 (순수) — 저장 트랜잭션 안에서 쓰는 값.
 * ★ **처음 맞힌 문제(fresh)에만** 준다. 같은 문제를 다시 풀어 보상을 캐지 못한다.
 * ★ ✨ 회차 보너스는 **처음 보는 문제를 첫 번에 맞힌 수(clean)**가 회차 문제 수와 같을 때만 (v247 — 틀렸던 문제는 문제 보상만).
 *   clean을 안 주면 fresh와 같다고 본다(옛 부름).
 * @param {{fresh:number, coin?:number, clean?:number, n:number, firstClear:boolean, setN?:number}} o n: 이번 회차 문제 수 · setN: 단원의 문제 수(작은 단원은 보너스를 줄인다) ·
 *   coin: 처음 맞힌 문제들의 💰 합(itemCoin, applyChalAnswer·applyChalRound가 센다) — 안 주면 보통 문제 값 × fresh(옛 부름)
 */
export function chalReward({ fresh = 0, coin, clean, n = ROUND_N, firstClear = false, setN } = {}) {
  const f = Math.max(0, Math.floor(Number(fresh) || 0));
  const c = clean === undefined ? f : Math.max(0, Math.floor(Number(clean) || 0));
  const qc = coin === undefined ? REWARD.item.coin * f : Math.max(0, Math.floor(Number(coin) || 0));
  const out = { xp: REWARD.item.xp * f, coin: qc, items: {}, stone: 0, throws: 0, round: false, set: false, ball: false };
  const small = Number.isFinite(Number(setN)) && Number(setN) > 0 && Number(setN) < ROUND_N; // 한 회차도 안 되는 단원
  if (!small && c > 0 && c >= Math.max(1, Math.floor(Number(n) || ROUND_N))) {
    out.round = true;
    out.xp += REWARD.round.xp;
    out.coin += REWARD.round.coin;
    out.stone += REWARD.round.stone;
    out.throws += REWARD.round.throws;
  }
  if (firstClear) {
    out.set = true;
    const g = setGiftOf(setN);
    out.xp += g.xp;
    out.coin += g.coin;
    if (g.ball) { out.ball = true; out.items[REWARD.set.ball] = (out.items[REWARD.set.ball] || 0) + 1; }
  }
  return out;
}

/** 보기를 섞을 칸인가 — 고르기·여러 개 고르기에서, 보기 하나라도 다섯 글자 넘는 글(문장·소수)일 때만.
 *  ㉠·가·요일·이름 같은 짧은 이름 보기는 그림·표의 차례와 맞춰 읽어야 해서 그대로 둔다. keepOrder면 그대로. */
export function shuffles(part) {
  if (!part || part.keepOrder || !(part.input === 'choice' || part.input === 'many')) return false;
  const list = Array.isArray(part.choices) ? part.choices : [];
  return list.length >= 2 && list.some((c) => [...String(c)].length > 4);
}

/**
 * 🔀 보기 차례 섞기 (순수, v247) — 같은 씨앗이면 같은 차례(🎒에 다녀와 다시 그려도 그대로), 회차마다 씨앗이 바뀐다.
 * "1번부터 차례로 눌러 보기"·보기 자리 외우기가 안 통하게. 채점은 보기 글로 하니 차례와 상관없다.
 */
export function shuffleChoices(part, seed) {
  const list = Array.isArray(part && part.choices) ? [...part.choices] : [];
  if (!shuffles(part)) return list;
  let s = Math.floor(Number(seed) || 0) >>> 0;
  const rnd = () => { // mulberry32
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

/**
 * ✍️ 대각선 그어 보기 판의 두 꼭짓점 (순수, v246) — n각형의 꼭짓점 a·b(0부터) → 'same' 같은 점 · 'side' 이웃(변) · 'diag' 대각선
 */
export function diagKind(n, a, b) {
  const N = Math.floor(Number(n));
  const i = Math.floor(Number(a));
  const j = Math.floor(Number(b));
  if (i === j) return 'same';
  const d = Math.abs(i - j);
  return d === 1 || d === N - 1 ? 'side' : 'diag';
}

/** n각형의 대각선 수 = n × (n − 3) ÷ 2 (한 꼭짓점에서 n − 3개, 양 끝에서 두 번 세니 ÷ 2) */
export function diagTotal(n) {
  const N = Math.floor(Number(n));
  return N >= 3 ? (N * (N - 3)) / 2 : 0;
}

/**
 * 답한 뒤 보여 줄 보기 풀이 (순수, v246) — 칸(part)의 notes(보기 → 까닭) · numNotes(흔한 틀린 수 → 까닭)에서
 *  · choice: 고른 틀린 보기 하나 · many: 고른 것과 답이 어긋난 보기(잘못 고른 것 + 빠뜨린 것) · allNotes면 보기 모두(㉠~㉣·①~⑤ 설명)
 *  · num: 낸 수가 numNotes에 있으면 그 까닭 (예: 팔각형 대각선 40 — 두 번 셈)
 * @returns {Array<{t:string, ok:boolean, picked:boolean, num?:boolean, note:string}>} ok = 정답에 들어가는 보기 · num = 숫자판에 낸 수
 */
export function notesFor(part, given) {
  if (!part) return [];
  const kind = part.input || 'num';
  if (kind === 'num') {
    const g = numOf(given);
    if (!Number.isFinite(g) || checkPart(part, given)) return [];
    const hit = Object.entries(part.numNotes || {}).find(([k]) => numOf(k) === g);
    return hit ? [{ t: String(given).trim(), ok: false, picked: true, num: true, note: hit[1] }] : [];
  }
  if (kind !== 'choice' && kind !== 'many') return [];
  const notes = part.notes || {};
  const want = new Set([].concat(part.answer == null ? [] : part.answer).map(String));
  const got = new Set([].concat(given == null ? [] : given).map(String));
  const show = (c) => {
    if (part.allNotes) return true;
    if (kind === 'choice') return got.has(c) && !want.has(c);
    return want.has(c) !== got.has(c);
  };
  return (part.choices || []).filter((c) => notes[c] && show(c)).map((c) => ({ t: c, ok: want.has(c), picked: got.has(c), note: notes[c] }));
}

/** 한 단원의 진행 한 줄 — 사다리 버튼에 쓴다 */
export function setNote(m, set) {
  if (!set) return '';
  const done = solvedCount(m, set);
  const total = (set.items || []).length;
  if (done >= total && total > 0) return `🏅 ${set.unit} — ${total}문제를 다 풀었어요!`;
  const no = nextNo(set, m);
  const again = (set.items || []).filter((it) => missed(m, set.id, it.no)).length;
  // 🔁 틀렸던 문제는 새 문제를 다 낸 뒤에 나온다 (v247) — 남아 있다는 걸 사다리에서도 보이게
  return `${done}/${total}문제 · 다음은 ${missed(m, set.id, no) ? '🔁 ' : ''}${no}번${again ? ` · 🔁 틀렸던 문제 ${again}개` : ''}`;
}
