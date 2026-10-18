// 🤝 홈 화면 파트너 (2026-10-18, 아버님 "이대로 해") — 누구를 보일지(homePalOf) · 걷기 셈(laneX·wanderX·walkMs) · 말 · 잇기
// node --test tests/homepal.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { homePalOf, BOND_TIERS } from '../js/homeplay.js';
import { PAL_SIZE, PAL_LINES, laneX, wanderX, walkMs, mountHomePal } from '../js/homepal.js';
import { emptyProfile, cloneProfile } from '../js/db.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const pf = (extra) => cloneProfile({ ...emptyProfile(), caught: { 658: 1 }, partner: 658, ...extra });
const bond = (n, id = 658) => ({ homePlay: { days: {}, bond: { [id]: n } } });

test('🤝 누구를 보일지 — 데리고 있는 파트너의 💗가 첫 테두리(10)부터 · 단계는 테두리와 같게 · 진화 전 💗도 이어서 · 없거나 깨지면 안 보임', () => {
  assert.equal(BOND_TIERS[0], 10);
  assert.equal(homePalOf(pf(bond(9))), null, '💗 9는 아직');
  assert.deepEqual(homePalOf(pf(bond(10))), { id: 658, tier: 1 });
  assert.deepEqual(homePalOf(pf(bond(25))), { id: 658, tier: 2 });
  assert.deepEqual(homePalOf(pf(bond(50))), { id: 658, tier: 3 });
  assert.deepEqual(homePalOf(pf(bond(30, 656))), { id: 658, tier: 2 }, '개구마르 때의 💗가 개굴닌자에게');
  assert.equal(homePalOf(pf({ ...bond(30), partner: null })), null, '파트너가 없으면');
  assert.equal(homePalOf(pf({ ...bond(30), caught: {} })), null, '데리고 있지 않으면');
  assert.equal(homePalOf(pf({ homePlay: 'x' })), null);
  assert.equal(homePalOf(pf({ homePlay: { bond: { 658: '30' } } })), null, '글자 💗는 셈하지 않는다');
  assert.equal(homePalOf(null), null);
});

test('🚶 걷기 셈 — 누른 곳이 가운데로 · 길 양끝 안 · 혼자 걷기는 길 위에서 너무 가깝지 않게 · 걷는 시간은 거리에 맞게(0.25~2.4초)', () => {
  const W = 1280;
  const max = W - PAL_SIZE - 8;
  assert.equal(laneX(640, W), 640 - PAL_SIZE / 2);
  assert.equal(laneX(0, W), 8);
  assert.equal(laneX(5000, W), max);
  assert.equal(laneX(NaN, W), 8);
  assert.equal(laneX(50, 60), 8, '아주 좁아도 길 왼쪽 끝');
  for (let i = 0; i <= 20; i++) {
    const r = i / 20;
    for (const cur of [8, 300, 640, max]) {
      const x = wanderX(cur, W, r);
      assert.ok(x >= 8 && x <= max, `${cur} ${r} → ${x}`);
      assert.ok(Math.abs(x - cur) >= PAL_SIZE, `${cur} ${r} → ${x} 너무 가깝다`);
    }
  }
  assert.ok(wanderX(8, 390, 'x') >= 8);
  assert.deepEqual([walkMs(0), walkMs(260), walkMs(-260), walkMs(1e6), walkMs('x')], [250, 1000, 1000, 2400, 250]);
});

test('💬 말풍선 — 셈 말·재촉하는 말 없음 · 짧게', () => {
  assert.ok(PAL_LINES.length >= 3);
  for (const line of PAL_LINES) {
    assert.doesNotMatch(line, /\d|남음|남았|밀린|빨리|해야|안 하면/, line);
    assert.ok([...line].length <= 8, line);
  }
});

