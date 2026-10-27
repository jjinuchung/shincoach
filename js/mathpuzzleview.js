// 🧩 수학 퍼즐 화면 (v296, 2026-10-19 아버님 "모두 니 제안대로 해") — ⬛ 마방진 · 🔺 수 피라미드 · 🃏 숫자 카드
// 규칙은 mathpuzzle.js(순수). 저장: 답을 낼 때마다 db.updateMath(answerRule — 그날의 처음 답·단계) · 한 판을 끝내면 xp.commitChalRound(finishRule —
// 수학 기록과 💰·🔷를 한 트랜잭션 · 🎯는 수학 기록의 잡기 예약 addPending)
// math.js가 ctx로 화면 비우기·사다리로 돌아가기·수학 기록을 건넨다(이 파일은 math.js를 import하지 않는다 — korpuzzleview와 같은 꼴)
//  · 퍼즐마다 확인은 한 번(처음 낸 답만 센다) · 빈칸을 누르고 숫자판으로 넣는다 · 🃏는 카드를 차례로 누른다
//  · 그만하기는 언제든 — 낸 답은 이미 저장됐다(그날의 처음 답이라 다시 열어도 🔷를 다시 뽑을 수 없다)
import { KINDS, KIND_LIST, makePuzzle, answersOf, digitsOf, gradePuzzle, puzzleWhy, cardsAsk, answerRule, finishRule, puzzleOf, puzzleTodayLine } from './mathpuzzle.js';
import { updateMath } from './db.js';
import { commitChalRound } from './xp.js';
import { addPending } from './mathprog.js';
import { todayKey } from './track.js';
import { guardStart } from './timeup.js';
import { sfx, unlock as sfxUnlock } from './sfx.js';

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

// ps: 지금 푸는 판 { items: [{ kind, from, seed, p }], i, input: [글자], sel, picked: [카드 번호], grade, saving, saveErr, results, finishing, finishErr, done }
const S = { ps: null };

/** 지금 퍼즐 판을 푸는 중인가 (math.js가 🎒·📊에서 돌아올 때 본다) */
export function puzzleActive() {
  return !!S.ps;
}
/** 판을 버린다 (사다리로 나갈 때) */
export function endPuzzle() {
  S.ps = null;
}

/** 사다리 머리의 🧩 단추 + 오늘 보상 줄 + 꼴마다 단계 */
export function puzzleButton(ctx) {
  const box = el('div', 'mpz-slot');
  const st = puzzleOf((ctx.getState() || {}).puzzle);
  const got = st.day[todayKey()] || 0;
  const b = el('button', `btn btn-big-wide mpz-btn${got ? ' is-done' : ''}`, got ? '🧩 수학 퍼즐 한 판 더' : '🧩 오늘의 수학 퍼즐');
  b.type = 'button';
  b.addEventListener('click', () => guardStart('math', () => startPuzzle(ctx)));
  box.appendChild(b);
  box.appendChild(el('p', 'math-note mpz-note', `${KIND_LIST.map((k) => `${KINDS[k].icon} ${KINDS[k].ko} ${st.lv[k]}단계`).join(' · ')} — ${puzzleTodayLine(got)}`));
  return box;
}

/** 새 판 — 꼴마다 지금 단계의 새 문제 하나 (씨앗은 판을 열 때 정해 🎒를 다녀와도 같은 문제) */
export function startPuzzle(ctx) {
  sfxUnlock();
  const st = puzzleOf((ctx.getState() || {}).puzzle);
  const base = Date.now() % 2147483647;
  const items = KIND_LIST.map((kind, k) => {
    const seed = (base + k * 7919) % 2147483647 || 1;
    return { kind, from: st.lv[kind], seed, p: makePuzzle(kind, st.lv[kind], seed) };
  }).filter((x) => x.p);
  if (!items.length) { ctx.back(); return; }
  S.ps = { items, i: 0, input: [], sel: 0, picked: [], grade: null, saving: false, saveErr: false, results: [], finishing: false, finishErr: false, done: null };
  render(ctx);
}
/** 🎒·📊에서 돌아왔다 — 하던 자리 그대로 */
export function resumePuzzle(ctx) {
  if (!S.ps) { ctx.back(); return; }
  render(ctx);
}

