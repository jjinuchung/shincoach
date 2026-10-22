// 🏦 포켓몬 증권시장 — 화면 (v319, 2026-10-22 진우 제안 → 아버님 "너의 제안대로 이 방향으로 만들어 보자")
// 규칙은 stock.js(순수), 저장은 xp.houseDo(저장된 프로필로 한 트랜잭션 — 저장이 안 되면 없던 일) · 이 파일은 그리고 잇기만.
// 담담하게: 깜빡임·축하 소리 없음 · 오른 것 ▲(빨강)·내린 것 ▼(파랑)는 차분한 색 · 몇 주짜리 흐름 차트 · 셈·재촉 문구 없음
// 주문은 두 번 눌러야 낸다(잘못 누른 주문을 막게) · 다음 장 값으로 체결 · 기다리는 주문은 취소할 수 있다
// 장은 그날 공부를 15분 한 날에만 열린다(🔍 Codex 125차 #3) — 규칙을 부를 때마다 하루 기록에서 공부한 초를 읽어 넘긴다
import {
  STOCK, ASSETS, BUY_WHY, SELL_WHY, assetOf, stockOf, sharesOf, sellableOf, holdValue, reserved, reserveFor, roomOf, feeOf,
  changePct, eventLine, positionOf, pxText, stockStartRule, stockOpenRule, stockBuyRule, stockSellRule, stockCancelRule,
  studySecOf, addDays,
} from './stock.js';
import { houseDo, coins, getProfileSnapshot, onProfileReload, profileLoading } from './xp.js';
import { getDaily } from './db.js';
import { flushTime } from './timelimit.js';
import { unlock as sfxUnlock } from './sfx.js';

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
const btn = (cls, text, on, label) => {
  const b = el('button', `btn ${cls || ''}`.trim(), text);
  b.type = 'button';
  if (label) b.setAttribute('aria-label', label);
  b.addEventListener('click', on);
  return b;
};

function todayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 실패 까닭 → 말 (한도는 부모가 고른 %라 whyText에서) */
const WHY = {
  coins: '코인이 모자라요',
  pending: '이 회사에는 기다리는 주문이 있어요 — 다음 장에 처리돼요',
  hold: `산 뒤 장이 ${STOCK.holdDays}번 열려야 팔 수 있어요`,
  off: '지금은 증권시장이 쉬어요',
  save: '저장이 안 됐어요 — 다시 해 볼까요?',
  changed: '그 사이 주문이 처리됐어요',
  why: '까닭을 하나 골라 주세요',
  bad: '몇 주인지 다시 골라 주세요',
  none: '아직 시작하지 않았어요',
  started: '벌써 시작했어요',
};
/** 까닭 → 말 — 한도에 막히면 "저장이 안 됐어요"(다시 해 보라는 말)가 아니라 한도를 알려 준다 (🔍 Codex 125차 #6) */
function whyText(why) {
  if (why === 'cap') return `투자는 가진 것의 ${confNow().cap}%까지예요 — 지금은 더 살 수 없어요`;
  return WHY[why] || WHY.save;
}

const ui = {
  wired: false, open: false, busy: false, conf: () => ({ on: true, cap: STOCK.capPct }),
  msg: '', events: [], sel: '', mode: '', n: 1, why: '', arm: '',
};

/** 앱을 켤 때 한 번 (app.js) — conf = player.stockConf (🔒 부모 설정: 켜기·투자 한도) */
export function initStock({ conf } = {}) {
  if (ui.wired) return;
  ui.wired = true;
  if (typeof conf === 'function') ui.conf = conf;
  for (const b of document.querySelectorAll('[data-open="stock"]')) b.addEventListener('click', () => openStock());
  $('stock-close').addEventListener('click', () => closeStock());
  $('stock').addEventListener('click', (e) => { if (e.target === $('stock')) closeStock(); });
  onProfileReload(() => { if (ui.open) { resetPanel(); render(); } });
  refreshStockBtn();
}

/** 홈의 🏦 — 부모가 끄면 숨는다 (app.showView('home')·설정 저장 뒤) */
export function refreshStockBtn() {
  const b = $('btn-stock');
  if (b) b.hidden = !confNow().on;
}

function confNow() {
  try { const c = ui.conf() || {}; return { on: c.on !== false, cap: Number(c.cap) || STOCK.capPct }; } catch { return { on: true, cap: STOCK.capPct }; }
}

export function isStockOpen() {
  return ui.open;
}

function resetPanel() {
  ui.sel = ''; ui.mode = ''; ui.n = 1; ui.why = ''; ui.arm = '';
}

