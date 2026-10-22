// 📚 새 국어 글 열둘 v281 (2026-10-17, 아버님 "이대로 해"): K85~K96
//  · 글이 네 편뿐이던 단원 여덟에 한 편씩 — 5-1 독서 K85 · 5-1-1 K86 · 5-1-2 K87 ✍️ · 5-1-3 K88 · 5-1 매체 K89 · 5-2 독서 K90 · 5-2-4 K91 · 5-2-5 K92 ✍️
//  · ✨ 명작 넷 — ⭐ 윤동주 「서시」 K93 · 한용운 「알 수 없어요」 K94(위키문헌 원문 대조) · 「견우와 직녀」 K95 · ⭐ 이규보 「이옥설」 K96 ✍️(다시 씀)
//  · K91 전라도 말은 국립국어원 『새국어생활』 15권 2호(2005 여름) 「전라북도 방언 이야기」(이태영) 145~148쪽에 나온 말만
//  · K95는 국립민속박물관 한국민속대백과사전 「견우직녀」·「칠석」 · K96은 한국고전종합DB 『동국이상국집』 「이옥설」 번역의 차례대로 다시 씀
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkContent, validCards, lineCount, rowsLayout } from '../js/korean.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const DATA = JSON.parse(read('coach/korean/reading.json'));
const UNITS = JSON.parse(read('coach/korean/units.json')).units;
const card = (id) => DATA.cards.find((c) => c.id === id);
const NEW = ['K85', 'K86', 'K87', 'K88', 'K89', 'K90', 'K91', 'K92', 'K93', 'K94', 'K95', 'K96'];
const QS = NEW.flatMap((id) => card(id).qs);
const q = (id) => QS.find((x) => x.id === id);
const CIRC = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
// 풀이 속 번호 — '⑤~⑧'처럼 이어 쓴 것은 사이 번호까지 (Codex 88차: 끝 번호만 읽으면 가운데를 놓친다)
const nums = (s) => {
  const t = String(s || '');
  const out = new Set([...t].map((ch) => CIRC.indexOf(ch) + 1).filter((n) => n > 0));
  for (const m of t.matchAll(new RegExp(`([${CIRC}])~([${CIRC}])`, 'g'))) for (let n = CIRC.indexOf(m[1]) + 1; n <= CIRC.indexOf(m[2]) + 1; n++) out.add(n);
  return [...out];
};
const bare = (s) => String(s).replace(/[\s.,!?'"·…—–\-()「」]/g, '');
const linesOf = (c) => c.lines || c.stanzas.flat();
const text = (id) => linesOf(card(id)).join(' ');
const right = (id) => q(id).opts.find((o) => o.ok).t;

/** 쓰는 성취기준 — 공식 문구와 그 글의 단원 */
const STD = {
  '6국05-04': ['인상적인 부분을 중심으로 작품에 대한 의견을 나눈다.', ['5-1-독서']],
  '6국01-01': ['대화에서 생략된 내용을 추론하며 듣는다.', ['5-1-1']],
  '6국03-03': ['체험한 일에 대한 감상을 나타내는 글을 쓴다.', ['5-1-2']],
  '6국01-05': ['자료를 선별하여 핵심 정보를 중심으로 내용을 구성하고 매체를 활용하여 발표한다.', ['5-1-3']],
  '6국06-01': ['정보 검색 도구를 활용하여 자신의 목적에 맞는 매체 자료를 찾는다.', ['5-1-매체']],
  '6국02-05': ['긍정적인 읽기 동기를 형성하고 적극적으로 읽기에 참여하는 태도를 기른다.', ['5-2-독서']],
  '6국04-02': ['표준어와 방언의 기능을 파악하고 언어 공동체와 국어생활과의 관계를 이해한다.', ['5-2-4']],
  '6국01-06': ['토의에 협력적으로 참여하며 서로의 의견을 비교하고 조정한다.', ['5-2-5']],
  '6국05-01': ['작가의 의도를 생각하며 작품을 읽는다.', ['5-2-6']],
  '6국05-02': ['비유적 표현의 효과에 유의하여 작품을 감상한다.', ['5-1-6']],
  '6국02-02': ['글에서 생략된 내용이나 함축된 표현을 문맥을 고려하여 추론한다.', ['5-2-3']],
};

test('📚 새 글 열둘 (v281): 연습 여덟 + ✨ 명작 넷 · 물음 마흔여섯 · 원고 검사 통과 · 네 편뿐이던 단원 여덟에 한 편씩 · 성취기준 공식 문구 · ✍️ 셋 · 대화 글은 줄마다 · ⭐ 미리보기는 확인된 둘만', () => {
  assert.deepEqual(checkContent(DATA), []);
  assert.deepEqual(DATA.cards.slice(84, 96).map((c) => c.id), NEW);
  assert.equal(validCards(DATA).length, 130); // v282 포켓몬 글 여섯 · v291 호상놀이 글 넷 · v298 4학년 2학기 글 열둘 · v320 4학년 2학기 글 둘째 묶음 열둘 더함
  assert.deepEqual(NEW.map((id) => [card(id).kind, card(id).genre]), [
    ['practice', '독서 대화'], ['practice', '문자 대화'], ['practice', '생활문'], ['practice', '발표 준비 메모'], ['practice', '생활문'], ['practice', '생활문'],
    ['practice', '생활문'], ['practice', '토의'], ['classic', '시'], ['classic', '시'], ['classic', '옛이야기'], ['classic', '고전 수필']]);
  assert.deepEqual(NEW.map((id) => card(id).qs.length), [4, 4, 4, 4, 4, 4, 4, 4, 3, 3, 4, 4], '연습·옛이야기는 넷 · 짧은 시는 셋');
  assert.equal(QS.length, 46);
  assert.deepEqual(NEW.map((id) => lineCount(card(id))), [11, 11, 12, 12, 10, 10, 12, 10, 9, 6, 14, 13], '지금 글과 비슷한 길이(20줄 안)');
  for (const id of NEW) assert.ok(card(id).words.length >= 5, `${id} 낱말 다섯 이상`);
  for (const id of NEW) assert.ok(!Object.hasOwn(card(id), 'source'), `${id}는 바탕 글(신문) 없음`);
  // 📘 단원 지도 — 네 편뿐이던 단원 여덟 + 명작 넷 · 새 글은 단원 하나에
  const of = (u) => UNITS.find((x) => x.id === u).cards.filter((id) => NEW.includes(id));
  assert.deepEqual(
    ['5-1-독서', '5-1-1', '5-1-2', '5-1-3', '5-1-매체', '5-2-독서', '5-2-4', '5-2-5', '5-2-6', '5-1-6', '5-2-3'].map(of),
    [['K85'], ['K86'], ['K87', 'K96'], ['K88'], ['K89'], ['K90'], ['K91'], ['K92'], ['K93'], ['K94'], ['K95']]);
  for (const id of NEW) assert.equal(UNITS.filter((u) => u.cards.includes(id)).length, 1, `${id} 단원 하나`);
  // v282 포켓몬 글(K97~)은 빼고 센다 — 5-1-3·5-2-독서에 한 편씩 더 들어갔다
  for (const u of ['5-1-독서', '5-1-1', '5-1-3', '5-1-매체', '5-2-독서', '5-2-4', '5-2-5']) assert.equal(UNITS.find((x) => x.id === u).cards.filter((id) => Number(id.slice(1)) <= 96).length, 5, `${u} 네 편 → 다섯 편`);
  // 성취기준 — 공식 문구 그대로 · 그 글의 단원과 이어진 것
  for (const id of NEW) {
    const found = card(id).meta.flatMap((m) => [...m.matchAll(/\[(6국0\d-0\d)\]\s*([^·[]*)/g)].map((x) => [x[1], x[2].trim()]));
    assert.equal(found.length, 1, `${id} 성취기준 하나`);
    const [k, said] = found[0];
    assert.ok(Object.hasOwn(STD, k), `${id} ${k}`);
    assert.equal(said, STD[k][0], `${id} ${k} 문구`);
    assert.ok(STD[k][1].includes(UNITS.find((u) => u.cards.includes(id)).id), `${id} 단원`);
  }
  // ✍️ 셋 — 체험 · 토의 결정에 대한 생각 · 미루다 커진 일과 깨달음 · 맞춤법은 채점하지 않음 · 틀의 빈자리는 끝에
  assert.deepEqual(NEW.filter((id) => card(id).write), ['K87', 'K92', 'K96']);
  for (const id of ['K87', 'K92', 'K96']) {
    const w = card(id).write;
    assert.equal(w.v, 1, id);
    assert.ok(w.rubric.must.length >= 2, id);
    assert.ok(w.rubric.miss.some((m) => /맞춤법/.test(m)), `${id} 맞춤법은 채점하지 않는다`);
    for (const fr of w.frames) assert.ok(fr.endsWith('~'), `${id} ${fr}`);
  }
  // 대화(이름: 말)·메모는 줄마다 · 생활문은 문단
  assert.deepEqual(NEW.filter((id) => rowsLayout(card(id))), ['K85', 'K86', 'K88', 'K92']);
  // ⭐ 중학교 미리보기는 교과서 수록을 확인한 둘만(「서시」 — 지학사 중1-2 · 「이옥설」 — 중3 교과서 작품 선집) · 「알 수 없어요」는 확인 못 해 일반 명작
  assert.deepEqual(NEW.filter((id) => card(id).pre), ['K93', 'K96']);
  assert.ok(!Object.hasOwn(card('K94'), 'pre') && !/중학교/.test(card('K94').meta.join(' ')));
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(read('sw.js')) || [])[1]) >= 281, 'sw는 v281 이상(원고가 앱 셸)');
});

