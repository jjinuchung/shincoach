// 🌀 쏙쏙 여섯 땅 여행 — 땅 표와 진행 규칙 (v440 · 2026-11-26 아버님 「매번 똑같은 스테이지 — 다음 판·적·보스·배경 바뀌게」 →
// 기본안 「추천대로」 → 시안 「이대로」) · 순수 — 아무것도 import하지 않는다(homeplay·db·upload·gameview가 함께 부른다)
// 한 판(60초) = 한 땅 · 🌿 풀밭(v373 판 그대로) → 🌊 바다(v440) → 🌋 화산 → ⛰️ 산 → ☁️ 하늘 → 🏭 로켓단 기지(뒤 판에서 한 줄씩)
// 끝까지 하면(보스를 이기든 로켓단이 도망가든) 다음 땅이 열린다 · 보스를 이기면 그 땅에 🏅 · ✕로 그만둔 판은 안 센다 · 막히는 땅이 없다
// 아이 화면엔 땅 이름·그림·🏅만 — 「2/6」 「남은 땅」 「다음은 ○○」 같은 셈 글은 쓰지 않는다(셈은 📤에만)
//
// 저장: profile.homePlay.best 안에 땅마다 열쇠 하나(landKey — 'ssok' + 땅 id · 소문자라 homeplay GAME_KEY 꼴) — 값 1 = 끝까지 · 2 = 🏅
//  · 늘기만 한다 · 병합은 칸마다 큰 쪽(mergePlay 그대로) · 옛 판 앱의 playOf도 GAME_KEY 꼴 열쇠는 남긴다
//  · 옛 기록: 쏙쏙 최고 기록(ssokh)이 있으면 풀밭을 「끝까지 함」으로 읽는다(값을 옮겨 적지 않고 읽을 때 셈) — 단 v440으로 한 판이라도
//    저장되면 표지(SSOK_MARK)를 적고 그때 풀밭 열쇠로 옮긴다(그 뒤로는 ✕로 그만둔 판의 ssokh가 풀밭을 연 것처럼 읽히지 않게)
//  · 판 수·🏅 수·다녀온 땅은 📤 하루 기록에만(SSOK_DAILY · SSOK_DAY_LISTS)

/**
 * 땅 — id(소문자 · 열쇠에 붙는다) · 그림 글자 · 이름 · boss = 🤖 BOSS 덧씌울 수치(빈 것 = 풀밭과 같은 수치) · bossEmoji(길·체력 막대 끝) ·
 * appear = 보스가 나타날 때 글 · type = 보스 포켓몬 타입(null = 배지 없음) · typeEmoji = 가슴 배지 · sup = 맞으면 ×2인 능력 id(journey.CHART로 시험이 대조) ·
 * forced = 정해 둔 자리 덧씌움(FORCED) · friendIds = 우리에 갇힌 친구를 먼저 고를 포켓몬(그 땅 타입 · 시험이 MON_TYPES로 대조) ·
 * badge = 보스 그림 안 배지 자리(%) · ballZap = 셋째마다 굴리는 못 빨아들이는 것이 찌리리공인가(맞으면 「찌릿!」)
 */
export const SSOK_WORLDS = [
  {
    id: 'grass', emoji: '🌿', ko: '풀밭', boss: {}, bossEmoji: '🤖', appear: '🤖 로켓단 큰 메카가 나타났다!',
    type: null, typeEmoji: '', sup: [], forced: null, friendIds: [], badge: null, ballZap: true,
  },
  {
    // 처음 바뀐 땅이라 보스 수치는 풀밭과 같게(쉽게) · 💧 물 보스 ← ⚡ 굉장 · 둘째 조각 능력 메카는 늘 ⚡(굉장을 써 볼 수 있게)
    id: 'sea', emoji: '🌊', ko: '바다', boss: {}, bossEmoji: '🚢', appear: '🚢 로켓단 잠수함이 나타났다!',
    type: 'water', typeEmoji: '💧', sup: ['elec'], forced: { 1: 'elec' }, friendIds: [7, 54, 60, 79, 158, 183], badge: [30, 69], ballZap: false,
  },
];
export const SSOK_WORLD_IDS = SSOK_WORLDS.map((w) => w.id);
/** 능력 id → 포켓몬 타입 (상성 시험용 · 능력 id는 gamessok ABILITIES) */
export const SSOK_AB_TYPE = { fire: 'fire', elec: 'electric', rock: 'rock' };
/** v440 진행을 한 번이라도 적었다는 표지 열쇠 — 이 뒤로는 옛 기록(ssokh)을 풀밭으로 읽지 않는다 */
export const SSOK_MARK = 'ssokv';
/** 옛 쏙쏙 최고 기록 열쇠 (homeplay recKey('ssok')) */
const OLD_REC = 'ssokh';

