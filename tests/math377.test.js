// 🔢 수학 「첫 문제 덜 무섭게」 (v377 · 2026-11-01 기본안 「추천대로」) — node --test tests/math377.test.js
//  ① 개념 편의 첫 오답은 가볍게: 「괜찮아요! 💪 하나는 틀려도 돼요」 · 정답 · 비슷한 문제 단추만 — 📚 배움 한 장·풀이는 눌러야 펼침
//  ② 🙈 틀린 이유는 비슷한 문제를 푼 뒤에(배움 한 장 길은 v302처럼 묻지 않음) · 실수(s)면 비슷한 문제 결과로 확인
//  ③ ⛺ 이어 하기: ←로 나가도 개념 편은 그 자리에(같은 날 같은 칸을 열면 같은 문제에서) · 앱을 닫으면 그만둠으로 정리하되
//     확인 편이어도 칸·일정 그대로(일지 rq · 연 날 rec.tq만 연습 — 그만두고 새로 뽑아 통과하는 꾀는 그대로 막힘)
//  ④ 🎣 낚시터의 「이미 배운 수학」을 칸별로 📤에
//  ⑤ 몸풀기 한 문제·다시 맞히면 보상은 이번엔 안 함
import { fakeIdb } from './fakeidb.js'; // ★ db.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyQuit, applyRound, quitToday, reviewKeep, stageIcon, ladderOf, STEMS } from '../js/mathprog.js';
import { emptyMath, mergeDailyDelta, mergeMath } from '../js/db.js';
import { fishMathKey, fishMathByConcept, lakeDayLine } from '../js/fishing.js';

void fakeIdb;
const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const body = (src, head) => { const i = src.indexOf(head); assert.ok(i >= 0, head); return src.slice(i, src.indexOf('\n}\n', i)); };
const T = '2026-11-01';
const T1 = '2026-11-02';
const [ID] = STEMS.fraction.list.map((c) => c.id);
const dueRec = (o = {}) => ({ done: true, box: 2, dueAt: '2026-10-30', passes: 3, fails: 0, lastAt: 1, schedAt: 1, ...o });
const ok = (key) => ({ k: 'calc', ok: 1, key });
const no = (key) => ({ k: 'calc', ok: 0, key, tag: '분모끼리 더함' });

test('⛺ quitToday · 사다리: 오늘 확인 편을 틀린 뒤 그만둔 칸은 오늘 확인 차례가 아니다(☀️도 안 뽑음) · 내일은 다시 차례 · 칸은 그대로', () => {
  const m = emptyMath();
  m.concepts[ID] = dueRec();
  assert.equal(ladderOf(m, T, 'fraction').find((x) => x.id === ID).due, true, '그만두기 전엔 차례');
  applyQuit(m, { rid: 1, id: ID, mode: 'review', d: T, n: 4, due: 1, qs: [no('A')] }, T);
  assert.deepEqual([quitToday(m.concepts[ID], T), quitToday(m.concepts[ID], T1), quitToday(undefined, T)], [true, false, false]);
  assert.equal(ladderOf(m, T, 'fraction').find((x) => x.id === ID).due, false, '오늘은 차례가 아님');
  assert.equal(ladderOf(m, T1, 'fraction').find((x) => x.id === ID).due, true, '내일 다시 차례');
  assert.deepEqual([reviewKeep(m.concepts[ID], T), reviewKeep(m.concepts[ID], T1)], [null, stageIcon(m.concepts[ID])]);
  // 오늘 새 편 4/4 → 연습(칸 그대로) · 내일 4/4 → 확인 통과(한 칸 오름)
  const r = applyRound(m, ID, { correct: 4, total: 4, missTags: [], qs: [ok('A'), ok('B'), ok('C'), ok('D')], mode: 'review', rid: 2, day: T }, T);
  assert.deepEqual([r.practice, r.review, m.concepts[ID].box], [true, false, 2]);
  const r2 = applyRound(m, ID, { correct: 4, total: 4, missTags: [], qs: [ok('A'), ok('B'), ok('C'), ok('D')], mode: 'review', rid: 3, day: T1 }, T1);
  assert.deepEqual([r2.review, r2.passed, m.concepts[ID].box], [true, true, 3]);
});

