// ⏰ 일어난 차례 (v297, 2026-10-19 아버님 "1부터 하고 2,3,4 순서로" → "이대로 진행") — 잘못 읽기 '때 헷갈리기'를 따로 연습 ·
// 짧은 글(일기·이야기·기사·편지)을 쓰인 차례 그대로 보여 주고, 카드를 일이 실제로 일어난 차례로 놓는다 ·
// 원고(글 차례 ≠ 일어난 차례 · 때 말은 조각마다 꼭 한 번 · 실마리는 때 말) · 채점(gradeOrder를 같이 씀) · 한 판(차례 칸을 차례 맞추기와 번갈아 — 판은 그대로 넷) ·
// 보상 길 · 화면 연결
// node --test tests/kortime297.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  KINDS, KIND_LIST, PLAY_ORDER, SLOT_OF, PUZZLES_PER_DAY, SOLVED, TIME_MIN, TIME_MAX, TIME_FORMS, TIME_BANNED,
  checkPuzzles, allPuzzles, isOpen, planPuzzles, gradeOrder, puzzleStats, korPuzzleRule,
} from '../js/korpuzzle.js';
import { dayNum } from '../js/korean.js';
import { emptyProfile, cloneProfile } from '../js/db.js';
import { korReportText } from '../js/korreport.js';
import { allWords } from '../js/korwords.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const DATA = JSON.parse(read('coach/korean/puzzles.json'));
const CARDS = JSON.parse(read('coach/korean/reading.json')).cards;
const LIST = allPuzzles(DATA, CARDS);
const TIMES = LIST.filter((p) => p.kind === 'time');
const RAW = DATA.puzzles.filter((p) => p.kind === 'time');
const T0 = new Date(2026, 9, 19, 12, 0, 0).getTime();
const D0 = dayNum(T0);
const byId = (id) => LIST.find((p) => p.id === id);
const ident = (p) => p.chunks.map((_, i) => i);
const errsOf = (mut, base = RAW[0]) => {
  const p = JSON.parse(JSON.stringify(base));
  mut(p);
  return checkPuzzles({ puzzles: [p] }, CARDS);
};
const solvedAt = (ids, at) => Object.fromEntries(ids.map((id) => [id, { box: SOLVED, due: 0, at, miss: 0, d0: D0 }]));

// 박아 둔 표 — 글에 쓰인 차례(조각 번호 · 조각은 일어난 차례로 적혀 있다) · 갈래 · 조각 수 (원고를 바꾸면 여기도 손으로)
const EXPECT = {
  T1: ['일기', [3, 0, 1, 2, 4]],
  T2: ['이야기', [3, 0, 1, 2]],
  T3: ['기사', [3, 0, 1, 2]],
  T4: ['일기', [2, 1, 0, 3, 4]],
  T5: ['이야기', [1, 2, 0, 3]],
  T6: ['편지', [2, 0, 1, 3, 4]],
  T7: ['이야기', [3, 0, 1, 2, 4]],
  T8: ['기사', [3, 4, 0, 1, 2]],
  T9: ['일기', [3, 2, 0, 1, 4]],
  T10: ['일기', [2, 0, 1, 3]],
};
/** 시험이 따로 푸는 풀이 — 모든 차례를 넣어 보아 [앞, 뒤]를 모두 지키는 것 (규칙 파일의 validOrders를 쓰지 않는다) */
function solveByHand(n, need) {
  const out = [];
  const walk = (cur) => {
    if (cur.length === n) {
      if (need.every((r) => cur.indexOf(r[0]) < cur.indexOf(r[1]))) out.push(cur.join(','));
      return;
    }
    for (let i = 0; i < n; i++) if (!cur.includes(i)) walk([...cur, i]);
  };
  walk([]);
  return out;
}

