// 🎣 학습 낚시터 — 앱에 잇기 (v366 — 기본안 「물고기 16종 · 나머지 이대로」 · 장면 시안 「이대로」) — node --test tests/lake366.test.js
// 도감·💰(하루 40) 규칙 · 병합 · 진짜 저장 경로(두 창 · 저장 실패) · 하루 기록 칸(병합 큰 쪽) · 📤 🎣 줄 · 과목 몫(논술 날 번호) · 문제 차례 · 잇기(소스)
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SPECIES, FISH_COINS, FISH_DAY_Q, PAID_DAYS, lakeOf, copyLake, mergeLake, catchRule, askOrder, okOfDay, lakeDayLine, dayKeyOf, fishMinOf, FISH_MIN_CHOICES, SUBJECTS } from '../js/fishing.js';
import { emptyProfile, cloneProfile, emptyDaily, mergeStatRecord, mergeDailyDelta } from '../js/db.js';
import { initProfile, flushProfile, reloadProfile, lakeCatch, lakeRaw, getProfileSnapshot } from '../js/xp.js';
import { sharesOf, askFrom, asker, lakeLeft, dailyQueue, keepCatch } from '../js/lakeview.js';
import { orderOf } from '../js/journey.js';
import { usageFiles } from '../js/upload.js';
import { PLACES, OVERLAYS } from '../js/usage.js';

const src = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const T = new Date(2026, 9, 30, 15, 0, 0).getTime(); // 지역 10-30 오후 3시
const DAY = 86400000;
const TODAY = dayKeyOf(T);

test('🐟 한 마리 — 도감(잡은 수·가장 긴 cm·처음 날) · 💰 별 하나에 1 · 새 종 +5 · 🏅 월척 +5 · 하루 40까지 · 다음 날 다시 · 날짜를 되돌려도 그날 한도 그대로', () => {
  const p = { coins: 100, coinsEarned: 7 };
  let r = catchRule(p, { key: 'bungeo', cm: 31.2 }, T);
  assert.deepEqual(r, { ok: true, first: true, best: false, coins: 2 + 5 + 5 });
  assert.deepEqual(p.fishing.dex.bungeo, { n: 1, best: 31.2, d: TODAY });
  assert.deepEqual([p.coins, p.coinsEarned], [112, 19]);
  r = catchRule(p, { key: 'bungeo', cm: 20 }, T + 1000);
  assert.deepEqual(r, { ok: true, first: false, best: false, coins: 2 });
  r = catchRule(p, { key: 'bungeo', cm: 40.5 }, T + 2000);
  assert.deepEqual(r, { ok: true, first: false, best: true, coins: 2 + 5 }, '4짜도 🏅');
  assert.deepEqual(p.fishing.dex.bungeo, { n: 3, best: 40.5, d: TODAY });
  // 하루 40까지 — 21(지금) + 뱀장어 5+5 = 31 · 메기 4+5 = 40 · 그다음은 0
  r = catchRule(p, { key: 'jangeo', cm: 60 }, T + 3000);
  assert.equal(r.coins, 10);
  r = catchRule(p, { key: 'megi', cm: 50 }, T + 4000);
  assert.equal(r.coins, 9);
  assert.deepEqual(p.fishing.paid, { [TODAY]: 40 });
  r = catchRule(p, { key: 'ingeo', cm: 50 }, T + 5000);
  assert.deepEqual([r.ok, r.first, r.coins], [true, true, 0], '한도가 차도 도감엔 들어감');
  assert.equal(p.coins, 100 + 40);
  // 다음 날 — 한도가 새로
  r = catchRule(p, { key: 'pirami', cm: 10 }, T + DAY);
  assert.equal(r.coins, 1 + 5);
  assert.deepEqual(p.fishing.paid, { [TODAY]: 40, [dayKeyOf(T + DAY)]: 6 });
  assert.equal(p.fishing.dex.bungeo.d, TODAY, '처음 날은 그대로');
  // ★ 날짜를 잘못 맞췄다 되돌림(A → B → A) — 이미 40 받은 날은 다시 안 열림 (Codex 170차 재현: A일 +7) · B일은 B일대로
  r = catchRule(p, { key: 'bungeo', cm: 25 }, T + 6000);
  assert.deepEqual([r.ok, r.coins], [true, 0], 'A일로 돌아와도 0');
  r = catchRule(p, { key: 'bungeo', cm: 25 }, T + DAY + 7000);
  assert.equal(r.coins, 2, 'B일은 남은 만큼');
  assert.equal(p.coins, 100 + 40 + 6 + 2);
  // 모르는 종 · 범위 밖 · 깨진 값 — 아무것도 안 바뀜
  const before = JSON.stringify(p);
  for (const bad of [{ key: 'gyarados', cm: 50 }, { key: 'bungeo', cm: 99 }, { key: 'bungeo', cm: 2 }, { key: 'toString', cm: 10 }, null, { key: 'pirami', cm: 'x' }]) assert.deepEqual(catchRule(p, bad, T), { ok: false, why: 'bad' });
  assert.equal(JSON.stringify(p), before);
});

