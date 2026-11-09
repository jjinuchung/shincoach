// 🤔 국어 v406 (2026-11-09 아버님 「이대로」) — node --test tests/korwait406.test.js
//   📍 근거부터에서 줄을 빨리 셋 눌러 두 줄 도움을 받고 둘 중 하나를 고르는 길이 글을 읽는 길보다 빠를 수 있다 →
//   답을 고르기 전 근거 찾기에서만: ① 잘못 누르면 2초 동안 줄을 못 누름(물음을 다시 읽게 · 숫자 없이 줄어드는 막대) ·
//   ② 두 줄로 좁히기는 잘못 셋 **그리고** 근거 찾기가 시작된 지 20초(읽는 시계) 뒤 · ③ 한 번에 찾으면 「🎯 한 번에 찾았어요!」(말만)
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EV_WAIT_MS, EV_PAIR_SEC, EV_PAIR_AT, EV_RANGE_AT, evWaitLeft, pairDue, evPair } from '../js/korean.js';
import { readLines } from '../js/korreport.js';

void fakeIdb;
const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const src = read('js/koreanview.js');
const body = (head) => { const i = src.indexOf(head); assert.ok(i >= 0, head); return src.slice(i, src.indexOf('\n}\n', i)); };
const ST = (o) => ({ wrong: [], answered: false, evDone: false, evWrong: [], evFirst: false, pair: null, evFrom: -1, waitTo: 0, ...o });

test('🤔 정한 값 — 잘못 누른 뒤 2초 · 두 줄은 20초 뒤 · 잘못 셋(범위 말 둘 다음)', () => {
  assert.equal(EV_WAIT_MS, 2000);
  assert.equal(EV_PAIR_SEC, 20);
  assert.equal(EV_PAIR_AT, 3);
  assert.ok(EV_RANGE_AT < EV_PAIR_AT);
});

test('🤔 evWaitLeft (순수): 잘못 누른 뒤 남은 ms · 끝나면 0 · 답 뒤·찾은 뒤 0 · 시계가 뒤로 가도 2초까지 · 깨진 값 0', () => {
  const now = 1_000_000;
  const st = ST({ waitTo: now + EV_WAIT_MS });
  assert.equal(evWaitLeft(st, now), EV_WAIT_MS);
  assert.equal(evWaitLeft(st, now + 500), 1500);
  assert.equal(evWaitLeft(st, now + EV_WAIT_MS - 1), 1);
  assert.equal(evWaitLeft(st, now + EV_WAIT_MS), 0, '끝나는 그 ms에 열린다');
  assert.equal(evWaitLeft(st, now + 60_000), 0);
  assert.equal(evWaitLeft(ST({ waitTo: now + 60_000 }), now), EV_WAIT_MS, '기기 시계가 뒤로 가도 길게 잠기지 않는다');
  assert.equal(evWaitLeft({ ...st, answered: true }, now), 0, '맞힌 뒤의 근거 잡기엔 없음');
  assert.equal(evWaitLeft({ ...st, evDone: true }, now), 0, '찾은 뒤엔 없음');
  assert.equal(evWaitLeft(ST({}), now), 0, '잘못 누른 적 없으면 0');
  for (const bad of [null, undefined, ST({ waitTo: NaN }), ST({ waitTo: 'x' }), ST({ waitTo: undefined })]) assert.equal(evWaitLeft(bad, now), 0);
  assert.equal(evWaitLeft(st, NaN), 0);
});

test('🔍 pairDue (순수): 잘못 셋 그리고 근거 찾기 20초 뒤 · 경계 양쪽 · 답 뒤·찾은 뒤·이미 좁힘·시작 전이면 아님', () => {
  const st = ST({ evWrong: [1, 2, 3], evFrom: 10 });
  assert.equal(pairDue(st, 10 + EV_PAIR_SEC - 1), false, '19초 — 아직');
  assert.equal(pairDue(st, 10 + EV_PAIR_SEC), true, '20초');
  assert.equal(pairDue(st, 999), true);
  assert.equal(pairDue({ ...st, evWrong: [1, 2] }, 999), false, '잘못 둘은 범위 말만');
  assert.equal(pairDue({ ...st, evWrong: [1, 2, 3, 4] }, 999), true);
  assert.equal(pairDue({ ...st, evFrom: -1 }, 999), false, '근거 찾기가 아직 안 보였다');
  assert.equal(pairDue({ ...st, evFrom: 0 }, EV_PAIR_SEC), true, '0초에 시작했어도');
  assert.equal(pairDue({ ...st, answered: true }, 999), false);
  assert.equal(pairDue({ ...st, evDone: true }, 999), false);
  assert.equal(pairDue({ ...st, pair: [2, 3] }, 999), false, '한 번 정하면 그대로');
  for (const bad of [null, undefined, { ...st, evWrong: 'x' }, { ...st, evFrom: NaN }]) assert.equal(pairDue(bad, 999), false);
  assert.equal(pairDue(st, NaN), false);
  // 셋을 빨리 눌렀다 — 그 자리에선 안 좁히고, 읽는 시계가 20초에 닿으면 좁힌다(evPair는 그대로)
  const fast = ST({ evWrong: [1, 4, 6], evFrom: 5 });
  assert.equal(pairDue(fast, 8), false);
  assert.deepEqual(evPair([3], 8, fast.evWrong, 0), [2, 3]);
});

