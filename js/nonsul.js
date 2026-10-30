// 🖊️ 논술 (v303, 2026-10-20 — 아버님 "논술 과목을 한 번 만들어볼까?") — 규칙만 (화면 없음 · check.mjs·시험이 같이 쓴다)
// 생활 속 찬반 주제 한 판: ① 내 의견 정하기(정답 없음) ② 내 의견에 맞는 이유 둘(보기 넷 — 내 편 둘 · 반대편 하나 · 상관없는 말 하나)
//   ③ 친구가 반대로 말한다면(반대편 이유 · 내 편 이유 · 상관없는 말) ④ 글 순서(내 의견 → 이유 둘 → 반대 의견 → 정리) → 고른 것으로 만든 글
// 2022 [4국03-03] "대상에 대한 자신의 의견과 그렇게 생각한 이유가 드러나게 글을 쓴다" — 아이 화면 말은 4학년 교과서 말 "의견·이유"
// 칸은 🧩 국어 퍼즐과 같은 꼴(주제마다 { box, due, at, miss, d0 } · 병합도 korpuzzle.mergePuzzles) ·
// 그날 처음 끝낸 판에 💰 + 🎯 논술 포켓몬 잡기 한 번 — 잡기 기회는 국어(korThrow)와 따로 센다(nonsulThrow, 같은 세 카운터 꼴)
// 🎯 ⭐ (v338, 2026-10-25 — 둘째 판부터 ⚡·⭐뿐이라 더 할 까닭이 안 보였다 → 기본안 "이대로"): 주제를 처음 ⭐로 끝낼 때도 잡기 한 번 —
//   국어 글의 "별을 새로 받을 때마다"와 같은 꼴 · 주제마다 평생 한 번 · 같은 주제를 같은 날 다시 푼 ⭐는 빼고(⚡와 같은 하루 한 번)
// ✍️ 짧은 글 (v304 — 아버님 물음 넷 모두 추천안): 판을 끝낸 주제를 칸마다 머리말(나는 · 왜냐하면 · 또 · 물론 · 그래도 나는) 채우기로 →
//   국어 ✍️ 생각 쓰기와 같은 장부·왕복·보상(korwrite.js — 카드 열쇠 N## · 주제마다 평생 한도) · 채점 기준은 원고의 write 하나를 모든 주제가 같이 쓴다
// 💡 내 이유 한 줄 (v355 — 아버님 「추천대로」): 판 끝 「내가 만든 글」 아래 「또, …」 한 줄 → 같은 장부·왕복(카드 열쇠 R##) · 채점 기준은 원고의 reason
import { dayNum, throwsOf, pendingOf, PAST_MAX, FRAME_GAP, KOR_XP } from './korean.js';
import { stateOf, wordsOf, wordDaysOf, wordsToday } from './korwords.js';
import { shuffledOrder } from './korpuzzle.js';
import { normText, bareText, writesOf, cardWriteState, writeCheck, writeAddRule, WRITE_MAX_HI } from './korwrite.js';

/** 그날 처음 끝낸 판의 💰 */
export const NONSUL_COINS = 10;
/** ⭐ — 처음부터 한 번도 안 틀리고 끝낸 주제 (그 뒤엔 연습으로만) */
export const SOLVED = 1;
/** 편마다 이유 수 · 상관없는 말 수 (원고 검사가 정확히 본다) */
export const REASONS = 3;
export const OFFS = 2;
export const SIDES = ['yes', 'no'];
/** 판의 걸음 — ① 의견 ② 이유 둘 ③ 반대 의견 ④ 글 순서 */
export const STEPS = ['side', 'reasons', 'counter', 'order'];
/** ④ 글 순서에서 차례가 아닌 조각을 눌렀을 때 — 지금 와야 할 조각의 실마리 */
export const ORDER_HINTS = [
  '글은 내 의견(나는 …)으로 시작해요.',
  '이유(첫째 · 둘째)는 내 의견 다음이에요.',
  '반대 의견(물론 …)은 이유 다음이에요.',
  '정리(그래도 나는 …)는 맨 끝이에요.',
];
const ID_RE = /^N\d{1,3}$/;
const LABEL_MAX = 16;
const SENT_MAX = 40;
const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v) => typeof v === 'string' && v.trim().length > 0;

export const otherSide = (side) => (side === 'yes' ? 'no' : 'yes');

