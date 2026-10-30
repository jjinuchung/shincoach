// 🎣 학습 낚시터 화면 (v366) — 규칙은 fishing.js(순수) · 그림은 fishart.js · 여기는 캔버스 고리·단추·문제 카드
// 한 마리: ready →(🎯 던지기 문제) cast → wait(🍚 밑밥 문제) → nibble → bite(톡) →(🎣 바늘 걸기 문제) fight(💪 표시점 문제) → net(🥅 문제) → result
// 문제 카드가 떠 있는 동안은 게임 시계(gclock)가 멈춘다 — 물고기도 숨을 고른다(시간 제한 없음 · 아버님 기본안 「이대로」)
// 하루 시간은 진짜 시계로 센다(화면이 보이고 2분 안에 손을 댄 때만) — 다 쓰면 걸린 물고기까지 낚고 「오늘 낚시 끝」
// host(부르는 쪽)가 주는 것: look·partnerUrl·shares·ask(subj, seed)·usedSec·dayMin·bonusMin·okToday·dex · 알림 onAnswer·onTime·onCatch·onClose
//   v367: weather(fishing.WEATHER 한 줄 — 하늘·물결·빗줄기 · 같은 별 안에서 기우는 종) · dexRows()(📖 도감 칸 — 던지기 전에만 열림 · 보는 동안 시간 멈춤)
//   문제 꼴에 tip(물음 밑 💡)·보기마다 hint(틀리면 그 실수에 맞춘 한 줄 + 「알겠어요」) — 🐟 물고기 수학이 쓴다
//   v368: place·riverOpen(🗺️ 물가 — 던지기 전에만 · 강은 열린 뒤에만) · pick({ bait, rod, glow } — 미끼 칩·낚싯대 색·✨ 야광 찌) ·
//   gear()(🎒 채비 가게 상태 { coins, owned, pick, made, river }) · buyGear(id) · onPick(want) · lookNow()(옷을 산 뒤 새 차림) · 📸 사진만 찍고 놓아주는 물고기 카드
//   gear()는 🗺️ 물가를 열 때·던지기 직전·다시 ready가 될 때 다시 읽는다(다른 창에서 사거나 강이 열려도 · Codex 172차)
//   v369: seaOpen(🌊 바다 — 강이 열린 뒤에야 🗺️·📖에 줄이 보임 · 열리면 결과 카드에 한 번 + 안전 한 줄) · 🦐 크릴은 바다가 열린 뒤 가게에 · gear().sea
// 성능: 안 움직이는 층은 따로 한 장(하늘이 조금 바뀔 때만 다시) · 화면 배율 2배까지 · 느리면 저절로 가벼운 그림 · 화면이 숨으면 멈춤
import {
  STARS, FIGHT, speciesOf, castSpot, openSpots, rollFish, fightStart, fightStep, fightAnswer, netAnswer,
  pickSubject, askOrder, activeStep, dayLeftSec, weightText, BADGE_KO, weatherTilt, nibbleExtra,
  spotsOf, PLACES, PLACE_KO, PLACE_EMOJI, RIVER_NEED, SEA_NEED, SEA_SAFE, GEAR, gearOf, baitTilt, mixTilt, weatherLine, PHOTO_SAY, syncPick, josaOf,
} from './fishing.js';
import { SCENE_W, SCENE_H, WATER_Y, DOCK_Y, DOCK_X, spotX, bottomY, drawFish, paintStatic, drawWaterFx, drawRain, drawFloat, drawRings, drawDrops, drawRod, drawLine, drawNet } from './fishart.js';
import { avatarSvg } from './avatarart.js';
import { sfx, unlock, vibrate } from './sfx.js';

