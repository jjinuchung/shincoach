// 📘 4학년 2학기 국어 글 둘째 묶음 v320 (2026-10-22 아버님 "새 국어 글 한 묶음 시작하자" → 기본안 "이대로 진행" → 원고 검수 "이대로"): K119~K130
//  · 지금 학기(2022 개정 국정 4-2) 진도대로 — 4단원·매체(10월) · 5단원(11월) · 6단원(12월) + 1·3단원 복습 · 지난 묶음에 없던 📺 매체 단원 둘
//  · 사실은 공공 자료와 대조(위키문헌 1955년 판 스캔 · 표준국어대사전 · 한국민족문화대백과 · 국립수목원 웹진 · 미국 산림청 Seed Manual · PokeAPI 한국어 도감)
//  · 📦 새 글은 하루에 두 편씩(js/kordrip.js) — 아이 화면에서만 잠긴 글을 뺀다 · 아빠 보고는 모든 글
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkContent, validCards, lineCount } from '../js/korean.js';
import { DRIP, dripOf } from '../js/kordrip.js';
import { cloneProfile, mergeStatRecord, getProfile } from '../js/db.js';
import { initProfile, korDripStart, korDripMap } from '../js/xp.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const DATA = JSON.parse(read('coach/korean/reading.json'));
const UNITS = JSON.parse(read('coach/korean/units.json')).units;
const IDS = DATA.cards.map((c) => c.id);
const card = (id) => DATA.cards.find((c) => c.id === id);
const NEW = Array.from({ length: 12 }, (_, i) => `K${119 + i}`);
const QS = NEW.flatMap((id) => card(id).qs);
const CIRC = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
const nums = (s) => [...new Set([...String(s || '')].map((ch) => CIRC.indexOf(ch) + 1).filter((n) => n > 0))];
const bare = (s) => String(s).replace(/[\s.,!?'"·…—–\-()「」]/g, '');
const lines = (id) => card(id).lines || card(id).stanzas.flat();
const body = (id) => lines(id).join(' ');
const kidText = (id) => JSON.stringify({ ...card(id), meta: null, facts: null });
/** 4-2 단원마다 이어진 성취기준 (경기도교육청 예시 자료 연결표 — tests/kornew298과 같은 표) */
const LINK4 = {
  '4-2-1': ['4국05-02', '4국05-05', '4국02-04', '4국01-06'],
  '4-2-3': ['4국01-06', '4국03-03', '4국03-01', '4국04-03'],
  '4-2-매체': ['4국06-02', '4국01-05'],
  '4-2-4': ['4국05-03', '4국05-05', '4국02-03'],
  '4-2-5': ['4국01-04', '4국03-04', '4국04-04', '4국04-05'],
  '4-2-6': ['4국01-02', '4국02-03', '4국05-01'],
};

before(async () => {
  await getProfile(); // 가짜 저장소 열기
  await initProfile();
});

test('📘 둘째 묶음 열둘 (v320): 연습 열 + ✨ 명작 둘 · 물음 서른여섯(셋씩) · 원고 검사 통과 · 짧게(7~12줄, 원문 여섯 줄 동시만 예외) · ✍️ 둘 · 두 사람의 글·메시지는 줄마다', () => {
  assert.deepEqual(checkContent(DATA), []);
  assert.deepEqual(IDS.slice(118, 130), NEW);
  assert.equal(validCards(DATA).length, 142); // v322 셋째 묶음 열둘 더함
  assert.deepEqual(NEW.map((id) => [card(id).kind, card(id).genre]), [
    ['practice', '의견을 제시하는 글 두 편'], ['practice', '제안하는 글'], ['practice', '발표하는 글'], ['practice', '일기'], ['classic', '동시'], ['practice', '이야기'],
    ['practice', '설명하는 글'], ['practice', '메시지 대화'], ['practice', '편지'], ['practice', '일기'], ['classic', '옛이야기'], ['practice', '설명하는 글']]);
  assert.deepEqual([card('K123').author, card('K129').author], ['윤동주', '지은이 모름 · 신코치가 다시 씀']);
  assert.ok(NEW.every((id) => card(id).qs.length === 3), '4학년 글은 물음 셋');
  assert.equal(QS.length, 36);
  assert.deepEqual(NEW.filter((id) => lineCount(card(id)) < 7 || lineCount(card(id)) > 12), ['K123'], '짧게 — 「무얼 먹고 사나」는 원문이 세 연 여섯 줄');
  assert.equal(lineCount(card('K123')), 6);
  assert.deepEqual(NEW.filter((id) => card(id).write), ['K124', 'K129']);
  for (const id of ['K124', 'K129']) {
    const w = card(id).write;
    assert.equal(w.v, 1, id);
    assert.equal(w.rubric.must.length, 3, id);
    assert.ok(w.rubric.miss.some((m) => /맞춤법/.test(m)), `${id} 맞춤법은 채점하지 않는다`);
    assert.ok(w.frames.every((f) => f.endsWith('~') && f.split('~').length === 2), `${id} 문장 틀은 빈자리 하나가 끝에`);
  }
  assert.deepEqual(NEW.filter((id) => card(id).layout === 'rows'), ['K119', 'K126']);
  assert.ok(!NEW.some((id) => card(id).source), '바탕 글이 없는 새 글 — source 없음');
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(read('sw.js')) || [])[1]) >= 320, '원고는 앱 셸 — sw v320 이상');
});

