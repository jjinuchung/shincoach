// 📘 4학년 2학기 국어 글 셋째 묶음 v322 (2026-10-23 아버님 "국어 문제 좀 더 만들자" → 기본안 "진행하자" → 원고 검수 "이대로"): K131~K142
//  · 둘째 묶음이 다 열린 다음 날부터(11월 초) 읽게 되니 5·6단원에 무게 · 글이 적던 독서·1·2단원·📺 매체 단원을 채움
//  · 사실은 공공 자료와 대조(『소학생』 74호 원본 스캔 · 한국민족문화대백과 · 한국민속대백과 · 표준국어대사전 · 질병관리청 · PokeAPI 한국어 도감)
//  · 📦 묶음 b322는 b320이 다 열린 다음 날부터 하루 두 편(js/kordrip.js after — tests/kordrip322.test.js)
//  · 구현하다 기존 글과 겹친 둘을 바꿈(검수 판 2): K132 버스 이야기(K20과 같음) → 꼬부기 이야기 · K135 개구리 겨울나기(K43과 같음) → 손 씻기 카드 뉴스
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkContent, validCards, lineCount } from '../js/korean.js';
import { DRIP } from '../js/kordrip.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const DATA = JSON.parse(read('coach/korean/reading.json'));
const UNITS = JSON.parse(read('coach/korean/units.json')).units;
const IDS = DATA.cards.map((c) => c.id);
const card = (id) => DATA.cards.find((c) => c.id === id);
const NEW = Array.from({ length: 12 }, (_, i) => `K${131 + i}`);
const QS = NEW.flatMap((id) => card(id).qs);
const q = (id) => QS.find((x) => x.id === id);
const CIRC = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
const nums = (s) => [...new Set([...String(s || '')].map((ch) => CIRC.indexOf(ch) + 1).filter((n) => n > 0))];
const bare = (s) => String(s).replace(/[\s.,!?'"·…—–\-()「」]/g, '');
const lines = (id) => card(id).lines || card(id).stanzas.flat();
const body = (id) => lines(id).join(' ');
const kidText = (id) => JSON.stringify({ ...card(id), meta: null, facts: null, source: null });
const fact = (id, k) => Object.fromEntries(card(id).facts)[k];
/** 4-2 단원마다 이어진 성취기준 (경기도교육청 예시 자료 연결표 — .context/korean_4_2/units.md) */
const LINK4 = {
  '4-2-독서': ['4국01-06', '4국02-04'],
  '4-2-1': ['4국05-02', '4국05-05', '4국02-04', '4국01-06'],
  '4-2-2': ['4국04-05', '4국02-02', '4국03-02', '4국06-01'],
  '4-2-매체': ['4국06-02', '4국01-05'],
  '4-2-4': ['4국05-03', '4국05-05', '4국02-03'],
  '4-2-5': ['4국01-04', '4국03-04', '4국04-04', '4국04-05'],
  '4-2-6': ['4국01-02', '4국02-03', '4국05-01'],
};

test('📘 셋째 묶음 열둘 (v322): 연습 열 + ✨ 명작 둘 · 물음 서른여섯(셋씩) · 원고 검사 통과 · 7~12줄 · ✍️ 둘 · 대화·카드 뉴스는 줄마다 · 바탕 글 셋', () => {
  assert.deepEqual(checkContent(DATA), []);
  assert.deepEqual(IDS.slice(130), NEW);
  assert.equal(validCards(DATA).length, 142);
  assert.deepEqual(NEW.map((id) => [card(id).kind, card(id).genre]), [
    ['practice', '독서 대화'], ['practice', '이야기'], ['practice', '설명하는 글'], ['practice', '보고하는 글'], ['practice', '카드 뉴스'], ['classic', '동시'],
    ['practice', '전화 대화'], ['practice', '단체 대화'], ['practice', '편지'], ['practice', '설명하는 글'], ['classic', '옛이야기'], ['practice', '설명하는 글']]);
  assert.deepEqual([card('K136').author, card('K141').author], ['권태응', '지은이 모름 · 신코치가 다시 씀']);
  assert.ok(NEW.every((id) => card(id).qs.length === 3), '4학년 글은 물음 셋');
  assert.equal(QS.length, 36);
  assert.deepEqual(NEW.filter((id) => lineCount(card(id)) < 7 || lineCount(card(id)) > 12), [], '짧게 — 7~12줄');
  assert.deepEqual(NEW.filter((id) => card(id).write), ['K139', 'K141']);
  for (const id of ['K139', 'K141']) {
    const w = card(id).write;
    assert.equal(w.v, 1, id);
    assert.equal(w.rubric.must.length, 3, id);
    assert.ok(w.rubric.miss.some((m) => /맞춤법/.test(m)), `${id} 맞춤법은 채점하지 않는다`);
    assert.ok(w.frames.every((f) => f.endsWith('~') && f.split('~').length === 2), `${id} 문장 틀은 빈자리 하나가 끝에`);
  }
  assert.deepEqual(NEW.filter((id) => card(id).layout === 'rows'), ['K131', 'K135', 'K137', 'K138']);
  assert.deepEqual(NEW.filter((id) => card(id).source), ['K131', 'K133', 'K135']);
  for (const id of ['K131', 'K133', 'K135']) assert.match(card(id).source, /신코치가 (독서 대화로 새로 )?썼어요\.$/, id);
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(read('sw.js')) || [])[1]) >= 322, '원고는 앱 셸 — sw v322 이상');
});

