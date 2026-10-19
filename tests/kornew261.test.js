// 📚 국어 새 글 12편 v261 (2026-10-15, 아버님 "이대로 진행"):
//  · 연습 여덟 K61~K68 — 기사문(5-2 매체) · 주장하는 글(5-1 매체) · 제안하는 글 두 편(5-1 5단원) · 설명하는 글 둘(원인과 결과 · 일의 차례, 5-1 4단원) ·
//    동화(5-2 6단원) · 생활문(5-1 2단원) · 극본(5-2 6단원)
//  · ✨ 명작 넷 K69~K72 — 윤동주 「봄」 · 정지용 「할아버지」 · 「해와 달이 된 오누이」 · 「심청전」(지은이 모름 — 다시 씀)
//  · 갈래마다 5학년 범위는 「2026학년도 초등 5~6학년 수업-평가 계획 예시자료」(경기도교육청)의 성취기준·단원 연결표로 확인했다 — 전기문은 6-1이라 넣지 않았다
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TYPES, LAYOUTS, checkCard, checkContent, validCards, lineCount } from '../js/korean.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const DATA = JSON.parse(read('coach/korean/reading.json'));
const UNITS = JSON.parse(read('coach/korean/units.json')).units;
const IDS = DATA.cards.map((c) => c.id);
const card = (id) => DATA.cards.find((c) => c.id === id);
const NEW = ['K61', 'K62', 'K63', 'K64', 'K65', 'K66', 'K67', 'K68', 'K69', 'K70', 'K71', 'K72'];
const QS = NEW.flatMap((id) => card(id).qs);
const CIRC = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
const nums = (s) => [...new Set([...String(s || '')].map((ch) => CIRC.indexOf(ch) + 1).filter((n) => n > 0))];
const law = (id) => card(id).facts.find((f) => f[0] === '저작권')[1];
const fact = (id, name) => (card(id).facts.find((f) => f[0] === name) || [])[1] || '';
const word = (id, w) => (card(id).words.find((x) => x[0] === w) || [])[1] || '';

