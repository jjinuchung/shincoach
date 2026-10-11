// ✍️ 국어 서술형(주관식) — 순수 규칙 (화면 없음, korean.js만 import — db·xp·check·테스트가 그대로 부른다)
// 화면은 korwriteview.js, 원고는 coach/korean/reading.json 카드의 write { q, v, rubric:{ must, ok, miss }, model }
//
// 아버님 (2026-10-11): "문제는 주관식도 만들 수가 있을까? 아이가 주관식을 작성해서 올리면 너가 확인을 해서 … 답을 맞춰보고 해석을 해서"
//   → 기본값 제안 → "제안 기본값대로 가자" → Codex 51차 PART 3 조언 → "니 제안대로 진행하자"
// 흐름 (✍️ 에세이 교정·❓ 아빠 답장과 같은 비공개 왕복 — 배포 없음):
//   진우가 쓴다(카드 끝, 객관식 뒤 · 건너뛰어도 별은 그대로) → profile.korWrites → 📤 비공개 저장소 korean/todo.json
//   → 아버님 "국어 답 봐 줘" → Claude가 채점 기준(rubric)으로 ✅·🔸·🔁 + 아빠 이름 답장 → korean/replies.json
//   → 앱이 국어를 열 때 읽어 (card, at)이 같은 글에 한 번만 붙이고 보상
// 저장의 집 규칙 (Codex 51차 PART 3):
//  · 글 하나의 이름표 = (카드, id) — id는 (at, 글)에서 늘 다시 만든다(writeIdOf) · at은 트랜잭션 안에서 그 카드의 last보다 늘 크게(시계가 멈추거나 되돌아가도)
//    · 두 사본이 같은 at에 다른 글을 써도 id가 갈려 둘 다 남는다 — 답장은 id로 그 글에만 (Codex 52차 #2: at만 보면 B 답장이 A 글에 붙었다) · 쓴 글은 고치지 않는다(다시 쓰면 새 at)
//  · 카드마다 답장 기다리는 글은 하나 · ✅를 받은 카드는 끝 · 답장 기다리는 글은 하나도 자르지 않는다(답장 받은 글만 최근 KEEP_DONE개 — Codex 52차 #7)
//  · 보상 = 카드마다 평생 한도: 처음 쓴 글 💰5 한 번(paid.first) · 🔸까지 💰10 · ✅까지 💰20 + 🟩1 — 다시 써서 모으지 못하게 모자란 만큼만(paid.coins)
//  · 답장은 그 글에만 붙는다 — 없는 글(다른 사본)이면 건드리지 않고 남겨 둔다(그 글이 병합으로 오면 그때 붙음) · 이미 붙은 글은 다시 안 붙음
//  · 같은 (카드, id)에 다른 답장이 둘이면 둘 다 버린다(차례에 따라 달라지지 않게) · 답장 파일이 REPLY_ROWS_MAX줄을 넘으면 통째로 안 받는다 — 📊에 수만(replyStats, Codex 52차 #5)
//  · 병합: 카드마다 글은 id로 합집합(답장 붙은 쪽이 이김) · last·paid.coins는 큰 쪽 · paid.first·stone은 이른 날
//  · 지갑(coins·items)은 프로필 병합에서 새 사본을 따른다(db.js) — 두 사본이 갈린 뒤 한쪽만 받은 보상은 다시 붙지 않는다(Codex 52차 #3, 아버님 결정: 그대로)
import { dayNum, KOR_STONE, WRITE_MIN, WRITE_MAX } from './korean.js';

