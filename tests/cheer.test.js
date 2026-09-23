// ✨ 응원 포켓몬 규칙 테스트: node --test tests/cheer.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldCheer, pickCheerer, pickLine, pickSide,
  CHANCE, CHANCE_AFTER_WRONG, COOLDOWN, MAX_PER_DAY, LINES, LINES_WRONG,
} from '../js/cheer.js';

const always = () => 0;      // 확률을 항상 통과
const never = () => 0.999;   // 항상 빗나감

test('shouldCheer: 틀린 직후가 더 자주 (지겹고 속상할 때가 제일 필요한 순간)', () => {
  assert.ok(CHANCE_AFTER_WRONG > CHANCE, '틀렸을 때 확률이 더 높아야 한다');
  // CHANCE(0.18)와 CHANCE_AFTER_WRONG(0.5) 사이의 값이면 틀렸을 때만 나온다
  const between = () => (CHANCE + CHANCE_AFTER_WRONG) / 2;
  assert.equal(shouldCheer({ wrong: false, rng: between }), false);
  assert.equal(shouldCheer({ wrong: true, rng: between }), true);
});

test('shouldCheer: 쿨다운 중·하루 상한이면 안 나온다', () => {
  assert.equal(shouldCheer({ cooldown: 1, rng: always }), false, '쿨다운 중');
  assert.equal(shouldCheer({ todayCount: MAX_PER_DAY, rng: always }), false, '하루 상한');
  assert.equal(shouldCheer({ todayCount: MAX_PER_DAY - 1, rng: always }), true);
  assert.equal(shouldCheer({ rng: never }), false, '확률이 빗나감');
  assert.equal(shouldCheer({ rng: always }), true);
  assert.ok(COOLDOWN >= 1 && MAX_PER_DAY >= 1);
});

test('pickCheerer: 그림이 있는 잡은 포켓몬만 (그림이 없으면 빈 자리가 걸어간다)', () => {
  const mine = [{ id: 1, url: 'a' }, { id: 2, url: '' }, { id: 3, url: 'c' }];
  for (let i = 0; i < 20; i++) {
    const got = pickCheerer(mine, null, () => i / 20);
    assert.ok(got && got.url, '그림 없는 것은 안 고른다');
    assert.notEqual(got.id, 2);
  }
  assert.equal(pickCheerer([], 1, always), null, '잡은 게 없으면 없음');
  assert.equal(pickCheerer(null, 1, always), null);
  assert.equal(pickCheerer([{ id: 5 }], null, always), null, '그림이 하나도 없으면 없음');
});

test('pickCheerer: 파트너가 절반쯤 나오되 다른 애들도 섞인다', () => {
  const mine = [{ id: 1, url: 'a' }, { id: 2, url: 'b' }, { id: 3, url: 'c' }];
  assert.equal(pickCheerer(mine, 2, () => 0.1).id, 2, '절반 확률에 걸리면 파트너');
  assert.notEqual(pickCheerer(mine, 2, () => 0.9).id, undefined, '안 걸리면 아무나');
  // 파트너가 목록에 없으면(잃었거나 안 잡음) 그냥 아무나
  assert.ok(pickCheerer(mine, 99, () => 0.1));
});

test('pickLine: 방금 한 말은 안 나온다 (같은 말이 연달아 나오면 시시하다)', () => {
  const first = LINES[0].ko;
  for (let i = 0; i < 20; i++) {
    const got = pickLine(false, first, () => i / 20);
    assert.notEqual(got.ko, first);
  }
  // 문구가 하나뿐인 상황이어도 무언가는 돌려준다
  assert.ok(pickLine(false, 'x', always).ko);
});

test('pickLine: 틀린 직후에는 "잘한다" 대신 다독이는 말', () => {
  for (let i = 0; i < 10; i++) {
    const got = pickLine(true, '', () => i / 10);
    assert.ok(LINES_WRONG.some((l) => l.ko === got.ko), `${got.ko} 는 틀렸을 때 문구여야 한다`);
  }
  // 틀린 자리에 "멋지다!" 같은 칭찬이 섞이면 비꼬는 말로 들린다
  assert.ok(!LINES_WRONG.some((l) => /멋지다|최고|잘하는데/.test(l.ko)));
});

test('문구: 한글과 영어가 짝으로 있고, 빈 것이 없다', () => {
  for (const l of [...LINES, ...LINES_WRONG]) {
    assert.ok(l.ko && l.ko.length <= 20, `한글이 짧아야 한다: ${l.ko}`);
    assert.ok(l.en && /^[\x20-\x7E]+$/.test(l.en), `영어는 아스키만: ${l.en}`);
  }
  const kos = [...LINES, ...LINES_WRONG].map((l) => l.ko);
  assert.equal(new Set(kos).size, kos.length, '같은 말이 두 번 있으면 안 된다');
});

test('pickSide: 양쪽에서 들어온다', () => {
  assert.equal(pickSide(() => 0.1), 'left');
  assert.equal(pickSide(() => 0.9), 'right');
});
