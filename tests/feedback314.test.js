// v314 (2026-10-22 아버님 "2와 3번 진행하자" · "이대로 진행") — node --test tests/feedback314.test.js
//  ② 🏷️ 앱 판 번호 — 📤 usage/날짜.md 머리 · sw CACHE_VERSION과 같게(check.mjs)
//  ① 📈 국어 읽기 날마다 합계 — 읽은 기록 줄이 새로 생길 때 하루 기록에도 · 주간 흐름 국어 줄이 120편 일지에 묶이지 않게
//  ③ 📬 피드백이 닿았나 — 영어 교정을 🎤로 읽었나(readHow) · 국어 답장 읽은 시각(rdAt) · 📤 usage/feedback.md
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { APP_VERSION, versionNum, versionLine } from '../js/version.js';
import { usageFiles, gatherFiles } from '../js/upload.js';
import { PLACES } from '../js/usage.js';
import { korFinishRule, korDayDelta, dayKeyOf, dayNum, evSecOf, KOR_DAY_SUMS, KOR_DAY_LISTS } from '../js/korean.js';
import { weeklyModel, keyNum, numKey } from '../js/weekly.js';
import { getDaily, emptyDaily, mergeDailyDelta, mergeEssayEntry, mergeEssayCopies, fixEssayEntry, markEssayRead, READ_HOW } from '../js/db.js';
import { initProfile, korFinish } from '../js/xp.js';
import { writesOf, mergeWrites, writeReadRule, writeIdOf } from '../js/korwrite.js';
import { feedbackMd, essayItems, korItems, askItems, askSeen, FEEDBACK_DAYS, FEEDBACK_MAX } from '../js/feedback.js';
import { applyReply, markAskRead, decideAsk } from '../js/mathask.js';
import { mergeAsks } from '../js/db.js';
import { todayKey } from '../js/track.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const DAY = 86400000;

before(async () => {
  await getDaily('2000-01-01'); // 가짜 저장소 열기
  await initProfile();
});

// ───────────────────── ② 🏷️ 앱 판 ─────────────────────

test('🏷️ 앱 판 — APP_VERSION은 sw CACHE_VERSION과 같다 · check.mjs가 막는다 · 앱 셸에 version.js·feedback.js', () => {
  const sw = read('sw.js');
  assert.equal((/const CACHE_VERSION = '(v\d+)';/.exec(sw) || [])[1], APP_VERSION);
  assert.ok(sw.includes("'./js/version.js'") && sw.includes("'./js/feedback.js'"));
  const chk = read('tools/check.mjs');
  assert.ok(chk.includes("export const APP_VERSION = '(v\\d+)';") && chk.includes('앱 판이 다름'), 'check.mjs가 두 판을 견준다');
  assert.equal(versionNum('v314'), 314);
  assert.deepEqual([versionNum(''), versionNum('314'), versionNum('v3a'), versionNum(null)], [0, 0, 0, 0]);
});

test('🏷️ 판 줄 — 지금 도는 코드 · 받아 둔 새 판이 더 크면 함께 · 모르면 (모름)', () => {
  assert.equal(versionLine('v314', 'v314'), '앱 판 v314 (지금 도는 코드)');
  assert.equal(versionLine('v314', ''), '앱 판 v314 (지금 도는 코드)');
  assert.equal(versionLine('v314', 'v313'), '앱 판 v314 (지금 도는 코드)', '받아 둔 판이 작으면(옛 캐시) 안 적는다');
  assert.equal(versionLine('v314', 'v315'), '앱 판 v314 (지금 도는 코드) · 받아 둔 새 판 v315 — 앱을 닫았다 다시 열면 바뀌어요');
  assert.equal(versionLine('', 'v315'), '앱 판 (모름)');
});

