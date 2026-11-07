// 🎣 학습 낚시터 — 앱에 잇기 (v366 · 2026-10-30 아버님 기본안 「물고기 16종 · 나머지 이대로」 → 장면 시안 「이대로」)
// 홈 화면 과목 카드 위 띠(🎒 대여행 띠 아래) → 저수지 창(fishview) · 규칙은 fishing.js · 그림은 fishart.js
// 문제: 🎒 대여행과 같은 「이미 배운 문제」 원천(journeyview.loadSources — 수학 ✅ 다 배운 개념 · 영어 뜻을 맞혀 본 단어 · 국어 배운 낱말 · 논술 해 본 주제)
//   · 과목마다 그날 차례(날·과목으로 섞은 줄)에서 그날 낸 수만큼 넘긴 자리 — 창을 다시 열어도 같은 문제가 처음부터 되풀이되지 않게
//   · 문제 하나하나는 안 적는다(대여행·배틀과 같다) — 과목마다 낸 수·맞힌 수만 그날 기록(daily fish…Q/Ok · 📤 🎣 줄)
// 과목 몫: 지난 7일(오늘 빼고) 과목 화면 시간·논술 한 날로 — 덜 한 과목이 더 자주(한 과목 10~50%) · 아이 화면엔 안 보임
// 하루 20분(⚙ 분 · 🔒 오늘 +10분): daily fishSec(병합 큰 쪽) · 다 쓰면 홈 띠가 「내일 또 와요」 — 남은 분 같은 셈은 아이 화면에 안 씀
// 도감·💰: xp.lakeCatch(저장된 프로필로 한 트랜잭션 — 별 하나에 💰1 · 새 종·🏅 월척 +5 · 하루 40)
// ★ 낚시 시간은 ⏳ 과목 시간·🎮 게임 판에 안 들어간다(홈 위에 뜬 창 — 과목 화면이 아님)
// v367 (2단계 기본안 「이대로」): 🌦️ 그날 날씨(fishing.weatherOf — 날짜로) · 📖 도감 창(낚시터 위 · 오늘 낚시가 끝난 날엔 홈 띠 「📖 도감」) ·
//   🐟 물고기 수학(fishmath.js — 수학 차례의 반쯤 · 배운 수학 개념이 없으면 전부 · 서로 다른 물고기 두 종 이상부터 · 기록은 수학 칸 + fishFmQ/fishFmOk)
// v368 (2단계 ② 원고 「이대로」): 🏞️ 강(저수지 도감 10종이면 열림 · 🗺️ 물가 · 마지막 물가에서 시작 · fishing.pick) · 🎒 채비 가게(xp.lakeBuy — 가방 items) ·
//   🐛 미끼 칩·🎣 낚싯대 색(xp.lakePick) · 강에서 낚은 마리 daily fishRiver(fishCatch 안의 몫)
// v369 (2단계 ③ 원고 「추천대로」): 🌊 바다 방파제(강 도감 6종이면 열림 · host.seaOpen · gearState.sea) · 바다에서 낚은 마리 daily fishSea
// v371 (아버님 「낚시하다가도 셀을 낚게 — 2% 정도」 → 기본안 「추천대로」): 🟢 지가르데 셀 — host.cellOk(zygarde.zygCanFish) · onCell(keepCell → xp.zygFind('fish')) ·
//   낚시 셀은 하루 하나(공부 끝 화면 셀 하루 3과 따로) · 📖 도감·💰·그날 낚은 마리에는 안 든다 · 시험용 `?nosw=1&cell=1`이면 입질마다 셀
// v378 (난이도 기본안 「추천대로」): 창이 문제마다 단계(fishing.stageLevel)를 넘긴다 → ask(subj, seed, lv) → 원천 make(key, seed, lv)(lakelevel.js 꼴 · 못 만들면 1단계 꼴) ·
//   🔶 영어 3단계(소리만)는 영어 목소리가 있는 기기에서만(lvFor) · 2·3단계로 낸 문제는 그날 fishLv2/3Q·Ok에도 · 시험용 `?nosw=1&star=5`면 입질마다 그 별
// v386 (진우 제안 → 기본안 「추천대로」 · 원고·시안 「이대로」): 🚤 배 낚시(바다 도감 6종이면 열림 · host.boatOpen · gearState.boat) · 배에서 낚은 마리 daily fishBoat ·
//   홈 띠 「○○에 가 볼까요?」는 마지막 물가가 배여도 🌬️ 바람 부는 날이면 바다
// v387 (낚시터 문제 손보기 기본안 「추천대로」): 🔁 다시 풀기 — redoPlan(지난 낚시 날·오늘 기록) → redoQueue → redoAsker가 물고기마다 첫 수학 차례에 같은 칸 문제 ·
//   답은 fishRedoKeys·fishRedoQ/Ok에 · 🎚️ 과목 단계 — subjectSteps로 그날 처음 열 때 정해 fishSteps에 적고 창에 steps·stepUp(오른 과목)을 넘긴다
// v392 (📐 다지기 기본안 「추천대로」): 🐟 물고기 수학 차례에 📐 다지기 문제 하루 세 번까지 — 연 때 수학 장부로 unitTurn · 답하면 mathprog.unitFishCommit(일지 한 줄 + 단계)
import { openLake, isLakeOpen, openDexView, isDexOpen } from './fishview.js';
import { SUBJECTS, doneOf, subjectShares, dayLeftSec, FISH_DAY_Q, FISH_DAY_MIN, FISH_FM_Q, FISH_LV_Q, FISH_REDO_Q, FISH_RIVER, FISH_SEA, FISH_BOAT, fishMathKey, redoKey, redoPlan, redoQueue, qFingerprint, waitKey, subjectSteps, stepLines, okOfDay, WEATHER, weatherOf, dexRows, pickOf, riverOpen, seaOpen, boatOpen, boatRest, GEAR, hasGear, PLACE_KO } from './fishing.js';
import { fishMathQ, fishMathReady } from './fishmath.js';
import { UNIT_DRILL, unitStage, unitFishToday, unitFishCommit, answerSecOf } from './mathprog.js';
import { lvFor } from './lakelevel.js';
import { orderOf } from './journey.js';
import { lakeCatch, lakeBuy, lakePick, lakeRaw, getProfileSnapshot, getPartner, getLook, nonsulDayMap, profileReady, profileLoading, onProfileReload, zygMap, zygFind } from './xp.js';
import { zygCanFish, FISH_SRC } from './zygarde.js';
import { revealNote } from './zygview.js';
import { listDaily, getDaily, applyDailyDelta, getMath, updateMath } from './db.js';
import { avatarOf } from './avatar.js';
import { loadCharacters, characterUrl, artUrl, ensureArt } from './pokemon.js';
import { clockDay, limitConf } from './timelimit.js';

