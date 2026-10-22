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
//
// 📍 글에 있나요?(intext, v259 국어 3단계 3-2 — Codex 69차 PART 3 조언대로): 읽은 글 하나(그 글에 ★이 있어야 열림) + 문장 4~6 ·
//   문장마다 "글에 있어요"(그 내용이 나오는 줄까지 고른다) / "글에 없어요"(이 글에서는 확인할 수 없다) · 글은 푸는 동안 내내 보인다
//   있어요 = 줄 번호 + 그 줄의 원문 조각(quote) — 원고 검사가 그 조각이 그 줄에만 있는지 대조한다(띄어쓰기·문장부호는 빼고 견줌 ·
//   그 줄에는 글자 그대로도 있어야 — 화면이 굵게 칠하는 조각)
//   없어요 = 까닭(why) — 글과 어울리지만 어디에도 없는 말 · 글을 그대로 옮긴 문장은 검사가 막는다 · 글이 반대로 말하는 것(수·때·이름만
//   바꾼 것)은 "없는 말"이 아니라 "틀린 말"이라 넣지 않는다 — 이것과 낱말이 많이 겹치는 문장은 사람이 글 전체와 대조한다(겹침은 의심 표시일 뿐)
//   real = 실제로는 맞는 말이지만 이 글에는 없는 문장(아는 것과 글에 있는 것을 가르는 연습)
//
// 🔗 앞뒤 어울리기(agree, v294 — 2026-10-19 아버님 "문장 호응 짧은 퍼즐 가자"): 문장 호응(짜임 놓치기 — 앞뒤가 어울리나)은
//   원고에 연습할 물음이 열 개 남짓이라 한 문장짜리로 넓힌다 · 한 묶음 = 문장 4~6 · 문장마다 앞부분(짝 말 key는 굵게)을 보고 알맞은 끝을 고른다 ·
//   바른 끝(end) 하나 + 어울리지 않는 끝(no) 1~2 — 화면이 섞는다(바른 끝이 늘 같은 자리에 있지 않게) · 확인 뒤 바른 문장(짝 말과 짝 조각 mate를 굵게)과 까닭 ·
//   읽은 글 없이 늘 열린다 · 5-2 「올바른 문장으로 글을 써요」 [6국04-04] — 원고의 호응 물음(K17·K25·K45·K79·K80·K101)과 같은 짝들
//
// ⚖️ 겪은 일·생각 가르기(exp, v295 — 2026-10-19 아버님 고름): 사실·의견 가르기와 같은 꼴(문장마다 두 단추) · 체험한 일을 쓴 문장 4~6을
//   겪은 일(did — 한 일·본 일·들은 일) / 생각·느낌(felt — 느낀 마음·생각·바람·다짐)으로 · 5-1 「체험한 일을 써요」 [6국03-03] — 원고의 K20·K67·K87 물음과 같은 가르기 ·
//   오늘의 판에서는 사실·의견과 한 칸(가르기)을 번갈아 쓴다 — 새 퍼즐은 오래 안 한 꼴부터(SLOT_OF · 판은 그대로 넷) · 늘 열린다
//
// ⏰ 일어난 차례(time, v297 — 2026-10-19 아버님 "1부터"): 잘못 읽기 '때 헷갈리기'(다른 때의 일을 끌어옴)를 따로 연습 — 🧩 차례 맞추기는
//   글 차례와 일어난 차례가 늘 같다 · 한 묶음 = 짧은 글(일기·이야기·기사·편지) 4~5조각 · 조각은 원고에 **일어난 차례로** 적고(chunks),
//   글에 쓰인 차례는 told(조각 번호 — 일어난 차례와 달라야) · 화면은 글을 쓰인 차례 그대로 보여 주고 카드도 그 차례로 놓는다 →
//   일어난 차례로 다시 놓는다 · 조각마다 때 말(keys — 그 조각에 꼭 한 번, 굵게) · need는 차례 맞추기와 같고 실마리는 두 조각 가운데 하나의 때 말 ·
//   한 조각엔 한 때만 — "~하기로 했다"·"~하려고 한다"처럼 정한 때와 할 때가 섞이는 꼴은 원고 검사가 막는다 ·
//   오늘의 판에서는 차례 칸을 🧩 차례 맞추기와 번갈아 쓴다(SLOT_OF · 판은 그대로 넷) · 늘 열린다
import { dayNum, throwsOf, pendingOf, KOR_STONE, circled } from './korean.js';
import { stateOf, wordsOf, wordDaysOf, wordsToday } from './korwords.js';

export const PUZZLE_COINS = 10;
export const PUZZLE_PERFECT_MIN = 3;
/** 한 판 — 차례 맞추기 하나 + 글에 있나요 하나 + 사실·의견 한 묶음 + 앞뒤 어울리기 한 묶음 (v294 · v259 — 그 전에는 차례 둘 + 사실·의견 하나) */
export const ORDER_PER_DAY = 1;
export const INTEXT_PER_DAY = 1;
export const SORT_PER_DAY = 1;
export const AGREE_PER_DAY = 1;
export const PUZZLES_PER_DAY = ORDER_PER_DAY + INTEXT_PER_DAY + SORT_PER_DAY + AGREE_PER_DAY;
/** 🆕 하루 판에 넣는 처음 보는 꼴의 수 (v315 — planPuzzles) */
export const FRESH_KIND_PER_DAY = 1;

