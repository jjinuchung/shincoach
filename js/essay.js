// ✍️ 에세이: 배운 문장을 내 이야기로 바꿔 쓰고 → 신코치가 고쳐주고 → 소리 내어 읽는다.
//
// 교정은 **오프라인 규칙 기반**이다. 원칙은 하나: *확실한 것만 고치고 나머지는 아이가 쓴 그대로 둔다.*
// 어순·시제처럼 판단이 필요한 것은 건드리지 않는다 — 규칙으로 어설프게 고치면
// 아이가 하려던 말이 바뀌어 버리고, 그건 안 고치는 것보다 나쁘다.
import { splitWords, hasEchoedRun } from './puzzle.js';
import { stemWord } from './vocab.js';

const $ = (id) => document.getElementById(id);

export const DEFAULT_MINUTES = 30;   // 이만큼 공부하면 에세이가 열린다
export const DEFAULT_COUNT = 3;      // 한 번에 쓸 문장 수
export const REWARD = { xp: 10, coin: 5 };        // 문장 하나 완성
export const FINISH_REWARD = { xp: 50, coin: 20 }; // 전부 완성 (하루 1번)

export const MIN_WORDS = 5;          // 너무 짧은 문장은 바꿔 쓸 게 없다
export const MAX_WORDS = 14;         // 너무 길면 초4에게 부담
export const MIN_BLANK_WORDS = 2;    // 아이가 채울 부분은 최소 2단어
export const MAX_BLANK_WORDS = 5;    // 최대 5단어 (더 길면 타이핑이 부담)

/** 이 단어 **뒤에서** 끊으면 틀이 자연스럽다 ("I can't believe I just ___") */
const SPLIT_AFTER = new Set([
  'just', 'to', 'a', 'an', 'the', 'my', 'your', 'our', 'his', 'her', 'their', 'and', 'with',
  'of', 'in', 'on', 'at', 'for', 'from', 'because', 'that', 'is', 'was', 'am', 'are', 'be',
  'like', 'about', 'want', 'got', 'get', 'have', 'has',
]);

/** 이런 말로 시작하는 문장이 "내 이야기"로 바꾸기 쉽다 (명령문 "Use Fire Punch!" 보다) */
const PERSONAL_START = new Set(["i", "i'm", "i'll", "i've", 'we', "we'll", 'you', "you're", 'he', 'she', 'it', "it's", 'they', 'my', 'this', 'that', 'there']);

/**
 * 아이가 자주 빠뜨리는 아포스트로피.
 * **그 자체로 올바른 단어는 넣지 않는다** — lets("엄마가 놀게 해 줘요")를 let's로 바꾸면 틀린 글이 된다.
 */
const CONTRACTIONS = {
  cant: "can't", dont: "don't", didnt: "didn't", doesnt: "doesn't", isnt: "isn't",
  arent: "aren't", wasnt: "wasn't", werent: "weren't", couldnt: "couldn't",
  wouldnt: "wouldn't", shouldnt: "shouldn't", havent: "haven't", hasnt: "hasn't",
  im: "I'm", ive: "I've", thats: "that's", youre: "you're", theyre: "they're",
  hes: "he's", shes: "she's", weve: "we've", whats: "what's",
};

/**
 * 아이 글에 흔한 **명백한** 오타만. 사전에서 비슷한 단어를 찾아 바꾸는 방식은 쓰지 않는다:
 * goat → goal, ducks → duck, cakes → cake 처럼 **맞게 쓴 단어를 망가뜨린다**(Codex 리뷰에서 재현).
 */
const TYPOS = {
  teh: 'the', taht: 'that', adn: 'and', wiht: 'with', whith: 'with',
  scool: 'school', skool: 'school', becuase: 'because', becouse: 'because',
  freind: 'friend', firend: 'friend', freinds: 'friends',
  tommorow: 'tomorrow', tomorow: 'tomorrow', yesteday: 'yesterday', todya: 'today',
  beutiful: 'beautiful', favorit: 'favorite', littel: 'little', realy: 'really',
  liek: 'like', brohter: 'brother', familiy: 'family', playd: 'played',
};

/** 같은 단어를 두 번 쓴 것을 지울 수 있는 말 — 강조("very very happy")는 아이가 일부러 쓴 것이라 건드리지 않는다 */
const DEDUP_OK = new Set(['the', 'a', 'an', 'to', 'of', 'in', 'on', 'at', 'and', 'is', 'my', 'it']);

