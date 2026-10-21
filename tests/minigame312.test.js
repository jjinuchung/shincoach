// 🎮 게임기 미니 게임 6단계 (v312 · 2026-10-21 아버님 "🤼 아빠랑 줄다리기 진행하자" → 물음 둘 모두 추천안) — node --test tests/minigame312.test.js
// 🤼 아빠랑 줄다리기: 「누구랑?」(아빠 · 엄마 · 혼자면 😼 나옹) → 각자 큰 단추 톡톡 · 리본이 승리선에 닿으면 그 판 🏆 · 힘은 따라잡기 · ⭐ = 진우가 당긴 횟수
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GAMES, gameById } from '../js/minigame.js';
import {
  TUG_SEC, TUG_WIN, TUG_PULL, TUG_CATCH, TUG_REST_MS, TUG_LEAN, FOES, BOT,
  tugStrength, tugStart, tugPull, botGap, tugTick, tugShift, tugResult, tugLine, runTug,
} from '../js/gametug.js';

const src = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
function seeded(seed = 7) {
  let x = seed >>> 0;
  return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 2 ** 32; };
}
const SEEDS = [1, 7, 42, 2026, 99999, 31337, 5, 777];
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

// ───────────────────── 목록 · 게임기 화면 연결 ─────────────────────

test('🎮 v312 게임 목록 — 여덟 모두 · 🤼 아빠랑 줄다리기 30초 · 화면(RUNNERS)·준비(나옹 그림 — 🎈와 같게) · 끝 화면에 「🏆 진우 n : n 아빠」 한 줄', () => {
  assert.deepEqual(GAMES.map((g) => g.id), ['dig', 'run', 'shadow', 'pair', 'berry', 'balloon', 'tower', 'tug']);
  assert.equal(gameById('tug').sec, TUG_SEC);
  assert.equal(TUG_SEC, 30);
  assert.equal(gameById('tug').ko, '아빠랑 줄다리기');
  for (const g of GAMES) assert.ok(!/\d/.test(g.how), `${g.id}: 아이가 보는 설명에 숫자 없음`);
  const gv = src('js/gameview.js');
  assert.match(gv, /\n {2}tug: \{ run: runTug, prep: async \(\) => \(\{ meowth: \(await balloonPrep\(\)\)\.meowth \}\) \},/);
  assert.match(gv, /import \{ runTug \} from '\.\/gametug\.js';/);
  const rr = gv.slice(gv.indexOf('function renderResult('), gv.indexOf('\n}\n', gv.indexOf('function renderResult(')));
  assert.match(rr, /if \(res\.line\) b\.appendChild\(el\('p', 'gm-line', res\.line\)\);/, '끝 화면에 판 결과 한 줄 (다른 게임은 line이 없다)');
  assert.ok(rr.indexOf("'gm-end'") < rr.indexOf("'gm-line'"), '⭐ 아래에');
  assert.ok(!/coins|addCoins|applyPurchase|items\[|itemCount|xp\.js|db\.js|pokemon\.js/.test(src('js/gametug.js')), '저장·가방을 안 만진다');
});

test('🎮 서비스워커 v312 · 새 파일 · css (hidden이 display:grid에 덮이지 않게 · 단추는 길게 눌러도 메뉴가 안 뜸)', () => {
  const sw = src('sw.js');
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(sw) || [])[1]) >= 312, 'sw v312 이상');
  assert.ok(sw.includes("'./js/gametug.js'"));
  const css = src('css/style.css');
  assert.ok(css.includes('.gu-pick[hidden], .gu-pad[hidden] { display: none; }'));
  assert.match(css, /\.gu-btn \{[^}]*touch-action: manipulation;[^}]*-webkit-touch-callout: none;/);
  assert.match(css, /\.gu-team \{[^}]*pointer-events: none;/);
  assert.match(css, /\.gu-line\.is-l \{ left: 20%; \}/);
  assert.match(css, /\.gu-line\.is-r \{ left: 80%; \}/);
  assert.match(css, /\.gm-line \{/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.gu-team \{ transition: none; \}/);
});

