// 🌿 국어·논술 배경 음악 — 곡(악보)과 소리 (v317, 2026-10-22 아버님 "부드럽게 지브리 느낌의 새 곡을 직접 만들어서 넣어봐")
// v330 (2026-10-24): 진우 "너무 느리고 음산하고 공포 게임 음악 같다 — 더 밝고 경쾌하고 빠르게" → 곡 셋을 다시 썼다
//   음산했던 까닭(v317): 66~84 bpm · 단조 iv로 끝맺기 · 어긋난 톱니파 배경(웅~) · 어둡고 긴 잔향 · 오르골(공포 게임에 흔한 소리) · B1까지 내려가는 왼손
//   → 밝은 장조(C·G·F) · 120~132 bpm · 으뜸화음으로 끝 · 통통 튀는 반주(쿵-짝 · 알베르티 · 뒷박) · 마림바 같은 맑은 소리 · 배경 웅~ 없음 · 짧고 밝은 잔향 · 가벼운 나무 「톡」 박(뒷박 — accomp)
//
// 왜 새 곡인가: 지브리 음악(히사이시 조)은 저작물이라 공개 저장소에 멜로디를 옮겨 넣을 수 없다 (bgm.js의 포켓몬 음악과 같은 까닭).
//   그래서 분위기만 빌려 **새로 쓴 곡** 셋을 둔다. 곡마다 A(물음) → A′(대답) → B(바꿔 부르기) → A′ · 32마디.
// 소리는 파일 없이 Web Audio로 만든다 (효과음 sfx.js·bgm.js와 같은 방식 — 파일 0개 · 오프라인 · 용량 0):
//   🎹 밝은 피아노 = 배음 여럿(PeriodicWave) + 조금씩 어두워지는 필터 + 짧게 줄어드는 소리
//   🪵 마림바 = 사인파 + 나무 막대 배음(×3.93) · 🎸 베이스 = 세모파를 짧게 튕김 · 🥁 톡 = 높은 음을 아주 짧게 · 🏛️ 울림 = 짧은 잔향(ConvolverNode)
// ★ 이 파일은 아무것도 import하지 않는다 — 시험이 DOM 없이 부르고, 시험 듣기 페이지가 그대로 붙여 쓴다. 언제 트는지는 calm.js

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
 *  · 화음: 낮은 음부터 왼손 음들 · 한 마디에 둘이면 '|'로 반씩 나눈다
 *      bounce·skip = '뿌리 5도 위화음셋' ('C2 G2 C4 E4 G4') · alberti = '뿌리 위화음셋' ('G2 G3 B3 D4')
 *  · 멜로디: '음:박' 띄어 쓰기 ('E5:0.5 G5:0.5') · r은 쉼 · 박을 더하면 그 곡의 한 마디 박 수(beats)
 *  · lh 반주 꼴(아래 accomp) · voice 멜로디 소리(돌 때마다 마림바 ↔ 피아노를 번갈아)
 */
