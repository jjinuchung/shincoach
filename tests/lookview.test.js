// 📖 v248 풀이 돌아보기 부품(js/lookview.js)을 가짜 화면으로 눌러 본다 — Codex 60차 #3
// 줄 없이 끝 · 다 연 뒤 복원 · 틀린 뒤 복원 · "다음"을 여는 onDone은 한 번만 · 단추가 사라지면 초점을 옮긴다 · 새 줄을 읽어 준다
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lineReveal, reviewQuizEl } from '../js/lookview.js'; // 맨 위에서 DOM을 건드리지 않는다

/** 이 시험에 필요한 만큼만 흉내 낸 DOM */
class FNode {
  constructor(doc, tag, text = '') {
    this.ownerDocument = doc; this.tagName = tag; this.nodeType = tag ? 1 : 3;
    this.children = []; this.parentNode = null; this._text = String(text);
    this.className = ''; this.hidden = false; this.disabled = false; this.type = ''; this.attrs = {}; this.listeners = {};
  }
  get classList() {
    const n = this;
    const has = (c) => n.className.split(/\s+/).includes(c);
    return { add: (c) => { if (!has(c)) n.className = `${n.className} ${c}`.trim(); }, contains: has };
  }
  get textContent() { return this._text + this.children.map((c) => c.textContent).join(''); }
  set textContent(t) { for (const c of this.children) c.parentNode = null; this.children = []; this._text = String(t); }
  set innerHTML(v) { assert.equal(v, '', '글을 innerHTML로 넣지 않는다'); this.textContent = ''; }
  get firstChild() { return this.children[0] || null; }
  appendChild(c) { c.remove(); c.parentNode = this; this.children.push(c); return c; }
  insertBefore(c, ref) {
    if (!ref) return this.appendChild(c);
    c.remove(); c.parentNode = this; this.children.splice(this.children.indexOf(ref), 0, c); return c;
  }
  remove() { const p = this.parentNode; if (p) { p.children.splice(p.children.indexOf(this), 1); this.parentNode = null; } }
  contains(o) { for (let x = o; x; x = x.parentNode) if (x === this) return true; return false; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); }
  click() { if (this.disabled) return; for (const f of this.listeners.click || []) f(); }
  focus() { this.ownerDocument.activeElement = this; }
  scrollIntoView() {}
  get isConnected() { for (let x = this; x; x = x.parentNode) if (x === this.ownerDocument.body) return true; return false; }
}
function setup() {
  const d = { activeElement: null };
  d.createElement = (t) => new FNode(d, t);
  d.createTextNode = (t) => new FNode(d, null, t);
  d.body = new FNode(d, 'body');
  globalThis.document = d;
  return d;
}
const P = (d, host, text) => { const p = d.createElement('p'); p.textContent = text; host.appendChild(p); return p; };
const opts = (box) => box.children.find((c) => c.className === 'math-review-opts').children;
const msgOf = (box) => box.children.find((c) => c.className === 'math-review-msg');
const QZ = { opts: ['남의 까닭 하나', '내 까닭', '남의 까닭 둘'], ok: 1 };
const RESULT = { title: '🔍 내 답은 왜 틀렸을까요? 골라 봐요', result: (box, t) => box.appendChild(document.createTextNode(`고른 것: ${t}`)) };

