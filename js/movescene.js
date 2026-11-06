// 🚚 이사 대작전 장면 (v397) — 앱이 캔버스로 직접 그린다(그림 파일 없음 · 저작권 없음) · 포켓몬은 그 위에 얹는다
// paintMove(c, w, h, t, key) — key: pack · bye · road · clean · unpack · party · night · 640 × 320 판을 칸에 꽉 차게(넘치는 곳은 잘림)
const BOX = '#c99a5b';
const BOX_D = '#a87a41';
const TAPE = '#ecd9b4';

function rr(c, x, y, w, h, r, col) {
  c.fillStyle = col;
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
  c.fill();
}
function disc(c, x, y, r, col) {
  c.fillStyle = col;
  c.beginPath();
  c.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
  c.fill();
}
function sky(c, top, low) {
  const g = c.createLinearGradient(0, 0, 0, 320);
  g.addColorStop(0, top);
  g.addColorStop(1, low);
  c.fillStyle = g;
  c.fillRect(0, 0, 640, 320);
}
function box(c, x, y, w, h) {
  rr(c, x, y, w, h, 3, BOX);
  c.fillStyle = BOX_D;
  c.fillRect(x, y + h - 5, w, 5);
  c.fillStyle = TAPE;
  c.fillRect(x + w / 2 - 6, y, 12, h);
  c.fillStyle = '#fff';
  c.fillRect(x + 8, y + 10, Math.min(20, w / 3), 11);
}
function room(c, wall, floor) {
  c.fillStyle = wall;
  c.fillRect(0, 0, 640, 215);
  c.fillStyle = floor;
  c.fillRect(0, 215, 640, 105);
  c.fillStyle = 'rgba(0,0,0,.08)';
  c.fillRect(0, 211, 640, 5);
}
function cloud(c, x, y, s) {
  disc(c, x, y, 18 * s, '#fff');
  disc(c, x + 22 * s, y - 8 * s, 22 * s, '#fff');
  disc(c, x + 48 * s, y, 17 * s, '#fff');
  rr(c, x - 12 * s, y, 74 * s, 16 * s, 8 * s, '#fff');
}
const drift = (x, t, v, span = 760) => (((x + t * v + 120) % span) + span) % span - 120;
function house(c, x, y, w, h, wall, roof, floors) {
  c.fillStyle = roof;
  c.beginPath();
  c.moveTo(x - 14, y);
  c.lineTo(x + w / 2, y - h * 0.34);
  c.lineTo(x + w + 14, y);
  c.closePath();
  c.fill();
  c.fillStyle = wall;
  c.fillRect(x, y, w, h);
  const fh = h / floors;
  for (let f = 0; f < floors; f++) {
    const wy = y + f * fh + fh * 0.2;
    for (const k of [0.16, 0.62]) {
      if (f === floors - 1 && k > 0.5) continue;
      rr(c, x + w * k, wy, w * 0.22, fh * 0.42, 2, '#bfe3f7');
    }
  }
  rr(c, x + w * 0.62, y + h - fh * 0.68, w * 0.2, fh * 0.68, 2, '#8a5a34');
}
function truck(c, x, y, shake) {
  const dy = Math.sin(shake) * 1.2;
  rr(c, x, y + dy, 150, 72, 5, '#2f74c0');
  rr(c, x + 150, y + 22 + dy, 58, 50, 6, '#f2c14e');
  rr(c, x + 166, y + 30 + dy, 32, 20, 3, '#cfeaf8');
  box(c, x + 16, y - 34 + dy, 44, 34);
  box(c, x + 64, y - 26 + dy, 38, 26);
  for (const wx of [x + 34, x + 170]) {
    disc(c, wx, y + 74, 15, '#26303a');
    disc(c, wx, y + 74, 6, '#c8d2da');
  }
}
const twinkle = (c, x, y, s, a) => {
  c.fillStyle = `rgba(248,233,166,${a})`;
  c.fillRect(x - s, y - 1, s * 2, 2);
  c.fillRect(x - 1, y - s, 2, s * 2);
};

