// 📮 v360 (2026-10-28 아버님 — 기본안 「이대로」) — 고친 글(fix) 따라 읽기 → 🎁 선물 · 📒 편지 도감: node --test tests/letters360.test.js
// 답장에 fix가 있으면 붙을 때 선물을 안 주고, 진우가 문장마다 🎤 따라 읽은 뒤 letterOpenRule이 연다 · fix 없는 옛 꼴은 붙는 순간(그대로)
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  STAR_COINS, OK_COINS, LETTER_MAX, SAY_MAX, boxOf, lettersList, lettersOf, mergeLetters, letterNow, letterDot, stripText,
  letterStartRule, letterSeenRule, letterSendRule, checkLetterReplies, letterReplyRule, letterReadRule, letterOpenRule, giftWaits,
  fixLines, letterAlbum, letterStatusLine, letterTodoMd, giftLine,
} from '../js/letters.js';
import { dayNum } from '../js/korean.js';
import { emptyProfile } from '../js/db.js';
import { initProfile, flushProfile, reloadProfile, letterSend, letterApply, letterOpen, lettersMap, getProfileSnapshot } from '../js/xp.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const DATA = JSON.parse(readFileSync(new URL('../coach/english/letters.json', import.meta.url), 'utf8'));
const LIST = lettersList(DATA);
const DAY = 86400000;
const T0 = new Date(2026, 9, 28, 20).getTime();
const D0 = dayNum(T0);
/** 지어낸 답장 · 지어낸 고친 글 */
const GOOD = 'My favorit Pokemon is Greninja. It is a Water and Dark type. It can use Water Shuriken. It is very fast. I want to see you painting! Can you paint a Pikachu for me?';
const FIX = 'My favorite Pokemon is Greninja. It is a Water and Dark type. It can use Water Shuriken. It is very fast. I want to see your painting! Can you paint a Pikachu for me?';
const rep = (mon, id, grade, extra = {}) => ({ mon, id, grade, en: 'Wow, Greninja is so cool!', ko: '우와, 개굴닌자 멋지다!', ps: '', psKo: '', fix: FIX, ...extra });
function sentProfile(text = GOOD) {
  const p = { caught: {}, coins: 0, coinsEarned: 0, items: {}, partner: 25 };
  letterStartRule(p, T0);
  const r = letterSendRule(p, LIST[0].id, text, T0 + 1000, LIST);
  assert.equal(r.ok, true, '보내짐');
  return { p, id: r.id };
}

test('📮 답장 파일의 fix: 다듬어 받음 · 빈 글·글 아님·600자 넘음은 그 줄만 안 받음 · fix 없는 옛 줄은 그대로', () => {
  const { id } = sentProfile();
  const ok = checkLetterReplies([rep(235, id, 'good', { fix: `  ${FIX}\r\n  ` })], LIST);
  assert.equal(ok.good.length, 1);
  assert.equal(ok.good[0].fix, FIX);
  for (const fix of ['', '   ', 42, null, ['a'], 'a'.repeat(LETTER_MAX + 1)]) {
    const r = checkLetterReplies([rep(235, id, 'good', { fix })], LIST);
    assert.deepEqual([r.good.length, r.bad.length], [0, 1], JSON.stringify(fix).slice(0, 20));
    assert.match(r.bad[0].why, /fix/);
  }
  // 🎤 따라 읽을 영어 문장이 없거나 SAY_MAX를 넘으면 그 줄은 안 받는다 (🔍 Codex 164차 — 🎤 없이 열리거나 잘리지 않게) · ✉️는 따라 읽지 않으니 괜찮다
  for (const [fix, why] of [['123. 😀 !!!', /영어 문장이 없어요/], [Array.from({ length: SAY_MAX + 1 }, (_, i) => `I like cat ${i}.`).join(' '), /문장을 넘어요/]]) {
    const r = checkLetterReplies([rep(235, id, 'good', { fix })], LIST);
    assert.equal(r.good.length, 0);
    assert.match(r.bad[0].why, why);
  }
  assert.equal(checkLetterReplies([rep(235, id, 'again', { fix: '123.' })], LIST).good.length, 1, '✉️는 문장 수를 안 본다');
  assert.equal(checkLetterReplies([rep(235, id, 'ok', { fix: Array.from({ length: SAY_MAX }, (_, i) => `I like cat ${i}.`).join(' ') })], LIST).good.length, 1, 'SAY_MAX 문장까지는 받는다');
  const old = checkLetterReplies([{ mon: 235, id, grade: 'ok', en: 'Hi', ko: '안녕', ps: '', psKo: '' }], LIST);
  assert.deepEqual(old.good[0], { mon: 235, id, g: 'ok', en: 'Hi', ko: '안녕', ps: '', psKo: '' }, '옛 꼴은 fix 칸 없이 (같은 줄 겹침 견주기가 그대로)');
});

