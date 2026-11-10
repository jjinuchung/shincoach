// 📘 4학년 2학기 국어 글 여덟째 묶음 v389 (2026-11-03 아버님 「국어 여덟째 묶음과 논술 여덟째 묶음 지금 하자」 → 기본안 「추천대로」): K191~K202
//  · 일곱째 묶음이 다 열린 다음 날(11월 28일쯤)부터 읽게 되니 동지·크리스마스·겨울방학·한 해 마무리 · 진도 6단원 넷 + 독서·매체 둘씩 + 1·2·3·5단원 하나씩
//  · 사실은 원문·공공 자료와 대조(연세대 윤동주기념관 원문제공 · 덴마크어 원문 「Sneemanden」 · 『한국민속문학사전』·한국민족문화대백과 · 한국천문연구원 ·
//    국립민속박물관 · 행정안전부 얼음낚시 안전요령 · 국립수산과학원 연구관 글 · 포켓몬코리아 공식 도감·PokeAPI · 표준국어대사전) · 📖 낱말 표준국어대사전 대조(일곱 고침 · 함정 뺌)
//  · 📦 묶음 b389는 b382가 다 열린 다음 날부터 하루 두 편(js/kordrip.js after — tests/kordrip389.test.js)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkContent, validCards, lineCount, gateAtOf } from '../js/korean.js';
import { DRIP } from '../js/kordrip.js';
import { writesOf, mergeWrites, writeTodo } from '../js/korwrite.js';
import { koreanFiles } from '../js/upload.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const DATA = JSON.parse(read('coach/korean/reading.json'));
const UNITS = JSON.parse(read('coach/korean/units.json')).units;
const WORDS = JSON.parse(read('coach/korean/words.json'));
const IDS = DATA.cards.map((c) => c.id);
const card = (id) => DATA.cards.find((c) => c.id === id);
const NEW = Array.from({ length: 12 }, (_, i) => `K${191 + i}`);
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
/** 4-2 단원마다 이어진 성취기준 (kornew382 LINK4와 같음) */
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

test('📘 여덟째 묶음 열둘 (v389): 연습 아홉 + ✨ 명작 셋 · 물음 서른여섯(셋씩) · 원고 검사 통과 · 7~12줄(동시는 원문 다섯 줄) · ✍️ 둘 · 두 친구의 글·모둠 대화는 줄마다 · 바탕 글 여섯', () => {
  assert.deepEqual(checkContent(DATA), []);
  assert.deepEqual(IDS.slice(190, 202), NEW); // v411 아홉째·열째 묶음이 뒤에 이어짐
  assert.equal(validCards(DATA).length, 226); // · v411 아홉째·열째 묶음 스물넷 더함
  assert.deepEqual(NEW.map((id) => [card(id).kind, card(id).genre]), [
    ['practice', '발표 준비 메모'], ['classic', '동시'], ['practice', '의견을 제시하는 글 두 편'], ['practice', '보고하는 글'], ['practice', '제안하는 글'], ['practice', '발표하는 글'],
    ['practice', '모둠 대화'], ['practice', '카드'], ['practice', '어린이 과학 방송'], ['practice', '설명하는 글'], ['classic', '동화'], ['classic', '옛이야기']]);
  assert.deepEqual(['K192', 'K201', 'K202'].map((id) => card(id).author), ['윤동주', '안데르센 · 신코치가 다시 씀', '지은이 모름 · 신코치가 다시 씀']);
  assert.ok(NEW.every((id) => card(id).qs.length === 3), '4학년 글은 물음 셋');
  assert.equal(QS.length, 36);
  assert.deepEqual(NEW.filter((id) => lineCount(card(id)) < 7 || lineCount(card(id)) > 12), ['K192'], '짧게 — 7~12줄 · 윤동주 「호주머니」만 원문 그대로 다섯 줄');
  assert.equal(lineCount(card('K192')), 5);
  assert.deepEqual(NEW.filter((id) => card(id).write), ['K195', 'K202']);
  for (const id of ['K195', 'K202']) {
    const w = card(id).write;
    assert.equal(w.v, 1, id);
    assert.equal(w.rubric.must.length, 3, id);
    assert.ok(w.rubric.miss.some((m) => /맞춤법/.test(m)), `${id} 맞춤법은 채점하지 않는다`);
    assert.ok(w.frames.every((f) => f.endsWith('~') && f.split('~').length === 2), `${id} 문장 틀은 빈자리 하나가 끝에 (Codex 53차 #4)`);
    assert.ok(![...w.rubric.ok, ...w.rubric.miss].some((l) => /이상|이하/.test(l)), `${id} 등급은 하나로 (Codex 52차 #6)`);
  }
  assert.deepEqual(NEW.filter((id) => card(id).layout === 'rows'), ['K193', 'K197']);
  assert.deepEqual(NEW.filter((id) => card(id).source), ['K191', 'K194', 'K195', 'K196', 'K199', 'K200']);
  for (const id of ['K191', 'K194', 'K195', 'K196', 'K199', 'K200']) assert.match(card(id).source, /신코치가 [^.]* 새로 썼어요\.$/, id);
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(read('sw.js')) || [])[1]) >= 389, '원고는 앱 셸 — sw v389 이상');
});

