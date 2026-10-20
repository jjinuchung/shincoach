// 🖊️ 논술 (v303, 2026-10-20 — 아버님 "논술 과목을 한 번 만들어볼까?") — 규칙만 (화면 없음 · check.mjs·시험이 같이 쓴다)
// 생활 속 찬반 주제 한 판: ① 내 의견 정하기(정답 없음) ② 내 의견에 맞는 이유 둘(보기 넷 — 내 편 둘 · 반대편 하나 · 상관없는 말 하나)
//   ③ 친구가 반대로 말한다면(반대편 이유 · 내 편 이유 · 상관없는 말) ④ 글 순서(내 의견 → 이유 둘 → 반대 의견 → 정리) → 고른 것으로 만든 글
// 2022 [4국03-03] "대상에 대한 자신의 의견과 그렇게 생각한 이유가 드러나게 글을 쓴다" — 아이 화면 말은 4학년 교과서 말 "의견·이유"
// 칸은 🧩 국어 퍼즐과 같은 꼴(주제마다 { box, due, at, miss, d0 } · 병합도 korpuzzle.mergePuzzles) ·
// 그날 처음 끝낸 판에 💰 + 🎯 논술 포켓몬 잡기 한 번 — 잡기 기회는 국어(korThrow)와 따로 센다(nonsulThrow, 같은 세 카운터 꼴)
import { dayNum, throwsOf, pendingOf } from './korean.js';
import { stateOf, wordsOf, wordDaysOf, wordsToday } from './korwords.js';
import { shuffledOrder } from './korpuzzle.js';

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
  if (!bad.length) {
    const all = [...t.yes.reasons, ...t.no.reasons, ...t.off.map((o) => o.t)];
    if (new Set(all).size !== all.length) bad.push(`${id}: 겹치는 문장`);
  }
  return bad;
}

/** 원고(coach/korean/nonsul.json) 형식 검사 → 틀린 곳 목록(비면 통과) — check.mjs가 배포 전에, 화면은 allTopics로 깨진 주제를 뺀다 */
export function checkNonsul(json) {
  const list = isObj(json) && Array.isArray(json.topics) ? json.topics : null;
  if (!list || !list.length) return ['topics가 없음'];
  const bad = [];
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
 * 오늘 할 주제 하나 — 다시 볼 것(틀린 날 다음 날부터, 오래 기다린 것부터) → 새 주제(원고 차례) · 없으면 null ·
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
 * 논술 한 판을 끝냈다 — 한 트랜잭션에서: 그 주제의 칸 · 그날 처음 끝낸 판이면 💰 + 🎯 논술 잡기 기회 하나
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
  let solved = false;
  if (!practice) {
    const d0 = st[id] && cur.d0 ? cur.d0 : today;
    const wat = big(Math.max(at, cur.at + 1)); // 고친 때는 늘 앞으로
    if (ans.ok === true) { st[id] = { box: SOLVED, due: 0, at: wat, miss: cur.miss, d0 }; solved = true; }
    else st[id] = { box: 0, due: today + 1, at: wat, miss: big(cur.miss + 1), d0 };
  }
  profile.nonsul = st;
  const first = !wordsToday(profile.nonsulDay, now);
  const days = wordDaysOf(profile.nonsulDay, today);
  let coins = 0;
  if (first) {
    coins = NONSUL_COINS;
    days[today] = 1;
    const tw = throwsOf(profile.nonsulThrow);
    tw.earned = big(tw.earned + 1);
    profile.nonsulThrow = tw;
    profile.coins = (Number(profile.coins) || 0) + coins;
    profile.coinsEarned = (Number(profile.coinsEarned) || 0) + coins;
  }
  profile.nonsulDay = wordDaysOf(days, today);
  return { ok: true, first, coins, throws: pendingOf(profile.nonsulThrow), solved, practice };
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
  else lines.push('오늘 논술 보상은 이미 받았어요 — 한 것은 기록에 들어갔어요');
  if (res.solved) lines.push('⭐ 처음부터 다 맞혔어요!');
  const title = res.first ? '🖊️ 오늘의 논술 끝!' : res.practice ? '🖊️ 논술 연습 끝!' : '🖊️ 논술 더 하기 끝!';
  return { title, lines };
}
/** 오늘 보상 말 (순수) — wordsToday(nonsulDay) 0·1 → 한 줄 */
export function nonsulTodayLine(today) {
  if (today >= 1) return '오늘의 논술 끝 ✅ — 더 해도 ⭐는 모여요';
  return `오늘 처음 끝내면 💰${NONSUL_COINS} · 🎯 논술 포켓몬 잡기 1번`;
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
