// 🛟 v396 (2026-11-06 전수 검사 판단 「추천대로」): 저장 실패가 겹칠 때 · 시계가 뒤로 갈 때 · 작은 것 — 되도록 진짜 저장 길을 돌려 본다
//  · 복귀 증분 · 사본 · 영상 닫기 · 자정 · 낚시 놓아주기 · ☀️·🍀·🎁 · 낚시 💰 · 국어 물음 칸 · 등급 표 · 390 폭 윗줄
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test, before, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };

const { initProfile, flushProfile, reloadProfile, gainCoins, addItem, itemCount, consumeItem, buyItem, getProfileSnapshot, RARITY_IDS } = await import('../js/xp.js');
const { putSentenceStats, getAllSentenceStats } = await import('../js/db.js');
const { saveMirror, readMirror } = await import('../js/backup.js');
const track = await import('../js/track.js');
const tl = await import('../js/timelimit.js');
const { markDaily, dailyDone, luckyCatch, practiceNote, LUCKY } = await import('../js/mathprog.js');
const { grammarRule } = await import('../js/grammar.js');
const { catchRule, lakeOf, speciesOf, SPECIES_KEYS, FISH_COINS, PAID_DAYS } = await import('../js/fishing.js');
const { QMISS_KEYS, qMissOf } = await import('../js/korean.js');
const { MEGASTONE, ITEMS } = await import('../js/items.js');

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const stored = () => fakeIdb.get('profile', 'me');

before(async () => {
  console.warn = () => {};
  await initProfile();
});

// ───────────── 💰 복귀 ─────────────

test('💰 저장이 거듭 실패한 채 앱으로 돌아와도 번 코인·가방이 남는다 — 저장이 되면 한 번만 더해진다', async () => {
  gainCoins(100);
  await flushProfile();
  const base = stored().coins;
  const stones = itemCount(MEGASTONE.id);
  for (let i = 0; i < 3; i++) fakeIdb.failNext('profile'); // 코인 · 가방 · 아래 flush가 모두 실패
  const got = gainCoins(20).gained;
  addItem(MEGASTONE.id, 2);
  await flushProfile();
  assert.equal(fakeIdb.failsLeft(), 0);
  assert.equal(stored().coins, base, '아직 저장 안 됨');
  fakeIdb.failNext('profile');
  await reloadProfile();
  assert.equal(fakeIdb.failsLeft(), 0, '복귀의 저장도 실패했다');
  assert.equal(stored().coins, base, '복귀 뒤에도 저장값은 그대로');
  assert.equal(getProfileSnapshot().coins, base + got, '화면엔 번 코인이 남는다');
  assert.equal(itemCount(MEGASTONE.id), stones + 2, '가방도');
  await flushProfile();
  assert.equal(stored().coins, base + got, '저장이 되면 더해진다');
  assert.equal(getProfileSnapshot().coins, base + got, '두 번 더해지지 않는다');
  await reloadProfile();
  assert.equal(getProfileSnapshot().coins, base + got, '다시 읽어도 그대로');
});

test('💰 다시 읽기가 실패하면 보이던 값을 지킨다 (0으로 비지 않는다)', async () => {
  gainCoins(7);
  await flushProfile();
  const coins = getProfileSnapshot().coins;
  assert.ok(coins > 0);
  fakeIdb.failNextGet('profile');
  await reloadProfile();
  assert.equal(fakeIdb.failsLeft(), 0, '읽기 실패가 쓰였다');
  assert.equal(getProfileSnapshot().coins, coins);
  await reloadProfile();
  assert.equal(getProfileSnapshot().coins, coins, '다음 읽기는 저장값');
});

test('💰 못 쓴 몫은 다른 저장이 끝나도 화면에 남는다 — 쓴 물건이 되살아나지 않는다 (Codex 199차)', async () => {
  const shopItem = ITEMS.find((it) => it.price > 0 && !it.stone && !it.unique);
  gainCoins(shopItem.price + 50);
  addItem(MEGASTONE.id, 2);
  await flushProfile();
  const n = itemCount(MEGASTONE.id);
  fakeIdb.failNext('profile'); // consumeItem의 저장
  fakeIdb.failNext('profile'); // 구매가 먼저 하는 저장
  assert.equal(consumeItem(MEGASTONE.id), true);
  assert.equal(await buyItem(shopItem.id), true, '구매는 저장됨');
  assert.equal(fakeIdb.failsLeft(), 0);
  assert.equal(stored().items[MEGASTONE.id], n, '저장값엔 아직 안 빠졌다');
  assert.equal(itemCount(MEGASTONE.id), n - 1, '화면엔 쓴 대로');
  await flushProfile();
  assert.equal(stored().items[MEGASTONE.id], n - 1);
  assert.equal(itemCount(MEGASTONE.id), n - 1, '두 번 빠지지 않는다');
});

