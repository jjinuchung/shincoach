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
  // 아이가 이미 본 설명(규칙·풀이 단계)도 담는다 — 답하는 사람이 같은 말을 되풀이하지 않게 (Codex 4차 #11)
  const sv = (q && q.solve) || {};
  const steps = (Array.isArray(sv.steps) ? sv.steps : []).map((x) => typeof x === 'string' ? x : (x && (x.text || x.t)) || '').filter(Boolean);
  const seen = [sv.rule ? `규칙: ${sv.rule}` : '', ...steps].filter(Boolean).join(' / ').slice(0, 400);
  return {
    concept: q.concept, k: q.kind || 'calc', key: q.key || '', q: String(q.q || ''), expr: String(q.expr || ''),
    my: String((a && a.chosen) || ''), ans: String(okCh.text || ''), tag: String((a && a.tag) || ''), w: String((a && a.w) || ''),
    choices: (q && q.choices || []).map((c) => String((c && c.text) || '')), seen,
  };
}

/** 오늘 물어본 수 */
export function askedToday(m, today) {
  return list(m).filter((x) => x && x.d === today).length;
}

/** 같은 개념의 같은 유형(key)을 이미 물어봤고 아직 안 끝났나 — key만 보면 분수 ②('misread' 고정)가 개념을 넘어 겹친다 (Codex 4차 #3) */
export function pendingAskFor(m, concept, key) {
  return key ? list(m).find((x) => x && x.concept === concept && x.key === key && !['fixed', 'closed'].includes(x.status)) || null : null;
}

/**
 * ❓ 질문 남기기. 번호(no)는 m.askSeq로 고정 — 복사문의 ❓N과 답의 💬N이 영원히 짝이다.
 * @returns {{ok:true, ask:object} | {ok:false, reason:'dup'|'limit'}}
 */
export function addAsk(m, ctx, today, kid = '') {
  if (pendingAskFor(m, ctx.concept, ctx.key)) return { ok: false, reason: 'dup' };
  if (askedToday(m, today) >= ASK_DAILY_MAX) return { ok: false, reason: 'limit' };
  m.asks = list(m).slice();
  m.askSeq = (Number(m.askSeq) || 0) + 1;
  const t = Date.now();
  const ask = { id: `a${t.toString(36)}${m.askSeq}`, no: m.askSeq, t, u: t, d: today, ...ctx, kid: String(kid || '').trim().slice(0, 200), status: 'asked', replies: [], again: [], tries: 0 };
  m.asks.push(ask);
  trimAsks(m);
  return { ok: true, ask };
}

