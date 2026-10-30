// 🕒 앱 사용 기록 + ⏱ 수학 문항별 걸린 초 (v272, 2026-10-16 아버님 "그 기본안으로 가자") — AI 선생님 2단계 "모자란 기록 보태기"
//   ① 📤에 수학·영어 하루 시간(⏳ 과목 시간)까지 · ② 앱을 연 수·쓴 때(10분 칸)·화면마다 머문 초(홈·🎒·🏡·⚔️… 포함)
//   ③ 수학 문항마다 문제를 보고 답할 때까지 걸린 초(s) — 일지(log)·푸는 중 편(lives)에. 아이 화면에는 아무것도 안 보인다
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PLACES, OVERLAYS, placeOfView, placeNow, slotOf, usageDelta, IDLE_SEC, FLUSH_SEC } from '../js/usage.js';
import { usageFiles, slotRanges, fmtMin, gatherFiles } from '../js/upload.js';
import { emptyDaily, mergeDailyDelta, mergeStatRecord, getDaily, emptyMath } from '../js/db.js';
import { answerSecOf, Q_SEC_MAX, applyRound, applyQuit, applyMixRound, applySpecialRound, applyPlacement, applyNotesRound, setLive, settleLives } from '../js/mathprog.js';
import { applyAskTry } from '../js/mathask.js';

void fakeIdb;
const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const body = (src, head) => src.slice(src.indexOf(head), src.indexOf('\n}\n', src.indexOf(head)));
const FIELDS = PLACES.map((p) => p.field);

test('🕒 자리: 화면 이름 → 자리(영어는 목록·플레이어 둘 다) · 겹친 창은 잠금 > 배틀 > 잡기 > 집 > 상점 차례 · 모르는 화면은 안 셈', () => {
  assert.equal(placeOfView('library'), 'english');
  assert.equal(placeOfView('player'), 'english');
  for (const v of ['home', 'math', 'korean', 'stats', 'pokedex']) assert.equal(placeOfView(v), v);
  assert.equal(placeOfView('nope'), null);
  assert.equal(placeOfView(null), null);
  const on = (...ids) => (id) => ids.includes(id);
  assert.equal(placeNow('math', on()), 'math');
  assert.equal(placeNow('home', on('house')), 'house');
  assert.equal(placeNow('pokedex', on('market')), 'shop');
  assert.equal(placeNow('math', on('catch', 'house')), 'catch', '잡기가 집보다 앞');
  assert.equal(placeNow('math', on('rocket', 'catch')), 'battle', '로켓단도 배틀');
  assert.equal(placeNow('korean', on('timeup', 'battle', 'catch', 'house', 'shop')), 'lock', '잠금이 가장 앞');
  assert.equal(placeNow(null, on()), null, '화면이 없으면 안 셈');
  // 자리마다 daily 필드가 하나씩, 겹치지 않게 · 겹친 창의 자리는 모두 PLACES에 있다
  assert.equal(new Set(FIELDS).size, PLACES.length);
  for (const o of OVERLAYS) assert.ok(PLACES.some((p) => p.key === o.place), o.place);
  // 겹친 창 id가 index.html에 실제로 있다 (로켓단은 rocketview.js가 만든다)
  const html = read('index.html');
  // 🚀 로켓단·🎒 대여행(v341)·🎣 낚시터(v366) 창은 JS가 만든다(rocketview·journeyview·fishview build) — 나머지는 index.html에
  for (const id of OVERLAYS.flatMap((o) => o.ids).filter((id) => id !== 'rocket' && id !== 'jr-trip' && id !== 'lk-lake' && id !== 'lk-dex' && id !== 'lk-gear')) assert.match(html, new RegExp(`<div id="${id}" class="`), id);
  assert.match(read('js/journeyview.js'), /root\.id = 'jr-trip';/, '🎒 대여행 창 id');
  assert.match(read('js/fishview.js'), /root\.id = 'lk-lake';/, '🎣 낚시터 창 id');
  assert.match(read('js/fishview.js'), /shopRoot\.id = 'lk-gear';/, '🎒 채비 가게 창 id (v368)');
  assert.match(read('js/rocketview.js'), /root\.id = 'rocket';/);
});

