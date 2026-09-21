// 🔢 수학 화면 — 줄기(분수) → 📏 진단 → 사다리 → 개념 한 편(📖 → ①②③⭐ → 보상)
//
// 규칙은 mathgen.js(문제)·mathprog.js(진도)에 있고 여기는 그리기와 배선만 한다.
// 영어 화면은 한 줄도 건드리지 않는다 — 🏠 홈에서 갈라져 들어오고 ←로 홈으로 나간다.
// 보상(⚡💰🎯)은 영어와 같은 xp.js·catch.js를 그대로 쓴다 — 도감·코인이 한 몸이라야 "수학을 해서 마스터볼을 산다"가 된다.

import { FRACTION, makeRound, makeQuestion, diagnosticSet, conceptStory, WORLDS } from './mathgen.js';
import { renderFigures, barSvg } from './mathdraw.js';
import {
  needsPlacement, applyPlacement, applyRound, roundReward, ladderOf, dueIds, nowId, nameOf, seenWorlds, REWARD, kidTags, META_TAGS,
} from './mathprog.js';
import { getMath, updateMath, applyDailyDelta, listItems, getAllSentenceStats } from './db.js';
import { todayKey } from './track.js';
import { gainXp, gainCoins, getLevelInfo, coins, caughtCount, getLook, isTired, catchAttempt, inventory } from './xp.js';
import { ROSTER, loadCharacters, isUnlocked, pickCharacters } from './pokemon.js';
import { openCatch } from './catch.js';
import { contentSummary, cueCountOf } from './stats.js';
import { sfx } from './sfx.js';

const $ = (id) => document.getElementById(id);

// 화면 상태 — 전역 boolean/Set은 두지 않는다 ("껐다 켜면 낫는다" 병의 뿌리). 한 편의 상태는 round 객체 하나에 담고 끝나면 null
const ui = {
  showView: null,
  content: null,        // coach/math/fraction.json (한 번 받아 둠)
  opts: null,           // makeRound에 넘길 출연진·세계
  round: null,          // 진행 중인 한 편 { id, mode:'learn'|'review'|'diag', qs, at, correct, missTags, answered }
  run: 0,               // 화면을 지우고 await 하는 함수의 요청 번호 (겹쳐 그리기 방지)
  recent: {},           // 개념별로 방금 나온 이야기 틀·문항 (같은 개념을 다시 풀 때 같은 이야기가 또 나오지 않게)
};
const RECENT_KEEP = 10; // 두 편 반 분량 — 틀이 4개뿐인 개념도 한 바퀴는 돈다

// ───────────────────── 분수를 세로로 ─────────────────────

/** "2 3/8" → 2 와 세로 분수, "5/6" → 세로 분수, **굵게**. DOM으로 만든다 (innerHTML에 글을 넣지 않는다) */
function richNode(text) {
  const frag = document.createDocumentFragment();
  const parts = String(text || '').split(/(\*\*[^*]+\*\*|(?<![\d/])\d+ \d+\/\d+(?![\d/])|(?<![\d/])\d+\/\d+(?![\d/]))/g);
  for (const p of parts) {
    if (!p) continue;
    let m;
    if ((m = /^\*\*([^*]+)\*\*$/.exec(p))) {
      const b = document.createElement('strong'); b.appendChild(richNode(m[1])); frag.appendChild(b);
    } else if ((m = /^(\d+) (\d+)\/(\d+)$/.exec(p))) {
      const mx = el('span', 'mx'); mx.appendChild(el('span', 'w', m[1])); mx.appendChild(fracEl(m[2], m[3])); frag.appendChild(mx);
    } else if ((m = /^(\d+)\/(\d+)$/.exec(p))) {
      frag.appendChild(fracEl(m[1], m[2]));
    } else {
      frag.appendChild(document.createTextNode(p));
    }
  }
  return frag;
}

function fracEl(n, d) {
  const f = el('span', 'fr');
  f.appendChild(el('span', 'n', n));
  f.appendChild(el('span', 'd', d));
  return f;
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/** SVG 문자열(우리 코드가 만든 것)만 innerHTML로 — 글은 절대 여기로 넣지 않는다 */
function svgBox(svg, cls) {
  const box = el('div', cls || 'math-fig');
  box.innerHTML = svg;
  return box;
}

/** 이야기 본문: 문단 나누기 + [bar 7/8] 그림 + 세로 분수 */
function storyBody(text) {
  const wrap = el('div', 'math-story-body');
  for (const para of String(text || '').split(/\n\n+/)) {
    const segs = para.split(/(\[[a-z]+ [^\]]+\])/g);
    const p = el('p');
    let onlyFig = true;
    for (const seg of segs) {
      if (!seg) continue;
      if (/^\[[a-z]+ [^\]]+\]$/.test(seg)) p.appendChild(svgBox(renderFigures(seg), 'math-fig inline'));
      else { p.appendChild(richNode(seg)); if (seg.trim()) onlyFig = false; }
    }
    if (onlyFig) p.className = 'fig-only';
    wrap.appendChild(p);
  }
  return wrap;
}

