// 🧩 국어 글 퍼즐 (v242, 2026-10-12 아버님 "이대로 진행") — 원고(차례 하나뿐 · 섞인 문장 없음) · 채점 · 오늘의 판 · 보상 규칙 · 병합 · 저장 경로 · 화면 연결
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  PUZZLE_COINS, PUZZLE_PERFECT_MIN, ORDER_PER_DAY, INTEXT_PER_DAY, SORT_PER_DAY, AGREE_PER_DAY, PUZZLES_PER_DAY, SOLVED, ASKS, OPINION_WORDS, SORT_BANNED,
  permutations, validOrders, checkPuzzles, allPuzzles, isOpen, isSolved, planPuzzles, shuffledOrder, gradeOrder, gradeSort,
  korPuzzleRule, puzzleStats, puzzleFinishText, puzzleTodayLine, mergePuzzles,
} from '../js/korpuzzle.js';
import { dayNum } from '../js/korean.js';
import { emptyProfile, cloneProfile, mergeStatRecord, applyHouseRule } from '../js/db.js';
import { initProfile, flushProfile, reloadProfile, korPuzzleFinish, korPuzzleMap, korPuzzleDayMap, korThrowsLeft } from '../js/xp.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const DATA = JSON.parse(read('coach/korean/puzzles.json'));
const CARDS = JSON.parse(read('coach/korean/reading.json')).cards;
const LIST = allPuzzles(DATA, CARDS);
const IDS = LIST.map((p) => p.id);
const T0 = new Date(2026, 9, 12, 12, 0, 0).getTime();
const at = (days, h = 12) => new Date(2026, 9, 12 + days, h, 0, 0).getTime();
const D0 = dayNum(T0);
const clone = (x) => JSON.parse(JSON.stringify(x));
const byId = (id) => LIST.find((p) => p.id === id);
const pf = (o = {}) => cloneProfile({ ...emptyProfile(), ...o });

test('🧩 원고: 검사 통과 · 차례 맞추기 20(이야기 흐름 16 — 모두 있는 글 카드, v244 홍길동전·양반전 · v255 도자기 체험·가짜 동영상·생일 쪽지·흥부와 놀부 · 하는 차례 4) · 사실·의견 14묶음 70문장 · 차례는 실마리에 맞는 것이 하나뿐 · 실마리 말은 조각에 있음', () => {
  assert.deepEqual(checkPuzzles(DATA, CARDS), []);
  assert.equal(LIST.length, DATA.puzzles.length, '쓸 수 있는 퍼즐 = 전부');
  const orders = LIST.filter((p) => p.kind === 'order');
  const sorts = LIST.filter((p) => p.kind === 'sort');
  assert.deepEqual([orders.length, orders.filter((p) => p.ask === 'event').length, orders.filter((p) => p.ask === 'process').length, sorts.length], [23, 19, 4, 14]); // v265 신문 글 둘(O21 성수동 · O22 판다 외교) · v291 O23 호상놀이에 담긴 장례의 차례 더함
  assert.equal(sorts.reduce((n, p) => n + p.sents.length, 0), 70);
  for (const p of orders) {
    const vs = validOrders(p.chunks.length, p.need);
    assert.deepEqual(vs, [p.chunks.map((_, i) => i)], `${p.id}: 맞는 차례가 원고 차례 하나뿐`);
    for (const [a, b, clue] of p.need) assert.ok(p.chunks[a].includes(clue) || p.chunks[b].includes(clue), `${p.id}: 실마리 "${clue}"`);
    if (p.ask === 'event') {
      const c = CARDS.find((x) => x.id === p.card);
      assert.ok(c && c.title === p.title, `${p.id}: 이야기 흐름은 그 글 카드에서(제목 같음)`);
      assert.ok(!c.stanzas, `${p.id}: 시가 아니라 사건이 있는 글`);
    } else assert.equal(p.card, '', `${p.id}: 하는 차례는 새 글`);
  }
  for (const p of sorts) {
    for (const s of p.sents) {
      assert.ok(!SORT_BANNED.test(s.t), `${p.id}: ${s.t}`);
      assert.equal(OPINION_WORDS.test(s.t), s.fo === 'opinion', `${p.id}: 생각 말 ↔ 의견 — ${s.t}`);
    }
    assert.ok(p.sents.some((s) => s.fo === 'fact') && p.sents.some((s) => s.fo === 'opinion'), p.id);
  }
  // 아이에게 보이는 원고 — 옛 한글 조합 자모 없음(v241 시조에서 글꼴이 깨졌다)
  assert.ok(!/[\u1100-\u11FF\u3164\uA960-\uA97F\uD7B0-\uD7FF]/.test(read('coach/korean/puzzles.json')));
});

