// ⏳ 시간 제한 화면 — 남은 시간 칩 + "오늘은 여기까지" 잠금 + 🔒 부모가 시간 더 주기 (2026-09-27)
//   + ⏳ 시간 연장권 (2026-10-01, 진우 요청 → 아버님 "이대로 진행"): 아이가 🛒에서 산 것으로 15분 더.
//     잠금 화면과 칩(누르면 같은 창)에서 쓴다. 버튼은 잠겼거나 10분 안 남았을 때만 — 일찍 눌러 낭비하지 않게.
//
// 규칙은 timelimit.js(순수), 이 파일은 보여 주기만 한다.
// ★ requirePin은 **주입받는다** — player.js를 직접 import하면 player.js ↔ timeup.js 고리가 생긴다.

import {
  status, isLocked, grantMinutes, currentSubject, isExempt, GRANT_MIN, KO, fmtLeft, fmtUsed,
  extendPlan, extMax, clockDay, adoptDaily, ensureToday, FIELD, EXTEND_MIN, WARN_SEC,
} from './timelimit.js';
import { itemCount, useExtend } from './xp.js';
import { extenderOf, priceText } from './items.js';
import { openShop } from './shop.js';
import { sfx, unlock } from './sfx.js';

const $ = (id) => document.getElementById(id);

let askPin = null;      // (onOk) => void — app.js가 player.requirePin을 끼워 준다
let closeCb = null;
let grantSubject = null;
let retryFn = null;     // 잠금 때문에 못 한 것 (guardStart의 fn) — 연장권을 쓰면 "계속하기"로 이어서 한다
let extending = false;  // 연장권 저장 중 (두 번 눌러 두 개 쓰지 않게)
let openSeq = 0;        // 창을 열고 닫을 때마다 +1 — 느린 저장이 끝났을 때 그 사이 다른 창이 열렸는지 본다

/** 칩 네 개 (🔢 수학 / 🎬 목록 / ▶ 플레이어 / 📚 국어) */
const CHIPS = [
  { id: 'time-chip-math', subject: 'math' },
  { id: 'time-chip-korean', subject: 'korean' },
  { id: 'time-chip-library', subject: 'english' },
  { id: 'time-chip-player', subject: 'english' },
];

export function initTimeUp({ requirePin } = {}) {
  askPin = typeof requirePin === 'function' ? requirePin : null;
  const ok = $('timeup-ok');
  if (ok) ok.addEventListener('click', closeTimeUp);
  const ask = $('timeup-ask');
  if (ask) {
    ask.addEventListener('click', () => {
      if (!askPin) return;
      askPin(() => showGrant());
    });
  }
  // ⏳ 칩을 누르면 남은 시간과 연장권 — 같은 창을 연다 (잠겼으면 잠금 화면 그대로)
  for (const c of CHIPS) {
    const el = $(c.id);
    if (el) el.addEventListener('click', () => openTimeUp(c.subject));
  }
  const eb = $('timeup-extend-btn');
  if (eb) eb.addEventListener('click', () => { doExtend().catch(() => {}); });
  const shop = $('timeup-shop');
  if (shop) shop.addEventListener('click', () => { retryFn = null; closeTimeUp(); openShop(); });
}

/** 위쪽 막대의 남은 시간 칩을 새로 그린다 (1초마다 불린다 — 싸게) */
export function refreshChips() {
  for (const c of CHIPS) {
    const el = $(c.id);
    if (!el) continue;
    const st = status(c.subject);
    if (!st || st.off) { el.hidden = true; continue; }
    el.hidden = false;
    // 🎯 도전 문제처럼 제한 밖인 것을 푸는 동안은 멈춰 있다 — 그걸 칩에도 보여 준다(고장으로 오해하지 않게)
    const paused = isExempt();
    el.classList.toggle('warn', !!st.warn && !paused);
    el.classList.toggle('over', !!st.locked && !paused);
    el.classList.toggle('paused', paused);
    const text = paused ? `⏸ ${fmtLeft(st.left)}` : (st.locked ? '⏳ 오늘 끝' : `${st.warn ? '⏰' : '⏳'} ${fmtLeft(st.left)}`);
    if (el.textContent !== text) el.textContent = text;
  }
}

