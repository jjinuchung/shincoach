// 📮 포켓몬 편지 (v351) — 규칙(letters.js) · 원고 · 게이트 · 프로필 · 📤 · 홈 카드: node --test tests/letters351.test.js
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  LETTER_LEN, LETTER_MAX, STAR_GAP, STAR_COINS, OK_COINS, BOX, KEEP_DONE, REPLY_ROWS_MAX,
  normLetter, letterCount, envelopeFill, letterCheck, letterIdOf, boxOf, checkLetters, lettersList, sayLines,
  lettersOf, mergeLetters, starOpen, letterNow, letterDot, letterStartRule, letterSeenRule, letterSendRule,
  checkLetterReplies, letterReplyStats, letterReplyRule, letterReadRule, giftLine, stripText, letterTodo, letterTodoMd,
} from '../js/letters.js';
import { ROSTER, subjectOf, forSubject, forPuzzle, isLetterMon, LEGENDARY, isUnlocked } from '../js/pokemon.js';
import { pickOpponent } from '../js/battle.js';
import { giftPoolOf } from '../js/grammar.js';
import { dayNum } from '../js/korean.js';
import { emptyProfile, cloneProfile, mergeStatRecord } from '../js/db.js';
import { initProfile, flushProfile, reloadProfile, tradeCtx, letterSend, letterApply, letterRead, lettersMap, getProfileSnapshot } from '../js/xp.js';
import { lettersFiles } from '../js/upload.js';
import { cardSubject, SUBJECTS } from '../js/home.js';
import { MON_TYPES } from '../js/montypes.js';

const DATA = JSON.parse(readFileSync(new URL('../coach/english/letters.json', import.meta.url), 'utf8'));
const LIST = lettersList(DATA);
const LETTER_IDS = ROSTER.filter((r) => r.subject === 'letter').map((r) => r.id);
const DAY = 86400000;
const T0 = new Date(2026, 9, 28, 10).getTime();
const D0 = dayNum(T0);
/** 봉투가 차는 답장 (한글은 안 셈) */
const GOOD = 'My favorite Pokemon is Greninja. It is a Water and Dark type. It can use Water Shuriken. It is very fast. I want to see your painting! Can you paint a Pikachu for me? 피카츄';
const rep = (mon, id, grade, extra = {}) => ({ mon, id, grade, en: 'Wow, Greninja is so cool!', ko: '우와, 개굴닌자 멋지다!', ps: '', psKo: '', ...extra });
/** 첫 편지를 받아 답장까지 보낸 프로필 */
function sentProfile(text = GOOD) {
  const p = { caught: {}, coins: 0, coinsEarned: 0, items: {} };
  letterStartRule(p, T0);
  const r = letterSendRule(p, LIST[0].id, text, T0 + DAY, LIST);
  assert.equal(r.ok, true, '보내짐');
  return { p, id: r.id };
}

test('📮 원고: 편지 포켓몬 30마리마다 한 통 · 명단 차례 그대로 · 틀 · 판단 기준 넷', () => {
  assert.deepEqual(checkLetters(DATA, LETTER_IDS), []);
  assert.equal(LIST.length, 30);
  assert.deepEqual(LIST.map((x) => x.id), LETTER_IDS, '편지 차례 = 명단 차례');
  for (const L of LIST) {
    const r = ROSTER.find((m) => m.id === L.id);
    assert.deepEqual([L.en, L.ko], [r.en, r.ko], `이름 ${L.id}`);
    assert.equal(L.body[0], `Hi! I am ${L.en}.`);
    assert.equal(L.body.at(-1), 'Please write back to me!');
    assert.ok(L.koText && L.ask && L.starter, `우리말·도움·본보기 ${L.id}`);
  }
  // 깨진 원고는 검사가 잡는다 (앱은 조용히 뺀다)
  const bad = JSON.parse(JSON.stringify(DATA));
  bad.letters[0].body[0] = 'Hello.';
  bad.letters[1].body.push('Bye!');
  bad.letters.pop();
  delete bad.grades.ok;
  const msgs = checkLetters(bad, LETTER_IDS);
  assert.ok(msgs.some((m) => m.includes('첫 문장')) && msgs.some((m) => m.includes('끝 문장')) && msgs.some((m) => m.includes('편지가 없어요')) && msgs.some((m) => m.includes('grades.ok')), msgs.join(' / '));
  assert.ok(checkLetters(DATA, [...LETTER_IDS.slice(1), 25]).some((m) => m.includes('편지 포켓몬이 아님')));
  assert.deepEqual(lettersList(null), []);
  assert.equal(lettersList({ letters: [DATA.letters[0], DATA.letters[0], { id: 1 }] }).length, 1, '겹침·깨진 편지는 뺀다');
});

