// 기록 가져오기 병합 규칙 테스트 (순수 함수)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  mergeStatRecord, pickReviewState, emptyDaily, mergeDailyDelta,
  cloneProfile, mergeProfileDelta, hpChangeRule, battleLossRule, purchaseRule,
} from '../js/db.js';

test('#6 sentenceStats: 오래된 백업이 최신 누적을 줄이지 않음', () => {
  const cur = { key: 'k', plays: 10, seconds: 100, speakPass: 3, bestRatio: 0.9, lastRatio: 0.9, lastAt: 200, done: true };
  const old = { key: 'k', plays: 4, seconds: 30, speakPass: 1, bestRatio: 0.5, lastRatio: 0.5, lastAt: 100, done: false };
  const m = mergeStatRecord('sentenceStats', cur, old);
  assert.equal(m.plays, 10); assert.equal(m.seconds, 100); assert.equal(m.bestRatio, 0.9);
  assert.equal(m.done, true); assert.equal(m.lastAt, 200); assert.equal(m.lastRatio, 0.9, '최근 시각 쪽의 lastRatio');
});

test('#6 daily: doneKeys 합집합, 수치는 큰 값', () => {
  const cur = { date: '2026-09-13', doneKeys: ['a', 'b'], seconds: 300, speakAttempts: 5, speakPass: 4 };
  const rec = { date: '2026-09-13', doneKeys: ['b', 'c'], seconds: 120, speakAttempts: 2, speakPass: 2 };
  const m = mergeStatRecord('daily', cur, rec);
  assert.deepEqual(m.doneKeys.sort(), ['a', 'b', 'c']);
  assert.equal(m.seconds, 300);
});

test('#6 vocabViews/sessions: 큰 값 유지, 없는 기록은 그대로', () => {
  assert.equal(mergeStatRecord('vocabViews', { word: 'w', views: 5, taps: 2, lastAt: 9 }, { word: 'w', views: 1, taps: 3, lastAt: 1 }).taps, 3);
  assert.deepEqual(mergeStatRecord('sessions', null, { id: 's', seconds: 10 }), { id: 's', seconds: 10 });
});

test('퍼즐 기록도 큰 값 유지 (sentenceStats/daily/sessions)', () => {
  assert.equal(mergeStatRecord('sentenceStats', { key: 'k', puzzles: 4, puzzleSolved: 3, puzzleWrong: 2 }, { key: 'k', puzzles: 1, puzzleSolved: 1, puzzleWrong: 5 }).puzzleWrong, 5);
  assert.equal(mergeStatRecord('sentenceStats', { key: 'k', puzzles: 4 }, { key: 'k', puzzles: 1 }).puzzles, 4);
  const d = mergeStatRecord('daily', { date: 'd', doneKeys: [], puzzles: 2, puzzleSolved: 1 }, { date: 'd', doneKeys: [], puzzles: 3, puzzleSolved: 1 });
  assert.equal(d.puzzles, 3); assert.equal(d.puzzleSolved, 1);
  assert.equal(mergeStatRecord('sessions', { id: 's', puzzles: 2, puzzleSolved: 2 }, { id: 's', puzzles: 1, puzzleSolved: 0 }).puzzleSolved, 2);
});

test('daily goalRewarded는 한쪽이라도 true면 true', () => {
  assert.equal(mergeStatRecord('daily', { date: 'd', doneKeys: [], goalRewarded: true }, { date: 'd', doneKeys: [] }).goalRewarded, true);
  assert.equal(mergeStatRecord('daily', { date: 'd', doneKeys: [] }, { date: 'd', doneKeys: [], goalRewarded: true }).goalRewarded, true);
  assert.equal(mergeStatRecord('daily', { date: 'd', doneKeys: [] }, { date: 'd', doneKeys: [] }).goalRewarded, false);
});