let cardBox = null;
const ui = { busy: false, src: null };

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
const nz = (v) => Math.max(0, Math.floor(Number(v) || 0));

/** ⚙ 하루 낚시 분 (부모 설정 — timeLimitConf().fishMin · 비면 20) */
export function fishMinNow() {
  const c = (typeof limitConf === 'function' && limitConf()) || {};
  const m = Math.floor(Number(c.fishMin));
  return Number.isFinite(m) && m > 0 ? Math.min(120, m) : FISH_DAY_MIN;
}
/** 오늘 남은 낚시 초 (그날 기록으로) */
export function lakeLeft(daily) {
  return dayLeftSec(nz(daily && daily.fishSec), fishMinNow(), nz(daily && daily.fishBonus));
}

// ───────────── 홈 띠 ─────────────

/** 홈 화면 띠 — box는 index.html #home-lake (홈을 그릴 때마다 부른다) */
export async function mountLakeCard(box) {
  cardBox = box || cardBox;
  const b = cardBox;
  if (!b) return;
  if (profileLoading()) { b.hidden = true; profileReady().then(() => mountLakeCard(b)).catch(() => {}); return; }
  let d = null;
  try { d = await getDaily(clockDay()); } catch { d = null; }
  const left = lakeLeft(d);
  b.innerHTML = '';
  const done = left <= 0;
  const card = el(done ? 'div' : 'button', `lk-home${done ? ' is-closed' : ''}`);
  if (!done) { card.type = 'button'; card.addEventListener('click', () => { openLakeNow().catch(() => {}); }); }
  card.appendChild(el('span', 'lk-home-art', '🎣'));
  const body = el('span', 'lk-home-body');
  body.appendChild(el('b', 'lk-home-title', '학습 낚시터')); // 🎣는 왼쪽 그림 칸에
  const last = pickOf(getProfileSnapshot()).place;
  const where = PLACE_KO[last === 'boat' && boatRest(weatherOf(clockDay()).key) ? 'sea' : last] || PLACE_KO.lake; // 마지막에 간 물가 (v368) · 🌬️ 배가 쉬는 날은 바다 (v386)
  body.appendChild(el('span', 'lk-home-sub', done ? '오늘 낚시는 끝 — 내일 또 와요' : nz(d && d.fishSec) ? '물고기가 기다려요 — 이어서 낚아요' : `${where}에 가 볼까요? 맞힐수록 큰 물고기!`));
  card.appendChild(body);
  // 오늘 낚시가 끝난 날에도 📖 도감은 볼 수 있다 (한 마리라도 낚았으면 · 🏞️ 강 칸은 열린 뒤에만 — v368)
  const caught = dexRows(lakeRaw()).some((r) => r.caught);
  if (done && caught) {
    const dx = el('button', 'lk-home-dex', '📖 도감');
    dx.type = 'button';
    dx.addEventListener('click', () => openLakeDex());
    card.appendChild(dx);
  }
  // 🐠 아쿠아리움 (v399) — 한 마리라도 낚았으면 낚시가 끝난 날에도 들어간다 · 띠 옆 단추(띠가 단추라 안에 못 넣는다)
  const row = el('div', 'lk-home-row');
  row.appendChild(card);
  if (caught) {
    const aq = el('button', 'lk-home-aq');
    aq.type = 'button';
    aq.appendChild(el('b', '', '🐠'));
    aq.appendChild(el('span', '', '아쿠아리움'));
    aq.addEventListener('click', () => { openAquaNow().catch(() => {}); });
    row.appendChild(aq);
  }
  b.appendChild(row);
  b.hidden = false;
}
onProfileReload(() => { if (cardBox && !isLakeOpen()) mountLakeCard(cardBox).catch(() => {}); });
/** 🐠 아쿠아리움 열기 (v399) — 그림 코드는 들어갈 때 받는다 · onClose는 낚시터가 시계를 되돌릴 때 */
export async function openAquaNow(onClose) {
  const m = await import('./aquaview.js');
  m.openAqua({ onClose });
}
/** 📖 도감 창만 (홈 띠에서) */
export function openLakeDex() {
  if (isDexOpen()) return;
  openDexView(dexRows(lakeRaw()));
}