test('💰 저장된 줄이 아직 없어도 못 쓴 몫이 화면에 남는다 · 저장이 되면 한 번만 (Codex 199차)', async () => {
  await flushProfile();
  fakeIdb.clear();
  await reloadProfile();
  assert.equal(getProfileSnapshot().coins || 0, 0);
  for (let i = 0; i < 3; i++) fakeIdb.failNext('profile'); // 코인 · 아래 flush · 복귀
  const got = gainCoins(30).gained;
  await flushProfile();
  await reloadProfile();
  assert.equal(fakeIdb.failsLeft(), 0);
  assert.equal(stored(), undefined, '줄이 없다');
  assert.equal(getProfileSnapshot().coins, got);
  await initProfile(); // 첫 읽기 길은 이미 얹힌 메모리에 또 얹지 않는다
  assert.equal(getProfileSnapshot().coins, got);
  await flushProfile();
  assert.equal(stored().coins, got);
  assert.equal(getProfileSnapshot().coins, got);
});

// ───────────── 🛟 사본 ─────────────

test('🛟 일부를 못 읽으면 사본을 안 고친다 — 문장·하루 기록·프로필 어느 쪽이든 · 다음엔 새로 쓴다', async () => {
  await putSentenceStats([{ key: 'mirror|1', itemId: 'mirror', start: 1, en: 'hi', done: true }]);
  assert.equal(await saveMirror(), true);
  const before = readMirror();
  assert.ok(before.sentenceStats.length >= 1);
  assert.ok(before.profile.some((r) => r && r.id === 'me'), '사본에 프로필');
  for (const fail of [() => fakeIdb.failNextRead('sentenceStats'), () => fakeIdb.failNextRead('daily'), () => fakeIdb.failNextGet('profile', 'me'), () => fakeIdb.failNextGet('profile', 'math')]) {
    fail();
    assert.equal(await saveMirror(new Date(2030, 0, 1)), false);
    assert.equal(fakeIdb.failsLeft(), 0, '실패가 쓰였다');
    assert.deepEqual(readMirror(), before, '사본 그대로');
    await new Promise((r) => setTimeout(r, 20)); // 먼저 끝난 판의 남은 읽기가 다음 판의 실패를 대신 쓰지 않게
  }
  await putSentenceStats([{ key: 'mirror|2', itemId: 'mirror', start: 2, en: 'yo', done: true }]);
  assert.equal(await saveMirror(), true);
  assert.equal(readMirror().sentenceStats.length, before.sentenceStats.length + 1, '다시 읽히면 새 사본');
});

// ───────────── 🎬 영상 닫기 ─────────────

const cue = (start) => ({ start, end: start + 1, en: 'yes' });
afterEach(() => track.close()); // 시험이 중간에 실패해도 5초 저장 시계가 남아 멈추지 않게
const recOf = async (item) => (await getAllSentenceStats()).filter((r) => r.itemId === item);

test('🎬 닫을 때 저장이 실패해도 문장 기록이 남아 다음 저장에 들어간다', async () => {
  await track.open({ id: 'c1', title: 'C' });
  track.play(cue(5), 0);
  fakeIdb.failNext('sentenceStats');
  await track.close();
  assert.equal((await recOf('c1')).length, 0, '실패했다');
  await track.flush();
  const r = await recOf('c1');
  assert.equal(r.length, 1, '닫은 뒤에도 다시 쓴다');
  assert.equal(r[0].plays, 1);
  fakeIdb.failNext('sentenceStats');
  await track.flush();
  assert.equal(fakeIdb.failsLeft(), 1, '다 쓴 뒤엔 다시 안 쓴다 — 쓰기가 없어 실패가 남는다');
  await putSentenceStats([{ key: 'eat|1', itemId: 'eat', start: 1, en: 'x' }]).catch(() => {}); // 남은 실패를 치운다
  assert.equal(fakeIdb.failsLeft(), 0);
});

