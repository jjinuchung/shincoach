// ⚔️🚀 v441 배틀·로켓단 수학 원천을 🌱에 맞추기 (2026-11-26 아버님 기본안 「이대로」 · 🌱 6학년·중1도 뺌 · 6학년·중1 줄기는 다른 줄기의 아는 칸) — node --test tests/battlepool441.test.js
// ⚔️ 수학 배틀·🚀 수학 로켓단이 같이 쓰는 문제(math.battleQuestion)가 지금 줄기 사다리의 done 전부를 내서 🥚 배우는 중·🌱 쉬는 6학년·중1 칸까지 나왔다 →
//   battlePool(m, today, stem): ① 지금 줄기 칸 ∩ 🎣 원천(learnedPool)이 3칸 이상이면 그 칸들 · ② 아니면 원천 전부 · ③ 그것도 없으면 옛 원천(done → ▶) ·
//   battleQuestion은 칸 하나가 못 만들면 다음 칸으로 · 새 🚀는 낼 문제가 없으면 열지 않는다(문제 없이 열면 틀림으로 세어 포켓몬을 빼앗긴다) · 📤 한 줄
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  battlePool, battlePoolLine, BATTLE_POOL_MIN, learnedPool, learnedPoolLine, ladderOf, mathReportText, stemOf, gradeOf,
  STEMS, STEM_ORDER, REST_GRADE, QUICK,
} from '../js/mathprog.js';
import { GRADUATED } from '../js/review.js';
import { emptyMath } from '../js/db.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
/** 함수 몸통 (다음 최상위 function·export까지) — 주석 줄(// …)과 블록 주석(/* … *\/)은 지운다 (rocketwire 도우미 + 블록 주석 — 내부 리뷰: 확인 줄을 블록 주석으로 감싸도 속았다) */
const body = (s, name) => {
  const i = s.indexOf(`function ${name}(`);
  assert.ok(i >= 0, `${name} 없음`);
  const ends = ['\nfunction ', '\nasync function ', '\nexport '].map((t) => s.indexOf(t, i + 10)).filter((x) => x > 0);
  return s.slice(i, ends.length ? Math.min(...ends) : undefined).replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
};
const TODAY = '2026-11-26';
const T_REST = new Date(2026, 9, 23, 15).getTime();
const T_OLD = new Date(2026, 9, 5, 12).getTime();
const ON = { on: true, at: T_REST };
const OFF = { on: false, at: T_REST };
const known = (extra = {}) => ({ done: true, box: 1, dueAt: '2026-11-01', lastAt: T_OLD, schedAt: T_OLD, ...extra });
const egg = (extra = {}) => known({ box: 0, ...extra });
const mk = (concepts, rest) => ({ ...emptyMath(), concepts, ...(rest ? { rest } : {}) });
/** 줄기 k의 i번째 칸 id */
const S = (k, i) => STEMS[k].list[i].id;
/** 원천 판정식 (손으로 적은 것) — done이고 📏이거나 box ≥ 1 · 🌱 켜지면 학년 < 6 */
const ok = (m, id) => {
  const v = (m.concepts || {})[id];
  return !!(v && v.done && (v.placed || (v.box || 0) >= 1) && (!(m.rest && m.rest.on && m.rest.at > 0) || gradeOf(id) < REST_GRADE));
};
const seeded = (s) => { let x = (s * 2654435761) >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };

test('⚔️🚀 ① 줄기 안: 아는 칸(🐣·👑·📏)이 3칸 이상이면 그 칸들만 · 사다리 차례 · 🥚 배우는 중은 뺌 · 🌱 켜지면 섞인 줄기의 6학년 칸도 뺌 · 끄면 돌아옴', () => {
  assert.equal(BATTLE_POOL_MIN, QUICK.n, '문턱 = ⚡ 한 판 문제 수');
  assert.equal(BATTLE_POOL_MIN, 3);
  // 분수(fraction) 줄기: 4·4·4·5·5·5·5·5·6·6학년
  const c = {
    [S('fraction', 0)]: known(),
    [S('fraction', 1)]: known({ box: GRADUATED }),   // 👑
    [S('fraction', 2)]: known({ placed: true }),     // 📏
    [S('fraction', 3)]: egg(),                       // 🥚
    [S('fraction', 4)]: known(),
    [S('fraction', 8)]: known(),                     // 6학년 🐣
    [S('fracadd', 0)]: known(),                      // 다른 줄기 — ①에선 안 나옴
  };
  const on = battlePool(mk(c, ON), TODAY, 'fraction');
  assert.deepEqual(on, { ids: [S('fraction', 0), S('fraction', 1), S('fraction', 2), S('fraction', 4)], from: 'stem' });
  const off = battlePool(mk(c, OFF), TODAY, 'fraction');
  assert.deepEqual(off, { ids: [S('fraction', 0), S('fraction', 1), S('fraction', 2), S('fraction', 4), S('fraction', 8)], from: 'stem' }, '🌱 끄면 6학년 칸이 돌아옴');
  assert.deepEqual(battlePool(mk(c), TODAY, 'fraction'), off, '설정이 없으면 꺼짐과 같다');
  // 딱 3칸이면 ① · 2칸이면 ②
  const three = { [S('fraction', 0)]: known(), [S('fraction', 1)]: known(), [S('fraction', 2)]: known(), [S('fraction', 3)]: egg(), [S('bignum', 0)]: known() };
  assert.deepEqual(battlePool(mk(three, ON), TODAY, 'fraction'), { ids: [S('fraction', 0), S('fraction', 1), S('fraction', 2)], from: 'stem' });
  delete three[S('fraction', 2)];
  const two = battlePool(mk(three, ON), TODAY, 'fraction');
  assert.equal(two.from, 'all', '줄기 안 아는 칸 2칸 — 넓힌다(두 칸에 다섯 문제가 몰리지 않게)');
  assert.deepEqual(two.ids, learnedPool(mk(three, ON)));
  assert.deepEqual(new Set(two.ids), new Set([S('fraction', 0), S('fraction', 1), S('bignum', 0)]), '🥚는 넓혀도 안 나옴');
  // 🌱가 문턱을 가르는 경우 — 4학년 🐣 둘 + 6학년 🐣 하나: 켜짐이면 2칸이라 넓힘 · 꺼짐이면 3칸이라 줄기 안 (내부 리뷰)
  const cross = { [S('fraction', 0)]: known(), [S('fraction', 1)]: known(), [S('fraction', 8)]: known(), [S('angle', 0)]: known() };
  assert.deepEqual(battlePool(mk(cross, ON), TODAY, 'fraction'), { ids: [S('fraction', 0), S('fraction', 1), S('angle', 0)], from: 'all' });
  assert.deepEqual(battlePool(mk(cross, OFF), TODAY, 'fraction'), { ids: [S('fraction', 0), S('fraction', 1), S('fraction', 8)], from: 'stem' });
});

test('⚔️🚀 ② 6학년·중1 줄기를 골랐을 때(🌱 켜짐): 다른 줄기의 4·5학년 아는 칸에서 · 🌱 끄면 그 줄기 안에서 · 섞인 줄기의 6학년 칸만 아는 경우도 넓힘', () => {
  const c = {
    [S('fracdiv', 0)]: known(), [S('fracdiv', 1)]: known(), [S('fracdiv', 2)]: known({ box: GRADUATED }), [S('fracdiv', 3)]: known({ placed: true }), // 6학년 줄기
    [S('expr', 0)]: known(), [S('expr', 1)]: known(), [S('expr', 2)]: known(), // 중1 줄기
    [S('bignum', 0)]: known(), [S('fracmul', 0)]: known({ placed: true }), [S('bignum', 1)]: egg(),
  };
  for (const k of ['fracdiv', 'expr']) {
    const p = battlePool(mk(c, ON), TODAY, k);
    assert.equal(p.from, 'all', k);
    assert.deepEqual(p.ids, [S('fracmul', 0), S('bignum', 0)], `${k} — 원천 차례(STEM_ORDER)대로 · 4·5학년 아는 칸만`);
    for (const id of p.ids) assert.ok(gradeOf(id) < REST_GRADE, `${k} ${id} 학년`);
  }
  assert.deepEqual(battlePool(mk(c, OFF), TODAY, 'fracdiv'), { ids: [S('fracdiv', 0), S('fracdiv', 1), S('fracdiv', 2), S('fracdiv', 3)], from: 'stem' }, '🌱 끄면 그 줄기 안');
  // 직육면체(cuboid) 5·5·5·5·6·6·6·6·6 — 6학년 칸 셋만 알면 🌱 켜짐에선 줄기 안 0칸 → 넓힘
  const cub = { [S('cuboid', 4)]: known(), [S('cuboid', 5)]: known(), [S('cuboid', 6)]: known(), [S('angle', 0)]: known() };
  assert.deepEqual(battlePool(mk(cub, ON), TODAY, 'cuboid'), { ids: [S('angle', 0)], from: 'all' });
  assert.equal(battlePool(mk(cub, OFF), TODAY, 'cuboid').from, 'stem');
});

