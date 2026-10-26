// 📦 새 국어 글은 하루에 두 편씩 열린다 (v320, 2026-10-22 아버님 "새 국어 글 한 묶음 시작하자" → 기본안 "이대로 진행")
//
// 까닭: 새 글이 한꺼번에 들어오면 한자리에서 다 훑어 버리고(10-21 — 스물일곱 편을 한 편 20초 안팎으로), 다음 날부터는 새 글이 없다.
//   묶음마다 처음 국어를 연 날부터 하루 perDay편씩 차례대로 열려, 날마다 새 글이 있게 한다. 열린 글은 언제든 다시 읽는다.
// · 아이 화면(도감·단원 지도·낱말·퍼즐)에서만 잠긴 글을 뺀다 — 아빠 보고(📤 국어 요약)는 모든 글을 센다
// · 이미 읽은 글은 잠그지 않는다(두 기기·옛 백업에서 온 기록) · 묶음에 없는 글은 늘 보인다
// · 시작 날은 프로필 korDrip { 묶음: 'YYYY-MM-DD' } — 병합은 이른 날(늦은 날이 이기면 열린 글이 다시 잠긴다)
// · 시작 날을 못 적었으면 목록을 부를 때마다 다시 적는다 — 그사이 화면은 이 실행에서 처음 받은 날로 센다(withFirst, Codex 126차 #3)
// · 시계를 앞으로 돌리면 일찍 열릴 뿐 받을 별·💰는 같다(글마다 정해져 있다) · 뒤로 돌리면 첫날 몫만
// · 이어 여는 묶음(after, v322): 앞 묶음이 다 열린 다음 날보다 일찍 열리지 않는다 — 두 묶음을 한꺼번에 받아도 하루 네 편이 되지 않게
//   그 전에는 한 편도 안 열린다 · 앞 묶음이 다 열린 지 오래면 이 묶음을 처음 받은 날(적힌 날)부터
// ★ 아무것도 import하지 않는다 — 시험이 그대로 부른다

/** 묶음 — key는 저장 열쇠(바꾸지 않는다) · order는 열리는 차례(지금 배우는 단원부터) · after = 이어 여는 앞 묶음 */
export const DRIP = {
  perDay: 2,
  bundles: [
    // v320 4학년 2학기 글 둘째 묶음 — 4단원·매체(10월) → 1단원 복습 → 5단원(11월) → 3단원 복습 → 6단원(12월) · 포켓몬 글은 첫날과 마지막 날
    { key: 'b320', order: ['K121', 'K123', 'K124', 'K125', 'K122', 'K119', 'K126', 'K127', 'K128', 'K120', 'K129', 'K130'] },
    // v322 셋째 묶음 — b320 다음 날부터(11월 초) · 포켓몬 글 첫날 → 5단원(11월) → 4단원·독서 → 6단원 원인과 결과 → 1·2단원 → 6단원 이어질 내용(12월)·매체
    { key: 'b322', after: 'b320', order: ['K142', 'K137', 'K138', 'K136', 'K139', 'K131', 'K140', 'K132', 'K134', 'K133', 'K141', 'K135'] },
    // v347 넷째 묶음 — b322 다음 날부터(11월 초·중순) · 포켓몬 글·명작 동시 첫날 → 1단원·독서 → 3단원 토의·독서 감상문 → 1단원 의견·매체 → 3단원 제안 ✍️·6단원 → 6단원(12월) 포켓몬·옛이야기 ✍️
    { key: 'b347', after: 'b322', order: ['K150', 'K151', 'K145', 'K143', 'K147', 'K144', 'K146', 'K149', 'K148', 'K153', 'K154', 'K152'] },
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

/** 'YYYY-MM-DD'에서 n날 뒤 */
function addDays(s, n) {
  const t = new Date(Date.UTC(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10)) + n));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
}

/** 묶음에서 열린 글 수 — 시작 날이 없으면 첫날 몫 · 시계가 시작 날보다 뒤로 가도 첫날 몫 */
export function openCount(start, today, n, perDay = DRIP.perDay) {
  const d = dayOk(start) && dayOk(today) ? Math.max(0, daysBetween(start, today)) : 0;
  return Math.min(n, perDay * (d + 1));
}

/**
 * 묶음마다 셀 시작 날 (v322) — 적힌 날 그대로 · 이어 여는 묶음은 앞 묶음이 다 열린 다음 날(앞 묶음 시작 + 날 수)보다 이르지 않게
 *   앞 묶음 시작 날이 없으면 오늘 시작하는 것으로 친다 · 적힌 날이 없는 이어 여는 묶음은 그 다음 날부터
 */
