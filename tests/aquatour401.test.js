// 🎟️ v401 아쿠아리움 손님 맞이 — 규칙(aquatour.js) · 매표 원고 · 정산 트랜잭션 · 병합 · 📊 장부 · 화면 잇기
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  TOUR_SEC, TOUR_DAY, TICKET, TIP, BOOK_COIN, TOUR_LVS, GUESTS_MIN, GUESTS_MAX, TOUR_DAILY, TOUR_AT, SEEK_TRIES,
  addDays, weekOf, tourOf, copyTour, mergeTour, ticketOf, groupSize, tourToday, tourDay, tourStart, tourAtBook, seekTourQ, waitingOf, waitingDay, pickVisitors, favOf,
  numJong, jong, payForm, payQuestion, tourEndRule, bookOf, bookRule, tourDayLine,
} from '../js/aquatour.js';
import { aquaOf } from '../js/aquarium.js';
import { softOf, dayKeyOf } from '../js/fishing.js';
import { asker } from '../js/lakeview.js';
import { emptyProfile, cloneProfile, mergeStatRecord, mergeDailyDelta } from '../js/db.js';
import { initProfile, flushProfile, getProfileSnapshot, tourEnd, tourBook, lakeCatch, aquaPut } from '../js/xp.js';

void fakeIdb;
const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const NOW = new Date(2026, 10, 10, 12).getTime(); // 11월 10일 화요일 낮 (그 기기 시계의 날)
const TODAY = '2026-11-10';
const KEYS = ['chambung', 'napjaru', 'pirami', 'bluegill', 'bungeo', 'ttokbung', 'dongjagae', 'kkeuri', 'nuchi', 'bass'];
const dex = (keys) => ({ dex: Object.fromEntries(keys.map((k) => [k, { n: 2, best: 20, d: '2026-11-01' }])) });
/** 꼬부기(7) · 피카츄(25) · 파이리(4) · 이상해씨(1) · 이브이(133) · 개굴닌자(658 파트너) */
const prof = (more = {}) => cloneProfile({ ...emptyProfile(), caught: { 7: 1, 25: 1, 4: 1, 1: 1, 133: 1, 658: 1 }, partner: 658, coins: 0, items: {}, fishing: dex(KEYS), aquarium: { fish: ['bungeo', 'ingeo'], deco: [], at: 1 }, ...more });
const money = (text) => Number(String(text).replace(/[^\d]/g, ''));

test('값 — 표 한 장 💰1~5 · 팁 5 · 해설 2·3·3단계 · 하루 세 무리 · 한 무리 끝 40 · 하루 끝 120', () => {
  assert.deepEqual(TICKET, [1, 2, 2, 3, 3, 4, 4, 5]);
  assert.equal(TIP, 5);
  assert.equal(BOOK_COIN, 10);
  assert.deepEqual(TOUR_LVS, [2, 3, 3], '판 2 — 1단계 뺌');
  assert.equal(TOUR_DAY, 3);
  assert.equal(TOUR_SEC, 900);
  assert.equal([GUESTS_MIN, GUESTS_MAX].join(), '3,5');
  const top = GUESTS_MAX * Math.max(...TICKET) + TIP * TOUR_LVS.length;
  assert.equal(top, 40);
  assert.equal(top * TOUR_DAY, 120);
});

test('날짜 — 그 주 월요일 · 달을 넘는 더하기', () => {
  assert.equal(weekOf('2026-11-10'), '2026-11-09');
  assert.equal(weekOf('2026-11-09'), '2026-11-09');
  assert.equal(weekOf('2026-11-15'), '2026-11-09', '일요일은 그 주 끝');
  assert.equal(weekOf('2026-11-01'), '2026-10-26');
  assert.equal(addDays('2026-10-30', 3), '2026-11-02');
  assert.equal(addDays('2026-11-09', -7), '2026-11-02');
});

test('표 한 장 — 수조 단계로', () => {
  assert.equal(ticketOf(prof()), 1);
  assert.equal(ticketOf(prof({ items: { aq_t2: 1 } })), 2);
  assert.equal(ticketOf(prof({ items: { aq_t2: 1, aq_t3: 1, aq_t4: 1 } })), 3);
  const all = Object.fromEntries([2, 3, 4, 5, 6, 7, 8].map((n) => [`aq_t${n}`, 1]));
  assert.equal(ticketOf(prof({ items: all })), 5);
  assert.equal(ticketOf(prof({ items: { aq_t3: 1 } })), 1, '끊긴 단계는 안 셈');
});

test('손님 수 — 처음 3 · 물고기 종류 8종 넘으면 +1 · 큰 구조물·우주 장식을 놓으면 +1 · 가방에만 있으면 안 셈', () => {
  assert.equal(groupSize(prof()), 3);
  const t3 = { aq_t2: 1, aq_t3: 1 };
  const eight = prof({ items: t3, aquarium: { fish: KEYS.slice(0, 8), deco: [], at: 1 } });
  assert.equal(new Set(aquaOf(eight).fish).size, 8);
  assert.equal(groupSize(eight), 3, '8종은 「넘지」 않음');
  const nine = prof({ items: t3, aquarium: { fish: KEYS.slice(0, 9), deco: [], at: 1 } });
  assert.equal(groupSize(nine), 4);
  const same = prof({ items: t3, aquarium: { fish: ['bungeo', 'bungeo', 'chambung', 'chambung', 'napjaru', 'napjaru', 'pirami', 'pirami', 'bass', 'bass'], deco: [], at: 1 } });
  assert.equal(groupSize(same), 3, '마리가 아니라 종류');
  assert.equal(groupSize(prof({ items: { aq_chest: 1 } })), 3, '가방에만');
  assert.equal(groupSize(prof({ items: { aq_chest: 1 }, aquarium: { fish: ['bungeo'], deco: ['aq_chest'], at: 1 } })), 4);
  assert.equal(groupSize(prof({ items: { aq_moon: 2 }, aquarium: { fish: ['bungeo'], deco: ['aq_moon', 'aq_moon'], at: 1 } })), 4, '우주 장식 · 둘이어도 한 번');
  assert.equal(groupSize(prof({ items: { aq_anchor: 1 }, aquarium: { fish: ['bungeo'], deco: ['aq_anchor'], at: 1 } })), 3, '닻은 작은 것');
  assert.equal(groupSize(prof({ items: { ...t3, aq_wreck: 1 }, aquarium: { fish: KEYS.slice(0, 9), deco: ['aq_wreck'], at: 1 } })), 5);
});

