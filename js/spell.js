// 🔤 진우 철자 노트 (v356, 2026-10-28 아버님 「추천대로」) — 규칙만 (화면은 spellnote.js · 거는 자리는 player.js · 저장은 xp.spellFinish)
// 낱말: 에세이 아빠 교정(비공개 essay/fixes.json)의 철자 칸 spell: [{ from, to }] — 「올라온 거 봐 줘」에서 Claude가 진짜 철자 틀림만 적는다
//   (시제·복수·띄어쓰기·이름·입말·진짜 낱말끼리 헷갈림은 안 적는다) · 받아 둔 낱말은 이 기기(localStorage)에만 — 진우 기록이라 공개 저장소에 두지 않는다
// 쪽지: 🎬 영상 따라 하기 사이 하루 한 번 「🔤 철자 쪽지」(낱말 셋) — 그날 첫 쪽지 자리(📝 문법 쪽지 8문장)를 쓰고 문법 쪽지는 한 칸(15문장) 뒤로
//   진우가 썼던 그 문장(고친 글)에서 그 낱말 자리를 비우고 🔊 → 쳐 넣기 · 틀리면 내 철자 ↔ 바른 철자를 나란히(다른 글자에 색) + 한 번 따라 쳐 보기 · 하트·감점 없음
// 보상·졸업: 쪽지를 끝내면 💰10(하루 한 번 · 📝 쪽지와 같은 크기) · 다른 날 두 번 연속 처음에 맞히면 ⭐ 졸업(노트에서 빠짐) · 졸업 뒤 에세이에서 또 틀리면 다시
// 진도는 프로필 spell(국어 낱말 칸과 같은 꼴 — 병합 mergeWords) · 보상 받은 날 spellDay(wordDaysOf) · 마지막으로 풀 때 본 틀린 수 spellSeen(병합 큰 쪽) · 아이 화면엔 셈 없음
// 🔍 Codex 161차: 같은 날 셈은 due로(시계가 꼬여도 하루 한 번) · 다시 노트에 넣는 기준은 날짜가 아니라 틀린 수(교정이 며칠 늦게 붙어도) · 답이 두 번 나오면 둘 다 빈칸 · 긴 글도 낱말은 남김
import { dayNum } from './korean.js';
import { stateOf, wordsOf, wordDaysOf, wordsToday } from './korwords.js';

/** n 쪽지 하나의 낱말 수 · done 졸업에 필요한 「다른 날 연속 처음에 맞힘」 · coins 그날 처음 끝낸 쪽지 💰 */
export const SPELL = { n: 3, done: 2, coins: 10 };
/** 낱말 꼴 — 소문자 영어(어퍼스트로피까지) 2~30자 */
const WORD_RE = /^[a-z][a-z']{1,29}$/;
const ROWS_MAX = 300;
const LIST_MAX = 2000;
const SENT_MAX = 200;
const FROM_MAX = 3;
/** 교정 글을 읽는 끝 — 깨진 파일의 아주 긴 글만 막는다 */
const LONG_MAX = 5000;
/** 틀린 수 기록 칸 수 상한 */
const SEEN_MAX = 2000;

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const cnt = (v) => { const n = Math.floor(Number(v)); return Number.isSafeInteger(n) && n > 0 ? n : 0; };
const big = (n) => Math.min(Number.MAX_SAFE_INTEGER, n);

/** 'YYYY-MM-DD' → 날 번호(dayNum과 같은 셈) · 아니면 0 */
export function dayOfKey(key) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ''));
  return m ? Math.floor(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86400000) : 0;
}

