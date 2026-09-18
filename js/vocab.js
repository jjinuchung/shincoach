// 단어장: 현재 문장에서 "모를 만한" 단어·표현을 찾아 한글 뜻을 붙인다.
// 데이터: vocab/basic.json (기초 단어 → 표시 안 함), vocab/words.json (기본형 → 뜻, "=go"는 별칭),
//         vocab/phrases.json (표현 → 뜻, '*'는 단어 하나 와일드카드)
// 브라우저(fetch)와 Node(직접 import) 양쪽에서 쓰는 순수 함수 위주.

const CONTRACTIONS = ["n't", "'ll", "'re", "'ve", "'d", "'m", "'s"];

const SPECIAL = { "can't": 'can', "won't": 'will', "ain't": 'be', "shan't": 'shall', "let's": 'let', "y'all": "y'all", "ma'am": "ma'am", "o'clock": "o'clock" };

/** "didn't" → "did", "we'll" → "we", "toy's" → "toy", "can't" → "can" */
export function stripContraction(word) {
  if (SPECIAL[word]) return SPECIAL[word];
  for (const c of CONTRACTIONS) {
    if (word.endsWith(c) && word.length > c.length) return word.slice(0, -c.length);
  }
  return word;
}

/**
 * 변화형 → 기본형 후보를 순서대로 만들어 `known`(사전+기초 단어)에 있는 첫 후보를 돌려준다.
 * 없으면 원래 단어. 예: solved → solve, running → run, babies → baby, bigger → big
 */
export function stemWord(word, known) {
  const w = stripContraction(word.toLowerCase());
  const has = (x) => known && (known.has ? known.has(x) : Object.prototype.hasOwnProperty.call(known, x));
  if (has(w)) return w;
  const cands = [];
  const push = (x) => { if (x && x.length >= 2 && !cands.includes(x)) cands.push(x); };
  if (w.endsWith("'")) push(w.replace(/'+$/, '')); // kids' → kids
  if (w.endsWith('ies')) push(w.slice(0, -3) + 'y');
  if (w.endsWith('ied')) push(w.slice(0, -3) + 'y');
  if (w.endsWith('ier')) push(w.slice(0, -3) + 'y');
  if (w.endsWith('iest')) push(w.slice(0, -4) + 'y');
  if (w.endsWith('sses') || w.endsWith('shes') || w.endsWith('ches') || w.endsWith('xes') || w.endsWith('zes')) push(w.slice(0, -2));
  if (w.endsWith('es')) push(w.slice(0, -2)), push(w.slice(0, -1));
  if (w.endsWith('s') && !w.endsWith('ss')) push(w.slice(0, -1));
  if (w.endsWith('ed')) {
    push(w.slice(0, -2));
    push(w.slice(0, -1));                                  // loved → love
    if (/([b-df-hj-np-tv-z])\1ed$/.test(w)) push(w.slice(0, -3)); // stopped → stop
  }
  if (w.endsWith('ing')) {
    push(w.slice(0, -3));
    push(w.slice(0, -3) + 'e');                            // solving → solve
    if (/([b-df-hj-np-tv-z])\1ing$/.test(w)) push(w.slice(0, -4)); // running → run
  }
  if (w.endsWith('er')) push(w.slice(0, -2)), push(w.slice(0, -1));   // bigger→bigg(x)→..., nicer → nice
  if (/([b-df-hj-np-tv-z])\1er$/.test(w)) push(w.slice(0, -3));       // bigger → big
  if (w.endsWith('est')) push(w.slice(0, -3)), push(w.slice(0, -2));
  if (/([b-df-hj-np-tv-z])\1est$/.test(w)) push(w.slice(0, -4));
  if (w.endsWith('ly')) push(w.slice(0, -2));
  for (const c of cands) if (has(c)) return c;
  return w;
}

/** 문장 → 소문자 단어 배열 (구두점 제거, 순서 유지) */
export function tokenize(text) {
  return text.replace(/\n/g, ' ').split(/\s+/)
    .map((t) => t.replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, '').toLowerCase())
    .filter((t) => t.length > 1 && /[a-z]/.test(t));
}

/**
 * 문장에서 이 단어·표현이 차지하는 **공백 토큰 범위** → [from, to] (없으면 null).
 * 공백 토큰 기준이라 srt.wordTimings 자리와 1:1 — 그 구간만 다시 들려줄 때 쓴다.
 * 단어장의 term은 기본형("walk")이라 문장의 "walking"과 다를 수 있어 stem으로 비교한다.
 */
/** 토큰 하나를 비교용으로 정제 (tokenize와 달리 한 글자 "I", "a"도 남긴다 — Codex #4) */
function cleanToken(t) {
  return String(t).replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, '').toLowerCase();
}

