// 🏦 포켓몬 증권시장 — 규칙 (순수, v319, 2026-10-22 진우 제안 → 아버님 "너의 제안대로 이 방향으로 만들어 보자")
//
// 코인으로 가상의 포켓몬 회사 주식을 사고팔고, 장이 열릴 때마다 값이 오르내린다. 아버님 걱정 = 도박처럼 빠지는 길.
// 그래서 도박처럼 만드는 요소를 설계에서 뺀다 — "느리고, 작고, 까닭이 보이게":
//   · 값은 하루 한 번(새 날을 처음 볼 때 장이 열림 · 빠진 날은 STOCK.catchUp번까지 따라잡음) — 실시간 등락 없음
//   · 장은 그날 공부를 STOCK.studySec초(15분) 한 날에만 열린다 (🔍 Codex 125차 #3 → 아버님 "A로 하자 — 10분 말고 15분") —
//     기기 시계는 믿을 수 없다(7일씩 50번 앞으로 돌려 350장·배당 💰1,905가 나왔다). 과목 화면에 머문 초는 1초씩 세어
//     시계를 돌려도 늘지 않으니, 장 하나 = 실제 공부 15분. 날마다 따로 세고 남은 초를 다음 날로 넘기지 않는다
//   · 주문은 오늘, 체결은 다음 장 값 — 즉시 사고팔기(단타·만회 매매) 없음 · 산 뒤 STOCK.holdDays장은 못 팖 · 수수료 1%
//   · 가진 것의 STOCK.capPct%까지만 투자(부모가 바꿈) · 빚·공매도 없음
//   · 값은 까닭이 보이는 소식(회사마다 좋은 일·나쁜 일)과 이어진다 — 그래도 결과는 확실하지 않다(작은 출렁임)
//   · 오래 들고 있으면 STOCK.divEvery장마다 배당 · 기대 수익은 공부 코인보다 훨씬 작게
// 저장: profile.stock 하나 (코인과 같은 "최근 쪽"으로 병합 — db.mergeStatRecord) · 값은 프로필의 seed로 장마다 만들어 저장
//   (시계를 앞으로 돌려 미래 값을 미리 볼 수 없다 — 열린 장은 되돌아가지 않는다)
// ★ 아무것도 import하지 않는다 — 시험이 그대로 부르고, 저장은 xp.houseDo(mutateProfile 한 트랜잭션)가 이 규칙을 돌린다

/** 정해 둔 값 (가격은 10배 정수로 — 102.4 → 1024) */
export const STOCK = {
  capPct: 40,       // 가진 것(코인 + 주식 값 + 주문에 묶인 코인)의 몇 %까지 투자하나 (🔒 부모 설정 CAP_CHOICES) · v351 아버님 「40%로 늘려서 기본값」(30이었다)
  feePct: 1,        // 사고팔 때 수수료 % (최소 💰1)
  holdDays: 3,      // 산 뒤 몇 장 지나야 팔 수 있나
  divEvery: 5,      // 몇 장마다 배당
  catchUp: 7,       // 빠진 날을 몇 장까지 따라잡나 (오늘부터 거슬러 이만큼의 날만 본다)
  studySec: 900,    // 그날 이만큼(초) 공부한 날에만 장이 열린다 — 수학·영어·국어 화면에 머문 초의 합 (아버님 15분)
  histLen: 40,      // 값 흐름 몇 장까지 남기나
  newsLen: 12,      // 소식 몇 개까지
  logLen: 120,      // 사고판 기록 몇 줄까지
  tallyLen: 10,     // 장마다 집계(📤 최근 7장)를 몇 장까지 남기나 — 기록 줄과 따로 (Codex 125차 #4)
  startPx: 1000,    // 처음 값 100.0
  minPx: 50,        // 값은 5.0 아래로 안 간다
  dayClamp: 0.08,   // 한 장에 ±8%까지만
  reserve: 0.10,    // 사기 주문에 묶어 두는 덤(다음 장 값이 올라도 모자라지 않게 — 한 장 ±8% + 수수료 1%보다 크게)
};
export const CAP_CHOICES = [10, 20, 30, 40, 50];
/** 🔒 부모 설정의 투자 한도 기본값 · 고른 값 → 보기 가운데 하나(아니면 기본값) */
export const STOCK_CAP = STOCK.capPct;
export function stockCapOf(v) {
  const n = Number(v);
  return CAP_CHOICES.includes(n) ? n : STOCK.capPct;
}

