// 플레이어 화면: 문장 단위 이동 / 반복 / 속도 / 이중 자막 / 섀도잉 / 단어 하이라이트 / 이어보기
import { getItem, getVideoBlob, updateItem, listDaily } from './db.js';
import {
  parseSubtitle, mergeSubtitles, mergeIntoSentences,
  wordTimings, findCueIndex,
} from './srt.js';
import { loadVocab } from './vocab.js';
import { initDiag, renderDiag } from './diag.js';
import { runSpeakCheck, prepareMic, releaseMic, resetRecognition, wordResults } from './speak.js';
import { initPuzzle, openPuzzle, closePuzzle, pickPuzzle } from './puzzle.js';
import { loadCharacters, downloadCharacters, pickCharacters, isUnlocked, unlockCountAt, ROSTER } from './pokemon.js';
import { initProfile, getLevelInfo, gainXp, catchAttempt, previewAttempt, puzzleXp, XP, streakBefore, streakBonus, STREAK_MIN_DONE, flushProfile, coins, gainCoins, addItem, getLook, getPartner, hpOf, isTired, changeHp, getProfileSnapshot, lossesOf, battleWin, battleLoss, consumeItem, inventory } from './xp.js';
import { COIN, HP, POTION, GOLDEN, puzzleCoins, streakCoins, lootBox, itemById, setFigure } from './items.js';
import { initBattle, openBattle, abortBattle, BATTLE, shouldBattle, pickOpponent, eligibleMine } from './battle.js';
import { openMon } from './shop.js';
import { initCatch, openCatch, closeCatch, burstConfetti } from './catch.js';
import { initReview, openReview, abortReview, isReviewOpen, pickReviews, reviewSummary, roundReward, REWARD as REVIEW_REWARD, DEFAULT_COUNT as REVIEW_COUNT } from './review.js';
import { sfx, unlock, setSfxEnabled, setVibrateEnabled } from './sfx.js';
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
  charDownloading: false, // 캐릭터 받는 중 (자동·수동 중복 실행 방지)
  catchOpen: false,   // 🎯 잡기 화면이 열려 있음 (키보드 무시)
  streakBase: 0,      // 🔥 어제까지의 연속 학습일 (오늘 5문장 채우면 +1)
  streakToday: false, // 오늘 5문장을 채워 스트릭에 들어갔는지
  streakDate: '',     // 위 두 값의 기준 날짜 (자정을 넘기면 다시 계산)
  journeyCelebrated: false, // 🏁 이번에 연 콘텐츠에서 도착 연출을 이미 했는지 (세션당 한 번)
  battlePending: null, // ⚔️ 다음 문장으로 넘어갈 때 걸어올 트레이너의 포켓몬 { id, ko, url } (markDone에서 확률로 정해짐)
  battleOpen: false,   // ⚔️ 배틀 화면이 열려 있음 (키보드 무시)
  battleLastCue: null, // 배틀에서 방금 따라 말한 문장 (연달아 같은 문장 안 나오게)
  sentenceSpeakStop: null, // ⚔️ 배틀·🔁 복습에서 진행 중인 듣기·말하기를 밖에서 중단하는 함수 (화면 꺼짐 → 그 턴 무효)
  reviewOpen: false,   // 🔁 복습 화면이 열려 있음 (키보드 무시)
  practiceOpen: false, // ⚙ 연습 중 (퍼즐·복습·배틀·잡기) — 학습 시간·기록을 쌓지 않음
  wordPlayUntil: 0,    // 🎯 단어 하나만 다시 듣는 중이면 그 끝 시각(초) — 여기까지 재생하고 멈춤
  resultDelay: null,   // 결과 화면의 자동 진행 타이머를 다시 세는 함수 (단어를 누를 때마다). 반복 신호인 state.shadowNext와는 다른 것
  reviewDone: false,   // 이번에 연 콘텐츠에서 복습을 이미 제안했는지 (한 번 열 때 한 번만)
  parentMode: false,  // 👨‍👩‍👦 부모 모드(그냥 보기): 학습 장치(반복·듣기 먼저·따라 말하기·퍼즐)와 기록·XP 없이 끝까지 이어서 재생. 저장하지 않음 → 앱을 다시 열면 꺼짐
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

  video.addEventListener('play', () => { updatePlayIcon(); hidePlayerMessage(); startLoop(); acquireWakeLock(); $('journey').classList.add('playing'); });
  video.addEventListener('pause', () => { updatePlayIcon(); stopLoop(); releaseWakeLock(); scheduleSave(); $('journey').classList.remove('playing'); });
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
  initBattle();
  initReview();
  initProfile().then(() => { updateLevelChip(); updatePartnerChip(); }).catch(() => {});
  $('level-chip').addEventListener('click', () => { closePlayer(); import('./pokedex.js').then((m) => m.openPokedex()); });
  $('coin-chip').addEventListener('click', () => { closePlayer(); import('./pokedex.js').then((m) => m.openPokedex({ shop: true })); });
  $('parent-chip').addEventListener('click', () => setParentMode(false)); // 끄는 건 비밀번호 없이 (학습 모드로 돌아가는 것이라 안전)
  $('partner-chip').addEventListener('click', openPartner);
  document.addEventListener('shincoach:profilechange', updatePartnerChip); // 상세 모달에서 물약·파트너 변경 → 칩 갱신
  // 학습 시간: 재생 중이거나 따라 말하는 중·퍼즐 푸는 중이면 1초씩 누적 (부모 모드는 학습이 아니므로 제외 → 세션도 저장되지 않음)
  setInterval(() => {
    if (!state.open || state.parentMode) return;
    if (state.practiceOpen) return; // ⚙ 연습(퍼즐·복습·배틀·잡기)은 기록하지 않는다 (Codex #9)
    // 퍼즐·복습·배틀이 들려주는 문장은 화면의 현재 문장이 아니므로 그 문장에 시간을 쌓는다
    const cue = state.puzzleCue || state.cues[state.idx];
    if (cue && (!video.paused || state.speakRun || state.puzzleCue)) track.tick(cue, 1);
  }, 1000);
}

// ───────────────────── 👨‍👩‍👦 부모 모드 (그냥 보기) ─────────────────────

/**
 * 부모 모드 켜기/끄기. 켜면 진행 중인 따라 말하기·말하기 확인을 끝내고 영어를 바로 보여줌.
 * 끌 때 현재 문장은 이미 본 것이므로 공개 상태로 두고, 다음 문장부터 학습 장치가 다시 걸림
 */
function setParentMode(on) {
  on = !!on;
  if (state.parentMode === on) { updateChips(); return; }
  state.parentMode = on;
  cancelShadowWait();
  hidePlayerMessage();
  if (on) {
    state.enRevealed = true;
    state.speakHideEn = 'none';
    if (state.idx >= 0) markScriptRevealed();
  }
  applySubVisibility();
  updateChips();
  if (state.open) showPlayerMessage(on ? '👀 그냥 보기: 자막 보면서 끝까지 이어서 재생돼요' : '🎓 다시 학습 모드예요', 3500);
}