test('🔌 잇기 — 홈(initHome)에서 한 번 붙이고 renderHome·다시 읽기에 refresh · 과목 고르기 화면(#view-home)에만 · 움직임 줄이기 · 앱 셸', () => {
  const home = read('js/home.js');
  assert.ok(home.includes("import { mountHomePal } from './homepal.js';"));
  assert.ok(home.includes('pal = mountHomePal(view, { getPal: palNow });'));
  assert.ok(home.includes("const view = $('view-home');"));
  assert.ok(home.includes('onProfileReload(() => pal.refresh());'));
  assert.ok(home.includes('if (pal) pal.refresh();'));
  assert.ok(home.includes('const p = homePalOf(getProfileSnapshot());'));
  const hp = read('js/homepal.js');
  assert.ok(hp.includes("if (t && t.closest('.hpal')) return;"), '파트너를 누른 것은 따라가기에서 뺀다');
  assert.ok(hp.includes("t.closest('button, a, input, [role=\"button\"]')"), '파트너 밑에 단추가 있으면 단추가 먼저 (Codex 93차)');
  assert.ok(read('css/style.css').includes('pointer-events: none; cursor: pointer;'), '파트너 단추는 손가락을 받지 않는다');
  assert.ok(hp.includes("(prefers-reduced-motion: reduce)"), '움직임 줄이기면 서 있기만');
  assert.ok(hp.includes('if (view.hidden || doc.hidden) return;'), '안 보이면 멈춤');
  assert.ok(!/localStorage|indexedDB|houseDo|coins/.test(hp), '저장·보상 없음');
  const css = read('css/style.css');
  assert.ok(css.includes('.hpal { position: fixed;'));
  assert.ok(css.includes('#view-home.has-pal .storage-info { margin-bottom: 70px; }'));
  assert.ok(/\.hpal-img, \.hpal\.is-walk \.hpal-img[^{]*\{ animation: none !important; \}/.test(css));
  assert.ok(read('sw.js').includes("'./js/homepal.js'"));
});

// ───────────────────── 화면 동작 (작은 가짜 화면으로 mountHomePal을 그대로 돌린다) ─────────────────────

/** 가짜 요소 — classList · style · 자식 · 이벤트 · closest(.class)만 */
function fakeEl(tag) {
  const on = {};
  const cls = new Set();
  const el = {
    tagName: tag.toUpperCase(), children: [], style: {}, hidden: false, attrs: {}, parentNode: null, _text: '',
    classList: {
      add: (...c) => c.forEach((x) => cls.add(x)),
      remove: (...c) => c.forEach((x) => cls.delete(x)),
      contains: (c) => cls.has(c),
      toggle: (c, v) => { const yes = v === undefined ? !cls.has(c) : !!v; if (yes) cls.add(c); else cls.delete(c); return yes; },
    },
    appendChild(c) { this.children.push(c); c.parentNode = this; return c; },
    addEventListener(t, f) { (on[t] = on[t] || []).push(f); },
    fire(t, e = {}) { for (const f of on[t] || []) f({ target: this, ...e }); },
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return this.attrs[k]; },
    // '.이름' 또는 단추 고르기('button, a, input, [role="button"]')만
    closest(sel) {
      const ok = sel.startsWith('.') ? (n) => n.classList.contains(sel.slice(1)) : (n) => ['BUTTON', 'A', 'INPUT'].includes(n.tagName) || n.attrs.role === 'button';
      for (let n = this; n; n = n.parentNode) if (ok(n)) return n;
      return null;
    },
    click() { this.fire('click'); },
    get offsetWidth() { return PAL_SIZE; },
    // 화면 자리 — translateX만 보고, 높이는 화면(800) 아래 60
    getBoundingClientRect() { const m = /translateX\((-?[\d.]+)px\)/.exec(this.style.transform || ''); const x = m ? Number(m[1]) : 0; return { left: x, right: x + PAL_SIZE, top: 740, bottom: 800 }; },
  };
  Object.defineProperty(el, 'className', { get: () => [...cls].join(' '), set: (v) => { cls.clear(); String(v).split(/\s+/).filter(Boolean).forEach((x) => cls.add(x)); } });
  Object.defineProperty(el, 'textContent', { get: () => el._text, set: (v) => { el._text = String(v); if (v === '') el.children = []; } });
  return el;
}
/** 붙인 것들 — 시험 끝에 모두 stop */
const LIVE = [];
function setup(pal, reduce = false) {
  const doc = { hidden: false, createElement: fakeEl };
  const view = fakeEl('section');
  view.ownerDocument = doc;
  const box = { pal, reduce };
  const win = { innerWidth: 1000, matchMedia: () => ({ matches: box.reduce }), addEventListener() {} };
  const h = mountHomePal(view, { getPal: () => box.pal, win });
  LIVE.push(h); // 시험이 중간에 실패해도 반복 타이머를 끈다 — 안 끄면 시험 프로세스가 끝나지 않는다(변이 검사가 시간 초과로 멈췄다)
  const btn = h.el.children[0];
  const bubble = h.el.children[1];
  return { view, h, btn, bubble, box };
}
const FROG = { id: 658, tier: 2, url: 'https://x/658.png', ko: '개굴닌자' };

