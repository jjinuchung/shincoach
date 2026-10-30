// 🎣 학습 낚시터 화면 (v366) — 규칙은 fishing.js(순수) · 그림은 fishart.js · 여기는 캔버스 고리·단추·문제 카드
// 한 마리: ready →(🎯 던지기 문제) cast → wait(🍚 밑밥 문제) → nibble → bite(톡) →(🎣 바늘 걸기 문제) fight(💪 표시점 문제) → net(🥅 문제) → result
// 문제 카드가 떠 있는 동안은 게임 시계(gclock)가 멈춘다 — 물고기도 숨을 고른다(시간 제한 없음 · 아버님 기본안 「이대로」)
// 하루 시간은 진짜 시계로 센다(화면이 보이고 2분 안에 손을 댄 때만) — 다 쓰면 걸린 물고기까지 낚고 「오늘 낚시 끝」
// host(부르는 쪽)가 주는 것: look·partnerUrl·shares·ask(subj, seed)·usedSec·dayMin·bonusMin·okToday·dex · 알림 onAnswer·onTime·onCatch·onClose
// 성능: 안 움직이는 층은 따로 한 장(하늘이 조금 바뀔 때만 다시) · 화면 배율 2배까지 · 느리면 저절로 가벼운 그림 · 화면이 숨으면 멈춤
import {
  STARS, SPOTS, FIGHT, speciesOf, castSpot, openSpots, rollFish, fightStart, fightStep, fightAnswer, netAnswer,
  pickSubject, askOrder, activeStep, dayLeftSec, weightText, BADGE_KO,
} from './fishing.js';
import { SCENE_W, SCENE_H, WATER_Y, DOCK_Y, DOCK_X, spotX, bottomY, drawFish, paintStatic, drawWaterFx, drawFloat, drawRings, drawDrops, drawRod, drawLine, drawNet } from './fishart.js';
import { avatarSvg } from './avatarart.js';
import { sfx, unlock, vibrate } from './sfx.js';

const STAGE = {
  cast: '🎯 힘껏 던지기',
  chum: '🍚 밑밥 던지기',
  hook: '🎣 바늘 걸기',
  fight: '💪 힘껏 당기기',
  net: '🥅 뜰채로 뜨기',
};
const SPOT_EMOJI = { shore: '🏞️', weed: '🌿', deep: '🌊' }; // 🪨는 옛 기기 글꼴에 없어 네모로 보인다
const HAND = { x: 132, y: 146 }; // 낚싯대 손잡이 (캐릭터 손)
const ME = { x: 62, y: 86, w: 82, h: 100 }; // 캐릭터 자리(가상 좌표)
const PAL = { x: 158, y: 128, s: 62 }; // 파트너 자리

let root = null;
let ui = null;

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

function build() {
  root = el('div', 'lk');
  root.id = 'lk-lake';
  root.hidden = true;
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', '학습 낚시터');
  root.innerHTML = `
    <canvas class="lk-cv" aria-hidden="true"></canvas>
    <div class="lk-top">
      <span class="lk-spot" hidden></span>
      <span class="lk-dist" hidden></span>
      <button type="button" class="lk-x" aria-label="집으로 — 오늘 낚시 그만">✕</button>
    </div>
    <div class="lk-toast" role="status" hidden></div>
    <div class="lk-act">
      <svg class="lk-gauge" viewBox="-112 -112 224 124" aria-hidden="true" hidden>
        <path class="lk-g-bg" d="M -96 0 A 96 96 0 0 1 96 0"/>
        <path class="lk-g-fill" d="M -96 0 A 96 96 0 0 1 96 0"/>
        <text class="lk-g-label" x="0" y="-104" text-anchor="middle">장력</text>
      </svg>
      <button type="button" class="lk-btn">🎣 던지기</button>
    </div>
    <div class="lk-card" hidden>
      <div class="lk-card-head"><span class="lk-stage"></span><span class="lk-subj"></span></div>
      <div class="lk-q"></div>
      <div class="lk-choices"></div>
    </div>
    <div class="lk-res" hidden></div>`;
  document.body.appendChild(root);
  root.querySelector('.lk-x').addEventListener('click', () => closeLake());
  const btn = root.querySelector('.lk-btn');
  const down = (e) => { e.preventDefault(); touch(); try { unlock(); } catch { /* 소리 없이 */ } if (ui) { ui.hold = true; act(); } };
  const up = () => { if (ui) ui.hold = false; };
  btn.addEventListener('pointerdown', down);
  btn.addEventListener('pointerup', up);
  btn.addEventListener('pointercancel', up);
  btn.addEventListener('pointerleave', up);
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
  root.addEventListener('pointerdown', touch, { passive: true });
  window.addEventListener('pointerup', up);
  window.addEventListener('keydown', (e) => {
    if (!ui || root.hidden) return;
    if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) { touch(); ui.hold = true; act(); } }
    const n = Number(e.key);
    if (n >= 1 && n <= 4) { const b = root.querySelectorAll('.lk-choice')[n - 1]; if (b && !b.disabled) b.click(); }
  });
  window.addEventListener('keyup', (e) => { if (e.code === 'Space' && ui) ui.hold = false; });
  window.addEventListener('resize', () => { if (ui) ui.sized = false; });
  document.addEventListener('visibilitychange', () => { if (ui) ui.last = 0; });
}
const q$ = (s) => root.querySelector(s);
function touch() { if (ui) ui.touchAt = performance.now(); }

