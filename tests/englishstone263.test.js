// 🔶 영어스톤 덜 힘들게 (v263, 2026-10-15 — 아버님 결정)
//  ① 영상 🔶을 🎤 말해 본 문장 25·50·75·90%마다 나눠 (💰는 90%에 한 번) — tests/englishstone.test.js
//  ② 오늘 따라 말하기를 처음 통과한 문장 30개마다 🔶1, 하루 2개 — 여기(저장소: 문장 목록 · 가방과 한 트랜잭션) · tests/player.logic.test.js(화면 흐름)
//  ③ 복습은 셋 이상 회차면 하나까지 못 넘겨도 🔶 — tests/englishstone.test.js · tests/player.logic.test.js
//  ④ 🎤 칸 옆 눈금 막대 — tests/player.logic.test.js
//  🔍 Codex 74차 — #3 두 창이 같은 문장을 둘로 세지 않게(오늘 기록의 문장 목록) · #4 받은 수와 가방을 한 트랜잭션 · 놓친 몫은 다음에 다시
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { applySpeakStone, speakStoneRule, getDaily, emptyDaily, mergeDailyDelta, mergeStatRecord, cloneProfile, emptyProfile, sentenceKey } from '../js/db.js';
import { SPEAK_STONE, VIDEO_TIERS, STONE_ENGLISH, ENGLISH_STONE_HOW } from '../js/items.js';
import { initProfile, receiveSpeakStone, getProfileSnapshot } from '../js/xp.js';

const D = '2026-10-15';
const SE = STONE_ENGLISH.id;
const read = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const keys = (n, p = 'v') => Array.from({ length: n }, (_, k) => `${p}|${k}`);
const stored = (store, key) => fakeIdb.get(store, key);

test('🎤 하루 기록 — 오늘 처음 통과한 문장은 목록(speakFirstKeys, 합집합) · 받은 🔶은 수(speakStones) · 두 기기 기록을 합쳐도 같은 문장은 한 번 (Codex 74차 #3)', () => {
  const e = emptyDaily(D);
  assert.equal(e.speakStones, 0);
  assert.equal('speakFirst' in e, false, '옛 수 칸은 없다 — 셈은 목록의 길이');
  const m = mergeDailyDelta({ ...e, speakFirstKeys: ['a|1', 'a|2'], speakStones: 1 }, D, { speakFirstKeys: ['a|2', 'b|3'] });
  assert.deepEqual([m.speakFirstKeys, m.speakStones], [['a|1', 'a|2', 'b|3'], 1]);
  // 백업 합치기 — 문장은 합집합(같은 문장은 한 번), 받은 🔶 수는 큰 쪽
  for (const [a, b] of [[{ ...e, speakFirstKeys: ['a|1', 'a|2'], speakStones: 1 }, { ...e, speakFirstKeys: ['a|2', 'c|9'], speakStones: 0 }]]) {
    for (const x of [mergeStatRecord('daily', a, b), mergeStatRecord('daily', b, a)]) {
      assert.deepEqual([[...x.speakFirstKeys].sort(), x.speakStones], [['a|1', 'a|2', 'c|9'], 1]);
    }
  }
});

