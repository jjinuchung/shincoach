// 🧩 국어 글 퍼즐 (v242, 2026-10-12 아버님 "이대로 진행") — 순수 규칙 (저장은 xp.korPuzzleFinish → houseDo 한 트랜잭션)
//
// 꼴 둘 — Codex 54차 PART 3 조언대로:
//  · 🧩 차례 맞추기(order): 물음마다 "차례"의 뜻 하나 — ask 'event'(일이 일어난 차례 · 읽은 글의 사건을 신코치가 한 줄씩 요약) ·
//    'process'(하는 차례 · 새로 쓴 짧은 설명). 조각은 원고에 **바른 차례로** 적고(화면이 섞는다), need = [앞, 뒤, 실마리, 까닭] —
//    실마리 말은 그 두 조각 가운데 하나에 실제로 있어야 하고, 모든 차례(4! = 24)를 넣어 보아 need에 맞는 차례가 원고 차례 하나뿐이어야 한다
//    (바꿀 수 있는 조각이 있으면 원고 검사가 막는다 — 답이 둘인 퍼즐이 나가지 않게)
//  · ⚖️ 사실·의견 가르기(sort): 한 묶음 = 한 주제의 문장 4~6 · 헷갈림 없는 문장만 — 남의 말 옮기기("~라고", "~다고 한다"),
//    앞날 짐작("~겠다", "~것 같다"), 마음이 섞인 "드디어", 물음·따옴표는 원고 검사가 막는다 ·
//    사실에는 좋다·재미있다·~해야 한다 같은 생각 말이 없고, 의견에는 있어야 한다(OPINION_WORDS)
// 판정: 퍼즐마다 처음 낸 것 · 다 맞힌 퍼즐 = ⭐(SOLVED — 다시 안 나온다, 연습으로만) · 틀리면 다음 날 다시
// 보상(🔤 낱말과 따로 · 그날 처음 끝낸 판만): 💰 PUZZLE_COINS + 🎯 국어 포켓몬 잡기 1번 · PUZZLE_PERFECT_MIN개 이상을 모두 한 번에 → 🟩 1
// 저장: profile.korPuzzle { 퍼즐 id: { box 0|1, due, at, miss, d0 } } — 🔤 낱말 칸과 같은 꼴 · 병합은 따로(mergePuzzles — ⭐는 한쪽이라도) ·
//       profile.korPuzzleDay { 날 번호: 1 | 2 } — 낱말 보상 날과 같은 꼴(wordDaysOf·mergeWordDays)
// 퍼즐 내용을 크게 바꾸면 새 번호로 — ⭐는 번호에 묶여 있어 옛 ⭐가 새 내용에 그대로 남는다(puzzles.json about)
import { dayNum, throwsOf, pendingOf, KOR_STONE } from './korean.js';
import { stateOf, wordsOf, wordDaysOf, wordsToday } from './korwords.js';

