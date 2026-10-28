// 📮 포켓몬 편지 — 순수 규칙 (화면 없음 · korean.js의 날 번호만 import — db·xp·upload·시험이 그대로 부른다)
// 화면은 lettersview.js · 원고 coach/english/letters.json = { v, grades, reply, letters: [{ id, en, ko, focus, body[], koText, ask, starter }] }
//
// 아버님 (2026-10-26): 아직 못 얻은 포켓몬이 영어 편지를 보내고, 진우가 포켓몬에 대해 아는 것을 영어 완성 문장으로 답장하면 선물 ·
//   정말 잘 쓰면 그 포켓몬 · 이상한 문장·뜻 없는 낱말이면 선물을 알맞게 줄인다
//   → 기본안 CeH6P2mTGrrL9WW3uEMxmb 「추천대로」(10-27) · 편지 전용 30마리 · 답장 150자 · 원고 30통 Ej95PSUckAVw4UVnVQJqd3 「이대로」
// 흐름 (✍️ 국어 생각 쓰기와 같은 비공개 왕복 — 배포 없음):
//   편지가 온다(한 번에 한 통) → 진우가 답장(150자가 차면 보낼 수 있다) → profile.letters.sent → 📤 비공개 저장소 letters/todo.json
//   → 아버님 「올라온 거 봐 줘」 → Claude가 판단(🌟·👍·🙂·✉️ — 원고 grades) + 포켓몬의 짧은 답장 → letters/replies.json
//   → 앱이 영어 화면을 열 때 읽어 그 글(mon, id)에 한 번만 붙이고 선물 (한 트랜잭션)
// 차례 (letterNow):
//  · 안 읽은 답장 → 답장 기다리는 글 → ✉️ 다시 써 볼 편지 → 새 편지(앞 편지의 답장을 읽은 다음 날 · 첫 편지는 이 판을 처음 연 다음 날)
//  · 새 편지 = 원고 차례에서 아직 끝나지 않았고(✉️ 아닌 답장을 받지 않음) 도감에 없는 첫 포켓몬 · 답장을 안 쓰면 그 편지가 그대로 기다린다(쌓이지 않음)
// 선물 (letterReplyRule — 앱이 정한다 · 답장 글은 선물을 말하지 않는다):
//  · 🌟 그 포켓몬이 친구가 된다(도감 +1) + 💰30 — 2주에 한 번까지(STAR_GAP) · 그 안이거나 이미 도감에 있으면 👍 상자로
//  · 👍 상자 하나 — 💰30 · 🔶 영어스톤 1 · 🔵 슈퍼볼 3 가운데 글 이름표(id)로 고른다(다시 받아도 같은 것) · 🙂 💰10 · ✉️ 선물 없음(같은 편지에 다시 쓴다)
// 저장의 집 규칙 (✍️ korwrite.js와 같은 꼴):
//  · 글 하나의 이름표 = id(at·포켓몬·글에서 늘 다시 만든다) · at은 트랜잭션 안에서 마지막 글보다 늘 크게 · 쓴 글은 고치지 않는다
//  · 답장은 그 글에만 · 없는 글(다른 사본)이면 남겨 둔다 · 같은 id에 다른 답장이 둘이면 둘 다 버린다 · 줄이 REPLY_ROWS_MAX를 넘으면 통째로 안 받는다
//  · 병합: 글은 id로 합집합(답장 붙은 쪽 · 둘 다면 먼저 붙은 쪽) · 읽은 시각은 이른 쪽 · start는 이른 날 · seen은 합집합 · star는 늦은 날
//  · 지갑(coins·items)·도감은 프로필 병합 규칙 그대로(db.js) — 한쪽에서만 받은 선물은 다시 붙지 않는다(국어 답장과 같음)
import { dayNum } from './korean.js';

