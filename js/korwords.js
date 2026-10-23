// 🔤 국어 낱말 줄기 (2026-10-11, 아버님 "니 제안대로 하자") — 순수 규칙 (저장은 xp.korWordsFinish → houseDo 한 트랜잭션)
//
// 묶음 다섯: 📘 국어 공부 말(5학년 국어 단원에서 그대로 쓰는 말) · 🗣️ 관용 표현 · 🐢 속담(v241 — 6-1 「관용 표현을 이해하고 생각을 표현해요」 미리) ·
//   🀄 사자성어(v255 — 넉 자 한자어 · han 한자 · lit 글자 뜻은 답을 고른 뒤 풀이에만) · 📖 글에서 만난 낱말
//   (📖은 coach/korean/reading.json의 words — 그 글에 ★이 있으면 열린다. 나머지는 coach/korean/words.json)
// 문제 두 꼴: mean(뜻 고르기) · use(빈칸 채우기 — 관용 표현·속담(sit 묶음)은 "이럴 때 어울리는 말")
//   · 보기는 같은 묶음의 다른 낱말 — 헷갈리는 짝(pair: 직유·은유, 사실·의견 …)은 뜻 고르기에 일부러 같이,
//     빈칸 채우기에는 빼고(둘 다 들어갈 수 있다), 넓은 말·좁은 말(avoid: 비유 ⊃ 직유)은 어느 꼴에도 같이 안 낸다
//   · 📖 글에서 만난 낱말은 words.json apart 무리(뜻이 같은 짝·넓은 말 좁은 말, v326)를 avoid로 — 보기 넷 어느 둘도 같은 무리가 아니다
//   · 빈칸 바로 뒤에 받침 따라 바뀌는 조사(을/를·이/가·은/는·와/과·로/으로·예요 …)를 두지 않는다 — 조사가 답을 알려 주지 않게
// 복습 칸(box): 맞히면 +1 — 1 → 다음 날 · 2 → 3일 뒤 · 3 → 7일 뒤 · 4 → 14일 뒤 · 5 = ⭐ 익힌 낱말(더 안 나온다)
//   틀리면 0 → 다음 날 다시. 판정은 그 판에서 **처음 고른 것**으로(같은 판에서 한 번 더 보는 것은 연습)
// 오늘의 낱말: 복습할 것(오래 기다린 것부터) + 새 낱말 NEW_PER_DAY, 한 번에 SESSION_MAX
// 보상(그날 처음 끝낸 판만): 💰 WORD_COINS + 🎯 국어 포켓몬 잡기 1번 · PERFECT_MIN개 이상을 모두 한 번에 맞히면 🟩 1
import { dayNum, throwsOf, pendingOf, KOR_STONE, KOR_XP } from './korean.js';

export const NEW_PER_DAY = 5;
export const SESSION_MAX = 10;
export const WORD_COINS = 10;
export const PERFECT_MIN = 5;
export const MASTER_BOX = 5;
/** 맞힌 뒤 새 칸 → 며칠 뒤 다시 (0 = 틀림) */
export const DUE_AFTER = { 0: 1, 1: 1, 2: 3, 3: 7, 4: 14 };
/** 묶음 — 차례대로 새 낱말을 섞어 낸다 · sit = 쓰임 문제가 빈칸이 아니라 "이럴 때"(상황 글 ex)인 묶음, ask = 그 물음 */
export const DECKS = {
  concept: { icon: '📘', ko: '국어 공부 말', prefix: 'c' },
  idiom: { icon: '🗣️', ko: '관용 표현', prefix: 'i', sit: true, ask: '이럴 때 어울리는 관용 표현은 무엇인가요?' },
  proverb: { icon: '🐢', ko: '속담', prefix: 's', sit: true, ask: '이럴 때 어울리는 속담은 무엇인가요?' },
  saja: { icon: '🀄', ko: '사자성어', prefix: 'h', sit: true, ask: '이럴 때 어울리는 사자성어는 무엇인가요?' },
  passage: { icon: '📖', ko: '글에서 만난 낱말', prefix: 'p' },
};
export const DECK_ORDER = ['concept', 'idiom', 'proverb', 'saja', 'passage'];
/** 🀄 사자성어 꼴 — 한글 넉 자 · 한자 넉 자 (v255) */
const SAJA_W = /^[가-힣]{4}$/;
const SAJA_HAN = /^[\u4E00-\u9FFF]{4}$/;
const KEY_MAX = 80;
const WORDS_MAX = 2000;
const DAYS_MAX = 400;

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
const cnt = (v, max = Number.MAX_SAFE_INTEGER) => { const n = Math.floor(Number(v)); return Number.isSafeInteger(n) && n > 0 ? Math.min(n, max) : 0; };

