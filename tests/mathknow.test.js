// 🥚 배우는 중 → 🐣 안다 (2026-10-01, 아버님 결정 ②): node --test tests/mathknow.test.js
// 배운 날 첫 편 통과는 🥚, 다음 날 이후 확인을 통과해야 🐣 "안다". 한 줄기에 🥚가 2칸이면 새 칸을 잠근다.
// 🔁 확인 편은 4문항(같은 개념·같은 수준, 다른 틀부터) — 일곱 줄기는 한 편이 ①②뿐이었다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  applyRound, applyPlacement, ladderOf, dailyPlan, mathSummary, mathReportText, stageOf, LEARNING_MAX, REVIEW_MIN, widenRound, STEMS, STEM_ORDER,
} from '../js/mathprog.js';
import { emptyMath, cloneMath } from '../js/db.js';

const T = '2026-10-01';
const T1 = '2026-10-02';
const pass = { correct: 2, total: 2, missTags: [], qs: [{ k: 'calc', ok: 1 }, { k: 'misread', ok: 1 }] };
const fail = { correct: 1, total: 2, missTags: ['x'], qs: [{ k: 'calc', ok: 1 }, { k: 'misread', ok: 0, tag: 'x' }] };
const F = STEMS.fraction.list.map((c) => c.id);

test('🥚 → 🐣: 배운 날 통과는 배우는 중, 다음 날 확인을 통과해야 안다 (result.known) · 틀리면 🥚 그대로', () => {
  const m = emptyMath();
  const r1 = applyRound(m, F[0], pass, T);
  assert.equal(r1.first, true);
  assert.equal(r1.known, false, '배운 날은 안다가 아니다');
  assert.equal(stageOf(m.concepts[F[0]]), 'learning');
  assert.equal(m.concepts[F[0]].done, true, 'done은 그대로 — 다음 칸은 열린다');
  const again = applyRound(m, F[0], pass, T);
  assert.equal(again.practice, true, '같은 날 또 풀어도 연습');
  assert.equal(stageOf(m.concepts[F[0]]), 'learning', '같은 날 몇 번을 풀어도 🥚');

  const bad = cloneMath(m);
  const rf = applyRound(bad, F[0], fail, T1);
  assert.equal(rf.review, true);
  assert.equal(rf.known, false);
  assert.equal(stageOf(bad.concepts[F[0]]), 'learning', '확인에서 틀리면 🥚 — 내일 다시');
  assert.equal(bad.concepts[F[0]].dueAt, '2026-10-03');

  const r2 = applyRound(m, F[0], pass, T1);
  assert.equal(r2.review, true);
  assert.equal(r2.known, true, '다음 날 확인 통과 = 🐣 안다');
  assert.equal(stageOf(m.concepts[F[0]]), 'known');
  const r3 = applyRound(m, F[0], pass, m.concepts[F[0]].dueAt);
  assert.equal(r3.known, false, '이미 안다면 다시 축하하지 않는다');
});

test('📏 진단으로 친 칸: 확인 전은 placed(🥚 2칸에 안 셈), 며칠 뒤 확인 통과 → 🐣, 틀리면 🥚', () => {
  const m = emptyMath();
  const { knownIds } = applyPlacement(m, F.slice(0, 5).map((id, i) => ({ concept: id, correct: i < 4 })), T);
  assert.ok(knownIds.length >= 3);
  for (const id of knownIds) assert.equal(stageOf(m.concepts[id]), 'placed');
  const rows = ladderOf(m, T);
  assert.equal(rows.filter((r) => r.stage === 'placed').length, knownIds.length);
  assert.ok(rows.filter((r) => r.stage === 'placed').every((r) => r.icon === '📏'), '진단 칸은 🐣가 아니라 📏');
  assert.ok(rows.some((r) => r.state === 'now'), '진단 칸이 여럿이어도 새 칸은 안 잠긴다');
  const due = m.concepts[knownIds[0]].dueAt;
  const ok = cloneMath(m);
  assert.equal(applyRound(ok, knownIds[0], pass, due).known, true);
  assert.equal(stageOf(ok.concepts[knownIds[0]]), 'known');
  applyRound(m, knownIds[0], fail, due);
  assert.equal(stageOf(m.concepts[knownIds[0]]), 'learning', '진단이 틀렸으면 배우는 중으로');
});

