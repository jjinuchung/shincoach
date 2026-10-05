// 🏪 5일장 화면 — 🔀 퓨전 가게 (두 마리를 앞(모양) + 뒤(색)로 섞기) · 🤝 교환 상인 (2단계) · 💰 팔기 (3단계) · 내 퓨전(분리) · 퓨전 도감(이름 바꾸기)
// 규칙은 fusion.js(순수)와 db.js(트랜잭션), 화면은 여기. 🎒 도감의 "🏪 5일장" 버튼에서 연다 (장이 안 서는 날도 열려 다음 장날을 알려 준다)
import { marketOpen, nextMarket, blendName, fusionId, recolor, FUSION_COST, NAME_MAX } from './fusion.js';
import { ROSTER, loadCharacters } from './pokemon.js';
import { haveCount, itemCount, fuseMons, unfuseMon, renameFusion, fusionList, tradeOffers, tradeMon, RARITY, coins, sellOffers, sellThing } from './xp.js';
import { STONE_MATH, STONE_ENGLISH, itemById } from './items.js';
import { SELL_MON_MAX } from './sell.js';
import { getFusionArt, putFusionArt } from './db.js';
import { sameDeal } from './trade.js';
import { todayKey } from './track.js';
import { sfx, unlock } from './sfx.js';
import { burstConfetti } from './catch.js';

const $ = (id) => document.getElementById(id);
const KO = new Map(ROSTER.map((m) => [m.id, m.ko]));
const ART = 240; // 퓨전 그림 크기 (시험작과 같다)

const ui = { open: false, override: null, a: null, b: null, picking: null, busy: false, result: null, renaming: null, splitArm: null, urlById: new Map(), onClose: null,
  trPick: null, trGive: {}, trArm: null, // 🤝 trPick = 고르는 중인 상인 자리 · trGive = 자리마다 고른 내 포켓몬 · trArm = 한 번 누른 바꾸기 {day, slot, give, get, at}
  slTab: 'mon', slArm: null, slSay: '' }; // 💰 slTab = 'mon' | 'item' · slArm = 한 번 누른 팔기 {day, kind, id, at} · slSay = 가판대 안의 말
const artUrls = new Map();  // fid → objectURL — 실제로 섞은 퓨전의 그림 (이 기기의 blobs에도 있다)
const previews = new Map(); // fid → { url, blob } — 섞기 전 미리 보기, 최근 PREVIEW_MAX장만 (메모리만)
const PREVIEW_MAX = 8;
const making = new Map();   // fid → Promise (같은 그림을 겹쳐 만들지 않게)
let artQueue = Promise.resolve(); // 그림은 한 장씩 차례로 — 퓨전 도감을 열 때 여러 장을 한꺼번에 만들면 태블릿이 멈칫한다 (한 장 약 0.2초)

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
const eul = (w) => (jong(w) > 0 ? '을' : '를');

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

/** 두 포켓몬 그림으로 퓨전 그림을 만든다 (모양 A + 색 B) — 차례를 기다렸다가, 한 장씩 */
function makeArt(a, b, urlById) {
  const job = artQueue.then(async () => {
    const ua = urlById.get(Number(a)), ub = urlById.get(Number(b));
    if (!ua || !ub) return null;
    const [A, B] = await Promise.all([imageData(ua), imageData(ub)]);
    const F = recolor(A, B);
    const c = document.createElement('canvas');
    c.width = F.width; c.height = F.height;
    c.getContext('2d').putImageData(new ImageData(F.data, F.width, F.height), 0, 0);
    const blob = await new Promise((res) => c.toBlob(res, 'image/webp', 0.88));
    await new Promise((res) => setTimeout(res, 0)); // 다음 그림 전에 화면에 숨 돌릴 틈
    return blob;
  });
  artQueue = job.catch(() => null);
  return job;
}

