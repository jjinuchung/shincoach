// 🎣 학습 낚시터 — 순수 규칙 (v366 · 2026-10-30 아버님 「진우가 낚시를 엄청 좋아해 — 학습을 도울 수 있게」 → 기본안 「물고기 16종으로 · 나머지 이대로」)
// 🎣 잉어킹 낚시(gamefish.js · 게임기 미니 게임)와는 따로인 새 놀이 — 하루 20분 저수지 나들이.
// 한 마리 = ① 찌 던지기 ② 기다리기(밑밥) ③ 입질·챔질 ④ 사투 ⑤ 뜰채 — 단계마다 네 과목(수학·영어·국어·논술) 「이미 배운 문제」 4지선다:
//   ① 맞히면 그날 열린 자리 중 가장 먼 곳(먼 곳일수록 큰 별 몫) · 틀리면 가까운 물가
//   ② 맞히면 큰 별 몫이 오름 · 물가 1문제, 수초 밭·깊은 곳 2문제 — 맞히든 틀리든 그 뒤엔 입질이 온다
//   ③ 찌가 쏙 들어가면 톡(늦으면 감점 없이 다시 입질) → 바늘 걸기 문제: 맞히면 깊이 걸림(장력이 덜 오름) · 틀리면 얕게(사투 문제 하나 더)
//   ④ 줄 장력·남은 거리(레퍼런스 ⑶) — 거리 표시점마다 문제 · 맞히면 몇 m 끌어옴 · 틀리면 조금 달아남 · **놓치지 않음**
//      장력이 꽉 차면 줄이 끊기는 대신 드랙이 풀려 멀어진다(아버님 기본안 「이대로」)
//   ⑤ 뜰채 3m → 0 — 맞힐 때마다 한 걸음 · 틀리면 그 자리(물러나지 않음)
// 문제에는 시간 제한이 없다 — 카드가 떠 있는 동안 물고기도 멈춘다(화면 쪽) · 같은 과목은 셋 넘게 내리 나오지 않는다
// 과목 비율: 그날 처음 들어올 때 지난 7일 기록(오늘 빼고)으로 한 번 — 덜 한 과목이 더 자주 · 한 과목 10%~50%
// 물고기 길이는 FishBase 최대·보통 길이(2026-10-30 확인)를 넘지 않게 · 무게는 길이로 어림(무게 = a × 길이³)
// ★ 이 파일은 아무것도 import하지 않는다 — 시험이 DOM·IndexedDB 없이 부른다 · 난수는 rng() 인자로

/** 하루 낚시 시간(분) · 손을 이만큼(ms) 안 대면 시간을 안 셈(⏳ 과목 시계와 같은 셈) */
export const FISH_DAY_MIN = 20;
export const FISH_IDLE_MS = 120000;
/** 별마다 사투 표시점 수 · 뜰채 걸음 수 (아버님 기본안 표 그대로) */
export const STARS = {
  1: { fight: 1, net: 1 },
  2: { fight: 2, net: 1 },
  3: { fight: 2, net: 2 },
  4: { fight: 3, net: 2 },
  5: { fight: 4, net: 3 },
};
/**
 * 저수지 물고기 16종 — key · 이름 · 별 · 길이 범위(cm, 전장) · 무게 계수 a(무게 g = a × cm³) · 같은 별 안에서 나오는 몫 · 외래종
 * 길이 끝은 FishBase 최대 길이 아래로(괄호 = 최대 · 보통): 참붕어(12.5·8) 납자루(13.1) 피라미(22.5·13) 블루길(41·19.1) 붕어(48·10) 떡붕어(35 SL)
 * 동자개(34.5) 끄리(44.4) 누치(67·33) 배스(97·40) 잉어(129·31) 강준치(102·47) 메기(130·37) 가물치(100) 쏘가리(37.4 · 소양호 조사 10.7~32.1) 뱀장어(150·40)
 */
