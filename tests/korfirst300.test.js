// 📚 국어 v300 (2026-10-19, 아버님 "개선 방안대로 가자" → 기본안 표 → "모두 추천대로 진행하자")
//  ② 🎯 다시 읽기(★★·★★★)는 처음 고른 답으로 물음의 반 이상을 맞혔을 때만 — ★·별·💰·🟩·🥚는 그대로 · 못 받은 🎯는 그 별의 것이 없다
//     · "처음 고른 답으로 맞힘" = 📤 읽은 기록의 f(보기를 한 번에 맞힌 물음) · 아이 화면엔 셈 없이 규칙만
//  ③ 🔍 근거 먼저(근거부터 · 두 번 틀려 근거 먼저)에서 줄을 세 번 잘못 누르면 근거 줄 하나와 그 옆 줄 하나만 남긴다
//     · 옆 줄은 위·아래 무작위(물음마다 한 번) · 한 번 정하면 그대로 · 맞힌 뒤의 근거 잡기는 그대로
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  korFinishRule, catchFirstOk, CATCH_FIRST_STAR, evPair, EV_PAIR_AT, EV_RANGE_AT, evRange, validCards, dayNum, pendingOf, KOR_COINS, KOR_STONE,
  readOf, mergeReads,
} from '../js/korean.js';
import { emptyProfile, cloneProfile, mergeStatRecord } from '../js/db.js';
import { initProfile, flushProfile, reloadProfile, korFinish } from '../js/xp.js';
import { readLines } from '../js/korreport.js';

void fakeIdb;
const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const DATA = JSON.parse(read('coach/korean/reading.json'));
const CARDS = validCards(DATA);
const IDS = CARDS.map((c) => c.id);
const T0 = new Date(2026, 9, 20, 12, 0, 0).getTime();
const at = (days, h = 12) => new Date(2026, 9, 20 + days, h, 0, 0).getTime();
const pf = (o = {}) => cloneProfile({ ...emptyProfile(), ...o });
/** 물음 n개 글 하나 */
const cardOf = (n) => { const c = CARDS.find((x) => x.qs.length === n); assert.ok(c, `물음 ${n}개 글`); return c; };
/** 읽은 기록 한 줄 (화면 readLog 꼴) — f 처음 고른 답으로 맞힌 물음 */
const rd = (n, f, o = {}) => ({ t: T0, s: 120, a: 40, n, f, x: 0, e: 0, h: 0, m: '', q: 30, ...o });
/** ★를 받은 지 days일 · ★★까지 받은 지 (★★★ 받는 날) 프로필 */
const afterStar1 = (id) => pf({ korDone: { [`${id}:1`]: dayNum(at(-1)) } });
const afterStar2 = (id) => pf({ korDone: { [`${id}:1`]: dayNum(at(-8)), [`${id}:2`]: dayNum(at(-7)) } });

test('🎯 catchFirstOk (순수): ★는 늘 · ★★·★★★는 처음 고른 답 × 2 ≥ 물음 수 — 2물음 1 · 3물음 2 · 4물음 2 (경계 양쪽)', () => {
  assert.equal(CATCH_FIRST_STAR, 2);
  for (const n of [2, 3, 4]) for (let f = 0; f <= n; f++) assert.equal(catchFirstOk(1, f, n), true, `★ ${f}/${n}`);
  const need = { 2: 1, 3: 2, 4: 2, 5: 3 };
  for (const star of [2, 3]) {
    for (const n of [2, 3, 4, 5]) {
      for (let f = 0; f <= n; f++) assert.equal(catchFirstOk(star, f, n), f >= need[n], `★${star} ${f}/${n}`);
    }
  }
});

