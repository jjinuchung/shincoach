// 📚 포켓몬으로 읽는 국어 글 여섯 v282 (2026-10-17, 아버님 "이대로 해"): K97~K102
//  · 좋아하는 것으로 5학년 단원 연습 — 5-1-4 K97(이브이 진화형 분류) · 5-1-3 K98(개굴닌자 소개 발표 준비 ✍️) · 5-1-5 K99(쉬는 시간 카드 토의)
//    · 5-2 매체 K100(카드 봉지 광고) · 5-2-2 K101(피카츄 소개 글 고쳐 쓰기) · 5-2 독서 K102(개굴닌자에서 시작한 개구리 책)
//  · 포켓몬 사실은 PokeAPI(2026-10-17)로 확인한 것만 — 아래 POKE 표 · 개구리는 위키백과 「개구리목」·국립특수교육원 「개구리의 한살이」
//  · 🧠 아는 것으로 답하기(know): 사실로는 맞지만 그 글에 없는 보기 — 글을 근거로 묻는 물음에만, 한 편에 하나, 아는 것을 먼저 인정하는 풀이
import { fakeIdb } from './fakeidb.js'; // ★ db.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkContent, checkCard, validCards, lineCount, rowsLayout, TYPES, KNOW_ASK, KNOW_MAX, korFinishRule, missOf } from '../js/korean.js';
import { emptyProfile, cloneProfile } from '../js/db.js';
import { korReportText } from '../js/korreport.js';

