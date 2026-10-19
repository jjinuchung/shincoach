// 🧩 수학 퍼즐 (v296, 2026-10-19 아버님 "모두 니 제안대로 해") — ⬛ 마방진 · 🔺 수 피라미드 · 🃏 숫자 카드
// 생성기(씨앗마다 풀 수 있는 문제 · 단계마다 꼴) · 채점 · 까닭(숫자 뒤 조사) · 그날의 처음 답·단계(answerRule) · 하루 보상(finishRule) · 병합 · 📤 요약 · 화면 연결
// node --test tests/mathpuzzle296.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  KINDS, KIND_LIST, LV_MAX, REWARD, DAY_KEEP, MAGIC_LV, PYRAMID_LV, CARDS_LV, MAGIC_LINES, CARD_TARGETS,
  makePuzzle, answersOf, digitsOf, gradePuzzle, puzzleWhy, cardsAsk, cardNumbers, magicSolvable, pyramidSolvable, numEyo, numBatchim,
  puzzleOf, answerRule, finishRule, mergePuzzle, puzzleTodayLine, puzzleReport,
} from '../js/mathpuzzle.js';
import { addPending, mathReportText } from '../js/mathprog.js';
import { emptyMath, cloneMath, mergeMath } from '../js/db.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const T = '2026-10-19';
const T2 = '2026-10-20';
const SEEDS = 1500;

test('🧩 생성기 — 꼴·단계마다 씨앗 1500개: 늘 만들어지고 · 답이 맞고 · 빈칸은 채워진 줄·칸으로 풀 수 있고 · 단계의 꼴(빈칸 수·0·물음)을 지킨다', () => {
  for (let lv = 1; lv <= LV_MAX; lv++) {
    for (let s = 1; s <= SEEDS; s++) {
      const seed = s * 104729 + lv;
      // ⬛ 마방진 — 여덟 줄의 합이 같다 · 빈칸 수 · 합을 알 수 있는 줄이 있고 차례로 풀린다 · 수는 1~99
      const m = makePuzzle('magic', lv, seed);
      assert.ok(m, `magic ${lv} ${seed}`);
      const sums = MAGIC_LINES.map((ln) => ln.reduce((t, [r, c]) => t + m.cells[r][c], 0));
      assert.equal(new Set(sums).size, 1, `magic 합 ${seed}`);
      assert.equal(m.sum, sums[0]);
      assert.equal(m.blank.length, MAGIC_LV[lv].blanks);
      assert.ok(magicSolvable(m.blank));
      assert.ok(m.cells.flat().every((v) => Number.isInteger(v) && v >= 1 && v <= 99));
      assert.equal(new Set(m.cells.flat()).size, 9, '아홉 수가 모두 다르다');
      // 🔺 피라미드 — 위 = 아래 둘의 합 · 빈칸 수 · 맨 아래 빈칸 최소 · 풀린다 · 맨 아래는 범위 안
      const p = makePuzzle('pyramid', lv, seed);
      assert.ok(p, `pyramid ${lv} ${seed}`);
      const L = PYRAMID_LV[lv];
      assert.equal(p.rows.length, L.rows);
      for (let i = 0; i < p.rows.length - 1; i++) for (let j = 0; j <= i; j++) assert.equal(p.rows[i][j], p.rows[i + 1][j] + p.rows[i + 1][j + 1]);
      assert.ok(p.rows[L.rows - 1].every((v) => v >= L.lo && v <= L.hi));
      assert.equal(p.blank.length, L.blanks);
      const bottomN = p.blank.filter(([i]) => i === L.rows - 1).length;
      assert.ok(bottomN >= L.bottom && (L.bottom || bottomN === 0), `피라미드 맨 아래 빈칸 ${lv}`);
      assert.ok(pyramidSolvable(L.rows, p.blank));
      // 🃏 카드 — 서로 다른 숫자 · 0 규칙 · 답은 모든 수를 늘어놓아 고른 것 · 맨 앞 0 없음 · 가까운 수는 하나뿐
      const c = makePuzzle('cards', lv, seed);
      assert.ok(c, `cards ${lv} ${seed}`);
      const C = CARDS_LV[lv];
      assert.equal(c.digits.length, C.n);
      assert.equal(new Set(c.digits).size, C.n);
      if (C.zero === true) assert.ok(c.digits.includes(0));
      if (C.zero === false) assert.ok(!c.digits.includes(0));
      assert.equal(c.ask, C.ask);
      const nums = cardNumbers(c.digits).map(Number).sort((a, b) => b - a);
      assert.notEqual(c.answer[0], '0');
      const want = c.ask === 'max' ? nums[0] : c.ask === 'min' ? nums[nums.length - 1] : c.ask === 'second' ? nums[1] : null;
      if (want !== null) assert.equal(Number(c.answer), want);
      else {
        assert.ok(CARD_TARGETS.includes(c.target));
        const d = nums.map((x) => Math.abs(x - c.target));
        const best = Math.min(...d);
        assert.equal(d.filter((x) => x === best).length, 1, '가장 가까운 수는 하나');
        assert.equal(Math.abs(Number(c.answer) - c.target), best);
      }
    }
  }
});

