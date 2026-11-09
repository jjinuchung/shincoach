// 🎹 v402 음악(피아노) 과목 — 곡 읽기(piano.js) · 연주 차례(D.S. al Fine) · 붙임줄 · 💰·음표 칸 규칙 · 병합 · 📤 · 곡 받기 · ⏳ 음악 40분(공부 시간과 따로) · 잇기
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  PASS_OK, COIN, TAP_DAY, LISTEN_DAY, NOTES_PER_MON, SPEED, KEEP_DAYS, LOG_MAX, PIANO_DAILY,
  parseNote, solOf, whiteIdx, isBlack, midiOfWhite, readSong, lineBars, playOrder, perform, stepsOf, keyWindow, goodPass, nextHint, pressKind, EARLY,
  dayKeyOf, pianoOf, copyPiano, mergePiano, slotsOf, todayOf, tapRule, listenRule, pianoDayLine, pianoMd,
} from '../js/piano.js';
import { PUBLIC_SONGS, SONGS_PATH, songsOf, allSongs, syncSongs, songName, midiCheckNow, saveMidiCheck } from '../js/pianosongs.js';
import { SUBJECTS, TIMED, MUSIC_MIN, FIELD, KO, baseMinOf, minOf, statusOf } from '../js/timelimit.js';
import { studySec } from '../js/minigame.js';
import { emptyProfile, cloneProfile, mergeStatRecord } from '../js/db.js';
import { initProfile, flushProfile, getProfileSnapshot, pianoTap, pianoListen, pianoNow } from '../js/xp.js';

void fakeIdb;
const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const NOW = new Date(2026, 10, 10, 19, 30).getTime(); // 11월 10일 화요일 저녁
const TODAY = '2026-11-10';
const REQ = { song: 'ode', line: 0, hand: 'R', lv: 2, sp: 0.75 };

/** 작은 곡 — 3마디 · 세뇨 2 · 피네 2 · 붙임줄 · 화음 · 쉼표 */
const MINI = {
  id: 'mini', ko: '작은 곡', bpm: 100, beats: 4, lines: [1, 3], segno: 2, fine: 2, dsAlFine: true,
  right: ['C4:1:1 D4:1:2 E4:2:3~', 'E4:1 R:1 G4+C5:2:2+5', 'C5:4:5'],
  left: ['C3:4:5', 'G2:2:5 G3:2:1', 'C3+G3:4:5+1'],
};

// 가짜 localStorage — 받아 둔 곡·받은 때·연결 확인
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: (k) => { store.delete(k); },
};

test('음 — 이름·계이름·흰건반 차례', () => {
  assert.deepEqual(parseNote('C4'), { li: 0, acc: 0, oct: 4, d: 28, midi: 60 });
  assert.equal(parseNote('G#3').midi, 56);
  assert.equal(parseNote('Ab3').midi, 56);
  assert.equal(parseNote('H4'), null);
  assert.equal(parseNote('C10'), null);
  assert.equal(solOf(parseNote('F#3')), '파♯');
  assert.equal(solOf(parseNote('Bb4')), '시♭');
  assert.equal(whiteIdx(60), 35);
  assert.equal(whiteIdx(61), 35, '검은 건반은 왼쪽 흰건반 차례');
  assert.equal(midiOfWhite(35), 60);
  assert.ok(isBlack(61) && !isBlack(64));
});

test('곡 읽기 — 공개 연습곡은 모두 맞고 · 저작권 끝난 곡만 (이름·지은이·출처)', () => {
  const got = songsOf(PUBLIC_SONGS);
  assert.equal(got.bad, 0);
  assert.deepEqual(got.songs.map((s) => s.id), ['ode', 'mary']);
  for (const s of PUBLIC_SONGS) assert.match(s.from, /저작권 끝남/);
  const ode = got.songs[0];
  assert.equal(ode.n, 8);
  assert.deepEqual(ode.lines, [1, 5]);
  assert.deepEqual(lineBars(ode, 1), [4, 8]);
});