export const SPECIES = [
  { key: 'chambung', ko: '참붕어', star: 1, min: 4, max: 11, a: 0.010, w: 3 },
  { key: 'napjaru', ko: '납자루', star: 1, min: 5, max: 12, a: 0.011, w: 2 },
  { key: 'pirami', ko: '피라미', star: 1, min: 8, max: 20, a: 0.009, w: 3 },
  { key: 'bluegill', ko: '블루길', star: 1, min: 8, max: 30, a: 0.025, w: 3, alien: true },
  { key: 'bungeo', ko: '붕어', star: 2, min: 10, max: 45, a: 0.0145, w: 5 },
  { key: 'ttokbung', ko: '떡붕어', star: 2, min: 15, max: 42, a: 0.017, w: 2, alien: true },
  { key: 'dongjagae', ko: '동자개', star: 2, min: 10, max: 30, a: 0.0073, w: 3 },
  { key: 'kkeuri', ko: '끄리', star: 3, min: 15, max: 40, a: 0.0082, w: 2 },
  { key: 'nuchi', ko: '누치', star: 3, min: 20, max: 60, a: 0.010, w: 2 },
  { key: 'bass', ko: '배스', star: 3, min: 20, max: 65, a: 0.014, w: 3, alien: true },
  { key: 'ingeo', ko: '잉어', star: 3, min: 30, max: 100, a: 0.017, w: 3 },
  { key: 'gangjun', ko: '강준치', star: 4, min: 30, max: 95, a: 0.0085, w: 2 },
  { key: 'megi', ko: '메기', star: 4, min: 30, max: 100, a: 0.009, w: 3 },
  { key: 'gamulchi', ko: '가물치', star: 4, min: 35, max: 90, a: 0.0095, w: 2 },
  { key: 'ssogari', ko: '쏘가리', star: 5, min: 15, max: 40, a: 0.012, w: 1 },
  { key: 'jangeo', ko: '뱀장어', star: 5, min: 40, max: 100, a: 0.0011, w: 1 },
];
export const SPECIES_KEYS = SPECIES.map((s) => s.key);
const BY_KEY = Object.fromEntries(SPECIES.map((s) => [s.key, s]));
export function speciesOf(key) {
  return Object.prototype.hasOwnProperty.call(BY_KEY, key) ? BY_KEY[key] : null;
}
/** 🏅 붕어·떡붕어 한 자(30.3cm) = 월척 · 40cm = 4짜 */
export const WOLCHEOK = 30.3;
export const SAJJA = 40;

/**
 * 그날 자리 셋 — 거리(m) · 열리는 그날 정답 수 · 별마다 몫 · 밑밥 문제 수
 * 처음엔 물가만 → 그날 맞힌 문제가 쌓이면 수초 밭 → 깊은 곳 (다음 날은 다시 물가부터)
 */
