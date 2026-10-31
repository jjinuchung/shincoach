// 📰 신문 기사로 만든 국어 글 6편 v265 (2026-10-16, 아버님 "이대로 진행"):
//  · 어린이조선일보 2026년 10월 기사·학습 만화를 바탕으로 신코치가 다시 쓴 연습 글 — 기사의 사실(수·때·이름)은 그대로, 문장은 새로 (기사 문장은 신문사 저작물이고 앱은 공개 저장소다)
//  · K73 성수동·인사동(5-1 5단원 — 문제 상황과 해결 방법) · K74 물소 목장(5-1 4단원 — 원인과 결과·숫자 자료) · K75 치킨 회사 앱과 개인 정보(5-2 매체 — 내용이 알맞은지 따지기) ·
//    K76 판다 외교(5-1 4단원 — 시간의 흐름) · K77 정조 능행차(5-2 3단원 — 까닭 짐작) · K78 고려 과거제와 음서제(5-1 4단원 — 비교와 대조)
//  · ✍️ 둘(K73 동네 분위기를 지키는 방법 · K75 어느 앱을 쓸까) · 🧩 차례 둘(O21 · O22) · 상표 이름·무서운 장면(지뢰·뒤주)은 넣지 않는다
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SOURCE_MAX, checkCard, checkContent, validCards, lineCount } from '../js/korean.js';
import { checkPuzzles, validOrders } from '../js/korpuzzle.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const DATA = JSON.parse(read('coach/korean/reading.json'));
const PUZ = JSON.parse(read('coach/korean/puzzles.json'));
const UNITS = JSON.parse(read('coach/korean/units.json')).units;
const card = (id) => DATA.cards.find((c) => c.id === id);
const NEW = ['K73', 'K74', 'K75', 'K76', 'K77', 'K78'];
const QS = NEW.flatMap((id) => card(id).qs);
const CIRC = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
const nums = (s) => [...new Set([...String(s || '')].map((ch) => CIRC.indexOf(ch) + 1).filter((n) => n > 0))];
const bare = (s) => String(s).replace(/[\s.,!?'"·…—–\-()「」]/g, '');
const text = (id) => card(id).lines.join(' ');

/** 쓰는 성취기준 — 공식 문구(경기도교육청 2026 예시자료 연결표, kornew261과 같은 문구)와 연결표에서 이어진 5학년 단원 */
const STD = {
  '6국02-01': ['글의 구조를 고려하며 주제나 주장을 파악하고 글 내용을 요약한다.', ['5-1-독서', '5-1-4', '5-2-3']],
  '6국02-02': ['글에서 생략된 내용이나 함축된 표현을 문맥을 고려하여 추론한다.', ['5-2-3', '5-2-6']],
  '6국02-03': ['글이나 자료를 읽고 내용의 타당성과 표현의 적절성을 평가한다.', ['5-2-매체']],
  '6국02-04': ['문제 상황과 관련된 다양한 관점의 글을 읽고 이를 문제 해결에 활용한다.', ['5-1-5']],
  '6국04-05': ['글과 담화에 쓰인 시간 표현을 이해하고 상황에 맞게 표현한다.', ['5-1-2']],
  '6국06-02': ['뉴스 및 각종 정보 매체 자료의 신뢰성을 평가한다.', ['5-2-매체']],
};

test('📰 신문 글 6편 (v265): 연습 카드 여섯 · 물음 스물넷 · 원고 검사 통과 · 기사 다섯은 제목 줄과 줄마다 꼴 · 단원 지도 · ✍️ 둘 · 🧩 차례 둘 · sw v265', () => {
  assert.deepEqual(checkContent(DATA), []);
  assert.deepEqual(DATA.cards.slice(72, 78).map((c) => c.id), NEW);
  assert.equal(validCards(DATA).length, 166); // v267 단원 채우기 여섯 · v281 새 글 열둘 · v282 포켓몬 글 여섯 · v291 호상놀이 글 넷 · v298 4학년 2학기 글 열둘 · v320 4학년 2학기 글 둘째 묶음 열둘 · v322 4학년 2학기 글 셋째 묶음 열둘 · v347 4학년 2학기 글 넷째 묶음 열둘 · v372 4학년 2학기 글 다섯째 묶음 열둘 더함
  assert.deepEqual(NEW.map((id) => [card(id).kind, card(id).genre]), [
    ['practice', '기사문'], ['practice', '기사문'], ['practice', '기사문'], ['practice', '기사문'], ['practice', '기사문'], ['practice', '설명하는 글']]);
  assert.deepEqual(NEW.map((id) => card(id).qs.length), [4, 4, 4, 4, 4, 4]);
  assert.deepEqual(NEW.map((id) => lineCount(card(id))), [14, 13, 14, 13, 14, 11], '지금 글과 비슷한 길이(20줄 안)');
  assert.deepEqual(NEW.map((id) => card(id).words.length), [6, 6, 6, 6, 6, 6]);
  // 기사는 ① 제목 줄 + 줄마다 꼴(K61처럼) · 설명하는 글은 문단
  for (const id of NEW.slice(0, 5)) { assert.match(card(id).lines[0], /^\[제목\] /, id); assert.equal(card(id).layout, 'rows', id); }
  assert.ok(!Object.hasOwn(card('K78'), 'layout'));
  // ✍️ 생각 쓰기 — 동네 분위기를 지키는 방법 · 어느 앱을 쓸까(둘 다 기사에서 찾은 내용을 까닭으로)
  assert.deepEqual(NEW.filter((id) => card(id).write), ['K73', 'K75']);
  for (const id of ['K73', 'K75']) {
    const w = card(id).write;
    assert.equal(w.v, 1, id);
    assert.ok(w.rubric.must.length >= 2, id);
    assert.ok(w.rubric.miss.some((m) => /맞춤법/.test(m)), `${id} 맞춤법은 채점하지 않는다`);
    assert.match(w.q, /기사에서 찾은 내용을 까닭으로/, id);
    for (const fr of w.frames) assert.ok(fr.endsWith('~'), `${id} 틀의 빈자리는 끝에 — ${fr}`);
  }
  // 📘 단원 지도 — 새 글은 단원 하나에, 정한 자리에
  const of = (u) => UNITS.find((x) => x.id === u).cards.filter((id) => NEW.includes(id));
  assert.deepEqual(['5-1-5', '5-1-4', '5-2-매체', '5-2-3'].map(of), [['K73'], ['K74', 'K76', 'K78'], ['K75'], ['K77']]);
  for (const id of NEW) assert.equal(UNITS.filter((u) => u.cards.includes(id)).length, 1, `${id} 단원 하나`);
  // 🧩 차례 맞추기 — 그 글을 읽고(★) 여는 이야기 흐름 · 제목은 글 제목 그대로 · 맞는 차례는 하나뿐
  assert.deepEqual(checkPuzzles(PUZ, DATA.cards), []);
  const pz = PUZ.puzzles.filter((p) => ['O21', 'O22'].includes(p.id));
  assert.deepEqual(pz.map((p) => [p.id, p.kind, p.ask, p.card, p.title]), [['O21', 'order', 'event', 'K73', card('K73').title], ['O22', 'order', 'event', 'K76', card('K76').title]]);
  for (const p of pz) assert.deepEqual(validOrders(p.chunks.length, p.need), [p.chunks.map((_, i) => i)], p.id);
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(read('sw.js')) || [])[1]) >= 265, 'sw는 v265 이상(원고가 앱 셸)');
});

