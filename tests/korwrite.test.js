// ✍️ 국어 서술형 (v237) — 원고 · 글자 수 · 보내기 규칙 · 답장 검사·붙이기·보상 한도 · 병합 · 올릴 목록 · 저장 경로(두 창) · 비공개 검사 · 화면 연결
// 🔍 Codex 52차 (v239) — 글 이름표 id(같은 at 다른 글) · 앞 글 답장 · 답장 줄 수 상한·받은 수 · 채점 기준 등급 하나로 · 기다리는 글 안 자름 · 보였을 때만 읽음
// ✍️ 생각 쓰기 도우미 (v240) — 🧩 문장 틀 · 🔢 글 번호 · ✔️ 스스로 확인 · 틀·번호만으로는 못 보냄(규칙에서도)
// 🔍 Codex 53차 — 짧아도 뜻이 있는 답은 보냄(내 말 3자·문장부호 안 셈) · 틀 빈자리는 끝에 · 같은 답장 at 차례 · 읽음 머무름(앱 내림·자리 다시 잼)
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkContent, checkCard, validCards, WRITE_MIN, WRITE_MAX, KOR_STONE, PAST_MAX } from '../js/korean.js';
import {
  normText, textLen, writeCheck, writesOf, mergeWrites, cardWriteState, unreadReplies, writeAddRule, checkReplies, writeReplyRule,
  writeReadRule, writeTodo, replyStats, writeIdOf, WRITE_ID_RE, GRADES, WRITE_COINS, KEEP_DONE, REPLY_ROWS_MAX,
  frameParts, ownLen, FRAME_GAP, OWN_MIN, questionOf, editionsOf, editionOf,
} from '../js/korwrite.js';
import { emptyProfile, cloneProfile, mergeStatRecord } from '../js/db.js';
import { initProfile, flushProfile, reloadProfile, korWriteAdd, korWriteApply, korWriteRead, korWritesMap } from '../js/xp.js';
import * as UP from '../js/upload.js';
import { checkPrivateDir } from '../tools/privcheck.mjs';
import { countLine, rewardLine, sendWhy, slotWriteText, appliedLine, replyHead, seenEnough, watchSeen, READ_DWELL_MS, SEEN_STEPS, insertAt, NO_EDITION_Q } from '../js/korwriteview.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const DATA = JSON.parse(read('coach/korean/reading.json'));
const CARDS = validCards(DATA);
const T0 = new Date(2026, 9, 11, 12, 0, 0).getTime();
const pf = (o = {}) => cloneProfile({ ...emptyProfile(), ...o });
const clone = (x) => JSON.parse(JSON.stringify(x));
const ANS = '민재는 물 주기를 잊어서 미안했을 것 같아요. ⑤ 화분 앞에 오래 서 있었어요.';
/** 답장 한 줄 — w = writeAddRule 결과나 저장된 글 { id, at } (Claude가 korean/todo.json에서 card·id·at을 그대로 옮겨 적는 꼴) */
const R = (card, w, grade, text) => ({ card, id: w.id, at: w.at, grade, text });
/** 옛 꼴(id 없이 저장된 글)의 이름표 */
const E = (at, text) => ({ id: writeIdOf(at, text), at });

test('✍️ 원고: 서술형은 K1·K7·K15·K17·K19 + v241 K20(처음 해 본 일)·K26(방언·표준어)·K31(토끼전 인물) + v254 K44(분류)·K48(인상 깊은 장면)·K53(흥부와 놀부) + v261 K61(기사 내용으로 친구에게)·K62(주장에 대한 내 생각과 근거의 출처) + v265 K73(동네 분위기를 지키는 방법)·K75(어느 앱을 쓸까) + v267 K82(통화와 발표에 쓸 말) + v281 K87(체험)·K92(토의 결정에 대한 생각)·K96(미루다 커진 일과 깨달음) + v282 K98(소개할 포켓몬과 자료) · 판 번호 1 · 꼭 들어갈 생각·괜찮은 답·흔한 잘못·예시 답 · 검사가 잡는 것', () => {
  assert.deepEqual(checkContent(DATA), []);
  assert.deepEqual(DATA.cards.filter((c) => c.write).map((c) => c.id), ['K1', 'K7', 'K15', 'K17', 'K19', 'K20', 'K26', 'K31', 'K32', 'K44', 'K48', 'K53', 'K61', 'K62', 'K73', 'K75', 'K82', 'K87', 'K92', 'K96', 'K98', 'K103', 'K110', 'K115', 'K124', 'K129', 'K139', 'K141', 'K148', 'K152']); // v347 K148 제안하는 글 · K152 호랑이와 곶감 뒷이야기 · v322 K139 아픈 친구에게 마음을 전하는 편지 · K141 금도끼 은도끼 뒷이야기 · v320 K124 인물에게 하고 싶은 말 · K129 이어질 내용 상상 · v291 K103 호상놀이에서 발을 맞춘 까닭 · v298 K110 제안하는 글 · K115 고마운 분께 편지
  for (const c of DATA.cards.filter((x) => x.write)) {
    assert.equal(c.write.v, 1, c.id);
    assert.ok(c.write.rubric.must.length >= 2, `${c.id}: 생각 + 까닭(근거)`);
    assert.ok(textLen(c.write.model) <= WRITE_MAX && textLen(c.write.model) >= WRITE_MIN, `${c.id}: 예시 답도 아이에게 바라는 길이 안`);
  }
  assert.ok(DATA.cards.find((c) => c.id === 'K17').write.rubric.miss.some((m) => /맞춤법/.test(m)), '맞춤법은 채점하지 않는다고 적어 둔다');
  const bad = (edit, re) => { const c = clone(DATA.cards.find((x) => x.id === 'K19')); edit(c.write); const e = checkCard(c); assert.ok(e.some((m) => re.test(m)), `${re}: ${e}`); };
  bad((w) => { w.q = ' '; }, /write\.q/);
  bad((w) => { w.v = 0; }, /write\.v/);
  bad((w) => { w.rubric.must = []; }, /must/);
  bad((w) => { w.rubric.ok = 'x'; }, /rubric\.ok/);
  bad((w) => { w.model = '가'.repeat(WRITE_MAX + 1); }, /write\.model은/);
  const k1 = clone(DATA.cards.find((x) => x.id === 'K1'));
  k1.write.q = '⑳은 없는 줄';
  assert.ok(checkCard(k1).some((m) => /write\.q: ⑳은 글에 없는 번호/.test(m)), 'K1은 아홉 문장 — ⑳은 없다');
  assert.deepEqual(Object.keys(GRADES), ['ok', 'near', 'again']);
});

test('✍️ 글자 수: 공백 정리 뒤 10~200자 · 짧은 한 문장도 받는다 · 유니코드 모양이 달라도 같게 · 자르지 않는다', () => {
  assert.equal(normText('  엄마가\n\n걱정하실까   봐요. '), '엄마가 걱정하실까 봐요.');
  assert.deepEqual(writeCheck('엄마가 걱정하실까 봐요.'), { ok: true, n: 13 });
  assert.equal(writeCheck('걱정하실까 봐요').why, 'short');
  assert.equal(writeCheck('가'.repeat(201)).why, 'long');
  assert.equal(writeCheck('가'.repeat(200)).ok, true);
  assert.equal(textLen('한글'.normalize('NFD')), 2, '분리된 자모(NFD)도 두 글자');
  assert.equal(normText('가'.repeat(300)).length, 300, '다듬기는 자르지 않는다(보낼 때 막는다)');
});

test('✍️ 보내기 규칙: 서술형 있는 카드만 · 첫 글 💰5 한 번 · 답장 기다리는 글은 하나 · 이름표(at)는 늘 앞으로(시계가 멈추거나 되돌아가도) · id는 (at, 글)에서 · ✅ 받은 카드는 끝', () => {
  const p = pf({ coins: 0 });
  assert.equal(writeAddRule(p, 'K2', ANS, T0, CARDS).why, 'unknown', '서술형 없는 카드');
  assert.equal(writeAddRule(p, 'K1', '짧아', T0, CARDS).why, 'short');
  const a = writeAddRule(p, 'K1', `  ${ANS}  `, T0, CARDS);
  assert.deepEqual([a.ok, a.at, a.coins, p.coins, p.coinsEarned], [true, T0, WRITE_COINS.first, 5, 5]);
  assert.equal(a.id, writeIdOf(T0, ANS), 'id는 다듬은 글과 at으로');
  assert.match(a.id, WRITE_ID_RE);
  assert.equal(p.korWrites.K1.list[0].text, ANS, '다듬어 저장');
  assert.equal(writeAddRule(p, 'K1', ANS, T0 + 5, CARDS).why, 'pending', '답장 기다리는 글이 있으면 못 보냄');
  writeReplyRule(p, [R('K1', a, 'again', '다시 써 볼까?')], T0 + 10, CARDS);
  const b = writeAddRule(p, 'K1', ANS, T0 - 99999, CARDS); // 시계를 되돌림
  assert.deepEqual([b.ok, b.at > T0, b.coins, b.id !== a.id], [true, true, 0, true], '다시 쓴 글은 새 이름표 · 💰5는 다시 없음');
  writeReplyRule(p, [R('K1', b, 'ok', '잘 썼어!')], T0 + 20, CARDS);
  assert.equal(writeAddRule(p, 'K1', ANS, T0 + 30, CARDS).why, 'done', '✅ 받은 카드는 끝');
  // 같은 ms에 다시 써도 이름표가 겹치지 않는다
  const q = pf();
  const q1 = writeAddRule(q, 'K7', ANS, T0, CARDS);
  writeReplyRule(q, [R('K7', q1, 'near', '거의!')], T0, CARDS);
  assert.equal(writeAddRule(q, 'K7', ANS, T0, CARDS).at, T0 + 1);
});