export const SPOTS = [
  { key: 'shore', ko: '물가', m: 8, need: 0, chum: 1, w: { 1: 10, 2: 5, 3: 1, 4: 0, 5: 0 } },
  { key: 'weed', ko: '수초 밭', m: 14, need: 6, chum: 2, w: { 1: 4, 2: 6, 3: 4, 4: 1, 5: 0 } },
  { key: 'deep', ko: '깊은 곳', m: 20, need: 16, chum: 2, w: { 1: 2, 2: 4, 3: 5, 4: 3, 5: 1 } },
];
/** 그날 맞힌 수로 열린 자리 수 (1~3) */
export function openSpots(okToday) {
  const n = nz(okToday);
  return SPOTS.filter((s) => n >= s.need).length;
}
/** ① 던지기 문제 결과 → 자리 (맞히면 열린 곳 중 가장 먼 곳 · 틀리면 물가) */
export function castSpot(correct, okToday) {
  return correct ? SPOTS[openSpots(okToday) - 1] : SPOTS[0];
}
/** ② 밑밥 정답 c개일 때 별 몫의 배수 — ★1은 줄고 ★3 위로는 는다(c=2면 ★5 두 배) */
export function chumFactor(star, c) {
  return Math.max(0.3, 1 + (0.5 * nz(c) * (star - 2)) / 3);
}
/** 이 자리·밑밥에서 별마다 나올 몫 (합 1) */
export function starOdds(spot, chum) {
  const sp = SPOTS.find((s) => s.key === (spot && spot.key)) || SPOTS[0];
  const raw = [1, 2, 3, 4, 5].map((s) => sp.w[s] * chumFactor(s, chum));
  const sum = raw.reduce((a, b) => a + b, 0) || 1;
  return Object.fromEntries(raw.map((v, i) => [i + 1, v / sum]));
}
/** 가중치로 하나 고르기 — items = [[값, 무게]] */
export function weighted(items, rng = Math.random) {
  const total = items.reduce((a, [, w]) => a + Math.max(0, w), 0);
  if (!(total > 0)) return items.length ? items[0][0] : null;
  let r = rng() * total;
  for (const [v, w] of items) { r -= Math.max(0, w); if (r < 0) return v; }
  return items[items.length - 1][0];
}
/** 길이 (cm, 소수 한 자리) — 보통은 작은 쪽으로 쏠리고, 연달아 맞힌 수(streak · 10까지)만큼 큰 쪽으로 */
export function lengthOf(sp, streak, rng = Math.random) {
  const k = 1 + 0.15 * Math.min(10, nz(streak));
  const q = Math.pow(rng(), 1.6 / k);
  return Math.round((sp.min + (sp.max - sp.min) * q) * 10) / 10;
}
/** 무게 (g, 정수) — 길이로 어림 */
export function weightOf(sp, cm) {
  return Math.max(1, Math.round(sp.a * Math.pow(Math.max(0, Number(cm) || 0), 3)));
}
/** 🏅 붙는 이름 — 붕어·떡붕어만 */
export function badgesOf(key, cm) {
  if (key !== 'bungeo' && key !== 'ttokbung') return [];
  if (cm >= SAJJA) return ['sajja'];
  if (cm >= WOLCHEOK) return ['wolcheok'];
  return [];
}
export const BADGE_KO = { wolcheok: '🏅 월척', sajja: '🏅 4짜' };
/** ③ 입질 때 물고기 정하기 → { key, star, cm, g, badges } */
export function rollFish(spot, chum, streak, rng = Math.random) {
  const odds = starOdds(spot, chum);
  const star = weighted([1, 2, 3, 4, 5].map((s) => [s, odds[s]]), rng);
  const sp = weighted(SPECIES.filter((x) => x.star === star).map((x) => [x, x.w]), rng);
  const cm = lengthOf(sp, streak, rng);
  return { key: sp.key, star: sp.star, cm, g: weightOf(sp, cm), badges: badgesOf(sp.key, cm) };
}
/** 무게 글 — 1kg 아래는 g, 넘으면 kg 소수 둘 */
export function weightText(g) {
  const n = nz(g);
  return n < 1000 ? `${n}g` : `${(n / 1000).toFixed(2)}kg`;
}

// ───────────── 사투 (레퍼런스 ⑶ 장력·거리 — 끊김 대신 드랙) ─────────────

