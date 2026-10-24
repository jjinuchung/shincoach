// v315 (2026-10-22 아버님 "이대로 진행") — 🧩 국어 오늘의 퍼즐: 처음 보는 꼴은 하루 한 꼴만·판 맨 뒤 + 판 시작·끝냄·그만둔 자리 기록(📤 국어 요약만)
// 까닭: 퍼즐 꼴 셋을 한꺼번에 더했더니(v294~v297) 판 넷 중 셋이 처음 보는 꼴(맨 앞부터)이 되고, 그날부터 판을 끝낸 날이 끊겼다
// node --test tests/puzzle315.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { allPuzzles, planPuzzles, isOpen, puzzleSessions, quitKey, KIND_LIST, PUZZLES_PER_DAY, FRESH_KIND_PER_DAY, PUZZLE_DAY_LISTS, SOLVED } from '../js/korpuzzle.js';
import { dayNum } from '../js/korean.js';
import { mergeDailyDelta, emptyDaily } from '../js/db.js';
import { korReportFromRaw } from '../js/korreport.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const DATA = JSON.parse(read('coach/korean/puzzles.json'));
const CARDS = JSON.parse(read('coach/korean/reading.json')).cards;
const LIST = allPuzzles(DATA, CARDS);
const T0 = new Date(2026, 9, 22, 20).getTime();
const D0 = dayNum(T0);
const ALL_STAR = Object.fromEntries(CARDS.map((c) => [`${c.id}:1`, D0 - 5]));
const byId = new Map(LIST.map((p) => [p.id, p]));
const solved = (ids, at) => Object.fromEntries(ids.map((id, i) => [id, { box: SOLVED, due: 0, at: at + i, miss: 0, d0: D0 - 3 }]));
const first = (kind, n) => LIST.filter((p) => p.kind === kind).slice(0, n).map((p) => p.id);

test('🆕 진우와 같은 상태(차례·사실·의견·글에 있나요만 해 봄) — 처음 보는 꼴은 하루 하나, 판 맨 뒤 · 원고 꼴 차례(🔗 → ⚖️ 겪은 일 → ⏰) · 해 본 뒤엔 번갈아', () => {
  assert.equal(FRESH_KIND_PER_DAY, 1);
  const st = { ...solved(first('order', 15), T0 - 3e8), ...solved(first('sort', 9), T0 - 3e8 + 100), ...solved(first('intext', 3), T0 - 3e8 + 200) };
  const kinds = [];
  for (let day = 0; day < 6; day++) {
    const now = T0 + day * 86400000;
    const plan = planPuzzles(LIST, st, ALL_STAR, now);
    assert.equal(plan.length, PUZZLES_PER_DAY);
    kinds.push(plan.map((x) => x.kind));
    plan.forEach((x, i) => { st[x.id] = { box: SOLVED, due: 0, at: now + i, miss: 0, d0: dayNum(now) }; });
  }
  assert.deepEqual(kinds[0], ['order', 'intext', 'sort', 'agree'], '1일째 — 익숙한 셋 뒤에 🔗 하나 (전엔 ⏰ → 📍 → ⚖️ 겪은 일 → 🔗 — 넷 중 셋이 처음 보는 꼴)');
  assert.deepEqual(kinds[1].at(-1), 'exp', '2일째 — ⚖️ 겪은 일·생각이 맨 뒤');
  assert.ok(!kinds[1].slice(0, 3).includes('time'));
  assert.deepEqual(kinds[2].at(-1), 'time', '3일째 — ⏰ 일어난 차례가 맨 뒤');
  assert.ok(kinds[4].includes('time') && kinds[3].includes('exp'), '해 본 뒤엔 같은 칸의 꼴과 번갈아 나온다');
});

test('🆕 처음 쓰는 기기(아무 꼴도 안 풀었으면) · 모두 해 본 상태 · 연습 — 예전 그대로', () => {
  assert.deepEqual(planPuzzles(LIST, {}, ALL_STAR, T0).map((x) => x.id), ['O1', 'I1', 'F1', 'H1'], '처음 쓰는 기기는 예전처럼');
  const all = solved(['O23', 'F14', 'I12', 'H10', 'E10', 'T10'], 1);
  assert.deepEqual(planPuzzles(LIST, all, ALL_STAR, T0).map((x) => x.id), ['O1', 'I1', 'F1', 'H1'], '모두 해 봤으면 예전처럼');
  const prac = planPuzzles(LIST, solved(['O23', 'F14'], 1), ALL_STAR, T0, true).map((x) => x.id).sort();
  assert.deepEqual(prac, ['F14', 'O23'], '연습은 ⭐ 퍼즐(처음 보는 꼴 규칙과 상관없음)');
});

