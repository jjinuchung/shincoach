// 🎟️ 아쿠아리움 손님 맞이 — 순수 규칙 (v401 · 2026-11-08 진우 「수조에 손님을 받아 표를 팔고 싶어」 → 아버님 「학습과 엮어서」 → 기본안 판 2 「이대로」)
// 아쿠아리움 안 놀이 — 그날 과목을 합친 공부 15분마다 손님 한 무리(🎮 게임기 판·🐾 손님 포켓몬과 같은 셈 · 낚시 시간은 안 셈) · 하루 세 무리 · 그날만
// 한 무리 = 🎟️ 매표 문제 하나(이번 무리의 진짜 값으로 내는 한두 단계 문장제) + 🎤 해설 질문 셋(2·3·3단계 · 낚시터 원천) → 정산
//   표값 = 손님 수 × 표 한 장(수조 단계로 💰1~5) — 맞히든 틀리든 그대로 · 팁 = 맞힌 해설마다 💰5 · 한 무리 끝 💰40 · 하루 끝 💰120
//   손님 수 = 3 + (수조 물고기 종류가 8종 넘으면 1) + (⚓ 큰 구조물·🌙 우주 장식이 놓여 있으면 1)
// 📊 주간 매표 장부 — 한 주의 첫 손님 맞이 앞에 지난주 손님들이 고른 「가장 멋진 물고기」 막대그래프 + 질문 둘(맞히면 💰10씩 · 주마다 한 번)
//   요일별로 세지 않는다 — 공부를 쉰 날이 빈 막대로 진우 화면에 드러나지 않게(기본안 판 1)
// 아이 화면에 남은 손님 수·셈 문구를 쓰지 않는다 — 기다리는 손님은 🔔과 단추로만
// 저장 profile.aquaTour = { days: { 날: { n 맞이한 무리, c 받은 💰, g: [[손님 수, 표 한 장]…] } }, likes: { 날: { 종: 고른 손님 수 } }, book: { 지난주 월요일: 1 }, seen: { 포켓몬 id: 마지막으로 온 날 } }
//   병합은 칸마다 큰 쪽(날마다 무리·💰는 단조 — 옛 백업으로 그날 한도를 다시 열지 못하게) · 장부는 합집합 · 늦은 날 14개만
// ★ aquarium.js · fishing.js · guest.js(순수)만 import — 시험이 DOM·IndexedDB 없이 부른다

import { aquaOf, decoOf } from './aquarium.js';
import { dayKeyOf, speciesOf, softOf, SUBJECTS } from './fishing.js';
import { candidatesOf } from './guest.js';

/** 손님 한 무리가 오는 공부 초 (15분) */
export const TOUR_SEC = 15 * 60;
/** 하루 무리 */
export const TOUR_DAY = 3;
/** 표 한 장 💰 — 수조 단계 1~8 */
export const TICKET = [1, 2, 2, 3, 3, 4, 4, 5];
/** 맞힌 해설 하나에 팁 💰 */
export const TIP = 5;
/** 📊 장부 질문 하나에 💰 */
export const BOOK_COIN = 10;
/** 해설 질문 셋의 단계 (판 2 — 1단계는 쉬워서 뺐다) */
export const TOUR_LVS = [2, 3, 3];
/** 손님 수 — 처음 3마리 · 볼거리로 5마리까지 */
export const GUESTS_MIN = 3;
export const GUESTS_MAX = 5;
const KIND_MORE = 8;
const KEEP_DAYS = 14;
const SEEN_MAX = 240;
const BOOK_KEEP = 8;
const LIKE_MAX = 999;