// ───────────── 창 열기 ─────────────

/** 지난 7일 → 그날 과목 몫 (낼 문제가 있는 과목만) */
export function sharesOf(days, nsDayMap, today, avail) {
  const nsDays = Object.keys(nsDayMap || {}).filter((k) => Number(k) > 0).map((k) => new Date(Number(k) * 86400000).toISOString().slice(0, 10));
  return subjectShares(doneOf(days, nsDays, today), avail);
}
/**
 * 그 과목의 다음 문제 — 그날 차례(날·과목으로 섞은 줄)의 at 자리부터 (journey.orderOf와 같은 줄 만들기) → { q, step }
 * step = 실제로 본 자리 수(못 만든 자리까지) — 부르는 쪽이 at을 그만큼 넘긴다(Codex 170차 — 못 만든 자리를 안 넘겨 같은 문제가 두 번 나오거나 그 과목이 영영 빠지던 것) · 12자리까지 보고 못 만들면 q는 null
 * lv = 단계(v378 — 원천 make가 그 단계 꼴을 만들고, 못 만들면 1단계 꼴 · 🎒 대여행은 lv 없이 부른다)
 */
export function askFrom(src, subj, today, at, seed, lv = 1) {
  if (!src || !Array.isArray(src.keys) || !src.keys.length) return { q: null, step: 0 };
  const keys = orderOf(src.keys, `lake:${today}`, subj);
  const look = Math.min(keys.length, 12);
  for (let t = 0; t < look; t++) {
    let q = null;
    try { q = src.make(keys[(nz(at) + t) % keys.length], (seed + t * 7919) >>> 0, lv); } catch { q = null; }
    if (q && Array.isArray(q.choices) && q.choices.length >= 2 && q.choices.filter((c) => c.ok).length === 1) return { q, step: t + 1 };
  }
  return { q: null, step: look };
}
/**
 * 창을 열 때 과목마다 「배운 문제」 차례 자리 — 그날 낸 수에서 시작 · 수학은 그 가운데 🐟 물고기 수학·🔁 다시 풀기(v387)로 낸 수를 뺀다
 * (Codex 171차 — 물고기 수학까지 세면 다시 열 때 배운 문제 차례가 그만큼 더 넘어갔다 · 다시 풀기도 차례 줄 밖에서 낸다)
 */
export function startOf(d) {
  return Object.fromEntries(SUBJECTS.map((s) => [s, Math.max(0, nz(d && d[FISH_DAY_Q[s][0]]) - (s === 'math' ? nz(d && d[FISH_FM_Q[0]]) + nz(d && d[FISH_REDO_Q[0]]) : 0))]));
}
/**
 * 🔁 다시 풀기 문제 만들기 (v387) — 같은 칸·같은 단계로 씨앗만 바꿔 · 틀린 그 문제 글의 지문(avoid = qFingerprint)과 같으면 다음 씨앗 · 6번 안에 못 만들면 null
 * → 문제 + redo { id, step } (창이 카드 머리를 바꾸고, 답이 오면 fishRedoKeys에 적는다)
 */
