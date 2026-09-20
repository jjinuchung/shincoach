// 🏠 과목 고르기 화면 로직: node --test tests/home.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SUBJECTS, pickMascot, subjectTarget } from '../js/home.js';
import { ROSTER } from '../js/pokemon.js';

test('과목 카드: 영어는 바로 들어가고, 수학은 아직 준비 중', () => {
  const eng = SUBJECTS.find((s) => s.key === 'english');
  const math = SUBJECTS.find((s) => s.key === 'math');
  assert.ok(eng && math, '두 과목이 있다');
  assert.equal(eng.ready, true);
  assert.equal(eng.view, 'library', '영어는 기존 라이브러리 화면 그대로');
  assert.equal(math.ready, true, '수학도 들어간다 (1차: 분수 줄기)');
  assert.equal(math.view, 'math');
});

test('마스코트는 명단에 있는 포켓몬이어야 한다 (없으면 그림도 이름도 못 찾는다)', () => {
  for (const s of SUBJECTS) {
    assert.ok(ROSTER.some((r) => r.id === s.mascot), `${s.key} 마스코트 #${s.mascot}가 명단에 있다`);
  }
  const ids = SUBJECTS.map((s) => s.mascot);
  assert.equal(new Set(ids).size, ids.length, '과목마다 다른 포켓몬');
});

test('pickMascot: 받아둔 그림이 있을 때만 쓰고, 없으면 null (엉뚱한 포켓몬으로 대신하지 않는다)', () => {
  const chars = [{ id: 39, url: 'blob:jigglypuff' }, { id: 25, url: 'blob:pikachu' }];
  assert.deepEqual(pickMascot(39, chars), { url: 'blob:jigglypuff', ko: '푸린' });
  assert.equal(pickMascot(65, chars), null, '아직 안 받은 그림은 null — 카드는 이모지로 그린다');
  assert.equal(pickMascot(39, []), null, '받아둔 그림이 하나도 없어도 터지지 않는다');
  assert.equal(pickMascot(39, null), null);
  assert.equal(pickMascot(0, chars), null);
  assert.equal(pickMascot(39, [{ id: 39 }]), null, 'url 없는 기록은 안 쓴다');
});

test('subjectTarget: 준비된 과목은 화면 이름, 아닌 과목은 안내 문구', () => {
  const eng = subjectTarget(SUBJECTS.find((s) => s.key === 'english'));
  assert.equal(eng.view, 'library');
  assert.equal(eng.hint, '');

  const math = subjectTarget(SUBJECTS.find((s) => s.key === 'math'));
  assert.equal(math.view, 'math');
  const soon = subjectTarget({ ready: false, view: null, emoji: '🔬', ko: '과학' });
  assert.equal(soon.view, null, '준비 중인 과목은 화면 전환을 안 한다');
  assert.match(soon.hint, /과학/);

  assert.deepEqual(subjectTarget(null), { view: null, hint: '' });
  assert.equal(subjectTarget({ ready: true, view: null }).view, null, 'ready여도 화면이 없으면 안 간다');
});
