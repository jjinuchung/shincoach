// 🎮 보상 쪽 기록 · 📤 올리기 실패 기록 (v278, 2026-10-17 아버님 "빠져 있는 기록 두 가지에 대해서도 진행하자") 테스트: node --test tests/reward278.test.js
// ① reward/날짜.md — 지금 가진 것 + 최근 7일 날마다 (그날 마지막으로 올릴 때의 누적 − 그 앞에 기록이 있는 날) · 보상 화면에 새 셈을 끼우지 않는다
// ② usage/upload-log.md — 실패할 때마다 이 기기에 적어 두었다가 다음에 올릴 때 · 같은 날 같은 까닭은 한 줄
// 숫자는 모두 지어낸 것
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rewardSnap, putSnap, rewardText, holdingLines, SNAP_KEYS, SNAP_DAYS } from '../js/rewardlog.js';
import { addFail, uploadLogText, gatherFiles, whyOf, LOG_DAYS } from '../js/upload.js';
import { cloneProfile, emptyProfile, evolveRule } from '../js/db.js';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const T = '2026-10-18';
const at = (d, h, m) => new Date(2026, 9, d, h, m).getTime(); // 10월 d일 h:m (이 기기 시간대)

const P = {
  coins: 300, coinsEarned: 500, throws: 20, catches: 8, stonesSpent: 4, rocketWon: 1, rocketLost: 2,
  caught: { 7: 3, 25: 1, 1: 0 },
  mons: { 7: { lv: 3, candy: 2, candyUsed: 1, sold: 1, traded: 1 }, 8: { lv: 5, evo: 2 }, 9: { lv: '1e309', candy: '1e309' } },
  items: { stone_math: 2, stone_english: 1, greatball: 3, potion: 0, ticket_wild2: 1, ticket_bell: 1, nope: 5 },
  eggs: [{ subject: 'math', hatchedAt: 0 }, { subject: 'english', hatchedAt: 99 }],
};

test('🎮 누적 한 벌: 프로필이 이미 쌓는 값만 — 도감 종(0마리는 뺌)·레벨 칸 합·진화·판 수·교환·사탕 받음/씀 · 깨진 값은 0', () => {
  assert.deepEqual(rewardSnap(P), {
    throws: 20, catches: 8, kinds: 2, coinsEarned: 500, coins: 300, stonesSpent: 4, lvSum: 2 + 4 + 11, evoSum: 2,
    rocketWon: 1, rocketLost: 2, sold: 1, traded: 1, candyGot: 2, candyUsed: 1,
  });
  // (lv '1e309'는 lvOf가 만렙 12로 읽는다 — 레벨은 원래 그렇게 읽힌다 · 사탕 '1e309'는 0)
  assert.deepEqual(Object.keys(rewardSnap({})).sort(), SNAP_KEYS.map(([k]) => k).sort(), '보여 줄 칸과 같은 열쇠');
  assert.ok(Object.values(rewardSnap(null)).every((v) => v === 0));
});

test('🎮 이 기기에 적어 두기: 오늘 것을 넣고 최근 SNAP_DAYS일만 · 날짜 꼴이 아닌 것은 버림 · 받은 것을 고치지 않음', () => {
  const old = {};
  for (let d = 1; d <= 12; d += 1) old[`2026-10-${String(d).padStart(2, '0')}`] = { throws: d };
  old.junk = { throws: 1 };
  old['2026-10-13'] = 'x';
  const before = JSON.stringify(old);
  const out = putSnap(old, T, { throws: 99 });
  assert.equal(JSON.stringify(old), before);
  assert.equal(Object.keys(out).length, SNAP_DAYS);
  assert.deepEqual(Object.keys(out).slice(-2), ['2026-10-12', T]);
  assert.ok(!('junk' in out) && !('2026-10-13' in out));
  assert.deepEqual(putSnap(null, T, { throws: 1 }), { [T]: { throws: 1 } });
  // 같은 날 다시 적으면 그날 것만 바뀐다 (그날의 마지막 값)
  assert.equal(putSnap(out, T, { throws: 100 })[T].throws, 100);
});