test('📘 단원 (v322): 새 글은 4-2 단원 하나씩 · 만나는 곳은 그 단원 · 성취기준은 그 단원과 이어진 것이 하나 이상 · 5~6학년 성취기준 없음 · 소단원 차례', () => {
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
  assert.deepEqual(of('4-2-독서'), ['K118', 'K131'], '한 편뿐이던 독서 단원');
  assert.deepEqual(of('4-2-1'), ['K132', 'K107', 'K119'], '① 작품을 현실·내 경험과 견주기 → ② 다른 의견 비교');
  assert.deepEqual(of('4-2-2'), ['K108', 'K133', 'K109', 'K134'], '① 한글 사랑 → ② 우리말 조사 보고');
  assert.deepEqual(of('4-2-6'), ['K116', 'K130', 'K140', 'K142', 'K117', 'K129', 'K141'], '① 원인과 결과 → ② 이어질 내용 상상');
});

test('📘 물음 (v322): 지어내기 보기 · 정답만 길지 않게 · 근거 풀이 줄은 근거로도 받음 · 낱말 풀이를 정답에 옮기지 않음 · 중심 정답은 글 그대로가 아님 · 정답 자리 고르게 · 🧠 하나', () => {
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
      for (const [, m] of c.words) for (const part of m.split(' — ')) assert.ok(!(bare(part).length >= 6 && ok.includes(bare(part))), `${x.id} 정답에 낱말 풀이 그대로 — ${part}`);
      if (/중심/.test(x.skill)) assert.ok(!lines(id).some((l) => bare(l).includes(ok)), `${x.id} 중심 정답이 글 그대로`);
    }
  }
  assert.deepEqual(at, [9, 9, 9, 9], '정답 자리 (화면에서는 섞어 보여 준다)');
  const know = QS.flatMap((x) => x.opts.filter((o) => o.type === 'know').map((o) => [x.id, o]));
  assert.deepEqual(know.map(([id]) => id), ['K142-3']);
  assert.ok(know[0][1].why.startsWith('맞는 말이에요.'));
  assert.match(q('K142-3').q, /글에 따르면/);
});

