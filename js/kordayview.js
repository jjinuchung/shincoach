// 🔥 국어·논술 연속 학습 · ✨ 오늘의 보너스 · 🔤 낱말 이어 주기 — 주기와 끝 화면 조각 (v329, 2026-10-24 아버님 "이대로")
// 규칙은 korday.js(🔥·✨) · kormatch.js(🔤) · mathbonus.subjectBonus — 여기는 하루 몫 선점(claimDailyCount) → 주기(⚡ korGainXp · 💰 gainCoins · 가방 addItem)
// 주기는 수학 ✨·영어 🔥와 같은 길: 하루 몫은 트랜잭션으로 한 번만 잡고, 준 것은 메모리 프로필 + 증분 저장(xp.js)
import { claimDailyCount, releaseDailyCount, listDaily, getDaily } from './db.js';
import { todayKey } from './track.js';
import { gainCoins, addItem, streakBonus, matchXp, XP, getProfileSnapshot, haveCount, getLook, korDoneMap, korMatchMap, korMatchMark } from './xp.js';
import { streakCoins, matchCoins, COIN } from './items.js';
import { subjectBonus } from './mathbonus.js';
import { korGainXp } from './korxp.js';
import { KOR_DAY, bonusField, korStreakBefore, profileKorDays } from './korday.js';
import { KOR_MATCH, korMatchPool, pickKorMatch } from './kormatch.js';
import { allWords } from './korwords.js';
import { openMatch, closeMatch, refreshStage, shuffle } from './match.js';
import { animUrl, ensureAnims } from './sprite.js';
import { loadCharacters } from './pokemon.js';
import { guardStart } from './timeup.js';

/**
 * 그 과목을 끝냈다 — 🔥(국어·논술 합쳐 그날 처음) · ✨(그 과목 그날 처음)을 선점하고 준다 → { streak: {days, xp, coin}|null, bonus: 보너스|null }
 * 국어 글은 읽은 기록 줄이 새로 생겼을 때(res.newRead — [다시 저장하기]는 아님) · 논술은 판을 저장했을 때(⭐ 연습 포함) 부른다
 * ★ 화면이 바뀌었어도 준다(받은 몫은 이미 잡았다) — 그리기만 부르는 쪽이 본다
 * @param {'korean'|'nonsul'} kind
 */
export async function korDayDone(kind) {
  const today = todayKey();
  const out = { streak: null, bonus: null };
  let xp = 0;
  // 🔥 — 어제까지 이어 온 날은 하루 기록 + 프로필에 남은 읽은 날(하루 기록에 국어 칸이 생기기 전 날들까지)
  //   ★ 지난 기록을 **먼저** 읽는다 — 못 읽으면 이번엔 선점하지 않는다(빈 기록으로 보고 "첫날"로 확정하면 고칠 길이 없다, 🔍 Codex 133차 #2) · 다음 끝냄에 다시
  try {
    const list = await listDaily();
    if (!Array.isArray(list)) throw new Error('list');
    if ((await claimDailyCount(today, KOR_DAY.streak, 1)).won) {
      const days = korStreakBefore(list, today, safe(() => profileKorDays(getProfileSnapshot()), [])) + 1;
      const sx = streakBonus(days);
      const sc = safe(() => gainCoins(streakCoins(days)).gained, 0);
      xp += sx;
      out.streak = { days, xp: sx, coin: sc };
    }
  } catch { /* 못 읽었거나 저장이 막혔다 — 이번엔 줄이 없다(선점도 안 됐다) · 다음 끝냄에 다시 */ }
  // ✨ — 홈 카드가 미리 보여 준 바로 그것 · 선점한 뒤 주는 것은 하나씩 따로(하나가 실패해도 나머지는 준다, 🔍 Codex 133차 #1)
  try {
    const field = bonusField(kind);
    if (field && (await claimDailyCount(today, field, 1)).won) {
      const b = subjectBonus(today, kind);
      if (b) {
        const gv = b.give || {};
        if (gv.xp) xp += gv.xp;
        if (gv.coin) safe(() => gainCoins(gv.coin));
        if (gv.item) safe(() => addItem(gv.item, gv.n || 1));
        out.bonus = b;
      }
    }
  } catch { /* 저장이 막혔다 — 선점이 안 됐으니 다음 끝냄에 다시 */ }
  if (xp > 0) safe(() => korGainXp(xp)); // 한 번에 — 레벨 업 알림이 두 번 뜨지 않게
  return out;
}

