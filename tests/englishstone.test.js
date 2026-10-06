// 🔶 영어스톤 늘리기 (2026-10-06): node --test tests/englishstone.test.js
// 왜: 진우 "영어 스톤 구하기가 너무 힘들다 (수학 스톤은 남아돈다)". 아버님 9/22 스톤 결정은 영어스톤을
//     🔁 복습 완주 1 · 받아쓰기·단어 만점 +1 · 에세이 1 · 영상 완주 +3 에서 주기로 했는데, v113은 복습·에세이만 만들었다.
//     → 🏁 영상 끝까지(문장 90%) +3 (영상마다 한 번, 지난 영상도) · 🔁 받아쓰기·단어 만점 +1 (아버님 "이대로 진행")
// 플레이어 흐름(90%를 넘는 순간 · 복습 회차의 셈)은 tests/player.logic.test.js의 🔶 테스트 둘
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { cloneProfile, emptyProfile, videoStoneRule, parcelRule, mergeStatRecord } from '../js/db.js';
import { VIDEO_STONE, VIDEO_PARCEL, VIDEO_PLUS, VIDEO_TIERS, videoParcelId, videoPlusId, videoTier, videoGrant, videoPct, videoStoneDue, parcelOf, STONE_ENGLISH, ENGLISH_STONE_HOW, ENGLISH_STONE_SHORT } from '../js/items.js';
import { videoParcel, stillDue, afterLine, pendingParcels, parcelLabel, COIN_ITEM } from '../js/parcel.js';
import { reviewStones, REWARD } from '../js/review.js';
import { contentSummary } from '../js/stats.js';

const prof = (o = {}) => cloneProfile({ ...emptyProfile(), ...o });
const src = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const SE = STONE_ENGLISH.id;

test('🏁 값: 영상 하나에 🔶 3개 · 끝까지 = 문장 90% (수학 이야기 세계가 열리는 기준과 같다) · 받은 기록 이름은 video:<id>', () => {
  assert.deepEqual(VIDEO_STONE, { n: 3, pct: 90 });
  assert.match(src('js/mathprog.js'), /const SEEN_PCT = 90;/, '📊·수학 세계와 같은 90%');
  assert.equal(videoParcelId('ep1'), 'video:ep1');
  assert.equal(videoParcelId(12), 'video:12');
  assert.equal(VIDEO_PARCEL, 'video:');
  // 진행률은 📊 contentSummary와 같은 셈 (반올림)
  assert.equal(videoPct(0, 0), 0);
  assert.equal(videoPct(9, 10), 90);
  assert.equal(videoPct(179, 200), 90, '89.5% → 90 (📊에 90%로 보인다)');
  assert.equal(videoPct(178, 200), 89);
  const cueCountOf = (it) => it.n;
  for (const [done, total] of [[9, 10], [179, 200], [178, 200], [0, 5], [300, 300]]) {
    const recs = Array.from({ length: done }, (_, k) => ({ itemId: 'a', done: true, key: k }));
    assert.equal(contentSummary([{ id: 'a', title: 't', n: total }], recs, cueCountOf)[0].pct, videoPct(done, total), `${done}/${total}`);
  }
});

test('🏁 영상 길이별 보상 (v201) — 짧은 💰50 🔶3 · 중간 💰100 🔶5 · 긴 💰200 🔶8 · 🔶은 v197의 3개 포함 · 경계 399/400·799/800', () => {
  assert.deepEqual(VIDEO_TIERS.map((t) => [t.upto, t.coin, t.stone]), [[399, 50, 3], [799, 100, 5], [Infinity, 200, 8]]);
  for (const [n, coin, stone] of [[0, 50, 3], [10, 50, 3], [399, 50, 3], [400, 100, 5], [799, 100, 5], [800, 200, 8], [1400, 200, 8], ['x', 50, 3]]) {
    const t = videoTier(n);
    assert.deepEqual([t.coin, t.stone], [coin, stone], `${n}문장`);
  }
  // 처음 끝낸 영상은 둘 다 · v197에 🔶3만 받은 영상은 차액만 · 다 받은 영상은 없음
  assert.deepEqual([videoGrant({ total: 1200, base: true, plus: true }).coins, videoGrant({ total: 1200, base: true, plus: true }).stones], [200, 8]);
  assert.deepEqual([videoGrant({ total: 1200, base: false, plus: true }).coins, videoGrant({ total: 1200, base: false, plus: true }).stones], [200, 5]);
  assert.deepEqual([videoGrant({ total: 300, base: false, plus: true }).coins, videoGrant({ total: 300, base: false, plus: true }).stones], [50, 0], '짧은 영상의 🔶은 v197의 3개로 이미 다');
  assert.deepEqual([videoGrant({ total: 1200, base: false, plus: false }).coins, videoGrant({ total: 1200, base: false, plus: false }).stones], [0, 0]);
  assert.equal(videoPlusId('ep1'), 'videoplus:ep1');
  assert.equal(VIDEO_PLUS, 'videoplus:');
});

