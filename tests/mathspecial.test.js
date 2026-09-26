// 💎 스페셜 문제: node --test tests/mathspecial.test.js
//
// ★ 여기서 하는 검산은 **생성기와 따로** 계산해 맞춰 보는 것이다.
//   생성기가 답을 셈하는 코드로 다시 검산하면 그 코드의 버그를 못 잡는다 (분수 때 6/36 사고).
//   그래서 문제 글·식을 **파싱해서** 처음부터 다시 푼다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KINDS, KIND_IDS, BADGE_NEED, kindOf, makeSpecial, makeSpecialRound, say } from '../js/mathspecial.js';
import { KIND_IDS as SP_KIND_IDS } from '../js/mathspecial.js';
import { applySpecialRound, badgesOf, spPass, spRounds, claimGym, gymClaimed, tallyRound } from '../js/mathprog.js';
import { cloneMath as cloneProfileMath, mergeMath } from '../js/db.js';

/** 분수 글("4 2/10", "3/5", "2") → 값. 테스트 전용 파서 (생성기와 무관) */
function val(t) {
  const s = String(t).trim();
  let m = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (m) return +m[1] + +m[2] / +m[3];
  m = s.match(/^(\d+)\/(\d+)$/);
  if (m) return +m[1] / +m[2];
  m = s.match(/^\d+$/);
  if (m) return +s;
  return NaN;
}
const okOf = (q) => q.choices.find((c) => c.ok);
const SEEDS = 6000;

test('💎 여덟 얼굴 = 🏅 배지 여덟 개, id가 겹치지 않는다', () => {
  assert.equal(KINDS.length, 8);
  assert.equal(new Set(KIND_IDS).size, 8);
  assert.equal(new Set(KINDS.map((k) => k.gym)).size, 8, '체육관 이름도 겹치면 안 된다');
  for (const k of KINDS) {
    assert.ok(k.ko && k.hint, `${k.id}: 이름·힌트`);
    assert.equal(kindOf(k.id).id, k.id);
  }
  assert.ok(BADGE_NEED >= 2, '한 번에 배지를 주면 너무 쉽다');
});

test('💎 모든 얼굴이 어떤 씨앗에서도 문항을 만든다 (보기 4개·정답 하나)', () => {
  for (const id of KIND_IDS) {
    let made = 0;
    for (let s = 1; s <= 300; s++) {
      const q = makeSpecial(id, s * 7717, {});
      if (!q) continue;
      made++;
      assert.equal(q.choices.length, 4, `${id} seed=${s}`);
      assert.equal(q.choices.filter((c) => c.ok).length, 1, `${id} seed=${s}: 정답은 하나`);
      assert.ok(q.q && q.q.length > 10, `${id}: 문제 글`);
      assert.ok(q.solve && q.solve.steps.length >= 2, `${id}: 풀이 단계`);
      // 보기끼리 값이 겹치면 안 된다 (겹치면 정답이 둘이 된다)
      const seen = new Set();
      for (const c of q.choices) {
        const v = val(c.text);
        const keyv = Number.isNaN(v) ? c.text : v;
        assert.ok(!seen.has(keyv), `${id} seed=${s}: 보기 값이 겹친다 (${c.text})`);
        seen.add(keyv);
      }
      // 오답에는 "왜 틀렸는지" 이름표가 있어야 📊 진단이 된다
      for (const c of q.choices.filter((x) => !x.ok)) assert.ok(c.tag, `${id} seed=${s}: 오답 이름표`);
    }
    assert.ok(made >= 280, `${id}: 300개 중 ${made}개만 만들어졌다`);
  }
});

test('🔄 거꾸로 생각하기: 바른 값 = 잘못된 값 − 빼는 수 × 2 (따로 계산해 대조)', () => {
  for (let s = 1; s <= SEEDS; s++) {
    const q = makeSpecial('reverse', s * 3313, {});
    if (!q) continue;
    const m = q.expr.match(/^□ \+ (.+) = (.+)$/);
    assert.ok(m, `seed=${s}: 식 모양`);
    const b = val(m[1]);
    const wrong = val(m[2]);
    const expect = wrong - 2 * b;
    assert.ok(Math.abs(val(okOf(q).text) - expect) < 1e-9, `seed=${s}: ${okOf(q).text} ≠ ${expect}`);
    assert.ok(expect > 0, `seed=${s}: 답이 0 이하면 4학년 범위 밖`);
  }
});

