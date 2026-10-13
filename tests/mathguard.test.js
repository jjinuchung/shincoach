// 🛡️ 노가다 탈출구 막기 5단계 (v252, 2026-10-13) — 📊 꼼수 막기 기록 · 🔍 🎯 까닭 고르기 첫 선택
//  · 그만둔 편 · 같은 날 같은 개념 여러 편 · 🙈 실수 확인(✓ · 확인 문제도 틀림 · 확인 못 함 · 옛 기록은 뺌)은 있는 일지에서 센다
//  · 🔍 첫 선택은 🎯 문제·칸마다 처음 한 번만(그 문제에 처음 낸 답일 때만) — 점수·보상·tries는 그대로, 합칠 땐 먼저 고른 것
//  · 📊 화면과 📋 글(비공개 저장소 math/날짜.md)은 같은 줄(guardLines)
import { fakeIdb } from './fakeidb.js'; // ★ db.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  guardReport, guardLines, GUARD_DAYS, GUARD_LIST, applyRound, applyQuit, applyNotesRound, applySpecialRound, mathReportText, nameOf, STEMS,
} from '../js/mathprog.js';
import { applyChalAnswer, applyReviewFirst, applyReviewFirsts, mergeReviewFirst, rfKey, qid } from '../js/mathchal.js';
import { emptyMath, mergeMath, cloneMath, updateMath, getMath } from '../js/db.js';

const T = '2026-10-13';
const [ID, ID2] = STEMS.fraction.list.map((c) => c.id);
const read = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const learn = (m, id, ok, n, o = {}) => applyRound(m, id, { correct: ok, total: n, missTags: [], qs: o.qs || [], mode: 'learn', ...(o.rid ? { rid: o.rid } : {}), ...(o.day ? { day: o.day } : {}) }, o.today || T);
const slipQ = (sv, fx) => ({ k: 'calc', ok: 0, key: 'K', w: 's', ...(sv === undefined ? {} : { sv }), ...(fx === undefined ? {} : { fx }) });
const SET = { id: 'S1', items: [{ no: 1 }, { no: 2 }] };

test('🛡️ guardReport: 7일(오늘 포함) 안의 그만둔 편 · 같은 날 여러 편 · 실수 확인 — 기간 밖은 안 셈', () => {
  assert.equal(GUARD_DAYS, 7);
  const m = emptyMath();
  learn(m, ID, 1, 2, { rid: 1 });
  learn(m, ID, 2, 2, { rid: 2 });
  applyQuit(m, { rid: 3, id: ID, d: T, n: 4, qs: [{ k: 'calc', ok: 0, key: 'Q' }] }, T);
  learn(m, ID2, 1, 2, { rid: 4 });
  learn(m, ID, 0, 2, { rid: 5, today: '2026-10-07' }); // 7일째(10-07)는 안
  learn(m, ID, 0, 2, { rid: 6, today: '2026-10-07' });
  learn(m, ID, 0, 2, { rid: 7, today: '2026-10-06' }); // 8일 전은 밖
  learn(m, ID, 0, 2, { rid: 8, today: '2026-10-06' });
  learn(m, ID2, 0, 2, { rid: 12, today: '2026-10-14' }); // 오늘 뒤(다른 기기 시계)도 밖
  learn(m, ID2, 0, 2, { rid: 13, today: '2026-10-14' });
  const g = guardReport(m, T);
  assert.deepEqual([g.from, g.to, g.days], ['2026-10-07', T, 7]);
  assert.deepEqual(g.quits, [{ id: ID, name: nameOf(ID), d: T, ok: 0, n: 1, of: 4 }]);
  assert.deepEqual(g.repeats.map((r) => [r.id, r.d, r.k]), [[ID, T, 3], [ID, '2026-10-07', 2]], '최근 날부터 · 그만둔 편도 편 수에 · 한 편뿐인 개념(ID2)은 없음');
  assert.deepEqual(guardReport(m, T, 1).repeats.map((r) => r.d), [T], '기간 1일');
  const two = emptyMath();
  applyQuit(two, { rid: 1, id: ID, d: '2026-10-11', n: 4, qs: [{ k: 'calc', ok: 0 }] }, T);
  applyQuit(two, { rid: 2, id: ID2, d: T, n: 4, qs: [{ k: 'calc', ok: 0 }] }, T);
  assert.deepEqual(guardReport(two, T).quits.map((x) => [x.id, x.d]), [[ID2, T], [ID, '2026-10-11']], '그만둔 편은 최근 것부터');
});

