// 🏠 진우네 집 — 2단계 방 화면 (2026-10-10, 아버님 "2단계 가자")
// 방은 포켓몬 게임처럼 위에서 내려다본 모눈 — 바닥 ROOM.W × ROOM.H칸 + 위에 벽 한 줄(ROOM.WALL칸).
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
import { ROOM, FURN, PAINT, PAINT_BASE, FIRST_ROOM, FURN_MAX, START_GIFT, furnById, paintById, canPlace, houseCost, houseBuyCheck, houseBuyRule, houseStartRule, placeRule, moveRule, flipRule, storeRule, paintRule } from './house.js';
import { houseDo, houseNow, houseLeft, coins, itemCount, stones, getProfileSnapshot } from './xp.js';
import { ENGLISH_STONE_HOW } from './items.js';
import { sfx, unlock as sfxUnlock } from './sfx.js';

/** 벽 줄 높이 = 칸 × WALL_RATIO */
export const WALL_RATIO = 1.3;
/** 방 전체 높이(칸 단위) */
export const ROOM_ROWS = WALL_RATIO + ROOM.H;
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

/**
 * 손가락 자리 → 놓을 칸 (순수 — node 테스트가 직접 부른다).
 * rect = 방의 화면 자리 { left, top, width, height } · id = 가구 · px, py = 손가락.
 * 가구 가운데가 손가락 아래에 오게 왼쪽 칸을 고르고, 방 가장자리에서는 방 안으로 당긴다(아이가 끝에 놓기 쉽게).
 * 벽 물건은 벽 줄(y 0)로만 · 바닥 가구는 바닥으로 — 방 밖이거나(바닥 가구가 벽 줄 한가운데 위) 모르는 가구면 null
 */
export function dropSpot(rect, id, px, py) {
  const d = furnById(id);
  if (!d || !rect || !(rect.width > 0)) return null;
  const cell = rect.width / ROOM.W;
  const wallH = cell * WALL_RATIO;
  const rx = px - rect.left;
  const ry = py - rect.top;
  if (rx < 0 || ry < 0 || rx > rect.width || ry > wallH + cell * ROOM.H) return null;
  const span = d.at === 'wall' ? ROOM.WALL : ROOM.W;
  const x = Math.min(span - d.w, Math.max(0, Math.round(rx / cell - d.w / 2)));
  if (d.at === 'wall') return ry <= wallH + cell * 0.5 ? { x, y: 0 } : null; // 벽 바로 아래 반 칸까지는 벽으로 봐준다
  if (ry < wallH - cell * 0.4) return null; // 바닥 가구를 벽 위에
  return { x, y: Math.min(ROOM.H - 1, Math.max(0, Math.floor((ry - wallH) / cell))) };
}

/** 가구 하나의 자리(방에 대한 %) — 화면이 그릴 때 · 끄는 동안 칸 표시 */
export function boxOf(id, x, y) {
  const d = furnById(id);
  if (!d) return null;
  const top = d.at === 'wall' ? (WALL_RATIO - 1) / 2 : WALL_RATIO + y;
  return { left: (x / ROOM.W) * 100, top: (top / ROOM_ROWS) * 100, width: ((d.w) / ROOM.W) * 100, height: (1 / ROOM_ROWS) * 100 };
}

// ───────────────────── 화면 ─────────────────────

// tab: 'room' 🏠 꾸미기 | 'shop' 🛒 가구 상점 · buyArm: 한 번 누른 상점 물건(한 번 더 누르면 산다)
const ui = { open: false, wired: false, busy: false, sel: 0, arm: '', drag: null, msg: '', onClose: null, tab: 'room', buyArm: '' };
const room = () => houseNow().rooms.find((r) => r.id === FIRST_ROOM);

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
}

/** 🏠 집 열기 */
export function openHouse(opts = {}) {
  initHouse();
  ui.open = true;
  ui.onClose = opts.onClose || null;
  ui.sel = 0; ui.arm = ''; ui.msg = ''; ui.buyArm = '';
  ui.tab = opts.tab === 'shop' ? 'shop' : 'room';
  $('house').hidden = false;
  render();
}

