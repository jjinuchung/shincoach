// 🖊️ 논술 v303 (2026-10-20, 아버님 "논술 과목을 한 번 만들어볼까?" → 설계 "이 설계로 진행하자" → 원고 "이대로" → 포켓몬 100 "이대로")
//  생활 속 찬반 주제 한 판: ① 내 의견(정답 없음) ② 내 편 이유 둘(보기 넷) ③ 친구가 반대로 말한다면(보기 셋) ④ 글 순서 → 내가 만든 글 ·
//  칸은 🧩 국어 퍼즐 꼴 · 그날 처음 끝낸 판 💰10 + 🎯 논술 포켓몬 잡기(국어와 따로 센다) · 홈 🖊️ 카드 · ⏳ 국어 시간 ·
//  🖊️ 논술 전용 포켓몬 100(흔함 40 · 보통 30 · 희귀 20 · 전설 10 · 진화는 🟩 국어스톤) · 📤 국어 요약에 🖊️ 절
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  NONSUL_COINS, SOLVED, REASONS, OFFS, ORDER_HINTS, checkNonsul, allTopics, planTopic, dealTopic, essayParts, otherSide,
  nonsulRule, nonsulTakeRule, nonsulGiveBackRule, nonsulFinishText, nonsulTodayLine, nonsulReport, isSolved,
} from '../js/nonsul.js';
import { dayNum } from '../js/korean.js';
import { emptyProfile, cloneProfile, mergeStatRecord } from '../js/db.js';
import { initProfile, flushProfile, reloadProfile, nonsulFinish, nonsulMap, nonsulDayMap, nonsulThrowsLeft, nonsulTakeThrow, nonsulGiveBackThrow, rarityOf, tradeCtx } from '../js/xp.js';
import { ROSTER, subjectOf, forSubject, isLegendary, LEGENDARY } from '../js/pokemon.js';
import { TYPE_OF } from '../js/battle.js';
import { RARITY_IDS } from '../js/xp.js';
import { stoneIdFor, evoOf, EVO } from '../js/evolve.js';
import { placeOfView } from '../js/usage.js';
import { SUBJECTS } from '../js/home.js';
import { korReportFromRaw } from '../js/korreport.js';

void fakeIdb;
const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const RAW = JSON.parse(read('coach/korean/nonsul.json'));
const LIST = allTopics(RAW);
const IDS = LIST.map((t) => t.id);
const NOW = new Date(2026, 9, 20, 15).getTime();
const D0 = dayNum(NOW);
const DAY = 86400000;
/** 고정 난수 */
const seq = (seed) => { let x = seed >>> 0 || 1; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; };
const body = (src, head) => { const i = src.indexOf(head); assert.ok(i >= 0, head); return src.slice(i, src.indexOf('\n}\n', i)); };

test('🖊️ 원고: 주제 32 · 검사 통과 · 편마다 이유 셋 · 상관없는 말 둘 · 의견 "나는 …" · 정리 "그래도 나는 …" · 가족을 지어내지 않음', () => {
  assert.deepEqual(checkNonsul(RAW), []);
  // v305: 새 주제 20(N13~N32)을 끝에 붙였다 — 처음 12를 다 한 뒤 이 차례대로 나온다
  assert.equal(LIST.length, 32);
  assert.deepEqual(IDS, Array.from({ length: 32 }, (_, i) => `N${i + 1}`));
  // 주제끼리 같은 이유·상관없는 말·아이콘이 없다(판마다 다른 주제로 느껴지게)
  const sents = LIST.flatMap((t) => [...t.yes.reasons, ...t.no.reasons, ...t.off.map((o) => o.t)]);
  assert.equal(new Set(sents).size, sents.length, '주제끼리 같은 문장');
  assert.equal(new Set(LIST.map((t) => t.icon)).size, LIST.length, '주제끼리 같은 아이콘');
  for (const t of LIST) {
    for (const side of ['yes', 'no']) {
      assert.equal(t[side].reasons.length, REASONS);
      assert.ok(t[side].claim.startsWith('나는 ') && t[side].close.startsWith('그래도 나는 '), t.id);
    }
    assert.equal(t.off.length, OFFS);
    assert.ok(!/동생|형이|누나|언니|오빠/.test(JSON.stringify(t)), `${t.id} 가족을 지어내지 않는다`);
  }
  assert.ok(RAW.about.includes('[4국03-03]'), '학교 성취기준을 원고에 적어 둔다');
});