test('기다리는 손님 — 공부 15분마다 한 무리 · 하루 셋 · 맞이한 만큼 줄어듦 · 빈 수조엔 안 옴', () => {
  const p = prof();
  assert.equal(waitingOf(p, NOW, 0).waiting, false);
  assert.equal(waitingOf(p, NOW, 899).waiting, false);
  assert.equal(waitingOf(p, NOW, 900).waiting, true);
  assert.equal(waitingOf(p, NOW, 'x').waiting, false);
  const one = prof({ aquaTour: { days: { [TODAY]: { n: 1, c: 10, g: [[3, 1]] } } } });
  assert.equal(waitingOf(one, NOW, 900).waiting, false, '15분에 한 무리 — 이미 맞이함');
  assert.equal(waitingOf(one, NOW, 1800).waiting, true);
  const three = prof({ aquaTour: { days: { [TODAY]: { n: 3, c: 30, g: [] } } } });
  const w = waitingOf(three, NOW, 99999);
  assert.equal(w.waiting, false);
  assert.equal(w.full, true);
  const yesterday = prof({ aquaTour: { days: { '2026-11-09': { n: 3, c: 30, g: [] } } } });
  assert.equal(waitingOf(yesterday, NOW, 900).waiting, true, '그날만 — 어제 몫은 오늘과 상관없음');
  const empty = prof({ aquarium: { fish: [], deco: [], at: 1 } });
  assert.deepEqual([waitingOf(empty, NOW, 2700).waiting, waitingOf(empty, NOW, 2700).empty], [false, true]);
});

/** 정산 요청 — 오늘 시작한 k째 무리 */
const rq = (k, o) => ({ day: TODAY, k, ...o });

test('정산 — 표값(손님 × 표 한 장) + 맞힌 해설마다 팁 · 💰와 번 💰가 같이 · 무리·손님 차례·고른 물고기·온 날 적음', () => {
  const p = prof({ coins: 100, coinsEarned: 1000 });
  const r = tourEndRule(p, rq(0, { n: 4, t: 3, good: 2, sec: 900, likes: ['bungeo', 'ingeo', 'bungeo', 'xx'], visitors: [7, 25, 4, 1] }), NOW);
  assert.deepEqual(r, { ok: true, coins: 22, fare: 12, tips: 10, n: 1 });
  assert.equal(p.coins, 122);
  assert.equal(p.coinsEarned, 1022);
  assert.deepEqual(tourToday(p, NOW), { n: 1, c: 22, g: [[4, 3]] });
  assert.deepEqual(tourOf(p.aquaTour).likes[TODAY], { bungeo: 2, ingeo: 1 }, '모르는 종은 빼고');
  assert.equal(tourOf(p.aquaTour).seen['25'], TODAY);
  assert.equal(tourEndRule(p, rq(1, { n: 4, t: 3, good: 0, sec: 900 }), NOW).why, 'none', '15분 몫은 한 무리');
  const r2 = tourEndRule(p, rq(1, { n: 4, t: 3, good: 0, sec: 1800 }), NOW);
  assert.deepEqual([r2.ok, r2.coins, r2.tips, r2.n], [true, 12, 0, 2], '다 틀려도 표값은 그대로');
  assert.equal(tourEndRule(p, rq(2, { n: 5, t: 5, good: 3, sec: 9999 }), NOW).coins, 40);
  assert.equal(tourEndRule(p, rq(2, { n: 5, t: 5, good: 3, sec: 9999 }), NOW).why, 'none', '하루 세 무리');
  assert.equal(p.coins, 100 + 22 + 12 + 40);
  assert.equal(tourToday(p, NOW).c, 74);
});

test('정산 — 같은 무리는 한 번만 (두 창이 같은 첫 무리를 맞이해도 · Codex 203차)', () => {
  const p = prof({ coins: 0 });
  const one = rq(0, { n: 3, t: 1, good: 3, sec: 1800 });
  assert.equal(tourEndRule(p, { ...one }, NOW).coins, 18);
  assert.equal(tourEndRule(p, { ...one }, NOW).why, 'none', '30분 공부라 둘째 무리 몫이 있어도 첫 무리는 또 안 받음');
  assert.deepEqual([p.coins, tourToday(p, NOW).n, tourToday(p, NOW).g.length], [18, 1, 1], '손님 차례도 한 번만');
  assert.equal(tourEndRule(p, rq(2, { n: 3, t: 1, good: 0, sec: 1800 }), NOW).why, 'none', '앞 무리를 건너뛰지도 않음');
  assert.equal(tourEndRule(p, rq(1, { n: 3, t: 1, good: 0, sec: 1800 }), NOW).coins, 3, '둘째 무리는 둘째 번호로');
});

test('정산 — 자정을 넘기면 시작한 날 몫으로 · 그날 공부 초로 · 어제 시작한 것까지 (Codex 203차)', () => {
  const YDAY = addDays(TODAY, -1);
  const p = prof({ coins: 0, aquaTour: { days: { [TODAY]: { n: 0, c: 0, g: [] } }, seen: { 25: TODAY } } });
  const r = tourEndRule(p, { day: YDAY, k: 0, n: 3, t: 2, good: 1, sec: 900, likes: ['bungeo'], visitors: [25, 7] }, NOW);
  assert.deepEqual([r.ok, r.coins, r.n], [true, 11, 1], '어제 시작해 오늘 끝낸 것');
  const tr = tourOf(p.aquaTour);
  assert.deepEqual(tr.days[YDAY], { n: 1, c: 11, g: [[3, 2]] }, '어제 기록에');
  assert.equal(tourToday(p, NOW).n, 0, '오늘 몫은 그대로');
  assert.deepEqual(tr.likes[YDAY], { bungeo: 1 });
  assert.deepEqual([tr.seen['25'], tr.seen['7']], [TODAY, YDAY], '온 날은 앞으로 안 돌림');
  assert.equal(tourEndRule(p, { day: TODAY, k: 0, n: 3, t: 2, good: 0, sec: 0 }, NOW).why, 'none', '오늘 공부 0초면 오늘 첫 무리 없음 (어제 초로 안 받음)');
  assert.equal(tourEndRule(p, { day: addDays(TODAY, -2), k: 0, n: 3, t: 2, good: 0, sec: 2700 }, NOW).why, 'late', '그저께 시작한 것');
  assert.equal(tourEndRule(p, { day: addDays(TODAY, 1), k: 0, n: 3, t: 2, good: 0, sec: 2700 }, NOW).why, 'late', '시계가 뒤로 간 것');
  assert.equal(p.coins, 11);
});

test('정산 — 깨진 값은 안 받음', () => {
  const p = prof({ coins: 5 });
  for (const bad of [{ n: 2, t: 1, good: 0 }, { n: 6, t: 1, good: 0 }, { n: 3, t: 0, good: 0 }, { n: 3, t: 6, good: 0 }, { n: 3, t: 1, good: 4 }, { n: 3.5, t: 1, good: 0 }, { n: '3', t: 1, good: 0 }, null]) {
    assert.equal(tourEndRule(p, bad && rq(0, { ...bad, sec: 2700 }), NOW).why, 'bad', JSON.stringify(bad));
  }
  for (const bad of [{ k: -1 }, { k: 3 }, { k: '0' }, { k: 0.5 }, { k: undefined }, { day: '2026-11-1' }, { day: undefined }, { day: 20261110 }]) {
    assert.equal(tourEndRule(p, { day: TODAY, k: 0, n: 3, t: 1, good: 0, sec: 2700, ...bad }, NOW).why, 'bad', JSON.stringify(bad));
  }
  assert.equal(p.coins, 5);
  assert.equal(p.aquaTour, undefined);
});

