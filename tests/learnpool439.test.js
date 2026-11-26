// 🎣 v439 「이미 배운 수학」 원천을 🌱에 맞추기 (2026-11-25 아버님 기본안 「이대로」) — node --test tests/learnpool439.test.js
// 🎣 낚시터·🎒 대여행·🎟️ 손님 맞이·🚚 이사가 함께 쓰는 수학 원천(math.journeyMathSource)이 rec.done 전부를 내서 🥚 배우는 중·🌱 쉬는 6학년·중1 칸까지 나왔다 →
//   learnedPool(m): 단계는 ⚡와 같게(🐣·👑·📏) · 학년은 ☀️와 같게(🌱 켜지면 6학년·중1 뺌 · 끄면 돌아옴) · 없으면 [] ·
//   make는 keys 밖의 칸이면 null(🔁 다시 풀기·🥅 뜰채 길) · redoPlan(…, allow)로 못 낼 칸이 다음 날 몫 자리를 막지 않게 · 📤 원천 한 줄
import { fakeIdb } from './fakeidb.js'; // ★ db.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  learnedPool, learnedPoolLine, quickPlan, restLine, mathReportText, gradeOf, STEMS, STEM_ORDER, REST_GRADE, QUICK,
} from '../js/mathprog.js';
import { GRADUATED } from '../js/review.js';
import { emptyMath, updateMath } from '../js/db.js';
import { redoPlan, REDO_NEXT_MAX } from '../js/fishing.js';

void fakeIdb;
const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const TODAY = '2026-11-25';
const T_REST = new Date(2026, 9, 23, 15).getTime();
const T_OLD = new Date(2026, 9, 5, 12).getTime();
const T_NEW = new Date(2026, 10, 1, 12).getTime();
const ON = { on: true, at: T_REST };
const OFF = { on: false, at: T_REST };
/** 학년마다 칸 id (줄기 차례대로 · 겹침 없음) */
const byGrade = {};
const ORDER = new Map();
for (const k of STEM_ORDER) for (const c of (STEMS[k] ? STEMS[k].list : [])) {
  if (ORDER.has(c.id)) continue;
  ORDER.set(c.id, ORDER.size);
  (byGrade[gradeOf(c.id)] = byGrade[gradeOf(c.id)] || []).push(c.id);
}
const G = (g, i) => byGrade[g][i];
const known = (extra = {}) => ({ done: true, box: 1, dueAt: '2026-11-01', lastAt: T_OLD, schedAt: T_OLD, ...extra });
const egg = (extra = {}) => known({ box: 0, ...extra });
const mk = (concepts, rest) => ({ ...emptyMath(), concepts, ...(rest ? { rest } : {}) });
const fk = (id, ok, ts) => `${id}|${ok}|${ts.toString(36)}00`; // 낚시 칸별 줄 (앱과 같은 꼴)
/** 씨앗 → 0 이상 1 미만 */
const seeded = (s) => { let x = (s * 2654435761) >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };

test('🎣 learnedPool: 🐣·👑·📏만 · 🥚 배우는 중·안 배운 칸·줄기 밖 칸은 뺌 · 줄기 차례 · 겹침 없음 · 없으면 []', () => {
  assert.deepEqual(learnedPool(null), []);
  assert.deepEqual(learnedPool(mk({})), []);
  const m = mk({
    [G(5, 1)]: known(),                            // 🐣 (줄기 차례로는 뒤)
    [G(4, 0)]: known({ box: GRADUATED }),          // 👑
    [G(4, 1)]: known({ box: 1, placed: true }),    // 📏
    [G(4, 2)]: known({ box: 0, placed: true }),    // 📏 (box 0이어도 진단으로 친 칸)
    [G(4, 3)]: egg(),                              // 🥚
    [G(4, 4)]: { done: false, lastAt: T_OLD },     // 안 배움
    X999: known(),                                 // 줄기에 없는 칸
  }, ON);
  const p = learnedPool(m);
  assert.deepEqual(new Set(p), new Set([G(4, 0), G(4, 1), G(4, 2), G(5, 1)]));
  assert.equal(new Set(p).size, p.length, '겹침 없음');
  assert.deepEqual(p, [...p].sort((a, b) => ORDER.get(a) - ORDER.get(b)), '줄기 차례(STEM_ORDER · 사다리 차례)');
  assert.deepEqual(learnedPool(mk({ [G(4, 3)]: egg(), [G(5, 0)]: egg() }, ON)), [], '🥚뿐이면 [] — 원천 null (옛 원천으로 돌아가지 않는다)');
});