test('💾 고쳐 읽기 · 병합 — 종마다 큰 쪽 · 처음 날은 이른 쪽 · 날마다 받은 💰는 날마다 큰 쪽(늦은 날 14개) · 모르는 종·깨진 칸은 버림', () => {
  assert.deepEqual(lakeOf(null), { dex: {}, paid: {} });
  assert.deepEqual(lakeOf({ dex: { bungeo: { n: 2, best: 999, d: 'x' }, gyarados: { n: 1 }, megi: { n: 0, best: 5 }, toString: { n: 1 } }, paid: { '2026-10-30': 999, '2026-10-29': 0, x: 5, '2026-1-1': 3 } }),
    { dex: { bungeo: { n: 2, best: 45, d: '' } }, paid: { '2026-10-30': FISH_COINS.dayMax } });
  assert.deepEqual(lakeOf({ day: '2026-10-30', coins: 12, paid: { '2026-10-30': 7, '2026-10-29': 40 } }).paid, { '2026-10-29': 40, '2026-10-30': 12 }, '시안 때 한 칸(day·coins)도 읽어 들임');
  const many = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [dayKeyOf(T - i * DAY), 5]));
  assert.deepEqual(Object.keys(lakeOf({ paid: many }).paid).sort(), Array.from({ length: PAID_DAYS }, (_, i) => dayKeyOf(T - i * DAY)).sort(), `늦은 날 ${PAID_DAYS}개만`);
  const a = { dex: { bungeo: { n: 3, best: 31, d: '2026-10-29' }, megi: { n: 1, best: 40, d: '2026-10-30' } }, paid: { '2026-10-30': 12, '2026-10-29': 40 } };
  const b = { dex: { bungeo: { n: 2, best: 35, d: '2026-10-28' }, pirami: { n: 4, best: 12, d: '2026-10-30' } }, paid: { '2026-10-30': 30, '2026-10-31': 3 } };
  assert.deepEqual(mergeLake(a, b), {
    dex: { bungeo: { n: 3, best: 35, d: '2026-10-28' }, megi: { n: 1, best: 40, d: '2026-10-30' }, pirami: { n: 4, best: 12, d: '2026-10-30' } },
    paid: { '2026-10-29': 40, '2026-10-30': 30, '2026-10-31': 3 },
  });
  assert.deepEqual(mergeLake(a, b), mergeLake(b, a), '어느 쪽이 먼저여도');
  // ★ 미래 날짜 기록이 섞여도 그날 40 한도는 안 열림 (Codex 170차 — 「늦은 날 우선」 한 칸이던 때의 틈)
  const pm = { coins: 0, fishing: mergeLake({ paid: { [TODAY]: 40 } }, { paid: { [dayKeyOf(T + 3 * DAY)]: 2 } }) };
  assert.equal(catchRule(pm, { key: 'pirami', cm: 10 }, T).coins, 0);
  assert.equal(mergeLake(null, undefined), null);
  assert.deepEqual(copyLake(a), lakeOf(a));
  // 프로필 복사 · 백업 병합(mergeStatRecord) 길에도
  const p = { ...emptyProfile(), fishing: { ...a, dex: { ...a.dex, gyarados: { n: 1 } }, junk: 1 }, updatedAt: 5 };
  assert.deepEqual(cloneProfile(p).fishing, lakeOf(a), '복사도 고쳐 읽기로');
  const m = mergeStatRecord('profile', { ...emptyProfile(), fishing: a, updatedAt: 5 }, { ...emptyProfile(), fishing: b, updatedAt: 9 });
  assert.deepEqual(m.fishing, mergeLake(a, b));
  const none = mergeStatRecord('profile', { ...emptyProfile(), updatedAt: 1 }, { ...emptyProfile(), updatedAt: 2 });
  assert.equal(none.fishing, undefined);
});

