// 📝 국어 원고 손질 (v326, 2026-10-23 — Codex 129차가 찾음 → 검수 페이지 PoPzRNPCPQvQf1xzMtqA7S → 아버님 "이대로") — node --test tests/korapart326.test.js
//  ① 🔤 📖 글에서 만난 낱말: 뜻이 같은 짝·넓은 말 좁은 말은 한 문제에 같이 안 낸다(words.json apart → 📖 낱말 avoid)
//  ② 🖊️ 독서 논술: 양쪽 이유로 읽히던 문장 넷을 이야기 줄 근거로 한쪽으로만 읽히게(N35·N38·N41·N36)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { allWords, apartMap, checkWords, makeQuestion } from '../js/korwords.js';
import { validCards } from '../js/korean.js';
import { allTopics } from '../js/nonsul.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const json = (f) => JSON.parse(read(f));
const WORDS = json('coach/korean/words.json');
const CARDS = validCards(json('coach/korean/reading.json'));
const ALL = allWords(WORDS, CARDS); // 🔤 오늘의 낱말이 보기를 뽑는 바로 그 목록(kortabs S.all)
const PASSAGE = ALL.filter((w) => w.deck === 'passage');
const byId = new Map(ALL.map((w) => [w.id, w]));
const seeded = (s) => { let x = (s * 2654435761) >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };

test('📖 같이 안 낼 무리: 원고에 53무리(검수 45 + Codex 130차 7 + v347 늪·물웅덩이 1) · 검수한 짝이 들어 있다 · 무리 낱말은 모두 글에서 만난 낱말 · 원고 검사 통과', () => {
  assert.equal(WORDS.apart.length, 53); // v347 늪(K10)·물웅덩이(K150) 더함
  assert.deepEqual(checkWords(WORDS, CARDS), []);
  const has = (...ws) => WORDS.apart.some((g) => ws.every((w) => g.includes(w)));
  for (const g of [['횡단보도', '건널목'], ['표지판', '안내판', '게시판'], ['치어다보며', '우러러'], ['벼슬아치', '관리'], ['관찰한', '들여다볼', '들여다보다', '눈여겨본'],
    ['제안', '제안한다', '건의'], ['공평하니까요', '균형'], ['갤러리', '전시실'], ['도구', '물뿌리개', '주사위'], ['벼슬', '판서', '관찰사', '군수', '정승', '승상'], ['알림', '알림 글']]) {
    assert.ok(has(...g), g.join('·'));
  }
  const pw = new Set(PASSAGE.map((w) => w.w));
  for (const w of WORDS.apart.flat()) assert.ok(pw.has(w), w);
});

test('📖 apartMap: 한 낱말이 여러 무리에 있으면 모두 합친다 · 깨진 무리는 건너뛴다 · allWords가 📖 낱말 avoid로 붙인다', () => {
  assert.deepEqual(apartMap([['가', '나'], ['나', '다'], ['가']]), { 가: ['나'], 나: ['가', '다'], 다: ['나'] });
  assert.deepEqual(apartMap([['가', '가', '나'], 'x', null, ['', 3, '라', '마']]), { 가: ['나'], 나: ['가'], 라: ['마'], 마: ['라'] });
  assert.deepEqual(apartMap(undefined), {});
  const of = (w) => PASSAGE.filter((x) => x.w === w);
  for (const x of of('건널목')) assert.deepEqual(x.avoid, ['횡단보도']);
  for (const x of of('조사')) assert.deepEqual([...x.avoid].sort(), ['검색', '관찰한', '눈여겨본', '들여다보다', '들여다볼'].sort(), '두 무리를 합친다');
  for (const x of of('관리')) assert.deepEqual([...x.avoid].sort(), ['관찰사', '군수', '벼슬', '벼슬아치', '승상', '정승', '판서'].sort());
  for (const x of of('사서')) assert.deepEqual(x.avoid, ['도우미'], '같은 낱말은 어느 글에서 왔든');
  assert.ok(of('사서').length >= 2);
  for (const x of of('바통')) assert.deepEqual(x.avoid, [], '무리에 없는 낱말은 그대로');
  // 📘·🗣️·🐢·🀄은 원고의 avoid 그대로
  const c = ALL.find((w) => w.deck === 'concept' && w.w === '비유');
  if (c) assert.deepEqual(c.avoid, WORDS.words.find((x) => x.w === '비유').avoid || []);
});

test('🔤 전수: 모든 📖 낱말의 뜻 고르기에서 같은 무리 낱말이 한 번도 같이 안 나온다 (묻는 낱말 + 보기 셋)', () => {
  const groups = WORDS.apart.map((g) => new Set(g));
  let made = 0;
  for (const w of PASSAGE) {
    for (let s = 1; s <= 24; s++) {
      const q = makeQuestion(w, 'mean', ALL, seeded(s * 7919 + PASSAGE.indexOf(w)));
      assert.ok(q, `${w.id} · 씨앗 ${s}: 문제를 못 만듦`);
      made++;
      const ws = q.opts.map((o) => byId.get(o.id).w);
      assert.equal(ws.length, 4);
      assert.equal(new Set(ws).size, 4, `${w.id}: 다른 글의 같은 낱말이 보기에 둘 (${ws.join(' · ')})`);
      for (const g of groups) assert.ok(ws.filter((x) => g.has(x)).length <= 1, `${w.id}: ${ws.join(' · ')}`);
      assert.equal(new Set(q.opts.map((o) => o.t)).size, 4, `${w.id} 보기 뜻이 겹침`);
    }
  }
  assert.equal(made, PASSAGE.length * 24);
  // 무리가 없으면 실제로 같이 나온다 — 이 시험이 잡을 수 있는 일인지 (건널목 문제에 횡단보도 뜻)
  const bare = allWords({ ...WORDS, apart: [] }, CARDS);
  const g = bare.find((x) => x.w === '건널목');
  let together = 0;
  for (let s = 1; s <= 3000 && !together; s++) { const q = makeQuestion(g, 'mean', bare, seeded(s)); if (q && q.opts.some((o) => o.t === bare.find((x) => x.w === '횡단보도').mean)) together++; }
  assert.ok(together, '무리가 없으면 건널목·횡단보도가 같이 나오던 일');
});