/** 글자는 자음인데 소리는 모음인 것들 (an hour) */
const VOWEL_EXCEPT = new Set(['hour', 'honest', 'honor']);

// ───────────────────────── 순수 로직 ─────────────────────────

/**
 * 배운 문장 → 바꿔 쓸 "틀"
 * @returns {{keep:string, rest:string, full:string, blankWords:number}|null} 쓸 수 없는 문장이면 null
 */
export function makeFrame(text) {
  const words = String(text || '').replace(/\n/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (words.length < MIN_WORDS || words.length > MAX_WORDS) return null;

  // 아이가 채울 부분은 **항상 2~5단어**로 (초4가 태블릿에서 영어를 치는 양).
  // 고정 부분에 상한을 두면 긴 문장에서 빈칸이 8단어까지 늘어난다 (Codex #11)
  const maxKeep = words.length - MIN_BLANK_WORDS;
  const minKeep = Math.max(2, words.length - MAX_BLANK_WORDS);
  if (maxKeep < minKeep) return null;

  // 그 범위 안에서 자연스러운 자리를 찾는다 ("I can't believe I just ___")
  let keepN = 0;
  for (let i = maxKeep; i >= minKeep; i--) {
    const w = core(words[i - 1]).toLowerCase();
    if (SPLIT_AFTER.has(w)) { keepN = i; break; }
  }
  if (!keepN) keepN = Math.max(minKeep, Math.min(maxKeep, words.length - 4));

  const keep = words.slice(0, keepN).join(' ').replace(/[,.!?;:]+$/, '');
  if (!keep || !/[a-z]/i.test(keep)) return null;
  return { keep, rest: words.slice(keepN).join(' '), full: words.join(' '), blankWords: words.length - keepN };
}

/** 문장 기록에서 오늘 쓸 문장 고르기 (잘 아는 문장 · 내 이야기로 바꾸기 쉬운 문장 우선) */
export function pickPrompts(records, count = DEFAULT_COUNT, opts = {}) {
  const cueOf = opts.cueOf || (() => true);
  const cands = [];
  for (const r of records || []) {
    if (!r || !r.done || !r.en) continue;
    if (!cueOf(r)) continue;                       // 지금 자막에 없는 옛 기록 제외
    if (hasEchoedRun(splitWords(r.en))) continue;  // 두 화자가 겹쳐 말한 줄 제외 (퍼즐과 같은 규칙)
    const frame = makeFrame(r.en);
    if (!frame) continue;
    cands.push({ rec: r, frame, score: scoreFrame(r, frame) });
  }
  cands.sort((a, b) => (b.score - a.score) || ((b.rec.lastAt || 0) - (a.rec.lastAt || 0)));
  return cands.slice(0, count).map(({ rec, frame }) => ({ rec, frame, cue: null }));
}

function scoreFrame(r, frame) {
  let s = 0;
  const first = core(String(r.en).trim().split(/\s+/)[0] || '').toLowerCase();
  if (PERSONAL_START.has(first)) s += 3;
  s += Math.min(2, r.box || 0);                                  // 잘 아는 문장일수록 응용하기 쉽다
  if (frame.blankWords >= 2 && frame.blankWords <= 5) s += 2;    // 채울 양이 적당한 것
  if (r.speakPass > 0) s += 1;                                   // 말해 본 적 있는 문장
  return s;
}

/**
 * 아이가 쓴 문장 교정 (규칙 기반, 확실한 것만)
 * @param {string} keep 틀의 고정 부분
 * @param {string} written 아이가 채운 부분
 * @param {{known?:Set<string>}} opts known = 아는 단어 집합 (철자 판단용)
 * @returns {{raw:string, fixed:string, notes:Array<{from:string,to:string,why:string}>}}
 */
export function correct(keep, written, opts = {}) {
  const known = opts.known || new Set();
  const notes = [];
  const add = (from, to, why) => { if (from !== to) notes.push({ from, to, why }); };

  const raw = `${String(keep || '').trim()} ${String(written || '').trim()}`.replace(/\s+/g, ' ').trim();
  const keepLen = String(keep || '').trim().split(/\s+/).filter(Boolean).length;
  const toks = raw.split(' ').map(splitToken);

  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (!t.word) continue;
    const lower = t.word.toLowerCase();
    const mine = i >= keepLen; // 틀(고정 부분)은 이미 맞는 문장이므로 건드리지 않는다

    // ① 아포스트로피 빠진 축약형
    if (mine && CONTRACTIONS[lower]) {
      const to = matchCase(t.word, CONTRACTIONS[lower]);
      add(t.word, to, '아포스트로피(\')를 넣었어요');
      t.word = to;
      continue;
    }

    // ② 나를 뜻하는 i 는 언제나 대문자
    if (t.word === 'i' || /^i'/.test(t.word)) {
      const to = t.word.replace(/^i/, 'I');
      add(t.word, to, "나를 뜻하는 I 는 언제나 대문자예요");
      t.word = to;
      continue;
    }

    // ③ a / an — **소리를 아는 경우만**. u로 시작하는 말은 a useful / an umbrella 가 갈려서 건드리지 않는다
    if (mine && (lower === 'a' || lower === 'an')) {
      const next = toks[i + 1] && toks[i + 1].word ? toks[i + 1].word.toLowerCase() : '';
      const want = articleFor(next);
      if (want && want !== lower) {
        const to = matchCase(t.word, want);
        add(t.word, to, want === 'an' ? '모음 소리로 시작하는 말 앞에는 an 을 써요' : '자음 소리로 시작하는 말 앞에는 a 를 써요');
        t.word = to;
      }
      continue;
    }

    // ④ 철자 — **명백한 오타 목록**이거나, 붙은 두 글자를 바꿔 쓴 경우만.
    //    사전에서 비슷한 단어를 찾는 방식은 쓰지 않는다 (ducks → duck 처럼 맞는 말을 망친다)
    if (mine && /^[a-z']+$/i.test(t.word) && t.word.length >= 3) {
      const isName = i > 0 && /^[A-Z]/.test(t.word); // 문장 중간의 대문자 = 이름일 가능성 → 그대로 둔다
      if (!isName) {
        const best = typoFix(lower, known);
        if (best) {
          const to = matchCase(t.word, best);
          add(t.word, to, '철자를 고쳤어요');
          t.word = to;
        }
      }
    }
  }

  // ⑤ 같은 단어를 두 번 쓴 것 — the the 처럼 **실수가 분명한 말**만. "very very happy"는 아이가 일부러 쓴 것
  for (let i = toks.length - 1; i > Math.max(0, keepLen - 1); i--) {
    const a = toks[i].word ? toks[i].word.toLowerCase() : '';
    const b = toks[i - 1].word ? toks[i - 1].word.toLowerCase() : '';
    if (a && a === b && DEDUP_OK.has(a) && !toks[i - 1].post) {
      notes.push({ from: `${toks[i - 1].word} ${toks[i].word}`, to: toks[i].word, why: '같은 단어가 두 번 들어갔어요' });
      toks.splice(i - 1, 1);
    }
  }

  let out = toks.map(joinToken).join(' ').replace(/\s+/g, ' ').trim();

  // ⑦ 문장 첫 글자는 대문자
  const firstLetter = out.search(/[a-z]/i);
  if (firstLetter >= 0 && /[a-z]/.test(out[firstLetter])) {
    const before = out;
    out = out.slice(0, firstLetter) + out[firstLetter].toUpperCase() + out.slice(firstLetter + 1);
    add(word1(before), word1(out), '문장 첫 글자는 대문자로 써요');
  }

  // ⑧ 문장 끝에는 마침표
  if (out && !/[.!?]$/.test(out)) {
    out += '.';
    notes.push({ from: '', to: '.', why: '문장 끝에는 마침표를 붙여요' });
  }

  return { raw, fixed: out, notes };
}

/**
 * 사전에서 가장 가까운 단어. **아주 보수적으로** 찾는다.
 *
 * 앱 사전은 1,868 + 기초 942단어뿐이라 아이가 맞게 쓴 단어도 "사전에 없는 단어"가 된다.
 * 거리 2까지 허용했더니 바르게 쓴 soccer 가 사전에 있는 sorcery 로 바뀌었다(실제로 테스트에서 잡힘).
 * 그래서 **한 글자 차이**이거나 **붙어 있는 두 글자를 바꿔 쓴 것**(freind → friend)일 때만 고친다.
 * 나머지는 아이가 쓴 그대로 둔다 — 못 고치는 것보다 멀쩡한 단어를 바꾸는 쪽이 훨씬 나쁘다.
 */
function typoFix(lower, known) {
  if (known.has(lower)) return null;          // 사전에 있는 말은 맞게 쓴 것
  if (isInflection(lower, known)) return null; // ducks · cakes · played 처럼 아는 단어의 변화형도 맞는 말
  if (TYPOS[lower]) return TYPOS[lower];
  if (lower.length < 4) return null;
  // 붙어 있는 두 글자를 바꿔 쓴 것 (freind → friend) — 실수가 분명한 경우만
  for (let i = 0; i + 1 < lower.length; i++) {
    if (lower[i] === lower[i + 1]) continue;
    const swapped = lower.slice(0, i) + lower[i + 1] + lower[i] + lower.slice(i + 2);
    if (known.has(swapped)) return swapped;
  }
  return null;
}

/** 아는 단어의 변화형인가 (duck → ducks, play → played). 단어장이 쓰는 stemWord를 그대로 씀 */
function isInflection(lower, known) {
  if (!/(s|es|ed|ing|er|est)$/.test(lower)) return false;
  const stem = stemWord(lower, known);
  return !!stem && stem !== lower && known.has(stem);
}

/**
 * 이 말 앞에 와야 하는 관사. **확실할 때만** 돌려준다(모르면 null → 아이가 쓴 그대로).
 * u로 시작하는 말은 a useful · an umbrella 로 갈려서 글자만 보고 판단할 수 없다.
 */
function articleFor(next) {
  if (!next || !/^[a-z]/.test(next)) return null;
  if (VOWEL_EXCEPT.has(next)) return 'an';
  const c = next[0];
  if (c === 'u' || c === 'h' || c === 'y') return null;  // useful/hour/year — 소리를 장담할 수 없다
  if ('aeio'.includes(c)) return 'an';
  return 'a';
}

function core(tok) {
  return String(tok).replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, '');
}

