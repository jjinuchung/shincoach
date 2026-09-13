// 플레이어 화면: 문장 단위 이동 / 반복 / 속도 / 이중 자막 / 섀도잉 / 단어 하이라이트 / 이어보기
import { getItem, getVideoBlob, updateItem } from './db.js';
import {
  parseSubtitle, mergeSubtitles, mergeIntoSentences,
  wordTimings, findCueIndex,
} from './srt.js';
import { loadVocab } from './vocab.js';
import { initDiag, renderDiag } from './diag.js';
import { runSpeakCheck, prepareMic, releaseMic } from './speak.js';
import { initPuzzle, openPuzzle, closePuzzle, pickPuzzle } from './puzzle.js';
import { loadCharacters, downloadCharacters, pickCharacters, ROSTER } from './pokemon.js';
import { initProfile, getLevelInfo, gainXp, catchAttempt, previewAttempt, puzzleXp, XP } from './xp.js';
import { initCatch, openCatch, closeCatch } from './catch.js';
import * as track from './track.js';

const $ = (id) => document.getElementById(id);

const SPEEDS = [0.6, 0.8, 1.0, 1.25];
const REPEATS = [0, 3, 5, Infinity]; // 0 = 끔
const END_EPS = 0.02; // 문장 끝 판정 여유(초) — rAF 간격(~16ms)만큼만. 크면 마지막 음절이 잘림

const settings = loadSettings();

const state = {
  item: null,
  cues: [],
  idx: -1,
  open: false,       // 플레이어 화면이 열려 있는지 (비동기 작업 완료 후 확인용)
  seeking: false,    // video.seeking 중에는 문장 끝 판정 보류
  onMeta: null,      // loadedmetadata 핸들러 (닫을 때 제거)
  objectUrl: null,
  speedIdx: 2,
  repeatIdx: 3,       // 기본 ∞ 반복 (아이가 다음 문장을 직접 넘길 때까지 같은 문장)
  repeatCount: 0,
  shadow: false,
  showEn: true,
  showKo: true,
  listenCount: 0,     // 듣기 먼저: 현재 문장을 (영어 숨긴 채) 끝까지 들은 횟수
  enRevealed: true,   // 듣기 먼저: 현재 문장의 영어 자막 공개 여부
  shadowTimer: null,
  shadowRaf: null,
  shadowNext: 'next', // 따라 말하기 뒤 동작: 'repeat' | 'next'
  speakPassed: false, // 말하기 확인: 현재 문장 통과 여부
  speakFails: 0,      // 말하기 확인: 현재 문장 실패 횟수 (3번이면 통과시킴)
  speakRun: null,     // 진행 중인 말하기 확인 { promise, stop }
  speakHideEn: 'none', // 따라 말하기 대기 중 영어 숨김 단계: 'full'(전부) | 'partial'(절반 힌트) | 'none' — 못 할수록 더 보여줌
  speakUnavailable: false, // 마이크 못 쓰면 확인 없이 진행
  micPrepared: false,
  puzzlePool: [],     // 🧩 마지막 퍼즐 이후 "한" 문장들 (중복 없이) → N개 차면 그중 하나로 퍼즐
  puzzleCue: null,    // 퍼즐이 열려 있는 동안 그 문장 (열려 있으면 재생 루프/키보드가 플레이어 상태를 건드리지 않음)
  puzzlePlaying: false, // 퍼즐의 🔊 다시 듣기로 그 문장을 재생 중 (끝나면 멈춤)
  puzzleOnEnd: null,  // 퍼즐 다시 듣기가 끝났을 때 알릴 콜백 (정답 뒤 들려주기 → 닫기)
  characters: [],     // 🎮 기기에 받아둔 퍼즐 캐릭터 [{ id, ko, url }] (없으면 단어 조각만)
  catchOpen: false,   // 🎯 잡기 화면이 열려 있음 (키보드 무시)
  raf: null,
  wordSpans: [],
  wordTimes: [],
  lastWordIdx: -1,
  saveTimer: null,
  wakeLock: null,
  vocab: null,        // 단어장 (비동기 로드)
};

let showView;
let video;

/** 반복/속도/섀도잉 선택을 기기에 저장해 다음에 열 때 유지 */
function loadPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem('shincoach.prefs') || '{}');
    if (Number.isInteger(p.repeatIdx) && REPEATS[p.repeatIdx] !== undefined) state.repeatIdx = p.repeatIdx;
    if (Number.isInteger(p.speedIdx) && SPEEDS[p.speedIdx] !== undefined) state.speedIdx = p.speedIdx;
    if (typeof p.shadow === 'boolean') state.shadow = p.shadow;
  } catch { /* 무시 */ }
}
function savePrefs() {
  try {
    localStorage.setItem('shincoach.prefs', JSON.stringify({ repeatIdx: state.repeatIdx, speedIdx: state.speedIdx, shadow: state.shadow }));
  } catch { /* 무시 */ }
}

// ───────────────────── 초기화 ─────────────────────

export function initPlayer(ctx) {
  showView = ctx.showView;
  video = $('video');
  loadPrefs();

  $('btn-back').addEventListener('click', closePlayer);
  $('btn-play').addEventListener('click', onPlayButton);
  $('btn-prev').addEventListener('click', () => step(-1));
  $('btn-next').addEventListener('click', () => step(1));
  $('btn-repeat').addEventListener('click', cycleRepeat);
  $('btn-speed').addEventListener('click', cycleSpeed);
  $('btn-shadow').addEventListener('click', toggleShadow);
  $('btn-toggle-en').addEventListener('click', () => toggleSub('en'));
  $('btn-toggle-ko').addEventListener('click', () => toggleSub('ko'));
  $('btn-settings').addEventListener('click', openSettings);
  $('shadow-overlay').addEventListener('click', skipShadowWait);
  video.addEventListener('click', onPlayButton);

  video.addEventListener('play', () => { updatePlayIcon(); hidePlayerMessage(); startLoop(); acquireWakeLock(); });
  video.addEventListener('pause', () => { updatePlayIcon(); stopLoop(); releaseWakeLock(); scheduleSave(); });
  video.addEventListener('ended', onVideoEnded);
  video.addEventListener('seeking', () => { state.seeking = true; });
  video.addEventListener('seeked', () => { state.seeking = false; syncToTime(); });
  video.addEventListener('error', () => {
    const code = video.error && video.error.code;
    // 4 = MEDIA_ERR_SRC_NOT_SUPPORTED (이 기기에서 못 여는 형식), 3 = 디코딩 오류
    const why = code === 4 ? '이 기기에서 재생할 수 없는 영상 형식이에요' : '영상을 재생하는 중 문제가 생겼어요';
    showPlayerMessage(`😢 ${why}`);
  });

  // 홈 화면 이동/화면 꺼짐 → 학습 일시정지 (백그라운드에서 rAF/타이머가 멈춰 문장 상태가 어긋나는 것 방지)
  document.addEventListener('visibilitychange', onVisibilityChange);
  document.addEventListener('keydown', onKeyDown);
  initSettingsDialog();
  initPinDialog();
  initVocabPanel();
  initDiag();
  initPuzzle();
  initCharacters();
  initCatch();
  initProfile().then(updateLevelChip).catch(() => {});
  $('level-chip').addEventListener('click', () => { closePlayer(); import('./pokedex.js').then((m) => m.openPokedex()); });
  // 학습 시간: 재생 중이거나 따라 말하는 중·퍼즐 푸는 중이면 1초씩 누적
  setInterval(() => {
    if (!state.open) return;
    const cue = state.cues[state.idx];
    if (cue && (!video.paused || state.speakRun || state.puzzleCue)) track.tick(cue, 1);
  }, 1000);
}

