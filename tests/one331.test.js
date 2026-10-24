// v331 (2026-10-24 아버님 "이대로") — 🧩 국어 글 끝 화면의 「퍼즐 하나」
// 까닭: 🧩 퍼즐 탭은 따로 찾아 들어가야 해서 새 퍼즐 꼴 셋(🔗 앞뒤 어울리기 · ⚖️ 겪은 일·생각 · ⏰ 일어난 차례)이 잘 안 풀린다 ·
//   글 끝 화면에서 꺼낸 🔤 낱말 이어 주기는 잘 눌린다 → 국어 글을 다 읽은 화면에 세 꼴 가운데 퍼즐 하나를 꺼내 준다
//   (안 해 본 꼴 먼저 · 하루 한 꼴 → 다시 볼 차례 → 새 퍼즐 · 하루 셋까지 · 보상은 오늘의 퍼즐과 하루 한 번을 나눔 · 🟩는 판에서만)
// node --test tests/one331.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  allPuzzles, pickOne, oneSessions, oneDoneCount, oneKey, ONE_KINDS, ONE_PER_DAY, ONE_DAY_LISTS, PUZZLE_DAY_LISTS, KIND_LIST, SOLVED,
  korPuzzleRule, puzzleFinishText, puzzleTodayLine, PUZZLE_COINS, planPuzzles, kindsNewToday,
} from '../js/korpuzzle.js';
import { dayNum, KOR_STONE } from '../js/korean.js';
import { mergeDailyDelta, emptyDaily } from '../js/db.js';
import { korReportFromRaw } from '../js/korreport.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const DATA = JSON.parse(read('coach/korean/puzzles.json'));
const CARDS = JSON.parse(read('coach/korean/reading.json')).cards;
const LIST = allPuzzles(DATA, CARDS);
const T0 = new Date(2026, 9, 24, 9).getTime();
const D0 = dayNum(T0);
const DAY = 86400000;
const ids = (kind) => LIST.filter((p) => p.kind === kind).map((p) => p.id);
/** 진우와 같은 꼴 — 차례·사실·의견·글에 있나요만 오래전에 해 봄 */
const old = () => Object.fromEntries([...ids('order').slice(0, 5), ...ids('sort').slice(0, 5), ...ids('intext').slice(0, 2)].map((id, i) => [id, { box: SOLVED, due: 0, at: T0 - 30 * DAY + i, miss: 0, d0: D0 - 30 }]));
const wrong = (now) => ({ box: 0, due: dayNum(now) + 1, at: now, miss: 1, d0: dayNum(now) });
const right = (now) => ({ box: SOLVED, due: 0, at: now, miss: 0, d0: dayNum(now) });

test('🧩 꺼낼 꼴 — 🔗·⚖️ 겪은 일·⏰ (원고 꼴 차례) · 셋 다 원고가 있고 늘 열린다 · 하루 셋 · 기록 칸은 판 기록과 따로', () => {
  assert.deepEqual(ONE_KINDS, ['agree', 'exp', 'time']);
  assert.deepEqual(ONE_KINDS, KIND_LIST.filter((k) => ONE_KINDS.includes(k)), 'KIND_LIST 차례 그대로');
  for (const k of ONE_KINDS) assert.ok(ids(k).length >= 10, `${k} 원고`);
  assert.equal(ONE_PER_DAY, 3);
  assert.deepEqual(ONE_DAY_LISTS, ['korPzOneStarts', 'korPzOneDone']);
  assert.ok(!ONE_DAY_LISTS.some((k) => PUZZLE_DAY_LISTS.includes(k)), '오늘의 퍼즐 판 기록과 겹치지 않는다');
  assert.equal(oneKey(123, 'time'), '123:time');
});

