// player.js 상태 로직 테스트 (DOM/미디어를 최소 스텁으로 대체해 vm에서 실행)
// node --test tests/player.logic.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { pickReviews, pickWordReviews, quizChoices, reviewSummary, wordSummary, isWordDue, roundReward, schedule as reviewSchedule, GRADUATED as REVIEW_GRADUATED, MAX_WORD_ITEMS, REWARD } from '../js/review.js';
import { wordResults } from '../js/speak.js';
import { makeDictation } from '../js/dictation.js';
import fsNode from 'node:fs';

// 받아쓰기 오답은 실제 사전에서 만들어지므로 테스트도 진짜 사전을 쓴다
const VOCAB_KNOWN = new Set([
  ...Object.keys(JSON.parse(fsNode.readFileSync(new URL('../vocab/words.json', import.meta.url), 'utf8'))),
  ...JSON.parse(fsNode.readFileSync(new URL('../vocab/basic.json', import.meta.url), 'utf8')),
]);
import { wordTimings as realWordTimings } from '../js/srt.js';

/**
 * 클릭이 부모(shadow-overlay)까지 전파되는 것을 모사한다.
 * 스텁의 _fire는 그 요소의 핸들러만 부르기 때문에, 전파로 생기는 버그를 놓친다 (Codex #1).
 */
function clickWithBubble(child, parent) {
  let stopped = false;
  const ev = { stopPropagation() { stopped = true; }, preventDefault() {} };
  child._fire('click', ev);
  if (!stopped) parent._fire('click', ev);
  return stopped;
}

function makeEl() {
  const listeners = {};
  const el = {
    hidden: false, textContent: '', className: '', dataset: {}, value: '', checked: false, children: [],
    style: {}, firstChild: { textContent: '' }, scrollTop: 0, clientHeight: 100, offsetTop: 0, offsetHeight: 20,
    classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, toggle(c, f) { const on = f === undefined ? !this._s.has(c) : !!f; if (on) this._s.add(c); else this._s.delete(c); return on; }, contains(c) { return this._s.has(c); } },
    addEventListener(t, fn) { (listeners[t] ||= []).push(fn); },
    removeEventListener() {},
    appendChild(c) { if (c) this.children.push(c); return c; }, querySelector() { return null; }, querySelectorAll() { return []; },
    scrollTo() {}, showModal() {}, close() {},
    _fire(t, ev) { (listeners[t] || []).forEach((fn) => fn(ev)); },
  };
  // innerHTML = '' 는 자식을 비우는 뜻으로만 쓴다 (실제 파싱은 안 함)
  Object.defineProperty(el, 'innerHTML', { get() { return ''; }, set(v) { if (!v) el.children.length = 0; }, configurable: true });
  return el;
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
  const coinLog = [];
  const itemLog = [];
  const hpLog = [];
  const hpState = { partner: null, hp: {}, opened: null };
  const battleCalls = [];
  const battleState = { roll: false, caught: {}, won: [], lost: [] };
  const reviewCalls = [];
  const reviewState = { stats: [], sentences: 0, items: 0, words: 0, rounds: 0, golden: false, skips: 0, reviewed: [] };
  const missedLog = [];
  const vocabViewsStub = [];
  const vocabReviewLog = [];
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
    track: { open: async () => {}, close: async () => {}, flush: async () => {}, play() {}, listen() {}, done() {}, speak() {}, tick() {}, vocab() {}, isMastered: () => false, doneCount: () => 0, todayDone: () => 0, todayKey: () => '2026-09-14', todayPuzzles: () => 1, goalRewarded: () => false, markGoalRewarded() {}, hpMissedApplied: () => false, markHpMissed() {}, todayBattles: () => 0, markBattle() {}, MASTER_RATIO: 0.8, puzzle() {},
      // 🔁 복습 스텁: 문장 기록과 오늘 상태를 reviewState로 제어
      statsList: () => reviewState.stats, review(cue, passed) { reviewState.reviewed.push({ start: cue.start, passed }); reviewState.items++; return { box: 1, graduated: false }; },
      todayReviewSentences: () => reviewState.sentences, todayReviewItems: () => reviewState.items,
      reviewWord() { reviewState.items++; reviewState.words++; },
      todayReviewRounds: () => reviewState.rounds, markReviewRound() { reviewState.rounds++; },
      reviewGoldenTaken: () => reviewState.golden, markReviewGolden() { reviewState.golden = true; },
      todayReviewSkips: () => reviewState.skips, markReviewSkip() { reviewState.skips++; },
      // 🎯 못 말한 단어 기록
      missedWords(cue, words) { missedLog.push(words.slice()); } },
    // puzzle.js 스텁: 열린 퍼즐을 puzzleCalls에 기록 (onClose를 테스트에서 직접 호출)
    puzzleCalls,
    initPuzzle() {}, closePuzzle() {},
    openPuzzle(cue, opts) { puzzleCalls.push({ cue, opts }); },
    pickPuzzle: (cues) => (cues.length ? cues[0] : null),
    // pokemon.js 스텁
    loadCharacters: async () => [], downloadCharacters: async () => ({ ok: 0, fail: 0 }), ROSTER: [{ id: 25, ko: '피카츄' }, { id: 4, ko: '파이리' }], pickCharacters: (a, n) => (a || []).slice(0, n), isUnlocked: () => true, unlockCountAt: () => 0,
    // xp.js / catch.js 스텁: XP 획득과 잡기 화면 호출을 기록
    xpLog, catchCalls,
    initProfile: async () => ({}), getLevelInfo: () => ({ level: 1, into: 0, need: 100, xp: 0 }),
    gainXp: (n) => { xpLog.push(n); return { gained: n, leveledUp: false, from: 1, to: 1, info: { level: 1, into: 0, need: 100 } }; },
    catchAttempt: () => ({ caught: true }), previewAttempt: () => ({ caught: false }),
    puzzleXp: (r) => (r && r.solved ? [30, 20, 10][Math.min(r.wrong || 0, 2)] : 3),
    XP: { done: 2, speak: 3, speakStar: 5, goal: 30, journey: 50 }, streakBefore: () => 0, streakBonus: (n) => Math.min(40, 10 + 5 * (n - 1)), STREAK_MIN_DONE: 5, flushProfile() {},
    initCatch() {}, closeCatch() {}, openCatch(o) { catchCalls.push(o); }, burstConfetti() {},
    // items.js / 코인 스텁: 코인 획득과 🎁 상자 아이템을 기록
    coinLog, itemLog,
    coins: () => coinLog.reduce((a, b) => a + b, 0), gainCoins: (n) => { if (n) coinLog.push(n); return { gained: n, coins: 0 }; },
    addItem: (id) => { itemLog.push(id); return true; }, getLook: () => ({ gear: null, dye: null }),
    COIN: { done: 1, speak: 2, speakStar: 3, goal: 10, journey: 20 }, puzzleCoins: (r) => (r && r.solved ? [5, 3, 2][Math.min(r.wrong || 0, 2)] : 0),
    streakCoins: (n) => Math.min(50, 5 * n), lootBox: () => 'cap', itemById: (id) => ({ id, emoji: '🧢', ko: '야구모자' }),
    // ❤️ 파트너 HP 스텁: hpState를 테스트가 직접 조작 (partner=null이면 HP 기능 없음)
    hpState, hpLog,
    getPartner: () => hpState.partner, hpOf: (id) => (hpState.hp[id] === undefined ? 100 : hpState.hp[id]), isTired: (id) => hpState.hp[id] === 0,
    changeHp: (id, d) => { const from = hpState.hp[id] === undefined ? 100 : hpState.hp[id]; const to = Math.max(0, Math.min(100, from + d)); hpState.hp[id] = to; hpLog.push(d); return { from, to }; },
    HP: { max: 100, revealed: -20, speakSkipped: -10, missedDay: -30, goalHeal: 20 }, setFigure() {}, openMon(m) { hpState.opened = m; },
    // ⚔️ 배틀 스텁: 열린 배틀은 battleCalls에 기록, shouldBattle은 battleState.roll 로 제어
    battleCalls, battleState,
    initBattle() {}, abortBattle() {}, openBattle(o) { battleCalls.push(o); },
    BATTLE: { chance: 0.03, maxPerDay: 1, minDoneToday: 5, hp: 100, winXp: 40, winCoins: 15, lossesToLose: 3 },
    shouldBattle: ({ todayDone, todayBattles }) => battleState.roll && todayDone >= 5 && todayBattles < 1,
    pickOpponent: (list, caught) => list.find((m) => !caught[m.id]) || null, eligibleMine: (ids, partner, tired) => ids.filter((id) => id !== partner && !(tired && tired(id))),
    getProfileSnapshot: () => ({ caught: battleState.caught }), lossesOf: () => 0,
    battleWin: (id) => { battleState.won.push(id); return { first: true }; }, battleLoss: (id) => { battleState.lost.push(id); return { losses: 1, lost: false }; },
    consumeItem: () => true, inventory: () => ({}), POTION: [], GOLDEN: { id: 'goldenball', emoji: '🌟', ko: '황금 몬스터볼', mult: 2, kind: 'ball' },
    // 🔁 복습 스텁: 열린 복습은 reviewCalls에 기록, 규칙(pickReviews 등)은 실제 모듈을 씀
    reviewCalls, reviewState,
    initReview() {}, abortReview() {}, isReviewOpen: () => false, openReview(o) { reviewCalls.push(o); },
    pickReviews, pickWordReviews, quizChoices, reviewSummary, wordSummary, isWordDue, roundReward, reviewSchedule, makeDictation, VOCAB_KNOWN,
    REVIEW_GRADUATED, MAX_WORD_ITEMS, REVIEW_REWARD: REWARD, DEFAULT_COUNT: 3, REVIEW_COUNT: 3,
    listVocabViews: async () => vocabViewsStub, updateVocabReview: async (w, updater) => { const cur = vocabViewsStub.find((x) => x.word === w) || { word: w }; const next = { ...cur, ...updater(cur) }; vocabReviewLog.push(next); return next; },
    // sfx.js 스텁
    sfx: { whoosh() {}, hit() {}, tick() {}, success() {}, fail() {}, levelUp() {}, ding() {}, wrong() {} }, unlock() {}, setSfxEnabled() {}, setVibrateEnabled() {},
    // 🎯 말하기 단어별 결과: 실제 모듈을 그대로 씀
    wordResults,
  });
  vm.runInContext(src, ctx);
  vm.runInContext('initPlayer({ showView() {} }); state.open = true; state.repeatIdx = 0; settings.speakCheck = false; settings.puzzleEvery = 0; // 테스트 기준: 반복 끔, 말하기 확인 끔, 퍼즐 끔', ctx);
  return { ctx, video, els, puzzleCalls, xpLog, catchCalls, coinLog, itemLog, hpLog, hpState, battleCalls, battleState, reviewCalls, reviewState, missedLog, vocabViewsStub, vocabReviewLog, run: (code) => vm.runInContext(code, ctx) };
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
    await new Promise((r) => setTimeout(r, 2800)); // 원문 다시 재생 (못 말한 단어를 볼 시간 2.6초 뒤)
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