export function closeHouse() {
  if (!ui.open) return;
  cancelDrag();
  ui.open = false;
  $('house').hidden = true;
  const cb = ui.onClose;
  ui.onClose = null;
  if (cb) cb();
}

export function isHouseOpen() {
  return ui.open;
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
  const spare = window.matchMedia && window.matchMedia(WIDE).matches ? ROOM_SPARE_WIDE : ROOM_SPARE;
  r.style.maxWidth = `${Math.max(260, ((window.innerHeight * 0.94 - spare) * ROOM.W) / ROOM_ROWS)}px`;
  r.style.setProperty('--cell', `${r.clientWidth / ROOM.W}px`);
  const t = r.querySelector('.house-tools');
  if (t) {
    const w = r.clientWidth;
    const half = t.offsetWidth / 2 + 4;
    t.style.left = `${Math.min(w - half, Math.max(half, (Number(t.dataset.cx) / 100) * w))}px`;
  }
}

function render() {
  if (!ui.open) return;
  if (ui.drag) cancelDrag(); // 끄는 도중 두 번째 손가락으로 다른 것을 눌러 다시 그리면 그 끌기는 없던 일 (Codex 45차 #6 — 끌던 가구가 사라진 판에 남지 않게)
  const st = stones();
  $('house-coins').textContent = `💰 ${coins().toLocaleString('ko-KR')} · 🔷 ${st.math || 0} · 🔶 ${st.english || 0}`;
  renderTabs();
  const body = $('house-body');
  body.innerHTML = '';
  body.classList.toggle('is-shop', ui.tab === 'shop');
  if (ui.tab === 'shop') body.appendChild(shopBox());
  else {
    body.appendChild(roomBox());
    body.appendChild(drawerBox());
    body.appendChild(paintBox());
  }
  say(ui.msg);
  sizeRoom();
}

/** 탭 — 🏠 꾸미기 · 🛒 가구 상점 (바꾸면 고른 것·한 번 누른 것은 지운다) */
function renderTabs() {
  const tabs = $('house-tabs');
  if (!tabs) return;
  tabs.innerHTML = '';
  for (const [key, label] of [['room', '🏠 꾸미기'], ['shop', '🛒 가구 상점']]) {
    const b = el('button', `btn house-tab${ui.tab === key ? ' is-on' : ''}`, label);
    b.type = 'button';
    b.dataset.tab = key;
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', ui.tab === key ? 'true' : 'false');
    b.addEventListener('click', () => goTab(key));
    tabs.appendChild(b);
  }
}
function goTab(key) {
  if (ui.tab === key) return;
  cancelDrag();
  ui.tab = key; ui.sel = 0; ui.arm = ''; ui.buyArm = ''; ui.msg = '';
  render();
}

/** 방 — 벽·바닥·놓인 가구·고른 가구의 도구 */
function roomBox() {
  const rm = room();
  const box = el('div', 'house-room');
  box.style.aspectRatio = `${ROOM.W} / ${ROOM_ROWS}`;
  const wall = el('div', 'house-wall');
  wall.style.height = `${(WALL_RATIO / ROOM_ROWS) * 100}%`;
  wall.style.background = (paintById(rm.wall) || PAINT_BASE.wall).color;
  const floor = el('div', 'house-floor');
  floor.style.top = `${(WALL_RATIO / ROOM_ROWS) * 100}%`;
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
  const b = boxOf(it.id, it.x, it.y);
  const e = el('div', `house-item is-${d.at}${it.u === ui.sel ? ' is-sel' : ''}${it.f ? ' is-flip' : ''}${d.w > 1 ? ' is-wide' : ''}`);
  e.setAttribute('role', 'button');
  e.setAttribute('aria-label', d.ko);
  e.dataset.u = String(it.u);
  e.dataset.id = it.id;
  Object.assign(e.style, { left: `${b.left}%`, top: `${b.top}%`, width: `${b.width}%`, height: `${b.height}%`, zIndex: String(d.at === 'wall' ? 5 : 10 + it.y) });
  e.appendChild(el('span', 'house-emoji', d.emoji));
  e.addEventListener('pointerdown', (ev) => startDrag(ev, { kind: 'move', id: it.id, u: it.u, src: e }));
  return e;
}