test('🔌 배선 — 줄 누르기: 쉬는 동안 누름은 그냥 넘김(줄 수·잘못 수 안 늘림) · 잘못 누르면 답 전만 쉼 시작 · 두 줄은 pairDue로', () => {
  const pick = body('function evPick(n) {');
  const guard = 'if (evWaitLeft(st, waitClock()) > 0) return;';
  assert.ok(pick.includes(guard), '쉬는 동안 누름');
  assert.ok(pick.indexOf(guard) < pick.indexOf('st.evWrong.push(n);') && pick.indexOf(guard) < pick.indexOf('if (q.ev.includes(n)) {'), '맞는 줄도 쉬는 동안엔 안 받는다 · 세기 전에');
  assert.ok(pick.includes('if (!st.answered) evWaitStart(r, st);'), '맞힌 뒤의 근거 잡기엔 쉼 없음');
  assert.ok(pick.indexOf('st.evWrong.push(n);') < pick.indexOf('if (pairDue(st, r.sec))'), '방금 누른 줄까지 세고');
  const start = body('function evWaitStart(r, st) {');
  assert.ok(start.includes('st.waitTo = waitClock() + EV_WAIT_MS;'), '쉼은 앱을 켠 뒤 흐른 시간으로 (Codex 211차 P2)');
  const clock = body('function waitClock() {');
  assert.ok(clock.includes("return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();"), '기기 시계를 돌려도 안 흔들리는 시계 먼저');
  for (const name of ['function evPick(n) {', 'function evWaitStart(r, st) {', 'function evidenceEl(q, st, unit) {']) assert.ok(!/evWaitLeft\(st, Date\.now\(\)\)|waitTo = Date\.now\(\)/.test(body(name)), `${name} — 쉼에 기기 시계를 안 쓴다`);
  assert.ok(start.includes('setTimeout(() => { if (ui.read === r && r.qs[r.qi] === st && !st.evDone && !st.answered) renderQ(); }, EV_WAIT_MS + 30);'), '끝나면 그 물음일 때만 다시 그림');
});

test('🔌 배선 — 그리기: 근거 찾기가 시작된 때(evFrom) · 쉬는 동안 물음 테두리 · 줄 흐리게 · 「그 문장이 아니에요」 + 숫자 없는 막대 · 말 차례', () => {
  const open = body('function openCard(id) {');
  assert.ok(open.includes('wrongAtEv: -1, evFrom: -1, waitTo: 0 })'), '물음마다 처음은 비어 있음');
  const rq = body('function renderQ() {');
  assert.ok(rq.includes('if (evFirst && st.evFrom < 0) st.evFrom = r.sec;'), '근거 찾기가 처음 보인 때 한 번');
  assert.ok(rq.indexOf('const evFirst = evFirstNow(q, st);') < rq.indexOf('if (evFirst && st.evFrom < 0)'));
  assert.ok(rq.includes("`kor-q-text${evWaitLeft(st, waitClock()) > 0 ? ' is-reread' : ''}`"), '물음을 다시 읽게');
  const ev = body('function evidenceEl(q, st, unit) {');
  assert.ok(ev.includes('const wait = first ? evWaitLeft(st, waitClock()) : 0;'), '답을 고르기 전만');
  assert.ok(ev.includes("if (wait) rows.classList.add('is-wait');"));
  assert.ok(ev.includes('b.disabled = st.evDone || miss || far;'), '쉬는 동안에도 줄 단추는 그대로(초점이 안 사라지게)');
  const at = (s) => { const i = ev.indexOf(s); assert.ok(i >= 0, s); return i; };
  assert.ok(at('if (st.evDone) {') < at('else if (wait) {') && at('else if (wait) {') < at('else if (pair) {') && at('else if (pair) {') < at('else if (first && st.evWrong.length >= EV_RANGE_AT'), '찾음 · 쉼 · 두 줄 · 범위 차례');
  assert.ok(ev.includes('msg.textContent = `🤔 물음을 다시 읽고, 답을 더 잘 받쳐 주는 ${unit}을 찾아봐요.`;'), '단정하지 않는 말 (Codex 48차 #2 · 211차)');
  assert.ok(!ev.includes('이 아니에요'), '「그 문장이 아니에요」는 걷었다');
  assert.ok(ev.includes("const bar = el('span', 'kor-ev-wait');") && ev.includes("bar.setAttribute('aria-hidden', 'true');") && ev.includes('fill.style.animationDuration = `${wait}ms`;'), '막대는 남은 만큼(다시 그려도 끝이 같다)');
  assert.ok(ev.includes('    bar.appendChild(fill);\n    msg.appendChild(bar);\n'), '막대가 말 밑에 붙는다');
  assert.ok(ev.indexOf('msg.appendChild(bar);') > ev.indexOf('msg.textContent = `🤔 물음을 다시 읽고,'), '글을 쓴 뒤에 붙인다(textContent가 지우지 않게)');
  for (const u of ['문장', '줄']) assert.ok(!/\d/.test(`🤔 물음을 다시 읽고, 답을 더 잘 받쳐 주는 ${u}을 찾아봐요.`), '셈 말 없음');
});

