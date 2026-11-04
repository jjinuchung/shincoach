// 🔁 v391 영어 「오늘의 복습」 손보기 (2026-11-03 아버님 「매번 똑같은 것만 나오고, 문장도 아닌 것들, 이상한 소리 지르는 것도 나와서
// 복습과 학습의 의미가 안 된다」 → 기본안 「추천대로」): node --test tests/review391.test.js
//   ① 복습에 낼 줄 = 서로 다른 영어 낱말 3개 이상 · 12개 이하 · . ! ? 로 끝남 · 끊긴 조각·앞 줄에서 이어진 조각·노래 줄은 뺌 (reviewWorthy)
//   ② 순서 = 💖 → 복습 중인 문장(차례가 오래된 것부터) → 남은 자리에 새 문장(따라 말하기 통과한 것 → 최근에 배운 것) · 자리가 꽉 차도 끝자리 하나는 새 문장
//   ③ 못 넘기면 이틀 뒤 · 거듭 두 번이면 한 달 쉼 (scheduleSentence · 기록 reviewMiss)
//   ④ 한 번도 복습 안 한 새 문장은 배운 뒤 7일까지만 차례 — 기록은 그대로
//   수학 개념 복습(en·itemId 없는 기록)은 옛 규칙 그대로
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  reviewWorthy, REVIEW_WORDS, NEW_DAYS, MISS_RETRY_DAYS, MISS_REST,
  isDue, pickReviews, firstDueOf, reviewSummary, dueByItem, pickDueItem, scheduleSentence, schedule, addDays, GRADUATED,
} from '../js/review.js';
import { mergeStatRecord, pickReviewState } from '../js/db.js';
import { slimStats } from '../js/backup.js';

const T = '2026-11-03';
const rec = (start, patch = {}) => ({ key: `v|${start * 10}`, itemId: 'v', start, en: 'We have to go now.', done: true, box: 0, dueAt: addDays(T, -1), reviews: 0, speakPass: 0, ...patch });

test('🔁 v391 ① 복습에 낼 문장 — 낱말 셋~열둘 · 끝난 문장만', () => {
  assert.deepEqual(REVIEW_WORDS, { min: 3, max: 12 });
  for (const s of [
    'Why are you wearing your house?',
    'Whoa! Look at that!',                       // 소리 낱말은 안 세고 셋
    'I like it.',
    'Hurry!\nI got this.',                       // 두 줄이 합쳐진 문장
    "Don't you move.",
    '"Fine" is a cry for help.',                 // 따옴표로 시작
    'He said, "Let\'s go home."',                // 따옴표로 끝남
    'Is that true?!',
    'I need the journal and probably a sweater for the cold night.', // 열둘
    '- Where are you going?',                     // 말하는 사람 줄표
  ]) assert.equal(reviewWorthy(s), true, s);
  for (const s of [
    'Paw!', 'Boom.', 'Skadoosh!', 'Mabel!', 'Okay, okay.', 'Huh?',
    'I know.',                                   // 두 낱말 — 「추천대로」 셋부터
    'We…', 'Which is why...', 'It sounds like, um...', // 끊긴 끝
    'of the invention of the weather walls.',    // 앞 줄에서 이어진 조각(소문자로 시작)
    '...and then we ran away.',                  // 「...」로 시작
    'Before we decided to come down here',       // 끝나지 않은 줄
    'And so we went,',
    '♪ I know a girl from an island ♪',          // 노래 줄
    '♪ See the line where the sky meets the sea!', // 노래 줄 — 끝이 ♪가 아니어도
    '"...and then we ran away."',                // 따옴표 안에서 「...」로 시작
    '- and then we left the house.',             // 줄표 뒤 소문자 — 이어진 조각
    'Uh, um, okay.',                             // 소리 낱말은 세지 않는다 — 남는 낱말 하나
    'Shoo! Shoo, shoo!', 'Hey, bub. Hey, bub, bub.', // 같은 말 되풀이
    'Oh, Gengar!',
    'I need the journal and probably a sweater for the cold night outside.', // 열셋
    '', null, undefined,
  ]) assert.equal(reviewWorthy(s), false, String(s));
});

