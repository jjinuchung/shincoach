// 🧑 진우 캐릭터 1단계 — 👕 옷장 탭 화면 (2026-10-17, 아버님 "진행해")
// 처음이면 만들기(피부·머리·눈·기본 옷을 고르고 이름표 → [🧑 다 만들었어요] → 🎁 첫 운동화) ·
// 만든 뒤에는 갈아입기(누르면 바로 저장) · 📛 이름표 · 👕 옷 가게(두 번 눌러 사면 바로 입는다 — 되팔지 않으니 두 번)
// 규칙은 avatar.js(순수), 저장은 houseview의 run(= xp.houseDo, 저장된 프로필로 한 트랜잭션) — 이 파일은 그리고 잇기만.
// 방 안의 캐릭터(서기·끌기·🤝 파트너)는 houseview가 그린다 — 끌기가 가구와 한 줄기라서.
// 🧢 v293: 🧤 장갑 칸 · [🧢 트레이너 차림 한 번에 입기] — 진우가 누를 때만(앱이 모습을 바꾸지 않는다) · 이미 그 차림이면 숨김
import { SKINS, HAIRS, HAIR_COLORS, EYES, WEAR, SLOT_KO, SLOT_EMPTY_OK, LOOK_BASE, NAME_MAX, OUTFITS, wearById, avatarOf, wearBuyCheck, wearCost, avatarMakeRule, avatarLookRule, avatarNameRule, wearBuyRule, outfitRule, wearingOutfit } from './avatar.js';
import { avatarSvg } from './avatarart.js';
import { sfx, unlock as sfxUnlock } from './sfx.js';

const STONE_EMOJI = { stone_math: '🔷', stone_english: '🔶' };
const STONE_KO = { stone_math: '🔷 수학스톤', stone_english: '🔶 영어스톤' };
/** 모습 고르기 칸 — 만들 때도, 만든 뒤에도(무료로 다시 바꾼다) */
const LOOK_GROUPS = [
  { key: 'skin', ko: '피부색', list: SKINS },
  { key: 'hair', ko: '머리 모양', list: HAIRS },
  { key: 'hairColor', ko: '머리색', list: HAIR_COLORS },
  { key: 'eyes', ko: '눈', list: EYES },
];
/** 옷 고르기 칸 차례 */
const WEAR_SLOTS = ['top', 'bottom', 'shoes', 'gloves', 'hat', 'bag', 'cape'];

// draft: 만들기 화면에서 고르는 중인 모습(저장 전) · buyArm: 한 번 누른 가게 옷 · uid: 그림마다 다른 번호
const cs = { draft: null, buyArm: '', uid: 0 };

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
function jong(w) {
  const c = String(w || '').slice(-1).charCodeAt(0) - 0xAC00;
  return c < 0 || c > 11171 ? -1 : c % 28;
}
const eul = (w) => (jong(w) > 0 ? '을' : '를');
const svgOf = (look, opts = {}) => avatarSvg(look, { uid: `c${cs.uid++}`, ...opts });

/**
 * 차례대로 하기 (순수 — 시험이 부른다) — 앞 일이 끝난(실패해도) 뒤에 다음 일을 시작한다.
 * 옷장에서 이름표를 고치고(바꿈 → 저장 중) 바로 옷을 누르면 저장 중이라 두 번째 누르기가 소리 없이 버려졌다 (Codex 90차 #2) —
 * 옷장의 저장은 모두 이 줄로 (houseview의 run은 저장 중이면 null을 돌려준다)
 */
export function makeSerial() {
  let tail = Promise.resolve();
  return (fn) => {
    const p = tail.then(() => fn());
    tail = p.then(() => {}, () => {});
    return p;
  };
}
const serial = makeSerial();
/** 옷장의 저장 하나 — 줄을 서서 */
const runQ = (ctx, rule, okText) => serial(() => ctx.run(rule, okText, ALIAS));

