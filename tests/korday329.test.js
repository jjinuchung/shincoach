// 🔥 국어·논술 연속 학습 · ✨ 오늘의 보너스 · 🔤 낱말 이어 주기 (v329, 2026-10-24 아버님 "이대로") — node --test tests/korday329.test.js
//  🔥 국어·논술 합쳐 하나 · 글 한 편·논술 한 판을 끝낸 날 · 그날 첫 끝냄에 ⚡ 10→40 💰 5→50(영어와 같음) · 끝 화면 한 줄만
//  ✨ 국어 카드·논술 카드 따로 · 수학과 같은 다섯 · 세 과목이 그날 모두 다름 · 그 과목 그날 첫 끝냄
//  🔤 글에서 만난 📖 낱말 · 안 이은 것이 10개면 국어 글 끝 화면에 단추 · 다섯 쌍 · 하루 3판 · ⚡ 30/20/10 💰 5/3/2 · apart 짝·긴 뜻 뺌
import { fakeIdb } from './fakeidb.js'; // ★ db.js보다 먼저 — 🔥·✨·🔤 주기를 진짜 트랜잭션으로 (🔍 Codex 133차)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { korDayDone, settleKorMatch, openKorMatch } from '../js/kordayview.js';
import { initMatch, openMatch, closeMatch } from '../js/match.js';
import { initProfile, getProfileSnapshot, korMatchMap } from '../js/xp.js';
import { getDaily, applyDailyDelta } from '../js/db.js';
import { todayKey } from '../js/track.js';
import { homeStale } from '../js/home.js';
import { KOR_DAY, BONUS_TIP, bonusField, korDayOk, prevKey, korStreakBefore, profileKorDays, streakLine, bonusLine, korBonusFor } from '../js/korday.js';
import { KOR_MATCH, korShortMean, korMatchable, matchedOf, mergeMatched, korMatchPool, pickKorMatch, korMatchRule } from '../js/kormatch.js';
import { BONUSES, dailyBonus, subjectBonus, bonusText } from '../js/mathbonus.js';
import { allWords } from '../js/korwords.js';
import { dayNum, dayKeyOf } from '../js/korean.js';
import { streakBonus, matchXp } from '../js/xp.js';
import { streakCoins, matchCoins } from '../js/items.js';
import { emptyDaily, emptyProfile, cloneProfile } from '../js/db.js';
import { rng } from '../js/mathgen.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const json = (f) => JSON.parse(read(f));
const CARDS = json('coach/korean/reading.json').cards;
const WORDS = json('coach/korean/words.json');
const ALL = allWords({ apart: WORDS.apart }, CARDS);
const day = (k, o = {}) => ({ ...emptyDaily(k), ...o });
const keyAdd = (k, n) => dayKeyOf(Math.floor(Date.UTC(Number(k.slice(0, 4)), Number(k.slice(5, 7)) - 1, Number(k.slice(8, 10))) / 86400000) + n);

test('숫자 — 하루 기록 칸 넷(⏳ korBonus와 다른 칸) · 🔤 다섯 쌍·10개·하루 3판·뜻 24자 · 🔥 ⚡ 10→40 💰 5→50 · 🔤 ⚡ 30/20/10 💰 5/3/2', () => {
  assert.deepEqual(KOR_DAY, { streak: 'korStreak', bonus: { korean: 'korDayBonus', nonsul: 'nsDayBonus' }, match: 'korMatches' });
  const fields = ['korStreak', 'korDayBonus', 'nsDayBonus', 'korMatches'];
  assert.ok(!fields.includes('korBonus'), '⏳ 국어 부모 추가 시간 칸은 쓰지 않는다');
  const d = emptyDaily('2026-10-24');
  for (const f of fields) assert.equal(d[f], 0, `${f}는 하루 기록 수(DAILY_SUMS — 병합 큰 쪽)`);
  assert.deepEqual(KOR_MATCH, { pairs: 5, need: 10, perDay: 3, meanMax: 24, wordMax: 8 });
  assert.deepEqual([1, 2, 3, 7, 8].map(streakBonus), [10, 15, 20, 40, 40]);
  assert.deepEqual([1, 2, 3, 10, 11].map(streakCoins), [5, 10, 15, 50, 50]);
  assert.deepEqual([0, 1, 2, 3, 9].map(matchXp), [30, 20, 20, 10, 10]);
  assert.deepEqual([0, 1, 2, 3, 9].map(matchCoins), [5, 3, 3, 2, 2]);
  assert.deepEqual(BONUS_TIP, { korean: '📚 글 한 편 다 읽으면 받아요', nonsul: '🖊️ 논술 한 판 끝내면 받아요' });
});

