// ☀️ 오늘의 수학 — 개념 편 1 + 🎲 섞어 풀기 (2026-09-21, 아이디어 ④): node --test tests/mathdaily.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dailyPlan, weakKinds, applyMixRound, markDaily, dailyDone, applyRound, applyNotesRound, MIX_CONCEPTS, KINDS, REWARD, dueNotes, conceptReport, mathReportText,
} from '../js/mathprog.js';
import { emptyMath, mergeMath } from '../js/db.js';
import { rng } from '../js/mathgen.js';

const T = '2026-09-21';
const Y = '2026-09-20';
const ids = ['frac.mean', 'frac.same', 'frac.mixed', 'frac.equal', 'frac.common', 'frac.add', 'frac.mulnat', 'frac.mul', 'frac.divnat', 'frac.div'];
const pass = { correct: 4, total: 4, missTags: [], qs: KINDS.map((k) => ({ k, ok: 1 })) };
/** 앞에서부터 n개 개념을 "안다"로 — lastAt은 오래된 순서대로 (첫 개념이 제일 오래됨) */
function learned(n, today = Y) {
  const m = emptyMath();
  for (let i = 0; i < n; i++) {
    applyRound(m, ids[i], pass, today);
    m.concepts[ids[i]].lastAt = 1000 + i; // 오래된 순서를 고정
    m.concepts[ids[i]].dueAt = '2099-01-01'; // 복습 차례 아님
  }
  return m;
}

test('☀️ 처음(아는 개념 0, ▶ 첫 개념): 개념 편만 — 새로 배우기, 섞어 풀기는 빈다', () => {
  const p = dailyPlan(emptyMath(), T, 'fraction', 1);
  assert.equal(p.roundId, 'frac.mean');
  assert.equal(p.roundMode, 'learn');
  assert.deepEqual(p.mix, []);
});

test('☀️ 복습 차례가 없으면 ▶ 새 개념 + 안 본 지 오래된 아는 개념 3개 (개념 편 개념 제외, 서로 다름)', () => {
  const m = learned(5);
  const p = dailyPlan(m, T, 'fraction', 7);
  assert.equal(p.roundId, ids[5], '▶ 다음 개념');
  assert.equal(p.roundMode, 'learn');
  assert.equal(p.mix.length, MIX_CONCEPTS);
  const mixIds = p.mix.map((x) => x.id);
  assert.equal(new Set(mixIds).size, MIX_CONCEPTS, '서로 다른 개념');
  assert.deepEqual([...mixIds].sort(), ids.slice(0, 3).sort(), 'lastAt이 오래된 세 개 (frac.mean·same·mixed)');
  assert.ok(!mixIds.includes(p.roundId));
  for (const x of p.mix) { assert.equal(x.kinds.length, KINDS.length, '얼굴 우선순위 전부'); assert.equal(x.note, undefined); }
});

test('☀️ 복습 차례가 있으면 그 개념부터(review) — 섞어 풀기에서는 뺀다', () => {
  const m = learned(5);
  m.concepts[ids[2]].dueAt = T; // frac.mixed 오늘 복습
  const p = dailyPlan(m, T, 'fraction', 3);
  assert.equal(p.roundId, ids[2]);
  assert.equal(p.roundMode, 'review');
  assert.ok(!p.mix.some((x) => x.id === ids[2]), '복습 편에서 4문항을 풀 개념은 섞어 풀기에 안 낸다');
  assert.equal(p.mix.length, MIX_CONCEPTS);
  assert.deepEqual(p.mix.map((x) => x.id).sort(), [ids[0], ids[1], ids[3]].sort(), '그다음 오래된 것으로 채운다');
});

test('☀️ 사다리가 끝났으면 개념 편 없이 섞어 풀기만', () => {
  const m = learned(10);
  const p = dailyPlan(m, T, 'fraction', 5);
  assert.equal(p.roundId, null);
  assert.equal(p.roundMode, null);
  assert.equal(p.mix.length, MIX_CONCEPTS);
});

