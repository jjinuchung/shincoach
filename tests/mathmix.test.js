// 🔢 B 혼합계산 줄기 생성기 테스트: node --test tests/mathmix.test.js
//
// ★ 핵심은 **독립 검산**이다 — 생성기가 만든 식(expr)을 이 파일의 **따로 만든 파서**로 풀어
//   정답으로 표시된 보기와 대조한다. 생성기가 답을 셈하는 코드와 독립이라야 생성기 자체의
//   셈 오류를 잡는다 (음수 줄기에서 Codex가 가르쳐 준 것 — 분수 줄기 때는 이게 없어 6/36을 놓쳤다).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MIXED, TAGS, makeQuestion, makeRound, conceptById, ladder, placeFrom, diagnosticSet,
  valueOf, fracText, reduce, checkContent, gradeLabel,
} from '../js/mathmix.js';
import { readFileSync } from 'node:fs';

const CONTENT = JSON.parse(readFileSync('coach/math/mixed.json', 'utf8'));
const OPTS = { names: ['피카츄', '리자몽', '개굴닌자'], me: '진우', content: CONTENT };

// ── 독립 파서: 괄호/중괄호 + 사칙 (정확한 분수 산술) ──
const g = (a, b) => (b ? g(b, a % b) : Math.abs(a));
const Q = (n, d = 1) => { const s = d < 0 ? -1 : 1; const k = g(Math.abs(n), Math.abs(d)) || 1; return { n: (s * n) / k, d: (s * d) / k }; };
const add = (a, b) => Q(a.n * b.d + b.n * a.d, a.d * b.d);
const sub = (a, b) => Q(a.n * b.d - b.n * a.d, a.d * b.d);
const mul = (a, b) => Q(a.n * b.n, a.d * b.d);
const div = (a, b) => Q(a.n * b.d, a.d * b.n);
const toNum = (q) => q.n / q.d;

/** "12 − 3 × 4" · "{ (3 + 5) × 4 } − 2" · "1/2 + 1/4 × 2" · "0.25 × 8" → 값 */
function evalExpr(src) {
  const s = String(src).replace(/−/g, '-').replace(/\s+/g, '');
  let i = 0;
  const peek = () => s[i];
  function number() {
    const m = /^\d+(\.\d+)?/.exec(s.slice(i));
    if (!m) throw new Error(`숫자가 아님: ${s.slice(i)}`);
    i += m[0].length;
    let v;
    if (m[1]) { const dec = m[0].split('.')[1].length; v = Q(Math.round(Number(m[0]) * 10 ** dec), 10 ** dec); }
    else v = Q(Number(m[0]));
    if (s[i] === '/' && /\d/.test(s[i + 1] || '')) { i++; const m2 = /^\d+/.exec(s.slice(i)); i += m2[0].length; v = Q(v.n, v.d * Number(m2[0])); }
    return v;
  }
  function primary() {
    if (peek() === '(' || peek() === '{') {
      const close = peek() === '(' ? ')' : '}';
      i++;
      const v = expr();
      if (peek() !== close) throw new Error(`괄호가 안 닫힘: ${s}`);
      i++;
      return v;
    }
    if (peek() === '-') { i++; const v = primary(); return Q(-v.n, v.d); }
    return number();
  }
  function term() {
    let v = primary();
    while (peek() === '×' || peek() === '÷') { const op = s[i++]; const rhs = primary(); v = op === '×' ? mul(v, rhs) : div(v, rhs); }
    return v;
  }
  function expr() {
    let v = term();
    while (peek() === '+' || peek() === '-') { const op = s[i++]; const rhs = term(); v = op === '+' ? add(v, rhs) : sub(v, rhs); }
    return v;
  }
  const out = expr();
  if (i !== s.length) throw new Error(`다 못 읽음(${i}/${s.length}): ${s}`);
  return out;
}

