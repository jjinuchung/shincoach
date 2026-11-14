// 🆕 새 버전 받기 (v425 — 아버님 「추천대로」: 「새로고침이 있는지 첫 화면에서 크게 · 진행률도 · 아이가 돌아다니는 중에도
//   크게 창을 띄우되 하던 게 있으면 취소할 수 있게 · 대기 중이라는 걸 화면 한쪽에 작게」)
//  · 받는 중이면 🏠 홈 띠에 「⬇️ 새 버전 받는 중 ▓▓░ 45%」 + 오른쪽 아래 딱지 「⬇️ 45%」 (서비스워커가 파일을 받으며 알린다 — sw.js · 지금 받는 판의 알림만)
//  · 다 받으면 어느 화면이든 큰 창 [지금 바꾸기] [나중에] — 나중에면 딱지 「🆕 새 버전 대기 중」(누르면 창이 다시) · 홈 띠에도
//  · 「지금 바꾸기」는 저장이 다 됐을 때만 다시 켠다(두 번 저장 · 안 됐으면 멈추고 「저장이 안 됐어요」 · Codex 228차)
//  · 새 판은 다 받아도 **기다린다** — 「지금 바꾸기」(저장을 마치고 다시 켬)나 앱을 완전히 닫았다 열 때만 넘겨받는다.
//    전엔 받자마자 넘겨받아, 돌던 옛 코드가 새 화면을 열 때 새 판 조각을 섞어 썼다(Codex가 여러 번 짚은 「옛 창」 문제의 뿌리)
//  · 켜 둔 채로도 30분마다 · 앱으로 돌아올 때(5분에 한 번까지) 새 판을 확인한다 — 전엔 앱을 열 때만 확인해서 켜 두기만 하면 몰랐다
//  · ⚙ 설정에 「앱 판 vNNN · 최신이에요」 줄과 「🔄 새 버전 확인」
//  · 순수한 부분(updReduce·updPct·updLine)은 시험이 바로 부른다 · 화면 모듈은 아무것도 import하지 않는다(저장 마무리는 app.js가 넘겨줌)
import { APP_VERSION } from './version.js';

export const CHECK_EVERY = 30 * 60 * 1000;
export const CHECK_GAP = 5 * 60 * 1000;
/** 「지금 바꾸기」 뒤 새 판이 넘겨받지 않아도 이만큼 지나면 다시 켠다 */
export const RELOAD_WAIT = 5000;
/** 「지금 바꾸기」 저장을 두 번 — 누른 그 순간 이미 저장 중이던 것(⏳ 초·🎹 그날 기록)이 끝나도록 그 사이 이만큼 기다린다 (Codex 228차 P2-2) */
export const SETTLE_MS = 400;

/** 상태 — phase: 'none'(없음) | 'getting'(받는 중) | 'ready'(다 받음) · later: 「나중에」를 눌렀나 · reloadOnly: 다른 창이 이미 바꿨다(다시 켜기만) */
export const UPD0 = Object.freeze({ phase: 'none', done: 0, total: 0, later: false, reloadOnly: false });

const cnt = (v) => Math.max(0, Math.floor(Number(v) || 0));

/** 상태 바꾸기 (순수) — ev.type: 'getting' | 'progress'{done,total} | 'ready'{reloadOnly} | 'failed' | 'later' */
export function updReduce(s, ev) {
  const t = ev && ev.type;
  if (t === 'getting') return s.phase === 'ready' ? s : { ...s, phase: 'getting', done: 0, total: 0 };
  if (t === 'progress') {
    // 받는 중일 때만 — 다 받은 뒤·받다 실패한 뒤 늦게 온 알림이 「받는 중」을 다시 띄우지 않게 (Codex 228차 P2-4)
    if (s.phase !== 'getting') return s;
    const total = cnt(ev.total);
    return { ...s, phase: 'getting', total, done: Math.min(cnt(ev.done), total) };
  }
  if (t === 'ready') return { ...s, phase: 'ready', done: s.total, reloadOnly: s.reloadOnly || !!ev.reloadOnly };
  if (t === 'failed') return s.phase === 'getting' ? { ...UPD0 } : s; // 받다 끊김 — 다음 확인 때 다시
  if (t === 'later') return s.phase === 'ready' ? { ...s, later: true } : s;
  return s;
}

/** 받은 비율 0~100 (모르면 0) */
export function updPct(s) {
  return s && s.total > 0 ? Math.min(100, Math.floor((s.done / s.total) * 100)) : 0;
}

/** ⚙ 설정 한 줄 (순수) */
export function updLine(s, ver = APP_VERSION) {
  if (s.phase === 'getting') return `앱 판 ${ver} · ⬇️ 새 버전 받는 중 ${updPct(s)}%`;
  if (s.phase === 'ready') return `앱 판 ${ver} · ✅ 새 버전 준비됐어요 — 「지금 바꾸기」를 누르면 바뀌어요`;
  return `앱 판 ${ver} · 최신이에요`;
}

