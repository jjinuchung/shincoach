// 🎮 게임기 미니 게임 4단계 (v310 · 2026-10-21 아버님 "로켓단 열기구 진행하자" → 물음 추천안) — node --test tests/minigame310.test.js
// 🎈 로켓단 열기구: 나옹 열기구 한 번 톡 = 펑 ⭐1 · 가끔 큰 나옹 열기구는 ❤️ 세 번 ⭐5 · 파트너 기술(⚔️ 배틀과 같은 강한 기술) · 터지면 「불쌍한 내 인생~」
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GAMES, gameById } from '../js/minigame.js';
import { BAL_SEC, BAL_W, BAL_H, BAL_KINDS, BAL_MEOWTH, BIG_FROM, BIG_RATE, HUGE_FROM, HUGE_RATE, TINY_FROM, TINY_RATE, balKind, balKo, balPace, balStart, balY, balTick, balTap, balShift, ro, runBalloon } from '../js/gameballoon.js';
import { BLAST } from '../js/rocketview.js';
import { movesOf } from '../js/battle.js';

const src = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
function seeded(seed = 7) {
  let x = seed >>> 0;
  return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 2 ** 32; };
}
const SEEDS = [1, 7, 42, 2026, 99999, 31337, 5, 777];

// ───────────────────── 목록 · 게임기 화면 연결 ─────────────────────

test('🎮 v310 게임 목록 — 🎈 로켓단 열기구 30초 · 화면(RUNNERS)·준비(prep): 나옹 그림 · 파트너 기술', () => {
  assert.deepEqual(GAMES.map((g) => g.id).slice(0, 6), ['dig', 'run', 'shadow', 'pair', 'berry', 'balloon'], '여섯째까지 (v311부터 더 늘어난다 — minigame311)');
  assert.equal(gameById('balloon').sec, BAL_SEC);
  assert.equal(BAL_SEC, 30);
  for (const g of GAMES) assert.ok(!/\d/.test(g.how), `${g.id}: 아이가 보는 설명에 숫자 없음`);
  const gv = src('js/gameview.js');
  assert.match(gv, /\n {2}balloon: \{ run: runBalloon, prep: \(\) => balloonPrep\(\) \},/);
  const prep = gv.slice(gv.indexOf('async function balloonPrep('), gv.indexOf('\n}\n', gv.indexOf('async function balloonPrep(')));
  assert.match(prep, /await Promise\.race\(\[ensureAnim\(BAL_MEOWTH\)\.catch\(\(\) => null\), wait\(ART_WAIT_MS\)\]\);/, '나옹 그림은 기다리는 끝이 있다');
  assert.match(prep, /const m = pid \? movesOf\(pid\)\[0\] : null;/, '⚔️ 배틀과 같은 강한 기술');
  assert.match(prep, /meowth: animUrl\(BAL_MEOWTH\) \|\| characterUrl\(BAL_MEOWTH\) \|\| artUrl\(BAL_MEOWTH\) \|\| null,/);
  assert.equal(BAL_MEOWTH, 52, '나옹');
  assert.deepEqual(movesOf(658)[0].name, '물수리검', '개굴닌자는 물수리검');
  assert.equal(BLAST, '불쌍한 내 인생~', '아버님이 고르신 말 그대로');
  assert.ok(!/coins|addCoins|applyPurchase|items\[|xp\.js|db\.js/.test(src('js/gameballoon.js')), '저장·가방을 안 만진다');
});

test('🎮 서비스워커 v310 · 새 파일 · css (열기구는 로켓단 배틀과 같은 노란 열기구)', () => {
  const sw = src('sw.js');
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(sw) || [])[1]) >= 310, 'sw v310 이상');
  assert.ok(sw.includes("'./js/gameballoon.js'"));
  const css = src('css/style.css');
  assert.match(css, /\.gl-env \{[^}]*background-color: #fde68a; border: 3px solid #b45309;/, '로켓단 열기구 색');
  assert.match(css, /\.gl-bal\.is-pop > \* \{ animation: gl-pop/);
  assert.match(css, /\.gl-field \{[^}]*touch-action: manipulation;/);
  assert.ok(css.includes('@media (min-width: 720px) { .gm-list { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } }'), '게임이 여섯이 되어도 낮은 가로 화면에 한눈에(두 칸 · 긴 설명도 칸을 안 밂)');
  assert.ok(css.includes('.gm-game-txt { display: grid; gap: 2px; min-width: 0; }'));
  assert.ok(css.includes('.gl-bal.is-pop { pointer-events: none; }'), '터져 날아가는 열기구는 아래를 가리지 않는다 (🔍 Codex 116차 #1)');
});