test('⛺ Codex 181차: 늦게 정리된 지난 편이 오늘 표시를 지우지 않는다 · 합치기는 늦은 날 쪽(두 방향) — 같은 날 다시 뽑아 통과하는 길이 안 열린다', () => {
  const Y = '2026-10-31';
  const m = emptyMath();
  m.concepts[ID] = dueRec();
  applyQuit(m, { rid: 11, id: ID, mode: 'review', d: T, n: 4, due: 1, qs: [no('A')] }, T); // 오늘 편 그만둠
  applyQuit(m, { rid: 12, id: ID, mode: 'review', d: Y, n: 4, due: 1, qs: [no('A')] }, T); // 어제 연 창을 오늘 그만둠
  assert.equal(m.concepts[ID].tq, T, '오늘 표시 그대로');
  const r = applyRound(m, ID, { correct: 4, total: 4, missTags: [], qs: [ok('A'), ok('B'), ok('C'), ok('D')], mode: 'review', rid: 13, day: T }, T);
  assert.deepEqual([r.review, m.concepts[ID].box], [false, 2], '오늘은 여전히 연습');
  // 합치기 — 그만둔 사실을 모르는 사본이 더 늦게 활동했어도
  const a = emptyMath(); a.concepts[ID] = dueRec({ tq: T, lastAt: 5 });
  const b = emptyMath(); b.concepts[ID] = dueRec({ lastAt: 9 });
  const c = emptyMath(); c.concepts[ID] = dueRec({ tq: Y, lastAt: 9 });
  for (const mm of [mergeMath(a, b), mergeMath(b, a), mergeMath(a, c), mergeMath(c, a)]) assert.equal(mm.concepts[ID].tq, T);
  assert.equal('tq' in mergeMath(b, b).concepts[ID], false, '둘 다 없으면 없음');
  const after = emptyMath(); after.concepts[ID] = mergeMath(b, a).concepts[ID];
  assert.equal(applyRound(after, ID, { correct: 4, total: 4, missTags: [], qs: [ok('A'), ok('B'), ok('C'), ok('D')], mode: 'review', rid: 14, day: T }, T).review, false);
  // 배틀로 넘어가는 중(moving)엔 세우지 않는다
  assert.ok(read('js/math.js').includes('if (isConceptRound(r) && r.answers.length && !r.saving && !r.moving && r.at < r.qs.length && r.day === todayKey()) {'));
});

test('🎣 fishMathKey · fishMathByConcept: 배운 칸 문제만(m:칸) 한 줄씩 · 줄마다 달라 합집합에서 두 번 안 셈 · 틀린 것이 많은 칸부터 · 📤 낚시 줄에 칸별', () => {
  const k1 = fishMathKey('m:frac.add', true, 1000, () => 0.5);
  assert.match(k1, /^frac\.add\|1\|[0-9a-z]+$/);
  assert.equal(fishMathKey('m:frac.add', false, 1000, () => 0.5).split('|')[1], '0');
  assert.notEqual(fishMathKey('m:frac.add', true, 1000, () => 0.1), fishMathKey('m:frac.add', true, 1000, () => 0.9), '같은 때라도 다른 줄');
  for (const bad of ['', 'e:apple', 'k:K1', 'm:', 'm:a|b', 'm:../x/../y/zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz', null, undefined]) assert.equal(fishMathKey(bad, true, 1), '', String(bad));
  const keys = [fishMathKey('m:a', true, 1, () => 0), fishMathKey('m:a', false, 2, () => 0), fishMathKey('m:b', false, 3, () => 0), fishMathKey('m:b', false, 4, () => 0), fishMathKey('m:c', true, 5, () => 0), 'x|2|1', 'bad', 7];
  assert.deepEqual(fishMathByConcept(keys), [{ id: 'b', ok: 0, n: 2 }, { id: 'a', ok: 1, n: 2 }, { id: 'c', ok: 1, n: 1 }]);
  assert.deepEqual(fishMathByConcept(undefined), []);
  // 하루 기록: 두 기기가 같은 줄을 올려도 한 번 · 다른 줄은 더함
  let d = mergeDailyDelta(null, T, { fishMathKeys: [keys[0], keys[1]] });
  d = mergeDailyDelta(d, T, { fishMathKeys: [keys[1], keys[2]] });
  assert.deepEqual(d.fishMathKeys, [keys[0], keys[1], keys[2]]);
  const line = lakeDayLine({ fishSec: 600, fishCatch: 3, fishMathQ: 3, fishMathOk: 1, fishMathKeys: d.fishMathKeys });
  assert.ok(line.includes(' · 🔢 배운 칸별 a 1/2 · b 0/1'), line); // 틀린 수가 같으면(1·1) 낸 수가 많은 칸부터
  assert.ok(!lakeDayLine({ fishSec: 600, fishCatch: 3 }).includes('🔢'), '없으면 안 붙음');
  const many = Array.from({ length: 10 }, (_, i) => fishMathKey(`m:c${i}`, false, i, () => 0));
  assert.ok(lakeDayLine({ fishSec: 60, fishMathKeys: many }).includes(' 외 2칸'));
});

