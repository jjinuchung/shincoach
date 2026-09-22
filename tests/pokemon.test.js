// 🎮 퍼즐 캐릭터 명단·고르기 테스트: node --test tests/pokemon.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROSTER, pickCharacters, unlockedRoster, isUnlocked, nextUnlockLevel, unlockCountAt, headAnchor, subjectOf, forSubject, forPuzzle } from '../js/pokemon.js';

test('ROSTER: 311마리(영어 161 = 처음 40 + Lv5·10·15에 20씩 + 자마젠타 + 2026-09-20 흔함·보통 60 / 🔢 수학 전용 150), id 중복 없음, 한글·영문 이름 있음', () => {
  assert.equal(ROSTER.length, 311);
  assert.equal(new Set(ROSTER.map((r) => r.id)).size, 311);
  assert.equal(ROSTER.filter((r) => r.subject === 'math').length, 150, '수학 전용 150 (2026-09-22)');
  assert.equal(unlockedRoster(1).length, 250, '처음 40 + 추가 60 + 수학 150은 바로 잡을 수 있게');
  assert.equal(unlockedRoster(5).length, 270);
  assert.equal(unlockedRoster(14).length, 290);
  assert.equal(unlockedRoster(15).length, 311);
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
  assert.equal(chars.length, 311, '원본 유지');
  assert.equal(pickCharacters(chars.slice(0, 3), 8).length, 3, '부족하면 있는 만큼');
  assert.deepEqual(pickCharacters([], 5), []);
  assert.deepEqual(pickCharacters(null, 5), []);
});

test('🔢 과목 가르기: subject는 잡히는 곳만 — 영어 161·수학 150, forSubject는 그 과목만, forPuzzle은 영어 + 잡은 수학', () => {
  const en = ROSTER.filter((r) => subjectOf(r.id) === 'english');
  const ma = ROSTER.filter((r) => subjectOf(r.id) === 'math');
  assert.equal(en.length, 161); assert.equal(ma.length, 150);
  assert.equal(subjectOf(25), 'english', '피카츄는 영어');
  assert.equal(subjectOf(244), 'math', '앤테이는 수학');
  assert.equal(subjectOf(99999), 'english', '모르면 영어');
  const list = [{ id: 25 }, { id: 244 }, { id: 385 }, { id: 4 }];
  assert.deepEqual(forSubject(list, 'english').map((c) => c.id), [25, 4]);
  assert.deepEqual(forSubject(list, 'math').map((c) => c.id), [244, 385]);
  assert.deepEqual(forSubject(list).map((c) => c.id), [25, 244, 385, 4], 'subject 없으면 전체 (⚙ 연습·배틀)');
  assert.notEqual(forSubject(list), list, '원본과 다른 배열');
  assert.deepEqual(forPuzzle(list, (id) => id === 244).map((c) => c.id), [25, 244, 4], '잡은 수학 포켓몬은 퍼즐에 놀러 온다');
  assert.deepEqual(forPuzzle(list).map((c) => c.id), [25, 4], 'caught가 없으면 영어만');
  // 수학 전용은 전부 Lv1 — 사다리 밖에서도 잡히는 얼굴이 처음부터 보이게
  assert.ok(ma.every((r) => (r.unlock || 1) === 1));
  // 영상 광고(🎟️ LOCKED cast)나 마스코트(홈 카드)에 쓰는 얼굴이 수학 전용이면 표시가 어색하다 — 후딘·푸린·피카츄는 영어
  for (const id of [65, 39, 25]) assert.equal(subjectOf(id), 'english');
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
