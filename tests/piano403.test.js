// 🎹 v403 곡 표기 넓힘 — 못갖춘마디(pickup) · 짧은 마지막 마디 · 연주 차례(play: 도돌이표·1·2번 괄호) ·
//   붙임줄은 연주 차례대로(되돌아가는 자리를 넘어도) · 8va·8vb(소리만 옮기고 그림 자리는 그대로) · 책 마디 번호 ·
//   화면이 도돌이표·괄호·8vb를 그린다 (곡은 시험용으로 새로 쓴 짧은 곡 — 진우 책 곡은 공개 저장소에 두지 않는다)
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readSong, playOrder, perform, lineBars, barNum, firstNum, stepsOf, endingShape } from '../js/piano.js';
import { initProfile } from '../js/xp.js';
import { loadToday } from '../js/timelimit.js';

/** 시험 곡 — 못갖춘마디 1박 · 1~3마디 도돌이(1. 3마디 · 2. 4마디) · 5마디 오른손 8vb · 마지막 마디 3박 */
const TRY = {
  id: 'try403', ko: '연습 곡 403', bpm: 100, beats: 4, pickup: 1,
  lines: [0, 3],
  repeats: [{ from: 1, to: 3 }],
  endings: [{ label: '1.', bars: [3] }, { label: '2.', bars: [4] }],
  play: [[0, 3], [1, 2], [4, 5]],
  ottava: [{ hand: 'R', from: 5, to: 5, shift: -1 }],
  chords: { 1: ['C'], 5: ['C'] },
  dyn: { 0: 'mp' },
  right: ['G4:1:1', 'C5:2:4 B4:2', 'A4:4', 'G4:2 R:2', 'C5:4', 'C5:3'],
  left: ['R:1', 'C3:4:5', 'F3:4', 'G3:4', 'C3:4~', 'C3:3'],
};
const bad = (patch) => readSong({ ...TRY, ...patch });
const badOf = (patch) => (bad(patch).bad || []).join(' · ');

test('못갖춘마디 — 첫 마디는 pickup박 · 책 번호 0부터 · 마지막 마디는 beats 또는 남은 박 · 두 손이 같아야', () => {
  const r = readSong(TRY);
  assert.equal(r.ok, true, JSON.stringify(r.bad));
  const s = r.song;
  assert.deepEqual([s.pickup, s.n, firstNum(s), barNum(s, 0), barNum(s, 5)], [1, 6, 0, 0, 5]);
  assert.deepEqual(s.lens, [1, 4, 4, 4, 4, 3]);
  assert.match(badOf({ right: ['G4:2', ...TRY.right.slice(1)] }), /오른손 0마디 박 합 2/);
  assert.match(badOf({ right: [...TRY.right.slice(0, 5), 'C5:2'] }), /오른손 5마디 박 합 2/);
  assert.match(badOf({ left: [...TRY.left.slice(0, 5), 'C3:4'] }), /5마디 두 손 박 합이 다름/);
  assert.equal(bad({ right: [...TRY.right.slice(0, 5), 'C5:4'], left: [...TRY.left.slice(0, 5), 'C3:4'] }).ok, true, '마지막 마디는 꽉 찬 마디여도');
  assert.match(badOf({ pickup: 4 }), /못갖춘마디/);
  assert.match(badOf({ pickup: -1 }), /못갖춘마디/);
  assert.match(badOf({ lines: [1, 3] }), /줄 첫 마디/, '못갖춘마디가 있으면 줄은 0마디부터');
  assert.match(badOf({ lines: [0, 6] }), /줄 첫 마디/);
  assert.deepEqual(lineBars(s, 0), [0, 3]);
  assert.deepEqual(lineBars(s, 1), [3, 6]);
  const noPick = { ...TRY, pickup: undefined, lines: [1], repeats: undefined, endings: undefined, play: undefined, ottava: undefined };
  assert.match(readSong(noPick).bad.join(), /오른손 1마디 박 합 1/, '못갖춘마디가 없으면 첫 칸도 꽉 찬 마디 · 번호는 1부터');
});