test('📮 명단: 편지 포켓몬 30 — 명단 안 다른 과목과 안 겹침 · 전설 아님 · 타입표 · Lv1', () => {
  assert.equal(LETTER_IDS.length, 30);
  for (const id of LETTER_IDS) {
    assert.equal(subjectOf(id), 'letter');
    assert.equal(isLetterMon(id), true);
    assert.ok(!LEGENDARY.includes(id), `전설 아님 ${id}`);
    assert.ok(Array.isArray(MON_TYPES[id]), `타입표 ${id}`);
    assert.equal(isUnlocked(id, 1), true, `Lv1 ${id}`);
  }
  assert.equal(isLetterMon(25), false);
  assert.equal(isLetterMon('235'), true, '글자 id도');
});

test('📮 게이트: 잡기 후보·퍼즐·⚔️ 배틀 상대·🤝 5일장·📝 🎁 깜짝 포켓몬·🎒 대여행에서 빠진다', () => {
  const all = ROSTER.map((r) => ({ id: r.id }));
  for (const s of ['english', 'math', 'korean', 'nonsul']) assert.ok(!forSubject(all, s).some((c) => isLetterMon(c.id)), `잡기 후보 ${s}`);
  assert.equal(forSubject(all, 'letter').length, 30);
  assert.ok(!forPuzzle(all, () => false).some((c) => isLetterMon(c.id)), '못 얻은 편지 포켓몬은 퍼즐에 안 놀러 온다');
  assert.ok(forPuzzle(all, (id) => id === 235).some((c) => c.id === 235), '친구가 되면 놀러 온다');
  // ⚔️ 배틀 상대 — 편지 포켓몬만 남은 명단이면 상대가 없다 · 섞여 있어도 안 고른다
  assert.equal(pickOpponent(LETTER_IDS.map((id) => ({ id })), {}, () => 0.5), null);
  for (let i = 0; i < 200; i++) {
    const o = pickOpponent([...LETTER_IDS, 25, 133].map((id) => ({ id })), {}, () => i / 200);
    assert.ok(o && !isLetterMon(o.id), `배틀 상대 ${o && o.id}`);
  }
  // 🤝 5일장 — 상인이 안 가져오고 진우도 못 준다
  const ctx = tradeCtx({ xp: 0, caught: {} });
  for (const id of LETTER_IDS) assert.equal(ctx.allowed(id), false, `교환 ${id}`);
  assert.equal(ctx.allowed(25), true);
  // 📝 🎁 깜짝 포켓몬 — 영어 포켓몬만
  assert.ok(!giftPoolOf(ROSTER, subjectOf, LEGENDARY, () => true).some(isLetterMon));
  // 🎒 대여행 — 후보를 만드는 곳(화면)이 뺀다
  const jv = readFileSync(new URL('../js/journeyview.js', import.meta.url), 'utf8');
  assert.match(jv, /const ok = \(id\) => [^\n]*!isLetterMon\(id\)/);
});

test('📮 봉투 셈: 띄어쓰기 포함 · 겹친 빈칸 하나 · 한글 안 셈 · 150에서 찬다 · 600자 끝 · 기호로 채우기 막음', () => {
  assert.equal(letterCount('  I  like\n\n  Pikachu.  '), 'I like Pikachu.'.length);
  assert.equal(letterCount('I like 피카츄 a lot'), 'I like a lot'.length, '한글을 빼고 빈칸 하나');
  assert.equal(normLetter(' Hi!\r\n\r\n  I am   Jinwoo. \t'), 'Hi!\nI am Jinwoo.');
  const at = (n) => 'a'.repeat(n);
  assert.equal(letterCheck(at(LETTER_LEN - 1)).why, 'short');
  assert.equal(letterCheck(at(LETTER_LEN)).ok, true);
  assert.equal(envelopeFill(at(75)), 0.5);
  assert.equal(envelopeFill(at(500)), 1);
  assert.equal(letterCheck(at(LETTER_MAX + 1)).why, 'long');
  assert.equal(letterCheck(`${'1234567890 !?'.repeat(13)} a`).why, 'english', '숫자·기호로만 채운 봉투');
  assert.equal(letterCheck(`${'가나다라마바사 '.repeat(40)}${at(100)}`).why, 'short', '한글은 봉투를 안 채운다');
  assert.equal(letterCheck(GOOD).ok, true);
});

