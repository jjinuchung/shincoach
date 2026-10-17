// 🖍️ 코드로 그린 가구 그림 (순수 데이터 · DOM 없음 → node에서 시안 페이지도 이것으로) — 이모지가 없거나(🪴🪟는 Emoji 13이라 태블릿에 없다)
// 기기마다 모양이 달라 보이는 가구. house.js FURN의 art 이름으로 고른다 · emoji는 알림 글에만 쓴다.
// 그림 크기는 글자 크기(1em)를 따른다 — shape: wide(2칸 · 1.4em × 0.9em) · tall(1칸 키 큰 것) · box(1칸 낮은 상자) · flat(납작) · wall(벽에 거는 것)
// houseview.artEl이 parts로 SVG를 만든다(v252 책상부터 · ③ 가구 더하기 2026-10-18에 이 파일로 옮김)

export const FURN_ART = {
  // 책상 — 위판·앞 모서리·왼쪽 다리·오른쪽 서랍 셋(손잡이)·위에 책 두 권 (v252)
  desk: {
    vb: '0 0 100 64', shape: 'wide', parts: [
      ['rect', { x: 20, y: 8, width: 16, height: 6, rx: 1, fill: '#3fa34d' }],
      ['rect', { x: 22, y: 4, width: 13, height: 4, rx: 1, fill: '#e0533d' }],
      ['rect', { x: 4, y: 14, width: 92, height: 8, rx: 2, fill: '#c08446' }],
      ['rect', { x: 4, y: 20, width: 92, height: 3, fill: '#8a5a2b' }],
      ['rect', { x: 10, y: 23, width: 6, height: 37, fill: '#8a5a2b' }],
      ['rect', { x: 60, y: 23, width: 30, height: 37, fill: '#a86f38', stroke: '#7a4c22', 'stroke-width': 1.5 }],
      ['line', { x1: 60, y1: 35, x2: 90, y2: 35, stroke: '#7a4c22', 'stroke-width': 1.5 }],
      ['line', { x1: 60, y1: 47, x2: 90, y2: 47, stroke: '#7a4c22', 'stroke-width': 1.5 }],
      ['circle', { cx: 75, cy: 29, r: 2, fill: '#f2d07a' }],
      ['circle', { cx: 75, cy: 41, r: 2, fill: '#f2d07a' }],
      ['circle', { cx: 75, cy: 53, r: 2, fill: '#f2d07a' }],
    ],
  },
  // 🍽️ 식탁 — 위판·다리 둘 · 위에 밥그릇 · 달걀 접시 · 컵
  table: {
    vb: '0 0 100 64', shape: 'wide', parts: [
      ['rect', { x: 10, y: 30, width: 6, height: 30, fill: '#8a5a2b' }],
      ['rect', { x: 84, y: 30, width: 6, height: 30, fill: '#8a5a2b' }],
      ['rect', { x: 4, y: 21, width: 92, height: 8, rx: 3, fill: '#d9a066', stroke: '#8a5a2b', 'stroke-width': 1.5 }],
      ['rect', { x: 6, y: 27, width: 88, height: 4, fill: '#a86f38' }],
      ['ellipse', { cx: 28, cy: 14, rx: 7.5, ry: 3.6, fill: '#fffdf5', stroke: '#c9bba6', 'stroke-width': 0.8 }],
      ['path', { d: 'M20 15 Q28 26 36 15 Z', fill: '#e5484d', stroke: '#a61e22', 'stroke-width': 1 }],
      ['ellipse', { cx: 58, cy: 20, rx: 12, ry: 3.2, fill: '#fff', stroke: '#c9bba6', 'stroke-width': 0.9 }],
      ['ellipse', { cx: 58, cy: 18.6, rx: 6.5, ry: 2.6, fill: '#fff', stroke: '#e9e2d4', 'stroke-width': 0.6 }],
      ['circle', { cx: 58, cy: 18.4, r: 2, fill: '#fcc419' }],
      ['rect', { x: 79, y: 10, width: 8, height: 10, rx: 2, fill: '#74c0fc', stroke: '#1c7ed6', 'stroke-width': 1 }],
    ],
  },
  // 🧊 냉장고 — 위·아래 문 · 손잡이 · 자석 · 메모
  fridge: {
    vb: '0 0 48 80', shape: 'tall', parts: [
      ['rect', { x: 6, y: 2, width: 36, height: 74, rx: 5, fill: '#eef3f7', stroke: '#6b7a8a', 'stroke-width': 1.8 }],
      ['line', { x1: 6, y1: 29, x2: 42, y2: 29, stroke: '#6b7a8a', 'stroke-width': 1.6 }],
      ['rect', { x: 34, y: 11, width: 3.4, height: 12, rx: 1.7, fill: '#9aa8b6' }],
      ['rect', { x: 34, y: 36, width: 3.4, height: 20, rx: 1.7, fill: '#9aa8b6' }],
      ['circle', { cx: 14, cy: 10, r: 3, fill: '#e5484d' }],
      ['rect', { x: 11, y: 38, width: 12, height: 10, fill: '#fff3a6', transform: 'rotate(-6 17 43)' }],
      ['circle', { cx: 17, cy: 37.5, r: 1.6, fill: '#4dabf7' }],
      ['rect', { x: 9, y: 75, width: 6, height: 4, rx: 1, fill: '#6b7a8a' }],
      ['rect', { x: 33, y: 75, width: 6, height: 4, rx: 1, fill: '#6b7a8a' }],
    ],
  },
  // 📖 책장 — 칸 셋에 색색의 책 · 맨 위에 몬스터볼
  shelf: {
    vb: '0 0 56 80', shape: 'tall', parts: [
      ['rect', { x: 4, y: 6, width: 48, height: 72, rx: 2, fill: '#b07a45', stroke: '#7a4c22', 'stroke-width': 1.6 }],
      ['rect', { x: 8, y: 10, width: 40, height: 64, fill: '#8a5a2b' }],
      ['rect', { x: 8, y: 30, width: 40, height: 3, fill: '#b07a45' }],
      ['rect', { x: 8, y: 52, width: 40, height: 3, fill: '#b07a45' }],
      ['rect', { x: 10, y: 14, width: 5, height: 16, fill: '#e5484d' }],
      ['rect', { x: 16, y: 16, width: 4, height: 14, fill: '#fcc419' }],
      ['rect', { x: 21, y: 13, width: 6, height: 17, fill: '#4dabf7' }],
      ['rect', { x: 30, y: 19, width: 14, height: 4, fill: '#51cf66', transform: 'rotate(-28 37 21)' }],
      ['rect', { x: 10, y: 37, width: 6, height: 15, fill: '#845ef7' }],
      ['rect', { x: 17, y: 35, width: 5, height: 17, fill: '#ff922b' }],
      ['rect', { x: 23, y: 38, width: 4, height: 14, fill: '#20c997' }],
      ['rect', { x: 28, y: 36, width: 6, height: 16, fill: '#f06595' }],
      ['rect', { x: 11, y: 59, width: 14, height: 15, rx: 1, fill: '#4c6ef5' }],
      ['rect', { x: 27, y: 58, width: 5, height: 16, fill: '#e5484d' }],
      ['rect', { x: 33, y: 60, width: 5, height: 14, fill: '#fcc419' }],
      ['circle', { cx: 42, cy: 2.8, r: 4, fill: '#fff', stroke: '#3b302b', 'stroke-width': 1 }],
      ['path', { d: 'M38 2.8 A4 4 0 0 1 46 2.8 Z', fill: '#e5484d', stroke: '#3b302b', 'stroke-width': 1 }],
    ],
  },
  // 🧩 장난감 상자 — 파란 상자 · 별 스티커 · 공과 블록이 빼꼼
  toybox: {
    vb: '0 0 64 52', shape: 'box', parts: [
      ['circle', { cx: 20, cy: 14, r: 7, fill: '#ffd43b', stroke: '#c99a06', 'stroke-width': 1 }],
      ['rect', { x: 36, y: 5, width: 11, height: 11, rx: 1.5, fill: '#ff6b6b', stroke: '#c92a2a', 'stroke-width': 1, transform: 'rotate(14 41 10)' }],
      ['rect', { x: 6, y: 19, width: 52, height: 30, rx: 3, fill: '#4dabf7', stroke: '#1c7ed6', 'stroke-width': 1.6 }],
      ['rect', { x: 4, y: 15, width: 56, height: 8, rx: 3, fill: '#339af0', stroke: '#1c7ed6', 'stroke-width': 1.4 }],
      ['polygon', { points: '32,26 34.6,31.4 40.4,32 36,35.8 37.3,41.6 32,38.6 26.7,41.6 28,35.8 23.6,32 29.4,31.4', fill: '#fff3a6' }],
    ],
  },
  // 🌿 큰 화분 — 토분 · 잎 다섯
  plant: {
    vb: '0 0 48 72', shape: 'tall', parts: [
      ['ellipse', { cx: 14, cy: 32, rx: 5, ry: 14, fill: '#2f9e44', transform: 'rotate(-32 14 32)' }],
      ['ellipse', { cx: 34, cy: 32, rx: 5, ry: 14, fill: '#2f9e44', transform: 'rotate(32 34 32)' }],
      ['ellipse', { cx: 18, cy: 20, rx: 5, ry: 14, fill: '#40c057', transform: 'rotate(-12 18 20)' }],
      ['ellipse', { cx: 30, cy: 20, rx: 5, ry: 14, fill: '#40c057', transform: 'rotate(12 30 20)' }],
      ['ellipse', { cx: 24, cy: 16, rx: 5, ry: 15, fill: '#51cf66' }],
      ['path', { d: 'M12 48 L36 48 L33 70 L15 70 Z', fill: '#d9734a', stroke: '#9c4221', 'stroke-width': 1.4 }],
      ['rect', { x: 9, y: 44, width: 30, height: 6, rx: 2, fill: '#e8590c', stroke: '#9c4221', 'stroke-width': 1.2 }],
    ],
  },
  // 🌤️ 창문 — 하늘·해·구름 · 십자 창살 · 분홍 커튼 · 창턱
  window: {
    vb: '0 0 80 60', shape: 'wall', parts: [
      ['rect', { x: 8, y: 4, width: 64, height: 46, rx: 3, fill: '#fff', stroke: '#8a5a2b', 'stroke-width': 2.4 }],
      ['rect', { x: 12, y: 8, width: 56, height: 38, fill: '#a5d8ff' }],
      ['circle', { cx: 56, cy: 17, r: 6, fill: '#ffe066' }],
      ['ellipse', { cx: 26, cy: 18, rx: 8, ry: 3.6, fill: '#fff' }],
      ['ellipse', { cx: 31, cy: 15.5, rx: 5, ry: 3.4, fill: '#fff' }],
      ['line', { x1: 40, y1: 8, x2: 40, y2: 46, stroke: '#8a5a2b', 'stroke-width': 2.4 }],
      ['line', { x1: 12, y1: 27, x2: 68, y2: 27, stroke: '#8a5a2b', 'stroke-width': 2.4 }],
      ['path', { d: 'M4 2 L18 2 Q12 26 16 52 L4 52 Z', fill: '#ff8fab', stroke: '#e64980', 'stroke-width': 1 }],
      ['path', { d: 'M76 2 L62 2 Q68 26 64 52 L76 52 Z', fill: '#ff8fab', stroke: '#e64980', 'stroke-width': 1 }],
      ['rect', { x: 2, y: 51, width: 76, height: 6, rx: 2, fill: '#c08446', stroke: '#8a5a2b', 'stroke-width': 1 }],
    ],
  },
  // 🐾 파트너 쿠션 — 분홍 방석 · 발자국 무늬 (방에 놓으면 파트너가 그 위에 앉는다)
  cushion: {
    vb: '0 0 64 40', shape: 'flat', parts: [
      ['ellipse', { cx: 32, cy: 27, rx: 29, ry: 11, fill: '#f783ac', stroke: '#c2255c', 'stroke-width': 1.4 }],
      ['ellipse', { cx: 32, cy: 23, rx: 25, ry: 8.5, fill: '#ffc9de' }],
      ['circle', { cx: 32, cy: 24.5, r: 3.6, fill: '#f06595' }],
      ['circle', { cx: 26.5, cy: 20, r: 1.8, fill: '#f06595' }],
      ['circle', { cx: 30, cy: 18, r: 1.8, fill: '#f06595' }],
      ['circle', { cx: 34, cy: 18, r: 1.8, fill: '#f06595' }],
      ['circle', { cx: 37.5, cy: 20, r: 1.8, fill: '#f06595' }],
    ],
  },
};

const attr = (o) => Object.entries(o).map(([k, v]) => `${k}="${String(v).replace(/[&<>"]/g, '')}"`).join(' ');

/** 그림 하나를 SVG 글자로 (순수 — 시안 페이지·시험) · 모르는 이름이면 '' */
export function furnArtSvg(name, cls = 'house-art') {
  const a = Object.prototype.hasOwnProperty.call(FURN_ART, name) ? FURN_ART[name] : null;
  if (!a) return '';
  return `<svg class="${String(cls).replace(/[^\w -]/g, '')} is-${a.shape}" viewBox="${a.vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${a.parts.map(([t, o]) => `<${t} ${attr(o)}/>`).join('')}</svg>`;
}