export function startsOf(state, today) {
  const st = dripOf(state);
  const out = {};
  for (const b of DRIP.bundles) {
    let s = st[b.key] || '';
    const prev = b.after ? DRIP.bundles.find((x) => x.key === b.after) : null;
    const ps = prev ? out[prev.key] || (dayOk(today) ? today : '') : '';
    if (ps) {
      const chain = addDays(ps, Math.ceil(prev.order.length / DRIP.perDay));
      if (!s || s < chain) s = chain;
    }
    if (s) out[b.key] = s;
  }
  return out;
}

/** 묶음 b에서 열린 글 수 — 이어 여는 묶음은 시작 날 전이면 0 (첫 묶음은 시작 전·시계를 뒤로 돌려도 첫날 몫) */
function openOf(b, start, today) {
  if (b.after && !(dayOk(start) && dayOk(today) && daysBetween(start, today) >= 0)) return 0;
  return openCount(start, today, b.order.length);
}

/**
 * 아직 잠긴 글 id — 묶음마다 열린 수 뒤의 글 · 읽은 글(read에 있는 id)은 빼고
 * @param {object} state profile.korDrip · @param {string} today · @param {Set<string>|Array<string>} read 이미 읽은 글
 */
export function lockedIds(state, today, read = []) {
  const st = startsOf(state, today);
  const seen = new Set(read);
  const out = new Set();
  for (const b of DRIP.bundles) {
    const k = openOf(b, st[b.key], today);
    for (const id of b.order.slice(k)) if (!seen.has(id)) out.add(id);
  }
  return out;
}

/** 아이 화면에 보일 글 (순서는 그대로) */
export function visibleCards(cards, state, today, read = []) {
  const locked = lockedIds(state, today, read);
  return (cards || []).filter((c) => c && !locked.has(c.id));
}

/** 잠긴 글이 남았나 — 📦 한 줄(셈 없이) */
export function hasLocked(cards, state, today, read = []) {
  const locked = lockedIds(state, today, read);
  return (cards || []).some((c) => c && locked.has(c.id));
}

/**
 * 내일 정말 새 글이 열리나 — 그럴 때만 「📦 내일 새 글이 와요」, 아니면 「📦 새 글이 차례로 열려요」 (Codex 127차 #4)
 *   다른 기기에서 b320을 다 읽었는데 b322는 며칠 뒤 — 잠긴 글은 남았어도 내일은 새 글이 없다
 */
export function opensTomorrow(cards, state, today, read = []) {
  if (!dayOk(today)) return false;
  const now = lockedIds(state, today, read);
  const next = lockedIds(state, addDays(today, 1), read);
  return (cards || []).some((c) => c && now.has(c.id) && !next.has(c.id));
}

/**
 * 🌱 오늘 새로 열린 글 가운데 아직 안 읽은 것 (묶음 차례대로) — 도감 머리 바로가기(셈 없이 · 읽으면 사라진다, Codex 126차 #6)
 *   새 글이 도감 뒤쪽에 놓여 찾기 어렵다 · 어제까지 열린 글은 넣지 않는다(못 읽은 날이 쌓여 밀린 목록이 되지 않게)
 *   시작 날이 없거나 시계를 뒤로 돌렸으면 첫날 몫 · 이어 여는 묶음은 시작 날 전이면 없음(v322)
 */
export function freshIds(state, today, read = []) {
  const st = startsOf(state, today);
  const seen = new Set(read);
  const out = [];
  for (const b of DRIP.bundles) {
    const s = st[b.key];
    const d = s && dayOk(today) ? daysBetween(s, today) : 0;
    const from = Math.min(b.order.length, DRIP.perDay * Math.max(0, d));
    const to = openOf(b, s, today);
    for (const id of b.order.slice(from, to)) if (!seen.has(id)) out.push(id);
  }
  return out;
}

/** 원고에 글이 들어 있는데 시작 날이 없는 묶음이 있나 — 시작 날을 (다시) 적어야 하나 (Codex 126차 #3) */
export function needsStart(state, ids) {
  const have = new Set(ids || []);
  const st = dripOf(state);
  return DRIP.bundles.some((b) => !st[b.key] && b.order.some((id) => have.has(id)));
}

/**
 * 화면이 셀 시작 날 — 적힌 날은 그대로, 시작 날이 없는 묶음은 first(이 실행에서 처음 국어 글을 받은 날)로 (Codex 126차 #3)
 *   시작 날을 못 적은 채 날이 바뀌어도 첫날 몫으로 되돌아가지 않게 · first가 바른 날이 아니면 적힌 날만
 */
export function withFirst(state, first) {
  const st = dripOf(state);
  if (!dayOk(first)) return st;
  for (const b of DRIP.bundles) if (!st[b.key]) st[b.key] = first;
  return st;
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