function quit(ctx) {
  S.ps = null;
  ctx.back();
}

/** 다시 그리기 — keep이면 읽던 자리 그대로(숫자·빈칸·카드를 누를 때 — clearMain이 맨 위로 올리면 숫자판까지 다시 내려가야 했다, Codex 102차) */
function render(ctx, keep = false) {
  const ps = S.ps;
  if (!ps) { ctx.back(); return; }
  const y = keep ? window.scrollY : 0;
  const m = ctx.clearMain();
  const card = el('section', 'math-card mpz-card');
  const top = el('div', 'mpz-top');
  if (!ps.done && !ps.finishing) {
    const q = el('button', 'btn btn-small mpz-quit', '← 그만하기');
    q.type = 'button';
    q.addEventListener('click', () => quit(ctx));
    top.appendChild(q);
  }
  card.appendChild(top);
  if (ps.i >= ps.items.length) { card.appendChild(finishEl(ctx)); m.appendChild(card); return; }
  const it = ps.items[ps.i];
  const p = it.p;
  const eye = el('div', 'math-eyebrow');
  eye.textContent = `🧩 수학 퍼즐 · ${ps.i + 1} / ${ps.items.length} · ${KINDS[it.kind].icon} ${KINDS[it.kind].ko} · ${it.from}단계`;
  card.appendChild(eye);
  card.appendChild(el('p', 'math-qtext mpz-ask', p.kind === 'cards' ? cardsAsk(p) : KINDS[p.kind].ask));
  if (p.kind === 'cards') card.appendChild(cardsEl(ctx, p));
  else {
    card.appendChild(boardEl(ctx, p));
    if (!ps.grade) card.appendChild(padEl(ctx, p));
  }
  const live = el('p', 'mpz-fb');
  live.setAttribute('aria-live', 'polite');
  if (!ps.grade) {
    const tools = el('div', 'mpz-tools');
    const clr = el('button', 'btn', p.kind === 'cards' ? '다시' : '지우기');
    clr.type = 'button';
    clr.addEventListener('click', () => { if (ps.grade) return; ps.input = []; ps.picked = []; ps.sel = 0; render(ctx, true); });
    tools.appendChild(clr);
    const ok = el('button', 'btn btn-primary mpz-check', '확인');
    ok.type = 'button';
    ok.disabled = !gradePuzzle(p, inputOf(ps, p)).valid;
    ok.addEventListener('click', () => submit(ctx));
    tools.appendChild(ok);
    card.appendChild(tools);
    if (ok.disabled) card.appendChild(el('p', 'math-note mpz-hint', p.kind === 'cards' ? '카드를 모두 놓으면 확인할 수 있어요' : '빈칸을 모두 채우면 확인할 수 있어요'));
    card.appendChild(live);
  } else {
    const g = ps.grade;
    live.className = `mpz-fb ${g.ok ? 'is-ok' : 'is-no'}`;
    live.textContent = g.ok ? '맞아요!' : p.kind === 'cards' ? '아쉬워요 — 바른 수를 보세요' : `아쉬워요 — ${g.right} / ${g.n}칸을 맞혔어요. 바른 수를 보세요`;
    card.appendChild(live);
    card.appendChild(el('p', 'mpz-why', puzzleWhy(p)));
    const res = ps.results[ps.i];
    if (res && res.up) card.appendChild(el('p', 'mpz-up', `⬆️ ${KINDS[it.kind].icon} ${KINDS[it.kind].ko} ${res.lv}단계로!`));
    if (ps.saving) card.appendChild(el('p', 'math-note', '기록하는 중…'));
    else if (ps.saveErr) {
      const again = el('button', 'btn btn-primary btn-big-wide mpz-retry', '💾 다시 저장하기');
      again.type = 'button';
      again.addEventListener('click', () => save(ctx));
      card.appendChild(again);
    } else {
      const next = el('button', 'btn btn-primary btn-big-wide mpz-next', ps.i + 1 < ps.items.length ? '다음 퍼즐 →' : '끝내기');
      next.type = 'button';
      next.addEventListener('click', () => nextItem(ctx));
      card.appendChild(next);
    }
  }
  m.appendChild(card);
  if (keep && y) window.scrollTo(0, y);
  // 초점 — 확인 뒤에는 [다음 퍼즐](저장이 안 됐으면 [다시 저장하기]) · 그 전에는 고른 빈칸 → 남은 카드 → [확인] (querySelector는 글 차례로 골라 따로 찾는다, Codex 102차)
  const focus = ps.grade ? (card.querySelector('.mpz-next') || card.querySelector('.mpz-retry'))
    : (card.querySelector('.mpz-cell.is-sel') || card.querySelector('.mpz-card-btn:not(:disabled)') || card.querySelector('.mpz-check:not(:disabled)'));
  if (focus && focus.focus) { try { focus.focus({ preventScroll: true }); } catch { /* 초점은 없어도 */ } }
}

