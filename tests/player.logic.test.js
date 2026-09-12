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
    classList: { add() {}, remove() {}, toggle() {} },
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
  const ctx = vm.createContext({
    console, setTimeout, clearTimeout,
    requestAnimationFrame: () => 1, cancelAnimationFrame() {},
    performance: { now: () => Date.now() },
    localStorage: { getItem: () => null, setItem() {} },
    navigator: {},
    document: { getElementById: $, addEventListener() {}, hidden: false },
    window: { scrollTo() {} },
    URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
    alert() {},
    // srt.js 의존 함수 스텁
    parseSubtitle: () => [], mergeSubtitles: (a) => a, mergeIntoSentences: (a) => a,
    estimateWordTimings: () => [], findCueIndex: (cues, t) => cues.findIndex((c) => t >= c.start && t < c.end),
    getItem: async () => null, getVideoBlob: async () => null, updateItem: async () => null,
    loadVocab: async () => ({ lookup: () => [] }),
    initDiag() {}, renderDiag() {},
    runSpeakCheck: () => ({ promise: new Promise(() => {}), stop() {} }), prepareMic: async () => null,
  });
  vm.runInContext(src, ctx);
  vm.runInContext('initPlayer({ showView() {} }); state.open = true; state.repeatIdx = 0; settings.speakCheck = false; // 테스트 기준: 반복 끔, 말하기 확인 끔', ctx);
  return { ctx, video, els, run: (code) => vm.runInContext(code, ctx) };
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
    const handle = { promise, stop() { resolveFn(resultQueue.shift()); } };
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