export function redoMake(src, r, seed) {
  if (!src || typeof src.make !== 'function' || !r || !r.id) return null;
  for (let t = 0; t < 6; t++) {
    let q = null;
    try { q = src.make(r.id, ((Number(seed) || 0) + 104729 + t * 7919) >>> 0, r.lv || 1); } catch { q = null; }
    if (!q || !Array.isArray(q.choices) || q.choices.length < 2 || q.choices.filter((c) => c.ok).length !== 1) continue;
    if (r.avoid && qFingerprint(q.qk) === r.avoid) continue;
    return { ...q, redo: { id: r.id, step: r.step } };
  }
  return null;
}
/**
 * 창이 쓰는 문제 내기에 🔁 다시 풀기를 끼움 (v387) — base(subj, seed, lv) · mathSrc = 「이미 배운 수학」 원천 · rq = redoQueue
 * ctx.fish(지금 물고기 번호)를 rq에 알리고, 수학 차례면 그 물고기의 첫 수학 차례에 한 번 다시 풀기 · 못 만들면 보통 문제 ·
 * alive()가 거짓이면(창을 연 뒤 자정이 지남 — Codex 190차 #5) 다시 풀기 없이 보통 문제만 (새 날 계획은 다시 열 때)
 */
export function redoAsker(base, mathSrc, rq, alive = () => true) {
  return (subj, seed, lv = 1, ctx = {}) => {
    if (rq && ctx && ctx.fish !== undefined) rq.at(ctx.fish);
    if (subj === 'math' && rq && mathSrc && alive()) {
      const r = rq.take();
      const q = r ? redoMake(mathSrc, r, seed) : null;
      if (q) return q;
    }
    return base(subj, seed, lv);
  };
}
/** 창이 쓰는 문제 내기 (subj, seed, lv) → 문제 | null — 과목마다 자리(start = startOf)에서 askFrom이 본 만큼(못 만든 자리까지) 넘긴다 */
export function asker(srcs, day, start) {
  const at = { ...(start || {}) };
  return (subj, seed, lv = 1) => {
    const r = askFrom(srcs && srcs[subj], subj, day, nz(at[subj]), seed, lv);
    at[subj] = nz(at[subj]) + r.step;
    return r.q;
  };
}
/**
 * 하루 기록 쓰기 차례 — 하나씩 차례로(겹쳐 보내 두 번 세지 않게) · 못 쓴 증분은 남겨 두었다 다음에 함께(Codex 170차 — 한 번 실패하면 그 시간이 빠지던 것) ·
 * 날은 쓰는 순간의 날(자정을 넘기면 오늘 칸에 — 💰와 같은 날) · write(date, delta) · dayFn() · flush()는 지금까지 보낸 것이 끝날 때
 */
export function dailyQueue(write, dayFn, retryMs = 4000) {
  const pend = {};
  let chain = Promise.resolve();
  let retry = 0;
  const run = async () => {
    const keys = Object.keys(pend);
    if (!keys.length) return;
    const out = {};
    for (const k of keys) { out[k] = pend[k]; delete pend[k]; }
    try { await write(dayFn(), out); } catch {
      for (const k of keys) pend[k] = (pend[k] || 0) + out[k];
      if (!retry && retryMs > 0) retry = setTimeout(() => { retry = 0; flush(); }, retryMs);
    }
  };
  const flush = () => { chain = chain.then(run, run); return chain; };
  const put = (delta) => {
    for (const [k, v] of Object.entries(delta || {})) { const n = nz(v); if (n) pend[k] = (pend[k] || 0) + n; }
    return flush();
  };
  return { put, flush, pending: () => ({ ...pend }) };
}
/**
 * 수학 차례에 🐟 물고기 수학 섞기 (v367) — base(subj, seed) = 「이미 배운 문제」 asker · fm(seed, avoid) → 물고기 수학 문제 | null
 * 수학이면 번갈아(배운 문제 → 물고기 → 배운 문제 …) — 반쯤 · 한쪽이 못 내면 다른 쪽(배운 수학 개념이 없으면 물고기 수학만) · 수학이 아니면 base 그대로
 * 물고기 수학은 바로 앞과 다른 꼴부터 · lv(v378 단계)는 양쪽에 그대로 넘긴다
 */
export function mathMix(base, fm) {
  let turn = 0;
  let last = '';
  return (subj, seed, lv = 1) => {
    if (subj !== 'math') return base(subj, seed, lv);
    const fish = () => { const q = fm(seed, last, lv); if (q) last = q.kind || ''; return q; };
    return turn++ % 2 === 1 ? fish() || base(subj, seed, lv) : base(subj, seed, lv) || fish();
  };
}
/**
 * 📐 다지기 차례 (v392) — 창을 연 때의 수학 장부 m으로 (못 읽었으면 다지기 없이) · now() = fishMathQ의 ud · answered() 답 하나 · kept(m) 저장된 새 장부 ·
 * alive()가 거짓이면(자정을 넘김) 그날 몫을 모르니 내지 않는다
 */
