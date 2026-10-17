// 🎮 일상 행동 장면 (2026-10-18, 아버님 "이대로 해") — 방의 기기를 눌러 [📺 TV 보기]… 하면 뜨는 가까이 본 모습
// 💗는 이미 트랜잭션(homeplay.playRule)에서 끝났다 — 이 화면은 보여 주기만 한다 (✨ restshow.js와 같은 자리).
//
// 📺 TV: 켜지면 화면에 파트너 · 소식 띠가 흐르고 소식 두 줄 → 💗 · 🎮 게임: 별이 흘러오고 점수가 오르다 CLEAR! → 💗 ·
// 💻 컴퓨터: 파트너 도감 쪽이 한 줄씩 → 💗 · 🎹 피아노: 진우가 건반 여덟을 직접 누른다(시간 제한 없음) — 처음 누르면 💗, [다 쳤어요]로 닫는다
// 구형 태블릿을 생각해 **움직이는 것은 transform·opacity만**(css .pshow-…) · 화면을 누르면 건너뛰고 끝 모습으로 · 무엇이 터져도 닫힌다
import { sfx } from './sfx.js';
import { stageHtml, playLines, KEYS } from './playart.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let box = null;
let skip = false;
let running = false;
let onDone = null;
/** 💗를 이미 보였나 (🎹 피아노는 처음 누를 때 · 다른 장면은 끝에) */
let hearted = false;
let cur = null;
/** 장면을 열기 전에 초점이 있던 곳 — 닫으면 돌려준다 (Codex 91차 #3) */
let lastFocus = null;

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/** 처음 부를 때 한 번 만든다 (index.html을 고치지 않게) */
function ensureBox() {
  if (box) return box;
  box = el('div', 'pshow');
  box.hidden = true;
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-label', '함께 놀기');
  box.innerHTML = '<div class="pshow-card"><div class="pshow-slot"></div>'
    + '<p class="pshow-cap" aria-live="polite"></p><p class="pshow-tip" hidden></p>'
    + '<div class="pshow-keys" hidden></div>'
    + '<button type="button" class="btn btn-primary pshow-ok">좋아!</button></div>';
  document.body.appendChild(box);
  box.addEventListener('click', (e) => {
    if (running && !e.target.closest('.pshow-ok') && !e.target.closest('.pshow-keys')) skip = true;
  });
  box.querySelector('.pshow-ok').addEventListener('click', () => onOk());
  return box;
}

const $q = (s) => box.querySelector(s);
function say(t) { $q('.pshow-cap').textContent = t || ''; }

/** 건너뛰기를 누르면 기다리지 않고 지나간다 */
async function pause(ms) {
  for (let t = 0; t < ms; t += 60) {
    if (skip) return;
    await wait(Math.min(60, ms - t));
  }
}
/** 한 번 톡 뛰기 (같은 것을 다시 누르면 처음부터) */
function hop(node) {
  if (!node) return;
  node.classList.remove('is-hop');
  void node.offsetWidth;
  node.classList.add('is-hop');
}
/** 떠오르는 것 하나 (♪ · ⭐ · 💗) — x·y는 무대 안 % · 끝나면 지운다 */
function fly(text, x, y, cls = '') {
  const fx = $q('.pshow-fx');
  if (!fx) return;
  const s = el('span', `pshow-fly${cls ? ` ${cls}` : ''}`, text);
  s.style.left = `${x}%`;
  s.style.top = `${y}%`;
  fx.appendChild(s);
  setTimeout(() => s.remove(), 1900);
}
/** 💗 보이기 — 파트너 위로 하트 · 끝 말 (한 번만) */
function showHeart() {
  if (hearted || !cur) return;
  hearted = true;
  if (cur.o.heart && cur.o.mon) {
    const pal = $q('.pshow-pal');
    const stage = $q('.pshow-stage');
    let x = 70;
    if (pal && stage) {
      const a = pal.getBoundingClientRect();
      const b = stage.getBoundingClientRect();
      if (b.width > 0) x = ((a.left + a.width / 2 - b.left) / b.width) * 100;
    }
    fly('💗 +1', Math.max(6, Math.min(70, x - 8)), 30, 'is-heart'); // 폰 폭에서도 무대 안에 (오른쪽 끝이 잘리지 않게)
    hop(pal);
    sfx.ding();
  }
  say(cur.lines.end);
}

/** 끝 모습 — 건너뛰었으면 바로 · 장면마다 다 켜 둔다 */
function endLook(scene) {
  const stage = $q('.pshow-stage');
  if (!stage) return;
  stage.classList.add('is-on', 'is-done');
  if (scene === 'game') {
    stage.classList.add('is-clear');
    const sc = stage.querySelector('.pv-score');
    if (sc) sc.textContent = `⭐ ${cur.score}`;
  }
}

async function runTv(stage, L) {
  stage.classList.add('is-on');
  sfx.tick();
  const pal = $q('.pshow-pal');
  const me = $q('.pshow-me');
  for (const [i, line] of L.start.entries()) {
    say(line);
    await pause(300);
    hop(i % 2 ? me : pal);
    await pause(2100);
    if (skip) return;
  }
}
async function runGame(stage, L) {
  say(L.start[0]);
  stage.classList.add('is-on');
  sfx.tick();
  await pause(900);
  if (L.start[1]) say(L.start[1]);
  const sc = stage.querySelector('.pv-score');
  const pal = $q('.pshow-pal');
  const me = $q('.pshow-me');
  for (let n = 1; n <= cur.score; n++) {
    if (skip) return;
    if (sc) sc.textContent = `⭐ ${n}`;
    if (n % 3 === 0) { fly('⭐', 38 + ((n * 7) % 24), 22, 'is-star'); hop(n % 2 ? me : pal); sfx.tick(); }
    await pause(260);
  }
  stage.classList.add('is-clear');
  sfx.success();
  await pause(1200);
}
async function runPc(stage, L) {
  say(L.start[0]);
  stage.classList.add('is-on');
  sfx.tick();
  for (const line of L.start.slice(1)) {
    await pause(1100);
    if (skip) return;
    say(line);
    sfx.tick();
  }
  await pause(1500);
}