/** 빈칸 뒤에 오면 안 되는 말 — 받침에 따라 바뀌는 조사 (보기 낱말의 받침이 답을 알려 준다) */
const BAD_FOLLOW = /^(을|를|이|가|은|는|과|와|으로|로|라|랑|예|야|여|아)/;
/** 빈칸 뒤가 괜찮은가 (순수) */
export function followOk(ex) {
  const i = String(ex || '').indexOf('___');
  if (i < 0) return false;
  return !BAD_FOLLOW.test(String(ex).slice(i + 3));
}

/** words.json에 쓸 수 있는 묶음 이름인가 — 자기 이름의 글자만(📖은 글에서 온다) · 배열("proverb"로 바뀌던 것)·"constructor" 같은 물려받은 이름은 아니다 (Codex 54차) */
function isDeck(deck) {
  return typeof deck === 'string' && own(DECKS, deck) && deck !== 'passage';
}

/** 낱말 id — 📘·🗣️·🐢 "c:비유" · 📖 "p:K1:당번" */
export function wordId(deck, w, cardId) {
  const d = typeof deck === 'string' && own(DECKS, deck) ? DECKS[deck] : null;
  if (!d) return '';
  return deck === 'passage' ? `${d.prefix}:${cardId}:${w}` : `${d.prefix}:${w}`;
}

/** 글 문장들 (시는 줄을 펴서) */
function linesOf(card) {
  if (Array.isArray(card && card.lines)) return card.lines;
  if (Array.isArray(card && card.stanzas)) return card.stanzas.flat();
  return [];
}

/**
 * 📖 글에서 만난 낱말 — 카드의 words → 낱말. **뜻 고르기만**(ex 없음): 보기가 다른 글의 낱말이라 빈칸에 둘 다 들어갈 수 있었다
 *   (펭귄 글 "두 달 넘게 ___" — 품는다·견딘다, "___ 도윤이가" — 짝꿍·당번). 그 낱말이 나온 글 문장은 src로(맞힌 뒤 보여 준다)
 * @returns {Array<{id,deck,w,mean,ex,src,card,title,pair:[],avoid:[]}>}
 */
export function passageWords(cards) {
  const out = [];
  for (const c of cards || []) {
    for (const pair of (c && Array.isArray(c.words) ? c.words : [])) {
      const [w, mean] = Array.isArray(pair) ? pair : [];
      if (typeof w !== 'string' || !w || typeof mean !== 'string' || !mean) continue;
      const src = linesOf(c).find((t) => typeof t === 'string' && t.includes(w)) || '';
      out.push({ id: wordId('passage', w, c.id), deck: 'passage', w, mean, ex: '', src, card: c.id, title: c.title, pair: [], avoid: [] });
    }
  }
  return out;
}

/**
 * 📖 한 문제에 같이 안 낼 무리(words.json apart, v326) → { 낱말: [같은 무리의 다른 낱말] } —
 * 글마다 따로 뜻을 적어 뜻이 같은 짝(횡단보도·건널목)·넓은 말 좁은 말(도구·물뿌리개)이 생겼다: 틀린 보기로 나오면 정답이 둘
 * (🔍 Codex 129차 #2 → 아버님 검수 "이대로"). 한 낱말이 여러 무리에 있으면 모두 합친다 · 깨진 무리는 건너뛴다(검사는 checkWords)
 */
