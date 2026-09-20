// 🎮 퍼즐 캐릭터 명단·고르기 테스트: node --test tests/pokemon.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROSTER, pickCharacters, unlockedRoster, isUnlocked, nextUnlockLevel, unlockCountAt, headAnchor } from '../js/pokemon.js';

test('ROSTER: 101마리(처음 40 + Lv5·10·15에 20씩 + 자마젠타), id 중복 없음, 한글·영문 이름 있음', () => {
  assert.equal(ROSTER.length, 101);
  assert.equal(new Set(ROSTER.map((r) => r.id)).size, 101);
  assert.equal(unlockedRoster(1).length, 40);
  assert.equal(unlockedRoster(5).length, 60);
  assert.equal(unlockedRoster(14).length, 80);
  assert.equal(unlockedRoster(15).length, 101);
  assert.equal(ROSTER.find((r) => r.id === 889).ko, '자마젠타', '진우 요청 — 자시안의 짝');
  assert.equal(isUnlocked(25, 1), true, '피카츄는 처음부터');
  assert.equal(isUnlocked(129, 4), false, '잉어킹은 Lv5');
  assert.equal(isUnlocked(129, 5), true);
  assert.equal(nextUnlockLevel(1), 5); assert.equal(nextUnlockLevel(5), 10); assert.equal(nextUnlockLevel(15), 0);
  assert.equal(unlockCountAt(10), 20); assert.equal(unlockCountAt(7), 0);
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
  assert.equal(chars.length, 101, '원본 유지');
  assert.equal(pickCharacters(chars.slice(0, 3), 8).length, 3, '부족하면 있는 만큼');
  assert.deepEqual(pickCharacters([], 5), []);
  assert.deepEqual(pickCharacters(null, 5), []);
});

test('headAnchor: 그림에서 머리 꼭대기(불투명 픽셀 최상단의 가로 중심)를 찾는다', () => {
  const SIZE = 20;
  // 가짜 ImageData: 왼쪽 위에 작은 머리, 아래에 넓은 몸통 (라프라스처럼 머리가 중앙이 아닌 경우)
  const data = new Uint8ClampedArray(SIZE * SIZE * 4);
  const put = (x, y) => { data[(y * SIZE + x) * 4 + 3] = 255; };
  for (let x = 4; x <= 6; x++) for (let y = 2; y <= 5; y++) put(x, y);      // 머리: x 4~6, y 2부터
  for (let x = 2; x <= 17; x++) for (let y = 10; y <= 18; y++) put(x, y);   // 몸통: 아래 넓게
  const ctx = { getImageData: () => ({ data }) };
  const a = headAnchor(ctx, SIZE);
  assert.ok(a, '찾아야 함');
  assert.equal(a.y, 2 / SIZE, '가장 위쪽 줄');
  assert.ok(a.x > 0.2 && a.x < 0.36, `머리 쪽 가로 중심이어야 함 (몸통 중앙 0.5가 아니라): ${a.x}`);
});

test('headAnchor: 빈 그림이거나 읽을 수 없으면 null (기본 위치를 쓰게)', () => {
  const SIZE = 8;
  const empty = new Uint8ClampedArray(SIZE * SIZE * 4);
  assert.equal(headAnchor({ getImageData: () => ({ data: empty }) }, SIZE), null);
  assert.equal(headAnchor({ getImageData: () => { throw new Error('tainted'); } }, SIZE), null);
});
