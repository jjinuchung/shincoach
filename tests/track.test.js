// 학습 기록 수집 로직 테스트 (db를 스텁으로 대체해 vm에서 실행)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { enroll, schedule, GRADUATED, addDays } from '../js/review.js';
// 오늘 기록 합치기 규칙은 **실제 db.js 함수**를 그대로 쓴다 (스텁이 진짜 규칙과 어긋나지 않게)
import { emptyDaily, mergeDailyDelta } from '../js/db.js';

function loadTrack(dbStub) {
  let src = fs.readFileSync(new URL('../js/track.js', import.meta.url), 'utf8');
  src = src.replace(/^import[\s\S]*?from .*?;\r?\n/gm, '').replace(/^export /gm, '');
  const ctx = vm.createContext({
    console, setInterval: () => 0, clearInterval() {}, Date, Set, Map, Promise, Math, Number, String, Array,
    ...dbStub,
  });
  vm.runInContext(src, ctx);
  return { run: (code) => vm.runInContext(code, ctx), ctx };
}

/**
 * IndexedDB 대신 쓰는 저장소 스텁.
 * daily는 실제 앱처럼 **날짜별 한 벌**이고, 쓰기는 증분(applyDailyDelta)·선점(claimDaily*)만 허용한다
 * → 통째로 덮어쓰는 코드가 다시 들어오면 테스트가 깨진다.
 */
function stub() {
  const store = { sent: [], days: new Map(), sessions: [], fail: false, dailyFail: false };
  const get = (date) => store.days.get(date) || null;
  return {
    store,
    sentenceKey: (id, s) => `${id}|${Math.round(s * 10)}`,
    getSentenceStats: async () => new Map(),
    putSentenceStats: async (recs) => { if (store.fail) throw new Error('quota'); store.sent.push(...recs); },
    putSession: async (s) => { store.sessions.push(s); },
    getDaily: async (date) => get(date),
    bumpVocabViews: async () => {},
    emptyDaily,
    mergeDailyDelta,
    applyDailyDelta: async (date, delta) => {
      if (store.dailyFail) throw new Error('quota');
      const next = mergeDailyDelta(get(date), date, delta);
      store.days.set(date, next);
      return next;
    },
    claimDailyCount: async (date, field, max) => {
      const cur = get(date);
      const have = (cur && Number(cur[field])) || 0;
      if (max !== undefined && have >= max) return { won: false, count: have, daily: cur || emptyDaily(date) };
      const next = mergeDailyDelta(cur, date, { [field]: 1 });
      store.days.set(date, next);
      return { won: true, count: next[field], daily: next };
    },
    // 🔁 복습 규칙은 실제 모듈을 그대로 씀 (vm에는 import가 없으므로 주입)
    enroll, schedule, GRADUATED,
  };
}

test('#7 저장 실패한 문장 기록은 다음 flush에서 재시도됨', async () => {
  const s = stub();
  const { run, ctx } = loadTrack(s);
  await run('open({ id: "x", title: "X" })');
  run('play({ start: 1, end: 2, en: "a" }, 0)');
  s.store.fail = true;
  await run('flush()');
  assert.equal(s.store.sent.length, 0, '실패해서 저장 안 됨');
  assert.ok(run('lastFlushError'), '오류 기록');
  s.store.fail = false;
  await run('flush()');
  assert.equal(s.store.sent.length, 1, '재시도로 저장됨');
  assert.equal(s.store.sent[0].plays, 1);
});

test('#8 자정이 지나면 새 날짜 기록으로 넘어감', async () => {
  const s = stub();
  const { run } = loadTrack(s);
  await run('open({ id: "x", title: "X" })');
  run('tick({ start: 1, end: 2, en: "a" }, 50)');                 // 아직 저장 안 된 50초
  run('t.daily.date = "2000-01-01"; t.daily.doneKeys = ["old"];'); // 어제 기록인 척
  run('tick({ start: 1, end: 2, en: "a" }, 1)');
  assert.equal(run('t.daily.date'), run('todayKey()'), '오늘 날짜로 전환');
  assert.equal(run('t.daily.seconds'), 1, '새 기록에는 오늘 1초만');
  await new Promise((r) => setTimeout(r, 0));
  const y = s.store.days.get('2000-01-01');
  assert.ok(y, '어제 몫이 어제 날짜로 저장됨');
  assert.equal(y.seconds, 50, '아직 안 쓴 어제 증분이 어제 기록으로 감');
});