function splitToken(tok) {
  const m = String(tok).match(/^([^A-Za-z0-9']*)([A-Za-z0-9']*)(.*)$/);
  return m ? { pre: m[1], word: m[2], post: m[3] } : { pre: '', word: String(tok), post: '' };
}

function joinToken(t) {
  return `${t.pre}${t.word}${t.post}`;
}

/** 원래 단어의 대소문자를 새 단어에 맞춰 준다 (Cant → Can't) */
function matchCase(from, to) {
  if (!from || !/^[A-Z]/.test(from)) return to;
  return to[0].toUpperCase() + to.slice(1);
}

function word1(s) {
  return String(s).split(' ')[0] || '';
}

/**
 * 📋 부모에게 넘길 텍스트. 메신저를 거쳐도 살아남게 `[번호]` 한 줄 형식으로 고정한다.
 * @param {Array<{id:string, origin:string, written:string}>} entries 아직 고쳐 주지 않은 글
 * @returns {{text:string, ids:string[]}} ids는 번호 순서 — 붙여넣기 때 이 순서로 다시 붙인다
 */
export function exportText(entries) {
  const list = (entries || []).filter((e) => e && e.written);
  const lines = ['# 진우가 쓴 영어 문장 — 고쳐서 [번호] 줄로 돌려주세요', ''];
  list.forEach((e, i) => {
    lines.push(`[${i + 1}] 배운 문장: ${e.origin || ''}`);
    lines.push(`    진우: ${e.written}`);
    lines.push('');
  });
  return { text: lines.join('\n'), ids: list.map((e) => e.id) };
}