test('🎯 korFinishRule — ★★: 처음 고른 답이 반이 안 되면 별·💰는 받고 🎯는 없음(noCatch first) · 반 이상이면 🎯 · 이미 가진 🎯는 그대로', () => {
  for (const n of [2, 3, 4]) {
    const c = cardOf(n);
    const low = Math.ceil(n / 2) - 1; // 반이 안 되는 가장 큰 수
    const p = afterStar1(c.id);
    p.korThrow = { earned: 5, used: 3, refunded: 0 }; // 앞서 받아 둔 🎯 둘
    const coins = p.coins || 0;
    const r = korFinishRule(p, c.id, T0, { make: 1 }, IDS, 0, { read: rd(n, low) });
    assert.deepEqual([r.ok, r.star, r.coins, r.stone, r.noCatch, r.throws, r.stars], [true, 2, KOR_COINS[2], 0, 'first', 2, 2], `${c.id} ${low}/${n}`);
    assert.deepEqual(p.korThrow, { earned: 5, used: 3, refunded: 0 }, '🎯 카운터는 그대로 — 이미 가진 둘은 남는다');
    assert.equal(pendingOf(p.korThrow), 2);
    assert.equal(p.coins, coins + KOR_COINS[2], '💰는 그대로');
    assert.equal(p.korDone[`${c.id}:2`], dayNum(T0), '★★는 그대로 받는다');
    assert.equal(p.korReads.at(-1).g, 2, '📤 읽은 기록 줄도 그대로(★★ 새로)');
    // 같은 글을 같은 날 다시 읽어도 별이 없으니 🎯도 없다 (못 받은 🎯는 그 별의 것이 없다)
    const again = korFinishRule(p, c.id, at(0, 18), {}, IDS, 0, { read: rd(n, n, { t: T0 + 1 }) });
    assert.deepEqual([again.star, again.noCatch, pendingOf(p.korThrow)], [0, undefined, 2]);
    // 반 이상
    const q = afterStar1(c.id);
    const ok = korFinishRule(q, c.id, T0, {}, IDS, 0, { read: rd(n, Math.ceil(n / 2)) });
    assert.deepEqual([ok.star, ok.noCatch, ok.throws, q.korThrow.earned], [2, undefined, 1, 1], `${c.id} ${Math.ceil(n / 2)}/${n}`);
    assert.ok(!('noCatch' in ok), '받으면 noCatch 칸이 없다(옛 결과 꼴 그대로)');
  }
});

test('🎯 korFinishRule — ★★★도 같은 규칙 · ★는 처음 고른 답이 0이어도 🎯 · 🟩는 그대로(다 맞히면 🎯도) · 🎧 듣기·글로 읽기도 같다', () => {
  const c = cardOf(4);
  const p3 = afterStar2(c.id);
  const r3 = korFinishRule(p3, c.id, T0, { detail: 2 }, IDS, 0, { read: rd(4, 1) });
  assert.deepEqual([r3.star, r3.coins, r3.noCatch, p3.korThrow.earned], [3, KOR_COINS[3], 'first', 0]);
  const q3 = afterStar2(c.id);
  assert.deepEqual([korFinishRule(q3, c.id, T0, {}, IDS, 0, { read: rd(4, 2) }).noCatch, q3.korThrow.earned], [undefined, 1]);
  // ★ (처음 읽기) — 처음 고른 답이 하나도 안 맞아도 그대로
  const p1 = pf();
  const r1 = korFinishRule(p1, c.id, T0, { make: 4 }, IDS, 0, { read: rd(4, 0, { x: 2 }) });
  assert.deepEqual([r1.star, r1.noCatch, r1.throws], [1, undefined, 1]);
  // 🟩 — 보기·근거를 다 한 번에 맞혔다(f = n) → 🎯도
  const ps = afterStar1(c.id);
  const rs = korFinishRule(ps, c.id, T0, {}, IDS, 0, { read: rd(4, 4) });
  assert.deepEqual([rs.stone, rs.noCatch, rs.throws, ps.items[KOR_STONE]], [1, undefined, 1, 1]);
  // 🎧 듣기 · 글로 읽기 — 같은 규칙
  for (const m of ['listen', 'text']) {
    const pl = afterStar1(c.id);
    const rl = korFinishRule(pl, c.id, T0, { make: 2 }, IDS, 0, { noStone: m === 'text', read: rd(4, 1, { m, q: undefined }) });
    assert.deepEqual([rl.star, rl.noCatch, pl.korThrow.earned], [2, 'first', 0], m);
  }
});