test('🏷️ 📤 사용 기록 머리 — 판 줄을 주면 제목 바로 아래 · 안 주면 옛 꼴 그대로 · gatherFiles가 넘긴다 · 보내기는 try 밖에서 만든다(던지지 않게)', async () => {
  const today = '2026-10-22';
  const with1 = usageFiles([], today, PLACES, '앱 판 v314 (지금 도는 코드)')[0].text.split('\n');
  assert.equal(with1[1], '🏷️ 앱 판 v314 (지금 도는 코드)');
  assert.equal(with1[2], '');
  const old = usageFiles([], today, PLACES)[0].text.split('\n');
  assert.equal(old[1], '', '옛 부름은 옛 꼴');
  const base = { getMath: async () => null, listDaily: async () => [], mathReportText: () => '', asksText: () => '', collectTodo: () => [], usagePlaces: PLACES, today };
  const files = await gatherFiles({ ...base, verLine: '앱 판 v314 (지금 도는 코드)' });
  assert.match(files.find((f) => f.path === `usage/${today}.md`).text, /\n🏷️ 앱 판 v314/);
  const up = read('js/upload.js');
  const send = up.slice(up.indexOf('async function sendOnce'));
  const at = send.indexOf('const verLine = await cachedVersion().then((c) => versionLine(APP_VERSION, c)).catch(() => \'\');');
  assert.ok(at >= 0 && at < send.indexOf('try {'), '판 줄은 try 밖 — 못 알면 줄만 빠진다');
  // 판은 앱을 켤 때 묶는다 — upload.js가 version.js를 정적으로 (올릴 때 처음 불러오면 새로 들어온 판을 적었다, 🔍 Codex 120차 #6)
  assert.ok(up.includes("import { APP_VERSION, cachedVersion, versionLine } from './version.js';"));
  assert.ok(!up.includes("import('./version.js')"));
  assert.ok(read('js/app.js').includes("import { autoSend } from './upload.js';"), 'app.js가 켤 때 upload.js를 정적으로 부른다');
});

// ───────────────────── ① 📈 국어 읽기 날마다 합계 ─────────────────────

const rd = (o) => ({ c: 'K1', t: 1000, d: dayNum(new Date(2026, 9, 22, 20).getTime()), s: 30, a: 5, n: 4, f: 3, g: 1, y: 0, ...o });

test('📈 korDayDelta — 처음 읽기(★)·다시 읽기(★★·★★★)·별 없이(g 0) · 📍 근거가 있을 때만 근거 칸 · 날 열쇠는 이 기기 날짜', () => {
  const a = korDayDelta(rd({}));
  assert.equal(a.date, '2026-10-22');
  assert.deepEqual(a.delta, { korReads: 1, korKnow: 0, korNewF: 3, korNewN: 4 });
  assert.deepEqual(korDayDelta(rd({ g: 3, f: 2, y: 2 })).delta, { korReads: 1, korKnow: 2, korReF: 2, korReN: 4 });
  assert.deepEqual(korDayDelta(rd({ g: 2, f: 1 })).delta, { korReads: 1, korKnow: 0, korReF: 1, korReN: 4 }, '★★도 다시 읽기');
  assert.deepEqual(korDayDelta(rd({ g: 0 })).delta, { korReads: 1, korKnow: 0 }, '별 없이 다시 읽음은 읽은 글에만');
  assert.deepEqual(korDayDelta(rd({ v: 7, w: 2, k: 1 })).delta, { korReads: 1, korKnow: 0, korNewF: 3, korNewN: 4, korEvN: 1, korEvK: 1, korEvSecs: ['K1@1000:7'] });
  assert.equal(korDayDelta({ c: 'X', t: 1 }), null, '깨진 줄은 null');
  assert.equal(dayKeyOf(dayNum(new Date(2026, 0, 1, 23, 59).getTime())), '2026-01-01');
  assert.equal(dayKeyOf(dayNum(Date.now())), todayKey(), '하루 기록 열쇠(track.todayKey)와 같은 날');
  assert.equal(dayKeyOf(0), '');
  assert.deepEqual([evSecOf('K12@99:15'), evSecOf('K1@5:x'), evSecOf('')].map((x) => (Number.isNaN(x) ? 'NaN' : x)), [15, 'NaN', 'NaN']);
  for (const k of Object.keys(korDayDelta(rd({ g: 2, v: 1, k: 0 })).delta)) assert.ok([...KOR_DAY_SUMS, ...KOR_DAY_LISTS].includes(k), `${k}는 db 칸에 있다`);
});

test('📈 korFinishRule — 읽은 기록 줄이 새로 생길 때만 newRead · 같은 열쇠([다시 저장하기])는 없음 · 별이 없어도', () => {
  const now = new Date(2026, 9, 22, 20).getTime();
  const p = {};
  const opts = { read: { t: 5000, s: 40, a: 3, n: 3, f: 2 } };
  const r1 = korFinishRule(p, 'K1', now, {}, ['K1'], 0, opts);
  assert.ok(r1.ok && r1.star === 1 && r1.newRead && r1.newRead.c === 'K1' && r1.newRead.g === 1);
  const r2 = korFinishRule(p, 'K1', now, {}, ['K1'], 0, opts);
  assert.ok(r2.ok && !('newRead' in r2), '같은 읽기는 한 번');
  const r3 = korFinishRule(p, 'K1', now, {}, ['K1'], 0, { read: { t: 6000, s: 40, a: 3, n: 3, f: 3 } });
  assert.ok(r3.ok && r3.star === 0 && r3.newRead && r3.newRead.g === 0, '같은 날 다시 읽어 별이 없어도 새 줄이면');
  assert.ok(!('newRead' in korFinishRule(p, 'K1', now, {}, ['K1'], 0, {})), '읽은 기록이 없는 옛 부름');
});