test('연주 차례 — play 그대로(책 번호) · 줄 하나는 되돌이 없이 · 모든 마디가 한 번은 · D.S.와 함께 안 됨', () => {
  const s = readSong(TRY).song;
  assert.deepEqual(playOrder(s), [0, 1, 2, 3, 1, 2, 4, 5]);
  assert.deepEqual(playOrder(s, 1), [3, 4, 5]);
  const p = perform(s);
  assert.deepEqual(p.bars.map((b) => [b.src, b.at, b.len]), [[0, 0, 1], [1, 1, 4], [2, 5, 4], [3, 9, 4], [1, 13, 4], [2, 17, 4], [4, 21, 4], [5, 25, 3]]);
  assert.equal(p.end, 28, '못갖춘마디 1박 + 마지막 3박');
  assert.equal(perform(s, 0).end, 9);
  assert.match(badOf({ play: [[0, 3], [5, 5]] }), /연주 차례에 빠진 마디/);
  for (const play of [[[0, 6]], [[3, 1]], [], [[0]], 'x']) assert.ok(bad({ play }).bad.includes('연주 차례'), `깨진 차례 ${JSON.stringify(play)}`);
  assert.match(badOf({ segno: 1, fine: 2, dsAlFine: true }), /D\.S\.와 연주 차례를 함께 씀/);
  assert.match(badOf({ play: undefined }), /도돌이표·괄호가 있으면 연주 차례도/);
  assert.match(badOf({ repeats: [{ from: 3, to: 1 }] }), /도돌이표/);
  assert.match(badOf({ endings: [{ label: '', bars: [3] }] }), /괄호/);
  assert.match(badOf({ endings: [{ label: '1.', bars: [9] }] }), /괄호/);
});

test('붙임줄 — 곡 전체 연주 차례대로 본다 · 되돌아가는 자리를 넘으면 다음 음이 같아야 · 곡 끝에서 끊기면 안 됨', () => {
  // 2마디 끝 A4~ → 첫 번째엔 3마디 A4로 이어지지만, 두 번째엔 2마디 다음이 4마디(2.) G4 — 소리가 끊긴다
  const jump = badOf({ right: ['G4:1', 'C5:2 B4:2', 'A4:4~', 'A4:4', 'C5:4', 'C5:3'] });
  assert.match(jump, /오른손 2마디 붙임줄이 같은 음으로 안 이어짐/);
  assert.equal((jump.match(/2마디 붙임줄/g) || []).length, 1, '같은 자리는 한 번만 적는다');
  const twice = badOf({ right: ['G4:1', 'C5:2 B4:2~', 'A4:4', 'G4:2 R:2', 'C5:4', 'C5:3'] });   // 1마디는 차례에 두 번 나온다
  assert.equal((twice.match(/1마디 붙임줄/g) || []).length, 1, '차례에 두 번 나와도 한 번만');
  assert.match(badOf({ right: [...TRY.right.slice(0, 5), 'C5:3~'] }), /오른손 5마디 붙임줄이 같은 음으로 안 이어짐/, '곡 끝');
  const p = perform(readSong(TRY).song);
  assert.deepEqual(p.notes.filter((x) => x.hand === 'L' && x.midi === 48).map((x) => [x.t, x.dur]), [[1, 4], [13, 4], [21, 7]], '4~5마디 왼손 C3는 한 번 쳐서 7박');
});