/** 하루 기록 칸 (db.js DAILY_SUMS에 같은 이름 — 병합은 더하기) */
export const TOUR_GROUPS = 'aqGroups';
export const TOUR_COINS = 'aqCoins';
export const TOUR_PAY = ['aqPayQ', 'aqPayOk'];
export const TOUR_FM = ['aqFmQ', 'aqFmOk'];
export const TOUR_BOOK = ['aqBookQ', 'aqBookOk'];
export const TOUR_Q = { math: ['aqMathQ', 'aqMathOk'], english: ['aqEnQ', 'aqEnOk'], korean: ['aqKorQ', 'aqKorOk'], nonsul: ['aqNsQ', 'aqNsOk'] };
export const TOUR_LV_Q = { 2: ['aqLv2Q', 'aqLv2Ok'], 3: ['aqLv3Q', 'aqLv3Ok'] };
/** 과목마다 그날 차례 줄에서 넘긴 자리 — 낸 문제 수와 따로(단계가 낮아 버린 문제까지 · 다시 열면 그 뒤부터 — Codex 203차) */
export const TOUR_AT = { math: 'aqMathAt', english: 'aqEnAt', korean: 'aqKorAt', nonsul: 'aqNsAt' };
export const TOUR_DAILY = [TOUR_GROUPS, TOUR_COINS, ...TOUR_PAY, ...TOUR_FM, ...TOUR_BOOK, ...SUBJECTS.flatMap((s) => TOUR_Q[s]), ...TOUR_LV_Q[2], ...TOUR_LV_Q[3], ...SUBJECTS.map((s) => TOUR_AT[s])];
/** 해설 질문 하나를 찾을 때 한 과목에서 몇 번까지 (1단계로 내려온 문제는 버리고 다시) */
export const SEEK_TRIES = 12;

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const isDay = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const nz = (v) => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n > 0 ? n : 0; };
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const intIn = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
const okPair = (x) => Array.isArray(x) && intIn(x[0], GUESTS_MIN, GUESTS_MAX) && intIn(x[1], 1, TICKET[TICKET.length - 1]);

// ───────────── 날짜 ─────────────

/** 'YYYY-MM-DD' + k일 (달력으로 — 시간대와 상관없이) */
export function addDays(key, k) {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + k);
  return d.toISOString().slice(0, 10);
}
/** 그 주 월요일 */
export function weekOf(key) {
  const dow = new Date(`${key}T00:00:00Z`).getUTCDay(); // 0 일 … 6 토
  return addDays(key, -((dow + 6) % 7));
}

// ───────────── 저장값 ─────────────

/** 고쳐 읽은 손님 맞이 기록 (새 객체) — 깨진 칸은 버린다 · 날 칸은 늦은 날 14개(빈 날을 먼저 빼고 자른다) */
export function tourOf(raw) {
  const r = isObj(raw) ? raw : {};
  const days = {};
  if (isObj(r.days)) {
    const rows = Object.keys(r.days).filter(isDay).map((k) => {
      const e = isObj(r.days[k]) ? r.days[k] : {};
      const g = Array.isArray(e.g) ? e.g.filter(okPair).slice(0, TOUR_DAY).map((x) => [x[0], x[1]]) : [];
      return [k, { n: Math.min(TOUR_DAY, nz(e.n)), c: nz(e.c), g }];
    }).filter(([, e]) => e.n || e.c).sort((a, b) => (a[0] < b[0] ? -1 : 1)).slice(-KEEP_DAYS);
    for (const [k, e] of rows) days[k] = e;
  }
  const likes = {};
  if (isObj(r.likes)) {
    const rows = Object.keys(r.likes).filter(isDay).map((k) => {
      const src = isObj(r.likes[k]) ? r.likes[k] : {};
      const one = {};
      for (const key of Object.keys(src)) if (speciesOf(key) && nz(src[key])) one[key] = Math.min(LIKE_MAX, nz(src[key]));
      return [k, one];
    }).filter(([, one]) => Object.keys(one).length).sort((a, b) => (a[0] < b[0] ? -1 : 1)).slice(-KEEP_DAYS);
    for (const [k, one] of rows) likes[k] = one;
  }
  const book = {};
  if (isObj(r.book)) for (const k of Object.keys(r.book).filter((x) => isDay(x) && r.book[x]).sort().slice(-BOOK_KEEP)) book[k] = 1;
  const seen = {};
  if (isObj(r.seen)) {
    const rows = Object.keys(r.seen).filter((id) => /^[1-9]\d{0,5}$/.test(id) && isDay(r.seen[id])).map((id) => [id, r.seen[id]]);
    rows.sort((a, b) => (a[1] > b[1] ? -1 : a[1] < b[1] ? 1 : Number(a[0]) - Number(b[0])));
    for (const [id, d] of rows.slice(0, SEEN_MAX)) seen[id] = d;
  }
  return { days, likes, book, seen };
}
/** 복사 (프로필을 옮길 때) */
export function copyTour(raw) {
  return tourOf(raw);
}
/** 병합 (순수) — 날마다 무리·💰는 큰 쪽(손님 차례 g는 무리가 많은 쪽) · 고른 물고기는 칸마다 큰 쪽 · 장부는 합집합 · 손님이 온 날은 늦은 쪽 · 둘 다 없으면 null */
export function mergeTour(a, b) {
  if (!isObj(a) && !isObj(b)) return null;
  const x = tourOf(a);
  const y = tourOf(b);
  const days = { ...x.days };
  for (const [k, e] of Object.entries(y.days)) {
    const o = days[k];
    days[k] = !o ? e : { n: Math.max(o.n, e.n), c: Math.max(o.c, e.c), g: e.g.length > o.g.length ? e.g : o.g };
  }
  const likes = {};
  for (const k of new Set([...Object.keys(x.likes), ...Object.keys(y.likes)])) {
    const one = { ...(x.likes[k] || {}) };
    for (const [key, v] of Object.entries(y.likes[k] || {})) one[key] = Math.max(one[key] || 0, v);
    likes[k] = one;
  }
  const seen = { ...x.seen };
  for (const [id, d] of Object.entries(y.seen)) if (!own(seen, id) || d > seen[id]) seen[id] = d;
  return tourOf({ days, likes, book: { ...x.book, ...y.book }, seen });
}