test('📘 단원 (v389): 새 글은 4-2 단원 하나씩 · 만나는 곳은 그 단원 · 첫 성취기준은 그 단원 것 · 공식 문구 · 소단원 차례 · 4-2 단원마다 아홉 편 넘게', () => {
  // 공식 문구 — 옛 원고(kornew298이 공식 문구와 대조해 둔 것)의 같은 번호와 글자까지 같다
  const STD = new Map(DATA.cards.filter((c) => Number(c.id.slice(1)) <= 190).flatMap((c) => c.meta.map((s) => [(/^\[(4국\d\d-\d\d)\]/.exec(s) || [])[1], s]).filter(([k]) => k)));
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
  const of = (uid) => UNITS.find((u) => u.id === uid).cards;
  assert.deepEqual(of('4-2-독서'), ['K197', 'K143', 'K178', 'K192', 'K118', 'K144', 'K165', 'K131', 'K179', 'K206', 'K205'], '책 고르기가 맨 앞 → 읽기 전 질문 → …');
  assert.deepEqual(of('4-2-1'), ['K132', 'K145', 'K181', 'K207', 'K107', 'K119', 'K146', 'K174', 'K180', 'K193', 'K208'], '① 작품과 내 경험 → ② 다른 의견 비교');
  assert.deepEqual(of('4-2-2'), ['K108', 'K133', 'K164', 'K176', 'K109', 'K134', 'K175', 'K182', 'K194', 'K209', 'K210'], '① 한글 → ② 보고하는 글');
  assert.deepEqual(of('4-2-3'), ['K111', 'K147', 'K173', 'K211', 'K110', 'K120', 'K148', 'K183', 'K195', 'K212', 'K166'], '① 토의 → ② 제안하는 글 · 고쳐 쓰기는 끝');
  assert.deepEqual(of('4-2-매체'), ['K122', 'K177', 'K191', 'K203', 'K121', 'K184', 'K196', 'K213', 'K150', 'K135', 'K149']);
  assert.deepEqual(of('4-2-5'), ['K114', 'K126', 'K137', 'K188', 'K138', 'K159', 'K160', 'K171', 'K115', 'K127', 'K139', 'K161', 'K170', 'K187', 'K198', 'K128'], '① 대화 → ② 편지');
  assert.deepEqual(of('4-2-6'), ['K116', 'K130', 'K140', 'K142', 'K153', 'K154', 'K157', 'K158', 'K167', 'K169', 'K189', 'K199', 'K200', 'K117', 'K129', 'K141', 'K152', 'K156', 'K155', 'K168', 'K190', 'K201', 'K202', 'K214'], '① 원인과 결과 → ② 이어질 내용 상상');
  // 일곱·여덟 편이던 단원(독서·1·2·3·매체)을 채워 4-2 단원이 모두 아홉 편 넘게 — 기본안에서 말한 것
  for (const u of UNITS.filter((x) => x.term === '4-2')) assert.ok(u.cards.length >= 9, `${u.id} ${u.cards.length}`);
  assert.match(JSON.parse(read('coach/korean/units.json')).about, /v389 여덟째 묶음/);
});

test('📘 물음 (v389): 지어내기 보기 · 정답만 길지 않게 · 근거 풀이 줄은 근거로도 받음 · 낱말 풀이를 정답에 옮기지 않음 · 정답 자리 고르게 · 🧠 없음', () => {
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
  assert.ok(QS.filter((x) => /원인과 결과|까닭/.test(x.skill)).length >= 8, '까닭(원인과 결과) 물음을 넉넉히');
  // 의견을 뒷받침하는 사실(K193-2)의 틀린 보기에 「사실·의견 헷갈리기」 · 보고서(K194)의 글에는 줄 번호와 헷갈리는 동그라미 숫자가 없다
  assert.equal(q('K193-2').opts.filter((o) => o.type === 'fo').length, 1);
  assert.ok(!/[①-⑳]/.test(body('K194')), 'K194 글 안에 동그라미 숫자 없음');
});

