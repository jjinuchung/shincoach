// 📦 새 국어 글은 하루에 두 편씩 열린다 (v320, 2026-10-22 아버님 "새 국어 글 한 묶음 시작하자" → 기본안 "이대로 진행")
//
// 까닭: 새 글이 한꺼번에 들어오면 한자리에서 다 훑어 버리고(10-21 — 스물일곱 편을 한 편 20초 안팎으로), 다음 날부터는 새 글이 없다.
//   묶음마다 처음 국어를 연 날부터 하루 perDay편씩 차례대로 열려, 날마다 새 글이 있게 한다. 열린 글은 언제든 다시 읽는다.
// · 아이 화면(도감·단원 지도·낱말·퍼즐)에서만 잠긴 글을 뺀다 — 아빠 보고(📤 국어 요약)는 모든 글을 센다
// · 이미 읽은 글은 잠그지 않는다(두 기기·옛 백업에서 온 기록) · 묶음에 없는 글은 늘 보인다
// · 시작 날은 프로필 korDrip { 묶음: 'YYYY-MM-DD' } — 병합은 이른 날(늦은 날이 이기면 열린 글이 다시 잠긴다)
// · 시계를 앞으로 돌리면 일찍 열릴 뿐 받을 별·💰는 같다(글마다 정해져 있다) · 뒤로 돌리면 첫날 몫만
// ★ 아무것도 import하지 않는다 — 시험이 그대로 부른다

/** 묶음 — key는 저장 열쇠(바꾸지 않는다) · order는 열리는 차례(지금 배우는 단원부터) */
export const DRIP = {
  perDay: 2,
  bundles: [
    // v320 4학년 2학기 글 둘째 묶음 — 4단원·매체(10월) → 1단원 복습 → 5단원(11월) → 3단원 복습 → 6단원(12월) · 포켓몬 글은 첫날과 마지막 날
    { key: 'b320', order: ['K121', 'K123', 'K124', 'K125', 'K122', 'K119', 'K126', 'K127', 'K128', 'K120', 'K129', 'K130'] },
  ],
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const dayOk = (s) => typeof s === 'string' && DATE_RE.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));

/** 'YYYY-MM-DD' 두 날 사이 날 수 (b - a) */
function daysBetween(a, b) {
  const t = (s) => Date.UTC(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10)));
  return Math.round((t(b) - t(a)) / 86400000);
}

/** 저장된 시작 날을 읽을 수 있는 꼴로 — 아는 묶음의 바른 날만 */
export function dripOf(x) {
  const out = {};
  if (!isObj(x)) return out;
  for (const b of DRIP.bundles) if (Object.hasOwn(x, b.key) && dayOk(x[b.key])) out[b.key] = x[b.key];
  return out;
}

/** 두 사본 병합 — 묶음마다 이른 날 */
export function mergeDrip(a, b) {
  const x = dripOf(a);
  const y = dripOf(b);
  const out = { ...x };
  for (const [k, v] of Object.entries(y)) if (!out[k] || v < out[k]) out[k] = v;
  return out;
}

/** 묶음에서 열린 글 수 — 시작 날이 없으면 첫날 몫 · 시계가 시작 날보다 뒤로 가도 첫날 몫 */
export function openCount(start, today, n, perDay = DRIP.perDay) {
  const d = dayOk(start) && dayOk(today) ? Math.max(0, daysBetween(start, today)) : 0;
  return Math.min(n, perDay * (d + 1));
}

/**
 * 아직 잠긴 글 id — 묶음마다 열린 수 뒤의 글 · 읽은 글(read에 있는 id)은 빼고
 * @param {object} state profile.korDrip · @param {string} today · @param {Set<string>|Array<string>} read 이미 읽은 글
 */
export function lockedIds(state, today, read = []) {
  const st = dripOf(state);
  const seen = new Set(read);
  const out = new Set();
  for (const b of DRIP.bundles) {
    const k = openCount(st[b.key], today, b.order.length);
    for (const id of b.order.slice(k)) if (!seen.has(id)) out.add(id);
  }
  return out;
}

/** 아이 화면에 보일 글 (순서는 그대로) */
export function visibleCards(cards, state, today, read = []) {
  const locked = lockedIds(state, today, read);
  return (cards || []).filter((c) => c && !locked.has(c.id));
}

/** 잠긴 글이 남았나 — 「📦 내일 새 글이 와요」 한 줄(셈 없이) */
export function hasLocked(cards, state, today, read = []) {
  const locked = lockedIds(state, today, read);
  return (cards || []).some((c) => c && locked.has(c.id));
}

/**
 * 시작 날 정하기 (규칙 — 저장된 프로필로 한 트랜잭션) — 원고에 들어 있고 아직 시작 날이 없는 묶음만 오늘로
 * @param {string[]} ids 원고에 있는 글 id (묶음이 아직 배포되지 않았으면 시작하지 않는다)
 */
export function dripStartRule(p, today, ids) {
  if (!dayOk(today)) return { ok: false, why: 'date' };
  const have = new Set(ids || []);
  const st = dripOf(p.korDrip);
  let set = 0;
  for (const b of DRIP.bundles) {
    if (st[b.key] || !b.order.some((id) => have.has(id))) continue;
    st[b.key] = today;
    set += 1;
  }
  if (!set) return { ok: false, why: 'same', quiet: true };
  p.korDrip = st;
  return { ok: true, set };
}