// ───────────────────── 🤼 엔진 ─────────────────────

test('🤼 당김 세기 — 가운데·이기는 쪽은 그대로 · 지고 있는 쪽은 승리선에 가까울수록 최대 1.3배(따라잡기)', () => {
  assert.deepEqual([TUG_WIN, TUG_PULL, TUG_CATCH, TUG_REST_MS, TUG_LEAN], [30, 2.4, 0.3, 1200, 3]);
  assert.ok(near(tugStrength(0, 'me'), 2.4) && near(tugStrength(0, 'foe'), 2.4));
  assert.ok(near(tugStrength(15, 'me'), 2.4 * 1.15), '진우가 지고 있다(리본이 상대 쪽 15칸) — 1.15배');
  assert.ok(near(tugStrength(15, 'foe'), 2.4), '이기는 쪽은 그대로');
  assert.ok(near(tugStrength(-30, 'foe'), 2.4 * 1.3), '승리선 바로 앞 — 1.3배');
  assert.ok(near(tugStrength(-99, 'foe'), 2.4 * 1.3), '끝이 있다');
  assert.ok(near(tugStrength(NaN, 'me'), 2.4));
  assert.deepEqual(Object.keys(FOES), ['dad', 'mom', 'meowth']);
  assert.deepEqual([FOES.dad.ko, FOES.mom.ko, FOES.meowth.ko, !!FOES.meowth.bot, !!FOES.dad.bot], ['아빠', '엄마', '나옹', true, false]);
});

test('🤼 당기기 — 진우 쪽은 왼쪽(−)·⭐ · 상대는 오른쪽(+)·⭐ 없음 · 승리선에 닿으면 🏆·1.2초 쉼(그동안 안 셈) · 쉼이 끝나면 가운데로 · 시간 끝', () => {
  const s = tugStart(0, 'dad');
  assert.deepEqual([s.foe, s.p, s.round, s.nextBot], ['dad', 0, 1, 0]);
  assert.equal(tugStart(0, 'xx').foe, 'dad', '모르는 상대는 아빠');
  assert.equal(tugStart(100, 'meowth').nextBot, 100 + BOT.first);
  let r = tugPull(s, 'me', 10);
  assert.deepEqual([r.kind, r.side, s.score, s.pulls.me], ['pull', 'me', 1, 1]);
  assert.ok(near(s.p, -2.4));
  r = tugPull(s, 'foe', 20);
  assert.deepEqual([r.kind, s.score, s.pulls.foe], ['pull', 1, 1], '상대 당김은 ⭐ 아님');
  assert.ok(near(s.p, -2.4 + 2.4 * (1 + TUG_CATCH * (2.4 / TUG_WIN))), `지고 있던 아빠 쪽이 조금 더 세게 (${s.p})`);
  let n = 0;
  for (let t = 30; ; t += 10) { n += 1; r = tugPull(s, 'me', t); if (r.kind === 'win') break; assert.ok(n < 50); }
  assert.equal(n, Math.ceil(TUG_WIN / TUG_PULL), '가운데에서 혼자 당기면 열세 번');
  assert.deepEqual([r.side, s.wins.me, s.p], ['me', 1, -TUG_WIN]);
  const winAt = 30 + (n - 1) * 10;
  assert.equal(s.restUntil, winAt + TUG_REST_MS);
  const before = JSON.stringify(s);
  assert.equal(tugPull(s, 'me', winAt + 500).kind, 'rest');
  assert.equal(tugPull(s, 'foe', winAt + 600).kind, 'rest');
  assert.equal(JSON.stringify(s), before, '쉬는 동안은 아무것도 안 셈');
  const ev = tugTick(s, winAt + TUG_REST_MS, seeded(1));
  assert.deepEqual([ev.resets, s.p, s.round, s.restUntil], [1, 0, 2, 0], '쉼이 끝나면 가운데로 · 다음 판');
  // 시계를 안 돌려도 쉼이 끝났으면 당길 때 가운데로
  for (let k = 0; k < 13; k++) tugPull(s, 'foe', 3000 + k);
  assert.equal(s.wins.foe, 1);
  r = tugPull(s, 'me', s.restUntil + 1);
  assert.equal(r.kind, 'pull');
  assert.deepEqual([s.round, s.restUntil], [3, 0]);
  assert.ok(near(s.p, -2.4), '가운데에서 다시');
  assert.equal(tugPull(s, 'me', s.end).kind, 'over');
});

