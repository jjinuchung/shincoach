// 📝 영어 문법 v348 (2026-10-27 — 기본안 "이대로" · 원고 G1~G8·G9~G16 "이대로" · 아버님 "문법은 코인 같은 보상만 · 포켓몬은 거의 1%로 모르게")
// → v349 (같은 날 아버님 "과목을 새롭게 만들자는 게 아니었다 — 기존 영어 과목 중간중간에") 🎬 영상 따라 하기 사이 📝 문법 쪽지
//  단원 = 📘 개념 한 장 + 문제 12(고르기 8 · 쳐 넣기 2 · 순서 2) → 쪽지 한 장 3(고르기 2 + 쳐 넣기·순서 하나, 안 본 것 먼저 — 네 장이면 다 본다) ·
//  그날 8문장 → 첫 쪽지 · 15문장마다 · 하루 3장 · 🔍 진단·첫 판 💰10은 걷음 · 단원 처음 ⭐ 💰10 · 🎁 깜짝 포켓몬 1%·하루 한 번 · 📤 grammar/날짜.md
//  (⚡💰 계단·영상 흐름은 tests/player.logic.test.js 「📝」)
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  STAR_COINS, GIFT_CHANCE, SOLVED, UNIT_QS, NOTE_SHAPE, NOTE, APOS_WHY, checkGrammar, allUnits, normType, joinTiles, judgeType, judgeOrder,
  planUnit, unitMark, dealNote, noteDue, seenAfter, shuffleTiles, grammarRule, grammarFinishText, grammarReport, grammarMd,
  knownOf, mergeKnown, seenOf, mergeSeen, gMissOf, mergeGMiss, mergeDiag, giftOf, mergeGift, ROUND_MISS_MAX, typeName, giftPoolOf, rngFrom,
} from '../js/grammar.js';
import { dayNum } from '../js/korean.js';
import { emptyProfile, cloneProfile, mergeStatRecord } from '../js/db.js';
import { initProfile, flushProfile, reloadProfile, grammarFinish, grammarMap, grammarSeenMap } from '../js/xp.js';
import { ROSTER, subjectOf, LEGENDARY, isUnlocked } from '../js/pokemon.js';
import { placeOfView } from '../js/usage.js';
import { SUBJECTS } from '../js/home.js';
import { gatherFiles } from '../js/upload.js';

void fakeIdb;
const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const RAW = JSON.parse(read('coach/english/grammar.json'));
const UNITS = allUnits(RAW);
const IDS = UNITS.map((u) => u.id);
const DIAG = RAW.diag; // v348 진단 원고 — 화면에선 안 쓰지만 json·검사에 남아 있다
const NOW = new Date(2026, 9, 27, 15).getTime();
const D0 = dayNum(NOW);
const DAY = 86400000;
const seq = (seed) => { let x = seed >>> 0 || 1; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; };
const clone = (x) => JSON.parse(JSON.stringify(x));
const NO_GIFT = { rng: () => 0.5 };

test('📝 원고: 16단원(복습 8 · 5~6학년 8) · 192문제 · 진단 8(복습 단원 하나씩) · 검사 통과 · 쓰인 오개념은 모두 이름표가 있다', () => {
  assert.deepEqual(checkGrammar(RAW), []);
  assert.equal(UNITS.length, 16);
  assert.deepEqual(IDS, Array.from({ length: 16 }, (_, i) => `G${i + 1}`));
  assert.deepEqual(UNITS.map((u) => u.band), [...Array(8).fill('review'), ...Array(8).fill('new')]);
  assert.equal(UNITS.reduce((n, u) => n + u.qs.length, 0), 192);
  assert.deepEqual(DIAG.map((q) => q.unit), IDS.slice(0, 8));
  const used = new Set();
  for (const u of UNITS) for (const q of u.qs) {
    for (const o of q.opts || []) if (o.type) used.add(o.type);
    for (const v of Object.values(q.traps || {})) used.add(v[0]);
  }
  for (const q of DIAG) for (const o of q.opts) if (o.type) used.add(o.type);
  for (const k of used) assert.ok(RAW.types[k] && RAW.types[k].name, `오개념 ${k}`);
  assert.equal(typeName(RAW.types, 'apos'), RAW.types.apos.name);
  // 진단 문제는 그 단원 문제와 같지 않다
  for (const q of DIAG) {
    const u = UNITS.find((x) => x.id === q.unit);
    assert.ok(!u.qs.some((x) => (x.en && x.en === q.en) || x.ko === q.ko), q.unit);
  }
});

