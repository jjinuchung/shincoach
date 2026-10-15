// 🎯 v247 도전 문제 노가다 탈출구 막기 (2026-10-13, 아버님 "노가다 탈출구 막기·틀린 문제 복기 먼저 하자" — 기본안 1·2)
// 1. 답은 고른 순간 저장(applyChalAnswer) — 틀린 답과 정답을 본 뒤 그만두고 다시 열어 외운 답으로 ✨ 보너스를 받던 길을 막는다
//    ✨ 회차 보너스는 처음 보는 문제를 첫 번에 맞힌 것(clean)만 · 틀렸던 문제(🔁)는 새 문제를 다 낸 뒤에
// 2. 문장·수 보기는 회차마다 차례를 섞는다(shuffleChoices) — "1번부터 차례로"·자리 외우기가 안 통하게
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { REWARD, ROUND_N, setOf, solved, nextItems, nextNo, missed, triesOf, applyChalAnswer, applyChalRound, chalReward, shuffles, shuffleChoices, setNote, checkPart } from '../js/mathchal.js';
import { cloneMath, emptyMath } from '../js/db.js';

const read = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const DATA = JSON.parse(read('coach/math/challenge.json'));
const U3 = setOf(DATA, 'u3');
const U6 = setOf(DATA, 'u6');

/** 화면처럼: 답마다 바로 저장 → 회차 끝에 saved 결과로 보너스 */
function playRound(m, set, answers) {
  const items = nextItems(set, m, ROUND_N);
  let paid = { xp: 0, coin: 0 };
  const results = items.map((it, i) => {
    const ok = answers[i] !== false;
    const a = applyChalAnswer(m, set.id, it.no, ok, set);
    const rw = chalReward({ fresh: a.fresh ? 1 : 0, clean: 0, n: ROUND_N, firstClear: a.firstClear, setN: set.items.length });
    paid = { xp: paid.xp + rw.xp, coin: paid.coin + rw.coin };
    return { no: it.no, ok, saved: true, clean: a.clean };
  });
  const r = applyChalRound(m, set.id, results, set);
  const rw = chalReward({ fresh: r.fresh, clean: r.clean, n: items.length, firstClear: r.firstClear, setN: set.items.length });
  return { nos: items.map((it) => it.no), round: rw.round, xp: paid.xp + rw.xp, coin: paid.coin + rw.coin, clean: r.clean };
}

test('🎯 applyChalAnswer: 고른 순간 푼 횟수 · 처음 맞힘(fresh) · 처음 보는 문제를 첫 번에(clean) · 틀리면 🔁', () => {
  const m = cloneMath(emptyMath());
  const a = applyChalAnswer(m, 'u3', 1, true, U3);
  assert.deepEqual([a.ok, a.fresh, a.clean, triesOf(m, 'u3', 1), solved(m, 'u3', 1)], [true, true, true, 1, true]);
  const b = applyChalAnswer(m, 'u3', 2, false, U3);
  assert.deepEqual([b.ok, b.fresh, b.clean, triesOf(m, 'u3', 2), missed(m, 'u3', 2)], [false, false, false, 1, true]);
  const c = applyChalAnswer(m, 'u3', 2, true, U3); // 틀렸던 문제를 다시 맞힘
  assert.deepEqual([c.fresh, c.clean, missed(m, 'u3', 2), triesOf(m, 'u3', 2)], [true, false, false, 2], '문제 보상은 있지만 ✨에는 안 센다');
  const d = applyChalAnswer(m, 'u3', 1, true, U3); // 이미 맞힌 문제
  assert.deepEqual([d.fresh, d.clean], [false, false]);
  // 규칙은 복사본만 고친다
  const src = cloneMath(emptyMath());
  const copy = cloneMath(src);
  applyChalAnswer(copy, 'u3', 1, true, U3);
  assert.equal(solved(src, 'u3', 1), false);
});

test('★ 🎯 노가다 길이 막혔다: 5번을 틀리고 그만둔 뒤 다시 열어도 ✨ 보너스 없음 · 맞힌 1~4번은 그대로 남는다', () => {
  // 예전: 회차 끝에만 적어서, 그만두면 아무것도 안 남고 다시 열면 1~5번이 모두 "처음" → 외운 답으로 ✨
  const m = cloneMath(emptyMath());
  for (const no of [1, 2, 3, 4]) applyChalAnswer(m, 'u3', no, true, U3);
  applyChalAnswer(m, 'u3', 5, false, U3);
  // (그만둠 — 회차 끝 저장 없음)
  for (const no of [1, 2, 3, 4]) assert.equal(solved(m, 'u3', no), true, `${no}번은 그만둬도 남는다`);
  assert.equal(missed(m, 'u3', 5), true, '5번은 틀린 것으로 남는다');
  // 다시 열면 새 문제 6~10번 — 1~4번을 외운 답으로 다시 낼 수 없다
  assert.deepEqual(nextItems(U3, m, 5).map((it) => it.no), [6, 7, 8, 9, 10]);
  // 5번이 다시 나오는 회차는 다 맞혀도 ✨ 없음 (문제 보상만)
  for (const no of [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]) applyChalAnswer(m, 'u3', no, true, U3);
  const last = playRound(m, U3, [true]);
  assert.deepEqual(last.nos, [5]);
  assert.equal(last.round, false);
  assert.equal(last.xp, REWARD.item.xp + REWARD.set.xp, '틀렸던 문제도 처음 맞히면 문제 보상은 그대로 (마지막 문제라 🏅 단원 완주도 이 답에서)');
});

