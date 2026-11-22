// 🎹 v437 8분음표 박자(6/8·9/8·12/8) — 진우 새 책(K-POP DEMON HUNTERS)의 Golden이 12/8 · ♩.=123
//   원고: den 8 · beats는 책의 분자 · bpm·tempo는 책의 ♩. 값 · 음 길이는 늘 4분음표 1
//   읽은 곡: beats·meters·bpm·bpms는 4분음표 박 (12/8 → 6박 · ♩.=123 → ♩=184.5) · 그림은 책처럼 12/8 · 점쉼표·점온음표에 점
//   (곡은 시험용으로 새로 쓴 짧은 곡 — 진우 책 곡은 공개 저장소에 두지 않는다)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readSong, perform, secsOf, timeSig, pulseOf, playOrder, tripletGroups, shownDur } from '../js/piano.js';

/** 12/8 시험 곡 — 1마디 점4분 쉼표 뒤 8분 · 2마디 점온음표 · 3마디부터 6/8 · 4마디부터 ♩.=100 */
const TRY = {
  id: 'try437', ko: '연습 곡 437', den: 8, beats: 12, bpm: 123,
  lines: [1, 3],
  meter: { 3: 6 },
  tempo: { 4: 100 },
  chords: { 1: ['C', 'G'] },
  right: ['R:1.5 A4:0.5 A4:0.5 B4:0.5:2 B4:1.5 A4:0.5 A4:0.5 B4:0.5', 'G4:6', 'E4:1.5 R:1.5', 'D4:3'],
  left: ['A2:1.5 A2:1.5 A2:1.5 A2:1.5', 'G2:6', 'C3:3', 'G2:1.5 R:1.5'],
};
const badOf = (patch) => (readSong({ ...TRY, ...patch }).bad || []).join(' · ');

test('12/8 — 책의 분자·♩. 빠르기를 4분음표 박으로 · 마디 박 합은 6 · 6/8 바꿈은 3 · 그림 박자표는 책 그대로', () => {
  const r = readSong(TRY);
  assert.equal(r.ok, true, JSON.stringify(r.bad));
  const s = r.song;
  assert.equal(s.den, 8);
  assert.equal(s.beats, 6);
  assert.equal(s.bpm, 184.5);
  assert.deepEqual(s.meters, [6, 6, 3, 3]);
  assert.deepEqual(s.meter, { 3: 3 });
  assert.deepEqual(s.bpms, [184.5, 184.5, 184.5, 150]);
  assert.deepEqual(s.lens, [6, 6, 3, 3]);
  assert.deepEqual(timeSig(s, s.beats), [12, 8]);
  assert.deepEqual(timeSig(s, s.meters[2]), [6, 8]);
  // ♩.=123 한 박(점4분)이 60/123초 — 한 마디 넷이면 4 × 60/123
  const perf = perform(s);
  assert.ok(Math.abs(secsOf(s, perf, 0, 6) - (4 * 60) / 123) < 1e-9);
  // 4마디(♩.=100) 점2분 = 두 박 = 1.2초
  const at4 = perf.bars.find((b) => b.src === 3).at;
  assert.ok(Math.abs(secsOf(s, perf, at4, 3) - 1.2) < 1e-9);
  assert.deepEqual(playOrder(s), [0, 1, 2, 3]);
});

test('4분음표 박자 곡은 그대로 — den이 없거나 4 · 그림 박자표는 N/4', () => {
  const four = { id: 'q437', ko: '큐', beats: 3, bpm: 90, right: ['C4:3', 'D4:1 E4:2'], left: ['C3:3', 'G2:3'] };
  for (const raw of [four, { ...four, den: 4 }]) {
    const r = readSong(raw);
    assert.equal(r.ok, true, JSON.stringify(r.bad));
    assert.equal(r.song.beats, 3);
    assert.equal(r.song.bpm, 90);
    assert.equal(r.song.den, 4);
    assert.deepEqual(timeSig(r.song, 3), [3, 4]);
  }
  assert.deepEqual(timeSig({}, 4), [4, 4]);
  assert.deepEqual(timeSig(null, 2), [2, 4]);
});