export function apartMap(groups) {
  const out = {};
  for (const g of (Array.isArray(groups) ? groups : [])) {
    if (!Array.isArray(g)) continue;
    const ws = [...new Set(g.filter((v) => typeof v === 'string' && v))];
    for (const w of ws) out[w] = [...new Set([...(own(out, w) ? out[w] : []), ...ws.filter((x) => x !== w)])];
  }
  return out;
}

/** 모든 낱말 — words.json(📘·🗣️) + 글에서 만난 낱말(📖 — 같이 안 낼 무리는 avoid로). 형식이 깨진 것은 뺀다(검사는 checkWords) */
export function allWords(data, cards) {
  const out = [];
  for (const x of (data && Array.isArray(data.words) ? data.words : [])) {
    if (!x || !isDeck(x.deck) || typeof x.w !== 'string' || !x.w || typeof x.mean !== 'string' || !x.mean) continue;
    const w = { id: wordId(x.deck, x.w), deck: x.deck, w: x.w, mean: x.mean, ex: typeof x.ex === 'string' ? x.ex : '', unit: typeof x.unit === 'string' ? x.unit : '', pair: Array.isArray(x.pair) ? x.pair : [], avoid: Array.isArray(x.avoid) ? x.avoid : [] };
    // 🀄 한자·글자 뜻은 꼴이 맞을 때만 (풀이에 그대로 보인다)
    if (x.deck === 'saja' && typeof x.han === 'string' && SAJA_HAN.test(x.han) && typeof x.lit === 'string' && x.lit.trim()) { w.han = x.han; w.lit = x.lit; }
    out.push(w);
  }
  const apart = apartMap(data && data.apart);
  return out.concat(passageWords(cards).map((w) => (own(apart, w.w) ? { ...w, avoid: apart[w.w] } : w)));
}

/** 📖 낱말은 그 글에 ★이 있어야 열린다 */
export function isOpen(word, korDone) {
  if (!word) return false;
  if (word.deck !== 'passage') return true;
  return own(korDone, `${word.card}:1`);
}
/** id만으로 (트랜잭션 안 — 📖이면 카드 id가 id 안에 있다) */
function idOpen(id, korDone) {
  if (!id.startsWith('p:')) return true;
  const card = id.split(':')[1];
  return !!card && own(korDone, `${card}:1`);
}

/** 낱말 하나의 칸 고쳐 읽기 — { box 0~5, due 날 번호, at 마지막으로 푼 때(ms), miss 틀린 수, d0 처음 배운 날 번호 } */
export function stateOf(raw) {
  const x = isObj(raw) ? raw : {};
  return { box: Math.min(MASTER_BOX, cnt(x.box)), due: cnt(x.due), at: cnt(x.at), miss: cnt(x.miss), d0: cnt(x.d0) };
}
/** 낱말 칸 모음 고쳐 읽기 — 키는 짧은 글자만, 많아야 WORDS_MAX */
export function wordsOf(raw) {
  const out = {};
  if (!isObj(raw)) return out;
  for (const k of Object.keys(raw).slice(0, WORDS_MAX)) if (k && k.length <= KEY_MAX) out[k] = stateOf(raw[k]);
  return out;
}
/** 병합 — 낱말마다 나중에 푼 쪽(at)이 이긴다 · 같으면 칸·날·틀린 수가 큰 쪽(어느 차례로 합쳐도 같은 결과) ·
 *  처음 배운 날(d0)은 따로 — 바른 날 중 이른 날 (이긴 쪽 d0을 그대로 쓰면 시계를 고친 뒤 오늘 배운 낱말이 "내일 배운 것"이 되어
 *  그날 새 낱말 5개가 또 나왔다, Codex 50차 #5) */
