// 📍 글에 있나요? (v259 국어 3단계 3-2, 2026-10-15 아버님 "이대로 진행") — 원고(있어요는 줄 + 그 줄에만 있는 원문 조각 · 없어요는 까닭) ·
// 채점(있어요는 줄까지) · 열림(그 글에 ★) · 한 판(차례 1 + 글에 있나요 1 + 사실·의견 1) · 고쳐 볼 말 · 화면 연결
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  IO, KINDS, KIND_LIST, PLAY_ORDER, INTEXT_MIN, INTEXT_MAX, QUOTE_MIN, SOLVED, PUZZLE_COINS,
  checkPuzzles, allPuzzles, isOpen, planPuzzles, gradeIntext, puzzleStats, korPuzzleRule, intextWhy, normText, overlapScore, bestOverlap,
} from '../js/korpuzzle.js';
import { dayNum } from '../js/korean.js';
import { emptyProfile, cloneProfile } from '../js/db.js';
import { korReportText } from '../js/korreport.js';
import { allWords } from '../js/korwords.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const DATA = JSON.parse(read('coach/korean/puzzles.json'));
const CARDS = JSON.parse(read('coach/korean/reading.json')).cards;
const LIST = allPuzzles(DATA, CARDS);
const INS = LIST.filter((p) => p.kind === 'intext');
const IDS = LIST.map((p) => p.id);
const T0 = new Date(2026, 9, 15, 12, 0, 0).getTime();
const D0 = dayNum(T0);
const clone = (x) => JSON.parse(JSON.stringify(x));
const byId = (id) => LIST.find((p) => p.id === id);
const raw = (ps, id) => ps.find((x) => x.id === id);
/** 모든 글에 ★ */
const ALL_STAR = Object.fromEntries(CARDS.map((c) => [`${c.id}:1`, D0]));
/** 바른 답 */
const rightPicks = (p) => p.sents.map((s) => (s.io === 'in' ? { io: 'in', line: s.line } : { io: 'out' }));
/** 그 글 카드가 이미 가르친 말 — 물음마다 정답 보기 · 물음+정답 · 근거 풀이·끝 풀이·둘째 힌트를 문장으로 나눠 */
const taught = (c) => (c.qs || []).flatMap((q) => [
  ...(q.opts || []).filter((o) => o.ok).flatMap((o) => [o.t, `${q.q} ${o.t}`]),
  ...['evNote', 'doneNote', 'hint2'].flatMap((k) => String(q[k] || '').split(/[.!?]|—/)),
]).map((x) => x.trim()).filter((x) => x.length >= 4);
const taughtMax = (t, c) => Math.max(0, ...taught(c).map((x) => overlapScore(t, x)));

