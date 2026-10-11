// 📚 국어 — 읽기 줄기 + 작품 도감 (2026-10-11): 원고 형식 · 별 규칙 · 💰 한 번만 · 병합 · 저장 경로 · 화면 연결
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TYPES, KINDS, KOR_COINS, STAR3_DAYS, MISS_MAX, circled, lineCount, lineText, unitOf, dayNum, starsOf, nextStar, missOf, mergeMiss, mergeDone, korFinishRule, checkContent, checkCard, validCards } from '../js/korean.js';
import { emptyProfile, cloneProfile, mergeStatRecord } from '../js/db.js';
import { initProfile, flushProfile, reloadProfile, korFinish, korDoneMap, getProfileSnapshot } from '../js/xp.js';

const DATA = JSON.parse(readFileSync(new URL('../coach/korean/reading.json', import.meta.url), 'utf8'));
const IDS = DATA.cards.map((c) => c.id);
const DAY = 86_400_000;
// 이 기기 날짜로 2026-10-11 낮 12시 (자정 근처를 피해 "다른 날"이 분명하게)
const T0 = new Date(2026, 9, 11, 12, 0, 0).getTime();
const at = (days, h = 12) => new Date(2026, 9, 11 + days, h, 0, 0).getTime();
const pf = (o = {}) => cloneProfile({ ...emptyProfile(), ...o });
const clone = (x) => JSON.parse(JSON.stringify(x));

test('📚 원고: 형식 검사 통과 · 여섯 편(연습 넷·명작 둘) · 물음마다 보기 넷·정답 하나·틀린 보기마다 잘못 읽기와 까닭 · 근거 번호는 글 안 · 쓸 수 있는 카드 = 전부', () => {
  assert.deepEqual(checkContent(DATA), []);
  assert.deepEqual(IDS, ['K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7', 'K8', 'K9', 'K10', 'K11', 'K12']);
  assert.deepEqual(DATA.cards.map((c) => c.kind), ['practice', 'practice', 'classic', 'practice', 'practice', 'classic', 'classic', 'classic', 'classic', 'practice', 'practice', 'practice']);
  assert.equal(validCards(DATA).length, 12);
  let qn = 0;
  const used = new Set();
  for (const c of DATA.cards) {
    for (const q of c.qs) {
      qn++;
      assert.equal(q.opts.length, 4, q.id);
      assert.equal(q.opts.filter((o) => o.ok === true).length, 1, q.id);
      for (const o of q.opts) if (!o.ok) { assert.ok(TYPES[o.type], `${q.id} ${o.t}`); used.add(o.type); }
      if (q.ev) for (const n of q.ev) assert.ok(n >= 1 && n <= lineCount(c), `${q.id} ev ${n}`);
    }
  }
  assert.equal(qn, 34);
  assert.deepEqual([...used].sort(), Object.keys(TYPES).sort(), '잘못 읽기 일곱 가지가 모두 한 번 이상 쓰인다');
  // 명작은 지은이·저작권 줄 — 저작권이 끝난 작품만(지은이가 1963년 전에 세상을 떠남)
  for (const c of DATA.cards.filter((x) => x.kind === 'classic')) {
    const law = c.facts.find((f) => f[0] === '저작권')[1];
    const year = Number((/(\d{4})년에 세상을 떠나/.exec(law) || [])[1]);
    assert.ok(year > 0 && year < 1963, `${c.id} ${c.author} ${year}`);
  }
  // 「반딧불」·「엄마야 누나야」 본문 — 위키문헌 1955년 판·『진달래꽃』을 오늘 맞춤법으로 옮긴 그대로
  assert.deepEqual(DATA.cards[2].stanzas, [['가자 가자 가자', '숲으로 가자', '달 조각을 주우려', '숲으로 가자.'], ['그믐밤 반딧불은', '부서진 달 조각,'], ['가자 가자 가자', '숲으로 가자', '달 조각을 주우려', '숲으로 가자.']]);
  assert.deepEqual(DATA.cards[5].stanzas, [['엄마야 누나야 강변 살자,', '뜰에는 반짝이는 금모래 빛,', '뒷문 밖에는 갈잎의 노래', '엄마야 누나야 강변 살자.']]);
  assert.deepEqual([lineCount(DATA.cards[2]), lineText(DATA.cards[2], 6), unitOf(DATA.cards[2]), unitOf(DATA.cards[0])], [10, '부서진 달 조각,', '줄', '문장']);
  assert.deepEqual([circled(1), circled(9), circled(20), circled(21)], ['①', '⑨', '⑳', '21']);
});