/**
 * 새로 시작하기 전에 부른다 — 시간이 남았으면 fn을 그대로 돌리고, 다 썼으면 잠금 화면을 연다.
 * ★ 이미 하던 것(풀던 회차·보던 영상)은 이 관문을 지나지 않는다 — 아버님 결정 ②("하던 것만 끝내고 잠금")
 * @returns {boolean} 시작했는가
 */
export function guardStart(subject, fn) {
  if (isLocked(subject)) { openTimeUp(subject, { retry: fn }); return false; }
  if (typeof fn === 'function') fn();
  return true;
}

/**
 * ⏳ "오늘은 여기까지" — onClose는 닫을 때 한 번 (보통 사다리·목록으로 되돌리기).
 * 아직 안 잠겼으면(칩을 눌렀을 때) 남은 시간을 보여 준다. 어느 쪽이든 ⏳ 연장권 칸이 같이 나온다.
 * @param {{onClose?:Function, retry?:Function}} [o] retry: 잠금 때문에 못 한 것 — 연장권을 쓰면 "계속하기"로 이어서
 */
export function openTimeUp(subject, o = {}) {
  const box = $('timeup');
  if (!box) return;
  const s = subject || currentSubject() || 'math';
  openSeq += 1;
  grantSubject = s;
  closeCb = typeof o.onClose === 'function' ? o.onClose : null;
  retryFn = typeof o.retry === 'function' ? o.retry : null;
  const st = status(s);
  const name = KO[s] || '';
  const locked = !st || st.locked;
  const ok = $('timeup-ok');
  if (locked) {
    $('timeup-title').textContent = `⏳ 오늘 ${name}은 여기까지!`;
    $('timeup-text').textContent = st
      ? `오늘 ${fmtUsed(st.used)} 했어요. 푹 쉬고 내일 또 만나요 👋`
      : '오늘은 여기까지예요. 내일 또 만나요 👋';
    $('timeup-sub').textContent = '🎒 도감이랑 🛒 상점은 그대로 볼 수 있어요.';
    if (ok) ok.textContent = '알겠어요 👋';
  } else {
    $('timeup-title').textContent = `⏳ 오늘 ${name} ${fmtLeft(st.left)} 남았어요`;
    $('timeup-text').textContent = `오늘 ${fmtUsed(st.used)} 했어요${st.extN ? ` · ⏳ 연장권 ${st.extN}개 썼어요` : ''}.`;
    $('timeup-sub').textContent = isExempt() ? '⏸ 🎯 도전 문제를 푸는 동안은 시간이 안 줄어요.' : '';
    if (ok) ok.textContent = '계속하기 ▶';
  }
  renderExtend(s, st);
  const g = $('timeup-grant');
  if (g) { g.hidden = true; }              // 비밀번호를 맞히기 전엔 감춘다
  const ask = $('timeup-ask');
  if (ask) ask.hidden = !askPin;
  box.hidden = false;
}

/** ⏳ 연장권 칸 — 쓸 수 있으면 버튼, 아니면 왜 못 쓰는지 한 줄 (부모가 꺼 뒀거나 제한이 꺼졌으면 칸째 숨김) */
function renderExtend(s, st) {
  const box = $('timeup-extend');
  if (!box) return;
  const btn = $('timeup-extend-btn');
  const note = $('timeup-extend-note');
  const shop = $('timeup-shop');
  const it = extenderOf(s);
  const have = it ? itemCount(it.id) : 0;
  const max = extMax();
  const plan = extendPlan(st, { have, max });
  if (!it || plan.why === 'off' || plan.why === 'disabled') { box.hidden = true; return; }
  box.hidden = false;
  btn.hidden = !plan.can;
  btn.disabled = extending;
  btn.textContent = `⏳ 연장권 쓰기 — ${EXTEND_MIN}분 더 (가방에 ${have}개)`;
  shop.hidden = plan.why !== 'none';
  note.textContent = {
    ok: `오늘 ${KO[s]} 연장권은 ${plan.room}개 더 쓸 수 있어요.`,
    cap: `오늘 ${KO[s]} 연장권은 다 썼어요 (하루 ${max}개) — 내일 또 쓸 수 있어요.`,
    none: `🛒 상점에서 ⏳ ${it.ko} 연장권을 사면 더 할 수 있어요 (${priceText(it)}).`,
    early: `⏳ 연장권은 ${Math.round(WARN_SEC / 60)}분 안 남았을 때부터 쓸 수 있어요 (가방에 ${have}개).`,
  }[plan.why] || '';
}

