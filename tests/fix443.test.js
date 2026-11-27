// 🔧 v443 (2026-11-27 · 11-26 앱 점검 묶음 ① — 아버님 「묶음 ①부터 시작해」): 틀리게 채점·설명하는 것 넷 + 조용히 잃거나 멈추는 것 — 되도록 진짜 동작을 돌려 본다
//  · 🔢 분수 「왜」 두 문항(맞는 까닭인 역수 보기를 오답으로 채점) · 📚 국어 근거(글자가 같은 줄) · 📖 단어 패널 어간(scares → scar) ·
//    ✍️ 에세이 관사(an NBA · an x-ray · a European · 글자 이름 A) · 📬 수학 사다리가 답장 받기를 기다림 · 🚀 국어·논술 로켓단 이어 가기 · 🧊 음식 버리기
//  · 🔌 저장소 다시 열기는 tests/dbreopen443.test.js (모듈의 연결 하나를 처음부터 써야 해서 따로)
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeQuestion, conceptById, tplKey, fixNumJosa } from '../js/mathgen.js';
import { lineCount, lineText } from '../js/korean.js';
import { stemWord, createVocab } from '../js/vocab.js';
import { correct, NOT_TYPO } from '../js/essay.js';
import { CAP, foodById, foodTray, foodOwned } from '../js/food.js';
import { FRIDGE_ID, houseOf, houseStartRule, houseBuyRule, placeRule, foodBuyCheck, foodBuyRule, fridgePutRule, fridgeTakeRule, foodDropRule } from '../js/house.js';
import { emptyProfile, cloneProfile, getMath, updateMath } from '../js/db.js';
import { addAsk, applyReply, unreadAsks } from '../js/mathask.js';
import { initProfile, flushProfile, reloadProfile, houseDo, getProfileSnapshot } from '../js/xp.js';

void fakeIdb;
const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
/** 함수 몸통 (다음 최상위 function·export까지) — 주석 줄은 지운다(호출을 주석으로 막아도 글자는 남는다) */
const body = (s, name) => {
  const i = s.indexOf(`function ${name}(`);
  assert.ok(i >= 0, `${name} 없음`);
  const ends = ['\nfunction ', '\nasync function ', '\nexport ', '\n/**'].map((t) => s.indexOf(t, i + 10)).filter((x) => x > 0);
  return s.slice(i, ends.length ? Math.min(...ends) : undefined).split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
};

// ───────────── 🔢 분수 「왜」 ─────────────

test('🔢 분수 「왜」 두 문항 — 「곱하면 1이라서」(역수 · 맞는 까닭)가 오답 보기로 나오지 않는다 · 물음·정답·열쇠는 그대로(🤔 노트 유지) · 원고와 예비가 같은 글', () => {
  const content = JSON.parse(src('coach/math/fraction.json'));
  const two = [
    ['frac.divnat', '÷ 4 와 × 1/4 는 왜 같은가요?', '넷으로 나누는 것과 1/4만큼 가져오는 것이 같은 뜻이라서', '1/4이 4보다 작은 수라서'],
    ['frac.div', '÷ 2/3 를 × 3/2 로 바꾸는 이유는?', '2/3씩 몇 묶음인지 세는 것과 3/2배 하는 것이 같아서', '3/2이 2/3보다 큰 수라서'],
    // 「분자를 못 나눠서」도 같은 칸 이야기·다른 문항 정답이 드는 (얕은) 까닭이었다 → 이 칸 ① 계산의 오개념 「분모에 더함」으로 (리뷰 워크플로 · 아버님 「분모에 4를 더해서로 바꿔」)
    ['frac.divnat', '2/3 ÷ 4 에서 분모가 커지는 이유는?', '조각을 넷으로 더 잘게 쪼갠 것이라서', '분모에 4를 더해서'],
  ];
  for (const [id, q, ok, fresh] of two) {
    for (const [name, opts] of [['원고', { content }], ['예비', {}]]) {
      let seen = 0;
      for (let s = 1; s <= 400; s++) {
        const x = makeQuestion(id, 'why', s, opts);
        assert.ok(x && x.choices.length === 4, `${id} ${name} ${s}`);
        for (const c of x.choices) assert.ok(!/곱하면 1/.test(c.text), `${id} ${name} ${s}: 맞는 까닭이 보기에 — ${c.text}`);
        if (x.q !== q) continue;
        seen += 1;
        assert.equal(x.choices.find((c) => c.ok).text, ok, '정답은 그대로');
        assert.equal(x.key, tplKey(q), '열쇠는 물음 글 — 오답 글을 바꿔도 그대로');
        assert.equal(new Set(x.choices.map((c) => c.text)).size, 4, '겹친 보기 없음');
        assert.ok(x.choices.some((c) => !c.ok && c.text === fresh), `바꾼 보기 — ${fresh}`);
      }
      assert.ok(seen >= 40, `${id} ${name}: 그 문항이 ${seen}번 나옴`);
    }
    const w = content[id].why.find((x) => x.q === q);
    const b = conceptById(id).why.find((x) => x.q === q);
    assert.ok(w && b, `${id} 그 문항이 원고·예비 둘 다에`);
    assert.deepEqual(w.no, b.no, '원고와 예비가 같은 보기');
    assert.equal(w.ok, b.ok);
    assert.equal(fixNumJosa(fresh), fresh, '그릴 때 조사가 바뀌지 않는 글');
    // 정답이 가장 짧은 보기가 되지 않게(찍기 단서를 더 만들지 않는다) — 새 보기는 정답보다 짧다
    assert.ok(fresh.length < ok.length);
  }
  // 분수 줄기 「왜」 어디에도 그 꼴이 없다 (원고 전체)
  for (const [id, v] of Object.entries(content)) for (const w of (v && v.why) || []) for (const t of w.no) assert.ok(!/곱하면 1이라서|못 나눠/.test(t), `${id}: ${t}`);
  for (const w of conceptById('frac.divnat').why) for (const t of w.no) assert.ok(!/못 나눠/.test(t), `예비: ${t}`);
  // 이야기 글은 그 까닭을 그대로 든다 — 그래서 보기로 내면 잘 읽은 아이가 고른다
  assert.match(content['frac.div'].story.text, /1\/6이 6개면 1이니까/);
});

// ───────────── 📚 국어 근거 ─────────────