test('🧩 pickOne — 진우와 같은 상태: 첫날 🔗 첫 퍼즐 → 같은 날은 다른 새 꼴을 안 들인다(하루 한 꼴) → 다음 날 ⚖️ 겪은 일 → 그다음 ⏰', () => {
  const st = old();
  const a1 = pickOne(LIST, st, T0);
  assert.deepEqual(a1, { id: ids('agree')[0], kind: 'agree' }, '안 해 본 꼴 먼저 — 원고 꼴 차례');
  st[a1.id] = wrong(T0); // 틀림 — 내일 다시
  const a2 = pickOne(LIST, st, T0 + 60000);
  assert.deepEqual(a2, { id: ids('agree')[1], kind: 'agree' }, '같은 날은 새 꼴 없이 — 틀린 것은 내일, 🔗 새 퍼즐');
  st[a2.id] = right(T0 + 60000);
  const b1 = pickOne(LIST, st, T0 + DAY);
  assert.deepEqual(b1, { id: ids('exp')[0], kind: 'exp' }, '다음 날 — 안 해 본 꼴이 다시 볼 차례보다 먼저');
  st[b1.id] = right(T0 + DAY);
  const b2 = pickOne(LIST, st, T0 + DAY + 60000);
  assert.deepEqual(b2, { id: ids('agree')[0], kind: 'agree' }, '그다음 — 틀린 다음 날부터 다시 볼 차례');
  st[b2.id] = right(T0 + DAY + 60000);
  const c1 = pickOne(LIST, st, T0 + 2 * DAY);
  assert.deepEqual(c1, { id: ids('time')[0], kind: 'time' }, '사흘째 ⏰');
});

test('🧩 pickOne — 오늘의 퍼즐 판에서 오늘 들인 꼴도 센다 · d0가 없는 옛 칸은 오늘로 안 본다 · 아무 꼴도 안 해 본 기기는 🔗부터', () => {
  const st = old();
  st[ids('time')[0]] = wrong(T0); // 판에서 오늘 ⏰를 처음 해 봄
  const p = pickOne(LIST, st, T0 + 1000);
  assert.equal(p.kind, 'time', '오늘 새 꼴을 이미 들였다 — 🔗·⚖️는 내일 · 해 본 ⏰의 새 퍼즐');
  assert.equal(p.id, ids('time')[1]);
  const st2 = old();
  st2[ids('time')[0]] = { box: 0, due: D0, at: T0 - DAY, miss: 1 }; // d0 없음(옛 기록)
  assert.equal(pickOne(LIST, st2, T0).kind, 'agree', 'd0가 없으면 오늘 들인 꼴로 안 센다');
  assert.deepEqual(pickOne(LIST, {}, T0), { id: ids('agree')[0], kind: 'agree' });
  assert.deepEqual(pickOne(LIST, null, T0), { id: ids('agree')[0], kind: 'agree' });
});

test('🧩 pickOne — 다시 볼 것은 오래된 차례부터 · 새 퍼즐은 오래 안 한 꼴부터(꼴이 번갈아) · ⭐는 안 낸다 · 다 ⭐면 null · 다른 꼴은 안 낸다', () => {
  const st = old();
  ids('agree').slice(0, 2).forEach((id, i) => { st[id] = right(T0 - 5 * DAY + i); });
  ids('exp').slice(0, 2).forEach((id, i) => { st[id] = right(T0 - 9 * DAY + i); });
  ids('time').slice(0, 2).forEach((id, i) => { st[id] = right(T0 - 2 * DAY + i); });
  assert.deepEqual(pickOne(LIST, st, T0), { id: ids('exp')[2], kind: 'exp' }, '가장 오래 안 한 꼴(⚖️ 겪은 일)의 새 퍼즐');
  st[ids('time')[1]] = { box: 0, due: D0 - 1, at: T0 - 2 * DAY + 1, miss: 1, d0: D0 - 2 };
  st[ids('agree')[1]] = { box: 0, due: D0, at: T0 - 5 * DAY + 1, miss: 1, d0: D0 - 5 };
  assert.deepEqual(pickOne(LIST, st, T0), { id: ids('time')[1], kind: 'time' }, '다시 볼 것 — due가 이른 것부터 · 새 퍼즐보다 먼저');
  st[ids('time')[1]] = { box: 0, due: D0 + 1, at: T0, miss: 2, d0: D0 - 2 };
  assert.deepEqual(pickOne(LIST, st, T0), { id: ids('agree')[1], kind: 'agree' }, '내일 볼 것은 아직');
  const all = old();
  for (const k of ONE_KINDS) for (const id of ids(k)) all[id] = right(T0 - DAY);
  assert.equal(pickOne(LIST, all, T0), null, '세 꼴을 다 ⭐로 만들면 단추가 안 뜬다');
  const notOurs = old();
  for (const k of ONE_KINDS) for (const id of ids(k)) notOurs[id] = right(T0 - DAY);
  for (const id of ids('sort')) delete notOurs[id];
  assert.equal(pickOne(LIST, notOurs, T0), null, '사실·의견 가르기에 새 퍼즐이 남아도 안 낸다');
  assert.equal(pickOne([], {}, T0), null);
  assert.equal(pickOne(null, {}, T0), null);
});

