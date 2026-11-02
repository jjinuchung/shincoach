// 🐾 손님 포켓몬 (v385 — 아버님 집 다음 셋 기본안 「추천대로」 ②) — node --test tests/guest385.test.js
// 좋아하는 놀이 표 · 고쳐 읽기·병합 · 누가 오나(가진 것 · 파트너 빼고 · 오래 안 온 것부터) · 🔔 · 도착 · 손님 💗(그날 한 번 · 손님에게만) ·
// 앉는 칸 · 저장 잇기 · 장면 그림·말·사진 · 화면 잇기 · 보상 없음 · 셈 문구 없음
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  GUEST_STUDY_SEC, LIKES, HELLO, GUEST_ASK, firstType, likesOf, guestOf, copyGuest, mergeGuest, candidatesOf, pickGuest,
  guestNow, guestWaiting, arriveRule, likedItemOf, guestSpot, guestPlayRule, likedName,
} from '../js/guest.js';
import { PLAYS, playOf, bondOf, playSpot, palHome } from '../js/homeplay.js';
import { SCENE_OF, playLines, stageHtml, photoStageHtml, photoCaption } from '../js/playart.js';
import { PHOTO_SCENES, photoRecOf, photoIdOf } from '../js/photo.js';
import { TYPES } from '../js/journey.js';
import { LOOK_BASE, avatarOf } from '../js/avatar.js';
import { placeRule, FIRST_ROOM, HEAL } from '../js/house.js';
import { dayNum } from '../js/korean.js';
import { emptyProfile, cloneProfile, mergeStatRecord } from '../js/db.js';

void fakeIdb;
const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const R = FIRST_ROOM;
const DAY = 86400000;
const T0 = new Date(2026, 10, 3, 12, 0, 0).getTime(); // 11월 3일 낮 (그 기기 시계의 날)
const D0 = dayNum(T0);
const AV = { made: true, gifted: true, look: { ...LOOK_BASE }, name: '', spot: { room: R, x: 4, y: 4 }, at: 1 };
/** 개굴닌자(658) 파트너 · 꼬부기(7 물) · 피카츄(25 전기) · 파이리(4 불) */
const pf = (extra = {}) => cloneProfile({ ...emptyProfile(), avatar: { ...AV }, caught: { 7: 1, 25: 1, 4: 1, 658: 1 }, partner: 658, coins: 500, ...extra });
const money = (p) => JSON.stringify({ coins: p.coins, items: p.items, caught: p.caught, mons: p.mons, house: p.house, partner: p.partner });
/** 그 방에 가구 하나 놓기 → 놓은 번호 */
function put(p, id, x, y) {
  p.items = { ...(p.items || {}), [id]: ((p.items || {})[id] || 0) + 1 };
  const r = placeRule(p, R, id, x, y);
  assert.equal(r.ok, true, `${id} 놓기`);
  return r.u;
}
/** 오늘 손님을 들인 프로필 → [p, 손님 id] */
function arrived(p = pf(), now = T0) {
  const r = arriveRule(p, now, GUEST_STUDY_SEC);
  assert.equal(r.ok, true);
  return [p, r.mon];
}

