// 🚀 로켓단 습격 (2026-10-09, 아버님 아이디어) — 순수 규칙. 화면은 2단계에서.
// 수학·영어 공부 중 진우가 세 번 연속 맞히면(포켓몬이 활약하면) 로켓단(로사·로이·나옹)이 탐을 내고 나타난다.
// 문제를 맞혀 쫓아내면 만화처럼 날아가며 "반짝". 지면 노리던 포켓몬을 빼앗겨 🚀 로켓단 아지트에 갇힌다 —
// 다음 습격에서 이기면 한 마리를 되찾는다.
//
// 아버님 결정(2026-10-09): 수학 하루 3번·영어 하루 3번 따로 · 전설 아래(흔함 50 · 보통 35 · 희귀 15)에서 노림 ·
//   나머지(등장 때·배틀·아지트·파트너만 지킴·보상)는 제 추천대로 — 결정과 까닭은 .task-memory/context.md 「🚀 로켓단 습격」
// 저장(빼앗김 stolen·되찾음 back 단조 카운터, 하루 횟수)은 db.js의 rocketStealRule·rocketWinRule — 여기는 판정만.
// 이 파일은 evolve.js(순수)만 import한다 — db.js가 이 파일을 import해도 순환이 없다.
import { haveOf, rocketHeldOf } from './evolve.js';

export const ROCKET = {
  // 등장 — 그 과목을 어느 정도 한 뒤(대충 넘기기로는 못 만남), 연속으로 맞힌 바로 다음 쉼표에서 이 확률로
  //   (틀리고 기운 빠졌을 때 나타나 빼앗으면 공부가 싫어진다 — 잘 풀리는 흐름에 나타나야 이기는 경험이 쌓인다)
  chance: 0.3,
  streak: 3,
  minDone: { math: 5, en: 10 }, // 오늘 그 과목에서 푼 문항(수학)·끝낸 문장(영어)
  maxPerDay: 3,                 // 과목마다 (아버님: 수학·영어 따로 각각 3번)
  gapMin: 20,                   // 그 과목에서 나온 뒤 20분이 지나야 다시 (2026-10-09 저녁 아버님: "너무 빠른 간격으로 나와서 벌써 영어에서 3번 다 나왔어")
  field: { math: 'rocketMath', en: 'rocketEn' }, // 📅 오늘 기록(daily)의 하루 횟수 칸 — DAILY_SUMS
  minLeftSec: 300,              // ⏳ 남은 공부 시간이 5분도 안 되면 안 나온다 (배틀 도중 잠기지 않게)
  // 배틀 — 문제 최대 5개, 3번 맞히면 쫓아냄 · 3번 틀리면 빼앗김 (5문제 안에 반드시 끝난다)
  questions: 5,
  winAt: 3,
  loseAt: 3,
  winCoins: 20,                 // 이기면 💰20
  winXp: 40,                    // ⚡는 야생 배틀과 같게 (battle.js BATTLE.winXp — 테스트가 같은지 본다. battle.js는 xp.js를 import해 여기서 못 가져온다)
};

/** 노리는 포켓몬의 등급 비율 (아버님) — 1 흔함 · 2 보통 · 3 희귀. 전설(4)·🌌(5)은 노리지 않는다 */
export const STEAL_WEIGHT = { 1: 50, 2: 35, 3: 15 };

/**
 * 로켓단이 나올 차례인지 — 쉼표(수학 문항 사이·영어 문장 끝)마다 부른다. 정답이 이어질 때마다(3, 4, 5 … 연속) 다시 굴린다
 * @param {{subject:'math'|'en', doneToday:number, streak:number, todayCount:number, leftSec?:number|null, lastAt?:number, now?:number, rng?:() => number}} o
 *   leftSec: 남은 공부 시간(초) — 시간 제한이 꺼져 있으면 null · lastAt: 그 과목에서 마지막으로 나온 시각(ms, 없으면 0)
 */
/**
 * 20분 간격이 지났나 — 그 과목의 마지막 등장 시각(lastAt)에서. 기록이 미래(시계가 뒤로 간 기기)여도 간격 안으로 본다.
 * 창의 판정(shouldRocket)과 저장된 기록으로 하는 시작 판정(db.rocketBeginRule, Codex 43차 #3)이 같은 규칙을 쓴다
 */
export function rocketGapOk(lastAt, now) {
  const last = Number(lastAt) || 0;
  return !last || now - last >= ROCKET.gapMin * 60 * 1000;
}

export function shouldRocket({ subject, doneToday, streak, todayCount, leftSec = null, lastAt = 0, now = Date.now(), rng = Math.random }) {
  const need = ROCKET.minDone[subject];
  if (!need) return false;
  if ((Number(todayCount) || 0) >= ROCKET.maxPerDay) return false;
  if (!rocketGapOk(lastAt, now)) return false;
  if ((Number(doneToday) || 0) < need) return false;
  if ((Number(streak) || 0) < ROCKET.streak) return false;
  if (leftSec !== null && leftSec !== undefined && Number(leftSec) < ROCKET.minLeftSec) return false;
  return rng() < ROCKET.chance;
}

