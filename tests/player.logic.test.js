// player.js 상태 로직 테스트 (DOM/미디어를 최소 스텁으로 대체해 vm에서 실행)
// node --test tests/player.logic.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function makeEl() {
  const listeners = {};
  return {
    hidden: false, textContent: '', innerHTML: '', className: '', dataset: {}, value: '', checked: false,
    style: {}, firstChild: { textContent: '' }, scrollTop: 0, clientHeight: 100, offsetTop: 0, offsetHeight: 20,
    classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, toggle(c, f) { const on = f === undefined ? !this._s.has(c) : !!f; if (on) this._s.add(c); else this._s.delete(c); return on; }, contains(c) { return this._s.has(c); } },
    addEventListener(t, fn) { (listeners[t] ||= []).push(fn); },
    removeEventListener() {},
    appendChild() {}, querySelector() { return null; }, querySelectorAll() { return []; },
    scrollTo() {}, showModal() {}, close() {},
    _fire(t, ev) { (listeners[t] || []).forEach((fn) => fn(ev)); },
  };
}

function loadPlayer() {
  let src = fs.readFileSync(new URL('../js/player.js', import.meta.url), 'utf8');
  src = src.replace(/^import[\s\S]*?from .*?;\r?\n/gm, '').replace(/^export /gm, '');
  const els = {};
  const $ = (id) => (els[id] ||= makeEl());
  const video = makeEl();
  Object.assign(video, {
    currentTime: 0, paused: true, ended: false, seeking: false, duration: 100, playbackRate: 1, defaultPlaybackRate: 1,
    play() { this.paused = false; this.ended = false; this._fire('play'); return Promise.resolve(); },
    pause() { if (!this.paused) { this.paused = true; this._fire('pause'); } },
    removeAttribute() {}, load() {},
  });
  els.video = video;
  const puzzleCalls = [];
  const xpLog = [];
  const catchCalls = [];
  const ctx = vm.createContext({
    console, setTimeout, clearTimeout, setInterval() { return 0; }, clearInterval() {},
    requestAnimationFrame: () => 1, cancelAnimationFrame() {},
    performance: { now: () => Date.now() },
    localStorage: { getItem: () => null, setItem() {} },
    navigator: { onLine: true },
    document: { getElementById: $, addEventListener() {}, hidden: false, createElement: () => makeEl(), createTextNode: () => ({}) },
    window: { scrollTo() {}, addEventListener() {} },
    URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
    alert() {},
    // srt.js 의존 함수 스텁
    parseSubtitle: () => [], mergeSubtitles: (a) => a, mergeIntoSentences: (a) => a,
    wordTimings: () => [], findCueIndex: (cues, t) => cues.findIndex((c) => t >= c.start && t < c.end),
    getItem: async () => null, getVideoBlob: async () => null, updateItem: async () => null, listDaily: async () => [],
    loadVocab: async () => ({ lookup: () => [] }),
    initDiag() {}, renderDiag() {},
    runSpeakCheck: () => ({ promise: new Promise(() => {}), stop() {}, cancel() {} }), prepareMic: async () => null, releaseMic() {},
    track: { open: async () => {}, close: async () => {}, flush: async () => {}, play() {}, listen() {}, done() {}, speak() {}, tick() {}, vocab() {}, isMastered: () => false, doneCount: () => 0, todayDone: () => 0, todayKey: () => '2026-09-14', todayPuzzles: () => 1, goalRewarded: () => false, markGoalRewarded() {}, MASTER_RATIO: 0.8, puzzle() {} },
    // puzzle.js 스텁: 열린 퍼즐을 puzzleCalls에 기록 (onClose를 테스트에서 직접 호출)
    puzzleCalls,
    initPuzzle() {}, closePuzzle() {},
    openPuzzle(cue, opts) { puzzleCalls.push({ cue, opts }); },
    pickPuzzle: (cues) => (cues.length ? cues[0] : null),
    // pokemon.js 스텁
    loadCharacters: async () => [], downloadCharacters: async () => ({ ok: 0, fail: 0 }), ROSTER: [], pickCharacters: (a, n) => (a || []).slice(0, n), isUnlocked: () => true, unlockCountAt: () => 0,
    // xp.js / catch.js 스텁: XP 획득과 잡기 화면 호출을 기록
    xpLog, catchCalls,
    initProfile: async () => ({}), getLevelInfo: () => ({ level: 1, into: 0, need: 100, xp: 0 }),
    gainXp: (n) => { xpLog.push(n); return { gained: n, leveledUp: false, from: 1, to: 1, info: { level: 1, into: 0, need: 100 } }; },
    catchAttempt: () => ({ caught: true }), previewAttempt: () => ({ caught: false }),
    puzzleXp: (r) => (r && r.solved ? [30, 20, 10][Math.min(r.wrong || 0, 2)] : 3),
    XP: { done: 2, speak: 3, speakStar: 5, goal: 30 }, streakBefore: () => 0, streakBonus: (n) => Math.min(40, 10 + 5 * (n - 1)), STREAK_MIN_DONE: 5, flushProfile() {},
    initCatch() {}, closeCatch() {}, openCatch(o) { catchCalls.push(o); },
    // sfx.js 스텁
    sfx: { whoosh() {}, hit() {}, tick() {}, success() {}, fail() {}, levelUp() {}, ding() {}, wrong() {} }, unlock() {}, setSfxEnabled() {}, setVibrateEnabled() {},
  });
  vm.runInContext(src, ctx);
  vm.runInContext('initPlayer({ showView() {} }); state.open = true; state.repeatIdx = 0; settings.speakCheck = false; settings.puzzleEvery = 0; // 테스트 기준: 반복 끔, 말하기 확인 끔, 퍼즐 끔', ctx);
  return { ctx, video, els, puzzleCalls, xpLog, catchCalls, run: (code) => vm.runInContext(code, ctx) };
}

