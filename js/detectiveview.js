// 🕵️ 나옹의 숙제 봐 주기 화면 (v299, 2026-10-19 아버님 "추천대로" · 원고 "이대로") — 규칙은 detective.js(순수)
// 한 문제: ① 나옹의 공책에서 처음 틀린 줄 누르기 → ② 그 줄을 바르게 고친 것 고르기(보기 셋) → ③ 고친 풀이·나옹의 실수·칸 규칙
// 저장: 처음 누른 줄·처음 고른 보기·바르게 고친 것은 그 순간 처음 답 줄(answerQueue → db.updateMath(answerRule))로 — 그만두고 다시 열어도 그날의 처음 답은 그대로 ·
// 한 판을 끝내면 xp.commitChalRound(못 적은 처음 답 먼저 + finishRule — 수학 기록과 💰·🔷를 한 트랜잭션 · 🎯는 수학 기록의 잡기 예약 addPending)
// math.js가 ctx로 화면 비우기·사다리로 돌아가기·수학 기록·글 그리기(richNode — 세로 분수·숫자 뒤 조사)·칸 원고를 건넨다
// (이 파일은 math.js를 import하지 않는다 — mathpuzzleview와 같은 꼴)
import { ROUND_N, kindsOf, lineWhy, optionOrder, pickRound, validItems, answerRule, finishRule, detectOf, detectTodayLine, answerQueue } from './detective.js';
import { updateMath } from './db.js';
import { commitChalRound } from './xp.js';
import { addPending, stageOf } from './mathprog.js';
import { todayKey } from './track.js';
import { guardStart } from './timeup.js';
import { sfx, unlock as sfxUnlock } from './sfx.js';
import { animUrl, ensureAnim } from './sprite.js';

const MEOWTH = 52; // 나옹 — 로켓단 화면과 같은 도트 그림(없으면 😼)
const SAY = { find: '숙제 다 했다옹! 맞았는지 봐 달라옹!', fix: '냐옹… 들켰다옹!', done: '다음엔 안 틀린다옹!' };
const CIRC = '①②③④⑤';

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

// data: 원고 (undefined = 아직 안 받음 · null = 못 받음) · ctx: 마지막으로 건네받은 화면 잇기(저장된 수학 기록을 건넨다) ·
// ds: 지금 보는 판 { seed, items: [{ it, kinds, order }], i, phase: 'find'|'fix'|'done', taps: { 줄: 1 }, tried: [보기], firstLine, firstFix, msg, msgOk,
//      saveErr, results, finishing, finishErr, done }
const S = { data: undefined, ds: null, ctx: null };
// 처음 답 줄 — 판과 따로(그만두고 새 판을 열어도 못 적은 답은 그대로 남아 다음 저장·판 끝 트랜잭션에서 적힌다, Codex 105차 #2) ·
// 답마다 누른 날(d)이 붙어 있다 — 저장이 늦어 자정을 넘겨도 누른 날로 (Codex 105차 #7)
const Q = answerQueue(
  (batch) => updateMath((mm) => { for (const a of batch) answerRule(mm, a, todayKey()); }),
  (m) => { if (S.ctx && m) S.ctx.setState(m); },
);

/** 지금 판을 보는 중인가 (math.js가 🎒·📊에서 돌아올 때 본다) */
export function detectActive() {
  return !!S.ds;
}
/** 판을 버린다 (사다리·홈으로 나갈 때) — 못 적은 처음 답은 뒤에서 한 번 더(실패하면 줄에 남아 다음에) */
export function endDetect() {
  if (Q.size) Q.flush().catch(() => {});
  S.ds = null;
}

async function loadData() {
  if (S.data !== undefined) return S.data;
  try {
    const res = await fetch('./coach/math/detective.json');
    S.data = res.ok ? await res.json() : null;
  } catch { S.data = null; }
  return S.data;
}

/** 이 판에 낼 문제 — 🐣 이상인 칸 · 🤔 칸 먼저 · 최근 본 것은 뒤로 · 줄기가 겹치지 않게 */
function planRound(ctx, seed) {
  const m = ctx.getState() || {};
  const known = new Set();
  const noted = new Set();
  for (const [id, rec] of Object.entries(m.concepts || {})) {
    const st = stageOf(rec);
    if (st === 'known' || st === 'crowned') known.add(id);
    if (rec && Array.isArray(rec.notes) && rec.notes.length) noted.add(id);
  }
  return pickRound(validItems(S.data, ctx.cells()), { known, noted, seen: detectOf(m.detect).seen, today: todayKey(), seed });
}