export function mergeWords(a, b) {
  const x = wordsOf(a);
  const y = wordsOf(b);
  const out = { ...x };
  const later = (q, p) => q.at - p.at || q.box - p.box || q.due - p.due || q.miss - p.miss;
  for (const k of Object.keys(y)) {
    const p = out[k];
    const q = y[k];
    if (!p) { out[k] = q; continue; }
    const win = later(q, p) > 0 ? q : p;
    const d0s = [p.d0, q.d0].filter((d) => d > 0);
    out[k] = { ...win, d0: d0s.length ? Math.min(...d0s) : 0 };
  }
  return out;
}
/** 낱말 보상을 받은 날 { 날 번호: 1(받음) | 2(🟩까지) } — 최근 DAYS_MAX날 · keep 날은 늘 남긴다
 *  (시계를 크게 되돌려 앞날 기록이 꽉 차면 오늘 기록이 잘려 그날 보상을 또 받았다, Codex 50차 #8)
 *  ★ keep을 안 주면 오늘 — 규칙 안에서만 오늘을 남기면 프로필 복사(db.cloneProfile)·병합·그리기가 먼저 잘라 버려
 *    진짜 저장 경로에서는 또 받았다 (Codex 51차) */
export function wordDaysOf(raw, keep = dayNum(Date.now())) {
  const out = {};
  if (!isObj(raw)) return out;
  const keys = Object.keys(raw).filter((k) => cnt(k) > 0).sort((a, b) => Number(b) - Number(a)).slice(0, DAYS_MAX);
  for (const k of keys) { const v = cnt(raw[k], 2); if (v) out[k] = v; }
  if (keep > 0 && cnt(raw[keep], 2)) out[keep] = cnt(raw[keep], 2);
  return out;
}
export function mergeWordDays(a, b) {
  const x = wordDaysOf(a);
  const y = wordDaysOf(b);
  for (const k of Object.keys(y)) x[k] = Math.max(x[k] || 0, y[k]);
  return wordDaysOf(x);
}
/** 오늘 낱말 보상 — 0 아직 · 1 받음 · 2 🟩까지 */
export function wordsToday(days, now) {
  return isObj(days) ? cnt(days[dayNum(now)], 2) : 0; // 자르기 전 기록에서 바로 (앞날 기록이 꽉 차도 오늘을 본다)
}

/**
 * 🔤 오늘의 낱말 — [{ id, kind }]. 복습할 것(기다린 지 오래된 것·낮은 칸부터) 먼저, 모자라면 새 낱말을 묶음마다 번갈아 —
 *   새 낱말은 **하루에** NEW_PER_DAY개까지(오늘 처음 배운 낱말 d0을 센다 — 판을 끝낼 때마다 새 5개가 또 나오던 것, v234 헤드리스).
 *   더 하고 싶으면 extra(🔤 새 낱말 더 배우기)로
 * kind: 새 낱말·틀린 낱말·짝수 칸 = mean(뜻) · 홀수 칸 = use(쓰임) — 쓰임 문장이 없으면 mean
 * @param {number} [extra] 0이 아니면 복습 없이 새 낱말만 extra개 (🔤 새 낱말 더 배우기)
 */
export function planToday(words, states, korDone, now, extra = 0) {
  const today = dayNum(now);
  const st = wordsOf(states);
  const open = (words || []).filter((w) => isOpen(w, korDone));
  const fresh = interleave(open.filter((w) => !own(st, w.id)));
  if (extra > 0) return fresh.slice(0, Math.min(extra, SESSION_MAX)).map((w) => ({ id: w.id, kind: 'mean' }));
  const due = open
    .filter((w) => own(st, w.id) && st[w.id].box < MASTER_BOX && st[w.id].due <= today)
    .sort((a, b) => st[a.id].due - st[b.id].due || st[a.id].box - st[b.id].box);
  const take = due.slice(0, SESSION_MAX).map((w) => ({ id: w.id, kind: st[w.id].box % 2 === 1 && w.ex ? 'use' : 'mean' }));
  const learnedToday = Object.values(st).filter((s) => s.d0 === today).length;
  const room = Math.min(NEW_PER_DAY - learnedToday, SESSION_MAX - take.length);
  for (const w of fresh.slice(0, Math.max(0, room))) take.push({ id: w.id, kind: 'mean' });
  return take;
}
/** 새 낱말을 묶음마다 번갈아 (📘 → 🗣️ → 🐢 → 📖 → 📘 …) — 반복은 가장 긴 묶음 길이까지
 *  (v241 변이: DECK_ORDER에 없는 묶음의 낱말이 있으면 "다 넣을 때까지" 돌던 반복이 끝나지 않아 화면이 멈췄다 — 그런 낱말은 빠진다) */
