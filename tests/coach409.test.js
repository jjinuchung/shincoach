// 🤫 v409 아빠 교정 「확인만」 — essay/fixes.json 줄에 quiet: true면 고쳐 준 글로 치되(📮에서 빠짐) 진우 화면 차례·📬 셈엔 안 든다
// 하루 한 줄만 진우에게 보내고 나머지(배울 거리가 적은 글)는 확인만 — 밀려 지나가는 교정을 줄이려고
// node --test tests/coach409.test.js
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { matchFixes } from '../js/essay.js';
import { fixEssayEntry, applyEssayFixes, listEssays, listDaily, mergeEssayEntry, mergeEssayCopies } from '../js/db.js';
import { coachPick, coachState, coachGone, essayItems, feedbackMd, COACH_KEEP_DAYS } from '../js/feedback.js';
import { collectTodo, splitEssayDays } from '../js/stats.js';
import { checkPrivateDir } from '../tools/privcheck.mjs';

void fakeIdb;
const DAY = 86400000;
const NOW = new Date(2026, 10, 10, 20, 0).getTime();
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const ids = (list) => list.map((e) => e.id);

test('🤫 matchFixes — quiet: true만 그대로 넘긴다 · 글자 "true"·1·false·없음은 안 붙인다', () => {
  const entries = ['a', 'b', 'c', 'd', 'e'].map((k) => ({ id: `v|${k}`, date: '2026-11-09', written: `I like ${k} a lot`, origin: `o ${k}` }));
  const fixes = [
    { date: '2026-11-09', written: 'I like a a lot', fixed: 'I like A a lot.', quiet: true },
    { date: '2026-11-09', written: 'I like b a lot', fixed: 'I like B a lot.', quiet: 'true' },
    { date: '2026-11-09', written: 'I like c a lot', fixed: 'I like C a lot.', quiet: 1 },
    { date: '2026-11-09', written: 'I like d a lot', fixed: 'I like D a lot.', quiet: false },
    { date: '2026-11-09', written: 'I like e a lot', fixed: 'I like E a lot.' },
  ];
  assert.deepEqual(matchFixes(entries, fixes), [
    { id: 'v|a', date: '2026-11-09', fixed: 'I like A a lot.', quiet: true },
    { id: 'v|b', date: '2026-11-09', fixed: 'I like B a lot.' },
    { id: 'v|c', date: '2026-11-09', fixed: 'I like C a lot.' },
    { id: 'v|d', date: '2026-11-09', fixed: 'I like D a lot.' },
    { id: 'v|e', date: '2026-11-09', fixed: 'I like E a lot.' },
  ]);
  // 날짜 없는 옛 꼴(같은 글)도 그대로
  assert.deepEqual(matchFixes([{ id: 'v|u', written: 'old one' }], [{ written: 'old one', fixed: 'Old one.', quiet: true }]), [{ id: 'v|u', fixed: 'Old one.', quiet: true }]);
});

test('🤫 fixEssayEntry — 확인만이면 coachQuiet · 다른 교정이 오면 그 줄의 뜻 · 같은 교정이면 그대로', () => {
  const e = { id: 'v|1', written: 'I go park', readAt: 0 };
  assert.equal(fixEssayEntry(e, "I go to the park.", 100, true), true);
  assert.deepEqual(e, { id: 'v|1', written: 'I go park', coachFix: "I go to the park.", fixedAt: 100, readAt: 0, coachQuiet: true });
  assert.equal(fixEssayEntry(e, "I go to the park.", 200, false), false, '같은 교정이면 아무 일도 안 한다');
  assert.equal(e.coachQuiet, true);
  assert.equal(fixEssayEntry(e, "I went to the park.", 300), true, '📊 붙여 넣기로 다른 교정 — 진우에게 뜨는 교정');
  assert.ok(!('coachQuiet' in e) && e.fixedAt === 300 && e.readAt === 0);
  const r = { id: 'v|2', written: 'w', coachFix: 'W.', fixedAt: 5, readAt: 9, readHow: 'pass' };
  assert.equal(fixEssayEntry(r, 'W!', 10, true), true);
  assert.deepEqual(r, { id: 'v|2', written: 'w', coachFix: 'W!', fixedAt: 10, readAt: 0, coachQuiet: true });
});