test('🧩 한 번 해 본 꼴은 오늘의 퍼즐 판에도 예전처럼 들어온다 (v315 규칙 — 처음 보는 꼴이 아니게 됨)', () => {
  const ALL_STAR = Object.fromEntries(CARDS.map((c) => [`${c.id}:1`, D0 - 5]));
  const st = old();
  const before = planPuzzles(LIST, st, ALL_STAR, T0);
  assert.equal(before.at(-1).kind, 'agree', '판 맨 뒤 하나만 처음 보는 꼴');
  st[ids('agree')[0]] = right(T0 - DAY);
  st[ids('exp')[0]] = right(T0 - DAY);
  const after = planPuzzles(LIST, st, ALL_STAR, T0 + DAY);
  assert.equal(after.at(-1).kind, 'time', '해 본 🔗·⚖️ 겪은 일은 이제 익숙한 꼴 — 처음 보는 꼴은 ⏰');
});

test('🧩 보상 — 퍼즐 하나도 그날 처음 끝낸 퍼즐이면 💰·🎯(오늘의 퍼즐과 하루 한 번을 나눔) · 🟩는 맞혀도 없음(셋 이상 판만) · 같은 날 둘째는 ⭐·⚡만', () => {
  const id1 = ids('agree')[0];
  const id2 = ids('agree')[1];
  const prof = { korPuzzle: {}, korPuzzleDay: {}, coins: 0, items: {} };
  const r1 = korPuzzleRule(prof, [{ id: id1, ok: true, from: 0 }], T0, LIST.map((p) => p.id));
  assert.deepEqual([r1.ok, r1.first, r1.coins, r1.stone, r1.n, r1.okN, r1.solved], [true, true, PUZZLE_COINS, 0, 1, 1, [id1]]);
  assert.equal(prof.korThrow.earned, 1, '🎯 국어 포켓몬 잡기 1번');
  assert.equal((prof.items || {})[KOR_STONE] || 0, 0, '🟩 없음');
  assert.ok(r1.xp > 0, '⚡');
  const r2 = korPuzzleRule(prof, [{ id: id2, ok: false, from: 0 }], T0 + 60000, LIST.map((p) => p.id));
  assert.deepEqual([r2.first, r2.coins], [false, 0], '같은 날 둘째 — 💰·🎯는 이미');
  assert.equal(prof.korPuzzle[id2].due, D0 + 1, '틀린 퍼즐은 내일 다시');
  // 판을 먼저 끝냈으면 퍼즐 하나는 💰 없음 — 하루 한 번
  const p2 = { korPuzzle: {}, korPuzzleDay: { [D0]: 1 }, coins: 0, items: {} };
  assert.equal(korPuzzleRule(p2, [{ id: id1, ok: true, from: 0 }], T0, LIST.map((p) => p.id)).first, false);
  // 🔍 Codex 135차 #1 — 단추를 낸 뒤 다른 판이 ⭐로 만든 퍼즐을 틀림: ⭐ 그대로 · moved 0(끝 화면이 "내일 다시"를 약속하지 않게)
  const r3 = korPuzzleRule(prof, [{ id: id1, ok: false, from: 0 }], T0 + 120000, LIST.map((p) => p.id));
  assert.deepEqual([r3.moved, r3.okN, prof.korPuzzle[id1].box], [0, 0, SOLVED]);
  assert.equal(puzzleFinishText(r3, undefined, true).lines[0], '이번 풀이는 연습이었어요 — 기록은 그대로예요');
  assert.equal(r2.moved, 1);
});

