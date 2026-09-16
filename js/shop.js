// 🛒 상점(💰 코인으로 🎀 장식·🎨 염색약·🧪 물약 사기) + 포켓몬 상세(❤️ HP·물약·🤝 파트너·장식 장착·염색) 모달
// 도감(pokedex.js)과 플레이어 파트너 칩에서 연다. 코인·가방·꾸밈·HP 상태는 xp.js 프로필, 카탈로그는 items.js
// 상태가 바뀌면 onChange(monId) 콜백 + document 'shincoach:profilechange' 이벤트 (플레이어 칩·도감이 각자 갱신)
import { GEAR, DYE, POTION, HP, itemById, canBuy, setFigure } from './items.js';
import { coins, itemCount, buyItem, getLook, equipGear, applyDye, caughtCount, rarityOf, rarityAskOf, askRarity, RARITY, getPartner, setPartner, hpOf, usePotion, setGearPos } from './xp.js';
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
  $('mon-partner').addEventListener('click', () => {
    if (!mon) return;
    change(setPartner(mon.id), `🤝 ${mon.ko}${josaIga(mon.ko)} 파트너가 됐어요!`);
  });
}

function notify(id) {
  if (onChange) onChange(id);
  document.dispatchEvent(new CustomEvent('shincoach:profilechange', { detail: { id } }));
}

/** 받침에 따라 이/가 */
function josaIga(word) {
  const code = String(word || '').slice(-1).charCodeAt(0) - 0xAC00;
  if (code < 0 || code > 11171) return '가';
  return code % 28 === 0 ? '가' : '이';
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
  list.appendChild(shopSection('🧪 물약', '파트너 HP를 채워요. 퍼즐 정답을 그냥 보거나 따라 말하기를 넘기거나 하루 빠지면 HP가 깎여요', POTION, boughtId));
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
  const hint = it.kind === 'gear' ? '🎒 내 포켓몬을 눌러 씌워 주세요' : it.kind === 'dye' ? '🎒 내 포켓몬을 눌러 색을 바꿔 주세요' : '❤️ 파트너를 눌러 먹여 주세요';
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

/**
 * 🎀 장식을 끌어서 원하는 자리에 놓기.
 * 그림에서 머리를 자동으로 찾지만 포켓몬에 따라 손·등에 얹히기도 한다 — 그럴 때 아이가 직접 옮긴다.
 * 놓는 순간 그 포켓몬의 자리로 저장되고, 퍼즐·잡기·도감 어디서나 그 자리에 붙는다.
 */
function enableGearDrag() {
  const fig = $('mon-figure');
  const g = fig.querySelector('.mon-gear');
  const hint = $('mon-drag-hint');
  if (!g) { hint.hidden = true; return; }
  hint.hidden = false;
  hint.textContent = '🎀 장식을 끌어서 원하는 자리에 놓아 보세요';
  if (g.dataset.drag === '1') return; // 리스너 중복 방지
  g.dataset.drag = '1';

  g.addEventListener('pointerdown', (e) => {
    if (!mon) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = fig.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    g.classList.add('dragging', 'placed');
    const clamp = (v) => Math.min(0.98, Math.max(0.02, v));
    const put = (ev) => {
      const x = clamp((ev.clientX - rect.left) / rect.width);
      const y = clamp((ev.clientY - rect.top) / rect.height);
      g.style.left = `${x * 100}%`;
      g.style.top = `${y * 100}%`;
      return { x, y };
    };
    let last = put(e);
    const move = (ev) => { ev.preventDefault(); last = put(ev); };
    const up = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', up);
      g.classList.remove('dragging');
      setGearPos(mon.id, last);
      hint.textContent = '✅ 여기에 놓았어요 (다시 끌어서 바꿀 수 있어요)';
      if (onChange) onChange(mon.id);
    };
    // 포인터 캡처 대신 document 리스너 — 퍼즐에서 캡처가 풀리는 문제를 겪었다
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
  });
}