export const SONGS = [
  {
    id: 'walk', title: '아침 산책', bpm: 126, beats: 4, lh: 'bounce', voice: 'bell',
    parts: {
      A: [
        ['C2 G2 C4 E4 G4', 'E5:0.5 G5:0.5 C6:1 B5:0.5 A5:0.5 G5:1'],
        ['F2 C3 F3 A3 C4', 'A5:0.5 G5:0.5 F5:1 A5:1 C6:1'],
        ['G2 D3 G3 B3 D4', 'B5:0.5 A5:0.5 G5:1 D5:1 G5:1'],
        ['C2 G2 C4 E4 G4', 'E5:1 G5:0.5 E5:0.5 C5:2'],
        ['A2 E3 A3 C4 E4', 'C5:0.5 E5:0.5 A5:1 G5:0.5 A5:0.5 C6:1'],
        ['D2 A2 D3 F3 A3', 'D6:1 C6:0.5 A5:0.5 F5:1 A5:1'],
        ['G2 D3 G3 B3 D4', 'G5:0.5 A5:0.5 B5:0.5 C6:0.5 D6:1 B5:1'],
        ['G2 D3 F3 G3 B3', 'C6:1 B5:0.5 A5:0.5 G5:2'],
      ],
      A2: [
        ['C2 G2 C4 E4 G4', 'E5:0.5 G5:0.5 C6:1 B5:0.5 A5:0.5 G5:1'],
        ['F2 C3 F3 A3 C4', 'A5:0.5 G5:0.5 F5:1 A5:1 C6:1'],
        ['G2 D3 G3 B3 D4', 'B5:0.5 A5:0.5 G5:1 D6:1 B5:1'],
        ['A2 E3 A3 C4 E4', 'C6:1.5 B5:0.5 A5:2'],
        ['F2 C3 F3 A3 C4', 'A5:0.5 B5:0.5 C6:1 A5:0.5 F5:0.5 A5:1'],
        ['C2 G2 C4 E4 G4', 'G5:0.5 E5:0.5 C5:1 E5:1 G5:1'],
        ['D2 A2 D3 F3 A3 | G2 D3 G3 B3 D4', 'F5:1 A5:1 D6:1 B5:1'],
        ['C2 G2 C4 E4 G4', 'C6:3 r:1'],
      ],
      B: [
        ['F2 C3 F3 A3 C4', 'A5:1 C6:1 A5:0.5 G5:0.5 F5:1'],
        ['G2 D3 G3 B3 D4', 'G5:1 B5:1 G5:0.5 F5:0.5 E5:1'],
        ['E2 B2 E3 G3 B3', 'E5:0.5 G5:0.5 B5:1 G5:1 E5:1'],
        ['A2 E3 A3 C4 E4', 'A5:1.5 G5:0.5 E5:2'],
        ['D2 A2 D3 F3 A3', 'F5:0.5 E5:0.5 D5:1 F5:1 A5:1'],
        ['G2 D3 G3 B3 D4', 'B5:0.5 A5:0.5 G5:0.5 F5:0.5 G5:2'],
        ['C2 G2 C4 E4 G4 | A2 E3 A3 C4 E4', 'E5:1 G5:1 C6:1 E6:1'],
        ['D2 A2 D3 F#3 C4 | G2 D3 G3 B3 D4', 'D6:1 C6:0.5 B5:0.5 A5:1 B5:1'],
      ],
    },
    form: ['A', 'A2', 'B', 'A2'],
  },
  {
    id: 'plane', title: '종이비행기', bpm: 132, beats: 4, lh: 'alberti', voice: 'piano',
    parts: {
      A: [
        ['G2 G3 B3 D4', 'D5:0.5 G5:0.5 B5:0.5 G5:0.5 D6:1 B5:1'],
        ['C3 G3 C4 E4', 'C6:0.5 B5:0.5 A5:0.5 G5:0.5 E5:1 G5:1'],
        ['D3 F#3 A3 D4', 'F#5:0.5 A5:0.5 D6:1 C6:0.5 A5:0.5 F#5:1'],
        ['G2 G3 B3 D4', 'G5:1.5 A5:0.5 B5:2'],
        ['E2 G3 B3 E4', 'B5:0.5 G5:0.5 E5:1 G5:0.5 B5:0.5 E6:1'],
        ['C3 G3 C4 E4', 'E6:1 D6:0.5 C6:0.5 G5:2'],
        ['A2 A3 C4 E4 | D3 F#3 A3 D4', 'A5:0.5 B5:0.5 C6:1 F#5:1 A5:1'],
        ['D3 F#3 A3 D4', 'A5:1 D6:1 A5:1 F#5:1'],
      ],
      A2: [
        ['G2 G3 B3 D4', 'D5:0.5 G5:0.5 B5:0.5 G5:0.5 D6:1 B5:1'],
        ['C3 G3 C4 E4', 'C6:0.5 B5:0.5 A5:0.5 G5:0.5 E5:1 C6:1'],
        ['B2 B3 D4 F#4', 'B5:0.5 A5:0.5 F#5:1 D5:1 F#5:1'],
        ['E2 G3 B3 E4', 'G5:1 B5:1 E6:2'],
        ['C3 G3 C4 E4', 'E6:0.5 D6:0.5 C6:0.5 B5:0.5 A5:1 C6:1'],
        ['G2 G3 B3 D4', 'B5:0.5 A5:0.5 G5:1 D5:1 G5:1'],
        ['A2 A3 C4 E4 | D3 F#3 A3 D4', 'C6:1 A5:1 D6:1 F#5:1'],
        ['G2 G3 B3 D4', 'G5:3 r:1'],
      ],
      B: [
        ['C3 G3 C4 E4', 'E5:1 G5:1 C6:1.5 B5:0.5'],
        ['G2 G3 B3 D4', 'B5:1 G5:1 D5:2'],
        ['A2 A3 C4 E4', 'C6:1 A5:1 E5:1 A5:1'],
        ['E2 G3 B3 E4', 'G5:2 B5:1 G5:1'],
        ['C3 G3 C4 E4', 'E6:0.5 D6:0.5 C6:0.5 B5:0.5 C6:1 G5:1'],
        ['G2 G3 B3 D4', 'D6:0.5 C6:0.5 B5:0.5 A5:0.5 B5:1 G5:1'],
        ['A2 A3 C4 E4', 'A5:0.5 B5:0.5 C6:0.5 D6:0.5 E6:1 C6:1'],
        ['D3 F#3 A3 D4', 'D6:2 C6:1 A5:1'],
      ],
    },
    form: ['A', 'A2', 'B', 'A2'],
  },
  {
    id: 'play', title: '햇살 놀이터', bpm: 120, beats: 4, lh: 'skip', voice: 'bell',
    parts: {
      A: [
        ['F2 C3 F3 A3 C4', 'C5:0.5 F5:0.5 A5:0.5 C6:0.5 A5:1 F5:1'],
        ['Bb2 F3 Bb3 D4 F4', 'D6:1 C6:0.5 Bb5:0.5 F5:1 D5:1'],
        ['C3 G3 C4 E4 G4', 'G5:0.5 A5:0.5 Bb5:0.5 C6:0.5 E5:1 G5:1'],
        ['F2 C3 F3 A3 C4', 'A5:1 F5:1 C5:2'],
        ['D2 A2 D3 F3 A3', 'D5:0.5 F5:0.5 A5:0.5 D6:0.5 C6:1 A5:1'],
        ['Bb2 F3 Bb3 D4 F4', 'Bb5:1 D6:1 F5:1 Bb5:1'],
        ['G2 D3 G3 Bb3 D4 | C3 G3 Bb3 C4 E4', 'G5:1 Bb5:1 E5:1 G5:1'],
        ['C3 G3 Bb3 C4 E4', 'C6:1.5 Bb5:0.5 A5:1 G5:1'],
      ],
      A2: [
        ['F2 C3 F3 A3 C4', 'C5:0.5 F5:0.5 A5:0.5 C6:0.5 A5:1 F5:1'],
        ['Bb2 F3 Bb3 D4 F4', 'D6:1 C6:0.5 Bb5:0.5 F5:1 D6:1'],
        ['C3 G3 C4 E4 G4', 'C6:1 Bb5:0.5 G5:0.5 E5:1 C6:1'],
        ['A2 E3 A3 C4 E4', 'A5:1.5 G5:0.5 E5:2'],
        ['Bb2 F3 Bb3 D4 F4', 'D6:0.5 C6:0.5 Bb5:0.5 A5:0.5 G5:1 Bb5:1'],
        ['F2 C3 F3 A3 C4', 'A5:0.5 G5:0.5 F5:1 A5:1 C6:1'],
        ['G2 D3 G3 Bb3 D4 | C3 G3 Bb3 C4 E4', 'Bb5:1 G5:1 E5:1 G5:1'],
        ['F2 C3 F3 A3 C4', 'F5:3 r:1'],
      ],
      B: [
        ['Bb2 F3 Bb3 D4 F4', 'F5:1 Bb5:1 D6:1.5 C6:0.5'],
        ['F2 C3 F3 A3 C4', 'C6:1 A5:1 F5:2'],
        ['G2 D3 G3 Bb3 D4', 'G5:0.5 A5:0.5 Bb5:1 D6:1 Bb5:1'],
        ['D2 A2 D3 F3 A3', 'A5:2 F5:1 A5:1'],
        ['Bb2 F3 Bb3 D4 F4', 'D6:0.5 C6:0.5 Bb5:0.5 A5:0.5 Bb5:1 D6:1'],
        ['F2 C3 F3 A3 C4', 'C6:0.5 Bb5:0.5 A5:0.5 G5:0.5 A5:1 F5:1'],
        ['G2 D3 G3 Bb3 D4', 'G5:0.5 A5:0.5 Bb5:0.5 C6:0.5 D6:1 Bb5:1'],
        ['C3 G3 Bb3 C4 E4', 'C6:2 G5:1 E5:1'],
      ],
    },
    form: ['A', 'A2', 'B', 'A2'],
  },
];