test('📅 하루 기록 칸 — 빈 기록 0 · 증분 · 백업 병합은 큰 쪽(옛 백업으로 오늘 낚시 시간을 되살리지 못함)', () => {
  const F = ['uLake', 'fishSec', 'fishBonus', 'fishCatch', ...SUBJECTS.flatMap((s) => FISH_DAY_Q[s])];
  assert.equal(F.length, 12);
  const e = emptyDaily(TODAY);
  for (const k of F) assert.equal(e[k], 0, k);
  const d1 = mergeDailyDelta(e, TODAY, { fishSec: 30, fishMathQ: 2, fishMathOk: 1, fishCatch: 1 });
  const d2 = mergeDailyDelta(d1, TODAY, { fishSec: 5, fishMathQ: 1 });
  assert.deepEqual([d2.fishSec, d2.fishMathQ, d2.fishMathOk, d2.fishCatch], [35, 3, 1, 1]);
  const m = mergeStatRecord('daily', { ...e, fishSec: 900, fishEnOk: 2 }, { ...e, fishSec: 300, fishEnOk: 5 });
  assert.deepEqual([m.fishSec, m.fishEnOk], [900, 5]);
  assert.equal(okOfDay({ fishMathOk: 2, fishEnOk: 3, fishKorOk: 1, fishNsOk: 4, fishMathQ: 99 }), 10);
  assert.equal(okOfDay(null), 0);
  // 오늘 남은 시간 — 기본 20분 · 🔒 더 준 분
  assert.equal(lakeLeft({ fishSec: 0 }), 1200);
  assert.equal(lakeLeft({ fishSec: 1300, fishBonus: 10 }), 500);
  assert.equal(lakeLeft(null), 1200);
  assert.deepEqual(FISH_MIN_CHOICES, [10, 15, 20, 30, 40, 60]);
  assert.equal(fishMinOf('30'), 30);
  assert.equal(fishMinOf(25), 20);
  assert.equal(fishMinOf(''), 20);
});

test('📤 🎣 줄 — 낚시 시간 · 마리 · 과목마다 맞힘/낸 · 🔒 · 안 간 날은 없음 · 읽는 법 · 🕒 자리', () => {
  assert.equal(lakeDayLine({}), '');
  assert.equal(lakeDayLine({ fishSec: 0, fishCatch: 0 }), '');
  const d = { date: TODAY, fishSec: 1210, fishCatch: 7, fishMathQ: 20, fishMathOk: 14, fishEnQ: 5, fishEnOk: 5, fishBonus: 10, uLake: 1300 };
  assert.equal(lakeDayLine(d, (s) => `${Math.round(s / 60)}분`), '🎣 낚시터 20분 · 물고기 7마리 · 맞힘/낸 문제 수학 14/20 · 영어 5/5 · 🔒 부모 +10분');
  const [f] = usageFiles([d], TODAY, PLACES);
  assert.match(f.text, /🎣 낚시터 20분 · 물고기 7마리 · 맞힘\/낸 문제 수학 14\/20 · 영어 5\/5 · 🔒 부모 \+10분/);
  assert.match(f.text, /🎣 낚시터 \d+분/, '머문 시간에도 🎣 낚시터');
  assert.match(f.text, /- 🎣 낚시터 = 학습 낚시터에서 낚은 시간/);
  assert.ok(PLACES.some((p) => p.key === 'lake' && p.field === 'uLake'));
  assert.ok(OVERLAYS.some((o) => o.place === 'lake' && o.ids.includes('lk-lake')));
});

