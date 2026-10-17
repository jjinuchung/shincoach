// 📚 국어 3단계 v258 (2026-10-14, 아버님 "이대로 진행"):
//  · 🔍 근거 먼저 — 틀린 보기를 두 번 고르면 근거가 있는 물음은 남은 보기를 잠그고 답이 든 줄부터 찾게 · 💡 둘째 힌트(근거가 없는 물음)
//  · 📤 읽은 기록 profile.korReads — 읽은 시간·첫 답까지·첫 번에 맞힘·끝까지 고름·근거 먼저·둘째 힌트 → 국어 요약 "최근 7일 읽은 글"
//  · 새 시 일곱 K54~K60 — 윤동주 「참새」·「햇비」·「빗자루」 · 정지용 「해바라기 씨」 · 남구만·길재 시조 · 김소월 「진달래꽃」
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  EV_FIRST_AT, EV_RANGE_AT, EV_RANGE_PAD, HINT2_MAX, evFirstNow, hint2Now, evRange, readOf, readsOf, mergeReads, READS_MAX, READ_SEC_MAX,
  korFinishRule, checkCard, checkContent, validCards, lineCount, dayNum,
} from '../js/korean.js';
import { emptyProfile, cloneProfile, mergeStatRecord } from '../js/db.js';
import { initProfile, flushProfile, reloadProfile, korFinish } from '../js/xp.js';
import { readLines, secText, READ_LINES, korReportText } from '../js/korreport.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const DATA = JSON.parse(read('coach/korean/reading.json'));
const UNITS = JSON.parse(read('coach/korean/units.json')).units;
const IDS = DATA.cards.map((c) => c.id);
const card = (id) => DATA.cards.find((c) => c.id === id);
const qOf = (id) => DATA.cards.flatMap((c) => c.qs).find((x) => x.id === id);
const clone = (x) => JSON.parse(JSON.stringify(x));
const T0 = new Date(2026, 9, 14, 12, 0, 0).getTime();
const D0 = dayNum(T0);
const pf = (o = {}) => cloneProfile({ ...emptyProfile(), ...o });
const NEW = ['K54', 'K55', 'K56', 'K57', 'K58', 'K59', 'K60'];
const CIRC = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';

test('🔍 근거 먼저 · 💡 둘째 힌트 (순수): 틀린 보기 두 번부터 · 맞혔거나 근거를 찾았으면 아님 · 근거가 없는 물음은 둘째 힌트 · 근거 둘레 범위', () => {
  assert.deepEqual([EV_FIRST_AT, EV_RANGE_AT, EV_RANGE_PAD, HINT2_MAX], [2, 2, 2, 90]);
  const q = { ev: [8] };
  const st = (o) => ({ wrong: [], answered: false, evDone: false, ...o });
  assert.equal(evFirstNow(q, st({ wrong: [0] })), false, '한 번 틀림 — 아직');
  assert.equal(evFirstNow(q, st({ wrong: [0, 2] })), true, '두 번 틀림 — 근거부터');
  assert.equal(evFirstNow(q, st({ wrong: [0, 2, 3] })), true);
  assert.equal(evFirstNow(q, st({ wrong: [0, 2], evDone: true })), false, '근거를 찾았으면 보기가 다시 열린다');
  assert.equal(evFirstNow(q, st({ wrong: [0, 2], answered: true })), false, '맞혔으면 아님');
  assert.equal(evFirstNow({ ev: null, hint2: 'x' }, st({ wrong: [0, 2] })), false, '근거가 없는 물음은 근거 먼저가 아님');
  assert.equal(evFirstNow({ ev: [] }, st({ wrong: [0, 2] })), false);
  assert.equal(evFirstNow(q, null), false);
  assert.equal(hint2Now({ ev: null, hint2: '볼 곳' }, st({ wrong: [0, 1] })), true);
  assert.equal(hint2Now({ ev: null, hint2: '볼 곳' }, st({ wrong: [0] })), false);
  assert.equal(hint2Now({ ev: null, hint2: '볼 곳' }, st({ wrong: [0, 1], answered: true })), false);
  assert.equal(hint2Now({ ev: null, hint2: ' ' }, st({ wrong: [0, 1] })), false);
  assert.equal(hint2Now(q, st({ wrong: [0, 1] })), false, '근거가 있는 물음엔 둘째 힌트가 없다');
  assert.deepEqual([evRange([8], 16), evRange([1, 2], 3), evRange([16], 16), evRange([3, 12], 14), evRange([1], 1), evRange([3, 5, 9], 14)], [[6, 10], [1, 3], [14, 16], [1, 5], [1, 1], [1, 5]], '근거 가운데 첫 줄 둘레 — 흩어진 근거를 다 감싸면 글 거의 전체가 됐다');
  assert.deepEqual([evRange([], 5), evRange([0, 9], 5), evRange(null, 5), evRange([2.5], 5)], [null, null, null, null], '없거나 글 밖 번호');
});