export function unitTurn(m, today, alive = () => true) {
  let stage = m ? unitStage(m) : 0;
  let left = Math.max(0, UNIT_DRILL.fishDay - unitFishToday(m, today));
  return {
    now: () => ({ stage, ask: left > 0 && alive() }),
    answered: () => { left = Math.max(0, left - 1); },
    kept: (next) => { stage = unitStage(next); },
  };
}
/** 🔊 영어 목소리가 있는 기기인가 (v378 영어 3단계 — 소리만 듣는 문제) · 목소리 목록이 아직 안 왔거나 못 읽으면 false(2단계로) */
export function canListen() {
  try {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
    return window.speechSynthesis.getVoices().some((v) => /^en/i.test(String(v && v.lang)));
  } catch { return false; }
}
/** 그날 단계별 칸 증분 (v378) — 2·3단계로 실제 낸 문제만 · 1단계·단계 모름은 {} */
export function lvDelta(q, ok) {
  const f = q && Object.prototype.hasOwnProperty.call(FISH_LV_Q, q.lv) ? FISH_LV_Q[q.lv] : null;
  return f ? { [f[0]]: 1, [f[1]]: ok ? 1 : 0 } : {};
}
const svgNS = 'http://www.w3.org/2000/svg';
function sv(tag, attrs, text) {
  const e = document.createElementNS(svgNS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  if (text !== undefined) e.textContent = text;
  return e;
}
/** 📊 물고기 수학 막대그래프 (SVG) — 눈금 한 칸 = chart.unit마리 · 칸마다 글자(칸이 많으면 두 칸마다) */
function fmChart(chart) {
  const bars = chart.bars;
  const unit = chart.unit || 1;
  const ticks = Math.ceil(Math.max(...bars.map((b) => b.v)) / unit) + 1;
  const W = 300;
  const H = 200;
  const x0 = 40;
  const y0 = 164;
  const yTop = 18;
  const step = (y0 - yTop) / ticks;
  const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, class: 'lk-chart', role: 'img', 'aria-label': `막대그래프 — ${bars.map((b) => `${b.ko} ${b.v}마리`).join(', ')}` });
  svg.appendChild(sv('text', { x: 4, y: 12, class: 'lk-chart-axis' }, '(마리)'));
  for (let t = 0; t <= ticks; t++) {
    const y = y0 - t * step;
    const lab = ticks <= 12 || t % 2 === 0;
    svg.appendChild(sv('line', { x1: x0, y1: y, x2: W - 8, y2: y, class: lab ? 'lk-chart-grid is-major' : 'lk-chart-grid' }));
    if (lab) svg.appendChild(sv('text', { x: x0 - 6, y: y + 4, 'text-anchor': 'end', class: 'lk-chart-axis' }, String(t * unit)));
  }
  const slot = (W - 8 - x0) / bars.length;
  bars.forEach((b, i) => {
    const bw = Math.min(46, slot * 0.55);
    const x = x0 + slot * i + (slot - bw) / 2;
    const h = (b.v / unit) * step;
    svg.appendChild(sv('rect', { x, y: y0 - h, width: bw, height: h, rx: 3, class: 'lk-chart-bar' }));
    svg.appendChild(sv('text', { x: x + bw / 2, y: y0 + 18, 'text-anchor': 'middle', class: 'lk-chart-name' }, b.ko));
  });
  svg.appendChild(sv('line', { x1: x0, y1: y0, x2: W - 8, y2: y0, class: 'lk-chart-base' }));
  return svg;
}
/** 🐟 물고기 수학 카드 몸통 — 📖 도감 기록 칩 · 물음 · 막대그래프 (💡 도움말은 카드의 tip 줄) */
function fmNode(q) {
  const box = el('div', 'lk-fm');
  if (q.facts && q.facts.length) {
    const fs = el('div', 'lk-fm-facts');
    for (const f of q.facts) fs.appendChild(el('span', 'lk-fm-fact', `📖 ${f}`));
    box.appendChild(fs);
  }
  if (q.chart) box.appendChild(fmChart(q.chart));
  box.appendChild(el('div', '', q.text));
  return box;
}
/** 🐟 한 마리를 도감에 — 저장된 뒤에만 그날 낚은 마리 +1(강이면 fishRiver · 바다면 fishSea · 배면 fishBoat도) · 못 적으면 { ok:false }(화면이 「🔁 다시 적기」) · seaOpened = 🌊 바다가 열렸다(v369) · opened = 🏞️ 강이 열렸다(v368) · boatOpened = 🚤 배 낚시가 열렸다(v386) */
export async function keepCatch(f, put, catchFn = lakeCatch) {
  let r = null;
  try { r = await catchFn({ key: f.key, cm: f.cm }); } catch { r = null; }
  if (!r || !r.ok) return { ok: false, why: (r && r.why) || 'save' };
  put({ fishCatch: 1, ...(f.place === 'river' ? { [FISH_RIVER]: 1 } : {}), ...(f.place === 'sea' ? { [FISH_SEA]: 1 } : {}), ...(f.place === 'boat' ? { [FISH_BOAT]: 1 } : {}) });
  return { ok: true, first: !!r.first, best: !!r.best, coins: nz(r.coins), ...(r.opened ? { opened: true } : {}), ...(r.seaOpened ? { seaOpened: true } : {}), ...(r.boatOpened ? { boatOpened: true } : {}) };
}
/**
 * 🟢 낚은 지가르데 셀을 큐브에 (v371) — xp.zygFind('fish') 한 트랜잭션(두 창이 같이 낚아도 하루 하나) ·
 * → { ok, found, cells, note? } · 못 넣었으면 { ok:false, why } (why 'save'면 화면이 🔁 · 'day'·'full'이면 셀이 물속으로) · 그날 낚은 마리(fishCatch)에는 안 셈
 */