test('🏁 받을 영상 고르기(videoStoneDue) — 90% 이상만 · 깨진 영상·다 받은 영상·문장 없는 영상 빼고 · 같은 id는 한 번 · 아직 안 받은 몫(base·plus)과 길이', () => {
  const S = [
    { id: 'a', title: '가', total: 10, pct: 90 },
    { id: 'b', title: '나', total: 10, pct: 89 },
    { id: 'c', title: '다', total: 10, pct: 100, broken: true },
    { id: 'd', title: '라', total: 0, pct: 100 },
    { id: 'e', title: '마', total: 1200, pct: 95 },
    { id: 'a', title: '가 또', total: 10, pct: 100 },
    { id: 7, title: '수 id', total: 5, pct: 100 },
    null, { title: 'id 없음', total: 5, pct: 100 },
  ];
  assert.deepEqual(videoStoneDue(S, {}), [
    { id: 'a', title: '가', total: 10, base: true, plus: true },
    { id: 'e', title: '마', total: 1200, base: true, plus: true },
    { id: '7', title: '수 id', total: 5, base: true, plus: true },
  ]);
  // v197에 🔶3만 받은 영상 — 차액(plus)만 남는다 · 둘 다 받은 영상은 빠진다 (때가 깨져 0이어도 받은 것)
  const got = { 'video:a': 1, 'video:e': 5, 'videoplus:a': 0, 'video:7': 0, 'videoplus:7': 9 };
  assert.deepEqual(videoStoneDue(S, got), [{ id: 'e', title: '마', total: 1200, base: false, plus: true }]);
  assert.deepEqual(videoStoneDue(S, { a: 1, e: 1 }).map((x) => x.id), ['a', 'e', '7'], '구호품 id와는 따로');
  assert.deepEqual(videoStoneDue(null, null), []);
});

test('🏁 받기 규칙(db.videoStoneRule) — 처음이면 길이별 💰·🔶 전부 · v197에 🔶3만 받은 영상은 차액 · 다 받으면 없음 · 여럿을 한 번에 · 다른 구호품 기록은 그대로', () => {
  const p = prof({ items: { [SE]: 2 }, parcels: { p1: 5 }, coins: 10, coinsEarned: 100 });
  const r = videoStoneRule(p, [{ id: 'movie', total: 1200 }], 1000);
  assert.deepEqual(r, { ok: true, ids: ['movie'], items: { [SE]: 8 }, coins: 200 });
  assert.equal(p.items[SE], 10, '가지고 있던 2 + 8');
  assert.deepEqual([p.coins, p.coinsEarned], [210, 300]);
  assert.deepEqual(p.parcels, { p1: 5, 'video:movie': 1000, 'videoplus:movie': 1000 });
  assert.deepEqual(videoStoneRule(p, [{ id: 'movie', total: 1200 }], 2000), { ok: false, why: 'done' }, '두 번째(두 창·두 번)는 없다');
  assert.deepEqual([p.items[SE], p.coins], [10, 210]);
  // v197에 🔶3만 받은 지난 영상(중간 길이) — 💰100 + 🔶2
  const q = prof({ parcels: { 'video:ep': 7 } });
  assert.deepEqual(videoStoneRule(q, [{ id: 'ep', total: 500 }], 3000), { ok: true, ids: ['ep'], items: { [SE]: 2 }, coins: 100 });
  assert.equal(q.parcels['video:ep'], 7, '받은 때는 그대로');
  // 여럿 · 겹친 것·빈 id 빼고 · 길이를 모르면(글자 id) 짧은 영상
  const w = prof();
  const r2 = videoStoneRule(w, [{ id: 'x1', total: 100 }, { id: 'x1', total: 100 }, 'x2', { id: '' }, null, undefined, { id: 7, total: 900 }], 4000);
  assert.deepEqual(r2.ids, ['x1', 'x2', '7']);
  assert.deepEqual([r2.coins, r2.items[SE]], [50 + 50 + 200, 3 + 3 + 8]);
  assert.deepEqual(videoStoneRule(prof(), [], 1), { ok: false, why: 'done' });
  assert.deepEqual(videoStoneRule(prof(), null, 1), { ok: false, why: 'done' });
});