const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
const num = (v) => (Number.isSafeInteger(v) && v > 0 ? v : 0);

/** 땅 하나 — 모르는 id·빈 값이면 🌿 풀밭 (옛 호출·시험은 땅을 안 넘긴다) */
export function ssokWorld(id) {
  return SSOK_WORLDS.find((w) => w.id === id) || SSOK_WORLDS[0];
}
/** 땅 진행 열쇠 — homePlay.best 안 */
export function landKey(id) {
  return `ssok${id}`;
}

/** 땅마다 진행 (순수) — { 땅 id: 0 안 함 · 1 끝까지 · 2 🏅 } · best = homePlay.best (깨진 값은 0) */
export function ssokProgress(best) {
  const b = isObj(best) ? best : {};
  const out = {};
  for (const w of SSOK_WORLDS) out[w.id] = Math.min(2, num(b[landKey(w.id)]));
  if (!num(b[SSOK_MARK]) && num(b[OLD_REC])) out[SSOK_WORLDS[0].id] = Math.max(out[SSOK_WORLDS[0].id], 1); // 옛 기록 → 풀밭 끝까지
  return out;
}
/** 열린 땅 (순수 · 차례대로) — 첫 땅은 늘 · 그 뒤는 앞 땅을 끝까지 했으면 */
export function ssokOpen(progress) {
  const p = isObj(progress) ? progress : {};
  const out = [];
  for (let i = 0; i < SSOK_WORLDS.length; i++) {
    if (i > 0 && !(num(p[SSOK_WORLDS[i - 1].id]) >= 1)) break;
    out.push(SSOK_WORLDS[i].id);
  }
  return out;
}
/**
 * 이번 판의 땅 (순수) — 안 가 본 열린 땅이 있으면 그 땅(새 판으로 땅이 늘면 그 새 땅) · 다 가 봤으면 열린 땅을 돌아가며
 * turn = 날짜 일수 + 오늘 쓴 게임 판 수(ssokTurn — 새로 저장하지 않는다)
 */
export function ssokPickLand(progress, turn = 0) {
  const p = isObj(progress) ? progress : {};
  const open = ssokOpen(p);
  const fresh = open.find((id) => !num(p[id]));
  if (fresh) return fresh;
  const n = Number.isSafeInteger(turn) && turn >= 0 ? turn : 0;
  return open[n % open.length];
}
/** 돌림 수 (순수) — 'YYYY-MM-DD'의 날짜 일수 + 오늘 쓴 게임 판 수 */
export function ssokTurn(day, plays = 0) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(day || ''));
  const d = m ? Math.floor(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 864e5) : 0;
  return (Number.isSafeInteger(d) && d > 0 ? d : 0) + num(plays);
}
/** 게임 카드 딱지 (순수) — 안 가 본 땅이 열려 있을 때만 「🆕 🌊」(첫 땅 풀밭은 빼고) · 없으면 '' */
export function ssokFresh(progress) {
  const p = isObj(progress) ? progress : {};
  const id = ssokOpen(p).slice(1).find((x) => !num(p[x]));
  return id ? `🆕 ${ssokWorld(id).emoji}` : '';
}

/**
 * 판 끝 진행 적기 (순수 · homeplay.gameEndRule이 같은 트랜잭션에서 부른다) — best = 이번 판 점수를 적기 **전**의 homePlay.best
 * land = 쏙쏙이 넘긴 { id, v } (v 1 끝까지 · 2 🏅 — ✕로 그만둔 판은 null)
 * → { best: 새 best, changed, land: { id, prev, now, opened } | null } (opened = 이 판으로 새로 열린 다음 땅 id)
 */
