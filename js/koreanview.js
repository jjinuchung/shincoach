// 📚 국어 화면 — 작품 도감(카드 목록) → 글 읽기 → 한 문제씩(네 보기 · 틀리면 힌트) → 🔍 근거 잡기 → 다 풀면 ★·💰 (2026-10-11)
// 규칙·검사는 korean.js(순수), 저장은 xp.korFinish(한 트랜잭션 — 별과 💰가 같이), 글은 coach/korean/reading.json
// 샘플 검수 페이지(artifact 9QUtn2o2L8ogq7DJBZnp3f)를 그대로 앱으로 — 아버님 "우선 만들고 적용한 후에 반응을 보자"
//  · 보기는 물음마다 섞어 그린다(원고의 정답 자리를 외우지 않게) · 틀린 보기는 한 번 누르면 꺼지고 힌트(잘못 읽기 종류)
//  · 근거가 둘 이상이면 하나만 눌러도 맞고, 맞히면 모두 칠한다 · 근거를 잘못 누른 것은 잘못 읽기로 세지 않는다
//  · ⏳ 하루 시간 제한(수학·영어)은 국어를 세지 않는다 — 처음엔 반응을 보려고(아버님께 여쭐 것)
import { TYPES, KINDS, KOR_COINS, circled, lineCount, lineText, unitOf, validCards, starsOf, nextStar } from './korean.js';
import { korFinish, korDoneMap, onProfileReload, profileLoading } from './xp.js';
import { sfx, unlock as sfxUnlock } from './sfx.js';

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

/** 글 원고 자리 */
export const CONTENT_URL = './coach/korean/reading.json';

// cards: 쓸 수 있는 카드(validCards) · read: 읽는 중인 글 { card, qi, qs: [물음 상태], misses, result, saving }
const ui = { cards: null, loadErr: '', read: null, wired: false };

