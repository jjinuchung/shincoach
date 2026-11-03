// 📘 4학년 2학기 국어 글 일곱째 묶음 v382 (2026-11-02 아버님 「국어 일곱째 묶음 만들자」 → 기본안 「추천대로」): K179~K190
//  · 여섯째 묶음이 다 열린 다음 날(11월 22일쯤)부터 읽게 되니 겨울·연말 주제 · 진도 5·6단원 넷 + 4단원 둘 + 글이 적던 독서·1·2·3·매체 여섯
//  · 사실은 공공 자료와 대조(연세대 윤동주기념관 원문 · Project Gutenberg 「작은 아씨들」 · 그림 동화 1857년 판 · 『한국민속문학사전』 ·
//    표준국어대사전 · 국민재난안전포털·행정안전부 · 국가유산청·국립생물자원관 · PokeAPI 도감) · 📖 낱말 26 표준국어대사전 대조(일곱 고침)
//  · 📦 묶음 b382는 b380이 다 열린 다음 날부터 하루 두 편(js/kordrip.js after — tests/kordrip382.test.js)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkContent, validCards, lineCount } from '../js/korean.js';
import { DRIP } from '../js/kordrip.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const DATA = JSON.parse(read('coach/korean/reading.json'));
const UNITS = JSON.parse(read('coach/korean/units.json')).units;
const WORDS = JSON.parse(read('coach/korean/words.json'));
const IDS = DATA.cards.map((c) => c.id);
const card = (id) => DATA.cards.find((c) => c.id === id);
const NEW = Array.from({ length: 12 }, (_, i) => `K${179 + i}`);
const QS = NEW.flatMap((id) => card(id).qs);
const q = (id) => QS.find((x) => x.id === id);
const CIRC = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
const nums = (s) => [...new Set([...String(s || '')].map((ch) => CIRC.indexOf(ch) + 1).filter((n) => n > 0))];
const bare = (s) => String(s).replace(/[\s.,!?'"·…—–\-()「」]/g, '');
const lines = (id) => card(id).lines || card(id).stanzas.flat();
const body = (id) => lines(id).join(' ');
const kidText = (id) => JSON.stringify({ ...card(id), meta: null, facts: null, source: null, author: null });
const fact = (id, k) => Object.fromEntries(card(id).facts)[k];
const word = (id, w) => Object.fromEntries(card(id).words)[w];
/** 4-2 단원마다 이어진 성취기준 (kornew380 LINK4와 같음) */
const LINK4 = {
  '4-2-독서': ['4국01-06', '4국02-04', '4국02-03', '4국02-06'],
  '4-2-1': ['4국05-02', '4국05-05', '4국02-04', '4국01-06'],
  '4-2-2': ['4국04-05', '4국02-02', '4국03-02', '4국06-01'],
  '4-2-3': ['4국01-06', '4국03-03', '4국03-01', '4국04-03'],
  '4-2-매체': ['4국06-02', '4국01-05'],
  '4-2-4': ['4국05-03', '4국05-05', '4국02-03'],
  '4-2-5': ['4국01-04', '4국03-04', '4국04-04', '4국04-05'],
  '4-2-6': ['4국01-02', '4국02-03', '4국05-01'],
};

test('📘 일곱째 묶음 열둘 (v382): 연습 아홉 + ✨ 명작 셋 · 물음 서른여섯(셋씩) · 원고 검사 통과 · 7~12줄 · ✍️ 둘 · 독서 대화·두 친구의 글·영상 통화는 줄마다 · 바탕 글 다섯', () => {
  assert.deepEqual(checkContent(DATA), []);
  assert.deepEqual(IDS.slice(178, 190), NEW); // v389 여덟째 묶음이 뒤에 이어짐
  assert.equal(validCards(DATA).length, 202); // v389 여덟째 묶음 열둘 더함
  assert.deepEqual(NEW.map((id) => [card(id).kind, card(id).genre]), [
    ['practice', '독서 대화'], ['practice', '의견을 제시하는 글 두 편'], ['practice', '이야기'], ['practice', '보고하는 글'], ['practice', '제안하는 글'], ['practice', '발표하는 글'],
    ['classic', '동시'], ['classic', '옛이야기'], ['practice', '편지'], ['practice', '영상 통화 대화'], ['practice', '설명하는 글'], ['classic', '옛이야기']]);
  assert.deepEqual(['K185', 'K186', 'K190'].map((id) => card(id).author), ['윤동주', '그림 형제 · 신코치가 다시 씀', '지은이 모름 · 신코치가 다시 씀']);
  assert.ok(NEW.every((id) => card(id).qs.length === 3), '4학년 글은 물음 셋');
  assert.equal(QS.length, 36);
  assert.deepEqual(NEW.filter((id) => lineCount(card(id)) < 7 || lineCount(card(id)) > 12), [], '짧게 — 7~12줄');
  assert.deepEqual(NEW.filter((id) => card(id).write), ['K183', 'K185']);
  for (const id of ['K183', 'K185']) {
    const w = card(id).write;
    assert.equal(w.v, 1, id);
    assert.equal(w.rubric.must.length, 3, id);
    assert.ok(w.rubric.miss.some((m) => /맞춤법/.test(m)), `${id} 맞춤법은 채점하지 않는다`);
    assert.ok(w.frames.every((f) => f.endsWith('~') && f.split('~').length === 2), `${id} 문장 틀은 빈자리 하나가 끝에 (Codex 53차 #4)`);
    assert.ok(![...w.rubric.ok, ...w.rubric.miss].some((l) => /이상|이하/.test(l)), `${id} 등급은 하나로 (Codex 52차 #6)`);
  }
  assert.deepEqual(NEW.filter((id) => card(id).layout === 'rows'), ['K179', 'K180', 'K188']);
  assert.deepEqual(NEW.filter((id) => card(id).source), ['K179', 'K182', 'K183', 'K184', 'K189']);
  for (const id of ['K179', 'K182', 'K183', 'K184', 'K189']) assert.match(card(id).source, /신코치가 [^.]* 새로 썼어요\.$/, id);
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(read('sw.js')) || [])[1]) >= 382, '원고는 앱 셸 — sw v382 이상');
});