test('🔍 근거 줄 (v389): 정답을 바로 받치는 줄만 · 근거부터(첫 근거 물음)는 근거 줄이 둘인 물음을 넉넉히(korsay363 넷 중 셋 기준)', () => {
  const want = {
    'K191-1': [3, 5], 'K191-2': [2], 'K191-3': [7],
    'K192-1': [1], 'K192-2': [5], 'K192-3': [5],
    'K193-1': [3, 6], 'K193-2': [4], 'K193-3': [7],
    'K194-1': [1], 'K194-2': [5], 'K194-3': [3],
    'K195-1': [3, 4], 'K195-2': [5], 'K195-3': [8],
    'K196-1': [4], 'K196-2': [7], 'K196-3': [8],
    'K197-1': [3], 'K197-2': [7], 'K197-3': [8],
    'K198-1': [3, 5], 'K198-2': [2, 9], 'K198-3': [6],
    'K199-1': [4], 'K199-2': [6], 'K199-3': [6],
    'K200-1': [3, 8], 'K200-2': [4], 'K200-3': [8],
    'K201-1': [6, 8], 'K201-2': [10], 'K201-3': [11],
    'K202-1': [3, 4], 'K202-2': [5, 6], 'K202-3': [8, 10],
  };
  assert.equal(Object.keys(want).length, 36);
  for (const [id, e] of Object.entries(want)) assert.deepEqual(q(id).ev, e, id);
  const multi = NEW.filter((id) => new Set(card(id).qs[gateAtOf(card(id), 1)].ev).size > 1);
  assert.ok(multi.length >= 7, `근거부터 물음에 근거 줄이 둘인 글 ${multi.length}/12`);
  assert.equal(card('K200').qs[gateAtOf(card('K200'), 1)].skill, '짐작하기', 'K200은 글 전체로 짐작하는 물음(③⑧)이 근거부터 — korsay363 비율(Codex 192차)');
  // 「호주머니」의 ② 「걱정이던」은 마음만, ④ 「겨울만 되면」은 때만 말해 혼자서는 답을 받치지 않는다 (Codex 192차)
  assert.ok(!q('K192-1').ev.includes(2) && !q('K192-2').ev.includes(4) && !q('K192-3').ev.includes(4));
  // 동지 — ③(낮 길이 비교)은 까닭이 아니다 · 「그래서」로 시작하는 결과 줄(⑤·⑦)만 눌러 통과하지 않게 (Codex 192차)
  assert.ok(!q('K199-1').ev.includes(3) && !q('K199-1').ev.includes(5) && !q('K199-3').ev.includes(7));
  // 딜리버드 — ③만 눌러도 뺀 까닭(확인한 곳이 없음)이 그 줄에 있다 (Codex 192차)
  assert.match(lines('K191')[2], /누가 썼는지, 어디서 확인했는지 나와 있지 않은 누리집 글/);
});

test('✍️ 생각 쓰기 (v389): 구피 제안 — 선생님 걱정에 답하기(옮기는 법은 자료대로) · 토끼의 재판 — 문이 닫힌 뒤 장면', () => {
  const a = card('K195').write;
  assert.match(a.q, /걱정하셨어요/);
  assert.match(a.q, /이 걱정에 답하는 말/);
  assert.ok(a.rubric.must[1].includes('옮길 때'));
  assert.ok(a.model.includes('어항째 들지 않고') && a.model.includes('원래 어항 물'), '예시 답의 옮기는 법 — 물 든 어항째 들지 않기 · 원래 물로 옮기기(머크·Aqueon)');
  const b = card('K202').write;
  assert.match(b.q, /함정의 문이 닫힌 뒤/);
  assert.ok(b.rubric.miss[0].startsWith('함정과 상관없는 새 이야기 — 🔁'));
  assert.ok(b.model.startsWith('토끼가 '));
});

