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
  assert.deepEqual(c, { concept: 'frac.common', k: 'why', key: Q.key, q: Q.q, expr: '3/4 + 1/6', my: '분모끼리 더하면 돼요', ans: '분모가 달라서 크기를 맞춰야 해요', tag: '분모끼리 더함', w: 'u', choices: ['분모가 달라서 크기를 맞춰야 해요', '분모끼리 더하면 돼요'], seen: '' });
});

test('addAsk: 번호는 askSeq로 고정, 하루 3개, 같은 유형은 끝날 때까지 하나만', () => {
  const m = known();
  const r1 = addAsk(m, askContext(Q, A), T, '왜 분모는 안 더해요?');
  assert.equal(r1.ok, true); assert.equal(r1.ask.no, 1); assert.equal(r1.ask.status, 'asked'); assert.equal(r1.ask.kid, '왜 분모는 안 더해요?');
  assert.equal(askedToday(m, T), 1);
  assert.deepEqual(addAsk(m, askContext(Q, A), T), { ok: false, reason: 'dup' }, '같은 틀은 아빠 답이 올 때까지 하나');
  assert.ok(pendingAskFor(m, Q.concept, Q.key));
  assert.equal(pendingAskFor(m, 'frac.mean', Q.key), null, '다른 개념의 같은 틀은 별개 (분수 ②는 key가 misread 하나)');
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

// ───── Codex 4차 리뷰 회귀 (2026-09-22) ─────

test('Codex #1: 배포 답장 A → 붙여넣기 B → 수학 재진입(A 재수신) 해도 [A, B]로 남고 상태도 안 되돌아간다', () => {
  const m = known();
  const { ask } = addAsk(m, askContext(Q, A), T);
  assert.equal(applyReply(m, 1, 'deployed A'), true);
  assert.equal(applyReply(m, 1, 'pasted B'), true);
  decideAsk(m, ask.id, false, 'again');
  assert.equal(ask.status, 'again');
  assert.equal(applyReply(m, 1, 'deployed A'), false, '이력에 있는 글은 다시 안 붙는다');
  assert.equal(applyReply(m, 1, '  deployed   A '), false, '공백 차이도 같은 글');
  assert.deepEqual(ask.replies.map((r) => r.text), ['deployed A', 'pasted B']);
  assert.equal(ask.status, 'again', '옛 답장이 상태를 되돌리지 않는다');
});

test('Codex #2: 이해했다가 문제를 틀린 뒤 😶 아직 모르겠어요 → again으로 간다 (fixed·closed는 여전히 안 됨)', () => {
  const m = known();
  const { ask } = addAsk(m, askContext(Q, A), T);
  applyReply(m, 1, 'A');
  decideAsk(m, ask.id, true);
  applyAskTry(m, ask.id, false, T);
  assert.equal(decideAsk(m, ask.id, false, '조각이 뭐예요'), true);
  assert.equal(ask.status, 'again');
  assert.deepEqual(ask.again.map((x) => x.kid), ['조각이 뭐예요']);
  assert.equal(decideAsk(m, ask.id, true), false, 'again에서 😄는 없다 (답장을 기다린다)');
  applyReply(m, 1, 'B'); decideAsk(m, ask.id, true); applyAskTry(m, ask.id, true, T);
  assert.equal(ask.status, 'fixed');
  assert.equal(decideAsk(m, ask.id, false, 'x'), false, 'fixed면 되물음 없음');
});

test('Codex #5: 화면이 본 답장 시각(seenT)과 다르면 stale — 다른 창의 새 답장을 안 읽고 처리하지 않는다', () => {
  const m = known();
  const { ask } = addAsk(m, askContext(Q, A), T);
  applyReply(m, 1, 'A');
  const seenT = ask.replies[0].t;
  applyReply(m, 1, 'B'); // 다른 창에서
  assert.equal(decideAsk(m, ask.id, true, '', seenT), 'stale');
  assert.equal(ask.status, 'answered', '아무것도 안 바꿨다');
  assert.equal(decideAsk(m, ask.id, true, '', ask.replies[1].t), true, '최신을 보고 정하면 된다');
});

test('Codex #3: 서로 다른 개념의 같은 틀(misread)은 각각 물을 수 있다', () => {
  const m = known();
  m.concepts['frac.mean'] = { done: true, box: 1, dueAt: T, passes: 1, fails: 0, lastAt: 1 };
  assert.equal(addAsk(m, { ...askContext(Q, A), concept: 'frac.common', key: 'misread' }, T).ok, true);
  assert.equal(addAsk(m, { ...askContext(Q, A), concept: 'frac.mean', key: 'misread' }, T).ok, true, '다른 개념');
  assert.deepEqual(addAsk(m, { ...askContext(Q, A), concept: 'frac.mean', key: 'misread' }, T), { ok: false, reason: 'dup' }, '같은 개념은 하나');
});

test('Codex #4: 40개 제한은 끝난 것만 지운다 — 미해결 41개면 하나도 안 지운다', () => {
  const m = known();
  for (let i = 0; i < ASKS_MAX + 1; i++) addAsk(m, { ...askContext(Q, A), key: `K${i}` }, `2026-01-${String(1 + Math.floor(i / 3)).padStart(2, '0')}`);
  assert.equal(m.asks.length, ASKS_MAX + 1, '미해결은 보존');
  assert.equal(applyReply(m, 1, '늦은 답장'), true, '1번 질문이 남아 있어 답장이 붙는다');
});

test('Codex #7·#8: 틀이 바뀌어 다른 문제로 확인하면 fixed는 되지만 노트·같은 틀 표시는 안 하고, 같은 틀이면 노트가 없어도 cleared를 남긴다', () => {
  const m = known();
  const { ask } = addAsk(m, askContext(Q, A), T);
  applyReply(m, 1, 'A'); decideAsk(m, ask.id, true);
  const r = applyAskTry(m, ask.id, true, T, { sameKey: false });
  assert.deepEqual(r, { ok: true, fixed: true });
  assert.equal(ask.sameKey, 0);
  assert.equal(m.concepts['frac.common'].notes.length, 1, '원래 유형의 노트는 그대로');
  assert.equal(m.concepts['frac.common'].cleared, undefined);
  // 같은 틀인데 노트가 이미 없는 경우 — cleared는 남는다
  const m2 = known();
  const a2 = addAsk(m2, askContext(Q, A), T).ask;
  m2.concepts['frac.common'].notes = [];
  applyReply(m2, 1, 'A'); decideAsk(m2, a2.id, true);
  applyAskTry(m2, a2.id, true, T);
  assert.ok(m2.concepts['frac.common'].cleared[Q.key] > 0, '옛 백업의 노트가 되살아나지 않게');
});

test('Codex #6: 같은 시각의 다른 답장은 병합에서 둘 다 남는다', () => {
  const a = known();
  const { ask } = addAsk(a, askContext(Q, A), T);
  const b = JSON.parse(JSON.stringify(a));
  const real = Date.now;
  try { Date.now = () => 5000; applyReply(a, 1, 'A'); applyReply(b, 1, 'B'); } finally { Date.now = real; }
  assert.equal(a.asks[0].replies[0].t, b.asks[0].replies[0].t, '같은 밀리초');
  for (const merged of [mergeMath(a, b), mergeMath(b, a)]) assert.deepEqual(merged.asks[0].replies.map((r) => r.text).sort(), ['A', 'B']);
  assert.ok(ask);
});

test('Codex #10: 전각 숫자·전각 콜론 머리 줄도 읽고, 번호 없는 💬 줄은 앞 답장에 섞이지 않고 bad로 알린다', () => {
  const r = parseReplies('💬1 A\n💬２ B\n💬 ３： C');
  assert.deepEqual(r.map((x) => [x.no, x.text]), [[1, 'A'], [2, 'B'], [3, 'C']]);
  const r2 = parseReplies('💬1 A\n💬 (번호 없음) 이건 어디로?\n딸린 줄\n💬2 B');
  assert.deepEqual(r2.map((x) => [x.no, x.text]), [[1, 'A'], [2, 'B']], '번호 없는 블록의 줄이 1번에 붙지 않는다');
  assert.deepEqual(r2.bad, ['💬 (번호 없음) 이건 어디로?']);
  assert.equal(parseReplies('💬1 A').bad, undefined);
});

test('Codex #11: 복사문에 보기 목록(✔/❌ 표시)과 아이가 본 설명이 들어간다', () => {
  const m = known();
  const q = { ...Q, solve: { rule: '분모가 다르면 크기를 맞춘다', steps: ['① 12로 통분', { text: '② 더한다' }] } };
  addAsk(m, askContext(q, A), T);
  const txt = asksText(m, T);
  assert.ok(txt.includes('보기: ① 분모가 달라서 크기를 맞춰야 해요 ✔ · ② 분모끼리 더하면 돼요 ❌'), txt);
  assert.ok(txt.includes('앱이 이미 보여 준 설명: 규칙: 분모가 다르면 크기를 맞춘다 / ① 12로 통분 / ② 더한다'), txt);
  assert.ok(txt.includes('[line -5..5]'), '수직선 문법 안내가 맞다');
});
