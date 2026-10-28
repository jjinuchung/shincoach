// 🟢 지가르데 셀 모으기 (v352) — 규칙(zygarde.js) · 모습 그림 · 프로필 · 트랜잭션 · 배틀 스웜체인지 · 끝 화면 배선: node --test tests/zygarde352.test.js
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ZYG_ID, SUBJECTS, DAY_MAX, CELL_MAX, STEP, zygOf, mergeZyg, zygCanFind, zygNext, zygFindRule,
  zygFormOf, zygCan50, zygFormOpen, zygFormRule, zygPerfect, zygLine,
} from '../js/zygarde.js';
import { FORMS, formsOf, formIdOf, ZYG_FORMS, formUrl } from '../js/pokemon.js';
import { swarmDue, ZYG, BATTLE } from '../js/battle.js';
import { dayNum } from '../js/korean.js';
import { emptyProfile, cloneProfile, mergeStatRecord } from '../js/db.js';
import { initProfile, flushProfile, reloadProfile, zygFind, zygForm, zygMap, megaReady, zygBattle, getLook, getProfileSnapshot } from '../js/xp.js';
import { SNAP_KEYS, rewardSnap, holdingLines } from '../js/rewardlog.js';
import { setFigure } from '../js/items.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const DAY = 86400000;
const T0 = new Date(2026, 9, 28, 10).getTime();
const D0 = dayNum(T0);
const count = (s, sub) => s.split(sub).length - 1;

/** 지나온 문턱 (셀 n개면 처리했을 가장 높은 문턱) */
const seenAt = (n) => [STEP.perfect, STEP.fifty, STEP.ten].find((s) => n >= s) || 0;
/** 셀 n개가 모인 프로필 (코어는 찾음 · 오늘 찾은 과목 없음) */
const withCells = (n, extra = {}) => ({ caught: {}, partner: null, zyg: { core: T0 - 9 * DAY, cells: n, keys: [`${D0 - 1}:math`], seen: seenAt(n) }, ...extra });

test('🟢 모습 그림 id: PokeAPI zygarde-10·complete·mega · 변신 표(FORMS)는 그대로 74 · formsOf(718)은 그대로 null', () => {
  assert.equal(ZYG_ID, 718);
  assert.deepEqual(ZYG_FORMS, { ten: 10181, perfect: 10120, mega: 10301 });
  assert.equal(formIdOf(718, 'ten'), 10181);
  assert.equal(formIdOf(718, 'perfect'), 10120);
  assert.equal(formIdOf(718, 'mega'), 10301);
  assert.equal(formIdOf(718, 'gmax'), 0);
  assert.equal(formIdOf(6, 'mega'), FORMS[6].mega, '다른 포켓몬은 변신 표 그대로');
  assert.equal(formIdOf(25, 'ten'), 0, '지가르데 모습은 지가르데만');
  assert.equal(formsOf(718), null, '⭐ 변신 칸은 shop.js가 지가르데만 따로 그린다 (v313 시험 그대로)');
  assert.equal(Object.keys(FORMS).length, 74);
  assert.equal(formUrl(718, 'ten'), null, '받아 둔 그림이 없으면 null (50%폼 그림으로)');
  const src = read('js/pokemon.js');
  assert.match(src, /for \(const fid of Object\.values\(ZYG_FORMS\)\) known\.add\(fid\);/, '앱을 열 때 받아 둔 지가르데 모습 그림도 올린다');
});

