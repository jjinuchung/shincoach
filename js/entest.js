// 🎬 영어 영상 시험 (v430, 2026-11-16 아버님 「추천대로」 — 설계 .context/v430/spec.md) — 규칙만 (화면 없음 · 순수)
// ★ import는 grammar.js(쳐 넣기 다듬기 normType · 순서 카드 잇기 joinTiles · 카드 섞기 shuffleTiles)와 korean.js(잡기 장부 셈)뿐 —
//   둘 다 순수(DOM·저장 없음)라 db.js·xp.js·시험·원고 만들기 도구(.context)가 그대로 부른다
//
// 영상마다 시험 5단계 × 단계마다 20문제 (1 낱말 · 2 문장 뜻 · 3 빈칸·문법 · 4 문장 만들기 · 5 이해)
//   열림: 그 영상 「한 문장」(done)을 **지금 문장 열쇠로 거른 수**가 문장 수(cueCountOf)의 OPEN_PCT% 이상 — 또는 OPEN_ALWAYS(토이 스토리 5)
//     (stats.contentSummary의 done·pct는 열쇠로 안 거른 옛 값 그대로 둔다 — 📊·englishskip 시험이 그 값을 쓴다)
//   단계: 맞힌 수 PASS개 이상이면 그 단계를 넘고 다음 단계가 열린다 · 이미 넘은 단계는 다시 고를 수 있다 · 다시 풀기 제한 없음
//   채점: 문제마다 처음 낸 답만 (judge) · 판을 만들 때마다 문제·보기·순서 카드 차례를 섞는다 (dealRound)
// 보상 (enTestRule — xp.enTestFinish가 houseDo 한 트랜잭션에서 저장된 프로필로):
//   칸 80·90·100점 → 💰 TIER_COINS + 단계마다 STAGE_BONUS(단계 n이면 +2(n−1)) · 그 단계에서 이미 받은 칸보다 **높은 칸을 처음 넘을 때 차액만** ·
//   coins와 coinsEarned를 함께 · 100점을 그 단계에서 처음 넘으면 🎯 영어 잡기 기회 하나(p.enThrow.earned +1)
// 영상 열쇠 = 태블릿 영상 제목(item.title — 원고 from과 같은 글 · item.id는 기기마다 다르다) · 같은 제목이 둘이면 첫 편
// 원고(대사)는 저작권 — 비공개 저장소 english/tests/t1~t3.json에만 (받기·사본은 entestsync.js) · 공개 저장소의 시험·주석에는 지어낸 문장만
//
// 프로필 칸 (없으면 칸을 두지 않는다 — 🎹 piano 꼴):
//   enTest = { [영상 제목]: { s 넘은 단계 수 0~5, b:[5] 단계마다 가장 많이 맞힌 수, p:[5] 받은 칸 0·80·90·100, n:[5] 끝낸 판 수,
//              d:[5] 처음 넘은 날 'YYYY-MM-DD' 또는 '', w:{ 유형: 틀린 수 }, t 마지막으로 끝낸 때(ms) } }
//     — 모두 늘기만 한다(병합 max · 처음 넘은 날은 이른 날) · 깨진 값(글자·배열·무한대·음수)은 없는 것으로
//   enThrow = { earned, used, refunded } — 🎯 영어 잡기 기회 장부 (korean.throwsOf 꼴 · 띄우기 전에 빼고 안 던지면 돌려준다)
import { normType, joinTiles, shuffleTiles } from './grammar.js';
import { throwsOf, pendingOf, mergeThrows } from './korean.js';