test('🧩 원고 검사가 잡는 것: 바꿀 수 있는 조각(실마리 빠짐) · 실마리 말이 조각에 없음 · need 꼴 · ask · 이야기 흐름에 card 없음 · 없는 카드 · 조각 수·같은 조각 · id 꼴·겹침 / 사실·의견: 섞인 꼴 · 사실에 생각 말 · 의견에 생각 말 없음 · 한쪽만 · fo', () => {
  const bad = (edit, re) => { const d = clone(DATA); edit(d.puzzles); const e = checkPuzzles(d, CARDS); assert.ok(e.some((m) => re.test(m)), `${re} — ${e.join(' / ')}`); };
  const o = (id) => (ps) => ps.find((x) => x.id === id);
  bad((ps) => { o('O11')(ps).need.pop(); }, /맞는 차례가 4가지/); // 마지막 조각이 어디든 갈 수 있다
  bad((ps) => { o('O11')(ps).need[0][2] = '없는 말'; }, /실마리 "없는 말"가 두 조각에 없어요/);
  bad((ps) => { o('O11')(ps).need[0] = [0, 9, '그 흙', 'x']; }, /need 1은/);
  bad((ps) => { o('O11')(ps).need = o('O11')(ps).need.map(([a, b, c, w]) => [b, a, c, w]); }, /원고 차례와 달라요/); // 실마리를 모두 거꾸로 — 맞는 차례는 하나지만 ④③②①
  bad((ps) => { o('O11')(ps).ask = 'time'; }, /ask는/);
  bad((ps) => { delete o('O1')(ps).card; }, /이야기 흐름은 읽은 글/);
  bad((ps) => { o('O1')(ps).card = 'K999'; }, /없는 카드 K999/);
  bad((ps) => { o('O11')(ps).chunks.splice(2); }, /chunks는 3~5개/);
  bad((ps) => { const c = o('O11')(ps).chunks; c[1] = c[0]; }, /같은 조각/);
  bad((ps) => { o('O11')(ps).id = 'F99'; }, /id는 O숫자/);
  bad((ps) => { o('O12')(ps).id = 'O11'; }, /id가 겹쳐요/);
  bad((ps) => { o('F1')(ps).sents[1].t = '고래는 드디어 물 위로 올라온다.'; }, /섞여요/);
  bad((ps) => { o('F1')(ps).sents[1].t = '고래는 물 위로 올라온다고 한다.'; }, /섞여요/);
  bad((ps) => { o('F1')(ps).sents[1].t = '고래는 내일 물 위로 올라오겠다.'; }, /섞여요/);
  bad((ps) => { o('F1')(ps).sents[1].t = '고래는 물 위로 올라올까?'; }, /섞여요/);
  bad((ps) => { o('F1')(ps).sents[1].t = '고래는 물 위로 올라와서 멋지다.'; }, /사실 문장에 생각 말/);
  bad((ps) => { o('F1')(ps).sents[2].t = '고래는 바다에 산다.'; }, /의견 문장에 생각 말이 없어요/);
  bad((ps) => { for (const s of o('F1')(ps).sents) { s.fo = 'fact'; s.t = s.t.replace(/멋진|즐겁다/, '큰'); } }, /사실과 의견이 하나 이상씩/);
  bad((ps) => { o('F1')(ps).sents[0].fo = 'maybe'; }, /fo는/);
  // Codex 55차 — 거르는 망의 넓고 좁음 다섯 예 (라벨은 사람이 정한다 · 정규식은 망일 뿐)
  assert.equal(OPINION_WORDS.test('오늘 최고 기온은 30도이다.'), false, '"최고 기온"은 사실 — 생각 말이 아니다');
  for (const t of ['이 책은 아름다운 책이다.', '우리 반은 조용한 교실을 만들어야 해요.', '떡볶이가 최고다.', '여름은 최고의 계절이다.']) assert.ok(OPINION_WORDS.test(t), `생각 말: ${t}`);
  for (const t of ['고래가 크다고 말했다.', '내일은 비가 올 듯하다.', '내일은 비가 올 듯 하다.']) assert.ok(SORT_BANNED.test(t), `섞인 꼴: ${t}`);
  bad((ps) => { o('F1')(ps).sents[1].t = '고래는 물 위로 올라온다고 말했다.'; }, /섞여요/);
  bad((ps) => { o('F1')(ps).sents[1].t = '고래는 물 위로 올라올 듯하다.'; }, /섞여요/);
  bad((ps) => { o('F1')(ps).sents[1].t = '고래는 아름다운 동물이다.'; }, /사실 문장에 생각 말/);
  bad((ps) => { o('F1')(ps).sents[1].t = '고래를 지켜야 해요.'; }, /사실 문장에 생각 말/);
  assert.deepEqual(checkPuzzles({}, CARDS), ['puzzles가 없어요']);
  // 깨진 퍼즐은 앱이 빼고 쓴다
  const d = clone(DATA);
  d.puzzles.find((x) => x.id === 'O11').need.pop();
  assert.ok(!allPuzzles(d, CARDS).some((p) => p.id === 'O11') && allPuzzles(d, CARDS).length === LIST.length - 1);
});