test('🔥 공부한 날 = 국어 글(korReads)·논술 판(nsRounds)·🔥 받은 날 — 🔤 낱말·🧩 퍼즐만 한 날은 아니다', () => {
  assert.equal(korDayOk(day('2026-10-20', { korReads: 1 })), true);
  assert.equal(korDayOk(day('2026-10-20', { nsRounds: 2 })), true);
  assert.equal(korDayOk(day('2026-10-20', { korStreak: 1 })), true);
  assert.equal(korDayOk(day('2026-10-20', { puzzles: 3, mathRounds: 2, korTime: 3600 })), false, '낱말·퍼즐·국어 시간만으로는 아니다');
  assert.equal(korDayOk(null), false);
});

test('🔥 어제까지 이어 온 날 — 오늘은 빼고 · 하루라도 빠지면 끊김 · 프로필의 지난날도 · 달·해 넘김', () => {
  assert.equal(prevKey('2026-03-01'), '2026-02-28');
  assert.equal(prevKey('2026-01-01'), '2025-12-31');
  const list = [day('2026-10-21', { korReads: 1 }), day('2026-10-22', { nsRounds: 1 }), day('2026-10-23', { korStreak: 1 }), day('2026-10-24', { korReads: 5 })];
  assert.equal(korStreakBefore(list, '2026-10-24'), 3, '21·22·23');
  assert.equal(korStreakBefore(list, '2026-10-25'), 4, '오늘(25) 아직 — 어제까지 넷');
  assert.equal(korStreakBefore([day('2026-10-21', { korReads: 1 }), day('2026-10-23', { korReads: 1 })], '2026-10-24'), 1, '22가 빠져 끊김');
  assert.equal(korStreakBefore([day('2026-10-23', { puzzles: 2 })], '2026-10-24'), 0, '퍼즐만 한 날');
  assert.equal(korStreakBefore([], '2026-10-24', ['2026-10-23', '2026-10-22', '2026-10-20']), 2, '프로필에서 온 날도');
  assert.equal(korStreakBefore([day('2026-10-23', { korReads: 1 })], '2026-10-24', ['2026-10-22', 'x', '2026-10-24']), 2, '깨진 날·오늘은 건너뜀');
  assert.equal(korStreakBefore(list, 'bad'), 0);
  const p = { korReads: [{ c: 'K1', t: 1, d: dayNum(new Date(2026, 9, 20, 12).getTime()), g: 1, s: 1, a: 1, n: 3, f: 1, x: 0, e: 0, h: 0, m: '' }], nonsulDay: { [dayNum(new Date(2026, 9, 19, 12).getTime())]: 1, 0: 1, bad: 2 } };
  assert.deepEqual(profileKorDays(p).sort(), ['2026-10-19', '2026-10-20']);
  assert.deepEqual(profileKorDays(null), []);
});

test('🔥 끝 화면 한 줄 — 첫날 「오늘 … 시작!」 · 이틀째부터 「N일 연속」 · 받지 않았으면 없음', () => {
  assert.equal(streakLine({ days: 1, xp: 10, coin: 5 }), '🔥 오늘 국어·논술 공부 시작! ⚡+10 💰+5 (내일도 하면 더 많이)');
  assert.equal(streakLine({ days: 3, xp: 20, coin: 15 }), '🔥 3일 연속 국어·논술 공부! ⚡+20 💰+15');
  assert.equal(streakLine(null), '');
  assert.equal(streakLine({ days: 0 }), '');
  assert.equal(bonusLine(BONUSES[0]), '✨ 오늘의 보너스 🔵 슈퍼볼 2개 받았어요!');
  assert.equal(bonusLine(null), '');
});