// ───────────────────── ❤️ 파트너 HP ─────────────────────

/** 파트너 포켓몬 { id, ko, url } (없으면 null) */
function partnerInfo() {
  const id = getPartner();
  if (!id) return null;
  const r = ROSTER.find((m) => m.id === id);
  const c = state.characters.find((x) => x.id === id);
  return { id, ko: r ? r.ko : '파트너', url: c ? c.url : '' };
}

/** 상단 파트너 칩: 얼굴 + ❤️ HP. HP 기능이 꺼져 있거나 파트너가 없거나 부모 모드면 숨김 */
function updatePartnerChip() {
  updateJourneyWalker(); // 길 위의 캐릭터도 파트너·꾸밈 변화를 따라감 (HP 설정과 무관)
  const chip = $('partner-chip');
  const p = partnerInfo();
  if (!settings.hp || !p || state.parentMode) { chip.hidden = true; return; }
  const hp = hpOf(p.id);
  setFigure(chip.querySelector('.mon-figure'), p.url, getLook(p.id));
  $('partner-hp').textContent = hp === 0 ? '😴 0' : `❤️ ${hp}`;
  chip.classList.toggle('tired', hp === 0);
  chip.hidden = false;
}

function openPartner() {
  const p = partnerInfo();
  if (!p) return;
  if (!video.paused) video.pause();
  openMon(p);
}

/**
 * HP 깎기 — "틀림"이 아니라 "대충 넘김·안 함"에만 (정답 공개·말하기 넘김·하루 빠짐).
 * 0이 되면 😴 쉬는 중: 퍼즐·잡기에서 빠지고 물약을 먹여야 돌아옴 (잃거나 도망가지 않음)
 */
function hpPenalty(amount, why) {
  if (!settings.hp || state.parentMode) return null;
  const p = partnerInfo();
  if (!p || hpOf(p.id) === 0) return null;
  const r = changeHp(p.id, amount);
  updatePartnerChip();
  const chip = $('partner-chip');
  chip.classList.remove('hurt');
  void chip.offsetWidth;
  chip.classList.add('hurt');
  sfx.wrong();
  if (r.to === 0) showPlayerMessage(`😴 ${p.ko}${josaIga(p.ko)} 지쳤어요 (${why}). 🧪 물약을 먹여 주세요`, 6000);
  else showPlayerMessage(`😢 ${p.ko} HP ${amount} (${why}) — ❤️ ${r.to}`, 4500);
  return r;
}

/** HP 회복 (오늘 목표 달성 등). 쉬는 중이던 파트너도 깨어남 */
function hpHeal(amount) {
  if (!settings.hp || state.parentMode) return null;
  const p = partnerInfo();
  if (!p) return null;
  const r = changeHp(p.id, amount);
  updatePartnerChip();
  if (r.to !== r.from) pulseChip('partner-chip');
  return r;
}

/** 어제 학습을 안 했으면(5문장 미만) 오늘 처음 열 때 한 번 HP 감소. 앱을 처음 쓰는 아이(과거 학습일이 없음)는 제외 */
function checkMissedDay(dailyList, today) {
  if (!settings.hp || state.parentMode || !getPartner() || track.hpMissedApplied()) return;
  const yesterday = track.todayKey(new Date(Date.now() - 86400000));
  const learned = (d) => !!d && (d.doneKeys || []).length >= STREAK_MIN_DONE;
  const hadBefore = dailyList.some((d) => d.date < yesterday && learned(d));
  const yRec = dailyList.find((d) => d.date === yesterday);
  if (!hadBefore || learned(yRec)) return;
  track.markHpMissed();
  hpPenalty(HP.missedDay, '어제 학습을 안 했어요');
}

/** 받침에 따라 이/가 */
function josaIga(word) {
  const code = String(word || '').slice(-1).charCodeAt(0) - 0xAC00;
  if (code < 0 || code > 11171) return '가';
  return code % 28 === 0 ? '가' : '이';
}

// ───────────────────── 🧩 문장 퍼즐 ─────────────────────