/** 값 말 — "💰 2,000 · 🔷 5 · 🔶 1" (순수) */
export function wearPriceText(id) {
  const c = wearCost(id);
  return [`💰 ${c.coins.toLocaleString('ko-KR')}`, ...Object.keys(c.items).map((s) => `${STONE_EMOJI[s]} ${c.items[s]}`)].join(' · ');
}
/** 모자란 것 말 — "코인 300개, 🔶 영어스톤 1개" (순수) */
export function wearShortText(c) {
  const parts = [];
  if (c.shortCoins > 0) parts.push(`코인 ${c.shortCoins.toLocaleString('ko-KR')}개`);
  for (const s of Object.keys(c.shortStones || {})) parts.push(`${STONE_KO[s]} ${c.shortStones[s]}개`);
  return parts.join(', ');
}
/** 입었을 때의 말 — 모자는 썼어요 · 신발은 신었어요 · 가방은 멨어요 · 망토는 둘렀어요 (순수) */
export const WEAR_VERB = { top: '입었어요', bottom: '입었어요', shoes: '신었어요', gloves: '꼈어요', hat: '썼어요', bag: '멨어요', cape: '둘렀어요' };
/** 벗었을 때의 말 (비울 수 있는 곳만) */
export const OFF_VERB = { gloves: '벗었어요', hat: '벗었어요', bag: '내려놓았어요', cape: '벗었어요' };
const euro = (w) => (jong(w) > 0 && jong(w) !== 8 ? '으로' : '로');
/** 이름표에 보일 말 — 비었으면 "나" */
export const tagOf = (name) => name || '나';

/** 옷장 옷 — 그 곳에 입을 수 있는 것: 처음부터 있는 옷 + 산 옷 (+ 비울 수 있는 곳은 "없음") (순수) */
export function closetOf(profile, slot) {
  const bag = (profile && profile.items) || {};
  const list = WEAR.filter((w) => w.slot === slot && (w.free || (Number(bag[w.id]) || 0) > 0)).map((w) => w.id);
  return SLOT_EMPTY_OK.includes(slot) ? ['', ...list] : list;
}
/** 👕 가게에 보일 옷 — 아직 안 산 것(처음부터 있는 옷은 빼고) · 특별한 옷은 따로 (순수) */
export function shopOf(profile) {
  const bag = (profile && profile.items) || {};
  const left = WEAR.filter((w) => !w.free && !((Number(bag[w.id]) || 0) > 0));
  return { plain: left.filter((w) => !w.special).map((w) => w.id), special: left.filter((w) => w.special).map((w) => w.id) };
}

/**
 * 👕 옷장 탭 — ctx = { profile: 지금 프로필(스냅숏), run(rule, okText, alias) → Promise<결과>, say(말), redraw(), goTab(tab) }
 * alias = 이 화면에서 다르게 말할 why (houseview의 WHY 열쇠)
 */
export function closetBox(ctx) {
  const pf = ctx.profile;
  const a = avatarOf(pf);
  return a.made ? dressBox(ctx, pf, a) : makeBox(ctx);
}

const ALIAS = { none: 'wearNone', owned: 'wearOwned', already: 'meAlready', made: 'meMade', unknown: 'meUnknown' };

/** 고르기 단추 하나 — 그 칸만 바꾼 모습을 작게 그린다 */
function optBtn(look, key, val, name, on, onPick, sub) {
  const b = el('button', `closet-opt${on ? ' is-on' : ''}${val === '' ? ' is-none' : ''}`);
  b.type = 'button';
  b.dataset.key = key;
  b.dataset.val = val;
  b.setAttribute('aria-pressed', on ? 'true' : 'false');
  if (val === '') b.appendChild(el('span', 'closet-x', '✖️'));
  else b.insertAdjacentHTML('beforeend', svgOf({ ...look, [key]: val }, { shadow: false }));
  b.appendChild(el('span', 'closet-opt-name', name));
  if (sub) b.appendChild(el('span', 'closet-opt-sub', sub));
  b.addEventListener('click', () => onPick(val));
  return b;
}
function group(title, kids) {
  const sec = el('div', 'house-sec closet-group');
  sec.appendChild(el('h3', 'house-h', title));
  const row = el('div', 'closet-opts');
  for (const k of kids) row.appendChild(k);
  sec.appendChild(row);
  return sec;
}
/** 거울 — 큰 그림 + 이름표 + 이름 칸 */
function mirror(look, name, onName) {
  const box = el('div', 'closet-mirror');
  const stage = el('div', 'closet-stage');
  stage.insertAdjacentHTML('beforeend', svgOf(look, { title: `${tagOf(name)}의 모습` }));
  box.appendChild(stage);
  const tag = el('div', 'closet-tag', tagOf(name));
  box.appendChild(tag);
  const lab = el('label', 'closet-name');
  lab.appendChild(el('span', '', '📛 이름표'));
  const inp = el('input', 'closet-name-input');
  inp.id = 'closet-name';
  inp.maxLength = NAME_MAX * 2; // 그림 글자는 두 칸으로 셀 수 있다 — 자르기는 규칙(nameOf)이
  inp.value = name;
  inp.placeholder = '나';
  inp.autocomplete = 'off';
  inp.addEventListener('input', () => { tag.textContent = tagOf(inp.value.trim()); });
  if (onName) inp.addEventListener('change', () => onName(inp.value));
  lab.appendChild(inp);
  box.appendChild(lab);
  return { box, inp };
}

