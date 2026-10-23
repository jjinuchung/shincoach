// ⚔️ 국어·논술 배틀 (v325, 2026-10-23 아버님 "진행해줘" · Codex 129차 반영) — node --test tests/korbattle325.test.js
//  배틀 판은 영어·수학과 같은 battle.js · 턴 문제만 다르다: 📚 🔤 배운 낱말 뜻(손질한 네 묶음만) · 🖊️ 이 의견에 알맞은 이유(생활 주제 원고 문장 그대로)
//  글 한 편·한 판을 끝낸 화면에 가끔 단추 → 누를 때 하루 몫(영어·수학과 같은 칸)을 쓴다 · 그 화면을 떠났거나 다른 창이 뜨면 몫을 돌려준다
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { KOR_BATTLE, offerRoll, korBattleQ, nonsulBattleQ } from '../js/korbattle.js';
import { moveHint, loseTip, movesOf, BATTLE } from '../js/battle.js';
import { allWords } from '../js/korwords.js';
import { validCards } from '../js/korean.js';
import { allTopics } from '../js/nonsul.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const json = (f) => JSON.parse(read(f));
const cards = validCards(json('coach/korean/reading.json'));
const words = allWords(json('coach/korean/words.json'), cards); // 📖 글에서 만난 낱말까지 — 배틀이 스스로 걸러야 한다
const curated = words.filter((w) => w.deck !== 'passage');
const passage = words.filter((w) => w.deck === 'passage');
const topics = allTopics(json('coach/korean/nonsul.json'));
const life = topics.filter((t) => !t.card); // 생활 주제
const story = topics.filter((t) => t.card); // 📖 독서 논술
/** 씨앗 → 0 이상 1 미만 (고르게) */
const seeded = (s) => { let x = (s * 2654435761) >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };

test('⚔️ 단추를 낼까: 오늘 배틀(네 과목 합)이 남았을 때만 · 확률 KOR_BATTLE.chance', () => {
  assert.equal(KOR_BATTLE.chance, 1 / 3);
  assert.equal(offerRoll({ todayBattles: 0, max: 3, rng: () => 0.33 }), true);
  assert.equal(offerRoll({ todayBattles: 0, max: 3, rng: () => 1 / 3 }), false);
  assert.equal(offerRoll({ todayBattles: 2, max: 3, rng: () => 0 }), true);
  assert.equal(offerRoll({ todayBattles: 3, max: 3, rng: () => 0 }), false, '하루 몫을 다 썼으면 확률과 상관없이 안 냄');
  assert.equal(offerRoll({ todayBattles: 9, max: 3, rng: () => 0 }), false);
  assert.equal(offerRoll({ todayBattles: 'x', max: 3, rng: () => 0 }), true, '이상한 수는 0으로');
  assert.equal(offerRoll({ todayBattles: 0, rng: () => 0 }), false, 'max를 안 주면 안 냄');
  let n = 0;
  const r = seeded(7);
  for (let i = 0; i < 30000; i++) if (offerRoll({ todayBattles: 0, max: BATTLE.maxPerDay, rng: r })) n++;
  assert.ok(n > 9000 && n < 11000, `세 번에 한 번쯤 (${n}/30000)`);
});

test('🔤 국어 턴: 손질한 네 묶음의 모든 낱말이 뜻 고르기 문제가 된다 — 보기 넷 · 정답 하나 = 그 낱말 뜻 · 보기가 서로 다름', () => {
  assert.ok(curated.length >= 150, `손질한 낱말 ${curated.length}`);
  assert.deepEqual([...new Set(curated.map((w) => w.deck))].sort(), ['concept', 'idiom', 'proverb', 'saja']);
  let bad = 0;
  for (const w of curated) {
    for (let s = 1; s <= 6; s++) {
      const q = korBattleQ(words, { [w.id]: { box: 1 } }, new Set(), seeded(s * 1000 + curated.indexOf(w)));
      if (!q || q.id !== w.id) { bad++; continue; }
      assert.equal(q.choices.length, 4, w.id);
      assert.equal(q.choices.filter((c) => c.ok).length, 1, w.id);
      assert.equal(q.choices.find((c) => c.ok).text, w.mean, w.id);
      assert.equal(new Set(q.choices.map((c) => c.text)).size, 4, `${w.id} 보기가 겹침`);
      assert.ok(q.q.includes(`'${w.w}'`) && q.q.endsWith('뜻으로 알맞은 것은 무엇인가요?'), w.id);
      assert.match(q.label, /^🔤 /);
    }
  }
  assert.equal(bad, 0, '문제가 안 되는 낱말');
});