test('📖 lineReveal: 첫 줄만 → ▶로 한 줄씩(남은 줄 수) → 새 줄을 읽어 준다(그릇은 빼고 그 줄만) → 다 열면 단추가 사라지고 onDone은 한 번만', () => {
  const d = setup();
  const host = d.body;
  const idea = P(d, host, '💡 핵심');
  const box = d.createElement('div'); host.appendChild(box);
  const l1 = P(d, box, '첫째 문장.'); const l2 = P(d, box, '둘째 문장.');
  const units = [[idea], [box, l1], [l2]];
  const st = {};
  const rev = lineReveal(units, st, () => true);
  host.appendChild(rev.say); host.appendChild(rev.btn);
  let calls = 0; rev.onDone = () => { calls += 1; };
  assert.equal(st.open, 1, '첫 줄은 바로');
  assert.deepEqual([idea.hidden, box.hidden, l1.hidden, l2.hidden], [false, true, true, true]);
  assert.equal(rev.done, false);
  assert.match(rev.btn.textContent, /2줄 남았어요/);
  assert.equal(rev.say.getAttribute('role'), 'status');
  assert.equal(rev.say.getAttribute('aria-live'), 'polite');
  rev.btn.click();
  assert.deepEqual([st.open, box.hidden, l1.hidden, l2.hidden], [2, false, false, true]);
  assert.equal(rev.say.textContent, '첫째 문장.', '★ 상자(둘째 문장까지 담은 그릇)가 아니라 그 줄만 읽는다 — 숨은 줄을 미리 읽지 않게');
  assert.match(rev.btn.textContent, /1줄 남았어요/);
  rev.btn.click();
  assert.deepEqual([st.open, l2.hidden, rev.done, calls], [3, false, true, 1]);
  assert.equal(rev.say.textContent, '둘째 문장.');
  assert.equal(rev.btn.isConnected, false, '다 열면 단추가 사라진다');
  rev.btn.click(); rev.refresh();
  assert.deepEqual([st.open, calls], [3, 1], '★ 다음을 여는 onDone은 한 번만');
});

test('📖 lineReveal 복원: 🎒에 다녀와 다 열린 뒤면 그릴 때 done(onDone은 안 부른다 — 부르는 쪽이 done을 본다) · 줄이 없으면 바로 done', () => {
  const d = setup();
  const units = [[P(d, d.body, 'a')], [P(d, d.body, 'b')]];
  const st = { open: 2 };
  const rev = lineReveal(units, st, () => true);
  let calls = 0; rev.onDone = () => { calls += 1; };
  assert.deepEqual([rev.done, rev.btn.hidden, units[1][0].hidden, calls], [true, true, false, 0]);
  const empty = lineReveal([], {}, () => true);
  assert.equal(empty.done, true);
  const half = { open: 1 };
  const r2 = lineReveal(units, half, () => true);
  assert.deepEqual([r2.done, units[1][0].hidden], [false, true], '연 줄 수 그대로');
});

test('🔍 고르기 + 한 줄씩: 고르기 전엔 줄·단추가 숨음 → 남의 까닭을 고르면 👉 표시·나머지 잠금·초점은 고를 문장 → 내 까닭을 고르면 그 자리가 결과로 · 초점은 ▶ 단추', () => {
  const d = setup();
  const host = d.body;
  const st = {};
  let rev = null;
  let passed = 0;
  const box = reviewQuizEl(QZ, st, RESULT, () => { passed += 1; rev.refresh(); });
  host.appendChild(box);
  const units = [[P(d, host, '단계 1')], [P(d, host, '기억할 것')]];
  rev = lineReveal(units, st, () => !!st.rq);
  host.appendChild(rev.say); host.appendChild(rev.btn);
  let calls = 0; rev.onDone = () => { calls += 1; };
  assert.deepEqual([st.open, units[0][0].hidden, units[1][0].hidden, rev.btn.hidden], [0, true, true, true], '고르기 전엔 아무 줄도 안 열린다');
  const [o0, o1, o2] = opts(box);
  assert.equal(msgOf(box).getAttribute('role'), 'status');
  o0.click();
  assert.equal(st.rqMiss, 1);
  assert.deepEqual([o0.disabled, o2.disabled, o1.disabled], [true, true, false], '맞는 문장만 누를 수 있다');
  assert.ok(o1.classList.contains('is-hint') && o1.textContent.startsWith('👉 '), '★ 색만이 아니라 👉로도 가리킨다');
  assert.equal(d.activeElement, o1, '★ 누른 단추가 잠겼다 — 초점을 고를 문장으로');
  assert.match(msgOf(box).textContent, /👉 표시한 문장이 내 답에 맞는 까닭이에요/);
  o2.click();
  assert.equal(st.rq, undefined, '잠긴 단추는 안 눌린다');
  o1.click();
  assert.deepEqual([st.rq, passed], [1, 1]);
  assert.equal(box.className, 'math-review is-done');
  assert.equal(box.textContent, '고른 것: 내 까닭');
  assert.deepEqual([st.open, rev.btn.hidden], [0, false], '고른 결과가 첫 줄 — 나머지는 ▶로');
  assert.equal(d.activeElement, rev.btn, '★ 고른 단추가 사라졌다 — 초점을 ▶ 다음 줄로');
  o1.click();
  assert.equal(passed, 1, '다시 눌러도 한 번');
  rev.btn.click(); rev.btn.click();
  assert.deepEqual([rev.done, calls], [true, 1]);
});