test('🧩 차례 셈·채점: 모든 차례(4! = 24) · need에 맞는 차례 · 낸 차례 채점(빠짐·겹침은 무효) · 가르기 채점 · 처음 놓는 차례는 바른 차례가 아니다', () => {
  assert.equal(permutations(4).length, 24);
  assert.equal(new Set(permutations(4).map((p) => p.join())).size, 24);
  assert.equal(validOrders(3, []).length, 6);
  assert.deepEqual(validOrders(3, [[0, 1], [1, 2]]), [[0, 1, 2]]);
  const p = byId('O11');
  assert.deepEqual(gradeOrder(p, [0, 1, 2, 3]), { valid: true, ok: true, right: 4, n: 4 });
  assert.deepEqual(gradeOrder(p, [1, 0, 2, 3]), { valid: true, ok: false, right: 2, n: 4 });
  for (const bad of [[0, 1, 2], [0, 0, 2, 3], [0, 1, 2, 9], 'x', null]) assert.equal(gradeOrder(p, bad).valid, false, String(bad));
  const f = byId('F1');
  const right = f.sents.map((s) => s.fo);
  assert.deepEqual(gradeSort(f, right), { valid: true, ok: true, right: 5, n: 5 });
  const flipOne = right.slice(); flipOne[0] = flipOne[0] === 'fact' ? 'opinion' : 'fact';
  assert.deepEqual(gradeSort(f, flipOne), { valid: true, ok: false, right: 4, n: 5 });
  for (const bad of [right.slice(0, 4), [...right.slice(0, 4), 'maybe'], null]) assert.equal(gradeSort(f, bad).valid, false);
  // Codex 55차 — 빈 칸 있는 배열(희소 배열)은 다 채운 답이 아니다 · 가르기는 글자 'fact'/'opinion'만
  const holeEnd = [0, 1, 2]; holeEnd.length = 4;
  const holeMid = [0, 1, 2, 3]; delete holeMid[1];
  assert.deepEqual([holeEnd.length, holeMid.length, 1 in holeMid], [4, 4, false]);
  assert.equal(gradeOrder(p, holeEnd).valid, false, '끝이 빈 칸');
  assert.equal(gradeOrder(p, holeMid).valid, false, '가운데가 빈 칸');
  const sHole = right.slice(); delete sHole[2];
  assert.equal(gradeSort(f, sHole).valid, false, '가르기 빈 칸');
  const boxed = right.slice(); boxed[0] = new String(boxed[0]); // eslint-disable-line no-new-wrappers
  assert.equal(gradeSort(f, boxed).valid, false, '글자 객체');
  const inArr = right.slice(); inArr[0] = [inArr[0]];
  assert.equal(gradeSort(f, inArr).valid, false, '배열에 싼 값');
  assert.equal(gradeSort(f, right.map((x, i) => (i === 0 ? 'constructor' : x))).valid, false);
  const rng = (seed) => { let s = seed >>> 0 || 1; return () => { s = (s * 1103515245 + 12345) >>> 0; return (s >>> 8) / 16777216; }; };
  for (let s = 1; s <= 500; s++) {
    const d = shuffledOrder(4, rng(s));
    assert.equal(new Set(d).size, 4);
    assert.notDeepEqual(d, [0, 1, 2, 3], `씨앗 ${s}: 처음부터 바른 차례로 놓여 있지 않다`);
  }
  assert.notDeepEqual(shuffledOrder(4, () => 0), [0, 1, 2, 3]);
  assert.notDeepEqual(shuffledOrder(4, () => 0.9999), [0, 1, 2, 3]);
});

