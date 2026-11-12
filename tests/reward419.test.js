// 🔍 v419 (2026-11-12 「누르기만 하면 보상」 길 점검 → 아버님 「추천대로」) — node --test tests/reward419.test.js
//   🎣 뜰채에서 숫자판 수학을 못 풀면(틀림·🤷) 다음 문제도 수학 — 배운 칸이면 같은 칸·다른 수로 한 번 더(그것도 못 풀면 다른 수학) · 새 물고기면 풀림 ·
//      🤷 뒤 「알겠어요」까지는 낚시 시간이 감(써 보고 틀린 풀이를 읽는 동안만 멈춤) · 📤 🔁 뜰채 한 번 더 N
//   🚚 이사 대작전 수학은 숫자판 · 끝 보상의 💰·스톤은 맞힌 비율 60% 이상이면 전부, 아니면 💰 반·스톤 없음(집 선물·Lv +1·손님은 그대로)
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { netOwe, netGain, NET_MATH_FIRST, AGAIN_BADGE, FISH_AGAIN_Q, lakeDayLine, qFingerprint, redoQueue } from '../js/fishing.js';
import { againMake, redoAsker, startOf } from '../js/lakeview.js';
import { learnedPad } from '../js/lakepad.js';
import { STEMS, STEM_ORDER } from '../js/mathprog.js';
import { MOVE, moveRate, moveFull, moveOf, moveMd, moveStartRule, moveAnswerRule, moveEventRule, pendingEvent } from '../js/moveday.js';
import { JOURNEY, SUBJECTS, journeyOf, rewardRule, questionFrom } from '../js/journey.js';
import { STONES } from '../js/items.js';

void fakeIdb;
const src = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const OPTS = { names: ['피카츄', '리자몽', '개굴닌자'], me: '진우' };

// ───────────── 🎣 뜰채 ─────────────

test('🥅 netOwe — 뜰채에서 숫자판 수학을 틀리거나 🤷 → 배운 칸이면 같은 칸 한 번 더 · 그 한 번 더도 못 풀면 다른 수학 · 수학을 맞히면 풀림', () => {
  const q = { id: 'm:frac.add', lv: 1, qk: '1/4 + 2/4', pad: { spec: {} } };
  assert.deepEqual(netOwe(null, 'net', 'math', q, false), { again: { id: 'm:frac.add', lv: 1, qk: '1/4 + 2/4' } });
  // 한 번 더(again)도 못 풀면 — 같은 칸은 그만, 다른 수학
  assert.deepEqual(netOwe({ again: { id: 'm:frac.add' } }, 'net', 'math', { ...q, again: 1 }, false), { again: null });
  // 🐟 물고기 수학(배운 칸 아님) — 다른 수학
  assert.deepEqual(netOwe(null, 'net', 'math', { pad: { spec: {} }, fm: 1 }, false), { again: null });
  // 수학을 맞히면 풀림 (어느 단계든)
  assert.equal(netOwe({ again: null }, 'net', 'math', q, true), null);
  assert.equal(netOwe({ again: null }, 'fight', 'math', q, true), null);
  // 뜰채가 아니거나 · 보기 문제(숫자판 아님)거나 · 다른 과목이면 그대로
  const owe = { again: null };
  assert.equal(netOwe(null, 'fight', 'math', q, false), null, '뜰채 밖은 안 걸음');
  assert.equal(netOwe(null, 'net', 'math', { id: 'm:frac.add' }, false), null, '보기로 낸 수학은 안 걸음');
  assert.equal(netOwe(owe, 'net', 'english', { id: 'e' }, false), owe, '다른 과목 오답은 빚 그대로');
  assert.equal(netOwe(owe, 'net', 'english', { id: 'e' }, true), owe, '다른 과목을 맞혀도 빚 그대로');
  assert.equal(netOwe(undefined, 'net', 'english', null, true), null);
  // 이상한 칸 id는 같은 칸으로 안 냄
  assert.deepEqual(netOwe(null, 'net', 'math', { ...q, id: 'm:../x y' }, false), { again: null });
  assert.equal(AGAIN_BADGE, '🔁 숫자만 바꿔 한 번 더');
});

