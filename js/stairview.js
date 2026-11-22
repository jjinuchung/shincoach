// 🪜 계단 오르내리기 연출 (v435) — 시안(.context/v435/sian/page.js)에서 아버님이 「이대로」 하신 움직임을 앱 방으로 옮겼다.
// · 진짜 캐릭터·파트너 그림은 숨기고, 같은 그림의 「배우」를 방 위 덧칸(.house-climb — 방과 같은 크기)에 띄워 움직인다
// · 움직임은 transform만(옛 태블릿 — houseview.walk와 같은 까닭) · 걷는 동안은 몸이 좌우로 흔들리며 통통(.is-walk)
// · 천장 턱 위·구멍 앞 끝 아래로 간 몸은 덧칸의 clip-path로 가린다 — 덧칸이 배우마다 하나라 캐릭터와 파트너를 따로 가린다
// · 저장은 안 한다 — houseview가 먼저 저장(avatar.avatarFloorRule)하고 이 연출을 부른 뒤 다시 그린다
import { cellFoot, climbPts, gridPath } from './stairart.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2);
/** 한 칸 걷는 시간(ms) · 파트너가 따라 나서는 틈(ms) */
const CELL_MS = 280;
const FOLLOW_MS = 330;

/**
 * 배우 하나 — box = 방(.house-room) · g = stairart.geoOf · node = 보일 그림(새로 만든 것 — 방의 .house-me·.house-pal과 같은 꼴) ·
 * real = 숨길 진짜 그림(없으면 null) · at = 처음 발 자리(방 %)
 */
export function actorOf(box, g, node, real, at) {
  const layer = document.createElement('div');
  layer.className = 'house-climb';
  node.classList.add('house-climb-actor');
  Object.assign(node.style, { left: '0', top: '0', width: `${100 / g.W}%`, height: `${100 / g.rows}%`, zIndex: '', transform: '' });
  layer.style.zIndex = (real && real.style.zIndex) || '10'; // 처음 앞뒤는 진짜 그림 그대로 — 따라 나서기 전에 가구 밑에 깔리지 않게
  layer.appendChild(node);
  box.appendChild(layer);
  if (real) real.style.visibility = 'hidden';
  const a = { box, g, layer, el: node, real, fx: at.fx, fy: at.fy, hop: 0, W: box.clientWidth, H: box.clientHeight };
  draw(a);
  return a;
}
/** 배우를 걷어 내고 진짜 그림을 다시 보인다 */
export function dropActor(a) {
  if (!a) return;
  a.layer.remove();
  if (a.real && a.real.isConnected) a.real.style.visibility = '';
}
function draw(a) {
  const W = a.W;
  const H = a.H;
  const x = (a.fx / 100) * W - W / a.g.W / 2;
  const y = ((a.fy - a.hop) / 100) * H - H / a.g.rows;
  a.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
}
/** 앞뒤 — 방 가구와 같은 셈(10 + 줄) · 계단 위는 10(맨 뒤 줄) */
function zOf(a, z) {
  a.layer.style.zIndex = String(z);
}
/** 가리기 — 'top'은 line(방 %) 위를, 'bottom'은 line 아래를 가린다 · 없으면 다 보인다 */
function clipOf(a, kind, line) {
  a.layer.style.clipPath = kind === 'top' ? `inset(${line.toFixed(2)}% 0 0 0)` : kind === 'bottom' ? `inset(0 0 ${(100 - line).toFixed(2)}% 0)` : '';
}
/** 한 번 움직이기 — hop = 폴짝 높이(방 %) · walk = 걷는 몸짓 · linear = 고른 빠르기. 화면이 숨어 그림 시계(rAF)가 멈춰도 ms 뒤엔 끝난다 */
function tween(a, to, ms, opt = {}) {
  const from = { fx: a.fx, fy: a.fy };
  a.W = a.box.clientWidth; a.H = a.box.clientHeight; // 방 크기는 한 걸음에 한 번만 잰다(그림 틀마다 재지 않게)
  if (Math.abs(to.fx - from.fx) > 0.2) a.el.classList.toggle('is-left', to.fx < from.fx);
  if (opt.walk) a.el.classList.add('is-walk');
  return new Promise((done) => {
    let over = false;
    const finish = () => {
      if (over) return;
      over = true;
      a.fx = to.fx; a.fy = to.fy; a.hop = 0;
      draw(a);
      if (opt.walk) a.el.classList.remove('is-walk');
      done();
    };
    const t0 = performance.now();
    const step = (now) => {
      if (over) return;
      const t = clamp((now - t0) / ms, 0, 1);
      const k = opt.linear ? t : ease(t);
      a.fx = from.fx + (to.fx - from.fx) * k;
      a.fy = from.fy + (to.fy - from.fy) * k;
      a.hop = opt.hop ? Math.sin(Math.PI * t) * opt.hop : 0;
      draw(a);
      if (t < 1) requestAnimationFrame(step); else finish();
    };
    requestAnimationFrame(step);
    setTimeout(finish, ms + 400);
  });
}
/** 칸 길 따라 걷기 — 칸마다 앞뒤(10 + 줄)를 바꾼다 · on()이 거짓이면(집을 닫음·다시 읽음) 거기서 멈춘다 */
async function walkCells(a, cells, on) {
  for (const c of cells) {
    if (!on()) return;
    const p = cellFoot(a.g, c.x, c.y);
    const dist = Math.hypot((p.fx - a.fx) * (a.g.W / 100), (p.fy - a.fy) * (a.g.rows / 100)); // 칸 단위
    zOf(a, 10 + c.y);
    await tween(a, p, Math.max(160, dist * CELL_MS), { walk: true, linear: true });
  }
}