test('🧩 오늘의 판: 이야기 흐름은 그 글에 ★이 있어야 열림 · 차례 1 + 글에 있나요 1 + 사실·의견 1(v259 — 같은 꼴이 붙지 않게, 모자라면 다른 꼴로) · 틀린 퍼즐은 다음 날부터 먼저 · ⭐ 퍼즐은 안 나옴 · 연습은 ⭐ 퍼즐만 · 꼴마다 셈', () => {
  const none = planPuzzles(LIST, {}, {}, T0);
  assert.deepEqual([ORDER_PER_DAY, INTEXT_PER_DAY, SORT_PER_DAY, AGREE_PER_DAY, PUZZLES_PER_DAY], [1, 1, 1, 1, 4]); // v294 🔗 앞뒤 어울리기 하나 더
  assert.equal(none.length, PUZZLES_PER_DAY);
  assert.deepEqual(none.map((p) => p.id), ['O11', 'F1', 'H1', 'O12'], '★이 없으면 하는 차례만(글에 있나요는 안 열림) — 차례·가르기·앞뒤·차례(모자란 글에 있나요 자리를 차례로)');
  assert.ok(!isOpen(byId('O10'), {}) && isOpen(byId('O10'), { 'K31:1': D0 }) && isOpen(byId('O11'), {}) && isOpen(byId('F1'), {}));
  const withK31 = planPuzzles(LIST, {}, { 'K31:1': D0 }, T0);
  assert.ok(withK31.some((p) => p.id === 'O10'), '「토끼전」을 읽으면 토끼전 흐름이 열린다');
  // 틀린 퍼즐: 오늘은 안 나오고 내일 먼저
  const st = { O11: { box: 0, due: D0 + 1, at: 1, miss: 1, d0: D0 }, F1: { box: SOLVED, due: 0, at: 2, miss: 0, d0: D0 } };
  assert.ok(!planPuzzles(LIST, st, {}, T0).some((p) => p.id === 'O11' || p.id === 'F1'));
  assert.equal(planPuzzles(LIST, st, {}, at(1))[0].id, 'O11', '다음 날 — 틀린 퍼즐이 먼저');
  assert.deepEqual(planPuzzles(LIST, st, {}, T0, true).map((p) => p.id), ['F1'], '연습은 ⭐ 퍼즐만');
  // 한쪽이 모자라면 다른 쪽으로 채운다
  const allSortsDone = {};
  for (const p of LIST.filter((x) => x.kind === 'sort')) allSortsDone[p.id] = { box: SOLVED, due: 0, at: 1, miss: 0, d0: D0 };
  assert.deepEqual(planPuzzles(LIST, allSortsDone, {}, T0).map((p) => p.kind), ['order', 'order', 'order', 'order'], '사실·의견만 해 봤으면 처음 보는 꼴은 하루 하나(차례)로 채운다 (v315)');
  assert.ok(isSolved({ box: 1 }) && !isSolved({ box: 0 }) && !isSolved(null));
  assert.deepEqual(puzzleStats(LIST, st, {}).map((s) => [s.kind, s.total, s.open, s.solved, s.tried]), [['order', 23, 4, 0, 1], ['sort', 14, 14, 1, 0], ['intext', 12, 0, 0, 0], ['agree', 10, 10, 0, 0], ['exp', 10, 10, 0, 0], ['time', 10, 10, 0, 0]]); // v265 차례 둘 · v291 하나 더함 · v294 🔗 열 · v295 ⚖️ 겪은 일·생각 열 · v297 ⏰ 일어난 차례 열
});