test('📚 물음 (v281): 물음마다 지어내기 보기 · 정답만 유난히 길지 않게 · 근거 풀이가 짚는 줄은 근거로도 받음 · 근거 없는 물음(둘)엔 풀이와 둘째 힌트 · 낱말 풀이를 옮긴 정답 없이 · 중심 내용·생각 정답은 글 그대로가 아님', () => {
  for (const x of QS) {
    assert.ok(x.opts.some((o) => o.type === 'make'), `${x.id} 지어내기 보기`);
    const len = x.opts.map((o) => [...o.t].length);
    const k = x.opts.findIndex((o) => o.ok);
    assert.ok(len[k] <= Math.max(...len.filter((_, i) => i !== k)) * 1.3, `${x.id} 정답 보기 길이`);
    if (x.ev) assert.deepEqual(nums(x.evNote).filter((n) => !x.ev.includes(n)), [], `${x.id} 근거 풀이가 쓰는 줄은 근거로도 받는다`);
    else assert.ok(x.hint2 && x.doneNote, `${x.id} 둘째 힌트·풀이`);
  }
  assert.deepEqual(QS.filter((x) => !x.ev).map((x) => x.id), ['K87-1', 'K94-2']);
  for (const c of NEW.map(card)) for (const x of c.qs) {
    const ok = bare(x.opts.find((o) => o.ok).t);
    for (const [, m] of c.words) for (const part of m.split(' — ')) if (bare(part).length >= 6) assert.ok(!ok.includes(bare(part)), `${x.id} 낱말 풀이 그대로 — ${part}`);
    if (/중심|가장 말하고 싶은|글쓴이의 생각|깨달음 찾기/.test(x.skill)) assert.ok(!linesOf(c).map(bare).some((l) => l.includes(ok)), `${x.id} 정답이 글 그대로`);
  }
  const used = new Set(QS.flatMap((x) => x.opts.filter((o) => !o.ok).map((o) => o.type)));
  assert.deepEqual([...used].sort(), ['detail', 'flip', 'fo', 'link', 'literal', 'make', 'time']);
  // 🔍 Codex 88차: 정답을 바로 받쳐 주는 좋은 근거는 받고(K85-3 ⑩ · K86-2 ⑥ · K92-4 ⑨) · 정답의 까닭이 없는 줄은 받지 않는다(K95-4 ⑩에는 돌 이야기가 없다)
  assert.deepEqual(['K85-3', 'K86-2', 'K92-4', 'K95-4'].map((id) => q(id).ev), [[8, 9, 10], [4, 5, 6], [6, 7, 8, 9, 10], [13]]);
  assert.deepEqual(nums('⑤~⑧').sort((a, b) => a - b), [5, 6, 7, 8], '이어 쓴 번호도 읽는다');
  // 물음 유형을 고루 — 사실·생각 질문 · 말하지 않은 뜻 · 겪은 일과 생각 · 자료 고르기 · 정보 읽기 · 방언 짐작 · 의견 조정 · 빗대기 · 유래
  const skills = new Set(QS.map((x) => x.skill));
  for (const s of ['사실 질문 알아보기', '말하지 않은 뜻 짐작하기', '겪은 일과 생각·느낌 가르기', '듣는 사람에 맞는 자료', '찾은 정보를 바르게 읽기', '앞뒤 상황으로 방언 짐작하기', '조정하는 방법', '무엇을 무엇에 빗대었나', '이야기에 담긴 유래']) assert.ok(skills.has(s), s);
});

