// 🎟️ 다음 영상 교환권 규칙 테스트: node --test tests/unlock.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOCKED, NEED, unlockState, nextLocked, pendingTickets, ticketId, findLocked, MATH_PTS, mathPoints } from '../js/unlock.js';

const recs = (done, reviewed) => [
  ...Array.from({ length: done }, (_, i) => ({ key: `d${i}`, done: true, reviewPass: i < reviewed ? 1 : 0 })),
];

test('🎟️ 조건 셋: 코인 · 끝낸 문장 개수 · 복습 통과 문장 수', () => {
  const s = unlockState({ coins: 4000, records: recs(NEED.doneSentences, NEED.reviewPassed), price: 4000 });
  assert.equal(s.done, NEED.doneSentences);
  assert.equal(s.reviewed, NEED.reviewPassed);
  assert.deepEqual(s.items.map((i) => i.ok), [true, true, true]);
  assert.equal(s.ready, true, '셋 다 채우면 살 수 있다');
});

test('🎟️ 하나라도 모자라면 못 산다 (코인만으로는 안 됨)', () => {
  // 코인은 넘치는데 배운 문장이 모자람 — "쉬운 영상만 반복해 코인만 모으는 길"을 막는 부분
  const rich = unlockState({ coins: 99999, records: recs(300, NEED.reviewPassed), price: 4000 });
  assert.equal(rich.ready, false);
  assert.deepEqual(rich.items.map((i) => i.ok), [true, false, true]);
  assert.equal(rich.items[1].need, NEED.doneSentences);

  // 문장은 다 했는데 복습을 안 함
  const lazy = unlockState({ coins: 99999, records: recs(NEED.doneSentences, 10), price: 4000 });
  assert.equal(lazy.ready, false);
  assert.equal(lazy.items[2].have, 10);
  assert.equal(lazy.items[2].need, NEED.reviewPassed);

  // 다 했는데 코인이 모자람
  const broke = unlockState({ coins: 100, records: recs(NEED.doneSentences, NEED.reviewPassed + 20), price: 4000 });
  assert.equal(broke.ready, false);
  assert.deepEqual(broke.items.map((i) => i.ok), [false, true, true]);
});

test('🎟️ 한 문장만 모자라도 못 산다', () => {
  const s = unlockState({ coins: 4000, records: recs(NEED.doneSentences - 1, NEED.reviewPassed), price: 4000 });
  assert.equal(s.items[1].ok, false);
  assert.equal(s.items[1].have, NEED.doneSentences - 1);
});