test('🟢 장부 고쳐 읽기: 깨진 값은 없는 것으로 · 셀은 0~100 · 찾은 열쇠는 「날:과목」(과목은 넷 중에서) 한 번씩 · 열쇠가 셀보다 많으면 열쇠 수', () => {
  const empty = { core: 0, cells: 0, keys: [], form: '', formAt: 0, gave: 0, seen: 0 };
  for (const bad of [null, undefined, 'bad', 42, true, [], [1, 2]]) assert.deepEqual(zygOf(bad), empty);
  assert.deepEqual(zygOf({ core: -5, cells: 1e20, keys: ['5:math', 'x', '5:math', '6:english', 7, '5:game', ':math', '5:math:x', 'a:math', null], form: '30', formAt: NaN, gave: 3, seen: 999 }),
    { core: 0, cells: 0, keys: ['5:math', '6:english'], form: '', formAt: 0, gave: 1, seen: CELL_MAX });
  assert.equal(zygOf({ cells: 250 }).cells, CELL_MAX, '100을 넘으면 100');
  assert.equal(zygOf({ cells: 37.9 }).cells, 37);
  assert.equal(zygOf({ form: '10' }).form, '10');
  const four = ['1:math', '1:korean', '2:math', '3:nonsul'];
  assert.equal(zygOf({ core: 1, cells: 2, keys: four }).cells, 3, '열쇠 넷 = 코어 + 셀 셋');
  assert.equal(zygOf({ core: 1, cells: 7, keys: four }).cells, 7, '셀 수는 줄지 않는다');
  assert.equal(zygOf({ core: 0, cells: 0, keys: four }).cells, 0, '코어 전엔 열쇠로 세지 않는다');
  const many = Array.from({ length: 150 }, (_, i) => `${i}:math`);
  assert.equal(zygOf({ core: 1, keys: many }).cells, CELL_MAX, '열쇠로 세어도 100까지');
  assert.deepEqual(SUBJECTS, ['english', 'math', 'korean', 'nonsul']);
  assert.equal(DAY_MAX, 3);
  assert.deepEqual(STEP, { ten: 10, fifty: 50, perfect: 100 });
});

test('🟢 찾기: 맨 처음은 🔴 코어(셀 수에는 안 셈) → 그다음부터 셀 · 과목마다 하루 하나 · 모두 합쳐 하루 3 · 다음 날 다시', () => {
  const p = { caught: {}, partner: null };
  assert.equal(zygNext(p.zyg), 'core');
  assert.equal(zygCanFind(p.zyg, 'english', T0), true);
  const a = zygFindRule(p, 'english', T0);
  assert.deepEqual(a, { ok: true, found: 'core', cells: 0, ev: null });
  assert.equal(p.zyg.core, T0);
  assert.equal(zygNext(p.zyg), 'cell');
  assert.deepEqual(zygFindRule(p, 'english', T0 + 1000), { ok: false, why: 'subject' }, '같은 과목은 하루 하나');
  assert.equal(zygCanFind(p.zyg, 'english', T0), false);
  const b = zygFindRule(p, 'math', T0 + 2000);
  assert.equal(b.found, 'cell');
  assert.equal(b.cells, 1);
  assert.equal(zygFindRule(p, 'korean', T0 + 3000).cells, 2);
  assert.deepEqual(zygFindRule(p, 'nonsul', T0 + 4000), { ok: false, why: 'day' }, '하루 3번까지 (코어 포함)');
  assert.equal(zygCanFind(p.zyg, 'nonsul', T0), false);
  assert.deepEqual(p.zyg.keys, [`${D0}:english`, `${D0}:math`, `${D0}:korean`]);
  // 다음 날(자정 넘김) — 어제 찾은 과목은 안 센다 · 어제 열쇠는 남는다(병합에서 셀을 셀 때)
  assert.equal(zygCanFind(p.zyg, 'english', T0 + DAY), true);
  const c = zygFindRule(p, 'english', T0 + DAY);
  assert.equal(c.cells, 3);
  assert.deepEqual(p.zyg.keys, [`${D0}:english`, `${D0}:math`, `${D0}:korean`, `${D0 + 1}:english`]);
  assert.deepEqual(zygFindRule(p, 'english', T0 + DAY + 1000), { ok: false, why: 'subject' });
  assert.equal(zygFindRule(p, 'math', T0 + DAY + 2000).cells, 4, '다음 날 수학 — 어제 수학은 안 센다');
  // 모르는 과목
  assert.deepEqual(zygFindRule(p, 'game', T0 + DAY), { ok: false, why: 'sub' });
  assert.equal(zygCanFind(p.zyg, 'game', T0 + DAY), false);
});

