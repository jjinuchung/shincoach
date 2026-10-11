// 🏠 진우네 집 — 2단계 방 화면 (2026-10-10, 아버님 "2단계 가자")
// 방은 포켓몬 게임처럼 위에서 내려다본 모눈 — 바닥 size.W × size.H칸 + 위에 벽 한 줄(size.WALL칸) · size = houseShapeNow().size.
// 가구는 서 있는 이모지로 그리고, 아래쪽(앞쪽) 줄의 가구가 위쪽 줄의 가구를 가린다(깊이).
// 할 수 있는 것: 🗄️ 서랍에서 끌어다 놓기 · 서랍 물건을 누른 뒤 방을 눌러 놓기 · 놓인 가구 끌어서 옮기기 ·
//               놓인 가구를 누르면 ↔️ 방향 바꾸기·📦 서랍에 넣기 · 🎨 벽지·바닥 고르기(가진 것만)
// 규칙은 house.js(순수), 저장은 xp.houseDo(저장된 프로필로 한 트랜잭션) — 이 파일은 그리고 잇기만.
//
// 끌기는 퍼즐(puzzle.js)에서 배운 대로:
//  · HTML5 drag-and-drop은 안드로이드 터치에서 안 된다 → 포인터 이벤트, 움직임·놓기는 document에서 받는다
//  · 끄는 동안 원래 가구는 DOM에서 옮기지 않는다(포인터를 놓쳐 끊긴다) — 흐리게 두고 복제본이 손가락을 따라간다
//  · 안드로이드는 끄는 도중 화면이 꺼지면 손을 뗀 이벤트가 안 온다 → 다음 터치·화면 숨김·닫기에서 남은 끌기를 지운다

// 3단계(2026-10-10, 아버님 "3단계 가자"): 🏠 버튼(앱 홈 [data-open="house"]) · 🛒 가구 상점 탭 · 🎁 이사 선물(🛏️, 한 번)
//   가구는 되팔지 않으므로(아버님 ④) 상점은 **두 번 눌러야** 산다 — 잘못 누른 값비싼 기기를 되돌릴 길이 없다
// 🏗️ 집 넓히기 2단계(2026-10-10, 아버님 "2단계 가자"): 방 크기는 houseShapeNow().size(📐 방을 넓히면 10 × 7) ·
//   🏗️ 2층이 있으면 탭이 [🏠 1층] [🏠 2층] [🛒 가구 상점] — 층마다 벽지·바닥, 서랍은 하나 · 상점 맨 위 "🏗️ 집 넓히기"(💰·🔷·🔶 모은 만큼)
// 💊 회복 캡슐 2단계(2026-10-10, 아버님 설계안 "이대로 진행"): 놓인 캡슐을 누르면 🐾 쉬게 하기(고르기 창) · 쉬는 중엔 캡슐에 포켓몬과
//   남은 시간 · ⏏️ 꺼내기(두 번 — 보상 없음) · 다 쉬면 캡슐을 눌러 ✨ 받기 · 깜짝 진화면 진우가 갈래를 고르거나 그대로 둔다. 규칙은 rest.js
// 🔍 Codex 46차 #1: 다른 창에서 돌아와 프로필을 다시 읽으면(app.js visibilitychange) 열린 집을 새로 그린다 — 화면은 옛 2층 10 × 7인데
//   누르면 새 1층 8 × 6으로 셈해 다른 칸·다른 층에 놓였다. 그린 모양(ui.drawn)과 지금 모양이 다르면 놓기·끌기·칠하기·도구는 하지 않고 다시 그린다(stale)
import { FURN, PAINT, GROW, PAINT_BASE, FIRST_ROOM, SECOND_ROOM, FURN_MAX_2F, START_GIFT, HEAL, furnById, paintById, growById, canPlace, houseCost, houseBuyCheck, houseBuyRule, houseStartRule, placeRule, moveRule, flipRule, storeRule, paintRule, restsOf } from './house.js';
import { houseDo, houseNow, houseLeft, houseShapeNow, coins, itemCount, stones, getProfileSnapshot, onProfileReload, profileLoading, restStart, restCancel, restClaim, ownedMonIds, monExp, houseFurnMax, hpOf, monLv, getPartner } from './xp.js';
import { REST_EXP, REST_MS, CAP_KO, restLeft } from './rest.js';
import { showRestDone } from './restshow.js'; // ✨ 다 쉰 포켓몬 받기 연출 (3단계)
import { ROSTER, characterUrl, artUrl, ensureArt } from './pokemon.js';
import { ENGLISH_STONE_HOW } from './items.js';
import { sfx, unlock as sfxUnlock } from './sfx.js';

/** 벽 줄 높이 = 칸 × WALL_RATIO */
export const WALL_RATIO = 1.3;
/** 방 전체 높이(칸 단위) — size = houseShape().size */
export function rowsOf(size) {
  return WALL_RATIO + size.H;
}
/** 이만큼(px) 움직여야 끌기 — 그보다 적으면 누르기 */
const DRAG_MIN = 8;

const $ = (id) => document.getElementById(id);
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
/** 끝 글자 받침 (없으면 0, 한글이 아니면 -1) */
function jong(w) {
  const c = String(w || '').slice(-1).charCodeAt(0) - 0xAC00;
  return c < 0 || c > 11171 ? -1 : c % 28;
}
const eul = (w) => (jong(w) > 0 ? '을' : '를');
const euro = (w) => (jong(w) > 0 && jong(w) !== 8 ? '으로' : '로');
const iga = (w) => (jong(w) > 0 ? '이' : '가');
const eun = (w) => (jong(w) > 0 ? '은' : '는');

/**
 * 손가락 자리 → 놓을 칸 (순수 — node 테스트가 직접 부른다).
 * size = 방 크기(houseShape().size — 맨 앞, 빠뜨리면 null) · rect = 방의 화면 자리 { left, top, width, height } · id = 가구 · px, py = 손가락.
 * 가구 가운데가 손가락 아래에 오게 왼쪽 칸을 고르고, 방 가장자리에서는 방 안으로 당긴다(아이가 끝에 놓기 쉽게).
 * 벽 물건은 벽 줄(y 0)로만 · 바닥 가구는 바닥으로 — 방 밖이거나(바닥 가구가 벽 줄 한가운데 위) 모르는 가구면 null
 */
export function dropSpot(size, rect, id, px, py) {
  const d = furnById(id);
  if (!d || !size || !rect || !(rect.width > 0)) return null;
  const cell = rect.width / size.W;
  const wallH = cell * WALL_RATIO;
  const rx = px - rect.left;
  const ry = py - rect.top;
  if (rx < 0 || ry < 0 || rx > rect.width || ry > wallH + cell * size.H) return null;
  const span = d.at === 'wall' ? size.WALL : size.W;
  const x = Math.min(span - d.w, Math.max(0, Math.round(rx / cell - d.w / 2)));
  if (d.at === 'wall') return ry <= wallH + cell * 0.5 ? { x, y: 0 } : null; // 벽 바로 아래 반 칸까지는 벽으로 봐준다
  if (ry < wallH - cell * 0.4) return null; // 바닥 가구를 벽 위에
  return { x, y: Math.min(size.H - 1, Math.max(0, Math.floor((ry - wallH) / cell))) };
}

/** 가구 하나의 자리(방에 대한 %) — 화면이 그릴 때 · 끄는 동안 칸 표시 (size는 맨 앞) */
export function boxOf(size, id, x, y) {
  const d = furnById(id);
  if (!d || !size) return null;
  const rows = rowsOf(size);
  const top = d.at === 'wall' ? (WALL_RATIO - 1) / 2 : WALL_RATIO + y;
  return { left: (x / size.W) * 100, top: (top / rows) * 100, width: ((d.w) / size.W) * 100, height: (1 / rows) * 100 };
}