test('🛡️ 같은 편(rid)은 한 번 — 그만둠과 끝냄 둘 다 남으면 끝낸 줄만(그만둔 편에 안 나옴) · rid 없는 옛 편은 하나씩 · 자정 넘겨 끝낸 편은 시작한 날(sd)', () => {
  const m = emptyMath();
  applyQuit(m, { rid: 9, id: ID, d: T, n: 3, qs: [{ k: 'calc', ok: 1 }] }, T);
  m.log.push({ d: T, t: Date.now() + 5, rid: 9, id: ID, mode: 'learn', ok: 3, n: 3, qs: [] }); // 두 창
  learn(m, ID, 3, 3, { rid: 10 });
  let g = guardReport(m, T);
  assert.deepEqual(g.quits, []);
  assert.deepEqual(g.repeats.map((r) => r.k), [2]);
  m.log.push({ d: T, t: Date.now() + 9, id: ID, mode: 'learn', ok: 1, n: 3, qs: [] }); // 옛 편(rid 없음)
  m.log.push({ d: '2026-10-14', sd: T, t: Date.now() + 10, rid: 11, id: ID, mode: 'learn', ok: 1, n: 3, qs: [] }); // 자정 넘김
  m.log.push({ d: T, t: Date.now() + 11, rid: 10, id: ID, mode: 'learn', ok: 3, n: 3, qs: [] }); // 같은 편이 두 줄(백업)
  g = guardReport(m, T);
  assert.deepEqual(g.repeats.map((r) => r.k), [4]);
  // 노트·💎는 개념 편 수가 아니다
  applyNotesRound(m, [{ id: ID, key: 'K', k: 'calc', ok: 1 }], T);
  applyNotesRound(m, [{ id: ID, key: 'K', k: 'calc', ok: 1 }], T);
  applySpecialRound(m, [{ kind: 'k1', ok: true }], T);
  applySpecialRound(m, [{ kind: 'k1', ok: true }], T);
  assert.deepEqual(guardReport(m, T).repeats.map((r) => [r.id, r.k]), [[ID, 4]]);
});

test('🛡️ 🙈 실수 확인: ✓ sv 1 · ✗ 확인 문제도 틀림(sv 0 · fx 0) · ✗ 확인 못 함(sv 0, 쌍둥이 없음·그 전에 그만둠) · 옛 기록(sv 없음)은 따로 · 맞힌 문항·다른 이유는 안 셈 · 💎·그만둔 편도', () => {
  const m = emptyMath();
  learn(m, ID, 0, 5, { rid: 1, qs: [slipQ(1, 1), slipQ(0, 0), slipQ(0), slipQ(), { k: 'calc', ok: 0, w: 'c' }] });
  applyQuit(m, { rid: 2, id: ID2, d: T, n: 4, qs: [slipQ(0)] }, T);
  applySpecialRound(m, [{ kind: 'k1', ok: false, w: 's', sv: 0 }], T);
  m.log.push({ d: '2026-10-01', t: 1, id: ID, mode: 'learn', ok: 0, n: 1, qs: [slipQ(1, 1)] }); // 기간 밖
  assert.deepEqual(guardReport(m, T).slip, { yes: 1, twin: 1, none: 3, old: 1 });
  m.log.push({ ...m.log.find((e) => e.rid === 1), t: Date.now() + 50 }); // 같은 편이 두 줄 — 한 번만
  assert.deepEqual(guardReport(m, T).slip, { yes: 1, twin: 1, none: 3, old: 1 });
});