test('✨ 과목마다 오늘의 보너스 — 수학은 그대로 · 국어·논술은 날마다 정해짐 · 세 과목이 그날 모두 다름(🌟는 보너스로 하루 하나) · 다섯 가지가 다 나옴', () => {
  const seen = { korean: new Set(), nonsul: new Set() };
  for (let n = 0; n < 2000; n++) {
    const k = keyAdd('2026-01-01', n);
    assert.equal(subjectBonus(k, 'math'), dailyBonus(k), '수학은 이미 보여 준 것 그대로');
    assert.equal(subjectBonus(k), dailyBonus(k));
    const m = subjectBonus(k, 'math').id;
    const kr = subjectBonus(k, 'korean');
    const ns = subjectBonus(k, 'nonsul');
    assert.ok(kr && ns, k);
    assert.equal(new Set([m, kr.id, ns.id]).size, 3, `${k} 세 과목이 다름`);
    assert.equal(subjectBonus(k, 'korean'), kr, '같은 날은 같은 것(어느 창·기기에서도)');
    seen.korean.add(kr.id);
    seen.nonsul.add(ns.id);
  }
  for (const s of ['korean', 'nonsul']) assert.equal(seen[s].size, BONUSES.length, `${s}에 다섯 가지가 다 나온다`);
});

test('✨ 홈 카드 — 받았나는 그 과목 칸 · 칩 글 · 받는 법 · 모르는 과목은 없음', () => {
  const k = '2026-10-24';
  const kr = korBonusFor(day(k), k, 'korean');
  assert.deepEqual(kr, { text: bonusText(subjectBonus(k, 'korean')), tip: BONUS_TIP.korean, got: false });
  assert.equal(korBonusFor(day(k, { korDayBonus: 1 }), k, 'korean').got, true);
  assert.equal(korBonusFor(day(k, { korDayBonus: 1 }), k, 'nonsul').got, false, '국어로 받아도 논술 카드는 그대로 반짝인다');
  assert.equal(korBonusFor(day(k, { nsDayBonus: 1 }), k, 'nonsul').got, true);
  assert.equal(korBonusFor(day(k, { korBonus: 600 }), k, 'korean').got, false, '⏳ 부모 추가 시간은 상관없다');
  assert.equal(korBonusFor(null, k, 'korean').got, false);
  for (const bad of ['math', 'english', 'constructor', '__proto__', '', null]) {
    assert.equal(korBonusFor(day(k), k, bad), null, String(bad));
    assert.equal(bonusField(bad), null, String(bad));
  }
});

test('🔤 낼 수 있는 낱말 — 📖 글 낱말만 · 낱말 8자 · 뜻 24자(「 — 」 뒤 덧말은 떼고) · 쉼표는 자르지 않음', () => {
  assert.equal(korShortMean('음력으로 한 달의 마지막 날 밤 — 달이 거의 보이지 않아요'), '음력으로 한 달의 마지막 날 밤');
  assert.equal(korShortMean('차례가 되어 어떤 일을 맡아 하는 것, 또는 그 사람'), '차례가 되어 어떤 일을 맡아 하는 것, 또는 그 사람');
  const w = (o) => ({ deck: 'passage', w: '당번', mean: '차례를 맡은 사람', ...o });
  assert.equal(korMatchable(w()), true);
  assert.equal(korMatchable(w({ deck: 'concept' })), false, '📘 국어 공부 말은 아님 — 글에서 만난 낱말만');
  assert.equal(korMatchable(w({ mean: 'ㄱ'.repeat(24) })), true);
  assert.equal(korMatchable(w({ mean: 'ㄱ'.repeat(25) })), false);
  assert.equal(korMatchable(w({ w: '가나다라마바사아자' })), false);
  assert.equal(korMatchable(w({ mean: ' — 덧말만' })), false);
  const pass = ALL.filter((x) => x.deck === 'passage');
  const ok = pass.filter(korMatchable);
  assert.ok(pass.length >= 400 && ok.length >= 300, `글 낱말 ${pass.length} · 낼 수 있는 것 ${ok.length}`);
  for (const x of ok) assert.ok(korShortMean(x.mean).length <= 24 && x.w.length <= 8, x.id);
});

