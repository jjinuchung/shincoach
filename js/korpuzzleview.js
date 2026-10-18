// 🧩 국어 화면의 퍼즐 탭 — 🧩 차례 맞추기 · ⚖️ 사실·의견 가르기 (v242, 2026-10-12 아버님 "이대로 진행") · 📍 글에 있나요? (v259)
// 규칙은 korpuzzle.js(순수), 저장은 xp.korPuzzleFinish(한 트랜잭션 — 퍼즐 칸과 💰·🎯·🟩가 같이).
// koreanview가 🎯 잡기 단추·🥚 알 칸·탭 이동을 ctx로 건넨다(kortabs와 같은 꼴 — 서로 import하지 않게)
//  · 판정은 퍼즐마다 **처음 낸 것** — 조각은 마음대로 놓았다 뺐다 하고 "확인"을 누를 때 한 번 채점(Codex 54차 PART 3 #6)
//  · 판 중간에 나가면(🎒·📊) 그대로 이어서, "← 그만하기"는 한 것(낸 퍼즐·놓은 조각·고른 칸)이 있으면 두 번 눌러야 저장 없이 끝
//  · 📍 글은 푸는 동안·고쳐 볼 때 내내 보인다 — [글에 있어요]를 누르면 그 내용이 있는 줄을 글에서 고른다(문장은 가·나·다, 줄은 ①②③) ·
//    다시 그려도 글 상자의 읽던 자리는 그대로 · 어느 문장의 줄을 고르는지 읽어 준다 · 확인 뒤 [글에서 보기] (Codex 70차)
//  · 🔗 앞뒤 어울리기(v294): 문장마다 끝 보기를 섞어 놓고(판을 시작할 때 한 번) · 고르면 문장이 이어져 보인다 · 확인 뒤 바른 문장과 짝·까닭
import { ASKS, FO, IO, KINDS, KIND_LIST, AGREE_TYPES, allPuzzles, planPuzzles, puzzleStats, shuffledOrder, dealChoices, gradeOrder, gradeSort, gradeIntext, gradeAgree, intextWhy, isOpen, isSolved, puzzleFinishText, puzzleTodayLine } from './korpuzzle.js';
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
const nameOf = (p) => (!p ? '' : p.kind === 'order' ? `${ASKS[p.ask].ko} 「${p.title}」` : p.kind === 'intext' ? `${KINDS.intext.icon} 「${p.title}」` : `${p.icon} ${p.title}`);
/** 📍 문장 이름 — 줄 번호(①②③)와 헷갈리지 않게 가·나·다 */
const LETTERS = ['가', '나', '다', '라', '마', '바'];

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
  head.appendChild(el('p', 'kor-intro', '이야기의 흐름과 하는 차례를 맞추고, 글에 있는 내용인지 확인하고, 사실과 의견을 가리고, 문장의 앞뒤가 어울리게 끝을 골라요. 다 맞힌 퍼즐은 ⭐, 틀린 퍼즐은 다음 날 다시 나와요.'));
  head.appendChild(el('p', 'kor-count', puzzleTodayLine(wordsToday(korPuzzleDayMap(), now))));
  if (plan.length) {
    const cnt = (kind) => plan.filter((p) => p.kind === kind).length;
    const o = cnt('order');
    const t = cnt('intext');
    const s = cnt('sort');
    const a = cnt('agree');
    const b = el('button', 'btn btn-primary btn-big-wide kor-pstart', `🧩 오늘의 퍼즐 시작 (${[o ? `차례 ${o}` : '', t ? `글에 있나요 ${t}` : '', s ? `사실·의견 ${s}` : '', a ? `앞뒤 어울리기 ${a}` : ''].filter(Boolean).join(' · ')})`);
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
  for (const kind of KIND_LIST) {
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
  const items = plan.map((x) => byId(x.id)).filter(Boolean).map((p) => ({ id: p.id, kind: p.kind, deal: p.kind === 'order' ? shuffledOrder(p.chunks.length) : p.kind === 'agree' ? dealChoices(p) : null }));
  if (!items.length) { ctx.rerender(); return; }
  // 판을 시작할 때 퍼즐마다 마지막으로 푼 때 — 저장할 때 그 사이 다른 판이 옮겼으면 연습으로 (🔤 낱말과 같다)
  const from = new Map(items.map((x) => [x.id, (states[x.id] && states[x.id].at) || 0]));
  S.ps = { items, i: 0, first: new Map(), from, placed: [], labels: [], picks: [], ends: [], lineFor: -1, pinTop: 0, grade: null, saving: false, result: null, egg: null, quitAsk: false, focus: 'start' };
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
  const card = p && p.kind === 'order' ? orderEl(ctx, p, it) : p && p.kind === 'intext' ? intextEl(ctx, p) : p && p.kind === 'agree' ? agreeEl(ctx, p, it) : sortEl(ctx, p);
  wrap.appendChild(card);
  wrap.appendChild(live);
  main.appendChild(wrap);
  // 📍 글 상자는 위쪽 띠(sticky) 아래에 붙는다 — 읽기 화면과 같은 --kor-top
  const bar = document.querySelector('#view-korean .topbar');
  main.style.setProperty('--kor-top', `${Math.ceil(bar ? bar.getBoundingClientRect().height : 64) + 8}px`);
  // 📍 글 상자는 다시 그려도 읽던 자리 그대로 (Codex 70차 — 고를 때마다 맨 위로 돌아갔다)
  const pin = card.querySelector('.kor-pin-text');
  const roll = pin ? pin.querySelector('.kor-pin-scroll') : null;
  if (roll && ps.pinTop) roll.scrollTop = ps.pinTop;
  const fb = card.querySelector('.kor-fb');
  // 읽어 주기 — 확인 뒤에는 결과 · 📍 줄을 고르는 중에는 어느 문장의 줄인지 (같은 말이면 그대로 두어 다시 읽지 않게)
  const say = fb && fb.textContent ? fb.textContent
    : pin && !ps.grade && ps.lineFor >= 0 ? `「${LETTERS[ps.lineFor]}」 문장 — 그 내용을 직접 말하는 줄을 글에서 골라 주세요` : '';
  if (live.textContent !== say) live.textContent = say;
  const focusTo = ps.focus;
  ps.focus = '';
  // 다시 그리면 누른 단추가 사라지므로 초점을 같은 자리로 — 새 퍼즐(start·pool)은 첫 조각이나 첫 문장의 [사실]로 (Codex 55차)
  //   📍 [글에 있어요]를 누르면 글의 줄(pline — 바꾸는 중이면 고른 줄, 아니면 상자에 보이는 첫 줄) · 줄을 고르면 그 문장의 줄 단추(chip:k)
  const fo = /^fo:(\d+):(fact|opinion|in|out)$/.exec(focusTo);
  const chip = /^chip:(\d+)$/.exec(focusTo);
  const end = /^end:(\d+):(\d+)$/.exec(focusTo);
  const t = focusTo === 'next' ? card.querySelector('.kor-next')
    : focusTo === 'quit' ? wrap.querySelector('.kor-wquit')
      : focusTo === 'start' || focusTo === 'pool' ? card.querySelector('.kor-pchunk:not(:disabled), .kor-pfo:not(:disabled), .kor-pcheck:not(:disabled)')
        : focusTo === 'check' ? card.querySelector('.kor-pcheck')
          : focusTo === 'pline' ? plineTarget(card, ps)
            : chip ? (card.querySelectorAll('.kor-psort')[Number(chip[1])] || card).querySelector('.kor-pline-chip')
              : fo ? (card.querySelectorAll('.kor-psort')[Number(fo[1])] || card).querySelector(`.kor-pfo.is-${fo[2]}`)
                : end ? (card.querySelectorAll('.kor-psort')[Number(end[1])] || card).querySelector(`.kor-pend[data-c="${end[2]}"]`) : null;
  if (t) {
    try { t.focus({ preventScroll: true }); } catch { /* 초점은 없어도 */ }
    if (pin) showFocused(t); // 📍 초점 간 것이 화면 밖이거나 붙어 있는 글 상자에 가리면 보이게
  }
}

/** 📍 줄 고르기 초점 — 고른 줄을 바꾸는 중이면 그 줄, 아니면 글 상자에 보이는 첫 줄(읽던 자리를 지킨다) */
function plineTarget(card, ps) {
  const lines = [...card.querySelectorAll('button.kor-pline')];
  const x = ps.picks[ps.lineFor];
  const mine = x && x.line ? lines.find((b) => b.dataset.n === String(x.line)) : null;
  if (mine) return mine;
  const box = card.querySelector('.kor-pin-scroll');
  const top = box ? box.getBoundingClientRect().top : -Infinity;
  return lines.find((b) => b.getBoundingClientRect().top >= top - 2) || lines[0] || null; // 2px — 굴린 자리가 줄 테두리에 걸쳐도 그 줄
}

/** 글 상자 안에서 그 줄이 보이게 (상자만 굴린다) — mid면 가운데로 */
function inBox(box, line, mid) {
  const r = line.getBoundingClientRect();
  const b = box.getBoundingClientRect();
  if (mid) box.scrollTop += r.top + r.height / 2 - (b.top + b.height / 2);
  else if (r.top < b.top + 4) box.scrollTop -= b.top + 4 - r.top;
  else if (r.bottom > b.bottom - 4) box.scrollTop += Math.min(r.bottom - b.bottom + 4, r.top - b.top - 4);
}

/** 📍 그것이 보이게 — 글 상자 안의 줄은 상자를 먼저 굴리고, 그래도 화면 밖이거나 위쪽 띠·붙어 있는 글 상자에 가리면 화면을 조금 굴린다 */
function showFocused(t) {
  const box = t.closest('.kor-pin-scroll');
  if (box) inBox(box, t, false);
  const r = t.getBoundingClientRect();
  let top = 0;
  const covers = [document.querySelector('#view-korean .topbar')];
  if (!box) covers.push(document.querySelector('.kor-psess .kor-pin-text'));
  for (const c of covers) {
    if (!c) continue;
    const b = c.getBoundingClientRect();
    if (b.left < r.right && r.left < b.right && b.top <= r.top) top = Math.max(top, b.bottom);
  }
  const room = window.innerHeight;
  if (r.top < top + 8) window.scrollBy(0, r.top - top - 8);
  else if (r.bottom > room - 8) window.scrollBy(0, Math.min(r.bottom - room + 8, r.top - top - 8));
}

/** 📍 확인 뒤 [글에서 보기] — 글 상자를 그 줄로 굴리고 잠깐 반짝 · 읽어 주기에는 그 줄 글 (다시 그리지 않는다) */
function showLine(from, p, n) {
  const card = from.closest('.kor-pin');
  const box = card ? card.querySelector('.kor-pin-scroll') : null;
  const line = box ? box.querySelector(`.kor-pline[data-n="${n}"]`) : null;
  if (!line) return;
  inBox(box, line, true);
  showFocused(line);
  line.classList.remove('is-flash');
  line.getBoundingClientRect(); // 다시 눌러도 다시 반짝이게
  line.classList.add('is-flash');
  if (S.live) S.live.textContent = `${circled(n)}번 줄: ${p.lines[n - 1]}`;
}

/** 이 판에서 한 것이 있나 — 낸 퍼즐 · 놓은 조각 · 고른 칸 (있으면 "그만하기"를 한 번 더 묻는다, Codex 55차) */
function didWork(ps) {
  return ps.first.size > 0 || ps.placed.length > 0 || ps.labels.some(Boolean) || ps.picks.some(Boolean) || ps.ends.some((c) => c !== undefined);
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

/** 글 안의 한 말을 굵게 (처음 나온 곳 하나) — 없으면 글 그대로 · whole이면 그 말이 걸친 낱말(띄어 쓴 덩이) 전체를("않" → "않을") */
function boldIn(parent, text, word, whole = false) {
  let k = word ? text.indexOf(word) : -1;
  if (k < 0) { parent.appendChild(document.createTextNode(text)); return; }
  let e = k + word.length;
  if (whole) { k = text.lastIndexOf(' ', k) + 1; const sp = text.indexOf(' ', e); e = sp < 0 ? text.length : sp; }
  parent.appendChild(document.createTextNode(text.slice(0, k)));
  parent.appendChild(el('b', 'kor-pclue', text.slice(k, e)));
  parent.appendChild(document.createTextNode(text.slice(e)));
}

/** 🔗 앞뒤 어울리기 한 장 — 문장마다 앞부분(짝 말 굵게) + 끝 보기(판을 시작할 때 섞은 차례) · 고르면 빈칸에 이어져 보인다 ·
 *  확인 → 문장마다 ✓/✗와 바른 문장(짝 말·짝 조각 굵게) · 🔗 짝과 까닭 */
function agreeEl(ctx, p, it) {
  const ps = S.ps;
  const g = ps.grade;
  const box = el('div', 'kor-q kor-pq');
  const head = el('div', 'kor-q-head');
  head.appendChild(el('span', 'kor-q-skill', `${KINDS.agree.icon} ${KINDS.agree.ko} · ${p.icon} ${p.title}`));
  box.appendChild(head);
  box.appendChild(el('p', 'kor-q-text', '문장의 앞과 어울리는 끝을 골라 보세요.'));
  box.appendChild(el('p', 'kor-tnote', '굵은 말을 보고, 문장의 처음과 끝만 이어 읽어 보세요.'));
  const rows = el('ul', 'kor-psorts');
  p.items.forEach((x, k) => {
    const li = el('li', 'kor-psort kor-pagree');
    const c = ps.ends[k];
    const t = el('p', 'kor-psort-t');
    t.appendChild(document.createTextNode(`${circled(k + 1)} `));
    boldIn(t, x.pre, x.key);
    t.appendChild(document.createTextNode(' '));
    t.appendChild(c === undefined ? el('span', 'kor-pblank', '　　　　') : el('span', 'kor-pfill', x.choices[c]));
    t.appendChild(document.createTextNode('.'));
    li.appendChild(t);
    const btns = el('div', 'kor-psort-btns');
    btns.setAttribute('role', 'group');
    btns.setAttribute('aria-label', `${k + 1}번 문장의 끝`);
    for (const j of it.deal[k]) {
      const on = c === j;
      const b = el('button', `kor-pfo kor-pend${on ? ' is-on' : ''}`, `${on ? '✔ ' : ''}${x.choices[j]}`);
      b.type = 'button';
      b.dataset.c = String(j);
      b.setAttribute('aria-pressed', String(on));
      b.disabled = !!g;
      b.addEventListener('click', () => { if (S.ps !== ps || ps.grade) return; ps.ends[k] = j; ps.quitAsk = false; ps.focus = `end:${k}:${j}`; renderSession(ctx); });
      btns.appendChild(b);
    }
    li.appendChild(btns);
    if (g) {
      const ok = c === 0;
      li.classList.add(ok ? 'is-ok' : 'is-no');
      const right = el('p', 'kor-psort-why');
      right.appendChild(document.createTextNode(`${ok ? '✓ 바른 문장' : '✗ 바르게 고치면'}: `));
      boldIn(right, x.pre, x.key);
      right.appendChild(document.createTextNode(' '));
      boldIn(right, x.choices[0], x.mate, true);
      right.appendChild(document.createTextNode('.'));
      li.appendChild(right);
      li.appendChild(el('p', 'kor-psort-why kor-pmate', `🔗 ${AGREE_TYPES[x.type] || ''} — ${x.why}`));
    }
    rows.appendChild(li);
  });
  box.appendChild(rows);
  if (!g) {
    const check = el('button', 'btn btn-primary kor-pcheck', '확인');
    check.type = 'button';
    check.disabled = !gradeAgree(p, p.items.map((_, k) => ps.ends[k])).valid;
    check.addEventListener('click', () => submit(ctx, p, gradeAgree(p, p.items.map((_, k) => ps.ends[k]))));
    box.appendChild(check);
    box.appendChild(el('p', 'kor-fb'));
    return box;
  }
  box.appendChild(el('p', `kor-fb ${g.ok ? 'is-ok' : 'is-no'}`, g.ok ? '맞아요! 앞뒤가 모두 어울려요' : `아쉬워요 — ${g.right} / ${g.n}문장을 맞혔어요. 바른 문장과 짝을 읽어 보세요`));
  box.appendChild(nextBtn(ctx));
  return box;
}

/** 📍 글에 있나요? 한 장 — 글(번호 붙은 줄)은 내내 보이고 · 문장마다 [글에 있어요] [글에 없어요] · 있어요면 그 줄을 글에서 고른다 ·
 *   모두 고르면(있어요는 줄까지) 확인 → 바른 줄을 칠하고 원문 조각을 굵게 · 없어요는 "글에서는 확인할 수 없어요 — 까닭" */
function intextEl(ctx, p) {
  const ps = S.ps;
  const g = ps.grade;
  const box = el('div', 'kor-q kor-pq kor-pin');
  const head = el('div', 'kor-q-head');
  head.appendChild(el('span', 'kor-q-skill', `${KINDS.intext.icon} ${KINDS.intext.ko} · ${p.icon} 「${p.title}」`));
  box.appendChild(head);
  box.appendChild(el('p', 'kor-q-text', '문장마다 글에 나오는 내용인지 골라 보세요. 글에 있으면 그 내용을 직접 말하는 줄도 글에서 눌러요.'));
  box.appendChild(el('p', 'kor-tnote', '있어요 = 글의 한 줄에 그 내용이 나와요 · 없어요 = 이 글에서는 확인할 수 없어요(실제로는 맞는 말이어도)'));
  const body = el('div', 'kor-pin-body');
  body.appendChild(intextTextEl(ctx, p));
  const col = el('div', 'kor-pin-col');
  const rows = el('ul', 'kor-psorts');
  p.sents.forEach((s, k) => rows.appendChild(intextRowEl(ctx, p, s, k)));
  col.appendChild(rows);
  if (!g) {
    const check = el('button', 'btn btn-primary kor-pcheck', '확인');
    check.type = 'button';
    check.disabled = !gradeIntext(p, p.sents.map((_, j) => ps.picks[j])).valid;
    check.addEventListener('click', () => submit(ctx, p, gradeIntext(p, p.sents.map((_, j) => ps.picks[j]))));
    col.appendChild(check);
    if (check.disabled) col.appendChild(el('p', 'kor-tnote', '모든 문장을 고르고, 글에 있어요는 줄까지 고르면 확인할 수 있어요'));
    col.appendChild(el('p', 'kor-fb'));
  } else {
    col.appendChild(el('p', `kor-fb ${g.ok ? 'is-ok' : 'is-no'}`, g.ok ? '맞아요! 글과 하나하나 맞춰 봤어요' : `아쉬워요 — ${g.right} / ${g.n}문장을 맞혔어요. 칠한 줄과 까닭을 읽어 보세요`));
    col.appendChild(nextBtn(ctx));
  }
  body.appendChild(col);
  box.appendChild(body);
  return box;
}

/** 📍 글 상자 — 줄을 고를 때만 줄이 단추 · 줄 끝에 고른 문장 글자(확인 뒤에는 바른 줄 ✓ · 잘못 고른 줄 ✗) ·
 *   제목·고르기 안내는 위에 늘 보이고 줄만 굴린다(안내가 생겨도 읽던 줄이 밀리지 않게) */
function intextTextEl(ctx, p) {
  const ps = S.ps;
  const g = ps.grade;
  const picking = !g && ps.lineFor >= 0;
  const box = el('div', `kor-passage kor-pin-text${picking ? ' is-picking' : ''}`);
  box.appendChild(el('h3', 'kor-passage-title', `「${p.title}」`));
  if (picking) box.appendChild(el('p', 'kor-pin-pickhint', `👆 「${LETTERS[ps.lineFor]}」 문장의 내용을 직접 말하는 줄을 눌러요`));
  const roll = el('div', 'kor-pin-scroll');
  roll.addEventListener('scroll', () => { if (S.ps === ps) ps.pinTop = roll.scrollTop; }, { passive: true }); // 다시 그릴 때 이 자리로
  const tags = new Map();
  const tag = (n, text, cls) => { if (!tags.has(n)) tags.set(n, []); tags.get(n).push([text, cls]); };
  p.sents.forEach((s, k) => {
    const x = ps.picks[k];
    const mine = !!x && x.io === 'in' && x.line > 0;
    if (!g) { if (mine) tag(x.line, LETTERS[k], ''); return; }
    if (s.io === 'in') tag(s.line, `${LETTERS[k]} ✓`, 'is-ok');
    if (mine && !(s.io === 'in' && x.line === s.line)) tag(x.line, `${LETTERS[k]} ✗`, 'is-no');
  });
  const ol = el('ol', 'kor-plines');
  p.lines.forEach((t, i) => {
    const n = i + 1;
    const li = el('li');
    const b = el(picking ? 'button' : 'div', 'kor-pline');
    b.dataset.n = String(n);
    const quotes = g ? p.sents.filter((s) => s.io === 'in' && s.line === n).map((s) => s.quote) : [];
    if (quotes.length) b.classList.add('is-mark');
    b.appendChild(el('span', 'kor-num', circled(n)));
    b.appendChild(quoteEl(t, quotes));
    for (const [text, cls] of tags.get(n) || []) b.appendChild(el('span', `kor-ptag${cls ? ` ${cls}` : ''}`, text));
    if (picking) {
      b.type = 'button';
      b.setAttribute('aria-label', `「${LETTERS[ps.lineFor]}」 문장의 줄로 ${n}번 줄 고르기: ${t}`);
      b.addEventListener('click', () => pickLine(ctx, p, n));
    }
    li.appendChild(b);
    ol.appendChild(li);
  });
  roll.appendChild(ol);
  box.appendChild(roll);
  return box;
}

/** 줄 글 — 확인 뒤에는 그 줄의 원문 조각을 굵게 */
function quoteEl(text, quotes) {
  const e = el('span', 'kor-pline-t');
  const q = quotes.find((x) => x && text.includes(x));
  const k = q ? text.indexOf(q) : -1;
  if (k < 0) { e.textContent = text; return e; }
  e.appendChild(document.createTextNode(text.slice(0, k)));
  e.appendChild(el('b', 'kor-pclue', q));
  e.appendChild(document.createTextNode(text.slice(k + q.length)));
  return e;
}

/** 📍 문장 한 줄 — [글에 있어요] [글에 없어요] · 있어요면 고른 줄(바꾸기) · 확인 뒤 ✓/✗와 까닭 */
function intextRowEl(ctx, p, s, k) {
  const ps = S.ps;
  const g = ps.grade;
  const x = ps.picks[k];
  const li = el('li', `kor-psort kor-pin-row${!g && ps.lineFor === k ? ' is-waiting' : ''}`);
  const tp = el('p', 'kor-psort-t');
  tp.appendChild(el('b', 'kor-pin-letter', LETTERS[k]));
  tp.appendChild(document.createTextNode(` ${s.t}`));
  li.appendChild(tp);
  const btns = el('div', 'kor-psort-btns');
  btns.setAttribute('role', 'group');
  btns.setAttribute('aria-label', `${LETTERS[k]} 문장`);
  for (const io of ['in', 'out']) {
    const on = !!x && x.io === io;
    const b = el('button', `kor-pfo is-${io}${on ? ' is-on' : ''}`, `${on ? '✔ ' : ''}${IO[io]}`);
    b.type = 'button';
    b.setAttribute('aria-pressed', String(on));
    b.disabled = !!g;
    b.addEventListener('click', () => setIo(ctx, k, io));
    btns.appendChild(b);
  }
  li.appendChild(btns);
  if (!g && x && x.io === 'in') {
    const row = el('div', 'kor-pin-line');
    if (ps.lineFor === k) row.appendChild(el('span', 'kor-pin-wait', x.line ? `${circled(x.line)}번 줄 — 바꾸려면 글에서 다른 줄을 눌러요` : '👆 글에서 이 내용을 직접 말하는 줄을 눌러요'));
    else {
      const c = el('button', 'btn btn-small kor-pline-chip', x.line ? `${circled(x.line)}번 줄 · 바꾸기` : '몇 번 줄인지 고르기');
      c.type = 'button';
      c.addEventListener('click', () => { if (S.ps !== ps || ps.grade) return; ps.lineFor = k; ps.quitAsk = false; ps.focus = 'pline'; renderSession(ctx); });
      row.appendChild(c);
    }
    li.appendChild(row);
  }
  if (g) {
    const ok = !!x && x.io === s.io && (s.io !== 'in' || x.line === s.line);
    li.classList.add(ok ? 'is-ok' : 'is-no');
    li.appendChild(el('p', 'kor-psort-why', intextWhy(s, x, ok)));
    if (s.io === 'in') {
      const show = el('button', 'btn btn-small kor-pin-show', `🔎 글에서 보기 · ${circled(s.line)}번 줄`);
      show.type = 'button';
      show.addEventListener('click', () => showLine(show, p, s.line));
      li.appendChild(show);
    }
  }
  return li;
}

/** 줄을 기다리는 다른 문장(있어요인데 줄이 아직 없음) — 없으면 -1 */
function waitingFrom(ps, skip) {
  return ps.picks.findIndex((x, j) => j !== skip && !!x && x.io === 'in' && !x.line);
}

/** 📍 [글에 있어요]/[글에 없어요] — 있어요인데 줄이 없으면 그 문장이 줄을 기다린다(글의 줄이 단추가 된다) */
function setIo(ctx, k, io) {
  const ps = S.ps;
  if (!ps || ps.grade) return;
  const prev = ps.picks[k];
  if (io === 'in') {
    const line = prev && prev.io === 'in' ? prev.line : 0;
    ps.picks[k] = { io: 'in', line };
    if (!line) ps.lineFor = k;
    ps.focus = line ? `fo:${k}:in` : 'pline';
  } else {
    ps.picks[k] = { io: 'out' };
    if (ps.lineFor === k) ps.lineFor = waitingFrom(ps, k);
    ps.focus = `fo:${k}:out`;
  }
  ps.quitAsk = false;
  renderSession(ctx);
}

/** 📍 글의 줄을 눌렀다 — 기다리던 문장에 붙이고, 줄을 기다리는 다른 문장이 있으면 그 문장으로 */
function pickLine(ctx, p, n) {
  const ps = S.ps;
  if (!ps || ps.grade || ps.lineFor < 0) return;
  const k = ps.lineFor;
  const x = ps.picks[k];
  if (!x || x.io !== 'in') { ps.lineFor = -1; renderSession(ctx); return; }
  ps.picks[k] = { io: 'in', line: n };
  ps.lineFor = waitingFrom(ps, k);
  ps.quitAsk = false;
  ps.focus = ps.lineFor >= 0 ? 'pline' : gradeIntext(p, p.sents.map((_, j) => ps.picks[j])).valid ? 'check' : `chip:${k}`;
  renderSession(ctx);
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
  ps.picks = [];
  ps.ends = [];
  ps.lineFor = -1;
  ps.pinTop = 0;
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