test('🖊️ checkNonsul: 깨진 원고를 하나씩 잡는다 · allTopics는 깨진 주제를 조용히 뺀다', () => {
  const good = JSON.parse(JSON.stringify(RAW.topics[0]));
  // v304부터 원고에 ✍️ 짧은 글 채점 기준(write)이 꼭 있다 — 주제 검사는 그 칸을 둔 채로
  const bad = (f) => { const t = JSON.parse(JSON.stringify(good)); f(t); return checkNonsul({ write: RAW.write, topics: [t] }); };
  assert.deepEqual(checkNonsul({ write: RAW.write, topics: [good] }), []);
  for (const [name, f] of [
    ['번호', (t) => { t.id = 'X1'; }],
    ['물음 꼴', (t) => { t.q = '카드 교환'; }],
    ['아이콘', (t) => { t.icon = ''; }],
    ['라벨 길이', (t) => { t.yes.label = '가'.repeat(17); }],
    ['의견 꼴', (t) => { t.yes.claim = '포켓몬 카드는 같은 희귀도끼리만 바꿔야 해요.'; }],
    ['정리 꼴', (t) => { t.no.close = '나는 서로 원하면 바꿔도 된다고 생각해요.'; }],
    ['정리 = 의견', (t) => { t.no.close = `그래도 ${t.no.claim}`; }],
    ['이유 수', (t) => { t.yes.reasons.pop(); }],
    ['이유 넷', (t) => { t.no.reasons.push('또 하나의 이유가 있어요.'); }],
    ['이유 끝', (t) => { t.yes.reasons[0] = '손해 보는 일이 없다'; }],
    ['이유 길이', (t) => { t.no.reasons[1] = `${'가'.repeat(40)}요.`; }],
    ['상관없는 말 수', (t) => { t.off.pop(); }],
    ['상관없는 말 까닭', (t) => { t.off[0].why = ''; }],
    ['겹치는 문장', (t) => { t.off[0].t = t.yes.reasons[0]; }],
  ]) assert.ok(bad(f).length > 0, name);
  assert.ok(checkNonsul({ topics: [good, good] }).some((m) => m.includes('겹침')), '번호 겹침');
  assert.ok(checkNonsul({}).length && checkNonsul(null).length && checkNonsul({ topics: [] }).length);
  const broken = JSON.parse(JSON.stringify(good)); broken.id = 'N99'; broken.off = [];
  assert.deepEqual(allTopics({ topics: [good, broken, good] }).map((t) => t.id), [good.id], '깨진 주제·겹친 번호는 뺀다');
  assert.deepEqual(allTopics(null), []);
});

test('🖊️ planTopic: 다시 볼 것(오래 기다린 것부터) → 새 주제(원고 차례) · 내일 볼 것은 오늘 안 나옴 · ⭐는 연습으로만(오래 안 본 것부터) · 없으면 null', () => {
  assert.equal(planTopic(LIST, {}, NOW), 'N1');
  const st = { N1: { box: SOLVED, due: 0, at: 5, miss: 0, d0: D0 }, N2: { box: 0, due: D0 + 1, at: 9, miss: 1, d0: D0 } };
  assert.equal(planTopic(LIST, st, NOW), 'N3', '⭐ N1 · 내일 볼 N2는 건너뛰고 새 주제');
  st.N4 = { box: 0, due: D0, at: 3, miss: 1, d0: D0 - 1 };
  st.N5 = { box: 0, due: D0 - 2, at: 2, miss: 1, d0: D0 - 3 };
  assert.equal(planTopic(LIST, st, NOW), 'N5', '다시 볼 것 — 오래 기다린 것부터');
  assert.equal(planTopic(LIST, st, NOW, true), 'N1', '연습은 ⭐ 주제');
  st.N3 = { box: SOLVED, due: 0, at: 1, miss: 0, d0: D0 };
  assert.equal(planTopic(LIST, st, NOW, true), 'N3', '연습은 오래 안 본 ⭐부터');
  const all = Object.fromEntries(IDS.map((id, i) => [id, { box: SOLVED, due: 0, at: 100 + i, miss: 0, d0: D0 }]));
  assert.equal(planTopic(LIST, all, NOW), null, '다 ⭐면 오늘 할 것 없음');
  assert.equal(planTopic(LIST, {}, NOW, true), null, '⭐가 없으면 연습도 없음');
  assert.equal(planTopic([], {}, NOW), null);
  assert.ok(isSolved({ box: 1 }) && !isSolved({ box: 0 }) && !isSolved(null));
});

