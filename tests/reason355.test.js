// v355 💡 논술 내 이유 한 줄 (2026-10-28 아버님 「추천대로」) — 판 끝 「내가 만든 글」 아래 「또, …」 한 줄 → 아빠 답장
//  같은 ✍️ 장부·왕복(카드 열쇠 R## = 주제 N##의 번호) · 보낼 글 = 판에서 고른 의견 + 「또, 한 줄」 · 보내면 💰5(처음 한 번) · ✅면 🎯 논술 잡기 1번(카드마다 한 번 · 🟩 없음)
//  ⭐ 연습 판에서도 · 답장 기다림·✅ 주제엔 칸 없음 · 채점 기준은 원고 reason · 📤 요약 줄
// node --test tests/reason355.test.js
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  checkNonsul, allTopics, nonsulWriteCards, nonsulReasonCards, reasonCardId, reasonTopicId, reasonLine, reasonTail, reasonCheck, composeReason,
  reasonAddRule, reasonReport, reasonSendWhy, REASON_MIN, REASON_MAX, REASON_HEAD, SOLVED,
} from '../js/nonsul.js';
import {
  writesOf, mergeWrites, writeAddRule, writeReplyRule, checkReplies, writeTodo, rowsOfFams, cardWriteState, ownLen, reasonPaidCount, reasonThrowsFix,
  WRITE_CARD_RE, WRITE_COINS,
} from '../js/korwrite.js';
import { validCards, KOR_STONE, pendingOf } from '../js/korean.js';
import { emptyProfile, cloneProfile, mergeStatRecord } from '../js/db.js';
import { initProfile, flushProfile, reloadProfile, nonsulReasonAdd, korWriteApply, nonsulThrowsLeft } from '../js/xp.js';
import { koreanFiles } from '../js/upload.js';
import { appliedLine } from '../js/korwriteview.js';
import { korReportFromRaw } from '../js/korreport.js';

void fakeIdb;
const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const RAW = JSON.parse(read('coach/korean/nonsul.json'));
const TOPICS = allTopics(RAW);
const KCARDS = validCards(JSON.parse(read('coach/korean/reading.json')));
const NCARDS = nonsulWriteCards(RAW);
const RCARDS = nonsulReasonCards(RAW);
const ALL = [...KCARDS, ...NCARDS, ...RCARDS];
const T0 = new Date(2026, 9, 28, 15).getTime();
const T1 = TOPICS[0];
const played = (...ids) => Object.fromEntries(ids.map((id) => [id, { box: SOLVED, due: 0, at: T0 - 1000, miss: 0, d0: 1 }]));
const pf = (o = {}) => cloneProfile({ ...emptyProfile(), nonsul: played(T1.id), ...o });
const R = (card, w, grade, text) => ({ card, id: w.id, at: w.at, grade, text, v: 1 });
const body = (src, head) => { const i = src.indexOf(head); assert.ok(i >= 0, head); return src.slice(i, src.indexOf('\n}\n', i)); };
const LINE = '친구랑 같이 하면 더 재밌어서요';