/** 낸 답 꼴 — 마방진·피라미드는 빈칸마다 수, 🃏는 놓은 카드 번호 */
function inputOf(ps, p) {
  if (p.kind === 'cards') return ps.picked.slice();
  return answersOf(p).map((_, k) => (ps.input[k] ? Number(ps.input[k]) : NaN));
}

/** ⬛·🔺 판 — 주어진 수는 글자, 빈칸은 단추(누르면 고른 칸) · 확인 뒤에는 바른 수(틀린 칸은 넣은 수를 지우고) */
function boardEl(ctx, p) {
  const ps = S.ps;
  const g = ps.grade;
  const board = el('div', `mpz-board is-${p.kind}`);
  const rows = p.kind === 'magic' ? p.cells : p.rows;
  const blankAt = new Map(p.blank.map(([r, c], k) => [`${r},${c}`, k]));
  const ans = answersOf(p);
  rows.forEach((row, r) => {
    const line = el('div', 'mpz-row');
    row.forEach((v, c) => {
      const k = blankAt.get(`${r},${c}`);
      if (k === undefined) { line.appendChild(el('span', 'mpz-cell', String(v))); return; }
      const b = el('button', `mpz-cell is-blank${!g && ps.sel === k ? ' is-sel' : ''}`);
      b.type = 'button';
      b.dataset.k = String(k);
      if (!g) {
        b.textContent = ps.input[k] || '?';
        b.setAttribute('aria-label', `빈칸 ${k + 1}${ps.input[k] ? ` — 지금 ${ps.input[k]}` : ''}`);
        b.addEventListener('click', () => { if (ps.grade) return; ps.sel = k; render(ctx, true); });
      } else {
        const ok = g.marks[k];
        b.disabled = true;
        b.classList.add(ok ? 'is-ok' : 'is-no');
        if (!ok) b.appendChild(el('s', 'mpz-old', ps.input[k] || ''));
        b.appendChild(el('span', 'mpz-val', String(ans[k])));
        b.setAttribute('aria-label', `빈칸 ${k + 1} — ${ok ? '맞음' : `넣은 수 ${ps.input[k]}, 바른 수 ${ans[k]}`}`);
      }
      line.appendChild(b);
    });
    board.appendChild(line);
  });
  return board;
}

