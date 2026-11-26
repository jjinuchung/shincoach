// 🎲 v442 ☀️ 섞어 풀기는 🐣·👑·📏 칸 먼저 — 🥚 배우는 중은 모자랄 때만 (2026-11-26 아버님 기본안 「가자」) — node --test tests/mixegg442.test.js
// 섞어 풀기 칸(dailyPlan의 mix)은 🥚가 생기기 전(v105)에 「사다리의 done 전부」로 짜여, 🥚 배우는 중 칸도 안 본 지 오래면 먼저 나왔다 ·
//   v421부터 ☀️ 묶음(🎯·🥚 알·✨·🎟️)이 섞어 풀기의 처음 답 반 이상에 걸려 있다 · ⚡·🎣·⚔️🚀는 이미 🥚를 뺀다 →
//   고르는 차례 맨 앞에 「🥚인가」 한 단계 · 아예 빼지는 않는다(🥚 2칸으로 잠긴 날 ☀️가 사라진다 — mathknow 「오늘 배운 🥚 둘은 섞어 풀기로」)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dailyPlan, ladderOf, stageOf, STEMS, MIX_CONCEPTS, SCHOOL_GRADE, REST_GRADE, gradeOf } from '../js/mathprog.js';
import { GRADUATED } from '../js/review.js';
import { emptyMath } from '../js/db.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const TODAY = '2026-11-26';
const T_REST = new Date(2026, 9, 23, 15).getTime();
const ON = { on: true, at: T_REST };
const OFF = { on: false, at: T_REST };
/** 분수 줄기 i번째 칸 (학년 4·4·4·5·5·5·5·5·6·6) */
const F = (i) => STEMS.fraction.list[i].id;
/** 확인 차례가 아닌(앞날 dueAt) 🐣 · lastAt = 마지막으로 본 때 */
const kn = (lastAt, extra = {}) => ({ done: true, box: 1, dueAt: '2026-12-30', lastAt, schedAt: lastAt, ...extra });
const eg = (lastAt, extra = {}) => kn(lastAt, { box: 0, ...extra });
const mk = (concepts, rest) => ({ ...emptyMath(), concepts, ...(rest ? { rest } : {}) });
const mixIds = (p) => p.mix.filter((x) => !x.note).map((x) => x.id);
const seeded = (s) => { let x = (s * 2654435761) >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };

test('🎲 🐣·👑·📏가 셋 이상이면 🥚는 안 본 지 가장 오래돼도 안 나옴 (전엔 맨 먼저 나왔다)', () => {
  assert.equal(MIX_CONCEPTS, 3);
  const c = { [F(0)]: kn(300), [F(1)]: kn(200, { box: GRADUATED }), [F(2)]: kn(100, { box: 0, placed: true }), [F(3)]: eg(1) };
  assert.equal(stageOf(c[F(3)]), 'learning');
  assert.equal(stageOf(c[F(2)]), 'placed');
  for (const rs of [ON, OFF, null]) {
    const p = dailyPlan(mk(c, rs), TODAY, 'fraction', 3);
    assert.equal(p.roundStem, 'fraction');
    assert.equal(p.roundId, F(4), '개념 편은 ▶ 다음 칸 (그대로)');
    assert.deepEqual(new Set(mixIds(p)), new Set([F(0), F(1), F(2)]), JSON.stringify(rs));
  }
});

