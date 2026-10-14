// 🀄 v255 (2026-10-14, 아버님 "2단계 진행하자") — 🔤 새 낱말 50(🗣️ 관용 표현 15 · 🐢 속담 15 · 🀄 사자성어 20 새 묶음) · 🧩 퍼즐 8
//  뜻·표제어는 표준국어대사전으로 확인 — 사자성어는 표제어(한자 포함) · 관용구·속담은 머리 낱말 아래 표제
//  ("입이 귀에 걸리다"·"손이 많이 가다"·"바람을 맞다"는 표제가 없어 사전 꼴·다른 말로 · "열 번 찍어 …"는 사전 뜻이 '여러 번 권하면 마음이 바뀐다')
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DECKS, DECK_ORDER, NEW_PER_DAY, allWords, checkWords, makeQuestion, planToday, deckStats, korWordsRule } from '../js/korwords.js';
import { allPuzzles, checkPuzzles, validOrders, isOpen, OPINION_WORDS, SORT_BANNED } from '../js/korpuzzle.js';
import { validCards, dayNum } from '../js/korean.js';
import { korReportText } from '../js/korreport.js';
import { emptyProfile, cloneProfile } from '../js/db.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const WORDS = JSON.parse(read('coach/korean/words.json'));
const CARDS = validCards(JSON.parse(read('coach/korean/reading.json')));
const PDATA = JSON.parse(read('coach/korean/puzzles.json'));
const ALL = allWords(WORDS, CARDS);
const PUZ = allPuzzles(PDATA, CARDS);
const T0 = new Date(2026, 9, 14, 12, 0, 0).getTime();
const rng = (seed) => { let s = seed >>> 0 || 1; return () => { s = (s * 1103515245 + 12345) >>> 0; return (s >>> 8) / 16777216; }; };
const word = (w) => ALL.find((x) => x.w === w);
const KID = String.fromCharCode(0xC9C4, 0xC6B0);

/** 표준국어대사전 표제어의 한자 (2026-10-14 확인) */
const HAN = {
  일석이조: '一石二鳥', 작심삼일: '作心三日', 동문서답: '東問西答', 우왕좌왕: '右往左往', 자업자득: '自業自得',
  이심전심: '以心傳心', 유비무환: '有備無患', 십중팔구: '十中八九', 어부지리: '漁夫之利', 대기만성: '大器晩成',
  죽마고우: '竹馬故友', 금시초문: '今始初聞', 일취월장: '日就月將', 오리무중: '五里霧中', 마이동풍: '馬耳東風',
  고진감래: '苦盡甘來', 전화위복: '轉禍爲福', 청출어람: '靑出於藍', 칠전팔기: '七顚八起', 박장대소: '拍掌大笑',
};
const NEW_IDIOM = ['입이 귀밑까지 찢어지다', '눈 깜짝할 사이', '눈앞이 캄캄하다', '이를 악물다', '손에 익다', '눈독을 들이다', '엉덩이가 무겁다',
  '머리를 굴리다', '눈살을 찌푸리다', '무릎을 치다', '파김치가 되다', '얼굴이 두껍다', '귀가 번쩍 뜨이다', '발을 구르다', '눈에 밟히다'];
const NEW_PROVERB = ['가는 날이 장날', '공든 탑이 무너지랴', '구슬이 서 말이라도 꿰어야 보배', '될성부른 나무는 떡잎부터 알아본다', '말 한마디에 천 냥 빚도 갚는다',
  '바늘 도둑이 소도둑 된다', '사공이 많으면 배가 산으로 간다', '서당 개 삼 년에 풍월을 읊는다', '쇠뿔도 단김에 빼라', '열 번 찍어 아니 넘어가는 나무 없다',
  '호랑이도 제 말 하면 온다', '지렁이도 밟으면 꿈틀한다', '금강산도 식후경', '작은 고추가 더 맵다', '꿩 대신 닭'];