/** 고른 가구 위의 도구 — ↔️ 방향 바꾸기 · 📦 서랍에 넣기 */
function toolsEl(it) {
  const d = furnById(it.id);
  const b = boxOf(it.id, it.x, it.y);
  // 벽 물건은 도구를 아래에(위에 두면 방 밖으로 잘린다) · 가로는 sizeRoom이 버튼 폭을 재어 방 안으로 당긴다(양 끝 가구에서 잘리지 않게)
  const below = d.at === 'wall';
  const t = el('div', `house-tools${below ? ' is-below' : ''}`);
  t.dataset.cx = String(b.left + b.width / 2);
  Object.assign(t.style, { left: `${b.left + b.width / 2}%`, top: `${below ? b.top + b.height : b.top}%` });
  const flip = el('button', 'btn house-tool', '↔️ 방향');
  flip.type = 'button';
  flip.addEventListener('click', () => run((p) => flipRule(p, FIRST_ROOM, it.u), `${d.emoji} ${d.ko}의 방향을 바꿨어요`));
  const store = el('button', 'btn house-tool', '📦 서랍에');
  store.type = 'button';
  store.addEventListener('click', () => { ui.sel = 0; run((p) => storeRule(p, FIRST_ROOM, it.u), `${d.emoji} ${d.ko}${eul(d.ko)} 서랍에 넣었어요`); });
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
  const sec = el('div', 'house-sec');
  sec.appendChild(el('h3', 'house-h', '🎨 벽지 · 바닥'));
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
      b.addEventListener('click', () => { if (rm[part] !== o.id) run((p) => paintRule(p, FIRST_ROOM, part, o.id), `${o.ko}${euro(o.ko)} 바꿨어요`); });
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
  max: `한 가지 가구는 ${FURN_MAX}개까지 가질 수 있어요`,
  already: '이사 선물은 벌써 받았어요',
  gift: '먼저 🎁 이사 선물을 받아요 — 🏠 꾸미기의 서랍에 와 있어요',
};
/** 규칙 하나를 저장소에서 — 끝나면 저장된 집으로 다시 그린다(다른 창이 바꾼 것도 보인다) · 결과를 돌려준다 */
async function run(rule, okText) {
  if (ui.busy) return null;
  ui.busy = true;
  let r;
  try { r = await houseDo(rule); } finally { ui.busy = false; }
  ui.msg = r && r.ok ? okText : (WHY[r && r.why] || '다시 해 볼까요?');
  render();
  return r;
}

// ───────────────────── 🛒 가구 상점 ─────────────────────

const STONE_KO = { stone_math: '🔷 수학스톤', stone_english: '🔶 영어스톤' };
const STONE_EMOJI = { stone_math: '🔷', stone_english: '🔶' };
const SHOP_GROUPS = [
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
    const list = g.key === 'paint' ? PAINT : FURN.filter((f) => f.group === g.key);
    for (const it of list) grid.appendChild(shopCard(it, houseBuyCheck(pf, it.id)));
    sec.appendChild(grid);
    wrap.appendChild(sec);
  }
  return wrap;
}

function shopCard(it, c) {
  const paint = !!it.part;
  const done = c.why === 'owned' || c.why === 'max';
  const armed = ui.buyArm === it.id;
  const b = el('button', `house-shop-item${c.why === 'short' || c.why === 'gift' ? ' is-short' : ''}${done ? ' is-done' : ''}${armed ? ' is-arm' : ''}`);
  b.type = 'button';
  b.dataset.buy = it.id;
  if (paint) { const sw = el('span', 'house-shop-swatch'); sw.style.background = it.color; b.appendChild(sw); } else b.appendChild(el('span', 'house-shop-emoji', it.emoji));
  b.appendChild(el('span', 'house-shop-name', it.ko));
  b.appendChild(el('span', 'house-shop-price', priceText(it.id)));
  const have = c.have || 0;
  b.appendChild(el('span', 'house-shop-have', armed ? '한 번 더 누르면 사요' : paint ? (have ? '✔ 있어요' : '') : `가진 것 ${have}/${FURN_MAX}`));
  b.addEventListener('click', () => shopTap(it.id));
  return b;
}