test('8vb — 그 손 그 마디만 소리(midi)가 옥타브 아래 · 그림 자리(d)와 계이름은 그대로 · 건반 밖이면 깨진 곡', () => {
  const s = readSong(TRY).song;
  const c5 = s.bars.R[5][0].notes[0];
  assert.deepEqual([c5.midi, c5.d, c5.name], [60, 35, 'C5'], '적힌 C5 · 소리는 C4');
  assert.equal(s.bars.R[4][0].notes[0].midi, 72, '4마디는 그대로');
  assert.equal(s.bars.L[5][0].notes[0].midi, 48, '왼손은 그대로');
  const lo = readSong({ ...TRY, ottava: [{ hand: 'L', from: 4, to: 5, shift: -1 }] }).song;   // 4~5마디 붙임줄이 같은 옥타브 안
  assert.deepEqual([lo.bars.L[5][0].notes[0].midi, lo.bars.R[5][0].notes[0].midi, lo.bars.L[3][0].notes[0].midi], [36, 72, 55], '왼손 8vb는 왼손 그 마디들만');
  const p = perform(s);
  assert.deepEqual(p.notes.filter((x) => x.hand === 'R' && x.t >= 21).map((x) => [x.t, x.midi, x.dur]), [[21, 72, 4], [25, 60, 3]]);
  assert.ok(stepsOf(p, 'R').some((st) => st.need.includes(60)), '🎹 기다리는 건반도 소리 자리');
  assert.match(badOf({ right: [...TRY.right.slice(0, 4), 'C5:4~', 'C5:3'] }), /오른손 4마디 붙임줄이 같은 음으로 안 이어짐/, '적힌 음이 같아도 8vb 경계를 넘으면 소리가 달라 붙임줄이 안 된다');
  assert.match(badOf({ ottava: [{ hand: 'X', from: 5, to: 5, shift: -1 }] }), /옥타브/);
  assert.match(badOf({ ottava: [{ hand: 'R', from: 5, to: 5, shift: 2 }] }), /옥타브/);
  assert.match(badOf({ ottava: [{ hand: 'R', from: 6, to: 6, shift: -1 }] }), /옥타브/);
  assert.match(badOf({ ottava: [{ hand: 'R', from: 1, to: 1, shift: 1 }], right: ['G4:1', 'C8:2 B4:2', 'A4:4', 'G4:2 R:2', 'C5:4~', 'C5:3'] }), /옥타브 옮긴 음이 건반 밖/);
});

// ───────────────────── 화면 — 그린 글자를 모아 본다 ─────────────────────

