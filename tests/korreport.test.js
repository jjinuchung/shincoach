// 📚 v254 (2026-10-14, 아버님 "국어 과목에서 학습 자료를 더 만들자" → 기본안 → "1단계부터 진행하고 8번을 넣자")
//  · 새 글 12편 K42~K53 — 글이 두 편뿐이던 단원 일곱 + 5-2 추론 + ✨ 명작 넷(김소월 「산유화」·윤동주 「눈」·정철 「훈민가」 넷째 수·「흥부와 놀부」)
//  · 📤 국어 기록 요약 korean/날짜.md (js/korreport.js) · 물음마다 틀린 보기 수 profile.korQMiss
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkContent, validCards, lineText, korFinishRule, qMissOf, mergeQMiss, QMISS_ONCE, dayNum } from '../js/korean.js';
import { emptyProfile, cloneProfile, mergeStatRecord } from '../js/db.js';
import { initProfile, flushProfile, reloadProfile, korFinish } from '../js/xp.js';
import { allWords, wordId } from '../js/korwords.js';
import { allPuzzles } from '../js/korpuzzle.js';
import { korReportText, korReportFromRaw, dayLabel, KOR_TOP } from '../js/korreport.js';
import { gatherFiles } from '../js/upload.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const DATA = JSON.parse(read('coach/korean/reading.json'));
const UNITS = JSON.parse(read('coach/korean/units.json')).units;
const IDS = DATA.cards.map((c) => c.id);
const card = (id) => DATA.cards.find((c) => c.id === id);
const qOf = (id) => DATA.cards.flatMap((c) => c.qs).find((x) => x.id === id);
const fact = (id, name) => card(id).facts.find((f) => f[0] === name)[1];
const NEW = ['K42', 'K43', 'K44', 'K45', 'K46', 'K47', 'K48', 'K49', 'K50', 'K51', 'K52', 'K53'];
const T0 = new Date(2026, 9, 14, 12, 0, 0).getTime();
const CIRC = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
const pf = (o = {}) => cloneProfile({ ...emptyProfile(), ...o });

test('📚 새 글 12편 (v254): 연습 여덟(체험·검색 결과·분류·높임·동영상·방언·독서 모임·추론) + ✨ 명작 넷 · 물음 마흔여섯 · 원고 검사 통과 · 단원 지도 · ✍️ 셋', () => {
  assert.deepEqual(checkContent(DATA), []);
  assert.deepEqual(NEW.map((id) => [card(id).kind, card(id).genre]), [
    ['practice', '생활문'], ['practice', '검색 기록'], ['practice', '설명하는 글'], ['practice', '생활문'], ['practice', '생활문'], ['practice', '생활문'],
    ['practice', '독서 모임 기록'], ['practice', '이야기'], ['classic', '시'], ['classic', '동시'], ['classic', '시조'], ['classic', '옛이야기']]);
  assert.equal(NEW.reduce((n, id) => n + card(id).qs.length, 0), 46, '연습은 넷씩 · 짧은 시 「눈」과 시조는 셋');
  assert.deepEqual(NEW.filter((id) => card(id).write), ['K44', 'K48', 'K53']);
  assert.equal(validCards(DATA).length, 84, 'v258 시 일곱 · v261 새 글 열둘 · v265 신문 글 여섯 · v267 단원 채우기 여섯 더함');
  // 📘 단원 지도 — 새 글은 모두 단원에 · 두 편뿐이던 단원 일곱은 이제 세 편 이상
  for (const id of NEW) assert.ok(UNITS.some((u) => (u.cards || []).includes(id)), `${id} 단원`);
  for (const u of ['5-1-독서', '5-1-2', '5-1-매체', '5-1-4', '5-2-2', '5-2-매체', '5-2-4']) assert.ok(UNITS.find((x) => x.id === u).cards.length >= 3, `${u} 세 편 이상`);
  const of = (u) => UNITS.find((x) => x.id === u).cards;
  assert.deepEqual([of('5-2-3'), of('5-2-6').filter((id) => NEW.includes(id)), of('5-1-6').filter((id) => NEW.includes(id))], [['K1', 'K2', 'K4', 'K49', 'K77'], ['K50', 'K52'], ['K51']]); // v258 시는 그 뒤에 · v265 K77 정조 능행차(추론)
  // 아이 이름 없이 (공개 저장소)
  assert.ok(!NEW.some((id) => JSON.stringify(card(id)).includes(String.fromCharCode(0xC9C4, 0xC6B0))));
});