function interleave(list) {
  const by = DECK_ORDER.map((d) => list.filter((w) => w.deck === d));
  const n = Math.max(0, ...by.map((q) => q.length));
  const out = [];
  for (let i = 0; i < n; i++) for (const q of by) if (q[i]) out.push(q[i]);
  return out;
}

const pairs = (a, b) => (a.pair || []).includes(b.w) || (b.pair || []).includes(a.w);
const avoids = (a, b) => (a.avoid || []).includes(b.w) || (b.avoid || []).includes(a.w);
function shuffle(list, rng) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.min(i, Math.floor((Number(rng()) || 0) * (i + 1))); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/**
 * 문제 하나 — { kind, id, w, prompt, sentence, opts: [{ t, ok, id }] } (보기 넷, 차례는 섞음). 보기가 모자라면 null
 * mean: 뜻 넷 중 고르기 — 헷갈리는 짝을 먼저 보기로 · use: 낱말 넷 중 고르기 — 짝은 빼고(둘 다 들어갈 수 있다)
 * 넷 가운데 어느 둘도 같은 낱말이 아니다 · 📖 낱말은 어느 둘도 같은 무리(apart)가 아니다 (v326)
 */
export function makeQuestion(word, kind, pool, rng = Math.random) {
  if (!word) return null;
  const k = kind === 'use' && word.ex ? 'use' : 'mean';
  const same = (pool || []).filter((x) => x && x.id !== word.id && x.deck === word.deck && x.w !== word.w && !avoids(word, x));
  let picks;
  if (k === 'mean') {
    const pref = shuffle(same.filter((x) => pairs(word, x)), rng);
    const rest = shuffle(same.filter((x) => !pairs(word, x)), rng);
    picks = pickApart(uniqBy([...pref, ...rest], (x) => x.mean).filter((x) => x.mean !== word.mean), 3);
  } else {
    picks = pickApart(uniqBy(shuffle(same.filter((x) => !pairs(word, x)), rng), (x) => x.w), 3);
  }
  if (picks.length < 3) return null;
  const opts = shuffle([{ t: k === 'mean' ? word.mean : word.w, ok: true, id: word.id }, ...picks.map((x) => ({ t: k === 'mean' ? x.mean : x.w, ok: false, id: x.id }))], rng);
  const prompt = k === 'mean'
    ? `'${word.w}'의 뜻으로 알맞은 것은 무엇인가요?`
    : (DECKS[word.deck] && DECKS[word.deck].ask) || '빈칸에 들어갈 알맞은 말은 무엇인가요?';
  return { kind: k, id: word.id, w: word.w, prompt, sentence: k === 'use' ? word.ex : '', opts };
}
function uniqBy(list, key) {
  const seen = new Set();
  return list.filter((x) => { const v = key(x); if (seen.has(v)) return false; seen.add(v); return true; });
}
/**
 * 틀린 보기 n개 — 차례대로, 이미 고른 보기와 같은 낱말(다른 글의 📖 같은 낱말)이면 건너뛰고, 📖 글에서 만난 낱말은 같은 무리(apart)여도 건너뛴다 (v326) —
 * 묻는 낱말과만 거르면 틀린 보기 둘이 같은 뜻(안내판·표지판)으로 나란히 나와 둘 다 지우면 되는 문제가 됐다.
 * 📘·🗣️·🐢·🀄은 그대로: 원고가 헷갈리는 짝을 일부러 함께 낸다(근거 → 주장·의견·사실 — 주장·의견이 서로 avoid여도 둘 다 분명히 틀린 보기)
 */