test('⚔️🚀 ③ 배운 칸이 하나도 없을 때만 옛 원천(지금 줄기 done → 없으면 ▶ 지금 배울 칸) — 원천이 비면 🚀가 문제 없이 지므로 비우지 않는다', () => {
  // 🥚와 🌱 쉬는 6학년 칸뿐 — 원천은 비었지만 옛 원천으로
  const c = { [S('fraction', 0)]: egg(), [S('fraction', 9)]: known(), [S('bignum', 0)]: egg() };
  assert.deepEqual(learnedPool(mk(c, ON)), []);
  assert.deepEqual(battlePool(mk(c, ON), TODAY, 'fraction'), { ids: [S('fraction', 0), S('fraction', 9)], from: 'old' });
  assert.deepEqual(battlePool(mk(c, OFF), TODAY, 'fraction'), { ids: [S('fraction', 9)], from: 'all' }, '🌱 끄면 6학년 🐣가 원천 — ②');
  // 아무것도 안 배운 줄기 — ▶ 첫 칸
  const nowRow = ladderOf(mk(c, ON), TODAY, 'angle').filter((x) => x.state === 'now').map((x) => x.id);
  assert.deepEqual(battlePool(mk(c, ON), TODAY, 'angle'), { ids: nowRow, from: 'old' });
  for (const m of [null, mk({}), mk({}, ON)]) {
    for (const k of STEM_ORDER) {
      const p = battlePool(m, TODAY, k);
      assert.equal(p.from, 'old', `${k} 빈 기록`);
      assert.deepEqual(p.ids, [STEMS[k].list[0].id], `${k} 빈 기록이면 첫 칸`);
    }
  }
  // 줄기 이름이 없거나 틀리면 사다리 기본(분수)과 같다 — battleQuestion이 undefined를 넘길 수 있다
  const m = mk({ [S('fraction', 0)]: known(), [S('fraction', 1)]: known(), [S('fraction', 2)]: known() }, ON);
  assert.deepEqual(battlePool(m, TODAY, undefined), battlePool(m, TODAY, 'fraction'));
  assert.deepEqual(battlePool(m, TODAY, 'zzz'), battlePool(m, TODAY, 'fraction'));
});

