// 🎮 국어·논술에 빠진 게임 요소 넷 (v327, 2026-10-23 아버님 "니 추천을 먼저" → 기본안 "이대로") — node --test tests/korgame327.test.js
//  ⚡ 경험치(국어 글·낱말·퍼즐·논술 — 같은 글·주제는 하루 한 번) · 🚀 로켓단(과목 'kor' — 국어 🔤 낱말 뜻 · 논술 이유) ·
//  📣 응원 포켓몬(국어 글 읽기·논술 ② ③) · 🥚 논술 판도 국어 알 하루 칸
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { KOR_XP, korFinishRule, dayNum } from '../js/korean.js';
import { korWordsRule } from '../js/korwords.js';
import { korPuzzleRule, allPuzzles } from '../js/korpuzzle.js';
import { nonsulRule, allTopics } from '../js/nonsul.js';
import { ROCKET, shouldRocket } from '../js/rocket.js';
import { emptyProfile, cloneProfile, emptyDaily } from '../js/db.js';
import { levelUpText } from '../js/korxp.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const json = (f) => JSON.parse(read(f));
const IDS = json('coach/korean/reading.json').cards.map((c) => c.id);
const T0 = new Date(2026, 9, 23, 12, 0, 0).getTime();
const at = (days, h = 12) => new Date(2026, 9, 23 + days, h, 0, 0).getTime();
const pf = (o = {}) => cloneProfile({ ...emptyProfile(), ...o });
const rd = (t, f, n = 3) => ({ t, s: 120, a: 10, n, f, x: 0, e: 0, h: 0, p: 0, m: '' });

test('⚡ 아버님 숫자 그대로 — 글 물음 3 + 다 읽음 10 · 낱말 2 + 5 · 퍼즐 3 + 5 · 논술 15 (+10 한 번도 안 틀림)', () => {
  assert.deepEqual(KOR_XP, { q: 3, card: 10, word: 2, words: 5, puzzle: 3, puzzles: 5, nonsul: 15, nonsulClean: 10 });
});

test('⚡ 글 한 편: 처음 고른 답이 맞은 물음 × 3 + 10 · 같은 글은 하루 한 번 · [다시 저장하기](같은 열쇠)는 0 · 다음 날 다시 읽으면 또 · 별이 없어도', () => {
  const p = pf();
  const r1 = korFinishRule(p, 'K1', T0, {}, IDS, 0, { read: rd(T0 - 60000, 2) });
  assert.equal(r1.xp, 2 * KOR_XP.q + KOR_XP.card, '처음 읽기 — ★');
  assert.equal(korFinishRule(p, 'K1', T0 + 1000, {}, IDS, 0, { read: rd(T0 - 60000, 2) }).xp, 0, '[다시 저장하기] — 같은 열쇠(연 시각)');
  const again = korFinishRule(p, 'K1', at(0, 18), {}, IDS, 0, { read: rd(at(0, 17), 3) });
  assert.equal(again.star, 0);
  assert.equal(again.xp, 0, '같은 날 같은 글을 또 읽으면 0 — 외운 글로 쌓지 않게');
  assert.equal(korFinishRule(p, 'K2', at(0, 18), {}, IDS, 0, { read: rd(at(0, 17), 0) }).xp, KOR_XP.card, '다른 글은 그날도 · 모두 틀려도 다 읽으면 10');
  const next = korFinishRule(p, 'K1', at(1), {}, IDS, 0, { read: rd(at(1) - 60000, 3) });
  assert.equal(next.star, 2);
  assert.equal(next.xp, 3 * KOR_XP.q + KOR_XP.card, '다음 날 다시 읽기(★★)');
  assert.equal(korFinishRule(p, 'K1', at(3), {}, IDS, 0, { read: rd(at(3) - 60000, 1) }).xp, KOR_XP.q + KOR_XP.card, '별이 없는 날의 다시 읽기도 공부');
  assert.equal(korFinishRule(p, 'K1', at(4), {}, IDS).xp, 0, '읽은 줄(opts.read)이 없으면 0');
  assert.deepEqual(korFinishRule(p, 'K999', at(5), {}, IDS, 0, { read: rd(at(5), 3) }), { ok: false, why: 'unknown' });
});

