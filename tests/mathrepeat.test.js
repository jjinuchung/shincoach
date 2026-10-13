// 🔁⏹ 노가다 탈출구 막기 3단계 (v250, 2026-10-13) — 같은 날 같은 개념 다시 풀기 보상 · 그만둔 개념 편
//  · 같은 날 같은 개념 둘째 편은 문항 ⚡💰 반, 셋째부터 0 — 다 맞혀 통과하는 편(처음·확인)은 늘 다, 통과·👑 보너스·🔷·🎟️는 그대로
//  · 한 문제라도 답한 개념 편을 ←로 나가거나 앱을 닫으면 일지에 그만둠 + 이미 틀린 문항은 🤔 노트 (통과·일정·보상은 안 건드림)
//  · 편 수는 일지에서 센다 — 두 기기·백업을 합쳐도 겹치지 않고, 같은 백업을 다시 넣어도 늘지 않는다
import { fakeIdb } from './fakeidb.js'; // ★ db.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  applyRound, roundReward, roundPay, repeatPay, REPEAT_PAY, sameDayRounds, repeatNote, setLive, applyQuit, settleLives, liveKeep, LIVE_MAX, practiceNote,
  conceptReport, mathReportText, tallyRound, stoneReward, REWARD, STEMS,
} from '../js/mathprog.js';
import { emptyMath, mergeMath, updateMath, getMath } from '../js/db.js';

const T = '2026-10-13';
const T1 = '2026-10-14';
const [ID, ID2] = STEMS.fraction.list.map((c) => c.id);
const read = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const learn = (m, id, correct, total, o = {}) => applyRound(m, id, { correct, total, missTags: [], qs: o.qs || [], mode: o.mode || 'learn', ...(o.rid ? { rid: o.rid } : {}) }, o.day || T);

test('🔁 repeatPay: 첫 편 다 · 둘째 반 · 셋째부터 0 (이상한 값은 첫 편으로)', () => {
  assert.deepEqual(REPEAT_PAY, [1, 0.5, 0]);
  assert.deepEqual([0, 1, 2, 3, 9].map(repeatPay), [1, 0.5, 0, 0, 0]);
  assert.deepEqual([undefined, null, -1, 'x', 1.7].map(repeatPay), [1, 1, 1, 1, 0.5]);
});

test('🔁 sameDayRounds: 그날 그 개념의 끝낸 편 + 그만둔 편 — 같은 편(rid)은 한 번, 지금 편은 빼고, 다른 날·다른 개념·노트·섞어 풀기·❓는 안 셈', () => {
  const m = emptyMath();
  learn(m, ID, 1, 3, { rid: 11 });
  assert.equal(sameDayRounds(m, ID, T), 1);
  assert.equal(sameDayRounds(m, ID, T, 11), 0, '지금 편은 빼고');
  applyQuit(m, { rid: 12, id: ID, d: T, n: 3, qs: [{ k: 'calc', ok: 0 }] }, T);
  assert.equal(sameDayRounds(m, ID, T), 2, '그만둔 편도 센다');
  learn(m, ID2, 0, 3, { rid: 13 });
  learn(m, ID, 0, 3, { rid: 14, day: T1 });
  m.log.push({ d: T, t: 1, id: 'notes', mode: 'notes', ok: 1, n: 1, qs: [{ k: 'calc', ok: 1, c: ID }] }, { d: T, t: 2, id: 'mix', mode: 'mix', ok: 1, n: 1 }, { d: T, t: 3, id: 'ask', mode: 'ask', ok: 1, n: 1 });
  assert.equal(sameDayRounds(m, ID, T), 2, '다른 개념·다른 날·노트·섞어 풀기·❓는 안 셈');
  assert.equal(sameDayRounds(m, ID, T1), 1);
  m.log.push({ d: T, t: 4, id: ID, mode: 'practice', ok: 1, n: 1 }); // v250 전 줄(rid 없음)은 하나씩
  assert.equal(sameDayRounds(m, ID, T), 3);
  m.log.push({ d: T, t: 5, rid: 12, id: ID, mode: 'learn', ok: 1, n: 3 }); // 같은 편이 그만둠·끝냄 둘로 남아도(두 창) 한 번
  assert.equal(sameDayRounds(m, ID, T), 3);
  assert.equal(sameDayRounds(null, ID, T), 0);
});