/** 🎣 낚시터 열기 — host는 위 머리말 */
export function openLake(host) {
  if (!root) build();
  if (ui) closeLake(true);
  const h = host || {};
  ui = {
    host: h,
    st: 'ready',
    gclock: 0, // 게임 시계(ms) — 문제 카드가 떠 있으면 멈춤
    paused: false,
    hold: false,
    last: 0,
    touchAt: performance.now(),
    used: Math.max(0, Number(h.usedSec) || 0) * 1000, // 오늘 쓴 낚시 ms
    savedUsed: Math.max(0, Number(h.usedSec) || 0),
    okToday: Math.max(0, Number(h.okToday) || 0),
    streak: 0,
    recent: [],
    seed: (Date.now() >>> 0) ^ 0x5eed,
    spot: SPOTS[0],
    float: null, // { x, sink, from, to, at, dur } 던지는 중이면 날아감
    rings: [],
    drops: [],
    shadows: [],
    chum: 0,
    chumLeft: 0,
    timers: [],
    fish: null,
    fs: null,
    netLeft: 0,
    netTotal: 1,
    netPos: 3,
    caught: [],
    dragTold: false,
    frameEma: 16,
    lite: false,
    slowFor: 0,
    reduce: !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches),
    sized: false,
    skyStep: -1,
    me: null,
    pal: null,
    palJump: 0,
    raf: 0,
    done: false,
  };
  root.hidden = false;
  loadPeople(h);
  setBtn('🎣 던지기');
  q$('.lk-card').hidden = true;
  q$('.lk-res').hidden = true;
  q$('.lk-spot').hidden = true;
  q$('.lk-dist').hidden = true;
  q$('.lk-gauge').hidden = true;
  if (leftSec() <= 0) dayEnd();
  else toast(h.firstToday ? '🌅 저수지에 왔어요! 🎣 던지기를 눌러요' : '🎣 던지기를 눌러요');
  ui.raf = requestAnimationFrame(loop);
}
/** 닫기 — 오늘 쓴 시간을 알리고 멈춘다 */
export function closeLake(quiet) {
  if (!ui) return;
  cancelAnimationFrame(ui.raf);
  ui.timers.forEach(clearTimeout);
  saveTime(true);
  const h = ui.host;
  ui.done = true;
  ui = null;
  if (root) { root.hidden = true; root.classList.remove('is-q'); q$('.lk-card').hidden = true; }
  if (!quiet) { try { h.onClose && h.onClose(); } catch { /* 무시 */ } }
}
export function isLakeOpen() {
  return !!root && !root.hidden;
}

// ───────────── 사람 그림 ─────────────

