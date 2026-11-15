// v428 📰 신문 칸 바탕 (2026-11-15 아버님 기본안 다섯 「추천대로」) — node --test tests/news428.test.js
//  어린이신문 기사 = 국어 📰 카드(K701~K999) + 논술 주제(N701~N999) · 기사 글은 비공개 저장소 news/n1~n4.json에만 → 이 기기 blobs 'news:list'
//  ★ 기사 글은 저작권 — 이 시험의 기사·주제는 모두 지어낸 것이다(실제 기사 문장·제목을 넣지 않는다)
import { fakeIdb } from './fakeidb.js'; // ★ db.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  checkCard, checkContent, checkNewsCard, validNewsCards, validCards, isNewsId, isNews, circled, NEWS_KIND, NEWS_LINES_MAX,
} from '../js/korean.js';
import { checkNonsul, allTopics, checkNewsTopic, isNewsTopicId } from '../js/nonsul.js';
import { DRIP, NEWS_ORDER, startsOf, visibleCards, freshIds, dripStartRule, needsStart, withFirst } from '../js/kordrip.js';
import { getNewsCache, putNewsCache, NEWS_LIST_ID } from '../js/db.js';
import { NEWS_PATHS, SYNC_MS, LIST_MS, MAX_NEWS, newsOf, newsFilesOf, newsNow, loadNews, syncNews } from '../js/news.js';
import { PRIVATE_NEWS, readSummary } from '../js/upload.js';
import { APP_VERSION } from '../js/version.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

// 가짜 localStorage — 받은 때(shincoach.newsAt)
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: (k) => { store.delete(k); },
};

// ───────────────────── 지어낸 기사 ─────────────────────
/** 지어낸 신문 카드 — n 번호(701~999) · lines 줄 수 · 근거는 ㉑·㉝·㊵까지 쓴다(40줄일 때) */
function card(n, o = {}) {
  const len = o.lines || NEWS_LINES_MAX;
  const lines = ['[제목] 바람숲 마을에 별빛 도서관이 문을 열었다'];
  for (let k = 2; k <= len; k++) lines.push(`바람숲 마을 이야기 ${k}번째 문장이에요.`);
  const at = (k) => Math.min(k, len);
  const evQ = (i, ev) => ({
    id: `K${n}-${i}`, skill: '내용 확인', q: `${i}번 물음 — 기사에 쓰여 있는 것은 무엇인가요?`,
    opts: [
      { t: `맞는 보기 ${i}`, ok: true },
      { t: `지어낸 보기 ${i}`, type: 'make', why: `기사에 없는 말이에요. ${circled(ev)}을 다시 보세요.` },
      { t: `반대 보기 ${i}`, type: 'flip', why: '기사와 반대로 읽었어요.' },
      { t: `한 부분 보기 ${i}`, type: 'detail', why: '한 부분만 말하고 있어요.' },
    ],
    ev: [ev], evQ: '어느 문장에서 알 수 있나요?', evNote: `${circled(ev)}에 쓰여 있어요.`,
  });
  const qs = [evQ(1, at(2)), evQ(2, at(21)), evQ(3, at(33)), evQ(4, at(40)), {
    id: `K${n}-5`, skill: '중심 생각', q: '이 기사가 전하는 중심 내용은 무엇인가요?',
    opts: [
      { t: '마을에 도서관이 새로 열렸다', ok: true },
      { t: '도서관이 문을 닫았다', type: 'flip', why: '반대예요. 제목을 다시 보세요.' },
      { t: '이야기 한 줄만', type: 'detail', why: '한 부분이에요.' },
      { t: '바람이 많이 불었다', type: 'make', why: '기사에 없는 이야기예요.' },
    ],
    ev: null, doneNote: '제목과 첫 문장을 이어 읽으면 보여요.', hint2: '제목을 다시 읽어 보세요.',
  }];
  return {
    id: `K${n}`, kind: 'news', layout: 'rows', icon: '📚', title: '별빛 도서관이 문을 열었어요', genre: '신문 기사', skill: '기사 읽기',
    source: '지어낸 어린이신문 2026년 1월 1일 1면 · 시험 기자',
    meta: ['📰 신문 기사', '[4국02-01] 시험'], news: { article: `${n - 700}-1`, paper: '지어낸 어린이신문', date: '2026년 1월 1일', page: '1면' },
    deco: { captions: ['도서관 앞에 모인 아이들(지어낸 사진 설명)'], boxes: [{ name: '알아봐요', title: '도서관이란?', body: ['책을 모아 둔 곳이에요.'] }] },
    words: [['도서관', '책을 모아 두고 읽게 하는 곳']],
    lines, qs, ...o.extra,
  };
}
/** 지어낸 신문 논술 주제 — 카드 n과 같은 번호 */
function topic(n, o = {}) {
  return {
    id: `N${n}`, icon: '🌙', card: `K${n}`, intro: '별빛 도서관 기사를 읽고 생각해 봐요.', q: '마을 도서관은 밤에도 열어야 할까요?',
    yes: { label: '열어야 해요', claim: '나는 밤에도 열어야 한다고 생각해요.', close: '그래도 나는 밤에도 여는 것이 좋다고 생각해요.', reasons: ['낮에 바쁜 사람도 책을 빌릴 수 있어요.', '밤에 조용히 책을 읽을 수 있어요.', '어른들이 일을 마치고 올 수 있어요.'], ev: [[21], [22], []] },
    no: { label: '닫아야 해요', claim: '나는 밤에는 닫아야 한다고 생각해요.', close: '그래도 나는 밤에는 쉬는 것이 좋다고 생각해요.', reasons: ['일하는 사람도 쉬어야 해요.', '밤에는 전기를 많이 써요.', '밤길은 어두워서 위험해요.'], ev: [[33], [], [34]] },
    off: [{ t: '도서관 지붕은 파란색이에요.', why: '밤에 여는 것과 상관없는 말이에요.', ev: [5] }, { t: '도서관에 수영장이 생겼어요.', why: '글에 없는 이야기예요. 기사에 수영장 말은 없어요.', made: true }],
    ...o,
  };
}
const row = (n, o = {}) => ({ card: card(n, o.card), ...(o.noTopic ? {} : { topic: topic(n, o.topic) }) });