// ───────────────────── 🎈 엔진 ─────────────────────

test('🎈 빠르기 (v332 — 아버님 "너무 쉬운 것 같으니") — 한 번에 떠 있는 끝 3 → 4 → 5 · 빨라짐 18 → 36칸/초 · 다음 열기구까지 0.75 → 0.35초 · 크기·⭐', () => {
  assert.deepEqual(balPace(0), { most: 3, speed: 18, gap: 750 });
  assert.deepEqual(balPace(BAL_SEC * 1000), { most: 5, speed: 36, gap: 350 });
  assert.equal(balPace(BAL_SEC * 1000 * 0.5).most, 4);
  assert.deepEqual(balPace(99e9), balPace(BAL_SEC * 1000));
  assert.deepEqual(balPace(NaN), balPace(0));
  for (let ms = 0; ms < BAL_SEC * 1000; ms += 1000) {
    const a = balPace(ms);
    const b = balPace(ms + 1000);
    assert.ok(b.most >= a.most && b.speed >= a.speed && b.gap <= a.gap);
  }
  assert.deepEqual(Object.fromEntries(Object.entries(BAL_KINDS).map(([k, v]) => [k, [v.hp, v.pts]])), { small: [1, 1], big: [3, 5], tiny: [1, 2], huge: [6, 12] }, '큰 열기구는 세 번 · ⭐5 · 거대는 여섯 번 · ⭐12 · 꼬마는 ⭐2');
  assert.deepEqual([BAL_W, BAL_H, BIG_FROM, BIG_RATE, HUGE_FROM, HUGE_RATE, TINY_FROM, TINY_RATE], [100, 70, 5000, 0.12, 12000, 0.08, 4000, 0.18]);
  // 거대 = 큰 것의 1.4배(반올림) · 꼬마는 작은 것보다 작다 · 거대도 하늘 안(파트너 위)에 들어간다
  assert.deepEqual([BAL_KINDS.huge.w, BAL_KINDS.huge.h], [Math.round(BAL_KINDS.big.w * 1.4), Math.round(BAL_KINDS.big.h * 1.4)]);
  assert.ok(BAL_KINDS.tiny.w < BAL_KINDS.small.w && BAL_KINDS.tiny.h < BAL_KINDS.small.h);
  assert.ok(BAL_H * 0.72 - BAL_KINDS.huge.h - 6 > 0, '거대 열기구가 들어갈 높이');
  assert.deepEqual(['small', 'big', 'tiny', 'huge', 'nope'].map(balKo), ['로켓단 열기구', '큰 로켓단 열기구', '꼬마 로켓단 열기구', '거대한 로켓단 열기구', '로켓단 열기구']);
});

test('🎈 종류 고르기 (v332) — 처음 4초는 작은 것만 · 큰 것 5초 · 거대 12초부터 · 큰 것·거대는 하늘에 이미 있으면 안 나옴 · 뽑는 차례', () => {
  const s = balStart(0);
  const r = (...xs) => { let i = 0; return () => xs[i++]; };
  assert.equal(balKind(s, 3999, r(0)), 'small', '처음 4초는 rng를 안 써도 작은 것');
  assert.equal(balKind(s, 4000, r(0.1)), 'tiny');
  assert.equal(balKind(s, 4000, r(0.18)), 'small', '꼬마 확률 경계');
  assert.equal(balKind(s, 5000, r(0.11)), 'big');
  assert.equal(balKind(s, 5000, r(0.12, 0.5)), 'small', '큰 것 경계 → 꼬마도 아님');
  assert.equal(balKind(s, 11999, r(0.01)), 'big', '거대는 12초 전엔 안 나온다');
  assert.equal(balKind(s, 12000, r(0.07)), 'huge');
  assert.equal(balKind(s, 12000, r(0.08, 0.11)), 'big', '거대 경계 → 큰 것');
  s.bals.push({ n: 1, kind: 'huge' }, { n: 2, kind: 'big' });
  assert.equal(balKind(s, 20000, r(0.01, 0.5)), 'tiny', '거대·큰 것이 이미 있으면 그다음 꼬마 뽑기로');
  assert.equal(balKind(s, 20000, r(0.5)), 'small');
});