// ───────────── 손님 ─────────────

/** 표 한 장 💰 — 지금 수조 단계로 */
export function ticketOf(p) {
  return TICKET[aquaOf(p).tier - 1] || TICKET[0];
}
/** 한 무리 손님 수 — 볼거리로 (물고기 종류 · 큰 장식) */
export function groupSize(p) {
  const a = aquaOf(p);
  const kinds = new Set(a.fish).size;
  const big = a.deco.some((id) => { const d = decoOf(id); return !!d && (d.group === 'big' || d.group === 'space'); });
  return GUESTS_MIN + (kinds > KIND_MORE ? 1 : 0) + (big ? 1 : 0);
}
/** 그날 기록 { n, c, g } (day = 'YYYY-MM-DD') */
export function tourDay(p, day) {
  const t = tourOf(p && p.aquaTour);
  return t.days[day] || { n: 0, c: 0, g: [] };
}
/** 오늘 기록 { n, c, g } */
export function tourToday(p, now) {
  return tourDay(p, dayKeyOf(now));
}
/** 다시 열 때 과목마다 차례 줄 자리 — 그날 넘긴 자리(d = 그날 하루 기록) */
export function tourStart(d) {
  return Object.fromEntries(SUBJECTS.map((s) => [s, nz(d && d[TOUR_AT[s]])]));
}
/**
 * 넘긴 자리 장부 (같은 앱 안 · 메모리) — 넘긴 자리 저장이 늦거나 실패한 채 다시 열어도 그 뒤부터 (Codex 206차)
 * start(d, day) = 저장된 자리(tourStart)와 메모리의 자리 가운데 큰 쪽 · moved(day, subj, at) = 지금 자리(처음부터 센 자리 — 늦게 저장돼도 두 번 안 셈)
 */
export function tourAtBook() {
  let on = '';
  let pos = {};
  return {
    start(d, day) {
      if (on !== day) { on = day; pos = {}; }
      const s = tourStart(d);
      for (const k of SUBJECTS) s[k] = Math.max(s[k], pos[k] || 0);
      return s;
    },
    moved(day, subj, at) {
      if (on === day && SUBJECTS.includes(subj)) pos[subj] = Math.max(pos[subj] || 0, nz(at));
    },
  };
}
const okQ = (c) => !!(c && Array.isArray(c.choices) && c.choices.length >= 2 && c.choices.filter((x) => x.ok).length === 1);
/**
 * 해설 질문 하나 찾기 (순수) — order = 과목 차례 · make(s) → 문제 | null (부를 때마다 그 과목 차례 줄을 넘긴다) → { q, subj } | null
 * 원천은 그 단계를 못 만들면 1단계 꼴로 내려온다(q.lv = 실제 단계) — 손님 맞이엔 1단계를 안 낸다(판 2) ·
 * 과목마다 SEEK_TRIES번까지 · 못 만들면 다음 과목 · 끝내 없으면 null (그 질문은 건너뛰고 표값은 그대로 — Codex 203차)
 */
