// 🎨 대여행 장면 그림·연출 (v375 · 2026-10-31 아버님 「배틀이 그림 한 번 움직이는 게 다 · 우주는 우주 같지 않다」 → 시안 정할 것 일곱 「추천대로」) — node --test tests/jrscene375.test.js
// 구역 그림 여섯(캔버스로 직접 · 그림 파일 없음) · 받침대 · 타입마다 기술 효과·소리 · 그림판은 한 화면 것만 · 「동작 줄이기」면 멈춘 그림 ·
// 정답 연출 약 1.5초(누르면 넘김) · 반격은 가볍게(빨간 번쩍임 없음) · 내 포켓몬은 좌우를 뒤집어 받침대 위에
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  SCENES, PLAT, FOE_AT, ME_AT, FX_KIND, seeded, sceneState, paintScene, platform, fxKindOf, lungesFor, createFx, travel, impact, faintStars, landDust, popRing, crownGlow, makeStage,
} from '../js/jrscene.js';
import { ZONES, TYPE_KO } from '../js/journey.js';
import { MOVE_SFX, sfx } from '../js/sfx.js';

const src = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const KINDS = ['fire', 'water', 'electric', 'grass', 'ice', 'rock', 'ghost', 'psychic', 'fairy', 'dragon', 'flying', 'normal'];

/** 진짜 캔버스처럼 까다로운 가짜 — 음수 반지름·NaN 자리·0~1 밖 색 멈춤·NaN 색 글은 오류 · save/restore 짝 · 그린 것을 적어 둔다 */
function fakeCtx() {
  const log = [];
  let depth = 0;
  const bad = (m) => { throw new Error(m); };
  const fin = (name, ...v) => { for (const x of v) if (typeof x === 'number' && !Number.isFinite(x)) bad(`${name}: ${v.join(',')}`); };
  const r1 = (v) => Math.round(v * 10) / 10;
  const grad = () => ({ addColorStop(o, c) { if (!(o >= 0 && o <= 1)) bad(`색 멈춤 ${o}`); if (typeof c !== 'string' || /NaN|undefined/.test(c)) bad(`색 ${c}`); } });
  const style = {};
  const ctx = {
    log,
    depth: () => depth,
    lineWidth: 1, globalAlpha: 1, globalCompositeOperation: 'source-over', lineCap: 'butt', lineJoin: 'miter', shadowColor: '', shadowBlur: 0, lineDashOffset: 0,
    createLinearGradient(...a) { fin('linear', ...a); return grad(); },
    createRadialGradient(x0, y0, ra, x1, y1, rb) { fin('radial', x0, y0, ra, x1, y1, rb); if (ra < 0 || rb < 0) bad(`radial 반지름 ${ra} ${rb}`); return grad(); },
    arc(x, y, r, a0, a1) { fin('arc', x, y, r, a0, a1); if (r < 0) bad(`arc 반지름 ${r}`); log.push(`a${r1(x)},${r1(y)},${r1(r)}`); },
    ellipse(x, y, rx, ry, rot, a0, a1) { fin('ellipse', x, y, rx, ry, rot, a0, a1); if (rx < 0 || ry < 0) bad(`ellipse 반지름 ${rx} ${ry}`); log.push(`e${r1(x)},${r1(y)}`); },
    fillRect(x, y, w, h) { fin('fillRect', x, y, w, h); log.push(`f${r1(x)},${r1(y)}`); },
    clearRect(...a) { fin('clearRect', ...a); log.push('clear'); },
    rect(...a) { fin('rect', ...a); },
    moveTo(x, y) { fin('moveTo', x, y); log.push(`m${r1(x)},${r1(y)}`); },
    lineTo(x, y) { fin('lineTo', x, y); },
    quadraticCurveTo(...a) { fin('quad', ...a); },
    translate(...a) { fin('translate', ...a); },
    rotate(a) { fin('rotate', a); },
    setLineDash(a) { for (const v of a) if (!(v >= 0)) bad(`점선 ${v}`); },
    beginPath() {}, closePath() {}, clip() {},
    fill() { log.push('fill'); }, stroke() { log.push('stroke'); },
    save() { depth++; }, restore() { depth--; if (depth < 0) bad('restore가 save보다 많다'); },
  };
  for (const k of ['fillStyle', 'strokeStyle']) {
    Object.defineProperty(ctx, k, { get: () => style[k], set: (v) => { if (typeof v === 'string' && /NaN|undefined/.test(v)) bad(`${k} ${v}`); style[k] = v; } });
  }
  return ctx;
}