test('정산 — 기기 날짜가 크게 뒤로 가면 💰 없이 (오늘 몫을 적어도 바로 버려져 한도가 다시 열리던 길을 막음)', () => {
  const days = Object.fromEntries(Array.from({ length: 14 }, (_, i) => [addDays('2026-12-01', i), { n: 3, c: 60, g: [] }]));
  const p = prof({ coins: 0, aquaTour: { days } });
  assert.equal(tourEndRule(p, rq(0, { n: 3, t: 1, good: 0, sec: 2700 }), NOW).why, 'clock');
  assert.equal(tourEndRule(p, { ...rq(0, { n: 3, t: 1, good: 0, sec: 2700 }), day: addDays(TODAY, -1) }, NOW).why, 'clock', '어제 몫도');
  assert.equal(p.coins, 0);
  const mixed = { ...days };
  delete mixed['2026-12-14'];
  mixed['2026-11-01'] = { n: 1, c: 3, g: [] };
  const q = prof({ coins: 0, aquaTour: { days: mixed } });
  assert.equal(tourEndRule(q, rq(0, { n: 3, t: 1, good: 0, sec: 2700 }), NOW).ok, true, '오늘보다 앞선 날이 있으면 오늘 몫은 남는다');
  assert.equal(tourOf(q.aquaTour).days[TODAY].n, 1);
});

test('고쳐 읽기 — 깨진 칸 · 날 칸은 늦은 날 14개(빈 날 먼저 빼고) · 온 날 240개', () => {
  assert.deepEqual(tourOf(null), { days: {}, likes: {}, book: {}, seen: {} });
  const t = tourOf({ days: { [TODAY]: { n: 9, c: -3, g: [[3, 1], [9, 9], 'x', [4, 2], [5, 5], [3, 3]] }, bad: { n: 1 }, '2026-11-01': { n: 0, c: 0 } }, likes: { [TODAY]: { bungeo: 2, nope: 3, __proto__: 1 } }, book: { '2026-11-02': 1, x: 1, '2026-10-26': 0 }, seen: { 7: TODAY, 0: TODAY, '-1': TODAY, abc: TODAY, 25: 'x' } });
  assert.deepEqual(t.days, { [TODAY]: { n: 3, c: 0, g: [[3, 1], [4, 2], [5, 5]] } });
  assert.deepEqual(t.likes, { [TODAY]: { bungeo: 2 } });
  assert.deepEqual(t.book, { '2026-11-02': 1 });
  assert.deepEqual(t.seen, { 7: TODAY });
  const many = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [addDays('2026-10-01', i), { n: 1, c: 1 }]));
  many['2026-12-31'] = { n: 0, c: 0 };
  const kept = Object.keys(tourOf({ days: many }).days);
  assert.equal(kept.length, 14);
  assert.equal(kept[kept.length - 1], '2026-10-20', '빈 날이 늦어도 받은 날이 밀려나지 않음');
  const seen = Object.fromEntries(Array.from({ length: 300 }, (_, i) => [String(i + 1), addDays('2026-01-01', i)]));
  const s = tourOf({ seen }).seen;
  assert.equal(Object.keys(s).length, 240);
  assert.equal(s['300'], addDays('2026-01-01', 299), '늦게 온 쪽이 남음');
  assert.equal(s['1'], undefined);
  assert.deepEqual(copyTour({ days: { [TODAY]: { n: 1, c: 2 } } }), tourOf({ days: { [TODAY]: { n: 1, c: 2 } } }));
});

test('병합 — 날마다 무리·💰는 큰 쪽(옛 백업이 한도를 되살리지 못함) · 고른 물고기는 칸마다 큰 쪽 · 장부 합집합 · 온 날은 늦은 쪽', () => {
  assert.equal(mergeTour(null, undefined), null);
  const a = { days: { [TODAY]: { n: 2, c: 30, g: [[3, 2], [4, 2]] }, '2026-11-09': { n: 1, c: 5, g: [[3, 1]] } }, likes: { [TODAY]: { bungeo: 3, ingeo: 1 } }, book: { '2026-11-02': 1 }, seen: { 7: '2026-11-09', 25: TODAY } };
  const b = { days: { [TODAY]: { n: 1, c: 40, g: [[5, 5]] } }, likes: { [TODAY]: { bungeo: 1, bass: 2 } }, book: { '2026-10-26': 1 }, seen: { 7: TODAY, 4: '2026-11-01' } };
  const m = mergeTour(a, b);
  assert.deepEqual(m.days[TODAY], { n: 2, c: 40, g: [[3, 2], [4, 2]] });
  assert.deepEqual(m.days['2026-11-09'], { n: 1, c: 5, g: [[3, 1]] });
  assert.deepEqual(m.likes[TODAY], { bungeo: 3, ingeo: 1, bass: 2 });
  assert.deepEqual(m.book, { '2026-10-26': 1, '2026-11-02': 1 });
  assert.deepEqual(m.seen, { 7: TODAY, 25: TODAY, 4: '2026-11-01' });
  assert.deepEqual(mergeTour(b, a), m, '어느 차례로 합쳐도 같음');
  assert.deepEqual(mergeTour(a, null), tourOf(a));
  const older = { updatedAt: 100, coins: 900, aquaTour: a };
  const later = { updatedAt: 200, coins: 400, aquaTour: b };
  const out = mergeStatRecord('profile', older, later);
  assert.deepEqual(out.aquaTour.days[TODAY], { n: 2, c: 40, g: [[3, 2], [4, 2]] });
  assert.equal(out.coins, 400, '💰는 최근 쪽 그대로');
  assert.equal(mergeStatRecord('profile', { updatedAt: 1, coins: 1 }, { updatedAt: 2, coins: 2 }).aquaTour, undefined);
});

test('손님 고르기 — 가진 포켓몬만(파트너 빼고) · 오래 안 온 것부터 · 같은 날·무리면 늘 같음', () => {
  const p = prof();
  const all = pickVisitors(p, TODAY, 0, 9);
  assert.deepEqual([...all].sort((x, y) => x - y), [1, 4, 7, 25, 133], '파트너 658 빼고');
  assert.deepEqual(pickVisitors(p, TODAY, 0, 3), all.slice(0, 3));
  assert.deepEqual(pickVisitors(p, TODAY, 0, 3), pickVisitors(prof(), TODAY, 0, 3));
  const q = prof({ aquaTour: { seen: { 1: TODAY, 4: TODAY, 7: '2026-11-01' } } });
  const v = pickVisitors(q, TODAY, 1, 3);
  assert.deepEqual(v.slice(0, 2).sort((x, y) => x - y), [25, 133], '한 번도 안 온 것 먼저');
  assert.equal(v[2], 7, '그다음 오래전에 온 것');
  assert.deepEqual(pickVisitors(prof({ caught: { 658: 1 } }), TODAY, 0, 3), []);
  assert.deepEqual(pickVisitors(p, TODAY, 0, 0), []);
});

