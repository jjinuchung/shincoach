// 📦 아빠의 구호품 (2026-10-05, 아버님: "이로치의 스톤 2번을 구호품(선물)으로 보내 주자")
//
// 왜: v179에서 이로치의 스톤을 "하나에 3번"으로 바꿀 때, 그 전에 이미 써 버린 스톤의 남은 2번은 돌려주지 않았다.
//     진우가 이로치를 빼자 스톤이 사라진 것처럼 보였다 → 아빠가 남은 2번을 보낸다.
//
// 보내는 길: 배포 파일 coach/gifts.json에 한 줄을 더하고 배포한다 (❓ 답장 replies.json과 같은 길 — 태블릿을 만지지 않는다).
// 받는 길: 앱을 열면 홈에서 한 번 "📦 구호품이 왔어요!" → 아이가 [📦 받기]를 눌러야 가방에 들어간다.
//   받기는 db.applyParcel 한 트랜잭션(받은 id를 함께 적음) — 두 창·두 번 눌러도 한 번만.
//   누르기 전에 앱을 끄면 다음에 다시 온다. 저장이 안 되면 "못 받았어요" — 다음에 앱을 열면 다시 온다.
// 🏁 같은 창으로 "끝까지 본 영상"의 🔶 영어스톤도 온다 (2026-10-06) — 규칙이 생기기 전에 90%를 넘긴 지난 영상과,
//   영상 화면에서 저장을 놓친 영상. 받기는 db.applyVideoStones 한 트랜잭션(받은 영상은 parcels에 'video:<id>').

import { parcelOf, parcelGot, itemById, SHINY_CHARGE, SHINY_STONE, STONE_ENGLISH, VIDEO_STONE, videoStoneDue, videoParcelId, videoPlusId, videoGrant } from './items.js';
import { parcelsReceived, receiveParcel, receiveVideoStones, shinyLeft } from './xp.js';
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
  if (id === COIN_ITEM) return { emoji: '💰', name: '코인', count: `+${n}` }; // 🏁 영상 끝까지 보상 (가방 물건이 아니다)
  const it = itemById(id);
  return it ? { emoji: it.emoji, name: it.ko, count: `×${n}` } : { emoji: '🎁', name: id, count: `×${n}` };
}

/** 받은 뒤 한 줄 — 어디서 쓰는지 (순수) */
export function afterLine(items, left) {
  if (items && (items[SHINY_CHARGE] || items[SHINY_STONE.id])) return `🌈 이로치 남은 횟수: ${left}번 — 🎒 도감에서 포켓몬을 누르고 "🌈 이로치로!"`;
  if (items && items[STONE_ENGLISH.id]) return `${STONE_ENGLISH.emoji} ${STONE_ENGLISH.ko}은 🎒 도감에서 영어 포켓몬을 키울 때 · 🛒 스톤 상점에서 써요`;
  return '🎒 가방에서 볼 수 있어요';
}

/** 📦 칸에서 💰 코인을 가리키는 이름 (가방 물건이 아니라 보여 주기만) */
export const COIN_ITEM = 'coin';

/**
 * 🏁 끝까지 본 영상들의 보상을 구호품 한 칸으로 (순수) — 영상 이름을 보여 준다(무엇 때문에 받는지 아이가 알게).
 * 💰·🔶은 영상마다 길이별(items.videoGrant) — v197에 🔶3만 받은 영상은 차액만
 * @param {Array<{id:string, title:string, total:number, base:boolean, plus:boolean}>} due items.videoStoneDue 결과
 */
export function videoParcel(due) {
  const list = Array.isArray(due) ? due : [];
  if (!list.length) return null;
  let coins = 0;
  let stones = 0;
  for (const d of list) { const g = videoGrant(d); coins += g.coins; stones += g.stones; }
  const names = list.map((d) => `「${d.title}」`);
  const shown = names.slice(0, 3).join(' · ') + (names.length > 3 ? ` 외 ${names.length - 3}편` : '');
  const items = {};
  if (coins) items[COIN_ITEM] = coins;
  if (stones) items[STONE_ENGLISH.id] = stones;
  return {
    kind: 'video', id: 'video', ids: list.map((d) => String(d.id)), icon: '🏁',
    items,
    title: `🏁 끝까지 본 영상 ${list.length}편 — 상이 왔어요!`,
    text: `${shown} — 문장을 ${VIDEO_STONE.pct}% 넘게 했어요. 긴 영상일수록 💰·${STONE_ENGLISH.emoji}이 더 많아요!`,
    due: list,
  };
}