test('🕒 10분 칸·증분: slotOf는 지역 시각 "HH:M" · usageDelta는 0·모르는 자리·이상한 칸을 버리고 칸은 한 번만 · 비었으면 null', () => {
  assert.equal(slotOf(new Date(2026, 9, 16, 21, 37, 5).getTime()), '21:3');
  assert.equal(slotOf(new Date(2026, 9, 16, 7, 0, 0).getTime()), '07:0');
  assert.equal(slotOf(new Date(2026, 9, 16, 23, 59, 59).getTime()), '23:5');
  assert.deepEqual(usageDelta({ math: 12, house: 3.9, nope: 5, home: 0, lock: -2 }, ['21:3', '21:3', '7:3', '21:30', '08:1']),
    { uMath: 12, uHouse: 3, useSlots: ['21:3', '08:1'] });
  assert.equal(usageDelta({}, []), null);
  assert.equal(usageDelta({ math: 0 }, ['bad']), null);
});

test('🕒 저장 자리: 새 칸은 하루 기록의 수(더하기·백업 병합은 큰 쪽)와 목록(합집합) — 옛 백업으로 줄지 않고 두 창의 같은 칸은 한 번', () => {
  const e = emptyDaily('2026-10-17');
  for (const f of ['appOpens', ...FIELDS]) assert.equal(e[f], 0, `${f}이 emptyDaily에 없다 = DAILY_SUMS에 안 넣었다`);
  const a = mergeDailyDelta(e, '2026-10-17', { uMath: 30, appOpens: 1, useSlots: ['21:3'] });
  const b = mergeDailyDelta(a, '2026-10-17', { uMath: 15, uDex: 4, useSlots: ['21:3', '21:4'] });
  assert.equal(b.uMath, 45);
  assert.equal(b.uDex, 4);
  assert.deepEqual(b.useSlots, ['21:3', '21:4']);
  const oldBackup = { ...e, uMath: 10, appOpens: 3, useSlots: ['07:4'] };
  const m = mergeStatRecord('daily', b, oldBackup);
  assert.equal(m.uMath, 45, '옛 백업이 머문 초를 줄이지 못한다');
  assert.equal(m.appOpens, 3, '큰 쪽');
  assert.deepEqual([...m.useSlots].sort(), ['07:4', '21:3', '21:4']);
});

