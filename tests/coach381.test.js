// 👨‍👩‍👦 v381 밀린 아빠 교정 — 에세이 뒤 차례(coachPick) · 지나감(coachGone) · 📤 feedback.md · 📊 · 진우 화면이 같은 규칙
// node --test tests/coach381.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { coachPick, coachGone, coachState, essayItems, feedbackMd, COACH_KEEP_DAYS, COACH_MANY, COACH_MAX, FEEDBACK_DAYS } from '../js/feedback.js';

const DAY = 86400000;
const NOW = new Date(2026, 10, 2, 20, 0).getTime();
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
/** listEssays 꼴 한 줄 — ago = 붙은 지 며칠(null이면 붙은 때 모름) */
const fx = (id, date, ago, more = {}) => ({ id, date, written: `w ${id}`, coachFix: `W ${id}.`, ...(ago === null ? {} : { fixedAt: NOW - ago * DAY }), readAt: 0, ...more });
const ids = (list) => list.map((e) => e.id);

test('👨‍👩‍👦 v381 정한 값 — 7일 · 셋 이상이면 · 두 문장', () => {
  assert.equal(COACH_KEEP_DAYS, 7);
  assert.equal(COACH_MANY, 3);
  assert.equal(COACH_MAX, 2);
  assert.ok(COACH_KEEP_DAYS < FEEDBACK_DAYS, '지나간 것도 📬에 한동안 보인다');
});

test('👨‍👩‍👦 coachPick — 차례가 둘 이하면 가장 최근 하나 · 셋 이상이면 가장 최근 둘(오래된 것부터) · 빈 것', () => {
  assert.deepEqual(coachPick([], NOW), []);
  assert.deepEqual(coachPick(null, NOW), []);
  assert.deepEqual(ids(coachPick([fx('a', '2026-10-30', 2)], NOW)), ['a']);
  assert.deepEqual(ids(coachPick([fx('a', '2026-10-30', 2), fx('b', '2026-10-31', 1)], NOW)), ['b'], '둘이면 한 문장');
  const three = [fx('a', '2026-10-29', 3), fx('b', '2026-10-30', 2), fx('c', '2026-10-31', 1)];
  assert.deepEqual(ids(coachPick(three, NOW)), ['b', 'c'], '셋이면 최근 둘 — 오래된 것부터');
  const five = [...three, fx('d', '2026-10-31', 0.5), fx('e', '2026-11-01', 0.2)];
  assert.deepEqual(ids(coachPick(five, NOW)), ['d', 'e'], '많아도 두 문장');
});

test('👨‍👩‍👦 coachPick — 쓴 날이 아니라 붙은 차례 · 같은 때면 원래 차례 · 읽은 것·교정 없는 것은 안 셈', () => {
  // 옛 글(10-20)을 아빠가 오늘 고쳐 보냄 → 가장 최근에 붙은 것
  const late = [fx('old', '2026-10-20', 0.1), fx('x', '2026-10-30', 2), fx('y', '2026-10-31', 1)];
  assert.deepEqual(ids(coachPick(late, NOW)), ['y', 'old'], '붙은 차례로');
  // 한 번에 붙은 하루치 셋(같은 붙은 때) → 원래 차례(뒤가 최근)
  const batch = ['p', 'q', 'r'].map((id) => fx(id, '2026-10-31', 1));
  assert.deepEqual(ids(coachPick(batch, NOW)), ['q', 'r']);
  // 읽은 것·교정 없는 글은 차례에 안 듦 — 남은 둘이면 한 문장
  const mixed = [fx('a', '2026-10-29', 3), fx('b', '2026-10-30', 2, { readAt: NOW - DAY }), { id: 'c', date: '2026-10-31', written: 'no fix', readAt: 0 }, fx('d', '2026-10-31', 1)];
  assert.deepEqual(ids(coachPick(mixed, NOW)), ['d']);
});