test('⚡ 🔤 낱말 판: 칸을 옮긴 낱말 가운데 맞힌 것 × 2 + 5 · 낡은 판·⭐ 익힌 낱말·[다시 저장]은 0', () => {
  const ids = ['c:비유', 'c:직유', 'c:은유', 'i:발이 넓다'];
  const p = pf();
  const r1 = korWordsRule(p, [{ id: 'c:비유', ok: true, from: 0 }, { id: 'c:직유', ok: false, from: 0 }, { id: 'c:은유', ok: true, from: 0 }], T0, ids);
  assert.equal(r1.xp, 2 * KOR_XP.word + KOR_XP.words);
  // 같은 판을 또 저장(from이 낡음) — 옮긴 낱말이 없어 0
  assert.equal(korWordsRule(p, [{ id: 'c:비유', ok: true, from: 0 }, { id: 'c:은유', ok: true, from: 0 }], T0 + 5, ids).xp, 0);
  // 하나는 낡고 하나는 새 낱말 — 새 것만
  assert.equal(korWordsRule(p, [{ id: 'c:비유', ok: true, from: 0 }, { id: 'i:발이 넓다', ok: true, from: 0 }], T0 + 9, ids).xp, KOR_XP.word + KOR_XP.words);
  // ⭐ 익힌 낱말(칸 5)은 안 옮겨 0
  const q = pf({ korWords: { 'c:비유': { box: 5, due: 0, at: 7, miss: 0, d0: 1 } } });
  assert.equal(korWordsRule(q, [{ id: 'c:비유', ok: true, from: 7 }], T0, ids).xp, 0);
  // 다 틀려도 칸을 옮겼으면 판 끝 5
  assert.equal(korWordsRule(pf(), [{ id: 'c:직유', ok: false, from: 0 }], T0, ids).xp, KOR_XP.words);
});

test('⚡ 🧩 퍼즐 판: ⭐가 된 퍼즐 × 3 + 5 · 이미 ⭐인 퍼즐(연습)·낡은 판은 0', () => {
  const ids = allPuzzles(json('coach/korean/puzzles.json')).slice(0, 3).map((x) => x.id);
  assert.equal(ids.length, 3);
  const p = pf();
  const r1 = korPuzzleRule(p, [{ id: ids[0], ok: true, from: 0 }, { id: ids[1], ok: false, from: 0 }, { id: ids[2], ok: true, from: 0 }], T0, ids);
  assert.equal(r1.xp, 2 * KOR_XP.puzzle + KOR_XP.puzzles);
  assert.equal(korPuzzleRule(p, [{ id: ids[0], ok: true, from: p.korPuzzle[ids[0]].at }], T0 + 5, ids).xp, 0, '⭐ 퍼즐 다시 풀기는 연습');
  assert.equal(korPuzzleRule(p, [{ id: ids[1], ok: true, from: 0 }], T0 + 9, ids).xp, 0, '낡은 판');
  assert.equal(korPuzzleRule(p, [{ id: ids[1], ok: true, from: p.korPuzzle[ids[1]].at }], at(1), ids).xp, KOR_XP.puzzle + KOR_XP.puzzles, '어제 틀린 퍼즐을 오늘 맞힘');
});

test('⚡ 🖊️ 논술 판: 15 · 한 번도 안 틀리면 +10 · 같은 주제는 하루 한 번 · ⭐ 주제(연습)·낡은 판은 0', () => {
  const ids = allTopics(json('coach/korean/nonsul.json')).map((t) => t.id);
  const p = pf();
  assert.equal(nonsulRule(p, { id: 'N1', ok: true, from: 0 }, T0, ids).xp, KOR_XP.nonsul + KOR_XP.nonsulClean);
  assert.equal(nonsulRule(p, { id: 'N1', ok: true, from: p.nonsul.N1.at }, at(1), ids).xp, 0, '⭐ 주제는 연습');
  assert.equal(nonsulRule(p, { id: 'N2', ok: false, from: 0 }, T0 + 5, ids).xp, KOR_XP.nonsul, '틀린 데가 있으면 15');
  assert.equal(nonsulRule(p, { id: 'N2', ok: false, from: p.nonsul.N2.at }, T0 + 9, ids).xp, 0, '같은 주제를 같은 날 다시 — 0');
  assert.equal(nonsulRule(p, { id: 'N2', ok: true, from: p.nonsul.N2.at }, at(1), ids).xp, KOR_XP.nonsul + KOR_XP.nonsulClean, '다음 날 다시 풀어 ⭐');
  assert.equal(nonsulRule(p, { id: 'N3', ok: true, from: 12345 }, at(1), ids).xp, 0, '낡은 판');
});