/** N문장이 차서 다음 문장으로 넘어가기 전에 퍼즐을 낼 차례인지 */
function puzzleReady() {
  if (settings.puzzleEvery <= 0 || state.parentMode) return false;
  // 오늘 첫 퍼즐은 5문장(하루 최소 학습량)에 한 번 → 조금만 해도 잡기 기회가 생김. 그 뒤로는 설정 간격대로
  const need = track.todayPuzzles() === 0 ? Math.min(STREAK_MIN_DONE, settings.puzzleEvery) : settings.puzzleEvery;
  return state.puzzlePool.length >= need;
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
    const c = awardCoins(puzzleCoins(result));
    if (!result.solved) hpPenalty(HP.revealed, '퍼즐 정답을 봤어요');
    // 정답이면 퍼즐에 나온 포켓몬 중 한 마리에게 몬스터볼 던지기 (캐릭터가 없으면 그냥 이어감)
    if (result.solved && result.characters && result.characters.length) {
      state.catchOpen = true;
      openCatch({
        candidates: result.characters, xpGain: g.gained, coinGain: c, levelInfo: g.info, levelUp: g.leveledUp ? g.to : 0,
        goldenCount: inventory()[GOLDEN.id] || 0,
        attempt: (id, opts) => catchAttempt(id, Math.random, opts),
        onDone: () => { state.catchOpen = false; updateLevelChip(); updatePartnerChip(); continueFn(); },
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
  chip.hidden = state.parentMode; // 부모 모드에서는 학습 칩 숨김 (안 쌓이니까)
  const cc = $('coin-chip');
  cc.textContent = `💰 ${coins()}`;
  cc.hidden = state.parentMode;
}

function pulseChip(id) {
  const chip = $(id);
  chip.classList.remove('pulse');
  void chip.offsetWidth;
  chip.classList.add('pulse');
}

/** XP 획득 + 칩 갱신 + 레벨업 알림(🎁 선물 상자로 아이템 하나) */
function awardXp(amount) {
  const g = gainXp(amount);
  track.flush(); // 완료·목표 기록을 XP와 같은 시점에 저장 (강제 종료돼도 중복 지급 안 되게)
  updateLevelChip();
  if (g.leveledUp) {
    sfx.levelUp();
    const fresh = unlockCountAt(g.to);
    const gift = itemById(lootBox());
    if (gift) addItem(gift.id);
    const giftMsg = gift ? ` 🎁 선물: ${gift.emoji} ${gift.ko}!` : '';
    showPlayerMessage((fresh ? `🎉 레벨 업! Lv.${g.to} — 새 포켓몬 ${fresh}마리가 나타났어요!` : `🎉 레벨 업! Lv.${g.to}`) + giftMsg, 7000);
    pulseChip('level-chip');
  }
  return g;
}

/** 💰 코인 획득 + 칩 갱신. 반환: 얻은 코인 */
function awardCoins(amount) {
  const r = gainCoins(amount);
  if (!r.gained) return 0;
  updateLevelChip();
  pulseChip('coin-chip');
  return r.gained;
}

/** 지금 레벨에서 열려 있는 캐릭터만 (마일스톤 해금, 😴 쉬는 중 제외), 장식·염색 상태 포함 */
function unlockedCharacters() {
  const level = getLevelInfo().level;
  return state.characters.filter((c) => isUnlocked(c.id, level) && !(settings.hp && isTired(c.id))).map((c) => ({ ...c, look: getLook(c.id) }));
}

// ───────────────────── ⚔️ 배틀 ─────────────────────

/** 문장을 제대로 완료한 시점: 아주 가끔 다음 전환 때 배틀이 걸리게 예약 (HP 기능 켬·학습 모드에서만) */
function maybeBattle(todayDone) {
  if (!settings.hp || state.parentMode || state.battlePending) return;
  if (!shouldBattle({ todayDone, todayBattles: track.todayBattles() })) return;
  const opponent = pickBattleOpponent();
  if (!opponent || !myBattleMons().length) return;
  state.battlePending = opponent;
}

/** 상대: 열린 명단 중 아직 못 잡은 포켓몬 (그림이 있는 것만) */
function pickBattleOpponent() {
  const level = getLevelInfo().level;
  const caught = getProfileSnapshot().caught;
  return pickOpponent(state.characters.filter((c) => isUnlocked(c.id, level)), caught);
}

/** 내가 내보낼 수 있는 포켓몬: 잡은 것 중 파트너·😴 제외, 그림·꾸밈·패배 수 포함 */
function myBattleMons(includePartner) {
  const caught = getProfileSnapshot().caught;
  const ids = Object.keys(caught).filter((k) => caught[k] > 0).map(Number);
  const ok = eligibleMine(ids, includePartner ? null : getPartner(), (id) => settings.hp && isTired(id));
  return ok.map((id) => {
    const r = ROSTER.find((m) => m.id === id);
    const c = state.characters.find((x) => x.id === id);
    return { id, ko: r ? r.ko : String(id), url: c ? c.url : '', look: getLook(id), losses: lossesOf(id) };
  });
}

/** 가방의 물약 목록 [{ id, n }] */
function potionList() {
  const inv = inventory();
  return POTION.filter((p) => inv[p.id] > 0).map((p) => ({ id: p.id, n: inv[p.id] }));
}

/** 배틀에서 따라 말할 문장: 모아둔 문장·근처 문장 중 퍼즐 낼 만한 것(3~8단어), 방금 것과 다른 것 */
function battleCue() {
  const near = state.cues.slice(Math.max(0, state.idx - 12), state.idx + 1);
  const pool = [...state.puzzlePool, ...near].filter((c) => c !== state.battleLastCue);
  const cue = pickPuzzle(pool) || pickPuzzle(near) || state.cues[state.idx] || null;
  state.battleLastCue = cue;
  return cue;
}

/**
 * ⚔️ 배틀 턴·🔁 복습 공용: 문장을 들려준 뒤(퍼즐의 🔊 재생 메커니즘) 말하기 확인 → 결과.
 * hooks.register(stop) 로 "다 말했어요"/취소를 받음. stop('cancel')이면 결과 null
 */
function speakSentence(cue, hooks) {
  return new Promise((resolve) => {
    if (!cue) { resolve(null); return; }
    let run = null;
    let done = false;
    const finishWith = (r) => {
      if (done) return;
      done = true;
      state.sentenceSpeakStop = null;
      state.puzzleCue = null; state.puzzlePlaying = false; state.puzzleOnEnd = null;
      if (!video.paused) video.pause();
      resolve(r);
    };
    const stop = (why) => {
      if (why === 'hidden') { if (run) run.cancel(); finishWith({ method: 'interrupted' }); return; } // 화면 꺼짐 → 턴 무효
      if (why === 'cancel') { if (run) run.cancel(); else finishWith(null); return; }
      if (run) run.stop();
      else if (state.puzzlePlaying) { video.pause(); endPuzzlePlayback(); } // 아직 듣는 중이면 건너뛰고 바로 말하기
    };
    state.sentenceSpeakStop = stop;
    hooks.register(stop);
    state.puzzleCue = cue; // onTick이 이 문장 끝에서 재생을 멈추게 (퍼즐과 같은 방식)
    playPuzzleSentence(cue, () => {
      if (done) return;
      if (hooks.onListening) hooks.onListening();
      run = runSpeakCheck({ target: cue.en, durationSec: cue.end - cue.start, onInterim: hooks.onInterim, onLevel: hooks.onLevel });
      run.promise.then(finishWith);
    });
  });
}

/** 배틀 열림/닫힘 표시: 키보드 단축키 차단 + 뒤 화면을 inert (Tab으로 뒤 버튼이 눌리지 않게, Codex #6) */
function setBattleOpen(on) {
  state.battleOpen = on;
  if (!on) state.sentenceSpeakStop = null;
  const view = $('view-player');
  if (view) view.inert = on;
}

/** 배틀 열기 (상대는 state.battlePending). 끝나면 결과 반영 후 continueFn */
function startBattle(continueFn) {
  const opponent = state.battlePending;
  state.battlePending = null;
  if (!opponent) { continueFn(); return; }
  cancelShadowWait();
  hidePlayerMessage();
  if (!video.paused) video.pause();
  track.markBattle(); // 거절해도 오늘 배틀 기회는 쓴 것
  setBattleOpen(true);
  openBattle({
    opponent,
    mine: myBattleMons(false),
    potions: potionList,
    usePotion: (id) => consumeItem(id),
    nextCue: battleCue,
    speak: speakSentence,
    onDone: (r) => {
      setBattleOpen(false);
      state.puzzleCue = null; state.puzzlePlaying = false; state.puzzleOnEnd = null;
      applyBattleResult(r);
      if (state.open) continueFn();
    },
  });
}

/** 배틀 결과 반영: 승 → 상대 획득 + ⚡💰, 패/도중 이탈 → 그 포켓몬 패배 +1 (3번이면 잃음) */
function applyBattleResult(r) {
  if (!r || r.outcome === 'declined') return;
  if (r.outcome === 'win') {
    const w = battleWin(r.opponent.id);
    awardXp(BATTLE.winXp);
    awardCoins(BATTLE.winCoins);
    showPlayerMessage(w.first ? `🎉 ${r.opponent.ko}${josaIga(r.opponent.ko)} 도감에 들어왔어요! ⚡+${BATTLE.winXp} 💰+${BATTLE.winCoins}` : `🎉 ${r.opponent.ko} 한 마리 더! ⚡+${BATTLE.winXp} 💰+${BATTLE.winCoins}`, 5000);
  } else if (r.my) {
    const l = battleLoss(r.my.id, BATTLE.lossesToLose);
    if (l.lost) showPlayerMessage(`😢 ${r.my.ko}${josaIga(r.my.ko)} ${BATTLE.lossesToLose}번 져서 떠났어요…`, 6000);
    else showPlayerMessage(`😢 졌어요. ${r.my.ko} 패배 ${l.losses}/${BATTLE.lossesToLose}`, 4500);
  }
  track.flush();
  updatePartnerChip();
}

// ───────────────────── 🔁 복습 (간격 반복) ─────────────────────

/** 하루에 복습을 제안하는 최대 횟수 (건너뛰어도 계속 묻지 않게) */
const REVIEW_MAX_SKIPS = 2;

/** 문장 기록의 시작 시각으로 지금 화면의 cue 찾기 (문장 합치기 설정이 달라졌으면 없을 수 있음) */
function cueForStart(start) {
  const key = Math.round(start * 10);
  return state.cues.find((c) => Math.round(c.start * 10) === key) || null;
}

/** 이번 회차에 낼 복습 문장 (없으면 빈 배열) */
function reviewItems() {
  const per = settings.reviewCount;
  if (!per) return []; // ⚙에서 끔
  const remain = per - (track.todayReviewSentences() % per); // 중간에 그만뒀으면 남은 만큼만 채우면 완주
  // 지금 자막에 없는 기록을 먼저 걸러낸다 — 나중에 거르면 그런 기록이 상위를 차지했을 때
  // 뒤의 멀쩡한 문장까지 가려서 복습이 아예 안 뜬다 (Codex #7)
  const usable = track.statsList().filter((rec) => cueForStart(rec.start));
  return pickReviews(usable, track.todayKey(), remain)
    .map((rec) => ({ rec, cue: cueForStart(rec.start) }));
}

/** 복습 화면 열림/닫힘: 키보드 단축키 차단 + 뒤 화면 inert */
function setReviewOpen(on) {
  state.reviewOpen = on;
  if (!on) state.sentenceSpeakStop = null;
  const view = $('view-player');
  if (view) view.inert = on;
}

/** 콘텐츠를 열었을 때 복습 제안 (부모 모드 제외, 하루 2번까지) */
function maybeReview() {
  if (state.parentMode || state.reviewDone) return;
  state.reviewDone = true;
  if (track.todayReviewSkips() >= REVIEW_MAX_SKIPS) return;
  const items = reviewItems();
  if (items.length) startReview(items, false);
}

/** 회차 완주 보상: ⚡·💰 + (하루 첫 완주만) 🌟 황금 볼·❤️ 회복 */
function grantReviewRound() {
  const reward = roundReward(track.reviewGoldenTaken());
  track.markReviewRound();
  awardXp(reward.xp);
  awardCoins(reward.coin);
  if (reward.golden) {
    addItem(GOLDEN.id, reward.golden);
    track.markReviewGolden();
  }
  if (reward.hp) hpHeal(reward.hp);
  track.flush();
  return reward;
}

/** 복습 회차 열기 (practice면 기록·보상 없음) */
function startReview(items, practice) {
  cancelShadowWait();
  hidePlayerMessage();
  if (!video.paused) video.pause();
  const p = practice ? null : partnerInfo();
  const summary = reviewSummary(track.statsList(), track.todayKey());
  setReviewOpen(true);
  state.practiceOpen = !!practice;
  openReview({
    items,
    practice,
    reward: roundReward(track.reviewGoldenTaken()),
    partner: p ? { url: p.url, ko: p.ko, look: getLook(p.id) } : null,
    waiting: practice ? 0 : summary.waiting,
    setFigure,
    sfx,
    unlock,
    speak: speakSentence,
    onSentence: (cue, passed) => {
      if (practice) return null;
      const info = track.review(cue, passed);
      if (passed) { awardXp(REVIEW_REWARD.xp); awardCoins(REVIEW_REWARD.coin); }
      return info;
    },
    onFinished: () => (practice ? null : grantReviewRound()),
    onDone: (s) => {
      setReviewOpen(false);
      state.practiceOpen = false;
      state.puzzleCue = null; state.puzzlePlaying = false; state.puzzleOnEnd = null;
      if (!practice && !s.started && !s.done) track.markReviewSkip(); // 시작도 안 하고 닫음
      if (!practice) track.flush();
    },
  });
}

/** ⚙ "지금 복습 해보기": 때가 안 됐어도 최근에 한 문장으로 연습 (기록·보상 없음) */
function startReviewNow() {
  if (state.reviewOpen) return;
  if (!state.open || !state.cues.length) return;
  const items = track.statsList()
    .filter((r) => r.done && cueForStart(r.start)) // 자막에 없는 기록을 먼저 제외 (Codex #7)
    .sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0))
    .slice(0, settings.reviewCount || REVIEW_COUNT)
    .map((rec) => ({ rec, cue: cueForStart(rec.start) }));
  if (!items.length) { showPlayerMessage('🔁 아직 복습할 문장이 없어요 — 문장을 몇 개 끝내면 생겨요', 4000); return; }
  startReview(items, true);
}

/** ⚙ 배틀 연습: 아무 상대와 결과 반영 없이 (파트너도 내보낼 수 있음) */
function startBattlePractice() {
  if (state.battleOpen) return; // 진행 중인 배틀을 연습으로 덮어쓰지 않음 (Codex #6)
  if (!state.characters.length) { showPlayerMessage('🎮 먼저 설정에서 포켓몬 캐릭터를 받아 주세요', 4000); return; }
  if (!state.open || state.idx < 0) { showPlayerMessage('▶ 문장을 하나 연 뒤에 해 보세요 (따라 말할 문장이 필요해요)', 4000); return; }
  const mine = myBattleMons(true);
  if (!mine.length) { showPlayerMessage('🎯 먼저 포켓몬을 한 마리 잡아야 배틀을 해요', 4000); return; }
  const opponent = pickBattleOpponent() || pickCharacters(unlockedCharacters(), 1)[0];
  if (!opponent) return;
  if (!video.paused) video.pause();
  cancelShadowWait();
  setBattleOpen(true);
  state.practiceOpen = true;
  openBattle({
    opponent, mine, potions: potionList, usePotion: () => true, nextCue: battleCue, speak: speakSentence, practice: true,
    onDone: () => { setBattleOpen(false); state.practiceOpen = false; state.puzzleCue = null; state.puzzlePlaying = false; state.puzzleOnEnd = null; },
  });
}

/** ⚙ 잡기 연습: 아무 캐릭터 4마리로 연출만 (기록 안 함) */
function startCatchPractice() {
  if (!state.characters.length) { showPlayerMessage('🎮 먼저 설정에서 포켓몬 캐릭터를 받아 주세요', 4000); return; }
  if (!video.paused) video.pause();
  cancelShadowWait();
  state.catchOpen = true;
  state.practiceOpen = true;
  openCatch({
    candidates: pickCharacters(unlockedCharacters(), 4), levelInfo: getLevelInfo(), practice: true,
    goldenCount: inventory()[GOLDEN.id] || 0,
    attempt: (id, opts) => previewAttempt(id, Math.random, opts),
    onDone: () => { state.catchOpen = false; state.practiceOpen = false; },
  });
}

/** ⚙ "지금 퍼즐 해보기": 현재 문장(안 되면 바로 앞 문장들 중)으로 바로 퍼즐. 기록하지 않고 모아둔 문장도 그대로 둠 */
function startPuzzleNow() {
  if (!state.open || state.idx < 0) return;
  const cue = pickPuzzle([state.cues[state.idx]]) || pickPuzzle(state.cues.slice(Math.max(0, state.idx - 10), state.idx));
  if (!cue) { showPlayerMessage('🧩 이 근처에는 퍼즐로 낼 문장(3~8단어)이 없어요', 4000); return; }
  state.practiceOpen = true;
  showPuzzle(cue, () => { state.practiceOpen = false; });
}

/** 퍼즐 화면 열기 (재생 멈춤·따라 말하기 취소). 끝나면 onDone(result) */
function showPuzzle(cue, onDone) {
  cancelShadowWait();
  hidePlayerMessage();
  if (!video.paused) video.pause();
  state.puzzleCue = cue;
  state.puzzlePlaying = false;
  openPuzzle(cue, {
    characters: unlockedCharacters(),
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
  loadCharacters().then((chars) => { state.characters = chars; updateCharStatus(); updatePartnerChip(); autoDownloadCharacters(); }).catch(() => {});
  $('char-download').addEventListener('click', () => runCharacterDownload(true));
  // 인터넷이 다시 연결되면 부족한 캐릭터를 조용히 받아옴 (명단을 늘려도 부모가 신경 안 쓰게)
  window.addEventListener('online', autoDownloadCharacters);
}

/** 인터넷이 되고 부족한 캐릭터가 있으면 자동으로 받기 (앱 시작·온라인 전환 때 한 번씩 시도) */
function autoDownloadCharacters() {
  if (state.charDownloading || navigator.onLine === false) return;
  if (state.characters.length >= ROSTER.length) return;
  runCharacterDownload(false);
}

function updateCharStatus(text) {
  const el = $('char-status');
  if (text) { el.textContent = text; return; }
  const n = state.characters.length;
  el.textContent = n >= ROSTER.length ? `✅ ${n}마리 준비됨` : n > 0 ? `${n}/${ROSTER.length}마리 (인터넷이 되면 자동으로 받아요)` : `아직 없음 (0/${ROSTER.length}) — 인터넷이 되면 자동으로 받아요`;
  $('char-download').hidden = n >= ROSTER.length;
}

/** 캐릭터 받기 (manual: ⚙ 버튼으로 눌렀는지 — 실패 안내를 보여줄지 결정) */
async function runCharacterDownload(manual) {
  if (state.charDownloading) return;
  state.charDownloading = true;
  const btn = $('char-download');
  btn.disabled = true;
  try {
    const r = await downloadCharacters((done, total, name) => updateCharStatus(`받는 중… ${done}/${total} ${name}`));
    state.characters = await loadCharacters();
    updateCharStatus();
    if (r.fail) {
      if (manual) updateCharStatus(`${r.ok}마리 받음, ${r.fail}마리 실패 — 인터넷 연결을 확인하고 다시 눌러 주세요`);
      else updateCharStatus(`${state.characters.length}/${ROSTER.length}마리 — 인터넷이 되면 나머지를 자동으로 받아요`);
    } else if (r.ok > 0 && state.open) {
      showPlayerMessage(`🎮 새 포켓몬 ${r.ok}마리가 도착했어요!`, 4000);
    }
  } catch (e) {
    if (manual) updateCharStatus(`받지 못했어요 (${e.message || e}) — 인터넷 연결을 확인해 주세요`);
    else updateCharStatus(`${state.characters.length}/${ROSTER.length}마리 — 인터넷이 되면 나머지를 자동으로 받아요`);
  } finally {
    btn.disabled = false;
    state.charDownloading = false;
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
  if (state.parentMode) return; // 그냥 보기는 학습이 아님 → 기록·XP·코인·퍼즐 후보 전부 없음
  const before = track.todayDone();
  track.done(cue);
  const after = track.todayDone();
  if (after !== before) {
    ensureStreakDate(); // 자정을 넘겼으면 스트릭 상태를 오늘 기준으로
    awardXp(XP.done); // 오늘 처음 완료한 문장 → 경험치
    awardCoins(COIN.done);
    maybeBattle(after); // ⚔️ 아주 가끔 트레이너가 걸어옴 (다음 문장으로 넘어갈 때 열림)
    // 🔥 오늘 5문장을 채우면 연속 학습일에 들어가고 보너스 (연속일수록 큼)
    if (!state.streakToday && after >= STREAK_MIN_DONE) {
      state.streakToday = true;
      const days = state.streakBase + 1;
      const bonus = streakBonus(days);
      awardXp(bonus);
      const sc = awardCoins(streakCoins(days));
      showPlayerMessage(days > 1 ? `🔥 ${days}일 연속 학습! ⚡+${bonus} 💰+${sc}` : `🔥 오늘 학습 시작! ⚡+${bonus} 💰+${sc} (내일도 하면 더 많이)`, 4500);
    }
    updateGoalChip();
    if (settings.dailyGoal > 0) {
      const left = settings.dailyGoal - after;
      if (left <= 0 && !track.goalRewarded()) { // 목표 수치를 바꿔도 하루 한 번만
        track.markGoalRewarded();
        awardXp(XP.goal);
        awardCoins(COIN.goal);
        const h = hpHeal(HP.goalHeal);
        showPlayerMessage(`🎉 오늘 목표 ${settings.dailyGoal}문장 달성! ⚡+${XP.goal} 💰+${COIN.goal}${h && h.to > h.from ? ` ❤️+${h.to - h.from}` : ''}`, 5000);
      } else if (left === 3 && !track.goalRewarded()) showPlayerMessage(`3문장만 더 하면 목표 보너스 ⚡+${XP.goal} 💰+${COIN.goal}!`, 3500);
    }
  }
  // 🧩 퍼즐 후보로 모아둠 (같은 문장을 반복해도 한 번만)
  if (settings.puzzleEvery > 0 && !state.puzzlePool.some((c) => c.start === cue.start)) state.puzzlePool.push(cue);
  // 🏁 마지막 문장을 완료하면 여행 끝
  if (state.cues.length && cue === state.cues[state.cues.length - 1]) celebrateJourney(false);
}

/** 현재 문장 ⭐ 정복 표시 (목록) */
function markStar() {
  const cur = $('script-list').querySelector(`.script-item[data-idx="${state.idx}"]`);
  if (cur) cur.classList.add('star');
}

function updateGoalChip() {
  const chip = $('goal-chip');
  if (!chip) return;
  if (!settings.dailyGoal || state.parentMode) { chip.hidden = true; return; } // 부모 모드에서는 학습 칩 숨김 (안 쌓이니까)
  const n = track.todayDone();
  chip.hidden = false;
  const days = state.streakBase + (state.streakToday ? 1 : 0);
  const streak = days > 0 ? `${days}일 · ` : ' ';
  chip.textContent = n >= settings.dailyGoal ? `🎉${streak}${n}/${settings.dailyGoal}` : `🔥${streak}${n}/${settings.dailyGoal}`;
  chip.classList.toggle('reached', n >= settings.dailyGoal);
}

/** 🔥 어제까지의 연속 학습일을 기록에서 계산 (콘텐츠를 열 때, 그리고 날짜가 바뀌었을 때) */
function loadStreak() {
  const today = track.todayKey();
  state.streakDate = today;
  state.streakToday = track.todayDone() >= STREAK_MIN_DONE;
  state.streakBase = 0;
  listDaily().then((list) => {
    if (state.streakDate !== today) return; // 그새 또 날짜가 바뀜
    state.streakBase = streakBefore(list, today);
    updateGoalChip();
    if (state.open) checkMissedDay(list, today);
  }).catch(() => {});
}

/** 플레이어를 켜둔 채 자정을 넘기면 스트릭 상태를 오늘 기준으로 다시 */
function ensureStreakDate() {
  if (state.streakDate !== track.todayKey()) loadStreak();
}

// ───────────────────── 단어 패널 ─────────────────────

function initVocabPanel() {
  const panel = $('vocab-panel');
  try { panel.open = localStorage.getItem('shincoach.vocabOpen') === '1'; } catch { /* 무시 */ }
  panel.addEventListener('toggle', () => {
    try { localStorage.setItem('shincoach.vocabOpen', panel.open ? '1' : '0'); } catch { /* 무시 */ }
    if (panel.open && state.vocabItems && !state.parentMode) track.vocab(state.cues[state.idx], state.vocabItems, true); // 직접 눌러 펼침
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
    if (!state.parentMode) track.vocab(cue, items, false);
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
  if (state.open && !document.hidden) { ensureStreakDate(); updateGoalChip(); }
  if (!state.open || !document.hidden) return;
  const wasShadowWaiting = !!state.shadowTimer || !!state.speakRun;
  track.flush();
  cancelShadowWait();
  if (state.sentenceSpeakStop) state.sentenceSpeakStop('hidden'); // ⚔️ 배틀 턴 중이면 그 턴을 무효로 (복귀하면 다시 고름)
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
  resetRecognition(); // 콘텐츠를 열 때마다 음성 인식을 다시 시도 (인터넷이 돌아왔을 수 있음)
  loadStreak();
  state.idx = -1;
  state.repeatCount = 0;
  state.puzzlePool = [];
  state.journeyCelebrated = false;
  state.reviewDone = false;
  state.battlePending = null;
  state.battleLastCue = null;
  cancelShadowWait();
  hidePlayerMessage();

  $('player-title').textContent = item.title;
  state.objectUrl = URL.createObjectURL(blob);
  video.src = state.objectUrl;
  video.defaultPlaybackRate = SPEEDS[state.speedIdx];
  video.playbackRate = SPEEDS[state.speedIdx];

  renderScriptList();
  renderJourney();
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
        renderJourney();
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
    maybeReview(); // 🔁 오늘 복습할 문장이 있으면 먼저 제안
  };
  video.addEventListener('loadedmetadata', state.onMeta, { once: true });
}

function closePlayer() {
  scheduleSave(true);
  track.close();
  flushProfile();
  updateGoalChip();
  closeMedia();
  showView('library');
}

function closeMedia() {
  state.open = false;
  cancelShadowWait();
  closePuzzle();
  closeCatch();
  abortBattle(); // 배틀 중이었으면 결과 반영/패배 취급 (onDone에서 처리)
  setBattleOpen(false);
  abortReview();
  setReviewOpen(false);
  state.battlePending = null;
  state.catchOpen = false;
  state.practiceOpen = false;
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
  if (!settings.speakCheck || state.speakUnavailable || state.parentMode) return false;
  if (state.idx < 0 || state.speakPassed) return false;
  return targetIdx > state.idx;
}

/** 새 문장에 들어갈 때 문장별 상태 초기화 (goTo와 연속 재생 자동 이동 모두 여기를 거침) */
function resetSentenceState() {
  state.repeatCount = 0;
  state.listenCount = 0;
  state.enRevealed = settings.listenFirst === 0 || state.parentMode; // 듣기 먼저 모드면 새 문장은 영어 숨김으로 시작 (부모 모드는 항상 공개)
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
  // ⚔️ 배틀이 걸려 있으면 앞으로 넘어가기 전에 먼저 (퍼즐보다 먼저, 퍼즐은 다음 전환에)
  if (!force && i > state.idx && state.battlePending) {
    startBattle(() => goTo(i, { play, force: true })); // 배틀 뒤에는 같은 전환에서 퍼즐을 또 내지 않음 (다음 전환에)
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
  unlock(); // 첫 터치에서 효과음 오디오 준비
  if (state.shadowTimer || state.speakRun) { skipShadowWait(); return; }
  // 첫 재생(사용자 터치) 때 마이크 권한을 미리 받아 둠 (부모 모드는 말하기 확인이 없으니 안 물어봄)
  if (settings.speakCheck && !state.speakUnavailable && !state.micPrepared && !state.parentMode) {
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
  // 🎯 단어 하나만 다시 듣는 중: 그 끝에서 멈추기만 하고 문장 상태는 건드리지 않음
  if (state.wordPlayUntil) {
    if (t >= state.wordPlayUntil) { video.pause(); state.wordPlayUntil = 0; }
    return;
  }
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
  if (!cue || state.parentMode) return; // 부모 모드: 영상이 끝나면 그냥 멈춤
  const repeatMax = REPEATS[state.repeatIdx];
  const repeatLeft = repeatMax > 0 && state.repeatCount < repeatMax - 1;
  if (repeatLeft || state.shadow) onCueEnd();
}

function onCueEnd() {
  const repeatMax = REPEATS[state.repeatIdx];
  const cue = state.cues[state.idx];

  // 👨‍👩‍👦 부모 모드: 기록 없이 다음 문장으로 이어서, 마지막이면 멈춤
  if (state.parentMode) {
    if (state.idx >= state.cues.length - 1) { video.pause(); celebrateJourney(true); return; }
    advanceContinuous();
    return;
  }
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

  // 마지막 문장이면 멈춤 (배틀·퍼즐이 걸려 있으면 내고, 끝난 자리에 그대로)
  if (state.idx >= state.cues.length - 1) {
    video.pause();
    if (state.battlePending) startBattle(() => {});
    else if (puzzleReady()) startPuzzle(() => {});
    return;
  }

  // ⚔️ 배틀이 걸려 있으면 다음 문장으로 가기 전에
  if (state.battlePending) {
    const nextIdx = state.idx + 1;
    startBattle(() => goTo(nextIdx, { force: true }));
    return;
  }

  // 🧩 N문장이 찼으면 다음 문장으로 가기 전에 퍼즐
  if (puzzleReady()) {
    const nextIdx = state.idx + 1;
    startPuzzle(() => goTo(nextIdx));
    return;
  }

  advanceContinuous();
}

/** 연속 재생: 다음 문장으로 — 문장별 상태(듣기 먼저·말하기 확인)는 goTo와 똑같이 초기화, 재생은 끊지 않음 */
function advanceContinuous() {
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
  if (state.idx >= state.cues.length - 1) { // 마지막 문장: 배틀이 걸려 있으면 배틀, 아니면 퍼즐 (Codex #4)
    if (state.battlePending) startBattle(() => {});
    else if (puzzleReady()) startPuzzle(() => {});
    return;
  }
  goTo(state.idx + 1);
}

function cancelShadowWait() {
  if (state.shadowTimer) clearTimeout(state.shadowTimer);
  if (state.shadowRaf) cancelAnimationFrame(state.shadowRaf);
  state.shadowTimer = null;
  state.shadowRaf = null;
  state.resultDelay = null;
  state.wordPlayUntil = 0;
  $('shadow-words').hidden = true;
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

/** 음성 인식 없이 판정됐을 때 그 이유를 짧게 (부모가 원인을 볼 수 있게, ⚙ 진단과 같은 오류명) */
function srNote(result) {
  if (!result || result.method !== 'energy') return '';
  const why = { unsupported: '브라우저 미지원', offline: '인터넷 없음', 'start-failed': '시작 실패', 'no-result': '결과 없음', 'audio-capture': '마이크 못 잡음', network: '구글 서버 연결 안 됨', 'not-allowed': '권한 거부', 'service-not-allowed': '음성 서비스 사용 불가', 'no-speech': '말소리 못 들음', aborted: '중단됨' }[result.srError] || result.srError || '결과 없음';
  return `🎙 인식 안 됨(${why}) — 말소리 길이로 판정`;
}

/**
 * 🎯 단어 하나만 다시 듣기 — 못 말한 단어를 눌렀을 때.
 * 노래는 실제 단어 시간(VTT 노래방 태그), 영화는 글자 수 비례 추정이라 앞뒤로 조금 여유를 준다.
 */
function playWord(cue, idx) {
  const times = wordTimings(cue);
  const w = times[idx];
  if (!w) return;
  const pad = 0.12;
  const from = Math.max(cue.start, w.start - pad);
  const to = Math.min(cue.end, (w.end || w.start + 0.4) + pad);
  state.wordPlayUntil = to;
  video.currentTime = from;
  safePlay();
  startLoop(); // 결과 화면에서는 rAF 루프가 멈춰 있을 수 있음
  if (state.resultDelay) state.resultDelay(); // 듣는 동안은 다음으로 안 넘어가게 타이머를 미룸
}

/** 결과 화면에서 "잠시 뒤 자동 진행" 타이머 — 단어를 누를 때마다 다시 센다 */
function scheduleAfterResult(fn, ms) {
  state.resultDelay = () => {
    if (state.shadowTimer) clearTimeout(state.shadowTimer);
    state.shadowTimer = setTimeout(() => { state.resultDelay = null; fn(); }, ms);
  };
  state.resultDelay();
}

/**
 * 🎯 말하기 결과를 단어별로 보여준다. 못 말한 단어는 흐리게 + 누르면 그 부분만 다시 재생.
 * 어느 단어가 안 됐는지 알려주면 문장 전체를 다시 하는 것보다 빨리 교정된다.
 */
function renderSpeakWords(cue, result) {
  const box = $('shadow-words');
  box.innerHTML = '';
  if (!cue || !result || result.method !== 'speech' || !result.score || !result.score.total) { box.hidden = true; return; }
  const words = wordResults(cue.en, result.transcript || '');
  const missed = [];
  words.forEach((w, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `sw-word${w.ok ? ' ok' : ' miss'}`;
    b.textContent = w.text;
    if (!w.ok && !w.skip) {
      missed.push(w.text);
      b.title = '눌러서 이 부분만 다시 듣기';
      b.addEventListener('click', () => { unlock(); playWord(cue, i); });
    } else {
      b.disabled = true;
    }
    box.appendChild(b);
  });
  box.hidden = false;
  if (missed.length) track.missedWords(cue, missed); // 📊 자주 놓치는 단어
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
    awardCoins(star ? COIN.speakStar : COIN.speak);
    if (result.method === 'speech' && result.score) {
      msg.textContent = result.score.ratio >= 0.8 ? '🌟 완벽해요!' : '🎯 잘했어요!';
      sub.textContent = `${result.score.matched}/${result.score.total} 단어 맞음: "${result.transcript}"`;
      renderSpeakWords(cue, result);
    } else {
      msg.textContent = '👍 잘했어요!';
      sub.textContent = srNote(result); // 인식 없이 소리 길이로만 통과했음을 부모가 알 수 있게
    }
    const anyMiss = !!(result.score && result.score.matched < result.score.total);
    scheduleAfterResult(afterShadowWait, anyMiss ? 2800 : 1400);
    return;
  }

  state.speakFails++;
  if (state.speakFails >= 3) {
    state.speakPassed = true;
    track.speak(cue, { passed: true, skipped: true, score: result.score });
    hpPenalty(HP.speakSkipped, '따라 말하기를 넘겼어요');
    msg.textContent = '👍 괜찮아요, 넘어갈게요';
    sub.textContent = result.transcript ? `들린 말: "${result.transcript}"` : '';
    renderSpeakWords(cue, result);
    scheduleAfterResult(afterShadowWait, 2800);
    return;
  }
  track.speak(cue, { passed: false, skipped: false, score: result.score });
  msg.textContent = `🔁 다시 한번! (${state.speakFails}/3)`;
  renderSpeakWords(cue, result); // 어느 단어가 안 됐는지 보고 다시 하게
  const missed = result.method === 'speech' && result.score && result.score.matched < result.score.total;
  sub.textContent = result.method === 'speech'
    ? (missed ? '🔊 표시된 단어를 눌러 그 부분만 다시 들어봐요'
      : result.transcript ? `들린 말: "${result.transcript}" — 잘 듣고 따라 해봐요` : '말소리를 못 들었어요 — 조금 더 크게, 또렷하게')
    : `조금 더 크게, 길게 말해봐요 ${srNote(result)}`;
  // 잠시 보여준 뒤 원문 다시 들려주기 → 끝나면 다시 말하기 확인
  // (못 말한 단어를 눌러보는 동안은 넘어가지 않는다 — scheduleAfterResult가 타이머를 다시 센다)
  scheduleAfterResult(() => {
    state.shadowTimer = null;
    state.wordPlayUntil = 0;
    const ov = $('shadow-overlay');
    ov.hidden = true;
    ov.classList.remove('speaking');
    $('shadow-words').hidden = true;
    video.currentTime = cue.start;
    safePlay();
  }, 2600); // 못 말한 단어를 발견할 정도의 시간 — 누르기 시작하면 타이머가 계속 미뤄진다
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
  list.classList.toggle('listen-first', settings.listenFirst > 0 && !state.parentMode); // 부모 모드는 목록 영어도 전부 보임
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
  // 🗺️ 여행 길: 지나온 길 색칠, 캐릭터 이동, 앞쪽 풍경은 안개
  const pct = n ? ((state.idx + 1) / n) * 100 : 0;
  $('journey-done').style.width = `${pct}%`;
  $('journey-walker').style.left = `calc(30px + (100% - 60px) * ${pct / 100})`;
  for (const el of $('journey-scenery').children) el.classList.toggle('ahead', Number(el.dataset.pos) > pct);
}

// ───────────────────── 🗺️ 여행 길 ─────────────────────

// 풍경 이모지 (전부 Emoji 5.0 이하 — 안드로이드 10 태블릿에서 보임)
const SCENERY = ['🌳', '🌲', '🏔️', '⛰️', '🌾', '🌻', '🌊', '🏝️', '🌉', '🏕️', '🌈', '🌴', '🌋', '🏞️', '🌵', '🏰'];

/** 문자열 → 32비트 시드 → 0~1 난수 (같은 콘텐츠는 항상 같은 지도) */
function seededRandom(seedStr) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) { h ^= seedStr.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => {
    h += 0x6D2B79F5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 콘텐츠를 열 때: 길 위에 풍경 8~10개를 문장 위치에 비례해 배치 (콘텐츠 id로 고정) */
function renderJourney() {
  const box = $('journey-scenery');
  box.innerHTML = '';
  const n = state.cues.length;
  if (!n || !state.item) { updateProgress(); return; }
  const rng = seededRandom(String(state.item.id));
  const count = Math.max(6, Math.min(10, Math.round(n / 25))); // 문장이 많을수록 풍경도 조금 더 (6~10개)
  let prev = -1;
  for (let i = 0; i < count; i++) {
    let idx = Math.floor(rng() * SCENERY.length);
    if (idx === prev) idx = (idx + 1) % SCENERY.length; // 같은 풍경 연달아 안 나오게
    prev = idx;
    const pos = ((i + 0.5) / count) * 100 + (rng() - 0.5) * (60 / count); // 균등 간격 + 살짝 흔들기
    const el = document.createElement('span');
    el.textContent = SCENERY[idx];
    el.style.left = `${Math.max(4, Math.min(96, pos)).toFixed(1)}%`;
    el.dataset.pos = String(pos);
    box.appendChild(el);
  }
  updateJourneyWalker();
  updateProgress();
}

/** 길 위의 캐릭터 = 파트너 포켓몬(장식·염색·😴 그대로). 파트너가 없으면 🚶 */
function updateJourneyWalker() {
  const p = partnerInfo();
  const mon = $('journey-mon');
  const fb = $('journey-fallback');
  if (p && p.url) {
    setFigure(mon, p.url, getLook(p.id));
    mon.hidden = false;
    fb.hidden = true;
  } else {
    mon.hidden = true;
    fb.hidden = false;
  }
}

/** 🏁 마지막 문장을 완료 → 도착 연출 (세션당 한 번). 보너스 ⚡·💰는 콘텐츠당 한 번, 부모 모드는 연출만 */
function celebrateJourney(showOnly) {
  if (state.journeyCelebrated || !state.item) return;
  state.journeyCelebrated = true;
  burstConfetti();
  sfx.success();
  if (showOnly || state.parentMode || state.item.journeyDone) {
    showPlayerMessage('🏁 여행 끝! 끝까지 다 봤어요', 5000);
    return;
  }
  state.item.journeyDone = Date.now();
  updateItem(state.item.id, { journeyDone: state.item.journeyDone }).catch(() => {});
  awardXp(XP.journey);
  awardCoins(COIN.journey);
  showPlayerMessage(`🏁 여행 끝! 끝까지 다 봤어요 ⚡+${XP.journey} 💰+${COIN.journey}`, 6000);
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
  if (state.parentMode) { showPlayerMessage('👀 그냥 보기 중에는 반복이 쉬어요', 2500); return; }
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
  if (state.parentMode) { showPlayerMessage('👀 그냥 보기 중에는 섀도잉이 쉬어요', 2500); return; }
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
  // 👨‍👩‍👦 부모 모드: 상단에 칩, 반복·섀도잉 칩은 흐리게
  $('parent-chip').hidden = !state.parentMode;
  updateGoalChip();
  updateLevelChip();
  updatePartnerChip();
  repeatBtn.classList.toggle('parent-off', state.parentMode);
  $('btn-shadow').classList.toggle('parent-off', state.parentMode);
}

// ───────────────────── 키보드 (PC 테스트용) ─────────────────────

function onKeyDown(e) {
  if ($('view-player').hidden) return;
  if (state.puzzleCue || state.catchOpen || state.battleOpen || state.reviewOpen) return; // 퍼즐·잡기·배틀·복습 화면 중에는 플레이어 단축키 무시
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
  const defaults = { mergeSentences: true, shadowFactor: 1.5, listenFirst: 3, speakCheck: true, hideEnWhileSpeaking: true, dailyGoal: 20, puzzleEvery: 10, sfx: true, vibrate: true, hp: true, reviewCount: REVIEW_COUNT };
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
  $('set-review').value = String(settings.reviewCount);
  $('set-sfx').checked = settings.sfx;
  $('set-vibrate').checked = settings.vibrate;
  $('set-hp').checked = settings.hp;
  setSfxEnabled(settings.sfx);
  setVibrateEnabled(settings.vibrate);
  $('set-speak').checked = settings.speakCheck;
  $('set-hide-en').checked = settings.hideEnWhileSpeaking;
  $('set-close').addEventListener('click', () => $('dlg-settings').close());
  $('set-puzzle-try').addEventListener('click', () => { $('dlg-settings').close(); startPuzzleNow(); });
  $('set-review-try').addEventListener('click', () => { $('dlg-settings').close(); startReviewNow(); });
  $('set-catch-try').addEventListener('click', () => { unlock(); $('dlg-settings').close(); startCatchPractice(); });
  $('set-battle-try').addEventListener('click', () => { unlock(); $('dlg-settings').close(); startBattlePractice(); });
  $('form-settings').addEventListener('submit', (e) => {
    e.preventDefault();
    setParentMode($('set-parent').checked); // 저장하지 않음 (앱을 다시 열면 학습 모드)
    const mergeChanged = settings.mergeSentences !== $('set-merge').checked;
    settings.mergeSentences = $('set-merge').checked;
    settings.shadowFactor = Number($('set-shadow-factor').value);
    settings.listenFirst = Number($('set-listen-first').value);
    settings.dailyGoal = Number($('set-goal').value);
    updateGoalChip();
    settings.puzzleEvery = Number($('set-puzzle').value);
    settings.reviewCount = Number($('set-review').value);
    if (settings.puzzleEvery === 0) state.puzzlePool = [];
    settings.sfx = $('set-sfx').checked;
    settings.vibrate = $('set-vibrate').checked;
    settings.hp = $('set-hp').checked;
    setSfxEnabled(settings.sfx);
    setVibrateEnabled(settings.vibrate);
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
      renderJourney();
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
  requirePin(() => { renderDiag(); $('set-parent').checked = state.parentMode; $('dlg-settings').showModal(); });
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
