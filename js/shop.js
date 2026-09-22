// 🛒 상점(💰 코인으로 🎀 장식·🎨 염색약·🧪 물약 사기) + 포켓몬 상세(❤️ HP·물약·🤝 파트너·장식 장착·염색) 모달
// 도감(pokedex.js)과 플레이어 파트너 칩에서 연다. 코인·가방·꾸밈·HP 상태는 xp.js 프로필, 카탈로그는 items.js
// 상태가 바뀌면 onChange(monId) 콜백 + document 'shincoach:profilechange' 이벤트 (플레이어 칩·도감이 각자 갱신)
import { GEAR, DYE, POTION, HP, KEYSTONE, MEGASTONE, MUSHROOM, SOUP_MUSHROOMS, SHOP_BALLS, STONE_SHOP, STONES, itemById, canBuy, priceText, setFigure } from './items.js';
import { inventory, coins, itemCount, buyItem, getLook, equipGear, applyDye, caughtCount, rarityOf, rarityAskOf, askRarity, RARITY, getPartner, setPartner, hpOf, usePotion, setGearPos, hasKeystone, hasMegaStone, hasGmax, equipMega, makeSoup } from './xp.js';
import { formsOf, formUrl, ensureForm, subjectOf } from './pokemon.js';
import { sfx, unlock } from './sfx.js';

const $ = (id) => document.getElementById(id);
let onChange = null; // (monId|null) 코인·꾸밈이 바뀌면 도감이 그 자리만 다시 그리도록
let mon = null;      // 상세 모달에 열린 포켓몬 { id, ko, url }
let gearDrag = null; // 🎀 끌고 있는 장식 { move, up, g } — 손 뗀 이벤트를 놓쳐도 정리할 수 있게 들고 있는다

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
  // 화면이 꺼지거나 다른 앱으로 넘어가면 손 뗀 이벤트가 안 온다 → 끌고 있던 장식을 여기서 놓는다
  document.addEventListener('visibilitychange', () => { if (document.hidden) endGearDrag(); });
  window.addEventListener('blur', endGearDrag);
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
  $('shop-coins').textContent = `💰 ${coins()} · ${STONES.map((s) => `${s.emoji}${itemCount(s.id)}`).join(' ')}`;
  $('shop-msg').textContent = msg || '';
  const list = $('shop-list');
  list.innerHTML = '';
  list.appendChild(shopSection('🧤 스톤 상점', '코인 + 스톤으로만 살 수 있어요. 🔷 수학스톤은 수학 개념을 통과하면, 🔶 영어스톤은 복습을 끝내면 생겨요 — 🧭 레이더: 다음 수학 잡기에 희귀 이상 포켓몬이 한 마리 나와요', STONE_SHOP, boughtId));
  list.appendChild(shopSection('🎀 장식', '포켓몬 머리에 씌워요. 한 번 사면 계속 내 것 — 다른 포켓몬에게 옮길 수도 있어요', GEAR, boughtId));
  list.appendChild(shopSection('🎨 염색약', '포켓몬 색을 바꿔요. 한 번 쓰면 없어지고, 원래 색으로 돌아가는 건 공짜', DYE, boughtId));
  list.appendChild(shopSection('🧪 물약', '파트너 HP를 채워요. 퍼즐 정답을 그냥 보거나 따라 말하기를 넘기거나 하루 빠지면 HP가 깎여요', POTION, boughtId));
  list.appendChild(shopSection('🔴 몬스터볼', '등급이 올라갈수록 잡기 쉬워요. 던지면 없어져요 — 🔵 슈퍼볼 1.5배 · 🟡 하이퍼볼 2배 · 🟣 마스터볼은 반드시 잡혀요 (🌟 황금 볼은 🔁 복습으로만)', SHOP_BALLS, boughtId));
  list.appendChild(shopSection('⭐ 메가진화', '🔑 키스톤은 한 번만 사면 계속 쓰고, 💠 메가스톤은 포켓몬에게 끼워요. 배틀에서 한 마리만 메가진화할 수 있어요 (🍄 거다이맥스는 살 수 없고 학습으로 모아요)', [KEYSTONE, MEGASTONE], boughtId));
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
    btn.appendChild(el('span', 'pr', priceText(it)));
    const n = itemCount(it.id);
    if (n > 0) btn.appendChild(el('span', 'own', `가방에 ${n}개`));
    const { ok, short, shortStones } = canBuy(it.id, coins(), inventory());
    if (!ok) {
      btn.disabled = true;
      const parts = [short > 0 ? `💰${short}` : '', ...(shortStones || []).map((s) => `${s.emoji}${s.n}`)].filter(Boolean);
      btn.appendChild(el('span', 'short', `${parts.join(' + ')} 더 모으면`));
    }
    btn.addEventListener('click', () => buy(it.id));
    grid.appendChild(btn);
  }
  sec.appendChild(grid);
  return sec;
}

