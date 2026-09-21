// ❓ 아빠에게 묻기 — 수학 질문 왕복 (순수 함수, 2026-09-21 아버님 제안)
//
// 아이는 "무엇을 모르는지"를 글로 못 쓴다 — 그래서 메모의 알맹이는 앱이 자동으로 담는다(개념·문항·식·내 답·정답·오개념 이름표).
// 아이는 ❓ 한 번 누르고, 원하면 한마디만 덧붙인다. 아빠는 📊에서 📋 복사해 Claude에게 보여 주고, 답을 붙여넣거나(즉시)
// coach/math/replies.json으로 배포한다(손 안 탐). 아이는 📬 답장을 읽고 😄 이해했어요 / 😶 아직 모르겠어요 → 이해했으면
// 같은 틀의 문제 하나 → 맞히면 보상 + 🤔 노트에서 지움. 답장은 **아빠 이름**으로 간다 — 이 앱의 차별점은 아빠가 루프 안에 있는 것.
//
// 저장은 math 레코드 안(m.asks) — 🛟 백업·두 창(updateMath RMW)·병합(mergeMath → mergeAsks)이 한 번에 해결된다.
// ask = { id, no, t, u, d, concept, k, key, q, expr, my, ans, tag, w, kid, status, replies:[{t,text}], again:[{t,kid}], readAt, tries, tryOk }
// status: asked(아빠 기다림) → answered(답장 옴, 아직 안 읽음) → understood | again(다시 아빠에게) → fixed(문제 맞힘) / closed(아빠가 닫음)

import { markCleared, nameOf, KIND_SHORT, WHY_LABEL } from './mathprog.js';

/** 하루에 물어볼 수 있는 수 — 질문함이 잡동사니가 되지 않게 */
export const ASK_DAILY_MAX = 3;
/** 남겨 두는 질문 수 (오래된 fixed·closed부터 지운다) */
export const ASKS_MAX = 40;
/** 답장을 읽고 같은 유형 문제를 맞히면 — 문항 정답(⚡3)보다 크고 복습 통과(⚡25)보다 작게 */
export const ASK_REWARD = { xp: 10, coin: 3 };
export const OPEN = new Set(['asked', 'again']);         // 아빠가 답할 차례
export const STATUS_LABEL = { asked: '아빠 답 기다리는 중', answered: '답장 옴 — 진우가 아직 안 읽음', again: '진우가 아직 모르겠대요 — 다시 답할 차례', understood: '이해했어요 (문제는 아직)', fixed: '문제까지 맞혔어요', closed: '닫음' };

const list = (m) => (m && Array.isArray(m.asks)) ? m.asks : [];
/** 바뀐 시각 — 같은 밀리초에 두 번 바뀌어도 앞 값보다 크게 (병합이 최신 상태를 고르는 기준) */
const touch = (ask) => { ask.u = Math.max(Date.now(), (Number(ask.u) || 0) + 1); return ask.u; };

/** 문항과 답 기록에서 질문 문맥을 만든다 — 아빠가 받는 알맹이 */
export function askContext(q, a) {
  const okCh = (q && q.choices || []).find((c) => c && c.ok) || {};
  return {
    concept: q.concept, k: q.kind || 'calc', key: q.key || '', q: String(q.q || ''), expr: String(q.expr || ''),
    my: String((a && a.chosen) || ''), ans: String(okCh.text || ''), tag: String((a && a.tag) || ''), w: String((a && a.w) || ''),
  };
}

/** 오늘 물어본 수 */
export function askedToday(m, today) {
  return list(m).filter((x) => x && x.d === today).length;
}

/** 같은 유형(key)을 이미 물어봤고 아직 안 끝났나 */
export function pendingAskFor(m, key) {
  return key ? list(m).find((x) => x && x.key === key && !['fixed', 'closed'].includes(x.status)) || null : null;
}

/**
 * ❓ 질문 남기기. 번호(no)는 m.askSeq로 고정 — 복사문의 ❓N과 답의 💬N이 영원히 짝이다.
 * @returns {{ok:true, ask:object} | {ok:false, reason:'dup'|'limit'}}
 */