/** 사투 숫자 — 별마다 감는 빠르기(m/s) · 감을 때 장력 오름(/s) · 「!!」 사이(s) · 「!!」 길이(s) */
export const FIGHT = {
  netM: 3, // 이만큼 가까워지면 ⑤ 뜰채
  slack: 55, // 놓으면 장력이 내려가는 빠르기(/s)
  drift: 0.6, // 놓으면 멀어지는 빠르기(m/s) · 「!!」면 surgeDrift
  surgeDrift: 2.6,
  surgeK: 3, // 「!!」 때 감으면 장력이 이만큼 배로
  surgeReel: 0.3, // 「!!」 때 감으면 감는 빠르기가 이만큼 배로
  dragAt: 100, // 장력이 여기에 닿으면 드랙이 풀림
  dragTo: 68,
  dragBack: 2, // 드랙이 풀리면 멀어지는 거리(m)
  slipS: 1, // 드랙이 풀리면 이만큼(초) 안 감긴다 — 「!!」 때 손을 떼는 편이 빠르게
  tire: 0.12, // 드랙이 한 번 풀릴 때마다 「!!」 힘·끌려가는 거리·안 감기는 때가 이만큼씩 준다
  tireMin: 0.25, // …여기까지만
  maxOver: 6, // 처음 거리보다 이만큼 넘게는 안 멀어짐(놓치지 않음)
  deepK: 0.8, // 바늘이 깊이 걸리면 장력이 이만큼 배로 덜 오름
  pullK: 0.5, // 사투 정답이면 표시점 사이의 이만큼을 확 끌어옴(나머지 반은 손으로 감기)
  wrongBack: 1.5, // 사투 오답이면 멀어지는 거리(m)
  byStar: {
    1: { reel: 4.0, rise: 26, gap: [2.4, 4.2], len: [0.5, 0.9] },
    2: { reel: 3.6, rise: 30, gap: [2.0, 3.6], len: [0.6, 1.0] },
    3: { reel: 3.2, rise: 34, gap: [1.6, 3.0], len: [0.6, 1.1] },
    4: { reel: 2.8, rise: 38, gap: [1.3, 2.5], len: [0.7, 1.2] },
    5: { reel: 2.6, rise: 42, gap: [1.0, 2.2], len: [0.7, 1.3] },
  },
};
const span = ([a, b], rng) => a + (b - a) * rng();

/** 사투 시작 상태 — fish = rollFish 결과 · m = 자리 거리 · deep = 바늘이 깊이 걸렸나 */
export function fightStart(fish, m, deep, rng = Math.random) {
  const n = STARS[fish.star].fight + (deep ? 0 : 1);
  const start = Math.max(FIGHT.netM + 2, Number(m) || 8);
  const marks = [];
  for (let i = 1; i <= n; i++) marks.push(FIGHT.netM + (start - FIGHT.netM) * (1 - i / (n + 1)));
  const c = FIGHT.byStar[fish.star];
  return { star: fish.star, deep: !!deep, start, dist: start, ten: 10, marks, next: 0, surge: 0, nextSurge: span(c.gap, rng), t: 0, drags: 0, slip: 0 };
}
/**
 * 사투 한 걸음 (순수 · 상태를 바꿔 돌려준다) — dt초 · hold = 감기 단추를 누르고 있나
 * → { s, ev } · ev: null | 'mark'(표시점 → 문제) | 'drag'(드랙이 풀림) | 'net'(뜰채로)
 */