test('🏁 백업 병합 — 받은 영상은 합집합: 옛 백업을 합쳐도 다시 못 받는다 · 아빠 구호품이 video:·videoplus: 이름이면 안 받는다(섞이지 않게)', () => {
  const got = { id: 'me', items: { [SE]: 8 }, coins: 200, parcels: { 'video:ep1': 2000, 'videoplus:ep1': 2000 }, updatedAt: 300 };
  const old = { id: 'me', items: {}, updatedAt: 100 };
  for (const [a, b] of [[got, old], [old, got]]) {
    const m = mergeStatRecord('profile', a, b);
    assert.deepEqual(m.parcels, { 'video:ep1': 2000, 'videoplus:ep1': 2000 });
    assert.equal(videoStoneRule(cloneProfile({ ...emptyProfile(), ...m }), [{ id: 'ep1', total: 1200 }]).why, 'done', '합친 뒤에도 다시 못 받는다');
    assert.deepEqual(videoStoneDue([{ id: 'ep1', title: 't', total: 1200, pct: 100 }], m.parcels), [], '📦 창도 같은 판정');
  }
  assert.equal(parcelOf({ id: 'video:ep9', items: { potion: 1 } }), null, '구호품 이름이 영상 기록 자리를 쓰면 안 받는다');
  assert.equal(parcelOf({ id: 'videoplus:ep9', items: { potion: 1 } }), null);
  assert.ok(parcelOf({ id: 'videogift', items: { potion: 1 } }), '이름이 video로 시작하는 것만은 괜찮다');
  const gifts = JSON.parse(src('coach/gifts.json'));
  assert.ok(gifts.every((g) => !String(g.id).startsWith(VIDEO_PARCEL) && !String(g.id).startsWith(VIDEO_PLUS)));
  assert.equal(parcelRule(prof({ parcels: { 'video:p1': 1 } }), { id: 'p1', items: { potion: 1 } }).ok, true);
  assert.equal(pendingParcels([{ id: 'p1', items: { potion: 1 } }], { 'video:p1': 1 }).length, 1);
});

test('🏁 📦 창 한 칸(videoParcel) — 영상 이름(셋까지 + 외 N편) · 💰·🔶 = 영상마다 길이별 합 · 차액만 남은 영상 · 띄우기 직전에 다시 거르기(stillDue)', () => {
  assert.equal(videoParcel([]), null);
  assert.equal(videoParcel(null), null);
  const one = videoParcel([{ id: 'ep1', title: '피카츄의 모험', total: 1200, base: true, plus: true }]);
  assert.equal(one.kind, 'video');
  assert.deepEqual(one.ids, ['ep1']);
  assert.deepEqual(one.items, { [COIN_ITEM]: 200, [SE]: 8 });
  assert.equal(one.title, '🏁 끝까지 본 영상 1편 — 상이 왔어요!');
  assert.match(one.text, /^「피카츄의 모험」 — 문장을 90% 넘게 했어요\. 긴 영상일수록 💰·🔶이 더 많아요!$/);
  assert.equal(one.icon, '🏁');
  assert.deepEqual(parcelLabel(COIN_ITEM, 200), { emoji: '💰', name: '코인', count: '+200' });
  // v197에 🔶3만 받은 짧은 영상 두 편 → 💰50씩, 🔶 차액 0
  assert.deepEqual(videoParcel([{ id: 's1', title: 'a', total: 300, base: false, plus: true }, { id: 's2', title: 'b', total: 300, base: false, plus: true }]).items, { [COIN_ITEM]: 100 });
  const five = videoParcel(['가', '나', '다', '라', '마'].map((t, k) => ({ id: `e${k}`, title: t, total: 500, base: true, plus: true })));
  assert.deepEqual(five.items, { [COIN_ITEM]: 500, [SE]: 25 });
  assert.match(five.text, /^「가」 · 「나」 · 「다」 외 2편 — /, '이름은 셋까지');
  assert.match(five.title, /영상 5편/);
  // 띄우기 직전 — 다른 창에서 받은 몫은 빼고 칸을 다시 만든다 · 다 받았으면 칸이 없다 · 구호품은 제 이름으로
  const gift = { id: 'p1', items: { potion: 1 } };
  const q = [gift, five];
  const left = stillDue(q, { 'video:e0': 1, 'videoplus:e0': 1, 'video:e1': 1 });
  assert.equal(left.length, 2);
  assert.deepEqual(left[1].ids, ['e1', 'e2', 'e3', 'e4'], 'e1은 차액이 남았다');
  assert.deepEqual(left[1].items, { [COIN_ITEM]: 400, [SE]: 2 + 15 });
  const all = Object.fromEntries(['e0', 'e1', 'e2', 'e3', 'e4'].flatMap((e) => [[`video:${e}`, 1], [`videoplus:${e}`, 1]]));
  assert.deepEqual(stillDue(q, { p1: 1, ...all }), []);
  assert.deepEqual(stillDue(null, {}), []);
  assert.match(afterLine({ [SE]: 3 }, 0), /영어스톤은 🎒 도감에서 영어 포켓몬을 키울 때/, '받은 뒤 어디에 쓰는지');
});