/** 멜로디 글 → [{ n 음이름(쉼은 ''), f, t 시작 박, d 박 }] */
export function parseMelody(text) {
  const out = [];
  let t = 0;
  for (const tok of String(text || '').trim().split(/\s+/).filter(Boolean)) {
    const [n, b] = tok.split(':');
    const d = Number(b);
    out.push({ n: n === 'r' ? '' : n, f: n === 'r' ? 0 : noteFreq(n), t, d });
    t += d;
  }
  return out;
}

/** 화음 글 → [{ t, d, tones: [주파수…] }] — '|'면 마디를 반씩 */
export function parseChords(text, beats) {
  const segs = String(text || '').split('|').map((s) => s.trim().split(/\s+/).filter(Boolean));
  const d = beats / segs.length;
  return segs.map((names, i) => ({ t: i * d, d, tones: names.map(noteFreq) }));
}

const flat = new Map();
/** 곡의 마디를 form 차례로 편 것 [{ chords, mel }] (곡마다 한 번 만들어 둔다) */
export function songBars(song) {
  if (flat.has(song)) return flat.get(song);
  const bars = song.form.flatMap((p) => song.parts[p]).map(([c, m]) => ({ chords: parseChords(c, song.beats), mel: parseMelody(m) }));
  flat.set(song, bars);
  return bars;
}