test('🌟 「서시」·🍃 「알 수 없어요」 (v281): 위키문헌 원문을 오늘 맞춤법으로 옮긴 그대로 · 바꾼 것은 원문 줄에 · 풀이가 갈리는 말(누구·주어진 길)은 묻지 않음 · 저작권 해', () => {
  assert.deepEqual(card('K93').stanzas, [
    ['죽는 날까지 하늘을 우러러', '한 점 부끄럼이 없기를,', '잎새에 이는 바람에도', '나는 괴로워했다.', '별을 노래하는 마음으로', '모든 죽어 가는 것을 사랑해야지', '그리고 나한테 주어진 길을', '걸어가야겠다.'],
    ['오늘 밤에도 별이 바람에 스치운다.'],
  ]);
  assert.deepEqual(card('K94').stanzas, [[
    '바람도 없는 공중에 수직의 파문을 내며 고요히 떨어지는 오동잎은 누구의 발자취입니까',
    '지리한 장마 끝에 서풍에 몰려가는 무서운 검은 구름의 터진 틈으로 언뜻언뜻 보이는 푸른 하늘은 누구의 얼굴입니까',
    '꽃도 없는 깊은 나무에 푸른 이끼를 거쳐서 옛 탑 위의 고요한 하늘을 스치는 알 수 없는 향기는 누구의 입김입니까',
    '근원은 알지도 못할 곳에서 나서 돌부리를 울리고 가늘게 흐르는 작은 시내는 굽이굽이 누구의 노래입니까',
    '연꽃 같은 발꿈치로 가없는 바다를 밟고 옥 같은 손으로 끝없는 하늘을 만지면서 떨어지는 날을 곱게 단장하는 저녁놀은 누구의 시입니까',
    '타고 남은 재가 다시 기름이 됩니다 그칠 줄을 모르고 타는 나의 가슴은 누구의 밤을 지키는 약한 등불입니까',
  ]]);
  const fact = (id, k) => card(id).facts.find((f) => f[0] === k)[1];
  assert.match(fact('K93', '원문'), /한점 → 한 점 · 죽어가는것을 → 죽어 가는 것을/);
  assert.match(fact('K93', '원문'), /'우르러'는 1955년 판처럼 '우러러'로/);
  assert.match(fact('K94', '원문'), /내이며 → 내며 · 돌뿌리 → 돌부리 · 구비구비 → 굽이굽이 · 가이 없는 → 가없는/);
  assert.match(fact('K94', '원문'), /'지리한'은 시인이 쓴 말 그대로/);
  assert.deepEqual(['K93', 'K94'].map((id) => Number(/(\d{4})년에 세상을 떠나/.exec(fact(id, '저작권'))[1])), [1945, 1944]);
  assert.deepEqual(['K93', 'K94'].map((id) => card(id).author), ['윤동주', '한용운']);
  // 누구인지·무엇인지 풀이가 갈리는 말은 묻지 않는다 — 물음과 보기에 '누구'를 풀어 말하지 않음
  for (const x of card('K94').qs) assert.ok(!/님|부처|조국|임[이은을의]/.test(x.q + x.opts.map((o) => o.t).join(' ')), x.id);
  assert.match(fact('K94', '알아 둘 것'), /'누구'가 누구인지는 읽는 사람마다 풀이가 달라서 묻지 않았어요/);
  assert.match(fact('K93', '알아 둘 것'), /읽는 사람마다 풀이가 달라서/);
  // 시 물음은 줄을 누르는 근거(K94-2 짜임만 근거 없이)
  assert.deepEqual(card('K93').qs.map((x) => x.ev), [[1, 2], [3, 4], [5, 6, 7, 8]]);
  assert.deepEqual(card('K94').qs.map((x) => x.ev), [[1], null, [6]]);
  // 🔍 Codex 88차: 짜임 물음은 ①~⑤로 — ⑥은 자연이 아니라 '나의 가슴'이라 "자연의 모습을 하나씩"이 시 전체에는 맞지 않는다
  assert.match(q('K94-2').q, /^①~⑤는 /);
  // 바람의 세기를 단정하지 않는다 (P3)
  assert.ok(!/세찬 바람이 아니에요/.test(JSON.stringify(q('K93-2'))));
});

