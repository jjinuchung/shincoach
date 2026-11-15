// v428 📰 신문 칸 — 📚 국어 화면 (2026-11-15 아버님 기본안 다섯 「추천대로」) — node --test tests/news428kor.test.js
//  탭 「📰 신문」은 신문 카드가 있을 때만 · 📚 도감엔 공개 글만 · bnews 하루 두 편(공개 묶음과 따로) · 기사 칸(최근 열린 것이 위 · 「📰 신문 · 신문 이름 날짜」) ·
//  읽기 화면 신문 이름 줄 · 기사 아래 📷·🗂️ 회색 칸(번호 없음 · 근거 아님) · 40줄 글 🔍 근거(㉑ 넘어도) · korFinish ids에 신문 카드
//  ★ 기사 글은 저작권 — 이 시험의 기사는 모두 지어낸 것이다(실제 기사 문장·제목을 넣지 않는다)
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkNewsCard, validCards, isNews, circled, lineCount, evRange, evPair, korFinishRule, NEWS_KIND, NEWS_LINES_MAX, EV_RANGE_AT } from '../js/korean.js';
import { NEWS_ORDER, visibleCards, freshIds, hasLocked, opensTomorrow, withFirst, dripStartRule, needsStart } from '../js/kordrip.js';
import { emptyProfile, cloneProfile } from '../js/db.js';
import { NEWS_TAB, splitNews, newsDate, newsByline, newsKindLine, newsShelf, dripView, decoEl, renderNewsTab } from '../js/newsview.js';
import { tabsOf, evNear, EV_LONG, evPairSay, statusOf } from '../js/koreanview.js';

void fakeIdb;
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const PUB = validCards(JSON.parse(read('coach/korean/reading.json')));

// ───────────────────── 가짜 화면 (essaytopic388과 같은 꼴) ─────────────────────
function fakeEl(tag = 'div') {
  let text = '';
  const e = {
    tagName: tag.toUpperCase(), className: '', type: '', disabled: false, style: {}, dataset: {}, children: [], attrs: {}, handlers: {},
    appendChild(c) { this.children.push(c); return c; },
    addEventListener(t, fn) { this.handlers[t] = fn; },
    click() { if (this.handlers.click) this.handlers.click({ stopPropagation() {}, preventDefault() {} }); },
    setAttribute(k, v) { this.attrs[k] = v; },
  };
  Object.defineProperty(e, 'textContent', {
    get() { return this.children.length ? this.children.map((c) => c.textContent).join('') : text; },
    set(v) { this.children = []; text = String(v); },
  });
  return e;
}
before(() => {
  globalThis.document = { hidden: false, getElementById: () => null, createElement: (t) => fakeEl(t), createTextNode: (t) => ({ textContent: String(t), nodeType: 3 }) };
  const store = new Map();
  globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: (k) => { store.delete(k); } };
});
const kidsOf = (box) => (box.children || []).flatMap((c) => [c, ...kidsOf(c)]);
const byClass = (box, cls) => kidsOf(box).filter((c) => String(c.className || '').split(' ').includes(cls));