test('🤼 나옹 — 처음 0.5초 · 초당 세 번 남짓(±25%) · 진우가 이긴 판마다 빨라짐(끝 다섯) · 쉬는 동안은 안 당김', () => {
  assert.deepEqual(BOT, { rate: 3, step: 0.5, max: 5, first: 500 });
  const s = tugStart(0, 'meowth');
  const gaps = [];
  const g = seeded(11);
  for (let k = 0; k < 200; k++) gaps.push(botGap(s, g)); // 한 줄기에서 이어 뽑기 (씨앗마다 첫 수는 서로 비슷하다)
  assert.ok(Math.min(...gaps) >= 250 && Math.max(...gaps) <= 417, `${Math.min(...gaps)}~${Math.max(...gaps)}`);
  assert.ok(Math.max(...gaps) - Math.min(...gaps) > 100, '사람처럼 들쭉날쭉 (늘 같은 박자가 아니게)');
  s.wins.me = 2;
  assert.ok(botGap(s, () => 0.5) === 250, '두 판 지면 초당 네 번');
  s.wins.me = 99;
  assert.equal(botGap(s, () => 0.5), 200, '끝은 초당 다섯 번');
  // 진우가 가만히 있으면 — 나옹이 판을 가져가고, 쉬는 동안은 안 당긴다
  for (const seed of SEEDS) {
    const t = tugStart(0, 'meowth');
    const rng = seeded(seed);
    let restSeen = 0;
    for (let ms = 0; ms <= TUG_SEC * 1000 + 500; ms += 16) {
      const before = t.pulls.foe;
      const wasRest = t.restUntil;
      const ev = tugTick(t, ms, rng);
      if (wasRest && ms < wasRest) { assert.equal(t.pulls.foe, before, '쉬는 동안 안 당김'); restSeen += 1; }
      for (const r of ev.pulls) assert.notEqual(r.kind, 'rest');
    }
    assert.ok(t.wins.foe >= 5, `seed ${seed}: 나옹 ${t.wins.foe}판`);
    assert.deepEqual([t.wins.me, t.score], [0, 0]);
    assert.ok(restSeen > 0);
    assert.equal(t.last, t.end, '판 끝에서 멈춘다');
  }
});

/** 한 판을 10ms씩 끝까지 — meRate·foeRate = 초당 누름(±20% 흔들림) · foeRate는 가족일 때만 */
function playAll(seed, foe, meRate, foeRate = 0) {
  const rng = seeded(seed);
  const hand = seeded(seed + 50);
  const s = tugStart(0, foe);
  let nMe = 300;
  let nFoe = 300;
  let prev = 0;
  for (let t = 0; t <= TUG_SEC * 1000; t += 10) {
    tugTick(s, t, rng);
    if (meRate && t >= nMe) { tugPull(s, 'me', t); nMe = t + (1000 / meRate) * (0.8 + hand() * 0.4); }
    if (foeRate && t >= nFoe) { tugPull(s, 'foe', t); nFoe = t + (1000 / foeRate) * (0.8 + hand() * 0.4); }
    assert.ok(s.score >= prev, '⭐는 줄지 않는다');
    assert.ok(Math.abs(s.p) <= TUG_WIN, '리본은 승리선 밖으로 안 나간다');
    prev = s.score;
  }
  assert.equal(s.score, s.pulls.me, '⭐ = 진우가 당긴 횟수');
  return { s, r: tugResult(s) };
}