test('🏛️ 사실 대조 (v389): 호주머니 원문 · 토끼의 재판 · 눈사람 덴마크어 원문 · 딜리버드·알로라 식스테일 도감 · 동지 · 빙어·얼음 · 흉내 내는 말 — 쓰지 않기로 한 것은 정말 빠졌나', () => {
  // ✨ 윤동주 「호주머니」 — 연세대 윤동주기념관 원문제공 098 현대어 표기 그대로(「두개」 붙여 씀 · 「갑북 갑북」 띄어 씀 · 끝에만 마침표)
  assert.deepEqual(card('K192').stanzas, [['넣을 것 없어', '걱정이던', '호주머니는'], ['겨울만 되면', '주먹 두개 갑북 갑북.']]);
  for (const s of ['1936년 12월쯤', '연세대학교 윤동주기념관', '1955년', '우리말샘', '평안북도']) assert.ok(JSON.stringify(card('K192').facts).includes(s), `K192 ${s}`);
  assert.ok(!card('K192').qs.some((x) => /갑북/.test(x.q + JSON.stringify(x.opts.map((o) => o.t)))), '사전에 없는 「갑북」은 묻지 않는다');
  assert.match(fact('K192', '저작권'), /1945년에 세상을 떠나/);
  // ✨ 토끼의 재판 — 함정에서 꺼내 줌 → 말을 바꿈 → 황소 → 소나무 → 토끼 → 다시 함정 · 잡아먹는 장면 없음 · 공공 사전에 없는 「길」·「구덩이」·「궤짝」 없음
  const tk = body('K202');
  const torder = ['함정에 빠진 호랑이', '함정의 문을 열어', '말을 바꾸었다', '황소', '소나무', '토끼 한 마리', '함정 안으로 뛰어들었다'].map((w) => tk.indexOf(w));
  assert.ok(torder.every((x, i) => x >= 0 && (!i || x > torder[i - 1])), `K202 차례 ${torder}`);
  assert.ok(lines('K202').at(-1).endsWith('함정 안으로 뛰어들었다.'), 'K202 글은 호랑이가 다시 들어가는 데까지 — 문을 닫는 일은 물음의 답');
  assert.ok(!/잡아먹었|잡아먹혔|잡아먹힌|잡아먹은/.test(kidText('K202')), '잡아먹는 장면 없음(아버님 「순하게」 · 변이 검사가 「잡아먹은」을 찾음)');
  assert.ok(!/길에게|구덩이|궤짝/.test(kidText('K202')));
  for (const s of ['한국민속문학사전', '은혜 모르는 호랑이', '문을 닫게']) assert.ok(fact('K202', '원문').includes(s), `K202 ${s}`);
  // ✨ 눈사람 — 덴마크어 원문 차례 · 영어 번역에만 있는 말(개 이름 「Ami」)은 없음
  const sm = body('K201');
  const sorder = ['기와 조각', '바삭바삭', '늙은 개', '지하 방 난로', '사라져 버려', '난로만 그리워했다', '날씨가 풀려', '빗자루 자루 같은 막대', '난로 긁개', '봄 노래'].map((w) => sm.indexOf(w));
  assert.ok(sorder.every((x, i) => x >= 0 && (!i || x > sorder[i - 1])), `K201 차례 ${sorder}`);
  assert.ok(!/Ami|아미|난로 삽/.test(kidText('K201')));
  assert.match(fact('K201', '만나는 곳'), /1861년/);
  assert.match(fact('K201', '저작권'), /1875년에 세상을 떠나/);
  // 🐾 딜리버드 — 공식 도감 문장 그대로 · 타입·키·몸무게·진화 없음
  assert.ok(body('K191').includes('「꼬리로 먹이를 싸서 운반한다. 산에서 조난당한 사람에게 먹이를 나눠 주는 습성이 있다.」'));
  assert.ok(!/얼음 타입|비행 타입|키가|몸무게|진화/.test(kidText('K191')));
  // 🐾 알로라 식스테일 — 도감 문장만 · 털로 얼음 결정을 만드는 것은 알로라 나인테일 설명이라 쓰지 않음 · 타입·진화 돌 없음
  const vx = body('K200');
  for (const s of ['눈 덮인 산에 무리를 지어', '추운 곳에 적응하여', '영하 50도', '얼음 뭉치']) assert.ok(vx.includes(s), `K200 ${s}`);
  assert.ok(!/얼음 타입|불꽃 타입|얼음의돌|나인테일|결정/.test(kidText('K200')));
  // 🌙 동지 — 낮이 가장 짧다만 · 해가 가장 늦게 뜨는 날(12/31)·가장 일찍 지는 날(12/6~7)은 동지가 아니다 · 「하루 1분씩」 같은 수 없음
  const dj = body('K199');
  for (const s of ['12월 22일', '9시간 반', '14시간 반', '기울어진 채로', '가장 낮게', '조금씩 길어지기', '작은 설', '붉은 팥']) assert.ok(dj.includes(s), `K199 ${s}`);
  assert.ok(!/가장 늦게 (뜨|떠)|가장 일찍 (지|져)|1분씩|하루에 \d/.test(dj), '「떠요」·「져요」 꼴도 (변이 검사)');
  // 🎣 빙어 — 크기·사는 곳·찬물·얼음 두께 10cm · 바다와 강을 오간다는 말·축제 날짜 없음
  const bo = body('K196');
  for (const s of ['15cm 안팎', '오래된 저수지', '찬물을 좋아해서', '적어도 10cm', '구명조끼', '불 피우지 않기', '날이 풀리면']) assert.ok(bo.includes(s), `K196 ${s}`);
  assert.ok(!/바다와 강|축제|1[5-9]\s?cm 이상|[23]0\s?cm/.test(bo));
  // 👂 흉내 내는 말 — 사전에 그 뜻이 있는 말만 · 겨울 소리에 안 맞는 말(바스락·술술)은 없음
  const im = body('K194');
  for (const s of ['「뽀드득」', '「쌩쌩」', '「호호」', '「소복소복」', '「펄펄」', '「꽁꽁」', '「오들오들」', '‘보드득’보다 센 느낌']) assert.ok(im.includes(s), `K194 ${s}`);
  assert.ok(!/바스락|술술/.test(im));
  // 🐠 구피 — 물 온도 수치는 글에 쓰지 않는다(한국 공공 자료가 없어 「따뜻한 물에 사는 열대어」만)
  assert.ok(!/\d+\s?(도|°)/.test(body('K195')));
  // 📖 낱말 뜻 — 표준국어대사전 대조로 고친 것 · 「함정」은 사전 풀이(구덩이)가 글의 「함정의 문」과 맞지 않아 뺌
  assert.equal(word('K197', '차례'), '책이나 글 따위에서 벌여 적어 놓은 항목');
  assert.equal(word('K198', '천장'), '반자(방의 윗면)의 겉면');
  assert.equal(word('K191', '습성'), '같은 종의 동물에게 공통되는 생활 양식이나 행동 양식');
  assert.equal(word('K192', '호주머니'), '옷에 헝겊을 달거나 덧대어 돈, 소지품 따위를 넣도록 만든 부분');
  assert.equal(word('K194', '소리글자'), '말소리를 그대로 기호로 나타낸 문자');
  assert.equal(word('K199', '하지'), '이십사절기의 하나. 양력 6월 21일쯤으로, 북반구에서는 낮이 가장 길고 밤이 가장 짧다');
  assert.equal(word('K201', '긁개'), '무엇을 긁는 데 쓰는 기구');
  assert.equal(word('K202', '함정'), undefined);
  assert.equal(NEW.reduce((n, id) => n + card(id).words.length, 0), 19);
  // 집 식구는 아빠·엄마만 — 형제를 지어내지 않는다 · 옛 한글 글자 없음 · 빈칸 표시 없음
  for (const id of NEW) assert.ok(!/동생|누나|언니|오빠|형이랑|형과|형은|형이 |형제/.test(kidText(id)), `${id} 형제를 지어내지 않음`);
  for (const id of NEW) assert.ok(![...kidText(id)].some((ch) => (ch >= 'ㅤ' && ch <= '㆏') || (ch >= 'ᄀ' && ch <= 'ᇿ')), `${id} 옛 한글 글자 없음`);
  assert.deepEqual(NEW.filter((id) => /채움\)|채울 것|조사 뒤에|대조 기다림|TODO|TBD/.test(JSON.stringify(card(id)))), [], '빈칸 표시가 남지 않음');
});