test('🔁 roundReward: 통과 못 한 편·연습 편의 문항 몫만 줄고 — 처음·확인 통과 편은 다, 보너스·🔷·🎟️는 그대로', () => {
  const fail = (repeat) => roundReward({ passed: false, first: false, review: false, crowned: false, repeat }, 3);
  assert.deepEqual(fail(undefined), { xp: 9, coin: 3, catchOnce: false }, 'repeat가 없으면 예전과 같다');
  assert.deepEqual(fail(0), { xp: 9, coin: 3, catchOnce: false });
  assert.deepEqual(fail(1), { xp: 4, coin: 1, catchOnce: false }, '반 — 내림');
  assert.deepEqual(fail(2), { xp: 0, coin: 0, catchOnce: false });
  assert.deepEqual(fail(6), { xp: 0, coin: 0, catchOnce: false });
  const first = roundReward({ passed: true, first: true, review: false, crowned: false, repeat: 2 }, 4);
  assert.deepEqual(first, { xp: 4 * REWARD.q.xp + REWARD.firstPass.xp, coin: 4 * REWARD.q.coin + REWARD.firstPass.coin, catchOnce: true }, '셋째 편이라도 처음 통과는 문항까지 다');
  const rev = roundReward({ passed: true, first: false, review: true, crowned: true, repeat: 3 }, 4);
  assert.deepEqual(rev, { xp: 12 + REWARD.reviewPass.xp + REWARD.crown.xp, coin: 4 + REWARD.reviewPass.coin + REWARD.crown.coin, catchOnce: false });
  const revFail = roundReward({ passed: false, first: false, review: true, crowned: false, repeat: 1 }, 2);
  assert.deepEqual(revFail, { xp: 3, coin: 1, catchOnce: false }, '확인에서 틀리면 줄어든다');
  const prac = (repeat, passed = true) => roundReward({ passed, practice: true, repeat }, 4);
  assert.deepEqual(prac(0), { xp: 12, coin: 4, catchOnce: false });
  assert.deepEqual(prac(1), { xp: 6, coin: 2, catchOnce: false }, '연습은 다 맞혀도 줄어든다');
  assert.deepEqual(prac(2), { xp: 0, coin: 0, catchOnce: false });
  assert.deepEqual(prac(1, false), { xp: 6, coin: 2, catchOnce: false });
  assert.deepEqual([roundPay({ passed: true, first: true, repeat: 5 }), roundPay({ passed: true, practice: true, repeat: 1 }), roundPay({ passed: false, repeat: 2 }), roundPay(null)], [1, 0.5, 0, 1]);
  // 🎟️·🔷는 repeat와 상관없다 — 통과(연습 아님)면 그대로
  const m = emptyMath();
  assert.deepEqual(tallyRound(m, { mode: 'review', correct: 4, result: { passed: true, practice: false, review: true, repeat: 4 } }), { ok: 4, rev: 1 });
  assert.equal(stoneReward({ mode: 'learn', result: { passed: true, practice: false, first: true, repeat: 4 } }), 1);
});

test('🔁 applyRound: 일지 줄에 편 번호(rid) · 같은 편의 푸는 중 기록만 닫고 다른 편 것은 둔다 · 자정을 넘겨 끝내면 시작한 날(sd) · rid가 없으면 예전 그대로', () => {
  const m = emptyMath();
  m.lives = { 21: { rid: 21, id: ID, d: T, n: 3, qs: [{ k: 'calc', ok: 1 }] }, 99: { rid: 99, id: ID2, d: T, n: 3, qs: [{ k: 'calc', ok: 1 }] } };
  learn(m, ID, 3, 3, { rid: 21 });
  assert.equal(m.log.at(-1).rid, 21);
  assert.deepEqual(Object.keys(m.lives), ['99'], '끝낸 편만 닫고 다른 편(다른 창)은 그대로');
  learn(m, ID2, 3, 3, { rid: 99 });
  assert.equal(m.lives, undefined, '다 닫히면 칸도 없앤다');
  learn(m, ID, 3, 3);
  assert.equal('rid' in m.log.at(-1), false);
  // Codex 62차 #2: 자정을 넘겨 끝낸 편 — 일지 d는 끝낸 날(일정·☀️), sd는 시작한 날(편 수)
  const m2 = emptyMath();
  applyRound(m2, ID, { correct: 1, total: 3, missTags: [], qs: [], mode: 'learn', rid: 23, day: T }, T1);
  assert.deepEqual([m2.log.at(-1).d, m2.log.at(-1).sd], [T1, T]);
  assert.deepEqual([sameDayRounds(m2, ID, T), sameDayRounds(m2, ID, T1)], [1, 0], '시작한 날의 편');
  applyRound(m2, ID, { correct: 1, total: 3, missTags: [], qs: [], mode: 'learn', rid: 24, day: T1 }, T1);
  assert.equal('sd' in m2.log.at(-1), false, '같은 날이면 sd 없음');
  assert.deepEqual([sameDayRounds(m2, ID, T), sameDayRounds(m2, ID, T1)], [1, 1]);
});