test('🤫 applyEssayFixes(가짜 DB) — 한 줄은 진우에게 · 둘은 확인만 → 📮 0 · 차례엔 한 문장 · 📬엔 한 줄', async () => {
  await listDaily(); // 저장소를 연다
  fakeIdb.clear();
  const D = '2026-11-09';
  fakeIdb.put('daily', { date: D, doneKeys: [], essays: [
    { id: 'v|1', written: 'she are my friend', origin: 'o1' },
    { id: 'v|2', written: 'we play soccer', origin: 'o2' },
    { id: 'v|3', written: 'it is fun', origin: 'o3' },
  ] });
  const entries = await listEssays();
  assert.deepEqual(collectTodo([{ date: D, essays: entries }]).length, 3, '처음엔 📮 셋');
  const fixes = matchFixes(entries, [
    { date: D, origin: 'o1', written: 'she are my friend', fixed: 'She is my friend.' },
    { date: D, origin: 'o2', written: 'we play soccer', fixed: "We play soccer.", quiet: true },
    { date: D, origin: 'o3', written: 'it is fun', fixed: "It is fun.", quiet: true },
  ]);
  assert.equal(await applyEssayFixes(fixes), 3);
  const after = await listEssays();
  assert.deepEqual(after.map((e) => !!e.coachQuiet), [false, true, true]);
  assert.ok(after.every((e) => e.coachFix && e.fixedAt > 0));
  const days = await listDaily();
  assert.deepEqual(collectTodo(days), [], '📮 고쳐 줄 글에서 셋 다 빠진다');
  assert.equal(splitEssayDays(days, true)[0].essays.length, 3, '✅ 이미 고쳐 준 글엔 셋 다');
  // 셋이 밀려 있어도 확인만은 셈에 안 들어 한 문장 — 진짜 배울 거리 [1]
  const now = Date.now();
  assert.deepEqual(ids(coachPick(after, now)), ['v|1']);
  assert.deepEqual(after.map((e) => coachState(e, now)), ['queue', 'quiet', 'quiet']);
  const it = essayItems(days, now);
  assert.equal(it.length, 1);
  assert.ok(it[0].text.includes('진우: she are my friend'));
  assert.ok(feedbackMd({ days, writes: {}, asks: [], today: D, now }).includes('✍️ 영어 교정 1 (본 것 0 · 안 본 것 1 · 지나감 0)'));
  // 다시 받아도(앱을 켤 때마다) 붙은 글은 건드리지 않는다
  assert.deepEqual(matchFixes(after, [{ date: D, origin: 'o2', written: 'we play soccer', fixed: "We play soccer.", quiet: true }]), []);
});

test('🤫 applyEssayFixes — 같은 id 다른 날: 날짜 줄은 그 줄의 확인만 · 날짜 없는 줄은 그 줄의 뜻 (pick과 같은 줄)', async () => {
  await listDaily();
  fakeIdb.clear();
  fakeIdb.put('daily', { date: '2026-11-08', doneKeys: [], essays: [{ id: 'v|S', written: 'same frame A' }] });
  fakeIdb.put('daily', { date: '2026-11-09', doneKeys: [], essays: [{ id: 'v|S', written: 'same frame B' }] });
  assert.equal(await applyEssayFixes([
    { id: 'v|S', date: '2026-11-08', fixed: 'Same frame A.', quiet: true },
    { id: 'v|S', fixed: 'Same frame B.' },
  ]), 2);
  const [a, b] = await listEssays();
  assert.equal(a.coachQuiet, true, '11-08 = 날짜 줄(확인만)');
  assert.ok(!('coachQuiet' in b), '11-09 = 날짜 없는 줄(진우에게)');
  fakeIdb.clear();
  fakeIdb.put('daily', { date: '2026-11-08', doneKeys: [], essays: [{ id: 'v|S', written: 'same frame A' }] });
  fakeIdb.put('daily', { date: '2026-11-09', doneKeys: [], essays: [{ id: 'v|S', written: 'same frame B' }] });
  await applyEssayFixes([{ id: 'v|S', date: '2026-11-08', fixed: 'Same frame A.' }, { id: 'v|S', fixed: 'Same frame B.', quiet: true }]);
  const [c, d] = await listEssays();
  assert.ok(!('coachQuiet' in c) && d.coachQuiet === true, '반대로');
  fakeIdb.clear();
});

test('🤫 coachState·coachGone — 확인만은 오래돼도 지나감 아님 · 읽은 때가 있어도 확인만 · 차례 밖', () => {
  const q = { id: 'q', written: 'w', coachFix: 'W.', fixedAt: NOW - 30 * DAY, readAt: 0, coachQuiet: true };
  assert.equal(coachState(q, NOW), 'quiet');
  assert.equal(coachGone(q, NOW), false);
  assert.equal(coachState({ ...q, readAt: NOW - DAY }, NOW), 'quiet');
  assert.equal(coachState({ ...q, coachFix: '' }, NOW), '', '교정 없는 글');
  const fresh = (id, ago) => ({ id, written: `w ${id}`, coachFix: `W ${id}.`, fixedAt: NOW - ago * DAY, readAt: 0 });
  // 차례 둘 + 확인만 넷 → 셋으로 세지 않아 한 문장
  const list = [fresh('a', 2), fresh('b', 1), ...['q1', 'q2', 'q3', 'q4'].map((id) => ({ ...fresh(id, 0.5), coachQuiet: true }))];
  assert.deepEqual(ids(coachPick(list, NOW)), ['b']);
  assert.deepEqual(ids(coachPick(list.slice(2), NOW)), [], '확인만뿐이면 아무것도 안 뜬다');
  // 오래된 확인만은 📬에 「지나감」으로도 안 남는다
  assert.deepEqual(essayItems([{ date: '2026-11-01', essays: [q] }], NOW), []);
  assert.ok(COACH_KEEP_DAYS < 30);
});

