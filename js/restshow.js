// ✨ 회복 캡슐 연출 — 다 쉰 포켓몬을 받을 때 (2026-10-10, 아버님: "이펙트나 애니메이션 효과도 풍부하게 — 아이가 재밌어하게")
// 소유는 이미 트랜잭션(rest.restClaimRule)에서 끝났다 — 이 화면은 축하만 한다 (🧬 evolveshow.js · 🐣 hatch.js와 같은 자리).
//
// 차례: 캡슐이 흔들흔들 → 번쩍 열리며 빛줄기·반짝이가 터지고 포켓몬이 톡 튀어나온다 → ❤️ HP 막대가 차오르고 →
//       💤 경험치 막대가 차오른다(가득 차면 LEVEL UP!) → 🍀 행운이면 종이가루·금빛 → [좋아!] → 깜짝 진화면 진화 연출로 이어진다.
// 구형 태블릿(갤럭시탭 A7, Android 10)을 생각해 **움직이는 것은 transform·opacity만** 쓴다(막대도 width가 아니라 scaleX).
// 화면을 누르면 연출을 건너뛰고 끝 모습으로 간다(여러 번 보면 지겹다). 무엇이 터져도 화면이 잠기지 않게 닫힌다.
import { sfx } from './sfx.js';
import { showEvolve } from './evolveshow.js';
import { EXP_LV } from './rest.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let box = null;
let skip = false;
let running = false;
let busy = false;
let onDone = null;

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
/** 받침이 있으면 '이', 없으면 '가' */
function iga(w) {
  const c = String(w || '').slice(-1).charCodeAt(0) - 0xAC00;
  return c >= 0 && c <= 11171 && c % 28 ? '이' : '가';
}

/** 처음 부를 때 한 번 만든다 (index.html을 고치지 않게) */
function ensureBox() {
  if (box) return box;
  box = el('div', 'rshow');
  box.hidden = true;
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-label', '회복 캡슐');
  box.innerHTML = '<div class="rshow-card">'
    + '<div class="rshow-stage"><div class="rshow-rays"></div><div class="rshow-capsule">💊</div><div class="rshow-mon"></div><div class="rshow-burst"></div></div>'
    + '<h2 class="rshow-title"></h2>'
    + '<div class="rshow-bars">'
    + '<div class="rshow-row"><span class="rshow-key">❤️ HP</span><span class="rshow-bar"><span class="rshow-fill is-hp"></span></span><span class="rshow-num is-hp"></span></div>'
    + '<div class="rshow-row"><span class="rshow-key">💤 경험치</span><span class="rshow-bar"><span class="rshow-fill is-exp"></span></span><span class="rshow-num is-exp"></span></div>'
    + '</div>'
    + '<div class="rshow-badges"></div>'
    + '<p class="rshow-text"></p>'
    + '<button type="button" class="btn btn-primary rshow-ok">좋아!</button>'
    + '</div>';
  document.body.appendChild(box);
  box.addEventListener('click', (e) => {
    if (running && !e.target.closest('.rshow-ok')) skip = true;
  });
  box.querySelector('.rshow-ok').addEventListener('click', () => close());
  return box;
}

function close() {
  if (!box) return;
  box.hidden = true;
  running = false;
  busy = false;
  const f = onDone;
  onDone = null;
  if (typeof f === 'function') f();
}

/** 건너뛰기를 누르면 기다리지 않고 지나간다 */
async function pause(ms) {
  for (let t = 0; t < ms; t += 60) {
    if (skip) return;
    await wait(Math.min(60, ms - t));
  }
}

/** 막대를 a(0~1)에서 b(0~1)로 — transform scaleX (skip이면 바로) */
async function fillBar(fill, a, b, ms) {
  fill.style.transition = 'none';
  fill.style.transform = `scaleX(${a})`;
  void fill.offsetWidth;
  if (skip) { fill.style.transform = `scaleX(${b})`; return; }
  fill.style.transition = `transform ${ms}ms cubic-bezier(0.22, 1, 0.36, 1)`;
  fill.style.transform = `scaleX(${b})`;
  await pause(ms);
}
/** 숫자를 a에서 b로 세어 올린다 */
async function countUp(node, a, b, ms, fmt) {
  const steps = Math.max(1, Math.round(ms / 50));
  for (let i = 1; i <= steps; i++) {
    if (skip) break;
    node.textContent = fmt(Math.round(a + ((b - a) * i) / steps));
    await wait(ms / steps);
  }
  node.textContent = fmt(b);
}

/** ✨ 반짝이 n개를 사방으로 */
function burst(stage, n) {
  const layer = stage.querySelector('.rshow-burst');
  layer.innerHTML = '';
  const marks = ['✨', '⭐', '💫', '💖', '✨', '🌟'];
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n + Math.random() * 0.4;
    const d = 90 + Math.random() * 70;
    const s = el('span', 'rshow-spark', marks[i % marks.length]);
    s.style.setProperty('--dx', `${Math.cos(a) * d}px`);
    s.style.setProperty('--dy', `${Math.sin(a) * d}px`);
    s.style.animationDelay = `${Math.random() * 120}ms`;
    layer.appendChild(s);
  }
}

function badge(row, text, cls) {
  const b = el('span', `rshow-badge ${cls}`, text);
  row.appendChild(b);
  return b;
}

/**
 * ✨ 다 쉰 포켓몬 받기 연출 — 닫힐 때까지 기다릴 수 있다(await). 깜짝 진화면 이어서 진화 연출.
 * @param {{r:object, ko:(id:number)=>string, pic:(id:number)=>string, lines:string[]}} o r = restClaimRule 결과
 */