test('🍚 전라도 말 (v281): 「전라북도 방언 이야기」에 나온 말만 · 뜻은 앞뒤 상황으로 짐작(낱말 풀이에 방언을 주지 않음) · 표준어에도 있는 말은 방언 예로 쓰지 않음 · 소리가 같은 표준어는 글자만 보기 · 방언을 낮추지 않음', () => {
  const c = card('K91');
  const t = text('K91');
  for (const w of ['인나서', '맹글어', '꼬순', '찬지름', '겁나게', '멀국', '포도시', '떴는디', '있응게', '~잉']) assert.ok(t.includes(w), w);
  assert.ok(!/후딱|거시기|시방|죄다|허벌나게/.test(t), '표준어에도 있는 말·출처에서 확인 못 한 말은 쓰지 않는다');
  for (const [w] of c.words) assert.ok(!/인나|맹글|꼬순|찬지름|겁나|멀국|포도시/.test(w), `낱말 풀이에 방언 없음 — ${w}`);
  // 방언 뜻 물음 셋은 앞뒤 상황(근거)을 누른다
  assert.deepEqual(['K91-1', 'K91-2', 'K91-3'].map((id) => q(id).ev), [[5, 6], [7, 8], [9, 10]]);
  assert.deepEqual(['K91-1', 'K91-2', 'K91-3'].map(right), ['고소한 냄새가 나는 참기름', '아주 맛있어요', '겨우']);
  // 소리만 보고 고른 보기(찬 = 차갑다 · 겁나다 = 무섭다 · 포도) = 글자만 보기
  assert.match(q('K91-1').opts.find((o) => o.type === 'literal').t, /차갑게/);
  assert.match(q('K91-2').opts.find((o) => o.type === 'literal').t, /무서울/);
  assert.match(q('K91-3').opts.find((o) => o.type === 'literal').t, /포도/);
  // 글은 방언을 틀린 말로 보지 않는다 — 그런 생각은 지어내기 보기로만
  assert.ok(!/틀린 말|바르지 않은 말|고쳐야 할 말|사투리는/.test(linesOf(c).join(' ')));
  assert.match(c.lines[11], /고장마다 쓰는 말은 달라도, 그 말에 담긴 마음은 똑같이 따뜻하다/);
  assert.equal(q('K91-4').opts.find((o) => /틀린 말/.test(o.t)).type, 'make');
  // 친구의 할머니 댁(가족을 지어내지 않게)
  assert.match(c.lines[0], /친구 지호와 함께 전주에 계신 지호네 할머니 댁/);
});