test('🔍 근거 줄 (v322 · Codex 126차 기준): 정답을 바로 받치는 줄만 — 결과·상황 소개 줄은 빼고 결론 줄은 넣는다', () => {
  const want = {
    'K131-1': [4], // ③ 바람이 셀수록 더 여밈은 반대 쪽 — 외투를 벗은 까닭은 ④
    'K132-1': [1, 2], // 포켓몬과 학교에 다니는 이야기 속 세계
    'K132-2': [5, 6], // 실수(⑤)와 친구들의 웃음(⑥)
    'K132-3': [7], // 수아가 견준 것은 친구의 격려 ⑦ — ⑧은 다시 해 본 결과 줄(Codex 127차 #3)
    'K133-3': [7, 11], // 결론 줄 ⑪ + 같은 말 ⑦
    'K135-1': [3, 5], // 까닭 ③ · 방법 ⑤ — ② 제목·사진 소개 줄은 주제를 받치지 않는다(Codex 127차 #2)
    'K135-2': [4], // 조사 결과 카드
    'K137-2': [4], // ① 저녁 여덟 시는 상황 — 죄송하다는 말은 ④
    'K138-1': [5], // ④ 잠에서 깬 일은 까닭 — 부탁은 ⑤
    'K140-1': [6, 8],
    'K141-1': [5, 6, 7],
    'K141-3': [7, 9],
    'K142-1': [6], // ⑦ 「그래서 … 갸웃거린다」는 결과 줄
    'K142-2': [3, 4, 5], // 꼬리를 무는 원인과 결과
  };
  for (const [id, e] of Object.entries(want)) assert.deepEqual(q(id).ev, e, id);
  // 풀이 글은 근거 줄 번호만 · 보기에 없는 일을 덧붙이지 않는다(K132-3 「리코더를 다시 불어 본 일」 — Codex 127차 #3)
  for (const id of ['K132-3', 'K135-1']) assert.deepEqual(nums(q(id).evNote), q(id).ev, `${id} 풀이 번호`);
  assert.ok(!/다시 불어/.test(q('K132-3').evNote), 'K132-3 풀이는 수아가 말한 것만');
  assert.ok(q('K132-3').evNote.includes('짝이 다시 해 보자고 해서 힘이 났던'));
});

test('🎯 K134-3 (Codex 127차 #1): 「알게 된 점」으로 넓게 물으면 ⑤ 「윤슬」 뜻도 맞는 답 — 낱말을 쓰기 전에 할 일로 좁혔나', () => {
  const x = q('K134-3');
  assert.equal(x.q, '이번 조사를 바탕으로, 낱말을 쓰기 전에 해야 할 일은 무엇인가요?');
  assert.ok(!/알게 된 점/.test(x.q), '넓은 물음이 아니게');
  assert.equal(x.opts.filter((o) => o.ok).length, 1);
  assert.match(x.opts.find((o) => o.ok).t, /사전에서 뜻을 먼저 확인/);
  // 글에 그대로 나온 사실(낱말 뜻)을 보기로 두지 않는다 — 그런 보기는 「조사로 알게 된 것」으로도 맞다
  for (const o of x.opts.filter((y) => !y.ok)) assert.ok(!/잔물결|탈 없이|허물없이/.test(o.t), `사실 보기 — ${o.t}`);
  assert.deepEqual(x.ev, [4, 10]);
});