export async function showRestDone(o) {
  if (busy || !o || !o.r || !o.r.ok || o.r.gone) return;
  busy = true;
  running = true;
  skip = false;
  const r = o.r;
  const name = o.ko(r.mon);
  try {
    const b = ensureBox();
    const stage = b.querySelector('.rshow-stage');
    const cap = b.querySelector('.rshow-capsule');
    const monBox = b.querySelector('.rshow-mon');
    const title = b.querySelector('.rshow-title');
    const badges = b.querySelector('.rshow-badges');
    const text = b.querySelector('.rshow-text');
    const ok = b.querySelector('.rshow-ok');
    const hpFill = b.querySelector('.rshow-fill.is-hp');
    const exFill = b.querySelector('.rshow-fill.is-exp');
    const hpNum = b.querySelector('.rshow-num.is-hp');
    const exNum = b.querySelector('.rshow-num.is-exp');
    stage.classList.remove('is-open', 'is-lucky');
    cap.className = 'rshow-capsule';
    monBox.innerHTML = '';
    const url = o.pic(r.mon);
    if (url) {
      const img = el('img', 'rshow-mon-img');
      img.src = url;
      img.alt = name;
      img.draggable = false;
      monBox.appendChild(img);
    } else monBox.appendChild(el('span', 'rshow-mon-emoji', '🐾'));
    monBox.classList.remove('is-pop');
    badges.innerHTML = '';
    text.textContent = '';
    ok.hidden = true;
    title.textContent = '💊 캡슐이 열려요…';
    hpFill.style.transition = 'none';
    exFill.style.transition = 'none';
    hpFill.style.transform = `scaleX(${r.hp.from / 100})`;
    exFill.style.transform = `scaleX(${r.exp.from / EXP_LV})`;
    hpNum.textContent = `${r.hp.from}`;
    exNum.textContent = `${r.exp.from}/${EXP_LV}`;
    b.querySelector('.rshow-bars').classList.remove('is-on');
    b.hidden = false;

    // 1) 흔들흔들
    cap.classList.add('is-wobble');
    for (let i = 0; i < 3 && !skip; i++) { try { sfx.tick(); } catch { /* 소리는 없어도 */ } await pause(330); }
    // 2) 번쩍 — 열리며 빛줄기·반짝이, 포켓몬이 톡
    cap.classList.remove('is-wobble');
    cap.classList.add('is-gone');
    stage.classList.add('is-open');
    monBox.classList.add('is-pop');
    burst(stage, 14);
    try { sfx.whoosh(); } catch { /* 소리는 없어도 */ }
    await pause(250);
    try { sfx.ding(); } catch { /* 소리는 없어도 */ }
    title.textContent = `${name}${iga(name)} 푹 쉬었어요!`;
    await pause(450);
    // 3) ❤️ 막대
    b.querySelector('.rshow-bars').classList.add('is-on');
    await Promise.all([fillBar(hpFill, r.hp.from / 100, 1, 900), countUp(hpNum, r.hp.from, r.hp.to, 900, (n) => `${n}`)]);
    // 4) 💤 막대 — 가득 차면 LEVEL UP
    await Promise.all([fillBar(exFill, r.exp.from / EXP_LV, r.exp.to / EXP_LV, 700), countUp(exNum, r.exp.from, r.exp.to, 700, (n) => `${n}/${EXP_LV}`)]);
    const lucky = r.lv.to - r.lv.from - r.exp.lvUp;
    if (r.exp.lvUp > 0) {
      badge(badges, `⬆️ LEVEL UP! Lv ${r.lv.from} → ${r.lv.from + r.exp.lvUp}`, 'is-level');
      try { sfx.levelUp(); } catch { /* 소리는 없어도 */ }
      await pause(500);
      await fillBar(exFill, 1, 0, 300); // 막대는 다음 레벨을 향해 다시 0부터
      exNum.textContent = `0/${EXP_LV}`;
    }
    // 5) 🍀 행운
    if (lucky > 0 || r.coins) {
      stage.classList.add('is-lucky');
      badge(badges, lucky > 0 ? `🍀 행운의 레벨업! Lv ${r.lv.to}` : `🍀 레벨이 가득해서 대신 💰${r.coins}`, 'is-lucky');
      burst(stage, 18);
      try { sfx.success(); } catch { /* 소리는 없어도 */ }
      import('./catch.js').then((m) => m.burstConfetti(60)).catch(() => {});
      await pause(600);
    }
    if (r.kept) badge(badges, `🙂 ${name} 그대로`, 'is-kept');
    if (r.evo && r.evo.ok) badge(badges, '✨ 그런데… 몸이 빛나기 시작해요!', 'is-evo');
    text.textContent = (o.lines || []).join(' · ');
    ok.textContent = r.evo && r.evo.ok ? '✨ 진화 보러 가기!' : '좋아!';
    ok.hidden = false;
    running = false;
  } catch (e) {
    // 그림·소리에서 무엇이 터져도 화면이 잠기면 안 된다 — 보상은 이미 저장됐다
    console.warn('회복 캡슐 연출 오류 (보상은 이미 저장됐어요):', e);
    close();
  }
  if (busy) await new Promise((resolve) => { onDone = resolve; });
  if (r.evo && r.evo.ok) {
    const to = r.evo.to;
    await showEvolve({
      from: { id: r.mon, ko: name, url: o.pic(r.mon) || undefined },
      to: { id: to, ko: o.ko(to) },
      first: r.evo.first, partnerMoved: r.evo.partnerMoved, gearBack: r.evo.gearBack,
    });
  }
}

export function isRestShowOpen() {
  return busy;
}
