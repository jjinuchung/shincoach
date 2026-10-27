// 📚 국어 화면의 두 탭 — 🔤 낱말(오늘의 낱말) · 📘 단원(국어 단원 지도 — 5학년 · v298부터 4학년 2학기를 맨 위에) (2026-10-11, 아버님 "니 제안대로 하자")
// 규칙은 korwords.js·korunits.js(순수), 저장은 xp.korWordsFinish(한 트랜잭션 — 낱말 칸과 💰·🎯·🟩가 같이).
// koreanview가 탭 막대·🎯 잡기 단추·🥚 알 칸·글 열기를 ctx로 건넨다(서로 import하면 돌고 돈다)
//  · 판정은 낱말마다 **처음 고른 것** — 틀린 낱말은 그 판 끝에 한 번 더 보지만(연습) 칸은 처음 것으로 옮긴다
//  · 판 중간에 나가면(🎒·📊) 그대로 이어서, "← 그만하기"를 두 번 누르면 저장 없이 끝
import { DECKS, DECK_ORDER, NEW_PER_DAY, WORD_COINS, PERFECT_MIN, MASTER_BOX, allWords, planToday, makeQuestion, deckStats, wordsToday, isOpen } from './korwords.js';
import { unitsOf, unitLabel, unitProgress, TERMS, TERM_LABEL } from './korunits.js';
import { korWordsFinish, korWordsMap, korWordDayMap, korDoneMap } from './xp.js';
import { starsOf, circled } from './korean.js';
import { guardStart } from './timeup.js';
import { sfx, unlock as sfxUnlock } from './sfx.js';
import { korGainXp } from './korxp.js'; // ⚡ 국어 경험치 (v327)

export const WORDS_URL = './coach/korean/words.json';
export const UNITS_URL = './coach/korean/units.json';

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

// wordsData·unitsData: 받은 원고 · all: 모든 낱말(📖 포함 — 카드가 바뀌면 다시) · ws: 지금 푸는 판
const S = { wordsData: null, unitsData: null, all: null, allFor: null, loadErr: '', ws: null, live: null };
// live = 읽어 주기 알림 한 칸 — 다시 그려도 같은 칸을 옮겨 단다(새로 만든 칸은 읽어 주지 않을 수 있다, Codex 50차 #9)

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
/** 원고 받기 (한 번) — 📖 낱말은 글 카드에서 오므로 카드가 바뀌면 다시 모은다 */
async function loadData(ctx) {
  try {
    if (!S.wordsData) S.wordsData = await fetchJson(WORDS_URL);
    if (!S.unitsData) S.unitsData = await fetchJson(UNITS_URL);
    S.loadErr = '';
  } catch (e) {
    S.loadErr = String((e && e.message) || e);
  }
  const cards = ctx.cards();
  if (S.wordsData && (S.allFor !== cards || !S.all)) { S.all = allWords(S.wordsData, cards); S.allFor = cards; }
  return !!(S.wordsData && S.unitsData);
}
function loadErrEl(box, ctx) {
  const e = el('div', 'kor-empty');
  e.appendChild(el('p', '', '낱말을 불러오지 못했어요 — 인터넷을 확인하고 다시 열어 주세요'));
  if (S.loadErr) e.appendChild(el('p', 'kor-small', S.loadErr));
  const again = el('button', 'btn btn-primary', '다시 불러오기');
  again.type = 'button';
  again.addEventListener('click', () => { S.wordsData = null; S.unitsData = null; ctx.rerender(); });
  e.appendChild(again);
  box.appendChild(e);
}

/** 지금 🔤 낱말 판을 푸는 중인가 (koreanview가 다시 그릴 때 본다) */
export function inSession() {
  return !!S.ws;
}

// ───────────────────── 🔤 낱말 탭 ─────────────────────

/** 오늘 보상 말 (순수) — wordsToday 값(0·1·2) → 한 줄 */
export function todayLine(today) {
  if (today >= 2) return '오늘의 낱말 끝 ✅ 🟩까지 받았어요';
  if (today === 1) return '오늘의 낱말 끝 ✅ — 더 해도 복습 날짜는 그대로 쌓여요';
  return `오늘 처음 끝내면 💰${WORD_COINS} · 🎯 국어 포켓몬 잡기 1번 · 낱말 ${PERFECT_MIN}개 이상을 모두 한 번에 맞히면 🟩 국어스톤`;
}

