// 🎮 게임기 미니 게임 5단계 (v311 · 2026-10-21 아버님 "몬스터볼 탑 쌓기 진행하자" → 물음 둘 모두 추천안) — node --test tests/minigame311.test.js
// 🗼 몬스터볼 탑 쌓기: 좌우로 미끄러지는 몬스터볼을 톡 → 똑바로 떨어짐 · 딱 ⭐2 · 올라가면 ⭐1 · 많이 비끼면 데굴데굴(탑은 그대로 · 감점 없음)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GAMES, gameById } from '../js/minigame.js';
import {
  TOWER_SEC, TOWER_W, TOWER_H, FLOOR_Y, HANG_Y, TOP_Y, BALL, STEP, BASE_H, BASE_W, PERFECT_D, OK_D, BASE_OK_D, X_MIN, X_MAX, TOWER_PTS,
  towerSpeed, topH, camFor, topX, towerStart, towerJudge, towerTick, towerTap, towerShift, runTower,
} from '../js/gametower.js';

const src = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
function seeded(seed = 7) {
  let x = seed >>> 0;
  return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 2 ** 32; };
}
const SEEDS = [1, 7, 42, 2026, 99999, 31337, 5, 777];

// ───────────────────── 목록 · 게임기 화면 연결 ─────────────────────