/**
 * 부모가 붙여넣은 교정문 파싱. `[3] I want to ...` 형태의 줄만 읽는다.
 * 사이에 다른 설명이 섞여 있어도(메신저에서 복사하면 흔하다) 번호 줄만 골라낸다.
 * @param {string} text 붙여넣은 내용
 * @param {string[]} ids exportText가 돌려준 순서
 * @returns {Array<{id:string, fixed:string}>}
 */
export function parseFixes(text, ids) {
  const out = [];
  const seen = new Set();
  for (const raw of String(text || '').split(/\r?\n/)) {
    const m = raw.match(/^\s*\[(\d{1,3})\]\s*(.+?)\s*$/);
    if (!m) continue;
    const n = Number(m[1]);
    const id = (ids || [])[n - 1];
    const fixed = m[2].replace(/^(배운 문장|진우)\s*:\s*/, '').trim();
    if (!id || !fixed || seen.has(id)) continue;   // 번호가 범위 밖이거나 같은 번호가 두 번이면 무시
    seen.add(id);
    out.push({ id, fixed });
  }
  return out;
}

/**
 * 문장을 비교용으로 다듬는다 (대소문자·구두점 차이는 무시).
 * 아포스트로피는 **지운다** — 사진에서 옮겨 적을 때 can't / cant 가 가장 흔하게 갈린다.
 */