test('#2 앞으로 크게 탐색하면 반복을 소비하지 않고 해당 문장으로 동기화', () => {
  const { run, video } = loadPlayer();
  run('state.cues = [{start:0,end:2,en:"a",ko:""},{start:10,end:12,en:"b",ko:""},{start:20,end:22,en:"c",ko:""}]; state.idx = 0; state.repeatIdx = 1; state.repeatCount = 0;');
  video.paused = false;
  video.currentTime = 21;
  run('onTick()');
  assert.equal(run('state.idx'), 2);
  assert.equal(run('state.repeatCount'), 0);
  assert.equal(video.currentTime, 21);
});

test('#2 seeking 중에는 문장 끝 판정을 하지 않음', () => {
  const { run, video } = loadPlayer();
  run('state.cues = [{start:0,end:2,en:"a",ko:""},{start:2,end:4,en:"b",ko:""}]; state.idx = 0;');
  video.paused = false;
  video.currentTime = 1.999;
  run('state.seeking = true; onTick()');
  assert.equal(run('state.idx'), 0);
  run('state.seeking = false; onTick()');
  assert.equal(run('state.idx'), 1);
});

test('#7 goTo(play:false)는 재생 중인 영상을 멈춤', () => {
  const { run, video } = loadPlayer();
  run('state.cues = [{start:0,end:2,en:"a",ko:""},{start:10,end:12,en:"b",ko:""}]; state.idx = 0;');
  video.paused = false;
  run('goTo(1, { play: false })');
  assert.equal(video.paused, true);
  assert.equal(video.currentTime, 10);
});

test('#3 반복 중 영상이 끝나면(ended) 처음으로 되감고 다시 재생', () => {
  const { run, video } = loadPlayer();
  run('state.cues = [{start:98,end:100,en:"last",ko:""}]; state.idx = 0; state.repeatIdx = 1; state.repeatCount = 0;');
  video.paused = true; video.ended = true; video.currentTime = 100;
  run('onVideoEnded()');
  assert.equal(run('state.repeatCount'), 1);
  assert.equal(video.currentTime, 98);
  assert.equal(video.paused, false, '다시 재생됨');
});

test('#3 마지막 문장 섀도잉: rAF와 ended가 겹쳐도 대기 타이머는 하나', () => {
  const { run, video, els } = loadPlayer();
  run('state.cues = [{start:98,end:100,en:"last",ko:""}]; state.idx = 0; state.shadow = true;');
  video.paused = false; video.currentTime = 99.99;
  run('onTick()');                 // rAF 경로: 문장 끝 → 섀도잉 대기 시작
  const t1 = run('state.shadowTimer');
  assert.ok(t1, '타이머 생성');
  video.ended = true;
  run('onVideoEnded()');           // ended 경로: 중복 호출
  assert.equal(run('state.shadowTimer'), t1, '같은 타이머 유지');
  assert.equal(els['shadow-overlay'].hidden, false);
  run('cancelShadowWait()');
});

test('#1 화면이 숨겨지면 재생·섀도잉 대기를 멈추고 즉시 저장', async () => {
  const { run, video, ctx } = loadPlayer();
  let saved = null;
  ctx.updateItem = async (id, patch) => { saved = patch; return null; };
  run('state.item = { id: "x" }; state.cues = [{start:0,end:2,en:"a",ko:""},{start:2,end:4,en:"b",ko:""}]; state.idx = 1; state.shadow = true;');
  video.paused = false;
  run('startShadowWait(state.cues[1])');
  assert.ok(run('state.shadowTimer'));
  ctx.document.hidden = true;
  run('onVisibilityChange()');
  assert.equal(run('state.shadowTimer'), null, '섀도잉 대기 취소');
  assert.equal(video.paused, true, '영상 정지');
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(saved && saved.lastCue, 1, '즉시 저장'); // vm 객체라 deepEqual 대신 필드 비교
});

// ── 듣기 먼저 모드 ──

test('듣기 먼저: 3번 들을 때까지 영어 숨기고 반복, 3번째 끝나면 공개 + 멈춤', () => {
  const { run, video, els } = loadPlayer();
  run('settings.listenFirst = 3; state.cues = [{start:0,end:2,en:"a",ko:"가"},{start:10,end:12,en:"b",ko:"나"}]; state.idx = -1;');
  run('goTo(0)');
  assert.equal(run('state.enRevealed'), false);
  assert.equal(els['sub-en'].hidden, true, '영어 숨김');
  assert.equal(els['sub-ko'].hidden, false, '한글 표시');
  assert.equal(els['btn-toggle-en'].textContent, '👂 0/3');
  for (let n = 1; n <= 2; n++) {
    video.currentTime = 2; run('onCueEnd()');
    assert.equal(run('state.listenCount'), n);
    assert.equal(video.currentTime, 0, '처음으로 되감기');
    assert.equal(video.paused, false, '계속 재생');
    assert.equal(run('state.enRevealed'), false);
  }
  video.currentTime = 2; run('onCueEnd()');
  assert.equal(run('state.enRevealed'), true, '3번째 끝 → 공개');
  assert.equal(els['sub-en'].hidden, false, '영어 표시');
  assert.equal(video.paused, true, '멈춤');
  assert.equal(run('state.idx'), 0, '다음 문장으로 넘어가지 않음');
  assert.equal(els['btn-toggle-en'].textContent, 'EN');
});