test('🔁 v391 ① 따옴표 — 여는 쪽·닫는 쪽 어느 종류든 벗기고 본다 (Codex 194차)', () => {
  for (const [o, c] of [['"', '"'], ["'", "'"], ['“', '”'], ['‘', '’'], ['«', '»'], ['‹', '›'], ['”', '“'], ['’', '‘'], ['»', '«'], ['›', '‹']]) {
    assert.equal(reviewWorthy(`${o}We have to go.${c}`), true, `${o}문장${c}`);
    assert.equal(reviewWorthy(`${o}and then we left.${c}`), false, `${o}소문자 조각${c}`);
    assert.equal(reviewWorthy(`${o}We have to go...${c}`), false, `${o}끊긴 끝${c}`);
  }
  assert.equal(reviewWorthy('’and then we left.'), false, '앞 따옴표만 — 소문자 조각이 빠져나가지 않는다');
});

test('🔁 v391 ①④ isDue — 복습에 낼 문장만 · 새 문장은 배운 뒤 7일까지 · 복습을 시작한 문장은 오래돼도 · 수학 기록은 옛 규칙', () => {
  assert.equal(NEW_DAYS, 7);
  assert.equal(isDue(rec(1), T), true);
  assert.equal(isDue(rec(1, { en: 'Paw!' }), T), false, '한 낱말 외침');
  assert.equal(isDue(rec(1, { en: 'Paw!', reviews: 3, box: 1 }), T), false, '복습 중이었어도 낼 만한 문장이 아니면 뺀다');
  // 배운 날 L → 처음 차례 L+1 → L+7까지
  assert.equal(isDue(rec(1, { dueAt: addDays(T, -(NEW_DAYS - 1)) }), T), true, '배운 지 7일');
  assert.equal(isDue(rec(1, { dueAt: addDays(T, -NEW_DAYS) }), T), false, '배운 지 8일 — 한 번도 복습 안 한 새 문장은 빠진다');
  assert.equal(isDue(rec(1, { dueAt: '2026-09-01', reviews: 1, box: 0 }), T), true, '복습을 시작한 문장은 오래 밀려도 차례');
  assert.equal(isDue(rec(1, { dueAt: '2026-09-01', reviews: 0, reviewedAt: 5 }), T), true, '줄인 사본엔 reviews가 없다 — reviewedAt으로');
  assert.equal(isDue(rec(1, { dueAt: '2026-09-01', reviews: 0, box: 2 }), T), true, '… box로도');
  assert.equal(isDue(rec(1, { dueAt: addDays(T, 1) }), T), false, '아직 때가 아님');
  assert.equal(isDue(rec(1, { box: GRADUATED, dueAt: '' }), T), false, '👑');
  // 영어가 없는 문장 기록(줄인 사본에서 되살림) — 문장은 못 보니 날짜만
  const slim = { key: 'v|10', itemId: 'v', start: 1, box: 0, dueAt: addDays(T, -1) };
  assert.equal(isDue(slim, T), true);
  assert.equal(isDue({ ...slim, dueAt: '2026-09-01' }, T), false, '영어가 없어도 새 문장 기간은 본다');
  // 수학 개념 기록(en·itemId 없음)은 옛 규칙 그대로 — 오래 밀려도 차례
  assert.equal(isDue({ box: 0, dueAt: '2026-09-01', done: true }, T), true, '수학 개념 기록');
});