test('🧩 보상 규칙: 그날 첫 판만 💰·🎯 · 3개 모두 한 번에 → 🟩 · 같은 날 둘째 판은 보상 없음(⭐는 모임) · 틀리면 다음 날 · ⭐는 되돌리지 않음 · 낡은 판은 연습 · 모르는 퍼즐은 안 셈 · 빈 판은 empty', () => {
  const ids3 = ['O11', 'F1', 'O12'];
  const p = pf({ coins: 0, coinsEarned: 0, korThrow: { earned: 0, used: 0, refunded: 0 }, items: {} });
  const r = korPuzzleRule(p, ids3.map((id) => ({ id, ok: true, from: 0 })), T0, IDS);
  assert.deepEqual([r.ok, r.first, r.coins, r.stone, r.n, r.okN, r.throws], [true, true, PUZZLE_COINS, 1, 3, 3, 1]);
  assert.deepEqual(r.solved, ids3);
  assert.deepEqual([p.coins, p.coinsEarned, p.items.stone_korean, p.korThrow.earned, p.korPuzzleDay[D0]], [PUZZLE_COINS, PUZZLE_COINS, 1, 1, 2]);
  assert.equal(p.korPuzzle.O11.box, SOLVED);
  // 같은 날 둘째 판 — 보상 없음 · 칸은 옮긴다
  const r2 = korPuzzleRule(p, [{ id: 'O13', ok: false, from: 0 }, { id: 'F2', ok: true, from: 0 }], T0 + 1000, IDS);
  assert.deepEqual([r2.first, r2.coins, r2.stone, p.coins], [false, 0, 0, PUZZLE_COINS]);
  assert.deepEqual([p.korPuzzle.O13.box, p.korPuzzle.O13.due, p.korPuzzle.O13.miss, p.korPuzzle.F2.box], [0, D0 + 1, 1, SOLVED]);
  // ⭐는 낡은 오답으로 되돌리지 않는다 · 낡은 판(from이 다름)은 연습
  korPuzzleRule(p, [{ id: 'O11', ok: false, from: p.korPuzzle.O11.at }], T0 + 2000, IDS);
  assert.equal(p.korPuzzle.O11.box, SOLVED);
  const before = clone(p.korPuzzle.O13);
  korPuzzleRule(p, [{ id: 'O13', ok: true, from: 0 }], T0 + 3000, IDS);
  assert.deepEqual(p.korPuzzle.O13, before, '판을 시작한 뒤 다른 판이 옮긴 퍼즐 — 연습');
  // 다음 날 첫 판 — 보상 · 2개뿐이면 🟩 없음(PUZZLE_PERFECT_MIN)
  const r3 = korPuzzleRule(p, [{ id: 'O13', ok: true, from: p.korPuzzle.O13.at }, { id: 'F3', ok: true, from: 0 }], at(1), IDS);
  assert.deepEqual([r3.first, r3.coins, r3.stone, r3.okN], [true, PUZZLE_COINS, 0, 2]);
  assert.ok(PUZZLE_PERFECT_MIN === 3);
  // 모르는 퍼즐·같은 퍼즐 두 번은 안 셈 · 빈 판
  const q = pf({});
  const r4 = korPuzzleRule(q, [{ id: 'X1', ok: true }, { id: 'O11', ok: true }, { id: 'O11', ok: false }], T0, IDS);
  assert.deepEqual([r4.n, r4.okN], [1, 1]);
  assert.deepEqual(korPuzzleRule(pf({}), [{ id: 'X1', ok: true }], T0, IDS), { ok: false, why: 'empty' });
  // 말(순수)
  assert.deepEqual(puzzleFinishText({ ok: true, first: true, coins: 10, stone: 1, n: 3, okN: 3, solved: ['O11'] }, () => '하는 차례 「씨앗 심기」'), {
    title: '🧩 오늘의 퍼즐 끝!', lines: ['한 번에 맞힌 퍼즐 3 / 3', '💰 +10 · 🎯 국어 포켓몬 잡기 1번 · 🟩 국어스톤 +1 (모두 한 번에 맞혔어요!)', '⭐ 새로 푼 퍼즐: 하는 차례 「씨앗 심기」'],
  });
  assert.match(puzzleFinishText({ ok: true, first: false, n: 1, okN: 0, solved: [] }).lines[1], /이미 받았어요/);
  assert.equal(puzzleFinishText({ ok: true, first: false, n: 1, okN: 0, solved: [] }).title, '🧩 퍼즐 연습 끝!');
  assert.equal(puzzleFinishText({ ok: true, first: false, n: 1, okN: 1, solved: ['F2'] }).title, '🧩 퍼즐 더 풀기 끝!', '새로 ⭐를 받은 판은 연습이 아니다');
  assert.match(puzzleFinishText({ ok: false, why: 'save' }).title, /저장이 안 됐어요/);
  assert.match(puzzleTodayLine(0), /💰10 · 🎯 국어 포켓몬 잡기 1번 · 퍼즐 3개 이상을 모두 한 번에/);
  assert.match(puzzleTodayLine(2), /🟩까지/);
  assert.equal(ASKS.event.prompt, '일이 일어난 차례대로 놓아 보세요.');
});