test('🔤 국어 턴: 📖 글에서 만난 낱말은 묻지도 보기로도 안 쓴다(뜻이 거의 같은 짝 — Codex 129차 #2) · 배운 낱말에서 · 낸 낱말은 피한다', () => {
  assert.ok(passage.length > 100);
  const curatedMeans = new Set(curated.map((w) => w.mean));
  // 📖 낱말만 배웠어도(예: 글을 많이 읽은 날) 📖 낱말은 안 나오고 네 묶음에서
  const onlyPassage = Object.fromEntries(passage.map((w) => [w.id, { box: 2 }]));
  for (let s = 1; s <= 3000; s++) {
    const q = korBattleQ(words, s % 2 ? onlyPassage : {}, new Set(), seeded(s));
    assert.ok(q && !q.id.startsWith('p:'), `📖 낱말을 물음 ${q && q.id}`);
    for (const c of q.choices) assert.ok(curatedMeans.has(c.text), `📖 뜻이 보기에 ${c.text}`);
  }
  // 실제로 겹치던 짝 — 표지판/안내판 · 횡단보도/건널목은 어떤 경우에도 안 나온다
  for (const w of ['표지판', '안내판', '횡단보도', '건널목']) assert.ok(passage.some((x) => x.w === w), w);
  // 배운 낱말에서 묻는다
  const a = curated.find((w) => w.deck === 'concept');
  const b = curated.find((w) => w.deck === 'idiom');
  const learned = { [a.id]: { box: 2 }, [b.id]: { box: 0 }, ...onlyPassage };
  const got = new Set();
  for (let s = 1; s <= 300; s++) got.add(korBattleQ(words, learned, new Set(), seeded(s)).id);
  assert.deepEqual([...got].sort(), [a.id, b.id].sort(), '배운 둘에서만, 둘 다');
  for (let s = 1; s <= 100; s++) assert.equal(korBattleQ(words, learned, new Set([a.id]), seeded(s)).id, b.id, '낸 낱말은 피함');
  const both = new Set();
  for (let s = 1; s <= 100; s++) both.add(korBattleQ(words, learned, new Set([a.id, b.id]), seeded(s)).id);
  assert.deepEqual([...both].sort(), [a.id, b.id].sort(), '다 냈으면 다시');
  assert.equal(korBattleQ([], {}), null);
  assert.equal(korBattleQ(null, null), null);
  assert.equal(korBattleQ(passage, onlyPassage), null, '📖 낱말뿐이면 낼 문제가 없다(단추도 없다)');
});