test('🟢 셀 10: 지가르데가 없으면 큐브가 10%폼 지가르데를 만든다(도감 +1 · 처음이면 파트너) · 있으면 10%폼만 열린다', () => {
  const p = withCells(9);
  const r = zygFindRule(p, 'math', T0);
  assert.equal(r.ev, 'gift');
  assert.equal(r.cells, 10);
  assert.equal(p.caught[718], 1);
  assert.equal(p.partner, 718, '처음 얻은 포켓몬이면 파트너 (잡기와 같은 규칙)');
  assert.equal(p.zyg.form, '10');
  assert.equal(p.zyg.gave, 1);
  assert.ok(p.zyg.formAt >= T0);
  // 파트너가 있으면 그대로 · 도감의 다른 포켓몬도 그대로
  const q = withCells(9, { caught: { 25: 2 }, partner: 25 });
  zygFindRule(q, 'math', T0);
  assert.equal(q.partner, 25);
  assert.deepEqual(q.caught, { 25: 2, 718: 1 });
  // 논술에서 이미 잡았다 → 도감은 그대로 · 모습도 그대로(50%) · 10%폼을 고를 수 있게만
  const h = withCells(9, { caught: { 718: 1 } });
  const s = zygFindRule(h, 'math', T0);
  assert.equal(s.ev, 'ten');
  assert.equal(h.caught[718], 1);
  assert.equal(h.zyg.form, '');
  assert.equal(h.zyg.gave, 0);
  assert.equal(zygFormOf(h.zyg), '50');
  assert.equal(zygFormOpen(h.zyg, h.caught, '10'), true);
});

test('🟢 셀 50: 10%폼이었으면 50%폼으로 · 100: 퍼펙트폼 · 그 뒤로는 안 나온다', () => {
  const p = withCells(49, { caught: { 718: 1 }, zyg: { core: 1, cells: 49, form: '10', formAt: T0 + DAY * 99, gave: 1, seen: STEP.ten } });
  const r = zygFindRule(p, 'korean', T0);
  assert.equal(r.ev, 'fifty');
  assert.equal(r.form, '50');
  assert.equal(p.zyg.form, '50');
  assert.ok(p.zyg.formAt > T0 + DAY * 99, '바꾼 시각은 늘 앞으로 (시계가 뒤로 가도)');
  const q = withCells(49, { caught: { 718: 1 } });
  assert.equal(zygFindRule(q, 'korean', T0).ev, 'fifty');
  assert.equal(q.zyg.form, '', '고른 적 없으면 그대로(50%)');
  const z = withCells(99, { caught: { 718: 1 } });
  const t = zygFindRule(z, 'nonsul', T0);
  assert.equal(t.ev, 'perfect');
  assert.equal(t.cells, CELL_MAX);
  assert.equal(zygPerfect(z.zyg), true);
  assert.deepEqual(zygFindRule(z, 'english', T0), { ok: false, why: 'full' });
  assert.equal(zygCanFind(z.zyg, 'english', T0 + DAY), false, '100이면 더는 숨지 않는다');
  // 단계 사이의 셀은 알림 없음
  const m = withCells(20);
  assert.equal(zygFindRule(m, 'math', T0).ev, null);
});

test('🟢 모습 고르기: 10%는 셀 10 · 50%는 셀 50 또는 논술에서 잡은 지가르데 · 없는 모습·잠긴 모습은 안 됨', () => {
  const cube = withCells(12, { caught: { 718: 1 }, zyg: { core: 1, cells: 12, form: '10', formAt: 5, gave: 1, seen: STEP.ten } });
  assert.equal(zygCan50(cube.zyg, cube.caught), false, '큐브가 만든 지가르데뿐이면 셀 50까지 10%');
  assert.deepEqual(zygFormRule(cube, '50', T0), { ok: false, why: 'locked' });
  assert.deepEqual(zygFormRule(cube, '10', T0), { ok: true, same: true, form: '10' });
  assert.deepEqual(zygFormRule(cube, 'perfect', T0), { ok: false, why: 'form' }, '퍼펙트폼은 배틀에서만');
  // 논술에서 한 마리 더 잡았다 → 50%를 고를 수 있다
  cube.caught[718] = 2;
  assert.equal(zygCan50(cube.zyg, cube.caught), true);
  const r = zygFormRule(cube, '50', T0);
  assert.deepEqual(r, { ok: true, form: '50' });
  assert.equal(cube.zyg.form, '50');
  assert.ok(cube.zyg.formAt >= T0);
  // 셀 9에 논술 지가르데 → 10%는 아직
  const nat = withCells(9, { caught: { 718: 1 } });
  assert.deepEqual(zygFormRule(nat, '10', T0), { ok: false, why: 'locked' });
  assert.equal(zygFormOpen(nat.zyg, nat.caught, '50'), true);
  // 지가르데가 없으면 아무 모습도
  assert.equal(zygFormOpen(withCells(60).zyg, {}, '50'), false);
  assert.deepEqual(zygFormRule(withCells(60), '10', T0), { ok: false, why: 'locked' });
});

