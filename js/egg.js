// 🥚 알 — 🧤 스톤 상점의 "사고 나서도 배워야 부화하는" 물건 (2026-09-22 4b, 아버님 "인피니티 스톤" 첫 세트).
//
// 왜 알인가: 스톤을 모아 사는 걸로 끝이 아니라, 산 뒤에도 **그 과목을 5일 완주**해야 부화한다 — 스톤이 학습을 앞뒤로 다 끈다.
// 부화하면 그 과목의 희귀 이상 포켓몬 한 마리가 도감에 들어간다 (던지기 없이 확정).
//
// 규칙 (Codex 6차 설계 조언):
//   · 과목마다 품는 알은 하나 — 부화하기 전엔 같은 과목 알을 또 못 산다
//   · 부화할 종(monId)은 **살 때** 정해 저장한다 — 재시도·복구로 다시 뽑히지 않게
//   · 완주한 날짜는 합집합(같은 날 두 번 완주해도 1일), 5일이 차면 그 트랜잭션에서 부화 + 도감 등록
//   · 그림은 소유와 별개 — 그림을 못 받아도 도감엔 이미 있다(화면만 나중에)
// 순수 로직만 — 저장(트랜잭션)은 db.js(buyEggRule·eggRule), 화면은 hatch.js·shop.js·math.js.

/** 부화까지 필요한 완주 일수 */
export const EGG_NEED = 5;

/** 지금 품는 알 (부화 전) — 없으면 null */
export function activeEgg(p, subject) {
  return ((p && p.eggs) || []).find((e) => e && e.subject === subject && !e.hatchedAt) || null;
}

/** 아직 화면에서 안 보여 준 부화 (🐣 알림용) */
export function unseenHatched(p) {
  return ((p && p.eggs) || []).filter((e) => e && e.hatchedAt && !e.seen);
}

/**
 * 새 알 레코드.
 * @param {string} subject 'math' | 'english'
 * @param {number} monId 부화할 포켓몬 (살 때 정한다)
 * @param {number} now 산 시각(ms)
 * @param {string} item 산 아이템 id (egg_math·egg_english)
 */
export function newEgg(subject, monId, now, item) {
  return { id: `${subject}-${now}`, item, subject, monId: Number(monId) || 0, boughtAt: now, days: [], hatchedAt: 0, seen: false };
}

/** 진행 — { done, need } */
export function eggProgress(egg) {
  return { done: Math.min(EGG_NEED, ((egg && egg.days) || []).length), need: EGG_NEED };
}

/**
 * 부화할 종 고르기 — 그 과목의 **희귀 이상** 중에서, 아직 못 잡은 것을 먼저. 다 잡았으면 희귀 이상 아무거나(한 마리 더).
 * @param {Array<{id:number}>} roster 그 과목 명단 (pokemon.forSubject(ROSTER, subject))
 * @param {(id:number)=>number} rarityOf
 * @param {Object} caught profile.caught
 * @param {() => number} [rng]
 * @returns {number} monId (후보가 없으면 0)
 */
export function pickHatch(roster, rarityOf, caught, rng = Math.random) {
  const rare = (roster || []).filter((r) => r && rarityOf(r.id) >= 3);
  if (!rare.length) return 0;
  const fresh = rare.filter((r) => !((caught || {})[r.id] > 0));
  const pool = fresh.length ? fresh : rare;
  return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))].id;
}

/**
 * 완주한 날을 알에 적는다 — 트랜잭션 규칙 (db.mutateProfile 안에서). 5일이 차면 부화 + 도감 등록을 같은 트랜잭션에서.
 * @returns {{ok:boolean, ticked?:boolean, hatched?:boolean, egg?:object}} ok:false = 품는 알 없음
 */
export function eggRule(p, subject, dateKey, now = Date.now()) {
  const egg = activeEgg(p, subject);
  if (!egg) return { ok: false };
  const days = Array.isArray(egg.days) ? egg.days.slice() : [];
  const ticked = !days.includes(dateKey);
  if (ticked) days.push(dateKey);
  const next = { ...egg, days };
  let hatched = false;
  if (days.length >= EGG_NEED) {
    hatched = true;
    next.hatchedAt = now;
    if (next.monId) { p.caught = p.caught || {}; p.caught[next.monId] = (Number(p.caught[next.monId]) || 0) + 1; }
  }
  p.eggs = (p.eggs || []).map((e) => (e && e.id === egg.id ? next : e));
  return { ok: true, ticked, hatched, egg: next };
}

/** 🐣 알림을 보여 줬다 — 트랜잭션 규칙 */
export function eggSeenRule(p, eggId) {
  let hit = false;
  p.eggs = (p.eggs || []).map((e) => { if (e && e.id === eggId && !e.seen) { hit = true; return { ...e, seen: true }; } return e; });
  return { ok: hit };
}

/** 🎒·사다리 표시용 — 과목별 { subject, egg, done, need } (품는 알만) */
export function eggSummary(p, subjects = ['math', 'english']) {
  return subjects.map((s) => { const egg = activeEgg(p, s); return egg ? { subject: s, egg, ...eggProgress(egg) } : null; }).filter(Boolean);
}