/** 사다리 머리·줄기 고르기의 🕵️ 단추 — 원고를 받고, 낼 문제가 셋 있을 때만 그린다 */
export function detectButton(ctx) {
  const slot = el('div', 'dtv-slot');
  loadData().then((data) => {
    if (!data || !slot.isConnected) return;
    if (planRound(ctx, 0).length < ROUND_N) return;
    const got = detectOf((ctx.getState() || {}).detect).day[todayKey()] || 0;
    const b = el('button', `btn btn-big-wide dtv-btn${got ? ' is-done' : ''}`, got ? '🕵️ 나옹의 숙제 한 판 더' : '🕵️ 나옹의 숙제 봐 주기');
    b.type = 'button';
    b.addEventListener('click', () => guardStart('math', () => startDetect(ctx)));
    slot.appendChild(b);
    slot.appendChild(el('p', 'math-note dtv-slot-note', `😼 "맞았는지 봐 달라옹!" — ${detectTodayLine(got)}`));
  }).catch(() => {});
  return slot;
}

/** 새 판 — 씨앗은 판을 열 때 정해 🎒를 다녀와도 같은 문제·같은 보기 차례 */
export async function startDetect(ctx) {
  sfxUnlock();
  S.ctx = ctx;
  await loadData();
  if (Q.size) await Q.flush().catch(() => false); // 앞 판에서 못 적은 처음 답부터 (못 적어도 줄에 남아 판 끝에 적힌다)
  const seed = Date.now() % 2147483647 || 1;
  const items = S.data ? planRound(ctx, seed) : [];
  if (items.length < ROUND_N) { ctx.back(); return; }
  S.ds = {
    seed, items: items.map((it) => ({ it, kinds: kindsOf(it), order: optionOrder(it.id, seed) })), i: 0,
    phase: 'find', taps: {}, tried: [], firstLine: null, firstFix: null, msg: '', msgOk: false,
    saveErr: false, results: [], finishing: false, finishErr: false, done: null,
  };
  render(ctx);
}
/** 🎒·📊에서 돌아왔다 — 하던 자리 그대로 */
export function resumeDetect(ctx) {
  if (!S.ds) { ctx.back(); return; }
  S.ctx = ctx;
  render(ctx);
}

function quit(ctx) {
  endDetect();
  ctx.back();
}

function meowthEl() {
  const box = el('span', 'dtv-face');
  const img = el('img', 'dtv-meowth');
  img.alt = '나옹';
  img.draggable = false;
  const alt = el('span', 'dtv-meowth-alt', '😼');
  const show = (u) => { img.src = u; img.hidden = false; alt.hidden = true; };
  img.hidden = true;
  const u = animUrl(MEOWTH);
  if (u) show(u); else ensureAnim(MEOWTH).then((x) => { if (x && img.isConnected) show(x); }).catch(() => {});
  box.appendChild(img);
  box.appendChild(alt);
  return box;
}

