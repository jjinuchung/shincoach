// v357 📮 지금 우체통 한 줄 (2026-10-28 아버님 「이대로 진행」) — 📤 letters/todo.md 머리에 처음 연 날·지금 편지·띠 글·끝난 편지·🌟
// 진우가 「편지 언제 와?」라고 물었을 때 처음 연 날이 안 올라와 첫 편지가 왔는지 기록으로 몰랐다 → 아빠·Claude 쪽에만 한 줄 (아이 화면은 그대로)
// node --test tests/letterstatus357.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  lettersList, letterStartRule, letterSeenRule, letterSendRule, letterReplyRule, letterReadRule,
  letterTodo, letterTodoMd, letterStatusLine, letterNow, mergeLetters,
} from '../js/letters.js';
import { dayNum } from '../js/korean.js';

const DATA = JSON.parse(readFileSync(new URL('../coach/english/letters.json', import.meta.url), 'utf8'));
const LIST = lettersList(DATA);
const DAY = 86400000;
const T0 = new Date(2026, 9, 28, 10).getTime(); // 2026-10-28 (기기 날짜)
/** 봉투가 차는 답장 (지어낸 글) */
const GOOD = 'My favorite Pokemon is Greninja. It is a Water and Dark type. It can use Water Shuriken. It is very fast. I want to see your painting! Can you paint a Pikachu for me?';
const rep = (mon, id, grade) => ({ mon, id, grade, en: 'Wow, Greninja is so cool!', ko: '우와, 개굴닌자 멋지다!', ps: '', psKo: '' });
const fresh = () => ({ caught: {}, coins: 0, coinsEarned: 0, items: {} });
/** 판을 T0에 열고 첫 편지(루브도)에 at에 답장을 보낸 프로필 */
function sent(at) {
  const p = fresh();
  letterStartRule(p, T0);
  const r = letterSendRule(p, LIST[0].id, GOOD, at, LIST);
  assert.equal(r.ok, true, '보내짐');
  return { p, id: r.id };
}

test('📮 지금 우체통: 판을 안 열었으면 그 말만 (원고가 있든 없든)', () => {
  const s = letterStatusLine(undefined, {}, LIST, T0);
  assert.equal(s, '📮 지금 우체통 — 판을 아직 안 엶 · 영어 영상 목록을 처음 연 날 바로 첫 편지');
  assert.equal(letterStatusLine({ start: 0, seen: {}, sent: [], star: 0 }, {}, [], T0), s);
});