// ───────────────────── 준비: 내용·출연진·본 영상 ─────────────────────

async function loadContent() {
  if (ui.content) return ui.content;
  try {
    const res = await fetch('./coach/math/fraction.json');
    ui.content = res.ok ? await res.json() : {};
  } catch { ui.content = {}; } // 오프라인 첫 실행 — 코드 안의 예비 문항으로 간다
  return ui.content;
}

/** 출연진: 진우가 잡은 포켓몬 이름 + 끝까지 본 영상 세계 */
async function buildOpts() {
  const content = await loadContent();
  const names = ROSTER.filter((r) => caughtCount(r.id) > 0).map((r) => r.ko);
  let worlds = { pokemon: [] };
  try {
    const [items, records] = await Promise.all([listItems(), getAllSentenceStats()]);
    worlds = seenWorlds(contentSummary(items.filter((it) => !it.broken), records, cueCountOf));
  } catch { /* 영상 기록을 못 읽어도 포켓몬 세계로 간다 */ }
  ui.opts = { content, names, worlds, me: '진우' };
  return ui.opts;
}

/** 🎯 잡기 후보 — 영어 퍼즐과 같은 규칙 (레벨에 열린 것, 😴 쉬는 중 제외) */
async function catchCandidates(n = 4) {
  let chars = [];
  try { chars = await loadCharacters(); } catch { chars = []; }
  const level = getLevelInfo().level;
  const pool = chars.filter((c) => isUnlocked(c.id, level) && !isTired(c.id)).map((c) => ({ ...c, look: getLook(c.id) }));
  return pickCharacters(pool, n);
}

function updateChip() {
  const chip = $('math-chip');
  if (!chip) return;
  const i = getLevelInfo();
  chip.textContent = `Lv.${i.level} ⚡${i.into}/${i.need} · 💰 ${coins()}`;
}

// ───────────────────── 화면들 ─────────────────────

function main() { return $('math-main'); }

function clearMain() {
  const m = main();
  m.innerHTML = '';
  m.scrollTop = 0;
  window.scrollTo(0, 0);
  return m;
}

/** 진입 — 진단 전이면 진단, 아니면 사다리 */
export async function renderMath() {
  // 🎒·📊를 보고 돌아온 것이면 풀던 편을 이어서 (2026-09-20: 과목 화면에도 🎒·📊를 두면서 필요해졌다).
  // 답을 고른 뒤였으면 다음 문항으로 — 같은 문항을 다시 그리면 두 번 답해 두 번 세어진다.
  const r = ui.round;
  if (r && !r.saving) {
    ui.run++;
    if (r.phase === 'story') renderStory(r.id, r.seed);
    else if (r.twin) { if (r.twin.answered) advance(); else renderTwin(); }
    else if (r.answered) advance();
    else renderQuestion();
    return;
  }
  const run = ++ui.run;
  const m = main();
  if (!m) return;
  m.innerHTML = '';
  m.appendChild(el('p', 'math-loading', '불러오는 중…'));
  const [state] = await Promise.all([getMath(), buildOpts()]);
  if (run !== ui.run) return; // 그 사이에 다른 화면으로 갔다
  updateChip();
  if (needsPlacement(state)) renderDiagIntro();
  else renderLadder(state);
}

// ── 📏 진단

function renderDiagIntro() {
  const m = clearMain();
  const card = el('section', 'math-card');
  card.appendChild(el('h2', '', '📏 어디서부터 할까?'));
  card.appendChild(el('p', 'math-p', '분수 문제 5개를 먼저 풀어 볼게요. 어려운 게 나와도 괜찮아요 — 진우가 어디까지 아는지 보려는 거예요.'));
  card.appendChild(el('p', 'math-p muted', '연습장에 풀고 답만 고르면 돼요.'));
  const b = el('button', 'btn btn-primary btn-big-wide', '시작!');
  b.type = 'button';
  b.addEventListener('click', () => startDiag());
  card.appendChild(b);
  m.appendChild(card);
}

function startDiag() {
  const seed = (Date.now() % 1000000) | 0;
  ui.round = { id: null, mode: 'diag', qs: diagnosticSet(seed, 5, ui.opts), at: 0, correct: 0, missTags: [], answers: [], answered: false };
  renderQuestion();
}

// ── 사다리