test('🎣 learnedPool 🌱: 켜지면 6학년·중1은 🐣·👑·📏여도 뺌(켜기 전·뒤에 배운 칸 모두 — ☀️ dailyOk와 같게) · 꺼지거나 설정이 없으면 돌아옴 · 🥚는 늘 뺌', () => {
  const c = {
    [G(4, 0)]: known(),
    [G(6, 0)]: known({ schedAt: T_OLD }),          // 켜기 전 일정 — 쉬는 칸
    [G(6, 1)]: known({ schedAt: T_NEW }),          // 켠 뒤 새로 배움 — 쉬는 칸은 아니지만 ☀️에 안 냄
    [G(7, 0)]: known({ box: GRADUATED }),          // 👑 중1
    [G(7, 1)]: known({ placed: true }),            // 📏 중1
    [G(6, 2)]: egg(),                              // 🥚 6학년
    [G(5, 0)]: egg(),                              // 🥚 5학년
  };
  assert.deepEqual(learnedPool(mk(c, ON)), [G(4, 0)]);
  const off = new Set(learnedPool(mk(c, OFF)));
  assert.deepEqual(off, new Set([G(4, 0), G(6, 0), G(6, 1), G(7, 0), G(7, 1)]), '꺼지면 6학년·중1 🐣·👑·📏가 돌아옴');
  assert.deepEqual(new Set(learnedPool(mk(c))), off, '설정이 없으면 꺼짐과 같다(restOf)');
  // 깨진 설정은 꺼짐 — ☀️(restOf)와 같게 (내부 리뷰 6) · 기대 묶음은 손으로 적은 것
  for (const bad of [{ on: true, at: 0 }, { on: true }, { on: 'true', at: T_REST }]) {
    assert.deepEqual(new Set(learnedPool(mk(c, bad))), new Set([G(4, 0), G(6, 0), G(6, 1), G(7, 0), G(7, 1)]), JSON.stringify(bad));
    assert.match(learnedPoolLine(mk(c, bad)), / · 🌱 꺼짐이라 6학년·중1도 냄$/, JSON.stringify(bad));
  }
  for (const p of [learnedPool(mk(c, ON)), learnedPool(mk(c, OFF))]) {
    assert.ok(!p.includes(G(6, 2)) && !p.includes(G(5, 0)), '🥚는 켜고 끄는 것과 상관없이 뺌');
  }
});

