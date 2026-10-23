// 📚 글이 적은 단원 채우기 v267 (2026-10-16, 아버님 "이대로"): 연습 글 여섯 K79~K84
//  · 5-2 「올바른 문장으로 글을 써요」 K79 안내문(목적은~열립니다 · 반드시 · 아마) · K80 견학 일기(별로 · 마치 · 도무지 · 겪은 일과 생각 가르기)
//    — K17·K25가 다룬 호응(꿈은~되고 싶다 · 노래와 춤을 · 다음 주~갔다 · 왜냐하면 · 결코 · 높임)과 겹치지 않게
//  · 5-1 「매체로 발표해요」 K81 모둠 대화(그래프 고르기 · 화면에 꼭 필요한 말만 · 가져온 곳 밝히기 · 발표 차례)
//  · 5-2 「표준어와 방언을 알아봐요」 K82 충청 방언 + ✍️ — 국립국어원 『새국어생활』 16권 3호(2006 가을) 「충남의 언어 이야기」(한영목)에 나온 말만
//  · 5-1 독서 K83 「만년 셔츠」 독서 대화(K19 줄거리 그대로) · 5-2 독서 K84 팝업북·전자책·오디오북·점자책(K16의 종이·전자·오디오와 겹치지 않게)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkContent, validCards, lineCount, rowsLayout } from '../js/korean.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const DATA = JSON.parse(read('coach/korean/reading.json'));
const UNITS = JSON.parse(read('coach/korean/units.json')).units;
const card = (id) => DATA.cards.find((c) => c.id === id);
const NEW = ['K79', 'K80', 'K81', 'K82', 'K83', 'K84'];
const QS = NEW.flatMap((id) => card(id).qs);
const q = (id) => QS.find((x) => x.id === id);
const CIRC = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
const nums = (s) => [...new Set([...String(s || '')].map((ch) => CIRC.indexOf(ch) + 1).filter((n) => n > 0))];
const bare = (s) => String(s).replace(/[\s.,!?'"·…—–\-()「」]/g, '');
const text = (id) => card(id).lines.join(' ');

/** 쓰는 성취기준 — 공식 문구와 그 글의 단원 */
const STD = {
  '6국04-04': ['문장 성분을 이해하고 호응 관계가 올바른 문장을 구성한다.', '5-2-2'],
  '6국01-05': ['자료를 선별하여 핵심 정보를 중심으로 내용을 구성하고 매체를 활용하여 발표한다.', '5-1-3'],
  '6국04-02': ['표준어와 방언의 기능을 파악하고 언어 공동체와 국어생활과의 관계를 이해한다.', '5-2-4'],
  '6국05-04': ['인상적인 부분을 중심으로 작품에 대한 의견을 나눈다.', '5-1-독서'],
  '6국02-05': ['긍정적인 읽기 동기를 형성하고 적극적으로 읽기에 참여하는 태도를 기른다.', '5-2-독서'],
};

test('📚 단원 채우기 6편 (v267): 연습 카드 여섯 · 물음 스물넷 · 원고 검사 통과 · 단원 지도(3편뿐이던 단원 다섯) · 성취기준 공식 문구 · ✍️ 하나 · 대화 글은 줄마다', () => {
  assert.deepEqual(checkContent(DATA), []);
  assert.deepEqual(DATA.cards.slice(78, 84).map((c) => c.id), NEW);
  assert.equal(validCards(DATA).length, 142); // v281 새 글 열둘 · v282 포켓몬 글 여섯 · v291 호상놀이 글 넷 · v298 4학년 2학기 글 열둘 · v320 4학년 2학기 글 둘째 묶음 열둘 · v322 4학년 2학기 글 셋째 묶음 열둘 더함
  assert.deepEqual(NEW.map((id) => [card(id).kind, card(id).genre]), [
    ['practice', '안내문'], ['practice', '일기'], ['practice', '모둠 대화'], ['practice', '생활문'], ['practice', '독서 대화'], ['practice', '설명하는 글']]);
  assert.deepEqual(NEW.map((id) => card(id).qs.length), [4, 4, 4, 4, 4, 4]);
  assert.deepEqual(NEW.map((id) => lineCount(card(id))), [11, 11, 12, 12, 11, 12], '지금 글과 비슷한 길이(20줄 안)');
  for (const id of NEW) assert.ok(card(id).words.length >= 5, `${id} 낱말 다섯 이상`);
  for (const id of NEW) assert.ok(!Object.hasOwn(card(id), 'source'), `${id}는 신코치가 쓴 글(바탕 글 없음)`);
  // 📘 단원 지도 — 3편뿐이던 단원 다섯에 · 새 글은 단원 하나에
  const of = (u) => UNITS.find((x) => x.id === u).cards.filter((id) => NEW.includes(id));
  assert.deepEqual(['5-2-2', '5-1-3', '5-2-4', '5-1-독서', '5-2-독서'].map(of), [['K79', 'K80'], ['K81'], ['K82'], ['K83'], ['K84']]);
  for (const id of NEW) assert.equal(UNITS.filter((u) => u.cards.includes(id)).length, 1, `${id} 단원 하나`);
  // 성취기준 — 공식 문구 그대로 · 그 글의 단원과 이어진 것
  for (const id of NEW) {
    const found = card(id).meta.flatMap((m) => [...m.matchAll(/\[(6국0\d-0\d)\]\s*([^·[]*)/g)].map((x) => [x[1], x[2].trim()]));
    assert.equal(found.length, 1, `${id} 성취기준 하나`);
    const [k, said] = found[0];
    assert.ok(Object.hasOwn(STD, k), `${id} ${k}`);
    assert.equal(said, STD[k][0], `${id} ${k} 문구`);
    assert.equal(UNITS.find((u) => u.cards.includes(id)).id, STD[k][1], `${id} 단원`);
  }
  // ✍️ — 방언 글 하나(통화와 발표에 쓸 말) · 맞춤법은 채점하지 않음 · 틀의 빈자리는 끝에
  assert.deepEqual(NEW.filter((id) => card(id).write), ['K82']);
  const w = card('K82').write;
  assert.equal(w.v, 1);
  assert.ok(w.rubric.miss.some((m) => /맞춤법/.test(m)));
  assert.ok(w.rubric.miss.some((m) => /방언을 낮추는/.test(m)), '방언을 틀린 말로 보는 생각은 🔸');
  assert.match(w.q, /글에서 찾은 내용을 까닭으로/);
  for (const fr of w.frames) assert.ok(fr.endsWith('~'), fr);
  // 대화 글(이름: 말)과 안내문은 줄마다 · 일기·생활문·설명하는 글은 문단
  assert.deepEqual(NEW.filter((id) => rowsLayout(card(id))), ['K79', 'K81', 'K83']);
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(read('sw.js')) || [])[1]) >= 267, 'sw는 v267 이상(원고가 앱 셸)');
});