test('🛡️ 🔍 첫 선택: 기간 안의 m.chal.rf만 · 맞음/전체', () => {
  const m = emptyMath();
  applyReviewFirst(m, 'S1', 1, 0, 1, T);
  applyReviewFirst(m, 'S1', 2, 0, 0, '2026-10-08');
  applyReviewFirst(m, 'S1', 3, 1, 1, '2026-10-01');
  assert.deepEqual(guardReport(m, T).review, { ok: 1, n: 2 });
  assert.deepEqual(guardReport(emptyMath(), T).review, { ok: 0, n: 0 });
  // 손질 안 된 길로 꼴이 틀린 줄이 들어와도 안 센다 (Codex 64차)
  m.chal.rf = { ...m.chal.rf, b1: [2, T, 5], b2: [1, T, null], b3: [1, T, ''], b4: [1, T, '5'], b5: [1, '2026-10-1', 5], b6: [1, T, 0], b7: 'x' };
  assert.deepEqual(guardReport(m, T).review, { ok: 1, n: 2 });
});

test('🛡️ guardLines: 제목 + 네 줄 · 없으면 "없음" · 많으면 "외 N" · 옛 실수는 뺐다고 · 🔍는 분모와 함께, 이해의 증거가 아니라고', () => {
  const none = guardLines(guardReport(emptyMath(), T));
  assert.deepEqual(none, [
    '🛡️ 최근 7일(10-07~10-13) 꼼수 막기 기록',
    '⏹ 그만둔 편 없음',
    '🔁 같은 날 같은 개념 여러 편 없음',
    '🙈 "실수"라고 한 오답 없음',
    '🔍 🎯 까닭 고르기 첫 선택 아직 없음 — 문제를 처음 풀 때 틀려서 까닭을 고른 경우만 세요',
  ]);
  const m = emptyMath();
  applyQuit(m, { rid: 1, id: ID, d: T, n: 4, qs: [{ k: 'calc', ok: 1 }, { k: 'calc', ok: 0 }] }, T);
  learn(m, ID, 1, 2, { rid: 2, qs: [slipQ(1, 1), slipQ()] });
  applyReviewFirst(m, 'S1', 1, 0, 1, T);
  applyReviewFirst(m, 'S1', 2, 0, 0, T);
  const L = guardLines(guardReport(m, T));
  assert.equal(L[1], `⏹ 그만둔 편 1: ${nameOf(ID)} 10-13 (4문제 중 2개 풀고 1개 맞힘)`);
  assert.equal(L[2], `🔁 같은 날 같은 개념 여러 편 1: ${nameOf(ID)} 10-13 2편`);
  assert.equal(L[3], '🙈 "실수"라고 한 오답 1: ✓ 확인 문제를 맞힘 1 · ✗ 확인 문제도 틀림 0 · ✗ 확인 못 함 0(확인 문제가 없거나 그 전에 그만둠) — 확인 없이 빼 주던 옛 기록 1개는 셈에서 뺐어요');
  assert.equal(L[4], '🔍 🎯 까닭 고르기 첫 선택 정답 1/2 — 맞는 까닭을 골랐다는 뜻이에요(이해했다는 증거는 아니에요)');
  assert.ok(!/쌍둥이/.test(L.join('\n')), 'sv 0을 "쌍둥이 틀림"이라 부르지 않는다 — 아빠 화면 말은 "확인 문제"');
  const many = emptyMath();
  for (let i = 0; i < GUARD_LIST + 2; i++) applyQuit(many, { rid: 100 + i, id: ID, d: T, n: 4, qs: [{ k: 'calc', ok: 0 }] }, T);
  const ml = guardLines(guardReport(many, T));
  assert.ok(ml[1].startsWith(`⏹ 그만둔 편 ${GUARD_LIST + 2}: `) && ml[1].endsWith(' 외 2'), ml[1]);
  assert.equal(ml[1].split(' · ').length, GUARD_LIST);
  const old = emptyMath();
  learn(old, ID, 0, 1, { qs: [slipQ()] });
  assert.equal(guardLines(guardReport(old, T))[3], '🙈 "실수"라고 한 오답 없음 (확인 없이 빼 주던 옛 기록 1개는 셈에서 뺐어요)');
});