test('📘 단원 (v382): 새 글은 4-2 단원 하나씩 · 만나는 곳은 그 단원 · 첫 성취기준은 그 단원 것 · 공식 문구 · 소단원 차례 · 4-2 단원마다 일곱 편 넘게', () => {
  // 공식 문구 — 옛 원고(kornew298이 공식 문구와 대조해 둔 것)의 같은 번호와 글자까지 같다 (v382: 2015 문구를 둘 썼다가 잡힘)
  const STD = new Map(DATA.cards.filter((c) => Number(c.id.slice(1)) <= 178).flatMap((c) => c.meta.map((s) => [(/^\[(4국\d\d-\d\d)\]/.exec(s) || [])[1], s]).filter(([k]) => k)));
  for (const id of NEW) {
    const us = UNITS.filter((u) => u.cards.includes(id));
    assert.equal(us.length, 1, `${id} 단원 하나`);
    const u = us[0];
    assert.equal(u.term, '4-2', `${id} 4학년 2학기`);
    const where = u.no === '매체' ? '매체 단원' : u.no === '독서' ? '독서 단원' : `${u.no}단원`;
    assert.match(card(id).meta[0], new RegExp(`^만나는 곳: 4-2 ${where} 「${u.title}」`), `${id} 만나는 곳`);
    const codes = card(id).meta.flatMap((m) => [...m.matchAll(/\[(4국0\d-0\d)\]/g)].map((x) => x[1]));
    assert.equal(codes.length, 2, `${id} 성취기준 둘`);
    assert.ok(LINK4[u.id].includes(codes[0]), `${id} 첫 성취기준 ${codes[0]}은 단원 ${u.id}와 이어진 것`);
    for (const s of card(id).meta.slice(1)) assert.equal(s, STD.get((/^\[(4국\d\d-\d\d)\]/.exec(s) || [])[1]), `${id} 공식 문구 — ${s}`);
    assert.ok(!card(id).meta.some((m) => /\[6국/.test(m)), `${id} 5~6학년 성취기준 없음`);
  }
  assert.ok(!JSON.stringify(NEW.map((id) => card(id).meta)).includes('낱말의 의미나 생략된 내용'), '2015 교육과정 문구 없음');
  const of = (uid) => UNITS.find((u) => u.id === uid).cards;
  assert.deepEqual(of('4-2-독서'), ['K197', 'K143', 'K178', 'K192', 'K118', 'K144', 'K165', 'K131', 'K179']);
  assert.deepEqual(of('4-2-1'), ['K132', 'K145', 'K181', 'K107', 'K119', 'K146', 'K174', 'K180', 'K193'], '① 작품과 내 경험 → ② 다른 의견 비교');
  assert.deepEqual(of('4-2-2'), ['K108', 'K133', 'K164', 'K176', 'K109', 'K134', 'K175', 'K182', 'K194'], '① 한글 → ② 보고하는 글');
  assert.deepEqual(of('4-2-3'), ['K111', 'K147', 'K173', 'K110', 'K120', 'K148', 'K183', 'K195', 'K166'], '① 토의 → ② 제안하는 글 · 고쳐 쓰기는 끝');
  assert.deepEqual(of('4-2-매체'), ['K122', 'K177', 'K191', 'K121', 'K184', 'K196', 'K150', 'K135', 'K149']);
  assert.deepEqual(of('4-2-4'), ['K112', 'K123', 'K136', 'K151', 'K162', 'K172', 'K185', 'K124', 'K186', 'K113', 'K125', 'K163'], '① 시·이야기 → ② 질문으로 읽기');
  assert.deepEqual(of('4-2-5'), ['K114', 'K126', 'K137', 'K188', 'K138', 'K159', 'K160', 'K171', 'K115', 'K127', 'K139', 'K161', 'K170', 'K187', 'K198', 'K128'], '① 대화 → ② 편지');
  assert.deepEqual(of('4-2-6'), ['K116', 'K130', 'K140', 'K142', 'K153', 'K154', 'K157', 'K158', 'K167', 'K169', 'K189', 'K199', 'K200', 'K117', 'K129', 'K141', 'K152', 'K156', 'K155', 'K168', 'K190', 'K201', 'K202'], '① 원인과 결과 → ② 이어질 내용 상상');
  // 여섯·일곱 편이던 단원(독서·1·2·3·매체)을 채워 4-2 단원이 모두 일곱 편 넘게 — 기본안에서 말한 것
  for (const u of UNITS.filter((x) => x.term === '4-2')) assert.ok(u.cards.length >= 7, `${u.id} ${u.cards.length}`);
  assert.match(JSON.parse(read('coach/korean/units.json')).about, /v382 일곱째 묶음/);
});

test('📘 물음 (v382): 지어내기 보기 · 정답만 길지 않게 · 근거 풀이 줄은 근거로도 받음 · 낱말 풀이를 정답에 옮기지 않음 · 정답 자리 고르게 · 🧠 없음', () => {
  const at = [0, 0, 0, 0];
  for (const x of QS) {
    assert.ok(x.opts.some((o) => o.type === 'make'), `${x.id} 지어내기 보기`);
    const len = x.opts.map((o) => [...o.t].length);
    const k = x.opts.findIndex((o) => o.ok);
    at[k]++;
    const other = Math.max(...len.filter((_, i) => i !== k));
    assert.ok(len[k] <= other * 1.3, `${x.id} 정답 보기 길이 ${len[k]} — 가장 긴 틀린 보기 ${other}`);
    assert.ok(Array.isArray(x.ev) && x.ev.length, `${x.id} 근거`);
    assert.deepEqual(nums(x.evNote).filter((n) => !x.ev.includes(n)), [], `${x.id} 근거 풀이가 쓰는 줄은 근거로도 받는다`);
  }
  for (const id of NEW) {
    const c = card(id);
    for (const x of c.qs) {
      const ok = bare(x.opts.find((o) => o.ok).t);
      for (const [, m] of c.words) assert.ok(!(bare(m).length >= 6 && ok.includes(bare(m))), `${x.id} 정답에 낱말 풀이 그대로 — ${m}`);
    }
  }
  assert.deepEqual(at, [9, 9, 9, 9], '정답 자리 (화면에서는 섞어 보여 준다)');
  assert.deepEqual(QS.filter((x) => x.opts.some((o) => o.type === 'know')).map((x) => x.id), [], '🧠 아는 것으로 답하기 보기 없음');
  assert.ok(QS.filter((x) => /원인과 결과|까닭/.test(x.skill)).length >= 6, '까닭(원인과 결과) 물음을 넉넉히');
  // 사실과 의견(K180-3)은 「사실·의견 헷갈리기」 보기로 · 글자 그대로 읽으면 틀리는 말(K188-3)은 「글자만 보기」로
  assert.equal(q('K180-3').opts.filter((o) => o.type === 'fo').length, 2);
  assert.ok(q('K188-3').opts.some((o) => o.type === 'literal' && /정말로/.test(o.t)));
});

test('🔍 근거 줄 (v382): 정답을 바로 받치는 줄만 — 상황·배경 줄은 빼고 · 이어질 내용은 숨은 자리와 지금 장면', () => {
  const want = {
    'K179-1': [4], 'K179-2': [7], 'K179-3': [9],
    'K180-1': [3], 'K180-2': [7], 'K180-3': [6],
    'K181-1': [1], 'K181-2': [5], 'K181-3': [4, 6],
    'K182-1': [6], 'K182-2': [4], 'K182-3': [9],
    'K183-1': [4], 'K183-2': [7], 'K183-3': [8],
    'K184-1': [3], 'K184-2': [6], 'K184-3': [8],
    'K185-1': [2, 3], 'K185-2': [6], 'K185-3': [4, 8],
    'K186-1': [8], 'K186-2': [9], 'K186-3': [4, 7, 9],
    'K187-1': [6], 'K187-2': [7], 'K187-3': [9],
    'K188-1': [4], 'K188-2': [7], 'K188-3': [9],
    'K189-1': [3], 'K189-2': [4], 'K189-3': [7],
    'K190-1': [1, 2], 'K190-2': [6, 11], 'K190-3': [6],
  };
  assert.equal(Object.keys(want).length, 36);
  for (const [id, e] of Object.entries(want)) assert.deepEqual(q(id).ev, e, id);
  // 상황 줄은 근거가 아니다 — 조리사님을 본 장면(⑤)·저수지 모습(③)·중학생 장면(⑤)
  assert.ok(!q('K187-1').ev.includes(5) && !q('K183-1').ev.includes(3) && !q('K183-3').ev.includes(5));
  // 좋은 점 물음(K183-3)의 보기에는 ⑨의 내용(119 신고)을 넣지 않는다 — 정답이 둘이 되지 않게
  assert.ok(!q('K183-3').opts.some((o) => /119|신고/.test(o.t)));
  // 🔍 Codex 185차: 상황만 말하는 줄(④ 이브이가 놀람)·대상이 없는 결과 줄(⑧ 「얼어요.」)은 근거가 아니다 — 풀이에도 그 번호를 쓰지 않는다
  assert.ok(!q('K181-2').ev.includes(4) && !q('K185-2').ev.includes(8));
  assert.ok(!/[④]/.test(q('K181-2').evNote) && !/[⑧]/.test(q('K185-2').evNote));
});

test('🔍 Codex 185차 (v382): 차례 보기는 한 사건만 가리키게 · 틀린 보기 까닭이 글을 잘못 옮기지 않게 · 인물 말도 사실과 어긋나지 않게', () => {
  // K186-3 — 「구두가 다 만들어져 있음」은 ④(처음)와 ⑧(요정이 만듦) 둘 다라 ⑦→⑧→⑨로도 읽혔다 → 네 보기 모두 「처음으로」
  for (const o of q('K186-3').opts) assert.ok(o.t.includes('처음으로 구두가 다 만들어져 있음'), `K186-3 보기 — ${o.t}`);
  assert.ok(q('K186-3').opts.find((o) => o.ok).t.startsWith('처음으로 구두가'), 'K186-3 정답은 처음 일이 맨 앞');
  // K179-2 — ⑧은 자매들의 마음을 짐작한 말이지 전쟁터에 간 까닭을 궁금해한 말이 아니다
  const war = q('K179-2').opts.find((o) => /전쟁터/.test(o.t));
  assert.match(war.why, /궁금해한 말은 없어요/);
  assert.ok(!/⑧ 서윤이가 [^.]*한 말이에요/.test(war.why));
  // K180 — 눈은 늦가을·봄에도 내린다 → 「겨울에만」 같은 단정은 글에도 풀이에도 두지 않는다
  assert.ok(!/겨울에만/.test(kidText('K180')));
});

test('✍️ 생각 쓰기 (v382): 얼음 안내판 제안에 까닭 하나 더(⑨ 다음) · 겨울을 흉내 내는 말로', () => {
  const a = card('K183').write;
  assert.match(a.q, /⑨ 다음에/);
  assert.match(a.q, /「그리고」로 시작해/);
  assert.ok(a.rubric.miss[0].startsWith('안내판·얼음 안전과 상관없는 내용 — 🔁'));
  assert.ok(a.model.startsWith('그리고 '));
  const b = card('K185').write;
  assert.match(b.q, /흉내 내는 말/);
  assert.ok(b.rubric.miss[0].startsWith('흉내 내는 말 없이'));
  assert.ok(/호호|몽글몽글|꽁꽁/.test(b.model), '예시 답에 흉내 내는 말');
});

test('🏛️ 사실 대조 (v382): 겨울 원문 · 작은 아씨들 1장 · 요정과 구두장이 1857년 판 · 팥죽할멈 · 눈 이름 · 얼음 두께 · 겨울 철새 · 꾸꾸리 — 쓰지 않기로 한 것은 정말 빠졌나', () => {
  // ✨ 윤동주 「겨울」 — 연세대 윤동주기념관 원문제공 099 현대어 표기 그대로(원고 그림을 직접 봄)
  assert.deepEqual(card('K185').stanzas, [['처마 밑에', '시래기 다람이', '바삭바삭', '추워요.'], ['길바닥에', '말똥 동그래미', '달랑 달랑', '얼어요.']]);
  for (const s of ['1936년 겨울', '연세대학교 윤동주기념관', '겨을', '1955년', '다래미', '동그램이']) assert.ok(JSON.stringify(card('K185').facts).includes(s), `K185 ${s}`);
  assert.ok(!card('K185').qs.some((x) => /다람이|동그래미/.test(x.q + JSON.stringify(x.opts.map((o) => o.t)))), '사전에 없는 「다람이」·「동그래미」는 묻지 않는다');
  assert.match(fact('K185', '저작권'), /1945년에 세상을 떠나/);
  assert.match(q('K185-1').opts.find((o) => o.type === 'flip').why, /잘 마른 것이 가볍게 바스러지는 소리/, '바삭바삭 — 사전 「2」');
  // 📚 작은 아씨들 1장 — 1달러씩 · 처음 사려던 것 · 엄마 선물 · 아버지는 전쟁터 · 아침밥 나눔(2장)은 쓰지 않음
  const lw = body('K179');
  for (const x of ['1달러씩', '조는 책을, 베스는 새 악보를, 에이미는 그림 연필을', '메그는 장갑, 조는 슬리퍼, 베스는 손수건, 에이미는 작은 향수', '전쟁터']) assert.ok(lw.includes(x), `K179 ${x}`);
  assert.ok(!/훔멜|아침밥|아침을 가져/.test(lw), 'K179 2장 이야기는 쓰지 않음');
  // ✨ 요정과 구두장이 — 1857년 판 차례 · 크리스마스 앞둔 밤 · 옷 없는 요정 둘 · 셔츠·웃옷·조끼·바지·양말 · 다시 오지 않음
  const sh = body('K186');
  const order = ['한 켤레를 만들 가죽', '다 만들어져 있었다', '두 켤레, 다음에는 네 켤레', '크리스마스를 얼마 앞둔 밤', '작은 요정 둘', '셔츠와 웃옷, 조끼, 바지', '다시 오지 않았다'].map((w) => sh.indexOf(w));
  assert.ok(order.every((x, i) => x >= 0 && (!i || x > order[i - 1])), `K186 차례 ${order}`);
  assert.match(fact('K186', '만나는 곳'), /1812년.*1857년/);
  assert.match(fact('K186', '저작권'), /1863년에 세상을 떠나/);
  // ✨ 팥죽할멈 — 대백과 차례대로 일곱이 옴 · 글은 호랑이가 아궁이 앞에 앉는 데까지 · 죽는다는 말 없음(아버님 「순하게」) · 끝은 facts에만
  const pj = body('K190');
  assert.ok(pj.includes('알밤, 송곳, 개똥, 맷돌, 자라, 멍석, 지게가 차례로'), 'K190 대백과에 온 차례');
  assert.ok(lines('K190').at(-1).endsWith('아궁이 앞에 쪼그리고 앉았다.'), 'K190 글은 아궁이 앞에서 끊는다 — 그 뒤 장면(알밤이 튐)은 이어질 내용 물음의 답');
  assert.ok(!/(?<!팥)죽(었|는다|이|여|게|음)/.test(kidText('K190') + fact('K190', '원문')), 'K190 죽는다는 말 없음');
  assert.match(fact('K190', '원문'), /강물에 풍덩 빠져 다시는 나타나지 않았어요/);
  assert.match(fact('K190', '원문'), /한국민속대백과/);
  // ❄️ 눈 이름 — 사전 뜻이 분명히 갈리는 다섯만 · 헷갈리는 짝(가랑눈·가루눈·길눈·잣눈·자국눈·우박)은 넣지 않음
  const sn = body('K182');
  for (const x of ['「함박눈」', '「싸라기눈」', '「싸락눈」', '「진눈깨비」', '「도둑눈」', '「숫눈」']) assert.ok(sn.includes(x), `K182 ${x}`);
  assert.ok(!/가랑눈|가루눈|길눈|잣눈|자국눈|우박/.test(kidText('K182')));
  // 🧊 얼음 — 공식 숫자는 국민재난안전포털의 10cm 하나 · 언론 숫자(15·20·25·30cm)·사고 수 없음 · 119
  const ic = body('K183');
  assert.ok(ic.includes('국민재난안전포털에 따르면, 얼음은 보통 10cm') && ic.includes('119'));
  assert.ok(!/1[5]\s?cm|[23][05]\s?cm|\d+건|사망/.test(ic));
  // 🦢 철새 — 추위를 피해(국가유산청) · 가창오리 대부분 · 천연기념물 번호는 쓰지 않음(2021년 폐지)
  const bd = body('K184');
  assert.ok(bd.includes('추위를 피해') && bd.includes('전 세계 가창오리의 대부분이 우리나라에서'));
  assert.ok(!/제\s?\d+호/.test(bd), 'K184 천연기념물 번호 없음');
  assert.ok(!/가창오리는 천연기념물|가창오리[^.]*멸종위기/.test(bd), '가창오리는 천연기념물·멸종위기가 아니다');
  // 🐾 꾸꾸리 — 도감 문장만 · 타입·레벨·진화·키·몸무게 없음
  const sw = body('K189');
  for (const x of ['코를 땅에 비비며', '코끝이 아주 단단해서', '마른 풀 밑에 자라는 버섯', '온천을 찾아내기도']) assert.ok(sw.includes(x), `K189 ${x}`);
  assert.ok(!/얼음 타입|땅 타입|레벨|메꾸리|맘모꾸리|키가|몸무게/.test(kidText('K189')));
  // 📖 낱말 뜻 — 표준국어대사전 대조로 고친 것
  assert.equal(word('K180', '겨를'), '어떤 일이나 생각을 할 만한 짧은 시간이나 여유');
  assert.equal(word('K181', '목도리'), '추위를 막기 위하여 목에 두르는 물건');
  assert.equal(word('K188', '할미'), '할머니가 손자나 손녀에게 자기 자신을 이르는 말');
  assert.equal(word('K190', '멍석'), '짚으로 새끼 날을 만들어 네모나게 엮은 큰 깔개');
  assert.equal(word('K182', '탐스럽게'), '가지고 싶은 마음이 들 만큼 보기 좋고 끌리는 데가 있게');
  assert.ok(!/조리/.test(word('K187', '조리사')), '풀이 안에 「조리」를 되풀이하지 않는다');
  // 형제는 지어내지 않는다 — 「작은 아씨들」의 네 자매는 원문 인물 · 「그림 형제」는 지은이 이름(author)
  for (const id of NEW) assert.ok(!/동생|누나|언니|오빠|형이랑|형과|형은|형이 |형제/.test(kidText(id)), `${id} 형제를 지어내지 않음`);
  for (const id of NEW) assert.ok(![...kidText(id)].some((ch) => (ch >= 'ㅤ' && ch <= '㆏') || (ch >= 'ᄀ' && ch <= 'ᇿ')), `${id} 옛 한글 글자 없음`);
  assert.deepEqual(NEW.filter((id) => /채움\)|채울 것|조사 뒤에|대조 기다림|TODO|TBD/.test(JSON.stringify(card(id)))), [], '빈칸 표시가 남지 않음');
});

