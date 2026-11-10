// 📘 4학년 2학기 국어 글 여섯째 묶음 v380 (2026-11-01 아버님 「국어 여섯째 묶음 가자」 → 기본안 「추천대로」): K167~K178
//  · 다섯째 묶음이 다 열린 다음 날(11월 16일쯤)부터 읽게 되니 11월 하순 진도 5·6단원 다섯 + 글이 다섯 편뿐이던 단원(독서·1·2·매체)과 3·4단원
//  · 사실은 공공 자료와 대조(연세대 윤동주기념관 원문 · 『한국민속문학사전』·민족문화대백과·세종실록 · 국립국어원 한글 맞춤법 해설·다듬은 말 ·
//    정책브리핑·경기도 해양수산자원연구소·NOAA · 기상청·한국화학연구원 · 질병관리청 · PokeAPI 한국어 도감)
//  · 📦 묶음 b380은 b372가 다 열린 다음 날부터 하루 두 편(js/kordrip.js after — tests/kordrip380.test.js)
//  · 기본안에서 바꾼 것: 바깥 놀이(≈논술 N93) → 창문 열기 · 읽기 전 질문(≈K143) → 차례 보고 골라 읽기 · 사과 편지의 약속은 ✍️로
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
const NEW = Array.from({ length: 12 }, (_, i) => `K${167 + i}`);
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
  '4-2-1': ['4국05-02', '4국05-05', '4국02-04', '4국01-06'],
  '4-2-2': ['4국04-05', '4국02-02', '4국03-02', '4국06-01'],
  '4-2-3': ['4국01-06', '4국03-03', '4국03-01', '4국04-03'],
  '4-2-매체': ['4국06-02', '4국01-05'],
  '4-2-4': ['4국05-03', '4국05-05', '4국02-03'],
  '4-2-5': ['4국01-04', '4국03-04', '4국04-04', '4국04-05'],
  '4-2-6': ['4국01-02', '4국02-03', '4국05-01'],
};

test('📘 여섯째 묶음 열둘 (v380): 연습 아홉 + ✨ 명작 셋 · 물음 서른여섯(셋씩) · 원고 검사 통과 · 7~12줄 · ✍️ 둘 · 학급 회의·두 친구의 글·모둠 대화는 줄마다 · 바탕 글 넷', () => {
  assert.deepEqual(checkContent(DATA), []);
  assert.deepEqual(IDS.slice(166, 178), NEW); // v382 일곱째 묶음이 뒤에 이어짐
  assert.equal(validCards(DATA).length, 226); // v382 일곱째 묶음 열둘 · v389 여덟째 묶음 열둘 · v411 아홉째·열째 묶음 스물넷 더함
  assert.deepEqual(NEW.map((id) => [card(id).kind, card(id).genre]), [
    ['practice', '설명하는 글'], ['classic', '옛이야기'], ['practice', '설명하는 글'], ['practice', '편지'], ['classic', '옛이야기'], ['classic', '동시'],
    ['practice', '토의(학급 회의)'], ['practice', '의견을 제시하는 글 두 편'], ['practice', '보고하는 글'], ['practice', '설명하는 글'], ['practice', '모둠 대화'], ['practice', '독서 일기']]);
  assert.deepEqual(['K168', 'K171', 'K172'].map((id) => card(id).author), ['지은이 모름 · 신코치가 다시 씀', '지은이 모름 · 신코치가 다시 씀', '윤동주']);
  assert.ok(NEW.every((id) => card(id).qs.length === 3), '4학년 글은 물음 셋');
  assert.equal(QS.length, 36);
  assert.deepEqual(NEW.filter((id) => lineCount(card(id)) < 7 || lineCount(card(id)) > 12), [], '짧게 — 7~12줄');
  assert.deepEqual(NEW.filter((id) => card(id).write), ['K168', 'K170']);
  for (const id of ['K168', 'K170']) {
    const w = card(id).write;
    assert.equal(w.v, 1, id);
    assert.equal(w.rubric.must.length, 3, id);
    assert.ok(w.rubric.miss.some((m) => /맞춤법/.test(m)), `${id} 맞춤법은 채점하지 않는다`);
    assert.ok(w.frames.every((f) => f.endsWith('~') && f.split('~').length === 2), `${id} 문장 틀은 빈자리 하나가 끝에 (Codex 53차 #4)`);
  }
  assert.deepEqual(NEW.filter((id) => card(id).layout === 'rows'), ['K173', 'K174', 'K177']);
  assert.deepEqual(NEW.filter((id) => card(id).source), ['K167', 'K169', 'K175', 'K176']);
  for (const id of ['K167', 'K169', 'K175', 'K176']) assert.match(card(id).source, /신코치가 (설명하는|보고하는) 글로 새로 썼어요\.$/, id);
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(read('sw.js')) || [])[1]) >= 380, '원고는 앱 셸 — sw v380 이상');
});