test('☀️ 아는 개념이 1~2개면 그만큼만', () => {
  const m = learned(2);
  const p = dailyPlan(m, T, 'fraction', 5);
  assert.equal(p.roundId, ids[2]);
  assert.equal(p.mix.length, 2);
});

test('☀️ 같은 씨앗이면 같은 계획, 씨앗이 다르면 순서가 섞인다', () => {
  const m = learned(6);
  const a = dailyPlan(m, T, 'fraction', 11);
  const b = dailyPlan(m, T, 'fraction', 11);
  assert.deepEqual(a, b);
  const orders = new Set();
  for (let s = 0; s < 30; s++) orders.add(dailyPlan(m, T, 'fraction', s).mix.map((x) => x.id).join(','));
  assert.ok(orders.size > 1, '개념 세 개의 순서가 씨앗에 따라 다르다 (뒤섞인 순서)');
});

test('🎲 약한 얼굴부터 — 안 해 본 얼굴이 먼저, 그다음 정답률이 낮은 순', () => {
  const rec = { kinds: { calc: [5, 5], misread: [1, 4], why: [3, 4] } }; // special은 안 해 봄
  const ks = weakKinds(rec, rng(1));
  assert.equal(ks[0], 'special', '안 해 본 얼굴');
  assert.equal(ks[1], 'misread', '정답률 25%');
  assert.equal(ks[2], 'why', '75%');
  assert.equal(ks[3], 'calc', '100%');
  assert.deepEqual([...weakKinds({}, rng(2))].sort(), [...KINDS].sort(), '기록이 없으면 넷 다 — 순서만 씨앗으로');
});

test('🤔 어제 이전 노트가 있으면 섞어 풀기에 한 문항 (개념 편의 개념 것은 제외, 오늘 노트·다른 줄기 노트는 제외)', () => {
  const m = learned(5);
  // frac.same에 어제 틀린 노트, frac.mixed에 오늘 노트
  m.concepts[ids[1]].notes = [{ k: 'calc', key: 'K1', d: Y, t: 10 }];
  m.concepts[ids[2]].notes = [{ k: 'why', key: 'K2', d: T, t: 20 }];
  const p = dailyPlan(m, T, 'fraction', 4);
  const noteQ = p.mix.filter((x) => x.note);
  assert.equal(noteQ.length, 1);
  assert.equal(noteQ[0].id, ids[1]);
  assert.deepEqual(noteQ[0].kinds, ['calc'], '노트 문항은 그 유형의 얼굴 하나');
  assert.equal(noteQ[0].note.key, 'K1');
  assert.equal(p.mix.length, MIX_CONCEPTS + 1, '아는 개념 3 + 노트 1');
  // 노트가 개념 편(복습) 개념의 것이면 — 그 편에 이미 끼어 드니 여기선 안 낸다
  m.concepts[ids[1]].dueAt = T;
  const p2 = dailyPlan(m, T, 'fraction', 4);
  assert.equal(p2.roundId, ids[1]);
  assert.equal(p2.mix.filter((x) => x.note).length, 0);
  // 다른 줄기(음수)의 노트는 분수 오늘의 수학에 안 나온다
  const m3 = learned(5);
  m3.concepts['neg.mean'] = { done: true, box: 1, dueAt: '2099-01-01', passes: 1, fails: 0, lastAt: 5, notes: [{ k: 'calc', key: 'N1', d: Y, t: 1 }] };
  assert.equal(dueNotes(m3, T).length, 1);
  assert.equal(dailyPlan(m3, T, 'fraction', 4).mix.filter((x) => x.note).length, 0);
  assert.ok(!dailyPlan(m3, T, 'fraction', 4).mix.some((x) => x.id === 'neg.mean'), '아는 개념도 지금 줄기 것만');
});