test('📰 신문 글 물음 (v265): 물음마다 지어내기 보기 · 정답만 유난히 길지 않게 · 근거 풀이가 짚는 줄은 근거로도 받음 · 근거가 없는 물음엔 둘째 힌트 · 낱말 풀이를 그대로 옮긴 정답 없이 · 중심 내용 정답은 글 그대로가 아님', () => {
  assert.equal(QS.length, 24);
  for (const q of QS) {
    assert.ok(q.opts.some((o) => o.type === 'make'), `${q.id} 지어내기 보기`);
    const len = q.opts.map((o) => [...o.t].length);
    const k = q.opts.findIndex((o) => o.ok);
    const other = Math.max(...len.filter((_, i) => i !== k));
    assert.ok(len[k] <= other * 1.3, `${q.id} 정답 보기 길이 ${len[k]} — 가장 긴 틀린 보기 ${other}`);
    if (q.ev) assert.deepEqual(nums(q.evNote).filter((n) => !q.ev.includes(n)), [], `${q.id} 근거 풀이가 쓰는 줄은 근거로도 받는다`);
    else assert.ok(q.hint2 && q.doneNote, `${q.id} 둘째 힌트·풀이`);
  }
  assert.deepEqual(QS.filter((q) => !q.ev).map((q) => q.id), ['K73-2']);
  // 정답을 바로 받쳐 주는 줄은 근거로 받는다 (Codex 75차) — 물소: ⑬ 새 품종을 키우는 농가 · 판다: ⑥ 판다 외교의 뜻 · 고려: ⑪ 두 제도를 한데 견준 줄
  const ev = (id) => QS.find((q) => q.id === id).ev;
  assert.deepEqual([ev('K74-1'), ev('K76-2'), ev('K78-1')], [[5, 6, 10, 13], [6, 11, 12], [4, 9, 11]]);
  for (const c of NEW.map(card)) for (const q of c.qs) {
    const ok = bare(q.opts.find((o) => o.ok).t);
    for (const [, m] of c.words) for (const part of m.split(' — ')) if (bare(part).length >= 6) assert.ok(!ok.includes(bare(part)), `${q.id} 낱말 풀이 그대로 — ${part}`);
    if (/중심|가장 말하고 싶은|주장 찾기/.test(q.skill)) assert.ok(!c.lines.map(bare).some((l) => l.includes(ok)), `${q.id} 정답이 글 그대로`);
  }
  // 사실과 짐작 가르기 — 정답은 기자가 짐작한 줄(~ㄹ 수도 있다), 틀린 보기 둘은 이미 일어난 일을 전한 줄
  const k73 = card('K73');
  const q2 = k73.qs[1];
  assert.equal(q2.opts.find((o) => o.ok).t, k73.lines[9]);
  assert.match(k73.lines[9], /수도 있다\.$/);
  assert.deepEqual(q2.opts.filter((o) => o.type === 'fo').map((o) => k73.lines.indexOf(o.t) + 1), [7, 9]);
  // 잘못 읽기는 짜임 놓치기 말고 고루
  const used = new Set(QS.flatMap((q) => q.opts.filter((o) => !o.ok).map((o) => o.type)));
  assert.deepEqual([...used].sort(), ['detail', 'flip', 'fo', 'link', 'literal', 'make', 'time']);
});