test('가장 멋진 물고기 — 수조에 든 물고기에서 · 문어 무리는 물고기가 없을 때만', () => {
  const p = prof({ items: { aq_t2: 1 }, fishing: dex([...KEYS, 'daemuneo', 'galchi']), aquarium: { fish: ['bungeo', 'daemuneo', 'galchi'], deco: [], at: 1 } });
  const f = favOf(p, 7, 5);
  assert.equal(f.length, 5);
  f.forEach((k) => assert.ok(['bungeo', 'galchi'].includes(k), k));
  const octo = prof({ fishing: dex(['daemuneo']), aquarium: { fish: ['daemuneo'], deco: [], at: 1 } });
  assert.equal(softOf('daemuneo'), 'octo');
  assert.deepEqual(favOf(octo, 1, 2), ['daemuneo', 'daemuneo']);
  assert.deepEqual(favOf(prof({ aquarium: { fish: [], deco: [], at: 1 } }), 1, 3), []);
  const seen = new Set();
  for (let s = 1; s < 60; s++) favOf(p, s, 1).forEach((k) => seen.add(k));
  assert.deepEqual([...seen].sort(), ['bungeo', 'galchi'], '씨앗마다 고루');
});

test('조사 — 숫자 읽는 소리 받침 · 낱말 받침', () => {
  const want = { 0: true, 1: true, 2: false, 3: true, 4: false, 5: false, 6: true, 7: true, 8: true, 9: false, 10: true, 12: false, 20: true, 38: true, 46: true, 50: true, 100: true };
  for (const [n, b] of Object.entries(want)) assert.equal(numJong(Number(n)), b, n);
  assert.equal(jong('갈치'), false);
  assert.equal(jong('잉어'), false);
  assert.equal(jong('참붕어'), false);
  assert.equal(jong('대문어'), false);
  assert.equal(jong('농어'), false);
  assert.equal(jong('감성돔'), true);
  assert.equal(jong('피카츄'), false);
  assert.equal(jong('파이리'), false);
  assert.equal(jong('꼬부기'), false);
  assert.equal(jong('이상해씨'), false);
  assert.equal(jong('개굴닌자'), false);
  assert.equal(jong('뮤츠'), false);
  assert.equal(jong('루카리오'), false);
  assert.equal(jong('리자몽'), true);
  assert.equal(jong('ABC'), false);
});

/** 정답 값 */
const answerOf = (q) => money(q.choices.find((c) => c.ok).text);

test('매표 — 세 꼴 모두 보기 넷 · 정답 하나 · 값이 서로 다름 · 셈이 맞음 · 틀린 보기마다 한 줄', () => {
  let paid50 = 0;
  let paid100 = 0;
  for (let t = 1; t <= 5; t++) for (let n = 3; n <= 5; n++) for (let s = 1; s <= 60; s++) {
    for (const form of ['change', 'unit', 'today']) {
      const prev = [[4, t], [n, t]];
      const q = payQuestion({ n, t, form, prev, seed: s });
      const tag = `${form} t${t} n${n} s${s}`;
      assert.equal(q.choices.length, 4, tag);
      assert.equal(q.choices.filter((c) => c.ok).length, 1, tag);
      assert.equal(new Set(q.choices.map((c) => c.text)).size, 4, tag);
      q.choices.forEach((c) => { assert.match(c.text, /^💰\d+$/, tag); assert.ok(money(c.text) > 0, tag); if (!c.ok) assert.ok(c.hint && c.hint.length > 4, tag); });
      assert.equal(q.fare, n * t, tag);
      assert.equal(q.label, '🎟️ 매표소');
      if (form === 'unit') assert.equal(answerOf(q), t, tag);
      if (form === 'today') assert.equal(answerOf(q), (4 + n + n) * t, tag);
      if (q.form === 'change') {
        const paid = /💰(50|100)[을를] 냈어요/.exec(q.q);
        assert.ok(paid, tag);
        assert.equal(answerOf(q), Number(paid[1]) - n * t, tag);
        q.choices.forEach((c) => assert.ok(money(c.text) < Number(paid[1]), `${tag} 거스름돈이 낸 돈보다 클 수 없음`));
        if (paid[1] === '50') paid50 += 1; else paid100 += 1;
      }
      for (const m of q.q.matchAll(/💰(\d+)(을|를|이면|면) /g)) assert.equal(['을', '이면'].includes(m[2]), numJong(Number(m[1])), `${tag} 조사 ${m[0]}`);
    }
  }
  assert.ok(paid50 > 100 && paid100 > 100, '낸 돈 💰50·💰100이 고루');
});

test('매표 원고 — 기본안 판 2의 세 예 그대로(정답 · 틀린 보기 · 한 줄)', () => {
  let ch = null;
  for (let s = 1; s < 200 && !ch; s++) { const q = payQuestion({ n: 4, t: 3, form: 'change', seed: s }); if (q.q.includes('💰50을')) ch = q; }
  assert.equal(ch.q, '손님 4마리 · 표 한 장 💰3. 대표 손님이 💰50을 냈어요. 거스름돈은 얼마일까요?');
  const by = Object.fromEntries(ch.choices.map((c) => [money(c.text), c]));
  assert.deepEqual(Object.keys(by).map(Number).sort((a, b) => a - b), [12, 38, 42, 47]);
  assert.equal(by[38].ok, true);
  assert.match(by[12].hint, /^표값을 낸 돈에서 빼야 해요/);
  assert.match(by[47].hint, /^표값은 한 장 값 × 손님 수예요/);
  assert.match(by[42].hint, /^0에서 2를 못 빼면 십의 자리에서 10을 받아내려요/);
  assert.equal(ch.solve, '표값 3 × 4 = 12, 거스름돈 50 − 12 = 38');
  const un = payQuestion({ n: 5, t: 4, form: 'unit', seed: 3 });
  assert.equal(un.q, '손님 5마리가 표값으로 모두 💰20을 냈어요. 표 한 장은 얼마일까요?');
  const bu = Object.fromEntries(un.choices.map((c) => [money(c.text), c]));
  assert.deepEqual(Object.keys(bu).map(Number).sort((a, b) => a - b), [4, 15, 25, 100]);
  assert.match(bu[15].hint, /^똑같이 나누는 것은 나눗셈이에요/);
  assert.match(bu[100].hint, /^곱하면 더 커져요/);
  assert.match(bu[25].hint, /^손님 수를 더하는 게 아니에요/);
  const td = payQuestion({ n: 5, t: 4, form: 'today', prev: [[4, 4], [5, 4]], seed: 3 });
  assert.equal(td.q, '오늘 손님은 4마리, 5마리, 이번에 5마리예요. 표 한 장이 💰4면 오늘 표값은 모두 얼마일까요?');
  const bt = Object.fromEntries(td.choices.map((c) => [money(c.text), c]));
  assert.deepEqual(Object.keys(bt).map(Number).sort((a, b) => a - b), [18, 20, 52, 56]);
  assert.match(bt[20].hint, /^이번 무리만 셌어요/);
  assert.match(bt[18].hint, /^손님 수\(14\)에 표 한 장 값을 곱해요/);
  assert.equal(bt[52].hint, '4 + 5 + 5 = 14, 14 × 4 = 56');
  const big = payQuestion({ n: 4, t: 3, form: 'today', prev: [[4, 3], [4, 3]], seed: 1 });
  assert.match(big.q, /💰3이면/, '받침 있는 수는 「이면」');
  let c100 = null;
  for (let s = 1; s < 200 && !c100; s++) { const q = payQuestion({ n: 4, t: 3, form: 'change', seed: s }); if (q.q.includes('💰100을')) c100 = q; }
  const b100 = Object.fromEntries(c100.choices.map((c) => [money(c.text), c]));
  assert.equal(b100[88].ok, true);
  assert.match(b100[98].hint, /^받아내리면 윗자리 수는 1 작아져요/);
});