// ───────────────────── 🧩 문장 퍼즐 ─────────────────────

/** N문장이 차서 다음 문장으로 넘어가기 전에 퍼즐을 낼 차례인지 */
function puzzleReady() {
  return settings.puzzleEvery > 0 && state.puzzlePool.length >= settings.puzzleEvery;
}

/**
 * 퍼즐 열기. 모아둔 문장 중 낼 만한 것(3~8단어)이 없으면 바로 continueFn.
 * 끝나면(맞춤/정답 공개 후 계속하기) 결과를 기록하고 continueFn으로 원래 하려던 이동을 이어감
 */
function startPuzzle(continueFn) {
  const pool = state.puzzlePool;
  state.puzzlePool = [];
  const cue = pickPuzzle(pool);
  if (!cue) { continueFn(); return; }
  showPuzzle(cue, (result) => {
    track.puzzle(cue, result);
    const g = awardXp(puzzleXp(result));
    // 정답이면 퍼즐에 나온 포켓몬 중 한 마리에게 몬스터볼 던지기 (캐릭터가 없으면 그냥 이어감)
    if (result.solved && result.characters && result.characters.length) {
      state.catchOpen = true;
      openCatch({
        candidates: result.characters, xpGain: g.gained, levelInfo: g.info, levelUp: g.leveledUp ? g.to : 0,
        attempt: (id) => catchAttempt(id),
        onDone: () => { state.catchOpen = false; updateLevelChip(); continueFn(); },
      });
      return;
    }
    continueFn();
  });
}

// ───────────────────── ⚡ 경험치·레벨 ─────────────────────

function updateLevelChip() {
  const chip = $('level-chip');
  const i = getLevelInfo();
  chip.textContent = `Lv.${i.level} ⚡${i.into}/${i.need}`;
  chip.hidden = false;
}

/** XP 획득 + 칩 갱신 + 레벨업 알림 */
function awardXp(amount) {
  const g = gainXp(amount);
  updateLevelChip();
  if (g.leveledUp) {
    showPlayerMessage(`🎉 레벨 업! Lv.${g.to}`, 5000);
    const chip = $('level-chip');
    chip.classList.remove('pulse');
    void chip.offsetWidth;
    chip.classList.add('pulse');
  }
  return g;
}

/** ⚙ 잡기 연습: 아무 캐릭터 4마리로 연출만 (기록 안 함) */
function startCatchPractice() {
  if (!state.characters.length) { showPlayerMessage('🎮 먼저 설정에서 포켓몬 캐릭터를 받아 주세요', 4000); return; }
  if (!video.paused) video.pause();
  cancelShadowWait();
  state.catchOpen = true;
  openCatch({
    candidates: pickCharacters(state.characters, 4), levelInfo: getLevelInfo(), practice: true,
    attempt: (id) => previewAttempt(id),
    onDone: () => { state.catchOpen = false; },
  });
}

/** ⚙ "지금 퍼즐 해보기": 현재 문장(안 되면 바로 앞 문장들 중)으로 바로 퍼즐. 기록하지 않고 모아둔 문장도 그대로 둠 */
function startPuzzleNow() {
  if (!state.open || state.idx < 0) return;
  const cue = pickPuzzle([state.cues[state.idx]]) || pickPuzzle(state.cues.slice(Math.max(0, state.idx - 10), state.idx));
  if (!cue) { showPlayerMessage('🧩 이 근처에는 퍼즐로 낼 문장(3~8단어)이 없어요', 4000); return; }
  showPuzzle(cue, () => {});
}

/** 퍼즐 화면 열기 (재생 멈춤·따라 말하기 취소). 끝나면 onDone(result) */
function showPuzzle(cue, onDone) {
  cancelShadowWait();
  hidePlayerMessage();
  if (!video.paused) video.pause();
  state.puzzleCue = cue;
  state.puzzlePlaying = false;
  openPuzzle(cue, {
    characters: state.characters,
    onPlay: (onEnd) => playPuzzleSentence(cue, onEnd),
    onClose: (result) => {
      state.puzzleCue = null;
      state.puzzlePlaying = false;
      state.puzzleOnEnd = null;
      if (!video.paused) video.pause();
      onDone(result);
    },
  });
}

// ───────────────────── 🎮 퍼즐 캐릭터 (⚙에서 한 번 받아 기기에 보관) ─────────────────────

function initCharacters() {
  loadCharacters().then((chars) => { state.characters = chars; updateCharStatus(); }).catch(() => {});
  $('char-download').addEventListener('click', onDownloadCharacters);
}

function updateCharStatus(text) {
  const el = $('char-status');
  if (text) { el.textContent = text; return; }
  const n = state.characters.length;
  el.textContent = n >= ROSTER.length ? `✅ ${n}마리 준비됨` : n > 0 ? `${n}/${ROSTER.length}마리 (나머지는 받기)` : `아직 없음 (0/${ROSTER.length})`;
  $('char-download').hidden = n >= ROSTER.length;
}

async function onDownloadCharacters() {
  const btn = $('char-download');
  btn.disabled = true;
  try {
    const r = await downloadCharacters((done, total, name) => updateCharStatus(`받는 중… ${done}/${total} ${name}`));
    state.characters = await loadCharacters();
    updateCharStatus();
    if (r.fail) updateCharStatus(`${r.ok}마리 받음, ${r.fail}마리 실패 — 인터넷 연결을 확인하고 다시 눌러 주세요`);
  } catch (e) {
    updateCharStatus(`받지 못했어요 (${e.message || e}) — 인터넷 연결을 확인해 주세요`);
  } finally {
    btn.disabled = false;
  }
}