export async function renderWordsTab(box, ctx) {
  if (!(await loadData(ctx))) { loadErrEl(box, ctx); return; }
  const words = S.all;
  const states = korWordsMap();
  const done = korDoneMap();
  const now = Date.now();
  const plan = planToday(words, states, done, now);
  const head = el('section', 'kor-head');
  head.appendChild(el('h2', 'kor-h', '🔤 오늘의 낱말'));
  head.appendChild(el('p', 'kor-intro', '국어 시간에 쓰는 말, 관용 표현, 속담, 사자성어, 글에서 만난 낱말을 익혀요. 맞힌 낱말은 다음 날 → 3일 → 7일 → 14일 뒤에 다시 나오고, 끝까지 맞히면 ⭐ 익힌 낱말이 돼요.'));
  head.appendChild(el('p', 'kor-count', todayLine(wordsToday(korWordDayMap(), now))));
  const start = (extra) => guardStart('korean', () => startSession(ctx, extra));
  if (plan.length) {
    const reviews = plan.filter((p) => states[p.id]).length;
    const b = el('button', 'btn btn-primary btn-big-wide kor-wstart', `🔤 오늘의 낱말 시작 (${plan.length}개${reviews ? ` · 복습 ${reviews}` : ''})`);
    b.type = 'button';
    b.addEventListener('click', () => start(0));
    head.appendChild(b);
  } else {
    head.appendChild(el('p', 'kor-intro', '오늘 복습할 낱말을 다 했어요 — 내일 또 만나요'));
    const more = planToday(words, states, done, now, NEW_PER_DAY);
    if (more.length) {
      const b = el('button', 'btn kor-wstart', `🔤 새 낱말 ${more.length}개 더 배우기`);
      b.type = 'button';
      b.addEventListener('click', () => start(NEW_PER_DAY));
      head.appendChild(b);
    } else head.appendChild(el('p', 'kor-intro', '열린 낱말을 모두 배웠어요! 📚 글을 더 읽으면 📖 낱말이 열려요'));
  }
  const cb = ctx.catchBtnEl();
  if (cb) head.appendChild(cb);
  box.appendChild(head);
  const decks = el('div', 'kor-decks');
  for (const s of deckStats(words, states, done)) {
    const d = DECKS[s.deck];
    const row = el('div', 'kor-deck');
    row.appendChild(el('span', 'kor-deck-name', `${d.icon} ${d.ko}`));
    row.appendChild(el('span', 'kor-deck-star', `⭐ ${s.mastered} / ${s.total}`));
    const sub = [s.learning ? `배우는 중 ${s.learning}` : '', s.total > s.open ? `🔒 ${s.total - s.open}개는 글을 읽으면 열려요` : ''].filter(Boolean).join(' · ');
    if (sub) row.appendChild(el('span', 'kor-deck-sub', sub));
    decks.appendChild(row);
  }
  box.appendChild(decks);
  box.appendChild(wordListEl(words, states, done));
}

/** 📋 낱말 목록 — 묶음마다 ⭐ 익힘 · 🌱 배우는 중 · ○ 아직 · 🔒 잠김 */
function wordListEl(words, states, done) {
  const det = el('details', 'kor-wlist');
  det.appendChild(el('summary', '', '📋 낱말 목록 보기'));
  for (const deck of DECK_ORDER) {
    const d = DECKS[deck];
    det.appendChild(el('p', 'kor-wlist-h', `${d.icon} ${d.ko}`));
    const row = el('div', 'kor-chips');
    for (const w of words.filter((x) => x.deck === deck)) {
      const st = states[w.id];
      const mark = !isOpen(w, done) ? '🔒' : !st ? '○' : st.box >= MASTER_BOX ? '⭐' : '🌱';
      const chip = el('span', `kor-chip${mark === '⭐' ? ' is-star' : ''}${mark === '🔒' ? ' is-lock' : ''}`, `${mark} ${mark === '🔒' ? '?' : w.w}`);
      if (mark !== '🔒') chip.title = w.mean;
      row.appendChild(chip);
    }
    det.appendChild(row);
  }
  return det;
}

