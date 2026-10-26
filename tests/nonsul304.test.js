// ✍️ 🖊️ 논술 짧은 글 v304 (2026-10-20, 아버님 물음 넷 모두 추천안 — 칸마다 머리말 채우기 · 판을 끝낸 주제 · 판에서 본 이유를 옮겨도 ✅ · 보상은 국어 ✍️와 같게)
//  같은 장부(korWrites)·같은 왕복(korean/todo.json·replies.json)·같은 보상 — 카드 열쇠 N## · 논술 글은 300자까지 ·
//  답장 받기는 국어·논술 어느 화면에서든 두 원고의 카드를 함께(못 받은 원고의 줄은 이번엔 뺀다) · 📤 요약은 국어·논술을 갈라 센다
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  checkNonsul, checkNonsulWrite, allTopics, nonsulWriteCards, composeEssay, essayCheck, essayTopics, essayTag, essayReport,
  ESSAY_HEADS, ESSAY_FRAMES, NONSUL_WRITE_MAX, ESSAY_FIELD_MIN, SOLVED,
} from '../js/nonsul.js';
import {
  writesOf, mergeWrites, writeAddRule, writeReplyRule, checkReplies, replyStats, writeTodo, writeCheck, writeMaxOf, rowsOfFams, cardWriteState,
  WRITE_MAX_HI, WRITE_CARD_RE, WRITE_COINS, REPLY_ROWS_MAX, textLen,
} from '../js/korwrite.js';
import { validCards, WRITE_MAX, KOR_STONE, PAST_MAX } from '../js/korean.js';
import { emptyProfile, cloneProfile } from '../js/db.js';
import { initProfile, flushProfile, reloadProfile, korWriteAdd, korWriteApply } from '../js/xp.js';
import * as UP from '../js/upload.js';
import { checkPrivateDir } from '../tools/privcheck.mjs';
import { appliedLine, WRITE_WORDS } from '../js/korwriteview.js';
import { essayCountLine, essaySendWhy, ESSAY_WORDS } from '../js/nonsulwriteview.js';
import { korReportFromRaw } from '../js/korreport.js';

void fakeIdb;
const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const RAW = JSON.parse(read('coach/korean/nonsul.json'));
const KCARDS = validCards(JSON.parse(read('coach/korean/reading.json')));
const NCARDS = nonsulWriteCards(RAW);
const ALL = [...KCARDS, ...NCARDS];
const T0 = new Date(2026, 9, 20, 15).getTime();
const pf = (o = {}) => cloneProfile({ ...emptyProfile(), ...o });
const clone = (x) => JSON.parse(JSON.stringify(x));
const body = (src, head) => { const i = src.indexOf(head); assert.ok(i >= 0, head); return src.slice(i, src.indexOf('\n}\n', i)); };
/** 칸 다섯 다 채운 글 */
const FULL = {
  claim: '게임 시간은 스스로 정해도 된다고 생각해요',
  why: '스스로 정하면 약속을 더 잘 지키게 되기 때문이에요',
  more: '',
  counter: '너무 오래 할 수 있다고 말하는 친구도 있을 거예요',
  close: '스스로 정하는 연습이 필요하다고 생각해요',
};
const R = (card, w, grade, text, v) => ({ card, id: w.id, at: w.at, grade, text, ...(v ? { v } : {}) });