test('🔁 복습 회차의 🔶 (reviewStones) — 전부 통과 1 (다 틀려도 완주만 하면 나오던 길은 그대로 막힘) + 받아쓰기·단어를 다 맞히면 +1', () => {
  assert.equal(REWARD.stone, 1);
  assert.equal(REWARD.dwStone, 1);
  for (const [o, want, why] of [
    [{ fails: 0, dw: 0, dwFails: 0 }, { all: 1, dw: 0 }, '받아쓰기·단어 없는 회차를 전부 통과'],
    [{ fails: 0, dw: 2, dwFails: 0 }, { all: 1, dw: 1 }, '전부 통과 + 받아쓰기·단어 만점 → 2'],
    [{ fails: 1, dw: 1, dwFails: 0 }, { all: 0, dw: 1 }, '따라 말하기에서 미끄러져도 받아쓰기·단어 만점이면 +1'],
    [{ fails: 1, dw: 1, dwFails: 1 }, { all: 0, dw: 0 }, '단어를 틀림'],
    [{ fails: 3, dw: 0, dwFails: 0 }, { all: 0, dw: 0 }, '다 틀린 회차 — 완주만으로는 없다 (Codex 6차)'],
    [{}, { all: 1, dw: 0 }, '빈 값'],
  ]) assert.deepEqual(reviewStones(o), want, why);
  assert.deepEqual(reviewStones(), { all: 1, dw: 0 });
});