function startSession(ctx, extra) {
  if (!S.all) return;
  sfxUnlock();
  const byId = new Map(S.all.map((w) => [w.id, w]));
  const states = korWordsMap();
  const plan = planToday(S.all, states, korDoneMap(), Date.now(), extra);
  // 판을 시작할 때 낱말마다 마지막으로 푼 때 — 저장할 때 그 사이 다른 판이 옮겼으면 연습으로 (Codex 50차 #4)
  const from = new Map(plan.map((x) => [x.id, (states[x.id] && states[x.id].at) || 0]));
  const items = [];
  for (const p of plan) {
    const w = byId.get(p.id);
    const q = makeQuestion(w, p.kind, S.all) || makeQuestion(w, 'mean', S.all);
    if (q) items.push({ id: p.id, kind: q.kind, q, retry: false });
  }
  if (!items.length) { ctx.rerender(); return; }
  S.ws = { items, i: 0, first: new Map(), from, picked: null, result: null, saving: false, egg: null, quitAsk: false, focus: 'opt' };
  renderSession(ctx);
  window.scrollTo(0, 0);
}

function wordOf(id) {
  return (S.all || []).find((w) => w.id === id) || null;
}

/** 빈칸 문장 — ___ 자리를 빈칸 상자로 (답을 고른 뒤에는 그 낱말을 굵게) */
function sentenceEl(text, fill) {
  const p = el('p', 'kor-wsent');
  const [a, b] = String(text).split('___');
  p.appendChild(document.createTextNode(a));
  p.appendChild(el('span', `kor-blank${fill ? ' is-fill' : ''}`, fill || '　　　'));
  p.appendChild(document.createTextNode(b || ''));
  return p;
}

/** 맞힌·틀린 뒤 낱말 풀이 — 뜻 · 쓰임(📘 빈칸을 채운 문장 · 🗣️·🐢·🀄 어울리는 상황 · 📖 나온 글) · 🀄 한자와 글자 뜻(v255) */
function noteEl(w) {
  const note = el('div', 'kor-note');
  const p = el('p');
  p.appendChild(el('b', '', w.w));
  p.appendChild(document.createTextNode(` — ${w.mean}`));
  note.appendChild(p);
  if (w.deck === 'concept' && w.ex) note.appendChild(sentenceEl(w.ex, w.w));
  else if (DECKS[w.deck] && DECKS[w.deck].sit && w.ex) note.appendChild(el('p', 'kor-note-ex', `이럴 때: ${w.ex}`));
  else if (w.deck === 'passage' && w.src) note.appendChild(el('p', 'kor-note-ex', `「${w.title}」에서: ${w.src}`));
  if (w.han && w.lit) note.appendChild(el('p', 'kor-note-ex kor-note-han', `🀄 ${w.han} — 글자 뜻: ${w.lit}`));
  return note;
}