test('🎲 🐣·👑·📏가 모자라면 그 칸 전부 + 남은 자리는 🥚 중 안 본 지 오래된 것부터 · 🥚 2칸으로 잠긴 날도 ☀️는 그대로(섞어 풀기 + 「다음 날 확인」)', () => {
  const c = { [F(0)]: kn(500), [F(1)]: kn(400, { placed: true }), [F(2)]: eg(50), [F(3)]: eg(10) };
  const p = dailyPlan(mk(c, OFF), TODAY, 'fraction', 3);
  assert.equal(p.roundId, null, '🥚 2칸 — 새 칸 잠금');
  assert.equal(p.waiting, true);
  assert.deepEqual(new Set(mixIds(p)), new Set([F(0), F(1), F(3)]), '🐣·📏 둘 + 오래된 🥚 하나');
  // 오늘 배운 🥚 둘뿐이면 둘 다 (v156 mathknow와 같은 길)
  const only = dailyPlan(mk({ [F(0)]: eg(Date.now()), [F(1)]: eg(Date.now()) }, OFF), TODAY, 'fraction', 3);
  assert.equal(only.roundId, null);
  assert.equal(only.waiting, true);
  assert.deepEqual(new Set(mixIds(only)), new Set([F(0), F(1)]), '☀️가 사라지지 않음');
});

test('🎲 🌱 켜짐: 🥚 단계가 학년 무리보다 먼저 — 4학년 🥚보다 5학년 🐣 · 같은 단계 안에서는 예전처럼 4학년 먼저 · 6학년·중1은 그대로 뺌', () => {
  const c = { [F(0)]: eg(1), [F(1)]: kn(5), [F(2)]: kn(6), [F(3)]: kn(7), [F(4)]: kn(8), [F(8)]: kn(0) };
  const on = dailyPlan(mk(c, ON), TODAY, 'fraction', 3);
  assert.equal(on.roundStem, 'fraction');
  assert.deepEqual(new Set(mixIds(on)), new Set([F(1), F(2), F(3)]), '4학년 🐣 둘 → 5학년 🐣 중 오래된 것 · 4학년 🥚는 안 나옴');
  for (const id of mixIds(on)) assert.ok(gradeOf(id) < REST_GRADE);
  assert.equal(gradeOf(F(0)), SCHOOL_GRADE);
  // 꺼짐: 학년 무리 없이 단계 → 오래된 차례 (6학년 🐣 F(8)이 가장 오래됨)
  const off = dailyPlan(mk(c, OFF), TODAY, 'fraction', 3);
  assert.deepEqual(new Set(mixIds(off)), new Set([F(8), F(1), F(2)]));
});

test('🎲 🥚 아닌 칸끼리는 예전 차례 그대로 — 안 본 지 오래된 것부터 · 같으면 사다리 차례 (Codex 251차)', () => {
  // 같은 학년 넷이 세 자리를 겨룸 — 분수 4학년 칸은 셋(F0~F2)뿐이라 5학년 F3~F6 넷으로
  const diff = { [F(3)]: kn(40), [F(4)]: kn(10), [F(5)]: kn(30), [F(6)]: kn(20) };
  for (const rs of [ON, OFF]) assert.deepEqual(new Set(mixIds(dailyPlan(mk(diff, rs), TODAY, 'fraction', 3))), new Set([F(4), F(6), F(5)]), `오래된 셋 ${rs.on}`);
  const same = { [F(3)]: kn(7), [F(4)]: kn(7), [F(5)]: kn(7), [F(6)]: kn(7) };
  for (const rs of [ON, OFF]) assert.deepEqual(new Set(mixIds(dailyPlan(mk(same, rs), TODAY, 'fraction', 3))), new Set([F(3), F(4), F(5)]), `같으면 사다리 앞 셋 ${rs.on}`);
});

test('🎲 확인 차례인 🥚도 뒤로 — 개념 편이 🥚 확인이어도 · 다른 🥚가 확인 차례여도 섞어 풀기는 🐣 셋 (내부 리뷰)', () => {
  const c = { [F(0)]: kn(900), [F(1)]: kn(800), [F(2)]: kn(700), [F(3)]: eg(1, { dueAt: '2026-11-20' }), [F(4)]: eg(2, { dueAt: '2026-11-21' }) };
  for (const rs of [ON, OFF]) {
    const p = dailyPlan(mk(c, rs), TODAY, 'fraction', 3);
    assert.equal(p.roundMode, 'review', `${rs.on}`);
    assert.ok([F(3), F(4)].includes(p.roundId), `${rs.on} 개념 편 = 🥚 확인`);
    const other = p.roundId === F(3) ? F(4) : F(3);
    assert.equal(ladderOf(mk(c, rs), TODAY, 'fraction').find((x) => x.id === other).due, true, '남은 🥚도 확인 차례');
    assert.deepEqual(new Set(mixIds(p)), new Set([F(0), F(1), F(2)]), `${rs.on}`);
  }
});