test('🔁 [Codex #6] 실패로 내려간 box를 옛 백업이 되돌리지 않는다', () => {
  // 오늘 틀려서 box 3 → 2, 내일 다시 보기로 내려간 상태
  const now = { key: 'k', box: 2, dueAt: '2026-09-16', reviewedAt: 2000, reviews: 3, reviewPass: 2 };
  // 그저께 찍은 백업: 그때는 box 3, 9/20에 보기로 되어 있었다
  const backup = { key: 'k', box: 3, dueAt: '2026-09-20', reviewedAt: 1000, reviews: 2, reviewPass: 2 };
  const m = mergeStatRecord('sentenceStats', now, backup);
  assert.equal(m.box, 2, '어려워하는 문장이 다시 box 3으로 올라가면 안 됨');
  assert.equal(m.dueAt, '2026-09-16', '내일 다시 봐야 함 — 9/20으로 밀리면 안 됨');
  assert.equal(m.reviews, 3, '누적 횟수는 큰 값');
  assert.equal(m.reviewedAt, 2000);

  // 반대로 백업 쪽이 더 최근 복습이면 그쪽 상태를 그대로
  const m2 = mergeStatRecord('sentenceStats', backup, now);
  assert.equal(m2.box, 2);
  assert.equal(m2.dueAt, '2026-09-16');
});

test('🔁 [Codex #6] 복습 이력이 없는 옛 기록끼리는 더 나아간 box 쪽', () => {
  const a = { key: 'k', box: 1, dueAt: '2026-09-17' };
  const b = { key: 'k', box: 3, dueAt: '2026-09-22' };
  assert.equal(mergeStatRecord('sentenceStats', a, b).box, 3);
  assert.equal(mergeStatRecord('sentenceStats', a, b).dueAt, '2026-09-22');
  // 한쪽만 복습 이력이 있으면 그쪽이 최신
  const fresh = { key: 'k', box: 0, dueAt: '2026-09-16', reviewedAt: 5000 };
  assert.equal(mergeStatRecord('sentenceStats', fresh, b).box, 0, '복습을 실제로 한 쪽이 이김');
});

test('🔁 복습 진도 병합: box는 더 나아간 쪽, dueAt은 그 box를 가진 쪽', () => {
  // 태블릿에서 두 번 복습해 box 2, 백업은 box 1인 옛 기록 → 진도는 유지돼야 한다
  const cur = { key: 'k', box: 2, dueAt: '2026-09-19', reviews: 2, reviewPass: 2 };
  const old = { key: 'k', box: 1, dueAt: '2026-09-16', reviews: 1, reviewPass: 1 };
  const m = mergeStatRecord('sentenceStats', cur, old);
  assert.equal(m.box, 2);
  assert.equal(m.dueAt, '2026-09-19', '옛 백업의 빠른 날짜가 진도를 되돌리면 안 됨');
  assert.equal(m.reviews, 2);

  // 반대 방향(백업 쪽이 더 나아간 경우)도 같은 규칙
  const m2 = mergeStatRecord('sentenceStats', old, cur);
  assert.equal(m2.box, 2);
  assert.equal(m2.dueAt, '2026-09-19');
});

test('🔁 box가 같으면 더 최근에 복습한 쪽(나중 날짜)의 dueAt', () => {
  const a = { key: 'k', box: 1, dueAt: '2026-09-16' };
  const b = { key: 'k', box: 1, dueAt: '2026-09-20' };
  assert.equal(mergeStatRecord('sentenceStats', a, b).dueAt, '2026-09-20');
  assert.equal(mergeStatRecord('sentenceStats', b, a).dueAt, '2026-09-20');
});

test('🔁 아직 복습에 안 들어온 문장(dueAt 없음)과 병합해도 날짜가 생기지 않음', () => {
  const none = { key: 'k', box: 0, dueAt: '' };
  assert.equal(mergeStatRecord('sentenceStats', none, { key: 'k' }).dueAt, '');
  assert.equal(mergeStatRecord('sentenceStats', none, { key: 'k', box: 0, dueAt: '2026-09-16' }).dueAt, '2026-09-16', '한쪽에만 있으면 그걸 씀');
});

test('🌟 황금 볼은 백업을 되돌려도 다시 못 받음 (한쪽이라도 받았으면 받은 것)', () => {
  const taken = { date: 'd', doneKeys: [], reviewGolden: true, reviewRounds: 1, reviewSentences: 3 };
  const fresh = { date: 'd', doneKeys: [] };
  assert.equal(mergeStatRecord('daily', taken, fresh).reviewGolden, true);
  assert.equal(mergeStatRecord('daily', fresh, taken).reviewGolden, true);
  assert.equal(mergeStatRecord('daily', fresh, fresh).reviewGolden, false);
  assert.equal(mergeStatRecord('daily', taken, fresh).reviewSentences, 3);
});

test('🔁 세션의 복습 횟수도 큰 값 유지', () => {
  assert.equal(mergeStatRecord('sessions', { id: 's', reviews: 3, reviewPass: 2 }, { id: 's', reviews: 1, reviewPass: 1 }).reviews, 3);
});