test('📍 원고: 검사 통과 · 12퍼즐 61문장 · 글 12편(줄로 된 연습 글 · 🎧·시 아님 · 이야기 흐름 🧩와 겹치지 않음) · 있어요 수는 2~4로 여러 가지 · 퍼즐마다 실제로는 맞는 말 하나 · 원문 조각은 그 줄에 글자 그대로 · 카드 물음이 가르친 말은 없어요로 두지 않음', () => {
  assert.deepEqual(checkPuzzles(DATA, CARDS), []);
  assert.deepEqual(INS.map((p) => p.id), Array.from({ length: 12 }, (_, i) => `I${i + 1}`));
  assert.deepEqual(INS.map((p) => p.card), ['K2', 'K11', 'K43', 'K44', 'K13', 'K21', 'K22', 'K24', 'K15', 'K45', 'K47', 'K48']);
  assert.equal(INS.reduce((n, p) => n + p.sents.length, 0), 61);
  const orderCards = new Set(LIST.filter((p) => p.kind === 'order' && p.card).map((p) => p.card));
  const ins = [];
  for (const p of INS) {
    const c = CARDS.find((x) => x.id === p.card);
    assert.ok(c.kind === 'practice' && Array.isArray(c.lines) && !c.listen && !c.stanzas, `${p.id}: 줄로 된 연습 글`);
    assert.ok(!orderCards.has(p.card), `${p.id}: 🧩 이야기 흐름 글과 다른 글`);
    assert.deepEqual(p.lines, c.lines, `${p.id}: 글 줄을 그대로 싣는다`);
    assert.equal(p.title, c.title);
    assert.ok(p.sents.length >= INTEXT_MIN && p.sents.length <= INTEXT_MAX, p.id);
    const nIn = p.sents.filter((s) => s.io === 'in').length;
    ins.push(nIn);
    assert.ok(nIn >= 2 && nIn <= 4 && nIn < p.sents.length, `${p.id}: 있어요 ${nIn}`);
    assert.equal(p.sents.filter((s) => s.real).length, 1, `${p.id}: 실제로는 맞지만 글에는 없는 말 하나`);
    for (const s of p.sents) {
      assert.ok([...s.t].length <= 90 && !s.t.includes('?'), s.t);
      if (s.io === 'in') {
        assert.ok(p.lines[s.line - 1].includes(s.quote), `${p.id}: 조각 "${s.quote}"이 ${s.line}번 줄에 글자 그대로(화면에서 굵게)`);
        const where = p.lines.map((l, i) => i + 1).filter((n) => normText(p.lines[n - 1]).includes(normText(s.quote)));
        assert.deepEqual(where, [s.line], `${p.id}: 조각은 그 줄에만 — 줄 답이 하나`);
        assert.ok([...normText(s.quote)].length >= QUOTE_MIN);
      } else {
        assert.ok(s.why.length > 0 && !('line' in s) && !('quote' in s));
        // 겹침은 의심 표시일 뿐(판정이 아니다) — 지금 원고의 없어요 문장은 모두 어느 줄과도 반 넘게 겹치지 않는다
        assert.ok(bestOverlap(s.t, p.lines).score < 0.5, `${p.id}: ${s.t}`);
        // 그 글의 물음이 이미 짐작하게 가르친 말(정답·풀이)도 없어요로 두지 않는다 — 배운 아이는 "글에 있다"고 여길 수 있다 (Codex 70차)
        assert.ok(taughtMax(s.t, c) < 0.5, `${p.id}: ${s.t} — 카드가 가르친 말과 겹침 ${taughtMax(s.t, c).toFixed(2)}`);
        if (s.real) assert.match(s.why, /^실제로/, `${p.id}: 실제로는 맞는 말은 까닭이 "실제로 …"로 시작`);
        else assert.doesNotMatch(s.why, /^실제로/);
      }
    }
  }
  assert.deepEqual([...new Set(ins)].sort(), [2, 3, 4], '있어요 수가 퍼즐마다 다르다(늘 같은 수면 세어서 맞힌다)');
  assert.ok(!INS.some((p) => p.card === 'K25' || p.card === 'K17'), '일부러 틀린 말을 넣은 고쳐 쓰기 글은 쓰지 않는다');
  // 위 검사가 잡는 꼴 — K47-2가 "'정구지'는 표준어로 무엇일까요? → 부추"를 ⑥번 줄로 짐작하게 가르친다
  assert.ok(taughtMax("'정구지'는 '부추'를 이르는 방언이다.", CARDS.find((x) => x.id === 'K47')) >= 0.5);
});

