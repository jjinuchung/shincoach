// ✍️ 받아쓰기: 문장을 거의 다 보여주고 한두 칸만 비운 뒤, 소리를 듣고 그 칸에 들어갈 단어를 고른다.
//
// 🧩 퍼즐이 "어순"을 훈련한다면 받아쓰기는 "들리는가"를 훈련한다.
// 문장이 보이므로 읽어서 맞히는 게 아니라, 빈칸만은 소리로 판단해야 한다.
// 오답은 비슷하게 들리는 단어(편집 거리가 가까운 단어)로 만들어서 눈으로 못 고르게 한다.
//
// 초4가 태블릿에서 영어를 타이핑하는 건 그 자체로 좌절이라 입력은 "보기에서 고르기"다.
// 이 파일은 순수 로직만 담는다 (화면은 review.js).

import { editDistance, STOP_WORDS } from './speak.js';
import { splitWords, hasEchoedRun } from './puzzle.js';

/** 받아쓰기로 낼 수 있는 문장 길이 (짧으면 빈칸이 절반, 길면 태블릿에서 넘침) */
export const DICT_MIN_WORDS = 4;
export const DICT_MAX_WORDS = 12;
/** 보기 개수 (정답 1 + 오답 3) */
export const DICT_CHOICES = 4;

/** 비교용으로 단어만 남기기 ("Woody!" → woody) */
export function bare(word) {
  return String(word).toLowerCase().replace(/[^a-z0-9']+/g, '');
}

/**
 * 빈칸을 몇 개 뚫을지 — 익숙해진 문장일수록 더 어렵게.
 * (box는 라이트너 단계. 처음 만나는 문장에서 두 칸을 뚫으면 초4에게는 과하다)
 */
export function blankCount(box) {
  return (Number(box) || 0) >= 2 ? 2 : 1;
}

/**
 * 어떤 자리를 빈칸으로 뚫을지 고른다 — **우선순위가 높은 순서로** 돌려준다.
 * (여기서 자리 순서로 정렬하면 우선순위가 사라져서, 오답을 못 만드는 자리를 건너뛸 때
 *  엉뚱하게 the·was 같은 기능어가 먼저 뽑힌다. 자리 순 정렬은 makeDictation이 마지막에 한다)
 * 우선순위:
 *  1. 아이가 따라 말할 때 못 말했던 단어 — 정확히 약점을 친다 (sentenceStats.missed)
 *  2. 단어장에 뜻이 있는 단어 — 배울 가치가 있는 것
 *  3. 내용어 — the·a·is 같은 건 뚫어도 배우는 게 없다
 * @param {string[]} words splitWords 결과 (구두점·대문자가 붙은 원문 토큰)
 * @param {{missed?: Object, known?: Set<string>, count?: number}} opts
 */
export function pickBlanks(words, opts = {}) {
  const missed = opts.missed || {};
  const known = opts.known || null;
  const count = Math.max(1, opts.count || 1);
  const scored = [];
  words.forEach((w, i) => {
    const b = bare(w);
    if (b.length < 2) return;                    // "I", "a"는 뚫어도 소리가 너무 짧다
    const missCount = Object.prototype.hasOwnProperty.call(missed, b) && Number.isFinite(missed[b]) ? missed[b] : 0;
    const inVocab = known ? (known.has ? known.has(b) : false) : false;
    const isStop = STOP_WORDS.has(b);
    // 낮을수록 먼저 뚫는다
    let rank = 3;
    if (missCount > 0) rank = 0;
    else if (inVocab && !isStop) rank = 1;
    else if (!isStop) rank = 2;
    scored.push({ i, rank, missCount, len: b.length });
  });
  scored.sort((a, b) => a.rank - b.rank || b.missCount - a.missCount || b.len - a.len || a.i - b.i);
  return scored.slice(0, count).map((s) => s.i);
}

/**
 * 오답 보기 만들기 — **비슷하게 들리는 단어**로.
 * 무작위 단어를 섞으면 눈으로 봐도 답이 보여서 듣기 훈련이 안 된다.
 * walking → working·talking 처럼 한두 글자 차이 나는 단어를 사전에서 찾는다.
 * @param {string} answer 정답(원문 토큰, 구두점 포함 가능)
 * @param {Iterable<string>} pool 사전 단어들
 * @param {number} n 오답 개수
 */
export function makeDistractors(answer, pool, n = DICT_CHOICES - 1, rng = Math.random) {
  const a = bare(answer);
  if (!a) return [];
  const near = [];
  for (const raw of pool || []) {
    const w = bare(raw);
    if (!w || w === a) continue;
    if (Math.abs(w.length - a.length) > 2) continue;      // 길이가 많이 다르면 눈으로 걸러짐
    if (w[0] !== a[0] && w[w.length - 1] !== a[a.length - 1]) continue; // 첫 글자나 끝 글자는 겹치게
    const d = editDistance(w, a);
    if (d === 0 || d > 2) continue;
    near.push({ w, d });
  }
  if (!near.length) return [];
  near.sort((x, y) => x.d - y.d || x.w.length - y.w.length || (x.w < y.w ? -1 : 1));
  // 가장 가까운 것들 중에서 조금 섞어 뽑는다 (매번 같은 오답이 나오지 않게)
  const top = near.slice(0, Math.max(n * 3, n));
  const idx = top.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = idx[i]; idx[i] = idx[j]; idx[j] = t;
  }
  const out = [];
  const seen = new Set([a]);
  for (const i of idx) {
    const w = top[i].w;
    if (seen.has(w)) continue;
    seen.add(w);
    out.push(w);
    if (out.length >= n) break;
  }
  return out;
}

/**
 * 문장 하나를 받아쓰기 문항으로 만든다. 만들 수 없으면 null.
 * (빈칸 자리마다 오답이 2개 이상 나와야 문제가 된다 — 안 되면 그 자리는 버린다)
 * @returns {{blanks: [{index, answer, choices}], words: string[]}|null}
 */
export function makeDictation(cue, opts = {}) {
  if (!cue || !cue.en) return null;
  const words = splitWords(cue.en);
  if (words.length < DICT_MIN_WORDS || words.length > DICT_MAX_WORDS) return null;
  if (hasEchoedRun(words)) return null; // 두 화자가 겹쳐 말한 자막은 빈칸을 뚫어도 의미가 없다
  const rng = opts.rng || Math.random;
  const want = blankCount(opts.box);
  // 후보를 넉넉히 뽑아두고, 오답을 못 만드는 자리는 건너뛴다
  const cands = pickBlanks(words, { missed: opts.missed, known: opts.known, count: Math.min(words.length, want + 3) });
  const blanks = [];
  for (const i of cands) {
    if (blanks.length >= want) break;
    const answer = words[i];
    const wrong = makeDistractors(answer, opts.pool || [], DICT_CHOICES - 1, rng);
    if (wrong.length < 2) continue; // 보기가 3개는 돼야 찍어서 맞히기 어렵다
    const choices = [bare(answer), ...wrong];
    for (let k = choices.length - 1; k > 0; k--) {
      const j = Math.floor(rng() * (k + 1));
      const t = choices[k]; choices[k] = choices[j]; choices[j] = t;
    }
    blanks.push({ index: i, answer: bare(answer), display: answer, choices });
  }
  if (!blanks.length) return null;
  blanks.sort((a, b) => a.index - b.index);
  return { words, blanks };
}

/** 고른 답이 맞는지 (구두점·대소문자 무시) */
export function checkBlank(blank, choice) {
  return !!blank && bare(choice) === bare(blank.answer);
}