test('🧩 같은 씨앗이면 같은 문제(🎒를 다녀와도) · 씨앗이 다르면 대개 다른 문제 · 모르는 꼴은 null · 단계는 1~5로', () => {
  for (const k of KIND_LIST) {
    assert.deepEqual(makePuzzle(k, 3, 777), makePuzzle(k, 3, 777));
    const seen = new Set();
    for (let s = 1; s <= 40; s++) seen.add(JSON.stringify(answersOf(makePuzzle(k, 3, s * 31))));
    assert.ok(seen.size >= 20, `${k} 씨앗마다 달라야`);
    assert.equal(makePuzzle(k, 99, 5).lv, LV_MAX);
    assert.equal(makePuzzle(k, -3, 5).lv, 1);
  }
  assert.equal(makePuzzle('sudoku', 1, 1), null);
  assert.deepEqual(KIND_LIST, ['magic', 'pyramid', 'cards']);
  assert.deepEqual(Object.keys(KINDS), KIND_LIST);
});

test('🧩 채점 — 빈칸마다 맞았나 · 다 맞으면 ok · 빈 칸·음수·소수·길이가 틀리면 valid false · 🃏는 카드를 한 번씩 모두', () => {
  const m = makePuzzle('magic', 2, 11);
  const a = answersOf(m);
  assert.deepEqual(gradePuzzle(m, a), { valid: true, ok: true, right: a.length, n: a.length, marks: a.map(() => true) });
  const one = a.slice(); one[0] += 1;
  const g = gradePuzzle(m, one);
  assert.deepEqual([g.valid, g.ok, g.right, g.marks[0]], [true, false, a.length - 1, false]);
  for (const bad of [a.slice(1), [...a, 1], [NaN, ...a.slice(1)], [-1, ...a.slice(1)], [0.5, ...a.slice(1)], [, ...a.slice(1)], null]) assert.equal(gradePuzzle(m, bad).valid, false, JSON.stringify(bad)); // eslint-disable-line no-sparse-arrays
  const c = makePuzzle('cards', 3, 21);
  const order = [...c.answer].map((ch) => c.digits.indexOf(Number(ch)));
  assert.equal(gradePuzzle(c, order).ok, true);
  assert.equal(gradePuzzle(c, [...order].reverse()).ok, false);
  for (const bad of [order.slice(1), [order[0], ...order.slice(0, -1)], [...order.slice(0, -1), 9], [-1, ...order.slice(1)]]) assert.equal(gradePuzzle(c, bad).valid, false, JSON.stringify(bad));
  assert.equal(gradePuzzle(null, []).valid, false);
  assert.equal(digitsOf(makePuzzle('magic', 1, 3)), 1, '1단계 마방진은 한 자리');
  assert.ok(digitsOf(makePuzzle('pyramid', 5, 3)) >= 3);
});