test('📍 원고 검사가 잡는 것 — 하나씩만 틀리게: card · 없는 카드 · 시·🎧 글 · 카드 목록 없음 · 문장 수 · 같은 문장 · 길이 · 물음 · io · 있어요의 why·line·조각(짧음·그 줄에 없음·글자 그대로 아님·다른 줄에도) · 없어요의 line·why·글 옮기기 · real 자리 · 한쪽만 · id·kind', () => {
  const bad = (edit, re, cards = CARDS) => { const d = clone(DATA); edit(d.puzzles); const e = checkPuzzles(d, cards); assert.ok(e.some((m) => re.test(m)), `${re} — ${e.join(' / ')}`); };
  const I1 = (ps) => raw(ps, 'I1');
  bad((ps) => { I1(ps).card = 'X2'; }, /card는 K숫자/);
  bad((ps) => { I1(ps).card = 'K999'; }, /없는 카드 K999/);
  bad((ps) => { I1(ps).card = 'K3'; }, /K3는 줄로 된 읽기 글이 아니에요/); // 시
  bad((ps) => { I1(ps).card = 'K36'; }, /K36는 줄로 된 읽기 글이 아니에요/); // 🎧
  bad(() => {}, /글 카드와 함께 검사해요/, null); // undefined를 넘기면 기본값(CARDS)이 들어간다
  bad((ps) => { I1(ps).sents.splice(3); }, new RegExp(`sents는 ${INTEXT_MIN}~${INTEXT_MAX}개`));
  bad((ps) => { const s = I1(ps).sents; s.push(clone(s[1]), clone(s[3])); }, /sents는/);
  bad((ps) => { const s = I1(ps).sents; s[3].t = `${s[1].t.slice(0, -1)} .`; }, /앞 문장과 같아요/); // 띄어쓰기·문장부호만 다름
  bad((ps) => { I1(ps).sents[3].t = '가'.repeat(91); }, /90자까지/);
  bad((ps) => { I1(ps).sents[3].t = '글쓴이는 남극에 가 보았을까?'; }, /물음은 안 돼요/);
  bad((ps) => { I1(ps).sents[0].io = 'IN'; }, /io는 in 또는 out/);
  bad((ps) => { I1(ps).sents[0].why = '까닭'; }, /있어요 문장은 why 없이/);
  for (const line of [0, 9, '2', 2.5]) bad((ps) => { I1(ps).sents[0].line = line; }, /line은 1~8/);
  bad((ps) => { I1(ps).sents[0].quote = '두 달'; }, /quote\(원문 조각\)는/);
  bad((ps) => { delete I1(ps).sents[0].quote; }, /quote\(원문 조각\)는/);
  bad((ps) => { I1(ps).sents[0].line = 3; }, /quote "두 달 넘게 품는다"가 3번 줄에 없어요/);
  bad((ps) => { I1(ps).sents[0].quote = '두 달넘게 품는다'; }, /quote "두 달넘게 품는다"는 2번 줄과 글자 그대로 같게/); // 띄어쓰기만 다름 — 화면이 굵게 못 칠한다
  bad((ps) => { Object.assign(I1(ps).sents[0], { line: 3, quote: '수컷들은' }); }, /다른 줄\(8\)에도 있어요/); // ③·⑧ 둘 다 "수컷들은"
  bad((ps) => { I1(ps).sents[1].line = 2; }, /없어요 문장에는 line·quote를/);
  bad((ps) => { I1(ps).sents[1].why = ' '; }, /why\(까닭\)가 비었어요/);
  bad((ps) => { I1(ps).sents[1].why = '가'.repeat(121); }, /why는 120자까지/);
  bad((ps) => { I1(ps).sents[3].t = '무리의 안쪽은 바깥쪽보다 훨씬  따뜻하다'; }, /글을 그대로 옮겼어요/); // ⑤ 줄 — 띄어쓰기·마침표만 다름
  bad((ps) => { I1(ps).sents[0].real = true; }, /real\(실제로는 맞는 말\)은/);
  bad((ps) => { I1(ps).sents[1].real = 'yes'; }, /real\(실제로는 맞는 말\)은/);
  bad((ps) => { for (const s of I1(ps).sents) if (s.io === 'out') { Object.assign(s, { io: 'in', line: 5, quote: '훨씬 따뜻하다' }); delete s.why; delete s.real; } }, /있어요와 없어요가 하나 이상씩/);
  bad((ps) => { for (const s of I1(ps).sents) if (s.io === 'in') { Object.assign(s, { io: 'out', why: '까닭' }); delete s.line; delete s.quote; } }, /있어요와 없어요가 하나 이상씩/);
  bad((ps) => { I1(ps).id = 'O99'; }, /id는 I숫자/);
  bad((ps) => { I1(ps).kind = 'where'; }, /kind는 order · sort · intext/);
  // 바른 원고는 다 통과 — 검사가 늘 무언가를 잡아서 위가 통과한 것이 아니다
  assert.deepEqual(checkPuzzles(clone(DATA), CARDS), []);
  // 깨진 퍼즐·카드 없는 원고는 앱이 빼고 쓴다
  const d = clone(DATA);
  raw(d.puzzles, 'I2').sents[0].line = 3;
  assert.ok(!allPuzzles(d, CARDS).some((p) => p.id === 'I2') && allPuzzles(d, CARDS).length === LIST.length - 1);
  assert.equal(allPuzzles(DATA).filter((p) => p.kind === 'intext').length, 0, '카드 없이는 글에 있나요를 쓰지 않는다');
  // 견줌 꼴 · 겹침
  assert.equal(normText(' 「토끼전」을 읽고, 이야기를 — 나누었다. '), '토끼전을읽고이야기를나누었다');
  assert.equal(normText('영하 -3.5도, 1. 첫째 날-둘째 날'), '영하-3.5도1첫째날둘째날', '수의 소수점·수 앞 빼기표는 남긴다(뜻이 바뀐다)');
  assert.notEqual(normText('3.5'), normText('35'));
  assert.equal(overlapScore('남극의 겨울', '남극의 겨울'), 1);
  assert.equal(overlapScore('가나', '다라'), 0);
  assert.deepEqual(bestOverlap('안쪽은 따뜻하다', byId('I1').lines).n, 5);
});