/** 시장 전체 움직임 — 장마다 평균 +0.15% · 출렁임 0.6% */
const MKT = { mu: 0.0015, sigma: 0.006 };
/** 소식 — 장마다 이만큼의 확률로 한 회사에 · 그날 ±1.5% 덤 + 다음 3장 동안 ±0.6%씩 */
const NEWS = { chance: 0.3, good: 0.55, jump: 0.015, drift: 0.006, days: 3 };

/** 회사 다섯 — beta 시장을 따라가는 정도 · vol 회사만의 출렁임 · div 배당(값의 몇 %를 5장마다) */
export const COMPANIES = [
  { id: 'pika', emoji: '⚡', name: '피카 전력', what: '전기를 만들어 팔아요', beta: 1.0, vol: 0.015, div: 0.006,
    good: ['새 발전소가 문을 열어 전기를 더 많이 만들어요', '더운 날이 이어져 에어컨 전기가 잘 팔려요', '이웃 마을에도 전기를 팔기로 했어요'],
    bad: ['발전소 기계가 고장 나 며칠 쉬어요', '전기 값이 내려서 버는 코인이 줄었어요', '전선을 새로 까느라 돈이 많이 들었어요'] },
  { id: 'squirtle', emoji: '🌊', name: '꼬부기 해운', what: '배로 짐을 실어 날라요', beta: 0.9, vol: 0.013, div: 0.005,
    good: ['큰 배를 새로 들여왔어요', '바다가 잔잔해서 짐을 빨리 날랐어요', '먼 나라와 새로 거래를 시작했어요'],
    bad: ['태풍 때문에 배가 항구에 묶였어요', '배 기름값이 올랐어요', '짐이 줄어서 배가 반만 찼어요'] },
  { id: 'snorlax', emoji: '🍙', name: '잠만보 식품', what: '간식과 도시락을 만들어요', beta: 0.6, vol: 0.008, div: 0.01,
    good: ['새 도시락이 인기를 끌어요', '추운 날이라 따뜻한 간식이 잘 팔려요', '큰 운동회에 도시락을 팔았어요'],
    bad: ['재료 값이 올랐어요', '새 간식이 맛이 없다는 말이 많아요', '공장 냉장고가 고장 나 고치는 중이에요'] },
  { id: 'onix', emoji: '🏗️', name: '롱스톤 건설', what: '다리와 건물을 지어요', beta: 1.2, vol: 0.015, div: 0.004,
    good: ['큰 다리를 짓는 일을 맡았어요', '새 마을에 학교를 짓기로 했어요', '튼튼하다고 소문이 나서 일이 늘었어요'],
    bad: ['비가 많이 와서 공사가 멈췄어요', '돌과 철 값이 올랐어요', '짓기로 한 건물이 미뤄졌어요'] },
  { id: 'charizard', emoji: '🔥', name: '리자몽 항공', what: '하늘길로 손님을 태워요', beta: 1.4, vol: 0.022, div: 0,
    good: ['새 하늘길이 열렸어요', '방학이라 여행 손님이 많아요', '더 빠른 비행기를 들여왔어요'],
    bad: ['안개 때문에 비행기가 못 떴어요', '비행기 기름값이 올랐어요', '손님이 줄어 빈자리가 많아요'] },
];
/** 📦 펀드 — 다섯 회사를 똑같이 조금씩 (값은 다섯 회사 오른 비율의 평균으로) */
export const FUND = { id: 'fund', emoji: '📦', name: '포켓몬 전체 시장 펀드', what: '다섯 회사를 조금씩 모두 담아요 — 덜 출렁여요', div: 0.005 };
export const ASSETS = [...COMPANIES, FUND];
const ASSET_IDS = ASSETS.map((a) => a.id);
export const assetOf = (id) => ASSETS.find((a) => a.id === id) || null;

/** 살 때·팔 때 고르는 까닭 (📤 기록에만 — 아이 화면에 셈 없음) */
export const BUY_WHY = [
  { id: 'good', ko: '이 회사가 잘할 것 같아서' },
  { id: 'news', ko: '좋은 소식을 봐서' },
  { id: 'cheap', ko: '값이 내려서 싸 보여서' },
  { id: 'guess', ko: '그냥 오를 것 같아서' },
];
export const SELL_WHY = [
  { id: 'need', ko: '코인이 필요해서' },
  { id: 'up', ko: '많이 올라서' },
  { id: 'badnews', ko: '소식이 나빠서' },
  { id: 'scared', ko: '떨어져서 무서워서' },
];
const whyKo = (list, id) => (list.find((w) => w.id === id) || {}).ko || '';
const WHY_IDS = [...BUY_WHY, ...SELL_WHY].map((w) => w.id);