test('Codex 207차 — 못갖춘마디 오타 · 같은 손 옥타브 겹침 · 줄 연습의 붙임줄 그림 · 괄호 닫힘 · D.S. 붙임줄', () => {
  const NP = { id: 'np', ko: '작은 곡', bpm: 100, beats: 4, right: ['C4:4', 'D4:4'], left: ['C3:4', 'C3:4'] };
  assert.equal(readSong({ ...NP, pickup: 0 }).ok, true, 'pickup 0 = 못갖춘마디 없음');
  for (const pickup of ['oops', 'NaN', {}, [1, 2]]) assert.ok((readSong({ ...NP, pickup }).bad || []).includes('못갖춘마디'), `오타 pickup ${JSON.stringify(pickup)}`);
  // 같은 손 구간이 겹치면 깨진 곡(두 옥타브가 되지 않게) · 다른 손끼리는 겹쳐도 된다
  assert.match(badOf({ ottava: [{ hand: 'R', from: 5, to: 5, shift: -1 }, { hand: 'R', from: 5, to: 5, shift: -1 }] }), /옥타브 구간이 겹침/);
  assert.match(badOf({ ottava: [{ hand: 'R', from: 4, to: 5, shift: -1 }, { hand: 'R', from: 5, to: 5, shift: 1 }] }), /옥타브 구간이 겹침/);
  const both = readSong({ ...TRY, ottava: [{ hand: 'R', from: 5, to: 5, shift: -1 }, { hand: 'L', from: 4, to: 5, shift: -1 }] });
  assert.equal(both.ok, true, JSON.stringify(both.bad));
  assert.deepEqual([both.song.bars.R[5][0].notes[0].midi, both.song.bars.L[5][0].notes[0].midi], [60, 36]);
  // 곡 전체 차례(1→3→2)에서는 이어지는 붙임줄이 줄 연습(원고 차례 1→2→3)에서는 다른 음(D4)에 닿는다 — 그림도 그리지 않는다
  const TJ = { id: 'tj', ko: '붙임줄', bpm: 100, beats: 4, lines: [1], play: [[1, 1], [3, 3], [2, 2]], right: ['C4:4~', 'D4:4', 'C4:4'], left: ['R:4', 'R:4', 'R:4'] };
  const tj = readSong(TJ);
  assert.equal(tj.ok, true, JSON.stringify(tj.bad));
  const headR = (p) => p.heads.filter((h) => h.hand === 'R');
  assert.deepEqual(headR(perform(tj.song)).map((h) => h.tie), [true, false, false], '곡 전체: 1마디 C4 → 3마디 C4');
  assert.deepEqual(headR(perform(tj.song, 0)).map((h) => h.tie), [false, false, false], '줄 연습: 1마디 C4 → 2마디 D4 — 붙임줄 그림 없음');
  assert.deepEqual(perform(tj.song, 0).notes.filter((x) => x.hand === 'R').map((x) => [x.midi, x.dur]), [[60, 4], [62, 4], [60, 4]], '소리도 따로');
  // 괄호 닫힘은 그 괄호 끝이 도돌이표 끝일 때만 — 괄호 묶음이 둘이어도
  const two = { repeats: [{ from: 1, to: 3 }, { from: 5, to: 7 }] };
  assert.deepEqual(endingShape(two, { label: '1.', bars: [3] }, 3), { open: true, close: true });
  assert.deepEqual(endingShape(two, { label: '2.', bars: [4] }, 4), { open: true, close: false }, '첫 묶음의 2번 괄호는 열린 채로');
  assert.deepEqual(endingShape(two, { label: '1.', bars: [7] }, 7), { open: true, close: true });
  const split = { repeats: [{ from: 13, to: 29 }] };   // 「1.」이 20마디(시작)와 29마디(끝)에 나뉜 꼴
  assert.deepEqual(endingShape(split, { label: '1.', bars: [20, 29] }, 20), { open: true, close: false });
  assert.deepEqual(endingShape(split, { label: '1.', bars: [20, 29] }, 29), { open: false, close: true });
  // D.S. — 마지막 마디에서 세뇨로 이어지는 붙임줄은 된다(한 번 쳐서 8박) · 돌아온 뒤 Fine에서 끊기는 붙임줄은 안 된다
  const DS = { id: 'ds', ko: 'D.S.', bpm: 100, beats: 4, segno: 1, fine: 1, dsAlFine: true, left: ['R:4', 'R:4'] };
  const ok = readSong({ ...DS, right: ['C5:4', 'C5:4~'] });
  assert.equal(ok.ok, true, JSON.stringify(ok.bad));
  assert.deepEqual(perform(ok.song).notes.map((x) => [x.t, x.dur]), [[0, 4], [4, 8]]);
  assert.match(readSong({ ...DS, right: ['C5:4~', 'C5:4'] }).bad.join(), /오른손 1마디 붙임줄이 같은 음으로 안 이어짐/);
});