/** 다시 그리기 — keep이면 읽던 자리 그대로(줄·보기를 누를 때) */
function render(ctx, keep = false) {
  const ds = S.ds;
  if (!ds) { ctx.back(); return; }
  const y = keep ? window.scrollY : 0;
  const m = ctx.clearMain();
  const card = el('section', 'math-card dtv-card');
  const top = el('div', 'dtv-top');
  if (!ds.done && !ds.finishing) {
    const q = el('button', 'btn btn-small dtv-quit', '← 그만하기');
    q.type = 'button';
    q.addEventListener('click', () => quit(ctx));
    top.appendChild(q);
  }
  card.appendChild(top);
  if (ds.i >= ds.items.length) { card.appendChild(finishEl(ctx)); m.appendChild(card); return; }
  const { it, kinds, order } = ds.items[ds.i];
  card.appendChild(el('div', 'math-eyebrow', `🕵️ 나옹의 숙제 · ${ds.i + 1} / ${ds.items.length} · ${ctx.label(it.cell)}`));
  const who = el('div', 'dtv-who');
  who.appendChild(meowthEl());
  who.appendChild(el('p', 'dtv-bubble', SAY[ds.phase]));
  card.appendChild(who);
  const q = el('p', 'math-qtext dtv-q');
  q.appendChild(el('span', 'dtv-q-lab', '문제 '));
  q.appendChild(ctx.rich(it.q));
  card.appendChild(q);
  card.appendChild(noteEl(ctx, it, kinds));
  const live = el('p', `dtv-fb${ds.msg ? (ds.msgOk ? ' is-ok' : ' is-no') : ''}`);
  live.setAttribute('aria-live', 'polite');
  live.textContent = ds.msg || (ds.phase === 'find' ? '어디가 처음 틀렸을까요? 줄을 눌러 보세요.' : '');
  card.appendChild(live);
  if (ds.phase === 'fix' || ds.phase === 'done') card.appendChild(optsEl(ctx, it, order));
  if (ds.phase === 'done') {
    const wrap = el('div', 'dtv-wrapup');
    wrap.appendChild(el('p', 'dtv-say', `나옹의 실수 — ${it.say}`));
    const rule = (ctx.cells()[it.cell] || {}).rule;
    if (rule) wrap.appendChild(el('p', 'dtv-rule', `📏 ${rule}`));
    card.appendChild(wrap);
  }
  card.appendChild(saveEl(ctx));
  m.appendChild(card);
  if (keep && y) window.scrollTo(0, y);
  // 초점 — 다 고쳤으면 [다음 숙제](저장이 안 됐으면 [다시 저장하기]) · 고칠 때는 아직 안 고른 첫 보기 ·
  // 찾을 때는 두지 않는다(첫 줄에 테두리가 생기면 이미 고른 줄처럼 보인다 — 헤드리스 390)
  const focus = ds.phase === 'done' ? (card.querySelector('.dtv-next') || card.querySelector('.dtv-retry'))
    : ds.phase === 'fix' ? card.querySelector('.dtv-opt:not(:disabled)') : null;
  if (focus && focus.focus) { try { focus.focus({ preventScroll: true }); } catch { /* 초점은 없어도 */ } }
}

/** 나옹의 공책 — 찾을 때는 줄마다 단추 · 찾은 뒤에는 틀린 줄에 빨간 줄 · 다 고치면 따라간 줄도 빨간 펜으로 */
function noteEl(ctx, it, kinds) {
  const ds = S.ds;
  const note = el('div', 'dtv-note');
  it.lines.forEach((t, i) => {
    const k = kinds[i];
    const b = el('button', 'dtv-ln');
    b.type = 'button';
    b.appendChild(el('span', 'dtv-no', CIRC[i]));
    const txt = el('span', 'dtv-t');
    txt.appendChild(ctx.rich(t));
    b.appendChild(txt);
    if (ds.phase === 'find') {
      if (ds.taps[i]) b.classList.add(k === 'ok' ? 'is-okline' : 'is-tapped');
      b.setAttribute('aria-label', `${i + 1}째 줄${ds.taps[i] ? (k === 'ok' ? ' — 맞는 줄' : ' — 처음 틀린 줄이 아님') : ''}`);
      b.addEventListener('click', () => pickLine(ctx, i));
    } else {
      b.disabled = true;
      if (k === 'wrong') b.classList.add('is-wrong');
      if (ds.phase === 'done' && k !== 'ok') {
        if (k === 'follow') b.classList.add('is-follow');
        const fix = el('span', 'dtv-fix');
        fix.appendChild(document.createTextNode('→ '));
        fix.appendChild(ctx.rich(it.fixed[i]));
        b.appendChild(fix);
      }
    }
    note.appendChild(b);
  });
  return note;
}

/** 보기 셋 — 원고 차례가 아니라 판의 씨앗으로 섞은 차례 · 틀린 보기는 고른 뒤 잠근다 */
function optsEl(ctx, it, order) {
  const ds = S.ds;
  const box = el('div', 'dtv-opts');
  for (const o of order) {
    const b = el('button', 'dtv-opt');
    b.type = 'button';
    b.appendChild(ctx.rich(it.opts[o]));
    if (ds.tried.includes(o)) { b.classList.add('is-no'); b.disabled = true; }
    if (ds.phase === 'done') { b.disabled = true; if (o === 0) b.classList.add('is-ok'); }
    else b.addEventListener('click', () => pickFix(ctx, o));
    box.appendChild(b);
  }
  return box;
}