// ───────────────────── 국어 카드 검사 ─────────────────────
test('📰 신문 카드 — 40줄 · ㉑~㊵ 근거 · 물음 다섯 · 사진 설명·상자(deco)가 통과한다', () => {
  assert.equal(NEWS_KIND, '📰 신문 기사');
  assert.equal(NEWS_LINES_MAX, 40);
  assert.deepEqual([circled(20), circled(21), circled(35), circled(36), circled(40), circled(50), circled(51)], ['⑳', '㉑', '㉟', '㊱', '㊵', '㊿', '51']);
  assert.deepEqual(checkNewsCard(card(701)), []);
  assert.deepEqual(checkNewsCard(card(702, { lines: 6 })), [], '짧은 기사(6줄)도');
  assert.equal(checkNewsCard(card(703, { extra: { deco: undefined } })).length, 1, 'deco: undefined는 칸이 있는 것 — 꼴이 틀림');
  const noDeco = card(703); delete noDeco.deco;
  assert.deepEqual(checkNewsCard(noDeco), [], 'deco는 없어도 된다');
  assert.ok(isNews(card(701)) && !isNews({ kind: 'practice' }));
  assert.deepEqual(['K700', 'K701', 'K999', 'K1000', 'K0701', 'K12', 'N701', 701].map(isNewsId), [false, true, true, false, false, false, false, false]);
});

test('📰 신문 카드 막음 — kind·번호 몫·rows·물음 다섯·[제목]·41줄·㊶·source·news·deco 꼴·쓰기/듣기 칸', () => {
  const bad = (c, re) => assert.ok(checkNewsCard(c).some((m) => re.test(m)), `${re} — ${checkNewsCard(c).join(' / ')}`);
  bad({ ...card(701), kind: 'practice' }, /kind는 news/);
  bad({ ...card(701), id: 'K700', qs: card(701).qs.map((q, i) => ({ ...q, id: `K700-${i + 1}` })) }, /K701~K999/);
  bad({ ...card(701), layout: undefined }, /layout rows/);
  bad({ ...card(701), qs: card(701).qs.slice(0, 4) }, /정확히 5개/);
  bad({ ...card(701), lines: ['바람숲 이야기예요.', ...card(701).lines.slice(1)] }, /\[제목\]/);
  bad({ ...card(701), lines: [...card(701).lines, '마흔한째 문장이에요.'] }, /lines는 1~40개/);
  const far = card(701);
  far.qs[0].evNote = '㊶에 쓰여 있어요.';
  bad(far, /㊶은 글에 없는 번호/);
  bad({ ...card(701), source: undefined }, /source/);
  bad({ ...card(701), news: { paper: '지어낸 어린이신문' } }, /news는/);
  bad({ ...card(701), news: { article: '1-1', date: '' } }, /news\.date는 글/);
  bad({ ...card(701), deco: { captions: [] } }, /captions/);
  bad({ ...card(701), deco: { photo: ['x'] } }, /captions·boxes만/);
  bad({ ...card(701), deco: {} }, /deco가 비었어요/);
  bad({ ...card(701), deco: { boxes: [{ name: '', body: ['글'] }] } }, /상자 이름/);
  bad({ ...card(701), deco: { boxes: [{ name: '상자', body: [] }] } }, /body는/);
  bad({ ...card(701), deco: { boxes: [{ name: '상자', title: '', body: ['글'] }] } }, /title은 글/);
  bad({ ...card(701), write: { q: '써 보기' } }, /write가 없어요/);
  bad({ ...card(701), listen: { who: [] } }, /listen/);
  bad({ ...card(701), author: '누구' }, /author가 없어요/);
  // 겹친 id · validNewsCards (깨진 것·겹친 것은 뺀다 — 카드 목록을 받는다)
  const ids = new Set();
  assert.deepEqual(checkNewsCard(card(705), ids), []);
  assert.ok(checkNewsCard(card(705), ids).some((m) => /겹쳐요/.test(m)));
  assert.deepEqual(validNewsCards([card(701), { ...card(702), kind: 'practice' }, card(701), card(703), null]).map((c) => c.id), ['K701', 'K703']);
  assert.deepEqual(validNewsCards({ cards: [card(701)] }), [], '목록이 아니면 빈 것');
});

