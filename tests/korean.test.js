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

test('📚 원고: 형식 검사 통과 · 백쉰네 편(연습 백열하나·명작 마흔셋 — v244 ⭐ 중학교 미리보기 넷 · v245 🎧 듣기 여섯 · v254 새 글 열둘 · v258 시 일곱 · v261 새 글 열둘 · v265 신문 글 여섯 · v267 단원 채우기 여섯 · v281 새 글 열둘 · v282 포켓몬 글 여섯 · v291 호상놀이 글 넷 · v298 4학년 2학기 글 열둘 · v320 4학년 2학기 글 둘째 묶음 열둘 · v322 4학년 2학기 글 셋째 묶음 열둘 · v347 4학년 2학기 글 넷째 묶음 열둘) · 물음마다 보기 넷·정답 하나·틀린 보기마다 잘못 읽기와 까닭 · 근거 번호는 글 안 · 쓸 수 있는 카드 = 전부', () => {
  assert.deepEqual(checkContent(DATA), []);
  assert.deepEqual(IDS, Array.from({ length: 154 }, (_, i) => `K${i + 1}`));
  const P = 'practice'; const C = 'classic';
  assert.deepEqual(DATA.cards.map((c) => c.kind), [P, P, C, P, P, C, C, C, C, P, P, P, P, P, P, P, P, C, C, P, P, P, P, P, P, P, C, C, C, C, C, C, C, C, C, P, P, P, P, P, P, P, P, P, P, P, P, P, P, C, C, C, C, C, C, C, C, C, C, C, P, P, P, P, P, P, P, P, C, C, C, C, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, C, C, C, C, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, C, P, P, P, P, C, P, P, P, P, P, C, P, P, P, P, P, C, P, P, P, P, P, P, C, P, P, P, P, C, P, P, P, P, P, P, P, P, P, C, C, P, P]);
  assert.equal(validCards(DATA).length, 154);
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
  assert.equal(qn, 523); // v291 물음 열여섯 · v298 물음 서른여섯 · v320 물음 서른여섯 · v322 물음 서른여섯 · v347 물음 서른여섯 더함
  assert.deepEqual([...used].sort(), Object.keys(TYPES).sort(), '잘못 읽기 아홉 가지(v236 짜임 놓치기 · v282 🧠 아는 것으로 답하기 더함)가 모두 한 번 이상 쓰인다');
  // 명작은 지은이·저작권 줄 — 저작권이 끝난 작품만(지은이가 1963년 전에 세상을 떠남 · 또는 지은이를 알 수 없는 옛이야기를 다시 씀)
  for (const c of DATA.cards.filter((x) => x.kind === 'classic')) {
    const law = c.facts.find((f) => f[0] === '저작권')[1];
    const year = Number((/(\d{4})년에 세상을 떠나/.exec(law) || [])[1]);
    const folk = /^지은이를 알 수 없는 옛이야기/.test(law) && /^지은이 모름 · 신코치가 다시 씀$/.test(c.author);
    assert.ok((year > 0 && year < 1963) || folk, `${c.id} ${c.author} ${year}`);
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
    ['근거 없는데 풀이 없음', (c) => { c.qs[0].ev = null; delete c.qs[0].evQ; delete c.qs[0].evNote; c.qs[0].hint2 = '글을 다시 읽어 봐요.'; }, /doneNote/], // v258: 근거가 없으면 💡 둘째 힌트도 있어야 — 이 경우는 풀이 하나만
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
  assert.deepEqual(korFinishRule(p, 'K999', T0, {}, IDS), { ok: false, why: 'unknown' });
  assert.deepEqual(korFinishRule(p, 'K1', T0, {}, null), { ok: false, why: 'unknown' });
  assert.equal(p.coins, 5);
  const r1 = korFinishRule(p, 'K1', T0, { make: 1, flip: 2, guess: 9, time: -3, link: 1e20 }, IDS);
  assert.deepEqual(r1, { ok: true, star: 1, coins: 12, xp: 0, stone: 0, throws: 1, stars: 1, next: 2, days: 1 }, '다음 별(★★)은 내일 · 읽은 줄(opts.read)이 없으면 ⚡ 0(v327)');
  assert.deepEqual([p.coins, p.coinsEarned, p.korDone], [17, 52, { 'K1:1': dayNum(T0) }]);
  assert.deepEqual(p.korMiss, { make: 1, flip: 2 }, '모르는 종류·음수·아주 큰 수는 버린다');
  const again = korFinishRule(p, 'K1', at(0, 18), { make: 99 }, IDS);
  assert.deepEqual(again, { ok: true, star: 0, coins: 0, xp: 0, stars: 1, wait: 'wait', next: 2, days: 1 });
  assert.deepEqual([p.coins, p.korMiss.make], [17, 1 + MISS_MAX], '같은 날은 💰 없음 · 횟수는 MISS_MAX까지');
  assert.deepEqual(korFinishRule(p, 'K1', at(1), {}, IDS), { ok: true, star: 2, coins: 8, xp: 0, stone: 1, throws: 2, stars: 2, next: 3, days: 6 }, '★★ 뒤 ★★★까지 남은 날');
  assert.deepEqual(korFinishRule(p, 'K1', at(3), {}, IDS), { ok: true, star: 0, coins: 0, xp: 0, stars: 2, wait: 'wait', next: 3, days: 4 });
  assert.deepEqual(korFinishRule(p, 'K1', at(7), {}, IDS), { ok: true, star: 3, coins: 20, xp: 0, stone: 1, throws: 3, stars: 3 });
  assert.deepEqual(korFinishRule(p, 'K1', at(40), {}, IDS), { ok: true, star: 0, coins: 0, xp: 0, stars: 3, wait: 'full' });
  assert.equal(p.coins, 5 + 12 + 8 + 20);
  assert.equal(p.coinsEarned, 40 + 12 + 8 + 20);
  // 깨진 기록에서도 멈추지 않는다
  const q = pf({ korDone: 'bad', korMiss: [1, 2], coins: 'x' });
  assert.deepEqual(korFinishRule(q, 'K2', T0, { detail: 1 }, IDS), { ok: true, star: 1, coins: 12, xp: 0, stone: 0, throws: 1, stars: 1, next: 2, days: 1 });
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

test('📚 빈 단원 글 7편 (v236, 아버님 "이대로 진행"): 발표·정보 찾기·토의·여러 형태의 책·문장 호응·김영랑 방언 시·방정환 「만년 셔츠」 — 원문 대조 · 물음이 묻는 말을 풀이·글이 미리 알려 주지 않음 · 보기에 옮긴 문장 = 글의 그 문장 · 단원 지도에 이어짐', () => {
  const card = (id) => DATA.cards.find((c) => c.id === id);
  const NEW = ['K13', 'K14', 'K15', 'K16', 'K17', 'K18', 'K19'];
  assert.deepEqual(NEW.map((id) => card(id).genre), ['발표하는 글', '조사 일기', '토의', '생활문', '일기', '시', '동화']);
  // 김영랑 「오-매 단풍 들것네」 — 『영랑시집』(1935, 위키문헌) 원문에 facts에 적은 바꿈만 (방언은 그대로)
  const ORIG = [['「오―매 단풍들것네」', '장광에 골불은 감닙 날러오아', '누이는 놀란듯이 치어다보며', '「오―매 단풍들것네」'], ['추석이 내일모레 기둘니리', '바람이 자지어서 걱졍이리', '누이의 마음아 나를보아라', '「오―매 단풍들것네」']];
  const CHANGES = [['감닙', '감잎'], ['걱졍', '걱정'], ['기둘니리', '기둘리리'], ['골불은', '골붉은'], ['날러오아', '날아오아']];
  const SPACING = [['단풍들것네', '단풍 들것네'], ['놀란듯이', '놀란 듯이'], ['나를보아라', '나를 보아라'], ['「', '"'], ['」', '"'], ['―', '-']];
  const today = (t) => [...CHANGES, ...SPACING].reduce((x, [a, b]) => x.split(a).join(b), t);
  assert.deepEqual(card('K18').stanzas, ORIG.map((st) => st.map(today)));
  const k18src = card('K18').facts.find((f) => f[0] === '원문')[1];
  for (const [a, b] of CHANGES) assert.ok(k18src.includes(`${a} → ${b}`), `원문에서 바꾼 표기는 facts에 적는다 — ${a} → ${b}`);
  assert.equal(card('K18').author, '김영랑');
  // 풀이가 갈리는 2연·낱말은 묻지 않는다 · 물음이 묻는 말('오-매'·'들것네')은 📖 풀이에 넣지 않는다
  for (const q of card('K18').qs) assert.ok(!/나를 보아라|골붉은|자지어서|기둘리리/.test(q.q + q.opts.map((o) => o.t).join(' ')), `${q.id}: 풀이가 갈리는 곳은 묻지 않는다`);
  assert.ok(!card('K18').words.some((w) => /오-매|들것네/.test(w[0])), '물음이 묻는 말은 풀이에 넣지 않는다');
  // 방정환 「만년 샤쓰」 — 줄여 다시 썼어도 따옴표 안의 말은 원문 그대로 (위키문헌 본문 일부 · 저작권이 끝난 글)
  const MANNYEON = [
    '전 후열 모두 웃옷 벗어!', '선생님, 만년 셔츠도 좋습니까?', '무엇? 만년 셔츠? 만년 셔츠란 무어야?', '매, 매, 맨몸 말씀입니다.', '벗어랏!', '한창남! 왜 셔츠를 안 입었니?', '없어서 못 입었습니다.',
    "'예, 두 벌 남았으니, 하나는 어머니 입으시지요.'", "'예, 셔츠도 잘 입고 버선도 잘 신었으니까, 춥지는 않습니다.'",
    '그러나, 네가 거짓말을 하더라도 어머니께서 너의 벌거벗은 가슴과 버선 없이 맨발로 짚신을 신은 것을 보시고 아실 것이 아니냐?',
    '저의 어머니는 제가 여덟 살 되던 해에 눈이 멀으셔서 보지를 못하고 사신답니다.',
  ].join(' ');
  const quotes = card('K19').lines.flatMap((l) => [...l.matchAll(/"([^"]+)"/g)].map((m) => m[1]));
  assert.equal(quotes.length, 11);
  for (const q of quotes) assert.ok(MANNYEON.includes(q.replace('머셔서', '멀으셔서')), `따옴표 안의 말은 원문 그대로: ${q}`);
  assert.equal(card('K19').author, '방정환 · 신코치가 줄여 씀');
  assert.match(card('K19').facts.find((f) => f[0] === '원문')[1], /줄여 썼어요/);
  assert.equal(lineCount(card('K19')), 20);
  // K13-1: 글이 답(표)을 미리 말하지 않는다 — 자료 목록은 "정리한 자료" ("발표"의 표는 빼고)
  assert.ok(!card('K13').lines.some((l) => /(^|[^발])표/.test(l)), 'K13 글에 "표"가 나오면 K13-1 답이 보인다');
  assert.ok(card('K13').lines.some((l) => l.startsWith('(사진을 보여 주며)')) && card('K13').lines.some((l) => l.startsWith('(영상을 보여 주며)')));
  // 보기에 "⑦ …"처럼 옮긴 문장은 글의 그 문장 (K17 일기 · K15 토의는 말한 사람까지)
  for (const q of [...card('K17').qs, ...card('K15').qs]) {
    const c = card(q.id.split('-')[0]);
    for (const o of q.opts) {
      const m = /^([①-⑳]) (.+)$/.exec(o.t);
      if (!m) continue;
      const line = lineText(c, '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳'.indexOf(m[1]) + 1);
      if (c.id === 'K17') assert.equal(m[2], line, `${q.id} ${o.t}`);
      else assert.ok(line.startsWith(m[2].split(':')[0] + ':'), `${q.id} 말한 사람 — ${o.t}`);
    }
  }
  // K17 호응: 틀린 보기는 모두 짜임 놓치기 · 정답은 ⑦(주어–서술어) · ④ 고친 문장 · ⑨(때)
  for (const q of card('K17').qs) for (const o of q.opts) if (!o.ok) assert.equal(o.type, 'agree', `${q.id} ${o.t}`);
  assert.deepEqual(card('K17').qs.map((q) => q.opts.find((o) => o.ok).t.slice(0, 1)), ['⑦', '공', '⑨']);
  assert.equal(TYPES.agree.name, '짜임 놓치기');
  // 📘 단원 지도: 새 카드는 모두 어느 단원에 이어진다 · 독서·4단원 이름은 2026 예시자료대로
  const UNITS = JSON.parse(readFileSync(new URL('../coach/korean/units.json', import.meta.url), 'utf8')).units;
  for (const id of NEW) assert.ok(UNITS.some((u) => (u.cards || []).includes(id)), `${id} 단원`);
  assert.ok(UNITS.filter((u) => u.term !== '4-2').every((u) => (u.cards || []).length > 0), '5학년 단원 열여섯 모두 글이 있다 (v298 4-2 매체 단원은 아직 준비 중)');
  assert.deepEqual(['5-1-독서', '5-2-독서', '5-2-4'].map((id) => UNITS.find((u) => u.id === id).title), ['책을 읽고 함께 이야기해요', '여러 가지 형태의 책을 읽어요', '표준어와 방언을 알아봐요']);
});

test('📚 새 글 12편 (v241, 아버님 "이대로 진행" — 지금 방식으로 더 많이):글이 한 편뿐이던 단원 일곱에 한 편씩 · ✨ 명작 다섯(윤동주·정지용·이육사·양사언 시조·토끼전) — 원문 대조 · 보기에 옮긴 문장 = 글 · 글 속 수가 맞음 · 물음이 묻는 말은 풀이에 없음 · 단원 지도', () => {
  const card = (id) => DATA.cards.find((c) => c.id === id);
  const NEW = ['K20', 'K21', 'K22', 'K23', 'K24', 'K25', 'K26', 'K27', 'K28', 'K29', 'K30', 'K31'];
  assert.deepEqual(NEW.map((id) => card(id).genre), ['생활문', '발표 준비 일기', '조사 일기', '토의', '생활문', '편지', '생활문', '동시', '시', '시', '시조', '옛이야기']);
  assert.equal(NEW.reduce((n, id) => n + card(id).qs.length, 0), 44, '글이 긴 연습 카드는 물음 넷, 짧은 시는 셋');
  // 윤동주 「해바라기 얼굴」 — 『하늘과 바람과 별과 시』 1955년 판(위키문헌 페이지 132) 그대로
  assert.deepEqual(card('K27').stanzas, [['누나의 얼굴은', '해바라기 얼굴', '해가 금방 뜨자', '일터에 간다.'], ['해바라기 얼굴은', '누나의 얼굴', '얼굴이 숙어들어', '집으로 온다.']]);
  // 정지용 「호수 1」 — 위키문헌 《향수》 원문에 facts에 적은 바꿈만
  const HOSU = [['얼골 하나 야', '손바닥 둘 로', '폭 가리지 만,'], ['보고 싶은 마음', '호수 만 하니', '눈 감을 밖에.']];
  const HOSU_CH = [['얼골', '얼굴'], ['하나 야', '하나야'], ['둘 로', '둘로'], ['가리지 만', '가리지만'], ['호수 만', '호수만'], ['감을 밖에', '감을밖에']];
  const apply = (t, ch) => ch.reduce((x, [a, b]) => x.split(a).join(b), t);
  assert.deepEqual(card('K28').stanzas, HOSU.map((st) => st.map((l) => apply(l, HOSU_CH))));
  for (const [a, b] of HOSU_CH) assert.ok(card('K28').facts.find((f) => f[0] === '원문')[1].includes(`${a} → ${b}`), `호수: ${a} → ${b}`);
  // 이육사 「청포도」 — 위키문헌(1939 《문장》 · 『육사시집』)에 facts에 적은 바꿈만
  const GRAPE = [['내 고장 칠월은', '청포도가 익어가는 시절'], ['이 마을 전설이 주절이주절이 열리고', '먼데 하늘이 꿈꾸며 알알이 들어와 박혀'], ['하늘 밑 푸른 바다가 가슴을 열고', '흰 돛단배가 곱게 밀려서 오면'],
    ['내가 바라는 손님은 고달픈 몸으로', '청포(靑袍)를 입고 찾아온다고 했으니'], ['내 그를 맞아 이 포도를 따먹으면', '두 손은 함뿍 적셔도 좋으련'], ['아이야 우리 식탁엔 은쟁반에', '하이얀 모시 수건을 마련해두렴']];
  const GRAPE_CH = [['익어가는', '익어 가는'], ['먼데', '먼 데'], ['따먹으면', '따 먹으면'], ['마련해두렴', '마련해 두렴'], ['주절이주절이', '주저리주저리'], ['청포(靑袍)', '청포']];
  assert.deepEqual(card('K29').stanzas, GRAPE.map((st) => st.map((l) => apply(l, GRAPE_CH))));
  for (const [a, b] of GRAPE_CH) assert.ok(card('K29').facts.find((f) => f[0] === '원문')[1].includes(`${a} → ${b}`), `청포도: ${a} → ${b}`);
  // 양사언 시조 — 『청구영언』(1728)을 오늘 말로 · 끝 구절이 책마다 다르다는 것도 적는다
  assert.deepEqual(card('K30').stanzas, [['태산이 높다 하되 하늘 아래 뫼이로다', '오르고 또 오르면 못 오를 리 없건마는', '사람이 제 아니 오르고 뫼를 높다 하느니']]);
  const k30src = card('K30').facts.find((f) => f[0] === '원문')[1];
  for (const s of ['청구영언', '뫼히로다 → 뫼이로다', '뫼흘 → 뫼를', '가곡원류']) assert.ok(k30src.includes(s), `시조 원문 줄: ${s}`);
  // 옛 한글(아래아 같은 조합 자모)은 태블릿 글꼴에서 "ㅎ되"처럼 깨진다(v241 헤드리스) — 아이에게 보이는 원고에는 지금 글자만
  const OLD_JAMO = /[\u1100-\u11FF\u3164\uA960-\uA97F\uD7B0-\uD7FF]/;
  for (const f of ['../coach/korean/reading.json', '../coach/korean/words.json', '../coach/korean/units.json']) assert.ok(!OLD_JAMO.test(readFileSync(new URL(f, import.meta.url), 'utf8')), `${f}: 옛 한글 조합 자모`);
  // 토끼전 — 지은이를 알 수 없는 옛이야기를 다시 씀(따옴표 안도 다시 쓴 말) · 뿌리는 『삼국사기』
  assert.equal(card('K31').author, '지은이 모름 · 신코치가 다시 씀');
  assert.match(card('K31').facts.find((f) => f[0] === '원문')[1], /다시 썼어요 — 따옴표 안의 말도 신코치가 다시 쓴 말/);
  assert.match(card('K31').facts.find((f) => f[0] === '만나는 곳')[1], /삼국사기/);
  // 풀이가 갈리는 것은 묻지 않는다 — 적어 둔다
  for (const id of ['K27', 'K28', 'K29']) assert.ok(card(id).facts.some((f) => f[0] === '알아 둘 것' && /묻지 않았어요/.test(f[1])), id);
  for (const q of card('K29').qs) assert.ok(!/손님은 누구|누구를 기다/.test(q.q), `${q.id}: 손님이 누구인지는 묻지 않는다`);
  // 물음이 묻는 말은 📖 풀이에 넣지 않는다
  const glossed = (id) => card(id).words.map((w) => w[0]);
  for (const w of ['혼저', '옵서예', '하영', '복삭', '속앗수다']) assert.ok(!glossed('K26').some((g) => g.includes(w)), `K26 ${w}`);
  for (const w of ['호수만', '감을밖에']) assert.ok(!glossed('K28').includes(w), `K28 ${w}`);
  assert.ok(!glossed('K30').includes('제'), 'K30-2가 묻는 "제 아니 오르고"');
  assert.ok(!glossed('K31').some((g) => g.startsWith('솔깃')), 'K31-2가 묻는 까닭');
  // 방언 글은 뜻을 묻기 전에 알려 주지 않는다(⑧의 '속았수다'만 글이 알려 주고, K26-3은 놀란 까닭을 묻는다)
  assert.ok(!card('K26').lines.some((l) => /어서 오|많이 먹/.test(l)), 'K26-1·2 답이 글에 미리 나오지 않는다');
  // 글 속 수가 맞는다 — K21 조사 · K22 시간
  const k21 = card('K21').lines.join(' ');
  assert.ok(/25명/.test(k21) && /15명/.test(k21) && /10명/.test(k21) && 15 + 10 === 25, 'K21 먹는 15 + 안 먹는 10 = 25');
  assert.ok(/6명/.test(k21) && /4명/.test(k21) && 6 + 4 === 10, 'K21 까닭 6 + 4 = 안 먹는 10');
  assert.ok(/3분짜리/.test(k21) && /모두 5분/.test(k21));
  const k22 = card('K22').lines;
  assert.ok(k22[3].includes('아침 9시') && k22[5].includes('아침 7시') && k22[5].includes('매주 월요일은 쉽니다'), 'K22 블로그 9시 · 안내문 7시 · 월요일 쉼');
  assert.match(card('K22').qs[1].opts.find((o) => o.type === 'flip').why, /안내문은 아침 7시, 블로그는 아침 9시/);
  // 보기에 "⑥ …"처럼 옮긴 문장은 글의 그 문장 그대로 (K20 겪은 일·느낌 · K25 편지 호응)
  for (const q of [...card('K20').qs, ...card('K25').qs]) {
    const c = card(q.id.split('-')[0]);
    for (const o of q.opts) {
      const m = /^([①-⑳]) (.+)$/.exec(o.t);
      if (m) assert.equal(m[2], lineText(c, '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳'.indexOf(m[1]) + 1), `${q.id} ${o.t}`);
    }
  }
  // K25 호응: 어울리지 않는 문장은 ④(높임)·⑦(왜냐하면)·⑨(결코) 셋 · 고친 문장은 그 문장의 앞부분을 그대로 두고 끝을 맞춘다
  const k25 = card('K25');
  assert.deepEqual(k25.qs[0].opts.filter((o) => !o.ok).map((o) => o.t.slice(0, 1)), ['④', '⑦', '⑨']);
  assert.match(k25.qs[0].opts.find((o) => o.ok).t, /^⑧ 비록 .+지만/);
  const fix = (q) => q.opts.find((o) => o.ok).t;
  assert.ok(fix(k25.qs[1]).startsWith('왜냐하면 할머니 댁 마당이 정말 넓어서') && fix(k25.qs[1]).endsWith('때문이에요.'));
  assert.ok(fix(k25.qs[2]).includes('결코 잊지 않을'));
  assert.ok(fix(k25.qs[3]).includes('만드신') && fix(k25.qs[3]).endsWith('주셨어요.'));
  for (const q of k25.qs) for (const o of q.opts) if (!o.ok) assert.ok(['agree', 'flip'].includes(o.type), `${q.id} ${o.t}`);
  // 📘 단원 지도: 새 글은 모두 어느 단원에 · 한 편뿐이던 단원 일곱은 이제 두 편 이상
  const UNITS = JSON.parse(readFileSync(new URL('../coach/korean/units.json', import.meta.url), 'utf8')).units;
  for (const id of NEW) assert.ok(UNITS.some((u) => (u.cards || []).includes(id)), `${id} 단원`);
  for (const u of ['5-1-2', '5-1-3', '5-1-매체', '5-1-5', '5-2-독서', '5-2-2', '5-2-4']) assert.ok(UNITS.find((x) => x.id === u).cards.length >= 2, `${u} 두 편 이상`);
});

test('🔍 Codex 54차 원고: 같이 고를 만한 보기를 막음(K20 "드디어" · K21-4 과정 전체 · K25-3 뜻을 지키며) · 좋은 근거를 더 받음 · 제주어 표기 · 결식 학생 · 광고 단서 · K24-1 · K26-4 두 쪽짝 · K27-3 · 시조는 세 장 · 저작권은 한국 기준', () => {
  const card = (id) => DATA.cards.find((c) => c.id === id);
  const q = (id) => DATA.cards.flatMap((c) => c.qs).find((x) => x.id === id);
  // 1. ⑨ "드디어"는 기다린 마음 — 겪은 일 보기로 쓰려면 빼야 ⑬ 하나만 생각·느낌
  assert.ok(!card('K20').lines.some((l) => l.includes('드디어')) && !q('K20-1').opts.some((o) => o.t.includes('드디어')));
  // 2. "준비하며 생각한 것"이면 그래프도 맞다 → 과정 전체
  assert.match(q('K21-4').q, /과정을 전체적으로 정리한 말/);
  // 3. 근거 넓힘
  assert.deepEqual([q('K21-3').ev, q('K22-2').ev, q('K22-4').ev, q('K31-1').ev, q('K31-3').ev], [[9, 10, 12], [4, 5, 8, 9], [4, 5, 7, 8, 9], [1, 2, 3, 8], [9, 12, 13]]);
  for (const [id, n] of [['K21-3', '⑫'], ['K22-2', '⑤'], ['K22-4', '④'], ['K31-1', '⑧'], ['K31-3', '⑫']]) assert.ok(q(id).evNote.includes(n), `${id} 풀이에 ${n}`);
  // 4. "꼭 잊을 거예요"도 문장은 바르다 → 마음을 지키며 고치라고
  assert.match(q('K25-3').q, /잊지 않겠다는 마음이 드러나도록/);
  // 5. 제주어 표기 — 제주어 교육 플랫폼 '복삭 속앗수다'
  const k26 = card('K26').lines.join(' ');
  assert.ok(k26.includes('복삭 속앗수다') && !/폭싹|속았수다/.test(k26) && q('K26-3').q.includes('복삭 속앗수다'));
  assert.match(card('K26').lines[7], /'속았다'는 말로 들려/);
  // 9. 결식률(비율) → 결식 학생(사람)
  assert.ok(!JSON.stringify(card('K21')).includes('결식률') && card('K21').lines[4].includes("'아침 식사 결식 학생'"));
  // 10. 광고 뜻의 단서가 글 안에 · 11. 사서가 눈 이야기를 들었다는 말 없이
  assert.match(card('K22').lines[2], /새로 나온 수영복 사진/);
  assert.ok(!/사서 선생님께서/.test(q('K24-1').q) && /큰 글자책이 할아버지께 알맞았던 까닭/.test(q('K24-1').q));
  // 12. 보기 넷 모두 두 쪽짝
  for (const o of q('K26-4').opts) assert.ok(/^발표는 .+, 할머니 말은 .+ 그대로$/.test(o.t), o.t);
  // 13. 글에 없는 길이("하루 내내")를 정답에 넣지 않는다
  assert.ok(!q('K27-3').opts.some((o) => o.t.includes('하루 내내')));
  // 8. 시조는 세 '장' · 16. '-을밖에'
  assert.match(card('K30').facts.find((f) => f[0] === '만나는 곳')[1], /초장·중장·종장으로 이루어진 .+각 장을 한 줄씩/);
  assert.match(q('K28-3').doneNote, /-을밖에/);
  // 17. 저작권 줄은 한국 법 기준
  for (const c of DATA.cards.filter((x) => x.kind === 'classic')) assert.match(c.facts.find((f) => f[0] === '저작권')[1], /한국에서 저작권 보호 기간이 끝난/, c.id);
  assert.ok(!JSON.stringify(DATA).includes('저작권이 끝난'), '옛 말투("저작권이 끝난")가 남지 않는다');
});

test('🔍 Codex 51차 원고: 좋은 근거를 더 받음(K13-3 ⑫ · K14-1 ②) · K15-2는 "방법을 보탠 말"로 좁힘(⑥은 아쉬운 점 — 보탠 게 없다고 단정 안 함) · K18-3 도움말 · K17-1 틀린 문장이 있다고 먼저 · K14-1 "길이"가 아니라 드러남', () => {
  const q = (id) => DATA.cards.flatMap((c) => c.qs).find((x) => x.id === id);
  assert.deepEqual(q('K13-3').ev, [1, 12, 14]);
  assert.deepEqual(q('K14-1').ev, [2, 3, 5]);
  assert.match(q('K13-3').evNote, /⑫/);
  assert.match(q('K14-1').evNote, /②/);
  assert.match(q('K15-2').q, /방법을 더 좋게 만들 방법을 보탠 말/);
  const six = q('K15-2').opts.find((o) => o.t.startsWith('⑥'));
  assert.ok(!/무엇을 보탠 것은 아니에요/.test(six.why) && /도움이 되지만/.test(six.why), '아쉬운 점을 짚는 것도 토의에 도움이 된다');
  assert.match(q('K18-3').q, /도움말: 전라도 말의 '-것-'은 표준어 '-겠-'처럼/);
  assert.match(q('K17-1').q, /어울리지 않는 문장이 세 개/);
  assert.ok(!/너무 짧고/.test(q('K14-1').opts.map((o) => o.why || '').join(' ')), '"검색어는 길수록 좋다"로 읽히지 않게');
  const k18 = DATA.cards.find((c) => c.id === 'K18');
  assert.match(k18.facts.find((f) => f[0] === '알아 둘 것')[1], /사람마다 다르게/);
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
  assert.deepEqual(await korFinish('K999', {}, IDS), { ok: false, why: 'unknown' });
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
  assert.deepEqual(korFinishRule(p, 'K1', T0, {}, IDS), { ok: true, star: 1, coins: KOR_COINS[1], xp: 0, stone: 1, throws: 1, stars: 2, next: 3, days: 7 });
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
  assert.equal(withWords.length, DATA.cards.filter((c) => !c.listen).length, '글마다 낱말 풀이 (🎧 듣기 카드는 글이 안 보여서 없음 — v245)');
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
  assert.ok(body('async function finishCard() {').includes('res = await korFinish(r.card.id, r.misses, (ui.cards || []).map((c) => c.id), r.evMiss, { noStone: !!(r.ls && r.ls.text), qMiss, read: readLog(r) });'));
  assert.ok(body('function openCard(id) {').includes('order: shuffled(q.opts.length)'), '보기는 물음마다 섞는다');
  assert.ok(body('export async function enterKorean() {').includes("if (ui.read) {"), '🎒·📊에서 돌아오면 읽던 글 그대로');
  // Codex 48차: 틀린 까닭은 맞힌 뒤에 · 근거 실수 말은 부드럽게 · 읽어 주기 알림은 한 곳 · 초점 옮김 · 띠 높이만큼 띄움
  const rq = body('function renderQ() {');
  assert.ok(rq.includes('for (const w of wrongNotes(q, st.wrong)) {') && rq.indexOf('wrongNotes(q, st.wrong)') > rq.indexOf('if (qDone) {'), '틀린 보기의 까닭은 맞힌 뒤에만');
  assert.ok(rq.includes('if (live) live.textContent = say;') && rq.includes('if (focusTo) moveFocus(col,'));
  assert.ok(!rq.includes("setAttribute('role', 'status')"), '다시 그리는 칸에는 role=status를 새로 만들지 않는다');
  assert.ok(body('function evidenceEl(q, st, unit) {').includes('보다 답을 더 잘 받쳐 주는 ${unit}을 찾아볼까요?'));
  assert.ok(!src.includes('에는 까닭이 없어요'));
  assert.ok(body('function renderRead() {').includes("main.style.setProperty('--kor-top',") && body('function bringQ() {').includes('const top = col.getBoundingClientRect().top;') && body('function bringQ() {').includes("if (top < under + 4 || top > window.innerHeight - 96) col.scrollIntoView({ block: 'start' });"), '띠 아래까지 셈 · 🎧 화면 아래 밖이어도(Codex 57차)');
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
  assert.ok(src.includes('    r.evMiss += 1;') && src.includes('res = await korFinish(r.card.id, r.misses, (ui.cards || []).map((c) => c.id), r.evMiss, { noStone: !!(r.ls && r.ls.text), qMiss, read: readLog(r) });'), '근거 실수는 🟩 판정에만');
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

test('🔍 Codex 49차 원고·말: 좋은 근거를 다 받음(K7-3 ③~⑦ · K8-1·K8-2 ①~④ · K11-1 ⑦ 말고 다) · 낱말 "내" · K9-1 짐작 · K11 일반화 · K12-1 글만으로 · ★★ 뒤 남은 날 · "국어는"', async () => {
  const card = (id) => DATA.cards.find((c) => c.id === id);
  const q = (id) => DATA.cards.flatMap((c) => c.qs).find((x) => x.id === id);
  const okText = (id) => q(id).opts.find((o) => o.ok).t;
  assert.deepEqual(q('K7-3').ev, [3, 4, 5, 6, 7]);
  assert.match(q('K7-3').evNote, /④ 흰 말이 절을 하고, ⑤ 말이 하늘로 올라갔어요/, '말이 절한 것은 ④');
  assert.equal(card('K7').lines[3].includes('절을 하고'), true);
  assert.equal(q('K7-2').opts.find((o) => o.t.includes('생일')).type, 'make');
  assert.deepEqual([q('K8-1').ev, q('K8-2').ev], [[1, 2, 3, 4], [1, 2, 3, 4]], '2연도 1연과 같은 근거');
  assert.match(q('K8-3').doneNote, /되풀이에서 느껴지는 말의 리듬을 운율/);
  assert.deepEqual(card('K9').words.find((w) => w[0] === '내'), ['내', '시내보다 크고 강보다 작은 물줄기'], '국립국어원: 시내보다 크고 강보다 작다');
  assert.equal(okText('K9-1'), '익숙한 길에서도 늘 새로움을 느껴서');
  assert.match(q('K9-1').evNote, /짐작할 수 있어요/);
  assert.ok(!/날마다 달라/.test(JSON.stringify(q('K9-1'))), '시에 없는 "날마다 다르다"를 단정하지 않는다');
  assert.ok(!okText('K10-3').includes('빈틈없이'));
  assert.deepEqual(q('K11-1').ev, [1, 2, 3, 4, 5, 6, 8, 9], '견주는 문장은 다 — 자라만 말한 ⑦은 빼고');
  assert.match(card('K11').lines[4], /^많은 거북은 /, '거북 전체로 일반화하지 않는다');
  assert.ok(card('K11').words.some((w) => w[0] === '자라' && /거북 무리/.test(w[1])), '자라도 거북 무리');
  assert.ok(!JSON.stringify(card('K11')).includes('자라뿐'));
  assert.match(q('K12-1').q, /얼마나 클지 딱 잘라 약속하는 말/);
  assert.ok(q('K12-1').opts.every((o) => o.type !== 'fo'), '칼슘 말은 사실·의견 문제가 아니다');
  assert.ok(!JSON.stringify(q('K12-1')).includes('값을 깎아'), '"한 병 더"는 값을 깎는 말이 아니다');
  assert.ok(!JSON.stringify(q('K12-1')).includes('성분표'), '글에 없는 우유 갑 이야기를 하지 않는다');
  assert.deepEqual(checkContent(DATA), [], '원고 검사 통과');
  // ★★를 늦게 받으면 ★★★는 바로 다음 날 — 끝 카드 말이 "일주일"이라고 하지 않는다 (10/1 ★ · 10/11 ★★ → 10/12)
  const p = pf({ korDone: { 'K1:1': dayNum(at(-10)) } });
  const r = korFinishRule(p, 'K1', T0, {}, IDS);
  assert.deepEqual([r.star, r.next, r.days], [2, 3, 1]);
  const { finishText } = await import('../js/koreanview.js');
  assert.match(finishText(r).lines[1], /^내일 다시 읽으면 ★★★/);
  assert.match(finishText({ ok: true, star: 2, coins: 8, next: 3, days: 6 }).lines[1], /^6일 뒤 다시 읽으면 ★★★/);
  assert.match(finishText({ ok: true, star: 1, coins: 12, next: 2, days: 1 }).lines[1], /^내일 다시 읽으면 ★★/);
  // ⏳ "국어은"·"영어은" (영어는 예전부터)
  const tu = readFileSync(new URL('../js/timeup.js', import.meta.url), 'utf8');
  assert.ok(tu.includes('`⏳ 오늘 ${name}${topic} 여기까지!`') && !tu.includes('${name}은'));
  const { eunNeun } = await import('../js/timeup.js');
  assert.deepEqual(['🔢 수학', '🎤 영어', '📚 국어', ''].map(eunNeun), ['은', '는', '는', '는']);
});

test('⭐ 중학교 미리보기 (v244, 아버님 "이대로 진행"): 명작 넷 K32 「홍길동전」·K33 「양반전」(다시 씀) · K34 「하여가」·「단심가」·K35 「오우가」(『청구영언』·『산중신곡』 원문을 오늘 글자로) · pre 표시 · 도감 맨 뒤 · 저작권 해 · 물음 4·4·3·4', async () => {
  const card = (id) => DATA.cards.find((c) => c.id === id);
  const PREV = ['K32', 'K33', 'K34', 'K35'];
  assert.deepEqual(DATA.cards.filter((c) => c.pre).map((c) => c.id), [...PREV, 'K59', 'K60', 'K93', 'K96'], '미리보기는 이 넷 + v258 시조 「오백 년 도읍지를」·김소월 「진달래꽃」 + v281 윤동주 「서시」·이규보 「이옥설」');
  for (const id of PREV) assert.deepEqual([card(id).kind, card(id).pre], ['classic', '중학교'], id);
  assert.deepEqual(PREV.map((id) => card(id).qs.length), [4, 4, 3, 4]);
  // 원문 대조 — 시조는 옛 글자를 오늘 글자로만(위키문헌: 『청구영언』 216·8, 『산중신곡』 오우가 첫째·둘째 수)
  assert.deepEqual(card('K34').stanzas, [
    ['이런들 어떠하며 저런들 어떠하료', '만수산 드렁칡이 얽어진들 어떠하리', '우리도 이같이 얽어져 백 년까지 누리리라'],
    ['이 몸이 죽어 죽어 일백 번 고쳐 죽어', '백골이 진토 되어 넋이라도 있고 없고', '임 향한 일편단심이야 가실 줄이 있으랴'],
  ]);
  assert.deepEqual(card('K35').stanzas, [
    ['내 벗이 몇이나 하니 수석과 송죽이라', '동산에 달 오르니 그 더욱 반갑고야', '두어라 이 다섯 밖에 또 더하여 무엇하리'],
    ['구름 빛이 좋다 하나 검기를 자주 한다', '바람 소리 맑다 하나 그칠 적이 하노매라', '좋고도 그칠 뉘 없기는 물뿐인가 하노라'],
  ]);
  // 지은이·저작권 해(돌아가신 해) — 옛 소설은 번역문을 옮기지 않고 다시 쓴다(번역자 저작권)
  const year = (id) => Number(/(\d{4})년에 세상을 떠나/.exec(card(id).facts.find((f) => f[0] === '저작권')[1])[1]);
  assert.deepEqual(PREV.map(year), [1618, 1805, 1422, 1671]);
  assert.deepEqual(PREV.map((id) => card(id).author), ['허균(전해짐) · 신코치가 다시 씀', '박지원 · 신코치가 다시 씀', '이방원 · 정몽주', '윤선도']);
  for (const id of ['K32', 'K33']) assert.match(card(id).facts.find((f) => f[0] === '원문')[1], /신코치가 쉬운 말로 다시 썼어요 — 따옴표 안의 말도 신코치가 다시 쓴 말/, id);
  // 아이에게 맞게 — 원문의 해치는 장면(자객을 벤 일 · 잿물·상투)은 옮기지 않는다
  assert.ok(!/죽였|베었|잿물|상투/.test(JSON.stringify([card('K32').lines, card('K33').lines])));
  // 중학교 성취기준 — 2022 개정 국어과 교육과정([별책 5] 54쪽) 원문 그대로 · 학년은 확인된 것만(오우가 중1 지학사 1-1 · 양반전 주로 중2 · 홍길동전 학년 여럿)
  assert.deepEqual(PREV.map((id) => card(id).meta.find((m) => m.startsWith('중학교: '))), [
    '중학교: [9국05-02] 갈등의 진행과 해결 과정을 파악하며 작품을 감상한다.',
    '중학교: [9국05-05] 작품에 반영된 사회⋅문화적 상황을 이해하며 작품을 감상한다.',
    '중학교: [9국05-07] 연관성이 있는 다른 작품들과의 관계를 파악하며 작품을 감상한다.',
    '중학교: [9국05-01] 운율, 비유, 상징의 특성과 효과에 유의하며 작품을 감상하고 창작한다.',
  ]);
  assert.ok(!PREV.some((id) => JSON.stringify(card(id)).includes('중1')), '"중1"이라고 하지 않는다(작품마다 학년이 다르다) — 오우가의 "중학교 1학년"만');
  // ✍️ K32 — 틀은 빈자리를 끝에
  assert.deepEqual(card('K32').write.frames, ['내 생각에 길동이 겪은 일은 ~', '왜냐하면 ~', '~에서 그렇게 생각했어요.']);
  // pre 검사
  const bad = clone(card('K35'));
  bad.pre = '중1';
  assert.ok(checkCard(bad).some((m) => /pre\(미리보기\)는 중학교/.test(m)));
  // 화면 — 도감 맨 뒤에 따로(제목 한 줄) · 칸과 글 위 표시
  const src = readFileSync(new URL('../js/koreanview.js', import.meta.url), 'utf8');
  // v245: 묶음이 셋(보통 · 🎧 듣기 · ⭐ 미리보기) — 미리보기는 그대로 맨 뒤
  assert.ok(src.includes("const shown = [...cards.filter((c) => !groupOf(c)), ...cards.filter((c) => groupOf(c) === 'listen'), ...cards.filter((c) => groupOf(c) === 'pre')];"), '미리보기는 맨 뒤');
  assert.ok(src.includes('if (g && !(i && groupOf(shown[i - 1]) === g)) grid.appendChild(') && src.includes("g === 'pre' ? `${PRE[c.pre]} — 앞으로 국어 시간에 만날 작품을 미리 읽어요`"), '미리보기 앞에 제목 한 줄 한 번');
  const { groupOf } = await import('../js/koreanview.js');
  assert.deepEqual(['K1', 'K32', 'K36'].map((id) => groupOf(card(id))), ['', 'pre', 'listen']);
  assert.ok(src.includes("if (c.pre) b.appendChild(el('span', 'kor-slot-pre', PRE[c.pre]));") && src.includes("if (card.pre) top.appendChild(el('span', 'kor-pre-badge', PRE[card.pre]));"));
  const { PRE } = await import('../js/korean.js');
  assert.deepEqual(PRE, { '중학교': '⭐ 중학교 미리보기' });
});

test('🔍 Codex 56차 원고 (v244): K34 배경(새 나라 조선 ↔ 고려를 섬김) · K35 동산 = 동쪽에 있는 산(東山) · 틀린 보기 종류(K32-3 지어내기 · K33-2 지어내기 · K35-4 거꾸로) · 단정한 풀이 부드럽게 · 낱말·말 다듬기 · K32-4 근거 넓힘', () => {
  const card = (id) => DATA.cards.find((c) => c.id === id);
  const q = (id) => DATA.cards.flatMap((c) => c.qs).find((x) => x.id === id);
  const opt = (qid, t) => q(qid).opts.find((o) => o.t === t);
  const fact = (id, k) => card(id).facts.find((f) => f[0] === k)[1];
  const word = (id, w) => card(id).words.find((x) => x[0] === w)[1];
  // ④ K34-3은 배경 없이 풀 수 없었다 — 무엇을 바랐고 누구에게 마음을 지켰는지 · 전해지는 이야기임은 그대로
  assert.match(fact('K34', '만나는 곳'), /전해져요\. 이방원은 정몽주가 새 나라\(조선\)를 세우는 쪽에 함께하기를 바랐고, 정몽주는 끝까지 고려를 섬기려 했어요/);
  assert.match(q('K34-3').evNote, /임\(고려의 임금\)/);
  // ⑤ 東山 — 마을 가까운 동산이 아니다(📖 낱말 줄기에도 들어간다)
  assert.equal(word('K35', '동산'), '동쪽에 있는 산');
  assert.match(fact('K35', '원문'), /東山의 → 동산에/);
  // ⑩ 틀린 보기 종류는 실제 잘못대로
  assert.deepEqual([opt('K32-3', '짚으로 사람 일곱을 만들어 팔았다').type, opt('K33-2', '새벽에 일어나기가 싫어서').type, opt('K35-4', '벗을 더 많이 사귀고 싶다').type], ['make', 'make', 'flip']);
  assert.match(opt('K32-3', '짚으로 사람 일곱을 만들어 팔았다').why, /^팔았다는 말은 글에 없어요/);
  // ⑪ 한 장면은 한 장면으로 · 첫 번째 증서는 "겉치레만"이 아니다
  assert.equal(opt('K32-4', '산속의 도적 무리').type, 'detail');
  assert.ok(!/맞선 것이 아니라/.test(opt('K32-4', '산속의 도적 무리').why) && !/맞선 것이 아니에요\.$/.test(opt('K32-4', '아무도 들지 못하던 무거운 돌').why));
  assert.ok(!q('K33-4').doneNote.includes('겉치레만 가득') && q('K33-4').doneNote.includes('생활에 도움이 되기보다 지켜야 할 형식과 규칙이 많고'));
  // ⑫ 낱말·말
  assert.equal(word('K34', '가실'), "여기서는 '변하거나 사라질'이라는 뜻의 옛말");
  assert.match(fact('K35', '원문'), /반갑고야는 '반갑구나'/);
  assert.match(fact('K34', '원문'), /塵土ㅣ 되여 → 진토 되어/);
  assert.ok(card('K32').lines[3].startsWith('어느 가을밤,'));
  assert.deepEqual(q('K32-4').ev, [2, 3, 4, 5, 8, 11]);
});
