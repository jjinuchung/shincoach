// 📘 4학년 2학기 국어 글 넷째 묶음 v347 (2026-10-26 아버님 "국어 새 글 넷째 묶음을 먼저" → 기본안 → 원고 검수 "이대로"): K143~K154
//  · 셋째 묶음이 다 열린 다음 날부터(11월 초·중순) 읽게 되니 글이 적던 독서·1·3단원·📺 매체를 채우고 6단원(12월)에 셋
//  · 사실은 공공 자료와 대조(윤동주 1955년 판 스캔 · 『한국민속문학사전』·민족문화대백과·구비문학대계 · 이솝 그리스어 원문 · 서울아산병원·국가유산청 ·
//    서울시 동파 예방·서울대 과학교육연구소 · 기상청 정전기 · 표준국어대사전 · PokeAPI 한국어 도감)
//  · 📦 묶음 b347은 b322가 다 열린 다음 날부터 하루 두 편(js/kordrip.js after — tests/kordrip347.test.js)
//  · 기본안에서 옛 글과 꼴이 겹친 다섯을 바꿈: 혹부리 영감(≈K141) → 호랑이와 곶감 · 독서 대화(≈K131) → 독서 감상문 · 자료 고르기(≈K81·K88·K121·K122) → 발표 되돌아보기 ·
//    피츄 실수·격려(≈K132) → 피츄 정전기 원인 찾기 · 곶감 읽기 전 질문 → 뼈 과학책 독서 일기
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
const NEW = Array.from({ length: 12 }, (_, i) => `K${143 + i}`);
const QS = NEW.flatMap((id) => card(id).qs);
const q = (id) => QS.find((x) => x.id === id);
const CIRC = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
const nums = (s) => [...new Set([...String(s || '')].map((ch) => CIRC.indexOf(ch) + 1).filter((n) => n > 0))];
const bare = (s) => String(s).replace(/[\s.,!?'"·…—–\-()「」]/g, '');
const lines = (id) => card(id).lines || card(id).stanzas.flat();
const body = (id) => lines(id).join(' ');
const kidText = (id) => JSON.stringify({ ...card(id), meta: null, facts: null, source: null });
const fact = (id, k) => Object.fromEntries(card(id).facts)[k];
const word = (id, w) => Object.fromEntries(card(id).words)[w];
/** 4-2 단원마다 이어진 성취기준 (경기도교육청 예시 자료 연결표 — .context/korean_4_2/units.md)
 *  독서 단원에 02-03·02-06을 더함: 연결표는 01-06·02-04뿐이지만 K143은 같은 단원의 「읽기 전 질문」 차시라 질문하며 읽기(02-03)·읽기 습관(02-06)을 단다 */
const LINK4 = {
  '4-2-독서': ['4국01-06', '4국02-04', '4국02-03', '4국02-06'],
  '4-2-1': ['4국05-02', '4국05-05', '4국02-04', '4국01-06'],
  '4-2-3': ['4국01-06', '4국03-03', '4국03-01', '4국04-03'],
  '4-2-매체': ['4국06-02', '4국01-05'],
  '4-2-4': ['4국05-03', '4국05-05', '4국02-03'],
  '4-2-6': ['4국01-02', '4국02-03', '4국05-01'],
};

test('📘 넷째 묶음 열둘 (v347): 연습 열 + ✨ 명작 둘 · 물음 서른여섯(셋씩) · 원고 검사 통과 · 7~12줄 · ✍️ 둘 · 대화·토의·두 친구의 글은 줄마다 · 바탕 글 넷', () => {
  assert.deepEqual(checkContent(DATA), []);
  assert.deepEqual(IDS.slice(142), NEW);
  assert.equal(validCards(DATA).length, 154);
  assert.deepEqual(NEW.map((id) => [card(id).kind, card(id).genre]), [
    ['practice', '독서 일기'], ['practice', '독서 감상문'], ['practice', '이야기'], ['practice', '의견을 제시하는 글 두 편'], ['practice', '토의(학급 회의)'], ['practice', '제안하는 글'],
    ['practice', '모둠 대화'], ['practice', '발표하는 글'], ['classic', '동시'], ['classic', '옛이야기'], ['practice', '설명하는 글'], ['practice', '이야기']]);
  assert.deepEqual([card('K151').author, card('K152').author], ['윤동주', '지은이 모름 · 신코치가 다시 씀']);
  assert.ok(NEW.every((id) => card(id).qs.length === 3), '4학년 글은 물음 셋');
  assert.equal(QS.length, 36);
  assert.deepEqual(NEW.filter((id) => lineCount(card(id)) < 7 || lineCount(card(id)) > 12), [], '짧게 — 7~12줄');
  assert.deepEqual(NEW.filter((id) => card(id).write), ['K148', 'K152']);
  for (const id of ['K148', 'K152']) {
    const w = card(id).write;
    assert.equal(w.v, 1, id);
    assert.equal(w.rubric.must.length, 3, id);
    assert.ok(w.rubric.miss.some((m) => /맞춤법/.test(m)), `${id} 맞춤법은 채점하지 않는다`);
    assert.ok(w.frames.every((f) => f.endsWith('~') && f.split('~').length === 2), `${id} 문장 틀은 빈자리 하나가 끝에 (Codex 53차 #4)`);
  }
  assert.deepEqual(NEW.filter((id) => card(id).layout === 'rows'), ['K146', 'K147', 'K149']);
  assert.deepEqual(NEW.filter((id) => card(id).source), ['K143', 'K144', 'K150', 'K153']);
  for (const id of ['K143', 'K144', 'K150', 'K153']) assert.match(card(id).source, /신코치가 (독서 일기로 |독서 감상문으로 |발표하는 글로 )?(새로 )?썼어요\.$/, id);
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(read('sw.js')) || [])[1]) >= 347, '원고는 앱 셸 — sw v347 이상');
});