export function renderSession(ctx) {
  const main = ctx.main();
  const ws = S.ws;
  if (!main || !ws) return;
  main.textContent = '';
  const wrap = el('section', 'kor-wsess');
  const top = el('div', 'kor-wtop');
  const n = ws.items.length;
  if (ws.i < n && !ws.saving) {
    const quit = el('button', 'btn btn-small kor-wquit', ws.quitAsk ? '정말 그만할까요? (푼 것은 저장 안 돼요)' : '← 그만하기');
    quit.type = 'button';
    quit.addEventListener('click', () => {
      if (!ws.first.size || ws.quitAsk) { S.ws = null; ctx.toWords(); return; }
      ws.quitAsk = true;
      ws.focus = 'quit';
      renderSession(ctx);
    });
    top.appendChild(quit);
  }
  // 문제 수 — 틀린 낱말이 끝에 한 번 더 나오면 늘어난다("낱말 2 / 6"은 낱말 수와 헷갈렸다, Codex 50차 #9)
  top.appendChild(el('span', 'kor-q-no', `문제 ${Math.min(ws.i + 1, n)} / ${n}`));
  wrap.appendChild(top);
  if (!S.live) { S.live = el('p', 'kor-live'); S.live.setAttribute('aria-live', 'polite'); }
  const live = S.live;
  if (ws.i >= n) {
    const done = finishEl(ctx);
    wrap.appendChild(done);
    wrap.appendChild(live);
    main.appendChild(wrap);
    live.textContent = (done.querySelector('.kor-done-title') || {}).textContent || '';
    // 끝내기 단추가 사라져 초점을 잃지 않게 — 끝 카드 제목으로
    const t = done.querySelector('.kor-done-title');
    if (t && ws.focus && ws.result) { // 저장하는 중 카드는 곧 바뀐다 — 결과 카드가 나오면 그 제목으로
      t.setAttribute('tabindex', '-1');
      try { t.focus({ preventScroll: true }); } catch { /* 초점은 없어도 */ }
      ws.focus = '';
    }
    return;
  }
  const it = ws.items[ws.i];
  const w = wordOf(it.id);
  const q = it.q;
  const card = el('div', 'kor-q kor-wq');
  const head = el('div', 'kor-q-head');
  head.appendChild(el('span', 'kor-q-skill', `${DECKS[w.deck].icon} ${DECKS[w.deck].ko}${it.retry ? ' · 🔁 한 번 더' : ''}`));
  card.appendChild(head);
  if (q.kind === 'mean') card.appendChild(el('p', 'kor-wbig', w.w));
  card.appendChild(el('p', 'kor-q-text', q.prompt));
  if (q.kind === 'use') card.appendChild(DECKS[w.deck].sit ? el('p', 'kor-wsit', q.sentence) : sentenceEl(q.sentence, ws.picked !== null ? w.w : ''));
  const opts = el('div', 'kor-opts');
  q.opts.forEach((o, k) => {
    const picked = ws.picked === k;
    const cls = ws.picked === null ? '' : o.ok ? ' is-ok' : picked ? ' is-no' : ' is-dim';
    const b = el('button', `kor-opt${cls}`);
    b.type = 'button';
    b.disabled = ws.picked !== null;
    b.appendChild(el('span', 'kor-opt-mark', circled(k + 1)));
    b.appendChild(el('span', '', o.t));
    b.addEventListener('click', () => pickOpt(ctx, k));
    opts.appendChild(b);
  });
  card.appendChild(opts);
  const fb = el('p', 'kor-fb');
  if (ws.picked !== null) {
    const right = q.opts[ws.picked].ok;
    fb.classList.add(right ? 'is-ok' : 'is-no');
    fb.textContent = right ? '맞아요!' : `아쉬워요 — 답은 "${q.opts.find((o) => o.ok).t}"${it.retry ? '' : ' (이 낱말은 끝에 한 번 더 나와요)'}`;
    card.appendChild(fb);
    card.appendChild(noteEl(w));
    const next = el('button', 'btn btn-primary kor-next', ws.i + 1 < n ? '다음 →' : '끝내기');
    next.type = 'button';
    next.addEventListener('click', () => nextItem(ctx));
    card.appendChild(next);
  } else card.appendChild(fb);
  wrap.appendChild(card);
  wrap.appendChild(live);
  main.appendChild(wrap);
  live.textContent = fb.textContent;
  const focusTo = ws.focus;
  ws.focus = '';
  const t = focusTo === 'next' ? card.querySelector('.kor-next') : focusTo === 'opt' ? card.querySelector('.kor-opt:not(:disabled)') : focusTo === 'quit' ? wrap.querySelector('.kor-wquit') : null;
  if (t) { try { t.focus({ preventScroll: true }); } catch { /* 초점은 없어도 */ } }
}

function pickOpt(ctx, k) {
  const ws = S.ws;
  if (!ws || ws.picked !== null || ws.i >= ws.items.length) return;
  const it = ws.items[ws.i];
  ws.picked = k;
  ws.quitAsk = false;
  const ok = !!it.q.opts[k].ok;
  if (!ws.first.has(it.id)) ws.first.set(it.id, ok); // 판정은 처음 고른 것 — 끝에 한 번 더 보는 것은 연습
  if (!ok && !it.retry) {
    const w = wordOf(it.id);
    const q = makeQuestion(w, it.kind, S.all) || makeQuestion(w, 'mean', S.all);
    if (q) ws.items.push({ id: it.id, kind: q.kind, q, retry: true });
  }
  try { if (ok) sfx.ding(); else sfx.wrong(); } catch { /* 소리는 없어도 */ }
  ws.focus = 'next';
  renderSession(ctx);
}