test('🀄 사자성어 묶음 (v255): 이럴 때(sit) · 저장 키 h: · 📖 앞에 번갈아 · 스무 개 모두 표준국어대사전의 한자 · 한글 넉 자 · 글자 뜻 · 상황 글에 말도 한자도 없음', () => {
  assert.deepEqual(DECKS.saja, { icon: '🀄', ko: '사자성어', prefix: 'h', sit: true, ask: '이럴 때 어울리는 사자성어는 무엇인가요?' });
  assert.deepEqual(DECK_ORDER, ['concept', 'idiom', 'proverb', 'saja', 'passage']);
  assert.deepEqual(checkWords(WORDS, CARDS), []);
  const sj = ALL.filter((w) => w.deck === 'saja');
  assert.deepEqual(Object.fromEntries(sj.map((w) => [w.w, w.han])), HAN, '표준국어대사전 표제어의 한자 그대로');
  for (const w of sj) {
    assert.equal(w.id, `h:${w.w}`);
    assert.match(w.w, /^[가-힣]{4}$/);
    assert.ok(w.lit && w.lit.length <= 60, `${w.w}: 글자 뜻`);
    assert.ok(!w.unit, `${w.w}: 단원에 잇지 않는다`);
    assert.ok(w.ex && !w.ex.includes(w.w) && !w.ex.includes(w.han) && !w.ex.includes('___'), `${w.w}: 상황 글`);
    assert.ok(!w.mean.includes(w.w), w.w);
    assert.equal(makeQuestion(w, 'use', ALL, rng(3)).prompt, '이럴 때 어울리는 사자성어는 무엇인가요?');
    assert.equal(makeQuestion(w, 'mean', ALL, rng(3)).prompt, `'${w.w}'의 뜻으로 알맞은 것은 무엇인가요?`);
    for (const k of [1, 2, 3]) assert.ok(makeQuestion(w, 'use', ALL, rng(k)).opts.every((o) => ALL.find((x) => x.id === o.id).deck === 'saja'), '보기는 사자성어끼리');
  }
  assert.deepEqual(deckStats(ALL, {}, {}).find((s) => s.deck === 'saja'), { deck: 'saja', total: 20, open: 20, learning: 0, mastered: 0 });
  // 다른 묶음에는 한자·글자 뜻이 없다
  assert.ok(ALL.filter((w) => w.deck !== 'saja').every((w) => w.han === undefined && w.lit === undefined));
});

test('🀄 원고 검사가 잡는 것 (v255): 넉 자 아님 · 한자 아님·넉 자 아님·없음 · 상황 글에 한자 · 글자 뜻 없음·너무 김 · 다른 묶음의 han·lit · 꼴이 틀린 한자는 화면에 안 넘김', () => {
  const bad = (edit, re) => {
    const d = JSON.parse(JSON.stringify(WORDS));
    edit(d.words.find((x) => x.w === '일석이조'), d.words);
    const errs = checkWords(d, CARDS);
    assert.ok(errs.some((e) => re.test(e)), `${re} — ${errs.join(' / ')}`);
  };
  bad((x) => { x.w = '일석이'; x.han = '一石二'; }, /한글 넉 자/);
  bad((x) => { x.w = '一石二鳥'; }, /한글 넉 자/);
  bad((x) => { delete x.han; }, /han은 한자 넉 자/);
  bad((x) => { x.han = '一石二'; }, /han은 한자 넉 자/);
  bad((x) => { x.han = '일석이조'; }, /han은 한자 넉 자/);
  bad((x) => { x.ex = '一石二鳥처럼 운동도 하고 빵도 샀어요.'; }, /한자가 그대로/);
  bad((x) => { x.lit = ' '; }, /lit\(글자 뜻\)이 비었어요/);
  bad((x) => { x.lit = '가'.repeat(61); }, /lit은 60자까지/);
  bad((x, ws) => { ws.find((y) => y.w === '발이 넓다').han = '足廣'; }, /han·lit은 사자성어에만/);
  bad((x, ws) => { ws.find((y) => y.w === '꿩 대신 닭').lit = '꿩 대신에 닭'; }, /han·lit은 사자성어에만/);
  bad((x) => { x.ex = '오늘은 일석이조였어요.'; }, /그대로 나와요/);
  // 꼴이 틀린 한자·빈 글자 뜻은 화면(풀이)에 넘기지 않는다 — 낱말은 그대로 쓴다
  for (const edit of [(x) => { x.han = '一石二'; }, (x) => { x.lit = ''; }, (x) => { x.han = 7; }]) {
    const d = JSON.parse(JSON.stringify(WORDS));
    edit(d.words.find((x) => x.w === '일석이조'));
    const w = allWords(d, CARDS).find((y) => y.w === '일석이조');
    assert.ok(w && w.han === undefined && w.lit === undefined);
  }
});