test('📮 차례: 처음 연 다음 날 첫 편지 → 열면 빨간 점 꺼짐 → 보냄 → 답장 → 읽은 다음 날 다음 편지', () => {
  const p = { caught: {}, coins: 0, items: {} };
  assert.equal(letterNow(p.letters, p.caught, LIST, T0).kind, 'off');
  assert.equal(letterStartRule(p, T0).ok, true);
  assert.equal(letterStartRule(p, T0 + DAY).why, 'had', '처음 연 날은 그대로');
  assert.deepEqual(letterNow(p.letters, p.caught, LIST, T0), { kind: 'wait', from: D0 + 1 });
  let st = letterNow(p.letters, p.caught, LIST, T0 + DAY);
  assert.deepEqual([st.kind, st.mon, st.fresh, letterDot(st)], ['letter', 235, true, true]);
  assert.equal(stripText(st), '📮 루브도에게서 편지가 왔어요!');
  assert.equal(letterSeenRule(p, 213, T0 + DAY, LIST).why, 'changed', '지금 편지가 아니면 안 적는다');
  assert.equal(letterSeenRule(p, 235, T0 + DAY, LIST).ok, true);
  st = letterNow(p.letters, p.caught, LIST, T0 + DAY);
  assert.deepEqual([st.fresh, letterDot(st)], [false, false]);
  assert.equal(letterSendRule(p, 213, GOOD, T0 + DAY, LIST).why, 'changed', '지금 편지에만 답장');
  assert.equal(letterSendRule(p, 235, 'Hi!', T0 + DAY, LIST).why, 'short');
  const s = letterSendRule(p, 235, GOOD, T0 + DAY, LIST);
  assert.equal(s.ok, true);
  assert.equal(s.id, letterIdOf(s.at, 235, normLetter(GOOD)));
  st = letterNow(p.letters, p.caught, LIST, T0 + DAY);
  assert.deepEqual([st.kind, st.mon, letterDot(st)], ['sent', 235, false]);
  assert.equal(stripText(st), '✉️ 루브도가 답장을 쓰고 있어요');
  assert.equal(letterSendRule(p, 235, GOOD, T0 + DAY, LIST).why, 'changed', '기다리는 글이 있으면 또 못 보낸다');
  // 답장 → 안 읽은 답장(빨간 점) → 읽음 → 그날은 기다림 → 다음 날 다음 편지(단단지)
  assert.equal(letterReplyRule(p, [rep(235, s.id, 'good')], T0 + DAY * 2, LIST).ok, true);
  st = letterNow(p.letters, p.caught, LIST, T0 + DAY * 3);
  assert.deepEqual([st.kind, st.mon, letterDot(st)], ['reply', 235, true]);
  assert.equal(letterReadRule(p, s.id, T0 + DAY * 3).ok, true);
  assert.equal(letterReadRule(p, s.id, T0 + DAY * 3).why, 'none', '두 번 안 읽음');
  assert.deepEqual(letterNow(p.letters, p.caught, LIST, T0 + DAY * 3), { kind: 'wait', from: D0 + 4 }, '답장을 읽은 다음 날');
  st = letterNow(p.letters, p.caught, LIST, T0 + DAY * 4);
  assert.deepEqual([st.kind, st.mon, st.letter.ko, st.fresh], ['letter', 213, '단단지', true]);
  // 도감에 이미 있는 편지 포켓몬(📦 구호품 등)은 건너뛴다
  st = letterNow(p.letters, { 213: 1 }, LIST, T0 + DAY * 4);
  assert.equal(st.mon, 313);
  // 다 끝나면 비었다
  const done = { ...p, letters: lettersOf(p.letters) };
  assert.equal(letterNow(done.letters, Object.fromEntries(LETTER_IDS.map((id) => [id, 1])), LIST, T0 + DAY * 4).kind, 'none');
});