/** 보낼 수 있는 답장 길이 — 띄어쓰기 포함 · 겹친 빈칸은 하나 · 한글은 안 셈 (아버님 10-27 「150자」) */
export const LETTER_LEN = 150;
/** 답장 글 끝 (글자 수 — letterCount가 아니라 쓴 글 그대로) */
export const LETTER_MAX = 600;
/** 🌟 그 포켓몬은 며칠에 한 번까지 (2주) */
export const STAR_GAP = 14;
/** 💰 — 🌟와 함께 · 🙂 */
export const STAR_COINS = 30;
export const OK_COINS = 10;
/** 👍 상자 — id로 셋 가운데 하나 */
export const BOX = [
  { k: 'coins', n: 30 },
  { k: 'stone', id: 'stone_english', n: 1 },
  { k: 'ball', id: 'greatball', n: 3 },
];
/** 판단 — 원고 grades와 같은 열쇠 */
export const GRADES = ['star', 'good', 'ok', 'again'];
export const GRADE_ICON = { star: '🌟', good: '👍', ok: '🙂', again: '✉️' };
/** 답장 칸 길이 끝 (글자) */
export const REPLY_TEXT_MAX = 500;
export const PS_MAX = 300;
/** 답장 파일 줄 수 끝 — 넘으면 하나도 받지 않는다(잘라 받지 않는다 — 국어 답장과 같은 까닭) */
export const REPLY_ROWS_MAX = 500;
/** 답장 받은 글은 최근 몇 개까지 남기나 (답장 기다리는 글은 안 셈 · 편지 30통 × 다시 쓰기를 넉넉히) */
export const KEEP_DONE = 120;
export const LETTER_ID_RE = /^l[0-9a-z]{14}$/;
/** 읽을 때 받아들이는 글 줄의 끝 — 깨진 큰 장부만 막는다(정리한 장부 둘을 합쳐도 이보다 훨씬 작아 차례에 따라 갈리지 않는다 — 🔍 Codex 155차 #2) */
const RAW_SENT_MAX = 4000;
const SEEN_MAX = 200;

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const cnt = (v) => { const n = Math.floor(Number(v)); return Number.isSafeInteger(n) && n > 0 ? n : 0; };
const monOf = (v) => (Number.isSafeInteger(v) && v > 0 && v < 100000 ? v : 0);
const minPos = (a, b) => (a && b ? Math.min(a, b) : a || b);
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// ───────────────────── 글 ─────────────────────

/** 쓴 글 다듬기 — 빈칸·탭은 하나로, 줄바꿈은 하나로(앞뒤 빈칸 없이), 앞뒤 빈칸 없이 · 보이지 않는 조종 글자는 뺀다 */
export function normLetter(s) {
  return String(s == null ? '' : s)
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f\u200b-\u200d\ufeff]/g, ' ')
    .replace(/[ \u00a0\u3000]+/g, ' ')
    .replace(/ *\n[\n ]*/g, '\n')
    .trim();
}
/** 봉투 셈 — 한글을 빼고, 빈칸·줄바꿈은 겹쳐도 하나로, 앞뒤 빈칸 없이 센 글자 수 (화면엔 숫자를 안 보인다) */
export function letterCount(s) {
  return [...String(s == null ? '' : s).replace(/[\u1100-\u11ff\u3130-\u318f\uac00-\ud7a3]/g, '').replace(/\s+/g, ' ').trim()].length;
}
/** 봉투가 얼마나 찼나 0~1 */
export function envelopeFill(s) {
  return Math.min(1, letterCount(s) / LETTER_LEN);
}
/** 보낼 수 있나 — why: 'short' 봉투가 덜 참 · 'long' 너무 김 · 'english' 영어 낱말이 거의 없음 */
export function letterCheck(text) {
  const t = normLetter(text);
  if ([...t].length > LETTER_MAX) return { ok: false, why: 'long' };
  if (letterCount(t) < LETTER_LEN) return { ok: false, why: 'short' };
  // 숫자·기호로만 채우지 않게 — 영어 글자가 셈의 절반은 넘어야 (판단은 Claude가 하지만, 봉투를 기호로 채워 보내는 것만 막는다)
  if ((t.match(/[a-z]/gi) || []).length * 2 < letterCount(t)) return { ok: false, why: 'english' };
  return { ok: true, text: t };
}

