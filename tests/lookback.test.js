// 📖 v248 풀이 돌아보기 (2026-10-13, 아버님 "이대로 진행" — 노가다 탈출구 막기 2단계)
// 1. 틀린 문제의 풀이는 첫 줄만 보이고 "▶ 다음 줄"로 한 줄씩 — 다 열어야 다음 (🎯·개념 편 ①②③⭐💎)
// 2. 고를 수 있는 문제는 먼저 🔍 내 답은 왜 틀렸을까 — 내 까닭 + 다른 틀린 보기의 까닭 둘 (문장이 모자라면 고르기 없음)
// 3. 연 줄·고른 것은 이 답의 기록에 (🎒에 다녀와도 그대로) · 점수·보상·노트는 그대로 · 🙈 이유 고르기는 그다음
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { splitLines, reviewQuiz, conceptQuiz, chalQuiz } from '../js/lookback.js';
import { setOf, checkPart } from '../js/mathchal.js';
import { STEMS } from '../js/mathprog.js';
import { KIND_IDS as SP_KIND_IDS, makeSpecial } from '../js/mathspecial.js';

const read = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const DATA = JSON.parse(read('coach/math/challenge.json'));
const OPTS = { names: ['피카츄', '리자몽', '개굴닌자'], me: '아이', worlds: { pokemon: [], toystory: [], minions: [], moana: [] } };

test('📖 splitLines: 문장 끝(. ! ?)과 줄바꿈에서 · 소수·닫는 따옴표·**굵게** 안은 안 나눔 · 번호만 남는 조각은 다음 문장에', () => {
  assert.deepEqual(splitLines('분모는 그대로예요. 분자만 더해요! 왜일까요?'), ['분모는 그대로예요.', '분자만 더해요!', '왜일까요?']);
  assert.deepEqual(splitLines('0.6과 0.60은 같아요. 끝'), ['0.6과 0.60은 같아요.', '끝'], '소수점은 문장 끝이 아니다');
  assert.deepEqual(splitLines('"맞아요." 그래서 끝.'), ['"맞아요." 그래서 끝.'], '닫는 따옴표 앞 마침표에서는 안 나눈다');
  assert.deepEqual(splitLines('**조각. 크기**가 달라요. 다음'), ['**조각. 크기**가 달라요.', '다음'], '굵게 안에서 나누면 별표가 글자로 보인다');
  assert.deepEqual(splitLines('1. 첫째. 2) 둘째'), ['1. 첫째.', '2) 둘째']);
  assert.deepEqual(splitLines('윗줄\n아랫줄'), ['윗줄', '아랫줄']);
  assert.deepEqual(splitLines(''), []);
  assert.deepEqual(splitLines(null), []);
  assert.deepEqual(splitLines('전체는 8조각이니까 분모는 8.'), ['전체는 8조각이니까 분모는 8.'], '끝 마침표 하나는 한 줄');
});

test('🔍 reviewQuiz: 내 까닭 + 다른 까닭 둘 · 같은 글은 하나 · 둘보다 적으면 없음 · 같은 씨앗 같은 차례 · 정답 자리가 고르게', () => {
  assert.equal(reviewQuiz('', ['a', 'b']), null);
  assert.equal(reviewQuiz('m', ['a']), null);
  assert.equal(reviewQuiz('m', ['a', 'a', 'm', ' m ', '']), null, '내 글과 같은 글·빈 글·겹친 글은 세지 않는다');
  const q = reviewQuiz('m', ['a', 'b', 'c', 'd'], 42);
  assert.equal(q.opts.length, 3);
  assert.equal(q.opts[q.ok], 'm');
  assert.equal(new Set(q.opts).size, 3);
  assert.deepEqual(reviewQuiz('m', ['a', 'b', 'c', 'd'], 42), q, '🎒에 다녀와 다시 그려도 같은 차례');
  const cnt = [0, 0, 0];
  for (let s = 0; s < 1500; s++) cnt[reviewQuiz('m', ['a', 'b', 'c'], s * 7919 + 31).ok] += 1;
  for (const n of cnt) assert.ok(n > 400 && n < 600, `정답 자리 0/1/2 = ${cnt.join('/')}`);
  const other = new Set();
  for (let s = 0; s < 200; s++) for (const o of reviewQuiz('m', ['a', 'b', 'c', 'd'], s).opts) other.add(o);
  assert.deepEqual([...other].sort(), ['a', 'b', 'c', 'd', 'm'], '다른 까닭이 많으면 씨앗마다 둘을 고른다');
});