test('⚡ 레벨 업 알림 글 — 새 포켓몬 수 · 🎁 선물', () => {
  assert.equal(levelUpText(5, 3, { emoji: '🧪', ko: '물약' }), '🎉 레벨 업! Lv.5 — 새 포켓몬 3마리가 나타났어요! 🎁 선물: 🧪 물약!');
  assert.equal(levelUpText(6, 0, null), '🎉 레벨 업! Lv.6');
});

test('🚀 로켓단 국어(kor): 국어 글·논술 판 둘을 끝낸 뒤 · 국어·논술 합쳐 하루 3번(rocketKor — 영어·수학과 따로) · 세 번 이어 맞힌 뒤 · 20분 · 남은 시간 5분', () => {
  assert.equal(ROCKET.minDone.kor, 2);
  assert.equal(ROCKET.field.kor, 'rocketKor');
  const base = { subject: 'kor', doneToday: 2, streak: 3, todayCount: 0, leftSec: 600, lastAt: 0, now: T0, rng: () => 0 };
  assert.equal(shouldRocket(base), true);
  assert.equal(shouldRocket({ ...base, doneToday: 1 }), false, '오늘 둘을 끝낸 뒤');
  assert.equal(shouldRocket({ ...base, streak: 2 }), false, '세 번 이어 맞힌 뒤');
  assert.equal(shouldRocket({ ...base, todayCount: 3 }), false, '하루 3번');
  assert.equal(shouldRocket({ ...base, lastAt: T0 - 19 * 60000 }), false, '20분 간격');
  assert.equal(shouldRocket({ ...base, leftSec: 299 }), false, '남은 시간 5분');
  assert.equal(shouldRocket({ ...base, rng: () => ROCKET.chance }), false, '30%');
  const d = emptyDaily('2026-10-23');
  assert.equal(d.rocketKor, 0, '하루 기록 칸');
  assert.equal(d.nsRounds, 0, '논술 판 수 칸');
});

