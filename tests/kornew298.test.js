// 📘 4학년 2학기 국어 단원 글 열둘 v298 (2026-10-19, 아버님 "이대로 진행" — 12편 · 4-2를 단원 지도 맨 위에): K107~K118
//  · 지금 학교에서 배우는 2022 개정 국정 국어 4-2 — 단원은 경기도교육청 「2025 3~4학년 2학기 수업-평가 계획 예시 자료」 기준
//  · 교과서 수록 작품은 저작권 — 같은 단원 목표로 신코치가 새로 씀 · 명작은 저작권이 끝난 것만(윤동주 · 지은이 모를 옛이야기)
//  · 사실은 공공 자료와 대조(한국민족문화대백과 「훈민정음」·「바닷물이 짠 이유」 · 국립국어원 한글 제자 원리 · 위키문헌 1955년 판 · 위키백과 Ant)
//  · 4-2 매체 단원은 이번에 빼서 "준비 중"
//  · Codex 104차 반영(아버님 "이대로 반영"): 근거 줄 다섯(정답을 받치지 않는 줄 빼기 · 정답을 바로 받치는 줄 넣기) · K109-3 틀린 보기·풀이
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkContent, validCards, lineCount } from '../js/korean.js';
import { TERMS, TERM_LABEL, unitsOf, unitLabel, checkUnits } from '../js/korunits.js';
import { allWords } from '../js/korwords.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const DATA = JSON.parse(read('coach/korean/reading.json'));
const UNITS_DATA = JSON.parse(read('coach/korean/units.json'));
const UNITS = UNITS_DATA.units;
const WORDS = JSON.parse(read('coach/korean/words.json'));
const IDS = DATA.cards.map((c) => c.id);
const card = (id) => DATA.cards.find((c) => c.id === id);
const NEW = Array.from({ length: 12 }, (_, i) => `K${107 + i}`);
const QS = NEW.flatMap((id) => card(id).qs);
const CIRC = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
const nums = (s) => [...new Set([...String(s || '')].map((ch) => CIRC.indexOf(ch) + 1).filter((n) => n > 0))];
const bare = (s) => String(s).replace(/[\s.,!?'"·…—–\-()「」]/g, '');
const body = (id) => (card(id).lines || card(id).stanzas.flat()).join(' ');
/** 아이가 보는 글 전부 (글·낱말·물음·보기·풀이·생각 쓰기) */
const kidText = (id) => JSON.stringify({ ...card(id), meta: null, facts: null });

/** 2022 개정 3~4학년군 국어 성취기준 — 교육부 고시 제2022-33호 별책5 문구 그대로 (원고의 [4국…] 뒤 문구를 이것과 대조) */
const STD4 = {
  '4국01-01': '중요한 내용과 주제를 파악하며 듣고 그 내용을 요약한다.',
  '4국01-02': '원인과 결과의 관계를 고려하여 내용을 예측하며 듣고 말한다.',
  '4국01-03': '상황에 적절한 준언어⋅비언어적 표현을 활용하여 듣고 말한다.',
  '4국01-04': '상황과 상대의 입장을 이해하고 예의를 지키며 대화한다.',
  '4국01-05': '목적과 주제에 알맞게 자료를 정리하여 자신감 있게 발표한다.',
  '4국01-06': '주제에 적절한 의견과 이유를 제시하고 서로의 생각을 교환하며 토의한다.',
  '4국02-01': '글의 의미를 파악하며 유창하게 글을 읽는다.',
  '4국02-02': '문단과 글에서 중심 생각을 파악하고 내용을 간추린다.',
  '4국02-03': '질문을 활용하여 글을 예측하며 읽고 자신의 읽기 과정을 점검한다.',
  '4국02-04': '글에 나타난 사실과 의견을 구분하고 필자와 자신의 의견을 비교한다.',
  '4국02-05': '글이나 자료의 출처가 믿을 만한지 판단한다.',
  '4국02-06': '바람직한 읽기 습관을 형성하고 읽기에 대한 자신감을 기른다.',
  '4국03-01': '중심 문장과 뒷받침 문장을 갖추어 문단을 쓰고, 문장과 문단을 중심으로 고쳐 쓴다.',
  '4국03-02': '절차와 결과가 드러나게 정확한 표현으로 보고하는 글을 쓴다.',
  '4국03-03': '대상에 대한 자신의 의견과 그렇게 생각한 이유가 드러나게 글을 쓴다.',
  '4국03-04': '목적과 주제를 고려하여 독자에게 마음을 전하는 글을 쓴다.',
  '4국03-05': '자신의 쓰기 과정을 점검하며 쓰기에 자신감을 갖는다.',
  '4국04-01': '단어와 단어 간의 의미 관계를 파악한다.',
  '4국04-02': '단어를 분류하고 국어사전을 활용하여 능동적인 국어 활동을 한다.',
  '4국04-03': '기본적인 문장의 짜임을 이해하고 적절하게 사용한다.',
  '4국04-04': '글과 담화에 쓰인 높임 표현과 지시⋅접속 표현을 이해하고 상황에 맞게 표현한다.',
  '4국04-05': '언어가 의사소통과 관계 형성의 수단임을 이해하고 국어를 소중히 여기는 태도를 지닌다.',
  '4국05-01': '인물과 이야기의 흐름을 중심으로 작품을 감상한다.',
  '4국05-02': '자신의 경험을 바탕으로 작품 속 세계와 현실 세계를 비교하여 작품을 감상한다.',
  '4국05-03': '작품을 듣거나 읽고 마음에 드는 작품을 소개한다.',
  '4국05-04': '감각적 표현에 유의하여 작품을 감상하고, 감각적 표현을 활용하여 자신의 생각이나 감정을 표현한다.',
  '4국05-05': '재미나 감동을 느끼며 작품을 즐겨 감상하는 태도를 지닌다.',
  '4국06-01': '인터넷에서 학습에 필요한 다양한 자료를 탐색하고 목적에 맞게 자료를 선택한다.',
  '4국06-02': '매체를 활용하여 간단한 발표 자료를 만든다.',
  '4국06-03': '매체 소통 윤리를 고려하여 매체 자료를 활용하고 공유한다.',
};
/** 같은 예시 자료의 성취기준·단원 연결표 — 4-2 단원마다 이어진 성취기준 */
const LINK4 = {
  '4-2-독서': ['4국01-06', '4국02-04'],
  '4-2-1': ['4국05-02', '4국05-05', '4국02-04', '4국01-06'],
  '4-2-2': ['4국04-05', '4국02-02', '4국03-02', '4국06-01'],
  '4-2-3': ['4국01-06', '4국03-03', '4국03-01', '4국04-03'],
  '4-2-매체': ['4국06-02', '4국01-05'],
  '4-2-4': ['4국05-03', '4국05-05', '4국02-03'],
  '4-2-5': ['4국01-04', '4국03-04', '4국04-04', '4국04-05'],
  '4-2-6': ['4국01-02', '4국02-03', '4국05-01'],
};
const codesOf = (c) => c.meta.flatMap((m) => [...m.matchAll(/\[(4국0\d-0\d)\]/g)].map((x) => x[1]));

test('📘 4학년 2학기 글 열둘 (v298): 연습 열 + ✨ 명작 둘 · 물음 서른여섯(셋씩) · 원고 검사 통과 · 짧게(12줄까지) · ✍️ 둘 · 대화·댓글·두 사람의 글은 줄마다', () => {
  assert.deepEqual(checkContent(DATA), []);
  assert.deepEqual(IDS.slice(106, 118), NEW);
  assert.equal(validCards(DATA).length, 130); // v320 둘째 묶음 열둘 더함
  assert.deepEqual(NEW.map((id) => [card(id).kind, card(id).genre]), [
    ['practice', '의견을 제시하는 글 두 편'], ['practice', '설명하는 글'], ['practice', '보고하는 글'], ['practice', '제안하는 글'], ['practice', '토의(학급 회의)'],
    ['classic', '동시'], ['practice', '설명하는 글'], ['practice', '온라인 대화(댓글)'], ['practice', '편지'], ['practice', '어린이 뉴스'], ['classic', '옛이야기'], ['practice', '책을 소개하는 글']]);
  assert.deepEqual([card('K112').author, card('K117').author], ['윤동주', '지은이 모름 · 신코치가 다시 씀']);
  assert.ok(NEW.every((id) => card(id).qs.length === 3), '4학년 글은 물음 셋');
  assert.equal(QS.length, 36);
  assert.ok(NEW.every((id) => lineCount(card(id)) >= 7 && lineCount(card(id)) <= 12), `짧게: ${NEW.map((id) => lineCount(card(id)))}`);
  assert.deepEqual(NEW.filter((id) => card(id).write), ['K110', 'K115']);
  for (const id of ['K110', 'K115']) {
    const w = card(id).write;
    assert.equal(w.v, 1, id);
    assert.equal(w.rubric.must.length, 3, id);
    assert.ok(w.rubric.miss.some((m) => /맞춤법/.test(m)), `${id} 맞춤법은 채점하지 않는다`);
  }
  assert.deepEqual(NEW.filter((id) => card(id).layout === 'rows'), ['K107', 'K111', 'K114']);
  assert.ok(!NEW.some((id) => card(id).source), '바탕 글이 없는 새 글 — source 없음');
  // 원고는 앱 셸에 들어 있어(cache-first) 판을 올려야 기기가 새 글을 받는다
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(read('sw.js')) || [])[1]) >= 298, 'sw는 v298 이상');
});