test('🔁 겹침 (v389): 새 글 제목이 옛 글과 같지 않다 · 제목에 「」 없음 · 국어·논술에 있던 주제(숙제·교실 화분)와 앞 묶음 물음 꼴을 피함', () => {
  const old = DATA.cards.filter((c) => Number(c.id.slice(1)) <= 190);
  for (const id of NEW) assert.ok(!old.some((c) => c.title === card(id).title), `${id} 제목이 옛 글과 같음`);
  assert.deepEqual(NEW.filter((id) => /[「」]/.test(card(id).title)), [], '제목에 「」 없음 — 화면이 제목을 「」로 감싼다');
  assert.ok(!/숙제/.test(body('K193')), 'K193은 기본안의 방학 숙제 대신 — 숙제는 논술 N5·N95·N139·N148에 이미 넷');
  assert.ok(!/화분/.test(body('K195')), 'K195는 구피만 — 교실 화분은 K39·N147');
  assert.ok(!card('K193').qs.some((x) => /사실과 의견|같은 점/.test(x.skill)), 'K193은 K180·K174와 다른 물음');
  assert.ok(!card('K194').qs.some((x) => /알게 된 점|나눈 기준|차례/.test(x.skill)), 'K194는 K182·K134·K109와 다른 물음');
  assert.ok(!card('K198').qs.some((x) => /편지를 쓴 까닭|높임/.test(x.skill)), 'K198은 K115·K170·K126과 다른 물음');
});