test('🎯 판정은 읽은 기록 줄과 같은 값 — 줄의 f는 물음 수를 넘지 않게 고쳐 읽은 뒤 · 기록 줄이 없는(깨진) 옛 부름은 예전처럼 🎯', () => {
  const c = cardOf(4);
  // f가 물음 수보다 크면 readOf가 n으로 줄인다 — 그래도 반 이상
  const p = afterStar1(c.id);
  assert.equal(korFinishRule(p, c.id, T0, {}, IDS, 0, { read: rd(4, 99) }).noCatch, undefined);
  // f가 깨졌으면 0으로 — 반이 안 됨
  const q = afterStar1(c.id);
  assert.equal(korFinishRule(q, c.id, T0, {}, IDS, 0, { read: rd(4, 'x') }).noCatch, 'first');
  assert.equal(q.korReads.at(-1).f, 0, '판정과 기록이 같은 값');
  // 읽은 기록이 없는 부름(옛 시험·옛 화면) · 꼴이 깨져 줄이 안 생기는 부름 — 예전처럼
  for (const read of [undefined, null, 'x', { t: -1, n: 4, f: 0 }, { t: T0, n: 9, f: 0 }]) {
    const x = afterStar1(c.id);
    const r = korFinishRule(x, c.id, T0, {}, IDS, 0, read === undefined ? {} : { read });
    assert.deepEqual([r.star, r.noCatch, x.korThrow.earned], [2, undefined, 1], JSON.stringify(read));
  }
});

test('🔍 evPair (순수): 근거 첫 줄 + 옆 줄 — side 0 위 먼저 · 1 아래 먼저 · 막힌 줄(근거·이미 누름·글 밖)은 건너 다음으로 가까운 줄 · 고를 게 없으면 null', () => {
  assert.equal(EV_PAIR_AT, 3);
  assert.ok(EV_PAIR_AT > EV_RANGE_AT, '범위 말 다음에');
  assert.deepEqual([evPair([5], 9, [], 0), evPair([5], 9, [], 1)], [[4, 5], [5, 6]]);
  assert.deepEqual([evPair([5], 9, [4], 0), evPair([5], 9, [6], 1)], [[5, 6], [4, 5]], '바로 옆이 이미 누른 줄이면 반대쪽');
  assert.deepEqual(evPair([5], 9, [4, 6], 0), [3, 5], '양옆이 막히면 둘째 줄');
  assert.deepEqual(evPair([5], 9, [4, 6, 3], 0), [5, 7]);
  assert.deepEqual([evPair([1], 6, [], 0), evPair([6], 6, [], 1)], [[1, 2], [5, 6]], '글 끝이면 안쪽');
  assert.deepEqual(evPair([3, 4, 6], 9, [], 1), [2, 3], '근거 줄은 옆 줄이 될 수 없다(④는 근거 — 아래 먼저여도 같은 거리의 ②)');
  assert.deepEqual(evPair([3, 4, 6], 9, [2], 1), [3, 5], '②도 막히면 다음 거리');
  assert.deepEqual(evPair([6, 3], 9, [2], 0), [3, 4], '근거 가운데 첫 줄 — 차례 상관없이');
  assert.deepEqual(evPair([1, 2], 2, [], 0), null, '근거 아닌 줄이 없다');
  assert.deepEqual(evPair([2], 3, [1, 3], 0), null, '다 눌렀다');
  for (const bad of [[], null, undefined, [0], [10], [2.5], 'x']) assert.equal(evPair(bad, 9, [], 0), null, JSON.stringify(bad));
  assert.deepEqual(evPair([0, 4], 9, null, 0), [3, 4], '깨진 번호는 빼고 · 누른 줄이 깨졌으면 빈 것으로');
  assert.deepEqual(evRange([5], 9), [3, 7], '범위(둘째 잘못 누름)는 그대로');
});

