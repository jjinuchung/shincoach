// 🔢 수학 v392 (2026-11-04 아버님 기본안 「추천대로」): 📐 단위 바꾸기 다지기 — 🐾 판과 🎣 낚시터의 📐를 쉬운 꼴부터
//  · 단계 1 자연수 · 2 소수 부분 · 3 지금 꼴 · 3번 잇달아 맞히면 위로 · 2번 잇달아 틀리면 아래로 · ③ 5번이면 끝(예전처럼)
//  · 정답은 문제 글에서 숫자를 다시 읽어 **따로** 센다(생성기를 베끼지 않게) · 힌트의 크기 감각도 따로 셈 · 1·2단계 힌트는 답을 말하지 않는다
//  · 장부는 저장 트랜잭션 안 · 병합은 바꾼 시각이 늦은 쪽 한 벌 · 아이 화면엔 단계·셈이 없다 · 다지기가 끝나면 옛 문제 그대로
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { POKE_N, POKE_KINDS, dataOf, poolOf, makeBoard, makePokeQ, unitCore } from '../js/mathpoke.js';
import { UNIT_DRILL, unitOf, unitStage, unitStep, unitFishCommit, unitFishToday, unitReport, pokeCommit, pokeReport, mathReportText, Q_SEC_MAX, REWARD, POKE } from '../js/mathprog.js';
import { mergeMath, cloneMath, emptyMath, updateMath, getMath } from '../js/db.js';
import { initProfile, flushProfile, commitChalRound } from '../js/xp.js';
import { fishMathQ, makeFishQ, poolOf as fishPool, FM_KIND_LIST, FM_LEVEL } from '../js/fishmath.js';
import { unitTurn, mathMix, lvDelta } from '../js/lakeview.js';
import { SPECIES, lvBadge } from '../js/fishing.js';
import { ROSTER } from '../js/pokemon.js';
import { EVO } from '../js/evolve.js';
import { rng } from '../js/mathgen.js';

void fakeIdb;
const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const DATA = dataOf(JSON.parse(read('coach/math/pokemath.json')));
const NAMES = new Map(ROSTER.map((r) => [r.id, r.ko]));
const TODAY = '2026-11-04';
const mon = (id) => ({ id, ko: NAMES.get(id), h: DATA.get(id).h, w: DATA.get(id).w });
const hasB = (w) => { const c = w.charCodeAt(w.length - 1); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0; };

// ── 따로 세는 판정 ──
const ASK = /([\d.]+) (m|kg)(?:는|은) 몇 (cm|g)일까요\?$/;
const num = (s) => Number(String(s).replace(/[^\d.]/g, ''));
const rate = (u) => (u === 'm' ? 100 : 1000);
/** 물음 끝 「○ m는 몇 cm」를 다시 읽어 답을 센다 */
function asked(q) {
  const m = q.text.match(ASK);
  assert.ok(m, `물음 꼴 ${q.text}`);
  const [, x, u, b] = m;
  assert.equal(b, u === 'm' ? 'cm' : 'g', q.text);
  return { x: Number(x), xs: x, u, b, want: Math.round(Number(x) * rate(u)) };
}
/** 단계 꼴 — 1 자연수 · 2 0.□ · 3 1보다 크고 소수 한 자리 */
function shapeOk(lv, x, xs) {
  if (lv === 1) return Number.isInteger(x) && x >= 2 && !xs.includes('.');
  if (lv === 2) return /^0\.[2-9]$/.test(xs);
  return /^[1-9]\d*\.[1-9]$/.test(xs);
}
/** 답이 10배 큰 보기의 힌트 — 「700 cm면 7 m예요」의 두 수가 정말 같은가 */
function sizeOk(hint, big, u, b) {
  const m = hint.match(new RegExp(`^🤔 (\\d+) ${b}(?:면|이면) ([\\d.]+) ${u}(?:예요|이에요)\\.`));
  assert.ok(m, `크기 힌트 꼴 ${hint}`);
  assert.equal(Number(m[1]), big, hint);
  assert.equal(Math.round(Number(m[2]) * rate(u)), big, hint);
}