test('⏰ 원고: 열 묶음 T1~T10 · 조각 마흔여섯 · 검사 통과 · 박아 둔 글 차례 · 시험이 따로 풀어도 답은 원고 차례 하나 · 글 차례로 내면 틀림', () => {
  assert.deepEqual(checkPuzzles(DATA, CARDS), []);
  assert.deepEqual(TIMES.map((p) => p.id), Object.keys(EXPECT));
  assert.equal(TIMES.reduce((n, p) => n + p.chunks.length, 0), 46);
  for (const p of TIMES) {
    const [form, told] = EXPECT[p.id];
    assert.equal(p.form, form, p.id);
    assert.deepEqual(p.told, told, `${p.id} 글 차례`);
    assert.ok(p.chunks.length >= TIME_MIN && p.chunks.length <= TIME_MAX, p.id);
    assert.deepEqual(solveByHand(p.chunks.length, p.need), [ident(p).join(',')], `${p.id}: 실마리로 정해지는 차례는 원고 차례 하나`);
    assert.equal(gradeOrder(p, p.told).ok, false, `${p.id}: 글 차례 그대로는 틀림`);
    assert.ok(p.told.some((k, i) => k !== i), p.id);
    p.need.forEach((r) => assert.ok(r[2] === p.keys[r[0]] || r[2] === p.keys[r[1]], `${p.id} 실마리 ${r[2]}는 굵은 때 말`));
    p.chunks.forEach((t, k) => {
      assert.equal(t.split(p.keys[k]).length, 2, `${p.id} 조각 ${k + 1}에 때 말 한 번`);
      p.keys.forEach((w, j) => { if (j !== k) assert.equal(t.includes(w), false, `${p.id} 조각 ${k + 1}에 다른 조각의 때 말 ${w}`); });
      assert.equal(TIME_BANNED.test(t), false, t);
      assert.equal(/동생|언니|누나|형이|형과|형은|형도|오빠/.test(t), false, `가족을 지어내지 않는다: ${t}`);
      const end = form === '일기' || form === '기사' ? /다\.$/ : form === '이야기' ? /요\.$/ : /[지어야]\.$/;
      assert.match(t, end, `${p.id} ${form}의 문장 끝`);
    });
  }
  for (const f of TIME_FORMS) assert.ok(TIMES.some((p) => p.form === f), `갈래 ${f}`);
  RAW.forEach((r, i) => assert.deepEqual(TIMES[i], { id: r.id, kind: 'time', title: r.title, icon: r.icon, form: r.form, chunks: r.chunks, told: r.told, keys: r.keys, need: r.need }));
});