function renderLadder(state) {
  const m = clearMain();
  const today = todayKey();
  const rows = ladderOf(state, today);
  const due = dueIds(state, today);

  const head = el('section', 'math-card math-strand');
  head.appendChild(el('div', 'math-eyebrow', 'A. 분수 줄기 · 초4 → 초6'));
  const doneN = rows.filter((r) => r.state === 'done').length;
  const crownN = rows.filter((r) => r.crowned).length;
  head.appendChild(el('h2', '', `개념 ${rows.length}개 중 ${doneN}개를 알아요 · 👑 ${crownN}`));
  if (due.length) {
    const b = el('button', 'btn btn-accent btn-big-wide', `🔁 오늘 다시 확인할 개념 ${due.length}개 — 정말 아는지 볼까?`);
    b.type = 'button';
    b.addEventListener('click', () => startRound(due[0], 'review'));
    head.appendChild(b);
  }
  m.appendChild(head);

  const list = el('ul', 'math-ladder');
  for (const r of rows) {
    const li = el('li', `math-rung ${r.state}${r.due ? ' due' : ''}${r.crowned ? ' crowned' : ''}`);
    const btn = el('button', 'math-rung-btn');
    btn.type = 'button';
    btn.appendChild(el('span', 'math-rung-icon', r.icon));
    const body = el('span', 'math-rung-body');
    body.appendChild(el('span', 'math-rung-name', r.name));
    const sub = r.state === 'locked' ? '앞 개념을 먼저 알아야 열려요'
      : r.crowned ? '이해 완료!'
        : r.due ? '오늘 다시 확인하기'
          : r.state === 'done' ? `알아요 (${r.left}번 더 확인하면 👑)`
            : r.state === 'now' ? '지금 배울 차례' : '배울 수 있어요';
    body.appendChild(el('span', 'math-rung-sub', `초${r.grade} · ${sub}`));
    btn.appendChild(body);
    if (r.state === 'locked') btn.disabled = true;
    else btn.addEventListener('click', () => startRound(r.id, r.state === 'done' ? (r.due ? 'review' : 'practice') : 'learn'));
    li.appendChild(btn);
    list.appendChild(li);
  }
  m.appendChild(list);
  m.appendChild(el('p', 'math-note', '👑는 며칠에 걸쳐 다섯 번 확인해야 받아요. 그날 맞힌 건 "안다"이고, 며칠 뒤에도 맞아야 "이해했다"예요.'));
}

// ── 개념 한 편

/**
 * @param {'learn'|'review'|'practice'} mode learn: 처음 배움(📖 먼저) / review: 오늘 복습 / practice: 이미 아는 것 다시 풀기(보상 작게)
 */
/**
 * @param {'learn'|'review'|'practice'} mode
 * @param {{again?:boolean}} [o] again: 방금 틀려서 한 번 더 — 📖 이야기를 통째로 다시 보이지 않고 되짚기 카드로
 */
function startRound(id, mode, o = {}) {
  const seed = (Date.now() % 1000000) | 0;
  const recent = ui.recent[id] || [];
  const qs = makeRound(id, seed, { ...ui.opts, recent });
  ui.recent[id] = [...recent, ...qs.map((q) => q.key).filter(Boolean)].slice(-RECENT_KEEP);
  ui.round = { id, mode, qs, at: 0, correct: 0, missTags: [], answers: [], answered: false, seed, phase: mode === 'learn' && !o.again ? 'story' : 'q' };
  if (o.again) renderRetry(id, o.wrong || []);
  else if (mode === 'learn') renderStory(id, seed);
  else renderQuestion();
}

/**
 * 🤔 되짚기 — 틀려서 다시 할 때. 같은 📖를 통째로 또 읽히면 "피자 얘기만 반복"이 된다(아버님, 2026-09-20).
 * 핵심 한 줄(idea)과 방금 헷갈린 것만 보여 주고 바로 문제로. 이야기는 원하면 다시 읽는다.
 */
