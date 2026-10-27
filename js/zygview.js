// 🟢 지가르데 셀 — 공부를 끝낸 화면 구석에 숨은 셀(맨 처음은 🔴 코어)을 누르면 큐브에 모인다 (v352 · 화면)
// 규칙은 zygarde.js(순수) · 찾기는 xp.zygFind(저장된 프로필로 한 트랜잭션) · 셀 10·50·100은 🐣 창(제목·글만 바꿔)으로 알린다
// 붙이는 곳(끝 화면마다 한 줄 — addCell(카드, 과목)): 🎤 에세이·복습·📝 쪽지 끝 · 🔢 개념 한 편·☀️·🧩·🕵️·🎯 끝 ·
//   📚 글·🔤 오늘의 낱말·🧩 퍼즐 판 끝 · 🖊️ 논술 판 끝 — 과목마다 하루 하나 · 모두 합쳐 하루 3 (아이 화면에 셈 문구는 없다)
// 이 파일은 끝 화면 파일들을 import하지 않는다(그쪽이 이 파일을 부른다 — 돌지 않게)
import { zygMap, zygFind } from './xp.js';
import { zygCanFind, zygNext, ZYG_ID, CELL_MAX } from './zygarde.js';
import { ensureForm, ensureArt, characterUrl } from './pokemon.js';
import { openHatch, anyModalOpen } from './hatch.js';
import { sfx, unlock } from './sfx.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
// 셀 = 초록 덩어리에 눈 하나 · 코어 = 짙은 초록 육각형 안의 붉은 핵 (원작 모습을 단순하게 — 그림 파일 없이)
const CELL_ART = [
  ['path', { d: 'M20 4C30 4 36 12 35 21C34 31 27 36 20 36C12 36 5 30 5 21C5 12 10 4 20 4Z', fill: '#4ade80', stroke: '#166534', 'stroke-width': '2.5' }],
  ['circle', { cx: '20', cy: '19', r: '5.5', fill: '#14532d' }],
  ['circle', { cx: '18.3', cy: '17.4', r: '1.8', fill: '#bbf7d0' }],
];
const CORE_ART = [
  ['path', { d: 'M20 3L35 11.5V28.5L20 37L5 28.5V11.5Z', fill: '#14532d', stroke: '#4ade80', 'stroke-width': '2.5' }],
  ['circle', { cx: '20', cy: '20', r: '8', fill: '#ef4444', stroke: '#fecaca', 'stroke-width': '2' }],
  ['circle', { cx: '17.5', cy: '17.5', r: '2.2', fill: '#fee2e2' }],
];

function art(parts) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 40 40');
  svg.setAttribute('aria-hidden', 'true');
  for (const [tag, attrs] of parts) {
    const e = document.createElementNS(SVG_NS, tag);
    for (const k of Object.keys(attrs)) e.setAttribute(k, attrs[k]);
    svg.appendChild(e);
  }
  return svg;
}

/**
 * 끝 화면 카드에 숨은 셀을 붙인다 — 오늘 이 과목에서 찾을 수 있을 때만 (아니면 아무것도 안 붙이고 null)
 * @param {HTMLElement} host 끝 화면 카드(구석 자리의 기준이 된다)
 * @param {'english'|'math'|'korean'|'nonsul'} sub
 * @param {{live?:()=>boolean}} [opts] live = 이 끝 화면이 아직 떠 있나 (찾은 줄을 붙일지)
 */
export function addCell(host, sub, opts = {}) {
  // ★ 끝 화면에 덧붙이는 장식이다 — 여기서 무엇이 터져도 끝 화면(보상·단추)은 그대로 떠야 한다
  try { return placeCell(host, sub, opts); } catch (e) { console.warn('지가르데 셀 붙이기 실패:', e); return null; }
}