test('✨ 명작 원문 대조 (v254): 「산유화」 위키문헌 『진달래꽃』 현대어 옮김 · 「눈」 1955년 판 142쪽 · 「훈민가」 넷째 수 — facts에 적은 바꿈만 · 흥부와 놀부는 다시 씀', () => {
  const apply = (t, ch) => ch.reduce((x, [a, b]) => x.split(a).join(b), t);
  // 김소월 「산유화」 — 위키문헌 현대어 칸 그대로에 띄어쓰기 하나(여름없이 → 여름 없이)
  const SANYU = [['산에는 꽃 피네', '꽃이 피네', '갈 봄 여름없이', '꽃이 피네'], ['산에', '산에', '피는 꽃은', '저만치 혼자서 피어 있네'],
    ['산에서 우는 작은 새요', '꽃이 좋아', '산에서', '사노라네'], ['산에는 꽃 지네', '꽃이 지네', '갈 봄 여름없이', '꽃이 지네']];
  const SANYU_CH = [['여름없이', '여름 없이']];
  assert.deepEqual(card('K50').stanzas, SANYU.map((st) => st.map((l) => apply(l, SANYU_CH))));
  for (const [a, b] of SANYU_CH) assert.ok(fact('K50', '원문').includes(`${a} → ${b}`));
  // 윤동주 「눈」 — 『하늘과 바람과 별과 시』 1955년 판(위키문헌 페이지 145 = 책 142쪽, 1936.12) · '소오복이'는 그대로
  const NUN = [['지난밤에', '눈이 소오복이 왔네'], ['지붕이랑', '길이랑 밭이랑', '추워 한다고', '덮어주는 이불인가바'], ['그러기에', '추운 겨을에만 나리지']];
  const NUN_CH = [['추워 한다고', '추워한다고'], ['덮어주는', '덮어 주는'], ['인가바', '인가 봐'], ['겨을', '겨울'], ['나리지', '내리지']];
  assert.deepEqual(card('K51').stanzas, NUN.map((st) => st.map((l) => apply(l, NUN_CH))));
  for (const [a, b] of NUN_CH) assert.ok(fact('K51', '원문').includes(`${a} → ${b}`), `눈: ${a} → ${b}`);
  assert.match(fact('K51', '원문'), /'소오복이'는 시인이 길게 늘여 쓴 말이라 그대로/);
  // 정철 「훈민가」 넷째 수 — 옛 글자 원문을 오늘 말로(바꾼 낱말은 facts에) · 열여섯 수 · 요즘 책 '애닯다'
  assert.deepEqual(card('K52').stanzas, [['어버이 살아신 제 섬길 일란 다하여라', '지나간 후면 애달프다 어찌하리', '평생에 고쳐 못 할 일이 이뿐인가 하노라']]);
  for (const s of ['사라신제 → 살아신 제', '셤길일란 → 섬길 일란', '디나간휘면 → 지나간 후면', '엇디 → 어찌', '고텨 → 고쳐', "'애닯다'"]) assert.ok(fact('K52', '원문').includes(s), `훈민가 원문 줄: ${s}`);
  assert.match(fact('K52', '만나는 곳'), /열여섯 수 가운데 넷째 수/);
  assert.match(fact('K52', '만나는 곳'), /초장·중장·종장/);
  // 「흥부와 놀부」 — 지은이를 알 수 없는 옛이야기를 다시 씀 · 이본이 많아 끝이 책마다 다름
  assert.equal(card('K53').author, '지은이 모름 · 신코치가 다시 씀');
  assert.match(fact('K53', '원문'), /다시 썼어요 — 따옴표 안의 말도 신코치가 다시 쓴 말/);
  assert.match(fact('K53', '만나는 곳'), /마흔 가지가 넘는 책/);
  // 저작권: 김소월 1934 · 윤동주 1945 · 정철 1593
  assert.deepEqual(['K50', 'K51', 'K52'].map((id) => Number(/(\d{4})년에 세상을 떠나/.exec(fact(id, '저작권'))[1])), [1934, 1945, 1593]);
  // 풀이가 갈리는 '저만치 혼자서'의 마음은 묻지 않는다
  assert.match(fact('K50', '알아 둘 것'), /묻지 않았어요/);
  for (const q of card('K50').qs) assert.ok(!/외로|쓸쓸/.test(q.q + q.opts.map((o) => o.t).join(' ')), q.id);
});