/** 실패해도 나머지를 이어 가게 — 던지면 fallback */
function safe(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}

// ───────────── 🔤 낱말 이어 주기 ─────────────

const W = { data: null };
/** words.json — apart 무리(📖 낱말끼리 같이 안 낼 것)만 쓴다 · 한 번 받아 두고 계속 */
async function wordsData() {
  if (!W.data) {
    const res = await fetch('./coach/korean/words.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    W.data = await res.json();
  }
  return W.data;
}

/** 무대에서 춤출 포켓몬 — 데리고 있는 것 셋(없으면 피카츄) · 🌈 이로치는 정지 그림(도트 GIF는 일반 색) — player.stageMons와 같은 꼴 */
function stageMons(chars) {
  const ids = Object.keys(getProfileSnapshot().caught || {}).map(Number).filter((id) => id > 0 && haveCount(id) > 0);
  return shuffle(ids.length ? ids : [25]).slice(0, 3).map((id) => {
    const c = (chars || []).find((x) => x && x.id === id);
    const look = getLook(id);
    if (look && look.shiny) return { id, ko: c ? c.ko : '', art: look.shinyUrl || (c && c.url) || '', anim: null };
    return { id, ko: c ? c.ko : '', art: (c && c.url) || '', anim: animUrl(id) };
  });
}

/**
 * 국어 글 끝 화면에 🔤 단추를 낼까 — 오늘 판이 남았고 아직 이어 보지 않은 낱말이 need개 모였으면 { items, ids, mons } · 아니면 null
 * @param {Array} cards 국어 글 카드(reading.json — 📖 낱말이 words에)
 */
export async function korMatchOffer(cards) {
  let d = null;
  try { d = await getDaily(todayKey()); } catch { return null; }
  if ((Number(d && d[KOR_DAY.match]) || 0) >= KOR_MATCH.perDay) return null;
  let data = null;
  try { data = await wordsData(); } catch { return null; }
  const round = pickKorMatch(korMatchPool(allWords({ apart: data && data.apart }, cards), korDoneMap(), korMatchMap()));
  if (!round) return null;
  let chars = [];
  try { chars = (await loadCharacters()) || []; } catch { chars = []; }
  return { ...round, mons: stageMons(chars) };
}

/**
 * 🔤 다 이었다 — 하루 몫 선점 → 그 낱말 표시(프로필 한 트랜잭션) → ⚡💰 → {xp, coin} | null
 *   ★ 하루 몫을 **먼저** 잡는다 — 낱말을 먼저 표시하고 몫 저장이 실패하면, 보여 준 ⚡💰를 못 받고 그 낱말도 다시 안 나왔다(🔍 Codex 133차 #1)
 *   · 오늘 판을 다 씀(다른 창) → 낱말만 표시 · null
 *   · 다른 창이 같은 판을 먼저 끝냄(새로 표시한 것 0) → 잡은 몫을 돌려주고 null
 *   · 몫 저장·표시가 막혀도 아이 잘못은 아니다 → 준다(영어와 같다 · 표시가 안 됐으면 그 낱말은 다음에 또 나온다)
 * @param {string[]} ids 이번 판 낱말 · @param {number} wrong 틀린 수
 */
export async function settleKorMatch(ids, wrong) {
  const today = todayKey();
  let claim = null; // null = 저장이 막힘
  try { claim = await claimDailyCount(today, KOR_DAY.match, KOR_MATCH.perDay); } catch { claim = null; }
  let n = -1;
  try { const r = await korMatchMark(ids); n = r && r.ok ? r.n : -1; } catch { n = -1; }
  if (claim && !claim.won) return null;
  if (n === 0) {
    if (claim) { try { await releaseDailyCount(today, KOR_DAY.match); } catch { /* 못 돌려줌 — 그날 한 판이 줄 뿐 */ } }
    return null;
  }
  const xp = matchXp(wrong);
  safe(() => korGainXp(xp));
  return { xp, coin: safe(() => gainCoins(matchCoins(wrong)).gained, 0) };
}

/**
 * 판 열기 — 다 이으면 settleKorMatch → after({xp, coin} | null) · 열지 못하면 false
 *   null = 받을 몫이 없었다(다른 창이 같은 판을 먼저 끝냈거나 오늘 판을 다 씀) — 끝 화면은 "다 이었어요"만
 *   뒤 화면 inert는 판이 **어떻게 닫히든**(계속하기·다른 판으로 바뀜·영어 화면이 접음) 원래대로 (🔍 Codex 133차 #4 — match.onClose)
 * @param {{items:Array, ids:string[], mons:Array}} round korMatchOffer · @param {string} viewId 판 동안 뒤를 막을 화면
 */
export function openKorMatch(round, viewId, after) {
  const view = document.getElementById(viewId);
  const was = view ? view.inert : false;
  const restore = () => { if (view) view.inert = was; };
  if (view) view.inert = true;
  let token;
  try {
    token = openMatch({
      items: round.items,
      mons: round.mons,
      kind: 'kor',
      reward: XP.match.map((xp, i) => ({ xp, coin: COIN.match[i] })), // 받을 것을 게임 화면에서 바로(영어와 같은 계단)
      onClose: restore,
      onDone: (result) => {
        settleKorMatch(round.ids, result && result.wrong).then((rw) => after(rw), () => after(null));
      },
    });
  } catch {
    restore();
    try { closeMatch(); } catch { /* 이미 닫힘 */ }
    return false;
  }
  // 늦게 받은 도트 그림은 무대만 다시 (게임 진행은 건드리지 않는다)
  const mons = round.mons || [];
  const shiny = (id) => { const l = getLook(id); return !!(l && l.shiny); };
  ensureAnims(mons.map((m) => m.id))
    .then(() => refreshStage(mons.map((m) => (shiny(m.id) ? m : { ...m, anim: animUrl(m.id) })), token))
    .catch(() => {});
  return true;
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/**
 * 끝 화면의 🔤 조각 — 단추 하나(셈 문구 없음) · 다 이었으면 한 줄
 * @param {{round:object, used?:boolean, done?:object|null}} m 끝 화면 상태(부르는 쪽이 들고 있다)
 * @param {{viewId:string, live:() => boolean, busy:() => boolean, redraw:() => void}} ctx live = 이 끝 화면이 아직 떠 있나 · busy = 다른 창(🎯·⚔️·🚀)을 여는 중인가
 */
export function korMatchEl(m, ctx) {
  const box = el('div', 'kor-match-offer');
  if (m.done !== undefined) {
    const rw = m.done;
    box.appendChild(el('p', 'kor-done-line kor-match-done', rw ? `🔤 낱말을 다 이었어요! ⚡+${rw.xp} 💰+${rw.coin}` : '🔤 낱말을 다 이었어요!'));
    return box;
  }
  box.appendChild(el('p', 'kor-match-line', '📖 글에서 만난 낱말을 이어 볼까요?'));
  const b = el('button', 'btn btn-primary kor-match-btn', '🔤 낱말 이어 주기');
  b.type = 'button';
  b.disabled = !!m.used;
  b.addEventListener('click', () => {
    if (m.used || !ctx.live() || ctx.busy()) return;
    guardStart('korean', () => {
      if (m.used || !ctx.live() || ctx.busy()) return;
      m.used = true;
      b.disabled = true;
      if (!openKorMatch(m.round, ctx.viewId, (rw) => { m.done = rw; ctx.redraw(); })) { m.used = false; b.disabled = false; } // 못 열었으면 다시 누를 수 있게
    });
  });
  box.appendChild(b);
  return box;
}
