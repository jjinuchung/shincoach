// 🔶 영어스톤 늘리기 (2026-10-06): node --test tests/englishstone.test.js
// 왜: 진우 "영어 스톤 구하기가 너무 힘들다 (수학 스톤은 남아돈다)". 아버님 9/22 스톤 결정은 영어스톤을
//     🔁 복습 완주 1 · 받아쓰기·단어 만점 +1 · 에세이 1 · 영상 완주 +3 에서 주기로 했는데, v113은 복습·에세이만 만들었다.
//     → 🏁 영상 끝까지(문장 90%) +3 (영상마다 한 번, 지난 영상도) · 🔁 받아쓰기·단어 만점 +1 (아버님 "이대로 진행")
// 플레이어 흐름(90%를 넘는 순간 · 복습 회차의 셈)은 tests/player.logic.test.js의 🔶 테스트 둘
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { cloneProfile, emptyProfile, videoStoneRule, parcelRule, mergeStatRecord } from '../js/db.js';
import { VIDEO_STONE, VIDEO_PARCEL, VIDEO_PLUS, VIDEO_STEP, VIDEO_STEPS, VIDEO_TIERS, SPEAK_STONE, videoParcelId, videoPlusId, videoStepId, videoStepPaid, videoTier, videoOwed, videoPct, videoStoneDue, parcelOf, STONE_ENGLISH, ENGLISH_STONE_HOW, ENGLISH_STONE_SHORT } from '../js/items.js';
import { videoParcel, stillDue, afterLine, pendingParcels, parcelLabel, COIN_ITEM } from '../js/parcel.js';
import { reviewStones, reviewSlack, REWARD } from '../js/review.js';
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
  assert.equal(videoPlusId('ep1'), 'videoplus:ep1');
  assert.equal(VIDEO_PLUS, 'videoplus:');
});