test('🔍 evPair — 넓게: 무작위 원고 수천 개에서 늘 [작은, 큰] · 하나는 근거 첫 줄 · 다른 하나는 근거도 누른 줄도 아님 · 가장 가까운 줄 · 위·아래가 둘 다 나온다', () => {
  let seed = 300; // mulberry32 — 아래 자리 비트만 쓰는 선형 합동은 0·1이 번갈아 나와 한쪽으로 쏠렸다
  const rnd = (k) => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * k);
  };
  const sides = { up: 0, down: 0 };
  for (let i = 0; i < 6000; i++) {
    const n = 3 + rnd(14);
    const ev = [...new Set(Array.from({ length: 1 + rnd(3) }, () => 1 + rnd(n)))];
    const first = Math.min(...ev);
    const wrong = [...new Set(Array.from({ length: rnd(5) }, () => 1 + rnd(n)))].filter((x) => !ev.includes(x));
    const side = rnd(2);
    const got = evPair(ev, n, wrong, side);
    const free = Array.from({ length: n }, (_, k) => k + 1).filter((x) => !ev.includes(x) && !wrong.includes(x));
    if (!free.length) { assert.equal(got, null, JSON.stringify({ ev, n, wrong })); continue; }
    assert.ok(Array.isArray(got) && got.length === 2 && got[0] < got[1], JSON.stringify({ ev, n, wrong, got }));
    assert.ok(got.includes(first), '근거 첫 줄');
    const other = got[0] === first ? got[1] : got[0];
    assert.ok(free.includes(other), '옆 줄은 근거도 누른 줄도 아니다');
    const near = Math.min(...free.map((x) => Math.abs(x - first)));
    assert.equal(Math.abs(other - first), near, '가장 가까운 줄');
    // 같은 거리 양쪽이 다 비었으면 side 쪽
    if (free.includes(first - near) && free.includes(first + near)) {
      assert.equal(other, side === 1 ? first + near : first - near);
      sides[side === 1 ? 'down' : 'up']++;
    }
  }
  assert.ok(sides.up > 500 && sides.down > 500, `위·아래 둘 다 ${JSON.stringify(sides)} — 늘 위 줄이 답이면 읽지 않고 맞힌다`);
});

test('🎯·🔍 화면 말 (순수): 다 읽은 화면 — 못 받으면 셈 없이 규칙만 · 받으면 예전 그대로 · 안내 한 줄은 ★★·★★★ 받는 읽기만 · 두 줄 말', async () => {
  const v = await import('../js/koreanview.js');
  const RULE = '🎯 포켓몬은 처음 고른 답이 반 이상 맞을 때 나와요';
  assert.deepEqual(v.finishText({ ok: true, star: 2, coins: 8, stone: 0, stars: 2, noCatch: 'first', next: 3, days: 6 }).lines, [`💰 +8 · ${RULE}`, '6일 뒤 다시 읽으면 ★★★ 💰20']);
  assert.deepEqual(v.finishText({ ok: true, star: 3, coins: 20, stone: 0, stars: 3, noCatch: 'first' }).lines, [`💰 +20 · ${RULE}`, '이 글은 이제 진우 거예요']);
  assert.equal(v.finishText({ ok: true, star: 2, coins: 8, stone: 0, stars: 2, noCatch: 'first', next: 3, days: 6 }, true).lines[0], `💰 +8 · ${RULE}`, '🎧도 같은 말');
  assert.equal(v.finishText({ ok: true, star: 2, coins: 8, stone: 0, stars: 2, next: 3, days: 6 }).lines[0], '💰 +8 · 🎯 국어 포켓몬 잡기 1번', '받으면 그대로');
  assert.equal(v.finishText({ ok: true, star: 2, coins: 8, stone: 1, stars: 2, next: 3, days: 6 }).lines[0], '💰 +8 · 🟩 국어스톤 +1 (한 번에 다 맞혔어요!) · 🎯 국어 포켓몬 잡기 1번');
  assert.ok(!/\d/.test(RULE), '규칙 말에 수가 없다(셈 문구 금지)');
  // 안내 한 줄 — 연 때 받을 별(0 = 별 없이 다시 읽기 · 다시 읽는 사이)
  assert.deepEqual([0, 1, undefined, NaN].map((s) => v.catchRuleLine(s)), ['', '', '', '']);
  assert.equal(v.catchRuleLine(2), '🎯 다시 읽을 때는 처음 고른 답이 반 이상 맞으면 포켓몬을 만나요');
  assert.equal(v.catchRuleLine(3), v.catchRuleLine(2));
  assert.equal(v.catchRuleLine(2, true), '🎯 다시 들을 때는 처음 고른 답이 반 이상 맞으면 포켓몬을 만나요');
  assert.ok(!/\d/.test(v.catchRuleLine(2)) && !/\d/.test(v.catchRuleLine(3, true)));
  // 두 줄 말 — 번호 뒤 조사는 낱말 뒤에
  assert.equal(v.evPairSay([4, 5], [1, 2, 7], '문장'), '🔍 두 문장(④, ⑤) 가운데 하나예요. 둘 다 읽고 답을 받쳐 주는 문장을 눌러요.');
  assert.equal(v.evPairSay([2, 3], [], '줄'), '🔍 두 줄(②, ③) 가운데 하나예요. 둘 다 읽고 답을 받쳐 주는 줄을 눌러요.');
  assert.equal(v.evPairSay([4, 5], [1, 2, 7, 4], '문장'), '🔍 남은 문장(⑤)을 읽고 눌러 봐요.', '둘 가운데 하나를 또 잘못 눌렀다');
  assert.equal(v.evPairSay([4, 5], [5], '줄'), '🔍 남은 줄(④)을 읽고 눌러 봐요.');
});