test('⚔️🚀 무작위 기록 2000개 × 모든 줄기: 판정식과 꼭 같음 — ① 줄기 안 원천 3칸 이상이면 그것 · ② 원천 전부 · ③ 옛 원천 · 원천이 있으면 🥚·🌱 쉬는 학년은 절대 안 나옴 · 늘 한 칸 이상', () => {
  const ids = STEM_ORDER.flatMap((k) => STEMS[k].list.map((c) => c.id));
  const tally = { stem: 0, all: 0, old: 0 };
  for (let s = 1; s <= 2000; s++) {
    const r = seeded(s);
    const concepts = {};
    // 씨앗 절반은 줄기 한두 개에 기록을 몰아 ① 갈래와 2/3 경계가 자주 나오게 (내부 리뷰 — 고르게 흩으면 92%가 ②였다)
    const near = s % 2 === 0 ? STEMS[STEM_ORDER[Math.floor(r() * STEM_ORDER.length)]].list.map((c) => c.id) : ids;
    const n = s % 2 === 0 ? 2 + Math.floor(r() * 7) : Math.floor(r() * 30);
    for (let i = 0; i < n; i++) {
      const id = r() < 0.03 ? `X${i}` : near[Math.floor(r() * near.length)];
      const kind = Math.floor(r() * 6);
      concepts[id] = kind === 0 ? { done: false, lastAt: 1 }
        : kind === 1 ? egg({ schedAt: r() < 0.5 ? T_OLD : T_REST + 1 })
          : kind === 2 ? egg({ placed: true })
            : known({ box: 1 + Math.floor(r() * GRADUATED), schedAt: r() < 0.5 ? T_OLD : T_REST + 1 });
    }
    const rs = r() < 0.5 ? ON : r() < 0.5 ? OFF : null;
    const m = mk(concepts, rs);
    const everyOk = ids.filter((id) => ok(m, id));
    for (const k of STEM_ORDER) {
      const p = battlePool(m, TODAY, k);
      tally[p.from] += 1;
      const tag = `씨앗 ${s} ${k}`;
      assert.ok(p.ids.length > 0, `${tag} 비지 않음`);
      assert.equal(new Set(p.ids).size, p.ids.length, `${tag} 겹침`);
      const mine = STEMS[k].list.map((c) => c.id).filter((id) => ok(m, id));
      if (mine.length >= 3) {
        assert.deepEqual(p, { ids: mine, from: 'stem' }, tag);
      } else if (everyOk.length) {
        assert.equal(p.from, 'all', tag);
        assert.deepEqual(new Set(p.ids), new Set(everyOk), tag);
      } else {
        assert.equal(p.from, 'old', tag);
        const done = STEMS[k].list.map((c) => c.id).filter((id) => concepts[id] && concepts[id].done);
        if (done.length) assert.deepEqual(p.ids, done, tag);
        else assert.deepEqual(p.ids, ladderOf(m, TODAY, k).filter((x) => x.state === 'now').map((x) => x.id), tag);
      }
      if (p.from !== 'old') for (const id of p.ids) assert.ok(ok(m, id), `${tag} ${id} — 🥚·🌱 쉬는 학년이 원천에`);
    }
  }
  // 세 갈래가 모두 넉넉히 나왔나 ('none'은 닿지 않는다 — 위에서 늘 한 칸 이상) · ①은 몰아 넣은 씨앗 1000개의 그 줄기에서만 나올 수 있다(지금 약 480번)
  for (const [k, min] of [['stem', 300], ['all', 1000], ['old', 1000]]) assert.ok(tally[k] >= min, `${k} 갈래 ${tally[k]}번`);
});

test('⚔️🚀 모든 줄기 · 원천 모든 칸이 실제로 배틀 문제(계산 · 보기 중 정답 하나)를 만든다 — battleQuestion과 같은 고리(칸을 돌며 · 칸마다 씨앗 여섯)', () => {
  const all = {};
  for (const k of STEM_ORDER) for (const c of STEMS[k].list) all[c.id] = known();
  for (const rs of [ON, OFF]) {
    const m = mk(all, rs);
    for (const k of STEM_ORDER) {
      const { ids } = battlePool(m, TODAY, k);
      for (let seed = 0; seed < ids.length * 3; seed += 1) {
        let q = null;
        for (let j = 0; j < ids.length && !q; j++) {
          const id = ids[(seed + j) % ids.length];
          const sx = stemOf(id);
          for (let t = 0; t < 6 && !q; t++) q = sx.gen.makeQuestion(id, 'calc', seed + t * 7919, { content: {}, recent: [] });
        }
        assert.ok(q, `${k} 씨앗 ${seed}`);
        // 씨앗 자리의 첫 칸이 바로 문제를 낸다 — 다음 칸으로 넘어가 성공하면 죽은 칸이 가려진다 (내부 리뷰)
        assert.equal(q.concept, ids[seed % ids.length], `${k} 씨앗 ${seed} — 첫 칸에서`);
        assert.equal(q.choices.filter((c) => c.ok).length, 1, `${k} 씨앗 ${seed} 정답 하나`);
        if (rs === ON) assert.ok(gradeOf(q.concept) < REST_GRADE, `${k} 🌱 켜짐 — 6학년·중1 안 나옴`);
      }
    }
  }
});