test('🐾 좋아하는 놀이 표 — 18타입 모두 · 놀 수 있는 가구만(🎹·🐾 쿠션 빼고) · 기본안 표 그대로 · 첫 타입으로 · 모르면 노말 · 조르는 말에 셈 없음', () => {
  assert.equal(GUEST_STUDY_SEC, 900, '기본안 ⑥ — 공부 15분 (🎮 미니 게임 판과 같은 셈)');
  assert.deepEqual(Object.keys(LIKES).sort(), [...TYPES].sort());
  const all = Object.values(LIKES).flat();
  for (const id of all) { assert.ok(PLAYS[id], id); assert.ok(GUEST_ASK[SCENE_OF[id]], `${id} 조르는 말`); }
  assert.ok(!all.includes('f_piano') && !all.includes('f_cushion'), '피아노·쿠션은 손님 놀이가 아니다');
  const S = (t) => [...new Set(LIKES[t].map((id) => SCENE_OF[id]))].sort().join();
  for (const t of ['water', 'grass', 'bug']) assert.equal(S(t), 'flower,plant');
  for (const t of ['flying', 'ice']) assert.equal(S(t), 'window');
  for (const t of ['electric', 'steel']) assert.equal(S(t), 'game,pc,tv');
  for (const t of ['normal', 'fairy']) assert.equal(S(t), 'sofa,teddy');
  for (const t of ['psychic', 'ghost', 'dark']) assert.equal(S(t), 'book');
  for (const t of ['fighting', 'rock', 'ground']) assert.equal(S(t), 'toy');
  for (const t of ['fire', 'dragon']) assert.equal(S(t), 'meal');
  assert.equal(S('poison'), 'nap');
  assert.equal(firstType(7), 'water');
  assert.equal(firstType(1), 'grass', '이상해씨 풀·독 → 첫 타입 풀');
  assert.equal(firstType(16), 'normal', '구구 노말·비행 → 노말');
  assert.equal(firstType(99999), 'normal');
  assert.deepEqual(likesOf(7), ['f_plant', 'f_flower']);
  assert.equal(likedName(7), '큰 화분');
  assert.equal(GUEST_ASK[HELLO], '🤝 인사하기');
  for (const s of Object.values(GUEST_ASK)) assert.ok(!/\d/.test(s), `조르는 말에 수 없음: ${s}`);
  const hv = read('js/houseview.js');
  const hint = (/export const GUEST_HINT = '([^']+)';/.exec(hv) || [])[1] || '';
  assert.ok(hint.includes('손님') && !/\d|분|시간/.test(hint), '손님이 없는 날 한 줄 — 시간 말 없음');
});

test('🧹 고쳐 읽기·병합 — 깨진 칸은 빼고 · 마지막으로 온 날·💗 준 날은 큰 쪽 · 손님은 늦은 날 · 같은 날이면 먼저 온 쪽 · (a,b)=(b,a) · 둘 다 없으면 null', () => {
  assert.deepEqual(guestOf(null), { day: 0, mon: 0, at: 0, heart: 0, last: {} });
  const g = guestOf({ day: D0, mon: 7, at: T0, heart: D0, last: { 7: D0, 25: D0 - 3, x: 5, 4: -1, 0: D0 } });
  assert.deepEqual(g, { day: D0, mon: 7, at: T0, heart: D0, last: { 7: D0, 25: D0 - 3 } });
  assert.deepEqual(guestOf({ day: D0, mon: 0 }).day, 0, '손님 없는 날은 없는 것');
  assert.deepEqual(guestOf({ day: 9e9, mon: 7 }).mon, 0, '깨진 큰 날');
  assert.equal(copyGuest('x'), null);
  assert.notEqual(copyGuest(g), g);
  assert.equal(mergeGuest(undefined, 5), null);
  const a = { day: D0, mon: 7, at: T0 + 50, heart: 0, last: { 7: D0, 4: D0 - 9 } };
  const b = { day: D0, mon: 25, at: T0 + 10, heart: D0, last: { 25: D0, 4: D0 - 2 } };
  const m = mergeGuest(a, b);
  assert.deepEqual(m, mergeGuest(b, a), '어느 차례로 합쳐도 같다');
  assert.equal(m.mon, 25, '같은 날이면 먼저 온 손님');
  assert.equal(m.heart, D0, '어느 기기에서든 그날 준 💗는 한 번');
  assert.deepEqual(m.last, { 7: D0, 25: D0, 4: D0 - 2 });
  const later = mergeGuest(a, { day: D0 + 1, mon: 4, at: T0 + DAY, last: {} });
  assert.equal(later.mon, 4, '늦은 날 손님');
  assert.equal(later.last['7'], D0, '옛 기록은 합집합');
  const tie = mergeGuest({ day: D0, mon: 7, at: T0 }, { day: D0, mon: 4, at: T0 });
  assert.equal(tie.mon, 4, '같은 때면 id 작은 쪽');
  // 넘치면 최근에 온 것부터
  const many = { last: {} };
  for (let i = 1; i <= 3100; i++) many.last[i] = D0 - i;
  const cap = guestOf(many);
  assert.equal(Object.keys(cap.last).length, 3000);
  assert.ok(cap.last['1'] && !cap.last['3100']);
});

