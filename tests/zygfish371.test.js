// 🟢 지가르데 셀 낚시 (v371 — 2026-10-30 아버님 「낚시하다가도 셀을 낚게 — 2% 정도」 → 기본안 「추천대로」) — node --test tests/zygfish371.test.js
// 입질마다 2%로 물고기 대신 셀(사투·뜰채 문제는 ★3 물고기와 같음) · 낚시 셀은 하루 하나 · 공부 끝 화면 셀(하루 3)과 따로 · 처음이면 코어 ·
// 📖 물고기 도감·💰·그날 낚은 마리에는 안 듦 · 셀 10·50·100 글·그림은 결과 카드에(🐣 창은 낚시터 아래에 깔림) · 📤 「오늘 찾은 곳」에 낚시
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FISH_SRC, SUBJECTS, DAY_MAX, CELL_MAX, STEP, ZYG_ID, zygOf, mergeZyg, zygCanFind, zygCanFish, zygFindRule, zygLine } from '../js/zygarde.js';
import { CELL_ODDS, cellRoll, cellFish, cellFate, fightStart, STARS, SPOTS, RIVER_SPOTS, SEA_SPOTS, catchRule } from '../js/fishing.js';
import { dayNum } from '../js/korean.js';
import { emptyProfile } from '../js/db.js';
import { initProfile, flushProfile, reloadProfile, zygFind, zygMap } from '../js/xp.js';
import { keepCell } from '../js/lakeview.js';

