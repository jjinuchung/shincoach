// 🛒 상점(💰 코인으로 🎀 장식·🎨 염색약 사기) + 포켓몬 상세(장식 장착·염색) 모달
// 도감(pokedex.js)에서 연다. 코인·가방·꾸밈 상태는 xp.js 프로필, 카탈로그는 items.js
import { GEAR, DYE, itemById, canBuy, setFigure } from './items.js';
import { coins, itemCount, buyItem, getLook, equipGear, applyDye, caughtCount, rarityOf, RARITY } from './xp.js';
import { sfx, unlock } from './sfx.js';

const $ = (id) => document.getElementById(id);
let onChange = null; // (monId|null) 코인·꾸밈이 바뀌면 도감이 그 자리만 다시 그리도록
let mon = null;      // 상세 모달에 열린 포켓몬 { id, ko, url }

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

export function initShop(ctx) {
  onChange = (ctx && ctx.onChange) || null;
  $('shop-close').addEventListener('click', closeShop);
  $('shop').addEventListener('click', (e) => { if (e.target === $('shop')) closeShop(); }); // 바깥을 누르면 닫힘
  $('mon-close').addEventListener('click', closeMon);
  $('mon').addEventListener('click', (e) => { if (e.target === $('mon')) closeMon(); });
  $('mon-to-shop').addEventListener('click', () => { closeMon(); openShop(); });
}

function notify(id) {
  if (onChange) onChange(id);
}

// ───────────────────── 🛒 상점 ─────────────────────

export function openShop() {
  renderShop('');
  $('shop').hidden = false;
}

export function closeShop() {
  $('shop').hidden = true;
}

export function isShopOpen() {
  return !$('shop').hidden || !$('mon').hidden;
}

function renderShop(msg, boughtId) {
  $('shop-coins').textContent = `💰 ${coins()}`;
  $('shop-msg').textContent = msg || '';
  const list = $('shop-list');
  list.innerHTML = '';
  list.appendChild(shopSection('🎀 장식', '포켓몬 머리에 씌워요. 한 번 사면 계속 내 것 — 다른 포켓몬에게 옮길 수도 있어요', GEAR, boughtId));
  list.appendChild(shopSection('🎨 염색약', '포켓몬 색을 바꿔요. 한 번 쓰면 없어지고, 원래 색으로 돌아가는 건 공짜', DYE, boughtId));
}

function shopSection(title, sub, items, boughtId) {
  const sec = el('div');
  sec.appendChild(el('div', 'shop-section-title', title));
  sec.appendChild(el('div', 'shop-section-sub', sub));
  const grid = el('div', 'shop-grid');
  for (const it of items) {
    const btn = el('button', 'shop-item' + (it.id === boughtId ? ' bought' : ''));
    btn.type = 'button';
    btn.appendChild(el('span', 'em', it.emoji));
    btn.appendChild(el('span', 'nm', it.ko));
    btn.appendChild(el('span', 'pr', `💰${it.price}`));
    const n = itemCount(it.id);
    if (n > 0) btn.appendChild(el('span', 'own', `가방에 ${n}개`));
    const { ok, short } = canBuy(it.id, coins());
    if (!ok) {
      btn.disabled = true;
      btn.appendChild(el('span', 'short', `💰${short} 더 모으면`));
    }
    btn.addEventListener('click', () => buy(it.id));
    grid.appendChild(btn);
  }
  sec.appendChild(grid);
  return sec;
}

function buy(id) {
  const it = itemById(id);
  if (!it || !buyItem(id)) { renderShop('💰 코인이 조금 모자라요. 문장을 더 배우고 다시 와요!'); return; }
  unlock();
  sfx.ding();
  const hint = it.kind === 'gear' ? '🎒 내 포켓몬을 눌러 씌워 주세요' : '🎒 내 포켓몬을 눌러 색을 바꿔 주세요';
  renderShop(`${it.emoji} ${it.ko}${josaEul(it.ko)} 샀어요! ${hint}`, id);
  notify(null);
}