test('🆕 무작위 상태 수천 개 — 처음 보는 꼴은 늘 한 꼴 이하 · 늘 판 맨 뒤 · 같은 퍼즐 두 번 없음 · 열린 퍼즐만 · 넷 이하', () => {
  let seed = 315;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  let seen = 0;
  for (let n = 0; n < 4000; n++) {
    const st = {};
    for (const p of LIST) {
      const r = rnd();
      if (r < 0.25) st[p.id] = { box: SOLVED, due: 0, at: Math.floor(rnd() * 1e6), miss: 0, d0: D0 - 2 };
      else if (r < 0.32) st[p.id] = { box: 0, due: D0 - 1 + Math.floor(rnd() * 3), at: Math.floor(rnd() * 1e6), miss: 1, d0: D0 - 2 };
    }
    const done = rnd() < 0.5 ? ALL_STAR : {};
    const plan = planPuzzles(LIST, st, done, T0);
    const tried = new Set(LIST.filter((p) => st[p.id]).map((p) => p.kind));
    const fresh = plan.map((x) => tried.size > 0 && !tried.has(x.kind));
    const freshKinds = new Set(plan.filter((x, i) => fresh[i]).map((x) => x.kind));
    assert.ok(freshKinds.size <= FRESH_KIND_PER_DAY, `처음 보는 꼴 ${[...freshKinds]}`);
    const k = fresh.indexOf(true);
    if (k >= 0) { seen++; assert.ok(fresh.slice(k).every(Boolean), `처음 보는 꼴은 맨 뒤 ${plan.map((x) => x.id)}`); }
    assert.equal(new Set(plan.map((x) => x.id)).size, plan.length);
    assert.ok(plan.length <= PUZZLES_PER_DAY);
    // 🔍 Codex 121차 #2 — 낼 수 있는 퍼즐이 남았는데 판이 비거나 덜 차지 않는다: 길이 = min(4, 익숙한 낼 것 + 오늘의 새 꼴 하나의 낼 것)
    const pool = LIST.filter((p) => isOpen(p, done) && (!st[p.id] || (st[p.id].box < SOLVED && st[p.id].due <= D0)));
    const famN = pool.filter((p) => tried.size === 0 || tried.has(p.kind)).length;
    const nk = tried.size ? KIND_LIST.find((kd) => pool.some((p) => p.kind === kd && !tried.has(kd))) : null;
    const newN = nk ? pool.filter((p) => p.kind === nk).length : 0;
    assert.equal(plan.length, Math.min(PUZZLES_PER_DAY, famN + newN), `판 길이 ${plan.map((x) => x.id)}`);
    assert.ok(plan.every((x) => isOpen(byId.get(x.id), done)));
    assert.ok(plan.every((x) => !st[x.id] || (st[x.id].box < SOLVED && st[x.id].due <= D0)), '⭐·내일 볼 퍼즐은 안 나옴');
  }
  assert.ok(seen > 200, `처음 보는 꼴이 든 판을 충분히 봤다(${seen})`);
});

test('🆕 작은 원고 — 익숙한 꼴을 다 풀고 새 꼴만 한두 개 남으면 그만큼만 · 새 꼴이 자기 칸을 차지할 때 그 칸의 틀린 퍼즐은 다른 자리가 있으면 들어간다 (🔍 Codex 121차 #2)', () => {
  const pick = (...ids) => ids.map((id) => byId.get(id));
  const one = planPuzzles(pick('O11', 'T1', 'T2'), solved(['O11'], 1), {}, T0);
  assert.deepEqual(one.map((x) => x.id), ['T1', 'T2'], '익숙한 것이 없으면 같은 새 꼴로 — 남은 만큼만');
  assert.deepEqual(planPuzzles(pick('O11', 'T1'), solved(['O11'], 1), {}, T0).map((x) => x.id), ['T1']);
  // 차례 칸: 어제 틀린 O12(다시 볼 것) · 새 꼴 ⏰가 그 칸을 차지 → 다른 칸이 비어 있으면 O12도 판에 든다
  const st = { ...solved(['O11', 'F1'], 1), O12: { box: 0, due: D0, at: 5, miss: 1, d0: D0 - 1 } };
  const plan = planPuzzles(pick('O11', 'O12', 'F1', 'F2', 'T1'), st, {}, T0).map((x) => x.id);
  assert.deepEqual(plan, ['O12', 'F2', 'T1'], '틀린 O12 · 사실·의견 F2 · 새 꼴 ⏰ 맨 뒤');
});