/** 숫자판으로 낼 수 있는 배운 칸 하나 + 그 칸의 직접 쓰기 원천 (math.journeyMathSource typed와 같은 꼴) */
function typedConcept() {
  for (const key of STEM_ORDER) {
    const S = STEMS[key];
    for (const c of S.list) {
      const make = (id, seed) => {
        for (let t = 0; t < 6; t++) {
          const q = S.gen.makeQuestion(id, 'calc', ((Number(seed) || 0) + t * 7919) % 2147483647, OPTS);
          if (!q || !Array.isArray(q.choices) || q.choices.filter((x) => x.ok).length !== 1) continue;
          const pad = learnedPad(q, key);
          if (!pad) continue;
          return { id: `m:${id}`, qk: String(q.q), lv: 1, choices: q.choices.map((x) => ({ text: String(x.text), ok: !!x.ok })), pad };
        }
        return null;
      };
      const first = make(c.id, 11);
      if (first && make(c.id, 999331) && make(c.id, 999331).qk !== first.qk) return { id: c.id, first, src: { keys: [c.id], make } };
    }
  }
  return null;
}

test('🔁 againMake — 같은 칸·다른 수(못 푼 문제 글은 피함) · 숫자판 꼴 · 다시 풀기 표시 없이 again · 칸이 이상하면 null', () => {
  const t = typedConcept();
  assert.ok(t, '숫자판으로 낼 배운 칸이 있다');
  const again = { id: t.first.id, lv: 1, qk: t.first.qk };
  for (let seed = 1; seed <= 40; seed++) {
    const q = againMake(t.src, again, seed * 7919);
    if (!q) continue;
    assert.equal(q.id, t.first.id, '같은 칸');
    assert.notEqual(qFingerprint(q.qk), qFingerprint(t.first.qk), '못 푼 그 문제는 아님');
    assert.ok(q.pad && q.pad.spec, '숫자판 꼴');
    assert.equal(q.again, 1);
    assert.equal(q.redo, undefined, '🔁 다시 풀기 줄에 안 섞임');
  }
  // 첫 씨앗이 못 푼 그 글을 또 만들면 다음 씨앗으로 (변이 「못 푼 글 안 피함」)
  const seq = { keys: ['frac.add'], make: (id, seed) => ({ id: `m:${id}`, qk: seed % 2 ? '같은 글' : '다른 글', lv: 1, choices: [{ text: '1', ok: true }, { text: '2', ok: false }], pad: { spec: {} } }) };
  const odd = 1 - (104729 % 2); // 첫 시도 씨앗(seed + 104729)이 홀수가 되게
  assert.equal(againMake(seq, { id: 'm:frac.add', lv: 1, qk: '같은 글' }, odd).qk, '다른 글');
  assert.equal(againMake(seq, { id: 'm:frac.add', lv: 1, qk: '다른 글' }, odd).qk, '같은 글');
  assert.equal(againMake(t.src, { id: 'frac.add', lv: 1, qk: '' }, 1), null, 'm: 없는 id');
  assert.equal(againMake(t.src, null, 1), null);
  assert.equal(againMake({ keys: [], make: () => null }, again, 1), null, '못 만들면 null');
});

test('🔁 redoAsker — ctx.again이 있으면 그 칸을 숫자만 바꿔 먼저(다시 풀기 줄은 안 꺼냄) · 못 만들면 보통 차례 · 수학 아니면 안 씀', () => {
  const t = typedConcept();
  const rq = redoQueue({ same: ['dec.add'] });
  const base = (subj) => ({ id: `base:${subj}` });
  const ask = redoAsker(base, t.src, rq, () => true);
  const q = ask('math', 12345, 1, { fish: 1, stage: 'net', again: { id: t.first.id, lv: 1, qk: t.first.qk } });
  assert.equal(q.id, t.first.id);
  assert.equal(q.again, 1);
  assert.deepEqual(rq.left(), ['dec.add'], '다시 풀기 줄은 그대로');
  assert.equal(ask('english', 1, 1, { fish: 1, again: { id: t.first.id } }).id, 'base:english', '수학이 아니면 again을 안 씀');
  const none = redoAsker(base, { keys: [], make: () => null }, null, () => true);
  assert.equal(none('math', 1, 1, { fish: 1, again: { id: t.first.id, lv: 1, qk: '' } }).id, 'base:math', '못 만들면 보통 차례');
});