/** 단계 수 · 단계마다 문제 수 · 넘는 맞힌 수 */
export const STAGES = 5;
export const STAGE_QS = 20;
export const PASS = 16;
/** 단계 이름 (단계 n → STAGE_NAMES[n − 1]) — 아이 화면 칩 글자 */
export const STAGE_NAMES = ['낱말', '문장 뜻', '빈칸·문법', '문장 만들기', '이해'];
/** 단계마다 유형과 개수 (원고 안내 brief_entest.md 표 · 원고 검사기 check_entest.mjs PLAN과 같다) */
export const PLAN = {
  1: { word: 8, wordko: 6, hear: 6 },
  2: { meaning: 8, match: 6, hearsent: 6 },
  3: { grammar: 12, spell: 8 },
  4: { order: 10, form: 5, dict: 5 },
  5: { next: 7, why: 7, idiom: 6 },
};
/** 유형 → 꼴 (pick 고르기 · type 쳐 넣기 · order 순서 맞추기) */
export const KIND = { word: 'pick', wordko: 'pick', hear: 'pick', meaning: 'pick', match: 'pick', hearsent: 'pick', grammar: 'pick', spell: 'type', order: 'order', form: 'type', dict: 'type', next: 'pick', why: 'pick', idiom: 'pick' };
/** 모든 유형 (단계 차례) */
export const TYPES = Object.keys(KIND);
/** 🔊 듣기 유형 — 그 장면(at~end) 소리를 들려주고 푼다 (화면엔 빈칸 문장·물음만) */
export const LISTEN = ['hear', 'hearsent', 'dict'];
/** 유형 이름 (📤 보고·풀이 머리) */
export const TYPE_NAMES = { word: '낱말 뜻', wordko: '우리말 → 낱말', hear: '🔊 낱말 듣기', meaning: '문장 뜻', match: '우리말 → 문장', hearsent: '🔊 문장 듣기', grammar: '문법 빈칸', spell: '철자 쓰기', order: '순서 맞추기', form: '꼴 바꾸기', dict: '🔊 받아쓰기', next: '다음 말', why: '까닭·마음', idiom: '표현 뜻' };
/** 원고에 물음(ask)이 없을 때 쓰는 물음 (쳐 넣기 셋은 원고에 ask가 없는 줄이 있다) */
export const DEFAULT_ASK = {
  word: '이 문장에서 낱말의 뜻은?', wordko: '알맞은 낱말을 고르세요.', hear: '들린 낱말을 고르세요.',
  meaning: '이 문장의 뜻으로 알맞은 것은?', match: '우리말에 맞는 문장을 고르세요.', hearsent: '들린 문장을 고르세요.',
  grammar: '빈칸에 알맞은 말은?', spell: '도움말을 보고 빈칸에 알맞은 낱말을 쓰세요.',
  order: '우리말에 맞게 카드를 놓으세요.', form: '괄호 속 낱말을 알맞은 꼴로 바꿔 빈칸에 쓰세요.', dict: '들린 낱말을 빈칸에 쓰세요.',
  next: '다음에 올 말로 알맞은 것은?', why: '알맞은 것을 고르세요.', idiom: '이 표현의 뜻으로 알맞은 것은?',
};
/** 열림 — 지금 문장 열쇠로 거른 「한 문장」이 문장 수의 이 퍼센트 이상 · 기록과 상관없이 늘 열어 두는 영상 제목 (토이 스토리 5 — 옛 기록이 거의 없다) */
export const OPEN_PCT = 95;
export const OPEN_ALWAYS = ['toy5'];
/** 보상 칸 (점수) · 칸마다 맞힌 수 · 1단계 💰 · 단계마다 더하는 💰 */
export const TIERS = [80, 90, 100];
export const TIER_AT = { 80: 16, 90: 18, 100: 20 };
export const TIER_COINS = { 80: 10, 90: 20, 100: 30 };
export const STAGE_BONUS = 2;
/** 하루 칸 (db.js DAILY_SUMS — 📤용 · 병합 max) : 끝낸 판 · 그 가운데 넘은 판(80점 이상) · 생긴 🎯 기회 · 던져서 잡음 · 놓침 */
export const EN_TEST_DAILY = ['enTestRuns', 'enTestPass', 'enTestBall', 'enTestCaught', 'enTestFled'];
/** 프로필에 둘 영상 수 상한 (깨진 기록이 부풀지 않게 — 지금 17편) · 제목 글자 상한 */
export const MAX_TITLES = 300;
export const TITLE_MAX = 200;

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
const str = (v) => typeof v === 'string' && v.trim().length > 0;
/** 깨진 값은 0 — 숫자만(글자·무한대·음수·NaN은 없는 것) · 내림 */
const num = (v) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.min(Number.MAX_SAFE_INTEGER, Math.floor(v)) : 0);
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const ID_RE = /^T\d\d-([1-5])-\d\d$/;
const WORD_RE = /^[A-Za-z][A-Za-z'-]*$/;
/** 그 문장 안의 낱말 (앞뒤가 영문자·따옴표가 아닌 자리) */
const wordIn = (w, s) => new RegExp(`(^|[^A-Za-z'])${String(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^A-Za-z'])`, 'i').test(s);
const blanks = (s) => (String(s || '').match(/___/g) || []).length;

/** 쓸 수 있는 영상 제목인가 — 빈 글·너무 긴 글·'__proto__'(객체 열쇠로 못 쓴다)는 안 된다 */
export function titleOk(t) {
  return typeof t === 'string' && t.trim().length > 0 && t.length <= TITLE_MAX && t !== '__proto__';
}

/** 맞힌 수 → 받는 칸 (0 · 80 · 90 · 100) */
export function tierOf(correct) {
  const c = num(correct);
  for (const t of [...TIERS].reverse()) if (c >= TIER_AT[t]) return t;
  return 0;
}
/** 칸 → 그 단계 💰 (칸 없음 0) — 단계 n이면 TIER_COINS + STAGE_BONUS × (n − 1) */
export function coinOf(tier, stage) {
  const n = Math.min(STAGES, Math.max(1, Math.floor(Number(stage)) || 1));
  return own(TIER_COINS, tier) ? TIER_COINS[tier] + STAGE_BONUS * (n - 1) : 0;
}
/** 화면에 띄울 물음 — 원고 ask, 없으면 유형마다 정한 물음 */
export function askOf(q) {
  return isObj(q) && str(q.ask) ? q.ask : (isObj(q) && DEFAULT_ASK[q.type]) || '';
}
/** 🔊 듣기 문제인가 (유형으로 — 원고 listen 칸은 검사에서 유형과 맞는지만 본다) */
export function isListen(q) {
  return isObj(q) && LISTEN.includes(q.type);
}

// ───────────────────── 원고 한 줄 검사 ─────────────────────

/**
 * 문제 한 줄 검사 (순수) → 틀린 곳 목록(비면 쓸 수 있다) — 앱은 **화면이 깨지거나 답이 틀리게 채점되는** 줄만 버린다.
 * 원고 검사기(check_entest.mjs)에서 옮긴 것: id·단계·유형·꼴 · from(영상 제목) · at·end(장면 시각) · say · ko · 듣기 표시 ·
 *   고르기(보기 넷 · 정답 하나 · 같은 보기 없음 · 빈칸에 정답을 넣으면 say · 낱말·문장 정답이 say와 맞음 · next 앞 대사) ·
 *   쳐 넣기(빈칸 하나 · ans 첫째를 넣으면 say · 낱말 하나 · 도움말) · 순서(카드 4~10장 · 이으면 ans)
 * 앱에서 뺀 원고 사람용 검사: 정답 자리 몰림 · 다수결 단서 · 같은 문장 쓴 수·듣기 문장 겹침(파일 전체 셈) · 원천(sources)과 대조(say·end·use·앞 대사) ·
 *   틀린 보기 종류 이름(grammar.json types) · 우리말 why · 둥근 따옴표 · 소문자로 시작하는 잘린 문장 · 도움말에 답 글자 · 듣기 물음에 say가 보임 ·
 *   단계마다 유형 개수(PLAN 수) · 순서 카드의 문장부호 자리·같은 낱말 카드·첫 대문자 · idiom x
 */
export function checkTestQ(q) {
  if (!isObj(q)) return ['문제가 객체가 아님'];
  const errs = [];
  const w = (m) => errs.push(m);
  const m = ID_RE.exec(typeof q.id === 'string' ? q.id : '');
  if (!m) w('id는 T##-단계-##');
  if (!Number.isInteger(q.stage) || !own(PLAN, q.stage)) { w('stage는 1~5'); return errs; }
  if (m && Number(m[1]) !== q.stage) w('id의 단계와 stage가 달라요');
  if (!titleOk(q.from)) w('from(영상 제목)');
  if (!own(PLAN[q.stage], q.type)) { w(`${q.stage}단계에 없는 유형`); return errs; }
  if (q.kind !== KIND[q.type]) w(`${q.type}의 kind는 ${KIND[q.type]}`);
  if (!(typeof q.at === 'number' && Number.isFinite(q.at) && q.at >= 0 && typeof q.end === 'number' && Number.isFinite(q.end) && q.end > q.at)) w('at·end(장면 시각)');
  if (!str(q.say)) { w('say'); return errs; }
  if (!str(q.ko)) w('ko(우리말 뜻)');
  if (LISTEN.includes(q.type) !== (q.listen === true)) w('듣기 표시(listen)가 유형과 달라요');
  if (q.ask !== undefined && typeof q.ask !== 'string') w('ask는 글');
  if (q.kind === 'pick') {
    const hasEn = str(q.en);
    if (!hasEn && !str(q.ask)) w('물음(ask)이나 빈칸 문장(en)');
    if (hasEn && blanks(q.en) !== 1) w('빈칸(___)은 하나');
    if (!Array.isArray(q.opts) || q.opts.length !== 4) { w('보기는 넷'); return errs; }
    if (!q.opts.every((o) => isObj(o) && str(o.t))) { w('보기 글이 비었어요'); return errs; }
    const oks = q.opts.filter((o) => o.ok === true);
    if (oks.length !== 1) { w('정답은 하나'); return errs; }
    if (new Set(q.opts.map((o) => normType(o.t))).size !== q.opts.length) w('같은 보기가 둘');
    if (q.opts.some((o) => o.ok !== true && ((o.why !== undefined && typeof o.why !== 'string') || (o.type !== undefined && typeof o.type !== 'string')))) w('틀린 보기의 why·type은 글');
    const ok = oks[0].t;
    if (['word', 'wordko', 'hear'].includes(q.type)) {
      if (!str(q.w) || !wordIn(q.w, q.say)) w('w(묻는 낱말)는 say 안의 낱말');
      if (q.type !== 'word' && normType(ok) !== normType(q.w)) w(`${q.type}의 정답은 w`);
    }
    if (['wordko', 'hear', 'grammar'].includes(q.type)) {
      if (!hasEn) w(`${q.type}는 빈칸 문장(en)`);
      else if (q.en.replace('___', ok) !== q.say) w('빈칸에 정답을 넣으면 say와 달라요');
    }
    if (['match', 'hearsent', 'next'].includes(q.type) && ok !== q.say) w(`${q.type}의 정답은 say 그대로`);
    if (q.type === 'next') {
      const before = isObj(q.ctx) ? q.ctx.before : null;
      if (!Array.isArray(before) || !before.length || before.length > 3 || !before.every(str)) w('next는 ctx.before(앞 대사 1~3줄)');
    }
  } else if (q.kind === 'type') {
    if (!str(q.en) || blanks(q.en) !== 1) { w('쳐 넣기는 빈칸(___) 하나인 en'); return errs; }
    if (!Array.isArray(q.ans) || !q.ans.length || !q.ans.every(str)) { w('ans(맞는 답 목록)'); return errs; }
    if (!WORD_RE.test(q.ans[0])) w('쳐 넣는 답은 영어 낱말 하나');
    const filled = (q.type === 'form' ? q.en.replace(/\s*\([^)]*\)/, '') : q.en).replace('___', q.ans[0]);
    if (filled !== q.say) w('빈칸에 ans 첫째를 넣으면 say와 달라요');
    if (q.type === 'form' && !/\(.+\)/.test(q.en)) w('form은 빈칸 뒤에 (원래 낱말)');
    if (!str(q.hint)) w('hint(도움말)');
    if (q.why !== undefined && typeof q.why !== 'string') w('why는 글');
    if (q.traps !== undefined && !isObj(q.traps)) w('traps는 { 오답: [종류, 풀이] }');
  } else if (q.kind === 'order') {
    if (!Array.isArray(q.tiles) || q.tiles.length < 4 || q.tiles.length > 10 || !q.tiles.every(str)) { w('tiles는 4~10장'); return errs; }
    if (!str(q.ans) || joinTiles(q.tiles) !== q.ans) w('카드를 이으면 ans와 달라요');
    if (!str(q.ask)) w('order의 물음(ask)');
  }
  if (q.ctx !== undefined) {
    if (!isObj(q.ctx)) w('ctx는 { before, after }');
    else for (const k of ['before', 'after']) if (q.ctx[k] !== undefined && !(Array.isArray(q.ctx[k]) && q.ctx[k].every(str))) w(`ctx.${k}는 대사 목록`);
  }
  return errs;
}