/**
 * 빼앗을 수 있는 포켓몬 [{ id, tier }] — 지금 데리고 있고(haveOf ≥ 1), 파트너가 아니고(싸우는 중), 등급이 흔함·보통·희귀인 종.
 * 등급은 아빠가 옮긴 것까지 — ctx는 화면이면 창의 프로필로, 빼앗는 판정이면 **저장된 프로필로** 만든다 (교환·팔기와 같은 원칙)
 * @param {object} pf 프로필
 * @param {{rarity:(id:number) => number, known?:(id:number) => boolean}} ctx known: 명단에 있고 🌌 울트라비스트가 아닌 종
 */
export function stealables(pf, ctx) {
  const out = [];
  const caught = (pf && pf.caught) || {};
  const mons = (pf && pf.mons) || {};
  for (const k of Object.keys(caught)) {
    const id = Number(k);
    if (!id || id === Number(pf.partner)) continue;
    if (ctx.known && !ctx.known(id)) continue;
    if (haveOf(caught[k], mons[id]) < 1) continue;
    const tier = Number(ctx.rarity(id));
    if (!STEAL_WEIGHT[tier]) continue;
    out.push({ id, tier });
  }
  return out.sort((a, b) => a.id - b.id);
}

/**
 * 노릴 포켓몬 하나 — 먼저 등급을 50 : 35 : 15로(가진 포켓몬이 없는 등급은 빼고 남은 등급끼리 다시 나눔), 그 등급 안에서는 종마다 같게.
 * @param {Array<{id:number, tier:number}>} list stealables의 결과
 * @returns {{id:number, tier:number}|null}
 */
export function pickTarget(list, rng = Math.random) {
  if (!list || !list.length) return null;
  const tiers = [1, 2, 3].filter((t) => list.some((m) => m.tier === t));
  const total = tiers.reduce((s, t) => s + STEAL_WEIGHT[t], 0);
  let x = rng() * total;
  let tier = tiers[tiers.length - 1];
  for (const t of tiers) {
    if (x < STEAL_WEIGHT[t]) { tier = t; break; }
    x -= STEAL_WEIGHT[t];
  }
  const pool = list.filter((m) => m.tier === tier);
  return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
}

/** 배틀 시작 상태 */
export function rocketStart() {
  return { asked: 0, right: 0, wrong: 0, outcome: null };
}

/**
 * 새 배틀 기록 — 프로필에 저장해 두고(rocketCur) 문제마다 고친다. 앱이 꺼져도 다음에 열면 **그 배틀이 이어진다**
 * (아버님 결정 (다): 도망칠 수도 억울할 수도 없게). id는 끝난 배틀 목록(rocketDone)의 열쇠 — 같은 배틀을 두 번 처리하지 않는다
 * @param {{subject:'math'|'en', target:number, stem?:string|null, now?:number, rnd?:() => number}} o stem: 수학 문제를 낼 줄기
 */
export function rocketNew({ subject, target, stem = null, now = Date.now(), rnd = Math.random }) {
  const id = `r${Math.floor(now).toString(36)}${Math.floor(rnd() * 46656).toString(36)}`;
  return { id, subject, target: Number(target), stem: stem || null, st: rocketStart(), at: Math.floor(now) };
}

/**
 * 한 문제의 결과를 더한다 → 새 상태. outcome: 'win'(3번 맞힘 — 쫓아냄) · 'lose'(3번 틀림 — 빼앗김) · null(계속)
 * 끝난 상태에는 더 더하지 않는다
 */
export function rocketStep(st, correct) {
  if (st.outcome) return st;
  const right = st.right + (correct ? 1 : 0);
  const wrong = st.wrong + (correct ? 0 : 1);
  const outcome = right >= ROCKET.winAt ? 'win' : wrong >= ROCKET.loseAt ? 'lose' : null;
  return { asked: st.asked + 1, right, wrong, outcome };
}

/** 진행 중인 배틀 기록 복사 (규칙이 마음껏 고치게 — st까지) */
export function copyRocketCur(cur) {
  if (!cur || typeof cur !== 'object' || !cur.id) return null;
  return { ...cur, st: { ...rocketStart(), ...(cur.st || {}) } };
}

/** 끝난 배틀 목록 병합 — 합집합(한 번 끝났으면 계속 끝난 것). 같은 배틀이면 먼저 끝난 기록 */
export function mergeRocketDone(a, b) {
  const out = { ...(a || {}) };
  for (const k of Object.keys(b || {})) {
    const x = out[k]; const y = b[k];
    if (!x || (y && Number(y.at) < Number(x.at))) out[k] = y;
  }
  return out;
}

/** 🚀 로켓단 아지트에 갇힌 포켓몬 [{ id, n }] (id 오름차순) — 이기면 이 중 하나를 되찾는다 */
export function hideout(pf) {
  const out = [];
  const mons = (pf && pf.mons) || {};
  for (const k of Object.keys(mons)) {
    const n = rocketHeldOf(mons[k]);
    if (n > 0) out.push({ id: Number(k), n });
  }
  return out.sort((a, b) => a.id - b.id);
}