test('🎴 카드 고르기: 큰(작은) 세 장의 합과 같다', () => {
  for (let s = 1; s <= SEEDS; s++) {
    const q = makeSpecial('cards', s * 5171, {});
    if (!q) continue;
    const cards = q.expr.split('·').map((t) => val(t));
    assert.equal(cards.length, 5, `seed=${s}: 카드 다섯 장`);
    const big = q.q.includes('가장 큰');
    const sorted = [...cards].sort((a, b) => b - a);
    const three = big ? sorted.slice(0, 3) : sorted.slice(-3);
    const expect = three.reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(val(okOf(q).text) - expect) < 1e-9, `seed=${s}: ${okOf(q).text} ≠ ${expect}`);
  }
});

test('🔍 바르게 계산한 것 찾기: 정답 목록이 실제 계산과 **정확히** 일치한다', () => {
  for (let s = 1; s <= SEEDS; s++) {
    const q = makeSpecial('findok', s * 977, {});
    if (!q) continue;
    const listed = okOf(q).text.split(',').map((t) => t.trim());
    const realOk = [];
    for (const row of q.expr.split('\n')) {
      const m = row.match(/^(\S) (.+) − (.+) = (.+)$/);
      assert.ok(m, `seed=${s}: 식 모양 (${row})`);
      const left = val(m[2]) - val(m[3]);
      if (Math.abs(left - val(m[4])) < 1e-9) realOk.push(m[1]);
    }
    assert.deepEqual(listed, realOk, `seed=${s}: 정답 목록이 거짓이다 — ${q.expr.replace(/\n/g, ' / ')}`);
    assert.ok(realOk.length >= 1 && realOk.length <= 3, `seed=${s}: 맞는 식이 ${realOk.length}개면 문제가 안 된다`);
  }
});

test('🔢 조건에 맞는 수 모두: 부등식을 직접 풀어 합과 대조', () => {
  for (let s = 1; s <= SEEDS; s++) {
    const q = makeSpecial('howmany', s * 6577, {});
    if (!q) continue;
    const m = q.expr.match(/^(\d+)\/(\d+) \+ □\/(\d+) < (.+)$/);
    assert.ok(m, `seed=${s}: 식 모양 (${q.expr})`);
    const a = +m[1];
    const d = +m[2];
    assert.equal(+m[3], d, `seed=${s}: 분모가 같아야 한다`);
    const limit = val(m[4]) * d;
    let sum = 0;
    for (let box = 1; ; box++) {
      if (a + box >= limit - 1e-9) break; // < 이므로 같아지면 안 된다
      sum += box;
    }
    assert.equal(Number(okOf(q).text), sum, `seed=${s}: ${okOf(q).text} ≠ ${sum}`);
    assert.ok(sum > 0, `seed=${s}: 들어갈 수가 하나는 있어야 한다`);
  }
});

test('📏 수직선 읽기: 전체 − 오른쪽', () => {
  for (let s = 1; s <= SEEDS; s++) {
    const q = makeSpecial('numline', s * 4441, {});
    if (!q) continue;
    const m = q.q.match(/전체 길이는 (.+?)이고, 오른쪽 부분은 (.+?)이에요/);
    assert.ok(m, `seed=${s}: 문제 글`);
    const expect = val(m[1]) - val(m[2]);
    assert.ok(Math.abs(val(okOf(q).text) - expect) < 1e-9, `seed=${s}: ${okOf(q).text} ≠ ${expect}`);
    assert.ok(expect > 0, `seed=${s}: 왼쪽이 0 이하면 안 된다`);
  }
});

test('🧩 겹쳐 잇기: 한 장 × 장수 − 겹침 × (장수 − 1)', () => {
  for (let s = 1; s <= SEEDS; s++) {
    const q = makeSpecial('overlap', s * 8221, {});
    if (!q) continue;
    const m = q.q.match(/길이가 (.+?) m인 .+? (\d+)장을 (.+?) m씩 겹치게/);
    assert.ok(m, `seed=${s}: 문제 글 (${q.q})`);
    const one = val(m[1]);
    const sheets = +m[2];
    const lap = val(m[3]);
    const expect = one * sheets - lap * (sheets - 1);
    assert.ok(Math.abs(val(okOf(q).text) - expect) < 1e-9, `seed=${s}: ${okOf(q).text} ≠ ${expect}`);
    assert.ok(lap < one, `seed=${s}: 겹치는 길이가 한 장보다 길 수 없다`);
  }
});