test('🎲 섞어 풀기는 연습 — 통과·라이트너(box·dueAt·passes)는 불변, 기록·오개념·노트·일지만', () => {
  const m = learned(4);
  const before = JSON.parse(JSON.stringify(m.concepts));
  const res = applyMixRound(m, [
    { id: ids[0], key: 'A', k: 'calc', ok: 1 },
    { id: ids[1], key: 'B', k: 'why', ok: 0, tag: '분모끼리도 더함' },
    { id: ids[2], key: 'C', k: 'misread', ok: 0, w: 's' }, // 🙈 실수
  ], T);
  assert.deepEqual(res, { ok: 1, total: 3 });
  for (const id of ids.slice(0, 3)) {
    const a = before[id]; const b = m.concepts[id];
    assert.equal(b.done, a.done); assert.equal(b.box, a.box); assert.equal(b.dueAt, a.dueAt);
    assert.equal(b.passes, a.passes); assert.equal(b.fails, a.fails);
    assert.ok(b.lastAt > a.lastAt, '안 본 지 오래된 순서가 돌아가게 lastAt은 올린다');
  }
  assert.equal(m.rounds, 4, '편 수는 개념 편만 센다');
  assert.deepEqual(m.concepts[ids[0]].kinds.calc, [2, 2]);
  assert.deepEqual(m.concepts[ids[1]].kinds.why, [1, 2]);
  assert.deepEqual(m.concepts[ids[1]].miss, { '분모끼리도 더함': 1 });
  assert.equal(m.miss['분모끼리도 더함'], 1, '전체 오개념에도');
  assert.equal(m.concepts[ids[1]].notes.length, 1, '틀린 유형은 🤔 노트에');
  assert.equal(m.concepts[ids[1]].notes[0].key, 'B');
  assert.equal(m.concepts[ids[2]].notes.length, 0, '실수는 노트에 안 쌓인다');
  assert.equal(m.concepts[ids[2]].miss['분모끼리도 더함'], undefined);
  const e = m.log[m.log.length - 1];
  assert.equal(e.id, 'mix'); assert.equal(e.mode, 'mix'); assert.equal(e.ok, 1); assert.equal(e.n, 3);
  assert.deepEqual(e.qs.map((q) => q.c), ids.slice(0, 3), '문항마다 개념(c)');
  assert.equal(e.qs[2].w, 's');
});

test('🎲 섞어 풀기의 🤔 노트 문항 — 맞히면 지우고(cleared), 틀리면 오늘로 밀어 내일 이후에', () => {
  const m = learned(3);
  m.concepts[ids[0]].notes = [{ k: 'calc', key: 'A', d: Y, t: 10 }];
  m.concepts[ids[1]].notes = [{ k: 'why', key: 'B', d: Y, t: 11 }];
  applyMixRound(m, [
    { id: ids[0], key: 'A', k: 'calc', ok: 1, note: true },
    { id: ids[1], key: 'B', k: 'why', ok: 0, tag: '역수', note: true },
  ], T);
  assert.deepEqual(m.concepts[ids[0]].notes, []);
  assert.ok(m.concepts[ids[0]].cleared.A > 0, '지운 표시 (백업 병합에서 되살아나지 않게)');
  const n = m.concepts[ids[1]].notes[0];
  assert.equal(n.d, T); assert.equal(n.again, 1); assert.equal(n.tag, '역수');
  assert.equal(dueNotes(m, T).length, 0, '오늘 밀린 것은 오늘 다시 안 나온다');
  assert.equal(dueNotes(m, '2026-09-22').length, 1);
  // 일반 문항으로 맞힌 유형에 노트가 있었다면 그것도 지운다 (개념 편과 같은 규칙)
  const m2 = learned(2);
  m2.concepts[ids[0]].notes = [{ k: 'calc', key: 'A', d: Y, t: 10 }];
  applyMixRound(m2, [{ id: ids[0], key: 'A', k: 'calc', ok: 1 }], T);
  assert.deepEqual(m2.concepts[ids[0]].notes, []);
});