test('✍️ 원고: 채점 기준 write 하나 · 판 1 · 꼭 들어갈 것 셋(의견·이유·짜임) · 흔한 잘못마다 등급 하나 · 맞춤법은 채점 안 함 · 검사가 잡는 것', () => {
  assert.deepEqual(checkNonsul(RAW), []);
  assert.deepEqual(checkNonsulWrite(RAW.write), []);
  const w = RAW.write;
  assert.equal(w.v, 1);
  assert.deepEqual(w.rubric.must.map((m) => m.split(' — ')[0]), ['의견', '이유', '짜임'], '넷으로 두면 "둘 빠짐"이 GRADES.near(하나 빠짐)와 어긋난다');
  for (const m of w.rubric.miss) assert.equal((m.match(/🔸|🔁|✅/g) || []).length, 1, `등급 하나: ${m}`);
  assert.ok(w.rubric.must[1].includes('그대로 옮겨도'), '판에서 본 이유를 옮겨도 이유로 본다(아버님 결정)');
  assert.ok(RAW.about.includes('맞춤법은 채점하지 않는다'));
  const bad = (edit, re) => { const x = clone(RAW); edit(x.write); assert.ok(checkNonsul(x).some((m) => re.test(m)), `${re}: ${checkNonsul(x)}`); };
  bad((x) => { x.v = 0; }, /write\.v/);
  bad((x) => { x.q = ' '; }, /write\.q/);
  bad((x) => { x.rubric.must = []; }, /must/);
  bad((x) => { x.rubric.ok = 'x'; }, /ok·miss/);
  bad((x) => { x.past = [{ v: 1, q: 'q', rubric: x.rubric }]; }, /past 1의 v/);
  bad((x) => { x.past = Array.from({ length: PAST_MAX + 1 }, () => ({})); }, /past\(옛 판\)/);
  const none = clone(RAW);
  delete none.write;
  assert.ok(checkNonsul(none).some((m) => /write는/.test(m)), '채점 기준이 없으면 배포 전에 막는다');
});

test('✍️ 주제 → 서술형 카드: 쓸 수 있는 주제마다 N## · 제목은 주제 물음 · 물음·기준은 공통 · 300자 · 머리말이 틀 · 기준이 깨지면 [](짧은 글을 안 연다)', () => {
  assert.deepEqual(NCARDS.map((c) => c.id), allTopics(RAW).map((t) => t.id));
  assert.equal(NCARDS.length, 62); // v316 📖 독서 논술 10 · v342 생활 셋째 묶음 20
  for (const c of NCARDS) {
    assert.ok(WRITE_CARD_RE.test(c.id));
    assert.equal(c.title, allTopics(RAW).find((t) => t.id === c.id).q);
    assert.deepEqual([c.write.v, c.write.q, c.write.max], [1, RAW.write.q, NONSUL_WRITE_MAX]);
  }
  assert.deepEqual(ESSAY_FRAMES, ['나는 ~', '왜냐하면 ~', '물론 ~', '그래도 나는 ~']);
  assert.deepEqual(ESSAY_HEADS.map((h) => [h.k, h.head, h.need]), [['claim', '나는', true], ['why', '왜냐하면', true], ['more', '또', false], ['counter', '물론', false], ['close', '그래도 나는', false]]);
  const broken = clone(RAW);
  broken.write.rubric.must = [];
  assert.deepEqual(nonsulWriteCards(broken), []);
  assert.deepEqual([nonsulWriteCards(null), nonsulWriteCards({ topics: RAW.topics })], [[], []]);
  assert.equal(NONSUL_WRITE_MAX, WRITE_MAX_HI);
  assert.ok(NONSUL_WRITE_MAX > WRITE_MAX, '머리말이 들어가 국어 ✍️보다 길게');
});

test('✍️ 칸 합치기: 채운 칸만 「머리말 + 글」 · 마침표 · 빈 칸·문장부호만 칸은 빠짐 · 머리말을 다시 쓴 것은 한 번만 · 공백 정리', () => {
  assert.equal(composeEssay(FULL), '나는 게임 시간은 스스로 정해도 된다고 생각해요. 왜냐하면 스스로 정하면 약속을 더 잘 지키게 되기 때문이에요. 물론 너무 오래 할 수 있다고 말하는 친구도 있을 거예요. 그래도 나는 스스로 정하는 연습이 필요하다고 생각해요.');
  assert.equal(composeEssay({ claim: '나는  좋다고  생각해요!', why: '왜냐하면 재밌어요?', more: '...', counter: ' ', close: '그래도 나는' }), '나는 좋다고 생각해요! 왜냐하면 재밌어요?');
  assert.equal(composeEssay({ more: '친구와 같이 할 수 있어요' }), '또 친구와 같이 할 수 있어요.');
  assert.equal(composeEssay({ claim: '나는요 좋아요' }), '나는 나는요 좋아요.', '「나는요」는 머리말이 아니다(빈칸 뒤만 뗀다)');
  assert.deepEqual([composeEssay(null), composeEssay({}), composeEssay({ claim: 3 })], ['', '', '나는 3.']);
});

