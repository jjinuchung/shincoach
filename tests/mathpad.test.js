// 🔢 숫자판(주관식) 답칸 테스트: node --test tests/mathpad.test.js
// 모든 줄기의 ① 계산 문항에서: 정답을 쳐 넣으면 맞음 · 오답 보기를 그 꼴로 쳐 넣으면 그 보기(= 그 오개념) ·
// 꼴을 묻는 문제는 꼴까지 · 약분이 덜 된 답은 안내와 함께 맞음 · 처음 칸은 정답 위치와 상관없다.
// ★ 씨앗은 PAD_SEEDS로 넓게 (기본 300 × 개념 80여 개).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { textVal, unitOf, padSpec, readTyped, matchTyped, partsOf } from '../js/mathpad.js';
import { STEMS, STEM_ORDER, applyRound, applyPlacement, conceptReport, mathReportText } from '../js/mathprog.js';
import { emptyMath } from '../js/db.js';
import { askContext, addAsk, asksText } from '../js/mathask.js';

const SEEDS = Number(process.env.PAD_SEEDS) || 300;
const OPTS = { names: ['피카츄', '리자몽', '개굴닌자'], me: '진우' };
/** 보기 글을 그 꼴의 칸에 쳐 넣은 결과 */
const typeText = (text, spec) => { const t = partsOf(text); return t && readTyped(t.mode, t.p, spec); };
const gcd = (a, b) => (b ? gcd(b, a % b) : a);

test('보기 글 → 값: 자연수·소수·음수·%·분수·대분수·비, 문장은 null', () => {
  assert.deepEqual(textVal('6'), { form: 'num', v: { n: 6, d: 1 }, pct: false });
  assert.deepEqual(textVal('0.17').v, { n: 17, d: 100 });
  assert.deepEqual(textVal('−1.5').v, { n: -3, d: 2 });
  assert.deepEqual(textVal('+3').v, { n: 3, d: 1 });
  assert.equal(textVal('69%').pct, true);
  assert.deepEqual(textVal('20/32'), { form: 'frac', v: { n: 5, d: 8 }, reduced: false });
  assert.equal(textVal('5/8').reduced, true);
  assert.deepEqual(textVal('−1/2').v, { n: -1, d: 2 });
  assert.deepEqual(textVal('2 1/6'), { form: 'mixed', v: { n: 13, d: 6 }, proper: true });
  assert.equal(textVal('0 17/4').proper, false, '자연수 부분 0');
  assert.equal(textVal('3 5/4').proper, false, '분수 부분이 1 이상');
  assert.deepEqual(textVal('24 : 1.5'), { form: 'ratio', a: { n: 24, d: 1 }, b: { n: 3, d: 2 } });
  for (const s of ['직선 ㉰', '2 + (−6)', '1, 2, 3, 6', '3/0', '', '위아래를 바꿔 썼어요']) assert.equal(textVal(s), null, s);
});

test('단위: 질문 끝 "몇 ○"에서, 목록 밖의 말은 안 적는다 · 백분율은 %', () => {
  assert.equal(unitOf('넓이는 몇 cm²일까요?'), 'cm²');
  assert.equal(unitOf('각 ㄴ의 크기는 몇 도일까요?'), '°');
  assert.equal(unitOf('얼음 동굴의 온도가 7도였는데 5도 내려갔어요. 지금 온도는 몇 도일까요?'), '도', '온도는 각도 기호가 아니다');
  assert.equal(unitOf('모두 몇 개를 가질까요?'), '개');
  assert.equal(unitOf('몇 개씩 늘어날까요?'), '개');
  assert.equal(unitOf('몇 번째일까요?'), '번째');
  assert.equal(unitOf('끈은 몇 m 필요할까요?'), 'm');
  assert.equal(unitOf('11/25을 백분율로 나타내면 얼마일까요?'), '%');
  assert.equal(unitOf('몇 판하고 몇 조각일까요? (대분수로)'), '');
  assert.equal(unitOf('얼마일까요?'), '');
});