test('🔁 v391 ② pickReviews — 💖 → 복습 중(차례 오래된 것 → box 낮은 것) → 새 문장(따라 말하기 통과 → 최근에 배운 것) · 넘긴 것·점수 낮은 것이 먼저가 아니다', () => {
  const list = [
    rec(1, { reviews: 1, box: 2, dueAt: '2026-10-30' }),
    rec(2, { reviews: 1, box: 1, dueAt: '2026-11-01' }),
    rec(3, { reviews: 2, box: 0, dueAt: '2026-11-01' }),                // 같은 날이면 box 낮은 것 먼저(앞 문장이 아니어도)
    rec(4, { dueAt: '2026-10-29', speakSkipped: 3, bestRatio: 0 }),   // 영상 볼 때 넘긴 새 문장 — 옛 규칙은 맨 앞
    rec(5, { dueAt: '2026-10-30', speakPass: 1 }),
    rec(6, { dueAt: '2026-11-02', speakPass: 1 }),
    rec(7, { dueAt: '2026-11-03' }),
    rec(8, { dueAt: '2026-11-04', reviews: 1, box: 1 }),               // 내일 — 안 나옴
    rec(9, { dueAt: '2026-11-03', en: 'Mabel!', speakSkipped: 2 }),    // 낼 만한 문장이 아님
  ];
  assert.deepEqual(pickReviews(list, T, 20).map((r) => r.start), [1, 3, 2, 6, 5, 7, 4]);
  assert.deepEqual(pickReviews(list, T, 5).map((r) => r.start), [1, 3, 2, 6, 5], '한 회차 다섯');
  assert.deepEqual(pickReviews([...list, rec(10, { dueAt: '2026-11-02', fav: true })], T, 2).map((r) => r.start), [10, 1], '💖는 새 문장이라도 맨 앞');
});

test('🔁 v391 ② 새 문장 한 자리 — 복습 중인 문장이 자리를 다 채우면 끝자리는 새 문장 · 자리 하나·💖로 꽉 찬 회차는 그대로 (Codex 194차 「추천대로」)', () => {
  const going = Array.from({ length: 8 }, (_, i) => rec(i + 1, { reviews: 1, box: 1, dueAt: addDays(T, -(10 - i)) }));
  const fresh = [rec(20, { dueAt: '2026-11-02' }), rec(21, { dueAt: '2026-11-03', speakPass: 1 })];
  const starts = (list, n) => pickReviews(list, T, n).map((r) => r.start);
  assert.deepEqual(starts([...going, ...fresh], 5), [1, 2, 3, 4, 21], '끝자리에 새 문장 — 따라 말하기 통과한 것이 먼저');
  assert.deepEqual(starts([...going, ...fresh], 2), [1, 21], '둘이면 하나씩');
  assert.deepEqual(starts([...going, ...fresh], 1), [1], '자리가 하나면 복습 중인 문장');
  assert.deepEqual(starts(going, 5), [1, 2, 3, 4, 5], '새 문장이 없으면 그대로');
  assert.deepEqual(starts([...going.slice(0, 2), ...fresh], 5), [1, 2, 21, 20], '자리가 남으면 새 문장을 다 넣는다');
  assert.deepEqual(starts([...going.slice(0, 4), ...fresh], 5), [1, 2, 3, 4, 21], '이미 새 문장이 들었으면 더 안 바꾼다');
  const faved = going.map((r) => ({ ...r, fav: true }));
  assert.deepEqual(starts([...faved, ...fresh], 3), [1, 2, 3], '💖로 꽉 차면 💖 그대로');
  assert.deepEqual(starts([...faved.slice(0, 2), ...going.slice(2), ...fresh], 4), [1, 2, 3, 21], '💖 뒤 복습 중인 자리만 내준다');
  assert.deepEqual(starts([...going, ...fresh, rec(22, { fav: true })], 3), [22, 1, 2], '💖 새 문장이 들었으면 그것이 새 자리');
  assert.deepEqual(starts([...going, rec(30, { dueAt: addDays(T, -NEW_DAYS) })], 3), [1, 2, 3], '7일 지난 새 문장은 자리를 못 받는다');
  assert.deepEqual(starts([...going, rec(31, { en: 'Mabel!' })], 3), [1, 2, 3], '낼 만한 문장이 아니면 자리를 못 받는다');
});