test('곡 읽기 — 깨진 원고는 까닭과 함께 빠진다', () => {
  const bad = (patch) => readSong({ ...MINI, ...patch });
  assert.equal(readSong(MINI).ok, true);
  assert.match(bad({ right: ['C4:1 D4:1', ...MINI.right.slice(1)] }).bad.join(), /오른손 1마디 박 합 2/);
  assert.match(bad({ left: ['X3:4', ...MINI.left.slice(1)] }).bad.join(), /왼손 1마디 음 X3/);
  assert.match(bad({ right: ['C4:1:1 D4:1:2 E4:2:3~', 'F4:1 R:1 G4+C5:2:2+5', 'C5:4:5'] }).bad.join(), /붙임줄이 같은 음으로 안 이어짐/);
  assert.match(bad({ right: ['C4:1:9 D4:1:2 E4:2:3~', ...MINI.right.slice(1)] }).bad.join(), /손가락 9/);
  assert.match(bad({ right: ['C4:1:1+2 D4:1:2 E4:2:3~', ...MINI.right.slice(1)] }).bad.join(), /손가락 수/);
  assert.match(bad({ lines: [1, 1] }).bad.join(), /줄 첫 마디/);
  assert.match(bad({ lines: [2] }).bad.join(), /줄 첫 마디/);
  assert.match(bad({ segno: 0, fine: 0 }).bad.join(), /D\.S\. al Fine에 세뇨·피네가 없음/);
  assert.match(bad({ fine: 1 }).bad.join(), /피네/);
  assert.match(bad({ left: MINI.left.slice(0, 2) }).bad.join(), /마디 수/);
  assert.match(bad({ id: 'a b' }).bad.join(), /id/);
  assert.match(bad({ beats: 5 }).bad.join(), /박자/);
  assert.equal(readSong(null).ok, false);
  assert.equal(readSong({ ...MINI, right: ['R:1~ R:3', ...MINI.right.slice(1)] }).ok, false, '쉼표에 붙임줄');
});

test('연주 차례 — 곡 전체는 D.S. al Fine(세뇨로 돌아가 피네에서 끝) · 줄 하나는 되돌이 없이', () => {
  const s = readSong(MINI).song;
  assert.deepEqual(playOrder(s), [0, 1, 2, 1]);
  assert.deepEqual(playOrder(s, 0), [0, 1]);
  assert.deepEqual(playOrder(s, 1), [2]);
  assert.deepEqual(playOrder({ ...s, ds: false }), [0, 1, 2]);
  const p = perform(s);
  assert.equal(p.end, 16);
  assert.deepEqual(p.bars.map((b) => [b.src, b.at]), [[0, 0], [1, 4], [2, 8], [1, 12]]);
  assert.equal(p.bars[3].first, true, '돌아온 첫 마디');
});

test('붙임줄 — 이어진 음은 한 번만 친다(길이는 더함) · 머리는 그대로 그린다', () => {
  const p = perform(readSong(MINI).song);
  const e = p.notes.filter((x) => x.hand === 'R' && x.midi === 64);
  assert.deepEqual(e.map((x) => [x.t, x.dur]), [[2, 3], [12, 1]], '첫 E4는 마디를 넘어 3박 · 되돌아온 E4는 붙임줄 앞이 없어 1박');
  assert.equal(p.heads.filter((h) => h.hand === 'R' && h.notes.some((n) => n.midi === 64)).length, 3);
  assert.equal(p.heads.filter((h) => h.rest).length, 2, '쉼표도 머리로(그림)');
  const chord = p.notes.filter((x) => x.hand === 'R' && x.t === 6);
  assert.deepEqual(chord.map((x) => [x.midi, x.finger]), [[67, 2], [72, 5]]);
});

test('🎹 기다릴 걸음 — 고른 손만 · 같은 때는 한 걸음 · 양손이면 섞어서', () => {
  const p = perform(readSong(MINI).song);
  const r = stepsOf(p, 'R');
  assert.deepEqual(r.map((x) => x.t), [0, 1, 2, 6, 8, 12, 14]);
  assert.deepEqual(r[3].need, [67, 72]);
  const b = stepsOf(p, 'B');
  assert.deepEqual(b[0].need.sort((x, y) => x - y), [48, 60]);
  assert.ok(stepsOf(p, 'L').every((x) => x.need.every((m) => m < 60)));
});