test('친 칸 → 답 글: 덜 쳤거나 분모가 0이면 null · 앞 0과 끝 0은 다듬는다 · % 칸', () => {
  assert.equal(readTyped('num', { x: '' }), null);
  assert.equal(readTyped('num', { x: '.' }), null);
  assert.equal(readTyped('num', { x: '0.50' }).text, '0.5');
  assert.equal(readTyped('num', { x: '007' }).text, '7');
  assert.equal(readTyped('num', { x: '3.' }).text, '3');
  assert.equal(readTyped('num', { x: '5', sign: '-' }).text, '−5');
  assert.equal(readTyped('num', { x: '44' }, { unit: '%' }).text, '44%');
  assert.equal(readTyped('frac', { n: '3', d: '' }), null);
  assert.equal(readTyped('frac', { n: '3', d: '0' }), null);
  assert.equal(readTyped('frac', { n: '03', d: '4' }).text, '3/4');
  assert.equal(readTyped('mixed', { w: '2', n: '1', d: '6' }).text, '2 1/6');
  assert.equal(readTyped('ratio', { a: '8', b: '5' }).text, '8 : 5');
});

test('채점 규칙: 같은 값 · 꼴을 묻는 문제 · 약분 안내 · 오답 값 · 짐작한 답', () => {
  const Q = (qText, ok, ...wr) => ({ kind: 'calc', q: qText, choices: [{ text: ok, ok: true }, ...wr.map((t, i) => ({ text: t, tag: `이름표${i + 1}` }))] });
  // 꼴을 안 묻는 문제 — 약분이 덜 돼도 맞음, 한 줄 안내
  const q1 = Q('피카츄의 기술이 HP를 5/8만큼 깎아요. 4번 쓰면 모두 얼마나 깎을까요?', '5/2', '20/32', '9/8', '5/32');
  const s1 = padSpec(q1);
  assert.equal(s1.start, 'frac'); assert.equal(s1.need, null); assert.equal(s1.reduce, false);
  assert.deepEqual(matchTyped(q1, readTyped('frac', { n: '5', d: '2' }), s1), { i: 0, note: null });
  const r1 = matchTyped(q1, readTyped('frac', { n: '20', d: '8' }), s1);
  assert.equal(r1.i, 0); assert.match(r1.note, /약분하면 5\/2/);
  assert.equal(matchTyped(q1, readTyped('frac', { n: '20', d: '32' }), s1).i, 1, '분모에도 곱함 — 오답 보기와 같은 글');
  assert.equal(matchTyped(q1, readTyped('frac', { n: '10', d: '64' }), s1).i, 3, '5/32와 같은 값이면 그 오답');
  assert.deepEqual(matchTyped(q1, readTyped('num', { x: '7' }), s1), { i: -1, note: null, reason: 'none' }, '어느 보기도 아니면 짐작한 답');
  // 꼴을 묻는 문제 — 값이 같아도 꼴이 다르면 틀림
  const q2 = Q('0.5를 기약분수로 나타내면 얼마일까요?', '1/2', '1/3', '1', '1/20');
  const s2 = padSpec(q2);
  assert.equal(s2.need, 'frac'); assert.equal(s2.reduce, true); assert.equal(s2.start, 'frac');
  assert.match(matchTyped(q2, readTyped('num', { x: '0.5' }), s2).note, /분수로 나타내야/);
  assert.equal(matchTyped(q2, readTyped('num', { x: '0.5' }), s2).i, -1);
  const r2 = matchTyped(q2, readTyped('frac', { n: '2', d: '4' }), s2);
  assert.equal(r2.i, -1); assert.match(r2.note, /끝까지 약분/); assert.equal(r2.reason, 'reduce');
  // Codex 18차 #1: "약분해서 나타내면"도 약분·분수를 묻는 말 (생성기 frac.equal의 한 말투)
  const q2b = STEMS.fraction.gen.makeQuestion('frac.equal', 'calc', 23757, OPTS);
  assert.match(q2b.q, /약분해서 나타내면/);
  const s2b = padSpec(q2b, 'fraction');
  assert.equal(s2b.need, 'frac'); assert.equal(s2b.reduce, true);
  const okb = partsOf(q2b.choices.find((c) => c.ok).text).p;
  assert.equal(matchTyped(q2b, readTyped('frac', { n: String(okb.n * 2), d: String(okb.d * 2) }, s2b), s2b).i, -1, '약분 안 한 답은 틀림');
  const q3 = Q('피카츄가 피자를 35/8판 먹었어요. 몇 판하고 몇 조각일까요? (대분수로)', '4 3/8', '3 4/8', '5 3/8', '4 3/9');
  const s3 = padSpec(q3);
  assert.equal(s3.need, 'mixed'); assert.deepEqual(s3.modes, ['num', 'frac', 'mixed']);
  assert.equal(matchTyped(q3, readTyped('frac', { n: '35', d: '8' }), s3).i, -1, '대분수로 물었는데 가분수');
  assert.equal(matchTyped(q3, readTyped('mixed', { w: '4', n: '3', d: '8' }), s3).i, 0);
  assert.equal(matchTyped(q3, readTyped('frac', { n: '35', d: '8' }), s3).reason, 'form', '꼴만 틀림 — 짐작이 아니다');
  // Codex 18차 #2: 대분수 칸을 골랐다고 끝이 아니다 — 0 35/8 · 3 11/8은 값은 같아도 대분수가 아니다
  for (const p of [{ w: '0', n: '35', d: '8' }, { w: '3', n: '11', d: '8' }]) {
    const r = matchTyped(q3, readTyped('mixed', p, s3), s3);
    assert.equal(r.i, -1, `${p.w} ${p.n}/${p.d}`); assert.equal(r.reason, 'form'); assert.match(r.note, /1보다 작아야/);
  }
  // 백분율 — % 칸, 0.44%는 그 오답
  const q4 = Q('11/25을 백분율로 나타내면 얼마일까요?', '44%', '49%', '0.44%', '11%');
  const s4 = padSpec(q4);
  assert.equal(s4.unit, '%'); assert.equal(s4.need, 'num');
  assert.equal(matchTyped(q4, readTyped('num', { x: '44' }, s4), s4).i, 0);
  assert.equal(matchTyped(q4, readTyped('num', { x: '0.44' }, s4), s4).i, 2);
  // 비 — 값이 같아도 다른 비는 다른 답 (2 : 4 ≠ 1 : 2)
  const q5 = Q('1/4 : 3/5을 간단한 자연수의 비로 나타내면?', '5 : 12', '1 : 3', '4 : 5');
  const s5 = padSpec(q5);
  assert.deepEqual(s5.modes, ['ratio']);
  assert.equal(matchTyped(q5, readTyped('ratio', { a: '10', b: '24' }), s5).i, -1);
  // 문장 보기·② 문항은 숫자판 아님
  assert.equal(padSpec({ kind: 'calc', q: '', choices: [{ text: '직선 ㉰', ok: true }, { text: '직선 ㉮' }] }), null);
  assert.equal(padSpec({ kind: 'misread', q: '', choices: [{ text: '6', ok: true }] }), null);
});