// ── 작은 도구 ──

const int = (v, d = 0) => (Number.isSafeInteger(Number(v)) ? Number(v) : d);
const pos = (v) => Math.max(0, int(v));
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 'YYYY-MM-DD' 두 날 사이 날 수 (b - a) */
export function daysBetween(a, b) {
  const t = (s) => Date.UTC(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10)));
  return Math.round((t(b) - t(a)) / 86400000);
}

/** 'YYYY-MM-DD' + k일 */
export function addDays(d, k) {
  const t = new Date(Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)) + k));
  return t.toISOString().slice(0, 10);
}

/** 씨앗 → 0~1 난수 (mulberry32) */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** 표준 정규분포 하나 (Box–Muller) */
function gauss(r) {
  const u = Math.max(1e-12, r());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
}
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

/** 수수료 (최소 💰1) */
export const feeOf = (coins) => Math.max(1, Math.ceil(Math.max(0, coins) * STOCK.feePct / 100));
/** 값(10배 정수) × 주 수 → 코인 (사는 쪽은 올림, 파는 쪽은 내림) */
const costUp = (px, n) => Math.ceil((px * n) / 10);
const costDown = (px, n) => Math.floor((px * n) / 10);
/** 화면 값 — 1024 → '102.4' */
export const pxText = (px) => (int(px) / 10).toFixed(1);

// ── 상태 ──

/** 처음 시장 */
export function newStock(seed, today) {
  const px = Object.fromEntries(ASSET_IDS.map((id) => [id, STOCK.startPx]));
  return {
    v: 1, seed: seed >>> 0, day: 0, date: today, px,
    hist: Object.fromEntries(ASSET_IDS.map((id) => [id, [STOCK.startPx]])),
    news: [], drift: {}, hold: {}, orders: [], log: [], tally: {}, seq: 0,
  };
}

/** 하루 기록 하나 → 그날 공부한 초 (수학·영어·국어 화면에 머문 초 — 🖊️ 논술은 국어 안) · 없거나 깨졌으면 0 */
export function studySecOf(daily) {
  return isObj(daily) ? pos(daily.mathTime) + pos(daily.enTime) + pos(daily.korTime) : 0;
}

/** 공부 초를 읽는 꼴 하나로 — { 날: 초 } 또는 (날) => 초 · 없으면 모든 날 0 (장이 덜 열릴 뿐 더 열리지 않는다) */
function studyOf(study) {
  if (typeof study === 'function') return (d) => pos(study(d));
  return (d) => (isObj(study) ? pos(study[d]) : 0);
}

/** 저장된 시장을 읽을 수 있는 꼴로 (깨진 칸은 버린다 — 병합·백업에서 온 이상한 값으로 멈추지 않게) · 없거나 아예 깨졌으면 null */
export function stockOf(s) {
  if (!isObj(s) || !DATE_RE.test(String(s.date || '')) || !isObj(s.px)) return null;
  const out = { v: 1, seed: int(s.seed) >>> 0, day: pos(s.day), date: s.date, px: {}, hist: {}, news: [], drift: {}, hold: {}, orders: [], log: [], tally: {}, seq: pos(s.seq) };
  for (const id of ASSET_IDS) {
    out.px[id] = Math.max(STOCK.minPx, int(s.px[id], STOCK.startPx));
    const h = isObj(s.hist) && Array.isArray(s.hist[id]) ? s.hist[id].map((x) => int(x, 0)).filter((x) => x > 0) : [];
    out.hist[id] = (h.length ? h : [out.px[id]]).slice(-STOCK.histLen);
    const lots = isObj(s.hold) && Array.isArray(s.hold[id]) ? s.hold[id] : [];
    const ok = lots.filter((l) => isObj(l) && pos(l.n) > 0).map((l) => ({ n: pos(l.n), s: pos(l.s), cost: pos(l.cost) }));
    if (ok.length) out.hold[id] = ok;
    if (isObj(s.drift) && isObj(s.drift[id]) && pos(s.drift[id].left) > 0) out.drift[id] = { dir: Number(s.drift[id].dir) < 0 ? -1 : 1, left: Math.min(NEWS.days, pos(s.drift[id].left)) };
  }
  if (Array.isArray(s.news)) out.news = s.news.filter((n) => isObj(n) && ASSET_IDS.includes(n.co)).map((n) => ({ s: pos(n.s), co: n.co, good: !!n.good, text: String(n.text || '') })).slice(-STOCK.newsLen);
  if (Array.isArray(s.orders)) {
    out.orders = s.orders.filter((o) => isObj(o) && ASSET_IDS.includes(o.co) && (o.kind === 'buy' || o.kind === 'sell') && pos(o.n) > 0)
      .map((o) => ({ id: pos(o.id), kind: o.kind, co: o.co, n: pos(o.n), at: pos(o.at), reserve: pos(o.reserve), why: String(o.why || ''), drop: !!o.drop }));
  }
  if (Array.isArray(s.log)) out.log = s.log.filter(isObj).map((l) => ({ ...l })).slice(-STOCK.logLen);
  // 장마다 집계 — 지금 장보다 뒤이거나 tallyLen장보다 오래된 것·깨진 칸은 버린다
  if (isObj(s.tally)) {
    for (const [k, t] of Object.entries(s.tally)) {
      const d = Number(k);
      if (!Number.isSafeInteger(d) || d < 0 || d > out.day || d <= out.day - STOCK.tallyLen || !isObj(t)) continue;
      const why = {};
      if (isObj(t.why)) for (const [w, n] of Object.entries(t.why)) if (WHY_IDS.includes(w) && pos(n) > 0) why[w] = pos(n);
      out.tally[d] = { buy: pos(t.buy), sell: pos(t.sell), cancel: pos(t.cancel), drop: pos(t.drop), div: pos(t.div), why };
    }
  }
  return out;
}

