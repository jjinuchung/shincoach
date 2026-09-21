// 🔢 E 음수 줄기 — 문제 생성기 ①②(계산·오개념) + 풀이 + 쌍둥이·오답 노트 연결: node --test tests/mathneggen.test.js
//
// ★ 첫 줄에 적어 둔다 (분수 v96·v103 교훈): 수학 문제의 정답성은 **글자가 아니라 값**으로 검사한다.
//   여기서는 한 걸음 더 — 문항의 식(expr)을 생성기와 **따로** 계산해서 정답과 맞춘다. 생성기가 셈을 틀리면 여기서 잡힌다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NEGATIVE, makeQuestion, makeRound, diagnosticSet, placeFrom, ladder, lessonOf, valueOf, num, par, frac, checkContent, conceptById } from '../js/mathneg.js';
import { tplKey } from '../js/mathgen.js';

const content = JSON.parse(readFileSync(new URL('../coach/math/negative.json', import.meta.url), 'utf8'));
const opts = { content, names: ['피카츄', '리자몽', '이브이'], worlds: { pokemon: [], toystory: [], minions: [], moana: [] } };
const SEEDS = 500;
const same = (a, b) => !!(a && b && a.n * b.d === b.n * a.d);

// 식을 JS로 따로 계산 — 생성기가 쓴 답과 무관한 검산기. "(−5)² → ((-5)**2)", "−5² → (-(5**2))", × → 곱, ÷ → 나눗
function evalExpr(expr) {
  let s = String(expr)
    .replace(/\((−|-)(\d+(?:\.\d+)?)\)²/g, '((-$2)**2)')
    .replace(/\((−|-)(\d+(?:\.\d+)?)\)³/g, '((-$2)**3)')
    .replace(/(−|-)(\d+)²/g, '(-($2**2))')
    .replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/');
  if (/[^0-9+\-*/(). ]/.test(s)) return null;
  return Function(`"use strict"; return (${s});`)();
}

test('★ 검산: ①계산 문항의 식을 따로 계산한 값이 정답과 같다 (9개념 × 500씨앗)', () => {
  let n = 0;
  for (const c of NEGATIVE) for (let s = 1; s <= SEEDS; s++) {
    const q = makeQuestion(c.id, 'calc', s, opts);
    if (!q.expr) continue;
    const got = evalExpr(q.expr);
    assert.ok(got !== null && Number.isFinite(got), `${c.id} #${s}: 식을 못 읽음 — ${q.expr}`);
    const ok = valueOf(q.choices.find((x) => x.ok).text);
    assert.ok(ok, `${c.id} #${s}: 정답이 수가 아님`);
    assert.ok(Math.abs(ok.n / ok.d - got) < 1e-9, `${c.id} #${s}: ${q.expr} = ${got} 인데 정답 보기는 ${ok.n}/${ok.d}`);
    n++;
  }
  assert.ok(n > 3000, `식이 있는 문항 ${n}개`);
});

test('★ 보기: 4개, 정답 하나, 글자도 값도 안 겹친다 (+5와 5, −4/2와 −2는 같은 수)', () => {
  for (const c of NEGATIVE) for (const kind of ['calc', 'misread']) for (let s = 1; s <= SEEDS; s++) {
    const q = makeQuestion(c.id, kind, s, opts);
    assert.equal(q.choices.length, 4, `${c.id} ${kind} #${s}`);
    assert.equal(q.choices.filter((x) => x.ok).length, 1, `${c.id} ${kind} #${s}: 정답 수`);
    const texts = q.choices.map((x) => x.text);
    assert.equal(new Set(texts).size, 4, `${c.id} ${kind} #${s}: 글자 겹침 ${texts}`);
    const vals = q.choices.map((x) => valueOf(x.text));
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) assert.ok(!same(vals[i], vals[j]), `${c.id} ${kind} #${s}: 값 겹침 ${texts[i]} = ${texts[j]}`);
    for (const ch of q.choices) if (!ch.ok) assert.ok(ch.tag, `${c.id} ${kind} #${s}: 오답에 이름표 없음`);
  }
});