function pickApart(list, n) {
  const out = [];
  for (const x of list) {
    if (out.length >= n) break;
    if (out.some((y) => y.w === x.w || (x.deck === 'passage' && avoids(x, y)))) continue;
    out.push(x);
  }
  return out;
}

/**
 * 🔤 오늘의 낱말 한 판을 끝냈다 — 한 트랜잭션에서: 낱말마다 칸 옮기기 · 그날 처음 끝낸 판이면 💰·🎯(·🟩)
 * @param {object} profile 저장된 프로필 (mutateProfile 안)
 * @param {Array<{id:string, ok:boolean, from?:number}>} answers 낱말마다 **처음 고른 것**이 맞았나 (같은 id는 처음 것만) ·
 *   from = 판을 시작할 때 그 낱말의 at(새 낱말이면 0) — 그 사이 다른 판(두 창·같은 판 여러 번 저장)이 그 낱말을 이미 옮겼으면
 *   이 답은 **연습**(칸을 안 옮김): 낡은 판으로 하루에 ⭐까지 가거나 익힌 낱말이 낡은 오답으로 되돌아가지 않게 (Codex 50차 #4)
 * @param {number} now 트랜잭션 안의 시각
 * @param {string[]} ids 지금 있는 낱말 id (모르는 낱말은 세지 않는다 · 📖은 그 글에 ★이 있어야)
 * @returns {{ok:boolean, why?:string, first?:boolean, coins?:number, stone?:number, throws?:number, n?:number, okN?:number, mastered?:string[]}}
 */
export function korWordsRule(profile, answers, now, ids) {
  const valid = new Set(Array.isArray(ids) ? ids : []);
  const today = dayNum(now);
  const at = cnt(now);
  const st = wordsOf(profile.korWords);
  const seen = new Set();
  const mastered = [];
  let n = 0;
  let okN = 0;
  let moved = 0; // ⚡ (v327) — 칸을 옮긴 낱말 · 그중 맞힌 것 (연습·낡은 판·[다시 저장]은 안 옮겨 0)
  let okMoved = 0;
  for (const a of (Array.isArray(answers) ? answers : []).slice(0, SESSION_MAX * 4)) {
    const id = a && typeof a.id === 'string' ? a.id : '';
    if (!id || seen.has(id) || !valid.has(id) || !idOpen(id, profile.korDone)) continue;
    seen.add(id);
    n++;
    const cur = st[id] || stateOf(null);
    if (a.ok === true) okN++;
    const stale = a.from !== undefined && Number(a.from) !== cur.at; // 판을 시작한 뒤 다른 판이 이 낱말을 옮겼다
    if (stale || cur.box >= MASTER_BOX) continue; // 연습 — ⭐ 익힌 낱말은 더 안 옮긴다(낡은 판의 오답으로도 되돌리지 않음)
    moved++;
    if (a.ok === true) okMoved++;
    const d0 = st[id] && cur.d0 ? cur.d0 : today; // 처음 배운 날 — 하루 새 낱말 수를 센다
    // 고친 때는 늘 앞으로 — 시계가 멈췄거나 같은 ms에 두 판이 저장돼도 from(시작할 때 본 때)이 어긋나게 (같은 시각이면 낡은 판이 칸을 또 옮겼다, Codex 51차)
    const wat = Math.min(Number.MAX_SAFE_INTEGER, Math.max(at, cur.at + 1));
    if (a.ok === true) {
      const box = Math.min(MASTER_BOX, cur.box + 1);
      if (box === MASTER_BOX && cur.box < MASTER_BOX) mastered.push(id);
      st[id] = { box, due: box >= MASTER_BOX ? 0 : today + DUE_AFTER[box], at: wat, miss: cur.miss, d0 };
    } else {
      st[id] = { box: 0, due: today + DUE_AFTER[0], at: wat, miss: Math.min(Number.MAX_SAFE_INTEGER, cur.miss + 1), d0 };
    }
  }
  if (!n) return { ok: false, why: 'empty' };
  profile.korWords = st;
  const first = !wordsToday(profile.korWordDay, now);
  const days = wordDaysOf(profile.korWordDay, today);
  let coins = 0;
  let stone = 0;
  if (first) {
    coins = WORD_COINS;
    days[today] = 1;
    const tw = throwsOf(profile.korThrow);
    tw.earned = Math.min(Number.MAX_SAFE_INTEGER, tw.earned + 1);
    profile.korThrow = tw;
    if (n >= PERFECT_MIN && okN === n) {
      stone = 1;
      days[today] = 2;
      profile.items = { ...(profile.items || {}), [KOR_STONE]: Math.min(Number.MAX_SAFE_INTEGER, (Math.floor(Number((profile.items || {})[KOR_STONE])) || 0) + 1) };
    }
    profile.coins = (Number(profile.coins) || 0) + coins;
    profile.coinsEarned = (Number(profile.coinsEarned) || 0) + coins;
  }
  profile.korWordDay = wordDaysOf(days, today);
  const xp = moved ? okMoved * KOR_XP.word + KOR_XP.words : 0;
  return { ok: true, first, coins, xp, stone, throws: pendingOf(profile.korThrow), n, okN, mastered };
}