test('🖊️ dealTopic: 모든 주제·두 편·씨앗 300 — ② 내 편 둘·반대편 하나·상관없는 말 하나 · ③ 반대편 하나(정답)·내 편 하나·상관없는 말 하나 · 한 판에 같은 문장 두 번 없음 · 글 순서는 바른 차례가 아니게', () => {
  for (const t of LIST) {
    for (const side of ['yes', 'no']) {
      const me = new Set(t[side].reasons);
      const you = new Set(t[otherSide(side)].reasons);
      const off = new Set(t.off.map((o) => o.t));
      for (let s = 1; s <= 300; s++) {
        const d = dealTopic(t, side, seq(s * 7919 + t.id.length));
        assert.deepEqual(d.reasons.map((o) => o.k).sort(), ['mine', 'mine', 'off', 'other']);
        assert.deepEqual(d.counter.map((o) => o.k).sort(), ['mine', 'off', 'other']);
        for (const o of [...d.reasons, ...d.counter]) {
          const okSet = o.k === 'mine' ? me : o.k === 'other' ? you : off;
          assert.ok(okSet.has(o.t), `${t.id} ${o.k} ${o.t}`);
        }
        const texts = [...d.reasons, ...d.counter].map((o) => o.t);
        assert.equal(new Set(texts).size, 7, '한 판에 같은 문장이 두 번 안 나온다');
        const w = Object.fromEntries([...d.reasons, ...d.counter].map((o) => [o.t, o]));
        for (const o of d.reasons) assert.equal(o.why, o.k === 'other' ? `이 이유는 「${t[otherSide(side)].label}」 쪽 의견을 돕는 말이에요.` : o.k === 'off' ? t.off.find((x) => x.t === o.t).why : '');
        assert.ok(w[d.counter.find((o) => o.k === 'mine').t].why.includes('내 의견을 돕는 이유'));
        assert.deepEqual([...d.order].sort(), [0, 1, 2, 3]);
        assert.notDeepEqual(d.order, [0, 1, 2, 3], '바른 차례로 놓이지 않는다');
      }
    }
  }
});

test('🖊️ essayParts: 내 의견 → 첫째·둘째 → 물론 “반대 의견” → 그래도 나는 · ORDER_HINTS는 네 조각 차례 그대로', () => {
  const t = LIST[0];
  const p = essayParts(t, 'no', ['가요.', '나요.'], '다요.');
  assert.deepEqual(p, [t.no.claim, '첫째, 가요. 둘째, 나요.', '물론 이렇게 말하는 친구도 있을 거예요. “다요.”', t.no.close]);
  assert.equal(ORDER_HINTS.length, 4);
  assert.ok(ORDER_HINTS[0].includes('나는') && ORDER_HINTS[1].includes('첫째') && ORDER_HINTS[2].includes('물론') && ORDER_HINTS[3].includes('그래도'));
});

// 🔍 Codex 111차 시험 둘 — 새 주제(v305)가 판을 끝낼 때마다 차례대로 나오나 · 모든 주제의 글이 고른 편 문장으로만 지어지나
test('🔍 Codex 111차: 처음 12를 다 하면 N13 · 판을 끝낼 때마다 다음 주제(nonsulRule → planTopic) · 32를 다 하면 새 주제 없음(연습만)', () => {
  const p = emptyProfile();
  for (let k = 0; k < 12; k++) nonsulRule(p, { id: IDS[k], ok: true, from: 0 }, NOW + k * DAY, IDS);
  for (let k = 12; k < IDS.length; k++) {
    const at = NOW + k * DAY;
    assert.equal(planTopic(LIST, p.nonsul, at), IDS[k], `${IDS[k - 1]} 다음은 ${IDS[k]}`);
    assert.equal(nonsulRule(p, { id: IDS[k], ok: true, from: 0 }, at, IDS).solved, true);
  }
  assert.deepEqual([IDS[12], IDS[31]], ['N13', 'N32']);
  assert.equal(planTopic(LIST, p.nonsul, NOW + 40 * DAY), null, '새 주제가 없으면 null');
  assert.equal(planTopic(LIST, p.nonsul, NOW + 40 * DAY, true), 'N1', '연습은 오래 안 본 것부터');
});