test('📚 물음 (v267): 물음마다 지어내기 보기 · 정답만 유난히 길지 않게 · 근거 풀이가 짚는 줄은 근거로도 받음 · 근거 없는 물음(고쳐 쓰기 여덟)엔 풀이와 둘째 힌트 · 낱말 풀이를 옮긴 정답 없이 · 중심 내용 정답은 글 그대로가 아님', () => {
  assert.equal(QS.length, 24);
  for (const x of QS) {
    assert.ok(x.opts.some((o) => o.type === 'make'), `${x.id} 지어내기 보기`);
    const len = x.opts.map((o) => [...o.t].length);
    const k = x.opts.findIndex((o) => o.ok);
    assert.ok(len[k] <= Math.max(...len.filter((_, i) => i !== k)) * 1.3, `${x.id} 정답 보기 길이`);
    if (x.ev) assert.deepEqual(nums(x.evNote).filter((n) => !x.ev.includes(n)), [], `${x.id} 근거 풀이가 쓰는 줄은 근거로도 받는다`);
    else assert.ok(x.hint2 && x.doneNote, `${x.id} 둘째 힌트·풀이`);
  }
  assert.deepEqual(QS.filter((x) => !x.ev).map((x) => x.id), ['K79-1', 'K79-2', 'K79-3', 'K79-4', 'K80-1', 'K80-2', 'K80-3', 'K80-4']);
  for (const c of NEW.map(card)) for (const x of c.qs) {
    const ok = bare(x.opts.find((o) => o.ok).t);
    for (const [, m] of c.words) for (const part of m.split(' — ')) if (bare(part).length >= 6) assert.ok(!ok.includes(bare(part)), `${x.id} 낱말 풀이 그대로 — ${part}`);
    if (/중심|가장 말하고 싶은|주장 찾기/.test(x.skill)) assert.ok(!c.lines.map(bare).some((l) => l.includes(ok)), `${x.id} 정답이 글 그대로`);
  }
  // 물음 유형을 고루 — 겪은 일과 생각 가르기 · 근거와 가져온 곳 · 차례
  const skills = QS.map((x) => x.skill);
  for (const s of ['겪은 일과 생각·느낌 가르기', '근거와 가져온 곳 짝 짓기', '발표 차례']) assert.ok(skills.includes(s), s);
  const used = new Set(QS.flatMap((x) => x.opts.filter((o) => !o.ok).map((o) => o.type)));
  assert.deepEqual([...used].sort(), ['agree', 'detail', 'flip', 'fo', 'link', 'literal', 'make', 'time']);
});

