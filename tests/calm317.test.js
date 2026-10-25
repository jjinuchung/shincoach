// v317 (2026-10-22 아버님 "부드럽게 지브리 느낌의 새 곡을 직접 만들어서 넣어봐") — node --test tests/calm317.test.js
//  🌿 국어·논술 잔잔한 배경 음악 — 새로 쓴 곡 셋(calmsong.js) · 틀고 멈추기(calm.js) · 🎵 단추 · 📤 usage 한 줄
//  ▶ v340: 소리는 ⚙에서 고른 곡 파일(calmfiles.js) — 새로 쓴 곡 시험(🎼·🎹)은 시험 듣기 페이지·되돌릴 때를 위해 그대로 · 틀고 멈추기 시험은 가짜 <audio>로
import { fakeIdb } from './fakeidb.js'; // ★ db.js보다 먼저
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SONGS, noteFreq, parseMelody, parseChords, songBars, barSec, barEvents, scheduleBar, makeBus, decayOf } from '../js/calmsong.js';
import { getDaily, mergeDailyDelta, emptyDaily } from '../js/db.js';
import { usageFiles } from '../js/upload.js';
import { PLACES } from '../js/usage.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const near = (a, b) => Math.abs(a - b) < 1e-6;
void fakeIdb;

// ───────────────────── 가짜 오디오 ─────────────────────
// 진짜 브라우저처럼: 지수 램프를 0 이하로 · 시간 상수 0 이하 · 시각이 음수면 던진다