test('🤼 30초 한 판(가짜 시계 · 씨앗 여덟) — 나옹: 열심히(초당 다섯) 하면 여러 판 이김 · 가족: 빠르기 20% 차이는 팽팽(따라잡기) · 훨씬 빠르면 이김', () => {
  for (const seed of SEEDS) {
    const hard = playAll(seed, 'meowth', 5).r;
    assert.ok(hard.me >= 2 && hard.foe === 0, `seed ${seed}: 초당 다섯 — ${hard.me}:${hard.foe}`);
    const lazy = playAll(seed, 'meowth', 2).r;
    assert.ok(lazy.foe > lazy.me, `seed ${seed}: 초당 두 번이면 나옹이 이김 (${lazy.me}:${lazy.foe})`);
    const close = playAll(seed, 'dad', 5, 6);
    assert.ok(close.s.wins.foe <= 1 && close.r.me <= 1, `seed ${seed}: 아빠 6 · 진우 5 — 승리선까지 거의 못 감 (${close.r.me}:${close.r.foe})`);
    const fast = playAll(seed, 'dad', 5, 10).r;
    assert.ok(fast.foe >= 4 && fast.me === 0, `seed ${seed}: 아빠가 훨씬 빠르면 아빠가 이김 (${fast.me}:${fast.foe})`);
    const easy = playAll(seed, 'mom', 6, 4).r;
    assert.ok(easy.me >= 2 && easy.foe === 0, `seed ${seed}: 엄마가 살살 — 진우가 이김 (${easy.me}:${easy.foe})`);
  }
});

test('🤼 끝 결과 — 쉼이 아니고 리본이 세 칸 넘게 한쪽이면 마지막 판은 그쪽 · 한 줄(진우 승 · 비김 · 상대 승)', () => {
  const s = tugStart(0, 'dad');
  s.wins = { me: 1, foe: 1 };
  s.p = -5;
  assert.deepEqual(tugResult(s), { me: 2, foe: 1, last: 'me' });
  s.p = 3;
  assert.deepEqual(tugResult(s), { me: 1, foe: 1, last: null }, '세 칸까지는 그대로');
  s.p = 3.5;
  assert.deepEqual(tugResult(s), { me: 1, foe: 2, last: 'foe' });
  s.restUntil = 999;
  s.p = -30;
  assert.deepEqual(tugResult(s), { me: 1, foe: 1, last: null }, '쉬는 동안은 이미 끝난 판');
  assert.equal(tugLine({ me: 2, foe: 1 }, 'dad'), '🏆 진우 2 : 1 아빠 — 진우 승!');
  assert.equal(tugLine({ me: 1, foe: 1 }, 'mom'), '🏆 진우 1 : 1 엄마 — 비겼어요!');
  assert.equal(tugLine({ me: 0, foe: 3 }, 'meowth'), '🏆 진우 0 : 3 나옹 — 나옹 승!');
  assert.equal(tugLine({ me: 0, foe: 0 }, 'zz'), '🏆 진우 0 : 0 아빠 — 비겼어요!');
  assert.equal(tugLine({ me: 2, foe: 1, last: 'me' }, 'dad'), '🏆 진우 2 : 1 아빠 — 진우 승! · 마지막 판은 줄이 더 간 쪽이 이겼어요', '앞섬으로 가져간 판이 있으면 까닭도 (🔍 Codex 118차)');
  assert.equal(tugLine({ me: 1, foe: 1, last: null }, 'mom'), '🏆 진우 1 : 1 엄마 — 비겼어요!');
});