test('🕒 시계(진짜 저장 길 · 가짜 시계): 보이고 2분 안에 손댔을 때만 · 겹친 창은 그 자리로 · 15초마다 저장 · 숨김·쉼은 안 셈 · 자정을 넘기면 어제 몫은 어제에 · 연 수 +1', async () => {
  const overlay = new Set();
  const listeners = {};
  globalThis.document = {
    hidden: false,
    addEventListener: (ev, fn) => { (listeners[ev] ||= []).push(fn); },
    getElementById: (id) => (overlay.has(id) ? { hidden: false } : (id === 'house' ? { hidden: true } : null)),
  };
  globalThis.window = { addEventListener: (ev, fn) => { (listeners[`w:${ev}`] ||= []).push(fn); }, dispatchEvent: () => true };
  const T0 = new Date(2026, 9, 17, 23, 58, 30).getTime(); // 15 + 10 + 30초 뒤 23:59:25 → 60초 더 가면 자정을 넘긴다
  mock.timers.enable({ apis: ['setInterval', 'Date'], now: T0 });
  try {
    const u = await import('../js/usage.js');
    fakeIdb.failNext('daily'); // 연 수의 첫 저장이 실패해도 들고 있다가 다음 저장에 (🔍 Codex 81차 #4)
    u.initUsage();
    u.initUsage(); // 두 번 불러도 시계는 하나 · 연 수도 한 번
    const touch = () => listeners.pointerdown.forEach((fn) => fn());
    const run = (sec) => { for (let i = 0; i < sec; i++) mock.timers.tick(1000); }; // 1초씩 — 한 번에 넘기면 가짜 시계가 끝 시각으로 먼저 간다
    u.setUsageView('math');
    run(10);
    overlay.add('house');
    run(5); // 15초째 저장
    await u.flushUsage();
    assert.equal(fakeIdb.failsLeft(), 0, '첫 저장(연 수)이 실패했다');
    let d = await getDaily('2026-10-17');
    assert.equal(d.appOpens, 1, '연 수는 한 번 — 첫 저장이 실패해도 다음 저장에');
    assert.equal(d.uMath, 10);
    assert.equal(d.uHouse, 5, '🏡 집이 떠 있는 동안은 집');
    assert.deepEqual(d.useSlots, ['23:5']);
    overlay.clear();
    // 숨긴 동안은 안 센다 (숨길 때 모은 것은 저장)
    document.hidden = true;
    listeners.visibilitychange.forEach((fn) => fn());
    run(10);
    document.hidden = false;
    listeners.visibilitychange.forEach((fn) => fn()); // 돌아오면 바로 센다
    // 2분 넘게 손을 안 대면 멈춘다 — 손댄 뒤 IDLE_SEC초까지만
    touch();
    run(30); // 23:58:55 ~ 23:59:25
    assert.equal(FLUSH_SEC, 15);
    await u.flushUsage();
    d = await getDaily('2026-10-17');
    assert.equal(d.uMath, 40, '숨긴 10초는 빠지고 손댄 뒤 30초');
    // 자정을 넘긴다: 23:59:25 → 00:00:25 (손댄 지 60초 안)
    touch();
    run(60);
    await u.flushUsage();
    d = await getDaily('2026-10-17');
    const d2 = await getDaily('2026-10-18');
    // 1초씩 넘기는 동안 저장은 끝나지 않은 채(저장 중)로 자정을 넘긴다 — 그래도 한 초도 안 빠지고 제 날짜에 (🔍 Codex 81차 #1)
    assert.equal(d.uMath, 74, `어제 몫(23:59:26~23:59:59 = 34초)은 어제에 (${d.uMath})`);
    assert.equal(d2 && d2.uMath, 26, `오늘 몫(00:00:00~00:00:25 = 26초)은 오늘에 (${d2 && d2.uMath})`);
    assert.ok(d2.useSlots.includes('00:0'));
    // 쉼: 마지막 손댐 뒤 IDLE_SEC를 넘기면 더 안 센다
    const before = d2.uMath;
    run((IDLE_SEC + 60));
    await u.flushUsage();
    const d3 = await getDaily('2026-10-18');
    assert.ok(d3.uMath - before <= IDLE_SEC, `쉬면 멈춘다 (+${d3.uMath - before})`);
    // 저장이 실패하면 모은 초를 버리지 않고 다음 저장에 다시 넣는다
    touch();
    run(5);
    fakeIdb.failNext('daily');
    await u.flushUsage();
    assert.equal(fakeIdb.failsLeft(), 0, '실패를 이 저장에 썼다');
    assert.equal((await getDaily('2026-10-18')).uMath, d3.uMath, '실패한 저장은 아무것도 안 남긴다');
    await u.flushUsage();
    assert.equal((await getDaily('2026-10-18')).uMath, d3.uMath + 5, '다음 저장에 다시');
    // 자정에 어제 몫 저장이 실패해도 어제 날짜로 다시 (오늘에 더하지 않게) — 10-18 23:59:45부터 20초
    const before18 = (await getDaily('2026-10-18')).uMath;
    mock.timers.setTime(new Date(2026, 9, 18, 23, 59, 44).getTime());
    run(1); // 시계를 앞당기면 밀린 1초 타이머가 한꺼번에 돈다 — 손대기 전이라(쉼) 하나도 안 센다
    touch();
    run(10); // 23:59:46 ~ 23:59:55
    fakeIdb.failNext('daily');
    run(10); // 23:59:56 ~ 00:00:05 — 자정의 저장(어제 14초)이 실패
    await u.flushUsage();
    assert.equal(fakeIdb.failsLeft(), 0, '자정의 저장이 실패했다');
    assert.equal((await getDaily('2026-10-18')).uMath - before18, 14, '실패한 어제 몫은 어제에 다시');
    assert.equal((await getDaily('2026-10-19')).uMath, 6, '오늘은 오늘 몫만');
  } finally {
    mock.timers.reset();
    delete globalThis.document;
    delete globalThis.window;
  }
});