test('🧩 하루 한 꼴은 두 길을 합쳐 (🔍 Codex 135차 #3) — 퍼즐 하나로 오늘 🔗을 들였으면 오늘의 퍼즐 판은 새 꼴을 더 안 들인다 · 판으로 들였으면 퍼즐 하나도 · 다음 날은 다음 꼴', () => {
  const ALL_STAR = Object.fromEntries(CARDS.map((c) => [`${c.id}:1`, D0 - 5]));
  const st = old();
  st[ids('agree')[0]] = right(T0); // 오늘 퍼즐 하나로 🔗 처음
  assert.equal(kindsNewToday(LIST, st, D0), 1);
  const plan = planPuzzles(LIST, st, ALL_STAR, T0 + 1000);
  assert.ok(!plan.some((x) => x.kind === 'exp' || x.kind === 'time'), plan.map((x) => x.kind).join(','));
  assert.ok(plan.length >= 4, '판은 익숙한 꼴로 채운다');
  const next = planPuzzles(LIST, st, ALL_STAR, T0 + DAY);
  assert.equal(next.at(-1).kind, 'exp', '다음 날은 ⚖️ 겪은 일이 맨 뒤');
  // 판으로 오늘 ⏰를 들였으면 퍼즐 하나는 해 본 꼴(⏰)만
  const st2 = old();
  st2[ids('time')[0]] = wrong(T0);
  assert.equal(pickOne(LIST, st2, T0 + 1000).kind, 'time');
  // d0가 없는 옛 칸·어제 들인 꼴은 오늘로 안 센다
  const st3 = old();
  st3[ids('agree')[0]] = { box: SOLVED, due: 0, at: T0 - DAY, miss: 0 };
  st3[ids('exp')[0]] = right(T0 - DAY);
  assert.equal(kindsNewToday(LIST, st3, D0), 0);
  assert.equal(planPuzzles(LIST, st3, ALL_STAR, T0).at(-1).kind, 'time', '오늘 새 꼴 한 자리가 남았다');
  // 익숙한 꼴만으로 판을 못 채우면(오늘 처음 들인 🔗을 다 풂 · 다른 꼴은 안 해 봄) 예전처럼 새 꼴 하나로 채운다 — 판이 비지 않게
  const only = Object.fromEntries(ids('agree').map((id, i) => [id, right(T0 + i)]));
  const filled = planPuzzles(LIST, only, ALL_STAR, T0 + DAY / 2);
  assert.equal(filled.length, 4, '빈 판이 아니다');
  assert.equal(new Set(filled.map((x) => x.kind)).size, 1, '새 꼴은 하나만');
});

