// 🎣 학습 낚시터 그림 (v366) — 캔버스 2D에 직접 그린다(레퍼런스 그림·에셋은 안 씀 · 이용 조건 걱정 없음)
// 장면은 가상 좌표 1024×600(옆모습 — 위는 하늘·물가·잔교, 아래는 물속) · 화면 크기는 fishview가 맞춘다
// 물고기 16종은 몸 모양 값(LOOKS)으로 그린다 — 몸통·꼬리·지느러미·무늬·수염·눈·입 · 작게 그릴 땐 무늬를 줄인다(LOD)
// 안 움직이는 것(하늘·산·물가·바닥·잔교·갈대)은 paintStatic이 한 장에 그려 두고 fishview가 붙이기만 한다(태블릿 성능)
// 생김새 근거(2026-10-30 확인): 위키백과·FishBase·경북 토속관상어 사육 매뉴얼·한국어류학회지(동자개 수염 4쌍) — 아이 눈에 「그 물고기」로 보이는 특징 위주
// ★ 이 파일은 아무것도 import하지 않는다

export const SCENE_W = 1024;
export const SCENE_H = 600;
export const WATER_Y = 210;
export const DOCK_Y = 194; // 잔교 윗면
export const DOCK_X = 236; // 잔교 끝
/** 찌가 떨어지는 x — 거리(m)마다 32 */
export function spotX(m) {
  return 300 + (Number(m) || 0) * 32;
}
/** 바닥 높이 (물가 쪽이 얕고 오른쪽이 깊다) */
export function bottomY(x) {
  const t = Math.min(1, Math.max(0, x / SCENE_W));
  return 512 + 70 * t;
}

/**
 * 물고기 생김새 — 길이 L에 대한 비율
 * depth 몸높이 · peak 등이 가장 높은 곳 · head point|round|flat · belly 배 · ped 꼬리자루 · tail fork|notch|round|eel · tk 꼬리 높이
 * dorsal/anal [시작, 끝, 높이, 꼴 soft|spiny|low] · adipose 기름지느러미 · barbels [쌍, 길이] · mouth small|up|big|wide · eye [x, y, r]
 * c [등, 옆, 배, 지느러미] · pat [무늬…]
 */