test('✍️ 답장 검사: 서술형 카드 · id 꼴 · at(적었으면) 정수 · 등급 · 길이 · 같은 글에 다른 답장 둘이면 둘 다 버림(차례 상관없이) · 똑같으면 하나 · 모르는 칸은 무시', () => {
  const ID = writeIdOf(T0, ANS);
  const ok = { card: 'K1', id: ID, at: T0, grade: 'ok', text: '잘 썼어!', extra: 1 };
  const rows = [ok, null, { ...ok, card: 'K2' }, { ...ok, card: 'K999' }, { ...ok, at: '1' }, { ...ok, at: 1.5 }, { ...ok, grade: 'great' }, { ...ok, text: ' ' }, { ...ok, text: '가'.repeat(601) }, { ...ok }, { ...ok, id: undefined }, { ...ok, id: 'w123' }, { ...ok, id: 'W'.repeat(15) }];
  const r = checkReplies(rows, CARDS);
  assert.deepEqual(r.good, [{ card: 'K1', id: ID, at: T0, v: 1, grade: 'ok', text: '잘 썼어!' }], '똑같은 두 줄은 하나 · v를 안 적으면 1판');
  assert.equal(r.bad.length, 11);
  assert.equal(r.over, false);
  const noAt = checkReplies([{ card: 'K1', id: ID, grade: 'ok', text: '좋아' }], CARDS).good[0];
  assert.deepEqual([noAt.at, noAt.id], [0, ID], 'at은 안 적어도 된다(id로 붙는다)');
  const ID7 = writeIdOf(5, '다른 글입니다 다른 글');
  const clash = [{ card: 'K1', id: ID, at: T0, grade: 'ok', text: 'A' }, { card: 'K1', id: ID, at: T0, grade: 'near', text: 'B' }, { card: 'K7', id: ID7, at: 5, grade: 'near', text: 'C' }];
  for (const list of [clash, [...clash].reverse()]) {
    const c = checkReplies(list, CARDS);
    assert.deepEqual(c.good.map((g) => g.card), ['K7'], '다른 답장이 둘이면 그 글은 안 붙인다');
    assert.ok(c.bad.some((b) => /다른 답장/.test(b.why)));
  }
  const atClash = checkReplies([{ ...ok }, { ...ok, at: T0 + 1 }], CARDS);
  assert.deepEqual([atClash.good.length, atClash.bad.length], [0, 2], '같은 id에 at이 다르면(옮겨 적다 틀림) 둘 다 안 받음');
  assert.deepEqual(checkReplies('nope', CARDS), { good: [], bad: [], over: false });
});

test('✍️ 답장 붙이기·보상: 그 글에 한 번만 · 🔸까지 💰10 · ✅까지 💰20 + 🟩 (카드마다 평생 한도 — 다시 써서 모으지 못함) · 🔁는 없음 · 없는 글이면 안 건드림 · 앞 글 답장이 새 글에 붙지 않음', () => {
  const p = pf({ coins: 0, items: {} });
  const a = writeAddRule(p, 'K1', ANS, T0, CARDS);
  const near = writeReplyRule(p, [R('K1', a, 'near', '거의 다 왔어!')], T0 + 1, CARDS);
  assert.deepEqual([near.coins, near.stone, p.coins, p.coinsEarned], [10, 0, 15, 15], '번 코인(coinsEarned)도 함께');
  assert.deepEqual(near.applied, [{ card: 'K1', id: a.id, at: T0, grade: 'near', coins: 10, stone: 0 }]);
  assert.equal(writeReplyRule(p, [R('K1', a, 'near', '거의 다 왔어!')], T0 + 2, CARDS).why, 'none', '이미 붙음');
  const b = writeAddRule(p, 'K1', ANS, T0 + 3, CARDS);
  const ok = writeReplyRule(p, [R('K1', b, 'ok', '잘 썼어!')], T0 + 4, CARDS);
  assert.deepEqual([ok.coins, ok.stone, p.coins, p.items[KOR_STONE]], [10, 1, 25, 1], '🔸 뒤 ✅ = 모자란 💰10 + 🟩');
  assert.deepEqual(p.korWrites.K1.paid, { first: p.korWrites.K1.paid.first, coins: 20, stone: p.korWrites.K1.paid.stone });
  // 바로 ✅ = 💰20 + 🟩 · 🔁 = 0
  const q = pf({ coins: 0, items: {} });
  const q1 = writeAddRule(q, 'K19', ANS, T0, CARDS);
  assert.deepEqual(writeReplyRule(q, [R('K19', q1, 'again', '한 번 더!')], T0 + 1, CARDS).coins, 0);
  const b2 = writeAddRule(q, 'K19', ANS, T0 + 2, CARDS);
  assert.deepEqual(writeReplyRule(q, [R('K19', b2, 'ok', '좋아!')], T0 + 3, CARDS).coins, 20);
  // 없는 글(다른 사본에서 쓴 글)의 답장은 안 건드린다 — 그 글이 오면 그때
  const z = pf();
  assert.equal(writeReplyRule(z, [R('K15', E(777, '없는 글입니다 없는 글'), 'ok', '좋아!')], T0, CARDS).why, 'none');
  assert.deepEqual(z.korWrites, {});
  // 앞 글(답장 없음)과 새 글이 함께 있는 사본(병합) — 앞 글 답장은 앞 글에만
  const m = pf({ korWrites: { K15: { last: 20, list: [{ at: 10, day: 1, v: 1, text: '앞 글' }, { at: 20, day: 1, v: 1, text: '새 글' }] } } });
  writeReplyRule(m, [R('K15', E(10, '앞 글'), 'near', '거의')], T0, CARDS);
  assert.deepEqual(m.korWrites.K15.list.map((e) => e.grade), ['near', '']);
  // 두 사본이 따로 쓴 글 둘이 모두 ✅ — 🟩·💰는 카드마다 한 번 (한도)
  const two = pf({ coins: 0, items: {}, korWrites: { K17: { last: 20, list: [{ at: 10, day: 1, v: 1, text: '한 사본' }, { at: 20, day: 1, v: 1, text: '다른 사본' }] } } });
  const both = writeReplyRule(two, [R('K17', E(10, '한 사본'), 'ok', '좋아!'), R('K17', E(20, '다른 사본'), 'ok', '좋아!')], T0, CARDS);
  assert.deepEqual([both.applied.length, both.coins, both.stone, two.items[KOR_STONE]], [2, 20, 1, 1], '글은 둘 다 붙지만 보상은 한도까지');
  // 읽음 · 안 읽은 답장
  assert.deepEqual(unreadReplies(p.korWrites), [{ card: 'K1', id: a.id, at: a.at, grade: 'near' }, { card: 'K1', id: b.id, at: b.at, grade: 'ok' }], '안 읽은 답장은 앞 글 것도 (Codex 52차 #4)');
  assert.equal(writeReadRule(p, 'K1', a.id).ok, true);
  assert.equal(writeReadRule(p, 'K1', b.id).ok, true);
  assert.equal(writeReadRule(p, 'K1', b.id).why, 'none');
  assert.equal(writeReadRule(p, 'K1', b.at).why, 'none', '읽음도 id로');
  assert.deepEqual(unreadReplies(p.korWrites), []);
  const st = cardWriteState(p.korWrites, 'K1');
  assert.deepEqual([st.done, st.canWrite, st.unread, !!st.pending, st.shown.map((e) => e.id)], [true, false, false, false, [b.id]]);
});

test('✍️ 병합: 글은 (카드, id)로 합집합 · 답장 붙은 쪽이 이김 · 보상 한도는 큰 쪽·이른 날 · 차례 상관없이 같음 · 옛 백업이 받은 보상을 되살리지 못함 · 답장 기다리는 글은 안 잘림', () => {
  const now = pf({ coins: 0, items: {} });
  const a = writeAddRule(now, 'K1', ANS, T0, CARDS);
  const old = clone(now); // 답장 붙기 전 사본
  writeReplyRule(now, [R('K1', a, 'ok', '좋아!')], T0 + 1, CARDS);
  const m1 = mergeWrites(now.korWrites, old.korWrites);
  const m2 = mergeWrites(old.korWrites, now.korWrites);
  assert.deepEqual(m1, m2, '차례 상관없이');
  assert.equal(m1.K1.list[0].grade, 'ok', '답장 붙은 쪽');
  assert.deepEqual([m1.K1.paid.coins, m1.K1.paid.stone > 0], [20, true]);
  const again = { ...emptyProfile(), korWrites: m1, coins: 0 };
  assert.equal(writeReplyRule(again, [R('K1', a, 'ok', '좋아!')], T0 + 2, CARDS).why, 'none', '다시 받지 않음');
  assert.deepEqual(mergeWrites(m1, m1), m1, '같은 것끼리는 그대로');
  // 프로필 병합(백업 가져오기)도 같은 규칙
  const pm = mergeStatRecord('profile', { ...emptyProfile(), id: 'me', korWrites: now.korWrites, updatedAt: 9 }, { ...emptyProfile(), id: 'me', korWrites: old.korWrites, updatedAt: 5 });
  assert.equal(pm.korWrites.K1.list[0].grade, 'ok');
  // 답장 받은 글은 최근 KEEP_DONE개만 · 답장 기다리는 글은 늘
  const many = { K7: { last: 0, list: [] } };
  for (let i = 1; i <= 9; i++) many.K7.list.push({ at: i, day: 1, v: 1, text: `글 ${i}`, grade: 'again', reply: 'x' });
  many.K7.list.push({ at: 50, day: 1, v: 1, text: '기다리는 글' });
  const w = writesOf(many).K7;
  assert.deepEqual([w.list.filter((e) => e.grade).length, w.list.some((e) => e.at === 50), w.last], [KEEP_DONE, true, 50]);
  assert.deepEqual(writesOf({ bad: {}, K1: { list: [{ at: 'x' }, null] } }), { K1: { last: 0, list: [], paid: { first: 0, coins: 0, stone: 0 } } });
});