/** 미리 보기를 최근 PREVIEW_MAX장만 — 오래된 것은 주소를 돌려준다 (섞지 않은 조합이 끝없이 쌓였다, Codex 30차 #6) */
function keepPreview(fid, blob) {
  const url = URL.createObjectURL(blob);
  previews.delete(fid);
  previews.set(fid, { url, blob });
  while (previews.size > PREVIEW_MAX) {
    const [old, rec] = previews.entries().next().value;
    previews.delete(old);
    URL.revokeObjectURL(rec.url);
  }
  return url;
}

/**
 * 🔀 퓨전 그림 주소.
 * made = 실제로 섞은 퓨전 → 메모리 → 이 기기의 blobs → (미리 보기 때 만든 것을 옮겨 담거나) 새로 만들어 blobs에 둔다.
 * made가 아니면(섞기 전 미리 보기) 메모리에만, 최근 8장 — 기기에 쌓지 않는다 (Codex 30차 #6).
 * 포켓몬 그림을 아직 못 받았으면 null (칸에는 🔀) — 다음에 열 때 다시
 */
export async function fusionArtUrl(a, b, urlById, made = true) {
  const fid = fusionId(a, b);
  if (artUrls.has(fid)) return artUrls.get(fid);
  if (!made && previews.has(fid)) return previews.get(fid).url;
  const key = `${made ? 'made' : 'preview'}:${fid}`;
  if (making.has(key)) return making.get(key);
  const job = (async () => {
    if (!made) {
      const blob = await makeArt(a, b, urlById);
      return blob ? keepPreview(fid, blob) : null;
    }
    let blob = null;
    let stored = false;
    try { blob = await getFusionArt(fid); stored = !!blob; } catch { blob = null; }
    if (!blob && previews.has(fid)) blob = previews.get(fid).blob; // 방금 미리 본 그림 그대로 (다시 만들지 않는다)
    if (!blob) blob = await makeArt(a, b, urlById);
    if (!blob) return null;
    if (!stored) { try { await putFusionArt(fid, blob); } catch { /* 저장 못 해도 이번엔 보인다 */ } }
    const u = URL.createObjectURL(blob);
    artUrls.set(fid, u);
    return u;
  })().catch(() => null).finally(() => making.delete(key));
  making.set(key, job);
  return job;
}