export function ssokLandRule(best, land) {
  const b = { ...(isObj(best) ? best : {}) };
  const before = ssokProgress(b);
  let changed = false;
  if (!num(b[SSOK_MARK])) { // 처음 v440 판 — 옛 기록으로 읽던 풀밭을 열쇠로 옮기고 표지를 적는다
    const g = landKey(SSOK_WORLDS[0].id);
    if (before[SSOK_WORLDS[0].id] >= 1 && !num(b[g])) b[g] = 1;
    b[SSOK_MARK] = 1;
    changed = true;
  }
  const i = isObj(land) ? SSOK_WORLDS.findIndex((w) => w.id === land.id) : -1;
  const v = i >= 0 && (land.v === 1 || land.v === 2) ? land.v : 0;
  if (!v) return { best: b, changed, land: null };
  const id = SSOK_WORLDS[i].id;
  const k = landKey(id);
  if (v > num(b[k])) { b[k] = v; changed = true; }
  const after = ssokProgress(b);
  const next = SSOK_WORLDS[i + 1];
  const opened = next && before[id] < 1 && after[id] >= 1 ? next.id : null;
  return { best: b, changed, land: { id, prev: before[id], now: after[id], opened } };
}

/** 받침이 있으면 「이」, 없으면 「가」 */
const iGa = (word) => {
  const c = String(word).charCodeAt(String(word).length - 1);
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0 ? '이' : '가';
};
/** 끝 화면 한 줄 (순수) — 「🌊 바다 🏅!」 · 「🌋 화산이 열렸어요!」 · 둘 다면 「 · 」로 · 없으면 '' (셈 글 없음) */
export function ssokEndLine(worldId, win, openedId = null) {
  const parts = [];
  const w = SSOK_WORLDS.find((x) => x.id === worldId);
  if (w && win) parts.push(`${w.emoji} ${w.ko} 🏅!`);
  const o = openedId ? SSOK_WORLDS.find((x) => x.id === openedId) : null;
  if (o) parts.push(`${o.emoji} ${o.ko}${iGa(o.ko)} 열렸어요!`);
  return parts.join(' · ');
}

/** 📤 하루 칸 — 끝까지 한 판 · 🏅 판 (db DAILY_SUMS · 병합은 큰 쪽) · 그날 끝까지 한 땅 · 🏅 땅 (DAILY_LISTS · 합집합) */
export const SSOK_DAILY = ['ssokPlays', 'ssokWins'];
export const SSOK_DAY_LISTS = ['ssokLands', 'ssokMedals'];
/** 한 판의 하루 기록 증분 (순수) — 끝까지 한 판만(land) · 모르는 땅이면 null */
export function ssokDayDelta(land) {
  if (!isObj(land) || !SSOK_WORLD_IDS.includes(land.id) || !(land.v === 1 || land.v === 2)) return null;
  return { ssokPlays: 1, ssokLands: [land.id], ...(land.v === 2 ? { ssokWins: 1, ssokMedals: [land.id] } : {}) };
}
/** 📤 하루 한 줄 (순수) — 「🌀 쏙쏙 3판(🏅 1) · 다녀온 땅 🌿🌊 · 🏅 🌊」 · 안 한 날은 '' · 땅은 표 차례 · 모르는 땅은 뺀다 */
export function ssokDayLine(d) {
  const g = (k) => (isObj(d) ? num(d[k]) : 0);
  const p = g('ssokPlays');
  const w = g('ssokWins');
  if (!p && !w) return '';
  const em = (k) => SSOK_WORLDS.filter((x) => isObj(d) && Array.isArray(d[k]) && d[k].includes(x.id)).map((x) => x.emoji).join('');
  const lands = em('ssokLands');
  const medals = em('ssokMedals');
  return `🌀 쏙쏙 ${p}판(🏅 ${w})${lands ? ` · 다녀온 땅 ${lands}` : ''}${medals ? ` · 🏅 ${medals}` : ''}`;
}