test('↩️ 다시 열면 — 뜰채 한 번 더로 낸 수는 수학 차례 자리에서 뺀다 · 📤 🔁 뜰채 한 번 더 N · 하루 칸', () => {
  assert.equal(FISH_AGAIN_Q, 'fishAgainQ');
  assert.equal(startOf({ fishMathQ: 10, fishAgainQ: 3 }).math, 7);
  assert.equal(startOf({ fishMathQ: 10, fishFmQ: 2, fishRedoQ: 1, fishAgainQ: 3 }).math, 4);
  assert.equal(startOf({ fishMathQ: 10, fishAgainQ: 3, fishMathAt: 9 }).math, 9, '넘긴 자리가 더 크면 그 뒤부터(v418)');
  assert.equal(startOf({ fishEnQ: 5, fishAgainQ: 3 }).english, 5, '다른 과목은 그대로');
  assert.match(src('js/db.js'), /'fishAgainQ',/, '하루 칸(maxOf 병합)');
  const d = { fishSec: 600, fishCatch: 3, fishMathQ: 6, fishMathOk: 4, fishPadQ: 5, fishPadOk: 3, fishPadIdk: 1, fishAgainQ: 2 };
  assert.match(lakeDayLine(d), /수학 4\/6\(✍️ 직접 쓰기 3\/5 · 🤷 1 · 🔁 뜰채 한 번 더 2\)/);
  assert.doesNotMatch(lakeDayLine({ ...d, fishAgainQ: 0 }), /뜰채 한 번 더/, '없으면 안 씀');
  assert.match(src('js/upload.js'), /🔁 뜰채 한 번 더 N = 뜰채에서 숫자판 수학을 못 풀어 같은 칸을 숫자만 바꿔 다시 낸 수 — v419부터/);
});