// ── 📖 독서 논술 (v316, 2026-10-22 아버님 "이대로") — 진우가 ★를 받은 이야기로 만든 주제 ──
// 칸 card = 이어진 국어 글(K##) · intro = 📖 한 줄 소개 · 편마다 ev = 이유마다 근거 줄 번호(글에 없는 내 생각으로 드는 이유는 []) ·
// off = 글에 있지만 상관없는 말 하나(ev) + 글에 없는 지어낸 말 하나(made — 진우가 국어에서 가장 많이 하는 잘못 읽기 "지어내기"를 같이 연습)
// 판의 흐름·보상·짧은 글은 다른 주제와 같다 · 줄 번호가 그 글 안에 있는지는 시험이 국어 원고와 맞춰 본다(이 파일은 국어 원고를 모른다)
/** 📖 한 줄 소개 글자 수 상한 */
export const INTRO_MAX = 70;
const CARD_RE = /^K\d{1,3}$/;
const EV_MAX = 99;
const evOk = (ev) => Array.isArray(ev) && ev.every((k) => Number.isInteger(k) && k >= 1 && k <= EV_MAX);
/** 독서 논술 칸의 틀린 곳 */
function readingProblems(t, id) {
  const bad = [];
  if (typeof t.card !== 'string' || !CARD_RE.test(t.card)) bad.push(`${id}: card는 국어 글 K##`);
  if (!str(t.intro) || !t.intro.endsWith('요.') || [...t.intro].length > INTRO_MAX) bad.push(`${id}: 한 줄 소개(intro)는 "…요." ${INTRO_MAX}자까지`);
  for (const side of SIDES) {
    const s = t[side];
    if (!isObj(s) || !Array.isArray(s.ev) || s.ev.length !== REASONS || !s.ev.every(evOk)) bad.push(`${id} ${side}: ev는 이유마다 근거 줄 번호 목록(${REASONS}칸 · 생각 이유는 [])`);
    else if (!s.ev.some((e) => e.length)) bad.push(`${id} ${side}: 글에 근거가 있는 이유가 하나는 있어야 해요`);
  }
  if (Array.isArray(t.off) && t.off.length === OFFS) {
    const made = t.off.filter((o) => isObj(o) && o.made === true);
    const real = t.off.filter((o) => isObj(o) && o.made !== true);
    if (made.length !== 1 || real.length !== 1) bad.push(`${id}: 상관없는 말은 글에 있는 말 하나(ev) + 지어낸 말 하나(made)`);
    else {
      if (!evOk(real[0].ev) || !real[0].ev.length) bad.push(`${id}: 글에 있는 상관없는 말에 근거 줄(ev)`);
      if (made[0].ev !== undefined) bad.push(`${id}: 지어낸 말에는 근거 줄이 없어요`);
      if (!String(made[0].why).startsWith('글에 없는 이야기예요')) bad.push(`${id}: 지어낸 말의 까닭은 "글에 없는 이야기예요"로 시작`);
    }
  }
  return bad;
}
/** 📖 그 국어 글로 만든 독서 논술 주제 (순수 — 없으면 null) */
export function readingTopicOf(list, cardId) {
  return (Array.isArray(list) ? list : []).find((t) => t && t.card === cardId) || null;
}

/** 주제 하나의 틀린 곳 목록 (비면 통과) */
function topicProblems(t) {
  const bad = [];
  if (!isObj(t)) return ['주제가 객체가 아님'];
  const id = str(t.id) ? t.id : '?';
  if (!ID_RE.test(id)) bad.push(`${id}: 번호는 N숫자`);
  if (!str(t.icon)) bad.push(`${id}: 아이콘 없음`);
  if (!str(t.q) || !t.q.endsWith('까요?')) bad.push(`${id}: 물음은 "…까요?"`);
  for (const side of SIDES) {
    const s = t[side];
    if (!isObj(s)) { bad.push(`${id} ${side}: 편이 없음`); continue; }
    if (!str(s.label) || s.label.length > LABEL_MAX) bad.push(`${id} ${side}: 라벨(1~${LABEL_MAX}자)`);
    if (!str(s.claim) || !s.claim.startsWith('나는 ') || !s.claim.endsWith('생각해요.')) bad.push(`${id} ${side}: 의견 문장은 "나는 … 생각해요."`);
    if (!str(s.close) || !s.close.startsWith('그래도 나는 ') || !s.close.endsWith('생각해요.')) bad.push(`${id} ${side}: 정리 문장은 "그래도 나는 … 생각해요."`);
    if (str(s.close) && str(s.claim) && s.close.replace('그래도 ', '') === s.claim) bad.push(`${id} ${side}: 정리가 의견과 같음`);
    if (!Array.isArray(s.reasons) || s.reasons.length !== REASONS) { bad.push(`${id} ${side}: 이유는 ${REASONS}개`); continue; }
    for (const r of s.reasons) if (!str(r) || !r.endsWith('요.') || r.length > SENT_MAX) bad.push(`${id} ${side}: 이유는 "…요." ${SENT_MAX}자까지 — ${r}`);
  }
  if (!Array.isArray(t.off) || t.off.length !== OFFS) bad.push(`${id}: 상관없는 말은 ${OFFS}개`);
  else for (const o of t.off) if (!isObj(o) || !str(o.t) || !str(o.why) || o.t.length > SENT_MAX) bad.push(`${id}: 상관없는 말은 { t, why } — ${o && o.t}`);
  if (t.card !== undefined) bad.push(...readingProblems(t, id));
  if (!bad.length) {
    const all = [...t.yes.reasons, ...t.no.reasons, ...t.off.map((o) => o.t)];
    if (new Set(all).size !== all.length) bad.push(`${id}: 겹치는 문장`);
  }
  return bad;
}