test('✍️ 보낼 수 있나: 의견·이유 칸은 꼭(글자 2자) · 나머지는 비어도 보냄 · 300자까지(국어 카드는 그대로 200) · 머리말만은 못 보냄', () => {
  assert.deepEqual(essayCheck(FULL), { ok: true, n: textLen(composeEssay(FULL)) });
  assert.equal(essayCheck({ ...FULL, claim: '' }).why, 'claim');
  assert.equal(essayCheck({ ...FULL, why: '나는' }).ok, true, '이유 칸에 쓴 「나는」은 내 말(머리말은 「왜냐하면」)');
  assert.equal(essayCheck({ ...FULL, why: '왜냐하면' }).why, 'why', '머리말만 다시 쓴 칸은 빈 칸');
  assert.equal(essayCheck({ ...FULL, why: '!!' }).why, 'why');
  assert.equal(essayCheck({ claim: '좋다고 생각해요', why: '재밌어' }).ok, true, '의견·이유만 — 빈 칸은 답장에서 다음 걸음');
  assert.equal(essayCheck({ claim: '좋아', why: '가' }).why, 'why', `꼭 칸은 ${ESSAY_FIELD_MIN}자`);
  const long = { ...FULL, more: '가'.repeat(NONSUL_WRITE_MAX) };
  assert.equal(essayCheck(long).why, 'long');
  const fit = { ...FULL, more: '가'.repeat(NONSUL_WRITE_MAX - textLen(composeEssay(FULL)) - 4) }; // 「 또 ….」 네 글자
  assert.equal(textLen(composeEssay(fit)), NONSUL_WRITE_MAX);
  assert.equal(essayCheck(fit).ok, true, '300자 딱은 보냄');
  assert.equal(writeCheck('가'.repeat(250)).why, 'long', '기본 상한은 국어 200');
  assert.equal(writeCheck('가'.repeat(250), [], 300).ok, true);
  assert.deepEqual([writeMaxOf({ max: 300 }), writeMaxOf({ max: 500 }), writeMaxOf({ max: 150 }), writeMaxOf({}), writeMaxOf(null)], [300, WRITE_MAX, WRITE_MAX, WRITE_MAX, WRITE_MAX], '원고가 상한을 마음대로 늘리지 못한다');
});

test('✍️ 장부: 논술 주제 N##도 같은 korWrites · 첫 글 💰5 · 답장 기다리는 글 하나 · 🔸까지 💰10 · ✅까지 💰20 + 🟩 · 300자 글도 받음(국어 카드는 200에서 막음) · 이상한 열쇠는 버림 · 병합', () => {
  const p = pf({ coins: 0, coinsEarned: 0 });
  const text = composeEssay(FULL);
  const a = writeAddRule(p, 'N2', text, T0, ALL);
  assert.deepEqual([a.ok, a.coins, p.coins], [true, WRITE_COINS.first, WRITE_COINS.first]);
  assert.equal(writeAddRule(p, 'N2', text, T0 + 1, ALL).why, 'pending');
  assert.equal(writeAddRule(p, 'N2', text, T0 + 1, KCARDS).why, 'unknown', '국어 카드만 넘기면 논술 주제를 모른다');
  const n1 = writeReplyRule(p, [R('N2', a, 'near', '이유가 좋아요! 반대 의견도 써 볼까?')], T0 + 2, ALL);
  assert.deepEqual([n1.ok, n1.coins], [true, WRITE_COINS.near]);
  const b = writeAddRule(p, 'N2', `${text} 또 써 봐요.`, T0 + 3, ALL);
  const ok = writeReplyRule(p, [R('N2', b, 'ok', '짜임이 딱 맞아요!')], T0 + 4, ALL);
  assert.deepEqual([ok.coins, ok.stone, p.items[KOR_STONE]], [WRITE_COINS.ok - WRITE_COINS.near, 1, 1]);
  assert.equal(p.coins, WRITE_COINS.first + WRITE_COINS.ok);
  assert.equal(writeAddRule(p, 'N2', text, T0 + 5, ALL).why, 'done', '✅ 받은 주제는 끝');
  const q = pf();
  const long = '가'.repeat(260);
  assert.equal(writeAddRule(q, 'N3', long, T0, ALL).ok, true, '논술은 300자까지');
  assert.equal(writeAddRule(q, 'K19', long, T0, ALL).why, 'long', '국어 카드는 그대로 200자');
  assert.deepEqual(Object.keys(writesOf({ N3: q.korWrites.N3, X1: {}, N1234: {}, n3: {}, K19: {} })).sort(), ['K19', 'N3']);
  const m = mergeWrites(p.korWrites, q.korWrites);
  assert.deepEqual(Object.keys(m).sort(), ['N2', 'N3']);
  assert.equal(cardWriteState(m, 'N2').done, true);
  const full = pf();
  const t300 = '가'.repeat(NONSUL_WRITE_MAX);
  const w300 = writeAddRule(full, 'N7', t300, T0, ALL);
  const back = writesOf(clone(full.korWrites)).N7.list[0];
  assert.deepEqual([back.text.length, back.id], [NONSUL_WRITE_MAX, w300.id], '300자 글이 다시 읽을 때 잘리지 않는다(잘리면 이름표가 바뀌어 답장이 안 붙는다)');
});

