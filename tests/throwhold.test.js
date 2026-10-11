// 🎯 던지기 예약 장부 (Codex 49차 #1·#2) — 뺀 기회가 판정 전에 사라지지 않게 · 돌려주기 실패를 잊지 않게 · 두 번 돌려주지 않게
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  holdsOf, holdAdd, holdDrop, holdBeat, holdClaim, holdsDue, holdsWait, newRid, refundOutcome, holdStore,
  HOLD_BEAT_MS, HOLD_STALE_MS, HOLD_MAX,
} from '../js/throwhold.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

/** 가짜 localStorage — 탭 여러 개가 같은 것을 본다 · broken이면 읽기·쓰기가 던진다 */
function fakeLs() {
  const m = new Map();
  const ls = {
    broken: false,
    getItem(k) { if (ls.broken) throw new Error('막힘'); return m.has(k) ? m.get(k) : null; },
    setItem(k, v) { if (ls.broken) throw new Error('막힘'); m.set(k, String(v)); },
    removeItem(k) { if (ls.broken) throw new Error('막힘'); m.delete(k); },
  };
  return ls;
}
/** 가짜 시계·타이머 — tick(ms)로 시간을 보내면 그 사이 interval이 돈다 */
function fakeClock(start = 1_000_000) {
  let t = start;
  let id = 0;
  const jobs = new Map();
  return {
    now: () => t,
    timers: {
      setInterval(fn, ms) { id += 1; jobs.set(id, { fn, ms, at: t + ms }); return id; },
      clearInterval(i) { jobs.delete(i); },
    },
    tick(ms) {
      const end = t + ms;
      for (;;) {
        const due = [...jobs.entries()].filter(([, j]) => j.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        t = due[1].at;
        due[1].at += due[1].ms;
        due[1].fn();
      }
      t = end;
    },
    live: () => jobs.size,
  };
}
/** 돌려주기 흉내 — 결과를 차례로 내놓고, 몇 번 불렸는지 센다 */
function giver(...outcomes) {
  const g = async () => { g.calls += 1; return outcomes.length ? outcomes.shift() : 'ok'; };
  g.calls = 0;
  return g;
}

test('🎯 장부 고쳐 읽기(순수): 모르는 꼴은 버린다 · 이름 꼴 · 시각은 0 이상 정수 · beat ≥ at · 많으면 새것 50줄만', () => {
  assert.deepEqual(holdsOf(null), {});
  assert.deepEqual(holdsOf([1, 2]), {});
  assert.deepEqual(holdsOf({ 'A B': { page: 'p', at: 1 }, ok1: 'x', ok2: { page: 'p1', at: 5, beat: 3 } }), { ok2: { page: 'p1', at: 5, beat: 5 } });
  assert.deepEqual(holdsOf({ r1: { page: '../x', at: -4, beat: 'z' } }), { r1: { page: '', at: 0, beat: 0 } });
  assert.deepEqual(holdsOf({ r1: { page: 'p', at: 1, beat: 2, claim: 'q', claimAt: 9 } }).r1, { page: 'p', at: 1, beat: 2, claim: 'q', claimAt: 9 });
  const many = {};
  for (let i = 0; i < HOLD_MAX + 7; i++) many[`r${i}`] = { page: 'p', at: i, beat: i };
  const kept = Object.keys(holdsOf(many));
  assert.equal(kept.length, HOLD_MAX);
  assert.ok(!kept.includes('r0') && kept.includes(`r${HOLD_MAX + 6}`), '가장 오래된 것부터 버린다');
  // 더하기·지우기·beat·잡기
  let m = holdAdd({}, 'r1', 'p1', 100);
  assert.deepEqual(m, { r1: { page: 'p1', at: 100, beat: 100 } });
  m = holdBeat(m, 'r1', 150);
  assert.equal(m.r1.beat, 150);
  assert.equal(holdBeat(m, 'r1', 120).r1.beat, 150, 'beat은 뒤로 안 간다');
  assert.deepEqual(holdClaim(m, 'r1', 'p2', 160).r1, { page: 'p1', at: 100, beat: 150, claim: 'p2', claimAt: 160 });
  assert.deepEqual(holdDrop(m, 'r1'), {});
  assert.deepEqual(holdAdd({}, 'BAD!', 'p1', 1), {}, '이름 꼴이 아니면 안 적는다');
  assert.match(newRid(() => 0.5, 1234), /^[a-z0-9]{1,40}$/);
  assert.notEqual(newRid(() => 0.1, 5), newRid(() => 0.2, 5));
});

test('🎯 돌려줄 줄(순수): 이 창의 줄은 쓰는 중이 아니면 바로 · 다른 창의 줄은 beat이 1분 넘게 멈춰야 · 다른 창이 잡은 줄은 건너뜀 · 오래된 것부터', () => {
  const now = 10 * HOLD_STALE_MS;
  const m = {
    mine: { page: 'me', at: 5, beat: now },              // 이 창 — 쓰는 중 아님 → 돌려줌
    using: { page: 'me', at: 6, beat: now },             // 이 창 — 쓰는 중 → 안 돌려줌
    fresh: { page: 'other', at: 1, beat: now - 1000 },   // 다른 창이 아직 살아 있다 → 안 돌려줌
    stale: { page: 'other', at: 2, beat: now - HOLD_STALE_MS }, // 다른 창이 1분 넘게 멈췄다 → 돌려줌
    taken: { page: 'gone', at: 3, beat: 0, claim: 'third', claimAt: now - 10 }, // 다른 창이 막 잡았다 → 건너뜀
    oldclaim: { page: 'gone', at: 4, beat: 0, claim: 'third', claimAt: now - HOLD_STALE_MS }, // 잡은 지 오래 → 돌려줌
    myclaim: { page: 'gone', at: 0, beat: 0, claim: 'me', claimAt: now }, // 내가 잡았던 것 → 돌려줌
  };
  assert.deepEqual(holdsDue(m, { page: 'me', live: new Set(['using']), now }), ['myclaim', 'stale', 'oldclaim', 'mine']);
  assert.deepEqual(holdsDue(m, { page: 'me', live: ['using'], now }), ['myclaim', 'stale', 'oldclaim', 'mine'], 'live는 배열이어도');
  assert.equal(holdsWait(m, { page: 'me', now }), HOLD_STALE_MS - 1000, '살아 있는 다른 창의 줄이 오래될 때까지');
  assert.equal(holdsWait({ a: { page: 'me', at: now, beat: now } }, { page: 'me', now }), null, '이 창의 줄은(막 적었어도) 기다리지 않는다');
});

test('🎯 돌려주기 결과(순수): 저장됨 ok · 돌려줄 게 없음 none · 저장 실패는 오류가 아니라 {ok:false}로 온다 → fail', () => {
  assert.equal(refundOutcome({ ok: true }), 'ok');
  assert.equal(refundOutcome({ ok: false, why: 'none' }), 'none');
  assert.equal(refundOutcome({ ok: false, why: 'save' }), 'fail');
  assert.equal(refundOutcome(undefined), 'fail');
});

test('★ 🎯 장부 한 창: 뺄 때 한 줄 · 판정이 나면 지움(두 번 불러도 한 번) · 돌려주기가 저장되면 지움 · 실패하면 남아 다음 정리 때 돌려줌 · 열린 동안만 beat', async () => {
  const ls = fakeLs();
  const c = fakeClock();
  const h = holdStore('k', { ls, page: 'tab1', now: c.now, timers: c.timers });
  // 판정
  const a = h.track('ra');
  assert.deepEqual(Object.keys(h.list()), ['ra']);
  assert.equal(c.live(), 1, '살아 있다는 표시를 시작');
  c.tick(HOLD_BEAT_MS * 3);
  assert.equal(h.list().ra.beat, c.now(), '열린 동안 beat');
  a.judged();
  a.judged();
  assert.deepEqual(h.list(), {}, '판정 = 쓴 기회');
  assert.equal(c.live(), 0, 'beat 멈춤');
  assert.equal(await a.refund(giver('ok')), false, '판정 뒤에는 돌려주지 않는다');
  // 돌려주기 성공
  const b = h.track('rb');
  const g1 = giver('ok');
  assert.equal(await b.refund(g1), true);
  assert.equal(await b.refund(g1), true, '두 번 불러도');
  assert.equal(g1.calls, 1, '한 번만 돌려준다');
  assert.deepEqual(h.list(), {});
  b.judged();
  assert.deepEqual(h.list(), {}, '돌려준 뒤 판정은 없다');
  // 돌려주기 실패 → 남음 → 정리 때
  const d = h.track('rd');
  assert.equal(await d.refund(giver('fail')), false);
  assert.deepEqual(Object.keys(h.list()), ['rd'], '실패하면 줄이 남는다');
  assert.equal(c.live(), 0);
  const g2 = giver('fail', 'ok');
  assert.equal(await h.settle(g2), 0, '정리도 실패하면 남긴다');
  assert.deepEqual(Object.keys(h.list()), ['rd']);
  assert.equal(await h.settle(g2), 1);
  assert.deepEqual(h.list(), {});
  // 정리는 저장이 실패하면 거기서 멈춘다 — 뒤의 줄은 시도하지 않고 다음에
  assert.equal(await h.track('rx1').refund(giver('fail')), false);
  assert.equal(await h.track('rx2').refund(giver('fail')), false);
  const using = h.track('rx3'); // 쓰는 중 — 정리가 건드리지 않는다
  const g4 = giver('fail', 'ok');
  assert.equal(await h.settle(g4), 0);
  assert.equal(g4.calls, 1, '첫 줄이 실패하면 멈춘다(뒤의 줄은 다음에)');
  assert.deepEqual(Object.keys(h.list()).sort(), ['rx1', 'rx2', 'rx3']);
  const g5 = giver();
  assert.equal(await h.settle(g5), 2, '다음 정리에서 남은 둘을 돌려준다');
  assert.equal(g5.calls, 2);
  assert.deepEqual(Object.keys(h.list()), ['rx3']);
  using.judged();
  // 돌려줄 게 없으면(none) 줄만 지운다
  const e = h.track('re');
  assert.equal(await e.refund(giver('none')), true);
  assert.deepEqual(h.list(), {});
  // 쓰는 중인 줄은 정리가 건드리지 않는다
  const f = h.track('rf');
  const g3 = giver();
  assert.equal(await h.settle(g3), 0);
  assert.equal(g3.calls, 0);
  f.judged();
});

test('★ 🎯 새로 고침·앱 꺼짐: 뺀 뒤 판정 전에 꺼지면 다음에 돌려준다 — 같은 창(새로 고침)은 바로, 다른 창(다시 켬)은 1분 뒤 · 돌려주는 사이 겹쳐 돌아도 한 번', async () => {
  const ls = fakeLs();
  const c = fakeClock();
  const before = holdStore('k', { ls, page: 'tab1', now: c.now, timers: c.timers });
  before.track('r1'); // 뺐다 → 잡기 창 → 꺼짐(판정 없음)
  // 새로 고침 — 같은 창 이름(sessionStorage), 메모리는 비었다
  const after = holdStore('k', { ls, page: 'tab1', now: c.now, timers: fakeClock().timers });
  const g = giver('ok', 'ok');
  const [n1, n2] = await Promise.all([after.settle(g), after.settle(g)]);
  assert.deepEqual([n1, n2, g.calls], [1, 1, 1], '겹쳐 불러도 한 번 돌려준다');
  assert.deepEqual(after.list(), {});
  // 앱을 껐다 다시 켬 — 다른 창 이름
  const c2 = fakeClock();
  const old = holdStore('k', { ls, page: 'taba', now: c2.now, timers: c2.timers });
  old.track('r2');
  const fresh = holdStore('k', { ls, page: 'tabb', now: c2.now, timers: fakeClock().timers });
  const g2 = giver();
  assert.equal(await fresh.settle(g2), 0, '방금 멈춘 다른 창의 줄은 기다린다(아직 열려 있을 수 있다)');
  assert.equal(fresh.waitMs(), HOLD_STALE_MS);
  c2.tick(HOLD_STALE_MS / 2); // 옛 창이 아직 살아 beat을 적는다
  assert.equal(await fresh.settle(g2), 0, '살아 있는 창의 잡기는 건드리지 않는다');
  assert.equal(g2.calls, 0);
  // 옛 창이 사라졌다 (beat 멈춤) — 새 창의 시계만 간다
  const c3 = { now: () => c2.now() + HOLD_STALE_MS + 1 };
  const later = holdStore('k', { ls, page: 'tabb', now: c3.now, timers: fakeClock().timers });
  assert.equal(await later.settle(g2), 1);
  assert.equal(g2.calls, 1);
  assert.deepEqual(later.list(), {});
});

test('🎯 두 창이 같은 옛 줄을 정리: 먼저 잡은 창만 돌려준다 · 정리는 실패에서 멈추고 나머지는 다음에', async () => {
  const ls = fakeLs();
  const t = { now: () => 5 * HOLD_STALE_MS };
  ls.setItem('k', JSON.stringify({ x1: { page: 'gone', at: 1, beat: 0 }, x2: { page: 'gone', at: 2, beat: 0 } }));
  const A = holdStore('k', { ls, page: 'taba', ...t, timers: fakeClock().timers });
  const B = holdStore('k', { ls, page: 'tabb', ...t, timers: fakeClock().timers });
  // A가 x1을 잡고 돌려주는 사이(저장 기다림) B가 정리하면 — B는 x1을 건너뛰고 x2부터
  let release;
  const slow = () => new Promise((res) => { release = () => res('ok'); });
  const pa = A.settle(slow);
  await Promise.resolve();
  const gb = giver('fail');
  assert.equal(await B.settle(gb), 0);
  assert.equal(gb.calls, 1, 'B는 x2만 시도했다(실패 — 남김)');
  release();
  // A는 x1을 끝내고 x2로 — B가 잡은 지 1분이 안 됐으니 건너뛴다
  assert.equal(await pa, 1);
  assert.deepEqual(Object.keys(A.list()), ['x2']);
});

test('🎯 기기 저장소가 막혀도(사생활 창·꽉 참) 던지기는 된다 — 줄만 못 남긴다', async () => {
  const ls = fakeLs();
  ls.broken = true;
  const c = fakeClock();
  const h = holdStore('k', { ls, page: 'tab1', now: c.now, timers: c.timers });
  const a = h.track('r1');
  c.tick(HOLD_BEAT_MS * 2);
  a.judged();
  assert.equal(await h.track('r2').refund(giver('ok')), true);
  assert.equal(await h.settle(giver()), 0);
  assert.deepEqual(h.list(), {});
});

test('🎯 화면 연결: 📚 국어·🔢 수학 잡기가 장부를 쓴다 — 뺀 뒤 한 줄 · 판정 때 지움 · 돌려주기 결과를 본다 · 들어올 때 정리 · 정직한 말 · sw', () => {
  const kv = read('js/koreanview.js');
  const body = (src, head) => { const i = src.indexOf(head); assert.ok(i >= 0, head); return src.slice(i, src.indexOf('\n}\n', i)); };
  // 국어
  const run = body(kv, 'export async function runKorCatch() {');
  const iTake = run.indexOf('taken = await korTakeThrow();');
  const iTrack = run.indexOf('const st = { threw: false, hold: holds.track() };');
  assert.ok(iTake >= 0 && iTake < iTrack && iTrack < run.indexOf('openCatch({'), '뺀 다음, 띄우기 전에 줄');
  assert.ok(run.includes('attempt: (id, opts) => { st.threw = true; st.hold.judged(); return catchAttempt(id, Math.random, opts); },'), '판정 때 지움');
  assert.ok(run.includes('if (r && r.threw === false && !st.threw) st.hold.refund(korGiveBack).then((ok) => { if (!ok) ui.catchMsg = CATCH_WHY.owed; }).finally(done);'), '안 던지고 닫으면 돌려줌 · 실패하면 말');
  assert.ok(run.includes('if (!koreanVisible()) { await st.hold.refund(korGiveBack); ui.catching = false; return; }'), '뺀 사이 나가면 돌려줌');
  assert.ok(run.includes('ui.catchMsg = back ? CATCH_WHY.error : CATCH_WHY.errorOwed;'), '못 열었을 때 돌려줬는지에 따라 말');
  assert.ok(!/korGiveBackThrow\(\)\.catch/.test(kv), '저장 결과를 안 보는 돌려주기가 남지 않았다');
  assert.ok(body(kv, 'async function korGiveBack() {').includes('return refundOutcome(await korGiveBackThrow());'));
  assert.ok(body(kv, 'function settleLostCatch() {').includes('return st.hold.refund(korGiveBack).then((ok) => { if (!ok) ui.catchMsg = CATCH_WHY.owed; refreshAfterCatch(); });'));
  assert.ok(body(kv, 'export async function enterKorean() {').includes('settleKorThrows();'), '국어에 들어올 때 정리');
  assert.match(kv, /const holds = holdStore\('shincoach\.korean\.throwHolds'\);/);
  // 수학 — 같은 모양 (Codex 49차: 국어만 본 틈이 수학에도)
  const m = read('js/math.js');
  const rc = body(m, 'async function runCatches(n, { g, c, run, onAll, onStop }) {');
  const mTake = rc.indexOf('taken = takePending(m);');
  const mTrack = rc.indexOf('st = { threw: false, hold: holds.track() };');
  assert.ok(mTake >= 0 && mTake < mTrack && mTrack < rc.indexOf('openCatch({'), '수학도 뺀 다음 줄');
  assert.ok(rc.includes('attempt: (id, opts) => { st.threw = true; st.hold.judged(); return catchAttempt(id, Math.random, opts); },'));
  assert.ok(rc.includes('if (r && r.threw === false && !st.threw) {') && rc.includes('giveBack(st.hold).then((ok) => { if (!ok) ui.pendNote = PEND_NOTE.owed; })'));
  assert.ok(rc.includes("stop(back ? 'error' : 'errorOwed');"));
  const iLost = rc.indexOf('await settleLostMathCatch();');
  assert.ok(iLost >= 0 && iLost < rc.indexOf('if (ui.catching) return;'), '소식 없이 닫힌 창부터 정리');
  assert.ok(body(m, 'export async function renderMath() {').includes('  settleLostMathCatch(); //'), '수학에 들어올 때도');
  assert.ok(body(m, 'function settleLostMathCatch() {').includes('return st.threw ? null : st.hold.refund(mathGiveBack);'));
  assert.ok(body(m, 'async function mathGiveBack() {').includes("return 'ok'; } catch { return 'fail'; }"));
  const rm = body(m, 'export async function renderMath() {');
  assert.ok(rm.indexOf('await settleMathThrows()') >= 0 && rm.indexOf('await settleMathThrows()') < rm.indexOf('getMath()'), '사다리를 읽기 전에 돌려준다');
  assert.ok(!m.includes('settleOwedThrows'), '옛 정리는 새 정리 안으로');
  // sw
  assert.match(read('sw.js'), /'\.\/js\/throwhold\.js',/);
});