test('📘 단원 (v347): 새 글은 4-2 단원 하나씩 · 만나는 곳은 그 단원 · 성취기준은 그 단원과 이어진 것이 하나 이상 · 5~6학년 성취기준 없음 · 소단원 차례', () => {
  for (const id of NEW) {
    const us = UNITS.filter((u) => u.cards.includes(id));
    assert.equal(us.length, 1, `${id} 단원 하나`);
    const u = us[0];
    assert.equal(u.term, '4-2', `${id} 4학년 2학기`);
    const where = u.no === '매체' ? '매체 단원' : u.no === '독서' ? '독서 단원' : `${u.no}단원`;
    assert.match(card(id).meta[0], new RegExp(`^만나는 곳: 4-2 ${where} 「${u.title}」`), `${id} 만나는 곳`);
    const codes = card(id).meta.flatMap((m) => [...m.matchAll(/\[(4국0\d-0\d)\]/g)].map((x) => x[1]));
    assert.ok(codes.some((k) => LINK4[u.id].includes(k)), `${id} 단원 ${u.id}와 이어진 성취기준`);
    assert.ok(!card(id).meta.some((m) => /\[6국/.test(m)), `${id} 5~6학년 성취기준 없음`);
  }
  const of = (uid) => UNITS.find((u) => u.id === uid).cards;
  assert.deepEqual(of('4-2-독서'), ['K143', 'K118', 'K144', 'K131'], '읽기 전 질문 → 책 소개 → 글쓴이 생각과 내 생각 → 독서 토의');
  assert.deepEqual(of('4-2-1'), ['K132', 'K145', 'K107', 'K119', 'K146'], '① 작품을 현실·내 경험과 견주기 → ② 다른 의견 비교');
  assert.deepEqual(of('4-2-3'), ['K111', 'K147', 'K110', 'K120', 'K148'], '① 토의 → ② 제안하는 글');
  assert.deepEqual(of('4-2-매체'), ['K122', 'K121', 'K150', 'K135', 'K149'], '자료 고르기 → 자료로 발표 → 출처 밝히기 → 카드 뉴스 → 발표 되돌아보기');
  assert.deepEqual(of('4-2-4'), ['K112', 'K123', 'K136', 'K151', 'K124', 'K113', 'K125'], '① 시·이야기 → ② 질문으로 읽기');
  assert.deepEqual(of('4-2-6'), ['K116', 'K130', 'K140', 'K142', 'K153', 'K154', 'K117', 'K129', 'K141', 'K152'], '① 원인과 결과 → ② 이어질 내용 상상');
  assert.match(JSON.parse(read('coach/korean/units.json')).about, /v347 넷째 묶음/);
});

test('📘 물음 (v347): 지어내기 보기 · 정답만 길지 않게 · 근거 풀이 줄은 근거로도 받음 · 낱말 풀이를 정답에 옮기지 않음 · 중심 정답은 글 그대로가 아님 · 정답 자리 고르게 · 🧠 없음', () => {
  const at = [0, 0, 0, 0];
  for (const x of QS) {
    assert.ok(x.opts.some((o) => o.type === 'make'), `${x.id} 지어내기 보기`);
    const len = x.opts.map((o) => [...o.t].length);
    const k = x.opts.findIndex((o) => o.ok);
    at[k]++;
    const other = Math.max(...len.filter((_, i) => i !== k));
    assert.ok(len[k] <= other * 1.3, `${x.id} 정답 보기 길이 ${len[k]} — 가장 긴 틀린 보기 ${other}`);
    if (x.id === 'K150-3') continue;
    assert.ok(Array.isArray(x.ev) && x.ev.length, `${x.id} 근거`);
    assert.deepEqual(nums(x.evNote).filter((n) => !x.ev.includes(n)), [], `${x.id} 근거 풀이가 쓰는 줄은 근거로도 받는다`);
  }
  // K150-3 출처를 밝힌 까닭 — 글에 까닭이 직접 쓰여 있지 않아 📖 「출처」 뜻으로 푼다 → 근거 잡기 없이 둘째 힌트·풀이
  const s = q('K150-3');
  assert.equal(s.ev, null);
  assert.match(s.hint2, /출처/);
  assert.ok(!bare(s.hint2).includes(bare(s.opts.find((o) => o.ok).t)), '둘째 힌트는 정답을 말하지 않는다');
  assert.match(s.doneNote, /^출처는 말이나 자료가 나온 곳이에요\./);
  assert.equal(word('K150', '출처'), '말이나 자료가 나온 곳', '풀이와 낱말 뜻이 같은 말');
  for (const id of NEW) {
    const c = card(id);
    for (const x of c.qs) {
      const ok = bare(x.opts.find((o) => o.ok).t);
      for (const [, m] of c.words) for (const part of m.split(' — ')) assert.ok(!(bare(part).length >= 6 && ok.includes(bare(part))), `${x.id} 정답에 낱말 풀이 그대로 — ${part}`);
      if (/중심/.test(x.skill)) assert.ok(!lines(id).some((l) => bare(l).includes(ok)), `${x.id} 중심 정답이 글 그대로`);
    }
  }
  assert.deepEqual(at, [9, 9, 9, 9], '정답 자리 (화면에서는 섞어 보여 준다)');
  assert.deepEqual(QS.filter((x) => x.opts.some((o) => o.type === 'know')).map((x) => x.id), [], '🧠 아는 것으로 답하기 보기 없음');
});

test('🔍 근거 줄 (v347): 정답을 바로 받치는 줄만 — 원인·마음·까닭을 직접 말하는 줄 · 결론 줄', () => {
  const want = {
    'K143-1': [7], 'K143-2': [8], 'K143-3': [10],
    'K144-1': [5], 'K144-2': [7], 'K144-3': [9], // ⑤는 이솝의 생각만 — 「이웃을 돕는 마음을 더했다」는 ⑨ (Codex 151차 #1)
    'K145-1': [1], 'K145-2': [2], 'K145-3': [1, 7], // 서준이가 견준 장면 — 두고 옴(①)과 다시 만남(⑦)
    'K146-1': [3], 'K146-2': [4], 'K146-3': [8], // ⑦은 시력이 나쁜 친구가 있다는 사실뿐 — 먼저 앉자는 제안은 ⑧
    'K147-1': [5], 'K147-2': [7], 'K147-3': [9],
    'K148-1': [3, 5], 'K148-2': [4], 'K148-3': [6, 7],
    'K149-1': [2, 3], 'K149-2': [4, 5], 'K149-3': [6],
    'K150-1': [7], 'K150-2': [9],
    'K151-1': [3, 9], 'K151-2': [6, 12], 'K151-3': [1, 2, 4, 5], // 「쏘옥, 쏙, 쏙」 줄도 받는다 (Codex 151차 #2)
    'K152-1': [4], 'K152-2': [4], 'K152-3': [7], // K152-2 판단을 바꾼 사건은 ④ — ③만으론 곶감 반응을 모르고 ⑤는 물음을 되풀이 (Codex 151차 #1)
    'K153-1': [3, 6], 'K153-2': [3, 5], 'K153-3': [10],
    'K154-1': [4], 'K154-2': [6, 7], 'K154-3': [6], // ③은 서우 손끝 일 · ⑧은 가습기를 켠 행동뿐 (Codex 151차 #1)
  };
  assert.equal(Object.keys(want).length, 35);
  for (const [id, e] of Object.entries(want)) assert.deepEqual(q(id).ev, e, id);
  // 결과 줄은 근거가 아니다 — K149-3 민재의 제안(⑦)은 물음 그 자체 · K152-3 날이 밝음(⑧)은 달아난 뒤
  assert.ok(!q('K149-3').ev.includes(7) && !q('K152-3').ev.includes(8));
  // Codex 151차 #1 — 정답의 핵심을 말하지 않는 줄은 하나만 눌러도 통과하게 두지 않는다 · 풀이도 근거 줄 번호만
  for (const [id, n] of [['K144-3', 5], ['K146-3', 7], ['K152-2', 3], ['K152-2', 5], ['K154-1', 3], ['K154-3', 8]]) {
    assert.ok(!q(id).ev.includes(n), `${id} ${n}번 줄은 근거가 아님`);
    assert.ok(!nums(q(id).evNote).includes(n), `${id} 풀이에 ${n}번 줄 번호를 쓰지 않음`);
  }
});

test('🔍 Codex 151차 #2·#3·#4 (v347): 흉내 내는 말 줄을 근거로 받음 · 「솔솔」은 소리가 아니라 모양 · K145-1은 「이야기에 나온 일 가운데」', () => {
  const s = q('K151-3');
  for (const n of [2, 5]) assert.equal(lines('K151')[n - 1], '쏘옥, 쏙, 쏙,', `${n}번 줄은 「쏘옥, 쏙, 쏙」`);
  assert.ok(s.ev.includes(2) && s.ev.includes(5), '흉내 낸 말 줄을 누르면 틀렸다고 나오지 않는다');
  const whys = s.opts.filter((o) => !o.ok).map((o) => o.why).join(' ');
  assert.ok(!/바람 소리/.test(whys), '「솔솔」을 바람 소리라고 하지 않는다');
  assert.match(whys, /「솔솔」은 바람이 부드럽게 부는 모양/);
  assert.match(q('K145-1').q, /^이 이야기에 나온 일 가운데 현실 세계에서도 일어날 수 있는 일은/);
});

test('🏛️ 사실 대조 (v347): 윤동주 원문 · 호랑이와 곶감 줄거리 · 이솝 · 뼈 · 동파 · 정전기 · 잉어킹·피츄 도감 · 낱말 뜻 — 쓰지 않기로 한 것은 정말 빠졌나', () => {
  // ✨ 윤동주 「햇빛·바람」 — 1955년 정음사 판 134~135쪽 · 오늘 맞춤법: 침발러 → 침 발라 · 1연 「쏙.」 → 쉼표 · 「내다보려」·「빤짝」·끝 쉼표는 원문 그대로
  assert.deepEqual(card('K151').stanzas, [
    ['손가락에 침 발라', '쏘옥, 쏙, 쏙,', '장에 가는 엄마 내다보려', '문풍지를', '쏘옥, 쏙, 쏙,'],
    ['아침에 햇빛이 빤짝,'],
    ['손가락에 침 발라', '쏘옥, 쏙, 쏙,', '장에 가신 엄마 돌아오나', '문풍지를', '쏘옥, 쏙, 쏙,'],
    ['저녁에 바람이 솔솔,'],
  ]);
  for (const s of ['1955년', '침발러 → 침 발라', '쓴 날짜는 알려지지 않았어요']) assert.ok(JSON.stringify(card('K151').facts).includes(s), `K151 ${s}`);
  assert.ok(!/1938/.test(JSON.stringify(card('K151'))), 'K151 쓴 해(1938)는 근거가 없어 쓰지 않는다');
  assert.ok(!/반짝/.test(JSON.stringify(card('K151').stanzas)), 'K151 공유마당 본의 「반짝」이 아니라 1955년 판 「빤짝」');
  assert.match(fact('K151', '저작권'), /1945년에 세상을 떠나/);
  // ✨ 호랑이와 곶감 — 외양간에 숨음 · 「호랑이 온다」 · 「곶감 줄게」 · 어둠 속 소도둑 · 날이 밝아서야 · 나뭇가지 · 「이제 살았다」
  const g = body('K152');
  const order = ['외양간에 숨어', '호랑이 온다!', '곶감 줄게', '나보다 더 무서운 놈', '어둠 속에서 호랑이를 소인 줄 알고', '곶감이 등에 올라탄 줄', '날이 밝아', '나뭇가지를 붙잡고', '이제 살았다!'].map((w) => g.indexOf(w));
  assert.ok(order.every((x, i) => x >= 0 && (!i || x > order[i - 1])), `K152 차례 ${order}`);
  assert.ok(!/옜다|물어 간다|곶감이 떨어졌|겨울|외양간 옆|몸을 떨|곰|토끼/.test(kidText('K152')), 'K152 공공 자료에 없는 꾸밈 없음');
  assert.match(fact('K152', '원문'), /한국구비문학대계/);
  // 이솝 「매미와 개미」 — 겨울에 먹을 것을 청함 · 「노래를 불렀으니 겨울엔 춤」
  const a = body('K144');
  assert.ok(a.includes('곡식을 조금만 나누어 달라고') && a.includes('노래를 불렀으니, 겨울에는 춤이나 추지 그래?'));
  assert.match(card('K144').source, /매미와 개미/);
  // 뼈 — 어른 206개쯤 · 아기 300개쯤 · 자라며 붙어 줄어듦 · 출처는 확인된 두 곳
  const b = body('K143');
  assert.ok(b.includes('206개쯤') && b.includes('300개쯤') && b.includes('서로 붙어 하나가'));
  assert.ok(card('K143').source.includes('서울아산병원') && card('K143').source.includes('국가유산청') && !/서울대학교병원/.test(card('K143').source));
  // 동파 — 부피 10분의 1쯤 · 마른 헌 옷 · 수도꼭지를 조금
  const w = body('K153');
  for (const s of ['10분의 1쯤', '마른 헌 옷', '수도꼭지를 조금 틀어', '흐르는 물은 고여 있는 물보다 잘 얼지 않기']) assert.ok(w.includes(s), `K153 ${s}`);
  assert.ok(!/9%|9퍼센트|유리병/.test(kidText('K153')), 'K153 수는 「10분의 1쯤」 하나로 · 깨질 수 있는 유리병은 쓰지 않는다');
  // 정전기 — 건조한 날 전기가 쉽게 모인다(도감) · 스웨터를 벗을 때 머리카락 · 가습기
  const e = body('K154');
  for (const s of ['「공기가 건조한 날은 전기가 쉽게 모인다」', '털 스웨터를 벗을 때마다 머리카락이', '가습기를 켰다']) assert.ok(e.includes(s), `K154 ${s}`);
  // 🐾 잉어킹 — 「힘도 스피드도 거의 없다」 · 튀어오르기 하나 · 레벨 20 · 갸라도스 6.5미터 · 무서운 도감 문장(마을을 태움)은 없다
  const m = body('K150');
  for (const s of ['「힘도 스피드도 거의 없다」', '튀어오르기 하나뿐', '레벨 20', '6.5미터', '물웅덩이']) assert.ok(m.includes(s), `K150 ${s}`);
  assert.ok(!/태워|태운|파괴|난폭|흉포/.test(kidText('K150')));
  // 📖 낱말 뜻 — 표준국어대사전과 대조해 고친 넷
  assert.match(word('K144', '허둥지둥'), /급하게 서두르는/);
  assert.match(word('K151', '문풍지'), /문 가장자리/);
  assert.equal(word('K144', '곡식'), '쌀, 보리, 콩, 밀처럼 사람의 먹을거리가 되는 것');
  for (const id of NEW) {
    assert.ok(!/동생|누나|언니|오빠|형이랑|형과|형은|형이 /.test(kidText(id).replace(/인형/g, '')), `${id} 형제를 지어내지 않음`);
    assert.ok(![...kidText(id)].some((ch) => (ch >= 'ㅤ' && ch <= '㆏') || (ch >= 'ᄀ' && ch <= 'ᇿ')), `${id} 옛 한글 글자 없음`);
  }
});

test('🔁 겹침 (v347): 새 글 제목이 옛 글과 같지 않다 · 기본안에서 바꾼 다섯이 옛 글 꼴로 돌아가지 않았다', () => {
  const old = DATA.cards.filter((c) => Number(c.id.slice(1)) <= 142);
  for (const id of NEW) assert.ok(!old.some((c) => c.title === card(id).title), `${id} 제목이 옛 글과 같음`);
  assert.deepEqual(NEW.filter((id) => /[「」]/.test(card(id).title)), [], '제목에 「」 없음 — 화면이 제목을 「」로 감싼다');
  assert.ok(!/혹부리/.test(JSON.stringify(DATA.cards)), 'K141 금도끼 은도끼와 같은 꼴의 혹부리 영감은 쓰지 않음');
  assert.notEqual(card('K144').genre, card('K131').genre, 'K131 독서 대화와 다른 갈래');
  assert.ok(!/어떤 자료/.test(QS.filter((x) => x.id.startsWith('K149')).map((x) => x.q).join(' ')), 'K149는 자료 고르기가 아니라 발표 되돌아보기');
  assert.ok(!/다시 해 보자|살살/.test(body('K154')), 'K154는 K132 꼬부기의 「실수 → 격려 → 다시 해 성공」 줄거리가 아니다');
});

test('📖 같이 안 낼 무리 (v347): 늪(K10)과 물웅덩이(K150)는 한 문제의 보기로 같이 나오지 않는다', () => {
  assert.ok(WORDS.apart.some((g) => g.includes('늪') && g.includes('물웅덩이')));
  assert.equal(word('K150', '물웅덩이'), '물이 괴어 있는 웅덩이');
});

test('📦 넷째 묶음 b347 (v347): 열둘 = 새 글 · b322 다음에 이어서 · 포켓몬 글과 명작 동시가 첫날 · ✍️ 둘은 다른 날', () => {
  const b = DRIP.bundles.find((x) => x.key === 'b347');
  assert.equal(b.after, 'b322');
  assert.deepEqual(b.order.slice().sort(), NEW.slice().sort(), '묶음 = 이번 글 열둘');
  assert.deepEqual(b.order.slice(0, 2), ['K150', 'K151'], '첫날 — 잉어킹 · 햇빛·바람');
  const dayOf = (id) => Math.floor(b.order.indexOf(id) / DRIP.perDay);
  assert.notEqual(dayOf('K148'), dayOf('K152'), '✍️ 생각 쓰기 둘은 다른 날');
  assert.ok(read('sw.js').includes("'./js/kordrip.js'"), '앱 셸');
});