test('⏹ applyQuit: 일지에 그만둠 한 줄 + 틀린 문항만 🤔 노트(🙈 실수는 빼고, 이유를 안 골랐으면 남김) · 통과·실패·일정·누적·편 수는 그대로 · 한 번만', () => {
  const m = emptyMath();
  const live = { rid: 31, id: ID, mode: 'learn', d: T, n: 6, qs: [
    { k: 'calc', ok: 1, key: 'A' },
    { k: 'misread', ok: 0, key: 'B', tag: '분모끼리 더함' },
    { k: 'why', ok: 0, key: 'C', w: 's' },
    { k: 'calc', ok: 0, key: 'D', w: 'c', p: 1, g: '7' },
    { k: 'calc', ok: 0 },
  ] };
  m.lives = { 31: { ...live } };
  assert.equal(applyQuit(m, live, T), true);
  const e = m.log.at(-1);
  assert.deepEqual({ d: e.d, rid: e.rid, id: e.id, mode: e.mode, ok: e.ok, n: e.n, of: e.of }, { d: T, rid: 31, id: ID, mode: 'quit', ok: 1, n: 5, of: 6 });
  assert.equal(e.qs.length, 5);
  assert.deepEqual(e.qs[3], { k: 'calc', ok: 0, w: 'c', p: 1, g: '7' }, '문항 줄은 일지 꼴(logQ)');
  const rec = m.concepts[ID];
  assert.deepEqual(rec.notes.map((n) => n.key), ['B', 'D'], '맞힌 것·실수라고 한 것·틀이 없는 것은 노트에 안 넣는다');
  assert.equal(rec.notes[0].tag, '분모끼리 더함');
  assert.deepEqual([rec.done, rec.passes, rec.fails, rec.box, rec.dueAt], [false, 0, 0, 0, '']);
  assert.equal(rec.kinds, undefined, '얼굴별 누적은 끝낸 편에서만');
  assert.deepEqual(m.miss, {});
  assert.equal(m.rounds, 0, '편 수(rounds)는 끝낸 편만');
  assert.equal(m.lives, undefined, '같은 편의 푸는 중 기록은 닫는다');
  const n = m.log.length;
  assert.equal(applyQuit(m, live, T), false, '같은 편은 한 번만');
  assert.equal(m.log.length, n);
  // 이미 끝낸 편(일지에 rid) · 답한 문항 없음 → 안 적는다(푸는 중 기록은 닫는다)
  learn(m, ID2, 1, 1, { rid: 32 });
  assert.equal(applyQuit(m, { rid: 32, id: ID2, d: T, n: 1, qs: [{ k: 'calc', ok: 0, key: 'Z' }] }, T), false);
  m.lives = { 33: { rid: 33, id: ID2, d: T, n: 3, qs: [] } };
  assert.equal(applyQuit(m, m.lives[33], T), false);
  assert.equal(m.lives, undefined);
  assert.equal(applyQuit(m, null, T), false);
  // 자정을 넘겨 정리해도(다음 날 앱을 열 때) 시작한 날의 편 — 노트는 끝낸 편처럼 정리한 날로
  const m2 = emptyMath();
  applyQuit(m2, { rid: 34, id: ID, d: T, n: 2, qs: [{ k: 'calc', ok: 0, key: 'N' }] }, T1);
  assert.equal(m2.log.at(-1).d, T);
  assert.equal(sameDayRounds(m2, ID, T), 1);
  assert.equal(m2.concepts[ID].notes[0].d, T1);
});

test('⏹ applyQuit: 아는 개념이면 일정·통과 그대로 · 노트의 "또 틀림"(again)은 이어 가고, 이번에 맞힌 노트 문항도 노트는 안 지운다(끝낸 편에서만)', () => {
  const m = emptyMath();
  learn(m, ID, 2, 2, { day: '2026-10-10' });
  const rec0 = m.concepts[ID];
  rec0.notes = [{ k: 'calc', key: 'A', d: '2026-10-10', t: 1, again: 2 }, { k: 'calc', key: 'B', d: '2026-10-10', t: 2 }];
  const before = JSON.stringify({ done: rec0.done, box: rec0.box, dueAt: rec0.dueAt, schedAt: rec0.schedAt, passes: rec0.passes, fails: rec0.fails });
  applyQuit(m, { rid: 41, id: ID, d: T, n: 4, qs: [{ k: 'calc', ok: 0, key: 'A' }, { k: 'calc', ok: 1, key: 'B' }] }, T);
  const rec = m.concepts[ID];
  assert.equal(JSON.stringify({ done: rec.done, box: rec.box, dueAt: rec.dueAt, schedAt: rec.schedAt, passes: rec.passes, fails: rec.fails }), before);
  assert.deepEqual(rec.notes.map((n) => [n.key, n.again || 0, n.d]), [['B', 0, '2026-10-10'], ['A', 2, T]]);
});