test('깨진 8분음표 박자는 받지 않는다 — 분자·밑·박자 바꿈·박 합', () => {
  assert.match(badOf({ beats: 4 }), /박자/);           // 12/8 책에 4/8은 없음
  assert.match(badOf({ den: 3 }), /^박자$/);           // 한 번만
  assert.match(badOf({ den: '8x' }), /박자/);
  // 분자는 4분음표 박자로 맞아도 밑이 4·8이 아니면 받지 않는다
  for (const den of [3, 16]) assert.deepEqual(readSong({ id: 'q', ko: '큐', den, beats: 4, bpm: 90, right: ['C4:4'], left: ['C3:4'] }).bad, ['박자']);
  assert.match(badOf({ meter: { 3: 3 } }), /박자 바꿈/); // den 8이면 바꿈도 8분음표 분자(6·9·12)
  assert.match(badOf({ right: ['A4:4', ...TRY.right.slice(1)] }), /오른손 1마디 박 합 4/);
  assert.match(badOf({ bpm: 250 }), /빠르기/);           // 책 값으로 30~240
  assert.equal(readSong({ ...TRY, bpm: 200 }).song.bpm, 300); // 책 ♩.=200은 ♩=300 — 안에서는 넘어도 됨
  // 9/8 — 4.5박
  const nine = readSong({ ...TRY, beats: 9, meter: undefined, tempo: undefined, right: ['C5:4.5', 'C5:4.5', 'C5:4.5', 'C5:4.5'], left: ['C3:4.5', 'C3:4.5', 'C3:4.5', 'C3:4.5'] });
  assert.equal(nine.ok, true, JSON.stringify(nine.bad));
  assert.equal(nine.song.beats, 4.5);
  assert.deepEqual(timeSig(nine.song, 4.5), [9, 8]);
});