test('건반 창 — 그 음들 + 양옆 · 적어도 몇 개 · 88건반 밖으로 안 나감', () => {
  const w = keyWindow([60, 64, 67], 1, 12);
  assert.ok(w.hi - w.lo + 1 >= 12);
  assert.ok(w.lo <= whiteIdx(60) - 1 && w.hi >= whiteIdx(67) + 1);
  const edge = keyWindow([21, 108], 3, 12);
  assert.deepEqual([edge.lo, edge.hi], [whiteIdx(21), whiteIdx(108)]);
  // 맨 아래·맨 위 곡도 적어도 minKeys개 — 밖으로 나간 만큼 반대쪽으로 옮긴다 (Codex 204차 P3-8)
  for (const [m, k] of [[21, 12], [108, 12], [23, 15], [105, 9], [60, 52], [60, 80]]) {
    const w = keyWindow([m], 1, k);
    assert.equal(w.hi - w.lo + 1, Math.min(k, 52), `${m} · ${k}개`);
    assert.ok(w.lo >= whiteIdx(21) && w.hi <= whiteIdx(108) && w.lo <= whiteIdx(m) && w.hi >= whiteIdx(m), `${m} 안에`);
  }
  assert.deepEqual(keyWindow([21], 1, 12), { lo: whiteIdx(21), hi: whiteIdx(21) + 11 });
  assert.deepEqual(keyWindow([108], 1, 12), { lo: whiteIdx(108) - 11, hi: whiteIdx(108) });
});

test('🎹 누른 건반 판정 — 가까울 때 다른 건반은 틀림 · 멀면 안 셈 · 이미 누른 음은 안 셈', () => {
  const st = { t: 4, need: [60, 64], got: new Set([64]) };
  assert.equal(pressKind(st, 3.5, false, 60), 'ok');
  assert.equal(pressKind(st, 3.5, false, 62), 'bad', '기다리기 전이라도 가까우면 틀림');
  assert.equal(pressKind(st, 2, false, 62), 'plain', '아직 멀면 안 셈');
  assert.equal(pressKind(st, 2, false, 60), 'plain');
  assert.equal(pressKind(st, 4, true, 64), 'plain', '이미 누른 음');
  assert.equal(pressKind(null, 0, false, 60), 'plain');
  assert.equal(EARLY, 0.6);
});

/** 진짜 화면과 같은 차례로 한 판을 돌려 맞게·틀리게 누른 수를 센다 — press(st, t, waiting) = 그 순간 누를 건반들 */
function simulate(perf, hands, press, dt = 0.05) {
  const steps = stepsOf(perf, hands).map((s) => ({ ...s, got: new Set() }));
  let si = 0; let t = -4; let ok = 0; let bad = 0; let waiting = false; let guard = 0;
  while (si < steps.length && guard++ < 100000) {
    const st = steps[si];
    for (const m of press(st, t, waiting)) {
      const k = pressKind(st, t, waiting, m);
      if (k === 'ok') { st.got.add(m); ok += 1; } else if (k === 'bad') bad += 1;
    }
    if (st.got.size >= st.need.length) { si += 1; waiting = false; continue; }
    if (t + dt >= st.t) { t = st.t; waiting = true; } else t += dt;
  }
  return { ok, bad };
}

test('🎹 마구 누르기로는 💰가 안 된다 · 바르게 치면 된다 (공개 연습곡 · 양손)', () => {
  for (const raw of PUBLIC_SONGS) {
    const perf = perform(readSong(raw).song, -1);
    const win = keyWindow(perf.notes.map((s) => s.midi), 1, 12);
    const all = [];
    for (let wi = win.lo; wi <= win.hi; wi += 1) { const m = midiOfWhite(wi); all.push(m); if (isBlack(m + 1)) all.push(m + 1); }
    const mash = simulate(perf, 'B', () => all);
    assert.equal(goodPass(mash.ok, mash.bad), false, `${raw.id} 마구 누르기 ${mash.ok}/${mash.ok + mash.bad}`);
    const right = simulate(perf, 'B', (st, t, waiting) => (waiting ? st.need : []));
    assert.deepEqual([right.bad, goodPass(right.ok, right.bad)], [0, true], `${raw.id} 바르게`);
    const early = simulate(perf, 'B', (st, t) => (st.t - t <= 0.3 ? st.need : []));
    assert.equal(goodPass(early.ok, early.bad), true, `${raw.id} 조금 일찍 쳐도 맞음`);
  }
});

test('잘 쳤나 — 맞게 누른 비율 70% 이상 · 하나도 안 눌렀으면 아님', () => {
  assert.equal(PASS_OK, 0.7);
  assert.equal(goodPass(7, 3), true);
  assert.equal(goodPass(69, 31), false);
  assert.equal(goodPass(0, 0), false);
  assert.equal(goodPass(10, 0), true);
  assert.equal(nextHint(1), '다음엔 막대 없이 해 볼까요?');
  assert.equal(nextHint(4), '악보만 보고 끝까지 쳤어요!');
});

