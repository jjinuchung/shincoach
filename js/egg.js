// 🥚 알 — 🧤 스톤 상점의 "사고 나서도 배워야 부화하는" 물건 (2026-09-22 4b, 아버님 "인피니티 스톤" 첫 세트).
//
// 왜 알인가: 스톤을 모아 사는 걸로 끝이 아니라, 산 뒤에도 **그 과목을 5일 완주**해야 부화한다 — 스톤이 학습을 앞뒤로 다 끈다.
// 부화하면 그 과목의 희귀 이상 포켓몬 한 마리가 도감에 들어간다 (던지기 없이 확정).
//
// 규칙 (Codex 6차 설계 조언):
//   · 과목마다 품는 알은 하나 — 부화하기 전엔 같은 과목 알을 또 못 산다
//   · 부화할 종(monId)은 **살 때** 정해 저장한다 — 재시도·복구로 다시 뽑히지 않게
//   · 부화는 **줄기의 시작형**으로 (원작대로) — 목표(희귀)는 egg.target에 같이 적어 두고 🐣 화면에서 알려 준다
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
 * @param {number} monId 부화할 포켓몬 = **줄기의 시작형** (살 때 정한다)
 * @param {number} now 산 시각(ms)
 * @param {string} item 산 아이템 id (egg_math·egg_english)
 * @param {number} [target] 자라면 되는 종 (🐣 "자라면 염무왕이 돼요"). 안 주면 monId와 같다
 */
export function newEgg(subject, monId, now, item, target) {
  const id = Number(monId) || 0;
  return { id: `${subject}-${now}`, item, subject, monId: id, target: Number(target) || id, boughtAt: now, days: [], hatchedAt: 0, seen: false };
}

/** 진행 — { done, need } */
export function eggProgress(egg) {
  return { done: Math.min(EGG_NEED, ((egg && egg.days) || []).length), need: EGG_NEED };
}

/** 🥚 알의 **목표** 등급 — 희귀(⭐⭐⭐) 하나뿐이다 */
export const EGG_RARITY = 3;

/**
 * 알에서 나올 종 고르기 — **목표는 희귀 한 마리**, 실제로 부화하는 것은 **그 줄기의 시작형**.
 *
 * ★ 2026-09-27 진우 지적: 알을 깠는데 **염무왕**이 나왔다. "알에서 이제 태어났는데 왜 다 컸어요?"
 *   맞는 말이다 — 원작에서 알은 **언제나 최저 단계**로 부화한다. 그래서 목표(희귀)를 먼저 뽑고,
 *   `baseOf`로 그 줄기의 시작형을 찾아 그것을 깐다. 부화 화면이 "자라면 🔥 염무왕이 돼요"라고
 *   알려 주므로 알이 시시해지지 않는다 — 오히려 🧬 진화·🔷 스톤에 **목표가 생긴다**.
 * ★ 전설·환상은 목표에서 뺀다 — 원작에서 전설은 알을 낳지 않는다 (아버님 결정 2026-09-27).
 * ★ 줄기의 시작형이 **원작에선 진짜 시작형이 아닌** 목표도 뺀다(`isTrueBase`) — 액스라이즈는 명단에
 *   액스새·액수스가 없어 앱에선 시작형처럼 보이지만, 알에서 나오면 진우가 또 "다 컸잖아요" 할 것이다.
 * ★ 🌌 울트라비스트는 부르는 쪽(`forHole(…, false)`)에서 이미 빠져 있다 (Codex 11차 #2).
 *
 * @param {Array<{id:number}>} roster 그 과목 명단 (pokemon.forSubject(ROSTER, subject))
 * @param {(id:number)=>number} rarityOf
 * @param {Object} caught profile.caught — 못 잡은 목표를 먼저
 * @param {{baseOf?:(id:number)=>number, isLegendary?:(id:number)=>boolean, isTrueBase?:(id:number)=>boolean, rng?:()=>number}} [opt]
 * @returns {{id:number, target:number}} id = 부화할 종(시작형) · target = 자라면 되는 종. 후보가 없으면 {id:0,target:0}
 */
export function pickHatch(roster, rarityOf, caught, opt = {}) {
  const baseOf = typeof opt.baseOf === 'function' ? opt.baseOf : (id) => id;
  const isLegendary = typeof opt.isLegendary === 'function' ? opt.isLegendary : () => false;
  const isTrueBase = typeof opt.isTrueBase === 'function' ? opt.isTrueBase : () => true;
  const rng = typeof opt.rng === 'function' ? opt.rng : Math.random;
  const rare = (roster || []).filter((r) => r && rarityOf(r.id) === EGG_RARITY && !isLegendary(r.id) && isTrueBase(baseOf(r.id)));
  if (!rare.length) return { id: 0, target: 0 };
  const fresh = rare.filter((r) => !((caught || {})[r.id] > 0));
  const pool = fresh.length ? fresh : rare;
  const target = pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))].id;
  const id = Math.max(0, Math.floor(Number(baseOf(target)) || 0)) || target;
  return { id, target };
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