test('🖊️ 논술 턴: 생활 주제의 모든 주제·두 편이 문제가 된다 — 정답 = 그 편 이유 · 반대편 이유 둘 · 상관없는 말 하나', () => {
  assert.ok(life.length >= 30, `생활 주제 ${life.length}`);
  for (const t of life) {
    for (const side of ['yes', 'no']) {
      const other = side === 'yes' ? 'no' : 'yes';
      const seen = new Set([`${t.id}:${other}`]);
      for (let s = 1; s <= 40; s++) {
        const q = nonsulBattleQ(topics, { [t.id]: { box: 0 } }, seen, seeded(s * 97 + topics.indexOf(t)));
        assert.equal(q.id, `${t.id}:${side}`);
        assert.equal(q.choices.length, 4);
        assert.equal(new Set(q.choices.map((c) => c.text)).size, 4, `${q.id} 보기가 겹침`);
        const ok = q.choices.filter((c) => c.ok);
        assert.equal(ok.length, 1);
        assert.ok(t[side].reasons.includes(ok[0].text), `${q.id} 정답은 그 편 이유`);
        const wrong = q.choices.filter((c) => !c.ok).map((c) => c.text);
        assert.equal(wrong.filter((x) => t[other].reasons.includes(x)).length, 2, `${q.id} 반대편 이유 둘`);
        assert.equal(wrong.filter((x) => t.off.some((o) => o.t === x)).length, 1, `${q.id} 상관없는 말 하나`);
        assert.equal(q.q, `「${t[side].label}」라는 의견에 알맞은 이유는 무엇인가요?`);
        assert.ok(q.label.startsWith('🖊️ ') && q.label.endsWith(t.q));
      }
    }
  }
});

test('🖊️ 논술 턴: 📖 독서 논술은 안 낸다(이야기 없이 보면 양쪽으로 읽힘 — Codex 129차 #3) · 해 본 주제에서 · 낸 주제·편은 피한다 · 보기 자리는 섞인다', () => {
  assert.ok(story.length >= 10);
  const storyText = new Set(story.flatMap((t) => [...t.yes.reasons, ...t.no.reasons, ...t.off.map((o) => o.t)]));
  assert.ok(storyText.size >= 70, `독서 논술 문장 ${storyText.size}`);
  // 독서 논술만 해 봤어도 그 주제는 안 나오고 생활 주제에서
  const onlyStory = Object.fromEntries(story.map((t) => [t.id, { box: 1 }]));
  for (let s = 1; s <= 2000; s++) {
    const q = nonsulBattleQ(topics, s % 2 ? onlyStory : {}, new Set(), seeded(s));
    assert.ok(life.some((t) => q.id.startsWith(`${t.id}:`)), `독서 논술이 나옴 ${q.id}`);
    for (const c of q.choices) assert.ok(!storyText.has(c.text), `독서 논술 문장 ${c.text}`);
  }
  assert.equal(nonsulBattleQ(story, onlyStory), null, '독서 논술뿐이면 낼 문제가 없다(단추도 없다)');
  const [t1, t2] = life;
  const played = { [t1.id]: { box: 0 }, [t2.id]: { box: 1 }, N999: { box: 1 }, ...onlyStory }; // 원고에 없는 칸은 무시
  const got = new Set();
  for (let s = 1; s <= 400; s++) got.add(nonsulBattleQ(topics, played, new Set(), seeded(s)).id);
  assert.deepEqual([...got].sort(), [`${t1.id}:no`, `${t1.id}:yes`, `${t2.id}:no`, `${t2.id}:yes`].sort());
  const seen = new Set([`${t1.id}:yes`, `${t1.id}:no`, `${t2.id}:yes`]);
  for (let s = 1; s <= 100; s++) assert.equal(nonsulBattleQ(topics, played, seen, seeded(s)).id, `${t2.id}:no`);
  const any = new Set();
  for (let s = 1; s <= 2000; s++) any.add(nonsulBattleQ(topics, {}, new Set(), seeded(s)).id.split(':')[0]);
  assert.equal(any.size, life.length, '판을 안 했으면 아무 생활 주제에서');
  const at = [0, 0, 0, 0];
  for (let s = 1; s <= 4000; s++) at[nonsulBattleQ(topics, played, new Set(), seeded(s)).choices.findIndex((c) => c.ok)]++;
  assert.ok(at.every((n) => n > 800), `정답 자리가 고르게 ${at}`);
  assert.equal(nonsulBattleQ([], {}), null);
  // 쓸 수 없는 주제(반대편 이유 하나뿐 · 독서 논술 · 보기가 겹침)는 건너뛴다
  const broken = [
    { id: 'X1', q: '?', yes: { label: '네요', reasons: ['a', 'b'] }, no: { label: '아니요', reasons: ['c'] }, off: [{ t: 'z' }] },
    { id: 'X2', card: 'K1', q: '?', yes: { label: '네요', reasons: ['a', 'b'] }, no: { label: '아니요', reasons: ['c', 'd'] }, off: [{ t: 'z' }] },
    { id: 'X3', q: '?', yes: { label: '네요', reasons: ['a', 'b'] }, no: { label: '아니요', reasons: ['c', 'a'] }, off: [{ t: 'z' }] },
  ];
  assert.equal(nonsulBattleQ(broken, {}), null);
  assert.equal(nonsulBattleQ([...broken, t1], {}, new Set(), seeded(3)).id.split(':')[0], t1.id);
});