test('🎈 「으로/로」 — 받침이 없거나 ㄹ이면 「로」', () => {
  assert.equal(ro('물수리검'), '으로');
  assert.equal(ro('백만볼트'), '로');
  assert.equal(ro('깨물어부수기'), '로');
  assert.equal(ro('덩굴채찍'), '으로');
  assert.equal(ro('물'), '로', 'ㄹ 받침');
  assert.equal(ro('별 던지기'), '로');
  assert.equal(ro(''), '로');
  assert.equal(ro('abc'), '로');
  assert.equal(ro(undefined), '로');
});

/** 한 판을 50ms씩 끝까지 — play(s, t)가 누를지 정한다 */
function playAll(seed, play) {
  const rng = seeded(seed);
  const s = balStart(0);
  const out = { s, added: [], maxUp: 0, bigsAtOnce: 0, hugesAtOnce: 0 };
  let prev = 0;
  for (let t = 0; t <= BAL_SEC * 1000 + 1000; t += 50) {
    const ev = balTick(s, t, rng);
    out.added.push(...ev.added.map((it) => ({ ...it, at: s.last })));
    out.maxUp = Math.max(out.maxUp, s.bals.length);
    out.bigsAtOnce = Math.max(out.bigsAtOnce, s.bals.filter((it) => it.kind === 'big').length);
    out.hugesAtOnce = Math.max(out.hugesAtOnce, s.bals.filter((it) => it.kind === 'huge').length);
    assert.ok(s.bals.length <= balPace(s.last - s.t0).most, '떠 있는 수는 끝을 안 넘는다');
    assert.ok(s.score >= prev, '점수는 줄지 않는다');
    prev = s.score;
    if (play) play(s, t);
  }
  return out;
}

test('🎈 열기구가 나오는 모양 — 0.6초에 첫 열기구 · 하늘 옆에서 들어와 건너감 · 하늘 안 높이 · 큰 열기구는 5초 뒤 · 거대는 12초 뒤 · 꼬마는 4초 뒤 · 큰 것·거대는 하나씩만', () => {
  let bigSeeds = 0;
  let hugeSeeds = 0;
  let tinySeeds = 0;
  const speeds = { small: [], big: [], tiny: [], huge: [] };
  for (const seed of SEEDS) {
    const r = playAll(seed);
    assert.equal(r.added[0].at, 600, '첫 열기구');
    assert.equal(r.added[0].kind, 'small', '첫 열기구는 작은 것');
    for (const it of r.added) {
      const k = BAL_KINDS[it.kind];
      assert.ok(it.x === -k.w / 2 || it.x === BAL_W + k.w / 2, '옆에서 들어온다');
      assert.ok((it.x < 0) === (it.vx > 0), '들어온 쪽에서 건너간다');
      assert.ok(it.y0 - k.h / 2 - 3 >= 0 && it.y0 + k.h / 2 + 3 <= BAL_H * 0.72, `하늘 안 (${it.kind} ${it.y0})`);
      assert.equal(it.hp, k.hp);
      if (it.kind === 'big') assert.ok(it.at >= BIG_FROM, '큰 열기구는 5초 뒤');
      if (it.kind === 'huge') assert.ok(it.at >= HUGE_FROM, '거대 열기구는 12초 뒤');
      if (it.kind === 'tiny') assert.ok(it.at >= TINY_FROM, '꼬마 열기구는 4초 뒤');
      // 그때 빠르기 대비 — 꼬마는 빠르게, 클수록 느리게 (흔들림 0.8~1.2배)
      speeds[it.kind].push(Math.abs(it.vx) / balPace(it.at).speed);
    }
    assert.ok(r.bigsAtOnce <= 1, '큰 열기구는 한 번에 하나');
    assert.ok(r.hugesAtOnce <= 1, '거대 열기구는 한 번에 하나');
    if (r.added.some((it) => it.kind === 'big')) bigSeeds += 1;
    if (r.added.some((it) => it.kind === 'huge')) hugeSeeds += 1;
    if (r.added.some((it) => it.kind === 'tiny')) tinySeeds += 1;
    assert.equal(r.s.score, 0, '안 누르면 0');
    assert.ok(r.s.escaped > 0, '놓친 열기구는 하늘 밖으로 — 감점 없음');
    assert.equal(r.s.last, r.s.end, '판 끝에서 멈춘다');
  }
  assert.ok(bigSeeds >= 4, `큰 열기구가 나오는 판이 흔하다 (${bigSeeds}/8)`);
  assert.ok(hugeSeeds >= 3, `거대 열기구가 나오는 판도 꽤 있다 (${hugeSeeds}/8)`);
  assert.equal(tinySeeds, SEEDS.length, '꼬마 열기구는 판마다');
  const span = (xs) => [Math.min(...xs), Math.max(...xs)];
  for (const [kind, mul] of [['small', 1], ['big', 0.6], ['tiny', 1.6], ['huge', 0.45]]) {
    const [lo, hi] = span(speeds[kind]);
    assert.ok(lo >= mul * 0.8 - 1e-9 && hi <= mul * 1.2 + 1e-9, `${kind} 빠르기 ×${mul} (${lo.toFixed(2)}~${hi.toFixed(2)})`);
  }
});

