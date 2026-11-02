// 🎣 학습 낚시터 그림 (v366) — 캔버스 2D에 직접 그린다(레퍼런스 그림·에셋은 안 씀 · 이용 조건 걱정 없음)
// 장면은 가상 좌표 1024×600(옆모습 — 위는 하늘·물가·잔교, 아래는 물속) · 화면 크기는 fishview가 맞춘다
// 물고기 16종은 몸 모양 값(LOOKS)으로 그린다 — 몸통·꼬리·지느러미·무늬·수염·눈·입 · 작게 그릴 땐 무늬를 줄인다(LOD)
// 안 움직이는 것(하늘·산·물가·바닥·잔교·갈대)은 paintStatic이 한 장에 그려 두고 fishview가 붙이기만 한다(태블릿 성능)
// 생김새 근거(2026-10-30 확인): 위키백과·FishBase·경북 토속관상어 사육 매뉴얼·한국어류학회지(동자개 수염 4쌍) — 아이 눈에 「그 물고기」로 보이는 특징 위주
// v368 강 8종 · v369 바다 9종(고등어 등 물결무늬 FAO · 전갱이 옆줄 모비늘 FishBase · 참돔 푸른 점 · 볼락 큰 눈)
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
  // 🌊 바다 (v369 시안) — 문절망둑 · 전갱이 · 고등어 · 노래미 · 볼락 · 조피볼락 · 감성돔 · 농어 · 참돔 (dorsal2 = 떨어진 둘째 등지느러미)
  munjeol: { depth: 0.17, peak: 0.3, head: 'round', tail: 'round', tk: 0.8, dorsal: [0.3, 0.46, 0.5, 'spiny'], dorsal2: [0.52, 0.86, 0.42, 'soft'], anal: [0.56, 0.86, 0.34, 'soft'], mouth: 'wide', eye: [0.09, 0.34, 0.026], c: ['#6d6450', '#b5aa8a', '#efe8d6', '#a39776'], pat: ['blotch:#4a4130', 'speck:#3e3626:22'] },
  jeongaeng: { depth: 0.25, peak: 0.42, head: 'point', tail: 'fork', tk: 0.95, dorsal: [0.34, 0.5, 0.5, 'spiny'], dorsal2: [0.52, 0.9, 0.3, 'soft'], anal: [0.58, 0.9, 0.28, 'soft'], mouth: 'big', eye: [0.1, 0.18, 0.034], c: ['#3f6b70', '#b7c9c6', '#f2f4ee', '#c9c2a0'], pat: ['scute:#d8dccf', 'ear:#26302f', 'sheen:#d6e2a0'] },
  godeung: { depth: 0.2, peak: 0.44, head: 'point', tail: 'fork', tk: 1, dorsal: [0.36, 0.5, 0.45, 'spiny'], dorsal2: [0.6, 0.72, 0.4, 'soft'], anal: [0.62, 0.74, 0.38, 'soft'], mouth: 'big', eye: [0.1, 0.16, 0.03], c: ['#25566a', '#9fbcc4', '#f1f4f2', '#7f9aa3'], pat: ['wave:#173540:10', 'sheen:#b8e0e8'] },
  noraemi: { depth: 0.24, peak: 0.36, head: 'point', tail: 'notch', tk: 0.8, dorsal: [0.26, 0.92, 0.42, 'spiny'], anal: [0.56, 0.92, 0.36, 'soft'], mouth: 'small', eye: [0.11, 0.24, 0.028], c: ['#5a4a32', '#9a8462', '#e6dcc6', '#7c6a4c'], pat: ['mottle:#3c3020', 'blotch:#4a3a26'] },
  bollak: { depth: 0.33, peak: 0.36, head: 'round', tail: 'notch', tk: 0.85, dorsal: [0.24, 0.86, 0.44, 'spiny'], anal: [0.62, 0.8, 0.4, 'soft'], mouth: 'big', eye: [0.13, 0.22, 0.046], c: ['#3f3a36', '#7d7068', '#d8d0c6', '#5a504a'], pat: ['bars:#2a2522:.3:5'] },
  jopi: { depth: 0.3, peak: 0.34, head: 'round', tail: 'round', tk: 0.8, dorsal: [0.22, 0.86, 0.46, 'spiny'], anal: [0.62, 0.8, 0.4, 'soft'], mouth: 'big', eye: [0.12, 0.24, 0.036], c: ['#4a4840', '#8a857a', '#dcd8cc', '#5c584e'], pat: ['mottle:#2e2c26', 'bars:#33302a:.25:4'] },
  gamseong: { depth: 0.42, peak: 0.36, head: 'round', tail: 'fork', tk: 0.9, dorsal: [0.28, 0.88, 0.4, 'spiny'], anal: [0.64, 0.84, 0.4, 'soft'], mouth: 'small', eye: [0.13, 0.24, 0.032], c: ['#3a3f44', '#8e969c', '#e8ebec', '#4a5056'], pat: ['bars:#2e3236:.22:6', 'sheen:#e4ecf0'] },
  nongeo: { depth: 0.24, peak: 0.4, head: 'point', tail: 'notch', tk: 0.9, dorsal: [0.3, 0.5, 0.55, 'spiny'], dorsal2: [0.54, 0.78, 0.4, 'soft'], anal: [0.62, 0.78, 0.36, 'soft'], mouth: 'big', eye: [0.11, 0.18, 0.028], c: ['#4e5e58', '#b9c4c0', '#f2f4f3', '#93a19c'], pat: ['speck:#2a332f:16', 'sheen:#d0dde0'] },
  chamdom: { depth: 0.42, peak: 0.34, head: 'round', tail: 'fork', tk: 0.95, dorsal: [0.26, 0.88, 0.42, 'spiny'], anal: [0.64, 0.84, 0.4, 'soft'], mouth: 'small', eye: [0.13, 0.24, 0.032], c: ['#b2454a', '#e48a86', '#f7dcd6', '#d9706c'], pat: ['speck:#58b6ef:42', 'sheen:#ffd3c8'] },
  // 🚤 배 낚시 (v386 시안) — 말쥐치(등의 큰 가시 하나) · 방어·부시리(노란 띠 · 부시리는 가슴지느러미가 짧다 pec) · 가자미 무리 flat(두 눈 eye2가 몸 한쪽 ·
  //   넙치는 머리가 왼쪽 · 문치가자미는 늘 오른쪽 faceR — 「좌광우도」, 배를 아래로 놓고 본 모습) · 갈치는 띠(ribbon — 꼬리·배지느러미 없음) ·
  //   문어 무리(form) octo 문어(다리 여덟 · 가로 틈 눈동자) · cuttle 갑오징어(몸통 둘레 지느러미 · W 눈동자) · squid 창꼴뚜기(꼬리 쪽 마름모 지느러미)
  maljwi: { depth: 0.44, peak: 0.42, head: 'point', tail: 'round', tk: 0.48, dorsal: [0.21, 0.235, 0.95, 'spine'], dorsal2: [0.52, 0.86, 0.3, 'soft'], anal: [0.52, 0.86, 0.3, 'soft'], mouth: 'small', eye: [0.21, 0.42, 0.03], c: ['#46545e', '#8a9aa4', '#d6dde0', '#6f8fa8'], pat: ['mottle:#2f3a42', 'speck:#3a4650:14'] },
  munchi: { depth: 0.56, peak: 0.42, head: 'round', tail: 'round', tk: 0.62, flat: true, faceR: true, dorsal: [0.12, 0.97, 0.2, 'low'], anal: [0.3, 0.97, 0.2, 'low'], mouth: 'small', eye: [0.13, 0.5, 0.03], eye2: [0.18, 0.2, 0.03], c: ['#5a4a36', '#76634a', '#86735a', '#6a5840'], pat: ['speck:#2e2418:34', 'mottle:#3e3224'] },
  neopchi: { depth: 0.44, peak: 0.44, head: 'round', tail: 'round', tk: 0.62, flat: true, dorsal: [0.1, 0.97, 0.2, 'low'], anal: [0.28, 0.97, 0.2, 'low'], mouth: 'big', eye: [0.12, 0.48, 0.028], eye2: [0.17, 0.18, 0.028], c: ['#4e4a34', '#6a6446', '#7a7354', '#5e5a40'], pat: ['mottle:#33301f', 'speck:#d8d0b0:20'] },
  bangeo: { depth: 0.25, peak: 0.42, head: 'point', tail: 'fork', tk: 1.05, dorsal: [0.3, 0.4, 0.28, 'spiny'], dorsal2: [0.42, 0.9, 0.3, 'soft'], anal: [0.62, 0.9, 0.28, 'soft'], mouth: 'big', eye: [0.1, 0.16, 0.024], c: ['#28507a', '#97aabb', '#f1f3ef', '#c8a63e'], pat: ['stripe:#e0bd45:.85', 'sheen:#d6e4ee'] },
  busiri: { depth: 0.22, peak: 0.42, head: 'point', tail: 'fork', tk: 1.05, pec: 0.62, dorsal: [0.3, 0.4, 0.26, 'spiny'], dorsal2: [0.42, 0.9, 0.28, 'soft'], anal: [0.62, 0.9, 0.26, 'soft'], mouth: 'big', eye: [0.1, 0.16, 0.022], c: ['#2a5a6c', '#9cb4bc', '#f1f3ef', '#d4b03c'], pat: ['stripe:#e8c440:.95', 'sheen:#d0e6ea'] },
  galchi: { tail: 'ribbon', c: ['#5f7080', '#c9d3da', '#f2f5f7', '#a9bccb'], pat: [] },
  jukkumi: { form: 'octo', arm: 0.6, c: ['#5e4250', '#93707c', '#ead6d0', '#7a5662'], ring: '#e8c44a' },
  chammuneo: { form: 'octo', arm: 0.62, c: ['#5e4836', '#97785c', '#eedfcc', '#7c6248'], spots: '#d6c2a2' },
  daemuneo: { form: 'octo', arm: 0.66, c: ['#5e221e', '#9c4438', '#f0d2c6', '#7c2e26'], wrinkle: '#3e1410' },
  gabojing: { form: 'cuttle', c: ['#54463a', '#8e7a66', '#efe6da', '#b8a48a'], stripe: '#2e241c' },
  changkkol: { form: 'squid', c: ['#94503e', '#d29a88', '#f6e6e0', '#e6b4a4'], dots: '#6e2418' },
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
    } else if (kind === 'wave') {
      // 고등어 — 등 쪽 검푸른 물결무늬 (v369) — 등에서 옆 가운데까지만
      const n = Number(a1) || 9;
      ctx.strokeStyle = col;
      ctx.lineWidth = Math.max(0.8, hd * 0.08);
      ctx.globalAlpha = 0.8;
      for (let i = 0; i < n; i++) {
        const x = lerp(x0 + Lb * 0.22, x0 + Lb * 0.97, i / n);
        ctx.beginPath(); ctx.moveTo(x, -hd);
        for (let k = 1; k <= 4; k++) ctx.quadraticCurveTo(x + Lb * (0.012 * k + (k % 2 ? 0.02 : -0.012)), -hd + hd * 0.13 * (k - 0.5), x + Lb * 0.016 * k, -hd + hd * 0.13 * k);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (kind === 'scute') {
      // 전갱이 — 옆줄을 따라 늘어선 단단한 비늘(모비늘) 한 줄 (v369)
      const n = detail ? 24 : 12;
      ctx.fillStyle = col;
      ctx.strokeStyle = 'rgba(40,50,50,.35)';
      ctx.lineWidth = Math.max(0.5, hd * 0.025);
      for (let i = 0; i < n; i++) {
        const f = (i + 0.5) / n;
        const x = lerp(x0 + Lb * 0.24, x0 + Lb * 0.99, f);
        const y = lerp(-hd * 0.12, 0, f) - (f < 0.4 ? Math.sin((f / 0.4) * Math.PI) * hd * 0.1 : 0);
        const w = ((Lb * 0.75) / n) * 0.6;
        const h = hd * (0.06 + 0.05 * f);
        ctx.beginPath(); ctx.moveTo(x - w, y); ctx.lineTo(x, y - h); ctx.lineTo(x + w, y); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
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
  // 눈 — 금빛·은빛 홍채 + 검은 눈동자 + 빛 (가자미 무리는 몸 한쪽에 눈 둘 — eye2 · v386)
  const eyes = lk.eye2 ? [[cx, cy, r], [x0 + Lb * lk.eye2[0], -hd * lk.eye2[1], Math.max(1.2, L * lk.eye2[2])]] : [[cx, cy, r]];
  for (const [ex1, ey1, r1] of eyes) {
    ctx.fillStyle = lk.key === 'ssogari' || lk.key === 'bass' ? '#d8b55a' : '#d6d0b4';
    ctx.beginPath(); ctx.arc(ex1, ey1, r1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#121212';
    ctx.beginPath(); ctx.arc(ex1, ey1, r1 * 0.62, 0, Math.PI * 2); ctx.fill();
    if (detail) { ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(ex1 - r1 * 0.25, ey1 - r1 * 0.25, r1 * 0.22, 0, Math.PI * 2); ctx.fill(); }
  }
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

/** 🗡️ 갈치 (v386 시안) — 칼처럼 길고 납작한 은빛 띠 · 꼬리지느러미·배지느러미 없이 끝이 실처럼 가늘어짐 · 등을 따라 긴 지느러미 · 아래턱이 나온 큰 입과 송곳니 · 큰 눈 */
function drawRibbon(ctx, lk, L, opts) {
  const N = 26;
  const top = [];
  const bot = [];
  const ph = opts.wag ? opts.wag * 8 : 0;
  for (let i = 0; i <= N; i++) {
    const f = i / N;
    const x = -L / 2 + L * f;
    const y = Math.sin(ph + f * 5) * L * 0.018 * f;
    const th = L * 0.04 * (f < 0.07 ? 0.4 + f * 8.6 : f < 0.32 ? 1 : Math.max(0.03, 1 - Math.pow((f - 0.32) / 0.68, 0.75)));
    top.push([x, y - th]);
    bot.push([x, y + th]);
  }
  const hx = -L / 2;
  const p = new Path2D();
  p.moveTo(hx - L * 0.01, bot[0][1] - L * 0.002); // 아래턱 끝
  for (const [x, y] of top) p.lineTo(x, y);
  for (let i = bot.length - 1; i >= 0; i--) p.lineTo(bot[i][0], bot[i][1]);
  p.closePath();
  if (opts.shadow) { ctx.fillStyle = opts.shadow; ctx.fill(p); return; }
  // 등지느러미 — 머리 뒤에서 끝까지 이어진 얇은 막
  ctx.strokeStyle = lk.c[3];
  ctx.globalAlpha = 0.75;
  ctx.lineWidth = Math.max(1, L * 0.01);
  ctx.beginPath();
  for (let i = 2; i <= N - 2; i++) ctx.lineTo(top[i][0], top[i][1] - L * 0.006);
  ctx.stroke();
  ctx.globalAlpha = 1;
  const g = ctx.createLinearGradient(0, -L * 0.045, 0, L * 0.045);
  g.addColorStop(0, lk.c[0]); g.addColorStop(0.4, lk.c[1]); g.addColorStop(0.75, lk.c[2]); g.addColorStop(1, lk.c[1]);
  ctx.fillStyle = g;
  ctx.fill(p);
  ctx.strokeStyle = 'rgba(60,72,86,.55)'; // 옅은 은빛이 밝은 바탕에 묻히지 않게 테두리
  ctx.lineWidth = Math.max(0.6, L * 0.003);
  ctx.stroke(p);
  // 은빛 띠 반짝임
  ctx.strokeStyle = 'rgba(255,255,255,.55)';
  ctx.lineWidth = Math.max(0.8, L * 0.005);
  ctx.beginPath();
  for (let i = 2; i <= N - 4; i++) ctx.lineTo(top[i][0], (top[i][1] * 2 + bot[i][1]) / 3);
  ctx.stroke();
  // 입 · 송곳니 · 눈
  const my = (top[1][1] + bot[1][1]) / 2 + L * 0.004;
  ctx.strokeStyle = 'rgba(30,34,40,.7)';
  ctx.lineWidth = Math.max(0.7, L * 0.003);
  ctx.beginPath(); ctx.moveTo(hx - L * 0.008, bot[0][1] - L * 0.004); ctx.lineTo(hx + L * 0.04, my); ctx.stroke();
  if (L >= 70 && !opts.lite) { // 송곳니는 느린 기기면 안 그림 (Codex 189차)
    ctx.fillStyle = '#fbfbf6';
    for (let i = 0; i < 4; i++) { const tx = hx + L * (0.004 + i * 0.009); ctx.beginPath(); ctx.moveTo(tx, my - L * 0.004 + i * L * 0.0012); ctx.lineTo(tx + L * 0.003, my + L * 0.006); ctx.lineTo(tx + L * 0.006, my - L * 0.003 + i * L * 0.0012); ctx.fill(); }
  }
  const er = Math.max(1.2, L * 0.012);
  const ex = hx + L * 0.042;
  const ey = top[2][1] + L * 0.02;
  ctx.fillStyle = '#e2e6d8'; ctx.beginPath(); ctx.arc(ex, ey, er, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#121212'; ctx.beginPath(); ctx.arc(ex, ey, er * 0.6, 0, Math.PI * 2); ctx.fill();
}
/** 굽는 팔의 가운데 줄 — 뿌리 (x, y) · 처음 각도 a0 · 길이 len · M 마디 · bend(s) = 마디 몫 s(0~1)에서 더하는 각도 → [[x, y, 각도]…] */
function limbPts(x, y, a0, len, M, bend) {
  const pts = [[x, y, a0]];
  const step = len / M;
  for (let k = 1; k <= M; k++) {
    const an = a0 + bend(k / M);
    x += Math.cos(an) * step;
    y += Math.sin(an) * step;
    pts.push([x, y, an]);
  }
  return pts;
}
/** 가늘어지는 팔 윤곽 — w0 = 뿌리 반너비 · tip = 끝 반너비 */
function limbPath(pts, w0, tip) {
  const p = new Path2D();
  const n = pts.length - 1;
  const at = (k, sg) => {
    const [x, y, an] = pts[k];
    const w = w0 * Math.pow(1 - k / n, 0.85) + tip;
    return [x + Math.cos(an + (sg * Math.PI) / 2) * w, y + Math.sin(an + (sg * Math.PI) / 2) * w];
  };
  let q = at(0, -1);
  p.moveTo(q[0], q[1]);
  for (let k = 1; k <= n; k++) { q = at(k, -1); p.lineTo(q[0], q[1]); }
  for (let k = n; k >= 0; k--) { q = at(k, 1); p.lineTo(q[0], q[1]); }
  p.closePath();
  return p;
}
/**
 * 🐙 문어 (v386 시안) — 몸통 주머니가 왼쪽(헤엄칠 때 앞) · 다리 여덟이 오른쪽으로 물결치다 끝이 말림 · 앞 다리 밑에 빨판 · 눈동자는 가로로 긴 틈 · L = 다리 끝까지 전체 길이
 * 주꾸미 ring(다리 뿌리 옆 금빛 고리 무늬 — SeaLifeBase) · 참문어 spots(밝은 얼룩) · 대문어 wrinkle(주름)
 */
function drawOcto(ctx, lk, L, opts) {
  const sh = opts.shadow;
  const detail = L >= 70 && !sh && !opts.lite; // 느린 기기면 빨판·무늬·마디를 줄임 (Codex 189차)
  const t = (Number(opts.wag) || 0) * 6;
  const [cD, cM, cL, cA] = lk.c;
  const rx = -L * 0.1;
  const ry = L * 0.06;
  const reach = L * (lk.arm || 0.62);
  const M = detail ? 22 : 12;
  const arms = [];
  for (let i = 0; i < 8; i++) {
    const a0 = -0.42 + (i / 7) * 1.05;
    const len = reach * (0.84 + 0.16 * Math.sin(i * 2.3 + 1));
    const curl = (i % 2 ? 1 : -1) * (1.2 + 0.2 * (i % 3));
    const pts = limbPts(rx + Math.cos(a0) * L * 0.03, ry + Math.sin(a0) * L * 0.03 + (i - 3.5) * L * 0.006, a0, len, M, (s) => Math.sin(t + i * 1.3 + s * 4) * 0.35 * s + (s > 0.72 ? curl * Math.pow((s - 0.72) / 0.28, 2) * 2.2 : 0));
    arms.push({ pts, back: i % 2 === 1, w0: L * (0.032 + 0.004 * (i % 3)) });
  }
  const mantle = new Path2D();
  mantle.ellipse(-L * 0.3, -L * 0.04, L * 0.16, L * 0.11, -0.32, 0, Math.PI * 2);
  const head = new Path2D();
  head.ellipse(-L * 0.15, L * 0.03, L * 0.085, L * 0.07, 0, 0, Math.PI * 2);
  if (sh) {
    ctx.fillStyle = sh;
    for (const a of arms) ctx.fill(limbPath(a.pts, a.w0, L * 0.002));
    ctx.fill(mantle); ctx.fill(head);
    return;
  }
  // 뒤 다리(어둡게) → 앞 다리 → 빨판
  for (const a of arms) if (a.back) { ctx.fillStyle = cD; ctx.fill(limbPath(a.pts, a.w0, L * 0.002)); }
  for (const a of arms) {
    if (a.back) continue;
    ctx.fillStyle = cM;
    ctx.fill(limbPath(a.pts, a.w0, L * 0.002));
    if (!detail) continue;
    const n = a.pts.length - 1;
    ctx.fillStyle = cL;
    ctx.globalAlpha = 0.85;
    for (let k = 2; k < n - 2; k += 2) {
      const [x, y, an] = a.pts[k];
      const w = a.w0 * Math.pow(1 - k / n, 0.85);
      ctx.beginPath(); ctx.arc(x + Math.cos(an + Math.PI / 2) * w * 0.55, y + Math.sin(an + Math.PI / 2) * w * 0.55, Math.max(0.6, w * 0.32), 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // 몸통 주머니 · 머리
  const g = ctx.createLinearGradient(0, -L * 0.15, 0, L * 0.08);
  g.addColorStop(0, cD); g.addColorStop(0.55, cM); g.addColorStop(1, cA);
  ctx.fillStyle = g;
  ctx.fill(mantle);
  ctx.fillStyle = cM;
  ctx.fill(head);
  const rnd = seeded(seedOfKey(lk.key));
  if (detail) {
    ctx.save();
    ctx.clip(mantle);
    if (lk.spots) {
      ctx.fillStyle = lk.spots;
      ctx.globalAlpha = 0.45;
      for (let i = 0; i < 16; i++) { ctx.beginPath(); ctx.ellipse(lerp(-L * 0.45, -L * 0.16, rnd()), lerp(-L * 0.14, L * 0.05, rnd()), L * lerp(0.008, 0.018, rnd()), L * lerp(0.006, 0.012, rnd()), rnd() * 3, 0, Math.PI * 2); ctx.fill(); }
    }
    if (lk.wrinkle) {
      ctx.strokeStyle = lk.wrinkle;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = Math.max(0.8, L * 0.004);
      for (let i = 0; i < 12; i++) { const x = lerp(-L * 0.44, -L * 0.18, rnd()); const y = lerp(-L * 0.13, L * 0.04, rnd()); ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + L * 0.015, y - L * 0.01, x + L * 0.03, y); ctx.stroke(); }
    }
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(-L * 0.34, -L * 0.1, L * 0.07, L * 0.035, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // 주꾸미 — 다리 뿌리 옆 금빛 고리 무늬
  if (lk.ring) {
    ctx.fillStyle = cD;
    ctx.beginPath(); ctx.arc(-L * 0.095, L * 0.078, L * 0.026, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = lk.ring;
    ctx.lineWidth = Math.max(1, L * 0.008);
    ctx.beginPath(); ctx.arc(-L * 0.095, L * 0.078, L * 0.026, 0, Math.PI * 2); ctx.stroke();
  }
  // 깔때기(물을 내뿜는 관)
  ctx.fillStyle = cA;
  ctx.beginPath(); ctx.ellipse(-L * 0.21, L * 0.085, L * 0.03, L * 0.013, 0.4, 0, Math.PI * 2); ctx.fill();
  // 눈 — 볼록한 눈두덩 · 가로로 긴 눈동자
  const ex = -L * 0.16;
  const ey = -L * 0.004;
  const er = Math.max(1.2, L * 0.028);
  ctx.fillStyle = cA;
  ctx.beginPath(); ctx.arc(ex, ey - er * 0.3, er * 1.28, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e9dcae';
  ctx.beginPath(); ctx.arc(ex, ey, er, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#141414';
  ctx.beginPath(); ctx.ellipse(ex, ey, er * 0.72, er * 0.24, 0, 0, Math.PI * 2); ctx.fill();
  if (detail) { ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(ex - er * 0.35, ey - er * 0.4, er * 0.2, 0, Math.PI * 2); ctx.fill(); }
}
/**
 * 🦑 갑오징어 cuttle · 창꼴뚜기 squid (v386 시안) — 몸통(외투)이 왼쪽 · 다리 여덟과 긴 촉완 둘이 오른쪽 · L = 촉완 끝까지 전체 길이
 * 갑오징어: 넓적한 타원 몸통 둘레를 따라 얇은 지느러미 · 등에 물결 줄무늬 · W 꼴 눈동자 / 창꼴뚜기: 길쭉한 몸통 · 꼬리 쪽 마름모 지느러미 · 붉은 점
 */
function drawSquid(ctx, lk, L, opts) {
  const sh = opts.shadow;
  const detail = L >= 70 && !sh && !opts.lite;
  const cut = lk.form === 'cuttle';
  const t = (Number(opts.wag) || 0) * 6;
  const [cD, cM, cL, cA] = lk.c;
  const x0 = -L / 2;
  const mEnd = cut ? L * 0.08 : L * 0.1;
  const mcx = (x0 + mEnd) / 2;
  const mrx = (mEnd - x0) / 2;
  const mh = cut ? L * 0.15 : L * 0.065;
  const fin = new Path2D();
  if (cut) fin.ellipse(mcx, 0, mrx + L * 0.012, mh + L * 0.03, 0, 0, Math.PI * 2);
  else { fin.moveTo(x0 - L * 0.005, 0); fin.lineTo(x0 + L * 0.17, -L * 0.115); fin.lineTo(x0 + L * 0.3, 0); fin.lineTo(x0 + L * 0.17, L * 0.115); fin.closePath(); }
  const body = new Path2D();
  if (cut) body.ellipse(mcx, 0, mrx, mh, 0, 0, Math.PI * 2);
  else {
    body.moveTo(x0, 0);
    body.bezierCurveTo(x0 + L * 0.15, -mh * 0.9, mEnd - L * 0.12, -mh, mEnd, -mh * 0.95);
    body.lineTo(mEnd, mh * 0.95);
    body.bezierCurveTo(mEnd - L * 0.12, mh, x0 + L * 0.15, mh * 0.9, x0, 0);
    body.closePath();
  }
  const hcx = mEnd + L * 0.05;
  const hrx = L * 0.065;
  const hry = mh * (cut ? 0.62 : 0.85);
  const head = new Path2D();
  head.ellipse(hcx, 0, hrx, hry, 0, 0, Math.PI * 2);
  const base = hcx + hrx * 0.6;
  const M = detail ? 12 : 7;
  const arms = [];
  for (let i = 0; i < 8; i++) {
    const f = i / 7 - 0.5;
    const len = L * (cut ? 0.14 : 0.16) * (0.8 + 0.2 * Math.sin(i * 1.9));
    arms.push(limbPts(base, f * hry * 1.3, f * 0.7, len, M, (s) => Math.sin(t + i + s * 3) * 0.12 * s));
  }
  const tents = [-1, 1].map((sg) => limbPts(base, sg * hry * 0.22, sg * 0.06, L / 2 - base - L * 0.02, M + 4, (s) => Math.sin(t * 0.7 + sg + s * 3) * 0.1 * s));
  if (sh) {
    ctx.fillStyle = sh;
    for (const pts of tents) ctx.fill(limbPath(pts, L * 0.006, L * 0.004));
    ctx.fill(fin); ctx.fill(body); ctx.fill(head);
    for (const pts of arms) ctx.fill(limbPath(pts, L * 0.016, L * 0.002));
    return;
  }
  // 촉완(뒤) — 끝이 넓적한 곤봉
  ctx.fillStyle = cA;
  for (const pts of tents) {
    ctx.fill(limbPath(pts, L * 0.006, L * 0.004));
    const [x, y, an] = pts[pts.length - 1];
    ctx.beginPath(); ctx.ellipse(x - Math.cos(an) * L * 0.015, y - Math.sin(an) * L * 0.015, L * 0.022, L * 0.009, an, 0, Math.PI * 2); ctx.fill();
  }
  // 지느러미 → 몸통 → 무늬
  ctx.fillStyle = cA;
  ctx.globalAlpha = cut ? 0.75 : 0.85;
  ctx.fill(fin);
  ctx.globalAlpha = 1;
  const g = ctx.createLinearGradient(0, -mh, 0, mh);
  g.addColorStop(0, cD); g.addColorStop(0.45, cM); g.addColorStop(1, cL);
  ctx.fillStyle = g;
  ctx.fill(body);
  if (detail) {
    const rnd = seeded(seedOfKey(lk.key));
    ctx.save();
    ctx.clip(body);
    if (lk.stripe) {
      ctx.strokeStyle = lk.stripe;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = Math.max(0.8, L * 0.007);
      for (let i = 0; i < 12; i++) {
        const x = lerp(x0 + L * 0.06, mEnd - L * 0.04, i / 11);
        ctx.beginPath(); ctx.moveTo(x, -mh);
        for (let k = 1; k <= 4; k++) ctx.quadraticCurveTo(x + (k % 2 ? L * 0.012 : -L * 0.012), -mh + mh * 0.2 * (k - 0.5), x, -mh + mh * 0.2 * k);
        ctx.stroke();
      }
    }
    if (lk.dots) {
      ctx.fillStyle = lk.dots;
      ctx.globalAlpha = 0.55;
      for (let i = 0; i < 46; i++) { ctx.beginPath(); ctx.arc(lerp(x0 + L * 0.03, mEnd, rnd()), lerp(-mh, mh * 0.6, rnd()), L * lerp(0.003, 0.007, rnd()), 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(mcx, -mh * 0.45, mrx * 0.6, mh * 0.18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // 머리 → 다리 여덟 → 눈
  ctx.fillStyle = cM;
  ctx.fill(head);
  for (let i = 0; i < arms.length; i++) { ctx.fillStyle = i % 2 ? cA : cM; ctx.fill(limbPath(arms[i], L * 0.016, L * 0.002)); }
  const er = Math.max(1.2, L * (cut ? 0.026 : 0.028));
  const ex = hcx - hrx * 0.1;
  const ey = -hry * 0.25;
  ctx.fillStyle = cut ? '#d8cfa8' : '#c9ccd2';
  ctx.beginPath(); ctx.arc(ex, ey, er, 0, Math.PI * 2); ctx.fill();
  if (cut) {
    // W 꼴 눈동자
    ctx.strokeStyle = '#141414';
    ctx.lineWidth = Math.max(0.8, er * 0.32);
    ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(ex - er * 0.6, ey - er * 0.25); ctx.lineTo(ex - er * 0.3, ey + er * 0.3); ctx.lineTo(ex, ey - er * 0.05); ctx.lineTo(ex + er * 0.3, ey + er * 0.3); ctx.lineTo(ex + er * 0.6, ey - er * 0.25); ctx.stroke();
    ctx.lineJoin = 'miter';
  } else {
    ctx.fillStyle = '#141414';
    ctx.beginPath(); ctx.arc(ex, ey, er * 0.7, 0, Math.PI * 2); ctx.fill();
  }
  if (detail) { ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(ex - er * 0.3, ey - er * 0.35, er * 0.2, 0, Math.PI * 2); ctx.fill(); }
}
/** ⚓ 출항 장면의 작은 낚싯배 (v386) — 오른쪽을 보고 · (x, y) = 물에 닿는 뱃머리 아래 · s 배율(1 = 길이 약 150) · 낚싯배 장면(boatBank)과 같은 색 */
export function drawBoat(ctx, x, y, s = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  // 물속 배 밑
  ctx.fillStyle = 'rgba(128,56,50,.55)';
  ctx.beginPath(); ctx.moveTo(-150, 0); ctx.lineTo(-6, 0); ctx.quadraticCurveTo(-14, 14, -40, 18); ctx.lineTo(-146, 18); ctx.closePath(); ctx.fill();
  // 뱃전 · 파란 띠
  const hull = new Path2D();
  hull.moveTo(-150, -22); hull.lineTo(-40, -22); hull.quadraticCurveTo(-12, -24, 6, -38); hull.quadraticCurveTo(2, -16, -6, 1); hull.lineTo(-150, 1); hull.closePath();
  ctx.fillStyle = '#eef0ec';
  ctx.fill(hull);
  ctx.save();
  ctx.clip(hull);
  ctx.fillStyle = '#2f5d9a';
  ctx.fillRect(-160, -14, 180, 5);
  ctx.restore();
  // 조타실 · 창 · 지붕 · 안테나 · 깃발
  ctx.fillStyle = '#f4f4ef';
  ctx.fillRect(-120, -58, 46, 36);
  ctx.fillStyle = '#2f5d9a';
  ctx.fillRect(-124, -64, 54, 7);
  ctx.fillStyle = '#9cc4dc';
  ctx.fillRect(-114, -52, 34, 14);
  ctx.strokeStyle = '#5a6068';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-104, -64); ctx.lineTo(-104, -96); ctx.stroke();
  ctx.fillStyle = '#d4483f';
  ctx.beginPath(); ctx.moveTo(-104, -96); ctx.lineTo(-86, -91); ctx.lineTo(-104, -86); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#f07a24';
  ctx.beginPath(); ctx.arc(-84, -34, 5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
/** 💨 먹물 (v386 시안) — 문어 무리가 사투에서 오답일 때 · (x, y) 가운데 · s 크기(px) · k 0 → 1 퍼지며 옅어짐 */
export function drawInk(ctx, x, y, s, k = 0.4) {
  const rnd = seeded(29);
  const kk = Math.min(1, Math.max(0, Number(k) || 0));
  for (let i = 0; i < 9; i++) {
    const a = rnd() * Math.PI * 2;
    const d = s * (0.15 + 0.55 * rnd()) * (0.4 + kk);
    const r = s * (0.18 + 0.22 * rnd()) * (0.5 + kk);
    const cx = x + Math.cos(a) * d;
    const cy = y + Math.sin(a) * d * 0.7;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(22,18,28,${(0.8 * (1 - kk)).toFixed(3)})`);
    g.addColorStop(1, 'rgba(22,18,28,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  }
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
  if (opts.flip || lk.faceR) ctx.scale(-1, 1); // 문치가자미는 늘 머리가 오른쪽 (v386 — 「좌광우도」)
  if (opts.pitch) ctx.rotate(opts.pitch);
  if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
  if (lk.tail === 'eel') { drawEel(ctx, lk, L, opts); ctx.restore(); return; }
  if (lk.tail === 'ribbon') { drawRibbon(ctx, lk, L, opts); ctx.restore(); return; }
  if (lk.form === 'octo') { drawOcto(ctx, lk, L, opts); ctx.restore(); return; }
  if (lk.form === 'cuttle' || lk.form === 'squid') { drawSquid(ctx, lk, L, opts); ctx.restore(); return; }
  const detail = L >= 70 && !opts.shadow && !opts.lite; // opts.lite = 느린 기기(무늬를 줄임 · v386 Codex 189차)
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
  if (lk.dorsal2) ctx.fill(finPath(lk, b, lk.dorsal2, true));
  if (lk.anal) ctx.fill(finPath(lk, b, lk.anal, false));
  if (lk.adipose) {
    const [a, z] = lk.adipose;
    const ya = edgeY(lk, b, a, true) * 0.9;
    ctx.beginPath(); ctx.moveTo(b.x0 + b.Lb * a, ya); ctx.quadraticCurveTo(b.x0 + b.Lb * (a + z) / 2, ya - b.hd * 0.4, b.x0 + b.Lb * z, edgeY(lk, b, z, true) * 0.9); ctx.fill();
  }
  // 배지느러미 (가자미 무리는 위에서 본 모습이라 안 그림)
  if (!lk.flat) {
    ctx.beginPath();
    const pv = b.x0 + b.Lb * 0.45;
    ctx.moveTo(pv, b.hd * 0.8); ctx.lineTo(pv + b.Lb * 0.09, b.hd * 1.25); ctx.lineTo(pv + b.Lb * 0.1, b.hd * 0.78); ctx.fill();
  }
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
  // 위에서 오는 빛 — 등은 어둡게 배는 밝게(입체) · 가자미 무리는 위에서 본 모습이라 가운데가 살짝 밝게 (v386)
  const sh = lk.flat ? ctx.createRadialGradient(b.x0 + b.Lb * 0.45, -b.hd * 0.2, b.hd * 0.1, b.x0 + b.Lb * 0.45, 0, b.Lb * 0.6) : ctx.createLinearGradient(0, -b.hd, 0, b.hd);
  if (lk.flat) { sh.addColorStop(0, 'rgba(255,255,255,.12)'); sh.addColorStop(1, 'rgba(0,0,0,.14)'); } else { sh.addColorStop(0, 'rgba(0,0,0,.18)'); sh.addColorStop(0.5, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(255,255,255,.1)'); }
  ctx.fillStyle = sh;
  ctx.fillRect(b.x0, -b.hd, b.Lb, b.hd * 2);
  ctx.restore();
  // 가슴지느러미 (pec = 길이 몫 — 부시리는 짧다 · v386)
  ctx.fillStyle = lk.c[3];
  ctx.globalAlpha = fa * 0.7;
  const pk = Number(lk.pec) || 1;
  ctx.beginPath(); ctx.ellipse(b.x0 + b.Lb * (0.24 + 0.075 * (pk - 1)), b.hd * 0.4, b.Lb * 0.075 * pk, b.hd * 0.16, 0.5 + wag * 0.5, 0, Math.PI * 2); ctx.fill();
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
/** 먼 산 · 가까운 산 · 숲 줄 (저수지·강) */
function landHills(ctx, sky, x0, x1) {
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
}
/**
 * 안 움직이는 층 — ctx는 이미 가상 좌표로 맞춰 둔 것 · x0~x1·y0~y1 = 화면에 보이는 가상 좌표 넓이(가장자리까지 채우려고)
 * wx = 🌦️ 날씨 key (sun · cloud · rain · wind — fishing.WEATHER) · place = 물가 ('lake' 저수지 · 'river' 강 — v368: 잔교 대신 큰 바위·자갈 · 연잎·갈대 대신 강가 바위 · 수초 대신 물속 바위 · 맑은 물빛 ·
 *   'sea' 바다 — v369: 산 대신 먼 섬 · 잔교 대신 방파제 · 발치·물속 테트라포드 · 빨간 등대 · 남색 물 · 모래 바닥)
 */
export function paintStatic(ctx, t, x0 = 0, x1 = SCENE_W, y0 = 0, y1 = SCENE_H, wx = 'sun', place = 'lake') {
  const river = place === 'river';
  const boat = place === 'boat'; // 🚤 배 낚시 (v386 시안) — 바다 그대로 · 방파제 대신 낚싯배 · 먼 섬 하나 · 물속 바위
  const sea = place === 'sea' || boat; // 🌊 바다 방파제 (v369 시안) — 산 대신 먼 섬 · 잔교 대신 방파제 · 테트라포드 · 등대 · 모래 바닥
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
  // 먼 산 · 가까운 산 · 숲 줄 (바다는 먼 섬과 수평선)
  if (sea) seaHorizon(ctx, sky, x0, x1, boat);
  else landHills(ctx, sky, x0, x1);
  // 물 — 윗면은 하늘을 비추고 아래로 깊어진다
  const w = ctx.createLinearGradient(0, WATER_Y, 0, y1);
  if (sea) { w.addColorStop(0, mix('#5c9cc4', '#7b7c9a', sky.k * 0.7)); w.addColorStop(0.06, '#2f72a0'); w.addColorStop(0.45, '#1a4c78'); w.addColorStop(1, '#0a2846'); }
  else if (river) { w.addColorStop(0, mix('#78bdb6', '#8a8aa0', sky.k * 0.7)); w.addColorStop(0.06, '#4f9d97'); w.addColorStop(0.45, '#2c706b'); w.addColorStop(1, '#10403d'); }
  else { w.addColorStop(0, mix('#5aa5b3', '#7b7c9a', sky.k * 0.7)); w.addColorStop(0.06, '#3d8a98'); w.addColorStop(0.45, '#1f5f6c'); w.addColorStop(1, '#0b3540'); }
  ctx.fillStyle = w;
  ctx.fillRect(x0, WATER_Y, x1 - x0, y1 - WATER_Y);
  // 산 그림자 비침 (바다는 하늘빛 띠)
  ctx.fillStyle = sea ? 'rgba(255,255,255,.08)' : 'rgba(20,60,50,.18)';
  ctx.fillRect(x0, WATER_Y, x1 - x0, 14);
  // 바닥 · 자갈 · 돌 (바다는 모래)
  const bg = ctx.createLinearGradient(0, 505, 0, Math.max(y1, SCENE_H));
  if (sea) { bg.addColorStop(0, '#a89c74'); bg.addColorStop(0.35, '#7c7152'); bg.addColorStop(1, '#2a2a22'); }
  else { bg.addColorStop(0, '#6a6544'); bg.addColorStop(0.35, '#4c4a33'); bg.addColorStop(1, '#1d241c'); }
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.moveTo(x0, bottomY(x0));
  for (let x = x0; x <= x1; x += 32) ctx.lineTo(x, bottomY(x) + Math.sin(x * 0.05) * 4);
  ctx.lineTo(x1, y1); ctx.lineTo(x0, y1); ctx.closePath(); ctx.fill();
  const rnd = seeded(7);
  ctx.fillStyle = sea ? 'rgba(232,222,190,.55)' : river ? 'rgba(190,182,150,.6)' : 'rgba(160,150,110,.5)';
  for (let i = 0; i < (river || sea ? 150 : 70); i++) { const x = lerp(x0, x1, rnd()); ctx.beginPath(); ctx.ellipse(x, bottomY(x) + 6 + rnd() * 20, 2 + rnd() * 4, 1.5 + rnd() * 2, 0, 0, Math.PI * 2); ctx.fill(); }
  if (sea) { (boat ? boatBank : seaBank)(ctx, x0, x1); if (veil) { ctx.fillStyle = wx === 'rain' ? 'rgba(70,80,92,.22)' : 'rgba(90,100,112,.14)'; ctx.fillRect(x0, WATER_Y, x1 - x0, y1 - WATER_Y); } return; }
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

/** 🌊 먼 섬 둘 · 수평선 안개 (v369 시안 — 바다엔 산 대신) · 🚤 배 낚시는 더 먼 바다라 낮은 섬 하나 (v386) */
function seaHorizon(ctx, sky, x0, x1, far = false) {
  ctx.fillStyle = mix('#8ea4ae', '#6d6f80', sky.k);
  for (const [a, z, h] of far ? [[560, 700, 9]] : [[300, 540, 26], [760, 920, 16]]) {
    ctx.beginPath(); ctx.moveTo(a, WATER_Y);
    ctx.bezierCurveTo(a + (z - a) * 0.2, WATER_Y - h, a + (z - a) * 0.6, WATER_Y - h * 1.1, z, WATER_Y);
    ctx.closePath(); ctx.fill();
  }
  const g = ctx.createLinearGradient(0, WATER_Y - 18, 0, WATER_Y);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,.28)');
  ctx.fillStyle = g;
  ctx.fillRect(x0, WATER_Y - 18, x1 - x0, 18);
}
/** 테트라포드 하나 — 다리 넷 달린 콘크리트 블록(옆에서 보면 다리 셋 + 앞으로 나온 다리 끝) · a = 돌아간 각도 · hi = 앞 다리 끝 밝은 색 */
function tetrapod(ctx, x, y, s, a, col, hi) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = col;
  for (const d of [-Math.PI / 2, Math.PI / 6, (5 * Math.PI) / 6]) {
    const ex = x + Math.cos(a + d) * 24 * s;
    const ey = y + Math.sin(a + d) * 24 * s;
    ctx.lineWidth = 16 * s; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo((x + ex) / 2, (y + ey) / 2); ctx.stroke();
    ctx.lineWidth = 11 * s; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
  }
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.arc(x, y, 12 * s, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = hi;
  ctx.beginPath(); ctx.arc(x - 3 * s, y - 3 * s, 7 * s, 0, Math.PI * 2); ctx.fill();
  ctx.lineCap = 'butt';
}
/** 🌊 바닷가 (v369 시안) — 캐릭터가 서는 방파제(잔교 자리 · 윗면 = 잔교 윗면) · 방파제 발치 테트라포드 · 물속 테트라포드 무더기(14m) · 조개껍데기 · 오른쪽 빨간 등대 */
function seaBank(ctx, x0, x1) {
  const top = DOCK_Y - 10;
  const rnd = seeded(13);
  for (let i = 0; i < 14; i++) {
    const x = lerp(x0, x1, rnd());
    const y = bottomY(x) + 8 + rnd() * 14;
    ctx.fillStyle = ['#efe6d4', '#e8cfc0', '#d9d2c4'][i % 3];
    ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, 4 + rnd() * 3, Math.PI * 1.1, Math.PI * 1.9); ctx.closePath(); ctx.fill();
  }
  // 물속 테트라포드 무더기 (14m 「테트라포드」) — 물빛으로 흐리게
  for (const [x, dy, s, a] of [[690, -6, 1.2, 0.3], [748, -22, 1.4, 1.1], [806, -4, 1.25, 2.0], [770, 16, 1.1, 0.7], [716, 20, 1.0, 1.6]]) tetrapod(ctx, x, bottomY(x) + dy - 18, s, a, '#56656c', 'rgba(150,190,200,.16)');
  // 방파제 — 물속 벽(물빛으로 흐리게) · 물 위 벽 · 윗길 · 물 닿는 띠
  ctx.fillStyle = 'rgba(70,86,94,.55)';
  ctx.fillRect(x0, WATER_Y, DOCK_X - x0, bottomY(DOCK_X) - WATER_Y + 8);
  ctx.fillStyle = '#a7a59c';
  ctx.fillRect(x0, top, DOCK_X - x0, WATER_Y - top + 2);
  ctx.fillStyle = '#c9c6bb';
  ctx.fillRect(x0, top, DOCK_X - x0, 7);
  ctx.strokeStyle = 'rgba(60,60,55,.25)';
  ctx.lineWidth = 1;
  for (let x = Math.floor(x0 / 60) * 60; x < DOCK_X; x += 60) { ctx.beginPath(); ctx.moveTo(x, top + 7); ctx.lineTo(x, WATER_Y); ctx.stroke(); }
  ctx.fillStyle = 'rgba(60,80,60,.35)';
  ctx.fillRect(x0, WATER_Y - 5, DOCK_X - x0, 5);
  // 방파제 발치 테트라포드 — 물 위로 반쯤 · 물 위·물속을 나눠 칠함(물속은 물빛)
  const foot = [[DOCK_X + 12, WATER_Y + 28, 1.1, 0.4], [DOCK_X + 50, WATER_Y + 14, 1.0, 1.5], [DOCK_X + 20, WATER_Y, 0.9, 2.4], [DOCK_X + 82, WATER_Y + 32, 1.05, 0.9]];
  for (const [clipY, h, col, hi] of [[0, WATER_Y + 1, '#9c9a90', 'rgba(255,255,255,.22)'], [WATER_Y + 1, SCENE_H, '#4f6470', 'rgba(150,190,200,.16)']]) {
    ctx.save();
    ctx.beginPath(); ctx.rect(x0, clipY, x1 - x0, h - clipY); ctx.clip();
    for (const [x, y, s, a] of foot) tetrapod(ctx, x, y, s, a, col, hi);
    ctx.restore();
  }
  // 오른쪽 먼 방파제 끝 빨간 등대
  ctx.fillStyle = '#a19f96';
  ctx.fillRect(940, WATER_Y - 14, Math.max(0, x1 - 940), 16);
  ctx.fillStyle = 'rgba(96,104,104,.5)';
  ctx.fillRect(940, WATER_Y + 2, Math.max(0, x1 - 940), 30);
  const lx = 985;
  ctx.fillStyle = '#d4483f';
  ctx.beginPath(); ctx.moveTo(lx - 14, WATER_Y - 14); ctx.lineTo(lx - 9, 120); ctx.lineTo(lx + 9, 120); ctx.lineTo(lx + 14, WATER_Y - 14); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#f4efe6';
  ctx.fillRect(lx - 11, 158, 22, 10);
  ctx.fillStyle = '#3b3f44';
  ctx.fillRect(lx - 11, 112, 22, 8);
  ctx.fillStyle = '#ffe9a6';
  ctx.fillRect(lx - 7, 98, 14, 14);
  ctx.fillStyle = '#c23b33';
  ctx.beginPath(); ctx.moveTo(lx - 10, 98); ctx.lineTo(lx, 86); ctx.lineTo(lx + 10, 98); ctx.closePath(); ctx.fill();
}
/**
 * 🚤 낚싯배 (v386 시안) — 캐릭터가 서는 갑판(잔교 자리 · 윗면 = 잔교 윗면) · 흰 뱃전과 파란 띠 · 위로 솟은 뱃머리 · 물속 배 밑(붉은 칠 · 물빛으로 흐리게) ·
 * 왼쪽 조타실(창 · 주황 구명 튜브 · 안테나와 깃발) · 갑판 난간 · 물속 바위(14m 「물속 바위」)
 */
function boatBank(ctx, x0, x1) {
  const top = DOCK_Y - 10;
  const bow = DOCK_X + 36;
  // 물속 바위 무리 (여)
  for (const [x, rx, ry, c] of [[700, 52, 40, '#3e4a52'], [760, 40, 30, '#46525a'], [812, 56, 44, '#3a464e'], [858, 30, 22, '#44505a']]) {
    const by = bottomY(x) + 6;
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(x, by, rx, ry, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = 'rgba(150,190,200,.12)';
    ctx.beginPath(); ctx.ellipse(x - rx * 0.25, by - ry * 0.7, rx * 0.45, ry * 0.18, -0.2, 0, Math.PI * 2); ctx.fill();
  }
  // 배 밑 (물속 — 붉은 칠을 물빛으로 흐리게)
  ctx.fillStyle = 'rgba(128,56,50,.55)';
  ctx.beginPath(); ctx.moveTo(x0, WATER_Y); ctx.lineTo(bow - 6, WATER_Y); ctx.quadraticCurveTo(bow - 16, WATER_Y + 34, bow - 64, WATER_Y + 46); ctx.lineTo(x0, WATER_Y + 50); ctx.closePath(); ctx.fill();
  // 뱃전 (물 위 — 흰 칠 · 뱃머리는 위로)
  const hull = new Path2D();
  hull.moveTo(x0, top);
  hull.lineTo(DOCK_X - 34, top);
  hull.quadraticCurveTo(DOCK_X + 8, top - 2, bow + 8, top - 20);
  hull.quadraticCurveTo(bow + 2, WATER_Y - 16, bow - 6, WATER_Y + 1);
  hull.lineTo(x0, WATER_Y + 1);
  hull.closePath();
  ctx.fillStyle = '#eef0ec';
  ctx.fill(hull);
  ctx.save();
  ctx.clip(hull);
  ctx.fillStyle = '#2f5d9a';
  ctx.fillRect(x0, top + 8, bow + 20 - x0, 6);
  ctx.fillStyle = 'rgba(60,70,80,.18)';
  ctx.fillRect(x0, WATER_Y - 5, bow + 20 - x0, 6);
  ctx.restore();
  // 갑판 가장자리 · 난간
  ctx.strokeStyle = '#b9bdb6';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x0, top + 1); ctx.lineTo(DOCK_X - 34, top + 1); ctx.quadraticCurveTo(DOCK_X + 8, top - 1, bow + 8, top - 19); ctx.stroke();
  ctx.strokeStyle = '#8e949a';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(Math.max(x0, 66), top - 16); ctx.lineTo(DOCK_X - 34, top - 16); ctx.quadraticCurveTo(DOCK_X + 6, top - 18, bow + 4, top - 34); ctx.stroke();
  for (const px of [96, 150, 204, 250]) {
    const y = px < DOCK_X - 34 ? top : top - ((px - (DOCK_X - 34)) / (bow + 8 - (DOCK_X - 34))) * 19;
    ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px, y - 16 - (px > DOCK_X - 34 ? (px - (DOCK_X - 34)) * 0.2 : 0)); ctx.stroke();
  }
  // 조타실 — 흰 벽 · 파란 지붕 · 창 · 주황 구명 튜브
  const cx0 = Math.max(x0, -60);
  ctx.fillStyle = '#f4f4ef';
  ctx.fillRect(cx0, 112, 58 - cx0, top - 112);
  ctx.fillStyle = '#2f5d9a';
  ctx.fillRect(cx0 - 4, 104, 66 - cx0, 10);
  ctx.fillStyle = '#9cc4dc';
  ctx.fillRect(10, 124, 38, 22);
  ctx.strokeStyle = '#5c6e7c';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 124, 38, 22);
  ctx.beginPath(); ctx.moveTo(29, 124); ctx.lineTo(29, 146); ctx.stroke();
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#f07a24';
  ctx.beginPath(); ctx.arc(30, 166, 8, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 5;
  for (const a of [0.4, 2.0, 3.6, 5.2]) { ctx.beginPath(); ctx.arc(30, 166, 8, a, a + 0.35); ctx.stroke(); }
  // 안테나 · 깃발
  ctx.strokeStyle = '#5a6068';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(22, 104); ctx.lineTo(22, 58); ctx.moveTo(12, 70); ctx.lineTo(32, 70); ctx.stroke();
  ctx.fillStyle = '#d4483f';
  ctx.beginPath(); ctx.moveTo(22, 58); ctx.lineTo(44, 64); ctx.lineTo(22, 70); ctx.closePath(); ctx.fill();
}

// ───────────── 움직이는 것 (프레임마다) ─────────────

/** 물 윗면 반짝임 · 햇살 · 수초 — now(ms) · reduce = 움직임 줄이기 · lite = 느린 기기 · wx = 🌦️ 날씨(바람이면 물결이 크고 수초가 더 흔들림 · 흐림·비는 햇살 없음) */
export function drawWaterFx(ctx, now, reduce, lite, x0 = 0, x1 = SCENE_W, wx = 'sun', place = 'lake') {
  const t = reduce ? 0 : now / 1000;
  if (place === 'river') { riverFx(ctx, t, lite, x0, x1, wx); return; }
  if (place === 'sea' || place === 'boat') { seaFx(ctx, t, lite, x0, x1, wx); return; }
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
/** 🌊 바닷물 (v369 시안) — 너울 줄이 천천히 오르내림(바람이면 크게) · 방파제 발치 테트라포드에 흰 파도 · 물속 모자반 · 하늘에 갈매기 둘(가벼운 그림이면 없음) */
function seaFx(ctx, t, lite, x0, x1, wx) {
  const wind = wx === 'wind';
  const amp = wind ? 4.5 : 2.2;
  ctx.strokeStyle = 'rgba(255,255,255,.3)';
  ctx.lineWidth = 1.6;
  for (let row = 0; row < 4; row++) {
    const y = WATER_Y + 4 + row * 8 + Math.sin(t * 0.8 + row) * amp * 0.6;
    const gap = 110 + row * 20;
    for (let x = Math.floor(x0 / gap) * gap + ((t * (14 + row * 6)) % gap); x < x1; x += gap) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 22, y - amp * 1.6, x + 44 - row * 5, y); ctx.stroke();
    }
  }
  // 흰 파도 — 방파제 발치 테트라포드
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  const n = lite ? 5 : 10;
  for (let i = 0; i < n; i++) {
    const ph = (t * 0.7 + i * 0.29) % 1;
    ctx.globalAlpha = 0.2 + 0.6 * Math.sin(ph * Math.PI);
    ctx.beginPath(); ctx.ellipse(DOCK_X - 6 + i * 11, WATER_Y + 1 - Math.sin(ph * Math.PI) * (wind ? 10 : 5), 7 + (i % 3) * 3, 3, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (!lite && wx !== 'cloud' && wx !== 'rain') {
    ctx.fillStyle = 'rgba(220,240,250,.06)';
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(t * 0.6 + i * 2));
      const x = 380 + i * 230;
      ctx.beginPath(); ctx.moveTo(x, WATER_Y); ctx.lineTo(x + 60, WATER_Y); ctx.lineTo(x - 40, 520); ctx.lineTo(x - 120, 520); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // 모자반 — 테트라포드 무더기 둘레(14m 언저리)
  ctx.strokeStyle = '#6d6a2c';
  ctx.fillStyle = '#7d7a34';
  ctx.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const bx = 664 + i * 30 + ((i * 17) % 11);
    const by = bottomY(bx) - 2;
    const h = 70 + ((i * 41) % 50);
    const sway = Math.sin(t * (wind ? 1.4 : 0.8) + i) * (wind ? 18 : 10);
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + sway * 0.4, by - h * 0.5, bx + sway, by - h); ctx.stroke();
    for (let k = 1; k <= 3; k++) { const f = k / 4; ctx.beginPath(); ctx.arc(bx + sway * f * f + 3, by - h * f, 3, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.lineCap = 'butt';
  if (lite) return;
  // 갈매기 둘
  ctx.strokeStyle = 'rgba(60,64,70,.75)';
  ctx.lineWidth = 2;
  const span = x1 - x0 + 200;
  for (let i = 0; i < 2; i++) {
    const gx = x0 - 100 + ((t * (22 + i * 9) + i * 430) % span);
    const gy = 70 + i * 34 + Math.sin(t * 0.7 + i) * 8;
    const fl = Math.sin(t * 5 + i * 2) * 4;
    ctx.beginPath(); ctx.moveTo(gx - 12, gy - 2 - fl); ctx.quadraticCurveTo(gx - 6, gy - 7 - fl, gx, gy); ctx.quadraticCurveTo(gx + 6, gy - 7 - fl, gx + 12, gy - 2 - fl); ctx.stroke();
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
// 🟢 지가르데 셀·🔴 코어 (v371) — zygview.js의 CELL_ART·CORE_ART와 같은 꼴(40×40 칸) · Path2D가 없는 옛 브라우저면 안 그린다
const CELL_BODY = 'M20 4C30 4 36 12 35 21C34 31 27 36 20 36C12 36 5 30 5 21C5 12 10 4 20 4Z';
const CORE_BODY = 'M20 3L35 11.5V28.5L20 37L5 28.5V11.5Z';
/** 셀(또는 코어) 하나 — (x, y)가 가운데 · s = 폭(px) · opts.core 코어 · opts.wob 흔들기(라디안) · opts.glow 초록 빛 */
export function drawCell(ctx, x, y, s, opts = {}) {
  if (typeof Path2D !== 'function' || !(s > 2)) return;
  const k = s / 40;
  ctx.save();
  ctx.translate(x, y);
  if (opts.wob) ctx.rotate(Number(opts.wob) || 0);
  ctx.scale(k, k);
  ctx.translate(-20, -20);
  if (opts.glow) { ctx.shadowColor = 'rgba(74,222,128,.85)'; ctx.shadowBlur = 14; }
  ctx.lineWidth = 2.5;
  if (opts.core) {
    ctx.fillStyle = '#14532d'; ctx.strokeStyle = '#4ade80';
    const p = new Path2D(CORE_BODY); ctx.fill(p); ctx.shadowBlur = 0; ctx.stroke(p);
    ctx.beginPath(); ctx.arc(20, 20, 8, 0, Math.PI * 2); ctx.fillStyle = '#ef4444'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fecaca'; ctx.stroke();
    ctx.beginPath(); ctx.arc(17.5, 17.5, 2.2, 0, Math.PI * 2); ctx.fillStyle = '#fee2e2'; ctx.fill();
  } else {
    ctx.fillStyle = '#4ade80'; ctx.strokeStyle = '#166534';
    const p = new Path2D(CELL_BODY); ctx.fill(p); ctx.shadowBlur = 0; ctx.stroke(p);
    ctx.beginPath(); ctx.arc(20, 19, 5.5, 0, Math.PI * 2); ctx.fillStyle = '#14532d'; ctx.fill();
    ctx.beginPath(); ctx.arc(18.3, 17.4, 1.8, 0, Math.PI * 2); ctx.fillStyle = '#bbf7d0'; ctx.fill();
  }
  ctx.restore();
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