test('🔍 conceptQuiz: 사람이 켠 풀이(solve.quiz)만 · 고른 보기의 오개념 까닭 + 화면의 다른 틀린 보기 까닭 · 맞힘·모르겠어요·이름표 없음·까닭 없음은 고르기 없음', () => {
  const q = {
    solve: { quiz: true, why: { A: '분모끼리 더했어요.', B: '곱했어요.', C: '한쪽만 썼어요.', D: '' }, whyAny: '아무 까닭', steps: [] },
    choices: [{ text: '7/9', ok: true }, { text: '7/18', tag: 'A' }, { text: '10/81', tag: 'B' }, { text: '2/9', tag: 'C' }],
  };
  assert.equal(conceptQuiz({ ...q, solve: { ...q.solve, quiz: undefined } }, q.choices[1], 3), null, '★ 켜지 않은 풀이는 고르기 없음 (Codex 60차 #1)');
  assert.equal(conceptQuiz({ ...q, solve: { ...q.solve, quiz: 'yes' } }, q.choices[1], 3), null, 'true만 켠 것');
  const z = conceptQuiz(q, q.choices[1], 3);
  assert.equal(z.opts[z.ok], '분모끼리 더했어요.');
  assert.deepEqual([...z.opts].sort(), ['곱했어요.', '분모끼리 더했어요.', '한쪽만 썼어요.'].sort());
  assert.equal(conceptQuiz(q, q.choices[0], 3), null, '맞힌 답');
  assert.equal(conceptQuiz(q, { text: '모르겠어요', ok: false, idk: true }, 3), null, '모르겠어요');
  assert.equal(conceptQuiz(q, { text: '5/9', ok: false, guess: true }, 3), null, '짐작한 답(이름표 없음)');
  assert.equal(conceptQuiz({ ...q, choices: [...q.choices, { text: '0', tag: 'D' }] }, { text: '0', tag: 'D' }, 3), null, '까닭 글이 빈 이름표');
  const two = { ...q, choices: q.choices.slice(0, 3) };
  assert.equal(conceptQuiz(two, two.choices[1], 3), null, '다른 까닭이 하나뿐이면 억지로 셋을 안 만든다');
  // 🔢 숫자판에 친 값이 화면에서 빠진 오개념 후보면 이름표를 단 새 보기(typedTag) — 다른 까닭은 화면의 보기에서
  const typed = { text: '9/9', ok: false, tag: 'E', typedTag: true };
  const q2 = { ...q, solve: { ...q.solve, why: { ...q.solve.why, E: '분자를 곱했어요.' } }, choices: [...q.choices, typed] };
  const z2 = conceptQuiz(q2, { ...typed }, 1);
  assert.equal(z2.opts[z2.ok], '분자를 곱했어요.', '복사본(숫자판 내 답)도 이름표로 찾는다');
});

test('🔍 conceptQuiz: 실제 줄기·💎 문항 — ★ 지금은 켠 틀이 없어 고르기가 안 나온다 (생성기 까닭 263가지 중 105가지가 다른 틀린 답에도 맞았다) · 켜면 고른 것 = 내 까닭', () => {
  let off = 0; let made = 0;
  const kinds = new Set();
  const look = (q, seed, id) => {
    for (const ch of (q.choices || []).filter((x) => !x.ok)) {
      assert.equal(conceptQuiz(q, ch, seed), null, `${id} 켜지 않은 문항에 고르기`);
      off += 1;
      // 켜면 어떻게 나오나 — 구조 검사(누가 나중에 켤 때를 위해)
      const z = q.solve && q.solve.why ? conceptQuiz({ ...q, solve: { ...q.solve, quiz: true } }, ch, seed) : null;
      if (!z) continue;
      made += 1;
      kinds.add(q.kind);
      assert.equal(z.opts[z.ok], q.solve.why[ch.tag], `${id} 고른 것 = 내 까닭`);
      assert.equal(new Set(z.opts).size, 3);
      const pool = new Set(q.choices.filter((x) => !x.ok && x.tag && q.solve.why[x.tag]).map((x) => q.solve.why[x.tag]));
      for (const o of z.opts) assert.ok(pool.has(o), `${id} 보기는 화면의 틀린 보기 까닭에서만`);
    }
  };
  for (const st of Object.values(STEMS)) {
    let content = {};
    try { content = JSON.parse(read(st.file.replace('./', ''))); } catch { /* 줄기 원고 없음 */ }
    for (const c of st.list) {
      for (const seed of [7919, 15838]) {
        let qs = [];
        try { qs = st.gen.makeRound(c.id, seed, { ...OPTS, content }); } catch { continue; }
        for (const q of qs) look(q, seed, c.id);
      }
    }
  }
  for (const id of SP_KIND_IDS) for (let t = 1; t <= 4; t++) { const q = makeSpecial(id, t * 7919, { cast: [] }); if (q) look(q, t, `💎 ${id}`); }
  assert.ok(off > 1000, `틀린 보기 ${off}개`);
  assert.ok(made > 300 && kinds.has('calc') && kinds.has('findok'), `켜면 ${made}개`);
});