const texts = [];
const textAt = [];   // { t, y, font } — 그림 밖(위로 잘림)인지 보려고
const dashY = [];    // 점선을 그릴 때 moveTo의 y
let dashOn = false;
let arcs = 0;
let dashes = 0;
const headX = [];    // 그린 음 머리의 x
let lastTx = 0;
const CTX = new Proxy({}, {
  get: (o, k) => {
    if (k in o) return o[k];
    if (k === 'fillText') return (t, x, y) => { texts.push(String(t)); textAt.push({ t: String(t), x, y, font: String(o.font || '') }); };
    if (k === 'translate') return (x) => { lastTx = x; };
    if (k === 'ellipse') return () => { headX.push(lastTx); };   // 음 머리는 translate(x, y) 뒤 ellipse
    if (k === 'moveTo') return (x, y) => { if (dashOn) dashY.push(y); };
    if (k === 'arc') return () => { arcs += 1; };
    if (k === 'setLineDash') return (d) => { dashOn = !!(d && d.length); if (dashOn) dashes += 1; };
    if (k === 'createLinearGradient') return () => ({ addColorStop() {} });
    return () => {};
  },
  set: (o, k, v) => { o[k] = v; return true; },
});
const all = [];
class El {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.children = []; this.parent = null; this.on = {}; this.attrs = {}; this.style = {};
    this.hidden = false; this._text = ''; this.className = ''; this.id = ''; this.value = '';
    all.push(this);
  }
  get textContent() { return this._text + this.children.map((c) => c.textContent).join(''); }
  set textContent(v) { for (const c of this.children) c.parent = null; this.children = []; this._text = String(v); }
  get innerHTML() { return ''; }
  set innerHTML(v) { this.textContent = ''; }
  appendChild(c) { c.parent = this; this.children.push(c); return c; }
  addEventListener(t, f) { (this.on[t] ||= []).push(f); }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  getContext() { return CTX; }
  getBoundingClientRect() { return { top: 80, left: 0, width: 1000, height: 600 }; }
  get clientWidth() { return 1000; }
  setPointerCapture() {}
}
const ROOT = new El('html');
for (const id of ['music-main', 'btn-music-back']) { const e = new El('div'); e.id = id; ROOT.appendChild(e); }
const attached = (e) => { for (let x = e; x; x = x.parent) if (x === ROOT) return true; return false; };
globalThis.document = {
  hidden: false,
  documentElement: ROOT,
  getElementById: (id) => { for (let i = all.length - 1; i >= 0; i -= 1) if (all[i].id === id && attached(all[i])) return all[i]; return null; },
  createElement: (t) => new El(t),
  addEventListener() {},
  querySelectorAll: () => [],
};
class Param { constructor(v = 1) { this.value = v; } setValueAtTime() {} exponentialRampToValueAtTime() {} setTargetAtTime() {} cancelScheduledValues() {} }
class FakeAC {
  constructor() { this.currentTime = 0; this.state = 'running'; this.destination = {}; }
  createGain() { return { gain: new Param(1), connect() {}, disconnect() {} }; }
  createDynamicsCompressor() { return { connect() {} }; }
  createOscillator() { return { type: '', frequency: new Param(440), connect() {}, start() {}, stop() {}, onended: null }; }
  resume() { return Promise.resolve(); }
}
globalThis.window = { addEventListener() {}, innerHeight: 800, devicePixelRatio: 1, AudioContext: FakeAC };
globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = () => {};
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: (k) => { store.delete(k); },
};
// 빠르기가 바뀌는 곡 — 3마디부터 ♩120 (화면이 그 마디의 빠르기로 흐르는지 · 2마디 E4는 붙임줄로 경계를 넘고 3마디 왼손 C3는 경계에서 시작)
const TPV = { id: 'tpv403', ko: '빠르기 곡', bpm: 60, tempo: { 3: 120 }, beats: 4, right: ['C4:4', 'D4:2 E4:2~', 'E4:2 G4:2', 'F4:4'], left: ['R:4', 'R:4', 'C3:4', 'R:4'] };
// 박자가 바뀌는 곡 — 3마디부터 4/4 · 못갖춘마디를 1마디로 세는 곡(TRY를 책 번호만 하나씩 밀어)
const MTV = { id: 'mtv403', ko: '박자 곡', bpm: 60, beats: 3, meter: { 3: 4 }, right: ['C4:3', 'D4:3', 'E4:4', 'F4:4'], left: ['C3:3', 'C3:3', 'C3:4', 'C3:4'] };
const PB = { ...TRY, id: 'pb403', pickupBar: 1, lines: [1, 4], repeats: [{ from: 2, to: 4 }], endings: [{ label: '1.', bars: [4] }, { label: '2.', bars: [5] }], play: [[1, 4], [2, 3], [5, 6]], ottava: [{ hand: 'R', from: 6, to: 6, shift: -1 }], chords: {}, dyn: {} };
store.set('shincoach.pianoSongs', JSON.stringify([TRY, TPV, MTV, PB]));   // 받아 둔 곡처럼
store.set('shincoach.pianoSongsAt', String(Date.now()));    // 곡 받기는 10분 안 — 묻지 않는다

let P;
before(async () => {
  console.warn = () => {};
  await initProfile();
  await loadToday();
  const PV = await import('../js/pianoview.js');
  PV.initMusic({ showView: () => {} });
  await PV.enterMusic();
  P = globalThis.window.__piano;
});