test('📚 국어 근거 줄 — 글자가 같은 줄은 함께 근거로 받는다(모든 글) · K151-3 「쏘옥, 쏙, 쏙」은 3연 줄도', () => {
  const DATA = JSON.parse(src('coach/korean/reading.json'));
  // 산문에서 같은 문장이 한 자리에서만 근거인 물음이 생기면 여기에 물음 id를 적는다(지금은 없음 — 원고를 고칠지 먼저 본다)
  const EXCEPT = new Set();
  let dupCards = 0;
  let checked = 0;
  for (const card of DATA.cards) {
    const n = lineCount(card);
    const text = (i) => String(lineText(card, i)).trim();
    const all = Array.from({ length: n }, (_, i) => text(i + 1));
    if (new Set(all).size < n) dupCards += 1;
    for (const q of card.qs || []) {
      if (!Array.isArray(q.ev) || EXCEPT.has(q.id)) continue;
      for (const e of q.ev) {
        for (let m = 1; m <= n; m++) {
          if (m === e || all[m - 1] !== all[e - 1]) continue;
          checked += 1;
          assert.ok(q.ev.includes(m), `${q.id}: ${e}번 줄과 글자가 같은 ${m}번 줄(「${all[m - 1]}」)도 근거에 — 같은 말을 눌렀는데 틀림이 된다`);
        }
      }
    }
  }
  assert.ok(dupCards >= 10, `글자가 같은 줄이 있는 글 ${dupCards}편`);
  assert.ok(checked >= 8, `대조한 쌍 ${checked}`);
  const k = DATA.cards.find((c) => c.id === 'K151');
  const q3 = k.qs.find((x) => x.id === 'K151-3');
  assert.deepEqual(q3.ev, [1, 2, 4, 5, 7, 8, 10, 11]);
  assert.deepEqual([1, 2, 4, 5].map((n) => lineText(k, n)), [7, 8, 10, 11].map((n) => lineText(k, n)), '1연과 3연의 네 줄은 글자가 같다');
  // 물음·보기·정답은 그대로 · 근거가 아닌 줄(③ 엄마 내다보려 · ⑥ 햇빛 · ⑨ · ⑫)은 여전히 근거가 아니다
  assert.equal(q3.q, '「쏘옥, 쏙, 쏙」은 무엇을 흉내 낸 말인가요?');
  for (const n of [3, 6, 9, 12]) assert.ok(!q3.ev.includes(n), `${n}번 줄`);
  const CIRC = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫';
  const noteNums = [...q3.evNote].map((ch) => CIRC.indexOf(ch) + 1).filter((x) => x > 0);
  for (const n of noteNums) assert.ok(q3.ev.includes(n), `풀이의 ${n}번은 근거 줄`);
  assert.ok([7, 8, 10, 11].every((n) => noteNums.includes(n)), '풀이가 3연 줄도 말한다');
  // K216-2 「그렇게(「같이」를 써서) 빗대어 쓴 줄을 하나」 — 글자는 달라도 「…같이」 줄은 모두 맞는 근거다 (리뷰 워크플로 · 예전엔 ①만 받아 ②·⑤·⑥은 틀림)
  const k216 = DATA.cards.find((c) => c.id === 'K216');
  const q2 = k216.qs.find((x) => x.id === 'K216-2');
  const like = Array.from({ length: lineCount(k216) }, (_, i) => i + 1).filter((n) => /같이$/.test(String(lineText(k216, n)).trim()));
  assert.deepEqual(like, [1, 2, 5, 6]);
  assert.deepEqual(q2.ev, like);
  assert.equal(q2.evQ, '그렇게 빗대어 쓴 줄을 하나 눌러 보세요.');
  const nums2 = [...q2.evNote].map((ch) => CIRC.indexOf(ch) + 1).filter((x) => x > 0);
  for (const n of nums2) assert.ok(q2.ev.includes(n), `K216-2 풀이의 ${n}번은 근거 줄`);
  assert.ok([2, 5, 6].every((n) => nums2.includes(n)), '풀이가 다른 「같이」 줄도 말한다');
});

// ───────────── 📖 단어 패널 어간 ─────────────

test('📖 어간 찾기 — 꼬리를 덜 뗀 꼴 먼저: scares → scare(scar 아님) · hates → hate · hoping → hope · cared → care · 겹자음·기초 꼴은 그대로', () => {
  const known = new Set(['scar', 'scare', 'hop', 'hope', 'hat', 'hate', 'car', 'care', 'star', 'stare', 'be', 'bee', 'see', 'tub', 'tube', 'not', 'note', 'to', 'toe',
    'us', 'use', 'box', 'potato', 'play', 'stop', 'run', 'solve', 'love', 'want', 'go', 'do', 'bit', 'bite', 'pin', 'pine', 'visit', 'open', 'show', 'fix', 'eat', 'baby', 'try', 'die',
    'suit', 'suite', 'ow', 'owe']);
  const want = {
    // -es: s만 뗀 꼴 먼저
    scares: 'scare', hates: 'hate', hopes: 'hope', cares: 'care', stares: 'stare', tubes: 'tube', notes: 'note', toes: 'toe', bees: 'bee', uses: 'use', bites: 'bite',
    boxes: 'box', potatoes: 'potato', goes: 'go', does: 'do', babies: 'baby', tries: 'try', dies: 'die',
    // -ed: d만 뗀 꼴 먼저
    scared: 'scare', hated: 'hate', hoped: 'hope', cared: 'care', stared: 'stare', used: 'use', loved: 'love', solved: 'solve',
    played: 'play', wanted: 'want', hopped: 'hop', starred: 'star', scarred: 'scar', stopped: 'stop', tried: 'try', died: 'die',
    // -ing: 짧은 꼴이 자음+모음+자음으로 끝나면 e 붙인 꼴 먼저
    scaring: 'scare', hating: 'hate', hoping: 'hope', caring: 'care', staring: 'stare', tubing: 'tube', biting: 'bite', using: 'use', solving: 'solve', loving: 'love',
    hopping: 'hop', starring: 'star', scarring: 'scar', running: 'run', stopping: 'stop',
    being: 'be', seeing: 'see', going: 'go', doing: 'do', playing: 'play', visiting: 'visit', opening: 'open', showing: 'show', fixing: 'fix', eating: 'eat', boxing: 'box',
    // 모음 둘 + 자음(suit)은 e를 떼고 -ing를 붙인 꼴이 아니다 — 짧은 꼴 먼저 · 모음 + 자음뿐인 짧은 꼴(ow)은 e 붙인 꼴 먼저
    suiting: 'suit', owing: 'owe',
  };
  for (const [w, base] of Object.entries(want)) assert.equal(stemWord(w, known), base, w);
  // 덜 뗀 꼴이 사전에 없으면 예전처럼 짧은 꼴로
  const small = new Set(['scar', 'hop', 'car']);
  assert.equal(stemWord('scars', small), 'scar');
  assert.equal(stemWord('hopped', small), 'hop');
  assert.equal(stemWord('cars', small), 'car');
  assert.equal(stemWord('scares', small), 'scar', '사전에 scare가 없으면 달리 알 길이 없다(자료 쪽 stem_clash가 본다)');
});