void fakeIdb;
const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const DATA = JSON.parse(read('coach/korean/reading.json'));
const UNITS = JSON.parse(read('coach/korean/units.json')).units;
const IDS = DATA.cards.map((c) => c.id);
const card = (id) => DATA.cards.find((c) => c.id === id);
const NEW = ['K97', 'K98', 'K99', 'K100', 'K101', 'K102'];
const QS = NEW.flatMap((id) => card(id).qs);
const q = (id) => QS.find((x) => x.id === id);
const CIRC = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
const nums = (s) => [...new Set([...String(s || '')].map((ch) => CIRC.indexOf(ch) + 1).filter((n) => n > 0))];
const bare = (s) => String(s).replace(/[\s.,!?'"·…—–\-()「」]/g, '');
const line = (id, n) => card(id).lines[n - 1];
const text = (id) => card(id).lines.join(' ');
const clone = (x) => JSON.parse(JSON.stringify(x));
const pf = (o = {}) => cloneProfile({ ...emptyProfile(), ...o });

// 성취기준 공식 문구 (2022 개정 5~6학년) — 그 글의 단원
const STD = {
  '6국02-01': ['글의 구조를 고려하며 주제나 주장을 파악하고 글 내용을 요약한다.', '5-1-4'],
  '6국01-05': ['자료를 선별하여 핵심 정보를 중심으로 내용을 구성하고 매체를 활용하여 발표한다.', '5-1-3'],
  '6국01-06': ['토의에 협력적으로 참여하며 서로의 의견을 비교하고 조정한다.', '5-1-5'],
  '6국06-02': ['뉴스 및 각종 정보 매체 자료의 신뢰성을 평가한다.', '5-2-매체'],
  '6국04-04': ['문장 성분을 이해하고 호응 관계가 올바른 문장을 구성한다.', '5-2-2'],
  '6국02-05': ['긍정적인 읽기 동기를 형성하고 적극적으로 읽기에 참여하는 태도를 기른다.', '5-2-독서'],
};

// 🐾 PokeAPI에서 확인한 사실 (pokemon · pokemon-species · evolution-chain · item, 2026-10-17) — 글에 쓴 것만
//  gen 처음 나온 세대 · h 키(미터) · w 몸무게(킬로그램) · types 지금 타입(지난 세대 타입 바뀜 없음)
const POKE = {
  이브이: { gen: 1, types: ['노말'] },
  샤미드: { gen: 1, h: 1.0, types: ['물'] },
  쥬피썬더: { gen: 1, h: 0.8, types: ['전기'] },
  부스터: { gen: 1, h: 0.9, types: ['불꽃'] },
  에브이: { gen: 2, h: 0.9, types: ['에스퍼'] },
  블래키: { gen: 2, h: 1.0, types: ['악'] },
  리피아: { gen: 4, h: 1.0, types: ['풀'] },
  글레이시아: { gen: 4, h: 0.8, types: ['얼음'] },
  님피아: { gen: 6, h: 1.0, types: ['페어리'] },
  개굴닌자: { gen: 6, h: 1.5, w: 40.0, types: ['물', '악'], from: '개굴반장' },
  개굴반장: { from: '개구마르' },
  피카츄: { gen: 1, h: 0.4, w: 6.0, types: ['전기'], from: '피츄', to: '라이츄', item: '천둥의돌' },
  뮤츠: { legendary: true },
};
const EEVEELUTIONS = ['샤미드', '쥬피썬더', '부스터', '에브이', '블래키', '리피아', '글레이시아', '님피아'];
/** 줄에 나온 이브이 진화형 이름 (글에 나온 차례) */
const namesIn = (s) => EEVEELUTIONS.filter((n) => s.includes(n));

test('📚 포켓몬 글 여섯 (v282): 연습 카드 · 물음 스물넷 · 원고 검사 통과 · 다섯 편이던 단원에 한 편씩(5-1-4 분류는 여덟이어도) · 성취기준 공식 문구 · ✍️ 하나 · 메모·토의·광고는 줄마다', () => {
  assert.deepEqual(checkContent(DATA), []);
  assert.deepEqual(IDS.slice(96, 102), NEW);
  assert.equal(validCards(DATA).length, 130); // v291 호상놀이 글 넷 · v298 4학년 2학기 글 열둘 · v320 4학년 2학기 글 둘째 묶음 열둘 더함
  assert.deepEqual(NEW.map((id) => [card(id).kind, card(id).genre]), [
    ['practice', '설명하는 글'], ['practice', '발표 준비 메모'], ['practice', '토의'], ['practice', '광고'], ['practice', '소개하는 글'], ['practice', '독서 일기'],
  ]);
  assert.equal(QS.length, 24);
  assert.deepEqual(NEW.map((id) => lineCount(card(id))), [13, 12, 10, 9, 9, 10], '지금 글과 비슷한 길이(20줄 안)');
  for (const id of NEW) assert.ok(!Object.hasOwn(card(id), 'source') && !Object.hasOwn(card(id), 'pre') && !Object.hasOwn(card(id), 'listen'), `${id} 바탕 글·미리보기·듣기 없음`);
  // 📘 단원 지도 — 한 단원에 하나씩
  const unitOf = (id) => UNITS.filter((u) => u.cards.includes(id)).map((u) => u.id);
  assert.deepEqual(NEW.map(unitOf), [['5-1-4'], ['5-1-3'], ['5-1-5'], ['5-2-매체'], ['5-2-2'], ['5-2-독서']]);
  for (const u of ['5-1-3', '5-1-5', '5-2-매체', '5-2-2', '5-2-독서']) assert.equal(UNITS.find((x) => x.id === u).cards.length, 6, `${u} 다섯 편 → 여섯 편`);
  assert.equal(UNITS.find((x) => x.id === '5-1-4').cards.length, 11); // v291 K104·K105 더함
  // 성취기준 — 공식 문구 그대로 · 그 글의 단원
  for (const id of NEW) {
    const found = card(id).meta.flatMap((m) => [...m.matchAll(/\[(6국0\d-0\d)\]\s*([^·[]*)/g)].map((x) => [x[1], x[2].trim()]));
    assert.equal(found.length, 1, `${id} 성취기준 하나`);
    const [k, said] = found[0];
    assert.ok(Object.hasOwn(STD, k), `${id} ${k}`);
    assert.equal(said, STD[k][0], `${id} ${k} 문구`);
    assert.equal(unitOf(id)[0], STD[k][1], `${id} 단원`);
  }
  // ✍️ 하나 — 소개할 포켓몬과 자료 · 맞춤법은 채점하지 않음 · 사실이 조금 틀려도 자료를 고른 까닭으로 채점
  assert.deepEqual(NEW.filter((id) => card(id).write), ['K98']);
  const w = card('K98').write;
  assert.equal(w.v, 1);
  assert.ok(w.rubric.must.length >= 2 && w.rubric.miss.some((m) => /맞춤법/.test(m)) && w.rubric.ok.some((m) => /사실이 조금 틀려도/.test(m)));
  for (const fr of w.frames) assert.ok(fr.endsWith('~'), fr);
  // 메모(이름 — 내용)·토의(이름: 말)·광고(문구마다)는 줄마다 · 설명·소개·일기는 문단
  assert.deepEqual(NEW.filter((id) => rowsLayout(card(id))), ['K98', 'K99', 'K100']);
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(read('sw.js')) || [])[1]) >= 282, 'sw는 v282 이상(원고가 앱 셸)');
});