test('📍 채점: 있어요는 줄까지 맞아야 · 없어요는 없어요면 맞음 · 하나라도 비었거나 줄 없는 있어요·이상한 값이면 채점하지 않음(희소 배열·글자 객체 포함)', () => {
  const p = byId('I1');
  const right = rightPicks(p);
  assert.deepEqual(gradeIntext(p, right), { valid: true, ok: true, right: 5, n: 5 });
  const lineWrong = clone(right); lineWrong[0] = { io: 'in', line: 3 };
  assert.deepEqual(gradeIntext(p, lineWrong), { valid: true, ok: false, right: 4, n: 5 }, '있어요인데 줄이 다르면 틀림');
  const saidOut = clone(right); saidOut[0] = { io: 'out' };
  assert.deepEqual(gradeIntext(p, saidOut), { valid: true, ok: false, right: 4, n: 5 });
  const saidIn = clone(right); saidIn[1] = { io: 'in', line: 2 };
  assert.deepEqual(gradeIntext(p, saidIn), { valid: true, ok: false, right: 4, n: 5 }, '없는 말을 있어요(어느 줄이든)는 틀림');
  const outWithLine = clone(right); outWithLine[1] = { io: 'out', line: 2 };
  assert.equal(gradeIntext(p, outWithLine).ok, true, '없어요에 남은 줄 값은 보지 않는다');
  const allOut = p.sents.map(() => ({ io: 'out' }));
  assert.deepEqual(gradeIntext(p, allOut), { valid: true, ok: false, right: 2, n: 5 }, '모두 없어요 — 없어요 문장만 맞음');
  const bads = [
    right.slice(0, 4), [...right, { io: 'out' }], null, 'x',
    right.map((x, i) => (i === 0 ? { io: 'in' } : x)),
    right.map((x, i) => (i === 0 ? { io: 'in', line: 0 } : x)),
    right.map((x, i) => (i === 0 ? { io: 'in', line: 9 } : x)),
    right.map((x, i) => (i === 0 ? { io: 'in', line: '2' } : x)),
    right.map((x, i) => (i === 0 ? { io: 'IN', line: 2 } : x)),
    right.map((x, i) => (i === 1 ? { io: new String('out') } : x)), // eslint-disable-line no-new-wrappers
    right.map((x, i) => (i === 1 ? 'out' : x)),
    right.map((x, i) => (i === 1 ? [{ io: 'out' }] : x)),
  ];
  for (const b of bads) assert.equal(gradeIntext(p, b).valid, false, JSON.stringify(b));
  const hole = clone(right); delete hole[2];
  assert.equal(gradeIntext(p, hole).valid, false, '가운데 빈 칸');
  const holeEnd = clone(right).slice(0, 4); holeEnd.length = 5;
  assert.equal(gradeIntext(p, holeEnd).valid, false, '끝 빈 칸');
  for (const q of INS) assert.equal(gradeIntext(q, rightPicks(q)).ok, true, `${q.id}: 원고 답이 정답`);
});