test('⏹ setLive: 편마다 따로 사본으로 — 두 창의 편이 함께 남고, 이미 끝냈거나 그만둔 편의 늦은 적기는 아무것도 안 바꾼다 · 너무 많으면 오래된 것부터 그만둠', () => {
  const m = emptyMath();
  const live = { rid: 51, id: ID, mode: 'learn', d: T, n: 3, qs: [{ k: 'calc', ok: 1 }] };
  assert.equal(setLive(m, live), true);
  live.qs.push({ k: 'calc', ok: 0 });
  live.qs[0].ok = 0;
  assert.deepEqual(m.lives[51].qs, [{ k: 'calc', ok: 1 }], '넘긴 기록을 나중에 고쳐도 적은 것은 그대로');
  // 두 창: 다른 편이 함께 남는다 (Codex 62차 #1 — 예전 한 칸은 다른 창의 편을 그만둠으로 닫았다)
  assert.equal(setLive(m, { rid: 52, id: ID2, mode: 'learn', d: T, n: 3, qs: [{ k: 'calc', ok: 0, key: 'W' }] }), true);
  assert.deepEqual(Object.keys(m.lives), ['51', '52']);
  learn(m, ID, 3, 3, { rid: 51 });
  assert.deepEqual(Object.keys(m.lives), ['52']);
  const before = JSON.stringify(m);
  assert.equal(setLive(m, { rid: 51, id: ID, d: T, n: 3, qs: [{ k: 'calc', ok: 1 }] }), false, '끝낸 뒤 도착한 적기는 되살리지 않는다');
  assert.equal(JSON.stringify(m), before, '…그리고 다른 편(52)도 안 건드린다 (Codex 62차 #1 순서 문제)');
  assert.equal(setLive(m, { rid: 0, id: ID }), false);
  // LIVE_MAX를 넘으면 가장 오래된 편부터 그만둠으로
  for (let k = 0; k < LIVE_MAX; k++) setLive(m, { rid: 60 + k, id: ID2, mode: 'learn', d: T, n: 3, qs: [{ k: 'calc', ok: 1 }] });
  assert.equal(Object.keys(m.lives).length, LIVE_MAX);
  assert.equal(m.lives[52], undefined);
  assert.ok(m.log.some((e) => e.rid === 52 && e.mode === 'quit'), '밀려난 편은 그만둠으로 남는다');
});

test('⏹ settleLives: 수학을 열 때 — 쥔 창이 없는 편만 그만둠으로, 다른 창이 쥔 편·이 창이 푸는 편은 그대로', () => {
  const m = emptyMath();
  for (const rid of [71, 72, 73]) setLive(m, { rid, id: ID, mode: 'learn', d: T, n: 3, qs: [{ k: 'calc', ok: 0, key: `S${rid}` }] });
  assert.equal(settleLives(m, new Set([72, 73]), T), 1);
  assert.deepEqual(Object.keys(m.lives), ['72', '73']);
  assert.ok(m.log.some((e) => e.rid === 71 && e.mode === 'quit'));
  assert.equal(settleLives(m, new Set(), T), 2, 'Web Locks가 없으면(빈 목록) 예전처럼 다 그만둠');
  assert.equal(m.lives, undefined);
  assert.equal(settleLives(emptyMath(), new Set(), T), 0);
  // Codex 63차 #3: 정리 대상은 잠금을 보기 전에 본 편만 — 그 뒤에 다른 창이 막 적은 편(74)·이 창이 푸는 편(76)은 그대로
  const m2 = emptyMath();
  for (const rid of [74, 75, 76]) setLive(m2, { rid, id: ID, mode: 'learn', d: T, n: 3, qs: [{ k: 'calc', ok: 1 }] });
  const keep = liveKeep(m2, new Set([75, 76]), 76);
  assert.deepEqual([...keep].sort(), [74, 76]);
  assert.equal(settleLives(m2, keep, T), 1);
  assert.deepEqual(Object.keys(m2.lives), ['74', '76']);
  assert.deepEqual([...liveKeep(emptyMath(), new Set([1]), null)], []);
});