/** 한 마디의 초 */
export function barSec(song) {
  return (song.beats * 60) / song.bpm;
}

/** 멜로디 소리 둘 — 돌 때마다 번갈아 (같은 곡이 덜 물리게) */
export const MEL_VOICES = ['bell', 'piano'];

/**
 * 반주 (순수) — 화음 하나(d박)를 8분음표 칸마다 → [{ voice, f, t 화음 시작부터 박, d, vel }]
 *  · bounce 🦘 쿵-짝: 1·3박 베이스(뿌리·5도) · 2·4박 위 화음을 짧게 콕
 *  · skip 🛝 뒷박: 1·3박 베이스 · 8분 뒷박마다 위 화음을 아주 짧게(통통 튀게)
 *  · alberti 🎹 알베르티: 1·3박 베이스 · 위 화음을 아래-위-가운데-위로 펼침
 *  · 🥁 톡: 8분 뒷박(0.5·1.5·2.5·3.5박)마다 가벼운 나무 소리 (박이 살아 있게) — 뒷박 꼴은 화음이 뒷박을 치니 2·4박에
 *    ★ 쿵-짝은 화음이 2·4박이라 톡과 안 겹치지만, 알베르티는 피아노가 8분마다 쳐서 톡이 피아노와 같은 자리에 겹친다 —
 *      아버님이 들으시고 "이대로"(v330) 하신 소리 그대로 둔다 (🔍 Codex 134차 #1 — 설명만 바로잡음)
 */
