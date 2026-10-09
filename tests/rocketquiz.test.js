// 🚀 로켓단 영어 배틀 문제 — 본 단어의 뜻 고르기: node --test tests/rocketquiz.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wordPool, wordQuestion } from '../js/rocketquiz.js';

const R = (word, meaning, views = 1) => ({ word, meaning, views });
const KEY = (m) => String(m).replace(/[\s!?.,~…'"()[\]]/g, '');
const seqRng = (i, n) => { let k = 0; const xs = [(i + 0.5) / n, 0.13, 0.57, 0.91, 0.29, 0.73, 0.41, 0.05]; return () => xs[k++ % xs.length]; };

test('낼 수 있는 단어: 뜻이 있고 한 번 이상 본 것만', () => {
  const recs = [R('apple', '사과'), R('dog', ''), R('cat', '고양이', 0), { word: '', meaning: '빈' }, null, R('run', '달리다', 3)];
  assert.deepEqual(wordPool(recs).map((r) => r.word), ['apple', 'run']);
  assert.deepEqual(wordPool(null), []);
});

test('단어가 셋보다 적으면 문제를 내지 않는다 (null — 없는 문제로 틀리게 하지 않는다) · 뜻이 같은 단어뿐이라 보기가 둘이 되면 내지 않는다', () => {
  assert.equal(wordQuestion([R('apple', '사과'), R('run', '달리다')]), null);
  assert.equal(wordQuestion([]), null);
  // 단어는 셋이지만 "조심해!"·"조심해"는 같은 뜻 — 어느 단어를 내도 보기가 둘뿐 (변이 검사가 찾음: 보기 2개로도 내던 것)
  const same = [R('careful', '조심해!', 2), R('watch out', '조심해', 2), R('apple', '사과', 2)];
  for (let i = 0; i < 50; i++) assert.equal(wordQuestion(same, seqRng(i, 50)), null, `#${i}`);
});

test('★ 보기: 정답 뜻이 꼭 하나 · 3개 이상 · 같은 뜻(표기만 다른 것 포함)이 둘 없다 — 정답을 알고도 틀리게 되지 않게', () => {
  const recs = [R('careful', '조심해!', 2), R('watch out', '조심해', 2), R('apple', '사과', 2), R('run', '달리다', 2), R('jump', '뛰다', 2), R('big', '큰', 2)];
  for (let i = 0; i < 200; i++) {
    const q = wordQuestion(recs, seqRng(i, 200));
    assert.ok(q, `#${i}`);
    assert.ok(q.choices.length >= 3, `#${i}: 보기 ${q.choices.length}`);
    assert.equal(q.choices.filter((c) => c === q.meaning).length, 1, `#${i}: 정답 ${q.meaning} — ${q.choices}`);
    assert.equal(new Set(q.choices.map(KEY)).size, q.choices.length, `#${i}: 같은 뜻 보기 ${q.choices}`);
    const rec = recs.find((r) => r.word === q.word);
    assert.equal(rec.meaning, q.meaning, '문제 단어의 뜻이 정답');
  }
});

test('여러 번 본 단어(2번 이상)가 셋 이상이면 그 중에서 · 이번 배틀에 낸 단어는 다시 안 낸다', () => {
  const recs = [R('a1', '하나', 1), R('a2', '둘', 1), R('b1', '셋', 2), R('b2', '넷', 3), R('b3', '다섯', 5), R('b4', '여섯', 2)];
  const words = new Set();
  for (let i = 0; i < 100; i++) words.add(wordQuestion(recs, seqRng(i, 100)).word);
  assert.deepEqual([...words].sort(), ['b1', 'b2', 'b3', 'b4'], '두 번 이상 본 단어만');
  for (let i = 0; i < 100; i++) {
    const q = wordQuestion(recs, seqRng(i, 100), ['b1', 'b2']);
    assert.ok(!['b1', 'b2'].includes(q.word), `#${i}: 이미 낸 ${q.word}`);
  }
  // 두 번 이상 본 단어가 셋보다 적으면 한 번 본 단어도
  const few = [R('a1', '하나', 1), R('a2', '둘', 1), R('b1', '셋', 2), R('a3', '넷', 1)];
  const w2 = new Set();
  for (let i = 0; i < 100; i++) w2.add(wordQuestion(few, seqRng(i, 100)).word);
  assert.ok(w2.size >= 3, [...w2].join(','));
});