test('🎤 눈금마다 나눠 받기(videoOwed, v263) — 25·50·75·90% · 눈금 🔶의 합이 길이별 🔶 · 💰는 90%에 · 받은 기록에서 이미 받은 양을 다시 센다(옛 video:·videoplus:·눈금)', () => {
  assert.deepEqual(VIDEO_STEPS, [25, 50, 75, 90]);
  assert.equal(VIDEO_STEPS.at(-1), VIDEO_STONE.pct, '마지막 눈금 = 끝까지(🏁)');
  for (const t of VIDEO_TIERS) assert.equal(t.steps.reduce((a, b) => a + b, 0), t.stone, `${t.label} 눈금 합`);
  assert.deepEqual(VIDEO_TIERS.map((t) => t.steps), [[0, 1, 1, 1], [1, 1, 1, 2], [2, 2, 2, 2]]);
  assert.equal(videoStepId('ep1', 50, 4), 'videostep:ep1:50:4', '눈금과 그때까지 준 🔶 누적 (Codex 74차 #2)');
  assert.equal(VIDEO_STEP, 'videostep:');
  const o = (v, got = {}) => { const r = videoOwed(v, got); return [r.stones, r.coins, r.step, r.keys.join(' ')]; };
  // 처음 — 긴 영상(1200문장)은 눈금마다 🔶2 · 💰200은 90%에
  assert.deepEqual(o({ id: 'm', total: 1200, pct: 24 }), [0, 0, 0, '']);
  assert.deepEqual(o({ id: 'm', total: 1200, pct: 25 }), [2, 0, 25, 'videostep:m:25:2']);
  assert.deepEqual(o({ id: 'm', total: 1200, pct: 69 }), [4, 0, 50, 'videostep:m:50:4'], '50%를 넘은 영화는 한 번에 둘 — 기록은 넘은 가장 높은 눈금 하나');
  assert.deepEqual(o({ id: 'm', total: 1200, pct: 90 }), [8, 200, 90, 'video:m videoplus:m']);
  // 눈금을 받은 뒤 — 남은 눈금만
  assert.deepEqual(o({ id: 'm', total: 1200, pct: 75 }, { 'videostep:m:50:4': 1 }), [2, 0, 75, 'videostep:m:75:6']);
  assert.deepEqual(o({ id: 'm', total: 1200, pct: 92 }, { 'videostep:m:50:4': 1, 'videostep:m:75:6': 1 }), [2, 200, 90, 'video:m videoplus:m']);
  assert.deepEqual(o({ id: 'm', total: 1200, pct: 60 }, { 'videostep:m:50:4': 1 }), [0, 0, 50, ''], '받은 눈금은 다시 없다');
  // 옛 규칙으로 다 받은 영상(video:·videoplus:) — 더 없다 · v197에 🔶3만 받은 영상 — 눈금 합에서 3을 빼고
  assert.deepEqual(o({ id: 'm', total: 1200, pct: 100 }, { 'video:m': 1, 'videoplus:m': 1 }), [0, 0, 90, '']);
  assert.deepEqual(o({ id: 'm', total: 1200, pct: 50 }, { 'video:m': 1, 'videoplus:m': 1 }), [0, 0, 50, ''], '옛 규칙으로 다 받은 영상 — 🔶 없음');
  assert.deepEqual(o({ id: 'm', total: 1200, pct: 50 }, { 'video:m': 0 }), [1, 0, 50, 'videostep:m:50:4'], 'v197 🔶3 → 50%(4)까지 차액 1 (때가 깨져 0이어도 받은 것) · 누적 4');
  assert.deepEqual(o({ id: 'm', total: 1200, pct: 90 }, { 'video:m': 0, 'videostep:m:50:4': 1 }), [4, 200, 90, 'videoplus:m'], '그 뒤 90% — 8까지 4 + 💰');
  assert.deepEqual(o({ id: 'e', total: 500, pct: 95 }, { 'video:e': 5 }), [2, 100, 90, 'videoplus:e'], 'v201 테스트 그대로 — 중간 영상 💰100 + 🔶2');
  // 짧은 영상 — 25%에는 없다(기록도 안 적는다) · 옛 v197 🔶3이면 90%에 💰만
  assert.deepEqual(o({ id: 's', total: 300, pct: 30 }), [0, 0, 25, '']);
  assert.deepEqual(o({ id: 's', total: 300, pct: 50 }), [1, 0, 50, 'videostep:s:50:1']);
  assert.deepEqual(o({ id: 's', total: 300, pct: 90 }, { 'video:s': 1 }), [0, 50, 90, 'videoplus:s']);
  // 🔍 Codex 74차 #2 — 길이 칸이 바뀌어도(⚙ 문장 합치기로 문장 수가 바뀜) 그때 실제로 준 양으로 센다
  assert.deepEqual(o({ id: 'c', total: 1200, pct: 91 }, { 'videostep:c:50:1': 1 }), [7, 200, 90, 'video:c videoplus:c'], '짧은 칸에서 🔶1 → 긴 칸이 되어 90%: 7 더 (합 8 — 전에는 5)');
  assert.deepEqual(o({ id: 'c', total: 1200, pct: 80 }, { 'videostep:c:50:1': 1 }), [5, 0, 75, 'videostep:c:75:6'], '짧은 칸 🔶1 → 긴 칸 75%: 6까지 5');
  assert.deepEqual(o({ id: 'd', total: 300, pct: 80 }, { 'videostep:d:50:4': 1 }), [0, 0, 75, ''], '긴 칸에서 🔶4 → 짧은 칸 75%: 더 없다 (전에는 1 더)');
  assert.deepEqual(o({ id: 'd', total: 300, pct: 95 }, { 'videostep:d:50:4': 1 }), [0, 50, 90, 'video:d videoplus:d'], '그 뒤 90% — 💰만');
  // 합쳐진 기록 — 누적은 가장 큰 것 · 다른 영상(id에 ':')의 열쇠는 안 섞인다 · 꼴이 틀린 열쇠는 무시
  assert.deepEqual(o({ id: 'm', total: 1200, pct: 76 }, { 'videostep:m:25:2': 1, 'videostep:m:50:4': 1 }), [2, 0, 75, 'videostep:m:75:6']);
  assert.deepEqual(o({ id: 'a', total: 1200, pct: 50 }, { 'videostep:a:25:50:4': 1, 'videostep:a:50': 1, 'videostep:a:x:9': 1 }), [4, 0, 50, 'videostep:a:50:4']);
  assert.equal(videoStepPaid({ 'videostep:a:25:2': 1, 'videostep:a:50:4': 0, 'videostep:ab:75:6': 1 }, 'a'), 4, '받은 때가 0이어도 받은 것 · 다른 영상(ab)은 안 섞인다');
  assert.equal(videoStepPaid({ 'videostep:a:50:4': 1, 'videostep:a:25:2': 1 }, 'a'), 4, '가장 큰 누적 (적힌 차례와 상관없이 — 합친 기록)');
  assert.equal(videoStepPaid(null, 'a'), 0);
  // 수 id · 빈 기록 · 잘못된 pct
  assert.deepEqual(o({ id: 7, total: 900, pct: 25 }, null), [2, 0, 25, 'videostep:7:25:2']);
  assert.deepEqual(o({ id: 'x', total: 900, pct: 'x' }), [0, 0, 0, '']);
});