test('🔁 겹침 (v382): 새 글 제목이 옛 글과 같지 않다 · 제목에 「」 없음 · 국어·논술에 있던 주제와 물음 꼴을 피함', () => {
  const old = DATA.cards.filter((c) => Number(c.id.slice(1)) <= 178);
  for (const id of NEW) assert.ok(!old.some((c) => c.title === card(id).title), `${id} 제목이 옛 글과 같음`);
  assert.deepEqual(NEW.filter((id) => /[「」]/.test(card(id).title)), [], '제목에 「」 없음 — 화면이 제목을 「」로 감싼다');
  assert.ok(!/학교를 쉬|휴교|숙제|포켓몬 카드/.test(body('K180')), 'K180은 논술 N110(눈 오는 날 휴교)·N5·N9와 다른 주제');
  assert.ok(!card('K187').qs.some((x) => /편지를 쓴 까닭/.test(x.skill)), 'K187은 K115·K170(편지를 쓴 까닭)과 다른 물음');
  assert.ok(!card('K182').qs.some((x) => /차례/.test(x.skill)), 'K182는 K109(조사한 차례)와 다른 물음');
  assert.ok(!card('K184').qs.some((x) => /출처/.test(x.skill)), 'K184는 K150(출처 밝힌 까닭)과 다른 물음');
});