test('🔗 배선 — 첫 오답 가볍게 · 🙈은 비슷한 문제 뒤 · ⛺ 이어 하기 · 📊 rq · 낚시 기록 · css · sw v377', () => {
  const src = read('js/math.js');
  // ① 첫 오답 = 개념 편 · 비슷한 문제가 나오는 문항 · 앞 문항을 다 맞혔을 때
  assert.ok(src.includes('const soft = !ch.ok && canTwin && isConceptRound(r) && r.answers.slice(0, r.at).every((x) => x && x.correct);'));
  assert.ok(src.includes("if (!kl) fb.appendChild(el('p', 'math-fb soft', '괜찮아요! 💪 하나는 틀려도 돼요.'));"), '💪 말이 있으면 한 번만');
  assert.ok(src.includes("const more = el('button', 'btn math-solve-toggle', '📚 어떻게 푸는지 다시 보기');"));
  assert.ok(src.includes("if (relearn) { if (!a.rl) { a.rl = 1; saveLive(); } more.replaceWith(relearnBox(q, shown, a, relearn, null)); }"), '배움 한 장은 펼쳤을 때만 rl');
  assert.ok(src.includes("soft ? '비슷한 문제로 다시 해 보기 →' : canTwin ?"));
  assert.ok(src.includes('if (!ch.ok && !light(r) && !relearn && !soft) {'), '첫 오답 자리에서는 🙈 안 물음');
  assert.ok(src.includes('if (!relearn) a.whyLater = 1;'), '배움 한 장 길은 v302처럼 안 물음');
  // ② 비슷한 문제 화면에서 🙈 — 고를 때까지 다음 잠김 · 실수면 결과로 확인
  const pt = body(src, 'function paintTwin(');
  assert.ok(pt.includes('if (a0 && a0.whyLater && !light(r)) {') && pt.includes('next.disabled = true;') && pt.includes("fb.appendChild(whyBlock(a0, next, () => settleWhyLater(r, t, a0), way));"));
  assert.ok(pt.indexOf('fb.appendChild(whyBlock(') < pt.indexOf('fb.appendChild(next);'), '단추 앞에');
  const sw = body(src, 'function settleWhyLater(');
  assert.ok(sw.includes("if (a.w !== 's') return;") && sw.includes('a.sv = ok ? 1 : 0;') && sw.includes('r.missTags.splice(k, 1)'));
  assert.ok(src.includes("afterOk: '🙈 실수라고 했어요 — 비슷한 문제를 맞혔어요.'") && src.includes("afterNo: '🙈 실수라고 했어요 — 비슷한 문제도 틀려서"));
  // ③ ⛺ 이어 하기 — ←는 parkRound · 같은 날 같은 칸이면 이어 감(새 문제 안 뽑음) · 다른 칸이면 그만둠 · 정리에서 빼기
  assert.ok(src.includes("if (back) back.addEventListener('click', () => { parkRound(); ui.round = null;"));
  const pr = body(src, 'function parkRound(');
  assert.ok(pr.includes('if (isConceptRound(r) && r.answers.length && !r.saving && !r.moving && r.at < r.qs.length && r.day === todayKey()) {') && pr.includes('ui.parked = r;') && pr.includes('quitLive();'));
  const sr = body(src, 'function startRound(');
  const resume = sr.indexOf("if (pk && pk.id === id && pk.day === todayKey() && !o.again) {");
  assert.ok(resume >= 0 && resume < sr.indexOf('const seed = '), '같은 날·같은 칸만 · 새 문제를 뽑기 전에');
  assert.ok(sr.includes('redrawRound(pk);') && sr.includes('holdRoundLock(pk.rid);') && sr.includes('dropParked();'));
  assert.ok(src.includes('const waiting = Object.values((state && state.lives) || {}).filter((l) => l && !(r && r.rid === l.rid) && !(p && p.rid === l.rid));'));
  assert.ok(body(src, 'function redrawRound(').includes('else renderQuestion(r.answered);'));
  assert.equal(src.split('redrawRound(').length - 1, 3, '정의 · 🎒 복원 · 이어 하기');
  assert.ok(body(src, 'function quitLive(').startsWith('function quitLive(r = ui.round) {'));
  // 📊 · 📋 · 🛡️
  assert.ok(read('js/stats.js').includes("t.rq ? ' — 확인 차례에 틀린 뒤 그만둠(칸 그대로 · 그날은 연습)'"));
  // ④ 낚시 · db
  assert.ok(read('js/lakeview.js').includes("const mk = subj === 'math' && q && !q.fm ? fishMathKey(q.id, ok, Date.now(), Math.random) : '';"));
  assert.ok(read('js/db.js').includes("'useSlots', 'essaySayKeys', 'fishMathKeys',"));
  // css · 판
  assert.ok(read('css/style.css').includes('.math-fb.soft { color: #0f766e; }'));
  assert.ok(+(/const CACHE_VERSION = 'v(\d+)';/.exec(read('sw.js')) || [])[1] >= 377);
});
