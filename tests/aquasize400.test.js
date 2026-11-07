// 🐠 v400 수조 물고기 크기 — 더 길게 낚은 물고기가 화면에서 더 작게 보이지 않는다 (v399는 겹으로만 크기를 정했다)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TANKS, aquaBest } from '../js/aquarium.js';
import { SPECIES } from '../js/fishing.js';
import { fishPlan, fishCap, keepIn, waterOf, setFish } from '../js/aquaart.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
// 물 칸 크기 — 앱이 쓰는 그 셈 (Codex 202차: 어림값은 1단계를 18픽셀 작게 잡았다)
const room = (tank) => waterOf(tank);
const KEYS = SPECIES.filter((s) => !s.photo).map((s) => s.key);
const SP = Object.fromEntries(SPECIES.map((s) => [s.key, s]));
// 씨앗 하나로 같은 무작위
const rng = (seed) => () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };

test('어떤 조합이든 더 길게 낚은 물고기가 더 작게 그려지지 않는다', () => {
  let pairs = 0;
  for (let seed = 1; seed <= 400; seed++) {
    const r = rng(seed);
    const tank = TANKS[Math.floor(r() * TANKS.length)];
    const n = 1 + Math.floor(r() * tank.fish);
    const keys = Array.from({ length: n }, () => KEYS[Math.floor(r() * KEYS.length)]);
    const cm = {};
    for (const k of keys) if (!(k in cm)) cm[k] = Math.round((SP[k].min + r() * (SP[k].max - SP[k].min)) * 10) / 10;
    const { iw, ih } = room(tank);
    const plan = fishPlan(keys, (k) => cm[k], tank.fish, iw, ih);
    assert.equal(plan.length, n);
    for (let a = 0; a < n; a++) {
      assert.ok(Number.isInteger(plan[a].L) && plan[a].L >= 16, `L ${plan[a].L}`);
      assert.ok(plan[a].L <= fishCap(iw, ih), `수조보다 큼 ${keys[a]} ${plan[a].L}`);
      for (let b = 0; b < n; b++) {
        if (cm[keys[a]] > cm[keys[b]]) {
          pairs += 1;
          assert.ok(plan[a].L >= plan[b].L, `씨앗 ${seed} ${keys[a]} ${cm[keys[a]]}cm L${plan[a].L} < ${keys[b]} ${cm[keys[b]]}cm L${plan[b].L}`);
        }
      }
    }
  }
  assert.ok(pairs > 5000, `견준 짝 ${pairs}`);
});

test('진우가 본 장면 — 큰 문어가 작은 물고기들보다 크다 (어느 자리에 넣어도)', () => {
  const tank = TANKS[0];
  const { iw, ih } = room(tank);
  const cm = { daemuneo: 180, bungeo: 20, pirami: 12, chamdom: 40, bass: 30 };
  const small = ['bungeo', 'pirami', 'chamdom', 'bass'];
  for (let at = 0; at < 5; at++) {
    const keys = [...small];
    keys.splice(at, 0, 'daemuneo');
    const plan = fishPlan(keys, (k) => cm[k], tank.fish, iw, ih);
    const big = plan[at];
    for (let i = 0; i < 5; i++) if (i !== at) assert.ok(big.L > plan[i].L, `${at}번 자리 문어 L${big.L} · ${keys[i]} L${plan[i].L}`);
    assert.equal(big.where, 'front'); // 가장 큰 것은 앞 겹
  }
});

