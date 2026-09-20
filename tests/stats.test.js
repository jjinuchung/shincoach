// 학습 기록 계산 로직 테스트: node --test tests/stats.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fmtDur, weekSeries, hardScore, hardSentences, contentSummary, essayNumbers, splitEssayDays, countEssays, agoLabel } from '../js/stats.js';
import { todayKey } from '../js/track.js';

test('fmtDur', () => {
  assert.equal(fmtDur(40), '40초');
  assert.equal(fmtDur(25 * 60), '25분');
  assert.equal(fmtDur(3600 + 20 * 60), '1시간 20분');
});

test('todayKey: 로컬 날짜 YYYY-MM-DD', () => {
  assert.equal(todayKey(new Date(2026, 8, 3)), '2026-09-03');
});

test('weekSeries: 오늘 포함 7일, 없는 날은 0', () => {
  const week = weekSeries([
    { date: '2026-09-13', doneKeys: ['a', 'b'], seconds: 600, speakAttempts: 4, speakPass: 3 },
    { date: '2026-09-10', doneKeys: ['c'], seconds: 120, speakAttempts: 0, speakPass: 0, puzzles: 2, puzzleSolved: 1 },
    { date: '2026-08-01', doneKeys: ['z'], seconds: 999, speakAttempts: 0, speakPass: 0 }, // 범위 밖
  ], '2026-09-13');
  assert.equal(week.length, 7);
  assert.equal(week[6].date, '2026-09-13');
  assert.equal(week[6].isToday, true);
  assert.equal(week[6].sentences, 2);
  assert.equal(week[6].puzzles, 0, '퍼즐 필드 없는 옛 기록은 0');
  assert.equal(week[3].date, '2026-09-10');
  assert.equal(week[3].seconds, 120);
  assert.equal(week[3].puzzles, 2);
  assert.equal(week[3].puzzleSolved, 1);
  assert.equal(week[0].seconds, 0);
  assert.equal(week.reduce((a, d) => a + d.seconds, 0), 720);
});

test('hardScore/hardSentences: 3번 미달 통과 > 미달 > 낮은 점수 순, 기록 없는 문장은 제외', () => {
  const recs = [
    { key: 'a', en: 'A', plays: 5, speakAttempts: 3, speakPass: 0, speakFail: 2, speakSkipped: 1, bestRatio: 0.2, lastAt: 1 },
    { key: 'b', en: 'B', plays: 2, speakAttempts: 1, speakPass: 1, speakFail: 0, speakSkipped: 0, bestRatio: 1.0, lastAt: 2 },
    { key: 'c', en: 'C', plays: 3, speakAttempts: 2, speakPass: 1, speakFail: 1, speakSkipped: 0, bestRatio: 0.5, lastAt: 3 },
    { key: 'd', en: 'D', plays: 1, speakAttempts: 0, speakPass: 0, speakFail: 0, speakSkipped: 0, bestRatio: 0, lastAt: 4 },
    { key: 'e', en: 'E', plays: 15, speakAttempts: 0, speakPass: 0, speakFail: 0, speakSkipped: 0, bestRatio: 0, lastAt: 5 }, // 반복만 많음
  ];
  const hard = hardSentences(recs, 10);
  assert.deepEqual(hard.map((r) => r.key), ['a', 'c', 'e']);
  assert.ok(hardScore(recs[0]) > hardScore(recs[2]));
  assert.equal(hardScore(recs[1]), 0, '완벽히 통과한 문장은 0점');
});

test('contentSummary: 진행률·정복·시간·마지막 학습', () => {
  const items = [{ id: 'x', title: 'X' }, { id: 'y', title: 'Y' }];
  const recs = [
    { itemId: 'x', done: true, bestRatio: 0.9, seconds: 30, speakAttempts: 2, speakPass: 2, lastAt: 100 },
    { itemId: 'x', done: true, bestRatio: 0.3, seconds: 20, speakAttempts: 1, speakPass: 0, lastAt: 200 },
    { itemId: 'x', done: false, bestRatio: 0, seconds: 5, speakAttempts: 0, speakPass: 0, lastAt: 50 },
  ];
  const s = contentSummary(items, recs, (it) => (it.id === 'x' ? 10 : 0));
  assert.equal(s[0].done, 2);
  assert.equal(s[0].pct, 20);
  assert.equal(s[0].mastered, 1);
  assert.equal(s[0].seconds, 55);
  assert.equal(s[0].lastAt, 200);
  assert.equal(s[1].pct, 0);
  assert.equal(s[0].broken, false, '멀쩡한 영상은 깨짐 표시가 없다');
});