test('★ 모든 줄기의 ① 계산: 정답을 치면 맞음 · 오답을 치면 그 오개념 · 꼴을 묻는 문제 · 약분 · 짐작 · 처음 칸은 정답과 상관없다', () => {
  const count = {}; const need = {}; let wrongTyped = 0; let reducedChecks = 0; let formChecks = 0;
  for (const k of STEM_ORDER) {
    const S = STEMS[k];
    for (const c of S.list) {
      for (let s = 1; s <= SEEDS; s++) {
        const q = S.gen.makeQuestion(c.id, 'calc', s * 7919, OPTS);
        const okI = q.choices.findIndex((x) => x.ok);
        const okV = textVal(q.choices[okI].text);
        const spec = padSpec(q, k);
        const where = `${S.code} ${c.id} seed ${s}: ${String(q.q).replace(/\n/g, ' ').slice(0, 90)} | ${q.choices.map((x) => x.text + (x.ok ? '✔' : '')).join(' / ')}`;
        if (!okV) { assert.equal(spec, null, where); continue; }
        assert.ok(spec, `${where}: 수가 답인데 숫자판이 없다`);
        count[S.code] = (count[S.code] || 0) + 1;
        assert.ok(spec.modes.includes(spec.start), `${where}: 처음 칸 ${spec.start}`);
        if (spec.need) { assert.equal(spec.start, spec.need, where); need[`${S.code} ${spec.need}`] = (need[`${S.code} ${spec.need}`] || 0) + 1; }
        if (k === 'negative') assert.ok(spec.signed, where);
        // 정답을 그 꼴로 친다
        const tOk = partsOf(q.choices[okI].text);
        assert.ok(spec.modes.includes(tOk.mode), `${where}: 정답 꼴(${tOk.mode})의 칸이 없다`);
        assert.deepEqual(matchTyped(q, readTyped(tOk.mode, tOk.p, spec), spec), { i: okI, note: null }, `${where}: 정답을 쳤는데`);
        // 오답 보기를 그 꼴로 친다 — 그 보기(= 그 오개념)가 된다
        q.choices.forEach((w, i) => {
          if (w.ok || !textVal(w.text)) return;
          const t = partsOf(w.text);
          assert.ok(spec.modes.includes(t.mode), `${where}: 오답 "${w.text}"의 꼴(${t.mode})을 칠 칸이 없다 — 이 오개념을 못 적는다`);
          const typed = readTyped(t.mode, t.p, spec);
          assert.ok(typed, `${where}: 오답 "${w.text}"을 칠 수 없다`);
          assert.equal(matchTyped(q, typed, spec).i, i, `${where}: 오답 "${w.text}"을 쳤는데 다른 보기가 됐다`);
          wrongTyped++;
        });
        // 어느 보기도 아닌 수 — 짐작한 답
        if (okV.form !== 'ratio') assert.deepEqual(matchTyped(q, readTyped('num', { x: '98765' }, spec), spec), { i: -1, note: null, reason: 'none' }, where);
        // 꼴을 묻는 말은 문제 글에서 따로 읽어 대조 — padSpec을 믿고 넘어가면 못 알아본 말투("약분해서")를 못 잡는다 (Codex 18차 #1)
        const qt = String(q.q);
        if (/약분|기약분수|가장 간단한 분수/.test(qt)) { assert.equal(spec.need, 'frac', `${where}: 약분을 묻는데 need`); assert.equal(spec.reduce, true, `${where}: 약분을 묻는데 reduce`); }
        if (/대분수로/.test(qt)) assert.equal(spec.need, 'mixed', where);
        if (/가분수로/.test(qt)) assert.equal(spec.need, 'frac', where);
        if (/소수로 나타내|답은 소수로/.test(qt)) assert.equal(spec.need, 'num', where);
        // 분수 답에 "조각" 단위 — "몇 조각?"을 묻고 17/4를 답으로 받던 문장 (Codex 18차 #3)
        assert.ok(!(okV.form !== 'num' && spec.unit === '조각'), `${where}: 분수 답인데 단위가 조각`);
        // 약분이 덜 된 정답 — 꼴을 묻지 않으면 맞음 + 안내, 약분을 묻는 문제면 틀림
        if (okV.form === 'frac' && okV.v.d !== 1 && +tOk.p.n < 500) {
          const tw = { ...tOk.p, n: String(+tOk.p.n * 2), d: String(+tOk.p.d * 2) }; // 정답 글의 수를 두 배로 (6/8 → 12/16)
          const r = matchTyped(q, readTyped('frac', tw, spec), spec);
          if (spec.reduce) { assert.equal(r.i, -1, where); assert.match(r.note, /약분/, where); }
          else { assert.equal(r.i, okI, where); assert.match(r.note, /약분하면/, where); }
          reducedChecks++;
        }
        // 꼴을 묻는 문제 — 같은 값을 다른 꼴로 치면 틀림 + 어느 꼴인지 안내
        if (spec.need && spec.need !== 'ratio') {
          const v = okV.v; let alt = null;
          if (spec.need !== 'num' && v.d !== 1 && [2, 4, 5, 8, 10, 20, 25, 50, 100].includes(v.d)) alt = { mode: 'num', p: { sign: v.n < 0 ? '-' : '', x: String(Math.abs(v.n) / v.d) } };
          else if (spec.need === 'mixed') alt = { mode: 'frac', p: { n: String(v.n), d: String(v.d) } };
          else if (spec.need === 'num' && v.d !== 1 && gcd(Math.abs(v.n), v.d) === 1 && !textVal(q.choices[okI].text).pct) alt = { mode: 'frac', p: { sign: v.n < 0 ? '-' : '', n: String(Math.abs(v.n)), d: String(v.d) } };
          if (alt && spec.modes.includes(alt.mode)) {
            const r = matchTyped(q, readTyped(alt.mode, alt.p, spec), spec);
            assert.equal(r.i, -1, `${where}: 꼴을 물었는데 ${alt.mode}로 쳐도 맞음`); assert.match(r.note, /나타내야/, where);
            formChecks++;
          }
        }
        // 처음 칸은 정답이 어느 보기인지와 상관없다 — 정답 표시를 다른 수 보기로 옮겨도 같다
        const other = q.choices.findIndex((x, i) => i !== okI && textVal(x.text) && textVal(x.text).form !== 'ratio');
        if (!spec.need && other >= 0) {
          const moved = { ...q, choices: q.choices.map((x, i) => ({ ...x, ok: i === other })) };
          assert.equal(padSpec(moved, k).start, spec.start, `${where}: 처음 칸이 정답을 흘린다`);
        }
      }
    }
  }
  for (const code of ['A', 'B', 'C', 'E', 'F', 'G', 'H', 'I', 'J']) assert.ok((count[code] || 0) >= 100, `${code} 줄기 숫자판 문항 ${count[code] || 0}`);
  for (const key of ['A mixed', 'A frac', 'C num', 'C frac', 'F num', 'F frac']) assert.ok((need[key] || 0) >= 20, `꼴을 묻는 문제 ${key}: ${need[key] || 0}`);
  assert.ok(wrongTyped > 20000 && reducedChecks > 1000 && formChecks > 200, `오답 ${wrongTyped} · 약분 ${reducedChecks} · 꼴 ${formChecks}`);
});