test('📚 원고 검사가 잡는다 — 한 곳만 틀리게 바꾼 원고마다 그 오류 하나(정답 둘·정답 없음·모르는 잘못 읽기·까닭 빔·보기 셋·같은 보기·근거 번호 밖·근거 차례·글에 없는 ①번호·id·종류·명작 저작권 줄·글 둘 다·풀이 없음)', () => {
  const base = DATA.cards[0];
  const one = (fix) => { const c = clone(base); fix(c); return checkCard(c); };
  const cases = [
    ['정답 둘', (c) => { c.qs[0].opts[0] = { t: c.qs[0].opts[0].t, ok: true }; }, /정답은 하나/],
    ['정답 없음', (c) => { c.qs[0].opts[1] = { t: c.qs[0].opts[1].t, type: 'make', why: 'x' }; }, /정답은 하나\(지금 0\)/],
    ['모르는 잘못 읽기', (c) => { c.qs[0].opts[0].type = 'guess'; }, /type\(잘못 읽기\)/],
    ['까닭 빔', (c) => { c.qs[0].opts[0].why = ' '; }, /why/],
    ['보기 셋', (c) => { c.qs[0].opts.pop(); }, /보기는 넷/],
    ['같은 보기', (c) => { c.qs[0].opts[2].t = c.qs[0].opts[0].t; }, /다른 보기와 같아요/],
    ['근거 번호 밖', (c) => { c.qs[0].ev = [2, 10]; }, /ev는 1~9/],
    ['근거 차례', (c) => { c.qs[0].ev = [4, 2]; }, /작은 번호부터/],
    ['근거 겹침', (c) => { c.qs[0].ev = [4, 4]; }, /작은 번호부터/],
    ['글에 없는 번호', (c) => { c.qs[1].opts[0].why = '⑩에 있어요'; }, /⑩은 글에 없는 번호/],
    ['물음 id', (c) => { c.qs[1].id = 'K1-5'; }, /id는 K1-2/],
    ['카드 id', (c) => { c.id = 'X1'; }, /id는 K숫자/],
    ['종류', (c) => { c.kind = 'textbook'; }, /kind/],
    ['글 둘 다', (c) => { c.stanzas = [['가']]; }, /lines 또는 stanzas 하나만/],
    ['근거 풀이 없음', (c) => { delete c.qs[0].evNote; }, /evNote/],
    ['근거 없는데 풀이 없음', (c) => { c.qs[0].ev = null; delete c.qs[0].evQ; delete c.qs[0].evNote; }, /doneNote/],
    ['정답에 까닭', (c) => { c.qs[0].opts[1].why = 'x'; }, /정답 보기에 type·why는 없어요/],
    ['meta 없음', (c) => { c.meta = []; }, /meta/],
  ];
  for (const [name, fix, re] of cases) {
    const errs = one(fix);
    assert.equal(errs.length, 1, `${name}: ${errs.join(' / ')}`);
    assert.match(errs[0], re, name);
  }
  const classic = clone(DATA.cards[2]);
  classic.facts = classic.facts.filter((f) => f[0] !== '저작권');
  assert.match(checkCard(classic).join(), /저작권 줄/);
  const noAuthor = clone(DATA.cards[2]);
  delete noAuthor.author;
  assert.match(checkCard(noAuthor).join(), /지은이/);
  assert.match(checkContent({ cards: [base, clone(base)] }).join(), /id가 겹쳐요/);
  assert.deepEqual(checkContent({}), ['cards가 없어요']);
  assert.deepEqual(validCards({ cards: [base, { ...clone(base), id: 'K9', kind: 'x' }] }).map((c) => c.id), ['K1'], '깨진 카드는 빼고 그린다');
});

test('📚 별 규칙: 처음 ★ · 같은 날 다시는 별 없음(내일) · 다른 날 ★★ · 처음 날부터 7일 지나 ★★★(★★와 다른 날) · 다 모으면 full · ★부터 차례로만 센다', () => {
  assert.equal(dayNum(at(1)) - dayNum(T0), 1);
  assert.equal(dayNum(at(0, 23)) , dayNum(at(0, 0)), '같은 날은 같은 번호(이 기기 날짜)');
  assert.equal(dayNum(at(1, 0)) - dayNum(at(0, 23)), 1, '자정을 넘기면 다음 날');
  assert.equal(dayNum('x'), 0);
  const d = {};
  assert.deepEqual(nextStar(d, 'K1', T0), { star: 1 });
  d['K1:1'] = dayNum(T0);
  assert.deepEqual(nextStar(d, 'K1', at(0, 20)), { star: 0, why: 'wait', next: 2, days: 1 });
  assert.deepEqual(nextStar(d, 'K1', at(1)), { star: 2 });
  d['K1:2'] = dayNum(at(1));
  assert.deepEqual(nextStar(d, 'K1', at(1, 20)), { star: 0, why: 'wait', next: 3, days: STAR3_DAYS - 1 });
  assert.deepEqual(nextStar(d, 'K1', at(6)), { star: 0, why: 'wait', next: 3, days: 1 });
  assert.deepEqual(nextStar(d, 'K1', at(7)), { star: 3 });
  // ★★를 7일 뒤에 받았으면 ★★★는 그다음 날부터
  const late = { 'K2:1': dayNum(T0), 'K2:2': dayNum(at(9)) };
  assert.deepEqual(nextStar(late, 'K2', at(9, 18)), { star: 0, why: 'wait', next: 3, days: 1 });
  assert.deepEqual(nextStar(late, 'K2', at(10)), { star: 3 });
  d['K1:3'] = dayNum(at(7));
  assert.deepEqual(nextStar(d, 'K1', at(30)), { star: 0, why: 'full' });
  assert.deepEqual([starsOf(d, 'K1'), starsOf(d, 'K2'), starsOf({ 'K3:2': 5 }, 'K3'), starsOf(null, 'K1')], [3, 0, 0, 0], '★ 없이 ★★만 있는 깨진 기록은 0');
  assert.deepEqual(KOR_COINS, { 1: 12, 2: 8, 3: 20 }, '수학 개념 편과 같은 크기');
  assert.equal(STAR3_DAYS, 7);
});

