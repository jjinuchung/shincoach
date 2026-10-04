// 🏪 5일장 화면 — 🔀 퓨전 가게 (두 마리를 앞(모양) + 뒤(색)로 섞기) · 내 퓨전(분리) · 퓨전 도감(이름 바꾸기)
// 규칙은 fusion.js(순수)와 db.js(트랜잭션), 화면은 여기. 🎒 도감의 "🏪 5일장" 버튼에서 연다 (장이 안 서는 날도 열려 다음 장날을 알려 준다)
import { marketOpen, nextMarket, blendName, fusionId, recolor, FUSION_COST, NAME_MAX } from './fusion.js';
import { ROSTER, loadCharacters } from './pokemon.js';
import { haveCount, itemCount, fuseMons, unfuseMon, renameFusion, fusionList } from './xp.js';
import { STONE_MATH, STONE_ENGLISH } from './items.js';
import { getFusionArt, putFusionArt } from './db.js';
import { todayKey } from './track.js';
import { sfx, unlock } from './sfx.js';
import { burstConfetti } from './catch.js';

const $ = (id) => document.getElementById(id);
const KO = new Map(ROSTER.map((m) => [m.id, m.ko]));
const ART = 240; // 퓨전 그림 크기 (시험작과 같다)

const ui = { open: false, today: '', a: null, b: null, picking: null, busy: false, result: null, renaming: null, splitArm: null, urlById: new Map(), onClose: null };
const artUrls = new Map(); // fid → objectURL (만든 그림)
const making = new Map();  // fid → Promise (같은 그림을 겹쳐 만들지 않게)

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/** 퓨전 이름 — 아이가 지은 이름, 없으면 앞 두 글자 + 끝 한 글자 */
export function fusionName(f) {
  return (f && f.name) || blendName(KO.get(f.a) || '', KO.get(f.b) || '');
}

/** 끝 글자 받침 (없으면 0, 한글이 아니면 -1) */
function jong(w) {
  const c = String(w || '').slice(-1).charCodeAt(0) - 0xAC00;
  return c < 0 || c > 11171 ? -1 : c % 28;
}
const iga = (w) => (jong(w) > 0 ? '이' : '가');
const rang = (w) => (jong(w) > 0 ? '이랑' : '랑');
const wagwa = (w) => (jong(w) > 0 ? '과' : '와');
const euro = (w) => (jong(w) > 0 && jong(w) !== 8 ? '으로' : '로'); // ㄹ 받침은 "로"

// ───────────── 🎨 퓨전 그림 (기기 안에서 만들고 blobs에 둔다) ─────────────

async function imageData(url) {
  const img = new Image();
  img.src = url;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = ART; c.height = ART;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, ART, ART);
  return g.getImageData(0, 0, ART, ART);
}

/**
 * 🔀 퓨전 그림 주소 — 이미 만든 것(메모리 → blobs) 아니면 두 포켓몬 그림으로 지금 만든다 (모양 A + 색 B).
 * 포켓몬 그림을 아직 못 받았으면 null (칸에는 🔀) — 다음에 열 때 다시
 */
export async function fusionArtUrl(a, b, urlById) {
  const fid = fusionId(a, b);
  if (artUrls.has(fid)) return artUrls.get(fid);
  if (making.has(fid)) return making.get(fid);
  const job = (async () => {
    let blob = null;
    try { blob = await getFusionArt(fid); } catch { blob = null; }
    if (!blob) {
      const ua = urlById.get(Number(a)), ub = urlById.get(Number(b));
      if (!ua || !ub) return null;
      const [A, B] = await Promise.all([imageData(ua), imageData(ub)]);
      const F = recolor(A, B);
      const c = document.createElement('canvas');
      c.width = F.width; c.height = F.height;
      c.getContext('2d').putImageData(new ImageData(F.data, F.width, F.height), 0, 0);
      blob = await new Promise((res) => c.toBlob(res, 'image/webp', 0.88));
      if (!blob) return null;
      try { await putFusionArt(fid, blob); } catch { /* 저장 못 해도 이번엔 보인다 */ }
    }
    const u = URL.createObjectURL(blob);
    artUrls.set(fid, u);
    return u;
  })().catch(() => null).finally(() => making.delete(fid));
  making.set(fid, job);
  return job;
}