function renderRetry(id, wrong) {
  const m = clearMain();
  const c = FRACTION.find((x) => x.id === id);
  const card = el('section', 'math-card math-story');
  card.appendChild(el('div', 'math-eyebrow', `🤔 한 번 더 · ${nameOf(id)}`));
  card.appendChild(el('h2', '', wrong.length ? '방금 틀린 문제를 다시 봐요' : '이것만 기억하고 다시 해 봐요'));
  if (c && c.idea) {
    const idea = el('p', 'math-idea big');
    idea.appendChild(document.createTextNode('💡 '));
    idea.appendChild(richNode(c.idea));
    card.appendChild(idea);
  }
  // 📖 오답 노트 — 틀린 문제마다 문제·내 답·풀이를 접어서 (진우: "왜 틀렸는지 한 문장 말고")
  for (const w of wrong) {
    const det = document.createElement('details');
    det.className = 'math-wrongnote';
    const sum = document.createElement('summary');
    sum.appendChild(el('span', 'k', KIND_LABEL[w.q.kind] || ''));
    const qt = el('span', 'qt'); qt.appendChild(richNode(w.q.q.length > 60 ? w.q.q.slice(0, 60) + '…' : w.q.q)); sum.appendChild(qt);
    det.appendChild(sum);
    const body = el('div', 'body');
    if (w.q.expr) { const ex = el('p', 'math-expr small'); ex.appendChild(richNode(w.q.expr)); body.appendChild(ex); }
    body.appendChild(solveCard(w.q, w.chosen));
    det.appendChild(body);
    card.appendChild(det);
  }
  card.appendChild(el('p', 'math-p muted', '이번엔 다른 이야기로 물어볼게요.'));
  const go = el('button', 'btn btn-primary btn-big-wide', '문제 다시 풀기 →');
  go.type = 'button';
  go.addEventListener('click', () => { if (ui.round) ui.round.phase = 'q'; renderQuestion(); });
  card.appendChild(go);
  const read = el('button', 'btn btn-big-wide', '📖 이야기 다시 읽기');
  read.type = 'button';
  read.addEventListener('click', () => { if (ui.round) { ui.round.phase = 'story'; renderStory(id, ui.round.seed); } });
  card.appendChild(read);
  m.appendChild(card);
}

function renderStory(id, seed) {
  const m = clearMain();
  const st = conceptStory(id, seed, ui.opts);
  const c = FRACTION.find((x) => x.id === id);
  const card = el('section', 'math-card math-story');
  card.appendChild(el('div', 'math-eyebrow', `📖 개념 이야기 · 초${c ? c.grade : ''} ${nameOf(id)}`));
  card.appendChild(el('h2', '', st.title));
  card.appendChild(storyBody(st.text));
  if (c && c.idea) {
    const idea = el('p', 'math-idea');
    idea.appendChild(document.createTextNode('💡 '));
    idea.appendChild(richNode(c.idea));
    card.appendChild(idea);
  }
  const b = el('button', 'btn btn-primary btn-big-wide', '문제 풀어 볼게요 →');
  b.type = 'button';
  b.addEventListener('click', () => { if (ui.round) ui.round.phase = 'q'; renderQuestion(); });
  card.appendChild(b);
  m.appendChild(card);
}

const KIND_LABEL = { calc: '① 계산', misread: '② 누가 틀렸을까', why: '③ 왜 그럴까', special: '⭐ 특별 문제' };

function renderQuestion() {
  const r = ui.round;
  if (!r) return;
  if (/[?&]nosw=1/.test(location.search)) window.__mathRound = r; // 헤드리스 검증용 (개발 모드에서만)
  const m = clearMain();
  const q = r.qs[r.at];
  r.answered = false;
  const card = el('section', 'math-card math-q');

  const top = el('div', 'math-q-top');
  top.appendChild(el('span', 'math-eyebrow', r.mode === 'diag' ? `📏 진단 ${r.at + 1} / ${r.qs.length}` : `${nameOf(r.id)} · ${r.at + 1} / ${r.qs.length}`));
  top.appendChild(el('span', 'math-kind', KIND_LABEL[q.kind] || ''));
  card.appendChild(top);

  const qt = el('p', 'math-qt');
  qt.appendChild(richNode(q.q));
  card.appendChild(qt);
  if (q.figure) card.appendChild(svgBox(q.figure));
  if (q.expr) { const ex = el('p', 'math-expr'); ex.appendChild(richNode(q.expr)); card.appendChild(ex); }
  if (q.hint) card.appendChild(el('p', 'math-hint', `✏️ ${q.hint}`));

  const list = el('div', 'math-choices');
  q.choices.forEach((ch, i) => {
    const b = el('button', 'math-choice');
    b.type = 'button';
    b.dataset.i = String(i);
    b.appendChild(el('span', 'math-choice-no', ['①', '②', '③', '④'][i]));
    const t = el('span', 'math-choice-text');
    t.appendChild(richNode(ch.text));
    b.appendChild(t);
    b.addEventListener('click', () => answer(i, list, card));
    list.appendChild(b);
  });
  card.appendChild(list);
  card.appendChild(el('div', 'math-feedback'));
  m.appendChild(card);
}

