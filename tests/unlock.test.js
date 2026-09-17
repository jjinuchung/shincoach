// 🎟️ 다음 영상 교환권 규칙 테스트: node --test tests/unlock.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOCKED, NEED, unlockState, nextLocked, pendingTickets, ticketId, findLocked } from '../js/unlock.js';

const recs = (done, reviewed) => [
  ...Array.from({ length: done }, (_, i) => ({ key: `d${i}`, done: true, reviewPass: i < reviewed ? 1 : 0 })),
];

test('🎟️ 조건 셋: 코인 · 전체 문장 80% · 복습 통과 60개', () => {
  const s = unlockState({ coins: 4000, records: recs(800, 60), totalCues: 1000, price: 4000 });
  assert.equal(s.total, 1000);
  assert.equal(s.done, 800);
  assert.equal(s.reviewed, 60);
  assert.deepEqual(s.items.map((i) => i.ok), [true, true, true]);
  assert.equal(s.ready, true, '셋 다 채우면 살 수 있다');
});

test('🎟️ 하나라도 모자라면 못 산다 (코인만으로는 안 됨)', () => {
  // 코인은 넘치는데 진도가 모자람 — "쉬운 영상만 반복해 코인만 모으는 길"을 막는 부분
  const rich = unlockState({ coins: 99999, records: recs(300, 60), totalCues: 1000, price: 4000 });
  assert.equal(rich.ready, false);
  assert.deepEqual(rich.items.map((i) => i.ok), [true, false, true]);
  assert.equal(rich.items[1].need, 800, '1000문장이면 800개 필요');

  // 진도는 다 했는데 복습을 안 함
  const lazy = unlockState({ coins: 99999, records: recs(1000, 10), totalCues: 1000, price: 4000 });
  assert.equal(lazy.ready, false);
  assert.equal(lazy.items[2].have, 10);
  assert.equal(lazy.items[2].need, NEED.reviewPassed);

  // 다 했는데 코인이 모자람
  const broke = unlockState({ coins: 100, records: recs(900, 80), totalCues: 1000, price: 4000 });
  assert.equal(broke.ready, false);
  assert.deepEqual(broke.items.map((i) => i.ok), [false, true, true]);
});

test('🎟️ 진행률은 올림 — 1문장 모자라도 못 산다', () => {
  const s = unlockState({ coins: 4000, records: recs(799, 60), totalCues: 1000, price: 4000 });
  assert.equal(s.items[1].need, 800);
  assert.equal(s.items[1].ok, false);
});

test('🎟️ 영상이 하나도 없으면 진도 조건은 0개 (조건이 막지 않는다)', () => {
  const s = unlockState({ coins: 4000, records: [], totalCues: 0, price: 4000 });
  assert.equal(s.items[1].need, 0);
  assert.equal(s.items[1].ok, true);
  assert.equal(s.items[1].pct, 100);
  assert.equal(s.items[2].ok, false, '복습 조건은 그대로 남는다');
});

test('🎟️ 진행 막대(pct)는 0~100으로 자른다', () => {
  const s = unlockState({ coins: 999999, records: recs(1000, 500), totalCues: 100, price: 10 });
  for (const it of s.items) assert.ok(it.pct >= 0 && it.pct <= 100, `${it.key} = ${it.pct}`);
});

test('🎟️ 다음에 보여줄 영상: 이미 산 건 빼고 싼 것부터', () => {
  assert.equal(nextLocked([]).id, LOCKED.slice().sort((a, b) => a.price - b.price)[0].id);
  const rest = nextLocked([LOCKED[0].id]);
  assert.notEqual(rest.id, LOCKED[0].id);
  assert.equal(nextLocked(LOCKED.map((c) => c.id)), null, '다 사면 없음');
});

test('🎟️ 아빠가 아직 안 넣어 준 영상을 📊에 알린다', () => {
  const inv = { [ticketId('gengar')]: 1 };
  const before = pendingTickets(inv, []);
  assert.equal(before.length, 1);
  assert.equal(before[0].delivered, false, '아직 태블릿에 없음');

  const after = pendingTickets(inv, [{ title: findLocked('gengar').ko }]);
  assert.equal(after[0].delivered, true, '제목이 같은 영상이 들어오면 완료');
  assert.equal(pendingTickets({}, []).length, 0, '산 게 없으면 알림 없음');
});