test('🗺️ 구역 그림 여섯 — journey.ZONES와 같은 차례(key) · 받침대 색도 여섯 · 받침대 자리 = CSS 자리', () => {
  assert.deepEqual(SCENES.map((s) => s.key), ZONES.map((z) => z.key));
  assert.deepEqual(SCENES.map((s) => s.ko), ZONES.map((z) => z.ko));
  assert.equal(PLAT.length, ZONES.length);
  const css = src('css/style.css');
  assert.ok(css.includes(`.jr-stand.is-foe { left: ${FOE_AT.x * 100}%; top: ${FOE_AT.y * 100}%; }`), '상대 자리');
  assert.ok(css.includes(`.jr-stand.is-me { left: ${ME_AT.x * 100}%; top: ${ME_AT.y * 100}%; }`), '내 자리');
});

test('🖌️ 구역 그림은 어떤 크기·시각에도 깨지지 않는다(음수 반지름·NaN·save 짝) · 같은 씨앗·같은 시각이면 같은 그림 · 시간이 가면 움직인다', () => {
  const sizes = [[1, 1], [3, 2], [64, 40], [362, 260], [692, 256], [1038, 384], [1440, 900]];
  const times = [0, 0.016, 1.3, 77.7, 4321.5];
  SCENES.forEach((sc, zi) => {
    const S = sceneState(zi, 11 + zi * 31);
    for (const [w, h] of sizes) for (const t of times) {
      const c = fakeCtx();
      paintScene(c, w, h, t, zi, S);
      assert.equal(c.depth(), 0, `${sc.ko} ${w}×${h} t=${t} save/restore 짝`);
      assert.ok(c.log.length > 20, `${sc.ko}: 그린 것이 있다`);
      platform(c, w * FOE_AT.x, h * FOE_AT.y, Math.min(h * 0.36, w * 0.2), zi);
      assert.equal(c.depth(), 0);
    }
    const a = fakeCtx(), b = fakeCtx(), d = fakeCtx();
    paintScene(a, 692, 256, 3.5, zi, S);
    paintScene(b, 692, 256, 3.5, zi, sceneState(zi, 11 + zi * 31));
    paintScene(d, 692, 256, 9.5, zi, S);
    assert.deepEqual(a.log, b.log, `${sc.ko}: 같은 씨앗 → 같은 그림`);
    assert.notDeepEqual(a.log, d.log, `${sc.ko}: 6초 뒤엔 무언가 움직였다`);
  });
  assert.notDeepEqual(sceneState(0, 1), sceneState(0, 2), '씨앗이 다르면 다른 산');
  // 받침대 — 반지름이 0이거나 NaN이면 그리지 않는다(작은 화면에서 깨지지 않게)
  const c = fakeCtx();
  platform(c, 10, 10, 0, 0);
  platform(c, 10, 10, NaN, 3);
  assert.deepEqual(c.log, []);
  const s2 = seeded(5), s3 = seeded(5);
  assert.deepEqual([s2(), s2(), s2()], [s3(), s3(), s3()]);
  assert.ok([0, 1, 2, 3].every(() => { const v = s2(); return v >= 0 && v < 1; }));
});

test('✨ 타입 열여덟 → 효과 꼴 열둘 · 노말·격투만 몸으로 달려든다', () => {
  assert.deepEqual(Object.keys(FX_KIND).sort(), Object.keys(TYPE_KO).sort(), '타입 표와 같은 열여덟');
  for (const [t, v] of Object.entries(FX_KIND)) {
    assert.ok(KINDS.includes(v.k), `${t} → ${v.k}`);
    assert.equal(v.col.length, 3);
    assert.ok(v.col.every((n) => Number.isInteger(n) && n >= 0 && n <= 255), t);
  }
  assert.deepEqual([...new Set(Object.values(FX_KIND).map((v) => v.k))].sort(), [...KINDS].sort(), '꼴 열둘을 모두 쓴다');
  assert.equal(fxKindOf('없는타입'), FX_KIND.normal);
  assert.deepEqual(Object.keys(TYPE_KO).filter(lungesFor).sort(), ['fighting', 'normal']);
});

