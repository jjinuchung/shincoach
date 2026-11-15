// 📰 신문 탭 (v428, 2026-11-15 아버님 기본안 다섯 「추천대로」) — 📚 국어 화면 안의 「📰 신문」 칸: 어린이신문 기사 카드만 모아 보인다
// koreanview가 탭 막대·🎯 잡기 단추·글 열기·묶음 날짜를 ctx로 건넨다(kortabs·korpuzzleview와 같은 꼴 — 이 파일은 koreanview를 import하지 않는다)
//  · 신문 카드는 news.js가 비공개 저장소에서 받아 이 기기에만 둔다 → 열쇠가 없는 기기는 카드가 없어 탭도 없다(koreanview tabsOf)
//  · 하루 두 편씩 열린다(kordrip bnews) — 📚 도감과 같은 함수에 신문 카드만 넘긴다(dripView) · 셈 없이(남은 편 수·밀린 수를 쓰지 않는다)
//  · 열린 기사는 최근 열린 것이 위(newsShelf) · 누르면 ⏳ guardStart → 국어 읽기 화면(물음·근거·★·💰·🎯가 지금 국어와 같다)
//  · 읽기 화면 조각(신문 이름·날짜 줄 · 📷 사진 설명·🗂️ 상자 회색 칸)도 여기서 만든다 — koreanview가 부른다
// ★ 기사 글은 저작권 — 이 파일·시험·주석에 기사 문장·제목을 넣지 않는다(카드는 받은 사본에서만)
import { NEWS_KIND, isNews } from './korean.js';
import { NEWS_ORDER, freshIds, hasLocked, opensTomorrow } from './kordrip.js';
import { guardStart } from './timeup.js';

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

/** 탭 이름 — 신문 카드가 있을 때만 탭 막대 끝에 */
export const NEWS_TAB = '📰 신문';

/** 카드 목록 → { pub 공개 원고 글(📚 도감), news 신문 기사(📰 칸) } (순수 · 차례 그대로) */
export function splitNews(cards) {
  const list = Array.isArray(cards) ? cards.filter(Boolean) : [];
  return { pub: list.filter((c) => !isNews(c)), news: list.filter(isNews) };
}

/**
 * 신문 날짜 글 → 「9월 1일」 (순수) — 원고 date에는 「안 보임(…)」·괄호 덧말이 든 것이 있어 **맨 앞의** 날짜 꼴만 뽑는다
 *   (괄호 안에 짐작으로 적은 날짜는 보이지 않는다) · 못 읽으면 ''
 */
export function newsDate(s) {
  const m = /^\s*(?:\d{4}\s*년\s*)?(\d{1,2})\s*월\s*(\d{1,2})\s*일/.exec(String(s || ''));
  return m ? `${Number(m[1])}월 ${Number(m[2])}일` : '';
}

/** 신문 이름 날짜 (순수) — 「신문 이름 9월 1일」 · 날짜를 못 읽은 기사는 신문 이름만 · 둘 다 없으면 '' */
export function newsByline(card) {
  const nw = card && card.news && typeof card.news === 'object' ? card.news : null;
  if (!nw) return '';
  return [String(nw.paper || '').trim(), newsDate(nw.date)].filter(Boolean).join(' ');
}

/** 도감 칸·기사 칸의 종류 줄 (순수) — 「📰 신문 · 신문 이름 날짜」 */
export function newsKindLine(card) {
  const by = newsByline(card);
  return by ? `${NEWS_TAB} · ${by}` : NEWS_TAB;
}