test('📤 usage/날짜.md: 최근 7일 — 연 수·쓴 때(이어진 칸은 한 덩이)·머문 시간(0은 뺌)·⏳ 과목 시간·부모가 더 준 시간·연장권 · v272 전 날은 과목 시간만 · 기록 없는 날', () => {
  const days = [
    { ...emptyDaily('2026-10-17'), appOpens: 2, uMath: 1260, uDex: 330, uHome: 90, uStats: 20, useSlots: ['07:4', '07:5', '08:0', '21:3'], mathTime: 1100, korTime: 1860, mathBonus: 600, korExt: 1 },
    { ...emptyDaily('2026-10-16'), korTime: 1260 }, // v272 전 날 꼴 — 머문 초 없음
  ];
  const [f] = usageFiles(days, '2026-10-17', PLACES);
  assert.equal(f.path, 'usage/2026-10-17.md');
  const lines = f.text.split('\n');
  const l17 = lines.find((l) => l.startsWith('- 10-17:'));
  assert.ok(l17.includes('앱을 연 수 2'));
  assert.ok(l17.includes('쓴 때 07:40~08:10 · 21:30~21:40'), l17);
  assert.ok(l17.includes('머문 시간 모두 28분 — 🔢 수학 21분 · 🏠 홈 2분 · 🎒 도감 6분 · 📊 기록 1분 안'), l17);
  assert.ok(!l17.includes('📚 국어 0분') && !l17.includes('🏡 집'), '0인 자리는 뺀다');
  assert.ok(l17.includes('⏳ 과목 시간 수학 18분 · 영어 0분 · 국어 31분'), l17);
  assert.ok(l17.includes('부모가 더 준 시간 수학 +10분'));
  assert.ok(l17.includes('⏳ 연장권 국어 1개'));
  const l16 = lines.find((l) => l.startsWith('- 10-16:'));
  assert.ok(l16.includes('(🕒 사용 기록 없음') && l16.includes('국어 21분') && !l16.includes('앱을 연 수 '), l16);
  // 하루 기록이 없다고 안 썼다고 단정하지 않는다 (🔍 Codex 81차 #5)
  const l11 = lines.find((l) => l.startsWith('- 10-11:'));
  assert.ok(l11.includes('(이 기기에 저장된 기록 없음 — 앱을 안 썼는지·기록이 빠졌는지는 알 수 없어요)'), '7일 전부터');
  assert.ok(!/안 썼어요/.test(f.text));
  assert.equal(lines.filter((l) => /^- \d{2}-\d{2}: /.test(l)).length, 7);
  // 읽는 법 — 2분 규칙(영상·긴 글) · 칸의 뜻 · 연 수의 뜻 · 두 창 · 걸린 초가 있는 곳과 뜻 (🔍 Codex 81차 A·E)
  const how = f.text.slice(f.text.indexOf('## 읽는 법'), f.text.indexOf('## 최근 7일'));
  for (const w of ['영상을 보거나 긴 글을 읽으며 2분 넘게', '그 칸 내내 썼다는 뜻은 아니에요', '내렸다 다시 올린 것은 안 셈', '두 창', 'math/latest.json', 'qs[].s', '찍었다는 증거는 아니에요']) assert.ok(how.includes(w), w);
  assert.ok(!f.text.includes('undefined') && !f.text.includes('NaN'));
});

test('📤 쓴 때·시간 글: slotRanges는 이어진 칸을 잇고 끝은 +10분(자정은 24:00) · 이상한 칸은 버림 · fmtMin', () => {
  assert.equal(slotRanges(['21:3', '07:4', '07:5', '08:0', 'x', '25:0', '07:4']), '07:40~08:10 · 21:30~21:40');
  assert.equal(slotRanges(['23:5']), '23:50~24:00');
  assert.equal(slotRanges([]), '');
  assert.equal(slotRanges(null), '');
  assert.equal(fmtMin(0), '0분');
  assert.equal(fmtMin(30), '1분 안');
  assert.equal(fmtMin(89), '1분');
  assert.equal(fmtMin(3600), '1시간');
  assert.equal(fmtMin(4320), '1시간 12분');
});