test('📝 checkGrammar: 깨진 원고를 하나씩 잡는다 · allUnits는 깨진 단원을 조용히 뺀다', () => {
  const cases = [
    ['정답 둘', (j) => { j.units[0].qs[0].opts.forEach((o) => { o.ok = true; delete o.type; delete o.why; }); }, /정답은 하나/],
    ['why 없음', (j) => { const o = j.units[1].qs[0].opts.find((x) => !x.ok); delete o.why; }, /why가 비었/],
    ['모르는 오개념', (j) => { j.units[2].qs[0].opts.find((x) => !x.ok).type = 'nope'; }, /오개념 「nope」/],
    ['카드 ≠ 답', (j) => { const q = j.units[3].qs.find((x) => x.kind === 'order'); q.ans += 'x'; }, /카드를 이으면/],
    ['첫 낱말 소문자', (j) => { const q = j.units[3].qs.find((x) => x.kind === 'order'); q.tiles[0] = q.tiles[0].toLowerCase(); q.ans = joinTiles(q.tiles); }, /첫 낱말은 대문자/],
    ['함정이 정답', (j) => { const q = j.units[4].qs.find((x) => x.kind === 'type'); q.traps[normType(q.ans[0])] = ['bepick', 'x']; }, /맞는 답에도/],
    ['둥근 따옴표', (j) => { const q = j.units[5].qs.find((x) => x.kind === 'pick' && x.opts.every((o) => !o.t.includes('\''))); q.opts[0].t = `${q.opts[0].t}’`; }, /둥근 따옴표/],
    ['빈칸 둘', (j) => { const q = j.units[6].qs.find((x) => x.kind === 'pick' && x.en); q.en = `${q.en} ___`; }, /빈칸\(___\)은 하나/],
    ['문제 수', (j) => { j.units[7].qs.pop(); }, /문제는 12개/],
    ['꼴 수', (j) => { const q = j.units[8].qs.find((x) => x.kind === 'type'); q.kind = 'pick'; q.opts = [{ t: 'a', ok: true }, { t: 'b', type: 'bepick', why: 'x' }, { t: 'c', type: 'bepick', why: 'x' }]; }, /고르기 8/],
    ['진단이 새 단원', (j) => { j.diag[0].unit = 'G9'; }, /복습 단원/],
    ['개념 두 줄', (j) => { j.units[9].say.pop(); }, /세 줄/],
    ['번호 겹침', (j) => { j.units[10].id = 'G10'; }, /겹침/],
  ];
  for (const [name, mut, re] of cases) {
    const j = clone(RAW);
    mut(j);
    const bad = checkGrammar(j);
    assert.ok(bad.some((m) => re.test(m)), `${name}: ${bad.slice(0, 3)}`);
  }
  const j = clone(RAW);
  j.units[3].qs.pop();
  assert.deepEqual(allUnits(j).map((u) => u.id), IDS.filter((id) => id !== 'G4'), '깨진 단원만 빠짐');
  assert.deepEqual(checkGrammar({}), ['units가 없음']);
});