test('🎤 두 창이 같은 문장을 통과해도 한 번 — 창마다 연 기록(track 둘)이 같은 저장소의 문장 목록에 트랜잭션으로 (Codex 74차 #3 재현: 전에는 둘로 셌다)', async () => {
  const A = await import('../js/track.js?win=a');
  const B = await import('../js/track.js?win=b');
  assert.notEqual(A, B, '따로 연 두 창');
  const item = { id: 'ep263', title: 't' };
  await A.open(item);
  await B.open(item);
  try {
    const cue = { start: 12.5, end: 14, en: 'Hello there.' };
    assert.deepEqual([A.claimSpeakReward(cue), B.claimSpeakReward(cue)], [true, true], '창마다 메모리로는 둘 다 "오늘 처음"');
    const won = await Promise.all([A.claimSpeakFirst(cue), B.claimSpeakFirst(cue)]);
    assert.deepEqual([...won].sort(), [false, true], '목록에는 한 번');
    assert.deepEqual((await getDaily(A.dailyDate())).speakFirstKeys, [sentenceKey('ep263', 12.5)]);
    assert.deepEqual([A.todaySpeakFirst(), B.todaySpeakFirst()], [1, 1], '두 창 모두 저장된 목록으로 센다');
    assert.equal(await A.claimSpeakFirst(cue), false, '같은 창이 다시 불러도 한 번');
    assert.equal(await B.claimSpeakFirst({ start: 20, end: 21, en: 'Bye.' }), true, '다른 문장은 센다');
    assert.deepEqual([A.todaySpeakFirst(), B.todaySpeakFirst()], [1, 2], 'A는 다음 저장 때 맞춰진다 (판정은 저장된 목록)');
    // 저장이 안 되면 안 센다 (한 번 덜 세는 쪽)
    fakeIdb.failNext('daily');
    assert.equal(await A.claimSpeakFirst({ start: 30, end: 31, en: 'x' }), false);
    assert.equal(fakeIdb.failsLeft(), 0);
    assert.equal((await getDaily(A.dailyDate())).speakFirstKeys.length, 2);
    // 몫이 남았나(보기값) — 문턱·하루 상한
    assert.equal(B.speakStoneDue(2, 2), true, '2개마다라면 하나 남음');
    assert.equal(B.speakStoneDue(3, 2), false);
    B.adoptDaily({ ...(await getDaily(B.dailyDate())), speakStones: 1 });
    assert.deepEqual([B.todaySpeakStones(), B.speakStoneDue(2, 2)], [1, false], '받은 오늘 기록을 보기값으로');
  } finally {
    await A.close();
    await B.close();
  }
});

test('🔶 받기 규칙(speakStoneRule) — 문장 30개마다 하나 · 문턱 전에는 없다 · 하루 2개 · 받으면 가방 🔶 +1과 받은 수 +1을 같이', () => {
  const p = cloneProfile(emptyProfile());
  const r0 = speakStoneRule(p, null, D, 30, 2);
  assert.deepEqual([r0.ok, r0.why, r0.daily.date], [false, 'none', D], '기록이 없는 날');
  assert.equal(speakStoneRule(p, { ...emptyDaily(D), speakFirstKeys: keys(29) }, D, 30, 2).ok, false, '29 — 문턱 전');
  const r1 = speakStoneRule(p, { ...emptyDaily(D), speakFirstKeys: keys(30) }, D, 30, 2);
  assert.deepEqual([r1.ok, r1.daily.speakStones, p.items[SE]], [true, 1, 1], '30 → 하나');
  assert.equal(speakStoneRule(p, r1.daily, D, 30, 2).ok, false, '같은 문턱은 한 번');
  const r2 = speakStoneRule(p, { ...r1.daily, speakFirstKeys: keys(75) }, D, 30, 2);
  assert.deepEqual([r2.ok, r2.daily.speakStones, p.items[SE]], [true, 2, 2], '75 — 둘째');
  assert.equal(speakStoneRule(p, { ...r2.daily, speakFirstKeys: keys(200) }, D, 30, 2).ok, false, '하루 2개');
  assert.equal(p.items[SE], 2, '못 받을 때는 가방을 안 건드린다');
  assert.deepEqual(SPEAK_STONE, { every: 30, maxPerDay: 2 });
});