test('🤼 시계 — 깨진 때·뒤로 간 때는 안 움직임 · 앱을 내렸다 돌아오면(tugShift) 남은 시간·쉼·나옹 차례 그대로', () => {
  const s = tugStart(1000, 'meowth');
  tugTick(s, 3000, seeded(1));
  const snap = JSON.stringify(s);
  tugTick(s, NaN, seeded(1));
  tugTick(s, 2000, seeded(1));
  assert.equal(JSON.stringify(s), snap);
  s.restUntil = 3500;
  const next = s.nextBot;
  tugShift(s, 5000);
  assert.deepEqual([s.t0, s.end, s.last, s.restUntil, s.nextBot], [6000, 6000 + TUG_SEC * 1000, 8000, 8500, next + 5000]);
  const d = tugStart(0, 'dad');
  tugShift(d, 100);
  assert.deepEqual([d.restUntil, d.nextBot], [0, 0], '없던 쉼·나옹 차례는 안 생긴다');
  const b = JSON.stringify(s);
  tugShift(s, 0); tugShift(s, -1); tugShift(s, NaN);
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
  getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 50 }; }
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
  const [top, field, pick, pad, hint, fx, banner, say] = root.children;
  const [, , , team, board] = field.children;
  const [, , me, foeEl] = team.children;
  const who = pick.children[1].children;
  const [btnMe, btnFoe] = pad.children;
  const star = () => top.children[0].textContent;
  const px = () => Number((/translate3d\((-?[\d.]+)%/.exec(team.style.transform || '') || [])[1]);
  const key = (k, repeat = false) => root.fire('keydown', { key: k, repeat });
  return { stage, h, doc, adv, flush, st, hide, root, top, field, pick, pad, hint, fx, banner, say, team, board, me, foeEl, who, btnMe, btnFoe, star, px, key };
}

test('🤼 화면 — 「누구랑?」 셋 · 아빠를 고르면 단추 둘 · 「준비!」 때 내려도 안 끝남 · 진우 단추 ⭐·왼쪽 · 아빠 단추 오른쪽 · 손가락 뒤 click은 안 셈 · 키보드', async (t) => {
  const w = world(t, (stage) => runTug(stage, { rng: seeded(3), hero: { html: '<img class="gd-pal-img">' } }));
  assert.equal(w.pick.children[0].textContent, '누구랑 할까?');
  assert.deepEqual([...w.who].map((b) => b.children[1].textContent), ['아빠', '엄마', '나옹(혼자일 때)']);
  assert.deepEqual([w.pad.hidden, w.btnMe.disabled, w.btnFoe.disabled], [true, true, true], '고르기 전엔 단추 없음');
  assert.equal(w.me.innerHTML, '<img class="gd-pal-img">');
  w.btnMe.fire('pointerdown');
  assert.equal(w.star(), '⭐ 0', '고르기 전엔 안 셈');
  w.who[0].fire('click');
  assert.deepEqual([w.pick.hidden, w.pad.hidden], [true, false]);
  assert.equal(w.btnFoe.textContent, '💪 아빠 당겨!');
  assert.equal(w.board.textContent, '진우 🏆 0 : 0 🏆 아빠');
  assert.equal(w.foeEl.children[0].textContent, '👨');
  assert.equal(w.banner.textContent, '준비!');
  w.adv(400);
  w.hide(true);
  w.adv(40000);
  await w.flush();
  assert.equal(w.st.over, null, '숨은 동안 안 끝남');
  w.hide(false);
  w.adv(450);
  assert.deepEqual([w.btnMe.disabled, w.btnFoe.disabled], [false, false]);
  assert.ok(w.root.className.includes('is-go'));
  w.btnMe.fire('pointerdown');
  assert.equal(w.star(), '⭐ 1');
  assert.ok(near(w.px(), -2.4, 0.01), `왼쪽으로 (${w.team.style.transform})`);
  assert.ok(w.me.className.includes('is-pull'));
  w.btnMe.fire('click', { detail: 1 }); // 손가락 뒤에 따라오는 click
  assert.equal(w.star(), '⭐ 1', '손가락 한 번 = 한 번');
  w.btnMe.fire('click', { detail: 0 }); // ⌨️ 단추에 포커스 + Enter·스페이스
  assert.equal(w.star(), '⭐ 2');
  w.btnFoe.fire('pointerdown');
  assert.equal(w.star(), '⭐ 2', '아빠 당김은 ⭐ 아님');
  assert.ok(w.foeEl.className.includes('is-pull'));
  w.key('ArrowLeft'); w.key('a'); w.key('A');
  assert.equal(w.star(), '⭐ 5', '← · a · A');
  w.key('ArrowLeft', true);
  w.key('x');
  assert.equal(w.star(), '⭐ 5', '꾹 누름·다른 키는 그대로');
  const p0 = w.px();
  w.key('l'); w.key('ArrowRight');
  assert.ok(w.px() > p0, '→ · l 은 아빠 쪽');
  w.h.stop();
  await w.flush();
  assert.equal(w.st.over.quit, true);
  assert.equal(w.st.over.score, 5);
});