test('★ 풀이: ①②는 전부 solve — 단계 2줄↑, 오답마다 "왜", 기억할 것, 자리표시·undefined 없음, 그림은 SVG', () => {
  let figs = 0;
  for (const c of NEGATIVE) for (const kind of ['calc', 'misread']) for (let s = 1; s <= 200; s++) {
    const q = makeQuestion(c.id, kind, s, opts);
    assert.ok(q.solve, `${c.id} ${kind} #${s}: 풀이 없음`);
    assert.ok(q.solve.steps.length >= 2, `${c.id} ${kind}: 단계 ${q.solve.steps.length}`);
    assert.ok(q.solve.rule, `${c.id} ${kind}: 기억할 것 없음`);
    for (const ch of q.choices) if (!ch.ok) {
      const why = q.solve.why[ch.tag] || q.solve.whyAny;
      assert.ok(why, `${c.id} ${kind} #${s}: 오답 "${ch.tag}"에 설명 없음`);
      assert.ok(!/\{(me|mon)|undefined|NaN/.test(why), `${c.id} ${kind}: 설명이 덜 채워짐 — ${why}`);
    }
    for (const st of [...q.solve.steps, q.q, q.expr]) assert.ok(!/\{(me|mon)|undefined|NaN/.test(st), `${c.id} ${kind}: 덜 채워짐 — ${st}`);
    if (q.solve.figure) { figs++; assert.ok(q.solve.figure.startsWith('<svg'), `${c.id} ${kind}: 풀이 그림이 SVG가 아님`); }
    if (q.figure) assert.ok(q.figure.startsWith('<svg'), `${c.id} ${kind}: 문제 그림이 SVG가 아님`);
  }
  assert.ok(figs > 500, '걷기·수직선 그림이 붙는다');
});

test('풀이의 숫자는 그 문제의 숫자다 — 정답(값)이 단계에 나온다', () => {
  for (const c of NEGATIVE) for (let s = 1; s <= 100; s++) {
    const q = makeQuestion(c.id, 'calc', s, opts);
    const ok = q.choices.find((x) => x.ok).text;
    const v = valueOf(ok);
    if (!v) { assert.ok(q.solve.steps.some((st) => st.includes(ok)), `${c.id} #${s}: 단계에 정답 ${ok}이 없다`); continue; }
    const hit = q.solve.steps.some((st) => (st.match(/[−-]?\d+(?:\.\d+)?(?:\/\d+)?/g) || []).some((t) => same(valueOf(t), v)));
    assert.ok(hit, `${c.id} #${s}: 단계에 정답 ${ok}이 없다 — ${q.solve.steps.join(' | ')}`);
  }
});

test('정수 답 문항은 numline(수직선에 내 답·정답 점 두 개) 표시, 분수·소수 개념은 아님', () => {
  for (const id of ['neg.add', 'neg.sub', 'neg.addsub', 'neg.mul', 'neg.div']) assert.equal(makeQuestion(id, 'calc', 3, opts).solve.numline, true, id);
  for (const id of ['neg.frac', 'neg.mixed']) assert.equal(makeQuestion(id, 'calc', 3, opts).solve.numline, false, id);
});

test('🔁 쌍둥이: want(같은 틀)로 다시 만들면 같은 틀·같은 셈(식 모양)이 숫자만 바뀌어 나온다', () => {
  const shape = (q) => (q.expr ? q.expr.replace(/\d+(?:\.\d+)?/g, '#') : tplKey(q.q));
  let n = 0;
  for (const c of NEGATIVE) for (let s = 1; s <= 40; s++) {
    const q = makeQuestion(c.id, 'calc', s, opts);
    assert.ok(q.key && !/\d/.test(q.key), `${c.id}: 계산 문항은 숫자를 지운 틀 이름표(key)가 있다 — ${q.key}`);
    for (let t = 1; t <= 5; t++) {
      const tw = makeQuestion(c.id, 'calc', s + t * 7919, { ...opts, want: { k: 'calc', key: q.key } });
      assert.equal(tw.key, q.key, `${c.id} #${s}: 쌍둥이가 다른 틀로 갔다`);
      if (q.expr) assert.equal(shape(tw), shape(q), `${c.id} #${s}: 쌍둥이의 셈이 다르다 — ${q.expr} / ${tw.expr}`); // 식이 없는 문항은 틀이 같으면 셈도 같다
      n++;
    }
  }
  assert.ok(n >= 1500);
  // 다른 얼굴의 want는 이 문항에 안 쓴다 (Codex 2차 #7)
  const q1 = makeQuestion('neg.add', 'calc', 5, opts);
  const mr = makeQuestion('neg.add', 'misread', 5, { ...opts, want: { k: 'calc', key: q1.key } });
  assert.ok(mr.key.startsWith('misread:'));
});

test('방금 나온 틀(recent)은 피한다 — 가족을 먼저 고르고 나서 피하면 그 세계의 틀이 하나뿐인 가족에서 되풀이된다 (Codex #7)', () => {
  for (const c of NEGATIVE) for (let s = 1; s <= 60; s++) {
    const first = makeQuestion(c.id, 'calc', s, opts);
    // 같은 씨앗으로 다시 — 방금 것을 recent로 넘기면 다른 틀이 나와야 한다 (어느 가족에든 새 틀이 남아 있다)
    const again = makeQuestion(c.id, 'calc', s, { ...opts, recent: [first.key] });
    assert.notEqual(again.key, first.key, `${c.id} #${s}: recent에 있는 틀이 그대로 — ${first.key}`);
  }
});

test('③ 예비 문항도 풀이(explain → solve.whyAny)가 있다 — 파일에 ③이 없는 동안 실제로 쓰이는 문항이다 (Codex #9)', () => {
  for (const c of NEGATIVE) for (let s = 1; s <= 10; s++) {
    const q = makeQuestion(c.id, 'why', s, opts);
    assert.ok(q.solve && q.solve.whyAny && q.solve.whyAny.length > 30, `${c.id} #${s}: ③에 풀이가 없다`);
    assert.equal(q.solve.rule, c.idea);
  }
});

test('② 오개념 문항: 포켓몬이 틀린 말을 하고, 정답은 "무엇이 틀렸나"를 짚는다. key는 갈래별 "misread:갈래" (Codex #4)', () => {
  const variants = {};
  for (const c of NEGATIVE) for (let s = 1; s <= 30; s++) {
    const q = makeQuestion(c.id, 'misread', s, opts);
    assert.equal(q.kind, 'misread');
    assert.ok(/^misread:[a-z]+$/.test(q.key), `${c.id}: key ${q.key}`);
    (variants[c.id] = variants[c.id] || new Set()).add(q.key);
    assert.ok(/무엇이 틀렸을까/.test(q.q), q.q);
    assert.ok(q.choices.some((x) => x.text === '틀린 곳이 없어요' && x.tag === '틀린 줄 모름'));
    assert.ok(q.solve.whyAny, '오개념 문항은 whyAny 한 덩이');
    // 🔁 쌍둥이·🤔 오답 노트: 같은 key로 다시 만들면 **같은 오류 유형**이 나온다 (음수÷음수 부호 → 0으로 나누기로 바뀌면 안 된다)
    for (let t = 1; t <= 4; t++) {
      const tw = makeQuestion(c.id, 'misread', s + t * 7919, { ...opts, want: { k: 'misread', key: q.key } });
      assert.equal(tw.key, q.key, `${c.id} #${s}: 쌍둥이가 다른 갈래 ${tw.key}`);
    }
  }
  for (const c of NEGATIVE) assert.ok(variants[c.id].size >= 2, `${c.id}: 갈래가 ${variants[c.id].size}개`);
  // recent에 있는 갈래는 피한다
  const first = makeQuestion('neg.sub', 'misread', 3, opts);
  for (let s = 1; s <= 30; s++) assert.notEqual(makeQuestion('neg.sub', 'misread', s, { ...opts, recent: [first.key] }).key, first.key);
});

test('★ ②의 주장은 반드시 틀린 등식이다 — 식을 따로 계산해 확인 (Codex #1: −6 + 7 − 7 = −6 은 참이었다)', () => {
  let n = 0;
  for (const c of NEGATIVE) for (let s = 1; s <= SEEDS; s++) {
    const q = makeQuestion(c.id, 'misread', s, opts);
    const m = /(?:^|\s)([^"]+?) = ([−\d./]+) ?(?:이)?라고 했어요/.exec(q.q);
    if (!m) continue;
    const lhs = evalExpr(m[1].replace(/^.*?(?=[(−\d])/, ''));
    const claimed = valueOf(m[2]);
    if (lhs === null || !Number.isFinite(lhs) || !claimed) continue;
    assert.ok(Math.abs(lhs - claimed.n / claimed.d) > 1e-9, `${c.id} #${s}: 주장이 참이다 — ${q.q}`);
    // 문장형 보기 "답은 X예요"의 X도 참이면 안 된다 (Codex #2: −2² 에서 "답은 −4예요"가 정답과 같았다)
    for (const ch of q.choices) if (!ch.ok) {
      const mm = /답은 ([−\d./]+)(?:예요|이에요)/.exec(ch.text);
      if (mm) { const v = valueOf(mm[1]); assert.ok(!v || Math.abs(lhs - v.n / v.d) > 1e-9, `${c.id} #${s}: 오답 보기 "${ch.text}"가 실제 답`); }
    }
    n++;
  }
  assert.ok(n > 2000, `등식 주장 ${n}개 확인`);
});

test('오개념 이름표와 오답 값이 맞는다 — "곱셈을 덧셈으로"는 실제로 더한 값, "0을 한 칸으로 셈"은 0을 지나는 이동에서만 (Codex #5)', () => {
  const two = (expr) => { const m = /^\(?(−?[\d.]+)\)? [×÷] \(?(−?[\d.]+)\)?$/.exec(expr); return m ? [Number(m[1].replace('−', '-')), Number(m[2].replace('−', '-'))] : null; };
  const val = (t) => { const v = valueOf(t); return v.n / v.d; };
  for (const id of ['neg.mul', 'neg.div', 'neg.frac']) for (let s = 1; s <= 200; s++) {
    const q = makeQuestion(id, 'calc', s, opts);
    const xy = q.expr && two(q.expr);
    if (!xy) continue;
    const [x, y] = xy;
    for (const ch of q.choices) {
      if (/덧셈으로$/.test(ch.tag)) assert.ok(Math.abs(val(ch.text) - (x + y)) < 1e-9, `${id} #${s} ${q.expr}: "${ch.tag}" = ${ch.text}`);
      if (/뺄셈으로$/.test(ch.tag)) assert.ok(Math.abs(val(ch.text) - (x - y)) < 1e-9, `${id} #${s} ${q.expr}: "${ch.tag}" = ${ch.text}`);
      if (ch.tag === '나눗셈을 곱셈으로') assert.ok(Math.abs(val(ch.text) - x * y) < 1e-9, `${id} #${s} ${q.expr}: ${ch.text}`);
    }
  }
  for (let s = 1; s <= 300; s++) {
    const q = makeQuestion('neg.line', 'calc', s, opts);
    const m = /수직선의 (−?\d+)에 서 있어요\. (왼쪽|오른쪽)으로 (\d+)칸|수직선에서 (−?\d+)보다 (\d+)칸 (왼쪽|오른쪽)/.exec(q.q);
    if (!m) continue;
    const s0 = Number((m[1] || m[4]).replace('−', '-')); const k = Number(m[3] || m[5]); const left = (m[2] || m[6]) === '왼쪽';
    const ans = left ? s0 - k : s0 + k;
    const crosses = (s0 < 0 && ans > 0) || (s0 > 0 && ans < 0);
    const over = q.choices.find((x) => x.tag === '0을 한 칸으로 셈' || x.tag === '한 칸 더 감');
    assert.ok(over, `${s}: 한 칸 더 간 오답이 있다`);
    assert.equal(over.tag, crosses ? '0을 한 칸으로 셈' : '한 칸 더 감', `${s}: ${q.q}`);
  }
});

test('보충 보기 "계산 실수"는 드물어야 한다 — 오개념 후보가 겹쳤을 때만 (Codex #8: 전엔 neg.mean의 49%)', () => {
  for (const c of NEGATIVE) {
    let n = 0;
    for (let s = 1; s <= 400; s++) if (makeQuestion(c.id, 'calc', s, opts).choices.some((x) => x.tag === '계산 실수')) n++;
    assert.ok(n / 400 <= 0.03, `${c.id}: 보충 보기가 ${(n / 4).toFixed(1)}%`);
  }
});

test('③ 왜 그런가: negative.json에 아직 why가 없으면 코드 안의 예비 문항(개념마다 2개)을 낸다 · ⭐는 없으면 null', () => {
  for (const c of NEGATIVE) {
    assert.ok(Array.isArray(c.why) && c.why.length >= 2, `${c.id}: 예비 why 2개`);
    const q = makeQuestion(c.id, 'why', 3, opts);
    assert.ok(q && q.kind === 'why' && q.choices.length === 4, c.id);
    assert.equal(q.choices.filter((x) => x.ok).length, 1);
    assert.equal(makeQuestion(c.id, 'special', 3, opts), null);
    const round = makeRound(c.id, 9, opts);
    assert.deepEqual(round.map((x) => x.kind), ['calc', 'misread', 'why']);
  }
  // 파일에 why가 들어오면 그쪽을 쓴다
  const withWhy = { ...content, 'neg.add': { ...content['neg.add'], why: [{ q: '{mon}: 파일에서 온 질문?', ok: '네', no: ['아니오', '몰라요', '글쎄요'] }] } };
  const q = makeQuestion('neg.add', 'why', 3, { ...opts, content: withWhy });
  assert.equal(q.q, '피카츄: 파일에서 온 질문?'.replace('피카츄', q.q.split(':')[0]));
  assert.ok(!/\{mon\}/.test(q.q));
});

test('📚 배움(lessonOf): 원고의 장마다 출연진이 채워지고, 확인 질문은 q·ok·no·why, 끝에 한 줄 요약', () => {
  for (const c of NEGATIVE) {
    const L = lessonOf(c.id, 1, opts);
    assert.equal(L.title, c.name);
    assert.ok(L.pages.length >= 3, `${c.id}: ${L.pages.length}장`);
    assert.ok(L.rule);
    for (const p of L.pages) {
      assert.ok(p.say && !/\{(me|mon)/.test(p.say), `${c.id}: 자리표시가 남음 — ${p.say.slice(0, 40)}`);
      if (p.check) { assert.ok(p.check.q && p.check.ok && p.check.no.length >= 1 && p.check.why); assert.ok(!/\{(me|mon)/.test(p.check.q + p.check.ok + p.check.why)); }
    }
  }
  // 원고가 없으면 idea 한 장으로
  const L = lessonOf('neg.add', 1, { names: ['피카츄'] });
  assert.equal(L.pages.length, 1);
  assert.equal(lessonOf('없는.개념', 1, opts), null);
});

test('📏 진단 5문제: 사다리에서 고르게(뜻·덧셈·섞인 계산·나눗셈·거듭제곱), placeFrom은 틀린 가장 앞 개념', () => {
  const d = diagnosticSet(3, 5, opts);
  assert.deepEqual(d.map((q) => q.concept), ['neg.mean', 'neg.add', 'neg.addsub', 'neg.div', 'neg.mixed']);
  assert.ok(d.every((q) => q.kind === 'calc'));
  assert.deepEqual(placeFrom(d.map((q) => ({ concept: q.concept, correct: true }))), { startId: 'neg.mixed', knownIds: NEGATIVE.slice(0, -1).map((c) => c.id) });
  assert.deepEqual(placeFrom(d.map((q, i) => ({ concept: q.concept, correct: i !== 1 }))), { startId: 'neg.add', knownIds: ['neg.mean', 'neg.line'] });
  assert.deepEqual(placeFrom([]), { startId: 'neg.mixed', knownIds: NEGATIVE.slice(0, -1).map((c) => c.id) });
  const L = ladder(['neg.mean']);
  assert.deepEqual(L.slice(0, 3).map((x) => x.state), ['done', 'now', 'locked']);
  assert.equal(L.length, 9);
});

test('부호 있는 값 읽기·쓰기: valueOf / num / par / frac', () => {
  assert.deepEqual(valueOf('−5'), { n: -5, d: 1 });
  assert.deepEqual(valueOf('-5'), { n: -5, d: 1 });
  assert.deepEqual(valueOf('+5'), { n: 5, d: 1 });
  assert.deepEqual(valueOf('(−5)'), { n: -5, d: 1 });
  assert.deepEqual(valueOf('−3/4'), { n: -3, d: 4 });
  assert.deepEqual(valueOf('−1.5'), { n: -15, d: 10 });
  assert.deepEqual(valueOf('−2 1/3'), { n: -7, d: 3 });
  assert.equal(valueOf('−7, −2, 0, 3'), null);
  assert.equal(valueOf('4/0'), null);
  assert.ok(same(valueOf('−4/2'), valueOf('−2')));
  assert.ok(same(valueOf('+5'), valueOf('5')));
  assert.ok(same(valueOf('−0.5'), valueOf('−1/2')));
  assert.equal(num(-5), '−5'); assert.equal(num(1.5), '1.5'); assert.equal(num(-0.6), '−0.6'); assert.equal(num(3), '3');
  assert.equal(par(-3), '(−3)'); assert.equal(par(4), '4');
  assert.equal(frac(-2, 4), '−1/2'); assert.equal(frac(4, 2), '2'); assert.equal(frac(-6, 3), '−2'); assert.equal(frac(3, -4), '−3/4');
});

test('★ checkContent: 사람이 쓴 ③⭐가 들어오면 정답과 **값**이 같은 오답을 잡는다 (−4/2 = −2, +5 = 5)', () => {
  const base = content['neg.add'];
  const bad1 = { ...content, 'neg.add': { ...base, why: [{ q: '3 + (−5)는?', ok: '−2', no: ['−4/2', '8', '−8'], explain: { text: '왼쪽으로 5칸' } }] } };
  assert.ok(checkContent(bad1).some((m) => /neg\.add\.why\[0\].*−4\/2.*같은 값/.test(m)), checkContent(bad1).join('\n'));
  const bad2 = { ...content, 'neg.mean': { ...content['neg.mean'], special: [{ q: '{mon}의 코인 5개 벌기를 부호로?', ok: '+5', no: [{ text: '5', tag: '부호 없음' }, { text: '−5', tag: '반대' }, { text: '0', tag: '없음' }], explain: { steps: ['①', '②'], why: { '부호 없음': 'x', '반대': 'y', '없음': 'z' } } }] } };
  assert.ok(checkContent(bad2).some((m) => /neg\.mean\.special\[0\].*"5".*같은 값/.test(m)), checkContent(bad2).join('\n'));
  // 배움의 확인 질문도 같은 검사
  const bad3 = { ...content, 'neg.sub': { ...base, lesson: [{ say: 'a', check: { q: '2 − 6은?', ok: '−4', no: ['−8/2', '4'], why: 'w' } }, { say: 'b', check: { q: 'q', ok: '1', no: ['2'], why: 'w' } }, { say: 'c' }] } };
  assert.ok(checkContent(bad3).some((m) => /neg\.sub\.lesson\[0\]\.check.*−8\/2.*같은 값/.test(m)), checkContent(bad3).join('\n'));
  // 제대로 쓴 것은 통과
  const good = { ...content, 'neg.add': { ...base, why: [{ q: '3 + (−5)는?', ok: '−2', no: ['2', '8', '−8'], explain: { text: '왼쪽으로 5칸' } }] } };
  assert.deepEqual(checkContent(good), []);
  assert.deepEqual(checkContent(content), []);
});

test('출연진: 도감 이름이 문제에 들어가고, 안 본 영상의 세계는 나오지 않는다', () => {
  let pk = 0; let other = 0;
  for (let s = 1; s <= 300; s++) {
    const q = makeQuestion('neg.add', 'calc', s, { names: ['뮤츠', '루카리오'] });
    assert.ok(!/보니|헨리|모아나|제시|도르트|헤이헤이/.test(q.q), `안 본 영상 등장인물: ${q.q}`);
    if (/뮤츠|루카리오/.test(q.q)) pk++;
    const q2 = makeQuestion('neg.add', 'calc', s, opts);
    if (/보니|헨리|모아나|제시|도르트|헤이헤이|우디|맥스|타마토아/.test(q2.q)) other++;
  }
  assert.ok(pk > 50, `도감 포켓몬이 ${pk}번`);
  assert.ok(other > 30 && other < 150, `영상 세계 ${other}번 (30% 근처)`);
  assert.equal(conceptById('neg.add').name, '음수가 있는 덧셈');
});