test('🎁 합과 차로 두 수: 큰 수 = (합 + 차) ÷ 2, 두 수 모두 진분수', () => {
  for (let s = 1; s <= SEEDS; s++) {
    const q = makeSpecial('sumdiff', s * 2939, {});
    if (!q) continue;
    const m = q.expr.match(/^□ \+ △ = (.+?)\s+□ − △ = (.+)$/);
    assert.ok(m, `seed=${s}: 식 모양 (${q.expr})`);
    const sum = val(m[1]);
    const diff = val(m[2]);
    const big = (sum + diff) / 2;
    const small = (sum - diff) / 2;
    assert.ok(Math.abs(val(okOf(q).text) - big) < 1e-9, `seed=${s}: ${okOf(q).text} ≠ ${big}`);
    assert.ok(small > 0, `seed=${s}: 작은 수가 0 이하`);
    assert.ok(big < 1, `seed=${s}: 진분수라고 했는데 ${big}`);
    assert.ok(Math.abs(big - small - diff) < 1e-9, `seed=${s}: 차가 안 맞는다`);
  }
});

test('📐 규칙 찾기: 같은 크기씩 커지고, ⊙ 자리 값이 맞다', () => {
  for (let s = 1; s <= SEEDS; s++) {
    const q = makeSpecial('pattern', s * 1553, {});
    if (!q) continue;
    const parts = q.expr.split(',').map((t) => t.trim());
    assert.equal(parts.length, 7, `seed=${s}: 일곱 칸`);
    const hole = parts.indexOf('⊙');
    assert.ok(hole > 0 && hole < 6, `seed=${s}: ⊙ 자리 (${hole})`);
    const nums = parts.map((t) => (t === '⊙' ? null : val(t)));
    // 걸음 크기는 성한 두 칸에서 잰다
    const a = nums.findIndex((v, i) => v !== null && nums[i + 1] !== null && nums[i + 1] !== undefined);
    const step = nums[a + 1] - nums[a];
    for (let i = 0; i < 6; i++) {
      if (nums[i] === null || nums[i + 1] === null) continue;
      assert.ok(Math.abs(nums[i + 1] - nums[i] - step) < 1e-9, `seed=${s}: 걸음이 일정하지 않다`);
    }
    const expect = nums[hole - 1] + step;
    assert.ok(Math.abs(val(okOf(q).text) - expect) < 1e-9, `seed=${s}: ${okOf(q).text} ≠ ${expect}`);
  }
});

test('💎 한 세트: 얼굴이 겹치지 않고, 아직 못 받은 배지를 먼저 낸다', () => {
  for (let s = 1; s <= 400; s++) {
    const round = makeSpecialRound(s * 131, 3, {});
    assert.equal(round.length, 3, `seed=${s}`);
    const kinds = round.map((q) => q.kind);
    assert.equal(new Set(kinds).size, 3, `seed=${s}: 같은 얼굴이 두 번 나왔다`);
  }
  // prefer를 주면 그쪽이 먼저
  const want = ['sumdiff', 'overlap'];
  const r = makeSpecialRound(999, 3, { prefer: want });
  const first2 = r.slice(0, 2).map((q) => q.kind.replace('special-', ''));
  assert.deepEqual(first2.slice().sort(), want.slice().sort(), '아직 못 받은 배지를 먼저 내야 한다');
});

test('💎 say: 분자 총합을 대분수 글로 (자연수·진분수도)', () => {
  assert.equal(say(42, 10), '4 2/10');
  assert.equal(say(40, 10), '4');
  assert.equal(say(7, 10), '7/10');
  assert.equal(say(10, 10), '1');
});

// ── 🏅 체육관 배지 (진도 레코드) ──

const M = () => ({ concepts: {}, miss: {}, log: [] });
const T = '2026-09-26';

