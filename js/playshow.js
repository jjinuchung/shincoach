// 🎮 일상 행동 장면 (2026-10-18, 아버님 "이대로 해") — 방의 기기를 눌러 [📺 TV 보기]… 하면 뜨는 가까이 본 모습
// 💗는 이미 트랜잭션(homeplay.playRule)에서 끝났다 — 이 화면은 보여 주기만 한다 (✨ restshow.js와 같은 자리).
//
// 📺 TV: 켜지면 화면에 파트너 · 소식 띠가 흐르고 소식 두 줄 → 💗 · 🎮 게임: 별이 흘러오고 점수가 오르다 CLEAR! → 💗 ·
// 💻 컴퓨터: 파트너 도감 쪽이 한 줄씩 → 💗 · 🍚 밥 먹기(③ 가구 더하기): 김이 나고 밥이 줄며 "냠" → 💗 · 🎹 피아노: 진우가 건반 여덟을 직접 누른다(시간 제한 없음) — 처음 누르면 💗, [다 쳤어요]로 닫는다
// 🛏️ 가구 놀기(v365): 😴 낮잠 · 🛋️ 쉬기 · 🧸 인형 놀이 · 📖 그림책 · 🔭 창밖 · 🧩 장난감은 보기만 — 🤗 쓰다듬기 · 💧 물 주기는 진우가 직접(🎹처럼 [다 했어요]로 닫음 · 세 번이면 다 됨)
// 구형 태블릿을 생각해 **움직이는 것은 transform·opacity만**(css .pshow-…) · 화면을 누르면 건너뛰고 끝 모습으로 · 무엇이 터져도 닫힌다
import { sfx } from './sfx.js';
import { stageHtml, playLines, KEYS, HANDS_ON } from './playart.js';

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

