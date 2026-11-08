// 🎹 음악 과목 곡 (v402) — 공개 연습곡 + 비공개 저장소의 진우 책 곡
//
// 공개 저장소(앱 사이트)에는 **저작권이 끝난 곡만** 둔다 · 가사 없이 음표만 · 반주는 새로 썼다.
// 진우 책 곡(스튜디오 지브리 피아노 곡집)은 작곡·편곡 저작권이 있어 비공개 저장소 music/songs.json(배열)에만 두고
//   📤 열쇠로 받아 이 기기(localStorage)에 둔다 (🐸 기술 그림 battlefx.js · 📝 영상 문장 grammarvideo.js와 같은 꼴)
//   · 열쇠가 없거나 아직 못 받았으면 공개 연습곡만 · 곡을 더하고 고칠 때 배포가 필요 없다
// 받은 원고는 piano.readSong으로 한 곡씩 확인한다 — 깨진 곡은 빼고 나머지만(📊 📥 줄에 ⚠️로)
import { readSong } from './piano.js';

/** 비공개 저장소 원고 경로 */
export const SONGS_PATH = 'music/songs.json';
/** 받기 — 10분에 한 번까지 · 30초 넘으면 끊는다(받아 둔 것 그대로) */
export const SYNC_MS = 10 * 60 * 1000;
export const LIST_MS = 30 * 1000;
/** 받아 둘 곡 수 상한 */
export const MAX_SONGS = 40;
const KEY = { list: 'shincoach.pianoSongs', at: 'shincoach.pianoSongsAt' };

/** 공개 연습곡 — 저작권이 끝난 멜로디 · 왼손 반주는 새로 씀 */
export const PUBLIC_SONGS = [
  {
    id: 'ode', ko: '환희의 송가', by: '베토벤', from: '교향곡 9번 4악장 주제 (1824 · 저작권 끝남) · 쉬운 반주는 새로 씀',
    bpm: 92, beats: 4, lines: [1, 5],
    chords: { 1: ['C', 'G'], 2: ['G', 'G'], 3: ['C', 'G'], 4: ['G'], 5: ['C', 'G'], 6: ['G', 'G'], 7: ['C'], 8: ['G', 'C'] },
    right: [
      'E4:1:3 E4:1:3 F4:1:4 G4:1:5', 'G4:1:5 F4:1:4 E4:1:3 D4:1:2', 'C4:1:1 C4:1:1 D4:1:2 E4:1:3', 'E4:1.5:3 D4:0.5:2 D4:2:2',
      'E4:1:3 E4:1:3 F4:1:4 G4:1:5', 'G4:1:5 F4:1:4 E4:1:3 D4:1:2', 'C4:1:1 C4:1:1 D4:1:2 E4:1:3', 'D4:1.5:2 C4:0.5:1 C4:2:1',
    ],
    left: [
      'C3:2:5 G3:2:1', 'D3:2:4 G3:2:1', 'C3:2:5 G3:2:1', 'G3:2:1 D3:2:4',
      'C3:2:5 G3:2:1', 'D3:2:4 G3:2:1', 'C3:2:5 E3:2:3', 'D3:2:4 C3+E3+G3:2:5+3+1',
    ],
  },
  {
    id: 'mary', ko: 'Mary Had a Little Lamb (비행기)', by: '로웰 메이슨', from: '1830년대 미국 노래 (저작권 끝남) · 가사 없이 · 쉬운 반주는 새로 씀',
    bpm: 100, beats: 4, lines: [1, 5],
    right: [
      'E4:1:3 D4:1:2 C4:1:1 D4:1:2', 'E4:1:3 E4:1:3 E4:2:3', 'D4:1:2 D4:1:2 D4:2:2', 'E4:1:3 G4:1:5 G4:2:5',
      'E4:1:3 D4:1:2 C4:1:1 D4:1:2', 'E4:1:3 E4:1:3 E4:1:3 E4:1:3', 'D4:1:2 D4:1:2 E4:1:3 D4:1:2', 'C4:4:1',
    ],
    left: [
      'C3:2:5 G3:2:1', 'C3:2:5 G3:2:1', 'G3:2:1 D3:2:4', 'C3:2:5 E3:2:3',
      'C3:2:5 G3:2:1', 'C3:2:5 G3:2:1', 'G3:2:1 D3:2:4', 'C3+E3+G3:4:5+3+1',
    ],
  },
];