test('📘 성취기준 (v265): [6국…] 뒤 문구는 공식 문구 그대로 · 연결표에서 그 글의 5학년 단원과 이어진 성취기준이 하나 이상', () => {
  for (const id of NEW) {
    const found = card(id).meta.flatMap((m) => [...m.matchAll(/\[(6국0\d-0\d)\]\s*([^·[]*)/g)].map((x) => [x[1], x[2].trim()]));
    assert.ok(found.length, `${id} 성취기준`);
    for (const [k, said] of found) {
      assert.ok(Object.hasOwn(STD, k), `${id} ${k} 모르는 성취기준`);
      assert.ok(said.startsWith(STD[k][0]), `${id} ${k} 문구 — ${said}`);
    }
    const unit = UNITS.find((u) => u.cards.includes(id)).id;
    assert.ok(found.some(([k]) => STD[k][1].includes(unit)), `${id} 단원 ${unit}과 이어진 성취기준`);
  }
});

test('📰 바탕 글 (v265): 신문 기사를 다시 쓴 글은 source에 밝힌다(연습 카드에만 · 120자까지) · 글 아래 작게 📰 · 기사의 수·때·이름은 그대로 · 상표 이름·무서운 장면 없이 · 사실은 넘치지 않게(Codex 75차)', () => {
  assert.equal(SOURCE_MAX, 120);
  for (const id of NEW) {
    const s = card(id).source;
    assert.match(s, /^(어린이조선일보 2026년 10월|어린이 신문에)/, id);
    assert.match(s, /신코치가 쉬운 말로 다시 썼어요\.$/, id);
    assert.ok([...s].length <= SOURCE_MAX, id);
  }
  assert.deepEqual(DATA.cards.filter((c) => c.source).map((c) => c.id), [...NEW, 'K103', 'K104', 'K105', 'K106', 'K131', 'K133', 'K135', 'K143', 'K144', 'K150', 'K153', 'K157', 'K163', 'K164', 'K165'], 'source는 바탕 글이 있는 새 글에만 (v372 야돈·물고기·한글날·토끼전 편지 · v291 호상놀이 글 넷 — 보존회 책자 · v322 이솝 독서 대화·글자·손 씻기 카드 뉴스 · v347 뼈 독서 일기·이솝 감상문·잉어킹 발표·동파 설명 글)');
  // 원고 검사가 잡는 것 — 빈 글 · 너무 긴 글 · 명작 카드
  const bad = (fix, base = 'K73') => { const c = JSON.parse(JSON.stringify(card(base))); fix(c); return checkCard(c).join(' '); };
  assert.equal(bad(() => {}), '');
  assert.match(bad((c) => { c.source = ' '; }), /source\(바탕 글\)는 연습 카드에 120자까지의 글로/);
  assert.match(bad((c) => { c.source = '가'.repeat(121); }), /source\(바탕 글\)/);
  assert.match(bad((c) => { c.source = '바탕 글'; }, 'K72'), /source\(바탕 글\)/);
  // 화면 — 연습 글 상자 아래 📰 한 줄
  assert.match(read('js/koreanview.js'), /if \(card\.source\) box\.appendChild\(el\('p', 'kor-source', `📰 \$\{card\.source\}`\)\);/);
  assert.match(read('css/style.css'), /\.kor-source \{/);
  // 기사의 사실은 그대로 (수·때·이름)
  const keep = {
    K73: ['1990년대까지', '구두 공장', '인사동', '한옥'],
    K74: ['여주', '34마리', '2015년부터 2025년까지 14% 줄었다', '8%', '39%', '6000만 원어치', '홀스타인'],
    K75: ['세 곳', '0.5~2%', '1~5%', '6000원', '록인 효과', '공동 현관 비밀번호'],
    K76: ['애틀랜타', '청두', '여섯 살', '10년 동안', '1972년', '1980년대부터', '2024년', '우호의 사절'],
    K77: ['2026년 10월 4일', '제22대', '11년 동안 13번', '1795년 행차에는 1779명', '779마리', '정약용', '거중기', '장용영'],
    K78: ['958년', '광종', '쌍기', '음서제', '천민'],
  };
  for (const [id, list] of Object.entries(keep)) for (const w of list) assert.ok(text(id).includes(w), `${id} ${w}`);
  // 상표 이름 없이 · 무서운 장면 없이(사도세자는 한 줄로만)
  const all = JSON.stringify(NEW.map(card)) + JSON.stringify(PUZ.puzzles.filter((p) => ['O21', 'O22'].includes(p.id)));
  assert.ok(!/교촌|BBQ|BHC|bhc|무신사|올리브영|아디다스|세븐일레븐|배민|쿠팡/.test(all), '상표 이름 없이');
  assert.ok(!/뒤주|지뢰|폭발|죽였|피가|목숨|가둬|갇혀/.test(all), '무서운 장면 없이');
  assert.match(text('K77'), /사이가 나빠 젊은 나이에 세상을 떠났다/);
  // 사실은 넘치지 않게 (Codex 75차)
  //  · 고려 과거제는 천민 말고도 시험을 보기 어려운 사람이 있었다 — "누구나"·"상관없이"라고 하지 않는다(글·근거 풀이 모두)
  const k78 = card('K78');
  assert.equal(k78.lines[3], '과거제는 추천이나 집안 대신 시험을 치러 실력 있는 사람을 관리로 뽑는 제도이다.');
  assert.equal(k78.lines[4], '다만 신분이 낮은 사람들은 시험을 보기 어려웠고, 천민은 아예 시험을 볼 수 없었다.');
  assert.ok(!/누구나|상관없이/.test(JSON.stringify(k78)), 'K78 누구나·상관없이 없이');
  //  · 판다는 귀여운 모습이 친근할 뿐, 야생 곰이 사납지 않다고 단정하지 않는다
  assert.equal(card('K76').lines[10], '판다는 귀여운 모습 덕분에 사람들에게 친근하게 느껴진다.');
  assert.ok(!/사납|사나워/.test(JSON.stringify(card('K76'))), 'K76 판다 성질을 단정하지 않음');
  assert.equal(QS.find((q) => q.id === 'K76-2').opts.find((o) => o.type === 'flip').t, '다른 나라와 사이를 멀리하려고');
  //  · 치킨집이 안 내도 되는 것은 '배달 앱에 내는' 수수료 · 손님 배달비는 ⑫(배달 앱 정기 회원의 무료 배달)에 나온다
  assert.match(card('K75').write.model, /⑧ 치킨집도 배달 앱에 내는 수수료를 내지 않아도 되니까요\.$/);
  assert.equal(QS.find((q) => q.id === 'K75-2').opts.find((o) => o.type === 'make').why, '회사 앱이 손님에게 배달비를 받지 않는다는 말은 없어요. ⑫의 무료 배달은 배달 앱 정기 회원의 혜택이에요.');
});