test('🟢 병합: 찾은 열쇠 합집합 · 셀 큰 쪽(열쇠가 더 많으면 열쇠 수) · 코어 이른 쪽 · 모습은 나중에 바꾼 쪽 · 문턱은 높은 쪽 (두 차례 모두)', () => {
  const a = { core: 100, cells: 12, keys: [`${D0}:math`], form: '10', formAt: 50, gave: 1, seen: STEP.ten };
  const b = { core: 80, cells: 9, keys: [`${D0}:korean`, `${D0}:math`], form: '50', formAt: 70, gave: 0, seen: 0 };
  for (const [x, y] of [[a, b], [b, a]]) {
    const m = mergeZyg(x, y);
    assert.equal(m.cells, 12);
    assert.equal(m.core, 80);
    assert.deepEqual([...m.keys].sort(), [`${D0}:korean`, `${D0}:math`]);
    assert.equal(m.form, '50');
    assert.equal(m.formAt, 70);
    assert.equal(m.gave, 1);
    assert.equal(m.seen, STEP.ten);
    assert.equal(zygCanFind(m, 'korean', T0), false, '어느 쪽에서든 찾은 과목은 그날 다시 안 나온다');
  }
  // 다른 날 열쇠도 모두 남는다
  const later = { ...b, keys: [`${D0 + 1}:english`] };
  for (const [x, y] of [[a, later], [later, a]]) {
    const m = mergeZyg(x, y);
    assert.deepEqual([...m.keys].sort(), [`${D0}:math`, `${D0 + 1}:english`]);
    assert.equal(zygCanFind(m, 'english', T0 + DAY), false);
    assert.equal(zygCanFind(m, 'math', T0 + DAY), true);
  }
  // 한쪽만 코어 · 한쪽이 깨짐
  assert.equal(mergeZyg({ core: 0, cells: 0 }, { core: 5, cells: 3 }).core, 5);
  for (const bad of ['bad', null, 42, []]) {
    assert.deepEqual(mergeZyg(bad, a), zygOf(a));
    assert.deepEqual(mergeZyg(a, bad), zygOf(a));
  }
});

test('🟢 따로 진행한 두 사본을 합쳐도 셀이 모두 남는다 · 건너뛴 셀 10 선물은 다음 찾기에서 (Codex 157차)', () => {
  // 같은 백업(코어 + 셀 8)에서 A는 수학 셀, B는 국어 셀을 받았다
  const base = { caught: {}, partner: null };
  for (let i = 9; i >= 1; i--) assert.equal(zygFindRule(base, 'english', T0 - i * DAY).ok, true);
  assert.equal(base.zyg.cells, 8);
  const A = structuredClone(base);
  const B = structuredClone(base);
  assert.equal(zygFindRule(A, 'math', T0).cells, 9);
  assert.equal(zygFindRule(B, 'korean', T0 + 5000).cells, 9);
  for (const [x, y] of [[A, B], [B, A]]) {
    const m = mergeZyg(x.zyg, y.zyg);
    assert.equal(m.cells, 10, '셀 하나도 안 빠진다');
    assert.equal(zygCanFind(m, 'math', T0), false);
    assert.equal(zygCanFind(m, 'korean', T0), false);
    assert.equal(zygCanFind(m, 'english', T0), true);
    // 옛 백업과 다시 합쳐도 두 번 세지 않는다
    assert.equal(mergeZyg(m, base.zyg).cells, 10);
    assert.equal(mergeZyg(m, m).cells, 10);
    // 합치느라 셀 10을 건너뛰었다 → 다음 찾기에서 지가르데가 생긴다 (한 번만)
    const p = { caught: {}, partner: null, zyg: m };
    const r = zygFindRule(p, 'english', T0 + 9000);
    assert.deepEqual([r.cells, r.ev], [11, 'gift']);
    assert.equal(p.caught[718], 1);
    assert.equal(p.zyg.form, '10');
    assert.equal(zygFindRule(p, 'nonsul', T0 + DAY).ev, null, '선물은 한 번');
    // 그사이 논술 지가르데를 팔았어도 다시 주지 않는다
    p.caught[718] = 0;
    assert.equal(zygFindRule(p, 'math', T0 + DAY + 1000).ev, null);
    assert.equal(p.caught[718], 0);
  }
});