test('🧩 끝 화면 말 — 퍼즐 하나는 맞힌 수 대신 한 줄 · 틀리면 내일 다시 · 첫 퍼즐이면 💰·🎯 · 탭 줄은 "판 끝"이라 하지 않는다', () => {
  const ok = puzzleFinishText({ ok: true, first: true, coins: 10, stone: 0, n: 1, okN: 1, solved: ['H1'] }, () => '🔗 꾸미는 말', true);
  assert.deepEqual(ok, { title: '🧩 퍼즐 하나 끝!', lines: ['한 번에 맞혔어요!', '💰 +10 · 🎯 국어 포켓몬 잡기 1번', '⭐ 새로 푼 퍼즐: 🔗 꾸미는 말'] });
  const no = puzzleFinishText({ ok: true, first: false, coins: 0, stone: 0, n: 1, okN: 0, solved: [], moved: 1 }, undefined, true);
  assert.deepEqual(no, { title: '🧩 퍼즐 하나 끝!', lines: ['틀린 퍼즐은 내일 다시 나와요 — 그때 또 풀어 봐요'] });
  // 🔍 Codex 135차 #1 — 칸을 안 옮긴 답(⭐ 퍼즐 · 다른 창이 먼저 옮김)은 "내일 다시"를 약속하지 않는다
  const st = puzzleFinishText({ ok: true, first: false, coins: 0, stone: 0, n: 1, okN: 0, solved: [], moved: 0 }, undefined, true);
  assert.deepEqual(st.lines, ['이번 풀이는 연습이었어요 — 기록은 그대로예요']);
  assert.ok(!/\d+ \/ \d+/.test(no.lines.join(' ')), '0 / 1 같은 셈 없음');
  assert.match(puzzleFinishText({ ok: false, why: 'save' }, undefined, true).title, /저장이 안 됐어요/, '저장 실패는 판과 같다');
  assert.equal(puzzleFinishText({ ok: true, first: false, n: 1, okN: 0, solved: [] }).title, '🧩 퍼즐 연습 끝!', '판은 예전 그대로');
  assert.equal(puzzleTodayLine(1), '오늘 퍼즐 보상은 받았어요 ✅ — 더 풀어도 ⭐는 모여요');
  assert.ok(!puzzleTodayLine(1).includes('오늘의 퍼즐 끝'));
});

test('🧩 기록 — 하루 기록 목록 칸(합집합) · 오늘 끝낸 수(같은 칸은 한 번) · 7일 모으기 · 📤 국어 요약 줄', () => {
  const a = mergeDailyDelta(emptyDaily('2026-10-24'), '2026-10-24', { korPzOneStarts: [oneKey(1, 'agree')] });
  const b = mergeDailyDelta(a, '2026-10-24', { korPzOneStarts: [oneKey(1, 'agree')], korPzOneDone: [oneKey(1, 'agree')] });
  const c = mergeDailyDelta(b, '2026-10-24', { korPzOneDone: [oneKey(1, 'agree'), oneKey(2, 'exp')] });
  assert.deepEqual([c.korPzOneStarts, c.korPzOneDone], [['1:agree'], ['1:agree', '2:exp']]);
  assert.equal(oneDoneCount(c), 2);
  assert.deepEqual([oneDoneCount(null), oneDoneCount({}), oneDoneCount({ korPzOneDone: 'x' }), oneDoneCount({ korPzOneDone: ['1', '1', 1] })], [0, 0, 0, 1]);
  const s = oneSessions([
    { korPzOneStarts: ['1:agree', '2:agree', '3:exp'], korPzOneDone: ['1:agree', '3:exp', 'x', '4:'] },
    { korPzOneStarts: ['5:time', '1:agree'], korPzOneDone: ['5:time', '1:agree'] }, // 다른 날 기록에 같은 칸 — 한 번
    null,
  ]);
  assert.deepEqual(s, { start: 4, done: 3, kinds: [['⏰', 1], ['⚖️', 1], ['🔗', 1]] });
  assert.deepEqual(oneSessions([]), { start: 0, done: 0, kinds: [] });
  const raw = [{ cards: CARDS }, JSON.parse(read('coach/korean/words.json')), DATA, null];
  const md = korReportFromRaw({}, raw, '2026-10-24', [
    { date: '2026-10-24', korPzOneStarts: ['1:agree', '2:agree'], korPzOneDone: ['1:agree'] },
    { date: '2026-10-22', korPzOneStarts: ['3:time'], korPzOneDone: ['3:time'] },
    { date: '2026-10-10', korPzOneStarts: ['4:exp'], korPzOneDone: ['4:exp'] }, // 7일 밖
  ]);
  assert.ok(md.includes('- 🧩 최근 7일 글 끝 퍼즐 하나(v331부터 · 이 기간에 일어난 일을 따로 셈): 누름 3 · 끝냄 2 (⏰ 1 · 🔗 1)'), md.slice(md.indexOf('## 🧩'), md.indexOf('## 🧩') + 1200));
  assert.ok(korReportFromRaw({}, raw, '2026-10-24', []).includes('- 🧩 최근 7일 글 끝 퍼즐 하나(v331부터 · 이 기간에 일어난 일을 따로 셈): 누름 0 · 끝냄 0\n'), '없으면 0');
  const db = read('js/db.js');
  assert.ok(db.includes("'essaySayKeys', ...SUN_DAY_LISTS, ...ONE_DAY_LISTS, ...KOR_DAY_LISTS, ...PUZZLE_DAY_LISTS];"), 'db 하루 기록 목록 칸');
});