test('🤼 화면 — 승리선에 닿으면 「진우 이겼다!」·🏆·화면 읽기 · 쉬는 동안 누름은 안 셈 · 1.2초 뒤 가운데로 · 30초 뒤 「끝!」과 한 줄', async (t) => {
  const w = world(t, (stage) => runTug(stage, { rng: seeded(3) }));
  w.who[1].fire('click'); // 엄마
  assert.equal(w.btnFoe.textContent, '💪 엄마 당겨!');
  w.adv(850);
  for (let k = 0; k < 13; k++) w.btnMe.fire('pointerdown');
  assert.equal(w.banner.textContent, '진우 이겼다!');
  assert.ok(w.banner.className.includes('is-on'));
  assert.equal(w.board.textContent, '진우 🏆 1 : 0 🏆 엄마');
  assert.equal(w.say.textContent, '진우 이겼어요 — 진우 1 : 0 엄마');
  assert.deepEqual([w.star(), w.px()], ['⭐ 13', -30]);
  w.btnMe.fire('pointerdown');
  w.btnFoe.fire('pointerdown');
  assert.deepEqual([w.star(), w.px()], ['⭐ 13', -30], '쉬는 동안은 안 셈');
  w.adv(1300);
  assert.ok(!w.banner.className.includes('is-on'), '이긴 글씨를 내림');
  assert.equal(w.px(), 0, '가운데로');
  for (let k = 0; k < 2; k++) w.btnFoe.fire('pointerdown'); // 엄마 쪽으로 두 번(마지막엔 3칸 넘게)
  w.adv(40000);
  await w.flush();
  assert.ok(w.st.over && w.st.over.quit === false);
  assert.equal(w.st.over.score, 13);
  assert.equal(w.st.over.line, '🏆 진우 1 : 1 엄마 — 비겼어요! · 마지막 판은 줄이 더 간 쪽이 이겼어요', '마지막 판은 앞선 엄마 쪽 · 까닭도');
  assert.equal(w.banner.textContent, '끝!');
  assert.equal(w.board.textContent, '진우 🏆 1 : 1 🏆 엄마');
  assert.equal(w.say.textContent, w.st.over.line);
  assert.equal((w.doc.listeners.visibilitychange || []).length, 0, '끝나면 듣기를 뗀다');
  w.btnMe.fire('pointerdown');
  assert.equal(w.star(), '⭐ 13', '끝난 뒤엔 안 셈');
});