test('⚔️ 문제 풀기 배틀의 말: 기술 단추 「잘 풀면 세게!」 · 졌을 때 「차근차근 풀어 봐요」 — 영어(따라 말하기)는 그대로', () => {
  const [strong, safe] = movesOf(25);
  assert.equal(moveHint(strong, true), '잘 풀면 세게!');
  assert.equal(moveHint(strong, false), '잘 말하면 세게!');
  assert.equal(moveHint(safe, true), safe.hint);
  assert.equal(loseTip(true), '다음엔 차근차근 풀어 봐요');
  assert.equal(loseTip(false), '다음엔 더 또렷하게 말해봐요');
  const b = read('js/battle.js');
  assert.ok(b.includes("btn.appendChild(el('span', 'hint', moveHint(mv, !!ui.o.quiz)));"));
  assert.ok(b.includes('const tip = loseTip(!!o.quiz);'));
  assert.equal(b.split('${tip}').length - 1, 2, '세 번 져 떠날 때 · 패배 n/3 둘 다');
  assert.ok(!/또렷하게 말해봐요`/.test(b), '진 화면 글에 박힌 말이 남지 않게');
  assert.ok(b.includes('const trainer = o.trainer || TRAINERS['), '단추에 보인 트레이너가 배틀에도');
});

test('⚔️ 화면 연결: 끝 화면에 가끔 단추 · ⏳ 국어 시간 · 누를 때 하루 몫 · 그 화면을 떠났거나 다른 창이 뜨면 몫을 돌려줌 · 한 번만 · 뒤 화면 막기', () => {
  const v = read('js/korbattleview.js');
  // ⏳ 국어 시간이 다 됐으면 잠금 화면부터 — 허락된 뒤에야 한 번 누름으로 친다 (Codex 129차 #5)
  assert.ok(v.includes("    if (offer.used || ctx.busy()) return;"), '🎯 잡기 준비 중엔 안 눌림');
  assert.ok(v.includes("    guardStart('korean', () => {\n      if (offer.used || !ctx.live()) return;\n      offer.used = true;"), '시간 관문 뒤에 한 번');
  assert.ok(v.includes("won = (await claimDailyCount(day, 'battles', BATTLE.maxPerDay)).won;"), '누를 때 선점 — 영어·수학과 같은 칸');
  assert.ok(v.includes("if (!won) { toast('⚔️ 오늘 배틀은 다 했어요 — 내일 또 만나요'); after(); return; }"));
  // 선점을 기다리는 사이 (Codex 129차 #1·#4)
  assert.ok(v.includes('if (!view || view.hidden || !ctx.live()) { await giveBack(day); after(); return; }'), '떠났으면 돌려주고 단추를 치움');
  assert.ok(v.includes('if (ctx.busy() || overlayOpen()) { await giveBack(day); offer.used = false; btn.disabled = false; return; }'), '잡기·다른 창이면 돌려주고 단추는 남김');
  assert.ok(v.includes("return releaseDailyCount(day, 'battles').catch(() => null);"));
  for (const id of ['catch', 'hatch', 'timeup', 'battle']) assert.ok(new RegExp(`\\[[^\\]]*'${id}'[^\\]]*\\]\\s*\\n?\\s*\\.some`).test(v), `겹치지 않을 창 ${id}`);
  assert.ok(v.includes('try { openBattle(o); } catch (e) { view.inert = false; await giveBack(day); throw e; }'), '열다가 깨져도 뒤 화면을 푼다');
  assert.ok(v.includes('view.inert = true;') && v.includes('      view.inert = false;\n      applyResult(r);\n      after();'));
  assert.ok(v.includes('palCount: () => inventory()[CALL_PAL.id] || 0,') && v.includes('usePal: () => consumeItem(CALL_PAL.id),'), '📣도 쓸 수 있다');
  assert.ok(v.includes("quiz: (box, hooks) => battleQuiz(box, hooks, () => offer.getQ(seen), seen),"));
  assert.ok(v.includes("if (forced() ? n >= BATTLE.maxPerDay : !offerRoll({ todayBattles: n, max: BATTLE.maxPerDay })) return null;"));
  assert.ok(v.includes('if (typeof getQ !== \'function\' || !getQ(new Set())) return null;'), '문제를 못 내면 단추도 없다');
  assert.ok(v.includes('if (!opponent || !battleMons(chars).length) return null;'));
  assert.ok(v.includes("hooks.register(() => finish({ correct: false, skipped: false, interrupted: true }))"), '화면 꺼짐은 없던 턴');
  assert.ok(v.includes("else if (r.my) {\n    const l = await battleLoss(r.my.id, BATTLE.lossesToLose)"), '패배는 처음 내보낸 포켓몬만');
  assert.ok(!/from '\.\/(koreanview|nonsulview)\.js'/.test(v), '부르는 쪽을 import하지 않는다');
  // 📚 국어 — 저장된 글 끝, 그 사이 다른 글로 가지 않았을 때만 · 단추는 그 끝 화면이 떠 있을 때만 · 잡기와 겹치지 않게
  const k = read('js/koreanview.js');
  assert.ok(k.includes("rollOffer('korean', () => korWordsSource()).then((b) => {\n      if (b && ui.read === r && r.result === res) { r.battle = b; renderQ(); }"));
  assert.ok(k.includes("  if (res.ok && r.battle) { // ⚔️ 배틀 단추 (v325)") && k.includes('  const cb = catchBtnEl(); // 🎯 별을 받았으면 국어 포켓몬 잡기\n  if (cb) box.appendChild(cb);\n  if (res.ok && r.battle) {'), '끝 화면 🎯 잡기 밑에 단추');
  assert.ok(k.includes("offerEl(offer, 'view-korean', () => { r.battle = null; if (ui.read === r) renderQ(); }, { live: () => ui.read === r && r.battle === offer, busy: () => !!ui.catching })"));
  assert.ok(k.includes('if (isBattleOpen()) { await st.hold.refund(korGiveBack); done(); return; }'), '🎯 기회를 뺀 사이 배틀이 열렸으면 돌려준다');
  // 🖊️ 논술 — 저장된 한 판 끝
  const n = read('js/nonsulview.js');
  assert.ok(n.includes("rollOffer('nonsul', () => (seen) => nonsulBattleQ(S.list, nonsulMap(), seen)).then((b) => {\n      if (b && S.r === r && r.result === res) { r.battle = b; if (nonsulVisible()) renderRound(); }"));
  assert.ok(n.includes('  if (cb) box.appendChild(cb);\n  if (res.ok && r.battle) { // ⚔️ 배틀 단추 (v325)'), '끝 화면 🎯 잡기 밑에 단추');
  assert.ok(n.includes("offerEl(offer, 'view-nonsul', () => { r.battle = null; if (S.r === r && nonsulVisible()) renderRound(); }, { live: () => S.r === r && r.battle === offer, busy: () => !!S.catching })"));
  assert.ok(n.includes('if (isBattleOpen()) { await st.hold.refund(giveBack); done(); return; }'));
  // 오프라인 — 앱 셸에 두 파일
  const sw = read('sw.js');
  for (const f of ['./js/korbattle.js', './js/korbattleview.js']) assert.ok(sw.includes(`'${f}',`), f);
});