export function fightStep(s0, dt, hold, rng = Math.random) {
  const s = { ...s0, marks: s0.marks };
  const c = FIGHT.byStar[s.star];
  const d = Math.max(0, Math.min(0.1, Number(dt) || 0));
  s.t += d;
  // 「!!」 — 물고기가 확 당기는 때
  if (s.surge > 0) { s.surge -= d; if (s.surge <= 0) { s.surge = 0; s.nextSurge = span(c.gap, rng); } } else {
    s.nextSurge -= d;
    if (s.nextSurge <= 0) s.surge = span(c.len, rng);
  }
  const surging = s.surge > 0;
  // 드랙이 풀릴 때마다 물고기가 지친다 — 「!!」가 약해지고 끌려가는 거리도 준다(꾹 누르기만 해도 언젠가는 끝나게)
  const tired = Math.max(FIGHT.tireMin, 1 - FIGHT.tire * s.drags);
  const rise = c.rise * (s.deep ? FIGHT.deepK : 1) * (surging ? 1 + (FIGHT.surgeK - 1) * tired : 1);
  if (s.slip > 0) {
    // 드랙이 풀리는 동안은 눌러도 안 감긴다 — 물고기가 줄을 끌고 간다
    s.slip = Math.max(0, s.slip - d);
    s.dist += FIGHT.surgeDrift * tired * d;
    s.ten -= FIGHT.slack * d;
  } else if (hold) {
    s.dist -= c.reel * (surging ? FIGHT.surgeReel : 1) * d;
    s.ten += rise * d;
  } else {
    s.dist += (surging ? FIGHT.surgeDrift : FIGHT.drift) * d;
    s.ten -= FIGHT.slack * d;
  }
  s.ten = Math.max(0, s.ten);
  s.dist = Math.min(s.start + FIGHT.maxOver, s.dist);
  let ev = null;
  if (s.ten >= FIGHT.dragAt) {
    s.ten = FIGHT.dragTo;
    s.dist = Math.min(s.start + FIGHT.maxOver, s.dist + FIGHT.dragBack * tired);
    s.slip = FIGHT.slipS * tired;
    s.drags += 1;
    ev = 'drag';
  }
  // 표시점이 남았으면 그 아래로는 안 감김(문제부터) · 다 지났으면 뜰채 거리에서 끝
  if (s.next < s.marks.length) {
    if (s.dist <= s.marks[s.next]) { s.dist = s.marks[s.next]; ev = 'mark'; }
  } else if (s.dist <= FIGHT.netM) { s.dist = FIGHT.netM; ev = 'net'; }
  return { s, ev };
}
/** 사투 문제 결과 — 맞히면 다음 표시점 쪽으로 확(표시점 사이의 pullK) · 틀리면 조금 멀어짐 · 어느 쪽이든 그 표시점은 지남 */
export function fightAnswer(s0, correct) {
  const s = { ...s0 };
  const gap = (s.start - FIGHT.netM) / (s.marks.length + 1);
  s.next = Math.min(s.marks.length, s.next + 1);
  if (correct) { s.dist = Math.max(FIGHT.netM, s.dist - gap * FIGHT.pullK); s.ten = Math.max(0, s.ten - 20); } else s.dist = Math.min(s.start + FIGHT.maxOver, s.dist + FIGHT.wrongBack);
  return s;
}
/** ⑤ 뜰채 — 남은 걸음(처음 STARS[star].net) · 맞히면 하나 줄고 0이면 뜬다 */
export function netAnswer(left, correct) {
  const n = nz(left);
  return correct ? Math.max(0, n - 1) : n;
}

// ───────────── 과목 비율 ─────────────

/** 문제를 내는 과목 (대여행과 같은 차례) */
export const SUBJECTS = ['math', 'english', 'korean', 'nonsul'];
/** 「지난 7일 얼마나 했나」 0~1 의 기준 — 과목 화면 시간(초) · 논술은 한 날 수 */
export const DONE_GOAL = { sec: 140 * 60, nonsulDays: 4 };
/** 한 과목 몫의 바닥·천장 */
export const SHARE_MIN = 0.1;
export const SHARE_MAX = 0.5;
const DAY_MS = 86400000;
/** 'YYYY-MM-DD'를 날 번호(UTC 기준 정수)로 — 깨지면 NaN */
export function dayIndex(key) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ''));
  return m ? Math.round(Date.UTC(+m[1], +m[2] - 1, +m[3]) / DAY_MS) : NaN;
}
/**
 * 지난 7일(오늘 빼고) 과목마다 0~1 (순수)
 * days = [{ date: 'YYYY-MM-DD', mathTime, enTime, korTime }] · nonsulDays = 논술 한 날 'YYYY-MM-DD' 목록 · today = 'YYYY-MM-DD'
 */
export function doneOf(days, nonsulDays, today) {
  const t = dayIndex(today);
  const inWeek = (key) => { const d = dayIndex(key); return Number.isFinite(d) && Number.isFinite(t) && d < t && d >= t - 7; };
  const sec = { math: 0, english: 0, korean: 0 };
  for (const r of Array.isArray(days) ? days : []) {
    if (!r || !inWeek(r.date)) continue;
    sec.math += nz(r.mathTime);
    sec.english += nz(r.enTime);
    sec.korean += nz(r.korTime);
  }
  const nd = new Set((Array.isArray(nonsulDays) ? nonsulDays : []).filter(inWeek)).size;
  const cap = (v) => Math.min(1, Math.max(0, v));
  return { math: cap(sec.math / DONE_GOAL.sec), english: cap(sec.english / DONE_GOAL.sec), korean: cap(sec.korean / DONE_GOAL.sec), nonsul: cap(nd / DONE_GOAL.nonsulDays) };
}
/**
 * 과목 몫 (순수 · 합 1) — 무게 = 1.2 − 했나 · 낼 문제가 있는 과목(avail)만 · 한 과목은 바닥~천장 안으로(물 채우듯 나눠 맞춤)
 * 과목이 적으면 천장을 올린다 — 남은 과목마다 25%를 비워 두고 나머지까지(넷·셋 50% · 둘 75% · 하나면 그 과목만 · 50/50으로 굳지 않게)
 */