test('🤼 화면 — 😼 나옹(혼자일 때): 그림 · 깨지면 😼 · 나옹 단추는 꺼짐(누르거나 → 키도 안 먹음) · 가만히 있으면 나옹이 당겨 이김', async (t) => {
  const w = world(t, (stage) => runTug(stage, { rng: seeded(5), meowth: 'blob:meowth' }));
  w.who[2].fire('click');
  const img = w.foeEl.children[0];
  assert.equal(img.src, 'blob:meowth');
  img.fire('error');
  assert.match(w.foeEl.innerHTML, /😼/, '깨지면 😼');
  assert.equal(w.btnFoe.textContent, '😼 나옹이 당겨요');
  w.adv(850);
  assert.deepEqual([w.btnMe.disabled, w.btnFoe.disabled], [false, true]);
  w.btnFoe.fire('pointerdown');
  w.key('l');
  assert.equal(w.px(), 0, '나옹 쪽은 사람이 못 당긴다');
  w.adv(2000);
  assert.ok(w.px() > 0, '나옹이 당긴다');
  w.adv(40000);
  await w.flush();
  assert.ok(w.st.over && w.st.over.quit === false);
  assert.equal(w.st.over.score, 0);
  assert.match(w.st.over.line, /^🏆 진우 0 : \d+ 나옹 — 나옹 승!( · 마지막 판은 줄이 더 간 쪽이 이겼어요)?$/);
});

test('🤼 화면 — 「누구랑?」에서 그만두면 한 판도 안 한 것(unplayed — 게임기가 판을 돌려줌) · 그 뒤 골라도 안 열림 · 고른 뒤 「준비!」 때 그만두면 판을 쓴 것', async (t) => {
  const a = world(t, (stage) => runTug(stage, { rng: seeded(5) }));
  a.h.stop();
  await a.flush();
  assert.deepEqual(a.st.over, { score: 0, quit: true, line: '', unplayed: true });
  a.who[0].fire('click');
  a.adv(2000);
  assert.deepEqual([a.pad.hidden, a.btnMe.disabled], [true, true], '그만둔 판은 안 열림');
  assert.equal((a.doc.listeners.visibilitychange || []).length, 0);
});

test('🤼 화면 — 고른 뒤 「준비!」 때 그만두면 판을 쓴 것(unplayed 아님 — 다른 게임의 「준비!」와 같게)', async (t) => {
  const w = world(t, (stage) => runTug(stage, { rng: seeded(5) }));
  w.who[2].fire('click');
  w.adv(300);
  w.h.stop();
  await w.flush();
  assert.deepEqual(w.st.over, { score: 0, quit: true, line: '' });
  assert.equal((w.doc.listeners.visibilitychange || []).length, 0, '「준비!」 때부터 듣던 것도 뗀다');
});