test('🎣 learnedPool 무작위 기록 2000개: 판정식(done이고 placed이거나 box ≥ 1 · 🌱 켜지면 학년 < 6)과 꼭 같음 · 줄기 차례 · 겹침 없음 · 켜짐이면 ⚡ 후보와 같은 묶음', () => {
  const ids = [...ORDER.keys()];
  for (let s = 1; s <= 2000; s++) {
    const r = seeded(s);
    const concepts = {};
    const n = Math.floor(r() * 18);
    for (let i = 0; i < n; i++) {
      const id = r() < 0.05 ? `X${i}` : ids[Math.floor(r() * ids.length)];
      const kind = Math.floor(r() * 6);
      concepts[id] = kind === 0 ? { done: false, lastAt: 1 }
        : kind === 1 ? { done: true, box: 0, schedAt: r() < 0.5 ? T_OLD : T_NEW }
          : kind === 2 ? { done: true, box: 0, placed: true }
            : { done: true, box: 1 + Math.floor(r() * GRADUATED), schedAt: r() < 0.5 ? T_OLD : T_NEW };
    }
    const restState = r() < 0.4 ? ON : r() < 0.5 ? OFF : null;
    const m = mk(concepts, restState);
    const p = learnedPool(m);
    const on = !!(restState && restState.on);
    const want = Object.entries(concepts)
      .filter(([id, v]) => ORDER.has(id) && v.done && (v.placed || (v.box || 0) >= 1) && (!on || gradeOf(id) < REST_GRADE))
      .map(([id]) => id);
    assert.deepEqual(new Set(p), new Set(want), `씨앗 ${s}`);
    assert.equal(new Set(p).size, p.length, `씨앗 ${s} 겹침`);
    for (let i = 1; i < p.length; i++) assert.ok(ORDER.get(p[i - 1]) < ORDER.get(p[i]), `씨앗 ${s} 차례`);
    if (on) {
      // ⚡ 3문제 한 판이 뽑는 칸은 늘 이 원천 안 — 6학년·중1을 늘 빼는 ⚡와 켜진 🌱이 같은 묶음
      for (const x of quickPlan(m, s)) assert.ok(p.includes(x.id), `씨앗 ${s} ⚡ ${x.id}`);
      if (p.length >= QUICK.n) assert.equal(quickPlan(m, s).length, QUICK.n, `씨앗 ${s} 셋 이상이면 ⚡도 셋`);
    }
  }
});

test('🎣 📤 원천 한 줄(learnedPoolLine): 칸 수 · 🥚 뺀 수 · 🌱 켜짐이면 6학년·중1 뺀 수 / 꺼짐 · 없으면 물고기 수학 · 셋을 더하면 배운 칸 전부 · 수학 요약 글에 🌱 줄 바로 뒤', () => {
  // G(6, 2)는 🌱를 켠 뒤 배운 칸 — 쉬는 칸(isResting)은 아니지만 원천에선 빠진다: 「뺀 6학년·중1」은 isResting이 아니라 dailyOk로 센다 (내부 리뷰 5)
  const c = { [G(4, 0)]: known(), [G(4, 1)]: egg(), [G(5, 0)]: known({ placed: true }), [G(6, 0)]: known(), [G(6, 1)]: egg(), [G(6, 2)]: known({ schedAt: T_NEW }), [G(7, 0)]: known({ box: GRADUATED }), X999: known() };
  assert.equal(learnedPoolLine(mk(c, ON)), '🎣 배운 수학 원천(낚시터·대여행·손님 맞이) 2칸 — 🥚 배우는 중 1칸 뺌 · 🌱 6학년·중1 4칸 뺌');
  assert.equal(learnedPoolLine(mk(c, OFF)), '🎣 배운 수학 원천(낚시터·대여행·손님 맞이) 5칸 — 🥚 배우는 중 2칸 뺌 · 🌱 꺼짐이라 6학년·중1도 냄');
  assert.equal(learnedPoolLine(mk(c)), learnedPoolLine(mk(c, OFF)), '설정이 없으면 꺼짐과 같은 줄');
  assert.equal(learnedPoolLine(mk({ [G(4, 1)]: egg() }, ON)), '🎣 배운 수학 원천(낚시터·대여행·손님 맞이) 0칸 — 🥚 배우는 중 1칸 뺌 · 🌱 6학년·중1 0칸 뺌 · 낼 칸이 없어 배운 수학은 건너뜀');
  assert.equal(learnedPoolLine(mk({ [G(4, 1)]: egg() }, OFF)), '🎣 배운 수학 원천(낚시터·대여행·손님 맞이) 0칸 — 🥚 배우는 중 1칸 뺌 · 🌱 꺼짐이라 6학년·중1도 냄 · 낼 칸이 없어 배운 수학은 건너뜀');
  for (const rs of [ON, OFF]) {
    const m = mk(c, rs);
    const nums = learnedPoolLine(m).match(/(\d+)칸/g).map((x) => Number(x.replace('칸', '')));
    const doneInStems = Object.entries(c).filter(([id, v]) => ORDER.has(id) && v.done).length;
    assert.equal(nums.reduce((a, b) => a + b, 0), doneInStems, `${rs.on} — 원천 + 🥚 + 6학년·중1 = 배운 칸`);
    const lines = mathReportText(m, TODAY).split('\n');
    assert.equal(lines[lines.indexOf(restLine(m)) + 1], learnedPoolLine(m), '🌱 줄 바로 뒤');
  }
});