/**
 * ✍️ 짧은 글 채점 기준 검사 (원고 write 하나 — 모든 주제가 같이 쓴다) → 틀린 곳 목록
 * { v 판 번호(물음·rubric을 고치면 올린다), q 물음(주제마다 같은 말 — 주제는 todo의 제목), rubric { must ≥1, ok, miss }, past [{ v, q, rubric }] 옛 판 }
 * rubric은 공개 원고(앱은 보여 주지 않는다) — Claude가 세션이 바뀌어도 같은 잣대로 (국어 ✍️와 같다)
 */
export function checkNonsulWrite(w, key = 'write') {
  if (!isObj(w)) return [`${key}는 { v, q, rubric }`];
  const bad = [];
  const strs = (a) => Array.isArray(a) && a.every(str);
  const edition = (x, name) => {
    if (!str(x.q)) bad.push(`${name}.q(물음)가 비었어요`);
    if (!isObj(x.rubric) || !strs(x.rubric.must) || !x.rubric.must.length) bad.push(`${name}.rubric.must(꼭 들어갈 것)가 하나 이상`);
    else if (!strs(x.rubric.ok) || !strs(x.rubric.miss)) bad.push(`${name}.rubric.ok·miss는 글 목록`);
  };
  const vOk = Number.isInteger(w.v) && w.v > 0;
  if (!vOk) bad.push(`${key}.v(채점 기준 판 번호)는 1부터`);
  edition(w, key);
  if (w.past !== undefined) {
    if (!Array.isArray(w.past) || w.past.length > PAST_MAX) bad.push(`${key}.past(옛 판)는 ${PAST_MAX}개까지의 목록`);
    else {
      const seen = new Set();
      w.past.forEach((x, k) => {
        const name = `${key}.past ${k + 1}`;
        if (!isObj(x)) { bad.push(`${name}은 { v, q, rubric }`); return; }
        if (!Number.isInteger(x.v) || x.v <= 0 || (vOk && x.v >= w.v) || seen.has(x.v)) bad.push(`${name}의 v는 1부터, 지금 판보다 작게, 겹치지 않게`);
        seen.add(x.v);
        edition(x, name);
      });
    }
  }
  return bad;
}

/** 원고(coach/korean/nonsul.json) 형식 검사 → 틀린 곳 목록(비면 통과) — check.mjs가 배포 전에, 화면은 allTopics로 깨진 주제를 뺀다 */
export function checkNonsul(json) {
  const list = isObj(json) && Array.isArray(json.topics) ? json.topics : null;
  if (!list || !list.length) return ['topics가 없음'];
  // 💡 내 이유 채점 기준 (v355) — 없으면 칸만 안 뜬다(nonsulReasonCards가 []) · 있으면 꼴을 본다 (지금 원고에 있는지는 시험이 본다)
  const bad = [...checkNonsulWrite(json.write), ...(json.reason === undefined ? [] : checkNonsulWrite(json.reason, 'reason'))];
  const ids = new Set();
  for (const t of list) {
    bad.push(...topicProblems(t));
    if (isObj(t) && str(t.id)) { if (ids.has(t.id)) bad.push(`${t.id}: 번호가 겹침`); ids.add(t.id); }
  }
  return bad;
}

/** 쓸 수 있는 주제만 (깨진 주제는 조용히 뺀다 — 배포 전 검사는 checkNonsul) */
export function allTopics(json) {
  const list = isObj(json) && Array.isArray(json.topics) ? json.topics : [];
  const seen = new Set();
  return list.filter((t) => !topicProblems(t).length && !seen.has(t.id) && !!seen.add(t.id));
}

/** ⭐ 주제인가 */
export function isSolved(st) {
  return !!st && stateOf(st).box >= SOLVED;
}

/**
 * 새 주제는 하루 NEW_TOPICS_PER_DAY개까지 (v370, 2026-10-30 아버님 「추천대로」 — 넷째 묶음 30개를 이틀 만에 다 해서 다음 묶음까지 비었다) —
 * 오늘 처음 끝낸 주제(d0)를 센다(🔤 국어 낱말 NEW_PER_DAY와 같은 꼴) · 다시 볼 주제·⭐ 연습은 그대로 · 📖 국어 글 끝 단추로 여는 주제는 막지 않는다
 */
export const NEW_TOPICS_PER_DAY = 4;
const newToday = (st, today) => Object.values(st).filter((s) => s.d0 === today).length;

/** 오늘 새 주제를 다 열었는데 원고에 안 해 본 주제가 남았나 (순수) — 아이 화면 「새 주제는 내일 또 와요」(셈 없이) */
export function nonsulWaitNew(list, states, now) {
  const st = wordsOf(states);
  const ls = Array.isArray(list) ? list : [];
  return newToday(st, dayNum(now)) >= NEW_TOPICS_PER_DAY && ls.some((t) => !own(st, t.id));
}

/**
 * 오늘 할 주제 하나 — 다시 볼 것(틀린 날 다음 날부터, 오래 기다린 것부터) → 새 주제(원고 차례 · 하루 NEW_TOPICS_PER_DAY개까지) · 없으면 null ·
 * practice면 ⭐ 주제를 연습으로(오래 안 본 것부터)
 */