test('✏️ 호응 (v267): 고쳐 쓸 문장은 글에 그대로 틀린 채 · 고친 정답은 그 문장에서 끝(또는 주어)만 바뀜 · K17·K25가 다룬 호응과 겹치지 않음 · 짜임 놓치기 보기는 여전히 어긋남', () => {
  const k79 = card('K79'); const k80 = card('K80');
  // 틀린 채 둔 문장 셋씩 (안내문은 "고쳐 쓰기 전"이라고 밝힘)
  assert.match(k79.lines[0], /고쳐 쓰기 전/);
  assert.equal(k79.lines[2], '이번 한마당의 목적은 모든 학년이 함께 어울리기 위해서 열립니다.');
  assert.equal(k79.lines[5], '모든 학생은 반드시 운동화를 신고 와도 됩니다.');
  assert.equal(k79.lines[8], '떡은 넉넉하게 준비했으니 아마 모자라지 않았습니다.');
  assert.equal(k80.lines[1], '처음에는 박물관이 별로 기대되었다.');
  assert.equal(k80.lines[3], '길게 뻗은 공룡의 등뼈는 마치 커다란 미끄럼틀이었다.');
  assert.equal(k80.lines[7], '그런데 설명에 어려운 낱말이 많아서 도무지 알 수 있었다.');
  // 고친 정답 — 짝말과 어울리는 끝
  const right = (id) => q(id).opts.find((o) => o.ok).t;
  assert.equal(right('K79-2'), '이번 한마당은 모든 학년이 함께 어울리기 위해서 열립니다.');
  assert.match(right('K79-3'), /반드시 .+ 와야 합니다\.$/);
  assert.match(right('K79-4'), /아마 모자라지 않을 것입니다\.$/);
  assert.match(right('K80-1'), /별로 기대되지 않았다\.$/);
  assert.match(right('K80-2'), /마치 커다란 미끄럼틀 같았다\.$/);
  assert.match(right('K80-3'), /도무지 알 수 없었다\.$/);
  // 정답은 틀린 문장과 앞부분이 같다(뜻은 그대로, 짜임만 고침)
  for (const [id, line] of [['K79-3', k79.lines[5]], ['K79-4', k79.lines[8]], ['K80-1', k80.lines[1]], ['K80-2', k80.lines[3]], ['K80-3', k80.lines[7]]]) {
    const head = line.split(' ').slice(0, 3).join(' ');
    assert.ok(right(id).startsWith(head), `${id} 앞부분 그대로 — ${head}`);
  }
  // 짜임 놓치기(agree) 보기는 짝말을 그대로 두고 끝만 물음이 요구한 꼴과 다르게 — 고친 문장이 아니다
  // (Codex 76차: '마치' 없이 "등뼈는 미끄럼틀이었다"는 은유로 바른 문장 — 그래서 K80-2는 "'마치'와 어울리는 말(~ 같다, ~처럼)로"를 물음에 밝힌다)
  assert.match(q('K80-2').q, /'마치'와 어울리는 말\(~ 같다, ~처럼\)로/);
  assert.ok(q('K80-2').opts.every((o) => /마치/.test(o.t)), "K80-2 보기는 모두 '마치'를 둔 채");
  // '아마'는 앞일만이 아니라 확실하지 않은 일을 짐작하는 말 (Codex 76차) — 이 안내문은 다음 주 일이라 '~ㄹ 것입니다'
  assert.ok(!/아직 일어나지 않은|앞일을 짐작하는 말/.test(JSON.stringify(q('K79-4'))));
  assert.match(q('K79-4').doneNote, /확실하지 않은 일을 짐작/);
  // 물음이 밝히는 범위 (Codex 76차) — 일기에 나온 문장 가운데 · 이 글에서 소개한 책
  assert.match(q('K80-4').q, /^일기에 나온 문장 가운데/);
  assert.match(q('K84-1').q, /^이 글에서 .+ 소개한 책은/);
  assert.ok(!/넓이/.test(JSON.stringify(card('K84').words)), "'입체' 풀이에 수학의 넓이를 섞지 않는다");
  const agree = (id) => q(id).opts.filter((o) => o.type === 'agree').map((o) => o.t);
  assert.ok(agree('K79-3').every((t) => /반드시/.test(t) && !/해야|와야/.test(t)));
  assert.ok(agree('K79-4').every((t) => /아마/.test(t) && !/것입니다/.test(t.replace('않았었습니다', ''))));
  assert.ok(agree('K80-1').every((t) => /별로/.test(t) && !/않았다|없었다/.test(t)));
  assert.ok(agree('K80-2').every((t) => /마치/.test(t) && !/같았다|처럼/.test(t)));
  assert.ok(agree('K80-3').every((t) => /도무지/.test(t) && !/없었다/.test(t)));
  // K17·K25의 호응과 겹치지 않게
  const both = text('K79') + text('K80');
  assert.ok(!/왜냐하면|결코|꿈은|다음 주에 .*갔다/.test(both), '옛 글이 다룬 짝말 없이');
});