test('done/todayDone: 같은 문장은 하루에 한 번만 셈', async () => {
  const s = stub();
  const { run } = loadTrack(s);
  await run('open({ id: "x", title: "X" })');
  run('done({ start: 1, end: 2, en: "a" }); done({ start: 1, end: 2, en: "a" }); done({ start: 5, end: 6, en: "b" });');
  assert.equal(run('todayDone()'), 2);
});

test('puzzle: 문장별·세션·일별 퍼즐 횟수/정답 누적 (옛 기록에 필드가 없어도 됨)', async () => {
  const s = stub();
  const { run } = loadTrack(s);
  await run('open({ id: "x", title: "X" })');
  run('t.stats.set(sentenceKey("x", 1), { key: sentenceKey("x", 1), plays: 3 });'); // 퍼즐 필드 없는 옛 기록
  run('puzzle({ start: 1, end: 2, en: "a b c" }, { solved: true, wrong: 1 }); puzzle({ start: 1, end: 2, en: "a b c" }, { solved: false, wrong: 3 });');
  const r = run('t.stats.get(sentenceKey("x", 1))');
  assert.equal(r.puzzles, 2);
  assert.equal(r.puzzleSolved, 1);
  assert.equal(r.puzzleWrong, 4);
  assert.equal(r.plays, 3, '기존 필드 유지');
  assert.equal(run('t.session.puzzles'), 2);
  assert.equal(run('t.session.puzzleSolved'), 1);
  assert.equal(run('t.daily.puzzles'), 2);
  assert.equal(run('t.daily.puzzleSolved'), 1);
  assert.equal(run('t.dailyDelta.puzzles'), 2, '저장할 증분에도 쌓임');
});

test('goalRewarded: 오늘 목표 보너스 지급 표시는 하루 기록에 남는다', async () => {
  const s = stub();
  const { run } = loadTrack(s);
  await run('open({ id: "x", title: "X" })');
  assert.equal(run('goalRewarded()'), false);
  assert.equal(await run('markGoalRewarded()'), true, '처음이라 선점 성공');
  assert.equal(run('goalRewarded()'), true);
  assert.equal(await run('markGoalRewarded()'), false, '두 번째는 보상 없음');
  assert.equal(run('todayPuzzles()'), 0);
  run('puzzle({ start: 1, end: 2, en: "a b c" }, { solved: true, wrong: 0 })');
  assert.equal(run('todayPuzzles()'), 1);
});

// ── 🔁 복습 ──

test('🔁 문장을 "했다"고 인정하면 내일부터 복습 큐에 들어간다', async () => {
  const { run } = loadTrack(stub());
  await run('open({ id: "x", title: "X" })');
  run('done({ start: 1, end: 2, en: "Hello there." })');
  const today = run('todayKey()');
  const r = run('statsList()[0]');
  assert.equal(r.done, true);
  assert.equal(r.box, 0);
  assert.equal(r.dueAt, addDays(today, 1), '완료한 다음 날');
});

test('🔁 이미 복습 중인 문장을 다시 완료해도 진도가 초기화되지 않는다', async () => {
  const { run } = loadTrack(stub());
  await run('open({ id: "x", title: "X" })');
  const cue = '{ start: 1, end: 2, en: "Hello there." }';
  run(`done(${cue})`);
  run(`review(${cue}, true)`);          // box 1로 올라가고 이틀 뒤로
  const after = run('statsList()[0]');
  run(`done(${cue})`);                   // 같은 문장을 또 끝까지 들음
  const again = run('statsList()[0]');
  assert.equal(again.box, after.box, 'box 유지');
  assert.equal(again.dueAt, after.dueAt, '복습 날짜 유지');
});