test('💡 원고: reason 채점 기준(판 1 · 꼭 들어갈 것 셋 · 판 보기를 옮기면 🔸 · 반대편은 🔁) · 주제마다 카드 R## · 틀은 두 편의 의견 문장', () => {
  assert.deepEqual(checkNonsul(RAW), []);
  const w = RAW.reason;
  assert.equal(w.v, 1);
  assert.equal(w.rubric.must.length, 3);
  assert.ok(w.rubric.miss.some((m) => /판 보기의 이유와 거의 같음/.test(m) && m.endsWith('🔸')));
  assert.ok(w.rubric.miss.some((m) => /반대편/.test(m) && m.endsWith('🔁')));
  assert.equal(RCARDS.length, TOPICS.length);
  RCARDS.forEach((c, i) => {
    const t = TOPICS[i];
    assert.deepEqual([c.id, c.topic, c.title, c.icon], [reasonCardId(t.id), t.id, t.q, t.icon]);
    assert.ok(WRITE_CARD_RE.test(c.id));
    assert.equal(reasonTopicId(c.id), t.id);
    assert.deepEqual(c.write.frames, [t.yes.claim, t.no.claim]);
    assert.deepEqual([c.write.q, c.write.v], [w.q, 1]);
  });
  assert.deepEqual([reasonTopicId('N12'), reasonTopicId('K3'), reasonTopicId('R1x')], ['', '', '']);
  // 없으면 칸만 안 뜬다 · 깨지면 검사가 잡고 칸도 안 뜬다
  const none = JSON.parse(JSON.stringify(RAW));
  delete none.reason;
  assert.deepEqual([checkNonsul(none), nonsulReasonCards(none)], [[], []]);
  const bad = JSON.parse(JSON.stringify(RAW));
  bad.reason.rubric.must = [];
  assert.ok(checkNonsul(bad).some((s) => s.startsWith('reason.rubric.must')));
  assert.deepEqual(nonsulReasonCards(bad), []);
  assert.equal(NCARDS.length, TOPICS.length, '✍️ 짧은 글 카드는 그대로');
});

test('💡 한 줄 다듬기·검사: 「또,」를 다시 쓰면 한 번만(「또래」는 그대로) · 내 말 5자부터 · 60자까지 · 글 = 고른 의견 + 「또, 한 줄」 · 의견 문장은 내 말로 안 셈', () => {
  assert.equal(REASON_HEAD, '또,');
  assert.deepEqual([REASON_MIN, REASON_MAX], [5, 60]);
  assert.equal(reasonLine(`  또,  ${LINE} `), LINE);
  assert.equal(reasonLine(`또 ${LINE}`), LINE);
  assert.equal(reasonLine('또래 친구가 많아서요'), '또래 친구가 많아서요');
  assert.deepEqual(reasonCheck('또,'), { ok: false, n: 0, why: 'short' });
  assert.equal(reasonCheck('재밌어요').why, 'short', '내 말 4자');
  assert.equal(reasonCheck('!!! ... 재밌다').why, 'short', '문장부호는 안 셈');
  assert.equal(reasonCheck('재밌어서요').ok, true);
  assert.equal(reasonCheck('가'.repeat(REASON_MAX)).ok, true);
  assert.equal(reasonCheck('가'.repeat(REASON_MAX + 1)).why, 'long');
  assert.equal(reasonTail(LINE), `${LINE}.`);
  assert.equal(reasonTail('정말 그럴까요?'), '정말 그럴까요?');
  const text = composeReason(T1, 'yes', `또, ${LINE}`);
  assert.equal(text, `${T1.yes.claim} 또, ${LINE}.`);
  const card = RCARDS[0];
  assert.equal(ownLen(composeReason(T1, 'no', '가나다라마'), card.write.frames), 6, '의견 문장은 빼고 「또」 + 한 줄만');
});

test('💡 보내기 규칙: 판을 끝낸 주제만 · 편·주제가 이상하면 안 받음 · 처음 💰5 · 답장 기다리는 줄은 하나 · 쓴 글은 그 편의 의견으로 시작', () => {
  const p = pf();
  assert.equal(reasonAddRule(pf({ nonsul: {} }), T1, 'yes', LINE, T0, ALL).why, 'unplayed');
  assert.equal(reasonAddRule(p, T1, 'maybe', LINE, T0, ALL).why, 'unknown');
  assert.equal(reasonAddRule(p, { id: 'X1' }, 'yes', LINE, T0, ALL).why, 'unknown');
  assert.equal(reasonAddRule(p, T1, 'yes', '짧아', T0, ALL).why, 'short');
  assert.equal(reasonAddRule(p, T1, 'yes', LINE, T0, NCARDS).why, 'unknown', '내 이유 카드가 없으면(원고 reason이 깨짐) 안 받음');
  const a = reasonAddRule(p, T1, 'no', LINE, T0, ALL);
  assert.equal(a.ok, true);
  assert.equal(a.coins, WRITE_COINS.first);
  assert.deepEqual([p.coins, p.coinsEarned], [WRITE_COINS.first, WRITE_COINS.first]);
  const e = writesOf(p.korWrites)[reasonCardId(T1.id)].list[0];
  assert.equal(e.text, `${T1.no.claim} 또, ${LINE}.`);
  assert.equal(reasonAddRule(p, T1, 'yes', LINE, T0 + 1, ALL).why, 'pending');
  assert.equal(writesOf(p.korWrites)[T1.id], undefined, '✍️ 짧은 글 카드(N##)는 건드리지 않는다');
});