/** 닫힌 장면의 차례를 멈추는 표 — 장면을 닫고 곧바로 다른 장면을 열어도 앞 장면의 말·끝 모습·💗가 새 장면에 섞이지 않게 (🔍 Codex 169차 #2) */
const GONE = new Error('장면 닫힘');
/** 건너뛰기를 누르면 기다리지 않고 지나간다 · 기다리는 사이 이 장면이 닫혔으면(cur가 바뀜) GONE을 던져 차례를 끝낸다 */
async function pause(ms) {
  const me = cur;
  for (let t = 0; t < ms; t += 60) {
    if (cur !== me) throw GONE;
    if (skip) return;
    await wait(Math.min(60, ms - t));
  }
  if (cur !== me) throw GONE;
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
  if (scene === 'nap') { stage.classList.remove('is-night'); stage.classList.add('is-morning'); }
  if (scene === 'sofa') stage.classList.add('is-lean');
  if (scene === 'teddy') {
    const y = stage.querySelector('.pv-tossy');
    if (y) y.classList.remove('is-fly');
    if (cur.o.mon) stage.classList.add('is-at-pal', 'is-hug');
  }
  if (scene === 'toy') stage.classList.add('is-out');
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
  // 🎮 진짜 게임 점수(v307)가 커도 12걸음(3초쯤)에 다 오른다
  const step = Math.max(1, Math.ceil(cur.score / 12));
  for (let n = 1; n <= Math.ceil(cur.score / step); n++) {
    if (skip) return;
    if (sc) sc.textContent = `⭐ ${Math.min(cur.score, n * step)}`;
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

async function runMeal(stage, L) {
  stage.classList.add('is-on');
  sfx.tick();
  const pal = $q('.pshow-pal');
  const me = $q('.pshow-me');
  for (const [i, line] of L.start.entries()) {
    say(line);
    for (let k = 0; k < 3; k++) {
      await pause(650);
      if (skip) return;
      // 파트너가 없으면 늘 나 — 빈자리에서 "냠"이 뜨지 않게 (Codex 92차)
      const who = pal && (i + k) % 2 ? pal : me;
      hop(who);
      fly('냠', who === me ? 24 : 66, 34, 'is-yum');
    }
    await pause(500);
  }
}

// ── 🛏️ 가구 놀기 (v365) — 보기만 하는 장면 여섯 ──

async function runNap(stage, L) {
  say(L.start[0]);
  stage.classList.add('is-on', 'is-night');
  sfx.tick();
  const me = $q('.pshow-me');
  const pal = $q('.pshow-pal');
  for (let k = 0; k < 6; k++) {
    await pause(600);
    if (skip) return;
    fly('💤', pal && k % 2 ? 72 : 24, 26, 'is-zzz');
  }
  await pause(500);
  if (skip) return;
  stage.classList.remove('is-night');
  stage.classList.add('is-morning');
  if (L.start[1]) say(L.start[1]);
  sfx.twinkle();
  hop(me);
  hop(pal);
  await pause(1500);
}
async function runSofa(stage, L) {
  say(L.start[0]);
  stage.classList.add('is-on');
  sfx.tick();
  const me = $q('.pshow-me');
  const pal = $q('.pshow-pal');
  await pause(1500);
  if (skip) return;
  if (L.start[1]) { say(L.start[1]); stage.classList.add('is-lean'); hop(pal || me); sfx.tick(); }
  await pause(2200);
  if (skip) return;
  if (L.start[2]) { say(L.start[2]); hop(me); sfx.tick(); await pause(2000); }
}
async function runTeddy(stage, L) {
  say(L.start[0]);
  stage.classList.add('is-on');
  const me = $q('.pshow-me');
  const pal = $q('.pshow-pal');
  const y = stage.querySelector('.pv-tossy');
  await pause(700);
  // 나 → 파트너 → 나 → 파트너 (파트너가 없으면 위로 던졌다 받기)
  for (let k = 0; k < 3; k++) {
    if (skip) return;
    if (pal) stage.classList.toggle('is-at-pal', k % 2 === 0);
    if (y) { y.classList.remove('is-fly'); void y.offsetWidth; y.classList.add('is-fly'); }
    sfx.whoosh();
    await pause(900);
    if (skip) return;
    hop(pal && k % 2 === 0 ? pal : me);
    if (k === 0 && L.start[1]) say(L.start[1]);
    await pause(250);
  }
  if (pal && L.start[2]) {
    stage.classList.add('is-hug');
    say(L.start[2]);
    fly('✨', 74, 24, 'is-star');
    sfx.success();
    await pause(1700);
  } else await pause(900);
}
async function runBook(stage, L) {
  stage.classList.add('is-on');
  const page = stage.querySelector('.pv-page');
  for (const [i, line] of L.start.entries()) {
    if (i > 0 && page) { page.classList.remove('is-flip'); page.getBoundingClientRect(); page.classList.add('is-flip'); sfx.tick(); }
    say(line);
    if (i > 0) hop(i % 2 ? $q('.pshow-pal') || $q('.pshow-me') : $q('.pshow-me'));
    await pause(i === 0 ? 1600 : 2600);
    if (skip) return;
  }
}
async function runWindow(stage, L) {
  stage.classList.add('is-on');
  say(L.start[0]);
  sfx.tick();
  await pause(1800);
  if (skip) return;
  if (L.start[1]) say(L.start[1]);
  hop($q('.pshow-pal'));
  hop($q('.pshow-me'));
  sfx.twinkle();
  await pause(2400);
}
async function runToy(stage, L) {
  say(L.start[0]);
  stage.classList.add('is-on'); // 뚜껑이 열린다
  sfx.tick();
  await pause(1000);
  if (skip) return;
  stage.classList.add('is-out');
  if (L.start[1]) say(L.start[1]);
  const me = $q('.pshow-me');
  const pal = $q('.pshow-pal');
  for (let k = 0; k < 4; k++) {
    await pause(650);
    if (skip) return;
    hop(pal && k % 2 ? pal : me);
    if (k === 3) sfx.success(); else sfx.tick();
  }
  await pause(900);
}

// ── 🛏️ 가구 놀기 (v365) — 직접 하는 장면 둘 · 세 번이면 다 됨(그 장면 끝 말 extra → 잠깐 뒤 💗/끝 말) ──

/** 다 됐다 — 한 장면에 한 번 · 그새 닫혔거나 다른 장면이면 아무 일 없음 */
function handsDone(cls) {
  const mine = cur;
  if (!mine || mine.finished) return;
  mine.finished = true;
  if (mine.lines.extra) say(mine.lines.extra);
  fly('✨', 50, 18, 'is-star');
  hop($q('.pshow-pal'));
  sfx.success();
  if (cls) $q('.pshow-stage').classList.add(cls);
  setTimeout(() => { if (cur === mine) showHeart(); }, 900);
}

/** 🤗 쓰다듬기 — 파트너(없으면 쿠션) 위를 문지르거나 톡 누르면 💗(쿠션만이면 ✨)가 퐁 · 세 번이면 다 됨 */
function petPad(stage) {
  const pad = el('button', 'pshow-petpad');
  pad.type = 'button';
  pad.setAttribute('aria-label', cur.o.mon ? `${cur.o.mon.ko || '파트너'} 쓰다듬기` : '쿠션 누르기');
  pad.appendChild(el('span', 'pshow-pethint', '👆'));
  let n = 0;
  let last = 0;
  let down = null;
  const pat = (x, y) => {
    const now = Date.now();
    if (now - last < 300) return; // 문지르기 한 번에 몇 개씩 퐁퐁 오르지 않게
    last = now;
    n += 1;
    pad.classList.add('is-touched');
    const b = stage.getBoundingClientRect();
    const px = b.width > 0 && Number.isFinite(x) ? ((x - b.left) / b.width) * 100 : 50;
    const py = b.height > 0 && Number.isFinite(y) ? ((y - b.top) / b.height) * 100 : 40;
    fly(cur && cur.o.mon ? '💗' : '✨', Math.max(4, Math.min(86, px - 3)), Math.max(4, Math.min(70, py - 12)), 'is-pat');
    hop($q('.pshow-pal'));
    sfx.tick();
    if (n === 3) handsDone('');
  };
  pad.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    down = { x: e.clientX, y: e.clientY, d: 0 };
    try { pad.setPointerCapture(e.pointerId); } catch { /* 옛 브라우저 */ }
    pat(e.clientX, e.clientY);
  });
  pad.addEventListener('pointermove', (e) => {
    if (!down) return;
    down.d += Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down.x = e.clientX;
    down.y = e.clientY;
    if (down.d >= 60) { down.d = 0; pat(e.clientX, e.clientY); }
  });
  const up = () => { down = null; };
  pad.addEventListener('pointerup', up);
  pad.addEventListener('pointercancel', up);
  pad.addEventListener('lostpointercapture', up);
  // ⌨️ 키보드·보조기술(Enter·Space)은 click만 온다(detail 0) — 🎹 건반과 같은 꼴
  pad.addEventListener('click', (e) => { if (e.detail === 0) pat(); });
  stage.appendChild(pad);
  return pad;
}

