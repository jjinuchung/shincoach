// 🔒 부모가 포켓몬 데려가기 (2026-09-28, 아버님 요청)
//
// 왜: 진우가 태블릿에 몰래 게임을 깔아서 벌을 주기로 했다. 아버님 말씀 그대로 —
//     "부모 암호로 삭제할 수 있게. 완전 삭제는 아니고 모은 거에서 빠지고 **나중에 또 구할 수는 있도록**."
//
// 규칙은 db.takeMonRule에 있다. 여기는 화면만:
//   ① 부모 화면 — 🔒 비밀번호를 맞힌 뒤, 지금 데리고 있는 포켓몬 중에서 골라 데려간다
//   ② 아이 알림 — 앱을 열면 "아빠가 데려갔어요"를 한 번 보여 준다 (아버님 결정: 조용히 사라지면 앱 탓을 한다)
//
// ★ 도감 칸은 남는다(잡았던 적 있음). 보유만 0이 되어 🤝 파트너·⚔️ 배틀·🎀 꾸미기에서 빠지고,
//   **다시 잡으면 돌아온다.** 영구 삭제가 아니다.

import { ownedIds, takeMons, haveCount, rarityOf, RARITY, unseenTaken, markTakenSeen } from './xp.js';
import { ROSTER, ensureCast, characterUrl } from './pokemon.js';
import { sfx } from './sfx.js';

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined && text !== null) e.textContent = String(text);
  return e;
};
const nameOf = (id) => (ROSTER.find((r) => r.id === Number(id)) || {}).ko || `#${id}`;

let askPin = null;
let picked = new Set();

export function initTaken({ requirePin } = {}) {
  askPin = typeof requirePin === 'function' ? requirePin : null;
  const close = $('take-close');
  if (close) close.addEventListener('click', closeTakeTool);
  const ok = $('taken-ok');
  if (ok) ok.addEventListener('click', closeTakenNotice);
}

// ───────────────────── ① 부모 화면 ─────────────────────

/** ⚙ 설정에서 부른다 — 🔒 비밀번호를 맞혀야 열린다 */
export function openTakeTool() {
  if (!askPin) { renderTakeTool(); return; }
  askPin(() => renderTakeTool());
}

function renderTakeTool(msg) {
  const box = $('take');
  if (!box) return;
  picked = new Set();
  const main = $('take-main');
  main.innerHTML = '';

  main.appendChild(el('p', 'take-lede', '지금 데리고 있는 포켓몬만 보여요. 고른 만큼 데려가면 도감 칸은 남고 보유만 빠져요 — 다시 잡으면 돌아와요.'));
  if (msg) main.appendChild(el('p', 'take-msg', msg));

  const ids = ownedIds();
  if (!ids.length) {
    main.appendChild(el('p', 'take-empty', '데리고 있는 포켓몬이 없어요.'));
    paintBar();
    box.hidden = false;
    return;
  }

  // 등급이 높은 것부터 (전설 → 희귀 → …) — 부모가 찾는 것은 보통 위쪽에 있다
  const byRarity = new Map();
  for (const id of ids) {
    const r = rarityOf(id);
    if (!byRarity.has(r)) byRarity.set(r, []);
    byRarity.get(r).push(id);
  }
  for (const r of [...byRarity.keys()].sort((a, b) => b - a)) {
    const info = RARITY[r] || { stars: '', label: '' };
    const sec = el('section', 'take-sec');
    sec.appendChild(el('h3', 'take-sec-head', `${info.stars} ${info.label} · ${byRarity.get(r).length}마리`));
    const grid = el('div', 'take-grid');
    for (const id of byRarity.get(r)) {
      const n = haveCount(id);
      const b = el('button', 'take-mon');
      b.type = 'button';
      b.appendChild(el('span', 'take-mon-name', nameOf(id)));
      if (n > 1) b.appendChild(el('span', 'take-mon-n', `×${n}`));
      b.addEventListener('click', () => {
        if (picked.has(id)) picked.delete(id); else picked.add(id);
        b.classList.toggle('on', picked.has(id));
        paintBar();
      });
      grid.appendChild(b);
    }
    sec.appendChild(grid);
    main.appendChild(sec);
  }
  paintBar();
  box.hidden = false;
}

function paintBar() {
  const bar = $('take-bar');
  if (!bar) return;
  bar.innerHTML = '';
  const n = picked.size;
  const info = el('span', 'take-count', n ? `${n}마리 고름 — ${[...picked].map(nameOf).join(', ')}` : '데려갈 포켓몬을 눌러요');
  bar.appendChild(info);
  const go = el('button', 'btn btn-primary take-go', n ? `🔒 ${n}마리 데려가기` : '🔒 데려가기');
  go.type = 'button';
  go.disabled = !n;
  go.addEventListener('click', confirmTake);
  bar.appendChild(go);
}