test('🟢 프로필: 빈 프로필·복사·병합 입구에 zyg · 깨진 백업도 병합을 멈추지 않는다', () => {
  assert.deepEqual(emptyProfile().zyg, { core: 0, cells: 0, keys: [], form: '', formAt: 0, gave: 0, seen: 0 });
  const x = { ...emptyProfile(), zyg: { core: 5, cells: 30, keys: [`${D0}:math`], form: '10', formAt: 9, gave: 1, seen: STEP.ten }, updatedAt: 9 };
  const c = cloneProfile(x);
  c.zyg.keys.push(`${D0}:english`);
  c.zyg.cells = 99;
  assert.deepEqual(x.zyg.keys, [`${D0}:math`], '복사본');
  assert.equal(x.zyg.cells, 30);
  const y = { ...emptyProfile(), zyg: { core: 3, cells: 12, keys: [`${D0}:korean`] }, updatedAt: 20 };
  for (const [a, b] of [[x, y], [y, x]]) {
    const m = mergeStatRecord('profile', a, b);
    assert.equal(m.zyg.cells, 30, '옛 백업이 셀을 되돌리지 않는다');
    assert.equal(m.zyg.core, 3);
    assert.deepEqual([...m.zyg.keys].sort(), [`${D0}:korean`, `${D0}:math`]);
    assert.equal(m.zyg.seen, STEP.ten);
    assert.equal(m.zyg.form, '10');
  }
  for (const bad of ['bad', true, 42, [1]]) {
    const z = { ...emptyProfile(), zyg: bad, updatedAt: 30 };
    const m = mergeStatRecord('profile', x, z);
    assert.equal(m.zyg.cells, 30);
    assert.equal(mergeStatRecord('profile', z, x).zyg.cells, 30);
  }
});

// ── 저장소를 지나는 길 (가짜 IndexedDB) ──
let initDone = false;
async function seed(p) {
  if (!initDone) { await initProfile(); initDone = true; }
  await flushProfile();
  const cur = fakeIdb.get('profile', 'me') || emptyProfile();
  fakeIdb.put('profile', { ...cur, ...p, id: 'me', updatedAt: (cur.updatedAt || 0) + 1 });
  await reloadProfile();
}

test('🟢 트랜잭션: 찾기는 저장된 프로필로 · 저장이 안 되면 없던 일 · 다른 창이 먼저 찾은 과목은 못 받는다', async () => {
  await seed({ caught: {}, partner: null, zyg: zygOf(null) });
  const today = dayNum(Date.now());
  const a = await zygFind('english');
  assert.equal(a.ok, true);
  assert.equal(a.found, 'core');
  assert.ok(fakeIdb.get('profile', 'me').zyg.core > 0, '저장됨');
  assert.equal(zygMap().core > 0, true, '메모리도 맞춤');
  // 저장 실패 → 없던 일 (셀은 그대로 남아 다시 누를 수 있다)
  fakeIdb.failNext('profile');
  const f = await zygFind('math');
  assert.equal(f.ok, false);
  assert.equal(f.why, 'save');
  assert.deepEqual(fakeIdb.get('profile', 'me').zyg.keys, [`${today}:english`]);
  assert.equal(zygMap().cells, 0);
  // 다른 창이 수학 셀을 먼저 받았다(저장소에만) → 이 창의 메모리는 옛것이어도 거절
  const cur = fakeIdb.get('profile', 'me');
  fakeIdb.put('profile', { ...cur, zyg: { ...cur.zyg, cells: 1, keys: [...cur.zyg.keys, `${today}:math`] }, updatedAt: cur.updatedAt + 1 });
  const g = await zygFind('math');
  assert.deepEqual({ ok: g.ok, why: g.why }, { ok: false, why: 'subject' });
  const k = await zygFind('korean');
  assert.equal(k.ok, true);
  assert.equal(k.cells, 2);
  assert.deepEqual(fakeIdb.get('profile', 'me').zyg.keys, [`${today}:english`, `${today}:math`, `${today}:korean`]);
  const n = await zygFind('nonsul');
  assert.equal(n.why, 'day', '하루 3');
});

