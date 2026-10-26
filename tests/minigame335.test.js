// v335 (2026-10-25 아버님 "미니게임을 할 때 긴박감이 있고 신난 음악" → 기본안 "이대로" → 시험 듣기 2판 "이대로") — node --test tests/minigame335.test.js
//  🎵 게임 음악 — 새로 쓴 8비트 곡 셋(gamesong.js) · 게임마다 지금 음악 상태(run.music → musicMode · 🗺️ advHurry) · 틀고 멈추기(gamebgm.js) · 게임기 🎵 단추 · ⚙ 이벤트 배경음악
//  📤 v337 — 소리가 난 초 · 🔇 끈 수·다시 켠 수 → usage/날짜.md 한 줄
import { fakeIdb } from './fakeidb.js'; // ★ db.js보다 먼저 (v337 — 게임 음악 기록)
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GAME_SONGS, HURRY, HURRY_SEC, LEVEL, noteFreq, parseMelody, songFor, barSec, barEvents, scheduleBar, makeBus, hurryLeft, musicMode } from '../js/gamesong.js';
import { GAMES } from '../js/minigame.js';
import { advStart, advCam, advHurry, ADV_W, GROUND } from '../js/gameadv.js';
import { getDaily, mergeDailyDelta, emptyDaily } from '../js/db.js';
import { usageFiles } from '../js/upload.js';
import { PLACES } from '../js/usage.js';

void fakeIdb;

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const near = (a, b) => Math.abs(a - b) < 1e-6;

// ───────────────────── 가짜 오디오 (calm317과 같은 틀 — 진짜 브라우저처럼 잘못된 예약은 던진다) ─────────────────────

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
  constructor() { this.currentTime = 0; this.sampleRate = 8000; this.state = 'running'; this.destination = node('dest'); this.oscs = []; this.gains = []; this.srcs = []; }
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
  createBufferSource() {
    const n = node('src');
    Object.assign(n, { buffer: null, t0: null, t1: null, stops: 0 });
    n.start = (t) => { n.t0 = t; };
    n.stop = (t) => { n.t1 = t; n.stops += 1; };
    this.srcs.push(n);
    return n;
  }
  createBiquadFilter() { const n = node('filter'); n.frequency = new Param(350); n.Q = new Param(1); n.type = 'lowpass'; return n; }
  createPeriodicWave(real, imag) { return { real, imag }; }
  createBuffer(ch, len, rate) { const d = Array.from({ length: ch }, () => new Float32Array(len)); return { numberOfChannels: ch, length: len, sampleRate: rate, getChannelData: (c) => d[c] }; }
  resume() { this.state = 'running'; return Promise.resolve(); }
}

// ───────────────────── 곡 원고 ─────────────────────

test('🎼 곡 셋 — 달려라 파트너(D 160)·바쁘다 바빠(Am 172)·두근두근 생각(Em 132) · 게임 아홉이 곡 하나씩에 · 모르는 게임은 첫 곡', () => {
  assert.deepEqual(GAME_SONGS.map((s) => [s.id, s.title, s.bpm]), [['run', '달려라 파트너', 160], ['busy', '바쁘다 바빠', 172], ['think', '두근두근 생각', 132]]);
  const all = GAME_SONGS.flatMap((s) => s.games);
  const sung = GAMES.filter((g) => !g.quiet); // quiet = 배경 음악 없는 게임 (🧠 따라 하기 v346 — 자리마다 제 음이 노래 대신)
  assert.deepEqual([...all].sort(), sung.map((g) => g.id).sort(), '게임마다 곡 하나 (빠지거나 겹치지 않게 — 새 게임은 여기에도 · quiet 게임만 빼고)');
  for (const g of sung) assert.equal(songFor(g.id).games.includes(g.id), true, g.id);
  assert.equal(songFor('adv').id, 'run', '🗺️ 대모험은 달려라 파트너');
  assert.equal(songFor('nope'), GAME_SONGS[0]);
  assert.equal(songFor(undefined), GAME_SONGS[0]);
});

