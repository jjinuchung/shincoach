// ⏳ 시간 제한 화면 — 남은 시간 칩 + "오늘은 여기까지" 잠금 + 🔒 부모가 시간 더 주기 (2026-09-27)
//
// 규칙은 timelimit.js(순수), 이 파일은 보여 주기만 한다.
// ★ requirePin은 **주입받는다** — player.js를 직접 import하면 player.js ↔ timeup.js 고리가 생긴다.

import { status, isLocked, grantMinutes, currentSubject, GRANT_MIN, KO, fmtLeft, fmtUsed } from './timelimit.js';

const $ = (id) => document.getElementById(id);

let askPin = null;      // (onOk) => void — app.js가 player.requirePin을 끼워 준다
let closeCb = null;
let grantSubject = null;

/** 칩 세 개 (🔢 수학 / 🎬 목록 / ▶ 플레이어) */
const CHIPS = [
  { id: 'time-chip-math', subject: 'math' },
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
}

/** 위쪽 막대의 남은 시간 칩을 새로 그린다 (1초마다 불린다 — 싸게) */
export function refreshChips() {
  for (const c of CHIPS) {
    const el = $(c.id);
    if (!el) continue;
    const st = status(c.subject);
    if (!st || st.off) { el.hidden = true; continue; }
    el.hidden = false;
    el.classList.toggle('warn', !!st.warn);
    el.classList.toggle('over', !!st.locked);
    const text = st.locked ? '⏳ 오늘 끝' : `${st.warn ? '⏰' : '⏳'} ${fmtLeft(st.left)}`;
    if (el.textContent !== text) el.textContent = text;
  }
}

/**
 * 새로 시작하기 전에 부른다 — 시간이 남았으면 fn을 그대로 돌리고, 다 썼으면 잠금 화면을 연다.
 * ★ 이미 하던 것(풀던 회차·보던 영상)은 이 관문을 지나지 않는다 — 아버님 결정 ②("하던 것만 끝내고 잠금")
 * @returns {boolean} 시작했는가
 */
export function guardStart(subject, fn) {
  if (isLocked(subject)) { openTimeUp(subject); return false; }
  if (typeof fn === 'function') fn();
  return true;
}

/** ⏳ "오늘은 여기까지" — onClose는 닫을 때 한 번 (보통 사다리·목록으로 되돌리기) */
export function openTimeUp(subject, o = {}) {
  const box = $('timeup');
  if (!box) return;
  const s = subject || currentSubject() || 'math';
  grantSubject = s;
  closeCb = typeof o.onClose === 'function' ? o.onClose : null;
  const st = status(s);
  const name = KO[s] || '';
  $('timeup-title').textContent = `⏳ 오늘 ${name}은 여기까지!`;
  $('timeup-text').textContent = st
    ? `오늘 ${fmtUsed(st.used)} 했어요. 푹 쉬고 내일 또 만나요 👋`
    : '오늘은 여기까지예요. 내일 또 만나요 👋';
  $('timeup-sub').textContent = '🎒 도감이랑 🛒 상점은 그대로 볼 수 있어요.';
  const g = $('timeup-grant');
  if (g) { g.hidden = true; }              // 비밀번호를 맞히기 전엔 감춘다
  const ask = $('timeup-ask');
  if (ask) ask.hidden = !askPin;
  box.hidden = false;
}

export function closeTimeUp() {
  const box = $('timeup');
  if (!box || box.hidden) return;
  box.hidden = true;
  const g = $('timeup-grant');
  if (g) g.hidden = true;
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