const U6 = setOf(DATA, 'u6');
const item = (set, no) => set.items.find((x) => x.no === no);
const wrongCands = (p) => ((p.input || 'num') === 'choice' ? p.choices.filter((c) => c !== p.answer) : (p.input || 'num') === 'num' ? Object.keys(p.numNotes || {}) : []);

test('🔍 chalQuiz (🎯): 사람이 켠 칸(quiz)만 — 확인한 6칸 · u6-13·u6-20은 까닭이 겹쳐 끔 · 숫자판의 흔한 틀린 수 · 여러 개 고르기·맞힌 칸·까닭 없는 수는 없음 · 칸이 둘이면 켠 칸', () => {
  const on = DATA.sets.flatMap((s) => s.items.flatMap((it) => it.parts.map((p, i) => (p.quiz === true ? `${s.id}-${it.no}:${i}` : null)).filter(Boolean)));
  assert.deepEqual(on, ['u5-11:0', 'u5b-19:0', 'u5b-20:1', 'u6-12:0', 'u6-15:0', 'u6-16:0'], '켠 칸이 바뀌면 셋 중 정답이 하나뿐인지 사람이 다시 읽는다');
  const i13 = item(U6, 13);
  assert.equal(chalQuiz(i13, ['소영', '5개의 변의 길이가 같은 다각형은 정육각형이야.'], 5), null, '★ u6-13: "변과 각이 둘 다 같아야"도 내 답에 맞는 까닭이라 끔 (Codex 60차)');
  const i20 = item(U6, 20);
  for (const g of i20.parts[0].choices.filter((c) => c !== i20.parts[0].answer)) assert.equal(chalQuiz(i20, [g], 5), null, `★ u6-20 ${g.slice(0, 2)}: 직사각형도 평행사변형이라 까닭이 겹쳐 끔`);
  const z = chalQuiz({ ...i13, parts: i13.parts.map((p) => ({ ...p, quiz: true })) }, ['소영', '5개의 변의 길이가 같은 다각형은 정육각형이야.'], 5);
  assert.equal(z.part, 1, '(켜면) 첫 칸(까닭 둘뿐)은 건너뛰고 둘째 칸');
  assert.equal(z.opts[z.ok], i13.parts[1].notes['5개의 변의 길이가 같은 다각형은 정육각형이야.']);
  assert.equal(z.label, '바르게 고친 말');
  // (켜도) 여러 개 고르기는 고르기 없음 · ㉠~㉣ 모두 설명하는 칸에서 정답 보기의 까닭은 "틀린 까닭" 보기가 아니다
  const on18 = { ...item(U6, 18), parts: item(U6, 18).parts.map((p) => ({ ...p, quiz: true })) };
  assert.equal(chalQuiz(on18, [['나']], 3), null, '여러 개 고르기는 까닭이 하나로 안 정해진다');
  const on20 = { ...i20, parts: i20.parts.map((p) => ({ ...p, quiz: true })) };
  for (const g of i20.parts[0].choices.filter((c) => c !== i20.parts[0].answer)) {
    const z20 = chalQuiz(on20, [g], 5);
    assert.ok(z20 && !z20.opts.includes(i20.parts[0].notes[i20.parts[0].answer]), `(켜면) ${g.slice(0, 2)} 보기에 정답 까닭 없음`);
  }
  const i16 = item(U6, 16);
  const z16 = chalQuiz(i16, ['세 각의 크기가 모두 같아서'], 5);
  assert.equal(z16.opts[z16.ok], i16.parts[0].notes['세 각의 크기가 모두 같아서']);
  assert.equal(chalQuiz(i16, [i16.parts[0].answer], 5), null, '다 맞힘');
  const i15 = item(U6, 15);
  const z15 = chalQuiz(i15, ['40'], 9);
  assert.equal(z15.num, true);
  assert.equal(z15.key, '40');
  assert.equal(z15.opts[z15.ok], i15.parts[0].numNotes['40']);
  assert.equal(chalQuiz(i15, ['777'], 9), null, '까닭이 없는 수');
  assert.equal(chalQuiz(item(U6, 18), [['나']], 3), null, '여러 개 고르기는 까닭이 하나로 안 정해진다 (나는 잘못 고른 보기 · 가·다는 빠뜨림)');
  assert.equal(chalQuiz(item(U6, 18), [['가', '나', '다']], 3), null);
  assert.equal(chalQuiz(item(setOf(DATA, 'u3'), 2), ['아무거나'], 3), null, '까닭이 없는 옛 문제');
});