export function addAsk(m, ctx, today, kid = '') {
  if (pendingAskFor(m, ctx.key)) return { ok: false, reason: 'dup' };
  if (askedToday(m, today) >= ASK_DAILY_MAX) return { ok: false, reason: 'limit' };
  m.asks = list(m).slice();
  m.askSeq = (Number(m.askSeq) || 0) + 1;
  const t = Date.now();
  const ask = { id: `a${t.toString(36)}${m.askSeq}`, no: m.askSeq, t, u: t, d: today, ...ctx, kid: String(kid || '').trim().slice(0, 200), status: 'asked', replies: [], again: [], tries: 0 };
  m.asks.push(ask);
  trimAsks(m);
  return { ok: true, ask };
}

function trimAsks(m) {
  if (m.asks.length <= ASKS_MAX) return;
  const doneFirst = [...m.asks].sort((a, b) => (['fixed', 'closed'].includes(a.status) ? 0 : 1) - (['fixed', 'closed'].includes(b.status) ? 0 : 1) || a.t - b.t);
  const drop = new Set(doneFirst.slice(0, m.asks.length - ASKS_MAX).map((x) => x.id));
  m.asks = m.asks.filter((x) => !drop.has(x.id));
}

/** 아빠가 답할 차례인 것 (오래된 순) */
export function openAsks(m) {
  return list(m).filter((x) => x && OPEN.has(x.status)).sort((a, b) => a.t - b.t);
}
/** 📬 아이가 아직 안 읽은 답장 (오래된 순) — 이게 있으면 ☀️가 잠긴다 */
export function unreadAsks(m) {
  return list(m).filter((x) => x && x.status === 'answered').sort((a, b) => a.t - b.t);
}
/** 아직 안 끝난 것 전부 (📊 목록용, 최근 순) */
export function activeAsks(m) {
  return list(m).filter((x) => x && !['fixed', 'closed'].includes(x.status)).sort((a, b) => b.t - a.t);
}

/**
 * 💬 답장 붙이기 — 번호로. 이미 같은 글이 마지막 답장이면 아무것도 안 한다 (replies.json은 화면 열 때마다 반영하므로 멱등이어야 한다).
 * 끝난 질문(fixed·closed)에는 붙지 않는다.
 */
export function applyReply(m, no, text) {
  const ask = list(m).find((x) => x && x.no === Number(no));
  const body = String(text || '').trim();
  if (!ask || !body || ['fixed', 'closed'].includes(ask.status)) return false;
  ask.replies = Array.isArray(ask.replies) ? ask.replies : [];
  const last = ask.replies[ask.replies.length - 1];
  if (last && last.text === body) return false;
  const t = touch(ask);
  ask.replies.push({ t, text: body });
  ask.status = 'answered';
  return true;
}

/** 아이가 답장 화면을 열었다 */
export function markAskRead(m, id) {
  const ask = list(m).find((x) => x && x.id === id);
  if (!ask) return false;
  if (!ask.readAt) ask.readAt = touch(ask);
  return true;
}

/** 😄 이해했어요 / 😶 아직 모르겠어요(한마디와 함께 다시 아빠에게) */
export function decideAsk(m, id, understood, kid = '') {
  const ask = list(m).find((x) => x && x.id === id);
  if (!ask || ask.status !== 'answered') return false;
  const t = touch(ask);
  if (understood) ask.status = 'understood';
  else { ask.status = 'again'; ask.again = Array.isArray(ask.again) ? ask.again : []; ask.again.push({ t, kid: String(kid || '').trim().slice(0, 200) }); }
  ask.readAt = ask.readAt || t;
  return true;
}

/**
 * 이해한 뒤 같은 틀의 문제를 풀어 본 결과. 맞히면 fixed + 그 유형의 🤔 노트를 지운다(답장으로 고친 것). 틀리면 understood 그대로 — 다시 해 볼 수 있다.
 * 일지에 'ask' 한 줄 (📊 활동에 센다).
 */