test('📚 원고 (v254): 물음이 묻는 말은 📖 풀이에 없음 · 방언은 글이 미리 풀어 주지 않음(우리말샘 확인 — 단디 = 단단히 · 정구지 = 부추) · 보기에 옮긴 말 = 글 · 분류 무리 · 높임', () => {
  const glossed = (id) => card(id).words.map((w) => w[0]);
  for (const [id, ws] of [['K47', ['단디', '정구지']], ['K50', ['저만치', '갈']], ['K52', ['고쳐', '지나간']], ['K53', ['배가 아파']], ['K42', ['손길']], ['K44', ['기준']]]) {
    for (const w of ws) assert.ok(!glossed(id).some((g) => g.includes(w)), `${id} ${w}`);
  }
  // K47: 답이 되는 표준어를 글이 먼저 말하지 않는다 — 앞뒤 상황(꽉꽉 잡아당김 · 가늘고 긴 초록 잎채소)으로 짐작
  const k47 = card('K47').lines.join(' ');
  assert.ok(!/단단히|부추/.test(k47), 'K47-1·2 답이 글에 없다');
  assert.ok(k47.includes('단디') && k47.includes('정구지'));
  assert.deepEqual([qOf('K47-1'), qOf('K47-2')].map((q) => q.opts.find((o) => o.ok).t), ['단단히', '부추']);
  assert.ok(!qOf('K47-2').opts.some((o) => /파|깻잎|미나리/.test(o.t)), '가늘고 긴 초록 잎채소인 다른 채소는 보기에 없다');
  // K45: 보기에 옮긴 말은 글에 그대로 · 사람이 아닌 것을 높인 말은 정답 하나뿐
  const k45 = card('K45').lines.join(' ');
  for (const o of qOf('K45-1').opts) assert.ok(k45.includes(o.t.slice(1, -1)), o.t);
  assert.match(qOf('K45-1').opts.find((o) => o.ok).t, /우유 나오셨습니다/);
  assert.equal(qOf('K45-2').opts.find((o) => o.ok).t, '모두 육천 원입니다.');
  for (const q of card('K45').qs) for (const o of q.opts) if (!o.ok) assert.ok(['agree', 'flip', 'literal', 'make', 'detail', 'time'].includes(o.type), `${q.id} ${o.t}`);
  // K45 (Codex 66차): "주문하신 커피 나오셨습니다"는 국립국어원도 사람마다 판단이 다를 수 있다고 답함(2026-02-13) —
  //   절대 틀린 말로 가르치지 않고 "엄마 말씀대로 고쳐 쓰는 게 좋은 말"로 · 풀이에 다른 생각도 · 정답·만나는 곳도 "고쳐 쓰는 게 좋다"
  assert.match(qOf('K45-1').q, /엄마 말씀대로라면/);
  assert.match(qOf('K45-1').doneNote, /높여도 된다고 보는 사람도 있지만/);
  assert.ok(!/해야 해요/.test(qOf('K45-1').doneNote), 'K45-1 풀이가 "해야 해요"로 못 박지 않는다');
  assert.equal(qOf('K45-3').opts.find((o) => o.ok).t, '손님은 높이되, 빵이나 돈 같은 물건을 높이는 말은 고쳐 쓰는 게 좋다');
  assert.ok(!card('K45').meta[0].includes('물건은 높이지 않아요') && card('K45').meta[0].includes('물건을 높이는 말은 고쳐 쓰는 게 좋아요'));
  // K52 (Codex 66차): K52-2 근거 풀이가 ②(돌아가신 뒤)를 쓰니 ②도 근거 · K52-1 "섬길 일을 다 끝낸 뒤" 풀이는 ① "다하여라"와 어긋나지 않게
  assert.deepEqual(qOf('K52-2').ev, [1, 2, 3]);
  const k521 = qOf('K52-1').opts.find((o) => o.t === '섬길 일을 다 끝낸 뒤');
  assert.match(k521.why, /섬기는 일을 끝낸 뒤가 아니라, 어버이가 살아 계신 때가 지나간 뒤/);
  assert.ok(!k521.why.includes('끝낸다는 말은 없어요'));
  // K53-1 (아버님 "K53-1 ⑧도 넣어서 만들고 배포하자"): ⑧ 놀부가 배가 아팠다 = 놀부 마음의 근거 · 근거 풀이가 짚는 줄은 모두 근거로 받는다
  assert.deepEqual(qOf('K53-1').ev, [4, 8, 9]);
  for (const id of ['K45-3', 'K45-4', 'K52-1', 'K52-2', 'K53-1']) {
    const used = [...qOf(id).evNote].map((ch) => CIRC.indexOf(ch) + 1).filter((n) => n > 0);
    for (const n of used) assert.ok(qOf(id).ev.includes(n), `${id} 근거 풀이의 ${CIRC[n - 1]}도 근거로 받는다`);
  }
  // K44: 세 무리 — 정답 묶음은 모두 현악기 문장(②~④)에 나온다 · 틀린 묶음은 다른 무리가 섞임
  const lineOf = (name) => card('K44').lines.findIndex((l) => l.includes(name)) + 1;
  assert.deepEqual(['가야금', '거문고', '해금'].map(lineOf), [3, 3, 4]);
  assert.deepEqual(['대금', '단소', '피리', '장구', '북', '꽹과리', '징'].map(lineOf), [6, 6, 7, 9, 9, 10, 10]);
  // K44-2: 무리는 글의 문단(② 현악기 ③④ · ⑤ 관악기 ⑥⑦ · ⑧ 타악기 ⑨⑩)으로 — 정답 묶음은 한 무리, 틀린 묶음은 무리가 섞인다
  const groupOf = (name) => { const n = lineOf(name); return n >= 2 && n <= 4 ? '현' : n >= 5 && n <= 7 ? '관' : n >= 8 && n <= 10 ? '타' : '?'; };
  for (const o of qOf('K44-2').opts) {
    const gs = new Set(o.t.split(' – ').map(groupOf));
    assert.ok(!gs.has('?'), `${o.t}: 글에 나오는 악기만`);
    assert.equal(gs.size === 1, !!o.ok, `${o.t}: 정답만 한 무리`);
  }
  // 근거 번호가 가리키는 문장에 근거 풀이가 든 말이 있다 (몇 개 짚어 봄)
  assert.match(lineText(card('K42'), 12), /가장 기억에 남는/);
  assert.match(lineText(card('K43'), 11), /두 곳의 자료가 같은 말/);
  assert.match(lineText(card('K46'), 7), /어디에서 들었는지 밝혀 놓지 않았다/);
  assert.match(lineText(card('K49'), 6), /커튼부터 걷고 창문을 연다/);
  assert.match(lineText(card('K51'), 6), /이불/);
  // 글에 쓴 ①번호는 그 글에 있다 · 물음·보기·풀이의 번호 모두 (checkCard가 보지만 새 글만 한 번 더)
  for (const id of NEW) {
    const n = card(id).lines ? card(id).lines.length : card(id).stanzas.flat().length;
    for (const q of card(id).qs) for (const s of [q.q, q.evNote, q.doneNote, ...q.opts.map((o) => o.why)]) for (const ch of String(s || '')) { const k = CIRC.indexOf(ch); if (k >= 0) assert.ok(k < n, `${q.id} ${ch}`); }
  }
});