/**
 * 원고 줄들 → 영상마다 시험 (순수) — 검사(checkTestQ)를 통과한 줄만 · id가 겹치면 뒤 줄을 버린다 ·
 * 영상(from)마다 단계별로 모아 id 차례로 STAGE_QS개 — 한 단계라도 STAGE_QS개가 안 차면 그 영상 시험은 안 연다(closed) · 넘친 줄은 안 쓴다
 * @param {Array} rows 원고 줄 (여러 파일이면 앞 파일부터 이어서 — 앞 줄의 id가 이긴다)
 * @param {Set<string>} [seen] 이미 쓴 id (여러 번 나눠 부를 때)
 * @returns {{tests: Object<string, object[][]>, bad: number, closed: string[], unused: number, used: Set<object>}}
 *   tests = { [영상 제목]: [[1단계 20문제], …, [5단계 20문제]] } (문제는 원고 줄 그대로 — 고치지 말 것) ·
 *   bad = 검사에 걸리거나 id가 겹쳐 버린 줄 · closed = 단계가 덜 차 안 연 영상 · unused = 안 쓴 줄 모두(bad + 안 연 영상 줄 + 넘친 줄) · used = 쓴 줄(객체)
 */
export function testsOf(rows, seen = new Set()) {
  const by = new Map();
  let bad = 0;
  let total = 0;
  for (const q of Array.isArray(rows) ? rows : []) {
    total += 1;
    if (checkTestQ(q).length || seen.has(q.id)) { bad += 1; continue; }
    seen.add(q.id);
    if (!by.has(q.from)) by.set(q.from, [[], [], [], [], []]);
    by.get(q.from)[q.stage - 1].push(q);
  }
  const tests = {};
  const closed = [];
  const used = new Set();
  for (const [title, stages] of by) {
    if (stages.some((s) => s.length < STAGE_QS)) { closed.push(title); continue; }
    tests[title] = stages.map((s) => s.slice().sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)).slice(0, STAGE_QS));
    for (const s of tests[title]) for (const q of s) used.add(q);
  }
  return { tests, bad, closed, unused: total - used.size, used };
}

/** 그 제목의 시험 (없으면 null) — 프로토타입 이름(constructor …)이 제목이어도 엉뚱한 값을 주지 않게 */
export function testOf(tests, title) {
  return isObj(tests) && typeof title === 'string' && own(tests, title) && Array.isArray(tests[title]) ? tests[title] : null;
}

// ───────────────────── 열림 (95%) ─────────────────────

/** 문장 열쇠 (db.sentenceKey와 같은 꼴 — 기록 줄에 key가 없을 때만) */
const keyOf = (r) => (typeof r.key === 'string' && r.key ? r.key : `${r.itemId}|${Math.round(Number(r.start) * 10)}`);

/**
 * 그 영상 「한 문장」 수 — 지금 문장 열쇠(keys — stats.cueKeysOf)로 거른 done (순수) · keys가 없으면 거르지 않는다
 * (⚙ 문장 합치기를 바꾼 옛 조각 기록까지 세면 100%를 넘을 수 있어 95%가 부푼다)
 */
