// 🎬 v416 (2026-11-11 아버님 「낚시터 영어에 한 단계 어려운 꼴」 → 「추천대로」) — 낚시터 영어 4단계 「영상 대사 빈칸」 — node --test tests/lake416.test.js
//   본 단어 + 그 단어를 본 대사 한 줄 → 빈칸 · 보기 영어 넷 · 답한 뒤 뜻과 대사 🔊 · 못 만들면 3단계 꼴 · 영어만 맨 위 4 · 손님 맞이·대여행은 그대로
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lvFor, enLevelQ, blankLine, LINE_WORDS, BLANK, LEN_NEAR, soundAlike, meansClash } from '../js/lakelevel.js';
import { stepLevel, lvTop, LV_TOP, FISH_LV_Q, lakeDayLine } from '../js/fishing.js';
import { lvDelta } from '../js/lakeview.js';
import { emptyDaily, mergeDailyDelta, mergeStatRecord } from '../js/db.js';
import { TOUR_LVS } from '../js/aquatour.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
function rngOf(a) {
  let s = a >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const oneOk = (q) => q.choices.filter((c) => c.ok).length === 1;
const okText = (q) => q.choices.find((c) => c.ok).text;
const v = (word, meaning, sentence = '', kind = /\s/.test(word) ? 'phrase' : 'word') => ({ word, meaning, kind, sentence, views: 2, quizPass: 1 });
// 시험 원천 (지어낸 짧은 대사)
const VOCAB = [
  v('boat', '배', 'Get in the boat right now!'), v('island', '섬', 'We can see the island from here.'), v('hurry', '서둘러', 'Hurry, the door is closing fast!'),
  v('star', '별', 'Look at that star up there.'), v('moon', '달'), v('monkey', '원숭이', 'The monkey took my hat again.'), v('money', '돈'), v('ocean', '바다'),
  v('friend', '친구', 'You are my best friend forever.'), v('happy', '행복한'), v('sad', '슬픈'), v('jump', '뛰다'), v('run', '달리다'),
  v('right', '오른쪽', 'Turn right at the big tree.'), v('write', '쓰다'), v('sun', '해'), v('son', '아들'),
  v('watch out', '조심해!', 'Watch out, the rocks are falling!'), v("let's go", '가자', 'Come on, let’s go to the beach.'), v('look out', '조심해라'),
  v('be careful', '조심해'), v('come on', '어서'), v('wake up', '일어나'), v('thank you', '고마워'),
];
const byWord = new Map(VOCAB.map((r) => [r.word, r]));
const spot = (line, w) => new RegExp(`(?<![A-Za-z'])${w.split(' ').join('\\s+')}(?![A-Za-z'])`, 'i').test(line.replace(/’/g, "'"));

test('✂️ 빈칸 대사 — 그 말이 그대로 든 자리 모두 · 대소문자 무시 · 다른 낱말 속은 아님 · ’도 곧은 따옴표 · 4~12낱말만', () => {
  assert.equal(BLANK, '____');
  assert.deepEqual(LINE_WORDS, { min: 4, max: 12 });
  assert.equal(blankLine('Watch out, the boat is coming!', 'boat'), 'Watch out, the ____ is coming!');
  assert.equal(blankLine('Boat is here now.', 'boat'), '____ is here now.');
  assert.equal(blankLine('Two boats and one boat here.', 'boat'), 'Two boats and one ____ here.', 'boats 속 boat는 그대로');
  assert.equal(blankLine('Run, run, run away from here!', 'run'), '____, ____, ____ away from here!', '나온 자리 모두');
  assert.equal(blankLine('Come on, let’s go to the beach.', "let's go"), 'Come on, ____ to the beach.');
  assert.equal(blankLine('Okay,  watch   out for the rocks.', 'watch out'), 'Okay, ____ for the rocks.', '빈칸 여럿은 하나로');
  assert.equal(blankLine("I don't know the way home.", 'don'), null, "don't 속 don은 그 말이 아님");
  assert.equal(blankLine('The snowman is melting away now.', 'man'), null, 'snowman 끝의 man도 그 말이 아님');
  assert.equal(blankLine('A man and a snowman stood there.', 'man'), 'A ____ and a snowman stood there.');
  assert.equal(blankLine('Go go go, go now!', 'go'), '____ ____ ____, ____ now!', '붙어 있어도 모두 · 앞 글자(빈칸·쉼표)는 그대로');
  // Codex 220차 P2-1 — 빈칸 뒤에도 답 글자가 보이면(따옴표 속 · 줄임말 속) 4단계를 안 낸다
  assert.equal(blankLine("Say 'boat' when you see a boat.", 'boat'), null, '따옴표 속 답이 남음');
  assert.equal(blankLine('Say ‘boat’ when you see a boat.', 'boat'), null, '굽은 따옴표도');
  assert.equal(blankLine("It's fine, it is okay now.", 'it'), null, "It's 속 It이 남음");
  assert.equal(blankLine("I don't know the way home.", "don't"), "I ____ know the way home.", '줄임말 자체가 답이면 가림');
  assert.equal(blankLine('Wait, it’s my turn now.', "it's"), 'Wait, ____ my turn now.');
  assert.equal(blankLine("Run, 'cause they are coming!", "'cause"), 'Run, ____ they are coming!', "앞에 '가 붙은 말");
  assert.equal(blankLine('"Boat!" he said to me.', 'boat'), '"____!" he said to me.');
  assert.ok(!/\(\?<[!=]/.test(read('js/lakelevel.js')), '뒤돌아보기 정규식 없음 — 옛 iOS Safari가 못 읽는다');
  assert.equal(blankLine('We are running to the boat.', 'run'), null, '꼴이 다르면(running) 안 냄');
  assert.equal(blankLine('Hello there, boat.', 'boat'), null, '3낱말 — 너무 짧음');
  assert.equal(blankLine('one two three boat', 'boat'), 'one two three ____', '4낱말은 됨');
  assert.equal(blankLine('a b c d e f g h i j k boat', 'boat'), 'a b c d e f g h i j k ____', '12낱말은 됨');
  assert.equal(blankLine('a b c d e f g h i j k l boat', 'boat'), null, '13낱말 — 너무 김');
  for (const bad of ['', null, undefined]) assert.equal(blankLine(bad, 'boat'), null);
  assert.equal(blankLine('Get in the boat now.', ''), null, '말이 비면 없음');
  assert.equal(blankLine('Is it (a) boat? Yes it is.', '(a)'), 'Is it ____ boat? Yes it is.', '정규식 글자도 글자 그대로');
});

test('🎬 4단계 — 대사를 🔊로 들려주고 빈칸 · 보기 영어 넷(정답 하나 = 들은 말) · 같은 꼴 · 대사에 든 말·소리 같은 짝·뜻 겹침은 빼고 · 틀린 보기 한 줄 · 답한 뒤 뜻', () => {
  const withLine = VOCAB.filter((r) => r.sentence);
  for (const rec of withLine) {
    const line = rec.sentence.replace(/’/g, "'");
    for (let s = 1; s <= 150; s++) {
      const q = enLevelQ(rec, VOCAB, 4, rngOf(s * 613 + rec.word.length));
      assert.ok(q, rec.word);
      assert.equal(q.lv, 4, rec.word);
      assert.equal(q.id, `e:${rec.word}`);
      assert.equal(q.label, '🔶 영어 · 🎬 영상 대사');
      assert.equal(q.q, '대사를 듣고, 빈칸에 들어간 말을 골라요');
      assert.equal(q.sentence, blankLine(line, rec.word));
      assert.ok(q.sentence.includes(BLANK) && !spot(q.sentence, rec.word), '빈칸 대사엔 정답이 없다');
      assert.equal(q.listen, line, '대사 전체를 먼저 🔊 — 정답 = 들은 말 (Codex 220차 P2-2)');
      assert.equal(q.sayAfter, undefined, '이미 들었으니 답한 뒤엔 안 읽음(🔊 다시 듣기는 그대로)');
      assert.equal(q.reveal, `${rec.word} = ${rec.meaning}`);
      assert.ok(oneOk(q));
      assert.equal(okText(q), rec.word);
      assert.equal(q.choices.length, 4);
      assert.equal(new Set(q.choices.map((c) => c.text.toLowerCase())).size, 4);
      const means = [rec.meaning];
      for (const c of q.choices.filter((x) => !x.ok)) {
        const r = byWord.get(c.text);
        assert.ok(r, `원천의 말 ${c.text}`);
        assert.equal(r.kind, rec.kind, `같은 꼴 ${rec.word} / ${c.text}`);
        assert.ok(!spot(line, c.text), `대사에 든 말은 보기로 안 냄 ${c.text}`);
        assert.ok(!soundAlike(rec.word, c.text), `소리 같은 짝 ${c.text}`);
        assert.ok(!means.some((m) => meansClash(m, r.meaning)), `뜻 겹침 ${rec.meaning} / ${r.meaning}`);
        means.push(r.meaning);
        assert.equal(c.hint, `${r.word} = ${r.meaning} · 이 대사에선 ${rec.word}(${rec.meaning})였어요`);
      }
    }
  }
  // 하나씩 짚기 — come on은 let's go 대사에 들어 있고, look out·be careful은 watch out과 뜻이 겹치고, write는 right와 소리가 같다
  const seen = (word) => new Set(Array.from({ length: 300 }, (_, s) => enLevelQ(byWord.get(word), VOCAB, 4, rngOf(s + 1)).choices.map((c) => c.text)).flat());
  assert.ok(!seen("let's go").has('come on'));
  const wo = seen('watch out');
  assert.ok(!wo.has('look out') && !wo.has('be careful'));
  assert.ok(!seen('right').has('write'));
  assert.ok([...seen('boat')].every((w) => !/\s/.test(w)), '낱말엔 낱말 보기만');
});

test('📏 길이 — 정답과 글자 수가 비슷한 말(±2) 먼저 · 모자랄 때만 먼 말', () => {
  const near = ['dog', 'cow', 'pig', 'hen'];
  const far = ['elephant', 'butterfly', 'crocodile'];
  const pool = [v('cat', '고양이', 'The cat is on the roof.'), v('dog', '개'), v('cow', '소'), v('pig', '돼지'), v('hen', '암탉'), v('elephant', '코끼리'), v('butterfly', '나비'), v('crocodile', '악어')];
  assert.equal(LEN_NEAR, 2);
  for (let s = 1; s <= 200; s++) {
    const q = enLevelQ(pool[0], pool, 4, rngOf(s));
    assert.equal(q.lv, 4);
    assert.ok(q.choices.filter((c) => !c.ok).every((c) => near.includes(c.text)), `가까운 말만 ${q.choices.map((c) => c.text)}`);
  }
  const two = pool.filter((r) => r.word !== 'pig' && r.word !== 'hen');
  const farSeen = new Set();
  for (let s = 1; s <= 200; s++) {
    const wrong = enLevelQ(two[0], two, 4, rngOf(s)).choices.filter((c) => !c.ok).map((c) => c.text);
    assert.ok(wrong.includes('dog') && wrong.includes('cow'), '가까운 둘은 늘');
    for (const w of wrong.filter((x) => far.includes(x))) farSeen.add(w);
  }
  assert.equal(farSeen.size, 3, '모자란 하나는 먼 말에서 고루');
});

test('↘️ 못 만들면 3단계 꼴 — 대사 없음 · 꼴이 다름 · 너무 김 · 같은 꼴 보기가 모자람 (3단계도 못 만들면 null)', () => {
  const lvOf = (rec, all = VOCAB) => { const q = enLevelQ(rec, all, 4, rngOf(7)); return q && q.lv; };
  assert.equal(lvOf(byWord.get('moon')), 3, '대사 없음');
  assert.equal(lvOf(v('run', '달리다', 'We are running to the boat.')), 3, '꼴이 다름(running)');
  assert.equal(lvOf(v('boat', '배', 'a b c d e f g h i j k l boat')), 3, '13낱말');
  const fewPhrase = [v('watch out', '조심해!', 'Watch out, the rocks are falling!'), v('wake up', '일어나'), v('thank you', '고마워'), v('boat', '배'), v('star', '별'), v('moon', '달')];
  assert.equal(lvOf(fewPhrase[0], fewPhrase), 3, '같은 꼴(구) 보기가 둘뿐');
  const q3 = enLevelQ(byWord.get('moon'), VOCAB, 4, rngOf(3));
  assert.equal(q3.listen, 'moon', '3단계는 소리만 꼴 그대로');
  assert.equal(enLevelQ(v('boat', '배', 'Get in the boat right now!'), [v('boat', '배')], 4, rngOf(1)), null, '보기가 아예 없으면 null(부르는 쪽이 1단계 꼴로)');
  // 2·3단계는 v378 그대로 — 대사가 있어도 빈칸을 내지 않는다
  for (const lv of [2, 3]) assert.equal(enLevelQ(byWord.get('boat'), VOCAB, lv, rngOf(5)).sentence, undefined);
});

test('🎚️ 단계 — 영어만 맨 위 4(영어 목소리가 있을 때) · 다른 과목은 3 그대로 · 물고기 단계 + 과목 단계', () => {
  assert.deepEqual(LV_TOP, { english: 4 });
  assert.deepEqual(['english', 'math', 'korean', 'nonsul', 'toString', ''].map(lvTop), [4, 3, 3, 3, 3, 3]);
  assert.equal(lvFor('english', 4, { listen: true }), 4);
  assert.equal(lvFor('english', 4, { listen: false }), 2, '목소리가 없으면 2 (4를 못 만들면 소리만 꼴로 내려가니)');
  assert.equal(lvFor('english', 4, null), 2);
  assert.equal(lvFor('english', 3, { listen: true }), 3);
  for (const bad of [5, 0, '4', 3.5, NaN]) assert.equal(lvFor('english', bad, { listen: true }), 1, String(bad));
  for (const s of ['math', 'korean', 'nonsul']) assert.equal(lvFor(s, 4, { listen: true }), 1, `${s}는 4가 없다(옛 규칙)`);
  // 행 = 과목 단계 · 열 = 물기 전(1) · ★3(2) · ★4·5(3) — 영어 맨 위 4
  const en = { 2: [3, 4, 4], 1: [2, 3, 4], 0: [1, 2, 3], '-1': [1, 1, 2] };
  for (const [step, row] of Object.entries(en)) assert.deepEqual([1, 2, 3].map((b) => stepLevel(b, Number(step), lvTop('english'))), row, `영어 과목 단계 ${step}`);
  assert.deepEqual([1, 2, 3].map((b) => stepLevel(b, 2, lvTop('math'))), [3, 3, 3], '다른 과목은 3까지');
  assert.deepEqual([stepLevel(3, 2), stepLevel(3, 2, 5), stepLevel(3, 2, '4')], [3, 3, 3], '맨 위를 안 주거나 이상하면 3');
});

test('📅 하루 칸·📤 — 4단계로 낸·맞힌 수 · 더하기 · 백업 병합은 큰 쪽 · 「4단계 맞힘/낸」', () => {
  assert.deepEqual(FISH_LV_Q[4], ['fishLv4Q', 'fishLv4Ok']);
  assert.deepEqual(lvDelta({ lv: 4 }, true), { fishLv4Q: 1, fishLv4Ok: 1 });
  assert.deepEqual(lvDelta({ lv: 4 }, false), { fishLv4Q: 1, fishLv4Ok: 0 });
  const D = '2026-11-11';
  const e = emptyDaily(D);
  assert.deepEqual([e.fishLv4Q, e.fishLv4Ok], [0, 0]);
  let d = mergeDailyDelta(e, D, { fishEnQ: 1, fishEnOk: 1, ...lvDelta({ lv: 4 }, true) });
  d = mergeDailyDelta(d, D, { fishEnQ: 1, ...lvDelta({ lv: 4 }, false) });
  assert.deepEqual([d.fishLv4Q, d.fishLv4Ok], [2, 1]);
  const m = mergeStatRecord('daily', { ...e, fishLv4Q: 3, fishLv4Ok: 1 }, { ...e, fishLv4Q: 1, fishLv4Ok: 1 });
  assert.deepEqual([m.fishLv4Q, m.fishLv4Ok], [3, 1], '큰 쪽');
  assert.match(lakeDayLine({ ...d, fishSec: 600, fishCatch: 2, fishLv3Q: 1, fishLv3Ok: 1 }), /🐋 큰 물고기 문제 3단계 1\/1 · 4단계 1\/2/);
  assert.doesNotMatch(lakeDayLine({ ...e, fishSec: 600, fishEnQ: 1, fishLv3Q: 1 }), /4단계/, '없으면 안 씀');
});

test('🔌 잇기 — 낚시터만 영어 맨 위 4 · 손님 맞이(3까지)·대여행(단계 없음)은 그대로 · 원천은 단계를 그대로 넘김 · 단어 기록에 대사 · 📤 설명 · sw v416', () => {
  assert.match(read('js/fishview.js'), /const ctx = \{ fish: ui\.castN, stage, [^\n]*\n[^\n]*h\.ask\(s, nextSeed\(\), stepLevel\(lv, ui\.steps\[s\], lvTop\(s\)\), ctx\)/); // v419 — ctx에 again
  assert.ok(Math.max(...TOUR_LVS) <= 3, '🎟️ 손님 맞이는 3단계까지');
  assert.match(read('js/tourview.js'), /lvFor\(s, TOUR_LVS\[i\], \{ listen: canListen\(\) \}\)/);
  const jv = read('js/journeyview.js');
  assert.ok(jv.includes('if (lv >= 2) { const hq = enLevelQ(rec, all, lv, rngOf(seed)); if (hq) return hq; }'), '원천은 단계를 그대로 — 4도');
  assert.ok(jv.includes('const all = wordPool(await listVocabViews());'), '보기 원천 = 본 단어 기록(대사 칸 포함)');
  assert.ok(read('js/db.js').includes('rec.sentence = e.sentence || rec.sentence;'), '단어를 본 대사가 기록에 남는다');
  assert.match(read('js/db.js'), /'fishLv3Q', 'fishLv3Ok', 'fishLv4Q', 'fishLv4Ok',/);
  const fv = read('js/fishview.js');
  // 소리 칸(listen)이면 물음 + 🔊(바로 읽고 다시 듣기) → 그 뒤에 빈칸 대사 칸 · 영어 대사 칸은 lang="en" (Codex 220차 P3) · 답한 뒤 뜻
  assert.match(fv, /else if \(q\.listen\) \{\n\s*qText\(qBox, q\);\n\s*hear\(q\.listen\);\n\s*\} else if \(q\.word\)[\s\S]{0,200}?\} else qText\(qBox, q\);\n\s*if \(q\.sentence\) \{/);
  for (const s of ["const sent = el('div', 'lk-sent', q.sentence);\n    if (subj === 'english') sent.lang = 'en';\n    qBox.appendChild(sent);", "if (q.reveal) qBox.appendChild(el('div', 'lk-reveal', q.reveal));", "hb.addEventListener('click', () => { try { h.say(word); } catch { /* 무시 */ } });"]) assert.ok(fv.includes(s), s);
  assert.match(read('js/lakeview.js'), /function say\(word\) \{[\s\S]{0,200}u\.lang = 'en-US';/, '영어 목소리로 읽음');
  const up = read('js/upload.js');
  assert.ok(up.includes('🐋 큰 물고기 2·3·4단계 문제 맞힘/낸') && up.includes('4단계 = 🔶 영어만 🎬 본 영상 대사의 빈칸 v416'));
  assert.ok(Number((/CACHE_VERSION = 'v(\d+)'/.exec(read('sw.js')) || [])[1]) >= 416, 'sw v416 이상');
  assert.ok(Number((/APP_VERSION = 'v(\d+)'/.exec(read('js/version.js')) || [])[1]) >= 416, '앱 판 v416 이상');
});