test('🔁 졸업(👑)한 문장은 다시 완료해도 복습 큐에 안 들어간다', async () => {
  const { run } = loadTrack(stub());
  await run('open({ id: "x", title: "X" })');
  const cue = '{ start: 1, end: 2, en: "Hello there." }';
  run(`done(${cue})`);
  for (let i = 0; i < 5; i++) run(`review(${cue}, true)`);
  assert.equal(run('statsList()[0]').box, GRADUATED);
  run(`done(${cue})`);
  const r = run('statsList()[0]');
  assert.equal(r.box, GRADUATED);
  assert.equal(r.dueAt, '', '졸업 상태 유지');
});

test('🔁 복습 통과/미달이 box와 횟수에 반영된다', async () => {
  const { run } = loadTrack(stub());
  await run('open({ id: "x", title: "X" })');
  const cue = '{ start: 1, end: 2, en: "Hello there." }';
  const today = run('todayKey()');
  run(`done(${cue})`);

  const pass = run(`review(${cue}, true)`);
  assert.deepEqual({ box: pass.box, dueAt: pass.dueAt }, schedule(0, true, today));
  let r = run('statsList()[0]');
  assert.equal(r.reviews, 1);
  assert.equal(r.reviewPass, 1);

  const fail = run(`review(${cue}, false)`);
  assert.equal(fail.box, 0, '미달이면 한 단계 내려감');
  assert.equal(fail.dueAt, addDays(today, 1), '내일 다시');
  r = run('statsList()[0]');
  assert.equal(r.reviews, 2);
  assert.equal(r.reviewPass, 1, '통과한 것만 셈');
});

test('🔁 오늘 복습한 문장 수·회차가 daily에 쌓이고 세션에도 남는다', async () => {
  const s = stub();
  const { run } = loadTrack(s);
  await run('open({ id: "x", title: "X" })');
  run('done({ start: 1, end: 2, en: "one." })');
  run('done({ start: 3, end: 4, en: "two." })');
  run('review({ start: 1, end: 2, en: "one." }, true)');
  run('review({ start: 3, end: 4, en: "two." }, false)');
  run('tick({ start: 1, end: 2, en: "one." }, 5)'); // 세션이 저장되려면 시간이 있어야 함
  assert.equal(run('todayReviewSentences()'), 2);
  assert.equal(run('todayReviewRounds()'), 0);
  run('markReviewRound()');
  assert.equal(run('todayReviewRounds()'), 1);

  await run('close()');
  const sess = s.store.sessions[0];
  assert.equal(sess.reviews, 2, '세션에 복습 문장 수');
  assert.equal(sess.reviewPass, 1, '그중 통과한 수');
  const today = s.store.days.get(run('todayKey()'));
  assert.equal(today.reviewSentences, 2);
  assert.equal(today.reviewRounds, 1);
});

test('🌟 황금 볼은 하루 한 번만 — 앱을 껐다 켜거나 다른 영화를 열어도 그대로', async () => {
  const s = stub();
  const first = loadTrack(s);
  await first.run('open({ id: "x", title: "X" })');
  assert.equal(first.run('reviewGoldenTaken()'), false);
  assert.equal(await first.run('markReviewGolden()'), true);
  assert.equal(first.run('reviewGoldenTaken()'), true);
  await first.run('close()');

  // 앱을 껐다 켜고 다른 영화를 연 상황
  const second = loadTrack(s);
  await second.run('open({ id: "y", title: "Y" })');
  assert.equal(second.run('reviewGoldenTaken()'), true, '영화를 바꿔가며 여러 번 받는 것을 막는다');
});

test('👋 종료 인사: 오늘 한 줄 요약 (한 것만 보여줌)', () => {
  const { run } = loadTrack(stub());
  const call = (daily) => run(`byeSummary(${JSON.stringify(daily)})`);

  assert.equal(call(null), '', '기록이 없는 날 (인사말만 보여준다)');
  assert.equal(call({ date: '2026-09-16', doneKeys: [] }), '', '열어만 본 날');
  assert.equal(
    call({ doneKeys: ['a', 'b', 'c'], reviewSentences: 2, puzzles: 1, seconds: 930 }),
    '오늘 문장 3개 · 🔁 복습 2개 · 🧩 퍼즐 1개 · ⏱ 16분',
  );
  assert.equal(call({ doneKeys: ['a'], seconds: 20 }), '오늘 문장 1개', '1분이 안 되면 시간은 생략');
});