test('🔶 화면 연결 — 📦 창이 지난 영상을 챙긴다(앱을 열 때) · [받기]가 영상 트랜잭션 · 저장 실패는 "못 받았어요" · 영상 화면 · 복습 화면이 받은 까닭을 말한다', () => {
  const x = src('js/xp.js');
  assert.match(x, /export async function receiveVideoStones\(list\) \{\s*const r = await runProfileOp\(\(\) => applyVideoStones\(list\), \(\) => \(\{ ok: false, why: 'save' \}\)\);/, '저장 실패를 "받았어요"로 만들지 않는다');
  assert.match(x, /export function videoStoneGot\(itemId\) \{\s*return parcelGot\(profile\.parcels, videoParcelId\(itemId\)\) && parcelGot\(profile\.parcels, videoPlusId\(itemId\)\);/, '둘 다 받아야 다 받은 것 (v197 영상은 차액이 남는다)');
  assert.match(src('js/db.js'), /export function applyVideoStones\(list\) \{\s*return mutateProfile\(\(p\) => videoStoneRule\(p, list\)\);/, '한 트랜잭션');
  const v = src('js/parcel.js');
  assert.match(v, /const vp = videoParcel\(await loadVideoDue\(\)\);[^\n]*\n\s*if \(vp\) queue\.push\(vp\);/, '앱을 열 때 지난 영상도');
  assert.match(v, /return videoStoneDue\(st\.contentSummary\(items, records, st\.cueCountOf\), parcelsReceived\(\)\);/, '📊 진행률과 같은 셈');
  assert.match(v, /queue = stillDue\(queue, parcelsReceived\(\)\);/, '띄우기 직전에 다시 거른다');
  assert.match(v, /try \{ r = cur\.kind === 'video' \? await receiveVideoStones\(cur\.due\.map\(\(d\) => \(\{ id: d\.id, total: d\.total \}\)\)\) : await receiveParcel\(cur\); \}/, '[받기]가 영상 트랜잭션 (길이까지)');
  assert.match(v, /note\.textContent = cur\.text \? `\$\{cur\.icon \|\| '💌'\} \$\{cur\.text\}` : '';/);
  // 영상 몫은 아빠가 보낸 것이 아니다 (헤드리스: 받은 뒤 "고마워요, 아빠!"가 떴다) — 그림 🏁 · 받기 🔶 · 닫기 "좋아요!"
  assert.match(v, /if \(icon\) icon\.textContent = cur\.kind === 'video' \? '🏁' : '📦';/);
  assert.match(v, /ok\.textContent = cur\.kind === 'video' \? '🎁 받기' : '📦 받기';/);
  assert.match(v, /ok\.textContent = cur\.kind === 'video' \? '좋아요!' : '고마워요, 아빠!';/);
  const pl = src('js/player.js');
  assert.match(pl, /track\.done\(cue\);\s*const after = track\.todayDone\(\);\s*maybeVideoStone\(\);/, '문장을 끝낼 때마다');
  assert.match(pl, /if \(videoPct\(track\.doneCount\(\), state\.cues\.length\) < VIDEO_STONE\.pct\) return;/);
  assert.match(pl, /const st = reviewStones\(\{ fails: state\.reviewFails \|\| 0, dw: state\.reviewDw \|\| 0, dwFails: state\.reviewDwFails \|\| 0 \}\);/);
  assert.match(pl, /stoneLeft: practice \? null : track\.reviewStoneRoundsLeft\(\),/);
  const t = src('js/track.js');
  assert.match(t, /claimDailyKey\(date, 'reviewStoneKeys', String\(roundKey \|\| ''\), REVIEW_STONE_ROUNDS\)/, '하루 몇 회차인지 한 곳');
  assert.match(t, /export const REVIEW_STONE_ROUNDS = 2;/);
  const r = src('js/review.js');
  assert.match(r, /if \(given\.stoneAll\) rw\.appendChild\(el\('span', 'review-chip stone', `🔶 영어스톤 \+\$\{given\.stoneAll\} \(전부 통과\)`\)\);/);
  assert.match(r, /if \(given\.stoneDw\) rw\.appendChild\(el\('span', 'review-chip stone', `🔶 영어스톤 \+\$\{given\.stoneDw\} \(받아쓰기·단어 만점\)`\)\);/);
  assert.match(r, /if \(given\.stoneCapped\) rw\.appendChild/);
  assert.match(r, /if \(o\.stoneLeft === 0\) rw\.appendChild\(el\('span', 'review-chip dim', '🔶 복습 영어스톤은 오늘 다 받았어요'\)\);/);
  assert.match(src('css/style.css'), /\.review-chip\.stone \{/);
});

test('🔶 아이에게 보이는 안내 — 영어스톤이 생기는 곳을 한 문장으로 같이 쓴다(🛒 스톤 상점·🏪 5일장·도감·📊) · 다섯 곳이 다 들어 있다 · 옛 말("복습을 끝내면")이 남지 않았다', () => {
  for (const w of ['복습을 다 맞히거나', '받아쓰기·단어', '에세이', '영상을 끝까지', '90%']) assert.ok(ENGLISH_STONE_HOW.includes(w), `${w}`);
  for (const w of ['복습', '받아쓰기·단어', '에세이', '영상']) assert.ok(ENGLISH_STONE_SHORT.includes(w), `${w}`);
  assert.match(src('js/shop.js'), /🔶 영어스톤은 \$\{ENGLISH_STONE_HOW\} 생겨요/);
  assert.match(src('js/marketview.js'), /🔶 영어스톤은 \$\{ENGLISH_STONE_HOW\} 생겨요/);
  assert.match(src('js/pokedex.js'), /🔶 \$\{ENGLISH_STONE_SHORT\}/);
  assert.match(src('js/stats.js'), /🔶는 \$\{ENGLISH_STONE_HOW\} 나와요\(영상은 길이에 따라 \$\{VIDEO_TIERS\[0\]\.stone\}~/);
  for (const f of ['js/shop.js', 'js/marketview.js', 'js/pokedex.js', 'js/stats.js']) {
    const s = src(f);
    assert.ok(!/영어스톤은 복습을 끝내면|복습 완주·에세이|복습 회차를 다 맞히거나 에세이를 쓸 때/.test(s), `${f}: 옛 안내`);
  }
});