/** 퍼즐의 🔊 다시 듣기: 그 문장 구간만 재생 (끝은 onTick에서 판정해 멈춤). onEnd는 끝났을 때 한 번 호출 */
function playPuzzleSentence(cue, onEnd) {
  state.puzzlePlaying = true;
  state.puzzleOnEnd = onEnd || null;
  video.currentTime = cue.start;
  safePlay();
}

/** 퍼즐 다시 듣기 구간 끝 (또는 영상 끝) */
function endPuzzlePlayback() {
  state.puzzlePlaying = false;
  const cb = state.puzzleOnEnd;
  state.puzzleOnEnd = null;
  if (cb) cb();
}

// ───────────────────── 학습 기록 표시 (⭐, 오늘의 목표) ─────────────────────

/** 문장을 영어 공개 상태로 끝까지 들음 → 기록 + 오늘의 목표 갱신 */
function markDone(cue) {
  const before = track.todayDone();
  track.done(cue);
  const after = track.todayDone();
  if (after !== before) {
    updateGoalChip();
    awardXp(XP.done); // 오늘 처음 완료한 문장 → 경험치
    if (settings.dailyGoal > 0 && after === settings.dailyGoal) showPlayerMessage(`🎉 오늘 목표 ${settings.dailyGoal}문장 달성!`, 5000);
  }
  // 🧩 퍼즐 후보로 모아둠 (같은 문장을 반복해도 한 번만)
  if (settings.puzzleEvery > 0 && !state.puzzlePool.some((c) => c.start === cue.start)) state.puzzlePool.push(cue);
}

/** 현재 문장 ⭐ 정복 표시 (목록) */
function markStar() {
  const cur = $('script-list').querySelector(`.script-item[data-idx="${state.idx}"]`);
  if (cur) cur.classList.add('star');
}

function updateGoalChip() {
  const chip = $('goal-chip');
  if (!chip) return;
  if (!settings.dailyGoal) { chip.hidden = true; return; }
  const n = track.todayDone();
  chip.hidden = false;
  chip.textContent = n >= settings.dailyGoal ? `🎉 ${n}/${settings.dailyGoal}` : `🔥 ${n}/${settings.dailyGoal}`;
  chip.classList.toggle('reached', n >= settings.dailyGoal);
}

// ───────────────────── 단어 패널 ─────────────────────

function initVocabPanel() {
  const panel = $('vocab-panel');
  try { panel.open = localStorage.getItem('shincoach.vocabOpen') === '1'; } catch { /* 무시 */ }
  panel.addEventListener('toggle', () => {
    try { localStorage.setItem('shincoach.vocabOpen', panel.open ? '1' : '0'); } catch { /* 무시 */ }
    if (panel.open && state.vocabItems) track.vocab(state.cues[state.idx], state.vocabItems, true); // 직접 눌러 펼침
  });
  loadVocab().then((v) => { state.vocab = v; renderVocab(); });
}

/** 현재 문장의 모를 만한 단어·표현을 패널에 표시 (듣기 먼저 중에는 영어 공개 전까지 숨김) */
function renderVocab() {
  const panel = $('vocab-panel');
  const cue = state.cues[state.idx];
  if (!state.vocab || !cue || !state.enRevealed) { panel.hidden = true; return; }
  const items = state.vocab.lookup(cue.en);
  state.vocabItems = items;
  if (items.length === 0) { panel.hidden = true; return; }
  if (panel.open && state.vocabLoggedStart !== cue.start) { // 열린 채 보임 (문장당 1번만)
    track.vocab(cue, items, false);
    state.vocabLoggedStart = cue.start;
  }
  const list = $('vocab-list');
  list.innerHTML = '';
  for (const it of items) {
    const el = document.createElement('span');
    el.className = `vocab-item ${it.kind}`;
    const b = document.createElement('b');
    b.textContent = it.term;
    el.appendChild(b);
    el.appendChild(document.createTextNode(it.meaning));
    list.appendChild(el);
  }
  $('vocab-count').textContent = String(items.length);
  panel.hidden = false;
}

function onVisibilityChange() {
  if (!state.open || !document.hidden) return;
  const wasShadowWaiting = !!state.shadowTimer || !!state.speakRun;
  track.flush();
  cancelShadowWait();
  if (!video.paused) video.pause();
  if (wasShadowWaiting) showPlayerMessage('▶ 를 눌러 이어서 연습해요', 0);
  releaseMic(); // 백그라운드에서 마이크 표시등이 켜져 있지 않도록
  state.micPrepared = false;
  releaseWakeLock();
  scheduleSave(true);
}

// ───────────────────── 열기/닫기 ─────────────────────

/** 콘텐츠 열기. opts.startTime(초)을 주면 그 시각의 문장에서 시작 (학습 기록에서 이동) */
export async function openPlayer(id, opts = {}) {
  const item = await getItem(id);
  if (!item) return;
  const blob = await getVideoBlob(id);
  if (!blob) { alert('영상 파일을 찾을 수 없어요.'); return; }

  closeMedia();
  state.open = true;
  state.item = item;
  state.cues = buildCues(item);
  await track.open(item).catch((e) => console.warn('기록 로드 실패:', e));
  state.idx = -1;
  state.repeatCount = 0;
  state.puzzlePool = [];
  cancelShadowWait();
  hidePlayerMessage();

  $('player-title').textContent = item.title;
  state.objectUrl = URL.createObjectURL(blob);
  video.src = state.objectUrl;
  video.defaultPlaybackRate = SPEEDS[state.speedIdx];
  video.playbackRate = SPEEDS[state.speedIdx];

  renderScriptList();
  applySubVisibility();
  updateChips();
  updateGoalChip();
  showView('player');

  state.onMeta = () => {
    state.onMeta = null;
    // 미디어 로드 과정에서 속도가 초기화될 수 있으므로 다시 적용
    video.playbackRate = SPEEDS[state.speedIdx];
    // 영상 길이를 벗어난 자막은 제외 (자막 파일이 다른 편이면 전부 벗어남 → 안내)
    if (Number.isFinite(video.duration) && video.duration > 0) {
      const inRange = state.cues.filter((c) => c.start < video.duration);
      if (inRange.length !== state.cues.length) {
        state.cues = inRange.map((c, i) => ({ ...c, index: i }));
        renderScriptList();
        showPlayerMessage(inRange.length === 0
          ? '😢 자막 시간이 영상과 맞지 않아요. 자막 파일을 확인해 주세요'
          : `자막 ${state.cues.length}개만 영상 길이 안에 있어요`, 4000);
      }
    }
    let startIdx = Math.min(Math.max(item.lastCue || 0, 0), state.cues.length - 1);
    if (typeof opts.startTime === 'number') {
      let best = 0;
      state.cues.forEach((c, i) => { if (Math.abs(c.start - opts.startTime) < Math.abs(state.cues[best].start - opts.startTime)) best = i; });
      startIdx = best;
    }
    goTo(startIdx, { play: false });
  };
  video.addEventListener('loadedmetadata', state.onMeta, { once: true });
}