test('겹은 크기 차례 — 작은 것이 뒤, 큰 것이 앞 · 가자미 무리는 바닥(가운데 겹)에 눕되 크기 차례는 그대로', () => {
  const tank = TANKS[3];
  const { iw, ih } = room(tank);
  const keys = ['bungeo', 'neopchi', 'pirami', 'daemuneo', 'munchi', 'chamdom', 'bass', 'megi', 'galchi', 'godeung'];
  const cm = { bungeo: 25, neopchi: 80, pirami: 10, daemuneo: 250, munchi: 30, chamdom: 60, bass: 40, megi: 70, galchi: 110, godeung: 35 };
  const plan = fishPlan(keys, (k) => cm[k], tank.fish, iw, ih);
  const RANK = { back: 0, mid: 1, front: 2 };
  for (let a = 0; a < keys.length; a++) {
    for (let b = 0; b < keys.length; b++) {
      if (cm[keys[a]] > cm[keys[b]]) assert.ok(RANK[plan[a].size] >= RANK[plan[b].size], `${keys[a]} ${plan[a].size} · ${keys[b]} ${plan[b].size}`);
    }
  }
  const at = (k) => plan[keys.indexOf(k)];
  assert.equal(at('neopchi').where, 'mid');
  assert.equal(at('munchi').where, 'mid');
  assert.equal(at('neopchi').flat, true);
  assert.ok(at('neopchi').L > at('bass').L); // 넙치 80 > 배스 40
  assert.equal(at('pirami').size, 'back');
  // 겹 수는 v399와 같은 차례표(ORDER)에서 — 열 마리면 뒤 4 · 가운데 4 · 앞 2
  const sizes = plan.map((x) => x.size);
  assert.deepEqual(['back', 'mid', 'front'].map((w) => sizes.filter((s) => s === w).length), [4, 4, 2]);
});

test('같은 길이는 같은 겹 안에서 거의 같은 크기 · 길이 기록이 없거나 깨져도 그린다', () => {
  const tank = TANKS[7];
  const { iw, ih } = room(tank);
  const plan = fishPlan(Array(10).fill('bungeo'), () => 20, tank.fish, iw, ih);
  assert.equal(plan.length, 10);
  for (const w of ['back', 'mid', 'front']) {
    const ls = plan.filter((x) => x.size === w).map((x) => x.L);
    assert.ok(ls.length >= 2, w);
    assert.ok(Math.max(...ls) / Math.min(...ls) <= 1.14, `${w} ${ls}`); // 흔들림 0.94~1.06 안
  }
  const bad = fishPlan(['bungeo', 'pirami', 'megi'], (k) => ({ bungeo: undefined, pirami: NaN, megi: -3 }[k]), tank.fish, iw, ih);
  for (const x of bad) assert.ok(Number.isFinite(x.L) && x.L >= 16);
  assert.deepEqual(fishPlan([], () => 0, tank.fish, iw, ih), []);
  // 깨진 값은 가장 짧게 줄 선다 — 1 cm보다 크게 그려지지 않는다 · 끝없이 길면 가장 길게
  const odd = fishPlan(['bungeo', 'pirami', 'megi'], (k) => ({ bungeo: -1, pirami: 1, megi: Infinity }[k]), tank.fish, iw, ih);
  assert.ok(odd[0].L <= odd[1].L && odd[1].L <= odd[2].L, odd.map((x) => x.L).join());
});

test('setFish — 길이대로 그리고 · 같은 모습은 그림 하나를 같이 쓰고 · 물 칸 안에서 헤엄친다 (캔버스 흉내)', () => {
  const any = () => new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : any()), apply: () => any(), set: () => true, construct: () => any() });
  let made = 0;
  const saved = { document: globalThis.document, Path2D: globalThis.Path2D };
  globalThis.document = { createElement: () => { made += 1; return { width: 0, height: 0, getContext: () => any() }; } };
  globalThis.Path2D = class { constructor() { return any(); } };
  try {
    for (const tank of [TANKS[0], TANKS[7]]) {
      const s = { tank, in: waterOf(tank), sprites: new Map(), fish: [] };
      made = 0;
      setFish(s, Array(tank.fish).fill('daemuneo'), (k) => k, () => 300);
      const ids = new Set(s.fish.map((f) => `${f.key}|${f.where}|${f.L}`));
      assert.equal(made, ids.size * 5, `${tank.key} 찍은 캔버스 ${made} · 모습 ${ids.size}`); // 꼬리 다섯 모습씩 한 번만
      assert.equal(new Set(s.fish.map((f) => f.spr)).size, ids.size);
      made = 0;
      setFish(s, Array(tank.fish).fill('daemuneo'), (k) => k, () => 300);
      assert.equal(made, 0); // 같은 수조를 다시 그려도 새로 안 찍는다
    }
    const tank = TANKS[7];
    const w = waterOf(tank);
    const cm = { pirami: 15, daemuneo: 290, bungeo: 30, galchi: 120, munchi: 35, neopchi: 85, bass: 50, busiri: 140, chamdom: 70, jukkumi: 18 };
    const keys = [...Object.keys(cm), ...Object.keys(cm), ...Object.keys(cm)].slice(0, 32);
    const s = { tank, in: w, sprites: new Map(), fish: [] };
    setFish(s, keys, (k) => k, (k) => cm[k]);
    assert.deepEqual(s.fish.map((f) => f.L), fishPlan(keys, (k) => cm[k], tank.fish, w.iw, w.ih).map((x) => x.L)); // 화면 그림이 낚은 길이를 쓴다
    for (const f of s.fish) {
      assert.ok(f.cx - f.ax - f.L * 0.62 >= -1e-9 && f.cx + f.ax + f.L * 0.62 <= w.iw + 1e-9, `${f.key} 가로 ${f.cx} ${f.ax} ${f.L}`);
      if (!f.flat) assert.ok(f.y - f.L * 0.42 - f.bob >= 0 && f.y + f.L * 0.42 + f.bob <= w.ih * 0.88 + 1e-9, `${f.key} 세로 ${f.y} ${f.L}`);
    }
    assert.ok(s.fish.filter((f) => f.flat).every((f) => f.where === 'mid'));
  } finally {
    globalThis.document = saved.document;
    globalThis.Path2D = saved.Path2D;
  }
});