async function buy(id) {
  const it = itemById(id);
  // 살 수 있는지는 저장소에서 판정한다 (두 창에서 같은 코인으로 두 번 사지 못하게)
  if (!it || !await buyItem(id)) { renderShop(it && it.stones ? '💰 코인이나 🧤 스톤이 조금 모자라요. 배우고 다시 와요!' : '💰 코인이 조금 모자라요. 문장을 더 배우고 다시 와요!'); return; }
  unlock();
  sfx.ding();
  const hint = it.hint || (it.kind === 'gear' ? '🎒 내 포켓몬을 눌러 씌워 주세요' : it.kind === 'dye' ? '🎒 내 포켓몬을 눌러 색을 바꿔 주세요' : it.kind === 'ball' ? '🎯 잡기 화면에서 고를 수 있어요' : it.kind === 'mega' ? '🎒 내 포켓몬을 눌러 끼워 주세요' : '❤️ 파트너를 눌러 먹여 주세요'); // 물건마다 카탈로그의 hint가 우선
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
    // 앞선 드래그가 끝나지 못하고 남아 있으면 먼저 정리한다.
    // 화면이 꺼지거나 다른 앱으로 넘어가면 안드로이드는 pointerup을 안 준다 →
    // 남은 리스너가 이후 모든 손가락 움직임을 장식에 따라붙게 만들고 스크롤도 막는다 (퍼즐과 같은 원인)
    endGearDrag();
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
      endGearDrag();
      setGearPos(mon.id, last);
      hint.textContent = '✅ 여기에 놓았어요 (다시 끌어서 바꿀 수 있어요)';
      if (onChange) onChange(mon.id);
    };
    // 포인터 캡처 대신 document 리스너 — 퍼즐에서 캡처가 풀리는 문제를 겪었다
    gearDrag = { move, up, g };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
  });
}

/** 끌고 있던 장식 정리 — 놓았을 때·화면이 꺼졌을 때·다음에 다시 잡을 때 모두 여기로 */
function endGearDrag() {
  const d = gearDrag;
  if (!d) return;
  gearDrag = null;
  document.removeEventListener('pointermove', d.move);
  document.removeEventListener('pointerup', d.up);
  document.removeEventListener('pointercancel', d.up);
  d.g.classList.remove('dragging');
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
    : `${RARITY[r].stars} ${RARITY[r].label} · 아직 못 잡았어요${subjectOf(mon.id) === 'math' ? ' · 🔢 수학에서 만나요' : ' · 🎤 영어 퍼즐에서 만나요'}`;
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
  renderForms();

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

/**
 * ⭐ 메가진화 · 거다이맥스.
 * 원작 규칙 그대로: 메가는 🔑 키스톤 + 💠 메가스톤, 거다이맥스는 🍄 다이버섯으로 만든 🍲 다이스프.
 * 잡은 포켓몬만 (변신은 내 포켓몬이 하는 것), 변신 그림은 여기서 처음 끼울 때 받아 온다.
 */
function renderForms() {
  const sec = $('mon-form-section');
  const forms = mon && mon.caught !== false ? formsOf(mon.id) : null;
  if (!forms) { sec.hidden = true; return; }
  sec.hidden = false;

  const megaOn = hasMegaStone(mon.id);
  const gmaxOn = hasGmax(mon.id);
  const shrooms = itemCount(MUSHROOM.id);
  $('mon-form-now').textContent = megaOn ? '💠 메가진화 준비 완료' : gmaxOn ? '🍲 거다이맥스 준비 완료' : '아직 변신할 수 없어요';

  // 변신한 모습 미리보기 (받아둔 그림이 있을 때만)
  const fig = $('mon-form-figure');
  const shown = megaOn ? 'mega' : gmaxOn ? 'gmax' : null;
  const url = shown ? formUrl(mon.id, shown) : null;
  if (url) { setFigure(fig, url, null); fig.hidden = false; } else fig.hidden = true;

  const box = $('mon-form');
  box.innerHTML = '';
  const notes = [];

  if (forms.mega) {
    if (!hasKeystone()) {
      notes.push(`🔑 키스톤이 있어야 메가진화를 할 수 있어요 — 🛒 상점에서 ${KEYSTONE.price}코인`);
    } else if (megaOn) {
      box.appendChild(option('💠', '메가스톤 빼기', '가방으로 돌아와요', true, '', async () => {
        await equipMega(mon.id, false);
        change(true, '💠 메가스톤을 뺐어요');
      }));
    } else {
      const n = itemCount(MEGASTONE.id);
      const btn = option('💠', '메가스톤 끼우기', n ? `가방 ${n}개` : `🛒 상점 ${MEGASTONE.price}코인`, false, '', async () => {
        if (!await equipMega(mon.id, true)) { renderMon('💠 가방에 메가스톤이 없어요 — 🛒 상점에서 살 수 있어요'); return; }
        await ensureForm(mon.id, 'mega').catch(() => null); // 그림은 처음 한 번만 받는다 (실패해도 변신은 됨)
        change(true, `💠 ${mon.ko}${josaIga(mon.ko)} 메가진화할 수 있게 됐어요! 배틀에서 써 보세요`);
      });
      if (!n) btn.disabled = true;
      box.appendChild(btn);
    }
  }

  if (forms.gmax) {
    if (gmaxOn) {
      notes.push('🍲 다이스프를 먹어서 거다이맥스할 수 있어요');
    } else {
      const btn = option('🍲', '다이스프 먹이기', `🍄 ${shrooms}/${SOUP_MUSHROOMS}개`, false, '', async () => {
        if (!await makeSoup(mon.id)) { renderMon(`🍄 다이버섯이 ${SOUP_MUSHROOMS}개 있어야 해요 (지금 ${itemCount(MUSHROOM.id)}개)`); return; }
        await ensureForm(mon.id, 'gmax').catch(() => null);
        change(true, `🍲 ${mon.ko}${josaIga(mon.ko)} 거다이맥스할 수 있게 됐어요!`);
      });
      if (shrooms < SOUP_MUSHROOMS) btn.disabled = true;
      box.appendChild(btn);
      notes.push('🍄 다이버섯은 살 수 없어요 — 🔁 복습 완주, ⚔️ 배틀 승리, 🏁 여행 도착에서 나와요');
    }
  }

  if (!box.children.length && !notes.length) notes.push('이 포켓몬은 변신할 수 없어요');
  $('mon-form-msg').textContent = notes.join('  ·  ');
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