test('🛡️ 📋 기록 글(math/날짜.md)과 📊 화면이 같은 줄 — mathReportText에 guardLines 그대로 · stats.js는 같은 함수로', () => {
  const m = emptyMath();
  applyQuit(m, { rid: 1, id: ID, d: T, n: 4, qs: [{ k: 'calc', ok: 0 }] }, T);
  const txt = mathReportText(m, T);
  for (const l of guardLines(guardReport(m, T))) assert.ok(txt.includes(`\n${l}\n`), l);
  const st = read('js/stats.js');
  assert.ok(st.includes('const guard = guardLines(guardReport(math, today));'));
  assert.ok(st.includes("const gl = el('ul', 'stats-guard');") && st.includes("for (const t of guard.slice(1)) gl.appendChild(el('li', '', t));"));
  assert.ok(st.includes("cM.appendChild(el('p', 'stats-sub', guard[0]));"));
  assert.ok(+(/const CACHE_VERSION = 'v(\d+)';/.exec(read('sw.js')) || [])[1] >= 252, 'sw v252 이상');
  assert.ok(read('css/style.css').includes('.stats-guard {'));
});

test('🔍 applyChalAnswer.first: 그 문제에 처음 낸 답만 true (맞든 틀리든) · 다시 풀면 false', () => {
  const m = emptyMath();
  assert.equal(applyChalAnswer(m, 'S1', 1, false, SET).first, true);
  assert.equal(applyChalAnswer(m, 'S1', 1, true, SET).first, false);
  assert.equal(applyChalAnswer(m, 'S1', 2, true, SET).first, true);
});

test('🔍 applyReviewFirst: 문제·칸마다 처음 한 번만 · 점수·보상·tries·ok·rounds는 그대로 · 열쇠는 문제 키|칸', () => {
  const m = emptyMath();
  applyChalAnswer(m, 'S1', 1, false, SET);
  const before = JSON.stringify({ ok: m.chal.ok, tries: m.chal.tries, done: m.chal.done, rounds: m.chal.rounds });
  assert.equal(rfKey('S1', 1, 0), `${qid('S1', 1)}|0`);
  assert.equal(applyReviewFirst(m, 'S1', 1, 0, 0, T, 100), true);
  assert.equal(applyReviewFirst(m, 'S1', 1, 0, 1, T, 200), false, '두 번째는 안 적는다');
  assert.equal(applyReviewFirst(m, 'S1', 1, 1, 1, T, 300), true, '다른 칸은 따로');
  assert.deepEqual(m.chal.rf, { 'S1-1|0': [0, T, 100], 'S1-1|1': [1, T, 300] });
  assert.equal(JSON.stringify({ ok: m.chal.ok, tries: m.chal.tries, done: m.chal.done, rounds: m.chal.rounds }), before);
  const fresh = emptyMath();
  applyReviewFirst(fresh, 'S2', 4, 0, 1, T, 5);
  assert.deepEqual(fresh.chal, { rf: { 'S2-4|0': [1, T, 5] } }, '🎯 진도가 없어도 rf만');
  // 날·시각이 틀린 줄은 안 적는다 · 이미 있는 줄이 꼴이 틀렸으면 새로 적는다 (Codex 64차)
  for (const [day, t] of [['', 5], ['2026-1-13', 5], [T, null], [T, ''], [T, 0], [T, NaN]]) assert.equal(applyReviewFirst(fresh, 'S2', 5, 0, 1, day, t), false, `${day}/${t}`);
  assert.equal(fresh.chal.rf['S2-5|0'], undefined);
  fresh.chal.rf['S2-6|0'] = [1, T, null];
  assert.equal(applyReviewFirst(fresh, 'S2', 6, 0, 0, T, 9), true);
  assert.deepEqual(fresh.chal.rf['S2-6|0'], [0, T, 9]);
});