test('🎬 다른 영상을 열 때 못 쓴 문장을 함께 쓴다', async () => {
  await track.open({ id: 'c2', title: 'C' });
  track.play(cue(5), 0);
  fakeIdb.failNext('sentenceStats');
  await track.close();
  await track.open({ id: 'c3', title: 'D' });
  assert.equal((await recOf('c2')).length, 1);
  await track.close();
});

test('🎬 실패가 이어져도 같은 영상을 다시 열면 그 문장이 살아 있고 이어서 센다', async () => {
  await track.open({ id: 'c4', title: 'C' });
  track.play(cue(5), 0);
  fakeIdb.failNext('sentenceStats');
  await track.close();
  fakeIdb.failNext('sentenceStats'); // open 안의 close도 실패
  await track.open({ id: 'c4', title: 'C' });
  assert.equal((await recOf('c4')).length, 0);
  const seen = track.statsList().find((r) => r.itemId === 'c4');
  assert.equal(seen && seen.plays, 1, '옛 저장값에 가리지 않는다');
  track.play(cue(5), 0);
  await track.close();
  assert.equal((await recOf('c4'))[0].plays, 2);
});

test('🎬 실패한 문장은 다시 열 때 저장값과 합친다 — 다른 창이 앞선 기록을 잃지 않고 이어서 센다 (Codex 199차)', async () => {
  await track.open({ id: 'c5', title: 'C' });
  track.play(cue(5), 0);
  const key = track.statsList().find((r) => r.itemId === 'c5').key;
  fakeIdb.failNext('sentenceStats');
  await track.close();
  fakeIdb.put('sentenceStats', { key, itemId: 'c5', start: 5, en: 'yes', plays: 5, done: true }); // 다른 창이 앞서 나갔다
  fakeIdb.failNext('sentenceStats');
  await track.open({ id: 'c5', title: 'C' });
  const seen = track.statsList().find((r) => r.itemId === 'c5');
  assert.equal(seen.plays, 5, '큰 쪽');
  assert.equal(seen.done, true);
  track.play(cue(5), 0);
  await track.close();
  assert.equal((await recOf('c5'))[0].plays, 6, '새 재생이 빠지지 않는다');
  fakeIdb.failNext('sentenceStats');
  await track.flush();
  assert.equal(fakeIdb.failsLeft(), 1, '쓴 문장은 대기에서 빠진다');
  await putSentenceStats([{ key: 'eat|2', itemId: 'eat', start: 2, en: 'x' }]).catch(() => {});
});

test('🎬 돌던 저장이 닫은 뒤에 실패해도 남는다 (Codex 199차)', async () => {
  await track.open({ id: 'c6', title: 'C' });
  track.play(cue(5), 0);
  fakeIdb.failNext('sentenceStats');
  const running = track.flush();
  await track.close();
  await running;
  await track.flush();
  assert.equal((await recOf('c6')).length, 1);
});

// ───────────── ⏳ 자정 ─────────────