export async function keepCell(findFn = zygFind, noteFn = revealNote) {
  let r = null;
  try { r = await findFn(FISH_SRC); } catch { r = null; }
  if (!r || !r.ok) return { ok: false, why: (r && r.why) || 'save' };
  let note = null;
  try { note = r.ev ? noteFn(r) : null; } catch { note = null; }
  return { ok: true, found: r.found === 'core' ? 'core' : 'cell', cells: nz(r.cells), ...(note ? { note } : {}) };
}
/** 시험용 `?nosw=1&star=5` — 입질마다 그 별 물고기 (v378 · nosw 없이는 안 먹는다 · 없으면 0) */
function testStar() {
  try {
    const s = String((typeof location !== 'undefined' && location.search) || '');
    const m = /[?&]star=([1-5])\b/.exec(s);
    return /[?&]nosw=1/.test(s) && m ? Number(m[1]) : 0;
  } catch { return 0; }
}
/** 시험용 `?nosw=1&cell=1` — 입질마다 셀 (v371 · nosw 없이는 안 먹는다) */
function testCellOdds() {
  try {
    const s = String((typeof location !== 'undefined' && location.search) || '');
    return /[?&]nosw=1/.test(s) && /[?&]cell=1\b/.test(s) ? 1 : undefined;
  } catch { return undefined; }
}
/** 🎒 채비 가게 상태 (그리기용 · 지금 프로필) — { coins, owned: { id: true }, pick, made, river, sea, boat } · river·sea·boat = 🏞️ 강·🌊 바다·🚤 배가 열렸나(다른 창에서 열려도 · Codex 172차 · v369 · v386) */
export function gearState(p = getProfileSnapshot()) {
  return {
    coins: nz(p && p.coins),
    owned: Object.fromEntries(GEAR.map((g) => [g.id, hasGear(p, g.id)])),
    pick: pickOf(p),
    made: !!avatarOf(p).made,
    river: riverOpen(p && p.fishing),
    sea: seaOpen(p && p.fishing),
    boat: boatOpen(p && p.fishing),
  };
}

function say(word) {
  try {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(word);
    u.lang = 'en-US';
    u.rate = 0.85;
    window.speechSynthesis.speak(u);
  } catch { /* 소리 없이 */ }
}
/** 파트너 그림 — 🌈 이로치·🟢 지가르데 모습이 먼저 (홈 화면 파트너와 같은 규칙) · 아직 안 받은 그림이면 받아 온다(못 받으면 파트너 없이) */
async function partnerUrl() {
  const id = getPartner();
  if (!id) return null;
  const look = getLook(id);
  const have = (look && (look.formUrl || look.shinyUrl)) || characterUrl(id) || artUrl(id);
  if (have) return have;
  try { return (await ensureArt(id)) || null; } catch { return null; }
}