function closePlayer() {
  scheduleSave(true);
  track.close();
  updateGoalChip();
  closeMedia();
  showView('library');
}

function closeMedia() {
  state.open = false;
  cancelShadowWait();
  closePuzzle();
  closeCatch();
  state.catchOpen = false;
  state.puzzleCue = null;
  state.puzzlePlaying = false;
  state.puzzleOnEnd = null;
  releaseMic();
  state.micPrepared = false;
  stopLoop();
  releaseWakeLock();
  if (video) {
    if (state.onMeta) { video.removeEventListener('loadedmetadata', state.onMeta); state.onMeta = null; }
    video.pause();
    video.removeAttribute('src');
    video.load();
  }
  if (state.objectUrl) {
    URL.revokeObjectURL(state.objectUrl);
    state.objectUrl = null;
  }
}

function buildCues(item) {
  let en = parseSubtitle(item.enText);
  // 영어를 먼저 문장 단위로 합친 뒤 한글을 매칭해야, 긴 한글 큐가 두 번 붙지 않음
  if (settings.mergeSentences) en = mergeIntoSentences(en);
  const ko = item.koText ? parseSubtitle(item.koText) : [];
  return mergeSubtitles(en, ko);
}

// ───────────────────── 이동/재생 ─────────────────────

/** i번째 문장으로 이동 */
/** 말하기 확인이 켜져 있고 아직 통과 못 했으면 앞으로 못 넘어감 */
function speakGateBlocks(targetIdx) {
  if (!settings.speakCheck || state.speakUnavailable) return false;
  if (state.idx < 0 || state.speakPassed) return false;
  return targetIdx > state.idx;
}

/** 새 문장에 들어갈 때 문장별 상태 초기화 (goTo와 연속 재생 자동 이동 모두 여기를 거침) */
function resetSentenceState() {
  state.repeatCount = 0;
  state.listenCount = 0;
  state.enRevealed = settings.listenFirst === 0; // 듣기 먼저 모드면 새 문장은 영어 숨김으로 시작
  state.speakPassed = false;
  state.speakFails = 0;
}

function goTo(i, { play = true, force = false } = {}) {
  if (state.cues.length === 0) return;
  i = Math.max(0, Math.min(i, state.cues.length - 1));
  if (!force && speakGateBlocks(i)) {
    showPlayerMessage('🎤 따라 말해야 다음으로 넘어갈 수 있어요');
    return;
  }
  // 🧩 앞으로 넘어갈 때 N문장이 차 있으면 먼저 퍼즐 → 끝나면 이 이동을 이어감 (퍼즐이 열리면서 모아둔 문장은 비워짐)
  if (!force && i > state.idx && puzzleReady()) {
    startPuzzle(() => goTo(i, { play }));
    return;
  }
  cancelShadowWait();
  state.idx = i;
  resetSentenceState();
  video.currentTime = state.cues[i].start;
  renderSubtitle();
  applySubVisibility();
  updateProgress();
  highlightScript();
  updateChips();
  scheduleSave();
  if (play) safePlay();
  else if (!video.paused) video.pause();
}

function step(delta) {
  const base = state.idx < 0 ? 0 : state.idx;
  goTo(base + delta, { play: true });
}

function safePlay() {
  const p = video.play();
  if (!p || !p.catch) return;
  p.catch((err) => {
    if (err.name === 'AbortError') return; // 영상 전환 중 정상적으로 취소된 경우
    if (err.name === 'NotAllowedError') showPlayerMessage('▶ 버튼을 눌러 주세요', 0);
    else showPlayerMessage(`😢 재생할 수 없어요 (${err.name})`);
  });
}

/** 영상 위에 안내 문구 표시. ms=0이면 재생 시작까지 유지 */
function showPlayerMessage(text, ms = 3000) {
  const el = $('player-msg');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(state.msgTimer);
  if (ms > 0) state.msgTimer = setTimeout(hidePlayerMessage, ms);
}

function hidePlayerMessage() {
  clearTimeout(state.msgTimer);
  $('player-msg').hidden = true;
}

function onPlayButton() {
  if (state.shadowTimer || state.speakRun) { skipShadowWait(); return; }
  // 첫 재생(사용자 터치) 때 마이크 권한을 미리 받아 둠
  if (settings.speakCheck && !state.speakUnavailable && !state.micPrepared) {
    state.micPrepared = true;
    prepareMic().then((stream) => {
      if (!stream) { state.speakUnavailable = true; showPlayerMessage('🎤 마이크를 쓸 수 없어 말하기 확인 없이 진행해요', 4000); }
    });
  }
  if (video.paused) {
    if (state.idx < 0) goTo(0);
    else {
      // 문장 끝에서 멈춘 상태면 그 문장을 처음부터 다시
      const cue = state.cues[state.idx];
      if (cue && video.currentTime >= cue.end - END_EPS) video.currentTime = cue.start;
      safePlay();
    }
  } else {
    video.pause();
  }
}

function updatePlayIcon() {
  $('btn-play').textContent = video.paused ? '▶' : '❚❚';
}

// ───────────────────── 재생 루프 (문장 끝 판정 + 단어 하이라이트) ─────────────────────

function startLoop() {
  stopLoop();
  const tick = () => {
    state.raf = requestAnimationFrame(tick);
    onTick();
  };
  state.raf = requestAnimationFrame(tick);
}

function stopLoop() {
  if (state.raf) cancelAnimationFrame(state.raf);
  state.raf = null;
}

function onTick() {
  if (state.seeking) return; // 탐색 완료 전에는 시간이 신뢰할 수 없음
  const t = video.currentTime;
  // 🧩 퍼즐이 열려 있는 동안: 🔊 다시 듣기 구간이 끝나면 멈추기만 하고 문장 상태는 건드리지 않음
  if (state.puzzleCue) {
    if (state.puzzlePlaying && t >= state.puzzleCue.end - END_EPS) {
      video.pause();
      endPuzzlePlayback();
    }
    return;
  }
  const cue = state.cues[state.idx];
  if (!cue) return;

  // 현재 문장 범위를 크게 벗어났으면 (외부 탐색/백그라운드 복귀) 먼저 동기화 — 문장 끝 판정보다 앞서야 함
  if (t < cue.start - 0.5 || t > cue.end + 0.5) {
    if (syncToTime()) return;
  }

  // 문장 끝 도달
  if (t >= cue.end - END_EPS) {
    onCueEnd();
    return;
  }
  updateWordHighlight(t);
}