/** 깊은 복사 (규칙이 고쳐도 원본이 안 바뀌게 — db.cloneProfile) · 없으면 undefined */
export function copyStock(s) {
  if (!isObj(s)) return undefined;
  const lots = isObj(s.hold) ? Object.fromEntries(Object.entries(s.hold).map(([k, v]) => [k, Array.isArray(v) ? v.map((l) => (isObj(l) ? { ...l } : l)) : v])) : s.hold;
  return {
    ...s,
    px: isObj(s.px) ? { ...s.px } : s.px,
    hist: isObj(s.hist) ? Object.fromEntries(Object.entries(s.hist).map(([k, v]) => [k, Array.isArray(v) ? [...v] : v])) : s.hist,
    news: Array.isArray(s.news) ? s.news.map((n) => (isObj(n) ? { ...n } : n)) : s.news,
    drift: isObj(s.drift) ? Object.fromEntries(Object.entries(s.drift).map(([k, v]) => [k, isObj(v) ? { ...v } : v])) : s.drift,
    hold: lots,
    orders: Array.isArray(s.orders) ? s.orders.map((o) => (isObj(o) ? { ...o } : o)) : s.orders,
    log: Array.isArray(s.log) ? s.log.map((l) => (isObj(l) ? { ...l } : l)) : s.log,
    tally: isObj(s.tally) ? Object.fromEntries(Object.entries(s.tally).map(([k, t]) => [k, isObj(t) ? { ...t, why: isObj(t.why) ? { ...t.why } : t.why } : t])) : s.tally,
  };
}

/** 가진 주 수 */
export const sharesOf = (st, co) => (st.hold[co] || []).reduce((a, l) => a + l.n, 0);
/** 팔 수 있는 주 수 — 산 뒤 holdDays장이 지난 것 − 이미 팔기 주문에 묶인 것 */
export function sellableOf(st, co) {
  const ripe = (st.hold[co] || []).filter((l) => l.s <= st.day - STOCK.holdDays).reduce((a, l) => a + l.n, 0);
  const locked = st.orders.filter((o) => o.kind === 'sell' && o.co === co).reduce((a, o) => a + o.n, 0);
  return Math.max(0, ripe - locked);
}
/** 주식 값(코인, 지금 값으로) */
export const holdValue = (st) => ASSET_IDS.reduce((a, id) => a + costDown(st.px[id], sharesOf(st, id)), 0);
/** 사기 주문에 묶어 둔 코인 */
export const reserved = (st) => st.orders.filter((o) => o.kind === 'buy').reduce((a, o) => a + o.reserve, 0);

/** 사기 주문에 묶을 코인 — 지금 값 × (1 + 덤) + 수수료 · 다음 장 값이 한도까지 올라도 모자라지 않게 */
export function reserveFor(px, n) {
  const c = Math.ceil((px * n * (1 + STOCK.reserve)) / 10);
  return c + feeOf(c);
}

/** 더 투자할 수 있는 코인 — (코인 + 주식 값 + 묶인 코인) × 한도% − (주식 값 + 묶인 코인) · 가진 코인보다 많을 수 없다 */
export function roomOf(st, coins, capPct = STOCK.capPct) {
  const inv = holdValue(st) + reserved(st);
  const wealth = pos(coins) + inv;
  return Math.max(0, Math.min(pos(coins), Math.floor((wealth * capPct) / 100) - inv));
}