test('🎹 태블릿 치기 💰 — 한 줄 5 · 곡 전체 15 · 번 💰도 함께 · 하루 다섯 번(v407 · 전엔 세 번) · 못 쳐도 잃는 것 없음', () => {
  assert.deepEqual([COIN.line, COIN.all, TAP_DAY], [5, 15, 5]);
  const p = { coins: 10, coinsEarned: 100 };
  const a = tapRule(p, { ...REQ, ok: 9, bad: 1 }, NOW);
  assert.deepEqual([a.ok, a.coins, a.good], [true, 5, true]);
  assert.deepEqual([p.coins, p.coinsEarned], [15, 105]);
  const b = tapRule(p, { ...REQ, line: -1, ok: 40, bad: 2 }, NOW);
  assert.equal(b.coins, 15);
  const t = tapRule(p, { ...REQ, ok: 1, bad: 9 }, NOW);
  assert.deepEqual([t.ok, t.coins, t.why], [true, 0, 'try']);
  assert.equal(p.coins, 30, '못 쳐도 그대로');
  for (let i = 2; i < TAP_DAY; i += 1) assert.equal(tapRule(p, { ...REQ, ok: 9, bad: 0 }, NOW).coins, 5, `${i + 1}번째`);
  const c = tapRule(p, { ...REQ, ok: 9, bad: 0 }, NOW);
  assert.deepEqual([c.coins, c.why], [0, 'cap'], `${TAP_DAY + 1}번째는 기록만`);
  assert.deepEqual(todayOf(p, NOW), { paid: TAP_DAY, coins: 20 + 5 * (TAP_DAY - 2), notes: 0 });
  assert.equal(pianoOf(p.piano).log.length, TAP_DAY + 2, '판마다 기록');
  // 다음 날은 다시
  assert.equal(tapRule(p, { ...REQ, ok: 5, bad: 0 }, NOW + 86400000).coins, 5);
});

test('🎹 요청 확인 — 곡·줄·손·단계·빠르기가 이상하면 아무것도 안 바뀐다', () => {
  const p = { coins: 0 };
  for (const req of [{ ...REQ, song: 'a b' }, { ...REQ, line: -2 }, { ...REQ, hand: 'X' }, { ...REQ, lv: 5 }, { ...REQ, sp: 2 }, { ...REQ, sp: 0.1 }, null]) {
    assert.equal(tapRule(p, req && { ...req, ok: 9, bad: 0 }, NOW).why, 'bad');
    assert.equal(listenRule(p, req, NOW).why, 'bad');
  }
  assert.equal(tapRule(p, { ...REQ, ok: 'x', bad: 0 }, NOW).why, 'bad');
  assert.equal(p.coins, 0);
  assert.equal(p.piano, undefined);
});

test('시계가 뒤로 — 남은 날이 모두 오늘보다 늦으면 막는다(한도를 다시 열지 못하게)', () => {
  const p = { coins: 0, piano: { days: { '2026-11-20': { paid: 3, coins: 15 } } } };
  assert.equal(tapRule(p, { ...REQ, ok: 9, bad: 0 }, NOW).why, 'clock');
  assert.equal(listenRule(p, REQ, NOW).why, 'clock');
  assert.equal(p.coins, 0);
});

test('🎧 다 쳤어요 — 하루 세 칸 · 모든 칸은 날을 넘겨 쌓임 · 💰 없음 · 다섯 칸마다 묶음', () => {
  assert.deepEqual([LISTEN_DAY, NOTES_PER_MON], [3, 5]);
  const p = { coins: 7 };
  const r = [1, 2, 3, 4].map(() => listenRule(p, REQ, NOW));
  assert.deepEqual(r.map((x) => [x.counted, x.notes]), [[true, 1], [true, 2], [true, 3], [false, 3]]);
  assert.equal(r[3].why, 'cap');
  assert.equal(p.coins, 7, '듣고 따라 치기는 💰 없음');
  const n = [1, 2, 3].map(() => listenRule(p, REQ, NOW + 86400000));
  assert.deepEqual(n.map((x) => x.notes), [4, 5, 6]);
  assert.deepEqual(slotsOf(0), { filled: 0, sets: 0 });
  assert.deepEqual(slotsOf(4), { filled: 4, sets: 0 });
  assert.deepEqual(slotsOf(5), { filled: 5, sets: 1 }, '막 찬 다섯은 다 찬 그림');
  assert.deepEqual(slotsOf(6), { filled: 1, sets: 1 });
});