test('🎼 마디마다 — 멜로디 박 합 4 · 음이름이 다 읽힘 · 화음 첫 음은 낮은 베이스 · 드럼 16칸(K·S·h·.) · 멜로디는 A4~G6 · 마디 수는 4의 배수(이어 틀기 덩이)', () => {
  assert.equal(noteFreq('A4'), 440);
  assert.ok(near(noteFreq('A5'), 880) && near(noteFreq('C#5'), noteFreq('Db5')));
  assert.equal(noteFreq('H4'), 0);
  assert.deepEqual(parseMelody('A4:0.5 r:1'), [{ note: 'A4', beats: 0.5 }, { note: 'r', beats: 1 }]);
  assert.deepEqual(parseMelody('A4:x'), [], '꼴이 틀린 마디는 빈 배열');
  for (const s of GAME_SONGS) {
    assert.equal(s.bars.length % 4, 0, `${s.id} 마디 수`);
    assert.match(s.drums, /^[KSh.]{16}$/, `${s.id} 드럼`);
    assert.ok(['octave', 'pulse'].includes(s.bass), s.id);
    s.bars.forEach(([chord, mel], i) => {
      const notes = parseMelody(mel);
      assert.ok(notes.length > 0, `${s.id} ${i + 1}마디 멜로디`);
      assert.ok(near(notes.reduce((a, n) => a + n.beats, 0), 4), `${s.id} ${i + 1}마디 박 합`);
      for (const n of notes) if (n.note !== 'r') {
        const f = noteFreq(n.note);
        assert.ok(f >= noteFreq('A4') - 1e-9 && f <= noteFreq('G6') + 1e-9, `${s.id} ${i + 1}마디 ${n.note}`);
      }
      const tones = chord.split(/\s+/);
      assert.ok(tones.length >= 3 && tones.every((t) => noteFreq(t) > 0), `${s.id} ${i + 1}마디 화음`);
      assert.ok(noteFreq(tones[0]) <= noteFreq('A2') + 1e-9, `${s.id} ${i + 1}마디 베이스는 낮게(A2까지)`);
    });
  }
});

test('🎹 한 마디의 소리 — 모두 마디 안 · 아르페지오 16분 · 베이스(8분 옥타브 | 4분) · ⏰ 서두르면 1.15배 빠르고 박마다 째깍 넷(첫 박 높게) · 안 서두르면 째깍 없음', () => {
  assert.equal(HURRY, 1.15);
  assert.equal(HURRY_SEC, 10);
  for (const s of GAME_SONGS) {
    assert.ok(near(barSec(s), (60 / s.bpm) * 4));
    assert.ok(near(barSec(s, true), barSec(s) / HURRY));
    for (let i = 0; i < s.bars.length; i++) {
      const ev = barEvents(s, i);
      assert.ok(ev.every((e) => e.at >= 0 && e.at + e.d <= 4 + 1e-9 && e.d > 0), `${s.id} ${i + 1}마디 안`);
      assert.equal(ev.filter((e) => e.v === 'arp').length, 16);
      assert.equal(ev.filter((e) => e.v === 'bass').length, s.bass === 'octave' ? 8 : 4);
      assert.equal(ev.filter((e) => e.v === 'tick').length, 0, '안 서두르면 째깍 없음');
      const lead = ev.filter((e) => e.v === 'lead');
      assert.equal(lead.length, parseMelody(s.bars[i][1]).filter((n) => n.note !== 'r').length);
      const fast = barEvents(s, i, true);
      assert.deepEqual(fast.filter((e) => e.v === 'tick').map((e) => [e.at, e.f]), [[0, 2000], [1, 1500], [2, 1500], [3, 1500]]);
      assert.deepEqual(fast.filter((e) => e.v !== 'tick'), ev, '음은 같고 빠르기만');
    }
  }
  assert.deepEqual(barEvents(GAME_SONGS[0], -1), barEvents(GAME_SONGS[0], GAME_SONGS[0].bars.length - 1), '마디 번호는 돌려 셈');
});

test('🎹 소리 예약 — 시작은 at 뒤 · 멈춤은 시작 뒤 · 지수 램프가 0을 향하지 않음 · 멜로디 음높이는 처음부터 끝까지 그대로(떨림 없음 — 1판 "테이프 늘어지는 듯") · 압축기 없음 · 길: 소리 → bus(낮은 거름) → 크기 → out', () => {
  const ctx = new FakeCtx();
  const out = ctx.createGain();
  const bus = makeBus(ctx, out);
  assert.equal(bus.kind, 'filter');
  assert.equal(bus.out[0].kind, 'gain');
  assert.equal(bus.out[0].out[0], out);
  for (const s of GAME_SONGS) for (const hurry of [false, true]) {
    for (let i = 0; i < s.bars.length; i++) {
      const at = 1 + i * barSec(s, hurry);
      const live = scheduleBar(ctx, bus, s, i, at, hurry);
      assert.ok(live.length > 0 && live.every((x) => x.end >= at));
    }
  }
  for (const o of ctx.oscs) {
    assert.ok(o.t0 >= 1 && o.t1 > o.t0, '시작은 at 뒤 · 멈춤은 시작 뒤');
    if (o.wave || o.type === 'square') assert.deepEqual(o.frequency.ev.map((e) => e[0]), ['set'], '멜로디·아르페지오·째깍 음높이는 한 번만 정한다(떨림 없음)');
  }
  for (const n of ctx.srcs) assert.ok(n.t1 > n.t0);
  const src = read('js/gamesong.js');
  assert.ok(!/createDynamicsCompressor|vibrato|detune\.(set|linear|exp)/.test(src.replace(/\/\/.*$/gm, '')), '압축기·떨림 없음');
  assert.ok(Object.values(LEVEL).every((v) => v > 0 && v < 0.5));
});