/** 묶음마다 { deck, total, open, learning, mastered } (🔤 탭·📘 단원 지도) */
export function deckStats(words, states, korDone) {
  const st = wordsOf(states);
  return DECK_ORDER.map((deck) => {
    const list = (words || []).filter((w) => w.deck === deck);
    const open = list.filter((w) => isOpen(w, korDone));
    return {
      deck,
      total: list.length,
      open: open.length,
      learning: open.filter((w) => own(st, w.id) && st[w.id].box < MASTER_BOX).length,
      mastered: open.filter((w) => own(st, w.id) && st[w.id].box >= MASTER_BOX).length,
    };
  });
}

/**
 * 낱말 원고 검사 (tools/check.mjs · 테스트) — 오류 문장 배열
 * · 묶음은 concept·idiom·proverb·saja만(📖은 글에서) · 낱말·뜻 비지 않음 · 같은 묶음에 같은 낱말·같은 뜻 없음 · 뜻에 그 낱말을 쓰지 않음
 * · 📘: ex에 빈칸(___) 하나, 빈칸 뒤에 받침 따라 바뀌는 조사 없음, 빈칸 밖에 그 낱말이 또 나오지 않음
 * · 🗣️·🐢·🀄(sit 묶음): ex는 상황 글(빈칸 없음), 그 표현이 글에 그대로 나오지 않음
 * · 🀄: 한글 넉 자 · han 한자 넉 자 · lit(글자 뜻) 60자까지 · 상황 글에 한자도 없음 — han·lit은 🀄에만
 * · pair·avoid는 같은 묶음에 있는 낱말 · 묶음마다 4개 이상(보기 넷)
 * · 📖(cards가 있으면): 글에 나오는 낱말이고, 같은 카드 안에서 겹치지 않음
 */