test('📮 fix가 있으면 붙을 때 선물 없음 → 🎤 따라 읽고 열면 그때 선물·읽음 · 두 번 안 열림 · 다음 편지는 연 다음 날', () => {
  const { p, id } = sentProfile();
  const r = letterReplyRule(p, [rep(235, id, 'good')], T0 + DAY, LIST);
  assert.equal(r.ok, true);
  assert.deepEqual(r.applied, [{ mon: 235, id, g: 'good', gift: null, later: true }]);
  assert.deepEqual([p.coins, p.items], [0, {}], '붙는 순간엔 선물 없음');
  let e = lettersOf(p.letters).sent[0];
  assert.equal(e.r.fix, FIX);
  assert.equal(e.r.gift, undefined);
  assert.equal(giftWaits(e), true);
  const st = letterNow(p.letters, p.caught, LIST, T0 + DAY);
  assert.deepEqual([st.kind, letterDot(st), stripText(st)], ['reply', true, '📮 루브도가 답장을 보냈어요!']);
  const o = letterOpenRule(p, id, T0 + DAY * 2, { n: 6, ok: 4 });
  const box = boxOf(id);
  assert.deepEqual([o.ok, o.fresh, o.gift], [true, true, box]);
  if (box.k === 'coins') assert.equal(p.coins, box.n); else assert.equal(p.items[box.id], box.n);
  e = lettersOf(p.letters).sent[0];
  assert.deepEqual([e.r.gift, e.r.say, e.rd], [box, { n: 6, ok: 4 }, T0 + DAY * 2]);
  assert.equal(giftWaits(e), false);
  const before = JSON.stringify([p.coins, p.items]);
  assert.deepEqual(letterOpenRule(p, id, T0 + DAY * 2 + 5, { n: 6, ok: 6 }), { ok: false, why: 'none' }, '두 번 안 열림');
  assert.equal(JSON.stringify([p.coins, p.items]), before, '선물은 한 번');
  assert.equal(letterReadRule(p, id, T0 + DAY * 3).why, 'none', '이미 읽음');
  assert.deepEqual(letterNow(p.letters, p.caught, LIST, T0 + DAY * 2), { kind: 'wait', from: D0 + 3 }, '연 다음 날 새 편지');
  assert.equal(letterNow(p.letters, p.caught, LIST, T0 + DAY * 3).mon, LIST[1].id);
  assert.equal(giftLine('good', o.gift, '루브도').includes('🎁'), true);
});