test('🚀 화면 연결: 처음 고른 답으로 이어진 수 · 다음 단추에서 열기(국어 마지막 물음 뒤엔 안) · 그 화면이 떠 있을 때만 · 오늘 몫과 배틀 기록은 한 트랜잭션 · 그 화면에서 이어 가기', () => {
  const r = read('js/korrocket.js');
  assert.ok(r.includes("rocketAdmit(todayKey(), ROCKET.field.kor, ROCKET.maxPerDay, rocketNew({ subject: 'kor', target: target.id, stem: kind }))"));
  assert.ok(r.includes("if (!b.cur || b.cur.subject !== 'kor' || b.cur.stem !== kind || !visible()) { after(); return; }"), '다른 과목·다른 화면의 배틀은 그 화면에서');
  assert.ok(r.includes("if (!target || !getPartner() || !visible() || overlayOpen()) { after(); return; }"));
  assert.ok(r.includes("if (!shouldRocket({ subject: 'kor', doneToday: d.done, streak: K.streak, todayCount: d.rockets, leftSec, lastAt: rocketLastAt('kor') })) return;"));
  assert.ok(r.includes('K.streak = ok ? K.streak + 1 : 0;'));
  assert.ok(r.includes("const can = (cur) => !!cur && cur.subject === 'kor' && cur.stem === kind && !K.open && !isRocketOpen() && visible() && !busy() && !overlayOpen() && !isLocked('korean');"), '⏳ 시간이 다 됐으면 이어 가지 않는다(수학과 같다)');
  assert.ok(r.includes("    if (!can(rocketCurrent())) return false;\n    const getQ = await quizSource(makeQ);\n    const cur = rocketCurrent();") && r.includes('    if (!getQ || !can(cur)) return false;\n    runKorRocket(cur, true, getQ, after);'), '원천을 받은 뒤 다시 본다 (Codex 131차 #1)');
  assert.ok(r.includes('  const getQ = await quizSource(makeQ);\n  if (!getQ || !visible() || overlayOpen()) { after(); return; }\n  const b = await rocketAdmit('), '새 습격은 원천을 확인한 뒤에 몫 (Codex 131차 #1)');
  assert.ok(r.includes("t.done = Math.max(t.done, ((d && Number(d.korReads)) || 0) + ((d && Number(d.nsRounds)) || 0));"));
  assert.ok(r.includes("if (kind === 'nonsul') applyDailyDelta(t.d, { nsRounds: 1 }).catch(() => {});"));
  assert.ok(r.includes('quiz: (box, hooks) => battleQuiz(box, hooks, () => getQ(seen), seen)'), '배틀과 같은 문제');
  assert.ok(!/from '\.\/(koreanview|nonsulview)\.js'/.test(r));
  const k = read('js/koreanview.js');
  assert.ok(k.includes("if (!st.wrong.length) korRocketTally(true, 'korean');") && k.includes("if (!st.wrong.length) korRocketTally(false, 'korean');"), '처음 고른 답만');
  assert.ok(k.includes("if (!last && korRocketPending('korean')) {\n        next.disabled = true;"), '마지막 물음 뒤에는 안 · 연달아 눌러 건너뛰지 않게');
  assert.ok(k.includes("korRocketAt(r, qi0, { kind: 'korean', visible: () => ui.read === r && koreanVisible(), makeQ: korMakeQ, next: () => { if (ui.read === r && r.qi === qi0) go(); } });"), '끝나면 그 물음 그대로일 때 한 번 (Codex 131차 #2)');
  // 기다림은 읽던 상태에 — 다시 그린 단추도 잠기고 눌리지 않는다 (Codex 131차 #2)
  assert.ok(k.includes('    next.disabled = r.rocketWait === r.qi;\n') && k.includes("next.addEventListener('click', () => {\n      if (r.rocketWait === r.qi) return;"));
  assert.ok(k.includes("if (res && res.ok && res.newRead) korRocketDone('korean');"));
  // 열지 않고 넘어가는 자리에서는 걸어 둔 것을 지운다(수학 advance와 같다) — 안 지우면 다른 화면을 막거나 엉뚱한 때에 열린다
  assert.ok(k.includes('      if (last) korRocketClear();'), '국어 마지막 물음');
  assert.ok(k.includes("  if (korRocketPending('korean')) korRocketClear(); // 🚀 읽던 글을 두고 나간다"), '도감으로');
  assert.ok(read('js/nonsulview.js').includes("  if (korRocketPending('nonsul')) korRocketClear(); // 🚀 판 끝 뒤에는 열지 않는다"), '논술 판 끝');
  assert.ok(read('js/nonsulview.js').includes("'← 그만하고 처음으로', () => { if (korRocketPending('nonsul')) korRocketClear();"), '논술 그만두기');
  assert.ok(read('js/korrocket.js').includes("export function korRocketClear() {\n  K.pending = '';\n}"));
  assert.ok(k.includes("resumeKorRocketIfAny({ kind: 'korean', visible: koreanVisible, busy: () => !!ui.read || anySession() || !!ui.catching || !!ui.wview, makeQ: korMakeQ });"));
  const n = read('js/nonsulview.js');
  assert.ok(n.includes("onAnswer(r, o.k === 'mine');") && n.includes("onAnswer(r, o.k === 'other');"), '② 이유 · ③ 반대 의견');
  assert.ok(n.includes("card.appendChild(nextBtn(r, 'counter'));") && n.includes("card.appendChild(nextBtn(r, 'order'));"));
  assert.ok(n.includes("const b = btn('btn btn-primary btn-big-wide ns-next', '다음 →', (e) => stepNext(r, step, e.currentTarget));\n  b.disabled = !!r.rocketWait;"), '기다리는 동안 다시 그린 단추도 잠김 (Codex 131차 #2)');
  assert.ok(n.includes("function stepNext(r, step, button) {\n  if (r.rocketWait) return;\n  const from = r.step;"));
  assert.ok(n.includes("  if (korRocketPending('nonsul')) {\n    if (button) button.disabled = true; // 연달아 눌러 건너뛰지 않게\n    korRocketAt(r, from, { kind: 'nonsul', visible: () => S.r === r && nonsulVisible(), makeQ: nsMakeQ, next: () => { if (S.r === r && r.step === from) go(); } });"), '걸려 있으면 다음 단추에서 연다 · 끝나면 그 걸음 그대로일 때 한 번');
  assert.ok(n.includes("korRocketDone('nonsul');"));
  assert.ok(n.includes("resumeKorRocketIfAny({ kind: 'nonsul', visible: nonsulVisible, busy: () => !!(S.r && S.r.step !== 'done') || !!S.w || !!S.catching, makeQ: nsMakeQ });"));
  assert.ok(read('js/rewardlog.js').includes('num(d.rocketMath) + num(d.rocketEn) + num(d.rocketKor)'), '📤 로켓단 나온 수에 국어도');
});