/** 숫자판 — 고른 빈칸에 넣는다 · 한 자리 수 퍼즐은 넣으면 다음 빈칸으로 */
function padEl(ctx, p) {
  const ps = S.ps;
  const pad = el('div', 'mpz-pad');
  const max = digitsOf(p);
  const n = p.blank.length;
  for (const key of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '⌫']) {
    const b = el('button', `mpz-key${key === '⌫' ? ' is-back' : ''}`, key);
    b.type = 'button';
    b.setAttribute('aria-label', key === '⌫' ? '한 글자 지우기' : `${key} 넣기`);
    b.addEventListener('click', () => {
      if (ps.grade) return;
      const cur = ps.input[ps.sel] || '';
      if (key === '⌫') ps.input[ps.sel] = cur.slice(0, -1);
      else if (cur.length < max && !(cur === '0')) {
        ps.input[ps.sel] = cur + key;
        if (max === 1 && ps.sel + 1 < n) ps.sel += 1;
      }
      render(ctx, true);
    });
    pad.appendChild(b);
  }
  return pad;
}

/** 🃏 카드 — 누르면 다음 칸에 놓인다 · 확인 뒤에는 만든 수와 바른 수 */
function cardsEl(ctx, p) {
  const ps = S.ps;
  const g = ps.grade;
  const box = el('div', 'mpz-cards-wrap');
  const cards = el('div', 'mpz-cards');
  p.digits.forEach((d, i) => {
    const b = el('button', 'mpz-card-btn', String(d));
    b.type = 'button';
    b.disabled = !!g || ps.picked.includes(i);
    b.setAttribute('aria-label', `카드 ${d}${ps.picked.includes(i) ? ' — 놓았어요' : ''}`);
    b.addEventListener('click', () => { if (ps.grade || ps.picked.includes(i) || ps.picked.length >= p.digits.length) return; ps.picked.push(i); render(ctx, true); });
    cards.appendChild(b);
  });
  box.appendChild(cards);
  const slots = el('div', `mpz-slots${g ? (g.ok ? ' is-ok' : ' is-no') : ''}`);
  for (let k = 0; k < p.digits.length; k++) slots.appendChild(el('span', 'mpz-slot-d', ps.picked[k] === undefined ? '' : String(p.digits[ps.picked[k]])));
  box.appendChild(slots);
  if (g && !g.ok) box.appendChild(el('p', 'mpz-right', `바른 수: ${p.answer}`));
  return box;
}

/** 확인 — 처음 낸 답만(다시 내기 없음) · 바로 저장(그날의 처음 답·단계) */
async function submit(ctx) {
  const ps = S.ps;
  if (!ps || ps.grade) return;
  const it = ps.items[ps.i];
  const g = gradePuzzle(it.p, inputOf(ps, it.p));
  if (!g.valid) return;
  ps.grade = g;
  try { if (g.ok) sfx.ding(); else sfx.wrong(); } catch { /* 소리는 없어도 */ }
  await save(ctx);
}
async function save(ctx) {
  const ps = S.ps;
  if (!ps || !ps.grade) return;
  const it = ps.items[ps.i];
  ps.saving = true;
  ps.saveErr = false;
  render(ctx, true);
  let res = null;
  try {
    const m = await updateMath((mm) => { res = answerRule(mm, it.kind, ps.grade.ok, it.from, todayKey()); });
    if (S.ps !== ps) return; // 그 사이 나갔다 — 저장은 남았다
    ctx.setState(m);
    ps.results[ps.i] = { ok: ps.grade.ok, up: !!(res && res.up), lv: res ? res.lv : it.from };
    ps.saving = false;
  } catch {
    if (S.ps !== ps) return;
    ps.saving = false;
    ps.saveErr = true;
  }
  render(ctx, true);
}

function nextItem(ctx) {
  const ps = S.ps;
  if (!ps || !ps.grade || ps.saving || ps.saveErr) return;
  ps.i += 1;
  ps.input = [];
  ps.picked = [];
  ps.sel = 0;
  ps.grade = null;
  if (ps.i >= ps.items.length) { finish(ctx); return; }
  render(ctx);
}