/** 🏦 열기 — 공부한 새 날이면 장을 연다(기다리던 주문 체결·배당) · 일어난 일은 위에 한 번 */
export function openStock() {
  ui.open = true;
  ui.msg = '';
  ui.events = [];
  resetPanel();
  $('stock').hidden = false;
  render();
  run((p, study) => stockOpenRule(p, todayKey(), study), null, true);
}

export function closeStock() {
  if (!ui.open) return;
  ui.open = false;
  $('stock').hidden = true;
}

/**
 * 장을 여는 공부 초 { 날: 초 } — 오늘부터 거슬러 STOCK.catchUp날의 하루 기록(수학·영어·국어 화면에 머문 초의 합)
 * 모아 둔 초를 먼저 저장한다 · 못 읽은 날은 0 (장이 덜 열릴 뿐 더 열리지 않는다)
 */
async function studyNow() {
  await flushTime().catch(() => {});
  const today = todayKey();
  const days = Array.from({ length: STOCK.catchUp }, (_, k) => addDays(today, -k));
  const secs = await Promise.all(days.map((d) => getDaily(d).then(studySecOf, () => 0)));
  return Object.fromEntries(days.map((d, k) => [d, secs[k]]));
}

/**
 * 저장된 프로필로 한 트랜잭션 — rule(p, study) · 끝나면 다시 그린다 · quiet면 실패 말을 안 띄운다(열 때 "새 날 아님")
 * 화면에는 **저장된 일만** — 주문이 거절돼도 그사이 연 장은 규칙이 저장하고(ok + refused) 그 일만 보여 준다 (🔍 Codex 125차 #2)
 */
function run(rule, onOk, quiet = false) {
  if (ui.busy) return;
  ui.busy = true;
  studyNow().then((study) => houseDo((p) => rule(p, study))).then((r) => {
    if (!ui.open) return;
    if (r && r.ok && r.events && r.events.length) ui.events = [...ui.events, ...r.events.map(eventLine).filter(Boolean)];
    if (r && r.ok && r.refused) ui.msg = whyText(r.refused);
    else if (r && r.ok) { if (onOk) onOk(r); } else if (!quiet || (r && r.why === 'save')) ui.msg = whyText(r && r.why);
  }).catch(() => { if (ui.open) ui.msg = WHY.save; }).finally(() => { ui.busy = false; if (ui.open) render(); });
}

function stockNow() {
  return stockOf(getProfileSnapshot().stock);
}

// ── 그리기 ──

function render() {
  if (!ui.open) return;
  $('stock-coins').textContent = `💰 ${coins().toLocaleString()}`;
  $('stock-msg').textContent = ui.msg;
  const body = $('stock-body');
  body.textContent = '';
  if (profileLoading()) { body.appendChild(el('p', 'stock-note', '불러오는 중이에요…')); return; }
  const st = stockNow();
  if (!st) { body.appendChild(introEl()); return; }
  const conf = confNow();
  if (ui.events.length) {
    const box = el('div', 'stock-events');
    box.appendChild(el('div', 'stock-sub', '📬 지난번 뒤로 생긴 일'));
    for (const t of ui.events) box.appendChild(el('div', 'stock-event', t));
    body.appendChild(box);
  }
  body.appendChild(summaryEl(st, conf));
  body.appendChild(newsEl(st));
  const list = el('div', 'stock-list');
  for (const a of ASSETS) list.appendChild(assetEl(st, a, conf));
  body.appendChild(list);
  body.appendChild(helpEl(conf));
}

/** 처음 왔을 때 — 무엇을 하는 곳인지 · 시작하기 */
function introEl() {
  const conf = confNow();
  const box = el('div', 'stock-intro');
  box.appendChild(el('h3', 'stock-h', '🏦 포켓몬 증권시장에 온 걸 환영해요!'));
  const ul = el('ul', 'stock-rules');
  for (const t of [
    '코인으로 포켓몬 회사의 주식을 살 수 있어요. 회사가 잘하면 값이 오르고, 어려우면 내려요.',
    `장은 그날 공부를 ${STOCK.studySec / 60}분 하면 열려요. 값은 장이 열릴 때 하루에 한 번 바뀌어요.`,
    '주문은 오늘 하고, 사고팔기는 다음 장 값으로 돼요.',
    `가진 것의 ${conf.cap}%까지만 투자할 수 있어요.`,
    '오래 들고 있으면 배당(회사가 나눠 주는 코인)을 받아요.',
  ]) ul.appendChild(el('li', null, t));
  box.appendChild(ul);
  if (!conf.on) { box.appendChild(el('p', 'stock-note', WHY.off)); return box; }
  box.appendChild(btn('btn-primary stock-start', '🏦 시작하기', () => {
    sfxUnlock();
    run((p) => stockStartRule(p, todayKey(), Math.floor(Math.random() * 4294967296)), () => { ui.msg = '시작했어요! 내일 공부를 하면 첫 장이 열려요'; });
  }));
  return box;
}