test('📍 열림·한 판: 그 글에 ★이 있어야 열림 · 판 = 차례 → 글에 있나요 → 사실·의견 · 다른 꼴이 다 끝나면 글에 있나요로 채움 · 틀리면 다음 날 먼저 · 연습은 ⭐만 · 꼴마다 셈', () => {
  const p = byId('I1');
  assert.ok(!isOpen(p, {}) && !isOpen(p, { 'K11:1': D0 }) && isOpen(p, { 'K2:1': D0 }));
  assert.ok(!isOpen({ ...p, card: '' }, ALL_STAR), 'card 없는 글에 있나요는 열지 않는다');
  assert.deepEqual(PLAY_ORDER, ['order', 'intext', 'sort', 'agree']); // v294 🔗 앞뒤 어울리기는 끝에
  assert.deepEqual(KIND_LIST, ['order', 'sort', 'intext', 'agree']);
  assert.deepEqual(planPuzzles(LIST, {}, ALL_STAR, T0).map((x) => x.id), ['O1', 'I1', 'F1', 'H1']);
  assert.deepEqual(planPuzzles(LIST, {}, { 'K2:1': D0 }, T0).map((x) => x.id), ['O11', 'I1', 'F1', 'H1'], '★ 하나뿐 — 그 글의 글에 있나요만');
  const done = (kinds) => Object.fromEntries(LIST.filter((x) => kinds.includes(x.kind)).map((x) => [x.id, { box: SOLVED, due: 0, at: 1, miss: 0, d0: D0 }]));
  assert.deepEqual(planPuzzles(LIST, done(['order', 'sort']), ALL_STAR, T0).map((x) => x.id), ['I1', 'H1', 'I2', 'I3'], '다른 꼴을 다 풀면 글에 있나요로 채움(🔗 하나는 그대로)');
  assert.deepEqual(planPuzzles(LIST, done(['intext', 'sort']), ALL_STAR, T0).map((x) => x.kind), ['order', 'agree', 'order', 'order']);
  const st = { I3: { box: 0, due: D0 + 1, at: 5, miss: 1, d0: D0 }, I1: { box: SOLVED, due: 0, at: 2, miss: 0, d0: D0 } };
  assert.deepEqual(planPuzzles(LIST, st, ALL_STAR, T0).map((x) => x.id), ['O1', 'I2', 'F1', 'H1'], '오늘은 틀린 I3·⭐ I1이 안 나온다');
  assert.deepEqual(planPuzzles(LIST, st, ALL_STAR, T0 + 86400000).map((x) => x.id), ['O1', 'I3', 'F1', 'H1'], '다음 날 — 틀린 퍼즐이 먼저');
  assert.deepEqual(planPuzzles(LIST, st, ALL_STAR, T0, true).map((x) => x.id), ['I1'], '연습은 ⭐만');
  assert.deepEqual(puzzleStats(LIST, st, ALL_STAR).find((x) => x.kind === 'intext'), { kind: 'intext', total: 12, open: 12, solved: 1, tried: 1 });
  assert.deepEqual(puzzleStats(LIST, st, { 'K2:1': D0 }).find((x) => x.kind === 'intext'), { kind: 'intext', total: 12, open: 1, solved: 1, tried: 0 });
  // 보상은 꼴과 상관없이 판으로 — 글에 있나요를 넣은 3개를 모두 한 번에 → 🟩
  const prof = cloneProfile({ ...emptyProfile(), coins: 0, coinsEarned: 0, korThrow: { earned: 0, used: 0, refunded: 0 }, items: {} });
  const r = korPuzzleRule(prof, ['O1', 'I1', 'F1'].map((id) => ({ id, ok: true, from: 0 })), T0, IDS);
  assert.deepEqual([r.first, r.coins, r.stone, r.okN, prof.korPuzzle.I1.box], [true, PUZZLE_COINS, 1, 3, SOLVED]);
  const r2 = korPuzzleRule(prof, [{ id: 'I2', ok: false, from: 0 }], T0 + 1000, IDS);
  assert.deepEqual([r2.first, prof.korPuzzle.I2.box, prof.korPuzzle.I2.due], [false, 0, D0 + 1]);
});