test('💰 코인: 문장 +1, 스트릭 5×일, 목표 +10, 퍼즐 5/3/2(정답 공개 0) → 잡기 화면에 coinGain, 레벨업엔 🎁 아이템', () => {
  const { run, coinLog, itemLog, puzzleCalls, catchCalls, ctx, els } = loadPlayer();
  const keys = new Set();
  ctx.track.done = (c) => keys.add(c.start);
  ctx.track.todayDone = () => keys.size;
  let rewarded = false;
  ctx.track.goalRewarded = () => rewarded;
  ctx.track.markGoalRewarded = () => { rewarded = true; };
  run('settings.dailyGoal = 6; settings.puzzleEvery = 1; settings.listenFirst = 0; state.streakBase = 1; state.streakToday = false; state.streakDate = "2026-09-14"; state.cues = Array.from({length: 8}, (_, i) => ({ start: i * 10, end: i * 10 + 2, en: "a b c", ko: "" })); state.idx = 0;');
  for (let i = 0; i < 6; i++) run(`markDone(state.cues[${i}])`);
  assert.deepEqual(coinLog, [1, 1, 1, 1, 1, 10, 1, 10], '5번째 문장에 2일 연속 스트릭 💰10, 6번째에 목표 💰10');
  assert.equal(els['coin-chip'].textContent, '💰 26', '칩에 잔액');
  run('goTo(1)');
  puzzleCalls[0].opts.onClose({ solved: true, wrong: 1, characters: [{ id: 25, ko: '피카츄', url: 'x', look: { gear: null, dye: null } }] });
  assert.equal(coinLog[coinLog.length - 1], 3, '한 번 틀리고 맞춤 💰3');
  assert.equal(catchCalls[0].coinGain, 3);
  catchCalls[0].onDone();
  run('markDone(state.cues[6]); goTo(2)');
  puzzleCalls[1].opts.onClose({ solved: false, wrong: 3, characters: [] });
  assert.equal(coinLog.length, 10, '정답 공개는 코인 없음(0은 기록 안 함)');
  // 레벨업 → 🎁 선물 상자로 아이템 하나
  ctx.gainXp = (n) => ({ gained: n, leveledUp: true, from: 1, to: 2, info: { level: 2, into: 0, need: 140 } });
  run('awardXp(100)');
  assert.deepEqual(itemLog, ['cap']);
  // 퍼즐·잡기에 넘기는 캐릭터에는 꾸밈 상태(look)가 붙음
  run('state.characters = [{ id: 25, ko: "피카츄", url: "x" }]');
  const c = run('unlockedCharacters()[0]');
  assert.equal(c.id, 25);
  assert.equal(c.look.gear, null);
  assert.equal(c.look.dye, null);
});