test('💥 효과 엔진 — 타입마다 날아가고 맞고(크게·작게) 3초 안에 모두 사라진다 · 그리는 동안 깨지지 않음 · 전기만 번쩍(반격엔 없음)', () => {
  const P = { x: 120, y: 300, s: 140 }, Q = { x: 460, y: 140, s: 110 };
  for (const type of Object.keys(TYPE_KO)) for (const [big, soft] of [[false, 1], [true, 1], [false, 0.55]]) {
    const fx = createFx(seeded(42));
    travel(fx, type, P, Q, 0.5, 1, soft);
    const fl = impact(fx, type, Q, 1, big, soft);
    assert.equal(fl, fxKindOf(type).k === 'electric' && soft >= 1 ? '#fff6b0' : '', `${type} 번쩍`);
    // 하늘에서 내리치는 번개는 내 기술만(크게 셋·보통 둘) — 반격엔 없음 (🔍 Codex 179차 #1)
    assert.equal(fx.bolts.length, fxKindOf(type).k === 'electric' && soft >= 1 ? (big ? 3 : 2) : 0, `${type} 번개`);
    assert.equal(fx.busy(), true, `${type}: 무언가 나왔다`);
    let peak = 0;
    for (let i = 0; i < 180; i++) {
      fx.step(1 / 60);
      peak = Math.max(peak, fx.parts.length);
      const c = fakeCtx();
      fx.draw(c);
      assert.equal(c.depth(), 0);
    }
    assert.ok(peak > 0, `${type}: 조각이 보였다`);
    assert.equal(fx.busy(), false, `${type} big=${big} soft=${soft}: 3초 뒤 남은 것 없음(끝없는 효과 없음)`);
  }
  // 나머지 연출 조각들도 사라진다
  const fx = createFx(seeded(3));
  faintStars(fx, Q, 1); landDust(fx, Q, 1, 3); landDust(fx, Q, 1, 5); popRing(fx, Q, 1); crownGlow(fx, Q, 1, 0.9);
  for (let i = 0; i < 180; i++) { fx.step(1 / 60); fx.draw(fakeCtx()); }
  assert.equal(fx.busy(), false);
});

test('⏱️ 효과 엔진 — emit은 끝 걸음에 fn(1)을 꼭 한 번 · later는 한 번 · 조각은 600개까지만 · 걸음 안에서 건 emit은 다음 걸음부터', () => {
  const fx = createFx(seeded(1));
  const ks = [];
  fx.emit(0.1, (k) => ks.push(k));
  let n = 0;
  fx.later(0.05, () => { n++; fx.emit(0.02, (k) => { if (k >= 1) n += 10; }); });
  for (let i = 0; i < 20; i++) fx.step(0.016);
  assert.equal(ks.filter((k) => k === 1).length, 1, 'fn(1)은 한 번');
  assert.ok(ks.every((k, i) => i === 0 || k >= ks[i - 1]), '진행은 늘기만');
  assert.equal(n, 11, 'later 한 번 + 그 안에서 건 emit이 끝까지');
  const many = createFx(seeded(2));
  for (let i = 0; i < 1000; i++) many.spawn({ x: 0, y: 0, life: 5 });
  assert.equal(many.parts.length, 600);
  many.clear();
  assert.equal(many.busy(), false);
});