test('📚 korFinishRule: 별마다 💰 한 번(번 코인에도) · 모르는 카드는 unknown · 잘못 읽기 횟수는 아는 종류만·한 번에 MISS_MAX까지 · 별이 없어도 횟수는 더함', () => {
  const p = pf({ coins: 5, coinsEarned: 40 });
  assert.deepEqual(korFinishRule(p, 'K99', T0, {}, IDS), { ok: false, why: 'unknown' });
  assert.deepEqual(korFinishRule(p, 'K1', T0, {}, null), { ok: false, why: 'unknown' });
  assert.equal(p.coins, 5);
  const r1 = korFinishRule(p, 'K1', T0, { make: 1, flip: 2, guess: 9, time: -3, link: 1e20 }, IDS);
  assert.deepEqual(r1, { ok: true, star: 1, coins: 12, stone: 0, throws: 1, stars: 1 });
  assert.deepEqual([p.coins, p.coinsEarned, p.korDone], [17, 52, { 'K1:1': dayNum(T0) }]);
  assert.deepEqual(p.korMiss, { make: 1, flip: 2 }, '모르는 종류·음수·아주 큰 수는 버린다');
  const again = korFinishRule(p, 'K1', at(0, 18), { make: 99 }, IDS);
  assert.deepEqual(again, { ok: true, star: 0, coins: 0, stars: 1, wait: 'wait', next: 2, days: 1 });
  assert.deepEqual([p.coins, p.korMiss.make], [17, 1 + MISS_MAX], '같은 날은 💰 없음 · 횟수는 MISS_MAX까지');
  assert.deepEqual(korFinishRule(p, 'K1', at(1), {}, IDS), { ok: true, star: 2, coins: 8, stone: 1, throws: 2, stars: 2 });
  assert.deepEqual(korFinishRule(p, 'K1', at(3), {}, IDS), { ok: true, star: 0, coins: 0, stars: 2, wait: 'wait', next: 3, days: 4 });
  assert.deepEqual(korFinishRule(p, 'K1', at(7), {}, IDS), { ok: true, star: 3, coins: 20, stone: 1, throws: 3, stars: 3 });
  assert.deepEqual(korFinishRule(p, 'K1', at(40), {}, IDS), { ok: true, star: 0, coins: 0, stars: 3, wait: 'full' });
  assert.equal(p.coins, 5 + 12 + 8 + 20);
  assert.equal(p.coinsEarned, 40 + 12 + 8 + 20);
  // 깨진 기록에서도 멈추지 않는다
  const q = pf({ korDone: 'bad', korMiss: [1, 2], coins: 'x' });
  assert.deepEqual(korFinishRule(q, 'K2', T0, { detail: 1 }, IDS), { ok: true, star: 1, coins: 12, stone: 0, throws: 1, stars: 1 });
  assert.deepEqual([q.coins, q.korMiss], [12, { detail: 1 }]);
  assert.deepEqual([missOf({ make: '3', fo: 2.7, x: 1 }), missOf('x')], [{ make: 3, fo: 2 }, {}]);
});

test('📚 병합: 받은 별은 합집합(이른 날 — 옛 백업이 별을 되돌려 💰 두 번 못 받게) · 잘못 읽기는 종류마다 큰 쪽 · 깨진 쪽은 버림 · 복사는 새 객체', () => {
  const a = { ...emptyProfile(), korDone: { 'K1:1': 20000, 'K1:2': 20003 }, korMiss: { make: 4, flip: 1 }, coins: 100, updatedAt: 20 };
  const b = { ...emptyProfile(), korDone: { 'K1:1': 19999, 'K2:1': 20001 }, korMiss: { make: 2, flip: 6, x: 9 }, coins: 50, updatedAt: 10 };
  for (const [x, y] of [[a, b], [b, a]]) {
    const m = mergeStatRecord('profile', x, y);
    assert.deepEqual(m.korDone, { 'K1:1': 19999, 'K1:2': 20003, 'K2:1': 20001 });
    assert.deepEqual(m.korMiss, { make: 4, flip: 6 });
  }
  for (const bad of ['bad', 7, [1]]) {
    const m = mergeStatRecord('profile', { ...a, korDone: bad, korMiss: bad }, b);
    assert.deepEqual([m.korDone, m.korMiss], [b.korDone, { make: 2, flip: 6 }], JSON.stringify(bad));
  }
  assert.deepEqual(mergeMiss(null, { fo: 3 }), { fo: 3 });
  // 옛 백업이 더 늦게 저장된 척해도 받은 별은 남는다 → 같은 별을 다시 못 받는다
  const now = pf({ coins: 0 });
  korFinishRule(now, 'K1', T0, {}, IDS);
  now.updatedAt = 30;
  const back = mergeStatRecord('profile', now, { ...emptyProfile(), updatedAt: 40 });
  assert.deepEqual(back.korDone, now.korDone);
  assert.equal(korFinishRule(back, 'K1', at(0, 15), {}, IDS).star, 0);
  const c = cloneProfile(a);
  c.korDone['K9:1'] = 1;
  c.korMiss.make = 99;
  assert.deepEqual([a.korDone['K9:1'], a.korMiss.make], [undefined, 4], '복사');
  assert.deepEqual([emptyProfile().korDone, emptyProfile().korMiss], [{}, {}]);
});