test(`🔒 한 줄기에 🥚가 ${LEARNING_MAX}칸이면 새 칸(▶·○)은 wait — 확인하면 다시 열린다 · 다른 줄기는 따로`, () => {
  assert.equal(LEARNING_MAX, 2);
  const m = emptyMath();
  applyRound(m, F[0], pass, T);
  assert.equal(ladderOf(m, T)[1].state, 'now', '🥚 하나면 다음 칸이 열린다');
  applyRound(m, F[1], pass, T);
  const rows = ladderOf(m, T);
  assert.deepEqual(rows.slice(0, 3).map((r) => r.state), ['done', 'done', 'wait']);
  assert.equal(rows[2].icon, '🔒');
  assert.ok(!rows.some((r) => r.state === 'now' || r.state === 'open'), '배울 수 있는 칸이 하나도 없다');
  // ☀️: 배울 칸이 없고 확인 차례도 아니면 섞어 풀기만 + waiting
  const p = dailyPlan(m, T, 'fraction', 3);
  assert.equal(p.roundId, null);
  assert.equal(p.waiting, true);
  assert.equal(p.mix.length, 2, '오늘 배운 🥚 둘은 섞어 풀기로');
  // 다른 줄기는 잠기지 않는다
  assert.equal(ladderOf(m, T, 'negative')[0].state, 'now');
  // 다음 날 ☀️는 확인부터
  const p1 = dailyPlan(m, T1, 'fraction', 3);
  assert.equal(p1.roundId, F[0]);
  assert.equal(p1.roundMode, 'review');
  assert.equal(p1.waiting, false);
  applyRound(m, F[0], pass, T1);
  assert.equal(ladderOf(m, T1)[2].state, 'now', '하나를 확인하면 🥚가 하나 → 새 칸이 열린다');
  // 확인에서 틀린 칸은 계속 🥚로 센다
  const m2 = emptyMath();
  applyRound(m2, F[0], pass, T);
  applyRound(m2, F[0], fail, T1); // 확인 실패 → 🥚
  applyRound(m2, F[1], pass, T1);
  assert.equal(ladderOf(m2, T1)[2].state, 'wait', '틀린 🥚 + 새 🥚 = 2칸');
});

test('📊 요약: 🐣 안다(👑 포함) · 🥚 배우는 중 · 📏 진단 — 줄기별·전체, 📋 첫 줄', () => {
  const m = emptyMath();
  applyRound(m, F[0], pass, T);
  applyRound(m, F[0], pass, T1);            // 🐣
  applyRound(m, F[1], pass, T1);            // 🥚
  const { knownIds } = applyPlacement(m, STEMS.negative.list.slice(0, 5).map((c, i) => ({ concept: c.id, correct: i < 2 })), T, 'negative'); // 📏
  const P = knownIds.length;
  assert.ok(P >= 1);
  const s = mathSummary(m);
  const fr = s.stems.find((x) => x.key === 'fraction');
  assert.deepEqual([fr.done, fr.known, fr.learning, fr.placed], [2, 1, 1, 0]);
  const ng = s.stems.find((x) => x.key === 'negative');
  assert.deepEqual([ng.known, ng.learning, ng.placed], [0, 0, P]);
  assert.deepEqual([s.known, s.learning, s.placed], [1, 1, P]);
  assert.ok(mathReportText(m, T1).split('\n')[0].includes(`🐣 안다 1 · 🥚 배우는 중 1 · 📏 진단으로 침 ${P} · 👑 0`));
});