test('🔍 Codex 111차: 모든 주제·두 편·고른 이유 둘(차례까지)·반대 이유 하나 — 글은 그 편의 의견·정리와 고른 문장으로만 · 두 편의 정리가 다르다', () => {
  for (const t of LIST) {
    assert.notEqual(t.yes.close, t.no.close, `${t.id} 두 편의 정리`);
    for (const side of ['yes', 'no']) {
      const me = t[side];
      const you = t[otherSide(side)];
      for (const a of me.reasons) for (const b of me.reasons) {
        if (a === b) continue;
        for (const c of you.reasons) {
          const p = essayParts(t, side, [a, b], c);
          assert.deepEqual(p, [me.claim, `첫째, ${a} 둘째, ${b}`, `물론 이렇게 말하는 친구도 있을 거예요. “${c}”`, me.close], `${t.id} ${side}`);
          assert.ok(!p.join(' ').includes(you.claim) && !p.join(' ').includes(you.close), `${t.id} ${side} 반대편 의견·정리가 섞이지 않는다`);
        }
      }
    }
  }
});

test('🖊️ nonsulRule: 그날 첫 판만 💰10·🎯 하나 · 한 번에 다 맞힘 → ⭐ · 틀린 판 → 내일 다시(틀린 수 +1) · ⭐·낡은 판은 연습(칸 그대로) · 모르는 주제는 안 받음', () => {
  assert.equal(NONSUL_COINS, 10, '보상은 🧩 국어 퍼즐과 같게(아버님 결정)');
  const p = emptyProfile();
  const r1 = nonsulRule(p, { id: 'N1', ok: false, from: 0 }, NOW, IDS);
  assert.deepEqual([r1.ok, r1.first, r1.coins, r1.throws, r1.solved, r1.practice], [true, true, NONSUL_COINS, 1, false, false]);
  assert.deepEqual([p.coins, p.coinsEarned, p.nonsulThrow.earned], [NONSUL_COINS, NONSUL_COINS, 1]);
  assert.deepEqual([p.nonsul.N1.box, p.nonsul.N1.due, p.nonsul.N1.miss, p.nonsul.N1.d0], [0, D0 + 1, 1, D0]);
  assert.equal(p.nonsulDay[D0], 1);
  const r2 = nonsulRule(p, { id: 'N2', ok: true, from: 0 }, NOW + 1000, IDS);
  assert.deepEqual([r2.first, r2.coins, r2.solved, p.nonsulThrow.earned, p.coins], [false, 0, true, 1, NONSUL_COINS], '둘째 판은 보상 없이 칸만');
  assert.equal(p.nonsul.N2.box, SOLVED);
  const at2 = p.nonsul.N2.at;
  const r3 = nonsulRule(p, { id: 'N2', ok: false, from: at2 }, NOW + 2000, IDS);
  assert.deepEqual([r3.practice, p.nonsul.N2.box], [true, SOLVED], '⭐ 주제는 연습 — 틀려도 ⭐ 그대로');
  const r4 = nonsulRule(p, { id: 'N1', ok: true, from: 0 }, NOW + 3000, IDS); // N1의 at은 0이 아니다 — 다른 창이 옮긴 뒤의 낡은 판
  assert.deepEqual([r4.practice, p.nonsul.N1.box], [true, 0], '낡은 판은 연습');
  const r5 = nonsulRule(p, { id: 'N1', ok: true, from: p.nonsul.N1.at }, NOW + DAY, IDS);
  assert.deepEqual([r5.first, r5.solved, p.nonsul.N1.box, p.nonsulThrow.earned, p.coins], [true, true, SOLVED, 2, NONSUL_COINS * 2], '다음 날 첫 판 — 다시 보상');
  assert.ok(p.nonsul.N1.at > NOW, '고친 때는 늘 앞으로');
  for (const bad of [null, {}, { id: 'N99', ok: true }, { id: 5 }]) assert.equal(nonsulRule(p, bad, NOW, IDS).why, 'empty');
  assert.equal(nonsulRule(p, { id: 'N3', ok: true }, NOW, []).why, 'empty', '지금 없는 주제');
});