test('⚔️🚀 📤 한 줄(battlePoolLine): 줄기 안 · 배운 수학 전체 · 옛 원천 줄기 수 — 더하면 28줄기 · 수학 요약 글에서 🎣 원천 줄 바로 뒤', () => {
  const c = {
    [S('fraction', 0)]: known(), [S('fraction', 1)]: known(), [S('fraction', 2)]: known(),
    [S('bignum', 0)]: known(), [S('bignum', 1)]: known(), [S('bignum', 2)]: known({ box: GRADUATED }),
    [S('fracdiv', 0)]: known(), [S('fracdiv', 1)]: known(), [S('fracdiv', 2)]: known(),
  };
  assert.equal(battlePoolLine(mk(c, ON), TODAY), '⚔️🚀 배틀·로켓단 수학 원천(🎣와 같은 칸) — 줄기 안 아는 칸에서 2줄기 · 줄기 안 아는 칸이 3칸 미만이라 배운 수학 전체에서 26줄기');
  assert.equal(battlePoolLine(mk(c, OFF), TODAY), '⚔️🚀 배틀·로켓단 수학 원천(🎣와 같은 칸) — 줄기 안 아는 칸에서 3줄기 · 줄기 안 아는 칸이 3칸 미만이라 배운 수학 전체에서 25줄기');
  assert.equal(battlePoolLine(mk({ [S('fraction', 0)]: egg() }, ON), TODAY), '⚔️🚀 배틀·로켓단 수학 원천(🎣와 같은 칸) — 줄기 안 아는 칸에서 0줄기 · 줄기 안 아는 칸이 3칸 미만이라 배운 수학 전체에서 0줄기 · 배운 칸이 없어 옛 원천(🥚·쉬는 칸까지) 28줄기');
  for (const rs of [ON, OFF]) {
    const m = mk(c, rs);
    const nums = battlePoolLine(m, TODAY).match(/(\d+)줄기/g).map((x) => Number(x.replace('줄기', '')));
    assert.equal(nums.reduce((a, b) => a + b, 0), STEM_ORDER.length, '줄기 수를 더하면 28');
    const lines = mathReportText(m, TODAY).split('\n');
    assert.equal(lines[lines.indexOf(learnedPoolLine(m)) + 1], battlePoolLine(m, TODAY), '🎣 원천 줄 바로 뒤');
  }
});