/** video.currentTime 기준으로 현재 문장 인덱스를 맞춘다. 바뀌었으면 true */
function syncToTime() {
  if (state.puzzleCue) return false; // 퍼즐의 다시 듣기로 탐색한 것 → 현재 문장은 그대로
  const t = video.currentTime;
  const cue = state.cues[state.idx];
  if (cue && t >= cue.start - 0.5 && t <= cue.end + 0.5) return false;
  const j = findCueIndex(state.cues, t);
  if (j < 0 || j === state.idx) return false;
  state.idx = j;
  state.repeatCount = 0;
  renderSubtitle();
  updateProgress();
  highlightScript();
  updateChips();
  scheduleSave();
  return true;
}

function onVideoEnded() {
  updatePlayIcon();
  stopLoop();
  releaseWakeLock();
  if (state.puzzleCue) { endPuzzlePlayback(); return; } // 퍼즐 다시 듣기가 영상 끝까지 간 경우
  // rAF가 마지막 문장 끝을 놓친 경우: 남은 반복/섀도잉을 여기서 처리
  const cue = state.cues[state.idx];
  if (!cue) return;
  const repeatMax = REPEATS[state.repeatIdx];
  const repeatLeft = repeatMax > 0 && state.repeatCount < repeatMax - 1;
  if (repeatLeft || state.shadow) onCueEnd();
}

function onCueEnd() {
  const repeatMax = REPEATS[state.repeatIdx];
  const cue = state.cues[state.idx];
  track.play(cue, state.idx);

  // 듣기 먼저: 영어를 숨긴 채 N번 들을 때까지 같은 문장을 반복, N번째가 끝나면 영어 공개
  if (settings.listenFirst > 0 && !state.enRevealed) {
    state.listenCount++;
    track.listen(cue);
    applySubVisibility(); // EN 버튼의 👂 n/N 갱신
    video.currentTime = cue.start;
    if (state.listenCount < settings.listenFirst) {
      if (video.paused || video.ended) safePlay();
      return;
    }
    state.enRevealed = true;
    state.repeatCount = 0; // 반복 횟수는 공개 이후부터 셈
    applySubVisibility();
    markScriptRevealed();
    markDone(cue); // N번 다 들었으면 "한 문장"으로 인정 (반복 끔이면 이 뒤로 markDone을 거치지 않으므로)
    updateChips();
    if (state.shadow || speakCheckActive()) { // 섀도잉/말하기 확인이면 바로 따라 말하기 (영어 보면서) → 반복 설정대로 이어감
      video.pause();
      startShadowWait(cue, { repeat: repeatMax > 0 });
      return;
    }
    video.pause();
    showPlayerMessage('👀 이제 영어를 보면서 따라 말해봐요', 0);
    return;
  }

  markDone(cue);
  const repeatLeft = repeatMax > 0 && state.repeatCount < repeatMax - 1;

  // 섀도잉/말하기 확인: 매 재생이 끝날 때마다 멈추고 따라 말할 시간 → 반복이 남았으면 같은 문장, 아니면 다음 문장
  if (state.shadow || speakCheckActive()) {
    video.pause();
    startShadowWait(cue, { repeat: repeatLeft });
    return;
  }

  // 반복 남았으면 같은 문장 처음으로
  if (repeatLeft) {
    replayCurrent();
    return;
  }

  // 마지막 문장이면 멈춤
  if (state.idx >= state.cues.length - 1) {
    video.pause();
    return;
  }

  // 🧩 N문장이 찼으면 다음 문장으로 가기 전에 퍼즐
  if (puzzleReady()) {
    const nextIdx = state.idx + 1;
    startPuzzle(() => goTo(nextIdx));
    return;
  }

  // 연속 재생: 다음 문장으로 — 문장별 상태(듣기 먼저·말하기 확인)는 goTo와 똑같이 초기화, 재생은 끊지 않음
  state.idx++;
  resetSentenceState();
  const next = state.cues[state.idx];
  // 문장 사이 간격이 길면 건너뛰기
  if (next.start - video.currentTime > 1.0) video.currentTime = next.start;
  renderSubtitle();
  applySubVisibility();
  updateProgress();
  highlightScript();
  updateChips();
  scheduleSave();
}

/** 같은 문장을 처음부터 다시 (반복 횟수 +1) */
function replayCurrent() {
  const cue = state.cues[state.idx];
  state.repeatCount++;
  updateChips();
  video.currentTime = cue.start;
  if (video.paused || video.ended) safePlay(); // 멈춘 상태(영상 끝/섀도잉 뒤)면 다시 재생
}

// ───────────────────── 섀도잉 대기 ─────────────────────

/**
 * 따라 말하기 대기. 끝나면(또는 탭하면) opts.repeat 이면 같은 문장 다시, 아니면 다음 문장
 */
/** 말하기 확인을 실제로 수행할 상황인지 (설정 켬 + 마이크 가능 + 아직 통과 전) */
function speakCheckActive() {
  return settings.speakCheck && !state.speakUnavailable && !state.speakPassed;
}

function startShadowWait(cue, opts = {}) {
  if (state.shadowTimer || state.speakRun) return; // rAF와 ended가 동시에 호출해도 하나만
  state.shadowNext = opts.repeat ? 'repeat' : 'next';
  setSpeakHide(true); // 따라 말하는 동안은 영어를 가림 (결과가 나오거나 대기가 끝나면 다시 보임)
  if (speakCheckActive()) { startSpeakWait(cue); return; }
  const dur = Math.max(1.5, (cue.end - cue.start) * settings.shadowFactor + 0.5) * 1000;
  const overlay = $('shadow-overlay');
  const fill = $('shadow-ring-fill');
  overlay.hidden = false;
  overlay.classList.remove('speaking');
  $('shadow-msg').textContent = '🗣 따라 말해보세요!';
  $('shadow-sub').textContent = '';
  fill.style.width = '100%';
  const started = performance.now();

  const anim = () => {
    const ratio = Math.max(0, 1 - (performance.now() - started) / dur);
    fill.style.width = `${ratio * 100}%`;
    state.shadowRaf = requestAnimationFrame(anim);
  };
  state.shadowRaf = requestAnimationFrame(anim);

  state.shadowTimer = setTimeout(afterShadowWait, dur);
}