test('🖊️ 잡기 기회: 국어와 따로 센다 · 없으면 못 뺌 · 뺀 만큼만 돌려줌', () => {
  const p = emptyProfile();
  assert.equal(nonsulTakeRule(p).why, 'none');
  nonsulRule(p, { id: 'N1', ok: true, from: 0 }, NOW, IDS);
  assert.deepEqual(p.korThrow, { earned: 0, used: 0, refunded: 0 }, '국어 잡기 기회는 그대로');
  assert.deepEqual([nonsulTakeRule(p).ok, nonsulTakeRule(p).why], [true, 'none']);
  assert.equal(nonsulGiveBackRule(p).ok, true);
  assert.equal(nonsulGiveBackRule(p).why, 'none', '뺀 것보다 많이 돌려주지 않는다');
  assert.deepEqual(p.nonsulThrow, { earned: 1, used: 1, refunded: 1 });
});

test('🖊️ 프로필: 빈 프로필·복사·병합(⭐는 남고 · 보상 받은 날·잡기 기회는 큰 쪽)', () => {
  const e = emptyProfile();
  assert.deepEqual([e.nonsul, e.nonsulDay, e.nonsulThrow], [{}, {}, { earned: 0, used: 0, refunded: 0 }]);
  const x = { ...emptyProfile(), nonsul: { N1: { box: SOLVED, due: 0, at: 100, miss: 1, d0: D0 } }, nonsulDay: { [D0]: 1 }, nonsulThrow: { earned: 2, used: 1, refunded: 0 }, updatedAt: 9 };
  const y = { ...emptyProfile(), nonsul: { N1: { box: 0, due: D0 + 1, at: 200, miss: 2, d0: D0 }, N2: { box: 0, due: D0, at: 50, miss: 1, d0: D0 } }, nonsulDay: { [D0 - 1]: 1 }, nonsulThrow: { earned: 1, used: 1, refunded: 1 }, updatedAt: 5 };
  for (const [a, b] of [[x, y], [y, x]]) {
    const m = mergeStatRecord('profile', a, b);
    assert.equal(m.nonsul.N1.box, SOLVED, '⭐는 다른 기기의 더 나중 오답에 안 지워진다');
    assert.equal(m.nonsul.N2.box, 0);
    assert.deepEqual(m.nonsulDay, { [D0]: 1, [D0 - 1]: 1 });
    assert.deepEqual(m.nonsulThrow, { earned: 2, used: 1, refunded: 1 });
  }
  const c = cloneProfile(x);
  c.nonsul.N1.box = 0;
  assert.equal(x.nonsul.N1.box, SOLVED, '복사본');
});

let initDone = false;
const stored = () => fakeIdb.get('profile', 'me');
async function seed(p) {
  if (!initDone) { await initProfile(); initDone = true; }
  await flushProfile();
  const cur = stored() || emptyProfile();
  fakeIdb.put('profile', { ...cur, ...p, id: 'me', updatedAt: (cur.updatedAt || 0) + 1 });
  await reloadProfile();
}

test('★ 🖊️ 저장 경로(가짜 IndexedDB): 판을 끝내면 칸·💰·🎯가 저장된 프로필에 · 두 창이 동시에 첫 판을 끝내도 보상 한 번 · 저장이 안 되면 없던 일 · 잡기 기회 빼기·돌려주기', async () => {
  await seed({ coins: 0, coinsEarned: 0, nonsul: {}, nonsulDay: {}, nonsulThrow: { earned: 0, used: 0, refunded: 0 } });
  fakeIdb.failNext('profile');
  const bad = await nonsulFinish({ id: 'N1', ok: true, from: 0 }, IDS);
  assert.equal(bad.ok, false);
  assert.deepEqual([stored().coins, Object.keys(stored().nonsul || {}).length], [0, 0], '저장 실패 = 없던 일');
  const [a, b] = await Promise.all([nonsulFinish({ id: 'N1', ok: true, from: 0 }, IDS), nonsulFinish({ id: 'N2', ok: false, from: 0 }, IDS)]);
  assert.ok(a.ok && b.ok);
  assert.deepEqual([a.first, b.first].sort(), [false, true], '첫 판 보상은 한 번');
  const s = stored();
  assert.deepEqual([s.coins, s.nonsulThrow.earned, s.nonsul.N1.box, s.nonsul.N2.box], [NONSUL_COINS, 1, SOLVED, 0]);
  await reloadProfile();
  assert.equal(nonsulMap().N1.box, SOLVED);
  assert.ok(Object.values(nonsulDayMap()).includes(1));
  assert.equal(nonsulThrowsLeft(), 1);
  const t = await nonsulTakeThrow();
  assert.equal(t.ok, true);
  assert.equal(nonsulThrowsLeft(), 0);
  assert.equal((await nonsulGiveBackThrow()).ok, true);
  assert.equal(nonsulThrowsLeft(), 1);
  assert.deepEqual(stored().nonsulThrow, { earned: 1, used: 1, refunded: 1 });
});