test('👀 누가 오나 — 가진 포켓몬만(진화·보낸 것 빼고) · 파트너 빼고 · 한 번도 안 온 것부터 · 모두 한 번씩 온 뒤에야 다시 · 그날 같은 손님(두 창)', () => {
  const p = pf({ caught: { 1: 1, 4: 1, 7: 1, 25: 1, 658: 1, 133: 1 }, mons: { 133: { evo: 1 } } });
  assert.deepEqual(candidatesOf(p), [1, 4, 7, 25], '파트너(658)·진화해 떠난 이브이(133) 빼고');
  assert.equal(pickGuest(p, D0), pickGuest(cloneProfile(p), D0), '같은 날 같은 손님');
  const seen = [];
  for (let d = 0; d < 4; d++) {
    const r = arriveRule(p, T0 + d * DAY, GUEST_STUDY_SEC);
    assert.equal(r.ok && r.fresh, true, `${d}일째 도착`);
    seen.push(r.mon);
  }
  assert.deepEqual([...seen].sort((x, y) => x - y), [1, 4, 7, 25], '나흘 동안 넷이 한 번씩');
  const fifth = arriveRule(p, T0 + 4 * DAY, GUEST_STUDY_SEC);
  assert.equal(fifth.mon, seen[0], '다섯째 날엔 가장 오래 안 온 손님');
  assert.equal(pickGuest(pf({ caught: { 658: 1 } }), D0), 0, '파트너 하나뿐이면 손님 없음');
});

test('🔔 기다림 · 🚪 도착 — 캐릭터 · 공부 15분 · 하루 한 번(같은 날 다시 열면 그 손님) · 다음 날 새 손님 · 시계를 되돌려도 또 안 옴 · 보상 없음', () => {
  const p = pf();
  const before = money(p);
  assert.equal(guestWaiting(p, T0, GUEST_STUDY_SEC - 1), false, '15분 전엔 🔔 없음');
  assert.equal(guestWaiting(p, T0, GUEST_STUDY_SEC), true);
  assert.equal(guestWaiting(pf({ avatar: { made: false } }), T0, 5000), false, '캐릭터를 만들기 전엔 없음');
  assert.equal(guestWaiting(pf({ caught: { 658: 1 } }), T0, 5000), false, '올 포켓몬이 없으면 없음');
  assert.deepEqual(arriveRule(p, T0, GUEST_STUDY_SEC - 1), { ok: false, why: 'study' });
  assert.deepEqual(arriveRule(pf({ avatar: { made: false } }), T0, 5000), { ok: false, why: 'made' });
  const r = arriveRule(p, T0, GUEST_STUDY_SEC);
  assert.equal(r.ok && r.fresh, true);
  assert.equal(guestWaiting(p, T0 + 60000, 5000), false, '들어온 뒤엔 🔔 없음');
  assert.deepEqual(arriveRule(p, T0 + 3600000, 5000), { ok: true, mon: r.mon, fresh: false }, '같은 날 다시 열면 그 손님');
  assert.deepEqual(guestNow(p, T0 + 3600000), { mon: r.mon, heart: false });
  assert.equal(guestOf(p.homeGuest).last[String(r.mon)], D0);
  assert.equal(money(p), before, '도착은 💰·가방·포켓몬·집을 안 바꾼다');
  // 다음 날 — 어제 손님은 갔다 · 공부 전엔 아무도 없음
  assert.equal(guestNow(p, T0 + DAY), null, '다음 날엔 조용히 감');
  assert.equal(guestWaiting(p, T0 + DAY, 0), false);
  const r2 = arriveRule(p, T0 + DAY, GUEST_STUDY_SEC);
  assert.notEqual(r2.mon, r.mon, '다음 날엔 다른 손님');
  // 시계를 하루 되돌림 — 또 오지 않는다
  assert.deepEqual(arriveRule(p, T0, 5000), { ok: false, why: 'later' });
  assert.equal(guestWaiting(p, T0, 5000), false);
  assert.deepEqual(arriveRule(p, 0, 5000), { ok: false, why: 'save' });
});

test('🙈 와 있는 손님 — 그새 파트너로 정하면 · 보내 버리면 손님도 없음 · 깨진 기록이면 없음', () => {
  const [p, mon] = arrived();
  assert.ok(guestNow(p, T0));
  const asPal = cloneProfile({ ...p, partner: mon });
  assert.equal(guestNow(asPal, T0), null, '파트너가 됐으면 손님이 아니다');
  const gone = cloneProfile({ ...p, mons: { ...(p.mons || {}), [mon]: { traded: 1 } } });
  assert.equal(guestNow(gone, T0), null, '가진 포켓몬이 아니면 손님도 없음');
  assert.equal(guestNow(cloneProfile({ ...p, homeGuest: 'x' }), T0), null);
});