/** ⏳ 연장권 쓰기 — 가방에서 하나 + 오늘 그 과목 +15분 (한 트랜잭션). 되면 "계속하기"로 하려던 것을 이어서 */
async function doExtend() {
  const s = grantSubject || currentSubject() || 'math';
  const it = extenderOf(s);
  if (!it || extending) return;
  // 이 창의 과목·이어서 할 것을 지금 붙잡는다 — 저장을 기다리는 사이 창을 닫고 다른 과목 칸을 누르면
  // 그 창의 retry가 들어와, 시간을 받지 못한(아직 잠긴) 과목이 "계속하기"로 시작됐다 (Codex 21차 #5)
  const seq = openSeq;
  const retry = retryFn;
  extending = true;
  $('timeup-extend-btn').disabled = true;
  let r = null;
  try {
    await ensureToday(); // 자정을 넘겼으면 오늘 기록으로 — 어제 기록에 쓰면 가방에서만 빠진다 (Codex 21차 #4)
    const st0 = status(s);
    if (extendPlan(st0, { have: itemCount(it.id), max: extMax() }).can) r = await useExtend(s, clockDay(), FIELD[s].ext, extMax());
  } finally {
    extending = false;
  }
  const box = $('timeup');
  const here = seq === openSeq && box && !box.hidden;
  if (r && r.ok) {
    adoptDaily(r.daily);
    refreshChips();
    document.dispatchEvent(new CustomEvent('shincoach:profilechange', { detail: { id: null } })); // 🎒 가방 수가 바뀌었다
  }
  if (!here) { // 그 사이 다른 창이 열렸다 — 그 창의 연장권 칸만 새로 그린다 (그 창의 글·이어 할 것은 건드리지 않는다)
    if (box && !box.hidden && grantSubject) renderExtend(grantSubject, status(grantSubject));
    return;
  }
  if (!r || !r.ok) {
    renderExtend(s, status(s));
    if (r && r.why === 'save') $('timeup-extend-note').textContent = '앗, 저장을 못 했어요 — 한 번 더 눌러 봐요.';
    return;
  }
  unlock();
  sfx.ding();
  const st = status(s);
  $('timeup-title').textContent = `⏳ ${EXTEND_MIN}분 더!`;
  $('timeup-text').textContent = `오늘 ${KO[s]} ${fmtLeft(st ? st.left : EXTEND_MIN * 60)} 남았어요. 힘내요 💪`;
  $('timeup-sub').textContent = '';
  $('timeup-extend').hidden = true;
  const g = $('timeup-grant');
  if (g) g.hidden = true;
  const ok = $('timeup-ok');
  if (ok) ok.textContent = '계속하기 ▶';
  // 잠금 때문에 못 한 것(사다리 칸 누르기·영상 열기 등)을 "계속하기"로 이어서 — 그 과목이 정말 풀렸을 때만
  closeCb = retry ? () => { if (!isLocked(s)) retry(); } : null;
  retryFn = null;
}

export function closeTimeUp() {
  const box = $('timeup');
  if (!box || box.hidden) return;
  box.hidden = true;
  openSeq += 1;
  const g = $('timeup-grant');
  if (g) g.hidden = true;
  retryFn = null;
  const f = closeCb;
  closeCb = null;
  if (typeof f === 'function') f();
}

/** 🔒 비밀번호를 맞혔다 — +10 / +20 / +30분 버튼을 보여 준다 */
function showGrant() {
  const g = $('timeup-grant');
  if (!g) return;
  const s = grantSubject || currentSubject() || 'math';
  $('timeup-grant-subject').textContent = KO[s] || '';
  const box = $('timeup-grant-btns');
  box.innerHTML = '';
  for (const min of GRANT_MIN) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-primary';
    b.textContent = `+${min}분`;
    b.addEventListener('click', async () => {
      for (const x of box.querySelectorAll('button')) x.disabled = true; // 두 번 눌러 두 배로 주는 것 막기
      try {
        await grantMinutes(s, min);
      } finally {
        refreshChips();
        closeTimeUp();
      }
    });
    box.appendChild(b);
  }
  g.hidden = false;
}