export function planTopic(list, states, now, practice = false) {
  const today = dayNum(now);
  const st = wordsOf(states);
  const ls = Array.isArray(list) ? list : [];
  if (practice) {
    const pool = ls.filter((t) => own(st, t.id) && st[t.id].box >= SOLVED).sort((a, b) => st[a.id].at - st[b.id].at);
    return pool.length ? pool[0].id : null;
  }
  const due = ls.filter((t) => own(st, t.id) && st[t.id].box < SOLVED && st[t.id].due <= today).sort((a, b) => st[a.id].due - st[b.id].due);
  if (due.length) return due[0].id;
  if (newToday(st, today) >= NEW_TOPICS_PER_DAY) return null;
  const fresh = ls.find((t) => !own(st, t.id));
  return fresh ? fresh.id : null;
}

/** 섞기 — 원본은 그대로 */
function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.max(0, Math.min(i, Math.floor((Number(rng()) || 0) * (i + 1)))); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
/** 0..n-1 중 k개를 고른다(차례는 고른 차례) */
function pickIdx(n, k, rng) {
  return shuffle(Array.from({ length: n }, (_, i) => i), rng).slice(0, k);
}

/**
 * 판에 낼 보기 (순수) — 내 의견 side가 정해진 뒤.
 *   reasons(② 보기 넷): 내 편 이유 둘(셋 중) · 반대편 이유 하나(셋 중) · 상관없는 말 하나(둘 중)
 *   counter(③ 보기 셋): ②에 안 나온 반대편 이유(정답) · ②에 안 나온 내 편 이유 · ②에 안 나온 상관없는 말 — 한 판에 같은 문장이 두 번 안 나온다
 * 보기마다 { t, k: 'mine'|'other'|'off', why } — why는 틀린 보기를 골랐을 때의 한 줄
 */
export function dealTopic(t, side, rng = Math.random) {
  const me = t[side];
  const you = t[otherSide(side)];
  const mi = pickIdx(REASONS, 2, rng);
  const yi = pickIdx(REASONS, 2, rng);
  const oi = pickIdx(OFFS, 2, rng);
  const mineLeft = [0, 1, 2].find((i) => !mi.includes(i));
  const otherWhy = `이 이유는 「${you.label}」 쪽 의견을 돕는 말이에요.`;
  const reasons = shuffle([
    { t: me.reasons[mi[0]], k: 'mine', why: '' },
    { t: me.reasons[mi[1]], k: 'mine', why: '' },
    { t: you.reasons[yi[0]], k: 'other', why: otherWhy },
    { t: t.off[oi[0]].t, k: 'off', why: t.off[oi[0]].why },
  ], rng);
  const counter = shuffle([
    { t: you.reasons[yi[1]], k: 'other', why: '' },
    { t: me.reasons[mineLeft], k: 'mine', why: '이건 내 의견을 돕는 이유예요 — 친구는 반대 의견이에요.' },
    { t: t.off[oi[1]].t, k: 'off', why: t.off[oi[1]].why },
  ], rng);
  return { reasons, counter, order: shuffledOrder(4, rng) };
}

/** 고른 것으로 만든 글 네 조각 (순수) — ④ 글 순서와 판 끝 「내가 만든 글」이 같은 글 · picks = ②에서 고른 내 편 이유 둘(고른 차례) */
export function essayParts(t, side, picks, counter) {
  const me = t[side];
  const [a, b] = Array.isArray(picks) ? picks : [];
  return [me.claim, `첫째, ${a} 둘째, ${b}`, `물론 이렇게 말하는 친구도 있을 거예요. “${counter}”`, me.close];
}

const big = (n) => Math.min(Number.MAX_SAFE_INTEGER, n);
const cnt = (v) => { const n = Math.floor(Number(v)); return Number.isSafeInteger(n) && n > 0 ? n : 0; };

/**
 * 논술 한 판을 끝냈다 — 한 트랜잭션에서: 그 주제의 칸 · 그날 처음 끝낸 판이면 💰 + 🎯 논술 잡기 기회 하나 ·
 *   주제를 처음 ⭐로 끝냈으면 🎯 하나 더(starCatch — 그 주제를 오늘 앞서 푼 적이 없을 때만, v338)
 * @param {object} profile 저장된 프로필 (mutateProfile 안)
 * @param {{id:string, ok:boolean, from?:number}} ans ok = 처음부터 한 번도 안 틀렸나 · from = 판을 시작할 때 그 주제의 at(새 주제면 0) —
 *   그 사이 다른 창이 그 주제를 옮겼으면 이 판은 연습(🧩 국어 퍼즐과 같다)
 * @param {number} now 트랜잭션 안의 시각
 * @param {string[]} ids 지금 있는 주제 id (모르는 주제는 안 받는다)
 */