/** 2022 개정 5~6학년군 국어 성취기준 34개 — 경기도교육청 「2026학년도 초등 5~6학년 수업-평가 계획 예시자료」 성취기준·단원 연결표의 문구 그대로 */
const STD = {
  '6국01-01': '대화에서 생략된 내용을 추론하며 듣는다.',
  '6국01-02': '주장을 파악하고 이유나 근거가 타당한지 평가하며 듣는다.',
  '6국01-03': '주제와 관련하여 궁금한 내용을 질문하며 적극적으로 듣고 말한다.',
  '6국01-04': '면담의 절차를 이해하고 상대와 매체를 고려하여 면담한다.',
  '6국01-05': '자료를 선별하여 핵심 정보를 중심으로 내용을 구성하고 매체를 활용하여 발표한다.',
  '6국01-06': '토의에 협력적으로 참여하며 서로의 의견을 비교하고 조정한다.',
  '6국01-07': '절차와 규칙을 지키고 타당한 이유와 근거를 제시하며 토론한다.',
  '6국02-01': '글의 구조를 고려하며 주제나 주장을 파악하고 글 내용을 요약한다.',
  '6국02-02': '글에서 생략된 내용이나 함축된 표현을 문맥을 고려하여 추론한다.',
  '6국02-03': '글이나 자료를 읽고 내용의 타당성과 표현의 적절성을 평가한다.',
  '6국02-04': '문제 상황과 관련된 다양한 관점의 글을 읽고 이를 문제 해결에 활용한다.',
  '6국02-05': '긍정적인 읽기 동기를 형성하고 적극적으로 읽기에 참여하는 태도를 기른다.',
  '6국03-01': '알맞은 내용을 선정하여 대상의 특성이 나타나게 설명하는 글을 쓴다.',
  '6국03-02': '적절한 근거를 사용하고 인용의 출처를 밝히며 주장하는 글을 쓴다.',
  '6국03-03': '체험한 일에 대한 감상을 나타내는 글을 쓴다.',
  '6국03-04': '독자와 매체를 고려하여 내용을 생성하고 표현하며 글을 쓴다.',
  '6국03-05': '쓰기 과정을 점검⋅조정하며 글을 쓰고, 글 전체를 대상으로 통일성 있게 고쳐 쓴다.',
  '6국03-06': '쓰기에 적극적으로 참여하며 자신의 글을 독자와 공유하는 태도를 지닌다.',
  '6국04-01': '음성 언어 및 문자 언어의 특성을 이해하고 다양한 매체 자료에서 표현 효과를 평가한다.',
  '6국04-02': '표준어와 방언의 기능을 파악하고 언어 공동체와 국어생활과의 관계를 이해한다.',
  '6국04-03': '고유어와 관용 표현의 쓰임과 가치를 이해하고 상황에 맞게 표현한다.',
  '6국04-04': '문장 성분을 이해하고 호응 관계가 올바른 문장을 구성한다.',
  '6국04-05': '글과 담화에 쓰인 시간 표현을 이해하고 상황에 맞게 표현한다.',
  '6국04-06': '글과 담화에 쓰인 단어 및 문장, 띄어쓰기를 민감하게 살펴 바르게 고치는 태도를 지닌다.',
  '6국05-01': '작가의 의도를 생각하며 작품을 읽는다.',
  '6국05-02': '비유적 표현의 효과에 유의하여 작품을 감상한다.',
  '6국05-03': '소설이나 극을 읽고 인물, 사건, 배경을 파악한다.',
  '6국05-04': '인상적인 부분을 중심으로 작품에 대한 의견을 나눈다.',
  '6국05-05': '자신의 경험을 시, 소설, 극, 수필 등 적절한 갈래로 표현한다.',
  '6국05-06': '작품을 읽고 자신의 삶과 연관 지어 성찰하는 태도를 지닌다.',
  '6국06-01': '정보 검색 도구를 활용하여 자신의 목적에 맞는 매체 자료를 찾는다.',
  '6국06-02': '뉴스 및 각종 정보 매체 자료의 신뢰성을 평가한다.',
  '6국06-03': '적합한 양식과 수용자의 반응을 고려하여 복합양식 매체 자료를 제작하고 공유한다.',
  '6국06-04': '자신의 매체 이용 양상에 대해 성찰한다.',
};
/** 같은 연결표에서 새 글이 쓰는 성취기준이 이어진 5학년 단원 (6학년 단원은 뺐다) */
const LINK5 = {
  '6국06-02': ['5-2-매체'],
  '6국02-03': ['5-2-매체'],
  '6국03-02': ['5-1-매체'],
  '6국02-04': ['5-1-5'],
  '6국01-06': ['5-1-5', '5-2-1', '5-2-5'],
  '6국02-01': ['5-1-독서', '5-1-4', '5-2-3'],
  '6국05-03': ['5-2-6'],
  '6국03-03': ['5-1-2'],
  '6국04-05': ['5-1-2'],
  '6국05-02': ['5-1-6'],
  '6국02-02': ['5-2-3', '5-2-6'],
  '6국05-04': ['5-1-독서', '5-1-6', '5-2-1'],
};
const codesOf = (c) => c.meta.flatMap((m) => [...m.matchAll(/\[(6국0\d-0\d)\]/g)].map((x) => x[1]));