test('🀄 화면 (v255): 답을 고른 뒤 풀이에 한자와 글자 뜻 · 첫 화면 소개에 속담·사자성어', () => {
  const kt = read('js/kortabs.js');
  assert.ok(kt.includes("if (w.han && w.lit) note.appendChild(el('p', 'kor-note-ex kor-note-han', `🀄 ${w.han} — 글자 뜻: ${w.lit}`));"));
  const fn = kt.slice(kt.indexOf('function noteEl(w) {'), kt.indexOf('\n}\n', kt.indexOf('function noteEl(w) {')));
  assert.ok(fn.includes('w.han'), '풀이(noteEl) 안에서만 — 묻는 화면에는 한자를 안 보인다');
  assert.equal(kt.split('\n').filter((l) => l.includes('w.han')).length, 1, '한자를 쓰는 줄은 풀이 한 줄뿐');
  assert.ok(kt.includes('국어 시간에 쓰는 말, 관용 표현, 속담, 사자성어, 글에서 만난 낱말을 익혀요.'));
});

test('🗣️·🐢 새 낱말 (v255): 관용 표현 15 · 속담 15 — 표준국어대사전 표제 꼴 · 사전 뜻을 거스르지 않음', () => {
  const idioms = ALL.filter((w) => w.deck === 'idiom').map((w) => w.w);
  const proverbs = ALL.filter((w) => w.deck === 'proverb').map((w) => w.w);
  assert.deepEqual(idioms.slice(40), NEW_IDIOM);
  assert.deepEqual(proverbs.slice(20), NEW_PROVERB);
  for (const w of [...NEW_IDIOM, ...NEW_PROVERB]) assert.ok(!word(w).unit, `${w}: 단원에 잇지 않는다`);
  // 사전에 표제가 없는 꼴은 안 쓴다
  for (const w of ['입이 귀에 걸리다', '손이 많이 가다', '바람을 맞다', '어깨를 나란히 하다']) assert.ok(!word(w), w);
  // 사전 뜻 (Codex 49차 "내"처럼 거꾸로 쓰지 않게)
  assert.match(word('열 번 찍어 아니 넘어가는 나무 없다').mean, /여러 번 권하고 달래면 마음이 바뀜/);
  assert.match(word('호랑이도 제 말 하면 온다').mean, /마침 그 사람이 나타남/);
  assert.match(word('사공이 많으면 배가 산으로 간다').mean, /제 주장만 내세우면/);
  assert.match(word('무릎을 치다').mean, /깨닫거나/);
  assert.match(word('엉덩이가 무겁다').mean, /좀처럼 일어나지 않다/);
  assert.match(word('발을 구르다').mean, /안타까워하거나 다급해하다/);
  // Codex 67차: 금시초문은 '처음 들음' — 잊어버린 것과 갈리지 않게
  assert.ok(word('금시초문').ex.includes('한 번도 들어 본 적이 없었') && !word('금시초문').ex.includes('언제 그런 말씀을'));
  for (const w of ALL.filter((x) => x.deck === 'idiom' || x.deck === 'proverb')) assert.ok(!w.ex.includes(KID) && !w.mean.includes(KID));
});