function loadPeople(h) {
  const me = ui;
  const toCanvas = (img, w, hgt) => {
    const c = document.createElement('canvas');
    const k = Math.min(2, window.devicePixelRatio || 1) * 2;
    c.width = Math.round(w * k); c.height = Math.round(hgt * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c;
  };
  if (h.look) {
    const img = new Image();
    img.onload = () => { if (ui === me) ui.me = toCanvas(img, ME.w, ME.h); };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(avatarSvg(h.look, { uid: 'lk', shadow: false }))}`;
  }
  if (h.partnerUrl) {
    const img = new Image();
    img.onload = () => { if (ui === me) ui.pal = img; };
    img.src = h.partnerUrl;
  }
}

// ───────────── 단추 · 알림 ─────────────

function setBtn(text, cls = '') {
  const b = q$('.lk-btn');
  b.textContent = text;
  b.className = `lk-btn${cls ? ` ${cls}` : ''}`;
}
let toastTimer = 0;
function toast(text, ms = 2200) {
  const t = q$('.lk-toast');
  t.textContent = text;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}
/** 게임 시계로 기다리기 — 문제 카드가 떠 있으면 시간이 안 감 */
function after(ms, fn) {
  const me = ui;
  const at = ui.gclock + ms;
  ui.timers.push({ at, fn, me });
}
function runTimers() {
  const due = ui.timers.filter((t) => t.at <= ui.gclock);
  if (!due.length) return;
  ui.timers = ui.timers.filter((t) => t.at > ui.gclock);
  for (const t of due) if (t.me === ui) t.fn();
}
function leftSec() {
  return dayLeftSec(ui.used / 1000, ui.host.dayMin, ui.host.bonusMin);
}
function saveTime(force) {
  if (!ui) return;
  const sec = Math.floor(ui.used / 1000);
  if (force || sec - ui.savedUsed >= 5) {
    ui.savedUsed = sec;
    try { ui.host.onTime && ui.host.onTime(sec); } catch { /* 무시 */ }
  }
}

// ───────────── 문제 ─────────────

function nextSeed() {
  ui.seed = (Math.imul(ui.seed ^ (ui.seed >>> 13), 0x5bd1e995) + 0x9e3779b9) >>> 0;
  return ui.seed;
}
/** 문제 하나 내고 답을 기다린다 → true(맞힘) | false · 낼 문제가 하나도 없으면 null */
function ask(stage) {
  const me = ui;
  const h = ui.host;
  const shares = h.shares || {};
  let subj = pickSubject(shares, ui.recent);
  const order = askOrder(shares, ui.recent, subj);
  let q = null;
  for (const s of order) {
    if (!s) continue;
    try { q = h.ask ? h.ask(s, nextSeed()) : null; } catch { q = null; }
    if (q && Array.isArray(q.choices) && q.choices.length >= 2 && q.choices.filter((c) => c.ok).length === 1) { subj = s; break; }
    q = null;
  }
  if (!q) return Promise.resolve(null);
  try { if (/[?&]nosw=1/.test(location.search)) window.__lakeQ = q; } catch { /* 무시 */ } // 헤드리스 시험용 (🎒 대여행 devQ와 같은 꼴)
  ui.recent.push(subj);
  if (ui.recent.length > 6) ui.recent.shift();
  ui.paused = true;
  ui.hold = false;
  const card = q$('.lk-card');
  q$('.lk-stage').textContent = STAGE[stage] || '';
  q$('.lk-subj').textContent = q.label || '';
  const qBox = q$('.lk-q');
  qBox.innerHTML = '';
  // 문제 꼴은 🎒 대여행과 같다 — 수학 qNode · 영어 word(🔊) · 국어·논술 q
  if (typeof q.qNode === 'function') qBox.appendChild(q.qNode());
  else if (q.word) {
    qBox.appendChild(el('span', 'lk-word', q.word));
    qBox.appendChild(document.createTextNode(' 의 뜻은?'));
    if (typeof h.say === 'function') {
      const hb = el('button', 'lk-hear', '🔊');
      hb.type = 'button';
      hb.setAttribute('aria-label', '다시 듣기');
      hb.addEventListener('click', () => { try { h.say(q.word); } catch { /* 무시 */ } });
      qBox.appendChild(hb);
      try { h.say(q.word); } catch { /* 무시 */ }
    }
  } else qBox.textContent = q.q || q.text || '';
  const box = q$('.lk-choices');
  box.innerHTML = '';
  card.hidden = false;
  root.classList.add('is-q');
  return new Promise((resolve) => {
    let picked = false;
    q.choices.forEach((c, i) => {
      const b = el('button', 'lk-choice');
      b.type = 'button';
      if (typeof c.node === 'function') b.appendChild(c.node()); else b.textContent = c.text;
      b.setAttribute('aria-label', `${i + 1}번 ${c.text}`);
      b.addEventListener('click', () => {
        if (picked || ui !== me) return;
        picked = true;
        box.querySelectorAll('button').forEach((x) => { x.disabled = true; });
        const ok = !!c.ok;
        b.classList.add(ok ? 'is-ok' : 'is-no');
        if (!ok) box.querySelectorAll('button')[q.choices.findIndex((x) => x.ok)].classList.add('is-ans');
        try { (ok ? sfx.ding : sfx.wrong)(); } catch { /* 무시 */ }
        if (ok) { ui.okToday += 1; ui.streak += 1; ui.palJump = performance.now(); } else ui.streak = 0;
        try { h.onAnswer && h.onAnswer(subj, ok, stage); } catch { /* 무시 */ }
        setTimeout(() => {
          if (ui !== me) return;
          card.hidden = true;
          root.classList.remove('is-q');
          ui.paused = false;
          resolve(ok);
        }, ok ? 800 : 1500);
      });
      box.appendChild(b);
    });
  });
}

// ───────────── 한 마리 차례 ─────────────

/** 단추를 누른 순간 — 지금 단계에 따라 */
function act() {
  if (!ui || ui.paused || ui.busy) return;
  if (ui.st === 'ready') startCast();
  else if (ui.st === 'wait' || ui.st === 'nibble') toast('아직이에요 — 찌가 쏙 들어갈 때 눌러요', 1600);
  else if (ui.st === 'bite') hookSet();
}
async function startCast() {
  if (leftSec() <= 0) { dayEnd(); return; }
  const me = ui;
  ui.busy = true;
  const before = openSpots(ui.okToday);
  const ok = await ask('cast');
  if (ui !== me) return;
  ui.busy = false;
  const opened = openSpots(ui.okToday);
  if (opened > before) toast(opened === 2 ? '🌿 수초 밭이 열렸어요! 맞히고 던지면 더 멀리 가요' : '🌊 깊은 곳이 열렸어요! 큰 물고기가 살아요', 2800);
  ui.spot = castSpot(ok !== false, ui.okToday);
  const sp = q$('.lk-spot');
  sp.textContent = `${SPOT_EMOJI[ui.spot.key]} ${ui.spot.ko}`;
  sp.hidden = false;
  ui.st = 'cast';
  setBtn('🎣 챔질!', 'is-wait');
  try { sfx.whoosh(); } catch { /* 무시 */ }
  const tx = spotX(ui.spot.m);
  ui.float = { x: tx, sink: 0, fly: { at: performance.now(), dur: 850, tx } };
  ui.shadows = [];
  ui.chum = 0;
  ui.chumLeft = ui.spot.chum;
  ui.fish = null;
  ui.dragTold = false;
  after(900, () => {
    ui.float.fly = null;
    ring(tx, false);
    splash(tx, WATER_Y, 6);
    try { sfx.plop(); } catch { /* 무시 */ }
    ui.st = 'wait';
    addShadow(false);
    after(1600, chumStep);
  });
}
async function chumStep() {
  if (ui.st !== 'wait') return;
  if (ui.chumLeft <= 0) { ui.st = 'nibble'; nibble(); return; }
  const me = ui;
  const ok = await ask('chum');
  if (ui !== me) return;
  ui.chumLeft -= 1;
  if (ok) { ui.chum += 1; addShadow(true); toast('🍚 밑밥에 더 큰 물고기가 모여요', 1600); }
  after(ok ? 1800 : 1200, chumStep);
}
function nibble() {
  // 속임수 떨림 몇 번 → 쏙
  const n = 1 + Math.floor(Math.random() * 3);
  let t = 300;
  for (let i = 0; i < n; i++) { t += 500 + Math.random() * 700; after(t, () => { if (ui.st === 'nibble') { ui.float.twitch = ui.gclock; ring(ui.float.x, false); } }); }
  after(t + 600 + Math.random() * 900, bite);
}
function bite() {
  if (ui.st !== 'nibble') return;
  if (!ui.fish) ui.fish = rollFish(ui.spot, ui.chum, ui.streak);
  ui.st = 'bite';
  ui.biteAt = ui.gclock;
  ui.float.sink = 1;
  ring(ui.float.x, true);
  setBtn('🎣 챔질!', 'is-bite');
  try { sfx.splash(); vibrate(60); } catch { /* 무시 */ }
  after(1600, () => {
    if (ui.st !== 'bite') return;
    ui.st = 'nibble';
    ui.float.sink = 0;
    setBtn('🎣 챔질!', 'is-wait');
    toast('앗, 놓쳤어요 — 다시 입질이 와요', 1600);
    nibble();
  });
}
async function hookSet() {
  const me = ui;
  ui.st = 'hookq';
  ui.busy = true;
  setBtn('🎣 …', 'is-wait');
  try { sfx.hit(); } catch { /* 무시 */ }
  const ok = await ask('hook');
  if (ui !== me) return;
  ui.busy = false;
  const deep = ok !== false;
  ui.fs = fightStart(ui.fish, ui.spot.m, deep);
  toast(deep ? '🎣 바늘이 깊이 걸렸어요! 꾹 감아요' : '🎣 살짝 걸렸어요 — 천천히 감아요', 2000);
  ui.st = 'fight';
  ui.float.sink = 1;
  setBtn('🌀 꾹 감기', 'is-reel');
  q$('.lk-gauge').hidden = false;
  q$('.lk-dist').hidden = false;
  ui.reelTick = 0;
}
async function onMark() {
  const me = ui;
  ui.busy = true;
  const ok = await ask('fight');
  if (ui !== me) return;
  ui.busy = false;
  ui.fs = fightAnswer(ui.fs, ok !== false);
  if (ok) { toast('💪 확 끌어왔어요!', 1300); splash(fishXY().x, WATER_Y, 5); } else toast('물고기가 조금 달아났어요 — 다시 감아요', 1500);
}
function toNet() {
  ui.st = 'net';
  ui.netTotal = STARS[ui.fish.star].net;
  ui.netLeft = ui.netTotal;
  ui.netPos = FIGHT.netM;
  ui.netPosDraw = FIGHT.netM;
  q$('.lk-gauge').hidden = true;
  setBtn('🥅 뜰채', 'is-wait');
  toast('🥅 뜰채를 대요! 문제를 맞히면 다가와요', 2000);
  after(900, netStep);
}
async function netStep() {
  if (ui.st !== 'net') return;
  const me = ui;
  ui.busy = true;
  const ok = await ask('net');
  if (ui !== me) return;
  ui.busy = false;
  ui.netLeft = netAnswer(ui.netLeft, ok !== false);
  ui.netPos = (FIGHT.netM * ui.netLeft) / ui.netTotal;
  if (!ok) { splash(fishXY().x, WATER_Y, 8); try { sfx.splash(); } catch { /* 무시 */ } toast('첨벙! 물고기가 버텨요', 1300); }
  if (ui.netLeft <= 0) { ui.st = 'scoop'; ui.scoopAt = ui.gclock; after(1100, landed); return; }
  after(ok ? 700 : 900, netStep);
}
async function landed() {
  ui.st = 'result';
  q$('.lk-dist').hidden = true;
  ui.float = null; // 뜬 물고기와 함께 찌도 거둠
  await keepFish(ui.fish);
}
/** 도감에 적기 — 저장된 뒤에만 「낚았다」 카드 · 못 적으면 물고기는 뜰채에 둔 채 「🔁 다시 적기」(Codex 170차 — 잡았다고 보이는데 도감·💰가 조용히 사라지던 것) */
async function keepFish(f) {
  const me = ui;
  const h = ui.host;
  let info = null;
  try { info = h.onCatch ? await h.onCatch(f) : { ok: true, first: false, best: false, coins: 0 }; } catch { info = null; }
  if (ui !== me) return;
  if (!info || info.ok === false) { keepFailed(f); return; }
  ui.palJump = performance.now();
  try { sfx.success(); } catch { /* 무시 */ }
  ui.caught.push(f);
  showResult(f, info);
}
function keepFailed(f) {
  const box = q$('.lk-res');
  box.innerHTML = '';
  const card = el('div', 'lk-res-card');
  card.appendChild(el('div', 'lk-res-name', '📖 도감에 못 적었어요'));
  card.appendChild(el('p', 'lk-res-say', `🐟 ${speciesOf(f.key).ko} — 물고기는 뜰채에 그대로 있어요. 다시 적어 볼까요?`));
  const again = el('button', 'lk-res-btn', '🔁 다시 적기');
  again.type = 'button';
  again.addEventListener('click', () => {
    if (again.disabled) return;
    again.disabled = true;
    again.textContent = '적는 중…';
    keepFish(f).catch(() => {});
  });
  card.appendChild(again);
  const off = el('button', 'lk-res-sub', '놓아주기');
  off.type = 'button';
  off.addEventListener('click', () => {
    box.hidden = true;
    resetFish();
    if (leftSec() <= 0) dayEnd();
  });
  card.appendChild(off);
  box.appendChild(card);
  box.hidden = false;
  again.focus();
}
function showResult(f, info) {
  const sp = speciesOf(f.key);
  const box = q$('.lk-res');
  box.innerHTML = '';
  const card = el('div', 'lk-res-card');
  const cv = el('canvas', 'lk-res-fish');
  card.appendChild(cv);
  card.appendChild(el('div', 'lk-res-name', `${sp.ko} ${'★'.repeat(sp.star)}`));
  card.appendChild(el('div', 'lk-res-size', `${f.cm.toFixed(1)}cm · ${weightText(f.g)}`));
  const chips = el('div', 'lk-res-chips');
  for (const b of f.badges) chips.appendChild(el('span', 'lk-chip is-gold', BADGE_KO[b]));
  if (info.first) chips.appendChild(el('span', 'lk-chip is-new', '📖 도감에 새로'));
  else if (info.best) chips.appendChild(el('span', 'lk-chip is-new', '📏 새 기록'));
  if (info.coins > 0) chips.appendChild(el('span', 'lk-chip is-gold', `💰 +${info.coins}`));
  if (sp.alien) chips.appendChild(el('span', 'lk-chip', '외래종'));
  if (chips.childNodes.length) card.appendChild(chips);
  const again = el('button', 'lk-res-btn', leftSec() > 0 ? '🎣 다시 던지기' : '🌇 오늘 낚시 끝');
  again.type = 'button';
  again.addEventListener('click', () => {
    box.hidden = true;
    resetFish();
    if (leftSec() <= 0) dayEnd();
  });
  card.appendChild(again);
  box.appendChild(card);
  box.hidden = false;
  // 큰 그림
  const w = 300;
  const hgt = Math.round(w * Math.max(0.36, Math.min(0.6, (sp.key === 'jangeo' ? 0.2 : 0.5))));
  const k = Math.min(2, window.devicePixelRatio || 1);
  cv.width = w * k; cv.height = hgt * k;
  cv.style.width = `${w}px`; cv.style.height = `${hgt}px`;
  const g = cv.getContext('2d');
  g.scale(k, k);
  drawFish(g, f.key, w / 2, hgt / 2, w * 0.86, { wag: 0.08 });
  again.focus();
}
function resetFish() {
  ui.st = 'ready';
  ui.fish = null;
  ui.fs = null;
  ui.float = null;
  ui.shadows = [];
  q$('.lk-dist').hidden = true;
  q$('.lk-gauge').hidden = true;
  setBtn('🎣 던지기');
}
function dayEnd() {
  ui.st = 'end';
  saveTime(true);
  q$('.lk-card').hidden = true;
  const box = q$('.lk-res');
  box.innerHTML = '';
  const card = el('div', 'lk-res-card is-end');
  card.appendChild(el('div', 'lk-res-name', '🌇 해가 졌어요'));
  card.appendChild(el('p', 'lk-res-say', '오늘 낚시는 여기까지! 내일 또 와요.'));
  if (ui.caught.length) {
    const list = el('ul', 'lk-end-list');
    for (const f of ui.caught) list.appendChild(el('li', '', `${speciesOf(f.key).ko} ${f.cm.toFixed(1)}cm`));
    card.appendChild(list);
  }
  const home = el('button', 'lk-res-btn', '🏠 집으로');
  home.type = 'button';
  home.addEventListener('click', () => closeLake());
  card.appendChild(home);
  box.appendChild(card);
  box.hidden = false;
  setBtn('🌇', 'is-wait');
}

// ───────────── 물속 그림자 · 물방울 ─────────────

function addShadow(big) {
  const x = ui.float ? ui.float.x : spotX(ui.spot.m);
  const fish = rollFish(ui.spot, ui.chum, ui.streak);
  ui.shadows.push({ key: fish.key, L: Math.max(28, Math.min(130, fish.cm * 1.5)), x: x + (Math.random() < 0.5 ? -1 : 1) * (140 + Math.random() * 80), y: hookY() + (Math.random() - 0.5) * 60, ph: Math.random() * 6, big });
  if (ui.shadows.length > 4) ui.shadows.shift();
}
function hookY() {
  const x = ui.float ? ui.float.x : spotX(ui.spot.m);
  return Math.min(bottomY(x) - 46, WATER_Y + 80 + ui.spot.m * 7);
}
function ring(x, big) {
  ui.rings.push({ x, at: performance.now(), big });
  if (ui.rings.length > 8) ui.rings.shift();
}
function splash(x, y, n) {
  const now = performance.now();
  for (let i = 0; i < n; i++) ui.drops.push({ x, y, vx: (Math.random() - 0.5) * 120, vy: -60 - Math.random() * 120, at: now });
  if (ui.drops.length > 40) ui.drops.splice(0, ui.drops.length - 40);
}
/** 걸린 물고기 자리 (사투·뜰채) */
function fishXY() {
  if (ui.st === 'net' || ui.st === 'scoop' || ui.st === 'result') {
    const x = DOCK_X + 68 + (ui.netPosDraw === undefined ? FIGHT.netM : ui.netPosDraw) * 34;
    return { x, y: WATER_Y + 26 };
  }
  const s = ui.fs;
  const k = s ? Math.min(1, Math.max(0, (s.dist - FIGHT.netM) / Math.max(1, s.start - FIGHT.netM))) : 1;
  const x = Math.min(990, spotX(s ? s.dist : ui.spot.m));
  return { x, y: WATER_Y + 36 + k * (hookY() - WATER_Y - 36) };
}

// ───────────── 고리 ─────────────

function fit(cv) {
  const r = cv.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = Math.max(1, Math.round(r.width));
  const H = Math.max(1, Math.round(r.height));
  cv.width = Math.round(W * dpr);
  cv.height = Math.round(H * dpr);
  const s = Math.min(W / SCENE_W, H / SCENE_H);
  const ox = (W - SCENE_W * s) / 2;
  const oy = (H - SCENE_H * s) / 2;
  ui.view = { dpr, s, ox, oy, x0: -ox / s, x1: (W - ox) / s, y0: -oy / s, y1: (H - oy) / s };
  ui.bg = document.createElement('canvas');
  ui.bg.width = cv.width;
  ui.bg.height = cv.height;
  ui.sized = true;
  ui.skyStep = -1;
}
function paintBg() {
  const v = ui.view;
  const total = (dayLeftSec(0, ui.host.dayMin, ui.host.bonusMin) || 1200) * 1000;
  const t = Math.min(1, ui.used / total);
  const step = Math.round(t * 100);
  if (step === ui.skyStep) return;
  ui.skyStep = step;
  const g = ui.bg.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, ui.bg.width, ui.bg.height);
  g.setTransform(v.dpr * v.s, 0, 0, v.dpr * v.s, v.dpr * v.ox, v.dpr * v.oy);
  paintStatic(g, step / 100, v.x0, v.x1, v.y0, v.y1);
}

function loop(now) {
  if (!ui) return;
  const me = ui;
  ui.raf = requestAnimationFrame(loop);
  if (document.hidden) { ui.last = 0; return; }
  const dt = ui.last ? Math.min(100, now - ui.last) : 16;
  // 느린 기기 — 프레임이 길면 한 장 걸러 그리고 햇살을 끈다
  ui.frameEma = ui.frameEma * 0.92 + dt * 0.08;
  if (ui.frameEma > 26) ui.slowFor += dt; else ui.slowFor = Math.max(0, ui.slowFor - dt);
  if (!ui.lite && ui.slowFor > 2000) ui.lite = true;
  if (ui.lite && (ui.skip = !ui.skip)) return;
  ui.last = now;
  // 하루 시간 (진짜 시계)
  ui.used += activeStep(dt, now - ui.touchAt, !document.hidden);
  saveTime(false);
  // 게임 시계
  if (!ui.paused) {
    ui.gclock += dt;
    runTimers();
    if (ui !== me) return;
    if (ui.st === 'fight' && !ui.busy) {
      const { s, ev } = fightStep(ui.fs, dt / 1000, ui.hold);
      ui.fs = s;
      if (ui.hold && (ui.reelTick += dt) > 90) { ui.reelTick = 0; try { sfx.reel(); } catch { /* 무시 */ } }
      if (ev === 'drag') { try { sfx.drag(); } catch { /* 무시 */ } if (!ui.dragTold) { ui.dragTold = true; toast('지이익 — 드랙이 풀렸어요! 「!!」 땐 손을 떼요', 2400); } }
      if (ev === 'mark') onMark();
      else if (ev === 'net') toNet();
    }
  }
  if (!ui.sized) fit(q$('.lk-cv'));
  paintBg();
  draw(now);
}

function draw(now) {
  const cv = q$('.lk-cv');
  const ctx = cv.getContext('2d');
  const v = ui.view;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(ui.bg, 0, 0);
  ctx.setTransform(v.dpr * v.s, 0, 0, v.dpr * v.s, v.dpr * v.ox, v.dpr * v.oy);
  drawWaterFx(ctx, now, ui.reduce, ui.lite, v.x0, v.x1);
  const g = ui.gclock;
  const st = ui.st;
  // 물속 그림자 (기다리는 동안)
  if (st === 'wait' || st === 'nibble' || st === 'bite' || st === 'cast') {
    const hx = ui.float ? ui.float.x : 0;
    const hy = hookY();
    ui.shadows.forEach((sh, i) => {
      // 밑밥 정답이면 찌 아래로 다가온다
      const pull = st === 'wait' ? (sh.big ? 0.035 : 0.012) : st === 'nibble' || st === 'bite' ? 0.05 : 0;
      sh.x += (hx + (i % 2 ? 26 : -26) - sh.x) * pull * (ui.paused ? 0.2 : 1);
      const y = sh.y + Math.sin(g / 700 + sh.ph) * 6;
      drawFish(ctx, sh.key, sh.x, y, sh.L, { shadow: 'rgba(4,26,32,.5)', flip: sh.x < hx, wag: Math.sin(g / 180 + sh.ph) * 0.25 });
    });
  }
  // 걸린 물고기
  if (ui.fish && (st === 'fight' || st === 'net' || st === 'scoop' || st === 'hookq' || st === 'bite')) {
    const goal = st === 'net' || st === 'scoop' ? ui.netPos : null;
    ui.netPosDraw = goal === null ? FIGHT.netM : (ui.netPosDraw === undefined ? FIGHT.netM : ui.netPosDraw + (goal - ui.netPosDraw) * 0.08);
    let { x, y } = st === 'bite' || st === 'hookq' ? { x: ui.float.x, y: hookY() } : fishXY();
    const L = Math.max(30, Math.min(170, ui.fish.cm * 1.7));
    const surge = st === 'fight' && ui.fs && ui.fs.surge > 0;
    if (surge) { x += Math.sin(now / 30) * 3; }
    if (st === 'scoop') y -= Math.min(1, (g - ui.scoopAt) / 900) * 60;
    drawFish(ctx, ui.fish.key, x, y, L, { flip: true, wag: Math.sin(now / (surge ? 60 : 160)) * (surge ? 0.4 : 0.2), pitch: st === 'fight' ? -0.12 : 0 });
    if (surge) {
      ctx.fillStyle = '#ffb37a';
      ctx.font = 'bold 30px "Do Hyeon", sans-serif';
      ctx.fillText('!!', x - 8, y - L * 0.3 - 10);
    }
  }
  // 사람 · 파트너
  const jump = Math.max(0, 1 - (now - ui.palJump) / 600);
  if (ui.me) ctx.drawImage(ui.me, ME.x, ME.y, ME.w, ME.h);
  if (ui.pal) ctx.drawImage(ui.pal, PAL.x, PAL.y - Math.sin(jump * Math.PI) * 22 + Math.sin(now / 600) * 1.5, PAL.s, PAL.s);
  // 뜰채
  if (st === 'net' || st === 'scoop') drawNet(ctx, HAND.x + 10, HAND.y + 10, st === 'scoop' ? Math.max(0, 1 - (g - ui.scoopAt) / 900) : 0.75);
  // 낚싯대 · 줄 · 찌
  const f = ui.float;
  let target = { x: 600, y: WATER_Y };
  let ten = 15;
  if (f && f.fly) {
    const k = Math.min(1, (now - f.fly.at) / f.fly.dur);
    target = { x: HAND.x + 170 + (f.fly.tx - HAND.x - 170) * k, y: 24 + (WATER_Y - 24) * k - Math.sin(k * Math.PI) * 120 };
  } else if (f && (st === 'wait' || st === 'nibble' || st === 'bite' || st === 'hookq')) target = { x: f.x, y: WATER_Y };
  else if (st === 'fight' || st === 'net' || st === 'scoop') { target = fishXY(); ten = ui.fs ? ui.fs.ten : 30; }
  const tip = drawRod(ctx, HAND.x, HAND.y, target.x, target.y, st === 'fight' ? ten / 100 : 0.05);
  if (f || st === 'fight' || st === 'net' || st === 'scoop') {
    if (st === 'fight' || st === 'net' || st === 'scoop') {
      drawLine(ctx, tip.x, tip.y, target.x - 10, target.y, ten);
    } else {
      drawLine(ctx, tip.x, tip.y, target.x, target.y - 30, 15);
      if (!f.fly) {
        // 찌 아래 목줄 · 미끼
        const hy = hookY();
        ctx.strokeStyle = 'rgba(230,240,240,.45)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(f.x, WATER_Y + 4); ctx.lineTo(f.x, hy); ctx.stroke();
        ctx.fillStyle = '#d98a5c';
        ctx.beginPath(); ctx.arc(f.x, hy + 3, 3.5, 0, Math.PI * 2); ctx.fill();
        const tw = f.twitch && g - f.twitch < 180 ? 0.35 : 0;
        drawFloat(ctx, f.x, Math.max(f.sink || 0, tw), now, ui.reduce);
      } else {
        // 날아가는 찌
        ctx.fillStyle = '#e8481a';
        ctx.beginPath(); ctx.arc(target.x, target.y - 30, 5, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  drawRings(ctx, ui.rings, now);
  drawDrops(ctx, ui.drops, now);
  // 장력 · 거리 글
  if (st === 'fight' && ui.fs) {
    const fill = q$('.lk-g-fill');
    const k = Math.min(1, ui.fs.ten / 100);
    fill.style.strokeDasharray = `${(k * 301.6).toFixed(1)} 400`;
    fill.setAttribute('class', `lk-g-fill${k > 0.85 ? ' is-red' : k > 0.6 ? ' is-amber' : ''}${ui.fs.surge > 0 ? ' is-surge' : ''}`);
    q$('.lk-dist').textContent = `남은 거리 ${Math.max(0, ui.fs.dist - FIGHT.netM).toFixed(1)}m`;
  } else if (st === 'net') q$('.lk-dist').textContent = `뜰채까지 ${Math.max(0, ui.netPosDraw).toFixed(1)}m`;
}