export function subjectShares(done, avail = SUBJECTS) {
  const list = SUBJECTS.filter((s) => (avail || []).includes(s));
  if (!list.length) return {};
  const n = list.length;
  const lo = Math.min(SHARE_MIN, 1 / n);
  const hi = Math.max(SHARE_MAX, 1 - (n - 1) * 0.25);
  const w = Object.fromEntries(list.map((s) => [s, 1.2 - Math.min(1, Math.max(0, Number(done && done[s]) || 0))]));
  const out = {};
  let free = [...list];
  let left = 1;
  for (let round = 0; round < n + 1; round++) {
    const sum = free.reduce((a, s) => a + w[s], 0);
    let fixed = false;
    for (const s of free) {
      const v = (w[s] / sum) * left;
      if (v > hi || v < lo) { out[s] = v > hi ? hi : lo; fixed = true; }
    }
    if (!fixed) { for (const s of free) out[s] = (w[s] / sum) * left; break; }
    free = free.filter((s) => out[s] === undefined);
    left = 1 - list.filter((s) => out[s] !== undefined).reduce((a, s) => a + out[s], 0);
    if (!free.length) break;
  }
  // 반올림 찌꺼기 — 합을 1로
  const tot = list.reduce((a, s) => a + (out[s] || 0), 0) || 1;
  for (const s of list) out[s] = (out[s] || 0) / tot;
  return out;
}
/** 다음 문제 과목 — 몫으로 뽑되 같은 과목이 셋 내리 나왔으면 다른 과목(다른 과목이 있을 때) · recent = 최근 과목들(뒤가 최근) */
function banOf(list, recent) {
  const r = Array.isArray(recent) ? recent.slice(-3) : [];
  return r.length === 3 && r.every((x) => x === r[0]) && list.length > 1 ? r[0] : null;
}
export function pickSubject(shares, recent, rng = Math.random) {
  const list = SUBJECTS.filter((s) => shares && shares[s] > 0);
  if (!list.length) return null;
  const ban = banOf(list, recent);
  return weighted(list.filter((s) => s !== ban).map((s) => [s, shares[s]]), rng);
}
/**
 * 문제를 물어볼 과목 차례 (순수) — 고른 과목 먼저 · 그 과목이 문제를 못 만들면 몫이 큰 과목부터 ·
 * 셋 내리 나온 과목은 맨 끝(다른 과목이 다 못 만들 때만 — 문제 없이 넘어가는 것보다는 낫게)
 */
export function askOrder(shares, recent, first) {
  const list = SUBJECTS.filter((s) => shares && shares[s] > 0);
  const ban = banOf(list, recent);
  const rest = list.filter((s) => s !== first && s !== ban).sort((a, b) => shares[b] - shares[a]);
  return [...(first && list.includes(first) ? [first] : []), ...rest, ...(ban && ban !== first ? [ban] : [])];
}

// ───────────── 하루 20분 ─────────────

/** 이 걸음에 셀 시간(ms) — 화면이 보이고 마지막 손댐이 FISH_IDLE_MS 안일 때만 · 한 걸음은 1초까지(앱을 내렸다 오면 크게 안 뜀) */
export function activeStep(dtMs, sinceTouchMs, visible = true) {
  if (!visible) return 0;
  if (!(Number(sinceTouchMs) <= FISH_IDLE_MS)) return 0;
  return Math.max(0, Math.min(1000, Number(dtMs) || 0));
}
/** ⚙ 하루 낚시 분 — 고르는 보기 안에서만 · 비었거나 이상하면 20 */
export const FISH_MIN_CHOICES = [10, 15, 20, 30, 40, 60];
export function fishMinOf(v) {
  const n = Math.floor(Number(v));
  return FISH_MIN_CHOICES.includes(n) ? n : FISH_DAY_MIN;
}
/** 오늘 남은 낚시 초 — usedSec(오늘 쓴 초) · minutes(⚙ · 비면 20) · bonusMin(🔒 오늘만 더) */
export function dayLeftSec(usedSec, minutes = FISH_DAY_MIN, bonusMin = 0) {
  const m = Math.floor(Number(minutes));
  const total = ((Number.isFinite(m) && m > 0 ? Math.min(120, m) : FISH_DAY_MIN) + Math.min(60, nz(bonusMin))) * 60;
  return Math.max(0, total - nz(usedSec));
}