test('📈 진짜 길(가짜 저장소) — xp.korFinish가 그날 하루 기록에 더한다 · 같은 읽기는 한 번 · 별·💰는 그대로', async () => {
  const date = todayKey();
  const before0 = (await getDaily(date)) || emptyDaily(date);
  const read1 = { t: 7001, s: 50, a: 4, n: 4, f: 3, v: 6, w: 1, k: 1 };
  const r = await korFinish('K7', {}, ['K7'], 0, { read: read1 });
  assert.ok(r.ok && r.star === 1);
  await korFinish('K7', {}, ['K7'], 0, { read: read1 }); // [다시 저장하기]
  const d = await getDaily(date);
  assert.equal(d.korReads - (before0.korReads || 0), 1);
  assert.equal(d.korNewF - (before0.korNewF || 0), 3);
  assert.equal(d.korNewN - (before0.korNewN || 0), 4);
  assert.equal(d.korEvK - (before0.korEvK || 0), 1);
  assert.ok(d.korEvSecs.includes('K7@7001:6'));
  assert.equal(d.korEvSecs.filter((x) => x === 'K7@7001:6').length, 1);
});

test('📈 하루 기록 병합 — 수는 더하고 근거 초 목록은 합집합 · 빈 하루 기록에 0', () => {
  const e = emptyDaily('2026-10-22');
  for (const k of KOR_DAY_SUMS) assert.equal(e[k], 0, k);
  const a = mergeDailyDelta(e, '2026-10-22', { korReads: 1, korEvSecs: ['K1@1:3'] });
  const b = mergeDailyDelta(a, '2026-10-22', { korReads: 1, korEvSecs: ['K1@1:3', 'K2@2:9'] });
  assert.equal(b.korReads, 2);
  assert.deepEqual(b.korEvSecs, ['K1@1:3', 'K2@2:9']);
});

test('📈 주간 흐름 — 날마다 합계가 그 주를 다 덮으면 그것으로(처음 센 날 다음 날부터 시작하는 주) · 아니면 일지로 · 근거 가운데값은 목록에서', () => {
  const TODAY = '2026-11-05';
  const T = keyNum(TODAY);
  const day = (k) => numKey(T - k);
  // 날마다 합계를 처음 센 날 = 2주 전의 마지막 날 → 그다음 날부터 시작하는 지난주·이번 주는 합계로, 2주 전은 일지로
  const weeks = weeklyModel({ daily: [] }, TODAY).weeks;
  const start = weeks[2].from - 1; // 지난주 첫날 바로 앞날에 처음 셈
  const k0 = T - start;
  const daily = [
    { date: day(k0), korReads: 2, korNewF: 1, korNewN: 4, korReF: 0, korReN: 0, korEvN: 1, korEvK: 0, korKnow: 1, korEvSecs: ['K1@1:50'] }, // 처음 센 날 — 그 주는 일지로
    { date: day(T - weeks[2].from), korReads: 3, korNewF: 2, korNewN: 4, korReF: 3, korReN: 4, korEvN: 2, korEvK: 1, korKnow: 0, korEvSecs: ['K2@2:4', 'K3@3:10'] },
    { date: day(0), korReads: 5, korNewF: 3, korNewN: 3, korReF: 6, korReN: 8, korEvN: 3, korEvK: 3, korKnow: 2, korEvSecs: ['K4@4:2', 'K5@5:6', 'K6@6:8'] },
  ];
  const m = weeklyModel({ daily, profile: { korReads: [] } }, TODAY);
  const vals = (label) => m.groups.find((g) => g.key === 'kor').rows.find((r) => r.label === label).values;
  assert.deepEqual(vals('읽은 글').slice(2), [3, 5]);
  assert.deepEqual(vals('처음 읽을 때 첫 번에 맞힘').slice(2), [0.5, 1]);
  assert.deepEqual(vals('다시 읽을 때 첫 번에 맞힘(★★·★★★)').slice(2), [0.75, 0.75]);
  assert.deepEqual(vals('📍 근거 찾는 데 걸린 시간(가운데값)').slice(2), [7, 6]);
  assert.deepEqual(vals('📍 근거 찾은 뒤 첫 번에 맞힘').slice(2), [0.5, 1]);
  assert.deepEqual(vals('🧠 아는 것으로 답하기').slice(2), [0, 2]);
  // 처음 센 날이 든 주(2주 전)는 일지로 — 일지가 비었고 안 잘렸으니 0편 · 비율은 —
  assert.equal(vals('읽은 글')[1], 0);
  assert.equal(vals('처음 읽을 때 첫 번에 맞힘')[1], null);
  assert.match(m.groups.find((g) => g.key === 'kor').note, /날마다 합계는 \d+\/\d+부터 세요/);
  // 처음 센 날이 지난주 첫날이면 지난주는 일지로(그날 앞부분이 빠졌을 수 있다)
  const late = weeklyModel({ daily: daily.map((d, i) => (i === 0 ? { ...d, korReads: 0 } : d)), profile: { korReads: [] } }, TODAY);
  const lv = late.groups.find((g) => g.key === 'kor').rows.find((r) => r.label === '처음 읽을 때 첫 번에 맞힘').values;
  assert.deepEqual(lv.slice(2), [null, 1], '처음 센 날이 든 주는 합계로 안 센다');
});