class Param {
  constructor(v = 0) { this.value = v; this.ev = []; }
  #chk(v, t) { if (!Number.isFinite(v) || !Number.isFinite(t) || t < 0) throw new RangeError(`bad automation ${v} @ ${t}`); }
  setValueAtTime(v, t) { this.#chk(v, t); this.ev.push(['set', v, t]); return this; }
  linearRampToValueAtTime(v, t) { this.#chk(v, t); this.ev.push(['lin', v, t]); return this; }
  exponentialRampToValueAtTime(v, t) { this.#chk(v, t); if (!(v > 0)) throw new RangeError('exp ramp to non-positive'); this.ev.push(['exp', v, t]); return this; }
  setTargetAtTime(v, t, c) { this.#chk(v, t); if (!(c > 0)) throw new RangeError('time constant'); this.ev.push(['target', v, t, c]); return this; }
  cancelScheduledValues(t) { this.ev.push(['cancel', 0, t]); return this; }
  cancelAndHoldAtTime(t) { this.#chk(0, t); this.ev.push(['hold', 0, t]); return this; }
}
function node(kind) {
  return { kind, out: [], cut: false, connect(n) { this.out.push(n); return n; }, disconnect() { this.cut = true; } };
}
class FakeCtx {
  constructor() { this.currentTime = 0; this.sampleRate = 8000; this.state = 'running'; this.destination = node('dest'); this.oscs = []; this.gains = []; this.convolvers = []; }
  createGain() { const n = node('gain'); n.gain = new Param(1); this.gains.push(n); return n; }
  createOscillator() {
    const n = node('osc');
    Object.assign(n, { frequency: new Param(440), detune: new Param(0), type: 'sine', t0: null, t1: null, stops: 0 });
    n.start = (t) => { if (n.t0 !== null) throw new Error('start twice'); n.t0 = t; };
    n.stop = (t) => { n.t1 = t; n.stops += 1; };
    n.setPeriodicWave = (w) => { n.wave = w; };
    this.oscs.push(n);
    return n;
  }
  createBiquadFilter() { const n = node('filter'); n.frequency = new Param(350); n.Q = new Param(1); n.type = 'lowpass'; return n; }
  createPeriodicWave(real, imag) { return { real, imag }; }
  createConvolver() { const n = node('convolver'); n.buffer = null; this.convolvers.push(n); return n; }
  createBuffer(ch, len, rate) { const d = Array.from({ length: ch }, () => new Float32Array(len)); return { numberOfChannels: ch, length: len, sampleRate: rate, getChannelData: (c) => d[c] }; }
  resume() { this.state = 'running'; return Promise.resolve(); }
}

// ───────────────────── 곡 원고 ─────────────────────

test('🎼 음이름 → 주파수 — A4 440 · 올림·내림 · 꼴이 틀리면 0', () => {
  assert.ok(near(noteFreq('A4'), 440));
  assert.ok(Math.abs(noteFreq('C4') - 261.6256) < 1e-3);
  assert.ok(near(noteFreq('Bb2'), noteFreq('A#2')));
  assert.ok(near(noteFreq('F#5') * 2, noteFreq('F#6')));
  assert.deepEqual(['', 'H4', 'C', 'C#', 'Cb', 'c4', null, 'C10'].map(noteFreq), [0, 0, 0, 0, 0, 0, 0, 0]);
});

test('🎼 곡 셋 — 이름 · 32마디(A A′ B A′) · 마디마다 박 합이 곡의 박 수 · 음이름이 모두 읽힌다', () => {
  assert.equal(SONGS.length, 3);
  assert.equal(new Set(SONGS.map((s) => s.id)).size, 3);
  for (const s of SONGS) {
    // v330 진우 "너무 느리고 음산해 — 밝고 경쾌하고 빠르게" → 110~140 (v317은 66~84)
    assert.ok(s.title && s.bpm >= 110 && s.bpm <= 140, `${s.id} 경쾌한 빠르기 ${s.bpm}`);
    assert.ok([3, 4].includes(s.beats));
    assert.ok(['bounce', 'skip', 'alberti'].includes(s.lh) && ['bell', 'piano'].includes(s.voice), `${s.id} 반주·소리`);
    assert.deepEqual(s.form, ['A', 'A2', 'B', 'A2']);
    assert.equal(songBars(s).length, 32);
    for (const [part, bars] of Object.entries(s.parts)) {
      assert.equal(bars.length, 8, `${s.id} ${part} 8마디`);
      bars.forEach(([c, m], i) => {
        const mel = parseMelody(m);
        const sum = mel.reduce((a, n) => a + n.d, 0);
        assert.ok(near(sum, s.beats), `${s.id} ${part}${i + 1} 박 합 ${sum}`);
        assert.ok(mel.every((n) => n.d > 0 && (n.n === '' ? n.f === 0 : n.f > 0)), `${s.id} ${part}${i + 1} 음이름`);
        const ch = parseChords(c, s.beats);
        assert.ok(ch.length === 1 || ch.length === 2);
        // 반주 꼴에 맞는 음 수 — 알베르티 = 뿌리 + 위 화음 셋 · 쿵-짝·뒷박 = 뿌리 + 5도 + 위 화음 셋
        assert.ok(ch.every((x) => x.tones.length === (s.lh === 'alberti' ? 4 : 5) && x.tones.every((f) => f > 0)), `${s.id} ${part}${i + 1} 화음`);
        // 왼손은 낮은 음부터 (펼침이 위로 올라간다)
        assert.ok(ch.every((x) => x.tones.every((f, k) => k === 0 || f > x.tones[k - 1])), `${s.id} ${part}${i + 1} 낮은 음부터`);
      });
    }
  }
});

test('🎼 음역 — 멜로디는 C5~E6(밝게 · v330) · 왼손은 B1~G4 · 끝 마디는 으뜸화음(단조로 끝맺지 않음)', () => {
  for (const s of SONGS) {
    for (const bar of songBars(s)) {
      for (const n of bar.mel) if (n.f) assert.ok(n.f >= noteFreq('C5') - 1e-6 && n.f <= noteFreq('E6') + 1e-6, `${s.id} 멜로디 ${n.n}`);
      for (const c of bar.chords) for (const f of c.tones) assert.ok(f >= noteFreq('B1') - 1e-6 && f <= noteFreq('G4') + 1e-6, `${s.id} 왼손 ${f}`);
    }
    // 곡 끝(A′ 마지막 마디)과 첫 마디의 뿌리가 같다 — 으뜸화음으로 끝 (v317은 단조 iv로 끝맺어 음산했다)
    const bars = songBars(s);
    const root = (b) => b.chords[b.chords.length - 1].tones[0];
    const pc = (f) => Math.round(12 * Math.log2(f / 440) + 120) % 12;
    assert.equal(pc(root(bars[bars.length - 1])), pc(bars[0].chords[0].tones[0]), `${s.id} 으뜸화음으로 끝`);
  }
});

test('🎹 한 마디의 소리 — 멜로디(살짝 떼어) · 반주(1·3박 베이스 · 꼴마다 화음) · 🥁 톡 · 배경 웅~ 없음 · 모두 마디 안 · 홀수 번째 돌기는 멜로디 소리를 바꾼다', () => {
  for (const s of SONGS) {
    const bars = songBars(s);
    bars.forEach((bar, i) => {
      const ev = barEvents(s, i, 0);
      const mel = ev.filter((e) => e.voice === s.voice && e.vel === 0.9);
      assert.equal(mel.length, bar.mel.filter((n) => n.f).length, `${s.id} ${i} 멜로디 수`);
      const bass = ev.filter((e) => e.voice === 'bass');
      assert.equal(bass.length, bar.chords.reduce((a, c) => a + Math.ceil(c.d / 2), 0), `${s.id} ${i} 베이스는 1·3박`);
      assert.ok(bass.every((e) => e.t % 2 === 0), `${s.id} ${i} 베이스 자리`);
      const acc = ev.filter((e) => e.voice === 'piano' && e.vel !== 0.9);
      // 4박 마디 — 알베르티 8분마다 하나(8) · 뒷박 4번 × 위 화음 셋(12) · 쿵-짝 2·4박 2번 × 셋(6) (반 마디 화음이어도 같다)
      assert.equal(acc.length, { alberti: 8, skip: 12, bounce: 6 }[s.lh], `${s.id} ${i} 반주 수`);
      assert.ok(ev.some((e) => e.voice === 'tick'), `${s.id} ${i} 🥁 톡`);
      assert.ok(!ev.some((e) => e.voice === 'pad' || e.voice === 'box'), '웅~ 배경·오르골 없음');
      assert.ok(ev.every((e) => e.t >= 0 && e.d > 0 && e.t + e.d <= s.beats + 1e-9 && e.f > 0 && e.vel > 0 && e.vel <= 1), `${s.id} ${i} 마디 안`);
    });
    const other = s.voice === 'bell' ? 'piano' : 'bell';
    assert.equal(barEvents(s, 0, 1).filter((e) => e.vel === 0.9).every((e) => e.voice === other), true, `${s.id} 둘째 돌기는 ${other}`);
    assert.equal(barEvents(s, 0, 2).filter((e) => e.vel === 0.9).every((e) => e.voice === s.voice), true);
  }
  // 반 마디씩 화음이 바뀌면 베이스도 그 자리에서 그 화음 뿌리 (아침 산책 A′ 7마디 Dm | G)
  const walk = SONGS.find((s) => s.id === 'walk');
  const bass = barEvents(walk, 14, 0).filter((e) => e.voice === 'bass');
  assert.ok(near(bass.find((e) => e.t === 0).f, noteFreq('D2')));
  assert.ok(near(bass.find((e) => e.t === 2).f, noteFreq('G2')));
  assert.ok(bass.filter((e) => e.t < 2).every((e) => e.t + e.d <= 2 + 1e-9), '앞 화음은 반 마디에서 끝');
  // 쿵-짝 — 3박 베이스는 5도 · 2·4박 화음 콕
  const b0 = barEvents(walk, 0, 0);
  assert.ok(near(b0.find((e) => e.voice === 'bass' && e.t === 2).f, noteFreq('G2')), '3박은 5도');
  assert.deepEqual([...new Set(b0.filter((e) => e.voice === 'piano' && e.vel !== 0.9).map((e) => e.t))], [1, 3]);
  // 알베르티 — 위 화음을 아래-위-가운데-위로 (종이비행기 1마디 G: G3 B3 D4 → G3 D4 B3 D4 G3 D4 B3 D4)
  const plane = SONGS.find((s) => s.id === 'plane');
  const alb = barEvents(plane, 0, 0).filter((e) => e.voice === 'piano' && e.vel !== 0.9).sort((a, b) => a.t - b.t);
  assert.deepEqual(alb.map((e) => e.t), [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5]);
  ['G3', 'D4', 'B3', 'D4', 'G3', 'D4', 'B3', 'D4'].forEach((n, k) => assert.ok(near(alb[k].f, noteFreq(n)), `알베르티 ${k + 1}번째 ${n}`));
});

test('🥁 톡 자리 — 쿵-짝·알베르티는 8분 뒷박(0.5·1.5·2.5·3.5) · 뒷박 꼴은 2·4박 · 반 마디 화음이어도 같다 · 쿵-짝은 화음과 안 겹치고 알베르티는 피아노와 겹친다(들으신 소리 그대로 — 🔍 Codex 134차 #1)', () => {
  const want = { bounce: [0.5, 1.5, 2.5, 3.5], alberti: [0.5, 1.5, 2.5, 3.5], skip: [1, 3] };
  for (const s of SONGS) {
    songBars(s).forEach((bar, i) => {
      const ev = barEvents(s, i, 0);
      const ticks = ev.filter((e) => e.voice === 'tick').map((e) => e.t).sort((a, b) => a - b);
      assert.deepEqual(ticks, want[s.lh], `${s.id} ${i + 1}마디${bar.chords.length > 1 ? '(반 마디 화음)' : ''}`);
      const acc = new Set(ev.filter((e) => e.voice === 'piano' && e.vel !== 0.9).map((e) => e.t));
      const overlap = ticks.filter((t) => acc.has(t)).length;
      if (s.lh === 'alberti') assert.equal(overlap, 4, `${s.id} ${i + 1} 알베르티는 겹침`);
      else assert.equal(overlap, 0, `${s.id} ${i + 1} 화음이 안 치는 칸`);
    });
  }
});

test('🎹 소리 예약 — 시작은 at 뒤 · 멈춤은 시작 뒤 · 지수 램프가 0을 향하지 않는다 · 세기 윗값 · 잔향은 컨텍스트마다 한 번 · 반 마디 화음 마디·흔들림 양 끝값까지', () => {
  for (const s of SONGS) {
    const half = songBars(s).findIndex((b) => b.chords.length > 1); // 반 마디 화음 마디 (세 곡 모두 있다)
    assert.ok(half >= 0, `${s.id} 반 마디 화음 마디`);
    for (const [bar, rand] of [[3, () => 0.5], [half, () => 0], [half, () => 0.999999], [31, () => 0.999999]]) {
      for (const pass of [0, 1]) {
        const ctx = new FakeCtx();
        const input = makeBus(ctx, ctx.destination);
        const at = 1.25;
        const live = scheduleBar(ctx, input, s, bar, pass, at, rand);
        assert.ok(live.length > 0 && live.length === ctx.oscs.length);
        for (const o of ctx.oscs) {
          assert.ok(o.t0 >= at - 1e-9, '시작은 at 뒤');
          assert.ok(o.t1 > o.t0, '멈춤은 시작 뒤');
          assert.ok(o.t1 <= at + barSec(s) + 1.7, `${s.id} ${bar} 멈춤이 마디 끝 뒤 1.7초 안(마림바가 가장 길다)`);
        }
        assert.ok(live.every(({ o, end }) => near(o.t1, end)));
        // 소리마다 가장 큰 세기 (첫 몸통 세기) — 흔들림 윗값(rand → 1)이어도
        for (const g of ctx.gains) for (const e of g.gain.ev) if (e[0] === 'lin') assert.ok(e[1] <= 0.25, `세기 ${e[1]}`);
      }
    }
  }
  const ctx = new FakeCtx();
  makeBus(ctx, ctx.destination);
  makeBus(ctx, ctx.destination);
  assert.equal(ctx.convolvers.length, 2);
  assert.equal(ctx.convolvers[0].buffer, ctx.convolvers[1].buffer, '잔향 버퍼는 한 번 만들어 같이 쓴다');
  assert.equal(ctx.convolvers[0].buffer.numberOfChannels, 2);
  // 낮은 음일수록 길게 울린다 · 윗값·아랫값
  assert.ok(decayOf(noteFreq('G2')) > decayOf(noteFreq('C4')) && decayOf(noteFreq('C4')) > decayOf(noteFreq('A5')));
  assert.equal(decayOf(20), 0.9); // v330 — 전보다 짧게(경쾌하게 · v317은 1.3·0.35)
  assert.equal(decayOf(20000), 0.25);
});

test('🎼 calmsong.js는 아무것도 import하지 않는다 (시험 듣기 페이지가 그대로 붙여 쓴다) · 곡은 새로 쓴 것이라고 적혀 있다', () => {
  const src = read('js/calmsong.js');
  assert.ok(!/^\s*import\s/m.test(src));
  assert.ok(src.includes('저작물') && src.includes('새로 쓴 곡'));
});

// ───────────────────── 틀고 멈추기 (calm.js) ─────────────────────
// v340부터 소리는 ⚙에서 고른 곡 파일(calmfiles.js — <audio> 하나) · 여기 시험은 가짜 <audio>·곡 목록으로 "언제 틀고 멈추나"를 본다
// (곡 고르기·섞기·깨진 곡 자체는 tests/calm340.test.js)

const mem = new Map();
const els = {};
const docL = {};
const winL = {};
const synth = { speaking: false, pending: false };
function fakeBtn() {
  const b = { textContent: '🎵', title: '', attrs: {}, click: null };
  b.addEventListener = (type, fn) => { if (type === 'click') b.click = fn; };
  b.setAttribute = (k, v) => { b.attrs[k] = v; };
  return b;
}
const buttons = [fakeBtn(), fakeBtn()];
/** 가짜 <audio> — play()는 막혔으면(block) 거절 · 아니면 곧 재생 */
class FakeAudio {
  constructor() { this.src = ''; this.paused = true; this.volume = 1; this.preload = ''; this.l = {}; this.plays = 0; this.pauses = 0; }
  addEventListener(t, f) { (this.l[t] ||= []).push(f); }
  fire(t) { for (const f of this.l[t] || []) f(); }
  play() {
    this.plays += 1;
    if (FakeAudio.block) return Promise.reject(Object.assign(new Error('막힘'), { name: 'NotAllowedError' }));
    this.paused = false;
    return Promise.resolve();
  }
  pause() { this.paused = true; this.pauses += 1; }
  removeAttribute(k) { if (k === 'src') this.src = ''; }
  load() {}
}
FakeAudio.block = false;
const audios = [];
const ITEMS = [1, 2, 3, 4, 5].map((n) => ({ id: `music:${n}`, name: `0${n} 곡${n}.m4a`, size: 1000 }));
let calm;
let files;

before(async () => {
  globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); }, removeItem: (k) => { mem.delete(k); } };
  mem.set('shincoach.calmTrack', 'music:3'); // 지난번 마지막 곡
  globalThis.window = { AudioContext: FakeCtx, speechSynthesis: synth, addEventListener: (t, fn) => { winL[t] = fn; } };
  globalThis.document = {
    hidden: false,
    getElementById: (id) => els[id] || null,
    querySelectorAll: (sel) => (sel === '[data-calm]' ? buttons : []),
    addEventListener: (t, fn) => { docL[t] = fn; },
  };
  await getDaily('2000-01-01'); // 가짜 저장소 열기
  files = await import('../js/calmfiles.js');
  files.setCalmMusicDeps({
    makeAudio: () => { const a = new FakeAudio(); audios.push(a); return a; },
    loadList: async () => ({ id: 'music:list', items: ITEMS, at: 1 }),
    loadBlob: async (id) => ({ id, size: 1000 }),
    makeUrl: (b) => `blob:${b.id}`,
    revokeUrl: () => {},
  });
  calm = await import('../js/calm.js');
  calm.CALM.tick = 0; // 저절로 돌지 않게 — calmTick을 직접 부른다
  calm.initCalm();
  await settle(); // 곡 목록 읽기
});

const aud = () => audios[0];
const today = () => { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
const settle = (ms = 30) => new Promise((r) => setTimeout(r, ms));
// 🎧 "마지막으로 읽던 때"를 10초 전으로 — 뒤 시험이 진짜 시계로 3초 쉬는 시간에 걸리지 않게
const quiet = () => { synth.speaking = true; calm.calmTick(Date.now() - 10_000); synth.speaking = false; synth.pending = false; calm.calmTick(); };

test('🌿 국어·논술에 들어오면 튼다 — 넣어 둔 곡을 무작위 차례로 · 지난번 마지막 곡은 맨 앞이 아님 · 천천히 들어온다 · 🎵 단추는 켬 (v340)', async () => {
  assert.equal(calm.calmState().playing, false);
  assert.equal(calm.calmBlock(), 'view');
  assert.equal(audios.length, 0, '들어오기 전엔 <audio>도 없다');
  calm.enterCalm();
  const st = calm.calmState();
  assert.equal(st.playing, true);
  assert.equal(st.timer, false, '시험에서는 타이머 없이');
  await settle();
  const m = calm.calmState().music;
  assert.equal(m.count, 5);
  assert.notEqual(m.order[0], 2, '지난번 마지막 곡(music:3)은 맨 앞에 안 온다');
  assert.equal(m.track, ITEMS[m.order[0]].name);
  assert.equal(aud().src, `blob:${ITEMS[m.order[0]].id}`);
  assert.equal(aud().paused, false);
  assert.ok(aud().volume < files.CALM_FILE.volume, '천천히 들어온다(아직 다 안 올라옴)');
  assert.equal(mem.get('shincoach.calmTrack'), ITEMS[m.order[0]].id, '지금 곡을 이 기기에 — 다음에 켤 때 맨 앞에 안 오게');
  assert.ok(buttons.every((b) => b.textContent === '🎵' && b.attrs['aria-pressed'] === 'true'));
  await settle(calm.CALM.fadeIn * 1000 + 150);
  assert.ok(Math.abs(aud().volume - files.CALM_FILE.volume) < 1e-9, '다 들어오면 정한 음량');
});

test('🌿 곡이 끝나면 다음 곡 — 한 바퀴 안에선 겹치지 않음 · 다 돌면 다시 섞고 바로 앞 곡은 맨 앞에 안 옴 · 넘어간 곡은 정한 음량으로 바로', async () => {
  const seen = [calm.calmState().music.track];
  for (let k = 0; k < 4; k++) { aud().fire('ended'); await settle(); seen.push(calm.calmState().music.track); }
  assert.equal(new Set(seen).size, 5, '다섯 곡이 한 번씩');
  const last = seen[4];
  aud().fire('ended');
  await settle();
  assert.notEqual(calm.calmState().music.track, last, '다시 섞어도 같은 곡이 연달아 오지 않는다');
  assert.equal(aud().paused, false);
  assert.ok(Math.abs(aud().volume - files.CALM_FILE.volume) < 1e-9, '곡 사이엔 천천히 들어오지 않는다(곡마다 제 도입부)');
  assert.equal(audios.length, 1, '<audio>는 하나');
});

test('🌿 깨진 곡(error)은 건너뛰고 다음 곡 · 비운 주소의 늦은 오류는 무시', async () => {
  const before = calm.calmState().music.track;
  aud().fire('error');
  await settle();
  const m = calm.calmState().music;
  assert.equal(m.bad, 1);
  assert.notEqual(m.track, before);
  assert.equal(aud().paused, false);
  assert.equal(calm.calmState().playing, true);
});

test('🌿 위에 창이 뜨면(🎯 잡기·⏳ 잠금 …) 빼고 멈춤 · 닫히면 그 곡 그 자리에서 다시', async () => {
  for (const id of ['catch', 'timeup', 'battle', 'shop']) {
    els[id] = { hidden: false };
    calm.calmTick();
    assert.equal(calm.calmState().playing, false, id);
    assert.equal(calm.calmBlock(), 'overlay');
    els[id].hidden = true;
    calm.calmTick();
    assert.equal(calm.calmState().playing, true, `${id} 닫힘`);
  }
  const track = calm.calmState().music.track;
  const src = aud().src;
  els.catch.hidden = false;
  calm.calmTick();
  await settle(calm.CALM.fadeOut * 1000 + 150);
  assert.equal(aud().paused, true, '빠진 뒤 멈춘다');
  assert.equal(aud().volume, 0);
  els.catch.hidden = true;
  calm.calmTick();
  assert.equal(calm.calmState().playing, true);
  assert.equal(aud().paused, false);
  assert.equal(aud().src, src, '같은 곡');
  assert.equal(calm.calmState().music.track, track);
});

test('🌿 🎧 ▶를 누르는 순간(ttsstart) 0.25초 만에 뺀다 · 말이 시작되기 전 · 말이 안 나오면 3초 뒤 다시 (Codex 123차 #1)', async () => {
  assert.equal(calm.calmState().playing, true);
  winL['shincoach:ttsstart']();
  assert.equal(calm.calmState().playing, false, '타이머를 기다리지 않는다');
  const now = Date.now();
  assert.equal(calm.calmBlock(now), 'tts', 'speechSynthesis가 아직 말하기 전에도');
  await settle(calm.CALM.ttsFade * 1000 + 120);
  assert.equal(aud().paused, true, '0.25초 만에 빠지고 멈춤');
  calm.calmTick(now + 500);
  assert.equal(calm.calmState().playing, false);
  calm.calmTick(now + calm.CALM.ttsRest + 50);
  assert.equal(calm.calmState().playing, true, '말이 안 나왔으면 3초 뒤 다시');
  assert.equal(aud().paused, false);
  quiet();
});

test('★ 🌿 0.6초 빠지는 도중에 온 🎧 ▶·앱 내림은 멈춤을 앞당긴다 (🔍 Codex 144차 #1)', async () => {
  quiet();
  assert.equal(calm.calmState().playing, true);
  // 창이 떠서 0.6초에 걸쳐 빠지는 중 → 🎧 ▶ → 0.25초 안에 멈춤
  els.catch.hidden = false;
  calm.calmTick();
  await settle(60);
  winL['shincoach:ttsstart']();
  await settle(calm.CALM.ttsFade * 1000 + 100);
  assert.equal(aud().paused, true, '0.6초를 다 기다리지 않는다');
  els.catch.hidden = true;
  quiet();
  assert.equal(calm.calmState().playing, true);
  // 다시 빠지는 중 → 앱을 내림 → 바로 멈춤
  els.catch.hidden = false;
  calm.calmTick();
  await settle(60);
  globalThis.document.hidden = true;
  docL.visibilitychange();
  assert.equal(aud().paused, true, '내리면 바로');
  globalThis.document.hidden = false;
  els.catch.hidden = true;
  calm.calmTick();
  assert.equal(calm.calmState().playing, true);
  assert.equal(aud().paused, false);
});

test('🔗 🎧 듣기 카드는 첫 말 전에 ttsstart를 보내고, 음악이 빠지는 동안 기다린다', () => {
  const src = read('js/korlistenview.js');
  const fn = src.slice(src.indexOf('export async function playListen('), src.indexOf('/** ✅ 끝까지 들렸어요'));
  const send = fn.indexOf("new CustomEvent('shincoach:ttsstart')");
  assert.ok(send > 0 && send < fn.indexOf('await koVoice(synth)') && send < fn.indexOf('runPlan('), '읽기 전에 알린다');
  assert.ok(fn.includes('setTimeout(r, TTS_LEAD_MS)'));
  const lead = Number((/export const TTS_LEAD_MS = (\d+);/.exec(src) || [])[1]);
  assert.ok(lead >= calm.CALM.ttsFade * 1000, `첫 말까지 ${lead}ms ≥ 음악이 빠지는 ${calm.CALM.ttsFade * 1000}ms`);
});

test('🌿 🎧 듣기 카드가 읽는 동안 멈춤 — 다 읽고 3초 뒤 다시 · 5분 넘게 "읽는 중"이면 고장으로 보고 다시 튼다', () => {
  const t0 = Date.now() + 10_000;
  synth.speaking = true;
  calm.calmTick(t0);
  assert.equal(calm.calmState().playing, false);
  assert.equal(calm.calmBlock(t0 + 100), 'tts');
  synth.speaking = false;
  synth.pending = false;
  calm.calmTick(t0 + 1000);
  assert.equal(calm.calmState().playing, false, '줄과 줄 사이에 깜빡이지 않게');
  calm.calmTick(t0 + 1000 + calm.CALM.ttsRest + 50);
  assert.equal(calm.calmState().playing, true);
  // 고장 — 끝 소식이 오지 않는다
  const t1 = t0 + 60_000;
  synth.pending = true;
  calm.calmTick(t1);
  assert.equal(calm.calmState().playing, false);
  calm.calmTick(t1 + calm.CALM.ttsMax + 10);
  assert.equal(calm.calmState().playing, true, '혼자 풀린다');
  synth.pending = false;
  calm.calmTick(t1 + calm.CALM.ttsMax + 20);
  // 읽는 중인 채로 시계가 뒤로 갔다 — 5분 지킴이가 시계가 따라잡을 때까지 미뤄지지 않는다 (Codex 123차 #3)
  const t2 = Date.now();
  synth.speaking = true;
  calm.calmTick(t2 + 3_600_000);
  calm.calmTick(t2);
  assert.equal(calm.calmState().playing, false);
  calm.calmTick(t2 + calm.CALM.ttsMax + 10);
  assert.equal(calm.calmState().playing, true, '되돌아간 시계로 5분이 지나면 풀린다');
  quiet();
  assert.equal(calm.calmState().playing, true);
});

test('🌿 🎤 말하기 확인 동안 멈춤 — 끝 신호 · 끝 신호를 놓쳐도 혼자 풀린다', () => {
  const t = Date.now();
  winL['shincoach:micstart']();
  assert.equal(calm.calmState().playing, false);
  assert.equal(calm.calmBlock(t + 10), 'mic');
  winL['shincoach:micend']();
  calm.calmTick(t + 20);
  assert.equal(calm.calmState().playing, true);
  winL['shincoach:micstart']();
  assert.equal(calm.calmBlock(Date.now() + calm.CALM.micMax + 10), '', '끝 신호를 놓쳐도');
  winL['shincoach:micend']();
  calm.calmTick();
  assert.equal(calm.calmState().playing, true);
});

test('🌿 앱을 내리면 바로 뺀다 · 돌아오면 다시 · 태블릿이 소리를 막았으면(play 거절) 화면을 누를 때 다시', async () => {
  globalThis.document.hidden = true;
  docL.visibilitychange();
  assert.equal(calm.calmState().playing, false, '타이머를 기다리지 않는다');
  assert.equal(aud().paused, true, '내리면 빠지는 시간 없이 바로 멈춤(뒤로 간 화면은 타이머가 느리다)');
  calm.calmTick();
  assert.equal(calm.calmState().playing, false, '내린 동안 따져도 다시 틀지 않는다');
  assert.equal(calm.calmBlock(), 'hidden');
  // 돌아왔는데 태블릿이 소리를 막았다 — 누르는 순간 다시
  FakeAudio.block = true;
  globalThis.document.hidden = false;
  calm.calmTick();
  await settle();
  assert.equal(calm.calmState().playing, true, '틀라고는 했다');
  assert.equal(aud().paused, true, '막혀서 소리는 안 난다');
  assert.equal(calm.calmState().music.blocked, true);
  FakeAudio.block = false;
  docL.pointerdown();
  await settle();
  assert.equal(aud().paused, false, '누르면 다시');
  assert.equal(calm.calmState().music.blocked, false);
  // 🎵를 꺼 두었으면 눌러도 안 튼다
  buttons[0].click();
  await settle(calm.CALM.fadeOut * 1000 + 150);
  const plays = aud().plays;
  docL.pointerdown();
  assert.equal(aud().plays, plays, '꺼 두면 누름으로 깨우지 않는다');
  buttons[0].click();
  assert.equal(aud().paused, false);
});

test('🌿 🎵 진우가 끄고 켬 — 단추 모양·aria-pressed · 이 기기에 기억 · 📤 끈 수·켠 수', async () => {
  const d0 = await getDaily(today());
  buttons[0].click();
  assert.equal(calm.calmState().on, false);
  assert.equal(calm.calmState().playing, false);
  assert.equal(calm.calmBlock(), 'off');
  assert.ok(buttons.every((b) => b.textContent === '🔇' && b.attrs['aria-pressed'] === 'false' && b.title === '잔잔한 음악 켜기'));
  assert.equal(mem.get('shincoach.calmOn'), '0');
  buttons[1].click();
  assert.equal(calm.calmState().on, true);
  assert.equal(calm.calmState().playing, true);
  assert.ok(buttons.every((b) => b.textContent === '🎵' && b.attrs['aria-pressed'] === 'true' && b.title === '잔잔한 음악 끄기'));
  assert.equal(mem.get('shincoach.calmOn'), '1');
  await settle();
  const d = await getDaily(today());
  assert.equal((d.calmOff || 0) - (d0.calmOff || 0), 1);
  assert.equal((d.calmOn || 0) - (d0.calmOn || 0), 1);
});

test('🌿 📤 소리가 난 초를 모아 하루 기록에 — 1분마다 · 멈출 때 남은 것도 · 멈춘 동안·소리가 막힌 동안은 안 셈', async () => {
  const before = (await getDaily(today())).calmSec || 0;
  let t = Date.now();
  for (let k = 0; k < 61; k++) { t += 1000; calm.calmTick(t); }
  await settle();
  const mid = (await getDaily(today())).calmSec || 0;
  assert.ok(mid - before >= 59 && mid - before <= 61, `1분 모아 ${mid - before}초`);
  // 타이머가 100초 멈췄다 돌아도 100초로 세지 않는다 · 꺼 둔 동안은 셈이 늘지 않는다
  t += 100_000;
  calm.calmTick(t);
  buttons[0].click();
  for (let k = 0; k < 70; k++) { t += 1000; calm.calmTick(t); }
  buttons[0].click();
  // 소리가 막혀(play 거절) 실제로는 안 나는 동안도 안 셈 (v340 — <audio>가 재생 중일 때만)
  aud().pause();
  for (let k = 0; k < 30; k++) { t += 1000; calm.calmTick(t); }
  calm.leaveCalm();
  await settle();
  const after = (await getDaily(today())).calmSec || 0;
  assert.ok(after - mid <= 3, `꺼 둔 70초·막힌 30초는 안 셈 (+${after - mid})`);
});

test('🌿 📤 자정을 넘기면 쌓인 시간은 전날로 먼저 (Codex 123차 #4)', async () => {
  calm.enterCalm();
  await settle();
  assert.equal(calm.calmState().playing, true);
  const t0 = new Date(2030, 0, 1, 23, 59, 30).getTime();
  for (let k = 0; k < 60; k++) calm.calmTick(t0 + k * 1000);
  calm.leaveCalm();
  await settle();
  const a = (await getDaily('2030-01-01')).calmSec || 0;
  const b = (await getDaily('2030-01-02')).calmSec || 0;
  assert.ok(a >= 29 && a <= 31, `1월 1일 ${a}초`);
  assert.ok(b >= 28 && b <= 31, `1월 2일 ${b}초`);
});

test('🌿 기기 시계가 뒤로 가도 🎧·🎤 멈춤이 몇 시간씩 이어지지 않는다', () => {
  calm.enterCalm();
  synth.speaking = true;
  calm.calmTick(Date.now() + 3_600_000); // 한 시간 앞 시계로 읽는 중이었다
  synth.speaking = false;
  assert.equal(calm.calmBlock(Date.now()), '', '시계가 돌아온 뒤 🎧 쉬는 시간에 묶이지 않는다');
  winL['shincoach:micstart']();
  assert.equal(calm.calmBlock(Date.now() - 3_600_000), '', '🎤 끝 시각이 한 시간 넘게 남아 보이면 무시');
  winL['shincoach:micend']();
  calm.leaveCalm();
});

test('🌿 국어·논술을 떠나면 멈춤 · 다시 들어오면 그 곡 그 자리에서 (새 곡으로 바꾸지 않음)', async () => {
  calm.enterCalm();
  await settle();
  assert.equal(calm.calmState().playing, true);
  const src = aud().src;
  calm.leaveCalm();
  const st = calm.calmState();
  assert.equal(st.playing, false);
  assert.equal(st.want, false);
  assert.equal(calm.calmBlock(), 'view');
  await settle(calm.CALM.fadeOut * 1000 + 150);
  assert.equal(aud().paused, true);
  calm.enterCalm();
  assert.equal(aud().src, src, '같은 곡');
  assert.equal(aud().paused, false);
  calm.leaveCalm();
});

test('🌿 곡이 없으면 소리 없음 — 합성 곡을 대신 틀지 않는다 · 곡을 넣으면 그때부터', async () => {
  files.setCalmMusicDeps({ loadList: async () => null });
  await files.loadCalmMusic();
  calm.enterCalm();
  assert.equal(calm.calmState().playing, false, '틀 곡이 없다');
  assert.equal(calm.calmBlock(), '', '막을 까닭은 없는데');
  assert.equal(aud().paused, true);
  assert.equal(aud().src, '', '옛 곡 주소도 놓았다');
  files.setCalmMusicDeps({ loadList: async () => ({ id: 'music:list', items: ITEMS, at: 2 }) });
  await files.loadCalmMusic();
  calm.calmTick();
  await settle();
  assert.equal(calm.calmState().playing, true);
  assert.equal(aud().paused, false);
  calm.leaveCalm();
});

// ───────────────────── 잇기 · 기록 ─────────────────────

test('🔗 잇기 — app.showView 국어·논술에서만 · initCalm은 첫 화면 전에 · 머리줄 🎵 둘 · 앱 셸 · calm은 합성 곡·소리 장치를 안 만짐', () => {
  const app = read('js/app.js');
  assert.ok(app.includes("import { initCalm, enterCalm, leaveCalm } from './calm.js';"));
  assert.ok(app.includes("if (name === 'korean' || name === 'nonsul') enterCalm();\n  else leaveCalm();"));
  const at = app.search(/^ {2}initCalm\(\);/m);
  assert.ok(at > 0 && at < app.indexOf("showView('home');"), '첫 showView보다 먼저');
  const html = read('index.html');
  for (const view of ['view-korean', 'view-nonsul']) {
    const sec = html.slice(html.indexOf(`id="${view}"`), html.indexOf('</header>', html.indexOf(`id="${view}"`)));
    assert.ok(/<button type="button" class="btn btn-icon" data-calm aria-label="잔잔한 음악" aria-pressed="true">🎵<\/button>/.test(sec), `${view} 머리줄에 🎵`);
  }
  assert.equal((html.match(/data-calm/g) || []).length, 2, '다른 화면에는 없다');
  const sw = read('sw.js');
  assert.ok(sw.includes("'./js/calmfiles.js',") && sw.includes("'./js/calm.js'"));
  assert.ok(sw.includes("'./js/calmsong.js',"), 'js/의 파일은 모두 앱 셸에 (tools/check.mjs) — 합성 곡은 앱이 안 틀어도 남겨 둔다');
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(sw) || [])[1]) >= 340);
  const calmSrc = read('js/calm.js');
  assert.ok(calmSrc.includes("from './calmfiles.js'") && !calmSrc.includes("from './calmsong.js'") && !calmSrc.includes("from './sfx.js'"), 'calm은 곡 파일 재생기만');
  assert.ok(!/\d+\s*\/\s*\d+|남은|개 중/.test(calmSrc.slice(calmSrc.indexOf('function syncButtons'), calmSrc.indexOf('export function initCalm'))), '아이 화면에 셈 문구 없음');
});