test('👨‍👩‍👦 coachGone·coachPick — 붙은 지 7일 넘은 안 본 교정은 차례 밖(셈에도 안 듦) · 딱 7일은 아직 · 붙은 때 모르면 남김 · 읽은 것은 지나감 아님', () => {
  const edge = fx('edge', '2026-10-26', COACH_KEEP_DAYS);
  const past = { ...fx('past', '2026-10-26', 0), fixedAt: NOW - COACH_KEEP_DAYS * DAY - 1 };
  assert.equal(coachGone(edge, NOW), false, '딱 7일은 차례에 남음');
  assert.equal(coachGone(past, NOW), true, '7일 하고 1ms');
  assert.equal(coachGone(fx('u', '2026-09-01', null), NOW), false, '붙은 때 모름');
  assert.equal(coachGone(fx('r', '2026-09-01', 30, { readAt: NOW - 29 * DAY }), NOW), false, '읽은 것');
  assert.equal(coachGone({ id: 'n', date: '2026-09-01', written: 'w', fixedAt: NOW - 30 * DAY }, NOW), false, '교정 없는 글');
  // 지나간 것 셋 + 차례 둘 → 셋으로 세지 않아 한 문장
  const list = [fx('g1', '2026-10-20', 12), fx('g2', '2026-10-21', 11), fx('g3', '2026-10-22', 9), fx('a', '2026-10-31', 1), fx('b', '2026-11-01', 0.5)];
  assert.deepEqual(ids(coachPick(list, NOW)), ['b']);
  assert.deepEqual(ids(coachPick([...list, past], NOW)), ['b'], '막 지나간 것도 안 셈');
  assert.deepEqual(ids(coachPick([...list, edge], NOW)), ['a', 'b'], '딱 7일은 세서 셋 → 두 문장');
  // 붙은 때 모르는 옛 교정은 차례에 남고 가장 오래된 쪽
  assert.deepEqual(ids(coachPick([fx('a', '2026-10-31', 1), fx('u', '2026-09-01', null), fx('b', '2026-11-01', 0.5)], NOW)), ['a', 'b']);
  assert.deepEqual(ids(coachPick([fx('u', '2026-09-01', null)], NOW)), ['u']);
});

test('📬 feedback.md — 지나간 교정은 「지나감」 줄 · 14일이 지나면 빠짐 · 요약에 지나감 수 · 국어·수학 요약은 그대로', () => {
  const days = [
    { date: '2026-10-15', essays: [{ id: 'gone_old', written: 'very old', coachFix: 'Very old.', fixedAt: NOW - (FEEDBACK_DAYS + 1) * DAY }] },
    { date: '2026-10-22', essays: [{ id: 'g', written: 'gone one', coachFix: 'Gone one.', fixedAt: NOW - 9 * DAY }] },
    { date: '2026-10-31', essays: [
      { id: 'q', written: 'in queue', coachFix: 'In queue.', fixedAt: NOW - DAY },
      { id: 's', written: 'seen one', coachFix: 'Seen one.', fixedAt: NOW - DAY, readAt: NOW - 1000, readHow: 'pass' },
    ] },
  ];
  const it = essayItems(days, NOW);
  assert.equal(it.length, 3, '14일 넘게 지난 지나감은 빠짐');
  const g = it.find((x) => x.text.includes('진우: gone one'));
  assert.ok(g.gone && !g.seen);
  assert.ok(g.text.includes(`지나감 — 붙은 지 ${COACH_KEEP_DAYS}일이 지나 진우 화면 차례에서 빠졌어요(지우지 않음)`));
  const q = it.find((x) => x.text.includes('진우: in queue'));
  assert.ok(!q.gone && !q.seen && q.text.includes('아직 안 봄'));
  const md = feedbackMd({ days, writes: {}, asks: [], today: '2026-11-02', now: NOW });
  assert.ok(md.includes('✍️ 영어 교정 3 (본 것 1 · 안 본 것 1 · 지나감 1)'), md.split('\n')[2]);
  assert.ok(md.includes('v381부터 차례에 셋 이상 밀렸으면 두 문장'));
  assert.ok(md.split('\n')[0].endsWith(`아직 안 본 것 모두(✍️ 영어 교정의 「지나감」은 본 것처럼 ${FEEDBACK_DAYS}일까지)`), '머리 줄이 지나감 예외를 말한다 (🔍 Codex 184차 ②)');
  const kor = feedbackMd({ days: [], writes: { K1: { list: [{ at: NOW - 2 * DAY, grade: 'near', rAt: NOW - DAY, read: false }] } }, asks: [], today: '2026-11-02', now: NOW });
  assert.ok(kor.includes('📚 국어 답장 1 (본 것 0 · 안 본 것 1) ·'), '국어는 지나감 칸 없음');
  assert.ok(feedbackMd({ days: [], writes: {}, asks: [], today: '2026-11-02', now: NOW }).includes('요약: ✍️ 영어 교정 0 · 📚'));
});