test('듣기 먼저: 공개 전 EN 버튼은 열리지 않음, 다음 문장으로 가면 다시 숨김', () => {
  const { run, els } = loadPlayer();
  run('settings.listenFirst = 2; state.cues = [{start:0,end:2,en:"a",ko:"가"},{start:10,end:12,en:"b",ko:"나"}]; state.idx = -1;');
  run('goTo(0)');
  run('toggleSub("en")');
  assert.equal(els['sub-en'].hidden, true, '공개 전엔 토글 무시');
  run('state.enRevealed = true; applySubVisibility();');
  assert.equal(els['sub-en'].hidden, false);
  run('goTo(1)');
  assert.equal(run('state.enRevealed'), false, '새 문장 → 다시 숨김');
  assert.equal(run('state.listenCount'), 0);
});

test('듣기 먼저 + 섀도잉: 공개 시점에 따라 말하기 대기로 이어짐', () => {
  const { run, video } = loadPlayer();
  run('settings.listenFirst = 1; state.shadow = true; state.cues = [{start:0,end:2,en:"a",ko:"가"}]; state.idx = -1;');
  run('goTo(0)');
  video.currentTime = 2; run('onCueEnd()');
  assert.equal(run('state.enRevealed'), true);
  assert.ok(run('state.shadowTimer'), '섀도잉 대기 시작');
  run('cancelShadowWait()');
});

test('듣기 먼저 끔(0): 기존 동작 그대로 (영어 바로 표시)', () => {
  const { run, els } = loadPlayer();
  run('settings.listenFirst = 0; state.cues = [{start:0,end:2,en:"a",ko:"가"}]; state.idx = -1;');
  run('goTo(0)');
  assert.equal(run('state.enRevealed'), true);
  assert.equal(els['sub-en'].hidden, false);
});

// ── 반복 ∞ 기본값 + 섀도잉 순환 ──

test('반복 기본값은 ∞ (localStorage에 저장된 선택이 없을 때)', () => {
  const { run } = loadPlayer();
  run('state.repeatIdx = 3;'); // loadPlayer가 테스트용으로 0으로 바꾸므로 원래 초기값을 확인
  assert.equal(run('REPEATS[3]'), Infinity);
  const src = fs.readFileSync(new URL('../js/player.js', import.meta.url), 'utf8');
  assert.match(src, /repeatIdx: 3,/, '초기 state.repeatIdx = 3 (∞)');
});

test('반복 ∞ + 섀도잉: 재생 → 따라 말하기 → 같은 문장 다시 (다음으로 안 넘어감)', () => {
  const { run, video } = loadPlayer();
  run('settings.listenFirst = 0; state.repeatIdx = 3; state.shadow = true; state.cues = [{start:0,end:2,en:"a",ko:""},{start:10,end:12,en:"b",ko:""}]; state.idx = -1;');
  run('goTo(0)');
  video.currentTime = 2; run('onCueEnd()');
  assert.ok(run('state.shadowTimer'), '따라 말하기 대기');
  assert.equal(run('state.shadowNext'), 'repeat');
  run('skipShadowWait()');
  assert.equal(run('state.idx'), 0, '같은 문장 유지');
  assert.equal(run('state.repeatCount'), 1);
  assert.equal(video.currentTime, 0);
  assert.equal(video.paused, false, '다시 재생');
});

test('반복 끔 + 섀도잉: 따라 말하기 뒤 다음 문장', () => {
  const { run, video } = loadPlayer();
  run('settings.listenFirst = 0; state.repeatIdx = 0; state.shadow = true; state.cues = [{start:0,end:2,en:"a",ko:""},{start:10,end:12,en:"b",ko:""}]; state.idx = -1;');
  run('goTo(0)');
  video.currentTime = 2; run('onCueEnd()');
  assert.equal(run('state.shadowNext'), 'next');
  run('skipShadowWait()');
  assert.equal(run('state.idx'), 1);
});

test('반복 3회 + 섀도잉: 세 번 재생·따라 말하기 후 다음 문장', () => {
  const { run, video } = loadPlayer();
  run('settings.listenFirst = 0; state.repeatIdx = 1; state.shadow = true; state.cues = [{start:0,end:2,en:"a",ko:""},{start:10,end:12,en:"b",ko:""}]; state.idx = -1;');
  run('goTo(0)');
  for (let n = 1; n <= 3; n++) {
    video.currentTime = 2; run('onCueEnd()');
    assert.ok(run('state.shadowTimer'), `${n}번째 재생 뒤 따라 말하기`);
    run('skipShadowWait()');
    if (n < 3) assert.equal(run('state.idx'), 0, `${n}번째 뒤 같은 문장`);
  }
  assert.equal(run('state.idx'), 1, '3번째 뒤 다음 문장');
});

