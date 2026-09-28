// 2026-09-28 무작위 뽑기 두 가지 — 씨앗을 고정해 **누가 몇 번 돌려도 같은 결과**가 나온다
//   ① 🌌 울트라비스트 11마리 중 영어로 옮길 3마리 (아버님: "3마리만 랜덤으로 골라서 영어에서")
//   ② 🔒 벌로 데려갈 영어 ⭐⭐⭐ 희귀 1마리의 순위표 (개굴닌자 제외 — 진우가 아낀다)
//      앱의 🔒 포켓몬 데려가기 화면에서 **진우가 가진 것 중 맨 위** 한 마리를 데려간다
// 실행: node tools/picks_260928.mjs
import { ROSTER, subjectOf, ULTRA_BEASTS } from '../js/pokemon.js';
import { rarityOf } from '../js/xp.js';

/** mulberry32 — 짧고 널리 쓰이는 씨앗 난수 */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(list, seed) {
  const r = rng(seed);
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const nm = (id) => (ROSTER.find((x) => x.id === id) || {}).ko || `#${id}`;

// ① 울트라비스트 — 씨앗 20260928
const ub = shuffle([...ULTRA_BEASTS].sort((a, b) => a - b), 20260928);
console.log('① 🌌 영어로 옮길 울트라비스트 3마리 (씨앗 20260928)');
ub.slice(0, 3).forEach((id, i) => console.log(`   ${i + 1}. ${nm(id)} (${id})`));
console.log(`   수학에 남는 8마리: ${ub.slice(3).map(nm).join(' · ')}`);

// ② 희귀 순위표 — 씨앗 20260929
//    영어 ⭐⭐⭐ 중에서 개굴닌자(658) 제외, 이미 지목된 썬더(145)·세레비(251)도 제외
const SKIP = new Set([658, 145, 251]);
const pool = ROSTER
  .filter((r) => subjectOf(r.id) === 'english' && rarityOf(r.id) === 3 && !SKIP.has(r.id))
  .map((r) => r.id)
  .sort((a, b) => a - b);
const rank = shuffle(pool, 20260929);
console.log(`\n② 🔒 희귀 1마리 순위표 (씨앗 20260929 · ${pool.length}마리 · 개굴닌자·썬더·세레비 제외)`);
console.log('   진우가 가진 것 중 **맨 위** 한 마리를 데려간다');
rank.forEach((id, i) => console.log(`   ${String(i + 1).padStart(2)}. ${nm(id)}`));
