// 📘 국어 아홉째·열째 묶음 v411 (2026-11-10 아버님 「4학년 2학기 마무리로 하고 5학년 1학기 미리보기도 같이 하자」 → 기본안 「추천대로」): K203~K226
//  · 아홉째 K203~K214 = 4학년 2학기 마무리(글이 아홉 편뿐이던 독서·1·2·3·매체 둘씩 + 4·6단원 하나씩) · 열째 K215~K226 = 5학년 1학기 미리보기(글이 대여섯 편뿐이던 단원부터)
//  · 사실은 원문·공공 자료와 대조(연세대 윤동주기념관 원문제공 · 덴마크어 원문 · 그리스어 이솝 · 구텐베르크 오 헨리 원문 · 1935년 『영랑시집』 · PokeAPI ·
//    한국천문연구원 달력자료 · 국립중앙과학관 · 산림청·국립수목원 · 환경부 분리배출 가이드라인 · 행정안전부 · 표준국어대사전) · 📖 낱말 48 표준국어대사전 대조(스물넷 고침)
//  · 기본안에서 바꾼 것: 「사과」(송치를 사전으로 못 댐) → 「산울림」 · 「홀레 할머니」(우물에 뛰어드는 장면 등) → 「개미와 비둘기」 · 「봄은 고양이로다」(호동그란·어리우다) → 「돌담에 속삭이는 햇발」 ·
//    메리프(분류가 솜털포켓몬) → 양포켓몬 우르·배우르 · 「섣달·동짓달」(양력 12월은 섣달이 아님) → 「12월은 섣달일까」 · 가게 이름 → 간판 글자
//  · 📦 묶음 b411a·b411b는 앞 묶음이 다 열린 다음 날부터 하루 두 편(js/kordrip.js after — tests/kordrip411.test.js)
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
const NEW9 = Array.from({ length: 12 }, (_, i) => `K${203 + i}`);
const NEW10 = Array.from({ length: 12 }, (_, i) => `K${215 + i}`);
const NEW = [...NEW9, ...NEW10];
const CIRC = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
const nums = (s) => [...new Set([...String(s || '')].map((ch) => CIRC.indexOf(ch) + 1).filter((n) => n > 0))];
const lines = (id) => card(id).lines || card(id).stanzas.flat();
const body = (id) => lines(id).join(' ');
const kidText = (id) => JSON.stringify({ ...card(id), meta: null, facts: null, source: null, author: null });
const fact = (id, k) => Object.fromEntries(card(id).facts)[k];
/** 성취기준 공식 문구 — 3~4학년군은 kornew298 STD4, 5~6학년군은 kornew261 STD에서 그대로 */
const stdOf = (f) => new Map([...read(f).matchAll(/^\s*'(\d국\d\d-\d\d)': '([^']+)',$/gm)].map((m) => [m[1], `[${m[1]}] ${m[2]}`]));
const STD = new Map([...stdOf('tests/kornew298.test.js'), ...stdOf('tests/kornew261.test.js')]);
/** 단원마다 이어진 성취기준 — 4-2는 kornew298 LINK4, 5-1은 옛 5-1 글이 쓴 번호와 kornew261 LINK5 */
const LINK = {
  '4-2-독서': ['4국01-06', '4국02-04'], '4-2-1': ['4국05-02', '4국05-05', '4국02-04', '4국01-06'], '4-2-2': ['4국04-05', '4국02-02', '4국03-02', '4국06-01'],
  '4-2-3': ['4국01-06', '4국03-03', '4국03-01', '4국04-03'], '4-2-매체': ['4국06-02', '4국01-05'], '4-2-4': ['4국05-03', '4국05-05', '4국02-03'], '4-2-6': ['4국01-02', '4국02-03', '4국05-01'],
  '5-1-독서': ['6국05-04', '6국02-01', '6국05-03'], '5-1-1': ['6국01-01', '6국02-02'], '5-1-2': ['6국03-03', '6국04-05'], '5-1-3': ['6국01-05', '6국01-03'],
  '5-1-매체': ['6국06-01', '6국03-02'], '5-1-5': ['6국01-06', '6국02-04'], '5-1-6': ['6국05-02'],
};

test('📘 아홉째·열째 묶음 스물넷 (v411): 연습 열여덟 + ✨ 명작 여섯 · 물음 일흔둘(셋씩) · 원고 검사 통과 · 7~12줄 · 정답 자리 고르게 · 근거 풀이는 근거 줄만', () => {
  assert.deepEqual(checkContent(DATA), []);
  assert.deepEqual(IDS.slice(202), NEW);
  assert.equal(validCards(DATA).length, 226);
  assert.deepEqual(NEW.filter((id) => card(id).kind === 'classic'), ['K204', 'K206', 'K207', 'K214', 'K216', 'K217']);
  const at = [0, 0, 0, 0];
  for (const id of NEW) {
    const c = card(id);
    assert.ok(lineCount(c) >= 7 && lineCount(c) <= 12, `${id} 7~12줄`);
    assert.equal(c.qs.length, 3, `${id} 물음 셋`);
    assert.ok(!/[「」]/.test(c.title), `${id} 제목에 낫표 없음`);
    assert.ok(!/[①-⑳]/.test(body(id)), `${id} 글에 동그라미 번호 없음(줄 번호와 헷갈림)`);
    for (const q of c.qs) {
      at[q.opts.findIndex((o) => o.ok)]++;
      assert.ok(q.opts.some((o) => o.type === 'make'), `${q.id} 지어내기 보기`);
      const len = q.opts.map((o) => [...o.t].length);
      const k = q.opts.findIndex((o) => o.ok);
      assert.ok(len[k] <= Math.max(...len.filter((_, i) => i !== k)) * 1.3, `${q.id} 정답만 길지 않게`);
      assert.ok(q.ev && q.ev.every((n) => n >= 1 && n <= lineCount(c)), `${q.id} 근거는 글 안`);
      assert.deepEqual(nums(q.evNote).filter((n) => !q.ev.includes(n)), [], `${q.id} 근거 풀이에 쓴 줄은 근거`);
    }
  }
  assert.deepEqual(at, [18, 18, 18, 18], '정답 자리 고르게');
  // Codex 215차 — 근거는 답을 직접 말하는 줄만(줄 하나만 눌러도 통과) · 물음을 좁힘 · 틀린 개념 풀이 뺌
  const ev = (qid) => card(qid.split('-')[0]).qs.find((x) => x.id === qid).ev;
  assert.deepEqual(['K210-1', 'K211-1', 'K219-1', 'K223-1', 'K225-1', 'K214-3'].map(ev), [[6], [5], [5], [3], [8], [5, 9]]);
  assert.match(card('K222').qs[2].q, /붕어빵을 만드는 일에 대해 깨달은 것/, 'K222-3 — 「새로 알게 된 것」이면 ④ 틀이 무겁다도 맞음');
  assert.ok(!JSON.stringify(card('K216').qs).includes('감각 표현'), 'K216-2 — 감각 표현을 「본 것을 그대로」로 풀지 않음');
  assert.ok(!/조용한 산울림/.test(JSON.stringify(card('K204').qs)), 'K204-3 — 아무도 못 들은 것 ≠ 조용함');
});

test('📘 단원 (v411): 아홉째는 4-2, 열째는 5-1 단원 하나씩 · 만나는 곳은 그 단원 · 첫 성취기준은 그 단원 것 · 공식 문구 · 학년군이 맞는 성취기준만', () => {
  for (const id of NEW) {
    const us = UNITS.filter((u) => u.cards.includes(id));
    assert.equal(us.length, 1, `${id} 단원 하나`);
    const u = us[0];
    assert.equal(u.term, NEW9.includes(id) ? '4-2' : '5-1', `${id} 학기`);
    const where = u.no === '매체' ? '매체 단원' : u.no === '독서' ? '독서 단원' : `${u.no}단원`;
    assert.match(card(id).meta[0], new RegExp(`^만나는 곳: ${u.term} ${where} 「${u.title}」`), `${id} 만나는 곳`);
    const codes = card(id).meta.flatMap((m) => [...m.matchAll(/^\[(\d국0\d-0\d)\]/g)].map((x) => x[1]));
    assert.ok(codes.length >= 1 && LINK[u.id].includes(codes[0]), `${id} 첫 성취기준 ${codes[0]}은 ${u.id} 것`);
    for (const m of card(id).meta.slice(1)) assert.equal(m, STD.get((/^\[(\d국\d\d-\d\d)\]/.exec(m) || [])[1]), `${id} 공식 문구 — ${m}`);
    assert.ok(codes.every((k) => (NEW9.includes(id) ? k.startsWith('4국') : k.startsWith('6국'))), `${id} 학년군이 맞는 성취기준`);
  }
  // 글이 적던 단원부터 — 4-2 다섯 단원은 아홉 편 → 열한 편 · 5-1 다섯 단원은 대여섯 편 → 일곱~여덟 편
  const n = (id) => UNITS.find((u) => u.id === id).cards.length;
  for (const id of ['4-2-독서', '4-2-1', '4-2-2', '4-2-3', '4-2-매체']) assert.equal(n(id), 11, id);
  for (const id of ['5-1-독서', '5-1-1', '5-1-매체']) assert.equal(n(id), 7, id);
  for (const id of ['5-1-2', '5-1-5']) assert.equal(n(id), 8, id);
});

test('📦 묶음 (v411): 아홉째 = K203~K214 · 열째 = K215~K226 · 첫날은 🐾 포켓몬 글과 ✨ 명작 시 · ✍️ 생각 쓰기는 묶음마다 둘이고 다른 날', () => {
  const b9 = DRIP.bundles.find((x) => x.key === 'b411a');
  const b10 = DRIP.bundles.find((x) => x.key === 'b411b');
  assert.deepEqual(b9.order, NEW9);
  assert.deepEqual(b10.order, NEW10);
  assert.deepEqual(b9.order.slice(0, 2).map((id) => [card(id).kind, card(id).title]), [['practice', '양의 해를 맞아 양포켓몬 발표 준비'], ['classic', '산울림']]);
  assert.deepEqual(b10.order.slice(0, 2).map((id) => [card(id).kind, card(id).title]), [['practice', '포켓몬 도감 번호는 어떻게 정해졌을까'], ['classic', '돌담에 속삭이는 햇발']]);
  for (const b of [b9, b10]) {
    const w = b.order.filter((id) => card(id).write);
    assert.equal(w.length, 2, `${b.key} ✍️ 둘`);
    const dayOf = (id) => Math.floor(b.order.indexOf(id) / DRIP.perDay);
    assert.notEqual(dayOf(w[0]), dayOf(w[1]), `${b.key} ✍️ 둘은 다른 날`);
  }
  assert.deepEqual(NEW.filter((id) => card(id).write), ['K207', 'K212', 'K218', 'K226']);
  for (const id of ['K207', 'K212', 'K218', 'K226']) assert.ok(card(id).write.frames.every((f) => f.endsWith('~')), `${id} 문장 틀은 빈자리가 끝`);
  // 원고가 앱 셸이라 판을 올려야 기기가 새 글을 받는다
  assert.ok(Number((/CACHE_VERSION = 'v(\d+)'/.exec(read('sw.js')) || [])[1]) >= 411, 'sw 판 v411 이상');
  assert.ok(read('sw.js').includes("'./js/kordrip.js'") && read('sw.js').includes("'./coach/korean/reading.json'"), '앱 셸');
});

test('✨ 명작 여섯 (v411): 저작권이 끝난 것만 · 지은이 · 원문 대조 · 무섭거나 슬픈 장면과 원문에 없는 숫자는 넣지 않음', () => {
  assert.deepEqual(['K204', 'K206', 'K207', 'K214', 'K216', 'K217'].map((id) => card(id).author), ['윤동주', '안데르센 · 신코치가 다시 씀', '지은이 모름 · 신코치가 다시 씀', '지은이 모름 · 신코치가 다시 씀', '김영랑', '오 헨리 · 신코치가 줄여 씀']);
  for (const [id, y] of [['K204', 1945], ['K206', 1875], ['K216', 1950], ['K217', 1910]]) assert.match(fact(id, '저작권'), new RegExp(`^지은이가 ${y}년에 세상을 떠나 한국에서 저작권 보호 기간이 끝난 작품이에요`), id);
  for (const id of ['K207', 'K214']) assert.match(fact(id, '저작권'), /^지은이를 알 수 없는 옛이야기로 한국에서 저작권 보호 기간이 끝난 작품이에요\(처음은 이솝 우화\)/, id);
  // 산울림 — 윤동주기념관 현대어 표기 2연 8줄
  assert.deepEqual(card('K204').stanzas, [['까치가 울어서', '산울림', '아무도 못 들은', '산울림'], ['까치가 들었다', '산울림', '저 혼자 들었다', '산울림']]);
  // 완두콩 다섯 알 — 죽음 대목·종교 말 없이 · 해로 가겠다던 콩은 번호 없이
  assert.ok(!/죽|하느님|천국|하늘나라/.test(kidText('K206')), 'K206 죽음·종교 말 없음');
  assert.ok(!/둘째 콩|넷째 콩/.test(kidText('K206')), 'K206 원문이 처음과 끝에서 다르게 부르는 콩은 번호 없이');
  // 시골 쥐와 서울 쥐 — 그리스어 바탕 판본: 시골 쥐가 먼저 부르고, 놀라게 한 것은 문을 연 사람
  assert.ok(lines('K207')[0].startsWith('시골 쥐가 친한 서울 쥐를'), 'K207 시골 쥐가 먼저');
  assert.ok(!/고양이|개가|잡아먹/.test(kidText('K207')), 'K207 고양이·개는 뒤 판본');
  // 개미와 비둘기 — 개미가 사냥꾼을 본 데서 끊음 · 그물·돌·죽이는 말 없음
  assert.ok(lines('K214').at(-1).endsWith('비둘기에게 받은 은혜를 떠올렸어요.') && !/물었/.test(body('K214')), 'K214 이어질 내용은 물음의 답 — 글은 은혜를 떠올린 데서 끊음(Codex 215차)');
  assert.ok(!/그물|돌을|죽이|죽을/.test(kidText('K214')), 'K214 다른 판본의 무서운 말 없음');
  assert.ok(fact('K214', '원문').includes('사냥꾼의 발을 물었고'), 'K214 끝은 facts에');
  // 돌담에 속삭이는 햇발 — 1935년 『영랑시집』 · 살프시 → 살포시 · 같이는 붙여 씀 · 얄게는 원문 그대로
  assert.ok(body('K216').includes('살포시') && !body('K216').includes('살프시'));
  assert.ok(!/ 같이/.test(body('K216')), 'K216 조사 「같이」는 붙여 씀');
  assert.ok(body('K216').includes('얄게') && !card('K216').words.some(([w]) => w === '얄게'), 'K216 사전에 없는 「얄게」는 풀이하지 않음');
  assert.ok(!/시문학/.test(JSON.stringify(card('K216').facts)), 'K216 처음 실린 곳은 근거가 갈려 쓰지 않음');
  // 크리스마스 선물 — 원문의 숫자만
  const dollars = [...body('K217').matchAll(/(\d+)달러/g)].map((m) => m[1]);
  assert.deepEqual(dollars, ['1', '20', '21'], 'K217 1달러 87센트 · 20달러 · 21달러뿐(빗 값·시계 값은 원문에 없음)');
  assert.ok(!/죽이/.test(kidText('K217')));
  // 지은이가 세상을 떠난 사정은 아이 화면에 쓰지 않음
  for (const id of ['K216', 'K217']) assert.ok(!/자살|유탄|포탄|전쟁/.test(JSON.stringify(card(id))), id);
});

test('🐾·🔎 사실 (v411): 공식 도감·공공 자료와 같게 — 흔한 오해는 막는다', () => {
  // 양포켓몬 — 메리프는 솜털포켓몬, 전룡은 라이트포켓몬, 양포켓몬은 우르·배우르
  assert.ok(body('K203').includes('「솜털포켓몬」') && body('K203').includes('「라이트포켓몬」') && body('K203').includes('우르와 그 진화형 배우르'));
  assert.ok(!/입춘|설날부터|띠가 바뀌/.test(body('K203')), 'K203 띠가 바뀌는 날은 공공 자료로 확인 못 해 쓰지 않음');
  // 12월은 섣달일까 — 2026년 12월 9일 동짓달 시작 · 섣달은 2027년 1월 8일 · 섣달그믐 2월 6일 · 설날 2월 7일
  for (const s of ['2026년에는 12월 9일부터 음력 11월', '섣달은 2027년 1월 8일에 시작', '2027년 2월 6일', '2월 7일이 설날']) assert.ok(body('K209').includes(s), `K209 ${s}`);
  // 오리온자리 — 삼형제별(삼태성은 큰곰자리) · 거리·밝기 숫자·시각 없음
  assert.ok(body('K213').includes('삼형제별') && !/삼태성|광년|등성|오후 \d|밤 \d/.test(body('K213')));
  // 도감 번호 — PokeAPI 2026-11
  for (const s of ['1번은 이상해씨', '1025번 복숭악동', '152번 치코리타', '251번 세레비', '252번 나무지기', '메리프는 179번', '906번 나오하', '37번']) assert.ok(body('K215').includes(s), `K215 ${s}`);
  assert.ok(!/지역 도감/.test(body('K215')), 'K215 전국도감 차례 = 지역 도감 차례라고 하지 않음');
  // 소나무 — 잎도 2년 뒤에 떨어짐(국립수목원) · 왁스층은 확인 못 해 쓰지 않음
  assert.ok(body('K223').includes('2년 뒤에 떨어진다') && !/왁스|큐티클/.test(body('K223')));
  // 분리배출 — 종이팩은 헹궈 말려 일반 종이와 따로 · 일반팩·멸균팩 나누기는 확인 못 해 쓰지 않음
  assert.ok(body('K225').includes('일반 종이와 따로') && !/멸균/.test(body('K225')));
  // 눈썰매 — 행정안전부 「거리를 유지」·「끝나는 지점에서 속도를 낮춰」
  assert.ok(body('K221').includes('거리를 두고') && body('K221').includes('속도를 줄여'));
  // 도서관 안내문 — 2027년 1월 달력과 맞는 요일(1/5 화 · 1/13 수 · 1/20 수)
  for (const [m, d, w] of [[1, 5, '화'], [1, 13, '수'], [1, 20, '수']]) assert.equal('일월화수목금토'[new Date(Date.UTC(2027, m - 1, d)).getUTCDay()], w);
  assert.ok(body('K224').includes('1월 13일 수요일') && body('K224').includes('1월 20일 수요일') && body('K224').includes('1월 5일부터 화요일마다'));
  // 바탕 글을 밝힌 글 여섯
  assert.deepEqual(NEW.filter((id) => card(id).source), ['K203', 'K209', 'K213', 'K215', 'K223', 'K225']);
  for (const id of ['K203', 'K209', 'K213', 'K215', 'K223', 'K225']) assert.match(card(id).source, /신코치가 [^.]* 새로 썼어요\.$/, id);
});

test('🔁 기본안에서 바꾼 것·겹침 (v411): 옛 글·논술과 같은 꼴을 피함 · 지어낸 식구 없음', () => {
  const titles = DATA.cards.map((c) => c.title);
  for (const t of ['사과', '홀레 할머니', '봄은 고양이로다']) assert.ok(!titles.includes(t), `${t} — 기본안에서 바꿈`);
  assert.ok(!/메리프는 양포켓몬/.test(body('K203')));
  assert.ok(!/달력/.test(body('K208')), 'K208은 「종이 달력과 휴대폰 달력」 대신(논술 N199 알림장 종이/앱과 같은 꼴)');
  assert.ok(!/빵집|문구점/.test(body('K210')), 'K210은 가게 이름 대신 간판 글자(한글·로마자)');
  assert.ok(!/영상 통화/.test(body('K219') + body('K220')), 'K219·K220은 K188 영상 통화와 다른 꼴');
  assert.ok(!/하얗게 보/.test(body('K223')), 'K223은 K140 입김과 다른 꼴');
  // 집 식구는 어른만(형제를 지어내지 않는다) — 「진화형이라」·「삼형제별」은 식구가 아님
  for (const id of NEW) assert.ok(!/동생|누나|언니|오빠|형이랑|형과|형은|형도/.test(kidText(id).replace(/진화형이라|삼형제별/g, '')), `${id} 형제 낱말`);
  for (const id of NEW) assert.ok(![...kidText(id)].some((ch) => (ch >= 'ㅤ' && ch <= '㆏') || (ch >= 'ᄀ' && ch <= 'ᇿ')), `${id} 옛 한글 글자 없음`);
});

test('📖 낱말·같이 안 낼 무리 (v411): 새 낱말은 옛 글 낱말과 겹치지 않음 · 뜻이 겹치는 짝 셋을 무리로', () => {
  const old = new Set(DATA.cards.filter((c) => !NEW.includes(c.id)).flatMap((c) => (c.words || []).map(([w]) => w))); // 듣기 카드는 낱말이 없다
  for (const id of NEW) for (const [w] of card(id).words) assert.ok(!old.has(w), `${id} 낱말 ${w}`);
  assert.equal(NEW.reduce((n, id) => n + card(id).words.length, 0), 48);
  assert.equal(WORDS.apart.length, 64);
  assert.deepEqual(WORDS.apart.slice(-3), [['고개', '비탈길', '비탈', '기슭'], ['비단', '실비단'], ['사철나무', '늘푸른나무']]);
  // 표준국어대사전 대조로 고친 것 몇 — 글의 뜻에 맞는 번호
  assert.equal(card('K208').words.find(([w]) => w === '부담스럽지')[1], '어떠한 일이나 상황을 감당해야 할 듯한 버거운 느낌이 있지');
  assert.equal(card('K206').words.find(([w]) => w === '꼬투리')[1], '콩과 식물의 씨앗을 싸고 있는 껍질');
  assert.equal(card('K216').words.find(([w]) => w === '새악시')[1], '「새색시」(갓 결혼한 여자)의 방언');
});