test('🧩 까닭 글 — 숫자 뒤 조사(15예요 · 57이에요 · 40,000과 · 1,359로) · 🃏 0 함정 · 물음 글', () => {
  assert.deepEqual([15, 57, 174, 150, 45, 90, 1000, 12, 11, 30000].map(numEyo), ['15예요', '57이에요', '174예요', '150이에요', '45예요', '90이에요', '1000이에요', '12예요', '11이에요', '30000이에요']);
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(numBatchim), [true, true, false, true, false, false, true, true, true, false, true]);
  const m = makePuzzle('magic', 1, 4);
  assert.match(puzzleWhy(m), /^한 줄의 합은 15예요 — \d \+ \d \+ \d = 15\./);
  let near = null;
  for (let s = 1; s < 500 && !near; s++) { const c = makePuzzle('cards', 5, s); if (c.target === 40000) near = c; }
  assert.ok(near, '40,000 목표 문제');
  assert.match(puzzleWhy(near), /40,000과의 차이가 [\d,]+(으로|로) 가장 작아요\.$/);
  let zero = null;
  for (let s = 1; !zero; s++) zero = makePuzzle('cards', 3, s);
  assert.match(puzzleWhy(zero), /0은 맨 앞에 올 수 없어요/);
  assert.equal(cardsAsk(makePuzzle('cards', 1, 2)), '카드 4장을 한 번씩 모두 써서 가장 큰 4자리 수를 만들어 보세요.');
  for (const k of KIND_LIST) for (let lv = 1; lv <= LV_MAX; lv++) assert.equal(/undefined|NaN|null/.test(puzzleWhy(makePuzzle(k, lv, 99))), false, `${k}${lv}`);
});

test('🧩 답을 낼 때(answerRule) — 그날 꼴마다 처음 답만 적는다 · 맞으면 단계 하나(판을 연 단계일 때만 — 두 창이 두 번 올리지 않게) · 5단계까지 · 다음 날은 새로', () => {
  const m = cloneMath(emptyMath());
  assert.deepEqual(answerRule(m, 'magic', true, 1, T), { lv: 2, up: true, firstOfDay: true });
  assert.deepEqual(answerRule(m, 'magic', false, 2, T), { lv: 2, up: false, firstOfDay: false }, '두 번째 답은 처음 답을 바꾸지 않는다');
  assert.equal(m.puzzle.first.r.magic, 1);
  assert.deepEqual(answerRule(m, 'magic', true, 1, T), { lv: 2, up: false, firstOfDay: false }, '낡은 단계(다른 창이 이미 올림)면 안 올린다');
  answerRule(m, 'pyramid', false, 1, T);
  assert.deepEqual(m.puzzle.first, { d: T, r: { magic: 1, pyramid: 0 } });
  assert.equal(m.puzzle.solved, 2);
  const top = cloneMath({ ...emptyMath(), puzzle: { lv: { magic: 5, pyramid: 5, cards: 5 } } });
  assert.deepEqual(answerRule(top, 'cards', true, 5, T), { lv: 5, up: false, firstOfDay: true }, '5단계가 끝');
  answerRule(m, 'cards', true, 1, T2);
  assert.deepEqual(m.puzzle.first, { d: T2, r: { cards: 1 } }, '다음 날은 처음 답을 새로');
  assert.deepEqual(answerRule(m, 'nope', true, 1, T2), { lv: 0, up: false, firstOfDay: false });
});

test('🧩 판을 끝냈을 때(finishRule) — 그날 처음 끝낸 판만 💰10 + 🎯 1번 · 🔷는 그날 꼴마다 처음 낸 답이 셋 다 맞았을 때만(그만두고 다시 열어도 못 뽑는다) · 둘째 판은 보상 없음', () => {
  const m = cloneMath(emptyMath());
  for (const k of KIND_LIST) answerRule(m, k, true, 1, T);
  const r = finishRule(m, T);
  assert.deepEqual(r, { first: true, coin: REWARD.coin, throws: REWARD.throws, stone: REWARD.stone });
  assert.equal(addPending(m, r.throws), 1, '🎯 잡기 예약 하나');
  assert.deepEqual(finishRule(m, T), { first: false, coin: 0, throws: 0, stone: 0 });
  assert.equal(m.puzzle.day[T], 2);
  assert.equal(m.puzzle.sets, 2);
  // 처음 판에서 하나 틀리고 그만둠 → 새 판을 다 맞혀도 🔷 없음
  const q = cloneMath(emptyMath());
  answerRule(q, 'magic', false, 1, T);
  for (const k of KIND_LIST) answerRule(q, k, true, 1, T);
  assert.deepEqual(finishRule(q, T), { first: true, coin: REWARD.coin, throws: REWARD.throws, stone: 0 });
  assert.equal(q.puzzle.day[T], 1);
  // 어제 다 맞힌 처음 답은 오늘 🔷에 쓰지 않는다
  const y = cloneMath(emptyMath());
  for (const k of KIND_LIST) answerRule(y, k, true, 1, T);
  assert.equal(finishRule(y, T2).stone, 0);
  assert.equal(puzzleTodayLine(0), '처음 끝내면 💰10 · 🎯 포켓몬 잡기 1번 · 셋 다 한 번에 맞히면 🔷 수학스톤');
  assert.match(puzzleTodayLine(1), /오늘의 퍼즐 끝 ✅/);
  assert.match(puzzleTodayLine(2), /🔷까지/);
});

