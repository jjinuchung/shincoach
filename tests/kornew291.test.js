// 📚 바위절마을 호상놀이로 읽는 국어 글 넷 v291 (2026-10-18, 아버님 "이대로 진행"): K103~K106 · 🧩 O23
//  · 아버님이 보내신 보존회 책자 사진으로 — 문장은 옮기지 않고 사실만 새로 씀(source) · 달구질 소리 노랫말만 띄어쓰기를 고쳐 옮김
//  · 사실은 공공 자료와 대조(국가유산청 공개 API · 한국민속대백과사전 「바위절마을 호상놀이」 · 강동문화포털 · 표준국어대사전) —
//    책자에만 있거나 자료끼리 다른 것은 뺐다(아래 GONE)
//  · 장례 이야기는 문화유산 소개로 담담하게 — 시신·관·하관·저승 같은 말 없이 "세상을 떠난 분"
//  · Codex 97차 반영(아버님 "그래 이대로 진행"): 읽지 않고도 풀리던 K106 물음 둘 · 근거 줄 · 오답 풀이 · "오늘날 공연" · 좌우
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkContent, validCards, lineCount, rowsLayout } from '../js/korean.js';
import { checkPuzzles } from '../js/korpuzzle.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const DATA = JSON.parse(read('coach/korean/reading.json'));
const PUZ = JSON.parse(read('coach/korean/puzzles.json'));
const UNITS = JSON.parse(read('coach/korean/units.json')).units;
const IDS = DATA.cards.map((c) => c.id);
const card = (id) => DATA.cards.find((c) => c.id === id);
const NEW = ['K103', 'K104', 'K105', 'K106'];
const QS = NEW.flatMap((id) => card(id).qs);
const CIRC = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
const nums = (s) => [...new Set([...String(s || '')].map((ch) => CIRC.indexOf(ch) + 1).filter((n) => n > 0))];
const bare = (s) => String(s).replace(/[\s.,!?'"·…—–\-()「」]/g, '');
const text = (id) => card(id).lines.join(' ');
/** 아이가 보는 글 전부 (글·낱말·물음·보기·풀이·생각 쓰기) */
const kidText = (id) => JSON.stringify({ ...card(id), meta: null, source: null });

// 성취기준 공식 문구 (2022 개정 5~6학년) — 그 글의 단원
const STD = {
  '6국02-02': ['글에서 생략된 내용이나 함축된 표현을 문맥을 고려하여 추론한다.', '5-2-3'],
  '6국02-01': ['글의 구조를 고려하며 주제나 주장을 파악하고 글 내용을 요약한다.', '5-1-4'],
  '6국05-02': ['비유적 표현의 효과에 유의하여 작품을 감상한다.', '5-1-6'],
};

test('📚 호상놀이 글 넷 (v291): 연습 카드 · 물음 열여섯 · 원고 검사 통과 · 단원 지도(5-2-3 · 5-1-4 둘 · 5-1-6) · 성취기준 공식 문구 · ✍️ 하나 · 노랫말은 줄마다 · 바탕 글 밝힘', () => {
  assert.deepEqual(checkContent(DATA), []);
  assert.deepEqual(IDS.slice(102, 106), NEW);
  assert.equal(validCards(DATA).length, 154); // v298 4학년 2학기 글 열둘 · v320 4학년 2학기 글 둘째 묶음 열둘 · v322 4학년 2학기 글 셋째 묶음 열둘 · v347 4학년 2학기 글 넷째 묶음 열둘 더함
  assert.deepEqual(NEW.map((id) => [card(id).kind, card(id).genre]), [['practice', '설명하는 글'], ['practice', '설명하는 글'], ['practice', '설명하는 글'], ['practice', '노래(민요)']]);
  assert.equal(QS.length, 16);
  assert.deepEqual(NEW.map((id) => lineCount(card(id))), [11, 9, 10, 11], '지금 글과 비슷한 길이(20줄 안)');
  // 📘 단원 지도
  const unitOf = (id) => UNITS.filter((u) => u.cards.includes(id)).map((u) => u.id);
  assert.deepEqual(NEW.map(unitOf), [['5-2-3'], ['5-1-4'], ['5-1-4'], ['5-1-6']]);
  // 성취기준 — 공식 문구 그대로 · 그 글의 단원
  for (const id of NEW) {
    const found = card(id).meta.flatMap((m) => [...m.matchAll(/\[(6국0\d-0\d)\]\s*([^·[]*)/g)].map((x) => [x[1], x[2].trim()]));
    assert.equal(found.length, 1, `${id} 성취기준 하나`);
    const [k, said] = found[0];
    assert.ok(Object.hasOwn(STD, k), `${id} ${k}`);
    assert.equal(said, STD[k][0], `${id} ${k} 문구`);
    assert.equal(unitOf(id)[0], STD[k][1], `${id} 단원`);
  }
  // ✍️ 하나 — 글에 바탕을 둔 까닭 + 내 생각 · 맞춤법은 채점하지 않음
  assert.deepEqual(NEW.filter((id) => card(id).write), ['K103']);
  const w = card('K103').write;
  assert.equal(w.v, 1);
  assert.ok(w.rubric.must.length >= 2 && w.rubric.miss.some((m) => /맞춤법/.test(m)));
  for (const fr of w.frames) assert.ok(fr.endsWith('~'), fr);
  // 노랫말은 줄마다 · 설명하는 글은 문단
  assert.deepEqual(NEW.filter((id) => rowsLayout(card(id))), ['K106']);
  // 바탕 글 — 책자를 바탕으로 다시 쓴 글(셋) · 노랫말을 옮긴 글(하나)
  for (const id of ['K103', 'K104', 'K105']) assert.match(card(id).source, /^바위절마을 호상놀이 보존회 책자와 국가유산청·국립민속박물관 자료를 바탕으로 신코치가 쉬운 말로 다시 썼어요\.$/, id);
  assert.match(card('K106').source, /보존회 책자에 실린 달구질 소리의 앞부분을 옮기고 띄어쓰기만 고쳤어요\.$/);
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(read('sw.js')) || [])[1]) >= 291, 'sw는 v291 이상(원고가 앱 셸)');
});