test('🖊️ 말: 판 끝·오늘 줄은 셈 없이(💰 보상 액수만) · 📊·📤 줄은 아빠용 셈', () => {
  const f1 = nonsulFinishText({ ok: true, first: true, coins: NONSUL_COINS, solved: true, practice: false });
  assert.equal(f1.title, '🖊️ 오늘의 논술 끝!');
  assert.deepEqual(f1.lines, [`💰 +${NONSUL_COINS} · 🎯 논술 포켓몬 잡기 1번`, '⭐ 처음부터 다 맞혔어요!']);
  assert.equal(nonsulFinishText({ ok: true, first: false, practice: true }).title, '🖊️ 논술 연습 끝!');
  assert.equal(nonsulFinishText({ ok: true, first: false, practice: false }).title, '🖊️ 논술 더 하기 끝!');
  assert.equal(nonsulFinishText({ ok: false, why: 'save' }).title, '저장이 안 됐어요');
  assert.equal(nonsulTodayLine(0), `오늘 처음 끝내면 💰${NONSUL_COINS} · 🎯 논술 포켓몬 잡기 1번`);
  assert.equal(nonsulTodayLine(1), '오늘의 논술 끝 ✅ — 더 해도 ⭐는 모여요');
  // 아이 화면 글에 셈·진행 수(n / m · 몇 개 남음)가 없다 (2026-10-15)
  const view = read('js/nonsulview.js');
  assert.ok(!/\$\{[^}]*length[^}]*\}\s*\/|남은 \$\{|개 남|\$\{[^}]*\}\s*\/\s*\$\{/.test(view), '아이 화면에 n/m·남은 수 없음');
  const st = { N1: { box: SOLVED, due: 0, at: NOW, miss: 0, d0: D0 }, N2: { box: 0, due: D0 + 1, at: NOW, miss: 1, d0: D0 } };
  assert.equal(nonsulReport(LIST, st, { [D0]: 1, [D0 - 3]: 1, [D0 - 9]: 1 }, NOW), '🖊️ 논술: ⭐ 처음부터 다 맞힌 주제 1/32 · 다시 볼 주제 1 · 해 본 주제 2 · 최근 7일 중 판을 끝낸 날 2');
});

test('🖊️ 📤 국어 요약: 논술 원고가 있으면 🖊️ 절 · 없거나 깨지면 그 절만 빠지고 국어 요약은 그대로', () => {
  const r = JSON.parse(read('coach/korean/reading.json'));
  const w = JSON.parse(read('coach/korean/words.json'));
  const z = JSON.parse(read('coach/korean/puzzles.json'));
  const p = { ...emptyProfile(), nonsul: { N1: { box: SOLVED, due: 0, at: NOW, miss: 0, d0: D0 } }, nonsulDay: { [D0]: 1 } };
  const withNs = korReportFromRaw(p, [r, w, z, RAW], '2026-10-20', []);
  assert.ok(withNs.includes('\n## 🖊️ 논술\n- 🖊️ 논술: ⭐ 처음부터 다 맞힌 주제 1/32 · 다시 볼 주제 0 · 해 본 주제 1 · 최근 7일 중 판을 끝낸 날 1'), withNs.slice(-300));
  for (const ns of [undefined, null, { topics: [] }, 'x']) {
    const t = korReportFromRaw(p, [r, w, z, ns], '2026-10-20', []);
    assert.ok(t && t.includes('## 🧩 퍼즐') && !t.includes('🖊️'), '논술 절만 빠진다');
  }
  const up = read('js/upload.js');
  assert.ok(up.includes("try { const res = await fetch('./coach/korean/nonsul.json'); raw.push(res.ok ? await res.json() : null); } catch { raw.push(null); }"), '원고는 따로 — 못 받아도 국어 요약은');
});