export const PUZZLE_COINS = 10;
export const PUZZLE_PERFECT_MIN = 3;
/** 한 판 — 차례 맞추기 둘 + 사실·의견 한 묶음 */
export const ORDER_PER_DAY = 2;
export const SORT_PER_DAY = 1;
export const CHUNKS_MIN = 3;
export const CHUNKS_MAX = 5;
export const SORT_MIN = 4;
export const SORT_MAX = 6;
/** 다 맞힌 퍼즐(⭐)의 칸 */
export const SOLVED = 1;
/** 차례의 뜻 — 물음마다 하나 */
export const ASKS = {
  event: { icon: '🧩', ko: '이야기 흐름', prompt: '일이 일어난 차례대로 놓아 보세요.' },
  process: { icon: '🧩', ko: '하는 차례', prompt: '하는 차례대로 놓아 보세요.' },
};
export const FO = { fact: '사실', opinion: '의견' };
export const KINDS = { order: { icon: '🧩', ko: '차례 맞추기' }, sort: { icon: '⚖️', ko: '사실·의견 가르기' } };
// ★ 사실·의견 라벨은 사람이 정한다 — 아래 두 정규식은 원고를 거르는 망일 뿐 판정기가 아니다(한국어는 활용형이 많아
//   넓히면 사실 문장을 잡고 좁히면 놓친다 — Codex 55차: "최고 기온"을 잡고 "아름다운"·"만들어야 해요"·"~다고 말했다"·"~듯하다"를 놓쳤다)
/** 생각 말 — 의견에는 하나 이상, 사실에는 없어야 한다 */
export const OPINION_WORDS = /좋|재미|멋|맛있|예쁘|훌륭|최고(?:다|의|예)|싫|아름다|야 (?:한다|해|합)|즐겁|즐거|신나|귀엽|편하|낫다|지루/;
/** 가르기 문장에 넣지 않는 꼴 — 옮긴 말 · 앞날 짐작 · 섞인 마음 · 물음 · 따옴표 */
export const SORT_BANNED = /드디어|라고 |다고 한다|다고 했|다고 말|겠다|것 같다|듯하|듯 하|["'「『“‘]|\?/;
const ID_RE = { order: /^O\d{1,3}$/, sort: /^F\d{1,3}$/ };
const LEN_MAX = 90;

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
const nonEmpty = (s) => typeof s === 'string' && s.trim().length > 0;

/** 0..n-1의 모든 차례 (n ≤ CHUNKS_MAX — 120가지까지) */
export function permutations(n) {
  const out = [];
  const walk = (cur, left) => {
    if (!left.length) { out.push(cur); return; }
    left.forEach((x, k) => walk([...cur, x], [...left.slice(0, k), ...left.slice(k + 1)]));
  };
  walk([], Array.from({ length: Math.max(0, n) }, (_, i) => i));
  return out;
}
/** need([앞, 뒤, …])를 모두 지키는 차례들 */
export function validOrders(n, need) {
  const rules = (Array.isArray(need) ? need : []).map((r) => [r[0], r[1]]);
  return permutations(n).filter((p) => rules.every(([a, b]) => p.indexOf(a) < p.indexOf(b)));
}

/** 원고 검사 (tools/check.mjs · 테스트) — 오류 문장 배열 · cards가 있으면 이야기 흐름의 card는 있는 카드 */
export function checkPuzzles(data, cards) {
  const errs = [];
  const list = data && Array.isArray(data.puzzles) ? data.puzzles : null;
  if (!list || !list.length) return ['puzzles가 없어요'];
  const ids = new Set();
  const cardIds = Array.isArray(cards) ? new Set(cards.map((c) => c && c.id)) : null;
  list.forEach((p, i) => {
    const at = (m) => errs.push(`puzzles[${i}] ${p && p.id ? p.id : ''}: ${m}`);
    if (!isObj(p)) { at('퍼즐이 객체가 아니에요'); return; }
    if (!own(KINDS, p.kind)) { at('kind는 order 또는 sort'); return; }
    if (typeof p.id !== 'string' || !ID_RE[p.kind].test(p.id)) at(`id는 ${p.kind === 'order' ? 'O' : 'F'}숫자`);
    else if (ids.has(p.id)) at('id가 겹쳐요');
    else ids.add(p.id);
    if (p.kind === 'order') checkOrder(p, at, cardIds);
    else checkSort(p, at);
  });
  return errs;
}
function checkOrder(p, at, cardIds) {
  if (!own(ASKS, p.ask)) at('ask는 event 또는 process');
  if (!nonEmpty(p.title)) at('title이 비었어요');
  if (p.card !== undefined) {
    if (typeof p.card !== 'string' || !/^K\d{1,3}$/.test(p.card)) at('card는 K숫자');
    else if (cardIds && !cardIds.has(p.card)) at(`없는 카드 ${p.card}`);
  }
  if (p.ask === 'event' && p.card === undefined) at('이야기 흐름은 읽은 글(card)에서 — 그 글에 ★이 있어야 열린다');
  const ch = p.chunks;
  if (!Array.isArray(ch) || ch.length < CHUNKS_MIN || ch.length > CHUNKS_MAX || !ch.every(nonEmpty)) { at(`chunks는 ${CHUNKS_MIN}~${CHUNKS_MAX}개의 글`); return; }
  if (new Set(ch.map((t) => t.trim())).size !== ch.length) at('같은 조각이 있어요');
  ch.forEach((t, k) => { if ([...t].length > LEN_MAX) at(`조각 ${k + 1}은 ${LEN_MAX}자까지`); });
  const need = p.need;
  if (!Array.isArray(need) || !need.length) { at('need(앞뒤 실마리)가 비었어요'); return; }
  let shapeOk = true;
  need.forEach((r, k) => {
    const okShape = Array.isArray(r) && r.length === 4 && Number.isInteger(r[0]) && Number.isInteger(r[1]) && r[0] >= 0 && r[1] >= 0 && r[0] < ch.length && r[1] < ch.length && r[0] !== r[1] && nonEmpty(r[2]) && nonEmpty(r[3]);
    if (!okShape) { at(`need ${k + 1}은 [앞 번호, 뒤 번호, 실마리 말, 까닭]`); shapeOk = false; return; }
    if (!ch[r[0]].includes(r[2]) && !ch[r[1]].includes(r[2])) at(`need ${k + 1}의 실마리 "${r[2]}"가 두 조각에 없어요`);
  });
  if (!shapeOk) return;
  const vs = validOrders(ch.length, need);
  const ident = ch.map((_, i) => i).join(',');
  if (vs.length !== 1) at(`실마리에 맞는 차례가 ${vs.length}가지예요 — 하나뿐이어야 해요`);
  else if (vs[0].join(',') !== ident) at('실마리에 맞는 차례가 원고 차례와 달라요');
}
function checkSort(p, at) {
  if (!nonEmpty(p.topic)) at('topic이 비었어요');
  if (!nonEmpty(p.icon)) at('icon이 비었어요');
  const ss = p.sents;
  if (!Array.isArray(ss) || ss.length < SORT_MIN || ss.length > SORT_MAX) { at(`sents는 ${SORT_MIN}~${SORT_MAX}개`); return; }
  const seen = new Set();
  ss.forEach((s, k) => {
    const sat = (m) => at(`문장 ${k + 1} ${m}`);
    if (!isObj(s) || !nonEmpty(s.t)) { sat('글이 비었어요'); return; }
    if (seen.has(s.t.trim())) sat('앞 문장과 같아요');
    seen.add(s.t.trim());
    if (!own(FO, s.fo)) sat('fo는 fact 또는 opinion');
    if (!nonEmpty(s.why)) sat('why(까닭)가 비었어요');
    if ([...s.t].length > LEN_MAX) sat(`${LEN_MAX}자까지`);
    if (SORT_BANNED.test(s.t)) sat('옮긴 말·앞날 짐작·"드디어"·물음·따옴표는 사실·의견이 섞여요');
    if (s.fo === 'fact' && OPINION_WORDS.test(s.t)) sat('사실 문장에 생각 말(좋다·재미있다·~해야 한다 …)이 있어요');
    if (s.fo === 'opinion' && !OPINION_WORDS.test(s.t)) sat('의견 문장에 생각 말이 없어요 — 사람마다 다른 생각이 드러나게');
  });
  if (!ss.some((s) => s && s.fo === 'fact') || !ss.some((s) => s && s.fo === 'opinion')) at('사실과 의견이 하나 이상씩 있어야 해요');
}

/** 쓸 수 있는 퍼즐 — 깨진 것은 빼고, 이야기 흐름에는 글 제목을 붙인다 */
export function allPuzzles(data, cards) {
  const byId = new Map((Array.isArray(cards) ? cards : []).map((c) => [c.id, c]));
  const out = [];
  const seen = new Set();
  for (const p of (data && Array.isArray(data.puzzles) ? data.puzzles : [])) {
    const errs = [];
    if (!isObj(p) || !own(KINDS, p.kind) || typeof p.id !== 'string' || !ID_RE[p.kind].test(p.id) || seen.has(p.id)) continue;
    if (p.kind === 'order') checkOrder(p, (m) => errs.push(m), cards ? new Set(byId.keys()) : null);
    else checkSort(p, (m) => errs.push(m));
    if (errs.length) continue;
    seen.add(p.id);
    if (p.kind === 'order') {
      const c = p.card ? byId.get(p.card) : null;
      out.push({ id: p.id, kind: 'order', ask: p.ask, title: p.title, card: p.card || '', cardTitle: c ? c.title : '', icon: c ? c.icon : '🧩', chunks: p.chunks.slice(), need: p.need.map((r) => r.slice()) });
    } else {
      out.push({ id: p.id, kind: 'sort', title: p.topic, icon: p.icon, sents: p.sents.map((s) => ({ t: s.t, fo: s.fo, why: s.why })) });
    }
  }
  return out;
}

/** 열린 퍼즐인가 — 이야기 흐름은 그 글에 ★이 있어야(읽은 글의 사건을 맞춘다) */
export function isOpen(p, korDone) {
  if (!p) return false;
  if (p.kind === 'order' && p.card) return own(korDone, `${p.card}:1`);
  return true;
}
/** 다 맞힌 퍼즐인가 */
export function isSolved(st) {
  return !!st && stateOf(st).box >= SOLVED;
}
/**
 * 퍼즐 칸 병합 — 퍼즐마다 한쪽이라도 ⭐면 ⭐(한 번 이루면 끝) · 둘 다 ⭐가 아니면 🔤 낱말처럼 나중에 푼 쪽 ·
 *   마지막으로 푼 때(at)·틀린 수는 큰 쪽 · 처음 날(d0)은 바른 날 중 이른 날 — 어느 차례로 합쳐도 같다
 *   (🔤 낱말 병합(mergeWords)을 그대로 쓰면 ⭐(at 100)와 다른 기기의 더 나중 오답(at 200)을 합칠 때 ⭐가 사라졌다, Codex 55차)
 */
export function mergePuzzles(a, b) {
  const x = wordsOf(a);
  const y = wordsOf(b);
  const out = { ...x };
  const later = (q, p) => q.at - p.at || q.box - p.box || q.due - p.due || q.miss - p.miss;
  for (const k of Object.keys(y)) {
    const p = out[k];
    const q = y[k];
    if (!p) { out[k] = q; continue; }
    const d0s = [p.d0, q.d0].filter((d) => d > 0);
    const keep = { at: Math.max(p.at, q.at), miss: Math.max(p.miss, q.miss), d0: d0s.length ? Math.min(...d0s) : 0 };
    if (p.box >= SOLVED || q.box >= SOLVED) out[k] = { box: SOLVED, due: 0, ...keep };
    else { const win = later(q, p) > 0 ? q : p; out[k] = { box: win.box, due: win.due, ...keep }; }
  }
  return out;
}

/**
 * 🧩 오늘의 퍼즐 — [{ id, kind }] · 다시 볼 것(틀린 날 다음 날부터, 오래된 것부터) → 새 퍼즐(원고 차례) ·
 *   차례 ORDER_PER_DAY + 사실·의견 SORT_PER_DAY, 한쪽이 모자라면 다른 쪽으로 채운다 · practice면 ⭐ 퍼즐을 연습으로(오래 안 본 것부터)
 */
export function planPuzzles(list, states, korDone, now, practice = false) {
  const today = dayNum(now);
  const st = wordsOf(states);
  const open = (list || []).filter((p) => isOpen(p, korDone));
  const want = { order: ORDER_PER_DAY, sort: SORT_PER_DAY };
  const total = ORDER_PER_DAY + SORT_PER_DAY;
  let pool;
  if (practice) {
    pool = open.filter((p) => own(st, p.id) && st[p.id].box >= SOLVED).sort((a, b) => st[a.id].at - st[b.id].at);
  } else {
    const due = open.filter((p) => own(st, p.id) && st[p.id].box < SOLVED && st[p.id].due <= today).sort((a, b) => st[a.id].due - st[b.id].due);
    const fresh = open.filter((p) => !own(st, p.id));
    pool = [...due, ...fresh];
  }
  const take = [];
  for (const kind of ['order', 'sort']) take.push(...pool.filter((p) => p.kind === kind).slice(0, want[kind]));
  for (const p of pool) { if (take.length >= total) break; if (!take.includes(p)) take.push(p); }
  // 판 안 차례: 차례 맞추기 → 사실·의견 → 차례 맞추기 (같은 꼴이 붙지 않게)
  const orders = take.filter((p) => p.kind === 'order');
  const sorts = take.filter((p) => p.kind === 'sort');
  const out = [];
  while (orders.length || sorts.length) { if (orders.length) out.push(orders.shift()); if (sorts.length) out.push(sorts.shift()); }
  return out.slice(0, total).map((p) => ({ id: p.id, kind: p.kind }));
}

/** 화면에 처음 놓을 조각 차례 — 바른 차례(0,1,2…)는 피한다(n ≥ 2) */
export function shuffledOrder(n, rng = Math.random) {
  const ident = Array.from({ length: n }, (_, i) => i);
  if (n < 2) return ident;
  for (let tries = 0; tries < 20; tries++) {
    const a = ident.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.min(i, Math.floor((Number(rng()) || 0) * (i + 1))); [a[i], a[j]] = [a[j], a[i]]; }
    if (a.some((x, i) => x !== i)) return a;
  }
  return ident.slice(1).concat(0); // rng가 늘 같은 값을 줘도 바른 차례가 아니게
}