test('🎈 누르기 — 작은 열기구 펑 ⭐1 · 큰 열기구는 ❤️ 세 번째에 펑 ⭐5(앞의 두 번은 셈 없음) · 없는 열기구 · 끝난 뒤', () => {
  const s = balStart(0);
  s.bals.push({ n: 1, kind: 'small', hp: 1, w: 14, h: 17, x: 50, vx: 10, y0: 20, phase: 0, born: 0 });
  s.bals.push({ n: 2, kind: 'big', hp: 3, w: 22, h: 27, x: 30, vx: -6, y0: 25, phase: 0, born: 0 });
  const a = balTap(s, 1, 100);
  assert.deepEqual([a.kind, a.pts, s.score, s.pops], ['pop', 1, 1, 1]);
  assert.equal(balTap(s, 1, 110).kind, 'miss', '터진 것은 다시 못 누름');
  assert.deepEqual([balTap(s, 2, 120).kind, s.bals[0].hp], ['hit', 2]);
  assert.deepEqual([balTap(s, 2, 130).hp, s.score], [1, 1], '두 번째까지는 셈 없음');
  const c = balTap(s, 2, 140);
  assert.deepEqual([c.kind, c.pts, s.score, s.bigs, s.bals.length, s.hits], ['pop', 5, 6, 1, 0, 4]);
  assert.equal(balTap(s, 99, 150).kind, 'miss');
  assert.equal(balTap(s, 1, s.end).kind, 'over');
});

test('🎈 30초 한 판(가짜 시계 · 씨앗 여덟) — 빠른 손이 느린 손의 두 배 넘게 · 점수 = 작은 것 + 꼬마×2 + 큰 것×5 + 거대×12', () => {
  for (const seed of SEEDS) {
    const res = {};
    for (const [mode, every] of [['fast', 300], ['slow', 1500]]) {
      let next = 800;
      const r = playAll(seed, (s, t) => {
        if (t < next) return;
        const vis = s.bals.filter((it) => it.x > 2 && it.x < BAL_W - 2);
        if (vis.length) balTap(s, vis[0].n, t);
        next = t + every;
      });
      assert.equal(r.s.score, r.s.pops - r.s.bigs - r.s.huges - r.s.tinies + 2 * r.s.tinies + 5 * r.s.bigs + 12 * r.s.huges);
      res[mode] = r.s.score;
    }
    assert.ok(res.fast >= 35 && res.fast > res.slow * 2, `seed ${seed}: 빠름 ${res.fast} · 느림 ${res.slow}`);
  }
});

test('🎈 시계 — 깨진 때·뒤로 간 때는 안 움직임 · 앱을 내렸다 돌아오면(balShift) 남은 시간 그대로 · 둥실 흔들림도 이어서', () => {
  const s = balStart(1000);
  balTick(s, 3000, seeded(1));
  const snap = JSON.stringify(s);
  balTick(s, NaN, seeded(1));
  balTick(s, 2000, seeded(1));
  assert.equal(JSON.stringify(s), snap);
  const it = s.bals[0];
  const yBefore = balY(it, s.last);
  const next = s.next;
  balShift(s, 5000);
  assert.deepEqual([s.t0, s.end, s.last, s.next], [6000, 6000 + BAL_SEC * 1000, 8000, next + 5000]);
  assert.ok(Math.abs(balY(it, s.last) - yBefore) < 1e-9, '흔들림이 이어진다');
  const b = JSON.stringify(s);
  balShift(s, 0); balShift(s, -1); balShift(s, NaN);
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
  getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 70 }; }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((x) => x !== this); }
  querySelector(sel) {
    const cls = sel.replace(/^\./, '');
    for (const c of this.children) {
      if (c.className.split(/\s+/).includes(cls)) return c;
      const d = c.querySelector(sel);
      if (d) return d;
    }
    return null;
  }
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
  const adv = (ms) => { for (let k = 0; k < ms; k += 50) { clock += 50; t.mock.timers.tick(50); } };
  const flush = () => new Promise((r) => setImmediate(r));
  const hide = (on) => { doc.hidden = on; doc.fire('visibilitychange'); };
  return { stage, h, doc, adv, flush, st, hide };
}
const MOVE = { name: '물수리검', emoji: '💧' };