const STAGE = {
  cast: '🎯 힘껏 던지기',
  chum: '🍚 밑밥 던지기',
  hook: '🎣 바늘 걸기',
  fight: '💪 힘껏 당기기',
  net: '🥅 뜰채로 뜨기',
};
const SPOT_EMOJI = { shore: '🏞️', weed: '🌿', deep: '🌊', riffle: '💦', rock: '⛰️', pool: '🌊', harbor: '⚓', tetra: '🧱', offshore: '🌊' }; // 🪨는 옛 기기 글꼴에 없어 네모로 보인다 (바위 밑도 ⛰️ · 🧱 Emoji 11은 있음)
/** 둘째·셋째 자리가 열릴 때 한 줄 (낚시터마다) */
const SPOT_OPEN = {
  lake: { 2: '🌿 수초 밭이 열렸어요! 맞히고 던지면 더 멀리 가요', 3: '🌊 깊은 곳이 열렸어요! 큰 물고기가 살아요' },
  river: { 2: '⛰️ 바위 밑이 열렸어요! 맞히고 던지면 더 멀리 가요', 3: '🌊 깊은 소가 열렸어요! 큰 물고기가 살아요' },
  sea: { 2: '🧱 테트라포드가 열렸어요! 맞히고 던지면 더 멀리 가요', 3: '🌊 먼 바다가 열렸어요! 큰 물고기가 살아요' },
};
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
      <span class="lk-wx" hidden></span>
      <button type="button" class="lk-dexbtn" hidden>📖 도감</button>
      <button type="button" class="lk-topbtn lk-mapbtn" aria-expanded="false" hidden>🗺️ 물가</button>
      <button type="button" class="lk-topbtn lk-gearbtn" hidden>🎒 채비</button>
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
      <button type="button" class="lk-bait" hidden></button>
    </div>
    <div class="lk-places" role="group" aria-label="물가 고르기" hidden></div>
    <div class="lk-card" hidden>
      <div class="lk-card-head"><span class="lk-stage"></span><span class="lk-subj"></span></div>
      <div class="lk-q"></div>
      <p class="lk-tip" hidden></p>
      <div class="lk-choices"></div>
      <p class="lk-hint" hidden></p>
      <button type="button" class="lk-go" hidden>알겠어요</button>
    </div>
    <div class="lk-res" hidden></div>`;
  document.body.appendChild(root);
  root.querySelector('.lk-x').addEventListener('click', () => closeLake());
  root.querySelector('.lk-dexbtn').addEventListener('click', () => lakeDex());
  root.querySelector('.lk-mapbtn').addEventListener('click', () => togglePlaces());
  root.querySelector('.lk-gearbtn').addEventListener('click', () => lakeShop());
  root.querySelector('.lk-bait').addEventListener('click', () => cycleBait());
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
    if (!ui || root.hidden || ui.dexOpen || ui.shopOpen) return;
    const go = root.querySelector('.lk-go');
    if (go && !go.hidden && (e.code === 'Space' || e.key === 'Enter')) { e.preventDefault(); if (!e.repeat) { touch(); go.click(); } return; } // 💡 힌트의 「알겠어요」 (Codex 171차 — 게임용 Space가 막았다)
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
  closeDexView(); // 홈에서 연 📖 도감이 덮은 채로 낚시 시간이 흐르지 않게 (Codex 171차)
  closeShop();
  if (ui) closeLake(true);
  const h = host || {};
  const pk = h.pick || {};
  const riverOk = !!h.riverOpen;
  const seaOk = !!h.seaOpen;
  const place = (h.place === 'river' && riverOk) || (h.place === 'sea' && seaOk) ? h.place : 'lake';
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
    place, // 🏞️ 저수지 · 강 (v368) · 🌊 바다 (v369)
    riverOpen: riverOk,
    seaOpen: seaOk,
    pick: { bait: gearOf(pk.bait) ? pk.bait : 'worm', rod: gearOf(pk.rod) ? pk.rod : 'rod', glow: !!pk.glow },
    pendPick: {}, // 가게에서 늦게 온 미끼·낚싯대 바꿈 — 던지는 중이면 다음 ready에 (syncGear · Codex 172차)
    owned: ownedOf(h),
    spot: spotsOf(place)[0],
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
    wx: (h.weather && h.weather.key) || 'sun', // 🌦️ 오늘 날씨 (v367)
    dexOpen: false,
    dexShown: null,
    shopOpen: false, // 🎒 채비 가게 — 보는 동안 시간 멈춤 (v368)
    menuShown: '',
  };
  root.hidden = false;
  loadPeople(h);
  setBtn('🎣 던지기');
  q$('.lk-card').hidden = true;
  q$('.lk-res').hidden = true;
  q$('.lk-places').hidden = true;
  q$('.lk-spot').hidden = true;
  q$('.lk-dist').hidden = true;
  q$('.lk-gauge').hidden = true;
  const wxc = q$('.lk-wx');
  wxc.textContent = h.weather ? `${h.weather.emoji} ${h.weather.ko}` : '';
  wxc.hidden = !h.weather;
  q$('.lk-dexbtn').hidden = true;
  if (leftSec() <= 0) dayEnd();
  else {
    // 들어설 때 날씨 한 줄 → 던지기 안내
    const me = ui;
    const hi = h.firstToday ? `🌅 ${PLACE_KO[place]}에 왔어요! ` : '';
    const wl = weatherLine(h.weather, place);
    if (wl) {
      toast(`${hi}${wl}`, 3000);
      setTimeout(() => { if (ui === me && ui.st === 'ready' && !ui.dexOpen) toast('🎣 던지기를 눌러요'); }, 3200);
    } else toast(`${hi}🎣 던지기를 눌러요`);
  }
  ui.raf = requestAnimationFrame(loop);
}
/** 닫기 — 오늘 쓴 시간을 알리고 멈춘다 */
export function closeLake(quiet) {
  if (!ui) return;
  closeDexView();
  closeShop();
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

// ───────────── 📖 내 물고기 도감 (v367) ─────────────

let dexRoot = null;
let dexDone = null;
let dexKeys = false;
/** 낚시터 위 📖 단추 — 던지기 전에만 · 보는 동안 게임 시계·하루 시간 멈춤 */
function lakeDex() {
  if (!ui || ui.st !== 'ready' || ui.busy || ui.paused || typeof ui.host.dexRows !== 'function') return;
  const me = ui;
  let rows = [];
  try { rows = ui.host.dexRows() || []; } catch { rows = []; }
  ui.paused = true;
  ui.dexOpen = true;
  openDexView(rows, { onClose: () => { if (ui === me) { ui.dexOpen = false; ui.paused = false; ui.last = 0; ui.touchAt = performance.now(); } } });
}
/**
 * 도감 창 (낚시터 위 · 홈 띠 「📖 도감」 둘 다) — rows = fishing.dexRows(도감)
 * 낚은 칸: 그림 · 이름 · 별 · 가장 긴 cm · 처음 낚은 날 · 소개 한 줄 · 외래종 / 안 낚은 칸: 그림자 · ? · 만나는 자리 힌트 — 남은 수는 쓰지 않는다
 */
export function openDexView(rows, opts = {}) {
  closeDexView();
  if (!dexRoot) {
    dexRoot = el('div', 'lk-dexv');
    dexRoot.id = 'lk-dex';
    dexRoot.hidden = true;
    dexRoot.setAttribute('role', 'dialog');
    dexRoot.setAttribute('aria-modal', 'true');
    dexRoot.setAttribute('aria-label', '내 물고기 도감');
    document.body.appendChild(dexRoot);
  }
  if (!dexKeys) {
    dexKeys = true;
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && dexRoot && !dexRoot.hidden) closeDexView(); });
  }
  dexRoot.innerHTML = '';
  const head = el('div', 'lk-dex-head');
  head.appendChild(el('h2', 'lk-dex-title', '📖 내 물고기 도감'));
  const x = el('button', 'lk-dex-x', '✕');
  x.type = 'button';
  x.setAttribute('aria-label', '도감 닫기');
  x.addEventListener('click', () => closeDexView());
  head.appendChild(x);
  dexRoot.appendChild(head);
  const body = el('div', 'lk-dex-body');
  const list = Array.isArray(rows) ? rows : [];
  const homeOf = (r) => (PLACES.includes(r.home) ? r.home : 'lake');
  const got = (pl) => list.filter((r) => homeOf(r) === pl && r.caught).length;
  // 🏞️ 강·🌊 바다 쪽은 열린 뒤에만 칸을 보인다 — 그 전엔 숫자 없이 한 줄 · 바다 줄은 강이 열린 뒤에야 (v368 · v369)
  const openOk = { lake: true, river: got('river') > 0 || got('lake') >= RIVER_NEED, sea: got('sea') > 0 || got('river') >= SEA_NEED };
  for (const pl of PLACES) {
    if (!list.some((r) => homeOf(r) === pl) || (pl === 'sea' && !openOk.river)) continue;
    body.appendChild(el('h3', 'lk-dex-place', `${PLACE_EMOJI[pl]} ${PLACE_KO[pl]}`));
    if (openOk[pl]) body.appendChild(dexGrid(list.filter((r) => homeOf(r) === pl)));
    else body.appendChild(el('p', 'lk-dex-lock', '🔒 물고기를 더 만나면 길이 열려요'));
  }
  dexRoot.appendChild(body);
  dexDone = typeof opts.onClose === 'function' ? opts.onClose : null;
  dexRoot.hidden = false;
  try { x.focus(); } catch { /* 무시 */ }
}
/** 도감 칸 묶음 하나 (낚시터 하나) */
function dexGrid(rows) {
  const grid = el('div', 'lk-dex-grid');
  const k = Math.min(2, window.devicePixelRatio || 1);
  for (const r of rows) {
    const card = el('div', `lk-dex-card${r.caught ? '' : ' is-unk'}`);
    const cv = el('canvas', 'lk-dex-fish');
    cv.width = 132 * k; cv.height = 52 * k;
    cv.setAttribute('aria-hidden', 'true');
    card.appendChild(cv);
    const nm = el('div', 'lk-dex-name');
    nm.appendChild(el('span', '', r.caught ? r.ko : '?'));
    nm.appendChild(el('span', 'lk-dex-star', '★'.repeat(r.star)));
    card.appendChild(nm);
    if (r.caught) {
      card.appendChild(el('div', 'lk-dex-meta', `가장 긴 ${Number(r.best).toFixed(1)} cm${r.d ? ` · ${String(r.d).slice(5)}` : ''}`));
      if (r.intro) card.appendChild(el('p', 'lk-dex-intro', r.intro));
      if (r.alien) card.appendChild(el('span', 'lk-chip', '외래종'));
      if (r.photo) card.appendChild(el('span', 'lk-chip is-new', '📸 사진으로 남겼어요'));
    } else card.appendChild(el('p', 'lk-dex-intro', r.hint || ''));
    grid.appendChild(card);
    const g = cv.getContext('2d');
    if (g) {
      g.scale(k, k);
      drawFish(g, r.key, 66, 26, r.key === 'jangeo' ? 120 : 104, r.caught ? { wag: 0.06 } : { shadow: '#94a6a9' }); // 그림자는 불투명 — 반투명이면 몸·꼬리 겹친 자리가 진한 줄로 보인다
    }
  }
  return grid;
}

// ───────────── 🗺️ 물가 · 🐛 미끼 칩 · 🎒 채비 가게 (v368) ─────────────

function gearNow(h) {
  try { return typeof h.gear === 'function' ? h.gear() : null; } catch { return null; }
}
/** 가진 채비 { id: true } — host.gear()가 없으면 처음부터 있는 것만 · st = 이미 읽은 gear() */
function ownedOf(h, st = gearNow(h)) {
  const own = (st && st.owned) || {};
  return Object.fromEntries(GEAR.map((g) => [g.id, !!g.free || !!own[g.id]]));
}
/**
 * 최신 가진 채비·🏞️ 강 열림 다시 읽고 고른 값 맞추기 (Codex 172차) — 다른 창에서 사거나 강이 열려도 ·
 * 던지는 중이면 미끼·낚싯대를 안 바꾸고 가게에서 늦게 온 바꿈은 다음 ready까지 둔다 → 읽은 gear() 상태
 */
function syncGear() {
  if (!ui) return null;
  const st = gearNow(ui.host);
  ui.owned = ownedOf(ui.host, st);
  if (st && st.river) ui.riverOpen = true; // 열린 강·바다는 닫히지 않는다
  if (st && st.sea) ui.seaOpen = true;
  const r = syncPick(ui.pick, ui.owned, ui.pendPick, ui.st === 'ready' && !ui.busy);
  ui.pick = r.pick;
  ui.pendPick = r.pend;
  ui.menuShown = '';
  return st;
}
/** 던지기 전에만 고를 수 있다 (📖과 같은 때) */
function canMenu() {
  return !!ui && ui.st === 'ready' && !ui.busy && !ui.paused;
}
/** 🗺️ 물가 고르기 — 저수지 · 강(열리기 전엔 잠금 한 줄 · 숫자 없이) */
function togglePlaces() {
  const box = q$('.lk-places');
  if (!box.hidden) { hidePlaces(); return; }
  if (!canMenu() || typeof ui.host.onPick !== 'function') return;
  syncGear(); // 다른 창에서 강·바다가 열렸으면 바로 (Codex 172차)
  box.innerHTML = '';
  for (const pl of PLACES) {
    if (pl === 'sea' && !ui.riverOpen) continue; // 🌊 바다 줄은 강이 열린 뒤에야 (v369)
    const lock = !placeOk(pl);
    const b = el('button', `lk-place${ui.place === pl ? ' is-on' : ''}`);
    b.type = 'button';
    b.appendChild(el('b', '', `${PLACE_EMOJI[pl]} ${PLACE_KO[pl]}`));
    b.appendChild(el('span', '', lock ? '🔒 물고기를 더 만나면 길이 열려요' : ui.place === pl ? '지금 여기' : '여기로 가기'));
    b.disabled = lock;
    b.addEventListener('click', () => { touch(); switchPlace(pl); });
    box.appendChild(b);
  }
  box.hidden = false;
  q$('.lk-toast').hidden = true; // 들어설 때 알림이 칸 뒤에 반쯤 가려 보이지 않게
  q$('.lk-mapbtn').setAttribute('aria-expanded', 'true');
}
function hidePlaces() {
  if (!root) return;
  q$('.lk-places').hidden = true;
  q$('.lk-mapbtn').setAttribute('aria-expanded', 'false');
}
/** 그 물가에 갈 수 있나 — 저수지는 늘 · 강·바다는 열린 뒤 */
function placeOk(pl) {
  return pl === 'lake' || (pl === 'river' && ui.riverOpen) || (pl === 'sea' && ui.seaOpen);
}
/** 물가 바꾸기 — 던지기 전에만 · 하루 시간은 세 물가가 함께 쓴다 · 마지막 물가는 프로필에(onPick) */
function switchPlace(pl) {
  hidePlaces();
  if (!canMenu() || pl === ui.place || !PLACES.includes(pl) || !placeOk(pl)) return;
  ui.place = pl;
  ui.spot = spotsOf(pl)[0];
  q$('.lk-spot').hidden = true; // 앞 물가에서 던진 자리 칩이 남지 않게 (v369 걷기)
  ui.shadows = [];
  ui.rings = [];
  ui.skyStep = -1; // 풍경을 다시 그림
  toast(`${PLACE_EMOJI[pl]} ${PLACE_KO[pl]}에 왔어요! ${weatherLine(ui.host.weather, pl) || '🎣 던지기를 눌러요'}`, 3000);
  try { const r = ui.host.onPick({ place: pl }); if (r && r.catch) r.catch(() => {}); } catch { /* 저장 못 해도 지금 낚시는 그대로 */ }
}
/** 가진 미끼 차례 (지렁이 먼저) */
function baitsOwned() {
  return GEAR.filter((g) => g.kind === 'bait' && ui.owned[g.id]).map((g) => g.id);
}
const baitName = (id) => { const g = gearOf(id) || gearOf('worm'); return `${g.emoji} ${g.ko.replace(/\(.*\)/, '')}`; };
/** 🐛 미끼 칩 — 누르면 가진 미끼 다음 것으로 (던지기 전에만) */
function cycleBait() {
  if (!canMenu()) return;
  const list = baitsOwned();
  if (list.length < 2) return;
  const next = list[(list.indexOf(ui.pick.bait) + 1) % list.length];
  ui.pick.bait = next;
  ui.menuShown = '';
  toast(`${baitName(next)}${josaOf(baitName(next), '을', '를')} 끼웠어요`, 1600);
  try { const r = ui.host.onPick && ui.host.onPick({ bait: next }); if (r && r.catch) r.catch(() => {}); } catch { /* 무시 */ }
}
/** 지금 기울임 — 🌦️ 날씨 × 🎒 미끼 (같은 별 안에서 · 최대 세 배) */
function tiltNow() {
  return mixTilt(weatherTilt(ui.wx, ui.spot.key), baitTilt(ui.pick.bait));
}
/** 🎣 낚싯대 색 */
function rodColor() {
  const g = gearOf(ui.pick.rod);
  return g && g.butt ? { butt: g.butt, tip: g.tip } : null;
}
/** ✨ 야광 찌가 빛나는 때 — 가졌고, 노을(하루 시간의 뒤쪽)·흐린 날·비 오는 날 */
function glowNow() {
  if (!ui.pick.glow) return false;
  if (ui.wx === 'cloud' || ui.wx === 'rain') return true;
  const total = (dayLeftSec(0, ui.host.dayMin, ui.host.bonusMin) || 1200) * 1000;
  return ui.used / total >= 0.7;
}

let shopRoot = null;
let shopDone = null;
let shopGen = 0; // 가게를 열고 닫을 때마다 +1 — 늦게 온 사기·쓰기 결과가 닫았다 다시 연 가게에 알림을 띄우지 않게 (Codex 172차)
/** 낚시터 위 🎒 단추 — 던지기 전에만 · 보는 동안 게임 시계·하루 시간 멈춤(📖 도감과 같다) */
function lakeShop() {
  if (!canMenu() || typeof ui.host.gear !== 'function') return;
  hidePlaces();
  const me = ui;
  shopGen += 1;
  ui.paused = true;
  ui.shopOpen = true;
  if (!shopRoot) {
    shopRoot = el('div', 'lk-dexv lk-shop');
    shopRoot.id = 'lk-gear';
    shopRoot.hidden = true;
    shopRoot.setAttribute('role', 'dialog');
    shopRoot.setAttribute('aria-modal', 'true');
    shopRoot.setAttribute('aria-label', '채비 가게');
    document.body.appendChild(shopRoot);
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && shopRoot && !shopRoot.hidden) closeShop(); });
  }
  shopDone = () => { if (ui === me) { ui.shopOpen = false; ui.paused = false; ui.last = 0; ui.touchAt = performance.now(); ui.menuShown = ''; } };
  renderShop('');
  shopRoot.hidden = false;
  try { shopRoot.querySelector('.lk-dex-x').focus(); } catch { /* 무시 */ }
}
export function closeShop() {
  if (!shopRoot || shopRoot.hidden) return;
  shopRoot.hidden = true;
  shopGen += 1;
  const f = shopDone;
  shopDone = null;
  if (f) { try { f(); } catch { /* 무시 */ } }
}
const SHOP_KIND = [['bait', '🎣 미끼 — 던지기 옆 칩으로 바꿔요'], ['float', '✨ 찌'], ['rod', '🎣 낚싯대 색'], ['wear', '🧑 옷 — 옷장에도 들어가요']];
const WHY_KO = { short: '💰가 조금 모자라요 — 낚시로 모아요', made: '🧑 집에서 캐릭터를 먼저 만들어요', owned: '이미 가졌어요', locked: '🌊 바다가 열리면 살 수 있어요', unknown: '지금은 살 수 없어요', save: '저장이 안 됐어요 — 다시 눌러 봐요' };
/**
 * 가게 요청이 끝난 뒤 (Codex 172차) — me = 누른 때의 낚시터 · gen = 누른 때의 가게 ·
 * 낚시터를 닫았거나 다시 열었으면 아무것도 안 함 · 가게를 닫았다 다시 열었으면 알림 없이 새 상태만 · 가게가 닫혀 있으면 고른 값만 맞춤(던지는 중이면 다음 ready에)
 */
function shopAfter(me, gen, msg) {
  if (ui !== me) return false;
  if (shopRoot && !shopRoot.hidden) renderShop(gen === shopGen ? msg : '');
  else syncGear();
  return true;
}
/** 가게 다시 그리기 — msg = 맨 위 알림 한 줄 */
function renderShop(msg) {
  if (!shopRoot || !ui) return;
  const h = ui.host;
  const st = syncGear() || {}; // 미끼·낚싯대는 이 창에서 고른 값 그대로(저장이 늦어도 되돌아가지 않게) — 사기·쓰기 결과(pendPick)로만 바꾼다
  const coins = Math.max(0, Math.floor(Number(st.coins) || 0));
  shopRoot.innerHTML = '';
  const head = el('div', 'lk-dex-head');
  head.appendChild(el('h2', 'lk-dex-title', '🎒 채비 가게'));
  head.appendChild(el('span', 'lk-shop-coins', `💰 ${coins.toLocaleString('ko-KR')}`));
  const x = el('button', 'lk-dex-x', '✕');
  x.type = 'button';
  x.setAttribute('aria-label', '가게 닫기');
  x.addEventListener('click', () => closeShop());
  head.appendChild(x);
  shopRoot.appendChild(head);
  const body = el('div', 'lk-dex-body');
  body.appendChild(el('p', 'lk-shop-msg', msg || '한 번 사면 계속 써요. 써서 없어지는 건 없어요.'));
  const busy = (on) => shopRoot.querySelectorAll('.lk-shop-btn').forEach((b) => { b.disabled = on || b.dataset.short === '1'; });
  for (const [kind, title] of SHOP_KIND) {
    body.appendChild(el('h3', 'lk-dex-place', title));
    const grid = el('div', 'lk-shop-grid');
    for (const g of GEAR.filter((x2) => x2.kind === kind && (!x2.sea || ui.seaOpen || ui.owned[x2.id]))) { // 🦐 크릴은 바다가 열린 뒤에 (v369)
      const card = el('div', `lk-shop-card${ui.owned[g.id] ? ' is-own' : ''}`);
      card.appendChild(el('div', 'lk-shop-name', `${g.emoji} ${g.ko}`));
      card.appendChild(el('p', 'lk-dex-intro', g.say || ''));
      const using = (kind === 'bait' && ui.pick.bait === g.id) || (kind === 'rod' && ui.pick.rod === g.id);
      if (ui.owned[g.id]) {
        if (using) card.appendChild(el('span', 'lk-chip is-gold', '쓰는 중'));
        else if (kind === 'bait' || kind === 'rod') {
          const u = el('button', 'lk-shop-btn is-use', '쓰기');
          u.type = 'button';
          u.addEventListener('click', async () => {
            const me = ui;
            const gen = shopGen;
            busy(true);
            let r = null;
            try { r = await h.onPick({ [kind]: g.id }); } catch { r = null; }
            if (ui !== me) return; // 낚시터를 닫았거나 다시 열었으면 이 창 일이 아니다
            const ok = !!r && r.ok !== false;
            if (ok) ui.pendPick[kind] = g.id;
            shopAfter(me, gen, ok ? `${g.emoji} ${g.ko}${kind === 'bait' ? `${josaOf(g.ko, '을', '를')} 끼웠어요` : `${josaOf(g.ko, '으로', '로', true)} 바꿨어요`}` : WHY_KO.save);
          });
          card.appendChild(u);
        } else card.appendChild(el('span', 'lk-chip', kind === 'wear' ? '옷장에 있어요' : '가졌어요'));
      } else {
        const b = el('button', 'lk-shop-btn', `💰 ${g.price} 사기`);
        b.type = 'button';
        if (coins < g.price) { b.dataset.short = '1'; b.disabled = true; }
        b.addEventListener('click', async () => {
          const me = ui;
          const gen = shopGen;
          busy(true);
          b.textContent = '사는 중…';
          let r = null;
          try { r = await h.buyGear(g.id); } catch { r = null; }
          if (ui !== me) return; // 💰·가방은 저장됐다 — 다음에 들어오면 그대로 보인다
          if (r && r.ok) {
            if (gen === shopGen) { try { sfx.success(); } catch { /* 무시 */ } }
            if (g.kind === 'bait' || g.kind === 'rod') ui.pendPick[g.kind] = g.id; // 산 미끼·낚싯대 색은 바로 쓴다(규칙도 같이 골라 둠 · 던지는 중이면 다음 ready에)
            if (g.kind === 'wear' && typeof h.lookNow === 'function') { try { loadPeople({ look: h.lookNow() }); } catch { /* 옛 차림 그대로 */ } }
            const then = g.kind === 'wear' ? (g.id === 'a_hat_fish' ? ' 바로 썼어요' : ' 바로 입었어요') : g.kind === 'float' ? '' : ' 바로 써요';
            shopAfter(me, gen, `${g.emoji} ${g.ko}${josaOf(g.ko, '을', '를')} 샀어요!${then}`); // 받침에 맞게 — 「크릴을」 (v369)
          } else shopAfter(me, gen, WHY_KO[(r && r.why) || 'save'] || WHY_KO.save);
        });
        card.appendChild(b);
      }
      grid.appendChild(card);
    }
    body.appendChild(grid);
  }
  shopRoot.appendChild(body);
}
export function closeDexView() {
  if (!dexRoot || dexRoot.hidden) return;
  dexRoot.hidden = true;
  const f = dexDone;
  dexDone = null;
  if (f) { try { f(); } catch { /* 무시 */ } }
}
export function isDexOpen() {
  return !!dexRoot && !dexRoot.hidden;
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
  const tip = q$('.lk-tip');
  tip.textContent = q.tip || '';
  tip.hidden = !q.tip;
  const hint = q$('.lk-hint');
  const go = q$('.lk-go');
  hint.hidden = true;
  go.hidden = true;
  const box = q$('.lk-choices');
  box.innerHTML = '';
  card.hidden = false;
  root.classList.add('is-q');
  return new Promise((resolve) => {
    let picked = false;
    const done = (ok) => {
      if (ui !== me) return;
      card.hidden = true;
      hint.hidden = true;
      go.hidden = true;
      root.classList.remove('is-q');
      ui.paused = false;
      resolve(ok);
    };
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
        try { h.onAnswer && h.onAnswer(subj, ok, stage, q); } catch { /* 무시 */ }
        // 틀린 보기에 그 실수의 힌트가 있으면 — 읽을 때까지 기다린다(「알겠어요」) · 없으면 잠깐 정답을 보여 주고 닫음
        if (!ok && c.hint) {
          hint.textContent = c.hint;
          hint.hidden = false;
          go.hidden = false;
          go.onclick = () => { go.onclick = null; done(false); };
          try { go.focus(); } catch { /* 무시 */ }
          return;
        }
        setTimeout(() => done(ok), ok ? 800 : 1500);
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
  hidePlaces();
  syncGear(); // 던지기 직전 — 가진 채비로 다시 고침 · 가게에서 늦게 온 바꿈도 여기서 (Codex 172차)
  ui.busy = true;
  const before = openSpots(ui.okToday);
  const ok = await ask('cast');
  if (ui !== me) return;
  ui.busy = false;
  const opened = openSpots(ui.okToday);
  if (opened > before) toast(SPOT_OPEN[ui.place][opened] || SPOT_OPEN.lake[opened], 2800);
  ui.spot = castSpot(ok !== false, ui.okToday, ui.place);
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
  const k = n + nibbleExtra(ui.wx); // 🌬️ 바람 부는 날은 속임 떨림 한 번 더
  for (let i = 0; i < k; i++) { t += 500 + Math.random() * 700; after(t, () => { if (ui.st === 'nibble') { ui.float.twitch = ui.gclock; ring(ui.float.x, false); } }); }
  after(t + 600 + Math.random() * 900, bite);
}
function bite() {
  if (ui.st !== 'nibble') return;
  if (!ui.fish) ui.fish = rollFish(ui.spot, ui.chum, ui.streak, Math.random, tiltNow()); // 🌦️ 날씨 × 🎒 미끼 (v368)
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
  if (sp.photo) card.appendChild(el('div', 'lk-res-photo', '📸 사진만 찍고 놓아줘요')); // 천연기념물 — 사진으로 도감에 (v368)
  const cv = el('canvas', 'lk-res-fish');
  card.appendChild(cv);
  card.appendChild(el('div', 'lk-res-name', `${sp.ko} ${'★'.repeat(sp.star)}`));
  card.appendChild(el('div', 'lk-res-size', `${f.cm.toFixed(1)}cm · ${weightText(f.g)}`));
  if (sp.photo) card.appendChild(el('p', 'lk-res-say', PHOTO_SAY));
  const chips = el('div', 'lk-res-chips');
  for (const b of f.badges) chips.appendChild(el('span', 'lk-chip is-gold', BADGE_KO[b]));
  if (info.first) chips.appendChild(el('span', 'lk-chip is-new', '📖 도감에 새로'));
  else if (info.best) chips.appendChild(el('span', 'lk-chip is-new', '📏 새 기록'));
  if (info.coins > 0) chips.appendChild(el('span', 'lk-chip is-gold', `💰 +${info.coins}`));
  if (sp.alien) chips.appendChild(el('span', 'lk-chip', '외래종'));
  if (chips.childNodes.length) card.appendChild(chips);
  // 🏞️ 이 한 마리로 강이 열렸다 — 한 번 (규칙이 트랜잭션 안에서 정함)
  if (info.opened) {
    ui.riverOpen = true;
    card.appendChild(el('p', 'lk-res-open', '🏞️ 강 낚시터가 열렸어요! 🗺️ 물가에서 가 봐요'));
  }
  // 🌊 이 한 마리로 바다가 열렸다 — 한 번 + 안전 한 줄 (v369 「추천대로」)
  if (info.seaOpened) {
    ui.seaOpen = true;
    card.appendChild(el('p', 'lk-res-open', '🌊 바다 낚시터가 열렸어요! 🗺️ 물가에서 가 봐요'));
    card.appendChild(el('p', 'lk-res-safe', SEA_SAFE));
  }
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
  syncGear(); // 던지는 동안 다른 창에서 산 채비·늦게 온 가게 바꿈을 이제 (Codex 172차)
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
    for (const f of ui.caught) list.appendChild(el('li', '', `${speciesOf(f.key).ko} ${f.cm.toFixed(1)}cm${speciesOf(f.key).photo ? ' 📸' : ''}`));
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
  const fish = rollFish(ui.spot, ui.chum, ui.streak, Math.random, tiltNow());
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
  paintStatic(g, step / 100, v.x0, v.x1, v.y0, v.y1, ui.wx, ui.place);
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
  // 하루 시간 (진짜 시계) — 📖 도감·🎒 채비 가게를 보는 동안은 안 셈
  if (!ui.dexOpen && !ui.shopOpen) ui.used += activeStep(dt, now - ui.touchAt, !document.hidden);
  saveTime(false);
  // 📖 도감 단추 — 던지기 전(ready)에만
  const canDex = ui.st === 'ready' && !ui.busy && !ui.paused && typeof ui.host.dexRows === 'function';
  if (canDex !== ui.dexShown) { ui.dexShown = canDex; q$('.lk-dexbtn').hidden = !canDex; }
  // 🗺️ 물가 · 🎒 채비 · 🐛 미끼 칩 — 같은 때에만 (v368)
  const menu = canMenu();
  const baits = menu ? baitsOwned() : [];
  const mk = `${menu ? 1 : 0}|${baits.length > 1 ? ui.pick.bait : ''}`;
  if (mk !== ui.menuShown) {
    ui.menuShown = mk;
    q$('.lk-mapbtn').hidden = !menu || typeof ui.host.onPick !== 'function';
    q$('.lk-gearbtn').hidden = !menu || typeof ui.host.gear !== 'function';
    const bc = q$('.lk-bait');
    bc.hidden = baits.length < 2;
    if (!bc.hidden) { bc.textContent = baitName(ui.pick.bait); bc.setAttribute('aria-label', `미끼 바꾸기 — 지금 ${baitName(ui.pick.bait)}`); }
    if (!menu) hidePlaces();
  }
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
  drawWaterFx(ctx, now, ui.reduce, ui.lite, v.x0, v.x1, ui.wx, ui.place);
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
  const tip = drawRod(ctx, HAND.x, HAND.y, target.x, target.y, st === 'fight' ? ten / 100 : 0.05, rodColor());
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
        drawFloat(ctx, f.x, Math.max(f.sink || 0, tw), now, ui.reduce, glowNow());
      } else {
        // 날아가는 찌
        ctx.fillStyle = '#e8481a';
        ctx.beginPath(); ctx.arc(target.x, target.y - 30, 5, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  drawRings(ctx, ui.rings, now);
  drawDrops(ctx, ui.drops, now);
  if (ui.wx === 'rain' && !ui.lite) drawRain(ctx, now, ui.reduce, v.x0, v.x1, v.y0); // 🌧️ 느린 기기면 빗줄기는 끈다
  // 장력 · 거리 글
  if (st === 'fight' && ui.fs) {
    const fill = q$('.lk-g-fill');
    const k = Math.min(1, ui.fs.ten / 100);
    fill.style.strokeDasharray = `${(k * 301.6).toFixed(1)} 400`;
    fill.setAttribute('class', `lk-g-fill${k > 0.85 ? ' is-red' : k > 0.6 ? ' is-amber' : ''}${ui.fs.surge > 0 ? ' is-surge' : ''}`);
    q$('.lk-dist').textContent = `남은 거리 ${Math.max(0, ui.fs.dist - FIGHT.netM).toFixed(1)}m`;
  } else if (st === 'net') q$('.lk-dist').textContent = `뜰채까지 ${Math.max(0, ui.netPosDraw).toFixed(1)}m`;
}