export function checkWords(data, cards) {
  const errs = [];
  const list = data && Array.isArray(data.words) ? data.words : null;
  if (!list) return ['words가 없어요'];
  const by = {};
  list.forEach((x, i) => {
    const at = (m) => errs.push(`words[${i}] ${x && x.w ? x.w : ''}: ${m}`);
    if (!x || typeof x !== 'object') { at('낱말이 아니에요'); return; }
    if (!isDeck(x.deck)) { at('deck은 concept·idiom·proverb·saja 가운데 하나'); return; }
    if (typeof x.w !== 'string' || !x.w.trim()) { at('낱말이 비었어요'); return; }
    if (typeof x.mean !== 'string' || !x.mean.trim()) at('뜻이 비었어요');
    else if (x.mean.length > 60) at('뜻은 60자까지');
    else if (x.mean.includes(x.w)) at('뜻에 그 낱말을 쓰면 답이 보여요');
    const ex = typeof x.ex === 'string' ? x.ex : '';
    if (x.deck === 'concept') {
      if (ex.split('___').length !== 2) at('ex에 빈칸(___)이 하나 있어야 해요');
      else if (!followOk(ex)) at('빈칸 바로 뒤에 받침 따라 바뀌는 조사가 있으면 답이 보여요');
      else if (ex.replace('___', '').includes(x.w)) at('빈칸 밖에 그 낱말이 또 나와요');
    } else {
      if (!ex.trim()) at(`${DECKS[x.deck].ko}은 어울리는 상황 글(ex)이 있어야 해요`);
      else if (ex.includes('___')) at(`${DECKS[x.deck].ko}의 ex는 상황 글 — 빈칸 없이`);
      else if (ex.includes(x.w)) at('상황 글에 그 표현이 그대로 나와요');
    }
    if (x.deck === 'saja') {
      if (!SAJA_W.test(x.w)) at('사자성어는 한글 넉 자');
      if (typeof x.han !== 'string' || !SAJA_HAN.test(x.han)) at('han은 한자 넉 자');
      else if (ex.includes(x.han)) at('상황 글에 한자가 그대로 나와요');
      if (typeof x.lit !== 'string' || !x.lit.trim()) at('lit(글자 뜻)이 비었어요');
      else if (x.lit.length > 60) at('lit은 60자까지');
    } else if (x.han !== undefined || x.lit !== undefined) at('han·lit은 사자성어에만');
    for (const f of ['pair', 'avoid']) if (x[f] !== undefined && !(Array.isArray(x[f]) && x[f].every((v) => typeof v === 'string' && v))) at(`${f}는 낱말 배열`);
    (by[x.deck] = by[x.deck] || []).push(x);
  });
  for (const deck of Object.keys(by)) {
    const words = by[deck];
    const ws = new Set();
    const means = new Set();
    for (const x of words) {
      if (ws.has(x.w)) errs.push(`${deck}: 같은 낱말 두 번 — ${x.w}`);
      ws.add(x.w);
      if (typeof x.mean === 'string' && means.has(x.mean)) errs.push(`${deck}: 같은 뜻 두 번 — ${x.mean}`);
      means.add(x.mean);
    }
    for (const x of words) for (const f of ['pair', 'avoid']) for (const v of (Array.isArray(x[f]) ? x[f] : [])) if (!ws.has(v)) errs.push(`${deck} ${x.w}: ${f}의 "${v}"가 같은 묶음에 없어요`);
    if (words.length < 4) errs.push(`${deck}: 보기 넷을 만들려면 4개 이상`);
  }
  for (const c of cards || []) {
    const seen = new Set();
    for (const p of (c && Array.isArray(c.words) ? c.words : [])) {
      const w = Array.isArray(p) ? p[0] : '';
      if (seen.has(w)) errs.push(`${c.id} 📖 같은 낱말 두 번 — ${w}`);
      seen.add(w);
    }
  }
  // 📖 한 문제에 같이 안 낼 무리 (v326) — 낱말 둘 이상 · 무리 안에 같은 낱말 없이 · 모두 글에서 만난 낱말(오타면 조용히 안 걸러진다)
  if (data.apart !== undefined) {
    if (!Array.isArray(data.apart)) errs.push('apart는 무리 배열이어야 해요');
    else {
      const pw = new Set(passageWords(cards).map((w) => w.w));
      data.apart.forEach((g, i) => {
        if (!Array.isArray(g) || g.length < 2 || !g.every((v) => typeof v === 'string' && v)) { errs.push(`apart[${i}]: 낱말 둘 이상의 배열`); return; }
        if (new Set(g).size !== g.length) errs.push(`apart[${i}]: 같은 낱말 두 번`);
        for (const v of g) if (!pw.has(v)) errs.push(`apart[${i}]: "${v}"가 📖 글에서 만난 낱말에 없어요`);
      });
    }
  }
  return errs;
}