/** 견주기용 낱말 — 소문자 · 둥근 따옴표 → ' · 앞뒤 문장부호·빈칸 뗌 */
export function normWord(s) {
  return String(s == null ? '' : s).normalize('NFC').toLowerCase().replace(/[’‘`]/g, '\'').trim().replace(/^[^a-z']+|[^a-z']+$/g, '');
}

/** 철자 칸의 낱말 — 소문자·둥근 따옴표만 고친다(문장부호·숫자를 떼지 않는다 — 깨진 칸 「Ca7」이 「ca」로 통과하지 않게) */
const tagWord = (s) => String(s == null ? '' : s).normalize('NFC').trim().toLowerCase().replace(/[’‘`]/g, '\'');

/** 문장에서 낱말 자리 (통째 낱말 · 대소문자 무시) → { before, word, after } 또는 null */
export function blankOf(sentence, w) {
  const s = String(sentence || '');
  const want = normWord(w);
  if (!want) return null;
  const re = /[A-Za-z’']+/g;
  let m;
  while ((m = re.exec(s))) {
    const tok = m[0].replace(/^['’]+|['’]+$/g, '');
    if (normWord(tok) === want) {
      const at = m.index + m[0].indexOf(tok);
      return { before: s.slice(0, at), word: tok, after: s.slice(at + tok.length) };
    }
  }
  return null;
}
/**
 * 문장을 낱말 자리로 나눈다 (순수) → [{ text } | { blank: 문장 속 꼴 }] · 그 낱말이 없으면 null ·
 * 두 번 이상 나오면 모두 빈칸 — 뒤쪽 답이 보여 듣지 않고 베끼지 않게 (🔍 Codex 161차 #2)
 */
export function blankParts(sentence, w) {
  const s = String(sentence || '');
  const want = normWord(w);
  if (!want) return null;
  const out = [];
  const re = /[A-Za-z’']+/g;
  let last = 0;
  let m;
  while ((m = re.exec(s))) {
    const tok = m[0].replace(/^['’]+|['’]+$/g, '');
    if (normWord(tok) !== want) continue;
    const at = m.index + m[0].indexOf(tok);
    if (at > last) out.push({ text: s.slice(last, at) });
    out.push({ blank: tok });
    last = at + tok.length;
  }
  if (!out.length) return null;
  if (last < s.length) out.push({ text: s.slice(last) });
  return out;
}

/**
 * 교정 줄 → 노트 낱말 (순수) — [{ w 바른 낱말, from 내 철자(최근 것부터 FROM_MAX개), n 틀린 수, day 마지막으로 틀린 날 번호(날짜 없는 옛 줄은 0), s 그 낱말이 든 고친 글(최근 것) }]
 * spell 칸이 깨진 짝·고친 글에 없는 낱말은 뺀다(낼 문장이 없다) · 낱말 차례 · ROWS_MAX개까지
 */
export function spellRows(list) {
  const by = new Map();
  for (const r of Array.isArray(list) ? list.slice(0, LIST_MAX) : []) {
    if (!isObj(r) || !Array.isArray(r.spell) || typeof r.fixed !== 'string') continue;
    const fixed = r.fixed.slice(0, LONG_MAX); // 낱말 확인은 글 전체에서 — 문장을 보일지(SENT_MAX)는 따로 (🔍 Codex 161차 #4)
    const day = dayOfKey(r.date);
    for (const t of r.spell.slice(0, 10)) {
      if (!isObj(t)) continue;
      const to = tagWord(t.to);
      const from = tagWord(t.from);
      if (!WORD_RE.test(to) || !WORD_RE.test(from) || from === to || !blankOf(fixed, to)) continue; // 꼴이 깨진 칸 · 고친 글에 없는 낱말 = 잘못 적은 칸
      const cur = by.get(to) || { w: to, from: [], n: 0, day: 0, s: '', sDay: -1 };
      cur.n += 1;
      if (day > cur.day) cur.day = day;
      if (day >= cur.sDay) { // 최근 줄 — 낼 문장(너무 긴 글이면 문장 없이 글자 칸만)과 내 철자를 앞에
        cur.s = fixed.length <= SENT_MAX ? fixed : '';
        cur.sDay = day;
        cur.from = [from, ...cur.from.filter((f) => f !== from)].slice(0, FROM_MAX);
      } else if (!cur.from.includes(from) && cur.from.length < FROM_MAX) cur.from.push(from);
      by.set(to, cur);
    }
  }
  return [...by.values()].sort((a, b) => (a.w < b.w ? -1 : a.w > b.w ? 1 : 0)).slice(0, ROWS_MAX).map(({ sDay: _s, ...x }) => x);
}
/** 받아 둔 낱말 고쳐 읽기 (순수 — 이 기기 localStorage에서) — spellRows 꼴만 · 깨진 줄은 뺀다 · 문장에 그 낱말이 없으면 문장 없이 */
export function spellRowsOf(raw) {
  const out = [];
  const seen = new Set();
  for (const r of Array.isArray(raw) ? raw.slice(0, ROWS_MAX) : []) {
    if (!isObj(r) || typeof r.w !== 'string' || !WORD_RE.test(r.w) || seen.has(r.w) || !Array.isArray(r.from)) continue;
    seen.add(r.w);
    const s = typeof r.s === 'string' && r.s.length <= SENT_MAX && blankOf(r.s, r.w) ? r.s : '';
    out.push({ w: r.w, from: r.from.filter((f) => typeof f === 'string' && WORD_RE.test(f)).slice(0, FROM_MAX), n: cnt(r.n) || 1, day: cnt(r.day), s });
  }
  return out;
}

/** 마지막으로 풀 때 본 틀린 수 { 낱말: n } 고쳐 읽기 (순수 · 새 객체) */
export function spellSeenOf(raw) {
  const out = {};
  if (!isObj(raw)) return out;
  for (const k of Object.keys(raw).slice(0, SEEN_MAX)) if (WORD_RE.test(k) && cnt(raw[k])) out[k] = cnt(raw[k]);
  return out;
}
/** 병합 — 낱말마다 큰 쪽 (옛 백업이 졸업한 낱말을 노트로 되살리지 않게) */
export function mergeSpellSeen(a, b) {
  const x = spellSeenOf(a);
  const y = spellSeenOf(b);
  for (const k of Object.keys(y)) x[k] = Math.max(x[k] || 0, y[k]);
  return spellSeenOf(x);
}
/**
 * 노트에 남아 있나 — 졸업(연속 SPELL.done)했고 마지막으로 풀 때 본 틀린 수(seenN)보다 늘지 않았으면 빠진다
 * (날짜로 보면 졸업한 날·그 전 날짜로 늦게 붙은 새 교정을 못 잡았다 — 🔍 Codex 161차 #3)
 */
export function spellActive(row, raw, seenN) {
  const s = stateOf(raw);
  return !(s.box >= SPELL.done && cnt(row && row.n) <= cnt(seenN));
}

/**
 * 이번 쪽지의 낱말 (순수) — 노트에 남은 낱말 가운데 오늘 아직 안 푼 것 · 오래 안 푼 것부터(안 푼 것이 먼저) → 자주 틀린 것 → 낱말 차례 · n개까지
 */
export function pickSpell(rows, states, now, seen = {}, n = SPELL.n) {
  const today = dayNum(now);
  const st = wordsOf(states);
  const sn = spellSeenOf(seen);
  const last = (r) => (st[r.w] && st[r.w].at ? dayNum(st[r.w].at) : 0);
  return (Array.isArray(rows) ? rows : [])
    .filter((r) => isObj(r) && WORD_RE.test(r.w) && spellActive(r, st[r.w], sn[r.w]) && (!st[r.w] || st[r.w].due <= today))
    .sort((a, b) => (last(a) - last(b)) || (b.n - a.n) || (a.w < b.w ? -1 : 1))
    .slice(0, n);
}

/** 오늘 쪽지를 낼 수 있나 — 오늘 아직 안 끝냈고 낼 낱말이 있으면 */
export function spellReady(rows, states, days, now, seen = {}) {
  return !wordsToday(days, now) && pickSpell(rows, states, now, seen).length > 0;
}
/** 🔤 이 자리에 철자 쪽지 — 그날 끝낸 문장이 first(📝 첫 쪽지 자리) 이상이고 낼 수 있으면 */
export function spellSlot(done, ready, first) {
  return !!ready && cnt(done) >= cnt(first);
}
/** 📝 문법 쪽지가 셀 문장 — 오늘 철자 쪽지를 끝냈으면 한 자리(every) 뒤로 (그날 첫 쪽지 자리를 철자가 썼다) */
export function grammarCount(done, spellToday, every) {
  return Math.max(0, cnt(done) - (spellToday ? cnt(every) : 0));
}

/** 쳐 넣은 답 → { kind: 'empty' } | { ok } */
export function spellJudge(typed, w) {
  const t = normWord(typed);
  if (!t) return { kind: 'empty', ok: false };
  return { kind: t === normWord(w) ? 'ok' : 'no', ok: t === normWord(w) };
}

/** 내 철자 ↔ 바른 철자 (순수) — 글자마다 { ch, chg: 차례를 지키는 같은 글자(LCS) 밖인가 } · 둘 다 */
export function spellMarks(from, to) {
  const a = [...String(from || '')];
  const b = [...String(to || '')];
  const L = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) L[i][j] = a[i].toLowerCase() === b[j].toLowerCase() ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const sa = new Array(a.length).fill(false);
  const sb = new Array(b.length).fill(false);
  for (let i = 0, j = 0; i < a.length && j < b.length;) {
    if (a[i].toLowerCase() === b[j].toLowerCase()) { sa[i] = true; sb[j] = true; i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++;
  }
  return { from: a.map((ch, i) => ({ ch, chg: !sa[i] })), to: b.map((ch, j) => ({ ch, chg: !sb[j] })) };
}

/**
 * 🔤 쪽지를 끝냈다 (한 트랜잭션 — xp.spellFinish) — 낱말마다 처음 답으로 진도 · 그날 처음 끝낸 쪽지면 💰10
 *   처음에 맞힘: 오늘 아직 안 푼 낱말(due ≤ 오늘)이면 칸 +1(같은 날·시계가 꼬인 날 또 맞혀도 한 번 — 🔍 Codex 161차 #1) · 칸이 SPELL.done이 되면 ⭐ 졸업 ·
 *   틀림: 칸 0 · 졸업 뒤 틀린 수가 늘었으면(에세이에서 또 틀림) 처음부터 · 푼 낱말은 지금 틀린 수를 spellSeen에
 * @param {Array<{w:string, ok:boolean}>} results 낸 차례 · ok = 처음 답이 맞았나
 * @param {Array<object>} rows 받아 둔 낱말(spellRows — 틀린 수)
 */
export function spellFinishRule(profile, results, now, rows) {
  const seen = new Set();
  const list = (Array.isArray(results) ? results : []).filter((x) => isObj(x) && typeof x.w === 'string' && WORD_RE.test(x.w) && !seen.has(x.w) && !!seen.add(x.w)).slice(0, 10);
  if (!list.length) return { ok: false, why: 'empty' };
  const today = dayNum(now);
  const st = wordsOf(profile.spell);
  const nOf = new Map((Array.isArray(rows) ? rows : []).filter(isObj).map((r) => [r.w, cnt(r.n)]));
  const sn = spellSeenOf(profile.spellSeen);
  const grads = [];
  for (const x of list) {
    const cur = st[x.w] || stateOf(null);
    const rowN = nOf.get(x.w) || 0;
    const start = cur.box >= SPELL.done && rowN > (sn[x.w] || 0) ? 0 : cur.box; // 졸업 뒤 에세이에서 또 틀림 — 처음부터
    let box = start;
    let miss = cur.miss;
    if (x.ok === true) { if (cur.due <= today) box = Math.min(SPELL.done, start + 1); } else { box = 0; miss = big(miss + 1); }
    if (box >= SPELL.done && start < SPELL.done) grads.push(x.w);
    st[x.w] = { box, due: Math.max(today + 1, cur.due), at: big(Math.max(cnt(now), cur.at + 1)), miss, d0: cur.d0 || today };
    if (rowN > (sn[x.w] || 0)) sn[x.w] = rowN;
  }
  profile.spell = st;
  profile.spellSeen = spellSeenOf(sn);
  const first = !wordsToday(profile.spellDay, now);
  const days = wordDaysOf(profile.spellDay, today);
  let coins = 0;
  if (first) {
    coins = SPELL.coins;
    days[today] = 1;
    profile.coins = (Number(profile.coins) || 0) + coins;
    profile.coinsEarned = (Number(profile.coinsEarned) || 0) + coins;
  }
  profile.spellDay = wordDaysOf(days, today);
  return { ok: true, first, coins, grads };
}

/** 쪽지 끝 말 (순수 · 아이 화면 — 셈 없이) → { title, lines } */
export function spellFinishText(res) {
  if (!res || !res.ok) return { title: '저장이 안 됐어요', lines: ['[다시 저장하기]를 눌러 주세요 — 쓴 것은 그대로예요'] };
  const lines = [res.first ? `💰 +${res.coins}` : '오늘의 💰는 이미 받았어요 — 한 것은 기록에 들어갔어요'];
  if (Array.isArray(res.grads) && res.grads.length) lines.push(`⭐ ${res.grads.join(' · ')} — 이제 안 틀려요! 노트에서 졸업`);
  return { title: '🔤 철자 쪽지 끝!', lines };
}

/** 📤 english/spell.md (순수 · 아빠만) — 노트 낱말·졸업·최근 7일 쪽지 날 · 낱말마다 틀린 수·내 철자·칸 */
export function spellMd(rows, states, days, now, today, seen = {}) {
  const st = wordsOf(states);
  const sn = spellSeenOf(seen);
  const list = Array.isArray(rows) ? rows : [];
  const t = dayNum(now);
  const active = list.filter((r) => spellActive(r, st[r.w], sn[r.w]));
  const grad = list.filter((r) => !spellActive(r, st[r.w], sn[r.w]));
  const dd = wordDaysOf(days, t);
  const week = Object.keys(dd).filter((k) => Number(k) > t - 7 && Number(k) <= t).length;
  const line = (r) => { const s = st[r.w]; return `- ${r.w} ← ${r.from.join(', ')} · 에세이에서 틀린 수 ${r.n} · ${s && s.at ? `연속 ${s.box}/${SPELL.done} · 틀림 ${s.miss}` : '아직 안 풂'}`; };
  return [`🔤 철자 노트 (${today}) — 노트 낱말 ${active.length} · 졸업 ${grad.length} · 최근 7일 쪽지 ${week}일`, '', '## 노트 낱말', ...(active.length ? active.map(line) : ['(없음)']), '', '## 졸업', ...(grad.length ? grad.map(line) : ['(없음)'])].join('\n') + '\n';
}