// ───────────── 화면 ─────────────
let state = { ...UPD0 };
let reg = null;
let opts = { flush: async () => {} };
let applying = false; // 「지금 바꾸기」를 누른 뒤(저장 중 포함) — 두 번 누름을 막는다
let saved = false; // 그 저장이 다 됐나 — 다 되기 전엔 넘겨받혀도 다시 켜지 않는다 (Codex 228차 P1)
let changed = false; // 저장하는 사이 넘겨받혔나(다른 창이 먼저 바꿈) — 저장이 끝나면 바로 다시 켠다
let failNote = false; // 저장이 안 돼서 멈췄다 — 창에 그 말을
let reloading = false;
let tracked = null; // 지금 받는 새 판 — % 알림은 이 판의 것만 (Codex 228차 P2-4)
let lastCheck = 0;
const $ = (id) => document.getElementById(id);

function dispatch(ev) {
  const was = state.phase;
  state = updReduce(state, ev);
  // 다 받은 그때 한 번만 큰 창 — 「나중에」 뒤엔 저절로 다시 안 띄운다(다 받은 상태는 되돌아가지 않으니 딱지·홈 띠·⚙로)
  if (state.phase === 'ready' && was !== 'ready') openDlg();
  render();
}

function reloadOnce() {
  if (reloading) return;
  reloading = true;
  location.reload();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const setNowBtns = (busy) => { for (const b of document.querySelectorAll('.upd-now-btn')) { b.disabled = busy; b.textContent = busy ? '저장하는 중…' : '지금 바꾸기'; } };

/**
 * 「지금 바꾸기」 — 하던 기록을 저장하고(두 번 · 사이에 잠깐), **저장이 다 됐을 때만** 기다리던 새 판에 넘겨받으라고 한 뒤 다시 켠다.
 * 저장이 안 됐으면 멈추고 「저장이 안 됐어요」(다시 누르면 다시) · 저장하는 사이 다른 창이 먼저 바꿨으면 저장이 끝난 뒤 다시 켠다 (Codex 228차 P1·P2-1·P2-2)
 */
async function applyNow() {
  if (applying) return;
  applying = true;
  failNote = false;
  setNowBtns(true);
  let ok = false;
  try {
    await opts.flush();
    await sleep(SETTLE_MS);
    ok = (await opts.flush()) !== false;
  } catch { ok = false; }
  if (!ok) {
    applying = false;
    failNote = true;
    setNowBtns(false);
    const d = $('upd-dlg');
    if (d && d.open) setDlgMsg(); else openDlg();
    return;
  }
  saved = true;
  const w = reg && reg.waiting;
  if (changed || !w || state.reloadOnly) { reloadOnce(); return; }
  setTimeout(reloadOnce, RELOAD_WAIT); // 넘겨받기 알림이 늦어도 · 말을 보내다 오류가 나도 단추가 멈춰 있지 않게 먼저
  try { w.postMessage({ type: 'skip-waiting' }); } catch { reloadOnce(); }
}

function setDlgMsg() {
  $('upd-dlg-msg').textContent = failNote
    ? '저장이 안 됐어요 — 잠시 뒤 「지금 바꾸기」를 다시 눌러 주세요. 하던 건 그대로 있어요.'
    : state.reloadOnly
      ? '다른 창에서 새 버전으로 바꿨어요. 이 창도 다시 켜야 새 버전이 돼요. 하던 게 있으면 「나중에」를 눌러요 — 다 하고 바꿔도 돼요.'
      : '지금 바꾸면 앱이 잠깐 다시 켜져요. 하던 게 있으면 「나중에」를 눌러요 — 다 하고 바꿔도 돼요.';
}

function openDlg() {
  const d = $('upd-dlg');
  if (!d || d.open) return;
  setDlgMsg();
  try { d.showModal(); } catch { d.setAttribute('open', ''); }
}

function later() {
  const d = $('upd-dlg');
  if (d && d.open) d.close();
  dispatch({ type: 'later' });
}

/** 홈 띠 · 한쪽 딱지 · ⚙ 줄을 지금 상태로 — 딱지는 홈에서도 늘(홈 위에 여는 🏠 집·🎮 게임 창이 홈 띠를 가려도 보이게 · Codex 228차 P2-5) */
function render() {
  const pct = updPct(state);
  const home = $('upd-home');
  if (home) {
    home.hidden = state.phase === 'none';
    home.classList.toggle('ready', state.phase === 'ready');
    if (state.phase === 'getting') {
      home.innerHTML = '';
      home.append(el('b', 'upd-home-t', '⬇️ 새 버전 받는 중'), bar(pct), el('span', 'upd-home-pct', `${pct}%`));
    } else if (state.phase === 'ready') {
      home.innerHTML = '';
      home.append(el('b', 'upd-home-t', '✅ 새 버전 준비됐어요'), nowBtn());
    }
  }
  const chip = $('upd-chip');
  if (chip) {
    const show = state.phase === 'getting' || (state.phase === 'ready' && state.later);
    chip.hidden = !show;
    chip.classList.toggle('ready', state.phase === 'ready');
    chip.textContent = state.phase === 'ready' ? '🆕 새 버전 대기 중' : `⬇️ 새 버전 ${pct}%`;
  }
  const line = $('set-upd-now');
  if (line) line.textContent = updLine(state);
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
function bar(pct) {
  const b = el('span', 'upd-bar');
  const f = el('span', 'upd-bar-fill');
  f.style.width = `${pct}%`;
  b.append(f);
  return b;
}
function nowBtn() {
  const b = el('button', 'btn btn-primary upd-now-btn', applying ? '저장하는 중…' : '지금 바꾸기');
  b.type = 'button';
  b.disabled = applying;
  b.addEventListener('click', applyNow);
  return b;
}

/** 새 판을 지금 확인 (⚙ 단추 · 30분마다 · 돌아올 때) — 결과 줄은 ⚙만 */
async function check(fromButton) {
  lastCheck = Date.now();
  if (!reg) return;
  const line = $('set-upd-now');
  if (fromButton && line) line.textContent = `앱 판 ${APP_VERSION} · 확인하는 중…`;
  try { await reg.update(); } catch { if (fromButton && line) { line.textContent = `앱 판 ${APP_VERSION} · 인터넷이 안 돼서 확인하지 못했어요`; return; } }
  if (reg.waiting && navigator.serviceWorker.controller) dispatch({ type: 'ready' });
  else if (reg.installing) track(reg.installing);
  render();
}

/** 받기 시작한 새 판을 지켜본다 — 다 받으면 ready · 받다 끊기면 failed (처음 설치는 안내 없음) */
function track(w) {
  if (!w || w === tracked || !navigator.serviceWorker.controller) return;
  tracked = w;
  dispatch({ type: 'getting' });
  w.addEventListener('statechange', () => {
    if (w.state === 'installed') dispatch({ type: 'ready' });
    else if (w.state === 'redundant' && reg.waiting !== w && state.phase === 'getting') dispatch({ type: 'failed' });
  });
}

/** 화면이 바뀔 때 (app.js showView) — 딱지·홈 띠를 다시 그린다 */
export function updView() {
  render();
}

/** 서비스워커 등록 + 새 판 지켜보기 — o.flush: 「지금 바꾸기」 전에 기다릴 저장 (app.js) */
export async function initUpdate(o = {}) {
  opts = { ...opts, ...o };
  $('upd-now') && $('upd-now').addEventListener('click', applyNow);
  $('upd-later') && $('upd-later').addEventListener('click', later);
  const dlg = $('upd-dlg');
  if (dlg) dlg.addEventListener('cancel', (e) => { e.preventDefault(); later(); }); // 뒤로 가기·Esc도 「나중에」
  const chip = $('upd-chip');
  if (chip) chip.addEventListener('click', () => { if (state.phase === 'ready') openDlg(); });
  const btn = $('set-upd-check');
  if (btn) btn.addEventListener('click', () => { if (state.phase === 'ready') openDlg(); else check(true); });
  render();
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  if (/[?&]nosw\b/.test(location.search)) return; // 개발용: ?nosw 로 열면 캐시 없이 항상 최신 파일 (헤드리스 테스트)
  try {
    reg = await navigator.serviceWorker.register('./sw.js');
  } catch (err) {
    console.warn('서비스워커 등록 실패:', err);
    return;
  }
  const sw = navigator.serviceWorker;
  let hadController = !!sw.controller;
  sw.addEventListener('controllerchange', () => {
    // 「지금 바꾸기」 중이면 저장이 다 된 뒤에만 다시 켠다 — 저장하는 사이 다른 창이 먼저 바꿔도 (applyNow 끝에서 켬 · Codex 228차 P1)
    if (applying) { changed = true; if (saved) reloadOnce(); return; }
    if (hadController) dispatch({ type: 'ready', reloadOnly: true }); // 다른 창이 바꿨다 — 이 창은 옛 코드라 다시 켜야
    hadController = true;
  });
  sw.addEventListener('message', (e) => {
    const d = (e && e.data) || {};
    // 지금 받는 그 판의 알림만 — 받다 실패한 판의 늦은 알림·다른 판의 알림은 무시 (Codex 228차 P2-4)
    if (d.type === 'sw-progress' && sw.controller && tracked && e.source === tracked) dispatch({ type: 'progress', done: d.done, total: d.total });
  });
  reg.addEventListener('updatefound', () => track(reg.installing));
  if (reg.waiting && sw.controller) dispatch({ type: 'ready' });
  else if (reg.installing) track(reg.installing);
  lastCheck = Date.now();
  setInterval(() => { check(false); }, CHECK_EVERY);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && Date.now() - lastCheck > CHECK_GAP) check(false);
  });
}