test('🏁 받을 영상 고르기(videoStoneDue) — 🎤 말해 본 문장(saidPct, v253)으로 지금 받을 몫이 있는 영상만(v263 눈금) · 깨진 영상·문장 없는 영상 빼고 · 같은 id는 한 번', () => {
  const S = [
    { id: 'a', title: '가', total: 10, pct: 90, saidPct: 90 },
    { id: 'b', title: '나', total: 10, pct: 49, saidPct: 49 }, // 짧은 영상 25%는 🔶 없음
    { id: 'c', title: '다', total: 10, pct: 100, saidPct: 100, broken: true },
    { id: 'd', title: '라', total: 0, pct: 100, saidPct: 100 },
    { id: 'e', title: '마', total: 1200, pct: 95, saidPct: 95 },
    { id: 'a', title: '가 또', total: 10, pct: 100, saidPct: 100 },
    { id: 7, title: '수 id', total: 5, pct: 100, saidPct: 100 },
    null, { title: 'id 없음', total: 5, pct: 100, saidPct: 100 },
    { id: 'f', title: '⏭ 많이', total: 1300, pct: 98, saidPct: 58 }, // 영화를 거의 다 봤어도 말해 본 문장 58% → 50%까지 🔶4 (v263)
    { id: 'g', title: '옛 요약', total: 10, pct: 100 }, // saidPct 없음 → 없음
    { id: 'h', title: '조금', total: 1200, pct: 30, saidPct: 20 },
  ];
  assert.deepEqual(videoStoneDue(S, {}), [
    { id: 'a', title: '가', total: 10, pct: 90, stones: 3, coins: 50, step: 90 },
    { id: 'e', title: '마', total: 1200, pct: 95, stones: 8, coins: 200, step: 90 },
    { id: '7', title: '수 id', total: 5, pct: 100, stones: 3, coins: 50, step: 90 },
    { id: 'f', title: '⏭ 많이', total: 1300, pct: 58, stones: 4, coins: 0, step: 50 },
  ]);
  // 받은 기록 — v197에 🔶3만 받은 영상은 차액 · 다 받은 영상은 빠진다 (때가 깨져 0이어도 받은 것) · 받은 눈금은 빠진다
  const got = { 'video:a': 1, 'video:e': 5, 'videoplus:a': 0, 'video:7': 0, 'videoplus:7': 9, 'videostep:f:50:4': 1 };
  assert.deepEqual(videoStoneDue(S, got), [{ id: 'e', title: '마', total: 1200, pct: 95, stones: 5, coins: 200, step: 90 }]);
  assert.deepEqual(videoStoneDue(S, { a: 1, e: 1 }).map((x) => x.id), ['a', 'e', '7', 'f'], '구호품 id와는 따로');
  assert.deepEqual(videoStoneDue(null, null), []);
});