// 옛 상황 글이 새 낱말에도 어울리는 짝 — 빈칸 채우기(이럴 때)에서 서로의 보기로 안 나와야 답이 하나다
const MUST_PAIR = [
  ['입이 귀밑까지 찢어지다', '눈에 넣어도 아프지 않다'], ['입이 귀밑까지 찢어지다', '배꼽을 잡다'], ['눈 깜짝할 사이', '쥐도 새도 모르게'],
  ['눈앞이 캄캄하다', '발등에 불이 떨어지다'], ['눈앞이 캄캄하다', '가슴이 뜨끔하다'], ['눈앞이 캄캄하다', '간이 콩알만 해지다'], ['발을 구르다', '발등에 불이 떨어지다'],
  ['파김치가 되다', '눈을 붙이다'], ['파김치가 되다', '눈코 뜰 새 없다'], ['파김치가 되다', '엉덩이가 무겁다'], ['얼굴이 두껍다', '시치미를 떼다'], ['얼굴이 두껍다', '간이 크다'],
  ['눈독을 들이다', '배가 아프다'], ['무릎을 치다', '혀를 내두르다'], ['무릎을 치다', '머리를 굴리다'], ['귀가 번쩍 뜨이다', '귀를 기울이다'], ['머리를 굴리다', '머리를 맞대다'],
  ['공든 탑이 무너지랴', '콩 심은 데 콩 나고 팥 심은 데 팥 난다'], ['공든 탑이 무너지랴', '티끌 모아 태산'], ['꿩 대신 닭', '가는 날이 장날'],
  ['호랑이도 제 말 하면 온다', '낮말은 새가 듣고 밤말은 쥐가 듣는다'], ['호랑이도 제 말 하면 온다', '가는 날이 장날'], ['말 한마디에 천 냥 빚도 갚는다', '가는 말이 고와야 오는 말이 곱다'],
  ['바늘 도둑이 소도둑 된다', '세 살 버릇 여든까지 간다'], ['쇠뿔도 단김에 빼라', '천 리 길도 한 걸음부터'], ['사공이 많으면 배가 산으로 간다', '백지장도 맞들면 낫다'],
  ['어부지리', '일석이조'], ['고진감래', '전화위복'], ['고진감래', '칠전팔기'], ['대기만성', '일취월장'], ['청출어람', '일취월장'], ['우왕좌왕', '오리무중'], ['금시초문', '오리무중'], ['동문서답', '마이동풍'],
];

test('🔤 짝 (v255): 상황 글이 둘 다에 어울릴 수 있는 낱말은 이럴 때 물음에서 서로의 보기로 안 나온다(어느 쪽에서 물어도) · 뜻 고르기에는 일부러 같이', () => {
  for (const [a, b] of MUST_PAIR) {
    const A = word(a);
    const B = word(b);
    assert.ok(A && B && A.deck === B.deck, `${a} · ${b}`);
    assert.ok(A.pair.includes(b) || B.pair.includes(a), `${a} ↔ ${b} 짝`);
    for (let s = 1; s <= 60; s++) {
      assert.ok(!makeQuestion(A, 'use', ALL, rng(s)).opts.some((o) => o.t === b), `${a}의 이럴 때 보기에 ${b}`);
      assert.ok(!makeQuestion(B, 'use', ALL, rng(s)).opts.some((o) => o.t === a), `${b}의 이럴 때 보기에 ${a}`);
    }
  }
  // 뜻 고르기 — 짝이 먼저 보기로(헷갈리는 짝을 견주게)
  const q = makeQuestion(word('어부지리'), 'mean', ALL, rng(7));
  assert.ok(q.opts.some((o) => o.t === word('일석이조').mean));
});

test('🔤 오늘의 낱말 (v255): 처음엔 📘 → 🗣️ → 🐢 → 🀄 → 📘 번갈아 · 🀄 낱말도 칸이 옮겨진다', () => {
  const plan = planToday(ALL, {}, {}, T0);
  assert.equal(plan.length, NEW_PER_DAY);
  assert.deepEqual(plan.map((p) => ALL.find((w) => w.id === p.id).deck), ['concept', 'idiom', 'proverb', 'saja', 'concept']);
  assert.equal(plan[3].id, 'h:일석이조', '🀄 첫 낱말');
  const p = cloneProfile({ ...emptyProfile(), coins: 0 });
  const r = korWordsRule(p, plan.map((x) => ({ id: x.id, ok: true, from: 0 })), T0, ALL.map((w) => w.id));
  assert.ok(r.ok);
  assert.deepEqual(p.korWords['h:일석이조'] && [p.korWords['h:일석이조'].box, p.korWords['h:일석이조'].d0], [1, dayNum(T0)]);
});