function nextItem(ctx) {
  const ws = S.ws;
  if (!ws || ws.picked === null) return;
  ws.i++;
  ws.picked = null;
  ws.focus = 'opt';
  if (ws.i >= ws.items.length) { ws.focus = 'done'; finishSession(ctx); return; }
  renderSession(ctx);
  window.scrollTo(0, 0);
}

async function finishSession(ctx) {
  const ws = S.ws;
  if (!ws || ws.saving) return;
  ws.saving = true;
  ws.result = null;
  renderSession(ctx);
  const answers = [...ws.first.entries()].map(([id, ok]) => ({ id, ok, from: ws.from.get(id) || 0 }));
  let res;
  try { res = await korWordsFinish(answers, (S.all || []).map((w) => w.id)); } catch { res = { ok: false, why: 'save' }; }
  const live = S.ws === ws; // 저장 중엔 그만두기를 숨기지만 — 화면이 바뀌었어도 🥚 칸은 채운다 (Codex 50차 #6)
  if (live) {
    ws.saving = false;
    ws.result = res;
    renderSession(ctx);
  }
  if (res && res.ok) {
    korGainXp(res.xp); // ⚡ (v327) — 칸을 옮긴 판만(규칙이 정함) · 화면이 바뀌었어도 준다
    if (live && (res.stone || (res.mastered && res.mastered.length))) { try { sfx.success(); } catch { /* 소리는 없어도 */ } }
    const egg = await ctx.tickKorDay(); // 🥚 오늘의 낱말을 끝낸 날 = 국어 알 하루 칸
    if (S.ws === ws && egg && egg.ok) { ws.egg = egg; renderSession(ctx); }
  }
}

/** 판을 끝낸 말 (순수) — korWordsFinish 결과 → { title, lines } */
export function wordsFinishText(res, nameOf = (id) => id) {
  if (!res || !res.ok) {
    if (res && res.why === 'empty') return { title: '저장할 낱말이 없어요', lines: ['🔤 낱말 탭으로 돌아가 다시 시작해 주세요'] };
    return { title: '저장이 안 됐어요', lines: ['[다시 저장하기]를 눌러 주세요 — 푼 것은 그대로예요'] };
  }
  const lines = [`한 번에 맞힌 낱말 ${res.okN} / ${res.n}`];
  if (res.first) lines.push(`💰 +${res.coins} · 🎯 국어 포켓몬 잡기 1번${res.stone ? ' · 🟩 국어스톤 +1 (모두 한 번에 맞혔어요!)' : ''}`);
  else lines.push('오늘 보상은 이미 받았어요 — 푼 낱말은 복습 날짜에 들어갔어요');
  if (res.mastered && res.mastered.length) lines.push(`⭐ 새로 익힌 낱말: ${res.mastered.map(nameOf).join(', ')}`);
  return { title: res.first ? '🔤 오늘의 낱말 끝!' : '🔤 낱말 연습 끝!', lines };
}

function finishEl(ctx) {
  const ws = S.ws;
  const box = el('div', 'kor-done');
  if (ws.saving || !ws.result) { box.appendChild(el('p', 'kor-done-title', '저장하는 중…')); return box; }
  const res = ws.result;
  const t = wordsFinishText(res, (id) => (wordOf(id) || { w: id }).w);
  box.classList.toggle('is-star', !!(res.ok && (res.stone || res.first)));
  box.appendChild(el('p', 'kor-done-icon', '🔤'));
  box.appendChild(el('p', 'kor-done-title', t.title));
  for (const line of t.lines) box.appendChild(el('p', 'kor-done-line', line));
  if (res.ok && res.xp > 0) box.appendChild(el('p', 'kor-done-line kor-xp', `⚡ 경험치 +${res.xp}`)); // v327
  const eg = ctx.eggLine(ws.egg);
  if (eg) box.appendChild(el('p', 'kor-done-line kor-egg', eg));
  const row = el('div', 'kor-done-btns');
  if (!res.ok && res.why !== 'empty') {
    const again = el('button', 'btn btn-primary', '다시 저장하기');
    again.type = 'button';
    again.addEventListener('click', () => finishSession(ctx));
    row.appendChild(again);
  }
  const back = el('button', `btn${res.ok ? ' btn-primary' : ''}`, '🔤 낱말로');
  back.type = 'button';
  back.addEventListener('click', () => { S.ws = null; ctx.toWords(); });
  row.appendChild(back);
  const cards = el('button', 'btn', '📚 도감으로');
  cards.type = 'button';
  cards.addEventListener('click', () => { S.ws = null; ctx.toCards(); });
  row.appendChild(cards);
  box.appendChild(row);
  const cb = ctx.catchBtnEl(); // 🎯 그날 처음 끝냈으면 국어 포켓몬 잡기
  if (cb) box.appendChild(cb);
  if (res.ok && ctx.addCell) ctx.addCell(box); // 🟢 숨은 지가르데 셀 (v352)
  return box;
}

