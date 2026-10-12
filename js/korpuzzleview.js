// 🧩 국어 화면의 퍼즐 탭 — 🧩 차례 맞추기 · ⚖️ 사실·의견 가르기 (v242, 2026-10-12 아버님 "이대로 진행")
// 규칙은 korpuzzle.js(순수), 저장은 xp.korPuzzleFinish(한 트랜잭션 — 퍼즐 칸과 💰·🎯·🟩가 같이).
// koreanview가 🎯 잡기 단추·🥚 알 칸·탭 이동을 ctx로 건넨다(kortabs와 같은 꼴 — 서로 import하지 않게)
//  · 판정은 퍼즐마다 **처음 낸 것** — 조각은 마음대로 놓았다 뺐다 하고 "확인"을 누를 때 한 번 채점(Codex 54차 PART 3 #6)
//  · 판 중간에 나가면(🎒·📊) 그대로 이어서, "← 그만하기"는 한 것(낸 퍼즐·놓은 조각·고른 칸)이 있으면 두 번 눌러야 저장 없이 끝
import { ASKS, FO, KINDS, allPuzzles, planPuzzles, puzzleStats, shuffledOrder, gradeOrder, gradeSort, isOpen, isSolved, puzzleFinishText, puzzleTodayLine } from './korpuzzle.js';
import { wordsToday } from './korwords.js';
import { korPuzzleFinish, korPuzzleMap, korPuzzleDayMap, korDoneMap } from './xp.js';
import { circled } from './korean.js';
import { guardStart } from './timeup.js';
import { sfx, unlock as sfxUnlock } from './sfx.js';

export const PUZZLES_URL = './coach/korean/puzzles.json';

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

// data: 받은 원고 · list: 쓸 수 있는 퍼즐(카드가 바뀌면 다시) · ps: 지금 푸는 판 · live: 읽어 주기 알림 한 칸(다시 그려도 같은 칸)
const S = { data: null, list: null, listFor: null, loadErr: '', ps: null, live: null };