test('저장값 고쳐 읽기 — 깨진 칸 빼기 · 한도 넘는 칸 깎기 · 늦은 날만 · 기록 줄 수', () => {
  const days = {};
  for (let i = 1; i <= 20; i += 1) days[`2026-10-${String(i).padStart(2, '0')}`] = { paid: 9, coins: 5, notes: 7 };
  days.nope = { paid: 1 };
  days['2026-11-01'] = { paid: 0, coins: 0, notes: 0 };
  const log = Array.from({ length: LOG_MAX + 10 }, (_, i) => ({ at: 1000 + i, m: 't', s: 'ode', n: 0, h: 'R', lv: 1, sp: 0.75, ok: 1, bad: 0, c: 0 }));
  log.push({ at: -1, m: 't' }, { at: 5, m: 'x' }, 'junk');
  const p = pianoOf({ days, notes: 2, log });
  assert.equal(Object.keys(p.days).length, KEEP_DAYS);
  assert.ok(!('nope' in p.days) && !('2026-11-01' in p.days));
  assert.deepEqual(p.days['2026-10-20'], { paid: 9, coins: 5, notes: LISTEN_DAY }, '💰 받은 횟수는 한도로 자르지 않는다 (v407 · Codex 212차 P2) · 음표 칸은 그날 상한으로');
  assert.equal(p.notes, KEEP_DAYS * LISTEN_DAY, '모든 칸은 남은 날 칸 합보다 작지 않다');
  assert.equal(p.log.length, LOG_MAX);
  assert.equal(p.log[0].at, 1010, '오래된 기록부터 빠짐');
  assert.deepEqual(pianoOf('junk'), { days: {}, notes: 0, mons: 0, log: [] }, 'mons = 받은 음악 포켓몬 수 (v404)');
  const c = copyPiano({ days: { [TODAY]: { paid: 1, coins: 5 } }, notes: 3 });
  c.days[TODAY].paid = 9;
  assert.notEqual(copyPiano({ days: { [TODAY]: { paid: 1, coins: 5 } } }).days[TODAY].paid, 9);
});

test('병합 — 날마다 큰 쪽(옛 백업으로 한도를 다시 열지 못함) · 모든 칸 큰 쪽 · 기록 합집합', () => {
  const a = { days: { [TODAY]: { paid: 3, coins: 15, notes: 1 } }, notes: 9, log: [{ at: 10, m: 't', s: 'ode', ok: 1 }] };
  const b = { days: { [TODAY]: { paid: 1, coins: 5, notes: 3 }, '2026-11-09': { paid: 2, coins: 10 } }, notes: 4, log: [{ at: 10, m: 't', s: 'ode', ok: 1 }, { at: 11, m: 'l', s: 'ode' }] };
  const m = mergePiano(a, b);
  assert.deepEqual(m.days[TODAY], { paid: 3, coins: 15, notes: 3 });
  assert.deepEqual(m.days['2026-11-09'], { paid: 2, coins: 10, notes: 0 });
  assert.equal(m.notes, 9);
  assert.deepEqual(m.log.map((r) => r.at), [10, 11]);
  assert.equal(mergePiano(null, undefined), null);
  assert.deepEqual(mergePiano(a, b), mergePiano(b, a));
  // db 병합에도 이어져 있다
  const cur = { ...emptyProfile(), piano: a, updatedAt: 2 };
  const rec = { ...emptyProfile(), piano: b, updatedAt: 1 };
  const out = mergeStatRecord('profile', cur, rec);
  assert.deepEqual(out.piano.days[TODAY], { paid: 3, coins: 15, notes: 3 });
  assert.equal(cloneProfile({ ...emptyProfile(), piano: a }).piano.notes, 9);
});