test('🏁 받기 규칙(db.videoStoneRule) — 말해 본 문장 %(pct)로 지금 몫만 · 눈금마다 한 번 · 옛 기록과 겹치지 않음 · 여럿을 한 번에 · 다른 구호품 기록은 그대로', () => {
  const p = prof({ items: { [SE]: 2 }, parcels: { p1: 5 }, coins: 10, coinsEarned: 100 });
  // 긴 영화 50% → 🔶4, 💰 없음
  assert.deepEqual(videoStoneRule(p, [{ id: 'movie', total: 1200, pct: 57 }], 1000), { ok: true, ids: ['movie'], items: { [SE]: 4 }, coins: 0 });
  assert.deepEqual(p.parcels, { p1: 5, 'videostep:movie:50:4': 1000 });
  assert.deepEqual(videoStoneRule(p, [{ id: 'movie', total: 1200, pct: 60 }], 1500), { ok: false, why: 'done' }, '같은 눈금은 다시 없다(두 창·두 번)');
  // 90% → 남은 🔶4 + 💰200
  assert.deepEqual(videoStoneRule(p, [{ id: 'movie', total: 1200, pct: 91 }], 2000), { ok: true, ids: ['movie'], items: { [SE]: 4 }, coins: 200 });
  assert.equal(p.items[SE], 10, '가지고 있던 2 + 4 + 4');
  assert.deepEqual([p.coins, p.coinsEarned], [210, 300]);
  assert.deepEqual(p.parcels, { p1: 5, 'videostep:movie:50:4': 1000, 'video:movie': 2000, 'videoplus:movie': 2000 });
  assert.deepEqual(videoStoneRule(p, [{ id: 'movie', total: 1200, pct: 100 }], 3000), { ok: false, why: 'done' });
  // 처음에 90% — 한 번에 전부(옛 규칙과 같은 양)
  const f = prof();
  assert.deepEqual(videoStoneRule(f, [{ id: 'ep', total: 1200, pct: 90 }], 1), { ok: true, ids: ['ep'], items: { [SE]: 8 }, coins: 200 });
  // v197에 🔶3만 받은 지난 영상(중간 길이)을 끝까지 — 💰100 + 🔶2
  const q = prof({ parcels: { 'video:ep': 7 } });
  assert.deepEqual(videoStoneRule(q, [{ id: 'ep', total: 500, pct: 95 }], 3000), { ok: true, ids: ['ep'], items: { [SE]: 2 }, coins: 100 });
  assert.equal(q.parcels['video:ep'], 7, '받은 때는 그대로');
  // 옛 규칙으로 다 받은 영상은 눈금이 와도 없다
  assert.deepEqual(videoStoneRule(prof({ parcels: { 'video:o': 1, 'videoplus:o': 1 } }), [{ id: 'o', total: 1200, pct: 60 }], 1), { ok: false, why: 'done' });
  // 여럿 · 겹친 것·빈 id 빼고 · 길이를 모르면 짧은 영상 · pct가 없으면 받을 것이 없다
  const w = prof();
  const r2 = videoStoneRule(w, [{ id: 'x1', total: 100, pct: 90 }, { id: 'x1', total: 100, pct: 90 }, 'x2', { id: '' }, null, undefined, { id: 7, total: 900, pct: 77 }, { id: 'x3', total: 900 }], 4000);
  assert.deepEqual(r2.ids, ['x1', '7']);
  assert.deepEqual([r2.coins, r2.items[SE]], [50, 3 + 6]);
  assert.deepEqual(videoStoneRule(prof(), [], 1), { ok: false, why: 'done' });
  assert.deepEqual(videoStoneRule(prof(), null, 1), { ok: false, why: 'done' });
  // 🔍 Codex 74차 #2 — 길이 칸이 바뀐 영상도 받기 규칙에서 합이 맞다 (90%까지)
  const up = prof();
  assert.equal(videoStoneRule(up, [{ id: 'c', total: 300, pct: 55 }], 1).items[SE], 1, '짧은 칸 50% — 🔶1');
  assert.equal(videoStoneRule(up, [{ id: 'c', total: 1200, pct: 80 }], 2).items[SE], 5, '긴 칸이 되어 75% — 6까지 5');
  assert.deepEqual(videoStoneRule(up, [{ id: 'c', total: 1200, pct: 95 }], 3), { ok: true, ids: ['c'], items: { [SE]: 2 }, coins: 200 });
  assert.deepEqual([up.items[SE], up.coins], [8, 200], '짧은 → 긴: 합 8');
  const down = prof();
  assert.equal(videoStoneRule(down, [{ id: 'd', total: 1200, pct: 55 }], 1).items[SE], 4, '긴 칸 50% — 🔶4');
  assert.deepEqual(videoStoneRule(down, [{ id: 'd', total: 300, pct: 80 }], 2), { ok: false, why: 'done' }, '짧은 칸이 되어 75% — 더 없다');
  assert.deepEqual(videoStoneRule(down, [{ id: 'd', total: 300, pct: 95 }], 3), { ok: true, ids: ['d'], items: { [SE]: 0 }, coins: 50 }, '90% — 💰만');
  assert.deepEqual([down.items[SE], down.coins], [4, 50]);
  assert.deepEqual(videoStoneRule(down, [{ id: 'd', total: 1200, pct: 100 }], 4), { ok: false, why: 'done' }, '끝까지 받은 영상은 칸이 다시 바뀌어도 없다');
});