test('★ 🧩 퍼즐 칸 병합(Codex 55차): ⭐는 한쪽이라도 — ⭐(앞선 때)와 다른 기기의 더 나중 오답을 어느 차례로 합쳐도 ⭐ · 때·틀린 수는 큰 쪽 · 처음 날은 이른 쪽 · 둘 다 ⭐가 아니면 나중에 푼 쪽', () => {
  const star = { O11: { box: SOLVED, due: 0, at: 100, miss: 0, d0: D0 } };
  const wrongLater = { O11: { box: 0, due: D0 + 3, at: 200, miss: 2, d0: D0 - 1 } };
  for (const [x, y] of [[star, wrongLater], [wrongLater, star]]) {
    assert.deepEqual(mergePuzzles(x, y).O11, { box: SOLVED, due: 0, at: 200, miss: 2, d0: D0 - 1 });
    const m = mergeStatRecord('profile', { ...emptyProfile(), korPuzzle: x, updatedAt: 9 }, { ...emptyProfile(), korPuzzle: y, updatedAt: 5 });
    assert.equal(m.korPuzzle.O11.box, SOLVED, '저장 병합(db)에서도 ⭐가 남는다');
  }
  // 둘 다 ⭐가 아니면 나중에 푼 쪽(칸·다시 볼 날) — 틀린 수는 줄지 않는다 · 한쪽에만 있는 퍼즐은 그대로
  const w1 = { O12: { box: 0, due: D0 + 1, at: 100, miss: 3, d0: D0 }, F1: { box: SOLVED, due: 0, at: 50, miss: 0, d0: D0 } };
  const w2 = { O12: { box: 0, due: D0 + 5, at: 300, miss: 1, d0: 0 } };
  for (const [x, y] of [[w1, w2], [w2, w1]]) {
    const m = mergePuzzles(x, y);
    assert.deepEqual(m.O12, { box: 0, due: D0 + 5, at: 300, miss: 3, d0: D0 });
    assert.deepEqual(m.F1, w1.F1);
  }
  // 둘 다 ⭐ — ⭐ · 때는 큰 쪽(연습 차례·낡은 판 판정이 어긋나지 않게)
  const s1 = { F2: { box: SOLVED, due: 0, at: 10, miss: 1, d0: D0 } };
  const s2 = { F2: { box: SOLVED, due: 0, at: 40, miss: 0, d0: D0 + 1 } };
  assert.deepEqual(mergePuzzles(s1, s2).F2, { box: SOLVED, due: 0, at: 40, miss: 1, d0: D0 });
  assert.deepEqual(mergePuzzles(s2, s1).F2, mergePuzzles(s1, s2).F2);
  assert.deepEqual(mergePuzzles(null, s1), s1);
  // 🔤 낱말 병합은 그대로 — 낱말은 "마지막 답이 이긴다"가 설계(⭐ 낱말도 나중에 틀리면 내려간다)
  const db = read('js/db.js');
  assert.ok(db.includes('out.korWords = mergeWords(cur.korWords, rec.korWords);'));
});

test('🧩 병합·복사·빈 프로필: 퍼즐 칸은 퍼즐마다 나중에 푼 쪽(차례 상관없이) · 보상 받은 날은 큰 쪽(옛 백업이 "아직"으로 되돌리지 못함) · 복사본', () => {
  assert.deepEqual([emptyProfile().korPuzzle, emptyProfile().korPuzzleDay], [{}, {}]);
  const a = { O11: { box: 1, due: 0, at: 200, miss: 0, d0: D0 }, F1: { box: 0, due: D0 + 1, at: 100, miss: 1, d0: D0 } };
  const b = { O11: { box: 0, due: D0 + 1, at: 100, miss: 1, d0: D0 }, F1: { box: 1, due: 0, at: 300, miss: 1, d0: D0 } };
  const cur = { ...emptyProfile(), korPuzzle: a, korPuzzleDay: { [D0]: 1 }, updatedAt: 9 };
  const old = { ...emptyProfile(), korPuzzle: b, korPuzzleDay: { [D0]: 2, [D0 - 1]: 1 }, updatedAt: 5 };
  for (const [x, y] of [[cur, old], [old, cur]]) {
    const m = mergeStatRecord('profile', x, y);
    assert.deepEqual([m.korPuzzle.O11.box, m.korPuzzle.F1.box], [1, 1], '⭐는 어느 쪽에서 왔든 남는다(나중에 푼 쪽)');
    assert.deepEqual(m.korPuzzleDay, { [D0]: 2, [D0 - 1]: 1 });
  }
  const c = cloneProfile(cur);
  c.korPuzzle.O11.box = 0;
  assert.equal(cur.korPuzzle.O11.box, 1, '복사본');
});

let initDone = false;
const stored = () => fakeIdb.get('profile', 'me');
async function seed(p) {
  if (!initDone) { await initProfile(); initDone = true; }
  await flushProfile();
  const cur = stored() || emptyProfile();
  fakeIdb.put('profile', { ...cur, ...p, id: 'me', updatedAt: (cur.updatedAt || 0) + 1 });
  await reloadProfile();
}