test('✍️ 올릴 목록: 답장 기다리는 글만 · 카드·id·제목·물음·날짜·앞 글과 답장 · 하나도 없으면 빈 목록도 올린다 · 파일 둘', () => {
  const p = pf();
  const a = writeAddRule(p, 'K19', ANS, T0, CARDS);
  writeReplyRule(p, [R('K19', a, 'again', '까닭도!')], T0 + 1, CARDS);
  const b = writeAddRule(p, 'K19', ANS, T0 + 2, CARDS);
  const c = writeAddRule(p, 'K1', ANS, T0 + 3, CARDS);
  const todo = writeTodo(p.korWrites, CARDS);
  assert.deepEqual(todo.map((t) => [t.card, t.id, t.at]), [['K19', b.id, T0 + 2], ['K1', c.id, T0 + 3]]);
  assert.equal(todo[0].title, '만년 셔츠');
  assert.equal(todo[0].date, '2026-10-11');
  assert.deepEqual(todo[0].before.map((x) => [x.grade, x.reply]), [['again', '까닭도!']]);
  const [md, js] = UP.koreanFiles(todo, '2026-10-11');
  assert.deepEqual([md.path, js.path], ['korean/todo.md', 'korean/todo.json']);
  assert.deepEqual(JSON.parse(js.text).map((t) => [t.id, t.at]), [[b.id, T0 + 2], [c.id, T0 + 3]]);
  assert.ok(md.text.includes(`[K19 · id ${b.id} · at ${T0 + 2} · v 1]`));
  assert.match(md.text, /\{ card, id, at, v, grade\(ok·near·again\), text \}/);
  assert.deepEqual([todo[0].v, todo[0].vNow], [1, 1]);
  assert.ok(!md.text.includes('지금 원고는'), '판이 같으면 옛 판 줄 없음');
  const empty = UP.koreanFiles([], 'd');
  assert.deepEqual(JSON.parse(empty[1].text), []);
  assert.match(empty[0].text, /답장 기다리는 글 없음/);
  assert.equal(UP.PRIVATE_KOR_REPLIES, 'korean/replies.json');
  assert.match(UP.readSummary({ 'korean/replies.json': { at: 1, ok: true, n: 2 } }, () => 't'), /📚 국어 답장 ✅ t \(2개\)/);
});

test('📤 보내기: 국어 서술형도 올림 · 프로필을 못 읽으면 아무것도 안 올림 · 올리는 순간마다 다시 만듦(옛 목록이 새 목록을 덮지 않게) · 커밋 메시지에 글 없음', async () => {
  const fmt = { getMath: async () => null, listDaily: async () => [], mathReportText: () => '', asksText: () => '', collectTodo: () => [] };
  const files = await UP.gatherFiles({ ...fmt, getKorTodo: async () => [], today: 'd' });
  assert.deepEqual(files.map((f) => f.path).slice(-2), ['korean/todo.md', 'korean/todo.json']);
  await assert.rejects(UP.gatherFiles({ ...fmt, getKorTodo: async () => { throw new Error('IDB 닫힘'); }, today: 'd' }));
  const u = read('js/upload.js');
  assert.match(u, /getKorTodo: korTodoNow, getEnglish: enNow, getKorReport: korReportNow, usagePlaces: [^\n]*, today/); // 🎤 영어 요약(v253) · 📚 국어 요약(v254) · 🕒 사용 기록 자리 목록(v272)
  assert.match(u, /const text = KOR_LIVE\.has\(f\.path\) \? \(\) => koreanTextNow\(f\.path, today\) : f\.text;/, '답장 기다리는 글은 함수로 — 겹쳐서 다시 올릴 때도 새로');
  assert.match(u, /const KOR_LIVE = new Set\(\['korean\/todo\.md', 'korean\/todo\.json'\]\);/, '다시 만드는 것은 두 파일만 — 📚 국어 요약(korean/날짜.md)은 모은 글 그대로(v254)');
  assert.match(u, /message: `📤 진우 기록 \$\{today\} — \$\{f\.path\}` \}\);/, '메시지에는 파일 이름만');
});

test('🔒 비공개 검사(check.mjs --private): korean/replies.json도 앱과 같은 검사 · 공개 저장소에 국어 답장·목록이 생기면 막음', () => {
  const dir = mkdtempSync(join(tmpdir(), 'kw-'));
  mkdirSync(join(dir, 'korean'));
  const ID = 'w' + 'a'.repeat(14);
  writeFileSync(join(dir, 'korean/replies.json'), JSON.stringify([{ card: 'K1', id: ID, at: 5, grade: 'ok', text: '좋아!' }]));
  assert.deepEqual(checkPrivateDir(dir, () => '<svg>'), { errors: [], checked: ['korean/replies.json'] });
  writeFileSync(join(dir, 'korean/replies.json'), JSON.stringify([{ card: 'K2', id: ID, at: 5, grade: 'ok', text: '좋아!' }, { card: 'K1', id: ID, at: 5, grade: 'wow', text: 'x' }, { card: 'K1', at: 5, grade: 'ok', text: 'id 없음' }]));
  const e = checkPrivateDir(dir, () => '<svg>').errors;
  assert.equal(e.length, 3);
  assert.match(e.join(' '), /서술형이 있는 카드가 아님/);
  assert.match(e.join(' '), /id는 korean\/todo\.json의 id 그대로/);
  writeFileSync(join(dir, 'korean/replies.json'), `${' '.repeat(UP.PRIVATE_MAX_BYTES)}[]`);
  const big = checkPrivateDir(dir, () => '<svg>').errors;
  assert.equal(big.length, 1);
  assert.match(big[0], /크기 오류/, '앱이 통째로 안 받을 크기는 올리기 전에 (Codex 52차 #5)');
  assert.match(read('tools/check.mjs'), /'coach\/korean\/replies\.json', 'coach\/korean\/todo\.json'/);
});

// ───────── 🔍 Codex 52차 (v239) ─────────

test('🔍 Codex 52차 #2 — 두 사본이 같은 at에 다른 글: 둘 다 남고 답장은 id로 그 글에만 · 합치는 차례·답장을 합치기 전/뒤에 붙여도 같음 · 옛 꼴도 (at, 글)로', () => {
  const base = pf();
  const first = writeAddRule(base, 'K1', ANS, T0, CARDS);
  writeReplyRule(base, [R('K1', first, 'again', '다시!')], T0 + 1, CARDS);
  const A = clone(base);
  const B = clone(base);
  const a = writeAddRule(A, 'K1', 'AAAAAAAAAA', T0 - 5000, CARDS); // 두 사본 모두 시계가 뒤로 — last + 1
  const b = writeAddRule(B, 'K1', 'BBBBBBBBBB', T0 - 4000, CARDS);
  assert.equal(a.at, b.at, '두 사본이 같은 at');
  assert.notEqual(a.id, b.id, 'id는 갈린다');
  const m1 = mergeWrites(A.korWrites, B.korWrites);
  assert.deepEqual(m1, mergeWrites(B.korWrites, A.korWrites), '차례 상관없이');
  assert.deepEqual(m1.K1.list.filter((e) => !e.grade).map((e) => e.text).sort(), ['AAAAAAAAAA', 'BBBBBBBBBB'], '둘 다 남는다 (전엔 하나만)');
  const byText = (w) => Object.fromEntries(w.K1.list.map((e) => [e.text, e]));
  // 합친 뒤 B 답장 → B 글에만
  const P = pf({ korWrites: m1 });
  writeReplyRule(P, [R('K1', b, 'near', 'B에게')], T0 + 9, CARDS);
  assert.deepEqual([byText(P.korWrites).BBBBBBBBBB.reply, byText(P.korWrites).AAAAAAAAAA.grade], ['B에게', ''], 'B 답장이 A 글에 붙지 않는다');
  // 합치기 전에 B 사본에 붙인 답장 — 어느 차례로 합쳐도 B 글에
  const B2 = clone(B);
  writeReplyRule(B2, [R('K1', b, 'near', 'B에게')], T0 + 9, CARDS);
  for (const m of [mergeWrites(A.korWrites, B2.korWrites), mergeWrites(B2.korWrites, A.korWrites)]) {
    assert.deepEqual([byText(m).BBBBBBBBBB.reply, byText(m).AAAAAAAAAA.grade], ['B에게', '']);
  }
  // at을 다른 글의 것으로 잘못 옮긴 답장은 안 붙는다
  assert.equal(writeReplyRule(pf({ korWrites: m1 }), [{ ...R('K1', b, 'ok', 'x'), at: b.at + 1 }], T0, CARDS).why, 'none');
  // 옛 꼴(id 없이 저장된 글) — 같은 at 다른 글은 둘 다 · 저장된 id는 믿지 않고 늘 다시 만든다
  const legacy = writesOf({ K1: { last: 9, list: [{ at: 9, day: 1, v: 1, text: '옛 글' }, { at: 9, day: 1, v: 1, text: '다른 옛 글' }] } });
  assert.deepEqual(legacy.K1.list.map((e) => e.id).sort(), [writeIdOf(9, '옛 글'), writeIdOf(9, '다른 옛 글')].sort());
  assert.equal(writesOf({ K1: { list: [{ at: 9, text: '옛 글', id: 'wzzzzzzzzzzzzzz' }] } }).K1.list[0].id, writeIdOf(9, '옛 글'));
  // id는 at·글이 하나만 달라도 갈리고, 꼴은 늘 w + 14자
  const ids = new Set();
  for (let i = 0; i < 2000; i++) { const id = writeIdOf(T0 + (i % 7), `글 ${i}`); assert.match(id, WRITE_ID_RE); ids.add(id); }
  assert.equal(ids.size, 2000);
});