test('📚 물음 (v282): 물음마다 지어내기 보기 · 정답만 유난히 길지 않게 · 근거 풀이가 짚는 줄은 근거로도 받음 · 호응 고쳐 쓰기 셋은 풀이와 둘째 힌트 · 낱말 풀이를 정답에 옮기지 않음', () => {
  for (const x of QS) {
    assert.ok(x.opts.some((o) => o.type === 'make'), `${x.id} 지어내기 보기`);
    const len = x.opts.map((o) => [...o.t].length);
    const k = x.opts.findIndex((o) => o.ok);
    assert.ok(len[k] <= Math.max(...len.filter((_, i) => i !== k)) * 1.3, `${x.id} 정답 보기 길이`);
    if (x.ev) assert.deepEqual(nums(x.evNote).filter((n) => !x.ev.includes(n)), [], `${x.id} 근거 풀이가 쓰는 줄은 근거로도 받는다`);
    else assert.ok(x.hint2 && x.doneNote, `${x.id} 둘째 힌트·풀이`);
  }
  assert.deepEqual(QS.filter((x) => !x.ev).map((x) => x.id), ['K101-1', 'K101-2', 'K101-3']);
  for (const c of NEW.map(card)) for (const x of c.qs) {
    const ok = bare(x.opts.find((o) => o.ok).t);
    for (const [, m] of c.words) for (const part of m.split(' — ')) if (bare(part).length >= 6) assert.ok(!ok.includes(bare(part)), `${x.id} 낱말 풀이 그대로 — ${part}`);
  }
  const used = new Set(QS.flatMap((x) => x.opts.filter((o) => !o.ok).map((o) => o.type)));
  assert.deepEqual([...used].sort(), ['agree', 'detail', 'flip', 'fo', 'know', 'link', 'make', 'time']);
  // 호응 고쳐 쓰기(K101-1~3) — 틀린 보기는 짜임 놓치기가 중심, 뜻을 바꾼 보기는 지어내기·거꾸로
  for (const id of ['K101-1', 'K101-2', 'K101-3']) assert.ok(q(id).opts.some((o) => o.type === 'agree'), id);
  assert.equal(q('K101-1').opts.find((o) => o.ok).t, '내가 피카츄를 좋아하는 까닭은 작고 귀엽기 때문이다.');
  assert.equal(q('K101-2').opts.find((o) => o.ok).t, "'어제'와 '살 것이다'");
  assert.equal(q('K101-3').opts.find((o) => o.ok).t, '나는 앞으로도 언제나 피카츄를 좋아할 것이다.');
  // 고쳐 쓸 문장은 정말 틀린 꼴로 들어 있다
  assert.equal(line('K101', 4), '내가 피카츄를 좋아하는 까닭은 작고 귀엽다.');
  assert.match(line('K101', 6), /^나는 어제 .* 살 것이다\.$/);
  assert.match(line('K101', 8), /결코 피카츄를 좋아할 것이다\.$/);
  assert.match(line('K101', 7), /지금/, '⑦ 인형이 지금 있다 — 어제 샀다는 풀이의 근거');
  // 🔍 Codex 89차: 물음이 오답을 배제할 조건을 스스로 말한다
  assert.match(q('K99-2').q, /까닭을 모두 담은/, "K99-2 '다툴 수 있어서'도 든 까닭이라 — 모두 담은 것을 물음");
  assert.equal(q('K99-2').opts.find((o) => o.type === 'detail').t, '카드를 바꾸다가 다툴 수 있어서');
  assert.match(q('K101-1').q, /^④의 뜻은 그대로 두고/, "K101-1 '라이츄보다 작기 때문이다'도 호응은 바름 — 뜻을 지키라는 조건을 물음에");
  assert.match(q('K101-3').q, /서아의 마음에 맞게/);
  assert.match(q('K97-3').q, /^이 글에서 /, 'K97-3 글에 나온 기준으로만');
  assert.ok(!card('K97').words.find((w) => w[0] === '세대')[1].includes('한꺼번에'), '세대 풀이는 단순하게만');
});