test('💊 캡슐에서 쉬는 포켓몬은 손님으로 안 옴 · 손님이 온 뒤 캡슐에 넣으면 그날은 안 보임 · 쉬는 것뿐이면 🔔 없음 · 서랍에 맡긴 휴식도 (Codex 188차 ③)', () => {
  const p = pf({ caught: { 7: 1, 25: 1, 658: 1 } });
  const u = put(p, HEAL, 0, 2);
  const rest = (mon) => { p.house.rooms[0].items.find((i) => i.u === u).rest = { id: `rest${mon}`, mon, at: T0 - 1000 }; };
  rest(7);
  assert.deepEqual(candidatesOf(p), [25], '쉬는 꼬부기는 빼고');
  const r = arriveRule(p, T0, GUEST_STUDY_SEC);
  assert.equal(r.mon, 25);
  assert.ok(guestNow(p, T0));
  rest(25); // 피카츄가 놀러 와 있는데 캡슐에 넣음
  assert.equal(guestNow(p, T0), null, '캡슐 안과 방에 같은 포켓몬이 둘이 되지 않게');
  assert.deepEqual(guestPlayRule(p, R, 0, T0), { ok: false, why: 'nobody' });
  const q = pf({ caught: { 7: 1, 658: 1 } });
  const uq = put(q, HEAL, 0, 2);
  q.house.rooms[0].items.find((i) => i.u === uq).rest = { id: 'restq', mon: 7, at: T0 - 1000 };
  assert.equal(guestWaiting(q, T0, 5000), false, '쉬는 포켓몬뿐이면 🔔 없음');
  // 캡슐을 서랍에 넣어 맡겨 둔 휴식(parked)도 쉬는 것
  const z = pf({ caught: { 7: 1, 25: 1, 658: 1 }, items: { [HEAL]: 1 } });
  z.house = { started: true, seq: 0, rooms: [{ id: R, wall: '', floor: '', items: [] }], parked: [{ id: 'restz', mon: 25, at: T0 - 1000 }] };
  assert.deepEqual(candidatesOf(z), [7]);
});

test('💗 손님과 놀기 — 손님에게 그날 한 번 +1 · 🤝 인사하기도 · 좋아하는 가구만 · 파트너 💗·가구 하루 셋·💰는 그대로 · 진화 전 💗 이어서 · 시계를 되돌려도 또 안 받음', () => {
  const [p, mon] = arrived(pf({ caught: { 7: 1, 658: 1 } }));
  assert.equal(mon, 7);
  const plant = put(p, 'f_plant', 1, 3);
  const tv = put(p, 'f_tv', 5, 0);
  const before = money(p);
  const hp0 = JSON.stringify(playOf(p.homePlay).days);
  const palBond0 = bondOf(p.homePlay, 658);
  assert.deepEqual(guestPlayRule(p, R, tv, T0), { ok: false, why: 'play' }, '꼬부기(물)는 TV를 졸라 하지 않는다');
  assert.deepEqual(guestPlayRule(p, R, 999, T0), { ok: false, why: 'gone' });
  const a = guestPlayRule(p, R, plant, T0);
  assert.deepEqual(a, { ok: true, kind: 'f_plant', guest: 7, heart: true, bond: 1 });
  assert.equal(guestOf(p.homeGuest).heart, D0);
  const b = guestPlayRule(p, R, 0, T0 + 1000);
  assert.deepEqual(b, { ok: true, kind: HELLO, guest: 7, heart: false, bond: 1 }, '그날 두 번째부터는 장면만');
  assert.equal(JSON.stringify(playOf(p.homePlay).days), hp0, '가구 놀기 날(파트너 💗·하루 셋)은 안 건드린다');
  assert.equal(bondOf(p.homePlay, 658), palBond0, '파트너 💗는 그대로');
  assert.equal(money(p), before, '💰·가방·포켓몬·집 그대로');
  // 다음 날 새 손님(가진 게 꼬부기뿐이면 또 꼬부기) — 💗 또 한 번 · 진화 전 모습의 💗를 이어서
  const q = pf({ caught: { 8: 1, 658: 1 }, homePlay: { bond: { 7: 4 } } });
  arriveRule(q, T0, GUEST_STUDY_SEC);
  const c = guestPlayRule(q, R, 0, T0);
  assert.equal(c.guest, 8);
  assert.equal(c.bond, 5, '어니부기는 꼬부기 💗 4를 이어 5');
  // 안 되는 때
  assert.deepEqual(guestPlayRule(p, R, 0, T0 + DAY), { ok: false, why: 'nobody' }, '다음 날엔 손님이 없다');
  assert.deepEqual(guestPlayRule(pf(), R, 0, T0), { ok: false, why: 'nobody' }, '안 들어온 손님과는 못 논다');
  assert.deepEqual(guestPlayRule(cloneProfile({ ...p, avatar: { made: false } }), R, 0, T0), { ok: false, why: 'made' });
  // 시계를 되돌림 — 💗를 준 날이 뒤면 안 준다
  const z = cloneProfile({ ...p, homeGuest: { ...guestOf(p.homeGuest), heart: D0 + 5 } });
  assert.equal(guestPlayRule(z, R, 0, T0).heart, false);
});

