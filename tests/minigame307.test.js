// 🎮 게임기 미니 게임 (v307 · 2026-10-21 진우 "게임기로 게임도 돼?" → 아버님 "모두 다 만들고 싶어") — node --test tests/minigame307.test.js
// 판 규칙(과목별 공부 20분에 1판 · 과목마다 2판 · 그날만 · 🔒 부모 판) · 판 쓰기 트랜잭션(두 창 · 공부 시간이 끝) · 하루 기록 병합 ·
// 💗·최고 기록(gameEndRule · 진짜 저장 경로) · 🕳️ 디그다 엔진(가짜 시계로 끝까지) · 화면 연결(출처 글) · 📤 사용 기록 줄
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GAME_MIN, GAME_CAP, BONUS_MAX, GAMES, gameById, gameMinOf, gameCapOf, gameConfOf, earnedPlays, usedPlays, playState, playLimit } from '../js/minigame.js';
import { DIG_SEC, DIG_HOLES, ZAP_MS, DIG_KINDS, digPace, digKind, digStart, digTick, digTap, digShift, runDig } from '../js/gamedig.js';
import { MOOD_LINE, GAME_DEVICE } from '../js/gameview.js';
import { playOf, copyPlay, mergePlay, bestOf, gameEndRule, playRule, SCORE_MAX } from '../js/homeplay.js';
import { LOOK_BASE } from '../js/avatar.js';
import { FIRST_ROOM, furnById } from '../js/house.js';
import { emptyProfile, cloneProfile, mergeStatRecord, mergeDailyDelta, emptyDaily, claimDailyCount, releaseDailyCount, getDaily } from '../js/db.js';
import { initProfile, flushProfile, reloadProfile, gameEnd, gameBest, getProfileSnapshot } from '../js/xp.js';
import { PLACES, OVERLAYS, placeNow } from '../js/usage.js';
import { usageFiles } from '../js/upload.js';

const src = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const R = FIRST_ROOM;
const T = 1_700_000_000_000;
const DAY = 86_400_000;
const FROG = 658;
const MIN = 60;
const made = () => ({ made: true, gifted: true, look: { ...LOOK_BASE }, name: '', spot: { room: R, x: 6, y: 5 }, at: T });
const GAME = { u: 2, id: 'f_game', x: 5, y: 0 };
const TV = { u: 1, id: 'f_tv', x: 3, y: 2 };
const pf = (extra = {}) => cloneProfile({
  ...emptyProfile(), coins: 500, items: { f_tv: 1, f_game: 1 }, caught: { [FROG]: 1 }, partner: FROG,
  house: { started: true, seq: 20, rooms: [{ id: R, wall: '', floor: '', items: [TV, GAME] }] }, avatar: made(), ...extra,
});
/** 오늘 기록 — 분으로 */
const day = (m = {}) => ({ ...emptyDaily('2026-10-21'), mathTime: (m.math || 0) * MIN, enTime: (m.en || 0) * MIN, korTime: (m.kor || 0) * MIN, gameBonus: m.bonus || 0, gamePlays: m.used || 0 });
/** 정해진 차례로 도는 rng (시험이 늘 같게) */
function seeded(seed = 7) {
  let x = seed >>> 0;
  return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 2 ** 32; };
}

// ───────────────────── 판 규칙 ─────────────────────

test('🎮 아버님이 정한 값: 공부 15분에 1판 · 하루 12판(v307 과목마다 20분·2판 → v328 과목 합쳐 15분·하루 12판) · 게임기 가구는 f_game · 첫 게임은 🕳️ 디그다 잡기 30초', () => {
  assert.equal(GAME_MIN, 15);
  assert.equal(GAME_CAP, 12);
  assert.equal(GAME_DEVICE, 'f_game');
  assert.ok(furnById(GAME_DEVICE), '집 가구에 있다');
  assert.equal(GAMES[0].id, 'dig', '첫 게임은 디그다 (v308부터 더 늘어난다 — minigame308)');
  assert.equal(gameById('dig').sec, DIG_SEC);
  assert.equal(DIG_SEC, 30);
  assert.equal(gameById('nope'), null);
  for (const g of GAMES) assert.match(g.id, /^[a-z]{2,12}$/, '최고 기록 열쇠 꼴(homeplay GAME_KEY)과 같게');
});

// v328 판 규칙(과목 합쳐 15분 · 하루 12판 · 설명 줄)의 자세한 시험은 tests/minigame328.test.js