/**
 * 그린 집을 알아보는 열쇠 (순수) — 보는 방 + 방 크기(가로·세로·벽) + 있는 방.
 * 그린 때의 열쇠와 지금 열쇠가 다르면 화면이 옛 집이라 그대로 놓지 않고 다시 그린다 (Codex 46차 #1)
 */
export function shapeKeyOf(shape, floor) {
  return `${floor}|${shape.size.W}x${shape.size.H}x${shape.size.WALL}|${shape.rooms.join(',')}`;
}

/** 층 이름 */
const FLOOR_KO = { [FIRST_ROOM]: '1층', [SECOND_ROOM]: '2층' };
/**
 * 탭 목록 (순수) — 방이 하나면 [🏠 꾸미기][🛒 가구 상점], 🏗️ 2층이 있으면 [🏠 1층][🏠 2층][🛒 가구 상점]
 * @param {string[]} rooms houseShape().rooms
 * @returns {{tab:'room'|'shop', floor?:string, label:string}[]}
 */
export function houseTabs(rooms) {
  const list = rooms.length > 1 ? rooms.map((id) => ({ tab: 'room', floor: id, label: `🏠 ${FLOOR_KO[id] || id}` })) : [{ tab: 'room', floor: rooms[0], label: '🏠 꾸미기' }];
  return [...list, { tab: 'shop', label: '🛒 가구 상점' }];
}

/**
 * 🏗️ 넓히기를 얼마나 모았나 (순수) — 💰·🔷·🔶 각각 가진 것/드는 것 (상점 카드가 과목별로 보여 준다: 무엇을 더 공부하면 되는지)
 * @returns {{key:string, emoji:string, have:number, need:number, ok:boolean}[]}
 */
export function growProgress(profile, id) {
  const c = houseCost(id);
  const bag = (profile && profile.items) || {};
  const out = [{ key: 'coins', emoji: '💰', have: Math.max(0, Number(profile && profile.coins) || 0), need: c.coins }];
  for (const s of ['stone_math', 'stone_english']) if (c.items[s]) out.push({ key: s, emoji: STONE_EMOJI[s], have: Math.max(0, Number(bag[s]) || 0), need: c.items[s] });
  return out.map((x) => ({ ...x, ok: x.have >= x.need }));
}

// ───────────────────── 화면 ─────────────────────

// tab: 'room' 🏠 꾸미기 | 'shop' 🛒 가구 상점 · floor: 보는 층(방 id) · buyArm: 한 번 누른 상점 물건(한 번 더 누르면 산다) · drawn: 그린 집 모양(shapeKey)
const ui = { open: false, wired: false, busy: false, sel: 0, arm: '', drag: null, msg: '', onClose: null, tab: 'room', buyArm: '', floor: FIRST_ROOM, drawn: '', pick: 0, evoAsk: null, outArm: 0, tick: 0 };
// 💊 pick: 고르기 창을 연 캡슐 번호 · evoAsk: 깜짝 진화 물음 { u, mon, choices } · outArm: ⏏️ 꺼내기를 한 번 누른 캡슐 · tick: 남은 시간 시계
/** 지금 보는 방 id — 그 층이 없어졌으면(2층 없는 백업으로 합쳐짐) 1층 */
const roomId = () => {
  const rs = houseShapeNow().rooms;
  return rs.includes(ui.floor) ? ui.floor : rs[0];
};
const room = () => {
  const id = roomId();
  return houseNow().rooms.find((r) => r.id === id);
};
/** 지금 방 크기 */
const sz = () => houseShapeNow().size;
/** 지금 보는 방과 집 모양의 열쇠 — 그린 것(ui.drawn)과 다르면 화면이 옛 집이다 */
const shapeKey = () => shapeKeyOf(houseShapeNow(), roomId());

export function initHouse() {
  if (ui.wired) return;
  ui.wired = true;
  for (const b of document.querySelectorAll('[data-open="house"]')) b.addEventListener('click', () => openHouse());
  $('house-close').addEventListener('click', () => closeHouse());
  $('house').addEventListener('click', (e) => { if (e.target === $('house')) closeHouse(); });
  window.addEventListener('resize', () => { if (ui.open) sizeRoom(); });
  // 끄는 도중 화면이 꺼지거나 다른 앱으로 가면 손을 뗀 이벤트가 안 온다 — 끌기를 없던 일로
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelDrag(); });
  window.addEventListener('pagehide', () => cancelDrag());
  onProfileReload(onReloaded);
  // ✨ 다 쉰 캡슐이 있으면 앱 홈의 🏠 버튼에 표시 — 집을 안 열어도 알게 (15초마다 · 다시 읽은 뒤 · 닫을 때)
  onProfileReload(markReady);
  setInterval(markReady, 15000);
  markReady();
}

/** 🏠 집 열기 */
export function openHouse(opts = {}) {
  initHouse();
  ui.open = true;
  ui.onClose = opts.onClose || null;
  ui.sel = 0; ui.arm = ''; ui.msg = ''; ui.buyArm = ''; ui.floor = FIRST_ROOM;
  ui.pick = 0; ui.evoAsk = null; ui.outArm = 0;
  ui.tab = opts.tab === 'shop' ? 'shop' : 'room';
  $('house').hidden = false;
  if (!ui.tick) ui.tick = setInterval(tickRests, 1000);
  render();
}

export function closeHouse() {
  if (!ui.open) return;
  cancelDrag();
  ui.open = false;
  if (ui.tick) { clearInterval(ui.tick); ui.tick = 0; }
  $('house').hidden = true;
  markReady();
  const cb = ui.onClose;
  ui.onClose = null;
  if (cb) cb();
}

export function isHouseOpen() {
  return ui.open;
}

/** 프로필을 다시 읽었으면(다른 창에서 돌아옴) 열린 집을 새 집으로 다시 그린다 — 고른 것·사려던 것은 풀고, 없어진 층이면 1층 (Codex 46차 #1) */
function onReloaded() {
  if (!ui.open) return;
  cancelDrag();
  const moved = ui.drawn && ui.drawn !== shapeKey();
  ui.sel = 0; ui.arm = ''; ui.buyArm = '';
  ui.pick = 0; ui.evoAsk = null; ui.outArm = 0;
  ui.floor = roomId();
  if (moved) ui.msg = WHY.changed;
  render();
}

/** 그린 집과 지금 집 모양이 다르면 그대로 하지 않고 다시 그린다 — 옛 화면의 자리·층으로 놓지 않게 (Codex 46차 #1) · 읽는 중이면 아무것도 안 한다 */
function stale() {
  if (profileLoading()) return true;
  if (ui.drawn === shapeKey()) return false;
  cancelDrag();
  ui.sel = 0; ui.arm = ''; ui.buyArm = '';
  ui.pick = 0; ui.evoAsk = null; ui.outArm = 0;
  ui.floor = roomId();
  ui.msg = WHY.changed;
  render();
  return true;
}

function say(t) {
  ui.msg = t || '';
  const m = $('house-msg');
  if (m) m.textContent = ui.msg;
}

/** 방 아래에 서랍 첫 줄까지 한 화면에 보이도록 남겨 둘 높이(px) — 머리·탭·말 줄·서랍 제목·서랍 한 줄 */
const ROOM_SPARE = 345;
/** 가로 화면은 서랍이 옆 칸이라 머리·탭·말 줄만 남긴다 — css의 같은 미디어 조건 */
const WIDE = '(orientation: landscape) and (min-width: 700px)';
const ROOM_SPARE_WIDE = 175;

/**
 * 방 크기 — 화면이 낮으면(태블릿 가로) 방을 줄여 서랍이 같은 화면에 보이게 한다(끌어 놓으려면 둘 다 보여야 한다).
 * 칸 크기(px)는 CSS 변수로 — 이모지 크기가 방 크기를 따라간다
 */