// ───────────────────── ③ 📬 피드백 ─────────────────────

test('📬 영어 교정 읽은 꼴 — 다시 쓴 글이면 지움 · 같은 교정 두 사본은 더 해 본 쪽 · 새 교정이면 지움', () => {
  assert.deepEqual(READ_HOW, ['skip', 'try', 'pass']);
  const old = { id: 'e1', written: 'I like cat', coachFix: 'I like cats.', fixedAt: 5, readAt: 9, readHow: 'pass' };
  assert.equal(mergeEssayEntry(old, { id: 'e1', written: 'I like dog' }).readHow, undefined, '글이 바뀌면 앞 교정을 읽은 꼴도 지운다');
  assert.equal(mergeEssayEntry(old, { id: 'e1', written: 'I like cat' }).readHow, 'pass');
  const a = { written: 'x', coachFix: 'X.', fixedAt: 5, readAt: 10, readHow: 'skip' };
  const b = { written: 'x', coachFix: 'X.', fixedAt: 5, readAt: 8, readHow: 'pass' };
  assert.deepEqual([mergeEssayCopies(a, b).readHow, mergeEssayCopies(b, a).readHow], ['pass', 'pass'], '차례와 상관없이');
  assert.deepEqual([mergeEssayCopies(a, b).readAt, mergeEssayCopies(b, a).readAt], [8, 8], '처음 본 때 (🔍 Codex 120차 — 전엔 큰 쪽)');
  assert.equal(mergeEssayCopies({ ...a, readAt: 0 }, b).readAt, 8, '한쪽만 봤으면 그 때');
  const none = mergeEssayCopies({ written: 'x', coachFix: 'X.', fixedAt: 5 }, { written: 'x', coachFix: 'X.', fixedAt: 5, readHow: 'weird' });
  assert.ok(!('readHow' in none), '모르는 값은 칸을 안 만든다');
  const e = { written: 'x', coachFix: 'X.', fixedAt: 5, readAt: 9, readHow: 'try' };
  assert.ok(fixEssayEntry(e, 'X!', 20));
  assert.deepEqual([e.readAt, 'readHow' in e], [0, false]);
});

test('📬 영어 교정 — 진짜 길: markEssayRead가 시각과 읽은 꼴을 · 모르는 꼴은 시각만 · 화면은 🎤 결과를 넘긴다', async () => {
  const date = '2026-10-20';
  fakeIdb.put('daily', { ...emptyDaily(date), essays: [{ id: 'v|1', written: 'a b', coachFix: 'A b.', fixedAt: 1 }, { id: 'v|2', written: 'c d', coachFix: 'C d.', fixedAt: 1 }] });
  assert.ok(await markEssayRead('v|1', date, 'try'));
  assert.ok(await markEssayRead('v|2', date, 'nope'));
  let d = await getDaily(date);
  assert.equal(d.essays[0].readHow, 'try');
  const first = d.essays[0].readAt;
  assert.ok(first > 0);
  assert.ok(d.essays[1].readAt > 0 && !('readHow' in d.essays[1]));
  // 두 창이 함께 띄웠다 — 나중에 넘긴 창의 skip이 앞 창의 try를 덮지 않고, 본 때는 처음 그대로 (🔍 Codex 120차 B)
  await new Promise((r) => setTimeout(r, 5));
  assert.ok(await markEssayRead('v|1', date, 'skip'));
  d = await getDaily(date);
  assert.deepEqual([d.essays[0].readHow, d.essays[0].readAt], ['try', first]);
  assert.ok(await markEssayRead('v|1', date, 'pass'));
  assert.equal((await getDaily(date)).essays[0].readHow, 'pass', '더 해 본 쪽은 올라간다');
  const es = read('js/essay.js');
  assert.ok(es.includes("it.said = ok || it.said === 'pass' ? 'pass' : 'try';"), '🎤 결과 — 한 번이라도 통과면 통과 (v318부터 내 에세이도)');
  // 🎤를 누른 순간 try — 듣는 중에 "다음 문장"을 눌러도 skip이 아니다 (🔍 Codex 120차 #5)
  const sp = es.slice(es.indexOf('function startSpeaking()'), es.indexOf('ui.o.speak(it.result.fixed'));
  assert.ok(sp.includes("if (!it.said) it.said = 'try';"), '🎤를 부르기 전에 try (v318부터 내 에세이도)');
  assert.ok(read('js/player.js').includes("markEssayRead(it.id, it.date, it.said || 'skip')"), '🎤를 안 누르고 넘기면 skip');
});