const SCENES = {
  pack(c) {
    room(c, '#f4ead8', '#d9b98a');
    rr(c, 40, 70, 150, 12, 2, '#9a6b3c');
    box(c, 52, 34, 46, 36);
    box(c, 112, 42, 40, 28);
    box(c, 40, 200, 88, 62);
    box(c, 128, 214, 74, 48);
    box(c, 74, 150, 72, 50);
    rr(c, 470, 60, 120, 100, 4, '#fff');
    rr(c, 478, 68, 104, 84, 3, '#bfe3f7');
  },
  bye(c, t) {
    sky(c, '#bfe3f7', '#eef8fd');
    cloud(c, drift(40, t, 6), 56, 1);
    cloud(c, drift(400, t, 4), 34, 0.8);
    c.fillStyle = '#9fd28a';
    c.fillRect(0, 232, 640, 88);
    house(c, 40, 112, 200, 122, '#f3e3c6', '#b5694a', 1);
    rr(c, 270, 214, 30, 26, 4, '#b5694a');
    disc(c, 285, 196, 22, '#6fb35f');
  },
  road(c, t) {
    sky(c, '#c8e8fa', '#f2fbff');
    cloud(c, drift(80, t, 8), 50, 1);
    cloud(c, drift(460, t, 5), 80, 0.8);
    c.fillStyle = '#a8d794';
    c.beginPath();
    c.moveTo(0, 240);
    c.quadraticCurveTo(220, 120, 420, 200);
    c.quadraticCurveTo(540, 240, 640, 160);
    c.lineTo(640, 320);
    c.lineTo(0, 320);
    c.fill();
    c.fillStyle = '#6d7782';
    c.fillRect(0, 258, 640, 62);
    c.fillStyle = '#f4f7f9';
    const off = (t * 40) % 74;
    for (let i = -74; i < 640; i += 74) c.fillRect(i - off, 286, 38, 5);
    truck(c, 330, 176, t * 9);
  },
  clean(c, t) {
    room(c, '#eaf4fa', '#cfd9e1');
    rr(c, 88, 46, 150, 104, 4, '#fff');
    rr(c, 96, 54, 134, 88, 3, '#bfe3f7');
    rr(c, 300, 46, 150, 104, 4, '#fff');
    rr(c, 308, 54, 134, 88, 3, '#bfe3f7');
    c.fillStyle = '#c29b6d';
    for (let i = 0; i < 6; i++) c.fillRect(500 + i * 23, 215 - (i + 1) * 30, 140, 30);
    for (const [x, r, v] of [[150, 13, 22], [230, 9, 30], [330, 8, 18], [420, 7, 26]]) {
      const y = 300 - ((t * v + x) % 240);
      disc(c, x, y, r, 'rgba(120,195,240,.55)');
    }
  },
  unpack(c, t) {
    room(c, '#fdf0e2', '#d7b48a');
    rr(c, 40, 214, 190, 66, 14, '#6ea18f');
    rr(c, 32, 186, 206, 42, 14, '#7eb3a0');
    box(c, 270, 232, 76, 54);
    c.strokeStyle = '#8b6a48';
    c.lineWidth = 3;
    const sw = Math.sin(t * 1.4) * 5;
    c.beginPath();
    c.moveTo(372, 0);
    c.lineTo(372 + sw, 52);
    c.stroke();
    disc(c, 372 + sw, 72, 22, '#ffd976');
  },
  party(c, t) {
    room(c, '#fff4d9', '#d7b48a');
    for (let i = 0; i < 9; i++) {
      c.fillStyle = ['#ef7f7f', '#f2c14e', '#7fb6ef'][i % 3];
      c.beginPath();
      c.moveTo(30 + i * 68, 24);
      c.lineTo(62 + i * 68, 24);
      c.lineTo(46 + i * 68, 58 + Math.sin(t * 2 + i) * 3);
      c.fill();
    }
    rr(c, 234, 208, 172, 16, 3, '#9a6b3c');
    rr(c, 262, 156, 116, 54, 8, '#fdeff3');
    rr(c, 262, 156, 116, 18, 8, '#f2a7bd');
    for (const x of [290, 320, 350]) {
      c.fillStyle = '#7fb6ef';
      c.fillRect(x - 2, 134, 5, 22);
      disc(c, x, 130 + Math.sin(t * 6 + x) * 1.5, 5, '#f2c14e');
    }
  },
  night(c, t) {
    sky(c, '#23355a', '#3a4c75');
    c.fillStyle = '#4b5c85';
    c.fillRect(0, 224, 640, 96);
    rr(c, 228, 34, 188, 128, 4, '#6d7fa8');
    rr(c, 238, 44, 168, 108, 3, '#132042');
    disc(c, 348, 88, 22, '#f8e9a6');
    disc(c, 340, 82, 19, '#132042');
    [[268, 72], [298, 118], [386, 126], [262, 128]].forEach(([x, y], i) => twinkle(c, x, y, 4, 0.55 + 0.45 * Math.sin(t * 1.5 + i * 2)));
    rr(c, 118, 206, 404, 74, 12, '#87624a');
    rr(c, 132, 186, 376, 64, 12, '#dfe7f4');
    rr(c, 132, 214, 376, 44, 10, '#7fa8df');
  },
};
/** 장면 이름들 — 없는 이름은 짐 싸기 */
export const MOVE_SCENES = Object.keys(SCENES);

/** 장면 한 장 — 칸 비율이 달라도 빈틈 없이 */
export function paintMove(c, w, h, t, key) {
  const s = Math.max(w / 640, h / 320);
  c.save();
  c.clearRect(0, 0, w, h);
  c.translate((w - 640 * s) / 2, (h - 320 * s) / 2);
  c.scale(s, s);
  (SCENES[key] || SCENES.pack)(c, Number(t) || 0);
  c.restore();
}