test('⏳ 자정 저장이 실패해도 어제 초가 오늘 기록에 들어가지 않는다 · 성공하면 어제 기록으로 · 저장 중에 자정을 넘겨도', async () => {
  const at = (d, h = 23, m = 59, s = 50) => new Date(2026, 10, d, h, m, s).getTime();
  const row = (day, k = 'mathTime') => (fakeIdb.get('daily', day) || {})[k] || 0;
  // 초 시계는 손으로 돌린다 — mock.timers의 setTime이 건너뛴 시간만큼 setInterval을 돌려 버린다
  mock.timers.enable({ apis: ['Date'], now: at(4) });
  const realInterval = globalThis.setInterval;
  let secTick = null;
  globalThis.setInterval = (fn) => { secTick = fn; return 1; };
  const jump = (ms) => { mock.timers.setTime(ms); tl.noteActivity(); };
  const sec = (n) => { for (let i = 0; i < n; i++) { jump(Date.now() + 1000); secTick(); } };
  try {
    await tl.initTimeLimit({ conf: () => ({ off: false, min: tl.DEFAULT_MIN, minKorean: tl.KOREAN_MIN }) });
    globalThis.setInterval = realInterval;
    tl.setSubject('math');
    // 실패
    sec(3);
    jump(at(5, 0, 0, 5));
    fakeIdb.failNext('daily');
    await tl.ensureToday();
    assert.equal(fakeIdb.failsLeft(), 0, '실패가 쓰였다');
    sec(2);
    await tl.flushTime();
    assert.equal(row('2026-11-05'), 2, '오늘 몫만');
    assert.equal(row('2026-11-04'), 0);
    assert.equal(tl.status('math').used, 2);
    // 같은 날 저장 실패 — 다음에 다시 쓴다
    sec(2);
    fakeIdb.failNext('daily');
    await tl.flushTime();
    assert.equal(fakeIdb.failsLeft(), 0);
    assert.equal(row('2026-11-05'), 2, '실패했다');
    assert.equal(tl.status('math').used, 4, '못 쓴 초도 쓴 시간');
    sec(1);
    await tl.flushTime();
    assert.equal(row('2026-11-05'), 5, '다음 저장에 함께');
    // 성공
    jump(at(6));
    await tl.ensureToday();
    sec(3);
    jump(at(7, 0, 0, 5));
    await tl.ensureToday();
    assert.equal(row('2026-11-06'), 3, '어제 몫은 어제로');
    sec(1);
    await tl.flushTime();
    assert.equal(row('2026-11-07'), 1);
    // 저장하는 사이 자정 — 실패
    jump(at(8));
    await tl.ensureToday();
    sec(3);
    fakeIdb.failNext('daily');
    const p1 = tl.flushTime();
    jump(at(9, 0, 0, 5));
    await tl.loadToday();
    await p1;
    sec(1);
    await tl.flushTime();
    assert.equal(row('2026-11-09'), 1, '늦게 실패한 어제 초가 오늘로 안 온다');
    // 저장하는 사이 자정 — 성공
    jump(at(10));
    await tl.ensureToday();
    sec(3);
    const p2 = tl.flushTime();
    jump(at(11, 0, 0, 5));
    const reading = tl.loadToday(); // 날은 바로 바뀌고 읽기는 아직
    await p2;
    assert.equal(row('2026-11-10'), 3, '어제 기록엔 쓰였다');
    assert.notEqual((tl.todayDaily() || {}).mathTime, 3, '늦게 온 어제 결과가 오늘 기록을 덮지 않는다');
    await reading;
    // 같은 날 다시 읽어도 모아 둔 초는 그대로
    sec(2);
    await tl.loadToday();
    await tl.flushTime();
    assert.equal(row('2026-11-11'), 2, '같은 날은 안 버린다');
    // 🔒 시간 추가 — 초 시계가 돌기 전에 눌러도 오늘 몫 (Codex 199차)
    jump(at(13, 0, 0, 1));
    const st = await tl.grantMinutes('math', 10);
    assert.equal(row('2026-11-13', 'mathBonus') > 0, true, '오늘 기록에');
    assert.equal(row('2026-11-11', 'mathBonus'), 0, '어제 기록엔 안 간다');
    assert.ok(st);
    assert.equal(tl.todayDaily().date, '2026-11-13');
    tl.setSubject(null);
  } finally {
    globalThis.setInterval = realInterval;
    mock.timers.reset();
  }
});

// ───────────── 🎣 놓아주기 ─────────────

test('🎣 다시 적는 동안 놓아주기도 꺼진다 — 저장 전에 끄고 나서 keepFish를 부른다', () => {
  const s = read('js/fishview.js');
  const f = s.slice(s.indexOf('function keepFailed(f)'), s.indexOf('function showResult(f, info)'));
  const off = f.indexOf('off.disabled = true;');
  assert.ok(off > 0 && off < f.indexOf('keepFish(f).catch'), '다시 적기 안에서');
  assert.ok(read('css/style.css').includes('.lk-res-btn:disabled, .lk-res-sub:disabled'), '꺼진 모습');
});

// ───────────── ⏰ 시계 뒤로 ─────────────