test('🟢 트랜잭션: 셀 10에 지가르데가 도감에 · 모습 고르기 · 💠 메가는 셀 100 + 🔑 + 💠일 때만 · 배틀 칸', async () => {
  await seed({ caught: {}, partner: null, items: {}, mons: {}, zyg: { core: 1, cells: 9 } });
  const r = await zygFind('nonsul');
  assert.equal(r.ev, 'gift');
  const st = fakeIdb.get('profile', 'me');
  assert.equal(st.caught[718], 1);
  assert.equal(st.partner, 718);
  assert.equal(st.zyg.form, '10');
  assert.equal(getProfileSnapshot().caught[718], 1);
  assert.deepEqual(await zygForm('50').then((x) => ({ ok: x.ok, why: x.why })), { ok: false, why: 'locked' });
  assert.equal(getLook(718).formUrl, null, '10%폼 그림을 아직 못 받았으면 null (50%폼 그림 + 다시 받기)');
  assert.equal(getLook(25).formUrl, null);
  // 셀 99 — 메가는 아직
  await seed({ items: { keystone: 1 }, mons: { 718: { mega: true } }, zyg: { core: 1, cells: 99, form: '50', formAt: 9, gave: 1, seen: STEP.fifty } });
  assert.equal(megaReady(718), false, '퍼펙트폼 전에는 💠 메가 못 함');
  assert.deepEqual(zygBattle(718), { perfect: false, perfectUrl: null });
  await seed({ zyg: { core: 1, cells: 100, form: '50', formAt: 9, gave: 1, seen: STEP.perfect } });
  assert.equal(megaReady(718), true);
  assert.equal(zygBattle(718).perfect, true);
  assert.equal(zygBattle(25), null);
  await seed({ items: {} });
  assert.equal(megaReady(718), false, '🔑 키스톤이 없으면');
  await seed({ items: { keystone: 1 }, mons: {} });
  assert.equal(megaReady(718), false, '💠를 안 끼웠으면');
  // 다른 포켓몬은 변신 표 그대로
  await seed({ items: { keystone: 1 }, mons: { 6: { mega: true } } });
  assert.equal(megaReady(6), true);
  assert.equal(megaReady(25), false, '메가가 없는 포켓몬');
});

test('🟢 그림 순서: 10%폼 그림 > 이로치 그림 > 일반 그림', () => {
  const fake = () => {
    const cls = { add() {}, remove() {}, toggle() {}, contains: () => false };
    const img = { attrs: {}, getAttribute(k) { return this.attrs[k] ?? null; }, set src(v) { this.attrs.src = v; }, get src() { return this.attrs.src; }, hidden: false, style: {}, classList: cls };
    return { img, classList: cls, style: {}, querySelector: (q) => (q === 'img' ? img : null), appendChild() {} };
  };
  const a = fake();
  setFigure(a, 'N', { formUrl: 'F', shinyUrl: 'S', shiny: false });
  assert.equal(a.img.src, 'F');
  const b = fake();
  setFigure(b, 'N', { formUrl: null, shinyUrl: 'S', shiny: false });
  assert.equal(b.img.src, 'S');
  const c = fake();
  setFigure(c, 'N', { formUrl: null, shinyUrl: null });
  assert.equal(c.img.src, 'N');
});

test('🟢 스웜체인지: 퍼펙트폼이 열렸고 · 이번 배틀에 아직이고 · 살아 있고 HP 절반 이하일 때 한 번 · 동료가 맞으면 안 함', () => {
  const z = { perfect: true };
  assert.equal(BATTLE.hp, 100);
  assert.equal(ZYG.perfectHp, 50);
  assert.equal(swarmDue(z, false, 50), true);
  assert.equal(swarmDue(z, false, 1), true);
  assert.equal(swarmDue(z, false, 51), false);
  assert.equal(swarmDue(z, false, 0), false, '쓰러지면 안 함');
  assert.equal(swarmDue(z, true, 30), false, '한 배틀에 한 번');
  assert.equal(swarmDue({ perfect: false }, false, 30), false, '셀 100 전');
  assert.equal(swarmDue(null, false, 30), false, '지가르데가 아님');
  const src = read('js/battle.js');
  assert.ok(src.includes('if (!pal && swarmDue(ui.my.zyg, ui.zPerfect, ui.myHp)) await swarmChange(run);'), '내가 맞았을 때만 — 📣 동료가 대신 맞으면 안 함');
  const fight = src.slice(src.indexOf('function startFight('), src.indexOf('\n}\n', src.indexOf('function startFight(')));
  assert.match(fight, /^ {2}ui\.zPerfect = false;/m, '배틀마다 다시 (주석이 아니라 실제 줄)');
  assert.ok(src.includes("['mega', ui.my.canMega && (!ui.my.zyg || ui.zPerfect), '💠'"), '지가르데의 💠는 퍼펙트폼 뒤에만');
  assert.ok(src.includes('ui.myHp = Math.min(BATTLE.hp, ui.myHp + ZYG.perfectHp);'), 'HP가 오른다(100까지)');
  // HP가 바뀌는 곳은 enemyTurn 한 곳 — 거기서만 본다 (물약은 HP를 올리기만)
  assert.equal(count(src, 'ui.myHp = Math.max(0, ui.myHp - dmg)'), 1);
});