test('🔍·🎯 화면 배선: 연 때 받을 별 한 번 · 물음마다 옆 줄 방향 · 셋째 잘못 누름에서 한 번만 정함(답을 고르기 전만) · 두 줄 밖은 못 누름 · 안내 두 곳 · css · sw v300', () => {
  const src = read('js/koreanview.js');
  const body = (head) => { const i = src.indexOf(head); assert.ok(i >= 0, head); return src.slice(i, src.indexOf('\n}\n', i)); };
  const open = body('function openCard(id) {');
  assert.ok(open.includes('const starNow = profileLoading() ? 0 : nextStar(korDoneMap(), card.id, Date.now()).star;'));
  assert.ok(open.includes('    starNow,\n'), '읽는 상태에 둔다');
  assert.ok(open.includes('pairSide: Math.random() < 0.5 ? 0 : 1, pair: null,'), '물음마다 한 번 무작위');
  const pick = body('function evPick(n) {');
  const fix = 'if (!st.answered && !st.pair && st.evWrong.length >= EV_PAIR_AT) st.pair = evPair(q.ev, lineCount(r.card), st.evWrong, st.pairSide);';
  assert.ok(pick.includes(fix), '한 번 정하면 그대로 · 맞힌 뒤의 근거 잡기엔 없음');
  assert.ok(pick.indexOf('st.evWrong.push(n);') < pick.indexOf(fix), '방금 누른 줄까지 세고');
  const ev = body('function evidenceEl(q, st, unit) {');
  assert.ok(ev.includes('const pair = first && !st.evDone ? st.pair : null;'), '답을 고르기 전 · 찾기 전만');
  assert.ok(ev.includes('const far = !!pair && !pair.includes(n) && !miss;') && ev.includes('b.disabled = st.evDone || miss || far;'), '두 줄 밖은 못 누름');
  assert.ok(ev.includes("${far ? ' is-far' : ''}${pair && !far && !miss ? ' is-pair' : ''}"));
  const say = ev.indexOf('else if (pair) {');
  assert.ok(say > ev.indexOf('if (st.evDone)') && say < ev.indexOf('first && st.evWrong.length >= EV_RANGE_AT'), '두 줄 말이 범위 말보다 먼저');
  assert.ok(ev.includes('msg.textContent = evPairSay(pair, st.evWrong, unit);'));
  const rq = body('function renderQ() {');
  assert.ok(rq.includes('const rule = catchRuleLine(r.starNow, true);') && rq.includes('const rule = catchRuleLine(r.starNow);'), '🎧 다 듣기 전 · 📖 문제 보기 전 안내');
  assert.equal((rq.match(/wait\.appendChild\(el\('p', 'kor-tnote kor-catch-rule', rule\)\)/g) || []).length, 2);
  // 세로 화면에선 기다림 상자가 글 아래 — [문제 보기] 단추 바로 위에도 (헤드리스 390)
  const go = body('function askGoEl(card) {');
  assert.ok(go.includes('const rule = catchRuleLine(ui.read ? ui.read.starNow : 0);') && go.includes("if (rule) box.appendChild(el('p', 'kor-askgo-note kor-catch-rule', rule));"));
  assert.ok(go.indexOf('kor-catch-rule') < go.indexOf("el('button'"), '단추보다 먼저');
  const css = read('css/style.css');
  assert.ok(css.includes('.kor-ev-row.is-pair {') && css.includes('.kor-ev-row.is-far { opacity: 0.35; }') && css.includes('.kor-tnote.kor-catch-rule {') && css.includes('.kor-askgo-note.kor-catch-rule {'));
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(read('sw.js')) || [])[1]) >= 300, 'sw v300 이상');
  // 🎯를 늘리는 곳은 한 곳(korFinishRule) — 조건 안에서만
  const k = read('js/korean.js');
  const rule = k.slice(k.indexOf('export function korFinishRule('), k.indexOf('\n}\n', k.indexOf('export function korFinishRule(')));
  assert.equal((rule.match(/tw\.earned \+ 1/g) || []).length, 1);
  assert.ok(rule.includes('const caught = !rd || catchFirstOk(next.star, rd.f, rd.n);') && rule.includes('if (caught) tw.earned = Math.min(Number.MAX_SAFE_INTEGER, tw.earned + 1);'));
});