test('🎮 지금 가진 것: 💰·과목 스톤·🍬·교환권·품는 알 · 가방(스톤·교환권 빼고, 모르는 것·0개 빼고) · 도감·데리고 있는 마릿수(판 것 빼고)', () => {
  const lines = holdingLines(P);
  assert.equal(lines[0], '- 💰 300 · 🔷 2 · 🔶 1 · 🟩 0 · 🍬 1 · 🎟️ 교환권 2장 · 🥚 품는 알 1');
  assert.equal(lines[1], '- 가방: 🔵×3');
  assert.equal(lines[2], '- 도감 2종 · 데리고 있는 포켓몬 2마리 · 레벨 칸 합 17 · 진화 2번', '꼬부기 3 − 판 1 − 교환 1 = 1 · 피카츄 1');
  assert.equal(holdingLines({})[1], '- 가방: (비어 있음)');
});

test('🎮 최근 7일 줄: 기록 없는 날 · 첫 기록 날 · 앞 기록이 며칠 전이면 그날부터 · 💰 남은 돈은 ± · 0인 칸은 뺌 · 배틀·로켓단은 하루 기록에서', () => {
  const s0 = rewardSnap(P);
  let snaps = putSnap({}, '2026-10-14', { ...s0, throws: 5, catches: 1, coins: 100, coinsEarned: 200, lvSum: 15 });
  snaps = putSnap(snaps, '2026-10-15', { ...s0, throws: 5, catches: 1, coins: 100, coinsEarned: 200, lvSum: 15 });
  snaps = putSnap(snaps, '2026-10-16', { ...s0, throws: 12, catches: 4, coins: 380, coinsEarned: 420, lvSum: 15 });
  snaps = putSnap(snaps, T, s0);
  const days = [{ date: '2026-10-18', battles: 2, rocketMath: 1, rocketEn: 1 }, { date: '2026-10-13', battles: 1 }];
  const text = rewardText({ profile: P, snaps, days, today: T });
  const week = text.slice(text.indexOf('## 최근 7일')).trim().split('\n').slice(1);
  assert.deepEqual(week, [
    '- 10-12: (기록 없음)',
    '- 10-13: (기록 없음) · ⚔️ 배틀 1번',
    '- 10-14: (견줄 앞 기록 없음 — 이날부터 적음)',
    '- 10-15: 바뀐 것 없음',
    '- 10-16: 공 던짐 +7 · 잡음 +3 · 공부로 번 💰 +220 · 💰 남은 돈 +280',
    '- 10-17: (기록 없음)',
    '- 10-18 (10-16 기록부터): 공 던짐 +8 · 잡음 +4 · 공부로 번 💰 +80 · 💰 남은 돈 −80 · 레벨 칸 +2 · ⚔️ 배틀 2번 · 🚀 로켓단 나옴 2번',
  ]);
  assert.ok(text.startsWith(`🎮 보상 쪽 기록 (${T})`) && text.includes('## 지금 가진 것') && text.endsWith('\n'));
  // 읽는 법 (Codex 86차): 올린 날 기준 · 열쇠가 없던 날 · 레벨 칸은 진화로 물려받은 것까지 · 누적이 줄면
  const how = text.split('\n')[1];
  assert.ok(how.startsWith('읽는 법: '), '머리 바로 아래 한 줄');
  for (const w of ['올린 날 기준', '열쇠가 없던 날', '진화하면 물려받은 레벨까지', '백업을 되돌렸거나']) assert.ok(how.includes(w), w);
  assert.ok(!text.includes(String.fromCharCode(0xC9C4, 0xC6B0)), '아이 이름 없이');
  // 적어 둔 것이 하나도 없어도
  assert.ok(rewardText({ profile: {}, snaps: null, days: null, today: T }).includes('- 10-18: (기록 없음)'));
});