/** 헤드리스 시험용 날씨 — `?nosw=1&wx=rain`일 때만 (🎒 대여행 devQ·낚시터 __lakeQ와 같은 꼴 · 보통 주소에선 늘 null) */
function testWeather() {
  try {
    const s = location.search;
    if (!/[?&]nosw=1/.test(s)) return null;
    const m = /[?&]wx=(sun|cloud|rain|wind)\b/.exec(s);
    return m ? WEATHER.find((w) => w.key === m[1]) || null : null;
  } catch { return null; }
}
/** 🎣 낚시터 열기 — 문제 원천·지난 7일·오늘 기록을 읽고 창을 띄운다 */
export async function openLakeNow() {
  if (ui.busy || isLakeOpen()) return;
  ui.busy = true;
  const sub = cardBox && cardBox.querySelector('.lk-home-sub');
  if (sub) sub.textContent = '낚시 가방을 싸는 중…';
  try {
    await profileReady();
    const [{ loadSources }] = await Promise.all([import('./journeyview.js'), loadCharacters().catch(() => null)]);
    ui.src = await loadSources();
    const today = clockDay();
    let days = [];
    try { days = await listDaily(); } catch { days = []; }
    const d = days.find((x) => x && x.date === today) || null;
    // 수학은 「이미 배운 개념」이 없어도 🐟 물고기 수학(서로 다른 물고기 두 종 이상)이 있으면 낸다
    const fmOk = fishMathReady(lakeRaw());
    const avail = SUBJECTS.filter((s) => (ui.src && ui.src[s]) || (s === 'math' && fmOk));
    if (!avail.length) {
      if (sub) sub.textContent = '아직 낚시터에서 낼 문제가 없어요 — 공부를 조금 더 하고 와요';
      return;
    }
    const start = startOf(d); // 과목마다 배운 문제 차례 자리 — 그날 낸 수에서 (수학은 물고기 수학 수를 빼고)
    let sentSec = nz(d && d.fishSec); // 쓰기 차례에 넘긴 낚시 초(창이 센 오늘 합)
    const firstToday = !sentSec;
    const day = today; // 문제 차례 줄은 연 날로 · 기록은 쓰는 순간의 날로(dailyQueue)
    const log = dailyQueue(applyDailyDelta, clockDay);
    const rq = redoQueue(redoPlan(days, today)); // 🔁 지난 낚시 날 몫 → 오늘 앞 창에서 틀린 칸 (v387)
    const alive = () => clockDay() === today; // 창을 연 뒤 자정이 지나면 다시 풀기를 멈춤 (Codex 190차 #5 — 새 날 계획은 다시 열 때)
    const stp = subjectSteps(days, today); // 🎚️ 오늘 과목 단계 — 처음 연 때만 적는다 (v387)
    if (stp.write.length) applyDailyDelta(today, { fishSteps: stp.write }).catch(() => {});
    let stepDay = today; // 자정을 넘겨 답하면 새 날에도 지금 단계를 한 번 적는다 (#5)
    const ut = unitTurn(await getMath().catch(() => null), today, alive); // 📐 다지기 (v392)
    const pk = pickOf(getProfileSnapshot());
    openLake({
      look: avatarOf(getProfileSnapshot()).look,
      partnerUrl: await partnerUrl(),
      place: pk.place, // 🏞️ 마지막에 간 물가 (v368)
      riverOpen: riverOpen(lakeRaw()),
      seaOpen: seaOpen(lakeRaw()), // 🌊 (v369)
      boatOpen: boatOpen(lakeRaw()), // 🚤 (v386)
      pick: pk,
      gear: () => gearState(),
      aqua: (done) => { openAquaNow(done).catch(() => { done(); }); },
      buyGear: (id) => lakeBuy(id),
      onPick: (want) => lakePick(want),
      lookNow: () => avatarOf(getProfileSnapshot()).look, // 낚시 모자·조끼를 산 뒤 새 차림
      shares: sharesOf(days, nonsulDayMap(), today, avail),
      steps: stp.steps, // 🎚️ 과목 단계 (v387 — 창이 물고기 단계에 더한다)
      stepUp: stp.up, // 오늘 오른 과목 — 열 때 한 줄
      ask: (() => {
        const inner = mathMix(asker(ui.src, day, start), (seed, avoid, lv) => {
          const q = fishMathQ(lakeRaw(), seed, avoid, lv, ut.now());
          return q ? { ...q, qNode: () => fmNode(q) } : null;
        });
        // 🔶 소리만 문제는 영어 목소리가 있을 때만 (v378) · 🔁 물고기마다 첫 수학 차례에 다시 풀기 (v387)
        return redoAsker((subj, seed, lv) => inner(subj, seed, lvFor(subj, lv, { listen: canListen() })), ui.src && ui.src.math, rq, alive);
      })(),
      forceStar: testStar(),
      weather: testWeather() || weatherOf(today),
      dexRows: () => dexRows(lakeRaw()),
      say,
      usedSec: sentSec,
      dayNow: clockDay, // 창을 켜 둔 채 날이 바뀌면 새날 시간으로 (v394)
      onNewDay: () => { sentSec = 0; },
      dayMin: fishMinNow(),
      bonusMin: nz(d && d.fishBonus),
      okToday: okOfDay(d),
      firstToday,
      onAnswer: (subj, ok, stage, q, a) => {
        const now = clockDay();
        if (now !== stepDay) { stepDay = now; applyDailyDelta(now, { fishSteps: stepLines(stp.steps) }).catch(() => {}); } // 🎚️ 자정 뒤 새 날에도 (#5)
        if (q && q.ud) { // 📐 다지기 (v392)
          ut.answered();
          updateMath((m) => { unitFishCommit(m, { ok, lv: q.ud, tag: a && a.trap, s: a ? answerSecOf(a.at, Date.now()) : null }, now); }).then(ut.kept).catch(() => {});
        }
        const redo = q && q.redo && alive() ? q.redo : null; // 자정 뒤에 답한 다시 풀기는 보통 답으로 — 새 날 차례를 꼬지 않게 (#5)
        const f = FISH_DAY_Q[subj];
        const rd = redo ? { [FISH_REDO_Q[0]]: 1, [FISH_REDO_Q[1]]: ok ? 1 : 0 } : {}; // 🔁 (v387 — 수학 칸 안의 몫)
        if (f) log.put({ [f[0]]: 1, [f[1]]: ok ? 1 : 0, ...(q && q.fm ? { [FISH_FM_Q[0]]: 1, [FISH_FM_Q[1]]: ok ? 1 : 0 } : {}), ...lvDelta(q, ok), ...rd });
        const mk = subj === 'math' && q && !q.fm ? fishMathKey(q.id, ok, Date.now(), Math.random) : ''; // 🔢 배운 칸 문제는 칸별로도 (v377)
        const rk = subj === 'math' && redo ? redoKey(redo.id, redo.step, ok, Date.now(), Math.random) : '';
        // 틀린 배운 칸은 그 문제의 단계·글 지문도 — 다시 열거나 다음 날에도 같은 단계·다른 문제로 (Codex 190차 #2)
        const cm = !ok && subj === 'math' && q && !q.fm && !q.redo ? /^m:([A-Za-z0-9_.-]{1,40})$/.exec(String(q.id || '')) : null;
        const fp = cm ? qFingerprint(q.qk) : '';
        const wk = cm ? waitKey(cm[1], q.lv, fp, Date.now(), Math.random) : '';
        // 칸별 줄·다시 풀기 줄·틀린 칸 줄은 한 번에 — 하나만 적히면 다음 창이 그 칸을 또 다시 풀기로 낸다
        if (mk || rk || wk) applyDailyDelta(now, { ...(mk ? { fishMathKeys: [mk] } : {}), ...(rk ? { fishRedoKeys: [rk] } : {}), ...(wk ? { fishRedoWait: [wk] } : {}) }).catch(() => {});
        if (cm && alive()) rq.wrong(cm[1], q.lv, fp); // 틀린 배운 칸 → 다음 물고기에 한 번 (v387)
      },
      onTime: (sec) => {
        const n = nz(sec);
        if (n <= sentSec) return;
        log.put({ fishSec: n - sentSec });
        sentSec = n;
      },
      onCatch: (f) => keepCatch(f, log.put),
      cellOk: () => zygCanFish(zygMap(), Date.now()), // 🟢 오늘 낚시 셀을 찾을 수 있나 (v371)
      cellOdds: testCellOdds(),
      onCell: () => keepCell(),
      onClose: () => { log.flush().then(() => mountLakeCard(cardBox)).catch(() => {}); },
    });
  } finally {
    ui.busy = false;
  }
}