test('독립 파서 자체 점검 (이 파서가 틀리면 검산이 의미 없다)', () => {
  const v = (e) => toNum(evalExpr(e));
  assert.equal(v('12 + 5 − 3'), 14);
  assert.equal(v('20 − 8 + 5'), 17);
  assert.equal(v('24 ÷ 3 × 2'), 16);
  assert.equal(v('20 − 3 × 4'), 8);
  assert.equal(v('(24 − 3) × 4'), 84);
  assert.equal(v('{ (5 + 3) × 2 − 4 } × 3'), 36);
  assert.equal(v('36 ÷ (2 + 4) + 5 × 3 − 8'), 13);
  assert.equal(v('1/2 + 1/4 × 2'), 1);
  assert.equal(v('(1/2 + 1/4) × 4'), 3);
  assert.equal(v('0.25 × 8 − 1/2'), 1.5);
  assert.equal(v('2.5 + 1.5 × 2'), 5.5);
});

test('사다리: 8칸, id·이름·학년·needs가 제대로 이어진다', () => {
  assert.equal(MIXED.length, 8);
  const ids = MIXED.map((c) => c.id);
  assert.equal(new Set(ids).size, 8, 'id가 겹치면 안 된다');
  for (const c of MIXED) {
    assert.ok(/^mix\./.test(c.id), c.id);
    assert.ok(c.name && c.idea, c.id);
    assert.ok(c.grade === 5 || c.grade === 6, `${c.id} 학년`);
    for (const n of c.needs) assert.ok(ids.includes(n), `${c.id}의 needs ${n} 가 사다리에 없다`);
  }
  assert.deepEqual(MIXED[0].needs, [], '첫 칸은 선행이 없어야 한다');
  assert.equal(gradeLabel(5), '초5');
  assert.equal(gradeLabel(6), '초6');
});

test('★ 독립 검산: ① 문항의 식을 따로 풀면 정답 보기와 같다 (씨앗 300개)', () => {
  let n = 0;
  for (const c of MIXED) {
    for (let s = 1; s <= 300; s++) {
      const q = makeQuestion(c.id, 'calc', s * 7919, OPTS);
      if (!q) continue;
      n++;
      assert.ok(q.expr, `${c.id} seed ${s}: 식(expr)이 없다 — 검산할 수 없다`);
      const want = toNum(evalExpr(q.expr));
      const okCh = q.choices.find((x) => x.ok);
      assert.ok(okCh, `${c.id} seed ${s}: 정답 보기가 없다`);
      const got = valueOf(okCh.text);
      assert.ok(got !== null, `${c.id} seed ${s}: 정답 "${okCh.text}" 를 값으로 못 읽음`);
      assert.ok(Math.abs(got - want) < 1e-9,
        `${c.id} seed ${s}: 식 "${q.expr}" = ${want} 인데 정답 보기는 ${okCh.text}`);
    }
  }
  assert.ok(n >= 2000, `문항이 충분히 만들어져야 한다 (${n}개)`);
});

test('★ 보기: 정답은 하나, 값이 겹치는 보기가 없다', () => {
  for (const c of MIXED) {
    for (let s = 1; s <= 200; s++) {
      for (const kind of ['calc', 'misread']) {
        const q = makeQuestion(c.id, kind, s * 104729, OPTS);
        if (!q) continue;
        assert.equal(q.choices.filter((x) => x.ok).length, 1, `${c.id}/${kind} seed ${s}: 정답이 하나여야 한다`);
        assert.ok(q.choices.length >= 3, `${c.id}/${kind} seed ${s}: 보기가 3개 이상`);
        const vals = q.choices.map((x) => valueOf(x.text)).filter((v) => v !== null);
        for (let a = 0; a < vals.length; a++) {
          for (let b = a + 1; b < vals.length; b++) {
            assert.ok(Math.abs(vals[a] - vals[b]) > 1e-9,
              `${c.id}/${kind} seed ${s}: 값이 같은 보기 (${q.choices.map((x) => x.text).join(' / ')})`);
          }
        }
        const texts = q.choices.map((x) => x.text.trim());
        assert.equal(new Set(texts).size, texts.length, `${c.id}/${kind} seed ${s}: 글자가 같은 보기`);
      }
    }
  }
});