// 채점은 칸마다 번호로 직접 본다 — every·filter는 빈 칸(희소 배열)을 건너뛰어 [0, , 2, 3]도 다 채운 답이 됐다(Codex 55차)
/** 🧩 낸 차례 채점 — picked = 놓은 조각 번호(원고 번호) 차례 · 빈 칸·겹침·모르는 번호가 있으면 valid false */
export function gradeOrder(p, picked) {
  const n = p && Array.isArray(p.chunks) ? p.chunks.length : 0;
  const arr = Array.isArray(picked) ? picked : [];
  let valid = n > 0 && arr.length === n;
  const seen = new Set();
  for (let i = 0; valid && i < n; i++) {
    const x = arr[i];
    valid = Number.isInteger(x) && x >= 0 && x < n && !seen.has(x);
    seen.add(x);
  }
  if (!valid) return { valid: false, ok: false, right: 0, n };
  let right = 0;
  for (let i = 0; i < n; i++) if (arr[i] === i) right++;
  return { valid: true, ok: right === n, right, n };
}
/** ⚖️ 낸 가르기 채점 — labels = 문장마다 글자 'fact' | 'opinion' · 빈 칸·다른 값이 있으면 valid false */
export function gradeSort(p, labels) {
  const n = p && Array.isArray(p.sents) ? p.sents.length : 0;
  const arr = Array.isArray(labels) ? labels : [];
  let valid = n > 0 && arr.length === n;
  for (let i = 0; valid && i < n; i++) valid = arr[i] === 'fact' || arr[i] === 'opinion';
  if (!valid) return { valid: false, ok: false, right: 0, n };
  let right = 0;
  for (let i = 0; i < n; i++) if (arr[i] === p.sents[i].fo) right++;
  return { valid: true, ok: right === n, right, n };
}