test('★ 실제 battleQuestion·startRocket 몸통을 가짜 의존성으로 돌리기 (zygarde352처럼 new Function · Codex 250차·내부 리뷰): 씨앗 자리부터 · 못 만들면 다음 칸 · 칸마다 씨앗 여섯 · 다 실패해야 null · 새 🚀는 문제가 없으면 몫·배틀 칸을 안 씀', async () => {
  const mj = read('js/math.js');
  const sx = (fail = new Set()) => ({ key: 'k', gen: { makeQuestion: (id) => (fail.has(id) ? null : { concept: id }) } });
  const mkBQ = (ids, stemOf, seen = []) => new Function('battlePool', 'ui', 'todayKey', 'savedStem', 'stemOf', 'optsFor', `${body(mj, 'battleQuestion')}\nreturn battleQuestion;`)(
    (m, today, stem) => { seen.push({ m, today, stem }); return { ids, from: 'stem' }; },
    { state: 'STATE', stem: 'fraction', recent: {} }, () => TODAY, () => 'saved', stemOf, () => ({ content: {} }),
  );
  let bq = mkBQ(['a', 'b', 'c'], () => sx());
  assert.deepEqual([0, 1, 2, 5, 999999].map((s) => bq(s).concept), ['a', 'b', 'c', 'c', 'a'], '씨앗 자리의 칸부터');
  bq = mkBQ(['a', 'b', 'c'], () => sx(new Set(['a'])));
  assert.deepEqual([0, 2].map((s) => bq(s).concept), ['b', 'c'], '못 만들면 다음 칸 (끝에서는 처음으로 돌아감)');
  bq = mkBQ(['a', 'b'], (id) => (id === 'a' ? null : sx()));
  assert.equal(bq(0).concept, 'b', '줄기를 못 찾으면 다음 칸');
  assert.equal(mkBQ(['a', 'b'], () => sx(new Set(['a', 'b'])))(0), null, '다 실패해야 null');
  assert.equal(mkBQ([], () => sx())(0), null);
  // 칸마다 씨앗 여섯 — 다섯 번 실패하고 여섯째(seed + 5 × 7919)에 됨
  const tries = [];
  bq = mkBQ(['a'], () => ({ key: 'k', gen: { makeQuestion: (id, kind, seed) => { tries.push([kind, seed]); return tries.length < 6 ? null : { concept: id, seed }; } } }));
  assert.equal(bq(3).seed, 3 + 5 * 7919);
  assert.deepEqual(tries.map((t) => t[0]), Array(6).fill('calc'), '계산 문제만');
  // 줄기: 넘긴 줄기(🚀 cur.stem) → ui.stem → savedStem() 순
  const seen = [];
  mkBQ(['a'], () => sx(), seen)(0, 'cuboid');
  mkBQ(['a'], () => sx(), seen)(0, null);
  assert.deepEqual(seen.map((x) => [x.m, x.today, x.stem]), [['STATE', TODAY, 'cuboid'], ['STATE', TODAY, 'fraction']]);

  // 새 🚀 — 문제를 못 만들면 rocketAdmit(하루 몫·과목 공용 배틀 칸)도 화면도 없이 다음 문항으로(after 한 번)
  const mkSR = (q) => {
    const log = [];
    const ui = { run: 1, stem: 'cuboid', today: {}, rocketPending: true, rocketStreak: 2 };
    const f = new Function('ui', 'rocketPick', 'getPartner', 'mathHidden', 'battleQuestion', 'rocketAdmit', 'todayKey', 'ROCKET', 'rocketNew', 'runRocket', `${body(mj, 'startRocket').replace(/^function /, 'async function ')}\nreturn startRocket;`)(
      ui, () => ({ id: 'mon' }), () => ({ id: 'p' }), () => false,
      (seed, stem) => { log.push(`q:${seed}:${stem}`); return q; },
      async () => { log.push('admit'); return { ok: true, cur: { subject: 'math' }, daily: { rockets: 1 } }; },
      () => TODAY, { field: { math: 'rockets' }, maxPerDay: 3 }, (x) => x, async () => { log.push('run'); },
    );
    return { f, log, ui };
  };
  for (const [q, want] of [[null, ['q:0:cuboid']], [{ concept: 'a' }, ['q:0:cuboid', 'admit', 'run']]]) {
    const { f, log, ui } = mkSR(q);
    let after = 0;
    await f(() => { after += 1; });
    assert.deepEqual(log, want, JSON.stringify(q));
    assert.equal(after, q ? 0 : 1, '못 열면 after 한 번(편이 다음 문항으로) · 열면 runRocket이 부름');
    assert.equal(ui.rocketPending, false);
  }
});

