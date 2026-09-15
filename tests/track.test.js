// 학습 기록 수집 로직 테스트 (db를 스텁으로 대체해 vm에서 실행)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { enroll, schedule, GRADUATED, addDays } from '../js/review.js';

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

function stub() {
  const store = { sent: [], daily: null, sessions: [], fail: false };
  return {
    store,
    sentenceKey: (id, s) => `${id}|${Math.round(s * 10)}`,
    getSentenceStats: async () => new Map(),
    putSentenceStats: async (recs) => { if (store.fail) throw new Error('quota'); store.sent.push(...recs); },
    putSession: async (s) => { store.sessions.push(s); },
    getDaily: async () => null,
    putDaily: async (d) => { store.daily = d; },
    bumpVocabViews: async () => {},
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
  run('t.daily.date = "2000-01-01"; t.daily.seconds = 50; t.daily.doneKeys = ["old"];'); // 어제 기록인 척
  run('tick({ start: 1, end: 2, en: "a" }, 1)');
  assert.equal(run('t.daily.date'), run('todayKey()'), '오늘 날짜로 전환');
  assert.equal(run('t.daily.seconds'), 1, '새 기록에는 오늘 1초만');
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(s.store.daily && s.store.daily.date, '2000-01-01', '어제 기록은 저장됨');
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
  assert.equal(run('t.dailyDirty'), true);
});

test('goalRewarded: 오늘 목표 보너스 지급 표시는 하루 기록에 남고 dirty 처리', async () => {
  const s = stub();
  const { run } = loadTrack(s);
  await run('open({ id: "x", title: "X" })');
  assert.equal(run('goalRewarded()'), false);
  run('markGoalRewarded()');
  assert.equal(run('goalRewarded()'), true);
  assert.equal(run('t.dailyDirty'), true);
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
  assert.equal(s.store.daily.reviewSentences, 2);
  assert.equal(s.store.daily.reviewRounds, 1);
});

test('🌟 황금 볼은 하루 한 번만 — 앱을 껐다 켜거나 다른 영화를 열어도 그대로', async () => {
  const s = stub();
  // 저장된 오늘 기록을 돌려주는 스텁 (실제 IndexedDB처럼)
  s.getDaily = async (key) => (s.store.daily && s.store.daily.date === key ? s.store.daily : null);

  const first = loadTrack(s);
  await first.run('open({ id: "x", title: "X" })');
  assert.equal(first.run('reviewGoldenTaken()'), false);
  first.run('markReviewGolden()');
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
