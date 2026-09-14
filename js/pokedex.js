// 🎒 내 포켓몬(도감) 화면: 레벨·경험치, 잡은 포켓몬(그림·마릿수), 못 잡은 포켓몬(검은 실루엣 + ???)
import { ROSTER, loadCharacters, nextUnlockLevel, unlockCountAt } from './pokemon.js';
import { getLevelInfo, getProfileSnapshot, rarityOf, RARITY, caughtKinds, streakBefore, STREAK_MIN_DONE, xpToReach } from './xp.js';
import { listDaily } from './db.js';
import { todayKey, todayDone } from './track.js';

const $ = (id) => document.getElementById(id);
let showView;

export function initPokedex(ctx) {
  showView = ctx.showView;
  $('btn-pokedex').addEventListener('click', openPokedex);
  $('btn-pokedex-back').addEventListener('click', () => showView('library'));
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

export async function openPokedex() {
  const chars = await loadCharacters().catch(() => []);
  const urlById = new Map(chars.map((c) => [c.id, c.url]));
  const info = getLevelInfo();
  const p = getProfileSnapshot();
  const main = $('pokedex-main');
  main.innerHTML = '';
  const daily = await listDaily().catch(() => []);
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
  main.appendChild(card);

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
        const img = document.createElement('img');
        img.src = url;
        img.alt = n > 0 ? m.ko : '???';
        img.draggable = false;
        cell.appendChild(img);
      } else {
        cell.appendChild(el('div', 'pokedex-noimg', '?'));
      }
      cell.appendChild(el('div', 'nm', n > 0 ? m.ko : '???'));
      if (n > 1) cell.appendChild(el('div', 'cnt', `×${n}`));
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
      if (url) {
        const img = document.createElement('img');
        img.src = url;
        img.alt = '???';
        img.draggable = false;
        cell.appendChild(img);
      } else {
        cell.appendChild(el('div', 'pokedex-noimg', '?'));
      }
      cell.appendChild(el('div', 'nm', '???'));
      grid.appendChild(cell);
    }
    sec.appendChild(grid);
    main.appendChild(sec);
  }
  showView('pokedex');
}