test('반복/속도/섀도잉 선택은 savePrefs로 저장', () => {
  const { run, ctx } = loadPlayer();
  let saved = null;
  ctx.localStorage.setItem = (k, v) => { if (k === 'shincoach.prefs') saved = JSON.parse(v); };
  run('cycleRepeat(); cycleSpeed(); toggleShadow();');
  assert.equal(saved.repeatIdx, 1);
  assert.equal(saved.speedIdx, 3);
  assert.equal(saved.shadow, true);
});

// ── 말하기 확인 (마이크) ──

function loadPlayerWithSpeak(resultQueue) {
  const p = loadPlayer();
  // runSpeakCheck 스텁: 호출될 때마다 큐에서 결과를 꺼내 resolve (테스트가 제어)
  p.ctx.runSpeakCheck = () => {
    let resolveFn;
    const promise = new Promise((r) => { resolveFn = r; });
    const handle = { promise, stop() { resolveFn(resultQueue.shift()); }, cancel() {} };
    return handle;
  };
  p.run('settings.speakCheck = true; settings.listenFirst = 0; state.micPrepared = true;');
  return p;
}
const tick = () => new Promise((r) => setTimeout(r, 0));

test('말하기 확인: 통과 전엔 다음 문장으로 못 감, 이전은 됨', () => {
  const { run, els } = loadPlayerWithSpeak([]);
  run('state.cues = [{start:0,end:2,en:"a",ko:""},{start:10,end:12,en:"b",ko:""},{start:20,end:22,en:"c",ko:""}]; state.idx = -1;');
  run('goTo(1)');            // 처음 열 때(idx -1)는 허용
  assert.equal(run('state.idx'), 1);
  run('goTo(2)');            // 아직 안 말했음 → 차단
  assert.equal(run('state.idx'), 1);
  assert.match(els['player-msg'].textContent, /따라 말해야/);
  run('goTo(0)');            // 뒤로는 허용
  assert.equal(run('state.idx'), 0);
});

test('말하기 확인: 문장 끝 → 마이크 대기 → 통과하면 다음으로', async () => {
  const { run, video } = loadPlayerWithSpeak([{ passed: true, method: 'speech', transcript: 'a', score: { matched: 1, total: 1, ratio: 1 } }]);
  run('state.repeatIdx = 0; state.cues = [{start:0,end:2,en:"a",ko:""},{start:10,end:12,en:"b",ko:""}]; state.idx = -1;');
  run('goTo(0)');
  video.currentTime = 2; run('onCueEnd()');
  assert.ok(run('state.speakRun'), '말하기 확인 진행 중');
  assert.equal(video.paused, true);
  run('skipShadowWait()');   // 탭 → 판정
  await tick();
  assert.equal(run('state.speakPassed'), true);
  assert.equal(run('state.speakRun'), null);
  await new Promise((r) => setTimeout(r, 1500)); // 결과 표시 뒤 다음 문장
  assert.equal(run('state.idx'), 1);
});

test('말하기 확인: 미달이면 원문 다시 재생 후 재시도, 3번 미달 시 통과', async () => {
  const fail = { passed: false, method: 'energy', transcript: '', score: null };
  const { run, video } = loadPlayerWithSpeak([fail, fail, fail]);
  run('state.repeatIdx = 0; state.cues = [{start:0,end:2,en:"a",ko:""},{start:10,end:12,en:"b",ko:""}]; state.idx = -1;');
  run('goTo(0)');
  for (let n = 1; n <= 2; n++) {
    video.currentTime = 2; run('onCueEnd()');
    run('skipShadowWait()'); await tick();
    assert.equal(run('state.speakFails'), n);
    assert.equal(run('state.speakPassed'), false);
    await new Promise((r) => setTimeout(r, 1700)); // 원문 다시 재생
    assert.equal(video.currentTime, 0, `${n}번째 미달 → 처음부터 다시`);
    assert.equal(video.paused, false);
  }
  video.currentTime = 2; run('onCueEnd()');
  run('skipShadowWait()'); await tick();
  assert.equal(run('state.speakFails'), 3);
  assert.equal(run('state.speakPassed'), true, '3번 미달 → 통과');
});

test('말하기 확인: 마이크 못 쓰면 확인 없이 진행', async () => {
  const { run, video } = loadPlayerWithSpeak([{ passed: true, method: 'none', transcript: '', score: null }]);
  run('state.repeatIdx = 0; state.cues = [{start:0,end:2,en:"a",ko:""},{start:10,end:12,en:"b",ko:""}]; state.idx = -1;');
  run('goTo(0)');
  video.currentTime = 2; run('onCueEnd()');
  run('skipShadowWait()'); await tick();
  assert.equal(run('state.speakUnavailable'), true);
  assert.equal(run('state.idx'), 1, '바로 다음 문장');
});

test('말하기 확인 + 반복 ∞: 통과 후엔 같은 문장 반복(섀도잉 대기 없이)', async () => {
  const { run, video } = loadPlayerWithSpeak([{ passed: true, method: 'energy', transcript: '', score: null }]);
  run('state.repeatIdx = 3; state.cues = [{start:0,end:2,en:"a",ko:""},{start:10,end:12,en:"b",ko:""}]; state.idx = -1;');
  run('goTo(0)');
  video.currentTime = 2; run('onCueEnd()');
  run('skipShadowWait()'); await tick();
  await new Promise((r) => setTimeout(r, 1500));
  assert.equal(run('state.idx'), 0, '반복이라 같은 문장');
  assert.equal(run('state.repeatCount'), 1);
  video.currentTime = 2; run('onCueEnd()');
  assert.equal(run('state.speakRun'), null, '이미 통과 → 마이크 확인 안 함');
  assert.equal(video.currentTime, 0, '바로 반복');
});