test('contentSummary: 저장이 깨진 영상은 📊에도 표시된다 (부모가 알아야 다시 넣어 준다)', () => {
  const items = [{ id: 'x', title: '젠가', broken: true }];
  const recs = [{ itemId: 'x', done: true, bestRatio: 0.9, seconds: 30, speakAttempts: 1, speakPass: 1, lastAt: 10 }];
  const s = contentSummary(items, recs, () => 0); // 못 읽으니 문장 수는 0
  assert.equal(s[0].broken, true);
  assert.equal(s[0].title, '젠가', '제목은 세션 기록에서 되찾아 온 것을 그대로 쓴다');
  assert.equal(s[0].done, 1, '공부한 기록 자체는 남아 있다');
  assert.equal(s[0].pct, 0, '문장 수가 0이면 0%로 (나누기 오류 없이)');
});

test('✍️ 에세이 번호는 오래된 글이 [1] — 새 글을 써도 이미 매긴 번호가 안 밀린다', () => {
  const days = [
    { date: '2026-09-16', essays: [{ id: 'new1', written: 'today one' }] },          // 오늘 새로 쓴 글
    { date: '2026-09-14', essays: [{ id: 'old1', written: 'older one' }, { id: 'done', written: 'x', coachFix: '이미 고침' }] },
    { date: '2026-09-15', essays: [{ id: 'mid1', written: 'middle one' }] },
  ];
  const no = essayNumbers(days);
  assert.equal(no.get('old1'), 1, '가장 오래된 글이 1번');
  assert.equal(no.get('mid1'), 2);
  assert.equal(no.get('new1'), 3, '새 글은 뒤에 붙는다');
  assert.equal(no.has('done'), false, '이미 고쳐 준 글에는 번호를 안 붙인다');
});

test('✍️ 📮 고쳐 줄 글과 ✅ 고쳐 준 글을 나눈다 (남는 글 없는 날은 버린다)', () => {
  const days = [
    { date: '2026-09-16', essays: [{ id: 'a', written: 'one' }, { id: 'b', written: 'two', coachFix: '고침' }] },
    { date: '2026-09-15', essays: [{ id: 'c', written: 'three', coachFix: '고침' }] },  // 전부 고쳐 준 날
    { date: '2026-09-14', essays: [{ id: 'd', written: 'four' }] },                      // 전부 안 고친 날
    { date: '2026-09-13', essays: [{ id: 'e' }] },                                       // 쓴 글이 없으면 양쪽 다 아님
  ];
  const todo = splitEssayDays(days, false);
  const done = splitEssayDays(days, true);
  assert.deepEqual(todo.map((d) => d.date), ['2026-09-16', '2026-09-14'], '안 고친 글이 있는 날만');
  assert.deepEqual(todo[0].essays.map((e) => e.id), ['a'], '같은 날에서도 안 고친 글만 골라낸다');
  assert.deepEqual(done.map((d) => d.date), ['2026-09-16', '2026-09-15']);
  assert.equal(countEssays(todo), 2);
  assert.equal(countEssays(done), 2);
  assert.equal(countEssays([]), 0);
});

test('✍️ 나눈 뒤에도 번호는 그대로 (📮 덩어리만 넘겨도 오래된 글이 [1])', () => {
  const days = [
    { date: '2026-09-16', essays: [{ id: 'new1', written: 'today one' }] },
    { date: '2026-09-14', essays: [{ id: 'old1', written: 'older one' }, { id: 'done', written: 'x', coachFix: '이미 고침' }] },
    { date: '2026-09-15', essays: [{ id: 'mid1', written: 'middle one' }] },
  ];
  const no = essayNumbers(splitEssayDays(days, false));
  assert.equal(no.get('old1'), 1);
  assert.equal(no.get('mid1'), 2);
  assert.equal(no.get('new1'), 3);
  assert.equal(no.size, 3, '고쳐 준 글은 번호에서 빠진 채로 유지');
});

test('✍️ 며칠 전인지 한 마디로', () => {
  assert.equal(agoLabel('2026-09-20', '2026-09-20'), '오늘');
  assert.equal(agoLabel('2026-09-19', '2026-09-20'), '어제');
  assert.equal(agoLabel('2026-09-17', '2026-09-20'), '3일 전');
  assert.equal(agoLabel('2026-08-31', '2026-09-20'), '20일 전', '달을 넘어가도 맞는다');
  assert.equal(agoLabel('', '2026-09-20'), '');
  assert.equal(agoLabel('2026-09-21', '2026-09-20'), '오늘', '앞선 날짜는 오늘로 본다 (기기 시계가 밀릴 수 있다)');
});