// ── 장 열기 ──

/** 장 하나 — 값을 움직이고 소식을 만든다 (st를 고친다) */
function stepSession(st) {
  const s = st.day + 1;
  const r = rng((st.seed ^ Math.imul(s, 0x9e3779b1)) >>> 0);
  const m = MKT.mu + MKT.sigma * gauss(r);
  const ret = {};
  for (const c of COMPANIES) {
    let x = c.beta * m + c.vol * gauss(r);
    const d = st.drift[c.id];
    if (d && d.left > 0) {
      x += d.dir * NEWS.drift;
      d.left -= 1;
      if (!d.left) delete st.drift[c.id];
    }
    ret[c.id] = x;
  }
  if (r() < NEWS.chance) {
    const c = COMPANIES[Math.floor(r() * COMPANIES.length) % COMPANIES.length];
    const good = r() < NEWS.good;
    const list = good ? c.good : c.bad;
    const text = list[Math.floor(r() * list.length) % list.length];
    ret[c.id] += good ? NEWS.jump : -NEWS.jump;
    st.drift[c.id] = { dir: good ? 1 : -1, left: NEWS.days };
    st.news.push({ s, co: c.id, good, text });
    st.news = st.news.slice(-STOCK.newsLen);
  }
  let sum = 0;
  for (const c of COMPANIES) {
    ret[c.id] = clamp(ret[c.id], -STOCK.dayClamp, STOCK.dayClamp);
    sum += ret[c.id];
  }
  ret.fund = sum / COMPANIES.length;
  for (const id of ASSET_IDS) {
    st.px[id] = Math.max(STOCK.minPx, Math.round(st.px[id] * (1 + ret[id])));
    st.hist[id] = [...(st.hist[id] || []), st.px[id]].slice(-STOCK.histLen);
  }
  st.day = s;
}

function logIt(st, e) {
  st.log.push(e);
  st.log = st.log.slice(-STOCK.logLen);
  // 📤 최근 장 집계는 기록 줄과 따로 — 주문·취소를 아주 많이 해 120줄이 잘려도 그 장의 수는 그대로 (🔍 Codex 125차 #4)
  if (!['order-buy', 'order-sell', 'cancel', 'div'].includes(e.kind)) return;
  const t = st.tally[e.s] || (st.tally[e.s] = { buy: 0, sell: 0, cancel: 0, drop: 0, div: 0, why: {} });
  if (e.kind === 'order-buy') t.buy += 1;
  if (e.kind === 'order-sell') t.sell += 1;
  if (e.kind === 'cancel') t.cancel += 1;
  if (e.kind === 'div') t.div += pos(e.coins);
  if (e.kind === 'order-buy' && e.drop) t.drop += 1;
  if (e.kind.startsWith('order-') && WHY_IDS.includes(e.why)) t.why[e.why] = (t.why[e.why] || 0) + 1;
  // 오래된 장 집계는 stockOf가 읽을 때마다 버린다 (규칙은 모두 stockSync → stockOf를 먼저 거친다)
}

/** 기다리던 주문을 지금 값으로 — 사기는 묶인 코인에서 내고 남으면 돌려줌 · 팔기는 오래된 주식부터 (p.coins를 고친다) */
function fill(p, st, events) {
  for (const o of st.orders) {
    const px = st.px[o.co];
    if (o.kind === 'buy') {
      const c = costUp(px, o.n);
      const total = c + feeOf(c);
      const pay = Math.min(total, o.reserve); // 묶은 코인이 늘 넉넉하다(reserveFor) — 그래도 넘치면 묶은 만큼만
      p.coins = pos(p.coins) + (o.reserve - pay);
      st.hold[o.co] = [...(st.hold[o.co] || []), { n: o.n, s: st.day, cost: pay }];
      logIt(st, { s: st.day, date: st.date, kind: 'buy', co: o.co, n: o.n, px, coins: pay, why: o.why, drop: o.drop });
      events.push({ kind: 'buy', co: o.co, n: o.n, px, coins: pay });
    } else {
      let left = o.n;
      const lots = (st.hold[o.co] || []).map((l) => ({ ...l }));
      for (const l of lots) {
        const k = Math.min(left, l.n);
        l.cost = Math.round((l.cost * (l.n - k)) / l.n);
        l.n -= k;
        left -= k;
        if (!left) break;
      }
      const sold = o.n - left;
      const kept = lots.filter((l) => l.n > 0);
      if (kept.length) st.hold[o.co] = kept; else delete st.hold[o.co];
      if (!sold) continue;
      const g = costDown(px, sold);
      const get = Math.max(0, g - feeOf(g));
      p.coins = pos(p.coins) + get;
      logIt(st, { s: st.day, date: st.date, kind: 'sell', co: o.co, n: sold, px, coins: get, why: o.why });
      events.push({ kind: 'sell', co: o.co, n: sold, px, coins: get });
    }
  }
  st.orders = [];
}

