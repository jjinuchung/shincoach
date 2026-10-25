// 🌿 국어·논술 배경음 = 아버님이 고른 곡 파일 (v340 · 2026-10-25)
// 까닭: 새로 쓴 합성 곡(calmsong.js — v317·v330)이 태블릿에서 "끊기고 우는 듯" 들려 아버님이 받아 둔 곡을 틀기로 했다 ·
//   "앱을 켤 때마다 첫 곡만 나오고 두 번째 곡만 많이 듣게 될 것 같아서" **늘 무작위** ·
//   🎮 게임기 음악(gamebgm.js)·🧩⚔️🎯 창 음악(bgm.js)은 그대로 (아버님 "미니게임 음악은 아주 깔끔하게 잘 나온다")
// · 곡은 ⚙(비밀번호 뒤) 「🌿 국어·논술 배경음 곡」에서 태블릿의 폴더·파일을 골라 **이 기기에만** 저장(db.putMusicSet — 저작물이라 공개 저장소에 안 올린다)
// · <audio> 하나로 튼다 — 소리를 매번 합성해 예약하지 않으니 화면이 바빠도 끊기지 않는다 · 언제 틀고 멈추는지는 calm.js가 정한다(창·🎤·🎧·내림·🎵)
// · 차례: 앱을 켤 때마다 새로 섞고 지난번 마지막 곡은 맨 앞에 안 오게 · 한 바퀴 돌면 다시 섞음(바뀌는 곳에서도 같은 곡이 연달아 오지 않게)
// · 화면을 떠났다 오면 그 곡 그 자리에서 이어서 · 곡이 없으면 소리 없음(합성 곡을 대신 틀지 않는다) · 깨진 곡은 건너뜀
// 위쪽은 순수(시험) · 아래쪽은 브라우저 — 시험은 setCalmMusicDeps로 가짜 <audio>·저장소를 넣는다
import { getMusicList, getMusicBlob, putMusicSet, clearMusicSet } from './db.js';

/** 받는 음악 파일 — type이 audio/*이거나 이 확장자 */
export const MUSIC_EXT = ['m4a', 'mp3', 'aac', 'ogg', 'oga', 'opus', 'wav', 'flac', 'weba'];
/** 한 번에 넣는 끝 — 곡 수 · 모두 합친 크기 (태블릿 저장 공간을 다 쓰지 않게) */
export const MUSIC_MAX = { count: 60, bytes: 400 * 1024 * 1024 };
/** 음량(효과음·🎧 읽어 주기보다 작게 — 곡은 대개 -16 LUFS 안팎이라 0.15면 옛 합성 곡과 비슷하게 잔잔) · 음량을 바꾸는 간격(ms) · 지난번 마지막 곡을 기억하는 열쇠 */
export const CALM_FILE = { volume: 0.15, step: 50, lastKey: 'shincoach.calmTrack' };

const extOf = (name) => {
  const m = /\.([a-z0-9]+)$/i.exec(String(name || ''));
  return m ? m[1].toLowerCase() : '';
};

/** 음악 파일인가 (순수) — 숨은 파일(점으로 시작 — 맥이 남기는 ._ 꼬리 파일 등)은 아니다 */
export function isMusicFile(f) {
  if (!f || typeof f.name !== 'string' || !f.name || f.name.startsWith('.')) return false;
  if (String(f.type || '').startsWith('audio/')) return true;
  return MUSIC_EXT.includes(extOf(f.name));
}

/**
 * 고른 파일에서 곡만 (순수) → { files, skipped (음악이 아닌 것), over (끝을 넘어 뺀 곡) }
 * 차례는 이름순(숫자는 숫자대로 — 「2 …」가 「10 …」보다 앞) · 크기가 0인 파일은 뺀다
 */