test('🎼 gamesong.js는 아무것도 import하지 않는다(시험 듣기 페이지가 그대로 붙여 쓴다) · 곡은 새로 쓴 것이라고 적혀 있다', () => {
  const src = read('js/gamesong.js');
  assert.ok(!/^\s*import\s/m.test(src));
  assert.match(src, /새로 쓴 8비트 곡 셋/);
  assert.match(src, /저작물/);
});

// ───────────────────── 게임마다 지금 음악 상태 ─────────────────────

test('⏰ 서두르기 — 남은 시간 0 < ms ≤ 10초 · 끝나면 stop(서두를 때여도) · 「준비!」 동안(left 없음)은 play · 🗺️는 hurry 까닭으로', () => {
  assert.deepEqual([10000, 1, 10001, 0, -5, NaN, null, undefined, Infinity].map(hurryLeft), [true, true, false, false, false, false, false, false, false]);
  assert.equal(musicMode({ left: 30000 }), 'play');
  assert.equal(musicMode({ left: 9000 }), 'hurry');
  assert.equal(musicMode({ left: null }), 'play');
  assert.equal(musicMode({ over: true, left: 9000 }), 'stop');
  assert.equal(musicMode({ hurry: true }), 'hurry');
  assert.equal(musicMode({ over: true, hurry: true }), 'stop');
  assert.equal(musicMode(), 'play');
});

test('🗺️ 대모험 — 끝 계단 첫 칸(stairX · 높이 5)이 화면 오른쪽 끝에 들어오면 hurry · 그 전엔 아님 · 깃대에 닿으면(done) 아님', () => {
  for (let seed = 1; seed <= 20; seed++) {
    let k = seed;
    const rng = () => { k = (k * 16807) % 2147483647; return k / 2147483647; };
    const s = advStart(0, rng);
    const st = s.stage;
    assert.ok(st.stairX > 0 && st.stairX < st.poleX, `씨앗 ${seed}`);
    assert.ok(st.solids.some((x) => x.x === st.stairX && x.top === GROUND + 5), '끝 계단 첫 칸');
    assert.equal(advHurry(s), false, '처음엔 아님');
    s.x = st.stairX - ADV_W + 22 - 1; // 화면 오른쪽 끝 = 계단 한 칸 앞
    assert.equal(advCam(s) + ADV_W, st.stairX - 1);
    assert.equal(advHurry(s), false);
    s.x += 1;
    assert.equal(advHurry(s), true, '계단이 보임');
    s.done = true;
    assert.equal(advHurry(s), false, '깃대에 닿음');
  }
  assert.equal(advHurry(null), false);
});

test('🎮 게임 아홉이 다 run.music()을 알린다 — 시간이 있는 여덟은 남은 시간(내려 둔 동안은 멈춘 때로) · 🗺️는 깃대·끝 계단 · musicMode는 gamesong.js에서', () => {
  const timed = ['gamedig', 'gamerun', 'gameshadow', 'gamepair', 'gameberry', 'gameballoon', 'gametower', 'gametug'];
  for (const f of timed) {
    const src = read(`js/${f}.js`);
    assert.ok(src.includes("import { musicMode } from './gamesong.js';"), f);
    assert.ok(src.includes('  return { done, stop: () => finish(true), music: () => musicMode({ over: finished, left: s ? s.end - (pausedAt || now()) : null }) };'), f);
  }
  const adv = read('js/gameadv.js');
  assert.ok(adv.includes("import { musicMode } from './gamesong.js';"));
  assert.ok(adv.includes('  return { done, stop: () => finish(true), music: () => musicMode({ over: finished || !!(s && s.done), hurry: !!s && advHurry(s) }) };'));
  assert.ok(adv.includes('  st.stairX = x + 8;') && adv.includes('  end.solid(8, 6, 5);'), '끝 계단 첫 칸과 같은 자리');
  const gv = read('js/gameview.js');
  for (const id of GAMES.map((g) => g.id)) assert.ok(new RegExp(`\\b${id}: \\{ run: run`).test(gv), `${id} 게임기 RUNNERS`);
});

// ───────────────────── 틀고 멈추기 (gamebgm.js) ─────────────────────

const mem = new Map();
const docL = {};
const winL = {};
let gb;
let sfx;
before(async () => {
  globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); }, removeItem: (k) => { mem.delete(k); } };
  mem.set('shincoach.gameMusicPos', JSON.stringify({ busy: 6, run: 'x', think: -1 })); // 지난번에 바쁘다 바빠 7마디에서 끊겼다 · 깨진 값은 버림
  globalThis.window = { AudioContext: FakeCtx, addEventListener: (t, fn) => { winL[t] = fn; } };
  globalThis.document = { hidden: false, addEventListener: (t, fn) => { docL[t] = fn; } };
  await getDaily('2000-01-01'); // 가짜 저장소 열기 (v337 기록)
  sfx = await import('../js/sfx.js');
  gb = await import('../js/gamebgm.js');
  gb.GAME_BGM.tick = 0; // 저절로 돌지 않게 — gameMusicTick을 직접 부른다
});
const ctxNow = () => sfx.audioContext();
const masterOf = (ctx) => ctx.gains.filter((g) => g.out[0] === ctx.destination).at(-1);
let mode = 'play';
const probe = () => mode;