test('📤 — 하루 한 줄(하루 칸으로) · music.md(모든 칸 · 최근 기록 새것부터 · 연결 확인)', () => {
  assert.deepEqual(PIANO_DAILY, ['pnTapN', 'pnTapOk', 'pnCoins', 'pnListenN', 'pnNotes', 'pnMons', 'pnIntro', 'pnFreeN', 'pnFreeKeys', 'pnFreeSec'], 'pnMons = 온 음악 포켓몬 (v404) · pnIntro = 🐾 안내 창 봄 (v405) · pnFree* = 🎹 자유롭게 치기 (v408)');
  assert.equal(pianoDayLine({}), '');
  assert.equal(pianoDayLine({ pnTapN: 4, pnTapOk: 3, pnCoins: 15, pnListenN: 2, pnNotes: 2 }), '🎹 태블릿 치기 끝까지 4판(잘 친 판 3 · 💰15) · 🎧 듣고 따라 치기 「다 쳤어요」 2번(음표 칸 2)');
  const p = {};
  tapRule(p, { ...REQ, ok: 42, bad: 6 }, NOW);
  listenRule(p, { ...REQ, line: -1, hand: 'B', lv: 1, sp: 1 }, NOW + 60000);
  const md = pianoMd(p.piano, TODAY, (id) => (id === 'ode' ? '환희의 송가' : id), { at: NOW, ok: true, name: 'SP2X', note: '도4' });
  assert.match(md, /음표 칸 모두 1 \(다섯 칸 묶음 0 · 온 음악 포켓몬 0\)/, 'v404 — 온 음악 포켓몬 수도');
  assert.match(md, /🎹 집 피아노 연결 확인 \(2026-11-10\): 잡힘 — SP2X · 마지막에 누른 건반 도4/);
  const rows = md.split('\n').filter((l) => l.startsWith('- 11-10'));
  assert.equal(rows.length, 2);
  assert.match(rows[0], /🎧 따라 치기 · 환희의 송가 곡 전체 · 양손 · 도움 1 · 100% · 음표 한 칸/);
  assert.match(rows[1], /🎹 치기 · 환희의 송가 1째 줄 · 오른손 · 도움 2 · 75% · 맞게 42\/48 \(88%\) · 💰5/);
  assert.equal(pianoMd({}, TODAY), '');
  assert.match(pianoMd({}, TODAY, (s) => s, { at: NOW, ok: false, why: 'NotAllowedError' }), /안 됨 — NotAllowedError/);
});

test('곡 받기 — 받은 곡이 먼저 · 깨진 곡은 빼고 📥에 ⚠️ · 10분에 한 번 · 못 받으면 받아 둔 것 그대로', async () => {
  store.clear();
  assert.equal(SONGS_PATH, 'music/songs.json');
  assert.deepEqual(allSongs().map((s) => s.id), ['ode', 'mary']);
  const notes = [];
  const book = { ...MINI, id: 'ponyo', ko: '책 곡' };
  let calls = 0;
  const deps = (list, t) => ({ now: () => t, readList: async () => { calls += 1; return list; }, noteCheck: async (c) => { notes.push(c); } });
  assert.equal(await syncSongs(false, deps([book, { id: 'broken' }, { ...book, ko: '겹친 원고' }], 1000)), 1);
  assert.deepEqual(notes.pop(), { rows: 3, bad: 2 });
  assert.deepEqual(JSON.parse(store.get('shincoach.pianoSongs')).map((r) => r.ko), ['책 곡'], '저장은 쓴 원고만 — 깨진 것·같은 id로 겹친 것은 두지 않는다');
  assert.deepEqual(allSongs().map((s) => [s.id, !!s.book]), [['ponyo', true], ['ode', false], ['mary', false]]);
  assert.equal(songName('ponyo'), '책 곡');
  assert.equal(songName('zz'), 'zz');
  assert.equal(await syncSongs(false, deps([], 1000 + 60000)), 1, '10분 안엔 묻지 않고 받아 둔 것');
  assert.equal(calls, 1);
  assert.equal(await syncSongs(false, deps([], 1000 + 11 * 60000)), 1, '빈 목록이면 받아 둔 것 그대로');
  assert.equal(await syncSongs(true, deps([{ id: 'x' }], 1000 + 12 * 60000)), 1, '깨진 곡만 오면 받아 둔 것 그대로');
  assert.deepEqual(notes.pop(), { rows: 1, bad: 1 });
  assert.equal(await syncSongs(true, deps(Promise.reject(new Error('net')), 1000 + 13 * 60000)), 1);
  // 공개 곡과 같은 id면 받은 쪽
  await syncSongs(true, deps([{ ...MINI, id: 'ode', ko: '책 환희' }], 1000 + 14 * 60000));
  assert.deepEqual(allSongs().map((s) => [s.id, s.ko]), [['ode', '책 환희'], ['mary', 'Mary Had a Little Lamb (비행기)']]);
  assert.equal(midiCheckNow(), null);
  saveMidiCheck({ ok: true, name: 'SP2X' });
  assert.equal(midiCheckNow().name, 'SP2X');
});