/** 따라 말하기가 끝난 뒤: 반복이면 같은 문장, 아니면 다음 문장 */
function afterShadowWait() {
  const next = state.shadowNext;
  cancelShadowWait();
  if (next === 'repeat') { replayCurrent(); return; }
  if (state.idx >= state.cues.length - 1) return; // 마지막 문장
  goTo(state.idx + 1);
}

function cancelShadowWait() {
  if (state.shadowTimer) clearTimeout(state.shadowTimer);
  if (state.shadowRaf) cancelAnimationFrame(state.shadowRaf);
  state.shadowTimer = null;
  state.shadowRaf = null;
  if (state.speakRun) { const r = state.speakRun; state.speakRun = null; r.cancelled = true; r.cancel(); }
  const overlay = $('shadow-overlay');
  overlay.hidden = true;
  overlay.classList.remove('speaking');
  setSpeakHide(false);
}

/**
 * 따라 말하기 대기 중 영어 숨김 켜기/끄기 (설정이 꺼져 있으면 항상 보임).
 * 켤 때의 단계는 이 문장에서 못 한 횟수로: 처음엔 전부 숨김 → 1번 못 하면 절반 힌트 → 2번 못 하면 전부 보여줌
 */
function setSpeakHide(on) {
  let level = 'none';
  if (on && settings.hideEnWhileSpeaking) level = state.speakFails === 0 ? 'full' : state.speakFails === 1 ? 'partial' : 'none';
  if (state.speakHideEn === level) return;
  state.speakHideEn = level;
  applySubVisibility();
}

function skipShadowWait() {
  if (state.speakRun) { state.speakRun.stop(); return; } // 탭 = "다 말했어요" → 바로 판정
  if (!state.shadowTimer) return;
  afterShadowWait();
}

// ───────────────────── 말하기 확인 (마이크) ─────────────────────

/** 따라 말하기 시간에 마이크로 듣고 판정. 통과하면 다음(또는 반복), 미달이면 원문 다시 듣고 재시도 (3번 미달 시 통과) */
function startSpeakWait(cue) {
  const overlay = $('shadow-overlay');
  const fill = $('shadow-ring-fill');
  const msg = $('shadow-msg');
  const sub = $('shadow-sub');
  overlay.hidden = false;
  overlay.classList.add('speaking');
  msg.textContent = '🎤 따라 말해보세요!';
  // 못 한 횟수에 따라 힌트 단계 안내 (영어 숨김 설정이 켜져 있을 때: 절반 힌트 → 전부 보임)
  if (state.speakFails === 0) sub.textContent = '';
  else if (settings.hideEnWhileSpeaking && state.speakFails === 1) sub.textContent = `다시 한번! 빈칸은 기억해서 말해봐요 (${state.speakFails + 1}/3)`;
  else if (settings.hideEnWhileSpeaking && state.speakFails === 2) sub.textContent = `다시 한번! 이번엔 영어를 보면서 (${state.speakFails + 1}/3)`;
  else sub.textContent = `다시 한번! (${state.speakFails + 1}/3)`;
  fill.style.width = '0%';

  const run = runSpeakCheck({
    target: cue.en,
    durationSec: cue.end - cue.start,
    onLevel: (level, spokenMs) => {
      fill.style.width = `${Math.round(level * 100)}%`;
      if (spokenMs > 300 && !sub.textContent.startsWith('🗣')) sub.textContent = '🗣 듣고 있어요…';
    },
    onInterim: (text) => { sub.textContent = `🗣 ${text}`; },
  });
  state.speakRun = run;
  run.promise.then((result) => {
    if (run.cancelled || state.speakRun !== run) return; // 문장 이동 등으로 취소됨
    state.speakRun = null;
    overlay.classList.remove('speaking');
    onSpeakResult(cue, result);
  });
}

function onSpeakResult(cue, result) {
  const msg = $('shadow-msg');
  const sub = $('shadow-sub');
  const fill = $('shadow-ring-fill');
  fill.style.width = '100%';
  setSpeakHide(false); // 결과를 볼 때는 영어를 다시 보여줌 (들린 말과 비교)

  if (result.method === 'none') {
    state.speakUnavailable = true;
    state.speakPassed = true;
    showPlayerMessage('🎤 마이크를 쓸 수 없어 말하기 확인 없이 진행해요', 4000);
    afterShadowWait();
    return;
  }

  if (result.passed) {
    state.speakPassed = true;
    track.speak(cue, { passed: true, skipped: false, score: result.score });
    const star = !!(result.score && result.score.ratio >= track.MASTER_RATIO);
    if (star) markStar();
    awardXp(star ? XP.speakStar : XP.speak);
    if (result.method === 'speech' && result.score) {
      msg.textContent = result.score.ratio >= 0.8 ? '🌟 완벽해요!' : '🎯 잘했어요!';
      sub.textContent = `${result.score.matched}/${result.score.total} 단어 맞음: "${result.transcript}"`;
    } else {
      msg.textContent = '👍 잘했어요!';
      sub.textContent = '';
    }
    state.shadowTimer = setTimeout(afterShadowWait, 1400);
    return;
  }

  state.speakFails++;
  if (state.speakFails >= 3) {
    state.speakPassed = true;
    track.speak(cue, { passed: true, skipped: true, score: result.score });
    msg.textContent = '👍 괜찮아요, 넘어갈게요';
    sub.textContent = result.transcript ? `들린 말: "${result.transcript}"` : '';
    state.shadowTimer = setTimeout(afterShadowWait, 1400);
    return;
  }
  track.speak(cue, { passed: false, skipped: false, score: result.score });
  msg.textContent = `🔁 다시 한번! (${state.speakFails}/3)`;
  sub.textContent = result.method === 'speech'
    ? `들린 말: "${result.transcript}" — 잘 듣고 따라 해봐요`
    : '조금 더 크게, 길게 말해봐요';
  // 잠시 보여준 뒤 원문 다시 들려주기 → 끝나면 다시 말하기 확인
  state.shadowTimer = setTimeout(() => {
    state.shadowTimer = null;
    const ov = $('shadow-overlay');
    ov.hidden = true;
    ov.classList.remove('speaking');
    video.currentTime = cue.start;
    safePlay();
  }, 1600);
}

// ───────────────────── 자막 렌더링 ─────────────────────