export function nonsulRule(profile, ans, now, ids) {
  const id = ans && typeof ans.id === 'string' ? ans.id : '';
  if (!id || !(Array.isArray(ids) ? ids : []).includes(id)) return { ok: false, why: 'empty' };
  const today = dayNum(now);
  const at = cnt(now);
  const st = wordsOf(profile.nonsul);
  const cur = st[id] || stateOf(null);
  const stale = ans.from !== undefined && Number(ans.from) !== cur.at;
  const practice = stale || cur.box >= SOLVED;
  // ⚡ (v327) — 연습(⭐ 주제·낡은 판·[다시 저장])은 0 · 같은 주제는 하루 한 번(오늘 이미 푼 주제면 0) · 한 번도 안 틀리면 더
  const xp = !practice && dayNum(cur.at) !== today ? KOR_XP.nonsul + (ans.ok === true ? KOR_XP.nonsulClean : 0) : 0;
  let solved = false;
  if (!practice) {
    const d0 = own(st, id) ? cur.d0 : today; // 처음 끝낸 날은 칸이 처음 생길 때만 — d0 없는 옛 칸을 다시 풀어도 오늘 새 주제로 안 센다(Codex 174차)
    const wat = big(Math.max(at, cur.at + 1)); // 고친 때는 늘 앞으로
    if (ans.ok === true) { st[id] = { box: SOLVED, due: 0, at: wat, miss: cur.miss, d0 }; solved = true; }
    else st[id] = { box: 0, due: today + 1, at: wat, miss: big(cur.miss + 1), d0 };
  }
  profile.nonsul = st;
  // 🎯 ⭐ (v338) — 처음 ⭐ = 연습이 아닌 판(⭐ 주제·낡은 판은 solved가 안 선다) · 같은 날 틀린 뒤 바로 다시 푼 ⭐는 안 준다
  const starCatch = solved && dayNum(cur.at) !== today;
  const first = !wordsToday(profile.nonsulDay, now);
  const days = wordDaysOf(profile.nonsulDay, today);
  let coins = 0;
  if (first) {
    coins = NONSUL_COINS;
    days[today] = 1;
    profile.coins = (Number(profile.coins) || 0) + coins;
    profile.coinsEarned = (Number(profile.coinsEarned) || 0) + coins;
  }
  const add = (first ? 1 : 0) + (starCatch ? 1 : 0);
  if (add) {
    const tw = throwsOf(profile.nonsulThrow);
    tw.earned = big(tw.earned + add);
    profile.nonsulThrow = tw;
  }
  profile.nonsulDay = wordDaysOf(days, today);
  return { ok: true, first, coins, xp, throws: pendingOf(profile.nonsulThrow), solved, starCatch, practice };
}

/** 🎯 논술 잡기 기회 하나 빼기 (잡기 화면을 띄우기 전, 한 트랜잭션) — why 'none' 남은 기회 없음 */
export function nonsulTakeRule(profile) {
  const t = throwsOf(profile.nonsulThrow);
  if (t.earned - t.used + t.refunded <= 0) return { ok: false, why: 'none' };
  t.used += 1;
  profile.nonsulThrow = t;
  return { ok: true, left: pendingOf(t) };
}
/** 🎯 뺐는데 한 번도 안 던졌다 → 돌려준다 (뺀 수보다 많이 돌려주지 않는다) — why 'none' */
export function nonsulGiveBackRule(profile) {
  const t = throwsOf(profile.nonsulThrow);
  if (t.refunded >= t.used) return { ok: false, why: 'none' };
  t.refunded += 1;
  profile.nonsulThrow = t;
  return { ok: true, left: pendingOf(t) };
}

/** 판을 끝낸 말 (순수 · 아이 화면 — 셈 없이) — nonsulRule 결과 → { title, lines } */
export function nonsulFinishText(res) {
  if (!res || !res.ok) {
    if (res && res.why === 'empty') return { title: '저장할 주제가 없어요', lines: ['🖊️ 논술 처음으로 돌아가 다시 시작해 주세요'] };
    return { title: '저장이 안 됐어요', lines: ['[다시 저장하기]를 눌러 주세요 — 고른 것은 그대로예요'] };
  }
  const lines = [];
  if (res.first) lines.push(`💰 +${res.coins} · 🎯 논술 포켓몬 잡기 1번`);
  else lines.push('오늘의 💰는 이미 받았어요 — 한 것은 기록에 들어갔어요');
  // 🎯 ⭐ (v338) — 처음 ⭐면 잡기 한 번 더 · 틀린 판이면 다음에 ⭐로 끝낼 까닭을 (연습 판은 ⭐가 더 안 생기니 말하지 않는다)
  if (res.solved) lines.push(res.starCatch ? `⭐ 처음부터 다 맞혔어요! · 🎯 논술 포켓몬 잡기 1번${res.first ? ' 더' : ''}` : '⭐ 처음부터 다 맞혔어요!');
  else if (!res.practice) lines.push('다음에 이 주제를 처음부터 다 맞히면 ⭐와 🎯 논술 포켓몬 잡기!');
  const title = res.first ? '🖊️ 오늘의 논술 끝!' : res.practice ? '🖊️ 논술 연습 끝!' : '🖊️ 논술 더 하기 끝!';
  return { title, lines };
}
/** 오늘 보상 말 (순수) — wordsToday(nonsulDay) 0·1 · canStar = 오늘 ⭐를 받을 수 있는 주제가 남았나(planTopic이 주제를 줄 때) → 한 줄 */
export function nonsulTodayLine(today, canStar = true) {
  if (today >= 1) return canStar ? '오늘의 논술 끝 ✅ — 처음부터 다 맞히면 ⭐와 🎯 논술 포켓몬 잡기!' : '오늘의 논술 끝 ✅';
  return `오늘 처음 끝내면 💰${NONSUL_COINS} · 🎯 논술 포켓몬 잡기 1번${canStar ? ' · 처음부터 다 맞히면 ⭐와 🎯 하나 더' : ''}`;
}

