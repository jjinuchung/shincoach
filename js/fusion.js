// 🏪 5일장 · 🔀 퓨전 — 순수 규칙 (화면·저장소 없음, 아무것도 import하지 않는다 → db.js가 가져다 쓴다)
//
// 진우 요청 (2026-10-04) → 아버님 결정:
//  · 장날은 날짜가 5일 지날 때마다 (MARKET_ANCHOR부터 5일 간격) — 장이 서는 날만 퓨전·분리
//  · 퓨전 = 데리고 있는 두 마리를 앞(모양) + 뒤(색)로 섞어 새 포켓몬 — 순서를 바꾸면 다른 퓨전 (피카씨 ≠ 이상츄)
//  · 그림은 기기 안에서 "앞의 모양 + 뒤의 색"(recolor) — 시험작 검수 https://claude.ai/artifact/GCN9eQ5aqea1KMQXRzEgP3
//  · 이름은 앞 두 글자 + 뒤 끝 한 글자 (blendName), 진우가 바꿀 수 있다
//  · 값은 스톤만 (🔷1 + 🔶1, 코인 없음) · 두 마리가 하나로 합쳐지고, 장날에 분리하면 돌아온다 (낸 스톤은 안 돌아옴)

export const MARKET_ANCHOR = '2026-10-05'; // 첫 장날 — 여기서 5일마다
export const MARKET_EVERY = 5;
export const FUSION_COST = { stone_math: 1, stone_english: 1 };
export const NAME_MAX = 8;

/** 'YYYY-MM-DD' → 1970-01-01부터 며칠째 (달·해가 바뀌어도 하루씩) */
export function dayNum(dateKey) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey || ''));
  if (!m) return NaN;
  return Math.round(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 864e5);
}