test('🔌 낚시터 잇기 — 뜰채 빚이 있으면 수학부터 · 배운 칸은 ctx.again · 답마다 netOwe · 새 물고기면 풀림 · 카드 머리 · 🤷 뒤엔 시간이 감 · 한 번 더 낸 수 기록', () => {
  const fv = src('js/fishview.js');
  assert.match(fv, /const owe = stage === 'net' && ui\.owe && shares\.math > 0 \? ui\.owe : null;\n\s+if \(owe\) subj = 'math';\n\s+const order = askOrder\(shares, ui\.recent, subj\);/);
  assert.match(fv, /const ctx = \{ fish: ui\.castN, stage, \.\.\.\(owe && owe\.again && s === 'math' \? \{ again: owe\.again \} : \{\}\) \};/);
  assert.match(fv, /h\.onAnswer\(subj, ok, stage, q, [^\n]*\n\s+ui\.owe = netOwe\(ui\.owe, stage, subj, q, ok\);/, '답마다(보기·숫자판 모두 answered를 지남)');
  assert.match(fv, /ui\.castN \+= 1;[^\n]*\n\s+ui\.owe = null;/, '새 물고기면 풀림');
  assert.match(fv, /owe: null,/);
  assert.match(fv, /q\.redo \? redoBadge\(q\.redo\.step\) : q\.again \? AGAIN_BADGE : /);
  assert.match(fv, /answered\(ok, \{ trap: r && r\.trap, how: r \? 'typed' : 'idk' \}\);\n\s+if \(!r\) ui\.padOpen = false;/, '🤷이면 바로 시간이 간다');
  assert.match(fv, /if \(!ui\.dexOpen && !ui\.shopOpen && !ui\.padOpen\) ui\.used \+= activeStep\(/, '써 보고 틀린 풀이를 읽는 동안은 그대로 멈춤');
  const lk = src('js/lakeview.js');
  assert.match(lk, /if \(subj === 'math' && ctx && ctx\.again && mathSrc\) \{\n\s+const q = againMake\(mathSrc, ctx\.again, seed\);\n\s+if \(q\) return q;\n\s+\}\n\s+if \(subj === 'math' && rq && mathSrc && alive\(\)\) \{/, '다시 풀기 줄보다 먼저');
  assert.match(lk, /\.\.\.\(subj === 'math' && q && q\.again \? \{ \[FISH_AGAIN_Q\]: 1 \} : \{\}\)/);
  assert.match(lk, /return redoAsker\(\(subj, seed, lv\) => base\([^\n]*\), srcs && srcs\.math, rq, alive\);/, '한 번 더도 직접 쓰기 원천(srcs.math)으로');
});

test('🥅 netGain (Codex 222차 P2-3) — 못 푼 수학이 남았으면 수학을 맞혀야만 다가옴 · 다른 과목 정답·문제 없음으론 안 다가옴 · 빚이 없으면 예전처럼', () => {
  assert.equal(netGain(true, null), true);
  assert.equal(netGain(false, null), false);
  assert.equal(netGain(null, null), true, '문제 없음은 예전처럼 다가옴');
  assert.equal(netGain(true, { again: null }), false, '수학을 못 만들어 다른 과목을 맞혀도');
  assert.equal(netGain(null, { again: null }), false);
  assert.equal(NET_MATH_FIRST, '🔢 수학을 맞혀야 뜰채가 다가와요');
  const fv = src('js/fishview.js');
  assert.match(fv, /const ok = await ask\('net'\);[\s\S]{0,400}const gain = netGain\(ok, ui\.owe\);\n\s+if \(ok && ui\.owe\) toast\(NET_MATH_FIRST, \d+\);\n\s+if \(ok === null && ui\.owe\) ui\.owe = null;\n\s+ui\.netLeft = netAnswer\(ui\.netLeft, gain\);/);
});

// ───────────── 🚚 이사 대작전 ─────────────

test('🚚 문제 고르기 (Codex 222차 P2-1) — 숫자판 수학(칸 한 바퀴) → 보기 수학 → 다른 과목 · 대여행(opt 없음)은 예전처럼 열둘 · 다음 과목', () => {
  const c = { id: 'abc123def456', at: 0, q: {}, qv: 0, qn: 0 };
  const keys = Array.from({ length: 20 }, (_, i) => `k${i}`);
  const Q = (tag) => ({ tag, choices: [{ text: '1', ok: true }, { text: '2', ok: false }] });
  const english = { keys: ['e'], make: () => Q('english') };
  const plain = { keys, make: () => Q('plain') };
  const none = { keys, make: () => null };
  assert.equal(SUBJECTS[0], 'math', '자리 0은 수학 차례');
  // 숫자판을 못 만들면 — 보기 수학이 다른 과목보다 먼저
  const r1 = questionFrom({ math: none, english }, c, 0, { wide: true, plain });
  assert.deepEqual([r1.subj, r1.q.tag], ['math', 'plain']);
  // 대여행(opt 없음)은 예전처럼 다음 과목
  const r2 = questionFrom({ math: none, english }, c, 0);
  assert.deepEqual([r2.subj, r2.q.tag], ['english', 'english']);
  // 숫자판으로 낼 칸이 열둘 뒤에만 있어도 — wide면 찾음 · 없으면 열둘에서 멈춤
  const tried = [];
  const late = { keys, make: (k) => { tried.push(k); return tried.length > 13 ? Q('typed') : null; } };
  const r3 = questionFrom({ math: late, english }, c, 0, { wide: true, plain });
  assert.deepEqual([r3.subj, r3.q.tag], ['math', 'typed']);
  tried.length = 0;
  assert.equal(questionFrom({ math: late, english }, c, 0).subj, 'english', '대여행은 열둘까지');
  // 수학이 아예 없으면 다른 과목 · 보기 수학 원천이 없어도 됨
  assert.equal(questionFrom({ math: none, english }, c, 0, { wide: true, plain: null }).subj, 'english');
  assert.equal(questionFrom({ english }, c, 0, { wide: true, plain }).subj, 'english');
});

test('🔄 다른 문제 저장 중 숫자판 (Codex 222차 P2-2) — 그 사이 「확인」은 답으로 안 받고 숫자판을 새로 · 저장이 안 되면 같은 문제를 다시', () => {
  const mv = src('js/moveview.js');
  assert.match(mv, /function padRow\(q, done, ready = \(\) => true\) \{/);
  assert.match(mv, /if \(picked\) return;\n\s+if \(!ready\(\)\) \{ box\(\); return; \}\n\s+picked = true;/);
  assert.match(mv, /pad: true, moves: null, [^\n]*\), \(\) => !ui\.busy\);/, '일 숫자판은 저장 중이 아닐 때만');
  assert.match(mv, /if \(r\.why !== 'used'\) renderWork\('다른 문제로 못 바꿨어요\. 이 문제를 풀어 봐요'\);/);
  assert.match(mv, /questionFrom\(typedSrcs\(ui\.src\), c, shift, \{ wide: true, plain: ui\.src && ui\.src\.math \}\)/);
});

test('🚚 맞힌 비율 — 과목 합 · 60% 이상이면 전부 · 낸 문제가 없으면 아님 · 이상한 값은 버림', () => {
  assert.equal(MOVE.fullRate, 0.6);
  assert.equal(MOVE.halfCoins, 250);
  assert.ok(MOVE.halfCoins < JOURNEY.coins);
  assert.deepEqual(moveRate({ math: [3, 5], english: [4, 4] }), { ok: 7, n: 9 });
  assert.deepEqual(moveRate(null), { ok: 0, n: 0 });
  assert.deepEqual(moveRate({ math: 'x', english: [9, 2] }), { ok: 2, n: 2 }, '맞힘이 낸 수보다 크면 낸 수까지');
  assert.equal(moveFull({ math: [3, 5] }), true, '딱 60%');
  assert.equal(moveFull({ math: [2, 4], english: [1, 1] }), true);
  assert.equal(moveFull({ math: [5, 9] }), false, '56%');
  assert.equal(moveFull({ math: [1, 4], english: [1, 4], korean: [1, 4] }), false, '찍기(25%)');
  assert.equal(moveFull({}), false);
});

const NOW = new Date(2026, 10, 14, 12).getTime(); // 11-14 토요일
const PARTY = [66, 25, 7, 1, 4, 74];
const prof = () => ({ coins: 100, coinsEarned: 0, items: {}, mons: {}, caught: Object.fromEntries(PARTY.map((id) => [id, 1])) });
const evs = () => [{ k: 'chest' }, { k: 'prof', m: 25, f: 'type' }, { k: 'fork', alt: 23, g: 0 }, { k: 'chest' }, { k: 'prof', m: 7, f: 'shadow' }, { k: 'fork', alt: 27, g: 1 }];
const cur = (p) => moveOf(journeyOf(p.journey).move);
/** 끝까지 — 맞히기 전에 wrong번씩 틀림 · 🎁 상자는 맞힘(chestOk) */
function run(wrong, chestOk = true) {
  const p = prof();
  assert.equal(moveStartRule(p, { id: 'abc123def456', party: PARTY, guests: [16, 19, 21], ev: evs() }, NOW).ok, true);
  let chest = 0;
  for (let i = 0; i < 2000 && cur(p).phase === 'go'; i++) {
    const m = cur(p);
    const z = pendingEvent(m);
    if (z >= 0) {
      const e = m.ev[z];
      const base = { id: m.id, qn: m.qn, kind: e.k };
      const r = moveEventRule(p, e.k === 'chest' ? { ...base, subj: 'math', correct: chestOk } : e.k === 'prof' ? { ...base, correct: true } : { ...base, pick: m.guests[e.g] });
      chest += r.coins;
      continue;
    }
    for (let w = 0; w < wrong; w++) assert.equal(moveAnswerRule(p, { id: cur(p).id, qn: cur(p).qn, mon: 25, subj: 'english', correct: false }, NOW, () => 'english').ok, true);
    assert.equal(moveAnswerRule(p, { id: cur(p).id, qn: cur(p).qn, mon: 25, subj: 'math', correct: true }, NOW, () => 'english').ok, true);
  }
  assert.equal(cur(p).phase, 'gift');
  return { p, chest };
}
const stones = (p) => STONES.map((s) => Number((p.items || {})[s.id]) || 0);

test('🚚 끝 보상 — 맞힌 비율 60% 이상: 💰 전부·스톤 1개씩 / 아래: 💰 반·스톤 없음 · Lv +1·집 선물은 둘 다 · 받은 것을 기록에', () => {
  const full = run(0);
  assert.equal(full.p.coins, 100 + JOURNEY.coins + full.chest);
  assert.ok(stones(full.p).every((n) => n >= 1), '스톤 1개씩');
  assert.equal(cur(full.p).coins, JOURNEY.coins);
  assert.equal(cur(full.p).full, 1);
  const half = run(1); // 맞히기 전에 한 번씩 틀림 → 50% 남짓
  assert.equal(half.p.coins, 100 + MOVE.halfCoins + half.chest);
  assert.equal(half.p.coinsEarned, MOVE.halfCoins + half.chest);
  const subStones = (cur(half.p).sub || []).length; // Lv 대신 받은 스톤(만렙·진화 레벨)은 Lv +1 몫이라 그대로
  assert.equal(stones(half.p).reduce((a, b) => a + b, 0), subStones, '끝 보상 스톤 1개씩은 없음');
  assert.equal(cur(half.p).coins, MOVE.halfCoins);
  assert.equal(cur(half.p).full, 0);
  assert.deepEqual(cur(half.p).lv, cur(full.p).lv, 'Lv +1은 그대로');
  assert.equal(half.p.items.x_wide, 1, '📐 넓히기');
  assert.equal(half.p.items.x_floor2, 1, '🏗️ 2층');
  // 📤 — 아버님께만(비공개 usage) 맞힌 수와 기준
  assert.match(moveMd(half.p.journey), /- 끝 보상 반 — 💰 250 · 스톤 없음 \(맞힌 \d+\/\d+ · 기준 60%\)/);
  assert.match(moveMd(full.p.journey), /- 끝 보상 전부 — 💰 500 · 스톤 1개씩 \(맞힌 (\d+)\/\1 · 기준 60%\)/);
  const going = prof();
  moveStartRule(going, { id: 'abc123def456', party: PARTY, guests: [16, 19, 21], ev: evs() }, NOW);
  assert.doesNotMatch(moveMd(going.journey), /끝 보상/, '가는 중엔 안 씀');
});

test('🚚 옛 기록(v418까지 — 비율 없이 늘 전부)은 전부로 읽는다 · 받은 💰는 대여행 몫을 넘지 않음 · 대여행 rewardRule은 그대로', () => {
  const { p } = run(0);
  const raw = { ...journeyOf(p.journey).move };
  delete raw.coins;
  delete raw.full;
  const old = moveOf(raw);
  assert.equal(old.coins, JOURNEY.coins);
  assert.equal(old.full, 1);
  assert.equal(moveOf({ ...raw, coins: 99999, full: 0 }).coins, JOURNEY.coins);
  assert.equal(moveOf({ ...raw, coins: 250, full: 0 }).full, 0);
  // 대여행 — opt 없이 예전 그대로
  const q = prof();
  const r = rewardRule(q, { party: PARTY }, () => 'english');
  assert.equal(r.coins, JOURNEY.coins);
  assert.equal(r.stones, true);
  assert.equal(q.coins, 100 + JOURNEY.coins);
  assert.ok(stones(q).every((n) => n >= 1));
  const h = prof();
  const r2 = rewardRule(h, { party: PARTY }, () => 'english', { coins: 250, stones: false });
  assert.equal(r2.coins, 250);
  assert.equal(h.coins, 350);
  assert.equal(stones(h).reduce((a, b) => a + b, 0), r2.sub.length);
  assert.equal(rewardRule(prof(), { party: PARTY }, () => 'english', { coins: -5 }).coins, JOURNEY.coins, '이상한 값은 대여행 몫');
});

test('🔌 이사 화면 잇기 — 수학은 숫자판 먼저(⚙ 스위치) · 일·상자 모두 · 틀리거나 🤷면 정답·풀이를 「알겠어요」까지 · 저장 실패면 다시 · 출발 준비·끝 화면 · sw·판 v419', () => {
  const mv = src('js/moveview.js');
  assert.match(mv, /import \{ mathPadOn, typedSrcs \} from '\.\/lakeview\.js';/);
  assert.match(mv, /const buildQuestion = \(c, shift = 0\) => \(mathPadOn\(\)\n\s+\? questionFrom\(typedSrcs\(ui\.src\), c, shift, \{ wide: true, plain: ui\.src && ui\.src\.math \}\)\n\s+: questionFrom\(ui\.src, c, shift\)\);/);
  assert.match(mv, /onSubmit: \(typed\) => \{ const r = lakeTyped\(q, typed\); settle\(r\.ok, shownTyped\(typed\.text, unit\), r\); \},/);
  assert.match(mv, /onIdk: \(\) => settle\(false, '🤷 모르겠어요', null\),/);
  assert.match(mv, /if \(q\.pad\) \{ \/\/ ✍️ 숫자판 \(v419\) — 저장이 안 되면 같은 상자를 다시\n\s+const pad = padRow\(q, async \(ok, pr\) => \{\n\s+const r = await sendEvent\(run, \{ kind: 'chest', subj, correct: ok \}, \[\], line\);\n\s+if \(!r\) \{ if \(alive\(run\)\) renderChest\(\); return; \}/);
  assert.match(mv, /if \(q\.pad\) \{ \/\/ ✍️ 숫자판 \(v419\)\n\s+const pad = padRow\(q, \(ok, pr\) => answer\(run, \{ subj, q, ok, pr, pad: true, moves: null,/);
  assert.equal((mv.match(/pad\.scrollIntoView\(\{ block: 'nearest' \}\)/g) || []).length, 2, '일·상자 모두 「확인」까지 보이게');
  assert.match(mv, /if \(q\.pad\) arena\.classList\.add\('is-pad'\);/, '숫자판이면 장면을 낮게');
  assert.match(mv, /`정답을 \$\{q\.pad \? '맞히면' : '고르면'\} /, '숫자판엔 「맞히면」');
  assert.match(src('css/style.css'), /\.mvt-arena\.is-pad \{ height: clamp\(/);
  assert.match(mv, /const correct = x\.pad \? !!x\.ok : !!x\.ch\.ok;/);
  assert.match(mv, /if \(x\.pad\) \{ renderWork\('저장이 안 됐어요\. 다시 풀어 봐요'\); return; \}/);
  assert.match(mv, /setDlg\(x\.line, `앗, 미끄러졌다! 괜찮아, 다시 해 보자\.\\n\$\{padWrongLine\(x\.q, x\.pr\)\}`\);\n\s+play\('wrong'\);\n\s+if \(!\(await waitOk\(body\(\), run\)\)\) return;/);
  assert.match(mv, /const why = r \? r\.hint : q\.pad\.why \|\| '';/, '🤷이면 그 문제의 풀이');
  assert.match(mv, /\['💰 코인', `\+\$\{MOVE\.halfCoins\}~\$\{JOURNEY\.coins\}`\], \[STONES\.map\(\(s\) => s\.emoji\)\.join\(''\), '많이 맞히면 \+1씩'\]/);
  assert.match(mv, /천천히 풀어서 많이 맞힐수록 💰·스톤 선물이 커져요\./);
  assert.match(mv, /rw\.appendChild\(rowEl\('💰 코인', `\+\$\{c\.coins\}`\)\);[^\n]*\n\s+if \(c\.full\) rw\.appendChild\(rowEl\(/);
  assert.doesNotMatch(mv, /fullRate|moveRate/, '아이 화면엔 셈·비율을 안 씀');
  const md = src('js/moveday.js');
  assert.match(md, /const full = moveFull\(m\.q\);[^\n]*\n\s+const rw = rewardRule\(p, m, subjectOf, full \? null : \{ coins: MOVE\.halfCoins, stones: false \}\);/);
  assert.match(src('css/style.css'), /\.jr-pad \{ background: var\(--card\);/);
  assert.ok(Number((/CACHE_VERSION = 'v(\d+)'/.exec(src('sw.js')) || [])[1]) >= 419, 'sw v419 이상');
  assert.ok(Number((/APP_VERSION = 'v(\d+)'/.exec(src('js/version.js')) || [])[1]) >= 419, '앱 판 v419 이상');
});