test('⏰ 원고 검사가 막는 것 — 글 차례 = 일어난 차례 · told 꼴 · 때 말(없음·두 번·다른 조각에도·같음·수) · 실마리가 때 말 아님 · 차례가 둘 · 섞인 때 · 갈래 · 낫표 · 크기 · 번호', () => {
  assert.deepEqual(errsOf(() => {}), []);
  const has = (mut, word, base) => { const e = errsOf(mut, base); assert.ok(e.some((m) => m.includes(word)), `${word}: ${e.join(' / ')}`); };
  has((p) => { p.told = [0, 1, 2, 3, 4]; }, 'told가 일어난 차례와 같아요');
  has((p) => { p.told = [3, 0, 1, 2, 2]; }, 'told는');
  has((p) => { p.told = [3, 0, 1, 2]; }, 'told는');
  has((p) => { p.told = [3, 0, 1, 2, 5]; }, 'told는');
  has((p) => { delete p.told; }, 'told는');
  has((p) => { p.keys[0] = '석 달 전'; }, '꼭 한 번');
  has((p) => { p.chunks[3] = '오늘 줄넘기 대회에서 나는 오늘 백 번을 넘었다.'; }, '꼭 한 번');
  has((p) => { p.chunks[4] = '내일은 오늘 대회 이야기를 친구들에게 해 줄 것이다.'; }, '조각 5에도');
  has((p) => { p.keys[4] = '오늘'; p.chunks[4] = '오늘 밤에는 일찍 잘 것이다.'; }, '때 말이 서로 같아요');
  has((p) => { p.keys = p.keys.slice(0, 4); }, 'keys는');
  has((p) => { p.need[0][2] = '저녁마다'; }, '때 말이어야');
  has((p) => { p.need = p.need.slice(1); }, '가지예요');
  has((p) => { p.chunks[4] = '내일은 반 친구들에게 비결을 알려 주기로 했다.'; p.keys[4] = '내일은'; }, '한 조각엔 한 때만');
  has((p) => { p.chunks[4] = '내일은 반 친구들에게 비결을 알려 주려고 한다.'; p.keys[4] = '내일은'; }, '한 조각엔 한 때만');
  has((p) => { p.chunks[3] = '오늘 대회에서 "백 번!" 하고 외쳤다.'; }, '한 조각엔 한 때만');
  has((p) => { p.form = '동시'; }, 'form은');
  has((p) => { p.title = '「줄넘기 대회」'; }, '낫표');
  has((p) => { p.chunks = p.chunks.slice(0, 3); }, 'chunks는');
  has((p) => { p.chunks.push('모레는 쉬는 날이다.'); }, 'chunks는');
  has((p) => { p.need[0][3] = '가'.repeat(121); }, '까닭은');
  has((p) => { p.id = 'O99'; }, 'id는 T숫자');
  // 🔍 Codex 103차 — 마음먹은 때와 할 때가 섞인 문장도 막는다
  has((p) => { p.chunks[4] = '내일은 반 친구들에게 연습 비결을 알려 주기로 마음먹었다.'; p.keys[4] = '내일은'; }, '한 조각엔 한 때만');
  has((p) => { p.chunks[4] = '내일은 반 친구들에게 연습 비결을 알려 주려고 마음먹었다.'; p.keys[4] = '내일은'; }, '한 조각엔 한 때만');
  has((p) => { p.chunks[4] = '내일은 반 친구들에게 연습 비결을 알려 주기로 결심했다.'; p.keys[4] = '내일은'; }, '한 조각엔 한 때만');
  // 바뀔 수 있는 말은 지나간다: "고치려고 문을 닫았다"는 한 때(그때 닫음)
  assert.equal(TIME_BANNED.test('어린이 공원은 지난봄에 낡은 놀이 기구를 바꾸려고 문을 닫았다.'), false);
  const bad = JSON.parse(JSON.stringify(RAW[0]));
  bad.told = [0, 1, 2, 3, 4];
  assert.equal(allPuzzles({ puzzles: [bad] }, CARDS).length, 0, '깨진 묶음은 빠진다');
});

test('⏰ 채점 — 차례 맞추기와 같은 gradeOrder · 일어난 차례만 맞음 · 칸마다 셈 · 빈 칸·겹침은 valid false', () => {
  const p = byId('T1');
  assert.deepEqual(gradeOrder(p, [0, 1, 2, 3, 4]), { valid: true, ok: true, right: 5, n: 5 });
  assert.deepEqual(gradeOrder(p, [3, 0, 1, 2, 4]), { valid: true, ok: false, right: 1, n: 5 }, '글 차례 그대로 — 내일만 맞음');
  for (const bad of [[0, 1, 2, 3], [0, 1, 2, 3, 3], [0, 1, 2, 3, 5], null]) assert.equal(gradeOrder(p, bad).valid, false, JSON.stringify(bad));
  for (const q of TIMES) assert.equal(gradeOrder(q, ident(q)).ok, true, `${q.id}: 원고 차례가 정답`);
});