test('📤 gatherFiles: 자리 목록을 주면 🕒 사용 기록을 하루 기록으로 함께 · 안 주면 없음(옛 부름 그대로)', async () => {
  const base = { getMath: async () => null, listDaily: async () => [{ ...emptyDaily('2026-10-17'), uKor: 120 }], mathReportText: () => '', asksText: () => '', collectTodo: () => [], today: '2026-10-17' };
  const withU = await gatherFiles({ ...base, usagePlaces: PLACES });
  const f = withU.find((x) => x.path === 'usage/2026-10-17.md');
  assert.ok(f && f.text.includes('📚 국어 2분'));
  assert.ok(!(await gatherFiles(base)).some((x) => x.path.startsWith('usage/')));
  // 보내기는 모아 둔 초를 먼저 적고 자리 목록을 넘긴다
  const send = body(read('js/upload.js'), 'async function sendOnce(force)');
  const flushAt = send.indexOf('if (usage) await usage.flushUsage().catch(() => {});');
  assert.ok(flushAt >= 0 && flushAt < send.indexOf('files = await gatherFiles('), '모으기 전에 적는다');
  assert.match(send, /usagePlaces: usage \? usage\.PLACES : undefined/);
  // usage.js를 못 불러와도 나머지 📤는 그대로 (새 모듈 하나 때문에 보내기 전체가 멈추지 않게)
  assert.match(send, /import\('\.\/usage\.js'\)\.catch\(\(\) => null\)\]\);/);
});

test('⏱ answerSecOf: 보인 때부터 반올림한 초 · 윗값 Q_SEC_MAX · 보인 때가 없거나 시계가 거꾸로면 null', () => {
  assert.equal(answerSecOf(1000, 4400), 3);
  assert.equal(answerSecOf(1000, 1000), 0);
  assert.equal(answerSecOf(1000, 1000 + 3600 * 1000), Q_SEC_MAX);
  assert.equal(Q_SEC_MAX, 600);
  assert.equal(answerSecOf(undefined, 5000), null);
  assert.equal(answerSecOf(0, 5000), null);
  assert.equal(answerSecOf(5000, 4000), null);
  assert.equal(answerSecOf('x', 5000), null);
});

test('⏱ 일지에 걸린 초 s: 개념 편·그만둔 편·섞어 풀기·💎·📏 진단 모두 · 정수 0~Q_SEC_MAX가 아니면 안 남김', () => {
  const T = '2026-10-17';
  const m = emptyMath();
  const qs = [{ k: 'calc', ok: 1, s: 7 }, { k: 'misread', ok: 0, tag: 'x', s: 0 }, { k: 'why', ok: 1, s: 9999 }, { k: 'calc', ok: 1, s: 2.5 }, { k: 'calc', ok: 1, s: '30' }, { k: 'calc', ok: 1 }];
  applyRound(m, 'frac.same', { correct: 4, total: 6, missTags: [], qs, mode: 'learn' }, T);
  const line = m.log.at(-1);
  assert.deepEqual(line.qs.map((q) => q.s), [7, 0, undefined, undefined, undefined, undefined]);
  applyQuit(m, { rid: 5, id: 'frac.same', d: T, n: 4, qs: [{ k: 'calc', ok: 0, key: 'Q', s: 41 }] }, T);
  assert.equal(m.log.at(-1).mode, 'quit');
  assert.equal(m.log.at(-1).qs[0].s, 41, '그만둔 편에도');
  applyMixRound(m, [{ id: 'frac.same', key: 'K', k: 'calc', ok: 1, s: 12 }], T);
  assert.equal(m.log.at(-1).qs[0].s, 12, '섞어 풀기');
  applySpecialRound(m, [{ kind: 'pattern', ok: true, s: 33 }, { kind: 'cards', ok: false, s: -1 }], T);
  assert.deepEqual(m.log.at(-1).qs.map((q) => q.s), [33, undefined], '💎');
  applyPlacement(m, [{ concept: 'frac.same', correct: true, s: 4 }], T, 'fraction', []);
  assert.equal(m.log.find((e) => e.mode === 'diag').qs[0].s, 4, '📏 진단');
  // 🤔 노트 · 푸는 중 편(setLive) → 다음에 열 때 정리(settleLives → 그만둠) · ❓ 답장 뒤 다시 풀기 (🔍 Codex 81차 #3·F)
  applyNotesRound(m, [{ id: 'frac.same', key: 'K2', k: 'calc', ok: 0, s: 18 }], T);
  assert.equal(m.log.at(-1).mode, 'notes');
  assert.equal(m.log.at(-1).qs[0].s, 18, '🤔 노트');
  setLive(m, { rid: 77, id: 'frac.same', mode: 'review', d: T, n: 4, qs: [{ k: 'calc', ok: 1, s: 9 }, { k: 'misread', ok: 0, s: 51 }] });
  assert.equal(settleLives(m, null, T), 1);
  assert.deepEqual(m.log.at(-1).qs.map((q) => q.s), [9, 51], '앱을 닫았다 열어 정리한 편에도');
  m.asks = [{ id: 'a1', no: 1, status: 'understood', k: 'calc', concept: 'frac.same' }];
  assert.equal(applyAskTry(m, 'a1', true, T, { s: 27 }).ok, true);
  assert.equal(m.log.at(-1).mode, 'ask');
  assert.equal(m.log.at(-1).qs[0].s, 27, '❓ 다시 풀기');
  m.asks = [{ id: 'a2', no: 2, status: 'understood', k: 'calc', concept: 'frac.same' }];
  applyAskTry(m, 'a2', false, T, { s: 601 });
  assert.equal(m.log.at(-1).qs[0].s, undefined, '윗값을 넘으면 안 남김');
  const fin = read('js/math.js');
  assert.match(fin, /applyAskTry\(s, r\.askId, r\.correct > 0, today, \{ sameKey: r\.askSameKey !== false, s: r\.answers\[0\] && r\.answers\[0\]\.s \}\);/, '화면이 ❓ 다시 풀기의 걸린 초를 넘긴다');
});

