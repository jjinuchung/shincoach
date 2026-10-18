// 🔗 앞뒤 어울리기 (v294, 2026-10-19 아버님 "① 문장 호응 짧은 퍼즐 가자") — 원고에 열 개 남짓뿐인 문장 호응 연습을 한 문장짜리로 ·
// 원고(짝 말 한 번 · 바른 끝 하나 · 짝 조각은 바른 끝에만) · 채점 · 보기 섞기(바른 끝이 늘 같은 자리에 있지 않게) · 한 판(늘 열림 · 하루 하나) · 보상 길 · 화면 연결
// node --test tests/koragree294.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  KINDS, KIND_LIST, PLAY_ORDER, AGREE_PER_DAY, PUZZLES_PER_DAY, AGREE_MIN, AGREE_MAX, AGREE_NO_MAX, AGREE_TYPES, SOLVED,
  checkPuzzles, allPuzzles, isOpen, planPuzzles, gradeAgree, dealChoices, agreeSentence, puzzleStats, korPuzzleRule,
} from '../js/korpuzzle.js';
import { dayNum } from '../js/korean.js';
import { emptyProfile, cloneProfile } from '../js/db.js';
import { korReportText } from '../js/korreport.js';
import { allWords } from '../js/korwords.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const DATA = JSON.parse(read('coach/korean/puzzles.json'));
const CARDS = JSON.parse(read('coach/korean/reading.json')).cards;
const LIST = allPuzzles(DATA, CARDS);
const AGS = LIST.filter((p) => p.kind === 'agree');
const RAW = DATA.puzzles.filter((p) => p.kind === 'agree');
const T0 = new Date(2026, 9, 19, 12, 0, 0).getTime();
const D0 = dayNum(T0);
const byId = (id) => LIST.find((p) => p.id === id);
const right = (p) => p.items.map(() => 0);
/** 원고 한 묶음을 바꿔 검사만 돌린다 */
const errsOf = (mut) => {
  const p = JSON.parse(JSON.stringify(RAW[0]));
  mut(p);
  return checkPuzzles({ puzzles: [p] }, CARDS);
};