test('📮 지금 우체통: 판 연 날 = 새 편지(v358) → 열어 봄 → 답장 보냄 → 답장 붙음 → 읽음 → 다음 편지 날(달이 바뀌어도)', () => {
  assert.deepEqual([LIST[0].id, LIST[0].ko, LIST[1].id, LIST[1].ko], [235, '루브도', 213, '단단지'], '원고 차례');
  const p = fresh();
  letterStartRule(p, T0);
  const line = (t) => letterStatusLine(p.letters, p.caught, LIST, t);
  let s = line(T0);
  assert.equal(s, '📮 지금 우체통 — 판 연 날 2026-10-28 · 지금: 루브도(Smeargle)의 편지가 와 있음 · 아직 안 엶 · 띠 「📮 루브도에게서 편지가 왔어요!」 · 끝난 편지 0통 · 🌟 아직 없음(지금 줄 수 있음)');
  s = line(T0 - DAY);
  assert.ok(s.includes('지금: 다음 편지는 2026-10-28부터 · 띠 「📮 우체통 — 새 편지는 곧 와요」'), `시계가 뒤면 판 연 날까지 — ${s}`);
  s = line(T0 + DAY);
  assert.ok(s.includes('지금: 루브도(Smeargle)의 편지가 와 있음 · 아직 안 엶 · 띠 「📮 루브도에게서 편지가 왔어요!」'), s);
  assert.equal(letterSeenRule(p, 235, T0 + DAY, LIST).ok, true);
  s = line(T0 + DAY * 2);
  assert.ok(s.includes('지금: 루브도(Smeargle)의 편지가 와 있음 · 2026-10-29에 열어 봄 · 답장 아직 · 띠 「📮 루브도의 편지 — 답장을 써 볼까요?」'), s);
  const r = letterSendRule(p, 235, GOOD, T0 + DAY * 2, LIST);
  assert.equal(r.ok, true);
  s = line(T0 + DAY * 3);
  assert.ok(s.includes('지금: 루브도(Smeargle)에게 답장 보냄(2026-10-30) — 판단 기다림(아래) · 띠 「✉️ 루브도가 답장을 쓰고 있어요」'), `다음 날 봐도 보낸 날 — ${s}`);
  assert.ok(!s.includes('Greninja') && !s.includes('favorite'), '진우 글은 상태 줄에 안 넣는다(글은 아래 목록에)');
  assert.equal(letterReplyRule(p, [rep(235, r.id, 'ok')], T0 + DAY * 3, LIST).ok, true);
  s = line(T0 + DAY * 3);
  assert.ok(s.includes('지금: 루브도(Smeargle)의 답장 붙음(🙂) — 진우가 아직 안 읽음 · 읽은 다음 날 새 편지 · 띠 「📮 루브도가 답장을 보냈어요!」'), s);
  assert.ok(s.includes('끝난 편지 1통'), s);
  assert.equal(letterReadRule(p, r.id, T0 + DAY * 4).ok, true);
  s = line(T0 + DAY * 4);
  assert.ok(s.includes('지금: 다음 편지는 2026-11-02부터'), `11-01에 읽으면 11-02 — ${s}`);
  s = line(T0 + DAY * 5);
  assert.ok(s.includes('지금: 단단지(Shuckle)의 편지가 와 있음 · 아직 안 엶'), s);
  assert.ok(s.startsWith('📮 지금 우체통 — 판 연 날 2026-10-28 · '), '판 연 날은 그대로');
});

test('📮 지금 우체통: ✉️ 다시 쓰기 — 붙은 뒤 「읽으면 같은 편지에」 · 읽으면 기다리지 않고 같은 편지 · 끝난 편지로 안 셈', () => {
  const { p, id } = sent(T0 + DAY);
  letterReplyRule(p, [rep(235, id, 'again')], T0 + DAY * 2, LIST);
  let s = letterStatusLine(p.letters, p.caught, LIST, T0 + DAY * 2);
  assert.ok(s.includes('루브도(Smeargle)의 답장 붙음(✉️) — 진우가 아직 안 읽음 · 읽으면 루브도(Smeargle)의 같은 편지에 다시 쓸 차례'), s);
  assert.ok(s.includes('끝난 편지 0통'), s);
  letterReadRule(p, id, T0 + DAY * 2);
  s = letterStatusLine(p.letters, p.caught, LIST, T0 + DAY * 2);
  assert.ok(s.includes('지금: ✉️ 다시 쓰기 — 루브도(Smeargle)의 같은 편지에 다시 쓸 차례(기다리지 않음) · 띠 「📮 루브도에게 다시 써 볼까요?」'), s);
  assert.ok(s.includes('끝난 편지 0통'), s);
});

test('📮 지금 우체통: 🌟 마지막 날 · 2주 안이면 다음 🌟 날 · 2주가 차면 지금 줄 수 있음', () => {
  const { p, id } = sent(T0 + DAY);
  const g = letterReplyRule(p, [rep(235, id, 'star')], T0 + DAY * 3, LIST);
  assert.equal(g.applied[0].gift.k, 'friend', '🌟 그 포켓몬');
  const at = (n) => letterStatusLine(p.letters, p.caught, LIST, T0 + DAY * n);
  assert.ok(at(3).endsWith('끝난 편지 1통 · 🌟 마지막 2026-10-31 · 다음 🌟 2026-11-14부터'), at(3));
  assert.ok(at(16).endsWith('다음 🌟 2026-11-14부터'), '11-13은 아직');
  assert.ok(at(17).endsWith('🌟 마지막 2026-10-31 · 다음 🌟 지금 줄 수 있음'), at(17));
});