test('🎵 판이 없으면 조용 · 판이 시작되면 그 게임의 곡 — 지난번 끊긴 4마디 덩이 처음부터 · 짧게 들어옴 · 크기는 효과음보다 작게', () => {
  assert.deepEqual(gb.gameMusicState().pos, { busy: 6 }, '깨진 자리는 버린다');
  assert.equal(gb.gameMusicBlock(), 'idle');
  assert.equal(gb.gameMusicState().playing, false);
  gb.gameMusicStart('dig', probe);
  const st = gb.gameMusicState();
  assert.deepEqual([st.game, st.playing, st.song, st.hurry, st.timer], ['dig', true, 'busy', false, false]);
  assert.equal(st.pos.busy, 5, '7마디(6)에서 끊겼으면 5마디(4)부터 — 한 마디를 예약해 다음은 5');
  const ctx = ctxNow();
  const master = masterOf(ctx);
  assert.deepEqual(master.gain.ev.slice(0, 2).map((e) => e[0]), ['set', 'exp']);
  assert.ok(near(master.gain.ev[1][1], gb.GAME_BGM.volume) && near(master.gain.ev[1][2] - master.gain.ev[0][2], gb.GAME_BGM.fadeIn));
  assert.ok(gb.GAME_BGM.fadeIn <= 0.5, '판은 30초뿐 — 짧게 들어옴');
  // 효과음 한 음(sfx tone gain 0.14~0.2)보다 작게 — 가장 큰 한 소리(킥)도 · 미리 재 본 곡 최고점(약 0.7 · 크기 1.0)도
  assert.ok(gb.GAME_BGM.volume * 1.2 * LEVEL.kick < 0.14);
  assert.ok(gb.GAME_BGM.volume * 0.7 < 0.14);
  assert.equal(JSON.parse(mem.get('shincoach.gameMusicPos')).busy, 5, '자리는 마디마다 이 기기에');
});

test('🎵 앞 마디 예약 — 시간이 가면 다음 마디(보통 빠르기) · ⏰ 서두르면 그다음 마디부터 빨라지고 째깍 · 이미 예약한 마디는 그대로', () => {
  const ctx = ctxNow();
  const song = songFor('dig');
  const n0 = ctx.oscs.length;
  gb.gameMusicTick();
  assert.equal(ctx.oscs.length, n0, '아직 ahead 밖');
  ctx.currentTime += barSec(song) - 0.1;
  gb.gameMusicTick();
  assert.equal(gb.gameMusicState().pos.busy, 6, '다음 마디');
  const ticks = () => ctx.oscs.filter((o) => o.type === 'square').length;
  assert.equal(ticks(), 0);
  mode = 'hurry';
  gb.gameMusicTick();
  assert.equal(gb.gameMusicState().pos.busy, 6, '이미 예약한 마디가 끝나기 전엔 새로 안 넣는다');
  assert.equal(ticks(), 0);
  const startOld = ctx.oscs.at(-1).t0;
  ctx.currentTime += barSec(song);
  gb.gameMusicTick();
  const st = gb.gameMusicState();
  assert.deepEqual([st.pos.busy, st.hurry], [7, true]);
  assert.equal(ticks(), 4, '째깍 넷');
  const tk = ctx.oscs.filter((o) => o.type === 'square');
  assert.ok(near(tk[1].t0 - tk[0].t0, barSec(song, true) / 4), '박 길이가 빨라짐');
  assert.ok(tk[0].t0 >= startOld, '서두른 마디는 앞 마디 뒤에');
  mode = 'play';
  ctx.currentTime += barSec(song, true);
  gb.gameMusicTick();
  assert.equal(gb.gameMusicState().hurry, false, '서두를 까닭이 없어지면 다시 보통');
  assert.equal(ticks(), 4);
});

test('🎵 판이 끝나면(run.music → stop) 바로 뺀다 — 예약한 음도 끔 · 판이 남아 있어도 다시 안 튼다 · gameMusicStop이면 판 없음', () => {
  const ctx = ctxNow();
  const master = masterOf(ctx);
  mode = 'stop';
  gb.gameMusicTick();
  assert.equal(gb.gameMusicBlock(), 'over');
  assert.equal(gb.gameMusicState().playing, false);
  assert.deepEqual(master.gain.ev.slice(-2).map((e) => e[0]), ['hold', 'exp'], '그 자리 크기에서 빼기');
  assert.ok(near(master.gain.ev.at(-1)[2] - ctx.currentTime, gb.GAME_BGM.fadeOut));
  const live = ctx.oscs.filter((o) => o.t1 > ctx.currentTime + gb.GAME_BGM.fadeOut + 0.06);
  assert.equal(live.length, 0, '예약해 둔 음도 빠지는 시간 안에 멈춘다');
  const n = ctx.oscs.length;
  ctx.currentTime += 1;
  gb.gameMusicTick();
  assert.equal(ctx.oscs.length, n, '끝난 판은 다시 안 튼다');
  gb.gameMusicStop();
  assert.equal(gb.gameMusicState().game, '');
  assert.equal(gb.gameMusicBlock(), 'idle');
  gb.gameMusicStop(); // 두 번 불러도 된다
  mode = 'play';
});