function renderSubtitle() {
  const cue = state.cues[state.idx];
  const enEl = $('sub-en');
  const koEl = $('sub-ko');
  if (!cue) { enEl.textContent = ''; koEl.textContent = ''; return; }

  // 영어: 단어별 span (하이라이트용)
  state.wordTimes = wordTimings(cue); // 노래방 태그가 있으면 실제 단어 시간, 없으면 글자 수 비례 추정
  enEl.innerHTML = '';
  state.wordSpans = state.wordTimes.map((w, i) => {
    const span = document.createElement('span');
    span.className = 'w';
    span.textContent = w.word;
    enEl.appendChild(span);
    if (i < state.wordTimes.length - 1) enEl.appendChild(document.createTextNode(' '));
    return span;
  });
  state.lastWordIdx = -1;
  koEl.textContent = cue.ko || '';
}

function updateWordHighlight(t) {
  const times = state.wordTimes;
  if (times.length === 0) return;
  let cur = -1;
  for (let i = 0; i < times.length; i++) {
    if (t >= times[i].start) cur = i; else break;
  }
  if (cur === state.lastWordIdx) return;
  state.lastWordIdx = cur;
  state.wordSpans.forEach((span, i) => {
    span.classList.toggle('on', i === cur);
    span.classList.toggle('done', i < cur);
  });
}

function toggleSub(which) {
  if (which === 'en') {
    if (!state.enRevealed) { // 듣기 먼저 진행 중에는 열 수 없음
      showPlayerMessage(`👂 ${settings.listenFirst}번 듣고 나면 영어가 보여요 (지금 ${state.listenCount}번)`);
      return;
    }
    state.showEn = !state.showEn;
  } else {
    state.showKo = !state.showKo;
  }
  applySubVisibility();
}

function applySubVisibility() {
  const enOn = state.showEn && state.enRevealed;
  $('sub-en').hidden = !enOn;
  const hide = state.speakHideEn;
  $('sub-en').classList.toggle('speak-hide', hide === 'full'); // 자리는 남기고 글자만 가림 (레이아웃 안 튀게)
  $('sub-en').classList.toggle('speak-hide-partial', hide === 'partial');
  state.wordSpans.forEach((span, i) => span.classList.toggle('masked', hide === 'partial' && i % 2 === 1)); // 절반 힌트: 홀수 번째 단어만 가림
  $('sub-ko').hidden = !state.showKo;
  const enBtn = $('btn-toggle-en');
  enBtn.classList.toggle('is-on', state.showEn && state.enRevealed);
  enBtn.dataset.state = state.enRevealed ? 'off' : 'on'; // 숨김 진행 중이면 주황색
  enBtn.textContent = state.enRevealed ? 'EN' : `👂 ${state.listenCount}/${settings.listenFirst}`;
  $('btn-toggle-ko').classList.toggle('is-on', state.showKo);
  // 전체 대사 목록에도 EN/KO 토글 반영 (듣기 먼저 모드에서는 아직 안 들은 문장의 영어를 가림)
  const list = $('script-list');
  list.classList.toggle('hide-en', !state.showEn);
  list.classList.toggle('hide-ko', !state.showKo);
  list.classList.toggle('listen-first', settings.listenFirst > 0);
  list.classList.toggle('speak-hide', hide !== 'none'); // 목록의 현재 문장 영어도 가림 (절반 힌트 때도 목록은 통째로)
  renderVocab();
}

/** 듣기 먼저: 현재 문장이 공개되면 목록에서도 영어를 보여줌 (지나간 문장은 계속 보임) */
function markScriptRevealed() {
  const cur = $('script-list').querySelector(`.script-item[data-idx="${state.idx}"]`);
  if (cur) cur.classList.add('revealed');
}

function updateProgress() {
  const n = state.cues.length;
  $('cue-counter').textContent = `${state.idx + 1} / ${n}`;
  $('progress-fill').style.width = n ? `${((state.idx + 1) / n) * 100}%` : '0%';
}

// ───────────────────── 전체 대사 목록 ─────────────────────

function renderScriptList() {
  const ol = $('script-list');
  ol.innerHTML = '';
  state.cues.forEach((cue, i) => {
    const li = document.createElement('li');
    li.className = 'script-item' + (track.isMastered(cue) ? ' star' : '');
    li.dataset.idx = i;
    const en = document.createElement('div');
    en.className = 'en';
    en.textContent = cue.en;
    li.appendChild(en);
    if (cue.ko) {
      const ko = document.createElement('div');
      ko.className = 'ko';
      ko.textContent = cue.ko;
      li.appendChild(ko);
    }
    li.addEventListener('click', () => goTo(i));
    ol.appendChild(li);
  });
}

function highlightScript() {
  const ol = $('script-list');
  const prev = ol.querySelector('.script-item.active');
  if (prev) prev.classList.remove('active');
  const cur = ol.querySelector(`.script-item[data-idx="${state.idx}"]`);
  if (cur) {
    cur.classList.add('active');
    if (state.enRevealed) cur.classList.add('revealed');
    // scrollIntoView는 페이지 전체를 스크롤시켜 화면이 튀므로 목록 컨테이너만 스크롤
    const top = cur.offsetTop; // .script-list이 position:relative 라서 목록 기준 좌표
    const bottom = top + cur.offsetHeight;
    if (top < ol.scrollTop || bottom > ol.scrollTop + ol.clientHeight) {
      ol.scrollTo({ top: top - ol.clientHeight / 2 + cur.offsetHeight / 2, behavior: 'smooth' });
    }
  }
}

// ───────────────────── 반복/속도/섀도잉 버튼 ─────────────────────

function cycleRepeat() {
  state.repeatIdx = (state.repeatIdx + 1) % REPEATS.length;
  state.repeatCount = 0;
  updateChips();
  savePrefs();
}

function cycleSpeed() {
  state.speedIdx = (state.speedIdx + 1) % SPEEDS.length;
  video.playbackRate = SPEEDS[state.speedIdx];
  updateChips();
  savePrefs();
}

function toggleShadow() {
  state.shadow = !state.shadow;
  if (!state.shadow) cancelShadowWait();
  updateChips();
  savePrefs();
}

function updateChips() {
  const r = REPEATS[state.repeatIdx];
  const repeatBtn = $('btn-repeat');
  repeatBtn.dataset.state = r > 0 ? 'on' : 'off';
  if (r === 0) $('repeat-label').textContent = '끔';
  else if (r === Infinity) $('repeat-label').textContent = '∞';
  else $('repeat-label').textContent = `${state.repeatCount + 1}/${r}`;

  const sp = SPEEDS[state.speedIdx];
  $('speed-label').textContent = `${sp === 1 ? '1.0' : String(sp)}x`;
  $('btn-speed').firstChild.textContent = sp < 1 ? '🐢 ' : sp > 1 ? '🐇 ' : '🚶 ';

  $('btn-shadow').dataset.state = state.shadow ? 'on' : 'off';
}