test('그림 — 박자표 두 곳(첫머리 · 바뀌는 마디)이 timeSig를 쓴다 · 점쉼표·점온음표에 점', () => {
  const src = readFileSync(new URL('../js/pianoview.js', import.meta.url), 'utf8');
  assert.match(src, /const \[tsTop, tsBot\] = timeSig\(S\.song, nowBeats\);/);
  assert.match(src, /const \[mtTop, mtBot\] = timeSig\(S\.song, mt\);/);
  assert.doesNotMatch(src, /fillText\('4', /);
  assert.match(src, /const DOTTED = \[0\.75, 1\.5, 3, 6\];/);
  assert.match(src, /if \(DOTTED\.some\(\(v\) => v < 4 && Math\.abs\(h\.dur - v\) < 1e-6\)\)/); // 쉼표: 마디 내내 쉼은 온쉼표만
  assert.match(src, /if \(DOTTED\.some\(\(v\) => Math\.abs\(h\.dur - v\) < 1e-6\)\) \{/);      // 음표
});

test('셋잇단 — 한 박(두 박)을 셋으로 적은 머리는 묶음 하나 · 쉼표도 · 0.333/0.334도 · 끊긴 것·8분·16분은 아님 · 손마다', () => {
  const raw = {
    id: 'tri437', ko: '셋잇단', beats: 4, bpm: 80,
    right: [
      'C4:0.333333 D4:0.333333 E4:0.333334 F4:1 G4:0.5 A4:0.5 R:0.333 B4:0.333 C5:0.334',
      'C5:0.666667 D5:0.666667 E5:0.666666 F5:0.25 F5:0.25 F5:0.25 F5:0.25 G5:1',
      'G4:0.333333 A4:0.333333 B4:0.833334 C5:0.5 D5:0.333333 E5:0.333333 F5:0.333334 G5:1',
      'C5:0.166667 D5:0.166667 E5:0.166666 F5:0.5 G5:3',
    ],
    left: ['C3:4', 'C3:2 G2:2', 'C3:0.333333 D3:0.333333 E3:0.333334 C3:3', 'C3:4'],
  };
  const r = readSong(raw);
  assert.equal(r.ok, true, JSON.stringify(r.bad));
  const groups = tripletGroups(perform(r.song).heads);
  const show = groups.map((g) => `${g[0].hand}@${Math.round(g[0].t * 3) / 3}:${g.map((h) => (h.rest ? 'R' : h.notes[0].midi)).join(',')}`);
  // C4=60 D4=62 E4=64 B4=71 C5=72 D5=74 E5=76 F5=77 · C3=48 D3=50 E3=52
  assert.deepEqual(show, ['R@0:60,62,64', 'R@3:R,71,72', 'R@4:72,74,76', 'R@10:74,76,77', 'R@12:72,74,76', 'L@8:48,50,52']);
  // 그릴 모양 — 셋이 둘 자리라 1.5배(근삿값도 딱 맞게) · 셋잇단 아닌 길이는 그대로
  for (const [dur, look] of [[0.333333, 0.5], [0.334, 0.5], [0.666667, 1], [1.333334, 2], [0.166667, 0.25], [0.167, 0.25], [0.5, 0.5], [0.25, 0.25], [0.75, 0.75], [1.5, 1.5], [1, 1], [2, 2], [0.833334, 0.833334]]) {
    assert.equal(shownDur(dur), look, String(dur));
  }
  // 옛 곡(8분·16분·점음표)에는 묶음이 없다
  const ode = readSong({ id: 'q', ko: '큐', beats: 4, bpm: 90, right: ['C4:0.75 D4:0.25 E4:1 F4:1.5 G4:0.5', 'A4:0.25 A4:0.25 A4:0.5 B4:3'], left: ['C3:4', 'C3:4'] });
  assert.deepEqual(tripletGroups(perform(ode.song).heads), []);
  // 그림 — 연주판마다 한 번 묶고 묶음마다 3
  const src = readFileSync(new URL('../js/pianoview.js', import.meta.url), 'utf8');
  assert.match(src, /if \(!S\.perf\.tri\) S\.perf\.tri = tripletGroups\(S\.perf\.heads\);/);
  assert.match(src, /for \(const grp of S\.perf\.tri\) tripletMark\(g, grp, xOf\);/);
  assert.match(src, /ctx\.fillText\('3', \(xa \+ xb\) \/ 2, R \? edge - 0\.8 \* s : edge \+ 0\.8 \* s\);/);
  // 음표·쉼표 모양은 그릴 길이로 (2/3박 셋잇단 = 4분음표) · 3은 손가락 번호 너머
  assert.match(src, /const look = shownDur\(h\.dur\);/);
  assert.match(src, /const ch = look >= 4 \? '\\u\{1D13B\}' : look >= 2 \? '\\u\{1D13C\}' : look >= 1 \? '\\u\{1D13D\}' : '\\u\{1D13E\}';/);
  assert.match(src, /const open = look >= 2;/);
  assert.match(src, /if \(look < 4 - 1e-6\) \{/);
  assert.match(src, /const flags = look <= 0\.25 \+ 1e-6 \? 2 : look <= 0\.75 \+ 1e-6 \? 1 : 0;/);
  assert.match(src, /const fn = h\.notes\.filter\(\(n\) => n\.finger\)\.length;\n {4}if \(fn\) \{\n {6}edge = R \? Math\.min\(edge, Math\.min\(g\.tTop - 1\.6 \* s, Math\.min\(\.\.\.ys\) - 1\.6 \* s\) - \(fn - 1\) \* 1\.25 \* s - 0\.7 \* s\)/);
});

test('준비 박 — 곡의 박대로 넷(12/8은 ♩. 넷 = 4분음표 6박) · 딸깍·숫자·멈춤 판이 같은 박을 쓴다', () => {
  assert.equal(pulseOf(readSong(TRY).song), 1.5);
  assert.equal(pulseOf(readSong({ id: 'q', ko: '큐', beats: 4, bpm: 90, right: ['C4:4'], left: ['C3:4'] }).song), 1);
  assert.equal(pulseOf(null), 1);
  const src = readFileSync(new URL('../js/pianoview.js', import.meta.url), 'utf8');
  assert.match(src, /S\.t = -LEAD \* pulseOf\(S\.song\);/);
  assert.match(src, /const pl = pulseOf\(S\.song\);/); // 딸깍도 ♩. 마다
  assert.match(src, /for \(let k = Math\.ceil\(t0 \/ pl\); k <= -1; k \+= 1\) if \(k \* pl >= t0 && k \* pl < t1\) click\(k === -LEAD\);/);
  assert.match(src, /const n = Math\.ceil\(-S\.t \/ pulseOf\(S\.song\)\);/);
  assert.match(src, /if \(S\.t > -LEAD \* pulseOf\(S\.song\) \+ 1e-6 \|\| S\.si > 0\) drawPaused\(\);/);
  assert.doesNotMatch(src, /S\.t = -LEAD;/);
});