function answer(i, list, card) {
  const r = ui.round;
  if (!r || r.answered) return; // 두 번 누르면 두 번 세지 않는다
  r.answered = true;
  const q = r.qs[r.at];
  const ch = q.choices[i];
  const okIdx = q.choices.findIndex((x) => x.ok);
  for (const b of list.querySelectorAll('.math-choice')) {
    b.disabled = true;
    const k = Number(b.dataset.i);
    if (k === okIdx) b.classList.add('ok');
    if (k === i && !ch.ok) b.classList.add('no');
  }
  const fb = card.querySelector('.math-feedback');
  fb.innerHTML = '';
  if (ch.ok) {
    r.correct++;
    sfx.success();
    fb.appendChild(el('p', 'math-fb ok', ['맞았어요! 🎉', '정확해요! ⭐', '바로 그거예요! 👍'][r.at % 3]));
    // 맞혀도 풀이는 접어 두고 볼 수 있게 — "왜 맞았는지"도 개념이다
    if (q.solve) {
      const t = el('button', 'btn math-solve-toggle', '📖 풀이 보기');
      t.type = 'button';
      t.addEventListener('click', () => { t.replaceWith(solveCard(q, ch)); });
      fb.appendChild(t);
    }
  } else {
    sfx.wrong();
    if (ch.tag) r.missTags.push(ch.tag);
    const p = el('p', 'math-fb no');
    const showTag = ch.tag && !META_TAGS.has(ch.tag);
    p.appendChild(document.createTextNode(showTag ? `아쉬워요 — 이건 "${ch.tag}"이에요.` : '아쉬워요.'));
    fb.appendChild(p);
    fb.appendChild(solveCard(q, ch)); // 틀린 직후가 가르치기 제일 좋은 순간 — 이름표만 붙이고 넘어가지 않는다 (진우, 2026-09-21)
  }
  r.answers.push({ concept: q.concept, correct: !!ch.ok, kind: q.kind, chosen: ch.text, ...(ch.ok || !ch.tag ? {} : { tag: ch.tag }) }); // 얼굴·오개념까지 — 📒 일지용
  const canTwin = !ch.ok && q.solve && (q.kind === 'calc' || q.kind === 'misread') && r.mode !== 'diag' && q.key;
  const next = el('button', 'btn btn-primary btn-big-wide', canTwin ? '알겠어요, 비슷한 문제 하나 더 →' : r.at + 1 < r.qs.length ? '다음 →' : '결과 보기');
  next.type = 'button';
  next.addEventListener('click', () => { if (canTwin) startTwin(); else advance(); });
  fb.appendChild(next);
  next.focus();
}

/** 다음 문항으로 (쌍둥이가 있었으면 지운다) */
function advance() {
  const r = ui.round;
  if (!r) return;
  r.twin = null;
  r.at += 1;
  if (r.at < r.qs.length) renderQuestion(); else finishRound();
}

/**
 * 📖 풀이 카드 — 보기 아래에 펼쳐진다.
 *   ❌ 내 답 / ✔ 정답 → 1️⃣ 왜 틀렸나(이 오개념을 이 숫자로) + 내 답·정답 막대 비교 → 2️⃣ 이렇게 풀어요 + 정답 그림 → 3️⃣ 다음에 기억할 것
 * 사람이 쓴 ③⭐ 문항은 아직 풀이가 없어 정답과 개념 한 줄만 (2차에서 채운다).
 */
function solveCard(q, ch) {
  const card = el('div', 'math-solve');
  const okCh = q.choices.find((x) => x.ok) || { text: '' };
  const head = el('div', 'math-solve-head');
  if (!ch.ok) { const mine = el('span', 'mine'); mine.appendChild(document.createTextNode('❌ 내 답: ')); mine.appendChild(richNode(ch.text)); head.appendChild(mine); }
  const ans = el('span', 'ans'); ans.appendChild(document.createTextNode('✔ 정답: ')); ans.appendChild(richNode(okCh.text)); head.appendChild(ans);
  card.appendChild(head);
  const s = q.solve;
  const c = FRACTION.find((x) => x.id === q.concept);
  if (!s) {
    if (c && c.idea) { const p = el('p', 'math-solve-p'); p.appendChild(document.createTextNode('💡 ')); p.appendChild(richNode(c.idea)); card.appendChild(p); }
    return card;
  }
  if (!ch.ok) {
    const why = s.why[ch.tag] || s.whyAny || (ch.tag && !META_TAGS.has(ch.tag) ? `이 답은 "${ch.tag}" 실수예요.` : '');
    if (why) {
      card.appendChild(el('div', 'math-solve-h', '1️⃣ 왜 틀렸나'));
      const p = el('p', 'math-solve-p'); p.appendChild(richNode(why)); card.appendChild(p);
    }
    // 내 답과 정답을 막대로 나란히 — 글보다 먼저 눈에 들어온다 (분수 모양 답이고 너무 크지 않을 때만)
    if (s.compare) {
      const a = fracOf(ch.text); const b = fracOf(okCh.text);
      if (a && b && a.d <= 12 && b.d <= 12 && a.n / a.d <= 3 && b.n / b.d <= 3) {
        const row = el('div', 'math-compare');
        row.appendChild(compareBox('내 답', ch.text, barSvg(a.d, a.n), 'no'));
        row.appendChild(compareBox('정답', okCh.text, barSvg(b.d, b.n), 'ok'));
        card.appendChild(row);
      }
    }
  }
  card.appendChild(el('div', 'math-solve-h', ch.ok ? '📖 이렇게 풀어요' : '2️⃣ 이렇게 풀어요'));
  const ol = el('ol', 'math-solve-steps');
  for (const st of s.steps) { const li = el('li'); li.appendChild(richNode(st)); ol.appendChild(li); }
  card.appendChild(ol);
  if (s.figure) card.appendChild(svgBox(s.figure, 'math-fig'));
  const rule = s.rule || (c && c.idea) || '';
  if (rule) {
    card.appendChild(el('div', 'math-solve-h', ch.ok ? '💡 기억할 것' : '3️⃣ 다음에 기억할 것'));
    const p = el('p', 'math-solve-p rule'); p.appendChild(richNode(rule)); card.appendChild(p);
  }
  return card;
}