/** 📊·📤 한 줄 (순수 · 아빠 화면) — ⭐ 주제 · 다시 볼 주제 · 해 본 주제 · 최근 7일 판을 끝낸 날 */
export function nonsulReport(list, states, days, now) {
  const st = wordsOf(states);
  const ls = Array.isArray(list) ? list : [];
  const today = dayNum(now);
  const solved = ls.filter((t) => own(st, t.id) && st[t.id].box >= SOLVED).length;
  const again = ls.filter((t) => own(st, t.id) && st[t.id].box < SOLVED).length;
  const tried = ls.filter((t) => own(st, t.id)).length;
  const dd = wordDaysOf(days, today);
  const week = Object.keys(dd).filter((k) => Number(k) > today - 7 && Number(k) <= today).length;
  return `🖊️ 논술: ⭐ 처음부터 다 맞힌 주제 ${solved}/${ls.length} · 다시 볼 주제 ${again} · 해 본 주제 ${tried} · 최근 7일 중 판을 끝낸 날 ${week}`;
}

// ───────────────────── ✍️ 짧은 글 (v304) ─────────────────────

/** 짧은 글 길이 상한 — 머리말 넷이 들어가 국어 ✍️(200자)보다 길게 */
export const NONSUL_WRITE_MAX = WRITE_MAX_HI;
/** 꼭 채울 칸(의견·이유)의 글자·숫자 수 하한 — 머리말만 두고 보내지 않게 */
export const ESSAY_FIELD_MIN = 2;
/**
 * ✍️ 짧은 글 칸 — 머리말(head)은 고정, 아이는 뒤만 쓴다 (판에서 익힌 순서 그대로) ·
 * need = 이 칸을 채워야 보낸다(의견·이유 — 나머지 빈 칸은 글에서 빠지고 답장에서 다음 걸음으로) · 「또」는 이유 하나 더(안 써도 된다)
 */
export const ESSAY_HEADS = [
  { k: 'claim', icon: '💭', label: '내 의견', head: '나는', ph: '… 생각해요.', need: true },
  { k: 'why', icon: '💡', label: '이유', head: '왜냐하면', ph: '… 때문이에요.', need: true },
  { k: 'more', icon: '', label: '', head: '또', ph: '이유를 하나 더 (안 써도 돼요)', need: false },
  { k: 'counter', icon: '🙋', label: '반대 의견', head: '물론', ph: '… 말하는 친구도 있을 거예요.', need: false },
  { k: 'close', icon: '🏁', label: '정리', head: '그래도 나는', ph: '… 생각해요.', need: false },
];
/** 머리말을 문장 틀 꼴로 — korwrite.ownLen이 머리말을 "내 말"로 세지 않게 · 「또」는 한 글자라 뺀다(다른 낱말 속 「또」까지 지우지 않게) */
export const ESSAY_FRAMES = ESSAY_HEADS.filter((h) => h.k !== 'more').map((h) => `${h.head} ${FRAME_GAP}`);
const ENDS = /[.!?…]$/u;
/** 칸 하나 다듬기 — 공백 정리 · 아이가 머리말을 다시 쓴 것은 한 번만(「나는 나는 …」이 되지 않게) */
function fieldText(h, v) {
  const t = normText(v);
  if (t === h.head) return '';
  return t.startsWith(`${h.head} `) ? t.slice(h.head.length + 1).trim() : t;
}
const ownChars = (t) => [...bareText(t).replace(/\s/g, '')].length;

/** ✍️ 칸들 → 보낼 글 (순수) — 채운 칸만 「머리말 + 글」로 · 끝에 마침표·물음표가 없으면 마침표 · 빈 칸(문장부호만 있는 칸도)은 글에서 빠진다 */
export function composeEssay(fields) {
  const f = isObj(fields) ? fields : {};
  const out = [];
  for (const h of ESSAY_HEADS) {
    const t = fieldText(h, f[h.k]);
    if (!ownChars(t)) continue;
    out.push(`${h.head} ${t}${ENDS.test(t) ? '' : '.'}`);
  }
  return out.join(' ');
}
/** ✍️ 보낼 수 있나 (순수) — { ok, n, why } · why: 'claim'·'why'(그 칸이 비었음) · 'short'·'long'·'own'(korwrite.writeCheck — 상한 NONSUL_WRITE_MAX) */
export function essayCheck(fields) {
  const f = isObj(fields) ? fields : {};
  for (const h of ESSAY_HEADS) if (h.need && ownChars(fieldText(h, f[h.k])) < ESSAY_FIELD_MIN) return { ok: false, n: 0, why: h.k };
  return writeCheck(composeEssay(f), ESSAY_FRAMES, NONSUL_WRITE_MAX);
}