test('🧩 새 퍼즐 8 (v255): 차례 맞추기 넷은 v254 새 글(도자기 체험·가짜 동영상·생일 쪽지·흥부와 놀부)에 ★이 있어야 열림 · 차례는 하나뿐 · 가르기 넷(개구리·우리 악기·도자기·제비) 사실 셋·의견 둘', () => {
  assert.deepEqual(checkPuzzles(PDATA, CARDS), []);
  const orders = ['O17', 'O18', 'O19', 'O20'].map((id) => PUZ.find((p) => p.id === id));
  assert.deepEqual(orders.map((p) => [p.card, p.ask, p.chunks.length]), [['K42', 'event', 5], ['K46', 'event', 5], ['K49', 'event', 5], ['K53', 'event', 5]]);
  for (const p of orders) {
    assert.equal(p.title, CARDS.find((c) => c.id === p.card).title);
    assert.deepEqual(validOrders(p.chunks.length, p.need), [[0, 1, 2, 3, 4]], `${p.id}: 맞는 차례는 원고 차례 하나`);
    assert.ok(!isOpen(p, {}) && isOpen(p, { [`${p.card}:1`]: dayNum(T0) }), `${p.id}: 그 글에 ★이 있어야`);
  }
  const sorts = ['F11', 'F12', 'F13', 'F14'].map((id) => PUZ.find((p) => p.id === id));
  assert.deepEqual(sorts.map((p) => `${p.icon}${p.title}`), ['🐸개구리', '🥁우리 악기', '🏺도자기', '🐦제비'], '쓸 수 있는 퍼즐에서는 topic이 title로');
  for (const p of sorts) {
    assert.deepEqual([p.sents.filter((s) => s.fo === 'fact').length, p.sents.filter((s) => s.fo === 'opinion').length], [3, 2], p.id);
    for (const s of p.sents) {
      assert.equal(OPINION_WORDS.test(s.t), s.fo === 'opinion', `${p.id}: ${s.t}`);
      assert.ok(!SORT_BANNED.test(s.t), s.t);
    }
  }
  // 사실은 자료로 확인할 수 있게 — 「개구리는 겨울에 어디에 있을까」(K43)처럼 "많은 개구리는" · 가마는 잴 수 있는 온도로
  assert.ok(sorts[0].sents.some((s) => s.t.startsWith('많은 개구리는 추운 겨울이 되면')));
  // Codex 67차: 올챙이 없이 깨어나는 종도 있다 → "많은 개구리는" · 초벌구이는 700~800도쯤 → "종류에 따라 … 굽기도 한다"
  assert.ok(sorts[0].sents.some((s) => s.t === '많은 개구리는 알에서 깨어나 올챙이 시기를 거친다.'));
  assert.ok(!sorts[0].sents.some((s) => /^개구리는/.test(s.t)), '모든 개구리로 넓히지 않는다');
  assert.ok(sorts[2].sents.some((s) => s.fo === 'fact' && s.t === '도자기는 종류에 따라 1000도가 넘는 온도에서 굽기도 한다.'));
  assert.ok(!read('coach/korean/puzzles.json').includes(KID) && !read('coach/korean/words.json').includes(KID), '아이 이름 없이');
});

test('📤 국어 요약 (v255): 🀄 사자성어 줄이 낱말 칸에 · 퍼즐 수도 새 원고로', () => {
  const t = korReportText({}, { cards: CARDS, words: ALL, puzzles: PUZ }, '2026-10-14', []);
  assert.ok(t.includes('- 🀄 사자성어: 배우는 중 0 · ⭐ 0 · 열린 20 / 전체 20\n'));
  assert.ok(t.includes('- 🐢 속담: 배우는 중 0 · ⭐ 0 · 열린 35 / 전체 35\n'));
  assert.match(t, /- ⚖️ 사실·의견 가르기: ⭐ 0 · 풀어 봤지만 아직 ⭐ 아님 0 · 열린 14 \/ 전체 14/);
  const sw = read('sw.js');
  assert.ok(+(/const CACHE_VERSION = 'v(\d+)';/.exec(sw) || [])[1] >= 255, 'sw v255 이상 — 새 원고를 받게');
});