/** "5/6" · "3" · "1 2/3" → {n, d} (대분수는 가분수로). 아니면 null */
function fracOf(text) {
  const s = String(text || '').trim();
  let m;
  if ((m = /^(\d+) (\d+)\/(\d+)$/.exec(s))) return { n: Number(m[1]) * Number(m[3]) + Number(m[2]), d: Number(m[3]) };
  if ((m = /^(\d+)\/(\d+)$/.exec(s))) return { n: Number(m[1]), d: Number(m[2]) };
  if ((m = /^(\d+)$/.exec(s))) return { n: Number(m[1]), d: 1 };
  return null;
}

function compareBox(label, text, svg, cls) {
  const box = el('div', `math-compare-box ${cls}`);
  const cap = el('div', 'cap'); cap.appendChild(document.createTextNode(`${label} `)); cap.appendChild(richNode(text)); box.appendChild(cap);
  box.appendChild(svgBox(svg, 'math-fig'));
  return box;
}

/**
 * 🔁 쌍둥이 문제 — 풀이를 읽은 직후 같은 틀에 숫자만 다른 문제 하나. 읽기만 하면 "알 것 같은" 느낌으로 끝나서,
 * 바로 풀어 봐야 진짜 잡혔는지 그 자리에서 드러난다. 편의 통과 여부는 안 바뀐다("틀린 게 있으면 안다가 아니다") —
 * 맞히면 ⚡ 조금과 일지에 "바로 고침"(fx)만 남는다.
 */
function startTwin() {
  const r = ui.round;
  if (!r) return;
  const q = r.qs[r.at];
  const seed = ((Date.now() % 1000000) | 0) + 17;
  const tq = makeQuestion(q.concept, q.kind, seed, { ...ui.opts, want: q.key });
  if (!tq) { advance(); return; }
  r.twin = { q: tq, of: r.at, answered: false };
  renderTwin();
}

function renderTwin() {
  const r = ui.round;
  if (!r || !r.twin) return;
  const t = r.twin;
  const q = t.q;
  const m = clearMain();
  const card = el('section', 'math-card math-q math-twin');
  const top = el('div', 'math-q-top');
  top.appendChild(el('span', 'math-eyebrow', `🔁 비슷한 문제 · ${nameOf(q.concept)}`));
  top.appendChild(el('span', 'math-kind', '이번엔 맞혀 봐요'));
  card.appendChild(top);
  const qt = el('p', 'math-qt'); qt.appendChild(richNode(q.q)); card.appendChild(qt);
  if (q.figure) card.appendChild(svgBox(q.figure));
  if (q.expr) { const ex = el('p', 'math-expr'); ex.appendChild(richNode(q.expr)); card.appendChild(ex); }
  const list = el('div', 'math-choices');
  q.choices.forEach((ch, i) => {
    const b = el('button', 'math-choice');
    b.type = 'button';
    b.dataset.i = String(i);
    b.appendChild(el('span', 'math-choice-no', ['①', '②', '③', '④'][i]));
    const tx = el('span', 'math-choice-text'); tx.appendChild(richNode(ch.text)); b.appendChild(tx);
    b.addEventListener('click', () => answerTwin(i, list, card));
    list.appendChild(b);
  });
  card.appendChild(list);
  card.appendChild(el('div', 'math-feedback'));
  m.appendChild(card);
}