/** 상점 물건 누르기 — 처음 누르면 값을 보여 주고, 한 번 더 누르면 산다 (되팔 수 없으니 두 번) */
async function shopTap(id) {
  if (ui.busy) return;
  const it = furnById(id) || paintById(id);
  const name = it.emoji ? `${it.emoji} ${it.ko}` : `🎨 ${it.ko}`;
  const c = houseBuyCheck(getProfileSnapshot(), id);
  if (!c.ok) {
    ui.buyArm = '';
    ui.msg = c.why === 'short' ? `${name} — ${shortText(c)}가 모자라요. 배우고 다시 와요!` : (WHY[c.why] || '다시 해 볼까요?'); // shortText는 늘 "…개"로 끝난다
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
  const ok = paintById(id) ? `${name}${eul(it.ko)} 샀어요! 🏠 꾸미기에서 칠할 수 있어요` : `${name}${eul(it.ko)} 샀어요! 🏠 꾸미기의 🗄️ 서랍에 들어갔어요`;
  const r = await run((p) => houseBuyRule(p, id), ok);
  if (r && r.ok) sfx.ding();
}

function placeAt(id, rect, px, py) {
  const d = furnById(id);
  const spot = dropSpot(rect, id, px, py);
  if (!spot || !canPlace(room(), id, spot.x, spot.y)) { say(WHY.spot); return; }
  ui.arm = '';
  run((p) => placeRule(p, FIRST_ROOM, id, spot.x, spot.y), `${d.emoji} ${d.ko}${eul(d.ko)} 놓았어요`);
}

// ───────────────────── 끌기 ─────────────────────

function startDrag(ev, what) {
  if (ui.busy) return;
  if (ui.drag) cancelDrag(); // 손을 뗀 이벤트를 못 받고 남은 끌기 — 이번 터치는 정상으로
  if (ev.pointerType === 'mouse' && ev.button !== 0) return;
  ui.drag = { ...what, pid: ev.pointerId, sx: ev.clientX, sy: ev.clientY, x: ev.clientX, y: ev.clientY, moved: false, ghost: null, spot: null, ok: false };
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
  const cell = (document.querySelector('#house-body .house-room') || { clientWidth: 320 }).clientWidth / ROOM.W;
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
  d.spot = dropSpot(box.getBoundingClientRect(), d.id, d.x, d.y);
  d.ok = !!(d.spot && canPlace(room(), d.id, d.spot.x, d.spot.y, d.kind === 'move' ? d.u : undefined));
  if (!d.spot) { hint.hidden = true; return; }
  const b = boxOf(d.id, d.spot.x, d.spot.y);
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
  // 손을 뗀 자리로 다시 셈한다 — 마지막으로 움직인 자리를 쓰면 방 밖에서 떼어도 방 안에 놓였다 (Codex 45차 #1)
  d.x = e.clientX;
  d.y = e.clientY;
  showHint(d);
  endDrag(d);
  const f = furnById(d.id);
  if (!d.spot) { ui.msg = ''; render(); return; } // 방 밖에서 손을 떼면 없던 일 (서랍 물건은 서랍에, 놓인 가구는 제자리에)
  if (!d.ok) { say(WHY.spot); render(); return; }
  if (d.kind === 'new') { ui.arm = ''; run((p) => placeRule(p, FIRST_ROOM, d.id, d.spot.x, d.spot.y), `${f.emoji} ${f.ko}${eul(f.ko)} 놓았어요`); }
  else run((p) => moveRule(p, FIRST_ROOM, d.u, d.spot.x, d.spot.y), `${f.emoji} ${f.ko}${eul(f.ko)} 옮겼어요`);
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
  if (d.kind === 'move') { ui.sel = ui.sel === d.u ? 0 : d.u; ui.arm = ''; say(''); render(); return; }
  ui.arm = ui.arm === d.id ? '' : d.id;
  ui.sel = 0;
  say('');
  render();
}