test('🔁 redoPlan(…, allow): 못 낼 칸(🥚·🌱 쉬는 학년)은 다음 날 몫·오늘 몫에서 빼고 남은 자리를 낼 수 있는 칸이 씀 · allow가 없으면 예전 그대로', () => {
  const bad = Array.from({ length: REDO_NEXT_MAX }, (_, i) => `bad${i}`);
  const prev = { date: '2026-11-24', fishMathKeys: [...bad.map((id, i) => fk(id, 0, 10 + i)), fk('ok.a', 0, 100), fk('ok.b', 0, 101)] };
  const today = { date: TODAY, fishMathKeys: [fk('bad.t', 0, 200), fk('ok.t', 0, 201)] };
  const all = redoPlan([prev, today], TODAY);
  assert.deepEqual(all.next, bad, 'allow 없음 — 먼저 틀린 12칸이 자리를 다 씀 (예전 그대로)');
  assert.deepEqual(all.same, ['bad.t', 'ok.t']);
  const allow = new Set(['ok.a', 'ok.b', 'ok.t']);
  const p = redoPlan([prev, today], TODAY, allow);
  assert.deepEqual(p.next, ['ok.a', 'ok.b'], '못 낼 칸이 자리를 막지 않음');
  assert.deepEqual(p.same, ['ok.t']);
  assert.deepEqual(Object.keys(p.meta).sort(), ['ok.a', 'ok.b', 'ok.t']);
  assert.deepEqual(redoPlan([prev, today], TODAY, new Set()), { next: [], same: [], done: [], meta: {} }, '배운 수학이 없으면(원천 null) 다시 풀기 없음');
  // 거른 동안에도 빚은 지우지 않는다 — 🌱를 끄거나 🥚가 🐣가 되어 원천에 다시 들면 7일 안의 것은 돌아옴 (Codex 247차)
  assert.deepEqual(redoPlan([prev, today], TODAY, new Set(['bad3', 'ok.a'])).next, ['bad3', 'ok.a']);
  assert.deepEqual(redoPlan([prev, today], TODAY, ['ok.a']), all, 'Set이 아니면 거르지 않는다');
});

test('★ journeyMathSource 실제로 돌리기 (가짜 IndexedDB · Codex 247차): keys = 아는 칸 · make는 🥚·6학년·줄기 밖 칸이면 null · 아는 칸은 보기·숫자판 · 🌱 끄면 6학년 돌아옴 · 낼 칸이 없으면 null', async () => {
  const math = await import('../js/math.js'); // DOM은 부를 때만 — 원천은 기록만 읽는다
  await updateMath((m) => { m.concepts = { [G(4, 0)]: known(), [G(4, 1)]: egg(), [G(6, 0)]: known({ box: 2 }) }; m.rest = { ...ON }; });
  const src = await math.journeyMathSource();
  assert.deepEqual(src.keys, [G(4, 0)]);
  for (const id of [G(4, 1), G(6, 0), 'X999']) assert.equal(src.make(id, 123, 1), null, id);
  const q = src.make(G(4, 0), 123, 1);
  assert.ok(q && q.id === `m:${G(4, 0)}` && q.choices.filter((c) => c.ok).length === 1, '아는 칸은 보기 문제');
  const typed = src.make(G(4, 0), 123, 1, { typed: true });
  assert.ok(typed && typed.pad, '숫자판(✍️ 직접 쓰기)도 — 보기 문제가 아니라 숫자판 꼴 (Codex 248차)');
  await updateMath((m) => { m.rest = { on: false, at: T_REST + 1 }; });
  const off = await math.journeyMathSource();
  assert.deepEqual(off.keys, [G(4, 0), G(6, 0)].sort((a, b) => ORDER.get(a) - ORDER.get(b)));
  assert.ok(off.make(G(6, 0), 123, 1), '🌱 끄면 6학년 칸도');
  assert.equal(off.make(G(4, 1), 123, 1), null, '🥚는 그대로 뺌');
  await updateMath((m) => { m.concepts = { [G(4, 1)]: egg() }; });
  assert.equal(await math.journeyMathSource(), null, '🥚뿐이면 원천 없음');
});