function pickLine(ctx, i) {
  const ds = S.ds;
  if (!ds || ds.phase !== 'find') return;
  const { it, kinds } = ds.items[ds.i];
  const ok = kinds[i] === 'wrong';
  if (ds.firstLine === null) { ds.firstLine = ok; enqueue(ctx, { id: it.id, cell: it.cell, step: 'line', ok }); }
  if (ok) {
    ds.phase = 'fix';
    ds.msg = '찾았어요! 이 줄이 처음 틀린 줄이에요. 바르게 고치면 무엇일까요?';
    ds.msgOk = true;
    try { sfx.ding(); } catch { /* 소리는 없어도 */ }
  } else {
    ds.taps[i] = 1;
    ds.msg = lineWhy(it, i);
    ds.msgOk = false;
  }
  render(ctx, true);
}

function pickFix(ctx, o) {
  const ds = S.ds;
  if (!ds || ds.phase !== 'fix' || ds.tried.includes(o)) return;
  const { it } = ds.items[ds.i];
  const ok = o === 0;
  if (ds.firstFix === null) { ds.firstFix = ok; enqueue(ctx, { id: it.id, cell: it.cell, step: 'fix', ok }); }
  if (!ok) {
    ds.tried.push(o);
    ds.msg = it.no[o];
    ds.msgOk = false;
    try { sfx.wrong(); } catch { /* 소리는 없어도 */ }
  } else {
    ds.phase = 'done';
    ds.msg = '바르게 고쳤어요! 뒤의 줄도 빨간 펜으로 따라 고쳤어요.';
    ds.msgOk = true;
    ds.results[ds.i] = { line: ds.firstLine === true, fix: ds.firstFix === true };
    enqueue(ctx, { id: it.id, cell: it.cell, step: 'solve', ok: true }); // 고친 숙제 — 틀린 보기를 먼저 골랐어도 센다 (Codex 105차 #6)
    try { sfx.ding(); } catch { /* 소리는 없어도 */ }
  }
  render(ctx, true);
}

// ── 저장 — 처음 답은 누른 날을 붙여 줄(Q)에 · 줄은 저장에 성공한 답만 뺀다
function enqueue(ctx, ans) {
  const ds = S.ds;
  Q.push({ ...ans, d: todayKey() }).then((ok) => {
    if (S.ds !== ds) return; // 그 사이 나갔다 — 못 적은 답은 줄에 남는다
    ds.saveErr = !ok;
    render(ctx, true);
  });
}
function retry(ctx) {
  const ds = S.ds;
  ds.saveErr = false;
  render(ctx, true);
  Q.flush().then((ok) => {
    if (S.ds !== ds) return;
    ds.saveErr = !ok;
    render(ctx, true);
  });
}

/** 아래 단추 — 다 고쳤으면 [다음 숙제] · 저장 중이면 기다림 · 실패했거나 못 적은 답이 남았으면 [다시 저장하기] */
function saveEl(ctx) {
  const ds = S.ds;
  const box = el('div', 'dtv-actions');
  if (ds.saveErr || (Q.size && !Q.busy && ds.phase === 'done')) {
    box.appendChild(el('p', 'math-note', '기록이 안 됐어요 — [다시 저장하기]를 눌러 주세요'));
    const again = el('button', 'btn btn-primary btn-big-wide dtv-retry', '💾 다시 저장하기');
    again.type = 'button';
    again.addEventListener('click', () => retry(ctx));
    box.appendChild(again);
    return box;
  }
  if (ds.phase !== 'done') return box;
  if (Q.busy || Q.size) { box.appendChild(el('p', 'math-note', '기록하는 중…')); return box; }
  const next = el('button', 'btn btn-primary btn-big-wide dtv-next', ds.i + 1 < ds.items.length ? '다음 숙제 →' : '끝내기');
  next.type = 'button';
  next.addEventListener('click', () => nextItem(ctx));
  box.appendChild(next);
  return box;
}

function nextItem(ctx) {
  const ds = S.ds;
  if (!ds || ds.phase !== 'done' || Q.busy || ds.saveErr || Q.size) return;
  ds.i += 1;
  Object.assign(ds, { phase: 'find', taps: {}, tried: [], firstLine: null, firstFix: null, msg: '', msgOk: false });
  if (ds.i >= ds.items.length) { finish(ctx); return; }
  render(ctx);
}