test('🔍 chalQuiz: 모든 문제·모든 틀린 답 — 고른 것 = 내 까닭 · 정답 보기의 까닭(㉠~㉣ 모두 설명)은 보기에 없다 · 셋 다 다르다', () => {
  let n = 0;
  for (const set of DATA.sets) {
    for (const it of set.items) {
      it.parts.forEach((p, i) => {
        for (const g of wrongCands(p)) {
          const given = it.parts.map((pp, k) => (k === i ? g : pp.answer));
          const z = chalQuiz(it, given, it.no);
          if (!z) continue;
          n += 1;
          assert.equal(z.part, i);
          assert.equal(p.quiz, true, `${set.id}-${it.no} 켠 칸만`);
          const mine = (p.input || 'num') === 'num' ? p.numNotes[g] : p.notes[g];
          assert.equal(z.opts[z.ok], mine, `${set.id}-${it.no} ${g}`);
          assert.equal(new Set(z.opts).size, 3);
          if (p.notes && p.notes[p.answer]) assert.ok(!z.opts.includes(p.notes[p.answer]), `${set.id}-${it.no} 정답 보기의 까닭은 "틀린 까닭" 보기가 아니다`);
          assert.ok(!checkPart(p, g));
        }
      });
    }
  }
  assert.ok(n >= 20, `고르기 ${n}개`);
});

test('📖 화면: 🎯 틀린 답은 🔍(있으면) → 💡·풀이 문장·보기 까닭을 한 줄씩 → 다 열어야 다음 · 고른 까닭은 보기 까닭 줄에서 뺀다', () => {
  const math = read('js/math.js');
  assert.ok(math.includes("import { splitLines, conceptQuiz, chalQuiz } from './lookback.js';"));
  const a = math.slice(math.indexOf('function renderChalA() {'), math.indexOf('async function finishChal() {'));
  assert.ok(a.includes('const qz = r.ok ? null : chalQuiz(item, given, (c.seed || 0) + item.no * 31);'), '맞힌 답은 돌아보기 없음');
  assert.ok(a.includes('card.appendChild(reviewQuizEl(qz, r, {') && a.includes('() => { if (reveal) reveal.refresh(); }'), '🔍를 마치면 줄 열기가 이어진다');
  assert.ok(a.includes("splitLines(item.why).forEach((t, k) => { const p = el('p', 'chal-why-line', t);"), '풀이는 문장마다 한 줄');
  assert.ok(a.includes('.filter((n) => !(qz && n.part === qz.part && n.picked && !n.ok));'));
  assert.ok(a.includes('  if (!r.ok) {\n    reveal = lineReveal(units, r, () => !qz || !!r.rq);'), '틀렸을 때만 한 줄씩 (맞히면 지금처럼 한꺼번에)');
  assert.ok(a.includes('if (!reveal.done) { card.appendChild(reveal.btn); next.disabled = true; }') && a.includes('reveal.onDone = () => { next.disabled = false; focusQuiet(next); };'), '★ 다 열어야 다음 문제');
  assert.ok(a.indexOf("'chal-idea'") < a.indexOf("'chal-why'") && a.indexOf("'chal-why'") < a.indexOf("'chal-notes'"), '💡 → 풀이 → 보기 까닭');
});