test('📊 과목 몫 — 논술 날 번호(국어 dayNum)를 날짜로 · 지난 7일 · 낼 문제가 있는 과목만', () => {
  const dn = (key) => Math.round(Date.UTC(+key.slice(0, 4), +key.slice(5, 7) - 1, +key.slice(8, 10)) / DAY);
  const days = [{ date: '2026-10-29', mathTime: 0, enTime: 8400, korTime: 8400 }];
  const ns = { [dn('2026-10-29')]: 1, [dn('2026-10-28')]: 1, [dn('2026-10-27')]: 1, [dn('2026-10-26')]: 1, [dn('2026-10-30')]: 1 };
  const sh = sharesOf(days, ns, '2026-10-30', SUBJECTS);
  assert.ok(Math.abs(sh.math - 0.5) < 1e-9, '수학만 안 함 → 천장');
  assert.ok(Math.abs(sh.nonsul - sh.english) < 1e-9, '논술 4날 = 다 함');
  const two = sharesOf(days, {}, '2026-10-30', ['english', 'nonsul']);
  assert.deepEqual(Object.keys(two).sort(), ['english', 'nonsul']);
  assert.ok(two.nonsul > two.english);
  assert.deepEqual(sharesOf([], {}, '2026-10-30', []), {});
});

test('🎲 문제 차례 — 그날·과목으로 섞은 줄 · 그날 낸 수만큼 넘긴 자리(다시 열어도 처음부터 되풀이 안 함) · 못 만들면 다음 것 · 4지선다·정답 하나만', () => {
  const made = [];
  const srcOk = { keys: ['a', 'b', 'c', 'd', 'e'], make: (k, seed) => { made.push(k); return { q: k, choices: [{ text: k, ok: true }, { text: 'x', ok: false }] }; } };
  const order = [];
  for (let i = 0; i < 5; i++) order.push(askFrom(srcOk, 'math', '2026-10-30', i, 1).q.q);
  assert.deepEqual([...order].sort(), ['a', 'b', 'c', 'd', 'e'], '다섯 번이면 다섯 다');
  assert.equal(askFrom(srcOk, 'math', '2026-10-30', 5, 1).q.q, order[0], '다 돌면 처음부터');
  assert.equal(askFrom(srcOk, 'math', '2026-10-30', 0, 1).step, 1);
  assert.deepEqual(order, Array.from({ length: 5 }, (_, i) => askFrom(srcOk, 'math', '2026-10-30', i, 9).q.q), '같은 날이면 같은 줄');
  const other = Array.from({ length: 5 }, (_, i) => askFrom(srcOk, 'math', '2026-10-31', i, 1).q.q);
  assert.notDeepEqual(other, order, '다른 날은 다른 줄(대개)');
  // 못 만드는 열쇠·정답이 둘인 문제는 건너뜀 · 다 못 만들면 null
  const half = { keys: ['a', 'b'], make: (k) => (k === 'a' ? null : { q: k, choices: [{ text: '1', ok: true }, { text: '2', ok: false }] }) };
  for (let i = 0; i < 4; i++) assert.equal(askFrom(half, 'english', '2026-10-30', i, 1).q.q, 'b');
  const twoOk = { keys: ['a'], make: () => ({ q: 'a', choices: [{ text: '1', ok: true }, { text: '2', ok: true }] }) };
  assert.deepEqual(askFrom(twoOk, 'korean', '2026-10-30', 0, 1), { q: null, step: 1 });
  const throws = { keys: ['a'], make: () => { throw new Error('x'); } };
  assert.equal(askFrom(throws, 'korean', '2026-10-30', 0, 1).q, null);
  assert.deepEqual(askFrom(null, 'math', '2026-10-30', 0, 1), { q: null, step: 0 });
  assert.deepEqual(askFrom({ keys: [] }, 'math', '2026-10-30', 0, 1), { q: null, step: 0 });
});