test('★ 오개념 이름표: 그 값이 실제로 그 실수에서 나온다', () => {
  // "왼쪽부터 계산" 태그가 붙은 오답은, 식을 왼쪽부터 순서 없이 풀었을 때의 값이어야 한다.
  // 이름표가 틀리면 📊의 진단 기록이 거짓이 된다 (음수 줄기 Codex #3).
  const leftToRight = (src) => {
    const s = String(src).replace(/−/g, '-').replace(/\s+/g, '');
    if (/[(){}]/.test(s)) return null;           // 괄호가 있으면 이 검사 대상이 아니다
    const parts = s.split(/([+\-×÷])/);
    let acc = null;
    for (let i = 0; i < parts.length; i += 2) {
      const numTxt = parts[i];
      let v;
      if (/^\d+\/\d+$/.test(numTxt)) { const [a, b] = numTxt.split('/').map(Number); v = Q(a, b); }
      else if (/^\d+(\.\d+)?$/.test(numTxt)) { const dec = (numTxt.split('.')[1] || '').length; v = Q(Math.round(Number(numTxt) * 10 ** dec), 10 ** dec); }
      else return null;
      if (acc === null) { acc = v; continue; }
      const op = parts[i - 1];
      acc = op === '+' ? add(acc, v) : op === '-' ? sub(acc, v) : op === '×' ? mul(acc, v) : div(acc, v);
    }
    return acc === null ? null : toNum(acc);
  };
  let checked = 0;
  for (const c of MIXED) {
    for (let s = 1; s <= 150; s++) {
      const q = makeQuestion(c.id, 'calc', s * 31337, OPTS);
      if (!q || !q.expr) continue;
      const wrong = q.choices.find((x) => !x.ok && x.tag === TAGS.left);
      if (!wrong) continue;
      const lr = leftToRight(q.expr);
      if (lr === null) continue;
      checked++;
      const got = valueOf(wrong.text);
      assert.ok(Math.abs(got - lr) < 1e-9,
        `${c.id} seed ${s}: "${TAGS.left}" 로 이름 붙인 오답 ${wrong.text} 가 왼쪽부터 푼 값 ${lr} 과 다르다 (식 ${q.expr})`);
    }
  }
  assert.ok(checked >= 50, `"왼쪽부터 계산" 오답을 충분히 검사해야 한다 (${checked}건)`);
});

test('★ ② 오개념 문항: 보여 주는 "틀린 계산"이 정말 틀린 값이다', () => {
  for (const c of MIXED) {
    for (let s = 1; s <= 120; s++) {
      const q = makeQuestion(c.id, 'misread', s * 7717, OPTS);
      if (!q || !q.expr) continue;
      const m = /\*\*(.+?)\s*=\s*([\d./−-]+)\*\*/.exec(q.q);
      assert.ok(m, `${c.id} seed ${s}: "식 = 값" 이 문항에 안 보인다`);
      const shown = valueOf(m[2]);
      const right = toNum(evalExpr(m[1]));
      assert.ok(Math.abs(shown - right) > 1e-9,
        `${c.id} seed ${s}: 틀렸다고 보여 준 ${m[1]} = ${m[2]} 가 사실 정답이다`);
      assert.ok(/^misread:/.test(q.key || ''), `${c.id} seed ${s}: 갈래 열쇠(misread:…)가 있어야 쌍둥이가 같은 유형으로 온다`);
    }
  }
});

test('풀이(solve): 모든 ① 문항에 풀이와 한 줄 규칙이 붙는다', () => {
  for (const c of MIXED) {
    const q = makeQuestion(c.id, 'calc', 12345, OPTS);
    assert.ok(q.solve, `${c.id}: 풀이가 없다`);
    assert.ok(q.solve.steps.length >= 2, `${c.id}: 풀이 단계가 2줄 이상`);
    assert.ok(q.solve.rule, `${c.id}: 다음에 기억할 것 한 줄`);
  }
});