test('화면 — 받은 곡을 고를 수 있고 · 곡 전체는 연주 차례대로 · 도돌이표·1·2번 괄호·8vb를 그린다 · 못갖춘마디는 번호 없이', () => {
  P.openSong('try403');
  assert.equal(P.S.song.id, 'try403');
  assert.equal(P.S.line, -1);
  assert.deepEqual(P.S.perf.bars.map((b) => barNum(P.S.song, b.src)), [0, 1, 2, 3, 1, 2, 4, 5]);
  texts.length = 0; arcs = 0; dashes = 0;
  for (let t = -4; t <= 28; t += 2) { P.S.t = t; P.draw(1000); }
  for (const want of ['1.', '2.', '8vb', 'mp', '1', '5']) assert.ok(texts.includes(want), `그린 글자에 ${want}`);
  assert.ok(!texts.includes('0'), '못갖춘마디 번호 0은 그리지 않는다');
  assert.ok(!texts.includes('Fine') && !texts.includes('𝄋'), '세뇨·피네가 없는 곡(0)인데 못갖춘마디 번호도 0 — 세뇨·Fine을 그리면 안 된다');
  // 도돌이표 점 — 여는 것·닫는 것을 하나씩 빼고 그리면 점(arc)이 줄어야
  const arcsWith = (reps) => { const keep = P.S.song.repeats; P.S.song.repeats = reps; arcs = 0; for (let t = -4; t <= 28; t += 2) { P.S.t = t; P.draw(1000); } P.S.song.repeats = keep; return arcs; };
  const full = arcsWith([{ from: 1, to: 3 }]);
  assert.ok(full > arcsWith([{ from: 1, to: 99 }]), '닫는 :‖ 점');
  assert.ok(full > arcsWith([{ from: 99, to: 3 }]), '여는 ‖: 점');
  assert.ok(dashes >= 1, '8vb 점선');
});

test('화면 — 오른손 8va 점선·글자는 악보 그림 안(위로 잘리지 않음) · 8vb는 오선 아래 (Codex 207차)', () => {
  P.openSong('try403');
  const keep = P.S.song.ottava;
  const CLIP_TOP = 6;   // drawSheet의 잘라내기 시작
  for (const [o, word] of [[{ hand: 'R', from: 1, to: 1, shift: 1 }, '8va'], [{ hand: 'R', from: 1, to: 1, shift: -1 }, '8vb']]) {
    P.S.song.ottava = [o];
    dashY.length = 0; textAt.length = 0;
    for (let t = -4; t <= 6; t += 2) { P.S.t = t; P.draw(1000); }
    assert.ok(dashY.length > 0, `${word} 점선`);
    assert.ok(dashY.every((y) => y >= CLIP_TOP), `${word} 점선 y ${Math.min(...dashY).toFixed(1)}`);
    const lab = textAt.filter((x) => x.t === word);
    assert.ok(lab.length > 0, `${word} 글자`);
    for (const x of lab) {
      const px = Number((/([\d.]+)px/.exec(x.font) || [])[1]) || 12;
      assert.ok(x.y - px >= CLIP_TOP - 0.5, `${word} 글자 윗끝 ${(x.y - px).toFixed(1)}`);
    }
  }
  P.S.song.ottava = keep;
});

