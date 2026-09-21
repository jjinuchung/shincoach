// ❓ 아빠에게 묻기 — 수학 질문 왕복 (2026-09-21): node --test tests/mathask.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  askContext, addAsk, askedToday, pendingAskFor, openAsks, unreadAsks, activeAsks, applyReply, markAskRead, decideAsk, applyAskTry, closeAsk,
  askSummary, asksText, parseReplies, ASK_DAILY_MAX, ASKS_MAX, ASK_REWARD,
} from '../js/mathask.js';
import { emptyMath, mergeMath, mergeAsks } from '../js/db.js';
import { applyRound, REWARD, conceptReport, mathReportText } from '../js/mathprog.js';

const T = '2026-09-21';
const Q = { concept: 'frac.common', kind: 'why', key: '{mon} 통분 왜 #', q: '3/4과 1/6을 더하려면 왜 통분해야 할까요?', expr: '3/4 + 1/6', choices: [{ text: '분모가 달라서 크기를 맞춰야 해요', ok: true }, { text: '분모끼리 더하면 돼요', ok: false, tag: '분모끼리 더함' }] };
const A = { kind: 'why', correct: false, chosen: '분모끼리 더하면 돼요', tag: '분모끼리 더함', w: 'u' };
const known = () => { const m = emptyMath(); applyRound(m, 'frac.common', { correct: 3, total: 4, missTags: ['분모끼리 더함'], qs: [{ k: 'why', ok: 0, tag: '분모끼리 더함', key: Q.key }] }, T); return m; };

test('askContext: 문항+답에서 아빠가 받을 문맥(개념·얼굴·틀·문제·식·내 답·정답·오개념·이유)을 만든다', () => {
  const c = askContext(Q, A);
  assert.deepEqual(c, { concept: 'frac.common', k: 'why', key: Q.key, q: Q.q, expr: '3/4 + 1/6', my: '분모끼리 더하면 돼요', ans: '분모가 달라서 크기를 맞춰야 해요', tag: '분모끼리 더함', w: 'u' });
});

test('addAsk: 번호는 askSeq로 고정, 하루 3개, 같은 유형은 끝날 때까지 하나만', () => {
  const m = known();
  const r1 = addAsk(m, askContext(Q, A), T, '왜 분모는 안 더해요?');
  assert.equal(r1.ok, true); assert.equal(r1.ask.no, 1); assert.equal(r1.ask.status, 'asked'); assert.equal(r1.ask.kid, '왜 분모는 안 더해요?');
  assert.equal(askedToday(m, T), 1);
  assert.deepEqual(addAsk(m, askContext(Q, A), T), { ok: false, reason: 'dup' }, '같은 틀은 아빠 답이 올 때까지 하나');
  assert.ok(pendingAskFor(m, Q.key));
  addAsk(m, { ...askContext(Q, A), key: 'K2' }, T);
  addAsk(m, { ...askContext(Q, A), key: 'K3' }, T);
  assert.deepEqual(addAsk(m, { ...askContext(Q, A), key: 'K4' }, T), { ok: false, reason: 'limit' }, `하루 ${ASK_DAILY_MAX}개`);
  assert.equal(addAsk(m, { ...askContext(Q, A), key: 'K4' }, '2026-09-22').ok, true, '내일은 된다');
  assert.equal(m.askSeq, 4);
  assert.equal(m.asks[3].no, 4);
  assert.equal(openAsks(m).length, 4);
  assert.equal(unreadAsks(m).length, 0);
});