test('✍️ 다른 원고의 카드 받기(writeCardsNow): 국어 카드만 받은 화면도 논술 주제를 더한다 · 못 받으면 fams에서 빠짐(그 원고 줄은 이번엔 뺌) · 받은 원고는 다시 안 받음', async () => {
  const { writeCardsNow } = await import('../js/korwriteview.js');
  const real = globalThis.fetch;
  const calls = [];
  try {
    globalThis.fetch = async (u) => { calls.push(u); throw new Error('오프라인'); };
    const off = await writeCardsNow(KCARDS);
    assert.deepEqual([[...off.fams], off.cards.length], [['K'], KCARDS.length], '논술 원고를 못 받으면 K만');
    globalThis.fetch = async (u) => { calls.push(u); return { ok: true, json: async () => JSON.parse(read(String(u).includes('nonsul') ? 'coach/korean/nonsul.json' : 'coach/korean/reading.json')) }; };
    const on = await writeCardsNow(KCARDS);
    assert.deepEqual([[...on.fams].sort(), on.cards.length], [['K', 'N'], KCARDS.length + NCARDS.length]);
    const fromNs = await writeCardsNow(NCARDS);
    assert.deepEqual([[...fromNs.fams].sort(), fromNs.cards.filter((c) => c.id.startsWith('K')).length], [['K', 'N'], KCARDS.length], '논술 화면에서도 국어 카드를 더한다');
    const n = calls.length;
    await writeCardsNow(KCARDS);
    assert.equal(calls.length, n, '한 번 받은 원고는 메모리에서');
    assert.ok(calls.every((u) => /coach\/korean\/(nonsul|reading)\.json$/.test(String(u))));
  } finally {
    globalThis.fetch = real;
  }
});

test('✍️ 답장 받기: 두 원고의 카드를 함께 넘기면 국어·논술 답장 모두 받음 · 한쪽만이면 다른 쪽 줄은 "카드가 아님" · 못 받은 원고의 줄은 이번엔 뺌(500줄 넘는 파일은 그대로)', () => {
  const ID = 'w' + 'a'.repeat(14);
  const rows = [{ card: 'K19', id: ID, at: 5, grade: 'ok', text: '좋아!' }, { card: 'N4', id: ID, at: 6, grade: 'near', text: '반대 의견도!' }, { card: 'Z1', id: ID, at: 7, grade: 'ok', text: '?' }];
  const all = checkReplies(rows, ALL);
  assert.deepEqual([all.good.map((g) => g.card), all.bad.map((b) => b.i)], [['K19', 'N4'], [2]]);
  assert.deepEqual(checkReplies(rows, KCARDS).bad.map((b) => b.i), [1, 2], '논술 카드를 안 넘기면 논술 답장이 ⚠️ — 그래서 늘 함께');
  assert.deepEqual(rowsOfFams(rows, new Set(['K'])).map((r) => r.card), ['K19', 'Z1'], '논술 원고를 못 받으면 N 줄만 뺀다 · 이상한 줄은 남겨 까닭을 적게');
  assert.deepEqual(rowsOfFams(rows, new Set(['K', 'N'])).length, 3);
  assert.deepEqual(rowsOfFams([null, 'x', { card: 5 }], new Set()).length, 3);
  const many = Array.from({ length: REPLY_ROWS_MAX + 1 }, (_, i) => ({ card: i % 2 ? 'K1' : 'N1', id: ID, grade: 'ok', text: 't' }));
  assert.equal(rowsOfFams(many, new Set(['K'])).length, REPLY_ROWS_MAX + 1, '넘치는 파일은 골라 받지 않는다');
  const st = replyStats({}, rows, ALL);
  assert.deepEqual([st.good, st.bad, st.none], [2, 1, 2]);
});