test('🔶 받기(applySpeakStone, 진짜 저장 경로) — 가방과 오늘 기록을 한 트랜잭션: 저장이 안 되면 둘 다 그대로 → 다음에 다시 받는다 · 두 창이 같이 불러도 하나 (Codex 74차 #4)', async () => {
  const D2 = '2026-10-14';
  fakeIdb.put('profile', { ...emptyProfile(), items: { [SE]: 2 }, updatedAt: 5 });
  fakeIdb.put('daily', { ...emptyDaily(D2), speakFirstKeys: keys(30) });
  fakeIdb.failNext('profile');
  await assert.rejects(applySpeakStone(D2, 30, 2));
  assert.equal(fakeIdb.failsLeft(), 0);
  assert.deepEqual([stored('profile', 'me').items[SE], stored('daily', D2).speakStones], [2, 0], '선점만 되고 가방에 없는 틈이 없다');
  const rs = await Promise.all([applySpeakStone(D2, 30, 2), applySpeakStone(D2, 30, 2)]);
  assert.deepEqual(rs.map((r) => r.ok).sort(), [false, true], '두 창 — 하나만');
  assert.equal(rs.find((r) => !r.ok).why, 'none');
  assert.deepEqual([stored('profile', 'me').items[SE], stored('daily', D2).speakStones], [3, 1]);
  assert.ok(stored('profile', 'me').updatedAt > 5, '저장 시각은 앞으로');
  assert.equal(stored('daily', D2).speakFirstKeys.length, 30, '문장 목록은 그대로');
  assert.equal((await applySpeakStone('2026-10-12', 30, 2)).ok, false, '기록이 없는 날');
});

test('🔶 xp.receiveSpeakStone — 받으면 메모리 가방도 저장된 것으로 · 저장이 안 되면 "save"(메모리로 성공한 척하지 않는다) · 다시 부르면 받는다', async () => {
  await initProfile();
  const D3 = '2026-10-13';
  fakeIdb.put('daily', { ...emptyDaily(D3), speakFirstKeys: keys(31) });
  const before = getProfileSnapshot().items[SE] || 0;
  fakeIdb.failNext('profile');
  assert.deepEqual(await receiveSpeakStone(D3, 30, 2), { ok: false, why: 'save' });
  assert.equal(fakeIdb.failsLeft(), 0);
  assert.equal(getProfileSnapshot().items[SE] || 0, before, '메모리 가방도 그대로');
  const r = await receiveSpeakStone(D3, 30, 2);
  assert.deepEqual([r.ok, r.daily.speakStones], [true, 1], '놓친 몫 — 다음에 다시 받는다');
  assert.equal(getProfileSnapshot().items[SE], before + 1);
  assert.equal((await receiveSpeakStone(D3, 30, 2)).why, 'none');
});