// ── 🪟 두 창 동시 실행: 오늘 기록 증분 합치기 (mergeDailyDelta) ──
// 통째로 덮어쓰면 다른 창이 공부한 기록이 사라지므로, 저장은 "늘어난 만큼"만 더한다.

test('🪟 증분 합치기: 수치는 더하고, 하루 한 번 플래그는 유지, 문장 key는 합집합', () => {
  const cur = { ...emptyDaily('2026-09-17'), seconds: 100, puzzles: 2, doneKeys: ['a', 'b'], reviewGolden: true };
  const out = mergeDailyDelta(cur, '2026-09-17', { seconds: 30, puzzles: 1, doneKeys: ['b', 'c'] });
  assert.equal(out.seconds, 130, '다른 창이 쓴 100초 위에 30초를 더함');
  assert.equal(out.puzzles, 3);
  assert.deepEqual(out.doneKeys, ['a', 'b', 'c'], '같은 문장은 한 번만');
  assert.equal(out.reviewGolden, true, '이미 받은 하루 한 번은 유지');
});

test('🪟 증분 합치기: 저장된 기록이 없어도 되고, 빈 증분은 값을 바꾸지 않는다', () => {
  const fresh = mergeDailyDelta(null, '2026-09-17', { seconds: 5, doneKeys: ['a'] });
  assert.equal(fresh.date, '2026-09-17');
  assert.equal(fresh.seconds, 5);
  assert.equal(fresh.goalRewarded, false, '플래그 기본값은 false');
  const same = mergeDailyDelta(fresh, '2026-09-17', {});
  assert.equal(same.seconds, 5);
  assert.deepEqual(same.doneKeys, ['a']);
});

test('✍️ 증분 합치기: 다시 쓴 글은 갱신하되 아빠 교정(coachFix)은 지우지 않는다', () => {
  const cur = { ...emptyDaily('2026-09-17'), essays: [{ id: 'e1', written: 'I go', coachFix: 'I went.', readAt: 0 }] };
  const out = mergeDailyDelta(cur, '2026-09-17', { essays: [{ id: 'e1', written: 'I went' }, { id: 'e2', written: 'new' }] });
  assert.equal(out.essays.length, 2, '새 글은 더해짐');
  assert.equal(out.essays[0].written, 'I went', '고쳐 쓴 내용은 갱신');
  assert.equal(out.essays[0].coachFix, 'I went.', '저장된 쪽에만 있던 아빠 교정은 남음');
});

// ── ⚡ 프로필 규칙 (순수 함수) ──
// 예전에는 이 규칙들이 IndexedDB 트랜잭션 안에 있어서, node 테스트는 indexedDB가 없어
// 조용히 메모리 폴백으로 새고 **태블릿에서 실제로 도는 경로에는 테스트가 하나도 없었다**.

test('⚡ mergeProfileDelta: 수치는 더하고, 0 이하 개수는 지우고, mons는 필드만 덮어씀', () => {
  const p = cloneProfile({ xp: 10, coins: 50, caught: { 25: 2 }, items: { ribbon: 1 }, mons: { 25: { gear: 'cap', hp: 80 } } });
  mergeProfileDelta(p, { xp: 5, coins: -20, caught: { 25: -1, 4: 1 }, items: { ribbon: -1 }, mons: { 25: { dye: 'red' } } });
  assert.equal(p.xp, 15);
  assert.equal(p.coins, 30);
  assert.deepEqual(p.caught, { 25: 1, 4: 1 });
  assert.deepEqual(p.items, {}, '0개가 되면 가방에서 지운다');
  assert.deepEqual(p.mons[25], { gear: 'cap', hp: 80, dye: 'red' }, '주지 않은 필드는 그대로');
  mergeProfileDelta(p, { coins: -999 });
  assert.equal(p.coins, 0, '코인은 음수로 안 내려감');
});