test('✍️ 올릴 목록·todo.md: 논술 글은 제목이 주제 · 물음은 공통 · 「🖊️ 논술 짧은 글」 표시 · 채점 기준이 어디 있는지 머리에', () => {
  const p = pf();
  const a = writeAddRule(p, 'N5', composeEssay(FULL), T0, ALL);
  const k = writeAddRule(p, 'K19', '민재는 물 주기를 잊어서 미안했을 것 같아요. ⑤ 화분 앞에 오래 서 있었어요.', T0 + 1, ALL);
  const todo = writeTodo(p.korWrites, ALL);
  assert.deepEqual(todo.map((t) => [t.card, t.id]), [['N5', a.id], ['K19', k.id]]);
  assert.deepEqual([todo[0].title, todo[0].q, todo[0].v, todo[0].vNow], [NCARDS.find((c) => c.id === 'N5').title, RAW.write.q, 1, 1]);
  const [md] = UP.koreanFiles(todo, '2026-10-20');
  assert.ok(md.text.includes(`[N5 · id ${a.id} · at ${T0} · v 1] 2026-10-20 🖊️ 논술 짧은 글 「${todo[0].title}」`), md.text);
  assert.ok(md.text.includes(`[K19 · id ${k.id} · at ${T0 + 1} · v 1] 2026-10-20 「`), '국어 줄은 그대로');
  assert.match(md.text, /N## = 🖊️ 논술 짧은 글 — 채점 기준은 coach\/korean\/nonsul\.json의 write/);
  const u = read('js/upload.js');
  assert.ok(body(u, 'async function korTodoNow() {').includes("ns = nonsulWriteCards(await (await fetch('./coach/korean/nonsul.json')).json());") && u.includes('return writeTodo(p && p.korWrites, [...cards, ...ns]);'), '📤 목록에 논술 주제 제목·물음');
});

test('🔒 비공개 검사(check.mjs --private): 논술 답장도 앱과 같은 검사(논술 주제 카드를 함께) · 없는 주제는 막음', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ns304-'));
  mkdirSync(join(dir, 'korean'));
  const ID = 'w' + 'b'.repeat(14);
  writeFileSync(join(dir, 'korean/replies.json'), JSON.stringify([{ card: 'N1', id: ID, at: 5, v: 1, grade: 'near', text: '좋아!' }, { card: 'K1', id: ID, at: 5, grade: 'ok', text: '좋아!' }]));
  assert.deepEqual(checkPrivateDir(dir, () => '<svg>'), { errors: [], checked: ['korean/replies.json'] });
  writeFileSync(join(dir, 'korean/replies.json'), JSON.stringify([{ card: 'N99', id: ID, at: 5, grade: 'ok', text: '?' }, { card: 'N1', id: ID, at: 5, v: 2, grade: 'ok', text: '판 없음' }]));
  const e = checkPrivateDir(dir, () => '<svg>').errors;
  assert.equal(e.length, 2);
  assert.match(e.join(' '), /서술형이 있는 카드가 아님/);
  assert.match(e.join(' '), /v는 N1의 채점 기준 판 번호\(v1\)/);
});

