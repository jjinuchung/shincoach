// ✍️ 국어 서술형 (v237) — 원고 · 글자 수 · 보내기 규칙 · 답장 검사·붙이기·보상 한도 · 병합 · 올릴 목록 · 저장 경로(두 창) · 비공개 검사 · 화면 연결
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkContent, checkCard, validCards, WRITE_MIN, WRITE_MAX, KOR_STONE } from '../js/korean.js';
import {
  normText, textLen, writeCheck, writesOf, mergeWrites, cardWriteState, unreadReplies, writeAddRule, checkReplies, writeReplyRule,
  writeReadRule, writeTodo, GRADES, WRITE_COINS, KEEP_DONE,
} from '../js/korwrite.js';
import { emptyProfile, cloneProfile, mergeStatRecord } from '../js/db.js';
import { initProfile, flushProfile, reloadProfile, korWriteAdd, korWriteApply, korWriteRead, korWritesMap } from '../js/xp.js';
import * as UP from '../js/upload.js';
import { checkPrivateDir } from '../tools/privcheck.mjs';
import { countLine, rewardLine, sendWhy, slotWriteText, appliedLine } from '../js/korwriteview.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const DATA = JSON.parse(read('coach/korean/reading.json'));
const CARDS = validCards(DATA);
const T0 = new Date(2026, 9, 11, 12, 0, 0).getTime();
const pf = (o = {}) => cloneProfile({ ...emptyProfile(), ...o });
const clone = (x) => JSON.parse(JSON.stringify(x));
const ANS = '민재는 물 주기를 잊어서 미안했을 것 같아요. ⑤ 화분 앞에 오래 서 있었어요.';