/** 내 투자 한눈에 — 주식 값 · 산 코인 · 더 투자할 수 있는 코인 · 기다리는 주문 */
function summaryEl(st, conf) {
  const box = el('div', 'stock-summary');
  const value = holdValue(st);
  const cost = ASSETS.reduce((a, x) => a + positionOf(st, x.id).cost, 0);
  box.appendChild(el('div', 'stock-sub', '💼 내 투자'));
  const row = el('div', 'stock-sum-row');
  row.appendChild(el('span', null, `주식 값 💰${value.toLocaleString()}`));
  if (cost) row.appendChild(pctEl(Math.round(((value - cost) / cost) * 1000) / 10, '산 값보다'));
  box.appendChild(row);
  box.appendChild(el('div', 'stock-sum-room', conf.on ? `더 투자할 수 있는 코인 💰${roomOf(st, coins(), conf.cap).toLocaleString()} (가진 것의 ${conf.cap}%까지)` : WHY.off));
  if (st.orders.length) {
    box.appendChild(el('div', 'stock-sub', '⏳ 다음 장에 처리될 주문'));
    for (const o of st.orders) {
      const a = assetOf(o.co);
      const line = el('div', 'stock-order');
      line.appendChild(el('span', null, `${o.kind === 'buy' ? '사기' : '팔기'} · ${a.emoji} ${a.name} ${o.n}주${o.kind === 'buy' ? ` (묶어 둔 💰${o.reserve})` : ''}`));
      line.appendChild(btn('stock-cancel', '취소', () => run((p, study) => stockCancelRule(p, todayKey(), o.id, study), () => { ui.msg = '주문을 취소했어요'; resetPanel(); }), `${a.name} 주문 취소`));
      box.appendChild(line);
    }
  }
  // 오늘 장이 아직이면 공부하면 열린다고 한 줄 — 셈(몇 분 남았나) 없이 (Codex 125차 #3)
  box.appendChild(el('div', 'stock-day', `장 ${st.day}번째 · ${st.date < todayKey() ? '오늘 공부를 하면 장이 열려요' : '다음 장은 내일 공부를 하면 열려요'}`));
  return box;
}

function newsEl(st) {
  const box = el('div', 'stock-news');
  box.appendChild(el('div', 'stock-sub', '📰 소식'));
  const list = st.news.slice(-3).reverse();
  if (!list.length) box.appendChild(el('div', 'stock-note', '아직 소식이 없어요'));
  for (const n of list) {
    const a = assetOf(n.co);
    const line = el('div', `stock-news-line ${n.good ? 'is-good' : 'is-bad'}`);
    line.appendChild(el('span', 'stock-news-tag', n.good ? '좋은 소식' : '나쁜 소식'));
    line.appendChild(el('span', null, `${a.emoji} ${a.name} — ${n.text}`));
    box.appendChild(line);
  }
  return box;
}

/** ▲ 1.2% · ▼ 0.8% · – (차분한 색) */
function pctEl(pct, label = '') {
  const s = el('span', `stock-pct ${pct > 0 ? 'is-up' : pct < 0 ? 'is-down' : ''}`, `${pct > 0 ? '▲' : pct < 0 ? '▼' : '–'} ${Math.abs(pct).toFixed(1)}%`);
  if (label) s.setAttribute('aria-label', `${label} ${pct > 0 ? '올라서' : pct < 0 ? '내려서' : ''} ${Math.abs(pct).toFixed(1)}%`);
  return s;
}

/** 값 흐름 (최근 histLen장) — 작은 꺾은선 */
function sparkEl(hist) {
  const W = 120; const H = 30;
  const svgNs = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNs, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('class', 'stock-spark');
  svg.setAttribute('preserveAspectRatio', 'none'); // 카드 폭만큼 늘인다 (선 굵기는 non-scaling-stroke로 그대로)
  svg.setAttribute('aria-hidden', 'true');
  const h = hist.length > 1 ? hist : [hist[0] || 1, hist[0] || 1];
  const lo = Math.min(...h); const hi = Math.max(...h);
  // 높이는 적어도 값의 ±10%만큼 — 작은 차이가 차트 높이를 다 채워 크게 출렁이는 것처럼 보이지 않게 (Codex 125차 작은 것)
  const span = Math.max(1, hi - lo, Math.round((hi + lo) * 0.1));
  const base = (hi + lo) / 2 - span / 2;
  const pts = h.map((v, k) => `${((k / (h.length - 1)) * (W - 4) + 2).toFixed(1)},${(H - 3 - ((v - base) / span) * (H - 6)).toFixed(1)}`).join(' ');
  const line = document.createElementNS(svgNs, 'polyline');
  line.setAttribute('points', pts);
  line.setAttribute('fill', 'none');
  line.setAttribute('stroke', 'currentColor');
  line.setAttribute('stroke-width', '2');
  line.setAttribute('stroke-linejoin', 'round');
  line.setAttribute('vector-effect', 'non-scaling-stroke');
  svg.appendChild(line);
  return svg;
}