test('📤 하루 기록 칸 · usage/날짜.md 한 줄 — 소리가 난 시간 · 끔·다시 켬 · 없으면 줄도 없음', () => {
  assert.equal(emptyDaily('2026-10-22').calmSec, 0);
  const m = mergeDailyDelta(mergeDailyDelta(null, '2026-10-22', { calmSec: 40, calmOff: 1 }), '2026-10-22', { calmSec: 25, calmOn: 1 });
  assert.deepEqual([m.calmSec, m.calmOff, m.calmOn], [65, 1, 1]);
  const day = '2026-10-22';
  const [f] = usageFiles([{ date: day, appOpens: 1, uKor: 900, calmSec: 600, calmOff: 2, calmOn: 1 }], day, PLACES);
  const line = f.text.split('\n').find((l) => l.startsWith('- 10-22:'));
  assert.ok(line.includes('🌿 잔잔한 음악 10분 · 🎵 끔 2번 · 다시 켬 1번'), line);
  assert.ok(f.text.includes('- 🌿 잔잔한 음악 = 국어·논술 화면에서 배경 음악을 틀어 둔 시간 (v317부터 · 기기 음량·음소거는 알 수 없고'), '읽는 법 — 실제로 들린 소리는 모른다고');
  assert.ok(f.text.includes('v340부터는 ⚙에서 고른 곡 파일이 실제로 재생된 시간 — 곡이 없으면 0'), '곡 파일로 바뀐 날을 읽는 법');
  const [g] = usageFiles([{ date: day, appOpens: 1, uKor: 900 }], day, PLACES);
  assert.ok(!g.text.split('\n').find((l) => l.startsWith('- 10-22:')).includes('🌿'), '없으면 줄도 없음');
  const [h] = usageFiles([{ date: day, appOpens: 1, calmOff: 1 }], day, PLACES);
  assert.ok(h.text.includes('🌿 잔잔한 음악 0분 · 🎵 끔 1번'), '바로 끈 날도 보인다');
});