test('🎮 하루에 받은 판 — 과목을 합친 공부 시간 · 🔒 부모 판 · 아직 저장 안 한 초까지 · 끝(max)', () => {
  const c = { min: 20, cap: 2 };
  assert.deepEqual(earnedPlays(day({ en: 120 }), c), { sec: 120 * MIN, study: 2, bonus: 0, total: 2, max: 2, next: 0 }, '⚙ 상한 2판이면 2시간이어도 2판');
  assert.deepEqual(earnedPlays(day({ math: 25, bonus: 2 }), c), { sec: 25 * MIN, study: 1, bonus: 2, total: 3, max: 4, next: 15 * MIN });
  assert.equal(earnedPlays(day({ math: 19 }), c, { math: 60 }).study, 1, '⏳ 시계가 아직 저장 안 한 1분이 더해져 20분');
  assert.equal(earnedPlays(day({ bonus: 999 }), c).bonus, BONUS_MAX, '깨진 큰 부모 판은 끝에서 자른다');
  assert.equal(earnedPlays(null, c).total, 0, '오늘 기록이 없으면 0');
  assert.equal(usedPlays(day({ used: 3 })), 3);
  assert.equal(usedPlays({ gamePlays: -2 }), 0);
});

test('🎮 게임기 첫 화면의 형편 — 남은 판 · 공부하고 오면 · 오늘은 끝 · 쉬는 중 (맨 위 말에는 셈 없이 — 셈은 설명 줄이)', () => {
  const c = { min: 20, cap: 2 };
  const pick = (st) => ({ left: st.left, mood: st.mood });
  assert.deepEqual(pick(playState(day({ math: 45 }), c)), { left: 2, mood: 'ready' });
  assert.deepEqual(pick(playState(day({ math: 25, used: 1 }), c)), { left: 0, mood: 'study' }, '더 하면 더 생긴다');
  assert.deepEqual(pick(playState(day({ math: 45, used: 2 }), c)), { left: 0, mood: 'done' });
  assert.deepEqual(pick(playState(day({ math: 45, used: 9 }), c)), { left: 0, mood: 'done' }, '쓴 판이 더 많아도(다른 기기) 음수 없음');
  assert.deepEqual(pick(playState(day({ math: 100 }), { min: 20, cap: 0 })), { left: 0, mood: 'rest' });
  assert.deepEqual(pick(playState(day({ bonus: 1 }), { min: 20, cap: 0 })), { left: 1, mood: 'ready' }, '쉬는 중이어도 부모 판은 쓴다');
  // 맨 위 한 줄(MOOD_LINE)에는 숫자가 없다 — 몇 분·몇 판은 v328 설명 줄(statusLines·ruleLines)이
  for (const [k, line] of Object.entries(MOOD_LINE)) assert.ok(!/\d/.test(line), `${k}: ${line}`);
  assert.deepEqual(Object.keys(MOOD_LINE).sort(), ['done', 'ready', 'rest', 'study']);
});

test('🎮 ⚙ 값 고쳐 읽기 — 분 5~120(비었으면 15) · 판 0~20(비었으면 12)', () => {
  assert.equal(gameMinOf(undefined), 15);
  assert.equal(gameMinOf(''), 15);
  assert.equal(gameMinOf('abc'), 15);
  assert.equal(gameMinOf(0), 15, '0분은 끝없는 판이 되니 기본값으로');
  assert.equal(gameMinOf(3), 5);
  assert.equal(gameMinOf('30'), 30);
  assert.equal(gameMinOf(999), 120);
  assert.equal(gameCapOf(undefined), 12);
  assert.equal(gameCapOf(''), 12);
  assert.equal(gameCapOf(-1), 12);
  assert.equal(gameCapOf(0), 0, '0판은 뜻이 있다(게임기 쉼)');
  assert.equal(gameCapOf('9'), 9);
  assert.equal(gameCapOf('99'), 20);
  assert.deepEqual(gameConfOf(null), { min: 15, cap: 12 });
});

// ───────────────────── 판 쓰기 (진짜 저장 경로 — 오늘 기록 트랜잭션) ─────────────────────