test('📮 🙂·🌟도 열 때: 🙂 💰10 · 🌟는 그 포켓몬(도감·처음이면 파트너) + 💰30 · 2주 안의 🌟는 연 때 보고 👍 상자로', () => {
  const a = sentProfile();
  letterReplyRule(a.p, [rep(235, a.id, 'ok')], T0 + DAY, LIST);
  assert.equal(a.p.coins, 0);
  assert.deepEqual(letterOpenRule(a.p, a.id, T0 + DAY, { n: 3, ok: 9 }).gift, { k: 'coins', n: OK_COINS });
  assert.deepEqual(lettersOf(a.p.letters).sent[0].r.say, { n: 3, ok: 3 }, '통과는 문장 수까지');
  assert.deepEqual([a.p.coins, a.p.coinsEarned], [OK_COINS, OK_COINS]);
  const b = sentProfile();
  b.p.partner = null;
  letterReplyRule(b.p, [rep(235, b.id, 'star')], T0 + DAY, LIST);
  assert.equal(b.p.caught[235], undefined, '붙는 순간엔 도감에 안 들어감');
  const ob = letterOpenRule(b.p, b.id, T0 + DAY * 2, { n: 6, ok: 6 });
  assert.deepEqual(ob.gift, { k: 'friend', mon: 235, n: STAR_COINS });
  assert.deepEqual([b.p.caught[235], b.p.partner, b.p.coins, lettersOf(b.p.letters).star], [1, 235, STAR_COINS, D0 + 2]);
  // 2주 안: 붙은 때는 🌟를 줄 수 있었어도 연 때 이미 다른 🌟를 받았으면 상자 (연 때 정한다)
  const c = sentProfile();
  letterReplyRule(c.p, [rep(235, c.id, 'star')], T0 + DAY, LIST);
  c.p.letters = { ...lettersOf(c.p.letters), star: D0 + 1 };
  const oc = letterOpenRule(c.p, c.id, T0 + DAY * 3, { n: 1, ok: 0 });
  assert.deepEqual(oc.gift, { ...boxOf(c.id), from: 'star' });
  assert.equal(c.p.caught[235], undefined);
});

test('📮 ✉️ 다시 쓰기는 fix가 있어도 기다리지 않음(선물 없음 · 읽기는 그대로) · fix 없는 옛 꼴은 붙는 순간 선물 → 열어도 또 안 줌', () => {
  const a = sentProfile();
  assert.deepEqual(letterReplyRule(a.p, [rep(235, a.id, 'again')], T0 + DAY, LIST).applied, [{ mon: 235, id: a.id, g: 'again', gift: null }], '기다리는 선물이 아님(later 없음)');
  const ea = lettersOf(a.p.letters).sent[0];
  assert.deepEqual([giftWaits(ea), ea.r.fix, a.p.coins], [false, FIX, 0]);
  assert.equal(letterReadRule(a.p, a.id, T0 + DAY).ok, true);
  assert.equal(letterNow(a.p.letters, a.p.caught, LIST, T0 + DAY).again, true, '같은 편지에 바로 다시');
  const b = sentProfile();
  const { fix: _f, ...noFix } = rep(235, b.id, 'ok');
  letterReplyRule(b.p, [noFix], T0 + DAY, LIST);
  assert.equal(b.p.coins, OK_COINS, '옛 꼴은 붙는 순간');
  const eb = lettersOf(b.p.letters).sent[0];
  assert.equal(giftWaits(eb), false);
  const o = letterOpenRule(b.p, b.id, T0 + DAY, { n: 2, ok: 1 });
  assert.deepEqual([o.ok, o.fresh, o.gift], [true, false, { k: 'coins', n: OK_COINS }]);
  assert.equal(b.p.coins, OK_COINS, '또 안 줌');
});

test('📮 병합: 연 사본(선물·읽음)과 안 연 사본(먼저 붙음)을 합치면 연 쪽 — 두 차례 모두 · 선물 칸이 사라지지 않는다', () => {
  const { p, id } = sentProfile();
  const A = structuredClone(p);
  const B = structuredClone(p);
  letterReplyRule(B, [rep(235, id, 'good')], T0 + DAY, LIST);         // B가 먼저 붙임(열지 않음)
  letterReplyRule(A, [rep(235, id, 'good')], T0 + DAY + 5000, LIST);  // A가 나중에 붙이고 열었다
  letterOpenRule(A, id, T0 + DAY * 2, { n: 6, ok: 5 });
  for (const [x, y] of [[A.letters, B.letters], [B.letters, A.letters]]) {
    const e = mergeLetters(x, y).sent[0];
    assert.deepEqual([e.r.gift, e.rd, e.r.say], [boxOf(id), T0 + DAY * 2, { n: 6, ok: 5 }]);
    assert.equal(giftWaits(e), false, '합친 뒤 다시 열 수 없다(선물 두 번 없음)');
  }
});