test('📚 새 글 12편 (v261): 연습 여덟 + ✨ 명작 넷 · 물음 마흔여섯 · 원고 검사 통과 · 단원 지도 · ✍️ 둘', () => {
  assert.deepEqual(checkContent(DATA), []);
  assert.deepEqual(IDS.slice(60, 72), NEW);
  assert.equal(validCards(DATA).length, 118); // v265 신문 글 여섯 · v267 단원 채우기 여섯 · v281 새 글 열둘 · v282 포켓몬 글 여섯 · v291 호상놀이 글 넷 · v298 4학년 2학기 글 열둘 더함
  assert.deepEqual(NEW.map((id) => [card(id).kind, card(id).genre]), [
    ['practice', '기사문'], ['practice', '주장하는 글'], ['practice', '제안하는 글 두 편'], ['practice', '설명하는 글'], ['practice', '설명하는 글'],
    ['practice', '동화'], ['practice', '생활문'], ['practice', '극본'], ['classic', '동시'], ['classic', '동시'], ['classic', '옛이야기'], ['classic', '옛 소설']]);
  assert.deepEqual(NEW.slice(8).map((id) => card(id).author), ['윤동주', '정지용', '지은이 모름 · 신코치가 다시 씀', '지은이 모름 · 신코치가 다시 씀']);
  assert.deepEqual(NEW.map((id) => card(id).qs.length), [4, 4, 4, 4, 4, 4, 4, 4, 3, 3, 4, 4], '연습·옛이야기는 넷 · 짧은 시는 셋');
  assert.equal(QS.length, 46);
  assert.deepEqual(NEW.map((id) => lineCount(card(id))), [11, 11, 9, 11, 11, 13, 12, 13, 8, 10, 16, 15], '지금 글과 비슷한 길이(20줄 안)');
  // ✍️ 생각 쓰기 — 기사 내용으로 친구에게 답하기 · 주장에 대한 내 생각과 근거를 가져온 곳
  assert.deepEqual(NEW.filter((id) => card(id).write), ['K61', 'K62']);
  for (const id of ['K61', 'K62']) {
    const w = card(id).write;
    assert.equal(w.v, 1, id);
    assert.ok(w.rubric.must.length >= 2, id);
    assert.ok(w.rubric.miss.some((m) => /맞춤법/.test(m)), `${id} 맞춤법은 채점하지 않는다`);
  }
  assert.match(card('K62').write.q, /어디에서 가져왔는지/);
  // 📘 단원 지도 — 새 글은 모두 단원에, 정한 자리에
  const of = (u) => UNITS.find((x) => x.id === u).cards.filter((id) => NEW.includes(id));
  assert.deepEqual(
    ['5-2-매체', '5-1-매체', '5-1-5', '5-1-4', '5-2-6', '5-1-2', '5-1-6', '5-2-1'].map(of),
    [['K61'], ['K62'], ['K63'], ['K64', 'K65'], ['K66', 'K68', 'K70'], ['K67'], ['K69'], ['K71', 'K72']]);
  for (const id of NEW) assert.equal(UNITS.filter((u) => u.cards.includes(id)).length, 1, `${id} 단원 하나`);
  // 원고는 앱 셸에 들어 있어(cache-first) 판을 올려야 기기가 새 글을 받는다
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(read('sw.js')) || [])[1]) >= 261, 'sw는 v261 이상');
});

test('📚 새 글 물음 (v261): 물음마다 글에 없는 그럴듯한 말(지어내기) 보기 · 정답 보기만 유난히 길지 않게 · 근거 풀이가 짚는 줄은 근거로도 받음 · 근거가 없는 물음 넷엔 둘째 힌트', () => {
  for (const q of QS) {
    assert.ok(q.opts.some((o) => o.type === 'make'), `${q.id} 지어내기 보기`);
    const len = q.opts.map((o) => [...o.t].length);
    const k = q.opts.findIndex((o) => o.ok);
    const other = Math.max(...len.filter((_, i) => i !== k));
    assert.ok(len[k] <= other * 1.3, `${q.id} 정답 보기 길이 ${len[k]} — 가장 긴 틀린 보기 ${other}`);
    if (q.ev) {
      const extra = nums(q.evNote).filter((n) => !q.ev.includes(n));
      assert.deepEqual(extra, [], `${q.id} 근거 풀이가 쓰는 줄은 근거로도 받는다`);
    } else assert.ok(q.hint2 && q.doneNote, `${q.id} 둘째 힌트·풀이`);
  }
  assert.deepEqual(QS.filter((q) => !q.ev).map((q) => q.id), ['K61-3', 'K67-1', 'K68-2', 'K69-3']);
  // 잘못 읽기는 짜임 놓치기(5-2 2단원 문장 호응)만 빼고 모두 쓰인다 (🧠 아는 것으로 답하기는 v282 포켓몬 글부터)
  const used = new Set(QS.flatMap((q) => q.opts.filter((o) => !o.ok).map((o) => o.type)));
  assert.deepEqual([...used].sort(), Object.keys(TYPES).filter((t) => t !== 'agree' && t !== 'know').sort());
  // 기사의 ① 제목 줄 · 극본의 해설 줄
  assert.match(card('K61').lines[0], /^\[제목\] /);
  assert.deepEqual(card('K68').lines.map((l, i) => (l.startsWith('해설: ') ? i + 1 : 0)).filter(Boolean), [1, 9, 13]);
  // 근거가 같은 글의 반대 말을 막는지 — 사실·의견 물음의 정답은 기자가 짐작한 문장(~ㄹ 것이다)
  assert.equal(card('K61').qs[2].opts.find((o) => o.ok).t, card('K61').lines[8]);
});

