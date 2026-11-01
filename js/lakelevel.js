// 🎣 학습 낚시터 난이도 (v378 · 2026-11-01 아버님 「아이 낚시를 옆에서 보니 문제가 너무 쉽다 — 물고기가 클수록 어렵게」 → 기본안 「추천대로」)
// 과목마다 2·3단계 꼴 (순수 · 화면 없음 · 난수는 rng 인자) — 1단계(★1·2)는 지금 그대로라 이 파일을 거치지 않는다
//   단계는 fishing.stageLevel(물고기가 문 뒤 ③④⑤만 · ★3 → 2 · ★4·5 → 3) · 새 글 없이 앱에 이미 있는 꼴만 · 못 만들면 한 단계 아래(부르는 쪽이 1단계 꼴로)
//   · 🔢 수학 배운 칸: 2 ② 함정(misread — 포켓몬이 한 말에서 틀린 곳) · 3 ③ 이유(why — 사람이 쓴 문제라 있는 칸만) → 함정 → 계산
//   · 🔶 영어: 2 뜻 보고 영어 단어(거꾸로 · 답한 뒤 🔊) · 3 🔊 소리만 듣고 뜻(글자는 답한 뒤 · 영어 목소리가 없는 기기면 2 — lvFor)
//   · 📚 국어: 2 빈칸 문장(korwords 'use' — 같이 들어갈 낱말은 원고가 걸러 둠) · 3 뜻 보고 낱말(korwords 'word' — 헷갈리는 짝 먼저)
//   · 🖊️ 논술: 2 이유 고르기인데 상관없는 말 대신 반대편 이유 셋 · 3 이유가 「아닌」 것(내 편 셋 + 반대편 하나)
//   · 2·3단계의 틀린 보기에는 왜 아닌지 한 줄(hint) — 낚시터 카드가 「알겠어요」까지 보여 준다(🐟 물고기 수학과 같은 길)
import { makeQuestion, DECKS } from './korwords.js';

function shuffle(list, rng) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.min(i, Math.floor((Number(rng()) || 0) * (i + 1))); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const pick = (list, rng) => list[Math.min(list.length - 1, Math.floor((Number(rng()) || 0) * list.length))];

/** 실제로 낼 단계 — 1~3 밖은 1 · 🔶 영어 3단계(소리만)는 영어 목소리가 있는 기기에서만(caps.listen · 없으면 2) */
export function lvFor(subj, lv, caps = {}) {
  const n = [1, 2, 3].includes(lv) ? lv : 1;
  return subj === 'english' && n === 3 && !(caps && caps.listen) ? 2 : n;
}

// ───────────── 🔢 수학 배운 칸 ─────────────

/** 단계마다 해 볼 얼굴 차례 (앞에서 못 만들면 다음) */
export const MATH_KINDS = { 1: ['calc'], 2: ['misread', 'calc'], 3: ['why', 'misread', 'calc'] };
/** 얼굴 → 실제 낸 단계 (📤 단계별 칸) */
export const MATH_KIND_LV = { calc: 1, misread: 2, why: 3 };
export function mathKinds(lv) {
  return [1, 2, 3].includes(lv) ? MATH_KINDS[lv] : MATH_KINDS[1];
}
const plain = (t) => String(t || '').replace(/\[[a-z]+ [^\]]+\]/g, '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
/** 틀린 보기의 한 줄 — 그 실수(tag)의 풀이 · 없으면 어느 오답이든 같은 풀이(whyAny) · 굵은 표시·그림 자리는 뺀다 · 정답이면 '' */
export function mathHint(q, c) {
  const s = q && q.solve;
  if (!s || !c || c.ok) return '';
  return plain((c.tag && s.why && s.why[c.tag]) || s.whyAny || '');
}

// ───────────── 🔶 영어 ─────────────