test('📮 따라 읽을 문장: 줄·문장으로 · 영어 없는 조각 뺌 · SAY_MAX까지', () => {
  assert.deepEqual(fixLines(FIX), ['My favorite Pokemon is Greninja.', 'It is a Water and Dark type.', 'It can use Water Shuriken.', 'It is very fast.', 'I want to see your painting!', 'Can you paint a Pikachu for me?']);
  assert.deepEqual(fixLines('Hi!\n\nI like Mr. Mime... 123. 😀 Bye?'), ['Hi!', 'I like Mr.', 'Mime...', '😀 Bye?'], '숫자만인 조각은 뺌 · 문장 안 이모지는 그대로');
  assert.deepEqual(fixLines(''), []);
  assert.equal(fixLines(Array.from({ length: 30 }, (_, i) => `Line ${i}.`).join(' ')).length, SAY_MAX);
});

test('📒 편지 도감: 원고 차례 칸 · 못 본 편지는 empty(실루엣) · 연 편지·답장 중은 open · 읽은 끝난 답장은 done(마지막 등급) · ✉️만이면 open', () => {
  const none = letterAlbum(undefined, LIST);
  assert.equal(none.length, LIST.length);
  assert.deepEqual(none.slice(0, 2).map((x) => [x.no, x.mon, x.state, x.grade]), [[1, 235, 'empty', ''], [2, LIST[1].id, 'empty', '']]);
  const p = { caught: {}, coins: 0, items: {} };
  letterStartRule(p, T0);
  letterSeenRule(p, 235, T0, LIST);
  assert.equal(letterAlbum(p.letters, LIST)[0].state, 'open', '편지를 열어 봄');
  const s1 = letterSendRule(p, 235, GOOD, T0 + 1000, LIST);
  letterReplyRule(p, [rep(235, s1.id, 'again')], T0 + 2000, LIST);
  letterReadRule(p, s1.id, T0 + 3000);
  assert.equal(letterAlbum(p.letters, LIST)[0].state, 'open', '✉️ 다시 쓰기만');
  const s2 = letterSendRule(p, 235, `${GOOD} Thank you!`, T0 + 4000, LIST);
  letterReplyRule(p, [rep(235, s2.id, 'star')], T0 + 5000, LIST);
  assert.equal(letterAlbum(p.letters, LIST)[0].state, 'open', '답장이 붙었어도 아직 따라 읽기 전');
  letterOpenRule(p, s2.id, T0 + 6000, { n: 7, ok: 7 });
  const a = letterAlbum(p.letters, LIST)[0];
  assert.deepEqual([a.state, a.grade, a.entries.map((e) => e.id)], ['done', 'star', [s1.id, s2.id]]);
  assert.equal(letterAlbum(p.letters, LIST)[1].state, 'empty');
});