/**
 * 🪜 떠나기 — 1층(up)은 계단 발치(왼쪽 칸 앞)까지 걸어가 한 단씩 폴짝 올라 천장 구멍으로, 2층(down)은 구멍의 높은 쪽(오른쪽 칸 앞)까지 걸어가 구멍 속으로.
 * o = { g, size, x 계단 왼쪽 칸, up, me 배우, pal 배우|null, meCell·palCell 지금 칸, taken 막힌 칸, front 계단 앞 그림(난간 — 오르내리는 동안 배우 앞에),
 *       live 아직 이 화면의 오르기인가(거짓이면 다음 걸음 전에 멈춘다) }
 */
export async function leave(o) {
  const pts = climbPts(o.g, o.x);
  const door = o.up ? { x: o.x, y: 1 } : { x: o.x + 1, y: 1 };
  const on = () => !o.live || o.live();
  const go = async (a, cell, who) => {
    if (who === 'pal') await wait(FOLLOW_MS);
    a.el.classList.remove('is-sit'); // 🐾 쿠션에서 일어난다
    await walkCells(a, gridPath(o.size, o.taken, cell, door), on);
    if (!on()) return;
    if (o.front) o.front.classList.add('is-up');
    zOf(a, 10);
    const dx = who === 'pal' ? -1 : 0; // 파트너는 한 걸음 왼쪽(뒤)
    if (o.up) {
      clipOf(a, 'top', pts.lip);
      for (const p of pts.steps) { if (!on()) return; await tween(a, { fx: p.fx + dx, fy: p.fy }, 300, { hop: 1.6 }); }
      await tween(a, pts.top[who], 420, { linear: true });
    } else {
      clipOf(a, 'bottom', pts.holeEdge);
      await tween(a, pts.holeIn[who], 260);
      await tween(a, pts.holeSink[who], 700, { hop: 1.5 });
    }
  };
  await Promise.all([go(o.me, o.meCell, 'me'), o.pal ? go(o.pal, o.palCell, 'pal') : null]);
}

/** 🪜 오기 전 자리 — 도착하는 층의 계단 끝(2층은 구멍 아래 · 1층은 천장 구멍 너머)에 배우를 숨겨 둔다 (화면이 넘어오는 동안) */
export function arriveStart(o) {
  const pts = climbPts(o.g, o.x);
  if (o.front) o.front.classList.add('is-up');
  for (const [a, who] of [[o.me, 'me'], [o.pal, 'pal']]) {
    if (!a) continue;
    a.el.classList.remove('is-sit');
    zOf(a, 10);
    clipOf(a, o.up ? 'bottom' : 'top', o.up ? pts.holeEdge : pts.lip);
    Object.assign(a, o.up ? pts.holeBelow[who] : pts.top[who]);
    a.hop = 0;
    draw(a);
  }
}

/**
 * 🪜 오기 — 2층(up)은 구멍에서 쑥 올라와, 1층(down)은 계단을 한 단씩 내려와 계단 앞 칸을 지나 선 칸까지 걷는다.
 * o = { g, size, x, up, me, pal, meCell·palCell 다 와서 설 칸, taken 막힌 칸, front } · 앞서 arriveStart로 자리를 잡아 둔다
 */
export async function arrive(o) {
  const pts = climbPts(o.g, o.x);
  const door = o.up ? { x: o.x + 1, y: 1 } : { x: o.x, y: 1 };
  const on = () => !o.live || o.live();
  const come = async (a, cell, who) => {
    if (who === 'pal') await wait(o.up ? 260 : 300);
    const dx = who === 'pal' ? -1 : 0;
    if (o.up) await tween(a, pts.holeIn[who], 620, { hop: 2 });
    else for (const p of [...pts.steps].reverse()) { if (!on()) return; await tween(a, { fx: p.fx + dx, fy: p.fy }, 280, { hop: 1.4 }); }
    clipOf(a, null);
    await walkCells(a, [door, ...gridPath(o.size, o.taken, door, cell)], on);
  };
  await Promise.all([come(o.me, o.meCell, 'me'), o.pal && o.palCell ? come(o.pal, o.palCell, 'pal') : null]);
  if (o.front) o.front.classList.remove('is-up');
}