/** 문장을 공백으로 나누되 각 토큰의 문자 위치도 함께 (표현 매치 위치 → 토큰 자리 변환용) */
function splitWithPos(text) {
  const src = String(text).replace(/\n/g, ' ');
  const out = [];
  const re = /\S+/g;
  let m = re.exec(src);
  while (m) {
    out.push({ raw: m[0], start: m.index, end: m.index + m[0].length });
    m = re.exec(src);
  }
  return out;
}

/**
 * 문장에서 이 **단어 하나**가 있는 공백 토큰 자리 → [i, i] (없으면 null).
 * 단어장의 term은 기본형("walk")이라 문장의 "walking"과 다를 수 있어 stem으로 비교한다.
 * 같은 단어가 여러 번 나오면 첫 번째 자리를 쓴다 (패널이 중복 단어를 하나로 합치므로).
 */
export function findTokenRange(text, term, known) {
  const toks = splitWithPos(text);
  const want = stemWord(cleanToken(term), known);
  if (!want) return null;
  for (let i = 0; i < toks.length; i++) {
    const c = cleanToken(toks[i].raw);
    if (c && stemWord(c, known) === want) return [i, i];
  }
  return null;
}

/**
 * 정규식이 찾은 **문자 구간**을 공백 토큰 자리로 바꾼다 (표현용).
 * 표현은 "get up"처럼 같은 단어가 문장에 여러 번 나올 수 있어, 첫 단어와 마지막 단어를
 * 따로 찾으면 엉뚱하게 문장 전체가 잡힌다 (Codex #2) — 실제 매치 구간을 그대로 쓴다.
 */
export function charRangeToTokens(text, from, to) {
  const toks = splitWithPos(text);
  let first = -1;
  let last = -1;
  for (let i = 0; i < toks.length; i++) {
    if (toks[i].end > from && toks[i].start < to) {
      if (first < 0) first = i;
      last = i;
    }
  }
  return first < 0 ? null : [first, last];
}

/** 표현 사전의 키("figure * out")를 정규식으로 */
function phraseRegex(key) {
  const esc = key.replace(/[.*+?^${}()|[\]\\]/g, (m) => (m === '*' ? '\\*' : '\\' + m));
  return new RegExp('\\b' + esc.replace(/\\\*/g, "[a-z']+").replace(/\s+/g, '\\s+') + '\\b', 'i');
}

/**
 * 단어장 객체 생성
 * @param {{basic: string[], words: Record<string,string>, phrases: Record<string,string>}} data
 */
export function createVocab(data) {
  const basic = new Set(data.basic || []);
  const words = data.words || {};
  const phrases = Object.entries(data.phrases || {}).map(([k, v]) => ({ key: k, re: phraseRegex(k), meaning: v }));
  const known = new Set([...basic, ...Object.keys(words)]);
  // 뜻에 "(스페인어)" "(미니언 말)" 처럼 외국어 표시가 붙은 낱말 — 단어 패널에는 필요하지만
  // **영어 문장인지 판단할 때는 영어로 세면 안 된다** (미니언즈는 이런 말이 잔뜩 나온다)
  const foreign = new Set(
    Object.entries(words)
      .filter(([, v]) => FOREIGN_TAG.test(String(v)))
      .map(([k]) => k)
  );

  function meaningOf(stem) {
    let m = words[stem];
    let hops = 0;
    while (m && m.startsWith('=') && hops++ < 3) m = words[m.slice(1)];
    return m || '';
  }

  /**
   * 문장에서 표현·단어를 찾아 [{ term, meaning, kind }] 반환 (표현 먼저, 단어는 문장 순서, 중복 제거)
   * @param {string} text 영어 문장
   * @param {{ showBasic?: boolean }} opts
   */
  function lookup(text, opts = {}) {
    const out = [];
    const seen = new Set();
    const lower = text.replace(/\n/g, ' ').toLowerCase();
    for (const p of phrases) {
      if (!p.re.test(lower)) continue;
      out.push({ term: p.key.replace(/\*/g, '…'), meaning: p.meaning, kind: 'phrase' });
      for (const t of tokenize(p.key)) seen.add(stemWord(t, known)); // 표현에 든 단어는 따로 안 보여줌
    }
    for (const tok of tokenize(text)) {
      const stem = stemWord(tok, known);
      if (seen.has(stem)) continue;
      if (basic.has(stem) && !opts.showBasic) continue;
      const m = meaningOf(stem);
      if (!m) continue;
      seen.add(stem);
      out.push({ term: stem, meaning: m, kind: 'word' });
    }
    return out;
  }

  /** 문장에서 이 단어·표현의 공백 토큰 범위 (🔊 그 부분만 듣기용) */
  function findRange(text, term, kind) {
    // 표현은 lookup이 쓴 것과 같은 정규식으로 실제 매치 구간을 찾는다.
    // 첫 단어와 끝 단어를 따로 찾으면 "Get up and stand up."에서 문장 전체가 잡힌다 (Codex #2)
    if (kind === 'phrase') {
      const key = String(term).replace(/…/g, '*');
      const p = phrases.find((x) => x.key === key);
      if (!p) return null;
      const src = String(text).replace(/\n/g, ' ');
      const m = src.match(p.re);
      if (!m || m.index === undefined) return null;
      return charRangeToTokens(text, m.index, m.index + m[0].length);
    }
    return findTokenRange(text, term, known);
  }

  return { lookup, findRange, known, basic, foreign, size: Object.keys(words).length };
}

