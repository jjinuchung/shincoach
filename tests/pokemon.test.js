// 🎮 퍼즐 캐릭터 명단·고르기 테스트: node --test tests/pokemon.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROSTER, pickCharacters } from '../js/pokemon.js';

test('ROSTER: 30마리, id 중복 없음, 한글·영문 이름 있음', () => {
  assert.equal(ROSTER.length, 30);
  assert.equal(new Set(ROSTER.map((r) => r.id)).size, 30);
  for (const r of ROSTER) {
    assert.ok(Number.isInteger(r.id) && r.id > 0, `id ${r.id}`);
    assert.ok(r.ko && r.en, `이름 ${r.id}`);
  }
  assert.equal(ROSTER.find((r) => r.id === 25).ko, '피카츄');
});

test('pickCharacters: n마리를 겹치지 않게, 부족하면 있는 만큼, 원본은 그대로', () => {
  const chars = ROSTER.map((r) => ({ id: r.id, ko: r.ko, url: `blob:${r.id}` }));
  const picked = pickCharacters(chars, 8, () => 0.5);
  assert.equal(picked.length, 8);
  assert.equal(new Set(picked.map((c) => c.id)).size, 8, '중복 없음');
  assert.equal(chars.length, 30, '원본 유지');
  assert.equal(pickCharacters(chars.slice(0, 3), 8).length, 3, '부족하면 있는 만큼');
  assert.deepEqual(pickCharacters([], 5), []);
  assert.deepEqual(pickCharacters(null, 5), []);
});