/** 끝난 것(fixed·closed)만 오래된 순으로 정리한다 — 미해결은 아무리 많아도 지우지 않는다 (지우면 번호로 온 답장이 갈 곳을 잃는다, Codex 4차 #4) */
function trimAsks(m) {
  const over = m.asks.length - ASKS_MAX;
  if (over <= 0) return;
  const done = m.asks.filter((x) => ['fixed', 'closed'].includes(x.status)).sort((a, b) => a.t - b.t);
  const drop = new Set(done.slice(0, over).map((x) => x.id));
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
  // 이력 전체와 비교 — 배포 답장 A 뒤에 붙여넣기 B가 오고 다시 수학을 열면 JSON의 A가 또 오는데, 마지막만 보면 [A, B, A]가 된다 (Codex 4차 #1)
  const same = (x) => String(x || '').replace(/\s+/g, ' ').trim();
  if (ask.replies.some((r) => same(r.text) === same(body))) return false;
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

/**
 * 😄 이해했어요 / 😶 아직 모르겠어요(한마디와 함께 다시 아빠에게).
 * answered에서, 그리고 understood에서도 😶는 된다 — 이해했다고 했다가 문제를 틀리고 답장을 다시 보면 되물을 수 있어야 한다 (Codex 4차 #2).
 * seenT: 화면이 보여 준 마지막 답장의 시각 — 그 사이 다른 창에서 새 답장이 붙었으면 'stale'을 돌려주고 아무것도 안 바꾼다 (#5)
 * @returns {true|false|'stale'}
 */
export function decideAsk(m, id, understood, kid = '', seenT = undefined) {
  const ask = list(m).find((x) => x && x.id === id);
  if (!ask) return false;
  if (!(ask.status === 'answered' || (!understood && ask.status === 'understood'))) return false;
  const lastT = (ask.replies && ask.replies.length) ? ask.replies[ask.replies.length - 1].t : 0;
  if (seenT !== undefined && lastT !== seenT) return 'stale';
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
export function applyAskTry(m, id, ok, today, { sameKey = true } = {}) {
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
    // 같은 틀을 맞혔을 때만 그 유형의 🤔 노트를 지운다 — 틀이 바뀌어 다른 문제로 확인했으면 원래 유형을 고쳤다고 볼 수 없다 (Codex 4차 #7).
    // 지운 표시(cleared)는 노트가 지금 없어도 남긴다 — 옛 백업에서 되살아나지 않게 (#8)
    const rec = m.concepts && m.concepts[ask.concept];
    if (sameKey && rec && ask.key) {
      rec.notes = (Array.isArray(rec.notes) ? rec.notes : []).filter((n) => n.key !== ask.key);
      markCleared(rec, ask.key);
    }
    ask.sameKey = sameKey ? 1 : 0;
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
  const lines = [`❓ 진우의 수학 질문 ${open.length}개 (${today}) — 답은 \`💬번호\`로 시작하는 줄 뒤에 써 주세요. 여러 줄 가능, 그림은 [bar 3/4] [pizza 1/4] [bars 1/4 1/6] [line -5..5] [walk -2 +5] 처럼.`, '아이 눈높이(초4)로, 답을 바로 말하지 말고 왜 그런지부터. 아빠 이름으로 나갑니다.', ''];
  for (const a of open) {
    lines.push(`❓${a.no} ${nameOf(a.concept)} · ${KIND_SHORT[a.k] || a.k} · ${a.d}`);
    lines.push(`문제: ${a.q}`);
    if (a.expr) lines.push(`식: ${a.expr}`);
    lines.push(`진우 답: ${a.my || '(없음)'} ❌${a.tag ? ` (오개념: ${a.tag})` : ''}${a.w && WHY_LABEL[a.w] ? ` · 진우: ${WHY_LABEL[a.w]}` : ''}`);
    lines.push(`정답: ${a.ans}`);
    if (Array.isArray(a.choices) && a.choices.length) lines.push(`보기: ${a.choices.map((c, i) => `${['①', '②', '③', '④'][i] || i + 1} ${c}${c === a.ans ? ' ✔' : c === a.my ? ' ❌' : ''}`).join(' · ')}`);
    if (a.seen) lines.push(`앱이 이미 보여 준 설명: ${a.seen}`);
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
  const bad = [];
  let cur = null;
  // 카톡·메모를 거치면 전각 숫자(１２)·전각 콜론(：)이 섞인다 — 머리 줄만 정규화 (Codex 4차 #10)
  const norm = (s) => s.replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xFF10 + 48)).replace(/：/g, ':');
  for (const raw of String(text || '').split(/\r?\n/)) {
    const head = norm(raw);
    const m = /^\s*💬\s*(\d+)\s*[:.）)\-—]?\s*(.*)$/.exec(head);
    if (m) { cur = { no: Number(m[1]), lines: [m[2]] }; out.set(cur.no, cur); continue; }
    if (/^\s*💬/.test(head)) { cur = null; bad.push(raw.trim()); continue; } // 번호를 못 읽은 💬 줄 — 앞 답장에 섞이지 않게 끊는다
    if (cur) cur.lines.push(raw);
  }
  const list = [...out.values()].map((b) => ({ no: b.no, text: b.lines.join('\n').trim() })).filter((b) => b.text);
  if (bad.length) list.bad = bad; // 화면이 "번호를 못 읽은 줄이 있어요"로 알린다
  return list;
}