test('기록: 직접 쓴 답(✍)·짐작한 값이 일지 · 📊 개념 표 · 📋 복사문 · ❓ 복사문에 — 덧붙인 보기는 ❓ 보기 목록에서 빠진다', () => {
  const m = emptyMath();
  const T = '2026-10-01';
  applyRound(m, 'frac.mul', { correct: 1, total: 2, missTags: [], qs: [{ k: 'calc', ok: 1, p: 1 }, { k: 'misread', ok: 0, tag: '틀린 줄 모름' }] }, T);
  applyRound(m, 'frac.mul', { correct: 0, total: 2, missTags: [], qs: [{ k: 'calc', ok: 0, p: 1, g: '7/12' }, { k: 'misread', ok: 1 }] }, T);
  const last = m.log[m.log.length - 1].qs[0];
  assert.deepEqual(last, { k: 'calc', ok: 0, p: 1, g: '7/12' });
  const row = conceptReport(m).find((r) => r.id === 'frac.mul');
  assert.deepEqual(row.pad, [1, 2]);
  assert.deepEqual(row.guesses, ['7/12']);
  const text = mathReportText(m, T);
  assert.match(text, /✍️ 직접 쓴 답 1\/2 \(짐작: 7\/12\)/);
  assert.match(text, /①✍✘«7\/12»/);
  // ❓ — 화면이 덧붙인 "짐작한 답" 보기는 보기 목록에 안 나오고, 진우 답에 "직접 씀"
  const q = { concept: 'frac.mul', kind: 'calc', key: 'calc:x', q: '2/3 × 3/4', expr: '', choices: [{ text: '1/2', ok: true }, { text: '6/7', tag: '더함' }, { text: '7/12', ok: false, guess: true }], solve: { steps: [], rule: '' } };
  const ctx = askContext(q, { chosen: '7/12', p: 1, w: 'u' });
  assert.deepEqual(ctx.choices, ['1/2', '6/7']);
  assert.equal(ctx.pad, 1);
  addAsk(m, ctx, T, '');
  assert.match(asksText(m, T), /진우 답: 7\/12 \(✍️ 직접 씀\) ❌/);
});