test('🧩 화면 잇기 — 국어 글 끝: 저장된 글만 · 🔤 아래 · 눌릴 때 끝 화면·🎯·⚔️·🔤·🚀 확인 두 번 · 읽던 글을 닫고 퍼즐 탭에서 하나로 · 못 열면 퍼즐 탭', () => {
  const v = read('js/koreanview.js');
  const fc = v.slice(v.indexOf('async function finishCard() {'), v.indexOf('\n}\n', v.indexOf('async function finishCard() {')));
  const offer = fc.indexOf('puzzles.oneOffer(tabCtx).then((one) => {');
  assert.ok(offer > 0 && offer > fc.indexOf('korMatchOffer(ui.cards || [])') && offer < fc.indexOf('if (eggP) {'), '🔤 다음 · res.ok 안');
  assert.ok(fc.includes('if (one && ui.read === r && r.result === res) { r.one = one; renderQ(); }'), '그 사이 다른 글로 갔으면 안 붙인다');
  const fe = v.slice(v.indexOf('function finishEl() {'), v.indexOf('\n}\n', v.indexOf('function finishEl() {')));
  const at = fe.indexOf('if (res.ok && r.one) box.appendChild(onePuzzleEl(r, r.one));');
  assert.ok(at > fe.indexOf('korMatchEl(m,') && at < fe.indexOf('writeBoxEl(r.card, writeCtx)'), '🔤 아래 · ✍️ 위');
  const oe = v.slice(v.indexOf('function onePuzzleEl(r, one) {'), v.indexOf('\n}\n', v.indexOf('function onePuzzleEl(r, one) {')));
  assert.ok(oe.includes("const ok = () => ui.read === r && r.one === one && !ui.catching && !overlayOpen() && !korRocketPending('korean');"));
  const click = oe.slice(oe.indexOf("b.addEventListener('click'"));
  assert.ok(click.indexOf('if (!ok()) return;') < click.indexOf("guardStart('korean'") && click.lastIndexOf('if (!ok()) return;') > click.indexOf("guardStart('korean'"), '누를 때·⏳ 확인 뒤 두 번');
  assert.ok(click.indexOf('closeRead();') > 0 && click.indexOf('closeRead();') < click.indexOf("ui.tab = 'puzzle';") && click.indexOf("ui.tab = 'puzzle';") < click.indexOf('puzzles.startOne(tabCtx, one.id)'), '읽던 글을 닫고 → 퍼즐 탭 → 하나로');
  assert.ok(click.includes('if (!puzzles.startOne(tabCtx, one.id)) { renderList(); window.scrollTo(0, 0); }'));
  assert.ok(!/\d+(개|번|판) 남|오늘 \d/.test(oe), '셈 문구 없음');
  const cr = v.slice(v.indexOf('function closeRead() {'), v.indexOf('\n}\n', v.indexOf('function closeRead() {')));
  assert.ok(cr.includes('haltListen(ui.read.ls)') && cr.includes('korRocketClear()') && cr.includes('ui.read = null;'), '🎧 멈춤 · 🚀 걸어 둔 것 · 읽던 글 닫기 — 📚 도감으로와 같다');
});