test('🔤 안 이은 낱말 — ★ 받은 글만 · 이은 것은 빼고 · 최근에 ★를 받은 글부터', () => {
  const done = { 'K1:1': 20380, 'K2:1': 20384, 'K3:1': 20382 };
  const pool = korMatchPool(ALL, done, { [ALL.find((x) => x.card === 'K2' && korMatchable(x)).id]: 20384 });
  assert.ok(pool.length > 0);
  assert.ok(pool.every((x) => ['K1', 'K2', 'K3'].includes(x.card)), '★ 없는 글의 낱말은 안 열림');
  const cards = pool.map((x) => x.card);
  assert.equal(cards[0], 'K2', '가장 최근 ★ 글부터');
  assert.ok(cards.lastIndexOf('K2') < cards.indexOf('K3') && cards.lastIndexOf('K3') < cards.indexOf('K1'), cards.join(','));
  assert.equal(pool.filter((x) => x.card === 'K2').length, ALL.filter((x) => x.card === 'K2' && korMatchable(x)).length - 1, '이은 것은 뺌');
  assert.deepEqual(korMatchPool(ALL, {}, {}), [], '읽은 글이 없으면 없음');
});

test('🔤 이번 판 — 10개가 안 모이면 없음 · 다섯 쌍 · 같은 낱말·같은 뜻·apart 무리(정답 둘) 없음 · 씨앗 3천 개', () => {
  const done = {};
  for (const c of CARDS) done[`${c.id}:1`] = 20000 + Number(String(c.id).replace(/\D/g, '') || 0);
  const pool = korMatchPool(ALL, done, {});
  assert.equal(pickKorMatch(pool.slice(0, 9)), null, '9개');
  assert.ok(pickKorMatch(pool.slice(0, 10), { rng: rng(1) }));
  const apart = new Map(ALL.filter((x) => x.deck === 'passage').map((x) => [x.w, new Set(x.avoid || [])]));
  let conflictsSeen = 0;
  for (let s = 1; s <= 3000; s++) {
    const r = rng(s);
    const start = Math.floor(r() * Math.max(1, pool.length - 12));
    const round = pickKorMatch(pool.slice(start), { rng: r });
    if (!round) continue;
    assert.equal(round.items.length, 5);
    assert.deepEqual(round.ids, round.items.map((it) => it.id));
    const ws = round.items.map((it) => it.word);
    assert.equal(new Set(ws).size, 5, '같은 낱말 둘');
    assert.equal(new Set(round.items.map((it) => it.meaning)).size, 5, '같은 뜻 둘');
    for (const a of ws) for (const b of ws) if (a !== b && apart.get(a) && apart.get(a).has(b)) assert.fail(`apart 무리 ${a}·${b}`);
    for (const it of round.items) assert.ok(it.meaning.length <= 24 && it.meaning === korShortMean(it.full), it.id);
  }
  // 묶음 안에 apart 짝이 있어도 둘 다 고르지 않는다 (고정 짝)
  const groups = (WORDS.apart || []).filter((g) => Array.isArray(g) && g.length >= 2);
  for (const g of groups.slice(0, 40)) {
    const twins = g.map((w) => pool.find((x) => x.w === w)).filter(Boolean);
    if (twins.length < 2) continue;
    conflictsSeen++;
    const rest = pool.filter((x) => !g.includes(x.w)).slice(0, 8);
    for (let s = 1; s <= 30; s++) {
      const round = pickKorMatch([...twins, ...rest], { rng: rng(s) });
      if (!round) continue;
      assert.ok(round.items.filter((it) => g.includes(it.word)).length <= 1, g.join('·'));
    }
  }
  assert.ok(conflictsSeen > 0, '고정 짝 시험이 실제로 돌았다');
});