test('⏳ 음악 40분 — 따로 세는 칸 · 공부 시간(🎮 게임기 판)에는 안 들어감 (아버님 11-08)', () => {
  assert.deepEqual(SUBJECTS, ['math', 'english', 'korean'], '🎮 게임 판을 세는 공부 과목에 음악은 없다');
  assert.deepEqual(TIMED, ['math', 'english', 'korean', 'music']);
  assert.deepEqual(MUSIC_MIN, { weekday: 40, weekend: 40 });
  assert.deepEqual(FIELD.music, { used: 'musicTime', bonus: 'musicBonus', ext: 'musicExt' });
  assert.equal(KO.music, '🎹 음악');
  assert.equal(baseMinOf('music'), MUSIC_MIN);
  assert.equal(minOf({ min: 1, minKorean: 2, minMusic: 3 }, 'music'), 3);
  assert.equal(minOf({ min: 1, minKorean: 2, minMusic: 3 }, 'korean'), 2);
  assert.equal(minOf({ min: 1, minKorean: 2, minMusic: 3 }, 'math'), 1);
  const st = statusOf({ musicTime: 30 * 60 }, 'music', '2026-11-14', undefined);
  assert.deepEqual([st.limit, st.left, st.locked, st.warn], [2400, 600, false, true], '주말도 40분 · 10분 남으면 알림');
  assert.equal(statusOf({ musicTime: 2400 }, 'music', TODAY, { weekday: 40, weekend: 40 }).locked, true);
  assert.equal(studySec({ mathTime: 600, musicTime: 3600 }), 600, '음악 시간은 게임 판 셈에 안 들어감');
  assert.match(read('js/minigame.js'), /return SUBJECTS\.reduce\(\(a, s\) => a \+ usedSec\(daily, s\)/);
});

test('🔌 잇기 — 홈 카드 · 화면 · 시계 · ⚙ · 칩 · 저장·병합 · 📤 · sw · 글꼴 · 빠르기는 밀어서', () => {
  const app = read('js/app.js');
  assert.match(app, /if \(name === 'music'\) return 'music';/);
  assert.match(app, /music: document\.getElementById\('view-music'\)/);
  assert.match(app, /if \(name === 'music'\) enterMusic\(\)\.catch\(\(\) => \{\}\);\n  else leaveMusic\(\);/);
  assert.match(app, /initMusic\(\{ showView \}\);/);
  const home = read('js/home.js');
  assert.match(home, /key: 'music',\n    title: 'Music',\n    ko: '음악',[\s\S]{0,160}view: 'music',\n    ready: true,/);
  const html = read('index.html');
  for (const id of ['view-music', 'btn-music-back', 'time-chip-music', 'music-main', 'set-time-music', 'set-midi-check', 'set-midi-out']) assert.ok(html.includes(`id="${id}"`), id);
  assert.match(read('js/timeup.js'), /\{ id: 'time-chip-music', subject: 'music' \}/);
  const pl = read('js/player.js');
  assert.match(pl, /minMusic: \{ weekday: Number\(settings\.timeMusic \?\? MUSIC_MIN\.weekday\)/);
  assert.match(pl, /settings\.timeMusic = clampMin\(\$\('set-time-music'\)\.value, MUSIC_MIN\.weekday\);/);
  const tl = read('js/timelimit.js');
  assert.match(tl, /if \(day !== clock\.today\) for \(const s of TIMED\) clock\.pending\[s\] = 0;/);
  assert.match(tl, /const next = TIMED\.includes\(subject\) \? subject : null;/);
  const db = read('js/db.js');
  assert.match(db, /'musicTime', 'musicBonus', 'musicExt', 'uMusic', \.\.\.PIANO_DAILY,/);
  assert.match(db, /\.\.\.\(cur\.piano \? \{ piano: copyPiano\(cur\.piano\) \} : \{\}\)/);
  assert.match(db, /const pn = mergePiano\(cur\.piano, rec\.piano\);\n    if \(pn\) out\.piano = pn; else delete out\.piano;/);
  const xp = read('js/xp.js');
  assert.match(xp, /\.\.\.\(p\.piano \? \{ piano: copyPiano\(p\.piano\) \} : \{\}\)/);
  assert.match(xp, /export function pianoTap\(req\) \{\n  return houseDo\(\(p\) => pianoTapRule\(p, req, Date\.now\(\)\)\);/);
  assert.match(xp, /export function pianoListen\(req\) \{\n  return houseDo\(\(p\) => pianoListenRule\(p, req, Date\.now\(\), musicPool\(p\), Math\.random\)\);/, 'v404 — 음악 포켓몬 후보도 같은 트랜잭션에서');
  assert.match(read('js/usage.js'), /\{ key: 'music', field: 'uMusic', ko: '🎹 음악' \}/);
  const up = read('js/upload.js');
  assert.match(up, /\['음악', 'musicTime', 'musicBonus', 'musicExt'\]/);
  assert.match(up, /const piano = pianoDayLine\(d\);\n    if \(piano\) parts\.push\(piano\);/);
  assert.match(up, /path: 'usage\/music\.md', text: music/);
  assert.match(up, /getMusic: musicNow/);
  const sw = read('sw.js');
  for (const f of ['./js/piano.js', './js/pianosongs.js', './js/pianoview.js', './fonts/notomusic-sub.woff']) assert.ok(sw.includes(`'${f}'`), f);
  const ver = /const CACHE_VERSION = 'v(\d+)';/.exec(sw);
  assert.ok(ver && Number(ver[1]) >= 402);
  assert.match(read('js/version.js'), new RegExp(`'v${ver[1]}'`));
  const css = read('css/style.css');
  assert.match(css, /@font-face \{ font-family: "NotoMusicSub"; src: url\("\.\.\/fonts\/notomusic-sub\.woff"\)/);
  for (const c of ['.pn-main {', '.pn-song {', '.pn-seg {', '.pn-stage {', '.pn-toast {', '.pn-speed input[type="range"] {']) assert.ok(css.includes(c), c);
  assert.ok(readFileSync(new URL('../fonts/OFL-notomusic.txt', import.meta.url), 'utf8').includes('SIL Open Font License'));
  const pv = read('js/pianoview.js');
  assert.match(pv, /range\.type = 'range';/, '빠르기는 밀어서 (아버님 11-08)');
  assert.doesNotMatch(pv, /\['0\.5', '50%'\]|50%<\/button>/, '빠르기 단추 없음');
  assert.match(pv, /guardStart\('music', \(\) => setRun\(true\)\)/, '새로 시작할 때만 ⏳ 관문');
  assert.match(pv, /noteActivity\(\)/, '🎧 앱이 연주하는 동안은 손댄 것으로');
  // 진우 책 곡은 공개 저장소에 없다
  const songs = read('js/pianosongs.js');
  assert.doesNotMatch(songs, /포뇨|ponyo|나우시카|nausicaa|키키|kiki/i);
});

before(async () => { console.warn = () => {}; await initProfile(); });

test('저장 — 💰·음표 칸이 한 트랜잭션으로 · 저장 실패면 그대로 · 하루 TAP_DAY번', async () => {
  await flushProfile();
  const c0 = getProfileSnapshot().coins;
  fakeIdb.failNext('profile');
  const bad = await pianoTap({ ...REQ, ok: 9, bad: 1 });
  assert.deepEqual([bad.ok, bad.why], [false, 'save']);
  assert.equal(getProfileSnapshot().coins, c0);
  const r = [];
  for (let i = 0; i < TAP_DAY + 1; i += 1) r.push(await pianoTap({ ...REQ, ok: 9, bad: 1 }));
  assert.deepEqual(r.map((x) => x.coins), [...Array(TAP_DAY).fill(5), 0]);
  assert.equal(getProfileSnapshot().coins, c0 + 5 * TAP_DAY);
  assert.equal(fakeIdb.get('profile', 'me').coins, c0 + 5 * TAP_DAY);
  const l = await pianoListen({ ...REQ, hand: 'B' });
  assert.deepEqual([l.ok, l.counted, l.notes], [true, true, 1]);
  assert.equal(pianoNow().notes, 1);
  assert.equal(pianoOf(fakeIdb.get('profile', 'me').piano).days[dayKeyOf()].notes, 1);
  assert.equal(SPEED.def, 0.75);
});