test('🟢 배틀을 열 때 받던 도트가 스웜체인지 뒤에 와도 퍼펙트폼 그림을 덮지 않는다 · 📣 동료 도트는 그대로 바뀐다 (Codex 157차)', async () => {
  // battle.js의 fetchDot을 그대로 꺼내 돌린다 (배틀 화면 없이 — 받는 사이의 차례만 본다)
  const src = read('js/battle.js');
  const at = src.indexOf('function fetchDot(');
  const body = src.slice(at, src.indexOf('\n}\n', at) + 2);
  const ui = { open: true, run: 1, form: null, zPerfect: false };
  const shown = [];
  let arrive = null;
  const fetchDot = new Function('ui', 'animUrl', 'ensureAnim', 'showBattleMon', `${body}\nreturn fetchDot;`)(
    ui, () => null, () => new Promise((res) => { arrive = res; }), (fig) => shown.push(fig));
  const settle = () => new Promise((res) => setTimeout(res, 0));
  fetchDot('my', { id: 718 }, null);
  ui.zPerfect = true; // 받는 사이 스웜체인지
  arrive('718.gif');
  await settle();
  assert.deepEqual(shown, [], '50%폼 도트가 퍼펙트폼 그림을 덮지 않는다');
  fetchDot('pal', { id: 25 }, null, true);
  arrive('25.gif');
  await settle();
  assert.deepEqual(shown, ['pal'], '📣 동료는 내 모습과 상관없이');
  ui.zPerfect = false; // 스웜체인지 전이면 늦게 와도 바꾼다 (원래대로)
  fetchDot('my', { id: 718 }, null);
  arrive('718.gif');
  await settle();
  assert.deepEqual(shown, ['pal', 'my']);
});

