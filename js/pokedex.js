// 🎒 내 포켓몬(도감) 화면: 레벨·경험치·💰 코인, 잡은 포켓몬(그림·마릿수, 누르면 장식·염색), 못 잡은 포켓몬(검은 실루엣 + ???), 🛒 상점
import { ROSTER, loadCharacters, nextUnlockLevel, unlockCountAt } from './pokemon.js';
import { getLevelInfo, getProfileSnapshot, rarityOf, RARITY, caughtKinds, streakBefore, STREAK_MIN_DONE, xpToReach, coins, getLook, inventory, getPartner } from './xp.js';
import { listDaily } from './db.js';
import { todayKey, todayDone } from './track.js';
import { makeFigure, setFigure, itemById } from './items.js';
import { initShop, openShop, openMon } from './shop.js';

const $ = (id) => document.getElementById(id);
let showView;
let urlById = new Map(); // 포켓몬 id → 그림 객체 URL (열 때 채움)
let openSeq = 0;         // 도감 그리기 요청 번호 (빠르게 두 번 누르면 두 번 그려지던 것 방지)
let backTo = 'home';     // 🎒를 연 화면 — 뒤로 가면 거기로 (홈·영어·수학 어디서든 연다, 2026-09-20)

/**
 * 지금 보이는 화면 이름. 🎒·📊·플레이어 위에서 열린 거면 홈으로 (거기로 "돌아가기"는 말이 안 된다).
 * 플레이어의 레벨 칩은 closePlayer() 뒤에 여니까 그때는 영어 목록이 보이는 상태다.
 */
export function visibleView() {
  const v = document.querySelector('.view:not([hidden])');
  const name = v ? v.id.replace(/^view-/, '') : 'home';
  return ['pokedex', 'stats', 'player'].includes(name) ? 'home' : name;
}

export function initPokedex(ctx) {
  showView = ctx.showView;
  // 홈·영어·수학 상단의 🎒 전부 — 버튼마다 따로 배선하면 하나를 빠뜨린다
  for (const b of document.querySelectorAll('[data-open="pokedex"]')) b.addEventListener('click', () => openPokedex());
  $('btn-pokedex-back').addEventListener('click', () => showView(backTo));
  $('pokedex-shop').addEventListener('click', openShop);
  initShop({ onChange: refreshAfterChange });
}

/** 상점에서 사거나 포켓몬을 꾸민 뒤: 코인 표시와 그 포켓몬 자리만 다시 그림 (화면 전체를 다시 그리면 스크롤이 튐) */
function refreshAfterChange(monId) {
  renderCoins();
  refreshPartnerBadges();
  if (monId === null || monId === undefined) return;
  const fig = $('pokedex-main').querySelector(`.mon-figure[data-id="${monId}"]`);
  if (fig) {
    setFigure(fig, undefined, getLook(monId));
    fig.classList.remove('pop');
    void fig.offsetWidth;
    fig.classList.add('pop');
  }
}

/** 🤝 파트너 배지는 한 마리에게만 — 파트너가 바뀌면 전 자리의 배지를 떼고 새 자리에 붙임 */
function refreshPartnerBadges() {
  const partner = getPartner();
  for (const cell of $('pokedex-main').querySelectorAll('.pokedex-cell.got')) {
    const fig = cell.querySelector('.mon-figure');
    const on = !!fig && String(partner) === fig.dataset.id;
    let b = cell.querySelector('.partner');
    if (on && !b) { b = el('div', 'partner', '🤝'); cell.appendChild(b); }
    else if (!on && b) b.remove();
  }
}

function renderCoins() {
  $('pokedex-shop').textContent = `💰 ${coins()} · 🛒`;
  const amt = $('pokedex-main').querySelector('.pokedex-coins .amt');
  if (amt) amt.textContent = `💰 ${coins()} 코인`;
  const bag = $('pokedex-main').querySelector('.pokedex-bag');
  if (bag) bag.textContent = bagText();
}