function keyOf(n) {
  const d = new Date(n * 864e5);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** 오늘 장이 서나 */
export function marketOpen(dateKey) {
  const n = dayNum(dateKey);
  if (!Number.isFinite(n)) return false;
  const off = n - dayNum(MARKET_ANCHOR);
  return ((off % MARKET_EVERY) + MARKET_EVERY) % MARKET_EVERY === 0;
}

/** 다음 장날 { key, days } — 오늘이 장날이면 days 0 */
export function nextMarket(dateKey) {
  const n = dayNum(dateKey);
  if (!Number.isFinite(n)) return null;
  for (let i = 0; i < MARKET_EVERY; i++) if (marketOpen(keyOf(n + i))) return { key: keyOf(n + i), days: i };
  return null;
}

/** 퓨전 id — 순서가 있다 (앞-뒤) */
export const fusionId = (a, b) => `${Number(a)}-${Number(b)}`;
export function parseFusionId(fid) {
  const m = /^(\d+)-(\d+)$/.exec(String(fid || ''));
  return m ? { a: Number(m[1]), b: Number(m[2]) } : null;
}

/**
 * 이름 짓기: 앞 포켓몬의 앞 두 글자(두 글자 이하 이름이면 한 글자) + 뒤 포켓몬의 끝 한 글자.
 * 앞 조각이 그 글자로 끝나면(리자 + 자) 끝 두 글자 — 피카츄+이상해씨 = 피카씨 · 리자몽+개굴닌자 = 리자닌자 · 뮤+피카츄 = 뮤츄
 */
export function blendName(a, b) {
  const A = [...String(a || '')], B = [...String(b || '')];
  if (!A.length || !B.length) return A.join('') + B.join('');
  const head = A.slice(0, A.length <= 2 ? 1 : 2).join('');
  let tail = B.slice(-1).join('');
  if (head.endsWith(tail)) tail = B.slice(-2).join('');
  return head + tail;
}

/** 아이가 지은 이름 다듬기 — 앞뒤 공백·줄바꿈·제어 문자 빼고, 공백은 하나로, 8글자까지 (빈 이름은 '' = 원래 이름으로) */
export function cleanName(s) {
  const t = String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  return [...t].slice(0, NAME_MAX).join('');
}

/** 퓨전 기록 { made, split } → 지금 가지고 있는 수 */
export function fusionHeld(f) {
  const made = Math.max(0, Math.floor(Number(f && f.made) || 0));
  const split = Math.max(0, Math.floor(Number(f && f.split) || 0));
  return Math.max(0, made - split);
}

/**
 * 백업 병합 — 같은 줄기(두 창·옛 백업)를 합친다. made·split은 단조 카운터라 max(되살아나지 않게),
 * 처음 만든 때는 이른 쪽, 이름은 나중에 고친 쪽(nameAt)
 */
export function mergeFusions(cur, rec) {
  const out = {};
  for (const fid of new Set([...Object.keys(cur || {}), ...Object.keys(rec || {})])) {
    const c = (cur || {})[fid] || {}, r = (rec || {})[fid] || {};
    const ids = parseFusionId(fid);
    if (!ids) continue;
    const at = [Number(c.at) || 0, Number(r.at) || 0].filter((x) => x > 0);
    const named = (Number(r.nameAt) || 0) > (Number(c.nameAt) || 0) ? r : c;
    out[fid] = {
      a: ids.a, b: ids.b,
      made: Math.max(Number(c.made) || 0, Number(r.made) || 0),
      split: Math.max(Number(c.split) || 0, Number(r.split) || 0),
      at: at.length ? Math.min(...at) : 0,
      // 원래 이름으로 되돌린 것(이름 없음)도 고친 때(nameAt)를 남긴다 — 버리면 옛 백업을 두 번 합칠 때 옛 이름이 돌아왔다 (Codex 30차 #3)
      ...(named.name ? { name: String(named.name) } : {}),
      ...(Number(named.nameAt) > 0 ? { nameAt: Number(named.nameAt) } : {}),
    };
  }
  return out;
}

export function copyFusions(fs) {
  const out = {};
  for (const fid of Object.keys(fs || {})) out[fid] = { ...fs[fid] };
  return out;
}

// ───────────────── 🎨 그림: 앞의 모양 + 뒤의 색 (순수 — {data, width, height}만 다룬다) ─────────────────
// 시험작에서 고른 방식(가2): 뒤 포켓몬의 몸 색을 색상 계열로 묶어, 앞 포켓몬의 계열에 많은 순으로 입힌다.
// 같은 색의 밝은 곳·어두운 곳은 한 계열이라 얼룩이 안 생기고, 앞 포켓몬의 명암·무늬는 남는다.
// 검은 테두리·하얀 빛·크림색(채도 낮음)은 그대로. 앞의 큰 부분(15%↑)에 뒤의 작은 장식 색(6%↓ — 눈·볼)은 안 입힌다

const SAT_MIN = 0.18;   // 이보다 흐린 몸 색(크림·회색)은 그대로
const MERGE_GAP = 0.07; // 색상이 25° 안이면 한 계열
const BIG = 0.15, SMALL = 0.06;

export function toHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}
export function toRgb(h, s, l) {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hueDist = (a, b) => { const x = Math.abs(a - b) % 1; return Math.min(x, 1 - x); };

/** 픽셀 i가 바꿀 몸 색인가 — 투명·검은 테두리·하얀 빛은 아니다 */
function isBody(d, i) {
  if (d.data[i + 3] < 128) return false;
  const [, s, l] = toHsl(d.data[i], d.data[i + 1], d.data[i + 2]);
  if (l < 0.13) return false;
  if (l > 0.9 && s < 0.2) return false;
  return true;
}

function mergeNear(gs) {
  const out = gs.map((g) => ({ ...g }));
  for (let merged = true; merged;) {
    merged = false;
    for (let i = 0; i < out.length && !merged; i++) for (let j = i + 1; j < out.length && !merged; j++) {
      if (hueDist(out[i].h, out[j].h) > MERGE_GAP) continue;
      const a = out[i], b = out[j], n = a.n + b.n;
      const x = (Math.cos(a.h * 2 * Math.PI) * a.n + Math.cos(b.h * 2 * Math.PI) * b.n) / n;
      const y = (Math.sin(a.h * 2 * Math.PI) * a.n + Math.sin(b.h * 2 * Math.PI) * b.n) / n;
      out[i] = { h: ((Math.atan2(y, x) / (2 * Math.PI)) + 1) % 1, s: (a.s * a.n + b.s * b.n) / n, l: (a.l * a.n + b.l * b.n) / n, n };
      out.splice(j, 1);
      merged = true;
    }
  }
  return out.sort((a, b) => b.n - a.n);
}

/** 몸 색의 색상 계열 (많은 순) [{h, s, l, n}] */
export function hueGroups(d, k = 3) {
  const px = [];
  for (let i = 0; i < d.data.length; i += 4) {
    if (!isBody(d, i)) continue;
    const h = toHsl(d.data[i], d.data[i + 1], d.data[i + 2]);
    if (h[1] >= SAT_MIN) px.push(h);
  }
  if (!px.length) return [];
  const sorted = px.map((p) => p[0]).sort((a, b) => a - b);
  let cs = Array.from({ length: k }, (_, j) => sorted[Math.floor(((j + 0.5) / k) * sorted.length)]);
  let acc = [];
  for (let it = 0; it < 12; it++) {
    acc = cs.map(() => ({ x: 0, y: 0, s: 0, l: 0, n: 0 }));
    for (const p of px) {
      let best = 0, bd = Infinity;
      cs.forEach((c, j) => { const dd = hueDist(p[0], c); if (dd < bd) { bd = dd; best = j; } });
      const a = acc[best];
      a.x += Math.cos(p[0] * 2 * Math.PI); a.y += Math.sin(p[0] * 2 * Math.PI); a.s += p[1]; a.l += p[2]; a.n++;
    }
    cs = cs.map((c, j) => (acc[j].n ? ((Math.atan2(acc[j].y, acc[j].x) / (2 * Math.PI)) + 1) % 1 : c));
  }
  return mergeNear(cs.map((h, j) => ({ h, s: acc[j].n ? acc[j].s / acc[j].n : 0, l: acc[j].n ? acc[j].l / acc[j].n : 0, n: acc[j].n })).filter((x) => x.n > 0));
}

/**
 * 앞(A)의 모양에 뒤(B)의 색 — 새 {data, width, height}를 돌려준다 (A·B는 같은 크기, RGBA)
 * 색이 없는 그림(흑백)이면 A를 그대로 돌려준다
 */
export function recolor(A, B) {
  const data = new Uint8ClampedArray(A.data);
  const out = { data, width: A.width, height: A.height };
  const ga = hueGroups(A), gb = hueGroups(B);
  if (!ga.length || !gb.length) return out;
  const ta = ga.reduce((s, g) => s + g.n, 0), tb = gb.reduce((s, g) => s + g.n, 0);
  const target = ga.map((g, j) => (j < gb.length && (gb[j].n / tb >= SMALL || g.n / ta < BIG) ? gb[j] : gb[0]));
  for (let i = 0; i < data.length; i += 4) {
    if (!isBody(A, i)) continue;
    const p = toHsl(A.data[i], A.data[i + 1], A.data[i + 2]);
    if (p[1] < SAT_MIN) continue;
    let best = 0, bd = Infinity;
    ga.forEach((g, j) => { const dd = hueDist(p[0], g.h); if (dd < bd) { bd = dd; best = j; } });
    const src = ga[best], dst = target[best];
    const h = (p[0] + (dst.h - src.h) + 1) % 1;
    const s = clamp(p[1] * (src.s > 0.05 ? dst.s / src.s : 1), 0, 1);
    const l = clamp(p[2] + (dst.l - src.l) * 0.6, 0.06, 0.94);
    const [r, g, b] = toRgb(h, s, l);
    data[i] = r; data[i + 1] = g; data[i + 2] = b;
  }
  return out;
}
