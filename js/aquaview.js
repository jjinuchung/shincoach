// 🐠 진우 아쿠아리움 화면 (v399 — 기본안 · 새 시안 「이대로」) — 규칙은 aquarium.js · 그림은 aquaart.js · 저장은 xp.aqua…(houseDo)
// 낚시터 안 놀이 — 홈 낚시 띠 🐠 단추 · 낚시터 🐠 단추 · 🛒 상점 단추로 연다 · 창 id aq-tank (양식 aq-) · 문제 없음 · 시계 없음
// 네 칸: 👀 구경(물고기를 누르면 이름·가장 긴 기록·소개) · 🐟 물고기(넣고 빼기) · 🐚 꾸미기(칸을 눌러 장식 놓기) · 🛒 가게(단계 올리기 · 장식 사기)
// 아이 화면에 남은 수·모자란 수를 쓰지 않는다 — 빈자리는 점선 칸으로만 · 값은 값대로 보여 준다
// 낚시터에서 열면 낚시 시계가 멈춘다(onClose로 되돌림) · 닫으면 장면을 버려 메모리를 돌려준다 · 화면이 안 보이면 그리기를 멈춘다

import { getProfileSnapshot, aquaUpTier, aquaBuy, aquaPut, aquaTake, aquaSlot, onProfileReload } from './xp.js';
import { TANKS, TOP_TIER, DECO, DECO_GROUPS, decoOf, decoCount, aquaOf, aquaFishRows, aquaPhoto } from './aquarium.js';
import { lenLabel, speciesOf } from './fishing.js';
import { AQ_W, AQ_H, makeScene, setFish, setDeco, resetScene, drawScene, fishAt, slotAt, decoThumb } from './aquaart.js';
import { drawFish } from './fishart.js';
import { sfx, unlock } from './sfx.js';

const TABS = [['see', '👀 구경'], ['fish', '🐟 물고기'], ['deco', '🐚 꾸미기'], ['shop', '🛒 가게']];
const FPS_MS = 32;
const WHY_KO = {
  short: '💰가 조금 모자라요 — 공부로 모아요', max: '이건 더 가질 수 없어요', top: '가장 높은 단계예요', unknown: '지금은 살 수 없어요',
  full: '수조가 꽉 찼어요 — 단계를 올리면 자리가 늘어요', none: '낚은 만큼 다 넣었어요', photo: '📸 어름치는 천연기념물이라 벽 사진으로 걸어 뒀어요',
  used: '가진 장식을 다 놓았어요', changed: '수조가 바뀌었어요 — 다시 봐 주세요', bad: '지금은 할 수 없어요', save: '저장이 안 됐어요 — 다시 눌러 봐요',
};
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
const ui = { root: null, cv: null, ctx: null, scene: null, tab: 'see', sel: -1, raf: 0, last: 0, t: 2, gen: 0, busy: false, onClose: null, shown: '', tipAt: 0, thumbs: new Map() };
if (typeof location !== 'undefined' && /[?&]nosw=1/.test(location.search)) window.__aq = ui; // 걷기용

