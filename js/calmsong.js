// 🌿 잔잔한 배경 음악 — 곡(악보)과 소리 (v317, 2026-10-22 아버님 "부드럽게 지브리 느낌의 새 곡을 직접 만들어서 넣어봐")
//
// 왜 새 곡인가: 지브리 음악(히사이시 조)은 저작물이라 공개 저장소에 멜로디를 옮겨 넣을 수 없다 (bgm.js의 포켓몬 음악과 같은 까닭).
//   분위기 — 잔잔한 왈츠 · 장7·부가음 화음 · IV–V–iii–vi 진행 · 단조 iv로 끝맺기 · 오르골 — 는 저작물이 아니라서
//   그 느낌으로 **새로 쓴 곡** 셋을 둔다. 곡마다 A(물음) → A′(대답) → B(쉬어 가기) → A′ · 32마디.
// 소리는 파일 없이 Web Audio로 만든다 (효과음 sfx.js·bgm.js와 같은 방식 — 파일 0개 · 오프라인 · 용량 0):
//   🎹 피아노 비슷한 소리 = 배음 몇 개(PeriodicWave) + 시간이 갈수록 어두워지는 필터 + 줄어드는 소리
//   🎐 오르골 = 사인파 + 높은 "땡" 배음 · 🎻 배경 = 살짝 어긋난 톱니파 둘을 필터로 부드럽게 · 🏛️ 울림 = 만든 잔향(ConvolverNode)
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
 *  · 화음: 낮은 음부터 왼손 음들 ('G2 D3 B3 F#4') · 한 마디에 둘이면 '|'로 반씩 나눈다
 *  · 멜로디: '음:박' 띄어 쓰기 ('D5:1 F#5:0.5') · r은 쉼 · 박을 더하면 그 곡의 한 마디 박 수(beats)
 *  · lh 왼손 꼴(waltz 3박 펼침 · arp8 8분음표 펼침) · voice 멜로디 소리(돌 때마다 피아노 ↔ 오르골을 번갈아)
 */