test('📖 진짜 단어장으로 — 「That scares me.」에 흉터(scar)·「He hates it.」에 모자(hat)·「I was hoping」에 hop이 뜨지 않는다 · 예전에 고정한 꼴은 그대로', () => {
  const read = (f) => JSON.parse(src(`vocab/${f}`));
  const vocab = createVocab({ basic: read('basic.json'), words: read('words.json'), phrases: read('phrases.json') });
  const terms = (t) => vocab.lookup(t).filter((x) => x.kind === 'word').map((x) => x.term);
  // [문장, 그 낱말, 예전에 걸리던 낱말, 바른 기본형, 패널에 뜨는가(기초 낱말이면 안 뜬다)]
  for (const [text, word, bad, good, shown] of [
    ['That scares me.', 'scares', 'scar', 'scare', true], ['He hates it.', 'hates', 'hat', 'hate', false], ['I was hoping for more.', 'hoping', 'hop', 'hope', false],
    ['She cared a lot.', 'cared', 'car', 'care', true], ['Stop staring.', 'staring', 'star', 'stare', true], ['We went tubing.', 'tubing', 'tub', 'tube', true],
    ['He took notes.', 'notes', 'not', 'note', true], ['My toes hurt.', 'toes', 'to', 'toe', true], ['It bites.', 'bites', 'bit', 'bite', true],
  ]) {
    assert.ok(vocab.known.has(bad) && vocab.known.has(good), `단어장에 ${bad}·${good} 둘 다 있어야 이 시험이 뜻이 있다`);
    assert.equal(stemWord(word, vocab.known), good, word);
    const got = terms(text);
    assert.ok(!got.includes(bad), `${text} → ${bad}가 뜨면 안 된다 (${got.join(',')})`);
    assert.equal(got.includes(good), shown, `${text} → ${good} ${shown ? '뜻이 뜬다(예전엔 가려지거나 다른 낱말)' : '기초 낱말이라 안 뜬다'} (${got.join(',')})`);
  }
  for (const [w, base] of [['solved', 'solve'], ['solving', 'solve'], ['batteries', 'battery'], ['hopping', 'hop'], ['married', 'married'], ['puppies', 'puppy'], ['younger', 'young'], ['quickest', 'quick'], ['being', 'being'], ['xyzzy', 'xyzzy']]) {
    const got = stemWord(w, vocab.known);
    if (w === 'being') assert.ok(got === 'being' || got === 'be', `being → ${got}`); else assert.equal(got, base, w);
  }
  // 이미 쌓인 옛 기록(낱말 scar + 문장 「…scares…」)은 그 문장에서 자리를 못 찾을 뿐 멎지 않는다 — 🔊 그 낱말만 듣기는 없는 자리로
  assert.equal(vocab.findRange('Nothing scares an echidna warrior.', 'scar', 'word'), null);
  assert.deepEqual(vocab.findRange('Nothing scares an echidna warrior.', 'scare', 'word'), [1, 1]);
});

// ───────────── ✍️ 에세이 관사 ─────────────

test('✍️ a / an — 글자 이름으로 읽는 말(약어·한 글자·숫자 섞임)과 eu-·ew-·x- 앞의 맞는 관사를 바꾸지 않는다 · 글자 이름 A는 관사가 아니다', () => {
  const run = (w, keep = 'I saw') => correct(keep, w);
  const articleNote = (r) => r.notes.some((n) => /소리로 시작하는 말 앞에는/.test(n.why));
  // 맞게 쓴 글 — 그대로
  for (const p of ['an NBA player', 'an MVP', 'an LED light', 'an X item', 'an S rank', 'an x-ray', 'an Xbox', 'an N64', 'an M4A1', 'an SOS', 'an FBI agent', 'an RPG', 'an MRI', 'an F', 'an M&M',
    'an mvp', 'an npc', 'an rpg', 'a European city', 'a ewe', 'a euro', 'a NASA team', 'a TV', 'a T-shirt', 'an e-mail', 'an E rank', 'an A4 paper']) {
    const r = run(`${p} today.`);
    assert.ok(r.fixed.includes(p), `${p} → ${r.fixed}`);
    assert.ok(!articleNote(r), `${p}: 관사 설명이 붙으면 안 된다`);
  }
  // 글자 이름 A — 문장 가운데 대문자 A는 관사로 보지 않는다(예전엔 「an A on the test」 → 「An on the test」)
  //   · 틀이 관사에서 끝나고 아이가 「A on the test」를 쓴 경우도(Codex 252차 #1 — 「I got An on the test.」가 됐다)
  //   · 글자 이름 A 바로 뒤의 관사 a는 겹친 말이 아니다(리뷰 워크플로 — 「an A a week ago」가 「an a week ago」가 됐다)
  for (const [keep, w, part] of [['I want to get', 'an A on the test.', 'an A on the test'], ['I am in', 'team A and it is fun.', 'team A and'], ['I think', 'vitamin A is good.', 'vitamin A is'],
    ['I got an', 'A on the test.', 'an A on the test'], ['I want a', 'A in math.', 'a A in math'], ['I got', 'an A a week ago.', 'an A a week ago'], ['I eat', 'vitamin A a day.', 'vitamin A a day'],
    ['I am in', 'team A a lot of the time.', 'team A a lot']]) {
    const r = correct(keep, w);
    assert.ok(r.fixed.includes(part), `${w} → ${r.fixed}`);
    assert.deepEqual(r.notes, [], `${w}: 고친 것 없음`);
  }
  // 모르면 그대로 — 모두 대문자로 쓴 낱말은 약어인지 알 수 없다
  assert.ok(run('a APPLE today.').fixed.includes('a APPLE'));
});