test('✨ 명작 넷 (v261): 윤동주 「봄」(1955년 판 148~149쪽)·정지용 「할아버지」(《향수》) — 원문에 facts에 적은 바꿈만 · 옛이야기 둘은 지은이 모름 다시 씀 · 저작권 해 · 해치는 장면 없이 · 옛 글자 없음', () => {
  const apply = (orig, changes) => orig.map((st) => st.map((l) => changes.reduce((x, [a, b]) => x.split(a).join(b), l)));
  // 윤동주 「봄」 — 위키문헌 『하늘과 바람과 별과 시』(1955) 148~149쪽
  const SPRING = [['우리 애기는', '아래발치에서 코올코올,'], ['고양이는', '부뜨막에서 가릉가릉,'], ['애기 바람이', '나무가지에서 소올소올,'], ['아저씨 햇님이', '하늘한가운데서 째앵째앵.']];
  const C69 = [['아래발치', '아래 발치'], ['부뜨막', '부뚜막'], ['나무가지', '나뭇가지'], ['햇님', '해님'], ['하늘한가운데서', '하늘 한가운데서']];
  assert.deepEqual(card('K69').stanzas, apply(SPRING, C69));
  for (const [a, b] of C69) assert.ok(fact('K69', '원문').includes(`${a} → ${b}`), `K69 바꾼 표기 ${a} → ${b}`);
  assert.match(fact('K69', '원문'), /148~149쪽/);
  assert.match(word('K69', '애기'), /표준어로는 '아기'/, "'애기'는 시인이 쓴 말 그대로 — 오늘 표준어도 알려 준다");
  // 정지용 「할아버지」 — 위키문헌 《향수》
  const GRANDPA = [['할아버지가', '담배ㅅ대를 물고', '들에 나가시니,', '궂은 날도', '곱게 개이고,'], ['할아버지가', '도롱이를 입고', '들에 나가시니,', '가믄 날도', '비가 오시네.']];
  const C70 = [['담배ㅅ대', '담뱃대'], ['가믄', '가문']];
  assert.deepEqual(card('K70').stanzas, apply(GRANDPA, C70));
  for (const [a, b] of C70) assert.ok(fact('K70', '원문').includes(`${a} → ${b}`), `K70 바꾼 표기 ${a} → ${b}`);
  assert.match(fact('K70', '원문'), /'개이고'는 시인이 쓴 말 그대로/);
  assert.match(word('K70', '개이고'), /표준어로는 '개고'/);
  // 저작권 — 1963년 전에 세상을 떠난 지은이 · 지은이를 알 수 없는 옛이야기
  const year = (id) => Number((/(\d{4})년에 세상을 떠나/.exec(law(id)) || [])[1]);
  assert.deepEqual([year('K69'), year('K70')], [1945, 1950]);
  for (const id of ['K71', 'K72']) {
    assert.match(law(id), /^지은이를 알 수 없는 옛이야기로 한국에서 저작권 보호 기간이 끝난 작품이에요/);
    assert.match(fact(id, '원문'), /신코치가 쉬운 말로 다시 썼어요/);
  }
  // 아이에게 맞게 — 해치는 장면은 그리지 않는다 · 낮잡는 말은 쓰지 않고 까닭을 알려 준다
  const text = (id) => card(id).lines.join(' ');
  assert.ok(!/잡아먹었|해쳤|죽였|피가/.test(text('K71')), 'K71 해치는 장면 없이');
  assert.ok(!/봉사/.test(text('K72') + JSON.stringify(card('K72').qs)), 'K72 글·물음에 낮잡는 말 없이');
  assert.match(fact('K72', '알아 둘 것'), /'봉사'는 시각 장애인을 낮잡아 이르는 말/);
  // 옛 글자(아래아 등 조합 자모)는 태블릿 글꼴에서 깨진다 — 새 글 어디에도 없게
  const R = (a, b) => `${String.fromCharCode(a)}-${String.fromCharCode(b)}`;
  const OLD = new RegExp(`[${R(0x1100, 0x11ff)}${R(0xa960, 0xa97f)}${R(0xd7b0, 0xd7ff)}]`);
  assert.ok(!OLD.test(JSON.stringify(NEW.map(card))), '옛 글자 없음');
});