test('📤 물음마다 틀린 수 (v254, profile.korQMiss): 고쳐 읽기 · 병합은 물음마다 큰 쪽(차례 상관없이) · 다 읽을 때 그 카드 물음만 · 한 번에 물음마다 셋까지 · 별이 없어도 센다', () => {
  assert.deepEqual(qMissOf({ 'K1-1': 2, 'K12-3': '4', 'K1-6': 1, 'x': 3, 'K2-1': -1, 'K3-2': 1.9, 'K4-1': 0 }), { 'K1-1': 2, 'K12-3': 4, 'K3-2': 1 }, '물음 id 꼴(1~5번)·양의 정수만');
  for (const bad of [null, 'x', [1], 7]) assert.deepEqual(qMissOf(bad), {});
  const a = { 'K1-1': 3, 'K2-2': 1 };
  const b = { 'K1-1': 1, 'K5-4': 2, junk: 9 };
  assert.deepEqual(mergeQMiss(a, b), { 'K1-1': 3, 'K2-2': 1, 'K5-4': 2 });
  assert.deepEqual(mergeQMiss(b, a), mergeQMiss(a, b), '어느 차례로 합쳐도 같다');
  const p = pf({ coins: 0 });
  const r = korFinishRule(p, 'K20', T0, { make: 1 }, IDS, 0, { qMiss: { 'K20-2': 2, 'K20-4': 9, 'K21-1': 3 } });
  assert.equal(r.star, 1);
  assert.deepEqual(p.korQMiss, { 'K20-2': 2, 'K20-4': QMISS_ONCE }, '그 카드 물음만 · 한 번에 셋까지');
  korFinishRule(p, 'K20', T0 + 3600000, {}, IDS, 0, { qMiss: { 'K20-2': 1 } });
  assert.deepEqual(p.korQMiss, { 'K20-2': 3, 'K20-4': 3 }, '같은 날 다시 읽어 별이 없어도 센다');
  korFinishRule(p, 'K20', T0, {}, IDS, 0, { qMiss: 'bad' });
  korFinishRule(p, 'K99', T0, {}, IDS, 0, { qMiss: { 'K99-1': 1 } });
  assert.deepEqual(p.korQMiss, { 'K20-2': 3, 'K20-4': 3 }, '깨진 값 · 모르는 카드는 그대로');
  // 빈 프로필 · 복사 · 병합(옛 백업이 늦게 저장된 척해도 줄지 않는다)
  assert.deepEqual(emptyProfile().korQMiss, {});
  const c = cloneProfile(p);
  c.korQMiss['K20-2'] = 99;
  assert.equal(p.korQMiss['K20-2'], 3, '복사는 새 객체');
  const old = { ...emptyProfile(), korQMiss: { 'K20-2': 1, 'K1-1': 2 }, updatedAt: 99 };
  for (const [x, y] of [[{ ...p, updatedAt: 1 }, old], [old, { ...p, updatedAt: 1 }]]) {
    assert.deepEqual(mergeStatRecord('profile', x, y).korQMiss, { 'K20-2': 3, 'K20-4': 3, 'K1-1': 2 });
  }
  assert.deepEqual(mergeStatRecord('profile', { ...p, korQMiss: 'bad' }, old).korQMiss, { 'K20-2': 1, 'K1-1': 2 }, '깨진 쪽은 버린다');
});

