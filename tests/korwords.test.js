// 🔤 국어 낱말 줄기 + 📘 단원 지도 (v234, 2026-10-11 아버님 "니 제안대로 하자")
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  DECKS, NEW_PER_DAY, SESSION_MAX, WORD_COINS, PERFECT_MIN, MASTER_BOX, DUE_AFTER,
  followOk, wordId, passageWords, allWords, isOpen, stateOf, wordsOf, mergeWords, wordDaysOf, mergeWordDays, wordsToday,
  planToday, makeQuestion, korWordsRule, deckStats, checkWords,
} from '../js/korwords.js';
import { unitsOf, unitLabel, unitProgress, checkUnits } from '../js/korunits.js';
import { dayNum } from '../js/korean.js';
import { emptyProfile, cloneProfile, mergeStatRecord, applyHouseRule } from '../js/db.js';
import { initProfile, flushProfile, reloadProfile, korWordsFinish, korWordsMap, korWordDayMap, korThrowsLeft } from '../js/xp.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const WORDS = JSON.parse(read('coach/korean/words.json'));
const UNITS = JSON.parse(read('coach/korean/units.json'));
const CARDS = JSON.parse(read('coach/korean/reading.json')).cards;
const ALL = allWords(WORDS, CARDS);
const IDS = ALL.map((w) => w.id);
const T0 = new Date(2026, 9, 11, 12, 0, 0).getTime();
const at = (days, h = 12) => new Date(2026, 9, 11 + days, h, 0, 0).getTime();
const D0 = dayNum(T0);
const pf = (o = {}) => cloneProfile({ ...emptyProfile(), ...o });
const rng = (seed) => { let s = seed >>> 0 || 1; return () => { s = (s * 1103515245 + 12345) >>> 0; return (s >>> 8) / 16777216; }; };

test('🔤 원고: 검사 통과 · 📘 51 · 🗣️ 55 · 🐢 35 · 🀄 20(v255 — 관용 15 · 속담 15 · 사자성어 20 더함) · 📖 244(글의 낱말 — v241 새 글 열둘의 29 · v244 ⭐ 중학교 미리보기 넷의 24 · v254 새 글 열둘의 35 · v258 시 일곱의 35 · v261 새 글 열둘의 46 · v265 신문 글 여섯의 36 · v267 단원 채우기 여섯의 31 더함) · 📖은 뜻 고르기만(ex 없음, 나온 문장은 src) · 📘 빈칸 하나 · 🗣️·🐢·🀄 상황 글 · 📘 단원 검사 통과', () => {
  assert.deepEqual(checkWords(WORDS, CARDS), []);
  assert.deepEqual(checkUnits(UNITS, CARDS, WORDS), []);
  const by = {};
  for (const w of ALL) by[w.deck] = (by[w.deck] || 0) + 1;
  assert.deepEqual(by, { concept: 51, idiom: 55, proverb: 35, saja: 20, passage: 275 }, 'v258 시 일곱의 낱말 35 · v261 새 글 열둘의 46 · v265 신문 글 여섯의 36 · v267 단원 채우기 여섯의 31 더함');
  for (const w of ALL.filter((x) => x.deck === 'passage')) {
    assert.equal(w.ex, '', `${w.w}: 📖은 빈칸 문제 없음 — 다른 글의 낱말이 빈칸에 같이 들어갈 수 있다`);
    assert.ok(w.src.includes(w.w), `${w.w}: 나온 글 문장`);
    assert.equal(w.id, wordId('passage', w.w, w.card));
  }
  for (const w of ALL.filter((x) => x.deck === 'concept')) { assert.equal(w.ex.split('___').length, 2); assert.ok(followOk(w.ex), w.w); }
  for (const w of ALL.filter((x) => DECKS[x.deck].sit)) assert.ok(w.ex && !w.ex.includes('___') && !w.ex.includes(w.w), w.w);
  assert.equal(new Set(IDS).size, IDS.length, 'id 겹침 없음');
  // 국립국어원 풀이를 거스르지 않는 몇 개 (Codex 49차 "내"처럼 거꾸로 쓰지 않게)
  const mean = (w) => ALL.find((x) => x.w === w).mean;
  assert.ok(/처럼/.test(mean('직유')) && /써서/.test(mean('직유')) && !/없이/.test(mean('직유')), '직유 = 처럼·같이를 써서');
  assert.ok(/없이/.test(mean('은유')), '은유 = 처럼·같이 없이');
  assert.match(mean('비교'), /같은 점/);
  assert.match(mean('대조'), /다른 점/);
  assert.ok(/설명하는 방법에서/.test(mean('비교')) && /설명하는 방법에서/.test(mean('대조')), '비교·대조는 설명 방법으로 — 사전의 비교(같은 점·다른 점)보다 좁은 교과서 쓰임 (Codex 50차 #3)');
  assert.match(mean('서술어'), /어찌하다.*어떠하다.*무엇이다/, '서술어 세 꼴');
  assert.ok(/지역/.test(mean('방언')) && !/지역에서만/.test(mean('방언')), '방언은 그 지역"만"이 아니다');
  assert.match(mean('인물'), /사물/, '사람처럼 그려진 사물도 인물');
  assert.match(mean('입에 침이 마르다'), /자랑/);
});

test('🔤 원고 검사가 잡는 것: 묶음 · 빈 낱말 · 뜻에 그 낱말 · 빈칸 수 · 빈칸 뒤 받침 조사 · 빈칸 밖에 그 낱말 · 🗣️ 빈칸·표현 그대로 · 짝이 없는 낱말 · 같은 낱말·뜻 · 4개 미만', () => {
  const base = () => JSON.parse(JSON.stringify(WORDS));
  const bad = (edit, re) => { const d = base(); edit(d.words); const errs = checkWords(d, CARDS); assert.ok(errs.some((e) => re.test(e)), `${re} — ${errs.join(' / ')}`); };
  const c = (w) => (ws) => ws.find((x) => x.w === w);
  bad((ws) => { c('비유')(ws).deck = 'passage'; }, /deck은/);
  bad((ws) => { c('비유')(ws).w = ' '; }, /낱말이 비었어요/);
  bad((ws) => { c('요약')(ws).mean = '글을 요약하는 것'; }, /뜻에 그 낱말/);
  bad((ws) => { c('요약')(ws).ex = '중요한 내용만 간추려요.'; }, /빈칸\(___\)이 하나/);
  bad((ws) => { c('요약')(ws).ex = '___ ___'; }, /빈칸\(___\)이 하나/);
  bad((ws) => { c('근거')(ws).ex = '알맞은 ___를 들어요.'; }, /조사가 있으면/);
  bad((ws) => { c('근거')(ws).ex = '주장에는 ___이 있어야 해요.'; }, /조사가 있으면/);
  bad((ws) => { c('요약')(ws).ex = '요약은 ___해요.'; }, /빈칸 밖에/);
  bad((ws) => { c('발이 넓다')(ws).ex = '이모는 ___.'; }, /빈칸 없이/);
  bad((ws) => { c('발이 넓다')(ws).ex = '이모는 발이 넓다.'; }, /그대로 나와요/);
  bad((ws) => { c('직유')(ws).pair = ['비유법']; }, /같은 묶음에 없어요/);
  bad((ws) => { c('직유')(ws).w = '은유'; }, /같은 낱말 두 번/);
  bad((ws) => { c('직유')(ws).mean = c('은유')(ws).mean; }, /같은 뜻 두 번/);
  const few = { words: WORDS.words.filter((x) => x.deck === 'concept').slice(0, 3) };
  assert.ok(checkWords(few, []).some((e) => /4개 이상/.test(e)));
  assert.equal(followOk('뜻을 ___에 맞게'), true);
  assert.equal(followOk('___으로 가요'), false);
  assert.equal(followOk('___예요'), false);
  assert.equal(followOk('빈칸 없음'), false);
});