test('📮 ✉️ 다시 써 볼까: 선물 없음 · 읽으면 같은 편지에 바로 다시(기다리지 않음) · 다음 답장은 전에 쓴 글과 함께 📤', () => {
  const { p, id } = sentProfile();
  const r = letterReplyRule(p, [rep(235, id, 'again')], T0 + DAY * 2, LIST);
  assert.deepEqual(r.applied, [{ mon: 235, id, g: 'again', gift: null }]);
  assert.deepEqual([p.coins, p.caught, p.items], [0, {}, {}], '선물 없음');
  assert.equal(letterReadRule(p, id, T0 + DAY * 2).ok, true);
  const st = letterNow(p.letters, p.caught, LIST, T0 + DAY * 2);
  assert.deepEqual([st.kind, st.mon, st.again], ['letter', 235, true], '같은 날 바로 다시');
  assert.equal(stripText(st), '📮 루브도에게 다시 써 볼까요?');
  assert.equal(giftLine('again', null, '루브도').startsWith('✉️ 다시 써서'), true);
  const s2 = letterSendRule(p, 235, `${GOOD} Thank you!`, T0 + DAY * 2, LIST);
  assert.equal(s2.ok, true);
  assert.ok(s2.at > lettersOf(p.letters).sent[0].at);
  const todo = letterTodo(p.letters, LIST, T0 + DAY * 2);
  assert.equal(todo.length, 1);
  assert.deepEqual(todo[0].before.map((b) => b.grade), ['again'], '전에 쓴 글과 그 판단');
});

test('📮 🌟 그 포켓몬 + 💰30 — 2주에 한 번 · 그 안이거나 이미 도감에 있으면 👍 상자', () => {
  const { p, id } = sentProfile();
  p.partner = 25;
  letterReplyRule(p, [rep(235, id, 'star')], T0 + DAY * 2, LIST);
  assert.deepEqual([p.caught[235], p.coins, p.coinsEarned, p.partner], [1, STAR_COINS, STAR_COINS, 25], '도감 · 💰 · 파트너는 그대로');
  const L = lettersOf(p.letters);
  assert.deepEqual(L.sent[0].r.gift, { k: 'friend', mon: 235, n: STAR_COINS });
  assert.equal(L.star, D0 + 2);
  assert.equal(giftLine('star', L.sent[0].r.gift, '루브도'), '🌟 루브도가 친구가 됐어요! 도감에 들어갔어요 · 💰 +30');
  assert.equal(starOpen(L, D0 + 2 + STAR_GAP - 1), false);
  assert.equal(starOpen(L, D0 + 2 + STAR_GAP), true);
  // 다음 편지(단단지)에 또 🌟 — 2주 안이면 상자
  letterReadRule(p, L.sent[0].id, T0 + DAY * 2);
  const s2 = letterSendRule(p, 213, GOOD, T0 + DAY * 3, LIST);
  assert.equal(s2.ok, true);
  assert.equal(letterTodo(p.letters, LIST, T0 + DAY * 3)[0].starOpen, false, '📤에 2주 안이라고 적는다');
  const before = { coins: p.coins, items: { ...p.items } };
  letterReplyRule(p, [rep(213, s2.id, 'star')], T0 + DAY * 4, LIST);
  const g = lettersOf(p.letters).sent[1].r.gift;
  assert.equal(g.from, 'star');
  assert.deepEqual({ k: g.k, n: g.n, ...(g.id ? { id: g.id } : {}) }, boxOf(s2.id), '상자는 글 이름표로');
  assert.equal(p.caught[213], undefined, '친구는 안 됨');
  if (g.k === 'coins') assert.equal(p.coins, before.coins + g.n);
  else assert.equal(p.items[g.id], (before.items[g.id] || 0) + g.n);
  assert.ok(giftLine('star', g, '단단지').startsWith('🌟 정말 잘 썼어요! 🎁 상자를 열었어요'));
  // 2주 뒤 🌟는 다시 친구 · 이미 도감에 있으면 상자
  const q = sentProfile().p;
  q.letters = { ...lettersOf(q.letters), star: D0 - STAR_GAP + 1 };
  const qid = lettersOf(q.letters).sent[0].id;
  letterReplyRule(q, [rep(235, qid, 'star')], T0 + DAY, LIST);
  assert.equal(q.caught[235], 1, '마지막 🌟에서 2주(14일)째 날이면 다시');
  const w = sentProfile().p;
  w.caught = { 235: 2 };
  letterReplyRule(w, [rep(235, lettersOf(w.letters).sent[0].id, 'star')], T0 + DAY * 2, LIST);
  assert.equal(w.caught[235], 2, '이미 있으면 그대로');
  assert.equal(lettersOf(w.letters).sent[0].r.gift.from, 'star');
  assert.equal(lettersOf(w.letters).star, 0, '🌟 날도 안 쓴다');
});