test('🔍 applyReviewFirsts: 못 적은 첫 선택을 누른 순간의 날·시각으로 다시 · 두 번 적어도 같다 · 처음 틀린 것을 나중 맞힘으로 안 바꾼다', () => {
  const m = emptyMath();
  const list = [{ setId: 'S1', no: 1, part: 0, ok: 0, day: '2026-10-12', t: 40 }, { setId: 'S1', no: 2, part: 1, ok: 1, day: T, t: 50 }];
  assert.equal(applyReviewFirsts(m, list), 2);
  assert.equal(applyReviewFirsts(m, list), 0, '두 번째는 그대로');
  assert.equal(applyReviewFirsts(m, [{ setId: 'S1', no: 1, part: 0, ok: 1, day: T, t: 90 }]), 0, '나중 맞힘은 첫 ✗를 못 바꾼다');
  assert.deepEqual(m.chal.rf, { 'S1-1|0': [0, '2026-10-12', 40], 'S1-2|1': [1, T, 50] });
  assert.equal(applyReviewFirsts(m, undefined), 0);
  assert.equal(applyReviewFirsts(m, [null]), 0);
});

test('🔍 합치기: 열쇠마다 먼저 고른 것(시각이 작은 쪽, 같으면 0, 같으면 이른 날) — 어느 쪽에서 합쳐도 같다 · 꼴이 틀린 줄은 버림(시각 null·빈 글·0 · 날 꼴) · mergeMath·cloneMath가 rf를 지킨다', () => {
  const a = { 'S1-1|0': [1, T, 200], 'S1-2|0': [0, T, 50], 'S1-3|0': [1, T, 7] };
  const b = { 'S1-1|0': [0, T, 100], 'S1-2|0': [1, T, 60], 'S1-3|0': [0, T, 7], bad: [2, T, 1], bad2: 'x', bad3: [1, 5, 1] };
  const want = { 'S1-1|0': [0, T, 100], 'S1-2|0': [0, T, 50], 'S1-3|0': [0, T, 7] };
  assert.deepEqual(mergeReviewFirst(a, b), want);
  assert.deepEqual(mergeReviewFirst(b, a), want);
  assert.deepEqual(mergeReviewFirst(undefined, null), {});
  // 시각·결과가 같고 날만 다르면 이른 날 — 순서와 상관없이 (Codex 64차: 날이 7일 창 양쪽에 걸리면 📊 분모가 달라졌다)
  const da = { k: [1, '2026-10-06', 300] };
  const db = { k: [1, T, 300] };
  assert.deepEqual(mergeReviewFirst(da, db), da);
  assert.deepEqual(mergeReviewFirst(db, da), da);
  // 시각이 null·''·문자열·0이면 버린다 — 시각 0으로 모두를 이기지 않게
  const good = { k: [1, T, 300] };
  for (const bad of [[0, T, null], [0, T, ''], [0, T, '5'], [0, T, 0], [0, '13일', 5], [0, '', 5]]) {
    assert.deepEqual(mergeReviewFirst(good, { k: bad }), good, JSON.stringify(bad));
    assert.deepEqual(mergeReviewFirst({ k: bad }, good), good, JSON.stringify(bad));
  }
  const ma = emptyMath(); ma.chal = { ok: { 'S1-1': 1 }, tries: { 'S1-1': 1 }, done: {}, rounds: 1, rf: a };
  const mb = emptyMath(); mb.chal = { ok: {}, tries: { 'S1-1': 2 }, done: {}, rounds: 0, rf: b };
  assert.deepEqual(mergeMath(ma, mb).chal.rf, want);
  assert.deepEqual(mergeMath(mb, ma).chal.rf, want);
  assert.deepEqual(mergeMath(ma, mb).chal.tries, { 'S1-1': 2 }, '다른 칸은 예전처럼 max');
  const mc = emptyMath(); mc.chal = { ok: { 'S1-1': 1 }, tries: {}, done: {}, rounds: 0 };
  assert.equal('rf' in mergeMath(mc, emptyMath()).chal, false, '없으면 안 만든다');
  const cl = cloneMath(ma);
  applyReviewFirst(cl, 'S9', 1, 0, 1, T);
  assert.equal(ma.chal.rf['S9-1|0'], undefined, '복사본을 고쳐도 원본은 그대로');
  assert.deepEqual(cl.chal.rf['S1-1|0'], [1, T, 200]);
});