test('📬 국어 답장 읽은 시각 — writeReadRule이 rdAt · 안 읽은 글엔 칸 없음 · 두 사본은 이른 시각 · 옛 글 꼴 그대로', () => {
  const at = 1000;
  const id = writeIdOf(at, '왜냐하면 미안해서요.');
  const raw = { K15: { last: at, list: [{ id, at, day: 2, v: 1, text: '왜냐하면 미안해서요.', grade: 'near', reply: '잘했어', rAt: 2000, read: false }], paid: {} } };
  const shape = writesOf(raw).K15.list[0];
  assert.ok(!('rdAt' in shape), '안 읽었으면 칸이 없다');
  const p = { korWrites: raw };
  assert.ok(writeReadRule(p, 'K15', id, 5000).ok);
  assert.equal(p.korWrites.K15.list[0].rdAt, 5000);
  const q = { korWrites: raw };
  writeReadRule(q, 'K15', id, 3000);
  const m = mergeWrites(p.korWrites, q.korWrites).K15.list[0];
  assert.deepEqual([m.read, m.rdAt], [true, 3000], '이른 쪽');
  const oldRead = writesOf({ K15: { ...raw.K15, list: [{ ...raw.K15.list[0], read: true }] } }).K15.list[0];
  assert.ok(oldRead.read && !('rdAt' in oldRead), 'v314 전에 읽은 글 — 때를 모름(칸 없음)');
  const m2 = mergeWrites({ K15: { ...raw.K15, list: [{ ...raw.K15.list[0], read: true }] } }, p.korWrites).K15.list[0];
  assert.equal(m2.rdAt, 5000, '한쪽만 때를 알면 그 때');
  assert.ok(read('js/xp.js').includes('writeReadRule(p, cardId, id, Date.now())'));
});

const NOW = new Date(2026, 9, 22, 21, 0).getTime();

test('📬 feedback.md — 영어: 14일 안에 붙은 것 + 안 본 것은 늘 · 🎤 꼴 · v314 전 읽음은 "봄"', () => {
  const days = [
    { date: '2026-10-01', essays: [{ id: 'a', written: 'old unread', coachFix: 'Old unread.', fixedAt: NOW - 20 * DAY }] },
    { date: '2026-10-02', essays: [{ id: 'b', written: 'old read', coachFix: 'Old read.', fixedAt: NOW - 20 * DAY, readAt: NOW - 19 * DAY, readHow: 'pass' }] },
    { date: '2026-10-20', essays: [
      { id: 'c', written: 'I eat ckicken', coachFix: 'I eat chicken.', fixedAt: NOW - 2 * DAY, readAt: NOW - DAY, readHow: 'pass' },
      { id: 'd', written: 'no fix yet' },
      { id: 'e', written: 'seen before v314', coachFix: 'Seen.', fixedAt: NOW - 3 * DAY, readAt: NOW - 2 * DAY },
      { id: 'f', written: 'skipped', coachFix: 'Skipped.', fixedAt: NOW - 3 * DAY, readAt: NOW - 2 * DAY, readHow: 'skip' },
    ] },
  ];
  const it = essayItems(days, NOW);
  assert.equal(it.length, 4, '안 본 옛것 1 + 14일 안 3 · 14일 넘은 읽은 것·교정 없는 글은 빠짐');
  assert.ok(it[0].text.includes('아직 안 봄 — 영어 영상을 열면 맨 먼저 떠요') && !it[0].seen);
  const all = it.map((x) => x.text).join('\n');
  assert.ok(all.includes('🎤 따라 읽어 통과') && all.includes('🎤 결과 없이 넘김') && all.includes('봄 (🎤로 읽었는지는 v314부터 적어요)'));
  assert.ok(all.includes('  진우: I eat ckicken') && all.includes('  아빠: I eat chicken.'));
  assert.ok(!all.includes('Old read.'));
  assert.equal(FEEDBACK_DAYS, 14);
});