/** 영어답게 생긴 꼬리 — 사전에 없어도 영어 단어로 본다 (thankfully, intervened, amazing…) */
const EMPTY_SET = new Set();
const ENGLISH_TAIL = /(ly|ed|ing|tion|sion|ness|ment|ful|less|able|ible|est|er)$/;
/** 단어장 뜻에 붙은 "영어가 아니다" 표시 */
const FOREIGN_TAG = /미니언 말|일본어|이탈리아어|스페인어|프랑스어|독일어|중국어|외국어/;

/**
 * 따라 말하기를 시킬 만한 **영어 문장**인가.
 *
 * 미니언즈어("Bello! Poopaye!", "Eh, bup, bup, bup")나 포켓몬 울음소리처럼 영어가 아닌 줄은
 * 아이가 아무리 잘 따라 해도 인식기가 영어로 못 알아들어 "틀렸다"만 나온다.
 * 발음하기도 어렵고 배울 것도 없는데 계속 다시 하라고 하니 아이가 지친다 (2026-09-18 아버님).
 *
 * 판단: 사전에 있거나 영어답게 생긴 단어의 비율. 고유명사(문장 중간의 대문자 낱말 — James, Henry)는
 * 사전에 없는 게 당연하므로 **아예 세지 않는다**. 그러지 않으면 "James and Henry!" 같은
 * 멀쩡한 영어가 걸러진다.
 *
 * @param {string} text 영어 자막 한 줄
 * @param {Set<string>} known 아는 단어 집합 (createVocab().known)
 * @param {number} min 이 비율보다 낮으면 영어가 아닌 것으로 본다
 */
export function isSpeakable(text, vocab, min = 0.4) {
  const known = vocab && vocab.known ? vocab.known : vocab;
  const foreign = (vocab && vocab.foreign) || EMPTY_SET;
  const raw = String(text || '').replace(/[♪♫]/g, ' ').split(/\s+/).filter(Boolean);
  let counted = 0;
  let english = 0;
  for (let i = 0; i < raw.length; i++) {
    const tok = raw[i];
    const w = tok.toLowerCase().replace(/[^a-z']/g, '');
    if (!w) continue; // 문장부호·다른 문자만 있는 조각
    // 문장 맨 앞이 아닌 대문자 낱말 = 이름 → 세지 않는다 (사전에 없는 게 당연하다)
    const midSentenceName = i > 0 && /^[A-Z]/.test(tok) && !/^[.!?]$/.test(raw[i - 1].slice(-1));
    if (midSentenceName) continue;
    counted++;
    if (foreign.has(w)) continue; // 외국어로 적어 둔 낱말은 영어로 세지 않는다
    if ((known && (known.has ? known.has(w) : false)) || stemWord(w, known) !== w || ENGLISH_TAIL.test(w)) english++;
  }
  if (!counted) return false;          // 셀 단어가 없으면 따라 말할 것도 없다
  return english / counted >= min;
}

/** 브라우저에서 vocab/*.json 로드 (실패해도 앱은 동작해야 하므로 빈 단어장 반환) */
export async function loadVocab(base = './vocab/') {
  try {
    const [basic, words, phrases] = await Promise.all(
      ['basic.json', 'words.json', 'phrases.json'].map((f) => fetch(base + f).then((r) => (r.ok ? r.json() : null)))
    );
    return createVocab({ basic: basic || [], words: words || {}, phrases: phrases || {} });
  } catch (err) {
    console.warn('단어장 로드 실패:', err);
    return createVocab({ basic: [], words: {}, phrases: {} });
  }
}