// ── 🪟 두 창 동시 실행 (홈 화면 앱 + Chrome 탭) ──
// 각 창이 오늘 기록 사본을 들고 있다가 통째로 덮어써서 공부 기록이 사라지고
// "하루 한 번" 보상을 양쪽이 다 받던 것을 막는다.

test('🪟 두 창이 같이 공부하면 시간·문장이 합쳐진다 (덮어쓰지 않음)', async () => {
  const s = stub();
  const a = loadTrack(s); // 홈 화면에 설치한 앱
  const b = loadTrack(s); // 같은 기기의 Chrome 탭
  await a.run('open({ id: "x", title: "X" })');
  await b.run('open({ id: "x", title: "X" })');

  a.run('tick({ start: 1, end: 2, en: "a" }, 30); done({ start: 1, end: 2, en: "a" })');
  b.run('tick({ start: 5, end: 6, en: "b" }, 20); done({ start: 5, end: 6, en: "b" })');
  await a.run('flush()');
  await b.run('flush()'); // 예전에는 여기서 A가 공부한 30초가 사라졌다

  const saved = s.store.days.get(a.run('todayKey()'));
  assert.equal(saved.seconds, 50, '두 창의 공부 시간이 더해짐');
  assert.deepEqual([...saved.doneKeys].sort(), ['x|10', 'x|50'], '두 창이 한 문장이 다 남음');
  assert.equal(b.run('t.daily.seconds'), 50, '나중에 저장한 창의 화면에도 합친 값이 보임');
});

test('🪟 하루 한 번 보상(🌟 황금 볼·🎯 목표·✍️ 에세이·❤️ HP 벌)은 한 창만 받는다', async () => {
  for (const [claim, ask] of [
    ['markReviewGolden()', 'reviewGoldenTaken()'],
    ['markGoalRewarded()', 'goalRewarded()'],
    ['markEssayDone()', 'essayDoneToday()'],
    ['markHpMissed()', 'hpMissedApplied()'],
  ]) {
    const s = stub();
    const a = loadTrack(s);
    const b = loadTrack(s);
    await a.run('open({ id: "x", title: "X" })');
    await b.run('open({ id: "x", title: "X" })');
    assert.equal(a.run(ask), false, `${claim} 시작은 안 받은 상태`);
    assert.equal(b.run(ask), false);

    const [gotA, gotB] = await Promise.all([a.run(claim), b.run(claim)]);
    assert.equal(gotA && gotB, false, `${claim}: 두 창이 다 받으면 안 됨`);
    assert.equal(gotA || gotB, true, `${claim}: 한 창은 받아야 함`);
  }
});

test('🪟 하루 상한(⚔️ 배틀 1번·🍄 다이버섯 2개)도 두 창을 합쳐 센다', async () => {
  const s = stub();
  const a = loadTrack(s);
  const b = loadTrack(s);
  await a.run('open({ id: "x", title: "X" })');
  await b.run('open({ id: "x", title: "X" })');

  const battles = await Promise.all([a.run('markBattle(1)'), b.run('markBattle(1)')]);
  assert.deepEqual(battles.filter(Boolean).length, 1, '배틀은 하루 1번');

  const shrooms = [];
  for (const w of [a, b, a, b]) shrooms.push(await w.run('markMushroom(2)'));
  assert.equal(shrooms.filter(Boolean).length, 2, '다이버섯은 하루 2개');
  assert.equal(s.store.days.get(a.run('todayKey()')).mushrooms, 2);
});

test('🪟 저장이 실패하면 증분을 그대로 들고 있다가 다음에 다시 쓴다', async () => {
  const s = stub();
  const { run } = loadTrack(s);
  await run('open({ id: "x", title: "X" })');
  run('tick({ start: 1, end: 2, en: "a" }, 7)');
  s.store.dailyFail = true;
  await run('flush()');
  assert.equal(s.store.days.size, 0, '저장 안 됨');
  s.store.dailyFail = false;
  run('tick({ start: 1, end: 2, en: "a" }, 3)');
  await run('flush()');
  assert.equal(s.store.days.get(run('todayKey()')).seconds, 10, '실패했던 7초까지 함께 저장');
});