export function doneNowOf(records, itemId, keys) {
  let n = 0;
  for (const r of Array.isArray(records) ? records : []) if (isObj(r) && r.itemId === itemId && r.done && (!keys || keys.has(keyOf(r)))) n += 1;
  return n;
}
/** 열림 % (내림 · 문장이 없으면 0) — 아빠용 글·시험에만(아이 화면엔 안 씀) */
export function openPctOf(done, total) {
  const t = num(total);
  return t ? Math.floor((num(done) * 100) / t) : 0;
}
/** 시험이 열렸나 (순수) — OPEN_ALWAYS 제목이거나 done이 total의 OPEN_PCT% 이상 (나눗셈 대신 곱으로 — 소수 어림 없이) */
export function openOf(title, done, total) {
  if (OPEN_ALWAYS.includes(title)) return true;
  const t = num(total);
  return t > 0 && num(done) * 100 >= OPEN_PCT * t;
}
/**
 * 영상 목록 → 제목마다 열림 (순수 · library.js가 한 번 읽은 items·records로) — 같은 제목이 둘이면 첫 편 · 깨진 영상(broken)은 건너뛴다
 * @param {object[]} items 영상 목록 (listItems)
 * @param {object[]} records 문장 기록 전부 (getAllSentenceStats)
 * @param {(it:object) => number} cueCountOf stats.cueCountOf (없으면 keys 수)
 * @param {(it:object) => Set<string>} cueKeysOf stats.cueKeysOf (없으면 거르지 않음)
 * @param {Iterable<string>} [titles] 이 제목만 센다(시험이 있는 영상 — 문장 나누기를 아끼게)
 * @returns {Object<string, {id:string, done:number, total:number, pct:number, open:boolean}>}
 */
export function openMapOf(items, records, cueCountOf, cueKeysOf, titles = null) {
  const want = titles ? new Set(titles) : null;
  const first = new Map();
  for (const it of Array.isArray(items) ? items : []) {
    if (!isObj(it) || it.broken || !titleOk(it.title) || first.has(it.title)) continue;
    if (want && !want.has(it.title)) continue;
    first.set(it.title, it);
  }
  const ids = new Set([...first.values()].map((it) => it.id));
  const byId = new Map();
  for (const r of Array.isArray(records) ? records : []) {
    if (!isObj(r) || !ids.has(r.itemId)) continue;
    if (!byId.has(r.itemId)) byId.set(r.itemId, []);
    byId.get(r.itemId).push(r);
  }
  const out = {};
  for (const [title, it] of first) {
    let keys = null;
    let total = 0;
    try { keys = cueKeysOf ? cueKeysOf(it) : null; } catch { keys = null; }
    try { total = cueCountOf ? Number(cueCountOf(it)) || 0 : keys ? keys.size : 0; } catch { total = 0; }
    const done = doneNowOf(byId.get(it.id) || [], it.id, keys);
    out[title] = { id: it.id, done, total, pct: openPctOf(done, total), open: openOf(title, done, total) };
  }
  return out;
}

// ───────────────────── 판 만들기 · 채점 ─────────────────────

function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.max(0, Math.min(i, Math.floor((Number(rng()) || 0) * (i + 1)))); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
/** 고르기 문제의 정답 보기 번호 (원고 차례 · 없으면 -1) */
export function okIndex(q) {
  return isObj(q) && Array.isArray(q.opts) ? q.opts.findIndex((o) => isObj(o) && o.ok === true) : -1;
}

/**
 * 한 판 (순수) — 그 단계 문제 차례를 섞고, 고르기는 보기 차례를, 순서 맞추기는 카드 차례를 섞는다 (원고 줄은 고치지 않는다)
 * @param {object[]} qs 그 단계 문제 (testsOf의 한 단계)
 * @returns {Array<{i:number, q:object, opts?:number[], okAt?:number, tiles?:number[]}>}
 *   i = qs 안 번호 · opts = 보일 차례의 **원고 보기 번호** (보기 글 = q.opts[opts[k]]) · okAt = 정답이 보이는 자리(opts 안 차례) ·
 *   tiles = 보일 차례의 원고 카드 번호 (카드 글 = q.tiles[tiles[k]])
 */
export function dealRound(qs, rng = Math.random) {
  const list = Array.isArray(qs) ? qs : [];
  return shuffle(list.map((_, i) => i), rng).filter((i) => isObj(list[i])).map((i) => {
    const q = list[i];
    const d = { i, q };
    if (q.kind === 'pick' && Array.isArray(q.opts)) {
      d.opts = shuffle(q.opts.map((_, k) => k), rng);
      d.okAt = d.opts.indexOf(okIndex(q));
    } else if (q.kind === 'order' && Array.isArray(q.tiles)) d.tiles = shuffleTiles(q.tiles, rng);
    return d;
  });
}

/** 쳐 넣기 답 다듬기 — normType(대소문자·빈칸·굽은 작은따옴표·끝 .!?) + 굽은 큰따옴표·앞뒤 큰따옴표·끝 쉼표·쌍점 */
export function normAns(s) {
  return normType(String(s == null ? '' : s).replace(/[“”]/g, '"')).replace(/^"+|[",;:]+$/g, '').trim();
}
const APOS_WHY = '거의 맞았어요 — 따옴표(\')가 빠졌어요'; // 처음 낸 답만 세므로 「넣어요」라고 시키지 않는다

/**
 * 채점 (순수) — 문제마다 **처음 낸 답만** 센다(그것은 화면이 지킨다 · kind 'empty'는 낸 답이 아니다 — 세지 말고 다시 받기)
 * @param {object} q 원고 문제
 * @param {number|string|Array} answer pick: 고른 **원고 보기 번호**(dealRound opts의 값) · type: 쓴 글 · order: 놓은 카드 글 차례(또는 원고 카드 번호 차례)
 * @returns {{ok:boolean, kind:string, type?:string, why:string, okText:string, expl:string}}
 *   kind — pick: 'ok'·'wrong'·'empty' · type: 'ok'·'trap'(원고가 짚은 오답)·'apos'(따옴표만 빠짐)·'other'·'empty' · order: 'ok'·'wrong'·'empty'
 *   type = 틀린 까닭 종류(보기 type · traps 종류 · 'apos') · why = 틀린 까닭 한 줄(고른 틀린 보기의 why · traps 풀이) ·
 *   okText = 맞는 답(정답 보기 글 · ans 첫째 · 순서 문장) · expl = 맞는 답 풀이(쳐 넣기 q.why — 없으면 '') ·
 *   pick은 pick(고른 번호)·okIdx(정답 번호) · order는 at(처음 어긋난 자리 — 맞으면 -1)
 */