test('★ 🎮 판 쓰기: 끝은 저장된 오늘 공부 시간으로 다시 셈 · 두 창이 동시에 눌러도 받은 판만큼 · 옛 백업으로 쓴 판을 되살리지 못함', async () => {
  await getDaily('2026-01-01'); // 저장소 열기
  const D = '2026-10-21';
  fakeIdb.put('daily', { ...emptyDaily(D), mathTime: 30 * MIN });
  const lim = playLimit({ min: 15, cap: 12 });
  const rs = await Promise.all([1, 2, 3].map(() => claimDailyCount(D, 'gamePlays', lim)));
  assert.deepEqual(rs.map((r) => r.won).sort(), [false, true, true], '받은 판(30분 → 2판)만큼만');
  assert.equal(fakeIdb.get('daily', D).gamePlays, 2);
  // 다른 창이 공부 시간을 더 적었으면 그다음 판은 된다 (끝을 트랜잭션 안에서 다시 셈 · 과목을 합쳐 30 + 16 = 46분 → 3판)
  fakeIdb.put('daily', { ...fakeIdb.get('daily', D), enTime: 16 * MIN });
  assert.equal((await claimDailyCount(D, 'gamePlays', lim)).won, true);
  assert.equal((await claimDailyCount(D, 'gamePlays', lim)).won, false);
  // 오늘 기록이 없는 날 — 공부 0분이면 판 없음
  assert.equal((await claimDailyCount('2026-10-22', 'gamePlays', lim)).won, false);
  // 저장이 실패하면 쓴 판이 안 늘어난다(화면은 "한 번 더 눌러 봐요")
  fakeIdb.put('daily', { ...emptyDaily('2026-10-23'), korTime: 20 * MIN });
  fakeIdb.failNext('daily');
  await assert.rejects(() => claimDailyCount('2026-10-23', 'gamePlays', lim));
  assert.equal(fakeIdb.get('daily', '2026-10-23').gamePlays, 0);
  // 하루 기록 병합 — 쓴 판·부모 판·게임 화면 초는 큰 쪽 (옛 백업을 넣어 판을 되살리지 못함)
  const cur = { ...emptyDaily(D), gamePlays: 3, gameBonus: 1, uGame: 50 };
  const old = { ...emptyDaily(D), gamePlays: 0, gameBonus: 0, uGame: 10 };
  const m = mergeStatRecord('daily', cur, old);
  assert.deepEqual([m.gamePlays, m.gameBonus, m.uGame], [3, 1, 50]);
  assert.equal(mergeDailyDelta(cur, D, { gameBonus: 1 }).gameBonus, 2, '🔒 +1판은 증분');
  for (const k of ['gamePlays', 'gameBonus', 'uGame']) assert.equal(emptyDaily(D)[k], 0, k);
});

// ───────────────────── 💗·최고 기록 ─────────────────────

test('🎮 최고 기록 — 있을 때만 칸 · 깨진 값·모르는 열쇠는 뺀다 · 병합은 큰 쪽 · 복사본은 따로', () => {
  assert.deepEqual(playOf({ days: {}, bond: {} }), { days: {}, bond: {} }, '최고 기록이 없으면 옛 모양 그대로');
  assert.deepEqual(playOf({ best: { dig: 12, Bad: 5, x: 3, run: -1, jump: '7', race: 1e9 } }).best, { dig: 12, race: SCORE_MAX });
  assert.equal(playOf({ best: { Bad: 5 } }).best, undefined);
  assert.deepEqual(mergePlay({ best: { dig: 12 } }, { best: { dig: 9, run: 4 } }).best, { dig: 12, run: 4 });
  assert.deepEqual(mergePlay({ days: { f_tv: 3 } }, { best: { dig: 5 } }), { days: { f_tv: 3 }, bond: {}, best: { dig: 5 } });
  assert.equal(bestOf({ best: { dig: 12 } }, 'dig'), 12);
  assert.equal(bestOf(null, 'dig'), 0);
  assert.equal(bestOf({ best: { dig: 12 } }, 'constructor'), 0);
  const a = { best: { dig: 3 } };
  const c = copyPlay(a);
  c.best.dig = 9;
  assert.equal(a.best.dig, 3);
});

test('🎮 한 판 끝 규칙 — 💗는 게임기로 하루 한 번(playRule 그대로) · 최고 기록은 늘기만 · 파트너가 없어도 기록 · 💰·스톤 그대로', () => {
  const p = pf();
  const a = gameEndRule(p, R, 2, 'dig', 15, T);
  assert.equal(a.ok, true);
  assert.equal(a.kind, 'f_game');
  assert.equal(a.heart, true);
  assert.deepEqual([a.best, a.prevBest, a.newBest], [15, 0, true]);
  const b = gameEndRule(p, R, 2, 'dig', 10, T + 1000);
  assert.deepEqual([b.heart, b.best, b.prevBest, b.newBest], [false, 15, 15, false], '같은 날 두 번째 💗 없음 · 낮은 점수는 기록을 안 내림');
  const c = gameEndRule(p, R, 2, 'dig', 22, T + DAY);
  assert.deepEqual([c.heart, c.best, c.newBest], [true, 22, true], '다음 날은 또 💗');
  assert.equal(p.homePlay.best.digh, 22, '새 난이도 기록 열쇠 (v351)');
  assert.equal(p.homePlay.best.dig, undefined, '쉬울 때 열쇠는 안 건드린다');
  assert.deepEqual([p.coins, p.items.f_game, p.xp || 0], [500, 1, 0], '경제는 그대로');
  // 점수 자르기
  assert.equal(gameEndRule(pf(), R, 2, 'dig', 1e9, T).best, SCORE_MAX);
  for (const bad of [-3, 2.5, NaN, '9']) assert.equal(gameEndRule(pf(), R, 2, 'dig', bad, T).best, 0, String(bad));
  // 파트너가 없어도 기록은 남는다 (💗만 없음)
  const q = pf({ partner: null });
  const r = gameEndRule(q, R, 2, 'dig', 8, T);
  assert.deepEqual([r.ok, r.heart, r.mon, r.best], [true, false, null, 8]);
  assert.equal(q.homePlay.best.digh, 8);
  // 못 하는 경우 — 모르는 게임 · 캐릭터 없음 · 게임기가 그 방에 없음
  assert.deepEqual(gameEndRule(pf(), R, 2, 'Dig!', 5, T), { ok: false, why: 'game' });
  assert.equal(gameEndRule(pf({ avatar: undefined }), R, 2, 'dig', 5, T).why, 'made');
  assert.equal(gameEndRule(pf(), R, 9, 'dig', 5, T).why, 'gone');
  // playRule 그 자체는 바뀌지 않았다 (📺 등 다른 기기)
  assert.equal(playRule(pf(), R, 1, T).heart, true);
});