test('🗺️ 충청 방언 (v267): 국립국어원 「충남의 언어 이야기」에 나온 말만 · 뜻은 앞뒤 상황으로 짐작(낱말 풀이에 방언 뜻을 주지 않음) · 표준어에도 있는 "말짱"은 쓰지 않음 · 방언을 낮추지 않음', () => {
  const c = card('K82');
  const t = text('K82');
  for (const w of ['대간했지유', '홍수가 떨어질깨미 원새', '노나 먹어야지유', '안 돼유']) assert.ok(t.includes(w), w);
  assert.ok(!/말짱/.test(JSON.stringify(c)), "'말짱'은 표준어에도 있는 말(속속들이 모두)이라 방언 예로 쓰지 않는다");
  // 낱말 풀이에 방언 낱말을 넣지 않는다 — 넣으면 짐작할 것이 없다
  for (const [w] of c.words) assert.ok(!/대간|홍수|원새|깨미|노나/.test(w), w);
  // 방언 뜻 물음은 근거(앞뒤 상황)를 누른다
  assert.deepEqual(['K82-1', 'K82-2', 'K82-3', 'K82-4'].map((id) => q(id).ev), [[2, 3], [4, 5, 6, 7], [5, 7], [8, 9]]); // K82-2 ⑥ 감을 땄다도 (Codex 76차)
  // 소리가 같은 표준어(홍수 = 큰물)·소리가 비슷한 말(대단하다·놀아)은 글자만 보기
  assert.match(q('K82-2').opts.find((o) => o.type === 'literal').t, /비가 많이 와서 넘친 물/);
  assert.match(q('K82-1').opts.find((o) => o.type === 'literal').t, /대단했지요/);
  assert.match(q('K82-4').opts.find((o) => o.type === 'literal').t, /놀다가/);
  // 끝 문장 — 고장마다 말이 다르고 자리에 맞는 말이 있다(방언이 틀린 말이 아니다)
  assert.match(c.lines[11], /고장마다 말이 다르고, 말하는 자리에 따라 알맞은 말이 있다/);
  assert.ok(!/사투리는 틀린|바르지 않은 말|고쳐야 할 말/.test(JSON.stringify(c)));
});

test('👕 「만년 셔츠」 독서 대화 (v267): 줄거리는 K19 그대로 — 따옴표 말·두 벌 남았다는 거짓말·큰불과 나눠 준 옷·체조 시간', () => {
  const k19 = text('K19'); const t = text('K83');
  assert.ok(k19.includes('"선생님, 만년 셔츠도 좋습니까?"') && t.includes('"선생님, 만년 셔츠도 좋습니까?"'), '따옴표 안은 K19와 같게');
  assert.ok(/두 벌 남았으니/.test(k19) && /두 벌 남았다고 어머니를 속이고/.test(t));
  assert.ok(/큰불이 나서/.test(k19) && /큰불이 났을 때/.test(t));
  assert.ok(/체조 선생님/.test(k19) && /체조 시간/.test(t));
  assert.match(card('K83').meta[0], /K19/);
});

test('📚 여러 가지 모습의 책 (v267): K16(종이·전자·오디오 — 같은 책 세 모습)과 겹치지 않게 팝업북·점자책 · 책의 모습마다 좋은 점 하나씩', () => {
  const t = text('K84');
  for (const w of ['팝업북', '전자책', '오디오북', '점자책']) assert.ok(t.includes(w), w);
  assert.ok(!/팝업북|점자책/.test(text('K16')), 'K16에는 없는 모습');
  assert.match(t, /이야기와 지식을 전해 준다는 점은 같다/);
});