function sizeRoom() {
  const r = document.querySelector('#house-body .house-room');
  if (!r) return;
  const size = sz();
  const spare = window.matchMedia && window.matchMedia(WIDE).matches ? ROOM_SPARE_WIDE : ROOM_SPARE;
  r.style.maxWidth = `${Math.max(260, ((window.innerHeight * 0.94 - spare) * size.W) / rowsOf(size))}px`;
  r.style.setProperty('--cell', `${r.clientWidth / size.W}px`);
  const t = r.querySelector('.house-tools');
  if (t) {
    const w = r.clientWidth;
    const half = t.offsetWidth / 2 + 4;
    t.style.left = `${Math.min(w - half, Math.max(half, (Number(t.dataset.cx) / 100) * w))}px`;
  }
}

function render() {
  if (!ui.open || profileLoading()) return; // 다시 읽는 중엔 메모리 프로필이 비어 있다 — 다 읽으면 onReloaded가 그린다
  ui.drawn = shapeKey();
  if (ui.drag) cancelDrag(); // 끄는 도중 두 번째 손가락으로 다른 것을 눌러 다시 그리면 그 끌기는 없던 일 (Codex 45차 #6 — 끌던 가구가 사라진 판에 남지 않게)
  const st = stones();
  const n = (x) => (x || 0).toLocaleString('ko-KR');
  $('house-coins').textContent = `💰 ${n(coins())} · 🔷 ${n(st.math)} · 🔶 ${n(st.english)}`;
  renderTabs();
  const body = $('house-body');
  body.innerHTML = '';
  const panel = ui.tab === 'room' && (ui.evoAsk || ui.pick);
  body.classList.toggle('is-shop', ui.tab === 'shop' || !!panel); // 한 칸(가로 화면에서도)
  if (ui.tab === 'shop') body.appendChild(shopBox());
  else if (ui.evoAsk) body.appendChild(evoAskBox());
  else if (ui.pick) body.appendChild(pickBox());
  else {
    body.appendChild(roomBox());
    body.appendChild(drawerBox());
    body.appendChild(paintBox());
  }
  say(ui.msg);
  sizeRoom();
}

/** 탭 — 🏠 꾸미기(2층이 있으면 🏠 1층 · 🏠 2층) · 🛒 가구 상점 (바꾸면 고른 것·한 번 누른 것은 지운다) */
function renderTabs() {
  const tabs = $('house-tabs');
  if (!tabs) return;
  tabs.innerHTML = '';
  const cur = roomId();
  for (const t of houseTabs(houseShapeNow().rooms)) {
    const on = ui.tab === t.tab && (t.tab === 'shop' || t.floor === cur);
    const b = el('button', `btn house-tab${on ? ' is-on' : ''}`, t.label);
    b.type = 'button';
    b.dataset.tab = t.tab;
    if (t.floor) b.dataset.floor = t.floor;
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', on ? 'true' : 'false');
    b.addEventListener('click', () => goTab(t.tab, t.floor));
    tabs.appendChild(b);
  }
}
function goTab(key, floor) {
  if (ui.tab === key && (!floor || floor === roomId())) return;
  cancelDrag();
  ui.tab = key; ui.sel = 0; ui.arm = ''; ui.buyArm = ''; ui.msg = '';
  ui.pick = 0; ui.evoAsk = null; ui.outArm = 0;
  if (floor) ui.floor = floor;
  render();
}

/** 방 — 벽·바닥·놓인 가구·고른 가구의 도구 */
function roomBox() {
  const rm = room();
  const size = sz();
  const rows = rowsOf(size);
  const box = el('div', 'house-room');
  box.dataset.room = rm.id;
  box.style.aspectRatio = `${size.W} / ${rows}`;
  const wall = el('div', 'house-wall');
  wall.style.height = `${(WALL_RATIO / rows) * 100}%`;
  wall.style.background = (paintById(rm.wall) || PAINT_BASE.wall).color;
  const floor = el('div', 'house-floor');
  floor.style.top = `${(WALL_RATIO / rows) * 100}%`;
  floor.style.backgroundColor = (paintById(rm.floor) || PAINT_BASE.floor).color;
  box.appendChild(wall);
  box.appendChild(floor);
  for (const it of rm.items) box.appendChild(itemEl(it));
  const hint = el('div', 'house-hint');
  hint.hidden = true;
  box.appendChild(hint);
  if (ui.sel) {
    const it = rm.items.find((i) => i.u === ui.sel);
    if (it) box.appendChild(toolsEl(it)); else ui.sel = 0;
  }
  if (ui.arm) box.classList.add('is-arming');
  // 빈 곳을 누르면: 서랍에서 고른 가구를 거기에 놓거나, 고른 가구를 놓아준다
  box.addEventListener('click', (e) => {
    if (e.target.closest('.house-item') || e.target.closest('.house-tools')) return;
    if (ui.arm) { placeAt(ui.arm, box.getBoundingClientRect(), e.clientX, e.clientY); return; }
    if (ui.sel) { ui.sel = 0; render(); }
  });
  return box;
}

function itemEl(it) {
  const d = furnById(it.id);
  const b = boxOf(sz(), it.id, it.x, it.y);
  const e = el('div', `house-item is-${d.at}${it.u === ui.sel ? ' is-sel' : ''}${it.f ? ' is-flip' : ''}${d.w > 1 ? ' is-wide' : ''}`);
  e.setAttribute('role', 'button');
  e.setAttribute('aria-label', d.ko);
  e.dataset.u = String(it.u);
  e.dataset.id = it.id;
  Object.assign(e.style, { left: `${b.left}%`, top: `${b.top}%`, width: `${b.width}%`, height: `${b.height}%`, zIndex: String(d.at === 'wall' ? 5 : 10 + it.y) });
  e.appendChild(el('span', 'house-emoji', d.emoji));
  if (it.id === HEAL) restDecor(e, it);
  e.addEventListener('pointerdown', (ev) => startDrag(ev, { kind: 'move', id: it.id, u: it.u, src: e }));
  return e;
}

/** 고른 가구 위의 도구 — ↔️ 방향 바꾸기 · 📦 서랍에 넣기 */
function toolsEl(it) {
  const d = furnById(it.id);
  const b = boxOf(sz(), it.id, it.x, it.y);
  // 벽 물건은 도구를 아래에(위에 두면 방 밖으로 잘린다) · 가로는 sizeRoom이 버튼 폭을 재어 방 안으로 당긴다(양 끝 가구에서 잘리지 않게)
  const below = d.at === 'wall';
  const t = el('div', `house-tools${below ? ' is-below' : ''}`);
  t.dataset.cx = String(b.left + b.width / 2);
  Object.assign(t.style, { left: `${b.left + b.width / 2}%`, top: `${below ? b.top + b.height : b.top}%` });
  const rid = roomId();
  const flip = el('button', 'btn house-tool', '↔️ 방향');
  flip.type = 'button';
  flip.addEventListener('click', () => { if (stale()) return; run((p) => flipRule(p, rid, it.u), `${d.emoji} ${d.ko}의 방향을 바꿨어요`); });
  const store = el('button', 'btn house-tool', '📦 서랍에');
  store.type = 'button';
  store.addEventListener('click', () => { if (stale()) return; ui.sel = 0; run((p) => storeRule(p, rid, it.u), `${d.emoji} ${d.ko}${eul(d.ko)} 서랍에 넣었어요`); });
  if (it.id === HEAL) t.appendChild(restTool(it)); // 💊 캡슐 — 🐾 쉬게 하기 · ⏏️ 꺼내기 · ✨ 받기
  t.appendChild(flip);
  t.appendChild(store);
  return t;
}