test('🔤 문제: 보기 넷·정답 하나·겹침 없음 · 뜻 고르기는 헷갈리는 짝을 먼저 · 빈칸은 짝을 빼고 · 넓은 말·좁은 말(avoid)은 어디에도 같이 안 — 모든 낱말 × 씨앗 200', () => {
  const byW = new Map(ALL.map((w) => [w.w + '|' + w.deck, w]));
  let pairSeen = 0;
  for (const w of ALL) {
    for (const kind of ['mean', 'use']) {
      for (let s = 1; s <= 200; s++) {
        const q = makeQuestion(w, kind, ALL, rng(s));
        assert.ok(q, `${w.w} ${kind}`);
        assert.equal(q.opts.length, 4);
        assert.equal(q.opts.filter((o) => o.ok).length, 1);
        assert.equal(new Set(q.opts.map((o) => o.t)).size, 4, `${w.w}: 보기 글이 겹치지 않는다`);
        const right = q.opts.find((o) => o.ok);
        if (q.kind === 'mean') assert.equal(right.t, w.mean); else assert.equal(right.t, w.w);
        if (kind === 'use' && !w.ex) assert.equal(q.kind, 'mean', '쓰임 문장이 없으면 뜻 고르기');
        for (const o of q.opts.filter((x) => !x.ok)) {
          const x = ALL.find((y) => y.id === o.id);
          assert.equal(x.deck, w.deck, '보기는 같은 묶음');
          const avoid = (w.avoid || []).includes(x.w) || (x.avoid || []).includes(w.w);
          assert.ok(!avoid, `${w.w} × ${x.w}: 넓은 말·좁은 말은 같이 안 낸다`);
          const pair = (w.pair || []).includes(x.w) || (x.pair || []).includes(w.w);
          if (q.kind === 'use') assert.ok(!pair, `${w.w} × ${x.w}: 빈칸에 둘 다 들어갈 수 있는 짝은 빼고`);
          if (pair) pairSeen++;
        }
      }
    }
    // 뜻 고르기 — 짝이 있으면 언제나 보기에 (헷갈리는 것을 일부러 같이)
    const pairs = ALL.filter((x) => x.deck === w.deck && ((w.pair || []).includes(x.w) || (x.pair || []).includes(w.w)));
    if (pairs.length) {
      const q = makeQuestion(w, 'mean', ALL, rng(7));
      for (const x of pairs.slice(0, 3)) assert.ok(q.opts.some((o) => o.id === x.id), `${w.w}: 짝 ${x.w}가 뜻 고르기 보기에`);
    }
  }
  assert.ok(pairSeen > 0);
  assert.ok(byW.size > 0);
  assert.equal(makeQuestion(null, 'mean', ALL), null);
  assert.equal(makeQuestion(ALL[0], 'mean', ALL.slice(0, 2)), null, '보기가 모자라면 null');
  const q = makeQuestion(ALL.find((w) => w.w === '발이 넓다'), 'use', ALL, rng(3));
  assert.equal(q.prompt, '이럴 때 어울리는 관용 표현은 무엇인가요?');
  assert.equal(makeQuestion(ALL.find((w) => w.w === '요약'), 'use', ALL, rng(3)).prompt, '빈칸에 들어갈 알맞은 말은 무엇인가요?');
});

