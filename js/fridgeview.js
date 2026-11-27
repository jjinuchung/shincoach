// 🧊 냉장고 화면 (v436 · 2026-11-21 진우 「냉장고 안을 채우고 싶다」 → 아버님 시안 「이대로」)
// 방의 냉장고를 누르고 [🧊 열기] → 화면 가득 앞모습(방 그림과 같은 꼴: 위 작은 문 ❄️ 냉동실 · 아래 큰 문 🥛 냉장실) →
// 문을 누르면 열리며 안을 가까이(냉장실: 선반 셋 · 채소·과일 칸 · 문 칸 셋 / 냉동실: 위 선반 · 서랍 둘 · 양쪽 문 칸) →
// 아래 🧺 내 음식에서 고르고 빛나는 칸을 누르면 넣고, 넣은 음식을 누르면 꺼낸다 · 넣으면 파트너가 옆에서 「맛있겠다!」(💗 없음)
// 🗑️ 버리기 (v443 · 11-26 점검): 🧺에서 고른 음식 옆 [🗑️ 버리기] — 두 번 눌러 하나 · 💰는 안 돌아온다(꽉 찬 실을 다른 음식으로 바꾸는 길)
// 규칙은 house.js(fridgePutRule·fridgeTakeRule·foodDropRule — 저장된 프로필로 한 트랜잭션), 자료는 food.js — 이 파일은 그리고 잇기만.
// 그림판(게임기 gameview와 같은 꼴)은 처음 열 때 만들어 body에 붙인다 — 🏠 집 창(.modal) 위
import { FRIDGE, ZONE_KO, CAP, foodById, foodTray, slotZone } from './food.js';
import { houseOf, fridgePutRule, fridgeTakeRule, foodDropRule, fridgePlaced } from './house.js';
import { houseDo, getProfileSnapshot, getPartner, onProfileReload, profileLoading } from './xp.js';
import { characterUrl, artUrl } from './pokemon.js';
import { sfx, unlock as sfxUnlock } from './sfx.js';

/** 문이 열리는 시간(ms) — css .fz-door transition과 같게 */
const DOOR_MS = 520;
/** 「맛있겠다!」 말풍선이 떠 있는 시간(ms) */
const SAY_MS = 1300;
/** 파트너가 하는 말 */
export const YUM = '맛있겠다!';

// view: 'front' 앞모습 | 'opening' 문 여는 중 | 'inside' 안 · zone: 'cold' | 'frozen' · sel: 고른 음식 id · seq: 열 때마다 올림(닫은 뒤 늦게 끝난 일은 버린다)
// drop: 🗑️ 버리기를 한 번 누른 음식 id(한 번 더 누르면 버린다 — 다른 것을 누르면 풀린다)
const ui = { box: null, open: false, view: 'front', zone: '', sel: '', drop: '', busy: false, seq: 0, sayT: 0, lastFocus: null, onClose: null, wired: false };

const reduce = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
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

/** 저장이 안 됐을 때 말 (순수) — 다른 화면에서 먼저 바꿨을 때도 무엇이 어떻게 됐는지 */
export const FRIDGE_WHY = {
  nofridge: '🧊 방에 냉장고가 없어요 — 냉장고를 방에 놓고 다시 열어요',
  zone: '그 음식은 다른 실에 넣어요 — 아이스크림·얼음·만두는 ❄️ 냉동실이에요',
  taken: '그 칸엔 벌써 음식이 있어요 — 다른 화면에서 넣었나 봐요',
  none: '🧺 내 음식에 그 음식이 없어요 — 다른 화면에서 넣었나 봐요',
  empty: '그 칸이 벌써 비었어요 — 다른 화면에서 꺼냈나 봐요',
  unknown: '다시 해 볼까요?',
  save: '저장이 안 됐어요 — 다시 해 볼까요?',
};

