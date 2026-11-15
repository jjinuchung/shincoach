// v428 📰 신문 논술 (2026-11-15 아버님 기본안 다섯 「추천대로」) — node --test tests/news428ns.test.js
//  신문 기사(국어 📰 카드 K701~K999)로 하는 논술 = 생활 논술과 같은 판 · 주제 N701~N999(비공개 저장소 → news.js 사본)
//  하루 몫은 생활 논술과 따로: 새 신문 주제 하루 둘(★ 받은 기사만) · 💰(그날 첫 판)·🎯 판 몫은 nonsulNewsDay·nonsulNewsBall ·
//  생활 새 주제 넷은 신문 판에 안 줄어든다 · ⭐·⚡·처음 ⭐ 🎯는 같다 · ✍️ 짧은 글·💡 내 이유는 없다 · 낚시터·여행 「논술 한 날」은 둘 다
//  ★ 기사 글은 저작권 — 이 시험의 기사·주제는 모두 지어낸 것이다(실제 기사 문장·제목을 넣지 않는다)
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  NONSUL_COINS, SOLVED, NEW_TOPICS_PER_DAY, NEWS_TOPICS_PER_DAY, allTopics, planTopic, nonsulWaitNew, planNewsTopic, newsWaitNew, newsTopicsOpen,
  nonsulRule, nonsulFinishText, nonsulTodayLine, reasonAddRule, checkNewsTopic,
} from '../js/nonsul.js';
import { dayNum, circled, checkNewsCard, NEWS_LINES_MAX } from '../js/korean.js';
import { korPrizeKey, korPrizeReport, KOR_PRIZE_KINDS } from '../js/korwords.js';
import { emptyProfile, cloneProfile, mergeStatRecord, putNewsCache } from '../js/db.js';
import { initProfile, flushProfile, reloadProfile, nonsulFinish, nonsulMap, nonsulDayMap, nonsulNewsDayMap, nonsulDoneDayMap, korBallToday } from '../js/xp.js';
import { profileKorDays } from '../js/korday.js';

void fakeIdb;
const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const body = (src, head) => { const i = src.indexOf(head); assert.ok(i >= 0, head); return src.slice(i, src.indexOf('\n}\n', i)); };
const LIFE = allTopics(JSON.parse(read('coach/korean/nonsul.json'))); // 공개 생활·📖 주제 (원고 그대로)
const NOW = new Date(2026, 10, 15, 15).getTime();
const D0 = dayNum(NOW);
const DAY = 86400000;
const ALL3 = { ok: 3 }; // 세 걸음 다 안 틀림

// 가짜 localStorage (news.js 받은 때) · 화면 없는 document·window (openTopic이 판을 준비할 때 그리는 자리가 없다)
const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: (k) => { store.delete(k); } };
globalThis.document = globalThis.document || { getElementById: () => null, activeElement: null };
globalThis.window = globalThis.window || { scrollTo() {} };