export const SONGS = [
  {
    id: 'hill', title: '바람 언덕', bpm: 84, beats: 3, lh: 'waltz', voice: 'piano',
    parts: {
      A: [
        ['G2 D3 B3 F#4', 'D5:1 F#5:1 A5:1'],
        ['A2 E3 G3 C#4', 'G5:2 F#5:0.5 E5:0.5'],
        ['F#2 C#3 A3 E4', 'F#5:1 E5:1 C#5:1'],
        ['B1 F#2 D3 A3', 'D5:2 A4:1'],
        ['E2 B2 G3 D4', 'B4:1 D5:1 G5:1'],
        ['F#2 C#3 A3 E4', 'A5:1.5 G5:0.5 F#5:1'],
        ['G2 D3 B3 F#4', 'E5:1 F#5:1 G5:1'],
        ['A2 E3 G3 C#4', 'E5:3'],
      ],
      A2: [
        ['G2 D3 B3 F#4', 'D5:1 F#5:1 A5:1'],
        ['A2 E3 G3 C#4', 'B5:2 A5:0.5 G5:0.5'],
        ['F#2 C#3 A3 E4', 'A5:1 F#5:1 E5:1'],
        ['B1 F#2 D3 A3', 'D5:1.5 E5:0.5 F#5:1'],
        ['E2 B2 G3 D4', 'G5:2 E5:1'],
        ['A2 E3 G3 C#4', 'C#5:1 E5:1 G5:1'],
        ['D2 A2 F#3 D4', 'F#5:2 E5:1'],
        ['D2 Bb2 E3 G3', 'D5:3'], // Gm6/D — 단조 iv로 끝맺기
      ],
      B: [
        ['B1 F#2 D3 B3', 'F#5:1 D5:1 B4:1'],
        ['G2 D3 G3 B3', 'B4:2 D5:1'],
        ['F#2 D3 A3 D4', 'A4:1.5 B4:0.5 A4:1'],
        ['E2 B2 G3 D4', 'G4:2 B4:1'],
        ['B1 F#2 D3 B3', 'F#5:1 E5:1 D5:1'],
        ['G2 D3 G3 B3', 'E5:1.5 D5:0.5 B4:1'],
        ['E2 B2 G3 D4', 'D5:1 E5:1 F#5:1'],
        ['A2 E3 G3 C#4', 'G5:1.5 F#5:0.5 E5:1'],
      ],
    },
    form: ['A', 'A2', 'B', 'A2'],
  },
  {
    id: 'garden', title: '오르골 정원', bpm: 76, beats: 4, lh: 'arp8', voice: 'box',
    parts: {
      A: [
        ['C3 G3 C4 E4', 'E5:0.5 G5:0.5 C6:1 B5:0.5 G5:0.5 E5:1'],
        ['B2 D3 G3 B3', 'D5:0.5 G5:0.5 B5:1 A5:1 G5:1'],
        ['A2 E3 G3 C4', 'C5:0.5 E5:0.5 A5:1 G5:0.5 E5:0.5 C5:1'],
        ['G2 E3 G3 B3', 'B4:1 E5:1 G5:2'],
        ['F2 C3 E3 A3', 'A5:1.5 G5:0.5 F5:0.5 E5:0.5 C5:1'],
        ['E2 C3 E3 G3', 'G5:1.5 E5:0.5 C5:2'],
        ['D3 A3 C4 F4', 'D5:0.5 F5:0.5 A5:1 C6:1 A5:1'],
        ['G2 D3 F3 B3', 'G5:3 r:1'],
      ],
      A2: [
        ['C3 G3 C4 E4', 'E5:0.5 G5:0.5 C6:1 D6:0.5 C6:0.5 G5:1'],
        ['B2 D3 G3 B3', 'B5:1.5 A5:0.5 G5:2'],
        ['A2 E3 G3 C4', 'A5:0.5 G5:0.5 E5:1 C5:1 E5:1'],
        ['G2 E3 G3 B3', 'D5:2 B4:2'],
        ['F2 C3 E3 A3', 'C5:0.5 F5:0.5 A5:1 G5:0.5 F5:0.5 E5:1'],
        ['G2 D3 G3 B3', 'D5:1 G5:1 B5:1 D6:1'],
        ['G2 D3 F3 B3', 'F5:1 E5:1 D5:1 B4:1'],
        ['C3 G3 C4 E4', 'C5:4'],
      ],
      B: [
        ['A2 E3 A3 C4', 'A5:1.5 B5:0.5 C6:1 A5:1'],
        ['E2 B2 E3 G3', 'G5:2 E5:2'],
        ['F2 C3 F3 A3', 'F5:1 A5:1 C6:1.5 B5:0.5'],
        ['C3 G3 C4 E4', 'G5:4'],
        ['D3 A3 C4 F4', 'F5:0.5 E5:0.5 D5:1 A5:1 F5:1'],
        ['E2 B2 D3 G3', 'G5:0.5 F5:0.5 E5:1 B5:1 G5:1'],
        ['F2 C3 E3 A3', 'A5:1 C6:1 E6:1 D6:1'],
        ['G2 D3 F3 B3', 'D6:2 B5:1 G5:1'],
      ],
    },
    form: ['A', 'A2', 'B', 'A2'],
  },
  {
    id: 'summer', title: '여름 오후', bpm: 66, beats: 4, lh: 'arp8', voice: 'piano',
    parts: {
      A: [
        ['G2 D3 B3 F#4', 'B4:1 D5:1 F#5:2'],
        ['G2 E3 A3 C#4', 'E5:1.5 D5:0.5 C#5:2'], // A/G — 꿈꾸는 듯한 리디안 II
        ['B1 F#2 D3 A3', 'D5:1 F#5:1 A5:1.5 F#5:0.5'],
        ['E2 B2 G3 D4', 'G5:2 E5:1 D5:1'],
        ['C3 G3 B3 E4', 'E5:1 G5:1 B5:2'],
        ['D3 A3 D4 F#4', 'A5:1.5 G5:0.5 F#5:2'],
        ['B1 F#2 D3 A3 | E2 B2 D3 G#3', 'F#5:1 D5:1 E5:1 G#5:1'],
        ['A2 E3 G3 C4 | D3 A3 C4 F#4', 'A5:2 F#5:1 D5:1'],
      ],
      A2: [
        ['G2 D3 B3 F#4', 'B4:1 D5:1 G5:2'],
        ['G2 E3 A3 C#4', 'F#5:1 E5:1 C#5:2'],
        ['B1 F#2 D3 A3', 'D5:1.5 E5:0.5 F#5:1 B5:1'],
        ['E2 B2 G3 D4', 'A5:1 G5:1 E5:2'],
        ['C3 G3 B3 E4', 'G5:1 B5:1 C6:2'],
        ['D3 A3 D4 F#4', 'A5:1 F#5:1 D5:2'],
        ['A2 E3 G3 C4 | D3 A3 C4 F#4', 'E5:1 C5:1 D5:1 F#5:1'],
        ['G2 D3 G3 B3', 'G5:4'],
      ],
      B: [
        ['E2 B2 G3 B3', 'G5:1.5 F#5:0.5 E5:2'],
        ['C3 G3 B3 E4', 'E5:1 G5:1 B5:1 G5:1'],
        ['B1 G2 D3 G3', 'D5:1.5 E5:0.5 D5:1 B4:1'],
        ['A2 E3 G3 C4', 'C5:2 E5:2'],
        ['E2 B2 G3 B3', 'B4:1 E5:1 G5:1 B5:1'],
        ['C3 G3 C4 E4', 'C6:1.5 B5:0.5 G5:1 E5:1'],
        ['A2 E3 G3 C4', 'A5:1 G5:1 E5:1 C5:1'],
        ['D3 A3 C4 G4 | D3 A3 C4 F#4', 'D5:2 E5:1 F#5:1'],
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

// 왼손 펼침 차례 — 화음 음 번호(넘치면 한 옥타브 위) · 8분음표마다
const LH = { waltz: [0, 1, 2, 3, 2, 1], arp8: [0, 1, 2, 3, 2, 1, 2, 3] };

/**
 * 한 마디에 낼 소리 (순수) — [{ voice: piano|box|pad, f, t 박, d 박, vel }]
 * pass = 곡이 몇 번째 도는가 — 홀수 번째면 멜로디 소리를 바꾼다 (피아노 ↔ 오르골, 같은 곡이 덜 물리게)
 */
export function barEvents(song, i, pass = 0) {
  const bars = songBars(song);
  const bar = bars[((i % bars.length) + bars.length) % bars.length];
  const melVoice = pass % 2 ? (song.voice === 'box' ? 'piano' : 'box') : song.voice;
  const out = [];
  for (const n of bar.mel) if (n.f) out.push({ voice: melVoice, f: n.f, t: n.t, d: n.d, vel: 0.9 });
  for (const c of bar.chords) {
    const tones = c.tones.filter((f) => f > 0);
    if (!tones.length) continue;
    // 마디 통째면 곡의 꼴, 반 마디면 앞 넷만 (화음이 바뀌는 자리에서 다시 낮은 음부터)
    const steps = Math.round(c.d * 2);
    const pat = c.d === song.beats ? LH[song.lh] : [0, 1, 2, 3];
    for (let k = 0; k < steps; k++) {
      const idx = pat[k % pat.length];
      const f = tones[idx % tones.length] * Math.pow(2, Math.floor(idx / tones.length));
      // 페달을 밟은 것처럼 화음이 끝날 때까지 울린다
      out.push({ voice: 'piano', f, t: c.t + k / 2, d: c.d - k / 2, vel: k === 0 ? 0.5 : 0.34 });
    }
    // 🎻 배경 — 가장 낮은 음은 빼고 C3 위로
    for (const f of tones.slice(1)) out.push({ voice: 'pad', f: f < 130 ? f * 2 : f, t: c.t, d: c.d, vel: 1 });
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
  // 배음 세기 — 1번(바탕)이 가장 크고 위로 갈수록 작게 (펠트 피아노처럼 둥글게)
  const amp = [0, 1, 0.42, 0.18, 0.1, 0.05, 0.03];
  return cached(ctx, 'piano', () => ctx.createPeriodicWave(new Float32Array(amp.length), Float32Array.from(amp)));
}

/** 소리가 줄어드는 빠르기(초, 시간 상수) — 낮은 음일수록 길게 울린다 */
export function decayOf(f) {
  return Math.min(1.3, Math.max(0.35, 0.8 * Math.pow(262 / f, 0.4)));
}

/** 🎹 피아노 — 낸 오실레이터와 멈출 때 [{ o, end }] */
function piano(ctx, out, f, at, dur, vel) {
  const tau = decayOf(f);
  const o = ctx.createOscillator();
  o.setPeriodicWave(pianoWave(ctx));
  o.frequency.setValueAtTime(f, at);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.Q.value = 0.4;
  lp.frequency.setValueAtTime(Math.min(f * 8, 8000), at);
  lp.frequency.exponentialRampToValueAtTime(Math.max(f * 2.2, 500), at + tau * 1.5);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(0.22 * vel, at + 0.008);
  g.gain.setTargetAtTime(0.0001, at + 0.008, tau);
  // 손을 떼면(박이 끝나면) 댐퍼가 내려앉듯 — 이어지는 음과 살짝 겹치게
  const off = at + Math.max(0.12, dur) + 0.05;
  g.gain.setTargetAtTime(0.0001, off, 0.09);
  o.connect(lp).connect(g).connect(out);
  o.start(at);
  const end = off + 0.6;
  o.stop(end);
  return [{ o, end }];
}

/** 🎐 오르골 — 손을 떼도 울린다 (판이 튕긴 소리) */
function box(ctx, out, f, at, dur, vel) {
  const parts = [[1, 0.2, 0.55], [2, 0.05, 0.3], [4, 0.06, 0.08]]; // [배수, 세기, 시간 상수]
  const end = at + 3;
  return parts.map(([mul, peak, tau]) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f * mul, at);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(peak * vel, at + 0.004);
    g.gain.setTargetAtTime(0.0001, at + 0.004, tau);
    o.connect(g).connect(out);
    o.start(at);
    o.stop(end);
    return { o, end };
  });
}

/** 🎻 배경 — 천천히 들어왔다 천천히 빠진다 */
function pad(ctx, out, f, at, dur, vel) {
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(900, at);
  lp.Q.value = 0.2;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.setTargetAtTime(0.03 * vel, at, 0.5);
  g.gain.setTargetAtTime(0.0001, at + dur, 0.6);
  lp.connect(g).connect(out);
  const end = at + dur + 3;
  return [-6, 6].map((cents) => {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f, at);
    o.detune.setValueAtTime(cents, at);
    o.connect(lp);
    o.start(at);
    o.stop(end);
    return { o, end };
  });
}

export const VOICES = { piano, box, pad };

/** 🏛️ 잔향 — 어두워지며 사그라지는 잡음 (방에서 울리는 소리) */
export function reverbBuffer(ctx, sec = 2.4) {
  const rate = ctx.sampleRate;
  const len = Math.max(1, Math.floor(rate * sec));
  const buf = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      lp += (Math.random() * 2 - 1 - lp) * 0.35; // 조금 어둡게
      d[i] = lp * Math.pow(1 - i / len, 3);
    }
  }
  return buf;
}