/** 🎒 가방 한 줄 요약: "🎩×1 🔴×2" */
function bagText() {
  const inv = inventory();
  const parts = Object.keys(inv).map((id) => itemById(id)).filter(Boolean).map((it) => `${it.emoji}×${inv[it.id]}`);
  return parts.length ? `가방: ${parts.join(' ')}` : '가방이 비어 있어요';
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/** 도감 열기. opts.shop = true 면 열자마자 🛒 상점도 띄움 (플레이어 코인 칩에서) */
export async function openPokedex(opts) {
  backTo = visibleView(); // 열기 전에 잡는다 — 그려지는 사이에 화면이 바뀌면 안 되니까
  // 화면을 지운 뒤에 await가 있으므로, 아이가 🎒를 빠르게 두 번 누르면 도감이 두 번 그려진다
  // (라이브러리 🎟️ 예고가 두 번 나온 것과 같은 원인 — 2026-09-17). 마지막 요청만 화면에 남긴다.
  const seq = ++openSeq;
  const chars = await loadCharacters().catch(() => []);
  if (seq !== openSeq) return;
  urlById = new Map(chars.map((c) => [c.id, c.url]));
  const info = getLevelInfo();
  const p = getProfileSnapshot();
  const main = $('pokedex-main');
  main.innerHTML = '';
  const daily = await listDaily().catch(() => []);
  if (seq !== openSeq) return;
  const today = todayKey();
  const todayRec = daily.find((d) => d.date === today);
  const todayOk = (todayRec ? todayRec.doneKeys.length : todayDone()) >= STREAK_MIN_DONE;
  const streak = streakBefore(daily, today) + (todayOk ? 1 : 0);
  const nextLv = nextUnlockLevel(info.level);
  const unlocked = ROSTER.filter((m) => (m.unlock || 1) <= info.level);

  $('pokedex-level').textContent = `Lv.${info.level}`;

  // 레벨·경험치
  const card = el('div', 'stats-card');
  const row = el('div', 'pokedex-xp');
  row.appendChild(el('span', '', `⚡ Lv.${info.level}`));
  row.appendChild(el('span', '', `${info.into} / ${info.need} 다음 레벨까지 ${info.need - info.into}`));
  card.appendChild(row);
  const bar = el('div', 'catch-xpbar');
  const fill = el('div', 'catch-xpbar-fill');
  fill.style.width = `${Math.round((info.into / info.need) * 100)}%`;
  bar.appendChild(fill);
  card.appendChild(bar);
  card.appendChild(el('div', 'pokedex-stats', `잡은 포켓몬 ${caughtKinds()}/${unlocked.length}마리 · 몬스터볼 ${p.throws}번 던져서 ${p.catches}번 성공 · 총 경험치 ${p.xp}`));
  const hint = el('div', 'pokedex-hint');
  hint.appendChild(el('span', 'streak', streak > 0 ? `🔥 ${streak}일 연속 학습 중` : `🔥 하루 ${STREAK_MIN_DONE}문장 이상 하면 연속 학습이 시작돼요`));
  if (nextLv) hint.appendChild(el('span', 'unlock', `🔒 Lv.${nextLv}에 새 포켓몬 ${unlockCountAt(nextLv)}마리 — ⚡${xpToReach(nextLv) - p.xp} 남음`));
  card.appendChild(hint);
  // 💰 코인·🎒 가방·🛒 상점
  const coinRow = el('div', 'pokedex-coins');
  const coinLeft = el('div');
  coinLeft.appendChild(el('div', 'amt', `💰 ${coins()} 코인`));
  coinLeft.appendChild(el('div', 'pokedex-bag pokedex-stats', bagText()));
  coinRow.appendChild(coinLeft);
  const shopBtn = el('button', 'btn btn-primary', '🛒 상점');
  shopBtn.type = 'button';
  shopBtn.addEventListener('click', openShop);
  coinRow.appendChild(shopBtn);
  card.appendChild(coinRow);
  main.appendChild(card);

  main.appendChild(el('p', 'stats-note', '⭐ 등급이 이상하다고 생각되면 포켓몬을 눌러서 아빠에게 말할 수 있어요 (아직 못 잡은 포켓몬도요)'));

  if (chars.length === 0) {
    main.appendChild(el('p', 'stats-empty', '⚙ 설정에서 "포켓몬 캐릭터 받기"를 하면 그림이 보여요.'));
  }

  // 희귀도별 도감 (지금 레벨에서 열린 것만)
  for (let r = 1; r <= 4; r++) {
    const list = unlocked.filter((m) => rarityOf(m.id) === r);
    if (!list.length) continue;
    const sec = el('div', 'stats-card');
    const got = list.filter((m) => p.caught[m.id] > 0).length;
    sec.appendChild(el('h2', '', `${RARITY[r].stars} ${RARITY[r].label} (${got}/${list.length})`));
    const grid = el('div', 'pokedex-grid');
    for (const m of list) {
      const n = p.caught[m.id] || 0;
      const cell = el('div', 'pokedex-cell' + (n > 0 ? ' got' : ' unknown'));
      const url = urlById.get(m.id);
      if (url) {
        // 잡은 포켓몬은 장식·염색이 보이고, 누르면 꾸미기 화면
        const fig = makeFigure(url, n > 0 ? m.ko : '???', n > 0 ? getLook(m.id) : null);
        fig.dataset.id = String(m.id);
        cell.appendChild(fig);
      } else {
        cell.appendChild(el('div', 'pokedex-noimg', '?'));
      }
      cell.appendChild(el('div', 'nm', n > 0 ? m.ko : '???'));
      if (n > 1) cell.appendChild(el('div', 'cnt', `×${n}`));
      if (n > 0 && getPartner() === m.id) cell.appendChild(el('div', 'partner', '🤝'));
      // 못 잡은 포켓몬도 누를 수 있다 — 등급은 **잡기 전에** 맞아야 의미가 있다 (전설이 흔함에 있으면 쉽게 잡힌다)
      cell.addEventListener('click', () => openMon({ id: m.id, ko: m.ko, url, caught: n > 0 }));
      grid.appendChild(cell);
    }
    sec.appendChild(grid);
    main.appendChild(sec);
  }
  // 아직 안 열린 포켓몬: 레벨별로 잠금 표시 (실루엣만, 이름 없음)
  const lockedLevels = [...new Set(ROSTER.map((m) => m.unlock || 1))].filter((u) => u > info.level).sort((a, b) => a - b);
  for (const lv of lockedLevels) {
    const list = ROSTER.filter((m) => (m.unlock || 1) === lv);
    const sec = el('div', 'stats-card locked');
    sec.appendChild(el('h2', '', `🔒 Lv.${lv}에 열려요 (${list.length}마리)`));
    const grid = el('div', 'pokedex-grid');
    for (const m of list) {
      const cell = el('div', 'pokedex-cell unknown');
      const url = urlById.get(m.id);
      if (url) cell.appendChild(makeFigure(url, '???', null));
      else cell.appendChild(el('div', 'pokedex-noimg', '?'));
      cell.appendChild(el('div', 'nm', '???'));
      grid.appendChild(cell);
    }
    sec.appendChild(grid);
    main.appendChild(sec);
  }
  renderCoins();
  showView('pokedex');
  if (opts && opts.shop) openShop();
}