/** 퓨전 그림 칸 — 먼저 🔀, 그림이 되면 바꿔 끼운다 */
export function fusionFigure(a, b, urlById, cls = 'fz-art') {
  const box = el('div', cls, '🔀');
  fusionArtUrl(a, b, urlById).then((u) => {
    if (!u) return;
    box.textContent = '';
    const img = el('img');
    img.src = u;
    img.alt = fusionName({ a, b });
    img.draggable = false;
    box.appendChild(img);
  });
  return box;
}

// ───────────── 열기 · 닫기 ─────────────

export function initMarket() {
  const close = () => { if (!ui.busy) closeMarket(); };
  $('market-close').addEventListener('click', close);
  $('market').addEventListener('click', (e) => { if (e.target === $('market')) close(); });
}

/**
 * 🏪 5일장 열기
 * @param {{today?:string, onClose?:()=>void}} [opts] today는 시험용 (보통은 오늘)
 */
export async function openMarket(opts = {}) {
  ui.open = true;
  ui.today = opts.today || todayKey();
  ui.onClose = opts.onClose || null;
  ui.a = null; ui.b = null; ui.picking = null; ui.result = null; ui.renaming = null; ui.splitArm = null;
  $('market-msg').textContent = '';
  $('market').hidden = false;
  const chars = await loadCharacters().catch(() => []);
  ui.urlById = new Map(chars.map((c) => [c.id, c.url]));
  render();
}

export function closeMarket() {
  if (!ui.open) return;
  ui.open = false;
  $('market').hidden = true;
  const cb = ui.onClose;
  ui.onClose = null;
  if (cb) cb();
}

export function isMarketOpen() {
  return ui.open;
}

function say(t) { $('market-msg').textContent = t || ''; }

/** 자정을 넘겼으면 오늘을 다시 — 장이 닫혔을 수 있다 (시험용 today는 그대로) */
function stillOpen() {
  return marketOpen(ui.today);
}

// ───────────── 그리기 ─────────────

function render() {
  if (!ui.open) return;
  const nm = itemCount(STONE_MATH.id), ne = itemCount(STONE_ENGLISH.id);
  $('market-stones').textContent = `${STONE_MATH.emoji} ${nm} · ${STONE_ENGLISH.emoji} ${ne}`;
  const body = $('market-body');
  body.innerHTML = '';
  const open = stillOpen();
  $('market-title').textContent = open ? '🏪 5일장 — 오늘 장날!' : '🏪 5일장';
  if (!open) body.appendChild(closedCard());
  else {
    body.appendChild(shopCard(nm, ne));
  }
  body.appendChild(dexCard(open));
}

function dateText(key) {
  const [, m, d] = key.split('-').map(Number);
  return `${m}월 ${d}일`;
}

function closedCard() {
  const nx = nextMarket(ui.today);
  const card = el('div', 'market-sec market-closed');
  card.appendChild(el('div', 'market-sign', '🏪 오늘은 장이 안 열려요'));
  if (nx) card.appendChild(el('p', 'market-next', `다음 장날: ${dateText(nx.key)} (${nx.days === 1 ? '내일' : `${nx.days}일 뒤`})`));
  card.appendChild(el('p', 'market-note', '5일장은 5일마다 열려요. 장날에는 🔀 퓨전 가게에서 포켓몬 두 마리를 섞어 새 포켓몬을 만들고, 만든 퓨전을 다시 나눌 수도 있어요. 퓨전 도감과 이름 바꾸기는 언제든 돼요.'));
  return card;
}