/** 배당 — divEvery장마다 가진 것의 값 × 배당률 (💰1 아래는 없음) */
function payDiv(p, st, events) {
  for (const a of ASSETS) {
    const n = sharesOf(st, a.id);
    if (!n || !a.div) continue;
    const pay = Math.floor(costDown(st.px[a.id], n) * a.div);
    if (pay < 1) continue;
    p.coins = pos(p.coins) + pay;
    logIt(st, { s: st.day, date: st.date, kind: 'div', co: a.id, n, px: st.px[a.id], coins: pay });
    events.push({ kind: 'div', co: a.id, coins: pay });
  }
}

/**
 * 새 날이면 장을 연다 (규칙 — p를 고친다) — 처음 연 장에서 기다리던 주문을 채우고, divEvery장마다 배당
 * 지난 장 뒤의 날 가운데 오늘부터 거슬러 catchUp날만 보고, **그날 공부를 studySec초 넘게 한 날만** 장 하나씩 연다
 * (🔍 Codex 125차 #3 — 시계를 앞으로 돌린 날엔 공부 기록이 없어 장이 안 열린다 · 한 날은 한 번만 — 연 날까지 date가 간다)
 * 공부를 안 한 날은 건너뛴다(그날 값은 그대로) · 시계가 뒤로 갔으면 아무 일도 없다(열린 장은 되돌아가지 않는다)
 * @param {object|Function} study { 'YYYY-MM-DD': 그날 공부한 초 } 또는 (날) => 초 — 없으면 장이 안 열린다
 * @returns {{st:object, events:Array, opened:number}}
 */
export function stockSync(p, today, study) {
  const st = stockOf(p.stock);
  const events = [];
  if (!st) return { st: null, events, opened: 0 };
  let opened = 0;
  if (DATE_RE.test(String(today)) && today > st.date) {
    const secOf = studyOf(study);
    const back = Math.min(STOCK.catchUp, daysBetween(st.date, today));
    for (let k = back - 1; k >= 0; k--) {
      const d = addDays(today, -k); // 오래된 날부터
      if (secOf(d) < STOCK.studySec) continue;
      stepSession(st);
      st.date = d; // 장이 열린 날 (기록 날짜)
      if (!opened && st.orders.length) fill(p, st, events);
      if (st.day % STOCK.divEvery === 0) payDiv(p, st, events);
      opened += 1;
    }
  }
  p.stock = st;
  return { st, events, opened };
}

// ── 화면이 부르는 규칙 (xp.houseDo 안에서 — 저장된 프로필로 한 트랜잭션) ──

/** 처음 들어와 시작하기 — seed는 부른 쪽이 정한다(Math.random) */
export function stockStartRule(p, today, seed) {
  if (stockOf(p.stock)) return { ok: false, why: 'started' };
  if (!DATE_RE.test(String(today))) return { ok: false, why: 'date' };
  p.stock = newStock(seed, today);
  return { ok: true, events: [] };
}

/** 열 때 — 새 날이면 장을 열고 일어난 일을 돌려준다 (열린 장이 없으면 저장할 것도 없다) · study는 stockSync와 같은 꼴 */
export function stockOpenRule(p, today, study) {
  const { st, events, opened } = stockSync(p, today, study);
  if (!st) return { ok: false, why: 'none' };
  if (!opened) return { ok: false, why: 'same', quiet: true };
  return { ok: true, events, opened };
}

/**
 * 주문·취소가 안 될 때 — 그사이 연 장이 있으면 장은 저장한다(ok:true + refused 까닭) · 없으면 아무것도 안 쓴다 (🔍 Codex 125차 #2)
 * 거절과 함께 장까지 버리면 화면이 저장 안 된 체결을 보여 주고, 시계를 앞으로 돌려 다음 값을 본 뒤 되돌려 그 주문만 피할 수 있었다
 */
function refuse(why, events, opened) {
  return opened ? { ok: true, refused: why, events, opened } : { ok: false, why };
}