test('곡 표기 더 — 박자 바꿈(meter) · 빠르기 바꿈(tempo) · 못갖춘마디를 1마디로 세는 책(pickupBar)', async () => {
  const { bpmAt } = await import('../js/piano.js');
  // 3/4로 시작해 3마디부터 4/4 — 마디마다 그 박자로 박 합을 본다
  const MT = { id: 'mt', ko: '박자', bpm: 60, beats: 3, meter: { 3: 4 }, right: ['C4:3', 'D4:3', 'E4:4', 'F4:4'], left: ['R:3', 'R:3', 'R:4', 'R:4'] };
  const mt = readSong(MT);
  assert.equal(mt.ok, true, JSON.stringify(mt.bad));
  assert.deepEqual([mt.song.meters, mt.song.lens], [[3, 3, 4, 4], [3, 3, 4, 4]]);
  assert.equal(perform(mt.song).end, 14);
  assert.match(readSong({ ...MT, right: ['C4:3', 'D4:3', 'E4:3', 'F4:4'] }).bad.join(), /오른손 3마디 박 합 3/, '바뀐 뒤 마디는 새 박자');
  assert.match(readSong({ ...MT, left: ['R:3', 'R:3', 'R:3', 'R:4'] }).bad.join(), /왼손 3마디 박 합 3/, '왼손도 바뀐 박자로 (Codex 208차)');
  for (const meter of [{ 3: 5 }, { 1: 4 }, { 9: 4 }, 'x']) assert.ok((readSong({ ...MT, meter }).bad || []).includes('박자 바꿈'), `깨진 박자 바꿈 ${JSON.stringify(meter)}`);
  assert.deepEqual(readSong({ ...MT, meter: { 3: '4' } }).song.meters, [3, 3, 4, 4], '빠르기 바꿈처럼 글자 "4"도 숫자로 (Codex 208차)');
  // 빠르기 바꿈 — 그 마디부터 · 시작 전(준비 박)은 첫 마디 빠르기 · 바꿈 없는 곡은 bpms 없이(옛 곡 그대로)
  const TP = { ...MT, meter: undefined, beats: 4, tempo: { 3: 120 }, right: ['C4:4', 'D4:4', 'E4:4', 'F4:4'], left: ['R:4', 'R:4', 'R:4', 'R:4'] };
  const tp = readSong(TP).song;
  const tpp = perform(tp);
  assert.deepEqual(tp.bpms, [60, 60, 120, 120]);
  assert.deepEqual([bpmAt(tp, tpp, -2), bpmAt(tp, tpp, 7.9), bpmAt(tp, tpp, 8), bpmAt(tp, tpp, 99)], [60, 60, 120, 120]);
  assert.equal(readSong({ ...TP, tempo: undefined }).song.bpms, null);
  assert.equal(bpmAt(readSong({ ...TP, tempo: undefined }).song, tpp, 9), 60);
  // 음 길이(초)는 마디마다 그 빠르기로 나눠 더한다 — 2마디에서 3마디로 넘는 8박 = 4초 + 2초 (Codex 208차 P2)
  const { secsOf } = await import('../js/piano.js');
  assert.deepEqual([secsOf(tp, tpp, 4, 8), secsOf(tp, tpp, 8, 4), secsOf(tp, tpp, 0, 4), secsOf(tp, tpp, 7, 2)], [6, 2, 4, 1.5]);
  assert.deepEqual([secsOf(tp, tpp, -2, 2), secsOf(tp, tpp, 15, 2)], [2, 1], '연주판 밖은 가까운 마디 빠르기');
  assert.equal(secsOf(readSong({ ...TP, tempo: undefined, bpm: 120 }).song, tpp, 4, 8), 4, '빠르기 바꿈이 없으면 곡 빠르기 그대로(♩120 8박 = 4초)');
  // 되돌아가면 원래 마디의 빠르기 — 1~2마디(♩60) · 3~4마디(♩120) · 다시 1~2마디
  const back = readSong({ ...TP, play: [[1, 4], [1, 2]] }).song;
  assert.equal(secsOf(back, perform(back), 14, 4), 1 + 2, '16박째(다시 1마디)부터는 ♩60');
  for (const tempo of [{ 3: 20 }, { 3: 300 }, { 1: 90 }, { 7: 90 }]) assert.ok((readSong({ ...TP, tempo }).bad || []).includes('빠르기 바꿈'), `깨진 빠르기 바꿈 ${JSON.stringify(tempo)}`);
  // 못갖춘마디를 1마디로 세는 책 — 번호가 1부터 · 못갖춘마디 번호를 그리지 않는 것은 아래 화면 시험에서
  const pb = readSong(PB);
  assert.equal(pb.ok, true, JSON.stringify(pb.bad));
  assert.deepEqual([firstNum(pb.song), barNum(pb.song, 0), barNum(pb.song, 5)], [1, 1, 6]);
  assert.deepEqual(playOrder(pb.song), [0, 1, 2, 3, 1, 2, 4, 5], 'pickupBar 0인 TRY와 같은 차례');
  assert.match(readSong({ ...PB, pickupBar: 2 }).bad.join(), /못갖춘마디 번호/);
  assert.match(readSong({ ...NP_LIKE, pickupBar: 1 }).bad.join(), /못갖춘마디 번호/, '못갖춘마디가 없는데 번호만');
});
const NP_LIKE = { id: 'np2', ko: '작은 곡', bpm: 100, beats: 4, right: ['C4:4', 'D4:4'], left: ['C3:4', 'C3:4'] };