function ensureBox() {
  if (ui.box) return ui.box;
  let box = document.getElementById('fridge');
  if (!box) {
    box = el('div', 'fz');
    box.id = 'fridge';
    box.hidden = true;
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', '냉장고');
    box.innerHTML = '<div class="fz-card"><div class="fz-head"><span class="fz-title">🧊 냉장고</span>'
      + '<button type="button" class="btn fz-back" hidden>← 냉장고 앞으로</button>'
      + '<button type="button" class="btn btn-icon fz-x" aria-label="닫기">✕</button></div>'
      + '<div class="fz-stage"></div><div class="fz-foot"><p class="fz-msg" aria-live="polite"></p><div class="fz-tray" hidden></div></div></div>';
    document.body.appendChild(box);
  }
  box.querySelector('.fz-x').addEventListener('click', () => closeFridge());
  box.querySelector('.fz-back').addEventListener('click', () => {
    if (ui.busy) return;
    const z = ui.zone;
    drawFront();
    focusOn(`.fz-door[data-z="${z}"]`); // ⌨️ 방금 나온 실의 문으로 (단추가 숨어 초점이 body로 빠지지 않게 — Codex 240차 #1)
  });
  ui.box = box;
  if (!ui.wired) {
    ui.wired = true;
    // ⌨️ Esc는 창 전체에서 — 문을 열며 초점을 가진 단추가 사라져도 닫힌다 · 초점은 덮개 안에 가둔다(뒤 🏠 집 창 단추로 빠지지 않게) (Codex 240차 #1)
    window.addEventListener('keydown', (e) => { if (ui.open && e.key === 'Escape') { e.preventDefault(); closeFridge(); } });
    document.addEventListener('focusin', (e) => { if (ui.open && ui.box && !ui.box.contains(e.target)) focusOn('.fz-x'); });
    // 다른 창에서 돌아와 다시 읽으면 지금 칸·바구니를 새로 그린다(고른 음식은 바구니에 남았으면 그대로 — paint가 없어진 것만 푼다) ·
    // 그새 냉장고가 방에서 서랍으로 갔으면 닫는다(넣기·꺼내기를 할 수 없는 화면이 열린 채 남지 않게)
    onProfileReload(() => {
      if (!ui.open) return;
      if (!fridgePlaced(houseOf(getProfileSnapshot()))) { closeFridge(); return; }
      if (ui.view === 'inside') drawInside(ui.zone, true); else if (ui.view === 'front') drawFront();
    });
  }
  return box;
}
/** 덮개 안 단추에 초점 (없으면 그대로) */
function focusOn(sel) {
  const n = ui.box && ui.box.querySelector(sel);
  if (n) { try { n.focus({ preventScroll: true }); } catch { /* 옛 브라우저 */ } }
}
const $q = (s) => ui.box.querySelector(s);
const stage = () => $q('.fz-stage');
function say(t) {
  const m = $q('.fz-msg');
  if (m) m.textContent = t || '';
}

/** 🧊 냉장고 열기 — 앞모습부터 · opts.onClose = 닫을 때 (집 화면이 다시 그린다) */
export function openFridge(opts = {}) {
  ensureBox();
  if (ui.open) return;
  ui.open = true;
  ui.seq += 1;
  ui.busy = false;
  ui.sel = '';
  ui.onClose = opts.onClose || null;
  ui.lastFocus = document.activeElement;
  ui.box.hidden = false;
  drawFront();
  focusOn('.fz-x');
}

/** 닫기 — 집을 닫을 때도(houseview.closeHouse) · 하던 저장은 저장된 대로 */
export function closeFridge() {
  if (!ui.open) return;
  ui.open = false;
  ui.seq += 1;
  ui.busy = false;
  clearTimeout(ui.sayT);
  ui.box.hidden = true;
  stage().innerHTML = '';
  const back = ui.lastFocus;
  ui.lastFocus = null;
  if (back && back.isConnected) { try { back.focus({ preventScroll: true }); } catch { /* 옛 브라우저 */ } }
  const cb = ui.onClose;
  ui.onClose = null;
  if (cb) cb();
}

export function isFridgeOpen() {
  return ui.open;
}

/** 지금 냉장고 안 · 바구니 (저장된 프로필에서 고쳐 읽은 것) */
function nowState() {
  const pf = getProfileSnapshot();
  const fridge = houseOf(pf).fridge || {};
  return { fridge, tray: foodTray(pf.items, fridge) };
}