/** 🔒 오늘 +10분 (⚙ 설정 — 비밀번호 뒤) → 새 오늘 기록 */
export async function grantLakeTime() {
  const d = await applyDailyDelta(clockDay(), { fishBonus: 10 });
  if (cardBox && !isLakeOpen()) mountLakeCard(cardBox).catch(() => {});
  return d;
}
/** ⚙ 아래 한 줄 (부모만 봄) — 오늘 낚시 분 · 물고기 · 과목마다 맞힘/낸 문제 */
export async function lakeTodayLine(minutes) {
  let d = null;
  try { d = await getDaily(clockDay()); } catch { d = null; }
  const m = Math.floor(Number(minutes));
  const total = (Number.isFinite(m) && m > 0 ? Math.min(120, m) : FISH_DAY_MIN) + nz(d && d.fishBonus);
  const KO = { math: '수학', english: '영어', korean: '국어', nonsul: '논술' };
  const q = SUBJECTS.map((s) => `${KO[s]} ${nz(d && d[FISH_DAY_Q[s][1]])}/${nz(d && d[FISH_DAY_Q[s][0]])}`).join(' · ');
  return `오늘 — 낚시 ${Math.floor(nz(d && d.fishSec) / 60)}분 / ${total}분${nz(d && d.fishBonus) ? ` (🔒 +${nz(d.fishBonus)})` : ''} · 물고기 ${nz(d && d.fishCatch)}마리 · 맞힘/낸 문제 ${q}`;
}