test('🧠 아는 것으로 답하기 (v282): 잘못 읽기 아홉째 · 편마다 하나 · 글을 근거로 묻는 물음에만 · "맞는 말이에요."로 먼저 인정 · 그 사실은 그 글에 없다 · 옛 글에는 없음', () => {
  assert.deepEqual(Object.keys(TYPES), ['make', 'know', 'flip', 'time', 'link', 'literal', 'detail', 'fo', 'agree'], '지어내기 바로 뒤');
  assert.equal(TYPES.know.name, '아는 것으로 답하기');
  assert.match(TYPES.know.hint, /^알고 있는 게 맞아요! 그런데 이 글에 그 말이 있나요\?/);
  assert.ok(!/글에|글을|글의/.test(TYPES.know.hintL) && /들은/.test(TYPES.know.hintL), '🎧 듣기 말투');
  assert.equal(KNOW_MAX, 1);
  const know = QS.flatMap((x) => x.opts.filter((o) => o.type === 'know').map((o) => ({ qid: x.id, q: x.q, ...o })));
  assert.deepEqual(know.map((k) => k.qid), ['K97-4', 'K98-4', 'K99-4', 'K100-4', 'K101-4', 'K102-4'], '편마다 하나 — 마지막 물음');
  for (const k of know) {
    assert.match(k.q, KNOW_ASK, `${k.qid} 글을 근거로 묻는 물음`);
    assert.ok(k.why.startsWith('맞는 말이에요. 하지만 '), `${k.qid} 먼저 인정`);
  }
  // 그 사실(열쇠 말)은 그 글 어디에도 없다 — 글에 있으면 "글에 없는 보기"가 아니게 된다
  const KEY = { 'K97-4': '노말', 'K98-4': '6세대', 'K99-4': '대결', 'K100-4': '뮤츠', 'K101-4': '1세대', 'K102-4': '개굴반장' };
  for (const k of know) {
    const id = k.qid.replace(/-\d$/, '');
    assert.ok(k.t.includes(KEY[k.qid]), k.qid);
    assert.ok(!text(id).includes(KEY[k.qid]), `${k.qid} "${KEY[k.qid]}"는 글에 없다`);
  }
  // 사실로는 맞다 (PokeAPI)
  assert.deepEqual(POKE.이브이.types, ['노말']);
  assert.equal(POKE.개굴닌자.gen, 6);
  assert.equal(POKE.뮤츠.legendary, true);
  assert.equal(POKE.피카츄.gen, 1);
  assert.equal(POKE.개굴닌자.from, '개굴반장');
  // 옛 글(K1~K96)에는 없다 — 다른 물음에서 맞는 사실을 틀렸다고 하지 않게
  for (const c of DATA.cards.slice(0, 96)) for (const x of c.qs) assert.ok(!x.opts.some((o) => o.type === 'know'), x.id);
});