test('편·진단·사다리가 다른 줄기와 같은 모양으로 돈다', () => {
  const round = makeRound('mix.order', 999, OPTS);
  assert.ok(round.length >= 2, '한 편은 문항 둘 이상');
  for (const q of round) assert.equal(q.concept, 'mix.order');

  const diag = diagnosticSet(4242, 5, OPTS);
  assert.equal(diag.length, 5, '진단 5문항');

  const rows = ladder([]);
  assert.equal(rows.length, 8);
  assert.equal(rows[0].state, 'now', '첫 칸이 지금 할 것');
  assert.equal(rows[1].state, 'locked', '앞을 안 하면 잠김');
  const rows2 = ladder(['mix.addsub']);
  assert.equal(rows2[0].state, 'done');
  assert.equal(rows2[1].state, 'now');

  // 진단 결과로 시작점 잡기 — 다 맞히면 뒤쪽, 다 틀리면 첫 칸
  const allOk = placeFrom(diag.map((q) => ({ id: q.concept, correct: true })));
  const allNo = placeFrom(diag.map((q) => ({ id: q.concept, correct: false })));
  assert.ok(allOk && allNo, '진단 결과를 받아야 한다');
});

test('자리표시가 새어 나가지 않는다 ({mon/이/가} 가 화면에 그대로 뜨면 안 된다)', () => {
  for (const c of MIXED) {
    for (let s = 1; s <= 60; s++) {
      for (const kind of ['calc', 'misread']) {
        const q = makeQuestion(c.id, kind, s * 5711, OPTS);
        if (!q) continue;
        const all = `${q.q} ${q.choices.map((x) => x.text).join(' ')}`;
        const leak = (all.match(/\{[^}]*\}/g) || []).filter((l) => !/^\{[\s\d+\-−×÷*/().]+\}$/.test(l));
        assert.deepEqual(leak, [], `${c.id}/${kind} seed ${s}: 자리표시가 남음`);
      }
    }
  }
});

test('수 도구: 기약분수·글자·값 읽기', () => {
  assert.deepEqual(reduce(6, 8), { n: 3, d: 4 });
  assert.deepEqual(reduce(4, 2), { n: 2, d: 1 });
  assert.deepEqual(reduce(-6, 8), { n: -3, d: 4 });
  assert.equal(fracText(6, 3), '2', '분모가 1이면 정수로');
  assert.equal(fracText(3, 6), '1/2');
  assert.equal(valueOf('3/4'), 0.75);
  assert.equal(valueOf('2.5'), 2.5);
  assert.equal(valueOf('12'), 12);
  assert.equal(valueOf(''), null);
  assert.equal(valueOf('답은 12예요'), 12, '문장 속 수도 읽어야 값 겹침 검사를 빠져나가지 않는다');
});

test('사람이 쓴 내용(mixed.json)이 형식 검사를 통과한다', () => {
  const bad = checkContent(CONTENT);
  assert.deepEqual(bad, [], bad.join('\n'));
});

test('개념을 못 찾으면 조용히 null (화면이 죽지 않게)', () => {
  assert.equal(conceptById('없는개념'), null);
  assert.equal(makeQuestion('없는개념', 'calc', 1, OPTS), null);
});

test('초5 자연수 칸은 보기가 전부 자연수 (17.67 같은 답은 아이가 내지 않는다)', () => {
  for (const c of MIXED.filter((x) => x.grade === 5)) {
    for (let s = 1; s <= 200; s++) {
      const q = makeQuestion(c.id, 'calc', s * 65537, OPTS);
      if (!q) continue;
      for (const ch of q.choices) {
        const v = valueOf(ch.text);
        if (v === null) continue;
        assert.ok(Number.isInteger(v), `${c.id} seed ${s}: 보기 ${ch.text} 가 자연수가 아니다 (식 ${q.expr})`);
        assert.ok(v >= 0, `${c.id} seed ${s}: 보기 ${ch.text} 가 음수다 (아직 음수를 안 배웠다)`);
      }
    }
  }
});