test('🎈 화면 — 기술 이름 안내(으로/로) · 「준비!」 때 내려도 안 끝남 · 톡 하면 펑(⭐ · 기술이 날아감) · 큰 열기구는 ❤️ 세 번 · 「불쌍한 내 인생~」 · 30초 뒤 끝', async (t) => {
  const w = world(t, (stage) => runBalloon(stage, { rng: seeded(3), move: MOVE, meowth: 'blob:meowth', hero: { html: '<img class="gd-pal-img">' } }));
  const root = w.stage.children[0];
  const [top, field, hint, fx] = root.children;
  const layer = field.children[2];
  const me = field.children[3];
  assert.equal(hint.textContent, '톡! 💧 물수리검으로 열기구를 터뜨려요');
  assert.equal(me.innerHTML, '<img class="gd-pal-img">');
  w.adv(400);
  w.hide(true);
  w.adv(40000);
  await w.flush();
  assert.equal(w.st.over, null, '숨은 동안 안 끝남');
  assert.equal(layer.children.length, 0, '숨은 동안 안 나옴');
  w.hide(false);
  w.adv(1500);
  const small = layer.children.find((e) => e.className.includes('is-small'));
  assert.ok(small, '돌아오면 열기구가 나온다');
  const env = small.children[0];
  assert.equal(env.children[0].src, 'blob:meowth', '나옹 그림');
  assert.match(small.style.transform, /^translate3d\(-?[\d.]+px, -?[\d.]+px, 0\)$/);
  small.fire('pointerdown');
  assert.equal(top.children[0].textContent, '⭐ 1');
  assert.ok(small.classList.contains('is-pop') && small.disabled, '펑');
  assert.ok(fx.children.some((f) => f.className === 'gl-shot' && f.textContent === '💧'), '기술이 날아간다');
  assert.ok(me.classList.contains('is-shoot'));
  small.fire('pointerdown');
  assert.equal(top.children[0].textContent, '⭐ 1', '터진 것을 또 눌러도 그대로');
  // 큰 열기구를 기다려 세 번
  let big = null;
  let k = 0;
  while (!big && k++ < 600) { w.adv(50); big = layer.children.find((e) => e.className.includes('is-big') && !e.className.includes('is-pop')); }
  assert.ok(big, '큰 열기구가 나온다');
  assert.equal(big.attrs['aria-label'], '큰 로켓단 열기구');
  const before = Number(top.children[0].textContent.replace('⭐ ', ''));
  big.fire('pointerdown');
  big.fire('click', { detail: 1 }); // 손가락 뒤에 따라오는 click은 또 맞히지 않는다
  assert.ok(big.classList.contains('is-hit'));
  assert.equal(big.querySelector('.gl-hp').textContent, '❤️❤️', '❤️ 하나 깨짐 (손가락 한 번 = 한 번)');
  assert.equal(big.attrs['aria-label'], '큰 로켓단 열기구 ❤️❤️', '남은 ❤️도 읽힌다');
  big.fire('pointerdown');
  assert.equal(Number(top.children[0].textContent.replace('⭐ ', '')), before, '두 번째까지는 그대로');
  big.fire('click', { detail: 0 }); // ⌨️ Enter·스페이스도 한 번
  assert.equal(Number(top.children[0].textContent.replace('⭐ ', '')), before + 5, '세 번째에 ⭐5');
  assert.ok(big.classList.contains('is-pop') && !big.classList.contains('is-hit'), '터질 때 흔들림을 떼야 몸통도 같이 날아간다 (🔍 Codex 116차 #2)');
  assert.ok(fx.children.some((f) => f.textContent === BLAST), '「불쌍한 내 인생~」');
  big.fire('click', { detail: 1 }); // 손가락 뒤의 click은 두 번 안 센다
  assert.equal(Number(top.children[0].textContent.replace('⭐ ', '')), before + 5);
  w.adv(40000);
  await w.flush();
  assert.ok(w.st.over && w.st.over.quit === false);
  assert.match(top.children[0].textContent, new RegExp(`^⭐ ${w.st.over.score}$`));
  assert.equal((w.doc.listeners.visibilitychange || []).length, 0, '끝나면 듣기를 뗀다');
});