test('🖐️ 화면 동작 — 💗가 모자라면 안 붙음 · 나오면 가운데 · 화면을 누르면 그 아래로 걷기 · 파트너 자신을 누르면 안 걷고 톡 + 말풍선 차례로 · 움직임 줄이기면 서 있기', (t) => {
  t.after(() => { for (const h of LIVE.splice(0)) h.stop(); });
  const none = setup(null);
  assert.equal(none.h.el.hidden, true);
  assert.equal(none.view.classList.contains('has-pal'), false);
  none.h.stop();

  const s = setup({ ...FROG });
  assert.equal(s.h.el.hidden, false);
  assert.ok(s.view.classList.contains('has-pal'));
  assert.ok(s.h.el.classList.contains('is-bond2'));
  assert.equal(s.h.el.style.transform, `translateX(${laneX(500, 1000)}px)`, '처음엔 화면 가운데');
  assert.equal(s.btn.getAttribute('aria-label'), '🤝 개굴닌자');
  assert.equal(s.btn.children[0].tagName, 'IMG');
  s.view.fire('pointerdown', { clientX: 10, clientY: 300 });
  const x1 = laneX(10, 1000);
  assert.equal(s.h.el.style.transform, `translateX(${x1}px)`);
  assert.match(s.h.el.style.transition, /^transform \d+ms linear$/);
  assert.ok(s.h.el.classList.contains('is-walk'));
  const at = s.h.el.style.transform;
  s.view.fire('pointerdown', { clientX: 900, clientY: 300, target: s.btn.children[0] });
  assert.equal(s.h.el.style.transform, at, '파트너 그림을 누른 것은 따라가기가 아니다');
  // 🔍 Codex 93차: 파트너 밑에 카드(단추)가 있으면 카드가 먼저 — 파트너는 톡도 안 하고 걷지도 않는다
  const card = fakeEl('button');
  s.view.appendChild(card);
  s.view.fire('pointerdown', { clientX: x1 + 30, clientY: 770, target: card });
  assert.deepEqual([s.bubble.hidden, s.h.el.style.transform], [true, at], '카드 위 파트너 — 카드가 받는다');
  // 빈 곳의 파트너를 누르면 톡 + 말풍선(차례로) · 걷지 않는다 · 왼쪽 끝이면 말풍선을 왼쪽에 붙인다
  s.view.fire('pointerdown', { clientX: x1 + 30, clientY: 770 });
  assert.deepEqual([s.bubble.hidden, s.bubble.textContent, s.h.el.style.transform], [false, PAL_LINES[0], at]);
  assert.ok(s.h.el.classList.contains('is-hop'));
  assert.ok(s.bubble.classList.contains('is-l') && !s.bubble.classList.contains('is-r'), '왼쪽 끝 말풍선');
  s.btn.click(); // ⌨️ 키보드로 누르기
  assert.equal(s.bubble.textContent, PAL_LINES[1], '말은 차례로');
  s.view.fire('pointerdown', { clientX: 990, clientY: 300 });
  s.btn.click();
  assert.ok(s.bubble.classList.contains('is-r') && !s.bubble.classList.contains('is-l'), '오른쪽 끝 말풍선');
  // 💗가 줄어 안 보이게 되면(백업을 되돌림 등) 다시 볼 때 숨는다 · 그림이 없으면 🐾
  s.box.pal = null;
  s.h.refresh();
  assert.equal(s.h.el.hidden, true);
  assert.equal(s.view.classList.contains('has-pal'), false);
  s.box.pal = { ...FROG, id: 25, url: '', ko: '피카츄', tier: 1 };
  s.h.refresh();
  assert.equal(s.btn.children[0].textContent, '🐾');
  assert.ok(s.h.el.classList.contains('is-bond1') && !s.h.el.classList.contains('is-bond2'));
  s.h.stop();

  const r = setup({ ...FROG }, true);
  const still = r.h.el.style.transform;
  r.view.fire('pointerdown', { clientX: 100 });
  assert.equal(r.h.el.style.transform, still, '움직임 줄이기면 걷지 않는다');
  r.h.stop();
});