const stored = () => fakeIdb.get('profile', 'me');
async function seed(o) {
  await flushProfile();
  const cur = stored() || emptyProfile();
  fakeIdb.put('profile', { ...cur, ...o, id: 'me', updatedAt: (cur.updatedAt || 0) + 1 });
  await reloadProfile();
}

test('★ 📤 저장 경로 (v254): 다 읽으면 물음별 틀린 수가 저장된 프로필에 · 두 창이 같이 끝내도 둘 다 센다 · 저장이 안 되면 없던 일 · 화면은 물음마다 틀린 보기 수를 넘긴다', async () => {
  await initProfile();
  await seed({ korDone: {}, korMiss: {}, korQMiss: {} });
  await Promise.all([korFinish('K42', { time: 1 }, IDS, 0, { qMiss: { 'K42-1': 1 } }), korFinish('K42', { make: 1 }, IDS, 0, { qMiss: { 'K42-1': 1, 'K42-3': 1 } })]);
  assert.deepEqual(stored().korQMiss, { 'K42-1': 2, 'K42-3': 1 });
  const s0 = JSON.stringify(stored());
  fakeIdb.failNext('profile');
  assert.equal((await korFinish('K43', {}, IDS, 0, { qMiss: { 'K43-1': 1 } })).ok, false);
  assert.equal(JSON.stringify(stored()), s0, '저장이 안 되면 없던 일');
  const v = read('js/koreanview.js');
  const fin = v.slice(v.indexOf('async function finishCard() {'), v.indexOf('\n}\n', v.indexOf('async function finishCard() {')));
  assert.ok(fin.includes("r.card.qs.forEach((q, i) => { const n = (r.qs[i] && r.qs[i].wrong.length) || 0; if (n) qMiss[q.id] = n; });"), '물음마다 고른 틀린 보기 수(같은 보기는 한 번 — pick이 막는다)');
  assert.ok(fin.includes('{ noStone: !!(r.ls && r.ls.text), qMiss, read: readLog(r) }'));
});