test('👨‍👩‍👦 부모 모드: 반복·듣기 먼저·말하기 확인·퍼즐 없이 이어서 재생, 기록·XP 없음, 마지막이면 멈춤', () => {
  const { run, video, els, xpLog, coinLog, puzzleCalls, ctx } = loadPlayer();
  const plays = []; const dones = [];
  ctx.track.play = (c) => plays.push(c.start);
  ctx.track.done = (c) => dones.push(c.start);
  run(FIVE_CUES + ' settings.listenFirst = 3; settings.speakCheck = true; settings.puzzleEvery = 1; state.repeatIdx = 3; state.shadow = true; state.idx = -1;');
  run('setParentMode(true)');
  assert.equal(run('state.parentMode'), true);
  assert.equal(els['parent-chip'].hidden, false, '상단 칩 표시');
  assert.ok(els['btn-repeat'].classList.contains('parent-off'), '반복 칩 흐림');
  run('goTo(0)');
  assert.equal(run('state.enRevealed'), true, '듣기 먼저여도 영어 바로 공개');
  video.paused = false; video.currentTime = 2;
  run('onCueEnd()');
  assert.equal(run('state.idx'), 1, '반복 ∞·섀도잉·말하기 확인이 켜져 있어도 다음 문장으로');
  assert.equal(video.paused, false, '재생 안 끊김');
  assert.equal(run('state.shadowTimer'), null);
  assert.equal(run('state.speakRun'), null);
  assert.deepEqual(plays, [], '재생 기록 없음');
  assert.deepEqual(dones, [], '완료 기록 없음');
  assert.deepEqual(xpLog, []); assert.deepEqual(coinLog, []);
  assert.equal(puzzleCalls.length, 0, '퍼즐 안 나옴');
  run('goTo(3)');
  assert.equal(run('state.idx'), 3, '말하기 확인 게이트 없이 앞으로 이동');
  run('goTo(4)'); video.currentTime = 42; run('onCueEnd()');
  assert.equal(run('state.idx'), 4, '마지막 문장은 그대로');
  assert.equal(video.paused, true, '마지막 문장 끝에서 멈춤');
  assert.equal(run('state.puzzlePool.length'), 0, '퍼즐 후보도 안 쌓임');
  // 끄면 다음 문장부터 학습 장치가 돌아옴
  run('setParentMode(false); goTo(0)');
  assert.equal(els['parent-chip'].hidden, true);
  assert.equal(run('state.enRevealed'), false, '듣기 먼저 다시 적용');
  video.currentTime = 2; run('onCueEnd()');
  assert.equal(run('state.idx'), 0, '듣기 먼저 반복으로 같은 문장');
  assert.deepEqual(plays, [0]);
});

test('❤️ HP: 정답 공개 −20, 말하기 넘김 −10, 목표 달성 +20, 첫 오답은 무벌, 0이면 😴 퍼즐·잡기에서 빠짐', async () => {
  const { run, els, hpLog, hpState, puzzleCalls, ctx } = loadPlayer();
  const keys = new Set();
  ctx.track.done = (c) => keys.add(c.start);
  ctx.track.todayDone = () => keys.size;
  run(FIVE_CUES + ' settings.listenFirst = 0; settings.puzzleEvery = 1; settings.dailyGoal = 0; state.idx = 0; state.characters = [{ id: 25, ko: "피카츄", url: "x" }, { id: 4, ko: "파이리", url: "y" }];');
  // 파트너가 없으면 HP 기능 없음: 칩 숨김, 벌 없음
  run('markDone(state.cues[0]); goTo(1)');
  puzzleCalls[0].opts.onClose({ solved: false, wrong: 3, characters: [] });
  assert.deepEqual(hpLog, [], '파트너 없으면 HP 안 깎임');
  assert.equal(els['partner-chip'].hidden, true);
  // 파트너 지정 → 칩 표시
  hpState.partner = 25;
  run('updateChips()');
  assert.equal(els['partner-chip'].hidden, false);
  assert.equal(els['partner-hp'].textContent, '❤️ 100');
  // 퍼즐: 한두 번 틀리고 맞추면 무벌, 3번 틀려 정답 공개면 −20
  run('markDone(state.cues[1]); goTo(2)');
  puzzleCalls[1].opts.onClose({ solved: true, wrong: 2, characters: [] });
  assert.deepEqual(hpLog, [], '틀렸어도 맞추면 무벌');
  run('markDone(state.cues[2]); goTo(3)');
  puzzleCalls[2].opts.onClose({ solved: false, wrong: 3, characters: [] });
  assert.deepEqual(hpLog, [-20]);
  assert.equal(els['partner-hp'].textContent, '❤️ 80');
  assert.ok(els['partner-chip'].classList.contains('hurt'));
  // 목표 달성(4문장) → +20
  let rewarded = false;
  ctx.track.goalRewarded = () => rewarded;
  ctx.track.markGoalRewarded = () => { rewarded = true; };
  run('settings.dailyGoal = 4; markDone(state.cues[3])');
  assert.equal(hpLog[hpLog.length - 1], 20, '목표 달성 회복');
  assert.equal(hpState.hp[25], 100);
  // 0이 되면 😴: 칩 표시, 퍼즐·잡기 후보에서 빠짐 (다른 캐릭터는 남음)
  hpState.hp[25] = 10;
  run('markDone(state.cues[4]); goTo(4)');
  puzzleCalls[3].opts.onClose({ solved: false, wrong: 3, characters: [] });
  assert.equal(hpState.hp[25], 0);
  assert.equal(els['partner-hp'].textContent, '😴 0');
  assert.equal(run('unlockedCharacters().map((c) => c.id).join(",")'), '4', '쉬는 중인 파트너는 퍼즐에 안 나옴');
  puzzleCalls[3] = null; // 이미 0이면 더 안 깎임
  run('goTo(0); markDone(state.cues[0]); goTo(1)');
  const n = hpLog.length;
  puzzleCalls[puzzleCalls.length - 1].opts.onClose({ solved: false, wrong: 3, characters: [] });
  assert.equal(hpLog.length, n, '0에서는 더 안 깎임');
  // HP 설정 끄면 칩 숨김·벌 없음, 쉬는 중이어도 퍼즐에 나옴
  run('settings.hp = false; updateChips()');
  assert.equal(els['partner-chip'].hidden, true);
  assert.equal(run('unlockedCharacters().map((c) => c.id).join(",")'), '25,4');
  // 부모 모드에서도 벌 없음
  run('settings.hp = true; hpState.hp[25] = 50; setParentMode(true); markDone(state.cues[2]); goTo(3)');
  assert.equal(els['partner-chip'].hidden, true, '부모 모드는 칩 숨김');
  assert.equal(hpState.hp[25], 50);
});