export function isAquaOpen() {
  return !!ui.root && !ui.root.hidden;
}
function build() {
  const root = el('div', 'aq');
  root.id = 'aq-tank';
  root.hidden = true;
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', '진우 아쿠아리움');
  root.innerHTML = `
    <div class="aq-top">
      <h2 class="aq-title"></h2>
      <span class="aq-coins"></span>
      <button type="button" class="aq-x" aria-label="아쿠아리움 닫기">✕</button>
    </div>
    <div class="aq-stage">
      <canvas class="aq-cv" width="${AQ_W * 1.5}" height="${AQ_H * 1.5}" role="img" aria-label="물고기가 헤엄치는 수조"></canvas>
      <div class="aq-tip" role="status" hidden></div>
    </div>
    <div class="aq-tabs" role="tablist"></div>
    <div class="aq-panel" hidden></div>`;
  document.body.appendChild(root);
  ui.root = root;
  ui.cv = root.querySelector('.aq-cv');
  ui.ctx = ui.cv.getContext('2d');
  ui.ctx.setTransform(ui.cv.width / AQ_W, 0, 0, ui.cv.height / AQ_H, 0, 0);
  const tabs = root.querySelector('.aq-tabs');
  for (const [id, ko] of TABS) {
    const b = el('button', 'aq-tab', ko);
    b.type = 'button';
    b.dataset.tab = id;
    b.setAttribute('role', 'tab');
    b.addEventListener('click', () => pickTab(id));
    tabs.appendChild(b);
  }
  root.querySelector('.aq-x').addEventListener('click', () => closeAqua());
  ui.cv.addEventListener('click', onTap);
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isAquaOpen()) closeAqua(); });
  document.addEventListener('visibilitychange', () => { if (isAquaOpen() && !document.hidden) { paintBase(); kick(); } });
  window.addEventListener('resize', () => { if (isAquaOpen()) paintBase(); });
}
const q$ = (s) => ui.root.querySelector(s);
const reduce = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };
function paintBase() {
  if (!ui.scene) return;
  resetScene(ui.scene, ui.ctx);
  frame(ui.t);
}
function frame(t) {
  drawScene(ui.scene, ui.ctx, t, ui.tab === 'deco' ? { slots: true, sel: ui.sel } : {});
}
function loop(now) {
  ui.raf = 0;
  if (!isAquaOpen() || document.hidden || !ui.scene) return;
  if (now - ui.last >= FPS_MS) { ui.last = now; ui.t = now / 1000; frame(ui.t); }
  kick();
}
function kick() {
  if (reduce()) return;
  if (!ui.raf) ui.raf = requestAnimationFrame(loop);
}
const nameOf = (k) => { const sp = speciesOf(k); return sp ? sp.ko : k; };
const artsOf = (a) => a.deco.map((id) => { const d = decoOf(id); return d ? d.art : ''; });
/** 프로필과 장면 맞추기 — 달라진 것만 다시 그린다 (단계가 바뀌면 장면 통째로) */
function sync() {
  const p = getProfileSnapshot();
  const a = aquaOf(p);
  const photo = aquaPhoto(p);
  const tierKey = `${a.tier}|${photo}`;
  const fishKey = a.fish.join();
  const decoKey = a.deco.join();
  let fresh = false;
  if (!ui.scene || ui.shownTier !== tierKey) {
    ui.scene = makeScene(a.tank, { photo });
    ui.shownTier = tierKey;
    ui.shownFish = null;
    ui.shownDeco = null;
    fresh = true;
  }
  if (ui.shownFish !== fishKey) { setFish(ui.scene, a.fish, nameOf); ui.shownFish = fishKey; }
  if (ui.shownDeco !== decoKey) { setDeco(ui.scene, artsOf(a)); ui.shownDeco = decoKey; }
  if (ui.sel >= a.deco.length) ui.sel = -1;
  if (fresh) resetScene(ui.scene, ui.ctx);
  frame(ui.t);
  q$('.aq-title').textContent = `🐠 ${a.tank.ko}`;
  q$('.aq-coins').textContent = `💰 ${Math.max(0, Math.floor(Number(p.coins) || 0)).toLocaleString('ko-KR')}`;
  return { p, a };
}
function say(text, ms = 3200) {
  const t = q$('.aq-tip');
  t.textContent = text;
  t.hidden = !text;
  ui.tipAt += 1;
  const n = ui.tipAt;
  if (text && ms) setTimeout(() => { if (n === ui.tipAt && ui.root) t.hidden = true; }, ms);
}
function pickTab(id) {
  ui.tab = id;
  ui.sel = -1;
  if (ui.scene) ui.scene.picked = null;
  say('');
  render();
}
function onTap(e) {
  if (!ui.scene) return;
  const r = ui.cv.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * AQ_W;
  const y = ((e.clientY - r.top) / r.height) * AQ_H;
  try { unlock(); } catch { /* 소리 없이 */ }
  if (ui.tab === 'deco') {
    const i = slotAt(ui.scene, x, y);
    if (i >= 0) { ui.sel = i; render(); }
    return;
  }
  const f = fishAt(ui.scene, x, y, ui.t);
  ui.scene.picked = f;
  if (f) {
    const row = aquaFishRows(getProfileSnapshot()).find((v) => v.key === f.key);
    const lb = lenLabel(f.key);
    say(row ? `${f.ko} · 가장 긴 기록 ${lb ? `${lb} ` : ''}${row.best} cm${row.intro ? ` — ${row.intro}` : ''}` : f.ko, 6000);
  } else say('');
  if (reduce()) frame(ui.t);
}
/** 물고기 작은 그림 — 종마다 한 번만 */
function fishThumb(key) {
  let src = ui.thumbs.get(key);
  if (!src) {
    src = document.createElement('canvas');
    src.width = 96; src.height = 60;
    try { drawFish(src.getContext('2d'), key, 48, 30, 76, {}); } catch { /* 그림 없이 이름만 */ }
    ui.thumbs.set(key, src);
  }
  const cv = el('canvas', 'aq-fthumb');
  cv.width = 96; cv.height = 60;
  cv.setAttribute('aria-hidden', 'true');
  cv.getContext('2d').drawImage(src, 0, 0);
  return cv;
}
function decoCanvas(art) {
  const cv = el('canvas', 'aq-dthumb');
  cv.width = 120; cv.height = 96;
  cv.setAttribute('aria-hidden', 'true');
  try { decoThumb(cv, art); } catch { /* 그림 없이 이름만 */ }
  return cv;
}
/** 저장 일 한 번 — 끝나기 전에 창을 닫았거나 다시 열었으면 화면은 안 고친다(저장은 그대로) */
async function act(run, done) {
  if (ui.busy) return;
  ui.busy = true;
  const gen = ui.gen;
  ui.root.classList.add('is-busy');
  let r = null;
  try { r = await run(); } catch { r = null; }
  ui.busy = false;
  if (ui.root) ui.root.classList.remove('is-busy');
  if (!isAquaOpen()) return;
  if (gen !== ui.gen) { render(); return; } // 닫았다 다시 열었으면 알림은 빼고 새 상태만 (Codex 201차)
  if (r && r.ok) { if (done) done(r); } else say(WHY_KO[(r && r.why) || 'save'] || WHY_KO.save);
  render();
}
function render() {
  if (!isAquaOpen()) return;
  const { p, a } = sync();
  ui.root.querySelectorAll('.aq-tab').forEach((b) => {
    const on = b.dataset.tab === ui.tab;
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-selected', String(on));
  });
  const box = q$('.aq-panel');
  box.hidden = ui.tab === 'see';
  box.innerHTML = '';
  ui.root.classList.toggle('is-wide', ui.tab === 'see');
  if (ui.tab === 'fish') renderFish(box, p, a);
  else if (ui.tab === 'deco') renderDeco(box, p, a);
  else if (ui.tab === 'shop') renderShop(box, p, a);
  paintBase(); // 패널이 열리고 닫히면 캔버스 크기가 달라져도 방은 그대로다 — 칸 표시만 다시
}
function renderFish(box, p, a) {
  const rows = aquaFishRows(p);
  const inTank = el('div', 'aq-slots');
  a.fish.forEach((k) => {
    const b = el('button', 'aq-in');
    b.type = 'button';
    b.setAttribute('aria-label', `${nameOf(k)} 빼기`);
    b.appendChild(fishThumb(k));
    b.addEventListener('click', () => act(() => aquaTake(k)));
    inTank.appendChild(b);
  });
  for (let i = a.fish.length; i < a.tank.fish; i++) inTank.appendChild(el('span', 'aq-empty'));
  box.appendChild(inTank);
  if (!rows.length) { box.appendChild(el('p', 'aq-note', '🎣 낚시터에서 물고기를 낚아 와요. 낚은 물고기는 여기에 넣을 수 있어요.')); return; }
  const grid = el('div', 'aq-grid');
  for (const r of rows) {
    if (r.photo) continue;
    const b = el('button', 'aq-pick');
    b.type = 'button';
    b.appendChild(fishThumb(r.key));
    b.appendChild(el('span', 'aq-pick-name', r.ko));
    b.disabled = r.put >= r.n || a.fish.length >= a.tank.fish;
    b.addEventListener('click', () => act(() => aquaPut(r.key), () => { try { sfx.success(); } catch { /* 소리 없이 */ } }));
    grid.appendChild(b);
  }
  box.appendChild(grid);
  if (rows.some((r) => r.photo)) box.appendChild(el('p', 'aq-note', '📸 어름치는 천연기념물이라 수조 대신 벽에 사진으로 걸어 뒀어요.'));
}
function renderDeco(box, p, a) {
  if (ui.sel < 0) {
    box.appendChild(el('p', 'aq-note', '수조의 점선 칸을 눌러요. 노란 칸은 큰 장식이 어울려요.'));
    return;
  }
  const cur = a.deco[ui.sel];
  const have = DECO.filter((d) => decoCount(p, d.id) > 0);
  if (cur) {
    const out = el('button', 'aq-btn is-out', `${decoOf(cur).ko} 빼기`);
    out.type = 'button';
    out.addEventListener('click', () => act(() => aquaSlot(ui.sel, '')));
    box.appendChild(out);
  }
  if (!have.length) {
    box.appendChild(el('p', 'aq-note', '아직 장식이 없어요.'));
    const go = el('button', 'aq-btn', '🛒 가게 가기');
    go.type = 'button';
    go.addEventListener('click', () => pickTab('shop'));
    box.appendChild(go);
    return;
  }
  const grid = el('div', 'aq-grid');
  for (const d of have) {
    const free = decoCount(p, d.id) - a.deco.filter((x, i) => x === d.id && i !== ui.sel).length;
    const b = el('button', `aq-pick${cur === d.id ? ' is-on' : ''}`);
    b.type = 'button';
    b.appendChild(decoCanvas(d.art));
    b.appendChild(el('span', 'aq-pick-name', d.ko));
    b.disabled = free <= 0;
    b.addEventListener('click', () => act(() => aquaSlot(ui.sel, d.id), () => { try { sfx.success(); } catch { /* 소리 없이 */ } }));
    grid.appendChild(b);
  }
  box.appendChild(grid);
}
function renderShop(box, p, a) {
  const coins = Math.max(0, Math.floor(Number(p.coins) || 0));
  const up = el('div', 'aq-up');
  if (a.tier >= TOP_TIER) up.appendChild(el('p', 'aq-note', '🌌 가장 높은 단계예요. 우주까지 왔어요!'));
  else {
    const next = TANKS[a.tier];
    const info = el('div', 'aq-up-info');
    info.appendChild(el('b', '', `⬆️ ${next.ko}`));
    info.appendChild(el('span', 'aq-up-mat', next.mat));
    up.appendChild(info);
    const b = el('button', 'aq-btn', `💰 ${next.price.toLocaleString('ko-KR')} 올리기`);
    b.type = 'button';
    b.disabled = coins < next.price;
    b.addEventListener('click', () => act(() => aquaUpTier(next.n), (r) => {
      try { sfx.success(); } catch { /* 소리 없이 */ }
      ui.tab = 'see';
      say(`🎉 ${TANKS[r.tier - 1].ko}이 됐어요!`, 4000);
    }));
    up.appendChild(b);
  }
  box.appendChild(up);
  box.appendChild(el('p', 'aq-note', '한 번 사면 계속 내 것이에요. 칸에서 빼도 없어지지 않아요.'));
  for (const [g, title] of DECO_GROUPS) {
    box.appendChild(el('h3', 'aq-group', title));
    const grid = el('div', 'aq-grid');
    for (const d of DECO.filter((x) => x.group === g)) {
      const n = decoCount(p, d.id);
      const card = el('div', 'aq-item');
      card.appendChild(decoCanvas(d.art));
      card.appendChild(el('span', 'aq-pick-name', d.ko));
      if (n >= d.max) card.appendChild(el('span', 'aq-own', '가졌어요'));
      else {
        const b = el('button', 'aq-btn is-small', `💰 ${d.price.toLocaleString('ko-KR')}`);
        b.type = 'button';
        b.setAttribute('aria-label', `${d.ko} 사기`);
        b.disabled = coins < d.price;
        b.addEventListener('click', () => act(() => aquaBuy(d.id), () => { try { sfx.success(); } catch { /* 소리 없이 */ } say(`${d.ko} 샀어요! 🐚 꾸미기에서 놓아요`); }));
        card.appendChild(b);
        if (n > 0) card.appendChild(el('span', 'aq-own', `가방에 ${n}개`));
      }
      grid.appendChild(card);
    }
    box.appendChild(grid);
  }
}
/** 🐠 열기 — tab 처음 칸 · onClose 닫을 때 (낚시터가 시계를 되돌린다) */
export function openAqua({ tab, onClose } = {}) {
  if (!ui.root) build();
  if (isAquaOpen()) return;
  ui.gen += 1;
  ui.onClose = onClose || null;
  ui.sel = -1;
  const a = aquaOf(getProfileSnapshot());
  ui.tab = tab || (a.fish.length ? 'see' : 'fish');
  ui.root.hidden = false;
  say('');
  try { render(); } catch (err) { closeAqua(); throw err; }
  ui.last = 0;
  kick();
  try { q$('.aq-x').focus(); } catch { /* 무시 */ }
}
export function closeAqua() {
  if (!isAquaOpen()) return;
  ui.root.hidden = true;
  ui.gen += 1;
  if (ui.raf) { cancelAnimationFrame(ui.raf); ui.raf = 0; }
  ui.scene = null; // 그려 둔 그림을 놓아 메모리를 돌려준다
  q$('.aq-panel').replaceChildren();
  ui.shownTier = null;
  ui.thumbs.clear();
  const f = ui.onClose;
  ui.onClose = null;
  if (f) { try { f(); } catch { /* 무시 */ } }
}
onProfileReload(() => { if (isAquaOpen()) render(); }); // 다른 창에서 바꾼 것을 따라간다