/** 열린 기사 차례 (순수) — 최근 열린 것이 위(NEWS_ORDER 뒤쪽 먼저) · 차례에 없는 기사는 맨 아래(번호 차례) · 신문 카드만 */
export function newsShelf(cards) {
  const at = (c) => NEWS_ORDER.indexOf(c.id);
  return (Array.isArray(cards) ? cards : []).filter(isNews).sort((a, b) => (at(b) - at(a)) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/**
 * 📦·🌱 줄 (순수) — list = 이 칸에 보이는 카드(열린 것) · all = 이 칸의 모든 카드(잠긴 것까지) · d = { state 셀 시작 날, today, read 읽은 글 }
 *   → { fresh: 오늘 새로 열린 안 읽은 카드(묶음 차례), locked: 잠긴 글이 남았나, soon: 내일 정말 새 글이 열리나 }
 *   kordrip 함수는 모든 묶음을 보므로 **넘기는 목록**으로 칸을 가른다(📰 칸엔 신문 기사만 — 📚 도감의 새 글이 섞이지 않게)
 */
export function dripView(list, all, d) {
  const shown = Array.isArray(list) ? list : [];
  const fresh = freshIds(d.state, d.today, d.read).map((id) => shown.find((c) => c.id === id)).filter(Boolean);
  const locked = hasLocked(all, d.state, d.today, d.read);
  return { fresh, locked, soon: locked && opensTomorrow(all, d.state, d.today, d.read) };
}

/**
 * 📷 사진 설명 · 🗂️ 상자 — 기사 아래 회색 칸 (v428 아버님 「추천대로」) · 줄 번호 없음 · data-n 없음
 *   (🔍 근거 줄 단추·칠하기·🔊 읽는 줄 테두리는 data-n으로 줄을 찾는다 — 이 칸은 근거가 아니다) · 보일 것이 없으면 null
 */
export function decoEl(deco) {
  const box = el('div', 'kor-deco');
  const caps = deco && Array.isArray(deco.captions) ? deco.captions.filter((t) => typeof t === 'string' && t.trim()) : [];
  if (caps.length) {
    const sec = el('div', 'kor-deco-sec');
    sec.appendChild(el('p', 'kor-deco-h', '📷 사진 설명'));
    for (const t of caps) sec.appendChild(el('p', 'kor-deco-p', t));
    box.appendChild(sec);
  }
  for (const b of deco && Array.isArray(deco.boxes) ? deco.boxes : []) {
    const body = b && Array.isArray(b.body) ? b.body.filter((t) => typeof t === 'string' && t.trim()) : [];
    if (!body.length || typeof b.name !== 'string') continue; // 글이 없는 상자는 칸 없이
    const sec = el('div', 'kor-deco-sec');
    sec.appendChild(el('p', 'kor-deco-h', `🗂️ ${b.name}`));
    if (typeof b.title === 'string' && b.title.trim()) sec.appendChild(el('p', 'kor-deco-title', b.title));
    for (const t of body) sec.appendChild(el('p', 'kor-deco-p', t));
    box.appendChild(sec);
  }
  return box.children.length ? box : null;
}

/**
 * 📰 탭 — 머리(📰 신문 기사 · 한 줄 소개 · 셈 없이) · 🌱 오늘 새 기사 · 📦 한 줄 · 🎯 기회 단추 · 열린 기사 칸(최근 열린 것이 위)
 * @param {object} box 탭 몸통
 * @param {{newsCards:Function, newsAll:Function, drip:Function, starState:Function, catchBtnEl:Function, openCard:Function}} ctx koreanview tabCtx —
 *   newsCards() 열린 신문 기사 · newsAll() 받은 신문 기사(잠긴 것까지) · drip() { state, today, read } · starState(id) { stars, text, ready }
 */
export function renderNewsTab(box, ctx) {
  const list = splitNews(ctx.newsCards()).news;
  const v = dripView(list, splitNews(ctx.newsAll()).news, ctx.drip());
  const head = el('section', 'kor-head kor-news-head');
  head.appendChild(el('h2', 'kor-h', NEWS_KIND));
  head.appendChild(el('p', 'kor-intro', '어린이신문 기사를 읽고 문제를 풀어요. 기사 아래 회색 칸의 사진 설명도 같이 읽어 봐요. 다른 날 다시 읽으면 ★★, 처음 읽은 날부터 일주일이 지나 다시 읽으면 ★★★!'));
  if (v.fresh.length) {
    // 🌱 오늘 새로 열린 기사 — 제목만(셈 없이) · 읽으면 사라진다 · 여는 길은 기사 칸과 같다(⏳)
    const fresh = el('div', 'kor-fresh');
    for (const c of v.fresh) {
      const b = el('button', 'btn', `🌱 새 기사 · ${c.title}`);
      b.type = 'button';
      b.dataset.card = c.id;
      b.addEventListener('click', () => guardStart('korean', () => ctx.openCard(c.id)));
      fresh.appendChild(b);
    }
    head.appendChild(fresh);
  }
  if (v.locked) head.appendChild(el('p', 'kor-drip', v.soon ? '📦 내일 새 기사가 와요' : '📦 새 기사가 차례로 열려요'));
  const cb = ctx.catchBtnEl(); // 🎯 남은 국어 잡기 기회 — 📚 도감과 같은 단추
  if (cb) head.appendChild(cb);
  box.appendChild(head);
  if (!list.length) { box.appendChild(el('p', 'kor-intro', '📰 새 기사가 오면 여기에 보여요')); return; }
  const grid = el('div', 'kor-grid kor-news-grid');
  for (const c of newsShelf(list)) grid.appendChild(slotEl(c, ctx));
  box.appendChild(grid);
}

/** 기사 칸 하나 — 아이콘 · 제목 · 「📰 신문 · 신문 이름 날짜」 · ★ · 상태(📚 도감 칸과 같은 말) */
function slotEl(c, ctx) {
  const st = ctx.starState(c.id);
  const s = Math.max(0, Math.min(3, Number(st && st.stars) || 0));
  const b = el('button', `kor-slot is-news${s ? ' is-got' : ''}${st && st.ready ? ' is-ready' : ''}`);
  b.type = 'button';
  b.dataset.card = c.id;
  b.appendChild(el('span', 'kor-slot-ico', c.icon));
  b.appendChild(el('span', 'kor-slot-title', c.title));
  b.appendChild(el('span', 'kor-slot-kind', newsKindLine(c)));
  b.appendChild(el('span', 'kor-slot-stars', '★'.repeat(s) + '☆'.repeat(3 - s)));
  b.appendChild(el('span', 'kor-slot-status', (st && st.text) || ''));
  b.setAttribute('aria-label', `${c.title} (${newsKindLine(c)}) — 별 ${s}개${st && st.text ? ` · ${st.text}` : ''}`);
  b.addEventListener('click', () => guardStart('korean', () => ctx.openCard(c.id)));
  return b;
}
