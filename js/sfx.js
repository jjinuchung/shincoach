// 🔊 효과음(파일 없이 Web Audio로 합성) + 📳 진동. 설정에서 끌 수 있음.
// 오디오 컨텍스트는 사용자 터치 안에서 만들어야 소리가 나므로, 버튼 핸들러에서 unlock()을 먼저 부른다.

let ctx = null;
let noiseBuf = null;
let soundOn = true;
let vibrateOn = true;

export function setSfxEnabled(on) { soundOn = !!on; }
export function setVibrateEnabled(on) { vibrateOn = !!on; }

/** 사용자 제스처 안에서 호출: 오디오 컨텍스트 생성/재개 */
export function unlock() {
  if (!soundOn) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!ctx) ctx = new AC();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  } catch { /* 오디오 불가 */ }
}

function ac() {
  if (!soundOn || !ctx || ctx.state !== 'running') return null;
  return ctx;
}

/** 단순 음: 주파수(시작→끝), 파형, 길이, 세기 */
function tone(c, { freq, freqEnd, type = 'sine', at = 0, dur = 0.15, gain = 0.18 }) {
  const o = c.createOscillator();
  const g = c.createGain();
  const t0 = c.currentTime + at;
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

/** 바람 소리용 백색소음 (한 번 만들어 재사용) */
function noise(c) {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = c.createBufferSource();
  s.buffer = noiseBuf;
  return s;
}

export const sfx = {
  /** 몬스터볼 날아감: 슝 (소음 + 필터 스윕) */
  whoosh() {
    const c = ac(); if (!c) return;
    const s = noise(c);
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 1.2;
    const g = c.createGain();
    const t0 = c.currentTime;
    f.frequency.setValueAtTime(400, t0);
    f.frequency.exponentialRampToValueAtTime(2200, t0 + 0.35);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.45);
    s.connect(f).connect(g).connect(c.destination);
    s.start(t0);
    s.stop(t0 + 0.5);
  },
  /** 맞음: 퍽 */
  hit() {
    const c = ac(); if (!c) return;
    tone(c, { freq: 220, freqEnd: 60, type: 'square', dur: 0.12, gain: 0.2 });
  },
  /** 볼 흔들림: 톡 */
  tick() {
    const c = ac(); if (!c) return;
    tone(c, { freq: 900, freqEnd: 500, type: 'sine', dur: 0.07, gain: 0.15 });
  },
  /** 잡힘: 띠링♪ (도→미→솔→도) */
  success() {
    const c = ac(); if (!c) return;
    [523, 659, 784, 1047].forEach((f, i) => tone(c, { freq: f, at: i * 0.11, dur: i === 3 ? 0.5 : 0.14, gain: 0.16 }));
  },
  /** 도망감: 뿌웅 (내려가는 두 음) */
  fail() {
    const c = ac(); if (!c) return;
    tone(c, { freq: 330, freqEnd: 260, type: 'triangle', dur: 0.22, gain: 0.15 });
    tone(c, { freq: 262, freqEnd: 180, type: 'triangle', at: 0.22, dur: 0.4, gain: 0.15 });
  },
  /** 레벨 업: 올라가는 팡파르 */
  levelUp() {
    const c = ac(); if (!c) return;
    [392, 523, 659, 784, 1047].forEach((f, i) => tone(c, { freq: f, at: i * 0.09, dur: i === 4 ? 0.6 : 0.12, gain: 0.16, type: 'triangle' }));
  },
  /** 퍼즐 정답: 딩동 */
  ding() {
    const c = ac(); if (!c) return;
    tone(c, { freq: 880, dur: 0.12, gain: 0.14 });
    tone(c, { freq: 1175, at: 0.12, dur: 0.3, gain: 0.14 });
  },
  /** 퍼즐 오답: 삐 (짧고 부드럽게) */
  wrong() {
    const c = ac(); if (!c) return;
    tone(c, { freq: 200, freqEnd: 150, type: 'triangle', dur: 0.25, gain: 0.12 });
  },
};

/** 진동 (지원 기기에서만, 설정 꺼져 있으면 무시) */
export function vibrate(pattern) {
  if (!vibrateOn || !navigator.vibrate) return;
  try { navigator.vibrate(pattern); } catch { /* 무시 */ }
}