async function loadData(ctx) {
  try {
    if (!S.data) {
      const res = await fetch(PUZZLES_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      S.data = await res.json();
    }
    S.loadErr = '';
  } catch (e) {
    S.loadErr = String((e && e.message) || e);
  }
  const cards = ctx.cards();
  if (S.data && (S.listFor !== cards || !S.list)) { S.list = allPuzzles(S.data, cards); S.listFor = cards; }
  return !!S.data;
}

/** 지금 🧩 퍼즐 판을 푸는 중인가 (koreanview가 다시 그릴 때 본다) */
export function inSession() {
  return !!S.ps;
}

const byId = (id) => (S.list || []).find((p) => p.id === id) || null;
const nameOf = (p) => (p ? (p.kind === 'order' ? `${ASKS[p.ask].ko} 「${p.title}」` : `${p.icon} ${p.title}`) : '');

// ───────────────────── 🧩 퍼즐 탭 ─────────────────────

export async function renderPuzzleTab(box, ctx) {
  if (!(await loadData(ctx))) {
    const e = el('div', 'kor-empty');
    e.appendChild(el('p', '', '퍼즐을 불러오지 못했어요 — 인터넷을 확인하고 다시 열어 주세요'));
    if (S.loadErr) e.appendChild(el('p', 'kor-small', S.loadErr));
    const again = el('button', 'btn btn-primary', '다시 불러오기');
    again.type = 'button';
    again.addEventListener('click', () => { S.data = null; ctx.rerender(); });
    e.appendChild(again);
    box.appendChild(e);
    return;
  }
  const list = S.list;
  const states = korPuzzleMap();
  const done = korDoneMap();
  const now = Date.now();
  const plan = planPuzzles(list, states, done, now);
  const head = el('section', 'kor-head');
  head.appendChild(el('h2', 'kor-h', '🧩 오늘의 퍼즐'));
  head.appendChild(el('p', 'kor-intro', '이야기의 흐름과 하는 차례를 맞추고, 사실과 의견을 가려요. 다 맞힌 퍼즐은 ⭐, 틀린 퍼즐은 다음 날 다시 나와요.'));
  head.appendChild(el('p', 'kor-count', puzzleTodayLine(wordsToday(korPuzzleDayMap(), now))));
  if (plan.length) {
    const o = plan.filter((p) => p.kind === 'order').length;
    const s = plan.length - o;
    const b = el('button', 'btn btn-primary btn-big-wide kor-pstart', `🧩 오늘의 퍼즐 시작 (${[o ? `차례 ${o}` : '', s ? `사실·의견 ${s}` : ''].filter(Boolean).join(' · ')})`);
    b.type = 'button';
    b.addEventListener('click', () => guardStart('korean', () => startSession(ctx, false)));
    head.appendChild(b);
  } else {
    head.appendChild(el('p', 'kor-intro', '지금 풀 수 있는 퍼즐을 다 했어요 — 틀린 퍼즐은 내일 다시 나와요'));
    const more = planPuzzles(list, states, done, now, true);
    if (more.length) {
      const b = el('button', 'btn kor-pstart', `🔁 다 푼 퍼즐 다시 해 보기 (연습 ${more.length}개)`);
      b.type = 'button';
      b.addEventListener('click', () => guardStart('korean', () => startSession(ctx, true)));
      head.appendChild(b);
    }
  }
  const cb = ctx.catchBtnEl();
  if (cb) head.appendChild(cb);
  box.appendChild(head);
  const decks = el('div', 'kor-decks');
  for (const s of puzzleStats(list, states, done)) {
    const row = el('div', 'kor-deck');
    row.appendChild(el('span', 'kor-deck-name', `${KINDS[s.kind].icon} ${KINDS[s.kind].ko}`));
    row.appendChild(el('span', 'kor-deck-star', `⭐ ${s.solved} / ${s.total}`));
    const sub = [s.tried ? `다시 풀 것 ${s.tried}` : '', s.total > s.open ? `🔒 ${s.total - s.open}개는 글을 읽으면 열려요` : ''].filter(Boolean).join(' · ');
    if (sub) row.appendChild(el('span', 'kor-deck-sub', sub));
    decks.appendChild(row);
  }
  box.appendChild(decks);
  const det = el('details', 'kor-wlist');
  det.appendChild(el('summary', '', '📋 퍼즐 목록 보기'));
  for (const kind of ['order', 'sort']) {
    det.appendChild(el('p', 'kor-wlist-h', `${KINDS[kind].icon} ${KINDS[kind].ko}`));
    const row = el('div', 'kor-chips');
    for (const p of list.filter((x) => x.kind === kind)) {
      const st = states[p.id];
      const mark = !isOpen(p, done) ? '🔒' : !st ? '○' : isSolved(st) ? '⭐' : '🌱';
      row.appendChild(el('span', `kor-chip${mark === '⭐' ? ' is-star' : ''}${mark === '🔒' ? ' is-lock' : ''}`, `${mark} ${mark === '🔒' ? `「${p.cardTitle || '?'}」 글을 읽으면` : p.title}`));
    }
    det.appendChild(row);
  }
  box.appendChild(det);
}

function startSession(ctx, practice) {
  if (!S.list) return;
  sfxUnlock();
  const states = korPuzzleMap();
  const plan = planPuzzles(S.list, states, korDoneMap(), Date.now(), practice);
  const items = plan.map((x) => byId(x.id)).filter(Boolean).map((p) => ({ id: p.id, kind: p.kind, deal: p.kind === 'order' ? shuffledOrder(p.chunks.length) : null }));
  if (!items.length) { ctx.rerender(); return; }
  // 판을 시작할 때 퍼즐마다 마지막으로 푼 때 — 저장할 때 그 사이 다른 판이 옮겼으면 연습으로 (🔤 낱말과 같다)
  const from = new Map(items.map((x) => [x.id, (states[x.id] && states[x.id].at) || 0]));
  S.ps = { items, i: 0, first: new Map(), from, placed: [], labels: [], grade: null, saving: false, result: null, egg: null, quitAsk: false, focus: 'start' };
  renderSession(ctx);
  window.scrollTo(0, 0);
}

/** 실마리 말을 굵게 — 글 안에 한 번 */
function clueEl(tag, cls, text, clue) {
  const e = el(tag, cls);
  const k = clue ? text.indexOf(clue) : -1;
  if (k < 0) { e.textContent = text; return e; }
  e.appendChild(document.createTextNode(text.slice(0, k)));
  e.appendChild(el('b', 'kor-pclue', clue));
  e.appendChild(document.createTextNode(text.slice(k + clue.length)));
  return e;
}

export function renderSession(ctx) {
  const main = ctx.main();
  const ps = S.ps;
  if (!main || !ps) return;
  main.textContent = '';
  const wrap = el('section', 'kor-wsess kor-psess');
  const top = el('div', 'kor-wtop');
  const n = ps.items.length;
  if (ps.i < n && !ps.saving) {
    const quit = el('button', 'btn btn-small kor-wquit', ps.quitAsk ? '정말 그만할까요? (푼 것은 저장 안 돼요)' : '← 그만하기');
    quit.type = 'button';
    quit.addEventListener('click', () => {
      if (!didWork(ps) || ps.quitAsk) { S.ps = null; ctx.toPuzzle(); return; }
      ps.quitAsk = true;
      ps.focus = 'quit';
      renderSession(ctx);
    });
    top.appendChild(quit);
  }
  top.appendChild(el('span', 'kor-q-no', `퍼즐 ${Math.min(ps.i + 1, n)} / ${n}`));
  wrap.appendChild(top);
  if (!S.live) { S.live = el('p', 'kor-live'); S.live.setAttribute('aria-live', 'polite'); }
  const live = S.live;
  if (ps.i >= n) {
    const done = finishEl(ctx);
    wrap.appendChild(done);
    wrap.appendChild(live);
    main.appendChild(wrap);
    const t = done.querySelector('.kor-done-title');
    live.textContent = (t || {}).textContent || '';
    if (t && ps.focus && ps.result) {
      t.setAttribute('tabindex', '-1');
      try { t.focus({ preventScroll: true }); } catch { /* 초점은 없어도 */ }
      ps.focus = '';
    }
    return;
  }
  const it = ps.items[ps.i];
  const p = byId(it.id);
  const card = p && p.kind === 'order' ? orderEl(ctx, p, it) : sortEl(ctx, p);
  wrap.appendChild(card);
  wrap.appendChild(live);
  main.appendChild(wrap);
  const fb = card.querySelector('.kor-fb');
  live.textContent = fb ? fb.textContent : '';
  const focusTo = ps.focus;
  ps.focus = '';
  // 다시 그리면 누른 단추가 사라지므로 초점을 같은 자리로 — 새 퍼즐(start·pool)은 첫 조각이나 첫 문장의 [사실]로 (Codex 55차)
  const fo = /^fo:(\d+):(fact|opinion)$/.exec(focusTo);
  const t = focusTo === 'next' ? card.querySelector('.kor-next')
    : focusTo === 'quit' ? wrap.querySelector('.kor-wquit')
      : focusTo === 'start' || focusTo === 'pool' ? card.querySelector('.kor-pchunk:not(:disabled), .kor-pfo:not(:disabled), .kor-pcheck:not(:disabled)')
        : focusTo === 'check' ? card.querySelector('.kor-pcheck')
          : fo ? (card.querySelectorAll('.kor-psort')[Number(fo[1])] || card).querySelector(`.kor-pfo.is-${fo[2]}`) : null;
  if (t) { try { t.focus({ preventScroll: true }); } catch { /* 초점은 없어도 */ } }
}

/** 이 판에서 한 것이 있나 — 낸 퍼즐 · 놓은 조각 · 고른 칸 (있으면 "그만하기"를 한 번 더 묻는다, Codex 55차) */
function didWork(ps) {
  return ps.first.size > 0 || ps.placed.length > 0 || ps.labels.some(Boolean);
}

/** 🧩 차례 맞추기 한 장 — 놓은 칸 · 남은 조각 · 하나 빼기·처음부터 · 확인 → 바른 차례와 실마리 */
function orderEl(ctx, p, it) {
  const ps = S.ps;
  const g = ps.grade;
  const box = el('div', 'kor-q kor-pq');
  const head = el('div', 'kor-q-head');
  head.appendChild(el('span', 'kor-q-skill', `${KINDS.order.icon} ${ASKS[p.ask].ko} · ${p.card ? `${p.icon} 「${p.title}」` : p.title}`));
  box.appendChild(head);
  box.appendChild(el('p', 'kor-q-text', ASKS[p.ask].prompt));
  const slots = el('ol', 'kor-pslots');
  p.chunks.forEach((_, k) => {
    const li = el('li', 'kor-pslot');
    const at = ps.placed[k];
    li.appendChild(el('span', 'kor-pslot-no', circled(k + 1)));
    if (at === undefined) li.appendChild(el('span', 'kor-pslot-empty', '여기에 놓아요'));
    else {
      li.appendChild(el('span', 'kor-pslot-t', p.chunks[at]));
      if (g) { li.classList.add(at === k ? 'is-ok' : 'is-no'); li.appendChild(el('span', 'kor-pslot-mark', at === k ? '✓' : '✗')); }
    }
    slots.appendChild(li);
  });
  box.appendChild(slots);
  if (!g) {
    const pool = el('div', 'kor-ppool');
    for (const k of it.deal) {
      if (ps.placed.includes(k)) continue;
      const b = el('button', 'kor-pchunk', p.chunks[k]);
      b.type = 'button';
      b.setAttribute('aria-label', `${ps.placed.length + 1}번째에 놓기: ${p.chunks[k]}`);
      b.addEventListener('click', () => { if (S.ps !== ps || ps.grade) return; ps.placed.push(k); ps.quitAsk = false; ps.focus = ps.placed.length === p.chunks.length ? 'check' : 'pool'; renderSession(ctx); });
      pool.appendChild(b);
    }
    if (pool.childNodes.length) box.appendChild(pool);
    const tools = el('div', 'kor-ptools');
    const undo = el('button', 'btn btn-small', '↩ 하나 빼기');
    undo.type = 'button';
    undo.disabled = !ps.placed.length;
    undo.addEventListener('click', () => { if (ps.grade) return; ps.placed.pop(); ps.quitAsk = false; ps.focus = 'pool'; renderSession(ctx); });
    tools.appendChild(undo);
    const reset = el('button', 'btn btn-small', '처음부터');
    reset.type = 'button';
    reset.disabled = !ps.placed.length;
    reset.addEventListener('click', () => { if (ps.grade) return; ps.placed = []; ps.quitAsk = false; ps.focus = 'pool'; renderSession(ctx); });
    tools.appendChild(reset);
    box.appendChild(tools);
    const check = el('button', 'btn btn-primary kor-pcheck', '확인');
    check.type = 'button';
    check.disabled = ps.placed.length !== p.chunks.length;
    check.addEventListener('click', () => submit(ctx, p, gradeOrder(p, ps.placed)));
    box.appendChild(check);
    box.appendChild(el('p', 'kor-fb'));
    return box;
  }
  const fb = el('p', `kor-fb ${g.ok ? 'is-ok' : 'is-no'}`, g.ok ? '맞아요! 차례가 딱 맞아요' : `아쉬워요 — ${g.right} / ${g.n}칸이 맞았어요. 바른 차례를 보세요`);
  box.appendChild(fb);
  const note = el('div', 'kor-note kor-pnote');
  note.appendChild(el('p', 'kor-pnote-h', '바른 차례와 실마리'));
  const right = el('ol', 'kor-pright');
  p.chunks.forEach((t, k) => {
    const r = p.need.find((x) => x[1] === k && t.includes(x[2])) || p.need.find((x) => x[0] === k && t.includes(x[2]));
    right.appendChild(clueEl('li', '', t, r ? r[2] : ''));
  });
  note.appendChild(right);
  const why = el('ul', 'kor-pwhy');
  for (const r of p.need) why.appendChild(el('li', '', `${circled(r[0] + 1)} → ${circled(r[1] + 1)} '${r[2]}' — ${r[3]}`));
  note.appendChild(why);
  box.appendChild(note);
  box.appendChild(nextBtn(ctx));
  return box;
}

/** ⚖️ 사실·의견 가르기 한 장 — 문장마다 [사실] [의견] · 확인 → 문장마다 까닭 */
function sortEl(ctx, p) {
  const ps = S.ps;
  const g = ps.grade;
  const box = el('div', 'kor-q kor-pq');
  const head = el('div', 'kor-q-head');
  head.appendChild(el('span', 'kor-q-skill', `${KINDS.sort.icon} ${KINDS.sort.ko} · ${p.icon} ${p.title}`));
  box.appendChild(head);
  box.appendChild(el('p', 'kor-q-text', '문장마다 사실인지 의견인지 골라 보세요.'));
  box.appendChild(el('p', 'kor-tnote', '사실 = 확인할 수 있는 일 · 의견 = 사람마다 다를 수 있는 생각'));
  const rows = el('ul', 'kor-psorts');
  p.sents.forEach((s, k) => {
    const li = el('li', 'kor-psort');
    li.appendChild(el('p', 'kor-psort-t', `${circled(k + 1)} ${s.t}`));
    const btns = el('div', 'kor-psort-btns');
    btns.setAttribute('role', 'group');
    btns.setAttribute('aria-label', `${k + 1}번 문장`);
    for (const fo of ['fact', 'opinion']) {
      const on = ps.labels[k] === fo;
      const b = el('button', `kor-pfo is-${fo}${on ? ' is-on' : ''}`, `${on ? '✔ ' : ''}${FO[fo]}`);
      b.type = 'button';
      b.setAttribute('aria-pressed', String(on));
      b.disabled = !!g;
      b.addEventListener('click', () => { if (S.ps !== ps || ps.grade) return; ps.labels[k] = fo; ps.quitAsk = false; ps.focus = `fo:${k}:${fo}`; renderSession(ctx); });
      btns.appendChild(b);
    }
    li.appendChild(btns);
    if (g) {
      const ok = ps.labels[k] === s.fo;
      li.classList.add(ok ? 'is-ok' : 'is-no');
      li.appendChild(el('p', 'kor-psort-why', `${ok ? '✓' : '✗'} ${FO[s.fo]} — ${s.why}`));
    }
    rows.appendChild(li);
  });
  box.appendChild(rows);
  if (!g) {
    const check = el('button', 'btn btn-primary kor-pcheck', '확인');
    check.type = 'button';
    const filled = p.sents.every((_, k) => ps.labels[k]);
    check.disabled = !filled;
    check.addEventListener('click', () => submit(ctx, p, gradeSort(p, p.sents.map((_, k) => ps.labels[k]))));
    box.appendChild(check);
    box.appendChild(el('p', 'kor-fb'));
    return box;
  }
  box.appendChild(el('p', `kor-fb ${g.ok ? 'is-ok' : 'is-no'}`, g.ok ? '맞아요! 모두 바르게 가렸어요' : `아쉬워요 — ${g.right} / ${g.n}문장을 맞혔어요. 까닭을 읽어 보세요`));
  box.appendChild(nextBtn(ctx));
  return box;
}

function nextBtn(ctx) {
  const ps = S.ps;
  const b = el('button', 'btn btn-primary kor-next', ps.i + 1 < ps.items.length ? '다음 퍼즐 →' : '끝내기');
  b.type = 'button';
  b.addEventListener('click', () => nextItem(ctx));
  return b;
}

/** 확인 — 퍼즐마다 처음 낸 것만 판정 (다 채우지 않았으면 무시) */
function submit(ctx, p, g) {
  const ps = S.ps;
  if (!ps || ps.grade || !g || !g.valid) return;
  ps.grade = g;
  ps.quitAsk = false;
  if (!ps.first.has(p.id)) ps.first.set(p.id, g.ok);
  try { if (g.ok) sfx.ding(); else sfx.wrong(); } catch { /* 소리는 없어도 */ }
  ps.focus = 'next';
  renderSession(ctx);
}

function nextItem(ctx) {
  const ps = S.ps;
  if (!ps || !ps.grade) return;
  ps.i++;
  ps.placed = [];
  ps.labels = [];
  ps.grade = null;
  ps.focus = 'pool';
  if (ps.i >= ps.items.length) { ps.focus = 'done'; finishSession(ctx); return; }
  renderSession(ctx);
  window.scrollTo(0, 0);
}

async function finishSession(ctx) {
  const ps = S.ps;
  if (!ps || ps.saving) return;
  ps.saving = true;
  ps.result = null;
  renderSession(ctx);
  const answers = [...ps.first.entries()].map(([id, ok]) => ({ id, ok, from: ps.from.get(id) || 0 }));
  let res;
  try { res = await korPuzzleFinish(answers, (S.list || []).map((p) => p.id)); } catch { res = { ok: false, why: 'save' }; }
  const live = S.ps === ps; // 화면이 바뀌었어도 🥚 칸은 채운다 (🔤 낱말과 같다)
  if (live) {
    ps.saving = false;
    ps.result = res;
    renderSession(ctx);
  }
  if (res && res.ok) {
    if (live && (res.stone || (res.solved && res.solved.length))) { try { sfx.success(); } catch { /* 소리는 없어도 */ } }
    const egg = await ctx.tickKorDay(); // 🥚 오늘의 퍼즐을 끝낸 날 = 국어 알 하루 칸
    if (S.ps === ps && egg && egg.ok) { ps.egg = egg; renderSession(ctx); }
  }
}

function finishEl(ctx) {
  const ps = S.ps;
  const box = el('div', 'kor-done');
  if (ps.saving || !ps.result) { box.appendChild(el('p', 'kor-done-title', '저장하는 중…')); return box; }
  const res = ps.result;
  const t = puzzleFinishText(res, (id) => nameOf(byId(id)) || id);
  box.classList.toggle('is-star', !!(res.ok && (res.stone || res.first)));
  box.appendChild(el('p', 'kor-done-icon', '🧩'));
  box.appendChild(el('p', 'kor-done-title', t.title));
  for (const line of t.lines) box.appendChild(el('p', 'kor-done-line', line));
  const eg = ctx.eggLine(ps.egg);
  if (eg) box.appendChild(el('p', 'kor-done-line kor-egg', eg));
  const row = el('div', 'kor-done-btns');
  if (!res.ok && res.why !== 'empty') {
    const again = el('button', 'btn btn-primary', '다시 저장하기');
    again.type = 'button';
    again.addEventListener('click', () => finishSession(ctx));
    row.appendChild(again);
  }
  const back = el('button', `btn${res.ok ? ' btn-primary' : ''}`, '🧩 퍼즐로');
  back.type = 'button';
  back.addEventListener('click', () => { S.ps = null; ctx.toPuzzle(); });
  row.appendChild(back);
  const cards = el('button', 'btn', '📚 도감으로');
  cards.type = 'button';
  cards.addEventListener('click', () => { S.ps = null; ctx.toCards(); });
  row.appendChild(cards);
  box.appendChild(row);
  const cb = ctx.catchBtnEl(); // 🎯 그날 처음 끝냈으면 국어 포켓몬 잡기
  if (cb) box.appendChild(cb);
  return box;
}