/** requestAnimationFrame을 손으로 돌리는 가짜 창 */
function fakeWin({ reduce = false, dpr = 2 } = {}) {
  const w = {
    devicePixelRatio: dpr, cbs: [], id: 0, on: {},
    addEventListener(t, f) { (w.on[t] = w.on[t] || []).push(f); },
    fire(t) { for (const f of w.on[t] || []) f(); },
    matchMedia: (q) => ({ matches: reduce && /reduce/.test(q) }),
    requestAnimationFrame(cb) { w.id++; w.cbs.push([w.id, cb]); return w.id; },
    cancelAnimationFrame(id) { w.cbs = w.cbs.filter(([i]) => i !== id); },
  };
  w.tick = (now) => { const list = w.cbs; w.cbs = []; for (const [, cb] of list) cb(now); };
  return w;
}
const fakeCanvas = (cw = 320, ch = 200) => ({ clientWidth: cw, clientHeight: ch, width: 0, height: 0, getContext: () => fakeCtx() });

test('🎞️ 그림판 — 배경은 바로 한 장 + 초당 fps장 · 효과판은 조각이 있을 때만(+ 지우는 한 장) · 기기 배율은 1.5까지 · stop·빈 set이면 멈춤', () => {
  const win = fakeWin();
  const stage = makeStage(win);
  assert.equal(stage.reduce, false);
  const bg = fakeCanvas(320, 200), fxc = fakeCanvas(320, 200);
  let nb = 0, nf = 0;
  const fx = createFx(seeded(9));
  assert.equal(stage.set([{ cv: bg, fps: 30, draw: () => { nb++; } }, { cv: fxc, fx, draw: (c, w, h, t, dt) => { nf++; fx.step(dt); } }]), 2);
  assert.equal(nb, 1, '배경은 걸자마자 한 장(빈 판이 보이지 않게)');
  assert.equal(nf, 0);
  assert.equal(bg.width, 480, '320 × 1.5 (배율 2라도 1.5까지)');
  assert.equal(bg.height, 300);
  let now = 1000;
  for (let i = 0; i < 60; i++) { win.tick(now); now += 1000 / 60; }
  assert.ok(nb >= 28 && nb <= 33, `배경 1초 ${nb}장 ≈ 30`);
  assert.equal(nf, 1, '효과판은 처음 한 번(빈 판)뿐 — 조각이 없으면 안 그림');
  fx.spawn({ x: 1, y: 1, life: 0.1 });
  const before = nf;
  for (let i = 0; i < 30; i++) { win.tick(now); now += 1000 / 60; }
  assert.ok(nf - before >= 6 && nf - before <= 9, `조각이 사는 동안 + 지우는 한 장: ${nf - before}`);
  assert.equal(fx.busy(), false);
  assert.ok(stage.time() > 1, '시간이 흐른다');
  stage.stop();
  assert.equal(win.cbs.length, 0, '멈추면 다음 장을 부르지 않는다');
  const after = nb;
  win.tick(now);
  assert.equal(nb, after);
  assert.equal(stage.set([]), 0);
  assert.equal(win.cbs.length, 0);
  // 그리다 오류가 난 판만 멈추고 다른 판은 계속
  let ok = 0;
  stage.set([{ cv: fakeCanvas(), fps: 60, draw: () => { throw new Error('깨짐'); } }, { cv: fakeCanvas(), fps: 60, draw: () => { ok++; } }]);
  assert.equal(stage.count(), 1, '처음 장에서 깨진 판은 빠짐');
  for (let i = 0; i < 10; i++) { win.tick(now); now += 1000 / 60; }
  assert.ok(ok >= 9);
  // 2d를 못 받는 판은 걸지 않는다
  stage.stop();
  assert.equal(stage.set([{ cv: { clientWidth: 10, clientHeight: 10, getContext: () => null }, draw: () => {} }]), 0);
});