test('📤 국어 요약: ✍️ 생각 쓰기 줄은 국어 카드만 · 🖊️ 논술 절에 짧은 글 줄(쓴 글·주제·답장·✅) · 📊 기다리는 글 수에 논술 몇 개인지', () => {
  const p = pf();
  const a = writeAddRule(p, 'N1', composeEssay(FULL), T0, ALL);
  writeReplyRule(p, [R('N1', a, 'ok', '좋아요!')], T0 + 1, ALL);
  writeAddRule(p, 'N2', composeEssay(FULL), T0 + 2, ALL);
  assert.equal(essayReport(p.korWrites), '✍️ 짧은 글: 쓴 글 2개 (주제 2개) · 답장 받은 글 1개 · 답장 기다리는 글 1개 · ✅까지 간 주제 1개');
  assert.equal(essayReport({}), '✍️ 짧은 글: (아직 쓴 글 없음)');
  writeAddRule(p, 'K19', '민재는 물 주기를 잊어서 미안했을 것 같아요. ⑤ 화분 앞에 오래 서 있었어요.', T0 + 3, ALL);
  assert.equal(essayReport(p.korWrites), '✍️ 짧은 글: 쓴 글 2개 (주제 2개) · 답장 받은 글 1개 · 답장 기다리는 글 1개 · ✅까지 간 주제 1개', '국어 카드 글은 안 센다');
  const raw = ['reading', 'words', 'puzzles'].map((n) => JSON.parse(read(`coach/korean/${n}.json`)));
  const prof = { ...emptyProfile(), korWrites: p.korWrites, nonsul: { N1: { box: SOLVED, due: 0, at: T0, miss: 0, d0: 1 } } };
  const t = korReportFromRaw(prof, [...raw, RAW], '2026-10-20', []);
  assert.ok(t.includes('## ✍️ 생각 쓰기\n- 쓴 글 1개 (카드 1장) · 답장 받은 글 0개 · 답장 기다리는 글 1개 · ✅까지 간 카드 0장'), '논술 글은 국어 생각 쓰기에 안 섞인다');
  assert.ok(t.includes('\n- ✍️ 짧은 글: 쓴 글 2개 (주제 2개) · 답장 받은 글 1개 · 답장 기다리는 글 1개 · ✅까지 간 주제 1개'), t.slice(-400));
  const s = read('js/stats.js');
  assert.ok(s.includes("const nsWait = wtodo.filter((t) => String(t.card).startsWith('N')).length;") && s.includes('(🖊️ 논술 짧은 글 ${nsWait}개 포함)'));
});

test('✍️ 첫 화면 목록(순수): 판을 끝낸 주제만 · 원고 차례 · 셈 없이 📬·✉️·✅·✍️ 표시', () => {
  const p = pf();
  const list = allTopics(RAW);
  const st = { N3: { box: 0, due: 9, at: 1, miss: 1, d0: 1 }, N1: { box: SOLVED, due: 0, at: 1, miss: 0, d0: 1 }, N2: { box: SOLVED, due: 0, at: 2, miss: 0, d0: 1 } };
  const a = writeAddRule(p, 'N2', composeEssay(FULL), T0, ALL);
  const b = writeAddRule(p, 'N3', composeEssay(FULL), T0, ALL);
  writeReplyRule(p, [R('N3', b, 'again', '의견이 어느 쪽인지 써 볼까?')], T0 + 1, ALL);
  const items = essayTopics(list, st, p.korWrites);
  assert.deepEqual(items.map((i) => [i.id, i.tag]), [['N1', ''], ['N2', '✉️ 답장 기다리는 중'], ['N3', '📬 아빠 답장이 왔어요']]);
  assert.deepEqual(essayTopics(list, {}, p.korWrites), [], '판을 안 끝낸 주제는 안 나온다');
  // 🔍 Codex 146차: v342부터 원고 차례와 번호 차례가 다르다 — 목록은 번호가 아니라 원고 차례(N33 📖 → N43 → N44 → N34 📖)
  const mixed = { N34: st.N1, N44: st.N1, N33: st.N1, N43: st.N1 };
  assert.deepEqual(essayTopics(list, mixed, {}).map((i) => i.id), ['N33', 'N43', 'N44', 'N34']);
  assert.equal(essayTag({ lastGraded: {}, done: false }), '✍️ 다시 써 볼 수 있어요');
  assert.equal(essayTag({ done: true }), '✅ 끝');
  assert.equal(essayTag(null), '');
  void a;
});