test('❤️ 말하기 3번 미달로 넘기면 −10, 통과하면 무벌', async () => {
  const { run, video, hpLog, hpState } = loadPlayerWithSpeak([
    { passed: false, method: 'speech', transcript: '', score: null },
    { passed: false, method: 'speech', transcript: '', score: null },
    { passed: false, method: 'speech', transcript: '', score: null },
    { passed: true, method: 'energy', transcript: '', score: null },
  ]);
  hpState.partner = 25;
  run('state.cues = [{start:0,end:2,en:"a b",ko:""},{start:10,end:12,en:"c d",ko:""}]; state.idx = -1; goTo(0)');
  for (let i = 0; i < 3; i++) {
    video.currentTime = 2; run('onCueEnd()');
    run('skipShadowWait()'); await tick();
    if (i < 2) { run('cancelShadowWait(); state.speakRun = null;'); }
  }
  assert.deepEqual(hpLog, [-10], '3번째 미달로 넘길 때 한 번 −10');
  run('cancelShadowWait(); goTo(1, { force: true })');
  video.currentTime = 12; run('onCueEnd()');
  run('skipShadowWait()'); await tick();
  assert.deepEqual(hpLog, [-10], '통과는 무벌');
});

test('❤️ 어제 학습을 안 했으면 콘텐츠를 열 때 한 번 −30 (처음 쓰는 아이·어제 한 아이는 제외, 하루 한 번)', async () => {
  const { run, hpLog, hpState, ctx } = loadPlayer();
  hpState.partner = 25;
  const d = (date, n) => ({ date, doneKeys: Array.from({ length: n }, (_, i) => `k${i}`) });
  const pad = (n) => String(n).padStart(2, '0');
  const key = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
  const today = key(new Date());
  const yest = key(new Date(Date.now() - 86400000));
  const before = key(new Date(Date.now() - 3 * 86400000));
  ctx.track.todayKey = (dt) => key(dt || new Date());
  // 어제 안 함(기록 없음) + 그 전엔 학습한 적 있음 → −30
  run(`checkMissedDay([${JSON.stringify(d(before, 7))}], "${today}")`);
  assert.deepEqual(hpLog, [-30]);
  // 어제 5문장 이상 했으면 없음
  run(`checkMissedDay([${JSON.stringify(d(before, 7))}, ${JSON.stringify(d(yest, 5))}], "${today}")`);
  assert.deepEqual(hpLog, [-30]);
  // 처음 쓰는 아이(과거 학습일 없음)는 없음
  run(`checkMissedDay([${JSON.stringify(d(yest, 2))}], "${today}")`);
  assert.deepEqual(hpLog, [-30]);
  // 오늘 이미 적용했으면 없음
  ctx.track.hpMissedApplied = () => true;
  run(`checkMissedDay([${JSON.stringify(d(before, 7))}], "${today}")`);
  assert.deepEqual(hpLog, [-30]);
});

test('🏁 여행 끝: 마지막 문장을 완료하면 연출 + ⚡50 💰20 (콘텐츠당 한 번, 세션당 연출 한 번), 부모 모드는 연출만', () => {
  const { run, xpLog, coinLog, ctx, els } = loadPlayer();
  const keys = new Set();
  ctx.track.done = (c) => keys.add(c.start);
  ctx.track.todayDone = () => keys.size;
  const saved = [];
  ctx.updateItem = async (id, patch) => { saved.push(patch); return null; };
  run(FIVE_CUES + ' settings.listenFirst = 0; settings.dailyGoal = 0; state.item = { id: "it1", title: "t" }; state.idx = 4; state.journeyCelebrated = false;');
  run('markDone(state.cues[3])');
  assert.equal(xpLog.includes(50), false, '마지막 문장이 아니면 없음');
  run('markDone(state.cues[4])');
  assert.ok(xpLog.includes(50), '도착 ⚡50');
  assert.ok(coinLog.includes(20), '도착 💰20');
  assert.equal(saved.length, 1); assert.ok(saved[0].journeyDone > 0, 'journeyDone 저장');
  assert.equal(run('state.journeyCelebrated'), true);
  run('markDone(state.cues[4])');
  assert.equal(xpLog.filter((x) => x === 50).length, 1, '같은 세션에서 다시 없음');
  // 다음에 열었을 때(journeyDone 있음): 연출만
  run('state.journeyCelebrated = false; markDone(state.cues[4])');
  assert.equal(xpLog.filter((x) => x === 50).length, 1, '콘텐츠당 한 번');
  // 부모 모드: 연출만
  run('state.journeyCelebrated = false; state.item = { id: "it2", title: "t2" }; setParentMode(true); state.idx = 4;');
  els.video.currentTime = 42; run('onCueEnd()');
  assert.equal(run('state.journeyCelebrated'), true, '부모 모드도 도착 연출');
  assert.equal(xpLog.filter((x) => x === 50).length, 1, '부모 모드는 보너스 없음');
  assert.equal(saved.length, 1);
});

test('🗺️ 여행 길: 풍경은 콘텐츠 id로 고정, 진행에 따라 캐릭터 위치·앞쪽 풍경 안개', () => {
  const { run, els } = loadPlayer();
  const made = [];
  const sc = run("$('journey-scenery')"); // 요소는 처음 쓸 때 만들어지므로 먼저 만들어 둠
  sc.appendChild = (el) => { made.push(el); sc.children.push(el); };
  run('state.cues = Array.from({ length: 100 }, (_, i) => ({ start: i * 10, end: i * 10 + 2, en: "a", ko: "" })); state.item = { id: "movie-1" }; state.idx = -1; renderJourney()');
  const first = made.map((e) => e.textContent + '@' + e.style.left).join('|');
  assert.ok(made.length >= 6 && made.length <= 10, `풍경 ${made.length}개`);
  made.length = 0; sc.children.length = 0;
  run('renderJourney()');
  assert.equal(made.map((e) => e.textContent + '@' + e.style.left).join('|'), first, '같은 콘텐츠는 같은 지도');
  made.length = 0; sc.children.length = 0;
  run('state.item = { id: "movie-2" }; renderJourney()');
  assert.notEqual(made.map((e) => e.textContent + '@' + e.style.left).join('|'), first, '다른 콘텐츠는 다른 지도');
  run('state.idx = 49; updateProgress()');
  assert.equal(els['journey-done'].style.width, '50%');
  assert.ok(els['journey-walker'].style.left.includes('0.5'), '캐릭터가 절반 지점');
  const ahead = made.filter((e) => e.classList.contains('ahead')).length;
  assert.ok(ahead > 0 && ahead < made.length, '앞쪽 풍경만 안개');
});