export function applyAskTry(m, id, ok, today) {
  const ask = list(m).find((x) => x && x.id === id);
  if (!ask || !['understood', 'fixed'].includes(ask.status)) return { ok: false };
  const t = touch(ask);
  ask.tries = (ask.tries || 0) + 1;
  ask.triedAt = t;
  let fixed = false;
  if (ok && ask.status !== 'fixed') {
    ask.status = 'fixed';
    ask.tryOk = 1;
    fixed = true;
    const rec = m.concepts && m.concepts[ask.concept];
    if (rec && Array.isArray(rec.notes) && ask.key && rec.notes.some((n) => n.key === ask.key)) {
      rec.notes = rec.notes.filter((n) => n.key !== ask.key);
      markCleared(rec, ask.key);
    }
  }
  m.log = Array.isArray(m.log) ? m.log : [];
  m.log.push({ d: today, t, id: 'ask', mode: 'ask', ok: ok ? 1 : 0, n: 1, qs: [{ k: ask.k, ok: ok ? 1 : 0, c: ask.concept, no: ask.no }] });
  return { ok: true, fixed };
}

/** 아빠가 닫기 (답 없이 끝내거나, 만나서 설명했거나) */
export function closeAsk(m, id) {
  const ask = list(m).find((x) => x && x.id === id);
  if (!ask) return false;
  ask.status = 'closed';
  touch(ask);
  return true;
}

/** 📊 루프 지표 — 어디서 끊기는지 */
export function askSummary(m) {
  const out = { asked: 0, answered: 0, again: 0, understood: 0, fixed: 0, closed: 0, total: 0 };
  for (const x of list(m)) { if (!x) continue; out.total++; if (out[x.status] !== undefined) out[x.status]++; }
  return out;
}

/**
 * 📋 아빠가 Claude에게 붙여 넣을 글 — 답할 차례인 질문만. 답은 `💬번호`로 시작하는 줄 뒤에.
 * (에세이의 [번호]와 같은 왕복 형식 — 번호는 askSeq라 화면이 바뀌어도 안 밀린다)
 */
export function asksText(m, today) {
  const open = openAsks(m);
  const lines = [`❓ 진우의 수학 질문 ${open.length}개 (${today}) — 답은 \`💬번호\`로 시작하는 줄 뒤에 써 주세요. 여러 줄 가능, 그림은 [bar 3/4] [pizza 1/4] [bars 1/4 1/6] [line -5 5] 처럼.`, '아이 눈높이(초4)로, 답을 바로 말하지 말고 왜 그런지부터. 아빠 이름으로 나갑니다.', ''];
  for (const a of open) {
    lines.push(`❓${a.no} ${nameOf(a.concept)} · ${KIND_SHORT[a.k] || a.k} · ${a.d}`);
    lines.push(`문제: ${a.q}`);
    if (a.expr) lines.push(`식: ${a.expr}`);
    lines.push(`진우 답: ${a.my || '(없음)'} ❌${a.tag ? ` (오개념: ${a.tag})` : ''}${a.w && WHY_LABEL[a.w] ? ` · 진우: ${WHY_LABEL[a.w]}` : ''}`);
    lines.push(`정답: ${a.ans}`);
    if (a.kid) lines.push(`진우 말: "${a.kid}"`);
    (a.replies || []).forEach((r, i) => {
      lines.push(`아빠 답장 ${i + 1}: ${r.text.replace(/\n+/g, ' / ')}`);
      const ag = (a.again || [])[i];
      if (ag) lines.push(`→ 진우: 아직 모르겠어요${ag.kid ? ` — "${ag.kid}"` : ''}`);
    });
    lines.push('');
  }
  return lines.join('\n').trimEnd();
}

/**
 * 붙여 넣은 답 글에서 `💬번호 …` 블록을 뽑는다. 블록은 다음 💬번호 줄까지(여러 줄). 같은 번호가 두 번이면 뒤의 것.
 * @returns {Array<{no:number, text:string}>}
 */
export function parseReplies(text) {
  const out = new Map();
  let cur = null;
  for (const raw of String(text || '').split(/\r?\n/)) {
    const m = /^\s*💬\s*(\d+)\s*[:.）)\-—]?\s*(.*)$/.exec(raw);
    if (m) { cur = { no: Number(m[1]), lines: [m[2]] }; out.set(cur.no, cur); continue; }
    if (cur) cur.lines.push(raw);
  }
  return [...out.values()].map((b) => ({ no: b.no, text: b.lines.join('\n').trim() })).filter((b) => b.text);
}