/**
 * ✍️ 서술형 카드 (순수) — 쓸 수 있는 주제마다 { id, icon, title: 주제 물음, write } (korwrite가 국어 카드와 같은 꼴로 받는다) ·
 * 채점 기준(write)이 깨졌으면 [] — 그땐 짧은 글을 열지 않는다(답장을 받을 기준이 없다)
 */
export function nonsulWriteCards(json) {
  const w = isObj(json) ? json.write : null;
  if (checkNonsulWrite(w).length) return [];
  const write = { v: w.v, q: w.q, rubric: w.rubric, past: Array.isArray(w.past) ? w.past : [], frames: ESSAY_FRAMES, max: NONSUL_WRITE_MAX };
  return allTopics(json).map((t) => ({ id: t.id, icon: t.icon, title: t.q, write }));
}

/** 주제 하나의 짧은 글 표시 (순수 · 셈 없이) — 📬 답장 · ✉️ 기다림 · ✅ 끝 · ✍️ 다시 써 보기 · '' 아직 안 씀 */
export function essayTag(w) {
  if (!w) return '';
  if (w.unread) return '📬 아빠 답장이 왔어요';
  if (w.pending) return '✉️ 답장 기다리는 중';
  if (w.done) return '✅ 끝';
  if (w.lastGraded) return '✍️ 다시 써 볼 수 있어요';
  return '';
}
/** ✍️ 첫 화면 목록 (순수) — 판을 끝낸 주제만(원고 차례) [{ id, icon, q, tag }] */
export function essayTopics(list, states, writes) {
  const st = wordsOf(states);
  return (Array.isArray(list) ? list : []).filter((t) => own(st, t.id)).map((t) => ({ id: t.id, icon: t.icon, q: t.q, tag: essayTag(cardWriteState(writes, t.id)) }));
}

/** 📤 국어 요약 🖊️ 절의 짧은 글 줄 (순수 · 아빠 화면) — 논술 주제(N##) 글만 */
export function essayReport(writes) {
  const w = writesOf(writes);
  const ids = Object.keys(w).filter((id) => ID_RE.test(id) && w[id].list.length);
  const entries = ids.flatMap((id) => w[id].list);
  if (!entries.length) return '✍️ 짧은 글: (아직 쓴 글 없음)';
  const ok = ids.filter((id) => cardWriteState(w, id).done).length;
  return `✍️ 짧은 글: 쓴 글 ${entries.length}개 (주제 ${ids.length}개) · 답장 받은 글 ${entries.filter((e) => e.grade).length}개 · 답장 기다리는 글 ${entries.filter((e) => !e.grade).length}개 · ✅까지 간 주제 ${ok}개`;
}

// ───────────────────── 💡 내 이유 한 줄 (v355) ─────────────────────
// 2026-10-28 아버님 「추천대로」 — 판은 고르기만 하면 끝나고 ✍️ 짧은 글은 칸이 다섯이라 무겁다 → 판을 끝낸 그 자리에서 한 줄만:
//   판 끝 「내가 만든 글」 아래 「또, …」 칸 하나(안 써도 판·⭐·🎯 그대로) · ⭐ 주제 연습 판에서도 · 답장 기다리는 주제·✅ 주제엔 칸이 안 뜬다
//   같은 ✍️ 장부·왕복(korwrite — 카드 열쇠 R## = 그 주제 N##의 번호) · 보낼 글 = 판에서 고른 의견 문장 + 「또, 한 줄」(채점할 때 편이 보이게)
//   보상: 보내면 💰5(카드마다 처음 한 번 — writeAddRule) · ✅면 🎯 논술 포켓몬 잡기 1번(카드마다 한 번 — writeReplyRule) · 🔸·🔁는 보상 없이 다시 · 🟩 없음
//   채점 기준은 원고 reason(짧은 글 write와 따로 — 한 줄은 반대 의견·정리가 없어서) · 판 보기를 그대로 옮기면 🔸
/** 한 줄의 「내 말」 글자·숫자 하한 · 한 줄 글자 수 상한 */
export const REASON_MIN = 5;
export const REASON_MAX = 60;
/** 한 줄 머리말 */
export const REASON_HEAD = '또,';
const REASON_ID_RE = /^R\d{1,3}$/;
/** 주제 N## → 내 이유 카드 R## */
export const reasonCardId = (topicId) => `R${String(topicId).slice(1)}`;
/** 카드 R## → 주제 N## ('' = 내 이유 카드가 아님) */
export const reasonTopicId = (cardId) => (REASON_ID_RE.test(String(cardId)) ? `N${String(cardId).slice(1)}` : '');