test('📤 지금 우체통 줄: 따라 읽기 전이면 그 말 · 연 뒤엔 🎤 마지막 따라 읽기 · todo.md 머리에 fix 칸과 판 안내', () => {
  const { p, id } = sentProfile();
  letterReplyRule(p, [rep(235, id, 'good')], T0 + DAY, LIST);
  const a = letterStatusLine(p.letters, p.caught, LIST, T0 + DAY);
  assert.ok(a.includes('루브도(Smeargle)의 답장 붙음(👍) — 진우가 아직 따라 읽지 않음(🎁 선물은 따라 읽은 뒤) · 읽은 다음 날 새 편지'), a);
  assert.ok(!a.includes('🎤 마지막'));
  letterOpenRule(p, id, T0 + DAY * 2, { n: 6, ok: 4 });
  const b = letterStatusLine(p.letters, p.caught, LIST, T0 + DAY * 2);
  assert.ok(b.endsWith('🎤 마지막 따라 읽기 루브도(Smeargle) 통과 4/6(2026-10-30)'), b);
  const md = letterTodoMd([], '2026-10-30', DATA.grades, b);
  assert.ok(md.includes('{ mon, id, grade(star·good·ok·again), en, ko, ps, psKo, fix }'));
  assert.ok(md.includes('📤 앱 판이 v360 전이면 올리지 말 것'));
  assert.ok(!md.includes('Greninja'), '진우 글은 상태 줄·머리에 없다');
});

// ── 저장소를 지나는 길 (가짜 IndexedDB) ──
async function seed(p) {
  await initProfile();
  await flushProfile();
  const cur = fakeIdb.get('profile', 'me') || emptyProfile();
  fakeIdb.put('profile', { ...cur, ...p, id: 'me', updatedAt: (cur.updatedAt || 0) + 1 });
  await reloadProfile();
}

test('📮 트랜잭션: 붙이기는 선물 없이 · letterOpen이 선물·읽음을 저장 · 저장 실패면 없던 일 · 두 번 눌러도 한 번', async () => {
  const now = Date.now();
  await seed({ coins: 5, coinsEarned: 5, caught: {}, items: {}, partner: 25, letters: { start: dayNum(now) - 1, seen: {}, sent: [], star: 0 } });
  const s = await letterSend(235, GOOD, LIST);
  assert.equal(s.ok, true);
  assert.equal((await letterApply([rep(235, s.id, 'ok')], LIST)).ok, true);
  assert.equal(fakeIdb.get('profile', 'me').coins, 5, '붙어도 선물 없음');
  fakeIdb.failNext('profile');
  assert.equal((await letterOpen(s.id, { n: 6, ok: 3 })).ok, false, '저장이 안 되면');
  assert.equal(fakeIdb.get('profile', 'me').coins, 5);
  assert.equal(lettersMap().sent[0].rd, undefined, '읽음도 아님 — 다시 누를 수 있다');
  const [x, y] = await Promise.all([letterOpen(s.id, { n: 6, ok: 3 }), letterOpen(s.id, { n: 6, ok: 3 })]);
  assert.deepEqual([x.ok, y.ok, y.why].sort(), [false, true, 'none'].sort());
  const st = fakeIdb.get('profile', 'me');
  assert.equal(st.coins, 5 + OK_COINS, '선물은 한 번');
  assert.deepEqual(st.letters.sent[0].r.say, { n: 6, ok: 3 });
  assert.equal(getProfileSnapshot().coins, 5 + OK_COINS, '창의 프로필도');
});