test('🏁 백업 병합 — 받은 영상은 합집합: 옛 백업을 합쳐도 다시 못 받는다 · 아빠 구호품이 video:·videoplus: 이름이면 안 받는다(섞이지 않게)', () => {
  const got = { id: 'me', items: { [SE]: 8 }, coins: 200, parcels: { 'video:ep1': 2000, 'videoplus:ep1': 2000 }, updatedAt: 300 };
  const old = { id: 'me', items: {}, updatedAt: 100 };
  for (const [a, b] of [[got, old], [old, got]]) {
    const m = mergeStatRecord('profile', a, b);
    assert.deepEqual(m.parcels, { 'video:ep1': 2000, 'videoplus:ep1': 2000 });
    assert.equal(videoStoneRule(cloneProfile({ ...emptyProfile(), ...m }), [{ id: 'ep1', total: 1200, pct: 100 }]).why, 'done', '합친 뒤에도 다시 못 받는다');
    assert.deepEqual(videoStoneDue([{ id: 'ep1', title: 't', total: 1200, pct: 100, saidPct: 100 }], m.parcels), [], '📦 창도 같은 판정');
  }
  // 눈금 기록도 합집합 — 옛 백업을 합쳐도 받은 눈금을 다시 못 받는다 (v263)
  const st = { id: 'me', items: { [SE]: 4 }, parcels: { 'videostep:m:50:4': 10 }, updatedAt: 300 };
  for (const [a, b] of [[st, old], [old, st]]) {
    const m = mergeStatRecord('profile', a, b);
    assert.deepEqual(m.parcels, { 'videostep:m:50:4': 10 });
    assert.equal(videoStoneRule(cloneProfile({ ...emptyProfile(), ...m }), [{ id: 'm', total: 1200, pct: 70 }]).why, 'done');
  }
  assert.equal(parcelOf({ id: 'video:ep9', items: { potion: 1 } }), null, '구호품 이름이 영상 기록 자리를 쓰면 안 받는다');
  assert.equal(parcelOf({ id: 'videoplus:ep9', items: { potion: 1 } }), null);
  assert.equal(parcelOf({ id: 'videostep:ep9:25:2', items: { potion: 1 } }), null, '눈금 기록 자리도 (v263)');
  assert.ok(parcelOf({ id: 'videogift', items: { potion: 1 } }), '이름이 video로 시작하는 것만은 괜찮다');
  const gifts = JSON.parse(src('coach/gifts.json'));
  assert.ok(gifts.every((g) => !String(g.id).startsWith(VIDEO_PARCEL) && !String(g.id).startsWith(VIDEO_PLUS) && !String(g.id).startsWith(VIDEO_STEP)));
  assert.equal(parcelRule(prof({ parcels: { 'video:p1': 1 } }), { id: 'p1', items: { potion: 1 } }).ok, true);
  assert.equal(pendingParcels([{ id: 'p1', items: { potion: 1 } }], { 'video:p1': 1 }).length, 1);
});

test('🏁 한계(Codex 74차 #5) — 서로 갈라진 두 기기 백업을 합치면 받은 기록은 합집합인데 가방은 새 쪽을 따른다 → 한쪽에서 받은 🔶이 빠질 수 있다 (옛 백업 되돌리기는 위 테스트처럼 안전 · process.md 한계)', () => {
  const a = { id: 'me', items: { [SE]: 4 }, parcels: { 'videostep:m:50:4': 10 }, updatedAt: 300 }; // 기기 A: 50%에 🔶4
  const b = { id: 'me', items: { [SE]: 1 }, parcels: {}, updatedAt: 400 }; // 기기 B: 그 기록 없이 나중에 저장
  for (const m of [mergeStatRecord('profile', a, b), mergeStatRecord('profile', b, a)]) {
    assert.deepEqual(m.parcels, { 'videostep:m:50:4': 10 }, '받은 기록은 합집합');
    assert.equal(m.items[SE], 1, '가방은 새 쪽 — A에서 받은 🔶4가 없다');
    assert.equal(videoStoneRule(cloneProfile({ ...emptyProfile(), ...m }), [{ id: 'm', total: 1200, pct: 60 }]).why, 'done', '받은 것으로 친다 — 다시 주지 않는다(두 번 주는 쪽보다 낫다)');
  }
});