function assetEl(st, a, conf) {
  const card = el('div', `stock-asset${a.id === 'fund' ? ' is-fund' : ''}`);
  const top = el('div', 'stock-asset-top');
  const name = el('div', 'stock-asset-name');
  name.appendChild(el('b', null, `${a.emoji} ${a.name}`));
  name.appendChild(el('small', null, a.what));
  top.appendChild(name);
  const px = el('div', 'stock-asset-px');
  px.appendChild(el('b', null, pxText(st.px[a.id])));
  px.appendChild(pctEl(changePct(st, a.id), '지난 장보다'));
  top.appendChild(px);
  card.appendChild(top);
  card.appendChild(sparkEl(st.hist[a.id] || []));
  const q = positionOf(st, a.id);
  if (q.n) {
    const own = el('div', 'stock-own');
    own.appendChild(el('span', null, `가진 주 ${q.n} · 지금 값 💰${q.value.toLocaleString()}`));
    own.appendChild(pctEl(q.pct, '산 값보다'));
    card.appendChild(own);
    // 산 날은 수수료 때문에 산 값보다 조금 낮아 보인다 — 놀라지 않게 까닭을 담담하게 한 줄
    if ((st.hold[a.id] || []).some((l) => l.s === st.day)) card.appendChild(el('div', 'stock-note', '산 날은 수수료만큼 조금 낮아 보여요'));
    if (!sellableOf(st, a.id) && !st.orders.some((o) => o.co === a.id)) card.appendChild(el('div', 'stock-note', WHY.hold));
  }
  if (a.div) card.appendChild(el('div', 'stock-note', `💝 들고 있으면 장이 ${STOCK.divEvery}번 열릴 때마다 배당`));
  if (conf.on) {
    const acts = el('div', 'stock-acts');
    const pending = st.orders.some((o) => o.co === a.id);
    const buy = btn('', '사기', () => openPanel(a.id, 'buy'), `${a.name} 사기`);
    const sell = btn('', '팔기', () => openPanel(a.id, 'sell'), `${a.name} 팔기`);
    buy.disabled = pending;
    sell.disabled = pending || !sellableOf(st, a.id);
    acts.append(buy, sell);
    card.appendChild(acts);
    if (ui.sel === a.id) card.appendChild(panelEl(st, a, conf));
  }
  return card;
}

function openPanel(co, mode) {
  if (ui.sel === co && ui.mode === mode) { resetPanel(); render(); return; }
  ui.sel = co; ui.mode = mode; ui.n = 1; ui.why = ''; ui.arm = '';
  ui.msg = '';
  render();
}