test('🔤 문장마다 같이 들어갈 수 있는 말은 보기에 없다 — 문장을 따로 읽어 만든 표(원고 pair·avoid를 베끼지 않음) · 넓은 말·좁은 말은 뜻 고르기에도 같이 안', () => {
  // 그 낱말의 빈칸 문장(📘)·상황 글(🗣️)에 함께 들어가 말이 되는 낱말 — 보기에 나오면 답이 둘이 된다
  const USE = {
    근거: ['의견', '사실', '주장', '뒷받침 문장'], 주장: ['주제', '중심 생각', '의견', '근거'], 의견: ['감상', '사실', '주장'], 사실: ['견문', '의견'],
    '중심 생각': ['주제', '요약', '중심 문장'], 주제: ['중심 생각', '감상'], 인물: ['말하는 이', '사건', '배경'], 견문: ['여정', '감상'],
    매체: ['출처'], 출처: ['매체', '신뢰성', '근거', '검색어'], 신뢰성: ['출처', '타당성'], 조정: ['요약', '토의'], 짐작: ['추론'], 추론: ['짐작'],
    비유: ['직유', '은유'], 직유: ['은유', '비유'], 은유: ['직유', '비유'], 토의: ['토론'], 토론: ['토의'], 표준어: ['방언'], 방언: ['표준어'],
    주어: ['서술어', '목적어'], 서술어: ['주어', '목적어'], 비교: ['대조'], 대조: ['비교'], 여정: ['견문'],
    // v241 새 📘 — "때를 알려 주는 ___ 덕분에" · "___ 하나만 바꿔도" · "___ 하나를 찾아 밑줄" · "풀어 주는 ___ 여러 개" · "고르는 ___부터" ·
    //   "짐작하게 하는 ___ 구실" · "근거의 ___부터" · "4___짜리"/"2___짜리"
    '시간 표현': ['단서', '배경'], 검색어: ['기준', '출처'], 인용: ['예시'], '중심 문장': ['중심 생각', '주제'], '뒷받침 문장': ['예시', '근거'],
    기준: ['근거', '주제'], 목적어: ['주어', '서술어'], 단서: ['근거'], 타당성: ['신뢰성', '출처'], 행: ['연'], 연: ['행'],
    '입이 무겁다': ['입이 가볍다'], '입이 가볍다': ['입이 무겁다'], '손을 떼다': ['발을 빼다'], '발을 빼다': ['손을 떼다'],
    '가슴이 뜨끔하다': ['간이 콩알만 해지다', '시치미를 떼다'], '간이 콩알만 해지다': ['가슴이 뜨끔하다', '손에 땀을 쥐다'], '손에 땀을 쥐다': ['간이 콩알만 해지다'],
    '코가 납작해지다': ['꼬리를 내리다'], '꼬리를 내리다': ['코가 납작해지다'], '머리를 맞대다': ['손발이 맞다'], '손발이 맞다': ['머리를 맞대다', '발 벗고 나서다'],
    '발 벗고 나서다': ['손발이 맞다'], '귀가 얇다': ['귀를 기울이다'], '귀를 기울이다': ['귀가 얇다'],
    // v241 새 🗣️ — 상황 글마다 따로 읽음 (바쁨·급함 · 칭찬·귀여움 · 건성·지겨움 · 한목소리·의논 · 몰래·모르는 척)
    '발등에 불이 떨어지다': ['눈코 뜰 새 없다'], '눈코 뜰 새 없다': ['발등에 불이 떨어지다'],
    '눈에 넣어도 아프지 않다': ['입에 침이 마르다'], '입에 침이 마르다': ['눈에 넣어도 아프지 않다'],
    '한 귀로 듣고 한 귀로 흘리다': ['귀가 따갑다'], '귀가 따갑다': ['한 귀로 듣고 한 귀로 흘리다'],
    '입을 모으다': ['머리를 맞대다'], '쥐도 새도 모르게': ['시치미를 떼다'], '시치미를 떼다': ['쥐도 새도 모르게'],
    // v241 🐢 속담 — 같은 교훈 쪽(말 조심 · 작은 것이 모임 · 한 대로 돌아옴)은 서로 들어간다
    '가는 말이 고와야 오는 말이 곱다': ['콩 심은 데 콩 나고 팥 심은 데 팥 난다'],
    '낮말은 새가 듣고 밤말은 쥐가 듣는다': ['발 없는 말이 천 리 간다'], '발 없는 말이 천 리 간다': ['낮말은 새가 듣고 밤말은 쥐가 듣는다'],
    '티끌 모아 태산': ['천 리 길도 한 걸음부터', '콩 심은 데 콩 나고 팥 심은 데 팥 난다'], '천 리 길도 한 걸음부터': ['티끌 모아 태산'],
    '콩 심은 데 콩 나고 팥 심은 데 팥 난다': ['티끌 모아 태산', '가는 말이 고와야 오는 말이 곱다'],
    '꿩 먹고 알 먹고': ['콩 심은 데 콩 나고 팥 심은 데 팥 난다'], '빈 수레가 요란하다': ['원숭이도 나무에서 떨어진다', '벼는 익을수록 고개를 숙인다', '우물 안 개구리'],
    '소 잃고 외양간 고친다': ['돌다리도 두들겨 보고 건너라'], '돌다리도 두들겨 보고 건너라': ['소 잃고 외양간 고친다'],
  };
  // 뜻 고르기 — 넓은 말과 좁은 말(비유 ⊃ 직유·은유)·거의 같은 말은 뜻도 겹친다
  const MEAN = {
    비유: ['직유', '은유'], 직유: ['비유'], 은유: ['비유'], 짐작: ['추론'], 추론: ['짐작'], '중심 생각': ['주제'], 주제: ['중심 생각'], '손을 떼다': ['발을 빼다'], '발을 빼다': ['손을 떼다'], 주장: ['의견'], 의견: ['주장'],
    // v241: 뜻이 거의 겹치는 속담 — 작은 것부터·모이면 크다 · 말은 퍼진다·조심
    '티끌 모아 태산': ['천 리 길도 한 걸음부터'], '천 리 길도 한 걸음부터': ['티끌 모아 태산'],
    '낮말은 새가 듣고 밤말은 쥐가 듣는다': ['발 없는 말이 천 리 간다'], '발 없는 말이 천 리 간다': ['낮말은 새가 듣고 밤말은 쥐가 듣는다'],
  };
  for (const w of ALL.filter((x) => x.deck !== 'passage')) {
    for (let s = 1; s <= 150; s++) {
      const u = makeQuestion(w, 'use', ALL, rng(s));
      for (const o of u.opts.filter((x) => !x.ok)) assert.ok(!(USE[w.w] || []).includes(o.t), `${w.w} 빈칸: "${o.t}"도 들어간다`);
      const m = makeQuestion(w, 'mean', ALL, rng(s));
      for (const o of m.opts.filter((x) => !x.ok)) {
        const x = ALL.find((y) => y.id === o.id);
        assert.ok(!(MEAN[w.w] || []).includes(x.w), `${w.w} 뜻: "${x.w}"의 뜻도 맞는다`);
      }
    }
  }
});

test('🔍 Codex 50차 #2: 빈칸에 다른 보기도 들어가던 문장을 고쳤다 — 옛 문장이 돌아오지 않게 · 바뀐 문장은 그 말의 뜻을 짚는다', () => {
  const ex = (w) => ALL.find((x) => x.w === w).ex;
  assert.ok(!ex('근거').includes("같은 ___도 함께 들어요") && ex('근거').includes('주장이 옳은 까닭인 ___'), '근거 ← 예시');
  assert.ok(!ex('매체').includes('___에 따라 전하는') && ex('매체').includes('정보나 생각을 전하는 ___'), '매체 ← 인물·방언');
  assert.ok(!ex('신뢰성').includes('믿을 만한지 ___까지') && ex('신뢰성').includes('___ 높은 정보'), '신뢰성 ← 근거·주장');
  assert.ok(!ex('조정').includes('의견을 ___하는') && ex('조정').includes('하나로 맞추는 의견 ___'), '조정 ← 비교·분류·토의');
  assert.ok(!ex('꼬리를 내리다').includes('강아지'), '꼬리를 내리다 ← 간이 콩알만 해지다(겁먹은 강아지)');
});