test('🌌 「견우와 직녀」 (v281): 한국민속대백과사전의 줄거리대로 — 옥황상제의 손녀 · 일을 게을리해 은하수를 사이에 두고 · 칠월 칠일 · 까마귀와 까치가 머리를 이어 놓은 다리 · 머리에 돌을 이고 날라 털이 벗겨짐 · 칠석날 비는 기쁨, 이튿날 비는 슬픔', () => {
  const c = card('K95');
  const t = text('K95');
  assert.equal(c.author, '지은이 모름 · 신코치가 다시 씀');
  assert.match(c.facts.find((f) => f[0] === '저작권')[1], /^지은이를 알 수 없는 옛이야기로/);
  for (const w of ['옥황상제의 손녀 직녀', '은하수를 사이에 두고', '음력 칠월 칠일', '서로 머리를 이어 은하수에 다리를', '오작교', '머리에 돌을 이고 날라서', '만나 기뻐서 흘리는 눈물', '이튿날 내리는 비는 헤어지며 흘리는 슬픈 눈물']) assert.ok(t.includes(w), w);
  assert.ok(!/머리를 밟혀|큰비가 되어|동쪽|서쪽/.test(t), '출처에 없는 꾸밈(밟혀서 · 눈물이 큰비 · 동서)은 넣지 않는다');
  assert.equal(right('K95-3'), '두 사람이 만나 기뻐서 흘리는 눈물');
  assert.equal(q('K95-3').opts.find((o) => o.type === 'time').t, '두 사람이 헤어지며 흘리는 슬픈 눈물', '이튿날 비는 때 헷갈리기');
  assert.equal(right('K95-4'), '다리를 놓느라 머리에 돌을 이고 날라서');
  assert.match(c.facts[0][1], /여러 가지로 전해요/, '머리 털 이야기가 갈래마다 다르다는 것');
});

