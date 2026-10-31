// 📘 4학년 2학기 국어 글 다섯째 묶음 v372 (2026-10-30 아버님 「국어 하자」 → 기본안 「추천대로」): K155~K166
//  · 넷째 묶음이 다 열린 다음 날(11월 10일쯤)부터 읽게 되니 11월 진도 5단원 「오가는 마음」·12월 6단원 「상상의 날개」 중심 + 4·2·3·독서 단원 하나씩
//  · 사실은 공공 자료와 대조(연세대 윤동주기념관 원문 · 『한국민속문학사전』·민족문화대백과 · 국립국어원 · 해양수산부·사이언스타임즈·스미스소니언 · 표준국어대사전 · PokeAPI 한국어 도감)
//  · 📦 묶음 b372는 b347이 다 열린 다음 날부터 하루 두 편(js/kordrip.js after — tests/kordrip372.test.js)
//  · 기본안에서 바꾼 것: 윤동주 「만돌이」(26줄 — 글은 20줄까지)·정지용 「산넘어 저쪽」(뜻 모를 낱말) → 🐾 「흔들리기 시작한 알」 · 우산(≈K115) → 필통 ·
//    게임 대화창의 놀리는 말(≈K114) → 개인 정보 · 이름표(사전: 가슴에 다는 표) → 팻말 · 성취기준 문구는 공식 문구 그대로
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
const NEW = Array.from({ length: 12 }, (_, i) => `K${155 + i}`);
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
/** 4-2 단원마다 이어진 성취기준 (경기도교육청 예시 자료 연결표 — kornew298 LINK4와 같음 · 독서 단원은 kornew347처럼 02-03·02-06 더함) */
const LINK4 = {
  '4-2-독서': ['4국01-06', '4국02-04', '4국02-03', '4국02-06'],
  '4-2-2': ['4국04-05', '4국02-02', '4국03-02', '4국06-01'],
  '4-2-3': ['4국01-06', '4국03-03', '4국03-01', '4국04-03'],
  '4-2-4': ['4국05-03', '4국05-05', '4국02-03'],
  '4-2-5': ['4국01-04', '4국03-04', '4국04-04', '4국04-05'],
  '4-2-6': ['4국01-02', '4국02-03', '4국05-01'],
};

test('📘 다섯째 묶음 열둘 (v372): 연습 열 + ✨ 명작 둘 · 물음 서른여섯(셋씩) · 원고 검사 통과 · 7~12줄 · ✍️ 둘 · 게임 대화창은 줄마다 · 바탕 글 넷', () => {
  assert.deepEqual(checkContent(DATA), []);
  assert.deepEqual(IDS.slice(154), NEW);
  assert.equal(validCards(DATA).length, 166);
  assert.deepEqual(NEW.map((id) => [card(id).kind, card(id).genre]), [
    ['practice', '이야기'], ['classic', '옛이야기'], ['practice', '설명하는 글'], ['practice', '날씨 예보(방송)'], ['practice', '온라인 대화(게임 대화창)'], ['practice', '생활문'],
    ['practice', '초대장'], ['classic', '동시'], ['practice', '설명하는 글'], ['practice', '설명하는 글'], ['practice', '독서 편지'], ['practice', '제안하는 글']]);
  assert.deepEqual([card('K156').author, card('K162').author], ['지은이 모름 · 신코치가 다시 씀', '윤동주']);
  assert.ok(NEW.every((id) => card(id).qs.length === 3), '4학년 글은 물음 셋');
  assert.equal(QS.length, 36);
  assert.deepEqual(NEW.filter((id) => lineCount(card(id)) < 7 || lineCount(card(id)) > 12), [], '짧게 — 7~12줄');
  assert.deepEqual(NEW.filter((id) => card(id).write), ['K155', 'K159']);
  for (const id of ['K155', 'K159']) {
    const w = card(id).write;
    assert.equal(w.v, 1, id);
    assert.equal(w.rubric.must.length, 3, id);
    assert.ok(w.rubric.miss.some((m) => /맞춤법/.test(m)), `${id} 맞춤법은 채점하지 않는다`);
    assert.ok(w.frames.every((f) => f.endsWith('~') && f.split('~').length === 2), `${id} 문장 틀은 빈자리 하나가 끝에 (Codex 53차 #4)`);
  }
  assert.deepEqual(NEW.filter((id) => card(id).layout === 'rows'), ['K159']);
  assert.deepEqual(NEW.filter((id) => card(id).source), ['K157', 'K163', 'K164', 'K165']);
  for (const id of ['K157', 'K163', 'K164', 'K165']) assert.match(card(id).source, /신코치가 (설명하는 글로 |책 속 인물에게 쓰는 편지로 )?(새로 )?썼어요\.$/, id);
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(read('sw.js')) || [])[1]) >= 372, '원고는 앱 셸 — sw v372 이상');
});