test('🔌 잇기: battleQuestion이 battlePool로 · 칸을 돌며(못 만들면 다음 칸) · 옛 고리 없음 · 새 🚀는 rocketAdmit 전에 문제를 만들어 봄 · ⚔️·🚀 같은 함수 · 📊 설명 · sw v441', () => {
  const mj = read('js/math.js');
  const q = body(mj, 'battleQuestion');
  assert.match(q, /const \{ ids \} = battlePool\(ui\.state, todayKey\(\), stemKey \|\| ui\.stem \|\| savedStem\(\) \|\| undefined\);/);
  assert.match(q, /for \(let k = 0; k < ids\.length; k\+\+\) \{\n\s+const id = ids\[\(seed \+ k\) % ids\.length\];\n\s+const sx = stemOf\(id\);\n\s+if \(!sx\) continue;/, '칸 하나가 못 만들면 다음 칸');
  assert.match(q, /sx\.gen\.makeQuestion\(id, 'calc', seed \+ t \* 7919, \{ \.\.\.optsFor\(sx\.key\), recent: ui\.recent\[id\] \|\| \[\] \}\);\n\s+if \(q\) return q;/);
  assert.doesNotMatch(q, /ladderOf\(|x\.state === 'done'|return null;\n\s+const|if \(!sx\) return null/, '옛 고리(지금 줄기 done 전부 · 칸 하나 실패면 null)가 남지 않음');
  assert.ok(mj.includes("  battlePool, // ⚔️·🚀 배틀·로켓단 원천 — 줄기 안 아는 칸 → 배운 수학 전체 → 옛 원천 (v441)\n  learnedPool, //"));
  const head = mj.slice(mj.lastIndexOf('/**', mj.indexOf('function battleQuestion(')), mj.indexOf('function battleQuestion('));
  for (const w of ['🐣 안다·👑·📏', '🥚 배우는 중은 안 낸다', '🌱 켜져 있으면 6학년·중1도 안 낸다', '6학년·중1 줄기를 골랐을 때도', '칸 하나가 문제를 못 만들면 다음 칸으로']) assert.ok(head.includes(w), `주석: ${w}`);
  // ⚔️ 배틀·🚀 로켓단 모두 battleQuiz → battleQuestion (rocketwire가 runRocket 꼴을 고정)
  const bq = body(mj, 'battleQuiz');
  assert.match(bq, /const q = battleQuestion\(\(Date\.now\(\) % 1000000\) \| 0, stemKey\);/); // null을 어떻게 다룰지는 묶지 않는다 (내부 리뷰)
  assert.match(body(mj, 'startMathBattle'), /quiz: battleQuiz,/);
  // 새 🚀: 노릴 포켓몬·파트너 → 문제를 만들어 봄 → 몫·배틀 기록(rocketAdmit) — 못 만들면 몫도 칸도 안 씀
  const sr = body(mj, 'startRocket');
  const at = (t) => { const k = sr.indexOf(t); assert.ok(k > 0, t); return k; };
  assert.ok(at("if (!target || !getPartner() || mathHidden()) { after(); return; }") < at('if (!battleQuestion(0, ui.stem)) { after(); return; }'));
  assert.ok(at('if (!battleQuestion(0, ui.stem)) { after(); return; }') < at('await rocketAdmit('), '몫·진행 중 배틀 칸을 쓰기 전에');
  // 이어 가기는 막지 않는다 — 이미 연 배틀(과목 공용 한 칸)을 남기면 영어·국어 로켓단까지 막힌다
  assert.doesNotMatch(body(mj, 'resumeRocketIfAny'), /battleQuestion|battlePool/);
  const mp = read('js/mathprog.js');
  assert.match(mp, /lines\.push\(learnedPoolLine\(m\)\);[^\n]*\n\s+lines\.push\(battlePoolLine\(m, today\)\);/);
  const st = read('js/stats.js');
  assert.ok(st.includes('⚔️ 수학 배틀·🚀 로켓단도 같은 칸에서 내요 — 지금 줄기에 그런 칸이 셋보다 적으면(6학년·중1 줄기 등) 모든 줄기의 그런 칸에서요(그런 칸이 하나도 없으면 예전처럼 지금 줄기 칸에서).'));
  // 판 번호 — v441 이상이고 sw와 version이 같게 (다음 판이 이 시험을 깨지 않게)
  const swv = Number((read('sw.js').match(/const CACHE_VERSION = 'v(\d+)';/) || [])[1]);
  const apv = Number((read('js/version.js').match(/export const APP_VERSION = 'v(\d+)';/) || [])[1]);
  assert.ok(swv >= 441 && swv === apv, `판 ${swv} · ${apv}`);
});
