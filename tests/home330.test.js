// 🔁 홈 복습 칩은 영어 카드에만 (v330, 2026-10-24 아버님 "잘못된 거면 고쳐") — node --test tests/home330.test.js
//  예전엔 수학을 뺀 모든 카드에 영어 복습 수를 넘겨, 영어 복습이 밀리면 국어·논술 카드에도 「🔁 복습 N문장이 기다려요」가 붙었다
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SUBJECTS, cardSubject } from '../js/home.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const S = (k) => SUBJECTS.find((s) => s.key === k);

test('🔁 복습 칩 — 영어 카드에만 · 국어·논술·수학 카드엔 복습 수가 안 간다', () => {
  const x = { reviewDue: 7, bonus: { text: '💰 코인 +15', got: false }, unread: 0, korBonus: {} };
  assert.equal(cardSubject(S('english'), x).reviewDue, 7);
  for (const k of ['math', 'korean', 'nonsul']) assert.ok(!(cardSubject(S(k), x).reviewDue > 0), `${k} 카드에 복습 칩`);
});

test('✨·📬 그대로 — 수학: 보너스·아빠 답장 · 국어·논술: 제 보너스 · 영어: 보너스 없음', () => {
  const kb = { korean: { text: '🌟 황금 몬스터볼 1개', tip: '📚 글 한 편 다 읽으면 받아요', got: false }, nonsul: { text: '🔵 슈퍼볼 2개', tip: '🖊️ 논술 한 판 끝내면 받아요', got: true } };
  const mb = { text: '💰 코인 +15', got: false };
  const m = cardSubject(S('math'), { bonus: mb, unread: 2, reviewDue: 3, korBonus: kb });
  assert.equal(m.bonus, mb);
  assert.equal(m.desc, '📬 아빠 답장 2개 — 먼저 읽어요');
  assert.equal(cardSubject(S('math'), { bonus: mb }).desc, S('math').desc, '답장이 없으면 원래 설명');
  assert.equal(cardSubject(S('korean'), { korBonus: kb }).bonus, kb.korean);
  assert.equal(cardSubject(S('nonsul'), { korBonus: kb }).bonus, kb.nonsul);
  assert.equal(cardSubject(S('korean'), { korBonus: {} }).bonus, undefined, '못 읽었으면 칩 없이');
  assert.equal(cardSubject(S('english'), { korBonus: kb, bonus: mb }).bonus, undefined);
  assert.equal(cardSubject(S('korean'), { korBonus: Object.create({ korean: kb.korean }) }).bonus, undefined, '물려받은 칸은 안 본다');
});

/** 작은 가짜 화면 — cardEl이 쓰는 만큼만 */
function fakeDoc() {
  const mk = (tag) => {
    const cls = new Set();
    const e = { tagName: tag, children: [], attrs: {}, textContent: '', type: '', src: '', alt: '', draggable: true,
      classList: { add: (...c) => c.forEach((x) => cls.add(x)), contains: (c) => cls.has(c) },
      appendChild(c) { this.children.push(c); return c; },
      setAttribute(k, v) { this.attrs[k] = v; },
      addEventListener() {} };
    Object.defineProperty(e, 'className', { get: () => [...cls].join(' '), set: (v) => { cls.clear(); String(v).split(/\s+/).filter(Boolean).forEach((x) => cls.add(x)); } });
    return e;
  };
  return { createElement: mk };
}
const find = (el, cls) => (el.classList.contains(cls) ? [el] : []).concat(...el.children.map((c) => find(c, cls)));

test('🔁 실제 카드 — 영어 복습이 밀려도 「복습 N문장」 칩은 영어 카드에만 · 국어·논술 카드엔 ✨ 칩만 (🔍 Codex 134차 #2)', async () => {
  globalThis.document = fakeDoc();
  try {
    const { cardEl } = await import('../js/home.js');
    const kb = { korean: { text: '🌟 황금 몬스터볼 1개', tip: '📚 글 한 편 다 읽으면 받아요', got: false }, nonsul: { text: '🔵 슈퍼볼 2개', tip: '🖊️ 논술 한 판 끝내면 받아요', got: false } };
    const x = { reviewDue: 4, bonus: { text: '💰 코인 +15', got: false }, unread: 0, korBonus: kb };
    const cards = Object.fromEntries(SUBJECTS.map((s) => [s.key, cardEl(cardSubject(s, x), null, () => {})]));
    assert.deepEqual(find(cards.english, 'home-card-review').map((e) => e.textContent), ['🔁 복습 4문장이 기다려요']);
    for (const k of ['math', 'korean', 'nonsul']) assert.equal(find(cards[k], 'home-card-review').length, 0, `${k} 카드에 복습 칩`);
    assert.equal(find(cards.korean, 'home-card-bonus')[0].textContent, '✨ 오늘의 보너스 🌟 황금 몬스터볼 1개');
    assert.equal(find(cards.korean, 'home-card-bonus-tip')[0].textContent, '📚 글 한 편 다 읽으면 받아요');
    assert.equal(find(cards.english, 'home-card-bonus').length, 0);
    assert.ok(cards.korean.classList.contains('sparkle') && !cards.english.classList.contains('sparkle'));
  } finally {
    delete globalThis.document;
  }
});

test('🔗 홈 그리기가 cardSubject로 — 카드마다 따로 넘기지 않는다', () => {
  const src = read('js/home.js');
  assert.match(src, /frag\.appendChild\(cardEl\(cardSubject\(s, \{ bonus, unread, reviewDue, korBonus \}\)/);
  assert.doesNotMatch(src, /: \{ \.\.\.s, reviewDue \}, pickMascot/, '예전 꼴(수학 말고 모두 reviewDue)이 남지 않게');
});