export function seekTourQ(order, make) {
  for (const s of order || []) {
    for (let k = 0; k < SEEK_TRIES; k++) {
      let c = null;
      try { c = make(s); } catch { c = null; }
      if (!okQ(c)) break; // 이 과목은 더 못 만듦
      if ((Number(c.lv) || 1) >= 2) return { q: c, subj: s };
    }
  }
  return null;
}
/**
 * 손님이 기다리나 (순수) — sec = 그날 과목을 합친 공부 초(화면이 센 것 · minigame.studySec)
 * → { waiting, empty 수조에 물고기가 없음, full 오늘 세 무리를 다 맞이함, done 오늘 맞이한 무리 }
 */
export function waitingOf(p, now, sec) {
  return waitingDay(p, dayKeyOf(now), sec);
}
/** 그날(day) 손님이 기다리나 (순수) — 맞이를 시작한 날로 다시 볼 때(장부를 보다 자정을 넘겨도 — Codex 206차) · sec = 그날 공부 초 */
export function waitingDay(p, day, sec) {
  const empty = aquaOf(p).fish.length === 0;
  const done = tourDay(p, day).n;
  const allowed = Math.min(TOUR_DAY, Math.floor(nz(sec) / TOUR_SEC));
  return { waiting: !empty && done < allowed, empty, full: done >= TOUR_DAY, done };
}
/** 문자열 → 32비트 수 (그날·무리·포켓몬으로 늘 같은 순서) */
function hashOf(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  h = Math.imul(h ^ (h >>> 15), 2246822507);
  return (h ^ (h >>> 13)) >>> 0;
}
/** 씨앗 난수 (mulberry32) */
export function rngOf(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** 이번 무리 손님 (순수) — 진우가 가진 포켓몬(파트너·캡슐에서 쉬는 것 빼고 — 🐾 손님과 같은 후보) · 오래 안 온 것부터 · 같으면 그날·무리로 섞은 차례 · k = 오늘 몇째 무리 */
export function pickVisitors(p, day, k, n) {
  const t = tourOf(p && p.aquaTour);
  return candidatesOf(p || {}).map((id) => ({ id, s: t.seen[String(id)] || '', r: hashOf(`${day}|${k}|${id}`) }))
    .sort((a, b) => (a.s < b.s ? -1 : a.s > b.s ? 1 : a.r - b.r)).slice(0, Math.max(0, n)).map((x) => x.id);
}
/** 손님마다 가장 멋졌던 물고기 (순수) — 수조의 물고기 종에서(🐙 문어 무리는 「물고기」가 아니라 빼고 · 물고기가 없으면 문어 무리에서) · n마리 */
export function favOf(p, seed, n) {
  const kinds = [...new Set(aquaOf(p).fish)];
  const finned = kinds.filter((k) => !softOf(k));
  const pool = finned.length ? finned : kinds;
  if (!pool.length) return [];
  const r = rngOf(seed);
  return Array.from({ length: Math.max(0, n) }, () => pool[Math.floor(r() * pool.length)]);
}

// ───────────── 🎟️ 매표 문제 ─────────────

/** 숫자를 읽은 소리에 받침이 있나 — 끝자리 1·3·6·7·8은 일·삼·육·칠·팔 · 0으로 끝나면 십·백·천 · 0은 영 */
export function numJong(n) {
  const d = Math.abs(Math.floor(Number(n) || 0)) % 10;
  return d === 0 || d === 1 || d === 3 || d === 6 || d === 7 || d === 8;
}
const eulN = (n) => `${n}${numJong(n) ? '을' : '를'}`;
const iMyeonN = (n) => `${n}${numJong(n) ? '이면' : '면'}`;
/** 낱말 받침 (한글 끝 글자) */
export function jong(word) {
  const c = String(word || '').slice(-1).charCodeAt(0) - 0xac00;
  return c >= 0 && c <= 11171 && c % 28 !== 0;
}
const shuffled = (r, list) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
/** 보기 넷 — 정답 + 서로 다른 틀린 보기(양수 · 먼저 온 실수부터) · 모자라면 정답 둘레 수로 채움 */
function moneyChoices(r, ans, wrongs, near) {
  const seen = new Set([ans]);
  const bad = [];
  for (const w of wrongs) {
    if (!(w.v > 0) || !Number.isInteger(w.v) || seen.has(w.v) || bad.length >= 3) continue;
    seen.add(w.v);
    bad.push(w);
  }
  for (const k of [1, -1, 2, -2, 3, 4, 5, 6]) {
    if (bad.length >= 3) break;
    const v = ans + k;
    if (v > 0 && !seen.has(v)) { seen.add(v); bad.push({ v, trap: 'near', hint: near }); }
  }
  return shuffled(r, [{ text: `💰${ans}`, ok: true }, ...bad.map((w) => ({ text: `💰${w.v}`, ok: false, trap: w.trap, hint: w.hint }))]);
}
/** 매표 꼴 고르기 — 셋째 무리이고 앞 두 무리의 표 한 장 값이 같으면 「오늘 표값 모두」 · 아니면 거스름돈·표 한 장 거꾸로 반반(표 한 장 💰1이면 거스름돈만 — 4 ÷ 4 같은 문제는 너무 쉬워서) */
export function payForm(idx, prev, t, seed) {
  const g = Array.isArray(prev) ? prev.filter(okPair) : [];
  if (idx >= 2 && g.length >= 2 && g.slice(0, 2).every((x) => x[1] === t)) return 'today';
  if (t <= 1) return 'change';
  return rngOf(seed)() < 0.5 ? 'change' : 'unit';
}
/**
 * 🎟️ 매표 문제 하나 (순수) — n 손님 수 · t 표 한 장 · form 'change' | 'unit' | 'today' · prev 오늘 앞 무리 [[손님 수, 표 한 장]…] · seed
 * → { form, label, q, choices: [{ text, ok, trap?, hint? }], solve, fare } — 받는 💰는 늘 fare(이번 무리 표값)
 */
export function payQuestion({ n, t, form, prev = [], seed = 1 }) {
  const r = rngOf(seed ^ 0x51ed27);
  const fare = n * t;
  const base = { form, label: '🎟️ 매표소', fare };
  if (form === 'unit') {
    const how = `${fare} ÷ ${n} = ${t}`;
    return {
      ...base,
      q: `손님 ${n}마리가 표값으로 모두 💰${eulN(fare)} 냈어요. 표 한 장은 얼마일까요?`,
      choices: moneyChoices(r, t, [
        { v: fare - n, trap: 'sub', hint: `똑같이 나누는 것은 나눗셈이에요. ${how}` },
        { v: fare * n, trap: 'mul', hint: `곱하면 더 커져요. 나눠 보세요. ${how}` },
        { v: fare + n, trap: 'add', hint: `손님 수를 더하는 게 아니에요. ${how}` },
      ], how),
      solve: how,
    };
  }
  if (form === 'today') {
    const g = (Array.isArray(prev) ? prev.filter(okPair) : []).slice(0, 2);
    const [a, b] = [g[0][0], g[1][0]];
    const s = a + b + n;
    const ans = s * t;
    const how = `${a} + ${b} + ${n} = ${s}, ${s} × ${t} = ${ans}`;
    return {
      ...base,
      q: `오늘 손님은 ${a}마리, ${b}마리, 이번에 ${n}마리예요. 표 한 장이 💰${iMyeonN(t)} 오늘 표값은 모두 얼마일까요?`,
      choices: moneyChoices(r, ans, [
        { v: n * t, trap: 'only', hint: `이번 무리만 셌어요. 오늘 손님을 모두 더해요. ${how}` },
        { v: s + t, trap: 'add', hint: `손님 수(${s})에 표 한 장 값을 곱해요. ${s} × ${t} = ${ans}` },
        { v: (s - 1) * t, trap: 'sum', hint: how },
        // 앞 보기가 겹치면 (Codex 203차 — 정답 둘레 수 대신 진짜 실수로)
        { v: (a + b) * t, trap: 'prev', hint: `이번에 온 ${n}마리도 더해요. ${how}` },
      ], how),
      solve: how,
    };
  }
  const paid = r() < 0.5 ? 50 : 100;
  const ans = paid - fare;
  const how = `표값 ${t} × ${n} = ${fare}, 거스름돈 ${paid} − ${fare} = ${ans}`;
  const f1 = fare % 10;
  const wrongs = [
    { v: fare, trap: 'fare', hint: `표값을 낸 돈에서 빼야 해요. ${how}` },
    { v: paid - t, trap: 'one', hint: `표값은 한 장 값 × 손님 수예요. ${how}` },
  ];
  if (f1) {
    // 받아내림 실수 — 💰50은 자리마다 큰 수에서 작은 수(50 − 12 → 42) · 💰100은 받아내린 십의 자리를 안 줄임(100 − 12 → 98)
    const v = paid === 50 ? Math.abs(0 - f1) + (5 - Math.floor(fare / 10)) * 10 : ans + 10;
    if (v < paid) wrongs.push({ v, trap: 'borrow', hint: paid === 50 ? `0에서 ${eulN(f1)} 못 빼면 십의 자리에서 10을 받아내려요. ${how}` : `받아내리면 윗자리 수는 1 작아져요. ${how}` });
  }
  // 표값이 낸 돈의 반이라 첫 보기가 정답과 겹치거나 받아내림 보기가 없으면 (Codex 203차 — 정답 둘레 수 대신 진짜 실수로)
  wrongs.push({ v: paid - (n + t), trap: 'plus', hint: `손님 수와 한 장 값은 더하지 말고 곱해요. ${how}` });
  return {
    ...base,
    form: 'change',
    q: `손님 ${n}마리 · 표 한 장 💰${t}. 대표 손님이 💰${eulN(paid)} 냈어요. 거스름돈은 얼마일까요?`,
    choices: moneyChoices(r, ans, wrongs, how),
    solve: how,
  };
}

// ───────────── 정산 (프로필 규칙 — houseDo 안에서) ─────────────

/**
 * 🧾 한 무리 정산 → { ok, coins, fare, tips, n 그날 맞이한 무리 }
 * req = { day 맞이를 시작한 날, k 그날 몇째 무리였나(시작할 때의 n), n 손님 수, t 표 한 장, good 맞힌 해설 수, sec 그날(day) 공부 초(화면이 센 것), likes [종…], visitors [포켓몬 id…] }
 * 그날(day) 기록에 적는다 — 자정을 넘겨 끝내도 시작한 날 몫 · 어제 시작한 것까지만 (Codex 203차 — 전날 공부로 다음 날 몫을 받거나, 끝까지 풀고도 못 받던 것)
 * why: 'bad' 깨진 값 · 'none' 기다리는 손님이 없음(이 무리는 이미 정산됨 — 다른 창이 먼저 · 공부 시간이 모자람) · 'late' 그저께보다 앞서 시작함 ·
 *      'clock' 기기 날짜가 크게 뒤로 가 그날 몫을 적을 자리가 없음
 */
export function tourEndRule(p, req, now) {
  const r = isObj(req) ? req : {};
  if (!intIn(r.n, GUESTS_MIN, GUESTS_MAX) || !intIn(r.t, 1, TICKET[TICKET.length - 1]) || !intIn(r.good, 0, TOUR_LVS.length) || !intIn(r.k, 0, TOUR_DAY - 1) || !isDay(r.day)) return { ok: false, why: 'bad' };
  const today = dayKeyOf(now);
  const day = r.day;
  if (day !== today && day !== addDays(today, -1)) return { ok: false, why: 'late' };
  const tr = tourOf(p.aquaTour);
  const kept = Object.keys(tr.days);
  if (!own(tr.days, day) && kept.length >= KEEP_DAYS && kept.every((k) => k > day)) return { ok: false, why: 'clock' }; // 적어도 tourOf가 바로 버려 한도를 못 지킨다 (fishing v396과 같은 막음)
  const rec = tr.days[day] || { n: 0, c: 0, g: [] };
  if (rec.n !== r.k) return { ok: false, why: 'none' }; // 같은 무리는 한 번만 — 두 창이 같은 무리를 맞이해도 (Codex 203차)
  if (rec.n >= Math.min(TOUR_DAY, Math.floor(nz(r.sec) / TOUR_SEC))) return { ok: false, why: 'none' };
  const fare = r.n * r.t;
  const tips = r.good * TIP;
  const coins = fare + tips;
  tr.days[day] = { n: rec.n + 1, c: rec.c + coins, g: [...rec.g, [r.n, r.t]] };
  const likes = { ...(tr.likes[day] || {}) };
  for (const key of (Array.isArray(r.likes) ? r.likes : []).slice(0, r.n)) if (speciesOf(key)) likes[key] = Math.min(LIKE_MAX, (likes[key] || 0) + 1);
  if (Object.keys(likes).length) tr.likes[day] = likes;
  for (const id of (Array.isArray(r.visitors) ? r.visitors : []).slice(0, GUESTS_MAX)) if (Number.isInteger(id) && id > 0 && !(tr.seen[String(id)] > day)) tr.seen[String(id)] = day;
  p.aquaTour = tourOf(tr);
  p.coins = nz(p.coins) + coins;
  p.coinsEarned = nz(p.coinsEarned) + coins; // 문제를 풀어 번 코인 (📊 공부로 번 💰 — 낚시와 같다)
  return { ok: true, coins, fare, tips, n: rec.n + 1 };
}

// ───────────── 📊 주간 매표 장부 ─────────────

/** 정답 하나 + 틀린 보기(서로 다름) → 섞은 보기 · 글자 보기 */
function textChoices(r, right, wrongs) {
  const seen = new Set([right]);
  const bad = [];
  for (const w of wrongs) if (!seen.has(w.text) && bad.length < 3) { seen.add(w.text); bad.push(w); }
  return shuffled(r, [{ text: right, ok: true }, ...bad.map((w) => ({ text: w.text, ok: false, trap: w.trap, hint: w.hint }))]);
}
const headN = (v) => `${v}마리`;
/**
 * 📊 지난주 장부 (순수) — 이번 주에 아직 안 본 지난주 장부가 있으면 { week, title, bars: [{ key, ko, v }], unit, qs: [질문 둘] } · 없으면 null
 * 막대는 많이 고른 차례로 넷까지(같으면 이름 차례) · 막대가 둘 아래면 null · 눈금 한 칸은 가장 긴 막대가 10 넘으면 2마리, 20 넘으면 5마리
 */
export function bookOf(p, now) {
  const today = dayKeyOf(now);
  const week = addDays(weekOf(today), -7);
  const tr = tourOf(p && p.aquaTour);
  if (tr.book[week]) return null;
  const sum = {};
  for (let i = 0; i < 7; i++) for (const [k, v] of Object.entries(tr.likes[addDays(week, i)] || {})) sum[k] = (sum[k] || 0) + v;
  const bars = Object.entries(sum).filter(([k, v]) => v > 0 && speciesOf(k))
    .map(([key, v]) => ({ key, ko: speciesOf(key).ko, v }))
    .sort((a, b) => b.v - a.v || (a.ko < b.ko ? -1 : a.ko > b.ko ? 1 : 0)).slice(0, 4);
  if (bars.length < 2) return null;
  const top = bars[0].v;
  const unit = top > 20 ? 5 : top > 10 ? 2 : 1;
  const r = rngOf(hashOf(`book|${week}`));
  const qs = [];
  const tick = `눈금 한 칸은 ${unit}마리예요.`;
  if (bars[0].v > bars[1].v) {
    qs.push({ label: '📊 매표 장부', q: '손님이 가장 많이 고른 물고기는 무엇일까요?', choices: textChoices(r, bars[0].ko, bars.slice(1).map((b) => ({ text: b.ko, trap: 'long', hint: `막대가 가장 긴 것을 찾아요. ${bars[0].ko} ${bars[0].v}마리` }))), solve: `${bars[0].ko} ${bars[0].v}마리` });
  } else {
    const b = bars[0];
    qs.push({ label: '📊 매표 장부', q: `${b.ko}${jong(b.ko) ? '을' : '를'} 고른 손님은 몇 마리일까요?`, choices: textChoices(r, headN(b.v), [b.v + unit, b.v - unit, b.v + 2 * unit, b.v * 2].filter((v) => v > 0).map((v) => ({ text: headN(v), trap: 'read', hint: `${tick} ${b.ko} ${b.v}마리` }))), solve: `${b.ko} ${b.v}마리` });
  }
  const lo = [...bars].reverse().find((b) => b.v < bars[0].v);
  if (lo) {
    const hi = bars[0];
    const d = hi.v - lo.v;
    const how = `${hi.v} − ${lo.v} = ${d}`;
    qs.push({ label: '📊 매표 장부', q: `${hi.ko}${jong(hi.ko) ? '을' : '를'} 고른 손님은 ${lo.ko}${jong(lo.ko) ? '을' : '를'} 고른 손님보다 몇 마리 더 많을까요?`, choices: textChoices(r, headN(d), [
      { text: headN(hi.v + lo.v), trap: 'add', hint: `더 많은 수는 빼서 구해요. ${how}` },
      { text: headN(hi.v), trap: 'big', hint: `두 막대의 차이를 구해요. ${how}` },
      { text: headN(d + unit), trap: 'read', hint: `${tick} ${how}` },
      { text: headN(d + 1), trap: 'near', hint: how },
    ].filter((w) => w.text !== headN(d))), solve: how });
  } else {
    qs.push({ label: '📊 매표 장부', q: '세로 눈금 한 칸은 몇 마리일까요?', choices: textChoices(r, headN(unit), [unit + 1, unit * 2, 10].filter((v) => v !== unit).map((v) => ({ text: headN(v), trap: 'tick', hint: `0과 첫 눈금 사이가 한 칸이에요. ${tick}` }))), solve: tick });
  }
  return { week, title: '지난주 손님이 고른 가장 멋진 물고기', bars, unit, qs };
}
/**
 * 📊 장부를 봤다 → { ok, coins } · req = { week, good 맞힌 수, day 장부를 연 날 } · why: 'changed' 연 날의 지난주가 아님·그저께보다 앞서 엶 · 'done' 이미 봄 · 'bad'
 * 연 날 기준 — 일요일 밤에 연 장부를 월요일에 덮어도 받는다(손님 정산과 같이 어제 연 것까지 — Codex 206차)
 */
export function bookRule(p, req, now) {
  const r = isObj(req) ? req : {};
  if (!isDay(r.week) || !intIn(r.good, 0, 2) || !isDay(r.day)) return { ok: false, why: 'bad' };
  const today = dayKeyOf(now);
  if (r.day !== today && r.day !== addDays(today, -1)) return { ok: false, why: 'changed' };
  if (r.week !== addDays(weekOf(r.day), -7)) return { ok: false, why: 'changed' };
  const tr = tourOf(p.aquaTour);
  if (tr.book[r.week]) return { ok: false, why: 'done' };
  tr.book[r.week] = 1;
  p.aquaTour = tourOf(tr);
  const coins = r.good * BOOK_COIN;
  if (coins) { p.coins = nz(p.coins) + coins; p.coinsEarned = nz(p.coinsEarned) + coins; }
  return { ok: true, coins };
}

// ───────────── 📤 ─────────────

/** 📤 사용 기록 한 줄 (그날 기록 d) — 맞이한 무리 · 💰 · 매표 · 해설 과목마다 · 단계마다 · 장부 · 없으면 '' */
export function tourDayLine(d) {
  const g = (k) => nz(d && d[k]);
  const KO = { math: '수학', english: '영어', korean: '국어', nonsul: '논술' };
  const asked = SUBJECTS.filter((s) => g(TOUR_Q[s][0]));
  if (!g(TOUR_GROUPS) && !g(TOUR_PAY[0]) && !asked.length && !g(TOUR_BOOK[0])) return '';
  const parts = [`🎟️ 손님 맞이 ${g(TOUR_GROUPS)}무리 · 💰 ${g(TOUR_COINS)}`];
  if (g(TOUR_PAY[0])) parts.push(`매표 ${g(TOUR_PAY[1])}/${g(TOUR_PAY[0])}`);
  if (asked.length) parts.push(`해설 ${asked.map((s) => `${KO[s]} ${g(TOUR_Q[s][1])}/${g(TOUR_Q[s][0])}${s === 'math' && g(TOUR_FM[0]) ? `(🐟 ${g(TOUR_FM[1])}/${g(TOUR_FM[0])})` : ''}`).join(' · ')}`);
  const lv = [2, 3].filter((l) => g(TOUR_LV_Q[l][0])).map((l) => `${l}단계 ${g(TOUR_LV_Q[l][1])}/${g(TOUR_LV_Q[l][0])}`);
  if (lv.length) parts.push(lv.join(' · '));
  if (g(TOUR_BOOK[0])) parts.push(`📊 장부 ${g(TOUR_BOOK[1])}/${g(TOUR_BOOK[0])}`);
  return parts.join(' · ');
}