test('👨‍👩‍👦 coachState — 읽음은 양의 시각일 때만(글자 "0"·엉뚱한 글자는 안 읽음) · 📊·진우 화면·📤가 같은 판정 (🔍 Codex 184차 ①)', () => {
  const at = (readAt, ago = 1) => ({ id: 'x', date: '2026-10-31', written: 'w', coachFix: 'W.', fixedAt: NOW - ago * DAY, readAt });
  assert.equal(coachState(null, NOW), '');
  assert.equal(coachState({ id: 'n', written: 'w' }, NOW), '', '교정 없는 글');
  for (const v of [0, undefined, null, '0', 'bad', '', -5, NaN]) assert.equal(coachState(at(v), NOW), 'queue', `readAt ${JSON.stringify(v)} → 차례`);
  for (const v of [NOW - 1000, String(NOW - 1000)]) assert.equal(coachState(at(v), NOW), 'read', `readAt ${JSON.stringify(v)} → 읽음`);
  assert.equal(coachState(at('0', 8), NOW), 'gone', '글자 "0"인 8일 전 교정 → 지나감(📊도 읽음으로 안 봄)');
  assert.equal(coachState(at(NOW - 1000, 30), NOW), 'read', '읽은 것은 오래돼도 읽음');
  // 같은 줄을 진우 화면도 같은 판정으로 — 글자 "0"은 다시 띄운다(📊는 「아직 안 읽음」)
  assert.deepEqual(ids(coachPick([at('0')], NOW)), ['x']);
  // 📤도 같은 판정 — 글자 "0"은 안 본 것
  const it = essayItems([{ date: '2026-10-31', essays: [at('0')] }], NOW);
  assert.ok(!it[0].seen && !it[0].gone && it[0].text.includes('아직 안 봄'));
});

test('👨‍👩‍👦 기기 시계를 앞으로 옮겼다 되돌리면 — 지나감은 저장하지 않아 다시 차례로 (🔍 Codex 184차 ③)', () => {
  const list = [fx('a', '2026-10-30', 2), fx('b', '2026-10-31', 1), fx('c', '2026-11-01', 0.5)];
  assert.deepEqual(ids(coachPick(list, NOW)), ['b', 'c']);
  const later = NOW + 8 * DAY;
  assert.deepEqual(ids(coachPick(list, later)), [], '8일 앞으로 — 모두 지나감');
  assert.equal(list.filter((e) => coachState(e, later) === 'gone').length, 3);
  assert.deepEqual(ids(coachPick(list, NOW)), ['b', 'c'], '되돌리면 다시 차례');
  assert.ok(list.every((e) => !('gone' in e)), '고르기가 줄에 아무것도 적지 않는다');
});

test('📬 지나간 것은 본 것처럼 최근 FEEDBACK_MAX개까지만 · 차례에 있는 안 본 것은 모두', async () => {
  const { FEEDBACK_MAX } = await import('../js/feedback.js');
  const gone = Array.from({ length: FEEDBACK_MAX + 4 }, (_, i) => ({ id: `g${i}`, written: `g${i}`, coachFix: `G${i}.`, fixedAt: NOW - 10 * DAY + i }));
  const live = Array.from({ length: 3 }, (_, i) => ({ id: `q${i}`, written: `q${i}`, coachFix: `Q${i}.`, fixedAt: NOW - DAY + i }));
  const it = essayItems([{ date: '2026-10-23', essays: gone }, { date: '2026-11-01', essays: live }], NOW);
  assert.equal(it.filter((x) => x.gone).length, FEEDBACK_MAX, '지나간 것은 최근 것만');
  assert.equal(it.filter((x) => !x.gone && !x.seen).length, 3);
  assert.ok(!it.some((x) => x.text.includes('진우: g3\n')) && it.some((x) => x.text.includes('진우: g4\n')), '지나간 것도 최근 것부터 남김');
});

test('👨‍👩‍👦 진우 화면·📊가 같은 규칙을 쓴다 · 옛 상수는 없다 · 판 v381', () => {
  const pl = read('js/player.js');
  assert.ok(pl.includes("import { coachPick } from './feedback.js';"));
  assert.ok(pl.includes('const unread = coachPick(list, Date.now());'));
  assert.ok(!pl.includes('COACH_FIX_MAX'), '옛 한 문장 상수는 지움');
  const st = read('js/stats.js');
  assert.ok(st.includes("import { coachState, COACH_KEEP_DAYS } from './feedback.js';"));
  assert.ok(st.includes('const st = coachState(e, Date.now());') && st.includes("st === 'read' ? ' (읽음)' : st === 'gone' ? ` (지나감 — 붙은 지"), '📊 읽음·지나감은 coachState 하나로');
  assert.ok(!/e\.readAt \? ' \(읽음\)'/.test(st), '📊가 읽은 때 칸의 참·거짓으로 읽음을 가르지 않는다 (🔍 Codex 184차 ①)');
  assert.ok(read('js/feedback.js').includes('순수 — 아무것도 import하지 않는다') && !/^import /m.test(read('js/feedback.js')), 'feedback.js는 순수 그대로');
  // 판은 v381 이상 — 다음 판에서 올려도 깨지지 않게 (v382에서 「정확히 v381」이 깨졌다)
  assert.ok(Number((/APP_VERSION = 'v(\d+)'/.exec(read('js/version.js')) || [])[1]) >= 381);
  assert.ok(Number((/CACHE_VERSION = 'v(\d+)'/.exec(read('sw.js')) || [])[1]) >= 381);
});