/** 🗄️ 서랍 — 가졌지만 안 놓은 가구 (끌어다 놓거나, 누른 뒤 방을 눌러 놓는다) */
function drawerBox() {
  const sec = el('div', 'house-sec');
  sec.appendChild(el('h3', 'house-h', '🗄️ 서랍'));
  // 🎁 이사 선물 — 처음 집에 한 번 (houseStartRule: 저장된 집의 started로 판정, 두 창·백업에서도 한 번)
  if (!houseNow().started) {
    const g = furnById(START_GIFT);
    const card = el('div', 'house-gift');
    card.appendChild(el('p', 'house-gift-text', `🎁 이사 선물이 왔어요! ${g.emoji} ${g.ko} 하나를 받아요`));
    const take = el('button', 'btn btn-primary house-gift-btn', '🎁 받기');
    take.type = 'button';
    take.addEventListener('click', async () => {
      sfxUnlock();
      const r = await run(houseStartRule, `${g.emoji} ${g.ko}${eul(g.ko)} 받았어요 — 서랍에서 끌어다 방에 놓아 보세요`);
      if (r && r.ok) sfx.ding();
    });
    card.appendChild(take);
    sec.appendChild(card);
  }
  const left = houseLeft();
  const ids = FURN.map((f) => f.id).filter((id) => left[id] > 0);
  if (!ids.length) {
    if (!houseNow().started) return sec; // 선물을 받기 전에는 선물 카드만 (상점 안내가 같이 뜨면 무엇을 먼저 할지 헷갈린다)
    const anyOwned = FURN.some((f) => itemCount(f.id) > 0);
    sec.appendChild(el('p', 'house-note', anyOwned ? '가구를 모두 방에 놓았어요 — 더 갖고 싶으면 🛒 가구 상점에서 사 와요.' : '서랍이 비었어요 — 가구는 🛒 가구 상점에서 사 와요.')); // Codex 45차 D
    const go = el('button', 'btn house-go-shop', '🛒 가구 상점 가기');
    go.type = 'button';
    go.addEventListener('click', () => goTab('shop'));
    sec.appendChild(go);
    return sec;
  }
  sec.appendChild(el('p', 'house-note', ui.arm ? `${furnById(ui.arm).emoji} 놓을 곳을 방에서 눌러 주세요 (한 번 더 누르면 그만)` : '끌어서 방에 놓아요 — 누른 다음 방을 눌러도 돼요'));
  // 💊 맡겨 둔 휴식 — 쉬던 캡슐이 서랍으로 왔다(방이 줄어든 백업과 합쳐짐). 캡슐을 다시 놓으면 이어 쉰다 (Codex 47차 #1)
  for (const r of houseNow().parked || []) {
    const ko = monKo(r.mon);
    sec.appendChild(el('p', 'house-note house-parked', `💤 ${ko}${iga(ko)} 💊 회복 캡슐을 기다려요 — 서랍의 캡슐을 방에 놓으면 이어서 쉬어요`));
  }
  const row = el('div', 'house-drawer');
  for (const id of ids) {
    const d = furnById(id);
    const b = el('button', `house-drawer-item${ui.arm === id ? ' is-arm' : ''}`);
    b.type = 'button';
    b.dataset.id = id;
    b.setAttribute('aria-label', `${d.ko} ${left[id]}개`);
    b.appendChild(el('span', 'house-drawer-emoji', d.emoji));
    b.appendChild(el('span', 'house-drawer-name', d.ko));
    if (left[id] > 1) b.appendChild(el('span', 'house-drawer-n', `×${left[id]}`));
    b.addEventListener('pointerdown', (ev) => startDrag(ev, { kind: 'new', id, src: b }));
    row.appendChild(b);
  }
  sec.appendChild(row);
  return sec;
}

/** 🎨 벽지·바닥 — 처음 것(공짜)과 가진 것만 */
function paintBox() {
  const rm = room();
  const rid = rm.id;
  const sec = el('div', 'house-sec');
  sec.appendChild(el('h3', 'house-h', houseShapeNow().rooms.length > 1 ? `🎨 ${FLOOR_KO[rid] || rid} 벽지 · 바닥` : '🎨 벽지 · 바닥'));
  for (const part of ['wall', 'floor']) {
    const row = el('div', 'house-paints');
    const opts = [{ id: '', ko: PAINT_BASE[part].ko, color: PAINT_BASE[part].color }, ...PAINT.filter((p) => p.part === part && itemCount(p.id) > 0)];
    for (const o of opts) {
      const b = el('button', `house-paint${rm[part] === o.id ? ' is-on' : ''}`);
      b.type = 'button';
      b.dataset.paint = `${part}:${o.id}`;
      b.setAttribute('aria-pressed', rm[part] === o.id ? 'true' : 'false');
      const sw = el('span', 'house-swatch');
      sw.style.background = o.color;
      b.appendChild(sw);
      b.appendChild(el('span', '', o.ko));
      b.addEventListener('click', () => { if (stale()) return; if (rm[part] !== o.id) run((p) => paintRule(p, rid, part, o.id), `${o.ko}${euro(o.ko)} 바꿨어요`); });
      row.appendChild(b);
    }
    sec.appendChild(row);
  }
  if (!PAINT.some((p) => itemCount(p.id) > 0)) sec.appendChild(el('p', 'house-note', '다른 벽지·바닥은 아직 없어요.'));
  return sec;
}

// ───────────────────── 저장 ─────────────────────

const WHY = {
  spot: '거기는 놓을 수 없어요 — 다른 가구가 있거나 방 밖이에요',
  none: '서랍에 없어요 — 다른 화면에서 먼저 놓았나 봐요',
  gone: '그 가구가 이미 없어요 — 다른 화면에서 옮겼나 봐요',
  save: '저장이 안 됐어요 — 다시 해 볼까요?',
  short: '코인이나 스톤이 모자라요 — 배우고 다시 와요!',
  owned: '이미 있어요 — 🏠 꾸미기에서 칠할 수 있어요',
  grown: '벌써 했어요 — 🏠 꾸미기에서 봐요',
  get max() { // 한도는 집 모양에서 (🏗️ 2층이면 6) — 아직 2층 전이면 늘리는 길도 알려 준다
    const m = houseShapeNow().max;
    return m < FURN_MAX_2F ? `한 가지 가구는 ${m}개까지 가질 수 있어요 — 🏗️ 2층을 올리면 ${FURN_MAX_2F}개까지` : `한 가지 가구는 ${m}개까지 가질 수 있어요`;
  },
  order: '먼저 📐 방을 넓혀야 2층을 올릴 수 있어요',
  changed: '다른 화면에서 집이 바뀌었어요 — 바뀐 집으로 다시 그렸으니 다시 해 봐요',
  room: '그 방이 없어요 — 다른 화면에서 집이 바뀌었나 봐요',
  already: '이사 선물은 벌써 받았어요',
  resting: '쉬는 중이라 서랍에 못 넣어요 — 먼저 ⏏️ 꺼내요',
  gift: '먼저 🎁 이사 선물을 받아요 — 🏠 꾸미기의 서랍에 와 있어요',
};
/** 규칙 하나를 저장소에서 — 끝나면 저장된 집으로 다시 그린다(다른 창이 바꾼 것도 보인다) · 결과를 돌려준다
 *  alias = 이 물건에서 다르게 말할 why ({ owned: 'grown' } — 늦은 창의 넓히기가 "칠할 수 있어요"로 나왔다, Codex 46차 #3) */
async function run(rule, okText, alias) {
  if (ui.busy) return null;
  ui.busy = true;
  let r;
  try { r = await houseDo(rule); } finally { ui.busy = false; }
  const why = r && r.why;
  ui.msg = r && r.ok ? (typeof okText === 'function' ? okText(r) : okText) : (WHY[(alias && alias[why]) || why] || '다시 해 볼까요?');
  render();
  return r;
}

/** 놓았을 때의 말 — 💊 맡겨 둔 휴식이 다시 놓은 캡슐에서 이어지면 그것도 (Codex 47차 #1) */
export function placedText(d) {
  return (r) => {
    const base = `${d.emoji} ${d.ko}${eul(d.ko)} 놓았어요`;
    if (!r.rest) return base;
    const ko = monKo(r.rest.mon);
    return `${base} — 💤 ${ko}${iga(ko)} 이어서 쉬어요`;
  };
}