export function pickMusicFiles(list, max = MUSIC_MAX) {
  const all = Array.from(list || []);
  const music = all.filter((f) => isMusicFile(f) && Number(f.size) > 0)
    .sort((a, b) => a.name.localeCompare(b.name, 'ko', { numeric: true }));
  const files = [];
  let bytes = 0;
  for (const f of music) {
    if (files.length >= max.count || bytes + Number(f.size) > max.bytes) continue;
    files.push(f);
    bytes += Number(f.size);
  }
  return { files, skipped: all.length - music.length, over: music.length - files.length, bytes };
}

/**
 * 곡 차례 섞기 (순수 · Fisher–Yates) → 0 … n-1을 한 번씩
 * avoid = 맨 앞에 오면 안 되는 곡 번호(지난번 마지막 곡 · 바로 앞에 끝난 곡) — 곡이 둘 이상일 때만 지킨다
 */
export function shuffleOrder(n, avoid = -1, rng = Math.random) {
  const len = Math.max(0, Math.floor(Number(n) || 0));
  const a = Array.from({ length: len }, (_, i) => i);
  for (let i = len - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    [a[i], a[j]] = [a[j], a[i]];
  }
  if (len > 1 && a[0] === avoid) {
    const j = 1 + Math.min(len - 2, Math.floor(rng() * (len - 1)));
    [a[0], a[j]] = [a[j], a[0]];
  }
  return a;
}