/** 처음 만들기 — 저장 전엔 고른 모습(draft)만 바뀐다 · [🧑 다 만들었어요]에서 한 번에 저장 */
function makeBox(ctx) {
  const look = { ...LOOK_BASE, ...(cs.draft || {}) };
  const wrap = el('div', 'closet');
  const intro = el('div', 'house-gift closet-intro');
  intro.appendChild(el('p', 'house-gift-text', '🧑 나를 만들어 볼까요? 마음에 드는 모습을 골라요 — 다 만들면 🎁 선물이 있어요!'));
  wrap.appendChild(intro);
  const { box, inp } = mirror(look, cs.draft && typeof cs.draft.name === 'string' ? cs.draft.name : '', null);
  inp.addEventListener('input', () => { cs.draft = { ...look, name: inp.value }; });
  const done = el('button', 'btn btn-primary closet-make', '🧑 다 만들었어요');
  done.type = 'button';
  done.addEventListener('click', async () => {
    sfxUnlock();
    const chosen = {};
    for (const k of ['skin', 'hair', 'hairColor', 'eyes', 'top', 'bottom', 'shoes', 'gloves', 'hat', 'bag', 'cape']) chosen[k] = look[k];
    const r = await runQ(ctx, (p) => avatarMakeRule(p, chosen, inp.value, Date.now()),
      (res) => (res.gift ? `🎉 내 캐릭터가 생겼어요! 🎁 첫 선물 ${wearById(res.gift).ko}${eul(wearById(res.gift).ko)} 받아서 신었어요 — 🏠 방에 서 있어요` : '🎉 내 캐릭터가 생겼어요! 🏠 방에 서 있어요'));
    if (r && r.ok) { cs.draft = null; sfx.ding(); }
  });
  box.appendChild(done);
  wrap.appendChild(box);
  const groups = el('div', 'closet-groups');
  const pick = (key) => (val) => { cs.draft = { ...look, name: inp.value, [key]: val }; ctx.redraw(); };
  for (const g of LOOK_GROUPS) groups.appendChild(group(g.ko, g.list.map((o) => optBtn(look, g.key, o.id, o.ko, look[g.key] === o.id, pick(g.key)))));
  for (const slot of ['top', 'bottom']) {
    const ids = WEAR.filter((w) => w.slot === slot && w.free).map((w) => w.id);
    groups.appendChild(group(SLOT_KO[slot], ids.map((id) => optBtn(look, slot, id, wearById(id).ko, look[slot] === id, pick(slot)))));
  }
  groups.appendChild(el('p', 'house-note', '다 만들면 옷장에 🧢 트레이너 차림이 있어요. 다른 모자·가방·망토는 👕 옷 가게에서 살 수 있어요.'));
  wrap.appendChild(groups);
  return wrap;
}

/** 만든 뒤 — 갈아입기(누르면 바로 저장) · 이름표 · 👕 옷 가게 */
function dressBox(ctx, pf, a) {
  const look = a.look;
  const wrap = el('div', 'closet');
  const save = (patch, text) => runQ(ctx, (p) => avatarLookRule(p, patch, Date.now()), text);
  const { box } = mirror(look, a.name, (v) => runQ(ctx, (p) => avatarNameRule(p, v, Date.now()), (r) => `📛 이름표를 "${tagOf(r.name)}"${euro(tagOf(r.name))} 바꿨어요`));
  const home = el('button', 'btn closet-home', '🏠 방에서 보기');
  home.type = 'button';
  home.addEventListener('click', () => ctx.goTab('room', a.spot ? a.spot.room : undefined)); // 캐릭터가 선 층으로 (Codex 90차)
  box.appendChild(home);
  // 🧢 한 번에 입기 — 옷만 바꾼다(얼굴은 그대로) · 이미 그 차림이면 숨긴다 (v293)
  for (const o of OUTFITS) {
    if (wearingOutfit(pf, look, o.id)) continue;
    const b = el('button', 'btn closet-outfit', `${o.emoji} ${o.ko} 한 번에 입기`);
    b.type = 'button';
    // 입힐 옷은 저장하는 순간의 프로필로 고른다 — 그린 때와 운동화가 달라도 차림 전체가 입혀지게 (🔍 Codex 99차 #1)
    b.addEventListener('click', () => { sfxUnlock(); runQ(ctx, (p) => outfitRule(p, o.id, Date.now()), `${o.emoji} ${o.ko}${euro(o.ko)} 갈아입었어요`); });
    box.appendChild(b);
  }
  wrap.appendChild(box);
  const groups = el('div', 'closet-groups');
  for (const g of LOOK_GROUPS) {
    groups.appendChild(group(g.ko, g.list.map((o) => optBtn(look, g.key, o.id, o.ko, look[g.key] === o.id, (val) => { if (look[g.key] !== val) save({ [g.key]: val }, `${g.ko}${eul(g.ko)} 바꿨어요`); }))));
  }
  for (const slot of WEAR_SLOTS) {
    const ids = closetOf(pf, slot);
    if (ids.length < 2 && SLOT_EMPTY_OK.includes(slot)) continue; // 아직 산 것이 없는 곳(모자·가방·망토)은 숨긴다 — 가게에 있다
    groups.appendChild(group(`👕 ${SLOT_KO[slot]}`, ids.map((id) => {
      const nm = id ? wearById(id).ko : '없음';
      return optBtn(look, slot, id, nm, look[slot] === id, (val) => {
        if (look[slot] === val) return;
        save({ [slot]: val }, val ? `${nm}${eul(nm)} ${WEAR_VERB[slot]}` : `${SLOT_KO[slot]}${eul(SLOT_KO[slot])} ${OFF_VERB[slot]}`);
      });
    })));
  }
  groups.appendChild(shopBox(ctx, pf, look));
  wrap.appendChild(groups);
  return wrap;
}