test('🔤 오늘의 낱말: 복습(기다린 지 오래·낮은 칸부터) 먼저 · 새 낱말은 묶음마다 번갈아 5개까지 · 한 번에 10개 · ⭐ 익힌 것·잠긴 📖은 안 나옴 · 새 낱말 더 배우기 · 칸 홀수 = 쓰임', () => {
  const none = planToday(ALL, {}, {}, T0);
  assert.equal(none.length, NEW_PER_DAY, '처음엔 새 낱말 5개');
  assert.deepEqual(none.map((p) => ALL.find((w) => w.id === p.id).deck), ['concept', 'idiom', 'proverb', 'saja', 'concept'], '📖은 잠겨 있으니 📘·🗣️·🐢·🀄 번갈아');
  assert.ok(none.every((p) => p.kind === 'mean'), '새 낱말은 뜻부터');
  // 📖은 그 글에 ★이 있어야
  const done = { 'K1:1': D0 };
  const open = ALL.filter((w) => isOpen(w, done));
  assert.ok(open.some((w) => w.card === 'K1') && !open.some((w) => w.card === 'K2'));
  const fresh3 = planToday(ALL, {}, done, T0, 9);
  assert.equal(fresh3.length, 9);
  assert.ok(fresh3.some((p) => p.id.startsWith('p:K1:')), '열린 📖도 번갈아');
  // 복습: 12개가 밀려 있으면 오래된 것부터 10개, 새 낱말 없음
  const st = {};
  const con = ALL.filter((w) => w.deck === 'concept');
  con.slice(0, 12).forEach((w, i) => { st[w.id] = { box: 1 + (i % 4), due: D0 - (i % 3), at: 1, miss: 0 }; });
  st[con[20].id] = { box: MASTER_BOX, due: 0, at: 1, miss: 0 };
  st[con[21].id] = { box: 2, due: D0 + 3, at: 1, miss: 0 };
  const plan = planToday(ALL, st, {}, T0);
  assert.equal(plan.length, SESSION_MAX);
  assert.ok(plan.every((p) => st[p.id]), '복습이 차면 새 낱말 없음');
  const dues = plan.map((p) => st[p.id].due);
  assert.deepEqual(dues, [...dues].sort((a, b) => a - b), '기다린 지 오래된 것부터');
  assert.ok(!plan.some((p) => p.id === con[20].id || p.id === con[21].id), '⭐ 익힌 것·아직 날이 안 된 것은 안 나옴');
  for (const p of plan) assert.equal(p.kind, st[p.id].box % 2 === 1 ? 'use' : 'mean');
  // 복습 3개 + 새 낱말 5개
  const st3 = { [con[0].id]: { box: 1, due: D0, at: 1, miss: 0 }, [con[1].id]: { box: 0, due: D0, at: 1, miss: 1 }, [con[2].id]: { box: 2, due: D0 - 1, at: 1, miss: 0 } };
  const p3 = planToday(ALL, st3, {}, T0);
  assert.equal(p3.length, 3 + NEW_PER_DAY);
  assert.deepEqual(p3.slice(0, 3).map((p) => p.id), [con[2].id, con[1].id, con[0].id]);
  // 하루 새 낱말은 5개까지 — 오늘 처음 배운(d0 = 오늘) 낱말을 센다 · 판을 끝낸 뒤 "시작 (5개)"가 또 뜨던 것 (v234 헤드리스)
  const learned = pf();
  korWordsRule(learned, none.map((x) => ({ id: x.id, ok: true })), T0, IDS);
  assert.deepEqual(planToday(ALL, learned.korWords, {}, at(0, 18)), [], '오늘 새 낱말 5개를 이미 배웠다');
  assert.equal(planToday(ALL, learned.korWords, {}, at(0, 18), NEW_PER_DAY).length, NEW_PER_DAY, '더 배우기는 된다');
  const half = pf();
  korWordsRule(half, none.slice(0, 2).map((x) => ({ id: x.id, ok: false })), T0, IDS);
  assert.equal(planToday(ALL, half.korWords, {}, at(0, 18)).length, NEW_PER_DAY - 2, '틀린 낱말도 오늘 배운 것');
  const tomorrow = planToday(ALL, learned.korWords, {}, at(1));
  assert.equal(tomorrow.length, 5 + NEW_PER_DAY, '다음 날: 복습 5 + 새 낱말 5');
  // 어제 배운 낱말을 오늘 복습해도 "오늘 배운 낱말"이 아니다 — 처음 배운 날(d0)은 그대로
  korWordsRule(learned, none.map((x) => ({ id: x.id, ok: true })), at(1), IDS);
  assert.ok(none.every((x) => learned.korWords[x.id].d0 === D0), '처음 배운 날 그대로');
  assert.equal(planToday(ALL, learned.korWords, {}, at(1, 18)).length, NEW_PER_DAY, '복습한 뒤에도 오늘의 새 낱말 5개');
  // 다 했으면 비고 · 더 배우기는 새 낱말만
  const allDone = Object.fromEntries(open.map((w) => [w.id, { box: MASTER_BOX, due: 0, at: 1, miss: 0 }]));
  assert.deepEqual(planToday(ALL, allDone, done, T0), []);
  assert.deepEqual(planToday(ALL, allDone, done, T0, NEW_PER_DAY), []);
  assert.equal(planToday(ALL, st3, {}, T0, NEW_PER_DAY).length, NEW_PER_DAY);
  assert.ok(planToday(ALL, st3, {}, T0, NEW_PER_DAY).every((p) => !st3[p.id]));
});

test('🔤 판 끝 규칙: 맞히면 칸 +1(다음 날·3일·7일·14일 뒤) · 5번째는 ⭐(안 나옴) · 틀리면 0·다음 날 · 처음 것만 · 모르는 낱말·잠긴 📖 안 셈 · 그날 처음 판만 💰10·🎯1 · 5개 이상 다 맞히면 🟩 · 두 번째 판은 보상 없음', () => {
  const con = ALL.filter((w) => w.deck === 'concept');
  const ids = con.slice(0, 6).map((w) => w.id);
  const p = pf({ coins: 3, coinsEarned: 7 });
  const r = korWordsRule(p, ids.map((id) => ({ id, ok: true })), T0, IDS);
  assert.deepEqual([r.ok, r.first, r.coins, r.stone, r.throws, r.n, r.okN], [true, true, WORD_COINS, 1, 1, 6, 6]);
  assert.deepEqual([p.coins, p.coinsEarned, p.items.stone_korean, p.korThrow.earned], [13, 17, 1, 1]);
  assert.equal(wordsToday(p.korWordDay, T0), 2);
  for (const id of ids) assert.deepEqual(p.korWords[id], { box: 1, due: D0 + DUE_AFTER[1], at: T0, miss: 0, d0: D0 });
  assert.equal(p.korWords[ids[0]].d0, D0);
  // 같은 날 두 번째 판 — 칸은 옮기고 보상은 없음
  const r2 = korWordsRule(p, ids.map((id) => ({ id, ok: true })), at(0, 18), IDS);
  assert.deepEqual([r2.ok, r2.first, r2.coins, r2.stone], [true, false, 0, 0]);
  assert.deepEqual([p.coins, p.items.stone_korean, p.korThrow.earned], [13, 1, 1]);
  // 칸 오르기: 2 → 3일 · 3 → 7일 · 4 → 14일 · 5 → ⭐
  const q = pf();
  const id = ids[0];
  const steps = [[1, 1], [2, 3], [3, 7], [4, 14]];
  let t = T0;
  for (const [box, days] of steps) {
    const rr = korWordsRule(q, [{ id, ok: true }], t, IDS);
    assert.equal(q.korWords[id].box, box);
    assert.equal(q.korWords[id].due, dayNum(t) + days);
    assert.deepEqual(rr.mastered, []);
    t += days * 86400000;
  }
  const last = korWordsRule(q, [{ id, ok: true }], t, IDS);
  assert.deepEqual(last.mastered, [id]);
  assert.equal(q.korWords[id].box, MASTER_BOX);
  assert.deepEqual(korWordsRule(q, [{ id, ok: true }], t + 86400000, IDS).mastered, [], '⭐는 한 번만 새로');
  // 틀리면 0·다음 날·틀린 수
  korWordsRule(q, [{ id, ok: false }], t, IDS);
  assert.equal(q.korWords[id].box, MASTER_BOX, '⭐ 익힌 낱말은 더 안 옮긴다 (Codex 50차 #4)');
  // 틀리면 0·다음 날·틀린 수 — 익히는 중인 낱말
  const id3 = ids[2];
  korWordsRule(q, [{ id: id3, ok: true }], t, IDS);
  korWordsRule(q, [{ id: id3, ok: false }], t + 86400000, IDS);
  assert.deepEqual([q.korWords[id3].box, q.korWords[id3].due, q.korWords[id3].miss], [0, dayNum(t + 86400000) + 1, 1]);
  // 같은 낱말은 처음 것만 · 모르는 낱말 · 잠긴 📖
  const z = pf();
  const pw = ALL.find((w) => w.deck === 'passage');
  const rz = korWordsRule(z, [{ id: ids[1], ok: false }, { id: ids[1], ok: true }, { id: 'c:없는말', ok: true }, { id: pw.id, ok: true }], T0, IDS);
  assert.deepEqual([rz.n, rz.okN, rz.stone], [1, 0, 0]);
  assert.equal(z.korWords[ids[1]].box, 0, '처음 고른 것(틀림)으로');
  assert.ok(!z.korWords[pw.id], '📖은 그 글의 ★ 없이는 안 센다');
  const zz = pf({ korDone: { [`${pw.card}:1`]: D0 } });
  assert.equal(korWordsRule(zz, [{ id: pw.id, ok: true }], T0, IDS).n, 1);
  // 다 맞혀도 PERFECT_MIN 미만이면 🟩 없음 · 하나라도 틀리면 없음
  const few = pf();
  assert.equal(korWordsRule(few, ids.slice(0, PERFECT_MIN - 1).map((id2) => ({ id: id2, ok: true })), T0, IDS).stone, 0);
  const miss = pf();
  assert.equal(korWordsRule(miss, ids.map((id2, i) => ({ id: id2, ok: i !== 3 })), T0, IDS).stone, 0);
  assert.equal(wordsToday(miss.korWordDay, T0), 1);
  // 빈 판 — 아무것도 안 바뀜
  const e = pf({ coins: 5 });
  assert.deepEqual(korWordsRule(e, [{ id: 'c:없는말', ok: true }], T0, IDS), { ok: false, why: 'empty' });
  assert.deepEqual([e.coins, wordsToday(e.korWordDay, T0)], [5, 0]);
  // 다음 날은 다시 보상
  assert.equal(korWordsRule(p, [{ id: ids[0], ok: true }], at(1), IDS).first, true);
});