test('매표 꼴 — 셋째 무리이고 앞 두 무리 표 한 장 값이 같으면 「오늘 모두」 · 💰1이면 거스름돈만 · 나머지는 반반', () => {
  assert.equal(payForm(2, [[3, 2], [4, 2]], 2, 1), 'today');
  assert.notEqual(payForm(2, [[3, 2], [4, 3]], 3, 1), 'today', '중간에 수조를 올리면');
  assert.notEqual(payForm(2, [[3, 2]], 2, 1), 'today');
  assert.notEqual(payForm(1, [[3, 2], [4, 2]], 2, 1), 'today');
  for (let s = 1; s < 30; s++) assert.equal(payForm(0, [], 1, s), 'change');
  const seen = new Set();
  for (let s = 1; s < 60; s++) seen.add(payForm(0, [], 3, s));
  assert.deepEqual([...seen].sort(), ['change', 'unit']);
});

test('매표 틀린 보기 — 모두 진짜 실수에서(정답 둘레 수로 안 채움) · 거스름돈은 표값의 반일 때도 (Codex 203차)', () => {
  const traps = { change: new Set(['fare', 'one', 'borrow', 'plus']), unit: new Set(['sub', 'mul', 'add']), today: new Set(['only', 'add', 'sum', 'prev']) };
  for (let t = 1; t <= 5; t++) for (let n = 3; n <= 5; n++) for (let s = 1; s <= 60; s++) {
    for (const form of ['change', 'unit', 'today']) {
      if (form === 'unit' && t <= 1) continue; // payForm — 💰1이면 거스름돈만
      for (const prev of [[[4, t], [n, t]], [[3, t], [5, t]], [[n, t], [n, t]]]) {
        const q = payQuestion({ n, t, form, prev, seed: s });
        for (const c of q.choices) if (!c.ok) assert.ok(traps[q.form].has(c.trap), `${form} n${n} t${t} s${s} ${c.text} ${c.trap}`);
      }
    }
  }
  // 💰50 − 25 — 표값 보기가 정답과 겹친다 (Codex 203차 예: 26이 정답 둘레 수로 들어왔다)
  let h50 = null;
  for (let s = 1; s < 200 && !h50; s++) { const q = payQuestion({ n: 5, t: 5, form: 'change', seed: s }); if (q.q.includes('💰50을')) h50 = q; }
  const by = Object.fromEntries(h50.choices.map((c) => [money(c.text), c]));
  assert.deepEqual(Object.keys(by).map(Number).sort((a, b) => a - b), [25, 35, 40, 45]);
  assert.equal(by[25].ok, true);
  assert.match(by[40].hint, /^손님 수와 한 장 값은 더하지 말고 곱해요/);
});

test('해설 질문 찾기 — 1단계로 내려온 문제는 버리고 더 찾음 · 끝내 없으면 건너뜀 · 못 만드는 과목은 다음 과목으로 (Codex 203차)', () => {
  const ch = [{ text: 'o', ok: true }, { text: 'x', ok: false }];
  // plan[과목] = 부를 때마다 낼 단계 (0 = lv 칸 없는 기본 꼴 · 다 쓰면 못 만듦)
  const maker = (plan) => { const calls = []; return { calls, make: (s) => { calls.push(s); const lv = plan[s] ? plan[s].shift() : undefined; return lv === undefined ? null : { q: `${s}${calls.length}`, ...(lv ? { lv } : {}), choices: ch }; } }; };
  // 넷째까지 1단계 · 다섯째가 2단계 (옛 코드는 넷만 보고 1단계를 냈다)
  let m = maker({ english: [1, 1, 1, 1, 2] });
  let r = seekTourQ(['english', 'korean'], m.make);
  assert.deepEqual([r.subj, r.q.lv, m.calls.length], ['english', 2, 5]);
  // lv가 없는 기본 꼴은 1단계
  m = maker({ english: Array(SEEK_TRIES + 3).fill(0) });
  r = seekTourQ(['english'], m.make);
  assert.equal(r, null, '2·3단계를 하나도 못 만들면 건너뜀 (1단계로 안 냄)');
  assert.equal(m.calls.length, SEEK_TRIES, '한 과목에서 정한 만큼만');
  // 못 만드는 과목은 다음 과목
  m = maker({ math: [], korean: [1, 3] });
  r = seekTourQ(['math', 'korean'], m.make);
  assert.deepEqual([r.subj, r.q.lv], ['korean', 3]);
  assert.equal(seekTourQ([], m.make), null);
});

test('다시 열면 이어서 — 버린 문제까지 넘긴 자리를 과목마다 적고 그 뒤부터 (Codex 203차)', () => {
  const keys = Array.from({ length: 10 }, (_, i) => `k${i}`);
  const made = [];
  let calls = 0;
  const src = { keys, make: (key) => { calls += 1; made.push(key); return { q: key, lv: calls <= 2 ? 1 : 2, choices: [{ text: 'o', ok: true }, { text: 'x', ok: false }] }; } };
  const log = {};
  const stepped = (s, step) => { log[TOUR_AT[s]] = (log[TOUR_AT[s]] || 0) + step; };
  const ask1 = asker({ english: src }, TODAY, tourStart({}), 'aqua', stepped);
  const r1 = seekTourQ(['english'], (s) => ask1(s, 1, 2));
  assert.equal(r1.q.q, made[2], '두 번 버리고 셋째');
  assert.deepEqual(log, { aqEnAt: 3 }, '버린 자리까지 셋');
  assert.deepEqual(tourStart({ aqEnAt: 3, aqMathAt: 1, aqEnQ: 1 }), { math: 1, english: 3, korean: 0, nonsul: 0 }, '낸 문제 수가 아니라 넘긴 자리');
  // 다시 열기 — 그날 기록의 넘긴 자리부터
  const seen = new Set(made);
  made.length = 0;
  const ask2 = asker({ english: src }, TODAY, tourStart(log), 'aqua', stepped);
  const r2 = seekTourQ(['english'], (s) => ask2(s, 1, 2));
  assert.ok(!seen.has(r2.q.q), `본 문제(${[...seen]})가 또 나오지 않음 — ${r2.q.q}`);
  assert.deepEqual(log, { aqEnAt: 4 });
});

/** 지난주(11-02~11-08) 고른 물고기 */
const likesWeek = (o) => ({ aquaTour: { likes: o } });

