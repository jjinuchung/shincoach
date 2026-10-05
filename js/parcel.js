// 📦 아빠의 구호품 (2026-10-05, 아버님: "이로치의 스톤 2번을 구호품(선물)으로 보내 주자")
//
// 왜: v179에서 이로치의 스톤을 "하나에 3번"으로 바꿀 때, 그 전에 이미 써 버린 스톤의 남은 2번은 돌려주지 않았다.
//     진우가 이로치를 빼자 스톤이 사라진 것처럼 보였다 → 아빠가 남은 2번을 보낸다.
//
// 보내는 길: 배포 파일 coach/gifts.json에 한 줄을 더하고 배포한다 (❓ 답장 replies.json과 같은 길 — 태블릿을 만지지 않는다).
// 받는 길: 앱을 열면 홈에서 한 번 "📦 구호품이 왔어요!" → 아이가 [📦 받기]를 눌러야 가방에 들어간다.
//   받기는 db.applyParcel 한 트랜잭션(받은 id를 함께 적음) — 두 창·두 번 눌러도 한 번만.
//   누르기 전에 앱을 끄면 다음에 다시 온다. 저장이 안 되면 "못 받았어요" — 다음에 앱을 열면 다시 온다.

import { parcelOf, parcelGot, itemById, SHINY_CHARGE, SHINY_STONE } from './items.js';
import { parcelsReceived, receiveParcel, shinyLeft } from './xp.js';
import { sfx } from './sfx.js';

export const PARCELS_URL = './coach/gifts.json';

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined && text !== null) e.textContent = String(text);
  return e;
};

/** 아직 안 받은 구호품 (순수) — 틀린 줄·이미 받은 것·같은 id 두 번째 줄은 뺀다 */
export function pendingParcels(list, received) {
  const seen = new Set();
  const out = [];
  for (const raw of Array.isArray(list) ? list : []) {
    const pc = parcelOf(raw);
    if (!pc || parcelGot(received, pc.id) || seen.has(pc.id)) continue;
    seen.add(pc.id);
    out.push(pc);
  }
  return out;
}

/** 구호품 한 칸의 그림·이름·개수 (순수) — 🌈 남은 횟수는 "이로치의 스톤 · 2번" */
export function parcelLabel(id, n) {
  if (id === SHINY_CHARGE) return { emoji: SHINY_STONE.emoji, name: SHINY_STONE.ko, count: `${n}번` };
  const it = itemById(id);
  return it ? { emoji: it.emoji, name: it.ko, count: `×${n}` } : { emoji: '🎁', name: id, count: `×${n}` };
}

/** 받은 뒤 한 줄 — 어디서 쓰는지 (순수) */
export function afterLine(items, left) {
  if (items && (items[SHINY_CHARGE] || items[SHINY_STONE.id])) return `🌈 이로치 남은 횟수: ${left}번 — 🎒 도감에서 포켓몬을 누르고 "🌈 이로치로!"`;
  return '🎒 가방에서 볼 수 있어요';
}

let queue = [];    // 이번에 보여 줄 구호품들 (하나씩)
let cur = null;    // 지금 창에 뜬 구호품
let step = 'offer'; // 'offer'(받기 전) → 'busy' → 'done'(받았음·못 받았음 — 누르면 닫힘)
let failed = false; // 이번에 저장을 못 했다 — 다음에 앱을 열 때까지 다시 안 띄운다

function anyModalOpen() {
  return ['catch', 'shop', 'mon', 'battle', 'puzzle', 'review', 'essay', 'match', 'evolve', 'hatch', 'timeup', 'take', 'taken', 'market']
    .some((id) => { const e = $(id); return e && !e.hidden; });
}

async function loadParcels() {
  try {
    const res = await fetch(PARCELS_URL);
    if (!res.ok) return [];
    const list = await res.json();
    return Array.isArray(list) ? list : [];
  } catch { return []; }
}

export function initParcel() {
  const ok = $('parcel-ok');
  if (ok) ok.addEventListener('click', onButton);
}

/**
 * 📦 아직 안 받은 구호품이 있으면 하나 띄운다 (앱을 열 때 · 🔒 데려감 알림을 닫은 뒤).
 * @returns {Promise<boolean>} 띄웠는가
 */
export async function showParcelIfAny() {
  const box = $('parcel');
  if (!box || !box.hidden || failed || anyModalOpen()) return false;
  if (!queue.length) queue = pendingParcels(await loadParcels(), parcelsReceived());
  // 그 사이 다른 창에서 받았을 수 있다 — 띄우기 직전에 한 번 더 거른다
  const got = parcelsReceived();
  queue = queue.filter((pc) => !parcelGot(got, pc.id));
  if (!queue.length || anyModalOpen() || !box.hidden) return false;
  cur = queue.shift();
  render();
  box.hidden = false;
  try { sfx.ding(); } catch { /* 소리는 없어도 */ }
  return true;
}

function render() {
  step = 'offer';
  $('parcel-title').textContent = cur.title || '📦 아빠가 보낸 구호품이 왔어요!';
  const stage = $('parcel-stage');
  stage.innerHTML = '';
  for (const [id, n] of Object.entries(cur.items)) {
    const lb = parcelLabel(id, n);
    const cell = el('div', 'parcel-item');
    cell.appendChild(el('div', 'parcel-emoji', lb.emoji));
    cell.appendChild(el('span', 'parcel-name', lb.name));
    cell.appendChild(el('span', 'parcel-count', lb.count));
    stage.appendChild(cell);
  }
  const note = $('parcel-text');
  note.textContent = cur.text ? `💌 ${cur.text}` : '';
  note.hidden = !cur.text;
  $('parcel-sub').textContent = '';
  const ok = $('parcel-ok');
  ok.textContent = '📦 받기';
  ok.disabled = false;
}

async function onButton() {
  const ok = $('parcel-ok');
  if (step === 'busy') return;
  if (step === 'done') { close(); return; }
  step = 'busy';
  ok.disabled = true;
  let r;
  try { r = await receiveParcel(cur); } catch { r = { ok: false, why: 'save' }; }
  step = 'done';
  ok.disabled = false;
  if (r.ok) {
    $('parcel-title').textContent = '🎒 가방에 넣었어요!';
    $('parcel-sub').textContent = afterLine(r.items || cur.items, shinyLeft());
    ok.textContent = '고마워요, 아빠!';
    try { sfx.success(); } catch { /* 소리는 없어도 */ }
  } else if (r.why === 'done') {
    // 다른 창에서 먼저 받았다 — 가방에는 이미 들어 있다
    $('parcel-title').textContent = '🎒 이미 받았어요!';
    $('parcel-sub').textContent = afterLine(cur.items, shinyLeft());
    ok.textContent = '알겠어요';
  } else {
    failed = true;
    queue = [];
    $('parcel-title').textContent = '📦 지금은 못 받았어요';
    $('parcel-sub').textContent = '다음에 앱을 열면 다시 와요.';
    ok.textContent = '알겠어요';
  }
}

function close() {
  const box = $('parcel');
  if (box) box.hidden = true;
  cur = null;
  step = 'offer';
  if (queue.length) setTimeout(() => { showParcelIfAny().catch(() => {}); }, 300); // 구호품이 여럿이면 하나씩
}