test('📮 👍 상자(💰30 · 🔶 영어스톤 1 · 🔵 슈퍼볼 3 — 이름표로 늘 같은 것) · 🙂 💰10', () => {
  assert.deepEqual(BOX.map((b) => b.k), ['coins', 'stone', 'ball']);
  const seen = new Set();
  for (let i = 0; i < 300; i++) { const b = boxOf(letterIdOf(1000 + i, 235, 'x')); seen.add(b.k); assert.deepEqual(boxOf(letterIdOf(1000 + i, 235, 'x')), b, '같은 글은 같은 상자'); }
  assert.equal(seen.size, 3, '셋 다 나온다');
  const lines = { coins: '🎁 상자를 열었어요 — 💰 +30', stone: '🎁 상자를 열었어요 — 🔶 영어스톤 +1', ball: '🎁 상자를 열었어요 — 🔵 슈퍼볼 +3' };
  for (const b of BOX) assert.equal(giftLine('good', b, '루브도'), lines[b.k]);
  const { p, id } = sentProfile();
  p.items = { greatball: 2, stone_english: 5 };
  letterReplyRule(p, [rep(235, id, 'good')], T0 + DAY * 2, LIST);
  const b = boxOf(id);
  const after = b.k === 'coins' ? p.coins : p.items[b.id];
  assert.equal(after, b.k === 'coins' ? 30 : b.k === 'stone' ? 6 : 5);
  const o = sentProfile();
  letterReplyRule(o.p, [rep(235, o.id, 'ok')], T0 + DAY * 2, LIST);
  assert.deepEqual([o.p.coins, o.p.coinsEarned], [OK_COINS, OK_COINS]);
  assert.equal(giftLine('ok', lettersOf(o.p.letters).sent[0].r.gift, '루브도'), '💰 +10');
});

test('📮 답장 파일 검사: 칸·길이·같은 글에 다른 답장 둘이면 둘 다 버림 · 같은 줄 둘은 하나 · 줄이 많으면 통째로 안 받음 · 한 번만 붙음', () => {
  const { p, id } = sentProfile();
  const good = rep(235, id, 'good');
  const c = checkLetterReplies([
    good, { ...good }, // 같은 줄 둘 → 하나
    { ...good, mon: 25 }, { ...good, id: 'w0000000000000a' }, { ...good, grade: 'great' }, { ...good, en: '' }, { ...good, ko: ' ' },
    { ...good, ps: 'x'.repeat(301) }, { ...good, psKo: 3 }, null,
  ], LIST);
  assert.equal(c.good.length, 1);
  assert.equal(c.bad.length, 8);
  const clash = checkLetterReplies([good, { ...good, grade: 'ok' }, { ...good }], LIST);
  assert.equal(clash.good.length, 0, '같은 글에 다른 답장 → 둘 다 버림(차례와 상관없이)');
  assert.equal(checkLetterReplies(Array.from({ length: REPLY_ROWS_MAX + 1 }, () => good), LIST).over, true);
  assert.equal(letterReplyRule(p, [{ ...good, id: letterIdOf(1, 235, 'zz') }], T0, LIST).why, 'none', '없는 글엔 안 붙음');
  assert.equal(letterReplyRule(p, [good], T0 + DAY * 2, LIST).ok, true);
  const coins = p.coins;
  const items = { ...p.items };
  assert.equal(letterReplyRule(p, [{ ...good, grade: 'star' }], T0 + DAY * 3, LIST).why, 'none', '이미 붙은 글엔 다시 안 붙음');
  assert.deepEqual([p.coins, p.items], [coins, items], '선물도 한 번');
  assert.deepEqual(letterReplyStats(p.letters, [good, { ...good, id: letterIdOf(1, 235, 'zz') }, { mon: 1 }], LIST), { rows: 3, good: 2, bad: 1, none: 1, stale: 0, over: false });
});