test('📘 단원 (v320): 새 글은 4-2 단원 하나씩 · 만나는 곳은 그 단원 · 성취기준은 그 단원과 이어진 것이 하나 이상 · 5~6학년 성취기준 없음 · 📺 매체 단원을 채움', () => {
  for (const id of NEW) {
    const us = UNITS.filter((u) => u.cards.includes(id));
    assert.equal(us.length, 1, `${id} 단원 하나`);
    const u = us[0];
    assert.equal(u.term, '4-2', `${id} 4학년 2학기`);
    assert.match(card(id).meta[0], new RegExp(`^만나는 곳: 4-2 ${u.no === '매체' ? '매체 단원' : `${u.no}단원`} 「${u.title}」`), `${id} 만나는 곳`);
    const codes = card(id).meta.flatMap((m) => [...m.matchAll(/\[(4국0\d-0\d)\]/g)].map((x) => x[1]));
    assert.ok(codes.some((k) => LINK4[u.id].includes(k)), `${id} 단원 ${u.id}와 이어진 성취기준`);
    assert.ok(!card(id).meta.some((m) => /\[6국/.test(m)), `${id} 5~6학년 성취기준 없음`);
  }
  assert.deepEqual(UNITS.find((u) => u.id === '4-2-매체').cards, ['K122', 'K121', 'K135'], '자료를 고르고 만들기 → 자료를 보여 주며 발표 → (v322) 카드 뉴스');
  assert.match(UNITS.find((u) => u.id === '4-2-1').goal, /비교/);
});

test('📘 물음 (v320): 물음마다 지어내기 보기 · 정답만 유난히 길지 않게 · 근거 풀이가 짚는 줄은 근거로도 받음 · 모든 물음에 근거 · 낱말 풀이를 정답에 옮기지 않음 · 중심 정답은 글을 그대로 옮기지 않음 · 정답 자리 고르게', () => {
  const at = [0, 0, 0, 0];
  for (const q of QS) {
    assert.ok(q.opts.some((o) => o.type === 'make'), `${q.id} 지어내기 보기`);
    const len = q.opts.map((o) => [...o.t].length);
    const k = q.opts.findIndex((o) => o.ok);
    at[k]++;
    const other = Math.max(...len.filter((_, i) => i !== k));
    assert.ok(len[k] <= other * 1.3, `${q.id} 정답 보기 길이 ${len[k]} — 가장 긴 틀린 보기 ${other}`);
    assert.ok(Array.isArray(q.ev) && q.ev.length, `${q.id} 근거`);
    assert.deepEqual(nums(q.evNote).filter((n) => !q.ev.includes(n)), [], `${q.id} 근거 풀이가 쓰는 줄은 근거로도 받는다`);
  }
  for (const id of NEW) {
    const c = card(id);
    for (const q of c.qs) {
      const ok = bare(q.opts.find((o) => o.ok).t);
      for (const [, m] of c.words) for (const part of m.split(' — ')) assert.ok(!(bare(part).length >= 6 && ok.includes(bare(part))), `${q.id} 정답에 낱말 풀이 그대로 — ${part}`);
      if (/중심/.test(q.skill)) assert.ok(!lines(id).some((l) => bare(l).includes(ok)), `${q.id} 중심 정답이 글 그대로`);
    }
  }
  assert.ok(Math.max(...at) <= 14, `정답 자리 ${at}`);
  // 🧠 아는 것으로 답하기 — 한 편에 하나 · "글에서 알 수 있는" 물음에만 · 아는 것을 먼저 인정
  const know = QS.flatMap((q) => q.opts.filter((o) => o.type === 'know').map((o) => [q.id, o]));
  assert.deepEqual(know.map(([id]) => id), ['K130-2']);
  assert.ok(know[0][1].why.startsWith('맞는 말이에요.'));
});

test('🔍 근거 줄 (Codex 126차 #1·#2·#5): 정답을 직접 받치는 줄만 — 대상·상황 소개·결과만 말하는 줄은 빼고 · 글의 결론 줄은 넣는다 · 풀이 글도 그 줄만 · K125 ⑧은 거리와 살아남기를 늘 비례로 읽히지 않게', () => {
  const want = {
    'K123-3': [6], // ⑤ 「별나라 사람」은 대상만 — 궁금한 마음은 ⑥의 묻는 말에서
    'K124-1': [4], // ① 카드를 빌려준 상황 — 마음은 ④ 얼굴이 빨개져 말없이
    'K128-2': [6], // ⑤ 아쉬웠다는 말만 — 까닭(한 달 연습)은 ⑥
    'K129-2': [5], // ⑥ 고양이를 받은 것은 결과 — 원인은 ⑤
    'K125-1': [5, 6, 9], // ⑨ 도는 것이 씨를 멀리 퍼뜨린다 — ④의 물음에 바로 답한다
    'K125-3': [6, 9], // ⑥ 바람이 어미나무에서 멀리 실어 나른다 — 중심 생각을 받친다
  };
  for (const [id, e] of Object.entries(want)) {
    const q = QS.find((x) => x.id === id);
    assert.deepEqual(q.ev, e, `${id} 근거`);
    assert.deepEqual(nums(q.evNote).sort((a, b) => a - b), e, `${id} 풀이 글도 그 줄만`);
  }
  assert.match(QS.find((x) => x.id === 'K129-2').evNote, /까닭.*결과/, 'K129-2 원인과 결과를 갈라 말한다');
  assert.equal(lines('K125')[7], '어미나무와 떨어진 곳에 내려앉은 씨는 햇볕, 물, 양분을 두고 덜 다투니 싹을 틔우기가 더 쉽다.');
  assert.ok(!/일수록|살아남/.test(body('K125')), 'K125 「멀리 날아간 씨일수록 살아남기 쉽다」는 뺐다');
});

test('🏛️ 사실 대조 (v320): 윤동주 원문(1955년 판) · 단풍나무 열매(시과) · 「좁쌀 한 알」 줄거리 · 잠만보 한국어 도감 · 꼬부기 물 타입 — 쓰지 않기로 한 것은 정말 빠졌나 · 집 식구를 지어내지 않음 · 옛 한글 없음', () => {
  // 윤동주 「무얼 먹고 사나」 — 1955년 판 150쪽을 오늘 맞춤법으로(잡아먹고 · 구워) · 「산골엣」은 원문 그대로 · 1948 초판에는 없음
  assert.deepEqual(card('K123').stanzas, [['바닷가 사람', '물고기 잡아먹고 살고'], ['산골엣 사람', '감자 구워 먹고 살고'], ['별나라 사람', '무얼 먹고 사나.']]);
  const f123 = Object.fromEntries(card('K123').facts);
  assert.match(f123['원문'], /1955년 판\(150쪽\)/);
  for (const s of ['무얼 먹구 사나 → 무얼 먹고 사나', '잡아 먹고 → 잡아먹고', '구어 → 구워', '「산골엣 사람」은 원문 그대로']) assert.ok(f123['원문'].includes(s), `K123 원문 줄 ${s}`);
  assert.match(f123['만나는 곳'], /1936년 10월/);
  assert.match(f123['저작권'], /1945년에 세상을 떠나/);
  assert.ok(!/1948/.test(JSON.stringify(card('K123').facts)), '1948년 초판에는 없는 시');
  // 단풍나무 열매 — 날개 달린 열매 안에 씨 · 둘로 갈라져 날개 하나에 씨 하나 · 소용돌이가 받쳐 천천히 · 멀리 가는 것은 바람 · 햇볕·물·양분
  const m = body('K125');
  for (const s of ['열매인데, 얇은 날개', '안에 씨가 들어 있다', '날개 하나에 씨 하나', '소용돌이', '천천히 떨어진다', '바람이 열매를 옆으로 실어 날라', '햇볕, 물, 양분']) assert.ok(m.includes(s), `K125 ${s}`);
  assert.ok(!/떠오르|날아오르|\d+ ?m|\d+초/.test(m), 'K125 「위로 떠오른다」·숫자는 쓰지 않는다');
  assert.ok(!/씨앗/.test(card('K125').title), '날개 달린 것은 열매(시과)');
  // 「좁쌀 한 알」 — 좁쌀 → 쥐 → 고양이 → 말 → 소 → 정승 댁 · 개 단계·시신·수수께끼 없음 · 끝은 글에서 끊고 풀이에서
  const z = body('K129');
  const order = ['좁쌀 한 알을 맡기며', '쥐 한 마리를 잡아 주었다', '그 고양이를 받았다', '그 말을 받았다', '그 소를 받았다', '정승 댁에 팔아'].map((w) => z.indexOf(w)); // 한 글자(말·소)는 「말했다」·「소중한」에도 걸린다
  assert.ok(order.every((x, i) => x >= 0 && (!i || x > order[i - 1])), `K129 차례 ${order}`);
  assert.ok(!/강아지|(^|\s)개(가|를|와|는|에게)|시신|처녀|수수께끼|곱사/.test(kidText('K129')), 'K129 개 단계·「새끼 서 발」 장면 없음');
  assert.equal(lines('K129').at(-1), '젊은이가 정승 댁을 찾아갔을 때는, 정승 댁에서 이미 소를 잡은 뒤였다.');
  assert.ok(!/장가|사위|혼인/.test(z) && !/장가/.test(card('K129').title), '결말은 글·제목에 없다 — 이어질 내용 짐작');
  assert.match(card('K129').qs[2].evNote, /사위/);
  assert.match(Object.fromEntries(card('K129').facts)['원문'], /좁쌀 한 알로 장가든 총각/);
  assert.match(Object.fromEntries(card('K129').facts)['저작권'], /^지은이를 알 수 없는 옛이야기/);
  // 잠만보 — PokeAPI 한국어 도감 · 「무엇이든 먹는다」는 한국어 도감에 없다 · 진화 친밀도 숫자는 세대마다 달라 쓰지 않음
  const s = body('K130');
  for (const x of ['2.1m', '460kg', '노말 타입', '「졸음포켓몬」', '400kg', '다 먹으면 그대로 잠이 들어', '배 위를 놀이터로', '배탈이 나지 않는다']) assert.ok(s.includes(x), `K130 ${x}`);
  assert.ok(!/무엇이든 먹/.test(kidText('K130')));
  assert.ok(!/\d/.test(card('K130').qs[1].opts.find((o) => o.type === 'know').t), '진화 조건에 숫자 없이');
  // 포켓몬 타입 발표 — 꼬부기는 물 타입 · 스물넷 = 7 + 6 + 5 + 4 + 2
  const t = body('K121');
  assert.ok(t.includes('스물네 명') && t.includes('물 타입이 일곱 명') && t.includes('불꽃 타입이 여섯 명') && t.includes('전기 타입이 다섯 명') && t.includes('드래곤 타입은 네 명') && t.includes('풀 타입은 두 명'));
  assert.equal(7 + 6 + 5 + 4 + 2, 24);
  assert.ok(t.includes('물 타입을 고른 친구들은 꼬부기처럼'));
  assert.ok(body('K124').includes('물수리검'), '개굴닌자의 기술');
  for (const id of NEW) {
    assert.ok(!/동생|형이|형과|누나|언니|오빠/.test(kidText(id)), `${id} 형제를 지어내지 않음`);
    assert.ok(![...kidText(id)].some((ch) => (ch >= 'ㅤ' && ch <= '㆏') || (ch >= 'ᄀ' && ch <= 'ᇿ')), `${id} 옛 한글 글자 없음`);
  }
  assert.ok(!/인터넷에서/.test(body('K122')), '발표 사진은 직접 찍어 둔 것에서 고른다');
});

test('📦 하루 두 편 (v320 · Codex 126차 #3·#6): 묶음 b320 = 새 글 열둘 · 지금 배우는 단원부터 · 화면은 보이는 글만(도감·단원·낱말·퍼즐) · 📤 보고는 모든 글 · 시작은 목록을 부를 때(못 적었으면 다시 · 이 실행에서 처음 받은 날로) · 「📦 내일 새 글이 와요」·「🌱 새 글 · 제목」(셈 없이) · 앱 셸', () => {
  const b = DRIP.bundles.find((x) => x.key === 'b320');
  assert.deepEqual(b.order.slice().sort(), NEW.slice().sort(), '묶음 = 이번 글 열둘');
  assert.deepEqual(b.order.slice(0, 2), ['K121', 'K123'], '첫날 — 포켓몬 타입 발표 · 윤동주 동시(4단원·매체)');
  assert.deepEqual(b.order.slice(-2), ['K129', 'K130'], '마지막 날 — 6단원(12월) · 잠만보');
  const v = read('js/koreanview.js');
  assert.ok(v.includes("import { visibleCards, hasLocked, opensTomorrow, freshIds, needsStart, withFirst } from './kordrip.js';"));
  assert.ok(v.includes('ui.cards = ui.all ? visibleCards(ui.all, dripState(), todayKey(), readIds()) : null;'), '부를 때마다 오늘 날짜로 다시 거른다');
  // 시작 날 — 목록을 부를 때마다 없으면 적는다(저장이 안 됐으면 다음에 부를 때 다시) · 이 실행에서 처음 받은 날로 · 화면도 그 날로 센다 (126차 #3)
  assert.ok(v.includes('  if (ui.all) ensureDripStart();\n  ui.cards = '), '목록을 부를 때 시작 날');
  assert.ok(v.includes('if (dripSaving || !needsStart(korDripMap(), ids)) return;'));
  assert.ok(v.includes('if (!dripFirst) dripFirst = todayKey();') && v.includes('korDripStart(ids, dripFirst)'), '처음 받은 날로 적는다');
  assert.ok(v.includes('.finally(() => { dripSaving = null; })'), '실패해도 다음에 부를 때 다시');
  assert.ok(v.includes('const dripState = () => withFirst(korDripMap(), dripFirst);'));
  assert.ok(!/korDripMap\(\), todayKey\(\)/.test(v), '화면은 dripState로만 센다');
  // 「내일」은 내일 정말 열릴 때만 — 아니면 셈 없이 「차례로 열려요」 (Codex 127차 #4 · 규칙은 tests/kordrip322.test.js)
  assert.ok(v.includes('if (ui.all && hasLocked(ui.all, dripState(), todayKey(), readIds())) {\n    const soon = opensTomorrow(ui.all, dripState(), todayKey(), readIds());'));
  assert.ok(v.includes("head.appendChild(el('p', 'kor-drip', soon ? '📦 내일 새 글이 와요' : '📦 새 글이 차례로 열려요'));"));
  // 🌱 오늘 새로 열린 글 바로가기 — 제목만(셈 없이) · 여는 길은 도감 칸과 같다(⏳ guardStart) (126차 #6)
  assert.ok(v.includes('freshIds(dripState(), todayKey(), readIds())'));
  assert.ok(v.includes('  const fresh = freshEl(cards); // 🌱') && v.includes('  if (fresh) head.appendChild(fresh);'), '도감 머리에');
  assert.ok(v.includes("el('button', 'btn', `🌱 새 글 · ${c.title}`)"));
  assert.ok(v.includes("b.addEventListener('click', () => guardStart('korean', () => openCard(c.id)));\n    box.appendChild(b);"));
  assert.ok(/\.kor-fresh \{/.test(read('css/style.css')));
  assert.ok(!/남은 \d|\d+편 남/.test(v), '아이 화면에 셈 없이');
  for (const f of ['js/korreport.js', 'js/upload.js']) assert.ok(!read(f).includes('kordrip'), `${f} — 아빠 보고는 모든 글`);
  assert.ok(read('sw.js').includes("'./js/kordrip.js'"), '앱 셸');
  assert.ok(/\.kor-drip \{/.test(read('css/style.css')));
});

test('📦 시작 날 저장·병합 (v320 · Codex 126차 #4): 저장이 안 되면 없던 일 → 다시 적으면 된다 · 저장소 길로 한 번만 · 복사는 깊게 · 두 기기는 이른 날 · 깨진 값은 버림', async () => {
  const t = '2026-10-23';
  const ids = DATA.cards.map((c) => c.id);
  // 실패 경로를 진짜로 — 시작 날 없는 프로필에서 쓰기 하나를 막는다
  const stored = async () => dripOf(((await getProfile()) || {}).korDrip); // 아직 한 번도 안 썼으면 저장된 프로필이 없다
  assert.deepEqual(await stored(), {}, '아직 시작 전');
  fakeIdb.failNext('profile');
  const f = await korDripStart(ids, t);
  assert.deepEqual([f.ok, f.why], [false, 'save']);
  assert.equal(fakeIdb.failsLeft(), 0, '막은 쓰기는 이 시작 날 쓰기');
  assert.deepEqual(korDripMap(), {}, '메모리 프로필에도 없다');
  assert.deepEqual(await stored(), {}, '저장소에도 없다');
  const r = await korDripStart(ids, t); // 다시 — 이번엔 적힌다
  assert.equal(r.ok, true);
  assert.deepEqual((await getProfile()).korDrip, { b320: t, b322: t }, 'v322 — 셋째 묶음도 처음 받은 날을 적는다(열리는 날은 b320 다음 날부터 — kordrip322)');
  assert.deepEqual(korDripMap(), { b320: t, b322: t }, '메모리 프로필도 같이');
  assert.equal((await korDripStart(ids, '2026-10-25')).why, 'same', '다시 열어도 그대로');
  assert.deepEqual((await getProfile()).korDrip, { b320: t, b322: t });
  const p = cloneProfile({ korDrip: { b320: t, zz: 1 } });
  assert.deepEqual(p.korDrip, { b320: t }, '모르는 묶음은 버림');
  const m = mergeStatRecord('profile', { id: 'me', updatedAt: 20, korDrip: { b320: '2026-10-25' } }, { id: 'me', updatedAt: 10, korDrip: { b320: '2026-10-23' } });
  assert.deepEqual(m.korDrip, { b320: '2026-10-23' }, '옛 쪽이 이르면 옛 쪽 — 이미 열린 글이 다시 잠기지 않게');
  const n = mergeStatRecord('profile', { id: 'me', updatedAt: 20, korDrip: 'x' }, { id: 'me', updatedAt: 10 });
  assert.ok(!('korDrip' in n));
  assert.equal(fakeIdb.failsLeft(), 0, '남은 실패 예약 없음');
});