test('🐢 「동작 줄이기」 — 시간이 흐르지 않고 배경은 한 장만 · 크기가 바뀌면 다시 한 장', () => {
  const win = fakeWin({ reduce: true, dpr: 1 });
  const stage = makeStage(win);
  assert.equal(stage.reduce, true);
  const bg = fakeCanvas(300, 150);
  let nb = 0;
  stage.set([{ cv: bg, fps: 30, draw: (c, w, h, t) => { nb++; assert.equal(t, 0); } }]);
  let now = 1000;
  for (let i = 0; i < 120; i++) { win.tick(now); now += 1000 / 60; }
  assert.equal(nb, 1);
  assert.equal(stage.time(), 0);
  assert.equal(win.cbs.length, 0, '그릴 것이 없으면 다음 장을 부르지 않고 쉰다 (Codex 179차 #2)');
  bg.clientWidth = 200;
  win.fire('resize');
  assert.equal(win.cbs.length, 1, '크기가 바뀌면 깬다');
  win.fire('resize');
  assert.equal(win.cbs.length, 1, '두 번 깨워도 한 장만 부름');
  for (let i = 0; i < 40; i++) { win.tick(now); now += 1000 / 60; }
  assert.equal(nb, 2, '크기가 바뀐 뒤 한 장');
  assert.equal(bg.width, 200);
  assert.equal(win.cbs.length, 0, '다시 쉰다');
  stage.stop();
  win.fire('resize');
  assert.equal(win.cbs.length, 0, '멈춘 뒤엔 크기가 바뀌어도 안 깸');
});

test('🔊 기술 소리 열둘 — 꼴마다 있고 모르는 꼴은 노말 · 지수 줄이기를 0으로 하지 않는다(Web Audio 오류) · 세기는 0.16 아래', () => {
  assert.deepEqual(Object.keys(MOVE_SFX).sort(), [...KINDS].sort());
  const fin = (v) => { if (!Number.isFinite(v)) throw new Error(`수 ${v}`); };
  const gains = [];
  const param = (name) => ({ value: 0, setValueAtTime(v, t) { fin(v); fin(t); }, exponentialRampToValueAtTime(v, t) { fin(t); if (!(v > 0)) throw new Error(`지수 줄이기 0: ${v}`); if (name === 'gain' && v > 0.001) gains.push(v); } });
  const node = () => ({ connect: (n) => n, start(t) { fin(t); }, stop(t) { fin(t); }, frequency: param('f'), gain: param('gain'), Q: param('q'), type: '', buffer: null });
  const ac = { currentTime: 1.5, sampleRate: 8000, destination: {}, createOscillator: node, createGain: node, createBiquadFilter: node, createBufferSource: node, createBuffer: (ch, len) => ({ getChannelData: () => new Float32Array(len) }) };
  for (const k of KINDS) MOVE_SFX[k](ac);
  assert.ok(gains.length >= KINDS.length);
  assert.ok(Math.max(...gains) <= 0.16, `가장 큰 세기 ${Math.max(...gains)}`);
  assert.equal(typeof sfx.move, 'function');
  sfx.move('fire'); // 오디오가 아직 없으면 조용히
  assert.match(src('js/sfx.js'), /\(MOVE_SFX\[kind\] \|\| MOVE_SFX\.normal\)\(c\);/);
});