/** 크기 말 (순수) — 52.3 MB · 0.4 MB */
export function sizeText(bytes) {
  const mb = (Number(bytes) || 0) / (1024 * 1024);
  return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`;
}

// ───────────────────── 틀기 (여기부터 브라우저) ─────────────────────

const deps = {
  makeAudio: () => new Audio(),
  loadList: () => getMusicList(),
  loadBlob: (id) => getMusicBlob(id),
  makeUrl: (b) => URL.createObjectURL(b),
  revokeUrl: (u) => URL.revokeObjectURL(u),
  rng: () => Math.random(),
  storage: () => (typeof localStorage !== 'undefined' ? localStorage : null),
};
/** 시험이 가짜 <audio>·저장소·rng를 넣는다 */
export function setCalmMusicDeps(d) {
  Object.assign(deps, d || {});
}

const pl = {
  list: [],          // 고른 곡 [{ id, name, size }]
  loaded: false,     // 저장소에서 목록을 읽었나
  q: [], qi: 0,      // 섞은 차례(목록 번호) · 다음에 꺼낼 자리
  cur: -1,           // 지금 곡(목록 번호) — 없으면 -1
  last: -1,          // 바로 앞에 건 곡 — 다시 섞을 때 맨 앞에 안 오게 (곡이 끝나 cur를 비워도 남는다)
  pending: false,    // 지금 곡을 저장소에서 꺼내는 중
  audio: null, url: '',
  want: false,       // 틀어야 하나 (calm.js가 정한다)
  fade: null,        // 음량을 바꾸는 타이머
  outEnd: 0,         // 빠져서 멈추는 때(clock) — 0이면 빠지는 중이 아님 · 더 급한 멈춤만 앞당긴다
  bad: new Set(),    // 깨진 곡 — 다 깨지면 조용히
  gen: 0,            // 곡·묶음이 바뀔 때마다 +1 — 늦게 꺼낸 곡이 새 곡을 덮지 않게
  blocked: false,    // play()가 거절됨(누르기 전) — 다음 누름에서 다시
};

const clamp01 = (v) => Math.min(1, Math.max(0, Number(v) || 0));
function readLast() {
  try { const s = deps.storage(); return s ? s.getItem(CALM_FILE.lastKey) : null; } catch { return null; }
}
function writeLast(id) {
  try { const s = deps.storage(); if (s) s.setItem(CALM_FILE.lastKey, String(id)); } catch { /* 이번만 */ }
}

/** 지금 상태 (시험·⚙·진단용) */
export function calmMusicState() {
  const a = pl.audio;
  return {
    loaded: pl.loaded, count: pl.list.length, ready: calmMusicReady(), want: pl.want, playing: calmMusicAudible(),
    track: pl.cur >= 0 && pl.list[pl.cur] ? pl.list[pl.cur].name : '', order: pl.q.slice(), bad: pl.bad.size, blocked: pl.blocked,
    volume: a ? Number(a.volume) : 0,
  };
}

/** 틀 곡이 있나 — 목록을 읽었고 안 깨진 곡이 하나라도 */
export function calmMusicReady() {
  return pl.loaded && pl.list.length > pl.bad.size;
}

/** 소리가 나고 있나 (📤 소리 난 초는 이때만 센다) */
export function calmMusicAudible() {
  const a = pl.audio;
  return !!(a && pl.want && !pl.pending && a.src && !a.paused);
}

function stopFade() {
  if (pl.fade !== null) { clearInterval(pl.fade); pl.fade = null; }
}
const clock = () => (typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now());
/** 음량을 sec초에 걸쳐 target으로 · 다 되면 done — 걸린 시간으로 셈한다(타이머는 정한 간격보다 늦게 돌 때가 많아 횟수로 세면 늦게 끝난다) */
function fadeTo(target, sec, done) {
  stopFade();
  const a = pl.audio;
  if (!a) { if (done) done(); return; }
  const from = clamp01(a.volume);
  const ms = (Number(sec) || 0) * 1000;
  if (!(ms > 0)) { a.volume = clamp01(target); if (done) done(); return; }
  const t0 = clock();
  pl.fade = setInterval(() => {
    const k = Math.min(1, Math.max(0, (clock() - t0) / ms));
    a.volume = clamp01(from + (target - from) * k);
    if (k >= 1) { stopFade(); if (done) done(); }
  }, CALM_FILE.step);
}

function tryPlay() {
  const a = pl.audio;
  if (!a || !a.src) return;
  let p;
  try { p = a.play(); } catch { pl.blocked = true; return; }
  pl.blocked = false;
  if (p && typeof p.catch === 'function') p.catch((e) => { if (!(e && e.name === 'AbortError')) pl.blocked = true; });
}

function audioEl() {
  if (pl.audio) return pl.audio;
  const a = deps.makeAudio();
  a.preload = 'auto';
  a.volume = 0;
  a.addEventListener('ended', () => {
    if (pl.audio !== a) return;
    pl.cur = -1; // 다음에 틀 때는 새 곡
    if (pl.want) startTrack(0);
  });
  a.addEventListener('error', () => {
    if (pl.audio !== a || pl.cur < 0 || pl.pending || !pl.url || a.src !== pl.url) return; // 비운 주소·옛 곡의 늦은 오류는 무시
    markBad(pl.cur);
  });
  pl.audio = a;
  return a;
}

/** 다음 곡 번호 — 차례를 다 쓰면 다시 섞는다(바로 앞 곡이 맨 앞에 안 오게) · 깨진 곡은 건너뜀 · 없으면 -1 */
function nextIndex() {
  const n = pl.list.length;
  for (let guard = 0; guard < 2 * n + 2; guard++) {
    if (pl.qi >= pl.q.length) { pl.q = shuffleOrder(n, pl.last, deps.rng); pl.qi = 0; }
    const i = pl.q[pl.qi++];
    if (i !== undefined && !pl.bad.has(i)) return i;
  }
  return -1;
}

function markBad(i) {
  pl.bad.add(i);
  pl.cur = -1;
  if (pl.want && calmMusicReady()) startTrack(0);
}

/** 새 곡을 꺼내 건다 — 틀어야 하면 틀고 fadeSec초에 걸쳐 들어온다 */
async function startTrack(fadeSec) {
  const i = nextIndex();
  if (i < 0) return;
  const gen = ++pl.gen;
  pl.cur = i;
  pl.last = i;
  pl.pending = true;
  writeLast(pl.list[i].id);
  let blob = null;
  try { blob = await deps.loadBlob(pl.list[i].id); } catch { blob = null; }
  if (gen !== pl.gen) return; // 그사이 곡·묶음이 바뀌었다
  pl.pending = false;
  if (!blob) { markBad(i); return; }
  const a = audioEl();
  if (pl.url) deps.revokeUrl(pl.url);
  pl.url = deps.makeUrl(blob);
  a.src = pl.url;
  a.volume = fadeSec > 0 ? 0 : CALM_FILE.volume;
  if (!pl.want) return; // 꺼내는 사이에 멈추라고 했다 — 걸어만 두고 다음에 그 자리에서
  tryPlay();
  if (fadeSec > 0) fadeTo(CALM_FILE.volume, fadeSec);
}

/** 지금 곡을 내려놓는다 (묶음이 바뀔 때) — 옛 곡의 주소를 놓아준다 */
function dropTrack() {
  pl.gen += 1;
  stopFade();
  pl.outEnd = 0;
  pl.cur = -1;
  pl.pending = false;
  const a = pl.audio;
  if (a) {
    try { a.pause(); } catch { /* 이미 멈춤 */ }
    try { a.removeAttribute('src'); a.load(); } catch { /* 가짜·옛 브라우저 */ }
  }
  if (pl.url) { deps.revokeUrl(pl.url); pl.url = ''; }
}

/** 저장소에서 곡 목록을 다시 읽는다 (앱을 켤 때 · ⚙에서 곡을 바꾼 뒤) → 곡 수 · 차례를 새로 섞는다 */
export async function loadCalmMusic() {
  let rec = null;
  try { rec = await deps.loadList(); } catch { rec = null; }
  const items = rec && Array.isArray(rec.items) ? rec.items.filter((it) => it && /^music:\d+$/.test(String(it.id))) : [];
  const wanted = pl.want;
  dropTrack();
  pl.list = items;
  pl.loaded = true;
  pl.bad = new Set();
  const lastId = readLast();
  pl.last = items.findIndex((it) => it.id === lastId); // 지난번(앱을 끄기 전) 마지막 곡
  pl.q = shuffleOrder(items.length, pl.last, deps.rng);
  pl.qi = 0;
  if (wanted && calmMusicReady()) startTrack(0); // 듣던 중에 ⚙에서 곡을 바꿨다 — 새 묶음으로
  return items.length;
}

/** 틀기 (calm.js — 국어·논술 화면 · 멈출 까닭이 없을 때) · fadeSec초에 걸쳐 들어온다 · 멈췄던 곡은 그 자리에서 */
export function calmMusicPlay(fadeSec = 0) {
  if (!calmMusicReady()) return;
  pl.want = true;
  pl.outEnd = 0; // 빠지던 중이면 그만 빠진다(아래 fadeTo가 그 타이머를 멈춘다)
  if (pl.pending) return; // 꺼내는 중 — 다 꺼내면 튼다
  const a = pl.audio;
  if (pl.cur < 0 || !a || !a.src) { startTrack(fadeSec); return; }
  tryPlay();
  fadeTo(CALM_FILE.volume, fadeSec);
}

/** 멈추기 — fadeSec초에 걸쳐 빠진 뒤 멈춤(자리는 그대로) · 앱이 내려가 있으면 바로(뒤로 간 화면은 타이머가 느려 빠지는 동안 소리가 더 난다) */
export function calmMusicPause(fadeSec = 0) {
  pl.want = false;
  const a = pl.audio;
  if (!a) return;
  if (a.paused) { stopFade(); pl.outEnd = 0; return; } // 이미 멈춤 (막혔거나 꺼내는 중)
  const hidden = typeof document !== 'undefined' && !!document.hidden;
  const sec = hidden ? 0 : Math.max(0, Number(fadeSec) || 0);
  const end = clock() + sec * 1000;
  // 이미 그보다 먼저 멈추는 중이면 그대로 — 0.1초마다 다시 불러도 빠짐을 처음부터 되풀이하지 않는다 ·
  // 더 급한 멈춤(🎧 읽기 0.25초 · 앱을 내림 0초)은 앞당긴다 (🔍 Codex 144차 #1 — 0.6초 빠지는 도중의 🎧·내림이 무시됐다)
  if (pl.outEnd && pl.outEnd <= end) return;
  pl.outEnd = end;
  fadeTo(0, sec, () => {
    pl.outEnd = 0;
    if (pl.want) return; // 빠지는 사이 다시 틀라고 했다
    try { a.pause(); } catch { /* 이미 멈춤 */ }
  });
}

/** 화면을 눌렀다 — play()가 거절됐던 곡을 다시 (태블릿은 누르기 전엔 소리를 막을 수 있다) */
export function calmMusicKick() {
  const a = pl.audio;
  if (pl.want && a && a.src && a.paused && !pl.pending) tryPlay();
}

// ───────────────────── ⚙ 곡 고르기 (비밀번호 뒤) ─────────────────────

/** ⚙ 「🌿 국어·논술 배경음 곡」 — 폴더·파일 고르기 · 지우기 · 지금 들어 있는 곡 (app.js가 한 번) */
export function initCalmMusicSettings() {
  if (typeof document === 'undefined') return;
  const btnFolder = document.getElementById('set-calm-folder');
  if (!btnFolder) return;
  const btnFiles = document.getElementById('set-calm-files');
  const btnDel = document.getElementById('set-calm-del');
  const note = document.getElementById('set-calm-note');
  const say = (t) => { if (note) note.textContent = t; };
  let busy = false;
  const refresh = async () => {
    let rec = null;
    try { rec = await getMusicList(); } catch { rec = null; }
    const items = rec ? rec.items : [];
    if (btnDel) btnDel.hidden = !items.length;
    const bytes = items.reduce((s, it) => s + (Number(it.size) || 0), 0);
    say(items.length
      ? `✅ ${items.length}곡이 들어 있어요 (${sizeText(bytes)}) — 국어·논술 화면에서 늘 섞어서 틀어요`
      : '아직 곡이 없어요 — 곡을 고르면 국어·논술 화면에서 틀어요 (곡이 없으면 음악이 안 나와요)');
  };
  const makeInput = (id, folder) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.id = id;
    input.multiple = true;
    input.hidden = true;
    if (folder) input.setAttribute('webkitdirectory', '');
    else input.accept = 'audio/*,.m4a,.mp3,.aac,.ogg,.opus,.wav,.flac';
    document.body.appendChild(input);
    input.addEventListener('change', async () => {
      const list = Array.from(input.files || []);
      input.value = '';
      if (!list.length || busy) return;
      const pick = pickMusicFiles(list);
      if (!pick.files.length) { say('음악 파일이 없어요 — m4a·mp3 같은 곡 파일을 골라 주세요'); return; }
      busy = true;
      say(`저장하는 중… (${pick.files.length}곡 · ${sizeText(pick.bytes)})`);
      try {
        await putMusicSet(pick.files.map((f) => ({ name: f.name, blob: f })));
        await loadCalmMusic();
        await refresh();
        const extra = [pick.skipped ? `음악이 아닌 파일 ${pick.skipped}개는 뺐어요` : '', pick.over ? `너무 많아 ${pick.over}곡은 뺐어요` : ''].filter(Boolean).join(' · ');
        if (extra && note) note.textContent += ` · ${extra}`;
      } catch (e) {
        say(`저장하지 못했어요 — 태블릿 저장 공간을 확인해 주세요 (${(e && e.name) || e})`);
      } finally { busy = false; }
    });
    return input;
  };
  const inFolder = makeInput('calm-folder-input', true);
  const inFiles = makeInput('calm-files-input', false);
  btnFolder.addEventListener('click', () => inFolder.click());
  if (btnFiles) btnFiles.addEventListener('click', () => inFiles.click());
  if (btnDel) btnDel.addEventListener('click', async () => {
    if (busy) return;
    if (typeof confirm === 'function' && !confirm('넣어 둔 곡을 지울까요? (태블릿의 원래 파일은 그대로예요)')) return;
    busy = true;
    try { await clearMusicSet(); await loadCalmMusic(); } catch { /* 없으면 그만 */ } finally { busy = false; }
    await refresh();
  });
  refresh().catch(() => {});
}