test('🎟️ 목록은 id가 겹치지 않고 값이 온전하다', () => {
  assert.equal(new Set(LOCKED.map((c) => c.id)).size, LOCKED.length);
  for (const c of LOCKED) {
    assert.ok(c.ko && c.en && c.blurb, c.id);
    assert.ok(c.price > 0 && Number.isInteger(c.price), c.id);
    assert.ok(c.poster > 0, `${c.id} 표지 포켓몬`);
    assert.ok(c.minutes > 0 && c.sentences > 0, c.id);
  }
});

// 표지는 실제 장면 캡처가 아니라 "나오는 포켓몬" — 저작물을 저장소에 두지 않으려는 것이라 규칙으로 고정
test('🎟️ 예고에는 나오는 포켓몬과 대사 한 줄이 있다', () => {
  for (const c of LOCKED) {
    assert.ok(Array.isArray(c.cast) && c.cast.length >= 3, `${c.id} 포켓몬 3마리 이상`);
    assert.equal(new Set(c.cast.map((m) => m.id)).size, c.cast.length, `${c.id} 겹침 없음`);
    for (const m of c.cast) {
      assert.ok(Number.isInteger(m.id) && m.id > 0, `${c.id} 그림 id`);
      assert.match(m.ko, /^[가-힣]+$/, `${c.id} 한국어 이름 (PokeAPI 공식명)`);
    }
    assert.ok(c.cast.some((m) => m.id === c.poster), `${c.id} 표지는 나오는 포켓몬 중 하나`);
    assert.ok(c.teaser && c.teaser.length <= 60, `${c.id} 대사 한 줄`);
    assert.match(c.teaser, /[a-z]/i, `${c.id} 영어 대사여야 배울 문장이 된다`);
  }
});

// ── Codex 리뷰에서 나온 것들 (2026-09-17) ──

test('🎟️ [P1] 지운 영상의 기록은 진행률에 안 센다 (지워서 조건을 채우지 못하게)', () => {
  // 지금 가진 영상 A(100문장) + 이미 지운 영상 B에서 한 80문장
  const now = Array.from({ length: 100 }, (_, i) => ({ key: `A|${i}`, itemId: 'A', done: false, reviewPass: 0 }));
  const gone = Array.from({ length: 80 }, (_, i) => ({ key: `B|${i}`, itemId: 'B', done: true, reviewPass: 1 }));
  const all = [...now, ...gone];

  // 거르지 않으면 80/80 → 조건 충족 (이 기능의 목적이 무효가 된다)
  const loose = unlockState({ coins: 9999, records: all, totalCues: 100, price: 1 });
  assert.equal(loose.items[1].ok, true, '(거르지 않으면 지운 영상으로 채워진다)');

  // 지금 가진 영상만 세면 0/80
  const tight = unlockState({ coins: 9999, records: all, totalCues: 100, price: 1, itemIds: ['A'] });
  assert.equal(tight.done, 0);
  assert.equal(tight.items[1].ok, false, '지운 영상 기록으로는 안 채워진다');
  assert.equal(tight.reviewed, 0, '복습 조건도 마찬가지');
});

test('🎟️ [P1] itemIds를 주면 분자와 분모가 같은 영상에서 나온다', () => {
  const recs = [
    { key: 'A|1', itemId: 'A', done: true, reviewPass: 1 },
    { key: 'A|2', itemId: 'A', done: true, reviewPass: 0 },
    { key: 'B|1', itemId: 'B', done: true, reviewPass: 1 },
  ];
  const s = unlockState({ coins: 0, records: recs, totalCues: 2, price: 0, itemIds: ['A'] });
  assert.equal(s.done, 2, 'A의 문장만');
  assert.equal(s.reviewed, 1);
  assert.equal(s.total, 2);
});