/** 글 이름표 — (at, 포켓몬, 글)에서 늘 다시 만든다 (korwrite.writeIdOf와 같은 해시 · 머리 글자 l) */
export function letterIdOf(at, mon, text) {
  const s = `${at}\u0000${mon}\u0000${text}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x5bd1e995;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x2c1b3c6d) >>> 0;
    h2 = (h2 ^ (h2 >>> 15)) >>> 0;
  }
  return `l${h1.toString(36).padStart(7, '0')}${h2.toString(36).padStart(7, '0')}`;
}
/** 👍 상자 — 글 이름표로 셋 가운데 하나 (같은 글은 늘 같은 것) */
export function boxOf(id) {
  let h = 0;
  for (const c of String(id)) h = (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0;
  return BOX[h % BOX.length];
}

// ───────────────────── 원고 ─────────────────────

/** 원고 검사 (순수 — tools/check.mjs도 부른다) → 틀린 곳 글 목록 · ids = 📮 편지 포켓몬 id(명단) */
export function checkLetters(data, ids) {
  const out = [];
  if (!isObj(data) || !Array.isArray(data.letters)) return ['letters 목록이 없어요'];
  const want = new Set(Array.isArray(ids) ? ids : []);
  const seen = new Set();
  for (const k of GRADES) if (!isObj(data.grades) || !isObj(data.grades[k]) || !str(data.grades[k].rule, 400)) out.push(`grades.${k}.rule이 없어요`);
  data.letters.forEach((L, i) => {
    const at = `letters[${i}]`;
    if (!isObj(L)) { out.push(`${at} 객체가 아님`); return; }
    if (!monOf(L.id)) { out.push(`${at}.id`); return; }
    if (seen.has(L.id)) out.push(`${at} id ${L.id} 겹침`);
    seen.add(L.id);
    if (want.size && !want.has(L.id)) out.push(`${at} id ${L.id}는 📮 편지 포켓몬이 아님`);
    if (!str(L.en, 40) || !str(L.ko, 20)) out.push(`${at} 이름`);
    if (!/^G\d{1,2}$/.test(String(L.focus))) out.push(`${at}.focus`);
    if (!Array.isArray(L.body) || L.body.length < 4 || L.body.length > 14 || !L.body.every((x) => typeof x === 'string' && x.trim() && x.length <= 200)) out.push(`${at}.body`);
    else {
      if (L.body[0] !== `Hi! I am ${L.en}.`) out.push(`${at} 첫 문장`);
      if (L.body[L.body.length - 1] !== 'Please write back to me!') out.push(`${at} 끝 문장`);
      if (/[‘’“”]/.test(L.body.join(' '))) out.push(`${at} 둥근 따옴표`);
    }
    for (const k of ['koText', 'ask', 'starter']) if (!str(L[k], 600)) out.push(`${at}.${k}`);
  });
  for (const id of want) if (!seen.has(id)) out.push(`📮 편지 포켓몬 ${id}의 편지가 없어요`);
  return out;
}
/** 앱이 쓸 편지 목록 — 깨진 편지는 빼고(원고 차례 그대로) · 원고가 틀렸으면 [] */
export function lettersList(data) {
  if (!isObj(data) || !Array.isArray(data.letters)) return [];
  const seen = new Set();
  const out = [];
  for (const L of data.letters) {
    if (!isObj(L) || !monOf(L.id) || seen.has(L.id) || !Array.isArray(L.body) || !L.body.length) continue;
    const body = L.body.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim());
    if (!body.length || !str(L.en, 40) || !str(L.ko, 20)) continue;
    seen.add(L.id);
    out.push({ id: L.id, en: str(L.en, 40), ko: str(L.ko, 20), focus: str(L.focus, 4), body, koText: str(L.koText, 600), ask: str(L.ask, 300), starter: str(L.starter, 200) });
  }
  return out;
}
/** 🔊 읽어 줄 문장 — 소리 흉내만 있는 조각(Zzz... 등)은 빼고 읽는다 (태블릿 음성이 낱자로 읽어 이상하다) · 빈 줄은 뺌 */
export function sayLines(body) {
  return (Array.isArray(body) ? body : []).map((x) => String(x).replace(/\bZz+\b\.*/gi, '').replace(/\s+/g, ' ').trim()).filter((x) => /[a-z]/i.test(x));
}

// ───────────────────── 장부 ─────────────────────

function replyOf(r) {
  if (!isObj(r) || !GRADES.includes(r.g)) return null;
  const en = str(r.en, REPLY_TEXT_MAX);
  if (!en) return null;
  const gift = giftOf(r.gift);
  return { g: r.g, en, ko: str(r.ko, REPLY_TEXT_MAX), ps: str(r.ps, PS_MAX), psKo: str(r.psKo, PS_MAX), at: cnt(r.at) || 1, ...(gift ? { gift } : {}) };
}
function giftOf(g) {
  if (!isObj(g)) return null;
  if (g.k === 'friend' && monOf(g.mon)) return { k: 'friend', mon: g.mon, n: cnt(g.n) };
  if (g.k === 'coins' && cnt(g.n)) return { k: 'coins', n: cnt(g.n), ...(g.from === 'star' ? { from: 'star' } : {}) };
  if ((g.k === 'stone' || g.k === 'ball') && typeof g.id === 'string' && /^[a-z_]{2,30}$/.test(g.id) && cnt(g.n)) return { k: g.k, id: g.id, n: cnt(g.n), ...(g.from === 'star' ? { from: 'star' } : {}) };
  return null;
}
/** 보낸 글 하나 고쳐 읽기 — 깨졌으면 null · id는 늘 다시 만든다 · rd = 답장을 읽은 시각(답장이 있을 때만) */
function sentOf(e) {
  if (!isObj(e) || !cnt(e.at) || !monOf(e.mon) || typeof e.text !== 'string') return null;
  const text = [...e.text].slice(0, LETTER_MAX).join(''); // 글자(코드 포인트)로 — 보낼 때 센 것과 같은 단위(이모지가 든 600자 글이 잘리지 않게 · 🔍 Codex 155차 #1)
  const r = replyOf(e.r);
  return { mon: e.mon, id: letterIdOf(cnt(e.at), e.mon, text), at: cnt(e.at), text, ...(r ? { r, ...(cnt(e.rd) ? { rd: cnt(e.rd) } : {}) } : {}) };
}
/** 같은 id 둘 — 답장 붙은 쪽 · 둘 다면 먼저 붙은 쪽(같으면 글로 — 어느 차례로 합쳐도 같게) · 읽은 시각은 이른 쪽 */
function better(a, b) {
  if (!!a.r !== !!b.r) return a.r ? a : b;
  if (!a.r) return a;
  const w = a.r.at !== b.r.at ? (a.r.at < b.r.at ? a : b) : (JSON.stringify(a.r) <= JSON.stringify(b.r) ? a : b);
  const { rd: _rd, ...rest } = w;
  const rd = minPos(cnt(a.rd), cnt(b.rd));
  return { ...rest, ...(rd ? { rd } : {}) };
}
/**
 * 글 목록 정리 — at 차례 · 같은 id는 하나로 · 답장 기다리는 글은 모두 · 답장 받은 글은 최근 KEEP_DONE개 +
 * 포켓몬마다 끝난(✉️ 아닌) 마지막 글 하나는 늘 남긴다 — 잘려 나가면 끝난 편지가 다시 온다
 */
function tidy(list) {
  const by = new Map();
  for (const e of list) { const p = by.get(e.id); by.set(e.id, p ? better(p, e) : e); }
  const all = [...by.values()].sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const keep = new Set(all.filter((e) => e.r).slice(-KEEP_DONE));
  const lastDone = new Map();
  for (const e of all) if (e.r && e.r.g !== 'again') lastDone.set(e.mon, e);
  for (const e of lastDone.values()) keep.add(e);
  return all.filter((e) => !e.r || keep.has(e));
}

/** 편지 장부 고쳐 읽기 — 새 객체 { start, seen: { mon: 날 }, sent: [], star } */
export function lettersOf(raw) {
  const x = isObj(raw) ? raw : {};
  const seen = {};
  if (isObj(x.seen)) for (const k of Object.keys(x.seen).slice(0, SEEN_MAX)) { const m = monOf(Number(k)); const d = cnt(x.seen[k]); if (m && d && String(m) === k) seen[m] = d; }
  return {
    start: cnt(x.start),
    seen,
    sent: tidy((Array.isArray(x.sent) ? x.sent.slice(-RAW_SENT_MAX) : []).map(sentOf).filter(Boolean)),
    star: cnt(x.star),
  };
}
/** 병합 — 글은 id로 합집합 · start·seen 이른 날 · star 늦은 날 */
export function mergeLetters(a, b) {
  const x = lettersOf(a);
  const y = lettersOf(b);
  const seen = { ...x.seen };
  for (const k of Object.keys(y.seen)) seen[k] = minPos(cnt(seen[k]), y.seen[k]);
  return lettersOf({ start: minPos(x.start, y.start), seen, sent: [...x.sent, ...y.sent], star: Math.max(x.star, y.star) });
}

/** 그 포켓몬의 편지가 끝났나 — ✉️ 아닌 답장을 받은 글이 있다 */
const finished = (L, mon) => L.sent.some((e) => e.mon === mon && e.r && e.r.g !== 'again');
/** 🌟를 줄 수 있나 — 2주에 한 번 */
export function starOpen(raw, today) {
  const L = lettersOf(raw);
  return !L.star || cnt(today) - L.star >= STAR_GAP;
}

/**
 * 지금 우체통 (순수 — 그리기·홈 카드·📤가 같이 쓴다) — 차례: 안 읽은 답장 → 답장 기다리는 글 → ✉️ 다시 쓸 편지 → 새 편지
 * @param {object} raw profile.letters · @param {object} caught profile.caught · @param {Array} list lettersList(원고) · @param {number} now
 * @returns {{kind:'off'|'reply'|'sent'|'letter'|'wait'|'none', mon?:number, entry?:object, letter?:object, again?:boolean, fresh?:boolean, from?:number}}
 *   off = 아직 이 판을 연 날이 없음 · wait = 다음 편지는 from(날 번호)부터 · fresh = 아직 안 연 새 편지(빨간 점)
 */
export function letterNow(raw, caught, list, now) {
  const L = lettersOf(raw);
  const today = dayNum(now);
  const byMon = new Map((Array.isArray(list) ? list : []).map((x) => [x.id, x]));
  if (!L.start) return { kind: 'off' };
  const unread = L.sent.find((e) => e.r && !e.rd);
  if (unread) return { kind: 'reply', mon: unread.mon, entry: unread, letter: byMon.get(unread.mon) || null };
  const pending = L.sent.find((e) => !e.r);
  if (pending) return { kind: 'sent', mon: pending.mon, entry: pending, letter: byMon.get(pending.mon) || null };
  // ✉️ — 마지막 글이 다시 쓰기면 그 편지에 바로 다시 (기다리지 않는다)
  const last = L.sent.length ? L.sent[L.sent.length - 1] : null;
  if (last && last.r && last.r.g === 'again' && !finished(L, last.mon) && byMon.has(last.mon)) return { kind: 'letter', mon: last.mon, letter: byMon.get(last.mon), again: true, fresh: false };
  const doneRead = L.sent.filter((e) => e.r && e.r.g !== 'again').map((e) => dayNum(e.rd)).filter(Boolean);
  const from = (doneRead.length ? Math.max(...doneRead) : L.start) + 1;
  const got = isObj(caught) ? caught : {};
  const next = (Array.isArray(list) ? list : []).find((x) => !finished(L, x.id) && !(Number(got[x.id]) > 0));
  if (!next) return { kind: 'none' };
  if (today < from) return { kind: 'wait', from };
  return { kind: 'letter', mon: next.id, letter: next, again: false, fresh: !L.seen[next.id] };
}
/** 빨간 점 — 새 편지(안 연)나 안 읽은 답장 */
export function letterDot(st) {
  return !!st && ((st.kind === 'letter' && !!st.fresh) || st.kind === 'reply');
}

// ───────────────────── 트랜잭션 규칙 ─────────────────────

/** 이 판을 처음 연 날 (첫 편지는 그다음 날) — 이미 있으면 그대로 */
export function letterStartRule(p, now) {
  const L = lettersOf(p.letters);
  if (L.start) return { ok: false, why: 'had' };
  L.start = dayNum(now) || 1;
  p.letters = L;
  return { ok: true };
}
/** 편지를 열었다 (빨간 점 끄기) — 그 편지가 지금 편지일 때만 */
export function letterSeenRule(p, mon, now, list) {
  const L = lettersOf(p.letters);
  const st = letterNow(L, p.caught, list, now);
  if (st.kind !== 'letter' || st.mon !== mon) return { ok: false, why: 'changed' };
  if (L.seen[mon]) return { ok: false, why: 'had' };
  L.seen[mon] = dayNum(now) || 1;
  p.letters = L;
  return { ok: true };
}
/**
 * ✉️ 답장 보내기 (한 트랜잭션) — 저장된 프로필로 다시 본다: 그 편지가 지금 편지이고 봉투가 찼을 때만 · at은 마지막 글보다 늘 크게
 * why: 'changed'(그 사이 지금 편지가 바뀜 — 다른 창이 보냈거나 답장이 왔다) · 'short' · 'long' · 'english'
 */
export function letterSendRule(p, mon, text, now, list) {
  const c = letterCheck(text);
  if (!c.ok) return { ok: false, why: c.why };
  const L = lettersOf(p.letters);
  const st = letterNow(L, p.caught, list, now);
  if (st.kind !== 'letter' || st.mon !== mon) return { ok: false, why: 'changed' };
  const at = Math.max(cnt(now) || 1, ...L.sent.map((e) => e.at + 1));
  const e = { mon, id: letterIdOf(at, mon, c.text), at, text: c.text };
  L.sent = tidy([...L.sent, e]);
  if (!L.seen[mon]) L.seen[mon] = dayNum(now) || 1;
  p.letters = L;
  return { ok: true, id: e.id, at };
}

/**
 * 답장 파일 검사 (순수) → { good: [{ mon, id, g, en, ko, ps, psKo }], bad: [{ i, why }], over }
 * 같은 글에 다른 답장이 둘이면 둘 다 버린다 · 같은 답장 두 줄은 하나로
 */
export function checkLetterReplies(rows, list) {
  const mons = new Set((Array.isArray(list) ? list : []).map((x) => x.id));
  const all = Array.isArray(rows) ? rows : [];
  if (all.length > REPLY_ROWS_MAX) return { good: [], bad: [{ i: -1, why: `답장이 ${REPLY_ROWS_MAX}줄을 넘어요(${all.length}줄) — 하나도 받지 않아요. 붙은 오래된 줄을 지워 주세요` }], over: true };
  const bad = [];
  const seen = new Map();
  all.forEach((e, i) => {
    if (!isObj(e)) { bad.push({ i, why: '객체가 아님' }); return; }
    if (!mons.has(e.mon)) { bad.push({ i, why: 'mon은 편지 포켓몬 번호' }); return; }
    if (typeof e.id !== 'string' || !LETTER_ID_RE.test(e.id)) { bad.push({ i, why: 'id는 letters/todo.json의 id 그대로(l + 14자)' }); return; }
    const g = e.grade;
    if (!GRADES.includes(g)) { bad.push({ i, why: 'grade는 star·good·ok·again' }); return; }
    const en = typeof e.en === 'string' ? e.en.trim() : '';
    const ko = typeof e.ko === 'string' ? e.ko.trim() : '';
    if (!en || en.length > REPLY_TEXT_MAX || !ko || ko.length > REPLY_TEXT_MAX) { bad.push({ i, why: `en·ko는 1~${REPLY_TEXT_MAX}자` }); return; }
    const ps = typeof e.ps === 'string' ? e.ps.trim() : '';
    const psKo = typeof e.psKo === 'string' ? e.psKo.trim() : '';
    if (ps.length > PS_MAX || psKo.length > PS_MAX || (e.ps !== undefined && typeof e.ps !== 'string') || (e.psKo !== undefined && typeof e.psKo !== 'string')) { bad.push({ i, why: `ps·psKo는 ${PS_MAX}자까지의 글` }); return; }
    const r = { mon: e.mon, id: e.id, g, en, ko, ps, psKo };
    const p = seen.get(e.id);
    if (!p) { seen.set(e.id, { r, i, clash: false }); return; }
    if (JSON.stringify(p.r) !== JSON.stringify(r)) { p.clash = true; bad.push({ i, why: `같은 글(${e.id})에 다른 답장` }); }
  });
  const good = [];
  for (const { r, i, clash } of seen.values()) {
    if (clash) bad.push({ i, why: `같은 글(${r.id})에 다른 답장` });
    else good.push(r);
  }
  return { good, bad, over: false };
}
/** 📊 받은 결과 수 (붙인 뒤의 장부로 센다) — none = 이 기기에 그 글이 없음 */
export function letterReplyStats(raw, rows, list) {
  const { good, bad, over } = checkLetterReplies(rows, list);
  const L = lettersOf(raw);
  const n = Array.isArray(rows) ? rows.length : 0;
  const none = good.filter((r) => !L.sent.some((e) => e.id === r.id && e.mon === r.mon)).length;
  return { rows: n, good: good.length, bad: over ? n : bad.length, none, stale: 0, over: !!over };
}

/**
 * 📮 답장 붙이기 (한 트랜잭션) — 그 글(mon, id)이 있고 아직 답장이 없을 때만 · 선물은 앱이 정한다
 * @returns {{ok:boolean, why?:string, applied?:Array<{mon,id,g,gift}>}} why 'none' 붙일 것 없음
 */
export function letterReplyRule(p, rows, now, list) {
  const { good } = checkLetterReplies(rows, list);
  const L = lettersOf(p.letters);
  const today = dayNum(now) || 1;
  const applied = [];
  for (const r of good) {
    const e = L.sent.find((x) => x.id === r.id && x.mon === r.mon);
    if (!e || e.r) continue; // 없는 글(다른 사본 — 병합으로 오면 그때) · 이미 붙음
    let gift = null;
    const caught = isObj(p.caught) ? p.caught : {};
    if (r.g === 'star' && starOpen(L, today) && !(Number(caught[r.mon]) > 0)) {
      gift = { k: 'friend', mon: r.mon, n: STAR_COINS };
      p.caught = { ...caught, [r.mon]: 1 };
      if (!p.partner) p.partner = r.mon; // 🤝 처음 얻은 포켓몬이면 파트너 (잡기와 같은 규칙)
      L.star = today;
      addCoins(p, STAR_COINS);
    } else if (r.g === 'star' || r.g === 'good') {
      const b = boxOf(e.id);
      gift = { ...b, ...(r.g === 'star' ? { from: 'star' } : {}) };
      if (b.k === 'coins') addCoins(p, b.n);
      else p.items = { ...(isObj(p.items) ? p.items : {}), [b.id]: Math.min(Number.MAX_SAFE_INTEGER, (Math.floor(Number((p.items || {})[b.id])) || 0) + b.n) };
    } else if (r.g === 'ok') {
      gift = { k: 'coins', n: OK_COINS };
      addCoins(p, OK_COINS);
    }
    e.r = { g: r.g, en: r.en, ko: r.ko, ps: r.ps, psKo: r.psKo, at: cnt(now) || 1, ...(gift ? { gift } : {}) };
    applied.push({ mon: r.mon, id: e.id, g: r.g, gift });
  }
  if (!applied.length) return { ok: false, why: 'none' };
  L.sent = tidy(L.sent);
  p.letters = L;
  return { ok: true, applied };
}
function addCoins(p, n) {
  p.coins = (Number(p.coins) || 0) + n;
  p.coinsEarned = (Number(p.coinsEarned) || 0) + n;
}
/** 📮 답장을 읽었다 (그 글의 id) — why 'none'(그 글이 없거나 답장이 없음 · 이미 읽음) */
export function letterReadRule(p, id, now) {
  const L = lettersOf(p.letters);
  const e = L.sent.find((x) => x.id === id);
  if (!e || !e.r || e.rd) return { ok: false, why: 'none' };
  e.rd = cnt(now) || 1;
  p.letters = L;
  return { ok: true };
}

// ───────────────────── 말 (아이 화면 — 셈 없이) ─────────────────────

const josaOf = (name, a, b) => { const c = String(name).charCodeAt(String(name).length - 1); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0 ? a : b; };
/** 선물 한 줄 — 받은 것을 이름으로 (kid-visible-feedback) · 다시 쓰기면 그 말 */
export function giftLine(g, gift, name) {
  if (g === 'again') return '✉️ 다시 써서 보내 볼까요? 편지 물음에 영어 문장으로 답해 봐요';
  if (!gift) return '';
  if (gift.k === 'friend') return `🌟 ${name}${josaOf(name, '이', '가')} 친구가 됐어요! 도감에 들어갔어요 · 💰 +${gift.n}`;
  const box = gift.from === 'star' ? '🌟 정말 잘 썼어요! 🎁 상자를 열었어요' : '🎁 상자를 열었어요';
  if (gift.k === 'coins') return g === 'ok' ? `💰 +${gift.n}` : `${box} — 💰 +${gift.n}`;
  if (gift.k === 'stone') return `${box} — 🔶 영어스톤 +${gift.n}`;
  if (gift.k === 'ball') return `${box} — 🔵 슈퍼볼 +${gift.n}`;
  return '';
}
/** 우체통 띠 한 줄 (영어 목록 맨 위 · 셈 없이) */
export function stripText(st) {
  if (!st || st.kind === 'off') return '';
  const name = (st.letter && st.letter.ko) || '포켓몬';
  if (st.kind === 'reply') return `📮 ${name}${josaOf(name, '이', '가')} 답장을 보냈어요!`;
  if (st.kind === 'sent') return `✉️ ${name}${josaOf(name, '이', '가')} 답장을 쓰고 있어요`;
  if (st.kind === 'letter') return st.again ? `📮 ${name}에게 다시 써 볼까요?` : st.fresh ? `📮 ${name}에게서 편지가 왔어요!` : `📮 ${name}의 편지 — 답장을 써 볼까요?`;
  if (st.kind === 'wait') return '📮 우체통 — 새 편지는 곧 와요';
  return '📮 우체통';
}

// ───────────────────── 📤 (아빠·Claude 쪽) ─────────────────────

function ymd(t) {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
/** 날 번호 → YYYY-MM-DD (dayNum의 거꾸로 — 날 번호는 기기 날짜를 UTC 자정으로 센 것) */
const dayYmd = (n) => new Date(n * 86400000).toISOString().slice(0, 10);

/**
 * 📤 지금 우체통 한 줄 (순수 — letters/todo.md 머리, v357) — 「편지 언제 와?」에 기록으로 답하려고 (전엔 처음 연 날이 안 올라와 첫 편지가 왔는지 몰랐다)
 * 판 연 날 · 지금(letterNow 차례 그대로) · 태블릿 띠 글 그대로 · 끝난 편지 수 · 🌟 마지막 날과 다음 날 — 진우 글은 넣지 않는다(글은 아래 목록에)
 * 원고를 못 받으면(list 비어 있음) 지금 편지는 모른다고 쓴다 — letterNow는 원고가 없으면 「남은 편지 없음」으로 읽는다
 */
export function letterStatusLine(raw, caught, list, now) {
  const L = lettersOf(raw);
  if (!L.start) return '📮 지금 우체통 — 판을 아직 안 엶 · 영어 영상 목록을 처음 연 다음 날 첫 편지';
  const has = Array.isArray(list) && list.length > 0;
  const st = letterNow(L, caught, has ? list : [], now);
  const name = (x, mon) => (x ? `${x.ko}(${x.en})` : `mon ${mon}`);
  // 안 읽은 답장을 지금 읽으면 무엇이 오나 — 등급으로 짐작하지 않고 letterReadRule·letterNow를 복사본에 그대로 불러 본다
  //   (마지막 편지였거나 남은 포켓몬이 병합으로 도감에 있으면 새 편지가 안 온다 · ✉️도 그 편지가 원고에 있어야 — 🔍 Codex 162차 #1)
  const afterRead = () => {
    const q = { letters: L };
    if (!letterReadRule(q, st.entry.id, now).ok) return '';
    const a = letterNow(q.letters, caught, list, now);
    if (a.kind === 'wait') return a.from <= (dayNum(now) || 1) + 1 ? '읽은 다음 날 새 편지' : `읽으면 ${dayYmd(a.from)}부터 새 편지`;
    if (a.kind === 'letter' && a.again) return `읽으면 ${name(a.letter, a.mon)}의 같은 편지에 다시 쓸 차례`;
    if (a.kind === 'letter') return `읽으면 ${name(a.letter, a.mon)}의 편지`;
    if (a.kind === 'reply') return `읽으면 다음은 ${name(a.letter, a.mon)}의 답장(안 읽음)`;
    if (a.kind === 'sent') return `읽으면 다음은 ${name(a.letter, a.mon)}에게 보낸 답장(판단 기다림)`;
    return '읽으면 남은 편지 없음';
  };
  let cur;
  if (!has) cur = '원고를 못 받아 지금 편지는 모름';
  else if (st.kind === 'reply') { const next = afterRead(); cur = `${name(st.letter, st.mon)}의 답장 붙음(${GRADE_ICON[st.entry.r.g]}) — 진우가 아직 안 읽음${next ? ` · ${next}` : ''}`; }
  else if (st.kind === 'sent') cur = `${name(st.letter, st.mon)}에게 답장 보냄(${ymd(st.entry.at)}) — 판단 기다림(아래)`;
  else if (st.kind === 'letter' && st.again) cur = `✉️ 다시 쓰기 — ${name(st.letter, st.mon)}의 같은 편지에 다시 쓸 차례(기다리지 않음)`;
  else if (st.kind === 'letter') cur = `${name(st.letter, st.mon)}의 편지가 와 있음 · ${L.seen[st.mon] ? `${dayYmd(L.seen[st.mon])}에 열어 봄 · 답장 아직` : '아직 안 엶'}`;
  else if (st.kind === 'wait') cur = `다음 편지는 ${dayYmd(st.from)}부터`;
  else cur = '남은 편지 없음(편지 포켓몬이 모두 끝났거나 도감에 있음)';
  const strip = has ? stripText(st) : '';
  const done = new Set(L.sent.filter((e) => e.r && e.r.g !== 'again').map((e) => e.mon)).size;
  const star = L.star
    ? `🌟 마지막 ${dayYmd(L.star)} · 다음 🌟 ${starOpen(L, dayNum(now)) ? '지금 줄 수 있음' : `${dayYmd(L.star + STAR_GAP)}부터`}`
    : '🌟 아직 없음(지금 줄 수 있음)';
  return [`📮 지금 우체통 — 판 연 날 ${dayYmd(L.start)}`, `지금: ${cur}`, ...(strip ? [`띠 「${strip}」`] : []), `끝난 편지 ${done}통`, star].join(' · ');
}
/**
 * 📤 답장 기다리는 글 (순수) — 비공개 저장소 letters/todo.json · Claude는 mon·id를 그대로 letters/replies.json에 적는다
 * starOpen = 지금 🌟(그 포켓몬)를 줄 수 있나(2주) — 아니면 🌟로 판단해도 앱이 👍 상자로 바꾼다 · before = 그 편지에 전에 쓴 글
 */
export function letterTodo(raw, list, now) {
  const L = lettersOf(raw);
  const byMon = new Map((Array.isArray(list) ? list : []).map((x) => [x.id, x]));
  const open = starOpen(L, dayNum(now));
  return L.sent.filter((e) => !e.r).map((e) => {
    const x = byMon.get(e.mon) || null;
    return {
      mon: e.mon, id: e.id, at: e.at, date: ymd(e.at), en: x ? x.en : '', ko: x ? x.ko : '', focus: x ? x.focus : '', starOpen: open,
      letter: x ? x.body : [], ask: x ? x.ask : '', starter: x ? x.starter : '', text: e.text,
      before: L.sent.filter((b) => b.r && b.mon === e.mon && b.at < e.at).map((b) => ({ date: ymd(b.at), text: b.text, grade: b.r.g, reply: b.r.en, ps: b.r.ps })),
    };
  });
}
/** 📤 사람이 읽는 글 (letters/todo.md) — 맨 위에 지금 우체통 한 줄(status — letterStatusLine, v357)과 판단 기준(원고 grades) */
export function letterTodoMd(todo, today, grades, status) {
  const list = Array.isArray(todo) ? todo : [];
  const L = [`📮 진우의 포켓몬 편지 답장 — 판단 기다리는 글 ${list.length}개 (${today})`,
    ...(typeof status === 'string' && status ? [status] : []),
    '답장은 letters/replies.json에 { mon, id, grade(star·good·ok·again), en, ko, ps, psKo } — mon·id는 아래 그대로 · 선물은 앱이 정한다(답장 글에 선물 이야기 쓰지 않기)', ''];
  if (isObj(grades)) for (const k of GRADES) if (isObj(grades[k])) L.push(`- ${GRADE_ICON[k]} ${k} ${grades[k].ko || ''}: ${grades[k].rule || ''}`);
  L.push('');
  for (const e of list) {
    L.push(`[mon ${e.mon} · id ${e.id}] ${e.date} ${e.ko}(${e.en})의 편지 · 물음 단원 ${e.focus} · 🌟 ${e.starOpen ? '줄 수 있음' : '2주 안이라 앱이 👍 상자로'}`);
    L.push(`    편지: ${(e.letter || []).join(' ')}`);
    L.push(`    💡 ${e.ask} · 본보기 ${e.starter}`);
    for (const b of (Array.isArray(e.before) ? e.before : [])) L.push(`    (전에 ${b.date} · ${b.grade}) ${b.text} → ${b.reply}`);
    L.push(`    진우: ${e.text}`, '');
  }
  if (!list.length) L.push('(판단 기다리는 글 없음)');
  return `${L.join('\n').trim()}\n`;
}