function placeCell(host, sub, opts) {
  if (!host) return null;
  // 늘 있는 끝 화면(✍️ 에세이)은 다시 열 때 지난 셀·찾은 줄이 남아 있다 — 먼저 걷는다
  for (const old of Array.from(host.children || [])) if (/\bzyg-(cell|found)\b/.test(String(old.className || ''))) old.remove();
  const z = zygMap();
  if (!zygCanFind(z, sub, Date.now())) return null;
  const kind = zygNext(z);
  const btn = document.createElement('button');
  btn.type = 'button';
  const corner = Math.random() < 0.5 ? 'tl' : 'tr'; // 위 두 구석 가운데 하나 (아래는 단추 줄이라)
  btn.className = `zyg-cell zyg-${corner}${kind === 'core' ? ' core' : ''}`;
  btn.setAttribute('aria-label', kind === 'core' ? '무언가 반짝여요' : '초록 셀이 숨어 있어요');
  btn.appendChild(art(kind === 'core' ? CORE_ART : CELL_ART));
  let busy = false;
  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    // 다른 창이 덮고 있으면 이 단추는 눌리지 않는다 — 에세이·복습 끝 화면은 그 창 안이라 anyModalOpen으로 막으면 안 된다
    if (busy) return;
    busy = true;
    btn.disabled = true;
    try { unlock(); } catch { /* 소리는 없어도 */ }
    const r = await zygFind(sub).catch(() => ({ ok: false, why: 'save' }));
    if (!r || !r.ok) {
      // 저장이 안 됐다 → 셀은 그대로 (다시 누를 수 있게) · 다른 창이 먼저 가져갔다·하루 몫이 찼다 → 조용히 사라진다
      if (r && r.why === 'save') { busy = false; btn.disabled = false; return; }
      btn.remove();
      return;
    }
    try { sfx.ding(); } catch { /* 소리는 없어도 */ }
    btn.classList.add('got');
    setTimeout(() => btn.remove(), 650);
    if (!opts.live || opts.live()) host.appendChild(foundLine(r));
    if (r.ev) reveal(r).catch(() => {});
  });
  host.classList.add('zyg-host');
  host.appendChild(btn);
  return btn;
}

/** 찾은 줄 — 코어면 큐브가 생겼다는 것까지 · 셀이면 큐브에 모인 수(아이가 모은 것 — 남은 수는 말하지 않는다) */
function foundLine(r) {
  const p = document.createElement('p');
  p.className = 'zyg-found';
  p.textContent = r.found === 'core'
    ? '🔴 지가르데 코어를 찾았어요! 🎒 가방에 지가르데 큐브가 생겼어요 — 공부를 끝낸 화면에 초록 셀이 숨어 있을지도 몰라요'
    : `🟢 지가르데 셀을 찾았어요! 큐브에 셀 ${r.cells}개`;
  return p;
}

/** 그림을 잠깐만 기다린다 (못 받으면 null — 창은 그림 없이도 뜬다) */
function within(p, ms) {
  return Promise.race([p.catch(() => null), new Promise((res) => setTimeout(() => res(null), ms))]).catch(() => null);
}

/** 셀 10·50·100 — 🐣 창(제목·글만 바꿔)으로 크게 알린다 · 다른 창이 떠 있으면 닫힐 때까지 기다린다(30초까지) */
async function reveal(r) {
  let title = '';
  let text = '';
  let url = null;
  if (r.ev === 'gift') {
    title = '🟢 셀 10개! 지가르데가 모였어요';
    text = '지가르데 10%폼이 도감에 들어갔어요. 셀을 더 모으면 모습이 바뀌어요!';
    url = await within(ensureForm(ZYG_ID, 'ten'), 5000);
  } else if (r.ev === 'ten') {
    title = '🟢 셀 10개! 10%폼이 열렸어요';
    text = '🎒 도감의 지가르데에서 10%폼을 골라 볼 수 있어요.';
    url = await within(ensureForm(ZYG_ID, 'ten'), 5000);
  } else if (r.ev === 'fifty') {
    title = '🟢 셀 50개! 50%폼';
    text = r.form === '50' ? '지가르데가 50%폼이 됐어요! 도감에서 10%폼으로 바꿀 수도 있어요.' : '이제 50%폼과 10%폼을 언제든 골라요.';
    url = characterUrl(ZYG_ID) || await within(ensureArt(ZYG_ID), 5000);
  } else if (r.ev === 'perfect') {
    title = `🟢 셀 ${CELL_MAX}개! 큐브가 가득 찼어요`;
    text = '이제 배틀에서 지가르데의 HP가 절반 아래로 떨어지면 퍼펙트폼으로 변신해요! 💠 메가진화도 퍼펙트폼만 할 수 있어요.';
    url = await within(ensureForm(ZYG_ID, 'perfect'), 5000);
  } else return;
  for (let i = 0; i < 60 && (anyModalOpen() || !isHidden('hatch')); i++) await new Promise((res) => setTimeout(res, 500));
  if (anyModalOpen() || !isHidden('hatch')) return; // 계속 막혀 있다 — 큐브·도감에는 이미 들어가 있다
  // 5세대 도트는 50%폼뿐 — 10%폼·퍼펙트폼을 보여 줄 때는 도트를 끈다
  openHatch({ id: ZYG_ID, target: ZYG_ID, ko: '지가르데', url, subject: 'nonsul', look: null, title, text, dot: r.ev === 'fifty' && r.form !== '10' });
}

function isHidden(id) {
  const e = document.getElementById(id);
  return !e || e.hidden;
}