const cnt = (v) => { const n = Math.floor(Number(v)); return Number.isSafeInteger(n) && n > 0 ? n : 0; };

/**
 * 🧩 오늘의 퍼즐 한 판을 끝냈다 — 한 트랜잭션에서: 퍼즐마다 칸 · 그날 처음 끝낸 판이면 💰·🎯(·🟩)
 * @param {object} profile 저장된 프로필 (mutateProfile 안)
 * @param {Array<{id:string, ok:boolean, from?:number}>} answers 퍼즐마다 **처음 낸 것**이 맞았나 (같은 id는 처음 것만) ·
 *   from = 판을 시작할 때 그 퍼즐의 at(새 퍼즐이면 0) — 그 사이 다른 판이 그 퍼즐을 옮겼으면 이 답은 연습(🔤 낱말과 같다, Codex 50차 #4)
 * @param {number} now 트랜잭션 안의 시각
 * @param {string[]} ids 지금 있는 퍼즐 id (모르는 퍼즐은 세지 않는다)
 * @returns {{ok:boolean, why?:string, first?:boolean, coins?:number, stone?:number, throws?:number, n?:number, okN?:number, solved?:string[]}}
 */
export function korPuzzleRule(profile, answers, now, ids) {
  const valid = new Set(Array.isArray(ids) ? ids : []);
  const today = dayNum(now);
  const at = cnt(now);
  const st = wordsOf(profile.korPuzzle);
  const seen = new Set();
  const solved = [];
  let n = 0;
  let okN = 0;
  for (const a of (Array.isArray(answers) ? answers : []).slice(0, 20)) {
    const id = a && typeof a.id === 'string' ? a.id : '';
    if (!id || seen.has(id) || !valid.has(id)) continue;
    seen.add(id);
    n++;
    const cur = st[id] || stateOf(null);
    if (a.ok === true) okN++;
    const stale = a.from !== undefined && Number(a.from) !== cur.at;
    if (stale || cur.box >= SOLVED) continue; // 연습 — ⭐ 퍼즐은 더 안 옮긴다(낡은 판의 오답으로 되돌리지 않음)
    const d0 = st[id] && cur.d0 ? cur.d0 : today;
    const wat = Math.min(Number.MAX_SAFE_INTEGER, Math.max(at, cur.at + 1)); // 고친 때는 늘 앞으로
    if (a.ok === true) {
      st[id] = { box: SOLVED, due: 0, at: wat, miss: cur.miss, d0 };
      solved.push(id);
    } else {
      st[id] = { box: 0, due: today + 1, at: wat, miss: Math.min(Number.MAX_SAFE_INTEGER, cur.miss + 1), d0 };
    }
  }
  if (!n) return { ok: false, why: 'empty' };
  profile.korPuzzle = st;
  const first = !wordsToday(profile.korPuzzleDay, now);
  const days = wordDaysOf(profile.korPuzzleDay, today);
  let coins = 0;
  let stone = 0;
  if (first) {
    coins = PUZZLE_COINS;
    days[today] = 1;
    const tw = throwsOf(profile.korThrow);
    tw.earned = Math.min(Number.MAX_SAFE_INTEGER, tw.earned + 1);
    profile.korThrow = tw;
    if (n >= PUZZLE_PERFECT_MIN && okN === n) {
      stone = 1;
      days[today] = 2;
      profile.items = { ...(profile.items || {}), [KOR_STONE]: Math.min(Number.MAX_SAFE_INTEGER, (Math.floor(Number((profile.items || {})[KOR_STONE])) || 0) + 1) };
    }
    profile.coins = (Number(profile.coins) || 0) + coins;
    profile.coinsEarned = (Number(profile.coinsEarned) || 0) + coins;
  }
  profile.korPuzzleDay = wordDaysOf(days, today);
  return { ok: true, first, coins, stone, throws: pendingOf(profile.korThrow), n, okN, solved };
}