test('📊 장부 — 지난주만 모아 많이 고른 차례로 넷 · 눈금 · 질문 둘의 정답 · 이미 봤으면 없음', () => {
  const p = prof(likesWeek({ '2026-11-03': { galchi: 6, busiri: 2, bangeo: 1 }, '2026-11-08': { galchi: 4, busiri: 4, bangeo: 3, ingeo: 2, bungeo: 1 }, '2026-11-09': { bungeo: 50 }, '2026-11-01': { ingeo: 50 } }));
  const b = bookOf(p, NOW);
  assert.equal(b.week, '2026-11-02');
  assert.deepEqual(b.bars.map((x) => [x.ko, x.v]), [['갈치', 10], ['부시리', 6], ['방어', 4], ['잉어', 2]], '이번 주·그 전 주는 안 셈 · 넷까지');
  assert.equal(b.unit, 1);
  assert.equal(b.qs.length, 2);
  const [q1, q2] = b.qs;
  assert.equal(q1.q, '손님이 가장 많이 고른 물고기는 무엇일까요?');
  assert.equal(q1.choices.find((c) => c.ok).text, '갈치');
  assert.equal(q2.q, '갈치를 고른 손님은 잉어를 고른 손님보다 몇 마리 더 많을까요?');
  assert.equal(q2.choices.find((c) => c.ok).text, '8마리');
  for (const q of b.qs) {
    assert.equal(q.choices.filter((c) => c.ok).length, 1);
    assert.equal(new Set(q.choices.map((c) => c.text)).size, q.choices.length);
    assert.ok(q.choices.length >= 3);
    q.choices.filter((c) => !c.ok).forEach((c) => assert.ok(c.hint));
  }
  assert.equal(bookOf(prof({ aquaTour: { ...p.aquaTour, book: { '2026-11-02': 1 } } }), NOW), null, '이미 봄');
  assert.equal(bookOf(prof(likesWeek({ '2026-11-03': { galchi: 3 } })), NOW), null, '막대 하나');
  assert.equal(bookOf(prof(), NOW), null);
});

test('📊 장부 — 맨 위가 같으면 「몇 마리」 · 다 같으면 눈금 한 칸 · 눈금 2·5마리', () => {
  const tie = bookOf(prof(likesWeek({ '2026-11-04': { galchi: 12, busiri: 12, bangeo: 5 } })), NOW);
  assert.equal(tie.unit, 2);
  assert.equal(tie.bars[0].ko, '갈치', '같으면 이름 차례');
  assert.equal(tie.qs[0].q, '갈치를 고른 손님은 몇 마리일까요?');
  assert.equal(tie.qs[0].choices.find((c) => c.ok).text, '12마리');
  assert.equal(tie.qs[1].choices.find((c) => c.ok).text, '7마리');
  const flat = bookOf(prof(likesWeek({ '2026-11-04': { galchi: 3, busiri: 3 } })), NOW);
  assert.equal(flat.qs[1].q, '세로 눈금 한 칸은 몇 마리일까요?');
  assert.equal(flat.qs[1].choices.find((c) => c.ok).text, '1마리');
  assert.equal(bookOf(prof(likesWeek({ '2026-11-04': { galchi: 21, busiri: 3 } })), NOW).unit, 5);
  assert.equal(bookOf(prof(likesWeek({ '2026-11-04': { galchi: 20, busiri: 3 } })), NOW).unit, 2);
  assert.equal(bookOf(prof(likesWeek({ '2026-11-04': { galchi: 10, busiri: 3 } })), NOW).unit, 1);
});

test('📊 장부 보기 — 주마다 한 번 · 맞힌 질문마다 💰10 · 지난주가 아니면 안 받음', () => {
  const p = prof({ coins: 0, coinsEarned: 0 });
  const day = TODAY;
  assert.deepEqual(bookRule(p, { week: '2026-11-02', good: 2, day }, NOW), { ok: true, coins: 20 });
  assert.equal(p.coins, 20);
  assert.equal(p.coinsEarned, 20);
  assert.equal(bookRule(p, { week: '2026-11-02', good: 2, day }, NOW).why, 'done');
  assert.equal(bookRule(p, { week: '2026-10-26', good: 1, day }, NOW).why, 'changed');
  assert.equal(bookRule(p, { week: '2026-11-02', good: 3, day }, NOW).why, 'bad');
  assert.equal(bookRule(p, { week: 'x', good: 0, day }, NOW).why, 'bad');
  assert.equal(bookRule(p, { week: '2026-11-02', good: 0 }, NOW).why, 'bad', '연 날 없음');
  const q = prof({ coins: 0 });
  assert.deepEqual(bookRule(q, { week: '2026-11-02', good: 0, day }, NOW), { ok: true, coins: 0 });
  assert.equal(q.coins, 0);
  assert.equal(tourOf(q.aquaTour).book['2026-11-02'], 1, '못 맞혀도 본 것으로');
});

test('📊 장부 — 일요일 밤에 열어 월요일에 덮어도 연 날의 지난주로 받음 · 그저께 연 것은 안 받음 (Codex 206차)', () => {
  const SUN = '2026-11-08';
  const MON = new Date(2026, 10, 9, 0, 5).getTime();
  const p = prof({ coins: 0 });
  const book = bookOf(likesWeek({ '2026-10-27': { galchi: 3, busiri: 1 } }), new Date(2026, 10, 8, 23, 58).getTime());
  assert.equal(book.week, '2026-10-26', '일요일의 지난주');
  assert.deepEqual(bookRule(p, { week: book.week, good: 2, day: SUN }, MON), { ok: true, coins: 20 }, '월요일 0시 5분에 덮음');
  assert.equal(bookRule(p, { week: book.week, good: 2, day: SUN }, MON).why, 'done', '두 번은 안 받음');
  assert.equal(bookRule(prof(), { week: '2026-11-02', good: 1, day: SUN }, MON).why, 'changed', '연 날의 지난주가 아님');
  assert.equal(bookRule(prof(), { week: '2026-10-26', good: 1, day: SUN }, NOW).why, 'changed', '그저께 연 것');
  assert.equal(p.coins, 20);
});

test('기다리는 손님 — 날을 정해 다시 봄 (장부를 보다 자정을 넘겨도 시작한 날로 · Codex 206차)', () => {
  const YDAY = addDays(TODAY, -1);
  const p = prof({ aquaTour: { days: { [TODAY]: { n: 3, c: 30, g: [] } } } });
  assert.equal(waitingDay(p, YDAY, 900).waiting, true, '어제 공부 15분 · 어제 맞이 0');
  assert.equal(waitingDay(p, TODAY, 2700).waiting, false, '오늘은 세 무리를 다 맞이함');
  assert.equal(waitingDay(p, YDAY, 899).waiting, false);
  assert.deepEqual(waitingOf(p, NOW, 2700), waitingDay(p, TODAY, 2700), '지금 날로 보면 같음');
});