test('⚡·🥚·📣 화면 연결: 저장이 되면 경험치(화면이 바뀌었어도) · 끝 화면에 「⚡ 경험치 +N」 · 논술 판도 국어 알 칸 · 응원은 고른 답마다(큰 창이면 비킴) · 화면을 떠나면 지움', () => {
  const k = read('js/koreanview.js');
  assert.ok(k.includes('if (res && res.ok) korGainXp(res.xp);'));
  for (const f of ['js/koreanview.js', 'js/kortabs.js', 'js/korpuzzleview.js']) assert.ok(read(f).includes("if (res.ok && res.xp > 0) box.appendChild(el('p', 'kor-done-line kor-xp', `⚡ 경험치 +${res.xp}`));"), f);
  assert.ok(read('js/kortabs.js').includes('    korGainXp(res.xp);'));
  assert.ok(read('js/korpuzzleview.js').includes('    korGainXp(res.xp);'));
  const n = read('js/nonsulview.js');
  assert.ok(n.includes('    korGainXp(res.xp);'));
  assert.ok(n.includes("if (res.ok && res.xp > 0) box.appendChild(el('p', 'ns-done-line kor-xp', `⚡ 경험치 +${res.xp}`));"));
  assert.ok(n.includes('tickKorDay().then((egg) => { if (egg && egg.ok && S.r === r) { r.egg = egg; if (nonsulVisible()) renderRound(); } }).catch(() => {});'), '🥚 논술 판도');
  assert.ok(n.includes('const eg = eggLine(r.egg);'));
  const x = read('js/korxp.js');
  assert.ok(x.includes('const gift = itemById(lootBox());\n    if (gift) addItem(gift.id);'), '🎁 레벨업 상자 — 영어·수학과 같다');
  // 📣 응원
  // 줄 머리부터 — 조건 뒤에 숨으면(if (false) …) 안 부르는 것이다
  assert.ok(k.includes("\n  korCheer(!o.ok, { subject: 'korean', visible: () => ui.read === r && koreanVisible(), busy: () => !!ui.catching || overlayOpen() || korRocketPending('korean') });"));
  assert.ok(n.includes("\n  korCheer(!ok, { subject: 'nonsul', visible: () => S.r === r && nonsulVisible(), busy: () => !!S.catching || overlayOpen() || korRocketPending('nonsul') });"));
  assert.ok(n.includes("function onAnswer(r, ok) {\n  korRocketTally(ok, 'nonsul');\n  korCheer("), '논술 답마다 이어진 수·응원');
  const c = read('js/korcheer.js');
  assert.ok(c.includes('const mon = pickCheerer(own.length ? own : all, getPartner());'), '그 과목 포켓몬을 먼저');
  assert.ok(c.includes('const walk = () => { cheerWalk(line, gate, show); };'), '실제로 뜰 때만 센다 — 그 순간 화면·큰 창을 다시 보고 (Codex 131차 #3)');
  assert.ok(c.includes('img.onload = () => { if (C.pendingLine === line.ko) walk(); };') && c.includes('if (img.complete) { if (img.naturalWidth === 0) return; walk(); return; }'));
  assert.ok(c.includes('  run(mon, wrong, { visible, busy });'));
  const app = read('js/app.js');
  assert.ok(app.includes("if (name !== 'korean' && name !== 'nonsul') stopKorCheer();"));
  assert.ok(app.includes("if (name !== 'math') stopCheer();"));
  const sw = read('sw.js');
  for (const f of ['./js/korxp.js', './js/korrocket.js', './js/korcheer.js']) assert.ok(sw.includes(`'${f}',`), f);
});