const R = (n) => JSON.parse(read(`coach/korean/${n}.json`));
const CARDS = validCards(DATA);
const WORDS = allWords(R('words'), CARDS);
const PUZZLES = allPuzzles(R('puzzles'), CARDS);
const BASE = { cards: CARDS, words: WORDS, puzzles: PUZZLES };

test('📤 국어 요약 글 (korreport.korReportText, v254): 7일 국어 시간 · 별·처음 날·틀린 물음 · 완료 기록이 없는 글 · 잘못 읽기 · 자주 틀린 물음(많은 차례·카드에 있는 것만) · 낱말 · 퍼즐 · 생각 쓰기 · 아이 이름 없이', () => {
  const D = dayNum(new Date(2026, 9, 11, 12).getTime());
  const cw = WORDS.find((w) => w.deck === 'concept');
  const p = {
    korDone: { 'K1:1': D, 'K1:2': D + 1, 'K20:1': D + 3, 'K42:1': 1 },
    korMiss: { make: 3, flip: 1, zzz: 4 },
    korQMiss: { 'K20-2': 2, 'K1-3': 1, 'K99-1': 9, 'K42-1': 5 },
    korWords: { [cw.id]: { box: 5, at: 1 }, [wordId('idiom', 'x')]: { box: 1, at: 1 } },
    korPuzzle: { O1: { box: 1, at: 1 } },
    korWrites: {},
  };
  const days = [{ date: '2026-10-13', korTime: 1500, korExt: 1 }, { date: '2026-10-14', korTime: 59 }, { date: '2026-10-01', korTime: 600 },
    { date: '2026-10-12', korTime: 29 }, { date: '2026-10-10', korTime: 30 }, { date: '2026-10-09', korTime: 0, korExt: 1 }];
  const t = korReportText(p, BASE, '2026-10-14', days);
  const L = t.split('\n');
  assert.equal(L[0], '📚 국어 기록 (2026-10-14) — 읽은 글(v258부터) · 글마다 별 · 잘못 읽기 · 자주 틀린 물음(v254부터 셈) · 낱말 · 퍼즐 · 생각 쓰기');
  assert.equal(L[1], '(틀린 물음 수는 끝까지 다 읽은 글에서만 세요 · 두 기기의 기록을 합칠 때는 물음마다 큰 쪽 수만 남아서 둘을 더한 수가 아니에요)', '틀린 수를 읽는 법 (Codex 66차)');
  assert.equal(L.filter((l) => /^- \d\d-\d\d: /.test(l)).length, 7, '7일 다');
  assert.ok(t.includes('- 10-13: 25분 · ⏳ 연장권 1개\n') && t.includes('- 10-14: 1분\n') && t.includes('- 10-11: (국어 기록 없음)\n') && !t.includes('10-01'));
  // 경계 (Codex 66차): 29초 = 반올림 0분이지만 기록은 있다 → "1분 미만" · 30초 = 1분 · 0초 = 기록 없음(연장권만 있어도)
  assert.ok(t.includes('- 10-12: 1분 미만\n') && t.includes('- 10-10: 1분\n') && t.includes('- 10-09: (국어 기록 없음) · ⏳ 연장권 1개\n'));
  assert.ok(t.includes('## 글 — 84편 중 별을 받은 글 3편 (★★★ 0 · ★★ 1 · ★ 2)'));
  assert.ok(t.includes('- K1 「시든 강낭콩」 ★★ — 처음 10-11 · 틀린 물음 K1-3(1)\n'));
  assert.ok(t.includes('- K20 「처음 혼자 탄 버스」 ★ — 처음 10-14 · 틀린 물음 K20-2(2)\n'));
  assert.ok(t.includes('- K42 「도자기 마을 체험 학습」 ★ — 처음 ? · 틀린 물음 K42-1(5)\n'), '날을 모르는 별(1)은 ?');
  assert.match(t, /- 완료 기록이 없는 글 81편: K2 「황제펭귄의 겨울나기」 · /, '읽다가 그만둔 글은 기록이 없어 "안 읽은 글"이라 하지 않는다 (Codex 66차)');
  assert.ok(!t.includes('안 읽은 글'));
  assert.ok(t.includes('- 지어내기 3 · 거꾸로 읽기 1\n'), '아는 종류만, TYPES 차례로');
  const top = L.filter((l) => /^- K\d+-\d /.test(l));
  assert.deepEqual(top.map((l) => l.split(' ')[1]), ['K42-1', 'K20-2', 'K1-3'], '많은 차례 · 카드에 없는 물음(K99-1)은 뺌');
  assert.ok(top[1].includes('「처음 혼자 탄 버스」 마음의 변화 — 2번 · 물음: 버스를 타고 가는 동안'));
  assert.ok(t.includes(`- 📘 국어 공부 말: 배우는 중 0 · ⭐ 1 · 열린 51 / 전체 51\n`));
  assert.ok(t.includes('- 🗣️ 관용 표현: 배우는 중 0 · ⭐ 0 · 열린 55 / 전체 55\n'), '없는 낱말 id는 세지 않는다');
  assert.match(t, /- 🧩 차례 맞추기: ⭐ 1 · 풀어 봤지만 아직 ⭐ 아님 0 · 열린 \d+ \/ 전체 \d+\n/);
  // ⭐ 아닌 기록만 따로 (Codex 66차 — "풀어 봄"이라 하면 ⭐까지 든 수로 읽힌다)
  const pz = PUZZLES.filter((x) => x.kind === 'order').slice(0, 2).map((x) => x.id);
  const t2 = korReportText({ ...p, korDone: Object.fromEntries(CARDS.map((c) => [`${c.id}:1`, D])), korPuzzle: { [pz[0]]: { box: 5, at: 1 }, [pz[1]]: { box: 0, at: 1 } } }, BASE, '2026-10-14', []);
  assert.match(t2, /- 🧩 차례 맞추기: ⭐ 1 · 풀어 봤지만 아직 ⭐ 아님 1 · /);
  assert.ok(t.includes('## ✍️ 생각 쓰기\n(아직 쓴 글 없음)'));
  assert.ok(!t.includes(String.fromCharCode(0xC9C4, 0xC6B0)), '아이 이름 없이');
  // 자주 틀린 물음은 KOR_TOP까지
  const many = Object.fromEntries(CARDS.slice(0, 20).map((c, i) => [c.qs[0].id, i + 1]));
  assert.equal(korReportText({ korQMiss: many }, BASE, '2026-10-14', []).split('\n').filter((l) => /^- K\d+-\d /.test(l)).length, KOR_TOP);
  // 빈 프로필·깨진 값도 글이 나온다
  const e = korReportText(null, BASE, '2026-10-14', null);
  assert.ok(e.includes('(아직 완료 기록 없음)') &&e.includes('## 잘못 읽기 (모두 합친 수)\n(없음)') && e.includes('## 자주 틀린 물음') && e.endsWith('\n'));
  assert.deepEqual([dayLabel(0), dayLabel(1), dayLabel('x'), dayLabel(D)], ['?', '?', '?', '10-11']);
});