test('☀️ 시계가 뒤로 가도 장부를 되돌리지 않는다 — 첫 완주·🌟·🎟️ 다시 없음 · 날짜가 돌아와도 · 다음 날은 정상', () => {
  const m = {};
  assert.deepEqual(markDaily(m, '2026-11-04', { perfect: true }), { first: true, n: 1, gold: true });
  const tot = JSON.stringify(m.tot);
  assert.deepEqual(markDaily(m, '2026-11-03', { perfect: true }), { first: false, n: 1, gold: false }, '뒤로');
  assert.deepEqual(markDaily(m, '2026-11-03'), { first: false, n: 1 }, 'perfect를 안 물으면 gold 칸도 없다');
  assert.equal(m.daily.d, '2026-11-04', '장부 그대로');
  assert.equal(JSON.stringify(m.tot), tot, '🎟️ 그대로');
  assert.equal(dailyDone(m, '2026-11-03'), 1, '그날은 끝낸 것으로');
  assert.deepEqual(markDaily(m, '2026-11-04', { perfect: true }), { first: false, n: 2, gold: false }, '돌아와도');
  assert.deepEqual(markDaily(m, '2026-11-05', { perfect: true }), { first: true, n: 1, gold: true }, '다음 날');
  assert.equal(dailyDone({}, '2026-11-05'), 0);
  assert.equal(dailyDone({ daily: { d: '2026-11-04', n: 1 } }, '2026-11-05'), 0, '지난 장부는 0');
});

test('☀️·🍀 깨진 날짜는 시계가 뒤로 간 것이 아니다 — 다음 완주가 바로잡는다 (Codex 199차)', () => {
  for (const bad of ['broken', '9999', '2026-11', '20261106']) {
    const m = { daily: { d: bad, n: 1 }, luck: { d: bad, n: 3 } };
    assert.equal(dailyDone(m, '2026-11-06'), 0, bad);
    assert.deepEqual(markDaily(m, '2026-11-06', { perfect: true }), { first: true, n: 1, gold: true }, bad);
    assert.equal(m.daily.d, '2026-11-06');
    assert.equal(luckyCatch(m, { mode: 'practice', result: { passed: true, practice: true }, roll: true, today: '2026-11-06' }), 1, bad);
    assert.ok(practiceNote({ done: true, box: 99, dueAt: '2030-01-01' }, '2026-11-06', { d: bad, n: 3 }).includes('🍀'), bad);
  }
});

test('🍀 시계가 뒤로 가도 그날 다 받은 몫이 다시 안 열린다 · 안내도 말하지 않는다 · 다음 날은 정상', () => {
  const o = { mode: 'practice', result: { passed: true, practice: true }, roll: true };
  const m = { luck: { d: '2026-11-04', n: LUCKY.max } };
  assert.equal(luckyCatch(m, { ...o, today: '2026-11-03' }), 0, '뒤로');
  assert.deepEqual(m.luck, { d: '2026-11-04', n: LUCKY.max }, '장부 그대로');
  assert.equal(luckyCatch(m, { ...o, today: '2026-11-04' }), 0, '돌아와도');
  assert.equal(luckyCatch(m, { ...o, today: '2026-11-05' }), 1, '다음 날');
  const rec = { done: true, box: 99, dueAt: '2030-01-01' };
  assert.ok(!practiceNote(rec, '2026-11-03', { d: '2026-11-04', n: 1 }).includes('🍀'), '뒤로면 말하지 않는다');
  assert.ok(practiceNote(rec, '2026-11-05', { d: '2026-11-04', n: LUCKY.max }).includes('🍀'), '지난 장부면 말한다');
});

test('🎁 문법 깜짝 포켓몬도 시계가 뒤로 가면 다시 안 나온다 · 다음 날은 나온다', () => {
  const DAY = 86400000;
  const NOW = new Date(2026, 10, 4, 12).getTime();
  const IDS = ['G1', 'G2', 'G3'];
  const opt = { pool: [10, 11, 12], rng: () => 0 };
  const p = {};
  assert.ok(grammarRule(p, { id: 'G1', ok: false, from: 0 }, NOW, IDS, opt).gift, '오늘');
  assert.equal(grammarRule(p, { id: 'G2', ok: false, from: 0 }, NOW - DAY, IDS, opt).gift || 0, 0, '뒤로');
  assert.ok(grammarRule(p, { id: 'G3', ok: false, from: 0 }, NOW + DAY, IDS, opt).gift, '다음 날');
});

