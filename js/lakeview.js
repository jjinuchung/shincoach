// 🎣 학습 낚시터 — 앱에 잇기 (v366 · 2026-10-30 아버님 기본안 「물고기 16종 · 나머지 이대로」 → 장면 시안 「이대로」)
// 홈 화면 과목 카드 위 띠(🎒 대여행 띠 아래) → 저수지 창(fishview) · 규칙은 fishing.js · 그림은 fishart.js
// 문제: 🎒 대여행과 같은 「이미 배운 문제」 원천(journeyview.loadSources — 수학 ✅ 다 배운 개념 · 영어 뜻을 맞혀 본 단어 · 국어 배운 낱말 · 논술 해 본 주제)
//   · 과목마다 그날 차례(날·과목으로 섞은 줄)에서 그날 낸 수만큼 넘긴 자리 — 창을 다시 열어도 같은 문제가 처음부터 되풀이되지 않게
//   · 문제 하나하나는 안 적는다(대여행·배틀과 같다) — 과목마다 낸 수·맞힌 수만 그날 기록(daily fish…Q/Ok · 📤 🎣 줄)
// 과목 몫: 지난 7일(오늘 빼고) 과목 화면 시간·논술 한 날로 — 덜 한 과목이 더 자주(한 과목 10~50%) · 아이 화면엔 안 보임
// 하루 20분(⚙ 분 · 🔒 오늘 +10분): daily fishSec(병합 큰 쪽) · 다 쓰면 홈 띠가 「내일 또 와요」 — 남은 분 같은 셈은 아이 화면에 안 씀
// 도감·💰: xp.lakeCatch(저장된 프로필로 한 트랜잭션 — 별 하나에 💰1 · 새 종·🏅 월척 +5 · 하루 40)
// ★ 낚시 시간은 ⏳ 과목 시간·🎮 게임 판에 안 들어간다(홈 위에 뜬 창 — 과목 화면이 아님)
import { openLake, isLakeOpen } from './fishview.js';
import { SUBJECTS, doneOf, subjectShares, dayLeftSec, FISH_DAY_Q, FISH_DAY_MIN, okOfDay } from './fishing.js';
import { orderOf } from './journey.js';
import { lakeCatch, getProfileSnapshot, getPartner, getLook, nonsulDayMap, profileReady, profileLoading, onProfileReload } from './xp.js';
import { listDaily, getDaily, applyDailyDelta } from './db.js';
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
  body.appendChild(el('span', 'lk-home-sub', done ? '오늘 낚시는 끝 — 내일 또 와요' : nz(d && d.fishSec) ? '물고기가 기다려요 — 이어서 낚아요' : '저수지에 가 볼까요? 맞힐수록 큰 물고기!'));
  card.appendChild(body);
  b.appendChild(card);
  b.hidden = false;
}
onProfileReload(() => { if (cardBox && !isLakeOpen()) mountLakeCard(cardBox).catch(() => {}); });

// ───────────── 창 열기 ─────────────

/** 지난 7일 → 그날 과목 몫 (낼 문제가 있는 과목만) */
export function sharesOf(days, nsDayMap, today, avail) {
  const nsDays = Object.keys(nsDayMap || {}).filter((k) => Number(k) > 0).map((k) => new Date(Number(k) * 86400000).toISOString().slice(0, 10));
  return subjectShares(doneOf(days, nsDays, today), avail);
}
/**
 * 그 과목의 다음 문제 — 그날 차례(날·과목으로 섞은 줄)의 at 자리부터 (journey.orderOf와 같은 줄 만들기) → { q, step }
 * step = 실제로 본 자리 수(못 만든 자리까지) — 부르는 쪽이 at을 그만큼 넘긴다(Codex 170차 — 못 만든 자리를 안 넘겨 같은 문제가 두 번 나오거나 그 과목이 영영 빠지던 것) · 12자리까지 보고 못 만들면 q는 null
 */
export function askFrom(src, subj, today, at, seed) {
  if (!src || !Array.isArray(src.keys) || !src.keys.length) return { q: null, step: 0 };
  const keys = orderOf(src.keys, `lake:${today}`, subj);
  const look = Math.min(keys.length, 12);
  for (let t = 0; t < look; t++) {
    let q = null;
    try { q = src.make(keys[(nz(at) + t) % keys.length], (seed + t * 7919) >>> 0); } catch { q = null; }
    if (q && Array.isArray(q.choices) && q.choices.length >= 2 && q.choices.filter((c) => c.ok).length === 1) return { q, step: t + 1 };
  }
  return { q: null, step: look };
}
/** 창이 쓰는 문제 내기 (subj, seed) → 문제 | null — 과목마다 자리(start = 그날 낸 수)에서 askFrom이 본 만큼(못 만든 자리까지) 넘긴다 */
export function asker(srcs, day, start) {
  const at = { ...(start || {}) };
  return (subj, seed) => {
    const r = askFrom(srcs && srcs[subj], subj, day, nz(at[subj]), seed);
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
/** 🐟 한 마리를 도감에 — 저장된 뒤에만 그날 낚은 마리 +1 · 못 적으면 { ok:false }(화면이 「🔁 다시 적기」) */
export async function keepCatch(f, put, catchFn = lakeCatch) {
  let r = null;
  try { r = await catchFn({ key: f.key, cm: f.cm }); } catch { r = null; }
  if (!r || !r.ok) return { ok: false, why: (r && r.why) || 'save' };
  put({ fishCatch: 1 });
  return { ok: true, first: !!r.first, best: !!r.best, coins: nz(r.coins) };
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
    const avail = SUBJECTS.filter((s) => ui.src && ui.src[s]);
    if (!avail.length) {
      if (sub) sub.textContent = '아직 낚시터에서 낼 문제가 없어요 — 공부를 조금 더 하고 와요';
      return;
    }
    const start = Object.fromEntries(SUBJECTS.map((s) => [s, nz(d && d[FISH_DAY_Q[s][0]])])); // 과목마다 차례 자리 — 그날 낸 수에서 시작
    let sentSec = nz(d && d.fishSec); // 쓰기 차례에 넘긴 낚시 초(창이 센 오늘 합)
    const firstToday = !sentSec;
    const day = today; // 문제 차례 줄은 연 날로 · 기록은 쓰는 순간의 날로(dailyQueue)
    const log = dailyQueue(applyDailyDelta, clockDay);
    openLake({
      look: avatarOf(getProfileSnapshot()).look,
      partnerUrl: await partnerUrl(),
      shares: sharesOf(days, nonsulDayMap(), today, avail),
      ask: asker(ui.src, day, start),
      say,
      usedSec: sentSec,
      dayMin: fishMinNow(),
      bonusMin: nz(d && d.fishBonus),
      okToday: okOfDay(d),
      firstToday,
      onAnswer: (subj, ok) => {
        const f = FISH_DAY_Q[subj];
        if (f) log.put({ [f[0]]: 1, [f[1]]: ok ? 1 : 0 });
      },
      onTime: (sec) => {
        const n = nz(sec);
        if (n <= sentSec) return;
        log.put({ fishSec: n - sentSec });
        sentSec = n;
      },
      onCatch: (f) => keepCatch(f, log.put),
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
