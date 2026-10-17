// 🧑 진우 캐릭터 그림 — 코드로 그린 2등신 인형 (SVG 글자 · 순수 함수 · DOM 없음 → node에서 그림 시안 페이지도 이것으로 만든다)
// 앞에서 본 모습 · viewBox 0 0 100 124 · 그리는 차례: 망토(뒤) → 가방(뒤) → 다리·신발 → 팔 → 몸통(윗옷·무늬) → 가방끈·망토 고리 → 귀·얼굴 → 머리카락 → 모자
// 모습은 avatar.js lookOf()로 고쳐 읽은 것 — 모르는 값이면 처음 모습으로 그린다(그림이 깨지지 않게)
import { lookOf, wearById, skinById, hairColorById } from './avatar.js';

/** 윤곽선 */
const LINE = '#3b302b';
const SW = 1.6;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
/** 윤곽선 있는 칠 */
const fillLine = (fill) => `fill="${fill}" stroke="${LINE}" stroke-width="${SW}" stroke-linejoin="round"`;

/** 색을 어둡게 (#rrggbb, k 0~1) — 그림자·띠 */
export function shade(hex, k) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * (1 - k))));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/** 별 꼭짓점 (cx, cy, 바깥 R, 안 r) */
function starPts(cx, cy, R, r) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const d = i % 2 ? r : R;
    pts.push(`${(cx + d * Math.cos(a)).toFixed(1)},${(cy + d * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

/** 몸통 모양 (윗옷) — 어깨 66 · 아래 98 */
const TORSO = 'M35 69 Q35 65 41 65 L59 65 Q65 65 65 69 L67 98 L33 98 Z';

function capeBack(w) {
  if (!w) return '';
  return `<path d="M34 67 L66 67 L79 115 Q50 121 21 115 Z" ${fillLine(w.art.color)}/>`;
}
function capeFront(w) {
  if (!w) return '';
  return `<circle cx="37" cy="68" r="2.6" ${fillLine(w.art.ink)}/><circle cx="63" cy="68" r="2.6" ${fillLine(w.art.ink)}/>`;
}
function bagBack(w) {
  if (!w) return '';
  return `<rect x="28" y="67" width="44" height="31" rx="7" ${fillLine(w.art.color)}/>`;
}
function bagFront(w) {
  if (!w) return '';
  const s = w.art.ink;
  return `<rect x="38" y="66" width="4.5" height="24" rx="2" fill="${s}"/><rect x="57.5" y="66" width="4.5" height="24" rx="2" fill="${s}"/>`;
}
function legs(bottom) {
  const c = bottom.art.color;
  return `<rect x="36" y="94" width="13" height="18" rx="3" ${fillLine(c)}/><rect x="51" y="94" width="13" height="18" rx="3" ${fillLine(c)}/>`;
}
function shoes(w) {
  const c = w.art.color;
  if (w.id === 'a_shoe_boots') {
    return [42.5, 57.5].map((x) => `<path d="M${x - 7} 104 L${x + 6} 104 L${x + 7} 114 Q${x + 7} 118 ${x + 2} 118 L${x - 7} 118 Q${x - 9} 118 ${x - 8} 114 Z" ${fillLine(c)}/><line x1="${x - 7}" y1="107.5" x2="${x + 6.4}" y2="107.5" stroke="${w.art.ink}" stroke-width="2"/>`).join('');
  }
  const stripe = w.art.ink ? (x) => `<path d="M${x - 5} 114.5 Q${x} 112 ${x + 5} 114.5" fill="none" stroke="${w.art.ink}" stroke-width="2.2" stroke-linecap="round"/>` : () => '';
  return [42.5, 57.5].map((x) => `<ellipse cx="${x}" cy="115" rx="8.5" ry="4.8" ${fillLine(c)}/>${stripe(x)}`).join('');
}
function arms(skin, top) {
  const c = top.art.color;
  const arm = (x, rot) => `<g transform="rotate(${rot} ${x} 70)"><rect x="${x - 4.5}" y="69" width="9" height="26" rx="4.5" ${fillLine(skin)}/><rect x="${x - 5}" y="67" width="10" height="12" rx="4" ${fillLine(c)}/></g>`;
  return arm(30, 14) + arm(70, -14);
}
function torso(top, uid) {
  const a = top.art;
  const clip = `av-clip-${uid}`;
  let pat = '';
  if (a.pattern === 'stripe') pat = [73, 79, 85, 91].map((y) => `<line x1="30" y1="${y}" x2="70" y2="${y}" stroke="${a.ink}" stroke-width="2.6"/>`).join('');
  else if (a.pattern === 'star') pat = `<polygon points="${starPts(50, 81, 8, 3.4)}" fill="${a.ink}"/>`;
  else if (a.pattern === 'bolt') pat = `<polygon points="53,71 43,84 49.5,84 45,96 58,80 51.5,80 56,71" fill="${a.ink}"/>`;
  else if (a.pattern === 'dots') pat = [[41, 72], [55, 74], [47, 81], [61, 84], [39, 88], [53, 91]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2" fill="${a.ink}"/>`).join('');
  else if (a.pattern === 'galaxy') pat = `<polygon points="${starPts(50, 80, 6.5, 2.7)}" fill="${a.ink}"/>` + [[40, 72, 1.3], [60, 74, 1.1], [42, 90, 1.2], [58, 92, 1.4], [37, 82, 0.9], [63, 85, 1]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${a.ink}"/>`).join('');
  const neck = `<path d="M44 65 Q50 70 56 65" fill="none" stroke="${shade(a.color, 0.25)}" stroke-width="1.6"/>`;
  return `<clipPath id="${clip}"><path d="${TORSO}"/></clipPath><path d="${TORSO}" ${fillLine(a.color)}/>${pat ? `<g clip-path="url(#${clip})">${pat}</g>` : ''}${neck}`;
}
function head(skin) {
  return `<circle cx="23" cy="47" r="5" ${fillLine(skin)}/><circle cx="77" cy="47" r="5" ${fillLine(skin)}/><circle cx="50" cy="44" r="27" ${fillLine(skin)}/>`;
}
function face(eyes) {
  const ink = '#2b2420';
  let e = '';
  if (eyes === 'smile') e = [40, 60].map((x) => `<path d="M${x - 4.2} 48 Q${x} 42.5 ${x + 4.2} 48" fill="none" stroke="${ink}" stroke-width="2.2" stroke-linecap="round"/>`).join('');
  else if (eyes === 'shine') e = [40, 60].map((x) => `<circle cx="${x}" cy="47" r="4.4" fill="${ink}"/><circle cx="${x + 1.5}" cy="45.3" r="1.7" fill="#fff"/><circle cx="${x - 1.4}" cy="48.6" r="0.8" fill="#fff"/>`).join('');
  else e = [40, 60].map((x) => `<circle cx="${x}" cy="47" r="3.3" fill="${ink}"/><circle cx="${x + 1}" cy="46" r="1" fill="#fff"/>`).join('');
  const cheeks = `<circle cx="34.5" cy="54" r="3.6" fill="#ff8fa3" opacity="0.45"/><circle cx="65.5" cy="54" r="3.6" fill="#ff8fa3" opacity="0.45"/>`;
  const mouth = `<path d="M45 57 Q50 61.5 55 57" fill="none" stroke="#8a3f2e" stroke-width="1.8" stroke-linecap="round"/>`;
  return e + cheeks + mouth;
}
function hair(style, color) {
  const d = {
    short: 'M23 46 Q21 18 50 16 Q79 18 77 46 Q74 34 64 31 Q57 37 46 33 Q36 31 28 36 Q24 40 23 46 Z',
    spiky: 'M22 46 L21 28 L29 31 L30 17 L39 25 L44 11 L51 23 L58 11 L62 24 L71 17 L71 31 L79 28 L78 46 Q74 35 62 33 Q50 38 38 33 Q27 35 22 46 Z',
    bowl: 'M22 51 Q19 16 50 15 Q81 16 78 51 L75.5 51 L75 38 Q50 34 25 38 L24.5 51 Z',
    side: 'M23 46 Q21 16 52 16 Q80 17 77 46 Q75 33 66 29 Q58 26 50 30 Q41 36 30 33 Q25 37 23 46 Z',
  }[style];
  const part = style === 'side' ? `<path d="M51 17 Q49 24 50 30" fill="none" stroke="${shade(color, 0.35)}" stroke-width="1.4"/>` : '';
  return `<path d="${d}" ${fillLine(color)}/>${part}`;
}
function hat(w) {
  if (!w) return '';
  const c = w.art.color;
  const k = w.art.ink;
  if (w.id === 'a_hat_cap') return `<path d="M47 36 Q70 32 89 37 Q90 42 81 42 Q64 40 47 41 Z" ${fillLine(shade(c, 0.15))}/><path d="M23 38 Q23 12 50 12 Q77 12 77 38 Z" ${fillLine(c)}/><circle cx="50" cy="12.5" r="2.2" fill="${k}"/><path d="M43 26 L50 20 L57 26" fill="none" stroke="${k}" stroke-width="2.4" stroke-linecap="round"/>`;
  if (w.id === 'a_hat_beanie') return `<path d="M22 40 Q22 10 50 10 Q78 10 78 40 Z" ${fillLine(c)}/><rect x="21" y="33" width="58" height="9" rx="4.5" ${fillLine(k)}/><circle cx="50" cy="9" r="5" ${fillLine(k)}/>`;
  if (w.id === 'a_hat_straw') return `<ellipse cx="50" cy="32" rx="37" ry="7.5" ${fillLine(c)}/><path d="M31 32 Q31 12 50 12 Q69 12 69 32 Z" ${fillLine(c)}/><rect x="31" y="25" width="38" height="5.5" fill="${k}"/>`;
  if (w.id === 'a_crown') return `<path d="M29 27 L32 8 L41 18 L50 4 L59 18 L68 8 L71 27 Z" ${fillLine(c)}/><circle cx="50" cy="20" r="2.8" fill="${k}"/><circle cx="38.5" cy="22" r="1.9" fill="#3b82f6"/><circle cx="61.5" cy="22" r="1.9" fill="#22a06b"/>`;
  return '';
}