/** 받침에 따라 을/를 */
function josaEul(word) {
  const code = String(word || '').slice(-1).charCodeAt(0) - 0xAC00;
  if (code < 0 || code > 11171) return '를';
  return code % 28 === 0 ? '를' : '을';
}

// ───────────────────── 포켓몬 상세: 장식·염색 ─────────────────────

/** 잡은 포켓몬 상세 열기. m = { id, ko, url } (url 없으면 그림 없이) */
export function openMon(m) {
  mon = m;
  renderMon('');
  $('mon').hidden = false;
}

export function closeMon() {
  $('mon').hidden = true;
  mon = null;
}

function renderMon(msg, pop) {
  if (!mon) return;
  const look = getLook(mon.id);
  const r = rarityOf(mon.id);
  $('mon-title').textContent = mon.ko;
  $('mon-sub').textContent = `${RARITY[r].stars} ${RARITY[r].label} · 잡은 수 ×${caughtCount(mon.id)}`;
  const fig = $('mon-figure');
  setFigure(fig, mon.url || '', look);
  fig.classList.remove('pop');
  if (pop) { void fig.offsetWidth; fig.classList.add('pop'); }
  $('mon-msg').textContent = msg || '';

  // 🎀 장식: [없음] [지금 쓰는 것] [가방에 있는 것들]
  const gearBox = $('mon-gear');
  gearBox.innerHTML = '';
  gearBox.appendChild(option('🚫', '없음', '', !look.gear, 'none', () => change(equipGear(mon.id, null), '장식을 벗었어요')));
  let anyGear = false;
  for (const g of GEAR) {
    const n = itemCount(g.id);
    const on = look.gear === g.id;
    if (!n && !on) continue;
    anyGear = true;
    gearBox.appendChild(option(g.emoji, g.ko, on ? '쓰는 중' : `가방 ${n}개`, on, '', () => {
      if (on) return;
      change(equipGear(mon.id, g.id), `${g.emoji} ${g.ko}${josaEul(g.ko)} 씌웠어요!`);
    }));
  }
  if (!anyGear) gearBox.appendChild(el('span', 'mon-empty', '가방에 장식이 없어요 — 🛒 상점에서 사 보세요'));

  // 🎨 염색: [원래 색] [지금 색] [가방에 있는 염색약]
  const dyeBox = $('mon-dye');
  dyeBox.innerHTML = '';
  dyeBox.appendChild(option('⚪', '원래 색', '공짜', !look.dye, 'none', () => change(applyDye(mon.id, null), '원래 색으로 돌아왔어요')));
  let anyDye = false;
  for (const d of DYE) {
    const n = itemCount(d.id);
    const on = look.dye === d.id;
    if (!n && !on) continue;
    anyDye = true;
    dyeBox.appendChild(option(d.emoji, d.ko, on ? '지금 색' : `가방 ${n}개`, on, '', () => {
      if (on) return;
      change(applyDye(mon.id, d.id), `${d.emoji} ${d.ko}으로 물들였어요! (염색약 하나 씀)`);
    }));
  }
  if (!anyDye) dyeBox.appendChild(el('span', 'mon-empty', '가방에 염색약이 없어요 — 🛒 상점에서 사 보세요'));
}

function option(emoji, name, sub, on, extraCls, onClick) {
  const btn = el('button', 'mon-opt' + (on ? ' on' : '') + (extraCls ? ' ' + extraCls : ''));
  btn.type = 'button';
  btn.appendChild(el('span', 'em', emoji));
  btn.appendChild(el('span', 'nm', name));
  if (sub) btn.appendChild(el('span', 'cnt', sub));
  btn.addEventListener('click', onClick);
  return btn;
}

function change(ok, msg) {
  if (!mon) return;
  if (!ok) { renderMon('앗, 가방에 없어요'); return; }
  unlock();
  sfx.ding();
  renderMon(msg, true);
  notify(mon.id);
}