test('🎮 v311 게임 목록 — 🗼 몬스터볼 탑 쌓기 30초 · 화면(RUNNERS)·준비(prep 없음 — 볼은 CSS 무늬)', () => {
  assert.deepEqual(GAMES.map((g) => g.id).slice(0, 7), ['dig', 'run', 'shadow', 'pair', 'berry', 'balloon', 'tower'], '일곱째까지 (v312부터 더 늘어난다 — minigame312)');
  assert.equal(gameById('tower').sec, TOWER_SEC);
  assert.equal(TOWER_SEC, 30);
  for (const g of GAMES) assert.ok(!/\d/.test(g.how), `${g.id}: 아이가 보는 설명에 숫자 없음`);
  const gv = src('js/gameview.js');
  assert.match(gv, /\n {2}tower: \{ run: runTower, prep: async \(\) => \(\{\}\) \},/);
  assert.match(gv, /import \{ runTower \} from '\.\/gametower\.js';/);
  const tw = src('js/gametower.js');
  assert.ok(!/coins|addCoins|applyPurchase|items\[|itemCount|useBall|BALLS|xp\.js|db\.js|pokemon\.js/.test(tw), '저장·가방·볼 수를 안 만진다 (쌓아도 볼이 줄지 않는다)');
});

test('🎮 서비스워커 v311 · 새 파일 · css (볼 무늬는 🃏 카드 뒷면과 같은 색 · 굴러떨어지기 · 마당이 내려감)', () => {
  const sw = src('sw.js');
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(sw) || [])[1]) >= 311, 'sw v311 이상');
  assert.ok(sw.includes("'./js/gametower.js'"));
  const css = src('css/style.css');
  assert.match(css, /\.gt-ball-in \{[^}]*background-color: #e8413b;[^}]*#2b2d42[^}]*#fff/, '몬스터볼 무늬 (빨강 · 까만 띠 · 하양)');
  assert.match(css, /\.gp-back \{ background-color: #e8413b;/, '🃏 카드 뒷면과 같은 빨강');
  assert.match(css, /\.gt-field \{[^}]*touch-action: manipulation;/);
  assert.match(css, /\.gt-world \{ transition: transform 0\.25s ease-out;/, '마당은 0.25초에 걸쳐 내려간다 (다음 볼은 0.35초 뒤)');
  assert.match(css, /\.gt-ball\.is-miss\.is-l \.gt-ball-in \{ animation: gt-roll-l/);
  assert.match(css, /\.gt-ball\.is-miss\.is-r \.gt-ball-in \{ animation: gt-roll-r/);
  assert.match(css, /\.gt-world, \.gt-sky \{[^}]*pointer-events: none;/, '누름은 마당이 받는다');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.gt-world \{ transition: none; \}/);
});

// ───────────────────── 🗼 엔진 ─────────────────────

test('🗼 빠르기·높이·마당 — 쌓을수록 32 → 64칸/초 · 꼭대기 높이 · 마당은 꼭대기가 TOP_Y를 넘으면 한 층씩 내려간다', () => {
  assert.deepEqual([towerSpeed(0), towerSpeed(1), towerSpeed(16), towerSpeed(99)], [32, 34, 64, 64]);
  assert.deepEqual([towerSpeed(NaN), towerSpeed(-3), towerSpeed(undefined)], [32, 32, 32]);
  for (let f = 0; f < 40; f++) assert.ok(towerSpeed(f + 1) >= towerSpeed(f));
  assert.deepEqual([topH(0), topH(1), topH(3)], [BASE_H, BASE_H + STEP, BASE_H + 3 * STEP]);
  assert.deepEqual([camFor(0), camFor(1), camFor(2)], [0, 0, 0], '낮을 때는 그대로');
  assert.equal(camFor(3), topH(3) - (FLOOR_Y - TOP_Y));
  for (let f = 3; f < 40; f++) assert.equal(camFor(f + 1) - camFor(f), STEP, '높아지면 한 층씩');
  for (let f = 0; f < 40; f++) assert.ok(FLOOR_Y - topH(f) + camFor(f) >= TOP_Y - 1e-9, '꼭대기는 늘 TOP_Y 아래 — 매달린 볼과 안 겹친다');
  assert.deepEqual([TOWER_W, TOWER_H, FLOOR_Y, HANG_Y, TOP_Y, BALL, STEP, BASE_W], [100, 75, 70, 10, 36, 12, 11, 28]);
  assert.deepEqual([X_MIN, X_MAX], [7, 93]);
  assert.deepEqual(TOWER_PTS, { perfect: 2, stack: 1 });
  assert.ok(TOP_Y - HANG_Y > BALL, '매달린 볼 아래로 한 볼 넘게 빈 자리');
});

test('🗼 판정 — 맨 위 볼 가운데와의 거리: 딱(2칸 안) · 올라감(8칸 안 · 받침돌 위 첫 볼은 12칸) · 그 밖은 굴러떨어짐', () => {
  const s = towerStart(0);
  assert.equal(topX(s), 50, '처음은 받침돌 가운데');
  assert.deepEqual([50, 52, 48, 52.01, 62, 38, 62.01, 37.99, NaN].map((x) => towerJudge(s, x)), ['perfect', 'perfect', 'perfect', 'stack', 'stack', 'stack', 'miss', 'miss', 'miss']);
  s.tower.push({ n: 1, x: 30, perfect: false });
  assert.equal(topX(s), 30);
  assert.deepEqual([30, 32, 32.01, 38, 22, 38.01, 21.99].map((x) => towerJudge(s, x)), ['perfect', 'perfect', 'stack', 'stack', 'stack', 'miss', 'miss']);
  assert.deepEqual([PERFECT_D, OK_D, BASE_OK_D], [2, 8, 12]);
});

test('🗼 볼이 나오는 모양 — 0.4초에 첫 볼 · 마당 옆 끝에서 안쪽으로(왼쪽·오른쪽 둘 다) · 안 누르면 끝까지 좌우로만(볼 하나 · 끝 밖으로 안 나감) · 점수 0', () => {
  const sides = new Set();
  for (const seed of SEEDS) {
    const s = towerStart(0);
    const rng = seeded(seed);
    let first = null;
    for (let t = 0; t <= TOWER_SEC * 1000 + 1000; t += 16) {
      const ev = towerTick(s, t, rng);
      for (const b of ev.added) {
        assert.equal(first, null, '안 누르면 볼은 하나뿐');
        first = { ...b, at: s.last };
      }
      if (s.ball) assert.ok(s.ball.x >= X_MIN && s.ball.x <= X_MAX, `끝 안 (${s.ball.x})`);
    }
    assert.equal(first.at, 400, '첫 볼');
    assert.ok((first.x === X_MIN && first.vx === 32) || (first.x === X_MAX && first.vx === -32), '옆 끝에서 안쪽으로');
    sides.add(first.x);
    assert.equal(first.h, FLOOR_Y - HANG_Y, '매달린 높이');
    assert.deepEqual([s.score, s.tower.length, s.misses, s.phase], [0, 0, 0, 'slide']);
    assert.equal(s.last, s.end, '판 끝에서 멈춘다');
  }
  assert.deepEqual([...sides].sort((a, b) => a - b), [X_MIN, X_MAX], '왼쪽에서도 오른쪽에서도 나온다');
});

test('🗼 톡 → 똑바로 떨어짐 → 딱 ⭐2(반듯하게) · 올라감 ⭐1(그 자리에) · 굴러떨어짐(셈 없음 · 탑 그대로) · 떨어지는 동안·기다리는 동안은 눌러도 그대로', () => {
  const s = towerStart(0);
  const rng = () => 0.1; // 늘 왼쪽에서
  towerTick(s, 400, rng);
  assert.equal(s.phase, 'slide');
  assert.equal(towerTap(s, 400), 'drop');
  assert.equal(towerTap(s, 410), 'busy', '떨어지는 동안');
  let ev = towerTick(s, 1000, rng);
  assert.equal(ev.missed.length, 1, '받침돌에서 43칸 — 굴러떨어짐');
  assert.deepEqual([ev.missed[0].side, s.score, s.tower.length, s.misses], [-1, 0, 0, 1]);
  assert.equal(s.phase, 'wait');
  assert.equal(towerTap(s, 1000), 'busy', '다음 볼 기다리는 동안');
  // 굴러떨어진 뒤 0.7초에 다음 볼 (굴러가는 모습을 보게) — 받침돌 가운데로 옮겨 놓고 톡
  const fall0 = ((FLOOR_Y - HANG_Y - (BASE_H + STEP / 2)) / 180) * 1000;
  assert.ok(s.next - (400 + fall0) >= 700 && s.next - (400 + fall0) <= 716, `굴러떨어진 때에서 0.7초 (${s.next})`);
  ev = towerTick(s, s.next - 16, rng);
  assert.equal(ev.added.length, 0, '0.7초가 되기 전엔 안 나옴');
  ev = towerTick(s, s.next, rng);
  assert.equal(ev.added.length, 1);
  s.ball.x = 51.5;
  assert.equal(towerTap(s, s.last), 'drop');
  const t0 = s.last;
  ev = towerTick(s, t0 + 400, rng);
  assert.equal(ev.landed.length, 1);
  assert.deepEqual([ev.landed[0].kind, ev.landed[0].pts, ev.landed[0].floor], ['perfect', 2, 1]);
  assert.deepEqual([s.score, s.perfects, s.tower[0].x], [2, 1, 50], '딱 — 반듯하게 가운데로');
  const fallMs = ((FLOOR_Y - HANG_Y - (BASE_H + STEP / 2)) / 180) * 1000; // 46.5칸 ÷ 180칸/초
  assert.ok(s.next - t0 >= fallMs + 350 && s.next - t0 <= fallMs + 350 + 16, `쌓인 뒤 0.35초에 다음 볼 (${s.next - t0})`);
  // 다음 볼은 조금 비껴 — 그 자리에 비뚤게 ⭐1
  towerTick(s, s.next, rng);
  s.ball.x = 56;
  towerTap(s, s.last);
  ev = towerTick(s, s.last + 400, rng);
  assert.deepEqual([ev.landed[0].kind, ev.landed[0].pts, s.score, s.tower[1].x], ['stack', 1, 3, 56]);
  assert.equal(topX(s), 56, '다음 볼은 비뚤어진 그 위에');
  // 많이 비끼면 탑은 그대로
  towerTick(s, s.next, rng);
  s.ball.x = 70;
  towerTap(s, s.last);
  ev = towerTick(s, s.last + 400, rng);
  assert.deepEqual([ev.missed[0].side, s.score, s.tower.length], [1, 3, 2], '오른쪽으로 굴러떨어짐 · 점수·탑 그대로');
  assert.equal(towerTap(s, s.end), 'over');
});

test('🗼 떨어지는 시간 — 낮을 땐 0.3초 안 · 마당이 내려가기 시작하면 늘 같은 거리(0.12초 남짓) · 매달린 볼은 늘 화면 HANG_Y', () => {
  const s = towerStart(0);
  const rng = () => 0.9;
  for (let f = 0; f < 12; f++) {
    towerTick(s, s.next, rng);
    assert.equal(FLOOR_Y - s.ball.h + s.cam, HANG_Y, `${f}층: 매달린 볼은 늘 같은 화면 높이`);
    s.ball.x = topX(s);
    towerTap(s, s.last);
    const at = s.last;
    let ev = { landed: [] };
    while (!ev.landed.length) ev = towerTick(s, s.last + 16, rng);
    const ms = s.last - at;
    assert.ok(ms <= 300, `${f}층: ${ms}ms`);
    if (f >= 3) assert.ok(ms >= 100 && ms <= 130, `${f}층: 마당이 내려간 뒤엔 같은 거리 (${ms}ms)`);
    assert.equal(s.cam, camFor(s.tower.length));
  }
  assert.equal(s.tower.length, 12);
  assert.equal(s.score, 24);
});

/** 한 판을 16ms씩 끝까지 — play(s, t)가 누를지 정한다 */
function playAll(seed, play) {
  const rng = seeded(seed);
  const s = towerStart(0);
  const out = { s, speeds: [] };
  let prev = 0;
  for (let t = 0; t <= TOWER_SEC * 1000 + 1000; t += 16) {
    const ev = towerTick(s, t, rng);
    for (const b of ev.added) out.speeds.push([Math.abs(b.vx), s.tower.length]);
    assert.ok(s.score >= prev, '점수는 줄지 않는다');
    prev = s.score;
    for (const f of s.tower) assert.ok(f.x >= X_MIN && f.x <= X_MAX, '비뚤게 쌓여도 마당 안');
    if (play) play(s, t);
  }
  return out;
}

test('🗼 30초 한 판(가짜 시계 · 씨앗 여덟) — 맞춰 누르는 손은 딱이 많고 아무 때나 누르는 손보다 훨씬 높이 · 볼 빠르기는 그때 층에 맞게', () => {
  for (const seed of SEEDS) {
    const aim = playAll(seed, (s, t) => { if (s.phase === 'slide' && Math.abs(s.ball.x - topX(s)) <= 1) towerTap(s, t); });
    let next = 600;
    const rnd = playAll(seed, (s, t) => { if (t >= next) { towerTap(s, t); next = t + 700; } });
    const a = aim.s;
    const r = rnd.s;
    assert.equal(a.score, 2 * a.perfects + (a.tower.length - a.perfects));
    assert.equal(r.score, 2 * r.perfects + (r.tower.length - r.perfects));
    assert.ok(a.tower.length >= 15 && a.perfects === a.tower.length && a.misses === 0, `seed ${seed}: 맞춰 누름 ${a.tower.length}층 · 딱 ${a.perfects}`);
    assert.ok(a.score > r.score * 1.5, `seed ${seed}: 맞춤 ${a.score} · 아무 때나 ${r.score}`);
    assert.ok(r.misses > 0, '아무 때나 누르면 굴러떨어지기도 한다 — 그래도 점수는 안 줄었다');
    for (const [v, f] of [...aim.speeds, ...rnd.speeds]) assert.equal(v, towerSpeed(f));
    assert.ok(aim.speeds.at(-1)[0] > aim.speeds[0][0], '높이 쌓으면 빨라진다');
  }
});

test('🗼 시계 — 깨진 때·뒤로 간 때는 안 움직임 · 앱을 내렸다 돌아오면(towerShift) 남은 시간 그대로', () => {
  const s = towerStart(1000);
  towerTick(s, 3000, seeded(1));
  const snap = JSON.stringify(s);
  towerTick(s, NaN, seeded(1));
  towerTick(s, 2000, seeded(1));
  assert.equal(JSON.stringify(s), snap);
  const x = s.ball.x;
  const next = s.next;
  towerShift(s, 5000);
  assert.deepEqual([s.t0, s.end, s.last, s.next], [6000, 6000 + TOWER_SEC * 1000, 8000, next + 5000]);
  assert.equal(s.ball.x, x, '볼은 그 자리');
  const b = JSON.stringify(s);
  towerShift(s, 0); towerShift(s, -1); towerShift(s, NaN);
  assert.equal(JSON.stringify(s), b);
});

// ───────────────────── 화면 (가짜 화면 · 가짜 시계) ─────────────────────

class FakeEl {
  constructor(tag) { this.tagName = String(tag).toUpperCase(); this.className = ''; this.children = []; this.listeners = {}; this.style = { setProperty(k, v) { this[k] = v; } }; this.attrs = {}; this.textContent = ''; this.html = ''; }
  get classList() {
    const list = () => this.className.split(/\s+/).filter(Boolean);
    const set = (a) => { this.className = a.join(' '); };
    return {
      add: (...c) => set([...new Set([...list(), ...c])]),
      remove: (...c) => set(list().filter((x) => !c.includes(x))),
      toggle: (c, on) => { const want = on === undefined ? !list().includes(c) : !!on; set(want ? [...new Set([...list(), c])] : list().filter((x) => x !== c)); return want; },
      contains: (c) => list().includes(c),
    };
  }
  set innerHTML(v) { this.html = String(v); this.children = []; }
  get innerHTML() { return this.html; }
  get offsetWidth() { return 100; }
  appendChild(c) { this.children.push(c); c.parent = this; return c; }
  append(...cs) { for (const c of cs) this.appendChild(c); }
  setAttribute(k, v) { this.attrs[k] = v; }
  addEventListener(type, f) { (this.listeners[type] ||= []).push(f); }
  fire(type, extra = {}) { for (const f of this.listeners[type] || []) f({ preventDefault() {}, ...extra }); }
  getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 75 }; }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((x) => x !== this); }
}
function world(t, make) {
  const doc = { hidden: false, listeners: {}, createElement: (tag) => new FakeEl(tag),
    addEventListener(type, f) { (this.listeners[type] ||= []).push(f); },
    removeEventListener(type, f) { this.listeners[type] = (this.listeners[type] || []).filter((x) => x !== f); },
    fire(type) { for (const f of [...(this.listeners[type] || [])]) f(); } };
  let clock = 1000;
  const realPerf = globalThis.performance;
  Object.defineProperty(globalThis, 'performance', { value: { now: () => clock }, configurable: true, writable: true });
  globalThis.document = doc;
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  t.after(() => { Object.defineProperty(globalThis, 'performance', { value: realPerf, configurable: true, writable: true }); delete globalThis.document; });
  const stage = new FakeEl('div');
  const h = make(stage);
  const st = { over: null };
  h.done.then((r) => { st.over = r; });
  const adv = (ms, step = 50) => { for (let k = 0; k < ms; k += step) { clock += step; t.mock.timers.tick(step); } };
  const flush = () => new Promise((r) => setImmediate(r));
  const hide = (on) => { doc.hidden = on; doc.fire('visibilitychange'); };
  const root = stage.children[0];
  const [top, field, hint, pal, fx, banner] = root.children;
  const [worldEl, sky] = field.children;
  return { stage, h, doc, adv, flush, st, hide, root, top, field, hint, pal, fx, banner, worldEl, sky };
}
/** 매달린 볼의 가운데 x(칸) — transform %에서 거꾸로 */
const ballX = (e) => (Number((/translate3d\((-?[\d.]+)%/.exec(e.style.transform) || [])[1]) * BALL) / 100 + BALL / 2;
const ballY = (e) => (Number((/translate3d\(-?[\d.]+%, (-?[\d.]+)%/.exec(e.style.transform) || [])[1]) * BALL) / 100 + BALL / 2;
const stacked = (w) => w.worldEl.children.filter((e) => e.className.includes('gt-ball'));
/** 매달린 볼이 x에 올 때까지 기다린다(16ms씩) → 그 볼 */
function waitFor(w, x, tol = 1.5) {
  for (let k = 0; k < 800; k++) {
    w.adv(16, 16);
    const b = w.sky.children.find((e) => e.className.includes('is-hang'));
    if (b && Math.abs(ballX(b) - x) <= tol) return b;
  }
  return null;
}

test('🗼 화면 — 안내 · 응원 · 「준비!」 때 내려도 안 끝남 · 맞춰 톡 → 떨어져 ✨ 딱! ⭐2 · 마당에 쌓임 · 「🗼 1층」 · 30초 뒤 끝', async (t) => {
  const w = world(t, (stage) => runTower(stage, { rng: () => 0.1, hero: { html: '<img class="gd-pal-img">' } }));
  assert.equal(w.hint.textContent, '톡! 맨 위 볼에 딱 맞춰 떨어뜨려요');
  assert.equal(w.pal.innerHTML, '<img class="gd-pal-img">');
  assert.equal(w.top.children[1].textContent, '🗼 0층');
  assert.equal(w.field.attrs.role, 'button');
  w.adv(400);
  w.hide(true);
  w.adv(40000);
  await w.flush();
  assert.equal(w.st.over, null, '숨은 동안 안 끝남');
  assert.equal(w.sky.children.length, 0, '숨은 동안 안 나옴');
  w.hide(false);
  const b = waitFor(w, 50);
  assert.ok(b, '볼이 받침돌 가운데 위로 온다');
  assert.ok(Math.abs(ballY(b) - HANG_Y) < 0.01, '매달린 높이');
  w.field.fire('pointerdown');
  assert.ok(!b.className.includes('is-hang'), '떨어진다');
  w.field.fire('pointerdown'); // 떨어지는 동안은 또 안 떨어뜨림
  w.adv(400, 16);
  assert.equal(w.top.children[0].textContent, '⭐ 2');
  assert.equal(w.top.children[1].textContent, '🗼 1층');
  assert.ok(w.fx.children.some((f) => f.textContent === '✨ 딱! +2'), '✨ 딱!');
  assert.ok(w.pal.classList.contains('is-hop'), '파트너가 폴짝');
  const [one] = stacked(w);
  assert.ok(one && one.className.includes('is-land') && one.className.includes('is-perfect'));
  assert.deepEqual([one.style.left, one.style.top], [`${(50 - BALL / 2).toFixed(3)}%`, `${(((FLOOR_Y - (BASE_H + STEP / 2) - BALL / 2) / TOWER_H) * 100).toFixed(3)}%`], '받침돌 위 가운데');
  assert.ok(!w.sky.children.includes(b), '떨어진 볼은 마당으로 옮겨 감');
  w.adv(40000);
  await w.flush();
  assert.ok(w.st.over && w.st.over.quit === false);
  assert.equal(w.st.over.score, 2);
  assert.equal(w.banner.textContent, '끝!');
  assert.equal((w.doc.listeners.visibilitychange || []).length, 0, '끝나면 듣기를 뗀다');
  w.field.fire('pointerdown');
  assert.equal(w.top.children[0].textContent, '⭐ 2', '끝난 뒤엔 안 셈');
});

test('🗼 화면 — 바로 톡(끝에서) → 데굴데굴 굴러떨어짐(셈 없음 · 0.7초 뒤 사라짐) · 조금 비껴 ⭐1 · 네 층부터 마당이 내려감', async (t) => {
  const w = world(t, (stage) => runTower(stage, { rng: () => 0.1 }));
  w.adv(1250, 50); // 「준비!」 0.8초 + 첫 볼 0.4초
  let b = w.sky.children.find((e) => e.className.includes('is-hang'));
  assert.ok(b && ballX(b) < 12, '왼쪽 끝');
  w.field.fire('pointerdown');
  w.adv(400, 16);
  assert.ok(b.className.includes('is-miss') && b.className.includes('is-l'), '왼쪽으로 굴러떨어짐');
  assert.ok(w.fx.children.some((f) => f.textContent === '데굴데굴~'));
  assert.deepEqual([w.top.children[0].textContent, w.top.children[1].textContent, stacked(w).length], ['⭐ 0', '🗼 0층', 0], '셈 없음 · 탑 그대로');
  w.adv(700, 16); // 떨어진 때(톡 뒤 0.3초쯤)에서 0.7초
  assert.ok(!w.sky.children.includes(b), '굴러간 볼은 사라짐');
  // 조금 비껴(받침돌 가운데에서 6칸) ⭐1
  b = waitFor(w, 44, 0.8);
  assert.ok(b);
  w.field.fire('pointerdown');
  w.adv(400, 16);
  assert.equal(w.top.children[0].textContent, '⭐ 1');
  assert.ok(w.fx.children.some((f) => f.textContent === '+1'));
  const first = stacked(w)[0];
  assert.ok(!first.className.includes('is-perfect'));
  // 세 층 더(맞춰서) — 네 층부터 마당이 내려간다
  for (let f = 0; f < 3; f++) {
    const x = Number(stacked(w).at(-1).style.left.replace('%', '')) + BALL / 2;
    const n = waitFor(w, x, 1);
    assert.ok(n, `${f + 2}층 볼`);
    w.field.fire('pointerdown');
    w.adv(400, 16);
  }
  assert.equal(w.top.children[1].textContent, '🗼 4층');
  assert.equal(w.worldEl.style.transform, `translate3d(0, ${((camFor(4) / TOWER_H) * 100).toFixed(3)}%, 0)`, '마당이 내려감');
  assert.ok(camFor(4) > 0 && camFor(3) > 0);
  const nextBall = waitFor(w, 50, 60);
  assert.ok(nextBall && Math.abs(ballY(nextBall) - HANG_Y) < 0.01, '마당이 내려가도 매달린 볼은 늘 같은 높이');
  w.h.stop();
  await w.flush();
  assert.equal(w.st.over.quit, true);
});

test('🗼 화면 — ⌨️ 마당에 포커스가 있으면 스페이스·Enter·↓ (꾹 누름은 한 번) · 다른 키는 그대로', async (t) => {
  const w = world(t, (stage) => runTower(stage, { rng: () => 0.9 }));
  const key = (k, repeat = false) => w.field.fire('keydown', { key: k, repeat });
  let b = waitFor(w, 50);
  key('a');
  key(' ', true);
  assert.ok(b.className.includes('is-hang'), '꾹 누름·다른 키는 안 떨어뜨림');
  key(' ');
  assert.ok(!b.className.includes('is-hang'), '스페이스');
  w.adv(400, 16);
  assert.equal(stacked(w).length, 1);
  b = waitFor(w, 50);
  key('Enter');
  w.adv(400, 16);
  b = waitFor(w, 50);
  key('ArrowDown');
  w.adv(400, 16);
  assert.equal(stacked(w).length, 3);
  w.h.stop();
});

test('🗼 화면 — 「준비!」 때 그만두면 안 열리고 듣기도 뗀다 · 판 도중 그만두면 그때 점수로 · 그 뒤로 눌러도 그대로', async (t) => {
  const a = world(t, (stage) => runTower(stage, { rng: seeded(5) }));
  a.adv(300);
  a.h.stop();
  await a.flush();
  assert.deepEqual(a.st.over, { score: 0, quit: true });
  a.adv(3000);
  assert.equal(a.sky.children.length, 0, '그만둔 판은 안 열림');
  assert.equal((a.doc.listeners.visibilitychange || []).length, 0);
});

test('🗼 화면 — 판 도중 그만두면 그때 점수로 · 그 뒤로 눌러도 그대로', async (t) => {
  const w = world(t, (stage) => runTower(stage, { rng: () => 0.1 }));
  waitFor(w, 50);
  w.field.fire('pointerdown');
  w.adv(400, 16);
  const b = waitFor(w, 50);
  w.h.stop();
  await w.flush();
  assert.deepEqual(w.st.over, { score: 2, quit: true });
  w.field.fire('pointerdown');
  w.field.fire('keydown', { key: 'Enter' });
  w.adv(1000, 16);
  assert.ok(b.className.includes('is-hang'), '그만둔 뒤엔 안 떨어짐');
  assert.equal(w.top.children[0].textContent, '⭐ 2');
});

test('🗼 화면 — 브라우저처럼 requestAnimationFrame으로 돌고 끝나면 다시 예약하지 않음', async (t) => {
  const frames = new Map();
  let fid = 0;
  globalThis.requestAnimationFrame = (f) => { const id = ++fid; frames.set(id, f); return id; };
  globalThis.cancelAnimationFrame = (id) => { frames.delete(id); };
  t.after(() => { delete globalThis.requestAnimationFrame; delete globalThis.cancelAnimationFrame; });
  const w = world(t, (stage) => runTower(stage, { rng: seeded(3) }));
  const runFrames = () => { const fs = [...frames.values()]; frames.clear(); for (const f of fs) f(); };
  w.adv(850);
  assert.equal(frames.size, 1, '시작하면 그림 한 장을 예약');
  for (let k = 0; k < 40; k++) { w.adv(50); runFrames(); }
  assert.equal(frames.size, 1, '늘 한 장씩만 예약 (쌓이지 않는다)');
  assert.ok(w.sky.children.some((e) => /translate3d\(/.test(e.style.transform)), '볼이 움직인다');
  let atEnd = null;
  for (let k = 0; k < 700 && !w.st.over; k++) {
    w.adv(50);
    runFrames();
    if (atEnd === null && w.banner.textContent === '끝!') atEnd = frames.size; // 끝난 바로 그 그림에서
    await w.flush();
  }
  assert.ok(w.st.over && w.st.over.quit === false, '끝까지');
  assert.equal(atEnd, 0, '끝난 그 그림에서 다음 그림을 예약하지 않는다');
});

// ───────────────────── 🔍 Codex 117차 — 화면이 늦게 불러 한 번에 따라잡을 때 ─────────────────────

test('🗼 시계 — 한 번에 따라잡으면 앞 볼의 내려앉음이 다음 볼보다 먼저 · 내려앉은 때(at)도 함께', () => {
  const s = towerStart(0);
  towerTick(s, 400, () => 0.1);
  towerTap(s, 400);
  const ev = towerTick(s, 1500, () => 0.1); // 1.1초 늦게 — 굴러떨어짐 + 0.7초 뒤 다음 볼
  assert.deepEqual([ev.missed.length, ev.added.length], [1, 1]);
  const fall0 = ((FLOOR_Y - HANG_Y - (BASE_H + STEP / 2)) / 180) * 1000;
  assert.ok(ev.missed[0].at >= 400 + fall0 && ev.missed[0].at <= 400 + fall0 + 16, `굴러떨어진 때 ${ev.missed[0].at}`);
  assert.ok(ev.added[0].n > ev.missed[0].ball.n, '다음 볼');
  towerTick(s, s.next + 2000, () => 0.1);
  s.ball.x = 50;
  towerTap(s, s.last);
  const t = s.last;
  const e2 = towerTick(s, t + 1000, () => 0.1);
  assert.deepEqual([e2.landed.length, e2.added.length], [1, 1]);
  assert.ok(e2.landed[0].at > t && e2.landed[0].at <= t + 300);
});

/** 가짜 requestAnimationFrame — 그림을 붙잡아 두었다가 한 번에 (늦은 프레임 흉내) */
function rafWorld(t, rng) {
  const frames = new Map();
  let fid = 0;
  globalThis.requestAnimationFrame = (f) => { const id = ++fid; frames.set(id, f); return id; };
  globalThis.cancelAnimationFrame = (id) => { frames.delete(id); };
  t.after(() => { delete globalThis.requestAnimationFrame; delete globalThis.cancelAnimationFrame; });
  const w = world(t, (stage) => runTower(stage, { rng }));
  w.runFrames = () => { const fs = [...frames.values()]; frames.clear(); for (const f of fs) f(); };
  /** ms 동안 16ms마다 그림도 (늦지 않은 화면) */
  w.live = (ms) => { for (let k = 0; k < ms; k += 16) { w.adv(16, 16); w.runFrames(); } };
  w.hang = () => w.sky.children.filter((e) => e.className.includes('is-hang'));
  /** 매달린 볼이 x에 올 때까지 (늦지 않은 화면) */
  w.until = (x, tol = 1) => { for (let k = 0; k < 800; k++) { w.live(16); const [b] = w.hang(); if (b && Math.abs(ballX(b) - x) <= tol) return b; } return null; };
  return w;
}

test('🗼 화면 — 늦은 프레임: 굴러떨어짐과 다음 볼이 한 번에 와도 옛 볼은 굴러가고 새 볼 하나만 움직이며 그 볼을 떨어뜨릴 수 있다 (🔍 Codex 117차 #1)', async (t) => {
  const w = rafWorld(t, () => 0.1);
  w.live(1300);
  const [old] = w.hang();
  assert.ok(old && ballX(old) < 12, '왼쪽 끝 볼');
  w.field.fire('pointerdown'); // 받침돌에서 멀리 — 굴러떨어질 볼
  w.adv(1100); // 그림이 1.1초 멈춤
  w.runFrames(); // 한 번에 따라잡음 — 굴러떨어짐 + 다음 볼
  assert.ok(old.className.includes('is-miss') && old.className.includes('is-l'), '옛 볼은 굴러간다');
  const hang = w.hang();
  assert.equal(hang.length, 1, '매달린 볼은 새 볼 하나');
  assert.notEqual(hang[0], old);
  const x1 = ballX(hang[0]);
  w.live(48);
  assert.ok(Math.abs(ballX(hang[0]) - x1) > 0.5, `새 볼이 화면에서도 움직인다 (${x1} → ${ballX(hang[0])})`);
  const b = w.until(50);
  assert.equal(b, hang[0]);
  w.field.fire('pointerdown');
  assert.ok(!b.className.includes('is-hang'), '새 볼을 떨어뜨릴 수 있다');
  w.live(400);
  assert.equal(w.top.children[0].textContent, '⭐ 2', '보인 자리 그대로 딱');
  assert.equal(w.root.children[6].textContent, '딱! 1층', '화면 읽기에도 짧게');
  w.h.stop();
});

test('🗼 화면 — 늦은 프레임: 쌓임과 다음 볼이 한 번에 와도 옛 하늘 볼은 지워지고 새 볼 하나만 (🔍 Codex 117차 #1)', async (t) => {
  const w = rafWorld(t, () => 0.1);
  const old = w.until(50);
  assert.ok(old);
  w.field.fire('pointerdown');
  w.adv(700); // 내려앉음(0.26초) + 다음 볼(0.35초 뒤)까지 그림이 멈춤
  w.runFrames();
  assert.ok(!w.sky.children.includes(old), '옛 하늘 볼은 지워짐');
  assert.equal(stacked(w).length, 1, '마당에 쌓인 볼 하나');
  const hang = w.hang();
  assert.equal(hang.length, 1, '매달린 볼은 새 볼 하나');
  const x1 = ballX(hang[0]);
  w.live(48);
  assert.ok(Math.abs(ballX(hang[0]) - x1) > 0.5, '새 볼이 움직인다');
  w.h.stop();
});

test('🗼 화면 — 마당이 내려가야 하는 높이에서 늦게 그린 내려앉음은 마당을 애니메이션 없이 바로 옮긴다 · 제때 그린 것은 0.25초에 걸쳐 (🔍 Codex 117차 #2)', async (t) => {
  const w = rafWorld(t, () => 0.1);
  const log = [];
  const raw = w.worldEl.style;
  w.worldEl.style = new Proxy(raw, { set(o, k, v) { if (k === 'transition' || k === 'transform') log.push([k, v]); o[k] = v; return true; } });
  const stackAt = () => {
    const x = stacked(w).length ? Number(stacked(w).at(-1).style.left.replace('%', '')) + BALL / 2 : 50;
    const b = w.until(x);
    assert.ok(b);
    w.field.fire('pointerdown');
  };
  stackAt(); w.live(400);
  stackAt(); w.live(400);
  assert.equal(log.filter(([k, v]) => k === 'transition' && v === 'none').length, 0, '제때 그린 내려앉음은 바로 옮기지 않는다');
  stackAt();
  w.adv(700); // 셋째 층 — 마당이 내려가야 하는 높이 · 그림이 멈춤
  log.length = 0;
  w.runFrames();
  const want = `translate3d(0, ${((camFor(3) / TOWER_H) * 100).toFixed(3)}%, 0)`;
  assert.deepEqual(log, [['transition', 'none'], ['transform', want], ['transition', '']], '바로 옮기고 다시 0.25초로');
  assert.equal(w.hang().length, 1, '다음 볼이 이미 나옴');
  log.length = 0;
  w.live(400);
  stackAt(); w.live(400); // 넷째 층 — 제때
  assert.deepEqual(log.filter(([k]) => k === 'transition'), [], '제때 그린 것은 css 0.25초 그대로');
  assert.ok(log.some(([k, v]) => k === 'transform' && v === `translate3d(0, ${((camFor(4) / TOWER_H) * 100).toFixed(3)}%, 0)`));
  w.h.stop();
});

test('🗼 접근성 — 결과 한 줄(role=status · aria-live) · 굴러떨어짐에 「데굴데굴 굴러떨어졌어요」 · 동작 줄이기면 돌지 않고 사라지기만', async (t) => {
  const w = world(t, (stage) => runTower(stage, { rng: () => 0.1 }));
  const say = w.root.children[6];
  assert.deepEqual([say.className, say.attrs.role, say.attrs['aria-live']], ['sr-only', 'status', 'polite']);
  w.adv(1250, 50);
  w.field.fire('pointerdown');
  w.adv(400, 16);
  assert.equal(say.textContent, '데굴데굴 굴러떨어졌어요');
  w.h.stop();
  const css = src('css/style.css');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{[^\n]*\.gt-ball\.is-miss\.is-l \.gt-ball-in, \.gt-ball\.is-miss\.is-r \.gt-ball-in \{ animation: gt-fade 0\.3s ease-in forwards; \}/);
  assert.match(css, /\.sr-only \{ position: absolute; width: 1px; height: 1px;/);
});