test('🔍 Codex 52차 #4 — 앞 글 답장(안 읽음) + 뒤 글 기다림 · 뒤 글은 읽고 앞 글은 안 읽음 — 안 읽은 답장은 모두 📬·보일 답장에', () => {
  const t = { K15: { last: T0 + 1, list: [{ at: T0, day: 1, v: 1, text: '앞 글입니다 앞 글' }, { at: T0 + 1, day: 1, v: 1, text: '뒤 글입니다 뒤 글' }] } };
  const P = pf({ korWrites: t });
  const [e0, e1] = writesOf(t).K15.list;
  writeReplyRule(P, [R('K15', e0, 'near', '거의!')], T0 + 5, CARDS);
  assert.deepEqual(unreadReplies(P.korWrites).map((u) => u.id), [e0.id], '마지막 글이 기다리는 중이어도 앞 글 답장이 📬 (전엔 빠졌다)');
  let st = cardWriteState(P.korWrites, 'K15');
  assert.deepEqual([st.unread, st.shown.map((e) => e.id), st.pendings.map((e) => e.id), st.canWrite], [true, [e0.id], [e1.id], false]);
  writeReplyRule(P, [R('K15', e1, 'again', '다시!')], T0 + 6, CARDS);
  writeReadRule(P, 'K15', e1.id);
  st = cardWriteState(P.korWrites, 'K15');
  assert.deepEqual([st.unread, st.shown.map((e) => e.id)], [true, [e0.id, e1.id]], '뒤 글을 읽어도 앞 글 답장은 그대로 보인다');
  assert.equal(slotWriteText(st, true), '📬 아빠 답장이 왔어요');
  writeReadRule(P, 'K15', e0.id);
  st = cardWriteState(P.korWrites, 'K15');
  assert.deepEqual([st.unread, st.shown.map((e) => e.id), st.lastGraded.id], [false, [e1.id], e1.id], '다 읽으면 보통처럼 마지막 답장 하나');
  assert.equal(replyHead(e0.grade ? e0 : { ...e0, grade: 'near' }, true), `📬 아빠 답장 (10/11에 쓴 글) · 🔸 거의 다 왔어요`, '둘 이상이면 어느 글의 답장인지 날짜');
  assert.equal(replyHead({ ...e0, grade: 'ok' }, false), '📬 아빠 답장 · ✅ 잘 썼어요');
});

test('🔍 Codex 52차 #5 — 답장이 500줄을 넘으면 하나도 안 받음(경계 너머의 다른 답장까지) · 받은 수(받지 않은 줄·맞는 글 없음) · 비공개 검사도 통째로', () => {
  const p = pf();
  const a = writeAddRule(p, 'K1', ANS, T0, CARDS);
  const rows = Array.from({ length: REPLY_ROWS_MAX }, (_, i) => ({ card: 'K7', id: writeIdOf(i + 1, 'x'), grade: 'near', text: '거의' }));
  rows[0] = R('K1', a, 'ok', '좋아!');
  assert.equal(checkReplies(rows, CARDS).good.length, REPLY_ROWS_MAX, '500줄까지는 받는다');
  const over = [...rows, R('K1', a, 'again', '다른 답장')];
  const c = checkReplies(over, CARDS);
  assert.deepEqual([c.good.length, c.over, c.bad.length], [0, true, 1], '전엔 앞 500줄만 보고 1번 답장을 그대로 받았다');
  assert.equal(writeReplyRule(p, over, T0 + 1, CARDS).why, 'none', '하나도 안 붙음');
  assert.deepEqual(replyStats(p.korWrites, over, CARDS), { rows: 501, good: 0, bad: 501, none: 0, stale: 0, over: true });
  const list = [R('K1', a, 'ok', '좋아!'), { card: 'K1', id: a.id, grade: 'wow', text: 'x' }, R('K15', E(5, '없는 글입니다 없는 글'), 'ok', '좋아')];
  writeReplyRule(p, list, T0 + 2, CARDS);
  assert.deepEqual(replyStats(p.korWrites, list, CARDS), { rows: 3, good: 2, bad: 1, none: 1, stale: 0, over: false });
  const dir = mkdtempSync(join(tmpdir(), 'kw-'));
  mkdirSync(join(dir, 'korean'));
  writeFileSync(join(dir, 'korean/replies.json'), JSON.stringify(over));
  const e = checkPrivateDir(dir, () => '<svg>').errors;
  assert.equal(e.length, 1);
  assert.match(e[0], /500줄을 넘어요/);
  assert.ok(!e[0].includes('[-1]'), '줄 번호 없이 파일 이름만');
});