const stored = () => fakeIdb.get('profile', 'me');
test('★ 🎮 한 판 끝 저장 경로: 💗·최고 기록이 저장된 프로필에 · 두 창이 동시에 끝내도 💗 한 번 · 저장이 실패하면 없던 일', async () => {
  await initProfile();
  await flushProfile();
  const cur = stored() || emptyProfile();
  fakeIdb.put('profile', { ...pf(), updatedAt: (cur.updatedAt || 0) + 1 });
  await reloadProfile();
  const rs = await Promise.all([gameEnd(R, 2, 'dig', 12), gameEnd(R, 2, 'dig', 20)]);
  assert.deepEqual(rs.map((r) => r.heart).sort(), [false, true]);
  assert.equal(stored().homePlay.best.digh, 20);
  assert.equal(stored().homePlay.bond[FROG], 1);
  assert.equal(gameBest('dig'), 20, '창의 프로필도');
  const s0 = stored();
  fakeIdb.failNext('profile');
  const f = await gameEnd(R, 2, 'dig', 99);
  assert.deepEqual(f, { ok: false, why: 'save' });
  assert.deepEqual(stored().homePlay, s0.homePlay);
  assert.equal(getProfileSnapshot().homePlay.best.digh, 20, '메모리로 성공한 척하지 않는다');
  assert.deepEqual([stored().coins, stored().items.f_game], [500, 1], '경제는 그대로');
});

// ───────────────────── 🕳️ 디그다 엔진 ─────────────────────

test('🕳️ 빠르기 — 끝으로 갈수록 빨라진다 · 나오는 것: 닥트리오 12% · 찌리리공은 3초 뒤부터 20% (v351 — 진우 「너무 쉬워요」 — 나와 있는 동안 1.3→0.8초 · 15%였다)', () => {
  assert.deepEqual(digPace(0), { gap: 850, stay: 1100 });
  assert.deepEqual(digPace(DIG_SEC * 1000), { gap: 500, stay: 650 });
  assert.deepEqual(digPace(99e9), digPace(DIG_SEC * 1000), '끝을 넘어도 그대로');
  for (let ms = 0; ms < DIG_SEC * 1000; ms += 1000) assert.ok(digPace(ms + 1000).gap <= digPace(ms).gap);
  assert.equal(digKind(0.05, 0), 'dugtrio');
  assert.equal(digKind(0.2, 2999), 'diglett', '3초 전엔 찌리리공 없음');
  assert.equal(digKind(0.2, 3000), 'voltorb');
  assert.equal(digKind(0.5, 9000), 'diglett');
  assert.deepEqual([digKind(0.3199, 9000), digKind(0.32, 9000)], ['voltorb', 'diglett'], '찌리리공 20% 경계');
  assert.deepEqual(Object.fromEntries(Object.entries(DIG_KINDS).map(([k, v]) => [k, [v.id, v.pts, !!v.zap]])), { diglett: [50, 1, false], dugtrio: [51, 3, false], voltorb: [100, 0, true] });
});

test('🕳️ 한 판을 가짜 시계로 끝까지 — 한 구멍에 하나 · 판 끝을 안 넘음 · 끝나면 다 들어감 · 찌리리공은 3초 뒤 · 나온 수가 알맞음', () => {
  for (const seed of [1, 7, 42, 2026, 99999]) {
    const rng = seeded(seed);
    const s = digStart(0);
    const all = [];
    for (let t = 0; t <= DIG_SEC * 1000 + 2000; t += 50) {
      const r = digTick(s, t, rng);
      all.push(...r.added);
      const holes = s.up.map((m) => m.hole);
      assert.equal(new Set(holes).size, holes.length, `seed ${seed} t ${t}: 한 구멍에 둘`);
      for (const m of s.up) { assert.ok(m.hole >= 0 && m.hole < DIG_HOLES); assert.ok(m.until <= s.end); }
    }
    assert.equal(s.up.length, 0, `seed ${seed}: 끝나면 다 들어감`);
    assert.ok(all.length >= 35 && all.length <= 60, `seed ${seed}: 나온 수 ${all.length}`);
    assert.ok(all.every((m) => m.kind !== 'voltorb' || m.at >= 3000), `seed ${seed}: 찌리리공은 3초 뒤`);
    assert.ok(all.every((m) => m.at < s.end));
    assert.ok(all.filter((m) => m.kind === 'diglett').length > all.length / 2, `seed ${seed}: 디그다가 가장 많다`);
  }
});

