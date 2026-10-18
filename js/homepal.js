// 🤝 홈 화면에서 파트너가 따라다니기 (2026-10-18, 아버님 "이대로 해") — 과목 고르기 화면에서만 · 💗 10부터(첫 테두리와 같은 때 — homeplay.homePalOf)
// 화면 아래 가장자리를 길 삼아 걷는다(position: fixed) · 진우가 화면을 누르면 그 아래로 총총 · 가만히 있으면 가끔 혼자 왔다 갔다 ·
// 파트너를 누르면 톡 뛰고 말풍선 하나(셈·재촉하는 말 없음) · 💗 단계 테두리 · 저장·보상 없음(보이기만)
// 움직임은 transform만(구형 태블릿) · 화면이 안 보이면 멈춤 · "움직임 줄이기"면 걷지 않고 서 있기만
// 이 파일은 그리기만 — 누구를 보일지는 getPal()이 준다(home.js가 프로필로) → node에서 시안 페이지도 이것으로
import { sfx } from './sfx.js';

/** 파트너 크기(px) · 길 양끝 여백 */
export const PAL_SIZE = 60;
const EDGE = 8;
/** 걷는 빠르기(px/초) · 혼자 걷기 — 누른 뒤 이만큼 가만히 있으면 */
const SPEED = 260;
const WANDER_MS = 10000;
/** 누르면 뜨는 말 (셈 말·재촉하는 말은 넣지 않는다) */
export const PAL_LINES = ['같이 가자!', '오늘도 힘내!', '💗', '헤헤'];

/** 걸어갈 x (순수) — 누른 자리가 파트너 가운데에 오게, 길 양끝 안으로 */
export function laneX(clientX, width, size = PAL_SIZE) {
  const max = Math.max(EDGE, width - size - EDGE);
  const x = Number(clientX) - size / 2;
  return Math.round(Math.min(max, Math.max(EDGE, Number.isFinite(x) ? x : EDGE)));
}
/** 혼자 걸을 다음 x (순수) — r(0~1)로 길 위 한 곳, 지금 자리와 너무 가까우면 조금 더 멀리 */
export function wanderX(cur, width, r, size = PAL_SIZE) {
  const max = Math.max(EDGE, width - size - EDGE);
  let x = EDGE + Math.min(1, Math.max(0, Number(r) || 0)) * (max - EDGE);
  if (Math.abs(x - cur) < size) x = cur + (x < cur || cur + size * 2 > max ? -size * 2 : size * 2);
  return Math.round(Math.min(max, Math.max(EDGE, x)));
}
/** 걷는 시간(ms) (순수) — 거리에 맞게, 너무 짧거나 길지 않게 */
export function walkMs(dx) {
  return Math.round(Math.min(2400, Math.max(250, (Math.abs(Number(dx) || 0) / SPEED) * 1000)));
}

/**
 * 홈 화면에 파트너를 붙인다 → { refresh, el }.
 * view = 과목 고르기 화면(#view-home) · opts.getPal() → { id, tier, url, ko } | null (보일 파트너 · url이 없으면 🐾)
 * opts.win = window(시험·시안에서 바꿔 끼움)
 */