/** 한 번 더 묻는다 — 되돌리는 버튼은 없다(다시 잡아야 한다) */
function confirmTake() {
  const list = [...picked];
  if (!list.length) return;
  const main = $('take-main');
  main.innerHTML = '';
  const card = el('section', 'take-confirm');
  card.appendChild(el('h3', '', `정말 ${list.length}마리를 데려갈까요?`));
  const ul = el('ul', 'take-confirm-list');
  for (const id of list) {
    const info = RARITY[rarityOf(id)] || { stars: '' };
    ul.appendChild(el('li', '', `${info.stars} ${nameOf(id)}`));
  }
  card.appendChild(ul);
  card.appendChild(el('p', 'take-warn', '되돌리는 버튼은 없어요. 진우가 다시 잡으면 돌아옵니다.'));

  const row = el('div', 'take-confirm-row');
  const no = el('button', 'btn', '아니요');
  no.type = 'button';
  no.addEventListener('click', () => renderTakeTool());
  const yes = el('button', 'btn btn-primary', `네, ${list.length}마리 데려갈게요`);
  yes.type = 'button';
  yes.addEventListener('click', async () => {
    yes.disabled = true; no.disabled = true;
    const r = await takeMons(list).catch(() => ({ ok: false, results: [] }));
    const took = (r.results || []).filter((x) => x.ok);
    renderTakeTool(r.ok
      ? `✅ ${took.length}마리를 데려갔어요 — ${took.map((x) => nameOf(x.id)).join(', ')}`
      : '데려가지 못했어요. 잠시 뒤 다시 해 주세요.');
  });
  row.appendChild(no);
  row.appendChild(yes);
  card.appendChild(row);
  main.appendChild(card);
  const bar = $('take-bar');
  if (bar) bar.innerHTML = '';
}

export function closeTakeTool() {
  const box = $('take');
  if (box) box.hidden = true;
  picked = new Set();
}

// ───────────────────── ② 아이 알림 ─────────────────────

/** 다른 모달이 열려 있으면 그 위에 겹치지 않는다 (🐣 부화와 같은 규칙) */
function anyModalOpen() {
  return ['catch', 'shop', 'mon', 'battle', 'puzzle', 'review', 'essay', 'match', 'evolve', 'hatch', 'timeup', 'take', 'parcel']
    .some((id) => { const e = $(id); return e && !e.hidden; });
}

/**
 * 🔒 아직 안 보여 준 "데려감"이 있으면 한 번 보여 준다.
 * 조용히 사라지면 아이가 앱이 고장 난 줄 안다 (아버님 결정 2026-09-28).
 * @returns {Promise<boolean>} 보여 줬는가
 */
export async function showTakenNoticeIfAny() {
  const box = $('taken');
  if (!box || !box.hidden || anyModalOpen()) return false;
  const list = unseenTaken();
  if (!list.length) return false;

  const ids = list.map((x) => x.id);
  try { await Promise.race([ensureCast(ids), new Promise((r) => setTimeout(r, 5000))]); } catch { /* 그림 없이도 보여 준다 */ }
  if (anyModalOpen()) return false;              // 그 사이 다른 게 열렸다 — 다음 기회에

  const stage = $('taken-stage');
  stage.innerHTML = '';
  for (const id of ids) {
    const cell = el('div', 'taken-cell');
    const url = characterUrl(id);
    if (url) {
      const img = document.createElement('img');
      img.src = url; img.alt = nameOf(id); img.className = 'taken-img';
      cell.appendChild(img);
    } else {
      cell.appendChild(el('div', 'taken-emoji', '❔'));
    }
    cell.appendChild(el('span', 'taken-name', nameOf(id)));
    stage.appendChild(cell);
  }
  $('taken-title').textContent = `🔒 아빠가 포켓몬 ${ids.length}마리를 데려갔어요`;
  $('taken-text').textContent = '도감 칸은 그대로 있어요. 다시 잡으면 돌아와요!';
  box.hidden = false;
  try { sfx.wrong(); } catch { /* 소리는 없어도 */ }
  return true;
}

export function closeTakenNotice() {
  const box = $('taken');
  if (!box || box.hidden) return;
  box.hidden = true;
  markTakenSeen().catch(() => {});   // "봤다"는 아이가 버튼을 눌렀을 때 적는다
}