export function accomp(lh, tones, d) {
  const steps = Math.round(d * 2);
  const out = [];
  const alb = lh === 'alberti';
  const root = tones[0];
  const fifth = alb ? tones[0] : tones[1];
  const tri = alb ? tones.slice(1) : tones.slice(2);
  const order = [0, 2, 1, 2];
  for (let k = 0; k < steps; k++) {
    const t = k / 2;
    if (k % 4 === 0) out.push({ voice: 'bass', f: k % 8 === 0 ? root : fifth, t, d: Math.min(alb ? 2 : 1, d - t), vel: 0.85 });
    if (alb) out.push({ voice: 'piano', f: tri[order[k % 4] % tri.length], t, d: 0.5, vel: k % 2 ? 0.26 : 0.32 });
    const stab = lh === 'skip' ? k % 2 === 1 : k % 4 === 2;
    if (!alb && stab) for (const f of tri) out.push({ voice: 'piano', f, t, d: lh === 'skip' ? 0.25 : 0.4, vel: lh === 'skip' ? 0.2 : 0.26 });
    const tick = lh === 'skip' ? k % 4 === 2 : k % 2 === 1;
    if (tick) out.push({ voice: 'tick', f: k % 4 === 3 ? 2400 : 2000, t, d: 0.1, vel: k % 4 === 2 ? 0.7 : 0.5 });
  }
  return out;
}

/**
 * 한 마디에 낼 소리 (순수) — [{ voice: piano|bell|bass|tick, f, t 박, d 박, vel }]
 * 멜로디는 vel 0.9 · pass = 곡이 몇 번째 도는가 — 홀수 번째면 멜로디 소리를 바꾼다 (마림바 ↔ 피아노)
 */
export function barEvents(song, i, pass = 0) {
  const bars = songBars(song);
  const bar = bars[((i % bars.length) + bars.length) % bars.length];
  const other = MEL_VOICES.find((v) => v !== song.voice);
  const melVoice = pass % 2 ? other : song.voice;
  const out = [];
  // 멜로디는 살짝 떼어 친다(90%) — 늘어지지 않고 또박또박
  for (const n of bar.mel) if (n.f) out.push({ voice: melVoice, f: n.f, t: n.t, d: n.d * 0.9, vel: 0.9 });
  for (const c of bar.chords) {
    const tones = c.tones.filter((f) => f > 0);
    if (tones.length < 3) continue;
    for (const e of accomp(song.lh, tones, c.d)) out.push({ ...e, t: c.t + e.t });
  }
  return out;
}

// ── 소리 ──

const cache = new WeakMap(); // 컨텍스트마다 한 번 만드는 것 (피아노 파형 · 잔향)
function cached(ctx, key, make) {
  let m = cache.get(ctx);
  if (!m) { m = {}; cache.set(ctx, m); }
  if (!m[key]) m[key] = make();
  return m[key];
}

function pianoWave(ctx) {
  // 배음 세기 — 위 배음을 넉넉히 (밝고 또렷하게)
  const amp = [0, 1, 0.55, 0.3, 0.18, 0.1, 0.06, 0.04];
  return cached(ctx, 'piano', () => ctx.createPeriodicWave(new Float32Array(amp.length), Float32Array.from(amp)));
}

/** 소리가 줄어드는 빠르기(초, 시간 상수) — 낮은 음일수록 길게 · 전보다 짧게(경쾌하게) */
export function decayOf(f) {
  return Math.min(0.9, Math.max(0.25, 0.6 * Math.pow(262 / f, 0.4)));
}

/** 🎹 밝은 피아노 — 낸 오실레이터와 멈출 때 [{ o, end }] */
function piano(ctx, out, f, at, dur, vel) {
  const tau = decayOf(f);
  const o = ctx.createOscillator();
  o.setPeriodicWave(pianoWave(ctx));
  o.frequency.setValueAtTime(f, at);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.Q.value = 0.4;
  lp.frequency.setValueAtTime(Math.min(f * 14, 12000), at);
  lp.frequency.exponentialRampToValueAtTime(Math.max(f * 4, 1200), at + tau * 1.2);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(0.2 * vel, at + 0.005);
  g.gain.setTargetAtTime(0.0001, at + 0.005, tau);
  // 손을 떼면 바로 — 다음 음과 겹치지 않게(또박또박)
  const off = at + Math.max(0.08, dur) + 0.03;
  g.gain.setTargetAtTime(0.0001, off, 0.05);
  o.connect(lp).connect(g).connect(out);
  o.start(at);
  const end = off + 0.3;
  o.stop(end);
  return [{ o, end }];
}