/** 띄우기 직전에 다시 거르기 (순수) — 다른 창에서 받은 구호품·영상은 빼고, 영상 칸은 남은 영상으로 다시 만든다 */
export function stillDue(queue, got) {
  const out = [];
  for (const pc of Array.isArray(queue) ? queue : []) {
    if (pc && pc.kind === 'video') {
      const left = (pc.due || []).map((d) => ({ ...d, base: d.base && !parcelGot(got, videoParcelId(d.id)), plus: d.plus && !parcelGot(got, videoPlusId(d.id)) }));
      const vp = videoParcel(left.filter((d) => d.base || d.plus));
      if (vp) out.push(vp);
    } else if (pc && !parcelGot(got, pc.id)) out.push(pc);
  }
  return out;
}

let queue = [];    // 이번에 보여 줄 구호품들 (하나씩)
let cur = null;    // 지금 창에 뜬 구호품
let step = 'offer'; // 'offer'(받기 전) → 'busy' → 'done'(받았음·못 받았음 — 누르면 닫힘)
let failed = false; // 이번에 저장을 못 했다 — 다음에 앱을 열 때까지 다시 안 띄운다
let deferred = false; // 다른 창이 열려 있어 미뤘다 — 홈으로 돌아오면 다시 (Codex 32차 #7)

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

/** 🏁 90%를 넘겼는데 🔶을 아직 안 받은 영상 — 영상 기록을 못 읽으면 없음 (다음에 다시) */
async function loadVideoDue() {
  try {
    const db = await import('./db.js');
    const st = await import('./stats.js');
    const [items, records] = await Promise.all([db.listItems(), db.getAllSentenceStats()]);
    return videoStoneDue(st.contentSummary(items, records, st.cueCountOf), parcelsReceived());
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
  if (!box || !box.hidden || failed) return false;
  if (anyModalOpen()) { deferred = true; return false; } // 다른 창이 닫히고 홈으로 돌아오면 다시 (retryParcel)
  if (!queue.length) {
    queue = pendingParcels(await loadParcels(), parcelsReceived());
    const vp = videoParcel(await loadVideoDue()); // 🏁 끝까지 본 영상의 🔶 — 아빠 구호품 다음에
    if (vp) queue.push(vp);
  }
  // 그 사이 다른 창에서 받았을 수 있다 — 띄우기 직전에 한 번 더 거른다
  queue = stillDue(queue, parcelsReceived());
  if (!queue.length) { deferred = false; return false; }
  if (anyModalOpen() || !box.hidden) { deferred = true; return false; } // 받아 오는 사이 다른 창이 열렸다
  deferred = false;
  cur = queue.shift();
  render();
  box.hidden = false;
  try { sfx.ding(); } catch { /* 소리는 없어도 */ }
  return true;
}

/** 🏠 홈으로 돌아올 때 — 미뤄 둔 구호품이 있으면 다시 (미룬 적이 없거나 저장을 못 했으면 아무것도 안 한다 — 받아 오지도 않는다) */
export function retryParcel() {
  if (!deferred || failed) return Promise.resolve(false);
  return showParcelIfAny();
}

function render() {
  step = 'offer';
  $('parcel-title').textContent = cur.title || '📦 아빠가 보낸 구호품이 왔어요!';
  // 🏁 영상 몫은 아빠가 보낸 것이 아니다 — 그림·버튼 말도 그에 맞게 (헤드리스: "고마워요, 아빠!"가 떴다)
  const icon = document.querySelector('#parcel .taken-lock');
  if (icon) icon.textContent = cur.kind === 'video' ? '🏁' : '📦';
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
  note.textContent = cur.text ? `${cur.icon || '💌'} ${cur.text}` : '';
  note.hidden = !cur.text;
  $('parcel-sub').textContent = '';
  const ok = $('parcel-ok');
  ok.textContent = cur.kind === 'video' ? '🎁 받기' : '📦 받기'; // 🏁 영상 몫은 💰·🔶 둘 다
  ok.disabled = false;
}

async function onButton() {
  const ok = $('parcel-ok');
  if (step === 'busy') return;
  if (step === 'done') { close(); return; }
  step = 'busy';
  ok.disabled = true;
  let r;
  try { r = cur.kind === 'video' ? await receiveVideoStones(cur.due.map((d) => ({ id: d.id, total: d.total }))) : await receiveParcel(cur); } catch { r = { ok: false, why: 'save' }; }
  step = 'done';
  ok.disabled = false;
  if (r.ok) {
    $('parcel-title').textContent = '🎒 가방에 넣었어요!';
    $('parcel-sub').textContent = afterLine(r.items || cur.items, shinyLeft());
    ok.textContent = cur.kind === 'video' ? '좋아요!' : '고마워요, 아빠!';
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