test('✍️ 화면 말(순수): 글자 수 줄 · 보내기 결과 말(300자·빈 칸) · 답장 붙은 한 줄은 그 화면 원고만 · 논술 말(어디에 📬가 뜨나)', () => {
  assert.deepEqual(essayCountLine({}), { text: '💭 내 의견 칸을 채우면 보낼 수 있어요', ok: false, warn: false });
  assert.deepEqual(essayCountLine({ claim: '좋아요' }), { text: '💡 이유 칸을 채우면 보낼 수 있어요', ok: false, warn: false });
  // Codex 110차 #3: 글자 수 숫자 없이 — 아이 화면에 셈을 띄우지 않는다(2026-10-15) · 300자 상한은 규칙(essayCheck)이 본다
  assert.deepEqual(essayCountLine(FULL), { text: '✉️ 보낼 수 있어요', ok: true, warn: false });
  assert.deepEqual(essayCountLine({ ...FULL, more: '가'.repeat(400) }), { text: '글이 조금 길어요 — 조금 줄여 볼까요?', ok: false, warn: true });
  for (const f of [{}, { claim: '좋아요' }, FULL, { ...FULL, more: '가'.repeat(400) }, { claim: '좋아', why: '재밌어서요', more: '!' }]) assert.ok(!/\d/.test(essayCountLine(f).text), `숫자 없음: ${essayCountLine(f).text}`);
  assert.equal(essaySendWhy({ why: 'long' }), '글이 조금 길어요 — 조금 줄여 볼까요?');
  assert.ok(!/\d/.test(essaySendWhy({ why: 'long' })), '국어 200자 말도, 숫자도 쓰지 않는다');
  assert.equal(essaySendWhy({ why: 'claim' }), '💭 내 의견 칸을 채워 볼까요?');
  assert.equal(essaySendWhy({ why: 'pending' }), '이미 보낸 글이 있어요 — 아빠 답장을 기다려요');
  const r = { ok: true, applied: [{ card: 'K1', coins: 10, stone: 0 }, { card: 'N2', coins: 20, stone: 1 }], coins: 30, stone: 1 };
  assert.equal(appliedLine(r), '📬 아빠 답장이 2개 왔어요 — 💰 +30 · 🟩 국어스톤 +1');
  assert.equal(appliedLine(r, 'K'), '📬 아빠 답장이 1개 왔어요 — 💰 +10');
  assert.equal(appliedLine(r, 'N'), '📬 아빠 답장이 1개 왔어요 — 💰 +20 · 🟩 국어스톤 +1');
  assert.equal(appliedLine({ ok: true, applied: [{ card: 'K1', coins: 0, stone: 0 }], coins: 0, stone: 0 }, 'N'), '');
  assert.equal(ESSAY_WORDS.where, '🖊️ 논술 첫 화면에');
  assert.equal(WRITE_WORDS.where, '📚 도감 위에');
  for (const t of [...Object.values(ESSAY_WORDS), ...ESSAY_HEADS.map((h) => h.ph)]) assert.ok(!/\d+\s*\/\s*\d+|남은|개 남/.test(t), `아이 화면 말에 셈 없음: ${t}`);
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

test('★ ✍️ 저장 경로: 두 창이 같은 주제 글을 같이 보내도 글 하나·💰5 한 번 · 같은 답장을 두 창이 붙여도 보상 한 번 · 저장이 안 되면 없던 일', async () => {
  await seed({ coins: 0, coinsEarned: 0, korWrites: {}, items: {} });
  const text = composeEssay(FULL);
  fakeIdb.failNext('profile');
  assert.equal((await korWriteAdd('N6', text, ALL)).ok, false);
  assert.deepEqual([stored().coins, Object.keys(stored().korWrites || {}).length], [0, 0], '저장 실패 = 없던 일');
  const [x, y] = await Promise.all([korWriteAdd('N6', text, ALL), korWriteAdd('N6', text, ALL)]);
  assert.deepEqual([x.ok, y.ok].sort(), [false, true]);
  const w = (x.ok ? x : y);
  assert.equal(stored().coins, WRITE_COINS.first);
  const rep = [R('N6', w, 'ok', '의견·이유·반대 의견·정리가 다 있어요!', 1)];
  const [a, b] = await Promise.all([korWriteApply(rep, ALL), korWriteApply(rep, ALL)]);
  assert.deepEqual([a.ok, b.ok].sort(), [false, true]);
  assert.deepEqual([stored().coins, stored().items[KOR_STONE]], [WRITE_COINS.first + WRITE_COINS.ok, 1]);
  assert.equal(writesOf(stored().korWrites).N6.list[0].grade, 'ok');
});

test('✍️ 화면 연결: 논술 화면 — 판 끝(저장된 뒤)·첫 화면 목록·📬 띠·쓰기 화면 · 들어올 때 두 원고로 답장 받기 · 국어 화면은 국어 답장 줄만 · 쓰기 칸은 ctx.form · 글은 textContent · sw v304', () => {
  const v = read('js/nonsulview.js');
  assert.ok(v.includes("const writeCtx = { cards: () => S.wcards, form: essayFormEl, words: ESSAY_WORDS };"));
  assert.ok(v.includes('S.wcards = nonsulWriteCards(S.data);'));
  const fin = body(v, 'function finishEl(r) {');
  assert.ok(fin.includes('const wl = res.ok ? writeLinkEl(r.id) : null;'), '판 끝 단추는 저장이 된 뒤에만');
  const link = body(v, 'function writeLinkEl(id) {');
  assert.ok(link.includes('if (st.done && !st.unread) return null;') && link.includes("'✍️ 이번엔 내 말로 써 볼까요? (하고 싶을 때만)'"));
  assert.ok(body(v, 'function essaysEl() {').includes('essayTopics(S.list, nonsulMap(), korWritesMap())'), '첫 화면 목록은 판을 끝낸 주제만');
  const banner = body(v, 'function replyBannerEl() {');
  assert.ok(banner.includes('unreadReplies(korWritesMap()).filter((u) => !!wcardOf(u.card));'), '논술 📬 띠엔 논술 글 답장만');
  assert.ok(banner.includes("() => guardStart('korean', () => openWrite(list[0].card))"), '📬 띠로 들어가도 ⏳ 국어 시간을 본다(Codex 110차 #2 — 띠 → 다시 써 보기로 시간 밖에서 쓸 수 있었다)');
  assert.ok((v.match(/openWrite\(/g) || []).length === (v.match(/guardStart\('korean', \(\) => openWrite\(/g) || []).length + 1, '쓰기 화면을 여는 곳은 모두 guardStart 안(정의 한 줄만 빼고)');
  assert.ok(body(v, 'function renderHome() {').includes('const es = essaysEl();'));
  const enter = body(v, 'export async function enterNonsul() {');
  assert.ok(enter.includes('syncWrites(S.wcards).then((r) => {') && enter.includes("const line = appliedLine(r, 'N');") && enter.includes('else if (S.w) renderWrite();'));
  assert.ok(body(v, 'function refreshAfterCatch() {').includes('else if (!S.w) renderHome();'), '잡은 뒤 쓰기 화면을 다시 그려 쓰던 칸을 날리지 않는다');
  assert.ok(body(v, "function startRound(practice, want = '') {").includes("S.w = '';")); // v316: 주제를 정해 시작(📖 독서 논술)
  assert.ok(read('js/koreanview.js').includes("const line = appliedLine(r, 'K');"), '국어 화면엔 국어 답장 수만');
  const kw = read('js/korwriteview.js');
  const box = body(kw, 'export function writeBoxEl(card, ctx) {');
  assert.ok(box.includes("const form = (onSent) => (typeof ctx.form === 'function' ? ctx.form(card, ctx, onSent) : formEl(card, ctx, onSent));"));
  assert.equal(box.split('formEl(').length, 2, '국어 쓰기 칸(formEl)은 form() 안에서만 — 다시 쓰기에서도 ctx.form');
  const sync = body(kw, 'export function syncWrites(given) {');
  assert.ok(sync.includes('const { cards, fams } = await writeCardsNow(given);') && sync.includes('const list = rowsOfFams(raw, fams);'));
  const nw = read('js/nonsulwriteview.js');
  assert.ok(!/\.innerHTML\s*=|insertAdjacentHTML/.test(nw), '아이 글은 textContent로만');
  assert.ok(body(nw, 'export function essayFormEl(card, ctx, onSent) {').includes('r = await korWriteAdd(card.id, composeEssay(fields), ctx.cards());'), '보내는 글 = 미리 보기와 같은 합친 글');
  assert.ok(nw.includes('const DRAFT_KEY = (id) => `shincoach.nonsulDraft.${id}`;'), '쓰던 칸은 이 기기에');
  assert.ok(read('tools/privcheck.mjs').includes("const cards = [...validCards(src('reading.json')), ...nonsulWriteCards(src('nonsul.json'))];"));
  const sw = read('sw.js');
  assert.ok(sw.includes("'./js/nonsulwriteview.js',"));
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(sw) || [])[1]) >= 304, 'sw v304 이상');
  assert.ok(read('css/style.css').includes('.ns-wline {'));
});