test('🔁⏹ mergeMath: 편 수는 두 기기 합 · 같은 백업을 다시 넣어도 그대로 · 같은 밀리초의 다른 편도 둘 다 · 푸는 중 기록은 이 기기 것만, 합친 일지에서 끝난 편은 지운다', () => {
  const a = emptyMath(); const b = emptyMath();
  learn(a, ID, 1, 3, { rid: 61 }); a.log.at(-1).t = 1000;
  learn(b, ID, 1, 3, { rid: 62 }); b.log.at(-1).t = 2000;
  const ab = mergeMath(a, b);
  assert.equal(sameDayRounds(ab, ID, T), 2, '두 기기의 편이 다 센다');
  assert.equal(sameDayRounds(mergeMath(ab, b), ID, T), 2, '같은 백업을 다시 넣어도 늘지 않는다');
  assert.equal(sameDayRounds(mergeMath(ab, a), ID, T), 2);
  // Codex 62차 #3: 같은 시각(t) · 다른 편(rid) → 둘 다 남는다 · 같은 줄(t·rid 같음)은 하나
  const c = emptyMath(); learn(c, ID, 1, 3, { rid: 63 }); c.log.at(-1).t = 2000;
  const abc = mergeMath(ab, c);
  assert.equal(sameDayRounds(abc, ID, T), 3);
  assert.equal(abc.log.filter((e) => e.t === 2000).length, 2);
  assert.equal(mergeMath(abc, c).log.length, abc.log.length);
  const old = emptyMath(); old.log = [{ d: T, t: 2000, id: 'notes', mode: 'notes', ok: 1, n: 1 }];
  assert.equal(mergeMath(old, { log: [{ d: T, t: 2000, id: 'notes', mode: 'notes', ok: 1, n: 1 }] }).log.length, 1, 'rid 없는 옛 줄은 예전처럼 시각으로');
  const local = emptyMath();
  local.lives = { 64: { rid: 64, id: ID, d: T, n: 3, qs: [{ k: 'calc', ok: 0, key: 'Q' }] }, 65: { rid: 65, id: ID2, d: T, n: 3, qs: [{ k: 'calc', ok: 1 }] } };
  const other = emptyMath();
  applyQuit(other, { rid: 64, id: ID, d: T, n: 3, qs: [{ k: 'calc', ok: 0, key: 'Q' }] }, T);
  assert.deepEqual(Object.keys(mergeMath(local, other).lives), ['65'], '다른 쪽에서 이미 닫힌 편만 지운다');
  assert.deepEqual(Object.keys(mergeMath(local, emptyMath()).lives), ['64', '65'], '안 닫혔으면 그대로');
  assert.equal(mergeMath(emptyMath(), local).lives, undefined, '가져온 쪽의 푸는 중 기록은 안 받는다');
  assert.deepEqual(Object.keys(local.lives), ['64', '65'], '합치기가 입력을 건드리지 않는다');
});