/** 판 끝 — 수학 기록(보상 받은 날·판 수)과 💰·🔷를 한 트랜잭션 · 🎯는 잡기 예약 */
async function finish(ctx) {
  const ps = S.ps;
  if (!ps || ps.finishing || ps.done) return;
  ps.finishing = true;
  ps.finishErr = false;
  render(ctx);
  const today = todayKey();
  let saved;
  try {
    saved = await commitChalRound((s) => {
      const r = finishRule(s, today);
      if (r.throws) addPending(s, r.throws);
      return { result: r, reward: { xp: 0, coin: r.coin, items: {}, stone: r.stone, throws: r.throws } };
    });
  } catch { saved = { ok: false }; }
  if (S.ps !== ps) return;
  ps.finishing = false;
  if (!saved || !saved.ok) { ps.finishErr = true; render(ctx); return; }
  ctx.setState(saved.math);
  ctx.updateChip();
  ps.done = saved.result;
  if (ps.done.stone) { try { sfx.success(); } catch { /* 소리는 없어도 */ } }
  render(ctx);
}

function finishEl(ctx) {
  const ps = S.ps;
  const box = el('div', 'mpz-done');
  if (ps.finishing) { box.appendChild(el('p', 'mpz-done-title', '저장하는 중…')); return box; }
  if (ps.finishErr || !ps.done) {
    box.appendChild(el('p', 'mpz-done-title', '저장이 안 됐어요'));
    box.appendChild(el('p', 'math-note', '[다시 저장하기]를 눌러 주세요 — 푼 것은 그대로예요'));
    const again = el('button', 'btn btn-primary btn-big-wide', '💾 다시 저장하기');
    again.type = 'button';
    again.addEventListener('click', () => finish(ctx));
    box.appendChild(again);
    return box;
  }
  const d = ps.done;
  const okN = ps.results.filter((r) => r && r.ok).length;
  box.appendChild(el('p', 'mpz-done-icon', '🧩'));
  box.appendChild(el('p', 'mpz-done-title', d.first ? '🧩 오늘의 수학 퍼즐 끝!' : '🧩 수학 퍼즐 한 판 더 끝!'));
  box.appendChild(el('p', 'mpz-done-line', `한 번에 맞힌 퍼즐 ${okN} / ${ps.items.length}`));
  if (d.first) box.appendChild(el('p', 'mpz-done-line', `💰 +${d.coin} · 🎯 포켓몬 잡기 ${d.throws}번${d.stone ? ` · 🔷 수학스톤 +${d.stone} (오늘 셋 다 한 번에 맞혔어요!)` : ''}`));
  else box.appendChild(el('p', 'mpz-done-line', '오늘 퍼즐 보상은 이미 받았어요 — 맞히면 단계는 올라가요'));
  for (const [k, r] of ps.results.entries()) if (r && r.up) box.appendChild(el('p', 'mpz-done-line mpz-up', `⬆️ ${KINDS[ps.items[k].kind].icon} ${KINDS[ps.items[k].kind].ko} ${r.lv}단계로!`));
  if (d.throws) box.appendChild(el('p', 'math-note', '🎯 잡기는 수학 화면 위 🎯 단추에서 던져요'));
  const row = el('div', 'mpz-tools');
  const back = el('button', 'btn btn-primary mpz-back', '🔢 수학으로');
  back.type = 'button';
  back.addEventListener('click', () => quit(ctx));
  row.appendChild(back);
  const more = el('button', 'btn mpz-more', '🧩 한 판 더');
  more.type = 'button';
  more.addEventListener('click', () => guardStart('math', () => startPuzzle(ctx)));
  row.appendChild(more);
  box.appendChild(row);
  // ☀️ 오늘의 수학으로 잇기 (v331) — 오늘 ☀️를 아직 끝내지 않았으면 단추 하나(math.js가 정함) · 누르면 이 판을 닫고 ☀️로
  const sun = ctx.sunEl ? ctx.sunEl('puzzle', () => { S.ps = null; }) : null;
  if (sun) box.appendChild(sun);
  if (ctx.addCell) ctx.addCell(box); // 🟢 숨은 지가르데 셀 (v352)
  return box;
}