test('🔗 배선 — 그림판은 창마다 하나(화면이 바뀌면 바꿔 끼움 · 닫으면 멈춤) · 무대·VS·지도 · 정답 1.5초(누르면 넘김) · 오답은 그대로 2초 · 반격은 빨간 번쩍임 없이', () => {
  const v = src('js/journeyview.js');
  assert.match(v, /from '\.\/jrscene\.js';/);
  assert.match(v, /stage = makeStage\(window\);/);
  assert.match(v, /function fresh\(cur\) \{\n  ui\.run\+\+;\n  ui\.busy = false;\n  if \(stage\) stage\.set\(\[\]\);/, '새 화면마다 앞 그림판 멈춤');
  assert.match(v, /root\.hidden = true;\n  if \(stage\) stage\.stop\(\);/, '창을 닫으면 멈춤');
  // 무대 — 그림판은 화면에 붙은 뒤에 · 등장은 이 만남에서 한 번
  assert.match(v, /b\.appendChild\(art\.arena\);\n  art\.start\(\);/);
  assert.match(v, /const foeNew = ui\.metKey !== key;/);
  assert.match(v, /const meNew = foeNew \|\| ui\.meKey !== `\$\{key\}:\$\{ui\.mon\}`;/);
  assert.match(v, /ui\.enterP = calmMotion\(\) \|\| !\(foeNew \|\| meNew\) \? null :/);
  // 정답 — 약 1.5초 · 효과가 굉장하면 2.1초 · 쓰러짐 1.3초 · 모두 누르면 넘김 · 「동작 줄이기」면 예전 0.9·1.1초
  assert.match(v, /await waitTap\(r\.adv \? 2100 : 1500\);/);
  assert.match(v, /if \(art\) \{ faint\(art\); await waitTap\(1300\); \} else \{ x\.foeFig\.classList\.add\('is-down'\); await sleep\(1100\); \}/);
  assert.match(v, /play\('hit'\);\n      hpCut\(\);\n      await sleep\(900\);/);
  assert.match(v, /art\.tok\+\+;\n      hpCut\(\);/, '넘겨도 HP 칸은 맞게');
  // 오답 — 정답을 읽을 시간은 그대로(누르고 넘기지 않음) · 반격은 효과를 작게(0.55) · 번쩍임 없음
  assert.match(v, /await sleep\(r\.end === 'lost' \? 1500 : 2000\);/);
  const ctr = v.slice(v.indexOf('function counter('), v.indexOf('\n}\n', v.indexOf('function counter(')));
  assert.match(ctr, /impact\(a\.fx, foeType, Q, unitOf\(a\), false, 0\.55\);/);
  assert.doesNotMatch(ctr, /flashOn|shake\(|play\(/, '반격엔 번쩍임·흔들림·큰 소리 없음');
  // 기다림을 그림판이 붙잡지 않는다 — 효과 함수들은 promise를 돌려주지 않고 흐름은 sleep·waitTap
  assert.doesNotMatch(src('js/jrscene.js'), /new Promise/);
  // 무대 위는 동그라미 없이 · 그림이 없을 때만 동그라미 · 내 포켓몬은 좌우 뒤집기
  assert.match(v, /f\.classList\.add\('is-alt'\);/);
  const css = src('css/style.css');
  assert.match(css, /\.jr-arena \.jr-mon:not\(\.is-alt\), \.jr-vs \.jr-mon:not\(\.is-alt\) \{ border: 0; border-radius: 0; box-shadow: none; overflow: visible; background: none; \}/, '타입 색 바탕도 걷음(받침대 위에 그림만)');
  assert.match(css, /\.jr-stand\.is-me \.jr-mon img \{ transform: scaleX\(-1\); \}/);
  assert.match(css, /\.jr-pickmon\.is-in \.jr-mon \{/, '고르는 화면 동그라미는 그대로');
  // 무대 자리 이름은 jr-stand — 출발 준비의 「함께 갈 포켓몬 칸」(.jr-slot)과 겹치면 무대 그림에 흰 칸이 생기고 출발 칸이 무대 자리로 날아간다(걷기에서 찾음)
  assert.match(v, /el\('div', `jr-stand \$\{side\}\$\{extra\}`\)/);
  assert.doesNotMatch(css, /\.jr-slot \{ position: absolute/);
  assert.match(css, /\.jr-slot \{ display: grid; justify-items: center;/);
  // VS · 지도
  assert.match(v, /const vbg = artCanvas\('jr-vs-bg'\);/);
  assert.match(v, /if \(stage && stage\.set\(\[\{ cv: art, fps: 12, draw: paintMapArt \}\]\)\) wrap\.classList\.add\('has-art'\);/, '지도 칸 색은 그림이 그려질 때만 걷음');
  assert.match(css, /\.jr-mapwrap\.has-art \.jr-map > rect \{ fill: transparent; \}/);
  assert.match(v, /viewBox', '0 0 420 300'/);
  // 앱 셸 · 판
  assert.ok(src('sw.js').includes("'./js/jrscene.js'"));
  assert.ok(+(/const CACHE_VERSION = 'v(\d+)';/.exec(src('sw.js')) || [])[1] >= 375);
  // 그림 파일을 저장소에 넣지 않는다 — 장면 모듈은 밖에서 받는 것이 없다
  assert.doesNotMatch(src('js/jrscene.js'), /fetch\(|new Image|\.png|\.webp|https?:/);
});