test('📚 물음 (v291): 물음마다 지어내기 보기 · 정답만 유난히 길지 않게 · 근거 풀이가 짚는 줄은 근거로도 받음 · 모두 근거가 있는 물음 · 낱말 풀이를 정답에 옮기지 않음 · 중심 정답은 글을 그대로 옮기지 않음', () => {
  for (const x of QS) {
    assert.ok(x.opts.some((o) => o.type === 'make'), `${x.id} 지어내기 보기`);
    const len = x.opts.map((o) => [...o.t].length);
    const k = x.opts.findIndex((o) => o.ok);
    assert.ok(len[k] <= Math.max(...len.filter((_, i) => i !== k)) * 1.3, `${x.id} 정답 보기 길이`);
    assert.ok(Array.isArray(x.ev) && x.ev.length, `${x.id} 근거`);
    assert.deepEqual(nums(x.evNote).filter((n) => !x.ev.includes(n)), [], `${x.id} 근거 풀이가 쓰는 줄은 근거로도 받는다`);
  }
  for (const c of NEW.map(card)) for (const x of c.qs) {
    const ok = bare(x.opts.find((o) => o.ok).t);
    for (const [, m] of c.words) for (const part of m.split(' — ')) if (bare(part).length >= 6) assert.ok(!ok.includes(bare(part)), `${x.id} 낱말 풀이 그대로 — ${part}`);
    if (/중심/.test(x.skill)) assert.ok(!c.lines.map(bare).some((l) => l.includes(ok)), `${x.id} 중심 정답이 글 그대로`);
  }
  const used = new Set(QS.flatMap((x) => x.opts.filter((o) => !o.ok).map((o) => o.type)));
  assert.deepEqual([...used].sort(), ['detail', 'flip', 'link', 'literal', 'make', 'time']);
});