test('📮 지금 우체통: 편지 포켓몬을 모두 만났으면 「남은 편지 없음」', () => {
  const p = fresh();
  letterStartRule(p, T0);
  p.caught = Object.fromEntries(LIST.map((x) => [x.id, 1]));
  const s = letterStatusLine(p.letters, p.caught, LIST, T0 + DAY);
  assert.ok(s.includes('지금: 남은 편지 없음(편지 포켓몬이 모두 끝났거나 도감에 있음) · 띠 「📮 우체통」'), s);
});

test('📮 지금 우체통: 원고를 못 받으면 「모름」 — 「남은 편지 없음」으로 읽지 않는다 · 띠 글도 안 씀', () => {
  const p = fresh();
  letterStartRule(p, T0);
  for (const list of [[], null, undefined]) {
    const s = letterStatusLine(p.letters, p.caught, list, T0 + DAY);
    assert.equal(s, '📮 지금 우체통 — 판 연 날 2026-10-28 · 지금: 원고를 못 받아 지금 편지는 모름 · 끝난 편지 0통 · 🌟 아직 없음(지금 줄 수 있음)');
  }
  const { p: q } = sent(T0 + DAY);
  assert.ok(letterStatusLine(q.letters, q.caught, [], T0 + DAY).includes('지금: 원고를 못 받아 지금 편지는 모름'), '보낸 글이 있어도');
});

// ── 🔍 Codex 162차 #1·#2 — 안 읽은 답장의 「다음 차례」는 읽었다고 치고 letterNow를 다시 불러 본 결과 ──
/** 답장이 붙어 아직 안 읽은 상태 줄과, 그 답장을 읽은 다음 날의 실제 우체통 */
function unreadThenRead(p, id, at) {
  const line = letterStatusLine(p.letters, p.caught, LIST, at);
  const q = JSON.parse(JSON.stringify(p));
  letterReadRule(q, id, at);
  return { line, after: letterNow(q.letters, q.caught, LIST, at + DAY) };
}

test('📮 162 #1: 마지막 남은 편지에 답장이 붙으면 「읽으면 남은 편지 없음」 — 읽은 다음 날 실제로도 none', () => {
  const { p, id } = sent(T0 + DAY);
  p.caught = Object.fromEntries(LIST.slice(1).map((x) => [x.id, 1])); // 나머지 29마리는 다른 기기 병합으로 도감에
  letterReplyRule(p, [rep(235, id, 'ok')], T0 + DAY * 2, LIST);
  const { line, after } = unreadThenRead(p, id, T0 + DAY * 2);
  assert.ok(line.includes('루브도(Smeargle)의 답장 붙음(🙂) — 진우가 아직 안 읽음 · 읽으면 남은 편지 없음 · '), line);
  assert.ok(!line.includes('새 편지'), line);
  assert.equal(after.kind, 'none');
});

test('📮 162 #1: 상태 줄을 만들어도 장부는 그대로(읽었다고 치기는 복사본에만)', () => {
  const { p, id } = sent(T0 + DAY);
  letterReplyRule(p, [rep(235, id, 'ok')], T0 + DAY * 2, LIST);
  const before = JSON.stringify(p);
  letterStatusLine(p.letters, p.caught, LIST, T0 + DAY * 2);
  assert.equal(JSON.stringify(p), before);
  assert.equal(p.letters.sent[0].rd, undefined, '아직 안 읽음');
});