test('⚔️ 배틀: 문장 완료 때 추첨 → 다음 전환에서 열림(퍼즐보다 먼저) → 승/패 반영 → 이동 이어감. 부모 모드·HP 끔이면 없음', () => {
  const { run, els, video, puzzleCalls, battleCalls, battleState, xpLog, coinLog, ctx } = loadPlayer();
  const keys = new Set();
  ctx.track.done = (c) => keys.add(c.start);
  ctx.track.todayDone = () => keys.size;
  battleState.caught = { 25: 1, 4: 1 };
  run('settings.listenFirst = 0; settings.puzzleEvery = 1; settings.dailyGoal = 0; state.characters = [{ id: 25, ko: "피카츄", url: "x" }, { id: 4, ko: "파이리", url: "y" }, { id: 7, ko: "꼬부기", url: "z" }]; state.cues = Array.from({ length: 8 }, (_, i) => ({ start: i * 10, end: i * 10 + 2, en: "a b c", ko: "" })); state.idx = 0;');
  for (let i = 0; i < 5; i++) run(`markDone(state.cues[${i}])`);
  assert.equal(run('state.battlePending'), null, '추첨에 안 걸리면 없음');
  battleState.roll = true;
  run('markDone(state.cues[5])');
  const pending = run('state.battlePending');
  assert.ok(pending && pending.id === 7, '못 잡은 꼬부기가 상대');
  run('goTo(6)');
  assert.equal(battleCalls.length, 1, '전환 시 배틀 열림');
  assert.equal(puzzleCalls.length, 0, '퍼즐보다 먼저');
  assert.equal(run('state.battleOpen'), true);
  assert.equal(run('state.idx'), 0, '끝날 때까지 이동 안 함');
  assert.equal(video.paused, true);
  const o = battleCalls[0];
  assert.equal(o.opponent.id, 7);
  assert.equal(o.mine.map((m) => m.id).sort().join(','), '25,4', '잡은 것 전부(파트너 없음)');
  assert.equal(typeof o.nextCue().en, 'string', '따라 말할 문장');
  // 승리 → 상대 획득 + ⚡40 💰15 → 이동 이어감
  o.onDone({ outcome: 'win', my: o.mine.find((m) => m.id === 25), opponent: o.opponent, turns: 3 });
  assert.deepEqual(battleState.won, [7]);
  assert.ok(xpLog.includes(40) && coinLog.includes(15));
  assert.equal(run('state.idx'), 6);
  assert.equal(run('state.battleOpen'), false);
  // 패배 → battleLoss
  run('state.battlePending = { id: 7, ko: "꼬부기", url: "z" }; goTo(7)');
  battleCalls[1].onDone({ outcome: 'lose', my: battleCalls[1].mine.find((m) => m.id === 4), opponent: battleCalls[1].opponent, turns: 5 });
  assert.deepEqual(battleState.lost, [4]);
  assert.equal(run('state.idx'), 7);
  // 파트너는 내보낼 수 없음
  ctx.getPartner = () => 25;
  run('state.battlePending = { id: 7, ko: "꼬부기", url: "z" }; state.idx = 0; goTo(1)');
  assert.equal(battleCalls[2].mine.map((m) => m.id).join(','), '4');
  battleCalls[2].onDone({ outcome: 'declined', opponent: battleCalls[2].opponent, turns: 0 });
  assert.equal(run('state.idx'), 1, '거절해도 이동은 이어감');
  // 부모 모드·HP 끔이면 추첨 없음
  run('setParentMode(true); markDone(state.cues[7]); setParentMode(false); settings.hp = false; markDone(state.cues[7])');
  assert.equal(run('state.battlePending'), null);
});

test('⚔️ Codex #3/#4/#6: 화면 꺼짐이면 배틀 턴 중단(interrupted), 마지막 문장 섀도잉 뒤에도 배틀, 배틀 중 연습 진입 무시', async () => {
  const { run, els, ctx, battleCalls, puzzleCalls, video } = loadPlayer();
  // #4 마지막 문장 섀도잉 완료 경로
  run(FIVE_CUES + ' settings.listenFirst = 0; settings.puzzleEvery = 1; state.idx = 4; state.puzzlePool = state.cues.slice(); state.shadowNext = "next"; state.battlePending = { id: 7, ko: "꼬부기", url: "z" }; afterShadowWait()');
  assert.equal(battleCalls.length, 1, '마지막 문장에서도 배틀이 열림');
  assert.equal(puzzleCalls.length, 0, '퍼즐은 안 열림');
  assert.equal(run('state.battleOpen'), true);
  assert.equal(els['view-player'].inert, true, '#6 뒤 화면 inert');
  // #6 진행 중 배틀을 연습으로 덮어쓰지 않음
  run('state.characters = [{ id: 25, ko: "피카츄", url: "x" }]; startBattlePractice()');
  assert.equal(battleCalls.length, 1);
  // #3 배틀 턴의 말하기 중 화면 꺼짐 → interrupted 로 끝나고 재생 상태 정리
  let resolved = null;
  const speakP = run('speakSentence(state.cues[0], { register() {}, onInterim() {} })');
  speakP.then((r) => { resolved = r; });
  assert.equal(run('state.puzzlePlaying'), true, '문장 듣기 시작');
  ctx.document.hidden = true;
  run('onVisibilityChange()');
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(resolved && resolved.method, 'interrupted');
  assert.equal(run('state.puzzleCue'), null);
  assert.equal(run('state.puzzlePlaying'), false);
  assert.equal(run('state.sentenceSpeakStop'), null);
  assert.equal(video.paused, true);
  ctx.document.hidden = false;
  // 배틀 끝나면 inert 해제
  battleCalls[0].onDone({ outcome: 'declined', opponent: battleCalls[0].opponent, turns: 0 });
  assert.equal(run('state.battleOpen'), false);
  assert.equal(els['view-player'].inert, false);
});