test('📮 장부: 깨진 칸은 버리고 · id는 다시 만들고 · 병합은 차례와 상관없이(답장 붙은 쪽 · 읽은 때 이른 쪽 · 첫날 이른 쪽 · 🌟 늦은 쪽)', () => {
  assert.deepEqual(lettersOf(null), { start: 0, seen: {}, sent: [], star: 0 });
  const raw = { start: 'x', seen: { 235: 5, abc: 3, 0: 1 }, sent: [{ mon: 235, at: 10, text: 'Hi', id: 'lfake' }, { mon: -1, at: 1, text: 'x' }, { at: 2, text: 'y' }, 7], star: -3 };
  const L = lettersOf(raw);
  assert.deepEqual([L.start, L.seen, L.star], [0, { 235: 5 }, 0]);
  assert.deepEqual(L.sent, [{ mon: 235, id: letterIdOf(10, 235, 'Hi'), at: 10, text: 'Hi' }]);
  const base = sentProfile().p.letters;
  const e = lettersOf(base).sent[0];
  const a = { ...lettersOf(base), start: D0 + 1, seen: { 235: D0 + 2 }, star: D0 };
  const b = lettersOf(base);
  b.sent[0] = { ...e, r: { g: 'good', en: 'Hi', ko: '안녕', ps: '', psKo: '', at: 50, gift: { k: 'coins', n: 30 } }, rd: 90 };
  const c = lettersOf(base);
  c.sent[0] = { ...e, r: { g: 'ok', en: 'Yo', ko: '야', ps: '', psKo: '', at: 60, gift: { k: 'coins', n: 10 } }, rd: 70 };
  b.star = D0 + 5;
  for (const [x, y] of [[a, b], [b, a]]) {
    const m = mergeLetters(x, y);
    assert.equal(m.start, D0, '첫날은 이른 쪽');
    assert.equal(m.seen[235], D0 + 1);
    assert.equal(m.star, D0 + 5);
    assert.equal(m.sent[0].r.g, 'good', '답장 붙은 쪽');
  }
  for (const [x, y] of [[b, c], [c, b]]) {
    const m = mergeLetters(x, y);
    assert.deepEqual([m.sent[0].r.g, m.sent[0].rd], ['good', 70], '먼저 붙은 답장 · 읽은 때는 이른 쪽');
  }
});

test('📮 장부 정리: 답장 받은 글은 최근 KEEP_DONE개 — 그래도 포켓몬마다 끝난 마지막 글은 남는다(끝난 편지가 다시 오지 않게)', () => {
  const r = (g, at) => ({ g, en: 'Hi', ko: '안녕', ps: '', psKo: '', at });
  const sent = [{ mon: 235, at: 1, text: 'first', r: r('good', 2), rd: 3 }];
  for (let i = 0; i < KEEP_DONE + 5; i++) sent.push({ mon: 213, at: 10 + i, text: `t${i}`, r: r('again', 11 + i), rd: 12 + i });
  const L = lettersOf({ start: 1, sent });
  assert.ok(L.sent.some((e) => e.mon === 235), '루브도의 끝난 글은 남는다');
  assert.equal(L.sent.filter((e) => e.r).length, KEEP_DONE + 1);
  assert.notEqual(letterNow(L, {}, LIST, Date.now()).mon, 235);
});

test('📮 프로필: 빈 프로필·복사·병합에 letters', () => {
  assert.deepEqual(emptyProfile().letters, { start: 0, seen: {}, sent: [], star: 0 });
  const p = sentProfile().p;
  const x = { ...emptyProfile(), letters: p.letters, updatedAt: 9 };
  const c = cloneProfile(x);
  c.letters.sent.push({ mon: 1 });
  assert.equal(x.letters.sent.length, 1, '복사본');
  const y = { ...emptyProfile(), letters: { start: D0 - 3, seen: {}, sent: [], star: 0 }, updatedAt: 3 };
  for (const [a, b] of [[x, y], [y, x]]) {
    const m = mergeStatRecord('profile', a, b);
    assert.equal(m.letters.start, D0 - 3);
    assert.equal(m.letters.sent.length, 1, '보낸 글은 남는다');
  }
});

test('📮 📤 판단 기다리는 글: mon·id·편지 글·물음·🌟 가능 · 사람이 읽는 글 · 빈 목록도 올린다', () => {
  const { p, id } = sentProfile();
  const todo = letterTodo(p.letters, LIST, T0 + DAY);
  assert.equal(todo.length, 1);
  assert.deepEqual([todo[0].mon, todo[0].id, todo[0].en, todo[0].ko, todo[0].focus, todo[0].starOpen, todo[0].text], [235, id, 'Smeargle', '루브도', 'G4', true, normLetter(GOOD)]);
  assert.equal(todo[0].letter[0], 'Hi! I am Smeargle.');
  const md = letterTodoMd(todo, '2026-10-29', DATA.grades);
  assert.ok(md.includes(`[mon 235 · id ${id}]`) && md.includes('🌟 star') && md.includes('진우: My favorite'), md.slice(0, 300));
  const files = lettersFiles({ todo, md }, '2026-10-29');
  assert.deepEqual(files.map((f) => f.path), ['letters/todo.md', 'letters/todo.json']);
  assert.deepEqual(JSON.parse(files[1].text), todo);
  assert.deepEqual(lettersFiles(null, '2026-10-29').map((f) => f.text.trim().slice(-2)), ['9)', '[]'], '못 만들어도 빈 목록');
  letterReplyRule(p, [rep(235, id, 'ok')], T0 + DAY * 2, LIST);
  assert.equal(letterTodo(p.letters, LIST, T0 + DAY * 2).length, 0, '답장이 붙으면 빠진다');
});