// ── Codex 2차 리뷰 회귀 테스트 ──

test('#1 연속 재생으로 자동 이동해도 다음 문장은 말하기 확인·듣기 먼저가 다시 걸림', async () => {
  const { run, video } = loadPlayerWithSpeak([{ passed: true, method: 'energy', transcript: '', score: null }]);
  run('settings.listenFirst = 0; state.repeatIdx = 0; state.shadow = false; state.cues = [{start:0,end:2,en:"a",ko:""},{start:2.5,end:4,en:"b",ko:""}]; state.idx = -1;');
  run('goTo(0)');
  video.currentTime = 2; run('onCueEnd()');       // 말하기 확인
  run('skipShadowWait()'); await tick();          // 통과
  assert.equal(run('state.speakPassed'), true);
  await new Promise((r) => setTimeout(r, 1500));  // 반복 끔 → 다음 문장으로 (afterShadowWait → goTo)
  assert.equal(run('state.idx'), 1);
  assert.equal(run('state.speakPassed'), false, '다음 문장은 아직 통과 전');
  // 통과 뒤 ∞ 반복 없이 연속 재생 경로(onCueEnd에서 idx++)로도 초기화되는지
  run('state.idx = 0; state.speakPassed = true; state.enRevealed = true; settings.listenFirst = 3; settings.speakCheck = true;');
  video.paused = false; video.currentTime = 2; run('onCueEnd()');
  assert.equal(run('state.idx'), 1, '연속 재생으로 다음 문장');
  assert.equal(run('state.speakPassed'), false, '연속 이동 뒤에도 말하기 확인 초기화');
  assert.equal(run('state.enRevealed'), false, '연속 이동 뒤에도 듣기 먼저(영어 숨김) 초기화');
  assert.equal(run('state.listenCount'), 0);
});

test('#9 듣기 먼저 + 반복 끔: 영어 공개 시점에 "한 문장"으로 기록됨', () => {
  const { run, video, ctx } = loadPlayer();
  let doneCalls = 0;
  ctx.track.done = () => { doneCalls++; };
  run('settings.listenFirst = 1; settings.speakCheck = false; state.repeatIdx = 0; state.cues = [{start:0,end:2,en:"a",ko:""},{start:10,end:12,en:"b",ko:""}]; state.idx = -1;');
  run('goTo(0)');
  video.currentTime = 2; run('onCueEnd()');   // 1번 듣고 공개
  assert.equal(run('state.enRevealed'), true);
  assert.equal(doneCalls, 1, '공개 시점에 done 기록');
});

// ───────────────────── 🧩 문장 퍼즐 ─────────────────────

const FIVE_CUES = 'state.cues = [{start:0,end:2,en:"a b c",ko:""},{start:10,end:12,en:"d e f",ko:""},{start:20,end:22,en:"g h i",ko:""},{start:30,end:32,en:"j k l",ko:""},{start:40,end:42,en:"m n o",ko:""}];';

test('퍼즐: N문장을 "하면" 앞으로 넘어갈 때 퍼즐이 먼저 열리고, 끝나면 그 이동을 이어감', () => {
  const { run, puzzleCalls } = loadPlayer();
  run(FIVE_CUES + ' settings.listenFirst = 0; settings.puzzleEvery = 2; state.idx = 1;');
  run('markDone(state.cues[0]); markDone(state.cues[1]); markDone(state.cues[1]);'); // 같은 문장 반복은 한 번만
  assert.equal(run('state.puzzlePool.length'), 2);
  run('goTo(2)');
  assert.equal(puzzleCalls.length, 1, '퍼즐이 열림');
  assert.equal(puzzleCalls[0].cue.en, 'a b c', '모아둔 문장 중에서 출제');
  assert.equal(run('state.idx'), 1, '아직 이동 안 함');
  assert.equal(run('state.puzzleCue && state.puzzleCue.en'), 'a b c');
  assert.equal(run('state.puzzlePool.length'), 0, '출제하면서 비움');
  puzzleCalls[0].opts.onClose({ solved: true, wrong: 0 });
  assert.equal(run('state.puzzleCue'), null);
  assert.equal(run('state.idx'), 2, '퍼즐 뒤 원래 이동');
  run('goTo(3)');
  assert.equal(puzzleCalls.length, 1, '다시 차기 전에는 안 열림');
});

test('퍼즐: 뒤로 가기·퍼즐 끔·낼 만한 문장 없음이면 열리지 않음', () => {
  const { run, puzzleCalls, ctx } = loadPlayer();
  run(FIVE_CUES + ' settings.listenFirst = 0; settings.puzzleEvery = 2; state.idx = 2;');
  run('markDone(state.cues[1]); markDone(state.cues[2]);');
  run('goTo(1)');
  assert.equal(puzzleCalls.length, 0, '뒤로 가기는 퍼즐 없음');
  assert.equal(run('state.idx'), 1);
  run('settings.puzzleEvery = 0; goTo(2)');
  assert.equal(puzzleCalls.length, 0, '설정 끔');
  assert.equal(run('state.idx'), 2);
  // 낼 만한 문장이 없으면(pickPuzzle → null) 바로 이동
  ctx.pickPuzzle = () => null;
  run('settings.puzzleEvery = 1; state.puzzlePool = [state.cues[2]]; goTo(3)');
  assert.equal(puzzleCalls.length, 0);
  assert.equal(run('state.idx'), 3, '퍼즐 없이 바로 이동');
  assert.equal(run('state.puzzlePool.length'), 0, '모아둔 건 비움');
});