test('📮 162 #1: 원고에서 빠진 포켓몬의 ✉️ 답장 — 「같은 편지에 다시」라고 안 함 · 실제 다음 편지를 씀', () => {
  const { p, id } = sent(T0 + DAY);
  letterReplyRule(p, [rep(235, id, 'again')], T0 + DAY * 2, LIST);
  const list = LIST.slice(1); // 루브도 편지가 원고에서 빠졌다
  const s = letterStatusLine(p.letters, p.caught, list, T0 + DAY * 2);
  assert.ok(s.includes('지금: mon 235의 답장 붙음(✉️) — 진우가 아직 안 읽음 · 읽으면 단단지(Shuckle)의 편지 · '), s);
  assert.ok(!s.includes('다시 쓸'), s);
  const q = JSON.parse(JSON.stringify(p));
  letterReadRule(q, id, T0 + DAY * 2);
  const a = letterNow(q.letters, q.caught, list, T0 + DAY * 2);
  assert.deepEqual([a.kind, a.mon, a.again], ['letter', 213, false], '실제로도 단단지 편지');
});

test('📮 162 #1: 다른 기기에서 다시 보낸 글이 기다리면 「읽으면 다음은 … 판단 기다림」', () => {
  const raw = {
    start: dayNum(T0), seen: {}, star: 0,
    sent: [
      { mon: 235, at: T0 + DAY, text: GOOD, r: { g: 'again', en: 'Please write again!', ko: '다시 써 줘!', at: T0 + DAY * 2 } },
      { mon: 235, at: T0 + DAY * 3, text: `${GOOD} It is my best friend.` },
    ],
  };
  const s = letterStatusLine(raw, {}, LIST, T0 + DAY * 3);
  assert.ok(s.includes('루브도(Smeargle)의 답장 붙음(✉️) — 진우가 아직 안 읽음 · 읽으면 다음은 루브도(Smeargle)에게 보낸 답장(판단 기다림)'), s);
});

test('📮 162 #1: 시계가 뒤로 갔으면(앞날에 읽은 끝난 글) 「다음 날」 대신 그 날짜', () => {
  const raw = {
    start: dayNum(T0), seen: {}, star: 0,
    sent: [
      { mon: 235, at: T0 + DAY, text: GOOD, r: { g: 'ok', en: 'Thanks!', ko: '고마워!', at: T0 + DAY * 2 }, rd: T0 + DAY * 5 }, // 11-02에 읽음(그때 기기 시계)
      { mon: 213, at: T0 + DAY * 2, text: `${GOOD} Two.`, r: { g: 'ok', en: 'Thanks!', ko: '고마워!', at: T0 + DAY * 2 + 1000 } },
    ],
  };
  const s = letterStatusLine(raw, {}, LIST, T0 + DAY * 2);
  assert.ok(s.includes('단단지(Shuckle)의 답장 붙음(🙂) — 진우가 아직 안 읽음 · 읽으면 2026-11-03부터 새 편지'), s);
});

test('📮 162 #2: ✉️ → 다시 보냄 → 🙂 → 읽음 — 다음 편지 날은 🙂 답장을 읽은 다음 날', () => {
  const { p, id } = sent(T0 + DAY); // 10-29 보냄
  letterReplyRule(p, [rep(235, id, 'again')], T0 + DAY * 2, LIST);
  letterReadRule(p, id, T0 + DAY * 2); // 10-30 ✉️ 읽음
  const r2 = letterSendRule(p, 235, `${GOOD} It is my best friend.`, T0 + DAY * 3, LIST); // 10-31 다시 보냄
  assert.equal(r2.ok, true);
  letterReplyRule(p, [rep(235, r2.id, 'ok')], T0 + DAY * 4, LIST); // 11-01 🙂
  const { line } = unreadThenRead(p, r2.id, T0 + DAY * 4);
  assert.ok(line.includes('루브도(Smeargle)의 답장 붙음(🙂) — 진우가 아직 안 읽음 · 읽은 다음 날 새 편지'), line);
  assert.ok(line.includes('끝난 편지 1통'), line);
  letterReadRule(p, r2.id, T0 + DAY * 5); // 11-02 읽음
  const s = letterStatusLine(p.letters, p.caught, LIST, T0 + DAY * 5);
  assert.ok(s.includes('지금: 다음 편지는 2026-11-03부터'), s);
});

