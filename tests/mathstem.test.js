// 🔢 줄기 객체(STEMS)·만지는 부품의 순수 부분·🚶 끌어 보기 확인: node --test tests/mathstem.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { STEMS, STEM_ORDER, stemOf, nameOf, ladderOf, dueIds, nowId, applyPlacement, needsPlacement, mathSummary, gradeLabel } from '../js/mathprog.js';
import { emptyMath } from '../js/db.js';
import { lineGeom, walkRange, compareLineSvg, lineSvg } from '../js/mathdraw.js';
import { lessonOf, checkContent } from '../js/mathneg.js';

const content = JSON.parse(readFileSync(new URL('../coach/math/negative.json', import.meta.url), 'utf8'));
const T = '2026-09-21';

test('STEMS: 분수·음수 두 줄기, 개념 id 접두사로 줄기를 찾는다, 이름은 어느 줄기든', () => {
  assert.deepEqual(STEM_ORDER, ['fraction', 'negative']);
  for (const key of STEM_ORDER) {
    const s = STEMS[key];
    assert.equal(s.key, key);
    for (const fn of ['makeQuestion', 'makeRound', 'diagnosticSet', 'placeFrom', 'ladder']) assert.equal(typeof s.gen[fn], 'function', `${key}.gen.${fn}`);
    assert.ok(s.list.length >= 9 && s.file && s.code && s.label && s.intro);
  }
  assert.equal(STEMS.fraction.lesson, false);
  assert.equal(STEMS.negative.lesson, true, '음수는 처음 배우는 줄기 — 📚 배움');
  assert.equal(typeof STEMS.negative.gen.lessonOf, 'function');
  assert.equal(stemOf('neg.add').key, 'negative');
  assert.equal(stemOf('frac.add').key, 'fraction');
  assert.equal(stemOf('없는.것'), null);
  assert.equal(nameOf('neg.sub'), '음수가 있는 뺄셈');
  assert.equal(nameOf('frac.mean'), '분수가 무엇인가');
  assert.equal(gradeLabel(7), '중1');
});

test('줄기별 사다리·진단: 음수 줄기의 진단은 음수 사다리에, 분수 진도는 그대로', () => {
  const m = emptyMath();
  assert.equal(needsPlacement(m, 'negative'), true);
  applyPlacement(m, [{ concept: 'neg.mean', correct: true }, { concept: 'neg.add', correct: true }, { concept: 'neg.addsub', correct: false }], T, 'negative', []);
  assert.equal(needsPlacement(m, 'negative'), false);
  assert.equal(needsPlacement(m, 'fraction'), true, '분수 진단은 따로');
  const rows = ladderOf(m, T, 'negative');
  assert.deepEqual(rows.slice(0, 5).map((r) => r.state), ['done', 'done', 'done', 'done', 'now'], '틀린 가장 앞 개념(addsub)에서 시작');
  assert.equal(nowId(m, 'negative'), 'neg.addsub');
  assert.equal(nowId(m, 'fraction'), 'frac.mean', '분수 사다리는 아직 처음');
  assert.equal(ladderOf(m, T, 'fraction').filter((r) => r.state === 'done').length, 0);
  assert.deepEqual(dueIds(m, '2026-09-30', 'negative'), ['neg.mean', 'neg.line', 'neg.add', 'neg.sub']);
  const s = mathSummary(m);
  assert.deepEqual(s.stems.map((x) => [x.key, x.done, x.started]), [['fraction', 0, false], ['negative', 4, true]]);
  assert.equal(s.done, 4);
});

test('수직선 자(lineGeom): 값 ↔ 좌표가 서로 돌아오고, 범위 밖은 끝에 붙는다', () => {
  const g = lineGeom(-4, 6);
  for (let v = -4; v <= 6; v++) assert.equal(g.valueAt(g.pos(v)), v);
  assert.equal(g.valueAt(g.pos(2) + g.tick * 0.49), 2, '반 칸 못 미치면 제자리');
  assert.equal(g.valueAt(g.pos(2) + g.tick * 0.51), 3, '반 칸 넘으면 다음 눈금');
  assert.equal(g.valueAt(-1000), -4);
  assert.equal(g.valueAt(1000), 6);
  assert.equal(g.W, g.pad * 2 + 10 * g.tick);
});

test('끌어 보기 범위(walkRange): 출발·도착·0을 품고 양쪽 두 칸 여유 — 답이 끝에 붙지 않는다, ±9 안', () => {
  assert.deepEqual(walkRange(3, -2), [-4, 5]);
  assert.deepEqual(walkRange(2, 6), [-2, 8]);
  assert.deepEqual(walkRange(-3, 5), [-5, 7]);
  const [lo, hi] = walkRange(0, 8);
  assert.ok(lo <= -2 && hi >= 8 && hi <= 9);
  const [lo2, hi2] = walkRange(-8, -9);
  assert.ok(lo2 >= -9 && lo2 <= -9 && hi2 >= 0);
});