test('퍼즐: 연속 재생 자동 이동 직전에도 퍼즐이 열리고 영상은 멈춤', () => {
  const { run, video, puzzleCalls } = loadPlayer();
  run(FIVE_CUES + ' settings.listenFirst = 0; settings.puzzleEvery = 2; state.repeatIdx = 0; state.shadow = false; state.idx = 1; state.enRevealed = true;');
  run('markDone(state.cues[0]);');
  video.paused = false; video.currentTime = 12;
  run('onTick()'); // 문장 1 끝 → markDone → 2개 참 → 퍼즐
  assert.equal(puzzleCalls.length, 1);
  assert.equal(video.paused, true, '퍼즐 동안 영상 멈춤');
  assert.equal(run('state.idx'), 1);
  puzzleCalls[0].opts.onClose({ solved: false, wrong: 3 });
  assert.equal(run('state.idx'), 2, '퍼즐 뒤 다음 문장');
});

test('퍼즐: 열려 있는 동안 다시 듣기 구간이 끝나면 멈추고, 문장 상태는 그대로', () => {
  const { run, video, puzzleCalls } = loadPlayer();
  run(FIVE_CUES + ' settings.listenFirst = 0; settings.puzzleEvery = 1; state.idx = 3;');
  run('markDone(state.cues[3]); goTo(4)');
  assert.equal(puzzleCalls.length, 1);
  let ended = 0;
  puzzleCalls[0].opts.onPlay(() => { ended++; }); // 🔊 다시 듣기 → 문장 3(30~32초) 재생, 끝나면 콜백
  assert.equal(video.currentTime, 30);
  assert.equal(run('state.puzzlePlaying'), true);
  video.currentTime = 31; run('onTick()');
  assert.equal(run('state.idx'), 3, '탐색해도 현재 문장 유지');
  assert.equal(ended, 0);
  video.currentTime = 32; run('onTick()');
  assert.equal(video.paused, true, '구간 끝에서 멈춤');
  assert.equal(run('state.puzzlePlaying'), false);
  assert.equal(ended, 1, '끝나면 콜백 한 번');
  video.currentTime = 32; run('onTick()');
  assert.equal(ended, 1, '멈춘 뒤에는 다시 부르지 않음');
  video.currentTime = 0; run('syncToTime()');
  assert.equal(run('state.idx'), 3, '퍼즐 중에는 시간 동기화 안 함');
  puzzleCalls[0].opts.onClose({ solved: true, wrong: 1 });
  assert.equal(run('state.idx'), 4);
});

test('퍼즐: ⚙ "지금 퍼즐 해보기"는 현재 문장으로 바로 열고, 기록·모아둔 문장은 건드리지 않음', () => {
  const { run, puzzleCalls, ctx } = loadPlayer();
  let recorded = 0;
  ctx.track.puzzle = () => { recorded++; };
  run(FIVE_CUES + ' settings.puzzleEvery = 10; state.idx = 2; state.puzzlePool = [state.cues[0]];');
  run('startPuzzleNow()');
  assert.equal(puzzleCalls.length, 1);
  assert.equal(puzzleCalls[0].cue.en, 'g h i', '현재 문장');
  assert.equal(run('state.puzzlePool.length'), 1, '모아둔 문장 유지');
  puzzleCalls[0].opts.onClose({ solved: true, wrong: 0 });
  assert.equal(recorded, 0, '테스트 퍼즐은 기록 안 함');
  assert.equal(run('state.idx'), 2, '문장 이동 없음');
  assert.equal(run('state.puzzleCue'), null);
});

test('영어 숨김 단계: 처음 전부 숨김 → 1번 못 하면 절반(홀수 번째 단어) → 2번 못 하면 전부 보임', () => {
  const { run, els, ctx } = loadPlayerWithSpeak([]);
  ctx.wordTimings = () => [{ word: 'I', start: 0 }, { word: 'am', start: 0.5 }, { word: 'a', start: 1 }, { word: 'toy.', start: 1.5 }];
  run('settings.hideEnWhileSpeaking = true; state.cues = [{start:0,end:2,en:"I am a toy.",ko:""}]; state.idx = -1; goTo(0)');
  const masked = () => run('state.wordSpans.map((s) => s.classList.contains("masked") ? 1 : 0).join("")');
  run('startShadowWait(state.cues[0])');
  assert.equal(run('state.speakHideEn'), 'full');
  assert.equal(els['sub-en'].classList.contains('speak-hide'), true);
  assert.equal(els['script-list'].classList.contains('speak-hide'), true, '목록도 가림');
  run('cancelShadowWait(); state.speakFails = 1; startShadowWait(state.cues[0])');
  assert.equal(run('state.speakHideEn'), 'partial');
  assert.equal(els['sub-en'].classList.contains('speak-hide'), false);
  assert.equal(els['sub-en'].classList.contains('speak-hide-partial'), true);
  assert.equal(masked(), '0101', '홀수 번째 단어만 빈칸');
  assert.equal(els['script-list'].classList.contains('speak-hide'), true, '절반 힌트 때도 목록은 가림');
  run('cancelShadowWait(); state.speakFails = 2; startShadowWait(state.cues[0])');
  assert.equal(run('state.speakHideEn'), 'none');
  assert.equal(masked(), '0000');
  assert.equal(els['script-list'].classList.contains('speak-hide'), false);
  run('cancelShadowWait()');
  // 설정이 꺼져 있으면 처음부터 보임
  run('settings.hideEnWhileSpeaking = false; state.speakFails = 0; startShadowWait(state.cues[0])');
  assert.equal(run('state.speakHideEn'), 'none');
  run('cancelShadowWait()');
});

