// 🐋 학습 낚시터 난이도 (v378 — 아버님 「물고기가 클수록 어렵게」 → 기본안 「추천대로」) — node --test tests/lakelevel378.test.js
// 별 → 단계(물고기가 문 뒤만) · 과목마다 2·3단계 꼴(정답 꼭 하나 · 원고 그대로 · 못 만들면 아래로) · 틀린 보기 한 줄 · 물고기 수학 꼴 나눔 · 단계별 하루 칸 · 📤 줄
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { levelOf, stageLevel, lvBadge, LV_BADGE, BIG_STAGES, FISH_LV_Q, lakeDayLine, rollFish, poolAt, SPOTS, RIVER_SPOTS, SEA_SPOTS, placeOfSpot, cellFish } from '../js/fishing.js';
import { lvFor, enLevelQ, korLevelQ, nsLevelQ, mathKinds, MATH_KINDS, MATH_KIND_LV, mathHint, meansClash } from '../js/lakelevel.js';
import { fishMathQ, FM_LEVEL, FM_KIND_LIST } from '../js/fishmath.js';
import { allWords, makeQuestion, DECKS } from '../js/korwords.js';
import { korPool, nonsulPool } from '../js/korbattle.js';
import { allTopics } from '../js/nonsul.js';
import { askFrom, asker, mathMix, lvDelta } from '../js/lakeview.js';
import { emptyDaily, mergeDailyDelta, mergeStatRecord } from '../js/db.js';
import { BIG, makeQuestion as bigQ } from '../js/mathbig.js';
import { NEGATIVE, makeQuestion as negQ } from '../js/mathneg.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const json = (f) => JSON.parse(read(f));
// 씨앗 난수 (mulberry32 — 이웃 씨앗의 첫 값이 한곳에 몰리지 않게)
function rngOf(a) {
  let s = a >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const oneOk = (q) => q.choices.filter((c) => c.ok).length === 1;
const okText = (q) => q.choices.find((c) => c.ok).text;

test('🐟 별 → 단계 — ★1·2 지금 그대로 · ★3 → 2 · ★4·5 → 3 · 모르는 별은 1', () => {
  assert.deepEqual([1, 2, 3, 4, 5].map(levelOf), [1, 1, 2, 3, 3]);
  for (const bad of [0, 6, -1, null, undefined, 'x', NaN, 'toString', '__proto__']) assert.equal(levelOf(bad), 1, String(bad));
  assert.equal(levelOf('4'), 3, '글자 별도 같은 칸');
});

test('🎣 단계는 물고기가 문 뒤(③ 바늘 · ④ 사투 · ⑤ 뜰채)만 — ① 던지기·② 밑밥은 큰 물고기여도 1 · 물고기가 없으면 1', () => {
  assert.deepEqual(BIG_STAGES, ['hook', 'fight', 'net']);
  const big = { key: 'megi', star: 4 };
  for (const st of ['cast', 'chum', 'x', '', undefined]) assert.equal(stageLevel(st, big), 1, `${st}`);
  for (const st of BIG_STAGES) {
    assert.equal(stageLevel(st, big), 3);
    assert.equal(stageLevel(st, { star: 3 }), 2);
    assert.equal(stageLevel(st, { star: 2 }), 1);
    assert.equal(stageLevel(st, null), 1);
  }
  assert.equal(stageLevel('fight', cellFish(SPOTS[2])), 2, '🟢 셀은 ★3이라 2');
});

test('🏷️ 카드 머리 표시 — 2단계 🐠 · 3단계 🐋 · 1단계·문 앞은 없음 · 🟢 셀은 정체가 드러난 뒤 셀 말로 · 숫자 없음', () => {
  assert.equal(lvBadge('hook', { star: 5 }), LV_BADGE[3]);
  assert.equal(lvBadge('net', { star: 3 }), LV_BADGE[2]);
  assert.equal(lvBadge('fight', { star: 2 }), '');
  assert.equal(lvBadge('cast', { star: 5 }), '');
  assert.equal(lvBadge('chum', { star: 5 }), '');
  const cell = cellFish(SPOTS[0]);
  assert.equal(lvBadge('hook', cell), LV_BADGE[2], '바늘 걸기 땐 아직 모름');
  for (const st of ['fight', 'net']) assert.match(lvBadge(st, cell), /🟢/);
  for (const t of [...Object.values(LV_BADGE), lvBadge('net', cell)]) assert.doesNotMatch(t, /\d/, '셈·숫자 없음');
});

test('🎯 시험용 별(wantStar) — 그 별의 그 물가 물고기 · 보통(0)은 별 몫대로', () => {
  for (const spot of [SPOTS[0], RIVER_SPOTS[1], SEA_SPOTS[2]]) {
    for (const star of [1, 2, 3, 4, 5]) {
      for (let s = 1; s <= 40; s++) {
        const f = rollFish(spot, 0, 0, rngOf(s * 31 + star), null, star);
        assert.equal(f.star, star);
        assert.ok(poolAt(placeOfSpot(spot), star).some(([x]) => x.key === f.key), `${f.key}는 ${placeOfSpot(spot)} ★${star}`);
      }
    }
  }
  // 물가(shore)는 ★4·5가 몫 0 — 보통이면 안 나오고, 0·6·'5'는 보통 길
  for (const want of [0, 6, '5', undefined]) for (let s = 1; s <= 300; s++) assert.ok(rollFish(SPOTS[0], 0, 0, rngOf(s), null, want).star <= 3);
});

test('🔊 실제 단계 — 1~3 밖은 1 · 영어 3단계(소리만)는 영어 목소리가 있을 때만(없으면 2) · 다른 과목은 그대로', () => {
  assert.equal(lvFor('english', 3, { listen: false }), 2);
  assert.equal(lvFor('english', 3, {}), 2);
  assert.equal(lvFor('english', 3, null), 2);
  assert.equal(lvFor('english', 3, { listen: true }), 3);
  assert.equal(lvFor('english', 2, {}), 2);
  for (const s of ['math', 'korean', 'nonsul']) assert.deepEqual([1, 2, 3].map((l) => lvFor(s, l, {})), [1, 2, 3]);
  for (const bad of [0, 4, -1, '3', null, undefined, NaN]) assert.equal(lvFor('math', bad, {}), 1, String(bad));
});

// ───────────── 🔶 영어 ─────────────

const VOCAB = [
  ['monkey', '원숭이'], ['money', '돈'], ['watch out', '조심해!'], ['be careful', '조심해'], ['look out', '조심해라'],
  ['run', '달리다'], ['jump', '뛰다'], ['happy', '행복한'], ['sad', '슬픈'], ['friend', '친구'], ['friends', '친구들'],
  ['let\'s go', '가자'], ['hurry', '서둘러'], ['wait', '기다려'], ['help', '도와줘'], ['yes', '네'], ['no', '아니'],
  ['ocean', '바다'], ['island', '섬'], ['boat', '배'], ['Boat', '보트'], ['star', '별'], ['moon', '달'], ['sun', '해'],
].map(([word, meaning]) => ({ word, meaning, views: 2, quizPass: 1 }));
const key = (m) => String(m).replace(/[\s!?.,~…'"()[\]]/g, '');
const clash = (a, b) => a === b || (a.length >= 2 && b.length >= 2 && (a.includes(b) || b.includes(a)));
const byWord = new Map(VOCAB.map((r) => [r.word, r]));
const byMean = new Map(VOCAB.map((r) => [r.meaning, r]));

test('🔶 영어 2단계(거꾸로) — 「뜻」에 맞는 영어 · 보기는 영어 단어 넷 · 단어는 물음에 안 보임 · 겹치는 뜻은 보기에서 뺌 · 틀린 보기 한 줄 · 답한 뒤 🔊', () => {
  for (const rec of VOCAB) {
    for (let s = 1; s <= 120; s++) {
      const q = enLevelQ(rec, VOCAB, 2, rngOf(s * 977 + rec.word.length));
      assert.ok(q, rec.word);
      assert.equal(q.lv, 2);
      assert.equal(q.id, `e:${rec.word}`);
      assert.ok(oneOk(q));
      assert.equal(okText(q), rec.word);
      assert.equal(q.choices.length, 4);
      assert.ok(q.q.includes(rec.meaning));
      assert.ok(!q.q.toLowerCase().includes(rec.word.toLowerCase()), '정답 단어가 물음에 없다');
      assert.equal(q.word, undefined, '카드가 단어를 크게 그리지 않게 word 칸 없음');
      assert.equal(q.sayAfter, rec.word);
      assert.equal(new Set(q.choices.map((c) => c.text.toLowerCase())).size, 4, '보기 단어가 서로 다름(대소문자도)');
      const means = [key(rec.meaning)];
      for (const c of q.choices.filter((x) => !x.ok)) {
        const r = byWord.get(c.text);
        assert.ok(r, `원천의 단어 ${c.text}`);
        assert.equal(c.hint, `${r.word} = ${r.meaning}`);
        const k = key(r.meaning);
        assert.ok(!means.some((m) => clash(m, k)), `뜻이 겹치지 않음: ${rec.meaning} / ${r.meaning}`);
        means.push(k);
      }
    }
  }
});

test('🔶 영어 3단계(소리만) — 단어 글자는 물음에 없고 listen으로 · 보기는 뜻 넷 · 답한 뒤 글자(reveal) · 틀린 보기 한 줄', () => {
  for (const rec of VOCAB) {
    for (let s = 1; s <= 120; s++) {
      const q = enLevelQ(rec, VOCAB, 3, rngOf(s * 131 + 7));
      assert.ok(q);
      assert.equal(q.lv, 3);
      assert.equal(q.listen, rec.word);
      assert.equal(q.word, undefined);
      assert.ok(!q.q.toLowerCase().includes(rec.word.toLowerCase()));
      assert.ok(q.reveal.includes(rec.word) && q.reveal.includes(rec.meaning));
      assert.ok(oneOk(q));
      assert.equal(okText(q), rec.meaning);
      const means = [key(rec.meaning)];
      for (const c of q.choices.filter((x) => !x.ok)) {
        const r = byMean.get(c.text);
        assert.ok(r);
        assert.equal(c.hint, `${r.word} = ${r.meaning}`);
        assert.ok(!means.some((m) => clash(m, key(r.meaning))));
        means.push(key(r.meaning));
      }
    }
  }
});

test('🔶 영어 — 1단계엔 안 거침 · 다른 뜻이 셋 안 되면 null(부르는 쪽이 1단계 꼴로) · 깨진 기록 null', () => {
  assert.equal(enLevelQ(VOCAB[0], VOCAB, 1, rngOf(1)), null);
  const few = [VOCAB[2], VOCAB[3], VOCAB[4], VOCAB[0]]; // 조심해 셋은 서로 겹침 → 원숭이 하나뿐
  assert.equal(enLevelQ(VOCAB[2], few, 2, rngOf(1)), null);
  assert.equal(enLevelQ(VOCAB[2], few, 3, rngOf(1)), null);
  assert.equal(enLevelQ(null, VOCAB, 2, rngOf(1)), null);
  assert.equal(enLevelQ({ word: 'x' }, VOCAB, 2, rngOf(1)), null);
});

// 사람이 판정한 고정 사례 (Codex 182차 #4 — 생성기 규칙을 되풀이하지 않고 「같이 나오면 안 되는 짝」을 직접 적는다)
const W = (word, meaning) => ({ word, meaning, views: 2, quizPass: 1 });
const SAFE = [W('apple', '사과'), W('moon', '달'), W('star', '별'), W('friend', '친구'), W('boat', '배'), W('run', '달리다')];

test('🔊 소리만(3단계) — 소리가 같은 단어의 뜻은 보기에 안 나옴(hole/whole · know/no · to/two) · 거꾸로(2단계)는 철자가 보여 괜찮음 (Codex 182차 #1)', () => {
  for (const [ans, alike] of [[W('hole', '구멍'), W('whole', '전체의')], [W('know', '알다'), W('no', '아니')], [W('two', '둘'), W('to', '~에게')]]) {
    const pool = [ans, alike, ...SAFE];
    let shownAt2 = 0;
    for (let s = 1; s <= 300; s++) {
      const q3 = enLevelQ(ans, pool, 3, rngOf(s * 17 + 1));
      assert.ok(q3);
      assert.ok(!q3.choices.some((c) => c.text === alike.meaning), `${ans.word}를 들려주며 ${alike.word}(${alike.meaning})를 보기로 내면 안 됨`);
      const q2 = enLevelQ(ans, pool, 2, rngOf(s * 17 + 1));
      if (q2.choices.some((c) => c.text === alike.word)) shownAt2++;
    }
    assert.ok(shownAt2 > 0, '거꾸로 문제엔 철자가 달라 함께 나와도 됨');
  }
});

test('🔶 비슷한 뜻은 2·3단계 보기에 함께 안 나옴 — 「조심해!」·「주의해」·「조심하다」·「조심해, 주의!」 · 「고마워」·「정말 감사합니다」 (Codex 182차 #2)', () => {
  const careful = [W('be careful', '주의해'), W('beware', '조심하다'), W('heads up', '조심해, 주의!'), W('alert', '경보, 조심해!(~가 온다)')];
  const thanks = [W('thanks a lot', '정말 감사합니다')];
  const begin = [W('begin', '시작하다')]; // 묶음 목록에 없어도 끝말을 뗀 줄기가 같으면(시작)
  const sun = [W('the sun', '해!')]; // 끝말을 떼면 줄기가 비는 뜻 — 글자가 같으면
  for (const [ans, near] of [[W('watch out', '조심해!'), careful], [W('thank you', '고마워'), thanks], [W('start', '시작해!'), begin], [W('sun', '해'), sun]]) {
    const pool = [ans, ...near, ...SAFE];
    for (const lv of [2, 3]) {
      for (let s = 1; s <= 300; s++) {
        const q = enLevelQ(ans, pool, lv, rngOf(s * 29 + lv));
        assert.ok(q);
        for (const n of near) assert.ok(!q.choices.some((c) => c.text === n.word || c.text === n.meaning), `${ans.word}(${ans.meaning})와 ${n.word}(${n.meaning})는 함께 안 냄`);
      }
    }
  }
  // 다른 뜻은 그대로 보기 — 너무 넓게 빼지 않음
  for (const [a, b] of [['사과', '달'], ['강', '개'], ['용감한', '조용한'], ['바다', '바보'], ['달리다', '뛰다']]) assert.equal(meansClash(a, b), false, `${a}·${b}`);
});

test('🖊️ 논술 원고 — 편이 모호하던 이유 셋을 편이 드러나게 고침(N94·N2·N92 · Codex 182차 #3) · 옛 문장 없음', () => {
  const T = allTopics(json('coach/korean/nonsul.json'));
  const by = Object.fromEntries(T.map((t) => [t.id, t]));
  assert.ok(by.N94.no.reasons.includes('이로치든 보통 모습이든 함께 키우면 똑같이 정이 들어요.'), 'N94 「똑같이 아껴요」 쪽');
  assert.ok(by.N2.yes.reasons.includes('스스로 정하면 시간을 나누어 쓰는 연습이 돼요.'), 'N2 「스스로 정해도 돼요」 쪽');
  assert.ok(by.N92.yes.reasons.includes('선생님께서 바로 아셔야 다른 친구들이 계속 피해를 보지 않아요.'), 'N92 「선생님께 알려요」 쪽');
  const all = read('coach/korean/nonsul.json');
  for (const old of ['함께 배틀하며 키운 포켓몬에 더 정이 들어요.', '"시간을 나누어 쓰는 연습이 돼요."', '규칙을 어기는 일이 계속되면 다른 친구들이 피해를 봐요.']) assert.ok(!all.includes(old), old);
});

// ───────────── 📚 국어 ─────────────

const WORDS = allWords(json('coach/korean/words.json'), []);
const POOL = korPool(WORDS);
const jong = (t) => { const c = String(t).trim().slice(-1).charCodeAt(0); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 > 0; };
const avoidOf = (a, b) => (a.avoid || []).includes(b.w) || (b.avoid || []).includes(a.w);
const pairOf = (a, b) => (a.pair || []).includes(b.w) || (b.pair || []).includes(a.w);

test('📚 국어 2단계(빈칸 문장) — 원고 예문 그대로 · 정답 낱말 하나 · 짝·피함 낱말은 보기에 없음 · 틀린 보기 「낱말: 뜻」', () => {
  assert.ok(POOL.length > 100);
  let n = 0;
  for (const w of POOL) {
    for (let s = 1; s <= 12; s++) {
      const q = korLevelQ(w, POOL, 2, rngOf(s * 7 + n));
      if (!w.ex) { assert.equal(q, null, '예문 없는 낱말은 2단계 꼴 없음'); continue; }
      if (!q) { assert.equal(makeQuestion(w, 'use', POOL, rngOf(1)), null, `${w.w} — 보기를 못 만들 때만 null`); continue; }
      n++;
      assert.equal(q.lv, 2);
      assert.equal(q.sentence, w.ex);
      // 관용 표현·속담·사자성어 묶음은 「이럴 때 어울리는 …」(상황 글) · 나머지는 빈칸 글
      if (DECKS[w.deck] && DECKS[w.deck].ask) assert.equal(q.q, DECKS[w.deck].ask);
      else assert.ok(q.sentence.includes('___'), w.w);
      assert.ok(oneOk(q));
      assert.equal(okText(q), w.w);
      assert.equal(new Set(q.choices.map((c) => c.text)).size, 4);
      for (const c of q.choices.filter((x) => !x.ok)) {
        const x = POOL.find((y) => y.w === c.text && y.deck === w.deck);
        assert.ok(x, `같은 묶음 낱말 ${c.text}`);
        assert.ok(!pairOf(w, x) && !avoidOf(w, x), `${w.w} — ${x.w}: 같이 들어갈 수 있는 낱말은 빼야`);
        assert.equal(c.hint, `${x.w}: ${x.mean}`);
      }
    }
  }
  assert.ok(n > 1000, `충분히 많이 봄 ${n}`);
});

test('📚 국어 3단계(뜻 보고 낱말) — 물음에 뜻 · 받침 따라 「이라는/라는」 · 정답 낱말 하나 · 보기 낱말 뜻이 서로 다름 · 피함 지킴 · 못 만들면 2단계', () => {
  let three = 0;
  let pairsShown = 0;
  for (const w of POOL) {
    for (let s = 1; s <= 12; s++) {
      const q = korLevelQ(w, POOL, 3, rngOf(s * 13 + w.w.length));
      if (!q) { assert.equal(makeQuestion(w, 'word', POOL, rngOf(1)), null); continue; }
      if (q.lv === 2) { assert.equal(makeQuestion(w, 'word', POOL, rngOf(s)), null, '3단계를 못 만들 때만 2단계'); continue; }
      three++;
      assert.equal(q.lv, 3);
      assert.ok(q.q.includes(`「${w.mean}」${jong(w.mean) ? '이라는' : '라는'} 뜻의 낱말`), q.q);
      assert.equal(q.sentence, '');
      assert.ok(oneOk(q));
      assert.equal(okText(q), w.w);
      const means = new Set([w.mean]);
      for (const c of q.choices.filter((x) => !x.ok)) {
        const x = POOL.find((y) => y.w === c.text && y.deck === w.deck);
        assert.ok(x);
        assert.ok(!means.has(x.mean), `뜻이 같은 낱말 둘 — 정답이 둘 (${w.w}/${x.w})`);
        means.add(x.mean);
        assert.ok(!avoidOf(w, x), `${w.w}·${x.w}는 같이 안 냄`);
        if (pairOf(w, x)) pairsShown++;
        assert.equal(c.hint, `${x.w}: ${x.mean}`);
      }
    }
  }
  assert.ok(three > 1000, `3단계 꼴 ${three}`);
  assert.ok(pairsShown > 0, '헷갈리는 짝이 보기로 나옴');
});

// ───────────── 🖊️ 논술 ─────────────

const TOPICS = nonsulPool(allTopics(json('coach/korean/nonsul.json')));

test('🖊️ 논술 2단계 — 내 편 이유 하나(정답) · 반대편 이유 셋 · 상관없는 말 없음 · 틀린 보기 「반대편 이유」 한 줄', () => {
  assert.ok(TOPICS.length >= 100);
  for (const t of TOPICS) {
    for (const side of ['yes', 'no']) {
      const other = side === 'yes' ? 'no' : 'yes';
      for (let s = 1; s <= 6; s++) {
        const q = nsLevelQ(t, side, 2, rngOf(s * 101 + t.id.length));
        assert.ok(q, t.id);
        assert.equal(q.lv, 2);
        assert.equal(q.id, `${t.id}:${side}`);
        assert.ok(q.q.includes(`「${t[side].label}」`));
        assert.ok(oneOk(q));
        assert.ok(t[side].reasons.includes(okText(q)));
        const wrong = q.choices.filter((c) => !c.ok);
        assert.equal(wrong.length, 3);
        for (const c of wrong) {
          assert.ok(t[other].reasons.includes(c.text), '틀린 보기는 반대편 이유');
          assert.ok(c.hint.includes(t[other].label));
        }
        assert.ok(!q.choices.some((c) => t.off.some((o) => o.t === c.text)), '상관없는 말 없음');
      }
    }
  }
});

test('🖊️ 논술 3단계 — 이유가 「아닌」 것 · 반대편 이유 하나가 정답 · 내 편 이유 셋 · 밑줄 낱말 em · 틀린 보기 한 줄', () => {
  for (const t of TOPICS) {
    for (const side of ['yes', 'no']) {
      const other = side === 'yes' ? 'no' : 'yes';
      for (let s = 1; s <= 6; s++) {
        const q = nsLevelQ(t, side, 3, rngOf(s * 59 + 3));
        assert.equal(q.lv, 3);
        assert.equal(q.em, '아닌');
        assert.ok(q.q.includes(`「${t[side].label}」라는 의견의 이유가 아닌 것`));
        assert.ok(oneOk(q));
        assert.ok(t[other].reasons.includes(okText(q)), '정답 = 반대편 이유');
        const wrong = q.choices.filter((c) => !c.ok).map((c) => c.text);
        assert.equal(wrong.length, 3);
        assert.equal(new Set(wrong).size, 3);
        for (const x of wrong) assert.ok(t[side].reasons.includes(x), '틀린 보기 = 내 편 이유');
        for (const c of q.choices.filter((x) => !x.ok)) assert.ok(c.hint.includes(t[side].label));
      }
    }
  }
});

test('🖊️ 논술 — 이유가 모자라면 아래로(3 → 2 → null) · 1단계엔 안 거침 · 깨진 값 null', () => {
  const t = TOPICS[0];
  const thin = { ...t, yes: { ...t.yes, reasons: t.yes.reasons.slice(0, 2) } };
  assert.equal(nsLevelQ(thin, 'yes', 3, rngOf(1)).lv, 2, '내 편 이유가 둘이면 3단계 대신 2단계');
  assert.equal(nsLevelQ(thin, 'no', 2, rngOf(1)), null, '반대편 이유가 둘이면 2단계 못 만듦');
  assert.equal(nsLevelQ(thin, 'no', 3, rngOf(1)).lv, 3, '3단계는 반대편 하나면 됨');
  assert.equal(nsLevelQ(t, 'yes', 1, rngOf(1)), null);
  assert.equal(nsLevelQ(t, 'maybe', 2, rngOf(1)), null);
  assert.equal(nsLevelQ(null, 'yes', 2, rngOf(1)), null);
});

// ───────────── 🔢 수학 ─────────────

test('🔢 수학 배운 칸 — 단계마다 해 볼 얼굴(이유 → 함정 → 계산) · 얼굴의 단계 · 모르는 단계는 계산만', () => {
  assert.deepEqual(mathKinds(1), ['calc']);
  assert.deepEqual(mathKinds(2), ['misread', 'calc']);
  assert.deepEqual(mathKinds(3), ['why', 'misread', 'calc']);
  for (const bad of [0, 4, undefined, null, '2']) assert.deepEqual(mathKinds(bad), ['calc']);
  assert.deepEqual(MATH_KIND_LV, { calc: 1, misread: 2, why: 3 });
  for (const lv of [1, 2, 3]) assert.equal(mathKinds(lv)[mathKinds(lv).length - 1], 'calc', '끝은 늘 계산(못 만드는 칸이 없게)');
  assert.deepEqual(Object.keys(MATH_KINDS), ['1', '2', '3']);
});

test('🔢 틀린 보기 한 줄 — 그 실수의 풀이 → 없으면 어느 오답이든 같은 풀이 · 굵은 표시·그림 자리 뺌 · 정답은 ""', () => {
  const q = { solve: { why: { slip: '**0의 개수**를 세어 봐요 [para 7 6 2]' }, whyAny: '포켓몬이 자리를 잘못 셌어요.' } };
  assert.equal(mathHint(q, { ok: false, tag: 'slip' }), '0의 개수를 세어 봐요');
  assert.equal(mathHint(q, { ok: false, tag: 'other' }), '포켓몬이 자리를 잘못 셌어요.');
  assert.equal(mathHint(q, { ok: false }), '포켓몬이 자리를 잘못 셌어요.');
  assert.equal(mathHint(q, { ok: true, tag: 'slip' }), '');
  assert.equal(mathHint({}, { ok: false }), '');
  assert.equal(mathHint(null, { ok: false }), '');
});

test('🔢 진짜 줄기 — 큰 수 칸 함정 문제는 정답 하나 · 틀린 보기마다 한 줄이 생김 · 음수 칸 이유 문제도 정답 하나', () => {
  let n = 0;
  for (const c of BIG) {
    for (let s = 1; s <= 30; s++) {
      const q = bigQ(c.id, 'misread', s * 7919, { names: ['피카츄', '파이리'], me: '진우' });
      if (!q) continue;
      n++;
      assert.ok(oneOk(q), c.id);
      for (const ch of q.choices.filter((x) => !x.ok)) assert.ok(mathHint(q, ch).length > 5, `${c.id} 한 줄`);
      assert.doesNotMatch(mathHint(q, q.choices.find((x) => !x.ok)), /\*\*|\[[a-z]+ /);
    }
  }
  assert.ok(n > 100, `함정 문제 ${n}`);
  let w = 0;
  for (const c of NEGATIVE) {
    const q = negQ(c.id, 'why', 11, { names: ['피카츄'], me: '진우' });
    if (!q) continue;
    w++;
    assert.ok(oneOk(q), c.id);
  }
  assert.ok(w > 0, '이유 문제가 있는 칸');
});

// ───────────── 🐟 물고기 수학 ─────────────

const RICH = { dex: { bungeo: { n: 7, best: 31.2 }, pirami: { n: 4, best: 14.2 }, ingeo: { n: 2, best: 48.5 }, megi: { n: 3, best: 71.8 }, gamulchi: { n: 1, best: 52.5 } } };

test('🐟 물고기 수학 꼴 나눔 — 1 비교·막대 · 2 차·합 · 3 무게 합·단위 · 실제 낸 꼴의 단계(lv) · 모든 꼴이 어느 단계엔가', () => {
  assert.deepEqual(new Set(Object.keys(FM_LEVEL)), new Set(FM_KIND_LIST));
  assert.deepEqual(FM_LEVEL, { cmp: 1, bar: 1, sub: 2, add: 2, wadd: 3, unit: 3 });
  for (const lv of [1, 2, 3]) {
    const seen = new Set();
    for (let s = 1; s <= 400; s++) {
      const q = fishMathQ(RICH, s, '', lv);
      assert.ok(q);
      assert.equal(q.lv, FM_LEVEL[q.kind]);
      assert.equal(q.lv, lv, `${lv}단계 — 이 도감이면 그 단계 꼴이 늘 됨 (${q.kind})`);
      seen.add(q.kind);
      assert.ok(oneOk(q));
    }
    assert.equal(seen.size, 2, `${lv}단계 두 꼴이 다 나옴`);
  }
  assert.equal(fishMathQ(RICH, 5).lv, 1, '단계를 안 주면 1단계');
});

test('🐟 못 만들면 아래로 · 그래도 없으면 위로(수학 차례가 비지 않게) · 바로 앞 꼴은 같은 단계 안에서 뒤로', () => {
  const two = { dex: { bungeo: { n: 7, best: 31.2 }, pirami: { n: 4, best: 14.2 } } }; // 두 종 · 1 kg 넘는 물고기 없음
  for (let s = 1; s <= 200; s++) {
    const q1 = fishMathQ(two, s, '', 1);
    assert.ok(q1, '두 종이면 비교·막대는 못 만들어도 차·합으로');
    assert.equal(q1.lv, 2);
    const q3 = fishMathQ(two, s, '', 3);
    assert.equal(q3.lv, 2, '무게 꼴을 못 만들면 2단계 꼴');
  }
  const light = { dex: { bungeo: { n: 7, best: 31.2 }, pirami: { n: 4, best: 14.2 }, chambung: { n: 2, best: 9.5 } } }; // 세 종 · 무거운 물고기 없음
  for (let s = 1; s <= 200; s++) assert.equal(fishMathQ(light, s, '', 3).lv, 2, '3단계를 못 만들면 바로 아래(2)부터 — 1로 건너뛰지 않음');
  for (let s = 1; s <= 200; s++) {
    assert.equal(fishMathQ(RICH, s, 'cmp', 1).kind, 'bar');
    assert.equal(fishMathQ(RICH, s, 'bar', 1).kind, 'cmp');
    assert.equal(fishMathQ(RICH, s, 'wadd', 3).kind, 'unit');
  }
});

// ───────────── 잇기 · 기록 ─────────────

test('🔗 단계를 넘김 — askFrom → 원천 make(key, seed, lv) · asker 기본 1 · mathMix는 양쪽에 · 대여행처럼 lv 없이 부르면 1', () => {
  const got = [];
  const src = { keys: ['a', 'b'], make: (k, seed, lv) => { got.push(lv); return { id: k, choices: [{ text: 'o', ok: true }, { text: 'x', ok: false }] }; } };
  assert.ok(askFrom(src, 'korean', '2026-11-01', 0, 5, 3).q);
  assert.ok(askFrom(src, 'korean', '2026-11-01', 0, 5).q);
  const a = asker({ korean: src }, '2026-11-01', {});
  a('korean', 1, 2);
  a('korean', 2);
  assert.deepEqual(got, [3, 1, 2, 1]);
  const seen = [];
  const mix = mathMix((subj, seed, lv) => { seen.push(['base', lv]); return { q: 'b' }; }, (seed, avoid, lv) => { seen.push(['fm', lv]); return { q: 'f', kind: 'cmp' }; });
  mix('math', 1, 3);
  mix('math', 2, 2);
  mix('english', 3, 3);
  mix('math', 4);
  assert.deepEqual(seen, [['base', 3], ['fm', 2], ['base', 3], ['base', 1]], '영어는 차례를 안 먹음 → 넷째(수학 셋째 차례)는 배운 문제');
});

test('📅 단계별 하루 칸 — 2·3단계로 실제 낸 문제만 · 더하기 · 백업 병합은 큰 쪽 · 📤 줄 「🐋 큰 물고기 문제」', () => {
  assert.deepEqual(FISH_LV_Q, { 2: ['fishLv2Q', 'fishLv2Ok'], 3: ['fishLv3Q', 'fishLv3Ok'], 4: ['fishLv4Q', 'fishLv4Ok'] }, 'v416 — 4 = 🎬 영어 대사 빈칸');
  assert.deepEqual(lvDelta({ lv: 2 }, true), { fishLv2Q: 1, fishLv2Ok: 1 });
  assert.deepEqual(lvDelta({ lv: 3 }, false), { fishLv3Q: 1, fishLv3Ok: 0 });
  for (const q of [{ lv: 1 }, {}, null, { lv: 5 }, { lv: 'toString' }]) assert.deepEqual(lvDelta(q, true), {});
  const D = '2026-11-01';
  const e = emptyDaily(D);
  for (const k of ['fishLv2Q', 'fishLv2Ok', 'fishLv3Q', 'fishLv3Ok']) assert.equal(e[k], 0, `${k} 빈 칸`);
  let d = mergeDailyDelta(e, D, { fishEnQ: 1, fishEnOk: 1, ...lvDelta({ lv: 3 }, true) });
  d = mergeDailyDelta(d, D, { fishKorQ: 1, ...lvDelta({ lv: 3 }, false) });
  d = mergeDailyDelta(d, D, { fishNsQ: 1, fishNsOk: 1, ...lvDelta({ lv: 2 }, true) });
  assert.deepEqual([d.fishLv2Q, d.fishLv2Ok, d.fishLv3Q, d.fishLv3Ok], [1, 1, 2, 1]);
  const m = mergeStatRecord('daily', { ...e, fishLv3Q: 5, fishLv3Ok: 1 }, { ...e, fishLv3Q: 2, fishLv3Ok: 2 });
  assert.deepEqual([m.fishLv3Q, m.fishLv3Ok], [5, 2], '큰 쪽');
  const line = lakeDayLine({ ...d, fishSec: 600, fishCatch: 3 });
  assert.match(line, /🐋 큰 물고기 문제 2단계 1\/1 · 3단계 1\/2/);
  assert.doesNotMatch(lakeDayLine({ ...e, fishSec: 600, fishEnQ: 2, fishEnOk: 1 }), /🐋/, '없으면 안 씀');
  assert.match(lakeDayLine({ ...e, fishSec: 60, fishMathQ: 1, fishLv3Q: 1 }), /3단계 0\/1/);
  assert.doesNotMatch(lakeDayLine({ ...e, fishSec: 60, fishMathQ: 1, fishLv3Q: 1 }), /2단계/);
});

test('🧵 화면 배선 — 창은 단계를 원천까지 · 1단계 꼴은 대여행과 같은 길 · 새 파일은 sw 목록에', () => {
  const fv = read('js/fishview.js');
  assert.match(fv, /const lv = stageLevel\(stage, ui\.fish\);/);
  assert.match(fv, /const ctx = \{ fish: ui\.castN, stage, [^\n]*\n[^\n]*h\.ask\(s, nextSeed\(\), stepLevel\(lv, ui\.steps\[s\], lvTop\(s\)\), ctx\)/, 'v387 — 물고기 단계에 과목 단계를 더해 넘김 (v416 — 과목 맨 위 단계까지)');
  assert.match(fv, /lvBadge\(stage, ui\.fish\)/);
  assert.match(fv, /tiltNow\(\), h\.forceStar \|\| 0\)/);
  const jv = read('js/journeyview.js');
  for (const f of ['enLevelQ', 'korLevelQ', 'nsLevelQ']) assert.match(jv, new RegExp(`lv >= 2[^\\n]*${f}|${f}[^\\n]*lv >= 2|if \\(lv >= 2\\) \\{ const hq = ${f}`), `${f}는 2단계부터만`);
  const mj = read('js/math.js');
  assert.match(mj, /for \(const kind of typed \? \['calc'\] : mathKinds\(lv\)\)/);
  assert.match(mj, /const hint = \(c\) => mathHint\(q, c\);/, 'v387 — 1단계(계산)도 한 줄 (기본안 「추천대로」 2)');
  const lk = read('js/lakeview.js');
  assert.match(lk, /\.\.\.lvDelta\(q, ok\), \.\.\.rd, \.\.\.padDelta\(subj, ok, a\), [^\n]*FISH_AGAIN_Q[^\n]* \}\);/, '단계별 칸을 그날 기록에 (v387 다시 풀기 칸과 함께)');
  assert.match(lk, /redoAsker\(\(subj, seed, lv\) => base\(subj, seed, lvFor\(subj, lv, \{ listen: canListen\(\) \}\)\)/, '소리만 문제는 영어 목소리가 있을 때만');
  assert.match(lk, /forceStar: testStar\(\),/);
  assert.match(read('sw.js'), /'\.\/js\/lakelevel\.js'/);
});
