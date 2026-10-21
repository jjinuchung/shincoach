// 🕳️ 디그다 잡기 — 🎮 게임기 미니 게임 첫째 (v307 · 2026-10-21 아버님 "추천한 ⭐ 셋을 먼저")
// 구멍 아홉에서 디그다가 쏙 — 톡 누르면 ⭐ +1 · 닥트리오는 ⭐ +3 · 찌리리공을 누르면 찌릿(잠깐 못 누름 — 점수는 안 깎는다)
// 한 판 30초 · 목숨·게임 오버 없이 시간이 끝나면 늘 끝까지 · 점수는 💰·스톤과 안 이어진다(최고 기록만 — homeplay.best)
//
// 위쪽(엔진)은 순수 — 시각(ms)과 rng를 받아 상태만 바꾼다(node 시험이 가짜 시계로 끝까지 돌린다) · 아래쪽(runDig)이 화면
// 구형 태블릿: 움직이는 것은 transform·opacity만 · 시계는 50ms 한 번 · 앱을 내리면 멈췄다가 돌아오면 이어서
import { sfx, vibrate } from './sfx.js';

/** 한 판(초) · 구멍 수 · 찌릿 동안(ms) · 시작 뒤 첫 디그다까지(ms) · 찌리리공이 나오기 시작하는 때(ms) */
export const DIG_SEC = 30;
export const DIG_HOLES = 9;
export const ZAP_MS = 1000;
const FIRST_MS = 500;
const VOLT_FROM = 3000;
/** 나오는 포켓몬 — id는 그림(ensureArt) · pts는 ⭐ · zap이면 누르면 찌릿 */
export const DIG_KINDS = {
  diglett: { id: 50, ko: '디그다', pts: 1 },
  dugtrio: { id: 51, ko: '닥트리오', pts: 3 },
  voltorb: { id: 100, ko: '찌리리공', pts: 0, zap: true },
};

const nz = (v) => {
  const n = Math.floor(Number(v) || 0);
  return n > 0 ? n : 0;
};

/** 빠르기 (순수) — 지난 시간 ms → { gap: 다음 디그다까지, stay: 나와 있는 동안 } · 끝으로 갈수록 빨라진다 */
export function digPace(ms) {
  const k = Math.min(1, Math.max(0, (Number(ms) || 0) / (DIG_SEC * 1000)));
  return { gap: Math.round(850 - 350 * k), stay: Math.round(1300 - 500 * k) };
}

/** 무엇이 나오나 (순수) — r = rng() 하나 · 닥트리오 12% · 3초 뒤부터 찌리리공 15% · 나머지 디그다 */
export function digKind(r, ms) {
  if (r < 0.12) return 'dugtrio';
  if (ms >= VOLT_FROM && r < 0.27) return 'voltorb';
  return 'diglett';
}

/** 새 판 (순수) — now = 시작 시각(ms) */
export function digStart(now) {
  return { t0: now, end: now + DIG_SEC * 1000, next: now + FIRST_MS, up: [], seq: 0, score: 0, hits: 0, zaps: 0, zapUntil: 0 };
}

/**
 * 시계 한 번 (순수) — 시간이 다 된 것은 들어가고(gone), 때가 되면 빈 구멍에 하나(added) → { added, gone }
 * 나와 있는 것은 판 끝을 넘지 않는다 — 끝나면 모두 들어가 있다
 */
export function digTick(s, now, rng = Math.random) {
  const gone = s.up.filter((m) => m.until <= now);
  s.up = s.up.filter((m) => m.until > now);
  const added = [];
  if (now < s.end && now >= s.next) {
    const busy = new Set(s.up.map((m) => m.hole));
    const free = [];
    for (let h = 0; h < DIG_HOLES; h++) if (!busy.has(h)) free.push(h);
    const ms = now - s.t0;
    const pace = digPace(ms);
    if (free.length) {
      const hole = free[Math.min(free.length - 1, Math.floor(rng() * free.length))];
      const m = { n: ++s.seq, hole, kind: digKind(rng(), ms), at: now, until: Math.min(now + pace.stay, s.end) };
      s.up.push(m);
      added.push(m);
    }
    s.next = now + pace.gap;
  }
  return { added, gone };
}

/**
 * 구멍을 눌렀다 (순수) → { kind: 'hit'(+pts) | 'zap'(찌리리공) | 'zapped'(찌릿 동안) | 'miss'(빈 구멍) | 'over'(끝남), mon?, pts? }
 * 누른 것은 바로 들어간다 · 빈 구멍을 눌러도 아무것도 안 깎는다
 */