test('🔁 v391 ② 흉내 30일 — 복습 중 60문장이 밀린 채 하루 5문항 · 새 문장이 첫날부터 날마다 들어오고 밀린 문장도 다 한 번은 돈다', () => {
  const start = '2026-11-03';
  const recs = Array.from({ length: 60 }, (_, i) => ({ ...rec(i), key: `s|${i}`, reviews: 1, reviewedAt: 1, box: i % 3, dueAt: addDays(start, -1 - (i % 10)) }));
  const backlog = new Set(recs.map((r) => r.key));
  const newDays = new Set();
  for (let d = 0; d < 30; d++) {
    const day = addDays(start, d);
    for (let i = 0; i < 100; i++) recs.push({ ...rec(1000 + d * 100 + i), key: `n|${d}|${i}`, dueAt: addDays(day, 1) });
    const picks = pickReviews(recs, day, 5);
    assert.equal(picks.length, 5);
    for (const r of picks) {
      if (!(r.reviews > 0)) newDays.add(d);
      backlog.delete(r.key);
      Object.assign(r, scheduleSentence(r.box || 0, r.reviewMiss || 0, true, day));
      r.reviews = (r.reviews || 0) + 1;
      r.reviewedAt = d + 2;
    }
  }
  assert.equal(newDays.size, 29, '첫날은 새 문장이 아직 차례 전(배운 다음 날부터) — 그 뒤 날마다 하나 이상');
  assert.equal(newDays.has(1), true, '밀린 문장이 있어도 다음 날부터');
  assert.equal(backlog.size, 0, '밀린 문장도 30일 안에 다 한 번은 돈다');
});

test('🔁 v391 ③ scheduleSentence — 통과는 schedule과 같고, 못 넘기면 이틀 뒤 · 거듭 두 번이면 한 달 쉼 · 통과하면 다시 0', () => {
  assert.equal(MISS_RETRY_DAYS, 2);
  assert.deepEqual(MISS_REST, { after: 2, days: 30 });
  assert.deepEqual(scheduleSentence(1, 0, true, T), { ...schedule(1, true, T), reviewMiss: 0 });
  assert.deepEqual(scheduleSentence(4, 1, true, T), { box: GRADUATED, dueAt: '', reviewMiss: 0 }, '👑 졸업도 그대로');
  assert.deepEqual(scheduleSentence(2, 0, false, T), { box: 1, dueAt: addDays(T, 2), reviewMiss: 1 });
  assert.deepEqual(scheduleSentence(1, 1, false, T), { box: 0, dueAt: addDays(T, 30), reviewMiss: 0 }, '거듭 두 번 → 한 달 쉼');
  assert.deepEqual(scheduleSentence(0, undefined, false, T), { box: 0, dueAt: addDays(T, 2), reviewMiss: 1 }, '옛 기록(reviewMiss 없음)');
  // 수학·단어 복습이 쓰는 schedule은 그대로 — 못 하면 내일
  assert.deepEqual(schedule(1, false, T), { box: 0, dueAt: addDays(T, 1) });
});

test('🔁 v391 reviewSummary·dueByItem·pickDueItem도 같은 판정 — 밀린 옛 새 문장이 많은 영상보다 지금 배우는 영상', () => {
  const old = Array.from({ length: 300 }, (_, i) => ({ ...rec(i, { dueAt: '2026-10-01' }), itemId: 'old', key: `old|${i}` }));
  const now = [rec(1, { itemId: 'now', key: 'now|1' }), rec(2, { itemId: 'now', key: 'now|2', reviews: 1, box: 1 })];
  const noise = [rec(3, { itemId: 'now', key: 'now|3', en: 'Boom.' })];
  const all = [...old, ...now, ...noise];
  assert.deepEqual(dueByItem(all, T).map((d) => [d.itemId, d.due]), [['now', 2]]);
  assert.equal(pickDueItem(all, T, ['old', 'now']).itemId, 'now', '🔁 단추가 늘 밀린 옛 영상을 열지 않는다');
  const waiting = rec(4, { itemId: 'now', key: 'now|4', dueAt: addDays(T, 3), reviews: 1, box: 2 });
  assert.deepEqual(reviewSummary([...all, waiting, rec(5, { box: GRADUATED, dueAt: '' })], T), { dueCount: 2, waiting: 1, graduated: 1 });
  // 차례 수 = 실제로 고르는 수
  assert.equal(pickReviews(all, T, 999).length, reviewSummary(all, T).dueCount);
});