const src = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const DAY = 86400000;
const T0 = new Date(2026, 9, 31, 16).getTime();
const D0 = dayNum(T0);
const seenAt = (n) => [STEP.perfect, STEP.fifty, STEP.ten].find((s) => n >= s) || 0;
/** 코어는 있고 셀 n개 · 오늘 찾은 곳 없음 */
const withCells = (n, extra = {}) => ({ caught: {}, partner: null, zyg: { core: T0 - 9 * DAY, cells: n, keys: [`${D0 - 1}:math`], seen: seenAt(n) }, ...extra });
// 씨앗 난수 (mulberry32)
function m32(seed) { let a = (Math.imul(seed >>> 0, 0x9e3779b1) ^ 0x2545f491) >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

test('🟢 낚시 셀 열쇠 「날:fish」 — 장부가 지우지 않는다 · 모르는 곳은 그대로 버린다 · 과목 목록·하루 3은 그대로', () => {
  assert.equal(FISH_SRC, 'fish');
  assert.deepEqual(SUBJECTS, ['english', 'math', 'korean', 'nonsul'], '과목 셀은 그대로 넷');
  assert.equal(DAY_MAX, 3);
  assert.deepEqual(zygOf({ core: 1, keys: ['5:fish', '5:game', '5:fishing', '6:math', '5:fish'] }).keys, ['5:fish', '6:math']);
  assert.equal(zygOf({ core: 1, cells: 0, keys: ['5:english', '5:fish', '6:fish'] }).cells, 2, '낚시 열쇠도 셀 수로 센다(코어 하나 빼고)');
  // 옛 판 앱(v370 이하)은 「날:fish」를 버린다 — 셀 수는 줄지 않는다(cells 큰 쪽) · 두 사본이 서로 다른 날 낚은 셀을 옛 판이 합치거나 같은 날 다시 받는 일은 막지 못한다
  // (Codex 175차 P1 — 낚시 셀은 새 판에서만 생기고 기기 판은 내려가지 않아 아버님 「추천대로」 그대로 둠)
  const oldRead = { core: 1, cells: 4, keys: ['5:english'] }; // 옛 판이 「6:fish」를 버리고 다시 쓴 장부
  assert.equal(zygOf(oldRead).cells, 4, '셀 수는 그대로');
  // 두 기기에서 따로 낚은 셀 — 열쇠 합집합
  const m = mergeZyg({ core: 9, cells: 1, keys: [`${D0}:fish`] }, { core: 9, cells: 1, keys: [`${D0 - 1}:fish`] });
  assert.deepEqual([...m.keys].sort(), [`${D0 - 1}:fish`, `${D0}:fish`]);
  assert.equal(m.cells, 1, '열쇠 둘 = 코어 + 셀 하나 · 저장된 셀 수가 크면 그쪽');
});

test('🟢 낚시 셀은 하루 하나 · 공부 끝 화면 셀 하루 3과 따로 · 다음 날 다시', () => {
  const p = withCells(3);
  assert.equal(zygCanFish(p.zyg, T0), true);
  const f = zygFindRule(p, FISH_SRC, T0);
  assert.deepEqual({ ok: f.ok, found: f.found, cells: f.cells }, { ok: true, found: 'cell', cells: 4 });
  assert.ok(p.zyg.keys.includes(`${D0}:fish`));
  assert.equal(zygCanFish(p.zyg, T0 + 60000), false, '오늘은 하나');
  assert.equal(zygFindRule(p, FISH_SRC, T0 + 60000).why, 'day', '두 번째 낚시 셀은 안 받음');
  // 과목 셀 셋은 그대로 — 낚시 셀이 하루 3을 먹지 않는다
  for (const s of ['english', 'math', 'korean']) {
    assert.equal(zygCanFind(p.zyg, s, T0), true, s);
    assert.equal(zygFindRule(p, s, T0).ok, true, s);
  }
  assert.equal(zygFindRule(p, 'nonsul', T0).why, 'day', '과목은 하루 3');
  assert.equal(p.zyg.cells, 7);
  // 과목 셋을 먼저 찾은 날에도 낚시 셀은 나온다
  const q = withCells(3);
  for (const s of ['english', 'math', 'korean']) zygFindRule(q, s, T0);
  assert.equal(zygCanFind(q.zyg, 'nonsul', T0), false);
  assert.equal(zygCanFish(q.zyg, T0), true);
  assert.equal(zygFindRule(q, FISH_SRC, T0).ok, true);
  // 다음 날 — 다시 하나
  assert.equal(zygCanFish(p.zyg, T0 + DAY), true);
  assert.equal(zygFindRule(p, FISH_SRC, T0 + DAY).ok, true);
  assert.equal(zygCanFind(p.zyg, FISH_SRC, T0), false, '끝 화면 셀(addCell)은 과목만');
});

test('🟢 낚시가 처음이면 코어 · 큐브가 가득이면 안 걸림 · 셀 10·50·100 문턱도 같은 규칙(도감 +1 · 모습)', () => {
  const p = { caught: {}, partner: null, zyg: null };
  const c = zygFindRule(p, FISH_SRC, T0);
  assert.deepEqual({ ok: c.ok, found: c.found, cells: c.cells }, { ok: true, found: 'core', cells: 0 });
  assert.equal(zygCanFish(p.zyg, T0), false, '코어도 그날의 낚시 하나');
  const full = withCells(CELL_MAX);
  assert.equal(zygCanFish(full.zyg, T0), false);
  assert.equal(zygFindRule(full, FISH_SRC, T0).why, 'full');
  const g = withCells(9);
  const r = zygFindRule(g, FISH_SRC, T0);
  assert.equal(r.ev, 'gift', '논술에서 못 잡았어도 셀 10이면 지가르데');
  assert.equal(g.caught[ZYG_ID], 1);
  const h = withCells(49, { caught: { [ZYG_ID]: 1 } });
  assert.equal(zygFindRule(h, FISH_SRC, T0).ev, 'fifty');
  const k = withCells(99, { caught: { [ZYG_ID]: 1 } });
  assert.equal(zygFindRule(k, FISH_SRC, T0).ev, 'perfect');
  assert.equal(zygFindRule({ zyg: null }, 'fishing', T0).why, 'sub', '모르는 곳');
});

test('🟢 📤 줄 — 오늘 찾은 곳에 「낚시」', () => {
  assert.equal(zygLine({ core: 1, cells: 12, keys: [`${D0}:math`, `${D0}:fish`] }, T0), '🟢 지가르데 큐브: 셀 12/100 · 오늘 찾은 곳 수학·낚시 · 모습 10%');
  assert.equal(zygLine({ core: 1, cells: 12, keys: [`${D0 - 1}:fish`] }, T0), '🟢 지가르데 큐브: 셀 12/100 · 오늘 찾은 곳 없음 · 모습 10%');
});

test('🎣 입질마다 2% — 확률·셀 「물고기」 꼴 · 사투는 ★3과 같다 · 물고기 도감 규칙은 셀을 안 받는다', () => {
  assert.equal(CELL_ODDS, 0.02);
  assert.equal(cellRoll(() => 0.0199), true);
  assert.equal(cellRoll(() => 0.02), false);
  assert.equal(cellRoll(() => 0.5, 1), true, '시험용 odds 1이면 늘');
  assert.equal(cellRoll(() => 0, 0), false, 'odds 0이면 안 나옴');
  assert.equal(cellRoll(() => 0.019, NaN), true, '이상한 odds는 기본 2%');
  assert.equal(cellRoll(() => 0.021, NaN), false);
  assert.equal(cellRoll(() => 0.99, 5), true, '1 넘으면 1');
  for (const seed of [1, 7, 42]) {
    const rng = m32(seed);
    let n = 0;
    const N = 100000;
    for (let i = 0; i < N; i++) if (cellRoll(rng)) n++;
    assert.ok(Math.abs(n / N - 0.02) < 0.0025, `씨앗 ${seed}: ${(n / N * 100).toFixed(2)}%`);
  }
  for (const [spots, place] of [[SPOTS, 'lake'], [RIVER_SPOTS, 'river'], [SEA_SPOTS, 'sea']]) {
    const f = cellFish(spots[0]);
    assert.deepEqual({ cell: f.cell, star: f.star, place: f.place, badges: f.badges }, { cell: true, star: 3, place, badges: [] });
    const s = fightStart(f, spots[2].m, true, () => 0.5);
    assert.equal(s.marks.length, STARS[3].fight, '사투 표시점은 ★3과 같다');
  }
  // 셀을 물고기 도감 규칙에 넣으면 거절(📖·💰가 안 생긴다)
  const p = emptyProfile();
  assert.equal(catchRule(p, cellFish(SPOTS[0]), T0).ok, false);
  assert.equal(p.coins, 0);
});

test('🎣 cellFate — 넣었으면 ok · 다른 창이 먼저·큐브 가득만 물속으로 · 저장 실패·모르는 까닭은 🔁 (Codex 175차)', () => {
  assert.equal(cellFate({ ok: true, found: 'cell', cells: 3 }), 'ok');
  assert.equal(cellFate({ ok: true, found: 'core', cells: 0 }), 'ok');
  assert.equal(cellFate({ ok: false, why: 'day' }), 'gone');
  assert.equal(cellFate({ ok: false, why: 'full' }), 'gone');
  for (const r of [{ ok: false, why: 'save' }, { ok: false, why: 'unexpected' }, { ok: false, why: 'subject' }, { ok: false, why: 'sub' }, { ok: false }, { ok: 'yes' }, null, undefined]) assert.equal(cellFate(r), 'retry', JSON.stringify(r));
});

test('🎣 keepCell — zygFind(\'fish\')로 넣고 문턱 글을 붙인다 · 못 넣으면 까닭을 넘긴다', async () => {
  const calls = [];
  const note = { title: 't', text: 'x', art: () => null };
  const ok = await keepCell(async (s) => { calls.push(s); return { ok: true, found: 'cell', cells: 10, ev: 'ten', form: '10' }; }, (r) => (r.ev === 'ten' ? note : null));
  assert.deepEqual(calls, ['fish']);
  assert.deepEqual(ok, { ok: true, found: 'cell', cells: 10, note });
  const plain = await keepCell(async () => ({ ok: true, found: 'cell', cells: 4, ev: null }), () => { throw new Error('문턱이 아니면 안 부름'); });
  assert.deepEqual(plain, { ok: true, found: 'cell', cells: 4 });
  const core = await keepCell(async () => ({ ok: true, found: 'core', cells: 0, ev: null }));
  assert.equal(core.found, 'core');
  assert.deepEqual(await keepCell(async () => { throw new Error('저장 실패'); }), { ok: false, why: 'save' });
  assert.deepEqual(await keepCell(async () => ({ ok: false, why: 'day' })), { ok: false, why: 'day' });
  assert.deepEqual(await keepCell(async () => ({ ok: false })), { ok: false, why: 'save' });
  assert.deepEqual(await keepCell(async () => null), { ok: false, why: 'save' });
  // 문턱 글이 터져도 셀은 넣었다
  assert.deepEqual(await keepCell(async () => ({ ok: true, found: 'cell', cells: 50, ev: 'fifty' }), () => { throw new Error('그림'); }), { ok: true, found: 'cell', cells: 50 });
});

test('★ 진짜 저장 경로 — 낚시 셀은 하루 하나(다른 창이 먼저 받았으면 거절) · 저장 실패는 없던 일 · 과목 셀은 그대로 셋', async () => {
  await initProfile();
  await flushProfile();
  const cur = fakeIdb.get('profile', 'me') || emptyProfile();
  const today = dayNum(Date.now());
  fakeIdb.put('profile', { ...cur, zyg: { core: 5, cells: 3, keys: [`${today - 1}:math`] }, caught: {}, updatedAt: (cur.updatedAt || 0) + 1 });
  await reloadProfile();
  // 저장 실패 → 셀은 뜰채에 그대로(화면이 🔁)
  fakeIdb.failNext('profile');
  assert.deepEqual(await keepCell(), { ok: false, why: 'save' });
  assert.equal(fakeIdb.get('profile', 'me').zyg.cells, 3);
  const a = await keepCell();
  assert.deepEqual(a, { ok: true, found: 'cell', cells: 4 });
  assert.ok(fakeIdb.get('profile', 'me').zyg.keys.includes(`${today}:fish`));
  assert.equal(zygCanFish(zygMap(), Date.now()), false, '메모리도 맞춤 — 오늘은 더 안 걸림');
  assert.deepEqual(await keepCell(), { ok: false, why: 'day' });
  for (const s of ['english', 'math', 'korean']) assert.equal((await zygFind(s)).ok, true, s);
  assert.equal((await zygFind('nonsul')).why, 'day');
  assert.equal(fakeIdb.get('profile', 'me').zyg.cells, 7);
});

test('🎣 화면 잇기 — 입질 때만 굴림 · 셀이면 그림·결과 카드·🔁·물속으로 · 날 끝 목록 · 낚시터 호스트', () => {
  const v = src('js/fishview.js');
  const bite = v.slice(v.indexOf('function biteFish() {'), v.indexOf('async function hookSet()'));
  assert.ok(bite.includes("if (typeof h.cellOk === 'function' && cellRoll(Math.random, h.cellOdds) && h.cellOk()) return cellFish(ui.spot);"));
  assert.ok(bite.includes('return rollFish(ui.spot, ui.chum, ui.streak, Math.random, tiltNow());'));
  assert.ok(v.includes('if (!ui.fish) ui.fish = biteFish();'));
  assert.equal(v.split('cellRoll(').length - 1, 1, '셀 굴림은 입질 한 곳뿐(물속 그림자는 물고기만)');
  assert.ok(v.includes('if (f.cell) { await keepCell(f); return; }'), '셀은 물고기 도감에 안 적는다');
  const kc = v.slice(v.indexOf('async function keepCell(f) {'), v.indexOf('function keepFailed(f) {'));
  assert.ok(kc.includes('const fate = cellFate(r);'));
  assert.ok(kc.includes("if (fate === 'retry') { keepFailed(f); return; }"), '못 넣으면 뜰채에 둔 채 🔁');
  assert.ok(kc.includes("if (fate === 'gone') { cellGone(); return; }"));
  assert.ok(kc.indexOf('showCell(r)') > kc.indexOf("if (fate === 'gone')"), '넣은 뒤에만 「낚았다」');
  assert.ok(kc.includes("ui.caught.push(r.found === 'core' ? { ...f, core: true } : f);"), '날 끝 목록에 코어/셀 (Codex 175차)');
  assert.ok(v.includes("f.cell ? '🎒 큐브에 못 넣었어요' : '📖 도감에 못 적었어요'"));
  assert.ok(v.includes("for (const f of ui.caught) list.appendChild(el('li', '', f.cell ? (f.core ? '🔴 지가르데 코어' : '🟢 지가르데 셀') :"));
  assert.ok(v.includes('if (ui.fish.cell) drawCell(ctx, x, y, L * 0.8,'), '걸린 셀 그림');
  const sc = v.slice(v.indexOf('function showCell(r) {'), v.indexOf('function cellGone() {'));
  assert.ok(sc.includes('`🟢 지가르데 셀을 낚았어요! 큐브에 셀 ${r.cells}개`'));
  assert.ok(sc.includes("'🔴 지가르데 코어를 낚았어요! 🎒 가방에 지가르데 큐브가 생겼어요'"));
  assert.ok(sc.includes('if (!url || ui !== me || !card.isConnected) return;'), '늦은 그림은 카드가 그대로일 때만');
  assert.ok(!/남은|더 모으|\d+개 더/.test(sc), '남은 수 셈 문구 없음');
  const l = src('js/lakeview.js');
  assert.ok(l.includes('cellOk: () => zygCanFish(zygMap(), Date.now()),'));
  assert.ok(l.includes('onCell: () => keepCell(),'));
  assert.ok(l.includes("return /[?&]nosw=1/.test(s) && /[?&]cell=1\\b/.test(s) ? 1 : undefined;"), '시험용 확률은 nosw에서만');
  assert.ok(!l.slice(l.indexOf('export async function keepCell('), l.indexOf('function testCellOdds()')).includes('put('), '그날 낚은 마리(fishCatch)에 안 셈');
  // 🐣 창과 낚시 카드가 같은 문턱 글
  const z = src('js/zygview.js');
  assert.ok(z.includes('export function revealNote(r) {'));
  assert.ok(z.slice(z.indexOf('async function reveal(r) {')).includes('const n = revealNote(r);'));
  assert.ok(src('js/fishart.js').includes("const CELL_BODY = 'M20 4C30 4 36 12 35 21C34 31 27 36 20 36C12 36 5 30 5 21C5 12 10 4 20 4Z';"), '끝 화면 셀과 같은 꼴');
});