test('🎵 🔇 진우가 끄고 켬 — 판 도중에도 바로 · 이 기기에 기억 · ⚙ 이벤트 배경음악을 끄면 안 남(🎵가 켜져 있어도)', () => {
  gb.gameMusicStart('run', probe);
  assert.equal(gb.gameMusicState().song, 'run');
  assert.equal(gb.toggleGameMusic(), false);
  assert.deepEqual([gb.gameMusicOn(), gb.gameMusicState().playing, gb.gameMusicBlock(), mem.get('shincoach.gameMusicOn')], [false, false, 'off', '0']);
  assert.equal(gb.toggleGameMusic(), true);
  assert.deepEqual([gb.gameMusicState().playing, mem.get('shincoach.gameMusicOn')], [true, '1']);
  gb.setGameBgmEnabled(false);
  assert.deepEqual([gb.gameMusicAllowed(), gb.gameMusicState().playing, gb.gameMusicBlock()], [false, false, 'setting']);
  gb.gameMusicTick();
  assert.equal(gb.gameMusicState().playing, false);
  gb.setGameBgmEnabled(true);
  assert.equal(gb.gameMusicState().playing, true);
  gb.gameMusicStop();
});

test('🎵 앱을 내리면 바로 뺀다 · 돌아오면 다음 따지기에서 다시 · 소리 장치가 잠들어 있으면 안 남 · 듣기는 처음 틀 때 한 번만 건다', () => {
  gb.gameMusicStart('tower', probe);
  assert.equal(gb.gameMusicState().song, 'think');
  assert.equal(typeof docL.visibilitychange, 'function');
  assert.equal(typeof winL.pagehide, 'function');
  document.hidden = true;
  docL.visibilitychange();
  assert.equal(gb.gameMusicState().playing, false);
  assert.equal(gb.gameMusicBlock(), 'hidden');
  gb.gameMusicTick();
  assert.equal(gb.gameMusicState().playing, false);
  document.hidden = false;
  gb.gameMusicTick();
  assert.equal(gb.gameMusicState().playing, true);
  winL.pagehide();
  assert.equal(gb.gameMusicState().playing, false);
  ctxNow().state = 'suspended';
  gb.gameMusicTick();
  assert.equal(gb.gameMusicState().playing, false, '잠든 소리 장치');
  ctxNow().state = 'running';
  gb.gameMusicTick();
  assert.equal(gb.gameMusicState().playing, true);
  gb.gameMusicStop();
});

test('🎵 곡마다 자리를 따로 기억 — 같은 곡의 게임은 이어서(덩이 처음) · 다른 게임으로 바꾸면 그 곡 · 깨진 상태 함수·모르는 값은 play', () => {
  const ctx = ctxNow();
  gb.gameMusicStart('berry', probe); // 바쁘다 바빠 — 위에서 7마디 넘게 냄
  const b = gb.gameMusicState().pos.busy;
  assert.equal((b - 1) % 4, 0, `덩이 처음부터 (${b - 1})`);
  gb.gameMusicStart('pair', probe); // 판을 끝내지 않고 바로 다른 게임 — 곡이 바뀐다
  assert.equal(gb.gameMusicState().song, 'think');
  gb.gameMusicStart('shadow', () => { throw new Error('깨짐'); });
  assert.deepEqual([gb.gameMusicState().playing, gb.gameMusicBlock()], [true, '']);
  gb.gameMusicStart('shadow', () => 'loud');
  assert.equal(gb.gameMusicState().playing, true);
  gb.gameMusicStart('shadow', null);
  assert.equal(gb.gameMusicState().playing, true, '상태를 안 알리는 게임도 판 동안은 튼다');
  ctx.currentTime += 0.01;
  gb.gameMusicStop();
});

test('🔍 Codex 139차 #1: 판마다 번호표 — 늦게 끝난 앞 판(옛 번호표)은 새 판 음악을 못 끈다 · 제 번호표면 끈다 · 번호표 없이(게임기 닫기)는 늘 끈다', () => {
  const t1 = gb.gameMusicStart('tower', probe);
  const t2 = gb.gameMusicStart('dig', probe); // 「끝!」 0.9초 사이에 닫았다 다시 열어 새 판
  assert.ok(Number.isInteger(t1) && t2 > t1);
  gb.gameMusicStop(t1); // 앞 판의 done이 늦게 풀림
  assert.deepEqual([gb.gameMusicState().game, gb.gameMusicState().playing], ['dig', true], '새 판 음악은 그대로');
  gb.gameMusicStop(t2);
  assert.deepEqual([gb.gameMusicState().game, gb.gameMusicState().playing], ['', false]);
  gb.gameMusicStart('pair', probe);
  gb.gameMusicStop();
  assert.equal(gb.gameMusicState().game, '', '닫기는 번호표 없이도');
});