test('✍️ a / an — 진짜 틀린 글은 예전처럼 고친다 · 아이가 쓴 첫 낱말·문장 첫 낱말의 대문자 A는 관사 · 그대로 두던 것(u·h·y·one)은 그대로', () => {
  const fixed = (w, keep = 'I want') => correct(keep, w).fixed;
  for (const [w, part] of [['a apple today.', 'an apple'], ['an bike today.', 'a bike'], ['a orange today.', 'an orange'], ['a onion today.', 'an onion'], ['an dog today.', 'a dog'], ['a egg today.', 'an egg'],
    ['a ice cream today.', 'an ice cream'], ['an big dog today.', 'a big dog'], ['a hour today.', 'an hour'], ['a Eevee today.', 'an Eevee'], ['a Onix today.', 'an Onix'], ['an Pikachu today.', 'a Pikachu'],
    ['an xylophone today.', 'an xylophone'], ['a elephant and a ant.', 'an elephant and an ant'], ['a e-mail today.', 'an e-mail'], ['a A on the test.', 'an A on the test'], ['a A plus today.', 'an A plus']]) {
    assert.ok(fixed(w).includes(part), `${w} → ${fixed(w)}`);
  }
  assert.ok(fixed('A apple today.').includes('An apple'), '아이가 쓴 첫 낱말');
  assert.equal(correct('', 'A apple is red').fixed, 'An apple is red.', '문장 첫 낱말');
  assert.ok(correct('I am happy.', 'I saw it. A apple fell.').fixed.includes('it. An apple fell'), '앞 문장이 끝난 뒤');
  for (const p of ['a useful toy', 'a UFO', 'an HP potion', 'a one-dollar toy', 'an hour', 'a unicorn', 'a year', 'an 8']) assert.ok(fixed(`${p} today.`).includes(p), `${p} → ${fixed(`${p} today.`)}`);
  // 같은 단어 두 번 — 겹쳐 친 같은 관사는 하나로, 그 뒤 낱말에 맞게(예전엔 자음 낱말 앞에서 「a a dog」 → 「an a dog」 + 틀린 설명 — 리뷰 워크플로)
  for (const [w, part] of [['a a apple today.', 'an apple'], ['an an apple today.', 'an apple'], ['a an apple today.', 'an apple'], ['a a dog today.', 'a dog'], ['an an dog today.', 'a dog'],
    ['a a a dog today.', 'a dog'], ['A a dog today.', 'a dog']]) {
    assert.ok(fixed(w).includes(`I want ${part} today.`), `${w} → ${fixed(w)}`);
  }
  assert.ok(!correct('I want', 'a a dog today.').notes.some((n) => /모음 소리/.test(n.why)), '「a a dog」에 모음 소리 설명이 붙지 않는다');
  assert.equal(correct('I saw the the dog and', 'a a cat.').fixed, 'I saw the the dog and a cat.', '틀(앞 글)은 건드리지 않는다');
  // 서로 다른 관사가 맞붙은 글(an a)은 지우지 않는다 — 소문자로 쓴 글자 이름과 가를 수 없다
  for (const p of ['an a today.', 'an a plus today.']) assert.ok(correct('I got', p).fixed.includes(p), `${p} → ${correct('I got', p).fixed}`);
});

test('✍️ 철자 — 단어장에 없는 진짜 낱말을 붙은 두 글자 바꾸기로 다른 낱말로 고치지 않는다(potion → option · trial → trail · cures → curse) · 드문 낱말·흔한 실수는 예전처럼 고친다', () => {
  const read = (f) => JSON.parse(src(`vocab/${f}`));
  const known = createVocab({ basic: read('basic.json'), words: read('words.json'), phrases: read('phrases.json') }).known;
  const spell = (w, keep = 'I used') => correct(keep, `${w} today.`, { known });
  const fixedTo = (w) => { const n = spell(w).notes.find((x) => x.why === '철자를 고쳤어요'); return n ? n.to : null; };
  // 맞게 쓴 낱말 — 그대로 (바뀌던 짝이 단어장에 있어야 이 시험이 뜻이 있다)
  for (const [w, was] of [['potion', 'option'], ['trial', 'trail'], ['angle', 'angel'], ['cures', 'curse'], ['unite', 'untie'], ['crave', 'carve'], ['cane', 'acne'], ['veil', 'evil'],
    ['arise', 'raise'], ['amid', 'maid'], ['theatre', 'theater'], ['apologise', 'apologies'], ['latitude', 'altitude'], ['rouge', 'rogue'], ['brian', 'brain'], ['gary', 'gray'], ['marnie', 'marine']]) {
    assert.ok(known.has(was) && !known.has(w), `${w}: 단어장에 ${was}만 있어야`);
    assert.equal(fixedTo(w), null, `${w} → ${fixedTo(w)}`);
    assert.ok(spell(w).fixed.includes(` ${w} today.`));
  }
  assert.equal(correct('I used', 'a potion on my Pikachu.', { known }).fixed, 'I used a potion on my Pikachu.');
  // 바뀐 꼴은 목록이 아니라 지금 단어장(기본형만)·변화형 판정 덕에 그대로 — 단어장이 늘어도 이 기대를 지키게 묶어 둔다 (Codex 254차)
  for (const w of ['trials', 'angles', 'potions', 'cured', 'curing', 'craved', 'united', 'canes', 'veils']) assert.equal(fixedTo(w), null, `${w} → ${fixedTo(w)}`);
  assert.equal(correct('I used', 'an HP potion on my Pikachu.', { known }).fixed, 'I used an HP potion on my Pikachu.');
  // 그 낱말이 드물어 아이 글에선 바꿔 쓴 실수일 가능성이 큰 것 · 흔한 바꿔 쓰기 실수는 예전처럼 고친다
  for (const [w, to] of [['dose', 'does'], ['alter', 'later'], ['prefect', 'perfect'], ['barley', 'barely'], ['sliver', 'silver'], ['jsut', 'just'], ['waht', 'what'], ['konw', 'know'],
    ['frist', 'first'], ['thier', 'their'], ['wierd', 'weird'], ['recieve', 'receive'], ['freind', 'friend'], ['hadn', 'hand'], ['tron', 'torn'], ['popo', 'poop']]) {
    assert.equal(fixedTo(w), to, `${w} → ${fixedTo(w)}`);
  }
  // 지키는 목록은 단어장에 없는 낱말만 · 하나하나 실제로 그대로 둔다 · 대문자로 시작해도(문장 첫 낱말) 그대로
  assert.ok(NOT_TYPO.size >= 30);
  for (const w of NOT_TYPO) {
    assert.ok(/^[a-z]+$/.test(w) && !known.has(w), w);
    assert.equal(fixedTo(w), null, w);
    const cap = w[0].toUpperCase() + w.slice(1);
    assert.ok(correct('', `${cap} is here.`, { known }).fixed.startsWith(`${cap} is here`), cap);
  }
});

// ───────────── 📬 수학 사다리 ─────────────