test('🖊️ 논술 포켓몬 100: 명단에 subject nonsul · 겹침 없음 · 흔함 40·보통 30·희귀 20·전설 10 · 배틀 타입 · 진화는 🟩 국어스톤 · 잡기·도감·가게 말', () => {
  const ns = ROSTER.filter((r) => r.subject === 'nonsul');
  assert.equal(ns.length, 100);
  assert.equal(new Set(ROSTER.map((r) => r.id)).size, ROSTER.length, '명단 id 겹침 없음');
  assert.equal(forSubject(ROSTER, 'nonsul').length, 100);
  for (const r of ns) {
    assert.equal(subjectOf(r.id), 'nonsul', `${r.id}`);
    assert.ok(r.ko && r.en, `${r.id} 이름`);
    assert.ok(TYPE_OF[r.id], `${r.id} 배틀 타입`);
  }
  const ids = new Set(ns.map((r) => r.id));
  assert.deepEqual([1, 2, 3, 4, 5].map((t) => RARITY_IDS[t].filter((id) => ids.has(id)).length), [40, 30, 20, 10, 0]);
  assert.deepEqual([rarityOf(377), rarityOf(441), rarityOf(24), rarityOf(23)], [4, 3, 2, 1], '레지락 전설 · 페라페 희귀 · 아보크 보통 · 아보 흔함');
  assert.deepEqual([ROSTER.find((r) => r.id === 441).ko, ROSTER.find((r) => r.id === 605).ko], ['페라페', '리그레'], 'PokeAPI 이름');
  assert.equal(stoneIdFor('nonsul'), 'stone_korean', '논술 포켓몬은 🟩 국어스톤으로 키운다');
  assert.ok(read('js/catch.js').includes("'🖊️ 논술에서만 만나는 포켓몬이에요! 한 마리 골라 몬스터볼을 던져봐요'"));
  const dex = read('js/pokedex.js');
  assert.ok(dex.includes("else if (subjectOf(m.id) === 'nonsul') cell.appendChild(el('div', 'subj', '🖊️'));") && dex.includes("· 🖊️ 논술에서 잡아요 ${got(ns)}/${ns.length}"));
  const shop = read('js/shop.js');
  assert.ok(shop.includes("nonsul: ' · 🖊️ 논술에서 만나요'"), '어디서 잡히나는 논술');
  assert.ok(shop.includes("const giver = { stone_math: '🔢 수학을', stone_korean: '📚 국어를', stone_english: '🎤 영어를' }[g.stone] || '공부를';") && shop.includes('— ${giver} 하면 받아요') && shop.includes('· ${giver} 하면 더 받아요'), '스톤 안내는 스톤을 주는 활동 — 논술 포켓몬의 🟩도 📚 국어 (Codex 109차 #2)');
  assert.ok(!/논술를|수학를|\$\{subject\}를/.test(shop), '조사가 틀린 안내가 없다');
  assert.ok(read('js/marketview.js').includes("{ math: '수학', korean: '국어', nonsul: '논술' }[o.subject] || '영어'"), '5일장 상인이 논술 포켓몬을 영어라 하지 않는다');
});