/** 소리를 받는 곳 — 그대로(dry) + 잔향(wet)을 out으로 · 돌려준 노드에 소리를 잇는다 */
export function makeBus(ctx, out) {
  const input = ctx.createGain();
  const dry = ctx.createGain();
  dry.gain.value = 0.8;
  const wet = ctx.createGain();
  wet.gain.value = 0.32;
  const verb = ctx.createConvolver();
  verb.buffer = cached(ctx, 'verb', () => reverbBuffer(ctx));
  input.connect(dry).connect(out);
  input.connect(verb).connect(wet).connect(out);
  return input;
}

/**
 * 한 마디를 at(초, 컨텍스트 시각)부터 예약 → [{ o, end }] (멈출 때 같이 끈다)
 * 손으로 친 것처럼 아주 조금씩 어긋나게(±6ms · 세기 ±5%) — rand는 시험이 넘긴다
 */
export function scheduleBar(ctx, input, song, i, pass, at, rand = Math.random) {
  const beat = 60 / song.bpm;
  const live = [];
  for (const ev of barEvents(song, i, pass)) {
    const jitter = ev.voice === 'pad' ? 0 : (rand() - 0.5) * 0.012;
    const t = Math.max(at, at + ev.t * beat + jitter);
    live.push(...VOICES[ev.voice](ctx, input, ev.f, t, ev.d * beat, ev.vel * (0.95 + rand() * 0.1)));
  }
  return live;
}