/** 앞모습 — 위 작은 문 ❄️ 냉동실 · 아래 큰 문 🥛 냉장실 (방 그림 furnart fridge와 같은 꼴) */
function drawFront() {
  ui.view = 'front'; ui.zone = ''; ui.sel = ''; ui.drop = '';
  $q('.fz-title').textContent = '🧊 냉장고';
  $q('.fz-back').hidden = true;
  $q('.fz-tray').hidden = true;
  stage().innerHTML = '<div class="fz-front">'
    + '<div class="fz-part is-frozen"><div class="fz-cav"></div><button type="button" class="fz-door" data-z="frozen" aria-label="냉동실 열기"><span class="fz-magnet"></span><span class="fz-handle"></span><span class="fz-lbl">❄️ 냉동실</span></button></div>'
    + '<div class="fz-part is-cold"><div class="fz-cav"></div><button type="button" class="fz-door" data-z="cold" aria-label="냉장실 열기"><span class="fz-memo"></span><span class="fz-handle"></span><span class="fz-lbl">🥛 냉장실</span></button></div>'
    + '<span class="fz-feet is-l"></span><span class="fz-feet is-r"></span></div>';
  say('냉동실이나 냉장실 문을 눌러 열어 봐요.');
  for (const d of stage().querySelectorAll('.fz-door')) d.addEventListener('click', () => openDoor(d));
}
async function openDoor(d) {
  if (ui.view !== 'front' || ui.busy) return;
  sfxUnlock();
  ui.view = 'opening';
  const seq = ui.seq;
  d.classList.add('is-open');
  await wait(reduce() ? 0 : DOOR_MS);
  if (!ui.open || ui.seq !== seq || ui.view !== 'opening') return;
  drawInside(d.dataset.z === 'frozen' ? 'frozen' : 'cold');
  focusOn('.fz-back'); // ⌨️ 문 단추는 사라졌다 — 초점을 덮개 안에 (Codex 240차 #1)
}

const slotHtml = (key) => `<button type="button" class="fz-slot" data-k="${key}"></button>`;
const slotsOf = (head, n) => Array.from({ length: n }, (_, i) => slotHtml(`${head}:${i}`)).join('');

/** 안 — 클로즈업 · again이면 같은 실을 다시 그린다(다시 읽음) */
function drawInside(zone, again) {
  ui.view = 'inside'; ui.zone = zone;
  if (!again) ui.sel = '';
  ui.drop = ''; // 다시 읽어 그릴 때도 — 「한 번 더!」는 방금 누른 것일 때만
  $q('.fz-title').textContent = zone === 'cold' ? '🥛 냉장실' : '❄️ 냉동실';
  $q('.fz-back').hidden = false;
  const L = FRIDGE[zone];
  let h;
  if (zone === 'cold') {
    h = `<div class="fz-inside is-cold"><div class="fz-box is-cold"><div class="fz-led"></div>${L.shelves.map(([k, n]) => `<div class="fz-shelf">${slotsOf(k, n)}</div>`).join('')}`
      + `<div class="fz-drawer"><span class="fz-dl">${L.drawer[2]}</span>${slotsOf(L.drawer[0], L.drawer[1])}</div></div>`
      + `<div class="fz-doorp">${L.pockets.map(([k, n]) => `<div class="fz-pocket">${slotsOf(k, n)}</div>`).join('')}</div></div>`;
  } else {
    h = `<div class="fz-inside is-frozen"><div class="fz-doorp is-l is-two">${L.left.map(([k, n]) => `<div class="fz-pocket">${slotsOf(k, n)}</div>`).join('')}</div>`
      + `<div class="fz-box is-frozen"><div class="fz-led"></div>${L.shelves.map(([k, n]) => `<div class="fz-shelf">${slotsOf(k, n)}</div>`).join('')}`
      + `${L.drawers.map(([k, n, lb]) => `<div class="fz-drawer is-ice"><span class="fz-dl">${lb}</span>${slotsOf(k, n)}</div>`).join('')}</div>`
      + `<div class="fz-doorp is-r is-two">${L.right.map(([k, n]) => `<div class="fz-pocket">${slotsOf(k, n)}</div>`).join('')}</div></div>`;
  }
  stage().innerHTML = h; // 코드가 만든 틀뿐(아이가 쓴 글 없음)
  // 🤝 파트너가 옆에서 본다 — 그림이 있을 때만(없으면 말풍선도 없이 말 줄만)
  const pid = getPartner();
  const url = pid ? characterUrl(pid) || artUrl(pid) : '';
  if (url) {
    const img = el('img', 'fz-peek');
    img.src = url;
    img.alt = '';
    img.draggable = false;
    stage().appendChild(img);
    const bubble = el('span', 'fz-say', YUM);
    bubble.hidden = true;
    stage().appendChild(bubble);
  }
  for (const s of stage().querySelectorAll('.fz-slot')) s.addEventListener('click', () => onSlot(s));
  paint();
  if (!again) say(zone === 'cold' ? '아래 🧺 내 음식에서 고르고, 빛나는 칸을 눌러 넣어요.' : '아이스크림·얼음·만두는 여기! 🧺 내 음식에서 골라요.');
}