test('🧩 기록 고쳐 읽기·합치기 — 단계·판 수는 큰 쪽 · 보상 받은 날은 날마다 큰 쪽 · 같은 날 처음 답은 틀린 쪽 · 다른 날이면 나중 날 · 깨진 값은 처음 값 · 날은 최근 60일 · db.mergeMath·cloneMath', () => {
  assert.deepEqual(puzzleOf(null), { lv: { magic: 1, pyramid: 1, cards: 1 }, day: {}, first: { d: '', r: {} }, sets: 0, solved: 0 });
  assert.deepEqual(puzzleOf({ lv: { magic: 9, pyramid: -2, cards: 'x' }, day: { bad: 1, '2026-10-01': 7 }, first: { d: 'x', r: { magic: 1 } }, sets: -1 }), { lv: { magic: 5, pyramid: 1, cards: 1 }, day: { '2026-10-01': 2 }, first: { d: '', r: {} }, sets: 0, solved: 0 });
  const many = {};
  for (let i = 0; i < 80; i++) many[`2026-0${1 + Math.floor(i / 28)}-${String(1 + (i % 28)).padStart(2, '0')}`] = 1;
  assert.equal(Object.keys(puzzleOf({ day: many }).day).length, DAY_KEEP);
  const a = { lv: { magic: 3, pyramid: 1, cards: 2 }, day: { [T]: 1 }, first: { d: T, r: { magic: 1, pyramid: 1 } }, sets: 4, solved: 9 };
  const b = { lv: { magic: 2, pyramid: 4, cards: 2 }, day: { [T]: 2, '2026-10-18': 1 }, first: { d: T, r: { magic: 0, cards: 1 } }, sets: 2, solved: 11 };
  const ab = mergePuzzle(a, b);
  assert.deepEqual(ab, { lv: { magic: 3, pyramid: 4, cards: 2 }, day: { [T]: 2, '2026-10-18': 1 }, first: { d: T, r: { magic: 0, pyramid: 1, cards: 1 } }, sets: 4, solved: 11 });
  assert.deepEqual(mergePuzzle(b, a), ab, '어느 차례로 합쳐도 같다');
  assert.deepEqual(mergePuzzle({ first: { d: T2, r: { magic: 1 } } }, a).first, { d: T2, r: { magic: 1 } }, '다른 날이면 나중 날');
  const cur = { ...emptyMath(), puzzle: a };
  const merged = mergeMath(cur, { ...emptyMath(), puzzle: b });
  assert.deepEqual(merged.puzzle, ab);
  assert.equal(mergeMath({ ...emptyMath() }, { ...emptyMath() }).puzzle, undefined, '퍼즐을 안 했으면 칸도 없다');
  const cl = cloneMath(cur);
  cl.puzzle.lv.magic = 5;
  cl.puzzle.first.r.magic = 0;
  assert.equal(cur.puzzle.lv.magic, 3, '복사본을 고쳐도 원본은 그대로');
  assert.equal(cur.puzzle.first.r.magic, 1);
});

test('🧩 📤 수학 요약 — 꼴마다 단계 · 끝낸 판 · 맞힌 퍼즐 · 최근 7일 퍼즐 한 날', () => {
  const p = { lv: { magic: 2, pyramid: 1, cards: 3 }, day: { [T]: 1, '2026-10-14': 2, '2026-10-12': 1 }, sets: 5, solved: 12 };
  assert.equal(puzzleReport(p, T), '🧩 수학 퍼즐 — ⬛ 마방진 2단계 · 🔺 수 피라미드 1단계 · 🃏 숫자 카드 3단계 · 끝낸 판 5 · 맞힌 퍼즐 12 · 최근 7일 퍼즐 한 날 2');
  assert.match(puzzleReport(null, T), /끝낸 판 0 · 맞힌 퍼즐 0 · 최근 7일 퍼즐 한 날 0$/);
  assert.ok(mathReportText({ ...emptyMath(), puzzle: p }, T).includes('🧩 수학 퍼즐 — ⬛ 마방진 2단계'));
});