function renderMon(msg, pop) {
  if (!mon) return;
  const look = getLook(mon.id);
  const r = rarityOf(mon.id);
  const isPartner = getPartner() === mon.id;
  const got = mon.caught !== false; // 아직 못 잡은 포켓몬은 등급만 손댈 수 있다
  $('mon-title').textContent = got ? (isPartner ? '🤝 ' : '') + mon.ko : '???';
  $('mon-sub').textContent = got
    ? `${RARITY[r].stars} ${RARITY[r].label} · 잡은 수 ×${caughtCount(mon.id)}` + (look.hp === 0 ? ' · 😴 쉬는 중 — 물약을 먹여 주세요' : isPartner ? ' · 파트너' : '')
    : `${RARITY[r].stars} ${RARITY[r].label} · 아직 못 잡았어요`;
  const fig = $('mon-figure');
  setFigure(fig, mon.url || '', got ? look : null);
  fig.classList.toggle('unknown', !got); // 실루엣 (도감과 같은 모습)
  // 잡기 전에는 HP·장식·염색·파트너가 의미 없다 → 등급만 보여준다
  $('mon-hp-section').hidden = !got;
  for (const id of ['mon-gear', 'mon-dye']) {
    const sec = $(id).closest('.mon-section');
    if (sec) sec.hidden = !got;
  }
  $('mon-partner').hidden = !got;
  enableGearDrag();
  fig.classList.remove('pop');
  if (pop) { void fig.offsetWidth; fig.classList.add('pop'); }
  $('mon-msg').textContent = msg || '';

  // ❤️ HP 바 + 🧪 물약 (가방에 있는 것만, 가득이면 못 먹임)
  const hp = hpOf(mon.id);
  const hpText = $('mon-hp-text');
  hpText.textContent = hp === 0 ? '😴 0 / ' + HP.max : `${hp} / ${HP.max}`;
  hpText.classList.toggle('tired', hp === 0);
  const fill = $('mon-hp-fill');
  fill.style.width = `${Math.round((hp / HP.max) * 100)}%`;
  fill.classList.toggle('low', hp > 0 && hp <= 30);
  const potBox = $('mon-potion');
  potBox.innerHTML = '';
  let anyPotion = false;
  for (const pt of POTION) {
    const n = itemCount(pt.id);
    if (!n) continue;
    anyPotion = true;
    const btn = option(pt.emoji, pt.ko, `가방 ${n}개 · +${pt.heal}`, false, '', () => {
      const r = usePotion(mon.id, pt.id);
      change(r.ok, r.from === 0 ? `${pt.emoji} ${mon.ko}${josaIga(mon.ko)} 기운을 차렸어요! ❤️ ${r.to}` : `${pt.emoji} ❤️ ${r.from} → ${r.to}`);
    });
    if (hp >= HP.max) btn.disabled = true;
    potBox.appendChild(btn);
  }
  if (!anyPotion) potBox.appendChild(el('span', 'mon-empty', hp >= HP.max ? 'HP가 가득해요' : '가방에 물약이 없어요 — 🛒 상점에서 사 보세요 (💰10)'));
  else if (hp >= HP.max) potBox.appendChild(el('span', 'mon-empty', 'HP가 가득해서 지금은 안 먹여도 돼요'));
  // ⭐ 등급: 아이가 생각하는 등급을 고르면 아빠에게 신청이 간다 (바로 바뀌지는 않는다)
  const asked = rarityAskOf(mon.id);
  $('mon-rarity-now').textContent = `${RARITY[r].stars} ${RARITY[r].label}`;
  const rb = $('mon-rarity');
  rb.innerHTML = '';
  for (let want = 1; want <= 4; want++) {
    const info = RARITY[want];
    const btn = option(info.stars, info.label, want === r ? '지금 등급' : (want === asked ? '보낸 신청' : ''), want === r || want === asked, '', () => {
      const now = askRarity(mon.id, want);
      renderMon(now
        ? `⭐ "${mon.ko}은(는) ${RARITY[now].label} 같아요" 라고 아빠에게 보냈어요`
        : '신청을 취소했어요');
    });
    rb.appendChild(btn);
  }
  $('mon-rarity-msg').textContent = asked
    ? `⭐ ${RARITY[asked].label}(으)로 보내달라고 했어요 — 아빠가 보고 정해 줄 거예요`
    : '등급이 이상하다고 생각하면 눌러서 아빠에게 알려 줄 수 있어요';

  const pb = $('mon-partner');
  pb.textContent = isPartner ? '🤝 지금 파트너예요' : '🤝 파트너로!';
  pb.disabled = isPartner;

  // 🎀 장식: [없음] [지금 쓰는 것] [가방에 있는 것들]
  const gearBox = $('mon-gear');
  gearBox.innerHTML = '';
  gearBox.appendChild(option('🚫', '없음', '', !look.gear, 'none', () => { setGearPos(mon.id, null); change(equipGear(mon.id, null), '장식을 벗었어요'); }));
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