test('❤️ hpChangeRule: 바뀐 만큼 더하고 0~max로 자름', () => {
  const p = cloneProfile({ mons: { 25: { hp: 100 } } });
  assert.deepEqual(hpChangeRule(p, 25, -20, 100), { ok: true, from: 100, to: 80 });
  assert.deepEqual(hpChangeRule(p, 25, -10, 100), { ok: true, from: 80, to: 70 }, '두 창이 각각 깎으면 −30 (한쪽만 남으면 안 됨)');
  assert.equal(hpChangeRule(p, 25, -999, 100).to, 0, '0 아래로 안 내려감');
  assert.equal(hpChangeRule(p, 25, 999, 100).to, 100, 'max 위로 안 올라감');
  assert.equal(hpChangeRule(p, 4, -10, 100).from, 100, '기록이 없으면 가득한 상태에서 시작');
});

test('🧪 hpChangeRule: 물약 하나로 두 번 못 먹인다 (소모와 회복이 한 판정)', () => {
  const p = cloneProfile({ mons: { 25: { hp: 40 } }, items: { potion: 1 } });
  assert.deepEqual(hpChangeRule(p, 25, 20, 100, 'potion'), { ok: true, from: 40, to: 60 });
  assert.deepEqual(p.items, {}, '물약 소모됨');
  const second = hpChangeRule(p, 25, 20, 100, 'potion');
  assert.equal(second.ok, false, '물약이 없으면 실패');
  assert.equal(p.mons[25].hp, 60, '실패하면 HP도 안 오름');
});

test('⚔️ battleLossRule: 누적과 "3번이면 잃음" 판정이 한 번에 (두 마리를 잃지 않게)', () => {
  const p = cloneProfile({ caught: { 4: 2 }, mons: {} });
  assert.deepEqual(battleLossRule(p, 4, 3), { losses: 1, lost: false });
  assert.deepEqual(battleLossRule(p, 4, 3), { losses: 2, lost: false });
  assert.equal(p.caught[4], 2, '아직 안 잃음');
  assert.deepEqual(battleLossRule(p, 4, 3), { losses: 0, lost: true }, '3번째에 잃고 0으로');
  assert.equal(p.caught[4], 1, '마릿수 −1');
  // 마지막 한 마리를 잃으면 도감에서 빠진다
  battleLossRule(p, 4, 3); battleLossRule(p, 4, 3);
  assert.equal(battleLossRule(p, 4, 3).lost, true);
  assert.equal(p.caught[4], undefined);
});

test('💰 purchaseRule: 모자라면 아무것도 안 하고, 되면 치른 만큼만 빠진다', () => {
  const p = cloneProfile({ coins: 100, items: { mushroom: 10 } });
  assert.deepEqual(purchaseRule(p, { coins: 150 }, { items: { crown: 1 } }), { ok: false }, '코인 부족');
  assert.equal(p.coins, 100, '실패하면 그대로');
  assert.deepEqual(p.items, { mushroom: 10 });

  assert.deepEqual(purchaseRule(p, { coins: 60 }, { items: { crown: 1 } }), { ok: true });
  assert.equal(p.coins, 40);
  assert.equal(p.items.crown, 1);
  // 두 번째는 못 산다 → 두 창에서 같은 코인으로 두 개를 못 산다
  assert.equal(purchaseRule(p, { coins: 60 }, { items: { crown: 1 } }).ok, false);
  assert.equal(p.items.crown, 1, '실패하면 물건도 안 늘어남');

  // 🍄 재료로 치르기 (다이스프)
  assert.deepEqual(purchaseRule(p, { items: { mushroom: 10 } }, { mons: { 25: { gmax: true } } }), { ok: true });
  assert.equal(p.items.mushroom, undefined, '10개 다 씀');
  assert.equal(p.mons[25].gmax, true);
  assert.equal(purchaseRule(p, { items: { mushroom: 10 } }, { mons: { 4: { gmax: true } } }).ok, false, '재료 부족');
  assert.equal(p.mons[4], undefined);
});

// 2026-09-17 태블릿: 영상 한 편의 자막 곁 파일이 사라지자 items.getAll이 통째로 실패해
// 목록을 못 그리고 앱이 "저장소를 열 수 없어요"로 멈췄다. 같은 코드가 다시 들어오면 여기서 깨진다.
test('🗂 목록은 getAll로 읽지 않는다 — 한 건 깨져도 나머지는 보여야 한다', async () => {
  const src = await readFile(new URL('../js/db.js', import.meta.url), 'utf8');
  const body = src.slice(src.indexOf('export async function listItems'), src.indexOf('async function titlesFromSessions'));
  assert.ok(body.includes('getAllKeys'), '키를 먼저 읽고');
  assert.ok(body.includes('.get(id)'), '한 건씩 읽어야 한다');
  assert.ok(!/objectStore\('items'\)\.getAll\(\)/.test(body), "items.getAll()을 쓰면 한 건만 깨져도 목록 전체가 날아간다");
  assert.ok(body.includes('broken: true'), '깨진 레코드는 표시해서 돌려줘야 한다');
});