test('📘 단원 (v380): 새 글은 4-2 단원 하나씩 · 만나는 곳은 그 단원 · 첫 성취기준은 그 단원 것 · 5~6학년 성취기준 없음 · 소단원 차례 · 글이 적던 단원부터 채움', () => {
  for (const id of NEW) {
    const us = UNITS.filter((u) => u.cards.includes(id));
    assert.equal(us.length, 1, `${id} 단원 하나`);
    const u = us[0];
    assert.equal(u.term, '4-2', `${id} 4학년 2학기`);
    const where = u.no === '매체' ? '매체 단원' : u.no === '독서' ? '독서 단원' : `${u.no}단원`;
    assert.match(card(id).meta[0], new RegExp(`^만나는 곳: 4-2 ${where} 「${u.title}」`), `${id} 만나는 곳`);
    const codes = card(id).meta.flatMap((m) => [...m.matchAll(/\[(4국0\d-0\d)\]/g)].map((x) => x[1]));
    assert.equal(codes.length, 2, `${id} 성취기준 둘`);
    assert.ok(LINK4[u.id].includes(codes[0]), `${id} 첫 성취기준 ${codes[0]}은 단원 ${u.id}와 이어진 것 (Codex 176차 P2)`);
    assert.ok(!codes.includes('4국01-01') && !codes.includes('4국06-03'), `${id} 4-2 단원과 이어지지 않은 성취기준은 쓰지 않음`);
    assert.ok(!card(id).meta.some((m) => /\[6국/.test(m)), `${id} 5~6학년 성취기준 없음`);
  }
  const of = (uid) => UNITS.find((u) => u.id === uid).cards;
  assert.deepEqual(of('4-2-독서'), ['K197', 'K143', 'K178', 'K192', 'K118', 'K144', 'K165', 'K131', 'K179', 'K206', 'K205'], '읽기 전 질문 → 차례 보고 골라 읽기 → 책 소개 → 감상 → 편지 → 독서 토의');
  assert.deepEqual(of('4-2-1'), ['K132', 'K145', 'K181', 'K207', 'K107', 'K119', 'K146', 'K174', 'K180', 'K193', 'K208'], '① 작품과 내 경험 → ② 다른 의견 비교');
  assert.deepEqual(of('4-2-2'), ['K108', 'K133', 'K164', 'K176', 'K109', 'K134', 'K175', 'K182', 'K194', 'K209', 'K210'], '① 한글 → ② 보고하는 글');
  assert.deepEqual(of('4-2-3'), ['K111', 'K147', 'K173', 'K211', 'K110', 'K120', 'K148', 'K183', 'K195', 'K212', 'K166'], '① 토의 → ② 제안하는 글');
  assert.deepEqual(of('4-2-매체'), ['K122', 'K177', 'K191', 'K203', 'K121', 'K184', 'K196', 'K213', 'K150', 'K135', 'K149']);
  assert.deepEqual(of('4-2-4'), ['K112', 'K123', 'K136', 'K151', 'K162', 'K172', 'K185', 'K204', 'K124', 'K186', 'K113', 'K125', 'K163'], '① 시·이야기 → ② 질문으로 읽기');
  assert.deepEqual(of('4-2-5'), ['K114', 'K126', 'K137', 'K188', 'K138', 'K159', 'K160', 'K171', 'K115', 'K127', 'K139', 'K161', 'K170', 'K187', 'K198', 'K128'], '① 대화·인물의 마음 → ② 편지·초대장');
  assert.deepEqual(of('4-2-6'), ['K116', 'K130', 'K140', 'K142', 'K153', 'K154', 'K157', 'K158', 'K167', 'K169', 'K189', 'K199', 'K200', 'K117', 'K129', 'K141', 'K152', 'K156', 'K155', 'K168', 'K190', 'K201', 'K202', 'K214'], '① 원인과 결과 → ② 이어질 내용 상상');
  // 다섯 편뿐이던 단원(독서·1·2·매체)이 모두 여섯 편 넘게 — 이 묶음이 채우기로 한 것
  for (const uid of ['4-2-독서', '4-2-1', '4-2-2', '4-2-매체']) assert.ok(of(uid).length >= 6, uid);
  assert.match(JSON.parse(read('coach/korean/units.json')).about, /v380 여섯째 묶음/);
});

test('📘 물음 (v380): 지어내기 보기 · 정답만 길지 않게 · 근거 풀이 줄은 근거로도 받음 · 낱말 풀이를 정답에 옮기지 않음 · 중심 정답은 글 그대로가 아님 · 정답 자리 고르게 · 🧠 없음', () => {
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
  assert.deepEqual(QS.filter((x) => /중심/.test(x.skill)).map((x) => x.id), ['K169-3']);
  assert.ok(QS.filter((x) => /원인과 결과|까닭/.test(x.skill)).length >= 12, '까닭(원인과 결과) 물음을 넉넉히');
  // 「시치미」 뜻을 📖에 적으면 K171-2의 답을 미리 준다(Codex 97차)
  assert.ok(!card('K171').words.some(([w]) => w === '시치미'));
});

test('🔍 근거 줄 (v380): 정답을 바로 받치는 줄만 — 원인·마음·까닭을 직접 말하는 줄 · 결론 줄', () => {
  const want = {
    'K167-1': [3, 4], 'K167-2': [6], 'K167-3': [8],
    'K168-1': [3], 'K168-2': [4, 6], 'K168-3': [9, 10],
    'K169-1': [5], 'K169-2': [7, 8], 'K169-3': [8, 9],
    'K170-1': [3], 'K170-2': [5], 'K170-3': [7],
    'K171-1': [3], 'K171-2': [4], 'K171-3': [9],
    'K172-1': [7], 'K172-2': [9], 'K172-3': [11, 12],
    'K173-1': [4], 'K173-2': [5, 6], 'K173-3': [9],
    'K174-1': [2, 5], 'K174-2': [6], 'K174-3': [3, 6],
    'K175-1': [6], 'K175-2': [8], 'K175-3': [9],
    'K176-1': [2], 'K176-2': [5], 'K176-3': [7],
    'K177-1': [3], 'K177-2': [5], 'K177-3': [3, 5, 6, 7, 9],
    'K178-1': [5], 'K178-2': [6], 'K178-3': [4],
  };
  assert.equal(Object.keys(want).length, 36);
  for (const [id, e] of Object.entries(want)) assert.deepEqual(q(id).ev, e, id);
  // Codex 183차 ③: ⑧(짝을 잃음 · 날씨 걱정)은 상황이라 마음·방법 물음의 근거가 아니다 · 사진을 고른 까닭 ⑥은 받는다
  assert.ok(!q('K172-2').ev.includes(8) && !q('K173-3').ev.includes(8) && q('K177-3').ev.includes(6));
  // 이어질 내용 물음(K168-3)의 끝(얼싸안음)은 글에 없다 — 풀이에서만
  assert.ok(!/얼싸안|까닭을 알게|까닭을 알았/.test(body('K168')), 'K168 글은 형제가 마주치기 전에서 끊는다');
  assert.match(q('K168-3').evNote, /서로를 알아보고/);
});

test('✍️ 생각 쓰기 (v380): 사과 편지에는 약속 줄이 없고 ✍️가 약속을 쓰게 한다 · 의좋은 형제는 ⑩ 다음 장면', () => {
  assert.ok(!/앞으로|다시는|약속/.test(body('K170')), 'K170 편지 글에는 앞으로의 약속이 없다(✍️로 쓴다)');
  assert.match(card('K170').write.q, /약속/);
  assert.ok(card('K170').write.rubric.miss[0].startsWith('편지 속 일과 상관없는 약속 — 🔁'));
  assert.match(card('K168').write.q, /^⑩ 다음에/);
  assert.ok(card('K168').write.rubric.miss[0].startsWith('앞 이야기와 상관없는 일 — 🔁'));
});

test('🏛️ 사실 대조 (v380): 조개껍질 원문 · 의좋은 형제 · 여우와 두루미 · 이상해씨 도감 · 비늘 · 눈 결정 · 자음 이름 · 다듬은 말 · 창문 환기 — 쓰지 않기로 한 것은 정말 빠졌나', () => {
  // ✨ 윤동주 「조개껍질」 — 연세대 윤동주기념관 원문제공 119 현대어 표기 · 1935년 12월 · 넷째 연은 원고대로 「아릉아릉」(1955년 판은 「아롱아롱」)
  assert.deepEqual(card('K172').stanzas, [
    ['아롱아롱 조개껍데기', '울언니 바닷가에서', '주어온 조개껍데기'],
    ['여긴여긴 북쪽나라요', '조개는 귀여운선물', '장난감 조개껍데기'],
    ['데굴데굴 굴리며놀다', '짝잃은 조개껍데기', '한짝을 그리워하네'],
    ['아릉아릉 조개껍데기', '나처럼 그리워하네', '물소리 바닷물소리'],
  ]);
  for (const s of ['1935년 12월', '연세대학교 윤동주기념관', '아릉아릉', '1955년', '바닷물소리 듣고 싶어']) assert.ok(JSON.stringify(card('K172').facts).includes(s), `K172 ${s}`);
  assert.ok(!card('K172').qs.some((x) => /아릉아릉|언니/.test(x.q + JSON.stringify(x.opts))), '사전에 없는 「아릉아릉」·풀이가 갈리는 「언니」는 묻지 않는다');
  assert.match(fact('K172', '저작권'), /1945년에 세상을 떠나/);
  // ✨ 의좋은 형제 — 형은 아우가 새살림 · 아우는 형이 식구가 많아 · 밤에 옮김 · 아침에 그대로 · 셋째 날 밤 · 예산 형제는 「주인공이라고 전해져요」만
  const g = body('K168');
  const order = ['새로 살림을 차렸으니', '몰래 져다 아우의', '식구가 많으니', '몰래 져다 형의', '하나도 줄지 않았던', '셋째 날 밤'].map((w) => g.indexOf(w));
  assert.ok(order.every((x, i) => x >= 0 && (!i || x > order[i - 1])), `K168 차례 ${order}`);
  assert.match(fact('K168', '원문'), /한국민속문학사전/);
  assert.match(fact('K168', '만나는 곳'), /이성만·이순 형제.*주인공이라고 전해져요/);
  // ✨ 여우와 두루미 — 처음은 이솝 우화 · 납작한 접시의 국 · 목이 길고 좁은 병
  for (const x of ['납작한 접시', '목이 길고 좁은 병']) assert.ok(body('K171').includes(x), `K171 ${x}`);
  assert.match(fact('K171', '저작권'), /처음은 이솝 우화/);
  // Codex 183차 ⑥: 출처 두 줄이 「(조사 뒤에 채움)」인 채였다 — 조사 보고(파이드루스 라틴어 우화 · 1921 『이솝 우언』 · 끝 장면은 교훈 대신)로 채움
  assert.match(fact('K171', '만나는 곳'), /파이드루스.*1921년에 나온 『이솝 우언』/);
  assert.match(fact('K171', '원문'), /교훈 대신 여우가 스스로 깨닫는 장면/);
  // 「???」는 넣지 않는다 — K138 단체 대화방 글이 일부러 쓴 물음표
  assert.deepEqual(DATA.cards.filter((c) => /채움\)|채울 것|조사 뒤에|대조 기다림|TODO|TBD/.test(JSON.stringify(c))).map((c) => c.id), [], '모든 글 — 빈칸 표시가 남지 않음');
  // 🐾 이상해씨 — 도감 문장만 · 버전을 이은 말·씨앗이 봉오리로 바뀐다·타입·레벨 없음
  const b = body('K167');
  for (const x of ['며칠 동안 아무것도 먹지 않아도 건강하다', '햇빛을 많이 받으면 등의 씨앗이 크게 자란다', '곧 꽃이 핀다는 증거']) assert.ok(b.includes(x), `K167 ${x}`);
  // 「바뀌다」의 활용(바뀐·바뀌어·바꾼)은 글자가 달라 「봉오리로 바」까지만 본다(v380 변이 검사가 「바뀐다」로 빠져나감)
  assert.ok(!/풀 타입|독 타입|레벨|봉오리로 바|봉오리가 되|봉오리가 된|낮잠을 자기 때문|그래서 낮잠/.test(kidText('K167')), 'K167 도감에 없는 말은 쓰지 않는다');
  // 🐟 비늘 — 「모든 물고기」·「겨울엔 안 자란다」·「정확히」 없음 · 촘촘한 줄 무리를 셈 · 이석은 비늘 없는 물고기만이라고 하지 않음
  const f = body('K169');
  assert.ok(f.includes('천천히 자라서') && f.includes('짐작') && f.includes('촘촘한 줄 무리'));
  assert.ok(!/모든 물고기|자라지 않|정확히/.test(f), 'K169 단정하는 말 없음');
  assert.ok(!/비늘이 없는 물고기만/.test(f));
  // ❄️ 눈 결정 — 「같은 모양은 없다」 대신 「찾기는 아주 어렵다」 · 빗방울 아님 · 모든 눈송이가 별 모양이라고 하지 않음
  const s = body('K178');
  assert.ok(s.includes('찾기는 아주 어렵다') && s.includes('물을 이루는 아주 작은 알갱이'));
  assert.ok(!/하나도 없|빗방울|모든 눈/.test(s), 'K178 단정하는 말 없음');
  // 🔠 자음 이름 — 『훈몽자회』에 적힌 것에서 비롯 · 최세진이 지었다고 하지 않음 · 한자 글자·북한 이름 없음
  const n = body('K176');
  assert.ok(n.includes('『훈몽자회』에 적힌 것에서 비롯되었다') && n.includes('1933년') && n.includes('「귿」'));
  assert.ok(!/役|末|衣|최세진이 (이름을 )?지/.test(kidText('K176')), 'K176 한자 글자 없음 · 최세진이 이름을 지었다고 하지 않음');
  // Codex 183차 ①: ② 짜임에 「ㅣ」·「으」가 없으면 기역·디귿·시옷도 맞아 ③과 어긋나고 K176-1 「가악」도 맞는다
  assert.ok(lines('K176')[1].includes('「ㅣ」') && lines('K176')[1].includes('「으」'), 'K176 ② 첫 글자는 ㅣ와 · 둘째 글자는 으 아래 받침');
  // ②의 짜임을 그대로 따져 보면 니은·리을·미음·비읍은 맞고 기역·디귿·시옷은 다르다(정답 기윽만 맞음)
  const jamo = (ch) => { const k = ch.charCodeAt(0) - 0xac00; return [Math.floor(k / 588), Math.floor((k % 588) / 28), k % 28]; };
  const fits = (name, cho, jong) => { const [a, b] = [...name].map(jamo); return a[0] === cho && a[1] === 20 && a[2] === 0 && b[0] === 11 && b[1] === 18 && b[2] === jong; };
  assert.deepEqual(['니은', '리을', '미음', '비읍'].map((x, i) => fits(x, [2, 5, 6, 7][i], [4, 8, 16, 17][i])), [true, true, true, true]);
  assert.deepEqual([['기역', 0, 1], ['디귿', 3, 7], ['시옷', 9, 19], ['기윽', 0, 1], ['가악', 0, 1]].map(([x, c, j]) => fits(x, c, j)), [false, false, false, true, false]);
  // Codex 183차 ④: 틀린 보기는 「소리가 같은 한자」 — 「옷이라고 읽는 한자」는 뜻으로 읽는 것과 헷갈림
  assert.ok(!q('K176-3').opts.some((o) => /이라고 읽는/.test(o.t)));
  // 🔤 다듬은 말 — 국립국어원 다듬은 말(지금도 검색되는 것만 — 누리사랑방·맛깔장은 쓰지 않음)
  const d = body('K175');
  for (const x of ['「누리집」', '「붙임쪽지」', '「손뼉맞장구」']) assert.ok(d.includes(x), `K175 ${x}`);
  // Codex 183차 ②: 「조사로 알게 된 점」은 넓어 ③ 「열두 개」도 맞았다 — 마지막에 정리한 것으로 좁힘
  assert.match(q('K175-3').q, /마지막에 정리한/);
  assert.ok(!/누리사랑방|맛깔장|자기촬영/.test(d));
  // 🪟 창문 — 두 의견 모두 쉬는 시간마다 연다(질병관리청 학교 수칙과 어긋나지 않게) · 감기 이야기 없음
  const w = body('K174');
  assert.ok(/채아: 저는 추운 날에도 쉬는 시간마다/.test(w) && /로운: 저는 추운 날에는 쉬는 시간마다/.test(w));
  assert.ok(!/감기|점심시간에만/.test(w));
  // 🎣 송어 체험 — 얼음 위 불·직접 끌어내기 같은 위험한 장면 없음
  assert.ok(!/모닥불|불을 쬐|끌어냈/.test(body('K177')));
  // 📖 낱말 뜻 — 표준국어대사전 꼴
  assert.equal(word('K168', '볏단'), '벼를 베어 묶은 단');
  assert.equal(word('K169', '겹겹이'), '여러 겹으로');
  // 사전 대조로 고친 것 — 주둥이(「길고」는 사전에 없음) · 첫소리(소리가 아니라 「자음」) · 게시물(「그림」 대신 「물건」) · 살림(「한집안」 붙여 씀)
  assert.match(word('K171', '주둥이'), /^짐승의 머리에서 뾰족하게 나온 코나 입/);
  assert.match(word('K176', '첫소리'), /처음 소리인 자음/);
  assert.match(word('K175', '게시물'), /글이나 물건$/);
  assert.equal(word('K168', '살림'), '한집안을 이루어 살아가는 일');
  assert.ok(!card('K167').words.some(([x]) => x === '영양분'), 'K125 「양분」과 사전 뜻이 같은 「영양분」은 📖에 넣지 않음');
  assert.ok(!card('K172').words.some(([x]) => x === '아롱아롱' || x === '울'), 'K55 「알롱알롱」과 뜻이 같은 「아롱아롱」·한 글자 「울」은 넣지 않음');
  // 형제·언니는 옛이야기와 원문에 있는 말(K53 흥부와 놀부·K6 엄마야 누나야처럼) — 나머지 글은 집 식구를 지어내지 않는다
  for (const id of NEW.filter((x) => x !== 'K168' && x !== 'K172')) {
    assert.ok(!/동생|누나|언니|오빠|형이랑|형과|형은|형이 |형제/.test(kidText(id)), `${id} 형제를 지어내지 않음`);
  }
  assert.ok(/언니/.test(JSON.stringify(card('K172').stanzas)) && !/언니/.test(JSON.stringify(card('K172').qs)), 'K172의 「언니」는 원문에만');
  for (const id of NEW) assert.ok(![...kidText(id)].some((ch) => (ch >= 'ㅤ' && ch <= '㆏') || (ch >= 'ᄀ' && ch <= 'ᇿ')), `${id} 옛 한글 글자 없음`);
});