test('💡 답장: ✅면 🎯 논술 잡기 1번(💰·🟩 없음 · 카드마다 한 번 · 그 뒤로 칸 없음) · 🔸·🔁는 보상 없이 다시(💰5는 다시 안 줌) · 같은 묶음의 ✍️ 짧은 글 보상은 그대로', () => {
  const p = pf({ nonsul: played(T1.id, TOPICS[1].id) });
  const rid = reasonCardId(T1.id);
  const a = reasonAddRule(p, T1, 'yes', LINE, T0, ALL);
  const near = writeReplyRule(p, [R(rid, a, 'near', '판에 있던 이유와 거의 같아요 — 내 말로 하나 더?')], T0 + 1, ALL);
  assert.deepEqual([near.coins, near.stone, near.throws, near.applied[0].throw], [0, 0, 0, 0]);
  assert.equal(cardWriteState(p.korWrites, rid).canWrite, true, '🔸 뒤 다시 쓸 수 있다');
  const b = reasonAddRule(p, T1, 'yes', '우리 반 친구들이 다 좋아해요', T0 + 2, ALL);
  assert.equal(b.coins, 0, '💰5는 처음 한 번');
  // 같은 묶음에 ✍️ 짧은 글 ✅도
  const nid = TOPICS[1].id;
  const essay = writeAddRule(p, nid, `나는 찬성이라고 생각해요. 왜냐하면 재밌기 때문이에요. 물론 반대하는 친구도 있을 거예요. 그래도 나는 찬성이라고 생각해요.`, T0 + 3, ALL);
  assert.equal(essay.ok, true);
  const coins0 = p.coins;
  const ok = writeReplyRule(p, [R(rid, b, 'ok', '내 말로 쓴 이유예요!'), R(nid, essay, 'ok', '짜임이 다 있어요!')], T0 + 4, ALL);
  assert.deepEqual([ok.throws, ok.stone, ok.coins], [1, 1, WRITE_COINS.ok], '🎯는 내 이유 · 💰20·🟩는 짧은 글');
  assert.deepEqual(ok.applied.map((x) => [x.card, x.coins, x.stone, x.throw]), [[rid, 0, 0, 1], [nid, WRITE_COINS.ok, 1, undefined]]);
  assert.equal(p.coins, coins0 + WRITE_COINS.ok);
  assert.equal((p.items || {})[KOR_STONE], 1, '🟩는 짧은 글 몫 하나만');
  assert.equal(pendingOf(p.nonsulThrow), 1);
  const st = cardWriteState(p.korWrites, rid);
  assert.deepEqual([st.done, st.canWrite], [true, false]);
  assert.equal(reasonAddRule(p, T1, 'yes', LINE, T0 + 5, ALL).why, 'done');
  // 병합 — 두 사본이 같은 ✅를 받아도 「✅ 보상 준 날」은 이른 날 하나
  const other = JSON.parse(JSON.stringify(p.korWrites));
  other[rid].paid.stone += 3;
  assert.equal(writesOf(mergeWrites(p.korWrites, other))[rid].paid.stone, writesOf(p.korWrites)[rid].paid.stone);
});