test('🔍 Codex 50차 #4·#5·#8: 낡은 판(시작한 뒤 다른 판이 옮긴 낱말)은 연습 — 같은 판을 여러 번 저장해도 칸 하나 · ⭐는 낡은 오답으로 안 되돌아감 · 처음 배운 날은 이른 날로 합침 · 완전 동점도 차례 상관없이 · 앞날 기록이 꽉 차도 오늘 보상은 한 번', () => {
  const plan = planToday(ALL, {}, {}, T0);
  const round = (st) => plan.map((x) => ({ id: x.id, ok: true, from: (st[x.id] && st[x.id].at) || 0 }));
  const p = pf();
  const starts = [0, 1, 2, 3, 4].map(() => round(wordsOf(p.korWords))); // 다섯 창이 같은 판을 시작
  starts.forEach((ans, i) => korWordsRule(p, ans, T0 + i * 1000, IDS));
  for (const x of plan) assert.equal(p.korWords[x.id].box, 1, '하루 만에 ⭐까지 가지 않는다');
  assert.equal(p.coins, WORD_COINS, '보상은 한 번');
  // 이어서 푼 판(시작 때 상태가 지금과 같다)은 옮긴다
  const st1 = wordsOf(p.korWords);
  korWordsRule(p, round(st1), at(1), IDS);
  assert.equal(p.korWords[plan[0].id].box, 2);
  // ⭐ 익힌 낱말은 낡은 판의 오답으로 되돌아가지 않는다 · 맞춘 판의 오답도(더 안 나오는 낱말)
  const q = pf({ korWords: { [plan[0].id]: { box: MASTER_BOX, due: 0, at: 500, miss: 0, d0: D0 - 30 } } });
  korWordsRule(q, [{ id: plan[0].id, ok: false, from: 100 }], T0, IDS);
  korWordsRule(q, [{ id: plan[0].id, ok: false, from: 500 }], T0, IDS);
  assert.equal(q.korWords[plan[0].id].box, MASTER_BOX);
  // 처음 배운 날 — 이긴 쪽(나중에 푼 쪽) 것이 아니라 이른 날
  const today = D0;
  const a = { w: { box: 1, due: today + 1, at: 100, miss: 0, d0: today } };
  const b = { w: { box: 1, due: today + 2, at: 200, miss: 0, d0: today + 1 } };
  assert.equal(mergeWords(a, b).w.d0, today);
  assert.equal(mergeWords(b, a).w.d0, today);
  assert.equal(mergeWords(a, b).w.due, today + 2, '칸·날은 나중에 푼 쪽');
  const x = { w: { box: 1, due: 5, at: 9, miss: 0, d0: 3 } };
  const y = { w: { box: 1, due: 5, at: 9, miss: 2, d0: 4 } };
  assert.deepEqual(mergeWords(x, y), mergeWords(y, x), '완전 동점도 차례 상관없이');
  // 앞날 기록 400개 + 오늘 — 두 번째 판은 보상 없음
  const days = {};
  for (let i = 1; i <= 400; i++) days[D0 + i] = 1;
  const z = pf({ korWordDay: days });
  const ids2 = ALL.filter((w) => w.deck === 'concept').slice(0, 2).map((w) => w.id);
  assert.equal(korWordsRule(z, [{ id: ids2[0], ok: true }], T0, IDS).first, true);
  assert.equal(korWordsRule(z, [{ id: ids2[1], ok: true }], T0 + 1000, IDS).first, false);
  assert.equal(z.coins, WORD_COINS);
  assert.equal(wordsToday(z.korWordDay, T0), 1);
});