test('📬 feedback.md — 국어: 붙은 때·본 때·그 뒤 다시 쓴 글의 등급 · ✅는 끝 · 논술 이름', () => {
  const writes = {
    K15: { list: [
      { at: NOW - 5 * DAY, grade: 'again', rAt: NOW - 4 * DAY, read: true, rdAt: NOW - 3 * DAY },
      { at: NOW - 2 * DAY, grade: 'near', rAt: NOW - DAY, read: false },
    ] },
    N2: { list: [{ at: NOW - 3 * DAY, grade: 'ok', rAt: NOW - 2 * DAY, read: true }] },
    K19: { list: [{ at: NOW - 30 * DAY, grade: 'near', rAt: NOW - 29 * DAY, read: true, rdAt: NOW - 28 * DAY }, { at: NOW - DAY, grade: '' }] },
  };
  const it = korItems(writes, NOW).map((x) => x.text);
  assert.equal(it.length, 3, '14일 넘게 지난 읽은 답장(K19)은 빠짐');
  assert.ok(it.some((t) => t.startsWith('- K15 🔁') && t.includes('그 뒤 다시 씀') && t.includes('(답장을 본 뒤)') && t.endsWith('→ 🔸')));
  // 답장을 보기 전에 다시 쓴 글 · 본 때를 모르는 옛 읽음은 표시 없음 (🔍 Codex 120차 작은 것)
  const before = korItems({ K1: { list: [{ at: NOW - 5 * DAY, grade: 'near', rAt: NOW - 4 * DAY, read: true, rdAt: NOW - DAY }, { at: NOW - 2 * DAY, grade: '' }] } }, NOW).map((x) => x.text);
  assert.ok(before[0].includes('(답장을 보기 전) → 답장 기다림'));
  const unknown = korItems({ K1: { list: [{ at: NOW - 5 * DAY, grade: 'near', rAt: NOW - 4 * DAY, read: true }, { at: NOW - 2 * DAY, grade: '' }] } }, NOW).map((x) => x.text);
  assert.ok(!unknown[0].includes('(답장을'));
  assert.ok(it.some((t) => t.startsWith('- K15 🔸') && t.includes('— 아직 안 봄 (국어를 열면 📬로 떠요)')));
  assert.ok(it.some((t) => t.startsWith('- N2 🖊️ 논술 ✅') && t.includes('읽음 (때는 v314부터 적어요)') && t.endsWith('✅ 끝')));
});

test('📬 feedback.md — 수학: 답장이 붙은 질문만 · 상태 · 같은 틀 문제 · 개념 이름 · 이름을 못 찾아도 그대로', () => {
  const asks = [
    { no: 3, concept: 'frac.div', status: 'asked', replies: [] },
    { no: 4, concept: 'frac.div', status: 'answered', replies: [{ t: NOW - DAY, text: '…' }] },
    { no: 5, concept: 'mix.frac', status: 'fixed', replies: [{ t: NOW - 3 * DAY, text: '…' }, { t: NOW - 2 * DAY, text: '…' }], readAt: NOW - 2 * DAY + 5, tries: 2 },
    { no: 6, concept: 'x', status: 'answered', replies: [{ t: NOW - DAY, text: '…' }], readAt: NOW - 10 },
  ];
  const it = askItems(asks, NOW, (id) => ({ 'frac.div': '분수 ÷ 분수' })[id]).map((x) => x.text);
  assert.equal(it.length, 3);
  assert.ok(it.some((t) => t.startsWith('- ❓4 분수 ÷ 분수') && t.includes('아직 안 봄 (수학 화면을 열면 떠요)')));
  assert.ok(it.some((t) => t.startsWith('- ❓5 mix.frac') && t.includes('(2번째)') && t.includes('같은 틀 문제 맞힘 ✅') && t.includes('본 때 읽음 (때는 v314부터 적어요)') && t.endsWith('확인 문제 모두 2번 풀어 봄')));
  assert.ok(it.some((t) => t.startsWith('- ❓6') && t.includes('읽음 — 😄/🤔 아직 안 고름')));
  assert.equal(askItems(asks, NOW, () => { throw new Error('x'); }).length, 3, '이름 함수가 던져도');
});