export function digTap(s, hole, now) {
  if (now >= s.end) return { kind: 'over' };
  if (now < s.zapUntil) return { kind: 'zapped' };
  const i = s.up.findIndex((m) => m.hole === hole && m.until > now);
  if (i < 0) return { kind: 'miss' };
  const mon = s.up.splice(i, 1)[0];
  const k = DIG_KINDS[mon.kind];
  if (k.zap) {
    s.zapUntil = now + ZAP_MS;
    s.zaps += 1;
    return { kind: 'zap', mon };
  }
  s.score += k.pts;
  s.hits += 1;
  return { kind: 'hit', mon, pts: k.pts };
}

/** 멈췄던 만큼 뒤로 민다 (순수) — 앱을 내렸다 돌아오면 남은 시간이 그대로 */
export function digShift(s, ms) {
  const d = nz(ms);
  if (!d) return;
  s.t0 += d; s.end += d; s.next += d;
  if (s.zapUntil) s.zapUntil += d;
  for (const m of s.up) { m.at += d; m.until += d; }
}

// ───────────────────── 화면 (여기부터 브라우저) ─────────────────────

/** 그림을 못 받았을 때의 모습 (코드로 그린 것 — 인터넷 없이도 · 🍓 나무열매 받기의 찌리리공도 이것) */
export const FALLBACK = {
  diglett: '<svg viewBox="0 0 60 72" aria-hidden="true"><path d="M8 72V32a22 22 0 0 1 44 0v40z" fill="#a0673a"/><ellipse cx="22" cy="31" rx="3.2" ry="5.5" fill="#222"/><ellipse cx="38" cy="31" rx="3.2" ry="5.5" fill="#222"/><ellipse cx="30" cy="44" rx="9" ry="5.5" fill="#f29bb3"/></svg>',
  dugtrio: '<svg viewBox="0 0 90 72" aria-hidden="true"><g fill="#a0673a"><path d="M2 72V42a14 14 0 0 1 28 0v30z"/><path d="M60 72V42a14 14 0 0 1 28 0v30z"/><path d="M29 72V26a16 16 0 0 1 32 0v46z"/></g><g fill="#222"><ellipse cx="11" cy="42" rx="2" ry="3.5"/><ellipse cx="21" cy="42" rx="2" ry="3.5"/><ellipse cx="69" cy="42" rx="2" ry="3.5"/><ellipse cx="79" cy="42" rx="2" ry="3.5"/><ellipse cx="39" cy="26" rx="2.4" ry="4"/><ellipse cx="51" cy="26" rx="2.4" ry="4"/></g><g fill="#f29bb3"><ellipse cx="16" cy="51" rx="6" ry="3.6"/><ellipse cx="74" cy="51" rx="6" ry="3.6"/><ellipse cx="45" cy="36" rx="7" ry="4.2"/></g></svg>',
  voltorb: '<svg viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="27" fill="#fff" stroke="#333" stroke-width="2"/><path d="M3 30a27 27 0 0 1 54 0z" fill="#e8413b" stroke="#333" stroke-width="2"/><path d="M13 19l11 6M47 19l-11 6" stroke="#222" stroke-width="3" stroke-linecap="round"/><ellipse cx="21" cy="27" rx="3" ry="2.6" fill="#222"/><ellipse cx="39" cy="27" rx="3" ry="2.6" fill="#222"/></svg>',
};

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
function hop(node) {
  if (!node) return;
  node.classList.remove('is-hop');
  void node.offsetWidth;
  node.classList.add('is-hop');
}

/**
 * 한 판 돌리기 → { done: Promise<{ score, quit }>, stop() }
 * stage = 그릴 자리(비워서 쓴다) · o.art = { 포켓몬 id: 그림 주소|null } · o.hero = 응원하는 쪽 { html } (파트너 그림 또는 캐릭터)
 * stop()은 집을 닫을 때 — 그 자리에서 끝(quit)
 */