/** 판 끝 — 수학 기록(보상 받은 날·판 수)과 💰·🔷를 한 트랜잭션 · 🎯는 잡기 예약 */
async function finish(ctx) {
  const ds = S.ds;
  if (!ds || ds.finishing || ds.done) return;
  ds.finishing = true;
  ds.finishErr = false;
  render(ctx);
  const today = todayKey();
  const ids = ds.items.map((x) => x.it.id);
  // 이번 판 셋을 모두 한 번에 고쳤나 (Codex 105차 #1 — 그날 처음 답만으로는 앞 판에서 맞히고 그만둔 문제를 이번에 틀려도 🔷가 나갔다)
  const perfect = ds.results.length === ds.items.length && ds.results.every((r) => r && r.line && r.fix);
  const batch = Q.snapshot(); // 못 적은 처음 답 — 같은 트랜잭션에서 먼저 적고 🔷를 판정한다 (Codex 105차 #2)
  let saved;
  try {
    saved = await commitChalRound((s) => {
      for (const a of batch) answerRule(s, a, today);
      const r = finishRule(s, today, ids, perfect);
      if (r.throws) addPending(s, r.throws);
      return { result: r, reward: { xp: 0, coin: r.coin, items: {}, stone: r.stone, throws: r.throws } };
    });
  } catch { saved = { ok: false }; }
  if (saved && saved.ok) Q.drop(batch);
  if (S.ds !== ds) return;
  ds.finishing = false;
  if (!saved || !saved.ok) { ds.finishErr = true; render(ctx); return; }
  ctx.setState(saved.math);
  ctx.updateChip();
  ds.done = saved.result;
  if (ds.done.stone) { try { sfx.success(); } catch { /* 소리는 없어도 */ } }
  render(ctx);
}

function finishEl(ctx) {
  const ds = S.ds;
  const box = el('div', 'dtv-done');
  if (ds.finishing) { box.appendChild(el('p', 'dtv-done-title', '저장하는 중…')); return box; }
  if (ds.finishErr || !ds.done) {
    box.appendChild(el('p', 'dtv-done-title', '저장이 안 됐어요'));
    box.appendChild(el('p', 'math-note', '[다시 저장하기]를 눌러 주세요 — 고친 숙제는 그대로예요'));
    const again = el('button', 'btn btn-primary btn-big-wide dtv-retry', '💾 다시 저장하기');
    again.type = 'button';
    again.addEventListener('click', () => finish(ctx));
    box.appendChild(again);
    return box;
  }
  const d = ds.done;
  const okN = ds.results.filter((r) => r && r.line && r.fix).length;
  box.appendChild(meowthEl());
  box.appendChild(el('p', 'dtv-done-title', d.first ? '🕵️ 나옹의 숙제를 다 봐 줬어요!' : '🕵️ 나옹의 숙제 한 판 더 끝!'));
  box.appendChild(el('p', 'dtv-done-line', `😼 "고마워다옹! 다음엔 안 틀린다옹!" · 한 번에 고친 숙제 ${okN} / ${ds.items.length}`));
  if (d.first) box.appendChild(el('p', 'dtv-done-line', `💰 +${d.coin} · 🎯 포켓몬 잡기 ${d.throws}번${d.stone ? ` · 🔷 수학스톤 +${d.stone} (오늘 셋 다 한 번에 고쳤어요!)` : ''}`));
  else box.appendChild(el('p', 'dtv-done-line', '오늘 숙제 보상은 이미 받았어요 — 더 봐 줘도 돼요'));
  if (d.throws) box.appendChild(el('p', 'math-note', '🎯 잡기는 수학 화면 위 🎯 단추에서 던져요'));
  const row = el('div', 'dtv-tools');
  const back = el('button', 'btn btn-primary dtv-back', '🔢 수학으로');
  back.type = 'button';
  back.addEventListener('click', () => quit(ctx));
  row.appendChild(back);
  const more = el('button', 'btn dtv-more', '🕵️ 한 판 더');
  more.type = 'button';
  more.addEventListener('click', () => guardStart('math', () => startDetect(ctx)));
  row.appendChild(more);
  box.appendChild(row);
  return box;
}