/** 한 줄 다듬기 — 공백 정리 · 아이가 머리말 「또,」를 다시 쓴 것은 한 번만(「또래」 같은 낱말은 그대로) */
export function reasonLine(line) {
  return normText(line).replace(/^또\s*,\s*|^또\s+/u, '').trim();
}
/** 글에 붙일 한 줄 — 끝에 마침표·물음표가 없으면 마침표 */
export function reasonTail(line) {
  const l = reasonLine(line);
  return `${l}${ENDS.test(l) ? '' : '.'}`;
}
/** 보낼 수 있나 (순수) — { ok, n, why: 'short' | 'long' } · n = 한 줄 글자 수(화면엔 숫자를 안 띄운다) */
export function reasonCheck(line) {
  const t = reasonLine(line);
  const n = [...t].length;
  if (n > REASON_MAX) return { ok: false, n, why: 'long' };
  if (ownChars(t) < REASON_MIN) return { ok: false, n, why: 'short' };
  return { ok: true, n };
}
/** 보낼 글 (순수) — 판에서 고른 의견 문장 + 「또, 한 줄」 */
export function composeReason(t, side, line) {
  return `${t[side].claim} ${REASON_HEAD} ${reasonTail(line)}`;
}
/** 보내기 결과 말 (순수 · 아이 화면) */
export function reasonSendWhy(r) {
  const again = '저장을 못 했어요 — 한 번 더 눌러 주세요 (쓴 글은 그대로 있어요)';
  if (!r) return again;
  return ({
    short: '조금만 더 써 볼까요? 왜 그렇게 생각하는지요',
    own: '내 의견을 돕는 까닭을 내 말로 써 볼까요?', // 의견 문장을 그대로 옮기면 내 말이 없다(korwrite.writeCheck — 🔍 Codex 160차 #4: 「저장을 못 했어요」로 떠서 다시 눌러도 안 됐다)
    long: '한 줄로 조금 줄여 볼까요?',
    pending: '이 주제 내 이유는 벌써 보냈어요 — 아빠 답장을 기다려요',
    done: '✅ 이 주제 내 이유는 벌써 끝났어요',
    unplayed: '판을 끝낸 주제에만 쓸 수 있어요',
    unknown: '지금은 보낼 수 없어요',
  })[r.why] || again;
}

/**
 * 💡 내 이유 카드 (순수) — 쓸 수 있는 주제마다 { id: R##, topic: N##, icon, title: 주제 물음, write } · 채점 기준(reason)이 깨졌으면 [] (칸을 안 띄운다)
 * frames = 두 편의 의견 문장 — 글 앞에 붙는 의견을 「내 말」로 세지 않게(korwrite.ownLen) · 「또」는 한 글자라 뺀다(ESSAY_FRAMES와 같은 까닭)
 */
export function nonsulReasonCards(json) {
  const w = isObj(json) ? json.reason : null;
  if (checkNonsulWrite(w, 'reason').length) return [];
  const base = { v: w.v, q: w.q, rubric: w.rubric, past: Array.isArray(w.past) ? w.past : [] };
  return allTopics(json).map((t) => ({ id: reasonCardId(t.id), topic: t.id, icon: t.icon, title: t.q, write: { ...base, frames: [t.yes.claim, t.no.claim] } }));
}

/**
 * 💡 한 줄 보내기 (한 트랜잭션 — xp.nonsulReasonAdd) — 판을 끝낸 주제만(그 주제 칸이 저장돼 있어야) ·
 * 나머지는 ✍️ 글 보내기와 같다(writeAddRule — 답장 기다리는 글 하나 · ✅ 받은 카드는 끝 · 처음 보낸 글 💰5)
 * why: 'unknown'(주제·편이 없음 · 카드 없음) · 'unplayed'(판을 안 끝낸 주제) · 'short' · 'long' · 'pending' · 'done'
 */
export function reasonAddRule(profile, t, side, line, now, cards) {
  if (!isObj(t) || !ID_RE.test(String(t.id)) || !SIDES.includes(side) || !isObj(t[side]) || !str(t[side].claim)) return { ok: false, why: 'unknown' };
  if (!own(wordsOf(profile.nonsul), t.id)) return { ok: false, why: 'unplayed' };
  const chk = reasonCheck(line);
  if (!chk.ok) return { ok: false, why: chk.why, n: chk.n };
  return writeAddRule(profile, reasonCardId(t.id), composeReason(t, side, line), now, cards);
}

/** 📤 국어 요약 🖊️ 절의 내 이유 줄 (순수 · 아빠 화면) */
export function reasonReport(writes) {
  const w = writesOf(writes);
  const ids = Object.keys(w).filter((id) => REASON_ID_RE.test(id) && w[id].list.length);
  const entries = ids.flatMap((id) => w[id].list);
  if (!entries.length) return '💡 내 이유 한 줄: (아직 보낸 줄 없음)';
  const ok = ids.filter((id) => cardWriteState(w, id).done).length;
  return `💡 내 이유 한 줄: 보낸 줄 ${entries.length}개 (주제 ${ids.length}개) · 답장 받은 줄 ${entries.filter((e) => e.grade).length}개 · 답장 기다리는 줄 ${entries.filter((e) => !e.grade).length}개 · ✅ 주제 ${ok}개`;
}