/** 👕 옷 가게 — 안 산 옷만 · 처음 누르면 값, 한 번 더 누르면 산다(사면 바로 입는다) */
function shopBox(ctx, pf, look) {
  const sec = el('div', 'house-sec closet-shop');
  sec.appendChild(el('h3', 'house-h', '👕 옷 가게'));
  const { plain, special } = shopOf(pf);
  if (!plain.length && !special.length) {
    sec.appendChild(el('p', 'house-note', '가게 옷을 다 샀어요! 옷장에서 골라 입어요.'));
    return sec;
  }
  sec.appendChild(el('p', 'house-note', '사면 바로 입어요 — 산 옷은 언제든 공짜로 갈아입어요. 옷은 되팔 수 없어서 두 번 눌러 사요.'));
  const grid = (ids) => {
    const g = el('div', 'house-shop-grid');
    for (const id of ids) g.appendChild(shopCard(ctx, pf, look, id));
    return g;
  };
  if (plain.length) sec.appendChild(grid(plain));
  if (special.length) {
    sec.appendChild(el('h3', 'house-h', '✨ 특별한 옷'));
    sec.appendChild(el('p', 'house-note', '코인과 함께 🔷 수학스톤 · 🔶 영어스톤도 들어요 — 수학도 영어도 골고루!'));
    sec.appendChild(grid(special));
  }
  return sec;
}
function shopCard(ctx, pf, look, id) {
  const w = wearById(id);
  const c = wearBuyCheck(pf, id);
  const armed = cs.buyArm === id;
  const b = el('button', `house-shop-item closet-shop-item${c.why === 'short' ? ' is-short' : ''}${armed ? ' is-arm' : ''}`);
  b.type = 'button';
  b.dataset.wear = id;
  b.insertAdjacentHTML('beforeend', svgOf({ ...look, [w.slot]: id }, { shadow: false, cls: 'closet-shop-art' }));
  b.appendChild(el('span', 'house-shop-name', w.ko));
  b.appendChild(el('span', 'house-shop-price', wearPriceText(id)));
  b.appendChild(el('span', 'house-shop-have', armed ? '한 번 더 누르면 사요' : ''));
  b.addEventListener('click', () => shopTap(ctx, id));
  return b;
}
async function shopTap(ctx, id) {
  const w = wearById(id);
  const name = `👕 ${w.ko}`;
  const c = wearBuyCheck(ctx.profile, id);
  if (!c.ok) {
    cs.buyArm = '';
    ctx.say(c.why === 'short' ? `${name} — ${wearShortText(c)}가 모자라요. 배우고 다시 와요!` : '다시 해 볼까요?');
    ctx.redraw();
    return;
  }
  if (cs.buyArm !== id) {
    cs.buyArm = id;
    ctx.say(`${name} — ${wearPriceText(id)}. 한 번 더 누르면 사요`);
    ctx.redraw();
    return;
  }
  cs.buyArm = '';
  sfxUnlock();
  const r = await runQ(ctx, (p) => wearBuyRule(p, id, Date.now()), `${name}${eul(w.ko)} 샀어요! 바로 ${WEAR_VERB[w.slot]}`);
  if (r && r.ok) sfx.ding();
}

/** 다른 탭으로 가거나 집을 닫으면 고르던 것을 푼다 (만들기 중 고른 모습은 남긴다 — 실수로 탭을 눌러도 처음부터 다시 고르지 않게) */
export function closetReset() {
  cs.buyArm = '';
}