test('📐 단계 몸통 (사람이 판정한 고정 사례): 자연수·소수 부분·지금 꼴의 답·보기·실수·풀이 · 크기 감각 힌트', () => {
  const C = (t, p, ko, s) => unitCore(rng(7), t, p, ko, s);
  const opt = (c) => Object.fromEntries(c.opts.filter((o) => !o.ok).map((o) => [o.trap, o.t]));
  const right = (c) => c.opts.find((o) => o.ok).t;
  // ① 자연수
  const a = C(20, 'h', '망나뇽', 1);
  assert.equal(a.ask, '2 m는 몇 cm일까요?');
  assert.equal(right(a), '200 cm');
  assert.deepEqual(opt(a), { small: '20 cm', same: '2 cm', big: '2000 cm' });
  assert.equal(a.tip, '💡 1 m = 100 cm');
  assert.equal(a.hints.big, '🤔 2000 cm면 20 m예요. 망나뇽이 그렇게 클까요?');
  assert.equal(a.hints.small, '🤔 1 m가 100 cm예요 — 100 cm가 2개면 몇 cm일까요?');
  assert.equal(a.hints.same, '🤔 2 m와 2 cm는 달라요 — 1 m가 100 cm예요.');
  assert.equal(a.solve, '2 m = 100 cm × 2 = 200 cm');
  const b = C(30, 'w', '피카츄', 1);
  assert.equal(b.ask, '3 kg은 몇 g일까요?');
  assert.equal(right(b), '3000 g');
  assert.deepEqual(opt(b), { small: '300 g', same: '3 g', big: '30000 g' });
  assert.equal(b.tip, '💡 1 kg = 1000 g');
  assert.equal(b.hints.big, '🤔 30000 g이면 30 kg이에요. 피카츄가 그렇게 무거울까요?');
  assert.equal(b.hints.same, '🤔 3 kg과 3 g은 달라요 — 1 kg이 1000 g이에요.');
  assert.equal(b.solve, '3 kg = 1000 g × 3 = 3000 g');
  // ② 소수 부분
  const c = C(7, 'h', '이브이', 2);
  assert.equal(c.ask, '0.7 m는 몇 cm일까요?');
  assert.equal(right(c), '70 cm');
  assert.deepEqual(opt(c), { mix: '7 cm', big: '700 cm', same: '0.7 cm' });
  assert.equal(c.tip, '💡 1 m = 100 cm · 0.1 m = 10 cm');
  assert.equal(c.hints.mix, '🤔 0.1 m가 10 cm예요 — 0.7 m는 0.1 m가 7개예요.');
  assert.equal(c.hints.big, '🤔 700 cm면 7 m예요. 0.7 m는 1 m보다 짧아요.');
  assert.equal(c.solve, '0.7 m = 10 cm × 7 = 70 cm');
  const d = C(5, 'w', '고오스', 2);
  assert.equal(right(d), '500 g');
  assert.deepEqual(opt(d), { mix: '5 g', big: '5000 g', small: '50 g' });
  assert.equal(d.tip, '💡 1 kg = 1000 g · 0.1 kg = 100 g');
  assert.equal(d.hints.big, '🤔 5000 g이면 5 kg이에요. 0.5 kg은 1 kg보다 가벼워요.');
  assert.equal(d.solve, '0.5 kg = 100 g × 5 = 500 g');
  // ② 자연수가 있는 수는 나눠서 묻는다 (③으로 잇는 다리)
  assert.equal(C(17, 'h', '리자몽', 2).ask, '1.7 m는 1 m와 0.7 m예요. 0.7 m는 몇 cm일까요?');
  assert.equal(C(905, 'w', '리자몽', 2).ask, '90.5 kg은 90 kg과 0.5 kg이에요. 0.5 kg은 몇 g일까요?');
  // ③ 지금 꼴 — 힌트만 크기 감각으로
  const e = C(17, 'h', '리자몽', 3);
  assert.equal(e.ask, '1.7 m는 몇 cm일까요?');
  assert.equal(right(e), '170 cm');
  assert.deepEqual(opt(e), { small: '17 cm', mix: '107 cm', big: '1700 cm' });
  assert.equal(e.tip, '💡 1 m = 100 cm');
  assert.equal(e.hints.big, '🤔 1700 cm면 17 m예요. 리자몽이 그렇게 클까요?');
  assert.equal(e.hints.mix, '🤔 0.7 m는 7 cm가 아니라 70 cm예요 (0.1 m = 10 cm).');
  assert.equal(e.solve, '1.7 m = 1 m 70 cm = 170 cm');
  const f = C(905, 'w', '리자몽', 3);
  assert.equal(right(f), '90500 g');
  assert.deepEqual(opt(f), { small: '9050 g', mix: '90005 g', big: '905000 g' });
  assert.equal(f.tip, '💡 1 kg = 1000 g · 0.1 kg = 100 g');
  assert.equal(f.hints.big, '🤔 905000 g이면 905 kg이에요. 리자몽이 그렇게 무거울까요?');
  assert.equal(f.hints.mix, '🤔 0.5 kg은 5 g이 아니라 500 g이에요 (0.1 kg = 100 g).');
  assert.equal(f.solve, '90.5 kg = 90 kg 500 g = 90500 g');
});