test('🔒 공개 원고 막음 — reading.json은 kind news·K701~K999를 못 쓴다 · 20줄 그대로 · ㉑도 글에 있는 번호만 · 지금 원고는 그대로 통과', () => {
  const data = JSON.parse(read('coach/korean/reading.json'));
  assert.deepEqual(checkContent(data), [], '지금 공개 원고는 그대로 통과');
  assert.equal(validCards(data).length, data.cards.length);
  assert.ok(data.cards.every((c) => !isNewsId(c.id) && c.kind !== 'news'), '공개 원고에 신문 몫 번호 없음');
  const pub = data.cards.find((c) => c.kind === 'practice' && Array.isArray(c.lines) && c.lines.length < 20 && !c.listen && !c.write);
  assert.ok(pub, '공개 연습 카드 하나');
  const asNews = { ...pub, id: 'K701', qs: pub.qs.map((q, i) => ({ ...q, id: `K701-${i + 1}` })) };
  assert.ok(checkCard(asNews).some((m) => /신문 몫/.test(m)), '공개 원고가 K701을 쓰면 막는다');
  assert.ok(checkCard(card(701)).some((m) => /신문 원고에만/.test(m)), 'kind news는 공개 원고에서 막는다');
  assert.ok(checkContent({ cards: [card(701)] }).length > 0, 'check.mjs가 부르는 checkContent도');
  assert.deepEqual(validCards({ cards: [card(701)] }), [], '화면의 validCards도 뺀다');
  assert.deepEqual(checkCard(card(701), new Set(), { news: true }), [], 'opt.news면 받는다');
  // 20줄 상한은 공개 원고 그대로 · 21줄은 opt.news에서만
  const long = { ...pub, lines: [...pub.lines, ...Array.from({ length: 21 - pub.lines.length }, (_, k) => `더한 문장 ${k + 1}이에요.`)] };
  assert.ok(checkCard(long).some((m) => /lines는 1~20개의 문장/.test(m)));
  // ㉑은 이제 번호로 읽힌다 — 공개 글(20줄 이하)에 쓰면 글에 없는 번호
  const q0 = pub.qs.find((q) => Array.isArray(q.ev));
  const circ = { ...pub, qs: pub.qs.map((q) => (q === q0 ? { ...q, evNote: `${q.evNote} ㉑` } : q)) };
  assert.ok(checkCard(circ).some((m) => /㉑은 글에 없는 번호/.test(m)));
});