test('🔤 고정 짝(원고 apart를 읽지 않음 — Codex 130차 #3): 검수한 같은 뜻 짝과 Codex가 찾은 일곱이 어느 쪽을 물어도 한 문제에 같이 안 나온다', () => {
  // 원고 목록을 정답으로 쓰면 빠진 짝을 못 잡는다 — 사람이 뜻을 읽고 고른 짝을 여기에 따로 둔다
  const FIXED = [
    ['횡단보도', '건널목'], ['표지판', '안내판'], ['안내판', '게시판'], ['치어다보며', '우러러'], ['벼슬아치', '관리'], ['관찰한', '들여다보다'],
    ['견준', '비교하기'], ['제안', '건의'], ['공평하니까요', '균형'], ['갤러리', '전시실'], ['머뭇거린', '망설이지'], ['인재', '인걸'],
    ['파트너', '짝꿍'], ['권합니다', '권고'], ['개천', '내'], ['승상', '정승'], ['도구', '물뿌리개'],
    // Codex 130차 #1·#2 — seed 111에서 우지진다·우는, seed 1에서 도구와 여섯이 실제로 같이 나왔다
    ['우지진다', '우는'], ['도구', '송곳'], ['도구', '맷돌'], ['도구', '베틀'], ['도구', '활대'], ['도구', '달고대'], ['도구', '담뱃대'],
  ];
  for (const [a, b] of FIXED) {
    for (const asked of [a, b]) {
      const ws = PASSAGE.filter((x) => x.w === asked);
      assert.ok(ws.length, asked);
      for (const w of ws) {
        for (let s = 1; s <= 400; s++) {
          const q = makeQuestion(w, 'mean', ALL, seeded(s));
          const got = q.opts.map((o) => byId.get(o.id).w);
          assert.ok(!(got.includes(a) && got.includes(b)), `「${asked}」 씨앗 ${s}: ${got.join(' · ')}`);
        }
      }
    }
  }
});

test('🔤 원고 검사: apart의 오타·한 낱말 무리·같은 낱말 두 번·배열 아님을 잡는다', () => {
  const bad = (apart, re) => { const errs = checkWords({ ...WORDS, apart }, CARDS); assert.ok(errs.some((e) => re.test(e)), `${re} — ${errs.join(' / ')}`); };
  bad([['횡단보도', '건넣목']], /"건넣목"가 📖 글에서 만난 낱말에 없어요/);
  bad([['횡단보도']], /apart\[0\]: 낱말 둘 이상/);
  bad([['횡단보도', '횡단보도']], /같은 낱말 두 번/);
  bad({ 횡단보도: '건널목' }, /apart는 무리 배열/);
  bad([['횡단보도', 3]], /apart\[0\]: 낱말 둘 이상/);
  assert.deepEqual(checkWords({ about: WORDS.about, words: WORDS.words }, CARDS), [], 'apart가 없어도 된다');
});

test('🖊️ 독서 논술 네 문장: 한쪽으로만 읽히게 고침 · 근거 줄이 그 이야기에 있다 · 옛 문장은 없다', () => {
  const topics = allTopics(json('coach/korean/nonsul.json'));
  const T = (id) => topics.find((t) => t.id === id);
  const line = (cardId, n) => { const c = CARDS.find((x) => x.id === cardId); return (c.lines || c.stanzas.flat())[n - 1]; };
  const n35 = T('N35');
  assert.equal(n35.no.reasons[2], '우리 반은 이어달리기에서 1등을 하지 못했어요.');
  assert.deepEqual(n35.no.ev[2], [10, 13]);
  assert.match(line(n35.card, 10), /2등/);
  assert.match(line(n35.card, 13), /1등을 하지 못했는데도/);
  const n38 = T('N38');
  assert.equal(n38.yes.reasons[2], '벌을 주면서도 해마다 하루는 만나게 해 주었어요.');
  assert.deepEqual(n38.yes.ev[2], [8]);
  assert.match(line(n38.card, 8), /단 하루만/);
  const n41 = T('N41');
  assert.equal(n41.off[0].t, '양반은 책 읽기를 좋아했어요.');
  assert.deepEqual(n41.off[0].ev, [1]);
  assert.match(line(n41.card, 1), /책 읽기를 좋아하는/);
  const n36 = T('N36');
  assert.equal(n36.off[0].t, '제비가 박씨 하나를 물어다 흥부 앞에 떨어뜨렸어요.');
  assert.deepEqual(n36.off[0].ev, [5]);
  assert.match(line(n36.card, 5), /박씨 하나를 물어다 흥부 앞에 떨어뜨렸다/);
  const raw = read('coach/korean/nonsul.json');
  for (const old of ['2등을 했어요.', '일 년에 하루는 만날 수 있게', '빚은 천 석이나', '쌀과 돈, 비단이 쏟아져 나왔어요.']) assert.ok(!raw.includes(old), old);
});