test('📘 성취기준 문구 (v261): 원고의 [6국…] 뒤 문구는 2022 개정 5~6학년군 공식 문구 그대로 · 새 글은 연결표에서 그 글의 5학년 단원과 이어진 성취기준만', () => {
  assert.equal(Object.keys(STD).length, 34);
  let checked = 0;
  for (const c of DATA.cards) for (const m of c.meta) for (const x of m.matchAll(/\[(6국0\d-0\d)\]\s*([^·[]*)/g)) {
    assert.ok(Object.hasOwn(STD, x[1]), `${c.id} ${x[1]} 모르는 성취기준`);
    const said = x[2].trim();
    if (said) { assert.ok(said.startsWith(STD[x[1]]), `${c.id} ${x[1]} 문구 — ${said}`); checked++; }
  }
  assert.ok(checked >= 80, `문구를 적은 곳 ${checked}`);
  for (const id of NEW) {
    const codes = codesOf(card(id));
    assert.ok(codes.length, `${id} 성취기준`);
    for (const k of codes) assert.ok(Object.hasOwn(LINK5, k), `${id} ${k} — 5학년 단원과 이어진 성취기준`);
    const unit = UNITS.find((u) => u.cards.includes(id)).id;
    assert.ok(codes.some((k) => LINK5[k].includes(unit)), `${id} 단원 ${unit} — 연결표에서 그 단원과 이어진 성취기준이 하나 이상`);
  }
});

test('📄 글 꼴 layout rows (v261): 극본의 대사·두 사람의 글·기사 제목은 문장마다 줄 — 그 세 카드에만 · 원고 검사가 잡는 것 · 화면은 is-rows', () => {
  assert.deepEqual(Object.keys(LAYOUTS), ['rows']);
  assert.deepEqual(DATA.cards.filter((c) => Object.hasOwn(c, 'layout')).map((c) => [c.id, c.layout]), [['K15', 'rows'], ['K23', 'rows'], ['K48', 'rows'], ['K61', 'rows'], ['K63', 'rows'], ['K68', 'rows'], ['K73', 'rows'], ['K74', 'rows'], ['K75', 'rows'], ['K76', 'rows'], ['K77', 'rows'], ['K79', 'rows'], ['K81', 'rows'], ['K83', 'rows'], ['K85', 'rows'], ['K86', 'rows'], ['K88', 'rows'], ['K92', 'rows'], ['K98', 'rows'], ['K99', 'rows'], ['K100', 'rows'], ['K106', 'rows'], ['K107', 'rows'], ['K111', 'rows'], ['K114', 'rows']]); // v298 두 친구의 글·학급 회의·댓글 · v291 달구질 소리(노랫말은 줄마다) · v265 신문 기사 다섯(제목 줄) · v266 토의 둘·독서 모임 기록 · v267 안내문·모둠 대화·독서 대화 · v281 독서 대화·문자 대화·발표 준비 메모·토의 · v282 발표 준비 메모·토의·광고
  const bad = (fix) => { const c = JSON.parse(JSON.stringify(card('K68'))); fix(c); return checkCard(c).join(' '); };
  assert.equal(bad(() => {}), '');
  assert.match(bad((c) => { c.layout = 'cols'; }), /layout\(글 꼴\)은 rows만/);
  assert.match(bad((c) => { c.layout = 'rows'; c.stanzas = [c.lines]; delete c.lines; }), /layout\(글 꼴\)은 rows만 — 문장\(lines\)으로 된 글에/);
  const listen = JSON.parse(JSON.stringify(DATA.cards.find((c) => c.listen)));
  listen.layout = 'rows';
  assert.match(checkCard(listen).join(' '), /듣기 카드에는 layout가 없어요/);
  // 화면 — proseEl이 is-rows를 붙이고, 그때만 문장(.kor-sent)이 한 줄씩
  const view = read('js/koreanview.js');
  assert.match(view, /el\('p', rowsLayout\(card\) \? 'kor-prose is-rows' : 'kor-prose'\)/); // v266 — layout rows 또는 🎧 대화를 글로 읽을 때
  assert.match(read('css/style.css'), /\.kor-prose\.is-rows \.kor-sent \{ display: block;/);
});

test('🔍 Codex 72차 (v261): 근거는 그 말을 풀어 쓴 줄까지 · 생각·느낌 가르기의 겪은 일 보기엔 느낌 섞인 말 없이 · 연 번호는 숫자로 · 낱말 풀이·글 문장을 그대로 옮긴 정답 없이 · 지어내기는 글에 없는 말', () => {
  const q = (id) => QS.find((x) => x.id === id);
  const bare = (s) => String(s).replace(/[\s.,!?'"·…—–\-()「」]/g, '');
  // #1 K67-3 — ⑪은 할머니 말씀을 글쓴이가 풀어 쓴 줄이라 근거로 받는다
  assert.deepEqual(q('K67-3').ev, [9, 10, 11]);
  // #2 K67-1 — 겪은 일 보기에 '산더미처럼' 같은 느낌이 섞인 말이 없다 · 풀이의 줄 번호도 그 보기와 같게
  const k67 = card('K67');
  const factOpts = q('K67-1').opts.filter((o) => o.type === 'fo');
  for (const o of factOpts) assert.ok(k67.lines.includes(o.t) && !/처럼|듯이|같이/.test(o.t), `${o.t} — 그대로 겪은 일`);
  assert.deepEqual(factOpts.map((o) => k67.lines.indexOf(o.t) + 1), [1, 4]);
  assert.match(q('K67-1').doneNote, /①·④는 실제로 있었던 일/);
  // #3 연은 1연·2연처럼 숫자로 — 동그라미 번호(①…)는 화면에서 줄 번호다
  const circleStanza = new RegExp(`[${CIRC}]연`);
  for (const x of QS) assert.ok(!circleStanza.test([x.q, x.evNote, x.doneNote, x.hint2, ...x.opts.flatMap((o) => [o.t, o.why])].join(' ')), `${x.id} 연 번호`);
  assert.match(q('K69-1').q, /^3연과 4연에서/);
  // #4 정답이 글 아래 낱말 풀이를 그대로 옮기지 않는다(풀이만 보고 맞히지 않게) — K69-2는 흉내 내는 말과 그 소리를 내는 것
  for (const c of NEW.map(card)) for (const x of c.qs) {
    const ok = bare(x.opts.find((o) => o.ok).t);
    for (const [, m] of c.words) for (const part of m.split(' — ')) if (bare(part).length >= 6) assert.ok(!ok.includes(bare(part)), `${x.id} 낱말 풀이 그대로 — ${part}`);
  }
  assert.equal(q('K69-2').opts.find((o) => o.ok).t, '코올코올 — 우리 애기');
  // #5 K70-2 지어내기는 시에 없는 말(반대로 읽기가 아니라)
  assert.equal(q('K70-2').opts.find((o) => o.type === 'make').t, '두 연 모두 할아버지가 이웃을 만나러 들에 나가셨다');
  // 덤 — 중심 생각·가장 말하고 싶은 것·주장은 글의 문장을 그대로 옮긴 보기가 정답이 아니다(낱말 맞추기로 고르지 않게) · K69-3 물음은 답(같은 짜임)을 먼저 말하지 않는다
  for (const c of NEW.map(card)) {
    const L = (c.lines || c.stanzas.flat()).map(bare);
    for (const x of c.qs.filter((y) => /중심|가장 말하고 싶은|주장 찾기/.test(y.skill))) assert.ok(!L.some((l) => l.includes(bare(x.opts.find((o) => o.ok).t))), `${x.id} 정답이 글 그대로`);
  }
  assert.deepEqual(QS.filter((x) => /중심|가장 말하고 싶은|주장 찾기/.test(x.skill)).map((x) => x.id), ['K62-1', 'K64-4', 'K67-4']);
  assert.ok(!/같은 짜임/.test(q('K69-3').q));
});