// ───────────────────── 논술 주제 검사 ─────────────────────
test('🖊️ 신문 논술 주제 — 독서 논술 꼴 + N701~N999 · 카드와 같은 번호 · 근거 줄은 그 기사 줄 수까지', () => {
  assert.deepEqual(checkNewsTopic(topic(701), card(701)), []);
  assert.ok(isNewsTopicId('N701') && isNewsTopicId('N999') && !isNewsTopicId('N700') && !isNewsTopicId('N1000') && !isNewsTopicId('K701'));
  const bad = (t, c, re) => assert.ok(checkNewsTopic(t, c).some((m) => re.test(m)), `${re} — ${checkNewsTopic(t, c).join(' / ')}`);
  bad(topic(701, { id: 'N702' }), card(701), /같은 수 N701/);
  bad(topic(701, { card: 'K702' }), card(701), /card는 K701/);
  bad(topic(701), null, /신문 카드가 없어요/);
  bad(topic(701), { ...card(701), id: 'K12' }, /신문 카드가 없어요/);
  bad(topic(701, { card: undefined }), card(701), /card\(이어진 신문 카드/);
  bad(topic(701), card(701, { lines: 30 }), /근거 줄 번호는 1~30/);
  bad(topic(701, { off: [{ t: '지붕은 파래요.', why: '상관없어요.', ev: [45] }, topic(701).off[1]] }), card(701), /근거 줄 번호는 1~40/);
  bad(topic(701, { q: '밤에도 열어요.' }), card(701), /까요\?/);
  bad(topic(701, { intro: '' }), card(701), /intro/);
  assert.deepEqual(checkNewsTopic(null, card(701)), ['주제가 객체가 아님']);
});

test('🔒 공개 논술 원고 막음 — N701~N999·신문 카드 이어짐은 못 쓴다 · 지금 원고는 그대로 통과', () => {
  const json = JSON.parse(read('coach/korean/nonsul.json'));
  assert.deepEqual(checkNonsul(json), [], '지금 공개 원고는 그대로 통과');
  assert.equal(allTopics(json).length, json.topics.length);
  const life = json.topics.find((t) => t.card === undefined);
  const withNews = { ...json, topics: [...json.topics, { ...life, id: 'N701' }] };
  assert.ok(checkNonsul(withNews).some((m) => /N701: N701~N999는 신문 몫/.test(m)));
  assert.equal(allTopics(withNews).length, json.topics.length, '화면도 뺀다');
  const reading = json.topics.find((t) => t.card !== undefined);
  assert.ok(checkNonsul({ ...json, topics: [...json.topics, { ...reading, id: 'N650', card: 'K701' }] }).some((m) => /신문 카드\(K701\)/.test(m)));
});

// ───────────────────── 📦 bnews 묶음 ─────────────────────
const day = (m, d, y = 2026) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
test('📦 NEWS_ORDER — 104편 · K701~K805 신문 날짜 차례 · K787 없음 · □ 네 기사(K704·K744·K748·K761)는 맨 뒤', () => {
  assert.equal(NEWS_ORDER.length, 104);
  assert.equal(new Set(NEWS_ORDER).size, 104);
  assert.ok(NEWS_ORDER.every(isNewsId));
  assert.ok(!NEWS_ORDER.includes('K787'));
  assert.deepEqual(NEWS_ORDER.slice(-4), ['K704', 'K744', 'K748', 'K761']);
  assert.deepEqual(NEWS_ORDER.slice(0, 5), ['K701', 'K702', 'K703', 'K705', 'K706']);
  const body = NEWS_ORDER.slice(0, -4).map((id) => Number(id.slice(1)));
  assert.ok(body.every((n, k) => k === 0 || n > body[k - 1]), '앞 100편은 번호(신문 날짜) 차례');
  const all = Array.from({ length: 105 }, (_, i) => `K${701 + i}`).filter((id) => id !== 'K787');
  assert.deepEqual([...NEWS_ORDER].sort(), all.sort(), 'K701~K805에서 K787만 빠짐');
  const b = DRIP.bundles.find((x) => x.key === 'bnews');
  assert.deepEqual(b, { key: 'bnews', order: NEWS_ORDER }, '앞 묶음 없이(after 없음) 따로');
  assert.equal(DRIP.bundles.flatMap((x) => x.order).length, new Set(DRIP.bundles.flatMap((x) => x.order)).size, '다른 묶음과 겹치는 글 없음');
});

test('📦 bnews — 처음 받은 날 두 편 · 날마다 두 편 · b411b와 따로(같이 열리면 하루 넷) · 신문 글이 원고에 들어와야 시작 날을 적는다', () => {
  const pub = ['K1', ...DRIP.bundles.filter((x) => x.key !== 'bnews').flatMap((x) => x.order)].map((id) => ({ id }));
  const news = NEWS_ORDER.map((id) => ({ id }));
  const ALL = [...pub, ...news];
  const S = { b320: day(10, 23), b322: day(10, 24), b347: day(10, 26), b372: day(10, 31), b380: day(11, 2), b382: day(11, 3), b389: day(11, 10), b411a: day(11, 20), b411b: day(11, 20), bnews: day(12, 12) };
  const seenNews = (t) => visibleCards(ALL, S, t).filter((c) => isNewsId(c.id)).map((c) => c.id);
  assert.deepEqual(seenNews(day(12, 11)), ['K701', 'K702'], '시작 날 전(시계를 뒤로)이면 첫날 몫 — 앞 묶음 없는 묶음과 같다');
  assert.deepEqual(seenNews(day(12, 12)), ['K701', 'K702'], '첫날 두 편');
  assert.deepEqual(seenNews(day(12, 13)), ['K701', 'K702', 'K703', 'K705']);
  assert.equal(startsOf(S, day(12, 12)).bnews, day(12, 12), '앞 묶음과 이어 세지 않는다');
  assert.equal(startsOf(S, day(12, 12)).b411b, day(12, 10), 'b411b는 그대로');
  // b411b(12/10~12/15)와 같이 열리는 동안은 하루 넷
  const n = (t) => visibleCards(ALL, S, t).length;
  for (let d = 13; d <= 15; d++) assert.equal(n(day(12, d)) - n(day(12, d - 1)), 4, `12/${d} — 국어 새 글 둘 + 신문 둘`);
  assert.equal(n(day(12, 17)) - n(day(12, 16)), 2, 'b411b가 다 열린 뒤엔 신문 둘만');
  assert.deepEqual(freshIds(S, day(12, 13)).filter(isNewsId), ['K703', 'K705'], '🌱 오늘 새 기사');
  assert.equal(seenNews(day(1, 31, 2027)).length, 102, '51일째');
  assert.equal(seenNews(day(2, 1, 2027)).length, 104, '52일째에 모두');
  assert.deepEqual(seenNews(day(2, 3, 2027)).slice(-4), ['K704', 'K744', 'K748', 'K761'], '□ 네 기사는 맨 뒤');
  // 시작 날 — 신문 글이 원고(넘긴 ids)에 있어야
  const p = { korDrip: { b320: day(10, 23) } };
  assert.equal(needsStart(p.korDrip, ['K121']), false);
  assert.equal(needsStart({ ...S, bnews: undefined }, ['K701']), true);
  assert.equal(dripStartRule(p, day(12, 12), ['K121']).why, 'same', '공개 글만이면 bnews를 적지 않는다');
  assert.equal(p.korDrip.bnews, undefined);
  assert.deepEqual(dripStartRule(p, day(12, 12), ['K121', 'K701']), { ok: true, set: 1 });
  assert.equal(p.korDrip.bnews, day(12, 12));
  assert.equal(withFirst({}, day(12, 12)).bnews, day(12, 12));
});

// ───────────────────── 받기 · 사본 (news.js) ─────────────────────
test('📰 newsOf — 좋은 줄 · 깨진 카드 · 겹친 id · 주제만 깨짐(카드는 받음) · 주제 없는 기사 · 상한 · 저장용 줄은 고친 꼴', () => {
  const good = row(701);
  const r = newsOf([good, row(702, { noTopic: true }), { card: { id: 'K703' } }, row(701), row(704, { topic: { id: 'N799' } }), 'x', { topic: topic(705) }]);
  assert.deepEqual(r.cards.map((c) => c.id), ['K701', 'K702', 'K704']);
  assert.deepEqual(r.topics.map((t) => t.id), ['N701']);
  assert.equal(r.bad, 5, '깨진 카드 · 겹친 K701 · 깨진 주제 N799 · 글 · 카드 없는 줄');
  assert.deepEqual(r.raws, [good, { card: card(702) }, { card: card(704) }], '저장용 — 쓴 줄만 · 깨진 주제는 빼고 카드만');
  assert.deepEqual(newsOf(null), { cards: [], topics: [], bad: 0, raws: [] });
  assert.equal(MAX_NEWS, 300);
  const cap = newsOf([row(701), row(702), row(703)], 2);
  assert.deepEqual([cap.cards.length, cap.bad], [2, 1], '상한을 넘은 줄은 빠진다');
  // 경로마다 — 앞 파일의 id가 이긴다 · bad는 경로마다(겹침은 뒤 파일 몫)
  const f = newsFilesOf({ [NEWS_PATHS[0]]: [row(701)], [NEWS_PATHS[1]]: [row(701), row(702)], 'news/n9.json': [row(709)] });
  assert.deepEqual(f.cards.map((c) => c.id), ['K701', 'K702']);
  assert.deepEqual(f.bad, { [NEWS_PATHS[0]]: 0, [NEWS_PATHS[1]]: 1 }, '모르는 경로는 안 본다');
});

test('📥 경로·이름 — news/n1~n4 · upload READ_NAMES 「📰 신문 1~4」 · 받지 않은 기사 · 「신문 확인해 줘」', () => {
  assert.deepEqual(NEWS_PATHS, ['news/n1.json', 'news/n2.json', 'news/n3.json', 'news/n4.json']);
  assert.deepEqual(PRIVATE_NEWS, NEWS_PATHS, 'upload.js와 같은 경로');
  assert.deepEqual([SYNC_MS, LIST_MS], [600000, 30000]);
  const fmt = () => 't';
  assert.match(readSummary({ 'news/n2.json': { ok: true, at: 1, n: 26 } }, fmt), /📰 신문 2 ✅ t \(26개\)/);
  assert.match(readSummary({ 'news/n1.json': { ok: true, at: 1, n: 26, check: { rows: 26, bad: 2 } } }, fmt), /📰 신문 1 ⚠️ t \(26개 — 받지 않은 기사 2 · Claude에게 "신문 확인해 줘"\)/);
  assert.match(readSummary({ 'news/n4.json': { ok: true, at: 1, n: 0, missing: true } }, fmt), /📰 신문 4 · 아직 없음/);
});

test('📰 loadNews — blobs 사본을 한 번 읽어 메모리에 · 못 읽으면 빈 것 · 한 번만', async () => {
  // 사본 왕복 (tests/fakeidb.js) — 넘긴 경로만 바꾸고 나머지는 그대로
  assert.equal(await getNewsCache(), null);
  fakeIdb.put('blobs', { id: 'music:list', items: [], at: 1 });
  const a = await putNewsCache({ [NEWS_PATHS[0]]: [row(701)], [NEWS_PATHS[1]]: [row(702)] });
  assert.equal(a.id, NEWS_LIST_ID);
  await putNewsCache({ [NEWS_PATHS[1]]: [row(703)], 'bad': 'x' });
  const c = await getNewsCache();
  assert.deepEqual(Object.keys(c.files), [NEWS_PATHS[0], NEWS_PATHS[1]], '목록이 아닌 것은 안 넣는다');
  assert.deepEqual(c.files[NEWS_PATHS[1]].map((x) => x.card.id), ['K703'], '받은 파일만 바뀐다');
  assert.deepEqual(c.files[NEWS_PATHS[0]].map((x) => x.card.id), ['K701'], '안 넘긴 파일은 그대로');
  assert.deepEqual(fakeIdb.get('blobs', 'music:list').items, [], '다른 blobs는 그대로');
  fakeIdb.failNext('blobs');
  await assert.rejects(putNewsCache({ [NEWS_PATHS[0]]: [] }));
  assert.deepEqual((await getNewsCache()).files[NEWS_PATHS[0]].map((x) => x.card.id), ['K701'], '못 쓰면 그대로');
  // 새 실행(따로 불러온 news.js) — 사본에서 읽는다 · 한 번만
  const m1 = await import('../js/news.js?run=1');
  assert.deepEqual(m1.newsNow(), { cards: [], topics: [] }, '읽기 전엔 빈 것');
  const got = await m1.loadNews();
  assert.deepEqual(got.cards.map((x) => x.id), ['K701', 'K703']);
  assert.deepEqual(got.topics.map((x) => x.id), ['N701', 'N703']);
  let calls = 0;
  await m1.loadNews({ getCache: async () => { calls += 1; return null; } });
  assert.equal(calls, 0, '한 번만 읽는다');
  const x = m1.newsNow(); x.cards.length = 0;
  assert.equal(m1.newsNow().cards.length, 2, '받은 쪽이 목록을 고쳐도 사본은 그대로');
  // 못 읽으면 빈 것 · 깨진 사본 줄은 다시 거른다
  const m2 = await import('../js/news.js?run=2');
  assert.deepEqual(await m2.loadNews({ getCache: async () => { throw new Error('읽기 실패'); } }), { cards: [], topics: [] });
  const m3 = await import('../js/news.js?run=3');
  assert.deepEqual((await m3.loadNews({ getCache: async () => ({ files: { [NEWS_PATHS[0]]: [row(701), { card: { id: 'K702' } }], 'news/x.json': [row(705)] } }) })).cards.map((x) => x.id), ['K701']);
  assert.ok([...read('js/news.js').matchAll(/import\('\.\/(\w+)\.js'\)/g)].every((x) => x[1] === 'upload'), '쓸 때 불러오는 것은 upload만 — 화면을 import하지 않는다');
  assert.deepEqual([...read('js/news.js').matchAll(/^import .* from '\.\/(\w+)\.js';/gm)].map((m) => m[1]), ['korean', 'nonsul', 'db'], '정적 import는 검사·사본만(upload는 쓸 때)');
});

test('📰 syncNews — 10분에 한 번 · 열쇠 없음/못 받음은 그대로 · 파일마다 따로(못 받은·모두 깨진 파일은 그대로) · 겹침 · 저장 실패 · 📥 noteCheck', async () => {
  store.clear();
  const m = await import('../js/news.js?run=sync');
  const notes = [];
  const puts = [];
  let calls = 0;
  let putFail = false;
  const deps = (files, t, more = {}) => ({
    now: () => t,
    readList: async (p) => { calls += 1; const v = files[p]; if (v instanceof Error) throw v; return v === undefined ? [] : v; },
    noteCheck: async (p, c) => { notes.push([p, c]); },
    getCache: async () => null,
    putCache: async (w) => { if (putFail) throw new Error('가득 참'); puts.push(w); },
    ...more,
  });
  const [n1, n2, n3, n4] = NEWS_PATHS;
  const ids = (r) => r.cards.map((c) => c.id);
  // 처음 — n1 좋은 둘 + 깨진 줄 + 겹침 · n2 주제만 깨짐 · n3 실패 · n4 없음(빈 목록)
  let r = await m.syncNews(false, deps({ [n1]: [row(701), row(702, { noTopic: true }), { card: { id: 'K703' } }, row(701)], [n2]: [row(704, { topic: { id: 'N799' } })], [n3]: new Error('인터넷') }, 1000));
  assert.deepEqual(ids(r), ['K701', 'K702', 'K704']);
  assert.deepEqual(r.topics.map((t) => t.id), ['N701']);
  assert.equal(r.changed, true);
  assert.deepEqual(notes.splice(0), [[n1, { rows: 4, bad: 2 }], [n2, { rows: 1, bad: 1 }]], '받은 파일마다 받지 않은 기사 수 · 못 받은 파일은 적지 않는다(받기 줄에 ❌)');
  assert.deepEqual(Object.keys(puts.pop()), [n1, n2], '받은 파일만 사본에');
  assert.deepEqual(ids(m.newsNow()), ['K701', 'K702', 'K704']);
  // 10분 안엔 묻지 않는다
  calls = 0;
  r = await m.syncNews(false, deps({ [n1]: [row(709)] }, 1000 + 60000));
  assert.equal(calls, 0);
  assert.deepEqual([ids(r), r.changed], [['K701', 'K702', 'K704'], false]);
  // 열쇠 없음(readPrivateList가 빈 목록) — 받아 둔 것 그대로
  r = await m.syncNews(false, deps({}, 1000 + 11 * 60000));
  assert.equal(calls, 4, '10분 지나면 네 파일을 묻는다');
  assert.deepEqual([ids(r), r.changed], [['K701', 'K702', 'K704'], false]);
  assert.equal(puts.length, 0);
  // n1이 모두 깨지면 n1은 그대로 · n2는 새것으로
  r = await m.syncNews(true, deps({ [n1]: [{ card: { id: 'K799' } }], [n2]: [row(705)] }, 1000 + 12 * 60000));
  assert.deepEqual(ids(r), ['K701', 'K702', 'K705']);
  assert.deepEqual(notes.splice(0), [[n1, { rows: 1, bad: 1 }], [n2, { rows: 1, bad: 0 }]]);
  assert.deepEqual(Object.keys(puts.pop()), [n2], '모두 깨진 n1은 사본을 안 바꾼다');
  // 똑같은 파일은 다시 쓰지 않는다
  r = await m.syncNews(true, deps({ [n1]: new Error('끊김'), [n2]: [row(705)] }, 1000 + 13 * 60000));
  assert.deepEqual([ids(r), r.changed, puts.length], [['K701', 'K702', 'K705'], false, 0]);
  assert.deepEqual(notes.splice(0), [[n2, { rows: 1, bad: 0 }]]);
  // 뒤 파일이 앞 파일과 겹치면 뒤 파일 몫이 빠진다
  r = await m.syncNews(true, deps({ [n3]: [row(701), row(706)] }, 1000 + 14 * 60000));
  assert.deepEqual(ids(r), ['K701', 'K702', 'K705', 'K706']);
  assert.deepEqual(notes.splice(0), [[n3, { rows: 2, bad: 1 }]]);
  // 저장 공간이 차서 못 두면 받아 둔 것 그대로 · 📥에 모두 못 받음
  putFail = true;
  r = await m.syncNews(true, deps({ [n4]: [row(707)] }, 1000 + 15 * 60000));
  assert.deepEqual([ids(r), r.changed], [['K701', 'K702', 'K705', 'K706'], false]);
  assert.deepEqual(notes.splice(0), [[n4, { rows: 1, bad: 1 }]]);
  putFail = false;
  // 30초 넘게 걸리는 파일은 끊고 나머지만
  r = await m.syncNews(true, deps({ [n4]: [row(707)] }, 1000 + 16 * 60000, { listMs: 20, readList: async (p) => (p === n1 ? new Promise(() => {}) : p === n4 ? [row(707)] : []) }));
  assert.deepEqual(ids(r), ['K701', 'K702', 'K705', 'K706', 'K707']);
  assert.equal(r.changed, true);
  // 받는 중에 또 부르면 같은 약속
  const p1 = m.syncNews(true, deps({}, 1000 + 17 * 60000));
  assert.equal(m.syncNews(true, deps({}, 1000 + 17 * 60000)), p1);
  await p1;
});

test('📰 syncNews — 진짜 사본(blobs)에 두고 새 실행이 그대로 읽는다 · 열쇠 없는 기기는 빈 것', async () => {
  store.clear();
  fakeIdb.clear();
  const m = await import('../js/news.js?run=blobs');
  await m.syncNews(true, { now: () => 5000, readList: async (p) => (p === NEWS_PATHS[0] ? [row(711), row(712)] : []), noteCheck: async () => {} });
  const rec = fakeIdb.get('blobs', NEWS_LIST_ID);
  assert.deepEqual(rec.files[NEWS_PATHS[0]].map((x) => x.card.id), ['K711', 'K712'], 'blobs news:list에 받은 파일');
  const again = await import('../js/news.js?run=blobs2');
  assert.deepEqual((await again.loadNews()).cards.map((c) => c.id), ['K711', 'K712']);
  // 열쇠 없는 기기 — 받을 것도 사본도 없으면 빈 것(📰 칸이 안 보인다)
  fakeIdb.clear();
  const none = await import('../js/news.js?run=nokey');
  assert.deepEqual(await none.syncNews(true, { now: () => 6000, readList: async () => [], noteCheck: async () => {} }), { cards: [], topics: [], changed: false });
  // 메인 모듈(정적 import)은 이 시험에서 한 번도 안 읽었다 — 읽기 전엔 빈 것
  assert.deepEqual(newsNow(), { cards: [], topics: [] });
  assert.equal(typeof loadNews, 'function');
  assert.equal(typeof syncNews, 'function');
});

test('🧱 셸·판 — sw.js에 news.js · CACHE_VERSION = APP_VERSION = v428 이상', () => {
  const sw = read('sw.js');
  assert.ok(sw.includes("'./js/news.js'"));
  const ver = /const CACHE_VERSION = '(v\d+)';/.exec(sw)[1];
  assert.equal(ver, APP_VERSION);
  assert.ok(Number(APP_VERSION.slice(1)) >= 428);
});

test('📰 두 창 — A 창이 받아 둔 기사를 B 창도 본다(10분 막음은 같이 써도 기기 사본은 다시 읽음 · 저장이 돌려준 합친 기록으로) (🔍 Codex 230차 #2)', async () => {
  store.clear();
  // 한 기기의 blobs — putNewsCache처럼 옛 사본에 겹쳐 넣고 합친 기록을 돌려준다
  let blob = null;
  let clock = 1_000_000;
  const getCache = async () => blob;
  const putCache = async (w) => { clock += 1; blob = { id: 'news:list', files: { ...(blob ? blob.files : {}), ...w }, at: clock }; return blob; };
  const [n1, n2] = NEWS_PATHS;
  const A = await import('../js/news.js?run=winA');
  const B = await import('../js/news.js?run=winB');
  await A.loadNews({ getCache });
  await B.loadNews({ getCache });
  // A가 n1을 받는다 → blobs와 A 메모리
  const t0 = 50_000_000;
  const ra = await A.syncNews(true, { now: () => t0, readList: async (p) => (p === n1 ? [row(701), row(702)] : []), noteCheck: async () => {}, getCache, putCache });
  assert.equal(ra.changed, true);
  assert.deepEqual(ra.cards.map((c) => c.id), ['K701', 'K702']);
  // B — 10분 막음 안이고 인터넷도 없지만, 기기 사본이 더 새로우니 다시 읽는다
  const rb = await B.syncNews(false, { now: () => t0 + 1000, readList: async () => { throw new Error('인터넷 없음'); }, noteCheck: async () => {}, getCache, putCache });
  assert.equal(rb.changed, true, 'B 화면이 다시 그려야 한다');
  assert.deepEqual(B.newsNow().cards.map((c) => c.id), ['K701', 'K702']);
  // B가 n2를 받아 저장 → 합친 기록(n1 + n2)으로 메모리를 짓는다 · A도 다음에 본다
  const rb2 = await B.syncNews(true, { now: () => t0 + 2000, readList: async (p) => (p === n2 ? [row(730)] : []), noteCheck: async () => {}, getCache, putCache });
  assert.deepEqual(rb2.cards.map((c) => c.id), ['K701', 'K702', 'K730']);
  const ra2 = await A.syncNews(false, { now: () => t0 + 3000, readList: async () => [], noteCheck: async () => {}, getCache, putCache });
  assert.equal(ra2.changed, true);
  assert.deepEqual(ra2.cards.map((c) => c.id), ['K701', 'K702', 'K730']);
  // 기기 사본이 그대로면 changed가 아니다
  const ra3 = await A.syncNews(false, { now: () => t0 + 4000, readList: async () => [], noteCheck: async () => {}, getCache, putCache });
  assert.equal(ra3.changed, false);
  // 시계를 뒤로 돌린 뒤의 저장(쓴 때가 더 작음)도 놓치지 않는다 — 「더 새로운가」가 아니라 「다른가」 (Codex 231차)
  blob = { id: 'news:list', files: { ...blob.files, [n1]: [row(701), row(702), row(703)].map((r) => ({ card: r.card, topic: r.topic })) }, at: 5 };
  const ra4 = await A.syncNews(false, { now: () => t0 + 5000, readList: async () => [], noteCheck: async () => {}, getCache, putCache });
  assert.equal(ra4.changed, true);
  assert.ok(A.newsNow().cards.some((c) => c.id === 'K703'));
  // 두 창의 저장 차례가 엇갈려도(A가 쓴 뒤 B가 더 씀) A는 다음 받기 때 B의 것을 본다 — 따로 적는 표시가 없어 덮어쓸 것도 없다
  const rb3 = await B.syncNews(true, { now: () => t0 + 6000, readList: async (p) => (p === n2 ? [row(730), row(731)] : []), noteCheck: async () => {}, getCache, putCache });
  assert.ok(rb3.cards.some((c) => c.id === 'K731'));
  const ra5 = await A.syncNews(false, { now: () => t0 + 7000, readList: async () => { throw new Error('인터넷 없음'); }, noteCheck: async () => {}, getCache, putCache });
  assert.equal(ra5.changed, true);
  assert.ok(ra5.cards.some((c) => c.id === 'K731'));
});

test('📰 두 창 — 내가 받는 사이 다른 창이 저장해도, 저장이 돌려준 합친 기록으로 그 기사까지 바로 보인다 (Codex 230차 #2)', async () => {
  store.clear();
  let blob = null;
  let clock = 2_000_000;
  const getCache = async () => blob;
  const putCache = async (w) => { clock += 1; blob = { id: 'news:list', files: { ...(blob ? blob.files : {}), ...w }, at: clock }; return blob; };
  const [n1, n2] = NEWS_PATHS;
  const A = await import('../js/news.js?run=raceA');
  await A.loadNews({ getCache });
  const r = await A.syncNews(true, {
    now: () => 60_000_000,
    // A가 n1을 받는 사이 B 창이 n2를 저장한다
    readList: async (p) => { if (p === n1) { clock += 1; blob = { id: 'news:list', files: { ...(blob ? blob.files : {}), [n2]: [row(740)] }, at: clock }; return [row(701)]; } return []; },
    noteCheck: async () => {}, getCache, putCache,
  });
  assert.deepEqual(r.cards.map((c) => c.id), ['K701', 'K740'], '이번 받기 결과에 B가 저장한 기사도');
});

test('📰 blobs 사본의 at은 늘 커진다 — 같은 밀리초 두 저장·뒤로 돌린 시계에서도 다른 창이 바뀐 사본을 알아본다 (🔍 Codex 232차)', async () => {
  fakeIdb.clear();
  const realNow = Date.now;
  try {
    Date.now = () => 7_000_000; // 시계가 멈춘 것처럼 — 같은 밀리초
    const a = await putNewsCache({ [NEWS_PATHS[0]]: [row(701)] });
    const b = await putNewsCache({ [NEWS_PATHS[1]]: [row(702)] });
    assert.ok(b.at > a.at, `같은 밀리초여도 at이 커진다 (${a.at} → ${b.at})`);
    Date.now = () => 1_000; // 시계를 뒤로
    const c = await putNewsCache({ [NEWS_PATHS[2]]: [row(703)] });
    assert.ok(c.at > b.at, '뒤로 돌린 시계에서도');
    // 다른 창(따로 불러온 모듈)이 읽은 뒤 같은 밀리초에 또 저장해도 그 창은 바뀐 것을 본다
    Date.now = () => 7_000_000;
    const W = await import('../js/news.js?run=sameMs');
    await W.loadNews();
    assert.equal(W.newsNow().cards.length, 3);
    await putNewsCache({ [NEWS_PATHS[3]]: [row(780)] });
    const r = await W.syncNews(false, { now: () => 7_000_000, readList: async () => [], noteCheck: async () => {} });
    assert.equal(r.changed, true);
    assert.ok(r.cards.some((x) => x.id === 'K780'));
  } finally {
    Date.now = realNow;
  }
});