// 창이 쓰는 문제 내기(asker — openLakeNow의 ask) 그대로 n번
const walkAsk = (s, n, at = 0) => { const ask = asker({ math: s }, '2026-10-30', { math: at }); return Array.from({ length: n }, (_, i) => { const q = ask('math', i + 1); return q ? q.q : null; }); };
const okQ = (k) => ({ q: k, choices: [{ text: '1', ok: true }, { text: '2', ok: false }] });
test('★ 🎲 출제 자리 — 못 만든 자리도 넘김(같은 문제 두 번 내리 없음) · 앞 12자리를 다 못 만들어도 그다음 문제에 닿음 (Codex 170차 재현 [c,b,d,a] → [b,b,d,a])', () => {
  const keys = ['a', 'b', 'c', 'd'];
  const line = orderOf(keys, 'lake:2026-10-30', 'math');
  const one = { keys, make: (k) => (k === line[0] ? null : okQ(k)) };
  const got = walkAsk(one, 6);
  for (let i = 1; i < got.length; i++) assert.notEqual(got[i], got[i - 1], `두 번 내리 ${got.join(',')}`);
  assert.deepEqual(got.slice(0, 3), line.slice(1), '못 만든 자리만 빼고 차례대로');
  // 열여섯 자리 중 차례 앞 12자리를 다 못 만듦 → 첫 번은 null(문제 없이 넘어감)이어도 두 번째엔 13번째 자리 문제
  const k16 = Array.from({ length: 16 }, (_, i) => `k${i}`);
  const l16 = orderOf(k16, 'lake:2026-10-30', 'math');
  const twelve = { keys: k16, make: (k) => (l16.indexOf(k) < 12 ? null : okQ(k)) };
  assert.deepEqual(walkAsk(twelve, 3), [null, l16[12], l16[13]], '영영 빠지지 않음');
  // 그날 낸 수에서 시작 · 과목마다 따로 · 원천이 없는 과목은 null
  assert.deepEqual(walkAsk(one, 2, 2), line.slice(2, 4).map((k) => (k === line[0] ? null : k)));
  const ask = asker({ math: one }, '2026-10-30', { math: 1 });
  assert.equal(ask('english', 1), null);
  assert.equal(ask('math', 1).q, line[1]);
  assert.match(src('js/lakeview.js'), /ask: mathMix\(asker\(ui\.src, day, start\), /); // v367 — 수학 차례에 🐟 물고기 수학을 섞음
});

test('★ 🔀 과목 차례 — 고른 과목 먼저 · 못 만들면 몫이 큰 과목부터 · 셋 내리 나온 과목은 맨 끝(넷 내리는 다른 과목이 다 못 만들 때만) · 몫 0은 안 씀', () => {
  const sh = { math: 0.4, english: 0.1, korean: 0.3, nonsul: 0.2 };
  assert.deepEqual(askOrder(sh, [], 'english'), ['english', 'math', 'korean', 'nonsul']);
  assert.deepEqual(askOrder(sh, ['math', 'math', 'math'], 'korean'), ['korean', 'nonsul', 'english', 'math'], '셋 내리 수학은 맨 끝');
  assert.deepEqual(askOrder(sh, ['english', 'math', 'math'], 'korean'), ['korean', 'math', 'nonsul', 'english'], '두 번이면 그대로');
  assert.deepEqual(askOrder({ math: 0.5, korean: 0 }, ['math', 'math', 'math'], 'math'), ['math'], '하나뿐이면 그 과목');
  assert.deepEqual(askOrder({}, [], null), []);
  assert.deepEqual(askOrder(sh, [], null), ['math', 'korean', 'nonsul', 'english']);
  assert.match(src('js/fishview.js'), /const order = askOrder\(shares, ui\.recent, subj\);/);
});

test('★ 🧾 하루 기록 쓰기 차례 — 하나씩 차례로 · 못 쓴 증분은 남겼다 다음에 함께(빠지지 않음·두 번 안 셈) · 날은 쓰는 순간의 날', async () => {
  const sent = [];
  let busy = 0;
  let fail = 1;
  let day = '2026-10-30';
  const write = async (date, delta) => {
    busy += 1;
    assert.equal(busy, 1, '겹쳐 보내지 않음');
    await new Promise((r) => setTimeout(r, 2));
    busy -= 1;
    if (fail > 0) { fail -= 1; throw new Error('저장 실패'); }
    sent.push([date, delta]);
  };
  const log = dailyQueue(write, () => day, 0);
  await log.put({ fishSec: 5, fishMathQ: 1, fishMathOk: 0 });
  assert.deepEqual(sent, [], '첫 번은 실패');
  assert.deepEqual(log.pending(), { fishSec: 5, fishMathQ: 1 }, '못 쓴 것은 남음 · 0은 안 셈');
  log.put({ fishSec: 5 });
  log.put({ fishSec: 3, fishCatch: 1 });
  await log.flush();
  const sum = (k) => sent.reduce((a, [, d]) => a + (d[k] || 0), 0);
  assert.deepEqual([sum('fishSec'), sum('fishMathQ'), sum('fishCatch')], [13, 1, 1], '실패한 5초도 빠지지 않고 두 번 안 셈');
  assert.deepEqual(log.pending(), {});
  day = '2026-10-31'; // 자정을 넘김
  log.put({ fishSec: 2 });
  await log.flush();
  assert.equal(sent.at(-1)[0], '2026-10-31', '쓰는 순간의 날');
  // 창이 고른 쓰기 — 진짜 저장 함수(applyDailyDelta)와 쓰는 순간의 날(clockDay) · 닫을 때 다 쓴 뒤에 홈 띠
  const lv = src('js/lakeview.js');
  assert.match(lv, /const log = dailyQueue\(applyDailyDelta, clockDay\);/);
  assert.match(lv, /onClose: \(\) => \{ log\.flush\(\)\.then\(\(\) => mountLakeCard\(cardBox\)\)/);
  assert.doesNotMatch(lv, /applyDailyDelta\(day,/, '연 날로 고정해 쓰지 않음');
});

const stored = () => fakeIdb.get('profile', 'me');
test('★ 💾 저장 경로 — 두 창이 한꺼번에 낚아도 도감·💰가 맞게 · 하루 40 · 저장된 프로필에 · 저장이 실패하면 없던 일', async () => {
  await initProfile();
  await flushProfile();
  const cur = stored() || emptyProfile();
  fakeIdb.put('profile', { ...cur, coins: 50, coinsEarned: 0, updatedAt: (cur.updatedAt || 0) + 1 });
  await reloadProfile();
  const fish = [{ key: 'bungeo', cm: 31 }, { key: 'bungeo', cm: 22 }, { key: 'megi', cm: 50 }, { key: 'jangeo', cm: 60 }, { key: 'ingeo', cm: 40 }, { key: 'pirami', cm: 9 }];
  const rs = await Promise.all([...fish.map((f) => lakeCatch(f)), ...fish.map((f) => lakeCatch(f))]);
  assert.ok(rs.every((r) => r.ok));
  assert.equal(rs.filter((r) => r.first).length, 5, '새 종은 종마다 한 번');
  const coins = rs.reduce((a, r) => a + r.coins, 0);
  assert.equal(coins, FISH_COINS.dayMax, '두 창이어도 하루 40');
  assert.equal(stored().coins, 50 + FISH_COINS.dayMax);
  assert.equal(stored().fishing.dex.bungeo.n, 4);
  assert.equal(stored().fishing.dex.bungeo.best, 31);
  assert.equal(lakeRaw().dex.megi.n, 2, '창의 프로필도');
  assert.equal(getProfileSnapshot().coins, 50 + FISH_COINS.dayMax);
  fakeIdb.failNext('profile');
  assert.deepEqual(await lakeCatch({ key: 'nuchi', cm: 30 }), { ok: false, why: 'save' });
  assert.equal(stored().fishing.dex.nuchi, undefined);
  assert.deepEqual(await lakeCatch({ key: 'gyarados', cm: 30 }), { ok: false, why: 'bad' });
  assert.equal(fakeIdb.failsLeft(), 0);
});

test('★ 🐟 도감에 적기 — 저장된 뒤에만 낚은 마리 +1 · 저장 실패면 { ok:false }(🔁 다시 적기) · 다시 적으면 도감·💰·마리가 한 번만 · 날짜 왕복도 저장된 프로필로', async () => {
  await initProfile();
  await flushProfile();
  const cur = stored() || emptyProfile();
  fakeIdb.put('profile', { ...cur, coins: 10, fishing: { dex: {}, paid: {} }, updatedAt: (cur.updatedAt || 0) + 1 });
  await reloadProfile();
  const puts = [];
  const put = (d) => puts.push(d);
  fakeIdb.failNext('profile');
  const f = { key: 'kkeuri', cm: 30 };
  assert.deepEqual(await keepCatch(f, put), { ok: false, why: 'save' });
  assert.deepEqual(puts, [], '못 적으면 마리도 안 셈');
  assert.equal(stored().fishing.dex.kkeuri, undefined);
  assert.equal(stored().coins, 10);
  assert.deepEqual(await keepCatch(f, put), { ok: true, first: true, best: false, coins: 3 + 5 }, '다시 적기');
  assert.deepEqual(puts, [{ fishCatch: 1 }]);
  assert.equal(stored().fishing.dex.kkeuri.n, 1, '한 번만');
  assert.equal(stored().coins, 10 + 8);
  assert.deepEqual(await keepCatch({ key: 'gyarados', cm: 30 }, put), { ok: false, why: 'bad' });
  assert.deepEqual(await keepCatch(f, put, async () => { throw new Error('x'); }), { ok: false, why: 'save' });
  assert.equal(puts.length, 1);
  // 저장된 프로필에 그날 40을 채운 뒤 다른 날 기록이 섞여도(백업 병합) — 오늘 한도는 그대로
  const now = dayKeyOf(Date.now());
  const s1 = stored();
  fakeIdb.put('profile', { ...s1, fishing: mergeLake({ ...s1.fishing, paid: { [now]: 40 } }, { paid: { '2099-01-01': 5 } }), updatedAt: s1.updatedAt + 1 });
  await reloadProfile();
  const r = await lakeCatch({ key: 'pirami', cm: 10 });
  assert.deepEqual([r.ok, r.coins], [true, 0]);
  assert.equal(stored().fishing.paid[now], 40);
  // 화면 — 저장된 뒤에만 「낚았다」(잡은 목록·소리) · 못 적으면 다시 적기 카드 · 터치 막기는 그림과 감기 단추에만
  const fv = src('js/fishview.js');
  assert.match(fv, /if \(!info \|\| info\.ok === false\) \{ keepFailed\(f\); return; \}\n\s*ui\.palJump = performance\.now\(\);\n\s*try \{ sfx\.success\(\); \} catch \{ \/\* 무시 \*\/ \}\n\s*ui\.caught\.push\(f\);/);
  assert.match(fv, /'🔁 다시 적기'/);
  assert.match(src('js/lakeview.js'), /onCatch: \(f\) => keepCatch\(f, log\.put\),/);
  const css = src('css/style.css');
  assert.doesNotMatch(css.match(/^\.lk \{[^\n]*$/m)[0], /touch-action/, '창 전체는 막지 않음');
  assert.match(css, /^\.lk-cv \{[^\n]*touch-action: none;/m);
  assert.match(css, /^\.lk-btn \{[^\n]*touch-action: none;/m);
});

test('🔌 잇기 — 홈 띠 · ⚙ 분·🔒 +10분 · 창 id · 겹침 목록 · 대여행 문제 원천 · 서비스워커 · 판 · 문제 카드 동안 게임 시계 멈춤', () => {
  const html = src('index.html');
  assert.match(html, /<div id="home-journey" class="home-journey" hidden><\/div>\n\s*<!-- 🎣[^\n]*-->\n\s*<div id="home-lake" class="home-lake" hidden><\/div>/);
  for (const id of ['set-fish-min', 'set-fish-bonus', 'set-fish-today']) assert.match(html, new RegExp(`id="${id}"`));
  for (const m of FISH_MIN_CHOICES) assert.match(html, new RegExp(`<option value="${m}">${m}분</option>`));
  assert.doesNotMatch(html, /id="lk-lake"/, '창 id는 fishview가 만든다 — 페이지에 하나뿐');
  assert.match(src('js/fishview.js'), /root\.id = 'lk-lake';/);
  assert.match(src('js/home.js'), /import\('\.\/lakeview\.js'\)\.then\(\(m\) => m\.mountLakeCard\(\$\('home-lake'\)\)\)/);
  const pl = src('js/player.js');
  assert.match(pl, /fishMin: FISH_DAY_MIN,/);
  assert.match(pl, /fishMin: fishMinOf\(settings\.fishMin\),/);
  assert.match(pl, /settings\.fishMin = fishMinOf\(\$\('set-fish-min'\)\.value\);/);
  assert.match(pl, /\$\('set-fish-min'\)\.value = String\(fishMinOf\(settings\.fishMin\)\);/);
  assert.match(pl, /\(await import\('\.\/lakeview\.js'\)\)\.grantLakeTime\(\)/);
  assert.match(pl, /renderGameToday\(\);\n\s*renderLakeToday\(\);/);
  for (const f of ['js/hatch.js', 'js/parcel.js', 'js/korbattleview.js']) assert.match(src(f), /'jr-trip', 'lk-lake', 'lk-dex'\]/, `${f} 겹침 목록`); // 📖 도감 창 (v367)
  assert.match(src('js/journeyview.js'), /^export async function loadSources\(\) \{/m);
  assert.match(src('js/lakeview.js'), /const \[\{ loadSources \}\] = await Promise\.all\(\[import\('\.\/journeyview\.js'\)/);
  const sw = src('sw.js');
  for (const f of ['fishing', 'fishart', 'fishview', 'lakeview']) assert.match(sw, new RegExp(`'\\./js/${f}\\.js',`));
  // 판 글자는 그 판의 시험에서 (v367 — fishdex367)
  // 💰는 저장된 프로필로 한 트랜잭션 · 문제 카드 동안 게임 시계가 멈춤 · 낚시 시간은 ⏳ 과목 시간에 안 들어감(과목 화면이 아님)
  assert.match(src('js/xp.js'), /export function lakeCatch\(fish\) \{\n\s*return houseDo\(\(p\) => lakeCatchRule\(p, fish, Date\.now\(\)\)\);/);
  const fv = src('js/fishview.js');
  assert.match(fv, /ui\.paused = true;/);
  assert.match(fv, /if \(!ui\.paused\) \{\n\s*ui\.gclock \+= dt;/);
  assert.doesNotMatch(src('js/lakeview.js'), /mathTime|enTime|korTime|gamePlays/, '낚시는 과목 시간·게임 판을 안 건드림');
  // 아이 화면(홈 띠·창)에 남은 분·셈 문구 없음
  for (const f of ['js/lakeview.js', 'js/fishview.js']) {
    const s = src(f).split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*\*)/.test(l) && !/lakeTodayLine|오늘 — 낚시/.test(l)).join('\n');
    assert.doesNotMatch(s, /남은 (시간|분)|분 남|\$\{[^}]*\}분 더/, f);
  }
});