test('🧩 화면 연결 — 사다리 머리(☀️ 아래)·줄기 고르기에 단추 · ⏳ guardStart · 답마다 updateMath(answerRule) · 판 끝은 commitChalRound(finishRule + 🎯 addPending) · 🎒에서 돌아오면 이어서 · 사다리로 나가면 판을 버림 · sw·css', () => {
  const math = read('js/math.js');
  assert.ok(math.includes("import { puzzleButton, puzzleActive, resumePuzzle, endPuzzle } from './mathpuzzleview.js';"));
  // v299부터 🧩 바로 아래에 🕵️ 나옹의 숙제 단추가 한 줄 끼어든다 (tests/detective299)
  assert.ok(math.includes('  head.appendChild(puzzleButton(puzzleCtx())); // 🧩 오늘의 수학 퍼즐 — ☀️ 오늘의 수학 아래 (v296)\n  head.appendChild(detectButton(detectCtx())); // 🕵️ 나옹의 숙제 봐 주기 — 🧩 아래 (v299)\n  // ❓ 아빠 답을 기다리는 질문'));
  assert.ok(math.indexOf('head.appendChild(puzzleButton(puzzleCtx()))') > math.indexOf("'☀️ 오늘의 수학 — 한 번에 다 하기'"), '☀️ 아래');
  assert.ok(math.includes('  card.appendChild(puzzleButton(puzzleCtx())); // 🧩 수학 퍼즐도 줄기와 상관없이 (v296)'));
  assert.ok(math.includes('  if (puzzleActive()) { ui.run++; resumePuzzle(puzzleCtx()); return; }'));
  assert.ok(math.includes('  endPuzzle(); // 🧩 수학 퍼즐 판도 (v296)'));
  assert.ok(math.includes("endChal(); endPuzzle(); ui.run++; showView('home'); });"), '← 뒤로(홈)도 판을 버린다');
  const pv = read('js/mathpuzzleview.js');
  assert.ok(pv.includes("b.addEventListener('click', () => guardStart('math', () => startPuzzle(ctx)));"));
  assert.ok(pv.includes('const m = await updateMath((mm) => { res = answerRule(mm, it.kind, ps.grade.ok, it.from, todayKey()); });'));
  assert.ok(pv.includes('      const r = finishRule(s, today);\n      if (r.throws) addPending(s, r.throws);\n      return { result: r, reward: { xp: 0, coin: r.coin, items: {}, stone: r.stone, throws: r.throws } };'));
  assert.ok(pv.includes('  if (!ps || ps.grade) return;'), '확인은 한 번');
  // 🔍 Codex 102차 — 숫자·빈칸·카드를 누를 때는 읽던 자리 그대로 · 확인 뒤 초점은 [다음 퍼즐] 또는 [다시 저장하기]
  assert.ok(pv.includes('  const y = keep ? window.scrollY : 0;') && pv.includes('  if (keep && y) window.scrollTo(0, y);'));
  for (const s of ['ps.sel = k; render(ctx, true);', 'ps.picked.push(i); render(ctx, true);', 'ps.input = []; ps.picked = []; ps.sel = 0; render(ctx, true);']) assert.ok(pv.includes(s), s);
  assert.match(pv, /if \(max === 1 && ps\.sel \+ 1 < n\) ps\.sel \+= 1;\s*\}\s*render\(ctx, true\);/, '숫자판도 자리 그대로');
  assert.ok(pv.includes("const focus = ps.grade ? (card.querySelector('.mpz-next') || card.querySelector('.mpz-retry'))"));
  assert.ok(pv.includes("'btn btn-primary btn-big-wide mpz-retry'"));
  assert.equal(/from '\.\/math\.js'/.test(pv), false, 'math.js를 import하지 않는다');
  assert.equal(/^import /m.test(read('js/mathpuzzle.js')), false, '규칙 파일은 import 없음');
  const sw = read('sw.js');
  assert.ok(sw.includes("'./js/mathpuzzle.js',") && sw.includes("'./js/mathpuzzleview.js',"));
  const css = read('css/style.css');
  for (const c of ['.mpz-btn {', '.mpz-cell {', 'button.mpz-cell.is-sel {', '.mpz-pad {', '.mpz-card-btn {', '.mpz-done {']) assert.ok(css.includes(`\n${c}`), c);
  assert.equal(/\.mpz[^{\n]*\{[^}\n]*font: [^;]*inherit/.test(css), false, 'font 줄임말에 inherit를 쓰지 않는다(줄 전체가 버려진다)');
});