/**
 * 사기 주문 — 다음 장 값으로 체결 · 코인은 지금 묶어 둔다(reserveFor) · 한 회사에 기다리는 주문은 하나
 * @param {{co:string, n:number, why:string, capPct?:number, on?:boolean}} o
 */
export function stockBuyRule(p, today, o, study) {
  if (o.on === false) return { ok: false, why: 'off' };
  const { st, events, opened } = stockSync(p, today, study);
  if (!st) return { ok: false, why: 'none' };
  const a = assetOf(o.co);
  const n = pos(o.n);
  if (!a || !n || n > 999) return refuse('bad', events, opened);
  if (!BUY_WHY.some((w) => w.id === o.why)) return refuse('why', events, opened);
  if (st.orders.some((x) => x.co === o.co)) return refuse('pending', events, opened);
  const need = reserveFor(st.px[o.co], n);
  if (need > pos(p.coins)) return refuse('coins', events, opened);
  if (need > roomOf(st, p.coins, o.capPct || STOCK.capPct)) return refuse('cap', events, opened);
  const h = st.hist[o.co] || [];
  const drop = h.length >= 2 && h[h.length - 1] <= h[h.length - 2] * 0.97; // 지난 장에 3% 넘게 떨어진 뒤에 산다 (📤 만회 매매 신호)
  st.seq += 1;
  st.orders.push({ id: st.seq, kind: 'buy', co: o.co, n, at: st.day, reserve: need, why: o.why, drop });
  p.coins = pos(p.coins) - need;
  logIt(st, { s: st.day, date: st.date, kind: 'order-buy', co: o.co, n, px: st.px[o.co], coins: need, why: o.why, drop });
  return { ok: true, events, opened, reserve: need };
}

/** 팔기 주문 — 다음 장 값으로 · 산 뒤 holdDays장이 지난 주만 */
export function stockSellRule(p, today, o, study) {
  if (o.on === false) return { ok: false, why: 'off' };
  const { st, events, opened } = stockSync(p, today, study);
  if (!st) return { ok: false, why: 'none' };
  const a = assetOf(o.co);
  const n = pos(o.n);
  if (!a || !n) return refuse('bad', events, opened);
  if (!SELL_WHY.some((w) => w.id === o.why)) return refuse('why', events, opened);
  if (st.orders.some((x) => x.co === o.co)) return refuse('pending', events, opened);
  if (n > sellableOf(st, o.co)) return refuse('hold', events, opened);
  st.seq += 1;
  st.orders.push({ id: st.seq, kind: 'sell', co: o.co, n, at: st.day, reserve: 0, why: o.why, drop: false });
  logIt(st, { s: st.day, date: st.date, kind: 'order-sell', co: o.co, n, px: st.px[o.co], coins: 0, why: o.why });
  return { ok: true, events, opened };
}

/** 기다리는 주문 취소 — 사기는 묶인 코인을 다 돌려준다 · id는 화면이 본 주문 (그사이 체결됐거나 다른 창이 바꿨으면 'changed') */
export function stockCancelRule(p, today, id, study) {
  const { st, events, opened } = stockSync(p, today, study);
  if (!st) return { ok: false, why: 'none' };
  const k = st.orders.findIndex((o) => o.id === id);
  if (k < 0) return refuse('changed', events, opened);
  const [o] = st.orders.splice(k, 1);
  if (o.kind === 'buy') p.coins = pos(p.coins) + o.reserve;
  logIt(st, { s: st.day, date: st.date, kind: 'cancel', co: o.co, n: o.n, px: st.px[o.co], coins: o.kind === 'buy' ? o.reserve : 0 });
  return { ok: true, events, opened };
}

// ── 화면 말 (순수) ──

/** 지난 장보다 몇 % — 화면에 ▲·▼ (처음 장이면 0) */
export function changePct(st, co) {
  const h = st.hist[co] || [];
  if (h.length < 2) return 0;
  return Math.round(((h[h.length - 1] - h[h.length - 2]) / h[h.length - 2]) * 1000) / 10;
}

/** 일어난 일 한 줄 (체결·배당) */
export function eventLine(e) {
  const a = assetOf(e.co);
  const name = a ? `${a.emoji} ${a.name}` : e.co;
  if (e.kind === 'buy') return `${name} ${e.n}주를 샀어요 (한 주 ${pxText(e.px)})`;
  if (e.kind === 'sell') return `${name} ${e.n}주를 팔았어요 (한 주 ${pxText(e.px)} · 💰${e.coins} 받음)`;
  if (e.kind === 'div') return `${name}에서 배당 💰${e.coins}를 받았어요`;
  return '';
}