test('⏰ 한 판 — 판은 넷 그대로 · 차례 칸을 차례 맞추기와 번갈아(오래 안 한 꼴부터 · 같으면 원고 차례) · 늘 열림 · 틀리면 다음 날 먼저 · 한쪽을 다 풀면 다른 쪽 · 연습은 ⭐ 둘 다', () => {
  assert.equal(PUZZLES_PER_DAY, 4);
  assert.deepEqual(KINDS.time, { icon: '⏰', ko: '일어난 차례' });
  assert.equal(KIND_LIST[KIND_LIST.length - 1], 'time');
  assert.deepEqual(PLAY_ORDER, ['order', 'intext', 'sort', 'agree'], '판의 칸은 그대로');
  assert.deepEqual(SLOT_OF, { exp: 'sort', time: 'order' });
  for (const p of TIMES) assert.ok(isOpen(p, {}));
  const slot = (st, now = T0) => planPuzzles(LIST, st, {}, now).filter((x) => x.kind === 'order' || x.kind === 'time').map((x) => x.id)[0];
  assert.equal(slot({}), 'O11', '둘 다 안 했으면 원고 차례(차례 맞추기 먼저)');
  assert.equal(slot(solvedAt(['O11'], 100)), 'T1', '차례 맞추기를 했으면 일어난 차례');
  assert.equal(slot({ ...solvedAt(['O11'], 100), ...solvedAt(['T1'], 200) }), 'O12', '일어난 차례를 더 나중에 했으면 차례 맞추기');
  const wrong = { O11: { box: 0, due: D0 + 1, at: 300, miss: 1, d0: D0 }, T1: { box: SOLVED, due: 0, at: 100, miss: 0, d0: D0 } };
  assert.equal(slot(wrong), 'T2', '오늘은 틀린 O11이 안 나오고, 차례 맞추기를 더 나중에 했으니 일어난 차례');
  assert.equal(slot(wrong, T0 + 86400000), 'O11', '다음 날 — 틀린 퍼즐이 먼저');
  const allOrder = solvedAt(LIST.filter((p) => p.kind === 'order').map((p) => p.id), 1);
  assert.equal(slot(allOrder), 'T1');
  const allTime = solvedAt(TIMES.map((p) => p.id), 1);
  assert.equal(slot(allTime), 'O11');
  assert.deepEqual(planPuzzles(LIST, { ...solvedAt(['O11'], 5), ...solvedAt(['T1'], 3) }, {}, T0, true).map((x) => x.id), ['T1', 'O11'], '연습은 ⭐ 둘 다 — 오래 안 본 것부터');
  assert.deepEqual(puzzleStats(LIST, solvedAt(['T1'], 1), {}).find((x) => x.kind === 'time'), { kind: 'time', total: 10, open: 10, solved: 1, tried: 0 });
  // 판 안에서 차례 칸 둘(모자란 칸을 채울 때)이 붙지 않게 · 같은 퍼즐 두 번 없음
  const plan = planPuzzles(LIST, solvedAt(LIST.filter((p) => p.kind !== 'order' && p.kind !== 'time').map((p) => p.id), 1), {}, T0);
  assert.equal(plan.length, 4);
  assert.equal(new Set(plan.map((x) => x.id)).size, 4);
  assert.ok(plan.every((x) => x.kind === 'order' || x.kind === 'time'));
});

test('🔍 Codex 103차 — 차례 칸 둘 다 틀린 것이 있으면 기한이 이른 것부터(양쪽으로) · 마지막 푼 때가 같으면 원고 차례(차례 맞추기)', () => {
  const pick = (st) => planPuzzles(LIST, st, {}, T0).find((x) => x.kind === 'order' || x.kind === 'time').id;
  assert.equal(pick({ O11: { box: 0, due: D0 - 1, at: 300, miss: 1, d0: D0 - 3 }, T1: { box: 0, due: D0 - 2, at: 100, miss: 1, d0: D0 - 3 } }), 'T1', '기한이 이른 T1이 먼저');
  assert.equal(pick({ O11: { box: 0, due: D0 - 3, at: 300, miss: 1, d0: D0 - 4 }, T1: { box: 0, due: D0 - 2, at: 100, miss: 1, d0: D0 - 3 } }), 'O11', '기한이 이른 O11이 먼저');
  assert.equal(pick({ ...solvedAt(['O11'], 100), ...solvedAt(['T1'], 100) }), 'O12', '같으면 원고 차례');
});