/** 칸·바구니를 저장된 것으로 그린다 · drop = 방금 넣은 칸(톡 떨어지는 모습) */
function paint(drop) {
  if (profileLoading()) return; // 다시 읽는 중 — 다 읽으면 onProfileReload가 다시 그린다
  const { fridge, tray } = nowState();
  if (ui.sel && !(tray[ui.sel] > 0)) ui.sel = '';
  if (ui.drop && ui.drop !== ui.sel) ui.drop = '';
  for (const s of stage().querySelectorAll('.fz-slot')) {
    const f = foodById(fridge[s.dataset.k]);
    s.textContent = '';
    if (f) s.appendChild(el('span', 'fz-food', f.emoji));
    s.setAttribute('aria-label', f ? `${f.ko} — 누르면 꺼내요` : ui.sel ? '빈 칸 — 누르면 넣어요' : '빈 칸');
    s.classList.toggle('is-target', !f && !!ui.sel);
    s.classList.toggle('is-drop', s.dataset.k === drop);
  }
  drawTray(tray, fridge);
}

/**
 * 🧺 바구니가 빈 말 (순수) — 칸을 다 채웠으면 「꽉 찼어요」(마트는 더 못 산다) · 가진 것을 다 넣었으면 「다 넣었어요」 · 하나도 없으면 마트로
 * (다 채운 아이를 살 수 없는 마트로 보내지 않게 — Codex 240차 #2) · placed = 그 실에 넣은 수
 */
export function trayEmptyLine(zone, placed) {
  const ko = ZONE_KO[zone] || '냉장고';
  if (placed >= (CAP[zone] || 0)) return `${ko}이 꽉 찼어요! 넣어 둔 음식을 누르면 🧺 내 음식으로 꺼낼 수 있어요.`;
  if (placed > 0) return `가진 음식은 다 넣었어요 — 더 넣고 싶으면 🛒 가구 상점의 🥕 마트에서 사 와요.`;
  return `${ko}에 넣을 음식이 없어요 — 🛒 가구 상점의 🥕 마트에서 사 와요.`;
}

/** 🧺 내 음식 — 이 실에 넣는 음식 중 바구니에 있는 것 (누르면 고르기 · 다시 누르면 풀기) */
function drawTray(tray, fridge) {
  const t = $q('.fz-tray');
  t.hidden = false;
  t.textContent = '';
  t.appendChild(el('span', 'fz-tray-lbl', '🧺 내 음식'));
  const ids = Object.keys(tray).filter((id) => foodById(id).zone === ui.zone);
  if (!ids.length) {
    t.appendChild(el('span', 'fz-tray-empty', trayEmptyLine(ui.zone, Object.keys(fridge).filter((k) => slotZone(k) === ui.zone).length)));
    return;
  }
  for (const id of ids) {
    const f = foodById(id);
    const b = el('button', `fz-tray-item${ui.sel === id ? ' is-arm' : ''}`);
    b.type = 'button';
    b.dataset.id = id;
    b.setAttribute('aria-pressed', ui.sel === id ? 'true' : 'false');
    b.setAttribute('aria-label', `${f.ko} ${tray[id]}개`);
    if (tray[id] > 1) b.appendChild(el('span', 'fz-c', `×${tray[id]}`));
    b.appendChild(el('span', 'fz-e', f.emoji));
    b.appendChild(el('span', 'fz-n', f.ko));
    b.addEventListener('click', () => {
      if (ui.busy) return;
      ui.sel = ui.sel === id ? '' : id;
      ui.drop = '';
      paint();
      say(ui.sel ? `${f.emoji} ${f.ko}${eul(f.ko)} 어디에 넣을까요? 빛나는 칸을 눌러요.` : '음식을 골라요.');
      const again = $q(`.fz-tray-item[data-id="${id}"]`);
      if (again) { try { again.focus({ preventScroll: true }); } catch { /* 옛 브라우저 */ } }
    });
    t.appendChild(b);
    if (ui.sel === id) t.appendChild(dropBtn(f));
  }
}