test('📬 수학 사다리는 아빠 답장 받기를 기다리지 않는다 — 사다리를 그린 뒤 뒤에서 받고, 새 답장이 붙었을 때만 다시 그린다', async () => {
  const math = src('js/math.js');
  const rm = body(math, 'renderMath');
  assert.ok(!/syncMathReplies/.test(rm), 'renderMath가 답장 받기(GitHub 왕복)를 직접 부르지 않는다');
  assert.ok(!/await syncRepliesLater/.test(math), '뒤에서 받기는 기다리지 않는다');
  assert.match(rm, /else renderLadder\(state\);\n {2}resumeRocketIfAny\(\);[^\n]*\n {2}syncRepliesLater\(\);/, '사다리 → 로켓단 이어 가기 → 답장은 뒤에서');
  assert.ok(rm.indexOf('state = await settleLive(state);') > 0 && rm.indexOf('state = await settleLive(state);') < rm.indexOf('ui.state = state;'));
  assert.equal(math.split('syncRepliesLater();').length - 1, 1, '부르는 곳은 사다리를 그린 뒤 한 곳');
  assert.match(math, /\nlet replySync = null;\nfunction syncRepliesLater\(\) \{/);

  // 진짜 함수 몸통을 가짜 의존성과 돌린다
  const at = math.indexOf('function syncRepliesLater() {');
  const fnSrc = math.slice(at, math.indexOf('\n}\n', at) + 2);
  const make = () => {
    const calls = { sync: 0, refresh: 0 };
    const ui = { state: { v: 1 } };
    const box = { answer: (s) => Promise.resolve(s) };
    const run = new Function('ui', 'syncMathReplies', 'refreshLadderIfShown', `let replySync = null;\n${fnSrc}\nreturn syncRepliesLater;`)(
      ui, (s) => { calls.sync += 1; calls.from = s; return box.answer(s); }, () => { calls.refresh += 1; },
    );
    return { ui, calls, run, box };
  };
  // 새 답장이 없으면(같은 기록이 돌아온다) 아무것도 안 한다
  let t = make();
  const s0 = t.ui.state;
  await t.run();
  assert.deepEqual([t.calls.sync, t.calls.refresh, t.ui.state === s0, t.calls.from === s0], [1, 0, true, true]);
  // 새 답장이 붙었으면 저장된 최신 기록으로 바꾸고 사다리를 다시
  t = make();
  const fresh = { v: 2 };
  t.box.answer = () => Promise.resolve(fresh);
  await t.run();
  assert.deepEqual([t.calls.refresh, t.ui.state === fresh], [1, true]);
  // 받는 사이 다른 저장이 ui.state를 바꿨어도 — 새 답장이 없으면 낡은 기록으로 덮지 않는다
  t = make();
  let release;
  t.box.answer = (s) => new Promise((r) => { release = () => r(s); });
  const p = t.run();
  const newer = { v: 3 };
  t.ui.state = newer;
  // 받는 중에 또 불려도 겹쳐 받지 않는다 · 끝나지 않아도 부른 쪽은 막히지 않는다(약속만 돌려준다)
  t.run();
  t.run();
  assert.equal(t.calls.sync, 1);
  release();
  await p;
  assert.deepEqual([t.calls.refresh, t.ui.state === newer], [0, true]);
  // 끝난 뒤에는 다시 받는다
  t.box.answer = (s) => Promise.resolve(s);
  await t.run();
  assert.equal(t.calls.sync, 2);
  // 못 받아도(던져도) 조용히 — 다음에 다시
  t = make();
  t.box.answer = () => Promise.reject(new Error('net'));
  await t.run();
  assert.deepEqual([t.calls.refresh, t.ui.state.v], [0, 1]);
  t.box.answer = (s) => Promise.resolve(s);
  await t.run();
  assert.equal(t.calls.sync, 2);
  // 기록을 아직 못 읽었으면 받지 않는다
  t = make();
  t.ui.state = null;
  assert.equal(await t.run(), undefined);
  assert.equal(t.calls.sync, 0);
});

test('📬 진짜 받기(syncMathReplies)와 함께 — 받는 사이 푼 기록을 늦은 답장이 덮지 않는다 · 새 답장이 없으면 같은 기록 그대로 · 저장이 안 되면 그대로 (리뷰 워크플로)', async () => {
  const math = src('js/math.js');
  const cut = (head) => { const at = math.indexOf(head); assert.ok(at >= 0, head); return math.slice(at, math.indexOf('\n}\n', at) + 2); };
  const syncSrc = cut('async function syncMathReplies(state) {').replace("await import('./upload.js')", 'await fakeUpload()');
  assert.ok(syncSrc.includes('fakeUpload'), '받는 곳(upload.js)만 가짜로');
  const build = () => {
    const calls = { fetch: 0, refresh: 0 };
    const ui = { state: null };
    const box = { list: () => Promise.resolve([]) };
    const fakeUpload = async () => ({ PRIVATE_REPLIES: 'math/replies.json', readPrivateList: () => { calls.fetch += 1; return box.list(); } });
    const later = new Function('ui', 'updateMath', 'applyReply', 'refreshLadderIfShown', 'fakeUpload',
      `${syncSrc}\nlet replySync = null;\n${cut('function syncRepliesLater() {')}\nreturn syncRepliesLater;`)(ui, updateMath, applyReply, () => { calls.refresh += 1; }, fakeUpload);
    return { ui, calls, box, later };
  };
  await getMath(); // 저장소를 연다
  fakeIdb.put('profile', { id: 'math', concepts: {}, placed: {}, miss: {}, rounds: 0, log: [], updatedAt: 0 });
  await updateMath((m) => { addAsk(m, { concept: 'frac.add', key: 'k1', kind: 'calc', q: '지어낸 문제', expr: '', my: '1', ans: '2' }, '2026-11-27', '왜요?'); });
  const REPLY = [{ no: 1, text: '지어낸 답장' }];
  // ① 받는 사이 한 편을 끝냈다(rounds 7) → 늦게 온 답장이 붙어도 화면 기록·저장 둘 다 7 + 안 읽은 답장 하나
  const t = build();
  t.ui.state = await getMath();
  let release;
  t.box.list = () => new Promise((r) => { release = () => r(REPLY); });
  const p = t.later();
  await new Promise((r) => setTimeout(r, 5));
  t.ui.state = await updateMath((m) => { m.rounds = 7; });
  release();
  await p;
  const saved = await getMath();
  assert.deepEqual([t.ui.state.rounds, unreadAsks(t.ui.state).length, t.calls.refresh, saved.rounds, unreadAsks(saved).length], [7, 1, 1, 7, 1]);
  // ② 새 답장이 없으면(이미 붙은 답장이 또 옴) 같은 객체 그대로 · 다시 그리지 않는다 — 들어올 때마다 사다리가 한 번 더 그려지지 않게
  const before = t.ui.state;
  t.calls.refresh = 0;
  t.box.list = () => Promise.resolve(REPLY);
  await t.later();
  assert.deepEqual([t.ui.state === before, t.calls.refresh, t.calls.fetch], [true, 0, 2]);
  // ③ 붙일 답장은 있는데 저장이 안 되면 그대로(다음에 다시)
  await updateMath((m) => { addAsk(m, { concept: 'frac.sub', key: 'k2', kind: 'calc', q: '지어낸 문제 2', expr: '', my: '1', ans: '2' }, '2026-11-27', '이것도요'); });
  t.ui.state = await getMath();
  const mid = t.ui.state;
  t.box.list = () => Promise.resolve([...REPLY, { no: 2, text: '지어낸 답장 2' }]);
  fakeIdb.failNext('profile');
  await t.later();
  assert.deepEqual([t.ui.state === mid, t.calls.refresh, fakeIdb.failsLeft(), unreadAsks(await getMath()).length], [true, 0, 0, 1]);
  await t.later();
  assert.deepEqual([unreadAsks(t.ui.state).length, t.calls.refresh], [2, 1], '다음에 다시 받으면 붙는다');
});

test('📬 읽어야 ☀️가 열린다 — 뒤에서 붙은 답장을 모르는 낡은 ☀️ 단추를 눌러도 새 ☀️는 안 열리고 사다리(📬)로 · 줄기 고르기는 지금 기록으로 (Codex 252차 #2 · 리뷰 워크플로)', async () => {
  const math = src('js/math.js');
  const at = math.indexOf("function startDaily(from = 'ladder') {");
  const sdSrc = math.slice(at, math.indexOf('\n}\n', at) + 2);
  const mk = (state) => {
    const calls = [];
    const ui = { state, stem: 'frac', daily: null };
    const run = new Function('ui', 'unreadAsks', 'renderLadder', 'todayKey', 'dailyPlan', 'STEMS', 'rememberStem', 'noteSun', 'sunKey', 'startRound', 'startMixRound', `${sdSrc}\nreturn startDaily;`)(
      ui, unreadAsks, (s) => calls.push(['ladder', s === ui.state]), () => '2026-11-27', () => { calls.push(['plan']); return { roundId: 'frac.add', roundMode: 'review', mix: [] }; },
      {}, () => {}, () => calls.push(['note']), () => 'k', (id) => calls.push(['round', id]), () => calls.push(['mix']));
    return { ui, calls, run };
  };
  const base = { id: 'math', concepts: {}, placed: {}, miss: {}, rounds: 0, log: [] };
  addAsk(base, { concept: 'frac.add', key: 'k1', kind: 'calc', q: '지어낸 문제', expr: '', my: '1', ans: '2' }, '2026-11-27', '왜요?');
  // 안 읽은 답장이 없으면(물어보기만 한 상태) 예전처럼 ☀️가 열린다
  let t = mk(JSON.parse(JSON.stringify(base)));
  t.run('puzzle');
  assert.deepEqual(t.calls, [['plan'], ['note'], ['round', 'frac.add']]);
  assert.ok(t.ui.daily);
  // 답장이 붙은 뒤에는 — 낡은 단추를 눌러도 흐름을 만들지 않고 사다리로(거기에 📬 단추 · ☀️는 읽을 때까지 잠김)
  const answered = JSON.parse(JSON.stringify(base));
  assert.equal(applyReply(answered, 1, '지어낸 답장'), true);
  assert.equal(unreadAsks(answered).length, 1);
  t = mk(answered);
  t.run('detect');
  assert.deepEqual(t.calls, [['ladder', true]]);
  assert.equal(t.ui.daily, null);
  // 사다리의 ☀️ 단추는 예전 그대로 잠근다 · 🌳 줄기 고르기 단추는 그릴 때의 기록이 아니라 지금 기록으로 사다리를 연다
  assert.match(math, /if \(unread\.length\) db\.disabled = true;/);
  assert.match(body(math, 'renderStemPicker'), /b\.addEventListener\('click', \(\) => openStem\(ui\.state \|\| state, key\)\);/);
});

// ───────────── 🚀 국어·논술 로켓단 이어 가기 ─────────────

test('🚀 앱을 열면 끝나지 않은 국어·논술 로켓단도 그 화면으로 — 예전엔 수학·영어만 이어 가, 과목 공용 칸이 남아 영어·수학 로켓단과 아지트 되찾기가 멈췄다', () => {
  const app = src('js/app.js');
  assert.match(app, /if \(rc\.subject === 'math' && !isLocked\('math'\)\) showView\('math'\);\n\s*else if \(rc\.subject === 'en' && !isLocked\('english'\)\) resumeEnglishRocket\(\)\.catch\(\(\) => \{\}\);[^\n]*\n\s*else if \(rc\.subject === 'kor' && !isLocked\('korean'\)\) showView\(rc\.stem === 'nonsul' \? 'nonsul' : 'korean'\);/);
  // 그 화면이 열리면 거기서 이어 간다(시작한 화면 kind와 같을 때 · 국어 시간이 남았을 때) — 화면 이름·열쇠가 서로 맞는지
  assert.match(app, /korean: document\.getElementById\('view-korean'\),\n\s*nonsul: document\.getElementById\('view-nonsul'\),/);
  assert.match(app, /if \(name === 'nonsul'\) return 'korean';/, '논술은 국어 시간 안 — 잠금 열쇠는 korean');
  const kr = src('js/korrocket.js');
  assert.match(kr, /cur\.subject === 'kor' && cur\.stem === kind && [^\n]*!isLocked\('korean'\)/);
  assert.match(kr, /rocketNew\(\{ subject: 'kor', target: target\.id, stem: kind \}\)/);
  assert.match(src('js/koreanview.js'), /resumeKorRocketIfAny\(\{ kind: 'korean',/);
  assert.match(src('js/nonsulview.js'), /resumeKorRocketIfAny\(\{ kind: 'nonsul',/);
});

// ───────────── 🧊 음식 버리기 ─────────────

const R1 = 'r1';
const A = 'food_apple';
const ICE = 'food_icecream';
const home = ({ items = {}, fridge, coins = 0, placed = true } = {}) => cloneProfile({
  ...emptyProfile(),
  coins,
  items: { [FRIDGE_ID]: 1, ...items },
  house: { started: true, seq: 5, rooms: [{ id: R1, wall: '', floor: '', items: placed ? [{ u: 1, id: FRIDGE_ID, x: 0, y: 0, f: 0 }] : [] }], ...(fridge ? { fridge } : {}) },
});

test('🗑️ 음식 버리기(foodDropRule) — 🧺 내 음식에서 하나 · 💰는 안 돌아옴 · 넣어 둔 음식은 못 버림 · 놓인 냉장고가 있어야 · 마지막 하나를 버리면 가방에서 사라짐', () => {
  const p = home({ coins: 77, items: { [A]: 3, [ICE]: 1, stone_math: 7 }, fridge: { 'c:s1:0': A, 'f:s1:0': ICE } });
  assert.deepEqual(foodDropRule(p, 'food_nope'), { ok: false, why: 'unknown' });
  assert.deepEqual(foodDropRule(p, 'toString'), { ok: false, why: 'unknown' });
  assert.deepEqual(foodDropRule(p, ICE), { ok: false, why: 'none' }, '하나뿐인 아이스크림은 냉동실에 넣어 둠 — 꺼낸 뒤에 버린다');
  assert.deepEqual(foodDropRule(p, 'food_milk'), { ok: false, why: 'none' }, '안 가진 음식');
  assert.deepEqual(foodDropRule(p, A), { ok: true });
  assert.deepEqual([p.items[A], p.coins], [2, 77], '하나 줄고 코인은 그대로');
  assert.deepEqual(houseOf(p).fridge, { 'c:s1:0': A, 'f:s1:0': ICE }, '넣어 둔 것은 그대로');
  assert.deepEqual(foodTray(p.items, houseOf(p).fridge), { [A]: 1 });
  assert.deepEqual(foodDropRule(p, A), { ok: true });
  assert.deepEqual(foodDropRule(p, A), { ok: false, why: 'none' }, '바구니가 비면 넣어 둔 사과는 못 버린다');
  assert.equal(p.items[A], 1);
  // 꺼내면 버릴 수 있다 · 마지막 하나를 버리면 가방에서 사라진다
  assert.deepEqual(fridgeTakeRule(p, 'c:s1:0'), { ok: true, id: A });
  assert.deepEqual(foodDropRule(p, A), { ok: true });
  assert.equal(A in p.items, false);
  assert.equal(foodOwned(p.items, A), 0);
  assert.deepEqual([p.items, p.coins], [{ [FRIDGE_ID]: 1, [ICE]: 1, stone_math: 7 }, 77], '가방의 다른 것(가구·다른 음식·스톤)과 코인은 그대로');
  // 놓인 냉장고가 없으면(서랍) 못 버린다 — 버리기는 냉장고 화면에서만
  const q = home({ items: { [A]: 1 }, placed: false });
  assert.deepEqual(foodDropRule(q, A), { ok: false, why: 'nofridge' });
  assert.equal(q.items[A], 1);
  // 가방이 줄어든 백업과 합쳐져 저장된 안에 숨은 옛 자리가 있어도 — 보이는 바구니로만 판정한다
  const odd = home({ items: { [A]: 1 }, fridge: { 'c:s1:0': A, 'c:s1:1': A } });
  assert.deepEqual(foodDropRule(odd, A), { ok: false, why: 'none' });
  // 거꾸로 — 저장된 안에 못 읽는 자리(실이 안 맞는 칸 · 없는 칸)만 있으면 화면은 그 음식을 🧺에 보여 준다 → 보이는 대로 버려진다
  const ghost = home({ items: { [A]: 1 }, fridge: { 'f:s1:0': A, 'c:zz:9': A } });
  assert.deepEqual(houseOf(ghost).fridge || {}, {});
  assert.deepEqual(foodTray(ghost.items, houseOf(ghost).fridge || {}), { [A]: 1 });
  assert.deepEqual(foodDropRule(ghost, A), { ok: true });
  assert.equal(A in ghost.items, false);
});

test('🗑️ 꽉 찬 실을 바꾼다 — 칸 수만큼 사면 영영 「꽉 찼어요」였다 → 꺼내서 버리면 다른 음식을 살 수 있다(다시 칸 수까지만)', () => {
  const slots = {};
  for (let i = 0; i < 4; i++) { slots[`c:s1:${i}`] = A; slots[`c:s2:${i}`] = A; slots[`c:s3:${i}`] = A; slots[`c:cr:${i}`] = A; }
  for (let i = 0; i < 2; i++) { slots[`c:p1:${i}`] = A; slots[`c:p2:${i}`] = A; slots[`c:p3:${i}`] = A; }
  const p = home({ coins: 500, items: { [A]: CAP.cold }, fridge: slots });
  assert.equal(Object.keys(houseOf(p).fridge).length, CAP.cold);
  assert.deepEqual(foodBuyCheck(p, 'food_cake'), { ok: false, why: 'full', zone: 'cold', placed: CAP.cold });
  assert.deepEqual(foodDropRule(p, A), { ok: false, why: 'none' }, '다 넣어 둠 — 먼저 꺼낸다');
  assert.deepEqual(fridgeTakeRule(p, 'c:p3:1'), { ok: true, id: A });
  assert.deepEqual(foodBuyCheck(p, 'food_cake').why, 'full', '꺼내기만 해서는 여전히 꽉 참(가진 수는 그대로)');
  assert.deepEqual(foodDropRule(p, A), { ok: true });
  assert.deepEqual(foodBuyCheck(p, 'food_cake'), { ok: true });
  assert.deepEqual(foodBuyRule(p, 'food_cake'), { ok: true });
  assert.deepEqual(fridgePutRule(p, 'c:p3:1', 'food_cake'), { ok: true });
  assert.equal(p.coins, 500 - foodById('food_cake').price, '버린 사과 값은 안 돌아온다');
  assert.deepEqual(foodBuyCheck(p, 'food_milk').why, 'full');
  assert.deepEqual(foodBuyCheck(p, ICE), { ok: true }, '냉동실은 따로');
});

test('★ 🗑️ 저장 경로 — 두 창이 바구니의 마지막 하나를 함께 버려도 하나만 · 다시 읽어도 그대로 · 코인 그대로', async () => {
  await initProfile();
  await houseDo(houseStartRule);
  await houseDo((p) => { p.coins = 1e5; p.items.stone_math = 1e3; p.items.stone_english = 1e3; return { ok: true }; });
  assert.deepEqual(await houseDo((p) => houseBuyRule(p, FRIDGE_ID)), { ok: true });
  assert.equal((await houseDo((p) => placeRule(p, R1, FRIDGE_ID, 4, 4))).ok, true);
  assert.deepEqual(await houseDo((p) => foodBuyRule(p, A)), { ok: true });
  assert.deepEqual(await houseDo((p) => foodBuyRule(p, A)), { ok: true });
  assert.deepEqual(await houseDo((p) => fridgePutRule(p, 'c:s1:0', A)), { ok: true });
  const coins = getProfileSnapshot().coins;
  const [a, b] = await Promise.all([houseDo((p) => foodDropRule(p, A)), houseDo((p) => foodDropRule(p, A))]);
  assert.deepEqual([a.ok, b.ok, b.why], [true, false, 'none'], '바구니에는 하나뿐');
  assert.equal(getProfileSnapshot().items[A], 1);
  await flushProfile();
  await reloadProfile();
  const pf = getProfileSnapshot();
  assert.deepEqual([pf.items[A], pf.coins], [1, coins]);
  assert.deepEqual(houseOf(pf).fridge, { 'c:s1:0': A }, '넣어 둔 사과는 그대로');
  // 저장이 안 되면 없던 일 — 버리기 결과가 { ok: false, why: 'save' }이고 가진 수·넣은 자리는 그대로
  assert.deepEqual(await houseDo((p) => foodBuyRule(p, A)), { ok: true });
  fakeIdb.failNext('profile');
  assert.deepEqual(await houseDo((p) => foodDropRule(p, A)), { ok: false, why: 'save' });
  assert.equal(fakeIdb.failsLeft(), 0);
  assert.equal(getProfileSnapshot().items[A], 2);
  assert.deepEqual(houseOf(getProfileSnapshot()).fridge, { 'c:s1:0': A });
  await reloadProfile();
  assert.equal(getProfileSnapshot().items[A], 2, '다시 읽어도 그대로');
});

test('🗑️ 화면 — 🧺에서 고른 음식 옆 [🗑️ 버리기] · 두 번 눌러야(처음엔 이름으로 묻는다) · 다른 것을 누르면 풀림 · 마트 「꽉 찼어요」는 바꾸는 길을 알려 준다 · css · 판', async () => {
  const fv = src('js/fridgeview.js');
  const { dropAskLine, dropDoneLine, FRIDGE_WHY, trayEmptyLine } = await import('../js/fridgeview.js');
  const apple = foodById(A);
  assert.equal(dropAskLine(apple), '🍎 사과를 버릴까요? 한 번 더 누르면 1개를 버려요 — 💰는 돌아오지 않아요.');
  assert.equal(dropAskLine(foodById('food_milk')), '🥛 우유를 버릴까요? 한 번 더 누르면 1개를 버려요 — 💰는 돌아오지 않아요.');
  assert.equal(dropDoneLine(apple), '🍎 사과 1개를 버렸어요.');
  assert.ok(FRIDGE_WHY.none && FRIDGE_WHY.nofridge);
  assert.equal(trayEmptyLine('cold', 22), '냉장실이 꽉 찼어요! 넣어 둔 음식을 누르면 🧺 내 음식으로 꺼낼 수 있어요.', '꺼내는 길 안내는 그대로');
  const drop = body(fv, 'onDrop');
  assert.match(drop, /if \(ui\.busy \|\| ui\.view !== 'inside' \|\| profileLoading\(\)\) return;/);
  assert.match(drop, /if \(ui\.drop !== id\) \{\n\s*ui\.drop = id;/, '처음엔 묻기만');
  assert.match(drop, /try \{ r = await houseDo\(\(p\) => foodDropRule\(p, id\)\); \} catch \{ r = null; \} finally \{ if \(ui\.seq === seq\) ui\.busy = false; \}/, '저장된 프로필로 한 트랜잭션');
  assert.ok(drop.indexOf("ui.drop = '';") > drop.indexOf('if (ui.drop !== id) {') && drop.indexOf("ui.drop = '';") < drop.indexOf('await houseDo'), '버리기 전에 풀어 둔다 — 세 번째 누름이 또 버리지 않게');
  assert.match(drop, /if \(!ui\.open \|\| ui\.seq !== seq \|\| ui\.view !== 'inside'\) return;/, '닫거나 앞으로 간 뒤 늦게 온 결과는 버린다');
  const tray = body(fv, 'drawTray');
  assert.match(tray, /if \(ui\.sel === id\) t\.appendChild\(dropBtn\(f\)\);/, '고른 음식 바로 옆에만');
  assert.match(tray, /ui\.sel = ui\.sel === id \? '' : id;\n\s*ui\.drop = '';/, '다른 음식을 고르거나 풀면 「한 번 더!」도 풀린다');
  assert.match(body(fv, 'onSlot'), /ui\.drop = '';/, '칸을 누르면 풀린다');
  assert.match(body(fv, 'drawInside'), /ui\.drop = '';/);
  assert.match(body(fv, 'drawFront'), /ui\.drop = '';/);
  assert.match(body(fv, 'paint'), /if \(ui\.drop && ui\.drop !== ui\.sel\) ui\.drop = '';/);
  const btn = body(fv, 'dropBtn');
  assert.match(btn, /armed \? '한 번 더!' : '🗑️ 버리기'/);
  assert.match(btn, /d\.type = 'button';/);
  // (누름 순서 — 한 번 누르면 묻기만 · 둘째에 1개 · 연타 · 저장 실패 — 는 tests/fridgedrop443.test.js가 가짜 화면으로 실제로 눌러 본다)
  const { martWhy } = await import('../js/houseview.js');
  assert.equal(martWhy({ why: 'full', zone: 'cold', placed: 22 }, apple), '냉장실이 꽉 찼어요 — 🧊 냉장고에서 음식을 꺼내 🧺 내 음식에서 🗑️ 버리면 다른 음식을 살 수 있어요');
  assert.equal(martWhy({ why: 'full', zone: 'frozen', placed: 4 }, apple), '냉동실에 넣을 음식을 칸만큼 가졌어요 — 🧊 냉장고를 열어 🧺 내 음식을 넣거나 🗑️ 버려요', '바구니에 남았으면 넣거나 버리는 길');
  const css = src('css/style.css');
  assert.match(css, /\.fz-drop \{[^}]*min-height: 44px;/, '손가락으로 누를 크기');
  assert.match(css, /\.fz-drop\.is-arm \{/);
  const sw = src('sw.js');
  const ver = Number((/const CACHE_VERSION = 'v(\d+)';/.exec(sw) || [])[1]);
  assert.ok(ver >= 443);
  assert.match(src('js/version.js'), new RegExp(`APP_VERSION = 'v${ver}'`));
});