test('🔍 Codex 139차 보탬: 소리 장치가 잠깐 뺏김(interrupted)·닫힘(closed) → 새 장치로 다시 · localStorage가 고장 나도 멈추지 않음 · 시계가 크게 건너뛰어도 마디를 한꺼번에 쌓지 않음', async () => {
  gb.gameMusicStart('run', probe);
  const c1 = ctxNow();
  c1.state = 'interrupted'; // 전화·다른 앱이 소리를 가져감
  gb.gameMusicTick();
  assert.equal(gb.gameMusicState().playing, false);
  c1.state = 'running';
  gb.gameMusicTick();
  assert.equal(gb.gameMusicState().playing, true);
  c1.state = 'closed';
  gb.gameMusicTick();
  assert.equal(gb.gameMusicState().playing, false, '닫힌 장치 — 빼고(던지지 않음)');
  sfx.unlockMusic(); // 다음 손길에 새 장치
  const c2 = ctxNow();
  assert.ok(c2 && c2 !== c1);
  gb.gameMusicTick();
  assert.equal(gb.gameMusicState().playing, true, '새 장치에서 다시');
  assert.ok(c2.oscs.length > 0);
  // 시계가 100초 건너뜀 — 놓친 마디를 한꺼번에 예약하지 않는다
  const before = gb.gameMusicState().pos.run;
  c2.currentTime += 100;
  gb.gameMusicTick();
  assert.equal(gb.gameMusicState().pos.run, (before + 1) % GAME_SONGS[0].bars.length, '한 마디만');
  // localStorage 고장
  const ls = globalThis.localStorage;
  globalThis.localStorage = { getItem() { throw new Error('막힘'); }, setItem() { throw new Error('막힘'); } };
  try {
    assert.doesNotThrow(() => { gb.toggleGameMusic(); gb.toggleGameMusic(); });
    assert.equal(gb.gameMusicOn(), true);
    c2.currentTime += barSec(GAME_SONGS[0]);
    assert.doesNotThrow(() => gb.gameMusicTick());
    assert.equal(gb.gameMusicState().playing, true);
  } finally {
    globalThis.localStorage = ls;
  }
  gb.gameMusicStop();
});

test('🎵 타이머 — 판이 시작되면 0.1초 따지기 하나(node 시험을 붙잡지 않게 unref) · 판이 끝나면 지움 · 두 번 시작해도 하나', () => {
  gb.GAME_BGM.tick = 100;
  try {
    gb.gameMusicStart('dig', probe);
    gb.gameMusicStart('dig', probe);
    assert.equal(gb.gameMusicState().timer, true);
    gb.gameMusicStop();
    assert.equal(gb.gameMusicState().timer, false);
  } finally {
    gb.GAME_BGM.tick = 0;
  }
  const src = read('js/gamebgm.js');
  assert.ok(src.includes("if (st.timer && typeof st.timer.unref === 'function') st.timer.unref();"));
});

// ───────────────────── 📤 기록 (v337) ─────────────────────