test('★ 🧩 저장 경로: 판을 끝내면 퍼즐 칸·💰·🎯·🟩가 저장된 프로필에 · 두 창이 같은 날 첫 판을 동시에 끝내도 보상 한 번 · 저장이 안 되면 없던 일 · 창의 프로필도', async () => {
  await seed({ coins: 0, coinsEarned: 0, korPuzzle: {}, korPuzzleDay: {}, korThrow: { earned: 0, used: 0, refunded: 0 }, items: {} });
  const ids = ['O11', 'F1', 'O12'];
  fakeIdb.failNext('profile');
  const bad = await korPuzzleFinish(ids.map((id) => ({ id, ok: true, from: 0 })), IDS);
  assert.equal(bad.ok, false);
  assert.deepEqual([stored().coins, Object.keys(stored().korPuzzle || {}).length], [0, 0], '저장 실패 = 없던 일');
  const [x, y] = await Promise.all([korPuzzleFinish(ids.map((id) => ({ id, ok: true, from: 0 })), IDS), korPuzzleFinish(ids.map((id) => ({ id, ok: true, from: 0 })), IDS)]);
  assert.ok(x.ok && y.ok);
  assert.deepEqual([x.first, y.first].sort(), [false, true], '첫 판 보상은 한 번');
  const s = stored();
  assert.deepEqual([s.coins, s.korThrow.earned, (s.items || {}).stone_korean], [PUZZLE_COINS, 1, 1]);
  assert.equal(s.korPuzzle.O11.box, SOLVED);
  await reloadProfile();
  assert.equal(korPuzzleMap().O11.box, SOLVED);
  assert.ok(Object.values(korPuzzleDayMap()).includes(2));
  assert.equal(korThrowsLeft(), 1);
  const direct = await applyHouseRule((p) => korPuzzleRule(p, [{ id: 'O13', ok: false }], Date.now(), IDS));
  assert.equal(direct.ok, true);
  // 🔤 낱말 보상과 따로 — 퍼즐 보상을 받은 날에도 낱말 첫 판 보상은 그대로
  assert.deepEqual(stored().korWordDay || {}, {});
});

test('🧩 화면 연결: 퍼즐 판은 처음 낸 것만 · 시작할 때 상태(from)를 같이 · ⏳ guardStart · 🥚 하루 칸(저장과 알 칸 사이에 빠져나가는 길 없음) · koreanview를 import하지 않음 · sw·check·xp·db', () => {
  const pv = read('js/korpuzzleview.js');
  assert.ok(!/from '\.\/koreanview\.js'/.test(pv), '탭 쪽은 koreanview를 import하지 않는다(돌고 돈다)');
  assert.ok(pv.includes("guardStart('korean', () => startSession(ctx, false))") && pv.includes("guardStart('korean', () => startSession(ctx, true))"), '⏳ 시간이 끝나면 새 판을 막는다');
  assert.ok(pv.includes('if (!ps.first.has(p.id)) ps.first.set(p.id, g.ok);'), '판정은 처음 낸 것');
  assert.ok(pv.includes('if (!ps || ps.grade || !g || !g.valid) return;'), '다 채우지 않은 것은 채점하지 않는다');
  assert.ok(pv.includes("const answers = [...ps.first.entries()].map(([id, ok]) => ({ id, ok, from: ps.from.get(id) || 0 }));"));
  assert.ok(pv.includes('  if (ps.i < n && !ps.saving) {'), '저장이 시작되면 그만하기 없음');
  const fin = pv.slice(pv.indexOf('async function finishSession(ctx) {'), pv.indexOf('function finishEl(ctx) {'));
  const between = fin.slice(fin.indexOf('res = await korPuzzleFinish('), fin.indexOf('const egg = await ctx.tickKorDay();'));
  assert.ok(between.length > 0 && !/\breturn\b/.test(between), '🥚 칸은 화면이 바뀌어도');
  assert.ok(pv.includes("deal: p.kind === 'order' ? shuffledOrder(p.chunks.length) : p.kind === 'time' ? p.told.slice() : p.kind === 'agree' ? dealChoices(p) : null"), '조각은 섞어서(바른 차례 아님) · ⏰ 일어난 차례는 글 차례 그대로(v297) · 🔗 끝 보기도 섞어서(v294)');
  const sw = read('sw.js');
  for (const f of ['./js/korpuzzle.js', './js/korpuzzleview.js', './coach/korean/puzzles.json']) assert.ok(sw.includes(`'${f}',`), f);
  assert.match(read('tools/check.mjs'), /checkPuzzles\(puzzles, cards\)/);
  const xp = read('js/xp.js');
  assert.ok(xp.includes('korPuzzle: {}, korPuzzleDay: {}') && xp.includes('korPuzzle: wordsOf(p.korPuzzle), korPuzzleDay: wordDaysOf(p.korPuzzleDay)'), 'xp 빈 프로필·복사');
  const db = read('js/db.js');
  assert.ok(db.includes('korPuzzle: {}, korPuzzleDay: {}') && db.includes('korPuzzle: wordsOf(cur.korPuzzle), korPuzzleDay: wordDaysOf(cur.korPuzzleDay)'), 'db 빈 프로필·복사');
  assert.ok(db.includes('out.korPuzzle = mergePuzzles(cur.korPuzzle, rec.korPuzzle);') && db.includes('out.korPuzzleDay = mergeWordDays(cur.korPuzzleDay, rec.korPuzzleDay);'), 'db 병합');
});