test('📐 🐾 판 쓸기 (씨앗 3000 × 세 단계 · 잡은 포켓몬 4~60마리 · 파트너): 판마다 📐 하나 · 5문제 그대로 · 그 단계 꼴 · 도감 숫자 그대로 · 정답은 따로 센 값 · 힌트가 답을 말하지 않음 · 크기 감각 셈 · 조사', () => {
  const r = rng(392);
  const ids = ROSTER.map((x) => x.id);
  const seenAt = new Set();
  const by = { 1: 0, 2: 0, 3: 0 };
  const sides = { m: 0, kg: 0 };
  let split = 0;
  let up = 0;
  let none = 0; // 맞는 포켓몬이 없어 📐 없이 낸 판 (아주 드물어야)
  for (let s = 1; s <= 3000; s++) {
    const n = 4 + Math.floor(r() * 57);
    const caught = {};
    while (Object.keys(caught).length < n) caught[ids[Math.floor(r() * ids.length)]] = 1;
    const pool = poolOf(caught, DATA, NAMES);
    const partner = r() < 0.5 ? Number(Object.keys(caught)[0]) : 0;
    for (const stage of [1, 2, 3]) {
      const board = makeBoard(pool, s, { evo: EVO, partner, unit: stage });
      const where = `씨앗 ${s} 단계 ${stage}`;
      assert.equal(board.length, POKE_N, `${where} 문제 수`);
      assert.equal(new Set(board.map((q) => q.kind)).size, board.length, `${where} 꼴 겹침`);
      const units = board.filter((q) => q.kind === 'unit');
      // 그 단계부터 ③까지 맞는 포켓몬이 하나도 없으면 📐 없이 (makeUnit은 위로만 간다 — 단계보다 쉬운 문제는 안 낸다 · 「아무 꼴도 못 만들면 null」)
      //   v404에서 명단이 672로 늘며 뽑기가 바뀌어 처음 나왔다(씨앗 1356 ③ — 라이츄·플라베베·차곡차곡·우르) · 맞는 포켓몬이 있는데 없으면 버그
      if (!units.length) {
        const fitAt = { 1: (m) => (m.h >= 20 && m.h <= 30 && m.h % 10 === 0) || (m.w >= 20 && m.w < 1000 && m.w % 10 === 0), 2: (m) => (m.h <= 30 && m.h % 10 >= 2) || (m.w < 1000 && m.w % 10 >= 2), 3: (m) => (m.h >= 10 && m.h <= 30 && m.h % 10 !== 0) || (m.w >= 10 && m.w < 1000 && m.w % 10 !== 0) };
        assert.ok(![1, 2, 3].filter((k) => k >= stage).some((k) => pool.some(fitAt[k])), `${where} 맞는 포켓몬이 있는데 📐이 없다`);
        none++;
        continue;
      }
      assert.equal(units.length, 1, `${where} 📐 하나`);
      seenAt.add(board.indexOf(units[0]));
      const q = units[0];
      const at = `${where} ${q.text}`;
      assert.ok(q.lv >= stage && q.lv <= 3, `${at} 단계 ${q.lv}`);
      if (q.lv > stage) up++;
      by[q.lv]++;
      const { x, xs, u, b, want } = asked(q);
      sides[u]++;
      assert.ok(shapeOk(q.lv, x, xs), `${at} 꼴`);
      // 띠의 값은 도감 숫자 그대로
      const d = DATA.get(q.mons[0].id);
      const shown = u === 'm' ? d.h / 10 : d.w / 10;
      assert.equal(q.mons[0].tag, `${u === 'm' ? '키' : '몸무게'} ${shown} ${u}`, at);
      if (q.lv === 2 && shown >= 1) {
        split++;
        assert.ok(q.text.includes(`${shown} ${u}`) && q.text.includes(`${Math.floor(shown)} ${u}`), `${at} 나눠 보임`);
        assert.ok(Math.abs(Math.floor(shown) + x - shown) < 1e-9, `${at} 나눈 두 수의 합`);
      } else assert.equal(Math.abs(shown - x) < 1e-9, true, `${at} 물은 수 = 띠의 수`);
      // 보기
      assert.equal(q.opts.length, 4, at);
      assert.equal(q.opts.filter((o) => o.ok).length, 1, at);
      assert.equal(new Set(q.opts.map((o) => num(o.t))).size, 4, `${at} 값이 같은 보기 ${q.opts.map((o) => o.t)}`);
      assert.equal(q.opts.find((o) => o.ok).t, `${want} ${b}`, at);
      for (const o of q.opts.filter((y) => !y.ok)) {
        assert.ok(o.trap && q.hints[o.trap], `${at} 힌트 없음 ${o.t}`);
        if (q.lv < 3) assert.ok(!q.hints[o.trap].includes(`${want} ${b}`), `${at} 힌트가 답을 말함 ${q.hints[o.trap]}`);
        if (o.trap === 'big') { assert.equal(num(o.t), want * 10, at); sizeOk(q.hints.big, want * 10, u, b); }
      }
      assert.ok(q.solve.endsWith(`= ${want} ${b}`), `${at} 풀이 ${q.solve}`);
      assert.equal(q.tip.split(' · ')[0], `💡 1 ${u} = ${rate(u)} ${b}`, at);
      // 조사 — 이름 뒤 이/가
      const ko = q.mons[0].ko;
      const big = q.hints.big;
      if (q.lv !== 2) assert.ok(big.includes(`${ko}${hasB(ko) ? '이' : '가'} 그렇게`), `${at} 조사 ${big}`);
      const all = [q.text, q.solve, q.tip, ...Object.values(q.hints), ...q.opts.map((o) => o.t)].join(' | ');
      assert.ok(!/undefined|NaN|null|\[object/.test(all), `${at} 빈 글 ${all}`);
    }
  }
  assert.deepEqual([...seenAt].sort(), [0, 1, 2, 3, 4], '판 안 자리가 고르게');
  assert.ok(by[1] > 2000 && by[2] > 2000 && by[3] > 2000, `단계 ${JSON.stringify(by)}`);
  assert.ok(sides.m > 2000 && sides.kg > 2000, `단위 ${JSON.stringify(sides)}`);
  assert.ok(split > 500, `나눠 묻는 문제 ${split}`);
  assert.ok(up < 200, `단계를 못 만들어 올린 판은 드물다 ${up}`);
  assert.ok(none <= 3, `맞는 포켓몬이 없어 📐 없이 낸 판은 아주 드물다 ${none}`);
});

test('📐 🐾 못 만드는 단계: 자연수 포켓몬이 없으면 소수 부분 · 소수 포켓몬뿐이면 ③까지 — 실제로 낸 단계(lv) · 다른 쪽 단위부터 · 아무 꼴도 못 만들면 null', () => {
  const decOnly = [mon(6), mon(9)]; // 키 1.7·1.6 m · 몸무게 90.5·85.5 kg
  for (let s = 1; s <= 300; s++) {
    const q = makePokeQ('unit', decOnly, s, { unit: 1 });
    assert.equal(q.lv, 2, `자연수가 없으면 ② (씨앗 ${s})`);
  }
  const wholeW = [{ id: 1, ko: '하나', h: 15, w: 60 }, { id: 2, ko: '둘', h: 25, w: 30 }]; // 키는 소수뿐 · 몸무게는 자연수뿐
  for (let s = 1; s <= 300; s++) {
    const q = makePokeQ('unit', wholeW, s, { unit: 1 });
    assert.equal(q.lv, 1);
    assert.match(q.text, /kg은 몇 g/, '다른 쪽 단위로 — 같은 단계부터');
  }
  const tiny = [{ id: 1, ko: '하나', h: 40, w: 2000 }];
  assert.equal(makePokeQ('unit', tiny, 1, { unit: 1 }), null, '너무 크면 어느 단계도 못 만든다');
  const shortOnly = [{ id: 1, ko: '하나', h: 40, w: 7 }]; // 몸무게 0.7 kg만
  const q3 = makePokeQ('unit', shortOnly, 1, { unit: 3 });
  assert.equal(q3, null, '③을 못 만들면 쉬운 단계로 내리지 않는다');
  assert.equal(makePokeQ('unit', shortOnly, 1, { unit: 2 }).lv, 2);
});

test('📐 🐾 다지기가 끝난 판 = 옛 판: unit이 없거나 0이면 lv 없음 · 같은 씨앗 같은 판 · 판마다 꼭 나오지 않음 · 💡·보기 옛 꼴', () => {
  const pool = [6, 9, 25, 133, 143, 658, 656, 4, 5, 7].map(mon);
  let without = 0;
  for (let s = 1; s <= 600; s++) {
    const a = makeBoard(pool, s, { evo: EVO });
    assert.deepEqual(makeBoard(pool, s, { evo: EVO, unit: 0 }), a, `씨앗 ${s}`);
    assert.ok(a.every((q) => q.lv === undefined), `씨앗 ${s} lv 없음`);
    if (!a.some((q) => q.kind === 'unit')) without++;
  }
  assert.ok(without > 100, `📐이 빠지는 판이 있다 ${without}/600`);
  for (let s = 1; s <= 200; s++) {
    const q = makePokeQ('unit', pool, s);
    assert.equal(q.lv, undefined);
    const { x, xs, want, b } = asked(q);
    assert.ok(shapeOk(3, x, xs), q.text);
    assert.equal(q.opts.find((o) => o.ok).t, `${want} ${b}`);
  }
  for (const bad of [4, -1, 'x', null, 1.5]) assert.equal(makePokeQ('unit', pool, 3, { unit: bad }).lv, undefined, `이상한 단계 ${bad}`);
  // 옛 판은 뽑힌 단위를 못 만들면 그 꼴을 건너뛴다(다른 단위로 안 간다) — 다지기 문제만 다른 쪽 단위로
  const onlyH = [{ id: 1, ko: '하나', h: 15, w: 5 }, { id: 2, ko: '둘', h: 25, w: 3 }];
  const old = Array.from({ length: 200 }, (_, i) => makePokeQ('unit', onlyH, i + 1));
  assert.ok(old.some((q) => q === null) && old.some((q) => q !== null), '옛 꼴 — 몸무게가 뽑히면 못 만듦');
  for (let s = 1; s <= 200; s++) assert.ok(makePokeQ('unit', onlyH, s, { unit: 3 }), '다지기는 다른 쪽 단위로');
});

test('📐 장부 (unitStep, 순수): 3번 잇달아 맞히면 위로 · 2번 잇달아 틀리면 아래로 · ①에서 더 안 내려감 · ③ 5번이면 끝 · 끝낸 뒤 그대로 · 시각은 늘 앞으로 · 입력을 고치지 않음', () => {
  const go = (m, seq) => { for (const c of seq) unitStep(m, c === 'o', TODAY, 1000); return m; };
  assert.deepEqual(UNIT_DRILL, { up: 3, down: 2, done: 5, fishDay: 3 });
  assert.deepEqual(unitOf({}), { v: 1, up: 0, miss: 0, at: 0 });
  assert.equal(unitStage({}), 1, '처음엔 ①');
  const a = go({}, 'oo');
  assert.deepEqual([a.unit.v, a.unit.up], [1, 2]);
  go(a, 'o');
  assert.deepEqual([a.unit.v, a.unit.up, a.unit.miss], [2, 0, 0], '셋째에 ②로');
  go(a, 'x');
  assert.deepEqual([a.unit.v, a.unit.up, a.unit.miss], [2, 0, 1], '한 번 틀림은 그대로');
  go(a, 'o');
  assert.deepEqual([a.unit.v, a.unit.up, a.unit.miss], [2, 1, 0], '맞히면 틀린 수가 지워짐');
  go(a, 'xx');
  assert.deepEqual([a.unit.v, a.unit.up, a.unit.miss], [1, 0, 0], '두 번 잇달아 틀리면 ①로');
  go(a, 'xx');
  assert.equal(a.unit.v, 1, '①에서 더 안 내려감(저장된 값도)');
  go(a, 'xxx');
  assert.equal(a.unit.v, 1);
  assert.equal(unitStage(a), 1);
  const b = go({}, 'oooooo');
  assert.equal(b.unit.v, 3);
  go(b, 'oooo');
  assert.equal(unitStage(b), 3, '③ 넷째까지는 아직');
  assert.equal(b.unit.done, undefined);
  go(b, 'o');
  assert.equal(b.unit.done, TODAY, '③ 다섯째에 끝');
  assert.equal(unitStage(b), 0);
  const frozen = { ...b.unit };
  go(b, 'xxxxx');
  assert.deepEqual(b.unit, frozen, '끝낸 뒤엔 그대로');
  const c = go({}, 'oooooooo'); // ③ 둘째
  go(c, 'x');
  go(c, 'o');
  assert.equal(c.unit.up, 1, '③의 연속은 틀리면 처음부터');
  go(c, 'xx');
  assert.equal(c.unit.v, 2, '③에서도 두 번 틀리면 ②');
  // 끝은 ③에서만 — ①②에 연속이 쌓여 있어도
  for (const v of [1, 2]) {
    const e = { unit: { v, up: 7, miss: 0, at: 1 } };
    unitStep(e, true, TODAY, 2);
    assert.deepEqual([e.unit.done, e.unit.v, e.unit.up], [undefined, v + 1, 0], `${v}단계`);
  }
  // 시각은 늘 앞으로 (시계가 뒤로 가도)
  const t = {};
  unitStep(t, true, TODAY, 5000);
  unitStep(t, true, TODAY, 100);
  assert.equal(t.unit.at, 5001);
  // 입력을 고치지 않는다 — 새 객체로
  const before = { unit: { v: 2, up: 1, miss: 0, at: 9 } };
  const held = before.unit;
  unitStep(before, true, TODAY, 20);
  assert.deepEqual(held, { v: 2, up: 1, miss: 0, at: 9 });
  assert.notEqual(before.unit, held);
  // 깨진 장부
  for (const bad of [null, 7, 'x', [], { v: 9 }, { v: '2', up: -3, miss: 'a', at: 'b', done: 5 }]) {
    assert.deepEqual(unitOf({ unit: bad }), { v: 1, up: 0, miss: 0, at: 0 }, `깨진 값 ${JSON.stringify(bad)}`);
  }
});

test('📐 흉내: 다 맞히는 아이는 열한 문제에 끝 · 늘 틀리는 아이는 ①에 머묾 · 맞힘·틀림이 번갈아 나오면 안 오르고 안 내림', () => {
  const m = {};
  let n = 0;
  while (unitStage(m) && n < 100) { unitStep(m, true, TODAY); n++; }
  assert.equal(n, UNIT_DRILL.up * 2 + UNIT_DRILL.done);
  const w = {};
  for (let i = 0; i < 100; i++) unitStep(w, false, TODAY);
  assert.equal(unitStage(w), 1);
  const z = { unit: { v: 2, up: 0, miss: 0, at: 1 } };
  for (let i = 0; i < 40; i++) unitStep(z, i % 2 === 0, TODAY);
  assert.equal(unitStage(z), 2);
});

const rec = (over = {}) => ({ k: 'unit', ok: 1, lv: 1, s: 4, ...over });
const rest = [{ k: 'cmp', ok: 1, s: 3 }, { k: 'sub', ok: 1 }, { k: 'add', ok: 1 }, { k: 'big', ok: 1 }];

test('📐 🐾 판 끝 (pokeCommit): 처음 답으로 단계 · 일지에 단계·걸린 초 · 💰·🎯는 다지기와 상관없이 그대로 · 다지기 문제가 아닌 📐은 안 셈 · 이상한 초는 안 적음', () => {
  const m = emptyMath();
  const a = pokeCommit(m, [rec(), ...rest], TODAY);
  assert.deepEqual(a.result, { ok: 5, total: 5, perfect: true, first: true, catch: 1 });
  assert.deepEqual(a.reward, { xp: 5 * REWARD.q.xp, coin: 5 * REWARD.q.coin + POKE.coin, items: {} });
  assert.deepEqual([m.unit.v, m.unit.up, m.unit.miss], [1, 1, 0]);
  assert.deepEqual(m.log.at(-1).qs[0], { k: 'unit', ok: 1, lv: 1, s: 4 });
  assert.deepEqual(m.log.at(-1).qs[1], { k: 'cmp', ok: 1, s: 3 }, '다른 꼴도 걸린 초');
  assert.deepEqual(m.log.at(-1).qs[2], { k: 'sub', ok: 1 }, '초가 없으면 칸도 없음');
  // 틀린 답
  pokeCommit(m, [rec({ ok: 0, tag: 'big' }), ...rest], TODAY);
  assert.deepEqual([m.unit.up, m.unit.miss], [0, 1]);
  assert.deepEqual(m.log.at(-1).qs[0], { k: 'unit', ok: 0, tag: 'big', lv: 1, s: 4 });
  // 끝낸 뒤의 📐(lv 없음)은 일지에만
  const d = emptyMath();
  pokeCommit(d, [{ k: 'unit', ok: 1 }, ...rest], TODAY);
  assert.equal(d.unit, undefined);
  assert.deepEqual(d.log.at(-1).qs[0], { k: 'unit', ok: 1 });
  // 이상한 값
  const b = emptyMath();
  pokeCommit(b, [rec({ s: Q_SEC_MAX + 1, lv: 9 }), { k: 'cmp', ok: 1, s: -1, lv: 2 }, { k: 'sub', ok: 1, s: 1.5 }], TODAY);
  assert.equal(b.unit, undefined, '단계가 깨진 답은 장부에 안 셈');
  assert.deepEqual(b.log.at(-1).qs, [{ k: 'unit', ok: 1 }, { k: 'cmp', ok: 1 }, { k: 'sub', ok: 1 }]);
  // 지금 단계보다 쉬운 문제의 답은 일지에만 — 다른 창에서 열어 둔 옛 판으로 ③을 끝내지 않게 (Codex 195차 #1)
  const st = emptyMath();
  st.unit = { v: 3, up: 4, miss: 1, at: 9 };
  pokeCommit(st, [rec({ lv: 2 }), ...rest], TODAY);
  assert.deepEqual(st.unit, { v: 3, up: 4, miss: 1, at: 9 }, '맞혀도 안 셈');
  assert.equal(st.log.at(-1).qs[0].lv, 2, '일지엔 남음');
  pokeCommit(st, [rec({ lv: 1, ok: 0 }), ...rest], TODAY);
  assert.deepEqual(st.unit, { v: 3, up: 4, miss: 1, at: 9 }, '틀려도 안 셈');
  unitFishCommit(st, { ok: true, lv: 2 }, TODAY, 20);
  assert.deepEqual(st.unit, { v: 3, up: 4, miss: 1, at: 9 }, '🎣도');
  pokeCommit(st, [rec({ lv: 3 }), ...rest], TODAY);
  assert.equal(st.unit.done, TODAY, '지금 단계 답은 셈');
  // 그 단계를 못 만들어 어려운 단계로 낸 문제는 센다
  const hi = emptyMath();
  pokeCommit(hi, [rec({ lv: 2 }), ...rest], TODAY);
  assert.deepEqual([hi.unit.v, hi.unit.up], [1, 1]);
  unitFishCommit(hi, { ok: true, lv: 3 }, TODAY, Date.now() + 5);
  assert.equal(hi.unit.up, 2);
  // 시계가 뒤로여도 다지기는 센다 (보상과 상관없는 장부)
  const c = emptyMath();
  c.poke = { d: '2026-11-05', n: 2 };
  pokeCommit(c, [rec(), ...rest], TODAY);
  assert.equal(c.unit.up, 1);
});

test('📐 🎣 답 (unitFishCommit): 일지 한 줄 + 단계 · 오늘 몫은 일지로 셈 · 단계 없는 답은 없는 일 · 입력 그대로', () => {
  const m = emptyMath();
  unitFishCommit(m, { ok: true, lv: 1, s: 6 }, TODAY, 1000);
  assert.deepEqual(m.log.at(-1), { d: TODAY, t: 1000, id: 'unit', mode: 'unit', ok: 1, n: 1, qs: [{ k: 'unit', ok: 1, lv: 1, s: 6 }] });
  assert.equal(m.unit.up, 1);
  unitFishCommit(m, { ok: false, lv: 1, tag: 'big', s: null }, TODAY, 1001);
  assert.deepEqual(m.log.at(-1).qs, [{ k: 'unit', ok: 0, lv: 1, tag: 'big' }]);
  assert.equal(m.unit.miss, 1);
  assert.equal(unitFishToday(m, TODAY), 2);
  assert.equal(unitFishToday(m, '2026-11-05'), 0, '다음 날은 새 몫');
  assert.equal(unitFishToday(null, TODAY), 0);
  const e = emptyMath();
  for (const bad of [null, undefined, {}, { ok: true }, { ok: true, lv: 0 }, { ok: true, lv: 4 }]) unitFishCommit(e, bad, TODAY, 5);
  assert.deepEqual([e.log.length, e.unit], [0, undefined]);
});

test('📐 병합: 바꾼 시각이 늦은 쪽 한 벌(칸마다 섞지 않음) · 옛 백업이 단계를 되돌리지 않음 · 내려간 단계도 그대로 · 차례를 바꿔도 같음 · 복사본은 입력과 따로 · 일지는 합집합', () => {
  const base = emptyMath();
  const hi = { ...base, unit: { v: 3, up: 4, miss: 0, at: 100 } };
  const lo = { ...base, unit: { v: 1, up: 1, miss: 1, at: 200 } };
  assert.deepEqual(mergeMath(hi, lo).unit, lo.unit, '늦게 내려간 쪽 — 큰 값으로 합치지 않는다');
  assert.deepEqual(mergeMath(lo, hi).unit, lo.unit, '차례를 바꿔도');
  assert.deepEqual(mergeMath(base, hi).unit, hi.unit, '한쪽만 있으면 그쪽');
  assert.deepEqual(mergeMath(hi, base).unit, hi.unit);
  assert.equal(mergeMath(base, base).unit, undefined);
  assert.deepEqual(mergeMath(hi, { ...base, unit: 'x' }).unit, hi.unit, '깨진 쪽은 버림');
  const done = { ...base, unit: { v: 3, up: 5, miss: 0, at: 300, done: TODAY } };
  assert.equal(mergeMath(lo, done).unit.done, TODAY);
  // 시각이 같으면 더 나아간 쪽 — 차례를 바꿔도 같게 (Codex 195차 #6)
  const ties = [[{ v: 3, up: 9, miss: 0, at: 1000 }, { v: 3, up: 5, miss: 0, at: 1000, done: TODAY }], [{ v: 3, up: 4, miss: 0, at: 1000 }, { v: 3, up: 5, miss: 0, at: 1000, done: TODAY }], [{ v: 2, up: 2, miss: 0, at: 1000 }, { v: 3, up: 0, miss: 1, at: 1000 }], [{ v: 2, up: 1, miss: 0, at: 1000 }, { v: 2, up: 2, miss: 0, at: 1000 }]];
  for (const [x, y] of ties) {
    assert.deepEqual(mergeMath({ ...base, unit: x }, { ...base, unit: y }).unit, y, JSON.stringify(y));
    assert.deepEqual(mergeMath({ ...base, unit: y }, { ...base, unit: x }).unit, y, JSON.stringify(y));
  }
  const merged = mergeMath(base, hi);
  merged.unit.v = 1;
  assert.equal(hi.unit.v, 3, '병합 결과를 고쳐도 입력은 그대로');
  const cl = cloneMath(hi);
  cl.unit.v = 1;
  assert.equal(hi.unit.v, 3, '복사본을 고쳐도 입력은 그대로');
  const x = { ...emptyMath() };
  const y = { ...emptyMath() };
  unitFishCommit(x, { ok: true, lv: 1 }, TODAY, 10);
  unitFishCommit(y, { ok: false, lv: 1 }, TODAY, 11);
  const both = mergeMath(x, y);
  assert.equal(unitFishToday(both, TODAY), 2, '두 기기의 답이 다 세어짐');
});

test('📐 저장 트랜잭션: 🐾 판 끝이 commitChalRound 한 번에 단계까지 · 🎣 답은 updateMath로 · 다시 읽어도 그대로', async () => {
  await initProfile();
  await updateMath((m) => { delete m.unit; m.log = []; });
  const saved = await commitChalRound((s) => pokeCommit(s, [rec(), ...rest], TODAY));
  assert.equal(saved.ok, true);
  await flushProfile();
  assert.deepEqual([(await getMath()).unit.v, (await getMath()).unit.up], [1, 1]);
  const s2 = await updateMath((m) => { unitFishCommit(m, { ok: true, lv: 1, s: 2 }, TODAY); });
  assert.equal(s2.unit.up, 2);
  await updateMath((m) => { unitFishCommit(m, { ok: true, lv: 1, s: 2 }, TODAY); });
  const m = await getMath();
  assert.deepEqual([m.unit.v, m.unit.up], [2, 0], '🐾·🎣가 같은 연속을 센다');
  assert.equal(unitFishToday(m, TODAY), 2);
});

test('📐 📤 줄: 지금 단계 · 최근 7일 단계마다 처음 답 · 🐾·🎣 수 · 자주 고른 실수 · 맞힘·틀림 가운데값 · 끝낸 날 · 옛 줄·7일 넘은 줄은 안 셈 · 일지 줄 · 🐾 줄은 그대로', () => {
  assert.equal(unitReport(emptyMath(), TODAY), '📐 단위 바꾸기 다지기: 지금 ①단계 · 최근 7일 없음');
  const m = emptyMath();
  pokeCommit(m, [rec({ ok: 0, tag: 'big', s: 3 }), ...rest], TODAY);
  pokeCommit(m, [rec({ ok: 0, tag: 'big', s: 5 }), ...rest], TODAY);
  pokeCommit(m, [rec({ ok: 1, s: 20 }), ...rest], TODAY);
  unitFishCommit(m, { ok: true, lv: 2, s: 30 }, TODAY, Date.now());
  unitFishCommit(m, { ok: false, lv: 2, tag: 'mix', s: 100 }, TODAY, Date.now() + 1);
  m.log.push({ d: '2026-10-20', t: 1, id: 'unit', mode: 'unit', ok: 0, n: 1, qs: [{ k: 'unit', ok: 0, lv: 3, tag: 'old', s: 9 }] }); // 7일 넘음
  m.log.push({ d: TODAY, t: 2, id: 'poke', mode: 'poke', ok: 0, n: 1, qs: [{ k: 'unit', ok: 0, tag: 'big' }] }); // 다지기 전 옛 줄 — 단계 없음
  const line = unitReport(m, TODAY);
  assert.equal(line, '📐 단위 바꾸기 다지기: 지금 ①단계 · 최근 7일 처음 답 ① 1/3 · ② 1/2 (🐾 3 · 🎣 2) · 자주 고른 실수 big 2 · mix 1 · 답까지 가운데값 맞힘 25초 · 틀림 5초');
  // 가운데값 — 짝수 개면 가운데 둘의 평균 (Codex 195차 #7)
  const mid = emptyMath();
  const ans = [[1, 2], [1, 10], [0, 3], [0, 9]];
  mid.log = ans.map(([ok, s], i) => ({ d: TODAY, t: i + 1, id: 'unit', mode: 'unit', ok, n: 1, qs: [{ k: 'unit', ok, lv: 1, s }] }));
  assert.ok(unitReport(mid, TODAY).endsWith('답까지 가운데값 맞힘 6초 · 틀림 6초'), unitReport(mid, TODAY));
  mid.log.push({ d: TODAY, t: 9, id: 'unit', mode: 'unit', ok: 1, n: 1, qs: [{ k: 'unit', ok: 1, lv: 1, s: 100 }] });
  assert.ok(unitReport(mid, TODAY).includes('맞힘 10초'), '홀수 개면 가운데 값 · 수로 정렬');
  const tagged = emptyMath();
  tagged.log = [{ d: TODAY, t: 1, id: 'unit', mode: 'unit', ok: 1, n: 1, qs: [{ k: 'unit', ok: 1, lv: 1, tag: 'big' }] }];
  assert.ok(!unitReport(tagged, TODAY).includes('자주 고른 실수'), '맞힌 답의 실수 표시는 안 셈');
  m.unit = { v: 3, up: 5, miss: 0, at: 9, done: '2026-11-03' };
  assert.match(unitReport(m, TODAY), /^📐 단위 바꾸기 다지기: 끝\(2026-11-03\) · 최근 7일/);
  const txt = mathReportText(m, TODAY);
  assert.ok(txt.includes('📐 단위 바꾸기 다지기:'), '📤에 줄');
  assert.match(txt, /🎣📐단위 unit 1\/1 📐②○30초/, '일지에 🎣 줄');
  assert.match(txt, /🐾포켓몬수학 poke 4\/5 📐①✘\(big\)3초 📏○3초/, '일지에 단계·초');
  assert.match(pokeReport(m, TODAY), /^🐾 포켓몬 수학 \(최근 7일\): 4판/);
  assert.ok(!Object.hasOwn(POKE_KINDS, 'lv'));
});

// ───────────── 🎣 ─────────────
const ALL = { dex: Object.fromEntries(SPECIES.map((s, i) => [s.key, { n: 1 + (i % 5), best: s.min + ((s.max - s.min) * ((i * 37) % 100)) / 100 }])) };
const RICH = { dex: { bungeo: { n: 7, best: 31.2 }, pirami: { n: 4, best: 14.2 }, ingeo: { n: 2, best: 48.5 }, megi: { n: 3, best: 71.8 }, gamulchi: { n: 1, best: 52.5 } } };

test('📐 🎣 다지기 문제 (씨앗 2000 × 세 단계 × 세 난이도): 🐾과 같은 단계 꼴 · 무게 「약」 · 한 자리까지 · 정답은 따로 센 값 · 크기 감각 · 실수 표시 · 🐋 단계 칸에 안 셈', () => {
  const by = { 1: 0, 2: 0, 3: 0 };
  for (let s = 1; s <= 2000; s++) {
    for (const stage of [1, 2, 3]) for (const lv of [1, 2, 3]) {
      const q = fishMathQ(ALL, s, '', lv, { stage, ask: true });
      const at = `씨앗 ${s} 단계 ${stage} 난이도 ${lv} ${q && q.text}`;
      assert.ok(q && q.fm && q.kind === 'unit', at);
      assert.equal(q.lv, 1, `${at} 🐋 칸에 안 셈`);
      assert.deepEqual(lvDelta(q, true), {});
      assert.equal(q.ud, stage, `${at} 다 있는 도감이면 그 단계`);
      by[q.ud]++;
      const { x, xs, u, b, want } = asked(q);
      assert.equal(u, 'kg', at);
      assert.equal(b, 'g', at);
      assert.ok(shapeOk(q.ud, x, xs), `${at} 꼴`);
      assert.equal(q.facts.length, 1);
      const fact = q.facts[0].match(/^(.+) 약 ([\d.]+) kg$/);
      assert.ok(fact, `${at} 띠 ${q.facts[0]}`);
      assert.ok(!/\.\d\d/.test(fact[2]), `${at} 소수 둘째 자리 없음`);
      const sp = SPECIES.find((f) => f.ko === fact[1]);
      assert.ok(sp, at);
      // 약 값은 도감 무게에서 그 자리까지 어림한 값
      const real = fishPool(ALL).find((f) => f.ko === fact[1]).H / 100;
      assert.ok(Math.abs(Number(fact[2]) - real) <= (q.ud === 1 ? 0.5 : 0.05) + 1e-9, `${at} 어림 ${fact[2]} ${real}`);
      if (q.ud === 2 && Number(fact[2]) >= 1) assert.ok(q.text.startsWith(`${fact[2]} kg은 ${Math.floor(Number(fact[2]))} kg과 ${xs} kg이에요.`), at);
      else assert.equal(x, Number(fact[2]), at);
      assert.equal(q.choices.length, 4, at);
      assert.equal(q.choices.filter((c) => c.ok).length, 1, at);
      assert.equal(new Set(q.choices.map((c) => num(c.text))).size, 4, at);
      assert.equal(q.choices.find((c) => c.ok).text, `${want} g`, at);
      for (const c of q.choices.filter((y) => !y.ok)) {
        assert.ok(c.trap && c.hint.length > 5, `${at} 실수·힌트 ${c.text}`);
        if (q.ud < 3) assert.ok(!c.hint.includes(`${want} g`), `${at} 힌트가 답을 말함`);
        if (c.trap === 'big') { assert.equal(num(c.text), want * 10); sizeOk(c.hint, want * 10, 'kg', 'g'); }
      }
      assert.equal(q.tip.split(' · ')[0], '💡 1 kg = 1000 g', at);
      assert.ok(q.solve.endsWith(`= ${want} g`), at);
      assert.ok(!/undefined|NaN|null/.test([q.text, q.tip, q.solve, ...q.choices.map((c) => c.hint)].join()), at);
    }
  }
  assert.ok(Object.values(by).every((n) => n === 6000), JSON.stringify(by));
});

test('📐 🎣 언제 내나: 몫이 있고 바로 앞이 📐이 아닐 때만 · 몫이 없으면 다른 꼴 · 다지는 동안 옛 어려운 꼴(1.38 kg) 없음 · 끝나면 옛 꼴 그대로 · 낼 물고기가 없으면 다음 단계 또는 보통 문제', () => {
  for (let s = 1; s <= 600; s++) {
    assert.equal(fishMathQ(RICH, s, 'unit', 1, { stage: 1, ask: true }).ud, undefined, '바로 앞이 📐이면 다른 꼴');
    for (const lv of [1, 2, 3]) {
      const q = fishMathQ(RICH, s, '', lv, { stage: 2, ask: false });
      assert.ok(q && q.ud === undefined && q.kind !== 'unit', `몫이 없으면 📐 없음 ${s} ${lv}`);
    }
    assert.equal(fishMathQ(RICH, s, 'wadd', 3, { stage: 3, ask: false }).kind, 'wadd', '3단계 꼴은 무게 합만 남는다');
    // 다지기가 끝났으면(또는 ud 없음) 옛 꼴과 씨앗까지 같다
    for (const lv of [1, 2, 3]) {
      const old = fishMathQ(RICH, s, '', lv);
      for (const ud of [null, undefined, { stage: 0, ask: true }, { stage: 0, ask: false }, { stage: 9, ask: true }]) assert.deepEqual(fishMathQ(RICH, s, '', lv, ud), old, `씨앗 ${s}`);
      assert.equal(old.ud, undefined);
    }
  }
  const oldUnit = [];
  for (let s = 1; s <= 300; s++) { const q = fishMathQ(RICH, s, 'wadd', 3); if (q.kind === 'unit') oldUnit.push(q); }
  assert.ok(oldUnit.length > 50 && oldUnit.every((q) => q.tip === '💡 1 kg = 1000 g · 0.01 kg = 10 g' && q.lv === 3 && q.ud === undefined), '끝난 뒤엔 옛 ★ 꼴');
  // 물고기가 가벼우면 — ①은 못 만들고 ②로 · ③은 못 만들어 보통 문제
  const light = { dex: { bungeo: { n: 2, best: 30.5 }, pirami: { n: 1, best: 14.2 } } };
  const pool = fishPool(light);
  assert.ok(pool.every((x) => x.H < 100), '둘 다 1 kg 아래');
  for (let s = 1; s <= 200; s++) {
    const a = fishMathQ(light, s, '', 1, { stage: 1, ask: true });
    assert.equal(a.ud, 2, '①을 못 만들면 ②');
    const c = fishMathQ(light, s, '', 1, { stage: 3, ask: true });
    assert.ok(c && c.ud === undefined && c.kind !== 'unit', '③을 못 만들면 쉬운 단계로 내리지 않고 보통 문제');
  }
  // 도감 기록은 종마다 최대 길이까지라 가장 무거워도 100 kg 아래 (🐾과 같은 범위 — 따로 막지 않는다)
  assert.ok(fishPool(ALL).every((x) => x.H < 10000) && fishPool({ dex: { daemuneo: { n: 1, best: 500 }, busiri: { n: 1, best: 400 } } }).every((x) => x.H < 10000));
  // 다른 꼴을 하나도 못 만드는 도감이면 옛 꼴로 — 다지기 때문에 문제가 사라지지 않게 (Codex 195차 #5)
  const soft = { dex: { jukkumi: { n: 1, best: 20 }, chammuneo: { n: 1, best: 80 } } };
  for (let s = 1; s <= 200; s++) {
    assert.ok(fishMathQ(soft, s), '옛 판에서도 나옴');
    for (const [ud, avoid] of [[{ stage: 1, ask: false }, ''], [{ stage: 2, ask: true }, 'unit'], [{ stage: 3, ask: false }, 'unit']]) {
      const q = fishMathQ(soft, s, avoid, 1, ud);
      assert.ok(q && q.kind === 'unit' && q.ud === undefined && q.lv === 3, `씨앗 ${s} ${JSON.stringify(ud)}`);
    }
  }
  assert.ok(FM_KIND_LIST.includes('unit') && FM_LEVEL.unit === 3);
  // 옛 꼴 힌트도 크기 감각으로
  const u = makeFishQ('unit', fishPool({ dex: { megi: { n: 1, best: 71.8 }, ingeo: { n: 1, best: 48.5 } } }), 3);
  const big = u.opts.find((o) => o.trap === 'big');
  const m = u.hints.big.match(/^🤔 (\d+) g이면 ([\d.]+) kg이에요\. .+ 그렇게 무거울까요\?$/);
  assert.ok(m, u.hints.big);
  assert.equal(Number(m[1]), num(big.t));
  assert.equal(Math.round(Number(m[2]) * 1000), num(big.t));
});

test('📐 🎣 차례 (unitTurn · mathMix): 하루 세 번 · 이미 답한 몫은 뺌 · 저장되면 새 단계 · 자정을 넘기면 안 냄 · 장부를 못 읽으면 다지기 없이 · 끝낸 아이는 없음 · 번갈아 내는 틀 안에서 앞뒤로 안 붙음', () => {
  const m = emptyMath();
  const t = unitTurn(m, TODAY);
  assert.deepEqual(t.now(), { stage: 1, ask: true });
  t.answered();
  t.answered();
  assert.equal(t.now().ask, true);
  t.answered();
  assert.equal(t.now().ask, false, '세 번이면 끝');
  t.answered();
  assert.equal(t.now().ask, false);
  const done = emptyMath();
  unitFishCommit(done, { ok: true, lv: 1 }, TODAY, 1);
  unitFishCommit(done, { ok: true, lv: 1 }, TODAY, 2);
  const t2 = unitTurn(done, TODAY);
  t2.answered();
  assert.equal(t2.now().ask, false, '앞서 연 창의 몫도 셈');
  assert.equal(unitTurn(done, '2026-11-05').now().ask, true, '다음 날은 새 몫');
  const next = emptyMath();
  next.unit = { v: 3, up: 0, miss: 0, at: 5 };
  t.kept(next);
  assert.equal(t.now().stage, 3, '저장되면 새 단계');
  let live = true;
  const t3 = unitTurn(m, TODAY, () => live);
  live = false;
  assert.deepEqual(t3.now(), { stage: 1, ask: false }, '자정을 넘기면 안 냄 · 옛 꼴도 안 냄');
  assert.deepEqual(unitTurn(null, TODAY).now().stage, 0, '장부를 못 읽으면 다지기 없이');
  assert.deepEqual(unitTurn({ unit: { v: 3, done: TODAY, at: 3 } }, TODAY).now().stage, 0);
  // 낚시터 차례 흉내 — 배운 수학 없음 · 문제마다 답함
  const ut = unitTurn(emptyMath(), TODAY);
  const ask = mathMix(() => null, (seed, avoid, lv) => fishMathQ(RICH, seed, avoid, lv, ut.now()));
  const kinds = [];
  for (let s = 1; s <= 30; s++) {
    const q = ask('math', s, 1);
    kinds.push(q.ud ? 'D' : q.kind === 'unit' ? 'U' : '-');
    if (q.ud) ut.answered();
  }
  assert.equal(kinds.filter((k) => k === 'D').length, UNIT_DRILL.fishDay, kinds.join(''));
  assert.ok(!kinds.includes('U'), `옛 꼴 없음 ${kinds.join('')}`);
  assert.ok(!kinds.join('').includes('DD'), `붙어 나오지 않음 ${kinds.join('')}`);
});

test('📐 화면·잇기: 판을 열 때 저장된 장부 · 단계·셈 문구가 아이 화면에 없음 · 🎣 카드 머리에 큰 물고기 표시 안 함 · 답은 처음 답·실수·시각으로', () => {
  const v = read('js/mathpokeview.js');
  assert.ok(v.includes('const unit = await getMath().then(unitStage, () => 0);'), '저장된 장부로');
  assert.ok(v.includes("evo: EVO, partner: Number(p.partner) || 0, unit });"), '판에 단계');
  assert.ok(v.includes('...(q.lv ? { lv: q.lv } : {}), s: ps.sec[i] }'), '일지에 단계·초');
  assert.ok(v.includes('if (firstTry) ps.sec[ps.i] = answerSecOf(ps.t0, Date.now());'), '처음 답까지');
  assert.ok(v.includes('if (ps.shown !== ps.i) { ps.shown = ps.i; ps.t0 = Date.now(); }'), '문제가 바뀔 때만 시계를 다시');
  const shown = [...v.matchAll(/el\([^)]*?['`]([^'`]*)['`]\)/g)].map((x) => x[1]).join(' | ');
  assert.ok(!/단계|다지기|잇달아/.test(shown), `아이 화면 글 ${shown}`);
  const lake = read('js/lakeview.js');
  assert.ok(lake.includes('const ut = unitTurn(await getMath().catch(() => null), today, alive);'), '연 때 장부');
  assert.ok(lake.includes('fishMathQ(lakeRaw(), seed, avoid, lv, ut.now())'), '물고기 수학에 차례');
  assert.ok(lake.includes('if (q && q.ud) {') && lake.includes('.then(ut.kept).catch(() => {});'), '답하면 저장 뒤 새 단계');
  const fv = read('js/fishview.js');
  assert.ok(fv.includes("const badge = q.redo ? redoBadge(q.redo.step) : q.ud ? '' : lvBadge(stage, ui.fish);"), '다지기 문제엔 큰 물고기 표시 없음');
  assert.ok(fv.includes("lvb.classList.toggle('is-big', !q.redo && !q.ud && lv >= 3);"));
  assert.equal(lvBadge('hook', { star: 5 }), '🐋 큰 물고기 문제', '보통 문제는 그대로');
});