test('🔁 v391 흉내 45일 — 날마다 새 문장 100 · 복습 하루 8 · 못 하는 줄은 이틀 뒤·한 달 쉼 → 같은 줄이 날마다 맨 앞에 안 오고 👑가 생긴다', () => {
  const recs = [];
  const start = '2026-11-01';
  const picksOf = new Map(); // key → 복습한 날들
  let prevFirst = null;
  let sameFirst = 0;
  for (let d = 0; d < 45; d++) {
    const day = addDays(start, d);
    for (let i = 0; i < 100; i++) {
      const n = d * 100 + i;
      recs.push({ key: `v|${n}`, itemId: 'v', start: n, en: n % 10 === 0 ? 'Mabel, Higgins, Bloats!' : 'We have to go now.', hard: n % 10 === 0, done: true, box: 0, dueAt: addDays(day, 1), reviews: 0, speakPass: n % 3 ? 1 : 0 });
    }
    const picks = pickReviews(recs, day, 8);
    const first = picks.map((r) => r.key).join(',');
    if (first && first === prevFirst) sameFirst++;
    prevFirst = first;
    for (const r of picks) {
      const passed = !r.hard;
      Object.assign(r, scheduleSentence(r.box || 0, r.reviewMiss || 0, passed, day));
      r.reviews = (r.reviews || 0) + 1;
      r.reviewedAt = d + 1;
      if (!picksOf.has(r.key)) picksOf.set(r.key, []);
      picksOf.get(r.key).push(d);
    }
  }
  assert.equal(sameFirst, 0, '같은 회차가 이틀 잇달아 나오지 않는다');
  let maxHard = 0;
  for (const [key, days] of picksOf) {
    for (let i = 1; i < days.length; i++) assert.ok(days[i] - days[i - 1] >= 2, `${key}가 이틀 잇달아 나옴: ${days}`);
    const r = recs.find((x) => x.key === key);
    if (r.hard) maxHard = Math.max(maxHard, days.length);
  }
  assert.ok(maxHard <= 4, `못 하는 줄이 45일에 ${maxHard}번 — 이틀 뒤·한 달 쉼이면 많아야 넷`);
  assert.ok(recs.some((r) => r.box >= GRADUATED), '45일 안에 👑 완성 문장이 생긴다');
  // 밀린 차례가 끝없이 쌓이지 않는다 — 새 문장은 7일 창
  const dueEnd = recs.filter((r) => isDue(r, addDays(start, 45))).length;
  assert.ok(dueEnd <= 100 * NEW_DAYS + 200, `45일 뒤 차례 ${dueEnd}`);
});

test('🔁 v391 기기 옮기기·백업 — 거듭 못 넘긴 수는 최근에 복습한 쪽과 한 쌍 · 줄인 사본에도 남는다', () => {
  const a = { key: 'v|10', itemId: 'v', start: 1, en: 'We have to go now.', box: 0, dueAt: '2026-11-05', reviewedAt: 200, reviewMiss: 1 };
  const b = { key: 'v|10', itemId: 'v', start: 1, en: 'We have to go now.', box: 2, dueAt: '2026-11-04', reviewedAt: 100, reviewMiss: 0 };
  for (const [x, y] of [[a, b], [b, a]]) {
    const m = mergeStatRecord('sentenceStats', x, y);
    assert.deepEqual([m.box, m.dueAt, m.reviewMiss], [0, '2026-11-05', 1], '최근에 복습한 a 쪽 한 쌍');
  }
  const c = { ...b, reviewedAt: 300, reviewMiss: undefined };
  delete c.reviewMiss;
  assert.equal(mergeStatRecord('sentenceStats', a, c).reviewMiss, 0, '최근 쪽에 없으면 0');
  const plain = { key: 'v|20', itemId: 'v', start: 2, box: 1, dueAt: '2026-11-04', reviewedAt: 1 };
  assert.equal('reviewMiss' in mergeStatRecord('sentenceStats', plain, { ...plain }), false, '둘 다 없으면 칸을 만들지 않는다');
  assert.deepEqual(pickReviewState(a, b), { box: 0, dueAt: '2026-11-05' }, 'pickReviewState 꼴은 그대로');
  const slim = slimStats([{ ...a, done: true }, { ...b, done: true }]);
  assert.equal(slim[0].reviewMiss, 1);
  assert.equal('reviewMiss' in slim[1], false, '0이면 안 담는다');
});