// ───────────────────── ⚡ 경험치 · 🎯 잡기 ─────────────────────

test('XP: 오늘 처음 완료한 문장 +2, 퍼즐 정답 → +XP → 잡기 화면 → 끝나면 이동', () => {
  const { run, puzzleCalls, catchCalls, xpLog, ctx } = loadPlayer();
  const keys = new Set();
  ctx.track.done = (c) => keys.add(c.start);
  ctx.track.todayDone = () => keys.size;
  run(FIVE_CUES + ' settings.listenFirst = 0; settings.puzzleEvery = 1; state.idx = 0;');
  run('markDone(state.cues[0]); markDone(state.cues[0]);');
  assert.deepEqual(xpLog, [2], '같은 문장은 하루 한 번만 XP');
  run('goTo(1)');
  assert.equal(puzzleCalls.length, 1);
  puzzleCalls[0].opts.onClose({ solved: true, wrong: 0, characters: [{ id: 25, ko: '피카츄', url: 'x' }] });
  assert.deepEqual(xpLog, [2, 30]);
  assert.equal(catchCalls.length, 1, '정답이면 잡기 화면');
  assert.equal(catchCalls[0].candidates[0].id, 25);
  assert.equal(catchCalls[0].xpGain, 30);
  assert.equal(run('state.idx'), 0, '잡기 끝날 때까지 이동 안 함');
  assert.equal(run('state.catchOpen'), true);
  catchCalls[0].onDone();
  assert.equal(run('state.idx'), 1);
  assert.equal(run('state.catchOpen'), false);
  // 정답 공개(3번 틀림)면 +3, 잡기 없음
  run('markDone(state.cues[1]); goTo(2)');
  puzzleCalls[1].opts.onClose({ solved: false, wrong: 3, characters: [{ id: 1, ko: '이상해씨', url: 'x' }] });
  assert.equal(xpLog[xpLog.length - 1], 3);
  assert.equal(catchCalls.length, 1);
  assert.equal(run('state.idx'), 2);
  // 캐릭터를 안 받았으면(빈 목록) 잡기 없이 이동
  run('markDone(state.cues[2]); goTo(3)');
  puzzleCalls[2].opts.onClose({ solved: true, wrong: 1, characters: [] });
  assert.equal(xpLog[xpLog.length - 1], 20);
  assert.equal(catchCalls.length, 1);
  assert.equal(run('state.idx'), 3);
});

test('XP: 말하기 통과 +3, ⭐면 +5', async () => {
  const { run, video, xpLog } = loadPlayerWithSpeak([
    { passed: true, method: 'speech', transcript: 'a', score: { matched: 1, total: 1, ratio: 1 } },
    { passed: true, method: 'energy', transcript: '', score: null },
  ]);
  run('state.cues = [{start:0,end:2,en:"a",ko:""},{start:10,end:12,en:"b",ko:""}]; state.idx = -1; goTo(0)');
  video.currentTime = 2; run('onCueEnd()');
  run('skipShadowWait()'); await tick();
  assert.ok(xpLog.includes(5), '⭐ 통과 +5');
  run('cancelShadowWait(); goTo(1, { force: true })');
  video.currentTime = 12; run('onCueEnd()');
  run('skipShadowWait()'); await tick();
  assert.ok(xpLog.includes(3), '통과 +3');
});

test('🔥 스트릭·오늘 목표: 5번째 문장에 스트릭 보너스, 목표 달성에 +30', () => {
  const { run, xpLog, ctx } = loadPlayer();
  const keys = new Set();
  ctx.track.done = (c) => keys.add(c.start);
  ctx.track.todayDone = () => keys.size;
  run('settings.dailyGoal = 7; state.streakBase = 2; state.streakToday = false; state.streakDate = "2026-09-14"; state.cues = Array.from({length: 8}, (_, i) => ({ start: i * 10, end: i * 10 + 2, en: "a b c", ko: "" })); state.idx = 0;');
  for (let i = 0; i < 4; i++) run(`markDone(state.cues[${i}])`);
  assert.deepEqual(xpLog, [2, 2, 2, 2], '4문장까지는 문장 XP만');
  run('markDone(state.cues[4])');
  assert.deepEqual(xpLog.slice(4), [2, 20], '5번째 문장: 3일 연속(2+1) 보너스 20');
  assert.equal(run('state.streakToday'), true);
  run('markDone(state.cues[4]); markDone(state.cues[5])');
  assert.equal(xpLog.length, 7, '같은 문장 반복은 XP 없음, 보너스는 한 번만');
  let rewarded = false;
  ctx.track.goalRewarded = () => rewarded;
  ctx.track.markGoalRewarded = () => { rewarded = true; };
  run('markDone(state.cues[6])');
  assert.deepEqual(xpLog.slice(7), [2, 30], '7번째 = 오늘 목표 달성 +30');
  // 목표를 올려도(7→8) 같은 날엔 다시 안 줌
  run('settings.dailyGoal = 8; markDone(state.cues[7])');
  assert.deepEqual(xpLog.slice(9), [2], '목표 보너스는 하루 한 번');
});