test(`🔁 확인 편은 ${REVIEW_MIN}문항까지 — 모든 줄기·모든 칸에서 늘고, 문제 글은 겹치지 않고, 다른 틀을 먼저 고른다`, () => {
  assert.equal(REVIEW_MIN, 4);
  let twoTpl = 0;
  let distinct = 0;
  for (const key of STEM_ORDER) {
    const S = STEMS[key];
    const content = JSON.parse(fs.readFileSync(new URL(S.file, new URL('../', import.meta.url)), 'utf8'));
    const opts = { content };
    for (const c of S.list) {
      for (let seed = 1; seed <= 12; seed++) {
        const base = S.gen.makeRound(c.id, seed * 7, opts);
        const qs = widenRound(base, (t) => S.gen.makeRound(c.id, seed * 7 + t * 104729, opts));
        assert.ok(qs.length >= Math.min(REVIEW_MIN, Math.max(base.length, REVIEW_MIN)), `${c.id} seed ${seed}: ${qs.length}문항`);
        assert.equal(qs.length, Math.max(base.length, REVIEW_MIN), `${c.id}: 원래 편이 4문항 이상이면 그대로, 아니면 4`);
        assert.deepEqual(qs.slice(0, base.length), base, '원래 편은 앞에 그대로');
        assert.equal(new Set(qs.map((q) => q.q)).size, qs.length, `${c.id}: 같은 문제 글 두 번 금지`);
        for (const q of qs) assert.equal(q.concept, c.id, '같은 개념만');
        const keys = qs.map((q) => q.key).filter(Boolean);
        if (keys.length === qs.length) { twoTpl++; if (new Set(keys).size === keys.length) distinct++; }
      }
    }
  }
  assert.ok(distinct / twoTpl > 0.8, `틀(key)까지 서로 다른 편 ${distinct}/${twoTpl} — 다른 틀을 먼저 고른다`);
});

test('🔁 widenRound 순수 규칙: 다른 틀 먼저 → 없으면 같은 틀의 다른 숫자 → 그래도 없으면 있는 만큼', () => {
  const q = (k, t) => ({ concept: 'x', kind: 'calc', key: k, q: t });
  const base = [q('A', 'a1'), q('B', 'b1')];
  const out = widenRound(base, (t) => (t <= 2 ? [q('A', `a${t + 1}`), q('C', `c${t}`)] : [q('A', `a${t + 1}`)]));
  assert.deepEqual(out.map((x) => x.key), ['A', 'B', 'C', 'A'], '다른 틀 C 먼저, 모자라면 같은 틀 A의 다른 글');
  assert.equal(widenRound(base, () => [q('A', 'a1')]).length, 2, '같은 글뿐이면 늘리지 않는다');
  const four = [q('A', '1'), q('B', '2'), q('C', '3'), q('D', '4')];
  assert.deepEqual(widenRound(four, () => { throw new Error('부르면 안 된다'); }), four, '이미 4문항이면 그대로 (분수 줄기 ①②③⭐)');
});

test('🖥 화면 배선: 확인 편만 늘리고 · wait 칸은 못 누르고 · 결과 카드가 🥚/🐣를 말한다', () => {
  const src = fs.readFileSync(new URL('../js/math.js', import.meta.url), 'utf8');
  assert.match(src, /if \(mode === 'review'\) \{[\s\S]{0,200}widenRound\(qs,/, '확인(review) 편에서만 widenRound');
  assert.match(src, /if \(r\.state === 'locked' \|\| r\.state === 'wait'\) btn\.disabled = true;/);
  assert.match(src, /result\.first \? '🥚 오늘 배웠어요!' : result\.known \? '🐣 이제 알아요!'/);
  assert.ok(!src.includes('🎉 이 개념, 이제 알아요!'), '배운 날 "이제 알아요"라고 하지 않는다');
  assert.match(src, /preview\.waiting/, '☀️ 안내');
});
