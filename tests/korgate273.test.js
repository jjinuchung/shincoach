// 📚 국어 v273 (2026-10-16, 아버님 "니 추천대로 가자"): 🔍 처음 읽는 글은 근거부터 → v274 별을 받을 수 있는 읽기마다 (아버님 "니 추천대로")
//  · 이번에 별(★·★★·★★★)을 받을 수 있는 읽기 글(🎧 듣기 글 · 별 없이 다시 읽는 날은 그대로)에서 근거가 있는 첫 물음 하나만, 보기를 고르기 전에 답이 든 줄부터 누른다
//  · 화면은 "두 번 틀리면 근거 먼저"와 같다(보기 잠금 · 틀린 줄을 두 번 누르면 범위) · 별·💰·🟩·🎯 규칙은 그대로
//  · 📤 읽은 기록에 v(그 물음이 나온 뒤 찾기까지 초)·w(잘못 누른 줄)·k(찾은 뒤 첫 번에 맞혔나) — e(근거 먼저)는 두 번 틀린 것만
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  evFirstNow, gateAtOf, isListen, readOf, readsOf, mergeReads, READ_W_MAX, korFinishRule, validCards, dayNum, checkContent, nextStar, STAR3_DAYS,
} from '../js/korean.js';
import { emptyProfile, cloneProfile } from '../js/db.js';
import { readLines } from '../js/korreport.js';

void fakeIdb;
const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const DATA = JSON.parse(read('coach/korean/reading.json'));
const CARDS = validCards(DATA);
const IDS = CARDS.map((c) => c.id);
const T0 = new Date(2026, 9, 16, 12, 0, 0).getTime();
const D0 = dayNum(T0);
const pf = (o = {}) => cloneProfile({ ...emptyProfile(), ...o });
const hasEv = (q) => Array.isArray(q.ev) && q.ev.length > 0;

test('🔍 근거부터 자리 (gateAtOf, 순수 · v274): 이번에 받을 별이 1·2·3이면 근거가 있는 첫 물음 · 별을 못 받는 날(0) · 🎧 듣기 글 · 근거 물음이 없으면 -1', () => {
  const q = (ev) => ({ ev, opts: [{}, {}, {}, {}] });
  const card = { id: 'K1', qs: [q(null), q([]), q([4]), q([2])] };
  for (const star of [1, 2, 3]) assert.equal(gateAtOf(card, star), 2, `★${star} 받는 읽기 — 근거가 없는 물음·빈 근거는 건너뛰고 첫 근거 물음`);
  assert.equal(gateAtOf({ ...card, qs: [q([1]), q([2])] }, 1), 0);
  assert.equal(gateAtOf(card, 0), -1, '별을 못 받는 날(기다림·★★★ 다 받음)은 그대로');
  for (const s of [undefined, null, '1', -1, 4, 1.5, NaN]) assert.equal(gateAtOf(card, s), -1, `받을 별이 깨졌으면(${String(s)}) 걸지 않는다`);
  assert.equal(gateAtOf({ ...card, listen: { who: [] } }, 1), -1, '🎧 듣기 글은 그대로');
  assert.equal(gateAtOf({ id: 'K2', qs: [q(null), q([])] }, 1), -1, '근거 물음이 없는 글');
  for (const bad of [null, undefined, [], {}, { qs: 'x' }, { qs: [null, 7] }]) assert.equal(gateAtOf(bad, 1), -1, JSON.stringify(bad));
});