test('📚 다음 글 6편 (2026-10-11 아버님 "너가 추천하는 대로"): 「알에서 태어나다」(삼국유사, 다시 씀) · 권태응 「감자꽃」 · 윤동주 「새로운 길」 원문 · 기행문 · 비교·대조 · 광고 — 갈래·연습하는 것이 고루', () => {
  const card = (id) => DATA.cards.find((c) => c.id === id);
  // 원문 대조: 「새로운 길」 1955년 판(위키문헌, 나의길 → 나의 길 · 문들레 → 민들레) · 「감자꽃」 1948년 동요집(띄어쓰기만)
  assert.deepEqual(card('K9').stanzas, [['내를 건너서 숲으로', '고개를 넘어서 마을로'], ['어제도 가고 오늘도 갈', '나의 길 새로운 길'], ['민들레가 피고 까치가 날고', '아가씨가 지나고 바람이 일고'], ['나의 길은 언제나 새로운 길', '오늘도…… 내일도……'], ['내를 건너서 숲으로', '고개를 넘어서 마을로']]);
  assert.deepEqual(card('K8').stanzas, [['자주 꽃 핀 건 자주 감자.', '파 보나 마나 자주 감자.'], ['하얀 꽃 핀 건 하얀 감자.', '파 보나 마나 하얀 감자.']]);
  assert.deepEqual(['K7', 'K8', 'K9'].map((id) => card(id).author), ['일연 · 신코치가 다시 씀', '권태응', '윤동주']);
  assert.match(card('K7').facts.find((f) => f[0] === '원문')[1], /신코치가 쉬운 말로 다시 썼어요/, '옛이야기는 번역문을 옮기지 않고 다시 쓴다(번역자 저작권)');
  assert.deepEqual(['K10', 'K11', 'K12'].map((id) => card(id).genre), ['기행문', '설명하는 글', '광고']);
  // K8-1: 소리가 같은 낱말 — 낱말 풀이가 답을 미리 알려 주지 않는다
  assert.ok(!card('K8').words.some((w) => w[0] === '자주'), '물음이 묻는 낱말은 풀이에 넣지 않는다');
  // 갈래 고루: 이야기·설명·주장·광고·기행문·시·옛이야기
  const genres = new Set(DATA.cards.map((c) => c.genre));
  for (const g of ['이야기', '설명하는 글', '주장하는 글', '광고', '기행문', '동시', '시']) assert.ok(genres.has(g), g);
});

// ───────────────────── 진짜 저장 경로 (fakeidb) ─────────────────────

const stored = () => fakeIdb.get('profile', 'me');
async function seed(p) {
  await flushProfile();
  const cur = stored() || emptyProfile();
  fakeIdb.put('profile', { ...cur, ...p, id: 'me', updatedAt: (cur.updatedAt || 0) + 1 });
  await reloadProfile();
}

test('★ 📚 저장 경로: 다 읽으면 별·💰가 저장된 프로필에 · 두 창이 같은 글을 동시에 끝내도 별 하나·💰 한 번 · 저장이 안 되면 없던 일(다시 저장하면 그때) · 창의 프로필도 별을 안다', async () => {
  await initProfile();
  await seed({ coins: 10, coinsEarned: 10, korDone: {}, korMiss: {} });
  const two = await Promise.all([korFinish('K3', { literal: 1 }, IDS), korFinish('K3', { make: 1 }, IDS)]);
  assert.deepEqual(two.map((r) => r.star).sort(), [0, 1]);
  assert.equal(stored().coins, 10 + KOR_COINS[1], '💰 한 번');
  assert.deepEqual(Object.keys(stored().korDone), ['K3:1']);
  assert.equal(stored().korDone['K3:1'], dayNum(Date.now()), '받은 날 = 저장하는 때의 오늘(트랜잭션 안에서 센 날)');
  assert.deepEqual(stored().korMiss, { literal: 1, make: 1 }, '두 번 다 센 잘못 읽기');
  assert.deepEqual(korDoneMap(), stored().korDone, '창의 프로필도');
  const s0 = JSON.stringify(stored());
  fakeIdb.failNext('profile');
  assert.deepEqual(await korFinish('K5', {}, IDS), { ok: false, why: 'save' });
  assert.equal(JSON.stringify(stored()), s0, '저장이 안 되면 없던 일');
  assert.equal(getProfileSnapshot().korDone['K5:1'], undefined, '메모리로 받은 척하지 않는다');
  const ok = await korFinish('K5', {}, IDS);
  assert.deepEqual([ok.ok, ok.star, ok.coins], [true, 1, 12]);
  assert.equal(stored().coins, 10 + 12 + 12);
  assert.deepEqual(await korFinish('K99', {}, IDS), { ok: false, why: 'unknown' });
});