test('💡 답장 파일·올릴 목록: R## 줄을 받는다 · 받은 원고에 R이 없으면 이번엔 뺀다 · todo에 주제 제목·reason 물음 · todo.md에 「💡 논술 내 이유」와 머리 설명', () => {
  const p = pf();
  const a = reasonAddRule(p, T1, 'yes', LINE, T0, ALL);
  const row = R(reasonCardId(T1.id), a, 'ok', '좋아요');
  assert.deepEqual(checkReplies([row], ALL).bad, []);
  assert.equal(checkReplies([row], [...KCARDS, ...NCARDS]).bad.length, 1, 'R 카드가 없으면 받지 않음');
  assert.deepEqual(rowsOfFams([row], new Set(['K', 'N'])), [], '논술 원고를 못 받은 화면 — R 줄은 다음에');
  assert.deepEqual(rowsOfFams([row], new Set(['K', 'N', 'R'])), [row]);
  const todo = writeTodo(p.korWrites, ALL);
  assert.equal(todo.length, 1);
  assert.deepEqual([todo[0].card, todo[0].title, todo[0].q, todo[0].v], [reasonCardId(T1.id), T1.q, RAW.reason.q, 1]);
  const md = koreanFiles(todo, '2026-10-28').find((f) => f.path === 'korean/todo.md').text;
  assert.ok(md.includes(`[${reasonCardId(T1.id)} · id ${a.id}`) && md.includes(`💡 논술 내 이유 「${T1.q}」`));
  assert.ok(md.includes('(R## = 💡 논술 내 이유 한 줄 — 같은 번호 N## 주제 · 채점 기준은 nonsul.json의 reason'));
});

test('💡 장부 카드 상한: 국어 K## + 논술 N## + 내 이유 R##가 100을 넘어도 하나도 안 빠진다 · 지금 원고의 서술형 카드는 모두 상한 안', () => {
  const raw = {};
  for (let i = 1; i <= 150; i++) {
    raw[`K${i}`] = { last: i, list: [], paid: {} };
    raw[`R${i}`] = { last: i, list: [], paid: {} };
  }
  assert.equal(Object.keys(writesOf(raw)).length, 300);
  // 🔍 Codex 160차 — 원고가 늘어 상한을 넘으면 조용히 빠지니, 지금 원고의 카드가 모두 남는지 본다
  //   장부에 생기는 것은 국어 글 가운데 ✍️ 서술형(write)이 있는 카드뿐 — 글 전체(v372에 166편)를 세면 상한을 넘은 것처럼 보였다
  const WRITES = ALL.filter((c) => !/^K\d+$/.test(c.id) || c.write);
  const all = Object.fromEntries(WRITES.map((c, i) => [c.id, { last: i + 1, list: [], paid: {} }]));
  assert.ok(WRITES.length > 100, `카드 ${WRITES.length}`);
  assert.deepEqual(Object.keys(writesOf(all)).sort(), WRITES.map((c) => c.id).sort());
});

test('💡 프로필 병합 (🔍 Codex 160차 #1): 갈라진 두 사본이 다른 주제 ✅로 받은 🎯는 둘 다 · 같은 주제 ✅는 한 번 · 쓴 기회는 되살아나지 않음 · 다시 합쳐도 그대로', () => {
  const T2 = TOPICS[1];
  const base = { ...pf({ nonsul: played(T1.id, T2.id) }), id: 'me', updatedAt: 1 };
  const okReply = (p, t, at) => { const w = writesOf(p.korWrites)[reasonCardId(t.id)].list.find((e) => !e.grade); return writeReplyRule(p, [R(reasonCardId(t.id), w, 'ok', '좋아요!')], at, ALL); };
  // ① 서로 다른 주제
  const a = cloneProfile(base); reasonAddRule(a, T1, 'yes', LINE, T0, ALL); okReply(a, T1, T0 + 1); a.updatedAt = 5;
  const b = cloneProfile(base); reasonAddRule(b, T2, 'no', LINE, T0, ALL); okReply(b, T2, T0 + 1); b.updatedAt = 6;
  assert.deepEqual([pendingOf(a.nonsulThrow), pendingOf(b.nonsulThrow)], [1, 1]);
  const m = mergeStatRecord('profile', a, b);
  assert.equal(m.nonsulThrow.earned, 2, '🎯 둘 다');
  assert.equal(reasonPaidCount(m.korWrites), 2);
  assert.equal(mergeStatRecord('profile', m, a).nonsulThrow.earned, 2, '다시 합쳐도 그대로');
  assert.equal(mergeStatRecord('profile', b, m).nonsulThrow.earned, 2);
  // ② 같은 주제를 두 사본이 따로 ✅
  const sent = cloneProfile(base); reasonAddRule(sent, T1, 'yes', LINE, T0, ALL);
  const c = cloneProfile(sent); okReply(c, T1, T0 + 1); c.updatedAt = 5;
  const d = cloneProfile(sent); okReply(d, T1, T0 + 2); d.updatedAt = 6;
  assert.equal(mergeStatRecord('profile', c, d).nonsulThrow.earned, 1, '같은 주제는 한 번');
  // ③ 던진 기회 + 옛 백업(같은 ✅ · 아직 안 던짐)
  const thrown = cloneProfile(c); thrown.nonsulThrow = { ...thrown.nonsulThrow, used: 1 }; thrown.updatedAt = 9;
  const mm = mergeStatRecord('profile', thrown, d);
  assert.deepEqual([mm.nonsulThrow.earned, mm.nonsulThrow.used, pendingOf(mm.nonsulThrow)], [1, 1, 0], '쓴 기회는 되살아나지 않는다');
  // 판 끝 🎯(내 이유와 상관없는 카운터)는 예전처럼 큰 쪽
  const e = cloneProfile(base); e.nonsulThrow = { earned: 3, used: 0, refunded: 0 }; e.updatedAt = 5;
  assert.equal(reasonThrowsFix({ earned: 3, used: 0, refunded: 0 }, e.korWrites, base.korWrites, mergeStatRecord('profile', e, base).korWrites).earned, 3);
});