test('🔍 원고 검사가 잡는 것 (v282 🧠): 글을 근거로 묻지 않는 물음의 🧠 보기 · 한 편에 둘 · 모르는 종류 — 하나씩만 틀리게', () => {
  const one = (fix) => { const c = clone(card('K97')); fix(c); return checkCard(c); };
  assert.deepEqual(one(() => {}), []);
  assert.ok(one((c) => { c.qs[0].opts[3].type = 'know'; }).some((m) => /K97-1 '아는 것으로 답하기' 보기는/.test(m)), '분류의 뜻을 묻는 물음엔 안 됨');
  const two = one((c) => { c.qs[3].opts[1].type = 'know'; });
  assert.ok(two.some((m) => /한 편에 1개까지\(지금 2\)/.test(m)), two.join(' / '));
  assert.ok(!two.some((m) => /K97-4 '아는 것으로 답하기' 보기는/.test(m)), '같은 물음 둘은 "물음" 규칙에 걸리지 않음');
  assert.ok(one((c) => { c.qs[3].q = '이 글의 중심 생각은 무엇인가요?'; }).some((m) => /K97-4 '아는 것으로 답하기' 보기는/.test(m)));
  assert.ok(one((c) => { c.qs[3].opts[0].type = 'knows'; }).some((m) => /type\(잘못 읽기\)이 없거나 모르는 것/.test(m)));
  for (const s of ['이 글에서 알 수 있는 것은?', '광고에 쓰여 있는 것은?', '메모에 나와 있는 것은?', '글에 따르면 무엇인가요?']) assert.match(s, KNOW_ASK);
  for (const s of ['④를 바르게 고친 문장은?', '까닭은 무엇인가요?', '어떤 마음이 들게 하려는 말인가요?']) assert.doesNotMatch(s, KNOW_ASK);
});

test('📤 🧠 셈 (v282): 다 읽을 때 korMiss.know를 더함 · 고쳐 읽기가 남김 · 국어 요약에 "아는 것으로 답하기" 줄', () => {
  const T0 = new Date(2026, 9, 17, 12, 0, 0).getTime();
  const p = pf();
  const r = korFinishRule(p, 'K97', T0, { know: 1, make: 2 }, IDS);
  assert.equal(r.ok, true);
  assert.deepEqual(p.korMiss, { make: 2, know: 1 });
  assert.deepEqual(missOf({ know: 3, zzz: 1 }), { know: 3 });
  const t = korReportText(pf({ korMiss: { make: 2, know: 1, flip: 1 } }), DATA, '2026-10-17', []);
  assert.ok(t.includes('- 지어내기 2 · 아는 것으로 답하기 1 · 거꾸로 읽기 1\n'), 'TYPES 차례로');
});