test('📤 국어 요약 머리말: 두 줄로 좁히기(두 곳 · 남길 옆 줄이 없으면 안 좁힘 · 두 줄 = 좁힌 물음 수) · v300부터 ★★·★★★ 🎯 규칙 (괄호는 닫힌다)', () => {
  const L = readLines([], DATA.cards, '2026-10-20');
  assert.match(L[1], /🔍 두 줄로 좁히기\(v300\) = 답을 고르기 전 근거 찾기\(📍 근거부터·🔍 근거 먼저\)에서 줄을 세 번 잘못 누르면 근거 줄과 그 옆 줄 둘만 남김\(남길 옆 줄이 없으면 안 좁힘\) · 두 줄 = 그렇게 좁힌 물음 수\(v300부터 적음 — 그 전 줄에는 없음\)/);
  assert.ok(!L[1].includes('3 이상이면 본 것'), 'Codex 106차 — w만으로는 두 줄을 봤는지 모른다');
  assert.ok(L[1].includes('그 전 줄에는 없음) · 🎯 v300부터') && !/ ·\S/u.test(L[1]), '띄어 쓴 가운뎃점(나눔) 뒤는 늘 띄어 쓴다');
  assert.match(L[1], /🎯 v300부터 ★★·★★★를 새로 받은 읽기는 첫 번에 맞힌 물음이 반 이상일 때만 🎯\(별·💰는 그대로\)\)$/);
});

test('📤 p 두 줄로 좁힌 물음 (Codex 106차): readLog는 두 줄을 남긴 물음 수 — 근거부터·두 번 틀려 근거 먼저 모두 · 잘못 누른 줄이 셋이어도 남길 옆 줄이 없으면 0 · 0도 적는다', async () => {
  const { readLog } = await import('../js/koreanview.js');
  const card = { qs: [{ opts: [1, 2, 3, 4] }, { opts: [1, 2, 3, 4] }, { opts: [1, 2, 3, 4] }] };
  const st = (o) => ({ wrong: [], answered: true, evDone: true, evWrong: [], evFirst: false, hint2: false, gate: false, from: -1, evAt: -1, pair: null, ...o });
  const r = (qs) => readLog({ card, t0: 5000, sec: 200, firstSec: 60, askAt: 20, ls: null, qs });
  // 근거 ② · 4줄 · ①③④를 다 잘못 눌렀다 → 남길 옆 줄이 없다(evPair null) — w는 3이어도 두 줄은 안 나왔다
  assert.equal(evPair([2], 4, [1, 3, 4], 0), null);
  const none = r([st({ gate: true, evFirst: true, from: 10, evAt: 50, evWrong: [1, 3, 4], pair: evPair([2], 4, [1, 3, 4], 0) }), st({}), st({})]);
  assert.deepEqual([none.w, none.p], [3, 0], 'w 3 · p 0');
  // 근거부터가 아닌 곳(두 번 틀려 근거 먼저)에서 두 줄 — w·v는 근거부터 물음만이라 없고 p가 센다
  const late = r([st({}), st({ wrong: [0, 1], evFirst: true, evWrong: [1, 5, 6], pair: [3, 4] }), st({})]);
  assert.deepEqual([late.e, late.p, 'w' in late, 'v' in late], [1, 1, false, false]);
  // 두 곳 모두
  const both = r([st({ gate: true, evFirst: true, from: 10, evAt: 50, evWrong: [1, 5, 6], pair: [2, 3] }), st({ wrong: [0, 1], evFirst: true, evWrong: [1, 5, 6], pair: [3, 4] }), st({})]);
  assert.deepEqual([both.w, both.p], [3, 2]);
  assert.equal(r([st({}), st({}), st({})]).p, 0, '두 줄이 없던 읽기도 0으로 적는다(없음 = 옛 앱)');
});