test('🔍 고르기 뒤 줄이 없으면 바로 onDone 한 번 · 🎒 복원: 틀린 뒤면 👉와 잠금 그대로(초점은 안 뺏음) · 고른 뒤면 결과만(onPass 안 부름)', () => {
  const d = setup();
  const st = {};
  let rev = null;
  const box = reviewQuizEl(QZ, st, RESULT, () => rev.refresh());
  d.body.appendChild(box);
  rev = lineReveal([], st, () => !!st.rq);
  let calls = 0; rev.onDone = () => { calls += 1; };
  assert.equal(rev.done, false);
  opts(box)[1].click();
  assert.deepEqual([rev.done, calls], [true, 1], '줄이 없으면 고르자마자 다음이 열린다');

  const d2 = setup();
  const miss = reviewQuizEl(QZ, { rqMiss: 1 }, RESULT, () => assert.fail('복원에서 onPass'));
  d2.body.appendChild(miss);
  const [m0, m1, m2] = opts(miss);
  assert.deepEqual([m0.disabled, m1.disabled, m2.disabled], [true, false, true]);
  assert.equal(m1.textContent, '👉 내 까닭', '👉는 한 번만');
  assert.equal(d2.activeElement, null, '다시 그릴 때는 초점을 뺏지 않는다');

  setup();
  const done = reviewQuizEl(QZ, { rq: 1 }, RESULT, () => assert.fail('복원에서 onPass'));
  assert.deepEqual([done.className, done.textContent], ['math-review is-done', '고른 것: 내 까닭']);
});

test('🔍 첫 선택(v252): onFirst는 처음 누른 것만 — 남의 까닭이면 0(그 뒤 맞는 문장을 눌러도 안 부름) · 처음 맞히면 1 · 🎒 복원(틀린 뒤·고른 뒤)에서는 안 부름 · 없어도 그대로', () => {
  setup();
  const got = [];
  const o = { ...RESULT, onFirst: (ok) => got.push(ok) };
  const [a0, a1] = opts(reviewQuizEl(QZ, {}, o, () => {}));
  a0.click(); a1.click(); a1.click();
  assert.deepEqual(got, [0]);
  const [b0, b1] = opts(reviewQuizEl(QZ, {}, o, () => {}));
  b1.click(); b0.click();
  assert.deepEqual(got, [0, 1]);
  opts(reviewQuizEl(QZ, { rqMiss: 1 }, o, () => {}))[1].click();
  assert.deepEqual(got, [0, 1], '🎒 복원 — 이미 한 번 틀린 뒤');
  reviewQuizEl(QZ, { rq: 1 }, o, () => assert.fail('복원에서 onPass'));
  assert.deepEqual(got, [0, 1]);
  const st = {};
  opts(reviewQuizEl(QZ, st, RESULT, () => {}))[1].click();
  assert.equal(st.rq, 1, 'onFirst가 없어도 고르기는 그대로');
});

test('🔍 고르기 글: node가 있으면 그것으로(분수 글은 세로 분수) · 없으면 글자 그대로', () => {
  const d = setup();
  const seen = [];
  const box = reviewQuizEl(QZ, {}, { ...RESULT, node: (t) => { seen.push(t); return d.createTextNode(`[${t}]`); } }, () => {});
  assert.deepEqual(seen, QZ.opts);
  assert.equal(opts(box)[0].textContent, '[남의 까닭 하나]');
  const plain = reviewQuizEl(QZ, {}, RESULT, () => {});
  assert.equal(opts(plain)[2].textContent, '남의 까닭 둘');
});