/** 보기 차례를 섞는다 (rng = 0 이상 1 미만) → 원고 보기 번호 배열 */
export function shuffled(n, rng = Math.random) {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 도감 칸 아래 말 (순수) — 받은 별·다음 별 → { text, ready(지금 읽으면 별) } */
export function statusOf(done, id, now) {
  const s = starsOf(done, id);
  const n = nextStar(done, id, now);
  if (s === 0) return { text: `새 글 · 다 읽으면 ★ 💰${KOR_COINS[1]}`, ready: true };
  if (n.star) return { text: `다시 읽으면 ${'★'.repeat(n.star)} 💰${KOR_COINS[n.star]}`, ready: true };
  if (n.why === 'wait') return { text: `${whenText(n.days)} 다시 읽으면 ${'★'.repeat(n.next)}`, ready: false };
  return { text: '★★★ 다 모았어요!', ready: false };
}

/** 남은 날 → "내일" · "N일 뒤" (순수) */
export function whenText(days) {
  const d = Math.max(1, Math.floor(Number(days) || 1));
  return d === 1 ? '내일' : `${d}일 뒤`;
}

/** 맞힌 뒤 보여 줄 "아까 고른 보기가 왜 틀렸나" (순수) — 고른 차례대로 { t, why } (Codex 48차 #6: 써 둔 까닭이 화면에 안 나왔다) */
export function wrongNotes(q, wrong) {
  return (wrong || []).map((k) => q.opts[k]).filter((o) => o && !o.ok).map((o) => ({ t: o.t, why: o.why }));
}

/** 다 읽은 뒤의 말 (순수) — korFinish 결과 → { title, lines } */
export function finishText(r) {
  if (!r || !r.ok) {
    if (r && r.why === 'unknown') return { title: '이 글은 지금 도감에 없어요', lines: ['도감으로 돌아가 다른 글을 골라요'] };
    return { title: '저장이 안 됐어요', lines: ['[다시 저장하기]를 눌러 주세요 — 푼 것은 그대로예요'] };
  }
  if (r.star === 1) return { title: '📚 도감 등록!', lines: [`💰 +${r.coins}`, `내일 다시 읽으면 ★★ 💰${KOR_COINS[2]}`] };
  if (r.star === 2) return { title: '★★ 두 번째 별!', lines: [`💰 +${r.coins}`, `처음 읽은 날부터 일주일이 지나 다시 읽으면 ★★★ 💰${KOR_COINS[3]}`] };
  if (r.star === 3) return { title: '★★★ 다 모았어요!', lines: [`💰 +${r.coins}`, '이 글은 이제 진우 거예요'] };
  if (r.wait === 'wait' && (r.next === 2 || r.next === 3)) {
    return { title: r.next === 2 ? '오늘도 잘 읽었어요' : '또 읽었어요!', lines: [`${whenText(r.days)} 다시 읽으면 ${'★'.repeat(r.next)} 💰${KOR_COINS[r.next]}`] };
  }
  return { title: '또 읽어 줘서 고마워요', lines: ['★★★를 다 모은 글이에요'] };
}

async function loadCards() {
  if (ui.cards) return ui.cards;
  try {
    const res = await fetch(CONTENT_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    ui.cards = validCards(await res.json());
    ui.loadErr = '';
  } catch (e) {
    ui.loadErr = String((e && e.message) || e);
    ui.cards = null;
  }
  return ui.cards;
}

/** 📚 국어 화면에 들어올 때 (app.showView) — 읽던 글이 있으면 그대로(🎒·📊에서 돌아옴), 아니면 도감 */
export async function enterKorean() {
  if (ui.read) { if (!$('korean-main').querySelector('.kor-read')) renderRead(); return; }
  await renderList();
}

/** 도감 (카드 목록) */
export async function renderList() {
  const main = $('korean-main');
  if (!main) return;
  const cards = await loadCards();
  if (ui.read) return; // 읽는 사이 글을 골랐다
  main.textContent = '';
  if (!cards || !cards.length) {
    const box = el('div', 'kor-empty');
    box.appendChild(el('p', '', '글을 불러오지 못했어요 — 인터넷을 확인하고 다시 열어 주세요'));
    if (ui.loadErr) box.appendChild(el('p', 'kor-small', ui.loadErr));
    const again = el('button', 'btn btn-primary', '다시 불러오기');
    again.type = 'button';
    again.addEventListener('click', () => { ui.cards = null; renderList(); });
    box.appendChild(again);
    main.appendChild(box);
    return;
  }
  const done = korDoneMap();
  const now = Date.now();
  const total = cards.length;
  const got = cards.filter((c) => starsOf(done, c.id) > 0).length;
  const stars = cards.reduce((n, c) => n + starsOf(done, c.id), 0);
  const head = el('section', 'kor-head');
  head.appendChild(el('h2', 'kor-h', '📚 작품 도감'));
  head.appendChild(el('p', 'kor-intro', '글을 읽고 문제를 풀면 카드가 모여요. 다른 날 다시 읽으면 ★★, 처음 읽은 날부터 일주일이 지나 다시 읽으면 ★★★!'));
  head.appendChild(el('p', 'kor-count', `모은 카드 ${got} / ${total} · ★ ${stars} / ${total * 3}`));
  main.appendChild(head);
  const grid = el('div', 'kor-grid');
  cards.forEach((c, i) => {
    const s = starsOf(done, c.id);
    const st = statusOf(done, c.id, now);
    const b = el('button', `kor-slot is-${c.kind}${s ? ' is-got' : ''}${st.ready ? ' is-ready' : ''}`);
    b.type = 'button';
    b.dataset.card = c.id;
    b.appendChild(el('span', 'kor-slot-no', `No.${i + 1}`));
    b.appendChild(el('span', 'kor-slot-ico', c.icon));
    b.appendChild(el('span', 'kor-slot-title', c.title));
    b.appendChild(el('span', 'kor-slot-kind', c.kind === 'classic' ? `${KINDS.classic} · ${c.author}` : `${KINDS.practice} · ${c.genre}`));
    b.appendChild(el('span', 'kor-slot-stars', '★'.repeat(s) + '☆'.repeat(3 - s)));
    b.appendChild(el('span', 'kor-slot-status', st.text));
    b.setAttribute('aria-label', `${c.title} — 별 ${s}개 · ${st.text}`);
    b.addEventListener('click', () => openCard(c.id));
    grid.appendChild(b);
  });
  main.appendChild(grid);
}

function openCard(id) {
  const card = (ui.cards || []).find((c) => c.id === id);
  if (!card) return;
  sfxUnlock();
  ui.read = {
    card,
    qi: 0,
    qs: card.qs.map((q) => ({ order: shuffled(q.opts.length), wrong: [], answered: false, evDone: false, evWrong: [] })),
    misses: {},
    result: null,
    saving: false,
    focus: '', // 다시 그린 뒤 초점을 옮길 곳 (moveFocus)
  };
  renderRead();
  window.scrollTo(0, 0);
}

function backToList() {
  ui.read = null;
  renderList();
  window.scrollTo(0, 0);
}

/** 글 상자 — 이야기·설명은 번호 붙은 문장, 명작은 금빛 카드(시는 연·줄) */
function passageEl(card) {
  if (card.kind === 'classic') {
    const box = el('div', 'kor-classic');
    const top = el('div', 'kor-classic-top');
    top.appendChild(el('span', 'kor-classic-badge', KINDS.classic));
    top.appendChild(el('span', 'kor-classic-by', `${card.author} · ${card.genre}`));
    box.appendChild(top);
    box.appendChild(el('h3', 'kor-classic-title', `「${card.title}」`));
    const poem = el('div', 'kor-poem');
    let n = 0;
    for (const st of card.stanzas) {
      const s = el('div', 'kor-stanza');
      for (const t of st) {
        n++;
        const row = el('div', 'kor-line');
        row.dataset.n = String(n);
        row.appendChild(el('span', 'kor-num', circled(n)));
        row.appendChild(el('span', '', t));
        s.appendChild(row);
      }
      poem.appendChild(s);
    }
    box.appendChild(poem);
    if (card.words) box.appendChild(wordsEl(card));
    const facts = el('div', 'kor-facts');
    for (const [k, v] of card.facts) {
      const p = el('p');
      p.appendChild(el('b', '', `${k} `));
      p.appendChild(document.createTextNode(v));
      facts.appendChild(p);
    }
    box.appendChild(facts);
    return box;
  }
  const box = el('div', 'kor-passage');
  const top = el('div', 'kor-passage-top');
  top.appendChild(el('span', 'kor-passage-badge', KINDS.practice));
  top.appendChild(el('span', 'kor-passage-by', `${card.genre} · 글 신코치`));
  box.appendChild(top);
  box.appendChild(el('h3', 'kor-passage-title', `「${card.title}」`));
  const prose = el('p', 'kor-prose');
  card.lines.forEach((t, i) => {
    const sp = el('span', 'kor-sent');
    sp.dataset.n = String(i + 1);
    sp.appendChild(el('span', 'kor-num', circled(i + 1)));
    sp.appendChild(document.createTextNode(`${t} `));
    prose.appendChild(sp);
  });
  box.appendChild(prose);
  if (card.words) box.appendChild(wordsEl(card));
  return box;
}

/** 📖 낱말 풀이 — 글 아래 작게 (어려운 낱말 몇 개, Codex 48차 제안 · 🔤 낱말 줄기의 첫걸음) */
function wordsEl(card) {
  const box = el('div', 'kor-words');
  box.appendChild(el('span', 'kor-words-h', '📖 낱말'));
  for (const [w, mean] of card.words) {
    const p = el('p', 'kor-word');
    p.appendChild(el('b', '', w));
    p.appendChild(document.createTextNode(` — ${mean}`));
    box.appendChild(p);
  }
  return box;
}

/** 읽기 화면 — 위(가로 화면은 왼쪽)에 글, 아래(오른쪽)에 지금 물음 하나 */
function renderRead() {
  const main = $('korean-main');
  const r = ui.read;
  if (!main || !r) return;
  main.textContent = '';
  const wrap = el('section', 'kor-read');
  const top = el('div', 'kor-read-top');
  const back = el('button', 'btn kor-back', '← 도감');
  back.type = 'button';
  back.addEventListener('click', backToList);
  top.appendChild(back);
  top.appendChild(el('span', 'kor-read-skill', r.card.skill));
  wrap.appendChild(top);
  const body = el('div', 'kor-read-body');
  body.appendChild(passageEl(r.card));
  const col = el('div', 'kor-qcol');
  body.appendChild(col);
  wrap.appendChild(body);
  // 읽어 주기 알림은 다시 그려도 남는 한 곳에서 (매번 새로 만든 role=status는 잘 안 읽힌다, Codex 48차 #9)
  const live = el('p', 'kor-live');
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  wrap.appendChild(live);
  main.appendChild(wrap);
  // 위쪽 띠(sticky)만큼 글 상자·물음 칸을 띄운다 — 가로 화면에서 글 윗줄이 띠 밑으로 들어갔다 (Codex 48차 #3)
  const bar = document.querySelector('#view-korean .topbar');
  main.style.setProperty('--kor-top', `${Math.ceil(bar ? bar.getBoundingClientRect().height : 64) + 8}px`);
  renderQ();
}

/** 화면에 다시 그린 뒤 다음에 누를 곳으로 초점(키보드) — 'opt' 남은 보기 · 'ev' 근거 줄 · 'next' 다음 단추 · 'head' 새 물음 · 'done' 끝 카드 */
function moveFocus(col, where) {
  const pickEl = {
    opt: () => col.querySelector('.kor-opt:not(:disabled)'),
    ev: () => col.querySelector('.kor-ev-row:not(:disabled)'),
    next: () => col.querySelector('.kor-next'),
    head: () => col.querySelector('.kor-q-text'),
    done: () => col.querySelector('.kor-done-title'),
  }[where];
  const t = pickEl && pickEl();
  if (!t) return;
  if (!t.matches('button')) t.setAttribute('tabindex', '-1');
  try { t.focus({ preventScroll: true }); } catch { /* 초점은 없어도 */ }
}

/** 지금 물음(또는 다 읽은 뒤 카드)만 다시 그린다 — 글 상자는 그대로(칠한 근거만 바꾼다) */
function renderQ() {
  const r = ui.read;
  const main = $('korean-main');
  const col = main && main.querySelector('.kor-qcol');
  if (!r || !col) return;
  col.textContent = '';
  for (const m of main.querySelectorAll('.kor-sent.is-mark, .kor-line.is-mark')) m.classList.remove('is-mark');
  const live = main.querySelector('.kor-live');
  const focusTo = r.focus;
  r.focus = '';
  if (r.qi >= r.card.qs.length) {
    const done = finishEl();
    col.appendChild(done);
    if (live) live.textContent = (done.querySelector('.kor-done-title') || {}).textContent || '';
    if (focusTo) moveFocus(col, 'done');
    return;
  }
  const q = r.card.qs[r.qi];
  const st = r.qs[r.qi];
  const unit = unitOf(r.card);
  const card = el('div', 'kor-q');
  const head = el('div', 'kor-q-head');
  head.appendChild(el('span', 'kor-q-no', `문제 ${r.qi + 1} / ${r.card.qs.length}`));
  head.appendChild(el('span', 'kor-q-skill', q.skill));
  card.appendChild(head);
  card.appendChild(el('p', 'kor-q-text', q.q));
  const opts = el('div', 'kor-opts');
  st.order.forEach((k, pos) => {
    const o = q.opts[k];
    const isWrong = st.wrong.includes(k);
    const isRight = st.answered && o.ok;
    const b = el('button', `kor-opt${isWrong ? ' is-no' : ''}${isRight ? ' is-ok' : ''}${st.answered && !o.ok && !isWrong ? ' is-dim' : ''}`);
    b.type = 'button';
    b.dataset.k = String(k);
    b.disabled = st.answered || isWrong;
    b.appendChild(el('span', 'kor-opt-mark', circled(pos + 1)));
    b.appendChild(el('span', '', o.t));
    b.addEventListener('click', () => pick(k));
    opts.appendChild(b);
  });
  card.appendChild(opts);
  const fb = el('p', 'kor-fb');
  const lastWrong = st.wrong.length ? q.opts[st.wrong[st.wrong.length - 1]] : null;
  if (st.answered) { fb.classList.add('is-ok'); fb.textContent = q.ev && !st.evDone ? '맞아요! 이제 그렇게 생각한 까닭을 글에서 찾아볼까요?' : '맞아요!'; }
  else if (lastWrong) { fb.classList.add('is-no'); fb.textContent = `🤔 ${TYPES[lastWrong.type].hint}`; }
  card.appendChild(fb);
  let say = fb.textContent;
  if (st.answered && q.ev) {
    const ev = evidenceEl(q, st, unit);
    card.appendChild(ev);
    const m = ev.querySelector('.kor-fb');
    if (m && m.textContent) say = m.textContent;
  }
  const qDone = st.answered && (!q.ev || st.evDone);
  if (qDone) {
    if (q.ev) for (const n of q.ev) { const m = main.querySelector(`.kor-read-body [data-n="${n}"]`); if (m) m.classList.add('is-mark'); }
    const note = el('div', 'kor-note');
    note.appendChild(el('p', '', `💡 ${q.ev ? q.evNote : q.doneNote}`));
    // 아까 고른 틀린 보기가 왜 틀렸나 — 틀릴 때는 종류 힌트만 주고(답을 미리 알려 주지 않게), 맞힌 뒤에 보여 준다 (Codex 48차 #6)
    for (const w of wrongNotes(q, st.wrong)) {
      const p = el('p', 'kor-note-wrong');
      p.appendChild(el('b', '', `✗ ${w.t}`));
      p.appendChild(document.createTextNode(` — ${w.why}`));
      note.appendChild(p);
    }
    card.appendChild(note);
    const last = r.qi === r.card.qs.length - 1;
    const next = el('button', 'btn btn-primary kor-next', last ? '다 풀었어요! →' : '다음 문제 →');
    next.type = 'button';
    next.addEventListener('click', () => { r.qi++; r.focus = 'head'; if (r.qi >= r.card.qs.length) finishCard(); else renderQ(); bringQ(); });
    card.appendChild(next);
  }
  col.appendChild(card);
  if (live) live.textContent = say;
  if (focusTo) moveFocus(col, focusTo === 'answer' ? (qDone ? 'next' : st.answered ? 'ev' : 'opt') : focusTo);
}

/** 새 물음(또는 다 읽은 카드)의 머리가 위쪽 띠에 가렸거나 화면 위로 지나갔으면 띠 바로 아래로 — 세로 화면에서 긴 근거 줄 아래
 *  "다음 문제"를 누르면 새 물음 머리가 화면 밖이었다 · 띠(sticky)를 셈에 넣는다 (Codex 48차 #3, css scroll-margin-top) */
function bringQ() {
  const col = document.querySelector('#korean-main .kor-qcol');
  if (!col) return;
  const bar = document.querySelector('#view-korean .topbar');
  const under = bar ? bar.getBoundingClientRect().bottom : 0;
  if (col.getBoundingClientRect().top < under + 4) col.scrollIntoView({ block: 'start' });
}

function evidenceEl(q, st, unit) {
  const box = el('div', 'kor-ev');
  box.appendChild(el('p', 'kor-ev-title', `🔍 근거 잡기 — ${q.evQ}`));
  const rows = el('div', 'kor-ev-rows');
  const card = ui.read.card;
  for (let n = 1; n <= lineCount(card); n++) {
    const hit = st.evDone && q.ev.includes(n);
    const miss = st.evWrong.includes(n);
    const b = el('button', `kor-ev-row${hit ? ' is-mark' : ''}${miss ? ' is-no' : ''}`);
    b.type = 'button';
    b.dataset.n = String(n);
    b.disabled = st.evDone || miss;
    b.appendChild(el('span', 'kor-num', circled(n)));
    b.appendChild(el('span', '', lineText(card, n)));
    b.addEventListener('click', () => evPick(n));
    rows.appendChild(b);
  }
  box.appendChild(rows);
  const msg = el('p', 'kor-fb');
  if (st.evDone) { msg.classList.add('is-ok'); msg.textContent = `찾았어요! 근거 ${unit}: ${q.ev.map(circled).join(', ')}`; }
  // "까닭이 없어요"는 너무 단정적 — 그 문장도 조금은 관계있을 수 있다 (Codex 48차 #2)
  else if (st.evWrong.length) { msg.classList.add('is-no'); msg.textContent = `그 ${unit}보다 답을 더 잘 받쳐 주는 ${unit}을 찾아볼까요?`; }
  box.appendChild(msg);
  return box;
}

function pick(k) {
  const r = ui.read;
  if (!r || r.qi >= r.card.qs.length) return;
  const q = r.card.qs[r.qi];
  const st = r.qs[r.qi];
  if (st.answered || st.wrong.includes(k)) return;
  const o = q.opts[k];
  if (o.ok) {
    st.answered = true;
    try { sfx.ding(); } catch { /* 소리는 없어도 */ }
  } else {
    st.wrong.push(k);
    r.misses[o.type] = (r.misses[o.type] || 0) + 1; // 잘못 읽기 종류를 센다 — 다 읽을 때 한 번에 저장
    try { sfx.wrong(); } catch { /* 소리는 없어도 */ }
  }
  r.focus = 'answer';
  renderQ();
}

function evPick(n) {
  const r = ui.read;
  if (!r || r.qi >= r.card.qs.length) return;
  const q = r.card.qs[r.qi];
  const st = r.qs[r.qi];
  if (!st.answered || !q.ev || st.evDone || st.evWrong.includes(n)) return;
  if (q.ev.includes(n)) {
    st.evDone = true;
    try { sfx.ding(); } catch { /* 소리는 없어도 */ }
  } else {
    st.evWrong.push(n);
    try { sfx.wrong(); } catch { /* 소리는 없어도 */ }
  }
  r.focus = 'answer';
  renderQ();
}

/** 다 읽었다 — 저장(별·💰 한 트랜잭션) → 다 읽은 카드 */
async function finishCard() {
  const r = ui.read;
  if (!r || r.saving) return;
  r.saving = true;
  renderQ();
  let res;
  try {
    res = await korFinish(r.card.id, r.misses, (ui.cards || []).map((c) => c.id));
  } catch { res = { ok: false, why: 'save' }; }
  if (ui.read !== r) return; // 그 사이 도감으로 나갔다
  r.saving = false;
  r.result = res;
  r.focus = 'done';
  renderQ();
  if (res && res.ok && res.star) {
    try { sfx.success(); } catch { /* 소리는 없어도 */ }
    import('./catch.js').then((m) => m.burstConfetti(res.star === 3 ? 90 : 50)).catch(() => {});
  }
}

function finishEl() {
  const r = ui.read;
  const box = el('div', 'kor-done');
  if (r.saving || !r.result) { box.appendChild(el('p', 'kor-done-title', '저장하는 중…')); return box; }
  const res = r.result;
  const t = finishText(res);
  const stars = res.ok ? res.stars : starsOf(korDoneMap(), r.card.id);
  box.classList.toggle('is-star', !!(res.ok && res.star));
  box.appendChild(el('p', 'kor-done-icon', r.card.icon));
  box.appendChild(el('p', 'kor-done-title', t.title));
  box.appendChild(el('p', 'kor-done-stars', '★'.repeat(stars) + '☆'.repeat(3 - stars)));
  for (const line of t.lines) box.appendChild(el('p', 'kor-done-line', line));
  const first = r.qs.filter((s) => !s.wrong.length).length;
  box.appendChild(el('p', 'kor-done-sub', `보기를 한 번에 맞힌 문제 ${first}개 · 「${r.card.title}」`));
  const row = el('div', 'kor-done-btns');
  if (!res.ok && res.why !== 'unknown') {
    const again = el('button', 'btn btn-primary', '다시 저장하기');
    again.type = 'button';
    again.addEventListener('click', () => { r.result = null; finishCard(); });
    row.appendChild(again);
  }
  const list = el('button', `btn${res.ok ? ' btn-primary' : ''}`, '📚 도감으로');
  list.type = 'button';
  list.addEventListener('click', backToList);
  row.appendChild(list);
  if (res.ok) {
    const re = el('button', 'btn', '🔁 처음부터 다시 읽기');
    re.type = 'button';
    re.addEventListener('click', () => openCard(r.card.id));
    row.appendChild(re);
  }
  box.appendChild(row);
  return box;
}

/** 배선 (app.main) — ← 과목 고르기 · 다른 창에서 별을 받고 돌아오면 도감을 다시 그린다 */
export function initKorean({ showView }) {
  if (ui.wired) return;
  ui.wired = true;
  const back = $('btn-korean-back');
  if (back) back.addEventListener('click', () => showView('home'));
  onProfileReload(() => {
    const v = $('view-korean');
    if (v && !v.hidden && !ui.read && !profileLoading()) renderList().catch(() => {});
  });
}