test('🕳️ 누르기 — 디그다 +1 · 닥트리오 +3 · 찌리리공 찌릿(1초 못 누름 · 점수 그대로) · 빈 구멍은 아무것도 안 깎음 · 끝나면 안 됨', () => {
  const s = digStart(0);
  s.up = [
    { n: 1, hole: 0, kind: 'diglett', at: 0, until: 1000 },
    { n: 2, hole: 1, kind: 'dugtrio', at: 0, until: 1000 },
    { n: 3, hole: 2, kind: 'voltorb', at: 0, until: 5000 },
    { n: 4, hole: 3, kind: 'diglett', at: 0, until: 5000 },
  ];
  assert.deepEqual(digTap(s, 0, 100), { kind: 'hit', mon: { n: 1, hole: 0, kind: 'diglett', at: 0, until: 1000 }, pts: 1 });
  assert.equal(digTap(s, 0, 110).kind, 'miss', '누른 것은 바로 들어간다 — 두 번 못 받음');
  assert.equal(digTap(s, 1, 120).pts, 3);
  assert.equal(s.score, 4);
  assert.equal(digTap(s, 8, 130).kind, 'miss');
  assert.equal(s.score, 4, '빈 구멍은 안 깎음');
  assert.equal(digTap(s, 2, 200).kind, 'zap');
  assert.equal(s.score, 4, '찌릿은 점수를 안 깎는다');
  assert.equal(digTap(s, 3, 200 + ZAP_MS - 1).kind, 'zapped', '찌릿 동안은 못 누름');
  assert.equal(digTap(s, 3, 200 + ZAP_MS).kind, 'hit');
  assert.deepEqual([s.score, s.hits, s.zaps], [5, 3, 1]);
  s.up.push({ n: 5, hole: 4, kind: 'diglett', at: 0, until: 1300 });
  assert.equal(digTap(s, 4, 1300).kind, 'miss', '들어갈 때가 된 것은 못 잡음 (찌릿은 1200에 끝)');
  assert.equal(digTap(s, 4, s.end).kind, 'over');
  assert.equal(ZAP_MS, 1000);
});

test('🕳️ 앱을 내렸다 돌아오면 남은 시간 그대로 (digShift) — 0·깨진 값은 그대로', () => {
  const s = digStart(1000);
  s.up = [{ n: 1, hole: 0, kind: 'diglett', at: 1200, until: 2200 }];
  s.zapUntil = 1500;
  digShift(s, 5000);
  assert.deepEqual([s.t0, s.end, s.next, s.zapUntil, s.up[0].at, s.up[0].until], [6000, 6000 + DIG_SEC * 1000, 6500, 6500, 6200, 7200]);
  const before = JSON.stringify(s);
  digShift(s, 0); digShift(s, -9); digShift(s, NaN);
  assert.equal(JSON.stringify(s), before);
  const z = digStart(0);
  digShift(z, 100);
  assert.equal(z.zapUntil, 0, '찌릿이 없었으면 0 그대로');
});

// ───────────────────── 화면 연결 · 📤 ─────────────────────