/**
 * 인형 그림 (순수) — SVG 글자. look = 모습(lookOf로 고쳐 읽는다) ·
 * opts.uid = 한 화면에 여럿 그릴 때 겹치지 않는 번호(무늬 자르기 id) · opts.title = 화면 읽기 이름 · opts.cls = svg class · opts.shadow = false면 발밑 그림자 없이
 */
export function avatarSvg(look, opts = {}) {
  const L = lookOf(look);
  const uid = String(opts.uid === undefined ? 'a' : opts.uid).replace(/[^\w-]/g, '');
  const skin = skinById(L.skin).color;
  const hc = hairColorById(L.hairColor).color;
  const top = wearById(L.top);
  const bottom = wearById(L.bottom);
  const sh = wearById(L.shoes);
  const cape = L.cape ? wearById(L.cape) : null;
  const bag = L.bag ? wearById(L.bag) : null;
  const ht = L.hat ? wearById(L.hat) : null;
  const title = opts.title ? `<title>${esc(opts.title)}</title>` : '';
  const cls = opts.cls ? ` class="${esc(opts.cls)}"` : '';
  // 발밑 그림자 — 방 바닥에 서 있게 (opts.shadow === false면 뺀다: 작은 고르기 칸)
  const ground = opts.shadow === false ? '' : '<ellipse cx="50" cy="119.5" rx="23" ry="3.4" fill="#000" opacity="0.13"/>';
  return `<svg${cls} viewBox="0 0 100 124" xmlns="http://www.w3.org/2000/svg" role="img"${opts.title ? '' : ' aria-hidden="true"'}>${title}`
    + ground + capeBack(cape) + bagBack(bag) + legs(bottom) + shoes(sh) + arms(skin, top) + torso(top, uid) + bagFront(bag) + capeFront(cape)
    + head(skin) + face(L.eyes) + hair(L.hair, hc) + hat(ht) + '</svg>';
}