test('🎈 화면 (v332) — 꼬마 열기구 ⭐2 · 거대 열기구는 ❤️ 여섯(읽는 말도) · 다섯 번까지 셈 없음 · 여섯 번째 펑 ⭐12 · 「불쌍한 내 인생~」', async (t) => {
  // rng가 늘 0.01이면: 4초부터 꼬마 · 5초부터 큰 것 · 12초부터 거대가 나온다(이미 떠 있지 않을 때)
  const w = world(t, (stage) => runBalloon(stage, { rng: () => 0.01, move: MOVE }));
  const root = w.stage.children[0];
  const [top, field, , fx] = root.children;
  const layer = field.children[2];
  const score = () => Number(top.children[0].textContent.replace('⭐ ', ''));
  const live = (cls) => layer.children.find((e) => e.className.includes(cls) && !e.className.includes('is-pop'));
  let tiny = null;
  let k = 0;
  while (!tiny && k++ < 400) { w.adv(50); tiny = live('is-tiny'); }
  assert.ok(tiny, '꼬마 열기구가 나온다');
  assert.equal(tiny.attrs['aria-label'], '꼬마 로켓단 열기구');
  assert.equal(tiny.querySelector('.gl-hp'), null, '꼬마는 ❤️ 없이 한 번');
  const a = score();
  tiny.fire('pointerdown');
  assert.equal(score(), a + 2, '꼬마는 ⭐2');
  assert.ok(!fx.children.some((f) => f.textContent === BLAST), '꼬마는 「불쌍한 내 인생~」 없음');
  let huge = null;
  k = 0;
  while (!huge && k++ < 400) { w.adv(50); huge = live('is-huge'); }
  assert.ok(huge, '거대 열기구가 나온다');
  assert.equal(huge.attrs['aria-label'], '거대한 로켓단 열기구');
  assert.equal(huge.querySelector('.gl-hp').textContent, '❤️'.repeat(6));
  assert.equal(huge.style.width, `${BAL_KINDS.huge.w}%`);
  const b = score();
  for (let i = 5; i >= 1; i--) {
    huge.fire('pointerdown');
    assert.equal(huge.querySelector('.gl-hp').textContent, '❤️'.repeat(i));
    assert.equal(huge.attrs['aria-label'], `거대한 로켓단 열기구 ${'❤️'.repeat(i)}`);
  }
  assert.equal(score(), b, '다섯 번까지는 그대로');
  huge.fire('pointerdown');
  assert.equal(score(), b + 12, '여섯 번째에 ⭐12');
  assert.ok(huge.classList.contains('is-pop'));
  assert.ok(fx.children.some((f) => f.textContent === BLAST), '거대도 「불쌍한 내 인생~」');
  w.h.stop();
});

test('🎈 화면 — 나옹 그림이 없거나 깨지면 😼 · 파트너가 없으면 ⭐ 별 던지기로', async (t) => {
  const w = world(t, (stage) => runBalloon(stage, { rng: seeded(3), meowth: 'blob:broken' }));
  const root = w.stage.children[0];
  assert.equal(root.children[2].textContent, '톡! ⭐ 별 던지기로 열기구를 터뜨려요');
  const layer = root.children[1].children[2];
  w.adv(1500);
  const a = layer.children[0];
  a.children[0].children[0].fire('error');
  assert.match(a.children[0].innerHTML, /😼/, '깨지면 😼');
  let b = null;
  let k = 0;
  while (!b && k++ < 200) { w.adv(50); b = layer.children.find((e) => e !== a); }
  assert.ok(b);
  assert.match(b.children[0].innerHTML, /😼/, '다음 열기구도 처음부터 😼');
  w.h.stop();
  const v = runBalloon(new FakeEl('div'), { rng: seeded(3) });
  v.stop();
});