export function mountHomePal(view, opts = {}) {
  const win = opts.win || window;
  const doc = view.ownerDocument;
  const el = doc.createElement('div');
  el.className = 'hpal';
  el.hidden = true;
  const btn = doc.createElement('button');
  btn.type = 'button';
  btn.className = 'hpal-btn';
  const bubble = doc.createElement('span');
  bubble.className = 'hpal-bubble';
  bubble.hidden = true;
  el.appendChild(btn);
  el.appendChild(bubble);
  view.appendChild(el);
  const st = { x: EDGE, id: 0, url: null, last: Date.now(), line: 0, walkT: 0, bubbleT: 0 };
  const reduce = () => !!(win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const shown = () => !el.hidden && !view.hidden && !doc.hidden;

  function place(x, ms) {
    st.x = x;
    el.style.transition = ms ? `transform ${ms}ms linear` : 'none';
    el.style.transform = `translateX(${x}px)`;
  }
  function moveTo(x) {
    st.last = Date.now();
    if (reduce() || x === st.x) return; // 움직임 줄이기면 서 있기만
    const ms = walkMs(x - st.x);
    place(x, ms);
    el.classList.add('is-walk');
    clearTimeout(st.walkT);
    st.walkT = setTimeout(() => el.classList.remove('is-walk'), ms);
  }
  function face(p) {
    btn.textContent = '';
    if (p.url) {
      const img = doc.createElement('img');
      img.className = 'hpal-img';
      img.src = p.url;
      img.alt = '';
      img.draggable = false;
      btn.appendChild(img);
    } else {
      const s = doc.createElement('span');
      s.className = 'hpal-img is-emoji';
      s.textContent = '🐾';
      btn.appendChild(s);
    }
    btn.setAttribute('aria-label', p.ko ? `🤝 ${p.ko}` : '🤝 파트너');
  }

  /** 프로필이 바뀌었을 수 있으면 다시 — 보일지·누구인지·테두리 단계 */
  function refresh() {
    let p = null;
    try { p = typeof opts.getPal === 'function' ? opts.getPal() : null; } catch { p = null; }
    view.classList.toggle('has-pal', !!p);
    if (!p) { el.hidden = true; return; }
    if (p.id !== st.id || (p.url || '') !== (st.url || '')) { face(p); st.id = p.id; st.url = p.url || ''; }
    el.className = `hpal${p.tier ? ` is-bond${p.tier}` : ''}${el.classList.contains('is-walk') ? ' is-walk' : ''}`;
    const first = el.hidden;
    el.hidden = false;
    // 처음 보일 때는 화면 가운데쯤 · 화면 폭이 줄었으면 길 안으로
    const x = first ? laneX(win.innerWidth / 2, win.innerWidth) : Math.min(st.x, laneX(win.innerWidth, win.innerWidth));
    if (first || x !== st.x) place(x, 0);
  }

  /** 누른 자리가 파트너 위인가 (파트너 그림은 손가락을 받지 않는다 — css pointer-events: none) */
  function overPal(e) {
    if (el.hidden || typeof el.getBoundingClientRect !== 'function') return false;
    const r = el.getBoundingClientRect();
    return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  }
  /** 톡 + 말풍선 — 화면 양끝에서는 말풍선이 화면 밖으로 나가지 않게 한쪽에 붙인다 (Codex 93차) */
  function poke() {
    st.last = Date.now();
    el.classList.remove('is-hop');
    void el.offsetWidth;
    el.classList.add('is-hop');
    bubble.textContent = PAL_LINES[st.line % PAL_LINES.length];
    st.line += 1;
    bubble.classList.toggle('is-l', st.x < 50);
    bubble.classList.toggle('is-r', st.x > win.innerWidth - PAL_SIZE - 50);
    bubble.hidden = false;
    clearTimeout(st.bubbleT);
    st.bubbleT = setTimeout(() => { bubble.hidden = true; }, 1800);
    try { sfx.tick(); } catch { /* 소리 없이 */ }
  }
  // 화면을 누르면 그 아래로 — 카드 누르기는 막지 않는다.
  // 🔍 Codex 93차: 스크롤 중 파트너가 카드 위에 겹치면 파트너가 손가락을 가져갔다 → 파트너는 손가락을 받지 않고(css),
  //   파트너 위를 눌렀을 때 그 밑에 단추(카드·종료)가 있으면 단추가 먼저 — 파트너는 빈 곳에서 눌렸을 때만 톡
  view.addEventListener('pointerdown', (e) => {
    if (!shown()) return;
    const t = e.target && e.target.closest ? e.target : null;
    if (t && t.closest('.hpal')) return;
    if (overPal(e)) {
      if (!(t && t.closest('button, a, input, [role="button"]'))) poke();
      return;
    }
    moveTo(laneX(e.clientX, win.innerWidth));
  });
  // ⌨️ 키보드·보조기술로 파트너 단추를 누르면 (손가락은 위 pointerdown이 맡는다)
  btn.addEventListener('click', () => poke());
  // 가만히 있으면 가끔 혼자 · 열 번에 한 번쯤 다시 보기(집에서 💗가 늘었을 수 있다)
  let n = 0;
  const tick = () => {
    n += 1;
    if (view.hidden || doc.hidden) return; // 안 보이면 멈춤
    if (n % 4 === 0) refresh();
    if (shown() && Date.now() - st.last > WANDER_MS) moveTo(wanderX(st.x, win.innerWidth, Math.random()));
  };
  const timer = setInterval(tick, 2500);
  win.addEventListener('resize', () => { if (!el.hidden) place(Math.min(st.x, laneX(win.innerWidth, win.innerWidth)), 0); });
  refresh();
  return { refresh, el, stop: () => clearInterval(timer) };
}