/** 💧 물 주기 — 단추를 누를 때마다 물뿌리개가 기울고 물방울 · 화분이 한 단계씩 자란다(is-g1~3) · 세 번이면 다 됨 */
function waterBtn(stage) {
  const keys = $q('.pshow-keys');
  keys.innerHTML = '';
  keys.classList.add('is-one');
  const b = el('button', 'pshow-water', '💧 물 주기');
  b.type = 'button';
  let n = 0;
  let busy = false;
  const go = () => {
    if (busy || !cur) return;
    busy = true;
    setTimeout(() => { busy = false; }, 450);
    n += 1;
    stage.classList.add('is-pour');
    setTimeout(() => stage.classList.remove('is-pour'), 420);
    const mine = cur; // 그새 닫고 다른 장면을 열었으면 물방울을 새 장면에 떨어뜨리지 않는다 (Codex 169차 #2)
    for (let i = 0; i < 3; i++) setTimeout(() => { if (cur === mine) fly('💧', 42 + i * 4, 34 + (i % 2) * 5, 'is-drop'); }, 120 + i * 90);
    sfx.tick();
    if (n <= 3) { stage.classList.remove('is-g1', 'is-g2', 'is-g3'); stage.classList.add(`is-g${n}`); }
    if (n === 3) handsDone('');
  };
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); go(); });
  b.addEventListener('click', (e) => { if (e.detail === 0) go(); });
  keys.appendChild(b);
  keys.hidden = false;
  return b;
}