/** 글자 수(공백 정리 뒤) 10~200 — 짧은 한 문장 "엄마가 걱정하실까 봐요."도 받는다 (값은 korean.js — 원고 검사도 같은 값) */
export { WRITE_MIN, WRITE_MAX };
/** 답장 글 길이 상한 */
export const REPLY_MAX = 600;
/** 답장 파일 줄 수 상한 — 넘으면 하나도 받지 않는다(잘라 받지 않는다 — 잘린 뒤쪽의 "같은 글에 다른 답장"을 못 보니까, Codex 52차 #5) */
export const REPLY_ROWS_MAX = 500;
/** 카드마다 답장 받은 글은 최근 몇 개까지 남기나 (답장 기다리는 글은 안 셈) */
export const KEEP_DONE = 4;
/** 💰 — first: 카드마다 처음 쓴 글 한 번 · near/ok: 카드마다 그 등급까지 모두 합쳐 (평생 한도) */
export const WRITE_COINS = { first: 5, near: 10, ok: 20 };
/**
 * 등급 — Claude가 채점할 때의 결정 규칙 (원고의 rubric과 함께) · 맞춤법·띄어쓰기는 채점하지 않는다
 * rubric.ok는 must를 채우는 다른 말의 보기 — must를 건너뛰게 하지 않는다 · rubric에 적힌 등급이 이 규칙과 어긋나면 안 된다 (Codex 52차 #6)
 */
export const GRADES = {
  ok: { icon: '✅', ko: '잘 썼어요', rule: '꼭 들어갈 생각(must)이 모두 있고(rubric.ok의 다른 말로 채워도 된다), 글과 어긋나는 말이 없다' },
  near: { icon: '🔸', ko: '거의 다 왔어요', rule: '뜻은 맞게 이해했지만 must 가운데 하나가 빠졌거나 근거가 약하다 · 까닭의 중심은 글에 맞는데 곁들인 말이 글에 없다' },
  again: { icon: '🔁', ko: '다시 써 볼까요', rule: '묻는 것과 다른 답이거나, 까닭의 중심이 글과 어긋나거나(지어내기·거꾸로), 생각이 드러나지 않는다' },
};
const CARDS_MAX = 100;
const RAW_LIST_MAX = 200; // 깨진 파일 막이 — 보통은 닿지 않는다(답장 받은 글 KEEP_DONE개 + 사본마다 기다리는 글 하나)
const RAW_TEXT_MAX = WRITE_MAX * 2; // 저장된 글을 고쳐 읽을 때의 상한 (붙여 넣은 긴 글이 저장소를 키우지 않게)

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
const cnt = (v) => { const n = Math.floor(Number(v)); return Number.isSafeInteger(n) && n > 0 ? n : 0; };
const minPos = (a, b) => (a && b ? Math.min(a, b) : a || b || 0);

/** 글 다듬기 — 유니코드 모양 하나로(NFC) · 공백·줄바꿈은 빈칸 하나로 · 앞뒤 빈칸 뗌 (자르지는 않는다) */
export function normText(s) {
  return String(s === undefined || s === null ? '' : s).normalize('NFC').replace(/\s+/g, ' ').trim();
}
/** 글자 수 (한글 한 글자 = 1) */
export function textLen(s) {
  return [...normText(s)].length;
}
/** 보낼 수 있나 — { ok, n, why: 'short' | 'long' } */
export function writeCheck(text) {
  const n = textLen(text);
  if (n < WRITE_MIN) return { ok: false, n, why: 'short' };
  if (n > WRITE_MAX) return { ok: false, n, why: 'long' };
  return { ok: true, n };
}

/** 글 이름표 꼴 — w + 14자 */
export const WRITE_ID_RE = /^w[0-9a-z]{14}$/;
/**
 * 글 하나의 이름표 id (순수) — (at, 글)에서 늘 다시 만든다(저장된 값은 믿지 않는다 — 사본마다 같은 값). FNV-1a 꼴 두 갈래 32비트씩
 * 같은 at에 다른 글이면 다른 id · 같은 at에 같은 글이면 같은 글로 본다(둘이 같으니 하나로 합쳐도 잃는 것이 없다)
 */