/** 🪵 마림바 — 나무 막대를 친 소리 (사인 + ×3.93 배음이 금방 사라진다) */
function bell(ctx, out, f, at, dur, vel) {
  const parts = [[1, 0.19, 0.36], [3.93, 0.045, 0.05], [2, 0.025, 0.1]]; // [배수, 세기, 시간 상수] — 피아노 판과 크기를 맞춤(RMS로 잼)
  const end = at + 1.6;
  return parts.map(([mul, peak, tau]) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f * mul, at);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(peak * vel, at + 0.003);
    g.gain.setTargetAtTime(0.0001, at + 0.003, tau);
    o.connect(g).connect(out);
    o.start(at);
    o.stop(end);
    return { o, end };
  });
}

/** 🎸 베이스 — 세모파를 짧게 튕김 */
function bass(ctx, out, f, at, dur, vel) {
  const o = ctx.createOscillator();
  o.type = 'triangle';
  o.frequency.setValueAtTime(f, at);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(1000, at);
  lp.Q.value = 0.3;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(0.24 * vel, at + 0.006);
  g.gain.setTargetAtTime(0.0001, at + 0.006, 0.28);
  const off = at + Math.max(0.1, dur);
  g.gain.setTargetAtTime(0.0001, off, 0.06);
  o.connect(lp).connect(g).connect(out);
  o.start(at);
  const end = off + 0.4;
  o.stop(end);
  return [{ o, end }];
}

/** 🥁 톡 — 높은 음을 아주 짧게, 음이 살짝 떨어지며 (나무 블록) */
function tick(ctx, out, f, at, dur, vel) {
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(f, at);
  o.frequency.exponentialRampToValueAtTime(f * 0.6, at + 0.03);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(0.06 * vel, at + 0.002);
  g.gain.setTargetAtTime(0.0001, at + 0.002, 0.012);
  o.connect(g).connect(out);
  o.start(at);
  const end = at + 0.15;
  o.stop(end);
  return [{ o, end }];
}

export const VOICES = { piano, bell, bass, tick };

/** 🏛️ 잔향 — 짧고 밝게 사그라지는 잡음 (작은 방) */
export function reverbBuffer(ctx, sec = 1.2) {
  const rate = ctx.sampleRate;
  const len = Math.max(1, Math.floor(rate * sec));
  const buf = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      lp += (Math.random() * 2 - 1 - lp) * 0.6; // 덜 어둡게
      d[i] = lp * Math.pow(1 - i / len, 4);
    }
  }
  return buf;
}

/** 소리를 받는 곳 — 그대로(dry) + 잔향(wet)을 out으로 · 돌려준 노드에 소리를 잇는다 */
export function makeBus(ctx, out) {
  const input = ctx.createGain();
  const dry = ctx.createGain();
  dry.gain.value = 0.9;
  const wet = ctx.createGain();
  wet.gain.value = 0.12;
  const verb = ctx.createConvolver();
  verb.buffer = cached(ctx, 'verb', () => reverbBuffer(ctx));
  input.connect(dry).connect(out);
  input.connect(verb).connect(wet).connect(out);
  return input;
}

/**
 * 한 마디를 at(초, 컨텍스트 시각)부터 예약 → [{ o, end }] (멈출 때 같이 끈다)
 * 손으로 친 것처럼 아주 조금씩 어긋나게(±4ms · 세기 ±5%) — 🥁 톡은 박에 딱 맞게 · rand는 시험이 넘긴다
 */
export function scheduleBar(ctx, input, song, i, pass, at, rand = Math.random) {
  const beat = 60 / song.bpm;
  const live = [];
  for (const ev of barEvents(song, i, pass)) {
    const jitter = ev.voice === 'tick' ? 0 : (rand() - 0.5) * 0.008;
    const t = Math.max(at, at + ev.t * beat + jitter);
    live.push(...VOICES[ev.voice](ctx, input, ev.f, t, ev.d * beat, ev.vel * (0.95 + rand() * 0.1)));
  }
  return live;
}
