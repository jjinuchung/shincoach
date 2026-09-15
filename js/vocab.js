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
export function findTokenRange(text, term, known) {
  const raws = String(text).replace(/\n/g, ' ').split(/\s+/).filter(Boolean);
  const stems = raws.map((r) => {
    const t = tokenize(r)[0];
    return t ? stemWord(t, known) : '';
  });
  const parts = String(term).replace(/…/g, ' ').split(/\s+/)
    .map((w) => w.replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, '').toLowerCase())
    .filter(Boolean)
    .map((w) => stemWord(w, known));
  if (!parts.length) return null;
  const from = stems.indexOf(parts[0]);
  if (from < 0) return null;
  if (parts.length === 1) return [from, from];
  const last = stems.lastIndexOf(parts[parts.length - 1]);
  return [from, last > from ? last : from];
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
  function findRange(text, term) {
    return findTokenRange(text, term, known);
  }

  return { lookup, findRange, known, basic, size: Object.keys(words).length };
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