test('🏁 📦 창 한 칸(videoParcel) — 영상 이름(셋까지 + 외 N편) · 💰·🔶 = 영상마다 지금 몫의 합 · 모두 90%면 🏁, 아니면 🎤 눈금 말(v263) · 띄우기 직전에 다시 거르기(stillDue)', () => {
  assert.equal(videoParcel([]), null);
  assert.equal(videoParcel(null), null);
  const due1 = videoStoneDue([{ id: 'ep1', title: '피카츄의 모험', total: 1200, saidPct: 100 }], {});
  const one = videoParcel(due1);
  assert.equal(one.kind, 'video');
  assert.deepEqual(one.ids, ['ep1']);
  assert.deepEqual(one.items, { [COIN_ITEM]: 200, [SE]: 8 });
  assert.equal(one.title, '🏁 끝까지 본 영상 1편 — 상이 왔어요!');
  assert.match(one.text, /^「피카츄의 모험」 — 문장의 90% 이상을 따라 했어요\. 긴 영상일수록 💰·🔶이 더 많아요!$/);
  assert.equal(one.icon, '🏁');
  assert.deepEqual(parcelLabel(COIN_ITEM, 200), { emoji: '💰', name: '코인', count: '+200' });
  // 눈금 몫(90% 전) — 🎤 · 💰 없음
  const mid = videoParcel(videoStoneDue([{ id: 'ma', title: '영화 가', total: 1300, saidPct: 55 }, { id: 'mb', title: '영화 나', total: 1500, saidPct: 61 }], {}));
  assert.deepEqual(mid.items, { [SE]: 8 });
  assert.equal(mid.title, '🎤 따라 말한 영상 2편 — 상이 왔어요!');
  assert.equal(mid.text, '「영화 가」 · 「영화 나」 — 따라 말해 본 문장이 늘어 🎤 막대의 눈금을 넘었어요. 긴 영상일수록 🔶이 더 많아요!', '눈금마다 나온다고 하지 않는다 — 짧은 영상은 첫 눈금에 없다 (Codex 74차 #6)');
  assert.equal(mid.icon, '🎤');
  // v197에 🔶3만 받은 짧은 영상 두 편 → 💰50씩, 🔶 차액 0
  assert.deepEqual(videoParcel(videoStoneDue([{ id: 's1', title: 'a', total: 300, saidPct: 95 }, { id: 's2', title: 'b', total: 300, saidPct: 95 }], { 'video:s1': 1, 'video:s2': 1 })).items, { [COIN_ITEM]: 100 });
  const five = videoParcel(videoStoneDue(['가', '나', '다', '라', '마'].map((t, k) => ({ id: `e${k}`, title: t, total: 500, saidPct: 90 })), {}));
  assert.deepEqual(five.items, { [COIN_ITEM]: 500, [SE]: 25 });
  assert.match(five.text, /^「가」 · 「나」 · 「다」 외 2편 — /, '이름은 셋까지');
  assert.match(five.title, /영상 5편/);
  assert.equal(videoParcel([{ id: 'z', title: 'z', total: 10, pct: 90, stones: 0, coins: 0 }]), null, '몫이 없는 줄만이면 칸이 없다');
  // 띄우기 직전 — 다른 창에서 받은 몫은 빼고 칸을 다시 만든다 · 다 받았으면 칸이 없다 · 구호품은 제 이름으로
  const gift = { id: 'p1', items: { potion: 1 } };
  const q = [gift, five];
  const left = stillDue(q, { 'video:e0': 1, 'videoplus:e0': 1, 'video:e1': 1 });
  assert.equal(left.length, 2);
  assert.deepEqual(left[1].ids, ['e1', 'e2', 'e3', 'e4'], 'e1은 차액이 남았다');
  assert.deepEqual(left[1].items, { [COIN_ITEM]: 400, [SE]: 2 + 15 });
  const all = Object.fromEntries(['e0', 'e1', 'e2', 'e3', 'e4'].flatMap((e) => [[`video:${e}`, 1], [`videoplus:${e}`, 1]]));
  assert.deepEqual(stillDue(q, { p1: 1, ...all }), []);
  // 눈금 칸도 — 다른 창에서 50%까지 받았으면 남은 것 없음
  assert.deepEqual(stillDue([mid], { 'videostep:ma:50:4': 1, 'videostep:mb:50:4': 1 }), []);
  assert.deepEqual(stillDue([mid], { 'videostep:ma:50:4': 1 })[0].ids, ['mb']);
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
    // 💪 하나까지 괜찮아요 (v263) — 문항이 셋 이상인 회차만
    [{ fails: 1, n: 5 }, { all: 1, dw: 0 }, '다섯 문항 중 하나 못 넘김 → 🔶'],
    [{ fails: 1, n: 3, dw: 1, dwFails: 1 }, { all: 1, dw: 0 }, '셋 중 하나(단어) 못 넘김 → 🔶1 · 받아쓰기·단어 만점은 아님'],
    [{ fails: 1, n: 2 }, { all: 0, dw: 0 }, '두 문항 회차는 하나를 빼 주지 않는다(절반)'],
    [{ fails: 2, n: 5 }, { all: 0, dw: 0 }, '둘 못 넘김 → 없음'],
    [{ fails: 0, n: 1 }, { all: 1, dw: 0 }],
  ]) assert.deepEqual(reviewStones(o), want, why);
  assert.deepEqual(reviewStones(), { all: 1, dw: 0 });
  assert.equal(REWARD.nearMin, 3);
  assert.deepEqual([0, 1, 2, 3, 5, 'x'].map(reviewSlack), [0, 0, 0, 1, 1, 0]);
});