// ───────────── 낚시 도감 · 💰 (프로필 profile.fishing) ─────────────

/** 💰 — 별 하나에 1 · 도감에 새로 +5 · 🏅 월척·4짜 +5 · 하루 40까지 (아버님 기본안 「이대로」) */
export const FISH_COINS = { perStar: 1, newKind: 5, badge: 5, dayMax: 40 };
/** 지역 날 'YYYY-MM-DD' */
export function dayKeyOf(ms) {
  const d = new Date(Number(ms) || 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const isDay = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
/** 날마다 받은 💰를 남겨 두는 날 수 — 기기 날짜를 잘못 맞췄다 되돌려도 그날 40 한도가 다시 열리지 않게(Codex 170차) · 늦은 날부터 */
export const PAID_DAYS = 14;
function paidOf(src) {
  const out = {};
  for (const k of Object.keys(src).filter(isDay).sort().slice(-PAID_DAYS)) {
    const c = Math.min(FISH_COINS.dayMax, nz(src[k]));
    if (c) out[k] = c;
  }
  return out;
}
/**
 * 고쳐 읽은 낚시 저장값 (새 객체) — { dex: { 종: { n 잡은 수, best 가장 긴 cm, d 처음 잡은 날 } }, paid: { 날: 그날 받은 💰 } }
 * 모르는 종·깨진 칸은 버린다 · best는 그 종의 길이 끝 안으로 · paid는 늦은 날 PAID_DAYS개 (시안 때의 day·coins 한 칸도 읽어 들임)
 */
export function lakeOf(raw) {
  const r = isObj(raw) ? raw : {};
  const dex = {};
  const src = isObj(r.dex) ? r.dex : {};
  for (const k of Object.keys(src)) {
    const sp = speciesOf(k);
    const e = src[k];
    if (!sp || !isObj(e)) continue;
    const n = nz(e.n);
    if (!n) continue;
    const best = Math.min(sp.max, Math.max(0, Math.round((Number(e.best) || 0) * 10) / 10));
    dex[k] = { n, best, d: isDay(e.d) ? e.d : '' };
  }
  const paid = isObj(r.paid) ? { ...r.paid } : {};
  if (isDay(r.day)) paid[r.day] = Math.max(nz(paid[r.day]), nz(r.coins));
  return { dex, paid: paidOf(paid) };
}
export function copyLake(raw) {
  return lakeOf(raw);
}
/**
 * 병합 (순수) — 종마다 잡은 수·가장 긴 cm는 큰 쪽 · 처음 잡은 날은 이른 쪽(옛 백업이 도감 칸을 지우거나 「새로」를 또 받게 하지 않게) ·
 * 날마다 받은 💰는 날마다 큰 쪽(옛 백업이나 다른 날짜 기록이 섞여도 그날 💰 한도를 되살리지 않게) · 둘 다 없으면 null
 */
export function mergeLake(a, b) {
  if (!isObj(a) && !isObj(b)) return null;
  const x = lakeOf(a);
  const y = lakeOf(b);
  const dex = { ...x.dex };
  for (const k of Object.keys(y.dex)) {
    const p = dex[k];
    const q = y.dex[k];
    if (!p) { dex[k] = { ...q }; continue; }
    const days = [p.d, q.d].filter(Boolean).sort();
    dex[k] = { n: Math.max(p.n, q.n), best: Math.max(p.best, q.best), d: days[0] || '' };
  }
  const paid = { ...x.paid };
  for (const k of Object.keys(y.paid)) paid[k] = Math.max(nz(paid[k]), y.paid[k]);
  return { dex, paid: paidOf(paid) };
}
/**
 * 🐟 한 마리 낚음 (프로필 규칙 — xp.houseDo 안에서 저장된 프로필로) — 도감 · 💰(하루 한도까지) · 날은 트랜잭션 안의 시각으로
 * fish = { key, cm } (별·🏅는 여기서 다시 셈) → { ok, first, best, coins } · 모르는 종·범위 밖 길이는 { ok:false, why:'bad' }
 */
export function catchRule(p, fish, now) {
  const sp = speciesOf(fish && fish.key);
  const cm = Math.round((Number(fish && fish.cm) || 0) * 10) / 10;
  if (!sp || !(cm >= sp.min && cm <= sp.max)) return { ok: false, why: 'bad' };
  const today = dayKeyOf(now);
  const lk = lakeOf(p.fishing);
  const had = lk.dex[sp.key];
  const first = !had;
  const best = !!had && cm > had.best;
  lk.dex[sp.key] = { n: (had ? had.n : 0) + 1, best: Math.max(had ? had.best : 0, cm), d: had && had.d ? had.d : today };
  const paid = nz(lk.paid[today]); // 그날 이미 받은 💰 — 다른 날로 갔다 와도 그대로
  const want = sp.star * FISH_COINS.perStar + (first ? FISH_COINS.newKind : 0) + (badgesOf(sp.key, cm).length ? FISH_COINS.badge : 0);
  const coins = Math.max(0, Math.min(want, FISH_COINS.dayMax - paid));
  if (coins) lk.paid = paidOf({ ...lk.paid, [today]: paid + coins });
  p.fishing = lk;
  if (coins) { p.coins = nz(p.coins) + coins; p.coinsEarned = nz(p.coinsEarned) + coins; } // 문제를 풀어 번 코인 (📊 공부로 번 💰)
  return { ok: true, first, best, coins };
}

// ───────────── 하루 기록 칸 (db daily — 병합은 큰 쪽) ─────────────

/** 과목 → 그날 낸 문제·맞힌 문제 칸 */
export const FISH_DAY_Q = { math: ['fishMathQ', 'fishMathOk'], english: ['fishEnQ', 'fishEnOk'], korean: ['fishKorQ', 'fishKorOk'], nonsul: ['fishNsQ', 'fishNsOk'] };
/** 그날 맞힌 문제 (자리 열기용) */
export function okOfDay(daily) {
  return SUBJECTS.reduce((a, s) => a + nz(daily && daily[FISH_DAY_Q[s][1]]), 0);
}
/** 📤 사용 기록 한 줄 (순수 · 없으면 '') — 낚시 시간 · 잡은 마리 · 과목마다 맞힌/낸 · 🔒 더 준 분 */
export function lakeDayLine(d, fmtMin) {
  const f = typeof fmtMin === 'function' ? fmtMin : (s) => `${Math.round(nz(s) / 60)}분`;
  const asked = SUBJECTS.filter((s) => nz(d && d[FISH_DAY_Q[s][0]]) > 0);
  if (!nz(d && d.fishSec) && !nz(d && d.fishCatch) && !asked.length && !nz(d && d.fishBonus)) return '';
  const KO = { math: '수학', english: '영어', korean: '국어', nonsul: '논술' };
  const q = asked.map((s) => `${KO[s]} ${nz(d[FISH_DAY_Q[s][1]])}/${nz(d[FISH_DAY_Q[s][0]])}`).join(' · ');
  return `🎣 낚시터 ${f(d.fishSec)} · 물고기 ${nz(d.fishCatch)}마리${q ? ` · 맞힘/낸 문제 ${q}` : ''}${nz(d.fishBonus) ? ` · 🔒 부모 +${nz(d.fishBonus)}분` : ''}`;
}

function nz(v) {
  const n = Math.floor(Number(v) || 0);
  return n > 0 ? n : 0;
}
