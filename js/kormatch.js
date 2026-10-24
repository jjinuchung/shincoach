// 🔤 낱말 이어 주기 — 국어 (v329, 2026-10-24 아버님 "이대로") — 순수 규칙 (화면은 영어와 같은 match.js · 열기·주기는 kordayview.js)
//
// 낱말: 읽은 글(★)에서 만난 📖 낱말(korwords.passageWords — 영어가 영상에서 만난 단어를 쓰는 것과 같다)
// 언제: 아직 이어 보지 않은 낱말이 need개 모이면 국어 글 끝 화면에 단추 하나(⚔️ 배틀처럼 — 공부 흐름을 끊지 않게) · 하루 perDay판
//   (daily.korMatches — 다 이었을 때 claimDailyCount로 선점, 영어 matches와 같은 때)
// 한 판: pairs쌍 · 탭 두 번으로 잇기 · 보상은 영어와 같다(xp.matchXp ⚡ 30/20/10 · items.matchCoins 💰 5/3/2 — 틀린 수 0 / 1~2 / 3 이상)
// 한 판에 같이 안 내는 것: 같은 낱말 · 같은 뜻 · words.json apart 무리(뜻이 같은 짝·넓은 말 좁은 말 — 정답이 둘이 된다, v326)
// 뺄 것: 뜻이 meanMax자보다 긴 낱말(' — ' 뒤 덧말은 떼고 잰다 — 뜻 칸 다섯이 한 화면에 들어가게)
// 고르는 차례: 최근에 ★를 받은 글의 낱말부터(방금 읽은 글을 다지게) · 묶음(need개) 안에서 섞어 pairs개
// 이은 낱말: 프로필 korMatch { 낱말 id: 이은 날 번호 } — **이번 판에 낸 낱말만** 표시(영어는 묶음째 지우지만, 국어는 글에서 만난 낱말이 모두 한 번은 나오게)
//   병합은 합집합(이른 날 — 옛 백업이 이은 낱말을 되살려 같은 판이 또 열리지 않게)
import { dayNum } from './korean.js';
import { isOpen } from './korwords.js';

export const KOR_MATCH = { pairs: 5, need: 10, perDay: 3, meanMax: 24, wordMax: 8 };
const KEY_MAX = 80;
const KEEP_MAX = 3000;

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
const cnt = (v) => { const n = Math.floor(Number(v)); return Number.isSafeInteger(n) && n > 0 ? n : 0; };
const idOk = (k) => typeof k === 'string' && k.startsWith('p:') && k.length <= KEY_MAX;

/** 뜻 칸에 쓸 말 — ' — ' 뒤 덧말(「달이 거의 보이지 않아요」 같은 설명)은 뗀다 · 쉼표는 자르지 않는다(「차례가 되어 …, 또는 그 사람」이 반쪽이 된다) */
export function korShortMean(mean) {
  return String(mean || '').split(' — ')[0].trim();
}

/** 이 낱말을 낼 수 있나 — 📖 글에서 만난 낱말 · 낱말이 짧고 · 뜻이 meanMax자 안 */
export function korMatchable(w) {
  if (!w || w.deck !== 'passage' || typeof w.w !== 'string' || !w.w || w.w.length > KOR_MATCH.wordMax) return false;
  const m = korShortMean(w.mean);
  return m.length > 0 && m.length <= KOR_MATCH.meanMax;
}

/** 이은 낱말 기록 고쳐 읽기 — { 'p:카드:낱말': 날 번호 } (꼴이 틀린 칸은 뺀다 · 많으면 이른 것부터 KEEP_MAX) */
export function matchedOf(x) {
  const out = {};
  if (!isObj(x)) return out;
  const keys = Object.keys(x).filter((k) => idOk(k) && cnt(x[k]) > 0).sort((a, b) => cnt(x[a]) - cnt(x[b]) || (a < b ? -1 : a > b ? 1 : 0)).slice(0, KEEP_MAX);
  for (const k of keys) out[k] = cnt(x[k]);
  return out;
}

/** 두 사본 병합 — 합집합 · 낱말마다 이른 날 */
export function mergeMatched(a, b) {
  const out = matchedOf(a);
  const y = matchedOf(b);
  for (const [k, v] of Object.entries(y)) if (!own(out, k) || v < out[k]) out[k] = v;
  return matchedOf(out);
}

/**
 * 아직 이어 보지 않은 낱말 (순수) — 최근에 ★를 받은 글부터 · 같은 글 안은 글에 나온 차례
 * @param {Array} words korwords.allWords(📖은 apart 무리가 avoid로) · @param {object} korDone 받은 별 · @param {object} matched 이은 낱말
 */
export function korMatchPool(words, korDone, matched) {
  const done = isObj(korDone) ? korDone : {};
  const m = matchedOf(matched);
  const list = (Array.isArray(words) ? words : []).filter((w) => korMatchable(w) && isOpen(w, done) && !own(m, w.id));
  const at = (w) => cnt(done[`${w.card}:1`]);
  return list.map((w, i) => ({ w, i })).sort((a, b) => at(b.w) - at(a.w) || a.i - b.i).map((x) => x.w);
}

/** 섞기 (match.shuffle과 같은 꼴 — 이 파일은 화면 모듈을 부르지 않는다) */
function shuffle(list, rng) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 이번 판 (순수) → { items: [{ word, meaning, full, id }], ids } · 아직 need개가 안 모였거나 pairs쌍을 못 고르면 null
 *   묶음(앞에서 need개)을 섞어 고르고, 겹쳐서 모자라면 그 뒤 낱말을 차례로 본다
 * @param {Array} pool korMatchPool
 */
export function pickKorMatch(pool, { pairs = KOR_MATCH.pairs, need = KOR_MATCH.need, rng = Math.random } = {}) {
  const list = Array.isArray(pool) ? pool.filter(korMatchable) : [];
  if (list.length < Math.max(need, pairs)) return null;
  const order = [...shuffle(list.slice(0, need), rng), ...list.slice(need)];
  const picked = [];
  const words = new Set();
  const means = new Set();
  for (const w of order) {
    const mean = korShortMean(w.mean);
    if (words.has(w.w) || means.has(mean)) continue;
    // apart 무리(avoid) — 이미 고른 낱말과 같은 무리면 정답이 둘 (어느 쪽에 적혀 있어도)
    if (picked.some((p) => (w.avoid || []).includes(p.w) || (p.avoid || []).includes(w.w))) continue;
    picked.push(w);
    words.add(w.w);
    means.add(mean);
    if (picked.length >= pairs) break;
  }
  if (picked.length < pairs) return null;
  return { items: picked.map((w) => ({ word: w.w, meaning: korShortMean(w.mean), full: w.mean, id: w.id })), ids: picked.map((w) => w.id) };
}

/**
 * 다 이었다 — 이번 판 낱말을 이은 것으로 (저장된 프로필로 한 트랜잭션, xp.korMatchMark) → { ok, n 새로 표시한 수 }
 *   n 0 = 다른 창이 먼저 끝낸 같은 판(보상은 부르는 쪽이 안 준다) · why 'empty' 낼 수 있는 id가 없음
 */
export function korMatchRule(profile, ids, now) {
  const add = (Array.isArray(ids) ? ids : []).filter(idOk);
  if (!add.length) return { ok: false, why: 'empty' };
  const cur = matchedOf(profile.korMatch);
  const d = dayNum(now) || 1;
  let n = 0;
  for (const id of add) if (!own(cur, id)) { cur[id] = d; n++; }
  profile.korMatch = matchedOf(cur);
  return { ok: true, n };
}