test('🏅 맞힌 얼굴만 통과 횟수가 오르고, 다 차면 그때 배지가 나온다', () => {
  const m = M();
  let r = applySpecialRound(m, [{ kind: 'reverse', ok: true }, { kind: 'cards', ok: false, tag: '두 장만 더함' }], T, 3);
  assert.deepEqual(r, { ok: 1, total: 2, got: [] });
  assert.equal(spPass(m, 'reverse'), 1);
  assert.equal(spPass(m, 'cards'), 0, '틀린 것은 안 오른다');
  assert.equal(m.miss['두 장만 더함'], 1, '틀린 까닭은 📊에 쌓인다');

  applySpecialRound(m, [{ kind: 'reverse', ok: true }], T, 3);
  r = applySpecialRound(m, [{ kind: 'reverse', ok: true }], T, 3);
  assert.deepEqual(r.got, ['reverse'], '세 번째에 배지');
  assert.deepEqual(badgesOf(m, 3), ['reverse']);

  r = applySpecialRound(m, [{ kind: 'reverse', ok: true }], T, 3);
  assert.deepEqual(r.got, [], '이미 받은 배지를 또 주지 않는다');
  assert.equal(spPass(m, 'reverse'), 4, '통과 횟수는 계속 오른다');
  assert.equal(spRounds(m), 4, '회차는 네 번 돌렸다');
});

test('🏅 "실수"라고 한 것은 📊 오개념에 안 쌓인다 (개념 편과 같은 규칙)', () => {
  const m = M();
  applySpecialRound(m, [{ kind: 'cards', ok: false, tag: '두 장만 더함', w: 's' }], T, 3);
  assert.equal(m.miss['두 장만 더함'], undefined);
});

test('🏆 여덟 배지를 다 모으면 **한 번만** 보상', () => {
  const m = M();
  for (const id of SP_KIND_IDS) for (let i = 0; i < 3; i++) applySpecialRound(m, [{ kind: id, ok: true }], T, 3);
  assert.equal(badgesOf(m, 3).length, 8);
  assert.equal(claimGym(m, SP_KIND_IDS, 3), true);
  assert.equal(claimGym(m, SP_KIND_IDS, 3), false, '두 번째는 없다');
  assert.equal(gymClaimed(m), true);
});

test('🏆 하나라도 모자라면 보상이 안 나온다', () => {
  const m = M();
  for (const id of SP_KIND_IDS.slice(0, 7)) for (let i = 0; i < 3; i++) applySpecialRound(m, [{ kind: id, ok: true }], T, 3);
  assert.equal(badgesOf(m, 3).length, 7);
  assert.equal(claimGym(m, SP_KIND_IDS, 3), false);
  assert.equal(gymClaimed(m), false);
});

test('💾 백업 병합: 통과 횟수는 max, 🏆 수령은 OR (옛 백업이 배지를 지우지 않는다)', () => {
  const now = { ...M(), sp: { pass: { reverse: 5, cards: 1 }, rounds: 6, gym: 1 }, updatedAt: 200 };
  const old = { ...M(), sp: { pass: { reverse: 2, cards: 3, findok: 1 }, rounds: 3, gym: 0 }, updatedAt: 100 };
  for (const [a, b, who] of [[now, old, '최근이 먼저'], [old, now, '옛것이 먼저']]) {
    const m = mergeMath(a, b);
    assert.equal(m.sp.pass.reverse, 5, `${who}`);
    assert.equal(m.sp.pass.cards, 3, `${who}: 한쪽에만 큰 값`);
    assert.equal(m.sp.pass.findok, 1, `${who}: 한쪽에만 있는 얼굴`);
    assert.equal(m.sp.rounds, 6, `${who}`);
    assert.equal(m.sp.gym, 1, `${who}: 받은 적이 있으면 받은 것`);
  }
});

test('💾 cloneMath는 입력을 건드리지 않는다 (규칙이 원본을 바꾸면 두 창이 엉킨다)', () => {
  const src = { ...M(), sp: { pass: { reverse: 2 }, rounds: 1, gym: 0 } };
  const copy = cloneProfileMath(src);
  applySpecialRound(copy, [{ kind: 'reverse', ok: true }], T, 3);
  assert.equal(src.sp.pass.reverse, 2, '원본이 그대로여야 한다');
  assert.equal(copy.sp.pass.reverse, 3);
});

test('🎟️ 스페셜은 교환권에 더하지 않는다 (몇 번이든 풀 수 있어 농사가 된다)', () => {
  const m = M();
  const r = applySpecialRound(m, [{ kind: 'reverse', ok: true }, { kind: 'cards', ok: true }, { kind: 'findok', ok: false }], T, 3);
  const t = tallyRound(m, { mode: 'special', correct: 2, result: r });
  assert.equal(t.ok, 0);
  assert.equal(m.tot, undefined, '누적을 건드리지 않는다');
});
