// ⚖️ 겪은 일·생각 가르기 (v295, 2026-10-19 아버님 고름) — 체험한 일을 쓴 문장을 겪은 일(한 일·본 일·들은 일) / 생각·느낌으로 ·
// 원고(마음 말은 생각·느낌에만 · 옮긴 말·물음 없음) · 채점(gradeSort를 같이 씀) · 한 판(사실·의견과 가르기 칸을 번갈아 — 판은 그대로 넷) · 보상 길 · 화면 연결
// node --test tests/korexp295.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  KINDS, KIND_LIST, PLAY_ORDER, SLOT_OF, EF, FELT_WORDS, EXP_BANNED, PUZZLES_PER_DAY, SORT_MIN, SORT_MAX, SOLVED,
  checkPuzzles, allPuzzles, isOpen, planPuzzles, gradeSort, puzzleStats, korPuzzleRule,
} from '../js/korpuzzle.js';
import { dayNum } from '../js/korean.js';
import { emptyProfile, cloneProfile } from '../js/db.js';
import { korReportText } from '../js/korreport.js';
import { allWords } from '../js/korwords.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const DATA = JSON.parse(read('coach/korean/puzzles.json'));
const CARDS = JSON.parse(read('coach/korean/reading.json')).cards;
const LIST = allPuzzles(DATA, CARDS);
const EXPS = LIST.filter((p) => p.kind === 'exp');
const RAW = DATA.puzzles.filter((p) => p.kind === 'exp');
const T0 = new Date(2026, 9, 19, 12, 0, 0).getTime();
const D0 = dayNum(T0);
const byId = (id) => LIST.find((p) => p.id === id);
const right = (p) => p.sents.map((s) => s.ef);
const errsOf = (mut) => {
  const p = JSON.parse(JSON.stringify(RAW[0]));
  mut(p);
  return checkPuzzles({ puzzles: [p] }, CARDS);
};
const solvedAt = (ids, at) => Object.fromEntries(ids.map((id) => [id, { box: SOLVED, due: 0, at, miss: 0, d0: D0 }]));