/** 🔀 퓨전 가게 — 앞(모양)·뒤(색) 고르기 → 미리 보기 → 섞기 */
function shopCard(nm, ne) {
  const card = el('div', 'market-sec');
  card.appendChild(el('h3', 'market-h', '🔀 퓨전 가게'));
  card.appendChild(el('p', 'market-note', `데리고 있는 포켓몬 두 마리를 섞어요. 앞 포켓몬의 모양에 뒤 포켓몬의 색 — 순서를 바꾸면 다른 포켓몬이 돼요. 값: ${STONE_MATH.emoji}${FUSION_COST.stone_math} + ${STONE_ENGLISH.emoji}${FUSION_COST.stone_english} (두 마리가 하나가 되고, 장날에 나누면 돌아와요)`));

  if (ui.result) card.appendChild(resultCard());

  const slots = el('div', 'fz-slots');
  slots.appendChild(slotBtn('a', '앞 · 모양'));
  const swap = el('button', 'btn fz-swap', '⇄');
  swap.type = 'button';
  swap.title = '순서 바꾸기';
  swap.setAttribute('aria-label', '앞뒤 순서 바꾸기');
  swap.disabled = !(ui.a && ui.b);
  swap.addEventListener('click', () => { [ui.a, ui.b] = [ui.b, ui.a]; ui.result = null; render(); });
  slots.appendChild(swap);
  slots.appendChild(slotBtn('b', '뒤 · 색'));
  card.appendChild(slots);

  if (ui.picking) card.appendChild(pickerGrid(ui.picking));
  else if (ui.a && ui.b) card.appendChild(previewBox(nm, ne));
  return card;
}

function slotBtn(which, label) {
  const id = which === 'a' ? ui.a : ui.b;
  const btn = el('button', 'fz-slot' + (ui.picking === which ? ' on' : '') + (id ? ' got' : ''));
  btn.type = 'button';
  btn.appendChild(el('span', 'fz-slot-label', label));
  if (id) {
    const u = ui.urlById.get(id);
    if (u) { const img = el('img'); img.src = u; img.alt = KO.get(id) || ''; img.draggable = false; btn.appendChild(img); }
    btn.appendChild(el('span', 'fz-slot-name', KO.get(id) || String(id)));
  } else btn.appendChild(el('span', 'fz-slot-empty', '눌러서 고르기'));
  btn.addEventListener('click', () => { unlock(); ui.picking = ui.picking === which ? null : which; ui.result = null; say(''); render(); }); // 새로 고르면 앞의 말은 지운다
  return btn;
}

/** 데리고 있는 포켓몬 고르기 (다른 칸에 고른 종은 빼고) */
function pickerGrid(which) {
  const other = which === 'a' ? ui.b : ui.a;
  const box = el('div', 'fz-picker');
  const list = ROSTER.filter((m) => m.id !== other && haveCount(m.id) > 0).sort((x, y) => x.id - y.id);
  if (!list.length) { box.appendChild(el('p', 'market-note', '데리고 있는 포켓몬이 없어요 — 공부하고 잡아 와요!')); return box; }
  box.appendChild(el('p', 'market-note', which === 'a' ? '앞(모양)이 될 포켓몬을 골라요' : '뒤(색)가 될 포켓몬을 골라요'));
  const grid = el('div', 'fz-grid');
  for (const m of list) {
    const b = el('button', 'fz-pick');
    b.type = 'button';
    const u = ui.urlById.get(m.id);
    if (u) { const img = el('img'); img.src = u; img.alt = ''; img.loading = 'lazy'; img.draggable = false; b.appendChild(img); }
    b.appendChild(el('span', 'nm', m.ko));
    const n = haveCount(m.id);
    if (n > 1) b.appendChild(el('span', 'cnt', `×${n}`));
    b.addEventListener('click', () => {
      if (which === 'a') ui.a = m.id; else ui.b = m.id;
      ui.picking = which === 'a' && !ui.b ? 'b' : which === 'b' && !ui.a ? 'a' : null; // 빈 칸이 남았으면 이어서 고르기
      render();
    });
    grid.appendChild(b);
  }
  box.appendChild(grid);
  return box;
}