export function runDig(stage, o = {}) {
  const now = () => performance.now();
  const rng = typeof o.rng === 'function' ? o.rng : Math.random;
  stage.innerHTML = '';
  const root = el('div', 'gd');
  root.style.setProperty('--gd-sec', `${DIG_SEC}s`);
  const top = el('div', 'gd-top');
  const scoreEl = el('span', 'gd-score', '⭐ 0');
  const time = el('div', 'gd-time');
  time.appendChild(el('i'));
  top.append(scoreEl, time);
  const field = el('div', 'gd-field');
  const holes = [];
  for (let h = 0; h < DIG_HOLES; h++) {
    const hole = el('button', 'gd-hole');
    hole.type = 'button';
    hole.setAttribute('aria-label', `구멍 ${h + 1}`);
    hole.appendChild(el('span', 'gd-pit'));
    const slot = el('span', 'gd-slot');
    const mon = el('span', 'gd-mon');
    slot.appendChild(mon);
    hole.appendChild(slot);
    hole.appendChild(el('span', 'gd-dirt'));
    field.appendChild(hole);
    holes.push({ hole, mon, n: 0 });
  }
  const fx = el('div', 'gd-fx');
  const pal = el('div', 'gd-pal');
  pal.innerHTML = (o.hero && o.hero.html) || '<span class="gd-pal-emoji">🐾</span>';
  const banner = el('div', 'gd-banner', '준비!');
  root.append(top, field, pal, fx, banner);
  stage.appendChild(root);

  const picture = (kind) => {
    const url = o.art && o.art[DIG_KINDS[kind].id];
    if (!url) return FALLBACK[kind];
    const img = document.createElement('img');
    img.src = url;
    img.alt = '';
    img.draggable = false;
    return img;
  };
  const show = (m) => {
    const h = holes[m.hole];
    h.n = m.n;
    h.mon.innerHTML = '';
    const p = picture(m.kind);
    if (typeof p === 'string') h.mon.innerHTML = p; else h.mon.appendChild(p);
    h.mon.className = `gd-mon is-${m.kind}`;
    h.hole.classList.remove('is-bonk');
    h.hole.classList.add('is-up');
  };
  const hide = (m) => {
    const h = holes[m.hole];
    if (h.n === m.n) h.hole.classList.remove('is-up');
  };
  const fly = (text, hole, cls) => {
    const h = holes[hole].hole;
    const a = h.getBoundingClientRect();
    const b = root.getBoundingClientRect();
    const s = el('span', `gd-fly ${cls || ''}`, text);
    s.style.left = `${a.left - b.left + a.width / 2}px`;
    s.style.top = `${a.top - b.top + a.height * 0.2}px`;
    fx.appendChild(s);
    setTimeout(() => s.remove(), 900);
  };

  let s = null;
  let timer = 0;
  let pausedAt = 0;
  let finished = false;
  let resolveDone;
  const done = new Promise((r) => { resolveDone = r; });

  const finish = (quit) => {
    if (finished) return;
    finished = true;
    clearInterval(timer);
    document.removeEventListener('visibilitychange', onVis);
    for (const h of holes) h.hole.classList.remove('is-up');
    const score = s ? s.score : 0;
    if (quit) { resolveDone({ score, quit: true }); return; }
    banner.textContent = '끝!';
    banner.classList.add('is-on');
    sfx.success();
    setTimeout(() => resolveDone({ score, quit: false }), 900);
  };
  const loop = () => {
    if (!s || pausedAt) return;
    const t = now();
    const r = digTick(s, t, rng);
    for (const m of r.gone) hide(m);
    for (const m of r.added) show(m);
    root.classList.toggle('is-zap', t < s.zapUntil);
    if (t >= s.end) finish(false);
  };
  const onVis = () => {
    if (!s || finished) return;
    if (document.hidden) { pausedAt = now(); root.classList.add('is-paused'); return; }
    if (pausedAt) { digShift(s, now() - pausedAt); pausedAt = 0; root.classList.remove('is-paused'); }
  };
  holes.forEach((h, i) => {
    h.hole.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (!s || finished || pausedAt) return;
      const r = digTap(s, i, now());
      if (r.kind === 'hit') {
        h.hole.classList.add('is-bonk');
        setTimeout(() => { if (h.n === r.mon.n) h.hole.classList.remove('is-up', 'is-bonk'); }, 160);
        scoreEl.textContent = `⭐ ${s.score}`;
        fly(`+${r.pts}`, i, r.pts > 1 ? 'is-big' : '');
        sfx.hit();
        hop(pal);
      } else if (r.kind === 'zap') {
        h.hole.classList.remove('is-up');
        fly('찌릿!', i, 'is-zap');
        root.classList.add('is-zap');
        sfx.zap();
        vibrate([60, 40, 60]);
      }
    });
  });

  // 준비! → 시작 (첫 디그다는 시작하고 0.5초 뒤)
  // 🔍 Codex 113차 #3: 앱이 내려간 것은 「준비!」 때부터 듣고, 시작할 때 이미 내려가 있으면 멈춘 채로 시작한다
  //   (안 그러면 보이지 않는 동안 30초가 흘러 돌아오면 이미 끝나 있다)
  document.addEventListener('visibilitychange', onVis);
  setTimeout(() => {
    if (finished) return;
    banner.classList.remove('is-on');
    s = digStart(now());
    root.classList.add('is-go');
    if (document.hidden) { pausedAt = now(); root.classList.add('is-paused'); }
    timer = setInterval(loop, 50);
  }, 800);
  banner.classList.add('is-on');
  sfx.tick();

  return { done, stop: () => finish(true) };
}