test('🎲 모르는 개념·없는 개념의 문항은 무시한다 (기록을 만들지 않는다)', () => {
  const m = learned(1);
  applyMixRound(m, [{ id: 'frac.div', key: 'Z', k: 'calc', ok: 0, tag: 'x' }, { id: 'nope', k: 'calc', ok: 1 }], T);
  assert.equal(m.concepts['frac.div'], undefined);
  assert.equal(m.concepts.nope, undefined);
  assert.equal(m.log[m.log.length - 1].ok, 1, '정답 수는 센다');
});

test('☀️ 완주 기록 — 하루 첫 완주만 first, 두 번째부터 n만 오른다, 다음 날 리셋', () => {
  const m = emptyMath();
  assert.equal(dailyDone(m, T), 0);
  assert.deepEqual(markDaily(m, T), { first: true, n: 1 });
  assert.equal(dailyDone(m, T), 1);
  assert.deepEqual(markDaily(m, T), { first: false, n: 2 });
  assert.equal(dailyDone(m, T), 2);
  assert.equal(dailyDone(m, '2026-09-22'), 0);
  assert.deepEqual(markDaily(m, '2026-09-22'), { first: true, n: 1 });
  assert.ok(REWARD.daily.xp < REWARD.reviewPass.xp, '완주 보너스는 복습 통과보다 작다 — 누르기만으로 큰 보상이 되지 않게');
});

test('🌟 황금볼: 섞어 풀기 전부 정답(perfect)이면 하루 1개 — 두 번째 ☀️에서 다 맞혀도 다시 안 줌, 틀린 첫 완주 뒤 두 번째에 다 맞히면 줌, 다음 날 리셋', () => {
  const m = emptyMath();
  assert.deepEqual(markDaily(m, T, { perfect: false }), { first: true, n: 1, gold: false }, '첫 완주지만 틀림 → 없음');
  assert.equal(m.daily.gold, undefined);
  assert.deepEqual(markDaily(m, T, { perfect: true }), { first: false, n: 2, gold: true }, '두 번째 ☀️에서 다 맞힘 → 황금볼 (틀린 뒤 다시가 학습)');
  assert.equal(m.daily.gold, true);
  assert.deepEqual(markDaily(m, T, { perfect: true }), { first: false, n: 3, gold: false }, '하루 1개');
  assert.equal(m.daily.gold, true, '표시는 남는다');
  assert.deepEqual(markDaily(m, T), { first: false, n: 4 }, 'perfect를 안 물으면(개념 편만 있는 날) gold 필드 없음');
  assert.equal(m.daily.gold, true, '안 물어도 오늘 받은 표시는 지워지지 않는다');
  assert.deepEqual(markDaily(m, '2026-09-22', { perfect: true }), { first: true, n: 1, gold: true }, '다음 날 다시');
});

test('🛟 백업 병합: 🌟 황금볼 표시는 같은 날이면 어느 쪽이 받았든 남는다 (옛 백업이 두 번 주지 않게)', () => {
  const a = emptyMath(); markDaily(a, T, { perfect: true });
  const b = emptyMath(); markDaily(b, T); markDaily(b, T);
  assert.deepEqual(mergeMath(a, b).daily, { d: T, n: 2, gold: true }, '횟수는 큰 쪽, 황금볼은 합집합');
  assert.deepEqual(mergeMath(b, a).daily, { d: T, n: 2, gold: true });
  const c = emptyMath(); markDaily(c, Y, { perfect: true });
  assert.deepEqual(mergeMath(c, b).daily, { d: T, n: 2 }, '어제 받은 황금볼은 오늘 기록에 안 붙는다');
  assert.deepEqual(mergeMath(b, c).daily, { d: T, n: 2 });
});