test('🔁 겹침 (v380): 새 글 제목이 옛 글과 같지 않다 · 제목에 「」 없음 · 기본안에서 바꾼 것이 옛 꼴로 돌아가지 않았다', () => {
  const old = DATA.cards.filter((c) => Number(c.id.slice(1)) <= 166);
  for (const id of NEW) assert.ok(!old.some((c) => c.title === card(id).title), `${id} 제목이 옛 글과 같음`);
  assert.deepEqual(NEW.filter((id) => /[「」]/.test(card(id).title)), [], '제목에 「」 없음 — 화면이 제목을 「」로 감싼다');
  assert.ok(!/바깥 놀이|운동장에 나가/.test(body('K174')), 'K174는 논술 N93(운동장에 나가 놀기)과 다른 주제');
  assert.ok(!card('K178').qs.some((x) => /좋았던 점/.test(x.q)), 'K178은 K143(질문하고 읽어 좋았던 점)과 다른 물음');
  assert.ok(!card('K177').qs.some((x) => /차례/.test(x.skill)), 'K177은 K122(만드는 차례)와 다른 물음');
  assert.ok(!['K175'].some((id) => card(id).qs.some((x) => /차례/.test(x.skill))), 'K175는 K109·K134(조사한 차례)와 다른 물음');
});