test('★ 🎯 회차 보너스: 처음 보는 5문제를 한 번에 다 맞히면 ✨ · 하나 틀리면 그 회차만 없고 다음 새 회차는 다시 받을 수 있다', () => {
  const m = cloneMath(emptyMath());
  const r1 = playRound(m, U3, [true, true, false, true, true]);
  assert.deepEqual([r1.nos, r1.round, r1.clean], [[1, 2, 3, 4, 5], false, 4]);
  assert.equal(r1.xp, 4 * REWARD.item.xp);
  const r2 = playRound(m, U3, [true, true, true, true, true]);
  assert.deepEqual([r2.nos, r2.round, r2.clean], [[6, 7, 8, 9, 10], true, 5], '틀린 3번이 끼지 않아 다음 회차 ✨');
  assert.equal(r2.xp, 5 * REWARD.item.xp + REWARD.round.xp);
  playRound(m, U3, [true, true, true, true, true]);
  playRound(m, U3, [true, true, true, true, true]);
  const r5 = playRound(m, U3, [true]);
  assert.deepEqual([r5.nos, r5.round], [[3], false], '🔁 틀렸던 3번은 맨 뒤에, 보너스 없이');
});

test('★ 🎯 새 문제가 남아 있으면 회차는 새 문제만 — 5개가 안 돼도 🔁 문제를 섞지 않는다 · 짧은 회차도 다 맞히면 ✨ (Codex 59차 #4)', () => {
  // Codex 재현: 11번을 틀리고 12~17번을 맞힌 뒤 18~20번이 남으면 [18, 19, 20, 11]이 돼서 11번이 ✨를 막았다
  const m = cloneMath(emptyMath());
  applyChalAnswer(m, 'u6', 11, false, U6);
  for (const no of [12, 13, 14, 15, 16, 17]) applyChalAnswer(m, 'u6', no, true, U6);
  const r = playRound(m, U6, [true, true, true]);
  assert.deepEqual([r.nos, r.clean, r.round], [[18, 19, 20], 3, true]);
  assert.deepEqual(nextItems(U6, m, ROUND_N).map((it) => it.no), [11], '그다음이 🔁 회차');
  // 5문제 미만 단원은 짧은 회차여도 ✨ 없음 (v246 그대로)
  const U5B = setOf(DATA, 'u5b');
  const m2 = cloneMath(emptyMath());
  assert.equal(playRound(m2, U5B, [true, true]).round, false);
});

test('🎯 applyChalRound: 고른 순간 저장된 답(saved)은 다시 적지 않는다 · 저장 못 한 답만 적고 그 보상을 센다', () => {
  const m = cloneMath(emptyMath());
  const a = applyChalAnswer(m, 'u3', 1, true, U3);
  const r = applyChalRound(m, 'u3', [{ no: 1, ok: true, saved: true, clean: a.clean }, { no: 2, ok: true }], U3);
  assert.equal(triesOf(m, 'u3', 1), 1, '저장된 답은 한 번만');
  assert.equal(triesOf(m, 'u3', 2), 1, '저장 못 한 답은 여기서');
  assert.deepEqual([r.fresh, r.clean, r.correct], [1, 2, 2], 'fresh는 여기서 적은 몫만 · clean은 회차 전체');
  assert.equal(m.chal.rounds, 1);
});