test('📤 p — readOf는 0 이상 수만·물음 수까지 · 없거나 깨졌으면 키도 없다(옛 줄 그대로) · 옛 앱을 거친 사본과 합쳐도 남는다(두 차례 모두 · 프로필 병합도) · korFinishRule이 그대로 적는다', () => {
  const base = { c: 'K42', t: T0, d: dayNum(T0), s: 60, a: 50, n: 4, f: 2, x: 0, e: 0, h: 0, g: 1, m: '' };
  assert.deepEqual([readOf({ ...base, p: 0 }).p, readOf({ ...base, p: 2 }).p, readOf({ ...base, p: 9 }).p, readOf({ ...base, p: 1.7 }).p], [0, 2, 4, 1]);
  for (const bad of [-1, '1', null, NaN, undefined, true]) assert.ok(!('p' in readOf({ ...base, p: bad })), `p ${String(bad)}`);
  assert.ok(!('p' in readOf(base)), '옛 줄은 꼴 그대로');
  const withP = readOf({ ...base, p: 1 });
  const noP = readOf(base);
  assert.deepEqual(mergeReads([withP], [noP]), [withP]);
  assert.deepEqual(mergeReads([noP], [withP]), [withP]);
  assert.deepEqual(mergeReads(mergeReads([noP], [withP]), [noP, noP]), [withP]);
  const prof = (korReads, updatedAt) => ({ ...emptyProfile(), korReads, updatedAt });
  assert.deepEqual(mergeStatRecord('profile', prof([withP], 1), prof([noP], 2)).korReads, [withP]);
  assert.deepEqual(mergeStatRecord('profile', prof([noP], 1), prof([withP], 2)).korReads, [withP]);
  // 다 읽을 때 그대로 적힘 · 없으면 없음
  const p = pf();
  korFinishRule(p, 'K42', T0, {}, IDS, 0, { read: rd(4, 2, { p: 1 }) });
  korFinishRule(p, 'K43', T0, {}, IDS, 0, { read: rd(4, 2, { t: T0 + 1 }) });
  assert.deepEqual(p.korReads.map((x) => [x.c, x.p]), [['K42', 1], ['K43', undefined]]);
});

test('📤 국어 요약: 모은 줄에 두 줄로 좁힌 물음(적은 줄만 · 몇 번에서) · 줄마다 "🔍 두 줄 N"(0이면 안 씀) · 옛 줄뿐이면 말도 없다', () => {
  const D = dayNum(T0);
  const row = (o) => ({ c: 'K42', t: T0, d: D, s: 90, a: 50, n: 4, f: 2, x: 0, e: 0, h: 0, g: 1, m: '', ...o });
  const L = readLines([row({ p: 2 }), row({ t: T0 + 1, c: 'K43', p: 0 }), row({ t: T0 + 2, c: 'K44' })], DATA.cards, '2026-10-20');
  assert.ok(L[2].endsWith(' · 🔍 두 줄로 좁힌 물음 2(v300부터 읽은 2번에서)'), L[2]);
  const lines = L.slice(3);
  assert.ok(lines[0].startsWith('- 10-20 K42') && lines[0].endsWith(' · 🔍 두 줄 2'), lines[0]);
  assert.ok(!lines[1].includes('두 줄') && !lines[2].includes('두 줄'), '0 · 옛 줄은 안 씀');
  const old = readLines([row({})], DATA.cards, '2026-10-20');
  assert.ok(!old[2].includes('두 줄'), '옛 줄뿐이면 모은 줄에도 없다');
});