test('🔍 Codex 52차 #6 — 채점 기준: 경계마다 등급 하나(“이상” 없음) · 흔한 잘못마다 등급 · 지어내기는 🔁(GRADES.again과 같게) · K1은 미안함이 아니어도 첫째 must를 채움 · ✅에는 근거', () => {
  for (const c of DATA.cards.filter((x) => x.write)) {
    const { ok, miss } = c.write.rubric;
    for (const l of [...ok, ...miss]) assert.ok(!/이상|이하/.test(l), `${c.id}: 등급은 하나로 — ${l}`);
    for (const l of ok) assert.ok(/✅|칭찬/.test(l), `${c.id} ok마다 ✅ 또는 칭찬: ${l}`);
    for (const l of miss) assert.ok(/✅|🔸|🔁|채점하지 않는다/.test(l), `${c.id} miss마다 등급: ${l}`);
    for (const l of [...ok, ...miss]) if (/지어/.test(l)) assert.ok(l.includes('🔁'), `${c.id}: 지어내기는 🔁 — ${l}`);
  }
  const k1 = DATA.cards.find((x) => x.id === 'K1').write.rubric;
  assert.match(k1.must[0], /끝까지 잘 돌보고 싶다/, 'ok의 "잘 돌보고 싶어서"가 must를 건너뛰지 않게 must를 넓힘');
  assert.ok(k1.ok.every((l) => /근거 문장이 있으면 ✅/.test(l)), 'K1 ✅에는 늘 근거');
  assert.match(GRADES.again.rule, /까닭의 중심이 글과 어긋나거나\(지어내기/);
  assert.match(GRADES.near.rule, /곁들인 말이 글에 없다/);
  assert.match(GRADES.ok.rule, /rubric\.ok의 다른 말로 채워도 된다/);
});

test('🔍 Codex 52차 #7 — 답장 기다리는 글은 자르지 않는다(31개를 합쳐도 · 답장 받은 글이 섞여도)', () => {
  const many = { K7: { list: [] } };
  for (let i = 1; i <= 31; i++) many.K7.list.push({ at: i, day: 1, v: 1, text: `기다리는 글 ${i}` });
  assert.equal(writesOf(many).K7.list.length, 31, '전엔 30개로 잘려 가장 오래된 글이 사라졌다');
  for (let i = 40; i < 46; i++) many.K7.list.push({ at: i, day: 1, v: 1, text: `답장 받은 글 ${i}`, grade: 'again', reply: 'x' });
  const w = writesOf(many).K7;
  assert.deepEqual([w.list.filter((e) => !e.grade).length, w.list.filter((e) => e.grade).length], [31, KEEP_DONE]);
  const h1 = { K7: { list: many.K7.list.slice(0, 16) } };
  const h2 = { K7: { list: many.K7.list.slice(16) } };
  assert.equal(mergeWrites(h1, h2).K7.list.filter((e) => !e.grade).length, 31);
});

test('🔍 Codex 52차 #9 — 답장은 화면에 보인 채로 머물 때만 읽음 (그리기·스쳐 지나감·다른 화면·앱 내림은 그대로 📬)', () => {
  assert.equal(seenEnough(0, 300, 800), false);
  assert.equal(seenEnough(150, 300, 800), true, '상자의 절반');
  assert.equal(seenEnough(149, 300, 800), false);
  assert.equal(seenEnough(320, 2000, 800), true, '화면보다 큰 상자는 화면의 40%');
  assert.equal(seenEnough(300, 2000, 800), false);
  const fake = () => {
    let cb = null;
    const timers = [];
    const f = {
      disc: 0,
      g: {
        IntersectionObserver: class { constructor(fn) { cb = fn; } observe() {} disconnect() { f.disc++; } },
        setTimeout: (fn, ms) => { timers.push({ fn, ms, on: true }); return timers.length; },
        clearTimeout: (i) => { if (timers[i - 1]) timers[i - 1].on = false; },
        document: { visibilityState: 'visible' },
        innerHeight: 800,
      },
      fire: (vis, h) => cb([{ intersectionRect: { height: vis }, boundingClientRect: { height: h } }]),
      run: () => { for (const t of timers.filter((x) => x.on)) { t.on = false; assert.equal(t.ms, READ_DWELL_MS); t.fn(); } },
    };
    return f;
  };
  const box = { isConnected: true };
  let seen = 0;
  const f = fake();
  watchSeen(box, () => { seen++; }, f.g);
  f.run();
  assert.equal(seen, 0, '그리기만 해서는 안 읽음');
  f.fire(100, 300); f.run();
  assert.equal(seen, 0, '조금만 보이면 그대로');
  f.fire(200, 300); f.fire(0, 300); f.run();
  assert.equal(seen, 0, '스쳐 지나가면 그대로');
  f.fire(200, 300); f.g.document.visibilityState = 'hidden'; f.run();
  assert.equal(seen, 0, '앱을 내렸으면 그대로');
  f.g.document.visibilityState = 'visible';
  f.fire(200, 300); f.run();
  assert.deepEqual([seen, f.disc], [1, 1], '보인 채로 머물면 한 번 읽음 · 지켜보기 끝');
  const f2 = fake();
  const box2 = { isConnected: true };
  let s2 = 0;
  watchSeen(box2, () => { s2++; }, f2.g);
  f2.fire(300, 300); box2.isConnected = false; f2.run();
  assert.equal(s2, 0, '머무는 사이 다른 화면으로 가면 그대로');
  const later = [];
  let s3 = 0;
  watchSeen({ isConnected: true }, () => { s3++; }, { setTimeout: (fn) => later.push(fn), document: { visibilityState: 'visible' } });
  assert.equal(s3, 0);
  later.forEach((fn) => fn());
  assert.equal(s3, 1, '지켜보기가 없는 옛 브라우저는 붙은 뒤 머물면');
  const wv = read('js/korwriteview.js');
  const box3 = wv.slice(wv.indexOf('export function writeBoxEl('), wv.indexOf('/** 도감 칸 아래'));
  assert.ok(!/korWriteRead\(card\.id, [a-z.]+\)\.catch\(\(\) => \{\}\); \/\/ 읽음 —/.test(box3), '그리면서 바로 읽음으로 적지 않는다');
  assert.ok(box3.includes('if (!e.read) watchSeen(r, () => { korWriteRead(card.id, e.id).catch(() => {}); });'), '안 읽은 답장마다 보였을 때 읽음');
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

test('★ ✍️ 저장 경로: 두 창이 같이 보내도 글 하나·💰5 한 번 · 같은 답장을 두 창이 붙여도 보상 한 번 · 저장이 안 되면 없던 일 · 창의 프로필도', async () => {
  await seed({ coins: 0, coinsEarned: 0, items: {}, korWrites: {} });
  fakeIdb.failNext('profile');
  const bad = await korWriteAdd('K1', ANS, CARDS);
  assert.equal(bad.ok, false);
  assert.deepEqual(stored().korWrites || {}, {}, '저장 실패 = 없던 일');
  const [x, y] = await Promise.all([korWriteAdd('K1', ANS, CARDS), korWriteAdd('K1', ANS, CARDS)]);
  assert.deepEqual([x.ok, y.ok].sort(), [false, true]);
  assert.equal([x, y].find((r) => !r.ok).why, 'pending');
  assert.deepEqual([stored().coins, stored().korWrites.K1.list.length], [5, 1]);
  const e = stored().korWrites.K1.list[0];
  assert.equal(e.id, [x, y].find((r) => r.ok).id, '저장된 글의 id = 보낸 때 돌려준 id');
  const rep = [R('K1', e, 'ok', '좋아!')];
  const [a, b] = await Promise.all([korWriteApply(rep, CARDS), korWriteApply(rep, CARDS)]);
  assert.deepEqual([a.ok, b.ok].sort(), [false, true], '답장 붙이기도 한 번');
  assert.deepEqual([stored().coins, stored().items[KOR_STONE]], [25, 1]);
  await reloadProfile();
  assert.equal(korWritesMap().K1.list[0].grade, 'ok');
  assert.equal((await korWriteRead('K1', e.id)).ok, true);
  assert.equal(stored().korWrites.K1.list[0].read, true);
});

test('✍️ 화면 말(순수)·연결: 글자 수 줄 · 보상 안내(남은 것만) · 보내기 결과 말 · 칸 한 줄 · 답장 붙은 한 줄 · 글은 textContent로만 · 끝 카드·들어올 때 받기·답장 화면 가드 · 받은 수 적기 · sw', () => {
  // v304 (Codex 110차 #3): 글자 수 숫자는 아이 화면에 안 띄운다 — 상한·하한은 규칙이 그대로 본다
  assert.equal(countLine('').text, '한두 문장이면 돼요');
  assert.deepEqual([countLine('가나다').ok, countLine('가나다').text, countLine('가'.repeat(12)).text, countLine('가'.repeat(201)).warn, countLine('가'.repeat(201)).text], [false, '조금만 더 써 볼까요?', '✉️ 보낼 수 있어요', true, '글이 조금 길어요 — 조금 줄여 볼까요?']);
  for (const t of ['', '가나다', '가'.repeat(12), '가'.repeat(201)]) assert.ok(!/\d/.test(countLine(t).text), `글 상태 줄에 숫자 없음: ${countLine(t).text}`);
  assert.deepEqual([sendWhy({ why: 'short' }), sendWhy({ why: 'long' })], ['조금만 더 써 볼까요?', '글이 조금 길어요 — 조금 줄여 볼까요?']);
  assert.equal(rewardLine({}), '처음 보내면 💰5 · 아빠가 ✅를 주면 💰20 + 🟩');
  assert.equal(rewardLine({ first: 3, coins: 10 }), '아빠가 ✅를 주면 💰10 + 🟩');
  assert.equal(rewardLine({ first: 3, coins: 20, stone: 4 }), '');
  assert.match(sendWhy({ why: 'pending' }), /기다려요/);
  assert.match(sendWhy(null), /한 번 더/);
  assert.equal(slotWriteText({ unread: true }, true), '📬 아빠 답장이 왔어요');
  assert.equal(slotWriteText({ pending: {} }, true), '✉️ 답장 기다리는 중');
  assert.equal(slotWriteText({ unread: true }, false), '');
  assert.equal(appliedLine({ ok: true, applied: [{}], coins: 20, stone: 1 }), '📬 아빠 답장이 1개 왔어요 — 💰 +20 · 🟩 국어스톤 +1');
  assert.equal(appliedLine({ ok: false }), '');
  const wv = read('js/korwriteview.js');
  assert.ok(!/\.innerHTML\s*=|insertAdjacentHTML/.test(wv), '아이 글·답장은 textContent로만');
  assert.ok(!/from '\.\/koreanview\.js'/.test(wv), '서술형 쪽은 koreanview를 import하지 않는다');
  assert.ok(wv.includes('noteReadCheck(PRIVATE_KOR_REPLIES, replyStats(korWritesMap(), list, cards));'), '붙인 뒤 받은 수를 📊에 (Codex 52차 #5)');
  const kv = read('js/koreanview.js');
  assert.ok(kv.includes('if (res.ok && r.card.write) box.appendChild(writeBoxEl(r.card, writeCtx));'), '끝 카드 — 객관식 뒤, 저장이 된 뒤');
  assert.ok(kv.includes('loadCards().then((cards) => (cards ? syncWrites(cards) : null))'), '국어에 들어올 때 답장 받기');
  assert.ok(kv.includes("if (ui.wview) { renderReplyView(ui.wview, writeCtx); return; }"), '🎒에서 돌아오면 답장 화면 그대로');
  const sw = read('sw.js');
  for (const f of ['./js/korwrite.js', './js/korwriteview.js']) assert.ok(sw.includes(`'${f}'`), f);
  assert.match(read('js/stats.js'), /국어 생각 쓰기: 답장 기다리는 글/);
  assert.ok(!/fixes\.json`에 교정문을 적고/.test(read('coach/README.md')), '옛 공개 교정 절차는 없앴다 (Codex 51차)');
});

// ───────── ✍️ 생각 쓰기 도우미 (v240) ─────────
const help = (id) => DATA.cards.find((c) => c.id === id).write;

test('✍️ 도우미 원고 (v240): 다섯 카드 모두 🧩 틀 2~4·✔️ 확인 2~3 · 빈자리 ~ 하나까지 · 틀만 다 눌러도 못 보냄 · 예시 답은 보냄 · 채점 기준은 v1 그대로 · 검사가 잡는 것', () => {
  for (const c of DATA.cards.filter((x) => x.write)) {
    const { frames, checks } = c.write;
    assert.ok(frames.length >= 2 && frames.length <= 4, c.id);
    assert.ok(checks.length >= 2 && checks.length <= 3, c.id);
    for (const f of frames) assert.ok(f.split(FRAME_GAP).length <= 2, `${c.id}: ${f}`);
    for (const q of checks) assert.match(q, /\?$/, `${c.id}: 확인 줄은 물음 — ${q}`);
    const all = frames.map((f) => f.replace(FRAME_GAP, ' ')).join(' ');
    assert.equal(writeCheck(all, frames).why, 'own', `${c.id}: 틀을 다 눌러도(빈자리를 비운 채) 못 보낸다`);
    assert.equal(writeCheck(c.write.model, frames).ok, true, `${c.id}: 예시 답은 보낼 수 있다`);
  }
  assert.equal(help('K1').v, 1, '틀·확인은 채점 기준(rubric)이 아니다 — 판 번호 그대로');
  const bad = (edit, re) => { const c = clone(DATA.cards.find((x) => x.id === 'K19')); edit(c.write); const e = checkCard(c); assert.ok(e.some((m) => re.test(m)), `${re}: ${e}`); };
  bad((w) => { delete w.frames; }, /write\.frames\(문장 틀\)는 2~4개/);
  bad((w) => { w.frames = ['하나 ~']; }, /write\.frames\(문장 틀\)는 2~4개/);
  bad((w) => { w.frames = ['가 ~', '나 ~', '다 ~', '라 ~', '마 ~']; }, /write\.frames\(문장 틀\)는 2~4개/);
  bad((w) => { w.frames[0] = '나는 ~ 그리고 ~'; }, /write\.frames 1의 빈자리 ~는 하나까지/);
  bad((w) => { w.frames[0] = ' ~ '; }, /write\.frames 1은 빈자리만/);
  bad((w) => { w.frames[1] = ` ${w.frames[0]}`; }, /write\.frames\(문장 틀\) 2이 앞의 것과 같아요/);
  bad((w) => { w.frames[0] = `${'가'.repeat(40)} ~`; }, /write\.frames\(문장 틀\) 1은 40자까지/);
  bad((w) => { delete w.checks; }, /write\.checks\(스스로 확인\)는 2~3개/);
  bad((w) => { w.checks = ['하나뿐인가요?']; }, /write\.checks\(스스로 확인\)는 2~3개/);
  bad((w) => { w.checks[0] = '~ 썼나요?'; }, /write\.checks 1에 빈자리 ~가 있어요/);
  const k1 = clone(DATA.cards.find((x) => x.id === 'K1'));
  k1.write.frames[0] = '⑩에서 ~';
  k1.write.checks[0] = '⑫를 읽었나요?';
  const e = checkCard(k1);
  assert.ok(e.some((m) => /write\.frames 1: ⑩은 글에 없는 번호/.test(m)) && e.some((m) => /write\.checks 1: ⑫은 글에 없는 번호/.test(m)), `K1은 아홉 문장: ${e}`);
});

test('✍️ 도우미: 틀·번호만 눌러서는 못 보냄 — 틀 조각·①…⑳·문장부호를 뺀 내 말이 3자 · 규칙(writeAddRule)도 카드의 틀로 · 저장·💰5 없음', () => {
  const f19 = help('K19').frames;
  assert.equal(OWN_MIN, 3);
  assert.deepEqual(frameParts(['왜냐하면 ~ 때문이에요.', ' 왜냐하면  ~때문이에요!']), ['때문이에요', '왜냐하면'], '뼈대 꼴(문장부호 뺌) · 겹치면 하나 · 긴 것부터');
  const only = '내 생각에 창남이의 거짓말은 왜냐하면 ⑰에서 그렇게 생각했어요. 나라면';
  assert.ok(textLen(only) >= WRITE_MIN);
  assert.deepEqual([writeCheck(only, f19).why, ownLen(only, f19)], ['own', 0]);
  assert.equal(writeCheck('①②③④⑤⑥⑦⑧⑨⑩⑪⑫').why, 'own', '번호만 — 틀이 없어도');
  const good = '내 생각에 창남이의 거짓말은 이해돼요. 왜냐하면 ⑲ 어머니가 걱정하지 않게 하려고 한 거라서요.';
  assert.equal(writeCheck(good, f19).ok, true);
  assert.equal(ownLen('내 생각에   창남이의\n거짓말은 잘못했어요.', f19), [...'잘못했어요'].length, '빈칸·줄바꿈이 달라도 틀 조각');
  assert.equal(writeCheck(ANS).ok, true, '틀 없이 쓴 글은 그대로');
  assert.equal(writeCheck('가'.repeat(9), f19).why, 'short', '짧음이 먼저');
  const p = pf({ coins: 0 });
  const r = writeAddRule(p, 'K19', only, T0, CARDS);
  assert.deepEqual([r.ok, r.why, p.coins, !!(p.korWrites && p.korWrites.K19)], [false, 'own', 0, false], '규칙에서도 막는다 — 저장·💰5 없음');
  assert.equal(writeAddRule(p, 'K19', good, T0, CARDS).ok, true);
  assert.deepEqual(countLine(only, f19), { text: '틀 말고 내 말을 조금 더 써 볼까요?', ok: false, warn: false }); // v304: 「(내 말 N자)」 숫자는 뺐다
  assert.equal(countLine(good, f19).ok, true);
  assert.equal(sendWhy({ why: 'own' }), '틀 말고 내 말을 조금 더 써 볼까요?');
});

test('✍️ 도우미: 🧩·🔢 끼워 넣기 — 커서 자리에 · 앞이 글자면 빈칸 · ~ 자리에 커서 · 번호는 뒤 말에 붙여 · 고른 곳은 바꿈 · 커서를 모르면 끝', () => {
  assert.deepEqual(insertAt('', 0, 0, '왜냐하면 ~ 때문이에요.'), { value: '왜냐하면  때문이에요.', caret: 5 });
  assert.deepEqual(insertAt('좋아요.', 4, 4, '왜냐하면 ~ 때문이에요.'), { value: '좋아요. 왜냐하면  때문이에요.', caret: 10 });
  assert.deepEqual(insertAt('왜냐하면  때문이에요.', 5, 5, '⑰', true), { value: '왜냐하면 ⑰ 때문이에요.', caret: 6 });
  const a = insertAt('좋아요.', 4, 4, '~에서 그렇게 생각했어요.');
  assert.deepEqual(a, { value: '좋아요. 에서 그렇게 생각했어요.', caret: 5 });
  assert.equal(insertAt(a.value, a.caret, a.caret, '⑤', true).value, '좋아요. ⑤에서 그렇게 생각했어요.', '번호는 뒤 말에 붙는다');
  assert.equal(insertAt('가나라', 2, 2, '고친 문장: ~').value, '가나 고친 문장:  라', '틀은 뒤 글과 띄운다');
  assert.deepEqual(insertAt('가나다라', 1, 3, '⑤', true), { value: '가 ⑤라', caret: 3 }, '고른 곳은 바꾼다');
  assert.deepEqual(insertAt('가나', undefined, undefined, '⑤', true), { value: '가나 ⑤', caret: 4 }, '커서를 모르면 끝에');
  assert.deepEqual(insertAt('가나', 99, -3, '⑤', true), { value: '가나 ⑤', caret: 4 }, '범위 밖이면 끝에');
  assert.deepEqual(insertAt('가나\n', 3, 3, '⑤', true), { value: '가나\n⑤', caret: 4 }, '줄바꿈 뒤엔 안 띄움');
});

test('✍️ 도우미 화면 연결: 🧩 틀은 쓰기 칸 위(누르면 늘 글 끝에) · 🔢 번호는 아래(커서 자리에) · ✔️ 확인은 보내기 위 · 확인은 저장·막기 안 함 · 글자 수 줄·보내기 모두 틀로 · 보내는 중엔 안 넣음 · sw v240', () => {
  const wv = read('js/korwriteview.js');
  const form = wv.slice(wv.indexOf('function formEl('), wv.indexOf('/** 답장 한 덩이의 머리 줄'));
  const order = ["'kor-wframes'", 'box.appendChild(ta);', "'kor-wnums'", 'box.appendChild(checksEl(card))', "'btn btn-primary kor-wsend'"].map((k) => form.indexOf(k));
  assert.ok(order.every((x, i) => x > 0 && (i === 0 || x > order[i - 1])), `차례: ${order}`);
  assert.ok(form.includes('countLine(ta.value, frames)') && form.includes('writeCheck(ta.value, frames)'), '글자 수 줄·보내기 모두 틀로');
  assert.ok(form.includes('if (ta.readOnly) return; // 보내는 중'));
  assert.ok(form.includes('glue: true'), '번호는 뒤 말에 붙여');
  assert.ok(form.includes('title: `${i + 1}번 문장 번호 넣기`') && wv.includes("b.setAttribute('aria-label', it.title);"), '번호 버튼은 읽어 주는 이름으로(Codex 53차 #6)');
  assert.ok(form.includes('frames.map((f) => ({ label: f, piece: f, atEnd: true }))') && form.includes('const here = touched && !it.atEnd;'), '틀은 늘 끝에 · 번호만 커서 자리에');
  const chk = wv.slice(wv.indexOf('function checksEl('), wv.indexOf('/** 쓰기 칸'));
  assert.ok(chk.length > 100 && !/korWrite|setDraft|localStorage|disabled/.test(chk), '✔️ 확인은 저장도·막기도 안 한다');
  assert.match(read('js/korwrite.js'), /const chk = writeCheck\(text, card\.write\.frames, writeMaxOf\(card\.write\)\);/, '규칙도 카드의 틀로 (v304부터 카드의 글 길이 상한도)');
  assert.ok(+(/const CACHE_VERSION = 'v(\d+)';/.exec(read('sw.js')) || [])[1] >= 240, 'sw 버전 v240 이상');
  const css = read('css/style.css');
  for (const k of ['.kor-whbtn {', '.kor-wchk-row {', '.kor-wnums .kor-whbtn {']) assert.ok(css.includes(k), k);
});

// ───────── 🔍 Codex 53차 ─────────
test('🔍 Codex 53차 #1·#5 — 짧아도 뜻이 있는 답은 보냄(아빠가 채점) · 빈 틀·점·그림 글자·번호만은 막음 · 번호가 틀 사이에 끼거나 마침표가 빠져도 틀로 봄', () => {
  const f = (id) => help(id).frames;
  for (const [card, t] of [['K1', '미안해서요. ⑤에서 그렇게 생각했어요.'], ['K19', '나라면 사실대로 말해요.'], ['K17', '고친 문장: 나는 조종사다.'], ['K19', '내 생각에 창남이의 거짓말은 잘못했어요.'], ['K7', '가장 신기했던 장면은 알이에요.']]) {
    assert.equal(writeCheck(t, f(card)).ok, true, `${card} 보냄: ${t} (내 말 ${ownLen(t, f(card))})`);
  }
  for (const [card, t] of [['K1', '..........'], ['K1', '🙂🙂🙂🙂🙂🙂🙂🙂🙂🙂'], ['K1', '왜냐하면 왜냐하면 왜냐하면 왜냐하면'], ['K19', '내 생각에 ① 창남이의 거짓말은 ⑳ 나라면'], ['K15', '나는 좋겠어요 그렇게 하면 앞에 나온 의견에 보태자면'], ['K17', '고친 문장: ⑦ 고친 곳: ⑦ 왜냐하면 ⑦']]) {
    assert.equal(writeCheck(t, f(card)).why, 'own', `${card} 막음: ${t} (내 말 ${ownLen(t, f(card))})`);
  }
  assert.equal(ownLen('ㅋㅋㅋ 몰라요', f('K1')), 6, '자모·글자는 센다(채점은 사람이)');
  assert.equal(ownLen('한글'.normalize('NFD'), []), 2, '분리된 자모(NFD)도 모아서');
});

test('🔍 Codex 53차 #4 — 틀은 빈자리를 끝에(가운데 빈자리는 "나는 ~ 좋겠어요."·"~에서 …"만) · 채운 말이 어떤 꼴이어도 뒤가 어긋나지 않게', () => {
  for (const c of DATA.cards.filter((x) => x.write)) {
    for (const fr of c.write.frames) {
      const k = fr.indexOf(FRAME_GAP);
      const tail = fr.slice(k + 1);
      assert.ok(!tail || ['나는 ~ 좋겠어요.', '~에서 그렇게 생각했어요.'].includes(fr), `${c.id}: 빈자리 뒤에 말이 붙은 틀 — ${fr}`);
    }
  }
  assert.deepEqual(help('K7').frames, ['가장 신기했던 장면은 ~', '옛사람들이 이렇게 신기하게 전한 까닭은 ~']);
  assert.equal(help('K19').frames[0], '내 생각에 창남이의 거짓말은 ~', '"~고 생각해요"에 "잘못했어요"를 넣으면 "잘못했어요고"가 됐다');
});

test('🔍 Codex 53차 #2 — 같은 답장 두 줄 중 한 줄만 at을 적어도 줄 차례와 상관없이 같은 결과 · 적은 at끼리 다르면 둘 다 버림', () => {
  const run = (rows) => {
    const p = pf({ coins: 0 });
    const a = writeAddRule(p, 'K1', ANS, T0, CARDS);
    const chk = checkReplies(rows(a), CARDS);
    const r = writeReplyRule(p, rows(a), T0 + 10, CARDS);
    return { good: chk.good.map((x) => x.at), bad: chk.bad.length, applied: r.ok, coins: p.coins };
  };
  const base = (a) => ({ card: 'K1', id: a.id, grade: 'ok', text: '잘 썼어!' });
  const wrongFirst = run((a) => [{ ...base(a), at: a.at + 1 }, base(a)]);
  const wrongLast = run((a) => [base(a), { ...base(a), at: a.at + 1 }]);
  assert.deepEqual(wrongLast, wrongFirst, '전엔 at을 뺀 줄이 먼저면 틀린 at을 버리고 붙어 💰20');
  assert.deepEqual([wrongFirst.good, wrongFirst.applied, wrongFirst.coins], [[T0 + 1], false, WRITE_COINS.first], '적힌 at이 그 글과 다르면 안 붙음');
  const right = run((a) => [base(a), { ...base(a), at: a.at }]);
  assert.deepEqual([right.good, right.applied], [[T0], true], '맞는 at이면 붙음');
  const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
  for (const order of perms) {
    const r = run((a) => { const rows = [base(a), { ...base(a), at: a.at }, { ...base(a), at: a.at + 1 }]; return order.map((k) => rows[k]); });
    assert.deepEqual([r.good.length, r.applied], [0, false], `뺌·맞음·틀림 세 줄 차례 ${order}: 다른 at이 섞이면 둘 다 버림`);
  }
});

test('🔍 Codex 53차 #3 — 읽음 머무름: 앱을 내리면 끊고 돌아와 처음부터 · 내린 사이 시간이 다 돼도 돌아오면 다시 잼 · 끝날 때 상자 자리를 다시 잼 · 5%마다 관찰 · 다 읽으면 듣기 끝', () => {
  const fake = () => {
    let cb = null; let now = 0; let opts = null;
    const timers = [];
    const ls = new Set();
    const f = {
      disc: 0, removed: 0,
      g: {
        IntersectionObserver: class { constructor(fn, o) { cb = fn; opts = o; } observe() {} disconnect() { f.disc++; } },
        setTimeout: (fn, ms) => { timers.push({ fn, at: now + ms, on: true }); return timers.length; },
        clearTimeout: (i) => { if (timers[i - 1]) timers[i - 1].on = false; },
        document: {
          visibilityState: 'visible',
          addEventListener: (t, fn) => { assert.equal(t, 'visibilitychange'); ls.add(fn); },
          removeEventListener: (t, fn) => { if (ls.delete(fn)) f.removed++; },
        },
        innerHeight: 1000,
      },
      opts: () => opts,
      fire: (vis, h) => cb([{ intersectionRect: { height: vis }, boundingClientRect: { height: h } }]),
      vis: (state) => { f.g.document.visibilityState = state; for (const fn of [...ls]) fn(); },
      to: (t) => { now = t; for (const x of timers) if (x.on && x.at <= now) { x.on = false; x.fn(); } },
    };
    return f;
  };
  let seen = 0;
  const f = fake();
  watchSeen({ isConnected: true }, () => { seen++; }, f.g);
  assert.deepEqual(f.opts().threshold, SEEN_STEPS);
  assert.ok(SEEN_STEPS.length === 21 && SEEN_STEPS.includes(0.15));
  f.fire(300, 300); f.to(100); f.vis('hidden'); f.to(1190); f.vis('visible'); f.to(1200);
  assert.equal(seen, 0, 'Codex 재현: 0.1초 보고 내렸다 돌아오면 아직 안 읽음');
  f.to(1190 + READ_DWELL_MS);
  assert.deepEqual([seen, f.disc, f.removed], [1, 1, 1], '돌아와서 1.2초 보이면 읽음 · 관찰·듣기 끝');
  const f2 = fake();
  let s2 = 0;
  watchSeen({ isConnected: true }, () => { s2++; }, f2.g);
  f2.fire(300, 300); f2.g.document.visibilityState = 'hidden'; f2.to(1300); // 내림 알림이 늦어 시간이 내린 채로 다 됨
  assert.equal(s2, 0);
  f2.vis('visible'); f2.to(1300 + READ_DWELL_MS);
  assert.equal(s2, 1, '돌아오면 다시 잰다(전엔 새 관찰이 올 때까지 그대로)');
  const f3 = fake();
  let s3 = 0;
  let top = 550; // 3000 높이 상자 · 화면 1000 → 400 넘게 보여야
  const box = { isConnected: true, getBoundingClientRect: () => ({ top, bottom: top + 3000, height: 3000 }) };
  watchSeen(box, () => { s3++; }, f3.g);
  f3.fire(450, 3000); top = 650; f3.to(READ_DWELL_MS);
  assert.equal(s3, 0, '관찰 칸 사이에서 350만 보이게 밀렸으면 안 읽음');
  top = 550; f3.fire(450, 3000); f3.to(READ_DWELL_MS * 3);
  assert.equal(s3, 1);
});

/** K19 원고를 2판으로 고친 꼴 — 지금 판의 물음·rubric을 past로 옮기고 v를 올림 (keepPast false면 옛 판을 빠뜨린 원고) */
function bumpK19(keepPast = true) {
  const d = clone(DATA);
  const c = d.cards.find((x) => x.id === 'K19');
  const old = { v: 1, q: c.write.q, rubric: c.write.rubric, model: c.write.model };
  c.write.v = 2;
  c.write.q = '창남이가 어머니께 거짓말을 한 까닭은 무엇일까요? 글에서 찾아 써 보세요.';
  if (keepPast) c.write.past = [old];
  return { data: d, cards: validCards(d), oldQ: old.q, newQ: c.write.q };
}

test('🔍 Codex 52차 #8 — 채점 기준 판 번호: 옛 판은 원고 write.past에 · 올릴 목록은 그 글을 쓴 판의 물음 · 답장은 채점한 판(v)이 글의 판과 같아야 붙음 · v 없는 줄은 1판 · 없는 판은 안 받음 · 판 다름은 📊에', () => {
  // 원고 — 옛 판 검사
  const { data, cards, oldQ, newQ } = bumpK19();
  assert.deepEqual(checkContent(data), [], '2판 + past 1판 원고는 통과');
  assert.ok(cards.some((c) => c.id === 'K19'), '쓸 수 있는 카드');
  const bad = (edit, re) => { const c = clone(data.cards.find((x) => x.id === 'K19')); edit(c.write); const e = checkCard(c); assert.ok(e.some((m) => re.test(m)), `${re}: ${e}`); };
  bad((w) => { w.past[0].v = 2; }, /write\.past 1의 v는 1부터, 지금 판\(v2\)보다 작게/);
  bad((w) => { w.past[0].v = 3; }, /지금 판\(v2\)보다 작게/);
  bad((w) => { w.past.push(clone(w.past[0])); w.v = 3; }, /v1가 앞의 옛 판과 겹쳐요/);
  bad((w) => { w.past[0].q = ''; }, /write\.past 1\.q/);
  bad((w) => { w.past[0].rubric = {}; }, /write\.past 1\.rubric\.must/);
  bad((w) => { w.past[0].model = ''; }, /write\.past 1\.model/);
  bad((w) => { w.past = {}; }, /write\.past\(옛 판\)는/);
  bad((w) => { w.v = PAST_MAX + 2; w.past = Array.from({ length: PAST_MAX + 1 }, (_, i) => ({ ...clone(w.past[0]), v: i + 1 })); }, /write\.past\(옛 판\)는 5개까지/);
  bad((w) => { w.past = [null]; }, /write\.past 1은/);
  // 판마다 물음
  const w2 = data.cards.find((x) => x.id === 'K19').write;
  assert.deepEqual([questionOf(w2, 1).q, questionOf(w2, 1).now, questionOf(w2, 2).q, questionOf(w2, 2).now], [oldQ, false, newQ, true]);
  assert.equal(questionOf(w2, 3), null, '없는 판');
  assert.equal(questionOf(w2, 0).q, oldQ, '판이 없거나 깨진 글은 1판');
  assert.deepEqual([...editionsOf(w2)].sort(), [1, 2]);
  assert.deepEqual([editionOf({}), editionOf({ v: 2 }), editionOf({ v: 'x' })], [1, 2, 1]);
  // 1판에 쓴 글 → 원고가 2판이 된 뒤의 올릴 목록: 그 글의 물음(옛 물음)·지금 판
  const p = pf({ coins: 0, items: {} });
  const a = writeAddRule(p, 'K19', ANS, T0, CARDS);
  assert.equal(p.korWrites.K19.list[0].v, 1);
  const todo = writeTodo(p.korWrites, cards);
  assert.deepEqual([todo[0].q, todo[0].v, todo[0].vNow], [oldQ, 1, 2], '지금 원고의 물음이 아니라 그 글을 쓴 판의 물음');
  const [md] = UP.koreanFiles(todo, 'd');
  assert.ok(md.text.includes(`at ${T0} · v 1]`) && md.text.includes('(지금 원고는 v2 — 이 글은 v1 물음·기준으로') && md.text.includes(`물음: ${oldQ}`));
  // 옛 판을 빠뜨린 원고 — 물음 없이 ⚠️
  const lost = writeTodo(p.korWrites, bumpK19(false).cards);
  assert.deepEqual([lost[0].q, lost[0].v, lost[0].vNow], ['', 1, 2]);
  assert.match(UP.koreanFiles(lost, 'd')[0].text, /⚠️ v1 물음을 원고\(write\.past\)에서 못 찾았어요/);
  // 답장 — 채점한 판이 글의 판과 달라 안 붙음 → 📊 판 다름
  const v2 = [{ ...R('K19', a, 'ok', '좋아!'), v: 2 }];
  assert.equal(writeReplyRule(p, v2, T0 + 1, cards).why, 'none', '2판 기준으로 채점한 답장은 1판 글에 안 붙는다');
  assert.deepEqual(replyStats(p.korWrites, v2, cards), { rows: 1, good: 1, bad: 0, none: 0, stale: 1, over: false });
  assert.match(UP.readSummary({ 'korean/replies.json': { at: 1, ok: true, n: 1, check: { rows: 1, bad: 0, none: 0, stale: 1, over: false } } }, () => 't'), /판 다름 1 · Claude에게 "국어 답장 확인해 줘"/);
  // v가 없는 줄 = 1판 (v243 전 답장) · v 1 — 붙음
  const q = clone(p);
  assert.equal(writeReplyRule(q, [R('K19', a, 'near', '거의!')], T0 + 2, cards).applied.length, 1, 'v 없는 줄은 1판');
  const ok1 = writeReplyRule(p, [{ ...R('K19', a, 'ok', '좋아!'), v: 1 }], T0 + 3, cards);
  assert.deepEqual([ok1.applied.length, ok1.coins, ok1.stone], [1, 20, 1]);
  // 2판에 쓴 새 글 — v 없는 줄(1판)은 판 다름 · v 2는 붙음
  const r = pf();
  const b = writeAddRule(r, 'K19', ANS, T0, cards);
  assert.equal(r.korWrites.K19.list[0].v, 2, '새 글은 지금 판');
  assert.equal(writeReplyRule(r, [R('K19', b, 'ok', '좋아!')], T0 + 1, cards).why, 'none', 'v를 안 적은 답장(1판)은 2판 글에 안 붙는다');
  assert.equal(replyStats(r.korWrites, [R('K19', b, 'ok', '좋아!')], cards).stale, 1);
  assert.equal(writeReplyRule(r, [{ ...R('K19', b, 'ok', '좋아!'), v: 2 }], T0 + 2, cards).applied.length, 1);
  // 검사 — 그 카드에 없는 판·꼴이 틀린 판은 안 받음 · 같은 글에 판이 다른 답장 둘이면 둘 다 버림
  for (const v of [999, 0, -1, 1.5, '1', null]) {
    const c = checkReplies([{ ...R('K19', a, 'ok', '좋아!'), v }], cards);
    assert.deepEqual([c.good.length, c.bad.length], [0, 1], `v ${v}`);
    assert.match(c.bad[0].why, v === 999 ? /v는 K19의 채점 기준 판 번호\(v1·v2\)/ : /v는 1부터의 판 번호/);
  }
  assert.equal(checkReplies([{ ...R('K19', a, 'ok', '좋아!'), v: 2 }], CARDS).bad.length, 1, '지금 원고(1판뿐)에 없는 판');
  const pair = [{ ...R('K19', a, 'ok', '좋아!'), v: 1 }, { ...R('K19', a, 'near', '거의!'), v: 2 }];
  for (const [list, cs, name] of [[pair, cards, '2판 원고'], [pair, CARDS, '1판뿐인 원고'], [[...pair].reverse(), CARDS, '1판뿐 · 차례 거꾸로']]) {
    const both = checkReplies(list, cs);
    assert.deepEqual([both.good.length, both.bad.length], [0, 2], `판이 다른 같은 글 답장 둘은 원고에 그 판이 있든 없든 둘 다 버림 — ${name} (Codex 56차: 1판뿐인 원고에선 하나를 받았다)`);
  }
  const same = checkReplies([{ ...R('K19', a, 'ok', '좋아!'), v: 1 }, R('K19', a, 'ok', '좋아!')], cards);
  assert.deepEqual([same.good.length, same.bad.length], [1, 0], 'v 1과 v 없음은 같은 판');
  // 비공개 검사(check --private)도 같은 검사
  const dir = mkdtempSync(join(tmpdir(), 'kw-'));
  mkdirSync(join(dir, 'korean'));
  writeFileSync(join(dir, 'korean/replies.json'), JSON.stringify([{ ...R('K19', a, 'ok', '좋아!'), v: 999 }]));
  assert.match(checkPrivateDir(dir, () => '<svg>').errors.join(' '), /v는 K19의 채점 기준 판 번호\(v1\)/);
  // 화면 — 답장 기다리는 글 위 물음은 그 글을 쓴 판의 것 · 📊 받기 줄에 판 다름
  const wv = read('js/korwriteview.js');
  assert.ok(wv.includes('const qs = st.pendings.map((p) => { const ed = questionOf(card.write, p.v); return ed ? ed.q : NO_EDITION_Q; });'), '이 기기 원고에 그 판이 없으면 지금 물음을 대신 보이지 않는다(Codex 56차)');
  assert.equal(NO_EDITION_Q, '이 글을 쓸 때의 물음은 앱이 새로워지면 다시 보여요.');
  assert.ok(wv.includes("sec.appendChild(el('p', 'kor-wq-text', qs[0]));") && !wv.includes("sec.appendChild(el('p', 'kor-wq-text', card.write.q));"));
  assert.ok(wv.includes("if (k > 0 && qs[k] !== qs[0]) mine.appendChild(el('p', 'kor-wq-text', qs[k]));"), '두 기기에서 판이 다른 글이 함께 기다리면 글마다 그 물음');
  const up = read('js/upload.js');
  assert.ok(up.includes('stale: check.stale | 0'), '판 다름 수를 받기 결과에');
});