test('🎮 진화만 해도 레벨 칸은 늘어난다 — 그래서 "레벨업"이 아니라 "레벨 칸"으로 (Codex 86차 P2 · 실제 evolveRule로)', () => {
  const p = cloneProfile({ ...emptyProfile(), caught: { 7: 2 }, mons: { 7: { lv: 5 } } });
  const before = rewardSnap(p);
  assert.equal(evolveRule(p, 7, 8, 100, 1000).ok, true);
  const after = rewardSnap(p);
  assert.deepEqual([after.lvSum - before.lvSum, after.evoSum - before.evoSum], [4, 1], '진화 한 번에 레벨 칸 +4');
  const snaps = putSnap(putSnap({}, '2026-10-17', before), T, after);
  const line = rewardText({ profile: p, snaps, days: [], today: T }).split('\n').find((l) => l.startsWith('- 10-18'));
  assert.equal(line, '- 10-18: 새 도감 +1 · 레벨 칸 +4 · 진화 +1', '어니부기가 도감에 새로 · 물려받은 레벨 4칸 · 진화 1번');
  assert.ok(!/레벨업 \+/.test(line), '"레벨업 +n"으로 읽히지 않게');
});

test('📤 실패 적기: 같은 날 같은 까닭은 한 줄(처음~마지막 · 시도 수) · 다른 까닭은 따로 · 최근 14일 · 30줄 · 깨진 줄은 버림 · 받은 것을 고치지 않음', () => {
  let log = addFail(null, at(18, 7, 12), whyOf(0));
  log = addFail(log, at(18, 9, 40), whyOf(0));
  log = addFail(log, at(18, 21, 3), whyOf(401));
  assert.deepEqual(log.fails.map((f) => [f.day, f.why, f.n]), [[T, '인터넷이 안 돼요', 2], [T, whyOf(401), 1]]);
  const text = uploadLogText(log, T);
  assert.deepEqual(text.trim().split('\n').slice(2), [
    '- 10-18 07:12~09:40 인터넷이 안 돼요 (시도 2번)',
    `- 10-18 21:03 ${whyOf(401)}`,
  ]);
  assert.ok(text.startsWith(`📤 올리기 실패 기록 (최근 ${LOG_DAYS}일 · 이 태블릿)`));
  assert.ok(uploadLogText(null, T).includes(`(최근 ${LOG_DAYS}일 실패 없음)`));
  // 14일 창
  const old = addFail(null, at(1, 10, 0), '옛 실패');
  assert.equal(uploadLogText(old, T).includes('옛 실패'), false, '오늘에서 14일 넘은 것은 글에 안 나온다');
  assert.equal(addFail(old, at(18, 10, 0), '새 실패').fails.some((f) => f.why === '옛 실패'), false, '적을 때도 버린다');
  // 30줄 · 깨진 줄
  let many = { fails: [null, { day: 'x', why: 'a' }, { day: T, why: 3 }] };
  for (let i = 0; i < 40; i += 1) many = addFail(many, at(18, 0, i), `까닭 ${i}`);
  assert.equal(many.fails.length, 30);
  assert.equal(many.fails[29].why, '까닭 39', '새 것을 남긴다');
  const frozen = JSON.stringify(log);
  addFail(log, at(18, 22, 0), whyOf(0));
  assert.equal(JSON.stringify(log), frozen);
  assert.deepEqual(addFail(null, 0, 'x'), { fails: [] }, '시각이 깨졌으면 안 적는다');
  assert.equal(addFail(null, at(18, 1, 0), '').fails[0].why, '까닭 모름');
});