test('📮 말: 🔊는 소리 흉내 조각을 빼고 읽는다 · 홈 영어 카드 「📮 편지가 왔어요」 · 띠 말에 셈 없음', () => {
  assert.deepEqual(sayLines(['Zzz...', 'I am asleep. Zzz...', 'Hi!', '  ']), ['I am asleep.', 'Hi!']);
  const komala = LIST.find((x) => x.id === 775);
  assert.ok(sayLines(komala.body).every((x) => !/zzz/i.test(x)));
  const en = SUBJECTS.find((s) => s.key === 'english');
  assert.equal(cardSubject(en, { mail: true }).desc, '📮 편지가 왔어요');
  assert.equal(cardSubject(en, {}).desc, en.desc);
  for (const st of [{ kind: 'letter', letter: LIST[0], fresh: true }, { kind: 'sent', letter: LIST[0] }, { kind: 'reply', letter: LIST[1] }, { kind: 'wait', from: 1 }, { kind: 'none' }]) {
    assert.ok(!/\d/.test(stripText(st)), `띠 말에 숫자 없음 — ${stripText(st)}`);
  }
  assert.equal(stripText({ kind: 'off' }), '');
  assert.equal(stripText({ kind: 'reply', letter: LIST.find((x) => x.id === 338) }), '📮 솔록이 답장을 보냈어요!', '받침 뒤 「이」');
});

// ── 저장소를 지나는 길 (가짜 IndexedDB) ──
let initDone = false;
async function seed(p) {
  if (!initDone) { await initProfile(); initDone = true; }
  await flushProfile();
  const cur = fakeIdb.get('profile', 'me') || emptyProfile();
  fakeIdb.put('profile', { ...cur, ...p, id: 'me', updatedAt: (cur.updatedAt || 0) + 1 });
  await reloadProfile();
}

test('📮 트랜잭션: 보내기·답장 붙이기·읽기가 저장된 프로필에 · 저장이 안 되면 없던 일', async () => {
  const now = Date.now();
  await seed({ coins: 5, coinsEarned: 5, caught: {}, items: {}, partner: 25, letters: { start: dayNum(now) - 1, seen: {}, sent: [], star: 0 } });
  fakeIdb.failNext('profile');
  assert.equal((await letterSend(235, GOOD, LIST)).ok, false, '저장 실패면 보낸 것이 아니다');
  assert.equal(lettersMap().sent.length, 0);
  const s = await letterSend(235, GOOD, LIST);
  assert.equal(s.ok, true);
  assert.equal(fakeIdb.get('profile', 'me').letters.sent[0].id, s.id, '저장됨');
  assert.equal((await letterSend(235, GOOD, LIST)).why, 'changed', '두 번 눌러도 하나');
  const r = await letterApply([rep(235, s.id, 'star')], LIST);
  assert.equal(r.ok, true);
  const st = fakeIdb.get('profile', 'me');
  assert.deepEqual([st.caught[235], st.coins, st.partner], [1, 5 + STAR_COINS, 25]);
  assert.deepEqual([getProfileSnapshot().caught[235], getProfileSnapshot().coins], [1, 5 + STAR_COINS], '창의 프로필도');
  assert.equal((await letterApply([rep(235, s.id, 'star')], LIST)).ok, false, '두 번 안 붙음');
  assert.equal((await letterRead(s.id)).ok, true);
  assert.ok(fakeIdb.get('profile', 'me').letters.sent[0].rd > 0);
});