test('📤 국어 요약 생각 쓰기 줄 — 쓴 글 · 답장 받은 글 · 기다리는 글 · ✅까지 간 카드', () => {
  const w = { K1: { last: 30, list: [{ at: 10, text: '처음 쓴 글이에요 열 글자', grade: 'near', reply: '좋아' }, { at: 30, text: '다시 쓴 글이에요 열 글자', grade: 'ok', reply: '훌륭해' }], paid: { first: 1, coins: 20, stone: 1 } },
    K7: { last: 5, list: [{ at: 5, text: '기다리는 글이에요 열 글자' }], paid: { first: 1, coins: 0, stone: 0 } } };
  const t = korReportText({ korWrites: w }, BASE, '2026-10-14', []);
  assert.match(t, /- 쓴 글 3개 \(카드 2장\) · 답장 받은 글 2개 · 답장 기다리는 글 1개 · ✅까지 간 카드 1장/);
});

test('📤 보내기 (v254): korean/날짜.md를 모은 글 그대로 · 원고를 못 받으면(null) 국어 요약만 빼고 · 프로필을 못 읽으면 통째로 실패 · 다시 만드는 것은 답장 기다리는 글 두 파일만 · sw', async () => {
  const base = { getMath: async () => null, listDaily: async () => [{ date: '2026-10-14', korTime: 120 }], mathReportText: () => '', asksText: () => '', collectTodo: () => [], today: '2026-10-14' };
  let seen = null;
  const files = await gatherFiles({ ...base, getKorReport: async (today, days) => { seen = [today, days.length]; return '📚 국어 기록\n'; } });
  assert.deepEqual(seen, ['2026-10-14', 1], '오늘과 하루 기록을 넘긴다');
  assert.deepEqual(files.find((f) => f.path === 'korean/2026-10-14.md'), { path: 'korean/2026-10-14.md', text: '📚 국어 기록\n' });
  assert.ok(!(await gatherFiles({ ...base, getKorReport: async () => null })).some((f) => f.path.startsWith('korean/2026')), '원고를 못 받으면 국어 요약만 뺀다');
  assert.ok(!(await gatherFiles(base)).some((f) => f.path.startsWith('korean/2026')));
  await assert.rejects(gatherFiles({ ...base, getKorReport: async () => { throw new Error('IDB'); } }), '프로필을 못 읽으면 실패(빈 기록으로 덮지 않게)');
  const u = read('js/upload.js');
  const fn = u.slice(u.indexOf('async function korReportNow(today, days) {'), u.indexOf('\n}\n', u.indexOf('async function korReportNow(today, days) {')));
  assert.ok(fn.includes('const p = await getProfile();') && fn.includes('} catch { return null; }') && fn.includes("['reading', 'words', 'puzzles'].map((n) => fetch(`./coach/korean/${n}.json`).then((r) => { if (!r.ok) throw new Error(n); return r.json(); }))"));
  assert.ok(fn.includes('return kr.korReportFromRaw(p, raw, today, days);'), '받은 원고는 꼴을 보고 나서 (Codex 66차)');
  assert.ok(!fn.includes('korReportText'), '꼴 검사를 건너뛰는 길이 없다');
  assert.ok(u.includes("const KOR_LIVE = new Set(['korean/todo.md', 'korean/todo.json']);") && u.includes('const text = KOR_LIVE.has(f.path) ? () => koreanTextNow(f.path, today) : f.text;'));
  assert.ok(u.includes('getKorReport: korReportNow, today }); } catch {'), '앱이 국어 요약을 모은다');
  const sw = read('sw.js');
  assert.ok(sw.includes("'./js/korreport.js',"));
  assert.ok(+(/const CACHE_VERSION = 'v(\d+)';/.exec(sw) || [])[1] >= 254, 'sw v254 이상');
  assert.ok(!read('js/korreport.js').includes(String.fromCharCode(0xC9C4, 0xC6B0)), '공개 코드에 아이 이름 없이');
});