test('🎮 게임기 — 판을 쓴 뒤 unplayed로 끝나면 판을 돌려주고 고르기로(💗·최고 기록 저장 없이) · 다른 끝은 그대로 정산', () => {
  const gv = src('js/gameview.js');
  const sr = gv.slice(gv.indexOf('async function startRound('), gv.indexOf('\nfunction renderResult('));
  const a = sr.indexOf('const res = await run.done;');
  const u = sr.indexOf('if (res && res.unplayed) {');
  const p = sr.indexOf('sum.played += 1;');
  assert.ok(a > 0 && a < u && u < p, '판이 끝난 바로 뒤 · 정산보다 먼저');
  const block = sr.slice(u, sr.indexOf('\n    }\n', u));
  assert.match(block, /started = false;\n\s+await giveBack\(\);/, '시작 안 한 판으로 돌려 놓고 돌려준다');
  assert.match(block, /if \(live\(\)\) \{ ui\.busy = false; renderPick\(\); \}\n\s+return;/);
  assert.ok(!/gameEnd/.test(block), '💗·최고 기록 저장 없이');
  assert.match(sr, /const giveBack = async \(\) => \{\n\s+if \(!spent \|\| started\) return;/, '돌려주기는 시작 안 한 판만');
});

test('🤼 화면 — 판 도중 그만두면 그때 판 수·⭐로 · 그 뒤로 눌러도 그대로', async (t) => {
  const w = world(t, (stage) => runTug(stage, { rng: seeded(5) }));
  w.who[0].fire('click');
  w.adv(850);
  for (let k = 0; k < 15; k++) w.btnMe.fire('pointerdown');
  w.h.stop();
  await w.flush();
  assert.deepEqual(w.st.over, { score: 13, quit: true, line: '🏆 진우 1 : 0 아빠 — 진우 승!' }, '쉬는 동안 두 번은 안 셈');
  w.adv(1500); // 쉼이 끝난 뒤에 눌러도
  w.btnMe.fire('pointerdown');
  w.key('a');
  assert.equal(w.star(), '⭐ 13');
});

test('🤼 화면 — 브라우저처럼 requestAnimationFrame으로 돌고 끝나면 다시 예약하지 않음', async (t) => {
  const frames = new Map();
  let fid = 0;
  globalThis.requestAnimationFrame = (f) => { const id = ++fid; frames.set(id, f); return id; };
  globalThis.cancelAnimationFrame = (id) => { frames.delete(id); };
  t.after(() => { delete globalThis.requestAnimationFrame; delete globalThis.cancelAnimationFrame; });
  const w = world(t, (stage) => runTug(stage, { rng: seeded(3) }));
  const runFrames = () => { const fs = [...frames.values()]; frames.clear(); for (const f of fs) f(); };
  w.who[2].fire('click');
  w.adv(850);
  assert.equal(frames.size, 1, '시작하면 그림 한 장을 예약');
  for (let k = 0; k < 40; k++) { w.adv(50); runFrames(); }
  assert.equal(frames.size, 1, '늘 한 장씩만 예약');
  assert.ok(w.px() > 0, '그림마다 나옹 당김이 보인다');
  let atEnd = null;
  for (let k = 0; k < 700 && !w.st.over; k++) {
    w.adv(50);
    runFrames();
    if (atEnd === null && w.banner.textContent === '끝!') atEnd = frames.size;
    await w.flush();
  }
  assert.ok(w.st.over && w.st.over.quit === false, '끝까지');
  assert.equal(atEnd, 0, '끝난 그 그림에서 다음 그림을 예약하지 않는다');
});

test('🤼 화면 — 늦은 프레임: 나옹의 승리와 다음 판 시작이 한 번에 와도 지난 판 「나옹 이겼다!」는 내려가고 다음 누름은 셈 (🔍 Codex 118차 #1)', async (t) => {
  const frames = new Map();
  let fid = 0;
  globalThis.requestAnimationFrame = (f) => { const id = ++fid; frames.set(id, f); return id; };
  globalThis.cancelAnimationFrame = (id) => { frames.delete(id); };
  t.after(() => { delete globalThis.requestAnimationFrame; delete globalThis.cancelAnimationFrame; });
  const w = world(t, (stage) => runTug(stage, { rng: () => 0.5 }));
  const runFrames = () => { const fs = [...frames.values()]; frames.clear(); for (const f of fs) f(); };
  w.who[2].fire('click');
  w.adv(850); // 시작 — 그림 한 장 예약됨
  w.adv(6000); // 그림이 6초 멈춤 — 그 사이 나옹이 한 판 이기고(4.5초쯤) 쉼(1.2초)도 끝남
  runFrames(); // 한 번에 따라잡음
  assert.equal(w.board.textContent, '진우 🏆 0 : 1 🏆 나옹', '점수판엔 나옹 한 판');
  assert.ok(!w.banner.className.includes('is-on'), '지난 판 「나옹 이겼다!」는 내려감');
  assert.ok(Math.abs(w.px()) <= TUG_PULL * 1.3, `리본은 새 판 가운데 근처 (${w.team.style.transform})`);
  w.btnMe.fire('pointerdown');
  assert.equal(w.star(), '⭐ 1', '쉼이 아니라 다음 누름은 셈');
  w.h.stop();
});
