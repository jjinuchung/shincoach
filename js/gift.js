// 🎁 선물 교환권 사진 (2026-10-04, 아버님: "자전거 벨도 교환권으로 — 사진은 내가 태블릿에 넣어서 직접 적용할게").
//
// 사진은 아빠가 ⚙ 설정에서 태블릿의 사진을 골라 넣는다 → db의 blobs 'gift:<id>'에 **이 기기에만** 둔다.
// 피카츄가 들어간 상품 사진이라 공개 저장소(GitHub Pages)에 올리지 않는다 (unlock.js LOCKED 주석의 원칙).
// 사진이 아직 없으면 포켓몬 그림(PokeAPI, 이미 기기에 받아 둔 것), 그것도 없으면 이모지로 보인다 — 카드는 늘 뜬다.
import { getGiftPhoto, putGiftPhoto, deleteGiftPhoto } from './db.js';
import { GIFTS } from './unlock.js';
import { characterUrl } from './pokemon.js';

const urls = new Map(); // 선물 id → objectURL (없으면 null) — 화면을 다시 그릴 때마다 Blob을 새로 읽지 않게

/** 넣어 둔 사진의 주소 (없으면 null) */
export async function giftPhotoUrl(id) {
  if (urls.has(id)) return urls.get(id);
  let blob = null;
  try { blob = await getGiftPhoto(id); } catch { blob = null; }
  const u = blob ? URL.createObjectURL(blob) : null;
  urls.set(id, u);
  return u;
}

function forget(id) {
  const u = urls.get(id);
  if (u) URL.revokeObjectURL(u);
  urls.delete(id);
}

/**
 * 선물 사진 칸 — 바로 그려지는 대신 그림(포켓몬 그림 → 이모지)으로 먼저 보이고, 넣어 둔 사진이 있으면 뒤에 바꿔 끼운다
 * @param {{id:string, ko:string, emoji:string, poster:number}} g
 */
export function giftPoster(g, cls = 'next-poster gift-photo') {
  const box = document.createElement('div');
  box.className = cls;
  const show = (src, alt) => {
    box.textContent = '';
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt;
    box.appendChild(img);
  };
  const art = characterUrl(g.poster);
  if (art) show(art, ''); else box.textContent = g.emoji;
  giftPhotoUrl(g.id).then((u) => { if (u) { show(u, g.ko); box.classList.add('has-photo'); } }).catch(() => {});
  return box;
}

/** ⚙ 설정의 "🎁 선물 교환권 사진" — 고르면 이 기기에 저장, 지우면 그림으로 돌아간다 */
export function initGiftSettings() {
  const btn = document.getElementById('set-gift-photo');
  if (!btn) return;
  const del = document.getElementById('set-gift-photo-del');
  const note = document.getElementById('set-gift-photo-note');
  const g = GIFTS[0]; // 지금 선물은 하나(🔔 자전거 벨) — 늘면 고르는 칸을 만든다
  const say = (t) => { if (note) note.textContent = t; };
  const refresh = async () => {
    const u = await giftPhotoUrl(g.id);
    say(u ? `✅ ${g.emoji} ${g.ko} 사진이 들어 있어요` : `아직 사진이 없어요 — 지금은 피카츄 그림으로 보여요`);
    if (del) del.hidden = !u;
  };
  const input = document.createElement('input');
  input.type = 'file';
  input.id = 'gift-photo-input';
  input.accept = 'image/*';
  input.hidden = true;
  document.body.appendChild(input);
  btn.addEventListener('click', () => input.click());
  input.addEventListener('change', async () => {
    const f = input.files && input.files[0];
    input.value = '';
    if (!f) return;
    if (!/^image\//.test(f.type || '')) { say('사진 파일만 넣을 수 있어요'); return; }
    try {
      await putGiftPhoto(g.id, f);
      forget(g.id);
      await refresh();
    } catch (e) { say(`저장하지 못했어요: ${(e && e.message) || e}`); }
  });
  if (del) del.addEventListener('click', async () => {
    try { await deleteGiftPhoto(g.id); } catch { /* 없으면 그만 */ }
    forget(g.id);
    await refresh();
  });
  refresh().catch(() => {});
}