/** 꼴마다 { kind, total, open, solved, tried } (🧩 탭) — tried = 풀어 봤지만 아직 ⭐ 아님 */
export function puzzleStats(list, states, korDone) {
  const st = wordsOf(states);
  return ['order', 'sort'].map((kind) => {
    const all = (list || []).filter((p) => p.kind === kind);
    const open = all.filter((p) => isOpen(p, korDone));
    return {
      kind,
      total: all.length,
      open: open.length,
      solved: open.filter((p) => own(st, p.id) && st[p.id].box >= SOLVED).length,
      tried: open.filter((p) => own(st, p.id) && st[p.id].box < SOLVED).length,
    };
  });
}

/** 판을 끝낸 말 (순수) — korPuzzleRule 결과 → { title, lines } */
export function puzzleFinishText(res, nameOf = (id) => id) {
  if (!res || !res.ok) {
    if (res && res.why === 'empty') return { title: '저장할 퍼즐이 없어요', lines: ['🧩 퍼즐 탭으로 돌아가 다시 시작해 주세요'] };
    return { title: '저장이 안 됐어요', lines: ['[다시 저장하기]를 눌러 주세요 — 푼 것은 그대로예요'] };
  }
  const lines = [`한 번에 맞힌 퍼즐 ${res.okN} / ${res.n}`];
  if (res.first) lines.push(`💰 +${res.coins} · 🎯 국어 포켓몬 잡기 1번${res.stone ? ' · 🟩 국어스톤 +1 (모두 한 번에 맞혔어요!)' : ''}`);
  else lines.push('오늘 퍼즐 보상은 이미 받았어요 — 푼 것은 기록에 들어갔어요');
  if (res.solved && res.solved.length) lines.push(`⭐ 새로 푼 퍼즐: ${res.solved.map(nameOf).join(', ')}`);
  // 보상을 이미 받은 날 — 새로 ⭐를 받았으면 "더 풀기", ⭐ 퍼즐만 다시 했으면 "연습" (v242 헤드리스: 새 퍼즐을 풀었는데 "연습"이라고 했다)
  const title = res.first ? '🧩 오늘의 퍼즐 끝!' : res.solved && res.solved.length ? '🧩 퍼즐 더 풀기 끝!' : '🧩 퍼즐 연습 끝!';
  return { title, lines };
}
/** 오늘 보상 말 (순수) — wordsToday(korPuzzleDay) 값 0·1·2 → 한 줄 */
export function puzzleTodayLine(today) {
  if (today >= 2) return '오늘의 퍼즐 끝 ✅ 🟩까지 받았어요';
  if (today === 1) return '오늘의 퍼즐 끝 ✅ — 더 풀어도 ⭐는 모여요';
  return `오늘 처음 끝내면 💰${PUZZLE_COINS} · 🎯 국어 포켓몬 잡기 1번 · 퍼즐 ${PUZZLE_PERFECT_MIN}개를 모두 한 번에 맞히면 🟩 국어스톤`;
}