// ───────────────────── 지어낸 기사·주제 ─────────────────────
/** 지어낸 신문 카드 — n 번호(701~999) · 40줄 */
function card(n) {
  const lines = ['[제목] 바람숲 마을에 별빛 도서관이 문을 열었다'];
  for (let k = 2; k <= NEWS_LINES_MAX; k++) lines.push(`바람숲 마을 이야기 ${k}번째 문장이에요.`);
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
  const qs = [evQ(1, 2), evQ(2, 21), evQ(3, 33), evQ(4, 40), {
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
    words: [['도서관', '책을 모아 두고 읽게 하는 곳']],
    lines, qs,
  };
}
/** 지어낸 신문 논술 주제 — 카드 n과 같은 번호 */
function topic(n) {
  return {
    id: `N${n}`, icon: '🌙', card: `K${n}`, intro: '별빛 도서관 기사를 읽고 생각해 봐요.', q: '마을 도서관은 밤에도 열어야 할까요?',
    yes: { label: '열어야 해요', claim: '나는 밤에도 열어야 한다고 생각해요.', close: '그래도 나는 밤에도 여는 것이 좋다고 생각해요.', reasons: ['낮에 바쁜 사람도 책을 빌릴 수 있어요.', '밤에 조용히 책을 읽을 수 있어요.', '어른들이 일을 마치고 올 수 있어요.'], ev: [[21], [22], []] },
    no: { label: '닫아야 해요', claim: '나는 밤에는 닫아야 한다고 생각해요.', close: '그래도 나는 밤에는 쉬는 것이 좋다고 생각해요.', reasons: ['일하는 사람도 쉬어야 해요.', '밤에는 전기를 많이 써요.', '밤길은 어두워서 위험해요.'], ev: [[33], [], [34]] },
    off: [{ t: '도서관 지붕은 파란색이에요.', why: '밤에 여는 것과 상관없는 말이에요.', ev: [5] }, { t: '도서관에 수영장이 생겼어요.', why: '글에 없는 이야기예요. 기사에 수영장 말은 없어요.', made: true }],
  };
}
const NEWS = [701, 702, 703, 704, 705].map(topic);
const NEWS_IDS = NEWS.map((t) => t.id);
const IDS = [...LIFE.map((t) => t.id), ...NEWS_IDS];
/** ★ 받은 기사 — korDone '카드:1' */
const starred = (...ns) => Object.fromEntries(ns.map((n) => [`K${n}:1`, D0 - 3]));
const played = (d0, box = SOLVED) => ({ box, due: box >= SOLVED ? 0 : d0 + 1, at: NOW - DAY * (D0 - d0) - 1000, miss: 0, d0 });

test('🧪 지어낸 기사·주제는 앱 검사를 통과한다 (아래 시험 재료)', () => {
  for (const n of [701, 702, 703, 704, 705]) {
    assert.deepEqual(checkNewsCard(card(n)), [], `K${n}`);
    assert.deepEqual(checkNewsTopic(topic(n), card(n)), [], `N${n}`);
  }
  assert.equal(NEWS_TOPICS_PER_DAY, 2);
  assert.ok(LIFE.length > 200 && LIFE.every((t) => !/^N[7-9]\d\d$/.test(t.id)), '생활 원고는 신문 몫 번호를 안 쓴다');
});

// ───────────────────── 💰·🎯 몫이 따로 ─────────────────────
test('📰 💰·🎯 몫은 생활 판과 따로 — 같은 날 생활 판 + 신문 판 = 💰 둘 · 🎯 판 몫도 둘 · 둘째 판부터는 그 몫 안에서만 · 규칙은 id로 가른다', () => {
  const p = { ...emptyProfile(), coins: 0, coinsEarned: 0 };
  const life = nonsulRule(p, { id: LIFE[0].id, ok: true, from: 0, steps: ALL3 }, NOW, IDS);
  assert.deepEqual([life.ok, life.first, life.coins, life.prize, life.news], [true, true, NONSUL_COINS, true, false]);
  assert.deepEqual([p.nonsulDay[D0], p.nonsulNewsDay[D0]], [1, undefined], '생활 판은 생활 칸에만');
  // 넘겨받은 값(news:false)은 믿지 않는다 — N703은 신문 판
  const news = nonsulRule(p, { id: 'N703', ok: true, from: 0, steps: ALL3, news: false }, NOW, IDS);
  assert.deepEqual([news.ok, news.first, news.coins, news.prize, news.news, news.solved, news.starCatch], [true, true, NONSUL_COINS, true, true, true, true], '신문 첫 판도 💰·🎯 · 처음 ⭐ 🎯는 같다');
  assert.equal(p.nonsulNewsDay[D0], 1);
  assert.deepEqual(p.nonsulNewsBall, { d: D0, n: 1, w: 1 });
  assert.deepEqual(p.nonsulBall, { d: D0, n: 1, w: 1 }, '생활 판 기록은 그대로');
  assert.equal(p.coins, NONSUL_COINS * 2, '같은 날 💰 둘');
  assert.equal(p.nonsulThrow.earned, 4, '판 🎯 둘 + 처음 ⭐ 🎯 둘');
  assert.ok(news.xp > 0, '⚡도 같다');
  // 둘째 신문 판 — 신문 💰는 이미 · 🎯도 이미(그날 한 번) · 생활 칸은 안 건드림
  const news2 = nonsulRule(p, { id: 'N705', ok: false, from: 0, steps: { ok: 1 } }, NOW, IDS);
  assert.deepEqual([news2.first, news2.coins, news2.prize, news2.news], [false, 0, false, true]);
  assert.deepEqual(p.nonsulNewsBall, { d: D0, n: 2, w: 1 });
  assert.deepEqual(p.nonsulBall, { d: D0, n: 1, w: 1 });
  // 둘째 생활 판 — 생활 💰는 이미
  const life2 = nonsulRule(p, { id: LIFE[1].id, ok: true, from: 0, steps: ALL3 }, NOW, IDS);
  assert.deepEqual([life2.first, life2.coins, life2.news], [false, 0, false]);
  assert.equal(p.coins, NONSUL_COINS * 2);
  // 모르는 주제(지금 목록에 없는 신문 주제)는 안 받는다
  assert.deepEqual(nonsulRule(p, { id: 'N799', ok: true, from: 0 }, NOW, IDS), { ok: false, why: 'empty' });
});

test('📰 신문 판의 🎯 판 몫 — 첫 판에 못 미치면 그날 둘째 신문 판까지 · 생활 판이 그 기회를 쓰지 않는다', () => {
  const p = { ...emptyProfile(), coins: 0, coinsEarned: 0 };
  const a = nonsulRule(p, { id: 'N701', ok: false, from: 0, steps: { ok: 1 } }, NOW, IDS);
  assert.deepEqual([a.first, a.prize, a.again, a.ball.s], [true, false, true, 'm'], '첫 신문 판 못 미침 — 한 판 더');
  nonsulRule(p, { id: LIFE[0].id, ok: true, from: 0, steps: ALL3 }, NOW, IDS); // 생활 판은 생활 몫
  const b = nonsulRule(p, { id: 'N702', ok: true, from: 0, steps: ALL3 }, NOW, IDS);
  assert.deepEqual([b.first, b.prize, b.ball.idx], [false, true, 2], '둘째 신문 판에 🎯');
  assert.deepEqual(p.nonsulNewsBall, { d: D0, n: 2, w: 1 });
});

test('📰 끝 말 — 신문 판은 머리가 「📰 … 신문 논술」 · 💰·🎯 줄은 같은 꼴 · 생활 판은 그대로', () => {
  assert.equal(nonsulFinishText({ ok: true, first: true, coins: NONSUL_COINS, news: true, ball: { s: 'w' }, prize: true }).title, '📰 오늘의 신문 논술 끝!');
  assert.equal(nonsulFinishText({ ok: true, first: false, news: true, practice: true, ball: { s: 'd' } }).title, '📰 신문 논술 연습 끝!');
  assert.equal(nonsulFinishText({ ok: true, first: false, news: true, ball: { s: 'd' } }).title, '📰 신문 논술 더 하기 끝!');
  assert.equal(nonsulFinishText({ ok: true, first: true, coins: NONSUL_COINS, ball: { s: 'w' }, prize: true }).title, '🖊️ 오늘의 논술 끝!');
  assert.deepEqual(nonsulFinishText({ ok: true, first: true, coins: NONSUL_COINS, news: true, ball: { s: 'w' }, prize: true }).lines[0], `💰 +${NONSUL_COINS} · 🎯 논술 포켓몬 잡기 1번`);
  // 첫 화면 오늘 줄 — 신문 칸은 「오늘의 신문 논술 끝」(신문 판만 한 날에 생활 칸 「끝내면 💰」와 엇갈려 「논술 다 했다」로 읽히지 않게) · 생활 줄은 그대로
  assert.equal(nonsulTodayLine(1, false, { won: true, left: false }, true), '오늘의 신문 논술 끝 ✅');
  assert.equal(nonsulTodayLine(1, false, { won: true, left: false }), '오늘의 논술 끝 ✅');
  assert.equal(nonsulTodayLine(0, true, { won: false, left: true }, true), nonsulTodayLine(0, true, { won: false, left: true }), '끝내기 전 줄은 같다');
});

// ───────────────────── 하루 몫 ─────────────────────
test('📰 하루 새 신문 주제 둘 — ★ 받은 기사만 · 받은 차례 · 다시 볼 것 먼저 · 다 열면 「내일 또」 · 다음 날 다시', () => {
  const done = starred(701, 702, 703, 705); // K704는 아직 ★ 없음
  assert.deepEqual(newsTopicsOpen(NEWS, done).map((t) => t.id), ['N701', 'N702', 'N703', 'N705']);
  assert.deepEqual(newsTopicsOpen(NEWS, {}), [], '★ 받은 기사가 없으면 칸이 안 뜬다');
  assert.equal(planNewsTopic(NEWS, {}, done, NOW), 'N701');
  assert.equal(planNewsTopic(NEWS, {}, {}, NOW), null, '★ 없는 기사의 주제는 안 연다');
  const one = { N701: played(D0) };
  assert.equal(planNewsTopic(NEWS, one, done, NOW), 'N702');
  const two = { N701: played(D0), N702: played(D0, 0) };
  assert.equal(planNewsTopic(NEWS, two, done, NOW), null, `하루 ${NEWS_TOPICS_PER_DAY}개까지`);
  assert.equal(newsWaitNew(NEWS, two, done, NOW), true, '「📰 새 신문 주제는 내일 또 와요」');
  // 다음 날 — 어제 틀린 N702가 먼저 · 그다음 새 것(★ 없는 N704는 건너뛴다)
  const NEXT = NOW + DAY;
  assert.equal(planNewsTopic(NEWS, two, done, NEXT), 'N702', '다시 볼 것 먼저');
  const redo = { ...two, N702: { ...played(D0, SOLVED), at: NEXT } };
  assert.equal(planNewsTopic(NEWS, redo, done, NEXT), 'N703');
  const three = { ...redo, N703: { ...played(D0 + 1), at: NEXT } };
  assert.equal(planNewsTopic(NEWS, three, done, NEXT), 'N705', '★ 없는 K704는 건너뛴다');
  // ★ 받은 것을 다 했으면 — 「내일 또」가 아니다(★를 더 받아야 열린다)
  const all = { ...three, N705: { ...played(D0 + 1), at: NEXT } };
  assert.deepEqual([planNewsTopic(NEWS, all, done, NEXT), newsWaitNew(NEWS, all, done, NEXT)], [null, false]);
  // 생활 주제가 섞여 와도 신문 계획은 신문 주제만
  assert.equal(planNewsTopic([...LIFE.slice(0, 3), ...NEWS], {}, done, NOW), 'N701');
});

test('📰 생활 새 주제 넷은 신문 판에 안 줄어든다 · 신문 둘도 생활 판에 안 줄어든다 · 생활 계획은 신문 주제를 안 고른다', () => {
  const done = starred(701, 702, 703);
  const news2 = { N701: played(D0), N702: played(D0) };
  assert.equal(planTopic(LIFE, news2, NOW), LIFE[0].id, '신문 둘을 해도 생활 새 주제는 그대로');
  const life3 = Object.fromEntries(LIFE.slice(0, NEW_TOPICS_PER_DAY - 1).map((t) => [t.id, played(D0)]));
  assert.equal(planTopic(LIFE, { ...life3, ...news2 }, NOW), LIFE[NEW_TOPICS_PER_DAY - 1].id, '생활 셋 + 신문 둘 — 생활 넷째가 나온다');
  assert.equal(nonsulWaitNew(LIFE, { ...life3, ...news2 }, NOW), false);
  const life4 = Object.fromEntries(LIFE.slice(0, NEW_TOPICS_PER_DAY).map((t) => [t.id, played(D0)]));
  assert.equal(planTopic(LIFE, life4, NOW), null, '생활 넷이면 생활은 내일');
  assert.equal(nonsulWaitNew(LIFE, life4, NOW), true);
  assert.equal(planNewsTopic(NEWS, life4, done, NOW), 'N701', '생활 넷을 해도 신문 새 주제는 그대로');
  assert.equal(newsWaitNew(NEWS, life4, done, NOW), false);
  // 섞어 넘겨도 생활 계획은 신문 주제를 고르지 않는다(⭐ 연습도)
  const mixed = [...NEWS, ...LIFE];
  assert.equal(planTopic(mixed, {}, NOW), LIFE[0].id);
  assert.equal(planTopic(mixed, { N701: played(D0 - 2) }, NOW, true), null, '⭐ 신문 주제는 생활 연습에 안 나온다');
  assert.equal(nonsulWaitNew(NEWS, life4, NOW), false, '신문 목록만 남았으면 생활 「내일 또」가 아니다');
});

test('📰 ✍️·💡 없음 — 신문 주제엔 💡 내 이유 보내기를 안 받는다', () => {
  const p = { ...emptyProfile(), nonsul: { N703: played(D0) } };
  const cards = [{ id: 'R703', topic: 'N703', icon: '🌙', title: topic(703).q, write: { v: 1, q: '왜?', rubric: { must: ['이유'], ok: [], miss: [] }, past: [], frames: [] } }];
  assert.deepEqual(reasonAddRule(p, topic(703), 'yes', '책을 더 많이 읽을 수 있기 때문이에요', NOW, cards), { ok: false, why: 'unknown' });
});

// ───────────────────── 프로필 집 규칙 ─────────────────────
test('📰 프로필 칸 — 빈 프로필 · 복사 · 병합(두 사본 nonsulNewsDay 합집합 · Ball은 같은 날 판 수 큰 쪽·받음 어느 쪽이든) · 둘 다 없으면 Ball 칸 없음', () => {
  assert.deepEqual(emptyProfile().nonsulNewsDay, {});
  assert.equal(emptyProfile().nonsulNewsBall, undefined);
  const c = cloneProfile({ ...emptyProfile(), nonsulNewsDay: { [D0]: 1, bad: 3 } });
  assert.deepEqual(c.nonsulNewsDay, { [D0]: 1 }, '복사는 고쳐 읽는다');
  const a = { ...emptyProfile(), nonsulDay: { [D0]: 1 }, nonsulNewsDay: { [D0]: 1 }, nonsulNewsBall: { d: D0, n: 1, w: 0 }, updatedAt: 9 };
  const b = { ...emptyProfile(), nonsulNewsDay: { [D0 - 1]: 1, [D0]: 1 }, nonsulNewsBall: { d: D0, n: 2, w: 1 }, updatedAt: 5 };
  for (const [x, y] of [[a, b], [b, a]]) {
    const m = mergeStatRecord('profile', x, y);
    assert.deepEqual(m.nonsulNewsDay, { [D0]: 1, [D0 - 1]: 1 }, '날은 합집합');
    assert.deepEqual(m.nonsulNewsBall, { d: D0, n: 2, w: 1 }, '같은 날 판 수 큰 쪽 · 받음은 어느 쪽이든');
    assert.deepEqual(m.nonsulDay, { [D0]: 1 }, '생활 칸은 생활 칸끼리');
    assert.equal(m.nonsulBall, undefined);
  }
  // 옛 백업(신문 칸 없음)이 받은 날을 되돌리지 못한다
  const old = { ...emptyProfile(), updatedAt: 99 };
  delete old.nonsulNewsDay;
  assert.deepEqual(mergeStatRecord('profile', a, old).nonsulNewsDay, { [D0]: 1 });
  assert.deepEqual(mergeStatRecord('profile', old, a).nonsulNewsBall, { d: D0, n: 1, w: 0 });
  assert.equal(mergeStatRecord('profile', { ...emptyProfile() }, { ...emptyProfile() }).nonsulNewsBall, undefined);
});

test('📤 🎯 판정 칸 — 📰 신문 판은 nn(생활 ns와 따로 줄) · 요약에 「📰🖊️」', () => {
  assert.ok(KOR_PRIZE_KINDS.includes('nn'));
  assert.equal(korPrizeKey('nn', 123, 1, 3, 3, 'w'), 'nn:123:1:3/3:w');
  const keys = ['2026-11-15'];
  const line = korPrizeReport([{ date: '2026-11-15', korPrize: [korPrizeKey('ns', 1, 1, 3, 3, 'w'), korPrizeKey('nn', 2, 1, 1, 3, 'm'), korPrizeKey('nn', 3, 2, 3, 3, 'w')] }], keys);
  assert.equal(line, '🎯 처음 답 반 이상(v422 · 최근 7일): 🖊️ 11-15 1째 3/3 ✅받음 | 📰🖊️ 11-15 1째 1/3 ❌못 미침 · 11-15 2째 3/3 ✅받음');
});

test('🔥 지난날 공부한 날 · 🎣 「논술 한 날」 — 생활·신문 어느 쪽이든', () => {
  const days = profileKorDays({ nonsulDay: { [D0 - 2]: 1 }, nonsulNewsDay: { [D0 - 1]: 1 } });
  assert.equal(days.length, 2);
});

// ───────────────────── 저장 경로 (가짜 IndexedDB) ─────────────────────
let initDone = false;
const stored = () => fakeIdb.get('profile', 'me');
async function seed(p) {
  if (!initDone) { await initProfile(); initDone = true; }
  await flushProfile();
  const cur = stored() || emptyProfile();
  fakeIdb.put('profile', { ...cur, ...p, id: 'me', updatedAt: (cur.updatedAt || 0) + 1 });
  await reloadProfile();
}

test('★ 📰 저장 경로: 신문 판을 끝내면 nonsulNewsDay·nonsulNewsBall이 저장된 프로필에 · 생활 💰를 받은 날도 신문 💰 · 그리기용 칸 · 낚시터 「논술 한 날」은 둘 다', async () => {
  const today = dayNum(Date.now());
  await seed({ coins: 0, coinsEarned: 0, nonsul: {}, nonsulDay: { [today]: 1 }, nonsulNewsDay: {}, nonsulBall: { d: today, n: 1, w: 1 }, nonsulNewsBall: null, nonsulThrow: { earned: 0, used: 0, refunded: 0 } });
  assert.deepEqual(korBallToday('nn'), { won: false, left: true }, '생활 🎯를 받은 날도 신문 🎯 기회는 그대로');
  assert.deepEqual(korBallToday('ns'), { won: true, left: false });
  const res = await nonsulFinish({ id: 'N703', ok: false, from: 0, steps: ALL3 }, IDS);
  assert.deepEqual([res.ok, res.first, res.coins, res.prize, res.news], [true, true, NONSUL_COINS, true, true]);
  const s = stored();
  assert.deepEqual([s.coins, s.nonsulNewsDay[today], s.nonsulNewsBall, s.nonsulThrow.earned], [NONSUL_COINS, 1, { d: today, n: 1, w: 1 }, 1]);
  assert.equal(s.nonsul.N703.d0, today);
  assert.deepEqual(korBallToday('nn'), { won: true, left: false });
  assert.deepEqual(Object.keys(nonsulNewsDayMap()), [String(today)]);
  assert.deepEqual(nonsulDayMap(), { [today]: 1 }, '생활 칸은 그대로');
  await seed({ nonsulDay: { [today - 2]: 1 }, nonsulNewsDay: { [today]: 1, [today - 1]: 1 } });
  assert.deepEqual(Object.keys(nonsulDoneDayMap()).map(Number).sort(), [today - 2, today - 1, today], '🎣·🐠 과목 몫 — 둘의 합집합');
});

test('📖 readingTopicFor·openTopic — 신문 기사 카드면 신문 주제를 찾는다 · ⭐ 주제면 null · 공개 카드는 그대로', async () => {
  await putNewsCache({ 'news/n1.json': [{ card: card(703), topic: topic(703) }, { card: card(704) }] });
  const ns = await import('../js/nonsulview.js');
  await seed({ nonsul: {} });
  assert.deepEqual(await ns.readingTopicFor('K703'), { id: 'N703', icon: '🌙', q: topic(703).q });
  assert.equal(await ns.readingTopicFor('K704'), null, '주제가 없는 기사');
  assert.equal(ns.openTopic('N703'), true, '신문 주제로 판을 준비한다');
  assert.equal(ns.openTopic('N799'), false);
  await seed({ nonsul: { N703: { box: SOLVED, due: 0, at: Date.now() - DAY, miss: 0, d0: dayNum(Date.now()) - 1 } } });
  assert.equal(await ns.readingTopicFor('K703'), null, '⭐ 주제는 단추를 안 띄운다');
});

// ───────────────────── 화면 잇기 (소스) ─────────────────────
test('📰 화면 잇기 — 첫 화면 칸(★ 기사 있을 때만 · ⏳ 국어 시간 · 셈 없이) · 판 저장 ids · 📤 nn · ✍️·💡 없음 · 기사 글 · 낚시터·여행 · CSS', () => {
  const v = read('js/nonsulview.js');
  const home = body(v, 'function newsHomeEl() {');
  assert.ok(home.includes('if (!newsTopicsOpen(list, done).length) return null;'), '★ 받은 기사의 주제가 없으면 칸이 없다');
  assert.ok(home.includes("guardStart('korean', () => startNewsRound())"), '⏳ 국어 시간 안에서');
  assert.ok(home.includes("korBallToday('nn'), true)") && home.includes('nonsulNewsDayMap()'), '💰·🎯 말은 신문 몫 · 오늘 줄은 「신문 논술」');
  // 판 저장 ids에 신문 주제가 빠지면 신문 판이 늘 「저장할 주제가 없어요」 — 정의까지 본다
  assert.ok(v.includes('const ids = [...S.list, ...S.news.topics].map((t) => t.id);'), '저장 ids = 생활 + 📰 신문 주제');
  assert.ok(v.includes('if (r && r.news && r.t && isNewsTopicId(r.id) && !ids.includes(r.id)) ids.push(r.id);'), '시작할 때 검사를 통과한 📰 주제는 그사이 원고에서 빠져도 그 판은 저장(Codex 230차 #1)');
  assert.ok(v.includes('story: isNewsTopicId(id) ? storyOf(t.card) : null') && v.includes('const st = (r && r.story) || storyOf(t.card);'), '📰 판은 시작할 때의 기사 글을 쥐고 간다');
  // 판 끝 — 신문 판은 다음도 신문 주제(하루 둘)로 · 생활 「🖊️ 다음 주제」로 새지 않는다
  const fin = body(v, 'function finishEl(r) {');
  const iNews = fin.indexOf('if (r.news) {');
  const iLife = fin.indexOf("'🖊️ 다음 주제'");
  assert.ok(iNews >= 0 && iLife > iNews && fin.slice(iNews, iLife).includes('planNewsTopic(S.news.topics, nonsulMap(), korDoneMap(), Date.now())') && fin.slice(iNews, iLife).includes('startNewsRound()') && fin.slice(iNews, iLife).includes('NEWS_WAIT_TEXT') && /\} else if \(res\.ok && planTopic\(S\.list/.test(fin), '신문 판 끝은 신문 몫 · 생활 판 끝은 그대로');
  const wait = /const NEWS_WAIT_TEXT = '([^']+)';/.exec(v);
  assert.ok(wait && !/\d|개|번/.test(wait[1]), '「내일 또」에 셈 없음');
  assert.ok(body(v, 'function renderHome() {').includes('const nw = newsHomeEl();'));
  assert.ok(body(v, 'function startNewsRound() {').includes("if (!id) { renderHome(); return; }"), '할 신문 주제가 없으면 생활 주제로 새지 않는다');
  assert.ok(body(v, 'async function finishRound() {').includes('res = await nonsulFinish({ id: r.id, ok: !r.miss, from: r.from, steps }, topicIds(r));'));
  assert.ok(v.includes("korPrizeKey(res.news ? 'nn' : 'ns', r.t0,"), '📤 판정 칸은 규칙이 가른 몫으로');
  assert.ok(body(v, 'function reasonEl(r) {').includes('if (r.news) return null;') && body(v, 'function writeLinkEl(id) {').includes('if (isNewsTopicId(id) || !wcardOf(id)) return null;'), '신문 판엔 💡·✍️ 없음');
  assert.ok(body(v, 'function storyOf(cardId) {').includes('S.news.cards.find('), '판 머리 📖에 기사 글');
  assert.ok(v.includes('const byId = (id) => S.list.find((t) => t.id === id) || S.news.topics.find((t) => t.id === id) || null;'));
  const enter = body(v, 'export async function enterNonsul() {');
  assert.ok(enter.includes('await loadNewsData();') && enter.includes('syncNews().then((n) => {') && !enter.includes('await syncNews('), '받기는 기다리지 않는다');
  assert.ok(!/\$\{[^}]*length[^}]*\}\s*\/|남은 \$\{|개 남/.test(home), '아이 화면에 셈 없음');
  // ⚔️·🚀 문제 원천은 생활 주제 그대로
  assert.ok(v.includes('nonsulBattleQ(S.list, nonsulMap(), seen)') && !v.includes('nonsulBattleQ(S.news'));
  for (const f of ['js/lakeview.js', 'js/tourview.js']) assert.ok(read(f).includes('sharesOf(days, nonsulDoneDayMap(), today, avail)'), `${f} — 논술 한 날은 둘 다`);
  assert.ok(read('css/style.css').includes('/* 📰 신문 논술 (v428)'));
});