// ── 🧩 오늘의 퍼즐 판 기록 (v315, 📤 국어 요약에만 — 아이 화면엔 안 보임) ──
// 새 퍼즐 꼴을 더한 뒤 판을 끝낸 날이 끊겼는데, 판을 열었다 그만둔 것인지 안 연 것인지 기록으로 가를 수 없었다 →
// 하루 기록(daily)에 판을 시작한 것 · 끝낸 것 · 그만둔 자리(몇째 퍼즐 · 어느 꼴)를 판마다(이름표 = 판을 시작한 시각 — 같은 판은 한 번) · 연습 판은 안 센다
/** 하루 기록 목록 칸 (db.DAILY_LISTS) — 시작 "시각" · 끝냄 "시각" · 그만둠 "시각:몇째:꼴" */
export const PUZZLE_DAY_LISTS = ['korPzStarts', 'korPzDone', 'korPzQuits'];
/** 그만둔 자리 한 칸 */
export function quitKey(t0, n, kind) {
  return `${t0}:${n}:${kind}`;
}
/**
 * 판 기록 모으기 (순수) — days = 하루 기록 여럿 → { start, done, quit, left, quitAt: [['1째 ⏰', 2], …] }
 * · 끝낸 판은 그만둠에서 뺀다(같은 판을 두 창에서 — 한쪽은 끝냄) · left = 시작했지만 끝난 기록(끝냄·그만둠)이 없는 판 —
 *   지금 풀고 있는 판·다른 화면으로 가 둔 판·앱을 닫은 판·끝냄 기록 저장 실패가 다 든다(까닭을 단정하지 않는다, 🔍 Codex 121차 #1) ·
 * · 받은 날들 안의 일을 따로 센다 — 경계를 넘긴 판은 시작이나 끝냄 한쪽만 들 수 있다
 */
export function puzzleSessions(days) {
  const starts = new Set();
  const done = new Set();
  const quits = new Map();
  for (const d of Array.isArray(days) ? days : []) {
    if (!d) continue;
    for (const k of Array.isArray(d.korPzStarts) ? d.korPzStarts : []) starts.add(String(k));
    for (const k of Array.isArray(d.korPzDone) ? d.korPzDone : []) done.add(String(k));
    for (const q of Array.isArray(d.korPzQuits) ? d.korPzQuits : []) {
      const m = /^(\d+):(\d+):([a-z]+)$/.exec(String(q));
      if (m && !quits.has(m[1])) quits.set(m[1], { n: Number(m[2]), kind: m[3] });
    }
  }
  const quit = [...quits.entries()].filter(([k]) => !done.has(k));
  const at = new Map();
  for (const [, q] of quit) {
    const label = `${q.n}째 ${(KINDS[q.kind] || {}).icon || q.kind}`;
    at.set(label, (at.get(label) || 0) + 1);
  }
  return {
    start: starts.size, done: done.size, quit: quit.length,
    left: [...starts].filter((k) => !done.has(k) && !quits.has(k)).length,
    quitAt: [...at.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)),
  };
}
export const CHUNKS_MIN = 3;
export const CHUNKS_MAX = 5;
export const SORT_MIN = 4;
export const SORT_MAX = 6;
export const INTEXT_MIN = 4;
export const INTEXT_MAX = 6;
/** 있어요 문장의 원문 조각 — 띄어쓰기·문장부호를 뺀 글자 수 */
export const QUOTE_MIN = 4;
export const AGREE_MIN = 4;
export const AGREE_MAX = 6;
/** 어울리지 않는 끝은 1~2개 (보기는 2~3개) */
export const AGREE_NO_MAX = 2;
/** ⏰ 일어난 차례 — 한 묶음 4~5조각 · 글의 갈래 */
export const TIME_MIN = 4;
export const TIME_MAX = CHUNKS_MAX;
export const TIME_FORMS = ['일기', '이야기', '기사', '편지'];
/** ⏰ 조각에 넣지 않는 꼴 — 정한 때와 할 때가 섞임("~하기로 했다"·"~하려고 한다"·"~하기로/~하려고 마음먹었다·결심했다") · 물음 · 큰따옴표(옮긴 말은 말한 때와 그 일의 때가 갈린다) ·
 *  목적을 말하는 "~려고 문을 닫았다"는 한 때라 막지 않는다 (Codex 103차) */