test('풀이 카드의 두 점 수직선(compareLineSvg): 내 답·정답 이름표, 정수가 아니거나 너무 넓으면 안 그린다', () => {
  const svg = compareLineSvg(-2, 8);
  assert.ok(svg.startsWith('<svg') && svg.includes('내 답') && svg.includes('정답'));
  assert.ok(/aria-label="[^"]*내 답 -2[^"]*정답 8/.test(svg));
  assert.equal(compareLineSvg(0.5, 1), '');
  assert.equal(compareLineSvg(-40, 40), '', '너무 넓으면 안 그린다');
  assert.ok(compareLineSvg(3, 3).includes('내 답'), '같은 자리여도 둘 다 그린다(이름표만 비킨다)');
  // marks 없는 lineSvg는 예전 그대로 (분수·검수 페이지가 쓴다)
  assert.ok(lineSvg(-3, 3, { dots: [-1] }).includes('height="44"'));
});

test('🚶 끌어 보기 확인: 원고의 walk가 lessonOf로 나오고, checkContent가 출발+이동 ≠ 정답을 잡는다', () => {
  const opts = { content, names: ['피카츄'], worlds: { pokemon: [] } };
  const L = lessonOf('neg.add', 1, opts);
  const walks = L.pages.filter((p) => p.check && p.check.walk);
  assert.ok(walks.length >= 2, `neg.add 배움에 끌어 보기 ${walks.length}개`);
  assert.deepEqual(walks[0].check.walk, [1, -4]);
  assert.equal(walks[0].check.ok, '−3');
  const total = ['neg.line', 'neg.add', 'neg.sub'].reduce((a, id) => a + content[id].lesson.filter((p) => p.check && p.check.walk).length, 0);
  assert.equal(total, 5);
  assert.deepEqual(checkContent(content), []);
  const bad = JSON.parse(JSON.stringify(content));
  bad['neg.add'].lesson[0].check.walk = [1, -5]; // 1 + (−5) = −4 ≠ −3
  assert.ok(checkContent(bad).some((m) => /neg\.add\.lesson\[0\]\.check\.walk.*정답은 "−3"/.test(m)), checkContent(bad).join('\n'));
  bad['neg.add'].lesson[0].check.walk = [1];
  assert.ok(checkContent(bad).some((m) => /walk: \[출발, 이동\]/.test(m)));
  bad['neg.add'].lesson[0].check.walk = [8, 5];
  assert.ok(checkContent(bad).some((m) => /±9/.test(m)));
});

test('🎯 감 잡기(sn)·🫣 틀린 이유(w): 일지에 남고, "실수"는 오개념·오답 노트에 안 쌓인다 (③, 2026-09-21)', async () => {
  const { applyRound, applyNotesRound, conceptReport, mathReportText, nextNote } = await import('../js/mathprog.js');
  const m = emptyMath();
  applyRound(m, 'neg.add', { correct: 2, total: 4, missTags: ['부호를 무시하고 더함'], mode: 'learn', qs: [
    { k: 'calc', ok: 0, tag: '부호를 무시하고 더함', key: 'K1', sn: 1, w: 'c' },   // 헷갈림 → 오개념·노트
    { k: 'misread', ok: 0, tag: '오개념을 못 짚음', key: 'misread:ignore', w: 's' }, // 실수 → 정답률만
    { k: 'why', ok: 1, key: 'W1', sn: 0 },
    { k: 'calc', ok: 1, sn: 1 },
  ] }, T);
  const rec = m.concepts['neg.add'];
  assert.deepEqual(rec.miss, { '부호를 무시하고 더함': 1 }, '실수의 이름표는 안 쌓인다');
  assert.deepEqual(rec.notes.map((n) => n.key), ['K1'], '실수는 노트에 안 남는다');
  assert.deepEqual(rec.kinds.misread, [0, 1], '정답률에는 남는다');
  const qs = m.log[0].qs;
  assert.deepEqual(qs.map((q) => [q.sn, q.w]), [[1, 'c'], [undefined, 's'], [0, undefined], [1, undefined]]);
  const rep = conceptReport(m).find((r) => r.id === 'neg.add');
  assert.deepEqual(rep.sense, [2, 3]);
  assert.deepEqual(rep.why, { s: 1, c: 1, u: 0 });
  const text = mathReportText(m, T);
  assert.ok(/감 잡기 2\/3/.test(text) && /실수 1·헷갈림 1/.test(text) && /감○/.test(text) && /\{실수\}/.test(text), text);
  // 노트 회차에서도 실수는 again·오개념을 안 올린다
  applyNotesRound(m, [{ id: 'neg.add', key: 'K1', k: 'calc', ok: 0, tag: '부호를 무시하고 더함', w: 's' }], '2026-09-23');
  assert.equal(rec.notes[0].again || 0, 0);
  assert.equal(rec.miss['부호를 무시하고 더함'], 1);
  assert.equal(nextNote(m, 'neg.add').key, 'K1', '노트는 그대로 남는다');
});