test('🔤 이번 판 — 만든 낱말로: 같은 뜻 둘·한쪽에만 적힌 apart 짝도 같이 안 냄(어느 차례로 와도)', () => {
  const w = (i, o = {}) => ({ id: `p:K${i}:w${i}`, deck: 'passage', w: `낱말${i}`, mean: `뜻${i}`, card: `K${i}`, avoid: [], ...o });
  const base = [];
  for (let i = 1; i <= 8; i++) base.push(w(i));
  // 같은 뜻 — 낱말은 다르고 뜻 글자가 같다 (원고가 글마다 따로 뜻을 적는다)
  const same = [w(20, { mean: '같은 뜻' }), w(21, { mean: '같은 뜻 — 덧말' })];
  // apart가 한쪽에만 적힌 짝 (깨진 원고·옛 원고)
  const oneSide = [w(30, { avoid: ['낱말31'] }), w(31)];
  for (let s = 1; s <= 300; s++) {
    const r1 = pickKorMatch([...same, ...base], { rng: rng(s), need: 10 });
    assert.ok(r1.items.filter((it) => it.meaning === '같은 뜻').length <= 1, `씨앗 ${s} 같은 뜻 둘`);
    const r2 = pickKorMatch([...oneSide, ...base], { rng: rng(s), need: 10 });
    assert.ok(r2.items.filter((it) => it.word === '낱말30' || it.word === '낱말31').length <= 1, `씨앗 ${s} apart 짝 둘`);
  }
});

test('🔤 이은 낱말 기록 — 판에 낸 다섯만 · 두 번째(다른 창)는 0 · 병합은 합집합·이른 날 · 깨진 칸은 버림', () => {
  const p = cloneProfile({ ...emptyProfile() });
  const now = new Date(2026, 9, 24, 12).getTime();
  const ids = ['p:K1:당번', 'p:K1:짝꿍', 'p:K2:펭귄', 'p:K3:무대', 'p:K4:옥돔'];
  assert.deepEqual(korMatchRule(p, ids, now), { ok: true, n: 5 });
  assert.deepEqual(korMatchRule(p, ids, now + 1000), { ok: true, n: 0 }, '다른 창이 먼저 끝낸 같은 판');
  assert.deepEqual(korMatchRule(p, [...ids, 'p:K5:새것'], now), { ok: true, n: 1 });
  assert.equal(p.korMatch['p:K1:당번'], dayNum(now));
  assert.deepEqual(korMatchRule(p, ['c:비유', 'x', 7], now), { ok: false, why: 'empty' }, '📖 낱말 id만');
  assert.deepEqual(matchedOf({ 'p:K1:a': 3, 'p:K1:b': 0, 'c:x': 1, 'p:K2:c': 'x', ['p:' + 'z'.repeat(90)]: 1 }), { 'p:K1:a': 3 });
  assert.deepEqual(matchedOf([1]), {});
  assert.deepEqual(mergeMatched({ 'p:K1:a': 5, 'p:K1:b': 2 }, { 'p:K1:a': 3, 'p:K2:c': 9 }), { 'p:K1:b': 2, 'p:K1:a': 3, 'p:K2:c': 9 });
  assert.deepEqual(mergeMatched('x', { 'p:K1:a': 1 }), { 'p:K1:a': 1 });
  assert.deepEqual(cloneProfile({ ...emptyProfile(), korMatch: { 'p:K1:a': 4, bad: 1 } }).korMatch, { 'p:K1:a': 4 }, '프로필을 고쳐 읽을 때도');
});

