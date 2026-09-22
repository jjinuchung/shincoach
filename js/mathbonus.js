// ✨ 오늘의 보너스 — ☀️ 오늘의 수학을 **하루 첫 완주**하면 받는 것 하나. 날짜가 씨앗이라 홈 카드(미리보기)와 완주 카드(지급)가 같은 것을 가리킨다.
//
// 왜 있는가 (아버님 2026-09-22): 아이가 영어(쉬움)만 골라서, 홈에서 수학 카드가 **반짝이며 오늘 뭘 주는지** 보여야 수학을 누르고 싶어진다.
// 무엇을 주나: 코인 상점의 것(슈퍼볼·하이퍼볼)과 상점에 없는 것(🌟 황금볼), 그리고 ⚡·💰 — 매일 다른 것이 나오게 확률 차등.
// 4단계(🧤 스톤)가 생기면 🔷 수학스톤이 드문 보너스로 여기에 들어온다.
// 순수 로직만 — 지급(addItem·gainXp·gainCoins)은 math.js finishRound가 daily.first(저장 트랜잭션 판정)일 때만 한다.
import { rng } from './mathgen.js';

/**
 * 보너스 목록. w = 뽑힐 무게 (합 10). give = 지급 내용 — item(id, n) | xp | coin
 * 🌟 황금볼은 🎲 섞어 풀기 전부 정답의 🌟(하루 1개)와 별개 — 보너스로 나온 날 둘 다 받을 수 있다.
 */
export const BONUSES = [
  { id: 'greatball2', emoji: '🔵', label: '슈퍼볼 2개', w: 3, give: { item: 'greatball', n: 2 } },
  { id: 'xp30', emoji: '⚡', label: '경험치 +30', w: 2, give: { xp: 30 } },
  { id: 'coin15', emoji: '💰', label: '코인 +15', w: 2, give: { coin: 15 } },
  { id: 'golden', emoji: '🌟', label: '황금 몬스터볼 1개', w: 2, give: { item: 'goldenball', n: 1 } },
  { id: 'ultra', emoji: '🟡', label: '하이퍼볼 1개', w: 1, give: { item: 'ultraball', n: 1 } },
];

/** 'YYYY-MM-DD' → 정수 씨앗 (같은 날이면 어느 창·기기에서도 같은 보너스) */
export function seedOfDay(dateKey) {
  let h = 2166136261;
  for (const ch of String(dateKey || '')) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

/**
 * 오늘의 보너스 하나.
 * @param {string} dateKey track.todayKey()
 * @returns {{id:string, emoji:string, label:string, give:object}}
 */
export function dailyBonus(dateKey) {
  const r = rng(seedOfDay(dateKey));
  const total = BONUSES.reduce((a, b) => a + b.w, 0);
  let x = r() * total;
  for (const b of BONUSES) { x -= b.w; if (x < 0) return b; }
  return BONUSES[BONUSES.length - 1];
}

/** 카드·칩에 쓰는 짧은 글 — "🔵 슈퍼볼 2개" */
export function bonusText(b) {
  return b ? `${b.emoji} ${b.label}` : '';
}