test('기록 (Codex 18차 #4·#5·#6): 꼴·약분만 틀린 답은 짐작이 아니다 · 진단의 🤷도 "몰랐음"으로 · 최근 짐작 셋은 시간 순', () => {
  const T = '2026-10-01';
  // #5 진단 — 모르겠어요(w: 'u')와 꼴(pf)이 일반 편처럼 남는다
  const md = emptyMath();
  applyPlacement(md, [{ concept: 'frac.mean', correct: false, p: 1, w: 'u' }, { concept: 'frac.same', correct: false, p: 1, pf: 'form' }, { concept: 'frac.mixed', correct: false, p: 1, g: '98765' }], T, 'fraction', []);
  assert.deepEqual(md.log[md.log.length - 1].qs, [
    { k: 'calc', ok: 0, w: 'u', p: 1, c: 'frac.mean' },
    { k: 'calc', ok: 0, p: 1, pf: 'form', c: 'frac.same' },
    { k: 'calc', ok: 0, p: 1, g: '98765', c: 'frac.mixed' },
  ]);
  // #4 꼴만 틀림 — g 없이 pf, 📋에 ‹꼴이 다름›
  const m = emptyMath();
  applyRound(m, 'frac.mixed', { correct: 0, total: 1, missTags: [], qs: [{ k: 'calc', ok: 0, p: 1, pf: 'form' }] }, T);
  assert.deepEqual(m.log[m.log.length - 1].qs[0], { k: 'calc', ok: 0, p: 1, pf: 'form' });
  assert.deepEqual(conceptReport(m).find((r) => r.id === 'frac.mixed').guesses, []);
  assert.match(mathReportText(m, T), /①✍✘‹꼴이 다름›/);
  // #6 최근 짐작 셋 — 개념 편과 🤔 노트가 섞여도 시간 순 (1 편 · 2 노트 · 3 · 4 · 5 편 → 3, 4, 5)
  const mg = emptyMath();
  const put = (g, notes) => {
    applyRound(mg, 'frac.mul', { correct: 0, total: 1, missTags: [], qs: [{ k: 'calc', ok: 0, p: 1, g }] }, T);
    if (notes) { const e = mg.log[mg.log.length - 1]; e.id = 'notes'; e.qs = e.qs.map((q) => ({ ...q, c: 'frac.mul' })); }
  };
  put('1'); put('2', true); put('3'); put('4'); put('5');
  assert.deepEqual(conceptReport(mg).find((r) => r.id === 'frac.mul').guesses, ['3', '4', '5']);
});
