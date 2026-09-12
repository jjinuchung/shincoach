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
  });
  vm.runInContext(src, ctx);
  vm.runInContext('initPlayer({ showView() {} }); state.open = true;', ctx);
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