test('🤫 백업 합치기 — 같은 교정이 한쪽만 확인만이면 확인만을 지킨다(어느 쪽이 나중이든·어느 순서든) · 다른 교정이면 고른 교정의 뜻 (🔍 Codex 214차 ①)', () => {
  const base = { id: 'v|1', written: 'we play soccer', coachFix: "We play soccer." };
  const quiet = { ...base, fixedAt: 100, readAt: 0, coachQuiet: true };
  const plain = { ...base, fixedAt: 200, readAt: 0 };
  for (const [a, b] of [[quiet, plain], [plain, quiet]]) {
    const m = mergeEssayCopies(a, b);
    assert.equal(m.coachQuiet, true, '구버전 사본이 나중에 붙였어도');
    assert.equal(coachState(m, NOW), 'quiet');
  }
  const qLate = { ...quiet, fixedAt: 300 };
  for (const [a, b] of [[qLate, plain], [plain, qLate]]) assert.equal(mergeEssayCopies(a, b).coachQuiet, true, '확인만이 나중이어도');
  assert.ok(!('coachQuiet' in mergeEssayCopies({ ...plain }, { ...plain, fixedAt: 150 })), '둘 다 일반이면 일반');
  // 다른 교정 — 나중 교정을 고르고 그 뜻을 따른다
  const other = { ...base, coachFix: "We played soccer.", fixedAt: 400, readAt: 0 };
  for (const [a, b] of [[quiet, other], [other, quiet]]) assert.ok(!('coachQuiet' in mergeEssayCopies(a, b)), '나중 교정이 일반이면 일반');
  const otherQ = { ...other, coachQuiet: true };
  for (const [a, b] of [[plain, otherQ], [otherQ, plain]]) assert.equal(mergeEssayCopies(a, b).coachQuiet, true, '나중 교정이 확인만이면 확인만');
  // 원본은 건드리지 않는다
  assert.ok(!('coachQuiet' in plain));
});

test('🤫 다시 쓴 글은 확인만 표시도 지운다 · 같은 글이면 남긴다', () => {
  const old = { id: 'v|1', written: 'a b', coachFix: 'A b.', fixedAt: 1, readAt: 0, coachQuiet: true };
  assert.ok(!('coachQuiet' in mergeEssayEntry(old, { id: 'v|1', written: 'c d' })));
  assert.equal(mergeEssayEntry(old, { id: 'v|1', written: 'a b' }).coachQuiet, true);
});

test('🔒 비공개 검사 — quiet는 true만 · 없으면 그대로 통과', () => {
  const dir = mkdtempSync(join(tmpdir(), 'q409-'));
  mkdirSync(join(dir, 'essay'));
  const put = (list) => writeFileSync(join(dir, 'essay/fixes.json'), JSON.stringify(list));
  put([{ date: '2026-11-09', written: 'w', fixed: 'W.' }, { date: '2026-11-09', written: 'x', fixed: 'X.', quiet: true }]);
  assert.deepEqual(checkPrivateDir(dir, () => '<svg>'), { errors: [], checked: ['essay/fixes.json'] });
  put([{ written: 'a', fixed: 'A.', quiet: 'true' }, { written: 'b', fixed: 'B.', quiet: false }, { written: 'c', fixed: 'C.', quiet: 1 }]);
  const e = checkPrivateDir(dir, () => '<svg>').errors;
  assert.equal(e.length, 3);
  assert.ok(e.every((x) => /quiet는 true만/.test(x)));
  put([{ written: 'a', fixed: '', quiet: 'x' }]);
  assert.equal(checkPrivateDir(dir, () => '<svg>').errors.length, 1, 'fixed가 없으면 그 오류 하나만');
});

test('🤫 📊·📬 글 · 판 v409 이상', () => {
  const st = read('js/stats.js');
  assert.ok(st.includes("const seenText = st === 'quiet' ? ' (🤫 확인만 — 진우 화면엔 안 띄움)'"), '📊 ✅ 고쳐 준 글에 확인만 표시');
  assert.ok(read('js/feedback.js').includes('v409부터 🤫 확인만(quiet) 줄은 진우 화면에 안 뜨고 여기에도 안 셈'));
  assert.ok(Number((/APP_VERSION = 'v(\d+)'/.exec(read('js/version.js')) || [])[1]) >= 409);
  assert.ok(Number((/CACHE_VERSION = 'v(\d+)'/.exec(read('sw.js')) || [])[1]) >= 409);
});