test('💡 의견 문장을 그대로 옮기면 (🔍 Codex 160차 #4): 「내 말」이 없어 받지 않고, 저장 실패가 아니라 「내 말로 써 볼까요?」', () => {
  const p = pf();
  for (const side of ['yes', 'no']) {
    assert.equal(reasonCheck(T1[side].claim).ok, true, '한 줄 검사는 통과하는 길이');
    const r = reasonAddRule(p, T1, 'yes', T1[side].claim, T0, ALL);
    assert.equal(r.why, 'own', side);
    assert.equal(reasonSendWhy(r), '내 의견을 돕는 까닭을 내 말로 써 볼까요?');
  }
  assert.equal(writesOf(p.korWrites)[reasonCardId(T1.id)], undefined, '아무것도 안 남음');
});

test('💡 📤 요약 줄 · 답장 붙은 한 줄(논술 화면 NR · 국어 화면은 K만) · 보내기 말', () => {
  const p = pf({ nonsul: played(T1.id, TOPICS[1].id) });
  assert.equal(reasonReport({}), '💡 내 이유 한 줄: (아직 보낸 줄 없음)');
  const a = reasonAddRule(p, T1, 'yes', LINE, T0, ALL);
  writeReplyRule(p, [R(reasonCardId(T1.id), a, 'ok', '좋아요')], T0 + 1, ALL);
  reasonAddRule(p, TOPICS[1], 'no', LINE, T0 + 2, ALL);
  assert.equal(reasonReport(p.korWrites), '💡 내 이유 한 줄: 보낸 줄 2개 (주제 2개) · 답장 받은 줄 1개 · 답장 기다리는 줄 1개 · ✅ 주제 1개');
  const raw = ['reading', 'words', 'puzzles'].map((n) => JSON.parse(read(`coach/korean/${n}.json`)));
  const t = korReportFromRaw({ ...emptyProfile(), korWrites: p.korWrites, nonsul: p.nonsul }, [...raw, RAW], '2026-10-28', []);
  assert.ok(t.includes('\n- 💡 내 이유 한 줄: 보낸 줄 2개 (주제 2개)'), t.slice(-300));
  const r = { ok: true, coins: 20, stone: 1, throws: 1, applied: [{ card: 'R1', coins: 0, stone: 0, throw: 1 }, { card: 'N2', coins: 20, stone: 1 }, { card: 'K3', coins: 0, stone: 0 }] };
  assert.equal(appliedLine(r, 'NR'), '📬 아빠 답장이 2개 왔어요 — 💰 +20 · 🟩 국어스톤 +1 · 🎯 논술 포켓몬 잡기 1번');
  assert.equal(appliedLine(r, 'K'), '📬 아빠 답장이 1개 왔어요');
  assert.equal(appliedLine(r), '📬 아빠 답장이 3개 왔어요 — 💰 +20 · 🟩 국어스톤 +1 · 🎯 논술 포켓몬 잡기 1번');
  assert.equal(reasonSendWhy({ why: 'short' }), '조금만 더 써 볼까요? 왜 그렇게 생각하는지요');
  assert.equal(reasonSendWhy({ why: 'pending' }), '이 주제 내 이유는 벌써 보냈어요 — 아빠 답장을 기다려요');
  assert.equal(reasonSendWhy(null), '저장을 못 했어요 — 한 번 더 눌러 주세요 (쓴 글은 그대로 있어요)');
});