test('왕복: asked → applyReply → answered(☀️ 잠금) → 😄 understood → 문제 맞힘 → fixed + 🤔 노트 지움 + 일지', () => {
  const m = known();
  const { ask } = addAsk(m, askContext(Q, A), T);
  assert.equal(m.concepts['frac.common'].notes.length, 1, '틀린 유형이 노트에 있다');
  assert.equal(applyReply(m, 1, '  분모는 조각의 크기예요. 3/4은 4조각 중 3개, 1/6은 6조각 중 1개 — 조각 크기가 달라서 그냥 못 더해요.\n[bars 3/4 1/6]  '), true);
  assert.equal(ask.status, 'answered');
  assert.equal(ask.replies.length, 1);
  assert.ok(ask.replies[0].text.startsWith('분모는'), '앞뒤 공백은 잘라 저장');
  assert.equal(applyReply(m, 1, ask.replies[0].text), false, '같은 글은 다시 안 붙는다 (replies.json 멱등)');
  assert.deepEqual(unreadAsks(m).map((x) => x.no), [1], '안 읽은 답장 — ☀️가 잠긴다');
  assert.equal(openAsks(m).length, 0, '아빠 차례는 아니다');
  assert.equal(markAskRead(m, ask.id), true);
  assert.ok(ask.readAt > 0);
  assert.equal(decideAsk(m, ask.id, true), true);
  assert.equal(ask.status, 'understood');
  assert.equal(unreadAsks(m).length, 0);
  const wrong = applyAskTry(m, ask.id, false, T);
  assert.deepEqual(wrong, { ok: true, fixed: false });
  assert.equal(ask.status, 'understood', '틀리면 그대로 — 다시 해 볼 수 있다');
  assert.equal(ask.tries, 1);
  const right = applyAskTry(m, ask.id, true, T);
  assert.deepEqual(right, { ok: true, fixed: true });
  assert.equal(ask.status, 'fixed'); assert.equal(ask.tryOk, 1); assert.equal(ask.tries, 2);
  assert.deepEqual(m.concepts['frac.common'].notes, [], '답장으로 고친 유형은 노트에서 지운다');
  assert.ok(m.concepts['frac.common'].cleared[Q.key] > 0);
  const e = m.log[m.log.length - 1];
  assert.equal(e.id, 'ask'); assert.equal(e.ok, 1); assert.deepEqual(e.qs[0], { k: 'why', ok: 1, c: 'frac.common', no: 1 });
  assert.equal(applyAskTry(m, ask.id, true, T).fixed, false, '이미 고친 건 또 고친 게 아니다 (보상 두 번 없음)');
  assert.equal(applyReply(m, 1, '더 설명'), false, '끝난 질문엔 답장이 안 붙는다');
  assert.ok(ASK_REWARD.xp > REWARD.q.xp && ASK_REWARD.xp < REWARD.reviewPass.xp);
  // 📊
  const rep = conceptReport(m).find((r) => r.id === 'frac.common');
  assert.equal(rep.trail.length, 1, '답장 뒤 풀기는 통과 흔적이 아니다');
  assert.ok(mathReportText(m, T).includes('❓답장뒤풀기'));
});

test('😶 아직 모르겠어요 → again(한마디와 함께 아빠 차례) → 두 번째 답장 → answered', () => {
  const m = known();
  const { ask } = addAsk(m, askContext(Q, A), T);
  applyReply(m, 1, '첫 답장');
  assert.equal(decideAsk(m, ask.id, false, '조각 크기가 뭐예요?'), true);
  assert.equal(ask.status, 'again');
  assert.deepEqual(ask.again.map((x) => x.kid), ['조각 크기가 뭐예요?']);
  assert.deepEqual(openAsks(m).map((x) => x.no), [1], '다시 아빠 차례');
  assert.equal(decideAsk(m, ask.id, true), false, 'answered일 때만 정할 수 있다');
  assert.equal(applyAskTry(m, ask.id, true, T).ok, false, '이해했다고 하기 전엔 풀기가 없다');
  applyReply(m, 1, '두 번째 답장 — 조각 크기는 …');
  assert.equal(ask.status, 'answered'); assert.equal(ask.replies.length, 2);
  assert.equal(closeAsk(m, ask.id), true); assert.equal(ask.status, 'closed');
  assert.equal(activeAsks(m).length, 0);
  assert.deepEqual(askSummary(m), { asked: 0, answered: 0, again: 0, understood: 0, fixed: 0, closed: 1, total: 1 });
});