test('🎯 chalReward: clean이 회차 수에 모자라면 ✨ 없음 · 답마다 부를 때(clean 0)는 문제 보상만 · clean을 안 주면 예전처럼 fresh로', () => {
  assert.equal(chalReward({ fresh: 5, clean: 4, n: 5 }).round, false);
  assert.equal(chalReward({ fresh: 0, clean: 5, n: 5 }).round, true, '회차 끝: 문제 보상은 이미 줬고 보너스만');
  assert.deepEqual([chalReward({ fresh: 0, clean: 5, n: 5 }).xp, chalReward({ fresh: 0, clean: 5, n: 5 }).stone], [REWARD.round.xp, 1]);
  const one = chalReward({ fresh: 1, clean: 0, n: 5 });
  assert.deepEqual([one.xp, one.coin, one.round, one.stone, one.throws], [REWARD.item.xp, REWARD.item.coin, false, 0, 0]);
  assert.equal(chalReward({ fresh: 5, n: 5 }).round, true, '옛 부름');
  // 답한 순간 단원을 다 풀면 🏅는 그 답에서
  const m = cloneMath(emptyMath());
  for (const it of U6.items.slice(0, -1)) applyChalAnswer(m, 'u6', it.no, true, U6);
  const a = applyChalAnswer(m, 'u6', 20, true, U6);
  assert.equal(a.firstClear, true);
  const g = chalReward({ fresh: 1, clean: 0, n: ROUND_N, firstClear: a.firstClear, setN: U6.items.length });
  assert.deepEqual([g.set, g.ball, g.xp, g.round], [true, true, REWARD.item.xp + 150, false]);
  assert.equal(applyChalAnswer(m, 'u6', 20, true, U6).firstClear, false, '🏅는 한 번');
});

test('🔀 보기 섞기: 문장·수 보기만 · 같은 씨앗이면 같은 차례 · 보기는 그대로(차례만) · 정답 자리가 고정되지 않는다', () => {
  const part = U6.items.find((it) => it.no === 20).parts[0];
  assert.equal(shuffles(part), true);
  const a = shuffleChoices(part, 12345);
  assert.deepEqual(shuffleChoices(part, 12345), a, '같은 씨앗 → 같은 차례 (🎒에 다녀와도 그대로)');
  assert.deepEqual([...a].sort(), [...part.choices].sort(), '보기는 그대로');
  assert.deepEqual(part.choices[0].slice(0, 1), '①', '원본은 안 바뀐다');
  // 짧은 이름 보기·순서 놓기·숫자 칸은 그대로
  for (const no of [11, 13, 17, 18]) {
    const p = U6.items.find((it) => it.no === no).parts[0];
    assert.deepEqual(shuffleChoices(p, 999), p.choices, `${no}번 짧은 보기는 그대로`);
  }
  assert.equal(shuffles({ input: 'choice', choices: ['월요일', '화요일', '수요일'] }), false, '요일');
  assert.equal(shuffles({ input: 'choice', keepOrder: true, choices: ['긴 문장 하나예요', '긴 문장 둘이에요'] }), false, 'keepOrder');
  assert.equal(shuffles({ input: 'order', choices: ['긴 문장 하나예요', '긴 문장 둘이에요'] }), false, '순서 놓기');
  assert.equal(shuffles({ input: 'num', answer: '3' }), false);
  // 섞는 칸마다 정답이 여러 자리에 온다 — "몇 번째를 누르면 된다"를 외울 수 없게
  for (const set of DATA.sets) {
    for (const it of set.items) {
      it.parts.forEach((p, i) => {
        if (!shuffles(p)) return;
        const want = Array.isArray(p.answer) ? p.answer[0] : p.answer;
        const pos = new Set();
        for (let s = 1; s <= 200; s++) pos.add(shuffleChoices(p, s * 7919 + it.no).indexOf(String(want)));
        assert.ok(pos.size >= Math.min(p.choices.length, 3), `${set.id}-${it.no} 칸 ${i}: 정답 자리 ${[...pos]}`);
        assert.ok(!pos.has(-1));
        // 섞어도 채점은 보기 글로 — 정답 글을 고르면 맞는다
        if (p.input === 'choice') assert.equal(checkPart(p, shuffleChoices(p, 77)[shuffleChoices(p, 77).indexOf(p.answer)]), true);
      });
    }
  }
});

test('🎯 사다리 한 줄: 틀렸던 문제가 있으면 "🔁 틀렸던 문제도 다시 나와요" — 번호·수는 쓰지 않는다(v260) · 다음은 틀렸던 문제', () => {
  const m = cloneMath(emptyMath());
  applyChalAnswer(m, 'u6', 11, false, U6);
  assert.equal(setNote(m, U6), '이어서 풀어요 · 🔁 틀렸던 문제도 다시 나와요', '틀리기만 했어도 처음부터가 아니다');
  for (const it of U6.items.filter((x) => x.no !== 11)) applyChalAnswer(m, 'u6', it.no, true, U6);
  assert.equal(nextNo(U6, m), 11);
  assert.equal(setNote(m, U6), '이어서 풀어요 · 🔁 틀렸던 문제도 다시 나와요');
  assert.doesNotMatch(setNote(m, U6), /\d/, '수가 없다');
});