test('📘 단원 지도 (v298): 4-2 여덟 단원이 맨 위(2022 개정 국정 4-2) · 학기 이름표 · 새 글은 소단원 차례로 한 단원에 · 매체는 v320에서 채움 · 검사가 잡는 것', () => {
  assert.deepEqual(TERMS, ['4-2', '5-1', '5-2']);
  assert.deepEqual(TERM_LABEL, { '4-2': '4학년 2학기 — 지금 배우는 학기', '5-1': '5학년 1학기', '5-2': '5학년 2학기' });
  assert.deepEqual(UNITS.slice(0, 8).map((u) => [u.id, u.term, u.no, u.title]), [
    ['4-2-독서', '4-2', '독서', '생각을 나누며 책을 읽어요'], ['4-2-1', '4-2', '1', '비교하며 읽어요'], ['4-2-2', '4-2', '2', '우리말 우리글'], ['4-2-3', '4-2', '3', '의견을 모아서'],
    ['4-2-매체', '4-2', '매체', '자료를 활용하여 발표해요'], ['4-2-4', '4-2', '4', '책 속의 길을 따라'], ['4-2-5', '4-2', '5', '오가는 마음'], ['4-2-6', '4-2', '6', '상상의 날개']]);
  assert.ok(!UNITS.slice(0, 8).some((u) => /이어질 장면을 생각해요|바르고 공손하게/.test(u.title)), '2015 개정판 4-2 단원 이름과 헷갈리지 않는다');
  assert.deepEqual(UNITS.slice(0, 8).map((u) => u.cards), [['K118'], ['K107', 'K119'], ['K108', 'K109'], ['K111', 'K110', 'K120'], ['K122', 'K121'], ['K112', 'K123', 'K124', 'K113', 'K125'], ['K114', 'K126', 'K115', 'K127', 'K128'], ['K116', 'K130', 'K117', 'K129']], '소단원 차례(①이 먼저)');
  for (const id of NEW) assert.equal(UNITS.filter((u) => u.cards.includes(id)).length, 1, `${id} 단원 하나`);
  assert.deepEqual(checkUnits(UNITS_DATA, DATA.cards, WORDS), []);
  const units = unitsOf(UNITS_DATA, validCards(DATA), allWords(WORDS, DATA.cards));
  assert.equal(units[0].term, '4-2', '지금 배우는 학기가 맨 위');
  assert.equal(unitLabel(units.find((u) => u.id === '4-2-매체')), '📺 매체 단원 「자료를 활용하여 발표해요」');
  assert.equal(unitLabel(units.find((u) => u.id === '4-2-독서')), '📖 독서 단원 「생각을 나누며 책을 읽어요」');
  assert.match(UNITS_DATA.source, /4학년 2025 · 5학년 2026/);
  const bad = JSON.parse(JSON.stringify(UNITS_DATA));
  bad.units[0].term = '4-1';
  assert.ok(checkUnits(bad, DATA.cards, WORDS).some((e) => /term은 4-2 · 5-1 · 5-2/.test(e)), '모르는 학기는 막는다');
  // 화면: 📘 탭 제목·소개·학기 머리
  const tabs = read('js/kortabs.js');
  assert.ok(tabs.includes("el('h2', 'kor-h', '📘 국어 단원 지도')") && tabs.includes('지금 배우는 4학년 2학기와 내년 5학년 국어책의 단원이에요.'));
  assert.ok(tabs.includes("box.appendChild(el('h3', 'kor-term', TERM_LABEL[term] || term));"));
});