test('🔍 받을 별(nextStar)과 이어서 (v274): ★ 전 · 어제 ★ → ★★ · 일주일 뒤 ★★★ 은 걸고, 오늘 이미 받은 날·★★★ 다 받은 글은 안 건다', () => {
  const card = CARDS.find((c) => c.id === 'K42');
  const at = gateAtOf(card, 1);
  assert.ok(at >= 0);
  const day = dayNum(T0);
  const gate = (done) => gateAtOf(card, nextStar(done, 'K42', T0).star);
  assert.equal(gate({}), at, '★ 전');
  assert.equal(gate({ 'K42:1': day - 1 }), at, '어제 ★ → 오늘 ★★');
  assert.equal(gate({ 'K42:1': day }), -1, '오늘 ★를 받았다 — 별 없이 다시 읽기');
  assert.equal(gate({ 'K42:1': day - STAR3_DAYS, 'K42:2': day - 1 }), at, '★★ 뒤 일주일 — ★★★');
  assert.equal(gate({ 'K42:1': day - 2, 'K42:2': day - 1 }), -1, '★★★까지 기다리는 날');
  assert.equal(gate({ 'K42:1': day - 30, 'K42:2': day - 20, 'K42:3': day - 10 }), -1, '★★★ 다 받은 글');
  // 깨진 기록 — 보상 규칙과 같은 해석(nextStar): 날을 모르는 ★는 받은 것으로 · ★ 없이 ★★만 있으면 0개
  assert.equal(gate({ 'K42:1': 'x' }), at, '날이 깨진 ★ → ★★ 받는 읽기');
  assert.equal(gate({ 'K42:2': day - 1 }), at, '★ 없이 ★★만 — ★ 받는 읽기');
});

test('🔍 열 때와 끝낼 때 (Codex 83차 B — 정해 둔 경계): 근거부터는 연 때의 받을 별로, 별은 끝낼 때 다시 판정 — 어느 쪽이든 별을 두 번 주지 않는다', () => {
  const card = CARDS.find((c) => c.id === 'K42');
  const at = gateAtOf(card, 1);
  const day = dayNum(T0);
  const night = new Date(2026, 9, 16, 23, 59, 0).getTime();
  const morning = night + 2 * 60 * 1000; // 자정을 넘김
  // ① 오늘 ★를 받은 글을 밤에 열면 근거부터가 없고(별 없이 다시 읽기) — 자정을 넘겨 끝내면 ★★는 받는다
  const done1 = { 'K42:1': dayNum(night) };
  assert.equal(gateAtOf(card, nextStar(done1, 'K42', night).star), -1);
  const p1 = pf({ korDone: { ...done1 } });
  assert.equal(korFinishRule(p1, 'K42', morning, {}, IDS, 0).star, 2, '끝낼 때 다시 판정');
  // ② 근거부터로 연 사이 다른 창이 같은 ★를 먼저 받았다 — 이 창은 별 없이(두 번 주지 않는다)
  assert.equal(gateAtOf(card, nextStar({}, 'K42', T0).star), at);
  const p2 = pf({ korDone: { 'K42:1': day } });
  const r2 = korFinishRule(p2, 'K42', T0, {}, IDS, 0);
  assert.deepEqual([r2.ok, r2.star], [true, 0]);
});

test('🔍 근거부터면 안 틀려도 보기 잠금 (evFirstNow): 근거를 찾거나 맞히면 풀림 · 근거가 없는 물음엔 안 걸림 · 옛 "두 번 틀림"은 그대로', () => {
  const q = { ev: [3] };
  const st = (o) => ({ wrong: [], answered: false, evDone: false, gate: false, ...o });
  assert.equal(evFirstNow(q, st({ gate: true })), true, '처음부터 근거부터');
  assert.equal(evFirstNow(q, st({ gate: true, evDone: true })), false, '근거를 찾으면 보기가 열린다');
  assert.equal(evFirstNow(q, st({ gate: true, answered: true })), false);
  assert.equal(evFirstNow({ ev: null }, st({ gate: true })), false, '근거가 없는 물음엔 안 걸림');
  assert.equal(evFirstNow({ ev: [] }, st({ gate: true })), false);
  assert.equal(evFirstNow(q, st({ gate: 1 })), false, 'gate는 참일 때만');
  assert.equal(evFirstNow(q, st({})), false, '근거부터 아닌 물음은 안 틀리면 그대로');
  assert.equal(evFirstNow(q, st({ wrong: [0] })), false);
  assert.equal(evFirstNow(q, st({ wrong: [0, 1] })), true, '두 번 틀리면 근거 먼저(v258) 그대로');
  assert.equal(evFirstNow(q, { wrong: [0, 1], answered: false, evDone: false }), true, 'gate가 없는 옛 상태');
});