test('🔶 화면 연결 — 오늘 첫 말하기 보상일 때만 문장을 적고(bumpSpeakStone) · 받기는 가방과 한 트랜잭션(receiveSpeakStone) · 영상을 열 때 놓친 몫 · 옛 길(따로 선점 → addItem)이 남지 않음', () => {
  const pl = read('js/player.js');
  assert.match(pl, /if \(track\.claimSpeakReward\(cue\)\) \{[\s\S]{0,260}bumpSpeakCombo\(\);[^\n]*\n\s*bumpSpeakStone\(cue\);/, '오늘 첫 말하기 보상 안에서만');
  assert.equal((pl.match(/bumpSpeakStone\(cue\);/g) || []).length, 1, '부르는 곳은 한 곳');
  assert.match(pl, /function bumpSpeakStone\(cue\) \{\s*if \(state\.parentMode\) return;\s*track\.claimSpeakFirst\(cue\)\.then\(\(won\) => \{ if \(won\) checkSpeakStone\(\); \}\)/);
  assert.match(pl, /function checkSpeakStone\(\) \{\s*if \(state\.parentMode \|\| state\.speakStoneBusy \|\| !track\.speakStoneDue\(SPEAK_STONE\.every, SPEAK_STONE\.maxPerDay\)\) return;/);
  assert.match(pl, /receiveSpeakStone\(track\.dailyDate\(\), SPEAK_STONE\.every, SPEAK_STONE\.maxPerDay\)\.then\(\(r\) => \{\s*if \(r && r\.daily\) track\.adoptDaily\(r\.daily\);\s*if \(!r \|\| !r\.ok\) return;/);
  assert.match(pl, /showView\('player'\);\s*checkSpeakStone\(\);/, '영상을 열 때 놓친 몫 (Codex 74차 #4)');
  assert.equal((pl.match(/checkSpeakStone\(\);/g) || []).length, 3, '문장을 적은 뒤 · 영상을 열 때 · 하나 받은 뒤 다시');
  assert.ok(!/claimSpeakStone|bumpSpeakFirst|claimDailyStep/.test(pl + read('js/track.js') + read('js/db.js')), '옛 길이 남지 않게');
  assert.match(read('js/xp.js'), /export async function receiveSpeakStone\(date, every, max\) \{\s*const r = await runProfileOp\(\(\) => applySpeakStone\(date, every, max\), \(\) => \(\{ ok: false, why: 'save' \}\)\);/, '저장 실패를 받은 것으로 만들지 않는다');
  const t = read('js/track.js');
  assert.match(t, /const r = await claimDailyKey\(date, 'speakFirstKeys', key\);[\s\S]{0,80}\} catch \{ return false; \}/, '문장 목록에 트랜잭션으로 · 저장이 안 되면 안 센다');
  const db = read('js/db.js');
  assert.match(db, /const DAILY_LISTS = \['reviewStoneKeys', 'favExtraKeys', 'speakFirstKeys'\];/, '합집합으로 합친다');
  assert.match(db, /'speakSkipBtn', 'speakGaveUp', 'speakCombos',\s*\/\/[^\n]*\n\s*'speakStones'\];/, 'DAILY_SUMS — 받은 수만');
  assert.match(db, /const tx = db\.transaction\(\['profile', 'daily'\], 'readwrite'\);\s*const ps = tx\.objectStore\('profile'\);\s*const ds = tx\.objectStore\('daily'\);[\s\S]{0,200}const r = speakStoneRule\(next, curD, date, every, max\);/, '한 트랜잭션');
});

test('🔶 아이에게 보이는 안내·sw — 받는 곳 한 문장 · 복습 "하나까지"는 셋 이상일 때 · 영상은 눈금마다(짧은 영상은 첫 눈금이 없어 %를 늘어놓지 않음) · 📊 안내의 영상 🔶 범위는 그대로 · sw v263 (Codex 74차 #6)', () => {
  assert.ok(ENGLISH_STONE_HOW.includes('복습을 다 맞히거나(문제가 셋 이상이면 하나는 틀려도 돼요)'));
  assert.ok(ENGLISH_STONE_HOW.includes(`따라 말하기로 그날 처음 통과한 문장이 ${SPEAK_STONE.every}개 모이거나`));
  assert.ok(ENGLISH_STONE_HOW.endsWith('영상을 따라 말해 🎤 막대의 눈금을 넘을 때마다'));
  assert.ok(!/\d+%/.test(ENGLISH_STONE_HOW), '%를 늘어놓지 않는다');
  assert.equal(VIDEO_TIERS[0].steps[0], 0, '짧은 영상은 25%에 없다 — 그래서 막대에서 그 눈금을 숨긴다');
  assert.equal(`${VIDEO_TIERS[0].stone}~${VIDEO_TIERS.at(-1).stone}`, '3~8', '영상 하나의 🔶은 그대로 (나눠 받을 뿐)');
  assert.match(read('js/stats.js'), /🔶는 \$\{ENGLISH_STONE_HOW\} 나와요/);
  assert.match(read('css/style.css'), /\.said-tick\.on \{/);
  assert.ok(+(/const CACHE_VERSION = 'v(\d+)';/.exec(read('sw.js')) || [])[1] >= 263, 'sw v263 이상 (index.html이 바뀌었다)');
});