test('🎈 화면 — 「준비!」 때 그만두면 안 열리고 듣기도 뗀다 · 판 도중 그만두면 그때 점수로 · 그 뒤로 눌러도 그대로', async (t) => {
  const w = world(t, (stage) => runBalloon(stage, { rng: seeded(5), move: MOVE }));
  w.adv(300);
  w.h.stop();
  await w.flush();
  assert.deepEqual(w.st.over, { score: 0, quit: true });
  w.adv(3000);
  assert.equal(w.stage.children[0].children[1].children[2].children.length, 0, '그만둔 판은 안 열림');
  assert.equal((w.doc.listeners.visibilitychange || []).length, 0);
});

test('🎈 화면 — 브라우저처럼 requestAnimationFrame으로 돌고 끝나면 다시 예약하지 않음 · 화면 크기가 바뀌면 자리도 새로 (🔍 Codex 116차)', async (t) => {
  const frames = new Map();
  let fid = 0;
  const win = { listeners: {}, addEventListener(type, f) { (this.listeners[type] ||= []).push(f); }, removeEventListener(type, f) { this.listeners[type] = (this.listeners[type] || []).filter((x) => x !== f); } };
  globalThis.requestAnimationFrame = (f) => { const id = ++fid; frames.set(id, f); return id; };
  globalThis.cancelAnimationFrame = (id) => { frames.delete(id); };
  globalThis.window = win;
  t.after(() => { delete globalThis.requestAnimationFrame; delete globalThis.cancelAnimationFrame; delete globalThis.window; });
  const w = world(t, (stage) => runBalloon(stage, { rng: seeded(3), move: MOVE }));
  const runFrames = () => { const fs = [...frames.values()]; frames.clear(); for (const f of fs) f(); };
  const field = w.stage.children[0].children[1];
  const layer = field.children[2];
  assert.equal((win.listeners.resize || []).length, 1, '화면 크기를 듣는다');
  w.adv(850);
  assert.equal(frames.size, 1, '시작하면 그림 한 장을 예약');
  for (let k = 0; k < 40; k++) { w.adv(50); runFrames(); }
  assert.equal(frames.size, 1, '늘 한 장씩만 예약 (쌓이지 않는다)');
  const bal = layer.children.find((e) => !e.className.includes('is-pop'));
  const xy = () => (/translate3d\((-?[\d.]+)px, (-?[\d.]+)px/.exec(bal.style.transform) || []).slice(1).map(Number);
  const [x1, y1] = xy();
  field.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 140 }); // 돌렸다 — 두 배
  for (const f of win.listeners.resize) f();
  runFrames(); // 시계는 그대로 — 자리만 새 크기로
  const [x2, y2] = xy();
  assert.ok(Math.abs(x2 - 2 * x1) <= 0.25 && Math.abs(y2 - 2 * y1) <= 0.25, `새 크기로 (${x1},${y1}) → (${x2},${y2})`);
  const banner = w.stage.children[0].children[4];
  let atEnd = null;
  for (let k = 0; k < 700 && !w.st.over; k++) {
    w.adv(50);
    runFrames();
    if (atEnd === null && banner.textContent === '끝!') atEnd = frames.size; // 끝난 바로 그 그림에서
    await w.flush();
  }
  assert.ok(w.st.over && w.st.over.quit === false, '끝까지');
  assert.equal(atEnd, 0, '끝난 그 그림에서 다음 그림을 예약하지 않는다');
  runFrames();
  assert.equal(frames.size, 0);
  assert.equal((win.listeners.resize || []).length, 0, '화면 크기 듣기도 뗀다');
});

test('🎈 화면 — 판 도중 그만두면 그때 점수로 · 그 뒤로 눌러도 그대로', async (t) => {
  const w = world(t, (stage) => runBalloon(stage, { rng: seeded(5), move: MOVE }));
  const root = w.stage.children[0];
  const layer = root.children[1].children[2];
  w.adv(3000); // 열기구 둘이 뜰 때까지
  const a = layer.children.find((e) => !e.className.includes('is-pop'));
  a.fire('pointerdown');
  w.h.stop();
  await w.flush();
  assert.deepEqual(w.st.over, { score: 1, quit: true });
  const b = layer.children.find((e) => !e.className.includes('is-pop'));
  assert.ok(b, '아직 떠 있는 열기구');
  b.fire('pointerdown');
  b.fire('click', { detail: 0 });
  assert.equal(root.children[0].children[0].textContent, '⭐ 1', '그만둔 뒤엔 안 셈');
});