test('🧩 판 기록 모으기 — 시작·끝냄·그만둠·남은 판 · 그만둔 자리(몇째·어느 꼴) · 끝낸 판은 그만둠에서 뺌 · 깨진 칸은 버림 · 하루 기록 칸', () => {
  assert.deepEqual(PUZZLE_DAY_LISTS, ['korPzStarts', 'korPzDone', 'korPzQuits']);
  assert.equal(quitKey(123, 2, 'time'), '123:2:time');
  const days = [
    { korPzStarts: ['100', '200'], korPzQuits: [quitKey(100, 1, 'time')] },
    { korPzStarts: ['300', '400', '500'], korPzDone: ['300', '500'], korPzQuits: [quitKey(400, 1, 'time'), quitKey(500, 4, 'agree'), 'x:y', '600:2:exp'] },
    null,
  ];
  const s = puzzleSessions(days);
  assert.deepEqual([s.start, s.done, s.quit, s.left], [5, 2, 3, 1], '그만둔 판 100·400·600(시작 기록 없는 판도 셈) · 500은 끝냈으니 그만둠에서 빠짐 · 200은 남은 판');
  assert.deepEqual(s.quitAt, [['1째 ⏰', 2], ['2째 ⚖️', 1]]);
  assert.deepEqual(puzzleSessions([]), { start: 0, done: 0, quit: 0, left: 0, quitAt: [] });
  // 하루 기록 — 목록 칸은 합집합(같은 판은 한 번)
  const a = mergeDailyDelta(emptyDaily('2026-10-22'), '2026-10-22', { korPzStarts: ['100'] });
  const b = mergeDailyDelta(a, '2026-10-22', { korPzStarts: ['100'], korPzDone: ['100'] });
  assert.deepEqual([b.korPzStarts, b.korPzDone], [['100'], ['100']]);
});

test('🧩 📤 국어 요약에 판 줄 — 최근 7일만 · 그만둔 자리 · v315부터 셈', () => {
  const raw = [{ cards: CARDS }, JSON.parse(read('coach/korean/words.json')), DATA, null];
  const today = '2026-10-22';
  const days = [
    { date: '2026-10-22', korPzStarts: ['1'], korPzQuits: [quitKey(1, 1, 'time')] },
    { date: '2026-10-20', korPzStarts: ['2'], korPzDone: ['2'] },
    { date: '2026-10-01', korPzStarts: ['3'], korPzQuits: [quitKey(3, 2, 'agree')] }, // 7일 밖
  ];
  const md = korReportFromRaw({}, raw, today, days);
  assert.ok(md && md.includes('- 🧩 최근 7일 오늘의 퍼즐 판(v315부터 · 이 기간에 일어난 일을 따로 셈): 시작 2 · 끝냄 1 · 그만둠 1 (그만둔 자리: 1째 ⏰ 1번) · 끝난 기록이 없는 판 0(풀고 있는 판·다른 화면으로 가 둔 판·앱을 닫은 판·기록 실패가 다 들어요)'), md && md.slice(md.indexOf('## 🧩'), md.indexOf('## 🧩') + 900));
  // 🔍 Codex 121차 #1 — 끝난 기록이 없는 판의 까닭을 단정하지 않는다 · 7일 경계를 넘긴 판은 한쪽만(시작 0 · 끝냄 1도 그대로)
  const edge = korReportFromRaw({}, raw, today, [{ date: '2026-10-16', korPzDone: ['9'] }, { date: '2026-10-15', korPzStarts: ['9'] }]);
  assert.ok(edge.includes('시작 0 · 끝냄 1 · 그만둠 0'));
  assert.ok(!edge.includes('다른 화면으로 가 둔 채 · 앱을 닫음)'));
});

test('🧩 화면 잇기 — 판 시작(연습 빼고)·그만두기(몇째·꼴)·끝냄을 하루 기록에 · 아이 화면 글은 그대로', () => {
  const v = read('js/korpuzzleview.js');
  assert.ok(v.includes("if (!practice) notePlay({ korPzStarts: [String(t0)] });"));
  // v331 — 글 끝 퍼즐 하나(ps.one)는 판 기록에 안 넣는다 (tests/one331)
  assert.ok(v.includes("if (!ps.practice && !ps.one) notePlay({ korPzQuits: [quitKey(ps.t0, ps.i + 1, (ps.items[ps.i] || {}).kind || '')] });"));
  assert.ok(v.includes("if (!ps.practice) notePlay({ korPzDone: [String(ps.t0)] });"));
  assert.ok(v.includes("'정말 그만할까요? (푼 것은 저장 안 돼요)'"), '아이 화면 말은 그대로');
  const db = read('js/db.js');
  assert.ok(db.includes('...KOR_DAY_LISTS, ...PUZZLE_DAY_LISTS]'), '하루 기록 목록 칸');
});