function load(k, d) {
  try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v === null ? d : v; } catch { return d; }
}
function save(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; }
}

/**
 * 원고 목록 → 쓸 곡 (순수) — readSong을 통과하고 id가 안 겹치는 곡만 · MAX_SONGS까지 · bad = 빠진 곡 수 · raws = 쓴 원고(저장용)
 * @returns {{songs: object[], bad: number, raws: object[]}}
 */
export function songsOf(list) {
  const songs = [];
  const raws = [];
  const ids = new Set();
  let bad = 0;
  for (const raw of Array.isArray(list) ? list : []) {
    const r = readSong(raw);
    if (!r.ok || ids.has(r.song.id) || songs.length >= MAX_SONGS) { bad += 1; continue; }
    ids.add(r.song.id);
    songs.push(r.song);
    raws.push(raw);
  }
  return { songs, bad, raws };
}

/** 이 기기에서 고를 수 있는 곡 — 받아 둔 진우 책 곡이 먼저, 그다음 공개 연습곡 (같은 id면 받은 쪽) */
export function allSongs() {
  const mine = songsOf(load(KEY.list, [])).songs.map((s) => ({ ...s, book: true }));
  const pub = songsOf(PUBLIC_SONGS).songs.filter((s) => !mine.some((m) => m.id === s.id));
  return [...mine, ...pub];
}

/** 곡 id → 이름 (📤 글) */
export function songName(id) {
  const s = allSongs().find((x) => x.id === id);
  return s ? s.ko : String(id);
}

/** 🎹 ⚙ 집 피아노 연결 확인 결과 — 이 기기에만 (📤 usage/music.md 한 줄) · { at, ok, name?, note?, why? } */
const MIDI_KEY = 'shincoach.midiCheck';
export function midiCheckNow() {
  const v = load(MIDI_KEY, null);
  return v && typeof v === 'object' && Number(v.at) > 0 ? v : null;
}
export function saveMidiCheck(v) {
  return save(MIDI_KEY, { ...v, at: Date.now() });
}

let syncing = null;
/**
 * 비공개 저장소에서 곡을 받아 이 기기에 둔다 — 10분에 한 번까지(force면 바로) · 열쇠가 없거나 못 받으면 받아 둔 것 그대로
 * @param {{now?:Function, readList?:Function, noteCheck?:Function, listMs?:number}} [deps] 시험용
 * @returns {Promise<number>} 받아 둔 곡 수
 */
export function syncSongs(force = false, deps = {}) {
  if (syncing) return syncing;
  syncing = doSync(force, deps).finally(() => { syncing = null; });
  return syncing;
}

async function doSync(force, deps) {
  const now = (deps.now || Date.now)();
  const at = Number(load(KEY.at, 0)) || 0;
  const kept = () => songsOf(load(KEY.list, [])).songs.length;
  if (!force && at > 0 && now - at >= 0 && now - at < SYNC_MS) return kept();
  save(KEY.at, now);
  const readList = deps.readList || (async (p) => (await import('./upload.js')).readPrivateList(p));
  let list = [];
  try { list = await within(readList(SONGS_PATH), deps.listMs || LIST_MS); } catch { list = []; }
  if (!Array.isArray(list) || !list.length) return kept();
  const got = songsOf(list);
  const note = deps.noteCheck || (async (c) => (await import('./upload.js')).noteReadCheck(SONGS_PATH, c));
  // 깨진 곡만 있으면 받아 둔 것 그대로 · 저장 공간이 차서 못 두어도 그대로 — 📥에는 ⚠️로
  // 저장은 쓴 원고만 — 같은 id의 겹친 원고·깨진 원고는 두지 않는다 (Codex 204차)
  if (!got.songs.length || !save(KEY.list, got.raws)) {
    try { await note({ rows: list.length, bad: list.length }); } catch { /* 못 적어도 */ }
    return kept();
  }
  try { await note({ rows: list.length, bad: got.bad }); } catch { /* 못 적어도 */ }
  return got.songs.length;
}

/** p가 ms 안에 안 끝나면 실패로 */
function within(p, ms) {
  let t;
  const late = new Promise((_, reject) => { t = setTimeout(() => reject(new Error('시간 넘음')), ms); });
  return Promise.race([Promise.resolve(p), late]).finally(() => clearTimeout(t));
}