test('⏱ 화면 배선: 문제를 처음 그릴 때 보인 때를 적고(다시 그리기는 그대로) · 답을 고를 때 걸린 초를 넣고 · 저장하는 문항 기록(extraQ)이 넘긴다', () => {
  const src = read('js/math.js');
  const rq = body(src, 'function renderQuestion(restore = false) {');
  // 보인 때는 문항 번호가 바뀔 때만 — 안 푼 문제에서 🎒·📊를 다녀오면 restore가 false여도 그대로 (🔍 Codex 81차 #2)
  assert.match(rq, /\n  if \(r\.shownFor !== r\.at\) \{ r\.shownFor = r\.at; r\.shownAt = Date\.now\(\); \}/);
  assert.match(rq, /if \(!restore\) \{ r\.answered = false; r\.chosenIdx = -1; \}/);
  assert.match(src, /else renderQuestion\(r\.answered\);/, '돌아올 때 안 푼 문제는 restore가 false');
  // 새 편은 늘 새 ui.round(문항 번호 0부터)라 앞 편의 shownFor를 물려받지 않는다
  assert.ok(!/ui\.round\.at = 0|r\.at = 0/.test(src), '같은 편에서 문항 번호를 되돌리지 않는다');
  const ans = body(src, 'function answer(i, list, card, typed = null) {');
  assert.ok(ans.indexOf('...answerSec(r.shownAt),') > ans.indexOf('r.answers.push(') && ans.indexOf('...answerSec(r.shownAt),') < ans.indexOf('saveLive();'), '답 기록 안에');
  assert.match(src, /const extraQ = \(a\) => \(\{[^\n]*\.\.\.\(Number\.isInteger\(a\.s\) \? \{ s: a\.s \} : \{\}\) \}\);/);
  assert.match(src, /const answerSec = \(shownAt\) => \{ const s = answerSecOf\(shownAt, Date\.now\(\)\); return s === null \? \{\} : \{ s \}; \};/);
});

test('🕒 앱 배선: showView가 화면을 알리고 · main이 시계를 켠다(실패해도 계속) · sw 앱 셸에 usage.js · v272', () => {
  const app = read('js/app.js');
  assert.match(body(app, 'export function showView(name) {'), /setUsageView\(name\);/);
  assert.match(app, /try \{ initUsage\(\); \} catch \{/);
  const sw = read('sw.js');
  assert.ok(sw.includes("'./js/usage.js',"));
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(sw) || [])[1]) >= 272);
  // 아이 화면에는 안 보인다 — usage.js를 부르는 곳은 앱 진입점과 📤뿐
  const users = ['js/app.js', 'js/upload.js', 'js/home.js', 'js/math.js', 'js/stats.js', 'js/player.js', 'js/koreanview.js', 'js/pokedex.js'].filter((f) => read(f).includes("'./usage.js'"));
  assert.deepEqual(users, ['js/app.js', 'js/upload.js']);
});