test('🔍 Codex 48차 #7: 다음 별을 받을 날을 직접 센다 — 시계를 되돌려 ★이 앞날이어도 남은 날이 맞다 · ★★가 앞날이면 ★★★도 그 뒤 · 깨진 날 병합은 차례와 상관없이 바른 날이 이긴다 · ★ 없이 ★★만 있던 기록은 ★을 채워도 ★★를 다시 주지 않는다', () => {
  assert.deepEqual(nextStar({ 'K1:1': dayNum(at(10)) }, 'K1', T0), { star: 0, why: 'wait', next: 2, days: 11 }, '"내일"이 아니라 11일 뒤');
  assert.deepEqual(nextStar({ 'K1:1': dayNum(at(-20)), 'K1:2': dayNum(at(10)) }, 'K1', T0), { star: 0, why: 'wait', next: 3, days: 11 }, '★★ 날 다음 날부터');
  const v = dayNum(T0);
  for (const bad of ['bad', 1, 0, -5, 1e300, null]) {
    const a = { 'K1:1': bad };
    const b = { 'K1:1': v };
    assert.deepEqual([mergeDone(a, b), mergeDone(b, a)], [{ 'K1:1': v }, { 'K1:1': v }], `바른 날이 이긴다 ${String(bad)}`);
  }
  assert.deepEqual(mergeDone({ 'K1:1': 'x' }, { 'K1:1': -3 }), { 'K1:1': 1 }, '둘 다 깨졌으면 받은 것으로만');
  assert.deepEqual(mergeDone({ 'K1:1': v + 3 }, { 'K1:1': v, 'K2:1': v }), { 'K1:1': v, 'K2:1': v }, '이른 날 · 합집합');
  assert.deepEqual(mergeDone('x', [1]), {});
  for (const [x, y] of [[{ ...emptyProfile(), korDone: { 'K1:1': 'bad' }, updatedAt: 9 }, { ...emptyProfile(), korDone: { 'K1:1': v }, updatedAt: 5 }], [{ ...emptyProfile(), korDone: { 'K1:1': v }, updatedAt: 9 }, { ...emptyProfile(), korDone: { 'K1:1': 'bad' }, updatedAt: 5 }]]) {
    assert.deepEqual(mergeStatRecord('profile', x, y).korDone, { 'K1:1': v }, '병합도');
  }
  // ★ 없이 ★★만 있던 깨진 기록 — ★을 채우면 별 둘이 되고, ★★를 다시 주지 않는다
  const p = pf({ coins: 0, korDone: { 'K1:2': v } });
  assert.deepEqual(korFinishRule(p, 'K1', T0, {}, IDS), { ok: true, star: 1, coins: KOR_COINS[1], stone: 1, throws: 1, stars: 2 });
  assert.equal(korFinishRule(p, 'K1', at(1), {}, IDS).star, 0, '★★는 이미 있다 — ★★★는 7일 뒤');
  assert.equal(p.coins, KOR_COINS[1]);
});

test('🔍 Codex 48차 #8·47차 #4: 아주 큰 카운터는 끝에서 멈춘다 — 잘못 읽기 횟수 · 💤(넘치면 다음 읽기에서 0이 됐다)', async () => {
  const p = pf({ korMiss: { make: Number.MAX_SAFE_INTEGER } });
  korFinishRule(p, 'K1', T0, { make: 1 }, IDS);
  assert.equal(p.korMiss.make, Number.MAX_SAFE_INTEGER);
  assert.deepEqual(missOf(p.korMiss), { make: Number.MAX_SAFE_INTEGER });
  const RS = await import('../js/rest.js');
  const { evolveRule } = await import('../js/db.js');
  const q = pf({ items: { f_heal: 1 }, caught: { 7: 1 }, mons: { 7: { lv: 1, rx: Number.MAX_SAFE_INTEGER, rxLv: 0 } }, house: { started: true, seq: 1, rooms: [{ id: 'r1', wall: '', floor: '', items: [{ u: 1, id: 'f_heal', x: 0, y: 0, f: 0 }] }] } });
  RS.restStartRule(q, 1, 7, T0, '');
  RS.restClaimRule(q, 1, T0 + RS.REST_MS, undefined, 100, evolveRule);
  assert.equal(q.mons[7].rx, Number.MAX_SAFE_INTEGER);
  assert.equal(RS.rxOf(q.mons[7]).rx, Number.MAX_SAFE_INTEGER, '다음 읽기에서도 그대로');
});