test('📮 162 #2: 끝난 글이 많아 정리돼도·두 사본을 합쳐도 끝난 편지 수 그대로 · 같은 날 시각만 바뀌면 줄 같음', () => {
  const sentAll = [];
  LIST.forEach((x, i) => {
    for (let k = 0; k < 5; k++) {
      const at = T0 - DAY * 200 + (i * 5 + k) * 3600000;
      sentAll.push({ mon: x.id, at, text: `${GOOD} ${k}`, r: { g: 'ok', en: 'Thanks!', ko: '고마워!', at: at + 1000 }, rd: at + 2000 });
    }
  });
  const raw = { start: dayNum(T0) - 201, seen: {}, sent: sentAll, star: 0 };
  assert.equal(sentAll.length, 150, '정리 상한(120)을 넘김');
  const s = letterStatusLine(raw, {}, LIST, T0);
  assert.ok(s.includes('지금: 남은 편지 없음') && s.includes('끝난 편지 30통'), s);
  const half = { ...raw, sent: sentAll.slice(0, 80) };
  for (const m of [mergeLetters(raw, half), mergeLetters(half, raw)]) {
    assert.ok(letterStatusLine(m, {}, LIST, T0).includes('끝난 편지 30통'), '합쳐도 30');
  }
  const { p } = sent(T0 + DAY);
  assert.equal(letterStatusLine(p.letters, p.caught, LIST, T0 + DAY), letterStatusLine(p.letters, p.caught, LIST, T0 + DAY + 5 * 3600000), '같은 날 시각만 다르면 같은 줄(쓸데없이 다시 올리지 않게)');
});

test('📮 📤 todo.md: 상태 줄은 머리 바로 아래 · 없으면 옛 꼴 그대로 · todo.json은 그대로', () => {
  const { p } = sent(T0 + DAY);
  const todo = letterTodo(p.letters, LIST, T0 + DAY);
  const status = letterStatusLine(p.letters, p.caught, LIST, T0 + DAY);
  const md = letterTodoMd(todo, '2026-10-29', DATA.grades, status).split('\n');
  assert.ok(md[0].startsWith('📮 진우의 포켓몬 편지 답장 — 판단 기다리는 글 1개 (2026-10-29)'), md[0]);
  assert.equal(md[1], status);
  assert.ok(md[2].startsWith('답장은 letters/replies.json에'), md[2]);
  const old = letterTodoMd(todo, '2026-10-29', DATA.grades).split('\n');
  assert.ok(old[1].startsWith('답장은 letters/replies.json에'), '상태 줄이 없으면 옛 꼴');
  assert.deepEqual(md.slice(2), old.slice(1), '나머지는 같다');
  assert.equal(letterTodoMd(todo, '2026-10-29', DATA.grades, '').split('\n')[1], old[1], '빈 줄은 안 넣는다');
  assert.ok(!Object.keys(todo[0]).includes('status'), 'todo.json 꼴 그대로');
});

test('📮 📤 잇기: 올릴 때 이 기기 프로필의 편지·도감·원고로 상태 줄을 만들어 todo.md에 · v357', () => {
  const u = readFileSync(new URL('../js/upload.js', import.meta.url), 'utf8');
  const body = u.slice(u.indexOf('async function letterTodoNow('), u.indexOf('async function korReportNow('));
  assert.ok(body.includes('const todo = lt.letterTodo(p && p.letters, list, now);'), body);
  assert.ok(body.includes('lt.letterTodoMd(todo, today, data && data.grades, lt.letterStatusLine(p && p.letters, p && p.caught, list, now))'), body);
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  const ver = readFileSync(new URL('../js/version.js', import.meta.url), 'utf8');
  const n = Number((/const CACHE_VERSION = 'v(\d+)';/.exec(sw) || [])[1]);
  assert.ok(n >= 357 && ver.includes(`export const APP_VERSION = 'v${n}';`), '판 v357 이상 · sw와 같게');
});