function answerTwin(i, list, card) {
  const r = ui.round;
  if (!r || !r.twin || r.twin.answered) return;
  const t = r.twin;
  t.answered = true;
  const q = t.q;
  const ch = q.choices[i];
  const okIdx = q.choices.findIndex((x) => x.ok);
  for (const b of list.querySelectorAll('.math-choice')) {
    b.disabled = true;
    const k = Number(b.dataset.i);
    if (k === okIdx) b.classList.add('ok');
    if (k === i && !ch.ok) b.classList.add('no');
  }
  const a = r.answers[t.of];
  if (a) a.fixed = !!ch.ok;
  const fb = card.querySelector('.math-feedback');
  fb.innerHTML = '';
  if (ch.ok) {
    r.fixed = (r.fixed || 0) + 1;
    sfx.success();
    fb.appendChild(el('p', 'math-fb ok', `고쳤어요! 이제 알겠죠? ⚡+${REWARD.fix.xp}`));
  } else {
    sfx.wrong();
    if (ch.tag) r.missTags.push(ch.tag);
    fb.appendChild(el('p', 'math-fb no', '아직 헷갈리나 봐요. 풀이를 한 번 더 읽어요.'));
    fb.appendChild(solveCard(q, ch));
  }
  const next = el('button', 'btn btn-primary btn-big-wide', t.of + 1 < r.qs.length ? '다음 →' : '결과 보기');
  next.type = 'button';
  next.addEventListener('click', () => { r.at = t.of; advance(); });
  fb.appendChild(next);
  next.focus();
}

/**
 * 한 편 끝 — 저장 → 보상 → 결과 화면 → (처음 통과면) 🎯 잡기.
 *
 * ★ 저장이 끝나기 전에는 `ui.round`를 비우지 않는다 (Codex 리뷰 #10: 저장이 실패하면 "기록하는 중…"에 갇혔다).
 *   실패하면 "다시 저장" 버튼으로 같은 결과를 다시 넣는다. 보상은 저장이 된 뒤에만 준다.
 * ★ await 뒤마다 `ui.run`을 본다 (Codex 리뷰 #5: 저장 중에 ←로 나갔다 들어오면 옛 결과가 새 화면을 덮고,
 *   후보를 받는 사이에 나가면 🎯 잡기가 홈이나 영어 위에 떴다). 진도·보상은 이미 저장됐으니 그리기만 건너뛴다.
 */