test('🔍 Codex 48차 원고: 근거를 넓힘(K1-3 ③④⑧ · K2-1 ⑤⑦⑧ · K4-1 ④⑧) · 정답은 그대로 · 풀이는 "짐작할 수 있어요" · 종류 바로잡음 · 저작권 줄 "오늘 맞춤법으로 옮겨" · 📖 낱말은 글에 나오는 말', () => {
  const q = (id) => DATA.cards.flatMap((c) => c.qs).find((x) => x.id === id);
  const ans = (id) => q(id).opts.find((o) => o.ok).t;
  assert.deepEqual([q('K1-3').ev, q('K2-1').ev, q('K4-1').ev], [[3, 4, 8], [5, 7, 8], [4, 8]]);
  assert.deepEqual(['K1-1', 'K1-3', 'K2-1', 'K4-1', 'K4-2', 'K4-3', 'K5-3'].map(ans), ['민재가 그 주에 강낭콩에 물 주는 것을 잊었다.', '시든 강낭콩에 얼른 물을 주려고', '모두가 돌아가며 따뜻한 안쪽에 들어갈 수 있게', '뮤 카드', '부럽고 갖고 싶었다.', '하준이가 미안해하지 않고 마음 편히 받게 하려고', '도서관을 열어야 하는 까닭(근거)을 말한다.']);
  assert.match(q('K1-1').evNote, /잊었을 거라고 짐작할 수 있어요/);
  assert.ok(!/알 수 있어요/.test(q('K1-1').evNote));
  const typeOf = (id, t) => q(id).opts.find((o) => o.t === t).type;
  assert.deepEqual([typeOf('K1-3', '다음 주에도 당번을 하고 싶어서'), typeOf('K5-3', '점심시간을 줄이자고 한다.'), typeOf('K4-2', '카드를 선물로 받아 고마웠다.')], ['make', 'make', 'time']);
  assert.ok(!q('K4-3').opts.some((o) => /주지 않았겠지요/.test(o.why || '')), 'K4-3: 선물하면서 자랑할 수도 있다');
  assert.ok(!q('K4-1').opts.some((o) => /상관없었다/.test(o.t)), 'K4-1: 막을 수 없는 보기는 뺐다');
  assert.ok(!/중심 생각은 한 문장에서 찾지 않아요/.test(q('K2-3').doneNote));
  for (const c of DATA.cards.filter((x) => x.kind === 'classic')) assert.match(c.facts.find((f) => f[0] === '저작권')[1], /오늘 맞춤법으로 옮겨 실어요|쉬운 말로 다시 써서 실어요/, `${c.id} — 원문을 "그대로"라고 하지 않는다`);
  const withWords = DATA.cards.filter((c) => c.words);
  assert.equal(withWords.length, DATA.cards.length, '글마다 낱말 풀이');
  assert.ok(DATA.cards[2].words.some((w) => w[0] === '그믐밤') && DATA.cards[5].words.some((w) => w[0] === '갈잎'));
  const base = clone(DATA.cards[0]);
  base.words = [['코끼리', '큰 동물']];
  assert.match(checkCard(base).join(), /"코끼리"은 글에 없는 말/);
  base.words = Array.from({ length: 7 }, () => ['당번', '차례']);
  assert.match(checkCard(base).join(), /여섯 개까지/);
  base.words = [['당번']];
  assert.match(checkCard(base).join(), /\[낱말, 뜻\]/);
});

test('★ 🔍 Codex 48차 F: 저장소 트랜잭션을 바로 둘 — 같은 글을 동시에 끝내도 별 하나 · 💰 한 번 (xp 줄을 거치지 않고)', async () => {
  const { applyHouseRule } = await import('../js/db.js');
  await seed({ coins: 0, coinsEarned: 0, korDone: {}, korMiss: {} });
  const two = await Promise.all([1, 2].map(() => applyHouseRule((p) => korFinishRule(p, 'K6', Date.now(), {}, IDS))));
  assert.deepEqual(two.map((r) => r.star).sort(), [0, 1]);
  assert.equal(stored().coins, KOR_COINS[1]);
  assert.deepEqual(Object.keys(stored().korDone), ['K6:1']);
});

// ───────────────────── 화면 (koreanview) ─────────────────────

test('📚 화면 말(순수): 도감 칸 상태 · 다 읽은 뒤 말 · 보기 섞기는 차례만 바꾼다', async () => {
  const v = await import('../js/koreanview.js');
  const d = { 'K1:1': dayNum(T0) };
  assert.deepEqual(v.statusOf({}, 'K1', T0), { text: '새 글 · 다 읽으면 ★ 💰12', ready: true });
  assert.deepEqual(v.statusOf(d, 'K1', at(0, 20)), { text: '내일 다시 읽으면 ★★', ready: false });
  assert.deepEqual(v.statusOf(d, 'K1', at(1)), { text: '다시 읽으면 ★★ 💰8', ready: true });
  d['K1:2'] = dayNum(at(1));
  assert.deepEqual(v.statusOf(d, 'K1', at(2)), { text: '5일 뒤 다시 읽으면 ★★★', ready: false }, '처음 날부터 이틀 → 5일 남음');
  assert.deepEqual(v.statusOf(d, 'K1', at(8)), { text: '다시 읽으면 ★★★ 💰20', ready: true });
  d['K1:3'] = dayNum(at(8));
  assert.deepEqual(v.statusOf(d, 'K1', at(9)), { text: '★★★ 다 모았어요!', ready: false });
  assert.equal(v.finishText({ ok: true, star: 1, coins: 12, stars: 1 }).title, '📚 도감 등록!');
  assert.deepEqual(v.finishText({ ok: true, star: 1, coins: 12, stars: 1 }).lines, ['💰 +12 · 🎯 국어 포켓몬 잡기 1번', '내일 다시 읽으면 ★★ 💰8']);
  assert.equal(v.finishText({ ok: true, star: 2, coins: 8, stars: 2 }).title, '★★ 두 번째 별!');
  assert.equal(v.finishText({ ok: true, star: 3, coins: 20, stars: 3 }).title, '★★★ 다 모았어요!');
  assert.deepEqual(v.finishText({ ok: true, star: 0, wait: 'wait', next: 2, days: 1 }), { title: '오늘도 잘 읽었어요', lines: ['내일 다시 읽으면 ★★ 💰8'] });
  assert.deepEqual(v.finishText({ ok: true, star: 0, wait: 'wait', next: 2, days: 11 }).lines, ['11일 뒤 다시 읽으면 ★★ 💰8'], '시계를 되돌렸으면 남은 날 그대로');
  assert.deepEqual(v.finishText({ ok: true, star: 0, wait: 'wait', next: 3, days: 3 }), { title: '또 읽었어요!', lines: ['3일 뒤 다시 읽으면 ★★★ 💰20'] });
  assert.deepEqual(v.finishText({ ok: true, star: 0, wait: 'full' }).title, '또 읽어 줘서 고마워요');
  assert.deepEqual(v.statusOf({ 'K1:1': dayNum(at(10)) }, 'K1', T0), { text: '11일 뒤 다시 읽으면 ★★', ready: false });
  assert.deepEqual([v.whenText(1), v.whenText(2), v.whenText(0), v.whenText('x')], ['내일', '2일 뒤', '내일', '내일']);
  const kq = DATA.cards[0].qs[0];
  assert.deepEqual(v.wrongNotes(kq, [3, 0, 1]), [{ t: kq.opts[3].t, why: kq.opts[3].why }, { t: kq.opts[0].t, why: kq.opts[0].why }], '고른 차례대로 · 정답은 빼고');
  assert.deepEqual(v.wrongNotes(kq, []), []);
  assert.equal(v.finishText({ ok: false, why: 'save' }).title, '저장이 안 됐어요');
  assert.equal(v.finishText({ ok: false, why: 'unknown' }).title, '이 글은 지금 도감에 없어요');
  let seq = [0.99, 0.01, 0.5];
  const rng = () => seq.shift() ?? 0;
  const order = v.shuffled(4, rng);
  assert.deepEqual([...order].sort(), [0, 1, 2, 3]);
  const seen = new Set();
  for (let i = 0; i < 300; i++) seen.add(v.shuffled(4)[0]);
  assert.equal(seen.size, 4, '정답이 늘 같은 자리에 오지 않게 — 맨 앞 자리에 넷 다 온다');
  assert.equal(v.CONTENT_URL, './coach/korean/reading.json');
});

