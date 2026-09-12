// 플레이어 화면: 문장 단위 이동 / 반복 / 속도 / 이중 자막 / 섀도잉 / 단어 하이라이트 / 이어보기
import { getItem, getVideoBlob, updateItem } from './db.js';
import {
  parseSubtitle, mergeSubtitles, mergeIntoSentences,
  estimateWordTimings, findCueIndex,
} from './srt.js';
import { loadVocab } from './vocab.js';
import { initDiag, renderDiag } from './diag.js';

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
  initVocabPanel();
  initDiag();
}

// ───────────────────── 단어 패널 ─────────────────────

function initVocabPanel() {
  const panel = $('vocab-panel');
  try { panel.open = localStorage.getItem('shincoach.vocabOpen') === '1'; } catch { /* 무시 */ }
  panel.addEventListener('toggle', () => {
    try { localStorage.setItem('shincoach.vocabOpen', panel.open ? '1' : '0'); } catch { /* 무시 */ }
  });
  loadVocab().then((v) => { state.vocab = v; renderVocab(); });
}

/** 현재 문장의 모를 만한 단어·표현을 패널에 표시 (듣기 먼저 중에는 영어 공개 전까지 숨김) */
function renderVocab() {
  const panel = $('vocab-panel');
  const cue = state.cues[state.idx];
  if (!state.vocab || !cue || !state.enRevealed) { panel.hidden = true; return; }
  const items = state.vocab.lookup(cue.en);
  if (items.length === 0) { panel.hidden = true; return; }
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
  const wasShadowWaiting = !!state.shadowTimer;
  cancelShadowWait();
  if (!video.paused) video.pause();
  if (wasShadowWaiting) showPlayerMessage('▶ 를 눌러 이어서 연습해요', 0);
  releaseWakeLock();
  scheduleSave(true);
}

// ───────────────────── 열기/닫기 ─────────────────────

export async function openPlayer(id) {
  const item = await getItem(id);
  if (!item) return;
  const blob = await getVideoBlob(id);
  if (!blob) { alert('영상 파일을 찾을 수 없어요.'); return; }

  closeMedia();
  state.open = true;
  state.item = item;
  state.cues = buildCues(item);
  state.idx = -1;
  state.repeatCount = 0;
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
    const startIdx = Math.min(Math.max(item.lastCue || 0, 0), state.cues.length - 1);
    goTo(startIdx, { play: false });
  };
  video.addEventListener('loadedmetadata', state.onMeta, { once: true });
}

function closePlayer() {
  scheduleSave(true);
  closeMedia();
  showView('library');
}

function closeMedia() {
  state.open = false;
  cancelShadowWait();
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
function goTo(i, { play = true } = {}) {
  if (state.cues.length === 0) return;
  i = Math.max(0, Math.min(i, state.cues.length - 1));
  cancelShadowWait();
  state.idx = i;
  state.repeatCount = 0;
  state.listenCount = 0;
  state.enRevealed = settings.listenFirst === 0; // 듣기 먼저 모드면 새 문장은 영어 숨김으로 시작
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
  if (state.shadowTimer) { skipShadowWait(); return; }
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

  // 듣기 먼저: 영어를 숨긴 채 N번 들을 때까지 같은 문장을 반복, N번째가 끝나면 영어 공개
  if (settings.listenFirst > 0 && !state.enRevealed) {
    state.listenCount++;
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
    updateChips();
    if (state.shadow) { // 섀도잉이면 바로 따라 말하기 (영어 보면서) → 반복 설정대로 이어감
      video.pause();
      startShadowWait(cue, { repeat: repeatMax > 0 });
      return;
    }
    video.pause();
    showPlayerMessage('👀 이제 영어를 보면서 따라 말해봐요', 0);
    return;
  }

  const repeatLeft = repeatMax > 0 && state.repeatCount < repeatMax - 1;

  // 섀도잉: 매 재생이 끝날 때마다 멈추고 따라 말할 시간 → 반복이 남았으면 같은 문장, 아니면 다음 문장
  if (state.shadow) {
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

  // 연속 재생: 다음 문장으로 (반복 모드였으면 카운트 초기화)
  state.idx++;
  state.repeatCount = 0;
  const next = state.cues[state.idx];
  // 문장 사이 간격이 길면 건너뛰기
  if (next.start - video.currentTime > 1.0) video.currentTime = next.start;
  renderSubtitle();
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
function startShadowWait(cue, opts = {}) {
  if (state.shadowTimer) return; // rAF와 ended가 동시에 호출해도 타이머는 하나만
  state.shadowNext = opts.repeat ? 'repeat' : 'next';
  const dur = Math.max(1.5, (cue.end - cue.start) * settings.shadowFactor + 0.5) * 1000;
  const overlay = $('shadow-overlay');
  const fill = $('shadow-ring-fill');
  overlay.hidden = false;
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
  $('shadow-overlay').hidden = true;
}

function skipShadowWait() {
  if (!state.shadowTimer) return;
  afterShadowWait();
}

// ───────────────────── 자막 렌더링 ─────────────────────

function renderSubtitle() {
  const cue = state.cues[state.idx];
  const enEl = $('sub-en');
  const koEl = $('sub-ko');
  if (!cue) { enEl.textContent = ''; koEl.textContent = ''; return; }

  // 영어: 단어별 span (하이라이트용)
  state.wordTimes = estimateWordTimings(cue.start, cue.end, cue.en);
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
    li.className = 'script-item';
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
  const defaults = { mergeSentences: true, shadowFactor: 1.5, listenFirst: 3 };
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
  $('set-close').addEventListener('click', () => $('dlg-settings').close());
  $('form-settings').addEventListener('submit', (e) => {
    e.preventDefault();
    const mergeChanged = settings.mergeSentences !== $('set-merge').checked;
    settings.mergeSentences = $('set-merge').checked;
    settings.shadowFactor = Number($('set-shadow-factor').value);
    settings.listenFirst = Number($('set-listen-first').value);
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

function openSettings() {
  renderDiag();
  $('dlg-settings').showModal();
}