const todayKey337 = () => { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
const wait337 = () => new Promise((r) => setTimeout(r, 30));

test('📤 v337 게임 음악 기록 — 소리가 난 초는 소리 장치 시계로 뺄 때 한 번에(한 번에 600초까지) · 🔇 끈 수·다시 켠 수 · 소리가 안 났으면(⚙ 끔) 초 없음 · 기기 시계는 상관없음 (Codex 141차)', async () => {
  const day = todayKey337();
  const val = async (k) => Number((await getDaily(day))[k]) || 0;
  await wait337();
  const s0 = await val('gameMusicSec');
  const off0 = await val('gameMusicOff');
  const on0 = await val('gameMusicOn');
  const ctx = ctxNow();
  ctx.state = 'running';
  const realNow = Date.now;
  try {
    gb.gameMusicStart('dig', probe);
    assert.equal(gb.gameMusicState().playing, true);
    ctx.currentTime += 42.5;
    Date.now = () => realNow() + 3_600_000; // 기기 시계가 건너뛰어도 셈은 소리 장치 시계로
    gb.gameMusicStop();
    Date.now = realNow;
    await wait337();
    assert.equal(await val('gameMusicSec'), s0 + 42, '틀어 둔 42.5초 → 42');
    gb.gameMusicStart('dig', probe);
    ctx.currentTime += 3600;
    gb.gameMusicStop();
    await wait337();
    assert.equal(await val('gameMusicSec'), s0 + 42 + 600, '한 번에 600초까지');
    gb.setGameBgmEnabled(false);
    gb.gameMusicStart('dig', probe);
    assert.equal(gb.gameMusicState().playing, false);
    ctx.currentTime += 30;
    gb.gameMusicStop();
    gb.setGameBgmEnabled(true);
    await wait337();
    assert.equal(await val('gameMusicSec'), s0 + 642, '소리가 안 났으면 안 셈');
    gb.gameMusicStart('pair', probe);
    ctx.currentTime += 10;
    assert.equal(gb.toggleGameMusic(), false); // 🔇 — 빼면서 10초를 센다
    await wait337();
    assert.deepEqual([await val('gameMusicOff'), await val('gameMusicOn')], [off0 + 1, on0], '끄면 끈 수만');
    ctx.currentTime += 20; // 꺼 둔 동안은 안 셈
    assert.equal(gb.toggleGameMusic(), true);
    ctx.currentTime += 5;
    gb.gameMusicStop();
    await wait337();
    assert.deepEqual([await val('gameMusicOff'), await val('gameMusicOn')], [off0 + 1, on0 + 1], '끈 수·다시 켠 수');
    assert.equal(await val('gameMusicSec'), s0 + 642 + 15, '켜 둔 동안만(10 + 5)');
  } finally {
    Date.now = realNow;
  }
});

test('📤 v337 끝나는 길마다 초를 한 번만 — 판 끝(stop) · 게임 바꿈 · 앱 내림 · pagehide · 장치 잠듦(잠든 동안은 시계도 멈춤) · 다시 틀면 새로 셈 (Codex 141차)', async () => {
  const day = todayKey337();
  const val = async () => Number((await getDaily(day)).gameMusicSec) || 0;
  await wait337();
  const s0 = await val();
  const ctx = ctxNow();
  ctx.state = 'running';
  // 판 끝 — 빼고 나서는 더 안 센다
  gb.gameMusicStart('tower', probe);
  ctx.currentTime += 3;
  mode = 'stop';
  gb.gameMusicTick();
  ctx.currentTime += 50;
  gb.gameMusicTick();
  mode = 'play';
  gb.gameMusicStop();
  await wait337();
  assert.equal(await val(), s0 + 3, '판 끝 3초 · 끝난 뒤 50초는 안 셈');
  // 게임 바꿈 — 앞 곡 4초 · 뒤 곡 6초
  gb.gameMusicStart('dig', probe);
  ctx.currentTime += 4;
  gb.gameMusicStart('run', probe);
  ctx.currentTime += 6;
  gb.gameMusicStop();
  await wait337();
  assert.equal(await val(), s0 + 13);
  // 앱 내림 → 다시 보임 → 새로 틀면 그때부터
  gb.gameMusicStart('dig', probe);
  ctx.currentTime += 5;
  document.hidden = true;
  docL.visibilitychange();
  ctx.currentTime += 100; // 내려 둔 동안
  gb.gameMusicTick();
  document.hidden = false;
  gb.gameMusicTick();
  ctx.currentTime += 2;
  winL.pagehide();
  await wait337();
  assert.equal(await val(), s0 + 20, '내림 5초 + 다시 튼 뒤 2초(pagehide) · 내려 둔 100초는 안 셈');
  // 장치 잠듦 — 그 전 7초 · 깨어나 3초
  gb.gameMusicTick();
  ctx.currentTime += 7;
  ctx.state = 'suspended';
  gb.gameMusicTick();
  ctx.state = 'running';
  gb.gameMusicTick();
  ctx.currentTime += 3;
  gb.gameMusicStop();
  await wait337();
  assert.equal(await val(), s0 + 30, '잠들기 전 7초 + 깨어나 3초');
});

test('📤 v337 하루 기록 칸 · usage/날짜.md 한 줄 — 🎮🎵 게임 음악(소리가 난 시간 · 🔇 끔 · 다시 켬) · 읽는 법 · 없으면 줄도 없음 · 바로 끈 날도 보임', () => {
  assert.equal(emptyDaily('2026-10-25').gameMusicSec, 0);
  const m = mergeDailyDelta(mergeDailyDelta(null, '2026-10-25', { gameMusicSec: 40, gameMusicOff: 1 }), '2026-10-25', { gameMusicSec: 25, gameMusicOn: 1 });
  assert.deepEqual([m.gameMusicSec, m.gameMusicOff, m.gameMusicOn], [65, 1, 1]);
  const day = '2026-10-25';
  const [f] = usageFiles([{ date: day, appOpens: 1, uGame: 300, gamePlays: 3, gameMusicSec: 125, gameMusicOff: 1, gameMusicOn: 1 }], day, PLACES);
  const line = f.text.split('\n').find((l) => l.startsWith('- 10-25:'));
  assert.ok(line.includes('🎮 게임 3판 · 🎮🎵 게임 음악 2분 · 🔇 끔 1번 · 다시 켬 1번'), line);
  assert.ok(f.text.includes('- 🎮🎵 게임 음악 = 게임기에서 한 판 동안 음악이 나온 시간 (v337부터 · 기기 음량·음소거는 알 수 없음'), '읽는 법');
  const [g] = usageFiles([{ date: day, appOpens: 1, gamePlays: 2 }], day, PLACES);
  assert.ok(!g.text.split('\n').find((l) => l.startsWith('- 10-25:')).includes('게임 음악'), '없으면 줄도 없음');
  const [h] = usageFiles([{ date: day, appOpens: 1, gameMusicOff: 1 }], day, PLACES);
  assert.ok(h.text.includes('🎮🎵 게임 음악 0분 · 🔇 끔 1번'), '바로 끈 날도 보인다');
});

// ───────────────────── 화면 잇기 ─────────────────────

test('🔗 잇기 — 게임 카드를 누른 손길 안에서 깨움 · 판이 시작되면 run.music으로 틀고 · 끝·깨짐·닫기에 멈춤 · 머리줄 🎵(⚙를 끄면 숨김) · ⚙ 이벤트 배경음악 · 앱 셸 · 판 v335', () => {
  const gv = read('js/gameview.js');
  assert.ok(gv.includes("import { gameMusicStart, gameMusicStop, gameMusicWake, toggleGameMusic, gameMusicOn, gameMusicAllowed } from './gamebgm.js';"));
  const fn = (head) => gv.slice(gv.indexOf(head), gv.indexOf('\n}\n', gv.indexOf(head)));
  const round = fn('async function startRound(');
  assert.ok(round.indexOf('gameMusicWake();') > 0 && round.indexOf('gameMusicWake();') < round.indexOf('await '), '처음 await 전 — 누른 손길 안');
  assert.ok(round.includes("tune = g.quiet ? 0 : gameMusicStart(id, typeof run.music === 'function' ? run.music : null);"), 'quiet 게임(🧠 v346)은 안 튼다');
  assert.ok(round.indexOf('const run = R.run(') < round.indexOf('gameMusicStart(') && round.indexOf('gameMusicStart(') < round.indexOf('await run.done'));
  assert.ok(/const res = await run\.done;\n {4}if \(tune\) gameMusicStop\(tune\);/.test(round), '판이 끝나면 — 내 판 음악만(번호표)');
  assert.ok(/\} catch \{\n[^\n]*\n {4}if \(tune\) gameMusicStop\(tune\);/.test(round), '판이 깨지면 — 시작한 판만');
  assert.equal((round.match(/gameMusicStop\(\)/g) || []).length, 0, '판 안에서는 번호표 없이 끄지 않는다 (Codex 139차 #1)');
  assert.ok(fn('export function closeGames(').includes('gameMusicStop();'), '닫으면');
  assert.ok(fn('export function openGames(').includes('syncMusicBtn();'), '열 때 단추 모양(⚙가 바뀌었을 수 있다)');
  const sync = fn('function syncMusicBtn(');
  assert.ok(sync.includes("b.hidden = !gameMusicAllowed() || (ui.quiet && ui.view === 'play');") && sync.includes("b.textContent = on ? '🎵' : '🔇';") && sync.includes("b.setAttribute('aria-pressed', on ? 'true' : 'false');"));
  assert.ok(gv.includes("if (mb) mb.addEventListener('click', () => { toggleGameMusic(); syncMusicBtn(); });"));
  const btn = '<button type="button" class="btn btn-icon gm-music" aria-label="게임 음악" aria-pressed="true">🎵</button><button type="button" class="btn btn-icon gm-x" aria-label="닫기">✕</button>';
  assert.ok(read('index.html').includes(btn), 'index.html 머리줄 — ✕ 바로 앞');
  assert.ok(gv.replace(/'\n {6}\+ '/g, '').includes(btn), 'ensureBox가 만드는 틀도 같게');
  const css = read('css/style.css');
  assert.ok(css.includes('.gm-music { margin-left: auto; }') && css.includes('.gm-music[hidden] { display: none; }'));
  const pl = read('js/player.js');
  assert.ok(pl.includes("import { setGameBgmEnabled } from './gamebgm.js';"));
  assert.equal((pl.match(/setGameBgmEnabled\(settings\.bgm\);/g) || []).length, 2, '설정을 읽을 때·저장할 때');
  assert.equal((pl.match(/setBgmEnabled\(settings\.bgm\);/g) || []).length, 2, '이벤트 음악도 저장하면 바로');
  assert.match(read('index.html'), /🎵 이벤트 배경음악 <small>— 🧩 퍼즐·⚔️ 배틀·🎯 잡기·🎮 미니 게임에 깔려요/);
  const sw = read('sw.js');
  assert.ok(sw.includes("'./js/gamesong.js',") && sw.includes("'./js/gamebgm.js',"));
  const ver = Number((/const CACHE_VERSION = 'v(\d+)';/.exec(sw) || [])[1]);
  assert.ok(ver >= 335);
  assert.match(read('js/version.js'), new RegExp(`APP_VERSION = 'v${ver}'`));
});