test('📮 배선: 우체통은 선물을 기다리는 답장에 따라 읽기 · 🎤 없이 못 넘김 · 화면 꺼짐·떠남에 멈춤 · 📒 도감 단추 · sw v360', () => {
  const v = read('js/lettersview.js');
  assert.ok(v.includes('if (waits) { box.appendChild(sayEl(st)); return box; }'));
  assert.ok(v.includes('next.hidden = end || !(pass[i] || tries >= SAY_TRIES);'), '통과했거나 3번 해 봐야 다음');
  assert.ok(v.includes("if (tok !== S.sayTok || !res || res.method === 'interrupted' || res.method === 'cancelled') { msg.textContent = ''; paint(); return; }"), '꺼짐·취소는 해 본 것이 아님 · 같은 화면이면 단추를 다시 켬(Codex 164차)');
  const mic = v.slice(v.indexOf("mic.addEventListener('click'"), v.indexOf("next.addEventListener('click'"));
  assert.ok(mic.indexOf('if (!wrap.isConnected) return;') < mic.indexOf('busy = false;') && mic.indexOf('busy = false;') < mic.indexOf('if (tok !== S.sayTok ||'), '꺼짐으로 토큰이 바뀌어도 busy를 먼저 푼다');
  assert.ok(!mic.includes('if (tok !== S.sayTok || !wrap.isConnected) return;'), '옛 줄(단추가 잠긴 채 남음) 없음');
  // 🔊 읽어 주기는 듣던 🎤를 멈추고 · 떠남·꺼짐엔 마이크를 놓는다 (Codex 164차)
  const paper = v.slice(v.indexOf('function paperEl('), v.indexOf('const letterLines'));
  assert.ok(paper.indexOf('stopSpeak();') > 0 && paper.indexOf('stopSpeak();') < paper.indexOf('const tok = ++S.readTok;'));
  assert.ok(/export function leaveLetters\(\) \{[^}]*stopSpeak\(\);[^\n]*\n\s*freeMic\(\);/.test(v));
  assert.ok(v.includes("document.addEventListener('visibilitychange', () => { if (document.hidden) { stopSpeak(); freeMic(); } });"));
  assert.ok(v.includes('S.micUsed = true;') && /function freeMic\(\) \{\s*if \(!S\.micUsed\) return;\s*S\.micUsed = false;\s*try \{ releaseMic\(\); \}/.test(v), '우체통에서 쓴 마이크만 놓는다');
  assert.ok(v.includes('res = await letterOpen(e.id, { n: lines.length, ok: pass.filter(Boolean).length });'));
  assert.ok(/export function leaveLetters\(\) \{[^}]*stopSpeak\(\);/.test(v));
  assert.ok(v.includes('main.appendChild(albumBtn());') && v.includes('if (S.album) { main.appendChild(albumEl()); return; }'));
  assert.ok(v.includes(".lt-card.is-empty img") === false && read('css/style.css').includes('.lt-card.is-empty img { filter: brightness(0); opacity: .2; }'), '빈 칸은 실루엣');
  assert.ok(!v.includes('지난 편지'), '📬 지난 편지는 도감으로');
  // 아이 화면에 셈 글 없음 — 몇 번·몇 개 남음을 쓰지 않는다
  const say = v.slice(v.indexOf('function sayEl('), v.indexOf('function artInto('));
  assert.ok(!/\$\{(tries|SAY_TRIES|lines\.length|i \+ 1)\}/.test(say));
  assert.ok(read('sw.js').includes("CACHE_VERSION = 'v360'"));
  assert.ok(read('js/xp.js').includes('return houseDo((p) => letterOpenRule(p, id, Date.now(), say));'));
});

test('🔒 비공개 검사(check.mjs --private)가 📮 편지 답장도 본다 — 앱이 받을 때와 같은 검사(fix·문장 수) (🔍 Codex 164차)', async () => {
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { checkPrivateDir, PRIVATE_FILES } = await import('../tools/privcheck.mjs');
  assert.ok(PRIVATE_FILES.includes('letters/replies.json'));
  const dir = mkdtempSync(join(tmpdir(), 'lt360-'));
  try {
    mkdirSync(join(dir, 'letters'));
    const { id } = sentProfile();
    writeFileSync(join(dir, 'letters', 'replies.json'), JSON.stringify([rep(235, id, 'good')]));
    assert.deepEqual(checkPrivateDir(dir, () => '<svg>'), { errors: [], checked: ['letters/replies.json'] });
    writeFileSync(join(dir, 'letters', 'replies.json'), JSON.stringify([rep(235, id, 'good', { fix: '' }), rep(999, id, 'ok')]));
    const e = checkPrivateDir(dir, () => '<svg>').errors;
    assert.equal(e.length, 2, e.join('\n'));
    assert.ok(e[0].includes('letters/replies.json[0]') && e[0].includes('fix'));
    assert.ok(e[1].includes('[1]') && e[1].includes('편지 포켓몬'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