export const LOOKS = {
  chambung: { depth: 0.22, peak: 0.42, head: 'point', tail: 'fork', tk: 0.8, dorsal: [0.42, 0.55, 0.5, 'soft'], anal: [0.66, 0.78, 0.4, 'soft'], mouth: 'up', eye: [0.11, 0.2, 0.03], c: ['#6d7258', '#bfc4b2', '#eef0e6', '#c9c7b4'], pat: ['stripe:#4a4c3c:.45', 'scaleEdge'] },
  napjaru: { depth: 0.34, peak: 0.36, head: 'round', tail: 'fork', tk: 0.85, dorsal: [0.42, 0.7, 0.45, 'soft'], anal: [0.55, 0.78, 0.4, 'soft'], barbels: [1, 0.04], mouth: 'small', eye: [0.11, 0.18, 0.032], c: ['#43545e', '#b7c6cb', '#eef3f2', '#d6dcd8'], pat: ['thinline:#26323a', 'sheen:#8fd0c4'] },
  pirami: { depth: 0.22, peak: 0.42, head: 'point', tail: 'fork', tk: 0.9, dorsal: [0.44, 0.56, 0.5, 'soft'], anal: [0.62, 0.82, 0.55, 'soft'], mouth: 'small', eye: [0.1, 0.2, 0.028], c: ['#4e5e3d', '#a8cdbf', '#f1f4f0', '#d9b7a8'], pat: ['bars:#6f8fb6:.32:9', 'sheen:#c9a0b8'] },
  bluegill: { depth: 0.5, peak: 0.38, head: 'round', tail: 'notch', tk: 0.9, dorsal: [0.3, 0.82, 0.38, 'spiny'], anal: [0.6, 0.84, 0.35, 'soft'], mouth: 'small', eye: [0.13, 0.2, 0.036], c: ['#2e4950', '#6e8b6a', '#e8b35a', '#5f7a62'], pat: ['bars:#2a3c3a:.24:7', 'ear:#1c2a4a', 'sheen:#7a7ad0'] },
  bungeo: { depth: 0.42, peak: 0.42, head: 'round', tail: 'fork', tk: 0.85, dorsal: [0.38, 0.78, 0.36, 'soft'], anal: [0.7, 0.8, 0.4, 'soft'], mouth: 'small', eye: [0.12, 0.2, 0.032], c: ['#58552f', '#b29b58', '#eadcae', '#8d7a45'], pat: ['scales'] },
  ttokbung: { depth: 0.46, peak: 0.38, head: 'round', tail: 'fork', tk: 0.85, dorsal: [0.38, 0.78, 0.34, 'soft'], anal: [0.7, 0.8, 0.4, 'soft'], mouth: 'small', eye: [0.12, 0.18, 0.03], c: ['#5c686c', '#c8cfcf', '#f3f5f3', '#a9b1b1'], pat: ['scales'] },
  dongjagae: { depth: 0.22, peak: 0.32, head: 'flat', tail: 'fork', tk: 0.8, dorsal: [0.3, 0.38, 0.9, 'spine'], anal: [0.6, 0.86, 0.32, 'soft'], adipose: [0.7, 0.86], barbels: [4, 0.16], mouth: 'wide', eye: [0.1, 0.25, 0.022], c: ['#6a5626', '#cca33a', '#f0e2aa', '#a7852e'], pat: ['blotch:#47331a'] },
  kkeuri: { depth: 0.24, peak: 0.45, head: 'point', tail: 'fork', tk: 0.9, dorsal: [0.46, 0.58, 0.5, 'soft'], anal: [0.62, 0.84, 0.6, 'soft'], mouth: 'big', eye: [0.11, 0.18, 0.026], c: ['#3b5b77', '#b8c7d1', '#f0f3f5', '#b6bfc6'], pat: ['sheen:#9ab8e0'] },
  nuchi: { depth: 0.25, peak: 0.4, head: 'round', tail: 'fork', tk: 0.85, dorsal: [0.38, 0.52, 0.55, 'soft'], anal: [0.68, 0.8, 0.4, 'soft'], barbels: [1, 0.05], mouth: 'small', eye: [0.12, 0.18, 0.026], c: ['#525b61', '#c3c8cb', '#eff1f1', '#b0b6b8'], pat: ['dots:#3a4044:8'] },
  bass: { depth: 0.3, peak: 0.4, head: 'round', tail: 'notch', tk: 0.85, dorsal: [0.3, 0.8, 0.38, 'spiny'], anal: [0.64, 0.8, 0.35, 'soft'], mouth: 'big', eye: [0.13, 0.18, 0.03], c: ['#3c582d', '#8ea868', '#eef0d6', '#6f8752'], pat: ['band:#2c3e22'] },
  ingeo: { depth: 0.33, peak: 0.42, head: 'round', tail: 'fork', tk: 0.9, dorsal: [0.36, 0.84, 0.32, 'soft'], anal: [0.7, 0.8, 0.4, 'soft'], barbels: [2, 0.05], mouth: 'small', eye: [0.12, 0.2, 0.026], c: ['#5c4823', '#b2893b', '#ecd8a2', '#b56a38'], pat: ['scales'] },
  gangjun: { depth: 0.26, peak: 0.32, head: 'point', tail: 'fork', tk: 0.95, dorsal: [0.42, 0.52, 0.6, 'soft'], anal: [0.56, 0.86, 0.35, 'soft'], mouth: 'up', eye: [0.1, 0.14, 0.03], c: ['#4b5e69', '#c6cfd3', '#f3f5f6', '#c77a5a'], pat: ['sheen:#d8e4ea'] },
  megi: { depth: 0.2, peak: 0.28, head: 'flat', tail: 'round', tk: 0.55, dorsal: [0.28, 0.33, 0.5, 'soft'], anal: [0.42, 0.97, 0.3, 'low'], barbels: [2, 0.3], mouth: 'wide', eye: [0.08, 0.3, 0.014], c: ['#3c4035', '#6b6e5a', '#e6e2d3', '#4f5244'], pat: ['mottle:#2a2c24'] },
  gamulchi: { depth: 0.19, peak: 0.5, head: 'flat', tail: 'round', tk: 0.7, dorsal: [0.3, 0.96, 0.3, 'low'], anal: [0.55, 0.96, 0.28, 'low'], mouth: 'big', eye: [0.08, 0.22, 0.018], c: ['#3d3926', '#8a7c54', '#d8cfae', '#4c4630'], pat: ['blotch:#262214:2'] },
  ssogari: { depth: 0.3, peak: 0.38, head: 'point', tail: 'round', tk: 0.75, dorsal: [0.26, 0.82, 0.42, 'spiny'], anal: [0.64, 0.8, 0.36, 'soft'], mouth: 'big', eye: [0.12, 0.2, 0.028], c: ['#76612f', '#c9a85a', '#efe3bd', '#a68a48'], pat: ['rosette:#3e2c14'] },
  jangeo: { depth: 0.1, tail: 'eel', mouth: 'small', eye: [0.04, 0.2, 0.012], c: ['#384836', '#5d6e4e', '#dcdfca', '#4a5a3e'], pat: [] },
  // 🏞️ 강 (v368) — 버들치 · 참갈겨니 · 모래무지 · 참마자 · 꺽지 · 동사리 · 산천어 · 어름치
  beodeulchi: { depth: 0.21, peak: 0.42, head: 'round', tail: 'fork', tk: 0.75, dorsal: [0.46, 0.58, 0.45, 'soft'], anal: [0.66, 0.78, 0.38, 'soft'], mouth: 'small', eye: [0.11, 0.2, 0.028], c: ['#5c5a3c', '#a29f78', '#ece8d2', '#a9a27c'], pat: ['speck:#35331f:26', 'stripe:#3c3a26:.35'] },
  chamgal: { depth: 0.23, peak: 0.42, head: 'point', tail: 'fork', tk: 0.9, dorsal: [0.44, 0.56, 0.5, 'soft'], anal: [0.62, 0.8, 0.5, 'soft'], mouth: 'small', eye: [0.1, 0.2, 0.034], c: ['#40573f', '#a3b9a2', '#f1ede0', '#d9c06f'], pat: ['band:#2a3a55', 'sheen:#d39a82'] },
  moraemuji: { depth: 0.18, peak: 0.36, head: 'point', tail: 'fork', tk: 0.8, dorsal: [0.34, 0.5, 0.6, 'soft'], anal: [0.7, 0.8, 0.35, 'soft'], barbels: [1, 0.04], mouth: 'small', eye: [0.17, 0.12, 0.028], c: ['#8a7a58', '#cdbb92', '#f2ead6', '#c2b088'], pat: ['blotch:#5b4a30', 'speck:#6b5a3c:20'] },
  chammaja: { depth: 0.21, peak: 0.4, head: 'point', tail: 'fork', tk: 0.85, dorsal: [0.38, 0.52, 0.55, 'soft'], anal: [0.68, 0.8, 0.4, 'soft'], barbels: [1, 0.04], mouth: 'small', eye: [0.14, 0.17, 0.026], c: ['#5b6a70', '#c8d0d2', '#f2f4f3', '#b9c1c3'], pat: ['dots:#3d464a:12', 'speck:#4a5357:14'] },
  kkeokji: { depth: 0.34, peak: 0.36, head: 'round', tail: 'round', tk: 0.75, dorsal: [0.28, 0.84, 0.4, 'spiny'], anal: [0.64, 0.8, 0.36, 'soft'], mouth: 'big', eye: [0.12, 0.2, 0.03], c: ['#4e5432', '#8f8f5c', '#d9d4b0', '#6e7046'], pat: ['bars:#33361e:.3:6', 'ear:#1f3a5a'] },
  dongsari: { depth: 0.24, peak: 0.3, head: 'flat', tail: 'round', tk: 0.7, dorsal: [0.36, 0.72, 0.42, 'soft'], anal: [0.6, 0.8, 0.35, 'soft'], mouth: 'wide', eye: [0.1, 0.24, 0.022], c: ['#4a3c2a', '#8a7254', '#d8c9a8', '#5e4c34'], pat: ['blotch:#2e2416', 'mottle:#3a2e1e'] },
  sancheoneo: { depth: 0.27, peak: 0.42, head: 'round', tail: 'notch', tk: 0.85, dorsal: [0.4, 0.52, 0.5, 'soft'], anal: [0.66, 0.78, 0.4, 'soft'], adipose: [0.74, 0.8], mouth: 'big', eye: [0.11, 0.19, 0.03], c: ['#4a5a48', '#a9b6a2', '#f1ede6', '#9fa58f'], pat: ['bars:#5b5f8c:.3:8', 'speck:#2c3328:18', 'sheen:#e7a7a0'] },
  eoreumchi: { depth: 0.24, peak: 0.4, head: 'point', tail: 'fork', tk: 0.88, dorsal: [0.38, 0.52, 0.55, 'soft'], anal: [0.68, 0.8, 0.4, 'soft'], barbels: [1, 0.04], mouth: 'small', eye: [0.13, 0.17, 0.026], c: ['#6b6a4a', '#cfc9a2', '#f4f0dc', '#c9bf86'], pat: ['speck:#2a2a1e:46'] },
};

// ───────────── 물고기 ─────────────

/** 정해진 난수 — 무늬 자리가 그릴 때마다 같게 (mulberry32) */
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const seedOfKey = (k) => [...String(k)].reduce((h, ch) => (Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0), 2166136261);
const lerp = (a, b, t) => a + (b - a) * t;