test('📤 gatherFiles: 보상 글·실패 글을 주면 reward/날짜.md · usage/upload-log.md · 보상 글을 못 만들어도 나머지는 그대로 · 안 주면 없음(옛 부름)', async () => {
  const base = { getMath: async () => null, listDaily: async () => [], mathReportText: () => '', asksText: () => '', collectTodo: () => [], today: T };
  const none = await gatherFiles(base);
  assert.ok(!none.some((f) => f.path.startsWith('reward/') || f.path === 'usage/upload-log.md'));
  const files = await gatherFiles({ ...base, getReward: async (today, days) => `보상 ${today} ${days.length}\n`, uploadLog: '실패 없음\n' });
  assert.equal(files.find((f) => f.path === `reward/${T}.md`).text, `보상 ${T} 0\n`);
  assert.equal(files.find((f) => f.path === 'usage/upload-log.md').text, '실패 없음\n');
  const broken = await gatherFiles({ ...base, getReward: async () => { throw new Error('idb'); } });
  assert.ok(!broken.some((f) => f.path.startsWith('reward/')) && broken.some((f) => f.path.startsWith('math/')), '보상 글 하나 때문에 📤 전체가 멈추지 않는다');
  const thrown = await gatherFiles({ ...base, getReward: () => { throw new Error('sync'); } });
  assert.ok(thrown.some((f) => f.path.startsWith('math/')), '바로 던져도');
});

test('🔌 연결: 보내기가 보상 글·실패 글을 넘김 · 실패를 적는 네 곳(열쇠 없음·기록 못 읽음·인터넷 없음·GitHub 실패) · 앱 셸', () => {
  const u = src('js/upload.js');
  const send = u.slice(u.indexOf('async function sendOnce(force) {'), u.indexOf('/** 저절로 보내기'));
  assert.ok(send.includes('getReward: rewardNow, uploadLog: logTextNow(today), today });'));
  assert.match(u, /function logTextNow\(today\) \{\s*try \{ return uploadLogText\(readJson\(LOG_KEY\), today\); \} catch \{ return null; \}/, '실패 글이 깨져도 나머지는 올린다');
  // 깨진 실패 기록도 글로는 던지지 않는다
  assert.doesNotThrow(() => uploadLogText({ fails: [{ day: 5, why: 'a' }, { day: T, why: {} }, { day: T, why: '좋은 줄', first: 'x' }] }, T));
  assert.ok(send.includes("if (!token) { noteFail('열쇠가 없어요');"));
  assert.ok(send.includes('noteFail(fail.why, fail.at);'));
  assert.ok(send.includes("if (!online && !force) { const s = uploadState(); if (!(s && s.ok && s.hash === hash)) noteFail('인터넷이 안 돼요'); }"), '저절로 보낼 때만 — 📊 지금 보내기는 실제 결과에서 한 번 (Codex 86차)');
  assert.ok(send.indexOf("import('./xp.js').then((xp) => xp.flushProfile()).catch(() => {})") >= 0 && send.indexOf('xp.flushProfile()') < send.indexOf('files = await gatherFiles('), '저장을 기다리는 프로필 증분을 먼저 (Codex 86차 B)');
  assert.ok(send.includes('noteFail(res.why, at);'));
  assert.ok(send.indexOf("noteFail('인터넷이 안 돼요')") < send.indexOf('if (!force && !shouldAuto('), '건너뛰기 전에 적는다');
  const rn = u.slice(u.indexOf('async function rewardNow(today, days) {'), u.indexOf('/** 📤 실패 하나를'));
  assert.ok(rn.includes('rl.putSnap(readJson(SNAP_KEY), today, rl.rewardSnap(p))') && rn.includes('localStorage.setItem(SNAP_KEY'), '오늘 누적을 이 기기에 적는다');
  assert.match(src('sw.js'), /'\.\/js\/rewardlog\.js',/, '앱 셸');
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(src('sw.js')) || [])[1]) >= 278);
  // 아이 화면은 그대로 — rewardlog를 부르는 곳은 upload.js뿐
  for (const f of ['js/app.js', 'js/pokedex.js', 'js/shop.js', 'js/catch.js', 'js/marketview.js', 'js/library.js', 'js/math.js']) assert.ok(!src(f).includes('rewardlog'), f);
});