export const TIME_BANNED = /기로 (?:했|하였|정했|약속|마음먹|결심)|려고 (?:한다|했|해요|합니다|하였|마음먹|결심)|\?|["“”]/;
/** 🔗 짝의 갈래 — 확인 뒤 "짝" 줄 · 검수 페이지 */
export const AGREE_TYPES = {
  neg: "'결코·전혀·별로·도무지'와 '~지 않다'",
  time: '때를 나타내는 말과 끝',
  honor: "'께서'와 높이는 끝",
  thing: '음료·값은 높이지 않아요', // 간접 높임이 있어 "사람만"으로 넓히지 않는다 (Codex 100차)
  must: "'반드시'와 '~해야 한다'",
  guess: "'아마'와 짐작하는 끝",
  like: "'마치'와 '~ 같다·~처럼'",
  because: "'왜냐하면·까닭은'과 '~ 때문이다'",
  subj: '주어와 서술어',
  obj: '목적어와 서술어',
};
/** 다 맞힌 퍼즐(⭐)의 칸 */
export const SOLVED = 1;
/** 차례의 뜻 — 물음마다 하나 */
export const ASKS = {
  event: { icon: '🧩', ko: '이야기 흐름', prompt: '일이 일어난 차례대로 놓아 보세요.' },
  process: { icon: '🧩', ko: '하는 차례', prompt: '하는 차례대로 놓아 보세요.' },
};
export const FO = { fact: '사실', opinion: '의견' };
/** ⚖️ 겪은 일·생각 가르기의 두 단추 (v295) */
export const EF = { did: '겪은 일', felt: '생각·느낌' };
export const IO = { in: '글에 있어요', out: '글에 없어요' };
export const KINDS = { order: { icon: '🧩', ko: '차례 맞추기' }, sort: { icon: '⚖️', ko: '사실·의견 가르기' }, intext: { icon: '📍', ko: '글에 있나요?' }, agree: { icon: '🔗', ko: '앞뒤 어울리기' }, exp: { icon: '⚖️', ko: '겪은 일·생각 가르기' }, time: { icon: '⏰', ko: '일어난 차례' } };
/** 🧩 탭·📤 요약에 늘어놓는 차례 (새 꼴은 끝에) */
export const KIND_LIST = ['order', 'sort', 'intext', 'agree', 'exp', 'time'];
/** 한 판 안에서 내는 차례 — 같은 꼴이 붙지 않게 돌아가며 */
export const PLAY_ORDER = ['order', 'intext', 'sort', 'agree'];
/** 판의 한 칸을 나눠 쓰는 꼴 — 겪은 일·생각은 사실·의견 칸(가르기)에서 · 일어난 차례는 차례 맞추기 칸에서 번갈아 (v295 · v297 · 없는 꼴은 제 이름이 칸) */
export const SLOT_OF = { exp: 'sort', time: 'order' };
// ★ 사실·의견 라벨은 사람이 정한다 — 아래 두 정규식은 원고를 거르는 망일 뿐 판정기가 아니다(한국어는 활용형이 많아
//   넓히면 사실 문장을 잡고 좁히면 놓친다 — Codex 55차: "최고 기온"을 잡고 "아름다운"·"만들어야 해요"·"~다고 말했다"·"~듯하다"를 놓쳤다)
/** 생각 말 — 의견에는 하나 이상, 사실에는 없어야 한다 */
export const OPINION_WORDS = /좋|재미|멋|맛있|예쁘|훌륭|최고(?:다|의|예)|싫|아름다|야 (?:한다|해|합)|즐겁|즐거|신나|귀엽|편하|낫다|지루/;
/** 가르기 문장에 넣지 않는 꼴 — 옮긴 말 · 앞날 짐작 · 섞인 마음 · 물음 · 따옴표 */
export const SORT_BANNED = /드디어|라고 |다고 한다|다고 했|다고 말|겠다|것 같다|듯하|듯 하|["'「『“‘]|\?/;
// ★ 겪은 일·생각 라벨도 사람이 정한다 — 아래 정규식은 거르는 망 (v295 · Codex 101차: "신기"는 '신을 신기'와 겹쳐 꼴을 좁히고 "좋다·좋아"를 더함)
/** 마음 말 — 생각·느낌 문장에는 하나 이상, 겪은 일 문장에는 없어야 한다("재미있게 놀았다"처럼 섞인 문장이 나가지 않게) */
export const FELT_WORDS = /재미|즐거|즐겁|신기했|신기한|신기하|신기해|신나|신이 나|뿌듯|기뻤|기쁘|기뻐|슬펐|슬프|무서|무섭|떨렸|떨리|설레|설렜|아쉬|좋았|좋다|좋아|고마|싶다|싶었|싶어|생각했|생각이 들|느꼈|놀랐|부끄|자랑스|행복|걱정|궁금|마음먹|야겠|속상|긴장|두근|기억에 남|것 같|것처럼|멋|감동|미안|섭섭|외로|답답|화가 났/;
/** 겪은 일·생각 문장에 넣지 않는 꼴 — 옮긴 말(따옴표) · 물음 · 마음이 섞인 "드디어" */
export const EXP_BANNED = /드디어|["'「『“‘]|\?/;
const ID_RE = { order: /^O\d{1,3}$/, sort: /^F\d{1,3}$/, intext: /^I\d{1,3}$/, agree: /^H\d{1,3}$/, exp: /^E\d{1,3}$/, time: /^T\d{1,3}$/ };
const ID_HEAD = { order: 'O', sort: 'F', intext: 'I', agree: 'H', exp: 'E', time: 'T' };
const LEN_MAX = 90;
const WHY_MAX = 120;

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
  const cardMap = Array.isArray(cards) ? new Map(cards.filter(isObj).map((c) => [c.id, c])) : null;
  list.forEach((p, i) => {
    const at = (m) => errs.push(`puzzles[${i}] ${p && p.id ? p.id : ''}: ${m}`);
    if (!isObj(p)) { at('퍼즐이 객체가 아니에요'); return; }
    if (!own(KINDS, p.kind)) { at('kind는 order · sort · intext · agree · exp · time'); return; }
    if (typeof p.id !== 'string' || !ID_RE[p.kind].test(p.id)) at(`id는 ${ID_HEAD[p.kind]}숫자`);
    else if (ids.has(p.id)) at('id가 겹쳐요');
    else ids.add(p.id);
    if (p.kind === 'order') checkOrder(p, at, cardIds);
    else if (p.kind === 'intext') checkIntext(p, at, cardMap);
    else if (p.kind === 'agree') checkAgree(p, at);
    else if (p.kind === 'exp') checkExp(p, at);
    else if (p.kind === 'time') checkTime(p, at);
    else checkSort(p, at);
  });
  return errs;
}

/** 견줄 때 쓰는 꼴 — 띄어쓰기·문장부호·따옴표를 뺀다(글자는 그대로) · 수의 소수점(3.5)과 수 앞 빼기표(-3)는 뜻이 바뀌므로 남긴다(Codex 70차) */
export function normText(s) {
  const digit = (ch) => ch >= '0' && ch <= '9';
  return String(s == null ? '' : s).normalize('NFC').replace(/[\s.,!?'"“”‘’「」『』()[\]…·~\-—–:;]/g, (ch, at, all) => (
    (ch === '.' && digit(all[at - 1] || '') && digit(all[at + 1] || '')) || (ch === '-' && digit(all[at + 1] || '')) ? ch : ''));
}
/** 두 글의 겹침 0~1 — 두 글자씩 묶어 견준다(Dice) · 검수 페이지의 의심 표시용(판정이 아니다) */
export function overlapScore(a, b) {
  const grams = (s) => { const t = normText(s); const out = []; for (let i = 0; i + 1 < t.length; i++) out.push(t.slice(i, i + 2)); return out; };
  const x = grams(a);
  const y = grams(b);
  if (!x.length || !y.length) return 0;
  const left = new Map();
  for (const g of y) left.set(g, (left.get(g) || 0) + 1);
  let both = 0;
  for (const g of x) { const k = left.get(g) || 0; if (k > 0) { both++; left.set(g, k - 1); } }
  return (2 * both) / (x.length + y.length);
}
/** 문장과 가장 많이 겹치는 줄 { n 줄 번호(1부터), score } (검수 페이지) */
export function bestOverlap(t, lines) {
  let best = { n: 0, score: 0 };
  (Array.isArray(lines) ? lines : []).forEach((line, i) => { const s = overlapScore(t, line); if (s > best.score) best = { n: i + 1, score: s }; });
  return best;
}

/** 📍 글에 있나요? 검사 — 글 카드는 줄로 된 글(lines)이고 🎧 듣기 글이 아니어야 · 있어요는 줄 + 그 줄에만 있는 원문 조각 · 없어요는 까닭 */
function checkIntext(p, at, cardMap) {
  if (typeof p.card !== 'string' || !/^K\d{1,3}$/.test(p.card)) { at('card는 K숫자'); return; }
  if (!cardMap) { at('글에 있나요는 글 카드와 함께 검사해요'); return; }
  const c = cardMap.get(p.card);
  if (!c) { at(`없는 카드 ${p.card}`); return; }
  if (!Array.isArray(c.lines) || !c.lines.length || c.listen) { at(`${p.card}는 줄로 된 읽기 글이 아니에요(시·🎧 듣기 글은 안 돼요)`); return; }
  const lines = c.lines.map(normText);
  const ss = p.sents;
  if (!Array.isArray(ss) || ss.length < INTEXT_MIN || ss.length > INTEXT_MAX) { at(`sents는 ${INTEXT_MIN}~${INTEXT_MAX}개`); return; }
  const seen = new Set();
  ss.forEach((s, k) => {
    const sat = (m) => at(`문장 ${k + 1} ${m}`);
    if (!isObj(s) || !nonEmpty(s.t)) { sat('글이 비었어요'); return; }
    if (seen.has(normText(s.t))) sat('앞 문장과 같아요');
    seen.add(normText(s.t));
    if ([...s.t].length > LEN_MAX) sat(`${LEN_MAX}자까지`);
    if (/\?/.test(s.t)) sat('물음은 안 돼요 — 글에 있는지 가릴 수 있는 문장으로');
    if (!own(IO, s.io)) { sat('io는 in 또는 out'); return; }
    if (s.real !== undefined && !(s.io === 'out' && s.real === true)) sat('real(실제로는 맞는 말)은 없어요 문장에만 true로');
    if (s.io === 'in') {
      if (s.why !== undefined) sat('있어요 문장은 why 없이 — 줄과 원문 조각으로 보여 줘요');
      if (!Number.isInteger(s.line) || s.line < 1 || s.line > lines.length) { sat(`line은 1~${lines.length}`); return; }
      const q = normText(s.quote);
      if (!nonEmpty(s.quote) || [...q].length < QUOTE_MIN) { sat(`quote(원문 조각)는 띄어쓰기·문장부호 빼고 ${QUOTE_MIN}글자 이상`); return; }
      if (!lines[s.line - 1].includes(q)) sat(`quote "${s.quote}"가 ${s.line}번 줄에 없어요`);
      else if (!String(c.lines[s.line - 1]).includes(s.quote)) sat(`quote "${s.quote}"는 ${s.line}번 줄과 글자 그대로 같게 — 띄어쓰기·문장부호까지(화면에서 그 조각을 굵게 칠해요)`);
      const elsewhere = lines.map((l, i) => i + 1).filter((n) => n !== s.line && lines[n - 1].includes(q));
      if (elsewhere.length) sat(`quote "${s.quote}"가 다른 줄(${elsewhere.join(', ')})에도 있어요 — 줄 답이 하나뿐이게`);
    } else {
      if (s.line !== undefined || s.quote !== undefined) sat('없어요 문장에는 line·quote를 쓰지 않아요');
      if (!nonEmpty(s.why)) sat('why(까닭)가 비었어요');
      else if ([...s.why].length > WHY_MAX) sat(`why는 ${WHY_MAX}자까지`);
      const t = normText(s.t);
      if (lines.some((l) => l.includes(t) || t.includes(l))) sat('없어요 문장이 글을 그대로 옮겼어요');
    }
  });
  if (!ss.some((s) => s && s.io === 'in') || !ss.some((s) => s && s.io === 'out')) at('있어요와 없어요가 하나 이상씩 있어야 해요');
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
  checkNeed(ch, p.need, at);
}
/** need 검사 (차례 맞추기·일어난 차례) — [앞, 뒤, 실마리, 까닭] 꼴 · 실마리는 두 조각 가운데 하나에 · 모든 차례를 넣어 보아 원고 차례 하나뿐 · 꼴이 맞으면 true */
function checkNeed(ch, need, at) {
  if (!Array.isArray(need) || !need.length) { at('need(앞뒤 실마리)가 비었어요'); return false; }
  let shapeOk = true;
  need.forEach((r, k) => {
    const okShape = Array.isArray(r) && r.length === 4 && Number.isInteger(r[0]) && Number.isInteger(r[1]) && r[0] >= 0 && r[1] >= 0 && r[0] < ch.length && r[1] < ch.length && r[0] !== r[1] && nonEmpty(r[2]) && nonEmpty(r[3]);
    if (!okShape) { at(`need ${k + 1}은 [앞 번호, 뒤 번호, 실마리 말, 까닭]`); shapeOk = false; return; }
    if (!ch[r[0]].includes(r[2]) && !ch[r[1]].includes(r[2])) at(`need ${k + 1}의 실마리 "${r[2]}"가 두 조각에 없어요`);
  });
  if (!shapeOk) return false;
  const vs = validOrders(ch.length, need);
  const ident = ch.map((_, i) => i).join(',');
  if (vs.length !== 1) at(`실마리에 맞는 차례가 ${vs.length}가지예요 — 하나뿐이어야 해요`);
  else if (vs[0].join(',') !== ident) at('실마리에 맞는 차례가 원고 차례와 달라요');
  return true;
}
/** ⏰ 일어난 차례 검사 — 조각 4~5(일어난 차례) · told는 조각 번호를 한 번씩, 일어난 차례와 달라야 · 때 말은 조각마다 꼭 한 번 ·
 *  실마리는 두 조각 가운데 하나의 때 말 · 한 조각엔 한 때만(정한 때와 할 때가 섞이는 꼴·물음·큰따옴표 없음) · 차례가 하나뿐인지는 need로 */
function checkTime(p, at) {
  if (!nonEmpty(p.title)) at('title이 비었어요');
  else if (/[「」『』]/.test(p.title)) at('title에 낫표를 쓰지 않아요 — 화면이 감싸요');
  if (!nonEmpty(p.icon)) at('icon이 비었어요');
  if (!TIME_FORMS.includes(p.form)) at(`form은 ${TIME_FORMS.join(' · ')}`);
  const ch = p.chunks;
  if (!Array.isArray(ch) || ch.length < TIME_MIN || ch.length > TIME_MAX || !ch.every(nonEmpty)) { at(`chunks는 ${TIME_MIN}~${TIME_MAX}개의 글`); return; }
  if (new Set(ch.map((t) => normText(t))).size !== ch.length) at('같은 조각이 있어요');
  ch.forEach((t, k) => {
    if ([...t].length > LEN_MAX) at(`조각 ${k + 1}은 ${LEN_MAX}자까지`);
    if (t !== t.trim()) at(`조각 ${k + 1} 앞뒤에 빈칸이 있어요`);
    if (TIME_BANNED.test(t)) at(`조각 ${k + 1}에 정한 때와 할 때가 섞이는 꼴("~하기로 했다"·"~하려고 한다")·물음·큰따옴표가 있어요 — 한 조각엔 한 때만`);
  });
  const told = p.told;
  const n = ch.length;
  const toldOk = Array.isArray(told) && told.length === n && told.every((x) => Number.isInteger(x) && x >= 0 && x < n) && new Set(told).size === n;
  if (!toldOk) at(`told는 0~${n - 1}을 한 번씩 — 글에 쓰인 차례`);
  else if (told.every((x, i) => x === i)) at('told가 일어난 차례와 같아요 — 글 차례와 일어난 차례가 다른 글이어야 해요');
  const keys = p.keys;
  if (!Array.isArray(keys) || keys.length !== n || !keys.every(nonEmpty)) { at(`keys는 조각마다 때 말 하나(${n}개)`); return; }
  keys.forEach((w, k) => {
    if (ch[k].split(w).length !== 2) at(`때 말 "${w}"가 조각 ${k + 1}에 꼭 한 번 있어야 해요`);
    ch.forEach((t, j) => { if (j !== k && t.includes(w)) at(`조각 ${k + 1}의 때 말 "${w}"가 조각 ${j + 1}에도 있어요 — 굵은 말이 조각마다 하나이게`); });
  });
  if (new Set(keys).size !== n) at('때 말이 서로 같아요');
  if (!checkNeed(ch, p.need, at)) return;
  p.need.forEach((r, k) => {
    if (r[2] !== keys[r[0]] && r[2] !== keys[r[1]]) at(`need ${k + 1}의 실마리 "${r[2]}"는 두 조각 가운데 하나의 때 말이어야 해요(굵게 보이는 말)`);
    if ([...r[3]].length > WHY_MAX) at(`need ${k + 1}의 까닭은 ${WHY_MAX}자까지`);
  });
}
/** 🔗 앞뒤 어울리기 검사 — 문장마다 앞부분(짝 말이 꼭 한 번) · 바른 끝 하나 · 어울리지 않는 끝 1~2(서로·바른 끝과 다르게) ·
 *  짝 조각(mate)은 바른 끝에만 · 끝에는 문장부호 없이(화면이 마침표를 붙인다) · 바른 끝이 하나뿐인지는 사람이 검수 페이지로 */
function checkAgree(p, at) {
  if (!nonEmpty(p.topic)) at('topic이 비었어요');
  if (!nonEmpty(p.icon)) at('icon이 비었어요');
  const its = p.items;
  if (!Array.isArray(its) || its.length < AGREE_MIN || its.length > AGREE_MAX) { at(`items는 ${AGREE_MIN}~${AGREE_MAX}개`); return; }
  const seen = new Set();
  its.forEach((x, k) => {
    const sat = (m) => at(`문장 ${k + 1} ${m}`);
    if (!isObj(x) || !nonEmpty(x.pre) || !nonEmpty(x.key) || !nonEmpty(x.end)) { sat('pre·key·end가 있어야 해요'); return; }
    if (seen.has(normText(x.pre))) sat('앞 문장과 앞부분이 같아요');
    seen.add(normText(x.pre));
    if (x.pre !== x.pre.trim() || x.end !== x.end.trim()) sat('pre·end 앞뒤에 빈칸이 있어요');
    if (x.pre.split(x.key).length !== 2) sat(`짝 말 "${x.key}"가 앞부분에 꼭 한 번 있어야 해요`);
    const no = x.no;
    if (!Array.isArray(no) || no.length < 1 || no.length > AGREE_NO_MAX || !no.every(nonEmpty)) { sat(`no(어울리지 않는 끝)는 1~${AGREE_NO_MAX}개의 글`); return; }
    const ends = [x.end, ...no];
    if (new Set(ends.map((e) => normText(e))).size !== ends.length) sat('끝이 서로 같아요');
    if (ends.some((e) => /[.!?。]$/.test(e.trim()))) sat('끝에는 문장부호를 쓰지 않아요 — 화면이 마침표를 붙여요');
    if (/\?/.test(x.pre) || ends.some((e) => /\?/.test(e))) sat('물음은 안 돼요');
    if (x.mate !== undefined) {
      if (!nonEmpty(x.mate)) sat('mate가 비었어요');
      else if (!x.end.includes(x.mate)) sat(`짝 조각 "${x.mate}"가 바른 끝에 없어요`);
      else if (no.some((e) => e.includes(x.mate))) sat(`짝 조각 "${x.mate}"가 어울리지 않는 끝에도 있어요`);
    }
    if (!own(AGREE_TYPES, x.type)) sat(`type은 ${Object.keys(AGREE_TYPES).join(' · ')}`);
    if (!nonEmpty(x.why)) sat('why(까닭)가 비었어요');
    else if ([...x.why].length > WHY_MAX) sat(`why는 ${WHY_MAX}자까지`);
    if (Math.max(...ends.map((e) => [...`${x.pre} ${e}.`].length)) > LEN_MAX) sat(`문장은 ${LEN_MAX}자까지`);
  });
}
/** ⚖️ 겪은 일·생각 가르기 검사 — 한 묶음 = 체험한 일 문장 4~6 · 겪은 일과 생각·느낌이 하나 이상씩 · 마음 말은 생각·느낌에만 */
function checkExp(p, at) {
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
    if (!own(EF, s.ef)) sat('ef는 did 또는 felt');
    if (!nonEmpty(s.why)) sat('why(까닭)가 비었어요');
    else if ([...s.why].length > WHY_MAX) sat(`why는 ${WHY_MAX}자까지`);
    if ([...s.t].length > LEN_MAX) sat(`${LEN_MAX}자까지`);
    if (EXP_BANNED.test(s.t)) sat('옮긴 말(따옴표)·물음·"드디어"는 이 퍼즐에서는 쓰지 않아요');
    if (s.ef === 'did' && FELT_WORDS.test(s.t)) sat('겪은 일 문장에 마음 말(신기·무서·싶다·것 같다 …)이 있어요');
    if (s.ef === 'felt' && !FELT_WORDS.test(s.t)) sat('생각·느낌 문장에 마음 말이 없어요 — 느낀 마음이나 생각이 드러나게');
  });
  if (!ss.some((s) => s && s.ef === 'did') || !ss.some((s) => s && s.ef === 'felt')) at('겪은 일과 생각·느낌이 하나 이상씩 있어야 해요');
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

/** 쓸 수 있는 퍼즐 — 깨진 것은 빼고, 이야기 흐름에는 글 제목을 붙인다 · 📍 글에 있나요는 글 줄까지 함께(카드가 없으면 뺀다) */
export function allPuzzles(data, cards) {
  const list = Array.isArray(cards) ? cards.filter(isObj) : [];
  const byId = new Map(list.map((c) => [c.id, c]));
  const out = [];
  const seen = new Set();
  for (const p of (data && Array.isArray(data.puzzles) ? data.puzzles : [])) {
    const errs = [];
    if (!isObj(p) || !own(KINDS, p.kind) || typeof p.id !== 'string' || !ID_RE[p.kind].test(p.id) || seen.has(p.id)) continue;
    if (p.kind === 'order') checkOrder(p, (m) => errs.push(m), cards ? new Set(byId.keys()) : null);
    else if (p.kind === 'intext') checkIntext(p, (m) => errs.push(m), Array.isArray(cards) ? byId : null);
    else if (p.kind === 'agree') checkAgree(p, (m) => errs.push(m));
    else if (p.kind === 'exp') checkExp(p, (m) => errs.push(m));
    else if (p.kind === 'time') checkTime(p, (m) => errs.push(m));
    else checkSort(p, (m) => errs.push(m));
    if (errs.length) continue;
    seen.add(p.id);
    if (p.kind === 'order') {
      const c = p.card ? byId.get(p.card) : null;
      out.push({ id: p.id, kind: 'order', ask: p.ask, title: p.title, card: p.card || '', cardTitle: c ? c.title : '', icon: c ? c.icon : '🧩', chunks: p.chunks.slice(), need: p.need.map((r) => r.slice()) });
    } else if (p.kind === 'intext') {
      const c = byId.get(p.card);
      out.push({
        id: p.id, kind: 'intext', card: p.card, title: c.title, cardTitle: c.title, icon: c.icon || '📍', lines: c.lines.slice(),
        sents: p.sents.map((s) => (s.io === 'in' ? { t: s.t, io: 'in', line: s.line, quote: s.quote } : { t: s.t, io: 'out', why: s.why, real: s.real === true })),
      });
    } else if (p.kind === 'agree') {
      // choices[0]이 바른 끝 — 화면은 dealChoices로 섞어 놓는다
      out.push({ id: p.id, kind: 'agree', title: p.topic, icon: p.icon, items: p.items.map((x) => ({ pre: x.pre, key: x.key, choices: [x.end, ...x.no], mate: x.mate || '', type: x.type, why: x.why })) });
    } else if (p.kind === 'exp') {
      out.push({ id: p.id, kind: 'exp', title: p.topic, icon: p.icon, sents: p.sents.map((s) => ({ t: s.t, ef: s.ef, why: s.why })) });
    } else if (p.kind === 'time') {
      // chunks는 일어난 차례(채점은 차례 맞추기와 같은 gradeOrder) · told = 글에 쓰인 차례(화면이 글과 처음 카드를 이 차례로)
      out.push({ id: p.id, kind: 'time', title: p.title, icon: p.icon, form: p.form, chunks: p.chunks.slice(), told: p.told.slice(), keys: p.keys.slice(), need: p.need.map((r) => r.slice()) });
    } else {
      out.push({ id: p.id, kind: 'sort', title: p.topic, icon: p.icon, sents: p.sents.map((s) => ({ t: s.t, fo: s.fo, why: s.why })) });
    }
  }
  return out;
}

/** 열린 퍼즐인가 — 이야기 흐름·글에 있나요는 그 글에 ★이 있어야(읽은 글로 푼다) */
export function isOpen(p, korDone) {
  if (!p) return false;
  if (p.kind === 'intext') return !!p.card && own(korDone, `${p.card}:1`);
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
 *   차례 ORDER_PER_DAY + 글에 있나요 INTEXT_PER_DAY + 가르기 SORT_PER_DAY + 앞뒤 어울리기 AGREE_PER_DAY, 한 칸이 모자라면 다른 칸으로 채운다 ·
 *   가르기 칸은 사실·의견과 겪은 일·생각이, 차례 칸은 차례 맞추기와 일어난 차례가 나눠 쓴다(SLOT_OF) — 새 퍼즐은 마지막으로 푼 때가 오래된 꼴부터(같으면 원고 차례) → 번갈아 나온다 ·
 *   🆕 처음 보는 꼴(그 꼴의 퍼즐을 하나도 안 푼 꼴)은 하루 판에 한 꼴만 · 판 맨 뒤에 (v315 — FRESH_KIND_PER_DAY) ·
 *   practice면 ⭐ 퍼즐을 연습으로(오래 안 본 것부터)
 */
export function planPuzzles(list, states, korDone, now, practice = false) {
  const today = dayNum(now);
  const st = wordsOf(states);
  const open = (list || []).filter((p) => isOpen(p, korDone));
  const want = { order: ORDER_PER_DAY, intext: INTEXT_PER_DAY, sort: SORT_PER_DAY, agree: AGREE_PER_DAY };
  const total = PUZZLES_PER_DAY;
  const slotOf = (p) => SLOT_OF[p.kind] || p.kind;
  const last = {};
  for (const p of list || []) if (own(st, p.id)) last[p.kind] = Math.max(last[p.kind] || 0, st[p.id].at);
  let pool;
  if (practice) {
    pool = open.filter((p) => own(st, p.id) && st[p.id].box >= SOLVED).sort((a, b) => st[a.id].at - st[b.id].at);
  } else {
    const due = open.filter((p) => own(st, p.id) && st[p.id].box < SOLVED && st[p.id].due <= today).sort((a, b) => st[a.id].due - st[b.id].due);
    const fresh = open.filter((p) => !own(st, p.id));
    pool = [...due, ...fresh];
  }
  // 🆕 처음 보는 꼴은 하루 한 꼴만, 판 맨 뒤에 (v315, 2026-10-22 아버님 "이대로 진행") — 퍼즐 꼴 셋을 한꺼번에 더했더니(v294~v297)
  //   "오래 안 한 꼴부터" 규칙 때문에 판 넷 중 셋이 처음 보는 꼴(맨 앞부터)이 됐고, 그날부터 판을 한 번도 끝내지 않았다(그만두면 저장이 안 돼 다음 날도 같은 판).
  //   익숙한 꼴로 판을 채우고 처음 보는 꼴은 원고 꼴 차례(KIND_LIST)로 하루 하나씩 — 한 번 해 본 꼴은 예전처럼 번갈아 나온다 ·
  //   아무 꼴도 안 풀었으면(처음 쓰는 기기) 예전 그대로 · 연습은 ⭐ 퍼즐뿐이라 상관없다
  const tried = new Set((list || []).filter((p) => own(st, p.id)).map((p) => p.kind));
  const unfamiliar = (p) => !practice && tried.size > 0 && !tried.has(p.kind);
  const newKinds = KIND_LIST.filter((k) => pool.some((p) => p.kind === k && unfamiliar(p))).slice(0, FRESH_KIND_PER_DAY);
  const novel = pool.filter((p) => unfamiliar(p) && newKinds.includes(p.kind));
  const base = pool.filter((p) => !unfamiliar(p));
  const take = [];
  const inSlot = (slot) => {
    const c = base.filter((p) => slotOf(p) === slot);
    if (practice) return c;
    const fresh = c.filter((p) => !own(st, p.id)).map((p, i) => [p, i]).sort((a, b) => (last[a[0].kind] || 0) - (last[b[0].kind] || 0) || a[1] - b[1]).map(([p]) => p);
    return [...c.filter((p) => own(st, p.id)), ...fresh];
  };
  const tail = newKinds.map((k) => novel.find((p) => p.kind === k)); // 처음 보는 꼴마다 첫 퍼즐 — 그 칸에서 하나를 대신한다
  for (const slot of PLAY_ORDER) take.push(...inSlot(slot).slice(0, Math.max(0, want[slot] - tail.filter((p) => slotOf(p) === slot).length)));
  for (const p of base) { if (take.length + tail.length >= total) break; if (!take.includes(p)) take.push(p); }
  // 익숙한 것이 모자라면 같은 새 꼴로 채운다 (하루에 처음 보는 꼴의 수는 그대로)
  for (const p of novel) { if (take.length + tail.length >= total) break; if (!tail.includes(p)) tail.push(p); }
  // 판 안 차례: 차례 맞추기 → 글에 있나요 → 가르기 → 앞뒤 어울리기 → … 돌아가며 (같은 칸이 붙지 않게) · 처음 보는 꼴은 맨 뒤
  const queues = PLAY_ORDER.map((slot) => take.filter((p) => slotOf(p) === slot));
  const out = [];
  while (queues.some((q) => q.length)) for (const q of queues) if (q.length) out.push(q.shift());
  return [...out, ...tail].slice(0, total).map((p) => ({ id: p.id, kind: p.kind }));
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
/** 🧩 낸 차례 채점 (⏰ 일어난 차례도) — picked = 놓은 조각 번호(원고 번호) 차례 · 빈 칸·겹침·모르는 번호가 있으면 valid false */
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
/** ⚖️ 낸 가르기 채점 — labels = 문장마다 글자(사실·의견 'fact' | 'opinion' · 겪은 일·생각 'did' | 'felt') · 빈 칸·다른 값이 있으면 valid false */
export function gradeSort(p, labels) {
  const exp = !!p && p.kind === 'exp';
  const keys = exp ? EF : FO;
  const n = p && Array.isArray(p.sents) ? p.sents.length : 0;
  const arr = Array.isArray(labels) ? labels : [];
  let valid = n > 0 && arr.length === n;
  for (let i = 0; valid && i < n; i++) valid = typeof arr[i] === 'string' && own(keys, arr[i]);
  if (!valid) return { valid: false, ok: false, right: 0, n };
  let right = 0;
  for (let i = 0; i < n; i++) if (arr[i] === (exp ? p.sents[i].ef : p.sents[i].fo)) right++;
  return { valid: true, ok: right === n, right, n };
}
/**
 * 📍 낸 답 채점 — picks = 문장마다 { io: 'in', line: 줄 번호 } | { io: 'out' } · 빈 칸·줄 없는 있어요·다른 값이 있으면 valid false ·
 *   있어요 문장은 있어요 + 맞는 줄이어야 맞음 · 없어요 문장은 없어요면 맞음
 */
export function gradeIntext(p, picks) {
  const n = p && Array.isArray(p.sents) ? p.sents.length : 0;
  const m = p && Array.isArray(p.lines) ? p.lines.length : 0;
  const arr = Array.isArray(picks) ? picks : [];
  let valid = n > 0 && arr.length === n;
  for (let i = 0; valid && i < n; i++) {
    const x = arr[i];
    valid = isObj(x) && (x.io === 'out' || (x.io === 'in' && Number.isInteger(x.line) && x.line >= 1 && x.line <= m));
  }
  if (!valid) return { valid: false, ok: false, right: 0, n };
  let right = 0;
  for (let i = 0; i < n; i++) {
    const s = p.sents[i];
    const x = arr[i];
    if (x.io === s.io && (s.io !== 'in' || x.line === s.line)) right++;
  }
  return { valid: true, ok: right === n, right, n };
}

/** 🔗 보기 차례 (순수) — 문장마다 끝 번호(0 = 바른 끝)를 고르게 섞는다 · 바른 차례도 나올 수 있다(두 개뿐이라 늘 피하면 바른 끝이 늘 둘째가 된다) */
export function dealChoices(p, rng = Math.random) {
  return (p && Array.isArray(p.items) ? p.items : []).map((x) => {
    const a = (Array.isArray(x.choices) ? x.choices : []).map((_, i) => i);
    for (let i = a.length - 1; i > 0; i--) { const j = Math.max(0, Math.min(i, Math.floor((Number(rng()) || 0) * (i + 1)))); [a[i], a[j]] = [a[j], a[i]]; } // 0 아래도 막는다 (Codex 100차)
    return a;
  });
}
/** 🔗 낸 끝 채점 — picks = 문장마다 고른 끝 번호(choices의 번호 · 0이 바른 끝) · 빈 칸·모르는 번호가 있으면 valid false */
export function gradeAgree(p, picks) {
  const its = p && Array.isArray(p.items) ? p.items : [];
  const n = its.length;
  const arr = Array.isArray(picks) ? picks : [];
  let valid = n > 0 && arr.length === n;
  for (let i = 0; valid && i < n; i++) valid = Number.isInteger(arr[i]) && arr[i] >= 0 && arr[i] < its[i].choices.length;
  if (!valid) return { valid: false, ok: false, right: 0, n };
  let right = 0;
  for (let i = 0; i < n; i++) if (arr[i] === 0) right++;
  return { valid: true, ok: right === n, right, n };
}
/** 🔗 한 문장 (순수) — 앞부분 + 고른 끝 + 마침표 */
export function agreeSentence(x, c) {
  return `${x.pre} ${x.choices[c]}.`;
}

/** 📍 고쳐 볼 말 (순수) — 있어요는 바른 줄과 원문 조각 · 줄만 틀렸으면 그렇게 · 없어요는 "글에서는 확인할 수 없어요 — 까닭" */
export function intextWhy(s, x, ok) {
  const mark = ok ? '✓' : '✗';
  if (s.io !== 'in') return `${mark} 글에서는 확인할 수 없어요 — ${s.why}`;
  const quote = `“${s.quote}”`;
  if (!ok && x && x.io === 'in' && x.line > 0) return `${mark} 글에 있는 내용은 맞아요. 그런데 ${circled(x.line)}번 줄이 아니라 ${circled(s.line)}번 줄에 있어요 — ${quote}`;
  return `${mark} 글에 있어요 — ${circled(s.line)}번 줄 ${quote}`;
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
  return KIND_LIST.map((kind) => {
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
  return `오늘 처음 끝내면 💰${PUZZLE_COINS} · 🎯 국어 포켓몬 잡기 1번 · 퍼즐 ${PUZZLE_PERFECT_MIN}개 이상을 모두 한 번에 맞히면 🟩 국어스톤`; // v294 — 판이 넷이 되어 "3개를"이 틀린 말이 됐다
}