// ───────── ★ 저장 경로 (가짜 IndexedDB) ─────────
let initDone = false;
const stored = () => fakeIdb.get('profile', 'me');
async function seed(p) {
  if (!initDone) { await initProfile(); initDone = true; }
  await flushProfile();
  const cur = stored() || emptyProfile();
  fakeIdb.put('profile', { ...cur, ...p, id: 'me', updatedAt: (cur.updatedAt || 0) + 1 });
  await reloadProfile();
}

test('★ 💡 저장 경로: 저장이 안 되면 없던 일 · 두 창이 같이 보내도 한 줄·💰5 한 번 · 같은 ✅ 답장을 두 창이 붙여도 🎯 한 번 · 메모리 프로필에도 바로', async () => {
  await seed({ coins: 0, coinsEarned: 0, korWrites: {}, items: {}, nonsul: played(T1.id), nonsulThrow: { earned: 0, used: 0, refunded: 0 } });
  fakeIdb.failNext('profile');
  assert.equal((await nonsulReasonAdd(T1, 'yes', LINE, RCARDS)).ok, false);
  assert.deepEqual([stored().coins, Object.keys(stored().korWrites || {}).length], [0, 0], '저장 실패 = 없던 일');
  const [x, y] = await Promise.all([nonsulReasonAdd(T1, 'yes', LINE, RCARDS), nonsulReasonAdd(T1, 'yes', LINE, RCARDS)]);
  assert.deepEqual([x.ok, y.ok].sort(), [false, true]);
  assert.equal(stored().coins, WRITE_COINS.first);
  const w = x.ok ? x : y;
  const rep = [R(reasonCardId(T1.id), w, 'ok', '내 말로 쓴 이유예요!')];
  const before = nonsulThrowsLeft();
  const [a, b] = await Promise.all([korWriteApply(rep, ALL), korWriteApply(rep, ALL)]);
  assert.deepEqual([a.ok, b.ok].sort(), [false, true]);
  assert.equal(pendingOf(stored().nonsulThrow), 1);
  assert.equal(nonsulThrowsLeft(), before + 1, '논술 화면의 🎯 단추가 바로 뜬다');
  assert.deepEqual([stored().coins, (stored().items || {})[KOR_STONE] || 0], [WRITE_COINS.first, 0]);
});