test('🔗 원고: 열 묶음 H1~H10 · 문장 쉰 · 검사 통과 · 짝 갈래 열이 모두 둘 이상 · 짝 말은 앞부분에 한 번 · 짝 조각은 바른 끝에만 · 끝은 서로 다르다', () => {
  assert.deepEqual(checkPuzzles(DATA, CARDS), []);
  assert.deepEqual(AGS.map((p) => p.id), ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7', 'H8', 'H9', 'H10']);
  assert.equal(AGS.reduce((n, p) => n + p.items.length, 0), 50);
  const types = {};
  for (const p of AGS) {
    assert.ok(p.items.length >= AGREE_MIN && p.items.length <= AGREE_MAX, p.id);
    for (const [k, x] of p.items.entries()) {
      const at = `${p.id}-${k + 1}`;
      types[x.type] = (types[x.type] || 0) + 1;
      assert.equal(x.pre.split(x.key).length, 2, `${at} 짝 말 한 번`);
      assert.ok(x.choices.length >= 2 && x.choices.length <= AGREE_NO_MAX + 1, at);
      assert.equal(new Set(x.choices).size, x.choices.length, `${at} 끝이 서로 다르다`);
      if (x.mate) {
        assert.ok(x.choices[0].includes(x.mate), `${at} 짝 조각은 바른 끝에`);
        assert.ok(x.choices.slice(1).every((c) => !c.includes(x.mate)), `${at} 짝 조각은 어울리지 않는 끝에 없다`);
      } else assert.equal(x.type, 'thing', `${at} 짝 조각이 없는 것은 "사람만 높여요"뿐`);
      assert.match(agreeSentence(x, 0), /[요다]\.$/, `${at} 바른 문장은 마침표로 끝난다`);
      assert.equal(/undefined|null/.test(agreeSentence(x, 0)), false);
    }
  }
  assert.deepEqual(Object.keys(types).sort(), Object.keys(AGREE_TYPES).sort(), '짝 갈래 열이 모두 나온다');
  for (const [t, n] of Object.entries(types)) assert.ok(n >= 2, `${t} ${n}개`);
  // 원고 그대로 옮겼나 — choices[0]이 end · 나머지가 no 차례대로
  RAW.forEach((r, i) => r.items.forEach((x, k) => assert.deepEqual(AGS[i].items[k].choices, [x.end, ...x.no])));
});

test('🔗 원고 검사가 막는 것 — 짝 말이 없거나 두 번 · 끝이 같음 · 끝에 문장부호 · 짝 조각이 틀린 끝에도 · 바른 끝에 없는 짝 조각 · 모르는 갈래 · 긴 까닭·문장 · 묶음 크기 · 물음', () => {
  assert.deepEqual(errsOf(() => {}), []);
  const has = (mut, word) => { const e = errsOf(mut); assert.ok(e.some((m) => m.includes(word)), `${word}: ${e.join(' / ')}`); };
  has((p) => { p.items[0].key = '절대'; }, '꼭 한 번');
  has((p) => { p.items[0].pre = '결코 나는 친구와 한 약속을 결코'; }, '꼭 한 번');
  has((p) => { p.items[0].no = ['잊지 않을 거예요']; }, '끝이 서로 같아요');
  has((p) => { p.items[0].no = []; }, 'no(어울리지 않는 끝)');
  has((p) => { p.items[0].no = ['잊을 거예요', '잊었어요', '잊어요']; }, 'no(어울리지 않는 끝)');
  has((p) => { p.items[0].end = '잊지 않을 거예요.'; }, '문장부호');
  has((p) => { p.items[0].no = ['잊지 않았어요']; }, '어울리지 않는 끝에도');
  has((p) => { p.items[0].mate = '없'; }, '바른 끝에 없어요');
  has((p) => { p.items[0].type = 'grammar'; }, 'type은');
  has((p) => { p.items[0].why = '가'.repeat(121); }, 'why는');
  has((p) => { p.items[0].pre = `${'가'.repeat(80)} 결코`; }, '문장은');
  has((p) => { p.items = p.items.slice(0, 3); }, 'items는');
  has((p) => { p.items.push(...p.items.slice(0, 2).map((x, k) => ({ ...x, pre: `${x.pre} 다른${k}` }))); }, 'items는');
  has((p) => { p.items[1].pre = p.items[0].pre; p.items[1].key = p.items[0].key; }, '앞부분이 같아요');
  has((p) => { p.items[0].pre = '나는 약속을 결코 잊었니?'; }, '물음은');
  has((p) => { p.id = 'A1'; }, 'id는 H숫자');
  has((p) => { p.items[0].end = ' 잊지 않을 거예요'; }, '빈칸');
  // 깨진 묶음은 쓸 수 있는 퍼즐에서 빠진다
  const bad = JSON.parse(JSON.stringify(RAW[0]));
  bad.items[0].key = '절대';
  assert.equal(allPuzzles({ puzzles: [bad] }, CARDS).length, 0);
});

test('🔗 채점 — 0이 바른 끝 · 다 맞으면 ok · 하나 틀리면 맞은 수 · 빈 칸·모르는 번호·길이가 틀리면 valid false', () => {
  const p = byId('H1');
  assert.deepEqual(gradeAgree(p, right(p)), { valid: true, ok: true, right: 5, n: 5 });
  assert.deepEqual(gradeAgree(p, [0, 1, 0, 0, 0]), { valid: true, ok: false, right: 4, n: 5 });
  assert.deepEqual(gradeAgree(p, [1, 1, 1, 1, 1]), { valid: true, ok: false, right: 0, n: 5 });
  for (const bad of [[0, 0, 0, 0], [0, 0, 0, 0, 0, 0], [0, , 0, 0, 0], [0, 2, 0, 0, 0], [0, -1, 0, 0, 0], [0, 0.5, 0, 0, 0], [0, '0', 0, 0, 0], null, undefined, 'x']) { // eslint-disable-line no-sparse-arrays
    assert.equal(gradeAgree(p, bad).valid, false, JSON.stringify(bad));
  }
  assert.equal(gradeAgree(null, []).valid, false);
  for (const q of AGS) assert.equal(gradeAgree(q, right(q)).ok, true, `${q.id}: 원고 답이 정답`);
  assert.equal(agreeSentence(p.items[0], 0), '나는 친구와 한 약속을 결코 잊지 않을 거예요.');
  assert.equal(agreeSentence(p.items[0], 1), '나는 친구와 한 약속을 결코 잊을 거예요.');
});

test('🔗 보기 섞기 — 문장마다 끝 번호를 고르게 섞는다 · 바른 끝이 첫째에도 둘째에도 나온다(늘 피하면 늘 둘째) · rng가 끝값이어도 번호가 빠지지 않는다', () => {
  const rng = (seed) => { let s = seed >>> 0 || 1; return () => { s = (s * 1103515245 + 12345) >>> 0; return (s >>> 8) / 16777216; }; };
  const p = byId('H1');
  const firstAt = new Set();
  for (let s = 1; s <= 200; s++) {
    const d = dealChoices(p, rng(s));
    assert.equal(d.length, p.items.length);
    d.forEach((a, k) => assert.deepEqual([...a].sort(), p.items[k].choices.map((_, i) => i), `씨앗 ${s} 문장 ${k + 1}`));
    firstAt.add(d[0].indexOf(0));
  }
  assert.deepEqual([...firstAt].sort(), [0, 1], '바른 끝이 두 자리 모두에 나온다');
  for (const f of [() => 0, () => 0.9999, () => NaN, () => 1]) for (const a of dealChoices(p, f)) assert.deepEqual([...a].sort(), [0, 1]);
  assert.deepEqual(dealChoices(null), []);
  // 세 보기도 세 자리 모두에
  const three = { items: [{ choices: ['가', '나', '다'] }] };
  const pos = new Set();
  for (let s = 1; s <= 300; s++) pos.add(dealChoices(three, rng(s))[0].indexOf(0));
  assert.deepEqual([...pos].sort(), [0, 1, 2]);
});

test('🔗 한 판 — 읽은 글 없이 늘 열림 · 하루 하나(판은 넷) · 원고 차례로 새 묶음 · 틀리면 다음 날 먼저 · ⭐는 연습으로만 · 다 풀면 다른 꼴로 채움 · 꼴마다 셈', () => {
  assert.deepEqual([AGREE_PER_DAY, PUZZLES_PER_DAY], [1, 4]);
  assert.deepEqual(KINDS.agree, { icon: '🔗', ko: '앞뒤 어울리기' });
  assert.equal(KIND_LIST[KIND_LIST.length - 1], 'agree');
  assert.equal(PLAY_ORDER[PLAY_ORDER.length - 1], 'agree');
  for (const p of AGS) assert.ok(isOpen(p, {}), `${p.id} 늘 열림`);
  const none = planPuzzles(LIST, {}, {}, T0);
  assert.equal(none.filter((x) => x.kind === 'agree').length, 1);
  assert.equal(none.find((x) => x.kind === 'agree').id, 'H1');
  const st = { H1: { box: 0, due: D0 + 1, at: 5, miss: 1, d0: D0 }, H2: { box: SOLVED, due: 0, at: 6, miss: 0, d0: D0 } };
  assert.equal(planPuzzles(LIST, st, {}, T0).find((x) => x.kind === 'agree').id, 'H3', '오늘은 틀린 H1·⭐ H2가 안 나온다');
  assert.equal(planPuzzles(LIST, st, {}, T0 + 86400000).find((x) => x.kind === 'agree').id, 'H1', '다음 날 — 틀린 묶음이 먼저');
  assert.deepEqual(planPuzzles(LIST, st, {}, T0, true).map((x) => x.id), ['H2'], '연습은 ⭐만');
  const allAgree = Object.fromEntries(AGS.map((p) => [p.id, { box: SOLVED, due: 0, at: 1, miss: 0, d0: D0 }]));
  const filled = planPuzzles(LIST, allAgree, {}, T0);
  assert.equal(filled.length, PUZZLES_PER_DAY);
  assert.equal(filled.some((x) => x.kind === 'agree'), false, '다 풀면 다른 꼴로');
  assert.deepEqual(puzzleStats(LIST, st, {}).find((x) => x.kind === 'agree'), { kind: 'agree', total: 10, open: 10, solved: 1, tried: 1 });
});

test('🔗 보상 길 — 다른 퍼즐과 같은 판 규칙(처음 낸 것 · 다 맞히면 ⭐ · 틀리면 다음 날) · 넷을 모두 한 번에 맞히면 🟩', () => {
  const ids = LIST.map((p) => p.id);
  const p = cloneProfile({ ...emptyProfile(), coins: 0 });
  const res = korPuzzleRule(p, [{ id: 'O11', ok: true }, { id: 'F1', ok: true }, { id: 'H1', ok: true }, { id: 'O12', ok: true }], T0, ids);
  assert.equal(res.ok, true);
  assert.equal(res.stone, 1, '넷 다 한 번에');
  assert.ok(res.solved.includes('H1'));
  assert.equal(p.korPuzzle.H1.box, SOLVED);
  const q = cloneProfile({ ...emptyProfile(), coins: 0 });
  const r2 = korPuzzleRule(q, [{ id: 'H1', ok: false }, { id: 'F1', ok: true }, { id: 'O11', ok: true }], T0, ids);
  assert.equal(r2.stone, 0);
  assert.deepEqual([q.korPuzzle.H1.box, q.korPuzzle.H1.due], [0, D0 + 1]);
});

test('🔗 화면 연결 — 끝 보기는 판을 시작할 때 섞고 · 고른 끝(ends)은 한 것으로 세고 다음 퍼즐에서 비우고 · 확인은 gradeAgree · 시작 단추·소개 말 · 스타일 · 📤 국어 요약 줄', () => {
  const pv = read('js/korpuzzleview.js');
  assert.ok(pv.includes("p.kind === 'agree' ? dealChoices(p) : null"));
  assert.ok(pv.includes("p && p.kind === 'agree' ? agreeEl(ctx, p, it)"));
  assert.ok(pv.includes('ps.ends.some((c) => c !== undefined)'));
  assert.match(pv, /ps\.picks = \[\];\n {2}ps\.ends = \[\];\n {2}ps\.lineFor = -1;/, '다음 퍼즐에서 고른 끝을 비운다');
  assert.ok(pv.includes('submit(ctx, p, gradeAgree(p, p.items.map((_, k) => ps.ends[k])))'));
  assert.ok(pv.includes("a ? `앞뒤 어울리기 ${a}` : ''"));
  assert.ok(pv.includes('문장의 앞뒤가 어울리게 끝을 골라요'));
  assert.ok(pv.includes('for (const j of it.deal[k])'), '보기는 섞은 차례로');
  assert.ok(pv.includes('boldIn(right, x.choices[0], x.mate, true);'), '짝 조각은 낱말 덩이로 굵게("않" → "않을")');
  assert.ok(pv.includes("if (whole) { k = text.lastIndexOf(' ', k) + 1; const sp = text.indexOf(' ', e); e = sp < 0 ? text.length : sp; }"));
  assert.ok(pv.includes('const end = /^end:(\\d+):(\\d+)$/.exec(focusTo);') && pv.includes('.querySelector(`.kor-pend[data-c="${end[2]}"]`)'), '다시 그려도 누른 끝 단추에 초점');
  const css = read('css/style.css');
  for (const c of ['.kor-pfo.kor-pend.is-on {', '.kor-pblank {', '.kor-pfill {', '.kor-pmate {']) assert.ok(css.includes(`\n${c}`), c);
  const txt = korReportText({ ...emptyProfile() }, { cards: CARDS, words: allWords(JSON.parse(read('coach/korean/words.json')), CARDS), puzzles: LIST }, new Date(T0), 7);
  assert.match(txt, /🔗 앞뒤 어울리기: ⭐ 0 · 풀어 봤지만 아직 ⭐ 아님 0 · 열린 10 \/ 전체 10/);
});

test('🔍 Codex 100차 — 틀린 끝도 말이 되던 문항 셋 바꿈(H4-2 아마+해야 · H9-4 색종이를 그리다 · H4-5 배지는 관동 리그) · 마치 까닭은 비유를 틀렸다고 하지 않음 · 높임 해설은 그 문장에만 · 섞기는 0 아래 rng도 · 넷 중 셋이면 🟩 없음 · 같은 날 다시 끝내면 보상 없음', () => {
  const item = (pid, k) => byId(pid).items[k - 1];
  assert.equal(item('H4', 2).type, 'must', 'H4-2는 반드시 문항');
  assert.equal(AGS.some((p) => p.items.some((x) => x.choices.includes('도착해야 해요'))), false);
  assert.match(item('H4', 5).pre, /^관동 지방의 포켓몬 리그/);
  assert.deepEqual([item('H9', 4).key, item('H9', 4).choices], ['피아노를', ['쳤어요', '불었어요']]);
  assert.equal(AGS.some((p) => p.items.some((x) => x.choices.includes('그렸어요'))), false);
  for (const p of AGS) for (const x of p.items) {
    if (x.type === 'like') assert.equal(/아니에요|아니니까요/.test(x.why), false, `${p.id} 마치 까닭이 비유를 틀렸다고 함: ${x.why}`);
    if (x.type === 'thing') assert.match(x.why, /^높일 분은 손님이에요/);
  }
  assert.equal(AGREE_TYPES.thing, '음료·값은 높이지 않아요');
  for (const f of [() => -1, () => -Infinity, () => -0.5]) for (const a of dealChoices(byId('H1'), f)) assert.deepEqual([...a].sort(), [0, 1], '0 아래 rng도 보기가 빠지지 않는다');
  // 넷 중 셋 → 🟩 없음 · 같은 날 다시 끝내면 💰·🎯·🟩 없음(⭐는 모인다)
  const ids = LIST.map((p) => p.id);
  const p = cloneProfile({ ...emptyProfile(), coins: 0 });
  const r1 = korPuzzleRule(p, [{ id: 'O11', ok: true }, { id: 'F1', ok: true }, { id: 'H1', ok: false }, { id: 'O12', ok: true }], T0, ids);
  assert.deepEqual([r1.first, r1.coins, r1.stone, r1.okN, r1.n], [true, 10, 0, 3, 4]);
  const r2 = korPuzzleRule(p, [{ id: 'O13', ok: true }, { id: 'F2', ok: true }, { id: 'H2', ok: true }, { id: 'O14', ok: true }], T0 + 60000, ids);
  assert.deepEqual([r2.first, r2.coins, r2.stone], [false, 0, 0]);
  assert.ok(r2.solved.includes('H2'), '⭐는 모인다');
  assert.equal(p.coins, 10);
});