test('⚖️ 원고: 열 묶음 E1~E10 · 문장 쉰 · 검사 통과 · 묶음마다 겪은 일과 생각·느낌이 함께 · 마음 말은 생각·느낌에만 · 지어낸 형제 없음', () => {
  assert.deepEqual(checkPuzzles(DATA, CARDS), []);
  assert.deepEqual(EXPS.map((p) => p.id), ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9', 'E10']);
  assert.equal(EXPS.reduce((n, p) => n + p.sents.length, 0), 50);
  let did = 0;
  for (const p of EXPS) {
    assert.ok(p.sents.length >= SORT_MIN && p.sents.length <= SORT_MAX, p.id);
    assert.ok(p.sents.some((s) => s.ef === 'did') && p.sents.some((s) => s.ef === 'felt'), p.id);
    for (const s of p.sents) {
      if (s.ef === 'did') { did++; assert.equal(FELT_WORDS.test(s.t), false, `${p.id} 겪은 일에 마음 말: ${s.t}`); } else assert.ok(FELT_WORDS.test(s.t), `${p.id} 생각·느낌에 마음 말이 없음: ${s.t}`);
      assert.equal(EXP_BANNED.test(s.t), false, s.t);
      assert.equal(/동생|언니|누나|형이|형과|형은|오빠/.test(s.t), false, `가족을 지어내지 않는다: ${s.t}`);
      assert.match(s.t, /다\.$/, `${p.id} 체험한 일을 쓴 글의 문장(~다.)`);
    }
  }
  assert.ok(did >= 25 && did <= 32, `겪은 일 ${did} — 한쪽으로 몰리지 않게`);
  RAW.forEach((r, i) => r.sents.forEach((s, k) => assert.deepEqual(EXPS[i].sents[k], { t: s.t, ef: s.ef, why: s.why })));
});

test('⚖️ 원고 검사가 막는 것 — 라벨 · 겪은 일에 마음 말 · 생각·느낌에 마음 말 없음 · 따옴표·물음·드디어 · 같은 문장 · 한쪽만 · 크기 · 번호', () => {
  assert.deepEqual(errsOf(() => {}), []);
  const has = (mut, word) => { const e = errsOf(mut); assert.ok(e.some((m) => m.includes(word)), `${word}: ${e.join(' / ')}`); };
  has((p) => { p.sents[0].ef = 'fact'; }, 'ef는');
  has((p) => { p.sents[0].t = '우리 반은 신나게 버스를 타고 과학관에 갔다.'; }, '겪은 일 문장에 마음 말');
  has((p) => { p.sents[2].t = '공룡 뼈는 아주 컸다.'; }, '생각·느낌 문장에 마음 말이 없어요');
  has((p) => { p.sents[0].t = '선생님께서 "조용히 해요."라고 하셨다.'; }, '옮긴 말');
  has((p) => { p.sents[0].t = '과학관에 몇 시에 갔을까?'; }, '옮긴 말');
  has((p) => { p.sents[0].t = '드디어 과학관에 도착했다.'; }, '옮긴 말');
  // 🔍 Codex 101차 — 마음 말 망: '신을 신기'는 마음 말이 아니고 '좋다·좋아'는 마음 말
  assert.equal(FELT_WORDS.test('운동화를 신기 전에 양말을 신었다.'), false);
  assert.ok(FELT_WORDS.test('친구와 함께여서 기분이 좋다.') && FELT_WORDS.test('기분이 좋아서 노래를 불렀다.') && FELT_WORDS.test('정말 신기했다.'));
  has((p) => { p.sents[1].t = p.sents[0].t; }, '앞 문장과 같아요');
  has((p) => { for (const s of p.sents) s.ef = 'did'; }, '하나 이상씩');
  has((p) => { p.sents = p.sents.slice(0, 3); }, 'sents는');
  has((p) => { p.sents.push(...p.sents.slice(0, 2).map((s, k) => ({ ...s, t: `${s.t.slice(0, -1)} 또 ${k}.` }))); }, 'sents는');
  has((p) => { p.sents[0].why = '가'.repeat(121); }, 'why는');
  has((p) => { p.id = 'F99'; }, 'id는 E숫자');
  const bad = JSON.parse(JSON.stringify(RAW[0]));
  bad.sents[0].ef = 'x';
  assert.equal(allPuzzles({ puzzles: [bad] }, CARDS).length, 0, '깨진 묶음은 빠진다');
});

test('⚖️ 채점 — 겪은 일·생각은 did·felt만 · 사실·의견은 fact·opinion만(서로 섞이면 valid false) · 빈 칸·길이', () => {
  const p = byId('E1');
  assert.deepEqual(gradeSort(p, right(p)), { valid: true, ok: true, right: 5, n: 5 });
  const one = right(p);
  one[2] = one[2] === 'did' ? 'felt' : 'did';
  assert.deepEqual(gradeSort(p, one), { valid: true, ok: false, right: 4, n: 5 });
  for (const bad of [p.sents.map(() => 'fact'), right(p).slice(0, 4), [...right(p), 'did'], [, ...right(p).slice(1)], right(p).map((x, i) => (i ? x : 'toString')), null]) { // eslint-disable-line no-sparse-arrays
    assert.equal(gradeSort(p, bad).valid, false, JSON.stringify(bad));
  }
  const f = byId('F1');
  assert.equal(gradeSort(f, f.sents.map(() => 'did')).valid, false, '사실·의견에 겪은 일 단추는 없다');
  assert.equal(gradeSort(f, f.sents.map((s) => s.fo)).ok, true);
  for (const q of EXPS) assert.equal(gradeSort(q, right(q)).ok, true, `${q.id}: 원고 답이 정답`);
});

test('⚖️ 한 판 — 판은 넷 그대로 · 가르기 칸을 사실·의견과 번갈아(오래 안 한 꼴부터 · 같으면 원고 차례) · 늘 열림 · 틀리면 다음 날 먼저 · 한쪽을 다 풀면 다른 쪽 · 연습은 ⭐ 둘 다', () => {
  assert.equal(PUZZLES_PER_DAY, 4);
  assert.deepEqual(KINDS.exp, { icon: '⚖️', ko: '겪은 일·생각 가르기' });
  assert.ok(KIND_LIST.includes('exp'), '꼴 목록에 ⚖️ 겪은 일·생각 (v297부터 ⏰ 일어난 차례가 그 뒤)');
  assert.deepEqual(PLAY_ORDER, ['order', 'intext', 'sort', 'agree'], '판의 칸은 그대로');
  assert.equal(SLOT_OF.exp, 'sort');
  for (const p of EXPS) assert.ok(isOpen(p, {}));
  const slot = (st, now = T0) => planPuzzles(LIST, st, {}, now).filter((x) => x.kind === 'sort' || x.kind === 'exp').map((x) => x.id);
  assert.deepEqual(slot({}), ['F1'], '둘 다 안 했으면 원고 차례(사실·의견 먼저)');
  assert.deepEqual(slot(solvedAt(['F1'], 100)), ['E1'], '사실·의견을 했으면 겪은 일·생각');
  assert.deepEqual(slot({ ...solvedAt(['F1'], 100), ...solvedAt(['E1'], 200) }), ['F2'], '겪은 일·생각을 더 나중에 했으면 사실·의견');
  // 틀린 것은 다음 날 먼저(꼴과 상관없이)
  const wrong = { F1: { box: 0, due: D0 + 1, at: 300, miss: 1, d0: D0 }, E1: { box: SOLVED, due: 0, at: 100, miss: 0, d0: D0 } };
  assert.deepEqual(slot(wrong), ['E2'], '오늘은 틀린 F1이 안 나오고, 사실·의견을 더 나중에 했으니 겪은 일·생각');
  assert.deepEqual(slot(wrong, T0 + 86400000), ['F1'], '다음 날 — 틀린 퍼즐이 먼저');
  // 한쪽을 다 풀면 다른 쪽만
  const allSort = solvedAt(LIST.filter((p) => p.kind === 'sort').map((p) => p.id), 1);
  assert.deepEqual(slot(allSort), ['E1']);
  const allExp = solvedAt(EXPS.map((p) => p.id), 1);
  assert.deepEqual(slot(allExp), ['F1']);
  assert.deepEqual(planPuzzles(LIST, { ...solvedAt(['F1'], 5), ...solvedAt(['E1'], 3) }, {}, T0, true).map((x) => x.id), ['E1', 'F1'], '연습은 ⭐ 둘 다 — 오래 안 본 것부터');
  assert.deepEqual(puzzleStats(LIST, solvedAt(['E1'], 1), {}).find((x) => x.kind === 'exp'), { kind: 'exp', total: 10, open: 10, solved: 1, tried: 0 });
});

test('⚖️ 보상 길 — 다른 퍼즐과 같은 판 규칙(처음 낸 것 · 다 맞히면 ⭐ · 틀리면 다음 날) · 넷 다 한 번에 🟩', () => {
  const ids = LIST.map((p) => p.id);
  const p = cloneProfile({ ...emptyProfile(), coins: 0 });
  const r = korPuzzleRule(p, [{ id: 'O11', ok: true }, { id: 'E1', ok: true }, { id: 'H1', ok: true }, { id: 'O12', ok: true }], T0, ids);
  assert.deepEqual([r.ok, r.first, r.coins, r.stone], [true, true, 10, 1]);
  assert.equal(p.korPuzzle.E1.box, SOLVED);
  const q = cloneProfile({ ...emptyProfile(), coins: 0 });
  korPuzzleRule(q, [{ id: 'E2', ok: false }], T0, ids);
  assert.deepEqual([q.korPuzzle.E2.box, q.korPuzzle.E2.due], [0, D0 + 1]);
});

test('⚖️ 화면 연결 — 사실·의견 화면을 같이 씀(단추·안내·끝 말만 다름) · 초점 did·felt · 시작 단추 · 소개 말 · 스타일 · 📤 국어 요약 줄', () => {
  const pv = read('js/korpuzzleview.js');
  assert.ok(pv.includes("exp: { map: EF, key: 'ef', ask: '문장마다 겪은 일인지 생각·느낌인지 골라 보세요.'"));
  assert.ok(pv.includes('const side = SORT_SIDE[p.kind] || SORT_SIDE.sort;'));
  assert.ok(pv.includes('for (const fo of Object.keys(side.map))'), '단추는 그 꼴의 두 라벨');
  assert.ok(pv.includes('const ok = ps.labels[k] === s[side.key];'), '확인 뒤 ✓/✗도 그 꼴의 답으로');
  assert.ok(pv.includes("const fo = /^fo:(\\d+):(fact|opinion|did|felt|in|out)$/.exec(focusTo);"));
  assert.ok(pv.includes("e ? `겪은 일·생각 ${e}` : ''"));
  assert.ok(pv.includes('사실과 의견·겪은 일과 생각을 가리고'));
  assert.deepEqual(EF, { did: '겪은 일', felt: '생각·느낌' });
  const css = read('css/style.css');
  for (const c of ['.kor-pfo.is-did.is-on {', '.kor-pfo.is-felt.is-on {']) assert.ok(css.includes(`\n${c}`), c);
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(read('sw.js')) || [])[1]) >= 295, 'sw 판 v295 이상');
  const txt = korReportText({ ...emptyProfile() }, { cards: CARDS, words: allWords(JSON.parse(read('coach/korean/words.json')), CARDS), puzzles: LIST }, new Date(T0), 7);
  assert.match(txt, /⚖️ 겪은 일·생각 가르기: ⭐ 0 · 풀어 봤지만 아직 ⭐ 아님 0 · 열린 10 \/ 전체 10/);
});