test('🏛️ 사실 대조 (v322): 권태응 원문 · 금도끼 은도끼 줄거리 · 이솝 · 고라파덕·꼬부기 도감 · 입김 · 손 씻기 · 글자 · 토박이말 — 쓰지 않기로 한 것은 정말 빠졌나', () => {
  // ✨ 권태응 「어린 보리싹」 — 『소학생』 74호(1950.1) 16쪽 · 오늘 맞춤법: 텅빈 → 텅 빈 · 닥쳐 오는 → 닥쳐오는 · 받고랑 → 밭고랑
  assert.deepEqual(card('K136').stanzas, [
    ['곡식을 다 걷어간 텅 빈 들판에', '찬 바람 우수수수 쓸쓸도 한데', '뾰족뾰족 새파란 어린 보리싹', '햇볕 쬐며 소곤소곤 의논이지요.'],
    ['닥쳐오는 겨울을 추운 겨울을', '그 어떻게 견딜까 이겨 나갈까?', '까마귀도 밭고랑에 모여 앉아서', '서로 같이 근심스레 의논이지요.'],
  ]);
  for (const s of ['『소학생』 74호', '텅빈 → 텅 빈', '닥쳐 오는 → 닥쳐오는', '받고랑 → 밭고랑']) assert.ok(JSON.stringify(card('K136').facts).includes(s), `K136 ${s}`);
  assert.match(fact('K136', '저작권'), /1951년에 세상을 떠나/);
  // ✨ 금도끼 은도끼 — 연못 · 산신령 · 금 → 은 → 「제 도끼는 쇠도끼」 → 셋 다 · 이웃이 일부러 던지고 거짓말 — 끝은 풀이에서
  const g = body('K141');
  const order = ['연못에 빠뜨리고', '산신령이 나타났다', '금도끼를 들어 보이며', '은도끼를 들어 보이며', '낡은 쇠도끼입니다', '모두 주었다', '일부러 물에 던졌다', '「네, 제 도끼입니다.」'].map((w) => g.indexOf(w));
  assert.ok(order.every((x, i) => x >= 0 && (!i || x > order[i - 1])), `K141 차례 ${order}`);
  assert.ok(!/효자|병든|가난|부자가 되어|흰 수염|빛이|연기|샘/.test(kidText('K141')), 'K141 공공 자료에 없는 덧붙임 없음');
  assert.ok(!/잃/.test(g), 'K141 결말(쇠도끼마저 잃음)은 글에 없다 — 이어질 내용 짐작');
  assert.match(q('K141-3').evNote, /쇠도끼마저/);
  assert.match(fact('K141', '만나는 곳'), /이솝 우화/);
  assert.ok(!/우리 조상이 지은/.test(JSON.stringify(card('K141'))));
  // 이솝 「해와 바람」 — 외투 · 「해님과 바람」 제목은 근거 없음 · 끝의 강 목욕 장면 없음
  assert.ok(body('K131').includes('「해와 바람」') && !JSON.stringify(card('K131')).includes('해님과 바람'));
  assert.ok(body('K131').includes('외투를 더 꽁꽁 여미었') && body('K131').includes('스스로 외투를 벗었'));
  assert.ok(!/강물|목욕/.test(kidText('K131')));
  // 🐾 꼬부기 — 물대포 · 등껍질에 손발을 감춤(PokeAPI 한국어) · 울음소리는 쓰지 않음
  assert.ok(body('K132').includes('물대포') && body('K132').includes('등껍질 속으로 손발을'));
  assert.ok(!/꼬북/.test(kidText('K132')));
  // 🐾 고라파덕 — 0.8m · 19.6kg · 물 타입 「오리포켓몬」 · 두통 → 이상한 힘 · 기억이 없어 고개를 갸웃 · 「머리를 감싸 쥠」은 도감에 없다
  const p = body('K142');
  for (const s of ['0.8m', '19.6kg', '물 타입', '「오리포켓몬」', '스트레스가 쌓이면 두통이 더 심해진다', '두통이 심해지면', '이상한 힘을 썼던 기억이 없다', '고개를 갸웃거리고']) assert.ok(p.includes(s), `K142 ${s}`);
  assert.ok(!/감싸 쥐|감싸쥐|신기한 힘/.test(JSON.stringify(card('K142'))));
  assert.match(q('K142-3').opts.find((o) => o.type === 'know').t, /레벨 33.*골덕/);
  // 입김 — 보이지 않는 수증기 → 아주 작은 물방울(응결) · 「하얀 수증기」·얼음·서리 없음
  const k = body('K140');
  assert.ok(k.includes('눈에 보이지 않는 수증기') && k.includes('아주 작은 물방울') && k.includes('응결'));
  assert.ok(!/하얀 수증기|수증기가 하얗|얼어|서리|연기/.test(kidText('K140')));
  // 손 씻기 — 질병관리청: 흐르는 물에 비누로 30초 이상 · 6단계 차례 · 열 명 중 한 명쯤 · 손가락 사이·엄지손가락
  //   조사는 공중화장실 이용 어른 관찰 · 10.3%의 분모는 손을 씻은 사람 — 모든 사람의 비율처럼 읽히지 않게(Codex 127차 #5)
  const h = body('K135');
  for (const s of ['흐르는 물에 비누로 30초 이상', '손바닥 → 손등 → 손가락 사이 → 두 손 모아 → 엄지손가락 → 손톱 밑', '공중화장실에서 조사', '손을 씻은 어른 가운데 비누로 30초 이상 씻은 사람은 열 명 중 한 명쯤', '손가락 사이와 엄지손가락은 잘 씻기지 않는', '10월 15일']) assert.ok(h.includes(s), `K135 ${s}`);
  assert.ok(!/열 명 가운데/.test(kidText('K135')), 'K135 「열 명 중」으로 한 가지 말');
  // 글자 — 그림·매듭은 말을 그대로 적지 못함 · 1443년 · 집현전·한글날 날짜 없음
  const w = body('K133');
  assert.ok(w.includes('그림이나 매듭으로는 사람이 하는 말을 하나하나 그대로 적을 수 없었다') && w.includes('1443년') && w.includes('키푸'));
  assert.ok(!/집현전|10월 9일|1446|스물여덟/.test(kidText('K133')));
  // 토박이말 — 사전 뜻 그대로 · 사전에 없는 말은 뺐다 · 13 + 7 + 4 = 24
  const t = body('K134');
  for (const s of ['햇빛이나 달빛에 비치어 반짝이는 잔물결', '어린아이가 탈 없이 잘 놀며 자라는 모양', '사전에 나오지 않아서 뺐다', '스물네 명']) assert.ok(t.includes(s), `K134 ${s}`);
  assert.equal(13 + 7 + 4, 24);
  assert.ok(!/미리내|다솜|가온|라온|아라/.test(kidText('K134')), '방언·옛말·근거 없는 낱말은 쓰지 않는다');
  for (const id of NEW) {
    assert.ok(!/동생|형이|형과|누나|언니|오빠/.test(kidText(id)), `${id} 형제를 지어내지 않음`);
    assert.ok(![...kidText(id)].some((ch) => (ch >= 'ㅤ' && ch <= '㆏') || (ch >= 'ᄀ' && ch <= 'ᇿ')), `${id} 옛 한글 글자 없음`);
  }
});