test('크기 끝 — 5 cm보다 짧아도 5 cm만큼 · 3 m보다 길어도 3 m만큼 (점이 되거나 수조를 덮지 않게)', () => {
  const tank = TANKS[7];
  const { iw, ih } = room(tank);
  const L = (cm) => fishPlan(['bungeo'], () => cm, tank.fish, iw, ih)[0].L;
  assert.equal(L(0.4), L(5));
  assert.equal(L(1000), L(300));
  assert.ok(L(5) < L(30) && L(30) < L(300));
});

test('큰 물고기도 유리 밖으로 반 넘게 나가지 않는다', () => {
  const iw = 460;
  for (const [cx, ax, half] of [[20, 120, 60], [440, 120, 60], [230, 300, 100], [230, 10, 300], [100, 0, 40]]) {
    const r = keepIn(cx, ax, half, iw);
    if (half * 2 >= iw) { assert.deepEqual(r, { cx: iw / 2, ax: 0 }); continue; }
    assert.ok(r.cx - r.ax >= half - 1e-9 && r.cx + r.ax <= iw - half + 1e-9, `${cx} ${ax} ${half} → ${r.cx} ${r.ax}`);
    assert.ok(r.ax <= ax);
  }
});

test('aquaBest — 수조에 든 종만 · 낚은 가장 긴 기록 · 기록이 0이면 그 종 길이 가운데', () => {
  const p = {
    coins: 0, items: { aq_t2: 1 },
    fishing: { dex: { bungeo: { n: 3, best: 31.5, d: '2026-11-01' }, daemuneo: { n: 1, best: 0, d: '2026-11-02' }, pirami: { n: 2, best: 14, d: '2026-11-01' } } },
    aquarium: { fish: ['bungeo', 'daemuneo', 'bungeo'], deco: [], at: 1 },
  };
  const best = aquaBest(p);
  assert.deepEqual(Object.keys(best).sort(), ['bungeo', 'daemuneo']);
  assert.equal(best.bungeo, 31.5);
  assert.equal(best.daemuneo, (SP.daemuneo.min + SP.daemuneo.max) / 2);
  assert.deepEqual(aquaBest({}), {});
});

test('화면이 낚은 길이를 그림에 넘기고 · 더 긴 걸 낚으면 다시 그린다 · 판 v400', () => {
  const view = read('js/aquaview.js');
  assert.ok(view.includes('setFish(ui.scene, a.fish, nameOf, (k) => best[k])'));
  assert.ok(/const fishKey = `\$\{a\.fish\.join\(\)\}\|\$\{a\.fish\.map\(\(k\) => best\[k\]\)\.join\(\)\}`/.test(view));
  assert.ok(read('js/version.js').includes("APP_VERSION = 'v400'"));
  assert.ok(read('sw.js').includes("CACHE_VERSION = 'v400'"));
});