test('📚 원고: 듣기 글 말고 근거 물음이 있는 글은 모두 근거부터 한 물음 — 근거가 있는 첫 물음 · 별을 못 받는 날은 없음 · 근거 물음이 없는 글은 따로 적어 둠', () => {
  assert.deepEqual(checkContent(DATA), [], '원고는 그대로 깨끗');
  const noEv = [];
  let gated = 0;
  for (const c of CARDS) {
    const at = gateAtOf(c, 1);
    if (isListen(c)) { assert.equal(at, -1, `${c.id} 🎧`); continue; }
    if (!c.qs.some(hasEv)) { assert.equal(at, -1); noEv.push(c.id); continue; }
    gated++;
    assert.ok(hasEv(c.qs[at]) && c.qs.slice(0, at).every((q) => !hasEv(q)), `${c.id} 근거가 있는 첫 물음`);
    assert.equal(gateAtOf(c, 0), -1, `${c.id} 별을 못 받는 날엔 없음`);
    for (const star of [2, 3]) assert.equal(gateAtOf(c, star), at, `${c.id} ★${star} 받는 날도 같은 물음`);
  }
  assert.ok(gated >= 70, `근거부터가 걸리는 글 ${gated}`);
  // 근거 물음이 없는 글(글 전체를 보는 물음만) — 새로 생기면 여기서 알게
  assert.deepEqual(noEv, ['K17', 'K25', 'K79', 'K80']);
});

test('📤 읽은 기록 v·w·k (readOf): v가 0 이상 수일 때만 셋 다 · v는 읽은 초를 넘지 않게 · w·k 범위 · 옛 줄은 꼴 그대로', () => {
  const base = { c: 'K42', t: T0, d: D0, s: 120, a: 70, n: 4, f: 3, x: 0, e: 0, h: 0, g: 1, m: '', q: 30 };
  assert.deepEqual(readOf({ ...base, v: 25, w: 2, k: 1 }), { ...base, v: 25, w: 2, k: 1 });
  assert.equal(readOf({ ...base, v: 999 }).v, 120, '읽은 초를 넘지 않게');
  assert.equal(readOf({ ...base, v: 25.9 }).v, 25);
  assert.deepEqual([readOf({ ...base, v: 5, w: -3, k: 7 }).w, readOf({ ...base, v: 5, w: -3, k: 7 }).k], [0, 1]);
  assert.equal(readOf({ ...base, v: 5, w: 5000 }).w, READ_W_MAX);
  assert.deepEqual([readOf({ ...base, v: 5 }).w, readOf({ ...base, v: 5 }).k], [0, 0], 'w·k가 없으면 0');
  for (const bad of [-1, '25', null, NaN, undefined, Infinity]) {
    const x = readOf({ ...base, v: bad, w: 2, k: 1 });
    assert.ok(!('v' in x) && !('w' in x) && !('k' in x), `v ${String(bad)} — 셋 다 뺀다`);
  }
  assert.deepEqual(Object.keys(readOf(base)), ['c', 't', 'd', 's', 'a', 'n', 'f', 'x', 'e', 'h', 'g', 'm', 'q'], 'v272까지의 줄은 꼴 그대로');
});