test('🔍 Codex 101차 — 가르기 칸 둘 다 틀린 것이 있으면 기한이 이른 것부터 · 마지막 푼 때가 같으면 원고 차례(사실·의견) · 다른 칸이 다 끝나도 판 넷에 같은 퍼즐 두 번 없음', () => {
  const due = { F1: { box: 0, due: D0 - 1, at: 300, miss: 1, d0: D0 - 3 }, E1: { box: 0, due: D0 - 2, at: 100, miss: 1, d0: D0 - 3 } };
  assert.deepEqual(planPuzzles(LIST, due, {}, T0).filter((x) => x.kind === 'sort' || x.kind === 'exp').map((x) => x.id)[0], 'E1', '기한이 이른 E1이 먼저');
  const due2 = { F1: { box: 0, due: D0 - 3, at: 300, miss: 1, d0: D0 - 4 }, E1: { box: 0, due: D0 - 2, at: 100, miss: 1, d0: D0 - 3 } };
  assert.equal(planPuzzles(LIST, due2, {}, T0).find((x) => x.kind === 'sort' || x.kind === 'exp').id, 'F1');
  const tie = { ...solvedAt(['F1'], 100), ...solvedAt(['E1'], 100) };
  assert.equal(planPuzzles(LIST, tie, {}, T0).find((x) => x.kind === 'sort' || x.kind === 'exp').id, 'F2', '같으면 원고 차례');
  const others = solvedAt(LIST.filter((p) => p.kind === 'order' || p.kind === 'agree' || p.kind === 'intext' || p.kind === 'time').map((p) => p.id), 1); // v297 ⏰도 차례 칸
  const plan = planPuzzles(LIST, others, {}, T0);
  assert.equal(plan.length, 4);
  assert.equal(new Set(plan.map((x) => x.id)).size, 4, '같은 퍼즐 두 번 없음');
  assert.ok(plan.every((x) => x.kind === 'sort' || x.kind === 'exp'));
});