test('📍 고쳐 볼 말: 있어요는 바른 줄과 원문 조각 · 줄만 틀렸으면 "글에 있는 내용은 맞아요" · 없어요는 "글에서는 확인할 수 없어요 — 까닭"(틀린 말이라 하지 않음)', () => {
  const p = byId('I1');
  const [a, b] = p.sents;
  assert.equal(intextWhy(a, { io: 'in', line: 2 }, true), '✓ 글에 있어요 — ②번 줄 “두 달 넘게 품는다”');
  assert.equal(intextWhy(a, { io: 'out' }, false), '✗ 글에 있어요 — ②번 줄 “두 달 넘게 품는다”');
  assert.equal(intextWhy(a, { io: 'in', line: 3 }, false), '✗ 글에 있는 내용은 맞아요. 그런데 ③번 줄이 아니라 ②번 줄에 있어요 — “두 달 넘게 품는다”');
  assert.equal(intextWhy(b, { io: 'out' }, true), `✓ 글에서는 확인할 수 없어요 — ${b.why}`);
  assert.equal(intextWhy(b, { io: 'in', line: 2 }, false), `✗ 글에서는 확인할 수 없어요 — ${b.why}`);
  for (const q of INS) for (const s of q.sents) assert.doesNotMatch(intextWhy(s, null, false), /틀린 말|거짓/, '없는 말을 틀린 말이라 가르치지 않는다');
  assert.deepEqual(IO, { in: '글에 있어요', out: '글에 없어요' });
  assert.deepEqual(KINDS.intext, { icon: '📍', ko: '글에 있나요?' });
});