test('🪑 손님이 앉는 칸 — 좋아하는 가구 옆 빈 칸(캐릭터·파트너가 선 칸·그 가구로 놀 때 갈 칸은 피함) · 없으면 문 쪽(왼쪽 아래) · 가구 위엔 안 앉음', () => {
  const [p, mon] = arrived(pf({ caught: { 7: 1, 658: 1 } }));
  const u = put(p, 'f_flower', 2, 3);
  assert.deepEqual(likedItemOf(p, mon), { room: R, it: (p.house.rooms[0].items.find((i) => i.u === u)) });
  const s = guestSpot(p, mon);
  assert.equal(s.room, R);
  assert.equal(s.u, u);
  assert.ok(Math.abs(s.x - 2) + Math.abs(s.y - 3) <= 2, '해바라기 바로 옆');
  const me = avatarOf(p).spot;
  const ps = playSpot(p, R, u);
  const pal = palHome(p, me);
  const key = (c) => (c ? `${c.x},${c.y}` : '');
  for (const c of [me, pal, ps.me, ps.pal]) assert.notEqual(key(s), key(c), `손님 칸 ${key(s)}이 ${key(c)}와 겹치지 않음`);
  assert.ok(!(s.x === 2 && s.y === 3), '가구 칸이 아님');
  // 왼쪽을 의자로 막으면 놀 때 캐릭터는 오른쪽 칸으로 간다 — 손님은 그 칸을 비워 둔다
  const [w, m3] = arrived(pf({ caught: { 7: 1, 658: 1 } }));
  const uf = put(w, 'f_flower', 2, 3);
  put(w, 'f_chair', 1, 3);
  const ps2 = playSpot(w, R, uf);
  assert.deepEqual([ps2.me.x, ps2.me.y], [3, 3], '놀 때 캐릭터는 오른쪽');
  const s2 = guestSpot(w, m3);
  for (const c of [ps2.me, ps2.pal]) assert.notEqual(key(s2), key(c), `손님 칸 ${key(s2)}이 놀 때 갈 칸 ${key(c)}와 겹치지 않음`);
  assert.ok(Math.abs(s2.x - 2) + Math.abs(s2.y - 3) <= 2, '그래도 해바라기 가까이');
  // 좋아하는 가구가 없으면 문 쪽
  const [q, m2] = arrived(pf({ caught: { 4: 1, 658: 1 } }));
  const d = guestSpot(q, m2);
  assert.equal(d.u, 0);
  assert.equal(d.x, 0, '왼쪽 끝');
  assert.equal(d.y, 5, '아래 줄');
});