test('🔁 겹침 (v322): 새 글 제목이 옛 글과 같은 주제로 겹치지 않는다 — K20 버스 · K43 개구리 겨울나기 · K86 단체 대화방에서 정한 약속', () => {
  const old = DATA.cards.filter((c) => Number(c.id.slice(1)) <= 130);
  for (const id of NEW) assert.ok(!old.some((c) => c.title === card(id).title), `${id} 제목이 옛 글과 같음`);
  assert.deepEqual(NEW.filter((id) => /[「」]/.test(card(id).title)), [], '제목에 「」 없음 — 화면이 제목을 「」로 감싼다');
  assert.ok(!/버스/.test(card('K132').title + body('K132')), 'K20 「처음 혼자 탄 버스」와 같은 이야기가 아니게');
  assert.ok(!/개구리|겨울잠/.test(card('K135').title + body('K135')), 'K43 「개구리는 겨울에 어디에 있을까」와 같은 주제가 아니게');
  assert.notEqual(card('K138').title, '모둠 단체 대화방');
  assert.ok(!/단체 대화방/.test(card('K138').title), 'K86 「단체 대화방에서 정한 약속」과 헷갈리지 않게');
});

test('📦 셋째 묶음 b322 (v322): 열둘 = 새 글 · b320 다음에 이어서 · 포켓몬 글이 첫날', () => {
  const b = DRIP.bundles.find((x) => x.key === 'b322');
  assert.equal(b.after, 'b320');
  assert.deepEqual(b.order.slice().sort(), NEW.slice().sort(), '묶음 = 이번 글 열둘');
  assert.deepEqual(b.order.slice(0, 2), ['K142', 'K137'], '첫날 — 고라파덕 · 전화(5단원 — 11월)');
  assert.ok(read('sw.js').includes("'./js/kordrip.js'"), '앱 셸');
});