test('📖 같이 안 낼 무리 (v382): 이번엔 더하지 않음(뜻이 겹치는 짝 없음)', () => {
  assert.equal(WORDS.apart.length, 61); // v382은 59 그대로 · v389가 둘 더함(관찰 무리 · 도구·긁개 — kornew389)
});

test('📦 일곱째 묶음 b382 (v382): 열둘 = 새 글 · b380 다음에 이어서 · 포켓몬 글과 명작 동시가 첫날 · ✍️ 둘은 다른 날 · 이어질 내용은 끝', () => {
  const b = DRIP.bundles.find((x) => x.key === 'b382');
  assert.equal(b.after, 'b380');
  assert.deepEqual(b.order.slice().sort(), NEW.slice().sort(), '묶음 = 이번 글 열둘');
  assert.deepEqual(b.order.slice(0, 2), ['K189', 'K185'], '첫날 — 꾸꾸리 · 겨울');
  assert.equal(b.order[b.order.length - 1], 'K190', '6단원 이어질 내용(12월 진도)은 끝');
  const dayOf = (id) => Math.floor(b.order.indexOf(id) / DRIP.perDay);
  assert.notEqual(dayOf('K183'), dayOf('K185'), '✍️ 생각 쓰기 둘은 다른 날');
  assert.ok(read('sw.js').includes("'./js/kordrip.js'"), '앱 셸');
});