/** 🗑️ 버리기를 처음 눌렀을 때 묻는 말 (순수) — 무엇을 버리는지 이름으로 · 💰는 돌아오지 않는다고 */
export const dropAskLine = (f) => `${f.emoji} ${f.ko}${eul(f.ko)} 버릴까요? 한 번 더 누르면 1개를 버려요 — 💰는 돌아오지 않아요.`;
/** 🗑️ 버린 뒤의 말 (순수) */
export const dropDoneLine = (f) => `${f.emoji} ${f.ko} 1개를 버렸어요.`;

/** 🗑️ 고른 음식 버리기 단추 (v443) — 고른 음식 바로 옆 · 한 번 누르면 「한 번 더!」(마트의 사기와 같은 꼴) */
function dropBtn(f) {
  const armed = ui.drop === f.id;
  const d = el('button', `fz-drop${armed ? ' is-arm' : ''}`, armed ? '한 번 더!' : '🗑️ 버리기');
  d.type = 'button';
  d.setAttribute('aria-label', armed ? `${f.ko} 1개 버리기 — 한 번 더 누르면 버려요` : `${f.ko} 버리기`);
  d.addEventListener('click', () => onDrop(f.id));
  return d;
}

/** 🗑️ 버리기 누르기 — 처음엔 묻기만 · 한 번 더 누르면 🧺에서 1개를 버린다(저장된 프로필로 한 트랜잭션 · 그 뒤 저장된 것으로 다시 그림) */
async function onDrop(id) {
  if (ui.busy || ui.view !== 'inside' || profileLoading()) return;
  const f = foodById(id);
  if (!f || ui.sel !== id) return;
  if (ui.drop !== id) {
    ui.drop = id;
    paint();
    say(dropAskLine(f));
    focusOn('.fz-drop');
    return;
  }
  const seq = ui.seq;
  ui.drop = '';
  ui.busy = true;
  let r = null;
  try { r = await houseDo((p) => foodDropRule(p, id)); } catch { r = null; } finally { if (ui.seq === seq) ui.busy = false; }
  if (!ui.open || ui.seq !== seq || ui.view !== 'inside') return;
  paint();
  say(r && r.ok ? dropDoneLine(f) : FRIDGE_WHY[r && r.why] || FRIDGE_WHY.save);
  focusOn(`.fz-tray-item[data-id="${id}"]`); // 남았으면 그 음식으로 · 다 버렸으면 그대로
}

/** 칸 누르기 — 음식이 있으면 꺼내기 · 비었으면 고른 음식 넣기 (저장된 프로필로 한 트랜잭션 · 그 뒤 저장된 것으로 다시 그림) */
async function onSlot(s) {
  if (ui.busy || ui.view !== 'inside' || profileLoading()) return;
  sfxUnlock();
  ui.drop = '';
  const k = s.dataset.k;
  const { fridge } = nowState();
  const had = foodById(fridge[k]);
  if (!had && !ui.sel) { say('먼저 🧺 내 음식에서 음식을 골라요.'); return; }
  const id = ui.sel;
  const seq = ui.seq;
  ui.busy = true;
  let r = null;
  // 잠금은 같은 차례일 때만 푼다 — 닫았다 다시 연 뒤 새 저장의 잠금을 옛 저장이 풀지 않게 (Codex 240차)
  try { r = await houseDo(had ? (p) => fridgeTakeRule(p, k) : (p) => fridgePutRule(p, k, id)); } catch { r = null; } finally { if (ui.seq === seq) ui.busy = false; }
  if (!ui.open || ui.seq !== seq || ui.view !== 'inside') return;
  if (!r || !r.ok) { paint(); say(FRIDGE_WHY[r && r.why] || FRIDGE_WHY.save); return; }
  if (had) {
    const f = foodById(r.id) || had;
    paint();
    say(`${f.emoji} ${f.ko}${eul(f.ko)} 꺼냈어요 → 🧺 내 음식`);
    return;
  }
  const f = foodById(id);
  paint(k);
  say(`${f.emoji} ${f.ko}${eul(f.ko)} 넣었어요!`);
  try { sfx.ding(); } catch { /* 소리는 없어도 */ }
  const b = $q('.fz-say');
  if (b) {
    b.hidden = false;
    clearTimeout(ui.sayT);
    ui.sayT = setTimeout(() => { const n = ui.box && ui.box.querySelector('.fz-say'); if (n) n.hidden = true; }, SAY_MS);
  }
}