test('📤 병합 — 옛 앱을 거쳐 v·w·k(·q)가 지워진 사본과 합쳐도 남는다 (차례 상관없이 · 여러 번)', () => {
  const base = { c: 'K42', t: T0, d: D0, s: 120, a: 70, n: 4, f: 3, x: 0, e: 0, h: 0, g: 1, m: '' };
  const full = readOf({ ...base, q: 30, v: 25, w: 2, k: 1 });
  const qOnly = readOf({ ...base, q: 30 }); // v260~v272 앱이 다시 저장한 사본
  const bare = readOf(base); // v258·v259 앱
  for (const old of [qOnly, bare]) {
    assert.deepEqual(mergeReads([full], [old]), [full]);
    assert.deepEqual(mergeReads([old], [full]), [full]);
    assert.deepEqual(mergeReads(mergeReads([old], [full]), [old, old]), [full]);
  }
  assert.deepEqual(readsOf([bare, qOnly, full]), readsOf([full, qOnly, bare]));
  // 나머지가 다르면 더한 칸과 상관없이 늘 같은 쪽(큰 쪽)
  const more = readOf({ ...base, s: 200 });
  assert.deepEqual(mergeReads([full], [more]), mergeReads([more], [full]));
  // 다 읽을 때 그대로 적힘
  const p = pf();
  korFinishRule(p, 'K42', T0, {}, IDS, 0, { read: { t: T0, s: 120, a: 70, n: 4, f: 3, x: 0, e: 0, h: 0, m: '', q: 30, v: 25, w: 2, k: 1 } });
  const got = p.korReads.at(-1);
  assert.deepEqual([got.v, got.w, got.k], [25, 2, 1]);
});

test('📤 읽은 기록 한 줄 (koreanview.readLog): 근거부터 물음은 v·w·k로 따로 · e는 두 번 틀린 것만 · 근거를 못 찾았거나 없으면 v·w·k 없음', async () => {
  const { readLog } = await import('../js/koreanview.js');
  const card = { qs: [{ opts: [1, 2, 3, 4] }, { opts: [1, 2, 3, 4] }, { opts: [1, 2, 3, 4] }] };
  const st = (o) => ({ wrong: [], answered: true, evDone: true, evWrong: [], evFirst: false, hint2: false, gate: false, from: -1, evAt: -1, ...o });
  const r = { card, t0: 5000, sec: 200, firstSec: 60, askAt: 20, ls: null, qs: [st({ gate: true, evFirst: true, from: 20, evAt: 55, evWrong: [4, 9] }), st({ wrong: [0, 1], evFirst: true }), st({ wrong: [2] })] };
  assert.deepEqual(readLog(r), { t: 5000, s: 200, a: 60, n: 3, f: 1, x: 0, e: 1, h: 0, p: 0, m: '', q: 20, v: 35, w: 2, k: 1 });
  const missed = { ...r, qs: [st({ gate: true, evFirst: true, from: 20, evAt: 55, wrong: [3] }), r.qs[1], r.qs[2]] };
  assert.deepEqual([readLog(missed).k, readLog(missed).w, readLog(missed).f], [0, 0, 0], '찾은 뒤에도 틀림');
  const noGate = { ...r, qs: r.qs.map((s) => ({ ...s, gate: false })) };
  assert.ok(!('v' in readLog(noGate)), '근거부터 물음이 없으면(다시 읽는 글) v 없음');
  assert.equal(readLog(noGate).e, 2, '그때 근거 먼저는 예전처럼 센다');
  assert.ok(!('v' in readLog({ ...r, qs: [st({ gate: true, evAt: -1 }), r.qs[1], r.qs[2]] })), '찾은 때가 없으면 v 없음');
  assert.equal(readLog({ ...r, qs: [st({ gate: true, evFirst: true, from: -1, evAt: 12 }), r.qs[1], r.qs[2]] }).v, 12, '보인 때가 없으면 0부터');
});