test('🔥 자정을 넘기면 스트릭 상태가 오늘 기준으로 다시 계산됨', () => {
  const { run, xpLog, ctx } = loadPlayer();
  const keys = new Set();
  ctx.track.done = (c) => keys.add(c.start);
  ctx.track.todayDone = () => keys.size;
  run('settings.dailyGoal = 0; state.streakBase = 3; state.streakToday = true; state.streakDate = "2026-09-13"; state.cues = Array.from({length: 6}, (_, i) => ({ start: i * 10, end: i * 10 + 2, en: "a b c", ko: "" })); state.idx = 0;');
  // 날짜가 바뀐 뒤(track은 새 날짜) 첫 문장 → 어제의 streakToday가 남아 있으면 안 됨
  run('markDone(state.cues[0])');
  assert.equal(run('state.streakDate'), '2026-09-14');
  assert.equal(run('state.streakToday'), false, '오늘은 아직 5문장 전');
  for (let i = 1; i < 5; i++) run(`markDone(state.cues[${i}])`);
  assert.equal(run('state.streakToday'), true);
  assert.ok(xpLog.includes(10), '새 날의 첫 스트릭 보너스(어제 기록은 listDaily 스텁이 비어 있어 1일째=10)');
});

test('🧩 마지막 문장에서 N문장이 차면 퍼즐이 나오고 이동 없이 끝남', () => {
  const { run, video, puzzleCalls } = loadPlayer();
  run(FIVE_CUES + ' settings.listenFirst = 0; settings.puzzleEvery = 2; state.repeatIdx = 0; state.shadow = false; state.idx = 4;');
  run('markDone(state.cues[3]);');
  video.paused = false; video.currentTime = 42;
  run('onTick()'); // 마지막 문장 끝 → markDone → 2개 참 → 퍼즐
  assert.equal(puzzleCalls.length, 1, '마지막 문장에서도 퍼즐');
  assert.equal(video.paused, true);
  puzzleCalls[0].opts.onClose({ solved: true, wrong: 0, characters: [] });
  assert.equal(run('state.idx'), 4, '이동 없이 마지막 문장에 머묾');
});

test('🧩 오늘 첫 퍼즐은 5문장에, 그 뒤엔 설정 간격(10)대로', () => {
  const { run, puzzleCalls, ctx } = loadPlayer();
  run('state.cues = Array.from({length: 20}, (_, i) => ({ start: i * 10, end: i * 10 + 2, en: "a b c", ko: "" })); settings.listenFirst = 0; settings.puzzleEvery = 10; state.idx = 0;');
  ctx.track.todayPuzzles = () => 0;
  for (let i = 0; i < 4; i++) run(`markDone(state.cues[${i}])`);
  run('goTo(1)');
  assert.equal(puzzleCalls.length, 0, '4문장은 아직');
  run('markDone(state.cues[4]); goTo(2)');
  assert.equal(puzzleCalls.length, 1, '오늘 첫 퍼즐은 5문장에');
  puzzleCalls[0].opts.onClose({ solved: true, wrong: 0, characters: [] });
  ctx.track.todayPuzzles = () => 1;
  for (let i = 5; i < 12; i++) run(`markDone(state.cues[${i}])`);
  run('goTo(3)');
  assert.equal(puzzleCalls.length, 1, '두 번째부터는 10문장 필요 (지금 7)');
  for (let i = 12; i < 15; i++) run(`markDone(state.cues[${i}])`);
  run('goTo(4)');
  assert.equal(puzzleCalls.length, 2, '10문장 차면 퍼즐');
});

test('🎮 부족한 캐릭터는 인터넷이 되면 자동으로 받고, 오프라인이거나 다 있으면 안 받음', async () => {
  const { run, ctx } = loadPlayer();
  let calls = 0;
  ctx.ROSTER = [{ id: 1 }, { id: 2 }];
  ctx.downloadCharacters = async () => { calls++; return { ok: 2, fail: 0 }; };
  ctx.loadCharacters = async () => [{ id: 1, url: 'a' }, { id: 2, url: 'b' }];
  run('state.characters = []; autoDownloadCharacters()');
  await tick(); await tick();
  assert.equal(calls, 1, '부족하면 받음');
  assert.equal(run('state.characters.length'), 2, '받은 뒤 목록 갱신');
  run('autoDownloadCharacters()'); await tick();
  assert.equal(calls, 1, '다 있으면 안 받음');
  ctx.navigator.onLine = false;
  run('state.characters = []; autoDownloadCharacters()'); await tick();
  assert.equal(calls, 1, '오프라인이면 안 받음');
  ctx.navigator.onLine = true;
  run('state.charDownloading = true; autoDownloadCharacters()'); await tick();
  assert.equal(calls, 1, '이미 받는 중이면 중복 실행 안 함');
});