export function judge(q, answer) {
  if (!isObj(q)) return { ok: false, kind: 'empty', why: '', okText: '', expl: '' };
  if (q.kind === 'pick') {
    const okIdx = okIndex(q);
    const okText = okIdx >= 0 ? String(q.opts[okIdx].t) : '';
    const k = answer;
    if (!Number.isInteger(k) || !Array.isArray(q.opts) || k < 0 || k >= q.opts.length || !isObj(q.opts[k])) return { ok: false, kind: 'empty', why: '', okText, expl: '', pick: -1, okIdx };
    const o = q.opts[k];
    if (o.ok === true) return { ok: true, kind: 'ok', why: '', okText, expl: '', pick: k, okIdx };
    return { ok: false, kind: 'wrong', type: typeof o.type === 'string' ? o.type : '', why: typeof o.why === 'string' ? o.why : '', okText, expl: '', pick: k, okIdx };
  }
  if (q.kind === 'type') {
    const ans = Array.isArray(q.ans) ? q.ans.filter((a) => typeof a === 'string') : [];
    const okText = ans[0] || '';
    const expl = typeof q.why === 'string' ? q.why : '';
    const n = normAns(answer);
    if (!n) return { ok: false, kind: 'empty', why: '', okText, expl };
    const want = ans.map(normAns);
    if (want.includes(n)) return { ok: true, kind: 'ok', why: '', okText, expl };
    const traps = isObj(q.traps) ? q.traps : {};
    for (const [k, v] of Object.entries(traps)) {
      if (normAns(k) === n && Array.isArray(v)) return { ok: false, kind: 'trap', type: typeof v[0] === 'string' ? v[0] : '', why: typeof v[1] === 'string' ? v[1] : '', okText, expl };
    }
    const bare = (s) => s.replace(/'/g, '');
    if (!n.includes('\'') && want.some((a) => a.includes('\'') && bare(a) === n)) return { ok: false, kind: 'apos', type: 'apos', why: APOS_WHY, okText, expl };
    return { ok: false, kind: 'other', why: '', okText, expl };
  }
  if (q.kind === 'order') {
    const tiles = Array.isArray(q.tiles) ? q.tiles : [];
    const okText = typeof q.ans === 'string' ? q.ans : '';
    const raw = Array.isArray(answer) ? answer : [];
    if (!raw.length) return { ok: false, kind: 'empty', why: '', okText, expl: '', at: 0 };
    let placed = raw;
    if (raw.every((x) => typeof x === 'number')) {
      // 원고 카드 번호 차례 — 한 장씩 한 번만 (같은 카드를 두 번 놓은 차례는 틀림)
      const okIdx = raw.every((x) => Number.isInteger(x) && x >= 0 && x < tiles.length) && new Set(raw).size === raw.length;
      placed = okIdx ? raw.map((x) => tiles[x]) : [];
    }
    const ok = placed.length === tiles.length && placed.every((t) => typeof t === 'string') && joinTiles(placed) === okText;
    if (ok) return { ok: true, kind: 'ok', why: '', okText, expl: '', at: -1 };
    let at = 0;
    while (at < placed.length && placed[at] === tiles[at]) at += 1;
    return { ok: false, kind: 'wrong', why: '', okText, expl: '', at };
  }
  return { ok: false, kind: 'empty', why: '', okText: '', expl: '' };
}

/**
 * 한 판 셈 (순수) — 문제마다 처음 낸 답의 채점 → { correct 맞힌 수, wrong { 유형: 틀린 수 } } (xp.enTestFinish에 그대로 넘긴다)
 * @param {Array<{q:object, ok:boolean}>} results
 */
export function tally(results) {
  let correct = 0;
  const wrong = {};
  for (const r of Array.isArray(results) ? results : []) {
    if (!isObj(r) || !isObj(r.q)) continue;
    if (r.ok === true) correct += 1;
    else if (own(KIND, r.q.type)) wrong[r.q.type] = (wrong[r.q.type] || 0) + 1;
  }
  return { correct, wrong };
}

// ───────────────────── 프로필 칸 (enTest) ─────────────────────

/** 빈 영상 칸 */
export function emptyEnRec() {
  return { s: 0, b: [0, 0, 0, 0, 0], p: [0, 0, 0, 0, 0], n: [0, 0, 0, 0, 0], d: ['', '', '', '', ''], w: {}, t: 0 };
}
const five = (v, f) => Array.from({ length: STAGES }, (_, k) => f(Array.isArray(v) ? v[k] : undefined));
const tierVal = (x) => (typeof x === 'number' && TIERS.includes(x) ? x : 0);
const dayVal = (x) => (typeof x === 'string' && DAY_RE.test(x) ? x : '');
/** 영상 칸 하나 고쳐 읽기 (순수) — 새 객체 · 깨진 값은 없는 것 · 비었으면 null */
export function enRecOf(r) {
  if (!isObj(r)) return null;
  const w = {};
  if (isObj(r.w)) for (const k of TYPES) { const n = num(r.w[k]); if (n) w[k] = n; }
  const out = {
    s: Math.min(STAGES, num(r.s)),
    b: five(r.b, (x) => Math.min(STAGE_QS, num(x))),
    p: five(r.p, tierVal),
    n: five(r.n, num),
    d: five(r.d, dayVal),
    w,
    t: num(r.t),
  };
  const any = out.s || out.t || Object.keys(w).length || [out.b, out.p, out.n].some((a) => a.some(Boolean)) || out.d.some(Boolean);
  return any ? out : null;
}
/** profile.enTest 고쳐 읽기 (순수) — 새 객체 { 제목: 칸 } · 쓸 수 없는 제목·빈 칸은 뺀다 · MAX_TITLES까지 */
export function enTestOf(raw) {
  const out = {};
  if (!isObj(raw)) return out;
  let k = 0;
  for (const t of Object.keys(raw)) {
    if (k >= MAX_TITLES) break;
    if (!titleOk(t)) continue;
    const r = enRecOf(raw[t]);
    if (!r) continue;
    out[t] = r;
    k += 1;
  }
  return out;
}
/** 깊은 복사 (db.cloneProfile · xp.fromStored) */
export function copyEnTest(raw) {
  return enTestOf(raw);
}
/** 그 제목의 칸 (없으면 빈 칸) — 그리기용 */
export function enRecFor(raw, title) {
  const r = isObj(raw) && titleOk(title) && own(raw, title) ? enRecOf(raw[title]) : null;
  return r || emptyEnRec();
}
/** 지금 단계 — 열린 단계 중 가장 높은 단계 (넘은 단계 수 + 1 · 다 넘었으면 5) */
export function stageNow(rec) {
  const r = enRecOf(rec) || emptyEnRec();
  return Math.min(STAGES, r.s + 1);
}
/** 고를 수 있는 단계 [1 … 지금 단계] */
export function stagesOpen(rec) {
  return Array.from({ length: stageNow(rec) }, (_, k) => k + 1);
}
/**
 * 한 번 연 시험인가 — 끝낸 판이 하나라도 있다(넘은 단계 · 받은 칸 · 판 수) · 영상을 지우고 다시 넣었거나 ⚙ 문장 합치기를 바꿔
 * 「한 문장」이 95% 밑으로 내려가도 이미 푼 시험은 닫지 않는다 (95%는 처음 열 때만)
 */
export function everOpened(rec) {
  const r = enRecOf(rec);
  return !!r && (r.s > 0 || r.p.some((n) => n > 0) || r.n.some((n) => n > 0));
}

/** 두 칸 병합 — 넘은 단계·최고·받은 칸·판 수·틀린 수·끝낸 때는 큰 쪽 · 처음 넘은 날은 이른 날 */
function mergeRec(a, b) {
  const x = enRecOf(a) || emptyEnRec();
  const y = enRecOf(b) || emptyEnRec();
  const w = { ...x.w };
  for (const [k, n] of Object.entries(y.w)) w[k] = Math.max(w[k] || 0, n);
  const early = (u, v) => (!u ? v : !v ? u : u < v ? u : v);
  return enRecOf({
    s: Math.max(x.s, y.s),
    b: x.b.map((v, k) => Math.max(v, y.b[k])),
    p: x.p.map((v, k) => Math.max(v, y.p[k])),
    n: x.n.map((v, k) => Math.max(v, y.n[k])),
    d: x.d.map((v, k) => early(v, y.d[k])),
    w,
    t: Math.max(x.t, y.t),
  });
}
/**
 * 백업 병합 (순수) — 제목마다 칸마다 큰 쪽(옛 백업으로 받은 칸을 되돌려 💰·🎯를 다시 받지 못하게 · 넘은 단계가 다시 잠기지 않게) ·
 * 처음 넘은 날은 이른 날 · 깨진 값은 없는 것 · 둘 다 비었으면 null (칸을 두지 않는다)
 */
export function mergeEnTest(a, b) {
  const x = enTestOf(a);
  const y = enTestOf(b);
  const out = { ...x };
  for (const [t, r] of Object.entries(y)) out[t] = own(x, t) ? mergeRec(x[t], r) : r;
  const m = enTestOf(out);
  return Object.keys(m).length ? m : null;
}

// ───────────────────── 🎯 영어 잡기 기회 (enThrow) ─────────────────────
// korean.js korThrow와 같은 꼴 — 늘기만 하는 세 카운터 { earned 받은 수, used 뺀 수, refunded 돌려준 수 } · 남은 기회 = earned − used + refunded
// 잡기 화면을 띄우기 **전에** 하나 빼고(enTakeRule), 한 번도 안 던지고 닫으면 돌려준다(enGiveBackRule) — 병합은 카운터마다 max

/** 장부 고쳐 읽기 — 새 객체 { earned, used, refunded } */
export function enThrowOf(t) {
  return throwsOf(t);
}
/** 남은 영어 잡기 기회 — raw = profile.enThrow */
export function enThrowsLeft(raw) {
  return pendingOf(raw);
}
/** 🎯 기회 하나 빼기 (잡기 화면을 띄우기 전 · 한 트랜잭션) — why 'none' 남은 기회 없음 */
export function enTakeRule(p) {
  const t = throwsOf(p.enThrow);
  if (t.earned - t.used + t.refunded <= 0) return { ok: false, why: 'none' };
  t.used += 1;
  p.enThrow = t;
  return { ok: true, left: pendingOf(t) };
}
/** 🎯 뺐는데 한 번도 안 던졌다 → 돌려준다 (뺀 수보다 많이 돌려주지 않는다) — why 'none' */
export function enGiveBackRule(p) {
  const t = throwsOf(p.enThrow);
  if (t.refunded >= t.used) return { ok: false, why: 'none' };
  t.refunded += 1;
  p.enThrow = t;
  return { ok: true, left: pendingOf(t) };
}
/** 장부 병합 — 카운터마다 큰 쪽 · 둘 다 없거나 셈이 하나도 없으면 null (칸을 두지 않는다) */
export function mergeEnThrow(a, b) {
  if (!isObj(a) && !isObj(b)) return null;
  const m = mergeThrows(a, b);
  return m.earned || m.used || m.refunded ? m : null;
}

// ───────────────────── 보상 규칙 ─────────────────────

/** 그 때의 날 'YYYY-MM-DD' (이 기기 시각 — 하루 칸·처음 넘은 날) */
export function enDayKey(now = Date.now()) {
  const d = new Date(now);
  const z = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
/** 틀린 수 고쳐 읽기 — 그 단계 유형만 · 유형 개수까지 · 합이 max를 넘으면 null(깨진 요청) */
function wrongOf(raw, stage, max) {
  if (raw === undefined || raw === null) return {};
  if (!isObj(raw)) return null;
  const out = {};
  let sum = 0;
  for (const [k, v] of Object.entries(raw)) {
    if (!own(PLAN[stage], k)) return null;
    const n = typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : -1;
    if (n < 0 || n > STAGE_QS) return null; // 유형 개수(PLAN)로 막지 않는다 — 원고가 단계 안 유형 수를 바꿔도 떨어진 판 기록이 사라지지 않게 (합은 아래에서)
    if (n) out[k] = n;
    sum += n;
  }
  return sum <= max ? out : null;
}
const knownHas = (known, t) => (known instanceof Set ? known.has(t) : Array.isArray(known) ? known.includes(t) : isObj(known) ? own(known, t) : false);

/**
 * 🎬 시험 한 판 끝 (순수 — xp.enTestFinish가 houseDo 안에서 **저장된 프로필로**) — 프로필을 고친다
 * @param {object} p 프로필 복사본
 * @param {{title:string, stage:number, correct:number, wrong?:Object<string,number>, now:number, known:(Set<string>|string[]|object)}} args
 *   title 영상 제목 · stage 1~5 · correct 처음 낸 답으로 맞힌 수 0~20 · wrong { 유형: 틀린 수 } (그 단계 유형만 · 합 ≤ 20 − correct) ·
 *   now 끝낸 때(ms — 트랜잭션 안의 시각) · known 시험이 있는 제목들(entestsync.enTestsNow().tests의 열쇠)
 * @returns {{ok:false, why:'title'|'bad'|'locked'} | {ok:true, title, stage, correct, score, tier, prevTier, coins, passed, firstPass, opened, chance, best, s, left, day}}
 *   score = 점수(맞힌 수 × 5) · tier = 이번 칸(0·80·90·100) · prevTier = 그 단계에서 전에 받은 칸 · coins = 이번에 받은 💰(차액 · 0일 수 있다) ·
 *   passed = 넘었나(PASS개 이상) · firstPass = 이번에 처음 넘었나 · opened = 이번에 새로 열린 단계(없으면 0) ·
 *   chance = 🎯 영어 잡기 기회가 생겼나(그 단계 100점을 처음) · best = 그 단계 가장 많이 맞힌 수 · s = 넘은 단계 수 · left = 남은 영어 잡기 기회 · day = 끝낸 날
 */
export function enTestRule(p, args) {
  const a = isObj(args) ? args : {};
  if (!titleOk(a.title) || !knownHas(a.known, a.title)) return { ok: false, why: 'title' };
  const stage = a.stage;
  const correct = a.correct;
  const now = a.now;
  if (!Number.isInteger(stage) || stage < 1 || stage > STAGES || !Number.isInteger(correct) || correct < 0 || correct > STAGE_QS
    || typeof now !== 'number' || !Number.isFinite(now) || now <= 0) return { ok: false, why: 'bad' };
  const wrong = wrongOf(a.wrong, stage, STAGE_QS - correct);
  if (!wrong) return { ok: false, why: 'bad' };
  const all = enTestOf(p.enTest);
  const rec = own(all, a.title) ? all[a.title] : emptyEnRec();
  if (stage > rec.s + 1) return { ok: false, why: 'locked' }; // 앞 단계를 아직 안 넘었다
  const k = stage - 1;
  const day = enDayKey(now);
  const tier = tierOf(correct);
  const prevTier = rec.p[k];
  let coins = 0;
  if (tier > prevTier) {
    coins = coinOf(tier, stage) - coinOf(prevTier, stage);
    rec.p[k] = tier;
  }
  const passed = correct >= PASS;
  const firstPass = passed && rec.s < stage;
  if (passed) {
    rec.s = Math.max(rec.s, stage);
    if (!rec.d[k]) rec.d[k] = day;
  }
  const opened = firstPass && stage < STAGES ? stage + 1 : 0;
  rec.b[k] = Math.max(rec.b[k], correct);
  rec.n[k] = Math.min(Number.MAX_SAFE_INTEGER, rec.n[k] + 1);
  for (const [t, n] of Object.entries(wrong)) rec.w[t] = Math.min(Number.MAX_SAFE_INTEGER, (rec.w[t] || 0) + n);
  rec.t = Math.max(rec.t, Math.floor(now));
  if (coins) {
    p.coins = num(p.coins) + coins;
    p.coinsEarned = num(p.coinsEarned) + coins; // 번 💰는 함께 오른다 (grammarRule·tapRule과 같이)
  }
  const chance = tier === 100 && prevTier < 100;
  if (chance) {
    const t = throwsOf(p.enThrow);
    t.earned += 1;
    p.enThrow = t;
  }
  p.enTest = { ...all, [a.title]: rec };
  return { ok: true, title: a.title, stage, correct, score: correct * 5, tier, prevTier, coins, passed, firstPass, opened, chance, best: rec.b[k], s: rec.s, left: pendingOf(p.enThrow), day };
}

// ───────────────────── 📤 보고 (english/tests.md · usage 하루 줄) ─────────────────────
// (v430) Claude가 「올라온 거 봐 줘」 때 읽는다 — 영상 제목(태블릿 제목)과 셈만 싣는다 · 문제·대사 글은 싣지 않는다(원고는 비공개 저장소에만)

/** 📤 usage 하루 한 줄 (순수) — 하루 칸(EN_TEST_DAILY)으로 · 한 것이 없으면 '' · 깨진 값은 0 */
export function enTestDayLine(d) {
  const g = (k) => (isObj(d) ? num(d[k]) : 0);
  const parts = [];
  if (g('enTestRuns') || g('enTestPass')) parts.push(`🎬 영상 시험 ${g('enTestRuns')}판(넘음 ${g('enTestPass')})`);
  // 그날 생긴 기회와 그날 던진 것은 다를 수 있다(전에 생긴 기회로 던진 것도 그날 줄에)
  if (g('enTestBall') || g('enTestCaught') || g('enTestFled')) parts.push(`🎯 영어 잡기 기회 ${g('enTestBall')}번 생김 · 던져서 잡음 ${g('enTestCaught')} · 놓침 ${g('enTestFled')}`);
  return parts.join(' · ');
}

const z2 = (x) => String(x).padStart(2, '0');
/** 시각(ms) → 'MM-DD HH:MM' (이 기기 시각) · 없으면 '—' */
const whenOf = (t) => {
  const n = num(t);
  if (!n) return '—';
  const d = new Date(n);
  return `${z2(d.getMonth() + 1)}-${z2(d.getDate())} ${z2(d.getHours())}:${z2(d.getMinutes())}`;
};
/** md에 쓸 제목 — 줄바꿈·겹친 빈칸은 한 칸으로(제목 하나가 줄을 깨지 않게) */
const qt = (t) => `「${String(t).replace(/\s+/g, ' ').trim()}」`;
const typeLabel = (k) => `${TYPE_NAMES[k]}(${k})`;
/** 넘겨받은 제목들 (받아 둔 원고 { 제목: 단계 } · 제목 배열 · Set) → 쓸 수 있는 제목만 · 겹침 없이 · 받은 차례 */
const titlesOf = (v) => [...new Set((v instanceof Set ? [...v] : Array.isArray(v) ? v : isObj(v) ? Object.keys(v) : []).filter(titleOk))];

/** 읽는 법 (english/tests.md) — 상수에서 만든다(규칙을 바꾸면 글도 함께) */
function howLines() {
  const plan = Object.keys(PLAN).map((s) => `${s} ${Object.entries(PLAN[s]).map(([t, n]) => `${TYPE_NAMES[t]} ${n}`).join(' · ')}`).join(' | ');
  return [
    `- 영상마다 ${STAGES}단계 × ${STAGE_QS}문제 — ${STAGE_NAMES.map((n, k) => `${k + 1} ${n}`).join(' · ')} · 영상 열쇠 = 태블릿 영상 제목(원고 from과 같은 글 · 같은 제목이 둘이면 첫 편)`,
    `- 열림 = 그 영상 「한 문장」을 지금 문장 열쇠로 센 수가 문장 수의 ${OPEN_PCT}% 이상 (${OPEN_ALWAYS.join('·')}는 늘 열림) — 📊·library.md의 한 문장 수는 옛 조각 문장 기록까지 세서 이 수와 다를 수 있어요`,
    `- 넘은 단계 = 처음 낸 답으로 ${PASS}개 이상 맞혀(${TIERS[0]}점) 다음 단계가 열린 단계 수 · 지금 단계 = 시험 창을 열면 나오는 단계(이미 넘은 단계는 단계 이름 칩으로 다시 고를 수 있어요 · 다시 풀기 제한 없음)`,
    `- 단계 줄: 최고 = 처음 낸 답으로 가장 많이 맞힌 수(${STAGE_QS}개 중 · 점수는 × 5) · 칸 = 받은 보상 칸 ${TIERS.join('·')}점 — 💰는 그 단계에서 더 높은 칸을 처음 넘을 때 차액만(1단계 ${TIERS.map((t) => TIER_COINS[t]).join('·')} · 단계마다 +${STAGE_BONUS}) · 판 = 끝까지 푼 판 수(다시 푼 판 포함) · 처음 넘은 날`,
    `- 틀린 유형 = 처음 낸 답이 틀린 수를 문제 유형마다 모두 더한 것(다시 푼 판도 셈) — 한 판의 유형별 문제 수: ${plan}`,
    '- 🎯 영어 잡기 기회 = 한 단계에서 100점을 처음 넘을 때 하나 · 끝 화면 뒤 바로 잡기 화면 · 안 던지고 닫으면 남아 영어 목록 「🎯 영어 포켓몬 잡기」 단추로 · 받음 · 씀(잡기 화면을 띄우며 뺀 수 − 돌려준 수 = 던진 수 + 지금 열린 잡기 창 + 앱이 꺼졌거나 저장이 안 돼 아직 못 돌려준 것) · 남음',
    '- 하루 줄(끝낸 판·넘은 판·🎯 생김·던진 결과)은 usage/날짜.md의 「🎬 영상 시험」 · 아이 화면엔 남은 수 없이 「몇 번째 문제」와 끝 화면 점수만',
  ];
}

/**
 * 📤 english/tests.md (순수, v430) — 영상마다 넘은 단계 · 단계별 최고 맞힌 수 · 받은 칸 · 판 · 처음 넘은 날 · 유형별 틀린 수 · 🎯 영어 잡기 기회 ·
 *   이 기기에 받아 둔 원고의 「시험이 있는 영상」과 열림 · 시험을 끝낸 적이 없으면 짧게(한 줄 + 시험이 있는 영상)
 * @param {{enTest?:object, enThrow?:object, tests?:(object|string[]|Set<string>), closed?:string[], open?:(object|null), today:string}} o
 *   enTest = profile.enTest · enThrow = profile.enThrow · tests = 받아 둔 원고(entestsync.enTestsNow().tests — 제목 열쇠) 또는 제목 목록 ·
 *   closed = 단계가 덜 차 안 연 영상(enTestsNow().closed) · open = 제목마다 열림(openMapOf 결과 — null이면 열림을 못 센 것)
 * @returns {string}
 */
export function testsMd(o) {
  const a = isObj(o) ? o : {};
  const today = typeof a.today === 'string' ? a.today : '';
  const all = enTestOf(a.enTest);
  const th = throwsOf(a.enThrow);
  const have = titlesOf(a.tests);
  const closed = titlesOf(Array.isArray(a.closed) ? a.closed : []);
  const open = isObj(a.open) ? a.open : null;
  const recs = Object.keys(all);
  const head = `📝 영어 영상 시험 기록 (${today}) — v430부터 · 영상 제목과 셈만 싣고 문제·대사는 싣지 않아요(원고는 비공개 english/tests/t1~t3.json)`;
  const list = ['', `## 시험이 있는 영상 — 이 기기에 받아 둔 원고 ${have.length}편`];
  if (!have.length) list.push('(받아 둔 원고 없음 — 📤 열쇠가 있고 비공개 english/tests를 받은 기기에서만 「📝 시험」이 보여요)');
  for (const t of have) {
    if (!open) { list.push(`- ${qt(t)}`); continue; }
    const m = own(open, t) && isObj(open[t]) ? open[t] : null;
    if (!m) { list.push(`- ${qt(t)} — 이 기기에 이 제목 영상이 없어요(제목을 다르게 넣었을 수도 — 열쇠는 원고 from과 같은 제목)`); continue; }
    const how = m.open === true ? (OPEN_ALWAYS.includes(t) ? '✅ 열림(늘 열어 둔 영상)' : '✅ 열림') : own(all, t) && everOpened(all[t]) ? '✅ 열림(전에 푼 시험 — 「한 문장」이 다시 내려가도 그대로)' : '🔒 아직';
    list.push(`- ${qt(t)} ${how} · 한 문장 ${num(m.pct)}% (${num(m.done)}문장 · 모두 ${num(m.total)})`);
  }
  if (have.length && !open) list.push('(열림은 이번에 못 셌어요 — 이 기기 영상 기록을 못 읽음)');
  if (closed.length) list.push(`- ⚠️ 단계마다 ${STAGE_QS}문제가 안 차 시험을 안 연 영상: ${closed.map(qt).join(' · ')} — 원고를 확인해 주세요`);
  if (!recs.length && !(th.earned || th.used || th.refunded)) {
    return `${[head, '', `(아직 끝낸 시험이 없어요 — 「📝 시험」은 영어 목록의 열린 영상 카드에 · 열림 = 그 영상 「한 문장」 ${OPEN_PCT}% 이상, ${OPEN_ALWAYS.join('·')}는 늘)`, ...list].join('\n')}\n`;
  }
  const lines = [head, '', '## 읽는 법', ...howLines(), ...list, '', '## 영상마다 (마지막으로 끝낸 차례)'];
  if (!recs.length) lines.push('(아직 끝낸 시험 없음)');
  const order = recs.slice().sort((x, y) => all[y].t - all[x].t || (x < y ? -1 : x > y ? 1 : 0));
  const sumW = {};
  for (const t of order) {
    const r = all[t];
    const now = stageNow(r);
    const runs = r.n.reduce((s, n) => s + n, 0);
    lines.push('', `### ${qt(t)} — 넘은 단계 ${r.s}${r.s >= STAGES ? '(다 넘음)' : ''} · 지금 단계 ${now} ${STAGE_NAMES[now - 1]} · 판 모두 ${runs} · 마지막 ${whenOf(r.t)}`);
    if (have.length && !have.includes(t)) lines.push('- (지금 받아 둔 원고에 없는 제목 — 원고의 영상 제목이 바뀌었거나 그 영상 원고를 뺐어요)');
    for (let k = 0; k < STAGES; k++) {
      const name = `${k + 1} ${STAGE_NAMES[k]}`;
      if (r.n[k] || r.b[k] || r.p[k] || r.d[k]) lines.push(`- ${name}: 최고 ${r.b[k]}개 · 칸 ${r.p[k] ? `${r.p[k]}점` : '없음'} · 판 ${r.n[k]} · 처음 넘은 날 ${r.d[k] ? r.d[k].slice(5) : '—'}`);
      else lines.push(`- ${name}: ${k + 1 <= now ? '(아직 안 풂)' : '(잠김)'}`);
    }
    const ws = Object.keys(r.w).sort((x, y) => r.w[y] - r.w[x] || TYPES.indexOf(x) - TYPES.indexOf(y));
    for (const k of ws) sumW[k] = Math.min(Number.MAX_SAFE_INTEGER, (sumW[k] || 0) + r.w[k]);
    lines.push(`- 틀린 유형: ${ws.length ? ws.map((k) => `${typeLabel(k)} ${r.w[k]}`).join(' · ') : '없음'}`);
  }
  lines.push('', '## 유형마다 틀린 수 (모든 영상 · 많은 차례)');
  const allW = Object.keys(sumW).sort((x, y) => sumW[y] - sumW[x] || TYPES.indexOf(x) - TYPES.indexOf(y));
  for (const k of allW) lines.push(`- ${typeLabel(k)} ${sumW[k]}`);
  if (!allW.length) lines.push('(아직 없음)');
  lines.push('', '## 🎯 영어 잡기 기회');
  lines.push(th.earned || th.used || th.refunded
    ? `- 받음 ${th.earned} · 씀 ${Math.max(0, th.used - th.refunded)}(뺌 ${th.used} · 돌려줌 ${th.refunded}) · 남음 ${pendingOf(th)}`
    : '- 아직 없음 (100점을 처음 넘은 단계가 없어요)');
  return `${lines.join('\n')}\n`;
}