test('📝 쳐 넣기 채점: 모든 쳐 넣기 문제 — 맞는 답은 둥근 따옴표·대문자·앞뒤 빈칸·끝 마침표여도 통과 · 함정은 그 풀이 · 따옴표만 빠지면 「거의 맞아요」 · 그 밖은 맞는 답 풀이', () => {
  let apos = 0;
  for (const u of UNITS) for (const q of u.qs.filter((x) => x.kind === 'type')) {
    for (const a of q.ans) {
      for (const v of [a, `  ${a.toUpperCase()}  `, a.replace(/'/g, '’'), a.replace(/'/g, '´'), a.replace(/'/g, '`'), `${a}.`, a.replace(/ /g, '   ')]) {
        assert.equal(judgeType(q, v).kind, 'ok', `${u.id} ${q.en} ${v}`);
      }
      if (a.includes('\'') && !Object.keys(q.traps || {}).includes(a.replace(/'/g, '').toLowerCase())) {
        const j = judgeType(q, a.replace(/'/g, ''));
        assert.deepEqual([j.kind, j.type, j.why], ['apos', 'apos', APOS_WHY], `${u.id} ${a}`);
        apos++;
      }
    }
    for (const [w, [t, why]] of Object.entries(q.traps || {})) {
      const j = judgeType(q, w.toUpperCase());
      assert.deepEqual([j.ok, j.kind, j.type, j.why], [false, 'trap', t, why], `${u.id} ${w}`);
    }
    const o = judgeType(q, 'zzqq');
    assert.equal(o.kind, 'other');
    assert.ok(o.why.startsWith('다시 해 볼까요?') && o.why.includes(q.why));
    assert.equal(judgeType(q, '   ').kind, 'empty');
  }
  assert.ok(apos >= 3, `따옴표만 빠진 답을 본 쳐 넣기 ${apos}`);
  assert.equal(normType(' It’s  Sunny. '), 'it\'s sunny');
});

test('📝 순서 맞추기: 모든 순서 문제 — 원고 차례는 통과 · 섞은 차례는 원고 차례가 아니다(씨앗 200) · 어긋난 자리', () => {
  for (const u of UNITS) for (const q of u.qs.filter((x) => x.kind === 'order')) {
    assert.deepEqual(judgeOrder(q, q.tiles), { ok: true, at: -1 });
    const rev = q.tiles.slice().reverse();
    const j = judgeOrder(q, rev);
    assert.equal(j.ok, false);
    assert.equal(j.at, 0);
    assert.equal(judgeOrder(q, q.tiles.slice(0, -1)).ok, false, '덜 놓으면');
    // 섞기가 제자리(맞는 차례)로 나오는 난수여도 맞는 차례를 내지 않는다 — j = i를 고르는 값(0.99999)
    for (const r of [() => 0.99999, () => 0.9999999]) assert.notEqual(joinTiles(shuffleTiles(q.tiles, r).map((i) => q.tiles[i])), q.ans, `${u.id} ${q.ans} 제자리 난수`);
    for (let s = 1; s <= 200; s++) {
      const idx = shuffleTiles(q.tiles, seq(s));
      assert.deepEqual(idx.slice().sort((a, b) => a - b), q.tiles.map((_, i) => i));
      assert.notEqual(joinTiles(idx.map((i) => q.tiles[i])), q.ans, `${u.id} ${q.ans} 씨앗 ${s}`);
    }
  }
});

test('📝 dealNote: 모든 단원·씨앗 300 — 고르기 2 + 쳐 넣기·순서 하나 · 네 장이면 12문제를 다 본다(꼬리는 덜 본 쪽 — 쳐 넣기 둘·순서 둘) · 보기·카드는 빠짐없이 섞임', () => {
  assert.deepEqual(NOTE_SHAPE, { pick: 2, tail: 1 });
  for (const u of UNITS) for (let s = 1; s <= 300; s++) {
    const rng = seq(s * 7 + u.id.length);
    let m = 0;
    const seen = [];
    const tails = [];
    for (let k = 0; k < 4; k++) {
      const a = dealNote(u, m, rng);
      assert.equal(a.length, 3);
      assert.deepEqual(a.slice(0, 2).map((d) => d.kind), ['pick', 'pick']);
      assert.ok(['type', 'order'].includes(a[2].kind));
      tails.push(a[2].kind);
      for (const d of a) {
        assert.equal(u.qs[d.i].kind, d.kind);
        if (d.kind === 'pick') assert.deepEqual(d.opts.slice().sort(), u.qs[d.i].opts.map((_, k2) => k2));
        if (d.kind === 'order') {
          assert.deepEqual(d.tiles.slice().sort((x, y) => x - y), u.qs[d.i].tiles.map((_, k2) => k2));
          assert.notEqual(joinTiles(d.tiles.map((k2) => u.qs[d.i].tiles[k2])), u.qs[d.i].ans, `${u.id} 카드가 맞는 차례 그대로 나왔다`);
        }
      }
      assert.ok(!a.some((d) => seen.includes(d.i)), `${u.id} 씨앗 ${s}: 안 본 것 먼저`);
      seen.push(...a.map((d) => d.i));
      m = seenAfter(m, a.map((d) => d.i));
    }
    assert.equal(new Set(seen).size, UNIT_QS, `${u.id} 네 장이면 다 본다`);
    assert.equal(m, 0, '다 보면 0 — 다음 쪽지는 처음부터');
    assert.deepEqual(tails.slice().sort(), ['order', 'order', 'type', 'type'], `${u.id} 꼬리는 번갈아`);
  }
  assert.equal(seenAfter(0, [0, 99, -1, 1.5, 'x']), 1, '모르는 번호는 안 받음');
  // 보기는 정말 섞인다 — 원고 차례가 아닌 때가 있다 (카드는 위 네 장 반복에서 맞는 차례로 안 나오는지 본다)
  // ★ 이 시험 난수(seq)는 작은 씨앗이면 첫 값이 늘 0.5 아래라, 새 단원 첫 쪽지의 꼬리는 늘 쳐 넣기다 — 순서 카드는 네 장 반복에서만 나온다
  let opMoved = 0;
  for (const u of UNITS) for (let s = 1; s <= 40; s++) {
    for (const d of dealNote(u, 0, seq(s * 13 + 1))) if (d.kind === 'pick' && d.opts.some((k, j) => k !== j)) opMoved++;
  }
  assert.ok(opMoved > 600, `보기를 섞은 고르기 ${opMoved}`);
  // 쳐 넣기를 다 봤으면 순서로 · 순서를 다 봤으면 쳐 넣기로 (덜 본 쪽)
  const u = UNITS[0];
  const bitsOf = (kind) => u.qs.reduce((b, q, i) => (q.kind === kind ? b | (1 << i) : b), 0);
  for (let s = 1; s <= 50; s++) {
    assert.equal(dealNote(u, bitsOf('type'), seq(s))[2].kind, 'order');
    assert.equal(dealNote(u, bitsOf('order'), seq(s))[2].kind, 'type');
  }
});

test('📝 noteDue: 그날 끝낸 문장 8 → 첫 쪽지 · 그 뒤 15문장마다(23·38) · 하루 3장 · 이상한 수는 0으로', () => {
  assert.deepEqual(NOTE, { first: 8, every: 15, max: 3 });
  const due = (d, n) => noteDue(d, n);
  assert.deepEqual([due(7, 0), due(8, 0), due(22, 1), due(23, 1), due(37, 2), due(38, 2), due(1000, 3)], [false, true, false, true, false, true, false]);
  assert.deepEqual([due(8, -1), due('x', 0), due(8, 'x'), due(Infinity, 0)], [true, false, true, false]);
});

test('📝 planUnit: 다시 볼 단원(틀린 다음 날부터) → 차례로 아직 안 한 단원(진단 ✅ 건너뜀) · 연습은 ⭐·✅ 중 오래 안 본 것 · unitMark', () => {
  assert.equal(planUnit(UNITS, {}, {}, NOW), 'G1');
  const kn = { G1: D0, G2: D0, G4: D0 };
  assert.equal(planUnit(UNITS, {}, kn, NOW), 'G3');
  const st = { G3: { box: 0, due: D0 + 1, at: NOW, miss: 1, d0: D0 } };
  assert.equal(planUnit(UNITS, st, kn, NOW), 'G5', '오늘 틀린 단원은 내일');
  assert.equal(planUnit(UNITS, st, kn, NOW + DAY), 'G3', '다음 날엔 다시 볼 단원 먼저');
  const all = Object.fromEntries(IDS.map((id, i) => [id, { box: SOLVED, due: 0, at: 1000 + i, miss: 0, d0: D0 }]));
  assert.equal(planUnit(UNITS, all, {}, NOW), null);
  assert.equal(planUnit(UNITS, all, {}, NOW, true), 'G1', '연습은 오래 안 본 것부터');
  assert.equal(planUnit(UNITS, {}, kn, NOW, true), 'G1', '진단 ✅도 연습할 수 있다');
  assert.equal(planUnit(UNITS, {}, {}, NOW, true), null);
  assert.deepEqual(['G1', 'G3', 'G9', 'G4'].map((id) => unitMark(id, { ...st, G9: all.G9 }, kn)), ['known', 'again', 'star', 'known']);
  assert.equal(unitMark('G10', {}, {}), 'new');
});

test('📝 grammarRule: 처음 ⭐ 💰10(단원마다 한 번) · 그날 첫 판 💰는 없앰(v349 — ⚡💰 계단은 player.js) · 푼 날 표시 · 틀린 쪽지는 내일 다시 · ⭐·낡은 쪽지는 연습 · 🎯 잡기 기회는 없다', () => {
  const p = { coins: 5, coinsEarned: 5 };
  const r1 = grammarRule(p, { id: 'G1', ok: true, from: 0, qs: [0, 1, 2, 3, 8, 10] }, NOW, IDS, NO_GIFT);
  assert.deepEqual([r1.ok, r1.first, r1.coins, r1.starCoins, r1.solved, r1.practice, r1.gift], [true, undefined, STAR_COINS, STAR_COINS, true, false, 0]);
  assert.deepEqual([p.coins, p.coinsEarned], [5 + 10, 5 + 10]);
  assert.deepEqual(p.grammarDay, { [D0]: 1 }, '푼 날');
  assert.equal(p.grammar.G1.box, SOLVED);
  assert.equal(p.grammarSeen.G1, 0b10100001111);
  assert.equal(p.grammarThrow, undefined, '잡기 기회 칸을 만들지 않는다');
  const r2 = grammarRule(p, { id: 'G1', ok: true, from: p.grammar.G1.at, qs: [4, 5] }, NOW + 1000, IDS, NO_GIFT);
  assert.deepEqual([r2.coins, r2.practice, r2.solved], [0, true, false], '⭐ 단원은 연습');
  const r3 = grammarRule(p, { id: 'G2', ok: false, from: 0 }, NOW + 2000, IDS, NO_GIFT);
  assert.deepEqual([r3.coins, r3.solved], [0, false]);
  assert.deepEqual([p.grammar.G2.box, p.grammar.G2.due, p.grammar.G2.miss], [0, D0 + 1, 1]);
  const r4 = grammarRule(p, { id: 'G2', ok: true, from: p.grammar.G2.at }, NOW + 3000, IDS, NO_GIFT);
  assert.deepEqual([r4.solved, r4.starCoins, r4.coins], [true, 0, 0], '같은 날 틀린 뒤 바로 다시 푼 ⭐는 💰 없음');
  const r5 = grammarRule(p, { id: 'G3', ok: true, from: 12345 }, NOW + 4000, IDS, NO_GIFT);
  assert.deepEqual([r5.practice, r5.coins, p.grammar.G3], [true, 0, undefined], '낡은 판(다른 창이 옮김)은 연습');
  const r6 = grammarRule(p, { id: 'G4', ok: true, from: 0 }, NOW + DAY, IDS, NO_GIFT);
  assert.deepEqual([r6.coins, p.grammarDay[D0 + 1]], [STAR_COINS, 1], '다음 날 새 단원 ⭐ — 첫 판 💰는 없다');
  assert.deepEqual(grammarRule(p, { id: 'G99', ok: true }, NOW, IDS, NO_GIFT), { ok: false, why: 'empty' });
  assert.equal(p.coins, 5 + 10 + 10);
});

test('📝 오개념 수: 쪽지마다 열쇠당 ROUND_MISS_MAX까지 더한다(늘어나기만) · 이상한 열쇠는 안 받음', () => {
  const p = {};
  grammarRule(p, { id: 'G1', ok: false, from: 0, miss: { bepick: 3, sextra: 99, 'Bad Key': 2, x: 1, apos: -2 } }, NOW, IDS, NO_GIFT);
  assert.deepEqual(p.grammarMiss, { bepick: 3, sextra: ROUND_MISS_MAX });
  grammarRule(p, { id: 'G1', ok: false, from: p.grammar.G1.at, miss: { bepick: 1 } }, NOW + DAY, IDS, NO_GIFT);
  assert.equal(p.grammarMiss.bepick, 4);
});

test('🎁 깜짝 포켓몬: 1%보다 작으면 못 잡은 후보 하나를 도감에 · 하루 한 번까지 · 다 잡았거나 후보가 없으면 안 줌 · 1% 이상이면 없음 · 다음 날 다시', () => {
  assert.equal(GIFT_CHANCE, 0.01);
  const p = { caught: { 10: 1, 11: 2 } };
  const r = grammarRule(p, { id: 'G1', ok: false, from: 0 }, NOW, IDS, { pool: [10, 11, 12, 13, 'x', -1, 12], rng: () => 0.0099 });
  assert.ok([12, 13].includes(r.gift), `못 잡은 것만 ${r.gift}`);
  assert.equal(p.caught[r.gift], 1);
  assert.deepEqual(giftOf(p.grammarGift), { n: 1, day: D0, id: r.gift });
  const again = grammarRule(p, { id: 'G2', ok: false, from: 0 }, NOW + 1000, IDS, { pool: [12, 13], rng: () => 0 });
  assert.equal(again.gift, 0, '하루 한 번까지');
  const r2 = grammarRule(p, { id: 'G3', ok: false, from: 0 }, NOW + DAY, IDS, { pool: [12, 13], rng: () => 0.01 });
  assert.equal(r2.gift, 0, '1% 이상이면 없음');
  const r3 = grammarRule(p, { id: 'G4', ok: false, from: 0 }, NOW + DAY, IDS, { pool: [10, 11], rng: () => 0 });
  assert.deepEqual([r3.gift, p.grammarGift.day], [0, D0], '다 잡았으면 안 주고 날도 안 씀');
  const r4 = grammarRule(p, { id: 'G5', ok: false, from: 0 }, NOW + DAY, IDS, { pool: [12, 13], rng: () => 0 });
  assert.ok(r4.gift > 0 && r4.gift !== r.gift, '다음 날 다시 · 남은 못 잡은 것');
  assert.equal(giftOf(p.grammarGift).n, 2);
  assert.equal(grammarRule({}, { id: 'G1', ok: true, from: 0 }, NOW, IDS, { rng: () => 0 }).gift, 0, '후보가 없으면 안 줌');
  // 🔍 Codex 152차 #3: 깨진 음수 기록이어도 🎁는 도감에 하나
  for (const bad of [-1, -2, 'x', null]) {
    const q = { caught: { 132: bad } };
    const g = grammarRule(q, { id: 'G1', ok: false, from: 0 }, NOW, IDS, { pool: [132], rng: () => 0 });
    assert.deepEqual([g.gift, q.caught[132]], [132, 1], `caught ${bad}`);
  }
  // 1만 판(씨앗) — 대략 1%
  let n = 0;
  const rng = seq(42);
  for (let i = 0; i < 10000; i++) if (grammarRule({}, { id: 'G1', ok: false, from: 0 }, NOW, IDS, { pool: [1], rng }).gift) n++;
  assert.ok(n > 60 && n < 140, `1만 판에 ${n}번`);
});

test('🎁 후보(giftPoolOf): 영어 명단만 · 전설·환상 없음 · 지금 레벨에 열린 것만(레벨이 오르면 늘어남) · 쪽지 창이 이것을 쓴다', () => {
  const lv1 = giftPoolOf(ROSTER, subjectOf, LEGENDARY, (id) => isUnlocked(id, 1));
  const lv99 = giftPoolOf(ROSTER, subjectOf, LEGENDARY, (id) => isUnlocked(id, 99));
  assert.ok(lv1.length >= 20, `레벨 1 후보 ${lv1.length}`);
  assert.ok(lv99.length > lv1.length);
  for (const id of lv99) {
    assert.equal(subjectOf(id), 'english', `${id}`);
    assert.ok(!LEGENDARY.includes(id), `전설 ${id}`);
  }
  assert.ok(lv1.every((id) => isUnlocked(id, 1)));
  assert.ok(ROSTER.some((m) => LEGENDARY.includes(m.id) && subjectOf(m.id) === 'english'), '영어 명단에 전설이 있어야 이 시험이 뜻이 있다');
  assert.deepEqual(giftPoolOf(null, subjectOf, null, () => true), []);
  assert.ok(read('js/grammarnote.js').includes('giftPoolOf(ROSTER, subjectOf, LEGENDARY, (id) => isUnlocked(id, level))'));
});

test('📝 프로필: 빈 프로필·복사·병합 — ⭐는 남고 · 보상 날 큰 쪽 · ✅ 합집합(이른 날) · 본 문제 합침 · 오개념 큰 쪽 · 진단 이른 날 · 🎁 받은 수 큰 쪽·날 늦은 쪽', () => {
  const e = emptyProfile();
  assert.deepEqual([e.grammar, e.grammarDay, e.grammarKnown, e.grammarSeen, e.grammarMiss, e.grammarDiag, e.grammarGift], [{}, {}, {}, {}, {}, 0, { n: 0, day: 0, id: 0 }]);
  const x = { ...emptyProfile(), grammar: { G1: { box: SOLVED, due: 0, at: 100, miss: 1, d0: D0 } }, grammarDay: { [D0]: 1 }, grammarKnown: { G2: D0 }, grammarSeen: { G1: 0b11 }, grammarMiss: { bepick: 4, it: 1 }, grammarDiag: D0, grammarGift: { n: 2, day: D0 - 3, id: 25 }, updatedAt: 9 };
  const y = { ...emptyProfile(), grammar: { G1: { box: 0, due: D0 + 1, at: 200, miss: 2, d0: D0 }, G2: { box: 0, due: D0, at: 50, miss: 1, d0: D0 } }, grammarDay: { [D0 - 1]: 1 }, grammarKnown: { G2: D0 - 1, G3: D0 }, grammarSeen: { G1: 0b1100, G4: 1 }, grammarMiss: { bepick: 2, sextra: 5 }, grammarDiag: D0 - 1, grammarGift: { n: 1, day: D0, id: 7 }, updatedAt: 5 };
  for (const [a, b] of [[x, y], [y, x]]) {
    const m = mergeStatRecord('profile', a, b);
    assert.equal(m.grammar.G1.box, SOLVED);
    assert.equal(m.grammar.G2.box, 0);
    assert.deepEqual(m.grammarDay, { [D0]: 1, [D0 - 1]: 1 });
    assert.deepEqual(m.grammarKnown, { G2: D0 - 1, G3: D0 });
    assert.deepEqual(m.grammarSeen, { G1: 0b11, G4: 1 }, '본 문제는 단원마다 최근 쪽(x가 최근) · 최근 쪽에 없는 단원만 옛 쪽에서');
    assert.deepEqual(m.grammarMiss, { bepick: 4, it: 1, sextra: 5 });
    assert.equal(m.grammarDiag, D0 - 1);
    assert.deepEqual(m.grammarGift, { n: 2, day: D0, id: 25 }, '받은 수는 큰 쪽 · 날은 늦은 쪽(하루에 두 번 안 나오게)');
  }
  const c = cloneProfile(x);
  c.grammar.G1.box = 0;
  c.grammarKnown.G9 = 1;
  assert.deepEqual([x.grammar.G1.box, x.grammarKnown.G9], [SOLVED, undefined], '복사본');
  assert.deepEqual(knownOf({ G1: 3, X1: 2, G2: -1, G3: 'a' }), { G1: 3 });
  assert.deepEqual(seenOf({ G1: 1 << 20 | 5, G2: 0, G3: -1, G4: 'x' }), { G1: 5, G2: 0 }, '0도 남긴다(다 보고 처음부터)');
  assert.deepEqual(gMissOf({ ok: 2, 'B A': 1, z: 3 }), { ok: 2 });
  assert.deepEqual([mergeDiag(0, 5), mergeDiag(4, 5), mergeDiag(0, 0)], [5, 4, 0]);
  assert.deepEqual(mergeKnown({ G1: 5 }, { G1: 3 }), { G1: 3 });
  assert.deepEqual(mergeSeen({ G1: 1 }, { G1: 2, G2: 4 }), { G1: 1, G2: 4 }, '최근 쪽(앞)이 이긴다');
  assert.deepEqual(mergeSeen({ G1: 0 }, { G1: 0b111111 }), { G1: 0 }, '🔍 Codex 152차 #4: 다 보고 0으로 돌린 최근 쪽을 옛 백업이 되살리지 않는다');
  assert.deepEqual(mergeGMiss({ a1: 1 }, { a1: 3 }), {});
  assert.deepEqual(mergeGift({ n: 1, day: 5, id: 3 }, { n: 1, day: 6, id: 4 }), { n: 1, day: 6, id: 4 });
});

let initDone = false;
const stored = () => fakeIdb.get('profile', 'me');
async function seed(p) {
  if (!initDone) { await initProfile(); initDone = true; }
  await flushProfile();
  const cur = stored() || emptyProfile();
  fakeIdb.put('profile', { ...cur, ...p, id: 'me', updatedAt: (cur.updatedAt || 0) + 1 });
  await reloadProfile();
}
const withRandom = async (v, fn) => { const old = Math.random; Math.random = () => v; try { return await fn(); } finally { Math.random = old; } };

test('★ 📝 저장 경로(가짜 IndexedDB): 쪽지를 끝내면 칸·⭐ 💰·본 문제·오개념·푼 날이 저장된 프로필에 · 두 창이 같은 단원을 같이 끝내도 ⭐ 💰는 한 번 · 저장이 안 되면 없던 일', async () => {
  await seed({ coins: 0, coinsEarned: 0, grammar: {}, grammarDay: {}, grammarSeen: {}, grammarMiss: {}, grammarGift: { n: 0, day: 0, id: 0 }, caught: {} });
  fakeIdb.failNext('profile');
  const bad = await withRandom(0.5, () => grammarFinish({ id: 'G1', ok: true, from: 0, qs: [0] }, IDS, [1, 4]));
  assert.equal(bad.ok, false);
  assert.deepEqual([stored().coins, Object.keys(stored().grammar || {}).length], [0, 0], '저장 실패 = 없던 일');
  const [a, b] = await withRandom(0.5, () => Promise.all([grammarFinish({ id: 'G1', ok: true, from: 0, qs: [0, 1], miss: {} }, IDS, []), grammarFinish({ id: 'G1', ok: true, from: 0, qs: [2], miss: { bepick: 1 } }, IDS, [])]));
  assert.ok(a.ok && b.ok);
  assert.deepEqual([a.starCoins, b.starCoins].sort(), [0, STAR_COINS], '⭐ 💰는 한 번');
  assert.deepEqual([a.practice, b.practice].sort(), [false, true], '늦은 창은 낡은 쪽지(연습)');
  const s = stored();
  assert.deepEqual([s.coins, s.grammar.G1.box, s.grammarSeen.G1, s.grammarMiss.bepick], [STAR_COINS, SOLVED, 0b111, 1]);
  assert.ok(Object.values(s.grammarDay || {}).includes(1), '푼 날');
  await reloadProfile();
  assert.equal(grammarMap().G1.box, SOLVED);
  assert.equal(grammarSeenMap().G1, 0b111);
});

test('★ 🎁 저장 경로: 깜짝 포켓몬은 트랜잭션 안에서 못 잡은 것만 · 두 창이 같이 끝내도 하루 한 번 · 메모리 프로필(도감)에도 바로', async () => {
  await seed({ coins: 0, coinsEarned: 0, grammar: {}, grammarDay: {}, grammarGift: { n: 0, day: 0, id: 0 }, caught: { 1: 1 } });
  const [a, b] = await withRandom(0.001, () => Promise.all([grammarFinish({ id: 'G5', ok: false, from: 0 }, IDS, [1, 4]), grammarFinish({ id: 'G6', ok: false, from: 0 }, IDS, [1, 4])]));
  assert.deepEqual([a.gift, b.gift].sort(), [0, 4], '하루 한 번 · 못 잡은 것(4)만');
  assert.deepEqual([stored().caught[4], stored().caught[1], giftOf(stored().grammarGift).n], [1, 1, 1]);
  const { haveCount } = await import('../js/xp.js');
  if (typeof haveCount === 'function') assert.ok(haveCount(4) >= 1);
});

test('★ 🎁 다시 저장하기 (🔍 Codex 152차 #2): 쪽지마다 뽑아 둔 수(rolls)로 추첨 — 첫 저장이 실패해도 다시 저장하면 같은 추첨 · rngFrom은 부를 때마다 처음부터', async () => {
  const r = rngFrom([0.001, 0.5]);
  assert.deepEqual([r(), r(), r()], [0.001, 0.5, 0.001]);
  assert.equal(rngFrom([]), Math.random);
  assert.equal(rngFrom([2, -1, 'x']), Math.random, '깨진 수뿐이면 Math.random');
  await seed({ coins: 0, coinsEarned: 0, grammar: {}, grammarDay: {}, grammarGift: { n: 0, day: 0, id: 0 }, caught: {} });
  const old = Math.random;
  Math.random = () => 0.9; // 다시 뽑으면 빗나가는 수 — 뽑아 둔 수를 쓰면 이 값은 안 쓰인다
  try {
    fakeIdb.failNext('profile');
    const bad = await grammarFinish({ id: 'G7', ok: false, from: 0 }, IDS, [7, 8], [0.001, 0]);
    assert.equal(bad.ok, false);
    const ok = await grammarFinish({ id: 'G7', ok: false, from: 0 }, IDS, [7, 8], [0.001, 0]);
    assert.deepEqual([ok.ok, ok.gift, stored().caught[7]], [true, 7, 1], '다시 저장해도 당첨은 당첨');
  } finally { Math.random = old; }
  await seed({ grammarGift: { n: 0, day: 0, id: 0 }, caught: {} });
  const miss = await grammarFinish({ id: 'G8', ok: false, from: 0 }, IDS, [7, 8], [0.5, 0]);
  assert.equal(miss.gift, 0, '빗나간 수는 다시 저장해도 빗나감');
});

test('📝 본 문제: 12문제를 다 보면 0을 남긴다(병합에서 최근 쪽이 「처음부터」를 지킴)', () => {
  const p = {};
  grammarRule(p, { id: 'G1', ok: false, from: 0, qs: [0, 1, 2, 3, 8, 10] }, NOW, IDS, NO_GIFT);
  grammarRule(p, { id: 'G1', ok: false, from: p.grammar.G1.at, qs: [4, 5, 6, 7, 9, 11] }, NOW + DAY, IDS, NO_GIFT);
  assert.ok(Object.prototype.hasOwnProperty.call(p.grammarSeen, 'G1'));
  assert.equal(p.grammarSeen.G1, 0);
});

test('🔍 Codex 152차 #1: 자리를 옮길 수 있는 낱말(yesterday·tomorrow·today·now…)이 든 순서 문제는 눈으로 본 것만 — 새로 생기면 다시 보기', () => {
  const MOV = /\b(now|today|yesterday|tomorrow|early|always|usually|sometimes|every|here|there|too|also|together|soon|later)\b/i;
  const found = UNITS.flatMap((u) => u.qs.filter((q) => q.kind === 'order' && q.tiles.slice(1).some((t) => MOV.test(t))).map((q) => q.ans)).sort();
  // 맞는 차례가 하나뿐인지 본 것: 낱말이 맨 앞에 올 수 없고(대문자 카드 없음) 가운데로 옮기면 틀린 영어 — 「어제」가 든 G11은 「어제」를 뺐다
  assert.deepEqual(found, [
    'I will get up early tomorrow.',
    'Is there a bird in the tree?',
    'It\'s windy today.',
    'We finished our homework yesterday.',
    'What time is it now?',
    'What will you do tomorrow?',
  ]);
  assert.ok(!found.some((a) => a.includes('park yesterday')), 'G11 어제 공원');
});

test('📝 말: 쪽지 끝은 셈 없이 ⚡💰 액수만(하루 몫이 없으면 그 줄 없음) · 🎯·포켓몬 잡기 말 없음 · 🎁는 받았을 때만 한 줄', () => {
  const f1 = grammarFinishText({ ok: true, coins: STAR_COINS, starCoins: STAR_COINS, solved: true, practice: false, gift: 0 }, '', { xp: 30, coin: 5 });
  assert.deepEqual(f1, { title: '📝 문법 쪽지 끝!', lines: ['⚡+30 💰+5', `⭐ 처음부터 다 맞혔어요! · 💰 +${STAR_COINS} 더`] });
  const f2 = grammarFinishText({ ok: true, coins: 0, starCoins: 0, solved: false, practice: false, gift: 25 }, '피카츄', null);
  assert.equal(f2.title, '📝 문법 쪽지 끝!');
  assert.ok(!f2.lines.some((l) => l.startsWith('⚡')), '하루 몫이 없으면 ⚡💰 줄 없음');
  assert.ok(f2.lines.includes(`다음에 이 단원을 처음부터 다 맞히면 ⭐와 💰${STAR_COINS}!`));
  assert.ok(f2.lines.includes('🎁 깜짝 선물! 메타몽이 피카츄를 데려왔어요 — 도감에 들어갔어요'));
  assert.ok(grammarFinishText({ ok: true, gift: 1 }, '이상해씨').lines.some((l) => l.includes('이상해씨를')));
  assert.ok(grammarFinishText({ ok: true, gift: 1 }, '꼬부기').lines.some((l) => l.includes('꼬부기를')));
  assert.ok(grammarFinishText({ ok: true, gift: 1 }, '리자몽').lines.some((l) => l.includes('리자몽을')));
  assert.equal(grammarFinishText({ ok: true, solved: false, practice: true }).title, '📝 연습 쪽지 끝!');
  const bad = grammarFinishText({ ok: false, why: 'save' }, '', { xp: 20, coin: 3 });
  assert.deepEqual([bad.title, bad.lines[0]], ['저장이 안 됐어요', '⚡+20 💰+3'], '저장이 안 돼도 받은 ⚡💰는 보여 준다');
  assert.ok(grammarFinishText({ ok: false, why: 'empty' }).lines.some((l) => l.includes('계속하기')));
  assert.ok(!grammarFinishText({ ok: true }, '', { xp: 0, coin: 0 }).lines.some((l) => l.startsWith('⚡')), '0이면 줄 없음');
  for (const l of [...f1.lines, f1.title, ...f2.lines.filter((x) => !x.startsWith('🎁'))]) {
    assert.ok(!/🎯|잡기/.test(l), l);
    assert.ok(!/\d+\s*\/\s*\d+|단원 \d+개/.test(l), `셈 없음: ${l}`);
  }
});

test('📝 📤 grammar/날짜.md: 단원마다 표시 · 오개념 이름과 수(많은 차례) · 진단 · 🎁 · 최근 7일 · 한 번도 안 했으면 파일 없음 · 만들다 실패해도 나머지는 올라감', async () => {
  const p = { grammar: { G1: { box: SOLVED, due: 0, at: NOW, miss: 0, d0: D0 }, G2: { box: 0, due: D0 + 1, at: NOW, miss: 2, d0: D0 } }, grammarKnown: { G3: D0 }, grammarMiss: { bepick: 2, sextra: 5 }, grammarDay: { [D0]: 1 }, grammarDiag: D0, grammarGift: { n: 1, day: D0, id: 25 } };
  const md = grammarMd({ units: UNITS, types: RAW.types, profile: p, today: '2026-10-27', now: NOW });
  assert.ok(md.startsWith('📝 영어 문법 쪽지 기록 (2026-10-27)'));
  assert.ok(md.includes('- G1 am · is · are: ⭐'));
  assert.ok(md.includes('- G2 Is it ~? · isn\'t: 🔁 다시 볼 단원 · 틀린 쪽지 2'));
  assert.ok(md.includes('- G3 하나와 여럿: ✅ 진단으로 건너뜀'));
  assert.ok(md.includes('- G16 and · but · because: (아직)'));
  assert.ok(md.indexOf(`${RAW.types.sextra.name} (sextra): 5`) < md.indexOf(`${RAW.types.bepick.name} (bepick): 2`), '많은 차례');
  assert.ok(md.includes('🎁 깜짝 포켓몬: 1번') && md.includes('No.25'));
  assert.ok(md.includes('🔍 v348 어디까지 알까?: 2026-10-27에 끝냄 — ✅ G3'));
  assert.ok(md.includes('## 최근 7일 쪽지를 푼 날'));
  assert.ok(grammarReport(UNITS, p.grammar, p.grammarKnown, p.grammarDay, NOW).includes('⭐ 처음부터 다 맞힌 단원 1/16 · 🔍 v348 진단으로 건너뛴 단원 1 · 다시 볼 단원 1'));
  const md2 = grammarMd({ units: UNITS, types: RAW.types, profile: { ...p, grammarKnown: {}, grammarDiag: 0 }, today: '2026-10-27', now: NOW });
  assert.ok(!md2.includes('어디까지 알까') && !md2.includes('진단으로 건너뛴'), 'v348 진단을 안 했으면 진단 줄 없음');
  const base = { getMath: async () => null, listDaily: async () => [], mathReportText: () => '', asksText: () => '', collectTodo: () => [], today: '2026-10-27' };
  const files = await gatherFiles({ ...base, getGrammar: async () => md });
  assert.ok(files.some((f) => f.path === 'grammar/2026-10-27.md' && f.text === md));
  const none = await gatherFiles({ ...base, getGrammar: async () => null });
  assert.ok(!none.some((f) => f.path.startsWith('grammar/')));
  const boom = await gatherFiles({ ...base, getGrammar: async () => { throw new Error('x'); } });
  assert.ok(boom.some((f) => f.path.startsWith('math/')) && !boom.some((f) => f.path.startsWith('grammar/')), '실패해도 나머지는 그대로');
});

test('📝 화면 연결(v349): 홈 카드·문법 화면·⏳ 칩·진단을 걷음 · 영상 사이 쪽지 창 · ⚙ 켜기·끄기 · sw · 원고 검사 · 잡기·🎯 없음 · 문법 전용 포켓몬 없음', () => {
  assert.ok(!SUBJECTS.some((s) => s.key === 'grammar' || s.view === 'grammar'), '첫 화면 카드 넷 — 문법 카드 없음');
  assert.equal(SUBJECTS.length, 4);
  assert.ok(!ROSTER.some((m) => m.subject === 'grammar'), '문법 전용 명단은 없다(아버님 10-27)');
  const html = read('index.html');
  for (const id of ['view-grammar', 'btn-grammar-back', 'time-chip-grammar', 'grammar-main']) assert.ok(!html.includes(`id="${id}"`), `걷음 ${id}`);
  for (const id of ['grammar-note', 'grammar-note-main', 'set-grammar']) assert.equal(html.split(`id="${id}"`).length, 2, `하나만 ${id}`);
  const app = read('js/app.js');
  assert.ok(!/grammar/i.test(app), 'app.js에 문법 화면 배선 없음');
  assert.ok(!read('js/timeup.js').includes('time-chip-grammar'));
  assert.equal(placeOfView('grammar'), null);
  const sw = read('sw.js');
  for (const f of ['./js/grammar.js', './js/grammarnote.js', './coach/english/grammar.json']) assert.ok(sw.includes(`'${f}'`), f);
  assert.ok(!sw.includes('grammarview'));
  assert.ok(read('tools/check.mjs').includes('checkGrammar(grammar)'));
  const note = read('js/grammarnote.js');
  assert.ok(!/openCatch|catchAttempt|Throw|🎯/.test(note), '쪽지에는 잡기가 없다');
  assert.ok(note.includes('rolls: [Math.random(), Math.random()]') && note.includes('giftPool(), r.rolls)'), '🎁 추첨 수는 쪽지마다 한 번 뽑아 다시 저장해도 같은 수 (Codex 152차 #2)');
  assert.ok(/if \(r\.reward === undefined\) \{\s*r\.reward = null;/.test(note), '⚡💰는 쪽지마다 한 번 — 다시 저장해도 또 주지 않는다');
  assert.ok(!/guardStart/.test(note), '영상 화면 안이라 따로 시간을 보지 않는다(영상이 이미 영어 시간)');
  const css = read('css/style.css');
  assert.ok(!/^\.gr-hint \{ color: var\(--gr-ink\)/m.test(css), '쪽지 힌트 이름이 🏃 달리기 .gr-hint를 덮지 않는다');
  assert.ok(css.includes('.gr-typehint {') && note.includes("'gr-typehint'"));
  assert.ok(read('js/upload.js').includes('getGrammar: grammarNow'));
  const db = read('js/db.js');
  assert.ok(/'uJourney',[^\n]*\n[^\n]*\n\s*'grammarNotes',/.test(db), '오늘 쪽지 수는 DAILY_SUMS(병합 큰 쪽)');
});
