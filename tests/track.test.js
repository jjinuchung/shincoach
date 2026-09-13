// 학습 기록 수집 로직 테스트 (db를 스텁으로 대체해 vm에서 실행)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

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