test('📤 국어 요약: 머리말에 "근거 먼저"·"근거부터" 뜻 · 모은 줄에 근거부터(있는 줄만) · 줄마다 찾기까지·잘못 누른 줄·찾은 뒤에도 틀림', () => {
  const row = (o) => ({ c: 'K42', t: T0, d: D0, s: 90, a: 50, n: 4, f: 2, x: 0, e: 0, h: 0, g: 1, m: '', q: 20, ...o });
  const L = readLines([row({ v: 30, w: 0, k: 1 }), row({ t: T0 + 1, v: 50, w: 3, k: 0 }), row({ t: T0 + 2, g: 0 })], DATA.cards, '2026-10-16');
  assert.match(L[1], /🔍 근거 먼저 = 틀린 보기를 두 번 고른 뒤 근거 줄부터 찾은 물음/);
  assert.match(L[1], /📍 근거부터 = 별을 받을 수 있는 읽기\(v273은 ★ 전의 글만 · v274부터 ★·★★·★★★ 받는 날, 🎧 빼고\)에서 근거가 있는 첫 물음 하나는 보기를 고르기 전에 근거 줄부터/);
  assert.match(L[1], /\)\)$/, '머리말 괄호는 닫힌다');
  assert.match(L[2], / · 📍 근거부터 2번\(찾기까지 평균 40초 · 잘못 누른 줄 3 · 찾은 뒤 첫 번에 1\/2\)$/);
  const lines = L.slice(3);
  assert.equal(lines.filter((x) => x.endsWith(' · 📍 근거부터 찾기까지 30초')).length, 1);
  assert.equal(lines.filter((x) => x.endsWith(' · 📍 근거부터 찾기까지 50초(잘못 누른 줄 3) · 찾은 뒤에도 틀림')).length, 1);
  assert.equal(lines.filter((x) => !x.includes('📍')).length, 1, '다시 읽은 줄엔 없음');
  assert.ok(!readLines([row({})], DATA.cards, '2026-10-16')[2].includes('📍'), '근거부터 줄이 없으면 모은 말도 없다');
});

test('🔍 물음 아래 말 (qFeedback, 순수): 근거부터는 파란 안내 · 두 번 틀림은 빨강 · 찾은 직후만 "찾았어요!"(안 틀렸으면 "남은" 없이) · 찾은 뒤 새로 틀리면 그 보기 힌트 (Codex 82차 #1)', async () => {
  const { qFeedback, hintOf } = await import('../js/koreanview.js');
  const q = { ev: [3, 5], opts: [{ ok: true, t: '맞음' }, { ok: false, type: 'detail', t: '틀림1' }, { ok: false, type: 'make', t: '틀림2' }, { ok: false, type: 'detail', t: '틀림3' }] };
  const st = (o) => ({ wrong: [], answered: false, evDone: false, evWrong: [], evFirst: false, hint2: false, gate: false, from: -1, evAt: -1, wrongAtEv: -1, ...o });
  const r = { ls: null };
  const say = (o) => qFeedback(q, st(o), '줄', r);
  // 근거부터 — 안 틀렸어도 · 파란(is-gate) · 셈 말 없이
  assert.deepEqual(say({ gate: true }), { cls: 'is-gate', text: '🔍 이 물음은 근거부터! 답을 고르기 전에, 답이 들어 있는 줄을 글에서 먼저 찾아 눌러 봐요.' });
  assert.ok(!/\d/.test(say({ gate: true }).text), '근거부터 안내에 수가 없다');
  assert.equal(qFeedback(q, st({ gate: true }), '문장', r).text, '🔍 이 물음은 근거부터! 답을 고르기 전에, 답이 들어 있는 문장을 글에서 먼저 찾아 눌러 봐요.');
  // 두 번 틀림(v258)은 그대로 빨강
  assert.equal(say({ wrong: [1, 2] }).cls, 'is-no');
  assert.match(say({ wrong: [1, 2] }).text, /^🔍 두 번 틀렸어요\./);
  // 근거부터에서 찾은 직후 — "남은" 없이
  const found = { gate: true, evFirst: true, evDone: true, wrongAtEv: 0 };
  assert.deepEqual(say(found), { cls: 'is-ok', text: '찾았어요! 칠한 줄(③, ⑤)을 다시 읽고 보기에서 골라 봐요.' });
  // 그 뒤에 보기를 틀렸다 — 초록 "찾았어요!"가 아니라 방금 고른 보기의 힌트
  assert.deepEqual(say({ ...found, wrong: [1] }), { cls: 'is-no', text: `🤔 ${hintOf('detail', r)}` });
  assert.deepEqual(say({ ...found, wrong: [1, 2] }), { cls: 'is-no', text: `🤔 ${hintOf('make', r)}` }, '두 번째 오답도 그 보기의 힌트(새 말이라 다시 읽힌다)');
  assert.ok(hintOf('detail', r) && hintOf('make', r) && hintOf('detail', r) !== hintOf('make', r), '힌트가 비지 않고 서로 다르다');
  assert.equal(evFirstNow(q, st({ ...found, wrong: [1, 2] })), false, '찾은 뒤 두 번 틀려도 다시 잠그지 않는다');
  // 두 번 틀려 근거 먼저(v258)로 찾은 직후는 "남은 보기" · 그 뒤 새로 틀리면 힌트
  const found2 = { wrong: [1, 2], evFirst: true, evDone: true, wrongAtEv: 2 };
  assert.deepEqual(say(found2), { cls: 'is-ok', text: '찾았어요! 칠한 줄(③, ⑤)을 다시 읽고 남은 보기에서 골라 봐요.' });
  assert.deepEqual(say({ ...found2, wrong: [1, 2, 3] }), { cls: 'is-no', text: `🤔 ${hintOf('detail', r)}` });
  // 맞힘이 가장 먼저 · 아무 일도 없으면 빈 말
  assert.deepEqual(say({ ...found, wrong: [1], answered: true }), { cls: 'is-ok', text: '맞아요!' });
  assert.deepEqual(say({ answered: true }), { cls: 'is-ok', text: '맞아요! 이제 그렇게 생각한 까닭을 글에서 찾아볼까요?' });
  assert.deepEqual(say({}), { cls: '', text: '' });
  assert.deepEqual(say({ wrong: [3] }), { cls: 'is-no', text: `🤔 ${hintOf('detail', r)}` });
});