test('📚 화면 연결: 홈 카드 📚 국어(안농) · view-korean · app 전환·시간 안 셈 · 오프라인 목록 · 저장은 xp.korFinish로만 · 틀린 보기는 잘못 읽기로 세고 근거 실수는 안 셈 · 다 읽으면 저장', async () => {
  const { SUBJECTS } = await import('../js/home.js');
  const k = SUBJECTS.find((s) => s.key === 'korean');
  assert.deepEqual([k.view, k.ready, k.mascot, k.emoji], ['korean', true, 201, '📚']);
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.ok(html.includes('<section id="view-korean" class="view" hidden>') && html.includes('<main id="korean-main" class="kor-main"></main>') && html.includes('id="btn-korean-back"'));
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.ok(app.includes("korean: document.getElementById('view-korean'),") && app.includes("if (name === 'korean') enterKorean().catch(() => {});") && app.includes('initKorean({ showView });'));
  const fn = app.slice(app.indexOf('function subjectOfView(name) {'), app.indexOf('\n}\n', app.indexOf('function subjectOfView(name) {')));
  assert.ok(fn.includes("if (name === 'korean') return 'korean';"), '⏳ 국어도 센다 — 날마다 1시간 30분 (2026-10-11)');
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  for (const f of ['./js/korean.js', './js/koreanview.js', './coach/korean/reading.json']) assert.ok(sw.includes(`'${f}'`), f);
  const src = readFileSync(new URL('../js/koreanview.js', import.meta.url), 'utf8');
  assert.ok(!/applyHouseRule|mutateProfile|from '\.\/db\.js'/.test(src), '화면이 저장소를 직접 만지지 않는다');
  const body = (head) => { const i = src.indexOf(head); assert.ok(i >= 0, head); return src.slice(i, src.indexOf('\n}\n', i)); };
  const pick = body('function pick(k) {');
  assert.ok(pick.includes('r.misses[o.type] = (r.misses[o.type] || 0) + 1;') && pick.includes('st.wrong.push(k);'), '틀린 보기는 잘못 읽기로');
  assert.ok(!body('function evPick(n) {').includes('misses'), '근거 실수는 안 센다');
  assert.ok(body('async function finishCard() {').includes('res = await korFinish(r.card.id, r.misses, (ui.cards || []).map((c) => c.id), r.evMiss);'));
  assert.ok(body('function openCard(id) {').includes('order: shuffled(q.opts.length)'), '보기는 물음마다 섞는다');
  assert.ok(body('export async function enterKorean() {').includes("if (ui.read) {"), '🎒·📊에서 돌아오면 읽던 글 그대로');
  // Codex 48차: 틀린 까닭은 맞힌 뒤에 · 근거 실수 말은 부드럽게 · 읽어 주기 알림은 한 곳 · 초점 옮김 · 띠 높이만큼 띄움
  const rq = body('function renderQ() {');
  assert.ok(rq.includes('for (const w of wrongNotes(q, st.wrong)) {') && rq.indexOf('wrongNotes(q, st.wrong)') > rq.indexOf('if (qDone) {'), '틀린 보기의 까닭은 맞힌 뒤에만');
  assert.ok(rq.includes('if (live) live.textContent = say;') && rq.includes('if (focusTo) moveFocus(col,'));
  assert.ok(!rq.includes("setAttribute('role', 'status')"), '다시 그리는 칸에는 role=status를 새로 만들지 않는다');
  assert.ok(body('function evidenceEl(q, st, unit) {').includes('보다 답을 더 잘 받쳐 주는 ${unit}을 찾아볼까요?'));
  assert.ok(!src.includes('에는 까닭이 없어요'));
  assert.ok(body('function renderRead() {').includes("main.style.setProperty('--kor-top',") && body('function bringQ() {').includes("if (col.getBoundingClientRect().top < under + 4) col.scrollIntoView({ block: 'start' });"), '띠 아래까지 셈');
  for (const f of ['function pick(k) {', 'function evPick(n) {']) assert.ok(body(f).includes("r.focus = 'answer';"), f);
  const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
  assert.ok(css.includes('position: sticky; top: var(--kor-top, 72px);') && css.includes('.kor-qcol { scroll-margin-top: var(--kor-top, 72px); }'), '띠 아래에 붙는다');
  const check = readFileSync(new URL('../tools/check.mjs', import.meta.url), 'utf8');
  assert.ok(check.includes("readFileSync('coach/korean/reading.json', 'utf8')") && check.includes("readdirSync('coach/korean')"), '배포 전 검사 · 공개 파일 기록 검사');
  assert.deepEqual(Object.keys(KINDS), ['practice', 'classic']);
});

