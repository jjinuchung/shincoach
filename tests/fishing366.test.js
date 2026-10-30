// 🎣 학습 낚시터 규칙 (v366 — 아버님 기본안 「물고기 16종으로 · 나머지 이대로」) — node --test tests/fishing366.test.js
// 물고기 16종 · 별마다 사투·뜰채 문제 수 · 그날 자리 셋 · 밑밥 · 길이·무게·월척 · 사투(놓치지 않음 · 드랙) · 뜰채 · 과목 몫(지난 7일 · 10~50%) · 하루 20분
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SPECIES, SPECIES_KEYS, STARS, SPOTS, FIGHT, speciesOf, openSpots, castSpot, chumFactor, starOdds, weighted, lengthOf, weightOf, badgesOf, rollFish,
  fightStart, fightStep, fightAnswer, netAnswer, SUBJECTS, doneOf, subjectShares, pickSubject, activeStep, dayLeftSec, FISH_IDLE_MS, weightText, WOLCHEOK, SAJJA,
} from '../js/fishing.js';
import { LOOKS } from '../js/fishart.js';

/** 정해진 난수 (mulberry32) */
function rngOf(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// FishBase 최대 전장(cm) — 2026-10-30 확인 (떡붕어는 SL 35 → 전장 어림 42)
const FB_MAX = { chambung: 12.5, napjaru: 13.1, pirami: 22.5, bluegill: 41, bungeo: 48, ttokbung: 42, dongjagae: 34.5, kkeuri: 44.4, nuchi: 67, bass: 97, ingeo: 129, gangjun: 102, megi: 130, gamulchi: 100, ssogari: 40, jangeo: 150 };

test('🐟 물고기 16종 — 별 4·3·4·3·2 · 길이 범위가 FishBase 최대 아래 · 그림 값 · 이름 겹침 없음', () => {
  assert.equal(SPECIES.length, 16);
  assert.equal(new Set(SPECIES_KEYS).size, 16);
  assert.equal(new Set(SPECIES.map((s) => s.ko)).size, 16);
  const byStar = [1, 2, 3, 4, 5].map((n) => SPECIES.filter((s) => s.star === n).length);
  assert.deepEqual(byStar, [4, 3, 4, 3, 2]);
  for (const s of SPECIES) {
    assert.ok(s.min > 0 && s.min < s.max, s.key);
    assert.ok(s.max <= FB_MAX[s.key], `${s.ko} ${s.max} > ${FB_MAX[s.key]}`);
    assert.ok(s.a > 0 && s.w > 0, s.key);
    assert.ok(LOOKS[s.key], `${s.ko} 그림 없음`);
    assert.equal(speciesOf(s.key), s);
  }
  assert.equal(speciesOf('toString'), null);
  assert.deepEqual(SPECIES.filter((s) => s.alien).map((s) => s.key).sort(), ['bass', 'bluegill', 'ttokbung']);
  for (const n of [1, 2, 3, 4, 5]) assert.ok(STARS[n].fight >= 1 && STARS[n].net >= 1);
  // 아버님 기본안 표 그대로 — 사투 1·2·2·3·4 · 뜰채 1·1·2·2·3 (한 마리 문제 5~11개)
  assert.deepEqual([1, 2, 3, 4, 5].map((n) => [STARS[n].fight, STARS[n].net]), [[1, 1], [2, 1], [2, 2], [3, 2], [4, 3]]);
  assert.ok(STARS[5].fight > STARS[1].fight && STARS[5].net > STARS[1].net);
});

test('📍 그날 자리 셋 — 물가 → 수초 밭(정답 6) → 깊은 곳(16) · 던지기 정답이면 열린 곳 중 가장 먼 곳 · 틀리면 물가', () => {
  assert.equal(openSpots(0), 1);
  assert.equal(openSpots(5), 1);
  assert.equal(openSpots(6), 2);
  assert.equal(openSpots(15), 2);
  assert.equal(openSpots(16), 3);
  assert.equal(openSpots(-3), 1);
  assert.equal(openSpots('x'), 1);
  assert.equal(castSpot(true, 0).key, 'shore');
  assert.equal(castSpot(true, 6).key, 'weed');
  assert.equal(castSpot(true, 99).key, 'deep');
  assert.equal(castSpot(false, 99).key, 'shore');
  assert.ok(SPOTS[0].m < SPOTS[1].m && SPOTS[1].m < SPOTS[2].m);
  assert.deepEqual(SPOTS.map((s) => s.chum), [1, 2, 2]);
});

test('🪱 밑밥 — 별 몫 합 1 · 정답이 늘면 큰 별 몫이 오름 · 물가엔 ★4·★5 없음 · 깊은 곳 밑밥 둘이면 ★5가 열 마리에 한 마리쯤', () => {
  for (const sp of SPOTS) for (const c of [0, 1, 2]) {
    const o = starOdds(sp, c);
    assert.ok(Math.abs(Object.values(o).reduce((a, b) => a + b, 0) - 1) < 1e-9);
  }
  assert.equal(starOdds(SPOTS[0], 2)[5], 0);
  assert.equal(starOdds(SPOTS[0], 2)[4], 0);
  assert.equal(starOdds(SPOTS[1], 2)[5], 0);
  const d0 = starOdds(SPOTS[2], 0);
  const d2 = starOdds(SPOTS[2], 2);
  assert.ok(d2[5] > d0[5] && d2[4] > d0[4] && d2[1] < d0[1]);
  assert.ok(d2[5] > 0.08 && d2[5] < 0.15, `★5 ${d2[5]}`);
  assert.equal(chumFactor(2, 2), 1);
  assert.ok(chumFactor(1, 9) >= 0.3);
  // 모르는 자리는 물가로
  assert.deepEqual(starOdds(null, 0), starOdds(SPOTS[0], 0));
  // 실제 뽑기 2만 번 — 깊은 곳 밑밥 둘 ★5 몫이 셈과 맞음
  const rng = rngOf(7);
  let five = 0;
  for (let i = 0; i < 20000; i++) if (rollFish(SPOTS[2], 2, 0, rng).star === 5) five++;
  assert.ok(Math.abs(five / 20000 - d2[5]) < 0.01, `${five / 20000} vs ${d2[5]}`);
});

test('📏 길이 · 무게 · 🏅 월척 — 늘 범위 안 · 연달아 맞힐수록 큰 개체 · 무게는 길이를 따라 · 붕어·떡붕어만 월척', () => {
  const rng = rngOf(11);
  for (const sp of SPECIES) {
    for (let i = 0; i < 2000; i++) {
      const cm = lengthOf(sp, i % 12, rng);
      assert.ok(cm >= sp.min && cm <= sp.max, `${sp.ko} ${cm}`);
      assert.equal(Math.round(cm * 10), cm * 10);
    }
  }
  const avg = (streak) => { const r = rngOf(3); let s = 0; for (let i = 0; i < 5000; i++) s += lengthOf(speciesOf('bungeo'), streak, r); return s / 5000; };
  assert.ok(avg(10) > avg(0) + 3, `${avg(10)} vs ${avg(0)}`);
  assert.equal(avg(10), avg(25)); // 10에서 멈춤
  const b = speciesOf('bungeo');
  assert.ok(weightOf(b, 30) > weightOf(b, 20));
  assert.ok(weightOf(b, 30) > 300 && weightOf(b, 30) < 500, `${weightOf(b, 30)}`);
  assert.equal(weightOf(b, -5), 1);
  assert.deepEqual([WOLCHEOK, SAJJA], [30.3, 40], '한 자 = 30.3cm');
  assert.deepEqual(badgesOf('bungeo', 30.2), []);
  assert.deepEqual(badgesOf('bungeo', 39.9), ['wolcheok']);
  assert.deepEqual(badgesOf('bungeo', WOLCHEOK - 0.1), []);
  assert.deepEqual(badgesOf('bungeo', WOLCHEOK), ['wolcheok']);
  assert.deepEqual(badgesOf('ttokbung', SAJJA), ['sajja']);
  assert.deepEqual(badgesOf('ingeo', 80), []);
  assert.equal(weightText(820), '820g');
  assert.equal(weightText(1520), '1.52kg');
  const f = rollFish(SPOTS[2], 2, 5, rngOf(99));
  assert.ok(SPECIES_KEYS.includes(f.key) && f.g === weightOf(speciesOf(f.key), f.cm) && f.star === speciesOf(f.key).star);
  assert.equal(weighted([], rng), null);
  assert.equal(weighted([['a', 0], ['b', 0]], rng), 'a');
});

/** 사람처럼 한 판 — 조심형(75 넘거나 「!!」면 손 떼고 45 아래면 다시) · 표시점마다 answer(i) · 끝까지 가면 걸린 시간 */
function playFight(star, m, deep, answer, rng, careful = true) {
  let s = fightStart({ star }, m, deep, rng);
  let hold = false;
  let asked = 0;
  for (let i = 0; i < 60 * 300; i++) {
    const surge = s.surge > 0;
    hold = careful ? (surge ? false : hold ? s.ten < 75 : s.ten < 45) : true;
    const r = fightStep(s, 1 / 60, hold, rng);
    s = r.s;
    assert.ok(s.dist <= s.start + FIGHT.maxOver + 1e-9, '너무 멀어짐');
    assert.ok(s.ten >= 0 && s.ten < FIGHT.dragAt, '장력');
    if (r.ev === 'mark') { s = fightAnswer(s, answer(asked)); asked += 1; }
    if (r.ev === 'net') return { ok: true, t: s.t, asked, drags: s.drags, s };
  }
  return { ok: false, asked, s };
}

test('💪 사투 — 놓치지 않음 · 표시점 수 = 별 + 얕게 걸리면 하나 더 · 조심형은 늘 뜰채까지 · 마구 감아도 드랙만 · 다 틀려도 끝남', () => {
  const rng = rngOf(21);
  for (const star of [1, 2, 3, 4, 5]) {
    for (const sp of SPOTS) {
      for (const deep of [true, false]) {
        const n0 = fightStart({ star }, sp.m, deep, rng).marks.length;
        assert.equal(n0, STARS[star].fight + (deep ? 0 : 1));
        const all = playFight(star, sp.m, deep, () => true, rng);
        assert.ok(all.ok, `★${star} ${sp.key}`);
        assert.equal(all.asked, n0);
        assert.ok(all.t < 40, `★${star} ${sp.key} ${all.t.toFixed(1)}초`);
        const none = playFight(star, sp.m, deep, () => false, rng);
        assert.ok(none.ok && none.asked === n0, `다 틀려도 ★${star}`);
        const greedy = playFight(star, sp.m, deep, () => true, rng, false);
        assert.ok(greedy.ok, `마구 감기 ★${star}`);
      }
    }
  }
  // 표시점은 위에서 아래로(먼 곳 → 가까운 곳) · 뜰채 거리보다 멀리
  const s = fightStart({ star: 4 }, 20, true, rng);
  for (let i = 1; i < s.marks.length; i++) assert.ok(s.marks[i] < s.marks[i - 1]);
  assert.ok(s.marks.every((x) => x > FIGHT.netM && x < 20));
  // 맞히면 확 가까워지고 틀리면 조금 멀어짐 · 어느 쪽이든 표시점은 지남
  const at = { ...s, dist: s.marks[0], next: 0 };
  assert.ok(fightAnswer(at, true).dist < at.dist && fightAnswer(at, true).next === 1);
  assert.ok(fightAnswer(at, false).dist > at.dist && fightAnswer(at, false).next === 1);
  // 마구 감으면 드랙이 풀린다(장력 100에서 68로 · 멀어짐)
  let g = fightStart({ star: 5 }, 20, false, rngOf(5));
  let drags = 0;
  for (let i = 0; i < 600 && !drags; i++) { const r = fightStep(g, 1 / 60, true, rngOf(i)); g = r.s; if (r.ev === 'drag') { drags++; assert.equal(g.ten, FIGHT.dragTo); } if (r.ev === 'mark') g = fightAnswer(g, true); }
  assert.ok(drags > 0, '드랙이 안 풀림');
  // 드랙이 풀리는 동안(slipS)은 눌러도 안 감긴다 — 「!!」 때 손을 떼는 편이 빠르게
  assert.ok(g.slip > 0 && g.slip <= FIGHT.slipS);
  const d0 = g.dist;
  let h = { ...g, surge: 0, nextSurge: 99 };
  for (let i = 0; i < 20; i++) h = fightStep(h, 1 / 60, true, rngOf(i)).s;
  assert.ok(h.dist > d0, `안 감기고 끌려감 ${d0} → ${h.dist}`);
  for (let i = 0; i < 90; i++) h = fightStep(h, 1 / 60, true, rngOf(i)).s;
  assert.ok(h.slip === 0 && h.dist < d0 + 1, '1초 뒤엔 다시 감김');
  // 드랙이 풀릴수록 지쳐서 덜 끌려간다
  const back = (n) => { const s = fightStart({ star: 5 }, 20, false, rngOf(1)); const r = fightStep({ ...s, drags: n, ten: 99.9, surge: 0, nextSurge: 99 }, 1 / 60, true, rngOf(1)).s; return r.dist - s.dist; };
  assert.ok(back(6) < back(0), `${back(6)} < ${back(0)}`);
  // 손을 떼고 「!!」가 줄곧 이어져도 처음 거리 + maxOver 넘게는 안 멀어짐 (놓치지 않음)
  let far = fightStart({ star: 5 }, 20, true, rngOf(2));
  for (let i = 0; i < 60 * 30; i++) far = fightStep({ ...far, surge: 1, nextSurge: 99 }, 1 / 60, false, rngOf(i)).s;
  assert.equal(far.dist, far.start + FIGHT.maxOver);
  // 깨진 dt
  assert.equal(fightStep(fightStart({ star: 1 }, 8, true, rng), NaN, true, rng).s.t, 0);
  assert.ok(fightStep(fightStart({ star: 1 }, 8, true, rng), 99, true, rng).s.t <= 0.1);
});

test('🥅 뜰채 — 맞히면 한 걸음 · 틀리면 그 자리(물러나지 않음)', () => {
  assert.equal(netAnswer(3, true), 2);
  assert.equal(netAnswer(1, true), 0);
  assert.equal(netAnswer(0, true), 0);
  assert.equal(netAnswer(2, false), 2);
  assert.equal(netAnswer(-1, false), 0);
});

test('📊 과목 몫 — 지난 7일(오늘 빼고) · 덜 한 과목이 많이 · 합 1 · 한 과목 10~50% · 과목이 적으면 늦춤', () => {
  const today = '2026-10-30';
  const days = [
    { date: '2026-10-29', mathTime: 0, enTime: 3000, korTime: 1200 },
    { date: '2026-10-23', mathTime: 600, enTime: 3000, korTime: 1200 },
    { date: '2026-10-22', mathTime: 99999, enTime: 0, korTime: 0 }, // 8일 전 — 안 셈
    { date: '2026-10-30', mathTime: 99999, enTime: 0, korTime: 0 }, // 오늘 — 안 셈
    { date: 'x', mathTime: 99999 },
  ];
  const d = doneOf(days, ['2026-10-29', '2026-10-28', '2026-10-30', '2026-10-01'], today);
  assert.equal(d.math, 600 / 8400);
  assert.equal(d.english, Math.min(1, 6000 / 8400));
  assert.equal(d.korean, 2400 / 8400);
  assert.equal(d.nonsul, 2 / 4);
  assert.deepEqual(doneOf(null, null, today), { math: 0, english: 0, korean: 0, nonsul: 0 });
  assert.deepEqual(doneOf(days, [], 'bad'), { math: 0, english: 0, korean: 0, nonsul: 0 });
  const sh = subjectShares(d);
  assert.ok(Math.abs(SUBJECTS.reduce((a, s) => a + sh[s], 0) - 1) < 1e-9);
  assert.ok(sh.math > sh.korean && sh.korean > sh.english);
  for (const s of SUBJECTS) assert.ok(sh[s] >= 0.1 - 1e-9 && sh[s] <= 0.5 + 1e-9, `${s} ${sh[s]}`);
  // 수학만 안 함 → 천장 50%
  const one = subjectShares({ math: 0, english: 1, korean: 1, nonsul: 1 });
  assert.ok(Math.abs(one.math - 0.5) < 1e-9);
  // 수학만 함 → 바닥 10%
  const lo = subjectShares({ math: 1, english: 0, korean: 0, nonsul: 0 });
  assert.ok(Math.abs(lo.math - 0.1) < 1e-9);
  // 기본안 예시(0.05·0.9·0.6·0.5) → 42·11·22·25
  const ex = subjectShares({ math: 0.05, english: 0.9, korean: 0.6, nonsul: 0.5 });
  assert.deepEqual(SUBJECTS.map((s) => Math.round(ex[s] * 100)), [42, 11, 22, 25]);
  // 낼 문제가 없는 과목은 빼고 · 둘이면 75%까지 · 하나면 그 과목만 · 없으면 빈 것
  const two = subjectShares({ math: 0, english: 1 }, ['math', 'english']);
  assert.ok(Math.abs(two.math - 0.75) < 1e-9 && Math.abs(two.english - 0.25) < 1e-9, '둘이면 천장 75% — 반반으로 굳지 않게');
  const three = subjectShares({ math: 0, english: 1, korean: 1 }, ['math', 'english', 'korean']);
  assert.ok(Math.abs(three.math - 0.5) < 1e-9, '셋이면 50%');
  assert.deepEqual(subjectShares({}, ['korean']), { korean: 1 });
  assert.deepEqual(subjectShares({}, []), {});
  assert.equal(subjectShares({ math: 'x' }).math, 0.25);
});

test('🎲 다음 과목 — 몫대로 · 같은 과목은 셋 내리면 다른 과목 · 과목이 하나뿐이면 그대로', () => {
  const sh = { math: 0.5, english: 0.1, korean: 0.2, nonsul: 0.2 };
  const rng = rngOf(31);
  const cnt = { math: 0, english: 0, korean: 0, nonsul: 0 };
  for (let i = 0; i < 20000; i++) cnt[pickSubject(sh, [], rng)]++;
  assert.ok(Math.abs(cnt.math / 20000 - 0.5) < 0.02);
  for (let i = 0; i < 500; i++) assert.notEqual(pickSubject(sh, ['math', 'math', 'math'], rng), 'math');
  let mathAfterTwo = 0;
  for (let i = 0; i < 500; i++) if (pickSubject(sh, ['math', 'math'], rng) === 'math') mathAfterTwo++;
  assert.ok(mathAfterTwo > 150);
  assert.equal(pickSubject({ korean: 1 }, ['korean', 'korean', 'korean'], rng), 'korean');
  assert.equal(pickSubject({}, [], rng), null);
  assert.equal(pickSubject(null, null, rng), null);
  // 한 판을 흉내 — 셋 넘게 내리 같은 과목이 안 나옴
  const seq = [];
  for (let i = 0; i < 3000; i++) seq.push(pickSubject(sh, seq, rng));
  for (let i = 3; i < seq.length; i++) assert.ok(!(seq[i] === seq[i - 1] && seq[i] === seq[i - 2] && seq[i] === seq[i - 3]), `${i}`);
});

test('⏱️ 하루 20분 — 2분 손 안 대면 안 셈 · 숨으면 안 셈 · 한 걸음 1초까지 · ⚙ 분·🔒 더 준 분', () => {
  assert.equal(activeStep(16, 1000), 16);
  assert.equal(activeStep(16, FISH_IDLE_MS + 1), 0);
  assert.equal(activeStep(16, 0, false), 0);
  assert.equal(activeStep(5000, 0), 1000);
  assert.equal(activeStep(-5, 0), 0);
  assert.equal(activeStep(16, NaN), 0);
  assert.equal(dayLeftSec(0), 1200);
  assert.equal(dayLeftSec(1100), 100);
  assert.equal(dayLeftSec(1300), 0);
  assert.equal(dayLeftSec(0, 30, 10), 2400);
  assert.equal(dayLeftSec(0, '', 0), 1200);
  assert.equal(dayLeftSec(0, 999, 999), (120 + 60) * 60);
});