test('📖 같이 안 낼 무리 (v389): 관찰 — 옛 무리(관찰한·들여다볼·들여다보다·눈여겨본)와 한 무리 · 긁개 — 도구', () => {
  assert.equal(WORDS.apart.length, 64); // v411이 셋 더함(kornew411)
  assert.deepEqual(WORDS.apart.slice(-5, -3), [['관찰', '관찰한', '들여다볼', '들여다보다', '눈여겨본'], ['도구', '긁개']]);
});

test('📦 여덟째 묶음 b389 (v389): 열둘 = 새 글 · b382 다음에 이어서 · 포켓몬 글과 명작 동시가 첫날 · ✍️ 둘은 다른 날 · 12월 6단원은 끝', () => {
  const b = DRIP.bundles.find((x) => x.key === 'b389');
  assert.equal(b.after, 'b382');
  assert.deepEqual(b.order.slice().sort(), NEW.slice().sort(), '묶음 = 이번 글 열둘');
  assert.deepEqual(b.order.slice(0, 2), ['K191', 'K192'], '첫날 — 딜리버드 · 호주머니');
  assert.deepEqual(b.order.slice(-4), ['K199', 'K200', 'K201', 'K202'], '6단원(12월 진도)은 끝');
  const dayOf = (id) => Math.floor(b.order.indexOf(id) / DRIP.perDay);
  assert.notEqual(dayOf('K195'), dayOf('K202'), '✍️ 생각 쓰기 둘은 다른 날');
  assert.ok(read('sw.js').includes("'./js/kordrip.js'"), '앱 셸');
});

test('✍️ 서술형 장부 상한 (v389): 국어 서술형 + 논술 짧은 글·내 이유가 400을 넘어 1000으로 — 원고가 더 늘어도 넉넉히', () => {
  assert.match(read('js/korwrite.js'), /const CARDS_MAX = 1000;/);
  const topics = JSON.parse(read('coach/korean/nonsul.json')).topics.length;
  const kw = DATA.cards.filter((c) => c.write).length;
  assert.ok(kw + topics * 2 <= 1000 - 200, `국어 서술형 ${kw} + 논술 ${topics} × 2 — 상한까지 200은 남게`);
  // 실제로 모든 카드에 글이 하나씩 있을 때 — 고쳐 읽기 · 병합 · 답장 기다리는 글 · 📤 korean/todo.json까지 하나도 안 빠진다 (Codex 192차: 400을 넘는 뒤 카드)
  const ids = [...DATA.cards.filter((c) => c.write).map((c) => c.id), ...Array.from({ length: topics }, (_, i) => `N${i + 1}`), ...Array.from({ length: topics }, (_, i) => `R${i + 1}`)];
  const T0 = Date.UTC(2026, 11, 1);
  const raw = Object.fromEntries(ids.map((id, i) => [id, { last: T0 + i, list: [{ at: T0 + i, day: 1, v: 1, text: `글 ${id}` }] }]));
  assert.ok(ids.length > 400, `카드 ${ids.length}`);
  assert.deepEqual(Object.keys(writesOf(raw)), ids);
  assert.deepEqual(Object.keys(mergeWrites(raw, {})).sort(), ids.slice().sort());
  const todo = writeTodo(raw, DATA.cards);
  assert.equal(todo.length, ids.length);
  const json = JSON.parse(koreanFiles(todo, '2026-12-01').find((f) => f.path === 'korean/todo.json').text);
  assert.equal(json.length, ids.length);
  assert.equal(json.at(-1).card, ids.at(-1), `마지막 카드 ${ids.at(-1)}까지`);
});