test('🔤 고쳐 읽기·병합: 깨진 칸은 0으로 · 낱말마다 나중에 푼 쪽(차례 상관없이) · 보상 받은 날은 큰 쪽 · 프로필 병합·복사·빈 프로필', () => {
  assert.deepEqual(stateOf({ box: 9, due: -3, at: 'x', miss: 2.7, d0: 'z' }), { box: MASTER_BOX, due: 0, at: 0, miss: 2, d0: 0 });
  assert.deepEqual(wordsOf('bad'), {});
  assert.deepEqual(wordsOf({ ['k'.repeat(90)]: { box: 1 }, ok: { box: 1, due: 5 } }), { ok: { box: 1, due: 5, at: 0, miss: 0, d0: 0 } });
  const a = { w1: { box: 3, due: 10, at: 200, miss: 0, d0: 1 }, w2: { box: 1, due: 5, at: 100, miss: 0, d0: 1 } };
  const b = { w1: { box: 0, due: 8, at: 100, miss: 1, d0: 1 }, w2: { box: 4, due: 20, at: 300, miss: 0, d0: 2 }, w3: { box: 1, due: 2, at: 1, miss: 0, d0: 2 } };
  assert.deepEqual(mergeWords(a, b), mergeWords(b, a), '차례 상관없이');
  assert.deepEqual(mergeWords(a, b), { w1: a.w1, w2: { ...b.w2, d0: 1 }, w3: b.w3 }, '칸은 나중에 푼 쪽 · 처음 배운 날은 이른 날');
  assert.deepEqual(mergeWordDays({ 100: 1, 101: 2 }, { 100: 2, 102: 1, x: 2 }), { 100: 2, 101: 2, 102: 1 });
  assert.deepEqual(wordDaysOf({ 100: 7, 101: 0 }), { 100: 2 });
  assert.deepEqual([emptyProfile().korWords, emptyProfile().korWordDay], [{}, {}]);
  const cur = { ...emptyProfile(), korWords: a, korWordDay: { [D0]: 1 }, updatedAt: 9 };
  const old = { ...emptyProfile(), korWords: b, korWordDay: { [D0]: 2, [D0 - 1]: 1 }, updatedAt: 5 };
  for (const [x, y] of [[cur, old], [old, cur]]) {
    const m = mergeStatRecord('profile', x, y);
    assert.deepEqual(m.korWords, mergeWords(a, b));
    assert.deepEqual(m.korWordDay, { [D0]: 2, [D0 - 1]: 1 }, '옛 백업이 받은 날을 "아직"으로 되돌리지 못한다');
  }
  const c = cloneProfile(cur);
  c.korWords.w1.box = 0;
  assert.equal(cur.korWords.w1.box, 3, '복사본');
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

test('★ 🔤 저장 경로: 판을 끝내면 낱말 칸·💰·🎯가 저장된 프로필에 · 두 창이 같은 날 첫 판을 동시에 끝내도 보상 한 번 · 저장이 안 되면 없던 일 · 창의 프로필도', async () => {
  await seed({ coins: 0, coinsEarned: 0, korWords: {}, korWordDay: {}, korThrow: { earned: 0, used: 0, refunded: 0 }, items: {} });
  const ids = ALL.filter((w) => w.deck === 'idiom').slice(0, 5).map((w) => w.id);
  fakeIdb.failNext('profile');
  const bad = await korWordsFinish(ids.map((id) => ({ id, ok: true })), IDS);
  assert.equal(bad.ok, false);
  assert.deepEqual([stored().coins, Object.keys(stored().korWords || {}).length], [0, 0], '저장 실패 = 없던 일');
  const [x, y] = await Promise.all([korWordsFinish(ids.map((id) => ({ id, ok: true, from: 0 })), IDS), korWordsFinish(ids.map((id) => ({ id, ok: true, from: 0 })), IDS)]);
  assert.ok(x.ok && y.ok);
  assert.deepEqual([x.first, y.first].sort(), [false, true], '첫 판 보상은 한 번');
  const s = stored();
  assert.deepEqual([s.coins, s.korThrow.earned, (s.items || {}).stone_korean], [WORD_COINS, 1, 1]);
  assert.equal(s.korWords[ids[0]].box, 1, '두 창이 같은 판을 저장해도 칸은 하나 — 나중 판은 연습 (Codex 50차 #4)');
  await reloadProfile();
  assert.equal(korWordsMap()[ids[0]].box, 1);
  assert.ok(Object.values(korWordDayMap()).includes(2));
  assert.equal(korThrowsLeft(), 1);
  // 실제로 houseDo(트랜잭션)를 거친다
  const direct = await applyHouseRule((p) => korWordsRule(p, [{ id: ids[1], ok: false }], Date.now(), IDS));
  assert.equal(direct.ok, true);
});

test('🔍 Codex 51차: 앞날 기록 400개 + 오늘 받음 — 진짜 저장 경로(프로필 복사·병합·그리기)에서도 오늘이 잘리지 않아 보상은 다시 없다 · 같은 시각에 거듭 저장해도 칸은 한 번만', async () => {
  const today = dayNum(Date.now());
  const days = { [today]: 1 };
  for (let i = 1; i <= 400; i++) days[today + i] = 1;
  await seed({ coins: 0, coinsEarned: 0, korWords: {}, korWordDay: days, korThrow: { earned: 0, used: 0, refunded: 0 }, items: {} });
  const ids = ALL.filter((w) => w.deck === 'concept').slice(0, 10).map((w) => w.id);
  for (const k of [0, 1]) {
    const r = await korWordsFinish(ids.slice(k * 5, k * 5 + 5).map((id) => ({ id, ok: true })), IDS);
    assert.deepEqual([r.ok, r.first, r.coins], [true, false, 0], `판 ${k + 1}: 오늘 보상은 이미 받았다`);
  }
  assert.deepEqual([stored().coins, stored().korThrow.earned], [0, 0]);
  assert.ok(stored().korWordDay[today], '저장된 기록에 오늘이 남는다');
  assert.ok(korWordDayMap()[today], '그리기용 복사본에도 오늘');
  assert.ok(cloneProfile({ ...emptyProfile(), korWordDay: days }).korWordDay[today], 'cloneProfile도');
  assert.ok(mergeWordDays(days, {})[today], 'mergeWordDays도');
  // 같은 시각(시계가 멈춤)에 같은 판을 거듭 저장 — from이 늘 어긋나 칸은 한 번만 오른다
  const p = pf({ korWords: { [ids[0]]: { box: 1, due: 0, at: 5000, miss: 0, d0: 1 } } });
  for (let i = 0; i < 4; i++) korWordsRule(p, [{ id: ids[0], ok: true, from: 5000 }], 5000, IDS);
  assert.equal(p.korWords[ids[0]].box, 2, '처음 한 번만 옮기고 나머지는 연습');
  assert.ok(p.korWords[ids[0]].at > 5000, '고친 때는 늘 앞으로');
});

test('📘 단원 지도: 단원 16(5-1·5-2) · 이어진 카드·낱말 · 이름표 · 진행(★·⭐) · 모두 준비됨(v236) · 검사가 잡는 것', () => {
  const units = unitsOf(UNITS, CARDS, ALL);
  assert.equal(units.length, 16);
  assert.deepEqual([...new Set(units.map((u) => u.term))], ['5-1', '5-2']);
  const six = units.find((u) => u.id === '5-1-6');
  assert.equal(unitLabel(six), '6단원 「빗대어 표현해요」');
  assert.deepEqual(six.cards.map((c) => c.id), ['K3', 'K6', 'K27', 'K28', 'K51', 'K54', 'K55', 'K69'], 'v241: 윤동주 「해바라기 얼굴」·정지용 「호수」 · v254: 윤동주 「눈」 · v258: 윤동주 「참새」·「햇비」 · v261: 윤동주 「봄」 더함');
  assert.deepEqual(six.words.map((w) => w.w), ['비유', '직유', '은유']);
  assert.equal(unitLabel(units.find((u) => u.id === '5-2-매체')), '📺 매체 단원 「평가하며 이용해요」');
  assert.equal(unitLabel(units.find((u) => u.id === '5-1-독서')), '📖 독서 단원 「책을 읽고 함께 이야기해요」');
  const st = { [six.words[0].id]: { box: MASTER_BOX, due: 0, at: 1, miss: 0 }, [six.words[1].id]: { box: 3, due: D0 + 7, at: 1, miss: 0 } };
  assert.deepEqual(unitProgress(six, { 'K3:1': D0, 'K3:2': D0 + 1, 'K6:1': D0 }, st), { stars: 3, starMax: 24, words: 3, mastered: 1, empty: false }); // 카드 여덟(v254 K51 · v258 K54·K55 · v261 K69) × 3
  assert.ok(units.every((u) => !unitProgress(u, {}, {}).empty), 'v236: 단원 열여섯 모두 글이 있다(준비 중 없음)');
  assert.equal(unitProgress({ cards: [], words: [] }, {}, {}).empty, true, '이어진 것이 없는 단원은 준비 중');
  // 모든 📘 낱말은 어느 단원에 있다
  for (const w of ALL.filter((x) => x.deck === 'concept')) assert.ok(units.some((u) => u.words.includes(w)), `${w.w} 단원`);
  // 검사
  const bad = (edit, re) => { const d = JSON.parse(JSON.stringify(UNITS)); edit(d.units); const errs = checkUnits(d, CARDS, WORDS); assert.ok(errs.some((e) => re.test(e)), `${re}: ${errs}`); };
  bad((u) => { u[1].id = u[0].id; }, /id가 겹쳐요/);
  bad((u) => { u[0].term = '6-1'; }, /term은/);
  bad((u) => { u[0].goal = ''; }, /goal/);
  bad((u) => { u[0].cards = ['K99']; }, /없는 카드 K99/);
  const ws = JSON.parse(JSON.stringify(WORDS));
  ws.words[0].unit = '9-9';
  assert.ok(checkUnits(UNITS, CARDS, ws).some((e) => /없는 단원 9-9/.test(e)));
  assert.deepEqual(deckStats(ALL, {}, {}).map((s) => [s.deck, s.total, s.open]), [['concept', 51, 51], ['idiom', 55, 55], ['proverb', 35, 35], ['saja', 20, 20], ['passage', 275, 0]]); // v258 시 일곱의 낱말 35 · v261 새 글 열둘의 46 · v265 신문 글 여섯의 36 · v267 단원 채우기 여섯의 31
  assert.equal(Object.keys(DECKS).length, 5);
});

test('🔤📘 화면 연결: 탭 막대(📚·🔤·📘·🧩 v242) · 낱말·퍼즐 판 중엔 도감을 다시 그리지 않음 · 🎒에서 돌아오면 이어서 · 시작은 ⏳ guardStart · 끝나면 🥚 하루 칸 · 처음 고른 것만 · 말(순수) · sw', async () => {
  const kv = read('js/koreanview.js');
  assert.match(kv, /for \(const \[id, label\] of \[\['cards', '📚 도감'\], \['words', '🔤 낱말'\], \['units', '📘 단원'\], \['puzzle', '🧩 퍼즐'\]\]\)/);
  assert.ok(kv.includes('if (ui.read || anySession() || ui.wview) return;'), '판을 시작했으면(· 📬 답장 화면이면) 목록이 덮지 않는다');
  assert.ok(kv.includes('return tabs.inSession() || puzzles.inSession();'), 'v242: 판 = 🔤 낱말 판 또는 🧩 퍼즐 판');
  assert.ok(!/tabs\.inSession\(\)/.test(kv.replace('return tabs.inSession() || puzzles.inSession();', '')), '낱말 판만 보던 자리가 남지 않는다(퍼즐 판을 덮지 않게)');
  assert.ok(kv.includes("if (anySession()) { resumeSession(); return; }"), '🎒·📊에서 돌아오면 이어서');
  assert.ok(kv.includes('if (puzzles.inSession()) puzzles.renderSession(tabCtx);'), '퍼즐 판이면 퍼즐 판을 이어서');
  assert.ok(kv.includes('else if (anySession()) resumeSession();'), '잡기 뒤에도');
  assert.ok(kv.includes('!ui.read && !anySession() && !ui.wview && !profileLoading()'), '다른 창 저장에도 판(· 📬 답장 화면)을 덮지 않는다');
  assert.ok(kv.includes("await (ui.tab === 'words' ? tabs.renderWordsTab(body, tabCtx) : tabs.renderUnitsTab(body, tabCtx));"));
  assert.ok(kv.includes("if (ui.tab === 'puzzle') await puzzles.renderPuzzleTab(body, tabCtx);"));
  const kt = read('js/kortabs.js');
  assert.ok(!/from '\.\/koreanview\.js'/.test(kt), '탭 쪽은 koreanview를 import하지 않는다(돌고 돈다)');
  assert.ok(kt.includes("const start = (extra) => guardStart('korean', () => startSession(ctx, extra));"), '⏳ 시간이 끝나면 새 판을 막는다');
  assert.ok(kt.includes("b.addEventListener('click', () => guardStart('korean', () => ctx.openCard(c.id)));"), '단원에서 글을 열 때도');
  assert.ok(kt.includes('if (!ws.first.has(it.id)) ws.first.set(it.id, ok);'), '판정은 처음 고른 것');
  assert.ok(kt.includes("const answers = [...ws.first.entries()].map(([id, ok]) => ({ id, ok, from: ws.from.get(id) || 0 }));"), '시작 때 상태를 같이 (50차 #4)');
  assert.ok(kt.includes('  if (ws.i < n && !ws.saving) {'), '저장이 시작되면 그만하기 없음 (50차 #6)');
  const fin = kt.slice(kt.indexOf('async function finishSession(ctx) {'), kt.indexOf('/** 판을 끝낸 말 (순수)'));
  const between = fin.slice(fin.indexOf('res = await korWordsFinish('), fin.indexOf('const egg = await ctx.tickKorDay();'));
  assert.ok(between.length > 0 && !/\breturn\b/.test(between), '🥚 칸은 화면이 바뀌어도 — 저장과 알 칸 사이에 빠져나가는 길이 없다');
  assert.ok(kt.includes("top.appendChild(el('span', 'kor-q-no', `문제 ${Math.min(ws.i + 1, n)} / ${n}`));"), '문제 수 (50차 #9)');
  assert.ok(kt.includes('const egg = await ctx.tickKorDay();'), '🥚 낱말을 끝낸 날');
  assert.ok(kt.includes('res = await korWordsFinish(answers, (S.all || []).map((w) => w.id));'));
  const { wordsFinishText, todayLine } = await import('../js/kortabs.js');
  assert.deepEqual(wordsFinishText({ ok: true, first: true, coins: 10, stone: 1, n: 6, okN: 6, mastered: ['c:비유'] }, (id) => id.slice(2)), {
    title: '🔤 오늘의 낱말 끝!', lines: ['한 번에 맞힌 낱말 6 / 6', '💰 +10 · 🎯 국어 포켓몬 잡기 1번 · 🟩 국어스톤 +1 (모두 한 번에 맞혔어요!)', '⭐ 새로 익힌 낱말: 비유'],
  });
  assert.equal(wordsFinishText({ ok: true, first: false, coins: 0, stone: 0, n: 3, okN: 2, mastered: [] }).title, '🔤 낱말 연습 끝!');
  assert.match(wordsFinishText({ ok: true, first: false, n: 3, okN: 2, mastered: [] }).lines[1], /이미 받았어요/);
  assert.equal(wordsFinishText({ ok: false, why: 'save' }).title, '저장이 안 됐어요');
  assert.match(todayLine(0), /💰10 · 🎯 국어 포켓몬 잡기 1번 · 낱말 5개 이상을 모두 한 번에/);
  assert.match(todayLine(2), /🟩까지/);
  const sw = read('sw.js');
  for (const f of ['./js/korwords.js', './js/korunits.js', './js/kortabs.js', './coach/korean/words.json', './coach/korean/units.json']) assert.ok(sw.includes(`'${f}',`), f);
});

test('🐢 속담 묶음 (v241): 관용 표현처럼 "이럴 때"(sit) — 쓰임 물음은 "어울리는 속담" · 상황 글에 속담이 그대로 안 나옴 · 낱말 id는 s: · 하루 새 낱말에 번갈아 · 화면은 sit 표시로 상황 글 · 원고 검사가 잡는 것', () => {
  assert.deepEqual([DECKS.idiom.sit, DECKS.proverb.sit, !!DECKS.concept.sit, !!DECKS.passage.sit], [true, true, false, false]);
  assert.deepEqual([DECKS.proverb.icon, DECKS.proverb.ko, DECKS.proverb.prefix], ['🐢', '속담', 's']);
  assert.equal(new Set(Object.values(DECKS).map((d) => d.prefix)).size, 5, '저장 키 앞글자가 겹치지 않는다');
  const pv = ALL.filter((w) => w.deck === 'proverb');
  assert.equal(pv.length, 35);
  for (const w of pv) {
    assert.equal(w.id, `s:${w.w}`);
    assert.ok(!w.unit, `${w.w}: 속담은 6학년 미리 — 5학년 단원에 잇지 않는다`);
    assert.equal(makeQuestion(w, 'use', ALL, rng(5)).prompt, '이럴 때 어울리는 속담은 무엇인가요?');
  }
  assert.equal(makeQuestion(ALL.find((w) => w.w === '등잔 밑이 어둡다'), 'mean', ALL, rng(5)).prompt, "'등잔 밑이 어둡다'의 뜻으로 알맞은 것은 무엇인가요?");
  // 원고 검사 — 속담도 상황 글(빈칸 없이 · 속담 그대로 없이)
  const bad = (edit, re) => { const d = JSON.parse(JSON.stringify(WORDS)); edit(d.words); const errs = checkWords(d, CARDS); assert.ok(errs.some((e) => re.test(e)), `${re} — ${errs.join(' / ')}`); };
  const p = (w) => (ws) => ws.find((x) => x.w === w);
  bad((ws) => { p('누워서 떡 먹기')(ws).ex = '이 문제는 ___예요.'; }, /속담의 ex는 상황 글/);
  bad((ws) => { p('누워서 떡 먹기')(ws).ex = '이 문제는 누워서 떡 먹기예요.'; }, /그대로 나와요/);
  bad((ws) => { p('누워서 떡 먹기')(ws).ex = ''; }, /속담은 어울리는 상황 글/);
  bad((ws) => { p('누워서 떡 먹기')(ws).avoid = ['식은 죽 먹기']; }, /같은 묶음에 없어요/);
  bad((ws) => { p('누워서 떡 먹기')(ws).deck = 'saying'; }, /deck은/);
  // 화면: 상황 글·풀이는 묶음의 sit 표시로 (관용 표현 이름에 묶지 않는다)
  const kt = read('js/kortabs.js');
  assert.ok(kt.includes("DECKS[w.deck].sit ? el('p', 'kor-wsit', q.sentence)"), '쓰임 물음 — 속담도 상황 글');
  assert.ok(kt.includes("DECKS[w.deck] && DECKS[w.deck].sit && w.ex) note.appendChild(el('p', 'kor-note-ex', `이럴 때: ${w.ex}`))"), '풀이 — 속담도 "이럴 때"');
  assert.ok(!kt.includes("w.deck === 'idiom'"), '관용 표현 이름으로 가르지 않는다');
});

test('🔍 v241 변이: 번갈아(DECK_ORDER)에 없는 묶음의 낱말이 있어도 오늘의 낱말이 멈추지 않는다 — 그런 낱말은 빠지고 아는 묶음은 그대로', () => {
  const odd = [...ALL, { id: 'x:낯선', deck: 'unknown', w: '낯선', mean: '처음 보는', ex: '', pair: [], avoid: [] }];
  const t0 = Date.now();
  const plan = planToday(odd, {}, {}, T0, SESSION_MAX);
  assert.ok(Date.now() - t0 < 2000, '바로 끝난다');
  assert.equal(plan.length, SESSION_MAX);
  assert.ok(!plan.some((p) => p.id === 'x:낯선'), '모르는 묶음은 새 낱말로 안 나온다');
  assert.deepEqual(plan.slice(0, 3).map((p) => ALL.find((w) => w.id === p.id).deck), ['concept', 'idiom', 'proverb']);
});

test('🔍 Codex 54차 낱말: 묶음 이름은 자기 이름의 글자만(배열·"constructor"는 오류로, 멈추지 않게) · 답이 둘이던 문장을 고침(높임 표현·콧대가 높다) · 인용↔예시 짝 · 빈 수레↔우물 안 개구리 · 시조는 세 장 · 사전 쪽 뜻', () => {
  const base = () => JSON.parse(JSON.stringify(WORDS));
  const d1 = base();
  for (const x of d1.words.filter((w) => w.deck === 'proverb').slice(0, 4)) x.deck = ['proverb'];
  assert.ok(checkWords(d1, CARDS).filter((e) => /deck은/.test(e)).length === 4, '배열 묶음 이름은 넷 다 오류');
  assert.equal(allWords(d1, CARDS).filter((w) => Array.isArray(w.deck)).length, 0, '배열 묶음 낱말은 쓰지 않는다');
  const d2 = base();
  d2.words.push({ deck: 'constructor', w: '가나', mean: '다라', ex: '마바' });
  let errs = null;
  assert.doesNotThrow(() => { errs = checkWords(d2, CARDS); });
  assert.ok(errs.some((e) => /가나: deck은/.test(e)), '물려받은 이름은 오류 한 줄');
  assert.ok(!allWords(d2, CARDS).some((w) => w.w === '가나'));
  assert.equal(wordId('constructor', '가나'), '', '모르는 묶음은 id 없음');
  const w = (x) => ALL.find((y) => y.w === x);
  assert.match(w('높임 표현').ex, /상대를 높여 주는 ___/, '"웃어른께 알맞은 ___"에는 표준어도 들어갔다');
  assert.ok(!/말을/.test(w('콧대가 높다').ex), '"친구들 말을 잘 안 들음"은 한 귀로 흘리기에도 맞았다');
  assert.deepEqual(w('인용').pair, ['출처', '예시']);
  assert.ok(w('빈 수레가 요란하다').avoid.includes('우물 안 개구리'));
  assert.ok(/초장·중장·종장으로 이루어진/.test(w('시조').mean) && !/세 줄/.test(w('시조').mean + w('시조').ex), '시조는 세 장 — 줄 바꿈은 정의가 아니다');
  assert.match(w('소 잃고 외양간 고친다').mean, /손해/);
  assert.match(w('혀를 내두르다').mean, /어이없어서/);
});