test('🟢 배선: 배틀 고르기 세 벌 · 끝 화면 열세 곳 · 가방 · 📤 · 도감 칸 · 🐣 창 글 · sw', () => {
  for (const f of ['js/player.js', 'js/math.js', 'js/korbattleview.js']) {
    const s = read(f);
    assert.ok(s.includes('const canMega = megaReady(id);'), `${f} 💠`);
    assert.ok(s.includes('canMega, canGmax, zyg: zygBattle(id),'), `${f} 🟢`);
    assert.ok(!s.includes('const canMega = !!(f.mega && hasKeystone() && hasMegaStone(id));'), `${f} 옛 줄 없음`);
  }
  // 끝 화면 — 과목마다 (거는 자리를 숫자로 센다)
  const hooks = [
    ['js/koreanview.js', "addCell(box, 'korean', { live: () => ui.read === r });", 1], // 📚 글
    ['js/koreanview.js', "addCell: (box) => addCell(box, 'korean'),", 1],          // 탭 ctx
    ['js/kortabs.js', 'if (res.ok && ctx.addCell) ctx.addCell(box);', 1],            // 🔤 오늘의 낱말
    ['js/korpuzzleview.js', 'if (res.ok && ctx.addCell) ctx.addCell(box);', 1],      // 🧩 국어 퍼즐 판
    ['js/nonsulview.js', "addCell(box, 'nonsul', { live: () => S.r === r });", 1],   // 🖊️
    ['js/math.js', "addCell(card, 'math', { live: () => card.isConnected });", 4],   // ☀️ 끝 · 🎯 도전 · 개념 한 편 · ⚡ 3문제 한 판 끝(v354)
    ['js/math.js', "addCell: (box) => addCell(box, 'math') };", 1],                 // 퍼즐·숙제 ctx
    ['js/mathpuzzleview.js', 'if (ctx.addCell) ctx.addCell(box);', 1],               // 🧩 수학 퍼즐
    ['js/detectiveview.js', 'if (ctx.addCell) ctx.addCell(box);', 1],                // 🕵️
    ['js/grammarnote.js', "addCell(box, 'english', { live: () => S.r === r });", 1], // 📝 쪽지
    ['js/player.js', "onDoneShown: (host) => { addCell(host, 'english', { live: () => !host.hidden }); },", 2], // ✍️ 에세이 · 🔁 복습
  ];
  for (const [f, needle, n] of hooks) assert.equal(count(read(f), needle), n, `${f} ${needle}`);
  assert.ok(read('js/essay.js').includes('ui.o.onDoneShown($(\'essay-done\'));'));
  assert.ok(read('js/review.js').includes('o.onDoneShown(box);'));
  // 셀 화면 파일은 끝 화면 파일을 import하지 않는다 (돌지 않게)
  const zv = read('js/zygview.js');
  for (const f of ['koreanview', 'nonsulview', 'math.js', 'player', 'grammarnote', 'kortabs', 'korpuzzleview']) assert.ok(!zv.includes(`from './${f}`), f);
  assert.ok(read('js/pokedex.js').includes('if (z.core) parts.push(`🧊 지가르데 큐브 셀 ${z.cells}`);'), '🎒 가방 줄');
  assert.ok(read('js/shop.js').includes('if (isZyg) zygOptions(box, z, notes);'), '도감 모습 칸');
  // 모습을 고르고 기다리는 사이 도감을 닫거나 다른 포켓몬을 열면 글을 안 띄운다 — 저장 뒤 · 그림 뒤 두 번 (Codex 157차)
  const zo = read('js/shop.js').slice(read('js/shop.js').indexOf('function zygOptions('));
  const pick = zo.slice(0, zo.indexOf('box.appendChild(btn);'));
  assert.equal(count(pick, 'if (mon !== here) return;'), 2);
  assert.ok(pick.indexOf('const here = mon;') < pick.indexOf('await zygForm(form)'), '누른 순간 붙잡는다');
  const ht = read('js/hatch.js');
  assert.ok(ht.includes("$('hatch-title').textContent = o.title ||"));
  assert.ok(ht.includes("$('hatch-text').textContent = o.text ||"));
  assert.ok(ht.includes('export function anyModalOpen()'));
  const sw = read('sw.js');
  assert.ok(sw.includes("'./js/zygarde.js'") && sw.includes("'./js/zygview.js'"), '오프라인에서도');
  // 5세대 도트는 50%폼뿐 — 10%폼이면 도트를 쓰는 모든 곳(배틀·잡기·무대·🐣·도감 팝업·로켓단)이 일러스트로 (sprite.js 한 곳)
  const sp = read('js/sprite.js');
  assert.ok(sp.includes('if (noDot(Number(id))) return null;') && sp.includes('if (!key || noDot(key)) return null;'));
  assert.ok(read('js/xp.js').includes("setNoDot((id) => id === ZYG_ID && zygFormOf(profile.zyg) === '10');"));
  assert.ok(ht.includes("showDot($('hatch-dot'), o.dot === false ? 0 : o.id);"));
  assert.ok(zv.includes("dot: r.ev === 'fifty' && r.form !== '10'"), '🐣 창은 50%폼일 때만 도트');
});

test('🟢 📤 보상 기록: 셀 칸(늘기만) · 코어를 찾았으면 지금 가진 것에 한 줄', () => {
  assert.ok(SNAP_KEYS.some(([k]) => k === 'zygCells'));
  assert.equal(rewardSnap({ zyg: { core: 1, cells: 23 } }).zygCells, 23);
  assert.equal(rewardSnap({ zyg: 'bad' }).zygCells, 0);
  assert.equal(rewardSnap({}).zygCells, 0);
  const none = holdingLines({ zyg: { core: 0 } });
  assert.ok(!none.some((l) => l.includes('지가르데')), '코어 전엔 없음');
  const now = Date.now();
  const lines = holdingLines({ zyg: { core: 1, cells: 23, keys: [`${dayNum(now)}:math`, `${dayNum(now)}:korean`], form: '10', gave: 1 } });
  assert.ok(lines.includes('- 🟢 지가르데 큐브: 셀 23/100 · 오늘 찾은 곳 수학·국어 · 모습 10% · 큐브가 만든 지가르데'), lines.join('\n'));
  assert.equal(zygLine({ core: 1, cells: 5, keys: [`${D0 - 1}:math`] }, T0), '🟢 지가르데 큐브: 셀 5/100 · 오늘 찾은 곳 없음 · 모습 50%');
  assert.equal(zygLine(null, T0), '');
});