test('🛟 백업 병합: 완주 기록은 늦은 날짜 쪽, 같은 날이면 큰 횟수', () => {
  const a = emptyMath(); markDaily(a, T);
  const b = emptyMath(); markDaily(b, Y); markDaily(b, Y);
  assert.deepEqual(mergeMath(a, b).daily, { d: T, n: 1 }, '어제 두 번보다 오늘 한 번');
  assert.deepEqual(mergeMath(b, a).daily, { d: T, n: 1 });
  const c = emptyMath(); markDaily(c, T); markDaily(c, T);
  assert.deepEqual(mergeMath(a, c).daily, { d: T, n: 2 });
  assert.deepEqual(mergeMath(c, a).daily, { d: T, n: 2 });
  assert.equal(mergeMath(emptyMath(), emptyMath()).daily, undefined, '없으면 안 만든다');
  assert.deepEqual(mergeMath(emptyMath(), a).daily, { d: T, n: 1 });
});

test('📊 섞어 풀기 문항은 개념별 보고(바로 고침·감 잡기)에 세고, 통과 흔적(trail)에는 안 들어간다 · 보고 글 라벨', () => {
  const m = learned(2);
  applyMixRound(m, [{ id: ids[0], key: 'A', k: 'calc', ok: 0, fx: 1, sn: 0, tag: 't' }, { id: ids[1], key: 'B', k: 'why', ok: 1, sn: 1 }], T);
  const rep = conceptReport(m, 8);
  const r0 = rep.find((r) => r.id === ids[0]);
  assert.equal(r0.fixed, 1, '쌍둥이로 바로 고친 것');
  assert.deepEqual(r0.sense, [0, 1]);
  assert.equal(r0.trail.length, 1, '개념 편 한 번만 — 섞어 풀기는 통과/실패 흔적이 아니다');
  const txt = mathReportText(m, T);
  assert.ok(txt.includes('🎲섞어풀기'), txt);
});

// ───── Codex 3차 리뷰 회귀 (2026-09-21 밤) ─────

test('Codex #1: 병합은 일정을 schedAt(일정 바뀐 시각)으로 고른다 — 옛 기기에서 섞어 풀기만 해도 👑이 안 되돌아간다', () => {
  const base = emptyMath();
  base.concepts['frac.mean'] = { done: true, box: 4, dueAt: T, passes: 4, fails: 0, lastAt: 100, schedAt: 50 };
  const a = JSON.parse(JSON.stringify(base));
  const b = JSON.parse(JSON.stringify(base));
  const real = Date.now;
  try {
    Date.now = () => 200;
    const res = applyRound(a, 'frac.mean', pass, T); // 태블릿: 복습 통과 → box 5, schedAt 200
    assert.equal(res.crowned, true);
    assert.equal(a.concepts['frac.mean'].schedAt, 200);
    Date.now = () => 300;
    applyMixRound(b, [{ id: 'frac.mean', key: 'A', k: 'calc', ok: 1 }], T); // 폰(옛 상태): 섞어 풀기 → lastAt 300, box 그대로 4
  } finally { Date.now = real; }
  assert.equal(b.concepts['frac.mean'].box, 4);
  assert.equal(b.concepts['frac.mean'].schedAt, 50, '연습은 schedAt을 안 올린다');
  for (const merged of [mergeMath(a, b), mergeMath(b, a)]) {
    assert.equal(merged.concepts['frac.mean'].box, 5, '👑 유지');
    assert.equal(merged.concepts['frac.mean'].schedAt, 200);
    assert.equal(merged.concepts['frac.mean'].lastAt, 300, '활동 시각은 큰 값');
  }
  // schedAt이 없는 옛 기록끼리는 예전처럼 lastAt으로
  const o1 = emptyMath(); o1.concepts.x = { done: true, box: 2, dueAt: T, lastAt: 10 };
  const o2 = emptyMath(); o2.concepts.x = { done: true, box: 3, dueAt: T, lastAt: 20 };
  assert.equal(mergeMath(o1, o2).concepts.x.box, 3);
  assert.equal(mergeMath(o1, o2).concepts.x.schedAt, undefined, '없던 시각을 만들어 달지 않는다');
});