test('📰 첫 화면 말 — 오늘 몫을 다 썼으면 ★와 상관없이 「내일 또」 · 몫이 남았으면 ★ 안내 · 다 해 봤으면 그 말 (v428 검토)', async () => {
  const { newsQuotaFull, NEWS_TOPICS_PER_DAY } = await import('../js/nonsul.js');
  const day = Math.floor(Date.UTC(2026, 10, 15) / 86400000);
  const now = new Date(2026, 10, 15, 15, 0).getTime();
  const st = (ids) => Object.fromEntries(ids.map((id) => [id, { box: 0, due: day + 1, at: now, miss: 1, d0: day }]));
  assert.equal(NEWS_TOPICS_PER_DAY, 2);
  assert.equal(newsQuotaFull(st(['N701']), now), false);
  assert.equal(newsQuotaFull(st(['N701', 'N702']), now), true);
  assert.equal(newsQuotaFull({ ...st(['N701']), N10: { box: 0, due: day + 1, at: now, miss: 1, d0: day } }, now), false, '생활 주제는 신문 몫에 안 든다');
  const v = readFileSync(new URL('../js/nonsulview.js', import.meta.url), 'utf8');
  assert.ok(v.includes("if (newsWaitNew(list, st, done, now) || (fresh && newsQuotaFull(st, now))) sec.appendChild(el('p', 'ns-note ns-wait', NEWS_WAIT_TEXT));"));
  assert.ok(v.includes("else sec.appendChild(el('p', 'ns-note', '📰 지금 열린 신문 주제는 다 해 봤어요'));"));
});