test('🔍 Codex 97차 (v291): 글에 있는 것을 고른 잘못은 풀이가 그 줄을 짚는다 · K106 물음은 노래를 읽어야 풀린다 · 근거는 답을 바로 받치는 줄만 · 오늘날 공연 · 좌우', () => {
  // 세부만·엉뚱한 연결·글자만·때 헷갈리기는 글에 있는 것을 고른 잘못 — 풀이가 그 줄을 짚는다 (글에 없으면 지어내기 — K104-1 "많고 적은 까닭")
  for (const x of QS) for (const o of x.opts) if (['detail', 'link', 'literal', 'time'].includes(o.type)) assert.ok(nums(o.why).length, `${x.id} "${o.t}" 풀이가 줄을 짚는다`);
  const q = (id) => QS.find((x) => x.id === id);
  const ok = (id) => q(id).opts.find((o) => o.ok).t;
  assert.match(card('K104').lines[4], /건너기 어려운 곳/, 'K104-1 세부 보기는 ⑤에 정말 있는 내용');
  assert.ok(q('K104-1').opts.some((o) => o.t.includes('건너기 어려운 곳') && o.type === 'detail'));
  // K106-1 — 물음에 정답 줄을 담지 않는다(낱말 풀이 "일심 = 한마음"만으로 풀렸다) · 정답만 노래에 두 번 · 근거는 그 두 줄
  const song = card('K106').lines.slice(2);
  const times = (t) => song.filter((l) => l === t).length;
  assert.ok(!q('K106-1').q.includes('일심'));
  assert.deepEqual(q('K106-1').opts.map((o) => times(o.t)), q('K106-1').opts.map((o) => (o.ok ? 2 : o.type === 'make' ? 0 : 1)));
  assert.deepEqual(q('K106-1').ev, song.flatMap((l, i) => (l === ok('K106-1') ? [i + 3] : [])));
  // K106-4 — 제목 「흙을 다지며 부르는」이 때를 알려 주므로 부르는 방법(앞소리와 받는 소리)을 묻는다
  assert.doesNotMatch(q('K106-4').q, /언제/);
  assert.match(ok('K106-4'), /^앞소리를 하는 사람이 부르면 .*받/);
  assert.deepEqual(q('K106-4').ev, [2]);
  // 근거 — ⑦ 늦게 온 사람의 인사 · ⑦ 길의 높낮이는 답을 바로 받치지 않는다 · ⑧ 높이 맞추기는 다른 점을 받친다
  assert.deepEqual(['K104-4', 'K105-3', 'K105-2'].map((id) => q(id).ev), [[6], [8, 10], [4, 7, 8, 9]]);
  // 지어낸 말이 둘 든 보기는 풀이도 둘 다 짚는다
  assert.match(q('K105-2').opts.find((o) => o.t.includes('내려놓는다')).why, /상여를 내려놓는다는 말도 글에 없어요/);
  // K103의 호상놀이(장례 전날 밤 빈 상여)와 K104의 장례 전체 차례(오늘날 공연)를 가른다
  const L = card('K104').lines;
  assert.ok(L[0].startsWith('오늘날 호상놀이 공연에는') && L[8].startsWith('이처럼 호상놀이 공연은'));
  // ⑩ "좌우로 제치면서" — 좌우만 풀고, "제치다"는 이 노랫말에서의 뜻을 자료로 확인하지 못해 풀지 않는다
  assert.equal(card('K106').words.find((w) => w[0] === '좌우')?.[1], '왼쪽과 오른쪽');
  assert.ok(!card('K106').words.some((w) => w[0].startsWith('제치')));
});

test('🏛️ 사실 대조 (v291): 공공 자료로 확인한 사실은 글에 그대로 · 책자에만 있거나 자료끼리 다른 것은 뺐다', () => {
  // 국가유산청: 1996.09.30 지정 · "출상시 험난한 길을 무사히 갈 수 있도록 전날 밤 … 빈상여를 메고 … 발을 맞추는 놀이" ·
  //            "1960년대 암사동이 서울시에 편입되면서 … 자취를 감추었으나" · 민속대백과: 1990년 복원 · 문씨 집안 부부가 잇달아 세상을 떠나 두 채의 부부 상여
  const t103 = text('K103');
  for (const s of ['암사동', '바위절마을', '장례 전날 밤', '빈 상여', '무사히 지나갈 수 있도록', '부부가 잇달아 세상을 떠나', '쌍상여 호상놀이라고도', '1960년대', '1990년', '1996년', '무형문화재', '무형유산']) assert.ok(t103.includes(s), `K103 ${s}`);
  // 호상(好喪) = 복을 누리고 오래 산 사람의 상사 (표준국어대사전)
  assert.match(card('K103').lines[2], /^호상은 복을 누리며 오래 산 분이 세상을 떠난 일을 말한다\.$/);
  // 민속대백과: 4열 중 바깥 2열이 빠지고 안쪽 2열만 V자 — 징검다리도 같음 · 산비탈·낮은 논둑은 4열 그대로, 높은 쪽 숙이고 낮은 쪽 치켜듦
  const t105 = text('K105');
  for (const s of ['네 줄', '바깥쪽 두 줄이 빠지고 안쪽 두 줄만', 'V자', '징검다리에서도 외나무다리처럼 안쪽 두 줄만', '네 줄이 그대로', '높은 쪽 두 줄은 몸을 숙이고', '낮은 쪽 두 줄은 상여를 높이 치켜들어']) assert.ok(t105.includes(s), `K105 ${s}`);
  // 강동문화포털: 노제 — 친하던 사람의 집 앞이나 자기 논밭 · 늦게 온 조객이 마지막 문상 · 달구질은 무덤에서
  const t104 = text('K104');
  for (const s of ['친하던 사람의 집 앞', '논밭', '늦게 온 사람들도 마지막으로 인사', '바로 전에 발인제', '출상', '무덤에 이르면', '달구질']) assert.ok(t104.includes(s), `K104 ${s}`);
  // 책자에만 있거나 자료끼리 달라 뺀 것
  const GONE = [/유일/, /증조/, /구암사/, /거북/, /노잣돈/, /평토제/, /두 줄로 바뀐/, /초혼/, /이종천|이재경/, /금슬|금실/, /광복/, /에헤|달구야/];
  for (const id of NEW) for (const re of GONE) assert.doesNotMatch(kidText(id), re, `${id} ${re}`);
  // 차례: 낱말 뜻으로 분명한 단계만 차례 말로 잇는다 — 노제와 다리 건너기의 앞뒤는 "또"로 늘어놓기만 하고 묻지 않는다
  const L = card('K104').lines;
  const at = (s) => L.findIndex((l) => l.includes(s));
  assert.ok(at('빈 상여') < at('발인제를 지낸다') && at('발인제를 지낸다') < at('출상') && at('출상') < at('달구질을 한다'));
  assert.match(L[at('노제를 지낸다')], /^또 /);
  for (const x of card('K104').qs) assert.ok(!(/노제/.test(x.q) && /다리/.test(x.q)), `${x.id} 노제와 다리의 앞뒤를 묻지 않는다`);
});