test('💡 화면 연결: 판 끝(저장된 뒤)에만 칸 · ⭐ 연습 판도 · 기다림·✅면 칸 없음 · 안 읽은 답장은 열어 보기 · 다시 그려도 쓰던 줄·커서 · 📬 띠·쓰기 화면 R## · 🔸·🔁 뒤엔 이 주제 다시 · 셈 문구 없음 · sw v355', () => {
  const v = read('js/nonsulview.js');
  assert.ok(v.includes('S.rcards = nonsulReasonCards(S.data);'));
  const fin = body(v, 'function finishEl(r) {');
  assert.ok(fin.includes('const rl = res.ok ? reasonEl(r) : null;'), '저장된 판 끝에만 (연습 판도 res.ok)');
  assert.ok(fin.includes('if (r.reasonSent) parts[1] = `${parts[1]} ${REASON_HEAD} ${r.reasonSent.line}`;'), '보낸 줄이 「내가 만든 글」 이유 줄 끝에');
  const re = body(v, 'function reasonEl(r) {');
  assert.ok(re.includes('if (!card || !r.side) return null;') && re.includes('if (!st.canWrite && !r.reasonBusy) {') && re.includes('if (!r.reasonMsg) return null;'), '기다림·✅면 칸 없음');
  assert.ok(re.includes("() => guardStart('korean', () => openWrite(card.id))"), '안 읽은 답장 → 쓰기 화면(⏳ 국어 시간)');
  assert.ok(re.includes('res = await nonsulReasonAdd(r.t, r.side, value, S.rcards);') && re.includes('m.sendReport({ force: true })'), '판에서 고른 편으로 · 보내면 바로 📤');
  // 🔍 Codex 160차 #2 — 보내는 중에 다시 그려진 칸도 잠그고, 결과 말은 판에 두고 지금 붙은 칸으로 다시 그린다
  assert.ok(re.includes('const busy = !!r.reasonBusy;') && re.includes('inp.readOnly = busy;') && re.includes('send.disabled = busy;') && re.includes("busy ? '보내는 중…' : '✉️ 아빠에게 보내기'"), '보내는 중 다시 그려도 잠김');
  assert.ok(re.includes('const value = inp.value;') && re.includes('line: reasonTail(value)'), '누른 순간의 글로 보내고 붙인다');
  assert.ok(re.includes('} else r.reasonMsg = reasonSendWhy(res);') && re.includes("const msg = el('p', 'kor-wmsg', r.reasonMsg || '');"), '결과 말은 판에 두고 다시 그려도 남는다');
  assert.ok(re.includes('if (!st.canWrite && !r.reasonBusy) {') && re.includes("box.appendChild(el('p', 'kor-wmsg', r.reasonMsg));"), '다른 창이 먼저 보냈으면 칸 대신 까닭 한 줄');
  assert.ok(!/setTimeout/.test(re), '옛 칸을 시간 뒤에 고치지 않는다');
  assert.ok(re.includes("inp.value = r.reasonText || '';") && re.includes('r.reasonText = inp.value;'), '쓰던 줄은 판에');
  assert.ok(re.includes("e.key === 'Enter' && !e.isComposing"), '한글 조합 중 Enter로 보내지 않는다');
  assert.ok(re.includes("st.paid.first ? '아빠가 ✅ 하면 🎯 논술 포켓몬 잡기!'"), '💰5는 처음 보낼 때만 말한다');
  assert.ok(!/\.innerHTML\s*=|insertAdjacentHTML/.test(re), '아이 글은 textContent로');
  assert.ok(!/\$\{[^}]*\}\s*\/\s*\$\{|남은|남았|번째|몇 번/.test(re), '셈 문구 없음');
  const rr = body(v, 'function renderRound() {');
  assert.ok(rr.includes("ae.classList.contains('ns-reason-input')") && rr.includes('inp.focus({ preventScroll: true });'), '판 끝이 다시 그려져도 쓰던 칸·커서');
  assert.ok(body(v, 'function renderWrite() {').includes('sec.appendChild(writeBoxEl(card, rc ? reasonCtx : writeCtx));'));
  assert.ok(body(v, 'function reasonAgainEl(card) {').includes("guardStart('korean', () => startRound(false, id))"), '🔸·🔁 뒤 = 이 주제 다시 해 보기(⏳ 국어 시간)');
  assert.ok(v.includes('const reasonCtx = { cards: () => S.rcards, form: reasonAgainEl, words: REASON_WORDS };'));
  const kw = read('js/korwriteview.js');
  assert.ok(kw.includes("const cards = fam === 'K' ? validCards(json) : [...nonsulWriteCards(json), ...nonsulReasonCards(json)];") && kw.includes('for (const c of more) fams.add(c.id[0]);'));
  assert.ok(read('js/stats.js').includes("const rsWait = wtodo.filter((t) => String(t.card).startsWith('R')).length;"));
  assert.ok(read('css/style.css').includes('.ns-reason {'));
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(read('sw.js')) || [])[1]) >= 355);
});