/** 사기·팔기 판 — 몇 주 · 예상 코인 · 까닭 · 두 번 눌러 주문 */
function panelEl(st, a, conf) {
  const buy = ui.mode === 'buy';
  const box = el('div', 'stock-panel');
  // 살 수 있는 주 수 — n주 묶음은 한 주 묶음 × n보다 크지 않다(올림) · 0이면 왜 못 사는지 알려 주고 주문 단추를 안 낸다 (🔍 Codex 125차 #6)
  const max = buy ? Math.floor(roomOf(st, coins(), conf.cap) / Math.max(1, reserveFor(st.px[a.id], 1))) : sellableOf(st, a.id);
  if (max < 1) {
    box.appendChild(el('div', 'stock-note', buy ? (reserveFor(st.px[a.id], 1) > coins() ? WHY.coins : whyText('cap')) : WHY.hold));
    const acts = el('div', 'stock-acts');
    acts.appendChild(btn('', '알겠어요', () => { resetPanel(); render(); }));
    box.appendChild(acts);
    return box;
  }
  ui.n = Math.min(Math.max(1, ui.n), max);
  const row = el('div', 'stock-n');
  row.appendChild(el('span', null, buy ? '몇 주 살까요?' : `몇 주 팔까요? (팔 수 있는 주 ${max})`));
  const minus = btn('btn-icon', '−', () => { ui.n = Math.max(1, ui.n - 1); ui.arm = ''; render(); }, '한 주 덜');
  const plus = btn('btn-icon', '+', () => { ui.n = Math.min(max, ui.n + 1); ui.arm = ''; render(); }, '한 주 더');
  minus.disabled = ui.n <= 1;
  plus.disabled = ui.n >= max;
  row.append(minus, el('b', 'stock-n-val', `${ui.n}주`), plus);
  box.appendChild(row);
  const px = st.px[a.id];
  if (buy) {
    const c = Math.ceil((px * ui.n) / 10);
    box.appendChild(el('div', 'stock-est', `오늘 값이면 💰${c + feeOf(c)} (수수료 포함) · 다음 장 값으로 사져요`));
    box.appendChild(el('div', 'stock-note', `주문하면 💰${reserveFor(px, ui.n)}을 묶어 두고, 남으면 돌려받아요`));
  } else {
    const g = Math.floor((px * ui.n) / 10);
    box.appendChild(el('div', 'stock-est', `오늘 값이면 💰${Math.max(0, g - feeOf(g))} 받아요 (수수료 뺀 것) · 다음 장 값으로 팔려요`));
  }
  box.appendChild(el('div', 'stock-sub', buy ? '왜 사고 싶어요?' : '왜 팔고 싶어요?'));
  const whys = el('div', 'stock-whys');
  for (const w of buy ? BUY_WHY : SELL_WHY) {
    const b = btn(`stock-why${ui.why === w.id ? ' is-on' : ''}`, w.ko, () => { ui.why = w.id; ui.arm = ''; render(); });
    b.setAttribute('aria-pressed', ui.why === w.id ? 'true' : 'false');
    whys.appendChild(b);
  }
  box.appendChild(whys);
  const key = `${ui.mode}:${a.id}:${ui.n}:${ui.why}`;
  const acts = el('div', 'stock-acts');
  acts.appendChild(btn('', '그만', () => { resetPanel(); render(); }));
  acts.appendChild(btn('btn-primary', ui.arm === key ? '한 번 더 누르면 주문해요' : '주문하기', () => order(a, key)));
  box.appendChild(acts);
  return box;
}

function order(a, key) {
  if (!ui.why) { ui.msg = WHY.why; render(); return; }
  if (ui.arm !== key) { ui.arm = key; ui.msg = ''; render(); return; }
  const conf = confNow();
  const o = { co: a.id, n: ui.n, why: ui.why, capPct: conf.cap, on: conf.on };
  const buy = ui.mode === 'buy';
  run((p, study) => (buy ? stockBuyRule(p, todayKey(), o, study) : stockSellRule(p, todayKey(), o, study)), (r) => {
    ui.msg = buy ? `주문했어요! 다음 장 값으로 사져요 (💰${r.reserve} 묶어 둠 — 남으면 돌려받아요)` : '주문했어요! 다음 장 값으로 팔려요';
    resetPanel();
  });
  ui.arm = '';
}

/** 📖 이렇게 돼요 + 건강한 투자 습관 (접어 둠) */
function helpEl(conf) {
  const d = el('details', 'stock-help');
  d.appendChild(el('summary', null, '📖 이렇게 돼요'));
  const ul = el('ul', 'stock-rules');
  for (const t of [
    `장은 그날 공부를 ${STOCK.studySec / 60}분 하면 열리고, 값은 그때 한 번 바뀌어요. 자주 들여다봐도 값은 그대로예요.`,
    `주문은 오늘 하고, 다음 장 값으로 사고팔아요. 사고팔 때 수수료 ${STOCK.feePct}%를 내요.`,
    `${WHY.hold}. 가진 것의 ${conf.cap}%까지만 투자해요.`,
    '한 회사에 다 넣지 말고 나눠 담으면 덜 출렁여요. 📦 펀드는 다섯 회사를 조금씩 모두 담아요.',
    '좋은 소식이 있어도 값이 늘 오르지는 않아요. 내려가는 날도 있어요.',
    '오래 들고 있으면 배당을 받고, 출렁임도 덜 무서워져요.',
  ]) ul.appendChild(el('li', null, t));
  d.appendChild(ul);
  return d;
}

// 시험용 — 지금 그린 것의 줄 (헤드리스 확인)
export function stockViewState() {
  const st = stockNow();
  return { open: ui.open, started: !!st, day: st ? st.day : 0, orders: st ? st.orders.length : 0, held: st ? ASSETS.filter((a) => sharesOf(st, a.id)).length : 0, value: st ? holdValue(st) : 0, reserved: st ? reserved(st) : 0, msg: ui.msg };
}