export function writeIdOf(at, text) {
  const s = `${at}\u0000${text}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x5bd1e995;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x2c1b3c6d) >>> 0;
    h2 = (h2 ^ (h2 >>> 15)) >>> 0;
  }
  return `w${h1.toString(36).padStart(7, '0')}${h2.toString(36).padStart(7, '0')}`;
}
/** 글 하나 고쳐 읽기 — 깨졌으면 null · 답장이 없으면 reply·rAt·read도 없음 · id는 늘 다시 만든다 */
function entryOf(e) {
  if (!isObj(e) || !cnt(e.at) || typeof e.text !== 'string') return null;
  const grade = own(GRADES, e.grade) ? e.grade : '';
  const text = e.text.slice(0, RAW_TEXT_MAX);
  return {
    id: writeIdOf(cnt(e.at), text), at: cnt(e.at), day: cnt(e.day), v: cnt(e.v), text, grade,
    reply: grade && typeof e.reply === 'string' ? e.reply.slice(0, REPLY_MAX) : '',
    rAt: grade ? cnt(e.rAt) : 0,
    read: !!grade && e.read === true,
  };
}
/** 같은 id 둘(같은 at·같은 글) — 답장 붙은 쪽 · 둘 다면 먼저 붙은 쪽(rAt 작은 쪽) · 그래도 같으면 등급·답장 글로 (어느 차례로 합쳐도 같게) · 읽음은 OR */
function better(a, b) {
  if (!!a.grade !== !!b.grade) return a.grade ? a : b;
  if (!a.grade) return (a.day - b.day || a.v - b.v) <= 0 ? a : b;
  const w = a.rAt !== b.rAt ? (a.rAt < b.rAt ? a : b) : (`${a.grade}\u0000${a.reply}` <= `${b.grade}\u0000${b.reply}` ? a : b);
  return { ...w, read: a.read || b.read };
}
/** 글 목록 정리 — at 차례(같은 at은 id 차례) · 같은 id는 하나로 · 답장 기다리는 글은 모두(전체 상한으로 자르지 않는다) · 답장 받은 글은 최근 KEEP_DONE개 */
function tidy(list) {
  const by = new Map();
  for (const e of list) { const p = by.get(e.id); by.set(e.id, p ? better(p, e) : e); }
  const all = [...by.values()].sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const done = all.filter((e) => e.grade);
  const keep = new Set(done.slice(-KEEP_DONE));
  return all.filter((e) => !e.grade || keep.has(e));
}
function paidOf(p) {
  const x = isObj(p) ? p : {};
  return { first: cnt(x.first), coins: Math.min(cnt(x.coins), WRITE_COINS.ok), stone: cnt(x.stone) };
}
const emptyCard = () => ({ last: 0, list: [], paid: { first: 0, coins: 0, stone: 0 } });

/** 서술형 기록 고쳐 읽기 — 새 객체 { 카드id: { last, list, paid } } */
export function writesOf(raw) {
  const out = {};
  if (!isObj(raw)) return out;
  for (const id of Object.keys(raw).slice(0, CARDS_MAX)) {
    if (!/^K\d{1,3}$/.test(id)) continue;
    const c = isObj(raw[id]) ? raw[id] : {};
    const list = tidy((Array.isArray(c.list) ? c.list.slice(0, RAW_LIST_MAX) : []).map(entryOf).filter(Boolean));
    out[id] = { last: Math.max(cnt(c.last), ...list.map((e) => e.at), 0), list, paid: paidOf(c.paid) };
  }
  return out;
}
/** 병합 — 카드마다 글은 id로 합집합(답장 붙은 쪽이 이김) · last·paid.coins 큰 쪽 · paid.first·stone 이른 날 */
export function mergeWrites(a, b) {
  const x = writesOf(a);
  const y = writesOf(b);
  const out = {};
  for (const id of new Set([...Object.keys(x), ...Object.keys(y)])) {
    const p = x[id] || emptyCard();
    const q = y[id] || emptyCard();
    out[id] = {
      last: Math.max(p.last, q.last),
      list: tidy([...p.list, ...q.list]),
      paid: { first: minPos(p.paid.first, q.paid.first), coins: Math.max(p.paid.coins, q.paid.coins), stone: minPos(p.paid.stone, q.paid.stone) },
    };
  }
  return writesOf(out);
}

/**
 * 카드 하나의 서술형 상태 (그리기용) — { list, paid, latest, pending, pendings, shown, lastGraded, done, canWrite, unread }
 * · shown = 보일 답장: 안 읽은 답장 모두 + 마지막 글이 답장 받은 글이면 그것(읽었어도) — 보통은 하나
 *   (Codex 52차 #4: 병합으로 남은 앞 글의 답장이 마지막 글만 보는 탓에 영영 안 보였다)
 */
export function cardWriteState(writes, cardId) {
  const w = writesOf(writes)[cardId] || emptyCard();
  const latest = w.list.length ? w.list[w.list.length - 1] : null;
  const pendings = w.list.filter((e) => !e.grade);
  const graded = w.list.filter((e) => e.grade);
  const shown = graded.filter((e) => !e.read || e === latest);
  const done = w.paid.stone > 0 || graded.some((e) => e.grade === 'ok');
  return {
    list: w.list, paid: w.paid, latest, pending: pendings[0] || null, pendings, shown, lastGraded: graded.length ? graded[graded.length - 1] : null,
    done, canWrite: !pendings.length && !done, unread: graded.some((e) => !e.read),
  };
}
/** 아직 안 읽은 답장 [{ card, id, at, grade }] — 남아 있는 글 모두에서 (at 차례) */
export function unreadReplies(writes) {
  const w = writesOf(writes);
  const out = [];
  for (const card of Object.keys(w)) {
    for (const e of w[card].list) if (e.grade && !e.read) out.push({ card, id: e.id, at: e.at, grade: e.grade });
  }
  return out.sort((a, b) => a.at - b.at);
}

/**
 * ✍️ 글 보내기 (한 트랜잭션) — why: 'unknown'(서술형 없는 카드) · 'short' · 'long' · 'pending'(답장 기다리는 글이 있음) · 'done'(✅ 받은 카드)
 * @param {object} profile 고칠 프로필
 * @param {Array<{id:string, write?:object}>} cards 지금 있는 카드
 */
export function writeAddRule(profile, cardId, text, now, cards) {
  const card = (Array.isArray(cards) ? cards : []).find((c) => c && c.id === cardId && isObj(c.write));
  if (!card) return { ok: false, why: 'unknown' };
  const chk = writeCheck(text);
  if (!chk.ok) return { ok: false, why: chk.why, n: chk.n };
  const all = writesOf(profile.korWrites);
  const w = all[cardId] || emptyCard();
  if (w.list.some((e) => !e.grade)) return { ok: false, why: 'pending' };
  if (w.paid.stone > 0 || w.list.some((e) => e.grade === 'ok')) return { ok: false, why: 'done' };
  const day = dayNum(now) || 1;
  const at = Math.min(Number.MAX_SAFE_INTEGER, Math.max(cnt(now), w.last + 1)); // 늘 앞으로 — 시계가 멈추거나 되돌아가도 이름표가 겹치지 않게
  const t = normText(text);
  const id = writeIdOf(at, t);
  w.list = tidy([...w.list, { id, at, day, v: cnt(card.write.v) || 1, text: t, grade: '', reply: '', rAt: 0, read: false }]);
  w.last = at;
  let coins = 0;
  if (!w.paid.first) {
    coins = WRITE_COINS.first;
    w.paid.first = day;
    profile.coins = (Number(profile.coins) || 0) + coins;
    profile.coinsEarned = (Number(profile.coinsEarned) || 0) + coins;
  }
  all[cardId] = w;
  profile.korWrites = all;
  return { ok: true, at, id, coins };
}

/**
 * 📥 답장 파일 검사 (앱이 받을 때 · tools/check.mjs --private) — { good: [{ card, id, at, grade, text }], bad: [{ i, why }], over }
 * · 서술형이 있는 카드 · id는 korean/todo.json의 id 그대로 · at은 그 글의 at(사람이 보는 칸 — 적었으면 id의 글과 같아야 붙는다)
 * · grade는 ok·near·again · text는 1~REPLY_MAX자 · 모르는 칸은 무시
 * · 같은 (카드, id)에 다른 답장이 둘이면 둘 다 bad(어느 쪽이 맞는지 앱이 정하지 않는다) · 똑같으면 하나로
 * · REPLY_ROWS_MAX줄을 넘으면 하나도 받지 않는다(over — 앞쪽만 잘라 받으면 뒤쪽의 다른 답장을 못 본다, Codex 52차 #5)
 */
export function checkReplies(list, cards) {
  const has = new Set((Array.isArray(cards) ? cards : []).filter((c) => c && isObj(c.write)).map((c) => c.id));
  const rows = Array.isArray(list) ? list : [];
  if (rows.length > REPLY_ROWS_MAX) return { good: [], bad: [{ i: -1, why: `답장이 ${REPLY_ROWS_MAX}줄을 넘어요(${rows.length}줄) — 하나도 받지 않아요. 답장이 이미 붙은 오래된 줄을 지워 주세요` }], over: true };
  const good = [];
  const bad = [];
  const seen = new Map();
  rows.forEach((e, i) => {
    if (!isObj(e)) { bad.push({ i, why: '객체가 아님' }); return; }
    if (typeof e.card !== 'string' || !has.has(e.card)) { bad.push({ i, why: '서술형이 있는 카드가 아님' }); return; }
    if (typeof e.id !== 'string' || !WRITE_ID_RE.test(e.id)) { bad.push({ i, why: 'id는 korean/todo.json의 id 그대로(w + 14자)' }); return; }
    if (e.at !== undefined && (!Number.isSafeInteger(e.at) || e.at <= 0)) { bad.push({ i, why: 'at은 양의 정수(그 글의 at 그대로)' }); return; }
    if (!own(GRADES, e.grade)) { bad.push({ i, why: 'grade는 ok·near·again' }); return; }
    const text = typeof e.text === 'string' ? e.text.trim() : '';
    if (!text || [...text].length > REPLY_MAX) { bad.push({ i, why: `text는 1~${REPLY_MAX}자` }); return; }
    const key = `${e.card}:${e.id}`;
    const r = { card: e.card, id: e.id, at: e.at === undefined ? 0 : e.at, grade: e.grade, text };
    const p = seen.get(key);
    if (!p) { seen.set(key, { r, i, clash: false }); return; }
    if (p.r.grade !== r.grade || p.r.text !== r.text || (p.r.at && r.at && p.r.at !== r.at)) { p.clash = true; bad.push({ i, why: `같은 글(${key})에 다른 답장` }); }
  });
  for (const { r, i, clash } of seen.values()) {
    if (clash) bad.push({ i, why: `같은 글(${r.card}:${r.id})에 다른 답장` });
    else good.push(r);
  }
  return { good, bad, over: false };
}
/** 답장 r이 붙을 글 (id가 같고, at을 적었으면 at도 같은 글) */
const target = (w, r) => (w ? w.list.find((x) => x.id === r.id && (!r.at || x.at === r.at)) : undefined) || null;

/**
 * 📊 답장 파일을 한 번 받은 결과 수 (순수 — 글은 넣지 않는다) · 붙인 뒤의 기록으로 센다
 * @returns {{rows:number, good:number, bad:number, none:number, over:boolean}} bad = 받지 않은 줄 · none = 이 기기에 그 글이 없음
 */
export function replyStats(writes, list, cards) {
  const { good, bad, over } = checkReplies(list, cards);
  const w = writesOf(writes);
  const rows = Array.isArray(list) ? list.length : 0;
  return { rows, good: good.length, bad: over ? rows : bad.length, none: good.filter((r) => !target(w[r.card], r)).length, over: !!over };
}

/**
 * 📬 답장 붙이기 (한 트랜잭션) — 그 글(카드, id)이 있고 아직 답장이 없을 때만 · 보상은 카드마다 평생 한도까지 모자란 만큼
 * @returns {{ok:boolean, why?:string, applied?:Array<{card,at,grade,coins,stone}>, coins?:number, stone?:number}} why 'none' 붙일 것 없음
 */
export function writeReplyRule(profile, replies, now, cards) {
  const { good } = checkReplies(replies, cards);
  const all = writesOf(profile.korWrites);
  const applied = [];
  let coins = 0;
  let stone = 0;
  const day = dayNum(now) || 1;
  for (const r of good) {
    const w = all[r.card];
    const e = target(w, r);
    if (!e || e.grade) continue; // 없는 글(다른 사본에서 쓴 글 — 병합으로 오면 그때) · 이미 붙음
    e.grade = r.grade;
    e.reply = r.text;
    e.rAt = cnt(now) || 1;
    e.read = false;
    const add = Math.max(0, (r.grade === 'again' ? 0 : WRITE_COINS[r.grade]) - w.paid.coins);
    w.paid.coins += add;
    coins += add;
    let st = 0;
    if (r.grade === 'ok' && !w.paid.stone) { w.paid.stone = day; st = 1; stone += 1; }
    applied.push({ card: r.card, id: e.id, at: e.at, grade: r.grade, coins: add, stone: st });
  }
  if (!applied.length) return { ok: false, why: 'none' };
  for (const id of Object.keys(all)) all[id].list = tidy(all[id].list);
  profile.korWrites = all;
  if (coins) {
    profile.coins = (Number(profile.coins) || 0) + coins;
    profile.coinsEarned = (Number(profile.coinsEarned) || 0) + coins;
  }
  if (stone) profile.items = { ...(profile.items || {}), [KOR_STONE]: Math.min(Number.MAX_SAFE_INTEGER, (Math.floor(Number((profile.items || {})[KOR_STONE])) || 0) + stone) };
  return { ok: true, applied, coins, stone };
}

/** 📬 답장을 읽었다 (그 글의 id) — why 'none'(그 글이 없거나 답장이 없음 · 이미 읽음) */
export function writeReadRule(profile, cardId, id) {
  const all = writesOf(profile.korWrites);
  const e = all[cardId] && all[cardId].list.find((x) => x.id === id);
  if (!e || !e.grade || e.read) return { ok: false, why: 'none' };
  e.read = true;
  profile.korWrites = all;
  return { ok: true };
}

/** 날짜 글 (이 기기 날짜) */
function ymd(t) {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * 📤 답장 기다리는 글 (순수) — 비공개 저장소 korean/todo.json · Claude는 card·id·at을 그대로 답장에 적는다
 * @returns {Array<{card,id,title,q,v,at,date,text,before:Array<{date,text,grade,reply}>}>}
 */
export function writeTodo(writes, cards) {
  const w = writesOf(writes);
  const byId = new Map((Array.isArray(cards) ? cards : []).filter((c) => c && isObj(c.write)).map((c) => [c.id, c]));
  const out = [];
  for (const id of Object.keys(w)) {
    const c = byId.get(id);
    for (const e of w[id].list.filter((x) => !x.grade)) {
      out.push({
        card: id, id: e.id, title: c ? c.title : '', q: c ? c.write.q : '', v: e.v, at: e.at, date: ymd(e.at), text: e.text,
        before: w[id].list.filter((x) => x.grade && x.at < e.at).slice(-2).map((x) => ({ date: ymd(x.at), text: x.text, grade: x.grade, reply: x.reply })),
      });
    }
  }
  return out.sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