test('🔌 잇기: journeyMathSource가 learnedPool로 keys · make 맨 앞에서 keys 밖이면 null · 낚시터가 원천 keys로 다시 풀기 계획을 거름 · 주석 · 📊 설명 · sw v439', () => {
  const mj = read('js/math.js');
  const i = mj.indexOf('export async function journeyMathSource() {');
  assert.ok(i >= 0);
  const body = mj.slice(i, mj.indexOf('\n}\n', i));
  assert.match(body, /const keys = learnedPool\(st\);\n\s+if \(!keys\.length\) return null;\n\s+const allow = new Set\(keys\);/);
  assert.match(body, /make\(id, seed, lv = 1, opt = \{\}\) \{\n\s+if \(!allow\.has\(id\)\) return null;[^\n]*\n\s+const sx = stemOf\(id\);/, 'make 맨 앞');
  assert.doesNotMatch(body, /ladderOf\(|x\.state === 'done'/, '옛 고리(rec.done 전부)가 남지 않음');
  assert.ok(mj.includes("  learnedPool, // 🎣 배운 수학 원천 칸 — ⚡와 같은 단계 · ☀️와 같은 학년 (v439)\n  RELEARN_MODES, relearnPage,"));
  const head = mj.slice(mj.lastIndexOf('/**', i), i);
  for (const w of ['🐣 안다·👑·📏', '🥚 배우는 중은 안 낸다', '🌱 학교 진도 먼저가 켜져 있으면 6학년·중1', 'make는 keys 밖의 칸이면 null']) assert.ok(head.includes(w), `주석: ${w}`);
  const lk = read('js/lakeview.js');
  assert.match(lk, /const mathKeys = new Set\(\(ui\.src && ui\.src\.math && Array\.isArray\(ui\.src\.math\.keys\)\) \? ui\.src\.math\.keys : \[\]\);[^\n]*\n\s+const rq = redoQueue\(redoPlan\(days, today, mathKeys\)\);/);
  assert.ok(lk.indexOf('ui.src = await loadSources();') < lk.indexOf('const mathKeys = new Set('), '원천을 읽은 뒤');
  assert.match(lk.split('\n')[2], /수학 이미 아는 칸\(🐣·👑·📏 · 🌱 켜지면 6학년·중1 뺌 — v439\)/);
  const fs = read('js/fishing.js');
  assert.match(fs, /export function redoPlan\(days, today, allow = null\) \{\n\s+const can = \(id\) => !\(allow instanceof Set\) \|\| allow\.has\(id\);/);
  const st = read('js/stats.js');
  assert.ok(st.includes('🎣 낚시터·🎒 대여행·🎟️ 손님 맞이의 「배운 수학」도 켜져 있으면 6학년·중1 칸을 내지 않아요'));
  assert.ok(st.includes("'🌱 끄기 — 6학년·중1 칸도 ☀️·🎣에 다시'"));
  // 판 번호 — v439 이상이고 sw와 version이 같게 (v440에서 넓힘 — 다음 판이 이 시험을 깨지 않게)
  const swv = Number((read('sw.js').match(/const CACHE_VERSION = 'v(\d+)';/) || [])[1]);
  const apv = Number((read('js/version.js').match(/export const APP_VERSION = 'v(\d+)';/) || [])[1]);
  assert.ok(swv >= 439 && swv === apv, `판 ${swv} · ${apv}`);
});