test('🧩 화면(Codex 55차): 그만하기 — 놓은 조각·고른 칸도 한 것 · 다시 풀면 확인을 거둠 · 초점 — 누른 [사실]/[의견] 단추 · 새 퍼즐은 첫 조각이나 첫 [사실]', () => {
  const pv = read('js/korpuzzleview.js');
  const quitAt = pv.indexOf('if (!didWork(ps) || ps.quitAsk) {'); // v315: 그만둔 자리를 적는 줄이 사이에
  assert.ok(quitAt > 0 && pv.slice(quitAt, quitAt + 400).includes('S.ps = null; ctx.toPuzzle(); return;'), '한 것이 있으면 한 번 더 묻는다');
  assert.ok(pv.includes('return ps.first.size > 0 || ps.placed.length > 0 || ps.labels.some(Boolean) || ps.picks.some(Boolean) || ps.ends.some((c) => c !== undefined);'), '놓은 조각·고른 칸(📍 있어요·없어요 · 🔗 고른 끝도)도 한 것');
  const chunk = pv.slice(pv.indexOf("const b = el('button', 'kor-pchunk'"), pv.indexOf('pool.appendChild(b);'));
  const undo = pv.slice(pv.indexOf("undo.addEventListener('click'"), pv.indexOf('tools.appendChild(undo);'));
  const reset = pv.slice(pv.indexOf("reset.addEventListener('click'"), pv.indexOf('tools.appendChild(reset);'));
  const fo = pv.slice(pv.indexOf("const b = el('button', `kor-pfo"), pv.indexOf('btns.appendChild(b);'));
  for (const [name, s] of [['조각', chunk], ['하나 빼기', undo], ['처음부터', reset], ['사실·의견', fo]]) assert.ok(s.length > 0 && s.includes('ps.quitAsk = false;'), `${name}: 다시 풀면 확인을 거둔다`);
  assert.ok(fo.includes('ps.focus = `fo:${k}:${fo}`;'), '누른 단추에 초점');
  assert.ok(pv.includes("fo ? (card.querySelectorAll('.kor-psort')[Number(fo[1])] || card).querySelector(`.kor-pfo.is-${fo[2]}`)"));
  assert.ok(pv.includes("focusTo === 'start' || focusTo === 'pool' ? card.querySelector('.kor-pchunk:not(:disabled), .kor-pfo:not(:disabled), .kor-pcheck:not(:disabled)')"), '새 퍼즐 — 첫 조각·첫 [사실]');
  assert.ok(pv.includes("quitAsk: false, focus: 'start', practice: !!practice, t0 };"), '판을 시작하면 첫 퍼즐에 초점 (v315 — 연습 판인지·시작 시각도)');
});

test('🧩 v244 이야기 흐름 둘 — 「홍길동전」(O15)·「양반전」(O16)은 그 글에 ★이 있어야 열림 · 실마리에 맞는 차례가 하나뿐', () => {
  for (const [id, card] of [['O15', 'K32'], ['O16', 'K33']]) {
    const p = byId(id);
    assert.deepEqual([p.kind, p.ask, p.card, p.chunks.length], ['order', 'event', card, 4], id);
    assert.ok(!isOpen(p, {}) && isOpen(p, { [`${card}:1`]: D0 }), `${id}: ${card}에 ★이 있어야`);
    assert.deepEqual(validOrders(4, p.need), [[0, 1, 2, 3]], id);
  }
  assert.ok(!planPuzzles(LIST, {}, {}, T0).some((p) => p.id === 'O15' || p.id === 'O16'), '★ 없으면 안 나온다');
});