test('🔍 진짜 저장 경로(fakeidb): updateMath로 적고 다시 읽으면 있다 · 두 번째는 그대로', async () => {
  assert.equal(fakeIdb.get('profile', 'math'), undefined, '이 파일의 첫 저장');
  await updateMath((s) => { applyChalAnswer(s, 'S1', 1, false, SET); });
  await updateMath((s) => { applyReviewFirst(s, 'S1', 1, 0, 0, T, 10); });
  await updateMath((s) => { applyReviewFirst(s, 'S1', 1, 0, 1, T, 20); });
  const m = await getMath();
  assert.deepEqual(m.chal.rf, { 'S1-1|0': [0, T, 10] });
  assert.deepEqual([m.chal.tries['S1-1'], m.chal.ok['S1-1']], [1, undefined]);
  assert.deepEqual(guardReport(m, T).review, { ok: 0, n: 1 });
  // 못 적으면(저장 실패) 들고 있다가 다음 저장 때 누른 순간의 날·시각 그대로 (Codex 64차)
  const list = [{ setId: 'S1', no: 2, part: 0, ok: 0, day: '2026-10-12', t: 30 }];
  fakeIdb.failNext('profile');
  await assert.rejects(updateMath((s) => { applyReviewFirsts(s, list); }));
  assert.equal((await getMath()).chal.rf['S1-2|0'], undefined, '실패하면 안 적힘');
  await updateMath((s) => { applyReviewFirsts(s, list); applyChalAnswer(s, 'S1', 2, true, SET); });
  const m2 = await getMath();
  assert.deepEqual(m2.chal.rf['S1-2|0'], [0, '2026-10-12', 30]);
  assert.equal(m2.chal.ok['S1-2'], 1, '같은 트랜잭션의 답 저장도 그대로');
});

test('🔍 화면 연결(math.js): 처음 낸 답(first)일 때만 · 한 번(r.rf) · 진도 화면 상태(ui.state)는 안 덮는다', () => {
  const a = read('js/math.js');
  assert.ok(a.includes('first: !!saved.result.first,'), 'saveChalAnswer가 first를 남긴다');
  assert.ok(a.includes('onFirst: (ok) => { if (r.first && !r.rf) { r.rf = 1; saveReviewFirst(c.set.id, item.no, qz.part, ok); } },'));
  const fn = a.slice(a.indexOf('function saveReviewFirst('), a.indexOf('function saveReviewFirst(') + 300);
  assert.ok(fn.includes("rfPending.push({ setId, no, part, ok: ok ? 1 : 0, day: todayKey(), t: Date.now() });") && !fn.includes('ui.state'), fn);
  assert.ok(fn.includes('updateMath((s) => { applyReviewFirsts(s, list); }).then(() => dropRfPending(list), () => {});'), '적히면 빼고, 못 적으면 남긴다');
  // 못 적은 첫 선택은 다음 🎯 답 저장·회차 끝 저장이 같은 트랜잭션에 (Codex 64차)
  for (const name of ['async function saveChalAnswer(', 'async function finishChal(']) {
    const body = a.slice(a.indexOf(name), a.indexOf(name) + 1600);
    assert.ok(body.includes('const rf = rfPending.slice();') && body.includes('applyReviewFirsts(s, rf);') && body.includes('if (saved.ok) dropRfPending(rf);'), name);
    assert.ok(body.indexOf('applyReviewFirsts(s, rf);') > body.indexOf('commitChalRound((s) => {'), `${name} 트랜잭션 안에서`);
  }
  assert.ok(read('js/lookview.js').includes('if (!st.rqMiss && o.onFirst) o.onFirst(k === qz.ok ? 1 : 0);'));
});