test('🎮 화면 연결 — 🎮 게임하기는 게임기 화면으로 · 판 없이 닫으면 걷지 않음 · 집을 닫으면 게임기도 · 판을 쓰는 곳은 게임을 고를 때 한 곳', () => {
  const hv = src('js/houseview.js');
  assert.match(hv, /if \(it\.id === GAME_DEVICE\) \{[\s\S]{0,400}await openGames\(\{ roomId: rid, u: it\.u, hero: heroOf\(\) \}\)/);
  assert.match(hv, /if \(!live\(\) \|\| !g \|\| !g\.played\) return;/);
  assert.match(hv, /closeGames\(\);[^\n]*\n\s*closePlay\(\);/, 'closeHouse가 게임기 화면도 닫는다');
  assert.match(hv, /day: dayNum\(Date\.now\(\)\), score,/, '방 장면에 진짜 점수');
  const gv = src('js/gameview.js');
  assert.equal((gv.match(/await claimDailyCount\(/g) || []).length, 1, '판을 쓰는 곳은 하나');
  assert.match(gv, /day = clockDay\(\);\n\s*let r = null;\n\s*try \{ r = await claimDailyCount\(day, 'gamePlays', playLimit\(gameConf\(\)\)\)/);
  assert.match(gv, /await ensureToday\(\);[\s\S]{0,120}await flushTime\(\)/, '판을 쓰기 전에 날 바꾸기·모아 둔 초 저장');
  assert.ok(gv.includes("playNoteStep(seen, clockDay(), `${conf.min}:${conf.cap}`, n) && itemCount(GAME_DEVICE) > 0) {\n    toast(`🎮 게임 1판이 생겼어요! (공부 ${conf.min}분마다 한 판)`);"), '게임기를 가졌을 때만 알림');
  assert.match(gv, /if \(!isReady\(\)\) return;/, '오늘 기록을 읽기 전엔 기준을 안 잡는다');
  const app = src('js/app.js');
  assert.match(app, /onTick: \(\) => \{ refreshChips\(\); noteStudyPlays\(\);( homeDayTick\(\);)? \}/); // v329: 홈 ✨ 칩 자정 다시 그리기도 같은 시계에
  const ps = src('js/playshow.js');
  assert.match(ps, /Number\.isSafeInteger\(o\.score\) && o\.score >= 0 \? o\.score :/);
  // 💰·스톤과 안 이어진다 — 게임 파일들은 코인·가방을 만지지 않는다
  for (const f of ['js/minigame.js', 'js/gamedig.js', 'js/gameview.js']) {
    const t = src(f);
    assert.ok(!/coins|addCoins|applyPurchase|items\[/.test(t), `${f}에 💰·가방 없음`);
  }
});

test('🎮 ⚙ 설정·서비스워커·📤 사용 기록', () => {
  const html = src('index.html');
  for (const id of ['set-game-min', 'set-game-cap', 'set-game-bonus', 'set-game-today']) assert.match(html, new RegExp(`id="${id}"`), id);
  const pl = src('js/player.js');
  assert.match(pl, /gameMin: gameMinOf\(settings\.gameMin\), gameCap: gameCapOf\(settings\.gameCap\)/, 'timeLimitConf로 시계에');
  assert.match(pl, /settings\.gameMin = gameMinOf\(\$\('set-game-min'\)\.value\)/);
  const sw = src('sw.js');
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(sw) || [])[1]) >= 307, 'sw v307 이상 (판을 못 박으면 다음 판에서 깨진다)');
  for (const f of ['minigame.js', 'gameview.js', 'gamedig.js']) assert.ok(sw.includes(`'./js/${f}'`), f);
  // 🕒 사용 기록 — 게임기 화면은 집 위에 뜬다(집보다 먼저 본다)
  assert.ok(PLACES.some((p) => p.key === 'game' && p.field === 'uGame'));
  const gi = OVERLAYS.findIndex((o) => o.place === 'game');
  assert.ok(gi >= 0 && gi < OVERLAYS.findIndex((o) => o.place === 'house'));
  assert.equal(placeNow('home', (id) => id === 'game' || id === 'house'), 'game');
  // 📤 usage 줄 — 쓴 판 · 부모 판 (아이 화면엔 안 보인다)
  const text = usageFiles([{ ...emptyDaily('2026-10-21'), appOpens: 1, gamePlays: 3, gameBonus: 1 }, { ...emptyDaily('2026-10-20'), appOpens: 1 }], '2026-10-21', PLACES)[0].text;
  assert.match(text, /- 10-21: [^\n]*🎮 게임 3판 \(🔒 부모 \+1판\)/);
  assert.ok(!/- 10-20: [^\n]*🎮/.test(text), '안 한 날은 줄 없음');
});

// ───────────────────── 🔍 Codex 113차 ─────────────────────

test('🔍 Codex 113차 #1 — 쓴 판 돌려주기: 하나만 · 0 아래로는 안 내려감 · 기록이 없는 날 · 저장 실패면 그대로', async () => {
  await getDaily('2026-01-01'); // 저장소 열기
  const D = '2026-11-01';
  fakeIdb.put('daily', { ...emptyDaily(D), mathTime: 45 * MIN, gamePlays: 2, enTime: 7 });
  const a = await releaseDailyCount(D, 'gamePlays');
  assert.deepEqual([a.released, a.count, fakeIdb.get('daily', D).gamePlays], [true, 1, 1]);
  assert.equal(fakeIdb.get('daily', D).enTime, 7, '다른 칸은 그대로');
  await releaseDailyCount(D, 'gamePlays');
  const z = await releaseDailyCount(D, 'gamePlays');
  assert.deepEqual([z.released, z.count, fakeIdb.get('daily', D).gamePlays], [false, 0, 0], '0 아래로는 안 내려간다');
  const none = await releaseDailyCount('2026-11-02', 'gamePlays');
  assert.deepEqual([none.released, none.count], [false, 0]);
  assert.equal(fakeIdb.get('daily', '2026-11-02'), undefined, '없는 날을 만들지 않는다');
  // 쓰고 돌려주면 다시 쓸 수 있다 (받은 판 2)
  const lim = playLimit({ min: 20, cap: 2 });
  assert.equal((await claimDailyCount(D, 'gamePlays', lim)).won, true);
  assert.equal((await claimDailyCount(D, 'gamePlays', lim)).won, true);
  assert.equal((await claimDailyCount(D, 'gamePlays', lim)).won, false);
  await releaseDailyCount(D, 'gamePlays');
  assert.equal((await claimDailyCount(D, 'gamePlays', lim)).won, true, '돌려받은 판은 다시 쓴다');
  fakeIdb.failNext('daily');
  await assert.rejects(() => releaseDailyCount(D, 'gamePlays'));
  assert.equal(fakeIdb.get('daily', D).gamePlays, 2, '저장 실패면 그대로');
});

test('🔍 Codex 113차 #1·#2 — 게임기 흐름: 그림은 판을 쓰기 전 · 쓰기 바로 앞에서 열려 있나 · 시작 못 한 판은 돌려줌 · 시작한 판은 닫혀도 정산 · 그 판의 기록만', () => {
  const gv = src('js/gameview.js');
  const body = gv.slice(gv.indexOf('async function startRound('), gv.indexOf('/** 끝 화면'));
  assert.ok(body.length > 200);
  const at = (s) => { const i = body.indexOf(s); assert.ok(i >= 0, s); return i; };
  // v308부터 그림 준비는 게임마다의 prep(디그다는 artFor) — 차례는 그대로
  assert.ok(at('await R.prep();') < at('await claimDailyCount('), '그림 → 판 쓰기 차례');
  assert.match(body, /const prep = await R\.prep\(\);\n\s*if \(!live\(\)\) return;[^\n]*\n[\s\S]{0,160}?day = clockDay\(\);\n\s*let r = null;\n\s*try \{ r = await claimDailyCount\(day,/, '판을 쓰기 바로 앞에서 열려 있나');
  assert.match(body, /spent = !!\(r && r\.won\);\n\s*if \(!live\(\)\) return;/, '쓰는 사이에 닫혔으면 돌아간다(finally가 돌려줌)');
  assert.match(body, /if \(!spent \|\| started\) return;/, '시작한 판은 안 돌려준다');
  assert.match(body, /\} finally \{\n\s*await giveBack\(\);\n\s*\}/);
  assert.match(body, /const run = R\.run\(stage, \{ \.\.\.prep, hero: ctx\.hero \}\);\n\s*started = true;/);
  // 시작한 판은 닫혀도 정산 — run.done과 gameEnd 사이에 "닫혔으면 돌아감"이 없다
  // (v312: 🤼 「누구랑?」에서 그만둔 unplayed 판만 정산 없이 돌려주고 돌아간다 — 그 블록 다음부터 · minigame312)
  const unplayedEnd = body.indexOf('\n    }\n', at('if (res && res.unplayed) {'));
  const settle = body.slice(unplayedEnd, at('await gameEnd('));
  assert.ok(unplayedEnd > at('const res = await run.done;') && !/live\(\)/.test(settle), '정산 전에 돌아가지 않는다');
  assert.match(body, /await gameEnd\(ctx\.roomId, ctx\.u, id, res\.score(\)|, g\.clock \? res\.sec \|\| 0 : 0\))/); // v339 — ⏱️ 게임은 걸린 시간도 (minigame339)
  assert.ok(!/ui\.sum\b/.test(body.slice(body.indexOf('const sum = ui.sum;') + 20)), '판을 시작한 뒤로는 그 판의 기록(sum)만 — 다시 연 화면의 ui.sum을 안 건드린다');
  assert.ok(!/ui\.ctx\b/.test(body.slice(body.indexOf('const ctx = ui.ctx') + 20)));
  // ✕ — 판 도중엔 여기까지 · 저장하는 잠깐은 안 먹음
  assert.match(gv, /if \(ui\.view === 'play' && ui\.run\) \{ ui\.run\.stop\(\); return; \}[^\n]*\n\s*if \(ui\.view === 'play'\) return;/);
});

/** 🕳️ 화면 시험용 가짜 화면 — runDig가 쓰는 것만 (만들기 · 붙이기 · 꼴 · 듣기) */
class FakeEl {
  constructor(tag) { this.tagName = String(tag).toUpperCase(); this.className = ''; this.children = []; this.listeners = {}; this.style = { setProperty() {} }; this.attrs = {}; this.textContent = ''; this.html = ''; }
  get classList() {
    const list = () => this.className.split(/\s+/).filter(Boolean);
    const set = (a) => { this.className = a.join(' '); };
    return {
      add: (...c) => set([...new Set([...list(), ...c])]),
      remove: (...c) => set(list().filter((x) => !c.includes(x))),
      toggle: (c, on) => { const want = on === undefined ? !list().includes(c) : !!on; set(want ? [...new Set([...list(), c])] : list().filter((x) => x !== c)); return want; },
      contains: (c) => list().includes(c),
    };
  }
  set innerHTML(v) { this.html = String(v); this.children = []; }
  get innerHTML() { return this.html; }
  get offsetWidth() { return 100; }
  appendChild(c) { this.children.push(c); c.parent = this; return c; }
  append(...cs) { for (const c of cs) this.appendChild(c); }
  setAttribute(k, v) { this.attrs[k] = v; }
  addEventListener(type, f) { (this.listeners[type] ||= []).push(f); }
  fire(type) { for (const f of this.listeners[type] || []) f({ preventDefault() {} }); }
  getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((x) => x !== this); }
}
/** 가짜 화면·가짜 시계를 깔고 runDig 한 판 → { stage, h, doc, adv, holes, flush, state() } */
function digWorld(t, o = {}) {
  const doc = { hidden: false, listeners: {}, createElement: (tag) => new FakeEl(tag),
    addEventListener(type, f) { (this.listeners[type] ||= []).push(f); },
    removeEventListener(type, f) { this.listeners[type] = (this.listeners[type] || []).filter((x) => x !== f); },
    fire(type) { for (const f of [...(this.listeners[type] || [])]) f(); } };
  let clock = 1000;
  const realPerf = globalThis.performance;
  Object.defineProperty(globalThis, 'performance', { value: { now: () => clock }, configurable: true, writable: true });
  globalThis.document = doc;
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  t.after(() => { Object.defineProperty(globalThis, 'performance', { value: realPerf, configurable: true, writable: true }); delete globalThis.document; });
  const stage = new FakeEl('div');
  const h = runDig(stage, { rng: seeded(o.seed || 3) });
  const st = { over: null };
  h.done.then((r) => { st.over = r; });
  const holes = () => stage.children[0].children[1].children;
  const ups = () => holes().filter((x) => x.classList.contains('is-up'));
  const adv = (ms, each) => { for (let k = 0; k < ms; k += 50) { clock += 50; t.mock.timers.tick(50); if (each) each(); } };
  const flush = () => new Promise((r) => setImmediate(r));
  return { stage, h, doc, adv, holes, ups, flush, st, now: () => clock };
}