test('화면 연결 — 국어 글(새로 읽은 줄일 때)·논술 판 끝에 🔥·✨ · 끝 화면 줄 · 🔤 단추는 국어 글 끝에만 · 홈 카드 · 짝 맞추기 국어 꼴 · 음악 · 저장 병합 · 앱 셸', () => {
  const kv = read('js/koreanview.js');
  assert.match(kv, /if \(res && res\.ok && res\.newRead\) \{\n\s+korDayDone\('korean'\)/, '국어 — 새로 읽은 줄일 때만([다시 저장하기]는 아님)');
  assert.match(kv, /streakLine\(r\.day\.streak\)/);
  assert.match(kv, /bonusLine\(r\.day\.bonus\)/);
  assert.match(kv, /korMatchOffer\(ui\.cards \|\| \[\]\)/);
  assert.match(kv, /korMatchEl\(m, \{ viewId: 'view-korean'/);
  const ns = read('js/nonsulview.js');
  assert.match(ns, /korDayDone\('nonsul'\)/);
  assert.match(ns, /streakLine\(r\.day\.streak\)/);
  assert.doesNotMatch(ns, /korMatchOffer/, '🔤은 국어 글 끝에만');
  const home = read('js/home.js');
  assert.match(home, /korBonusFor\(d, day, k\)/);
  assert.match(home, /subject\.bonus\.tip \|\|/);
  const dv = read('js/kordayview.js');
  assert.match(dv, /claimDailyCount\(today, KOR_DAY\.streak, 1\)/, '🔥 하루 한 번 선점');
  assert.match(dv, /claimDailyCount\(today, field, 1\)/, '✨ 그 과목 하루 한 번 선점');
  assert.match(dv, /claim = await claimDailyCount\(today, KOR_DAY\.match, KOR_MATCH\.perDay\)/, '🔤 하루 3판 선점');
  assert.match(dv, /if \(n === 0\) \{\n\s+if \(claim\) \{ try \{ await releaseDailyCount\(today, KOR_DAY\.match\)/, '다른 창이 먼저 끝낸 판은 보상 없음 · 몫을 돌려줌');
  assert.match(dv, /guardStart\('korean'/, '⏳ 국어 시간이 다 됐으면 잠금 화면부터');
  assert.match(read('js/match.js'), /root\.classList\.toggle\('is-kor', k === 'kor'\)/);
  assert.match(read('index.html'), /id="match-title"/);
  assert.match(read('js/calm.js'), /const QUIET_IDS = \['match'\];/, '🌿 국어 음악은 짝 맞추기 동안 쉼(제 음악이 있다)');
  assert.match(read('css/style.css'), /\.match\.is-kor #match-left \{ flex: 0 0 30%; \}/);
  const db = read('js/db.js');
  assert.match(db, /'korStreak', 'korDayBonus', 'nsDayBonus', 'korMatches',/);
  assert.match(db, /out\.korMatch = mergeMatched\(cur\.korMatch, rec\.korMatch\);/);
  const sw = read('sw.js');
  for (const f of ['korday.js', 'kormatch.js', 'kordayview.js']) assert.ok(sw.includes(`'./js/${f}'`), f);
  assert.match(read('js/rewardlog.js'), /🔤 낱말 이어 주기 \$\{num\(d\.korMatches\)\}판/);
});

// ───────────── 🔍 Codex 133차 — 주기를 진짜로 불러 본다 (가짜 저장소 · 저장·읽기 실패 흉내) ─────────────

test('🔥·✨ korDayDone — 지난 기록을 못 읽으면 🔥를 선점하지 않음(✨는 받음) → 다음에 바른 날 수 · 같은 날 두 번째는 없음 · 논술은 ✨만 (#1·#2)', async () => {
  await initProfile();
  const today = todayKey();
  for (const n of [1, 2, 3]) await applyDailyDelta(keyAdd(today, -n), { nsRounds: 1 }); // ⭐ 논술 연습만 한 사흘(프로필에는 안 남는 날)
  const c0 = Number(getProfileSnapshot().coins) || 0;
  fakeIdb.failNextRead('daily');
  const a = await korDayDone('korean');
  assert.equal(a.streak, null, '못 읽었으면 「첫날」로 확정하지 않는다');
  assert.equal(a.bonus, subjectBonus(today, 'korean'), '✨는 지난 기록과 상관없이');
  let d = await getDaily(today);
  assert.equal(Number(d.korStreak) || 0, 0, '🔥 몫을 잡지 않았다 — 다음에 다시');
  assert.equal(d.korDayBonus, 1);
  const b = await korDayDone('korean');
  assert.deepEqual(b.streak, { days: 4, xp: streakBonus(4), coin: streakCoins(4) }, '복구 뒤 바른 날 수(4일째)');
  assert.equal(b.bonus, null, '✨는 그날 한 번');
  const c = await korDayDone('nonsul');
  assert.equal(c.streak, null, '🔥는 국어·논술 합쳐 하루 한 번');
  assert.equal(c.bonus, subjectBonus(today, 'nonsul'));
  const e = await korDayDone('nonsul');
  assert.deepEqual(e, { streak: null, bonus: null });
  d = await getDaily(today);
  assert.deepEqual([d.korStreak, d.korDayBonus, d.nsDayBonus], [1, 1, 1]);
  const coin = (x) => Number(x && x.give && x.give.coin) || 0;
  assert.equal((Number(getProfileSnapshot().coins) || 0) - c0, streakCoins(4) + coin(a.bonus) + coin(c.bonus), '💰 = 🔥 + ✨ 코인');
  assert.equal(fakeIdb.failsLeft(), 0);
});

test('🔤 settleKorMatch — 하루 몫을 먼저 · 다른 창이 먼저 끝낸 판은 몫을 돌려줌 · 몫 저장이 막혀도 줌 · 낱말 저장이 막혀도 줌(다음에 또 나옴) · 오늘 판을 다 썼으면 낱말만 (#1)', async () => {
  await initProfile();
  const today = todayKey();
  const ids = (k) => [1, 2, 3, 4, 5].map((i) => `p:K${k}:w${i}`);
  const has = (list) => list.every((id) => Object.hasOwn(korMatchMap(), id));
  const n = async () => Number((await getDaily(today)).korMatches) || 0;
  assert.deepEqual(await settleKorMatch(ids(1), 0), { xp: 30, coin: 5 });
  assert.equal(await n(), 1);
  assert.ok(has(ids(1)));
  assert.equal(await settleKorMatch(ids(1), 0), null, '같은 판을 또(다른 창이 먼저 끝냄) — 보상 없음');
  assert.equal(await n(), 1, '잡은 몫은 돌려줬다');
  fakeIdb.failNext('daily');
  assert.deepEqual(await settleKorMatch(ids(2), 1), { xp: 20, coin: 3 }, '몫 저장이 막혀도 아이 잘못은 아니다');
  assert.ok(has(ids(2)));
  assert.equal(await n(), 1);
  fakeIdb.failNext('profile');
  assert.deepEqual(await settleKorMatch(ids(3), 3), { xp: 10, coin: 2 }, '낱말 저장이 막혀도 준다');
  assert.ok(!ids(3).some((id) => Object.hasOwn(korMatchMap(), id)), '표시가 안 됐으니 그 낱말은 다음에 또 나온다');
  assert.equal(await n(), 2);
  await applyDailyDelta(today, { korMatches: KOR_MATCH.perDay - 2 });
  assert.equal(await settleKorMatch(ids(4), 0), null, '오늘 판을 다 씀(다른 창) — 보상 없음');
  assert.ok(has(ids(4)), '이은 낱말은 표시');
  assert.equal(await n(), KOR_MATCH.perDay);
  assert.equal(fakeIdb.failsLeft(), 0);
});

/** 작은 가짜 화면 — match.js가 쓰는 만큼만 */
function fakeDom() {
  const els = {};
  const mk = (tag = 'div') => {
    const set = new Set();
    const e = {
      tagName: tag, children: [], dataset: {}, style: {}, hidden: false, inert: false, attrs: {}, listeners: {}, textContent: '', className: '',
      classList: { add: (...c) => c.forEach((x) => set.add(x)), remove: (...c) => c.forEach((x) => set.delete(x)), toggle: (c, on) => { if (on === undefined ? !set.has(c) : on) set.add(c); else set.delete(c); }, contains: (c) => set.has(c) },
      appendChild(c) { this.children.push(c); return c; },
      setAttribute(k, v) { this.attrs[k] = v; },
      addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); },
      focus() {},
      querySelector() { return null; },
      getBoundingClientRect() { return { left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 }; },
    };
    Object.defineProperty(e, 'innerHTML', { set() { e.children = []; }, get() { return ''; } });
    return e;
  };
  globalThis.document = { hidden: false, getElementById: (id) => (els[id] = els[id] || mk()), createElement: mk, createElementNS: (ns, t) => mk(t) };
  globalThis.window = { addEventListener() {}, removeEventListener() {} };
  return els;
}

test('🔤 판이 어떻게 닫히든 국어 화면을 되살림 — 영어 쪽이 접음 · 다른 판으로 바뀜 · 계속하기 · 원래 막혀 있었으면 그대로 · 영어 판은 제 제목으로 (#4)', async () => {
  await initProfile();
  fakeIdb.put('daily', { ...(await getDaily(todayKey())), korMatches: 0 }); // 앞 시험이 오늘 판을 다 썼다 — 새 날처럼
  const els = fakeDom();
  initMatch();
  const view = document.getElementById('view-korean');
  const items = [1, 2, 3, 4, 5].map((i) => ({ word: `낱말${i}`, meaning: `뜻${i}`, id: `p:K9:w${i}` }));
  const round = { items, ids: items.map((x) => x.id), mons: [] };
  const got = [];
  assert.equal(openKorMatch(round, 'view-korean', (rw) => got.push(rw)), true);
  assert.equal(view.inert, true);
  assert.equal(els.match.hidden, false);
  assert.ok(els.match.classList.contains('is-kor'));
  assert.equal(els['match-title'].textContent, '🔤 낱말 이어 주기');
  closeMatch(); // 영어 closeMedia처럼
  assert.equal(view.inert, false, '영어 쪽이 접어도');
  assert.equal(els.match.hidden, true);
  assert.deepEqual(got, [], '끝낸 게 아니니 보상 없음');
  openKorMatch(round, 'view-korean', (rw) => got.push(rw));
  assert.equal(view.inert, true);
  openMatch({ items, kind: 'en' }); // 다른 판으로 바뀜
  assert.equal(view.inert, false, '다른 판으로 바뀌어도');
  assert.equal(els['match-title'].textContent, '🔤 단어 이어 주기');
  assert.ok(!els.match.classList.contains('is-kor'));
  closeMatch();
  openKorMatch(round, 'view-korean', (rw) => got.push(rw));
  for (const f of els['match-continue'].listeners.click) f();
  assert.equal(view.inert, false, '계속하기');
  for (let k = 0; k < 50 && !got.length; k++) await new Promise((r) => setTimeout(r, 20));
  assert.deepEqual(got, [{ xp: 30, coin: 5 }]);
  view.inert = true; // 이미 다른 까닭으로 막혀 있던 화면
  openKorMatch(round, 'view-korean', () => {});
  closeMatch();
  assert.equal(view.inert, true, '원래 값으로 되돌림(풀어 버리지 않음)');
  delete globalThis.document;
  delete globalThis.window;
});

test('✨ 홈 — 그린 날이 지나면 다시 그림(1초 시계 · 자정에 한 번 울림) · 그린 적이 없으면 아니다 (#3)', () => {
  assert.equal(homeStale('2099-01-01'), false, '그린 적이 없으면');
  const home = read('js/home.js');
  assert.match(home, /homeDay = todayKey\(\); \/\/ 먼저 적는다/);
  assert.match(home, /return !!homeDay && homeDay !== today;/);
  const app = read('js/app.js');
  assert.match(app, /const homeDayTick = \(\) => \{ if \(!views\.home\.hidden && homeStale\(\)\) renderHome\(showView\)\.catch\(\(\) => \{\}\); \};/);
  assert.match(app, /onTick: \(\) => \{ refreshChips\(\); noteStudyPlays\(\); homeDayTick\(\); \}/);
  assert.match(read('js/timelimit.js'), /if \(dayKey\(\) !== clock\.today\) \{ ensureToday\(\)/, '자정을 넘기면 시계가 오늘을 다시 읽고 onTick을 부른다');
});