test('🎣 시계가 크게 뒤로 가 💰 장부에 오늘을 못 남기면 도감만 적는다 · 한 칸이라도 남으면 하루 한도를 지킨다', () => {
  const sp = speciesOf(SPECIES_KEYS[0]);
  const fish = { key: sp.key, cm: sp.min };
  const days = (n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`2026-11-${String(i + 1).padStart(2, '0')}`, 1]));
  const at = new Date(2026, 9, 31, 12).getTime();
  const full = { coins: 0, coinsEarned: 0, fishing: { dex: {}, paid: days(PAID_DAYS) } };
  for (let i = 0; i < 60; i++) assert.equal(catchRule(full, fish, at).coins, 0);
  assert.equal(full.coins, 0);
  assert.equal(full.fishing.dex[sp.key].n, 60, '도감은 적힌다');
  const room = { coins: 0, coinsEarned: 0, fishing: { dex: {}, paid: days(PAID_DAYS - 1) } };
  for (let i = 0; i < 60; i++) catchRule(room, fish, at);
  assert.equal(room.coins, FISH_COINS.dayMax, '한도까지');
  assert.equal(room.fishing.paid['2026-10-31'], FISH_COINS.dayMax);
  const later = { coins: 0, coinsEarned: 0, fishing: { dex: {}, paid: days(PAID_DAYS) } };
  assert.ok(catchRule(later, fish, new Date(2026, 10, 20, 12).getTime()).coins > 0, '장부보다 늦은 날은 그대로 받는다');
  const inside = { coins: 0, coinsEarned: 0, fishing: { dex: {}, paid: days(PAID_DAYS) } };
  assert.ok(catchRule(inside, fish, new Date(2026, 10, 7, 12).getTime()).coins > 0, '장부 안의 날도 그대로');
});

test('🎣 0코인 날이 많아도 받은 날이 밀려나지 않는다 — 한도가 지켜진다 (Codex 199차)', () => {
  const zero = Object.fromEntries(Array.from({ length: PAID_DAYS }, (_, i) => [`2026-11-${String(i + 10).padStart(2, '0')}`, 0]));
  const lk = lakeOf({ dex: {}, paid: { ...zero, '2026-11-06': FISH_COINS.dayMax } });
  assert.deepEqual(lk.paid, { '2026-11-06': FISH_COINS.dayMax });
  const sp = speciesOf(SPECIES_KEYS[0]);
  const p = { coins: 0, coinsEarned: 0, fishing: { dex: {}, paid: { ...zero, '2026-11-06': FISH_COINS.dayMax } } };
  assert.equal(catchRule(p, { key: sp.key, cm: sp.min }, new Date(2026, 10, 6, 12).getTime()).coins, 0, '오늘 다 받았다');
  const many = Object.fromEntries(Array.from({ length: PAID_DAYS + 3 }, (_, i) => [`2026-10-${String(i + 1).padStart(2, '0')}`, 5]));
  assert.equal(Object.keys(lakeOf({ dex: {}, paid: many }).paid).length, PAID_DAYS, '날 수 끝은 그대로');
  assert.equal(lakeOf({ dex: {}, paid: { '2026-10-01': 999 } }).paid['2026-10-01'], FISH_COINS.dayMax, '하루 끝도 그대로');
});

// ───────────── 작은 것 ─────────────

test('📚 틀린 물음 칸은 원고 물음 수보다 넉넉하다 — 모든 물음이 한 번씩 틀려도 다 남는다', () => {
  const reading = JSON.parse(read('coach/korean/reading.json'));
  const cards = Array.isArray(reading) ? reading : reading.cards;
  const keys = cards.flatMap((c) => (c.qs || []).map((_, i) => `${c.id}-${i + 1}`));
  assert.ok(keys.length > 600, '옛 칸보다 많다');
  assert.ok(keys.length * 2 <= QMISS_KEYS, `물음 ${keys.length} · 칸 ${QMISS_KEYS} — 원고가 늘면 칸도`);
  const all = Object.fromEntries(keys.map((k) => [k, 1]));
  assert.equal(Object.keys(qMissOf(all)).length, keys.length);
});

test('🏷️ 등급 표에 빈칸이 없다', () => {
  for (const r of Object.keys(RARITY_IDS)) {
    const t = RARITY_IDS[r];
    for (let i = 0; i < t.length; i++) assert.ok(i in t && Number.isSafeInteger(t[i]), `등급 ${r} ${i}번째`);
  }
});

test('📱 폰 폭 영상 화면은 칩을 둘째 줄로 — 480 아래에서만', () => {
  const s = read('css/style.css');
  const at = s.indexOf('#view-player .topbar { flex-wrap: wrap;');
  assert.ok(at > 0);
  const open = s.lastIndexOf('@media', at);
  assert.ok(s.slice(open, at).startsWith('@media (max-width: 480px)'), s.slice(open, open + 40));
});