test('넘긴 자리 장부 — 저장이 실패한 채 다시 열어도 같은 앱 안에서는 그 뒤부터 · 처음부터 센 자리라 두 번 안 셈 · 날이 바뀌면 새로 (Codex 206차)', () => {
  const keys = Array.from({ length: 10 }, (_, i) => `k${i}`);
  const made = [];
  const src = { keys, make: (key) => { made.push(key); return { q: key, lv: 2, choices: [{ text: 'o', ok: true }, { text: 'x', ok: false }] }; } };
  const at = tourAtBook();
  // 첫 맞이 — 넘긴 자리 저장은 실패(저장된 기록은 빈 채로)
  const s1 = at.start({}, TODAY);
  const pos1 = { ...s1 };
  const ask1 = asker({ english: src }, TODAY, s1, 'aqua', (s, step) => { pos1[s] += step; at.moved(TODAY, s, pos1[s]); });
  ask1('english', 1, 2);
  ask1('english', 2, 2);
  const seen = new Set(made);
  made.length = 0;
  // 다시 열기 — 저장된 기록엔 아무것도 없지만 메모리의 자리부터
  const s2 = at.start({}, TODAY);
  assert.equal(s2.english, 2);
  const ask2 = asker({ english: src }, TODAY, s2, 'aqua');
  const q2 = ask2('english', 3, 2);
  assert.ok(!seen.has(q2.q), `본 문제(${[...seen]})가 또 나오지 않음 — ${q2.q}`);
  // 늦게 저장돼 기록이 더 크면 기록대로 · 메모리는 처음부터 센 자리라 더하지 않음
  assert.equal(at.start({ aqEnAt: 5 }, TODAY).english, 5);
  assert.equal(at.start({ aqEnAt: 1 }, TODAY).english, 2);
  at.moved(TODAY, 'english', 1);
  assert.equal(at.start({}, TODAY).english, 2, '뒤로 안 감');
  at.moved(TODAY, 'xx', 9);
  assert.equal(at.start({}, addDays(TODAY, 1)).english, 0, '날이 바뀌면 새로');
  at.moved(TODAY, 'english', 7);
  assert.equal(at.start({}, addDays(TODAY, 1)).english, 0, '어제 자리는 오늘에 안 옴');
});

test('📤 한 줄 · 하루 기록 칸이 모두 더해짐', () => {
  assert.equal(tourDayLine({}), '');
  assert.equal(tourDayLine(null), '');
  const d = { aqGroups: 2, aqCoins: 45, aqPayQ: 2, aqPayOk: 1, aqMathQ: 3, aqMathOk: 2, aqFmQ: 1, aqFmOk: 1, aqEnQ: 2, aqEnOk: 2, aqLv2Q: 2, aqLv2Ok: 2, aqLv3Q: 3, aqLv3Ok: 2, aqBookQ: 2, aqBookOk: 1 };
  assert.equal(tourDayLine(d), '🎟️ 손님 맞이 2무리 · 💰 45 · 매표 1/2 · 해설 수학 2/3(🐟 1/1) · 영어 2/2 · 2단계 2/2 · 3단계 2/3 · 📊 장부 1/2');
  const delta = Object.fromEntries(TOUR_DAILY.map((k) => [k, 1]));
  const once = mergeDailyDelta(null, TODAY, delta);
  const twice = mergeDailyDelta(once, TODAY, delta);
  TOUR_DAILY.forEach((k) => assert.equal(twice[k], 2, k));
  assert.equal(new Set(TOUR_DAILY).size, TOUR_DAILY.length);
});

test('아이 화면 글 — 남은 손님·셈 문구 없음 · 🔔에 숫자 없음', () => {
  const tv = read('js/tourview.js');
  const shown = [...tv.matchAll(/'([^'\n]*[가-힣][^'\n]*)'|`([^`\n]*[가-힣][^`\n]*)`/g)].map((m) => m[1] || m[2]).filter((s) => !/^\.\/|^[a-z-]+$/.test(s));
  assert.ok(shown.length > 20);
  for (const s of shown) assert.doesNotMatch(s, /남은|남았|더 와요|몇 무리|무리 더|번째 손님|분 더/, s);
  assert.match(tv, /'🎟️ 공부하고 오면 손님이 와요'/);
  assert.match(tv, /'🎟️ 손님들이 내일 또 와요'/);
  const lv = read('js/lakeview.js');
  assert.match(lv, /el\('span', 'lk-home-bell', '🔔'\)/);
  assert.doesNotMatch(lv.slice(lv.indexOf('lk-home-bell') - 300, lv.indexOf('lk-home-bell') + 200), /done|\.n\b/, '🔔 옆에 수를 안 씀');
});