// ───────────────────── 지어낸 기사 ─────────────────────
/** 지어낸 신문 카드 — id(K701~) · len 줄 수(40까지) · 근거는 ②·㉑·㉞·㊵(줄 수 안에서) */
function news(id, o = {}) {
  const len = o.lines || NEWS_LINES_MAX;
  const lines = ['[제목] 구름다리 마을에 연 날리기 대회가 열렸다'];
  for (let k = 2; k <= len; k++) lines.push(`구름다리 마을 소식 ${k}번째 문장이에요.`);
  const at = (k) => Math.min(k, len);
  const q = (i, ev) => ({
    id: `${id}-${i}`, skill: '내용 확인', q: `${i}번 물음 — 기사에 쓰여 있는 것은 무엇인가요?`,
    opts: [
      { t: `맞는 보기 ${i}`, ok: true },
      { t: `지어낸 보기 ${i}`, type: 'make', why: `기사에 없는 말이에요. ${circled(ev)}을 다시 보세요.` },
      { t: `반대 보기 ${i}`, type: 'flip', why: '기사와 반대로 읽었어요.' },
      { t: `한 부분 보기 ${i}`, type: 'detail', why: '한 부분만 말하고 있어요.' },
    ],
    ev: [ev], evQ: '어느 문장에서 알 수 있나요?', evNote: `${circled(ev)}에 쓰여 있어요.`,
  });
  return {
    id, kind: 'news', layout: 'rows', icon: '🪁', title: o.title || '연 날리기 대회가 열렸어요', genre: '신문 기사', skill: '기사 읽기',
    source: '지어낸 꼬마신문 2026년 3월 4일 2면 · 시험 기자',
    meta: ['📰 신문 기사', '[4국02-01] 시험'], news: { article: `${Number(id.slice(1)) - 700}-1`, paper: '지어낸 꼬마신문', date: o.date || '2026년 3월 4일 수요일', page: '2면' },
    ...(o.noDeco ? {} : { deco: { captions: ['연을 든 아이들(지어낸 사진 설명)'], boxes: [{ name: '알아봐요', title: '연이란?', body: ['종이와 대나무로 만들어요.', '바람을 타고 날아요.'] }] } }),
    words: [['대회', '실력을 겨루는 모임']],
    lines,
    qs: [q(1, at(2)), q(2, at(21)), q(3, at(34)), q(4, at(40)), q(5, at(3))],
  };
}
const NEWS = NEWS_ORDER.map((id) => news(id));

test('🧪 지어낸 기사는 신문 카드 검사를 통과한다 (시험 재료가 진짜 꼴이어야 화면 시험이 뜻이 있다)', () => {
  for (const c of [news('K701'), news('K805', { lines: 9 }), news('K704', { noDeco: true })]) assert.deepEqual(checkNewsCard(c), [], c.id);
  assert.equal(NEWS.length, 104);
});

// ───────────────────── 탭 · 도감 ─────────────────────

