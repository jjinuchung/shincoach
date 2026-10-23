// ⚡ 국어·논술 경험치 주기 (v327, 2026-10-23 아버님 "이대로") — 얼마는 저장 규칙이 같은 트랜잭션에서 정해 돌려준다(korean.KOR_XP ·
// korFinishRule·korWordsRule·korPuzzleRule·nonsulRule의 xp). 여기서는 주기와 🎉 레벨 업(🎁 레벨업 상자 · 새 포켓몬 수)만 —
// 영어(player.awardXp)·수학과 같은 길: gainXp(메모리 + 증분 저장) → 레벨이 오르면 lootBox 하나를 가방에
import { gainXp, addItem } from './xp.js';
import { itemById, lootBox } from './items.js';
import { unlockCountAt } from './pokemon.js';
import { sfx } from './sfx.js';

/** 잠깐 떴다 사라지는 알림 (수학·배틀 결과와 같은 꼴) */
function toast(text) {
  const box = document.createElement('div');
  box.className = 'math-toast';
  box.textContent = text;
  document.body.appendChild(box);
  setTimeout(() => { box.classList.add('out'); }, 5200);
  setTimeout(() => { box.remove(); }, 6000);
}

/** 레벨이 올랐을 때 알림 글 (순수) — 새로 열린 포켓몬 수·선물 */
export function levelUpText(to, fresh, gift) {
  const head = fresh ? `🎉 레벨 업! Lv.${to} — 새 포켓몬 ${fresh}마리가 나타났어요!` : `🎉 레벨 업! Lv.${to}`;
  return head + (gift ? ` 🎁 선물: ${gift.emoji} ${gift.ko}!` : '');
}

/**
 * 국어·논술에서 받은 ⚡를 준다 — 0이면 아무것도 안 한다 · 레벨이 오르면 🎁 레벨업 상자 + 알림
 * @param {number} n 저장 규칙이 돌려준 xp
 * @returns {{gained:number, leveledUp:boolean, to:number}|null}
 */
export function korGainXp(n) {
  const amount = Math.floor(Number(n) || 0);
  if (!(amount > 0)) return null;
  const g = gainXp(amount);
  if (g && g.leveledUp) {
    try { sfx.levelUp(); } catch { /* 소리는 없어도 */ }
    const gift = itemById(lootBox());
    if (gift) addItem(gift.id);
    toast(levelUpText(g.to, unlockCountAt(g.to), gift));
  }
  return g;
}