test('⏰ 보상 길 — 다른 퍼즐과 같은 판 규칙(처음 낸 것 · 다 맞히면 ⭐ · 틀리면 다음 날) · 넷 다 한 번에 🟩', () => {
  const ids = LIST.map((p) => p.id);
  const p = cloneProfile({ ...emptyProfile(), coins: 0 });
  const r = korPuzzleRule(p, [{ id: 'T1', ok: true }, { id: 'F1', ok: true }, { id: 'H1', ok: true }, { id: 'O11', ok: true }], T0, ids);
  assert.deepEqual([r.ok, r.first, r.coins, r.stone], [true, true, 10, 1]);
  assert.equal(p.korPuzzle.T1.box, SOLVED);
  const q = cloneProfile({ ...emptyProfile(), coins: 0 });
  korPuzzleRule(q, [{ id: 'T2', ok: false }], T0, ids);
  assert.deepEqual([q.korPuzzle.T2.box, q.korPuzzle.T2.due], [0, D0 + 1]);
});

test('⏰ 화면 연결 — 차례 맞추기 화면을 같이 씀 · 카드는 글 차례 그대로 · 글 상자(때 말 굵게) · 조각·칸에도 굵게 · 확인 뒤 글에서 몇째 · 시작 단추 · 소개 말 · 스타일 · 📤 국어 요약 줄', () => {
  const pv = read('js/korpuzzleview.js');
  assert.ok(pv.includes("p.kind === 'time' ? p.told.slice() :"), '섞지 않고 글 차례 그대로');
  assert.ok(pv.includes("const card = p && (p.kind === 'order' || p.kind === 'time') ? orderEl(ctx, p, it)"));
  assert.ok(pv.includes('if (time) {') && pv.includes('box.appendChild(toldEl(p));'), '글 상자는 ⏰에만');
  assert.ok(pv.includes("p.told.forEach((k, i) => { if (i) t.appendChild(document.createTextNode(' ')); boldIn(t, p.chunks[k], p.keys[k]); });"), '글은 쓰인 차례 · 때 말 굵게');
  assert.ok(pv.includes("const b = el('button', 'kor-pchunk');\n      boldIn(b, p.chunks[k], key(k));"), '조각 카드에도 때 말 굵게');
  assert.ok(pv.includes("li.appendChild(clueEl('span', 'kor-pslot-t', p.chunks[at], key(at)));"), '놓은 칸에도');
  assert.ok(pv.includes('const key = (k) => (time ? p.keys[k] : \'\');'), '차례 맞추기는 굵게 안 함(실마리는 확인 뒤에만)');
  assert.ok(pv.includes('`· 글에서 ${NTH[p.told.indexOf(k)] || \'\'} 문장`'), '확인 뒤 글에서 몇째');
  assert.ok(pv.includes("tm ? `일어난 차례 ${tm}` : ''"), '시작 단추');
  assert.ok(pv.includes('하는 차례·일이 실제로 일어난 차례를 맞추고'), '소개 말');
  const css = read('css/style.css');
  for (const c of ['.kor-ptold {', '.kor-ptold-h {', '.kor-ptold-t {', '.kor-porder-tag {']) assert.ok(css.includes(`\n${c}`), c);
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(read('sw.js')) || [])[1]) >= 297, 'sw 판 v297 이상');
  const txt = korReportText({ ...emptyProfile() }, { cards: CARDS, words: allWords(JSON.parse(read('coach/korean/words.json')), CARDS), puzzles: LIST }, new Date(T0), 7);
  assert.match(txt, /⏰ 일어난 차례: ⭐ 0 · 풀어 봤지만 아직 ⭐ 아님 0 · 열린 10 \/ 전체 10/);
});