test('💡 원고 검사가 잡는다 (v258) — 한 곳만 틀리게: 근거 없는데 둘째 힌트 없음 · 근거 있는데 둘째 힌트 · 정답 글 그대로 · 길이 · 글에 없는 번호 · 🎧 번호', () => {
  const noEv = clone(card('K2'));
  const k = noEv.qs.findIndex((q) => q.ev === null || q.ev === undefined);
  assert.ok(k >= 0);
  const one = (base, fix) => { const c = clone(base); fix(c); return checkCard(c); };
  const cases = [
    ['둘째 힌트 없음', noEv, (c) => { delete c.qs[k].hint2; }, /hint2\(틀린 보기를 2번 고른 뒤/],
    ['근거 있는데 둘째 힌트', card('K1'), (c) => { c.qs[0].hint2 = '다시 읽어 봐요.'; }, /근거 잡기가 있는 물음은 hint2 없이/],
    ['정답 글 그대로', noEv, (c) => { c.qs[k].hint2 = `답은 ${c.qs[k].opts.find((o) => o.ok).t}`; }, /정답 보기 글이 그대로/],
    ['띄어쓰기만 바꾼 정답', noEv, (c) => { c.qs[k].hint2 = c.qs[k].opts.find((o) => o.ok).t.replace(/ /g, ''); }, /정답 보기 글이 그대로/],
    ['길이', noEv, (c) => { c.qs[k].hint2 = '가'.repeat(HINT2_MAX + 1); }, /hint2는 90자까지/],
    ['글에 없는 번호', noEv, (c) => { c.qs[k].hint2 = '⑳을 다시 읽어 봐요.'; }, /둘째 힌트: ⑳은 글에 없는 번호/],
    ['🎧 번호', card('K37'), (c) => { c.qs[0].hint2 = '①에서 들은 말을 떠올려 봐요.'; }, /문장 번호/],
  ];
  for (const [name, base, fix, re] of cases) {
    const errs = one(base, fix);
    assert.equal(errs.length, 1, `${name}: ${errs.join(' / ')}`);
    assert.match(errs[0], re, name);
  }
});

test('💡 원고 (v258): 근거가 없는 물음 69개(v261 새 글 넷 · v265 신문 글 하나 · v267 호응 고쳐 쓰기 여덟 · v281 둘 더함)에 모두 둘째 힌트 · 근거가 있는 물음엔 없음 · 정답을 말하지 않음 · 🎧은 번호 없이 · 짧게', () => {
  assert.deepEqual(checkContent(DATA), []);
  const all = DATA.cards.flatMap((c) => c.qs.map((q) => ({ c, q })));
  const noEv = all.filter(({ q }) => q.ev === null || q.ev === undefined);
  assert.equal(noEv.length, 69, '글 51 · 🎧 18 (v261 K61-3·K67-1·K68-2·K69-3 · v265 K73-2 · v267 K79-1~4·K80-1~4 · v281 K87-1·K94-2 더함)');
  assert.equal(noEv.filter(({ c }) => c.listen).length, 18);
  for (const { c, q } of all) {
    if (q.ev === null || q.ev === undefined) {
      assert.ok(typeof q.hint2 === 'string' && q.hint2.trim(), `${q.id} 둘째 힌트`);
      assert.ok([...q.hint2].length <= HINT2_MAX, q.id);
      if (c.listen) assert.ok(![...q.hint2].some((ch) => CIRC.includes(ch)), `${q.id} 🎧 번호 없이`);
      // 정답 보기 글이 그대로 들어 있지 않다(원고 검사와 따로 — 공백·문장부호를 지운 글로)
      const bare = (s) => s.replace(/[\s.,!?'"·…—-]/g, '');
      assert.ok(!bare(q.hint2).includes(bare(q.opts.find((o) => o.ok).t)), `${q.id} 정답 그대로`);
    } else assert.ok(!Object.hasOwn(q, 'hint2'), `${q.id} 근거가 있으면 둘째 힌트 없이`);
  }
  // 둘째 힌트는 볼 곳(줄 번호)·풀이 기준(낱말·규칙)을 짚는다
  assert.match(qOf('K45-2').hint2, /⑥/);
  assert.match(qOf('K50-1').hint2, /'갈'/);
  assert.match(qOf('K52-3').hint2, /①/);
  assert.match(qOf('K44-4').hint2, /한 가지 기준/);
});

test('📚 새 시 일곱 (v258): 윤동주 셋 · 정지용 · 시조 둘 · 김소월 — 원문 대조 · 모두 근거가 있는 물음 셋(근거 먼저가 된다) · 저작권 해 · ⭐ 미리보기 둘 · 단원 지도', () => {
  assert.deepEqual(IDS.slice(53, 60), NEW);
  assert.equal(validCards(DATA).length, 96); // v261 새 글 열둘 · v265 신문 글 여섯 · v267 단원 채우기 여섯 · v281 새 글 열둘 더함
  assert.deepEqual(NEW.map((id) => [card(id).kind, card(id).genre, card(id).author]), [
    ['classic', '동시', '윤동주'], ['classic', '동시', '윤동주'], ['classic', '동시', '윤동주'], ['classic', '동시', '정지용'],
    ['classic', '시조', '남구만'], ['classic', '시조', '길재'], ['classic', '시', '김소월']]);
  assert.deepEqual(NEW.map((id) => card(id).qs.length), [3, 3, 3, 3, 3, 3, 3]);
  for (const id of NEW) for (const q of card(id).qs) assert.ok(Array.isArray(q.ev) && q.ev.length && !q.hint2, `${q.id} 근거 있음`);
  assert.deepEqual(NEW.filter((id) => card(id).pre), ['K59', 'K60']);
  const year = (id) => Number(/(\d{4})년에 세상을 떠나/.exec(card(id).facts.find((f) => f[0] === '저작권')[1])[1]);
  assert.deepEqual(NEW.map(year), [1945, 1945, 1945, 1950, 1711, 1419, 1934]);
  // 원문 대조 — 위키문헌(『하늘과 바람과 별과 시』 1955년 판 143·152~155쪽 · 《향수》 · 『청구영언』 · 『진달래꽃』 현대어)을 오늘 맞춤법으로
  assert.deepEqual(card('K54').stanzas, [['가을 지난 마당은 하이얀 종이', '참새들이 글씨를 공부하지요.'], ['째액째액 입으로 받아 읽으며', '두 발로는 글씨를 연습하지요.'], ['하루 종일 글씨를 공부하여도', '짹 자 한 자밖에는 더 못 쓰는걸.']]);
  assert.deepEqual(card('K58').stanzas, [['동창이 밝았느냐 노고지리 우지진다', '소 칠 아이는 여태 아니 일었느냐', '재 너머 사래 긴 밭을 언제 갈려 하느니']]);
  assert.deepEqual(card('K59').stanzas, [['오백 년 도읍지를 필마로 돌아드니', '산천은 의구하되 인걸은 간 데 없다', '어즈버 태평연월이 꿈이런가 하노라']]);
  assert.deepEqual(card('K60').stanzas.map((s) => s[2]), ['말없이 고이 보내 드리오리다.', '아름 따다 가실 길에 뿌리오리다.', '사뿐히 즈려밟고 가시옵소서.', '죽어도 아니 눈물 흘리오리다.']);
  assert.deepEqual(NEW.map((id) => lineCount(card(id))), [6, 14, 15, 17, 3, 3, 12]);
  // 옛 글자(아래아 등 조합 자모)는 태블릿 글꼴에서 깨진다 — 글·풀이·사실 어디에도 없게
  assert.ok(!/[ᄀ-ᇿꥠ-꥿ힰ-퟿]/.test(JSON.stringify(NEW.map(card))), '옛 글자 없음');
  // 📘 단원 — 동시 둘은 「빗대어 표현해요」, 나머지 셋은 「작품을 감상해요」 · ⭐ 미리보기는 단원 밖(K32~K35와 같게)
  const of = (u) => UNITS.find((x) => x.id === u).cards;
  assert.deepEqual([of('5-1-6').filter((id) => NEW.includes(id)), of('5-2-6').filter((id) => NEW.includes(id))], [['K54', 'K55'], ['K56', 'K57', 'K58']]); // v261 새 글은 그 뒤에
  for (const id of ['K59', 'K60']) assert.ok(!UNITS.some((u) => u.cards.includes(id)), `${id} 단원 밖`);
  // 풀이가 갈리는 줄은 묻지 않았다고 적는다 · 낱말은 사전에서 확인한 뜻
  assert.match(card('K60').facts.find((f) => f[0] === '알아 둘 것')[1], /말 그대로의 뜻만 물었어요/);
  assert.match(card('K56').facts.find((f) => f[0] === '알아 둘 것')[1], /누구 탓으로 돌렸는지만 물었어요/);
  const word = (id, w) => card(id).words.find((x) => x[0] === w)[1];
  assert.match(word('K58', '노고지리'), /종다리/);
  assert.match(word('K59', '어즈버'), /'아'의 옛말/);
  assert.match(word('K60', '즈려밟고'), /지르밟고/);
  assert.match(word('K55', '햇비'), /여우비/);
  // 원문 줄은 바꾼 것과 그대로 둔 것이 어긋나지 않는다 (Codex 69차 #3 — '시약시'를 바꿔 놓고 그대로 두었다고 적었다)
  const src57 = card('K57').facts.find((f) => f[0] === '원문')[1];
  assert.ok(src57.includes('첫시약시 인데 → 첫 시악시인데') && src57.includes('청개고리 고놈 이다 → 청개구리 고놈이다') && !/'시악시'는 시인이 쓴 말 그대로/.test(src57));
});

test('📤 읽은 기록 고쳐 읽기 (순수): 꼴이 틀리면 버림 · 수는 범위 안으로 · 같은 열쇠는 한 줄(차례 상관없이) · 연 시각 차례 · 최근 120줄 · 병합은 합집합', () => {
  const ok = { c: 'K42', t: 1000, d: D0, s: 250, a: 80, n: 4, f: 2, x: 1, e: 1, h: 0, g: 1, m: '' };
  assert.deepEqual(readOf(ok), ok);
  for (const bad of [null, [], { ...ok, c: 'X1' }, { ...ok, c: 'K1234' }, { ...ok, t: 0 }, { ...ok, t: 'x' }, { ...ok, d: 1 }, { ...ok, n: 0 }, { ...ok, n: 6 }]) assert.equal(readOf(bad), null, JSON.stringify(bad));
  assert.deepEqual(readOf({ ...ok, s: READ_SEC_MAX + 99, a: -5, f: 9, x: -1, e: 'x', h: 2.7, g: 7, m: 'video' }), { ...ok, s: READ_SEC_MAX, a: 0, f: 4, x: 0, e: 0, h: 2, g: 3, m: '' });
  assert.equal(readOf({ ...ok, s: 30, a: 90 }).a, 30, '첫 답까지는 읽은 시간을 넘지 않는다');
  const other = { ...ok, s: 999 }; // 같은 열쇠의 다른 값 — 차례와 상관없이 같은 줄이 남는다
  assert.deepEqual(readsOf([ok, other]), readsOf([other, ok]));
  assert.equal(readsOf([ok, other]).length, 1);
  assert.deepEqual(readsOf([{ ...ok, t: 30 }, { ...ok, t: 10 }, { ...ok, c: 'K1', t: 20 }, 'bad']).map((x) => x.t), [10, 20, 30]);
  const many = Array.from({ length: READS_MAX + 5 }, (_, i) => ({ ...ok, t: i + 1 }));
  const kept = readsOf(many);
  assert.equal(kept.length, READS_MAX);
  assert.equal(kept[0].t, 6, '오래된 것부터 버린다');
  const A = [{ ...ok, t: 1 }, { ...ok, t: 3 }];
  const B = [{ ...ok, t: 2 }, { ...ok, t: 3 }];
  assert.deepEqual(mergeReads(A, B), mergeReads(B, A));
  assert.deepEqual(mergeReads(A, B).map((x) => x.t), [1, 2, 3]);
  assert.deepEqual(mergeReads('bad', B).map((x) => x.t), [2, 3], '깨진 쪽은 버린다');
  // 프로필 — 빈 값 · 복사는 새 배열 · 백업 병합은 합집합
  assert.deepEqual(emptyProfile().korReads, []);
  const p = pf({ korReads: A });
  const c = cloneProfile(p);
  c.korReads.push({ ...ok, t: 9 });
  assert.equal(p.korReads.length, 2, '복사는 새 배열');
  const x = { ...pf({ korReads: A }), updatedAt: 5 };
  const y = { ...pf({ korReads: B }), updatedAt: 9 };
  for (const [u, v] of [[x, y], [y, x]]) assert.deepEqual(mergeStatRecord('profile', u, v).korReads.map((r) => r.t), [1, 2, 3]);
});

test('📤 다 읽을 때 한 줄 (korFinishRule opts.read): 카드·날·별은 규칙이 채움 · 별 없이 다시 읽어도 적음 · 같은 열쇠는 한 번(다시 저장하기) · 깨진 기록·모르는 카드는 안 적음', () => {
  const p = pf();
  const rd = { t: T0 - 300000, s: 240, a: 60, n: 4, f: 3, x: 0, e: 1, h: 0, m: '' };
  korFinishRule(p, 'K42', T0, {}, IDS, 0, { read: rd });
  assert.deepEqual(p.korReads, [{ c: 'K42', t: T0 - 300000, d: D0, s: 240, a: 60, n: 4, f: 3, x: 0, e: 1, h: 0, g: 1, m: '' }]);
  korFinishRule(p, 'K42', T0 + 1000, {}, IDS, 0, { read: rd });
  assert.equal(p.korReads.length, 1, '같은 열쇠는 한 줄 — [다시 저장하기]');
  korFinishRule(p, 'K42', T0 + 3600000, { make: 1 }, IDS, 0, { read: { ...rd, t: T0 + 3000000, f: 2, x: 1 } });
  assert.deepEqual(p.korReads.map((r) => [r.g, r.x]), [[1, 0], [0, 1]], '같은 날 다시 읽음 — 별 없이(g 0)도 적는다');
  korFinishRule(p, 'K42', T0, {}, IDS, 0, { read: { ...rd, t: T0 + 5, n: 9 } });
  korFinishRule(p, 'K42', T0, {}, IDS, 0, { read: 'x' });
  korFinishRule(p, 'K99', T0, {}, IDS, 0, { read: { ...rd, t: T0 + 7 } });
  korFinishRule(p, 'K43', T0, {}, IDS, 0);
  assert.equal(p.korReads.length, 2, '깨진 기록 · 모르는 카드 · read 없음은 안 적음');
  // 읽은 기록이 깨져 있어도 별·💰는 그대로
  const q = pf({ korReads: 'bad' });
  const r = korFinishRule(q, 'K44', T0, {}, IDS, 0, { read: rd });
  assert.equal(r.star, 1);
  assert.deepEqual(q.korReads.map((x) => x.c), ['K44']);
});

const stored = () => fakeIdb.get('profile', 'me');
async function seed(o) {
  await flushProfile();
  const cur = stored() || emptyProfile();
  fakeIdb.put('profile', { ...cur, ...o, id: 'me', updatedAt: (cur.updatedAt || 0) + 1 });
  await reloadProfile();
}

test('★ 📤 저장 경로 (v258): 읽은 기록은 별과 같은 트랜잭션 — 두 창이 같은 글을 같이 끝내도 두 줄(연 시각이 다르다) · 저장이 안 되면 없던 일', async () => {
  await initProfile();
  await seed({ korDone: {}, korReads: [] });
  const rd = (t) => ({ t, s: 100, a: 20, n: 4, f: 4, x: 0, e: 0, h: 0, m: '' });
  await Promise.all([korFinish('K45', {}, IDS, 0, { read: rd(111) }), korFinish('K45', {}, IDS, 0, { read: rd(222) })]);
  assert.deepEqual(stored().korReads.map((x) => [x.t, x.g]).sort((a, b) => a[0] - b[0]), [[111, 1], [222, 0]], '별은 하나 · 기록은 둘');
  const s0 = JSON.stringify(stored());
  fakeIdb.failNext('profile');
  assert.equal((await korFinish('K46', {}, IDS, 0, { read: rd(333) })).ok, false);
  assert.equal(JSON.stringify(stored()), s0, '저장이 안 되면 없던 일');
});

test('📤 창의 프로필도 고쳐 읽는다 (xp.fromStored): 저장된 읽은 기록의 깨진 줄은 빼고 새 배열로', async () => {
  const { getProfileSnapshot } = await import('../js/xp.js');
  await initProfile();
  const good = { c: 'K42', t: 77, d: D0, s: 10, a: 1, n: 4, f: 4, x: 0, e: 0, h: 0, g: 1, m: '' };
  const raw = [good, 'bad', { ...good, c: 'X1', t: 78 }];
  await seed({ korReads: raw });
  const snap = getProfileSnapshot().korReads;
  assert.deepEqual(snap, [good]);
  assert.notEqual(snap, raw);
});

test('📤 읽은 기록 한 줄 만들기 (koreanview.readLog, 순수): 첫 번에 맞힘 · 끝까지 고름(틀린 보기를 다) · 근거 먼저 · 둘째 힌트 · 🎧 들음/글로 읽음', async () => {
  const { readLog } = await import('../js/koreanview.js');
  const c = card('K42');
  const st = (o) => ({ wrong: [], answered: true, evDone: true, evWrong: [], evFirst: false, hint2: false, ...o });
  const r = { card: c, t0: 5000, sec: 300, firstSec: 75, ls: null, qs: [st({}), st({ wrong: [0, 2, 3], evFirst: true }), st({ wrong: [1] }), st({ wrong: [0, 1], hint2: true })] };
  assert.deepEqual(readLog(r), { t: 5000, s: 300, a: 75, n: 4, f: 1, x: 1, e: 1, h: 1, m: '' });
  assert.equal(readLog({ ...r, firstSec: -1 }).a, 0);
  assert.equal(readLog({ ...r, ls: { text: false } }).m, 'listen');
  assert.equal(readLog({ ...r, ls: { text: true } }).m, 'text');
});

test('📤 국어 요약 "최근 7일 읽은 글" (korreport.readLines, v258): 오늘을 넣은 7일만 · 모은 줄(평균·첫 번에·끝까지·근거 먼저·둘째 힌트) · 글마다 한 줄 · 🎧 · 줄 수 상한 · 기록이 없으면 그렇게', () => {
  assert.deepEqual([secText(0), secText(40), secText(60), secText(250), secText(-3)], ['0초', '40초', '1분', '4분 10초', '0초']);
  const cards = validCards(DATA);
  const base = { c: 'K42', t: 20, d: D0, s: 250, a: 80, n: 4, f: 2, x: 1, e: 1, h: 0, g: 1, m: '' };
  const reads = [
    base,
    { ...base, c: 'K43', t: 30, s: 50, a: 10, f: 4, x: 0, e: 0, h: 0, g: 0 },
    { ...base, c: 'K36', t: 10, d: D0 - 6, s: 120, a: 100, n: 3, f: 1, x: 0, e: 0, h: 2, g: 2, m: 'listen' },
    { ...base, c: 'K37', t: 5, d: D0 - 7, m: 'text' }, // 8일 전 — 빠진다
    { ...base, c: 'K38', t: 40, d: D0 + 1 }, // 앞날(시계를 앞으로 돌린 기기) — 빠진다
  ];
  const L = readLines(reads, cards, '2026-10-14');
  assert.match(L[1], /^## 최근 7일 읽은 글 \(v258부터 셈/);
  // 맞힌 수·물음 수·비율은 넣은 기록에서 센다 (공개 파일에 점수 꼴을 박지 않는다 — check.mjs)
  const fs = 2 + 4 + 1;
  const ns = 4 + 4 + 3;
  assert.equal(L[2], `- 모두 3번 읽음 · 한 번 평균 2분 20초 · 첫 번에 맞힌 물음 ${fs}/${ns} (${Math.round((fs / ns) * 100)}%) · 오답 보기를 모두 고른 물음 1 · 🔍 근거 먼저 1 · 💡 둘째 힌트 2`);
  assert.deepEqual(L.slice(3), [
    '- 10-08 K36 「내일 줄넘기 연습」 🎧 들음 ★★ 새로 · 2분 (첫 답까지 1분 40초) · 첫 번에 1/3 · 💡 둘째 힌트 2',
    '- 10-14 K42 「도자기 마을 체험 학습」 ★ 새로 · 4분 10초 (첫 답까지 1분 20초) · 첫 번에 2/4 · 오답 보기를 모두 고른 물음 1 · 🔍 근거 먼저 1',
    '- 10-14 K43 「개구리는 겨울에 어디에 있을까」 별 없이 다시 · 50초 (첫 답까지 10초) · 첫 번에 4/4',
  ], '연 차례 · 8일 전 · 앞날 줄은 없음');
  assert.deepEqual(readLines([], cards, '2026-10-14').slice(1), ['## 최근 7일 읽은 글 (v258부터 셈 — 끝까지 읽을 때마다 한 줄 · 기기에 저장된 최근 120줄 안에서 · 시간은 화면이 보이고 2분 안에 손을 댄 동안만 셈 — 오래 조용히 읽은 시간은 일부 빠질 수 있음 · 첫 답까지 = 글을 연 뒤 처음 보기를 고를 때까지 · 문제 보기까지 = 글을 연 뒤 📖 [문제 보기]를 누를 때까지(v260부터, 🎧 빼고) · 🔍 근거 먼저 = 틀린 보기를 두 번 고른 뒤 근거 줄부터 찾은 물음 · 📍 근거부터 = 별을 받을 수 있는 읽기(v273은 ★ 전의 글만 · v274부터 ★·★★·★★★ 받는 날, 🎧 빼고)에서 근거가 있는 첫 물음 하나는 보기를 고르기 전에 근거 줄부터 — 그 물음이 나온 뒤 찾기까지 · 잘못 누른 줄 · 찾은 뒤 첫 번에 맞혔나(그 물음도 "첫 번에 맞힌 물음"·"첫 답까지"에 든다))', '(아직 기록 없음)']);
  const lots = Array.from({ length: READ_LINES + 3 }, (_, i) => ({ ...base, t: i + 10, s: i + 1 }));
  const M = readLines(lots, cards, '2026-10-14');
  assert.equal(M[3], '- (앞의 3줄은 줄였어요)');
  assert.equal(M.length, 4 + READ_LINES);
  assert.ok(M[4].includes(' · 4초 (') && M[M.length - 1].includes(` · ${secText(READ_LINES + 3)} (`), '줄이 넘치면 최근 것을 남긴다');
  assert.ok(readLines([{ ...base, c: 'K999' }], [], '2026-10-14')[3].includes('K999 「?」'), '모르는 카드는 ?');
  // 요약 글 안 자리 — 국어 시간 바로 다음
  const t = korReportText({ korReads: reads }, { cards, words: [], puzzles: [] }, '2026-10-14', []);
  assert.ok(t.indexOf('## 최근 7일 국어 시간') < t.indexOf('## 최근 7일 읽은 글') && t.indexOf('## 최근 7일 읽은 글') < t.indexOf('## 글 — '));
  assert.ok(!t.includes(String.fromCharCode(0xC9C4, 0xC6B0)), '아이 이름 없이');
});

test('🔍 화면 연결 (v258): 두 번 틀리면 보기 잠금 · 근거 먼저 상자 · 찾으면 칠하고 다시 엶 · 둘째 힌트 · 범위 알림 · ⏱️ 읽는 시계(⏳ 쉼 규칙 · 🎧 소리 나는 동안 셈) · 다 읽으면 읽은 기록 · css · sw', () => {
  const src = read('js/koreanview.js');
  const body = (head) => { const i = src.indexOf(head); assert.ok(i >= 0, head); return src.slice(i, src.indexOf('\n}\n', i)); };
  const rq = body('function renderQ() {');
  assert.ok(rq.includes('const evFirst = evFirstNow(q, st);') && rq.includes('b.disabled = st.answered || isWrong || evFirst;'), '근거 먼저 동안 보기 잠금');
  assert.ok(rq.includes('if (q.ev && (st.answered || evFirst)) {'), '근거 상자는 맞힌 뒤 · 근거 먼저일 때');
  assert.ok(rq.includes('if (hint2Now(q, st)) {') && rq.includes("el('p', 'kor-fb kor-hint2', `💡 ${q.hint2}`)"), '둘째 힌트');
  assert.ok(rq.includes('if (q.ev && st.evDone) for (const n of q.ev)'), '근거를 찾으면 글에 칠한다(남은 보기를 고르는 동안)');
  assert.ok(rq.includes("(st.answered || evFirst) ? 'ev' : 'opt'"), '근거 먼저면 초점은 근거 줄로');
  const pick = body('function pick(k) {');
  assert.ok(pick.includes('if (st.answered || st.wrong.includes(k) || evFirstNow(q, st)) return;'), '잠긴 보기는 눌리지 않는다');
  assert.ok(pick.includes('if (r.firstSec < 0) r.firstSec = r.sec;') && pick.includes('if (hint2Now(q, st)) st.hint2 = true;'));
  assert.ok(pick.includes('if (evFirstNow(q, st)) bringEvFirst();'), '근거 먼저로 바뀌면 화면 밖 상자를 데려온다 (Codex 69차 #2)');
  const be = body('function bringEvFirst() {');
  assert.ok(be.includes("if (top < under + 4 || top > window.innerHeight - 96) say.scrollIntoView({ block: 'start' });"), '보일 때는 그대로');
  const ev = body('function evPick(n) {');
  assert.ok(ev.includes('if (!(st.answered || evFirstNow(q, st)) || !q.ev || st.evDone || st.evWrong.includes(n)) return;') && ev.includes('if (!st.answered) { st.evFirst = true; reopen = true; }'));
  assert.ok(!ev.includes('misses'), '근거 실수는 잘못 읽기로 안 센다(🟩에만)');
  assert.ok(ev.includes('if (reopen) bringQ();'), '찾으면 다시 열린 보기를 데려온다(세로 화면)');
  const evb = body('function evidenceEl(q, st, unit) {');
  assert.ok(evb.includes('if (first) { if (msg.textContent) box.insertBefore(msg, rows); }'), '근거 먼저 말은 제목 바로 아래 · 할 말이 없으면 빈 줄 없이');
  assert.ok(evb.includes("box.classList.add('is-first')") && evb.includes('first && st.evWrong.length >= EV_RANGE_AT && evRange(q.ev, lineCount(card))'), '두 번 잘못 누르면 범위');
  assert.ok(body('async function finishCard() {').includes('qMiss, read: readLog(r) });'));
  const tick = body('function tickRead() {');
  assert.ok(tick.includes('if (!r || r.result || r.saving || r.qi >= r.card.qs.length) return;') && tick.includes('document.hidden') && tick.includes('if (!koreanVisible()) return;') && tick.includes('if (!(r.ls && r.ls.playing) && Date.now() - lastAct > IDLE_SEC * 1000) return;'), '⏳ 시계와 같은 쉼 규칙 · 🎧 소리 나는 동안은 센다');
  const init = body('export function initKorean({ showView }) {');
  assert.ok(init.includes("for (const ev of ['pointerdown', 'keydown', 'touchstart', 'wheel'])") && init.includes('if (readTimer === null) readTimer = setInterval(tickRead, 1000);'));
  assert.ok(body('function openCard(id) {').includes('t0: Date.now(),') && body('function openCard(id) {').includes('lastAct = Date.now();'));
  assert.ok(src.includes("찾았어요! 칠한 ${unit}("), '번호 뒤 조사는 읽는 소리마다 달라 낱말 뒤에');
  const css = read('css/style.css');
  assert.ok(css.includes('.kor-ev.is-first {') && css.includes('.kor-fb.kor-hint2 {') && css.includes('.kor-q > .kor-fb { scroll-margin-top: var(--kor-top, 72px); }') && css.includes('.kor-opts.is-locked .kor-opt:not(.is-no) { opacity: 0.55; }'));
  assert.ok(rq.includes("const opts = el('div', `kor-opts${evFirst ? ' is-locked' : ''}`);"), '잠긴 보기는 흐리게');
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(read('sw.js')) || [])[1]) >= 258, 'sw는 v258 이상'); // 다음 판에서 다시 고치지 않게
});