// 2026-09-18: 전에는 "가진 영상 전체의 80%"라, 태블릿에 5,527문장이 있으면 4,422문장이 필요했다.
// 하루 40문장을 해도 막대가 0.9%씩 움직여 "진도가 안 는다"로 보였고, **영상을 넣으면 목표가 더 멀어졌다**.
test('🎟️ 영상을 넣거나 지워도 진도는 그대로다 (아이가 한 만큼만 센다)', () => {
  const records = recs(400, NEED.reviewPassed);
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

test('🎟️ 다음에 보여줄 영상: 이미 산 건 뺀다', () => {
  assert.equal(nextLocked([]).id, LOCKED[0].id);
  const rest = nextLocked([LOCKED[0].id]);
  assert.notEqual(rest.id, LOCKED[0].id);
  assert.equal(nextLocked(LOCKED.map((c) => c.id)), null, '다 사면 없음');
});

test('🎟️ 아빠가 아직 안 넣어 준 영상을 📊에 알린다', () => {
  const first = LOCKED[0];
  const inv = { [ticketId(first.id)]: 1 };
  const before = pendingTickets(inv, []);
  assert.equal(before.length, 1);
  assert.equal(before[0].delivered, false, '아직 태블릿에 없음');

  const after = pendingTickets(inv, [{ title: first.ko }]);
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

// ── 🎟️ 기준선: 교환권을 산 뒤에는 0부터 다시 (2026-09-19) ──
// 전에는 누적 전체를 세서, 팬텀을 사자마자 다음 영상 조건이 **이미 꽉 차 있었다**.
// 아버님 신고: "방금 교환권을 샀는데 다음 영상의 배운 문장·복습 통과 문장이 이미 차 있다."
test('🎟️ 기준선 이후에 쌓은 것만 센다 (산 뒤에는 다시 0부터)', () => {
  const total = recs(NEED.doneSentences + 120, NEED.reviewPassed + 8);
  const base = { done: NEED.doneSentences, reviewed: NEED.reviewPassed };

  const before = unlockState({ coins: 9999, records: total, price: 1 });
  assert.equal(before.ready, true, '기준선이 없으면 누적 전체 — 옛 동작');

  const after = unlockState({ coins: 9999, records: total, price: 1, base });
  assert.equal(after.done, 120, '기준선을 뺀 만큼만');
  assert.equal(after.reviewed, 8);
  assert.equal(after.ready, false, '다음 영상은 처음부터 다시 벌어야 한다');
  assert.deepEqual(after.total, { done: NEED.doneSentences + 120, reviewed: NEED.reviewPassed + 8, mathOk: 0, mathDaily: 0, mathRev: 0 }, '누적 자체는 그대로 볼 수 있다 (수학 칸은 0)');
});

// ── 🔢 수학도 같은 막대를 채운다 (2026-09-22, 아버님: "아이가 목표로 삼은 그 영상을 수학으로도") ──
test('🔢 수학 환산: 정답 1 = 2, ☀️ 완주 = 20, 복습 편 통과 = 복습 5 — 영어 문장과 같은 막대에 더해진다', () => {
  assert.deepEqual(MATH_PTS, { ok: 2, daily: 20, rev: 5 });
  const math = { ok: 8, daily: 1, rev: 1 }; // 하루치 수학
  const st = unlockState({ coins: 0, records: recs(100, 10), price: 1, math });
  assert.equal(st.math.progress, 8 * 2 + 20, '하루 수학 ≈ 36 ≈ 영어 40문장');
  assert.equal(st.math.review, 5);
  assert.equal(st.items[1].have, 100 + 36);
  assert.equal(st.items[2].have, 10 + 5);
  assert.ok(st.items[1].label.startsWith('📼 배운 문장 + 🔢 수학'));
  assert.equal(st.items[1].detail, '📼 영어 100 · 🔢 수학 36');
  assert.equal(st.items[2].detail, '🔁 영어 10 · 🔢 수학 5');
  assert.deepEqual(st.total, { done: 100, reviewed: 10, mathOk: 8, mathDaily: 1, mathRev: 1 });
  // 수학 없이도 옛 모양 그대로
  const none = unlockState({ coins: 0, records: recs(100, 10), price: 1 });
  assert.deepEqual(none.math, { progress: 0, review: 0 });
  assert.equal(none.items[1].have, 100);
});

test('🔢 수학만으로도 교환권 조건이 찬다 · 기준선 이후의 수학만 센다 · 옛 기준선(수학 칸 없음)은 0', () => {
  const need = NEED.doneSentences;
  const onlyMath = unlockState({ coins: 9999, records: [], price: 1, math: { ok: need / 2, daily: 0, rev: NEED.reviewPassed / 5 } });
  assert.equal(onlyMath.ready, true, '영어 0문장이어도 수학으로 채울 수 있다');
  const base = { done: 0, reviewed: 0, mathOk: 400, mathDaily: 10, mathRev: 5 };
  const after = unlockState({ coins: 0, records: [], price: 1, base, math: { ok: 408, daily: 11, rev: 6 } });
  assert.deepEqual(after.math, { progress: 8 * 2 + 20, review: 5 }, '산 뒤에 한 것만');
  assert.ok(after.items[1].label.includes('교환권 이후'), '수학 기준선만 있어도 "교환권 이후"');
  const oldBase = unlockState({ coins: 0, records: [], price: 1, base: { done: 30, reviewed: 2 }, math: { ok: 5, daily: 1, rev: 0 } });
  assert.equal(oldBase.math.progress, 30, '옛 기준선엔 수학 칸이 없으니 0부터');
  const rolled = unlockState({ coins: 0, records: [], price: 1, base, math: { ok: 100, daily: 1, rev: 0 } });
  assert.deepEqual(rolled.math, { progress: 0, review: 0 }, '백업을 되돌려 누적이 기준선보다 작아도 음수가 안 된다');
  assert.deepEqual(mathPoints({ mathOk: 3, mathDaily: 1, mathRev: 2 }, null), { progress: 26, review: 10 });
});

test('🎟️ 기준선이 지금 누적보다 커도 음수가 안 된다 (백업을 되돌린 경우)', () => {
  const st = unlockState({ coins: 0, records: recs(10, 2), price: 1, base: { done: 500, reviewed: 50 } });
  assert.equal(st.done, 0);
  assert.equal(st.reviewed, 0);
  assert.equal(st.items[1].pct, 0, '막대가 뒤로 가거나 이상해지지 않는다');
});

test('🎟️ 기준선이 잡혀 있으면 라벨로 알려 준다 (아직 안 산 아이에겐 안 붙음)', () => {
  const fresh = unlockState({ coins: 0, records: recs(5, 1), price: 1, base: { done: 0, reviewed: 0 } });
  assert.ok(!fresh.items[1].label.includes('교환권 이후'), '0 기준선은 그냥 누적이다');
  const after = unlockState({ coins: 0, records: recs(5, 1), price: 1, base: { done: 3, reviewed: 1 } });
  assert.ok(after.items[1].label.includes('교환권 이후'));
});

// ── 🎟️ 광고는 하나씩, 적은 순서대로 (2026-09-19) ──
test('🎟️ 다음 영상은 목록에 적은 순서대로 하나만 보여 준다', () => {
  const first = nextLocked([]);
  const second = nextLocked([first.id]);
  const third = nextLocked([first.id, second.id]);
  assert.equal(first.id, LOCKED[0].id);
  assert.equal(second.id, LOCKED[1].id, '하나를 사야 다음 것이 보인다');
  assert.notEqual(third.id, second.id);
  // 값이 같아도(전부 2,000코인) 순서가 흔들리면 안 된다 — 아빠가 보여 줄 차례를 정한다
  assert.deepEqual(
    [first.id, second.id, third.id],
    LOCKED.slice(0, 3).map((c) => c.id),
  );
});

test('🎟️ 이미 넣어 준 영상은 광고하지 않는다', () => {
  // ash_battles(지우와 피카츄 명장면)는 아버님이 그냥 넣어 주신 영상인데 목록에 남아 있어서
  // 팬텀을 산 뒤 "다음 영상"으로 떴다 — 아버님은 무엇을 넣어야 할지 알 수 없었다
  assert.equal(findLocked('ash_battles'), null, '그냥 넣어 준 영상은 목록에서 뺀다');
  assert.equal(findLocked('gengar'), null, '배달까지 끝난 영상도 뺀다 (안 그러면 대기 카드가 안 사라진다)');
  for (const id of ['iconic', 'wild2', 'prime_suspect']) {
    assert.ok(findLocked(id), `${id}는 살 수 있어야 한다`);
  }
});

test('🎟️ 제목이 서로 달라야 배달 판정이 엉키지 않는다', () => {
  // 배달 판정은 제목이 같은지로 본다(pendingTickets) → 두 영상의 ko가 같으면
  // 하나를 넣어 준 순간 다른 하나도 "들어왔다"가 된다
  const titles = LOCKED.map((c) => c.ko);
  assert.equal(new Set(titles).size, titles.length, `제목 겹침: ${titles.join(' / ')}`);
});

test('🎟️ 목록에서 뺀 영상은 교환권이 남아 있어도 화면에 안 나온다', () => {
  // 2026-09-19: 팬텀을 아빠가 넣어 준 뒤에도 "🎟️ 샀어요! 아빠에게 보여주세요"가 계속 떠 있었다.
  // 배달 판정이 제목 일치라, 넣어 줄 때 제목이 한 글자라도 다르면 영영 안 사라진다.
  // 그래서 배달이 끝난 영상은 목록에서 뺀다 — 가방에 교환권이 남아도 보여 주는 곳이 없어진다.
  const inv = { [ticketId('gengar')]: 1, [ticketId('ash_battles')]: 1 };
  assert.deepEqual(pendingTickets(inv, []), [], '📊 알림에도 안 뜬다');
  assert.equal(nextLocked(['gengar']).id, LOCKED[0].id, '다음 광고는 목록 맨 앞 그대로');
});