test('📤 근거부터가 둘째 이후 물음일 때 (readLog): 찾기까지는 그 물음이 나온 때부터 · 첫 답까지와 따로', async () => {
  const { readLog } = await import('../js/koreanview.js');
  const card = { qs: [{ opts: [1, 2, 3, 4] }, { opts: [1, 2, 3, 4] }, { opts: [1, 2, 3, 4] }] };
  const st = (o) => ({ wrong: [], answered: true, evDone: true, evWrong: [], evFirst: false, hint2: false, gate: false, from: -1, evAt: -1, wrongAtEv: -1, ...o });
  const r = { card, t0: 5000, sec: 240, firstSec: 30, askAt: 20, ls: null, qs: [st({}), st({ gate: true, evFirst: true, from: 90, evAt: 130, evWrong: [2], wrongAtEv: 0 }), st({})] };
  const x = readLog(r);
  assert.deepEqual([x.a, x.v, x.w, x.k, x.e, x.f], [30, 40, 1, 1, 0, 3]);
});

test('🔍 화면 배선 (v273): 열 때 별 0개면 근거부터 자리(기록을 다시 읽는 사이엔 안 걺) · 물음이 보인 때 · 안내는 잠긴 보기 위 · 찾은 때·찾을 때까지 틀린 수 · css · sw', () => {
  const src = read('js/koreanview.js');
  const body = (head) => { const i = src.indexOf(head); assert.ok(i >= 0, head); return src.slice(i, src.indexOf('\n}\n', i)); };
  const open = body('function openCard(id) {');
  // v300: 받을 별을 한 번 세어 🎯 다시 읽기 안내와 같이 쓴다 — 다시 읽는 사이엔 0(gateAtOf(card, 0)은 -1)
  assert.ok(open.includes('const starNow = profileLoading() ? 0 : nextStar(korDoneMap(), card.id, Date.now()).star;') && open.includes('const gateAt = gateAtOf(card, starNow);'), '연 때 이번에 받을 별로 · 다시 읽는 사이(받은 별이 비어 보임)는 안 걺');
  assert.ok(open.includes('gate: i === gateAt, from: -1, evAt: -1, wrongAtEv: -1 })'), '물음마다 상태');
  const rq = body('function renderQ() {');
  assert.ok(rq.includes('if (st.gate && st.from < 0) st.from = r.sec;'), '처음 보인 때 한 번');
  assert.ok(rq.indexOf('if (readFirst(r)) {') < rq.indexOf('if (st.gate && st.from < 0)'), '📖 [문제 보기] 전에는 재지 않는다');
  assert.ok(rq.includes('const said = qFeedback(q, st, unit, r);') && rq.includes("const fb = el('p', `kor-fb${said.cls ? ` ${said.cls}` : ''}`, said.text);"));
  // v363: 보기 위에 놓는 말 = 근거부터(is-gate) · 🔊 듣는 중(is-say)
  assert.ok(rq.includes("const above = said.cls === 'is-gate' || said.cls === 'is-say';"), '보기 위에 놓는 말');
  const atGate = rq.indexOf('if (above) card.appendChild(fb);');
  assert.ok(atGate > rq.indexOf("card.appendChild(el('p', 'kor-q-text', q.q));") && atGate < rq.indexOf("const opts = el('div'"), '근거부터 안내는 물음 글 아래·보기 위 (Codex 82차 #2)');
  const below = rq.indexOf('if (!above) card.appendChild(fb);');
  assert.ok(below > rq.indexOf('card.appendChild(opts);') && below < rq.indexOf('let say = fb.textContent;'), '다른 말은 예전처럼 보기 아래');
  const ev = body('function evPick(n) {');
  const mark = 'if (!st.answered) { st.wrongAtEv = st.wrong.length; if (st.gate) st.evAt = r.sec; }';
  assert.ok(ev.includes(mark) && ev.indexOf(mark) < ev.indexOf('st.evDone = true;'), '찾은 때 · 찾을 때까지 틀린 수');
  assert.ok(read('css/style.css').includes('.kor-fb.is-gate { color: var(--primary-dark); font-weight: 700; }'));
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(read('sw.js')) || [])[1]) >= 273, 'sw는 v273 이상');
});