export function normalizeWritten(text) {
  return String(text || '').toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 배포에 실어 보낸 교정문(coach/fixes.json)을 아이가 쓴 글과 짝지어 준다.
 *
 * 사진에서 옮겨 적은 문장이라 완벽히 같지 않을 수 있으므로 세 단계로 찾는다:
 * ① 다듬어서 똑같은 글 → ② 앞 4단어가 같은 글 → ③ 배운 문장(origin)이 같은 글.
 * 못 찾으면 조용히 건너뛴다 (다른 기기이거나 지워진 기록일 수 있다).
 *
 * @param {Array<{id:string, written:string, origin:string, coachFix?:string}>} entries 앱에 쌓인 에세이
 * @param {Array<{written?:string, origin?:string, fixed:string}>} fixes 배포로 온 교정문
 * @returns {Array<{id:string, fixed:string}>} 아직 안 고쳐진 글에만
 */
export function matchFixes(entries, fixes) {
  const open = (entries || []).filter((e) => e && e.id && !e.coachFix);
  const used = new Set();
  const out = [];
  const head = (s, n = 4) => normalizeWritten(s).split(' ').slice(0, n).join(' ');

  for (const f of (fixes || [])) {
    if (!f || !f.fixed) continue;
    const want = normalizeWritten(f.written);
    const wantHead = head(f.written);
    let hit = null;
    if (want) hit = open.find((e) => !used.has(e.id) && normalizeWritten(e.written) === want);
    if (!hit && wantHead) hit = open.find((e) => !used.has(e.id) && head(e.written) === wantHead);
    if (!hit && f.origin) {
      const wantOrigin = normalizeWritten(f.origin);
      hit = open.find((e) => !used.has(e.id) && normalizeWritten(e.origin) === wantOrigin);
    }
    if (!hit) continue;
    used.add(hit.id);
    out.push({ id: hit.id, fixed: String(f.fixed).trim() });
  }
  return out;
}

/** 보상만 받으려고 "a" 한 글자를 넣은 경우를 막는다 (실제로 쓰게 하려는 것) */
export function tooShort(text) {
  return (String(text || '').match(/[a-z]/gi) || []).length < 3;
}

/** 아이가 한글로 쓰지 않았는지 (영어 쓰기 연습이므로) */
export function looksEnglish(text) {
  const s = String(text || '');
  if (/[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(s)) return false;
  return /[a-z]/i.test(s);
}

/** 읽어 줄 때 쓸 대략의 길이(초) — 영상이 없으므로 단어 수로 어림잡는다 */
export function readSeconds(text) {
  const n = String(text || '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(2, Math.min(12, n * 0.55 + 1));
}

// ───────────────────────── 화면 ─────────────────────────

const ui = {
  open: false, o: null, i: 0, started: false, granted: false, busy: false,
  finished: false, speakStop: null, run: 0,
};

function playSfx(name) {
  const s = ui.o && ui.o.sfx;
  if (s && typeof s[name] === 'function') s[name]();
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/** 태블릿 내장 음성으로 읽어 주기 (음성이 없는 기기도 있어서 실패해도 그냥 넘어간다) */
export function canReadAloud() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function readAloud(text) {
  return new Promise((resolve) => {
    if (!canReadAloud() || !text) { resolve(false); return; }
    try {
      window.speechSynthesis.cancel(); // 앞의 말이 남아 있으면 겹친다
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = 0.85; // 초4가 따라 읽을 수 있게 조금 천천히
      let done = false;
      const end = (ok) => { if (!done) { done = true; resolve(ok); } };
      u.onend = () => end(true);
      u.onerror = () => end(false);
      window.speechSynthesis.speak(u);
      // 일부 안드로이드에서 onend가 안 오는 경우가 있어 안전장치
      setTimeout(() => end(false), readSeconds(text) * 1000 + 3000);
    } catch (e) {
      resolve(false);
    }
  });
}

export function stopReading() {
  if (canReadAloud()) { try { window.speechSynthesis.cancel(); } catch (e) { /* 무시 */ } }
}

export function initEssay() {
  $('essay-start').addEventListener('click', () => {
    if (!ui.open || ui.started) return; // 두 번 눌러도 회차가 겹치지 않게 (복습에서 겪은 것)
    ui.started = true;
    if (ui.o && ui.o.unlock) ui.o.unlock();
    showPrompt();
  });
  $('essay-later').addEventListener('click', () => finish({ started: false }));
  $('essay-listen').addEventListener('click', (e) => {
    e.stopPropagation();
    const it = ui.o && ui.o.prompts[ui.i];
    if (it && ui.o.onPlay) ui.o.onPlay(it.cue);
  });
  $('essay-submit').addEventListener('click', (e) => { e.stopPropagation(); submitWriting(); });
  $('essay-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submitWriting(); } });
  $('essay-read').addEventListener('click', (e) => {
    e.stopPropagation();
    const it = ui.o && ui.o.prompts[ui.i];
    if (it && it.result) readAloud(it.result.fixed);
  });
  $('essay-say').addEventListener('click', (e) => { e.stopPropagation(); startSpeaking(); });
  $('essay-next').addEventListener('click', (e) => { e.stopPropagation(); nextPrompt(); });
  $('essay-speak-done').addEventListener('click', (e) => { e.stopPropagation(); if (ui.speakStop) ui.speakStop(); });
  $('essay-close').addEventListener('click', () => finish({ started: true }));
}

export function isEssayOpen() {
  return ui.open;
}

/**
 * 에세이 열기
 * @param {object} o
 * @param {Array<{rec:object, frame:object, cue:object}>} o.prompts 바꿔 쓸 문장들
 * @param {{xp:number, coin:number}} o.reward 전부 쓰면 받을 것
 * @param {boolean} [o.practice] 연습 (기록·보상 없음)
 * @param {Set<string>} o.known 철자 교정에 쓸 아는 단어 집합
 * @param {(cue:object) => void} o.onPlay 원문 들려주기
 * @param {(text:string, hooks:object) => Promise<object>} o.speak 고친 문장 따라 말하기
 * @param {(item:object) => void} o.onWritten 문장 하나 완성 (기록·보상)
 * @param {() => object} o.onFinished 전부 완성
 * @param {(summary:object) => void} o.onDone
 */
export function openEssay(o) {
  closeEssay();
  ui.open = true;
  ui.run++;
  ui.o = o;
  ui.i = 0;
  ui.started = false;
  ui.granted = false;
  ui.busy = false;
  ui.finished = false;
  ui.speakStop = null;

  const coach = o.mode === 'coach'; // 👨‍👩‍👦 아빠가 고쳐 준 글을 읽는 회차 (쓰기 단계 없음)
  $('essay-title').textContent = coach ? '👨‍👩‍👦 아빠가 고쳐준 글' : (o.practice ? '✍️ 에세이 연습' : '✍️ 오늘의 에세이');
  $('essay-msg').textContent = coach
    ? `아빠가 고쳐준 문장 ${o.prompts.length}개를 읽어 봐요`
    : `배운 문장 ${o.prompts.length}개를 내 이야기로 바꿔 써요`;
  $('essay-start').textContent = coach ? '👀 보러 가기' : '✍️ 시작!';
  $('essay-fixed-label').textContent = coach ? '👨‍👩‍👦 아빠가 고쳐준 글' : '✅ 신코치가 고친 글';
  const rw = $('essay-reward');
  rw.innerHTML = '';
  if (o.practice) rw.appendChild(el('span', 'review-chip', '연습이라 기록이 남지 않아요'));
  else {
    rw.appendChild(el('span', 'review-chip', `문장마다 ⚡+${REWARD.xp} 💰+${REWARD.coin}`));
    if (!coach) rw.appendChild(el('span', 'review-chip gold', `다 쓰면 ⚡+${o.reward.xp} 💰+${o.reward.coin}`));
  }
  $('essay-note').textContent = coach
    ? '내가 쓴 글을 아빠가 읽고 고쳐 줬어요. 소리 내어 읽어 볼까요?'
    : '틀린 곳은 신코치가 고쳐 줄 거예요. 편하게 써 보세요!';

  $('essay-intro').hidden = false;
  $('essay-write').hidden = true;
  $('essay-result').hidden = true;
  $('essay-speak').hidden = true;
  $('essay-done').hidden = true;
  $('essay').hidden = false;
}

export function closeEssay() {
  if (!ui.open) return;
  ui.open = false;
  ui.run++;
  stopReading();
  if (ui.speakStop) { try { ui.speakStop('cancel'); } catch (e) { /* 무시 */ } ui.speakStop = null; }
  $('essay').hidden = true;
  ui.o = null;
}

/** 진행 중 강제로 닫힘 (콘텐츠 닫기 등) */
export function abortEssay() {
  if (!ui.open) return;
  const o = ui.o;
  const summary = { started: ui.started, done: ui.i, finished: ui.granted };
  closeEssay();
  if (o && o.onDone) o.onDone(summary);
}

function finish(patch) {
  if (!ui.open) return;
  const o = ui.o;
  const summary = { started: ui.started, done: ui.i, finished: ui.granted, ...patch };
  closeEssay();
  if (o && o.onDone) o.onDone(summary);
}

function renderDots() {
  const box = $('essay-dots');
  box.innerHTML = '';
  ui.o.prompts.forEach((_, n) => {
    const d = el('span', 'review-dot' + (n < ui.i ? ' done' : n === ui.i ? ' now' : ''));
    box.appendChild(d);
  });
}

function showPrompt() {
  const it = ui.o.prompts[ui.i];
  if (!it) { showDone(); return; }
  renderDots();
  $('essay-intro').hidden = true;
  $('essay-result').hidden = true;
  $('essay-speak').hidden = true;

  // 👨‍👩‍👦 아빠 교정문은 이미 쓴 글이라 쓰기 단계를 건너뛰고 바로 두 칸으로 보여준다
  if (ui.o.mode === 'coach') {
    it.result = { raw: it.written || '', fixed: it.coachFix || '', notes: [] };
    showResult(it);
    return;
  }
  $('essay-write').hidden = false;

  $('essay-origin-en').textContent = it.frame.full;
  $('essay-origin-ko').textContent = (it.rec && it.rec.ko) || '';
  $('essay-origin-ko').hidden = !(it.rec && it.rec.ko);
  $('essay-keep').textContent = it.frame.keep;
  const input = $('essay-input');
  input.value = '';
  input.placeholder = `여기에 영어로 ${it.frame.blankWords}단어쯤 써 보세요`;
  $('essay-warn').textContent = '';
  $('essay-listen').hidden = !it.cue;
  setTimeout(() => { try { input.focus(); } catch (e) { /* 무시 */ } }, 50);
}

function submitWriting() {
  if (!ui.open || ui.busy) return;
  const it = ui.o.prompts[ui.i];
  if (!it) return;
  const text = $('essay-input').value.trim();
  if (!text) { $('essay-warn').textContent = '아직 아무것도 안 썼어요!'; return; }
  if (!looksEnglish(text)) { $('essay-warn').textContent = '영어로 써 볼까요? 😊'; return; }
  if (tooShort(text)) { $('essay-warn').textContent = '조금 더 길게 써 볼까요?'; return; }

  const result = correct(it.frame.keep, text, { known: ui.o.known });
  it.written = text;
  it.result = result;
  playSfx('ding');
  if (!ui.o.practice && ui.o.onWritten) ui.o.onWritten(it);
  showResult(it);
}

function showResult(it) {
  $('essay-write').hidden = true;
  $('essay-result').hidden = false;
  $('essay-written').textContent = it.result.raw;
  $('essay-fixed').textContent = it.result.fixed;

  const notes = $('essay-notes');
  notes.innerHTML = '';
  if (ui.o.mode === 'coach') {
    // 아빠 교정문에는 규칙 설명이 없다 (무엇이 달라졌는지는 두 칸을 나란히 보면 된다)
  } else if (!it.result.notes.length) {
    notes.appendChild(el('li', 'essay-note-ok', '고칠 곳이 없어요. 아주 잘 썼어요! 🎉'));
  } else {
    for (const n of it.result.notes) {
      const li = el('li');
      if (n.from) {
        li.appendChild(el('b', 'essay-from', n.from));
        li.appendChild(el('span', null, ' → '));
        li.appendChild(el('b', 'essay-to', n.to));
        li.appendChild(el('span', 'essay-why', ` (${n.why})`));
      } else {
        li.appendChild(el('span', 'essay-why', n.why));
      }
      notes.appendChild(li);
    }
  }
  $('essay-read').hidden = !canReadAloud();
  $('essay-next').textContent = ui.i + 1 >= ui.o.prompts.length ? '다 썼어요!' : '다음 문장 →';
  // 고친 문장을 한 번 읽어 준다 (되면)
  readAloud(it.result.fixed);
}

function startSpeaking() {
  if (!ui.open || ui.busy) return;
  const it = ui.o.prompts[ui.i];
  if (!it || !it.result || !ui.o.speak) return;
  stopReading(); // 말하기와 읽어주기가 겹치면 인식이 제 소리를 듣는다
  ui.busy = true;
  const run = ui.run;
  $('essay-result').hidden = true;
  $('essay-speak').hidden = false;
  $('essay-speak-text').textContent = it.result.fixed;
  $('essay-speak-msg').textContent = '🎤 따라 읽어 보세요';
  const fill = $('essay-speak-fill');
  if (fill) fill.style.width = '0%';

  ui.o.speak(it.result.fixed, {
    register: (stop) => { ui.speakStop = stop; },
    onListening: () => { $('essay-speak-msg').textContent = '🎤 듣고 있어요'; },
    onLevel: (lv) => { if (fill) fill.style.width = `${Math.round(Math.min(1, lv) * 100)}%`; },
  }).then((res) => {
    if (!ui.open || run !== ui.run) return;
    ui.busy = false;
    ui.speakStop = null;
    // 화면이 꺼졌거나 취소된 것은 "읽었다"가 아니다 → 결과 화면으로 돌려보내 다시 읽게 (Codex #5)
    if (res && (res.method === 'interrupted' || res.method === 'cancelled')) {
      $('essay-speak').hidden = true;
      $('essay-result').hidden = false;
      return;
    }
    const ok = !!(res && res.passed); // runSpeakCheck는 passed/score를 준다 (ratio라는 필드는 없다 — Codex #10)
    $('essay-speak-msg').textContent = ok ? '좋아요! 잘 읽었어요 👏' : '읽어 봤어요! 👍';
    playSfx(ok ? 'success' : 'ding');
    const at = ui.i;
    setTimeout(() => {
      // 아이가 그 사이에 "다음 문장"을 직접 눌렀으면 여기서 또 넘기지 않는다 (문장을 건너뛰게 된다)
      if (!ui.open || run !== ui.run || ui.i !== at || $('essay-speak').hidden) return;
      if (typeof document !== 'undefined' && document.hidden) return; // 화면이 꺼진 동안엔 넘어가지 않는다
      nextPrompt();
    }, 1200);
  });
}

function nextPrompt() {
  if (!ui.open) return;
  stopReading();
  ui.busy = false;
  // 👨‍👩‍👦 아빠 교정문은 "읽고 넘어갈 때" 한 번만 기록·보상한다
  const cur = ui.o.prompts[ui.i];
  if (ui.o.mode === 'coach' && cur && !cur.marked) {
    cur.marked = true;
    if (!ui.o.practice && ui.o.onRead) ui.o.onRead(cur);
  }
  ui.i++;
  if (ui.i >= ui.o.prompts.length) { showDone(); return; }
  showPrompt();
}

async function showDone() {
  if (ui.finished) return; // 두 번 불려도 보상 칩이 지워지지 않게
  ui.finished = true;
  $('essay-write').hidden = true;
  $('essay-result').hidden = true;
  $('essay-speak').hidden = true;
  $('essay-done').hidden = false;
  renderDots();

  let reward = null;
  if (!ui.o.practice && !ui.granted && ui.o.onFinished) {
    ui.granted = true;
    reward = await ui.o.onFinished(); // 하루 한 번 선점 결과를 기다림 (다른 창이 먼저면 null)
  }
  $('essay-done-msg').textContent = ui.o.mode === 'coach'
    ? `아빠가 고쳐준 문장 ${ui.o.prompts.length}개를 다 읽었어요 👏`
    : ui.o.practice
      ? '연습 끝! 잘했어요 👏'
      : `오늘의 에세이 완성! 문장 ${ui.o.prompts.length}개를 내 이야기로 바꿨어요 🎉`;
  const box = $('essay-done-reward');
  box.innerHTML = '';
  if (reward) box.appendChild(el('span', 'review-chip gold', `⚡+${reward.xp} 💰+${reward.coin}`));
  playSfx('levelUp');
}