test('📘 성취기준 (v298): 원고의 [4국…] 뒤 문구는 3~4학년군 공식 문구 그대로 · 새 글의 성취기준은 모두 4-2에 이어진 것 · 그 글의 단원과 이어진 것이 하나 이상', () => {
  assert.equal(Object.keys(STD4).length, 30);
  let checked = 0;
  for (const c of DATA.cards) for (const m of c.meta) for (const x of m.matchAll(/\[(4국0\d-0\d)\]\s*([^·[]*)/g)) {
    assert.ok(Object.hasOwn(STD4, x[1]), `${c.id} ${x[1]} 모르는 성취기준`);
    assert.ok(x[2].trim().startsWith(STD4[x[1]]), `${c.id} ${x[1]} 문구 — ${x[2]}`);
    checked++;
  }
  assert.equal(checked, 41, '새 글 열둘의 18 · 🎧 듣기 K37·K40의 [4국01-01] 둘(v245) · v320 둘째 묶음 열둘의 21');
  const linked = new Set(Object.values(LINK4).flat());
  for (const id of NEW) {
    const codes = codesOf(card(id));
    assert.ok(codes.length, `${id} 성취기준`);
    assert.ok(!card(id).meta.some((m) => /\[6국/.test(m)), `${id} 5~6학년 성취기준이 섞이지 않게`);
    for (const k of codes) assert.ok(linked.has(k), `${id} ${k} — 4-2 단원과 이어진 성취기준`);
    const unit = UNITS.find((u) => u.cards.includes(id)).id;
    assert.ok(codes.some((k) => LINK4[unit].includes(k)), `${id} 단원 ${unit} — 그 단원과 이어진 성취기준이 하나 이상`);
    assert.match(card(id).meta[0], new RegExp(`^만나는 곳: 4-2 ${unit.slice(4) === '독서' ? '독서 단원' : `${unit.slice(4)}단원`} 「${UNITS.find((u) => u.id === unit).title}」`), `${id} 만나는 곳은 그 단원`);
  }
});

test('📘 물음 (v298): 물음마다 지어내기 보기 · 정답만 유난히 길지 않게 · 근거 풀이가 짚는 줄은 근거로도 받음 · 근거가 없는 물음은 K111-3(문장의 짜임)뿐 · 낱말 풀이를 정답에 옮기지 않음 · 중심 정답은 글을 그대로 옮기지 않음', () => {
  for (const q of QS) {
    assert.ok(q.opts.some((o) => o.type === 'make'), `${q.id} 지어내기 보기`);
    const len = q.opts.map((o) => [...o.t].length);
    const k = q.opts.findIndex((o) => o.ok);
    const other = Math.max(...len.filter((_, i) => i !== k));
    assert.ok(len[k] <= other * 1.3, `${q.id} 정답 보기 길이 ${len[k]} — 가장 긴 틀린 보기 ${other}`);
    if (q.ev) assert.deepEqual(nums(q.evNote).filter((n) => !q.ev.includes(n)), [], `${q.id} 근거 풀이가 쓰는 줄은 근거로도 받는다`);
    else assert.ok(q.hint2 && q.doneNote, `${q.id} 둘째 힌트·풀이`);
  }
  assert.deepEqual(QS.filter((q) => !q.ev).map((q) => q.id), ['K111-3']);
  for (const id of NEW) {
    const c = card(id);
    for (const q of c.qs) {
      const ok = bare(q.opts.find((o) => o.ok).t);
      for (const [, m] of c.words) for (const part of m.split(' — ')) assert.ok(!(bare(part).length >= 6 && ok.includes(bare(part))), `${q.id} 정답에 낱말 풀이 그대로 — ${part}`);
      if (/중심/.test(q.skill)) assert.ok(!(c.lines || c.stanzas.flat()).some((l) => bare(l).includes(ok)), `${q.id} 중심 정답이 글 그대로`);
    }
  }
  // 정답 자리가 한쪽으로 몰리지 않게 (보기는 화면이 섞지만 원고도 고르게)
  const at = [0, 0, 0, 0];
  for (const q of QS) at[q.opts.findIndex((o) => o.ok)]++;
  assert.ok(Math.max(...at) <= 14, `정답 자리 ${at}`);
});

test('🏛️ 사실 대조 (v298): 한글 원리·윤동주 원문·개미·옛이야기·어린 왕자는 공공 자료와 대조한 것만 · 집 식구를 지어내지 않음 · 옛 한글 글자 없음', () => {
  // 한글 — 1443 창제 · 1446 훈민정음으로 알림 · 자음 다섯은 발음 기관 · 획을 더함(된소리는 획을 더한 글자가 아니라 쓰지 않음) · 하늘·땅·사람 · 28자 → 24자 · 10월 9일
  const h = body('K108');
  for (const s of ['1443년', '1446년에 훈민정음', 'ㄱ에 획을 더해 ㅋ', '하늘과 땅과 사람', '스물여덟 자', '스물넉 자', '10월 9일']) assert.ok(h.includes(s), `K108 ${s}`);
  assert.ok(!/ㄲ|ㄸ|된소리/.test(h), 'K108 된소리를 획을 더한 글자로 쓰지 않는다');
  // 윤동주 「귀뚜라미와 나와」 — 1955년 판(위키문헌 페이지 133·134 · 인쇄 130~131쪽)을 오늘 맞춤법으로
  assert.deepEqual(card('K112').stanzas, [
    ['귀뚜라미와 나와', '잔디밭에서 이야기했다.'], ['귀뚤귀뚤', '귀뚤귀뚤'], ['아무에게도 가르쳐 주지 말고', '우리 둘만 알자고 약속했다.'], ['귀뚤귀뚤', '귀뚤귀뚤'], ['귀뚜라미와 나와', '달 밝은 밤에 이야기했다.']]);
  const f112 = Object.fromEntries(card('K112').facts);
  assert.match(f112['원문'], /1955년 판\(130~131쪽\)/);
  for (const s of ['귀뜨라미 → 귀뚜라미', '귀뜰귀뜰 → 귀뚤귀뚤', '아무게도 → 아무에게도', '아르켜 → 가르쳐']) assert.ok(f112['원문'].includes(s), `K112 바꾼 것 ${s}`);
  assert.ok(!/1948/.test(JSON.stringify(card('K112').facts)), '첫 판(1948)에 실렸는지는 확인 못 해 쓰지 않는다');
  assert.match(f112['저작권'], /1945년에 세상을 떠나/);
  // 개미 — 모든 개미가 아니라 무리 지어 먹이를 찾는 많은 개미 · 돌아가는 길에 냄새 · 먹이가 떨어지면 천천히 사라짐
  const a = body('K113');
  assert.ok(a.includes('많은 개미는 냄새로') && !a.includes('모든 개미') && a.includes('돌아가는 길에') && a.includes('천천히 사라지고'));
  // 「바닷물은 왜 짤까」 — 한국 판(임금과 도둑) · 멈추는 법을 모르는 데서 글이 끝남(뒷이야기는 풀이에서) · 여러 나라에도 있음
  const s117 = body('K117');
  assert.ok(s117.includes('임금') && s117.includes('도둑') && s117.includes('「소금 나와라.」'));
  assert.equal(card('K117').lines[card('K117').lines.length - 1], '그런데 도둑은 맷돌을 멈추게 하는 방법을 알지 못했다.');
  assert.ok(!/가라앉/.test(s117), '배가 가라앉는 끝은 글에 없다 — 이어질 내용 짐작');
  assert.match(card('K117').qs[1].evNote, /가라앉고/);
  assert.match(Object.fromEntries(card('K117').facts)['만나는 곳'], /여러 나라/);
  assert.match(Object.fromEntries(card('K117').facts)['저작권'], /^지은이를 알 수 없는 옛이야기/);
  // 어린 왕자 — 1943년 · 사하라 사막 · 양 · 장미 · 여러 별 · 여우와 길들이기 (번역본 문장은 옮기지 않고 소개 글로)
  const p = body('K118');
  for (const s of ['1943년', '사하라 사막', '양을 한 마리', '장미꽃', '여러 별', '여우', '길들이면']) assert.ok(p.includes(s), `K118 ${s}`);
  // 집 식구를 지어내지 않음 · 옛 한글(아래아 등)은 태블릿 글꼴에서 깨진다 — 가운뎃점으로
  for (const id of NEW) {
    assert.ok(!/동생|형이|형과|누나|언니|오빠/.test(kidText(id)), `${id} 형제를 지어내지 않음`);
    assert.ok(![...kidText(id)].some((ch) => (ch >= 'ㅤ' && ch <= '㆏') || (ch >= 'ᄀ' && ch <= 'ᇿ')), `${id} 옛 한글 글자 없음`);
  }
  assert.ok(h.includes('점(·)'), '아래아 대신 점(·)');
});

test('🔍 Codex 104차 (v298): 근거는 정답을 바로 받치는 줄만(앱은 한 줄만 눌러도 통과) · 정답을 바로 말하는 중심 줄은 빠짐없이 · K109-3 틀린 보기 풀이가 글과 어긋나지 않게', () => {
  const q = (id) => QS.find((x) => x.id === id);
  const line = (id, n) => (card(id).lines || card(id).stanzas.flat())[n - 1];
  // 같은 글의 다른 말·다른 결과는 빼기 — ⑥ 그림을 한 달마다 바꾸기 · ⑦ 보건실 · ⑦ 눈에 보이지 않는 것
  assert.deepEqual(q('K111-2').ev, [5, 7]);
  assert.match(line('K111', 6), /한 달마다/);
  assert.deepEqual(q('K116-2').ev, [6]);
  assert.match(line('K116', 7), /보건실/);
  assert.deepEqual(q('K118-2').ev, [6]);
  assert.match(line('K118', 7), /눈에 보이지 않는다/);
  // 정답을 바로 받치는 줄은 받기 — ③ 냄새로 길을 찾는다 · ⑤ "네 기분이 상했겠다"
  assert.deepEqual(q('K113-2').ev, [3, 4, 6]);
  assert.match(line('K113', 3), /냄새로 길을 찾는다/);
  assert.deepEqual(q('K114-2').ev, [3, 4, 5]);
  assert.match(line('K114', 5), /기분이 상했겠다/);
  // K109-3 — ③에 조사 기간(닷새)이 있으니 "시간 이야기는 글에 없다"는 틀린 풀이 · 보기를 돈 하나로
  assert.match(line('K109', 3), /닷새 동안/);
  const money = q('K109-3').opts.find((o) => o.type === 'make');
  assert.equal(money.t, '조사하는 데 든 돈');
  assert.ok(!/시간/.test(money.t + money.why), 'K109-3 지어내기 보기·풀이에 시간을 넣지 않는다');
  assert.ok(!/돈/.test(body('K109')), '돈 이야기는 정말 글에 없다');
});