test('🏚️ 「이옥설」 (v281): 번역문을 옮기지 않고 다시 씀 · 세 칸 = 오래 샌 두 칸 + 한 번 샌 한 칸 · 썩은 재목과 멀쩡한 재목 · 깨달음은 사람 → 나라 차례 · 저작권 해 1241', () => {
  const c = card('K96');
  assert.equal(c.author, '이규보 · 신코치가 다시 씀');
  assert.match(c.facts.find((f) => f[0] === '원문')[1], /신코치가 쉬운 말로 다시 썼어요/);
  assert.equal(Number(/(\d{4})년에 세상을 떠나/.exec(c.facts.find((f) => f[0] === '저작권')[1])[1]), 1241);
  assert.match(c.lines[0], /세 칸/);
  assert.match(c.lines[2], /두 칸은 장마 때 비가 샌 지 오래되었지만/);
  assert.match(c.lines[3], /나머지 한 칸은 비가 한 번 샜을 때 곧바로 기와를/);
  assert.match(c.lines[4], /서까래와 기둥, 들보가 모두 썩어/);
  assert.match(c.lines[6], /나무가 멀쩡해서 다시 쓸 수 있었고, 돈도 적게/);
  const person = c.lines.findIndex((l) => /^사람도/.test(l));
  const nation = c.lines.findIndex((l) => /^나라를 다스리는 일도/.test(l));
  assert.ok(person > 0 && nation > person, '사람 → 나라');
  assert.equal(right('K96-4'), '나라를 다스리는 일');
});

test('❓ 연습 글이 기대는 옛 글과 겹침 (v281): K85는 K53 「흥부와 놀부」 줄거리 그대로 · K92 토의는 K39 교실 화분과 다른 주제 · K88은 횡단보도에서 자전거를 끌고 건넘', () => {
  const k53 = text('K53'); const t = text('K85');
  assert.ok(/쌀과 돈, 비단/.test(k53) && /쌀과 돈, 비단/.test(t), '박에서 나온 것');
  assert.ok(/내쫓았다/.test(k53) && /내쫓을/.test(t));
  assert.ok(/맞아들였다/.test(k53) && /맞아들일/.test(t));
  assert.match(card('K85').meta[0], /K53/);
  assert.ok(!/화분/.test(text('K92')), 'K39와 겹치지 않게');
  assert.match(text('K88'), /횡단보도에서는 자전거에서 내려 끌고 건넌다/);
  // 🔍 Codex 88차: 813.8은 분류 기호뿐 — 청구 기호는 숫자와 글자로 된 표시(같은 분류 안에서 책을 가르는 도서 기호까지)
  assert.match(card('K89').lines[7], /청구 기호 813\.8-한53ㄷ/);
  assert.match(card('K89').lines[8], /책등에 붙은 숫자와 글자로 된 표시/);
  assert.ok(!/책등에 붙은 번호/.test(JSON.stringify(card('K89'))));
  assert.equal(q('K88-3').opts.find((o) => o.type === 'flip').t, '자전거를 타고 횡단보도를 건너는 그림');
});