test('📰 탭은 신문 카드가 있을 때만 (v428) — 열쇠 없는 기기(신문 0)는 탭 넷 그대로 · 있으면 맨 끝에 「📰 신문」', () => {
  const four = [['cards', '📚 도감'], ['words', '🔤 낱말'], ['units', '📘 단원'], ['puzzle', '🧩 퍼즐']];
  assert.deepEqual(tabsOf(PUB), four, '공개 글만');
  assert.deepEqual(tabsOf([]), four);
  assert.deepEqual(tabsOf(null), four);
  assert.deepEqual(tabsOf([...PUB, NEWS[0]]), [...four, ['news', '📰 신문']]);
  assert.equal(NEWS_TAB, '📰 신문');
  const v = read('js/koreanview.js');
  assert.ok(v.includes('const list = tabsOf(ui.cards);') && v.includes("if (list.length > 4) bar.classList.add('has-news');"), '탭 막대는 열린 글로 정한다 · 다섯이면 좁은 화면 두 줄');
  assert.ok(v.includes("if (ui.tab === 'news' && !splitNews(cards).news.length) ui.tab = 'cards';"), '기사가 없으면 📚 도감으로');
  assert.ok(v.includes('renderNewsTab(body, tabCtx);'), '📰 탭은 newsview가 그린다');
  assert.ok(/@media \(max-width: 480px\) \{\n {2}\.kor-tabs\.has-news \{ flex-wrap: wrap; \}/.test(read('css/style.css')));
});

test('📚 도감엔 공개 글만 · 📰 칸엔 신문 기사만 (splitNews — 차례 그대로) · 🌱·📦 줄도 공개 글로만', () => {
  const mixed = [PUB[0], NEWS[0], PUB[1], NEWS[1], null];
  const s = splitNews(mixed);
  assert.deepEqual(s.pub.map((c) => c.id), [PUB[0].id, PUB[1].id]);
  assert.deepEqual(s.news.map((c) => c.id), ['K701', 'K702']);
  assert.ok(s.pub.every((c) => !isNews(c)) && s.news.every(isNews));
  assert.deepEqual(splitNews(undefined), { pub: [], news: [] });
  const v = read('js/koreanview.js');
  const list = v.slice(v.indexOf('export async function renderList() {'), v.indexOf('\n}\n', v.indexOf('export async function renderList() {')));
  const cut = list.indexOf('cards = splitNews(cards).pub;');
  assert.ok(cut > list.indexOf("if (ui.tab === 'news') {"), '📰 탭을 고른 다음에 거른다');
  assert.ok(cut < list.indexOf('const got = cards.filter(') && cut < list.indexOf('const fresh = freshEl(cards);') && cut < list.indexOf('const shown = ['), '모은 카드·🌱·도감 칸은 공개 글로만');
  assert.ok(list.includes('if (ui.pub && hasLocked(ui.pub, dripState(), todayKey(), readIds())) {') && list.includes('const soon = opensTomorrow(ui.pub,'), '📦 줄은 공개 글로만(신문이 잠겨 있다고 도감에 「새 글」이 뜨지 않게)');
});

// ───────────────────── 📦 bnews 하루 두 편 ─────────────────────

test('📦 bnews 하루 두 편 — 공개 묶음과 따로 · 첫날(시작 날 없음)도 둘 · 날마다 둘씩 · 🌱 오늘 새 기사 · 📦 내일 새 기사', () => {
  const all = [...PUB, ...NEWS];
  const day = '2026-11-15';
  const pubOnly = visibleCards(PUB, {}, day, []);
  const v0 = visibleCards(all, {}, day, []);
  assert.deepEqual(splitNews(v0).pub.map((c) => c.id), pubOnly.map((c) => c.id), '공개 글은 신문이 들어와도 그대로');
  assert.deepEqual(splitNews(v0).news.map((c) => c.id), ['K701', 'K702'], '시작 날이 없어도 첫날 몫 둘');
  const st = { bnews: '2026-11-13' };
  const v2 = splitNews(visibleCards(all, st, day, [])).news;
  assert.deepEqual(v2.map((c) => c.id), NEWS_ORDER.slice(0, 6), '사흘째 여섯');
  const d = { state: st, today: day, read: new Set(['K703']) };
  const view = dripView(v2, NEWS, d);
  assert.deepEqual(view.fresh.map((c) => c.id), NEWS_ORDER.slice(4, 6), '오늘 열린 둘');
  assert.deepEqual(dripView(v2, NEWS, { ...d, read: new Set([NEWS_ORDER[4]]) }).fresh.map((c) => c.id), [NEWS_ORDER[5]], '읽은 기사는 🌱에서 빠진다');
  assert.equal(view.locked, true);
  assert.equal(view.soon, true, '내일 또 둘');
  // 📚 도감 쪽 🌱는 공개 글 목록으로 거르면 신문이 섞이지 않는다
  const pubFresh = freshIds(st, day, []).map((id) => PUB.find((c) => c.id === id)).filter(Boolean);
  assert.ok(pubFresh.every((c) => !isNews(c)));
  // 다 열린 뒤 — 📦 줄 없음
  const late = { state: { bnews: '2026-01-01' }, today: day, read: [] };
  const open = splitNews(visibleCards(all, late.state, day, [])).news;
  assert.equal(open.length, 104);
  assert.deepEqual(dripView(open, NEWS, late), { fresh: [], locked: false, soon: false });
  assert.equal(hasLocked(NEWS, late.state, day, []), false);
  assert.equal(opensTomorrow(NEWS, st, day, []), true);
  // 시작 날은 신문 카드 id를 넘길 때만 적힌다(koreanview ensureDripStart는 ui.all — 공개 + 신문)
  assert.equal(needsStart({}, PUB.map((c) => c.id).concat('K701')), true);
  const p = { korDrip: {} };
  dripStartRule(p, day, all.map((c) => c.id));
  assert.equal(p.korDrip.bnews, day);
  const q = { korDrip: {} };
  dripStartRule(q, day, PUB.map((c) => c.id));
  assert.equal(q.korDrip.bnews, undefined, '공개 글만이면 bnews는 안 적는다(열쇠 없는 기기)');
  assert.equal(withFirst({}, day).bnews, day);
  const v = read('js/koreanview.js');
  assert.ok(v.includes('ui.all = ui.pub ? [...ui.pub, ...newsNow().cards] : null;'), '공개 글 뒤에 받아 둔 신문 기사');
  assert.ok(v.indexOf('ui.all = ui.pub ? [...ui.pub, ...newsNow().cards] : null;') < v.indexOf('  if (ui.all) ensureDripStart();\n  ui.cards = '), '합친 뒤에 시작 날 · 걸러 보이기');
  assert.ok(v.includes('newsAll: () => splitNews(ui.all).news,') && v.includes('newsCards: () => splitNews(ui.cards).news,') && v.includes('drip: () => ({ state: dripState(), today: todayKey(), read: readIds() }),'), '📰 칸은 도감과 같은 셈(dripState)');
});

// ───────────────────── 기사 칸 · 신문 이름 줄 ─────────────────────

test('📰 신문 이름·날짜 — 맨 앞의 날짜 꼴만(「안 보임(…)」·괄호 덧말은 빼고) · 칸 줄 「📰 신문 · 신문 이름 날짜」 · 최근 열린 것이 위', () => {
  assert.equal(newsDate('2026년 9월 1일 화요일'), '9월 1일');
  assert.equal(newsDate('2026년 10월 08일 목요일(덧말)'), '10월 8일');
  assert.equal(newsDate('2026년 9월 15일(위 줄이 잘림)'), '9월 15일');
  assert.equal(newsDate('안 보임(같은 호라 2026년 9월 2일로 짐작)'), '', '괄호 안 짐작 날짜는 안 보인다');
  assert.equal(newsDate('안 보임'), '');
  assert.equal(newsDate(undefined), '');
  const c = news('K701');
  assert.equal(newsByline(c), '지어낸 꼬마신문 3월 4일');
  assert.equal(newsByline(news('K702', { date: '안 보임(덧말)' })), '지어낸 꼬마신문', '날짜를 못 읽으면 신문 이름만');
  assert.equal(newsByline({ id: 'K1' }), '');
  assert.equal(newsKindLine(c), '📰 신문 · 지어낸 꼬마신문 3월 4일');
  const shelf = newsShelf([NEWS[0], NEWS[3], PUB[0], NEWS[1]]);
  assert.deepEqual(shelf.map((x) => x.id), [NEWS[3].id, NEWS[1].id, NEWS[0].id], '최근 열린 것이 위 · 공개 글은 빠진다');
  assert.equal(newsShelf([news('K704'), news('K705')])[0].id, 'K704', '□ 네 기사는 차례 맨 뒤 — 열리면 맨 위');
});

test('📰 탭 그리기 (newsview — 가짜 화면): 머리(셈 없이) · 🌱 새 기사 · 📦 줄 · 🎯 단추 · 기사 칸(★·상태) · 누르면 그 기사', () => {
  const opened = [];
  const done = { 'K701:1': 1 };
  const ctx = {
    newsCards: () => [PUB[0], ...NEWS.slice(0, 4)],
    newsAll: () => [PUB[0], ...NEWS],
    drip: () => ({ state: { bnews: '2026-11-14' }, today: '2026-11-15', read: new Set(['K701']) }),
    starState: (id) => ({ stars: done[`${id}:1`] ? 1 : 0, ...statusOf(done, id, Date.now()) }),
    catchBtnEl: () => { const b = fakeEl('div'); b.className = 'kor-catch'; return b; },
    openCard: (id) => opened.push(id),
  };
  const box = fakeEl('div');
  renderNewsTab(box, ctx);
  const text = box.textContent;
  assert.ok(text.startsWith(NEWS_KIND), '머리 📰 신문 기사');
  assert.ok(!/남은|\d+\s*편|\d+\s*\/\s*\d+|모은 카드/.test(text), '셈 글 없음');
  const fresh = byClass(box, 'kor-fresh')[0];
  assert.deepEqual(fresh.children.map((b) => b.textContent), NEWS.slice(2, 4).map((c) => `🌱 새 기사 · ${c.title}`), '오늘 열린 둘');
  assert.equal(byClass(box, 'kor-drip')[0].textContent, '📦 내일 새 기사가 와요');
  assert.equal(byClass(box, 'kor-catch').length, 1, '🎯 기회 단추');
  const slots = byClass(box, 'kor-slot');
  assert.deepEqual(slots.map((b) => b.dataset.card), NEWS.slice(0, 4).map((c) => c.id).reverse(), '신문 기사만 · 최근 열린 것이 위');
  const first = slots[3];
  assert.ok(first.className.includes('is-news') && first.className.includes('is-got'), '★ 받은 기사');
  assert.deepEqual(byClass(first, 'kor-slot-kind').map((x) => x.textContent), ['📰 신문 · 지어낸 꼬마신문 3월 4일']);
  assert.equal(byClass(first, 'kor-slot-stars')[0].textContent, '★☆☆');
  assert.ok(byClass(slots[0], 'kor-slot-status')[0].textContent.startsWith('새 글'));
  slots[1].click();
  fresh.children[0].click();
  assert.deepEqual(opened, [NEWS[2].id, NEWS[2].id], '⏳ guardStart → 그 기사 열기');
  // 기사가 없을 때 — 셈 없이 한 줄
  const empty = fakeEl('div');
  renderNewsTab(empty, { ...ctx, newsCards: () => [], newsAll: () => [] });
  assert.ok(empty.textContent.includes('📰 새 기사가 오면 여기에 보여요') && !byClass(empty, 'kor-drip').length);
  const nv = read('js/newsview.js');
  assert.ok(!/from '\.\/koreanview\.js'/.test(nv), 'newsview는 koreanview를 import하지 않는다(ctx로 건넴)');
  assert.ok(nv.includes("b.addEventListener('click', () => guardStart('korean', () => ctx.openCard(c.id)));"), '⏳ 국어 시간 안에서');
  assert.ok(read('sw.js').includes("  './js/news.js', // 📰") && read('sw.js').includes("'./js/newsview.js'"), '앱 셸');
});

// ───────────────────── 읽기 화면 ─────────────────────

test('📷·🗂️ 기사 아래 회색 칸 — 사진 설명·상자 이름·제목·글 · 줄 번호 없음 · data-n 없음(근거 줄에 안 든다) · 빈 칸은 null', () => {
  const box = decoEl(news('K701').deco);
  assert.equal(box.className, 'kor-deco');
  const ps = kidsOf(box).map((x) => x.textContent);
  assert.ok(ps.includes('📷 사진 설명') && ps.includes('연을 든 아이들(지어낸 사진 설명)'));
  assert.ok(ps.includes('🗂️ 알아봐요') && ps.includes('연이란?') && ps.includes('종이와 대나무로 만들어요.') && ps.includes('바람을 타고 날아요.'));
  assert.ok(!/[①-⑳㉑-㉟㊱-㊿]/.test(box.textContent), '번호 없음');
  assert.ok(kidsOf(box).every((x) => !x.dataset || x.dataset.n === undefined), 'data-n 없음');
  assert.equal(decoEl({ boxes: [{ name: '상자', body: [] }] }), null, '보일 글이 없으면 칸 없이');
  assert.equal(decoEl(undefined), null);
  assert.equal(decoEl({ captions: ['사진 하나'] }).children.length, 1);
  const v = read('js/koreanview.js');
  const pe = v.slice(v.indexOf('function passageEl(card) {'), v.indexOf('\n}\n', v.indexOf('function passageEl(card) {')));
  assert.ok(pe.includes("top.appendChild(el('span', 'kor-passage-badge', news ? NEWS_KIND : KINDS.practice));"), '종류 📰 신문 기사');
  assert.ok(pe.includes("top.appendChild(el('span', 'kor-passage-by', news ? newsByline(card) || card.genre : `${card.genre} · 글 신코치`));"), '「글 신코치」 대신 신문 이름');
  assert.ok(pe.indexOf('box.appendChild(proseEl(card));') < pe.indexOf('if (deco) box.appendChild(deco);') && pe.indexOf('if (deco) box.appendChild(deco);') < pe.indexOf("if (card.source) box.appendChild(el('p', 'kor-source', `📰 ${card.source}`));"), '글 아래 · 바탕 기사 줄은 그대로');
  assert.ok(v.includes("const back = el('button', 'btn kor-back', isNews(r.card) ? '← 신문' : '← 도감');") && v.includes("news ? '📰 신문으로' : '📚 도감으로'"), '다 읽고 📰 칸으로');
  assert.ok(v.includes("if (isNews(card)) ui.tab = 'news';"), '기사를 열면 돌아갈 곳은 📰 탭');
  const css = read('css/style.css');
  assert.ok(/\.kor-deco \{[^}]*background: #f1f3f6;/.test(css), '회색 칸');
});

test('🔍 40줄 기사 근거 — ㉑~㊵ 번호 · 두 번 잘못 누르면 범위(⑳ 넘어도) · 범위 줄 테두리는 줄이 많은 글만 · 두 줄로 좁히기', () => {
  const c = news('K710');
  assert.equal(lineCount(c), 40);
  assert.deepEqual([21, 33, 40].map(circled), ['㉑', '㉝', '㊵']);
  const q = c.qs[3]; // 근거 ㊵
  assert.deepEqual(evRange(q.ev, 40), [38, 40]);
  assert.equal(`${circled(38)}~${circled(40)} 사이에 있어요.`, '㊳~㊵ 사이에 있어요.');
  const st = (o = {}) => ({ answered: false, evDone: false, pair: null, evWrong: [], ...o });
  assert.equal(EV_LONG, 20);
  assert.equal(evNear(40, q, st({ evWrong: [5] })), null, '한 번 잘못 누름 — 아직');
  assert.deepEqual(evNear(40, q, st({ evWrong: [5, 9] })), [38, 40], `${EV_RANGE_AT}번 잘못 누르면 범위`);
  assert.equal(evNear(12, q, st({ evWrong: [5, 9] })), null, '짧은 글은 지금 그대로(말만)');
  assert.equal(evNear(40, q, st({ evWrong: [5, 9], pair: [39, 40] })), null, '두 줄로 좁힌 뒤엔 두 줄 테두리');
  assert.equal(evNear(40, q, st({ evWrong: [5, 9], answered: true })), null, '답을 고른 뒤 근거 잡기엔 없음');
  assert.equal(evNear(40, q, st({ evWrong: [5, 9], evDone: true })), null);
  assert.equal(evNear(40, { ev: null }, st({ evWrong: [5, 9] })), null, '근거가 없는 물음');
  assert.deepEqual(evNear(40, c.qs[1], st({ evWrong: [5, 9] })), [19, 23], '㉑ 둘레 — ⑲~㉓');
  const pair = evPair(c.qs[1].ev, 40, [3, 7, 9], 0);
  assert.ok(pair.includes(21) && pair.length === 2);
  assert.ok(evPairSay(pair, [], '문장').startsWith(`🔍 두 문장(${pair.map(circled).join(', ')}) 가운데 하나예요`) && evPairSay(pair, [], '문장').includes('㉑'), '두 줄 말도 ㉑ 그대로');
  assert.equal(evPairSay([21, 33], [21], '문장'), '🔍 남은 문장(㉝)을 읽고 눌러 봐요.');
  const v = read('js/koreanview.js');
  const ev = v.slice(v.indexOf('function evidenceEl(q, st, unit) {'), v.indexOf('\n}\n', v.indexOf('function evidenceEl(q, st, unit) {')));
  assert.ok(ev.includes("if (lineCount(card) > EV_LONG) rows.classList.add('is-long');") && ev.includes("${close ? ' is-near' : ''}"), '촘촘한 줄 · 범위 테두리');
  assert.ok(ev.includes('for (let n = 1; n <= lineCount(card); n++) {') && ev.includes('b.appendChild(el(\'span\', \'kor-num\', circled(n)));'), '줄 단추는 글의 모든 줄 · 번호는 circled(㊿까지)');
  assert.ok(!ev.includes('deco'), '회색 칸은 근거 줄에 안 든다');
  const pick = v.slice(v.indexOf('function evPick(n) {'), v.indexOf('\n}\n', v.indexOf('function evPick(n) {')));
  assert.ok(pick.includes("const zoneOf = () => (st.pair ? 'pair' : evNear(lineCount(r.card), q, st) ? 'near' : '');") && pick.indexOf('const zoned = zoneOf();') < pick.indexOf('st.evWrong.push(n);'), '누르기 전 테두리를 적어 둔다');
  assert.ok(pick.includes('else if (zoneOf() && zoneOf() !== zoned) bringNear();'), '테두리가 막 생기면 그 줄로 — 범위가 있던 채 두 줄로 좁혀져도(셋째 잘못 누름)');
  const css = read('css/style.css');
  assert.ok(css.includes('.kor-ev-rows.is-long .kor-ev-row {') && css.includes('.kor-ev-row.is-near {'));
});

test('★·💰·🎯는 지금 국어와 같다 — korFinish ids(열린 글 = 공개 + 신문)에 신문 카드가 있어야 저장 · 없으면 unknown', () => {
  const T0 = new Date(2026, 10, 15, 12, 0, 0).getTime();
  const ids = visibleCards([...PUB, ...NEWS], {}, '2026-11-15', []).map((c) => c.id);
  assert.ok(ids.includes('K701'));
  const p = cloneProfile(emptyProfile());
  const r = korFinishRule(p, 'K701', T0, {}, ids, 0);
  assert.equal(r.ok, true);
  assert.deepEqual([r.star, r.coins], [1, 12], '처음 다 맞힘 ★ 💰12 — 공개 글과 같다');
  assert.deepEqual(korFinishRule(cloneProfile(emptyProfile()), 'K701', T0, {}, PUB.map((c) => c.id), 0), { ok: false, why: 'unknown' }, '공개 글 id만 넘기면 저장이 안 된다');
  const v = read('js/koreanview.js');
  assert.ok(v.includes('res = await korFinish(r.card.id, r.misses, (ui.cards || []).map((c) => c.id), r.evMiss, { noStone: !!(r.ls && r.ls.text), qMiss, read: readLog(r) });'), 'ids = 열린 글(신문 포함)');
  // 끝 화면 — 🖊️ 이 기사로 생각해 보기(길은 같다 — 논술 칸이 신문 주제까지 찾는다)
  const fn = v.slice(v.indexOf('function storyNonsulEl('), v.indexOf('// ───', v.indexOf('function storyNonsulEl(')));
  assert.ok(fn.includes("isNewsId(cardId) ? '🖊️ 이 기사로 생각해 보기' : '🖊️ 이 글로 생각해 보기'"));
  assert.ok(fn.includes('ns.readingTopicFor(cardId)') && fn.includes('ns.openTopic(t.id)'), '같은 길');
  assert.ok(v.includes("if (news && res.ok && res.star === 1) t.title = '📰 기사 카드 등록!';"));
});

test('📥 들어올 때 받아 둔 사본 → 새로 받기 · 목록이 바뀌었을 때만 다시 그림 · 🚀⚔️🗺️ 문제 원천엔 국어 글 카드가 없다', () => {
  const v = read('js/koreanview.js');
  assert.ok(v.includes('refreshNews(); // 📰'), '국어에 들어올 때');
  const fn = v.slice(v.indexOf('function refreshNews() {'), v.indexOf('\n}\n', v.indexOf('function refreshNews() {')));
  assert.ok(fn.indexOf('loadNews()') < fn.indexOf('syncNews()'), '사본 먼저 · 그다음 받기');
  assert.ok(fn.includes('if (r && r.changed) redraw();'), '바뀌었을 때만');
  assert.ok(fn.includes('!ui.read && !anySession() && !ui.wview'), '읽는 중·판 중·답장 화면이면 그대로');
  assert.ok(v.includes('await Promise.race([loadNews().catch(() => null), new Promise((res) => setTimeout(res, NEWS_WAIT_MS))]);'), '사본이 늦으면 공개 글부터');
  // 🚀 로켓단·⚔️ 배틀·🗺️ 대여행 국어 문제는 words.json 낱말에서만(카드를 안 넘긴다) — 신문 물음이 기사 없이 나오지 않는다
  assert.ok(read('js/korbattleview.js').includes("W.all = allWords(await res.json(), []);"));
  assert.ok(read('js/journeyview.js').includes('const pool = kb.korPool(allWords(await res.json(), []));'));
  assert.ok(v.includes('const korMakeQ = () => korWordsSource();'));
});

test('🔊 읽어 주기 — ㉑~㊵ 근거 번호도 「21번」처럼 읽고 ㉠~㉭은 그대로 ㄱ~ㅎ (korlisten · 40줄 기사)', async () => {
  const { sayText } = await import('../js/korlisten.js');
  assert.equal(sayText('㉑·㉒을 다시 읽어요'), '21번, 22번을 다시 읽어요');
  assert.equal(sayText('⑳~㉓ 사이에 있어요'), '20번부터 23번까지 사이에 있어요');
  assert.equal(sayText('㉟와 ㊱, ㊵'), '35번와 36번, 40번');
  assert.equal(sayText('㉠ 줄과 ㉭'), 'ㄱ 줄과 ㅎ');
  assert.equal(sayText('⑦'), '7번');
});

test('📖 낱말 풀이의 「…에서:」 문장 — 신문 기사 제목 줄이면 「[제목]」 머리를 떼고 보인다 (korwords.passageWords)', async () => {
  const { passageWords } = await import('../js/korwords.js');
  const card = { id: 'K799', title: '바람숲 마을의 풍차', words: [['풍차', '바람으로 도는 날개']], lines: ['[제목] 바람숲 마을의 풍차', '마을 사람들은 언덕에 풍차를 세웠어요.'] };
  const [w] = passageWords([card]);
  assert.equal(w.src, '바람숲 마을의 풍차');
  // 공개 글은 그대로
  const [p] = passageWords([{ id: 'K010', title: '가', words: [['언덕', '조금 높은 땅']], lines: ['언덕에 올랐어요.'] }]);
  assert.equal(p.src, '언덕에 올랐어요.');
});

test('📦 시작 날은 묶음마다 처음 받은 날 — 앱을 며칠 켜 둔 채 늦게 받은 📰 bnews가 공개 묶음 날로 열리지 않는다 (🔍 Codex 230차 #3)', async () => {
  const { dripFirstPlan } = await import('../js/koreanview.js');
  const pubIds = PUB.map((c) => c.id);
  // 11-15 공개 글만 받음(저장 실패로 적힌 날 없음) → 공개 묶음들만 11-15
  const p1 = dripFirstPlan({}, {}, pubIds, '2026-11-15');
  assert.ok(p1.first.b411b === '2026-11-15' && !('bnews' in p1.first), '신문을 받기 전엔 bnews 날 없음');
  assert.deepEqual(Object.keys(p1.byDay), ['2026-11-15']);
  // 11-18 같은 실행에서 신문을 처음 받음 → 공개 묶음은 11-15 그대로 · bnews만 11-18
  const p2 = dripFirstPlan(p1.first, {}, [...pubIds, ...NEWS_ORDER.slice(0, 6)], '2026-11-18');
  assert.equal(p2.first.b411b, '2026-11-15');
  assert.equal(p2.first.bnews, '2026-11-18');
  assert.deepEqual(p2.byDay['2026-11-18'], NEWS_ORDER.slice(0, 6), '그날 적을 것은 신문 글 id만');
  // 화면 셈 — bnews를 11-18로 세면 첫날 두 편만 (11-15로 셌다면 여덟 편)
  const st = withFirst({}, '');
  const news = NEWS_ORDER.map((id) => ({ id }));
  assert.equal(visibleCards(news, { ...st, bnews: p2.first.bnews }, '2026-11-18', []).length, 2);
  assert.equal(visibleCards(news, { ...st, bnews: '2026-11-15' }, '2026-11-18', []).length, 8, '고치기 전(하나의 dripFirst)에는 여덟 편이 열렸다');
  // 이미 적힌 묶음은 다시 적지 않는다
  assert.deepEqual(dripFirstPlan({}, { bnews: '2026-11-10' }, NEWS_ORDER, '2026-11-18').byDay, {});
});