test('🎯 화면: 고른 답을 **저장한 뒤에** 정답 · 저장이 안 되면 💾 다시 저장(정답은 안 보임) · 회차 끝 저장 실패도 회차를 두고 💾 · 남의 회차를 닫지 않는다 · 보기 섞기 · 🔁 (Codex 59차 #1~#3)', () => {
  const math = read('js/math.js');
  const ans = math.slice(math.indexOf('function answerChal(given) {'), math.indexOf('function renderChalUnsaved() {'));
  assert.ok(ans.includes('saveChalAnswer(c);'));
  const save = ans.slice(ans.indexOf('async function saveChalAnswer(c) {'));
  assert.ok(save.includes('const result = applyChalAnswer(s, set.id, res.no, res.ok, set);'), '고른 순간 저장');
  assert.ok(save.includes('chalReward({ fresh: result.fresh ? 1 : 0, coin: result.coin, clean: 0, n: CHAL_N,'), '답마다는 ✨ 없이');
  const iCommit = save.indexOf('await commitChalRound(');
  const iShow = save.indexOf('renderChalA();');
  assert.ok(iCommit > 0 && iShow > iCommit, '★ 정답 화면은 저장이 끝난 뒤');
  assert.ok(save.indexOf("c.phase = 'saving1';") < iCommit && save.indexOf("'기록하는 중…'") < iCommit, '저장하는 동안은 기록하는 중');
  assert.ok(save.indexOf('if (ui.chal !== c) return;') > iCommit && save.indexOf('if (ui.chal !== c) return;') < iShow, '그 사이 나갔으면 남의 화면을 안 그린다');
  assert.ok(save.includes("if (!saved.ok) { c.phase = 'unsaved'; renderChalUnsaved(); return; }"), '실패면 정답 대신 💾');
  assert.ok(save.indexOf('sfx.ding()') > iCommit, '맞고 틀림 소리도 저장 뒤');
  const uns = math.slice(math.indexOf('function renderChalUnsaved() {'), math.indexOf('function renderChalEndFail() {'));
  assert.ok(uns.includes("if (ui.chal === c && c.phase === 'unsaved') saveChalAnswer(c);") && !uns.includes('chal-answer'), '💾 다시 저장 · 정답은 안 보인다');
  const fin = math.slice(math.indexOf('async function finishChal() {'), math.indexOf('function startSpecial() {'));
  const iRound = fin.indexOf('const saved = await commitChalRound(');
  const iOwn = fin.indexOf('if (ui.chal !== c) return;');
  const iFail = fin.indexOf("if (!saved.ok) { c.phase = 'unsavedEnd'; renderChalEndFail(); return; }");
  const iEnd = fin.indexOf('endChal();');
  assert.ok(iRound > 0 && iOwn > iRound && iFail > iOwn && iEnd > iFail, '★ 남의 회차면 그만 → 실패면 회차를 두고 💾 → 그다음에야 닫기');
  assert.ok(fin.includes('clean: result.clean'));
  assert.ok(fin.includes('const got = [...results.filter((x) => x.saved && x.reward).map((x) => x.reward), saved.reward];'), '얻은 것 = 답마다 + 회차 끝');
  assert.ok(fin.includes('✨ 처음 보는 ${n}문제를 한 번에 모두 맞혀서'));
  assert.ok(fin.includes('🔁 틀렸던 문제 ${retried}개를 다시 맞혔어요!'));
  const endFail = math.slice(math.indexOf('function renderChalEndFail() {'), math.indexOf('function chalGainText(res) {'));
  assert.ok(endFail.includes("if (ui.chal === c && c.phase === 'unsavedEnd') finishChal();"));
  const resume = math.slice(math.indexOf('function resumeChal() {'), math.indexOf('function answerChal(given) {'));
  assert.ok(resume.includes("c.phase === 'saving1'") && resume.includes("if (c.phase === 'unsaved') renderChalUnsaved();") && resume.includes("else if (c.phase === 'unsavedEnd') renderChalEndFail();"), '🎒에 다녀와도 저장 중·실패 화면 그대로');
  const q = math.slice(math.indexOf('function renderChalQ() {'), math.indexOf('function resumeChal() {'));
  assert.ok(q.includes('shuffleChoices(p, (c.seed || 0) + item.no * 7919 + i * 104729)'), '보기 섞기 (회차 씨앗)');
  assert.ok(q.includes("' · 🔁 틀렸던 문제'"));
  const a = math.slice(math.indexOf('function renderChalA() {'), math.indexOf('async function finishChal() {'));
  assert.ok(a.includes("'🔁 이 문제는 나중에 다시 나와요 — 풀이를 잘 읽어 두세요'") && a.includes('const gain = chalGainText(r);'));
  assert.ok(math.includes('seed: Date.now() % 2147483647, again: items.map((it) => chalMissed(ui.state, set.id, it.no))'));
  assert.ok(read('css/style.css').includes('.chal-gain {'));
  assert.ok(+(/const CACHE_VERSION = 'v(\d+)';/.exec(read('sw.js')) || [])[1] >= 247, 'sw v247 이상');
});