/** 섞기 전 미리 보기 — 그림·이름을 먼저 보고 섞는다 */
function previewBox(nm, ne) {
  const box = el('div', 'fz-preview');
  const name = blendName(KO.get(ui.a) || '', KO.get(ui.b) || '');
  box.appendChild(fusionFigure(ui.a, ui.b, ui.urlById, 'fz-art big'));
  box.appendChild(el('div', 'fz-name', name));
  box.appendChild(el('div', 'market-note', `${KO.get(ui.a)}의 모양 · ${KO.get(ui.b)}의 색`));
  const enough = nm >= FUSION_COST.stone_math && ne >= FUSION_COST.stone_english;
  const go = el('button', 'btn btn-primary fz-go', enough ? `🔀 섞기! (${STONE_MATH.emoji}1 + ${STONE_ENGLISH.emoji}1)` : `${!(nm >= 1) ? STONE_MATH.emoji : ''}${!(ne >= 1) ? STONE_ENGLISH.emoji : ''} 스톤이 모자라요`);
  go.type = 'button';
  go.disabled = !enough || ui.busy;
  go.addEventListener('click', doFuse);
  box.appendChild(go);
  if (!enough) box.appendChild(el('p', 'market-note', '🔷 수학스톤은 수학 개념을 통과하면, 🔶 영어스톤은 복습을 끝내면 생겨요'));
  return box;
}

function resultCard() {
  const r = ui.result;
  const f = fusionList().find((x) => x.fid === r.fid) || { a: r.a, b: r.b, fid: r.fid };
  const box = el('div', 'fz-result');
  box.appendChild(el('div', 'fz-result-title', r.first ? '✨ 새 포켓몬이 태어났어요! 퓨전 도감에 들어갔어요' : '✨ 또 만들었어요!'));
  box.appendChild(fusionFigure(f.a, f.b, ui.urlById, 'fz-art big'));
  box.appendChild(nameRow(f));
  return box;
}

/** 이름 + ✏️ 바꾸기 (그 자리에서 고친다) */
function nameRow(f) {
  const row = el('div', 'fz-name-row');
  if (ui.renaming === f.fid) {
    const input = el('input', 'fz-name-input');
    input.id = 'market-rename-input';
    input.type = 'text';
    input.maxLength = NAME_MAX;
    input.value = fusionName(f);
    input.setAttribute('aria-label', '새 이름');
    const save = el('button', 'btn btn-primary', '저장');
    save.type = 'button';
    const cancel = el('button', 'btn', '그대로');
    cancel.type = 'button';
    const submit = async () => {
      if (ui.busy) return;
      ui.busy = true;
      const r = await renameFusion(f.fid, input.value);
      ui.busy = false;
      ui.renaming = null;
      say(r.ok ? (r.name ? `✏️ "${r.name}"${euro(r.name)} 바꿨어요` : '✏️ 원래 이름으로 돌아왔어요') : '저장을 못 했어요 — 한 번 더');
      render();
    };
    save.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
    cancel.addEventListener('click', () => { ui.renaming = null; render(); });
    row.append(input, save, cancel);
    setTimeout(() => input.focus(), 0);
  } else {
    row.appendChild(el('span', 'fz-name', fusionName(f)));
    const edit = el('button', 'btn fz-rename', '✏️ 이름 바꾸기');
    edit.type = 'button';
    edit.addEventListener('click', () => { ui.renaming = f.fid; render(); });
    row.appendChild(edit);
  }
  return row;
}

/** 📖 퓨전 도감 — 만든 적 있는 퓨전 전부 (장날이면 데리고 있는 것을 나눌 수 있다) */
function dexCard(open) {
  const list = fusionList();
  const card = el('div', 'market-sec');
  card.appendChild(el('h3', 'market-h', `📖 퓨전 도감 (${list.length}종)`));
  if (!list.length) { card.appendChild(el('p', 'market-note', open ? '아직 만든 퓨전이 없어요 — 위에서 두 마리를 골라 섞어 봐요!' : '아직 만든 퓨전이 없어요 — 장날에 퓨전 가게에서 만들어요')); return card; }
  const grid = el('div', 'fz-dex');
  for (const f of list) {
    const cell = el('div', 'fz-cell' + (f.held > 0 ? ' held' : ''));
    cell.appendChild(fusionFigure(f.a, f.b, ui.urlById));
    cell.appendChild(nameRow(f));
    cell.appendChild(el('div', 'market-note', `${KO.get(f.a)} + ${KO.get(f.b)}`));
    cell.appendChild(el('div', 'fz-held', f.held > 0 ? `데리고 있어요${f.held > 1 ? ` ×${f.held}` : ''}` : '나눴어요 — 다시 섞을 수 있어요'));
    if (open && f.held > 0) cell.appendChild(splitBtn(f));
    grid.appendChild(cell);
  }
  card.appendChild(grid);
  return card;
}