test('📋 복사문: 답할 차례인 것만, ❓번호·문맥·진우 말·이전 답장과 되물음', () => {
  const m = known();
  addAsk(m, askContext(Q, A), T, '왜 분모는 안 더해요?');
  addAsk(m, { ...askContext(Q, A), key: 'K2', expr: '', tag: '', w: '' }, T);
  applyReply(m, 2, '이건 곧 읽힐 답장');
  const txt = asksText(m, T);
  assert.ok(txt.includes('❓1 통분 · ③왜 · 2026-09-21'), txt);
  assert.ok(txt.includes('문제: 3/4과 1/6을'));
  assert.ok(txt.includes('식: 3/4 + 1/6'));
  assert.ok(txt.includes('진우 답: 분모끼리 더하면 돼요 ❌ (오개념: 분모끼리 더함) · 진우: 몰랐음'));
  assert.ok(txt.includes('정답: 분모가 달라서'));
  assert.ok(txt.includes('진우 말: "왜 분모는 안 더해요?"'));
  assert.ok(!txt.includes('❓2'), '답장이 온 것(answered)은 아빠 차례가 아니라 안 실린다');
  const ask1 = m.asks[0];
  applyReply(m, 1, '첫 답장\n둘째 줄');
  decideAsk(m, ask1.id, false, '조각이 뭐예요');
  const txt2 = asksText(m, T);
  assert.ok(txt2.includes('아빠 답장 1: 첫 답장 / 둘째 줄'));
  assert.ok(txt2.includes('→ 진우: 아직 모르겠어요 — "조각이 뭐예요"'));
});

test('💬 답 붙여넣기 파싱: 번호 블록(여러 줄), 같은 번호는 뒤의 것, 번호 없는 앞글은 버림', () => {
  const r = parseReplies(`Claude가 쓴 머리말은 무시\n💬1 분모는 조각의 크기예요.\n[bars 3/4 1/6]\n그래서 통분해요.\n\n💬 2: 두 번째 답\n💬1 다시 쓴 첫 답`);
  assert.deepEqual(r, [{ no: 1, text: '다시 쓴 첫 답' }, { no: 2, text: '두 번째 답' }]);
  assert.deepEqual(parseReplies(''), []);
  assert.deepEqual(parseReplies('💬3\n\n  '), [], '본문 없는 건 버림');
  const m = known();
  addAsk(m, askContext(Q, A), T);
  let n = 0;
  for (const b of parseReplies('💬1 답이에요\n💬9 없는 번호')) if (applyReply(m, b.no, b.text)) n++;
  assert.equal(n, 1);
});

test('🛟 병합: id로 합집합, 같은 질문은 늦게 바뀐 쪽 상태, 답장·되물음은 시각 합집합, askSeq는 큰 값', () => {
  const a = known();
  const { ask } = addAsk(a, askContext(Q, A), T);
  const b = JSON.parse(JSON.stringify(a));
  // 태블릿(a): 답장이 와서 읽고 이해함 / 폰(b, 옛 백업): 아직 asked
  applyReply(a, 1, '답장'); decideAsk(a, ask.id, true);
  const m1 = mergeMath(a, b);
  assert.equal(m1.asks.length, 1); assert.equal(m1.asks[0].status, 'understood'); assert.equal(m1.asks[0].replies.length, 1);
  const m2 = mergeMath(b, a);
  assert.equal(m2.asks[0].status, 'understood', '어느 쪽이 기준이든 같다');
  // 서로 다른 질문은 둘 다 남고 번호는 큰 값
  addAsk(b, { ...askContext(Q, A), key: 'K2' }, T);
  const m3 = mergeMath(a, b);
  assert.equal(m3.asks.length, 2); assert.equal(m3.askSeq, 2);
  assert.deepEqual(mergeAsks(emptyMath(), emptyMath()), { asks: [], askSeq: 0 });
  assert.equal(mergeMath(emptyMath(), emptyMath()).asks, undefined, '없으면 안 만든다');
});

test(`오래된 질문 정리: ${ASKS_MAX}개를 넘으면 끝난 것(fixed·closed)부터 지운다`, () => {
  const m = known();
  for (let i = 0; i < ASKS_MAX + 2; i++) {
    const day = `2026-01-${String(1 + Math.floor(i / 3)).padStart(2, '0')}`;
    const r = addAsk(m, { ...askContext(Q, A), key: `K${i}` }, day);
    if (i < 5) { applyReply(m, r.ask.no, '답'); decideAsk(m, r.ask.id, true); applyAskTry(m, r.ask.id, true, day); }
  }
  assert.equal(m.asks.length, ASKS_MAX);
  assert.equal(m.asks.filter((x) => x.status === 'fixed').length, 3, '끝난 것 두 개가 먼저 나갔다');
});