test('🔁 repeatNote·practiceNote: 둘째 편부터 첫 문항 위에 미리 — 처음 배우는·확인 편은 "다 맞혀 통과하면 다", 연습 편은 줄어든 몫만', () => {
  const m = emptyMath();
  assert.deepEqual(repeatNote(m, ID, T), { k: 0, pay: 1, practice: false, text: null });
  learn(m, ID, 1, 3, { rid: 71 });
  const r2 = repeatNote(m, ID, T);
  assert.deepEqual([r2.k, r2.pay, r2.practice], [1, 0.5, false]);
  assert.equal(r2.text, '🔁 오늘 이 개념 2번째 편 — 다 맞혀 통과하면 ⚡💰를 다 받고, 아니면 문항 ⚡💰는 반만 받아요');
  learn(m, ID, 3, 3, { rid: 72 }); // 처음 통과
  const r3 = repeatNote(m, ID, T);
  assert.deepEqual([r3.k, r3.pay, r3.practice], [2, 0, true], '같은 날 통과한 개념은 연습');
  assert.equal(r3.text, '🔁 오늘 이 개념 3번째 편이라 문항 ⚡💰가 없어요');
  assert.equal(repeatNote(m, ID, T1).text, null, '다음 날은 처음부터');
  const rec = m.concepts[ID];
  assert.match(practiceNote(rec, T, null), /^연습이에요 — ⚡💰만 \(🍀/);
  assert.match(practiceNote(rec, T, null, 0.5), /^연습이에요 — ⚡💰 반만 \(🍀/);
  assert.match(practiceNote(rec, T, null, 0), /^연습이에요 — ⚡💰 없이 \(🍀/);
});

test('⏹ 📊: 그만둔 편은 답한 것을 다 맞혔어도 통과가 아니다 · 기록 글에 "⏹그만둠 1/1 (5문제 중)" · 표에는 회색 ⏹ · 같은 편이 그만둠·끝냄 둘로 남으면 끝낸 줄만', () => {
  const m = emptyMath();
  applyQuit(m, { rid: 81, id: ID, d: T, n: 5, qs: [{ k: 'calc', ok: 1 }] }, T);
  const row = conceptReport(m).find((r) => r.id === ID);
  assert.deepEqual(row.trail, [{ d: T, ok: 1, n: 1, pass: false, mode: 'quit', quit: 1, of: 5 }]);
  const txt = mathReportText(m, T);
  assert.ok(txt.includes(' · ⏹1/1'), txt);
  assert.ok(txt.includes('⏹그만둠 1/1 (5문제 중)'), txt);
  const st = read('js/stats.js');
  assert.ok(st.includes("t.quit ? 'dot quit' : t.pass ? 'dot ok' : 'dot no', t.quit ? '⏹'"));
  assert.ok(read('css/style.css').includes('.math-report .dot.quit {'));
  // 두 창: 한 편(rid 81)이 그만둠으로도, 끝냄으로도 남았다 → 📊는 끝낸 줄만, 편 수는 하나 (Codex 62차 #3)
  m.log.push({ d: T, t: Date.now() + 5, rid: 81, id: ID, mode: 'learn', ok: 4, n: 5, qs: [] });
  assert.deepEqual(conceptReport(m).find((r) => r.id === ID).trail.map((t) => t.mode), ['learn']);
  const txt2 = mathReportText(m, T); // v252부터 🛡️ 줄 "⏹ 그만둔 편 없음"이 늘 있다 — 그만둔 편의 흔적만 본다
  assert.ok(!txt2.includes('⏹그만둠') && !txt2.includes('⏹1/1') && txt2.includes('⏹ 그만둔 편 없음'), txt2);
  assert.equal(sameDayRounds(m, ID, T), 1);
});

test('⏹ 진짜 저장 경로(fakeidb): 답마다 적기 → 끝내면 닫힘 · 늦게 온 적기는 무시 · 앱을 닫았다 열면 그만둠(다른 창이 쥔 편은 그대로) · ←는 화면 기록으로 그만둠', async () => {
  assert.equal(fakeIdb.get('profile', 'math'), undefined, '이 파일의 첫 저장');
  const live1 = { rid: 91, id: ID, mode: 'learn', d: T, n: 3, qs: [{ k: 'calc', ok: 0, key: 'K1' }] };
  await updateMath((s) => { setLive(s, live1); });
  assert.equal((await getMath()).lives[91].rid, 91);
  await updateMath((s) => { applyRound(s, ID, { correct: 2, total: 3, missTags: [], qs: [{ k: 'calc', ok: 0, key: 'K1' }, { k: 'calc', ok: 1 }, { k: 'calc', ok: 1 }], rid: 91, day: T }, T); });
  await updateMath((s) => { setLive(s, { ...live1, qs: [...live1.qs, { k: 'calc', ok: 1 }] }); }); // 끝낸 뒤 도착한 적기
  let s1 = await getMath();
  assert.equal(s1.lives, undefined);
  assert.equal(sameDayRounds(s1, ID, T), 1);
  // 앱을 닫았다 열기: 92는 쥔 창이 없고 94는 다른 창이 푸는 중 → 92만 그만둠
  await updateMath((s) => { setLive(s, { rid: 92, id: ID, mode: 'learn', d: T, n: 4, qs: [{ k: 'calc', ok: 0, key: 'K2' }] }); });
  await updateMath((s) => { setLive(s, { rid: 94, id: ID2, mode: 'learn', d: T, n: 4, qs: [{ k: 'calc', ok: 1 }] }); });
  await updateMath((s) => { settleLives(s, new Set([94]), T); });
  s1 = await getMath();
  assert.deepEqual(Object.keys(s1.lives), ['94']);
  assert.equal(s1.log.at(-1).mode, 'quit');
  assert.ok(s1.concepts[ID].notes.some((n) => n.key === 'K2'));
  assert.equal(sameDayRounds(s1, ID, T), 2);
  // ←: 마지막 답이 아직 안 적혔어도 화면의 기록(두 문항)으로
  await updateMath((s) => { setLive(s, { rid: 93, id: ID, mode: 'learn', d: T, n: 4, qs: [{ k: 'calc', ok: 1 }] }); });
  await updateMath((s) => { applyQuit(s, { rid: 93, id: ID, mode: 'learn', d: T, n: 4, qs: [{ k: 'calc', ok: 1 }, { k: 'misread', ok: 0, key: 'K3' }] }, T); });
  await updateMath((s) => { setLive(s, { rid: 93, id: ID, mode: 'learn', d: T, n: 4, qs: [{ k: 'calc', ok: 1 }, { k: 'misread', ok: 0, key: 'K3' }] }); }); // 늦게 온 적기
  s1 = await getMath();
  assert.deepEqual(Object.keys(s1.lives), ['94'], '다른 창의 편은 그대로');
  assert.deepEqual([s1.log.at(-1).n, s1.log.at(-1).ok], [2, 1]);
  assert.equal(sameDayRounds(s1, ID, T), 3);
  // 그만둠 저장이 실패하면 → 기억해 두었다가 다음에 다시 적는다(화면 쪽은 배선 시험에서) — 여기서는 실패한 쓰기가 아무것도 안 남기는지
  fakeIdb.failNext('profile');
  await assert.rejects(updateMath((s) => { applyQuit(s, { rid: 95, id: ID, mode: 'learn', d: T, n: 4, qs: [{ k: 'calc', ok: 0, key: 'K5' }] }, T); }));
  assert.ok(!(await getMath()).log.some((e) => e.rid === 95));
  await updateMath((s) => { applyQuit(s, { rid: 95, id: ID, mode: 'learn', d: T, n: 4, qs: [{ k: 'calc', ok: 0, key: 'K5' }] }, T); });
  assert.ok((await getMath()).log.some((e) => e.rid === 95 && e.mode === 'quit'), '다시 적으면 남는다');
});

test('🔁⏹ 화면 배선(math.js): 편 번호·시작한 날·미리 안내·창 잠금 · 답·🙈·쌍둥이마다 적기 · ←는 그만둠(못 적으면 기억) · 열 때 정리(다른 창이 쥔 편은 그대로) · 끝낼 때 같은 트랜잭션에서 세기 · 결과 카드·한 번 더 단추', () => {
  const src = read('js/math.js');
  const fn = (name) => { const i = src.indexOf(`function ${name}(`); assert.ok(i >= 0, name); return src.slice(i, src.indexOf('\n}\n', i)); };
  const sr = fn('startRound');
  assert.ok(sr.includes('const rep = repeatNote(ui.state, id, day);') && sr.includes('rid: ui.lastRid, day, rep };'));
  assert.ok(sr.includes('ui.lastRid = Math.max(Date.now() * 1000 + Math.floor(Math.random() * 1000), (ui.lastRid || 0) + 1);'), '편 번호: 무작위 자리 + 이 창 안에서 늘 커지게 (Codex 62차 #3)');
  assert.ok(sr.indexOf('holdRoundLock(ui.lastRid);') > sr.indexOf('ui.round = {') && sr.includes('if (Number(k) !== ui.lastRid) releaseRoundLock(k);'), '🔒 이 편 잠금을 쥐고 앞 편 잠금은 놓는다');
  assert.ok(src.includes("const isConceptRound = (r) => !!(r && r.id && r.rid && (r.mode === 'learn' || r.mode === 'review' || r.mode === 'practice'));"), '개념 편만(노트·섞어·💎·❓·진단은 id가 없거나 mode가 다르다) — 사다리의 아는 칸은 practice로 연다');
  assert.ok(src.includes("startRound(r.id, r.state === 'done' ? (r.due ? 'review' : 'practice') : 'learn')"), '사다리가 여는 mode가 바뀌면 위 목록도 같이');
  const hl = fn('holdRoundLock');
  assert.ok(hl.includes('navigator.locks.request(`${LOCK_PREFIX}${rid}`, () => (h.dropped ? null : new Promise((res) => { h.release = res; })))'), '잠금을 받기 전에 놓으면 받는 순간 바로 놓는다');
  assert.ok(fn('releaseRoundLock').includes('h.dropped = true;'));
  assert.ok(fn('heldRids').includes('navigator.locks.query()') && fn('heldRids').includes('.filter((n) => n.startsWith(LOCK_PREFIX))'));
  const ans = fn('answer');
  assert.ok(ans.indexOf('saveLive();') > ans.indexOf('r.answers.push(') && ans.indexOf('saveLive();') < ans.indexOf('paintAnswer('), '답을 기록에 넣은 뒤 바로 적는다');
  assert.ok(fn('whyBlock').includes('saveLive();'), '🙈 실수라고 했으면 그만둬도 노트에 안 남게');
  assert.ok(fn('answerTwin').includes('saveLive();'));
  const sv = fn('saveLive');
  assert.ok(sv.includes('if (!isConceptRound(r) || !r.answers.length || r.saving) return;'));
  assert.ok(sv.includes('updateMath((s) => { setLive(s, live); })') && !sv.includes('applyQuit'), '적기는 제 편만 — 다른 편을 그만둠으로 닫지 않는다 (Codex 62차 #1)');
  const ql = fn('quitLive');
  assert.ok(ql.includes('if (!isConceptRound(r) || r.saving) return;'), '저장 중인 편은 finishRound가 끝낸다');
  assert.ok(ql.includes('if (!r.answers.length) { releaseRoundLock(r.rid); return; }'));
  assert.ok(ql.includes('applyQuit(s, live, todayKey())') && ql.includes('.catch(() => { ui.unsaved.push(live); })') && ql.includes('.finally(() => releaseRoundLock(live.rid));'), '못 적으면 기억 · 잠금은 적기가 끝난 뒤에 (Codex 62차 #4)');
  assert.equal(ql.split('releaseRoundLock(').length - 1, 2, '잠금을 놓는 곳은 답 없이 나갈 때와 적기가 끝난 뒤 둘뿐');
  assert.ok(src.includes("back.addEventListener('click', () => { quitLive(); ui.round = null;"), '← 머리 단추: 비우기 전에');
  const rm = fn('renderMath');
  assert.ok(rm.indexOf('state = await settleLive(state);') > rm.indexOf('syncMathReplies(state)') && rm.indexOf('state = await settleLive(state);') < rm.indexOf('ui.state = state;'));
  assert.ok(rm.indexOf('if (r) {') < rm.indexOf('settleLive'), '🎒·📊 다녀온 것(ui.round 있음)은 정리 전에 이어서 — 멈춤');
  const sl = fn('settleLive');
  assert.ok(sl.includes('const held = await heldRids();') && sl.includes('const settle = new Set(waiting.map((l) => l.rid).filter((rid) => !held.has(rid)));') && sl.includes('settleLives(s, liveKeep(s, settle, ui.round && ui.round.rid), today);'), '다른 창이 쥔 편·잠금을 본 뒤 생긴 편·이 창이 푸는 편은 그대로 (Codex 63차 #3)');
  assert.ok(sl.indexOf('const held = await heldRids();') < sl.indexOf('const settle = '), '잠금을 본 다음에 정리 대상을 정한다');
  assert.ok(sl.indexOf('for (const u of redo) applyQuit(s, u, today);') > 0 && sl.includes('ui.unsaved = ui.unsaved.filter((u) => !redo.includes(u));'), '못 적은 그만둠을 다시 적고, 적은 것만 지운다');
  const fr = fn('finishRound');
  const iCount = fr.indexOf('const repeat = r.rid ? sameDayRounds(s, r.id, r.day || today, r.rid) : 0;');
  assert.ok(iCount > 0 && iCount < fr.indexOf('result = applyRound(s, r.id,'), '이 편을 일지에 넣기 전에 센다');
  assert.ok(fr.includes('...(r.rid ? { rid: r.rid, day: r.day } : {}) }, today);') && fr.includes('result.repeat = repeat;'), '시작한 날도 넘긴다 (Codex 62차 #2)');
  assert.ok(fr.indexOf('if (r.rid) releaseRoundLock(r.rid);') > fr.indexOf('ui.round = null; // 저장이 됐으니'), '저장이 된 뒤에 잠금을 놓는다');
  assert.ok(fr.includes('const qs = conceptQs(r);'));
  assert.ok(fr.includes('if (result.repeat > 0) {\n    const pay = roundPay(result);'), '둘째 편부터 결과 카드에 까닭');
  assert.ok(fr.includes("번째 편이지만 다 맞혀 통과해서 ⚡💰를 다 받았어요") && fr.includes("번째 편이라 문항 ⚡💰가 ${pay ? '반이에요' : '없어요'}"));
  assert.ok(fr.includes('const nx = repeatNote(state, r.id, today);') && fr.includes("`🤔 한 번 더 (문항 ⚡💰 ${nx.pay ? '반' : '없음'}${nx.practice ? '' : ' · 통과하면 다'})`"));
  const rq = fn('renderQuestion');
  assert.ok(rq.includes("if (r.rep && r.rep.text && r.at === 0) card.appendChild(el('p', 'math-practice-note math-repeat-note', r.rep.text));"));
  assert.ok(+(/const CACHE_VERSION = 'v(\d+)';/.exec(read('sw.js')) || [])[1] >= 250, 'sw v250 이상');
});