test('🎲 🤔 노트 자리는 그대로 — 🥚 칸의 노트도 나온다(노트는 개념 일정과 따로 · 이번 범위 밖) · 🌱 켜짐에서 낼 수 있는 칸이 🥚뿐이면 🥚로 채움', () => {
  const c = { [F(0)]: kn(300), [F(1)]: kn(200), [F(2)]: kn(100), [F(3)]: eg(1, { notes: [{ k: 'calc', key: 'K1', d: '2026-11-25', t: 1 }] }) };
  const p = dailyPlan(mk(c, OFF), TODAY, 'fraction', 3);
  assert.deepEqual(new Set(mixIds(p)), new Set([F(0), F(1), F(2)]));
  const notes = p.mix.filter((x) => x.note);
  assert.equal(notes.length, 1);
  assert.equal(notes[0].id, F(3), '🥚 칸의 노트 한 문제');
  assert.deepEqual(notes[0].kinds, ['calc']);
  // 🌱 켜짐 · 6학년 🐣는 빠지고 4·5학년은 🥚 둘뿐(켠 뒤에 배움) — 잠긴 날 ☀️가 🥚 둘로 (아예 빼면 ☀️가 사라진다)
  const on = { [F(0)]: eg(1, { schedAt: T_REST + 1000 }), [F(3)]: eg(2, { schedAt: T_REST + 1000 }), [F(8)]: kn(0), [F(9)]: kn(0) };
  const q = dailyPlan(mk(on, ON), TODAY, 'fraction', 3);
  assert.equal(q.roundStem, 'fraction');
  assert.equal(q.roundId, null);
  assert.equal(q.waiting, true);
  assert.deepEqual(new Set(mixIds(q)), new Set([F(0), F(3)]));
});