test('🖊️ 화면 연결: 홈 카드 · 화면 · ⏳ 국어 시간 · 시간 칩 · 판 저장 · 잡기는 국어와 같은 길 · sw · 원고 검사', () => {
  const card = SUBJECTS.find((s) => s.key === 'nonsul');
  assert.ok(card && card.view === 'nonsul' && card.ready && card.ko === '논술');
  assert.equal(subjectOf(card.mascot), 'nonsul', '마스코트(페라페)는 논술 포켓몬');
  const html = read('index.html');
  assert.ok(html.includes('<section id="view-nonsul" class="view" hidden>') && html.includes('<main id="nonsul-main" class="ns-main"></main>') && html.includes('id="time-chip-nonsul"') && html.includes('id="btn-nonsul-back"'));
  const app = read('js/app.js');
  assert.ok(app.includes("  nonsul: document.getElementById('view-nonsul'),"));
  assert.ok(app.includes("  if (name === 'nonsul') return 'korean';"), '⏳ 논술은 국어 시간');
  assert.ok(app.includes("  if (name === 'nonsul') enterNonsul().catch(() => {});") && app.includes('  initNonsul({ showView });'));
  assert.ok(read('js/timeup.js').includes("  { id: 'time-chip-nonsul', subject: 'korean' },"));
  const v = read('js/nonsulview.js');
  assert.equal((v.match(/guardStart\('korean', /g) || []).length, 6, '판을 열 때마다 국어 시간을 본다(시작·연습·다음 주제) + v304 ✍️ 짧은 글을 여는 세 곳(첫 화면 목록·판 끝·📬 띠 — Codex 110차 #2)');
  const fin = body(v, 'async function finishRound() {');
  assert.ok(fin.includes('res = await nonsulFinish({ id: r.id, ok: !r.miss, from: r.from }, S.list.map((t) => t.id));'), '판 끝에 한 번 저장 · ok = 한 번도 안 틀림');
  const run = body(v, 'export async function runCatch() {');
  const iTake = run.indexOf('taken = await nonsulTakeThrow();');
  const iTrack = run.indexOf('const st = { threw: false, hold: holds.track() };');
  assert.ok(iTake >= 0 && iTake < iTrack && iTrack < run.indexOf('openCatch({'), '뺀 다음, 띄우기 전에 장부 줄');
  assert.ok(run.includes("subject: 'nonsul'") && run.includes('attempt: (id, opts) => { st.threw = true; st.hold.judged(); return catchAttempt(id, Math.random, opts); },'));
  assert.ok(run.includes('if (res && res.threw === false && !st.threw) st.hold.refund(giveBack)'), '안 던지고 닫으면 돌려줌');
  assert.ok(v.includes("const holds = holdStore('shincoach.nonsul.throwHolds');"), '장부는 국어와 따로');
  assert.ok(body(v, 'async function nsPool() {').includes("forSubject(chars, 'nonsul')"), '후보는 논술 전용');
  assert.ok(body(v, 'export async function enterNonsul() {').includes('await Promise.resolve(settleLostCatch()).catch(() => {});\n  settleThrows();'), '들어올 때 소식 없이 닫힌 창부터, 그다음 장부 정리');
  const sw = read('sw.js');
  for (const f of ["'./js/nonsul.js',", "'./js/nonsulview.js',", "'./coach/korean/nonsul.json',"]) assert.ok(sw.includes(f), f);
  assert.ok(+(/const CACHE_VERSION = 'v(\d+)';/.exec(sw) || [])[1] >= 303, 'sw v303 이상');
  assert.ok(read('tools/check.mjs').includes("const { checkNonsul } = await import('../js/nonsul.js');"), '배포 전 원고 검사');
  assert.ok(read('css/style.css').includes('.ns-main {'));
});

test('🔍 Codex 109차: 논술 가족이 진화한다(가족 안에서 · 원작 조건 글) · 원작 전설·환상은 목록에(국어 15 · 논술 10) · 교환에서 빠진다 · 사용 기록은 국어 자리', () => {
  const ns = new Set(ROSTER.filter((r) => r.subject === 'nonsul').map((r) => r.id));
  assert.deepEqual(evoOf(69), [{ to: 70, at: 5, orig: 'Lv21' }], '모다피 → 우츠동 Lv5');
  assert.deepEqual(evoOf(70), [{ to: 71, at: 10, orig: '리프의돌 사용' }], '우츠동 → 우츠보트 Lv10');
  assert.deepEqual(evoOf(265).map((x) => x.to), [266, 268], '개무소 → 실쿤·카스쿤');
  assert.deepEqual([evoOf(108)[0].orig, evoOf(458)[0].orig], ['구르기를 배우고 레벨업', '총어와 함께 레벨업'], '도구가 못 만든 조건은 PokeAPI 한국어명으로');
  const nsLinks = Object.entries(EVO).filter(([k]) => ns.has(Number(k))).flatMap(([, v]) => v);
  assert.equal(nsLinks.length, 46);
  for (const l of nsLinks) { assert.ok(ns.has(l.to), `${l.to} 진화형도 논술`); assert.ok(l.orig, `${l.to} 원작 조건`); }
  const legends = [480, 481, 482, 488, 490, 648, 638, 639, 640, 785, 786, 787, 788, 801, 802, 377, 378, 486, 641, 642, 647, 718, 719, 720, 721];
  for (const id of legends) assert.equal(isLegendary(id), true, `${id} 원작 전설·환상`);
  assert.equal(new Set(LEGENDARY).size, LEGENDARY.length, '목록에 겹침 없음');
  // 부모가 등급을 낮춰도 원작 전설·환상은 교환 상인에게서 빠진다
  const pf = { ...emptyProfile(), xp: 99999, mons: { 377: { rarity: 1 }, 480: { rarity: 1 } } };
  const ctx = tradeCtx(pf);
  assert.deepEqual([ctx.allowed(377), ctx.allowed(480), ctx.allowed(23)], [false, false, true]);
  assert.equal(ctx.subject(377), 'nonsul');
  assert.equal(placeOfView('nonsul'), 'korean', '사용 기록에서 논술 화면은 국어 자리 (Codex 109차 #3)');
  assert.equal(placeOfView('korean'), 'korean');
});