test('🟩 국어스톤 (2026-10-11): 별을 새로 받을 때 보기·근거를 모두 한 번에 맞혔으면 하나 · 틀린 보기·근거 실수가 있으면 없음 · 같은 날 다시 읽으면(별 없음) 없음 · 아이템 id는 items.STONE_KOREAN · 끝 카드 말', async () => {
  const { KOR_STONE } = await import('../js/korean.js');
  const { STONE_KOREAN } = await import('../js/items.js');
  assert.equal(KOR_STONE, STONE_KOREAN.id);
  const p = pf({ items: { stone_korean: 2 } });
  assert.equal(korFinishRule(p, 'K1', T0, {}, IDS, 0).stone, 1);
  assert.equal(p.items.stone_korean, 3);
  assert.equal(korFinishRule(p, 'K1', at(0, 18), {}, IDS, 0).stone, undefined, '같은 날 다시 — 별도 스톤도 없음');
  assert.equal(p.items.stone_korean, 3);
  assert.deepEqual([korFinishRule(p, 'K2', T0, { make: 1 }, IDS, 0).stone, korFinishRule(p, 'K3', T0, {}, IDS, 1).stone], [0, 0], '틀린 보기 · 근거 실수');
  assert.equal(p.items.stone_korean, 3);
  const q = pf({ items: { stone_korean: 'x', ball: 2 } });
  korFinishRule(q, 'K4', T0, {}, IDS);
  assert.deepEqual(q.items, { stone_korean: 1, ball: 2 }, '깨진 수는 0부터 · 다른 아이템은 그대로');
  const v = await import('../js/koreanview.js');
  assert.equal(v.finishText({ ok: true, star: 1, coins: 12, stone: 1, stars: 1 }).lines[0], '💰 +12 · 🟩 국어스톤 +1 (한 번에 다 맞혔어요!) · 🎯 국어 포켓몬 잡기 1번');
  assert.equal(v.finishText({ ok: true, star: 1, coins: 12, stone: 0, stars: 1 }).lines[0], '💰 +12 · 🎯 국어 포켓몬 잡기 1번');
  const src = readFileSync(new URL('../js/koreanview.js', import.meta.url), 'utf8');
  assert.ok(src.includes('    r.evMiss += 1;') && src.includes('res = await korFinish(r.card.id, r.misses, (ui.cards || []).map((c) => c.id), r.evMiss);'), '근거 실수는 🟩 판정에만');
});

test('📚 명작도 문장 글일 수 있다 (v232 「알에서 태어나다」): 글 상자는 stanzas가 없으면 번호 붙은 문장으로 — 시 모양을 가정하면 화면이 깨졌다', () => {
  const view = readFileSync(new URL('../js/koreanview.js', import.meta.url), 'utf8');
  const i = view.indexOf('function passageEl(card) {');
  const body = view.slice(i, view.indexOf('\n}\n', i));
  assert.ok(body.includes('if (!Array.isArray(card.stanzas)) box.appendChild(proseEl(card));'), '이야기 명작은 문장으로');
  assert.ok(body.includes("const poem = Array.isArray(card.stanzas) ? el('div', 'kor-poem') : null;") && body.includes('for (const st of poem ? card.stanzas : [])'), '시만 연·줄로');
  assert.ok(!/card\.stanzas\)/.test(body.replaceAll('Array.isArray(card.stanzas)', '')), 'stanzas를 그대로 돌지 않는다');
  // 원고의 모든 모양이 화면이 아는 모양 — 명작(lines 또는 stanzas) · 연습(lines만)
  const shapes = new Set(DATA.cards.map((c) => `${c.kind}:${Array.isArray(c.stanzas) ? 'stanzas' : 'lines'}`));
  for (const sh of shapes) assert.ok(['classic:stanzas', 'classic:lines', 'practice:lines'].includes(sh), sh);
  assert.ok(shapes.has('classic:lines'), '「알에서 태어나다」 — 문장 명작이 실제로 있다');
});