/** 가진 것 하나 — { n, cost 산 코인, value 지금 값, pct 오른 % } */
export function positionOf(st, co) {
  const n = sharesOf(st, co);
  const cost = (st.hold[co] || []).reduce((a, l) => a + l.cost, 0);
  const value = costDown(st.px[co], n);
  return { n, cost, value, pct: cost ? Math.round(((value - cost) / cost) * 1000) / 10 : 0 };
}

// ── 📤 usage/stock.md (아빠·Claude만 — 아이 화면에는 안 보임) ──

/** 기록 글 (순수) — 가진 것·기다리는 주문·최근 7장 주문 수와 까닭·떨어진 뒤 더 산 수·배당·최근 사고판 기록 */
export function stockMd(stock, coins, today) {
  const st = stockOf(stock);
  const lines = [`# 🏦 포켓몬 증권시장 (${today} · 이 기기 기준) — v319부터`, ''];
  if (!st) return `${[...lines, '아직 시작하지 않았어요.'].join('\n')}\n`;
  const inv = holdValue(st);
  lines.push(`장 ${st.day}번째 (${st.date}) · 💰 코인 ${pos(coins)} · 주식 값 ${inv} · 주문에 묶인 코인 ${reserved(st)} · 투자 비율 ${Math.round((100 * (inv + reserved(st))) / Math.max(1, pos(coins) + inv + reserved(st)))}%`);
  lines.push('', '## 가진 것');
  const held = ASSETS.filter((a) => sharesOf(st, a.id) > 0);
  if (!held.length) lines.push('(없음)');
  for (const a of held) {
    const q = positionOf(st, a.id);
    lines.push(`- ${a.emoji} ${a.name}: ${q.n}주 · 산 코인 ${q.cost} → 지금 ${q.value} (${q.pct >= 0 ? '+' : ''}${q.pct}%)`);
  }
  lines.push('', '## 기다리는 주문');
  if (!st.orders.length) lines.push('(없음)');
  for (const o of st.orders) lines.push(`- ${o.kind === 'buy' ? '사기' : '팔기'} ${assetOf(o.co).name} ${o.n}주 · 까닭: ${whyKo(o.kind === 'buy' ? BUY_WHY : SELL_WHY, o.why)}`);
  // 최근 7장 — 주문 수 · 까닭 · 떨어진 뒤 더 산 수 · 받은 배당 (만회 매매·잦은 주문을 살피는 신호) · 기록 줄이 아니라 장마다 집계에서 (Codex 125차 #4)
  const recent = Object.entries(st.tally).filter(([k]) => Number(k) > st.day - 7).map(([, t]) => t);
  const sum = (f) => recent.reduce((a, t) => a + t[f], 0);
  const why = {};
  for (const t of recent) for (const [w, n] of Object.entries(t.why)) { const k = whyKo(BUY_WHY, w) || whyKo(SELL_WHY, w); why[k] = (why[k] || 0) + n; }
  lines.push('', `## 최근 7장 (장은 그날 공부를 ${STOCK.studySec / 60}분 한 날에만 열림)`,`- 주문 ${sum('buy') + sum('sell')} (사기 ${sum('buy')} · 팔기 ${sum('sell')}) · 취소 ${sum('cancel')}`,
    `- 고른 까닭: ${Object.keys(why).length ? Object.entries(why).map(([k, v]) => `${k} ${v}`).join(' · ') : '(없음)'}`,
    `- 지난 장에 3% 넘게 떨어진 뒤 바로 더 산 주문: ${sum('drop')}`,
    `- 받은 배당: 💰${sum('div')}`);
  lines.push('', '## 최근 사고판 기록 (20줄)');
  const KO = { 'order-buy': '사기 주문', 'order-sell': '팔기 주문', buy: '샀음', sell: '팔았음', div: '배당', cancel: '주문 취소' };
  const last = st.log.slice(-20);
  if (!last.length) lines.push('(없음)');
  for (const l of last) {
    const a = assetOf(l.co);
    const w = l.why ? ` · 까닭: ${whyKo(l.kind.includes('buy') ? BUY_WHY : SELL_WHY, l.why)}` : '';
    lines.push(`- 장 ${l.s} (${l.date}) ${KO[l.kind] || l.kind} ${a ? a.name : l.co}${l.n ? ` ${l.n}주` : ''} · 한 주 ${pxText(l.px)} · 💰${pos(l.coins)}${w}${l.drop ? ' · 떨어진 뒤' : ''}`);
  }
  return `${lines.join('\n')}\n`;
}