test('📤 받은 원고의 꼴 (korReportFromRaw, Codex 66차): 꼴이 맞으면 korReportText와 같은 글 · JSON은 맞아도 cards·words·puzzles가 없거나 비었거나 쓸 카드가 없으면 null(0편 요약으로 좋은 요약을 덮지 않게)', () => {
  const raw = [DATA, R('words'), R('puzzles')];
  const p = { korDone: { 'K1:1': dayNum(T0) }, korQMiss: { 'K1-3': 2 } };
  assert.equal(korReportFromRaw(p, raw, '2026-10-14', []), korReportText(p, BASE, '2026-10-14', []));
  assert.match(korReportFromRaw(null, raw, '2026-10-14', null), /^📚 국어 기록 \(2026-10-14\)/, '빈 프로필도 글');
  const bads = [
    ['원고 없음', null],
    ['두 파일만', raw.slice(0, 2)],
    ['cards 없음', [{ version: 1 }, raw[1], raw[2]]],
    ['cards가 배열 아님', [{ cards: 'x' }, raw[1], raw[2]]],
    ['cards 빔', [{ cards: [] }, raw[1], raw[2]]],
    ['쓸 카드 없음', [{ cards: [{ id: 'K1' }, { junk: 1 }] }, raw[1], raw[2]]],
    ['reading이 배열', [DATA.cards, raw[1], raw[2]]],
    ['words 없음', [raw[0], {}, raw[2]]],
    ['words 빔', [raw[0], { words: [] }, raw[2]]],
    ['puzzles 꼴 틀림', [raw[0], raw[1], { puzzles: 'x' }]],
    ['puzzles 빔', [raw[0], raw[1], { puzzles: [] }]],
    ['puzzles null', [raw[0], raw[1], null]],
  ];
  for (const [name, x] of bads) assert.equal(korReportFromRaw(p, x, '2026-10-14', []), null, name);
});