test('👨‍👩‍👦 부모 모드는 저장되지 않음 — 설정 저장에도 settings에 안 들어감', () => {
  const { run, ctx } = loadPlayer();
  const saved = [];
  ctx.localStorage.setItem = (k, v) => saved.push([k, v]);
  run('setParentMode(true); saveSettings()');
  const s = saved.find(([k]) => k === 'shincoach.settings');
  assert.ok(s, '설정은 저장됨');
  assert.equal(s[1].includes('parent'), false, '부모 모드는 설정 파일에 없음');
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

// ── 🔁 복습 연동 ──

/** 단어 기록 스텁 심기 */
function vocabStub(reviewState, list) {
  reviewState.vocab = list;
}

/** 복습 대상 문장 기록 하나 만들기 */
function due(start, patch = {}) {
  return { key: `x|${start * 10}`, itemId: 'x', start, en: 'Hello there.', ko: '안녕.', done: true, box: 0, dueAt: '2026-09-01', bestRatio: 0.5, speakSkipped: 0, lastAt: start, ...patch };
}

test('🔁 콘텐츠를 열면 오늘 할 복습을 제안하고, 설정한 문장 수만큼만 낸다', () => {
  const { run, els, reviewCalls, reviewState } = loadPlayer();
  reviewState.stats = [due(1), due(2), due(3), due(4), due(5)];
  run('state.cues = [{start:1,end:2,en:"a",ko:""},{start:2,end:3,en:"b",ko:""},{start:3,end:4,en:"c",ko:""},{start:4,end:5,en:"d",ko:""},{start:5,end:6,en:"e",ko:""}]; settings.reviewCount = 3; state.reviewDone = false; maybeReview();');
  assert.equal(reviewCalls.length, 1);
  assert.equal(reviewCalls[0].items.length, 3, '기본 3문장');
  assert.equal(run('state.reviewOpen'), true);
  assert.equal(els['view-player'].inert, true, '뒤 화면은 눌리지 않게');
});

test('🔁 복습을 끄면·오늘 할 문장이 없으면·부모 모드면 안 뜬다', () => {
  const setup = 'state.cues = [{start:1,end:2,en:"a",ko:""}];';
  let p = loadPlayer();
  p.reviewState.stats = [due(1)];
  p.run(`${setup} settings.reviewCount = 0; state.reviewDone = false; maybeReview();`);
  assert.equal(p.reviewCalls.length, 0, '⚙ 끔');

  p = loadPlayer();
  p.reviewState.stats = [due(1, { dueAt: '2027-01-01' })];
  p.run(`${setup} settings.reviewCount = 3; state.reviewDone = false; maybeReview();`);
  assert.equal(p.reviewCalls.length, 0, '아직 때가 안 됨');

  p = loadPlayer();
  p.reviewState.stats = [due(1)];
  p.run(`${setup} settings.reviewCount = 3; state.parentMode = true; state.reviewDone = false; maybeReview();`);
  assert.equal(p.reviewCalls.length, 0, '👨‍👩‍👦 부모 모드');
});

test('🔁 건너뛰기를 두 번 하면 그날은 더 묻지 않는다', () => {
  const { run, reviewCalls, reviewState } = loadPlayer();
  reviewState.stats = [due(1)];
  reviewState.skips = 2;
  run('state.cues = [{start:1,end:2,en:"a",ko:""}]; settings.reviewCount = 3; state.reviewDone = false; maybeReview();');
  assert.equal(reviewCalls.length, 0);
});

test('🔁 "나중에"로 닫으면 건너뛴 것으로 세고, 하다가 닫으면 안 센다', () => {
  const { run, els, reviewCalls, reviewState } = loadPlayer();
  reviewState.stats = [due(1), due(2), due(3)];
  run('state.cues = [{start:1,end:2,en:"a",ko:""},{start:2,end:3,en:"b",ko:""},{start:3,end:4,en:"c",ko:""}]; settings.reviewCount = 3; state.reviewDone = false; maybeReview();');
  reviewCalls[0].onDone({ started: false, done: 0, passed: 0, finished: false });
  assert.equal(reviewState.skips, 1);
  assert.equal(run('state.reviewOpen'), false);
  assert.equal(els['view-player'].inert, false, 'inert 해제');

  run('state.reviewDone = false; maybeReview();');
  reviewCalls[1].onDone({ started: true, done: 2, passed: 1, finished: false }); // 두 문장 하다가 닫음
  assert.equal(reviewState.skips, 1, '하다 만 것은 건너뛴 게 아님');
});

test('🔁 문장을 통과하면 ⚡·💰, 회차를 끝내면 🌟 황금 볼 + ❤️ 회복 (하루 한 번)', () => {
  const { run, reviewCalls, reviewState, xpLog, coinLog, itemLog, hpLog, hpState } = loadPlayer();
  hpState.partner = 25;
  hpState.hp[25] = 50;
  reviewState.stats = [due(1), due(2), due(3)];
  run('state.cues = [{start:1,end:2,en:"a",ko:""},{start:2,end:3,en:"b",ko:""},{start:3,end:4,en:"c",ko:""}]; settings.reviewCount = 3; settings.hp = true; state.reviewDone = false; maybeReview();');
  const o = reviewCalls[0];

  o.onSentence({ start: 1, en: 'a' }, true);
  o.onSentence({ start: 2, en: 'b' }, false);
  assert.deepEqual(reviewState.reviewed, [{ start: 1, passed: true }, { start: 2, passed: false }]);
  assert.equal(xpLog.length, 1, '통과한 문장만 XP');
  assert.equal(coinLog.length, 1);

  const given = o.onFinished();
  assert.ok(given.golden > 0, '하루 첫 완주 → 황금 볼');
  assert.ok(given.hp > 0);
  assert.equal(reviewState.rounds, 1);
  assert.equal(reviewState.golden, true);
  assert.ok(itemLog.includes('goldenball'), '가방에 황금 볼');
  assert.ok(hpLog.some((d) => d > 0), 'HP 회복');

  // 같은 날 두 번째 회차: XP·코인은 주되 황금 볼·HP는 없음
  const before = itemLog.length;
  const again = o.onFinished();
  assert.equal(again.golden, 0);
  assert.equal(again.hp, 0);
  assert.equal(itemLog.length, before, '황금 볼을 또 주지 않음');
});

test('🔁 중간에 그만뒀으면 남은 문장만 채우면 완주 (1문장만 냄)', () => {
  const { run, reviewCalls, reviewState } = loadPlayer();
  reviewState.stats = [due(1), due(2), due(3), due(4)];
  reviewState.items = 2; // 오늘 이미 2문항 했음 (3문항 회차 중 — 문장이든 단어든)
  run('state.cues = [{start:1,end:2,en:"a",ko:""},{start:2,end:3,en:"b",ko:""},{start:3,end:4,en:"c",ko:""},{start:4,end:5,en:"d",ko:""}]; settings.reviewCount = 3; state.reviewDone = false; maybeReview();');
  assert.equal(reviewCalls[0].items.length, 1, '한 문장만 더 하면 완주');
});

test('🔁 기록에만 있고 지금 자막에 없는 문장은 건너뛴다 (문장 합치기를 바꾼 경우)', () => {
  const { run, reviewCalls, reviewState } = loadPlayer();
  reviewState.stats = [due(1), due(99)]; // 99초 문장은 지금 자막에 없음
  run('state.cues = [{start:1,end:2,en:"a",ko:""}]; settings.reviewCount = 3; state.reviewDone = false; maybeReview();');
  assert.equal(reviewCalls[0].items.length, 1);
  assert.equal(reviewCalls[0].items[0].cue.start, 1);
});

test('🔁 [Codex #7] 자막에 없는 기록이 우선순위 상위를 차지해도 뒤의 멀쩡한 문장이 나온다', () => {
  const { run, reviewCalls, reviewState } = loadPlayer();
  // 앞 3개는 "넘긴 문장"이라 우선순위가 가장 높지만 지금 자막에 없다
  reviewState.stats = [
    due(90, { speakSkipped: 2 }), due(91, { speakSkipped: 2 }), due(92, { speakSkipped: 2 }),
    due(1), due(2),
  ];
  run('state.cues = [{start:1,end:2,en:"a",ko:""},{start:2,end:3,en:"b",ko:""}]; settings.reviewCount = 3; state.reviewDone = false; maybeReview();');
  assert.equal(reviewCalls.length, 1, '복습이 아예 안 뜨면 안 됨');
  assert.deepEqual(Array.from(reviewCalls[0].items).map((x) => x.cue.start), [1, 2]); // vm 배열 복사 후 비교
});

test('🔁 [Codex #9] ⚙ 연습 중에는 학습 시간이 쌓이지 않는다', async () => {
  const { run, reviewCalls, reviewState } = loadPlayer();
  reviewState.stats = [due(1, { lastAt: 5 })];
  run('state.cues = [{start:1,end:2,en:"a",ko:""}]; settings.reviewCount = 3; startReviewNow();');
  await tick(); // 단어 목록을 다시 읽은 뒤에 열린다
  assert.equal(reviewCalls.length, 1);
  assert.equal(reviewCalls[0].practice, true);
  assert.equal(run('state.practiceOpen'), true, '연습 표시가 켜져야 시간·기록이 안 쌓임');
  reviewCalls[0].onDone({ started: true, done: 1, passed: 1, finished: true });
  assert.equal(run('state.practiceOpen'), false, '끝나면 꺼짐');
  assert.equal(reviewState.reviewed.length, 0, '연습은 복습 진도를 건드리지 않음');
});

test('🔁 복습 중에는 플레이어 단축키가 먹지 않는다', () => {
  const { run } = loadPlayer();
  run('state.cues = [{start:0,end:2,en:"a",ko:""},{start:10,end:12,en:"b",ko:""}]; state.idx = 0; state.reviewOpen = true;');
  run('onKeyDown({ key: "ArrowRight", target: { tagName: "BODY" }, preventDefault() {} })');
  assert.equal(run('state.idx'), 0);
});

// ── 🎯 말하기 단어별 결과 ──

test('🎯 미달이면 단어별 결과를 보여주고, 못 말한 단어만 누를 수 있다', async () => {
  const miss = { passed: false, method: 'speech', transcript: 'i walking the door', score: { matched: 4, total: 6, ratio: 0.66 } };
  const { run, els } = loadPlayerWithSpeak([miss]);
  run('state.cues = [{start:0,end:2,en:"I was walking through the door.",ko:""},{start:10,end:12,en:"b",ko:""}]; state.idx = -1;');
  run('goTo(0)');
  run('video.currentTime = 2; onCueEnd()');
  run('skipShadowWait()'); await tick();
  const box = els['shadow-words'];
  assert.equal(box.hidden, false, '단어별 결과가 보여야 함');
  assert.equal(box.children.length, 6);
  assert.deepEqual(box.children.map((c) => c.textContent), ['I', 'was', 'walking', 'through', 'the', 'door.']);
  // 맞은 단어는 누를 수 없고(disabled), 못 말한 단어만 누를 수 있다
  assert.deepEqual(box.children.map((c) => !!c.disabled), [true, false, true, false, true, true]);
  assert.ok(box.children[1].className.includes('miss'));
  assert.ok(box.children[0].className.includes('ok'));
});

test('🎯 못 말한 단어를 누르면 그 구간만 재생하고 자동 진행이 미뤄진다', async () => {
  const miss = { passed: false, method: 'speech', transcript: 'i the door', score: { matched: 3, total: 6, ratio: 0.5 } };
  const { run, els, video, ctx } = loadPlayerWithSpeak([miss]);
  ctx.wordTimings = realWordTimings; // 단어 시간은 실제 모듈로 (글자 수 비례 추정)
  run('state.cues = [{start:0,end:3,en:"I was walking through the door.",ko:""},{start:10,end:12,en:"b",ko:""}]; state.idx = -1;');
  run('goTo(0)');
  run('video.currentTime = 3; onCueEnd()');
  run('skipShadowWait()'); await tick();
  const box = els['shadow-words'];
  const before = run('state.shadowTimer');
  box.children[1]._fire('click', { stopPropagation() {}, preventDefault() {} }); // "was"
  assert.ok(run('state.wordPlayUntil') > 0, '그 단어 끝에서 멈추도록 예약');
  assert.ok(video.currentTime < 3, '문장 앞쪽 그 단어 위치로 이동');
  assert.equal(video.paused, false);
  assert.notEqual(run('state.shadowTimer'), before, '자동 진행 타이머가 다시 세어짐');

  // 단어 끝에 닿으면 멈추고, 문장 상태는 건드리지 않는다
  run(`video.currentTime = state.wordPlayUntil + 0.01; onTick();`);
  assert.equal(video.paused, true);
  assert.equal(run('state.wordPlayUntil'), 0);
  assert.equal(run('state.idx'), 0, '다음 문장으로 넘어가지 않음');
});

test('🎯 소리 길이로만 판정한 기기(인식 없음)에서는 단어별 결과를 숨긴다', async () => {
  const energy = { passed: false, method: 'energy', transcript: '', score: null };
  const { run, els } = loadPlayerWithSpeak([energy]);
  run('state.cues = [{start:0,end:2,en:"I was walking.",ko:""},{start:10,end:12,en:"b",ko:""}]; state.idx = -1;');
  run('goTo(0)');
  run('video.currentTime = 2; onCueEnd()');
  run('skipShadowWait()'); await tick();
  assert.equal(els['shadow-words'].hidden, true);
});

test('🎯 [Codex #1] 단어를 눌러도 결과 화면이 닫히거나 다음 문장으로 넘어가지 않는다', async () => {
  const miss = { passed: true, method: 'speech', transcript: 'i the door', score: { matched: 3, total: 6, ratio: 0.5 } };
  const { run, els, video, ctx } = loadPlayerWithSpeak([miss]);
  ctx.wordTimings = realWordTimings;
  run('state.cues = [{start:0,end:3,en:"I was walking through the door.",ko:""},{start:10,end:12,en:"b",ko:""}]; state.idx = -1;');
  run('goTo(0)');
  run('video.currentTime = 3; onCueEnd()');
  run('skipShadowWait()'); await tick();

  const box = els['shadow-words'];
  const overlay = els['shadow-overlay'];
  const stopped = clickWithBubble(box.children[1], overlay); // "was" — 부모까지 전파시켜 본다
  assert.equal(stopped, true, '전파를 막아야 함');
  assert.equal(run('state.idx'), 0, '다음 문장으로 넘어가면 안 됨');
  assert.ok(run('state.wordPlayUntil') > 0, '단어 재생이 살아 있어야 함');
});

test('🎯 [Codex #2] 단어를 다 들은 뒤에야 자동 진행 대기가 시작된다', async () => {
  const miss = { passed: true, method: 'speech', transcript: 'i the door', score: { matched: 3, total: 6, ratio: 0.5 } };
  const { run, els, video, ctx } = loadPlayerWithSpeak([miss]);
  ctx.wordTimings = realWordTimings;
  run('state.cues = [{start:0,end:3,en:"I was walking through the door.",ko:""},{start:10,end:12,en:"b",ko:""}]; state.idx = -1;');
  run('goTo(0)');
  run('video.currentTime = 3; onCueEnd()');
  run('skipShadowWait()'); await tick();

  els['shadow-words'].children[1]._fire('click', { stopPropagation() {}, preventDefault() {} });
  assert.equal(run('state.shadowTimer'), null, '듣는 동안에는 대기 타이머가 없어야 함');
  assert.ok(run('state.wordPlayGuard'), '재생이 끝나지 않을 때를 대비한 안전장치');

  run('video.currentTime = state.wordPlayUntil + 0.01; onTick();');
  assert.equal(video.paused, true, '단어 끝에서 멈춤');
  assert.equal(run('state.wordPlayUntil'), 0);
  assert.equal(run('state.wordPlayGuard'), null, '안전장치 정리');
  assert.ok(run('state.shadowTimer'), '이제서야 자동 진행 대기 시작');
  assert.equal(run('state.idx'), 0);
});

test('🎯 [Codex #5] 기록에는 화면 토큰이 아니라 실제로 못 말한 단어를 남긴다', async () => {
  const miss = { passed: false, method: 'speech', transcript: 'a well face', score: { matched: 3, total: 4, ratio: 0.75 } };
  const { run, missedLog } = loadPlayerWithSpeak([miss]);
  run('state.cues = [{start:0,end:2,en:"A well-known face.",ko:""},{start:10,end:12,en:"b",ko:""}]; state.idx = -1;');
  run('goTo(0)');
  run('video.currentTime = 2; onCueEnd()');
  run('skipShadowWait()'); await tick();
  assert.deepEqual(Array.from(missedLog[0]), ['known'], 'wellknown 같은 합성 단어가 아니라 실제 누락 단어'); // vm 배열이라 복사 후 비교
});

test('🔤 [Codex #1] 단어를 푼 회차도 문항 수에 세어 다음 회차가 짧아지지 않는다', () => {
  const { run, reviewCalls, reviewState } = loadPlayer();
  reviewState.stats = [due(1), due(2), due(3), due(4)];
  vocabStub(reviewState, [{ word: 'brave', meaning: '용감한', views: 3, box: 0, dueAt: '' }, { word: 'x', meaning: '느린', views: 3 }]);
  run('state.cues = [{start:1,end:2,en:"a",ko:""},{start:2,end:3,en:"b",ko:""},{start:3,end:4,en:"c",ko:""},{start:4,end:5,en:"d",ko:""}]; settings.reviewCount = 3; state.reviewDone = false;');
  run('state.vocabViews = ' + JSON.stringify([{ word: 'brave', meaning: '용감한', views: 3, box: 0, dueAt: '' }, { word: 'x', meaning: '느린', views: 3, box: 0, dueAt: '' }]) + '; maybeReview();');
  const o = reviewCalls[0];
  assert.equal(o.items.length, 3, '문장 2 + 단어 1');
  assert.equal(Array.from(o.items).filter((it) => it.type === 'word').length, 1);

  // 문장 2개 + 단어 1개를 끝내면 오늘 문항 수가 3이 되어야 한다
  o.onSentence({ start: 1, en: 'a' }, true);
  o.onSentence({ start: 2, en: 'b' }, true);
  o.onWord(Array.from(o.items).find((it) => it.type === 'word'), true);
  assert.equal(reviewState.items, 3, '단어도 회차 진행 수에 들어가야 함');
  assert.equal(run('track.todayReviewItems() % settings.reviewCount'), 0, '다음 회차는 처음부터 3문항');
});

// ── ✍️ 받아쓰기 ──

test('✍️ 익숙해진 문장(box 1+) 하나가 받아쓰기로 바뀐다', () => {
  const { run, ctx, reviewCalls, reviewState } = loadPlayer();
  ctx.state = ctx.state || {};
  reviewState.stats = [
    due(1, { box: 0, en: 'I was walking through the door.' }),
    due(2, { box: 2, en: 'He was very brave that day.', missed: { brave: 2 } }),
    due(3, { box: 1, en: 'She walked into the room.' }),
  ];
  run(`state.cues = [
    {start:1,end:4,en:"I was walking through the door.",ko:""},
    {start:2,end:5,en:"He was very brave that day.",ko:""},
    {start:3,end:6,en:"She walked into the room.",ko:""}
  ]; settings.reviewCount = 3; state.reviewDone = false; state.vocab = { known: VOCAB_KNOWN }; maybeReview();`);
  assert.equal(reviewCalls.length, 1);
  const items = Array.from(reviewCalls[0].items);
  const dict = items.filter((it) => it.type === 'dictation');
  assert.equal(dict.length, 1, '회차당 최대 1개');
  assert.ok((dict[0].rec.box || 0) >= 1, '처음 만나는 문장(box 0)은 따라 말하기로 남는다');
  assert.ok(dict[0].blanks.length >= 1);
  assert.ok(Array.isArray(dict[0].words) && dict[0].words.length > 0);
});

test('✍️ 전부 처음 만나는 문장이면 받아쓰기를 내지 않는다', () => {
  const { run, reviewCalls, reviewState } = loadPlayer();
  reviewState.stats = [due(1, { box: 0, en: 'I was walking through the door.' }), due(2, { box: 0, en: 'He was very brave.' })];
  run(`state.cues = [{start:1,end:4,en:"I was walking through the door.",ko:""},{start:2,end:5,en:"He was very brave.",ko:""}];
    settings.reviewCount = 3; state.reviewDone = false; state.vocab = { known: VOCAB_KNOWN }; maybeReview();`);
  const items = Array.from(reviewCalls[0].items);
  assert.equal(items.filter((it) => it.type === 'dictation').length, 0);
});

test('✍️ 단어장이 없으면 받아쓰기 없이 평소대로', () => {
  const { run, reviewCalls, reviewState } = loadPlayer();
  reviewState.stats = [due(1, { box: 3, en: 'He was very brave that day.' })];
  run(`state.cues = [{start:1,end:4,en:"He was very brave that day.",ko:""}];
    settings.reviewCount = 3; state.reviewDone = false; state.vocab = null; maybeReview();`);
  const items = Array.from(reviewCalls[0].items);
  assert.equal(items.filter((it) => it.type === 'dictation').length, 0);
  assert.equal(items[0].type, 'sentence');
});

test('✍️ 받아쓰기 결과는 문장 복습과 같은 라이트너 규칙을 탄다', () => {
  const { run, reviewCalls, reviewState } = loadPlayer();
  reviewState.stats = [due(1, { box: 2, en: 'He was very brave that day.' })];
  run(`state.cues = [{start:1,end:4,en:"He was very brave that day.",ko:""}];
    settings.reviewCount = 3; state.reviewDone = false; state.vocab = { known: VOCAB_KNOWN }; maybeReview();`);
  const o = reviewCalls[0];
  const dict = Array.from(o.items).find((it) => it.type === 'dictation');
  assert.ok(dict, '받아쓰기가 만들어져야 함');
  o.onDictation(dict, true);
  assert.deepEqual(reviewState.reviewed.map((r) => r.passed), [true], 'track.review로 기록');
});