test('🔗 저장 잇기 — cloneProfile 복사 · 프로필 병합(mergeStatRecord) · xp 저장본 복사 · 도착·놀기는 houseDo 한 트랜잭션', () => {
  const [p] = arrived(pf({ caught: { 7: 1, 658: 1 } })); // 오늘 손님 = 꼬부기
  const c = cloneProfile(p);
  assert.notEqual(c.homeGuest, p.homeGuest);
  assert.deepEqual(c.homeGuest, guestOf(p.homeGuest));
  const old = { ...emptyProfile(), homeGuest: { day: D0 - 3, mon: 4, at: T0 - 3 * DAY, heart: D0 - 3, last: { 4: D0 - 3 } }, updatedAt: 20 };
  const m = mergeStatRecord('profile', { ...p, updatedAt: 10 }, old);
  assert.equal(m.homeGuest.day, D0, '옛 백업이 오늘 손님을 되돌리지 않는다');
  assert.equal(m.homeGuest.last['4'], D0 - 3);
  const none = mergeStatRecord('profile', { ...emptyProfile(), updatedAt: 1 }, { ...emptyProfile(), updatedAt: 2 });
  assert.equal(none.homeGuest, undefined);
  const xp = read('js/xp.js');
  assert.ok(xp.includes('...(p.homeGuest ? { homeGuest: copyGuest(p.homeGuest) } : {}), '), 'xp.fromStored가 손님 칸을 복사');
  assert.ok(xp.includes('return houseDo((p) => arriveRule(p, Date.now(), sec));'));
  assert.ok(xp.includes('return houseDo((p) => guestPlayRule(p, roomId, u, Date.now()));'));
});

test('🎨 장면 — 손님 자리(.pshow-guest) · 🤝 인사하기(문) · 말: 「개굴닌자, 꼬부기와 …」 · 💗는 손님에게 · 사진에 손님(g)', () => {
  const o = { look: LOOK_BASE, mon: { ko: '개굴닌자', url: '' }, guest: { ko: '꼬부기', url: '' }, uid: 'g1' };
  const h = stageHtml('plant', o);
  assert.ok(h.includes('class="pshow-guest"'));
  assert.ok(h.includes(' with-guest'));
  assert.ok(!stageHtml('plant', { ...o, guest: null }).includes('pshow-guest'));
  assert.ok(stageHtml('hello', o).includes('pv-door'), '인사하기 = 현관문');
  assert.ok(!stageHtml('tv', { ...o, guest: { ko: '"><script>', url: 'javascript:x' } }).includes('<script>'), '이름·주소 글자 넣기 막음');
  const L = playLines('plant', { mon: '개굴닌자', guest: '꼬부기', gHeart: false }, 1);
  assert.ok(L.start[0].includes('개굴닌자, 꼬부기와'));
  assert.equal(L.end, '💧 개굴닌자, 꼬부기와 화분에 물을 줬어요');
  assert.equal(playLines('plant', { mon: '개굴닌자', guest: '꼬부기', gHeart: true }, 1).end, '💗 꼬부기와 더 친해졌어요');
  assert.equal(playLines('tv', { mon: '', guest: '피카츄', gHeart: false }, 1).end, '📺 피카츄와 TV를 봤어요', '파트너 없이 손님과');
  const hi = playLines('hello', { mon: '개굴닌자', guest: '꼬부기', gHeart: true }, 2);
  assert.ok(hi.start[0].startsWith('🚪 띵동! 꼬부기가 놀러 왔어요'));
  assert.ok(hi.start[2].includes('개굴닌자도'));
  assert.equal(hi.end, '💗 꼬부기와 더 친해졌어요');
  assert.equal(playLines('hello', { guest: '파이리' }, 0).end, '🤝 파이리와 인사했어요');
  for (const s of [...hi.start, hi.end]) assert.ok(!/\d/.test(s), `셈 없음: ${s}`);
  // 사진
  assert.ok(PHOTO_SCENES.includes('hello'));
  const rec = photoRecOf({ id: photoIdOf(T0, 0.3), at: T0, scene: 'hello', mon: 658, g: 7, look: LOOK_BASE });
  assert.equal(rec.g, 7);
  assert.equal(photoRecOf({ id: photoIdOf(T0, 0.3), at: T0, scene: 'tv', mon: 658, g: 658, look: LOOK_BASE }).g, undefined, '파트너와 같으면 손님 아님');
  assert.equal(photoRecOf({ id: photoIdOf(T0, 0.3), at: T0, scene: 'tv', mon: 0, g: -2, look: LOOK_BASE }).g, undefined);
  assert.ok(photoStageHtml(rec, { ko: '개굴닌자', gko: '꼬부기', uid: 'p1' }).includes('class="pshow-guest"'));
  assert.ok(!photoStageHtml({ ...rec, g: undefined }, { ko: '개굴닌자', uid: 'p1' }).includes('pshow-guest'));
  assert.equal(photoCaption('hello', '개굴닌자', '꼬부기'), '🤝 꼬부기와 인사했어요');
  assert.equal(photoCaption('sofa', '개굴닌자', '피카츄'), '🛋️ 개굴닌자, 피카츄와 소파에서 쉬었어요');
  assert.equal(photoCaption('sofa', '개굴닌자'), '🛋️ 개굴닌자와 소파에서 쉬었어요', '손님 없는 옛 사진 그대로');
});