/** 몸 윤곽 — 주둥이가 왼쪽(x0) · 꼬리자루가 x0+Lb */
function body(lk, L) {
  const Lb = L * 0.8;
  const hd = (L * lk.depth) / 2;
  const x0 = -L / 2;
  const pk = lk.peak;
  const ped = hd * 0.24;
  const sy = hd * 0.06;
  const headK = lk.head === 'point' ? 0.3 : lk.head === 'flat' ? 0.45 : 0.72;
  const p = new Path2D();
  p.moveTo(x0, sy);
  p.bezierCurveTo(x0 + Lb * 0.03, sy - hd * headK, x0 + Lb * Math.max(0.06, pk - 0.2), -hd, x0 + Lb * pk, -hd);
  p.bezierCurveTo(x0 + Lb * (pk + 0.26), -hd, x0 + Lb * 0.86, -ped * 1.35, x0 + Lb, -ped);
  p.lineTo(x0 + Lb, ped);
  const bp = lk.head === 'flat' ? 0.4 : 0.46;
  const bl = lk.head === 'flat' ? 0.92 : 1;
  p.bezierCurveTo(x0 + Lb * 0.86, ped * 1.5, x0 + Lb * (bp + 0.26), hd * bl, x0 + Lb * bp, hd * bl);
  p.bezierCurveTo(x0 + Lb * (bp - 0.26), hd * bl, x0 + Lb * 0.03, sy + hd * (lk.head === 'flat' ? 0.4 : 0.6), x0, sy);
  p.closePath();
  return { p, x0, Lb, hd, ped, sy };
}
/** 등·배 윤곽의 어림 높이 (지느러미 뿌리 자리용) — f = 주둥이 0 ~ 꼬리자루 1 */
function edgeY(lk, b, f, top) {
  const pk = top ? lk.peak : (lk.head === 'flat' ? 0.4 : 0.46);
  const end = b.ped / b.hd;
  const v = f <= pk ? Math.sin((f / pk) * Math.PI / 2) : lerp(1, end, Math.pow((f - pk) / (1 - pk), 1.4));
  return (top ? -1 : 1) * b.hd * Math.max(0.15, v);
}
function finPath(lk, b, spec, top) {
  const [a, z, h, kind] = spec;
  const p = new Path2D();
  const xa = b.x0 + b.Lb * a;
  const xz = b.x0 + b.Lb * z;
  const ya = edgeY(lk, b, a, top) * 0.86;
  const yz = edgeY(lk, b, z, top) * 0.86;
  const s = top ? -1 : 1;
  const H = b.hd * h;
  p.moveTo(xa, ya);
  if (kind === 'spiny') {
    // 앞은 가시(톱니) · 뒤는 부드러운 지느러미
    const mid = lerp(xa, xz, 0.55);
    const n = 6;
    for (let i = 1; i <= n; i++) {
      const x = lerp(xa, mid, i / n);
      const yb = lerp(ya, lerp(ya, yz, 0.55), i / n);
      p.lineTo(x - (mid - xa) / n / 2, yb + s * H * (0.75 + 0.25 * Math.sin(i)));
      p.lineTo(x, yb + s * H * 0.35);
    }
    p.quadraticCurveTo(lerp(mid, xz, 0.4), lerp(ya, yz, 0.75) + s * H * 1.05, xz, yz);
  } else if (kind === 'spine') {
    p.lineTo(xa + (xz - xa) * 0.15, ya + s * H);
    p.quadraticCurveTo(xz, ya + s * H * 0.6, xz, yz);
  } else if (kind === 'low') {
    p.quadraticCurveTo(xa + (xz - xa) * 0.1, ya + s * H, xa + (xz - xa) * 0.3, lerp(ya, yz, 0.3) + s * H);
    p.lineTo(xz - (xz - xa) * 0.05, yz + s * H * 0.9);
    p.quadraticCurveTo(xz + b.hd * 0.1, yz + s * H * 0.4, xz, yz);
  } else {
    p.quadraticCurveTo(xa + (xz - xa) * 0.15, ya + s * H * 1.1, xa + (xz - xa) * 0.4, lerp(ya, yz, 0.4) + s * H);
    p.quadraticCurveTo(xz, yz + s * H * 0.5, xz, yz);
  }
  p.closePath();
  return p;
}
function tailPath(lk, b, L) {
  const Lt = L - b.Lb;
  const p = new Path2D();
  const H = b.hd * (lk.tk || 0.85);
  p.moveTo(0, -b.ped);
  if (lk.tail === 'round') {
    p.bezierCurveTo(Lt * 0.6, -H * 1.05, Lt * 1.05, -H * 0.7, Lt * 1.05, 0);
    p.bezierCurveTo(Lt * 1.05, H * 0.7, Lt * 0.6, H * 1.05, 0, b.ped);
  } else {
    const notch = lk.tail === 'notch' ? 0.82 : 0.5;
    p.quadraticCurveTo(Lt * 0.5, -H * 0.55, Lt, -H);
    p.quadraticCurveTo(Lt * (notch + 0.1), -H * 0.3, Lt * notch, 0);
    p.quadraticCurveTo(Lt * (notch + 0.1), H * 0.3, Lt, H);
    p.quadraticCurveTo(Lt * 0.5, H * 0.55, 0, b.ped);
  }
  p.closePath();
  return p;
}
function patterns(ctx, lk, b, key, detail) {
  const rnd = seeded(seedOfKey(key));
  const { x0, Lb, hd } = b;
  for (const spec of lk.pat || []) {
    const [kind, col, a1, a2] = spec.split(':');
    if (kind === 'scales' && detail) {
      ctx.strokeStyle = 'rgba(40,30,10,.22)';
      ctx.lineWidth = Math.max(0.6, hd * 0.03);
      const s = hd * 0.3;
      for (let row = -3; row <= 3; row++) {
        const y = row * s * 0.82;
        for (let x = x0 + Lb * 0.22 + (row & 1 ? s * 0.45 : 0); x < x0 + Lb * 0.98; x += s * 0.9) {
          ctx.beginPath();
          ctx.arc(x, y, s * 0.55, -Math.PI / 2.2, Math.PI / 2.2);
          ctx.stroke();
        }
      }
    } else if (kind === 'scaleEdge' && detail) {
      ctx.fillStyle = 'rgba(40,40,30,.18)';
      for (let i = 0; i < 26; i++) {
        const x = lerp(x0 + Lb * 0.22, x0 + Lb * 0.95, rnd());
        const y = lerp(-hd * 0.7, hd * 0.5, rnd());
        ctx.beginPath(); ctx.arc(x, y, hd * 0.07, 0, Math.PI); ctx.fill();
      }
    } else if (kind === 'stripe' || kind === 'thinline' || kind === 'band') {
      ctx.fillStyle = col;
      ctx.globalAlpha = kind === 'stripe' ? Number(a1) || 0.4 : kind === 'band' ? 0.7 : 0.75;
      const from = kind === 'thinline' ? 0.55 : 0.18;
      const th = kind === 'thinline' ? hd * 0.06 : kind === 'band' ? hd * 0.26 : hd * 0.16;
      if (kind === 'band') {
        // 배스 — 들쭉날쭉한 옆줄 띠
        ctx.beginPath();
        ctx.moveTo(x0 + Lb * from, -th / 2);
        for (let i = 0; i <= 10; i++) ctx.lineTo(lerp(x0 + Lb * from, x0 + Lb, i / 10), -th / 2 - (rnd() - 0.5) * th * 0.8);
        for (let i = 10; i >= 0; i--) ctx.lineTo(lerp(x0 + Lb * from, x0 + Lb, i / 10), th / 2 + (rnd() - 0.5) * th * 0.8);
        ctx.closePath(); ctx.fill();
      } else ctx.fillRect(x0 + Lb * from, -th / 2 - hd * 0.04, Lb * (1 - from), th);
      ctx.globalAlpha = 1;
    } else if (kind === 'bars') {
      const n = Number(a2) || 7;
      ctx.fillStyle = col;
      ctx.globalAlpha = Number(a1) || 0.35;
      for (let i = 0; i < n; i++) {
        const x = lerp(x0 + Lb * 0.24, x0 + Lb * 0.92, (i + 0.5) / n);
        ctx.fillRect(x - Lb * 0.022, -hd, Lb * 0.044, hd * 2);
      }
      ctx.globalAlpha = 1;
    } else if (kind === 'sheen') {
      const g = ctx.createLinearGradient(0, -hd, 0, hd);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.42, col);
      g.addColorStop(0.6, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(x0, -hd, Lb, hd * 2);
      ctx.globalAlpha = 1;
    } else if (kind === 'ear') {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.ellipse(x0 + Lb * 0.25, -hd * 0.12, hd * 0.16, hd * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    } else if (kind === 'dots') {
      const n = Number(a1) || 8;
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.55;
      for (let i = 0; i < n; i++) {
        ctx.beginPath(); ctx.arc(lerp(x0 + Lb * 0.28, x0 + Lb * 0.92, i / (n - 1)), -hd * 0.06, hd * 0.07, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (kind === 'rosette') {
      // 쏘가리 — 금빛 바탕에 갈색 매화 무늬
      for (let i = 0; i < 34; i++) {
        const x = lerp(x0 + Lb * 0.06, x0 + Lb * 0.98, rnd());
        const y = lerp(-hd * 0.9, hd * 0.5, rnd());
        const r = hd * lerp(0.06, 0.15, rnd());
        ctx.fillStyle = col;
        ctx.globalAlpha = 0.75;
        ctx.beginPath(); ctx.ellipse(x, y, r * 1.2, r, rnd() * 3, 0, Math.PI * 2); ctx.fill();
        if (detail && r > hd * 0.1) { ctx.globalAlpha = 0.5; ctx.fillStyle = '#d9bd72'; ctx.beginPath(); ctx.arc(x, y, r * 0.4, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.globalAlpha = 1;
    } else if (kind === 'blotch') {
      const rows = Number(a1) || 1;
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.72;
      for (let r = 0; r < rows; r++) {
        for (let i = 0; i < 7; i++) {
          const x = lerp(x0 + Lb * 0.18, x0 + Lb * 0.95, (i + 0.3 + rnd() * 0.4) / 7);
          const y = rows === 1 ? lerp(-hd * 0.5, hd * 0.1, rnd()) : (r === 0 ? -hd * 0.45 : hd * 0.12) + (rnd() - 0.5) * hd * 0.2;
          ctx.beginPath(); ctx.ellipse(x, y, Lb * lerp(0.035, 0.06, rnd()), hd * lerp(0.2, 0.36, rnd()), rnd() - 0.5, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    } else if (kind === 'speck') {
      // 작은 점 흩뿌림 (v368 — 버들치·산천어·어름치) — 등~옆 · 정해진 난수라 그릴 때마다 같은 자리
      const n = Number(a1) || 20;
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.6;
      for (let i = 0; i < n; i++) {
        ctx.beginPath(); ctx.arc(lerp(x0 + Lb * 0.12, x0 + Lb * 0.95, rnd()), lerp(-hd * 0.85, hd * 0.25, rnd()), hd * lerp(0.035, 0.075, rnd()), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (kind === 'mottle') {
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.35;
      for (let i = 0; i < (detail ? 40 : 14); i++) {
        ctx.beginPath(); ctx.ellipse(lerp(x0 + Lb * 0.1, x0 + Lb, rnd()), lerp(-hd, hd * 0.3, rnd()), hd * lerp(0.08, 0.22, rnd()), hd * lerp(0.06, 0.14, rnd()), rnd() * 3, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }
}
function face(ctx, lk, b, L, detail) {
  const { x0, Lb, hd, sy } = b;
  const [ex, ey, er] = lk.eye;
  const r = Math.max(1.2, L * er);
  const cx = x0 + Lb * ex;
  const cy = -hd * ey;
  // 아가미 뚜껑
  if (detail) {
    ctx.strokeStyle = 'rgba(30,25,15,.28)';
    ctx.lineWidth = Math.max(0.6, hd * 0.035);
    ctx.beginPath(); ctx.arc(x0 + Lb * 0.12, sy, hd * 0.8, -0.9, 0.9); ctx.stroke();
    // 옆줄
    ctx.strokeStyle = 'rgba(255,255,255,.22)';
    ctx.beginPath(); ctx.moveTo(x0 + Lb * 0.22, -hd * 0.12); ctx.quadraticCurveTo(x0 + Lb * 0.6, -hd * 0.04, x0 + Lb, 0); ctx.stroke();
  }
  // 입
  ctx.strokeStyle = 'rgba(20,15,10,.6)';
  ctx.lineWidth = Math.max(0.7, hd * 0.04);
  ctx.beginPath();
  if (lk.mouth === 'big') { ctx.moveTo(x0, sy); ctx.lineTo(x0 + Lb * 0.1, sy + hd * 0.12); } else if (lk.mouth === 'wide') { ctx.moveTo(x0, sy + hd * 0.05); ctx.lineTo(x0 + Lb * 0.06, sy + hd * 0.1); } else if (lk.mouth === 'up') { ctx.moveTo(x0, sy - hd * 0.05); ctx.lineTo(x0 + Lb * 0.035, sy - hd * 0.16); } else { ctx.moveTo(x0 + Lb * 0.005, sy + hd * 0.02); ctx.lineTo(x0 + Lb * 0.03, sy + hd * 0.06); }
  ctx.stroke();
  // 수염
  if (lk.barbels) {
    const [pairs, len] = lk.barbels;
    ctx.strokeStyle = lk.c[3];
    ctx.lineWidth = Math.max(0.7, hd * 0.035);
    for (let i = 0; i < pairs; i++) {
      const l = L * len * (i === 0 ? 1 : 0.6);
      const y0 = sy + hd * (0.04 + i * 0.06);
      ctx.beginPath(); ctx.moveTo(x0 + Lb * 0.01, y0);
      ctx.quadraticCurveTo(x0 - l * 0.35, y0 + l * (0.3 + i * 0.12), x0 - l * 0.05 + i * hd * 0.15, y0 + l * (0.75 + i * 0.1));
      ctx.stroke();
    }
  }
  // 눈 — 금빛·은빛 홍채 + 검은 눈동자 + 빛
  ctx.fillStyle = lk.key === 'ssogari' || lk.key === 'bass' ? '#d8b55a' : '#d6d0b4';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#121212';
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.62, 0, Math.PI * 2); ctx.fill();
  if (detail) { ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(cx - r * 0.25, cy - r * 0.25, r * 0.22, 0, Math.PI * 2); ctx.fill(); }
}
function drawEel(ctx, lk, L, opts) {
  const N = 18;
  const top = [];
  const bot = [];
  const amp = L * 0.035;
  const ph = opts.wag ? opts.wag * 8 : 0;
  for (let i = 0; i <= N; i++) {
    const f = i / N;
    const x = -L / 2 + L * f;
    const y = Math.sin(ph + f * 6) * amp * f;
    const th = L * 0.05 * (f < 0.06 ? 0.55 + f * 7 : 1 - 0.8 * Math.pow(f, 1.6));
    top.push([x, y - th]);
    bot.push([x, y + th * 0.95]);
  }
  const p = new Path2D();
  p.moveTo(top[0][0], (top[0][1] + bot[0][1]) / 2);
  for (const [x, y] of top) p.lineTo(x, y);
  for (let i = bot.length - 1; i >= 0; i--) p.lineTo(bot[i][0], bot[i][1]);
  p.closePath();
  if (opts.shadow) { ctx.fillStyle = opts.shadow; ctx.fill(p); return; }
  // 등·배 이어진 지느러미 테두리
  ctx.strokeStyle = lk.c[3];
  ctx.lineWidth = Math.max(1, L * 0.012);
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  for (let i = 6; i <= N; i++) ctx.lineTo(top[i][0], top[i][1] - L * 0.006);
  for (let i = N; i >= 9; i--) ctx.lineTo(bot[i][0], bot[i][1] + L * 0.006);
  ctx.stroke();
  ctx.globalAlpha = 1;
  const g = ctx.createLinearGradient(0, -L * 0.05, 0, L * 0.05);
  g.addColorStop(0, lk.c[0]); g.addColorStop(0.45, lk.c[1]); g.addColorStop(0.7, lk.c[2]); g.addColorStop(1, lk.c[2]);
  ctx.fillStyle = g;
  ctx.fill(p);
  // 가슴지느러미 · 눈 · 입
  ctx.fillStyle = lk.c[3];
  ctx.globalAlpha = 0.8;
  ctx.beginPath(); ctx.ellipse(-L / 2 + L * 0.1, top[2][1] + L * 0.04, L * 0.018, L * 0.01, 0.5, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#d6d0b4';
  ctx.beginPath(); ctx.arc(-L / 2 + L * 0.035, top[1][1] + L * 0.022, Math.max(1, L * 0.008), 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.arc(-L / 2 + L * 0.035, top[1][1] + L * 0.022, Math.max(0.7, L * 0.005), 0, Math.PI * 2); ctx.fill();
}

/**
 * 물고기 한 마리 — (x, y)가 몸 가운데 · L = 전체 길이(px) · 주둥이는 왼쪽(opts.flip이면 오른쪽)
 * opts.wag 꼬리 흔들기(라디안) · opts.pitch 몸 기울기 · opts.shadow 그림자 색(있으면 실루엣만) · opts.alpha
 */
export function drawFish(ctx, key, x, y, L, opts = {}) {
  const lk0 = LOOKS[key];
  if (!lk0 || !(L > 2)) return;
  const lk = { ...lk0, key };
  ctx.save();
  ctx.translate(x, y);
  if (opts.flip) ctx.scale(-1, 1);
  if (opts.pitch) ctx.rotate(opts.pitch);
  if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
  if (lk.tail === 'eel') { drawEel(ctx, lk, L, opts); ctx.restore(); return; }
  const detail = L >= 70 && !opts.shadow;
  const b = body(lk, L);
  const wag = Number(opts.wag) || 0;
  const tail = tailPath(lk, b, L);
  if (opts.shadow) {
    ctx.fillStyle = opts.shadow;
    ctx.fill(b.p);
    ctx.save(); ctx.translate(b.x0 + b.Lb - 1, 0); ctx.rotate(wag); ctx.fill(tail); ctx.restore();
    ctx.restore();
    return;
  }
  // 지느러미(몸 뒤) → 꼬리 → 몸 → 무늬 → 가슴지느러미 → 얼굴
  ctx.fillStyle = lk.c[3];
  const fa = ctx.globalAlpha;
  ctx.globalAlpha = fa * 0.88;
  if (lk.dorsal) ctx.fill(finPath(lk, b, lk.dorsal, true));
  if (lk.anal) ctx.fill(finPath(lk, b, lk.anal, false));
  if (lk.adipose) {
    const [a, z] = lk.adipose;
    const ya = edgeY(lk, b, a, true) * 0.9;
    ctx.beginPath(); ctx.moveTo(b.x0 + b.Lb * a, ya); ctx.quadraticCurveTo(b.x0 + b.Lb * (a + z) / 2, ya - b.hd * 0.4, b.x0 + b.Lb * z, edgeY(lk, b, z, true) * 0.9); ctx.fill();
  }
  // 배지느러미
  ctx.beginPath();
  const pv = b.x0 + b.Lb * 0.45;
  ctx.moveTo(pv, b.hd * 0.8); ctx.lineTo(pv + b.Lb * 0.09, b.hd * 1.25); ctx.lineTo(pv + b.Lb * 0.1, b.hd * 0.78); ctx.fill();
  ctx.save(); ctx.translate(b.x0 + b.Lb - 1, 0); ctx.rotate(wag); ctx.fill(tail);
  if (detail) {
    ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 0.8;
    for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(0, i * b.ped * 0.3); ctx.lineTo((L - b.Lb) * 0.9, i * b.hd * 0.24); ctx.stroke(); }
  }
  ctx.restore();
  ctx.globalAlpha = fa;
  const g = ctx.createLinearGradient(0, -b.hd, 0, b.hd);
  g.addColorStop(0, lk.c[0]); g.addColorStop(0.38, lk.c[1]); g.addColorStop(0.72, lk.c[2]); g.addColorStop(1, lk.c[2]);
  ctx.fillStyle = g;
  ctx.fill(b.p);
  ctx.save();
  ctx.clip(b.p);
  patterns(ctx, lk, b, key, detail);
  // 위에서 오는 빛 — 등은 어둡게 배는 밝게(입체)
  const sh = ctx.createLinearGradient(0, -b.hd, 0, b.hd);
  sh.addColorStop(0, 'rgba(0,0,0,.18)'); sh.addColorStop(0.5, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(255,255,255,.1)');
  ctx.fillStyle = sh;
  ctx.fillRect(b.x0, -b.hd, b.Lb, b.hd * 2);
  ctx.restore();
  // 가슴지느러미
  ctx.fillStyle = lk.c[3];
  ctx.globalAlpha = fa * 0.7;
  ctx.beginPath(); ctx.ellipse(b.x0 + b.Lb * 0.24, b.hd * 0.4, b.Lb * 0.075, b.hd * 0.16, 0.5 + wag * 0.5, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = fa;
  face(ctx, lk, b, L, detail);
  ctx.restore();
}

// ───────────── 하늘·물가 (한 장에 그려 둠) ─────────────

const mix = (h1, h2, t) => {
  const a = parseInt(h1.slice(1), 16);
  const b = parseInt(h2.slice(1), 16);
  const ch = (s) => Math.round(lerp((a >> s) & 255, (b >> s) & 255, t));
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
};
/** 하늘 색 — t = 오늘 낚시 시간의 몫(0 아침 → 0.6 한낮 → 1 노을) */
export function skyOf(t) {
  const k = Math.min(1, Math.max(0, Number(t) || 0));
  const A = { top: '#8ec8e2', low: '#f3e4c4', hill: '#9db7ad', sun: '#ffe3a0' };
  const B = { top: '#79b8dc', low: '#eef3e6', hill: '#93ae9f', sun: '#fff1c2' };
  const C = { top: '#56679a', low: '#f4a067', hill: '#8a8492', sun: '#ff9b52' };
  const [p, q, u] = k < 0.6 ? [A, B, k / 0.6] : [B, C, (k - 0.6) / 0.4];
  return { top: mix(p.top, q.top, u), low: mix(p.low, q.low, u), hill: mix(p.hill, q.hill, u), sun: mix(p.sun, q.sun, u), k };
}
/** 해 자리 — 오른쪽 위에서 오른쪽 물가로 기운다 */
export function sunAt(t) {
  const k = Math.min(1, Math.max(0, Number(t) || 0));
  return { x: lerp(700, 905, k), y: lerp(58, 186, k * k), r: lerp(24, 34, k) };
}
/** 🌦️ 날씨마다 하늘을 덮는 회색 막 (흐림·비 — 해도 그 밑에 흐려진다 · 비는 해를 안 그린다) */
const WX_VEIL = { cloud: 'rgba(118,128,140,.34)', rain: 'rgba(92,102,116,.5)' };
const CLOUDS = [[180, 70, 1], [470, 44, 0.8], [880, 110, 0.7]];
const MORE_CLOUDS = [[60, 40, 1.2], [330, 86, 1.1], [640, 64, 1.3], [760, 30, 0.9], [1010, 70, 1.1]];
function cloud(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.ellipse(cx, cy, 52 * s, 14 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(cx - 24 * s, cy - 8 * s, 26 * s, 14 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + 20 * s, cy - 10 * s, 30 * s, 16 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}
/**
 * 안 움직이는 층 — ctx는 이미 가상 좌표로 맞춰 둔 것 · x0~x1·y0~y1 = 화면에 보이는 가상 좌표 넓이(가장자리까지 채우려고)
 * wx = 🌦️ 날씨 key (sun · cloud · rain · wind — fishing.WEATHER) · place = 물가 ('lake' 저수지 · 'river' 강 — v368: 잔교 대신 큰 바위·자갈 · 연잎·갈대 대신 강가 바위 · 수초 대신 물속 바위 · 맑은 물빛)
 */
export function paintStatic(ctx, t, x0 = 0, x1 = SCENE_W, y0 = 0, y1 = SCENE_H, wx = 'sun', place = 'lake') {
  const river = place === 'river';
  const sky = skyOf(t);
  const sun = sunAt(t);
  const veil = WX_VEIL[wx] || '';
  // 하늘
  const g = ctx.createLinearGradient(0, y0, 0, WATER_Y);
  g.addColorStop(0, sky.top); g.addColorStop(1, sky.low);
  ctx.fillStyle = g;
  ctx.fillRect(x0, y0, x1 - x0, WATER_Y - y0 + 1);
  // 해 · 햇무리 (비 오는 날은 없음)
  if (wx !== 'rain') {
    const halo = ctx.createRadialGradient(sun.x, sun.y, sun.r * 0.5, sun.x, sun.y, sun.r * 4);
    halo.addColorStop(0, 'rgba(255,240,200,.55)'); halo.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(sun.x - sun.r * 4, sun.y - sun.r * 4, sun.r * 8, sun.r * 8);
    ctx.fillStyle = sky.sun;
    ctx.beginPath(); ctx.arc(sun.x, sun.y, sun.r, 0, Math.PI * 2); ctx.fill();
  }
  if (veil) { ctx.fillStyle = veil; ctx.fillRect(x0, y0, x1 - x0, WATER_Y - y0 + 1); }
  // 구름 셋 (흐림·비는 잿빛 구름이 더)
  ctx.fillStyle = `rgba(255,255,255,${lerp(0.75, 0.45, sky.k)})`;
  for (const [cx, cy, s] of CLOUDS) cloud(ctx, cx, cy, s);
  if (veil) {
    ctx.fillStyle = wx === 'rain' ? 'rgba(150,158,168,.85)' : 'rgba(205,210,216,.8)';
    for (const [cx, cy, s] of MORE_CLOUDS) cloud(ctx, cx, cy, s);
  }
  // 먼 산 · 가까운 산 · 숲 줄
  ctx.fillStyle = sky.hill;
  ctx.beginPath(); ctx.moveTo(x0, 176);
  for (const [x, y] of [[60, 150], [170, 118], [290, 150], [420, 108], [560, 146], [700, 116], [830, 150], [960, 128], [1100, 150]]) ctx.lineTo(x, y);
  ctx.lineTo(x1, 160); ctx.lineTo(x1, WATER_Y); ctx.lineTo(x0, WATER_Y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = mix('#6f927d', '#5d5f6e', sky.k);
  ctx.beginPath(); ctx.moveTo(x0, 190);
  for (const [x, y] of [[90, 168], [230, 184], [380, 160], [520, 182], [650, 166], [800, 186], [930, 170], [1090, 184]]) ctx.lineTo(x, y);
  ctx.lineTo(x1, 186); ctx.lineTo(x1, WATER_Y); ctx.lineTo(x0, WATER_Y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = mix('#3f6247', '#3a3d45', sky.k);
  ctx.beginPath(); ctx.moveTo(x0, WATER_Y);
  for (let x = Math.floor(x0 / 18) * 18; x <= x1 + 18; x += 18) ctx.quadraticCurveTo(x + 9, 192 - ((x * 7) % 11), x + 18, 200);
  ctx.lineTo(x1, WATER_Y); ctx.closePath(); ctx.fill();
  // 물 — 윗면은 하늘을 비추고 아래로 깊어진다
  const w = ctx.createLinearGradient(0, WATER_Y, 0, y1);
  if (river) { w.addColorStop(0, mix('#78bdb6', '#8a8aa0', sky.k * 0.7)); w.addColorStop(0.06, '#4f9d97'); w.addColorStop(0.45, '#2c706b'); w.addColorStop(1, '#10403d'); }
  else { w.addColorStop(0, mix('#5aa5b3', '#7b7c9a', sky.k * 0.7)); w.addColorStop(0.06, '#3d8a98'); w.addColorStop(0.45, '#1f5f6c'); w.addColorStop(1, '#0b3540'); }
  ctx.fillStyle = w;
  ctx.fillRect(x0, WATER_Y, x1 - x0, y1 - WATER_Y);
  // 산 그림자 비침
  ctx.fillStyle = 'rgba(20,60,50,.18)';
  ctx.fillRect(x0, WATER_Y, x1 - x0, 14);
  // 바닥 · 자갈 · 돌
  const bg = ctx.createLinearGradient(0, 505, 0, Math.max(y1, SCENE_H));
  bg.addColorStop(0, '#6a6544'); bg.addColorStop(0.35, '#4c4a33'); bg.addColorStop(1, '#1d241c');
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.moveTo(x0, bottomY(x0));
  for (let x = x0; x <= x1; x += 32) ctx.lineTo(x, bottomY(x) + Math.sin(x * 0.05) * 4);
  ctx.lineTo(x1, y1); ctx.lineTo(x0, y1); ctx.closePath(); ctx.fill();
  const rnd = seeded(7);
  ctx.fillStyle = river ? 'rgba(190,182,150,.6)' : 'rgba(160,150,110,.5)';
  for (let i = 0; i < (river ? 150 : 70); i++) { const x = lerp(x0, x1, rnd()); ctx.beginPath(); ctx.ellipse(x, bottomY(x) + 6 + rnd() * 20, 2 + rnd() * 4, 1.5 + rnd() * 2, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#3a3a2c';
  for (const [x, rx, ry] of [[420, 30, 16], [860, 40, 20], [960, 22, 12]]) { ctx.beginPath(); ctx.ellipse(x, bottomY(x) + 4, rx, ry, 0, Math.PI, 0); ctx.fill(); }
  if (river) { riverBank(ctx, x0, x1); if (veil) { ctx.fillStyle = wx === 'rain' ? 'rgba(70,80,92,.22)' : 'rgba(90,100,112,.14)'; ctx.fillRect(x0, WATER_Y, x1 - x0, y1 - WATER_Y); } return; }
  // 연잎 (물 윗면)
  ctx.fillStyle = '#4f7d3c';
  for (const [x, s] of [[850, 1], [884, 0.7], [610, 0.6]]) { ctx.beginPath(); ctx.ellipse(x, WATER_Y + 1, 18 * s, 4 * s, 0, 0.25, Math.PI * 2); ctx.lineTo(x, WATER_Y + 1); ctx.fill(); }
  // 잔교 — 기둥(물속은 물빛으로 흐리게) · 널
  for (const px of [28, 120, 212]) {
    ctx.fillStyle = '#6e5233';
    ctx.fillRect(px, DOCK_Y, 12, WATER_Y - DOCK_Y);
    ctx.fillStyle = 'rgba(70,58,40,.75)';
    ctx.fillRect(px, WATER_Y, 12, bottomY(px) - WATER_Y + 6);
  }
  ctx.fillStyle = '#a57d4d';
  ctx.fillRect(x0, DOCK_Y - 10, DOCK_X - x0, 12);
  ctx.fillStyle = '#8a663d';
  ctx.fillRect(x0, DOCK_Y + 2, DOCK_X - x0, 5);
  ctx.strokeStyle = 'rgba(60,40,20,.35)';
  ctx.lineWidth = 1;
  for (let x = Math.floor(x0 / 34) * 34; x < DOCK_X; x += 34) { ctx.beginPath(); ctx.moveTo(x, DOCK_Y - 10); ctx.lineTo(x, DOCK_Y + 2); ctx.stroke(); }
  // 오른쪽 갈대 · 부들
  ctx.strokeStyle = '#4f6a34';
  ctx.lineWidth = 3;
  for (let i = 0; i < 16; i++) {
    const bx = 952 + i * 6 + ((i * 13) % 7);
    const h = 70 + ((i * 29) % 50);
    ctx.beginPath(); ctx.moveTo(bx, WATER_Y + 8); ctx.quadraticCurveTo(bx - 6, WATER_Y - h / 2, bx - 10 + (i % 3) * 4, WATER_Y - h); ctx.stroke();
  }
  ctx.fillStyle = '#6b4a2a';
  for (const [bx, h] of [[960, 96], [984, 110], [1004, 88]]) { ctx.beginPath(); ctx.ellipse(bx - 8, WATER_Y - h + 10, 4, 12, -0.15, 0, Math.PI * 2); ctx.fill(); }
  // 흐림·비 — 물빛도 조금 잿빛으로
  if (veil) { ctx.fillStyle = wx === 'rain' ? 'rgba(70,80,92,.22)' : 'rgba(90,100,112,.14)'; ctx.fillRect(x0, WATER_Y, x1 - x0, y1 - WATER_Y); }
}

/** 🏞️ 강가 (v368) — 캐릭터가 서는 넓적한 큰 바위(잔교 자리 · 윗면 = 잔교 윗면) · 물가 자갈 · 건너편 바위 · 물속 바위(14m 「바위 밑」) */
function riverBank(ctx, x0, x1) {
  const top = DOCK_Y - 10;
  // 물속 바위 무리 (바위 밑)
  for (const [x, rx, ry, c] of [[700, 46, 30, '#4f5348'], [752, 34, 24, '#5a5e52'], [800, 52, 34, '#4a4e43'], [846, 30, 20, '#565a4e']]) {
    const by = bottomY(x) + 6;
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(x, by, rx, ry, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = 'rgba(200,220,210,.12)';
    ctx.beginPath(); ctx.ellipse(x - rx * 0.25, by - ry * 0.7, rx * 0.45, ry * 0.18, -0.2, 0, Math.PI * 2); ctx.fill();
  }
  // 캐릭터가 서는 큰 바위 — 물 위 · 물속(물빛으로 흐리게)
  ctx.fillStyle = 'rgba(70,74,64,.45)'; // 물속은 물빛이 비치게 옅게 · 아래로 갈수록 퍼지는 바위 밑동
  ctx.beginPath(); ctx.moveTo(x0, WATER_Y); ctx.lineTo(DOCK_X + 24, WATER_Y); ctx.quadraticCurveTo(DOCK_X + 70, WATER_Y + 120, DOCK_X + 46, bottomY(DOCK_X + 46) + 8); ctx.lineTo(x0, bottomY(x0) + 8); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#7f7c70';
  ctx.beginPath(); ctx.moveTo(x0, top + 2); ctx.lineTo(DOCK_X - 26, top); ctx.quadraticCurveTo(DOCK_X + 6, top + 2, DOCK_X + 22, WATER_Y + 2); ctx.lineTo(x0, WATER_Y + 2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#9d9a8d';
  ctx.beginPath(); ctx.moveTo(x0, top + 2); ctx.lineTo(DOCK_X - 26, top); ctx.quadraticCurveTo(DOCK_X - 6, top + 1, DOCK_X + 2, top + 8); ctx.lineTo(x0, top + 9); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(50,48,40,.35)';
  ctx.lineWidth = 1.2;
  for (const [a, b] of [[40, 70], [120, 150], [176, 196]]) { ctx.beginPath(); ctx.moveTo(a, top + 10); ctx.quadraticCurveTo((a + b) / 2, top + 16, b, WATER_Y - 2); ctx.stroke(); }
  // 물가 자갈
  const rnd = seeded(11);
  for (let i = 0; i < 26; i++) {
    const x = lerp(x0, DOCK_X + 30, rnd());
    ctx.fillStyle = ['#b8b2a0', '#9a9484', '#c9c2ae'][i % 3];
    ctx.beginPath(); ctx.ellipse(x, WATER_Y + 1 + rnd() * 3, 3 + rnd() * 5, 2 + rnd() * 2, 0, 0, Math.PI * 2); ctx.fill();
  }
  // 건너편 바위 (물 위로 조금)
  for (const [x, rx, ry] of [[948, 30, 18], [990, 40, 24], [1030, 34, 20]]) {
    ctx.fillStyle = '#7a776b';
    ctx.beginPath(); ctx.ellipse(x, WATER_Y + 4, rx, ry, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.14)';
    ctx.beginPath(); ctx.ellipse(x - rx * 0.3, WATER_Y + 4 - ry * 0.65, rx * 0.4, ry * 0.16, -0.2, 0, Math.PI * 2); ctx.fill();
  }
}

// ───────────── 움직이는 것 (프레임마다) ─────────────

/** 물 윗면 반짝임 · 햇살 · 수초 — now(ms) · reduce = 움직임 줄이기 · lite = 느린 기기 · wx = 🌦️ 날씨(바람이면 물결이 크고 수초가 더 흔들림 · 흐림·비는 햇살 없음) */
export function drawWaterFx(ctx, now, reduce, lite, x0 = 0, x1 = SCENE_W, wx = 'sun', place = 'lake') {
  const t = reduce ? 0 : now / 1000;
  if (place === 'river') { riverFx(ctx, t, lite, x0, x1, wx); return; }
  const wind = wx === 'wind';
  const amp = wind ? 3.4 : 1.2;
  ctx.strokeStyle = wind ? 'rgba(255,255,255,.4)' : 'rgba(255,255,255,.28)';
  ctx.lineWidth = 1.5;
  for (let row = 0; row < (wind ? 4 : 3); row++) {
    const y = WATER_Y + 4 + row * 7;
    for (let x = Math.floor(x0 / 90) * 90 + ((t * (12 + row * 6) * (wind ? 2.2 : 1)) % 90); x < x1; x += wind ? 60 : 90) {
      ctx.beginPath(); ctx.moveTo(x, y + Math.sin(t * 2 + x) * amp); ctx.lineTo(x + 26 - row * 6, y + Math.sin(t * 2 + x + 1) * amp); ctx.stroke();
    }
  }
  if (!lite && wx !== 'cloud' && wx !== 'rain') {
    ctx.fillStyle = 'rgba(220,245,240,.06)';
    for (let i = 0; i < 3; i++) {
      const a = 0.5 + 0.5 * Math.sin(t * 0.6 + i * 2);
      ctx.globalAlpha = 0.6 + 0.4 * a;
      const x = 380 + i * 230;
      ctx.beginPath(); ctx.moveTo(x, WATER_Y); ctx.lineTo(x + 60, WATER_Y); ctx.lineTo(x - 40, 520); ctx.lineTo(x - 120, 520); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // 수초 밭 (14m 언저리)
  ctx.strokeStyle = '#3f6b3a';
  ctx.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    const bx = 690 + i * 15;
    const by = bottomY(bx) + 4;
    const h = 120 + ((i * 37) % 70);
    const sway = Math.sin(t * (wind ? 1.6 : 0.9) + i * 0.8) * (wind ? 20 : 12);
    ctx.lineWidth = 5 - (i % 2);
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + sway * 0.4, by - h * 0.5, bx + sway, by - h); ctx.stroke();
  }
  ctx.lineCap = 'butt';
}
/** 🏞️ 강물 (v368) — 물살 줄이 오른쪽으로 흐른다(바람이면 더 크게) · 큰 바위 앞 여울엔 흰 물보라 · 수초 대신 물속 바위(바닥 층에 그려 둠) */
function riverFx(ctx, t, lite, x0, x1, wx) {
  const wind = wx === 'wind';
  const amp = wind ? 3 : 1.4;
  ctx.strokeStyle = 'rgba(255,255,255,.32)';
  ctx.lineWidth = 1.5;
  for (let row = 0; row < 4; row++) {
    const y = WATER_Y + 4 + row * 8;
    const gap = 70 + row * 14;
    for (let x = Math.floor(x0 / gap) * gap + ((t * (60 + row * 22)) % gap); x < x1; x += gap) {
      ctx.beginPath(); ctx.moveTo(x, y + Math.sin(t * 3 + x) * amp); ctx.lineTo(x + 34 - row * 5, y + Math.sin(t * 3 + x + 1) * amp); ctx.stroke();
    }
  }
  // 여울 물보라 — 큰 바위 끝(잔교 자리) 앞
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  const n = lite ? 6 : 12;
  for (let i = 0; i < n; i++) {
    const ph = (t * 1.7 + i * 0.37) % 1;
    const x = DOCK_X + 28 + i * 13 + ph * 26;
    ctx.globalAlpha = 0.25 + 0.5 * Math.sin(ph * Math.PI);
    ctx.beginPath(); ctx.ellipse(x, WATER_Y + 3 + (i % 3) * 3, 5 + (i % 2) * 3, 1.6, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (!lite && wx !== 'cloud' && wx !== 'rain') {
    ctx.fillStyle = 'rgba(220,245,240,.07)';
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(t * 0.6 + i * 2));
      const x = 380 + i * 230;
      ctx.beginPath(); ctx.moveTo(x, WATER_Y); ctx.lineTo(x + 60, WATER_Y); ctx.lineTo(x - 40, 520); ctx.lineTo(x - 120, 520); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
/** 🌧️ 빗줄기 — 40개까지(태블릿 성능 · 가벼운 그림이면 부르는 쪽이 안 부른다) · 움직임 줄이기면 멈춘 빗줄기 */
export const RAIN_N = 40;
export function drawRain(ctx, now, reduce, x0 = 0, x1 = SCENE_W, y0 = 0) {
  const t = reduce ? 0 : now / 1000;
  const w = Math.max(1, x1 - x0);
  const h = WATER_Y + 30 - y0;
  ctx.strokeStyle = 'rgba(225,236,245,.5)';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  for (let i = 0; i < RAIN_N; i++) {
    const x = x0 + ((i * 97.3 + t * 90) % w);
    const y = y0 + ((i * 53.7 + t * 620) % h);
    ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 15);
  }
  ctx.stroke();
}
/** 찌 — sink 0(떠 있음) ~ 1(쏙) · y는 물 윗면 */
export function drawFloat(ctx, x, sink, now, reduce, glow = false) {
  const bob = reduce ? 0 : Math.sin(now / 420) * 1.6;
  const y = WATER_Y + bob + sink * 16;
  ctx.save();
  ctx.beginPath(); ctx.rect(x - 20, 0, 40, WATER_Y + 3); ctx.clip(); // 물 위만 보임
  // ✨ 야광 찌 (v368) — 찌 머리 둘레가 연둣빛으로 은은하게 (그라디언트 한 번 · 그림자 흐림 안 씀)
  if (glow) {
    const pulse = reduce ? 1 : 0.8 + 0.2 * Math.sin(now / 300);
    const halo = ctx.createRadialGradient(x, y - 31, 1, x, y - 31, 16);
    halo.addColorStop(0, `rgba(200,255,120,${(0.75 * pulse).toFixed(2)})`);
    halo.addColorStop(1, 'rgba(200,255,120,0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(x, y - 31, 16, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x, y - 30); ctx.lineTo(x, y + 4); ctx.stroke();
  ctx.fillStyle = glow ? '#d6ff6a' : '#ff5a1f';
  ctx.fillRect(x - 2, y - 36, 4, 10);
  ctx.fillStyle = '#e8481a';
  ctx.beginPath(); ctx.ellipse(x, y - 8, 7, 11, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#fafafa';
  ctx.beginPath(); ctx.ellipse(x, y - 8, 7, 9, 0, 0, Math.PI); ctx.fill();
  ctx.restore();
  // 물속 몸통 그림자
  ctx.fillStyle = 'rgba(255,255,255,.18)';
  ctx.beginPath(); ctx.ellipse(x, WATER_Y + 6, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
}
/** 물결 고리 — rings = [{x, at}] · 1.6초 동안 퍼진다 */
export function drawRings(ctx, rings, now) {
  ctx.lineWidth = 1.6;
  for (const r of rings) {
    const k = (now - r.at) / 1600;
    if (k < 0 || k > 1) continue;
    ctx.strokeStyle = `rgba(255,255,255,${0.7 * (1 - k)})`;
    ctx.beginPath(); ctx.ellipse(r.x, WATER_Y + 2, 8 + k * (r.big ? 70 : 40), 2 + k * (r.big ? 10 : 6), 0, 0, Math.PI * 2); ctx.stroke();
  }
}
/** 물방울 — drops = [{x, y, vx, vy, at}] · 0.9초 */
export function drawDrops(ctx, drops, now) {
  ctx.fillStyle = 'rgba(235,250,255,.9)';
  for (const d of drops) {
    const k = (now - d.at) / 900;
    if (k < 0 || k > 1) continue;
    const s = k * 0.9;
    ctx.globalAlpha = 1 - k;
    ctx.beginPath(); ctx.arc(d.x + d.vx * s, d.y + d.vy * s + 260 * s * s, 2.4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
/** 낚싯대 — 손에서 끝까지 · bend = 0~1(장력) · 끝이 당기는 쪽(tx,ty)으로 휜다 → 끝 자리를 돌려준다 · col = { butt, tip } 🎣 낚싯대 색(v368 · 없으면 나무색) */
export function drawRod(ctx, hx, hy, tx, ty, bend, col = null) {
  const len = 210;
  const base = -0.62; // 기본 각도(위로 비스듬)
  const pull = Math.atan2(ty - hy, tx - hx);
  const b = Math.min(1, Math.max(0, Number(bend) || 0));
  const ang = base + (pull - base) * b * 0.45;
  const ex = hx + Math.cos(ang) * len;
  const ey = hy + Math.sin(ang) * len + b * 18;
  const cx = hx + Math.cos(base) * len * 0.6;
  const cy = hy + Math.sin(base) * len * 0.6;
  ctx.lineCap = 'round';
  ctx.strokeStyle = (col && col.butt) || '#3b2a1c'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo(lerp(hx, cx, 0.5), lerp(hy, cy, 0.5), lerp(hx, ex, 0.35), lerp(hy, ey, 0.35)); ctx.stroke();
  ctx.strokeStyle = (col && col.tip) || '#5a3f28'; ctx.lineWidth = 2.6;
  ctx.beginPath(); ctx.moveTo(lerp(hx, ex, 0.3), lerp(hy, ey, 0.3)); ctx.quadraticCurveTo(cx, cy, ex, ey); ctx.stroke();
  // 릴
  ctx.fillStyle = '#c9c9c9';
  ctx.beginPath(); ctx.arc(hx + 14, hy + 8, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#555';
  ctx.beginPath(); ctx.arc(hx + 14, hy + 8, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.lineCap = 'butt';
  return { x: ex, y: ey };
}
/** 낚싯줄 — 끝(ax,ay)에서 (bx,by)로 · tension 0~100이면 팽팽할수록 곧고 붉다 */
export function drawLine(ctx, ax, ay, bx, by, tension = 20) {
  const k = Math.min(1, Math.max(0, tension / 100));
  const sag = (1 - k) * Math.min(90, Math.hypot(bx - ax, by - ay) * 0.25);
  ctx.strokeStyle = k > 0.75 ? `rgba(255,${Math.round(180 - 120 * (k - 0.75) * 4)},150,.95)` : 'rgba(240,245,245,.85)';
  ctx.lineWidth = 1.2 + k * 1.2;
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 + sag, bx, by); ctx.stroke();
}
/** 뜰채 — 손잡이 끝(hx,hy)에서 물 쪽으로 · dip 0~1(물에 담근 만큼) */
export function drawNet(ctx, hx, hy, dip) {
  const ex = DOCK_X + 46;
  const ey = WATER_Y - 30 + dip * 52;
  ctx.strokeStyle = '#7a5a36'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(ex, ey); ctx.stroke();
  ctx.strokeStyle = '#d6d6d0'; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.ellipse(ex + 22, ey + 6, 24, 9, 0.2, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(220,220,210,.55)'; ctx.lineWidth = 1;
  for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(ex + 22 + i * 9, ey + 4); ctx.quadraticCurveTo(ex + 22 + i * 5, ey + 34, ex + 24, ey + 38); ctx.stroke(); }
  ctx.lineCap = 'butt';
}