test('📖 같이 안 낼 무리 (v380): 알림 글·게시물 · 안내판·게시물', () => {
  for (const [a, b] of [['알림 글', '게시물'], ['안내판', '게시물']]) assert.ok(WORDS.apart.some((g) => g.includes(a) && g.includes(b)), `${a}·${b}`);
});

test('📦 여섯째 묶음 b380 (v380): 열둘 = 새 글 · b372 다음에 이어서 · 포켓몬 글과 명작 동시가 첫날 · 5단원이 그다음 · ✍️ 둘은 다른 날 · 이어질 내용은 끝', () => {
  const b = DRIP.bundles.find((x) => x.key === 'b380');
  assert.equal(b.after, 'b372');
  assert.deepEqual(b.order.slice().sort(), NEW.slice().sort(), '묶음 = 이번 글 열둘');
  assert.deepEqual(b.order.slice(0, 2), ['K167', 'K172'], '첫날 — 이상해씨 · 조개껍질');
  assert.deepEqual(b.order.slice(2, 4), ['K170', 'K171'], '둘째 날 — 5단원');
  assert.equal(b.order[b.order.length - 1], 'K168', '6단원 이어질 내용(12월 진도)은 끝');
  const dayOf = (id) => Math.floor(b.order.indexOf(id) / DRIP.perDay);
  assert.notEqual(dayOf('K168'), dayOf('K170'), '✍️ 생각 쓰기 둘은 다른 날');
  assert.ok(read('sw.js').includes("'./js/kordrip.js'"), '앱 셸');
});