test('📍 화면 연결: 확인은 모두 골랐을 때만(gradeIntext) · 판정은 처음 낸 것 · 다음 퍼즐에서 고른 것을 비움 · 줄은 고를 때만 단추 · 문장은 가·나·다 · 초점(보이게) · 글 상자 읽던 자리 · 어느 문장의 줄인지 읽어 줌 · 글에서 보기 · 시작 단추 · 요약·sw·css', () => {
  const pv = read('js/korpuzzleview.js');
  assert.ok(pv.includes("p && p.kind === 'intext' ? intextEl(ctx, p)"), '글에 있나요 한 장');
  assert.ok(pv.includes('check.disabled = !gradeIntext(p, p.sents.map((_, j) => ps.picks[j])).valid;'), '모두 골라야 확인');
  assert.ok(pv.includes("check.addEventListener('click', () => submit(ctx, p, gradeIntext(p, p.sents.map((_, j) => ps.picks[j]))));"));
  assert.ok(pv.includes('if (!ps.first.has(p.id)) ps.first.set(p.id, g.ok);'), '판정은 처음 낸 것(차례·가르기와 같은 submit)');
  const next = pv.slice(pv.indexOf('function nextItem(ctx) {'), pv.indexOf('async function finishSession(ctx) {'));
  assert.ok(next.includes('ps.picks = [];') && next.includes('ps.lineFor = -1;'), '다음 퍼즐로 갈 때 고른 것을 비운다');
  assert.ok(pv.includes("const b = el(picking ? 'button' : 'div', 'kor-pline');"), '줄은 고를 때만 단추');
  assert.ok(pv.includes('const picking = !g && ps.lineFor >= 0;'), '확인 뒤에는 줄을 못 고른다');
  assert.ok(pv.includes("const LETTERS = ['가', '나', '다', '라', '마', '바'];") && LETTERS_OK(pv));
  assert.ok(pv.includes('const fo = /^fo:(\\d+):(fact|opinion|in|out)$/.exec(focusTo);'), '누른 [있어요]/[없어요]에 초점');
  assert.ok(pv.includes("focusTo === 'pline' ? plineTarget(card, ps)"), '[있어요] 뒤 글의 줄에 초점');
  // Codex 70차 — 글 상자 읽던 자리 · 바꾸기는 고른 줄 · 초점 간 것이 보이게 · 어느 문장의 줄인지 읽어 줌 · 확인 뒤 [글에서 보기]
  const target = pv.slice(pv.indexOf('function plineTarget(card, ps) {'), pv.indexOf('function inBox('));
  assert.ok(target.includes('if (mine) return mine;') && target.includes("lines.find((b) => b.getBoundingClientRect().top >= top - 2) || lines[0] || null"), '바꾸는 중이면 고른 줄, 아니면 상자에 보이는 첫 줄');
  assert.ok(pv.includes("roll.addEventListener('scroll', () => { if (S.ps === ps) ps.pinTop = roll.scrollTop; }, { passive: true });"), '굴린 자리를 적어 둔다');
  assert.ok(pv.includes('if (roll && ps.pinTop) roll.scrollTop = ps.pinTop;'), '다시 그리면 그 자리로');
  assert.ok(next.includes('ps.pinTop = 0;'), '다음 퍼즐은 글 처음부터');
  assert.ok(pv.includes('    if (pin) showFocused(t);'), '📍 초점 간 것이 보이게');
  assert.ok(pv.includes(": pin && !ps.grade && ps.lineFor >= 0 ? `「${LETTERS[ps.lineFor]}」 문장 — 그 내용을 직접 말하는 줄을 글에서 골라 주세요` : '';") && pv.includes('if (live.textContent !== say) live.textContent = say;'), '어느 문장의 줄을 고르는지 읽어 준다');
  assert.ok(pv.includes("b.setAttribute('aria-label', `「${LETTERS[ps.lineFor]}」 문장의 줄로 ${n}번 줄 고르기: ${t}`);"), '줄 단추 이름에 문장 글자');
  assert.ok(pv.includes("if (s.io === 'in') {\n      const show = el('button', 'btn btn-small kor-pin-show',") || pv.includes("if (s.io === 'in') {\r\n      const show = el('button', 'btn btn-small kor-pin-show',"), '확인 뒤 있어요 문장마다 [글에서 보기]');
  assert.ok(pv.includes("show.addEventListener('click', () => showLine(show, p, s.line));"));
  assert.equal((pv.match(/직접 말하는 줄/g) || []).length, 4, '안내 넷 — 물음 · 글 상자 · 문장 칸 · 읽어 주기');
  assert.ok(pv.includes("t ? `글에 있나요 ${t}` : ''"), '시작 단추에 글에 있나요 수');
  for (const fn of ['function setIo(ctx, k, io) {', 'function pickLine(ctx, p, n) {']) {
    const body = pv.slice(pv.indexOf(fn), pv.indexOf('\n}\n', pv.indexOf(fn)));
    assert.ok(body.includes('if (!ps || ps.grade') && body.includes('ps.quitAsk = false;'), `${fn} — 확인 뒤에는 못 바꾸고, 다시 고르면 그만하기 물음을 거둔다`);
  }
  const css = read('css/style.css');
  for (const c of ['.kor-pin-text { position: sticky;', 'button.kor-pline {', '.kor-pfo.is-in.is-on', '.kor-pfo.is-out.is-on', '.kor-psort.is-waiting', '.kor-ptag.is-no', '.kor-pin-scroll { flex: 0 1 auto; min-height: 0; overflow: auto;', '.kor-pline.is-flash { animation: kor-pin-flash', '@keyframes kor-pin-flash {']) assert.ok(css.includes(c), c);
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(read('sw.js')) || [])[1]) >= 259, 'sw는 v259 이상');
  // 📤 국어 요약 — 퍼즐 절에 글에 있나요 줄
  const words = allWords(JSON.parse(read('coach/korean/words.json')), CARDS);
  const txt = korReportText({ ...emptyProfile(), korDone: { 'K2:1': D0 } }, { cards: CARDS, words, puzzles: LIST }, new Date(T0), 7);
  assert.ok(txt.includes('- 📍 글에 있나요?: ⭐ 0 · 풀어 봤지만 아직 ⭐ 아님 0 · 열린 1 / 전체 12'), txt.slice(txt.indexOf('## 🧩')));
});

function LETTERS_OK(pv) {
  return pv.includes("tp.appendChild(el('b', 'kor-pin-letter', LETTERS[k]));");
}