test('🐾 포켓몬 사실 (v282): 글에 쓴 세대·키·타입·진화·몸무게가 PokeAPI 표와 같다 — 포켓몬을 잘 아는 아이가 짚을 틀린 사실이 없게', () => {
  // K97 이브이 — 진화형 여덟 · 세대로 나눈 묶음 · 키로 나눈 묶음 · 타입이 모두 달라 한 묶음에 하나씩
  assert.deepEqual(namesIn(line('K97', 2)), EEVEELUTIONS);
  assert.match(line('K97', 2), /모두 여덟이다/);
  const byGen = (g) => EEVEELUTIONS.filter((n) => POKE[n].gen === g);
  assert.deepEqual(namesIn(line('K97', 5)), byGen(1));
  assert.match(line('K97', 5), /^1세대/);
  assert.deepEqual(namesIn(line('K97', 6)), byGen(2));
  assert.match(line('K97', 6), /^2세대/);
  assert.equal(line('K97', 7), `4세대에는 ${byGen(4).join('와 ')}가, 6세대에는 ${byGen(6)[0]}가 처음 나왔다.`);
  assert.deepEqual(namesIn(line('K97', 9)), EEVEELUTIONS.filter((n) => POKE[n].h === 1.0));
  assert.match(line('K97', 9), /키가 1미터인 것은/);
  assert.deepEqual(namesIn(line('K97', 10)), EEVEELUTIONS.filter((n) => POKE[n].h < 1.0));
  assert.match(line('K97', 10), /키가 1미터보다 작은 것은/);
  assert.equal(new Set(EEVEELUTIONS.map((n) => POKE[n].types.join())).size, 8, '⑫ 여덟 마리의 타입이 모두 다르다');
  // K97 물음 답도 표와 같다
  assert.equal(q('K97-2').opts.find((o) => o.ok).t, byGen(POKE.글레이시아.gen).find((n) => n !== '글레이시아'));
  assert.ok(POKE.샤미드.h === POKE.블래키.h && POKE.샤미드.gen !== POKE.블래키.gen, 'K97-3 키로는 같은 묶음 · 세대로는 다른 묶음');
  // K98 개굴닌자 — 진화 차례 · 두 타입 · 키 1.5미터 · 몸무게 40킬로그램
  assert.match(line('K98', 4), new RegExp(`${POKE.개굴반장.from}에서 ${POKE.개굴닌자.from}을 거쳐 진화`));
  assert.match(line('K98', 5), new RegExp(`${POKE.개굴닌자.types[0]} 타입과 ${POKE.개굴닌자.types[1]} 타입을 함께`));
  assert.match(line('K98', 6), new RegExp(`키는 ${POKE.개굴닌자.h}미터, 몸무게는 ${POKE.개굴닌자.w}킬로그램`));
  assert.match(line('K98', 7), /개구마르, 개굴반장, 개굴닌자 그림을 진화하는 차례대로/);
  // K101 피카츄 — 피츄 → 피카츄 → (천둥의돌) 라이츄 · 전기 · 0.4미터 · 6킬로그램
  assert.equal(line('K101', 2), `피카츄는 ${POKE.피카츄.from}가 진화한 포켓몬이고, ${POKE.피카츄.item}을 쓰면 ${POKE.피카츄.to}로 진화한다.`);
  assert.equal(line('K101', 3), `피카츄의 타입은 ${POKE.피카츄.types[0]}이다.`);
  assert.equal(line('K101', 5), `피카츄의 키는 ${POKE.피카츄.h}미터이고, 몸무게는 ${POKE.피카츄.w}킬로그램이다.`);
  // ✍️ 예시 답도 같은 사실
  assert.match(card('K98').write.model, /피카츄는 피츄가 진화한 모습이고, 천둥의돌을 쓰면 라이츄로 진화한다/);
  // K102 개굴닌자는 물 타입 · 개구리는 뒷다리 먼저 · 허파와 축축한 피부로 숨
  assert.ok(POKE.개굴닌자.types.includes('물') && /개굴닌자가 물 타입인 것도/.test(line('K102', 8)));
  assert.match(line('K102', 6), /뒷다리가 먼저 나오고, 앞다리는 나중에/);
  assert.match(line('K102', 7), /허파로 숨을 쉬고, 축축한 피부로도 숨을 쉰다/);
  // 세대마다 달라진 것(진화 방법 · 진화에 쓰는 돌 가운데 리프의돌·얼음의돌)은 쓰지 않는다
  for (const id of NEW) assert.ok(!/리프의돌|얼음의돌|이끼|친밀도|레벨/.test(JSON.stringify(card(id))), id);
});

test('🃏 광고·토의 (v282): 광고의 작은 글씨가 답을 받친다 · 광고하는 쪽의 말은 사실이 아님 · 토의는 즐거움은 살리고 문제는 줄여 정함 · 이야기에 집 식구를 지어내지 않음', () => {
  assert.match(line('K100', 8), /^\(작은 글씨\) 전설의 포켓몬 카드는 100봉지 가운데 1봉지쯤/);
  assert.match(line('K100', 9), /^\(작은 글씨\) 봉지를 뜯은 뒤에는 바꾸어 드리지 않습니다/);
  assert.deepEqual(q('K100-1').ev, [2, 8]);
  assert.deepEqual(q('K100-4').ev, [9]);
  assert.equal(q('K100-4').opts.find((o) => o.type === 'fo').why, '⑦은 확인된 사실이 아니라 광고하는 쪽이 하는 말이에요.');
  assert.match(line('K99', 10), /보여 주기만 하고 바꾸지 않기, 쉬는 시간이 끝나면 가방에 넣기/);
  assert.deepEqual(q('K99-4').ev, [6, 7, 8, 9, 10]);
  // 지어낸 문구점 이름 · 진짜 상품 이름 없음
  assert.match(line('K100', 1), /^\[반짝 문구점\]/);
  for (const id of NEW) assert.ok(!/동생|형이|누나|언니|오빠|엄마|아빠|어머니|아버지/.test(text(id)), `${id} 집 식구를 지어내지 않음`);
});