test('🔁 v391 기기 옮기기 — 둘 다 복습 전이면 이른 첫 차례 · 복습을 시작한 쪽이 있으면 옛 규칙 · 어느 쪽을 먼저 합쳐도 같다 (Codex 194차)', () => {
  const both = (x, y, check) => { for (const [p, q] of [[x, y], [y, x]]) check(mergeStatRecord('sentenceStats', p, q)); };
  const early = { key: 'v|10', itemId: 'v', start: 1, en: 'We have to go now.', done: true, box: 0, dueAt: '2026-10-01' };
  const late = { ...early, dueAt: '2026-11-02' };
  both(early, late, (m) => {
    assert.equal(m.dueAt, '2026-10-01', '이른 첫 차례');
    assert.equal(isDue(m, T), false, '지난 새 문장이 되살아나지 않는다');
  });
  both(late, { ...early, dueAt: '' }, (m) => assert.equal(m.dueAt, '2026-11-02', '한쪽이 빈칸이면 있는 날'));
  both({ ...early, dueAt: '' }, { ...early, dueAt: '' }, (m) => assert.equal(m.dueAt, ''));
  // 복습을 시작한 쪽이 있으면 최근에 복습한 쪽 한 쌍
  const begun = { ...late, reviews: 1, reviewedAt: 5, box: 1, dueAt: '2026-11-05' };
  both(early, begun, (m) => assert.deepEqual([m.box, m.dueAt], [1, '2026-11-05']));
  // reviewedAt 없는 옛 기록끼리(box가 있으면 시작한 문장) — 옛 규칙대로 늦은 날
  both({ ...early, box: 2, dueAt: '2026-11-01' }, { ...early, box: 2, dueAt: '2026-11-04' }, (m) => assert.equal(m.dueAt, '2026-11-04'));
  assert.equal(firstDueOf(early, late), '2026-10-01');
  assert.equal(firstDueOf(early, begun), null);
  // 🔤 단어 병합이 쓰는 pickReviewState는 그대로
  assert.equal(pickReviewState(early, late).dueAt, '2026-11-02');

  // 복습 상태가 똑같은 두 사본의 거듭 못 넘긴 수 — 큰 값
  const miss = { key: 'v|20', itemId: 'v', start: 2, box: 1, dueAt: '2026-11-05', reviewedAt: 200, reviewMiss: 1 };
  const none = { ...miss };
  delete none.reviewMiss;
  both(miss, none, (m) => assert.equal(m.reviewMiss, 1, '칸이 없는 옛 사본과'));
  both(miss, { ...miss, reviewMiss: 0 }, (m) => assert.equal(m.reviewMiss, 1, '0인 사본과'));
  // 하나라도 다르면 최근 쪽 한 쌍 그대로
  both({ ...miss, reviewedAt: 100 }, { ...miss, reviewMiss: 0 }, (m) => assert.equal(m.reviewMiss, 0, '복습 시각이 다르면 최근 쪽'));
  both({ ...miss, box: 0 }, { ...miss, reviewMiss: 0 }, (m) => assert.equal(m.reviewMiss, 0, 'box가 다르면 box 큰 쪽'));
  both({ ...miss, dueAt: '2026-11-04' }, { ...miss, reviewMiss: 0 }, (m) => assert.equal(m.reviewMiss, 0, '차례가 다르면 늦은 쪽'));
});

test('🔁 v391 화면 — 못 넘기면 「며칠 뒤에 또 만나요」(내일이 아님) · 셈 문구를 새로 넣지 않음 · track은 scheduleSentence', () => {
  const src = fs.readFileSync(new URL('../js/review.js', import.meta.url), 'utf8');
  assert.equal(src.includes('내일 또 만나요'), false, '못 넘기면 이제 이틀 뒤·한 달 쉼');
  assert.ok(src.includes("fb.textContent = '👍 괜찮아요 — 며칠 뒤에 또 만나요';"));
  assert.ok(src.includes("'맞히면 다음에 더 늦게, 못 하면 며칠 뒤에 또 만나요'"));
  const tr = fs.readFileSync(new URL('../js/track.js', import.meta.url), 'utf8');
  assert.ok(tr.includes('Object.assign(r, scheduleSentence(r.box || 0, r.reviewMiss || 0, passed, todayKey()));'));
  const mp = fs.readFileSync(new URL('../js/mathprog.js', import.meta.url), 'utf8');
  assert.equal(mp.includes('scheduleSentence'), false, '수학 복습은 옛 schedule');
});