test('📬 feedback.md 전체 — 요약 줄 · 세 갈래 · 빈 갈래는 (없음) · gatherFiles가 usage/feedback.md로 · 못 만들면 그 파일만 빠짐 · 보내기가 넘긴다', async () => {
  const md = feedbackMd({ days: [], writes: {}, asks: [], today: '2026-10-22', now: NOW });
  assert.ok(md.startsWith('# 📬 피드백이 닿았나 (2026-10-22 · 이 기기 기준)'));
  assert.ok(md.includes('요약: ✍️ 영어 교정 0 · 📚 국어 답장 0 · 🔢 수학 답장 0'));
  assert.equal((md.match(/\(없음\)/g) || []).length, 4, '세 갈래 + v318 ✍️ 내 에세이');
  const md2 = feedbackMd({ days: [{ date: '2026-10-20', essays: [{ id: 'c', written: 'w', coachFix: 'W.', fixedAt: NOW - DAY }] }], writes: {}, asks: [], today: '2026-10-22', now: NOW });
  assert.ok(md2.includes('✍️ 영어 교정 1 (본 것 0 · 안 본 것 1)'));
  const base = { getMath: async () => ({ asks: [] }), listDaily: async () => [], mathReportText: () => '', asksText: () => '', collectTodo: () => [], today: '2026-10-22' };
  const files = await gatherFiles({ ...base, getFeedback: async (today, days, math) => feedbackMd({ days, writes: {}, asks: math.asks, today, now: NOW }) });
  assert.ok(files.find((f) => f.path === 'usage/feedback.md').text.startsWith('# 📬'));
  const bad = await gatherFiles({ ...base, getFeedback: async () => { throw new Error('x'); } });
  assert.ok(!bad.some((f) => f.path === 'usage/feedback.md') && bad.some((f) => f.path === 'math/latest.json'));
  const up = read('js/upload.js');
  assert.ok(up.includes('getFeedback: feedbackNow,') && up.includes("kw.writesOf(p && p.korWrites)"));
});

test('📬 수학 두 번째 답장 — 진짜 규칙으로: 답장 A 읽음 → 🤔 → 답장 B는 안 본 것 · 다시 열면 본 것(본 때) · 이미 본 답장이면 기록이 안 바뀜 · 😄도 본 것 (🔍 Codex 120차 #1)', () => {
  const m = { asks: [{ id: 'a1', no: 7, t: 1, u: 1, concept: 'frac.div', status: 'asked', replies: [], again: [] }] };
  assert.ok(applyReply(m, 7, '첫 답장'));
  markAskRead(m, 'a1');
  const ask = m.asks[0];
  const firstRead = ask.readAt;
  assert.ok(ask.seenT === ask.replies[0].t && ask.seenAt > 0);
  assert.equal(decideAsk(m, 'a1', false, '모르겠어요'), true);
  assert.ok(applyReply(m, 7, '둘째 답장'));
  const lastT = ask.replies[1].t;
  assert.deepEqual(askSeen(ask, lastT), { seen: false, at: 0 }, 'readAt이 있어도 둘째 답장은 안 본 것');
  assert.ok(askItems(m.asks, NOW)[0].text.includes('— 아직 안 봄 (수학 화면을 열면 떠요) · 아직 안 읽음'));
  markAskRead(m, 'a1');
  assert.equal(ask.readAt, firstRead, 'readAt은 처음 연 때 그대로');
  assert.equal(ask.seenT, lastT);
  assert.deepEqual(askSeen(ask, lastT), { seen: true, at: ask.seenAt });
  const u = ask.u;
  markAskRead(m, 'a1');
  assert.equal(ask.u, u, '이미 본 답장을 다시 열어도 기록이 안 바뀐다(다시 올리지 않게)');
  assert.ok(askItems(m.asks, NOW)[0].text.includes('읽음 — 😄/🤔 아직 안 고름'));
  const m2 = { asks: [{ id: 'b', no: 8, t: 1, u: 1, concept: 'x', status: 'asked', replies: [], again: [] }] };
  applyReply(m2, 8, 'A');
  decideAsk(m2, 'b', true);
  assert.equal(m2.asks[0].seenT, m2.asks[0].replies[0].t, '😄를 골랐으면 그 답장을 본 것');
  // v314 전 기록 — 답장이 여럿이고 seenT가 없으면 상태로만(😄·🤔·문제를 풀었으면 본 것)
  assert.deepEqual(askSeen({ status: 'answered', readAt: 5, replies: [{ t: 3 }, { t: 9 }] }, 9), { seen: false, at: 0 });
  assert.deepEqual(askSeen({ status: 'again', readAt: 5, replies: [{ t: 3 }, { t: 9 }] }, 9), { seen: true, at: 0 });
  assert.deepEqual(askSeen({ status: 'closed', replies: [{ t: 3 }] }, 3), { seen: false, at: 0 }, '아빠가 닫은 것은 본 기록으로만');
});