test('화면 — 빠르기가 바뀌는 곡은 지금 마디의 빠르기로 흐른다 (준비 박은 첫 마디 빠르기)', () => {
  P.openSong('tpv403');
  const sp = P.S.sp;
  for (const [at, bpm] of [[-2, 60], [3.5, 60], [8.5, 120], [15, 120]]) {
    P.S.t = at;
    assert.ok(Math.abs(P.secPerBeat() - 60 / (bpm * sp)) < 1e-9, `박 ${at}에서 ♩${bpm}`);
  }
});

test('화면 — 빠르기가 바뀌는 자리를 걸치는 음 · 바뀌는 자리에서 시작하는 음은 마디마다 그 빠르기 길이로 울린다 (Codex 208차 P2)', () => {
  P.openSong('tpv403');
  const keep = P.S.mode;
  P.S.mode = 'listen';   // 앱이 두 손 다 친다
  P.toStart();
  const ring = (from, midi) => {
    P.S.t = from;
    const t0 = performance.now();
    P.advance(0.2);   // 한 화면에 경계 앞에서 넘어간다
    const t1 = performance.now();
    const u = P.S.sounding.get(midi);
    assert.ok(u, `midi ${midi}가 울림`);
    return [u.until - t1, u.until - t0];   // 울릴 밀리초의 아래·위 끝
  };
  const sp = P.S.sp;
  for (const [from, midi, beatsSec, why] of [[5.9, 64, 2 + 1, '2마디 E4~ 3마디 E4 = ♩60 2박 + ♩120 2박'], [7.9, 48, 2, '3마디 왼손 C3 4박 = ♩120']]) {
    const want = (beatsSec / sp) * 0.95 * 1000;
    const [lo, hi] = ring(from, midi);
    assert.ok(lo <= want + 1e-6 && want <= hi + 1e-6, `${why}: ${want.toFixed(0)}ms 이어야 · ${lo.toFixed(0)}~${hi.toFixed(0)}ms`);
  }
  P.S.mode = keep;
  P.toStart();
});

test('화면 — 바뀐 박자표 숫자는 음 머리와 겹치지 않는다 · 못갖춘마디를 1마디로 세는 곡도 번호 없이 (Codex 208차)', () => {
  P.openSong('mtv403');
  textAt.length = 0; headX.length = 0;
  P.S.t = 6; P.draw(1000);   // 3마디(4/4로 바뀜)가 칠 자리에
  const px = (x) => Number((/([\d.]+)px/.exec(x.font) || [])[1]);
  const georgia = textAt.filter((x) => /^800 [\d.]+px Georgia/.test(x.font));
  const s = Math.max(...georgia.map(px)) / 2.3;   // 왼쪽 앞 박자표가 2.3s · 마디 안 박자표는 1.9s
  const digits = georgia.filter((x) => Math.abs(px(x) - 1.9 * s) < 1e-6);
  assert.equal(digits.length, 4, '두 오선에 숫자 둘씩');
  assert.ok(headX.length > 0, '음 머리를 그림');
  for (const d of digits) for (const hx of headX) assert.ok(Math.abs(hx - d.x) >= 1.2 * s, `숫자 x ${d.x.toFixed(1)} · 머리 x ${hx.toFixed(1)} (s ${s.toFixed(1)})`);
  // 못갖춘마디를 1마디로 세는 곡 — 마디 번호는 2부터 그린다(못갖춘마디 1은 없이)
  P.openSong('pb403');
  textAt.length = 0;
  for (let t = -4; t <= 28; t += 2) { P.S.t = t; P.draw(1000); }
  const nums = new Set(textAt.filter((x) => x.font.startsWith('italic ')).map((x) => x.t));
  assert.ok(nums.has('2') && nums.has('6'), `마디 번호 ${[...nums].join(',')}`);
  assert.ok(!nums.has('1') && !nums.has('0'), '못갖춘마디 번호는 그리지 않는다');
});
