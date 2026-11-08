// ⏳ v402 Codex 205차: 시간을 저장하는 동안에도 잠금이 풀려 보이지 않는다
//  — flushTime이 못 쓴 초를 0으로 만든 뒤 저장이 끝날 때까지 형편이 옛 저장값만 봐서, 🔁 계속·⟲ 처음부터(그리고 모든 과목의 ▶ 관문)가 그 틈에 열렸다
import { fakeIdb } from './fakeidb.js'; // ★ db.js보다 먼저
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

const tl = await import('../js/timelimit.js');

const DAY = '2026-11-09'; // 월요일
const row = (k) => (fakeIdb.get('daily', DAY) || {})[k] || 0;

async function waitFor(cond, what, ms = 3000) { // Date는 가짜 시계라 performance로 잰다
  const end = performance.now() + ms;
  while (!cond()) {
    if (performance.now() > end) throw new Error(`기다림 끝: ${what}`);
    await new Promise((r) => setTimeout(r, 5));
  }
}

test('⏳ 저장하는 동안에도 잠금 그대로 · 잠긴 동안 더 안 셈 · 저장이 끝나면 두 번 세지 않음 · 실패하면 못 쓴 초로 되돌림', async () => {
  const base = new Date(2026, 10, 9, 10, 0, 0).getTime();
  mock.timers.enable({ apis: ['Date'], now: base });
  const realInterval = globalThis.setInterval;
  let secTick = null;
  globalThis.setInterval = (fn) => { secTick = fn; return 1; };
  let clockMs = base;
  const sec = (n) => { for (let i = 0; i < n; i++) { clockMs += 1000; mock.timers.setTime(clockMs); tl.noteActivity(); secTick(); } };
  const one = { weekday: 1, weekend: 1 }; // 1분 = 60초
  try {
    await tl.initTimeLimit({ conf: () => ({ off: false, min: one, minMusic: one }) });
    globalThis.setInterval = realInterval;
    // 🎹 음악 — 45초를 저장해 두고 15초를 더 쓴다
    tl.setSubject('music');
    for (const n of [14, 14, 14, 3]) { sec(n); await tl.flushTime(); }
    assert.equal(row('musicTime'), 45);
    sec(15); // 15초째에 저장이 시작된다 (FLUSH_SEC) — 아직 안 끝났다
    assert.equal(tl.status('music').used, 60, '저장하는 중인 초도 쓴 시간');
    assert.equal(tl.isLocked('music'), true, '저장하는 동안에도 잠김 — 옛 저장값 45초만 보고 15초 남았다고 하지 않는다');
    sec(3);
    assert.equal(tl.status('music').used, 60, '잠긴 동안은 저장 중에도 더 세지 않는다');
    await waitFor(() => row('musicTime') === 60 && tl.todayDaily().musicTime === 60, '음악 저장');
    assert.equal(tl.status('music').used, 60, '저장이 끝나면 저장값만 — 두 번 세지 않는다');
    assert.equal(tl.isLocked('music'), true);
    // ✏️ 수학 — 저장이 실패하면 못 쓴 초로 되돌아간다
    tl.setSubject('math');
    sec(14);
    await tl.flushTime();
    assert.equal(row('mathTime'), 14);
    fakeIdb.failNext('daily');
    sec(15); // 15초째에 저장 시작 (실패할 저장)
    assert.equal(tl.status('math').used, 29, '저장하는 중');
    await waitFor(() => fakeIdb.failsLeft() === 0, '실패가 쓰였다');
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(row('mathTime'), 14, '실패했다');
    assert.equal(tl.status('math').used, 29, '실패한 초는 못 쓴 초로 — 사라지지도, 두 번 들지도 않는다');
    await tl.flushTime();
    assert.equal(row('mathTime'), 29, '다음 저장에 함께');
    assert.equal(tl.status('math').used, 29);
    // 🎹 다른 과목의 저장 중인 초는 이 과목 형편에 안 든다
    assert.equal(tl.status('music').used, 60);
    tl.setSubject(null);
  } finally {
    globalThis.setInterval = realInterval;
    mock.timers.reset();
  }
});