/** 🎹 건반 여덟 — 누르면 소리 · 그림의 같은 건반이 노랗게 · ♪가 떠오르고 파트너가 톡 · 처음 누르면 💗 */
function pianoKeys(stage) {
  const keys = $q('.pshow-keys');
  keys.innerHTML = '';
  const colors = ['#ff6b6b', '#ff922b', '#fcc419', '#51cf66', '#22b8cf', '#4c6ef5', '#845ef7', '#f06595'];
  KEYS.forEach((k, i) => {
    const b = el('button', 'pshow-key', k.ko);
    b.type = 'button';
    b.style.setProperty('--kc', colors[i]);
    b.setAttribute('aria-label', `${k.ko} 건반`);
    const hit = () => {
      sfx.key(k.hz);
      b.classList.add('is-hit');
      const r = stage.querySelector(`.pv-k${i}`);
      if (r) r.classList.add('is-hit');
      setTimeout(() => { b.classList.remove('is-hit'); if (r) r.classList.remove('is-hit'); }, 180);
      fly(i % 2 ? '♫' : '♪', 12 + i * 5, 18 + ((i * 13) % 14), 'is-note');
      hop($q('.pshow-pal'));
      if (!hearted) showHeart();
    };
    // 손가락·마우스는 누르는 순간(pointerdown — 빨리 울리게) · ⌨️ 키보드·보조기술(Enter·Space)은 click만 온다(detail 0) — 한 번 누르기가 두 번 울리지 않게 (Codex 91차 #3)
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); hit(); });
    b.addEventListener('click', (e) => { if (e.detail === 0) hit(); });
    keys.appendChild(b);
  });
  keys.hidden = false;
}

function onOk() {
  if (!cur) { close(); return; }
  // 🎹 한 번도 안 누르고 닫으면 💗를 보이고 잠깐 뒤에 닫는다(받은 것을 못 보고 지나가지 않게)
  if (cur.scene === 'piano' && !hearted && cur.o.heart && cur.o.mon) {
    showHeart();
    setTimeout(close, 900);
    return;
  }
  close();
}

function close() {
  if (!box) return;
  box.hidden = true;
  const back = lastFocus;
  lastFocus = null;
  if (back && back.isConnected && typeof back.focus === 'function') { try { back.focus({ preventScroll: true }); } catch { /* 옛 브라우저 */ } }
  running = false;
  cur = null;
  const keys = $q('.pshow-keys');
  if (keys) { keys.hidden = true; keys.innerHTML = ''; }
  const slot = $q('.pshow-slot');
  if (slot) slot.innerHTML = '';
  const f = onDone;
  onDone = null;
  if (typeof f === 'function') f();
}

/**
 * 장면 보이기 → Promise(닫으면 풀린다). scene = 'tv' | 'game' | 'pc' | 'piano'
 * o = { look, name, mon: { ko, url } | null, wall, floor, lv, bond, chain, heart, day }
 * 이미 떠 있으면 새로 띄우지 않고 바로 풀린다(두 번 눌러도 겹치지 않게)
 */
export function showPlay(scene, o = {}) {
  ensureBox();
  if (!box.hidden) return Promise.resolve();
  return new Promise((resolve) => {
    onDone = resolve;
    skip = false;
    hearted = false;
    const lines = playLines(scene, { mon: o.mon ? o.mon.ko : '', name: o.name, heart: !!o.heart, lv: o.lv, chain: o.chain }, o.day);
    cur = { scene, o, lines, score: 12 + ((Math.abs(Number(o.day) || 0) * 5) % 9) };
    $q('.pshow-slot').innerHTML = stageHtml(scene, { ...o, uid: 'show' });
    const tip = $q('.pshow-tip');
    tip.textContent = lines.tip;
    tip.hidden = !lines.tip;
    const ok = $q('.pshow-ok');
    ok.textContent = scene === 'piano' ? '🎹 다 쳤어요' : '좋아!';
    ok.hidden = scene !== 'piano';
    say(lines.start[0] || '');
    lastFocus = document.activeElement;
    box.hidden = false;
    running = true;
    const stage = $q('.pshow-stage');
    if (scene === 'piano') {
      stage.classList.add('is-on', 'is-done');
      pianoKeys(stage);
      running = false; // 🎹은 건너뛸 것이 없다 — 무대를 눌러도 아무 일 없음
      const first = $q('.pshow-key');
      if (first) { try { first.focus({ preventScroll: true }); } catch { /* 옛 브라우저 */ } }
      return;
    }
    const go = scene === 'tv' ? runTv : scene === 'game' ? runGame : runPc;
    (async () => {
      try {
        await pause(450);
        await go(stage, lines);
      } catch { /* 연출이 깨져도 끝 모습으로 */ }
      if (!cur) return; // 그새 닫힘
      endLook(scene);
      running = false;
      showHeart();
      ok.hidden = false;
      try { ok.focus({ preventScroll: true }); } catch { /* 옛 브라우저 */ }
    })();
  });
}

/** 집을 닫으면 장면도 닫는다 (Codex 91차 #2) — 열려 있지 않으면 아무 일 없음 */
export function closePlay() {
  if (box && !box.hidden) close();
}

export function isPlayOpen() {
  return !!box && !box.hidden;
}