test('📘 단원 (v372): 새 글은 4-2 단원 하나씩 · 만나는 곳은 그 단원 · 성취기준은 그 단원과 이어진 것이 하나 이상 · 5~6학년 성취기준 없음 · 소단원 차례', () => {
  for (const id of NEW) {
    const us = UNITS.filter((u) => u.cards.includes(id));
    assert.equal(us.length, 1, `${id} 단원 하나`);
    const u = us[0];
    assert.equal(u.term, '4-2', `${id} 4학년 2학기`);
    const where = u.no === '매체' ? '매체 단원' : u.no === '독서' ? '독서 단원' : `${u.no}단원`;
    assert.match(card(id).meta[0], new RegExp(`^만나는 곳: 4-2 ${where} 「${u.title}」`), `${id} 만나는 곳`);
    const codes = card(id).meta.flatMap((m) => [...m.matchAll(/\[(4국0\d-0\d)\]/g)].map((x) => x[1]));
    assert.equal(codes.length, 2, `${id} 성취기준 둘`);
    // 첫째 코드는 반드시 그 단원 것 · 둘째는 글이 실제로 하는 일(예: 설명하는 글의 [4국02-02]) — 연결표 밖이어도 된다 (🔍 Codex 176차 P2 「추천대로」)
    assert.ok(LINK4[u.id].includes(codes[0]), `${id} 첫 성취기준 ${codes[0]}은 단원 ${u.id}와 이어진 것`);
    assert.ok(!codes.includes('4국01-01') && !codes.includes('4국06-03'), `${id} 4-2 단원과 이어지지 않은 성취기준은 쓰지 않음`);
    assert.ok(!card(id).meta.some((m) => /\[6국/.test(m)), `${id} 5~6학년 성취기준 없음`);
  }
  const of = (uid) => UNITS.find((u) => u.id === uid).cards;
  assert.deepEqual(of('4-2-5'), ['K114', 'K126', 'K137', 'K138', 'K159', 'K160', 'K115', 'K127', 'K139', 'K161', 'K128'], '① 온라인 대화 → 가리키는 말·이어 주는 말 → ② 편지·초대장 → 일기');
  assert.deepEqual(of('4-2-6'), ['K116', 'K130', 'K140', 'K142', 'K153', 'K154', 'K157', 'K158', 'K117', 'K129', 'K141', 'K152', 'K156', 'K155'], '① 원인과 결과 → ② 이어질 내용 상상');
  assert.deepEqual(of('4-2-4'), ['K112', 'K123', 'K136', 'K151', 'K162', 'K124', 'K113', 'K125', 'K163'], '① 시·이야기 → ② 질문으로 읽기');
  assert.deepEqual(of('4-2-2'), ['K108', 'K133', 'K164', 'K109', 'K134']);
  assert.deepEqual(of('4-2-독서'), ['K143', 'K118', 'K144', 'K165', 'K131']);
  assert.deepEqual(of('4-2-3'), ['K111', 'K147', 'K110', 'K120', 'K148', 'K166']);
  assert.match(JSON.parse(read('coach/korean/units.json')).about, /v372 다섯째 묶음/);
});

test('📘 물음 (v372): 지어내기 보기 · 정답만 길지 않게 · 근거 풀이 줄은 근거로도 받음 · 낱말 풀이를 정답에 옮기지 않음 · 중심 정답은 글 그대로가 아님 · 정답 자리 고르게 · 🧠 없음', () => {
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
  assert.deepEqual(QS.filter((x) => x.opts.some((o) => o.type === 'know')).map((x) => x.id), [], '🧠 아는 것으로 답하기 보기 없음');
  // 중심 내용 물음 넷 · 까닭(원인과 결과) 물음 — 이 묶음이 넉넉히 넣기로 한 것
  assert.deepEqual(QS.filter((x) => /중심/.test(x.skill)).map((x) => x.id), ['K157-3', 'K163-1', 'K164-3', 'K165-3']);
  assert.ok(QS.filter((x) => /원인과 결과|까닭/.test(x.skill)).length >= 12);
});

test('🔍 근거 줄 (v372): 정답을 바로 받치는 줄만 — 원인·마음·까닭을 직접 말하는 줄 · 결론 줄', () => {
  const want = {
    'K155-1': [4], 'K155-2': [4, 5], 'K155-3': [7, 10],
    'K156-1': [3], 'K156-2': [5, 6], 'K156-3': [12],
    'K157-1': [5], 'K157-2': [8], 'K157-3': [4, 6],
    'K158-1': [4], 'K158-2': [6], 'K158-3': [4, 5],
    'K159-1': [5], 'K159-2': [4, 6], 'K159-3': [9],
    'K160-1': [2], 'K160-2': [4], 'K160-3': [7],
    'K161-1': [6, 7], 'K161-2': [8], 'K161-3': [5],
    'K162-1': [2], 'K162-2': [3], 'K162-3': [6],
    'K163-1': [3, 6], 'K163-2': [7], 'K163-3': [10],
    'K164-1': [5], 'K164-2': [8, 9], 'K164-3': [5, 6],
    'K165-1': [3, 4], 'K165-2': [7], 'K165-3': [9],
    'K166-1': [6], 'K166-2': [8], 'K166-3': [9],
  };
  assert.equal(Object.keys(want).length, 36);
  for (const [id, e] of Object.entries(want)) assert.deepEqual(q(id).ev, e, id);
  // 짐작 물음(K155-2)의 단서는 물 가까이에서 흔들림(④⑤)뿐 — 알의 빛깔·무늬로 짐작하면 정답이 둘이 된다
  assert.ok(!/파란|물결/.test(body('K155')), 'K155 알의 빛깔·무늬는 물을 가리키지 않는다');
  assert.ok(!q('K155-2').ev.includes(2));
});

test('🔍 Codex 176차 「추천대로」 (v372): 팻말은 앞으로 할 일 · 「께서」 풀이에 「오시다」 없음 · 가갸날은 ⑤ · 이어 주는 말 근거는 까닭 줄만', () => {
  // K166-3 — 팻말을 이미 만들어 두고 세워 달라는 뜻으로도 읽혀 「만들었습니다」도 답이 됐다
  assert.match(q('K166-3').q, /앞으로 할 일을 약속하는 문장으로/);
  assert.match(q('K166-3').opts.find((o) => o.type === 'time').why, /이미 한 일/);
  // K161-3 — 「와 주시면」의 「-시-」는 「주시다」에 붙는다 · 물음이 묻는 「께서」만 풀이
  assert.ok(!/오시다/.test(q('K161-3').evNote) && /께서/.test(q('K161-3').evNote));
  // K164-3 — 「가갸날」은 ⑤에 있다(③은 1926년뿐) · K160-1 — ③은 결과만 있는 줄
  assert.ok(lines('K164')[4].includes('가갸날') && !lines('K164')[2].includes('가갸날'));
  assert.ok(!q('K164-3').ev.includes(3) && !q('K160-1').ev.includes(3));
});

test('🏛️ 사실 대조 (v372): 굴뚝 원문 · 방귀쟁이 며느리 줄거리 · 야돈·야도란 도감 · 물고기 아가미 · 한글날 · 낱말 뜻 — 쓰지 않기로 한 것은 정말 빠졌나', () => {
  // ✨ 윤동주 「굴뚝」 — 연세대 윤동주기념관 원문제공 현대어 표기(원본대조 전집) · 1936년 가을 · 1955년 판(웨인연기·입술에)은 따르지 않음
  assert.deepEqual(card('K162').stanzas, [
    ['산골짜기 오막살이 낮은 굴뚝엔', '몽기몽기 웨인내굴 대낮에 솟나.'],
    ['감자를 굽는 게지. 총각 애들이', '깜박깜박 검은 눈이 모여 앉아서', '입술이 꺼멓게 숯을 바르고', '옛이야기 한 커리에 감자 하나씩'],
    ['산골짜기 오막살이 낮은 굴뚝엔', '살랑살랑 솟아나네 감자굽는 내.'],
  ]);
  for (const s of ['1936년 가을', '연세대학교 윤동주기념관', '원본대조 윤동주 전집', '웨인연기']) assert.ok(JSON.stringify(card('K162').facts).includes(s), `K162 ${s}`);
  assert.ok(!/웨인연기|입술에/.test(JSON.stringify(card('K162').stanzas)), 'K162 1955년 판의 고친 글자가 아니라 원고 글자');
  assert.ok(!card('K162').qs.some((x) => /커리/.test(x.skill) || /「커리」/.test(x.q)), '사전에 없는 「커리」의 뜻은 묻지 않는다');
  assert.match(fact('K162', '저작권'), /1945년에 세상을 떠나/);
  // ✨ 방귀쟁이 며느리 — 얼굴빛 → 기둥·문짝 → 집이 흔들림 → 친정으로 → 높은 배 → 비단·놋그릇 → 「쓸모가 있구나」 · 식구가 날아가는 판본은 뺌
  const p = body('K156');
  const order = ['얼굴빛이 날이 갈수록 노래졌다', '기둥과 문짝을 꼭 붙들라고', '온 집이 들썩들썩', '친정으로 돌려보내기로', '나무가 너무 높아', '비단과 놋그릇을 주겠다고', '배가 우수수', '쓸모가 있구나'].map((w) => p.indexOf(w));
  assert.ok(order.every((x, i) => x >= 0 && (!i || x > order[i - 1])), `K156 차례 ${order}`);
  assert.ok(!/과부|날아가|날아갔/.test(kidText('K156')), 'K156 식구가 날아가는 장면은 없다');
  assert.match(fact('K156', '원문'), /한국민속문학사전/);
  // 🐾 야돈·야도란 — PokeAPI 한국어 도감 · 꼬리 요리·잘린 꼬리는 없다
  const s = body('K157');
  for (const x of ['꼬리를 물에 담가 먹이를 낚는 것이 특기', '단맛이 배어 나와', '셀러에게 꼬리를 물리는', '두 발로 걸을 수 있게', '마지못해 물속을 헤엄쳐', '다시 야돈으로 돌아간다']) assert.ok(s.includes(x), `K157 ${x}`);
  assert.ok(!/요리|잘린|잘려|레벨/.test(kidText('K157')));
  // 물고기 — 「물을 마셔」가 아니라 물에 녹아 있는 산소 · 붉은 까닭은 핏줄 · 물 밖에서는 아가미가 주저앉음
  const f = body('K163');
  for (const x of ['물에 녹아 있던 산소가 아가미의', '가느다란 핏줄이 많기 때문', '힘없이 주저앉아']) assert.ok(f.includes(x), `K163 ${x}`);
  assert.ok(!/물을 마셔|물을 마신/.test(f), 'K163 「물을 마셔 산소를 얻는다」는 오해를 글에 쓰지 않는다');
  // 한글날 — 1926 가갸날 · 가갸거겨 · 1928 · 1940 해례본 · 9월 상순 · 10월 9일 · 2013 · 국경일은 뺌
  const h = body('K164');
  for (const x of ['1926년', '「가갸거겨」', '1928년', '1940년', '9월 상순', '10월 9일', '2013년']) assert.ok(h.includes(x), `K164 ${x}`);
  assert.ok(!/국경일|생일/.test(h), 'K164 국경일(자료마다 오해가 있음)·세종 생일 이야기는 글에 없다');
  // 📖 낱말 뜻 — 표준국어대사전과 대조해 고친 것
  assert.match(word('K163', '아가미'), /^물고기처럼/, '고래는 허파로 숨 쉰다');
  assert.match(word('K163', '핏줄'), /^피가 흐르는 관 /, '사전 뜻 「관」 (뒤의 「혈관」에도 「관」이 있어 앞에서 본다)');
  assert.match(word('K164', '훈민정음'), /백성을 가르치는 바른 소리/);
  assert.match(word('K161', '강당'), /건물이나 큰 방/);
  assert.equal(word('K166', '팻말'), '이름이나 알릴 것을 적은 패를 단 말뚝');
  assert.ok(!/이름표/.test(kidText('K166')), 'K166 사전 뜻이 「가슴에 다는 표」인 「이름표」 대신 팻말');
  for (const id of NEW) {
    assert.ok(!/동생|누나|언니|오빠|형이랑|형과|형은|형이 /.test(kidText(id)), `${id} 형제를 지어내지 않음`);
    assert.ok(![...kidText(id)].some((ch) => (ch >= 'ㅤ' && ch <= '㆏') || (ch >= 'ᄀ' && ch <= 'ᇿ')), `${id} 옛 한글 글자 없음`);
  }
});

test('🔒 게임 대화창 (v372): 개인 정보를 알려 주지 않는 쪽이 바른 답 · 놀리는 말 대신 선물로 꾀는 말(K114와 겹치지 않게) · ✍️ 채점은 알려 주면 🔁', () => {
  const t = body('K159');
  assert.ok(t.includes('모르는 사람에게 학교나 사는 곳을 알려 주면 안 돼') && t.includes('개인 정보는 알려 줄 수 없어') && t.includes('엄마께 말씀드렸다'));
  assert.ok(!/겁쟁이|ㅋㅋ|바보/.test(t), '놀리는 말은 K114 댓글에서 — 여기선 쓰지 않는다');
  assert.ok(q('K159-2').opts.find((o) => o.ok).t.includes('개인 정보'));
  assert.ok(card('K159').write.rubric.miss[0].startsWith('사는 곳·학교·전화번호를 알려 줌 — 🔁'));
});

test('🔁 겹침 (v372): 새 글 제목이 옛 글과 같지 않다 · 제목에 「」 없음 · 기본안에서 바꾼 것이 옛 꼴로 돌아가지 않았다', () => {
  const old = DATA.cards.filter((c) => Number(c.id.slice(1)) <= 154);
  for (const id of NEW) assert.ok(!old.some((c) => c.title === card(id).title), `${id} 제목이 옛 글과 같음`);
  assert.deepEqual(NEW.filter((id) => /[「」]/.test(card(id).title)), [], '제목에 「」 없음 — 화면이 제목을 「」로 감싼다');
  assert.ok(!/만돌이|산넘어 저쪽|산 너머 저쪽/.test(JSON.stringify(DATA.cards)), '20줄을 넘거나 뜻이 분명하지 않은 시는 쓰지 않음');
  assert.ok(!/우산/.test(body('K160')), 'K160은 K115(비 오는 날 우산)와 다른 이야기');
  assert.ok(!/소가 된/.test(JSON.stringify(DATA.cards)), '죽으려는 장면이 있는 「소가 된 게으름뱅이」는 쓰지 않음');
});

test('📖 같이 안 낼 무리 (v372): 허파·아가미 · 훈민정음·해례본 · 껍데기·등딱지 · 무늬·파문', () => {
  for (const [a, b] of [['허파', '아가미'], ['훈민정음', '해례본'], ['껍데기', '등딱지'], ['무늬', '파문']]) assert.ok(WORDS.apart.some((g) => g.includes(a) && g.includes(b)), `${a}·${b}`);
});

test('📦 다섯째 묶음 b372 (v372): 열둘 = 새 글 · b347 다음에 이어서 · 포켓몬 글과 명작 동시가 첫날 · 5단원이 그다음 · ✍️ 둘은 다른 날', () => {
  const b = DRIP.bundles.find((x) => x.key === 'b372');
  assert.equal(b.after, 'b347');
  assert.deepEqual(b.order.slice().sort(), NEW.slice().sort(), '묶음 = 이번 글 열둘');
  assert.deepEqual(b.order.slice(0, 2), ['K157', 'K162'], '첫날 — 야돈 · 굴뚝');
  assert.deepEqual(b.order.slice(2, 4), ['K159', 'K161'], '둘째 날 — 11월 진도 5단원');
  const dayOf = (id) => Math.floor(b.order.indexOf(id) / DRIP.perDay);
  assert.notEqual(dayOf('K155'), dayOf('K159'), '✍️ 생각 쓰기 둘은 다른 날');
  assert.ok(read('sw.js').includes("'./js/kordrip.js'"), '앱 셸');
});