test('🎲 무작위 기록 2000개: 섞어 풀기 칸은 「🥚 아닌 배운 칸」을 먼저 다 쓰고, 그래도 자리가 남을 때만 🥚 · 칸 수는 예전과 같다(🥚를 빼서 줄지 않는다) · 🥚 판정은 기록을 지을 때 붙인 꼬리표로(구현의 stage를 안 빌림)', () => {
  const ids = STEMS.fraction.list.map((c) => c.id);
  const n = { eggUsed: 0, eggKept: 0, eggRound: 0, dueEggLeft: 0 };
  for (let s = 1; s <= 2000; s++) {
    const r = seeded(s);
    const c = {};
    const kind = {};
    // 씨앗 절반은 🥚 많고 아는 칸 적게 — 🥚로 채우는 판이 넉넉히 나오게 (고르게 지으면 3%뿐) · 셋에 하나꼴은 확인 차례(지난 dueAt)
    const pEgg = s % 2 ? 0.2 : 0.4;
    const pNone = s % 2 ? 0.2 : 0.4;
    for (const id of ids) {
      const x = r();
      if (x < pNone) continue;
      const due = r() < 0.35 ? { dueAt: `2026-11-${String(10 + Math.floor(r() * 15)).padStart(2, '0')}` } : {};
      if (x < pNone + pEgg) { c[id] = eg(Math.floor(r() * 1000), due); kind[id] = 'egg'; } else {
        c[id] = r() < 0.3 ? kn(Math.floor(r() * 1000), { placed: true, box: Math.floor(r() * 2), ...due }) : kn(Math.floor(r() * 1000), { box: 1 + Math.floor(r() * GRADUATED), ...due });
        kind[id] = 'plain';
      }
    }
    const rs = r() < 0.5 ? ON : OFF;
    const m = mk(c, rs);
    const p = dailyPlan(m, TODAY, 'fraction', s);
    if (p.comeback || p.roundStem !== 'fraction') continue;
    const can = ids.filter((id) => kind[id] && id !== p.roundId && (!rs.on || gradeOf(id) < REST_GRADE));
    const plain = can.filter((id) => kind[id] === 'plain');
    const eggs = can.filter((id) => kind[id] === 'egg');
    const got = mixIds(p);
    const tag = `씨앗 ${s}`;
    if (kind[p.roundId] === 'egg') n.eggRound += 1;
    if (eggs.some((id) => c[id].dueAt < TODAY)) n.dueEggLeft += 1;
    assert.equal(got.length, Math.min(MIX_CONCEPTS, can.length), `${tag} 칸 수`);
    const gotPlain = got.filter((id) => plain.includes(id));
    const gotEgg = got.filter((id) => eggs.includes(id));
    assert.equal(gotPlain.length + gotEgg.length, got.length, `${tag} 배운 칸만`);
    assert.equal(gotPlain.length, Math.min(MIX_CONCEPTS, plain.length), `${tag} 🐣·👑·📏 먼저`);
    if (gotEgg.length) {
      n.eggUsed += 1;
      // 고른 🥚마다, 안 고른 🥚 가운데 (🌱면 4학년 먼저 →) 더 오래된 것(같으면 사다리 앞)이 없다
      const before = (a, b) => {
        const ta = rs.on && gradeOf(a) > SCHOOL_GRADE ? 1 : 0;
        const tb = rs.on && gradeOf(b) > SCHOOL_GRADE ? 1 : 0;
        if (ta !== tb) return ta < tb;
        if (c[a].lastAt !== c[b].lastAt) return c[a].lastAt < c[b].lastAt;
        return ids.indexOf(a) < ids.indexOf(b);
      };
      for (const g of gotEgg) for (const o of eggs.filter((id) => !gotEgg.includes(id))) assert.ok(!before(o, g), `${tag} 🥚 ${o}가 ${g}보다 먼저여야`);
    } else if (eggs.length) n.eggKept += 1;
  }
  assert.ok(n.eggUsed >= 500 && n.eggKept >= 500 && n.eggRound >= 100 && n.dueEggLeft >= 100, JSON.stringify(n));
});

test('🔌 주석 · ☀️ 다시 시작 판은 그대로 비움 · sw v442', () => {
  const mp = read('js/mathprog.js');
  const i = mp.indexOf('export function dailyPlan(');
  const head = mp.slice(mp.lastIndexOf('/**', i), i);
  // 동작은 위 시험들이 지킨다 — 코드 줄을 글자로 묶지 않는다(변이 검사가 글자 고정에 가려지지 않게 · 내부 리뷰)
  for (const w of ['🐣·👑·📏 칸 먼저 — 🥚 배우는 중 칸은 그것으로 다 못 채울 때만(v442)', '같은 단계(🐣·👑·📏 / 🥚) 안에서 SCHOOL_GRADE 이하 칸으로 먼저', '🤔 노트 자리는 단계를 보지 않는다']) assert.ok(head.includes(w), w);
  // 다시 시작 판(마지막 완주가 사흘 넘게 전)은 개념 편 하나만 — 섞어 풀기 비움 그대로
  const m = mk({ [F(0)]: kn(300), [F(1)]: kn(200), [F(2)]: kn(100), [F(3)]: eg(1) }, OFF);
  m.daily = { d: '2026-11-01', n: 1 };
  const p = dailyPlan(m, TODAY, 'fraction', 3);
  assert.equal(p.comeback, true);
  assert.deepEqual(p.mix, []);
  const swv = Number((read('sw.js').match(/const CACHE_VERSION = 'v(\d+)';/) || [])[1]);
  const apv = Number((read('js/version.js').match(/export const APP_VERSION = 'v(\d+)';/) || [])[1]);
  assert.ok(swv >= 442 && swv === apv, `판 ${swv} · ${apv}`);
});