/** 뜻 견주기 — review.quizChoices와 같은 셈(「조심해!」 = 「조심해」) */
const meanKey = (m) => String(m || '').replace(/[\s!?.,~…'"()[\]]/g, '');
const wordKey = (w) => String(w || '').trim().toLowerCase();
/**
 * 🔊 소리가 같은 영어 짝 (Codex 182차 #1 — 소리만 문제에서 한 짝이 정답·보기로 함께 나오면 구별할 수 없다) · 흔한 것만 사람이 골랐다
 * 앱 사전(vocab)에 둘 다 있는 짝: hole/whole · tail/tale · pair/pear · mail/male · steal/steel · cell/sell
 */
export const SOUND_ALIKE = [
  ['know', 'no'], ['knew', 'new'], ['right', 'write'], ['see', 'sea'], ['hear', 'here'], ['there', 'their'], ['to', 'two', 'too'], ['for', 'four'],
  ['one', 'won'], ['sun', 'son'], ['be', 'bee'], ['by', 'buy', 'bye'], ['eye', 'i'], ['meet', 'meat'], ['night', 'knight'], ['week', 'weak'],
  ['blue', 'blew'], ['hole', 'whole'], ['flower', 'flour'], ['tail', 'tale'], ['road', 'rode'], ['pair', 'pear'], ['bear', 'bare'], ['dear', 'deer'],
  ['hour', 'our'], ['wear', 'where'], ['ate', 'eight'], ['red', 'read'], ['mail', 'male'], ['plain', 'plane'], ['sale', 'sail'], ['wait', 'weight'],
  ['way', 'weigh'], ['wood', 'would'], ['not', 'knot'], ['so', 'sew'], ['piece', 'peace'], ['steal', 'steel'], ['brake', 'break'], ['cell', 'sell'],
  ['which', 'witch'], ['knows', 'nose'], ['hi', 'high'], ['flu', 'flew'], ['made', 'maid'], ['tea', 'tee'], ['son', 'sun'],
];
const ALIKE = new Map();
for (const g of SOUND_ALIKE) for (const w of g) ALIKE.set(w, new Set([...(ALIKE.get(w) || []), ...g.filter((x) => x !== w)]));
/** 두 영어가 소리가 같은가 (짝 목록에 있으면) */
export function soundAlike(a, b) {
  const x = wordKey(a);
  const y = wordKey(b);
  return x !== y && !!ALIKE.get(x) && ALIKE.get(x).has(y);
}
/**
 * 비슷한 뜻 묶음 (Codex 182차 #2 — 「조심해!」·「주의해」처럼 글자가 달라도 둘 다 정답으로 읽히는 뜻) · 아이 영상에 흔한 것만 사람이 골랐다 ·
 * 뜻의 한 갈래(끝말을 뗀 줄기)가 낱말 하나를 품으면 그 묶음 — 덜 겹치는 보기까지 빼는 쪽으로 넓게(보기가 모자라면 1단계 꼴로 내려간다)
 */
export const SAME_MEAN = [
  ['조심', '주의'], ['고마', '고맙', '감사'], ['미안', '죄송'], ['안녕', '반가', '반갑'], ['빨리', '서둘', '어서', '얼른'], ['멋진', '멋있', '근사'],
  ['큰', '커다란', '거대'], ['작은', '조그만'], ['기쁜', '기뻐', '행복', '즐거'], ['슬픈', '슬퍼', '우울'], ['무서', '무섭', '겁', '두려'], ['화난', '화가', '성난'],
  ['예쁜', '아름다', '귀여'], ['괜찮', '좋아'], ['잘했', '훌륭', '대단'], ['기다려', '잠깐', '잠시'], ['도와', '도움', '살려'], ['그만', '멈춰', '멈추'],
];
/** 뜻 한 줄 → 갈래별 줄기 — 쉼표·쌍반점·빗금으로 나누고 괄호 속은 빼고 끝말(하다·해·해요·다·요 …)을 뗀다 (「경보, 조심해!(~가 온다)」 → 경보 · 조심) */
function meanStems(m) {
  return String(m || '').replace(/\([^)]*\)/g, ' ').split(/[,;/·]/).map((p) => meanKey(p).replace(/(합니다|해라|해요|하다|하기|해|다|요)$/, '')).filter(Boolean);
}
const groupsOf = (stem) => SAME_MEAN.map((g, i) => (g.some((t) => stem.includes(t)) ? i : -1)).filter((i) => i >= 0);
/**
 * 뜻이 서로 겹치는가 — 뜻 글자가 같음(「해」·「해!」 — 끝말을 떼면 줄기가 비는 뜻도) ·
 * 갈래 줄기가 같거나 두 글자 넘는 쪽이 품음(「조심해!」·「조심하다」 · 「친구」·「친구들」) · 비슷한 뜻 묶음이 같음(「조심해!」·「주의해」)
 */
function meanClash(a, b) {
  if (meanKey(a) === meanKey(b)) return true;
  const sa = meanStems(a);
  const sb = meanStems(b);
  if (sa.some((p) => sb.some((q) => p === q || (p.length >= 2 && q.length >= 2 && (p.includes(q) || q.includes(p)))))) return true;
  const ga = new Set(sa.flatMap(groupsOf));
  return sb.some((q) => groupsOf(q).some((i) => ga.has(i)));
}
/** 두 영어 뜻이 겹치는가 (시험용 — 틀린 보기를 고르는 셈과 같은 것) */
export const meansClash = meanClash;
/**
 * 틀린 보기로 쓸 다른 단어 셋 [{ word, meaning }] — 섞어서 앞에서부터 · 정답·서로와 단어도 뜻도 안 겹치게 · 모자라면 null
 * listen(🔊 소리만)이면 정답과 소리가 같은 단어(SOUND_ALIKE)도 뺀다
 */
function otherWords(rec, all, rng, listen = false) {
  const seenM = [String(rec.meaning)];
  const seenW = new Set([wordKey(rec.word)]);
  const out = [];
  for (const r of shuffle((all || []).filter((x) => x && x.word && x.meaning), rng)) {
    const w = wordKey(r.word);
    if (!meanKey(r.meaning) || !w || seenW.has(w) || seenM.some((m) => meanClash(m, r.meaning))) continue;
    if (listen && soundAlike(rec.word, r.word)) continue;
    seenM.push(String(r.meaning));
    seenW.add(w);
    out.push({ word: String(r.word), meaning: String(r.meaning) });
    if (out.length >= 3) break;
  }
  return out.length >= 3 ? out : null;
}
/**
 * 🔶 영어 2·3단계 → { id, label, q, choices, lv, sayAfter? | listen?, reveal? } | null (보기를 못 만들면 — 부르는 쪽이 1단계 꼴로)
 *   2 거꾸로: 「뜻」에 맞는 영어는? — 보기 영어 단어 넷 · 답한 뒤 🔊(sayAfter)
 *   3 소리만: 🔊 들리는 말의 뜻은? — 단어 글자는 안 보이고(listen) 답한 뒤에(reveal) · 보기 뜻 넷
 */
export function enLevelQ(rec, all, lv, rng = Math.random) {
  if (!rec || !rec.word || !rec.meaning || lv < 2) return null;
  const others = otherWords(rec, all, rng, lv >= 3);
  if (!others) return null;
  const word = String(rec.word);
  const meaning = String(rec.meaning);
  const label = '🔶 영어 · 영상에서 본 단어';
  if (lv >= 3) {
    const choices = shuffle([{ text: meaning, ok: true }, ...others.map((o) => ({ text: o.meaning, ok: false, hint: `${o.word} = ${o.meaning}` }))], rng);
    return { id: `e:${word}`, label, q: '들리는 말의 뜻은?', listen: word, reveal: `${word} = ${meaning}`, choices, lv: 3 }; // 🔊 단추가 물음 뒤에 붙는다
  }
  const choices = shuffle([{ text: word, ok: true }, ...others.map((o) => ({ text: o.word, ok: false, hint: `${o.word} = ${o.meaning}` }))], rng);
  return { id: `e:${word}`, label, q: `「${meaning}」에 맞는 영어는?`, sayAfter: word, choices, lv: 2 };
}

// ───────────── 📚 국어 ─────────────

/**
 * 📚 국어 2·3단계 → { id, label, q, sentence, choices, lv } | null — 3은 뜻 보고 낱말('word') · 못 만들면 2 빈칸 문장('use' · 예문 ex가 있는 낱말만)
 * 틀린 보기 한 줄 = 그 낱말과 뜻(「낱말: 뜻」)
 */
export function korLevelQ(w, pool, lv, rng = Math.random) {
  if (!w || lv < 2) return null;
  const byId = new Map((pool || []).filter(Boolean).map((x) => [x.id, x]));
  const d = DECKS[w.deck];
  for (const L of lv >= 3 ? [3, 2] : [2]) {
    const kind = L === 3 ? 'word' : 'use';
    if (kind === 'use' && !w.ex) continue;
    const q = makeQuestion(w, kind, pool, rng);
    if (!q || q.kind !== kind) continue;
    const choices = q.opts.map((o) => {
      if (o.ok) return { text: o.t, ok: true };
      const x = byId.get(o.id);
      return { text: o.t, ok: false, hint: x ? `${x.w}: ${x.mean}` : '' };
    });
    return { id: w.id, label: `🔤 ${d ? `${d.icon} ${d.ko}` : '낱말'}`, q: q.prompt, sentence: q.sentence || '', choices, lv: L };
  }
  return null;
}

// ───────────── 🖊️ 논술 ─────────────

/**
 * 🖊️ 논술 2·3단계 → { id: '주제:편', label, q, em?, choices, lv } | null — 원고 nonsul.json의 이유 문장 그대로(검수한 문장만)
 *   3: 「(이 편 의견)」의 이유가 아닌 것 — 내 편 이유 셋 · 반대편 이유 하나(정답) · 내 편이 셋 안 되면 2로
 *   2: 이유 고르기 — 내 편 하나(정답) · 반대편 셋(상관없는 말 없이 — 모두 그럴듯해 편을 따져야) · 반대편이 셋 안 되면 null
 */
export function nsLevelQ(t, side, lv, rng = Math.random) {
  if (!t || lv < 2 || (side !== 'yes' && side !== 'no')) return null;
  const other = side === 'yes' ? 'no' : 'yes';
  const me = t[side];
  const they = t[other];
  if (!me || !they || !Array.isArray(me.reasons) || !Array.isArray(they.reasons)) return null;
  const label = `🖊️ ${t.icon ? `${t.icon} ` : ''}${t.q}`;
  const id = `${t.id}:${side}`;
  if (lv >= 3 && me.reasons.length >= 3 && they.reasons.length >= 1) {
    const choices = shuffle([
      ...shuffle(me.reasons, rng).slice(0, 3).map((x) => ({ text: x, ok: false, hint: `이건 「${me.label}」 쪽 이유가 맞아요 — 반대편 이유를 찾아요` })),
      { text: pick(they.reasons, rng), ok: true },
    ], rng);
    return { id, label, q: `「${me.label}」라는 의견의 이유가 아닌 것은 무엇인가요?`, em: '아닌', choices, lv: 3 };
  }
  if (they.reasons.length >= 3 && me.reasons.length >= 1) {
    const choices = shuffle([
      { text: pick(me.reasons, rng), ok: true },
      ...shuffle(they.reasons, rng).slice(0, 3).map((x) => ({ text: x, ok: false, hint: `그건 「${they.label}」 쪽 이유예요` })),
    ], rng);
    return { id, label, q: `「${me.label}」라는 의견에 알맞은 이유는 무엇인가요?`, choices, lv: 2 };
  }
  return null;
}