test('🔌 배선 — 읽는 시계: 근거 찾기 중이고 pairDue면 두 줄을 정해 다시 그림(고를 줄이 없으면 안 그림) · 1초씩 센 뒤에', () => {
  const tick = body('function tickRead() {');
  const inc = tick.indexOf('r.sec += 1;');
  assert.ok(inc >= 0 && inc < tick.indexOf('pairDue(st, r.sec)'), '센 뒤에 본다');
  assert.ok(tick.includes('if (st && evFirstNow(q, st) && pairDue(st, r.sec)) {'), '근거 찾기 중일 때만');
  assert.ok(tick.includes('const p = evPair(q.ev, lineCount(r.card), st.evWrong, st.pairSide);') && tick.includes('if (p) { st.pair = p; renderQ(); }'));
  assert.ok(tick.indexOf('if (!r || r.result || r.saving || r.qi >= r.card.qs.length) return;') < tick.indexOf('const q = r.card.qs[r.qi];'), '다 읽은 뒤엔 물음을 안 본다');
});

test('🎯 한 번에 찾으면 칭찬 (qFeedback): 잘못 누른 줄이 없을 때만 · 🔊 읽는 중에도 · 셈 말 없음', async () => {
  const { qFeedback } = await import('../js/koreanview.js');
  const q = { ev: [3, 5], opts: [{ ok: true, t: '맞음' }, { ok: false, type: 'detail', t: '틀림' }] };
  const r = { ls: null };
  const found = ST({ gate: true, evFirst: true, evDone: true, wrongAtEv: 0 });
  assert.equal(qFeedback(q, found, '문장', r).text, '🎯 한 번에 찾았어요! 칠한 문장(③, ⑤)을 다시 읽고 보기에서 골라 봐요.');
  assert.equal(qFeedback(q, { ...found, sayOn: true }, '줄', r).text, '🎯 한 번에 찾았어요! 🔊 찾은 줄을 읽어 줄게요. 다 들으면 보기가 열려요.');
  assert.equal(qFeedback(q, { ...found, evWrong: [1] }, '문장', r).text, '찾았어요! 칠한 문장(③, ⑤)을 다시 읽고 보기에서 골라 봐요.', '잘못 누른 줄이 있으면 예전 말');
  assert.equal(qFeedback(q, { ...found, evFirst: false, answered: true }, '문장', r).text, '맞아요!', '맞힌 뒤의 근거 잡기는 칭찬 없음(맞힘이 먼저)');
  const noArr = { ...found };
  delete noArr.evWrong;
  assert.equal(qFeedback(q, noArr, '문장', r).text, '찾았어요! 칠한 문장(③, ⑤)을 다시 읽고 보기에서 골라 봐요.', '잘못 누른 줄 목록이 없는 옛 상태는 칭찬 없음');
  assert.ok(!/\d/.test('🎯 한 번에 찾았어요! '));
});

test('📤 국어 요약 머리말 — v406 바뀐 점이 정한 값으로 · css · sw v406', () => {
  const L = readLines([], [], '2026-11-09');
  assert.ok(L[1].includes(`v406부터는 근거 찾기가 시작된 지 ${EV_PAIR_SEC}초가 지난 뒤에만 · 잘못 누르면 ${EV_WAIT_MS / 1000}초 동안 줄을 못 누름 · 한 번에 찾으면 🎯 칭찬 말 — 잘못 누른 줄·찾기까지를 v406 전후로 견주기`));
  assert.match(read('js/korreport.js'), /v406부터는 근거 찾기가 시작된 지 \$\{EV_PAIR_SEC\}초가 지난 뒤에만 · 잘못 누르면 \$\{EV_WAIT_MS \/ 1000\}초/, '값을 글로 박지 않는다');
  const css = read('css/style.css');
  for (const s of ['.kor-ev-rows.is-wait .kor-ev-row {', '.kor-q-text.is-reread {', '.kor-ev-wait {', '.kor-ev-wait i {', '@keyframes korWait {']) assert.ok(css.includes(s), s);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.kor-q-text\.is-reread \{ animation: none; \} \}/);
  assert.match(read('sw.js'), /CACHE_VERSION = 'v406'/);
  assert.match(read('js/version.js'), /APP_VERSION = 'v406'/);
});