test('⚡ cloneProfile: 원본을 건드리지 않는다 (규칙이 복사본만 고치게)', () => {
  const src = { xp: 5, caught: { 25: 1 }, items: {}, mons: { 25: { hp: 50 } } };
  const p = cloneProfile(src);
  mergeProfileDelta(p, { xp: 10, caught: { 25: 1 } });
  hpChangeRule(p, 25, -20, 100);
  assert.equal(src.xp, 5);
  assert.equal(src.caught[25], 1);
  assert.equal(src.mons[25].hp, 50);
  assert.equal(cloneProfile(null).xp, 0, '없으면 빈 프로필');
});

// ── 🎟️ 교환권 기준선 (2026-09-19) ──
// 산 시점의 학습 누적치를 프로필에 박아 두고, 다음 영상 조건은 거기서부터 센다.
// 코인 차감과 같은 트랜잭션이라야 "샀는데 기준선은 그대로"(=조건이 또 꽉 참)가 안 생긴다.
test('🎟️ 교환권을 사면 기준선이 그 시점 누적치로 박힌다', () => {
  const p = cloneProfile({ coins: 2000, items: {} });
  const r = purchaseRule(p, { coins: 2000 }, { items: { ticket_iconic: 1 }, unlockBase: { done: 1240, reviewed: 63 } });
  assert.equal(r.ok, true);
  assert.equal(p.coins, 0);
  assert.equal(p.items.ticket_iconic, 1);
  assert.deepEqual(p.unlockBase, { done: 1240, reviewed: 63 });
});

test('🎟️ 못 사면 기준선도 안 건드린다 (코인과 한 묶음)', () => {
  const p = cloneProfile({ coins: 100, items: {}, unlockBase: { done: 10, reviewed: 2 } });
  const r = purchaseRule(p, { coins: 2000 }, { items: { ticket_iconic: 1 }, unlockBase: { done: 999, reviewed: 99 } });
  assert.equal(r.ok, false);
  assert.equal(p.coins, 100, '코인 그대로');
  assert.deepEqual(p.unlockBase, { done: 10, reviewed: 2 }, '기준선도 그대로 — 안 그러면 조건이 공짜로 초기화된다');
});

test('🎟️ 기준선 없는 구매(다른 상점 물건)는 기준선을 지우지 않는다', () => {
  const p = cloneProfile({ coins: 500, items: {}, unlockBase: { done: 30, reviewed: 4 } });
  purchaseRule(p, { coins: 60 }, { items: { ball_super: 1 } });
  assert.deepEqual(p.unlockBase, { done: 30, reviewed: 4 });
});

test('🎟️ 이상한 기준선 값은 숫자로 다듬어 저장한다', () => {
  const p = cloneProfile({ coins: 2000, items: {} });
  purchaseRule(p, { coins: 2000 }, { items: { ticket_wild2: 1 }, unlockBase: { done: -5, reviewed: '12.7' } });
  assert.deepEqual(p.unlockBase, { done: 0, reviewed: 12 });
});

test('🎟️ 백업 병합: 기준선은 가방(교환권)과 같은 쪽에서 가져온다', () => {
  // 갈라지면 "교환권은 있는데 조건은 안 줄어든" 상태가 된다
  const cur = { id: 'me', updatedAt: 200, coins: 50, items: { ticket_iconic: 1 }, unlockBase: { done: 1200, reviewed: 60 } };
  const old = { id: 'me', updatedAt: 100, coins: 9999, items: {}, unlockBase: null };
  assert.deepEqual(mergeStatRecord('profile', cur, old).unlockBase, { done: 1200, reviewed: 60 }, '최근 쪽');
  assert.deepEqual(mergeStatRecord('profile', old, cur).unlockBase, { done: 1200, reviewed: 60 }, '순서가 바뀌어도 최근 쪽');
  // 교환권 기능 이전의 옛 백업(이 값이 아예 없음)이 최근이면 null — 앱이 열릴 때 다시 잡는다
  const older = { id: 'me', updatedAt: 300, coins: 10, items: {} };
  assert.equal(mergeStatRecord('profile', cur, older).unlockBase, null);
});