test('🔍 Codex 113차 #3 — 「준비!」 동안 앱을 내렸다 40초 뒤 돌아와도 30초가 그대로 (가짜 화면·가짜 시계)', async (t) => {
  const w = digWorld(t);
  w.adv(400);
  w.doc.hidden = true;
  w.doc.fire('visibilitychange'); // 「준비!」 0.4초에 앱을 내림
  let hiddenUps = 0;
  w.adv(40000, () => { hiddenUps = Math.max(hiddenUps, w.ups().length); });
  await w.flush();
  assert.equal(w.st.over, null, '보이지 않는 동안 판이 끝나지 않는다');
  assert.equal(hiddenUps, 0, '숨은 동안 디그다도 안 나온다');
  w.doc.hidden = false;
  w.doc.fire('visibilitychange');
  let seen = 0;
  w.adv(3000, () => { seen = Math.max(seen, w.ups().length); });
  assert.ok(seen > 0, '돌아오면 디그다가 나온다');
  // 나온 디그다를 하나 톡 — 점수가 오른다
  let hit = false;
  w.adv(5000, () => {
    if (hit) return;
    const up = w.ups().find((x) => /is-(diglett|dugtrio)/.test(x.children[1].children[0].className));
    if (up) { up.fire('pointerdown'); hit = true; }
  });
  assert.ok(hit);
  assert.match(w.stage.children[0].children[0].children[0].textContent, /^⭐ [13]$/);
  w.adv(21000); // 돌아온 뒤 29초
  await w.flush();
  assert.equal(w.st.over, null, '돌아온 뒤로 30초가 아직 안 지났다');
  w.adv(2500);
  await w.flush();
  assert.ok(w.st.over && w.st.over.quit === false, '그다음 끝까지 간다');
  assert.equal((w.doc.listeners.visibilitychange || []).length, 0, '끝나면 듣기를 뗀다');
});

test('🔍 Codex 113차 #3 — 판 도중 내렸다 돌아오면 남은 시간 그대로', async (t) => {
  const w = digWorld(t, { seed: 9 });
  w.adv(10800); // 시작(0.8초) 뒤 10초
  w.doc.hidden = true; w.doc.fire('visibilitychange');
  w.adv(15000);
  w.doc.hidden = false; w.doc.fire('visibilitychange');
  w.adv(19500); // 판 시간으로 29.5초
  await w.flush();
  assert.equal(w.st.over, null, '숨은 15초는 판 시간에 안 든다');
  w.adv(2000);
  await w.flush();
  assert.ok(w.st.over && w.st.over.quit === false);
});

test('🔍 Codex 113차 #3 — 「준비!」 때 그만두면 판이 안 열리고 듣기도 뗀다', async (t) => {
  const v = digWorld(t);
  v.adv(300);
  v.h.stop();
  await v.flush();
  assert.deepEqual(v.st.over, { score: 0, quit: true });
  v.adv(3000);
  assert.equal(v.ups().length, 0, '그만둔 판은 열리지 않는다');
  assert.equal((v.doc.listeners.visibilitychange || []).length, 0);
});