const stored = () => fakeIdb.get('profile', 'me');
async function seed(o) {
  await flushProfile();
  const cur = stored() || emptyProfile();
  fakeIdb.put('profile', { ...cur, ...o, id: 'me', updatedAt: (cur.updatedAt || 0) + 1 });
  await reloadProfile();
}

test('★ 🎯 저장 경로 (가짜 IndexedDB, Codex 106차): ★★ 미달 읽기 — 저장이 안 되면 없던 일 · 다시 저장하면 별·💰·기록이 같이 들고 🎯는 그대로 · 두 창이 미달·충족을 같이 저장하면 먼저 저장한 쪽이 별을 받고 뒤의 것은 🎯를 되살리지 않는다(두 차례 모두)', async () => {
  await initProfile();
  const c = cardOf(4);
  const start = () => seed({ coins: 0, coinsEarned: 0, korDone: { [`${c.id}:1`]: dayNum(Date.now()) - 1 }, korReads: [], korThrow: { earned: 5, used: 3, refunded: 0 } });
  await start();
  const s0 = JSON.stringify(stored());
  const low = rd(4, 1, { t: 1001 });
  fakeIdb.failNext('profile');
  assert.deepEqual(await korFinish(c.id, {}, IDS, 0, { read: low }), { ok: false, why: 'save' });
  assert.equal(JSON.stringify(stored()), s0, '저장이 안 되면 없던 일');
  const again = await korFinish(c.id, {}, IDS, 0, { read: low }); // [다시 저장하기] — 같은 읽기
  assert.deepEqual([again.ok, again.star, again.coins, again.noCatch, again.throws], [true, 2, KOR_COINS[2], 'first', 2]);
  const s = stored();
  assert.deepEqual([s.korDone[`${c.id}:2`], s.coins], [dayNum(Date.now()), KOR_COINS[2]], '별·💰가 같이');
  assert.deepEqual(s.korThrow, { earned: 5, used: 3, refunded: 0 }, '🎯는 그대로');
  assert.deepEqual(s.korReads.map((x) => [x.t, x.g, x.f]), [[1001, 2, 1]], '기록 줄 하나');
  // 두 창 — 같은 글의 ★★를 미달(처음 답 1/4)·충족(3/4) 읽기가 같이 저장
  for (const lowFirst of [true, false]) {
    await start();
    const lo = () => korFinish(c.id, {}, IDS, 0, { read: rd(4, 1, { t: 2001 }) });
    const hi = () => korFinish(c.id, {}, IDS, 0, { read: rd(4, 3, { t: 2002 }) });
    const [a, b] = await Promise.all((lowFirst ? [lo, hi] : [hi, lo]).map((f) => f()));
    assert.deepEqual([a.star, b.star], [2, 0], `먼저 저장한 쪽이 ★★ (${lowFirst ? '미달' : '충족'} 먼저)`);
    assert.equal(a.noCatch, lowFirst ? 'first' : undefined);
    assert.equal(b.noCatch, undefined, '별이 없으면 🎯 판정도 없다');
    const w = stored();
    assert.equal(w.korThrow.earned, lowFirst ? 5 : 6, lowFirst ? '뒤에 저장한 충족 읽기가 놓친 🎯를 되살리지 않는다' : '🎯 하나');
    assert.equal(w.coins, KOR_COINS[2], '💰 한 번');
    assert.deepEqual(w.korReads.map((x) => [x.t, x.g]).sort((x, y) => x[0] - y[0]), lowFirst ? [[2001, 2], [2002, 0]] : [[2001, 0], [2002, 2]], '기록은 둘 · 별은 먼저 저장한 줄');
  }
});