test('🧩 화면 잇기 — 퍼즐 판: 하나짜리 판 · 누름·끝냄 기록(판 기록은 안 건드림) · 그만두면 도감으로 · 끝 화면 📚 도감으로 먼저 · 하루 셋', () => {
  const p = read('js/korpuzzleview.js');
  const of = p.slice(p.indexOf('export async function oneOffer(ctx) {'), p.indexOf('\n}\n', p.indexOf('export async function oneOffer(ctx) {')));
  assert.ok(of.indexOf('if (oneDoneCount(d) >= ONE_PER_DAY) return null;') > 0 && of.indexOf('if (oneDoneCount(d) >= ONE_PER_DAY) return null;') < of.indexOf('pickOne('), '하루 셋 — 끝낸 수로');
  assert.ok(of.includes('try { d = await getDaily(dayKeyOf(dayNum(Date.now()))); } catch { return null; }'), '못 읽으면 단추 없음');
  const so = p.slice(p.indexOf('export function startOne(ctx, id) {'), p.indexOf('\n}\n', p.indexOf('export function startOne(ctx, id) {')));
  assert.ok(so.includes('if (S.ps || !S.list) return false;'), '다른 판을 푸는 중이면 안 연다');
  // 🔍 Codex 135차 #1 — 단추를 낸 뒤 그 퍼즐이 ⭐가 됐으면 지금 칸으로 새로 고른다 · 세 꼴만
  assert.ok(so.includes('const fit = (x) => !!x && ONE_KINDS.includes(x.kind) && !isSolved(states[x.id]);'));
  assert.ok(so.includes('if (!fit(p)) { const one = pickOne(S.list, states, Date.now()); p = one ? byId(one.id) : null; }') && so.indexOf('if (!fit(p)) return false;') > so.indexOf('pickOne('));
  assert.ok(so.includes('S.ps = newSession([itemOf(p)], states, false, true);') && so.includes('notePlay({ korPzOneStarts: [oneKey(S.ps.t0, p.kind)] });'));
  assert.ok(!so.includes('korPzStarts'), '오늘의 퍼즐 판 시작으로 안 센다');
  assert.ok(/if \(ps\.one\) notePlay\(\{ korPzOneDone: \[oneKey\(ps\.t0, ps\.items\[0\]\.kind\)\] \}\);[^\n]*\n\s+else if \(!ps\.practice\) notePlay\(\{ korPzDone: \[String\(ps\.t0\)\] \}\);/.test(p), '끝냄은 따로 — 판 끝냄으로 안 센다');
  assert.ok(p.includes('if (!ps.practice && !ps.one) notePlay({ korPzQuits:'), '그만둠은 판 기록에 안 넣는다');
  assert.ok(/S\.ps = null;\s+if \(ps\.one\) ctx\.toCards\(\); else ctx\.toPuzzle\(\);/.test(p), '그만두면 도감으로');
  assert.ok(p.includes('const t = puzzleFinishText(res, (id) => nameOf(byId(id)) || id, ps.one);'));
  assert.ok(p.includes('if (ps.one) { row.appendChild(cards); row.appendChild(back); } else { row.appendChild(back); row.appendChild(cards); }'), '📚 도감으로 먼저');
  assert.ok(p.includes("const cards = el('button', `btn${res.ok && ps.one ? ' btn-primary' : ''}`, '📚 도감으로');"));
  const css = read('css/style.css');
  assert.ok(css.includes('.kor-one-offer {') && css.includes('.kor-one-btn { width: 100%; }'));
  const sw = read('sw.js');
  assert.ok(sw.includes("const CACHE_VERSION = 'v331';") || /CACHE_VERSION = 'v(33[2-9]|3[4-9]\d|[4-9]\d\d)'/.test(sw));
});