test('✍️ 원고: 서술형은 K1·K7·K15·K17·K19 · 판 번호 1 · 꼭 들어갈 생각·괜찮은 답·흔한 잘못·예시 답 · 검사가 잡는 것', () => {
  assert.deepEqual(checkContent(DATA), []);
  assert.deepEqual(DATA.cards.filter((c) => c.write).map((c) => c.id), ['K1', 'K7', 'K15', 'K17', 'K19']);
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

test('✍️ 보내기 규칙: 서술형 있는 카드만 · 첫 글 💰5 한 번 · 답장 기다리는 글은 하나 · 이름표(at)는 늘 앞으로(시계가 멈추거나 되돌아가도) · ✅ 받은 카드는 끝', () => {
  const p = pf({ coins: 0 });
  assert.equal(writeAddRule(p, 'K2', ANS, T0, CARDS).why, 'unknown', '서술형 없는 카드');
  assert.equal(writeAddRule(p, 'K1', '짧아', T0, CARDS).why, 'short');
  const a = writeAddRule(p, 'K1', `  ${ANS}  `, T0, CARDS);
  assert.deepEqual([a.ok, a.at, a.coins, p.coins, p.coinsEarned], [true, T0, WRITE_COINS.first, 5, 5]);
  assert.equal(p.korWrites.K1.list[0].text, ANS, '다듬어 저장');
  assert.equal(writeAddRule(p, 'K1', ANS, T0 + 5, CARDS).why, 'pending', '답장 기다리는 글이 있으면 못 보냄');
  writeReplyRule(p, [{ card: 'K1', at: T0, grade: 'again', text: '다시 써 볼까?' }], T0 + 10, CARDS);
  const b = writeAddRule(p, 'K1', ANS, T0 - 99999, CARDS); // 시계를 되돌림
  assert.deepEqual([b.ok, b.at > T0, b.coins], [true, true, 0], '다시 쓴 글은 새 이름표 · 💰5는 다시 없음');
  writeReplyRule(p, [{ card: 'K1', at: b.at, grade: 'ok', text: '잘 썼어!' }], T0 + 20, CARDS);
  assert.equal(writeAddRule(p, 'K1', ANS, T0 + 30, CARDS).why, 'done', '✅ 받은 카드는 끝');
  // 같은 ms에 다시 써도 이름표가 겹치지 않는다
  const q = pf();
  writeAddRule(q, 'K7', ANS, T0, CARDS);
  writeReplyRule(q, [{ card: 'K7', at: T0, grade: 'near', text: '거의!' }], T0, CARDS);
  assert.equal(writeAddRule(q, 'K7', ANS, T0, CARDS).at, T0 + 1);
});

test('✍️ 답장 검사: 서술형 카드 · at 정수 · 등급 · 길이 · 같은 글에 다른 답장 둘이면 둘 다 버림(차례 상관없이) · 똑같으면 하나 · 모르는 칸은 무시', () => {
  const ok = { card: 'K1', at: T0, grade: 'ok', text: '잘 썼어!', extra: 1 };
  const r = checkReplies([ok, null, { ...ok, card: 'K2' }, { ...ok, card: 'K99' }, { ...ok, at: '1' }, { ...ok, at: 1.5 }, { ...ok, grade: 'great' }, { ...ok, text: ' ' }, { ...ok, text: '가'.repeat(601) }, { ...ok }], CARDS);
  assert.deepEqual(r.good, [{ card: 'K1', at: T0, grade: 'ok', text: '잘 썼어!' }], '똑같은 두 줄은 하나');
  assert.equal(r.bad.length, 8);
  const clash = [{ card: 'K1', at: T0, grade: 'ok', text: 'A' }, { card: 'K1', at: T0, grade: 'near', text: 'B' }, { card: 'K7', at: 5, grade: 'near', text: 'C' }];
  for (const list of [clash, [...clash].reverse()]) {
    const c = checkReplies(list, CARDS);
    assert.deepEqual(c.good.map((g) => g.card), ['K7'], '다른 답장이 둘이면 그 글은 안 붙인다');
    assert.ok(c.bad.some((b) => /다른 답장/.test(b.why)));
  }
  assert.deepEqual(checkReplies('nope', CARDS), { good: [], bad: [] });
});

test('✍️ 답장 붙이기·보상: 그 글에 한 번만 · 🔸까지 💰10 · ✅까지 💰20 + 🟩 (카드마다 평생 한도 — 다시 써서 모으지 못함) · 🔁는 없음 · 없는 글이면 안 건드림 · 앞 글 답장이 새 글에 붙지 않음', () => {
  const p = pf({ coins: 0, items: {} });
  writeAddRule(p, 'K1', ANS, T0, CARDS);
  const near = writeReplyRule(p, [{ card: 'K1', at: T0, grade: 'near', text: '거의 다 왔어!' }], T0 + 1, CARDS);
  assert.deepEqual([near.coins, near.stone, p.coins, p.coinsEarned], [10, 0, 15, 15], '번 코인(coinsEarned)도 함께');
  assert.equal(writeReplyRule(p, [{ card: 'K1', at: T0, grade: 'near', text: '거의 다 왔어!' }], T0 + 2, CARDS).why, 'none', '이미 붙음');
  const b = writeAddRule(p, 'K1', ANS, T0 + 3, CARDS);
  const ok = writeReplyRule(p, [{ card: 'K1', at: b.at, grade: 'ok', text: '잘 썼어!' }], T0 + 4, CARDS);
  assert.deepEqual([ok.coins, ok.stone, p.coins, p.items[KOR_STONE]], [10, 1, 25, 1], '🔸 뒤 ✅ = 모자란 💰10 + 🟩');
  assert.deepEqual(p.korWrites.K1.paid, { first: p.korWrites.K1.paid.first, coins: 20, stone: p.korWrites.K1.paid.stone });
  // 바로 ✅ = 💰20 + 🟩 · 🔁 = 0
  const q = pf({ coins: 0, items: {} });
  writeAddRule(q, 'K19', ANS, T0, CARDS);
  assert.deepEqual(writeReplyRule(q, [{ card: 'K19', at: T0, grade: 'again', text: '한 번 더!' }], T0 + 1, CARDS).coins, 0);
  const b2 = writeAddRule(q, 'K19', ANS, T0 + 2, CARDS);
  assert.deepEqual(writeReplyRule(q, [{ card: 'K19', at: b2.at, grade: 'ok', text: '좋아!' }], T0 + 3, CARDS).coins, 20);
  // 없는 글(다른 사본에서 쓴 글)의 답장은 안 건드린다 — 그 글이 오면 그때
  const z = pf();
  assert.equal(writeReplyRule(z, [{ card: 'K15', at: 777, grade: 'ok', text: '좋아!' }], T0, CARDS).why, 'none');
  assert.deepEqual(z.korWrites, {});
  // 앞 글(답장 없음)과 새 글이 함께 있는 사본(병합) — 앞 글 답장은 앞 글에만
  const m = pf({ korWrites: { K15: { last: 20, list: [{ at: 10, day: 1, v: 1, text: '앞 글' }, { at: 20, day: 1, v: 1, text: '새 글' }] } } });
  writeReplyRule(m, [{ card: 'K15', at: 10, grade: 'near', text: '거의' }], T0, CARDS);
  assert.deepEqual(m.korWrites.K15.list.map((e) => e.grade), ['near', '']);
  // 두 사본이 따로 쓴 글 둘이 모두 ✅ — 🟩·💰는 카드마다 한 번 (한도)
  const two = pf({ coins: 0, items: {}, korWrites: { K17: { last: 20, list: [{ at: 10, day: 1, v: 1, text: '한 사본' }, { at: 20, day: 1, v: 1, text: '다른 사본' }] } } });
  const both = writeReplyRule(two, [{ card: 'K17', at: 10, grade: 'ok', text: '좋아!' }, { card: 'K17', at: 20, grade: 'ok', text: '좋아!' }], T0, CARDS);
  assert.deepEqual([both.applied.length, both.coins, both.stone, two.items[KOR_STONE]], [2, 20, 1, 1], '글은 둘 다 붙지만 보상은 한도까지');
  // 읽음 · 안 읽은 답장
  assert.deepEqual(unreadReplies(p.korWrites), [{ card: 'K1', at: b.at, grade: 'ok' }]);
  assert.equal(writeReadRule(p, 'K1', b.at).ok, true);
  assert.equal(writeReadRule(p, 'K1', b.at).why, 'none');
  assert.deepEqual(unreadReplies(p.korWrites), []);
  const st = cardWriteState(p.korWrites, 'K1');
  assert.deepEqual([st.done, st.canWrite, st.unread, !!st.pending], [true, false, false, false]);
});

test('✍️ 병합: 글은 (카드, at)로 합집합 · 답장 붙은 쪽이 이김 · 보상 한도는 큰 쪽·이른 날 · 차례 상관없이 같음 · 옛 백업이 받은 보상을 되살리지 못함 · 답장 기다리는 글은 안 잘림', () => {
  const now = pf({ coins: 0, items: {} });
  writeAddRule(now, 'K1', ANS, T0, CARDS);
  const old = clone(now); // 답장 붙기 전 사본
  writeReplyRule(now, [{ card: 'K1', at: T0, grade: 'ok', text: '좋아!' }], T0 + 1, CARDS);
  const m1 = mergeWrites(now.korWrites, old.korWrites);
  const m2 = mergeWrites(old.korWrites, now.korWrites);
  assert.deepEqual(m1, m2, '차례 상관없이');
  assert.equal(m1.K1.list[0].grade, 'ok', '답장 붙은 쪽');
  assert.deepEqual([m1.K1.paid.coins, m1.K1.paid.stone > 0], [20, true]);
  const again = { ...emptyProfile(), korWrites: m1, coins: 0 };
  assert.equal(writeReplyRule(again, [{ card: 'K1', at: T0, grade: 'ok', text: '좋아!' }], T0 + 2, CARDS).why, 'none', '다시 받지 않음');
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

test('✍️ 올릴 목록: 답장 기다리는 글만 · 카드 제목·물음·날짜·앞 글과 답장 · 하나도 없으면 빈 목록도 올린다 · 파일 둘', () => {
  const p = pf();
  writeAddRule(p, 'K19', ANS, T0, CARDS);
  writeReplyRule(p, [{ card: 'K19', at: T0, grade: 'again', text: '까닭도!' }], T0 + 1, CARDS);
  writeAddRule(p, 'K19', ANS, T0 + 2, CARDS);
  writeAddRule(p, 'K1', ANS, T0 + 3, CARDS);
  const todo = writeTodo(p.korWrites, CARDS);
  assert.deepEqual(todo.map((t) => [t.card, t.at]), [['K19', T0 + 2], ['K1', T0 + 3]]);
  assert.equal(todo[0].title, '만년 셔츠');
  assert.equal(todo[0].date, '2026-10-11');
  assert.deepEqual(todo[0].before.map((b) => [b.grade, b.reply]), [['again', '까닭도!']]);
  const [md, js] = UP.koreanFiles(todo, '2026-10-11');
  assert.deepEqual([md.path, js.path], ['korean/todo.md', 'korean/todo.json']);
  assert.deepEqual(JSON.parse(js.text).map((t) => t.at), [T0 + 2, T0 + 3]);
  assert.match(md.text, new RegExp(`\\[K19 · at ${T0 + 2}\\]`));
  const empty = UP.koreanFiles([], 'd');
  assert.deepEqual(JSON.parse(empty[1].text), []);
  assert.match(empty[0].text, /답장 기다리는 글 없음/);
  assert.equal(UP.PRIVATE_KOR_REPLIES, 'korean/replies.json');
  assert.match(UP.readSummary({ 'korean/replies.json': { at: 1, ok: true, n: 2 } }, () => 't'), /📚 국어 답장 ✅ t \(2개\)/);
});

test('📤 보내기: 국어 서술형도 올림 · 프로필을 못 읽으면 아무것도 안 올림 · 올리기 바로 전에 다시 읽음(옛 목록이 새 목록을 덮지 않게) · 커밋 메시지에 글 없음', async () => {
  const fmt = { getMath: async () => null, listDaily: async () => [], mathReportText: () => '', asksText: () => '', collectTodo: () => [] };
  const files = await UP.gatherFiles({ ...fmt, getKorTodo: async () => [], today: 'd' });
  assert.deepEqual(files.map((f) => f.path).slice(-2), ['korean/todo.md', 'korean/todo.json']);
  await assert.rejects(UP.gatherFiles({ ...fmt, getKorTodo: async () => { throw new Error('IDB 닫힘'); }, today: 'd' }));
  const u = read('js/upload.js');
  assert.match(u, /getKorTodo: korTodoNow, today/);
  assert.match(u, /if \(!kor\) kor = Object\.fromEntries\(koreanFiles\(await korTodoNow\(\), today\)/);
  assert.match(u, /message: `📤 진우 기록 \$\{today\} — \$\{f\.path\}` \}\);/, '메시지에는 파일 이름만');
});

test('🔒 비공개 검사(check.mjs --private): korean/replies.json도 앱과 같은 검사 · 공개 저장소에 국어 답장·목록이 생기면 막음', () => {
  const dir = mkdtempSync(join(tmpdir(), 'kw-'));
  mkdirSync(join(dir, 'korean'));
  writeFileSync(join(dir, 'korean/replies.json'), JSON.stringify([{ card: 'K1', at: 5, grade: 'ok', text: '좋아!' }]));
  assert.deepEqual(checkPrivateDir(dir, () => '<svg>'), { errors: [], checked: ['korean/replies.json'] });
  writeFileSync(join(dir, 'korean/replies.json'), JSON.stringify([{ card: 'K2', at: 5, grade: 'ok', text: '좋아!' }, { card: 'K1', at: 5, grade: 'wow', text: 'x' }]));
  const e = checkPrivateDir(dir, () => '<svg>').errors;
  assert.equal(e.length, 2);
  assert.match(e.join(' '), /서술형이 있는 카드가 아님/);
  assert.match(read('tools/check.mjs'), /'coach\/korean\/replies\.json', 'coach\/korean\/todo\.json'/);
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
  const at = stored().korWrites.K1.list[0].at;
  const rep = [{ card: 'K1', at, grade: 'ok', text: '좋아!' }];
  const [a, b] = await Promise.all([korWriteApply(rep, CARDS), korWriteApply(rep, CARDS)]);
  assert.deepEqual([a.ok, b.ok].sort(), [false, true], '답장 붙이기도 한 번');
  assert.deepEqual([stored().coins, stored().items[KOR_STONE]], [25, 1]);
  await reloadProfile();
  assert.equal(korWritesMap().K1.list[0].grade, 'ok');
  assert.equal((await korWriteRead('K1', at)).ok, true);
  assert.equal(stored().korWrites.K1.list[0].read, true);
});

test('✍️ 화면 말(순수)·연결: 글자 수 줄 · 보상 안내(남은 것만) · 보내기 결과 말 · 칸 한 줄 · 답장 붙은 한 줄 · 글은 textContent로만 · 끝 카드·들어올 때 받기·답장 화면 가드 · sw', () => {
  assert.equal(countLine('').text, `한두 문장이면 돼요 (${WRITE_MAX}자까지)`);
  assert.deepEqual([countLine('가나다').ok, countLine('가'.repeat(12)).text, countLine('가'.repeat(201)).warn], [false, `12 / ${WRITE_MAX}자`, true]);
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
  const kv = read('js/koreanview.js');
  assert.ok(kv.includes('if (res.ok && r.card.write) box.appendChild(writeBoxEl(r.card, writeCtx));'), '끝 카드 — 객관식 뒤, 저장이 된 뒤');
  assert.ok(kv.includes('loadCards().then((cards) => (cards ? syncWrites(cards) : null))'), '국어에 들어올 때 답장 받기');
  assert.ok(kv.includes("if (ui.wview) { renderReplyView(ui.wview, writeCtx); return; }"), '🎒에서 돌아오면 답장 화면 그대로');
  const sw = read('sw.js');
  for (const f of ['./js/korwrite.js', './js/korwriteview.js']) assert.ok(sw.includes(`'${f}'`), f);
  assert.match(read('js/stats.js'), /국어 생각 쓰기: 답장 기다리는 글/);
  assert.ok(!/fixes\.json`에 교정문을 적고/.test(read('coach/README.md')), '옛 공개 교정 절차는 없앴다 (Codex 51차)');
});