/** 🎹 건반 여덟 — 누르면 소리 · 그림의 같은 건반이 노랗게 · ♪가 떠오르고 파트너가 톡 · 처음 누르면 💗 */
function pianoKeys(stage) {
  const keys = $q('.pshow-keys');
  keys.innerHTML = '';
  keys.classList.remove('is-one');
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
  // 🎹·🤗·💧 한 번도(다 되기 전에) 닫으면 💗를 보이고 잠깐 뒤에 닫는다(받은 것을 못 보고 지나가지 않게)
  if (HANDS_ON[cur.scene] && !hearted && cur.o.heart && cur.o.mon) {
    showHeart();
    const mine = cur; // 그새 닫고 다른 장면을 열었으면 새 장면을 닫지 않는다 (Codex 169차 #2)
    setTimeout(() => { if (cur === mine) close(); }, 900);
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
  if (keys) { keys.hidden = true; keys.innerHTML = ''; keys.classList.remove('is-one'); }
  const slot = $q('.pshow-slot');
  if (slot) slot.innerHTML = '';
  const f = onDone;
  onDone = null;
  if (typeof f === 'function') f();
}

/**
 * 장면 보이기 → Promise(닫으면 풀린다). scene = 'tv' | 'game' | 'pc' | 'piano'
 * scene에 'meal'(🍚 식탁)도 · 🛏️ 가구 놀기(v365) 'nap' | 'sofa' | 'pet' | 'teddy' | 'book' | 'plant' | 'flower' | 'window' | 'toy'(o.sky = 🔭 하늘) · o ={ look, name, mon: { ko, url } | null, wall, floor, lv, bond, tier, chain, heart, day, score? (🎮 미니 게임 점수 — v307) }
 * 이미 떠 있으면 새로 띄우지 않고 바로 풀린다(두 번 눌러도 겹치지 않게)
 */
export function showPlay(scene, o = {}) {
  ensureBox();
  if (!box.hidden) return Promise.resolve();
  return new Promise((resolve) => {
    onDone = resolve;
    skip = false;
    hearted = false;
    const lines = playLines(scene, { mon: o.mon ? o.mon.ko : '', name: o.name, heart: !!o.heart, lv: o.lv, chain: o.chain, sky: o.sky }, o.day);
    // 🎮 점수 — 미니 게임(v307)을 하고 왔으면 그 점수, 아니면 날마다 다른 장면용 수
    const score = Number.isSafeInteger(o.score) && o.score >= 0 ? o.score : 12 + ((Math.abs(Number(o.day) || 0) * 5) % 9);
    cur = { scene, o, lines, score };
    $q('.pshow-slot').innerHTML = stageHtml(scene, { ...o, uid: 'show' });
    const tip = $q('.pshow-tip');
    tip.textContent = lines.tip;
    tip.hidden = !lines.tip;
    const ok = $q('.pshow-ok');
    const hands = HANDS_ON[scene] || '';
    ok.textContent = hands || '좋아!';
    ok.hidden = !hands;
    say(lines.start[0] || '');
    lastFocus = document.activeElement;
    box.hidden = false;
    running = true;
    const stage = $q('.pshow-stage');
    if (hands) {
      stage.classList.add('is-on', 'is-done');
      const first = scene === 'piano' ? (pianoKeys(stage), $q('.pshow-key')) : scene === 'pet' ? petPad(stage) : waterBtn(stage);
      running = false; // 직접 하는 장면은 건너뛸 것이 없다 — 무대를 눌러도 아무 일 없음
      if (first) { try { first.focus({ preventScroll: true }); } catch { /* 옛 브라우저 */ } }
      return;
    }
    const RUN = { tv: runTv, game: runGame, meal: runMeal, nap: runNap, sofa: runSofa, teddy: runTeddy, book: runBook, window: runWindow, toy: runToy };
    const go = RUN[scene] || runPc;
    const mine = cur;
    (async () => {
      try {
        await pause(450);
        await go(stage, lines);
      } catch (e) { if (e === GONE) return; /* 연출이 깨져도 끝 모습으로 */ }
      if (cur !== mine) return; // 그새 닫힘 — 다른 장면이 열렸어도 그 장면에 끝 모습·💗를 그리지 않는다 (Codex 169차 #2)
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