test('📬 수학 병합 — 더 나중 답장을 본 쪽 · 같은 답장이면 먼저 본 때 · 차례와 상관없이 · 없으면 칸 없음', () => {
  const base = { id: 'a1', no: 7, t: 1, u: 10, status: 'answered', replies: [{ t: 5, text: 'x' }, { t: 9, text: 'y' }], again: [], readAt: 6, seenT: 5, seenAt: 6 };
  const A = { asks: [base], askSeq: 7 };
  const B = { asks: [{ ...base, u: 12, seenT: 9, seenAt: 13 }], askSeq: 7 };
  const r1 = mergeAsks(A, B).asks[0];
  const r2 = mergeAsks(B, A).asks[0];
  assert.deepEqual([r1.seenT, r1.seenAt, r2.seenT, r2.seenAt], [9, 13, 9, 13]);
  const C = { asks: [{ ...base, u: 8, seenT: 9, seenAt: 11 }] };
  assert.deepEqual([mergeAsks(B, C).asks[0].seenAt, mergeAsks(C, B).asks[0].seenAt], [11, 11]);
  const none = mergeAsks({ asks: [{ id: 'z', t: 1, u: 1, replies: [], again: [] }] }, { asks: [{ id: 'z', t: 1, u: 2, replies: [], again: [] }] }).asks[0];
  assert.ok(!('seenT' in none) && !('seenAt' in none));
});

test('📬 다른 문제로 확인(sameKey 0)은 같은 틀로 적지 않는다 · 풀어 본 수는 모두 통틀어 (🔍 Codex 120차 #4)', () => {
  const t = askItems([{ no: 9, concept: 'c', status: 'fixed', sameKey: 0, replies: [{ t: NOW - DAY }], readAt: NOW - DAY + 1, tries: 1 }], NOW)[0].text;
  assert.ok(t.includes('😄 알았어요 → 다른 문제로 확인 ✅ (원래 틀은 이제 없어요)') && !t.includes('같은 틀 문제 맞힘'));
  assert.ok(t.endsWith('확인 문제 모두 1번 풀어 봄'));
  assert.ok(askItems([{ no: 9, concept: 'c', status: 'fixed', sameKey: 1, replies: [{ t: NOW - DAY }], readAt: NOW - DAY + 1 }], NOW)[0].text.includes('같은 틀 문제 맞힘 ✅'));
});

test('📬 안 본 것은 몇 개든 남고 본 것만 최근 FEEDBACK_MAX개 · 요약이 맞다 (🔍 Codex 120차 #2)', () => {
  const days = [
    { date: '2026-09-01', essays: [{ id: 'old', written: 'old one', coachFix: 'Old one.', fixedAt: NOW - 40 * DAY }] },
    { date: '2026-10-21', essays: Array.from({ length: FEEDBACK_MAX + 5 }, (_, i) => ({ id: `s${i}`, written: `w${i}`, coachFix: `W${i}.`, fixedAt: NOW - DAY + i, readAt: NOW - DAY + i + 1, readHow: 'pass' })) },
  ];
  const it = essayItems(days, NOW);
  assert.equal(it.length, FEEDBACK_MAX + 1);
  assert.ok(!it[0].seen && it[0].text.includes('진우: old one'));
  assert.equal(it.filter((x) => x.seen).length, FEEDBACK_MAX);
  assert.ok(!it.some((x) => x.text.includes('진우: w4\n')) && it.some((x) => x.text.includes('진우: w5\n')), '본 것은 최근 것');
  assert.ok(feedbackMd({ days, writes: {}, asks: [], today: '2026-10-22', now: NOW }).includes(`✍️ 영어 교정 ${FEEDBACK_MAX + 1} (본 것 ${FEEDBACK_MAX} · 안 본 것 1)`));
  const many = Array.from({ length: FEEDBACK_MAX + 3 }, (_, i) => ({ no: i + 1, concept: 'c', status: 'answered', replies: [{ t: NOW - 50 * DAY + i }, { t: NOW - 49 * DAY + i }] }));
  assert.equal(askItems(many, NOW).length, FEEDBACK_MAX + 3, '안 본 수학 답장도 모두');
});