// ───────────────────── 🛒 가구 상점 ─────────────────────

const STONE_KO = { stone_math: '🔷 수학스톤', stone_english: '🔶 영어스톤' };
const STONE_EMOJI = { stone_math: '🔷', stone_english: '🔶' };
const SHOP_GROUPS = [
  { key: 'grow', title: '🏗️ 집 넓히기', note: '💰 코인과 🔷 수학스톤 · 🔶 영어스톤이 모두 있어야 해요 — 수학도 영어도 골고루!' },
  { key: 'small', title: '🧸 소품' },
  { key: 'furn', title: '🛋️ 가구' },
  { key: 'device', title: '📺 기기', note: `코인과 함께 스톤도 들어요 — 🔷 수학스톤은 수학 개념을 통과하면, 🔶 영어스톤은 ${ENGLISH_STONE_HOW} 생겨요` },
  { key: 'paint', title: '🎨 벽지 · 바닥', note: '한 번 사면 계속 칠할 수 있어요' },
];
/** 값 말 — "💰 2,500 · 🔷 1 · 🔶 1" */
function priceText(id) {
  const c = houseCost(id);
  return [`💰 ${c.coins.toLocaleString('ko-KR')}`, ...Object.keys(c.items).map((s) => `${STONE_EMOJI[s]} ${c.items[s]}`)].join(' · ');
}
/** 모자란 것 말 — "코인 300개, 🔷 수학스톤 1개" */
function shortText(c) {
  const parts = [];
  if (c.shortCoins > 0) parts.push(`코인 ${c.shortCoins.toLocaleString('ko-KR')}개`);
  for (const s of Object.keys(c.shortStones || {})) parts.push(`${STONE_KO[s]} ${c.shortStones[s]}개`);
  return parts.join(', ');
}

function shopBox() {
  const wrap = el('div', 'house-shop');
  const pf = getProfileSnapshot();
  // 🎁 이사 선물을 받기 전에는 못 산다(house.houseBuyCheck 'gift') — 무엇을 먼저 할지 알려 주고 꾸미기로 보낸다 (Codex 45차 #5)
  if (!houseNow().started) {
    const card = el('div', 'house-gift');
    card.appendChild(el('p', 'house-gift-text', '먼저 🎁 이사 선물을 받아요 — 받으면 가구를 살 수 있어요'));
    const go = el('button', 'btn btn-primary house-gift-btn', '🏠 꾸미기로 가기');
    go.type = 'button';
    go.addEventListener('click', () => goTab('room'));
    card.appendChild(go);
    wrap.appendChild(card);
  }
  for (const g of SHOP_GROUPS) {
    const sec = el('div', 'house-sec');
    sec.appendChild(el('h3', 'house-h', g.title));
    if (g.note) sec.appendChild(el('p', 'house-note', g.note));
    const grid = el('div', 'house-shop-grid');
    const list = g.key === 'paint' ? PAINT : g.key === 'grow' ? GROW : FURN.filter((f) => f.group === g.key);
    for (const it of list) grid.appendChild(shopCard(it, houseBuyCheck(pf, it.id), pf));
    sec.appendChild(grid);
    wrap.appendChild(sec);
  }
  return wrap;
}

function shopCard(it, c, pf) {
  const paint = !!it.part;
  const grow = !!growById(it.id);
  const done = c.why === 'owned' || c.why === 'max';
  const armed = ui.buyArm === it.id;
  const b = el('button', `house-shop-item${grow ? ' is-grow' : ''}${c.why === 'short' || c.why === 'gift' || c.why === 'order' ? ' is-short' : ''}${done ? ' is-done' : ''}${armed ? ' is-arm' : ''}`);
  b.type = 'button';
  b.dataset.buy = it.id;
  if (paint) { const sw = el('span', 'house-shop-swatch'); sw.style.background = it.color; b.appendChild(sw); } else b.appendChild(el('span', 'house-shop-emoji', it.emoji));
  b.appendChild(el('span', 'house-shop-name', it.ko));
  if (grow) b.appendChild(el('span', 'house-shop-what', it.what));
  b.appendChild(el('span', 'house-shop-price', priceText(it.id)));
  const have = c.have || 0;
  // 🏗️ 아직 안 산 넓히기는 💰·🔷·🔶를 각각 얼마나 모았는지 — 모자란 과목이 눈에 띄게 (차례가 안 됐으면 먼저 살 것)
  if (grow && !have && !armed && c.why !== 'order') {
    const prog = el('span', 'house-shop-prog');
    prog.appendChild(el('span', 'house-shop-prog-key', '모은 것 / 필요한 것'));
    for (const x of growProgress(pf, it.id)) prog.appendChild(el('span', x.ok ? 'is-ok' : 'is-lack', `${x.emoji} ${x.have.toLocaleString('ko-KR')}/${x.need.toLocaleString('ko-KR')}${x.ok ? ' ✔' : ''}`));
    b.appendChild(prog);
  } else {
    const need = c.why === 'order' ? growById(c.need) : null;
    b.appendChild(el('span', 'house-shop-have', armed ? '한 번 더 누르면 사요' : paint || grow ? (have ? '✔ 있어요' : need ? `${need.emoji} ${need.ko} 먼저` : '') : `가진 것 ${have}/${houseFurnMax(it.id)}`));
  }
  b.addEventListener('click', () => shopTap(it.id));
  return b;
}

/** 🏗️ 넓히기를 산 뒤의 말 */
const GROW_DONE = {
  x_wide: '📐 방을 넓혔어요! 바닥이 커졌어요 — 🏠 꾸미기에서 봐요',
  x_floor2: '🏗️ 2층을 올렸어요! 위의 [🏠 2층]을 눌러 꾸며 봐요',
};
/** 넓히기는 "이미 있어요 — 칠할 수 있어요"(벽지 말)가 아니라 "벌써 했어요" — 누르기 전 판정과 저장소 판정 모두 */
const GROW_WHY = { owned: 'grown' };

/** 상점 물건 누르기 — 처음 누르면 값을 보여 주고, 한 번 더 누르면 산다 (되팔 수 없으니 두 번) */
async function shopTap(id) {
  if (ui.busy) return;
  const it = furnById(id) || paintById(id) || growById(id);
  const name = it.emoji ? `${it.emoji} ${it.ko}` : `🎨 ${it.ko}`;
  const c = houseBuyCheck(getProfileSnapshot(), id);
  if (!c.ok) {
    ui.buyArm = '';
    const why = (growById(id) && GROW_WHY[c.why]) || c.why;
    const own = why === 'max' && furnById(id) && furnById(id).max; // 💊 캡슐처럼 가구가 따로 정한 한도
    ui.msg = why === 'short' ? `${name} — ${shortText(c)}가 모자라요. 배우고 다시 와요!` // shortText는 늘 "…개"로 끝난다
      : own ? `${name}${eun(it.ko)} ${own}대까지 가질 수 있어요` : (WHY[why] || '다시 해 볼까요?');
    render();
    return;
  }
  if (ui.buyArm !== id) {
    ui.buyArm = id;
    ui.msg = `${name} — ${priceText(id)}. 한 번 더 누르면 사요`;
    render();
    return;
  }
  ui.buyArm = '';
  sfxUnlock();
  const ok = GROW_DONE[id] || (paintById(id) ? `${name}${eul(it.ko)} 샀어요! 🏠 꾸미기에서 칠할 수 있어요` : `${name}${eul(it.ko)} 샀어요! 🏠 꾸미기의 🗄️ 서랍에 들어갔어요`);
  const r = await run((p) => houseBuyRule(p, id), ok, growById(id) ? GROW_WHY : null);
  if (r && r.ok) sfx.ding();
}