// ───────────────────── 키보드 (PC 테스트용) ─────────────────────

function onKeyDown(e) {
  if ($('view-player').hidden) return;
  if (state.puzzleCue || state.catchOpen) return; // 퍼즐·잡기 화면 중에는 플레이어 단축키 무시
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  switch (e.key) {
    case ' ': e.preventDefault(); onPlayButton(); break;
    case 'ArrowLeft': e.preventDefault(); step(-1); break;
    case 'ArrowRight': e.preventDefault(); step(1); break;
    case 'r': case 'R': cycleRepeat(); break;
    case 's': case 'S': cycleSpeed(); break;
    case 'd': case 'D': toggleShadow(); break;
    case 'Escape': closePlayer(); break;
    default: break;
  }
}

// ───────────────────── 진행 저장 / 화면 꺼짐 방지 ─────────────────────

function scheduleSave(immediate = false) {
  if (!state.item || state.idx < 0) return;
  clearTimeout(state.saveTimer);
  const doSave = () => updateItem(state.item.id, { lastCue: state.idx }).catch(() => {});
  if (immediate) doSave();
  else state.saveTimer = setTimeout(doSave, 1500);
}

async function acquireWakeLock() {
  if (!('wakeLock' in navigator) || state.wakeLock || state.wakeLockPending) return;
  state.wakeLockPending = true;
  try {
    const lock = await navigator.wakeLock.request('screen');
    // 요청이 끝나기 전에 플레이어가 닫히거나 정지됐으면 바로 해제
    if (!state.open || video.paused) { lock.release().catch(() => {}); return; }
    state.wakeLock = lock;
    lock.addEventListener('release', () => { if (state.wakeLock === lock) state.wakeLock = null; });
  } catch { /* 지원 안 하거나 거부 */ } finally {
    state.wakeLockPending = false;
  }
}

function releaseWakeLock() {
  if (state.wakeLock) { state.wakeLock.release().catch(() => {}); state.wakeLock = null; }
}

// ───────────────────── 설정 ─────────────────────

function loadSettings() {
  const defaults = { mergeSentences: true, shadowFactor: 1.5, listenFirst: 3, speakCheck: true, hideEnWhileSpeaking: true, dailyGoal: 20, puzzleEvery: 10 };
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem('shincoach.settings') || '{}') };
  } catch {
    return defaults;
  }
}

function saveSettings() {
  try { localStorage.setItem('shincoach.settings', JSON.stringify(settings)); } catch { /* 무시 */ }
}

function initSettingsDialog() {
  $('set-merge').checked = settings.mergeSentences;
  $('set-shadow-factor').value = String(settings.shadowFactor);
  $('set-listen-first').value = String(settings.listenFirst);
  $('set-goal').value = String(settings.dailyGoal);
  $('set-puzzle').value = String(settings.puzzleEvery);
  $('set-speak').checked = settings.speakCheck;
  $('set-hide-en').checked = settings.hideEnWhileSpeaking;
  $('set-close').addEventListener('click', () => $('dlg-settings').close());
  $('set-puzzle-try').addEventListener('click', () => { $('dlg-settings').close(); startPuzzleNow(); });
  $('set-catch-try').addEventListener('click', () => { $('dlg-settings').close(); startCatchPractice(); });
  $('form-settings').addEventListener('submit', (e) => {
    e.preventDefault();
    const mergeChanged = settings.mergeSentences !== $('set-merge').checked;
    settings.mergeSentences = $('set-merge').checked;
    settings.shadowFactor = Number($('set-shadow-factor').value);
    settings.listenFirst = Number($('set-listen-first').value);
    settings.dailyGoal = Number($('set-goal').value);
    updateGoalChip();
    settings.puzzleEvery = Number($('set-puzzle').value);
    if (settings.puzzleEvery === 0) state.puzzlePool = [];
    settings.speakCheck = $('set-speak').checked;
    settings.hideEnWhileSpeaking = $('set-hide-en').checked;
    if (!settings.hideEnWhileSpeaking) state.speakHideEn = 'none'; // 끄면 대기 중이던 숨김도 해제
    if (settings.listenFirst === 0) state.enRevealed = true;
    applySubVisibility();
    updateChips();
    saveSettings();
    $('dlg-settings').close();
    if (mergeChanged && state.item) {
      // 문장 합치기 설정이 바뀌면 큐 다시 구성
      const t = video.currentTime;
      state.cues = buildCues(state.item);
      renderScriptList();
      const j = findCueIndex(state.cues, t);
      goTo(j >= 0 ? j : 0, { play: false });
    }
  });
}

// ───────────────────── 설정 비밀번호 ─────────────────────

// 비밀번호는 평문 대신 SHA-256 해시로 보관 (코드가 공개 저장소에 있으므로)
const SETTINGS_PIN_HASH = '4030c42b313a82b953d14f04a85ff9dd9739e49a97d90631b7fb3029cca1d6e1';

async function sha256Hex(text) {
  if (window.crypto && window.crypto.subtle && window.TextEncoder) {
    const buf = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return null; // 구형 브라우저: 해시 불가
}

async function checkPin(pin) {
  const h = await sha256Hex(pin);
  if (h !== null) return h === SETTINGS_PIN_HASH;
  // 해시를 못 만드는 환경에서는 간단한 변형 비교 (평문 노출 최소화)
  return pin.split('').reverse().join('') === '5170';
}

let pinCallback = null;

/** 부모 비밀번호 확인 후 onOk 실행 (설정·학습 기록 공용) */
export function requirePin(onOk) {
  pinCallback = onOk;
  const dlg = $('dlg-pin');
  const input = $('pin-input');
  const err = $('pin-error');
  input.value = '';
  err.textContent = '';
  dlg.showModal();
  setTimeout(() => input.focus(), 50);
}

function openSettings() {
  requirePin(() => { renderDiag(); $('dlg-settings').showModal(); });
}

function initPinDialog() {
  $('pin-cancel').addEventListener('click', () => $('dlg-pin').close());
  $('form-pin').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = $('pin-input');
    const ok = await checkPin(input.value.trim());
    if (!ok) {
      $('pin-error').textContent = '비밀번호가 틀렸어요';
      input.value = '';
      input.focus();
      return;
    }
    $('dlg-pin').close();
    const cb = pinCallback;
    pinCallback = null;
    if (cb) cb();
  });
}