test('🧤 도감 스톤 칩도 레벨업·상점 뒤에 다시 그린다 (2026-10-16 — 가방 줄만 고쳐 칩이 연 때 수 그대로였다)', () => {
  const src = read('js/pokedex.js');
  const body = (head) => { const i = src.indexOf(head); assert.ok(i >= 0, head); return src.slice(i, src.indexOf('\n}\n', i)); };
  const rc = body('function renderCoins() {');
  assert.ok(rc.includes("const gl = $('pokedex-main').querySelector('.pokedex-gauntlet');") && rc.includes('if (gl) gl.replaceWith(gauntletEl(getProfileSnapshot()));'), '코인·가방과 같이 스톤 칩도');
  assert.ok(body('function refreshAfterChange(monId) {').includes('renderCoins();'), '상점·레벨업(shop.notify → onChange) 뒤');
  const ge = body('function gauntletEl(p) {');
  assert.ok(ge.includes('for (const s of STONES) {') && ge.includes('const n = p.items && p.items[s.id] ? p.items[s.id] : 0;'), '가방(bagText)과 같은 값 — profile.items');
  assert.ok(body('export async function openPokedex(opts) {').includes('card.appendChild(gauntletEl(p));'), '열 때도 같은 함수');
  assert.equal((src.match(/'pokedex-gauntlet'/g) || []).length, 1, '칩 줄을 만드는 곳은 한 곳');
  const shop = read('js/shop.js');
  const lv = shop.slice(shop.indexOf('async function doLevelUp('), shop.indexOf('\n}\n', shop.indexOf('async function doLevelUp('))); // 🍬 v275부터 doLevelUp(useCandy)
  assert.ok(lv.includes('if (r && r.ok) notify(id);'), '레벨업은 notify로 도감을 고친다');
});