/** 🔀 나누기 — 두 번 눌러야 (다시 섞으려면 스톤이 또 든다) */
function splitBtn(f) {
  const armed = ui.splitArm && ui.splitArm.fid === f.fid && Date.now() - ui.splitArm.at < 5000;
  const b = el('button', 'btn fz-split' + (armed ? ' armed' : ''), armed ? '정말 나눌까요? 한 번 더!' : `🔀 나누기 (${KO.get(f.a)} + ${KO.get(f.b)})`);
  b.type = 'button';
  b.disabled = ui.busy;
  b.addEventListener('click', async () => {
    if (ui.busy) return;
    if (!(ui.splitArm && ui.splitArm.fid === f.fid && Date.now() - ui.splitArm.at < 5000)) {
      ui.splitArm = { fid: f.fid, at: Date.now() };
      say(`🔀 한 번 더 누르면 ${KO.get(f.a)}${rang(KO.get(f.a))} ${KO.get(f.b)}${iga(KO.get(f.b))} 돌아와요 — 다시 섞으려면 🔷1 + 🔶1이 들어요`);
      render();
      return;
    }
    ui.splitArm = null;
    if (!stillOpen()) { say('🏪 장이 닫혔어요 — 다음 장날에 나눌 수 있어요'); render(); return; }
    ui.busy = true;
    const r = await unfuseMon(f.fid, ui.today);
    ui.busy = false;
    if (!ui.open) return;
    say(r.ok ? `🔀 ${fusionName(f)}${iga(fusionName(f))} ${KO.get(f.a)}${wagwa(KO.get(f.a))} ${KO.get(f.b)}${euro(KO.get(f.b))} 돌아왔어요` : r.why === 'closed' ? '🏪 장이 닫혔어요' : r.why === 'none' ? '이미 나눴어요' : '저장을 못 했어요 — 한 번 더');
    if (r.ok) { unlock(); sfx.ding(); }
    render();
  });
  return b;
}

async function doFuse() {
  if (ui.busy || !ui.a || !ui.b) return;
  if (!stillOpen()) { say('🏪 장이 닫혔어요 — 다음 장날에 섞을 수 있어요'); render(); return; }
  ui.busy = true;
  render();
  const a = ui.a, b = ui.b;
  const r = await fuseMons(a, b, ui.today);
  ui.busy = false;
  if (!ui.open) return;
  if (!r.ok) {
    say(r.why === 'stones' ? '🔷 수학스톤과 🔶 영어스톤이 하나씩 있어야 해요' : r.why === 'have' ? '그 포켓몬을 이제 데리고 있지 않아요 — 다시 골라요' : r.why === 'closed' ? '🏪 장이 닫혔어요' : r.why === 'same' ? '서로 다른 포켓몬을 골라요' : '저장을 못 했어요 — 한 번 더');
    if (r.why === 'have') { ui.a = null; ui.b = null; }
    render();
    return;
  }
  unlock();
  sfx.success();
  burstConfetti(90);
  ui.result = { fid: r.fid, a, b, first: r.first };
  ui.a = null; ui.b = null; ui.picking = null;
  const made = fusionName(fusionList().find((x) => x.fid === r.fid) || { a, b }); // 전에 이름을 지어 둔 퓨전이면 그 이름
  say(`🔀 ${made}${iga(made)} 태어났어요! 이름을 바꿀 수도 있어요`);
  render();
}