test('🕯️ 장례 이야기의 수위 (v291): 문화유산 소개로 담담하게 — "세상을 떠난 분" · 시신·관·하관·저승·병 같은 말 없이', () => {
  const HARD = /시신|시체|송장|주검|관을|관이|하관|저승|사자|염습|곡소리|통곡|병이|병들|아파|죽음|죽은|죽었|죽어|죽는/;
  for (const id of NEW) assert.doesNotMatch(kidText(id), HARD, id);
  assert.deepEqual(NEW.filter((id) => /세상을 떠난/.test(kidText(id))), ['K103'], '장례를 설명하는 첫 글에서 "세상을 떠난 분"으로 · 나머지는 차례·길·노래 이야기');
  // 낱말 풀이도 같은 말로
  assert.equal(card('K103').words.find((w) => w[0] === '상여')[1], '세상을 떠난 분을 모시고 무덤까지 가는 가마');
});

test('🎶 달구질 소리 (v291): 노랫말은 책자 그대로(띄어쓰기만) · "~듯이" 빗대기 둘 · "일심으로 다져 보세" 되풀이 · 짝을 이룬 두 줄', () => {
  // 보존회 책자 「호상놀이 소리들」의 달구지소리 — 띄어쓰기 없이 견준다 (책자의 "달고대"는 달굿대의 말소리 그대로 · 낱말 풀이에서 달굿대라고 알려 줌)
  const BOOK = '달고닷은동간님네이내말씀들어보소세상천지만물중에인간밖에또있는가우리인생한번가면다시오기어려워라한두사람이다질지라도열스물이다지듯이일심으로다져보세먼데사람듣기좋게가까운사람보기좋게한발두뼘달고대를두세발이되는듯이좌우로제치면서일심으로다져보세깍은머리를흔들어가며삼등허리를꾸부리면서일심으로다져보세';
  const song = card('K106').lines.slice(2);
  assert.equal(song.length, 9);
  assert.ok(BOOK.includes(song.map(bare).join('')), '노랫말은 책자의 이어진 한 부분 — 줄인 곳 없이');
  assert.doesNotMatch(song.join(' '), /인생|다시 오기/, '세상을 떠나는 말이 든 앞부분은 옮기지 않았다');
  assert.equal(song.filter((l) => /듯이$/.test(l)).length, 2);
  assert.equal(song.filter((l) => l === '일심으로 다져 보세').length, 2);
  assert.deepEqual([song[3], song[4]], ['먼 데 사람 듣기 좋게', '가까운 사람 보기 좋게']);
  assert.match(card('K106').words.find((w) => w[0] === '달고대')[1], /\(달굿대\)$/);
});

test('🧩 O23 호상놀이에 담긴 장례의 차례 (v291): K104에 딸림 · 실마리 말은 조각에 있음 · 맞는 차례가 하나뿐 · 원고 검사 통과', () => {
  assert.deepEqual(checkPuzzles(PUZ, DATA.cards), []);
  const o = PUZ.puzzles.find((p) => p.id === 'O23');
  assert.deepEqual([o.kind, o.ask, o.card], ['order', 'event', 'K104']);
  assert.equal(o.chunks.length, 4);
  for (const [a, b, clue] of o.need) assert.ok(o.chunks[a].includes(clue) || o.chunks[b].includes(clue), clue);
  // 조각마다 K104에 있는 일 — 장례 전날 밤 → 발인제 → 길 떠남 → 달구질
  for (const [i, s] of [[0, '빈 상여'], [1, '발인제'], [2, '길을 떠나요'], [3, '달구질']]) assert.ok(o.chunks[i].includes(s), `${i} ${s}`);
  assert.ok(!o.chunks.some((c) => /노제|다리/.test(c)), '자료마다 자리가 다른 노제·다리 건너기는 넣지 않는다');
  // O22 다음 자리
  const ids = PUZ.puzzles.map((p) => p.id);
  assert.equal(ids.indexOf('O23'), ids.indexOf('O22') + 1);
});
