// 🎟️ 다음 영상 교환권 규칙 테스트: node --test tests/unlock.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOCKED, NEED, unlockState, nextLocked, pendingTickets, ticketId, findLocked } from '../js/unlock.js';

const recs = (done, reviewed) => [
  ...Array.from({ length: done }, (_, i) => ({ key: `d${i}`, done: true, reviewPass: i < reviewed ? 1 : 0 })),
];

test('🎟️ 조건 셋: 코인 · 끝낸 문장 개수 · 복습 통과 60개', () => {
  const s = unlockState({ coins: 4000, records: recs(NEED.doneSentences, 60), price: 4000 });
  assert.equal(s.done, NEED.doneSentences);
  assert.equal(s.reviewed, 60);
  assert.deepEqual(s.items.map((i) => i.ok), [true, true, true]);
  assert.equal(s.ready, true, '셋 다 채우면 살 수 있다');
});

test('🎟️ 하나라도 모자라면 못 산다 (코인만으로는 안 됨)', () => {
  // 코인은 넘치는데 배운 문장이 모자람 — "쉬운 영상만 반복해 코인만 모으는 길"을 막는 부분
  const rich = unlockState({ coins: 99999, records: recs(300, 60), price: 4000 });
  assert.equal(rich.ready, false);
  assert.deepEqual(rich.items.map((i) => i.ok), [true, false, true]);
  assert.equal(rich.items[1].need, NEED.doneSentences);

  // 문장은 다 했는데 복습을 안 함
  const lazy = unlockState({ coins: 99999, records: recs(NEED.doneSentences, 10), price: 4000 });
  assert.equal(lazy.ready, false);
  assert.equal(lazy.items[2].have, 10);
  assert.equal(lazy.items[2].need, NEED.reviewPassed);

  // 다 했는데 코인이 모자람
  const broke = unlockState({ coins: 100, records: recs(NEED.doneSentences, 80), price: 4000 });
  assert.equal(broke.ready, false);
  assert.deepEqual(broke.items.map((i) => i.ok), [false, true, true]);
});

test('🎟️ 한 문장만 모자라도 못 산다', () => {
  const s = unlockState({ coins: 4000, records: recs(NEED.doneSentences - 1, 60), price: 4000 });
  assert.equal(s.items[1].ok, false);
  assert.equal(s.items[1].have, NEED.doneSentences - 1);
});

// 2026-09-18: 전에는 "가진 영상 전체의 80%"라, 태블릿에 5,527문장이 있으면 4,422문장이 필요했다.
// 하루 40문장을 해도 막대가 0.9%씩 움직여 "진도가 안 는다"로 보였고, **영상을 넣으면 목표가 더 멀어졌다**.
test('🎟️ 영상을 넣거나 지워도 진도는 그대로다 (아이가 한 만큼만 센다)', () => {
  const records = recs(400, 60);
  const before = unlockState({ coins: 4000, records, price: 4000 });
  // 새 영상 3편(214문장)을 넣은 상황 — 예전 규칙이면 목표가 171문장 더 멀어졌다
  const after = unlockState({ coins: 4000, records, price: 4000 });
  assert.equal(after.items[1].need, before.items[1].need, '목표가 안 밀린다');
  assert.equal(after.items[1].have, before.items[1].have);

  // 어려운 영화를 지워도 숫자가 줄지 않고, 늘지도 않는다 (예전 "삭제로 조건 채우기" 구멍이 없다)
  const deleted = unlockState({ coins: 4000, records, price: 4000 });
  assert.equal(deleted.items[1].have, 400, '지운 영상의 기록도 아이가 배운 것이라 그대로 센다');
});

test('🎟️ 아직 아무것도 안 했으면 진도 0 (조건이 열려 있지 않다)', () => {
  const s = unlockState({ coins: 4000, records: [], price: 4000 });
  assert.equal(s.items[1].have, 0);
  assert.equal(s.items[1].ok, false, '문장을 배워야 열린다');
  assert.equal(s.items[2].ok, false, '복습 조건도 그대로 남는다');
});

test('🎟️ 진행 막대(pct)는 0~100으로 자른다', () => {
  const s = unlockState({ coins: 999999, records: recs(2000, 500), price: 10 });
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

// ── 옛 규칙(비율) 시절의 구멍들이 왜 없어졌는지 ──
// 2026-09-17에는 "가진 영상 전체의 80%"라 분자·분모를 같은 집합에서 뽑아야 했다.
// 그때 Codex가 찾은 구멍: `deleteItem`이 문장 기록을 안 지우므로 **어려운 영화를 지우면**
// 그 기록이 분자에 남고 분모에서만 빠져 진행률이 저절로 채워졌다.
// 2026-09-18에 개수로 바꾸면서 분모 자체가 없어져 이 구멍은 구조적으로 사라졌다.
test('🎟️ 영상을 지워도 조건이 저절로 채워지지 않는다 (옛 구멍이 다시 생기지 않게)', () => {
  const gone = Array.from({ length: 80 }, (_, i) => ({ key: `B|${i}`, itemId: 'B', done: true, reviewPass: 1 }));
  const st = unlockState({ coins: 9999, records: gone, price: 1 });
  assert.equal(st.done, 80, '배운 문장 수는 그대로 (지운다고 늘지 않는다)');
  assert.equal(st.items[1].ok, false, `80문장으로는 ${NEED.doneSentences}문장 조건을 못 채운다`);
  assert.equal(st.items[1].need, NEED.doneSentences, '목표는 영상과 무관한 고정 숫자');
});

test('🎟️ 조건 수치는 아이가 며칠이면 닿는 크기여야 한다', () => {
  // 하루 40문장이면 25일. 비율이던 시절에는 4,422문장(3~4개월)이라 막대가 하루 0.9%씩 움직였다.
  assert.ok(NEED.doneSentences >= 300 && NEED.doneSentences <= 2000, `문장 목표 ${NEED.doneSentences}`);
  assert.ok(NEED.reviewPassed >= 20 && NEED.reviewPassed <= 200, `복습 목표 ${NEED.reviewPassed}`);
  assert.equal(NEED.progress, undefined, '비율 규칙은 없앴다 (영상을 넣으면 목표가 멀어졌다)');
});