test('Codex #3: 같은 유형이 일반 문항(정답)과 노트 문항(오답)으로 함께 나와도 노트가 남는다 · 시각은 cleared보다 뒤', () => {
  const m = learned(1);
  m.concepts[ids[0]].notes = [{ k: 'misread', key: 'K', d: Y, t: 1 }];
  applyMixRound(m, [
    { id: ids[0], key: 'K', k: 'misread', ok: 1 },              // 일반 문항으로 맞힘 → 노트 지움
    { id: ids[0], key: 'K', k: 'misread', ok: 0, note: true, tag: '역수' }, // 노트 문항으로 틀림 → 다시 남아야 한다
  ], T);
  const rec = m.concepts[ids[0]];
  assert.equal(rec.notes.length, 1, '노트가 되살아난다');
  assert.equal(rec.notes[0].key, 'K'); assert.equal(rec.notes[0].d, T); assert.equal(rec.notes[0].tag, '역수');
  assert.ok(rec.notes[0].t > rec.cleared.K, '병합이 "지운 것"으로 보지 않게 cleared보다 뒤');
  assert.deepEqual(rec.kinds.misread, [2, 3], '처음 편 1 + 이번 2');
  // 노트 회차도 같은 규칙 — 다른 창이 먼저 지웠어도 방금 틀린 건 남는다
  const m2 = learned(1);
  applyNotesRound(m2, [{ id: ids[0], key: 'Z', k: 'calc', ok: 0 }], T);
  assert.equal(m2.concepts[ids[0]].notes.length, 1);
  assert.equal(m2.concepts[ids[0]].notes[0].again, 1);
});

test('Codex #6: 다른 줄기의 노트가 50개 넘게 쌓여도 이 줄기의 노트가 뽑힌다', () => {
  const m = learned(5);
  let t = 1;
  for (const id of ids.slice(0, 5)) m.concepts[id].notes = Array.from({ length: 12 }, (_, i) => ({ k: 'calc', key: `K${id}${i}`, d: Y, t: t++ }));
  m.concepts['neg.line'] = { done: true, box: 1, dueAt: '2099-01-01', passes: 1, fails: 0, lastAt: 5, notes: [{ k: 'calc', key: 'N', d: Y, t: 999 }] };
  const p = dailyPlan(m, T, 'negative', 1);
  const note = p.mix.find((x) => x.note);
  assert.ok(note && note.id === 'neg.line' && note.note.key === 'N', '분수 노트 60개 뒤에 있어도 음수 노트가 나온다');
});

test('Codex C: 정답률 90% 이상은 "튼튼한 얼굴"로 같이 묶여 씨앗으로 돈다 — 한 번 틀린 자국이 영원히 1순위가 아니다', () => {
  const rec = { kinds: { calc: [9, 10], misread: [10, 10], why: [10, 10], special: [10, 10] } };
  const firsts = new Set();
  for (let s = 0; s < 40; s++) firsts.add(weakKinds(rec, rng(s))[0]);
  assert.ok(firsts.size > 1, `calc(90%)만 계속 뽑히지 않는다: ${[...firsts]}`);
  assert.equal(weakKinds({ kinds: { calc: [7, 10], misread: [10, 10], why: [10, 10], special: [10, 10] } }, rng(1))[0], 'calc', '70%는 여전히 약한 얼굴');
  assert.equal(weakKinds({ kinds: { calc: [8, 10], misread: [9, 10], why: [10, 10], special: [10, 10] } }, rng(1))[0], 'calc', '80%는 90%보다 앞');
});

test('빈 섞어 풀기(문항 0개)는 일지에 안 남기고 완주만 적는다', () => {
  const m = learned(1);
  const before = m.log.length;
  const res = applyMixRound(m, [], T);
  assert.deepEqual(res, { ok: 0, total: 0 });
  assert.equal(m.log.length, before);
  assert.deepEqual(markDaily(m, T), { first: true, n: 1 });
});