test('📖 화면: 개념 편 틀린 답 — 1️⃣ 자리에 🔍 고르기 · 줄마다 한 줄씩 · 다 마친 뒤에야 🙈 이유 고르기 · 가벼운 편(진단·❓풀어보기)·맞힌 뒤 풀이·쌍둥이는 한꺼번에', () => {
  const math = read('js/math.js');
  const pa = math.slice(math.indexOf('function paintAnswer(i, list, card, restoring) {'), math.indexOf('function focusQuiet(elm) {'));
  assert.ok(pa.includes('rv = light(r) ? null : { st: a, seed: (r.seed || 0) + r.at * 7919 };') && pa.includes('scrollTo = solveCard(q, shown, rv);'));
  assert.ok(pa.includes("t.replaceWith(solveCard(q, shown));"), '맞힌 뒤 📖 풀이 보기는 그대로 한꺼번에');
  const iAfter = pa.indexOf('const afterReview = (byKid) => {');
  assert.ok(iAfter > 0 && pa.includes('    fb.appendChild(slot);\n    next.disabled = true;\n    const afterReview = (byKid) => {'), '돌아보기 동안 다음은 잠김');
  assert.ok(pa.slice(iAfter).includes('else slot.appendChild(whyBlock(a, next, () => {'), '🙈는 돌아보기 뒤에');
  assert.ok(pa.includes('if (!rv || rv.done) afterReview(false);') && pa.includes('else rv.onDone = () => afterReview(true);'), '🎒 다녀와 다 열린 뒤면 바로 🙈 · 아니면 마지막 줄을 열 때');
  assert.ok(!/if \(a\.w\) \{ fb\.appendChild\(whyPicked/.test(pa), '옛 자리(풀이 바로 아래)에 🙈를 두지 않는다');
  const sc = math.slice(math.indexOf('function solveCard(q, ch, rv = null) {'), math.indexOf('function intOf(text) {'));
  assert.ok(sc.includes('const qz = rv ? conceptQuiz(q, ch, rv.seed) : null;'), '🔍는 돌아보기 자리에서만');
  assert.ok(sc.includes('(rv ? splitLines(why) : [why])'), '나누기도 돌아보기 자리에서만');
  assert.ok(sc.includes("units.push(k ? [li] : [h, ol, li]);") && sc.includes('units.push([h, p]);'), '단계마다 한 줄 · 기억할 것 한 줄');
  assert.ok(sc.includes('reveal = lineReveal(units, rv.st, () => !quiz || !!rv.st.rq);') && sc.includes('rv.done = reveal.done;'));
  assert.ok(sc.includes('}, () => { if (reveal) reveal.refresh(); });'), '🔍를 마치면 줄 열기가 이어진다');
  for (const s of ['scrollTo = solveCard(q, shown);', 'body.appendChild(solveCard(w.q, w.chosen));']) assert.ok(math.includes(s), `그대로: ${s}`);
});

test('📖 배선: 부품은 lookview.js(동작은 lookview.test.js가 가짜 화면으로) · 읽어 주는 자리를 두 곳에 · 마지막 줄 뒤 초점은 🙈 · 저장하는 문항 기록에는 안 들어간다', () => {
  const math = read('js/math.js');
  assert.ok(math.includes("import { lineReveal, reviewQuizEl } from './lookview.js';"));
  assert.ok(!math.includes('function lineReveal(') && !math.includes('function reviewQuizEl('), '한 곳에만');
  const a = math.slice(math.indexOf('function renderChalA() {'), math.indexOf('async function finishChal() {'));
  assert.ok(a.includes('reveal = lineReveal(units, r, () => !qz || !!r.rq);\n    card.appendChild(reveal.say);'), '🎯 새 줄 읽어 주기');
  const sc = math.slice(math.indexOf('function solveCard(q, ch, rv = null) {'), math.indexOf('function intOf(text) {'));
  assert.ok(sc.includes('reveal = lineReveal(units, rv.st, () => !quiz || !!rv.st.rq);\n    card.appendChild(reveal.say);'), '개념 편 새 줄 읽어 주기');
  assert.ok(sc.includes('        node: richNode,'), '개념 편 고르기 글은 세로 분수로');
  const pa = math.slice(math.indexOf('function paintAnswer(i, list, card, restoring) {'), math.indexOf('function focusQuiet(elm) {'));
  assert.ok(pa.includes("focusQuiet(slot.querySelector('.math-why-btn') || next);"), '★ 마지막 줄을 열면 사라진 단추 대신 🙈 첫 단추로 초점 (Codex 60차 #2)');
  const ex = math.slice(math.indexOf('const extraQ = (a) =>'), math.indexOf('function whyBlock('));
  assert.ok(!/open|rq/.test(ex), '저장하는 문항 기록(extraQ)에 연 줄·고른 것이 없다');
  const css = read('css/style.css');
  for (const c of ['.math-line-btn {', '.math-review {', '.math-review-opt.is-hint {', '.math-review-got {', '.chal-why-line {', '.sr-only {']) assert.ok(css.includes(c), c);
  const sw = read('sw.js');
  assert.ok(sw.includes("'./js/lookback.js',") && sw.includes("'./js/lookview.js',"), '오프라인에도');
  assert.ok(+(/const CACHE_VERSION = 'v(\d+)';/.exec(sw) || [])[1] >= 248, 'sw v248 이상');
});