test('🧩 단계 표(시안 그대로) · 수 범위 · 풀 수 있나는 시험이 따로 직접 푼다(규칙 파일의 검사 함수를 쓰지 않고) · 손으로 고른 풀 수 없는 빈칸', () => {
  assert.deepEqual(Object.values(MAGIC_LV).map((x) => x.blanks), [2, 3, 3, 4, 4]);
  assert.deepEqual(Object.values(PYRAMID_LV).map((x) => [x.rows, x.blanks, x.bottom]), [[3, 2, 0], [3, 3, 0], [3, 3, 1], [4, 4, 1], [4, 5, 2]]);
  assert.deepEqual(Object.values(CARDS_LV).map((x) => [x.n, x.zero, x.ask]), [[4, false, 'max'], [5, true, 'max'], [5, true, 'min'], [5, 'maybe', 'second'], [5, 'maybe', 'near']]);
  const solveMagic = (p) => {
    const open = new Set(p.blank.map(([r, c]) => r * 3 + c));
    const val = p.cells.flat().map((v, i) => (open.has(i) ? null : v));
    const lines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
    const full = lines.find((ln) => ln.every((i) => val[i] !== null));
    if (!full) return false;
    const sum = full.reduce((t, i) => t + val[i], 0);
    for (let step = 0; step < 9; step++) for (const ln of lines) { const left = ln.filter((i) => val[i] === null); if (left.length === 1) val[left[0]] = sum - ln.reduce((t, i) => t + (val[i] || 0), 0); }
    return val.every((v, i) => v === p.cells.flat()[i]);
  };
  const solvePyramid = (p) => {
    const open = new Set(p.blank.map(([i, j]) => i + ',' + j));
    const val = p.rows.map((row, i) => row.map((v, j) => (open.has(i + ',' + j) ? null : v)));
    for (let step = 0; step < 20; step++) for (let i = 0; i < val.length - 1; i++) for (let j = 0; j <= i; j++) {
      const t = val[i][j]; const a = val[i + 1][j]; const b = val[i + 1][j + 1];
      if (t === null && a !== null && b !== null) val[i][j] = a + b;
      else if (a === null && t !== null && b !== null) val[i + 1][j] = t - b;
      else if (b === null && t !== null && a !== null) val[i + 1][j + 1] = t - a;
    }
    return val.every((row, i) => row.every((v, j) => v === p.rows[i][j]));
  };
  for (let s = 1; s <= 400; s++) {
    const f = (lv) => makePuzzle('magic', lv, s * 7 + lv).cells.flat();
    assert.ok(f(1).every((v) => v >= 1 && v <= 9) && f(2).every((v) => v >= 1 && v <= 9), '1·2단계는 1~9');
    assert.ok(f(3).every((v) => v >= 6 && v <= 24), '3단계는 6~24');
    assert.ok(f(4).every((v) => v % 10 === 0 && v >= 10 && v <= 90), '4단계는 몇십');
    assert.ok(f(5).every((v) => v % 10 !== 0 && v >= 11 && v <= 99), '5단계는 두 자리(몇십몇)');
    for (let lv = 1; lv <= LV_MAX; lv++) {
      assert.ok(solveMagic(makePuzzle('magic', lv, s * 13 + lv)), `마방진 ${lv}단계 ${s} — 시험이 직접 풀어진다`);
      assert.ok(solvePyramid(makePuzzle('pyramid', lv, s * 17 + lv)), `피라미드 ${lv}단계 ${s} — 시험이 직접 풀어진다`);
    }
    assert.ok(!makePuzzle('cards', 1, s).digits.includes(0), '카드 1단계엔 0이 없다');
  }
  assert.equal(magicSolvable([[0, 0], [1, 1], [2, 2]]), false, '빈칸이 없는 줄이 없으면 합을 몰라 못 푼다');
  assert.equal(magicSolvable([[0, 1], [1, 0]]), true);
  assert.equal(pyramidSolvable(3, [[2, 0], [2, 1], [2, 2]]), false, '맨 아래 셋이 모두 비면 못 푼다');
  assert.equal(pyramidSolvable(3, [[0, 0], [1, 0]]), true);
});