/** 퓨전 그림 칸 — 먼저 🔀, 그림이 되면 바꿔 끼운다. made = 실제로 섞은 퓨전(기기에 저장), false = 미리 보기 */
export function fusionFigure(a, b, urlById, cls = 'fz-art', made = true) {
  const box = el('div', cls, '🔀');
  fusionArtUrl(a, b, urlById, made).then((u) => {
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
  ui.override = opts.today || null; // 시험용 날짜 — 보통은 null이라 누를 때마다 오늘을 다시 읽는다
  ui.onClose = opts.onClose || null;
  ui.a = null; ui.b = null; ui.picking = null; ui.result = null; ui.renaming = null; ui.splitArm = null;
  ui.trPick = null; ui.trGive = {}; ui.trArm = null;
  ui.slTab = 'mon'; ui.slArm = null; ui.slSay = '';
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

/**
 * 지금 날짜 — 그릴 때·누를 때마다 다시 읽는다. 창을 연 날을 들고 있으면 자정을 넘겨도 장이 열린 채였다 (Codex 30차 #1).
 * 시험용 날짜(override)가 있으면 그것
 */
function dayNow() {
  return ui.override || todayKey();
}

function stillOpen(day = dayNow()) {
  return marketOpen(day);
}

// ───────────── 그리기 ─────────────

function render() {
  if (!ui.open) return;
  const nm = itemCount(STONE_MATH.id), ne = itemCount(STONE_ENGLISH.id);
  $('market-stones').textContent = `💰 ${coins()} · ${STONE_MATH.emoji} ${nm} · ${STONE_ENGLISH.emoji} ${ne}`; // 💰 팔면 코인이 바로 보이게
  const body = $('market-body');
  body.innerHTML = '';
  const open = stillOpen();
  $('market-title').textContent = open ? '🏪 5일장 — 오늘 장날!' : '🏪 5일장';
  if (!open) body.appendChild(closedCard());
  else {
    body.appendChild(shopCard(nm, ne));
    body.appendChild(tradeCard());
    body.appendChild(sellCard());
  }
  body.appendChild(dexCard(open));
}

function dateText(key) {
  const [, m, d] = key.split('-').map(Number);
  return `${m}월 ${d}일`;
}

function closedCard() {
  const nx = nextMarket(dayNow());
  const card = el('div', 'market-sec market-closed');
  card.appendChild(el('div', 'market-sign', '🏪 오늘은 장이 안 열려요'));
  if (nx) card.appendChild(el('p', 'market-next', `다음 장날: ${dateText(nx.key)} (${nx.days === 1 ? '내일' : `${nx.days}일 뒤`})`));
  card.appendChild(el('p', 'market-note', '5일장은 5일마다 열려요. 장날에는 🔀 퓨전 가게에서 포켓몬 두 마리를 섞어 새 포켓몬을 만들고, 만든 퓨전을 다시 나눌 수도 있어요. 🤝 교환 상인 세 명도 와서 내 도감에 없는 포켓몬을 바꿔 줘요. 퓨전 도감과 이름 바꾸기는 언제든 돼요.'));
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
  box.appendChild(fusionFigure(ui.a, ui.b, ui.urlById, 'fz-art big', false)); // 미리 보기 — 기기에 저장하지 않는다
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
  box.appendChild(nameRow(f, 'result'));
  return box;
}

/**
 * 이름 + ✏️ 바꾸기 (그 자리에서 고친다). where = 'result'(섞은 결과) | 'dex'(퓨전 도감) — 누른 그 자리에만 입력칸을 연다.
 * 퓨전 id만 들고 있으면 결과 카드와 도감에 입력칸이 둘 생겨 태블릿 키보드가 아래쪽으로 갔다 (Codex 30차 #5)
 */
function nameRow(f, where) {
  const row = el('div', 'fz-name-row');
  if (ui.renaming && ui.renaming.fid === f.fid && ui.renaming.where === where) {
    const input = el('input', 'fz-name-input');
    input.id = `market-rename-${where}`;
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
    edit.addEventListener('click', () => { ui.renaming = { fid: f.fid, where }; render(); });
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
    cell.appendChild(nameRow(f, 'dex'));
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
  const label = `🔀 나누기 (${KO.get(f.a)} + ${KO.get(f.b)})`;
  const b = el('button', 'btn fz-split' + (armed ? ' armed' : ''), armed ? '정말 나눌까요? 한 번 더!' : label);
  b.type = 'button';
  b.dataset.label = label;
  b.disabled = ui.busy;
  // 5초가 지나 "한 번 더"가 풀리면 버튼도 원래대로 — 같은 퓨전 버튼이 어디에 몇 개 있든 (Codex 31차 #5, 교환 버튼과 같은 까닭)
  if (armed) {
    const arm = ui.splitArm;
    setTimeout(() => {
      if (ui.splitArm !== arm) return;
      ui.splitArm = null;
      for (const x of document.querySelectorAll('#market-body .fz-split.armed')) { x.classList.remove('armed'); x.textContent = x.dataset.label || x.textContent; }
      if ($('market-msg').textContent.startsWith('🔀 한 번 더')) say('');
    }, Math.max(0, 5000 - (Date.now() - arm.at)));
  }
  b.addEventListener('click', async () => {
    if (ui.busy) return;
    if (!(ui.splitArm && ui.splitArm.fid === f.fid && Date.now() - ui.splitArm.at < 5000)) {
      ui.splitArm = { fid: f.fid, at: Date.now() };
      say(`🔀 한 번 더 누르면 ${KO.get(f.a)}${rang(KO.get(f.a))} ${KO.get(f.b)}${iga(KO.get(f.b))} 돌아와요 — 다시 섞으려면 🔷1 + 🔶1이 들어요`);
      render();
      return;
    }
    ui.splitArm = null;
    const day = dayNow();
    if (!stillOpen(day)) { say('🏪 장이 닫혔어요 — 다음 장날에 나눌 수 있어요'); render(); return; }
    ui.busy = true;
    const r = await unfuseMon(f.fid, day);
    ui.busy = false;
    if (!ui.open) return;
    say(r.ok ? `🔀 ${fusionName(f)}${iga(fusionName(f))} ${KO.get(f.a)}${wagwa(KO.get(f.a))} ${KO.get(f.b)}${euro(KO.get(f.b))} 돌아왔어요` : r.why === 'closed' ? '🏪 장이 닫혔어요' : r.why === 'none' ? '이미 나눴어요' : '저장을 못 했어요 — 한 번 더');
    if (r.ok) { unlock(); sfx.ding(); }
    render();
  });
  return b;
}

// ───────────── 🤝 교환 상인 (2026-10-05, 🏪 2단계 — 규칙은 trade.js, 판정은 db.tradeRule 한 트랜잭션) ─────────────

const nameOf = (id) => KO.get(Number(id)) || String(id);

/** 포켓몬 그림 칸 (기기에 그림이 없으면 ?) */
function monArt(id, cls = 'tr-art') {
  const box = el('div', cls);
  const u = ui.urlById.get(Number(id));
  if (u) { const img = el('img'); img.src = u; img.alt = nameOf(id); img.draggable = false; box.appendChild(img); } else box.textContent = '?';
  return box;
}

/** 🤝 교환 상인 셋 — 자리마다 ⭐ · ⭐⭐ · ⭐⭐⭐ */
function tradeCard() {
  const day = dayNow();
  const offers = tradeOffers(day, new Set(ui.urlById.keys())); // 상인은 기기에 그림이 있는 포켓몬만 가져온다
  const card = el('div', 'market-sec');
  card.appendChild(el('h3', 'market-h', '🤝 교환 상인'));
  card.appendChild(el('p', 'market-note', '상인들이 내 도감에 없는 포켓몬을 가져왔어요. 같은 등급에서 두 마리 이상 데리고 있는 포켓몬 하나와 바꿔요 — 상인마다 장날에 한 번, 바꾸면 되돌릴 수 없어요.'));
  const list = el('div', 'tr-list');
  for (const o of offers) list.appendChild(traderBox(o));
  card.appendChild(list);
  return card;
}

function traderBox(o) {
  const box = el('div', 'tr-card' + (o.done ? ' done' : ''));
  const head = el('div', 'tr-head');
  head.appendChild(el('span', 'tr-who', `${o.who.emoji} ${o.who.name}`));
  head.appendChild(el('span', 'tr-tier', `${RARITY[o.tier].stars} ${RARITY[o.tier].label}`));
  box.appendChild(head);

  if (o.done) { // 오늘 이미 바꿨다
    box.appendChild(monArt(o.done.get));
    box.appendChild(el('div', 'tr-did', `✅ ${nameOf(o.done.give)} → ${nameOf(o.done.get)}`));
    box.appendChild(el('div', 'tr-say', '“고마워! 다음 장날에 또 와.”'));
    return box;
  }
  if (!o.get) { // 가져올 것이 없다 — 까닭마다 말이 다르다 (다음 장날을 기다려도 안 바뀌는 까닭이 있다, Codex 31차 #6)
    const st = RARITY[o.tier].stars;
    box.appendChild(el('div', 'tr-art', o.why === 'art' ? '🖼️' : '🎉'));
    box.appendChild(el('div', 'tr-say', o.why === 'all' ? `“와, ${st} 포켓몬은 벌써 다 모았구나! 내가 줄 게 없어.”`
      : o.why === 'level' ? `“지금 만날 수 있는 ${st} 포켓몬은 다 모았네! 레벨이 오르면 새 포켓몬을 데려올게.”`
      : `“포켓몬 그림이 이 태블릿에 아직 없어서 못 데려왔어.”`));
    if (o.why === 'art') box.appendChild(el('p', 'market-note', '아빠께: ⚙ 설정에서 "포켓몬 캐릭터 받기"를 하면 상인이 데려와요'));
    return box;
  }

  const X = nameOf(o.get);
  box.appendChild(monArt(o.get));
  box.appendChild(el('div', 'tr-name', X));
  box.appendChild(el('div', 'tr-say', `“내 ${X} 줄게! 네 ${RARITY[o.tier].stars} 포켓몬 하나랑 바꿀래?”`));
  if (o.subject === 'math') box.appendChild(el('p', 'market-note', '🔢 수학 포켓몬이라 수학 포켓몬끼리만 바꿔요'));
  if (!o.gives.length) {
    box.appendChild(el('p', 'market-note tr-cant', `${RARITY[o.tier].stars} ${o.subject === 'math' ? '수학' : '영어'} 포켓몬을 두 마리 이상 데리고 있으면 바꿀 수 있어요`)); // 영어 쪽도 과목을 말한다 (Codex 31차 #6)
    return box;
  }

  const give = o.gives.includes(ui.trGive[o.slot]) ? ui.trGive[o.slot] : null; // 그 사이 못 주게 됐으면 다시 고른다
  const pick = el('button', 'fz-slot tr-give' + (ui.trPick === o.slot ? ' on' : '') + (give ? ' got' : ''));
  pick.type = 'button';
  pick.appendChild(el('span', 'fz-slot-label', '내가 줄 포켓몬'));
  if (give) {
    const u = ui.urlById.get(give);
    if (u) { const img = el('img'); img.src = u; img.alt = nameOf(give); img.draggable = false; pick.appendChild(img); }
    pick.appendChild(el('span', 'fz-slot-name', `${nameOf(give)} ×${haveCount(give)}`));
  } else pick.appendChild(el('span', 'fz-slot-empty', '눌러서 고르기'));
  pick.disabled = ui.busy;
  pick.addEventListener('click', () => { unlock(); ui.trPick = ui.trPick === o.slot ? null : o.slot; ui.trArm = null; say(''); render(); });
  box.appendChild(pick);

  if (ui.trPick === o.slot) box.appendChild(givePicker(o));
  else if (give) box.appendChild(tradeBtn(o, give));
  return box;
}

/** 내가 줄 포켓몬 고르기 — 같은 등급(·같은 과목), 두 마리 이상 데리고 있는 것만 */
function givePicker(o) {
  const wrap = el('div', 'fz-picker');
  wrap.appendChild(el('p', 'market-note', '두 마리 이상 있는 포켓몬만 줄 수 있어요 (한 마리는 남아요)'));
  const grid = el('div', 'fz-grid');
  for (const id of o.gives) {
    const b = el('button', 'fz-pick');
    b.type = 'button';
    const u = ui.urlById.get(id);
    if (u) { const img = el('img'); img.src = u; img.alt = ''; img.loading = 'lazy'; img.draggable = false; b.appendChild(img); }
    b.appendChild(el('span', 'nm', nameOf(id)));
    b.appendChild(el('span', 'cnt', `×${haveCount(id)}`));
    b.addEventListener('click', () => { ui.trGive[o.slot] = id; ui.trPick = null; ui.trArm = null; render(); });
    grid.appendChild(b);
  }
  wrap.appendChild(grid);
  return wrap;
}

/** 이 거래 — 장날·자리·줄 것·받을 것 ("한 번 더"는 이것이 모두 같을 때만) */
function dealOf(o, give) {
  return { day: dayNow(), slot: o.slot, give, get: o.get };
}

/** 🤝 바꾸기 — 두 번 눌러야 (되돌릴 수 없다) */
function tradeBtn(o, give) {
  const armed = sameDeal(ui.trArm, dealOf(o, give), Date.now()); // 받을 포켓몬까지 같아야 (상인이 다른 포켓몬을 가져왔으면 처음부터 — Codex 31차 #4)
  const X = nameOf(o.get), Y = nameOf(give);
  const b = el('button', 'btn btn-primary fz-go tr-go' + (armed ? ' armed' : ''), armed ? `정말 ${Y}${eul(Y)} 줄까요? 한 번 더!` : `🤝 ${Y} → ${X} 바꾸기`);
  b.type = 'button';
  b.disabled = ui.busy;
  b.addEventListener('click', () => doTrade(o, give));
  // 5초가 지나면 "한 번 더"가 풀린다 — 버튼도 원래대로 (안 그러면 망설이다 누른 아이에게 아무 일도 안 일어난 것처럼 보인다)
  if (armed) {
    const arm = ui.trArm;
    setTimeout(() => {
      if (ui.trArm !== arm || !b.isConnected) return;
      ui.trArm = null;
      b.classList.remove('armed');
      b.textContent = `🤝 ${Y} → ${X} 바꾸기`;
      if ($('market-msg').textContent.startsWith('🤝 한 번 더')) say(''); // 다른 일의 말은 그대로
    }, Math.max(0, 5000 - (Date.now() - arm.at)));
  }
  return b;
}

async function doTrade(o, give) {
  if (ui.busy) return;
  const X = nameOf(o.get), Y = nameOf(give);
  if (!sameDeal(ui.trArm, dealOf(o, give), Date.now())) {
    ui.trArm = { ...dealOf(o, give), at: Date.now() };
    say(`🤝 한 번 더 누르면 ${Y}${eul(Y)} 주고 ${X}${eul(X)} 받아요 — 바꾸면 되돌릴 수 없어요`);
    render();
    return;
  }
  ui.trArm = null;
  const day = dayNow();
  if (!stillOpen(day)) { say('🏪 장이 닫혔어요 — 다음 장날에 바꿀 수 있어요'); render(); return; }
  ui.busy = true;
  render();
  const r = await tradeMon({ day, slot: o.slot, give, get: o.get });
  ui.busy = false;
  if (!ui.open) return;
  delete ui.trGive[o.slot];
  ui.trPick = null;
  if (!r.ok) {
    say(r.why === 'have' ? `이제 ${Y}${iga(Y)} 한 마리뿐이라 줄 수 없어요 — 다른 포켓몬을 골라요`
      : r.why === 'done' ? '이 상인하고는 오늘 벌써 바꿨어요'
      : r.why === 'got' ? `${X}${iga(X)} 벌써 도감에 있어요 — 상인이 다른 포켓몬을 가져왔어요`
      : r.why === 'closed' ? '🏪 장이 닫혔어요'
      : r.why === 'subject' ? '🔢 수학 포켓몬은 수학 포켓몬끼리만 바꿔요'
      : r.why === 'offer' || r.why === 'same' ? '이 포켓몬으로는 바꿀 수 없어요 — 다시 골라요'
      : '저장을 못 했어요 — 한 번 더');
    render();
    return;
  }
  unlock();
  sfx.success();
  burstConfetti(90);
  say(`🤝 ${X}${iga(X)} 왔어요! 도감에 새로 등록됐어요 (${Y}${iga(Y)} ${o.who.name}에게 갔어요)`);
  render();
}

// ───────────── 💰 팔기 (2026-10-05) ─────────────

/** 이 팔기 — 장날·종류·무엇·보여 준 값 ("한 번 더"는 이것이 모두 같고 5초 안일 때만 — 그 사이 값이 바뀌면 처음부터, Codex 32차 #5) */
function sameSell(arm, day, kind, id, price, now) {
  return !!arm && arm.day === day && arm.kind === kind && arm.id === id && arm.price === price && now - arm.at < 5000;
}

/** 팔 것의 이름 — 포켓몬은 이름, 아이템은 그림 + 이름 */
/** 💰 팔기 말 — 창 맨 위와 가판대 안에 같이 */
function saySell(t) {
  ui.slSay = t || '';
  say(t);
}

function sellName(kind, id) {
  if (kind === 'mon') return nameOf(id);
  const it = itemById(id);
  return it ? `${it.emoji} ${it.ko}` : String(id);
}

/** 💰 팔기 가판대 — [포켓몬] [아이템] 두 칸, 두 번 눌러야 팔린다 (되돌릴 수 없다) */
function sellCard() {
  const day = dayNow();
  const of = sellOffers(day);
  const card = el('div', 'market-sec sl-sec');
  card.appendChild(el('h3', 'market-h', '💰 팔기'));
  card.appendChild(el('p', 'market-note', '두 마리 이상 있는 포켓몬(한 마리는 남아요)과 가방 아이템을 코인으로 바꿔요. 두 번 눌러야 팔리고, 판 것은 되돌릴 수 없어요.'));
  const tabs = el('div', 'sl-tabs');
  for (const [k, label] of [['mon', `🐾 포켓몬 (오늘 ${of.left}마리 더)`], ['item', '🎒 아이템']]) {
    const t = el('button', 'sl-tab' + (ui.slTab === k ? ' on' : ''), label);
    t.type = 'button';
    t.addEventListener('click', () => { ui.slTab = k; ui.slArm = null; ui.slSay = ''; say(''); render(); });
    tabs.appendChild(t);
  }
  card.appendChild(tabs);
  // 창 맨 위 알림 줄은 가판대까지 내려오면 안 보인다 — 같은 말을 가판대 안에도
  if (ui.slSay) card.appendChild(el('p', 'sl-msg', ui.slSay));

  const now = Date.now();
  const grid = el('div', 'fz-grid sl-grid');
  if (ui.slTab === 'mon') {
    if (!of.left) card.appendChild(el('p', 'market-note tr-cant', `오늘은 포켓몬을 ${SELL_MON_MAX}마리 팔았어요 — 다음 장날에 또 팔 수 있어요`));
    else if (!of.mons.length) card.appendChild(el('p', 'market-note tr-cant', '두 마리 이상 데리고 있는 포켓몬이 없어요'));
    for (const m of of.mons) {
      const armed = sameSell(ui.slArm, day, 'mon', m.id, m.price, now);
      const b = el('button', 'fz-pick sl-pick' + (armed ? ' armed' : ''));
      b.type = 'button';
      b.disabled = ui.busy || !of.left;
      const u = ui.urlById.get(m.id);
      if (u) { const img = el('img'); img.src = u; img.alt = ''; img.loading = 'lazy'; img.draggable = false; b.appendChild(img); } else b.appendChild(el('span', 'sl-emoji', '?'));
      b.appendChild(el('span', 'nm', nameOf(m.id)));
      b.appendChild(el('span', 'cnt', `×${m.have}`));
      b.appendChild(el('span', 'sl-star', RARITY[m.rarity] ? RARITY[m.rarity].stars : ''));
      b.appendChild(el('span', 'sl-price', armed ? '한 번 더!' : `💰 ${m.price}`));
      b.addEventListener('click', () => doSell('mon', m.id, m.price));
      grid.appendChild(b);
    }
  } else {
    if (!of.items.length) card.appendChild(el('p', 'market-note tr-cant', '팔 수 있는 아이템이 없어요 (스톤·황금 볼·교환권은 못 팔아요)'));
    for (const it of of.items) {
      const def = itemById(it.id);
      const armed = sameSell(ui.slArm, day, 'item', it.id, it.price, now);
      const b = el('button', 'fz-pick sl-pick' + (armed ? ' armed' : ''));
      b.type = 'button';
      b.disabled = ui.busy;
      b.appendChild(el('span', 'sl-emoji', def ? def.emoji : '🎁'));
      b.appendChild(el('span', 'nm', def ? def.ko : it.id));
      b.appendChild(el('span', 'cnt', `×${it.n}`));
      b.appendChild(el('span', 'sl-price', armed ? '한 번 더!' : `💰 ${it.price}`));
      b.addEventListener('click', () => doSell('item', it.id, it.price));
      grid.appendChild(b);
    }
  }
  if (grid.childNodes.length) card.appendChild(grid);
  if (of.sold.length) card.appendChild(el('p', 'market-note sl-sold', `오늘 판 것: ${of.sold.map((s) => `${sellName(s.kind, s.id)} 💰${s.coins}`).join(' · ')}`));

  // 5초가 지나면 "한 번 더"가 풀린다 — 버튼도 원래대로 (교환과 같다)
  const arm = ui.slArm;
  if (arm && sameSell(arm, day, arm.kind, arm.id, arm.price, now)) {
    setTimeout(() => {
      if (ui.slArm !== arm || !ui.open) return;
      ui.slArm = null;
      if ($('market-msg').textContent.startsWith('💰 한 번 더')) say('');
      if (ui.slSay.startsWith('💰 한 번 더')) ui.slSay = '';
      render();
    }, Math.max(0, 5000 - (now - arm.at)));
  }
  return card;
}

async function doSell(kind, id, price) {
  if (ui.busy) return;
  const day = dayNow();
  const nm = sellName(kind, id);
  if (!sameSell(ui.slArm, day, kind, id, price, Date.now())) {
    ui.slArm = { day, kind, id, price, at: Date.now() };
    saySell(`💰 한 번 더 누르면 ${nm}${kind === 'mon' ? ' 한 마리' : ' 하나'}를 💰${price}에 팔아요 — 되돌릴 수 없어요`);
    render();
    return;
  }
  ui.slArm = null;
  if (!stillOpen(day)) { saySell('🏪 장이 닫혔어요 — 다음 장날에 팔 수 있어요'); render(); return; }
  ui.busy = true;
  render();
  const r = await sellThing({ day, kind, id, price }); // 보여 준 값 — 그 사이 바뀌었으면 안 판다
  ui.busy = false;
  if (!ui.open) return;
  if (!r.ok) {
    saySell(r.why === 'have' ? `이제 ${nm}${iga(nm)} 한 마리뿐이라 팔 수 없어요`
      : r.why === 'limit' ? `오늘은 포켓몬을 ${SELL_MON_MAX}마리 팔았어요 — 다음 장날에 또 팔 수 있어요`
      : r.why === 'none' ? `${nm}${iga(nm)} 이제 가방에 없어요`
      : r.why === 'price' ? `값이 바뀌었어요 (지금 💰 ${r.price}) — 다시 두 번 눌러요`
      : r.why === 'closed' ? '🏪 장이 닫혔어요'
      : r.why === 'bad' ? '이건 팔 수 없어요'
      : '저장을 못 했어요 — 한 번 더');
    render();
    return;
  }
  unlock();
  sfx.ding();
  saySell(`💰 +${r.coins}! ${nm}${kind === 'mon' ? ' 한 마리' : ' 하나'}를 팔았어요`);
  render();
}

async function doFuse() {
  if (ui.busy || !ui.a || !ui.b) return;
  const day = dayNow();
  if (!stillOpen(day)) { say('🏪 장이 닫혔어요 — 다음 장날에 섞을 수 있어요'); render(); return; }
  ui.busy = true;
  render();
  const a = ui.a, b = ui.b;
  const r = await fuseMons(a, b, day);
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