// ───────────────────── 📘 단원 탭 ─────────────────────

export async function renderUnitsTab(box, ctx) {
  if (!(await loadData(ctx))) { loadErrEl(box, ctx); return; }
  const units = unitsOf(S.unitsData, ctx.cards(), S.all);
  const done = korDoneMap();
  const states = korWordsMap();
  const head = el('section', 'kor-head');
  head.appendChild(el('h2', 'kor-h', '📘 국어 단원 지도'));
  head.appendChild(el('p', 'kor-intro', '지금 배우는 4학년 2학기와 내년 5학년 국어책의 단원이에요. 단원마다 이어진 글 카드와 낱말을 익혀 두면 수업이 쉬워져요.'));
  const ready = units.filter((u) => !unitProgress(u, done, states).empty).length;
  head.appendChild(el('p', 'kor-count', `준비된 단원 ${ready} / ${units.length}`));
  if (S.unitsData && typeof S.unitsData.source === 'string') head.appendChild(el('p', 'kor-tnote', S.unitsData.source));
  box.appendChild(head);
  for (const term of TERMS) {
    const list = units.filter((u) => u.term === term);
    if (!list.length) continue;
    box.appendChild(el('h3', 'kor-term', TERM_LABEL[term] || term));
    const grid = el('div', 'kor-units');
    for (const u of list) grid.appendChild(unitEl(u, done, states, ctx));
    box.appendChild(grid);
  }
}

function unitEl(u, done, states, ctx) {
  const p = unitProgress(u, done, states);
  const sec = el('section', `kor-unit${p.empty ? ' is-empty' : ''}`);
  sec.appendChild(el('h4', 'kor-unit-h', unitLabel(u)));
  if (u.goal) sec.appendChild(el('p', 'kor-unit-goal', u.goal));
  if (u.note) sec.appendChild(el('p', 'kor-tnote', u.note));
  if (p.empty) { sec.appendChild(el('p', 'kor-unit-wait', '준비 중 — 이 단원 글과 낱말은 곧 들어와요')); return sec; }
  if (u.cards.length) {
    const row = el('div', 'kor-unit-cards');
    for (const c of u.cards) {
      const s = starsOf(done, c.id);
      const b = el('button', 'kor-unit-card', `${c.icon} ${c.title} ${'★'.repeat(s)}${'☆'.repeat(3 - s)}`);
      b.type = 'button';
      b.addEventListener('click', () => guardStart('korean', () => ctx.openCard(c.id)));
      row.appendChild(b);
    }
    sec.appendChild(row);
  }
  if (u.words.length) {
    const row = el('div', 'kor-chips');
    for (const w of u.words) {
      const st = states[w.id];
      const star = st && st.box >= MASTER_BOX;
      row.appendChild(el('span', `kor-chip${star ? ' is-star' : ''}`, `${star ? '⭐' : '🔤'} ${w.w}`));
    }
    sec.appendChild(row);
    sec.appendChild(el('p', 'kor-tnote', `🔤 익힌 낱말 ⭐ ${p.mastered} / ${p.words}${u.cards.length ? ` · 📚 ★ ${p.stars} / ${p.starMax}` : ''}`));
  } else if (u.cards.length) sec.appendChild(el('p', 'kor-tnote', `📚 ★ ${p.stars} / ${p.starMax}`));
  return sec;
}
