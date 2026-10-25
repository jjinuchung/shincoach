// 🎮 미니 게임 음악 — 곡(악보)과 소리 (v335 · 2026-10-25 아버님 "미니게임을 할 때 뭔가 긴박감이 있고 신난 음악이 나왔으면 좋겠어" → 기본안 "이대로" → 시험 듣기 2판 "이대로")
// 틀고 멈추기는 gamebgm.js · 게임마다 지금 음악 상태(musicMode)는 game*.js가 run.music()으로 알린다
// 새로 쓴 8비트 곡 셋 — 포켓몬·마리오 음악은 저작물이라 공개 저장소에 멜로디를 옮겨 넣을 수 없다(bgm.js·calmsong.js와 같은 까닭)
//   ① 달려라 파트너 — 🏃 달리기 · 🗺️ 대모험 (D장조 · 160 · 앞으로 달리는 느낌)
//   ② 바쁘다 바빠 — 🕳️ 디그다 · 🍓 열매 · 🎈 열기구 · 🤼 줄다리기 (A단조 · 172 · 16분 하이햇 · 두근두근)
//   ③ 두근두근 생각 — 👤 그림자 · 🃏 짝 · 🗼 탑 (E단조 · 132 · 심장 박동 킥 · 째깍)
// ⏰ 서두르기(hurry): 시간이 있는 게임의 마지막 10초 · 대모험은 끝 계단이 보이면 — 빠르기 ×1.15 + 박마다 「째깍」
// 소리는 파일 없이 Web Audio로 (파일 0개 · 오프라인 · 용량 0):
//   🟨 리드 = 25% 펄스파(PeriodicWave) · 🟦 아르페지오 = 12.5% 펄스파를 아주 작게 · 🔺 베이스 = 세모파 · 🥁 킥(사인파가 툭 떨어짐)·스네어(잡음+톤)·하이햇(높은 잡음)
// ★ 이 파일은 아무것도 import하지 않는다 — 시험이 DOM 없이 부르고, 시험 듣기 페이지가 그대로 붙여 쓴다

const A4 = 440;
const STEP = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };

/** 음이름 → 주파수 ('F#5' · 'Bb2') · 꼴이 틀리면 0 */
export function noteFreq(name) {
  const m = /^([A-G])([#b]?)(\d)$/.exec(String(name || ''));
  if (!m) return 0;
  const semis = STEP[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) - 4) * 12;
  return A4 * Math.pow(2, semis / 12);
}

/**
 * 곡 — 마디 = [화음, 멜로디]
 *  · 화음: '베이스 뿌리음 아르페지오 음들' ('D2 D4 F#4 A4') — 첫 음은 베이스, 나머지는 16분 아르페지오로 돈다
 *  · 멜로디: '음:박' 띄어 쓰기 · r은 쉼 · 한 마디 4박
 *  · bass: 'octave'(뿌리·옥타브 8분) | 'pulse'(4분)  · drums: 16칸 — K 킥(+햇) · S 스네어(+햇) · h 햇 · . 쉼
 */
export const GAME_SONGS = [
  {
    id: 'run', title: '달려라 파트너', bpm: 160, bass: 'octave', drums: 'K.h.S.h.K.K.S.h.',
    games: ['run', 'adv'],
    bars: [
      ['D2 D4 F#4 A4', 'A4:0.5 D5:0.5 F#5:0.5 A5:0.5 F#5:1 D5:1'],
      ['G2 G4 B4 D5', 'B4:0.5 D5:0.5 G5:0.5 B5:0.5 A5:1 G5:1'],
      ['A2 A4 C#5 E5', 'E5:0.5 F#5:0.5 G5:0.5 A5:0.5 C#6:1 A5:1'],
      ['D2 D4 F#4 A4', 'D6:1.5 A5:0.5 F#5:1 r:1'],
      ['B1 B3 D4 F#4', 'F#5:0.5 F#5:0.5 D5:0.5 B4:0.5 D5:1 F#5:1'],
      ['G2 G4 B4 D5', 'G5:0.5 G5:0.5 B5:0.5 G5:0.5 D5:1 B4:1'],
      ['A2 A4 C#5 E5', 'C#5:0.5 E5:0.5 A5:0.5 G5:0.5 F#5:0.5 E5:0.5 C#5:1'],
      ['D2 D4 F#4 A4', 'D5:1 F#5:0.5 A5:0.5 D6:2'],
      ['G2 G4 B4 D5', 'B5:1 A5:0.5 G5:0.5 D5:1 G5:1'],
      ['A2 A4 C#5 E5', 'C#6:1 B5:0.5 A5:0.5 E5:1 A5:1'],
      ['F#2 F#4 A4 C#5', 'C#6:0.5 A5:0.5 F#5:1 A5:0.5 C#6:0.5 F#6:1'],
      ['B1 B3 D4 F#4', 'D6:0.5 C#6:0.5 B5:1 F#5:1 D5:1'],
      ['G2 G4 B4 D5', 'G5:0.5 A5:0.5 B5:0.5 D6:0.5 B5:1 G5:1'],
      ['A2 A4 C#5 E5', 'A5:0.5 B5:0.5 C#6:0.5 E6:0.5 C#6:1 A5:1'],
      ['D2 D4 F#4 A4', 'D6:0.5 A5:0.5 F#5:0.5 A5:0.5 D6:0.5 E6:0.5 F#6:1'],
      ['A2 A4 C#5 E5', 'E6:1 C#6:0.5 A5:0.5 E5:0.5 F#5:0.5 G5:0.5 A5:0.5'],
    ],
  },
  {
    id: 'busy', title: '바쁘다 바빠', bpm: 172, bass: 'octave', drums: 'K.hhS.hhK.hhS.hS',
    games: ['dig', 'berry', 'balloon', 'tug'],
    bars: [
      ['A1 A3 C4 E4', 'E5:0.25 E5:0.25 r:0.25 E5:0.25 C5:0.5 E5:0.5 A5:0.5 G5:0.5 E5:1'],
      ['F1 F3 A3 C4', 'F5:0.25 F5:0.25 r:0.25 F5:0.25 C5:0.5 F5:0.5 A5:0.5 G5:0.5 F5:1'],
      ['G1 G3 B3 D4', 'G5:0.25 G5:0.25 r:0.25 G5:0.25 D5:0.5 G5:0.5 B5:0.5 A5:0.5 G5:1'],
      ['E1 E3 G#3 B3', 'G#5:0.5 A5:0.5 B5:0.5 D6:0.5 C6:0.5 B5:0.5 G#5:1'],
      ['A1 A3 C4 E4', 'A5:0.5 C6:0.5 E6:0.5 C6:0.5 A5:0.5 E5:0.5 A5:1'],
      ['F1 F3 A3 C4', 'A5:0.5 C6:0.5 F6:0.5 C6:0.5 A5:0.5 F5:0.5 A5:1'],
      ['G1 G3 B3 D4', 'B5:0.5 D6:0.5 G6:0.5 D6:0.5 B5:0.5 G5:0.5 B5:0.5 D6:0.5'],
      ['A1 A3 C4 E4', 'C6:0.5 B5:0.5 A5:0.5 G#5:0.5 A5:2'],
      ['D2 D4 F4 A4', 'D6:1 F6:0.5 E6:0.5 D6:0.5 A5:0.5 F5:1'],
      ['A1 A3 C4 E4', 'E6:1 C6:0.5 B5:0.5 A5:0.5 E5:0.5 C5:1'],
      ['E1 E3 G#3 B3', 'B5:0.5 G#5:0.5 E5:0.5 G#5:0.5 B5:0.5 D6:0.5 E6:1'],
      ['A1 A3 C4 E4', 'A5:0.25 B5:0.25 C6:0.25 D6:0.25 E6:1 A5:2'],
      ['D2 D4 F4 A4', 'F5:0.5 A5:0.5 D6:0.5 F6:0.5 E6:0.5 D6:0.5 A5:1'],
      ['G1 G3 B3 D4', 'G5:0.5 B5:0.5 D6:0.5 G6:0.5 F6:0.5 D6:0.5 B5:1'],
      ['C2 C4 E4 G4', 'E6:0.5 D6:0.5 C6:0.5 G5:0.5 E5:0.5 G5:0.5 C6:1'],
      ['E1 E3 G#3 B3', 'B5:0.25 C6:0.25 B5:0.25 A5:0.25 G#5:0.5 E5:0.5 G#5:0.5 B5:0.5 E6:1'],
    ],
  },
  {
    id: 'think', title: '두근두근 생각', bpm: 132, bass: 'pulse', drums: 'K.K.h.h.K.K.h.h.',
    games: ['shadow', 'pair', 'tower'],
    bars: [
      ['E2 E4 G4 B4', 'G5:1 B5:1 E5:1 r:1'],
      ['C2 C4 E4 G4', 'E5:1 G5:1 C6:1 r:1'],
      ['G2 G4 B4 D5', 'D6:1 B5:0.5 G5:0.5 D5:1 r:1'],
      ['D2 D4 F#4 A4', 'F#5:0.5 A5:0.5 D6:1 C6:0.5 A5:0.5 F#5:1'],
      ['E2 E4 G4 B4', 'B5:1 G5:0.5 E5:0.5 G5:1 B5:1'],
      ['C2 C4 E4 G4', 'C6:1 G5:0.5 E5:0.5 G5:1 C6:1'],
      ['B1 B3 D#4 F#4', 'D#6:0.5 F#5:0.5 A5:0.5 B5:0.5 D#6:1 F#6:1'],
      ['E2 E4 G4 B4', 'E6:2 B5:1 r:1'],
      ['A1 A3 C4 E4', 'C6:0.5 B5:0.5 A5:1 E5:1 A5:1'],
      ['D2 D4 F#4 A4', 'D6:0.5 C6:0.5 A5:1 F#5:1 D6:1'],
      ['G2 G4 B4 D5', 'B5:0.5 A5:0.5 G5:1 D5:1 G5:1'],
      ['E2 E4 G4 B4', 'E5:0.5 F#5:0.5 G5:0.5 A5:0.5 B5:2'],
      ['A1 A3 C4 E4', 'A5:0.5 C6:0.5 E6:1 D6:0.5 C6:0.5 A5:1'],
      ['B1 B3 D#4 F#4', 'B5:0.5 D#6:0.5 F#6:1 E6:0.5 D#6:0.5 B5:1'],
      ['E2 E4 G4 B4', 'E6:1 B5:1 G5:1 E5:1'],
      ['E2 E4 G4 B4', 'F#5:0.5 G5:0.5 A5:0.5 B5:0.5 E5:2'],
    ],
  },
];

/** ⏰ 서두르기 — 빠르기 배 · 이 초가 남으면 */
export const HURRY = 1.15;
export const HURRY_SEC = 10;
const BEATS = 4;

/** 남은 시간(ms)이 서두를 때인가 — 0 < 남음 ≤ 10초 */
export function hurryLeft(ms) {
  return Number.isFinite(ms) && ms > 0 && ms <= HURRY_SEC * 1000;
}

/**
 * 한 판의 지금 음악 상태 (순수) — game*.js의 run.music()이 부른다 → 'play' | 'hurry' | 'stop'
 * o.over = 판이 끝남(끝! · 🚩 도착!) · o.left = 남은 ms(시간이 있는 게임 · 「준비!」 동안은 null) · o.hurry = 남은 시간 말고 서두를 까닭(🗺️ 끝 계단이 보임)
 */
export function musicMode(o = {}) {
  if (o.over) return 'stop';
  return o.hurry || hurryLeft(o.left) ? 'hurry' : 'play';
}

/** 게임 → 곡 (모르는 게임은 ① 달려라 파트너) */
export function songFor(gameId) {
  return GAME_SONGS.find((s) => s.games.includes(gameId)) || GAME_SONGS[0];
}

/** 멜로디 → [{ note, beats }] (꼴이 틀린 마디는 빈 배열) */
export function parseMelody(text) {
  const out = [];
  for (const tok of String(text || '').trim().split(/\s+/)) {
    const m = /^(r|[A-G][#b]?\d):(\d+(?:\.\d+)?)$/.exec(tok);
    if (!m) return [];
    out.push({ note: m[1], beats: Number(m[2]) });
  }
  return out;
}

/** 한 마디 길이(초) — hurry면 빠르게 */
export function barSec(song, hurry = false) {
  return (60 / (song.bpm * (hurry ? HURRY : 1))) * BEATS;
}

/**
 * 한 마디의 소리들 (순수) → [{ v: 'lead'|'arp'|'bass'|'kick'|'snare'|'hat'|'tick', f, at, d }] (at·d는 박)
 * 시험이 마디마다 박 수·음 범위를 보고, scheduleBar가 그대로 소리 낸다
 */
export function barEvents(song, i, hurry = false) {
  const bar = song.bars[((i % song.bars.length) + song.bars.length) % song.bars.length];
  const [chord, mel] = bar;
  const tones = chord.split(/\s+/);
  const root = tones[0];
  const arp = tones.slice(1);
  const out = [];
  let at = 0;
  for (const n of parseMelody(mel)) {
    if (n.note !== 'r') out.push({ v: 'lead', f: noteFreq(n.note), at, d: n.beats });
    at += n.beats;
  }
  for (let k = 0; k < 16; k++) out.push({ v: 'arp', f: noteFreq(arp[k % arp.length]), at: k / 4, d: 0.2 });
  const rf = noteFreq(root);
  if (song.bass === 'octave') for (let k = 0; k < 8; k++) out.push({ v: 'bass', f: k % 2 ? rf * 2 : rf, at: k / 2, d: 0.4 });
  else for (let k = 0; k < 4; k++) out.push({ v: 'bass', f: rf, at: k, d: 0.7 });
  [...song.drums].forEach((c, k) => {
    const t = k / 4;
    if (c === 'K') out.push({ v: 'kick', f: 0, at: t, d: 0.25 }, { v: 'hat', f: 0, at: t, d: 0.1 });
    if (c === 'S') out.push({ v: 'snare', f: 0, at: t, d: 0.25 }, { v: 'hat', f: 0, at: t, d: 0.1 });
    if (c === 'h') out.push({ v: 'hat', f: 0, at: t, d: 0.1 });
  });
  if (hurry) for (let k = 0; k < 4; k++) out.push({ v: 'tick', f: k ? 1500 : 2000, at: k, d: 0.05 });
  return out;
}

// ───────────────────── 소리 (여기부터 Web Audio) ─────────────────────

const waves = new WeakMap();
/** 펄스파 (duty 0~1) — 8비트 소리 */
function pulseWave(ctx, duty) {
  let m = waves.get(ctx);
  if (!m) { m = {}; waves.set(ctx, m); }
  if (m[duty]) return m[duty];
  const N = 32;
  const re = new Float32Array(N);
  const im = new Float32Array(N);
  for (let n = 1; n < N; n++) re[n] = (2 * Math.sin(Math.PI * n * duty)) / (Math.PI * n);
  m[duty] = ctx.createPeriodicWave(re, im);
  return m[duty];
}
let noiseBuf = null;
function noise(ctx) {
  if (noiseBuf && noiseBuf.sampleRate === ctx.sampleRate) return noiseBuf;
  noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.3), ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  let x = 12345;
  for (let i = 0; i < d.length; i++) { x = (x * 1103515245 + 12345) & 0x7fffffff; d[i] = (x / 0x3fffffff) - 1; }
  return noiseBuf;
}
/** 소리 크기 — 리드가 가장 크고 아르페지오는 아주 작게 · 효과음(sfx)보다 작게 섞이도록 bus에서 한 번 더 줄인다 */
export const LEVEL = { lead: 0.16, arp: 0.035, bass: 0.2, kick: 0.34, snare: 0.18, hat: 0.06, tick: 0.1 };

function env(ctx, g, at, peak, d, release = 0.04) {
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + 0.006);
  g.gain.setValueAtTime(peak, at + Math.max(0.01, d * 0.7));
  g.gain.exponentialRampToValueAtTime(0.0001, at + d + release);
}

function voice(ctx, out, e, at, dur) {
  const g = ctx.createGain();
  g.connect(out);
  const live = [];
  const end = at + dur + 0.08;
  if (e.v === 'lead' || e.v === 'arp' || e.v === 'tick') {
    const o = ctx.createOscillator();
    if (e.v === 'tick') o.type = 'square'; else o.setPeriodicWave(pulseWave(ctx, e.v === 'lead' ? 0.25 : 0.125));
    // 음높이는 처음부터 끝까지 그대로 — 시안 1판의 「길게 끄는 음 떨림(비브라토)」은 아버님이 "테이프가 늘어지는 듯 · 우는 듯"이라 들으셔서 뺐다
    o.frequency.setValueAtTime(e.f, at);
    env(ctx, g, at, LEVEL[e.v], dur * (e.v === 'lead' ? 0.92 : 0.8), e.v === 'tick' ? 0.01 : 0.04);
    o.connect(g);
    o.start(at);
    o.stop(end);
    live.push({ o, end });
  } else if (e.v === 'bass') {
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(e.f, at);
    env(ctx, g, at, LEVEL.bass, dur * 0.85);
    o.connect(g);
    o.start(at);
    o.stop(end);
    live.push({ o, end });
  } else if (e.v === 'kick') {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, at);
    o.frequency.exponentialRampToValueAtTime(45, at + 0.12);
    g.gain.setValueAtTime(LEVEL.kick, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
    o.connect(g);
    o.start(at);
    o.stop(at + 0.2);
    live.push({ o, end: at + 0.2 });
  } else {
    const s = ctx.createBufferSource();
    s.buffer = noise(ctx);
    const f = ctx.createBiquadFilter();
    f.type = e.v === 'hat' ? 'highpass' : 'bandpass';
    f.frequency.value = e.v === 'hat' ? 7000 : 1800;
    const len = e.v === 'hat' ? 0.04 : 0.13;
    g.gain.setValueAtTime(LEVEL[e.v], at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + len);
    s.connect(f).connect(g);
    s.start(at);
    s.stop(at + len + 0.02);
    live.push({ o: s, end: at + len + 0.02 });
  }
  return live;
}

/**
 * 곡이 지나가는 길 — 높은 모서리만 조금 깎아(귀가 아프지 않게) 정해진 크기로 out에
 * 압축기는 쓰지 않는다: 시안 1판은 킥이 칠 때마다 압축기가 소리 전체를 눌렀다 놓아 울렁였다 · 대신 소리마다 크기를 낮춰 넘치지 않게(시험이 최고점을 잰다)
 */
export function makeBus(ctx, out) {
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 9000;
  lp.Q.value = 0.5;
  const g = ctx.createGain();
  g.gain.value = 1.2; // 압축기를 뺀 만큼 — 최고점이 시안 1판과 비슷하게(약 0.7 · 1을 넘지 않게)
  lp.connect(g).connect(out);
  return lp;
}

/** 한 마디를 at(초)부터 예약 → [{ o, end }] (멈출 때 쓴다) */
export function scheduleBar(ctx, input, song, i, at, hurry = false) {
  const beat = barSec(song, hurry) / BEATS;
  const live = [];
  for (const e of barEvents(song, i, hurry)) live.push(...voice(ctx, input, e, at + e.at * beat, e.d * beat));
  return live;
}