test('🔌 잇기 — 홈 🐠 🔔 · 아쿠아리움 안 단추 · 닫으면 멈춤 · 정산·장부 트랜잭션 · 저장 복사·병합 · 📤 · sw · 판', () => {
  const lv = read('js/lakeview.js');
  assert.match(lv, /waitingOf\(getProfileSnapshot\(\), Date\.now\(\), studySec\(dailyNow\(\)\)\)\.waiting/);
  assert.match(lv, /export function askFrom\(src, subj, today, at, seed, lv = 1, tag = 'lake', max = 12\)/); // v418 — max(✍️ 직접 쓰기 수학은 한 바퀴)
  assert.match(lv, /orderOf\(src\.keys, `\$\{tag\}:\$\{today\}`, subj\)/);
  assert.match(lv, /mathMix\(asker\(srcs, day, start, 'lake',/, '낚시터는 옛 줄 그대로(v418부터 ✍️ 직접 쓰기 원천 srcs · 넘긴 자리 · 수학 한 바퀴)');
  assert.match(lv, /m\.openAqua\(\{ onClose: \(\) => \{ if \(onClose\) onClose\(\); if \(cardBox && !isLakeOpen\(\)\) mountLakeCard\(cardBox\)/, '닫으면 홈 띠 🔔를 다시');
  const tv = read('js/tourview.js');
  assert.match(tv, /asker\(src \|\| \{\}, today, start, 'aqua', stepped\)/, '손님 맞이는 낚시와 다른 차례 줄 · 넘긴 자리부터');
  assert.match(tv, /const start = AT\.start\(d, today\);/, '저장된 자리와 같은 앱 안 메모리 가운데 큰 쪽 (Codex 206차)');
  assert.match(tv, /const stepped = \(s, step\) => \{ pos\[s\] \+= step; AT\.moved\(today, s, pos\[s\]\); log\.put\(\{ \[TOUR_AT\[s\]\]: step \}\); \};/, '넘긴 자리를 그날 기록에 · 메모리엔 처음부터 센 자리');
  assert.match(tv, /fishMathQ\(raw, sd, avoid, lv, null\)/, '📐 다지기 몫은 안 씀');
  assert.match(tv, /lvFor\(s, TOUR_LVS\[i\], \{ listen: canListen\(\) \}\)/);
  assert.match(tv, /const found = seekTourQ\(askOrder\(shares, T\.recent, pickSubject\(shares, T\.recent\)\), \(s\) => inner\(/, '1단계로 내려온 문제는 버리고 다시 찾음 (판 2)');
  assert.match(tv, /if \(!found\) continue;/, '끝내 없으면 그 질문은 건너뜀');
  assert.doesNotMatch(tv, /spare/, '1단계 대체 경로 없음 (Codex 203차)');
  assert.match(tv, /await tourEnd\(req\)/);
  assert.match(tv, /await tourBook\(\{ week: book\.week, good, day \}\)/, '장부도 연 날 기준 (Codex 206차)');
  assert.match(tv, /await runBook\(book, log, alive, today\)/);
  // 정산 — 시작한 날·몇째 무리로 · 그날 공부 초를 받을 때마다 다시 · 하루 기록도 시작한 날에 (Codex 203차)
  assert.match(tv, /const log = dailyQueue\(applyDailyDelta, \(\) => today\);/);
  assert.match(tv, /const rec = tourDay\(p, today\);/);
  assert.match(tv, /const req = \{ day: today, k: rec\.n, n, t, good, likes, visitors: ids \};\n    for \(;;\) \{\n      req\.sec = await secAt\(\);\n      if \(!alive\(\)\) return;/, '다시 받을 때마다 공부 초를 다시 셈');
  // 시작할 때 날 바꿈부터 · 날과 공부 초를 한꺼번에 · 장부 뒤 다시 보기도 그 날로 · 시작할 때 센 초보다 적게 안 봄 (Codex 206차)
  assert.match(tv, /try \{ await ensureToday\(\); \} catch \{[^\n]*\n    if \(!alive\(\)\) return;\n[^\n]*\n    const today = clockDay\(\);\n    const sec0 = secNow\(\);/);
  assert.match(tv, /const secAt = async \(\) => Math\.max\(sec0, await secOf\(today\)\);/);
  assert.match(tv, /const sec = await secAt\(\);\n    if \(!alive\(\)\) return;\n    const p = getProfileSnapshot\(\);\n    if \(!waitingDay\(p, today, sec\)\.waiting\) \{ finish\(\); return; \}/);
  assert.match(tv, /if \(day === clockDay\(\)\) return secNow\(\);\n  try \{ return studySec\(await getDaily\(day\)\); \}/, '자정을 넘겼으면 그날 저장된 기록으로');
  // 💰가 들어갔으면 창을 닫았어도 📤에 — 기록은 alive 보기 전에 (Codex 203차)
  assert.match(tv, /try \{ r = await tourEnd\(req\); \} catch \{ r = null; \}\n      if \(r && r\.ok\) log\.put\(\{ \[TOUR_GROUPS\]: 1, \[TOUR_COINS\]: r\.coins \}\);[^\n]*\n      if \(!alive\(\)\) return;/);
  assert.match(tv, /try \{ r = await tourBook\(\{ week: book\.week, good, day \}\); \} catch \{ r = null; \}\n  if \(r && r\.ok && r\.coins\) log\.put\(\{ \[TOUR_COINS\]: r\.coins \}\);[^\n]*\n  if \(!alive\(\)\) return;/);
  // 닫힌 옛 맞이의 오류는 새 창에 안 띄움 (Codex 203차)
  assert.match(tv, /\} catch \(err\) \{\n    if \(me !== T\.gen\) return;[^\n]*\n    finish\(\);\n    throw err;/);
  const av = read('js/aquaview.js');
  assert.match(av, /<div class="aq-guest"><\/div>/);
  assert.match(av, /<div class="aq-tour" aria-live="polite" hidden><\/div>/);
  assert.match(av, /guestBar\(q\$\('\.aq-guest'\), beginTour\)/);
  assert.match(av, /stopTour\(\); \/\/ 🎟️/);
  assert.match(av, /q\$\('\.aq-tabs'\)\.hidden = touring;/);
  assert.match(av, /startTour\(q\$\('\.aq-tour'\), \(\) => render\(\), \(\) => render\(\)\)/, '💰가 들어온 순간 창 위 💰도');
  assert.equal((tv.match(/\bpaid\(\);/g) || []).length, 2, '정산·장부 💰 둘 다');
  const xp = read('js/xp.js');
  assert.match(xp, /export function tourEnd\(req\) \{\n  return houseDo\(\(p\) => tourEndRule\(p, req, Date\.now\(\)\)\);/);
  assert.match(xp, /export function tourBook\(req\) \{\n  return houseDo\(\(p\) => tourBookRule\(p, req, Date\.now\(\)\)\);/);
  assert.match(xp, /aquaTour: copyTour\(p\.aquaTour\)/);
  const db = read('js/db.js');
  assert.match(db, /aquaTour: copyTour\(cur\.aquaTour\)/);
  assert.match(db, /const at = mergeTour\(cur\.aquaTour, rec\.aquaTour\);/);
  assert.match(read('js/upload.js'), /const tour = tourDayLine\(d\);\n    if \(tour\) parts\.push\(tour\);/);
  const sw = read('sw.js');
  assert.match(sw, /'\.\/js\/aquatour\.js'/);
  assert.match(sw, /'\.\/js\/tourview\.js'/);
  // 판은 v401 이상 (뒤 판이 올라가도 깨지지 않게 — aquasize400과 같이)
  const ver = /const CACHE_VERSION = 'v(\d+)';/.exec(sw);
  assert.ok(ver && Number(ver[1]) >= 401, 'sw 판 v401 이상');
  assert.match(read('js/version.js'), new RegExp(`export const APP_VERSION = 'v${ver[1]}';`));
  const css = read('css/style.css');
  for (const c of ['.aq-guest {', '.aq-guest-go {', '.aq-tour {', '.aq-vis {', '.aq-card {', '.aq-pay {', '.lk-home-bell {']) assert.ok(css.includes(c), c);
});

before(async () => { console.warn = () => {}; await initProfile(); });

test('저장 — 정산이 한 트랜잭션으로 · 15분 몫만 · 저장 실패면 💰도 무리도 그대로', async () => {
  assert.equal((await lakeCatch({ key: 'bungeo', cm: 20 })).ok, true);
  assert.equal((await aquaPut('bungeo')).ok, true);
  await flushProfile();
  const c0 = getProfileSnapshot().coins;
  const day = dayKeyOf(Date.now());
  assert.equal((await tourEnd({ day, k: 0, n: 3, t: 1, good: 0, sec: 899 })).why, 'none');
  fakeIdb.failNext('profile');
  const bad = await tourEnd({ day, k: 0, n: 3, t: 1, good: 1, sec: 900 });
  assert.deepEqual([bad.ok, bad.why], [false, 'save']);
  assert.equal(getProfileSnapshot().coins, c0);
  assert.equal(tourToday(getProfileSnapshot(), Date.now()).n, 0);
  const r = await tourEnd({ day, k: 0, n: 3, t: 1, good: 1, sec: 1800, likes: ['bungeo'], visitors: [] });
  assert.deepEqual([r.ok, r.coins, r.n], [true, 8, 1]);
  assert.equal(getProfileSnapshot().coins, c0 + 8);
  assert.equal(fakeIdb.get('profile', 'me').coins, c0 + 8);
  assert.equal(tourDay(fakeIdb.get('profile', 'me'), day).n, 1);
  assert.equal((await tourEnd({ day, k: 0, n: 3, t: 1, good: 1, sec: 1800 })).why, 'none', '같은 무리는 두 번 받지 못함 — 둘째 무리 몫이 있어도');
  assert.equal(getProfileSnapshot().coins, c0 + 8);
  const b = await tourBook({ week: addDays(weekOf(day), -7), good: 1, day });
  assert.deepEqual([b.ok, b.coins], [true, 10], '장부도 연 날 기준으로 한 트랜잭션');
});