test('🔌 화면 잇기 — 🏠 🔔(has-guest) · 집을 열면 도착 · 방에 손님 · 누르면 도구 · 손님 놀기 · 📸 같이 사진(g) · 장면 진행 · css 자리 · 앱 셸 · 판', () => {
  const hv = read('js/houseview.js');
  assert.ok(hv.includes("b.classList.toggle('has-guest', guest);"), '🏠 단추 🔔');
  assert.ok(hv.includes('guest = !profileLoading() && guestWaiting(getProfileSnapshot(), now, studySec(dailyNow()));'));
  assert.ok(/render\(\);\n {2}guestDoor\(\); \/\/ 🐾/.test(hv), '집을 열면 손님이 들어온다');
  assert.ok(hv.includes("if (key === 'room') guestDoor();"), '상점·옷장으로 열었다가 방으로 와도');
  assert.ok(hv.includes('try { r = await guestArrive(sec); } catch { r = null; }'));
  assert.ok(hv.includes('if (gs && gs.room === rm.id) {'), '손님은 자기 방에');
  assert.ok(hv.includes('try { r = await guestPlay(rid, it ? it.u : 0); } catch { r = null; }'));
  assert.ok(hv.includes('mon: pid || 0, g: r.guest, look: me.look'), '같이 찍은 사진에 손님');
  assert.ok(hv.includes('look: me.look, name: me.name, mon, guest, gHeart: r.heart, heart: false,'), '손님 놀기의 💗는 손님에게만');
  assert.equal((hv.match(/const onPhoto = photoTaker\(photoRec, live\);/g) || []).length, 2, '놀기·손님 놀기 모두 같은 사진 찍기');
  assert.ok(hv.includes("|| e.target.closest('.house-guest')) return;"), '손님을 누르면 방 빈 곳 누르기가 아니다');
  // Codex 188차 #1 — 집을 켜 둔 채 날이 바뀌면 다시 그린다(어제 손님은 간다) · 놀거나 끄는 중이면 그 뒤에
  assert.ok(hv.includes('ui.drawnDay = dayNum(Date.now());'));
  assert.ok(hv.includes('if (ui.drawnDay && dayNum(now) !== ui.drawnDay && !ui.busy && !ui.drag && !profileLoading()) { ui.guestSel = false; render(); return; }'));
  // Codex 188차 #2 — 키보드로 고르면 초점을 첫 도구로(풀면 손님 단추로)
  assert.ok(hv.includes('if (ev.detail === 0) guestFocus();'));
  assert.ok(hv.includes("ui.guestSel ? document.querySelector('#house .house-tools.is-guest button') : document.querySelector('#house .house-guest');"));
  assert.ok(hv.includes("el('div', 'house-tools is-me is-guest')"));
  const ps = read('js/playshow.js');
  assert.ok(ps.includes("export const PHOTO_BTN_GUEST = '📸 같이 사진 찍기';"));
  assert.ok(ps.includes('ph.textContent = o.guest ? PHOTO_BTN_GUEST : PHOTO_BTN;'));
  assert.ok(ps.includes('toy: runToy, hello: runHello };'));
  assert.ok(ps.includes('if (cur.o.gHeart && cur.o.guest) {'), '💗 +1은 손님 위로');
  assert.ok(ps.includes("guest: o.guest ? o.guest.ko || '' : '', gHeart: !!o.gHeart,"));
  const css = read('css/style.css');
  const scenes = [...new Set(Object.values(LIKES).flat().map((id) => SCENE_OF[id])), HELLO];
  for (const s of scenes) assert.match(css, new RegExp(`\\.pshow-stage\\.is-${s}[^{]*\\.pshow-guest \\{[^}]*left:`), `${s} 장면 손님 자리`);
  assert.ok(css.includes(".btn-icon.has-guest::before { content: '🔔';"));
  assert.ok(css.includes('.house-guest.is-arrive {'));
  const sw = read('sw.js');
  assert.ok(sw.includes("'./js/guest.js'"));
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(sw) || [])[1]) >= 385);
  assert.ok(read('js/gameview.js').includes('export function dailyNow() {'), '🐾 공부 시간은 게임기와 같은 셈');
});