test('🔶 화면 연결 — 📦 창이 지난 영상을 챙긴다(앱을 열 때) · [받기]가 영상 트랜잭션 · 저장 실패는 "못 받았어요" · 영상 화면 · 복습 화면이 받은 까닭을 말한다', () => {
  const x = src('js/xp.js');
  assert.match(x, /export async function receiveVideoStones\(list\) \{\s*const r = await runProfileOp\(\(\) => applyVideoStones\(list\), \(\) => \(\{ ok: false, why: 'save' \}\)\);/, '저장 실패를 "받았어요"로 만들지 않는다');
  assert.match(x, /export function videoStoneOwed\(v\) \{\s*const o = videoOwed\(v, profile\.parcels\);\s*return o\.stones > 0 \|\| o\.coins > 0;/, '받을 몫은 받기와 같은 셈(videoOwed)으로 (v263)');
  assert.match(src('js/db.js'), /export function applyVideoStones\(list\) \{\s*return mutateProfile\(\(p\) => videoStoneRule\(p, list\)\);/, '한 트랜잭션');
  const v = src('js/parcel.js');
  assert.match(v, /const vp = videoParcel\(await loadVideoDue\(\)\);[^\n]*\n\s*if \(vp\) queue\.push\(vp\);/, '앱을 열 때 지난 영상도');
  assert.match(v, /return videoStoneDue\(st\.contentSummary\(items, records, st\.cueCountOf, st\.cueKeysOf\), parcelsReceived\(\)\);/, '📊와 같은 셈 (말해 본 문장은 지금 문장 열쇠로, Codex 65차 #1)');
  assert.match(v, /queue = stillDue\(queue, parcelsReceived\(\)\);/, '띄우기 직전에 다시 거른다');
  assert.match(v, /try \{ r = cur\.kind === 'video' \? await receiveVideoStones\(cur\.due\.map\(\(d\) => \(\{ id: d\.id, total: d\.total, pct: d\.pct \}\)\)\) : await receiveParcel\(cur\); \}/, '[받기]가 영상 트랜잭션 (길이·말해 본 문장 %까지, v263)');
  assert.match(v, /note\.textContent = cur\.text \? `\$\{cur\.icon \|\| '💌'\} \$\{cur\.text\}` : '';/);
  // 영상 몫은 아빠가 보낸 것이 아니다 (헤드리스: 받은 뒤 "고마워요, 아빠!"가 떴다) — 그림 🏁(눈금 몫은 🎤) · 받기 🔶 · 닫기 "좋아요!"
  assert.match(v, /if \(icon\) icon\.textContent = cur\.kind === 'video' \? \(cur\.icon \|\| '🏁'\) : '📦';/);
  assert.match(v, /ok\.textContent = cur\.kind === 'video' \? '🎁 받기' : '📦 받기';/);
  assert.match(v, /ok\.textContent = cur\.kind === 'video' \? '좋아요!' : '고마워요, 아빠!';/);
  const pl = src('js/player.js');
  assert.match(pl, /track\.done\(cue\);\s*\/\/[^\n]*\n\s*if \(!speakNeeded\(cue\)\) track\.said\(cue\);\s*updateSaidCounter\(\);\s*const after = track\.todayDone\(\);\s*maybeVideoStone\(\);/, '문장을 끝낼 때마다 (말하기 확인을 안 하는 줄은 말해 본 문장으로, v253)');
  assert.match(pl, /const v = \{ id: it\.id, total: state\.cues\.length, pct: videoPct\(track\.saidCount\(state\.cues\), state\.cues\.length\) \};/, '🏁·🎤 눈금은 말해 본 문장으로 (v253) · 지금 문장 목록으로 (Codex 65차 #1)');
  assert.ok(!/videoPct\(track\.doneCount\(\)/.test(pl), '한 문장 수로 세는 곳이 남지 않게');
  assert.match(src('js/parcel.js'), /return videoStoneDue\(st\.contentSummary\(items, records, st\.cueCountOf, st\.cueKeysOf\), parcelsReceived\(\)\);/, '📦 창도 contentSummary(saidPct)로');
  assert.match(pl, /const st = reviewStones\(\{ fails: state\.reviewFails \|\| 0, n: state\.reviewN \|\| 0, dw: state\.reviewDw \|\| 0, dwFails: state\.reviewDwFails \|\| 0 \}\);/);
  assert.match(pl, /state\.reviewN = \(items \|\| \[\]\)\.filter\(\(x\) => x && !x\.extra && !\(x\.type === 'sentence' && !speakableCue\(x\.cue\)\)\)\.length;/, '💖 덤을 뺀 문항 수 (v263) · 확인하지 않는 줄도 뺀다 (v292 Codex 98차 ②)');
  assert.match(pl, /stoneLeft: practice \? null : track\.reviewStoneRoundsLeft\(\),/);
  const t = src('js/track.js');
  assert.match(t, /claimDailyKey\(date, 'reviewStoneKeys', String\(roundKey \|\| ''\), REVIEW_STONE_ROUNDS\)/, '하루 몇 회차인지 한 곳');
  assert.match(t, /export const REVIEW_STONE_ROUNDS = 2;/);
  const r = src('js/review.js');
  assert.match(r, /if \(given\.stoneAll\) rw\.appendChild\(el\('span', 'review-chip stone', `🔶 영어스톤 \+\$\{given\.stoneAll\} \(\$\{given\.stoneNear \? '하나 빼고 다 통과' : '전부 통과'\}\)`\)\);/);
  assert.match(r, /reviewSlack\(o\.items\.filter\(\(it\) => it && !it\.extra\)\.length\) \? '🔶 하나까지 틀려도 영어스톤 \+1' : '🔶 다 맞히면 영어스톤 \+1'/, '시작 화면 — 셋 이상 회차만 "하나까지" (v263)');
  assert.match(pl, /reward\.stoneNear = won && st\.all > 0 && \(state\.reviewFails \|\| 0\) > 0;/);
  assert.match(r, /if \(given\.stoneDw\) rw\.appendChild\(el\('span', 'review-chip stone', `🔶 영어스톤 \+\$\{given\.stoneDw\} \(받아쓰기·단어 만점\)`\)\);/);
  assert.match(r, /if \(given\.stoneCapped\) rw\.appendChild/);
  assert.match(r, /if \(o\.stoneLeft === 0\) rw\.appendChild\(el\('span', 'review-chip dim', '🔶 복습 영어스톤은 오늘 다 받았어요'\)\);/);
  assert.match(src('css/style.css'), /\.review-chip\.stone \{/);
});

test('🔶 아이에게 보이는 안내 — 영어스톤이 생기는 곳을 한 문장으로 같이 쓴다(🛒 스톤 상점·🏪 5일장·도감·📊) · 여섯 곳이 다 들어 있다 · 옛 말("복습을 끝내면")이 남지 않았다', () => {
  for (const w of ['복습을 다 맞히거나(문제가 셋 이상이면 하나는 틀려도 돼요)', '받아쓰기·단어', '에세이', '따라 말하기로 그날 처음 통과한 문장이 30개 모이거나', '영상을 따라 말해 🎤 막대의 눈금을 넘을 때마다']) assert.ok(ENGLISH_STONE_HOW.includes(w), `${w}`);
  for (const w of ['복습 거의 다 맞힘', '받아쓰기·단어', '에세이', '따라 말하기 하루 30문장', '영상 따라 말하기 눈금마다']) assert.ok(ENGLISH_STONE_SHORT.includes(w), `${w}`);
  assert.deepEqual(SPEAK_STONE, { every: 30, maxPerDay: 2 });
  assert.match(src('js/shop.js'), /🔶 영어스톤은 \$\{ENGLISH_STONE_HOW\} 생겨요/);
  assert.match(src('js/marketview.js'), /🔶 영어스톤은 \$\{ENGLISH_STONE_HOW\} 생겨요/);
  assert.match(src('js/pokedex.js'), /🔶 \$\{ENGLISH_STONE_SHORT\}/);
  assert.match(src('js/stats.js'), /🔶는 \$\{ENGLISH_STONE_HOW\} 나와요\(영상은 길이에 따라 \$\{VIDEO_TIERS\[0\]\.stone\}~/);
  for (const f of ['js/shop.js', 'js/marketview.js', 'js/pokedex.js', 'js/stats.js']) {
    const s = src(f);
    assert.ok(!/영어스톤은 복습을 끝내면|복습 완주·에세이|복습 회차를 다 맞히거나 에세이를 쓸 때/.test(s), `${f}: 옛 안내`);
  }
});