test('📮 🔍 Codex 155차: 이모지가 든 600자 글은 그대로(id도) · 큰 장부 병합은 차례와 상관없이 기다리는 글을 모두 남긴다', () => {
  const p = { caught: {}, coins: 0, items: {} };
  letterStartRule(p, T0);
  const text = `${'a'.repeat(LETTER_MAX - 10)}${'😀'.repeat(10)}`;
  assert.equal(letterCheck(text).ok, true, '글자 600 — 보낼 수 있다');
  const s = letterSendRule(p, 235, text, T0 + DAY, LIST);
  assert.equal(s.ok, true);
  const L = lettersOf(JSON.parse(JSON.stringify(p.letters)));
  assert.deepEqual([L.sent[0].text, L.sent[0].id], [text, s.id], '다시 읽어도 잘리지 않고 이름표도 그대로');
  const many = (from) => ({ start: 1, sent: Array.from({ length: 250 }, (_, i) => ({ mon: 235, at: from + i, text: `t${from + i}` })) });
  const a = many(1000);
  const b = many(5000);
  const ab = mergeLetters(a, b);
  const ba = mergeLetters(b, a);
  assert.equal(ab.sent.length, 500, '기다리는 글은 모두');
  assert.deepEqual(ab, ba, '차례와 상관없이 같다');
});

test('📮 트랜잭션: 답장 붙이기·읽기도 저장이 안 되면 없던 일(선물도 없음)', async () => {
  const now = Date.now();
  await seed({ coins: 0, coinsEarned: 0, caught: {}, items: {}, partner: 25, letters: { start: dayNum(now) - 1, seen: {}, sent: [], star: 0 } });
  const s = await letterSend(235, GOOD, LIST);
  assert.equal(s.ok, true);
  fakeIdb.failNext('profile');
  assert.equal((await letterApply([rep(235, s.id, 'ok')], LIST)).ok, false);
  assert.deepEqual([getProfileSnapshot().coins, lettersMap().sent[0].r], [0, undefined], '선물·답장 모두 없음');
  assert.equal((await letterApply([rep(235, s.id, 'ok')], LIST)).ok, true, '다음에 다시 받으면 붙는다');
  assert.equal(getProfileSnapshot().coins, OK_COINS);
  fakeIdb.failNext('profile');
  assert.equal((await letterRead(s.id)).ok, false);
  assert.equal(lettersMap().sent[0].rd, undefined, '읽음도 없던 일');
});

test('📮 변이 검사로 더함: 시계가 거꾸로 가도 이름표 at은 앞으로 · 답장 mon이 다르면 안 붙음 · 🌟는 꼭 14일째부터', () => {
  const { p, id } = sentProfile();
  letterReplyRule(p, [rep(235, id, 'again')], T0 + DAY * 2, LIST);
  letterReadRule(p, id, T0 + DAY * 2);
  const first = lettersOf(p.letters).sent[0].at;
  const s2 = letterSendRule(p, 235, `${GOOD} Again!`, T0 - DAY, LIST); // 기기 시계가 하루 뒤로
  assert.equal(s2.ok, true);
  assert.equal(s2.at, first + 1, '마지막 글보다 늘 크게');
  const q = sentProfile();
  assert.equal(letterReplyRule(q.p, [rep(213, q.id, 'star')], T0 + DAY * 2, LIST).why, 'none', '다른 편지 포켓몬의 답장은 그 글에 안 붙는다');
  assert.equal(q.p.caught[213], undefined);
  const L = { start: 1, seen: {}, sent: [], star: D0 };
  assert.deepEqual([starOpen(L, D0 + 13), starOpen(L, D0 + 14)], [false, true], '2주 = 14일');
});

test('📮 📤 잇기 — 보내기가 편지 목록을 모으고(getLetterTodo) · 올리는 순간마다 다시 만듦(LETTER_LIVE) · 📥 받기 이름표', () => {
  const u = readFileSync(new URL('../js/upload.js', import.meta.url), 'utf8');
  assert.ok(u.includes('files = await gatherFiles({ getLetterTodo: letterTodoNow, getMath, '));
  assert.ok(u.includes("const LETTER_LIVE = new Set(['letters/todo.md', 'letters/todo.json']);"));
  assert.ok(u.includes('const live = LETTER_LIVE.has(f.path) ? () => letterTextNow(f.path, today) : text;') && u.includes('text: live,'));
  assert.ok(u.includes("export const PRIVATE_LETTER_REPLIES = 'letters/replies.json';") && u.includes("[PRIVATE_LETTER_REPLIES]: '📮 편지 답장'"));
  assert.ok(u.includes('  const letters = getLetterTodo ? await getLetterTodo(today) : null;'), '프로필을 못 읽으면 던진다(빈 목록으로 덮지 않게)');
});