async function finishRound() {
  const r = ui.round;
  if (!r || r.saving) return;
  const run = ui.run;
  const today = todayKey();
  const m = clearMain();
  m.appendChild(el('p', 'math-loading', '기록하는 중…'));
  r.saving = true;

  let state = null;
  let placed = null;
  let result = null;
  try {
    if (r.mode === 'diag') {
      state = await updateMath((s) => { placed = applyPlacement(s, r.answers, today, 'fraction', r.missTags); });
    } else {
      const qs = r.answers.map((a) => ({ k: a.kind, ok: a.correct ? 1 : 0, ...(a.tag ? { tag: a.tag } : {}), ...(a.fixed === undefined ? {} : { fx: a.fixed ? 1 : 0 }) }));
      state = await updateMath((s) => { result = applyRound(s, r.id, { correct: r.correct, total: r.qs.length, missTags: r.missTags, qs, mode: r.mode }, today); });
    }
  } catch (err) {
    r.saving = false;
    if (run !== ui.run) return;
    clearMain();
    const card = el('section', 'math-card');
    card.appendChild(el('h2', '', '앗, 기록을 저장하지 못했어요'));
    card.appendChild(el('p', 'math-p', `푼 건 그대로 있어요. 한 번 더 눌러 주세요. (${String((err && err.message) || err)})`));
    const retry = el('button', 'btn btn-primary btn-big-wide', '💾 다시 저장');
    retry.type = 'button';
    retry.addEventListener('click', () => finishRound());
    card.appendChild(retry);
    m.appendChild(card);
    return;
  }
  ui.round = null; // 저장이 됐으니 이제 비운다

  // 보상은 화면과 상관없이 지급 (나가 있어도 번 것은 번 것)
  const rw = r.mode === 'diag'
    ? { xp: r.correct * REWARD.diag.xp, coin: r.correct * REWARD.diag.coin, catchOnce: false }
    : roundReward(result, r.correct); // practice 여부는 저장소가 판정한 result에서 온다
  rw.xp += (r.fixed || 0) * REWARD.fix.xp; // 🔁 쌍둥이로 바로 고친 문항 (통과 여부와 무관)
  const g = gainXp(rw.xp);
  const c = gainCoins(rw.coin).gained;
  applyDailyDelta(today, r.mode === 'diag' ? { mathQ: r.qs.length, mathOk: r.correct } : { mathQ: r.qs.length, mathOk: r.correct, mathRounds: 1 }).catch(() => {});
  updateChip();
  if (g.leveledUp) sfx.levelUp();
  if (run !== ui.run) return; // 그 사이에 다른 화면으로 갔다 — 그리지 않는다
  clearMain(); // await 뒤에 한 번 더 비운다 — "기록하는 중…"이 결과 위에 남지 않게

  if (r.mode === 'diag') {
    const card = el('section', 'math-card');
    card.appendChild(el('h2', '', `📏 ${r.qs.length}개 중 ${r.correct}개 맞았어요`));
    card.appendChild(el('p', 'math-p', placed && placed.knownIds.length
      ? `${placed.knownIds.length}개 개념은 벌써 아는 것 같아요 — 며칠 뒤에 한 번씩 다시 확인할게요.`
      : '처음부터 차근차근 가요.'));
    const startP = el('p', 'math-p big');
    startP.textContent = `여기서 시작! → ${nameOf(placed ? placed.startId : FRACTION[0].id)}`;
    card.appendChild(startP);
    card.appendChild(el('p', 'math-reward', `⚡+${g.gained} 💰+${c}`));
    const b = el('button', 'btn btn-primary btn-big-wide', '사다리 보기');
    b.type = 'button';
    b.addEventListener('click', () => renderLadder(state));
    card.appendChild(b);
    m.appendChild(card);
    return;
  }

  const card = el('section', 'math-card math-result');
  const all = result.passed;
  card.appendChild(el('h2', '', all
    ? (result.crowned ? '👑 이해 완료!' : result.first ? '🎉 이 개념, 이제 알아요!' : result.practice ? '✅ 다 맞았어요!' : '✅ 다시 확인해도 맞았어요!')
    : `${r.qs.length}개 중 ${r.correct}개 맞았어요`));
  card.appendChild(el('p', 'math-p', all
    ? (result.crowned ? `${nameOf(r.id)} — 다섯 번 확인을 다 통과했어요. 정말 이해한 거예요.`
      : result.first ? '내일 한 번 더 물어볼게요. 며칠 뒤에도 맞으면 👑!'
        : result.practice ? '연습이라 👑 확인은 안 올라가요 — 다음 확인 날에 다시 물어볼게요.'
          : '다음 확인은 며칠 뒤예요.')
    : (result.practice
      ? '연습이라 기록은 그대로예요. 이야기를 다시 읽어 봐요.'
      : '아직 조금 헷갈리나 봐요. 이야기를 다시 읽고 한 번 더 해 봐요 — 틀린 게 있으면 "안다"가 안 돼요.')));
  const shown = kidTags(r.missTags);
  if (shown.length) {
    const tags = el('p', 'math-tags');
    tags.textContent = `🤔 이번에 헷갈린 것: ${shown.join(' · ')}`;
    card.appendChild(tags);
  }
  card.appendChild(el('p', 'math-reward', `⚡+${g.gained} 💰+${c}${rw.catchOnce ? ' 🎯 몬스터볼 1개!' : ''}${g.leveledUp ? ` 🎉 Lv.${g.to}!` : ''}`));

  const row = el('div', 'math-actions');
  if (!all) {
    const again = el('button', 'btn btn-primary btn-big-wide', '🤔 한 번 더');
    again.type = 'button';
    const wrong = r.answers.map((a, i) => ({ a, q: r.qs[i] })).filter((x) => x.a && !x.a.correct && x.q).map((x) => ({ q: x.q, chosen: x.q.choices.find((ch) => ch.text === x.a.chosen) || { text: x.a.chosen || '', ok: false, tag: x.a.tag } }));
    again.addEventListener('click', () => startRound(r.id, r.mode === 'review' ? 'review' : 'learn', { again: true, wrong }));
    row.appendChild(again);
  }
  const back = el('button', all ? 'btn btn-primary btn-big-wide' : 'btn btn-big-wide', '사다리로');
  back.type = 'button';
  back.addEventListener('click', () => renderLadder(state));
  row.appendChild(back);
  card.appendChild(row);
  m.appendChild(card);

  // 🎯 처음 통과한 개념은 몬스터볼 한 번 — 영어 퍼즐 정답과 같은 보상 경로
  if (rw.catchOnce) {
    const candidates = await catchCandidates(4);
    if (run !== ui.run) return; // 후보를 받는 사이에 나갔다 — 다른 화면 위에 띄우지 않는다
    if (candidates.length) {
      openCatch({
        candidates, xpGain: g.gained, coinGain: c, levelInfo: g.info, levelUp: g.leveledUp ? g.to : 0,
        ballCounts: inventory(),
        attempt: (id, opts) => catchAttempt(id, Math.random, opts),
        onDone: () => updateChip(),
      });
    }
  }
}

// ───────────────────── 배선 ─────────────────────

export function initMath({ showView }) {
  ui.showView = showView;
  const back = $('btn-math-back');
  if (back) back.addEventListener('click', () => { ui.round = null; ui.run++; showView('home'); });
}

/** 홈에서 진우가 본 영상 세계를 미리 알고 싶을 때 (표시용) */
export function worldLabels() {
  const w = (ui.opts && ui.opts.worlds) || { pokemon: [] };
  return Object.keys(w).map((k) => WORLDS[k] ? WORLDS[k].label : k);
}