function placeAt(id, rect, px, py) {
  if (stale()) return;
  const d = furnById(id);
  const rid = roomId();
  const spot = dropSpot(sz(), rect, id, px, py);
  if (!spot || !canPlace(houseShapeNow().size, room(), id, spot.x, spot.y)) { say(WHY.spot); return; }
  ui.arm = '';
  run((p) => placeRule(p, rid, id, spot.x, spot.y), placedText(d));
}

// ───────────────────── 💊 회복 캡슐 ─────────────────────

/** 남은 시간 "분:초" (순수) — 60:00 · 0:05 */
export function restClock(ms) {
  const s = Math.max(0, Math.ceil((Number(ms) || 0) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const REST_WHY = {
  busy: '이미 다른 포켓몬이 쉬고 있어요',
  twice: '그 포켓몬은 다른 캡슐에서 쉬고 있어요',
  none: '그 포켓몬이 이제 없어요 — 다른 포켓몬을 골라요',
  gone: '캡슐이 비어 있어요 — 다른 화면에서 꺼냈나 봐요',
  ready: '다 쉬었어요! 캡슐을 눌러 받아요',
  to: '그 모습으로는 진화할 수 없어요',
  changed: '캡슐 속 포켓몬이 바뀌었어요 — 다른 화면에서 바꿨나 봐요. 지금 캡슐을 다시 보여 줄게요',
  decide: '',
};
/** "N분 남았어요" (순수) — 1분 아래도 1분 */
export function minsLeft(ms) {
  return `${Math.max(1, Math.ceil((Number(ms) || 0) / 60000))}분 남았어요`;
}
/** 캡슐 일이 안 됐을 때의 말 (순수) — 아직이면 몇 분 남았는지 */
export function restWhy(r) {
  const why = r && r.why;
  if (why === 'early') return `아직 쉬는 중이에요 — ${minsLeft(r.left)}`;
  const own = (o) => typeof why === 'string' && Object.prototype.hasOwnProperty.call(o, why); // 물려받은 이름(toString…)은 말이 아니다
  if (own(REST_WHY)) return REST_WHY[why];
  return (own(WHY) && WHY[why]) || '다시 해 볼까요?';
}

/**
 * 다 쉰 포켓몬을 받았을 때의 말 (순수) — ko = id → 이름
 * @returns {string[]}
 */
export function claimLines(r, ko) {
  const name = ko(r.mon);
  if (r.gone) return [`${name}${iga(name)} 이제 없어서 캡슐이 비었어요`];
  const out = [`❤️ ${name} HP 가득!`, `💤 +${REST_EXP}`];
  const lvUp = (r.exp && r.exp.lvUp) || 0;
  const lucky = r.lv ? r.lv.to - r.lv.from - lvUp : 0;
  if (lvUp) out.push(`💤 경험치가 가득 차서 레벨 +${lvUp}`);
  if (lucky > 0) out.push('🍀 행운의 레벨 +1');
  if (r.coins) out.push(`🍀 ${CAP_KO[r.cap] || CAP_KO.max} 대신 💰${r.coins}`); // 진화 레벨에서 멈췄으면 "진화할 때가 되어서" (Codex 47차 D)
  if (r.lv && r.lv.to > r.lv.from) out.push(`Lv ${r.lv.from} → ${r.lv.to}`);
  if (r.evo && r.evo.ok) {
    const t = ko(r.evo.to);
    out.push(`✨ ${t}${euro(t)} 진화!`);
  }
  if (r.kept) out.push('진화하지 않고 그대로 두었어요');
  return out;
}

/** 포켓몬 이름 */
function monKo(id) {
  const r = ROSTER.find((x) => x.id === Number(id));
  return r ? r.ko : `포켓몬 ${id}`;
}
/** 포켓몬 그림 — 받아 둔 캐릭터·포스터 그림, 없으면 🐾를 두고 받아 오면 바꾼다 */
function monFace(id, cls) {
  const img = (url) => {
    const i = el('img', cls);
    i.src = url;
    i.alt = monKo(id);
    i.draggable = false;
    return i;
  };
  const url = characterUrl(id) || artUrl(id);
  if (url) return img(url);
  const s = el('span', `${cls} is-emoji`, '🐾');
  queueArt(id, s).then((u) => { if (u && s.isConnected) s.replaceWith(img(u)); });
  return s;
}

/**
 * 그림 받기 줄 (Codex 47차 #6) — 고르기 창에 그림 없는 포켓몬이 많아도 한꺼번에 받지 않는다(옛 태블릿):
 * 한 번에 max장 · 같은 포켓몬은 한 번(기다리는 자리마다 같은 약속) · 차례가 왔을 때 기다리는 자리가 화면에서 다 사라졌으면(창을 닫음) 안 받는다.
 * 다 받거나 못 받으면 줄에서 뺀다 — 받았으면 다음엔 characterUrl·artUrl로 바로, 못 받았으면 다음에 다시(메모 art-fetch-needs-retry)
 * ensure = pokemon.ensureArt (테스트는 가짜) → queue(id, node) = Promise<url|''>
 */
export function artQueue(ensure, max = 3) {
  const wait = [];
  const jobs = new Map();
  let busy = 0;
  const pump = () => {
    while (busy < max && wait.length) {
      const job = wait.shift();
      if (!job.nodes.some((n) => n && n.isConnected)) { jobs.delete(job.id); job.done(''); continue; }
      busy++;
      Promise.resolve().then(() => ensure(job.id)).catch(() => '').then((u) => {
        busy--;
        jobs.delete(job.id);
        job.done(u || '');
        pump();
      });
    }
  };
  return (id, node) => {
    const k = Number(id);
    let job = jobs.get(k);
    if (!job) {
      job = { id: k, nodes: [], done: null, p: null };
      job.p = new Promise((res) => { job.done = res; });
      jobs.set(k, job);
      wait.push(job);
      Promise.resolve().then(pump); // 그리기(render)가 자리를 화면에 붙인 뒤에 센다
    }
    job.nodes.push(node);
    return job.p;
  };
}
const queueArt = artQueue((id) => ensureArt(id));

/** 쉰 만큼 (0~1) — 남은 시간 링 */
function restDone(left) {
  return Math.max(0, Math.min(1, 1 - left / REST_MS)).toFixed(3);
}

/** ✨ 다 쉰 캡슐 수 → 🏠 버튼(앱 홈의 [data-open="house"])에 has-ready */
function markReady() {
  const now = Date.now();
  let n = 0;
  for (const r of houseNow().rooms) for (const i of r.items) if (i.rest && restLeft(i.rest, now) === 0) n++;
  for (const b of document.querySelectorAll('[data-open="house"]')) {
    b.classList.toggle('has-ready', n > 0);
    b.setAttribute('aria-label', n > 0 ? '진우네 집 — 다 쉰 포켓몬이 있어요' : '진우네 집');
  }
}

/** 💊 캡슐 꾸밈 — 쉬는 포켓몬 · 💤 · 남은 시간(다 쉬면 ✨). 시계(tickRests)가 1초마다 글자만 바꾼다(다시 그리면 끌기가 끊긴다) */
function restDecor(e, it) {
  e.classList.add('is-heal');
  if (!it.rest) return;
  const left = restLeft(it.rest, Date.now());
  e.classList.add('is-resting');
  if (!left) e.classList.add('is-ready');
  e.dataset.at = String(it.rest.at);
  e.dataset.mon = String(it.rest.mon);
  e.setAttribute('aria-label', `${furnById(it.id).ko} — ${monKo(it.rest.mon)} ${left ? '쉬는 중' : '다 쉼'}`);
  e.style.setProperty('--rest-p', String(restDone(left)));
  const box = el('span', 'house-rest');
  box.appendChild(el('span', 'house-rest-ring')); // 남은 시간 링 — 찬 만큼(--rest-p) 파랗게
  box.appendChild(monFace(it.rest.mon, 'house-rest-mon'));
  box.appendChild(el('span', 'house-rest-zz', '💤'));
  box.appendChild(el('span', 'house-rest-time', left ? restClock(left) : '✨'));
  e.appendChild(box);
}

/** 1초마다 — 쉬는 캡슐의 남은 시간 · 다 쉬는 순간 ✨와 말(고른 캡슐이면 도구도 ✨ 받기로) */
function tickRests() {
  if (!ui.open || ui.tab !== 'room') return;
  const now = Date.now();
  for (const e of document.querySelectorAll('#house-body .house-item.is-resting')) {
    const left = restLeft({ at: Number(e.dataset.at) }, now);
    const t = e.querySelector('.house-rest-time');
    if (t) t.textContent = left ? restClock(left) : '✨';
    e.style.setProperty('--rest-p', String(restDone(left)));
    if (!left && !e.classList.contains('is-ready')) {
      e.classList.add('is-ready');
      const ko = monKo(Number(e.dataset.mon));
      say(`✨ ${ko}${iga(ko)} 다 쉬었어요! 캡슐을 눌러 꺼내 봐요`);
      if (ui.sel === Number(e.dataset.u) && !ui.drag) render();
    } else if (left && e.classList.contains('is-ready')) {
      // 태블릿 시계가 뒤로 갔다 — ✨를 끄고 남은 시간으로 (Codex 47차 C)
      e.classList.remove('is-ready');
      if (ui.sel === Number(e.dataset.u) && !ui.drag) render();
    }
  }
}

/** 고른 캡슐의 도구 — 비었으면 🐾 쉬게 하기 · 쉬는 중이면 ⏏️ 꺼내기(두 번) · 다 쉬었으면 ✨ 받기 */
function restTool(it) {
  const b = el('button', 'btn house-tool house-tool-rest');
  b.type = 'button';
  if (!it.rest) {
    b.textContent = '🐾 쉬게 하기';
    b.addEventListener('click', () => { if (stale()) return; ui.pick = it.u; ui.sel = 0; ui.msg = ''; render(); });
  } else if (restLeft(it.rest, Date.now()) > 0) {
    const armed = ui.outArm === it.rest.id; // 꺼내기 두 번은 같은 휴식에서만 — 그 사이 바뀌면 처음부터 (Codex 47차 #2)
    b.textContent = armed ? '⏏️ 정말 꺼내요' : '⏏️ 꺼내기';
    if (armed) b.classList.add('is-arm');
    b.addEventListener('click', () => {
      if (stale()) return;
      if (ui.outArm !== it.rest.id) { ui.outArm = it.rest.id; ui.msg = '한 번 더 누르면 꺼내요 — 1시간을 다 못 쉬면 아무것도 없어요'; render(); return; }
      cancelAt(it.u, it.rest.mon, it.rest.id);
    });
  } else {
    b.textContent = '✨ 받기';
    b.addEventListener('click', () => claimAt(it.u, undefined, it.rest.id));
  }
  return b;
}

/** 🐾 고르기 창 — 데리고 있는 포켓몬(🤝 파트너 먼저, ❤️ 낮은 순) · 다른 캡슐에서 쉬는 포켓몬은 못 고름 */
function pickBox() {
  const sec = el('div', 'house-sec house-pick');
  const head = el('div', 'house-pick-head');
  head.appendChild(el('h3', 'house-h', '🐾 누구를 쉬게 할까요?'));
  const back = el('button', 'btn house-pick-back', '← 방으로');
  back.type = 'button';
  back.addEventListener('click', () => { ui.pick = 0; ui.msg = ''; render(); });
  head.appendChild(back);
  sec.appendChild(head);
  sec.appendChild(el('p', 'house-note', `💊 1시간 쉬면 ❤️ HP가 가득 차고 💤 경험치가 ${REST_EXP} 올라요 — 아주 가끔은 행운도!`));
  const busy = new Set(restsOf(houseNow()).map((r) => r.mon)); // 맡겨 둔 휴식도 쉬는 중
  const partner = Number(getPartner()) || 0;
  const ids = ownedMonIds().sort((a, b) => (b === partner) - (a === partner) || hpOf(a) - hpOf(b) || monLv(b) - monLv(a) || a - b);
  if (!ids.length) {
    sec.appendChild(el('p', 'house-note', '아직 데리고 있는 포켓몬이 없어요 — 공부하고 잡아 와요!'));
    return sec;
  }
  const grid = el('div', 'house-pick-grid');
  for (const id of ids) {
    const b = el('button', `house-pick-mon${busy.has(id) ? ' is-busy' : ''}`);
    b.type = 'button';
    b.dataset.mon = String(id);
    b.appendChild(monFace(id, 'house-pick-pic'));
    b.appendChild(el('span', 'house-pick-name', `${id === partner ? '🤝 ' : ''}${monKo(id)}`));
    b.appendChild(el('span', 'house-pick-stat', `Lv ${monLv(id)} · ❤️ ${hpOf(id)}`));
    const x = monExp(id);
    const bar = el('span', 'house-pick-exp');
    bar.title = `💤 ${x.have}/${x.need}`;
    const fill = el('span', 'house-pick-exp-fill');
    fill.style.width = `${(x.have / x.need) * 100}%`;
    bar.appendChild(fill);
    b.appendChild(bar);
    if (busy.has(id)) {
      b.disabled = true;
      b.appendChild(el('span', 'house-pick-busy', '💤 쉬는 중'));
    } else b.addEventListener('click', () => pickMon(ui.pick, id));
    grid.appendChild(b);
  }
  sec.appendChild(grid);
  return sec;
}

/** ✨ 깜짝 진화 물음 — 갈래마다 단추 · 그대로 두기 (원작의 B 버튼) */
function evoAskBox() {
  const q = ui.evoAsk;
  const ko = monKo(q.mon);
  const sec = el('div', 'house-sec house-evo-ask');
  sec.appendChild(el('h3', 'house-h', '✨ 깜짝 진화!'));
  sec.appendChild(monFace(q.mon, 'house-evo-from'));
  sec.appendChild(el('p', 'house-evo-text', `캡슐에서 푹 쉰 ${ko}${iga(ko)} 진화하려고 해요! 어떻게 할까요?`));
  const row = el('div', 'house-evo-choices');
  for (const to of q.choices) {
    const tk = monKo(to);
    const b = el('button', 'btn btn-primary house-evo-go');
    b.type = 'button';
    b.dataset.to = String(to);
    b.appendChild(monFace(to, 'house-evo-pic'));
    b.appendChild(el('span', '', `${tk}${euro(tk)} 진화`));
    b.addEventListener('click', () => claimAt(q.u, to, q.id));
    row.appendChild(b);
  }
  sec.appendChild(row);
  const keep = el('button', 'btn house-evo-keep', `그대로 두기 — ${ko} 그대로`);
  keep.type = 'button';
  keep.addEventListener('click', () => claimAt(q.u, 0, q.id)); // 물은 그 휴식만 — 옛 창의 "그대로 두기"가 새 휴식을 받지 않게 (Codex 47차 #2)
  sec.appendChild(keep);
  return sec;
}

/** 캡슐 일 하나(넣기·꺼내기·받기) — xp가 저장된 프로필로 한 트랜잭션에서 · run과 같은 바쁨·다시 그리기 · ok는 말(또는 결과 → 말) */
async function runRest(call, ok) {
  if (ui.busy) return null;
  ui.busy = true;
  let r;
  try { r = await call(); } finally { ui.busy = false; }
  ui.msg = r && r.ok ? (typeof ok === 'function' ? ok(r) : ok) : restWhy(r);
  render();
  return r;
}

async function pickMon(u, id) {
  if (stale()) return;
  ui.pick = 0;
  sfxUnlock();
  const ko = monKo(id);
  const r = await runRest(() => restStart(u, id), `🐾 ${ko}${iga(ko)} 캡슐에 들어갔어요 — 1시간 뒤에 와서 꺼내 봐요`);
  if (r && r.ok) {
    sfx.ding();
    const e = document.querySelector(`#house-body .house-item[data-u="${u}"]`); // 쏙 들어가는 모습 (한 번)
    if (e) { e.classList.add('is-enter'); setTimeout(() => e.classList.remove('is-enter'), 900); }
  }
}

async function cancelAt(u, mon, want) {
  ui.outArm = 0;
  ui.sel = 0;
  const ko = monKo(mon);
  const r = await runRest(() => restCancel(u, want), `⏏️ ${ko}${eul(ko)} 꺼냈어요 — 다음엔 1시간을 다 쉬어 봐요`);
  if (r && r.why === 'ready') claimAt(u, undefined, want); // 누르는 사이 다 쉬었다 — 보상 없이 꺼내지 않고 받는다
}

/** ✨ 받기 — 깜짝 진화면 먼저 묻는다(decide) · want = 진우가 본 휴식 id(다르면 'changed' — 받지 않고 지금 캡슐을 다시 그린다) */
async function claimAt(u, decide, want) {
  if (stale()) return;
  sfxUnlock();
  const r = await runRest(() => restClaim(u, decide, want), (x) => claimLines(x, monKo).join(' · '));
  if (!r) return;
  if (r.why === 'decide') {
    ui.evoAsk = { u, id: r.id, mon: r.mon, choices: r.choices };
    ui.sel = 0;
    ui.msg = '';
    render();
    try { sfx.whoosh(); } catch { /* 소리는 없어도 */ }
    return;
  }
  if (ui.evoAsk) { ui.evoAsk = null; render(); }
  markReady();
  if (r.ok && !r.gone) {
    ui.sel = 0;
    await showRestDone({ r, ko: monKo, pic: (id) => characterUrl(id) || artUrl(id) || '', lines: claimLines(r, monKo) });
    render(); // 진화했으면 서랍·고르기 창의 이름이 바뀐다
  }
}

// ───────────────────── 끌기 ─────────────────────

function startDrag(ev, what) {
  if (ui.busy || profileLoading()) return;
  if (ui.drag) cancelDrag(); // 손을 뗀 이벤트를 못 받고 남은 끌기 — 이번 터치는 정상으로
  if (ev.pointerType === 'mouse' && ev.button !== 0) return;
  ui.drag = { ...what, room: roomId(), pid: ev.pointerId, sx: ev.clientX, sy: ev.clientY, x: ev.clientX, y: ev.clientY, moved: false, ghost: null, spot: null, ok: false };
  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp);
  document.addEventListener('pointercancel', onCancel);
  ev.preventDefault();
}

function unbind() {
  document.removeEventListener('pointermove', onMove);
  document.removeEventListener('pointerup', onUp);
  document.removeEventListener('pointercancel', onCancel);
}

function beginDrag(d) {
  d.moved = true;
  const f = furnById(d.id);
  const g = el('div', `house-ghost${f.w > 1 ? ' is-wide' : ''}`, f.emoji);
  const cell = (document.querySelector('#house-body .house-room') || { clientWidth: 320 }).clientWidth / sz().W;
  g.style.fontSize = `${cell * (f.w > 1 ? 1.5 : 0.95)}px`;
  document.body.appendChild(g);
  d.ghost = g;
  if (d.src) d.src.classList.add('is-lifted');
  ui.sel = 0;
  const tools = document.querySelector('#house-body .house-tools');
  if (tools) tools.remove();
}

function showHint(d) {
  const box = document.querySelector('#house-body .house-room');
  const hint = box && box.querySelector('.house-hint');
  if (!hint) return;
  d.spot = dropSpot(sz(), box.getBoundingClientRect(), d.id, d.x, d.y);
  d.ok = !!(d.spot && canPlace(houseShapeNow().size, room(), d.id, d.spot.x, d.spot.y, d.kind === 'move' ? d.u : undefined));
  if (!d.spot) { hint.hidden = true; return; }
  const b = boxOf(sz(), d.id, d.spot.x, d.spot.y);
  Object.assign(hint.style, { left: `${b.left}%`, top: `${b.top}%`, width: `${b.width}%`, height: `${b.height}%` });
  hint.classList.toggle('is-bad', !d.ok);
  hint.hidden = false;
}

function onMove(e) {
  const d = ui.drag;
  if (!d || e.pointerId !== d.pid) return;
  if (!d.moved) {
    if (Math.abs(e.clientX - d.sx) + Math.abs(e.clientY - d.sy) < DRAG_MIN) return;
    beginDrag(d);
  }
  d.x = e.clientX;
  d.y = e.clientY;
  d.ghost.style.transform = `translate(${d.x}px, ${d.y}px) translate(-50%, -60%)`;
  showHint(d);
}

function endDrag(d) {
  if (d.ghost) d.ghost.remove();
  if (d.src) d.src.classList.remove('is-lifted');
  const hint = document.querySelector('#house-body .house-hint');
  if (hint) hint.hidden = true;
}

function onUp(e) {
  const d = ui.drag;
  if (!d || e.pointerId !== d.pid) return;
  ui.drag = null;
  unbind();
  if (!d.moved) { endDrag(d); tap(d); return; }
  if (stale()) { endDrag(d); return; } // 끄는 동안 다른 창 것으로 다시 읽었으면 옛 화면의 자리로 놓지 않는다 (Codex 46차 #1)
  // 손을 뗀 자리로 다시 셈한다 — 마지막으로 움직인 자리를 쓰면 방 밖에서 떼어도 방 안에 놓였다 (Codex 45차 #1)
  d.x = e.clientX;
  d.y = e.clientY;
  showHint(d);
  endDrag(d);
  const f = furnById(d.id);
  if (!d.spot) { ui.msg = ''; render(); return; } // 방 밖에서 손을 떼면 없던 일 (서랍 물건은 서랍에, 놓인 가구는 제자리에)
  if (!d.ok) { say(WHY.spot); render(); return; }
  if (d.kind === 'new') { ui.arm = ''; run((p) => placeRule(p, d.room, d.id, d.spot.x, d.spot.y), placedText(f)); }
  else run((p) => moveRule(p, d.room, d.u, d.spot.x, d.spot.y), `${f.emoji} ${f.ko}${eul(f.ko)} 옮겼어요`);
}

function onCancel(e) {
  const d = ui.drag;
  if (!d || e.pointerId !== d.pid) return;
  cancelDrag();
}

/** 진행 중인 끌기를 없던 일로 — 복제본·칸 표시·흐림·리스너를 모두 정리 */
function cancelDrag() {
  const d = ui.drag;
  if (!d) return;
  ui.drag = null;
  unbind();
  endDrag(d);
}

/** 끌지 않고 눌렀을 때 — 놓인 가구는 고르기(도구가 뜬다), 서랍 물건은 "방을 눌러 놓기" */
function tap(d) {
  if (d.kind === 'move') {
    const it = d.id === HEAL && room() ? room().items.find((i) => i.u === d.u) : null;
    if (it && it.rest && restLeft(it.rest, Date.now()) === 0) { claimAt(it.u, undefined, it.rest.id); return; } // 💊 다 쉰 캡슐 — 누르면 바로 ✨ 받기
    ui.sel = ui.sel === d.u ? 0 : d.u; ui.arm = ''; ui.outArm = 0;
    if (it && it.rest && ui.sel) { const ko = monKo(it.rest.mon); ui.msg = `💤 ${ko}${iga(ko)} 쉬는 중이에요 — ${minsLeft(restLeft(it.rest, Date.now()))}`; } else ui.msg = '';
    render(); return;
  }
  ui.arm = ui.arm === d.id ? '' : d.id;
  ui.sel = 0;
  say('');
  render();
}
