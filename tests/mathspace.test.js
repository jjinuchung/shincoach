// 🧊 S 공간과 입체 줄기 생성기 테스트: node --test tests/mathspace.test.js
//
// ★ 핵심은 **독립 검산** — 생성기가 알려 주는 값(probe)을 믿지 않고 **문제 글의 그림 지시문을 이 파일이 직접 읽어** 다시 푼다.
//   · 위·앞·옆·뒤·왼쪽에서 본 모양은 이 파일이 "그 쪽에 서서" 다시 센다
//   · 보이지 않는 쌓기나무는 **그린 SVG의 면을 그 순서대로 픽셀에 다시 칠해** 센다 (그림 코드의 계산을 안 쓴다)
//   · 위·앞·옆 모양에 맞는 쌓은 모양은 칸마다 1~3층을 **모두** 넣어 보며 센다 (생성기는 칸마다 범위를 줄여 센다)
//   · 같은 모양인지는 이 파일이 x·y·z축으로 90°씩 **돌려 보며** 다시 따진다 (생성기는 축 바꿈 + 부호 행렬)
// ★ 이름표는 값만이 아니라 **뜻**까지 — 그 틀린 생각을 문제의 그림으로 다시 해서 오답과 대조한다 (메모 38·40번)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SPACE, TAGS, makeQuestion, makeRound, ladder, placeFrom, diagnosticSet, lessonOf, checkContent, gradeLabel } from '../js/mathspace.js';
import { tplKey } from '../js/mathgen.js';
import { figureSvg, renderFigures, figText } from '../js/mathdraw.js';
import { padSpec, readTyped, matchTyped, partsOf } from '../js/mathpad.js';

const OPTS = { names: ['피카츄', '리자몽', '개굴닌자'], me: '진우', worlds: { pokemon: [], toystory: [], minions: [], moana: [] } };
// 문항 하나에 10ms 남짓(보이는 정도 계산) — 기본 150개, RNG_SEEDS로 넓힌다
const SEEDS = Number(process.env.RNG_SEEDS) || 150;
const FIG_SEEDS = Number(process.env.FIG_SEEDS) || 20;
const IDS = SPACE.map((c) => c.id);
const LBL = ['㉠', '㉡', '㉢', '㉣'];

// ───────────────────── 이 파일의 읽기 도구 ─────────────────────

/** "2 1 0 / 1 3 1"·"2,1,0/1,3,1" → H[j][i] (j = 0이 앞 줄 = 글의 마지막 줄) */
function rowsOf(arg) {
  const rows = String(arg).trim().split('/').map((r) => r.trim().split(/[\s,]+/).filter(Boolean).map(Number));
  return rows.slice().reverse();
}
const figsOf = (q) => [...String(q).matchAll(/\[(stack|stacks|views|top|layers) ([^\]]+)\]/g)].map((m) => ({ kind: m[1], arg: m[2] }));
const sumAll = (H) => H.flat().reduce((a, b) => a + b, 0);
const cellsN = (H) => H.flat().filter((h) => h > 0).length;
const tallest = (H) => Math.max(...H.flat());
/** 그 쪽에 서서 본 모양 — 내 왼쪽부터 기둥마다 가장 높은 층 */
function seen(H, dir) {
  const D = H.length; const W = H[0].length; const out = [];
  if (dir === 'front') for (let i = 0; i < W; i++) { let m = 0; for (let j = 0; j < D; j++) m = Math.max(m, H[j][i]); out.push(m); }
  if (dir === 'back') for (let i = W - 1; i >= 0; i--) { let m = 0; for (let j = 0; j < D; j++) m = Math.max(m, H[j][i]); out.push(m); }
  if (dir === 'right') for (let j = 0; j < D; j++) { let m = 0; for (let i = 0; i < W; i++) m = Math.max(m, H[j][i]); out.push(m); }
  if (dir === 'left') for (let j = D - 1; j >= 0; j--) { let m = 0; for (let i = 0; i < W; i++) m = Math.max(m, H[j][i]); out.push(m); }
  return `s:${out.join(',')}`;
}
/** 위에서 본 모양 — 뒤 줄부터, 0·1 */
const fromTop = (H) => `t:${H.slice().reverse().map((row) => row.map((h) => (h > 0 ? 1 : 0)).join('')).join('/')}`;
/** [views] 후보 → { 이름: 's:2,3,1' | 't:110/011' } */
function viewsOf(arg) {
  const out = {};
  for (const t of arg.trim().split(/\s+/)) { const [k, v] = t.split('='); out[k] = v.includes('/') || (/^[01]+$/.test(v) && v.length > 1) ? `t:${v}` : `s:${v}`; }
  return out;
}
/** [stacks] 후보 → { 이름: H } */
function stacksOf(arg) {
  const out = {};
  for (const t of arg.trim().split(/\s+/)) { if (t === 'free') continue; const [k, v] = t.split('='); out[k] = rowsOf(v); }
  return out;
}
const sameH = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const has = (H, i, j, k) => j >= 0 && j < H.length && i >= 0 && i < H[0].length && k >= 0 && H[j][i] > k;

/** 위·앞·옆에서 본 모양에 맞는 쌓은 모양을 모두 — 위 칸마다 1~3층을 다 넣어 본다 */
function allFits(topCells, front, side) {
  const D = topCells.length; const W = topCells[0].length;
  const spots = []; for (let j = 0; j < D; j++) for (let i = 0; i < W; i++) if (topCells[j][i]) spots.push([i, j]);
  const sols = []; const H = topCells.map((row) => row.map(() => 0));
  (function go(n) {
    if (n === spots.length) { if (seen(H, 'front') === front && seen(H, 'right') === side) sols.push(H.map((row) => row.slice())); return; }
    const [i, j] = spots[n];
    for (let v = 1; v <= 3; v++) { H[j][i] = v; go(n + 1); }
    H[j][i] = 0;
  }(0));
  return sols;
}
/** 't:110/011' → 칸 표 (j = 0이 앞) */
const topCellsOf = (t) => t.slice(2).split('/').map((r) => [...r].map(Number)).reverse();

/** 't:110/011/111' 위 모양을 종이째 90°·180°·270° 돌린 것 — 칸 (줄 r, 칸 c)를 (c, n − 1 − r)로 옮겨 가며 (정사각형 바닥만) */
function turnsOfTop(t) {
  let g = t.slice(2).split('/').map((r) => [...r]);
  const n = g.length;
  const out = [];
  for (let k = 0; k < 3; k++) {
    const h = Array.from({ length: n }, () => Array(n).fill('0'));
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) h[c][n - 1 - r] = g[r][c];
    g = h;
    out.push(`t:${g.map((r) => r.join('')).join('/')}`);
  }
  return g[0].length === n ? out : [];
}

/** 바깥에 드러난 면 (바닥 빼고) — 쌓기나무마다 이웃이 없는 위·네 옆 */
function paintCount(H) {
  let n = 0;
  H.forEach((row, j) => row.forEach((h, i) => {
    for (let k = 0; k < h; k++) {
      if (!has(H, i, j, k + 1)) n++;
      if (!has(H, i + 1, j, k)) n++;
      if (!has(H, i - 1, j, k)) n++;
      if (!has(H, i, j + 1, k)) n++;
      if (!has(H, i, j - 1, k)) n++;
    }
  }));
  return n;
}

// ── 같은 모양 판정 — x·y·z축으로 90°씩 돌린 것을 모두 모아 비교 ──
const turnX = ([x, y, z]) => [x, -z, y];
const turnY = ([x, y, z]) => [z, y, -x];
const turnZ = ([x, y, z]) => [-y, x, z];
const cubesOfH = (H) => { const out = []; H.forEach((row, j) => row.forEach((h, i) => { for (let k = 0; k < h; k++) out.push([i, j, k]); })); return out; };
const keyOf = (cs) => { const m = [0, 1, 2].map((d) => Math.min(...cs.map((c) => c[d]))); return cs.map((c) => c.map((v, d) => v - m[d]).join(',')).sort().join(' '); };
function allTurns(cs) {
  const out = new Set(); let frontier = [cs];
  const seenK = new Set([keyOf(cs)]); out.add(keyOf(cs));
  while (frontier.length) {
    const next = [];
    for (const f of frontier) for (const T of [turnX, turnY, turnZ]) {
      const g = f.map(T); const k = keyOf(g);
      if (!seenK.has(k)) { seenK.add(k); out.add(k); next.push(g); }
    }
    frontier = next;
  }
  return out;
}
const sameShape = (A, B) => allTurns(cubesOfH(A)).has(keyOf(cubesOfH(B)));
const mirrorOfH = (H) => H.map((row) => row.slice().reverse());
/**
 * 쌓기나무 n개로 만들 수 있는 모양을 이 파일이 모두 다시 만든다 (돌려 같은 것은 하나로).
 * { all: 가짓수, mirrorOne: 거울 짝도 하나로 칠 때, flat: 한 층으로 놓이는 것, list }
 */
function polyShapes(n) {
  const list = [];
  const grow = (cs) => {
    if (cs.length === n) { if (!list.some((x) => allTurns(x).has(keyOf(cs)))) list.push(cs); return; }
    for (const c of cs) for (const d of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
      const nc = c.map((v, i) => v + d[i]);
      if (!cs.some((x) => x.every((v, i) => v === nc[i]))) grow([...cs, nc]);
    }
  };
  grow([[0, 0, 0]]);
  const mir = (cs) => cs.map(([x, y, z]) => [-x, y, z]);
  const groups = [];
  for (const cs of list) if (!groups.some((g) => allTurns(mir(g)).has(keyOf(cs)))) groups.push(cs);
  const flat = list.filter((cs) => [0, 1, 2].some((d) => cs.every((c) => c[d] === cs[0][d]))).length;
  return { all: list.length, mirrorOne: groups.length, flat, list };
}

// ── 보이는 쌓기나무 — 그린 SVG의 면(sk-f)을 그 순서대로 픽셀에 칠한다 ──
function inPoly(x, y, P) {
  let c = false;
  for (let a = 0, b = P.length - 1; a < P.length; b = a++) {
    if ((P[a][1] > y) !== (P[b][1] > y) && x < ((P[b][0] - P[a][0]) * (y - P[a][1])) / (P[b][1] - P[a][1]) + P[a][0]) c = !c;
  }
  return c;
}
/** 쌓은 모양 SVG → { visible: Set("i,j,k"), topShare: { "i,j": 그 기둥 맨 위 윗면이 보이는 몫 } } */
function paintSvg(svg) {
  const faces = [...svg.matchAll(/<polygon class="sk-f" data-c="([^"]+)" data-f="(\w+)" points="([^"]+)"/g)].map((m) => ({ c: m[1], f: m[2], P: m[3].split(' ').map((p) => p.split(',').map(Number)) }));
  const xs = faces.flatMap((F) => F.P.map((p) => p[0])); const ys = faces.flatMap((F) => F.P.map((p) => p[1]));
  const own = new Map(); const area = new Map();
  for (let y = Math.floor(Math.min(...ys)) + 0.5; y < Math.max(...ys); y += 1) {
    for (let x = Math.floor(Math.min(...xs)) + 0.5; x < Math.max(...xs); x += 1) {
      let last = -1;
      faces.forEach((F, n) => { if (inPoly(x, y, F.P)) { last = n; area.set(n, (area.get(n) || 0) + 1); } });
      if (last >= 0) own.set(last, (own.get(last) || 0) + 1);
    }
  }
  const visible = new Set(); const topShare = {};
  faces.forEach((F, n) => {
    if ((own.get(n) || 0) > 3) visible.add(F.c);
    if (F.f === 'top') { const [i, j] = F.c.split(','); topShare[`${i},${j}`] = { k: Number(F.c.split(',')[2]), share: (own.get(n) || 0) / Math.max(1, area.get(n) || 0) }; }
  });
  return { visible, topShare, faces };
}
const stackSvgOf = (H, extra = '') => figureSvg(`stack ${H.slice().reverse().map((r) => r.join(' ')).join(' / ')}${extra}`);
/** 겨냥도만 보고 쌓은 모양을 다 알 수 있나 — 기둥마다 맨 위가 보이고(25%↑), 빈 칸에 1개를 놓아도 그 윗면이 보인다 */
function clearPicture(H) {
  const P = paintSvg(stackSvgOf(H));
  for (let j = 0; j < H.length; j++) for (let i = 0; i < H[0].length; i++) {
    if (H[j][i]) { const t = P.topShare[`${i},${j}`]; if (!t || t.share < 0.25) return false; continue; }
    const T = H.map((row) => row.slice()); T[j][i] = 1;
    const t = paintSvg(stackSvgOf(T)).topShare[`${i},${j}`];
    if (!t || t.share < 0.25) return false;
  }
  return true;
}

const DIR_WORD = { front: '앞에서', back: '뒤에서', right: '오른쪽 옆에서', left: '왼쪽 옆에서' };
const WORD_DIR = Object.fromEntries(Object.entries(DIR_WORD).map(([k, v]) => [v, k]));
const OPP = { front: 'back', back: 'front', right: 'left', left: 'right' };

/**
 * 문제 글 → { type, ans, f } — f는 이름표 판정에 쓰는 재료
 */
function solveText(q) {
  const F = figsOf(q);
  const fig = (k) => F.find((x) => x.kind === k);
  const pickOne = (cands, ok) => { const hit = Object.keys(cands).filter((k) => ok(cands[k])); assert.equal(hit.length, 1, `맞는 후보가 하나가 아니다: ${hit.join(',')}\n${q}`); return hit[0]; };
  let m;
  if (/어느 한 쪽에서 본 모양이 ㉠이에요/.test(q)) {
    const H = rowsOf(fig('stack').arg); const v = viewsOf(fig('views').arg)['㉠'];
    const hit = Object.keys(DIR_WORD).filter((d) => seen(H, d) === v);
    assert.equal(hit.length, 1, `본 모양이 맞는 쪽이 하나가 아니다\n${q}`);
    return { type: 'whichDir', ans: DIR_WORD[hit[0]], f: { H, d: hit[0] } };
  }
  if ((m = /쌓은 모양을 (앞에서|뒤에서|오른쪽 옆에서|왼쪽 옆에서|위에서) 본 모양은 어느 것일까요\?/.exec(q))) {
    const H = rowsOf(fig('stack').arg); const C = viewsOf(fig('views').arg);
    const want = m[1] === '위에서' ? fromTop(H) : seen(H, WORD_DIR[m[1]]);
    return { type: 'pickView', ans: pickOne(C, (v) => v === want), f: { H, C, d: m[1] === '위에서' ? 'top' : WORD_DIR[m[1]] } };
  }
  if (/쌓은 모양과 위에서 본 모양이에요\. 쌓기나무는 모두 몇 개/.test(q)) {
    const H = rowsOf(fig('stack').arg);
    assert.equal(viewsOf(fig('views').arg)['위'], fromTop(H), '함께 준 위에서 본 모양이 그림과 다르다');
    return { type: 'count', ans: String(sumAll(H)), f: { H } };
  }
  if (/보이지 않는 쌓기나무는 몇 개/.test(q)) {
    const H = rowsOf(fig('stack').arg);
    assert.equal(viewsOf(fig('views').arg)['위'], fromTop(H));
    const vis = paintSvg(figureSvg(`stack ${fig('stack').arg}`)).visible.size;
    return { type: 'hidden', ans: String(sumAll(H) - vis), f: { H, vis } };
  }
  if (/위, 앞, 옆에서 본 모양이에요\. 쌓기나무는 모두 몇 개/.test(q)) {
    const V = viewsOf(fig('views').arg);
    const sols = allFits(topCellsOf(V['위']), V['앞'], V['옆']);
    assert.equal(sols.length, 1, `세 모양에 맞는 쌓은 모양이 ${sols.length}가지\n${q}`);
    return { type: 'uniq', ans: String(sumAll(sols[0])), f: { V, H: sols[0] } };
  }
  if (/위, 앞, 옆에서 본 모양이 다음과 같은 쌓은 모양은 어느 것/.test(q)) {
    const V = viewsOf(fig('views').arg); const C = stacksOf(fig('stacks').arg);
    return { type: 'match', ans: pickOne(C, (H) => fromTop(H) === `t:${V['위'].slice(2)}` && seen(H, 'front') === V['앞'] && seen(H, 'right') === V['옆']), f: { V, C } };
  }
  if (/수를 썼어요\. 쌓기나무는 모두 몇 개/.test(q)) {
    const H = rowsOf(fig('top').arg);
    return { type: 'topSum', ans: String(sumAll(H)), f: { H } };
  }
  if ((m = /수를 썼어요\. (앞에서|오른쪽 옆에서) 본 모양은 어느 것/.exec(q))) {
    const H = rowsOf(fig('top').arg); const C = viewsOf(fig('views').arg); const d = WORD_DIR[m[1]];
    return { type: 'topView', ans: pickOne(C, (v) => v === seen(H, d)), f: { H, C, d } };
  }
  if (/수를 썼어요\. 쌓은 모양은 어느 것/.test(q)) {
    const H = rowsOf(fig('top').arg); const C = stacksOf(fig('stacks').arg);
    return { type: 'topStack', ans: pickOne(C, (x) => sameH(x, H)), f: { H, C } };
  }
  if (/층별로 나타냈어요\. 쌓기나무는 모두 몇 개/.test(q)) {
    const H = rowsOf(fig('layers').arg);
    return { type: 'layerSum', ans: String(sumAll(H)), f: { H } };
  }
  if (/2층에 있는 쌓기나무는 몇 개/.test(q)) {
    // 쌓은 모양 + 위에서 본 모양(생성기) 또는 층별 그림(원고)
    const st = fig('stack'); const H = rowsOf((st || fig('layers')).arg);
    if (st) assert.equal(viewsOf(fig('views').arg)['위'], fromTop(H));
    return { type: 'floor2', ans: String(H.flat().filter((h) => h >= 2).length), f: { H } };
  }
  if ((m = /쌓기나무 (\d)개로 만들 수 있는 서로 다른 모양은 모두 몇 가지/.exec(q))) {
    // 원고 S7 — 이 파일이 쌓기나무 n개짜리를 모두 다시 만들어 센다
    const S = polyShapes(+m[1]);
    return { type: 'shapes', ans: String(S.all), f: S };
  }
  if (/이 모양과 같은 모양은 어느 것/.test(q)) {
    const G = rowsOf(fig('stack').arg.replace(/\s*free/, '')); const C = stacksOf(fig('stacks').arg);
    assert.equal(sumAll(G), 4);
    return { type: 'same', ans: pickOne(C, (x) => sameShape(G, x)), f: { G, C } };
  }
  if (/나머지와 다른 모양은 어느 것/.test(q)) {
    const C = stacksOf(fig('stacks').arg);
    const odd = (k) => Object.keys(C).filter((o) => o !== k).every((o) => !sameShape(C[k], C[o]));
    return { type: 'diff', ans: pickOne(C, (x) => { const k = Object.keys(C).find((kk) => C[kk] === x); return odd(k); }), f: { C } };
  }
  if ((m = /가장 (적게|많이) 사용할 때 몇 개/.exec(q))) {
    const V = viewsOf(fig('views').arg);
    const sols = allFits(topCellsOf(V['위']), V['앞'], V['옆']);
    const ns = sols.map(sumAll);
    assert.ok(sols.length >= 2 && Math.min(...ns) < Math.max(...ns), `가장 적을 때와 많을 때가 같다\n${q}`);
    return { type: 'mm', ans: String(m[1] === '적게' ? Math.min(...ns) : Math.max(...ns)), f: { V, min: Math.min(...ns), max: Math.max(...ns), want: m[1] === '적게' ? 'min' : 'max' } };
  }
  if (/가장 작은 정육면체를 만들려면/.test(q)) {
    const H = rowsOf(fig('top').arg); const n = Math.max(H.length, H[0].length, tallest(H));
    return { type: 'cube', ans: String(n ** 3 - sumAll(H)), f: { H, n } };
  }
  if (/색칠한 쌓기나무 면은 모두 몇 개/.test(q)) {
    const H = rowsOf(fig('top').arg);
    return { type: 'paint', ans: String(paintCount(H)), f: { H } };
  }
  return { type: 'unknown' };
}

/** 이름표의 뜻 — 그 틀린 생각을 문제의 그림으로 다시 해서 보기와 견준다 */
function tagHolds(sv, tag, text) {
  const v = Number(text); const f = sv.f;
  const H = f.H;
  const sumF = (X) => seen(X, 'front').slice(2).split(',').map(Number).reduce((a, b) => a + b, 0);
  const sumS = (X) => seen(X, 'right').slice(2).split(',').map(Number).reduce((a, b) => a + b, 0);
  switch (`${sv.type} ${tag}`) {
    case `whichDir ${TAGS.mirrorDir}`: return WORD_DIR[text] === OPP[f.d];
    case `whichDir ${TAGS.sideMix}`: return !!WORD_DIR[text] && WORD_DIR[text] !== f.d && WORD_DIR[text] !== OPP[f.d];
    case `pickView ${TAGS.mirrorDir}`: return f.C[text] === seen(H, OPP[f.d]);
    case `pickView ${TAGS.mirrorView}`: return f.d === 'top' ? f.C[text] === fromTop(mirrorOfH(H)) : f.C[text] === `s:${f.C[sv.ans].slice(2).split(',').reverse().join(',')}`;
    case `pickView ${TAGS.sideMix}`: return ['front', 'back'].includes(f.d) ? [seen(H, 'right'), seen(H, 'left')].includes(f.C[text]) : [seen(H, 'front'), seen(H, 'back')].includes(f.C[text]);
    case `pickView ${TAGS.nearOnly}`: return f.d === 'front' ? f.C[text] === `s:${H[0].join(',')}` : f.C[text] === `s:${H.map((row) => row[row.length - 1]).join(',')}`;
    case `pickView ${TAGS.flipFB}`: return f.C[text] === fromTop(H.slice().reverse());
    // 돌려 놓은 위 모양 = 90°·180°·270° 중 하나 — 이 파일이 칸 자리를 따로 돌린다 (Codex 34차 #5: 생성기와 같은 "가로세로 바꾸기"를 베껴 대각선 뒤집기를 돌리기로 받아 줬다)
    case `pickView ${TAGS.turnTop}`: return f.C[text] !== fromTop(H) && turnsOfTop(fromTop(H)).includes(f.C[text]);
    case `pickView ${TAGS.sumView}`: return f.d === 'front' && f.C[text] === `s:${H[0].map((_, i) => H.reduce((a, row) => a + row[i], 0)).join(',')}`;
    case `count ${TAGS.visibleOnly}`: return v === paintSvg(stackSvgOf(H)).visible.size;
    case `count ${TAGS.cellsOnly}`: return v === cellsN(H);
    case `count ${TAGS.frontOnly}`: return v === sumF(H);
    case `hidden ${TAGS.hiddenAll}`: return v === sumAll(H);
    case `hidden ${TAGS.visibleOnly}`: return v === f.vis;
    case `uniq ${TAGS.cellsOnly}`: return v === cellsN(H);
    case `uniq ${TAGS.viewsSum}`: return v === cellsN(H) + sumF(H) + sumS(H);
    case `uniq ${TAGS.maxTimes}`: return v === cellsN(H) * tallest(H);
    case `match ${TAGS.topWrong}`: return fromTop(f.C[text]) !== `t:${f.V['위'].slice(2)}`;
    case `match ${TAGS.frontWrong}`: return fromTop(f.C[text]) === `t:${f.V['위'].slice(2)}` && seen(f.C[text], 'front') !== f.V['앞'];
    case `match ${TAGS.sideWrong}`: return fromTop(f.C[text]) === `t:${f.V['위'].slice(2)}` && seen(f.C[text], 'front') === f.V['앞'] && seen(f.C[text], 'right') !== f.V['옆'];
    case `topSum ${TAGS.cellsOnly}`: return v === cellsN(H);
    case `topSum ${TAGS.maxTimes}`: return v === cellsN(H) * tallest(H);
    case `topSum ${TAGS.skipFront}`: return v === sumAll(H) - H[0].reduce((a, b) => a + b, 0);
    case `topView ${TAGS.mirrorView}`: return f.C[text] === `s:${seen(H, f.d).slice(2).split(',').reverse().join(',')}`;
    case `topView ${TAGS.sideMix}`: return f.C[text] === seen(H, f.d === 'front' ? 'right' : 'front');
    case `topView ${TAGS.sumView}`: return f.C[text] === `s:${f.d === 'front' ? H[0].map((_, i) => H.reduce((a, row) => a + row[i], 0)).join(',') : H.map((row) => row.reduce((a, b) => a + b, 0)).join(',')}`;
    case `topStack ${TAGS.mirrorStack}`: return sameH(f.C[text], mirrorOfH(H));
    case `topStack ${TAGS.flipStack}`: return sameH(f.C[text], H.slice().reverse());
    case `topStack ${TAGS.heightOff}`: { const D = f.C[text]; const diff = []; H.forEach((row, j) => row.forEach((h, i) => { if (D[j][i] !== h) diff.push(Math.abs(D[j][i] - h)); })); return diff.length === 1 && diff[0] === 1; }
    case `layerSum ${TAGS.firstOnly}`: return v === cellsN(H);
    case `layerSum ${TAGS.sameLayers}`: return v === cellsN(H) * tallest(H);
    case `layerSum ${TAGS.aboveAll}`: return v === sumAll(H) - cellsN(H);
    case `floor2 ${TAGS.onlyTop}`: return v === H.flat().filter((h) => h === 2).length;
    case `floor2 ${TAGS.aboveAll}`: return v === H.flat().reduce((a, h) => a + Math.max(0, h - 1), 0);
    case `floor2 ${TAGS.firstOnly}`: return v === cellsN(H);
    case `same ${TAGS.diffShape}`: return !sameShape(f.G, f.C[text]) && !sameShape(mirrorOfH(f.G), f.C[text]);
    case `same ${TAGS.mirrorSame}`: return !sameShape(f.G, f.C[text]) && sameShape(mirrorOfH(f.G), f.C[text]);
    case `diff ${TAGS.rotDiff}`: return Object.keys(f.C).filter((k) => k !== text && k !== sv.ans).every((k) => sameShape(f.C[k], f.C[text]));
    case `mm ${TAGS.maxForMin}`: return f.want === 'min' && v === f.max;
    case `mm ${TAGS.minForMax}`: return f.want === 'max' && v === f.min;
    case `mm ${TAGS.cellsOnly}`: return v === cellsN(topCellsOf(f.V['위']));
    case `mm ${TAGS.maxTimes}`: return v === cellsN(topCellsOf(f.V['위'])) * Math.max(...f.V['앞'].slice(2).split(',').map(Number));
    case `mm ${TAGS.viewsSum}`: return v === cellsN(topCellsOf(f.V['위'])) + f.V['앞'].slice(2).split(',').map(Number).reduce((a, b) => a + b, 0) + f.V['옆'].slice(2).split(',').map(Number).reduce((a, b) => a + b, 0);
    case `cube ${TAGS.cubeAll}`: return v === f.n ** 3;
    case `cube ${TAGS.floorOnly}`: return v === f.n * f.n - cellsN(H);
    case `cube ${TAGS.countOnly}`: return v === sumAll(H);
    case `paint ${TAGS.withBottom}`: return v === paintCount(H) + cellsN(H);
    case `paint ${TAGS.allFaces}`: return v === 6 * sumAll(H);
    case `paint ${TAGS.viewOnce}`: return v === sumF(H) + sumS(H) + cellsN(H);
    case `shapes ${TAGS.mirrorSame}`: return f.mirrorOne !== f.all && v === f.mirrorOne;
    case `shapes ${TAGS.firstOnly}`: return f.flat !== f.all && v === f.flat;
    case `shapes ${TAGS.rotDiff}`: return v > f.all;
    default: throw new Error(`판정표에 없는 이름표: ${sv.type} "${tag}"`);
  }
}

const CACHE = new Map();
/** 문항 만들기는 무겁다(보이는 정도) — 테스트끼리 같은 문항을 나눠 쓴다 */
function qOf(id, k, s) {
  const key = `${id}|${k}|${s}`;
  if (!CACHE.has(key)) CACHE.set(key, makeQuestion(id, k, s, OPTS));
  return CACHE.get(key);
}
function* every(kinds = ['calc', 'misread'], n = SEEDS) {
  for (const c of SPACE) for (const k of kinds) for (let s = 1; s <= n; s++) yield { c, k, s, q: qOf(c.id, k, s) };
}
const allText = (q) => [q.q, ...q.choices.map((x) => x.text), ...(q.solve ? [...q.solve.steps, ...Object.values(q.solve.why), q.solve.whyAny, q.solve.rule] : [])].join('\n');

// ───────────────────── 사다리 ─────────────────────

test('사다리: 9칸, 모두 초6, needs가 바로 앞 칸 · 맨 뒤는 ⭐', () => {
  assert.deepEqual(IDS, ['spc.dir', 'spc.view', 'spc.count1', 'spc.count2', 'spc.topnum', 'spc.layer', 'spc.make', 'spc.minmax', 'spc.apply']);
  SPACE.forEach((c, i) => {
    assert.equal(c.grade, 6, c.id);
    assert.deepEqual(c.needs, i ? [IDS[i - 1]] : [], c.id);
    assert.ok(c.idea && c.rule && c.slip, c.id);
  });
  assert.match(SPACE[8].name, /^⭐/);
  assert.equal(gradeLabel(6), '초6');
});

test('이 파일의 읽기 도구 자체 점검 — 본 모양 · 맞는 쌓은 모양 · 돌리기 · 칠하기 · 보이는 쌓기나무', () => {
  const H = rowsOf('2 1 0 / 1 3 1'); // 뒤 줄 2 1 0, 앞 줄 1 3 1
  assert.deepEqual(H, [[1, 3, 1], [2, 1, 0]]);
  assert.equal(seen(H, 'front'), 's:2,3,1');
  assert.equal(seen(H, 'back'), 's:1,3,2');
  assert.equal(seen(H, 'right'), 's:3,2');
  assert.equal(seen(H, 'left'), 's:2,3');
  assert.equal(fromTop(H), 't:110/111');
  assert.equal(allFits(topCellsOf('t:110/111'), 's:2,3,1', 's:3,2').length >= 1, true);
  // 돌리기: L자 4개를 세워도 같은 모양, 거울 모양(나선)은 다르다
  assert.ok(sameShape(rowsOf('1 0 / 1 1 / 1 0'), rowsOf('1 1 1 / 0 1 0')));
  // 나선 둘(거울 짝): 돌려서는 안 겹치고, 하나를 거울에 비추면 다른 하나
  const A = rowsOf('0 1 / 2 1'); const B = rowsOf('0 2 / 1 1');
  assert.ok(!sameShape(A, B) && sameShape(mirrorOfH(A), B));
  assert.ok(sameShape(rowsOf('1 1 / 1 1'), rowsOf('2 / 2')), '네모 넷은 세워도 같다');
  assert.equal(paintCount([[1]]), 5);
  assert.equal(paintCount([[1, 1]]), 8);
  assert.equal(paintCount([[2]]), 9);
  // 뒤 왼쪽 아래 쌓기나무(0,1,0)는 앞·위·오른쪽이 모두 막혀 보이지 않는다
  const P = paintSvg(stackSvgOf(H));
  assert.ok(!P.visible.has('0,1,0') && P.visible.has('1,0,2'), [...P.visible].join(' '));
  assert.equal(P.visible.size, sumAll(H) - 1);
});

// ───────────────────── 독립 검산 ─────────────────────

test('★ 독립 검산: ① 정답이 문제 글·그림 지시문을 따로 읽어 푼 답과 같다 · 딱 하나만 맞다', () => {
  const types = {};
  for (const { c, s, q } of every(['calc'])) {
    const sv = solveText(q.q);
    assert.notEqual(sv.type, 'unknown', `${c.id} #${s}: 못 읽는 문제\n${q.q}`);
    types[sv.type] = (types[sv.type] || 0) + 1;
    const ok = q.choices.filter((x) => x.ok);
    assert.equal(ok.length, 1, `${c.id} #${s}`);
    assert.equal(ok[0].text, sv.ans, `${c.id} #${s}: 정답 ${ok[0].text} · 따로 푼 답 ${sv.ans}\n${q.q}`);
    for (const w of q.choices.filter((x) => !x.ok)) assert.notEqual(w.text, sv.ans, `${c.id} #${s}: 오답 ${w.text}이 정답과 같다`);
  }
  assert.ok(Object.keys(types).length >= 15, `본 문제 종류 ${Object.keys(types).length}: ${JSON.stringify(types)}`);
});

test('★ 오개념 이름표: 그 오답이 정말 그 틀린 생각이다 — 문제의 그림으로 다시 한다 · 이름표 붙은 오답이 늘 둘 이상', () => {
  let n = 0;
  for (const { c, s, q } of every(['calc'])) {
    const sv = solveText(q.q);
    const tagged = q.choices.filter((x) => !x.ok && x.tag && x.tag !== '계산 실수');
    assert.ok(tagged.length >= 2, `${c.id} #${s}: 이름표 붙은 오답 ${tagged.length}`);
    for (const w of tagged) { assert.ok(tagHolds(sv, w.tag, w.text), `${c.id} #${s}: "${w.text}"는 "${w.tag}"가 아니다\n${q.q}`); n++; }
  }
  assert.ok(n > SEEDS * 9 * 2, `본 이름표 ${n}`);
});

test('★ 오답끼리 같은 값이 되지 않는다 — 보기에서 겹쳐 빠지기 전(probe.allWrong) · 빠진 오답도 이름표의 뜻 그대로', () => {
  for (const { c, s, q } of every(['calc'])) {
    const all = q.probe && q.probe.allWrong;
    assert.ok(all && all.length >= 2, `${c.id} #${s}: allWrong`);
    const ok = q.choices.find((x) => x.ok).text;
    assert.equal(new Set(all.map((w) => w.text)).size, all.length, `${c.id} #${s}: 오답끼리 같다 ${all.map((w) => w.text).join(',')}`);
    assert.ok(all.every((w) => w.text !== ok), `${c.id} #${s}: 오답이 정답과 같다`);
    const sv = solveText(q.q);
    for (const w of all) assert.ok(tagHolds(sv, w.tag, w.text), `${c.id} #${s}: 빠진 오답 "${w.text}" "${w.tag}"`);
  }
});

test('★ 보기: 정답 하나, 글자 겹침 없음, 3개 이상, 빈 글자·undefined·NaN·남은 자리표시 없음 · 그림 지시문은 모두 그려진다', () => {
  for (const { c, k, s, q } of every()) {
    const at = `${c.id} ${k} #${s}`;
    assert.ok(q.choices.length >= 3, at);
    assert.equal(q.choices.filter((x) => x.ok).length, 1, at);
    assert.equal(new Set(q.choices.map((x) => x.text)).size, q.choices.length, at);
    const all = allText(q);
    assert.ok(!/undefined|NaN|\{me|\{mon|null/.test(all), `${at}\n${all}`);
    for (const m of q.q.matchAll(/\[([a-z]+) ([^\]]+)\]/g)) assert.ok(figureSvg(`${m[1]} ${m[2]}`).startsWith('<svg'), `${at}: 못 그리는 그림 [${m[1]} ${m[2]}]`);
    assert.ok(!renderFigures(q.q).includes('[stack') && !renderFigures(q.q).includes('[views'), `${at}: 지시문이 글로 남는다`);
    assert.ok(figText(q.q).length > 0 && !/\[(stack|stacks|views|top|layers) /.test(figText(q.q)), `${at}: figText`);
  }
});

test('★ 고르는 문항은 "어느 것" 말투 · 숫자판은 수 답만 (보기 이름 ㉠~㉣·방향 말은 보기 그대로)', () => {
  let pad = 0; let pick = 0;
  for (const { c, s, q } of every(['calc'])) {
    const ok = q.choices.find((x) => x.ok).text;
    const spec = padSpec(q, 'space');
    if (/^\d+$/.test(ok)) {
      assert.ok(spec, `${c.id} #${s}: 수 답인데 숫자판 없음\n${q.q}`);
      for (const ch of q.choices) {
        const t = partsOf(ch.text);
        const hit = matchTyped(q, readTyped(t.mode, t.p, spec), spec);
        assert.equal(q.choices[hit.i], ch, `${c.id} #${s}: "${ch.text}"를 쳐도 그 보기로 안 간다`);
      }
      pad++;
    } else {
      assert.equal(spec, null, `${c.id} #${s}: "${ok}"에 숫자판`);
      if (/^[㉠-㉣]$/.test(ok)) assert.match(q.q, /어느 것/, `${c.id} #${s}`);
      pick++;
    }
  }
  assert.ok(pad > SEEDS * 4 && pick > SEEDS * 3, `숫자판 ${pad} · 고르기 ${pick}`);
});

test('★ ② 오개념 문항: 고치는 말의 수가 맞고 보여 준 말과 다르다 · 갈래 열쇠 둘씩 · "맞게 말했어요"는 오답', () => {
  const nums = (t) => (String(t).match(/왼쪽부터 ([\d, ]+)층/) || [])[1];
  const lastN = (t) => Number((String(t).match(/(\d+)개(?:[^\d]*)$/) || String(t).match(/= (\d+)/) || [])[1]);
  const keys = {};
  for (const { c, s, q } of every(['misread'])) {
    const at = `${c.id} #${s}`;
    keys[c.id] = keys[c.id] || new Set(); keys[c.id].add(q.key);
    const ok = q.choices.find((x) => x.ok).text;
    assert.ok(q.choices.some((x) => x.text === '맞게 말했어요' && !x.ok), at);
    const shown = (q.q.match(/\*\*(.+?)\*\*/) || [])[1];
    assert.ok(shown, `${at}: 보여 준 말`);
    const F = figsOf(q.q); const fig = (k) => F.find((x) => x.kind === k);
    const a = q.probe.ask;
    if (a === 'misBack') { const H = rowsOf(fig('stack').arg); assert.equal(`s:${nums(ok).replace(/ /g, '')}`, seen(H, 'back'), at); assert.notEqual(`s:${nums(shown).replace(/ /g, '')}`, seen(H, 'back'), at); }
    else if (a === 'misLeft') { const H = rowsOf(fig('stack').arg); assert.equal(`s:${nums(ok).replace(/ /g, '')}`, seen(H, 'right'), at); assert.equal(`s:${nums(shown).replace(/ /g, '')}`, seen(H, 'left'), at); }
    else if (a === 'misSum') { const H = rowsOf(fig('stack').arg); assert.equal(`s:${nums(ok).replace(/ /g, '')}`, seen(H, 'front'), at); assert.notEqual(`s:${nums(shown).replace(/ /g, '')}`, seen(H, 'front'), at); }
    else if (a === 'misFlip') { const H = rowsOf(fig('stack').arg); const pat = (t) => `t:${t.split('뒤 줄부터 ')[1].split(' / ').map((r) => [...r.trim()].map((x) => (x === '■' ? 1 : 0)).join('')).join('/')}`; assert.equal(pat(ok), fromTop(H), at); assert.notEqual(pat(shown), fromTop(H), at); }
    else if (a === 'misVisible' || a === 'misCells' || a === 'misOnlyTop') {
      const H = rowsOf(fig('stack') ? fig('stack').arg : fig('top').arg);
      const want = a === 'misOnlyTop' ? H.flat().filter((h) => h >= 2).length : sumAll(H);
      assert.equal(lastN(ok), want, `${at}: ${ok}`);
      if (a === 'misVisible') assert.equal(Number(shown.match(/(\d+)개/)[1]), paintSvg(stackSvgOf(H)).visible.size, at);
    }
    else if (a === 'misViewsSum' || a === 'misMax') { const V = viewsOf(fig('views').arg); const sols = allFits(topCellsOf(V['위']), V['앞'], V['옆']); assert.equal(sols.length, 1, at); assert.equal(lastN(ok), sumAll(sols[0]), `${at}: ${ok}`); }
    else if (a === 'misSumView') { const H = rowsOf(fig('top').arg); assert.equal(`s:${nums(ok).replace(/ /g, '')}`, seen(H, 'front'), at); }
    else if (a === 'misTopCells') { const H = rowsOf(fig('top').arg); assert.equal(lastN(ok), sumAll(H), `${at}: ${ok}`); }
    else if (a === 'misFirst') { const H = rowsOf(fig('layers').arg); assert.equal(lastN(ok), sumAll(H), `${at}: ${ok}`); }
    else if (a === 'misRot') { const C = stacksOf(fig('stacks').arg); assert.ok(sameShape(C['㉠'], C['㉡']) && !sameH(C['㉠'], C['㉡']), at); assert.match(ok, /같은 모양/); }
    else if (a === 'misMirror') { const C = stacksOf(fig('stacks').arg); assert.ok(!sameShape(C['㉠'], C['㉡']) && sameShape(mirrorOfH(C['㉠']), C['㉡']), at); assert.match(ok, /다른 모양/); }
    else if (a === 'misSwap' || a === 'misOnes') { const V = viewsOf(fig('views').arg); const ns = allFits(topCellsOf(V['위']), V['앞'], V['옆']).map(sumAll); assert.equal(lastN(ok), Math.min(...ns), `${at}: ${ok}`); assert.ok(Math.min(...ns) < Math.max(...ns), at); }
    else if (a === 'misCube') { const H = rowsOf(fig('top').arg); assert.equal(lastN(ok), 8 - sumAll(H), `${at}: ${ok}`); }
    else if (a === 'misPaint') { const H = rowsOf(fig('top').arg); assert.equal(lastN(ok), paintCount(H), `${at}: ${ok}`); assert.notEqual(6 * sumAll(H), paintCount(H)); }
    else assert.fail(`${at}: 모르는 ② ${a}`);
  }
  for (const id of IDS) assert.equal(keys[id].size, 2, `${id}: ② 갈래 ${[...(keys[id] || [])].join(',')}`);
});

test('★ 그림만 보고 풀 수 있다 — 위에서 본 모양 없이 쌓은 모양만 주는 문항은 기둥마다 맨 위가 보이고 빈 칸도 빈 줄 안다 (그린 SVG를 다시 칠해서)', () => {
  let n = 0;
  for (const c of SPACE) for (const k of ['calc', 'misread']) for (let s = 1; s <= FIG_SEEDS; s++) {
    const q = qOf(c.id, k, s);
    const F = figsOf(q.q);
    const withTop = F.some((x) => x.kind === 'views' && /(^|\s)위=/.test(x.arg)) || F.some((x) => x.kind === 'top');
    for (const x of F.filter((y) => y.kind === 'stack' && !/free/.test(y.arg))) {
      const H = rowsOf(x.arg);
      if (withTop) { const P = paintSvg(stackSvgOf(H)); for (let j = 0; j < H.length; j++) for (let i = 0; i < H[0].length; i++) if (H[j][i]) assert.ok(P.topShare[`${i},${j}`].share >= 0.25, `${c.id} ${k} #${s}: 기둥 (${i},${j}) 맨 위가 안 보인다`); }
      else assert.ok(clearPicture(H), `${c.id} ${k} #${s}: 그림만으로 쌓은 모양을 다 알 수 없다 ${x.arg}`);
      n++;
    }
    for (const x of F.filter((y) => y.kind === 'stacks' && !/free/.test(y.arg))) for (const H of Object.values(stacksOf(x.arg))) { assert.ok(clearPicture(H), `${c.id} ${k} #${s}: 후보 그림 ${JSON.stringify(H)}`); n++; }
  }
  assert.ok(n > FIG_SEEDS * 8, `본 그림 ${n}`);
});

test('🎨 쌓은 모양 그림: 쌓기나무마다 맞닿지 않은 면만 그린다 · 칠하는 순서는 뒤 → 앞, 아래 → 위 · 앞 화살표', () => {
  let n = 0;
  for (const { c, k, s, q } of every(['calc', 'misread'], FIG_SEEDS)) {
    for (const x of figsOf(q.q).filter((y) => y.kind === 'stack')) {
      const free = /free/.test(x.arg); const H = rowsOf(x.arg.replace(/\s*free/, ''));
      const svg = figureSvg(`stack ${x.arg}`);
      const faces = [...svg.matchAll(/class="sk-f" data-c="(\d+),(\d+),(\d+)" data-f="(\w+)"/g)].map((m) => ({ i: +m[1], j: +m[2], k: +m[3], f: m[4] }));
      let want = 0;
      H.forEach((row, j) => row.forEach((h, i) => { for (let kk = 0; kk < h; kk++) want += (has(H, i, j - 1, kk) ? 0 : 1) + (has(H, i, j, kk + 1) ? 0 : 1) + (has(H, i + 1, j, kk) ? 0 : 1); }));
      assert.equal(faces.length, want, `${c.id} ${k} #${s}: 면 수`);
      for (const F of faces) assert.ok(has(H, F.i, F.j, F.k), `${c.id} #${s}: 없는 쌓기나무의 면`);
      for (let a = 1; a < faces.length; a++) { const p = faces[a - 1]; const q2 = faces[a]; assert.ok(p.j > q2.j || (p.j === q2.j && (p.k < q2.k || (p.k === q2.k && p.i <= q2.i))), `${c.id} #${s}: 칠하는 순서`); }
      assert.equal(/class="sk-front"/.test(svg), !free, `${c.id} #${s}: 앞 화살표`);
      n++;
    }
  }
  assert.ok(n > FIG_SEEDS * 5, `본 그림 ${n}`);
});

// ───────────────────── 쌍둥이·조사·말 ─────────────────────

test('🔁 쌍둥이·🤔 노트: 요청한 틀·갈래로 온다 · 같은 셈 · 쌍둥이 글이 원래 글과 같은 일은 드물다', () => {
  const same2 = {}; const tot = {};
  for (const c of SPACE) {
    for (let s = 1; s <= Math.min(SEEDS, 120); s++) {
      const q = qOf(c.id, 'calc', s);
      assert.ok(q.key, `${c.id} #${s}: 열쇠 없음`);
      const tw = makeQuestion(c.id, 'calc', s + 99991, { ...OPTS, want: { k: 'calc', key: q.key } });
      assert.equal(tw.key, q.key, `${c.id} #${s}: 쌍둥이가 다른 틀\n${q.q}\n---\n${tw.q}`);
      assert.equal(solveText(tw.q).type, solveText(q.q).type, `${c.id} #${s}: 쌍둥이가 다른 셈`);
      tot[q.key] = (tot[q.key] || 0) + 1;
      if (tw.q === q.q) same2[q.key] = (same2[q.key] || 0) + 1;
      const m = qOf(c.id, 'misread', s);
      const mt = makeQuestion(c.id, 'misread', s + 99991, { ...OPTS, want: { k: 'misread', key: m.key } });
      assert.equal(mt.key, m.key, `${c.id} #${s}: ② 갈래`);
    }
  }
  for (const key of Object.keys(tot)) if (tot[key] >= 20) assert.ok((same2[key] || 0) / tot[key] <= 0.35, `쌍둥이 = 원래 글 ${same2[key]}/${tot[key]}: ${key}`);
});

test('★ 조사: 수 뒤는 읽는 소리 · ㉠~㉣(기역·니은·디귿·리을)은 받침 · 낱말 뒤 받침', () => {
  const BAT = new Set(['0', '1', '3', '6', '7', '8']);
  const PAIRS = [['을', '를'], ['은', '는'], ['이', '가'], ['과', '와'], ['이에요', '예요'], ['이니까', '니까'], ['이라서', '라서']];
  const jong = (ch) => { const code = ch.charCodeAt(0) - 0xac00; return code >= 0 && code < 11172 ? code % 28 : -1; };
  let hitN = 0; let hitK = 0; let hitW = 0;
  for (const { c, k, s, q } of every()) {
    const all = allText(q).replace(/\*\*/g, '').replace(/\[[a-z]+ [^\]]+\]/g, '');
    for (const [wb, nb] of PAIRS) {
      for (const m of all.matchAll(new RegExp(`(\\d)(${wb}|${nb})(?=[\\s.,!?)—]|$)`, 'g'))) { assert.equal(m[2], BAT.has(m[1]) ? wb : nb, `${c.id} ${k} #${s}: "…${m[1]}${m[2]}"\n${all}`); hitN++; }
      for (const m of all.matchAll(new RegExp(`([㉠-㉣])(${wb}|${nb})(?=[\\s.,!?)—]|$)`, 'g'))) { assert.equal(m[2], wb, `${c.id} ${k} #${s}: "…${m[1]}${m[2]}"`); hitK++; }
      for (const m of all.matchAll(new RegExp(`(모양|쌓기나무|기둥|칸|줄|층|면|정육면체)(${wb}|${nb})(?=[\\s.,!?)—]|$)`, 'g'))) { assert.equal(m[2], jong(m[1].slice(-1)) > 0 ? wb : nb, `${c.id} ${k} #${s}: "…${m[1]}${m[2]}"`); hitW++; }
    }
  }
  // 이 줄기 글은 수 뒤에 늘 단위(개·층·칸)가 붙어 수 바로 뒤 조사는 없다 — 수 쪽은 나오면 검사만, 기준은 ㉠·낱말로
  assert.ok(hitK > SEEDS && hitW > SEEDS, `실제로 본 곳: 수 ${hitN} · ㉠ ${hitK} · 낱말 ${hitW}`);
});

test('★ 풀이 카드: 단계 · 기억할 것 · 오답마다 왜 · 정답이 단계에 나온다', () => {
  for (const { c, k, s, q } of every()) {
    const sv = q.solve;
    assert.ok(sv && sv.steps.length >= 2 && sv.rule, `${c.id} ${k} #${s}`);
    for (const w of q.choices.filter((x) => !x.ok)) assert.ok(sv.why[w.tag] || sv.whyAny, `${c.id} ${k} #${s}: "${w.tag}" 설명 없음`);
    const ok = q.choices.find((x) => x.ok).text;
    if (k === 'calc' && ok.length <= 16) assert.ok(sv.steps.join(' ').includes(ok), `${c.id} #${s}: 정답 "${ok}"이 풀이에 없다\n${sv.steps.join('\n')}`);
  }
});

test('★ 글 속 셈식은 맞다 (곱셈 먼저, 왼쪽부터) — 문제·정답·풀이 전부', () => {
  const ev = (expr) => Function(`return (${expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-')})`)();
  let n = 0;
  for (const { c, k, s, q } of every()) {
    const all = [q.q.replace(/\*\*.+?\*\*/g, '').replace(/\[[a-z]+ [^\]]+\]/g, ''), q.choices.find((x) => x.ok).text, ...q.solve.steps, ...Object.values(q.solve.why), q.solve.whyAny].join('\n');
    for (const m of all.matchAll(/(?<![\d.(−])(\d+(?: [+−×÷] \d+)+) = (\d+)(?![\d.])/g)) {
      assert.equal(ev(m[1]), Number(m[2]), `${c.id} ${k} #${s}: ${m[0]}`);
      n++;
    }
  }
  assert.ok(n > 3 * SEEDS, `셈식 ${n}`);
});

/** 처음 배우는 칸 — 그 앞 칸의 글·이름표에는 나오면 안 된다 */
const FIRST = [[/층별/, 'spc.layer'], [/돌리거나 뒤집/, 'spc.make'], [/가장 적게/, 'spc.minmax'], [/정육면체/, 'spc.apply']];
test('★ 아직 안 배운 말을 앞 칸에 쓰지 않는다 — 층별 S6 · 돌리거나 뒤집기 S7 · 가장 적게 S8 · 정육면체 S9', () => {
  const idx = (id) => IDS.indexOf(id);
  for (const { c, k, s, q } of every()) {
    const all = allText(q) + ' ' + q.choices.map((x) => x.tag || '').join(' ');
    for (const [re, at] of FIRST) if (idx(at) > idx(c.id)) assert.ok(!re.test(all), `${c.id} ${k} #${s}: 아직 안 배운 ${re}`);
  }
  for (const c of SPACE) for (const [re, at] of FIRST) if (idx(at) > idx(c.id)) assert.ok(!re.test(`${c.name} ${c.idea} ${c.rule} ${c.slip}`), `${c.id}: 설명에 ${re}`);
});

/** 참이라고 내미는 글에 틀린 말 — 오답 보기·② 보여 준 말은 빼고, 굵게(**)는 떼고 */
const BAD = [
  [/뒤에서 본 모양은 앞에서 본 모양과 같아/, '뒤에서 보면 좌우가 바뀐다'],
  // (Codex 34차 #4) 거울에 비친 모양이 늘 다른 것은 아니다 — 한 층 ㄴ자와 그 거울 모양은 뒤집으면 겹쳐진다. 예전 이 줄은 거꾸로 "거울 모양은 같다"를 막아 오개념을 굳혔다
  [/거울에 비친 모양은[^.\n]*(?:다른 모양|겹쳐지지 않)/, '거울 모양도 뒤집으면 겹쳐질 수 있다 (한 층 ㄴ자)'],
  [/마주 보는 두 모양은[^.\n]*겹쳐지지 않/, '거울 모양도 뒤집으면 겹쳐질 수 있다 (한 층 ㄴ자)'],
  [/칸 수가 (?:곧 )?쌓기나무(?:의)? 개수/, '칸 하나에 여러 층'],
  // (Codex 34차 #6) 세 모양이 같아도 여러 가지로 쌓을 수 있다 (S8)
  [/위·앞·옆에서 본 모양이 있으면 개수를 알 수 있/, '세 모양이 같아도 여러 가지로 쌓을 수 있다'],
  [/위·앞·옆에서 본 모양\**을 함께 보면 쌓은 모양을 알아낼 수 있어요/, '세 모양이 같아도 여러 가지로 쌓을 수 있다'],
];
test('★ 참말에 틀린 말이 없다 — 뒤에서 본 모양·거울 모양·칸 수', () => {
  const truths = (q) => [q.choices.find((x) => x.ok).text, ...(q.solve ? [...q.solve.steps, ...Object.values(q.solve.why), q.solve.whyAny, q.solve.rule] : [])].join('\n').replace(/\*\*/g, '');
  for (const { c, k, s, q } of every()) { const t = truths(q); for (const [re, why] of BAD) assert.ok(!re.test(t), `${c.id} ${k} #${s}: ${why}\n${t}`); }
  for (const c of SPACE) for (const [re, why] of BAD) assert.ok(!re.test([c.idea, c.rule, c.slip].join('\n').replace(/\*\*/g, '')), `${c.id}: ${why}`);
});

test('🧩 쌓기나무 4개 모양: 일자를 빼면 7가지(거울 짝 하나 포함) · 같은 모양 후보는 정말 돌린 것 · 다른 모양 후보 셋은 서로 같은 모양', () => {
  // 이 파일이 4개짜리를 다시 모두 만든다 (돌려 같은 것은 하나로)
  const shapes = [];
  const grow = (cs) => {
    if (cs.length === 4) { if (!shapes.some((x) => allTurns(x).has(keyOf(cs)))) shapes.push(cs); return; }
    for (const c of cs) for (const d of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
      const nc = c.map((v, i) => v + d[i]);
      if (!cs.some((x) => x.every((v, i) => v === nc[i]))) grow([...cs, nc]);
    }
  };
  grow([[0, 0, 0]]);
  assert.equal(shapes.length, 8, '돌려 같은 것을 하나로 치면 4개로 8가지 (교과서: 거울 모양도 다른 모양)');
  let n = 0;
  for (let s = 1; s <= SEEDS; s++) {
    const q = qOf('spc.make', 'calc', s);
    const sv = solveText(q.q);
    if (sv.type === 'same') { const others = Object.keys(sv.f.C).filter((k) => k !== sv.ans); assert.ok(others.every((k) => !sameShape(sv.f.G, sv.f.C[k])), `#${s}`); assert.ok(!sameH(sv.f.G, sv.f.C[sv.ans]), `#${s}: 같은 모양 후보가 그림과 똑같이 놓였다`); n++; }
    if (sv.type === 'diff') { const others = Object.keys(sv.f.C).filter((k) => k !== sv.ans); assert.ok(others.every((k) => sameShape(sv.f.C[others[0]], sv.f.C[k])), `#${s}`); assert.equal(new Set(others.map((k) => JSON.stringify(sv.f.C[k]))).size, 3, `#${s}: 같은 모양 셋이 똑같이 놓였다`); n++; }
  }
  assert.ok(n > SEEDS * 0.8, `본 문항 ${n}`);
});

test('📏 진단·사다리·한 편·배움 예비·내용 검사', () => {
  const d = diagnosticSet(7, 5, OPTS);
  assert.equal(d.length, 5);
  assert.deepEqual(d.map((q) => q.concept), ['spc.dir', 'spc.count1', 'spc.topnum', 'spc.make', 'spc.apply']);
  assert.deepEqual(placeFrom(d.map((q, i) => ({ concept: q.concept, correct: i < 2 }))).startId, 'spc.topnum');
  const L0 = ladder([]);
  assert.equal(L0[0].state, 'now');
  assert.ok(L0.slice(1).every((r) => r.state === 'locked'));
  for (const c of SPACE) {
    const round = makeRound(c.id, 11, OPTS);
    assert.ok(round.length >= 2 && round.every((q) => q.concept === c.id), c.id);
    const les = lessonOf(c.id, 3, OPTS);
    assert.ok(les.pages.length >= 1 && les.title === c.name);
  }
  assert.ok(checkContent({}).length >= 9, '빈 원고는 칸마다 걸린다');
});

test('🎨 본 모양·수 쓴 위 모양·층별 그림: 그린 칸의 자리가 지시문과 같다 (왼쪽부터·뒤 줄이 위쪽) · 겨냥도의 뒤 줄은 오른쪽 위에', () => {
  const rectsOf = (svg, cls) => [...svg.matchAll(new RegExp(`<rect class="${cls}"([^>]*)>`, 'g'))].map((m) => Object.fromEntries([...m[1].matchAll(/([\w-]+)="([^"]*)"/g)].map((a) => [a[1], a[2]])));
  let n = 0;
  for (const { c, k, s, q } of every(['calc', 'misread'], FIG_SEEDS)) {
    for (const x of figsOf(q.q)) {
      const at = `${c.id} ${k} #${s} [${x.kind} ${x.arg}]`;
      const svg = figureSvg(`${x.kind} ${x.arg}`);
      if (x.kind === 'views') {
        const V = viewsOf(x.arg);
        for (const blk of svg.split('<g class="sk-view"').slice(1)) {
          const name = /data-k="([^"]+)"/.exec(blk)[1]; const kind = /data-kind="(\w+)"/.exec(blk)[1];
          const sq = rectsOf(blk.split('</g>')[0], 'sk-sq').map((r) => ({ x: +r.x, y: +r.y }));
          const xs = [...new Set(sq.map((p) => p.x))].sort((a, b) => a - b); const ys = [...new Set(sq.map((p) => p.y))].sort((a, b) => a - b);
          if (kind === 'side') {
            // 칸 x 자리마다 쌓인 칸 수 — 왼쪽부터 (빈 기둥은 없다)
            const got = xs.map((xx) => sq.filter((p) => p.x === xx).length).join(',');
            assert.equal(`s:${got}`, V[name], `${at}: ${name}`);
          } else {
            const minX = Math.min(...sq.map((p) => p.x)); const minY = Math.min(...sq.map((p) => p.y));
            const cells = topCellsOf(V[name]).slice().reverse(); // 뒤 줄부터 (그림 위쪽부터)
            const cell = Math.min(...xs.slice(1).map((v, i) => v - xs[i]), ...ys.slice(1).map((v, i) => v - ys[i]), 24);
            const offR = cells.findIndex((row) => row.some(Boolean)); const offC = Math.min(...cells.map((row) => { const i = row.indexOf(1); return i < 0 ? 99 : i; }));
            for (const p of sq) { const r = Math.round((p.y - minY) / cell) + offR; const col = Math.round((p.x - minX) / cell) + offC; assert.equal(cells[r][col], 1, `${at}: ${name} 칸 (${r}, ${col})`); }
            assert.equal(sq.length, cells.flat().filter(Boolean).length, `${at}: ${name} 칸 수`);
          }
          n++;
        }
      }
      if (x.kind === 'top') {
        const H = rowsOf(x.arg);
        for (const r of rectsOf(svg, 'sk-top')) assert.equal(+r['data-h'], H[+r['data-j']][+r['data-i']], at);
        // 칸에 쓴 수를 그림 자리(위쪽 줄 = 뒤)로 다시 읽는다
        const nums = [...svg.matchAll(/<text x="([\d.]+)" y="([\d.]+)" font-size="20"[^>]*>(\d)<\/text>/g)].map((m) => ({ x: +m[1], y: +m[2], v: +m[3] }));
        // 칸 한 변 40 — 맨 위 글자 줄이 뒤 줄, 맨 왼쪽 글자 칸이 왼쪽 칸 (줄·칸마다 쌓기나무가 하나 이상이라 빈 줄·빈 칸이 끝에 없다)
        const top = Math.min(...nums.map((p) => p.y)); const left = Math.min(...nums.map((p) => p.x));
        const back = H.slice().reverse();
        for (const p of nums) assert.equal(back[Math.round((p.y - top) / 40)][Math.round((p.x - left) / 40)], p.v, `${at}: (${p.x}, ${p.y}) ${p.v}`);
        assert.equal(nums.length, cellsN(H), at);
        n++;
      }
      if (x.kind === 'layers') {
        const H = rowsOf(x.arg);
        for (const blk of svg.split('<g class="sk-layer"').slice(1)) {
          const L = +/data-k="(\d+)"/.exec(blk)[1];
          const on = rectsOf(blk, 'sk-sq').map((r) => `${r['data-i']},${r['data-j']}`).sort();
          const want = []; H.forEach((row, j) => row.forEach((h, i) => { if (h >= L) want.push(`${i},${j}`); }));
          assert.deepEqual(on, want.sort(), `${at}: ${L}층`);
        }
        n++;
      }
    }
  }
  assert.ok(n > FIG_SEEDS * 6, `본 그림 ${n}`);
  // 겨냥도: 뒤 줄 쌓기나무는 앞 줄보다 오른쪽 위 · 위층은 바로 위 · 오른쪽 칸은 오른쪽
  const cen = (svg, c, f) => { const m = new RegExp(`data-c="${c}" data-f="${f}" points="([^"]+)"`).exec(svg); const P = m[1].split(' ').map((p) => p.split(',').map(Number)); return [P.reduce((a, p) => a + p[0], 0) / 4, P.reduce((a, p) => a + p[1], 0) / 4]; };
  const s1 = figureSvg('stack 1 / 1'); const [fx, fy] = cen(s1, '0,0,0', 'right'); const [bx, by] = cen(s1, '0,1,0', 'right');
  assert.ok(bx > fx && by < fy, `뒤 줄이 오른쪽 위가 아니다 (${fx},${fy}) → (${bx},${by})`);
  const s2 = figureSvg('stack 2'); assert.ok(cen(s2, '0,0,1', 'front')[1] < cen(s2, '0,0,0', 'front')[1] - 20, '위층이 위가 아니다');
  const s3 = figureSvg('stack 1 1'); assert.ok(cen(s3, '1,0,0', 'front')[0] > cen(s3, '0,0,0', 'front')[0] + 20, '오른쪽 칸이 오른쪽이 아니다');
});

test('🧩 쌓기나무 4개 모양 그림(free)은 4개가 모두 보인다 — 세 갈래 모양을 "0 0 0 / 2 1 0 / 1 0 0"으로 놓으면 가운데 아래 1개가 앞·위·오른쪽 모두 막혀 3개만 보였다 (2단계 원고를 쓰며 잡음)', () => {
  let n = 0;
  for (const k of ['calc', 'misread']) for (let s = 1; s <= SEEDS; s++) {
    const q = qOf('spc.make', k, s);
    for (const x of figsOf(q.q).filter((y) => /free/.test(y.arg))) {
      const Hs = x.kind === 'stack' ? [rowsOf(x.arg.replace(/\s*free/, ''))] : Object.values(stacksOf(x.arg));
      for (const H of Hs) { assert.equal(paintSvg(stackSvgOf(H)).visible.size, sumAll(H), `spc.make ${k} #${s}: 가려진 쌓기나무 ${JSON.stringify(H)}\n${q.q}`); n++; }
    }
  }
  assert.ok(n > SEEDS * 6, `본 모양 그림 ${n}`);
});

test('🔍 본 모양을 말하는 글에 "0층"이 없다 — 앞 줄에 빈 칸이 있으면 "앞 줄만 …"이 "왼쪽부터 1, 3, 0층"이 됐다 (3단계 헤드리스가 잡음) · "앞 줄만" 오답은 숫자도 정답과 다르다', () => {
  const zero = /왼쪽부터 (?:\d+, )*0(?:, \d+)*층|(?<![\d.])0층/;
  let n = 0;
  for (const { c, k, s, q } of every()) {
    const t = allText(q);
    assert.ok(!zero.test(t), `${c.id} ${k} #${s}: "${(t.match(zero) || [])[0]}"\n${t}`);
    // "앞 줄만" 오답의 수는 정답의 수와 다르다 — 같으면 틀린 말이 맞는 모양을 가리킨다
    const near = q.choices.find((x) => /앞 줄(?:만| 수만| 의 수만)?[^—]*— 왼쪽부터/.test(x.text) && !x.ok);
    const ok = q.choices.find((x) => x.ok);
    if (near && /왼쪽부터/.test(ok.text)) { assert.notEqual(near.text.split('왼쪽부터 ')[1], ok.text.split('왼쪽부터 ')[1], `${c.id} ${k} #${s}: ${near.text}`); n++; }
  }
  assert.ok(n > SEEDS, `"앞 줄만" 오답 ${n}`);
});

// ───────────────────── 2단계: 원고 (coach/math/space.json) ─────────────────────

const CONTENT = JSON.parse(readFileSync(new URL('../coach/math/space.json', import.meta.url), 'utf8'));
const CAST = { me: '진우', mon: '피카츄', mon2: '리자몽' };
const fillC = (t) => String(t).replace(/\{(me|mon|mon2)(?:\/([^/}]+)\/([^}]+))?\}/g, (_, k, a, b) => {
  const name = CAST[k];
  if (!a) return name;
  const code = name.charCodeAt(name.length - 1) - 0xac00;
  return name + (code >= 0 && code % 28 ? a : b);
});
/** 원고의 모든 글 (배움·확인·규칙·아빠 카드) — 칸마다 */
function contentText(v) {
  const parts = [];
  for (const p of v.lesson) { parts.push(p.say); if (p.check) parts.push(p.check.q, p.check.ok, ...p.check.no, p.check.why); }
  parts.push(v.rule, v.dad.goal, ...v.dad.say, v.dad.do, v.dad.pass, ...v.dad.traps.flatMap((t) => [t.kid, t.dad]));
  return parts.map(fillC).join('\n');
}
/** 참이라고 내미는 글 — 덩이마다 (확인 질문은 문제 글·정답·풀이). 오답 보기·아이가 하는 틀린 말(함정 kid)은 뺀다 */
function truthBlocks(v) {
  const out = [];
  for (const p of v.lesson) { out.push(p.say); if (p.check) out.push([p.check.q, p.check.ok, p.check.why].join('\n')); }
  out.push(v.rule, v.dad.goal, ...v.dad.say, v.dad.do, v.dad.pass, ...v.dad.traps.map((t) => t.dad));
  return out.map((t) => fillC(t).replace(/\*\*/g, ''));
}
/** 위·앞·옆에서 본 모양 셋에 모두 맞나 */
const fitsV = (H, V) => fromTop(H) === V['위'] && seen(H, 'front') === V['앞'] && seen(H, 'right') === V['옆'];
const DIR_OF = { 앞에서: 'front', 뒤에서: 'back', '오른쪽 옆에서': 'right', '왼쪽 옆에서': 'left', 옆에서: 'right' };
/** 글·그림 지시문 → 그 장이 말하는 높이 표 하나 (쌓은 모양·수 쓴 그림·층별, 없으면 위·앞·옆 모양으로 하나로 정해지는 것) */
function tableOf(t) {
  const F = figsOf(t);
  const Hs = F.filter((x) => ['stack', 'top', 'layers'].includes(x.kind) && !/free/.test(x.arg)).map((x) => rowsOf(x.arg));
  if (Hs.length) return { H: Hs[0], Hs };
  const V = F.filter((x) => x.kind === 'views').map((x) => viewsOf(x.arg)).find((v) => v['위'] && v['앞'] && v['옆']);
  if (V) { const sols = allFits(topCellsOf(V['위']), V['앞'], V['옆']); if (sols.length === 1) return { H: sols[0], Hs: [] }; }
  return { H: null, Hs: [] };
}
/** "뒤 줄 3, 1 · 앞 줄 1, 2, 1" — 줄마다 빈 칸을 뺀 층 수가 그 높이 표와 같다 */
function rowsClaims(t, H, where) {
  let k = 0;
  for (const m of t.matchAll(/뒤 줄 (\d+(?:, \d+)*) · (?:가운데 줄 (\d+(?:, \d+)*) · )?앞 줄 (\d+(?:, \d+)*)/g)) {
    assert.ok(H, `${where}: 줄마다 층 수를 말하는데 높이 표가 없다`);
    const got = [m[1], m[2], m[3]].filter((x) => x !== undefined).map((x) => x.split(', ').map(Number));
    assert.deepEqual(got, H.slice().reverse().map((row) => row.filter(Boolean)), `${where}: "${m[0]}"`);
    k++;
  }
  return k;
}

test('원고(space.json)가 형식 검사를 통과한다 — 9칸이 사다리 순서대로 · 배움 4~5장·확인 질문 4개↑·아빠 카드(말 2개↑·함정 2개↑·통과 기준)', () => {
  assert.deepEqual(checkContent(CONTENT), []);
  assert.deepEqual(Object.keys(CONTENT).filter((k) => k !== '_'), IDS, '원고 칸 = 사다리 칸 (순서까지)');
  for (const id of IDS) {
    const v = CONTENT[id];
    assert.ok(v.lesson.length >= 4 && v.lesson.length <= 5, `${id}: ${v.lesson.length}장`);
    assert.ok(v.lesson.filter((p) => p.check).length >= 4, `${id}: 확인 질문 ${v.lesson.filter((p) => p.check).length}개`);
    assert.ok(v.dad.traps.length >= 2 && v.dad.say.length >= 2, id);
    const les = lessonOf(id, 1, { ...OPTS, content: CONTENT });
    assert.equal(les.pages.length, v.lesson.length);
    assert.ok(!/\{(me|mon)/.test(les.pages.map((p) => p.say + (p.check ? p.check.q + p.check.why : '')).join('')), `${id}: 자리표시가 남음`);
  }
});

test('★ 원고 확인 질문도 따로 풀어 대조 — 전부 읽히고, 맞는 보기는 정답 하나뿐, 오답 하나하나가 이름표 있는 틀린 생각이다', () => {
  let solved = 0; let wrongs = 0; const types = new Set();
  for (const id of IDS) {
    for (const [i, p] of CONTENT[id].lesson.entries()) {
      if (!p.check) continue;
      const q = fillC(p.check.q); const ok = fillC(p.check.ok); const no = p.check.no.map(fillC);
      const where = `${id}[${i}]: ${q}`;
      const sv = solveText(q);
      assert.notEqual(sv.type, 'unknown', `${where}: 못 읽는 확인 질문`);
      const chs = [{ text: ok, ok: true }, ...no.map((n) => ({ text: n, ok: false }))];
      const right = chs.filter((x) => x.text === sv.ans);
      assert.equal(right.length, 1, `${where} (${sv.type}): 따로 푼 답 ${sv.ans} — 맞는 보기 ${right.map((x) => x.text).join(', ') || '없음'}`);
      assert.ok(right[0].ok, `${where}: 정답 "${ok}" ≠ 따로 푼 "${sv.ans}"`);
      for (const n of no) {
        const holds = Object.values(TAGS).some((tag) => { try { return !!tagHolds(sv, tag, n); } catch { return false; } });
        assert.ok(holds, `${where}: 오답 "${n}"은 어느 틀린 생각인가 (${sv.type})`);
        wrongs++;
      }
      if (/^\d+$/.test(ok)) assert.equal(new Set(no).size, no.length, `${where}: 오답 값이 겹친다`);
      types.add(sv.type);
      solved++;
    }
  }
  assert.equal(solved, IDS.reduce((a, id) => a + CONTENT[id].lesson.filter((p) => p.check).length, 0));
  assert.ok(solved >= 36 && wrongs >= 2 * solved, `따로 푼 확인 질문 ${solved} · 오답 ${wrongs}`);
  assert.ok(types.size >= 15, `확인 질문이 다룬 문제 종류 ${types.size}: ${[...types]} — 같은 모양만 묻지 않게`);
});

test('★ 원고 확인 질문의 쌓은 모양은 그림만으로 읽힌다 (생성기와 같은 잣대) · 쌓기나무 모양 그림(free)은 배움 글까지 모두 보인다', () => {
  let n = 0; let nf = 0;
  for (const id of IDS) {
    for (const [i, p] of CONTENT[id].lesson.entries()) {
      for (const [kind, t] of [['say', fillC(p.say)], ...(p.check ? [['check', fillC(p.check.q)]] : [])]) {
        const at = `${id}[${i}] ${kind}`;
        const F = figsOf(t);
        for (const x of F.filter((y) => /free/.test(y.arg))) {
          const Hs = x.kind === 'stack' ? [rowsOf(x.arg.replace(/\s*free/, ''))] : Object.values(stacksOf(x.arg));
          for (const H of Hs) { assert.equal(paintSvg(stackSvgOf(H)).visible.size, sumAll(H), `${at}: 가려진 쌓기나무 ${JSON.stringify(H)}`); nf++; }
        }
        if (kind !== 'check') continue; // 배움 글은 숨은 쌓기나무를 일부러 보여 주는 장이 있다 (S3 1장)
        const withTop = F.some((x) => x.kind === 'views' && /(^|\s)위=/.test(x.arg)) || F.some((x) => x.kind === 'top');
        for (const x of F.filter((y) => y.kind === 'stack' && !/free/.test(y.arg))) {
          const H = rowsOf(x.arg);
          if (withTop) { const P = paintSvg(stackSvgOf(H)); for (let j = 0; j < H.length; j++) for (let c = 0; c < H[0].length; c++) if (H[j][c]) assert.ok(P.topShare[`${c},${j}`].share >= 0.25, `${at}: 기둥 (${c},${j}) 맨 위가 안 보인다`); }
          else assert.ok(clearPicture(H), `${at}: 그림만으로 쌓은 모양을 다 알 수 없다 ${x.arg}`);
          n++;
        }
        for (const x of F.filter((y) => y.kind === 'stacks' && !/free/.test(y.arg))) for (const H of Object.values(stacksOf(x.arg))) { assert.ok(clearPicture(H), `${at}: 후보 그림 ${JSON.stringify(H)}`); n++; }
      }
    }
  }
  assert.ok(n >= 20 && nf >= 25, `본 그림 ${n} · 모양 그림 ${nf}`);
});

test('🎨 원고의 그림: 모두 그려진다 · 한 장의 높이 표는 하나 · 배움 글이 말하는 개수·본 모양·숨은 수·층·줄마다 층 수·가장 적을 때와 많을 때·색칠한 면·더 필요한 수·모양 가짓수·같은/다른/거울 모양 = 그 장의 그림', () => {
  const n = { fig: 0, views: 0, total: 0, dir: 0, label: 0, labelTop: 0, hidden: 0, visible: 0, layer: 0, floor2: 0, top2: 0, lcount: 0, look: 0, same: 0, mirror: 0, fits: 0, mm: 0, paint: 0, cube: 0, kinds: 0, flat5: 0, rows: 0 };
  const P4 = polyShapes(4);
  for (const id of IDS) {
    for (const [i, p] of CONTENT[id].lesson.entries()) {
      const where = `${id}[${i}]`;
      for (const t of [p.say, ...(p.check ? [p.check.q] : [])].map(fillC)) for (const m of t.matchAll(/\[([a-z]+) ([^\]]+)\]/g)) { assert.ok(figureSvg(`${m[1]} ${m[2]}`).startsWith('<svg'), `${where}: 못 그림 ${m[0]}`); n.fig++; }
      // 확인 질문의 풀이 글도 줄마다 층 수는 그 질문의 그림과 같다
      if (p.check) n.rows += rowsClaims(fillC(p.check.why), tableOf(fillC(p.check.q)).H, `${where}✓`);
      const say = fillC(p.say).replace(/\*\*/g, '');
      const F = figsOf(say);
      const { H, Hs } = tableOf(say);
      for (const X of Hs.slice(1)) assert.deepEqual(X, Hs[0], `${where}: 한 장에 서로 다른 높이 표 — 아이가 어느 그림 이야기인지 헷갈린다`);
      const V3 = F.filter((x) => x.kind === 'views').map((x) => viewsOf(x.arg)).find((v) => v['위'] || v['앞'] || v['옆']) || null;
      const LV = F.filter((x) => x.kind === 'views').map((x) => viewsOf(x.arg)).find((v) => v['㉠']) || null;
      // 한 장에 후보 그림이 여럿이면(㉠㉡ · ㉢㉣) 이름으로 합친다
      const CD = F.some((x) => x.kind === 'stacks') ? Object.assign({}, ...F.filter((x) => x.kind === 'stacks').map((x) => stacksOf(x.arg))) : null;
      const need = (x, what) => assert.ok(x, `${where}: ${what}을 말하는데 그림이 없다`);
      // 함께 그린 위·앞·옆 모양 = 그 높이 표의 모양
      if (H && V3) {
        if (V3['위']) assert.equal(V3['위'], fromTop(H), `${where}: 위에서 본 모양`);
        if (V3['앞']) assert.equal(V3['앞'], seen(H, 'front'), `${where}: 앞에서 본 모양`);
        if (V3['옆']) assert.equal(V3['옆'], seen(H, 'right'), `${where}: 옆에서 본 모양`);
        n.views++;
      }
      // 이름 붙은 본 모양(㉠ 위에서 본 모양)과 같은 이름의 쌓은 모양 후보
      if (LV && CD) for (const [k, v] of Object.entries(LV)) if (CD[k] && v.startsWith('t:')) { assert.equal(v, fromTop(CD[k]), `${where}: ${k} 위에서 본 모양`); n.labelTop++; }
      for (const m of say.matchAll(/쌓기나무는 모두 (?:[\d +]+ = )?(\d+)개/g)) { need(H, '개수'); assert.equal(+m[1], sumAll(H), `${where}: "${m[0]}"`); n.total++; }
      for (const m of say.matchAll(/(앞에서|뒤에서|오른쪽 옆에서|왼쪽 옆에서|옆에서) (?:보면|본 모양은) 왼쪽부터 (\d+(?:, \d+)*)층/g)) { need(H, '본 모양'); assert.equal(`s:${m[2].replace(/ /g, '')}`, seen(H, DIR_OF[m[1]]), `${where}: "${m[0]}"`); n.dir++; }
      for (const m of say.matchAll(/([㉠-㉣])은 (앞에서|뒤에서|오른쪽 옆에서|왼쪽 옆에서|위에서) 본 모양/g)) {
        need(H && LV && LV[m[1]], '이름 붙은 본 모양');
        assert.equal(LV[m[1]], m[2] === '위에서' ? fromTop(H) : seen(H, DIR_OF[m[2]]), `${where}: "${m[0]}"`); n.label++;
      }
      for (const m of say.matchAll(/보이지 않는 쌓기나무는 (?:\d+ − \d+ = )?(\d+)개/g)) { need(H, '보이지 않는 수'); assert.equal(+m[1], sumAll(H) - paintSvg(stackSvgOf(H)).visible.size, `${where}: "${m[0]}"`); n.hidden++; }
      for (const m of say.matchAll(/보이는 쌓기나무는 (\d+)개/g)) { need(H, '보이는 수'); assert.equal(+m[1], paintSvg(stackSvgOf(H)).visible.size, `${where}: "${m[0]}"`); n.visible++; }
      for (const m of say.matchAll(/(\d)층 (\d+)개/g)) { need(H, '층마다 수'); assert.equal(+m[2], H.flat().filter((h) => h >= +m[1]).length, `${where}: "${m[0]}"`); n.layer++; }
      for (const m of say.matchAll(/2층에 있는 쌓기나무는 (\d+)개/g)) { need(H, '2층의 수'); assert.equal(+m[1], H.flat().filter((h) => h >= 2).length, `${where}: "${m[0]}"`); n.floor2++; }
      for (const m of say.matchAll(/꼭대기가 2층인 기둥은 (\d+)곳/g)) { need(H, '꼭대기 2층'); assert.equal(+m[1], H.flat().filter((h) => h === 2).length, `${where}: "${m[0]}"`); n.top2++; }
      for (const m of say.matchAll(/([㉠-㉣])은 (\d+)개/g)) { need(CD && CD[m[1]], '후보의 개수'); assert.equal(+m[2], sumAll(CD[m[1]]), `${where}: "${m[0]}"`); n.lcount++; }
      for (const m of say.matchAll(/([㉠-㉣])과 ([㉠-㉣])은 똑같아 보이/g)) {
        const a = [...paintSvg(stackSvgOf(CD[m[1]])).visible].sort(); const b = [...paintSvg(stackSvgOf(CD[m[2]])).visible].sort();
        assert.deepEqual(a, b, `${where}: "${m[0]}" — 보이는 쌓기나무가 다르다`); assert.notDeepEqual(CD[m[1]], CD[m[2]]); n.look++;
      }
      for (const m of say.matchAll(/([㉠-㉣])과 ([㉠-㉣])은 [^.]*?(같은 모양|다른 모양)이에요/g)) { assert.equal(sameShape(CD[m[1]], CD[m[2]]), m[3] === '같은 모양', `${where}: "${m[0]}"`); n.same++; }
      // 거울에 비친 모양이라는 말은 거울 관계만 — 같은지 다른지는 "같은/다른 모양이에요" 대조가 따로 본다 (Codex 34차 #4: 거울 모양도 뒤집으면 같을 수 있다)
      for (const m of say.matchAll(/([㉠-㉣])과 ([㉠-㉣])은 거울에 비친/g)) { const A = CD[m[1]]; const B = CD[m[2]]; assert.ok(sameShape(mirrorOfH(A), B), `${where}: "${m[0]}" — 거울 모양이 아니다`); n.mirror++; }
      if (/둘 다 세 모양에 맞아요/.test(say)) { need(V3 && CD, '세 모양과 후보'); for (const [k, X] of Object.entries(CD)) assert.ok(fitsV(X, V3), `${where}: ${k}이 세 모양에 안 맞는다`); n.fits++; }
      for (const m of say.matchAll(/세 모양에 모두 맞는 것은 ([㉠-㉣])/g)) { for (const [k, X] of Object.entries(CD)) assert.equal(fitsV(X, V3), k === m[1], `${where}: "${m[0]}" — ${k}`); n.fits++; }
      for (const m of say.matchAll(/가장 (많이|적게) 쌓을 때 (?:[\d +]+ = )?(\d+)개/g)) {
        need(V3 && V3['위'] && V3['앞'] && V3['옆'], '세 모양');
        const ns = allFits(topCellsOf(V3['위']), V3['앞'], V3['옆']).map(sumAll);
        assert.equal(+m[2], m[1] === '많이' ? Math.max(...ns) : Math.min(...ns), `${where}: "${m[0]}"`); n.mm++;
      }
      for (const m of say.matchAll(/색칠한 면은 모두 (\d+)개/g)) { need(H, '색칠한 면'); assert.equal(+m[1], paintCount(H), `${where}: "${m[0]}"`); n.paint++; }
      for (const m of say.matchAll(/(\d+) − (\d+) = (\d+)개 더 필요/g)) {
        need(H, '정육면체'); const k = Math.max(H.length, H[0].length, tallest(H));
        assert.ok(+m[1] === k ** 3 && +m[2] === sumAll(H) && +m[3] === k ** 3 - sumAll(H), `${where}: "${m[0]}" (한 모서리 ${k}개)`); n.cube++;
      }
      for (const m of say.matchAll(/(\d)개로는 (\d)가지/g)) { assert.equal(+m[2], polyShapes(+m[1]).all, `${where}: "${m[0]}"`); n.kinds++; }
      for (const m of say.matchAll(/(\d)개로 만들 수 있는 서로 다른 모양은 모두 (\d)가지/g)) { assert.equal(+m[2], polyShapes(+m[1]).all, `${where}: "${m[0]}"`); n.kinds++; }
      for (const m of say.matchAll(/한 층으로 놓는 모양 (\d)가지/g)) { assert.equal(+m[1], P4.flat, `${where}: "${m[0]}"`); n.kinds++; }
      for (const m of say.matchAll(/2층으로 쌓는 모양 (\d)가지/g)) { assert.equal(+m[1], P4.all - P4.flat, `${where}: "${m[0]}"`); n.kinds++; }
      if (/한 층으로 놓는 5가지는/.test(say)) {
        const shapes = F.filter((x) => /free/.test(x.arg)).flatMap((x) => (x.kind === 'stack' ? [rowsOf(x.arg.replace(/\s*free/, ''))] : Object.values(stacksOf(x.arg))));
        // [stacks]는 넷까지라 일자(4개를 한 줄로)는 글로만 말한다
        if (/일자\(4개를 한 줄로/.test(say) && !shapes.some((X) => X.length === 1 && X[0].join('') === '1111')) shapes.push([[1, 1, 1, 1]]);
        assert.equal(shapes.length, 5, where);
        for (const X of shapes) assert.ok(tallest(X) === 1 && sumAll(X) === 4, `${where}: 한 층 4개가 아니다 ${JSON.stringify(X)}`);
        for (let a = 0; a < 5; a++) for (let b = a + 1; b < 5; b++) assert.ok(!sameShape(shapes[a], shapes[b]), `${where}: ${a}·${b} 같은 모양`);
        n.flat5++;
      }
      n.rows += rowsClaims(say, H, where);
    }
  }
  for (const [k, v] of Object.entries(n)) assert.ok(v >= 1, `원고 그림 대조 ${k} ${v}번 — 검사가 빈 채 통과하지 않게 (${JSON.stringify(n)})`);
  assert.ok(n.fig >= 80 && n.total >= 6 && n.dir >= 6, JSON.stringify(n));
});

test('★ 원고의 조사·셈식·아직 안 배운 말·틀린 말 (배움 글·확인 질문·아빠 카드 전부) · ASCII 빼기 없음', () => {
  const BAT = new Set(['0', '1', '3', '6', '7', '8']);
  const PAIRS = [['을', '를'], ['은', '는'], ['이', '가'], ['과', '와'], ['이에요', '예요'], ['이니까', '니까'], ['이라서', '라서']];
  const jong = (ch) => { const code = ch.charCodeAt(0) - 0xac00; return code >= 0 && code < 11172 ? code % 28 : -1; };
  const ev = (expr) => Function(`return (${expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-')})`)();
  let hitN = 0; let hitK = 0; let hitW = 0; let calcs = 0;
  const idx = (id) => IDS.indexOf(id);
  for (const id of IDS) {
    const v = CONTENT[id];
    const all = contentText(v).replace(/\*\*/g, '').replace(/\[[a-z]+ [^\]]+\]/g, '');
    for (const [wb, nb] of PAIRS) {
      for (const m of all.matchAll(new RegExp(`(\\d)(${wb}|${nb})(?=[\\s.,!?)—]|$)`, 'g'))) { assert.equal(m[2], BAT.has(m[1]) ? wb : nb, `${id}: "…${m[1]}${m[2]}"`); hitN++; }
      for (const m of all.matchAll(new RegExp(`([㉠-㉣])(${wb}|${nb})(?=[\\s.,!?)—]|$)`, 'g'))) { assert.equal(m[2], wb, `${id}: "…${m[1]}${m[2]}"`); hitK++; }
      for (const m of all.matchAll(new RegExp(`(모양|쌓기나무|기둥|칸|줄|층|면|정육면체|그림|가지)(${wb}|${nb})(?=[\\s.,!?)—]|$)`, 'g'))) { assert.equal(m[2], jong(m[1].slice(-1)) > 0 ? wb : nb, `${id}: "…${m[1]}${m[2]}"`); hitW++; }
    }
    // 수 목록 뒤 "(이)라" — "2, 2, 1이라"
    for (const m of all.matchAll(/(\d)(이라|라)(?= [㉠-㉣가-힣])/g)) assert.equal(m[2], BAT.has(m[1]) ? '이라' : '라', `${id}: "…${m[1]}${m[2]}"`);
    for (const m of all.matchAll(/(\d)(으로|로)(?=[\s.,]|$)/g)) assert.equal(m[2], ['1', '7', '8'].includes(m[1]) ? '로' : BAT.has(m[1]) ? '으로' : '로', `${id}: "…${m[1]}${m[2]}"`);
    assert.ok(!/-\d/.test(all), `${id}: ASCII 빼기`);
    for (const m of all.matchAll(/(?<![\d.(−])(\d+(?: [+−×÷] \d+)+) = (\d+)(?![\d.])/g)) { assert.equal(ev(m[1]), Number(m[2]), `${id}: ${m[0]}`); calcs++; }
    for (const [re, at] of FIRST) if (idx(at) > idx(id)) assert.ok(!re.test(all), `${id}: 아직 안 배운 ${re}`);
    for (const block of truthBlocks(v)) for (const [re, why] of BAD) assert.ok(!re.test(block), `${id}: ${why}\n${block}`);
  }
  assert.ok(hitK >= 30 && hitW >= 60 && calcs >= 30, `실제로 본 곳: 수 ${hitN} · ㉠ ${hitK} · 낱말 ${hitW} · 셈식 ${calcs}`);
});

test('원고는 배포 파일 검사(check.mjs)에도 걸린다 — space.json → mathspace.js의 checkContent', () => {
  const ck = readFileSync(new URL('../tools/check.mjs', import.meta.url), 'utf8');
  assert.match(ck, /'coach\/math\/space\.json': '\.\.\/js\/mathspace\.js'/);
});

// ───────────────────── 3단계: 화면 연결 ─────────────────────

test('화면 연결 (3단계): STEMS.space(S)는 이 생성기·원고를 쓰고 R 좌표평면 바로 뒤 · 앱 셸이 둘 다 들고 간다 · 사다리 안내에 O 직육면체 · 쌓기나무 그림을 📊·❓가 안다', async () => {
  const { STEMS, STEM_ORDER, stemOf } = await import('../js/mathprog.js');
  assert.equal(STEMS.space.code, 'S');
  assert.equal(STEM_ORDER[STEM_ORDER.indexOf('coord') + 1], 'space', 'R 좌표평면과 그래프 바로 뒤');
  assert.equal(STEMS.space.list, SPACE);
  assert.equal(STEMS.space.gen.makeQuestion, makeQuestion);
  assert.equal(STEMS.space.gen.lessonOf, lessonOf, '📚 배움은 이 생성기의 lessonOf');
  assert.equal(STEMS.space.file, './coach/math/space.json');
  assert.equal(STEMS.space.range, '초6');
  assert.ok(IDS.every((id) => stemOf(id) === STEMS.space), '모든 칸이 S 줄기로 찾아진다');
  assert.match(STEMS.space.pick, /O 직육면체/);
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  for (const f of ['./js/mathspace.js', './coach/math/space.json', './js/drawview.js']) assert.ok(sw.includes(`'${f}'`), `APP_SHELL에 ${f}`);
  // 📊 펼친 문제 글(figText)·❓ 복사문·📊 답장 안내 — 쌓기나무를 안다, 안내의 예는 그대로 그려진다
  assert.equal(figText('앞 [stack 2 1 / 1 3] 뒤', true), '앞 (쌓기나무) 뒤');
  const ask = readFileSync(new URL('../js/mathask.js', import.meta.url), 'utf8');
  const stats = readFileSync(new URL('../js/stats.js', import.meta.url), 'utf8');
  assert.ok(ask.includes('[stack 2 1 / 1 3]') && stats.includes('[stack 2 1 / 1 3]'), '❓ 복사문·📊 답장 안내에 [stack] 예');
  assert.ok(renderFigures('[stack 2 1 / 1 3]').startsWith('<svg'), '안내의 예도 그려진다');
});

/** ✍️ 칸 칠하기 판이 서는 문항 — [칸, 따로 푼 문제 종류, 판 크기 [칸 수, 층 수]] (S1·S5는 v195에서 넓힘) */
const BOARDS = [['spc.dir', 'pickView', [3, 3]], ['spc.view', 'pickView', [3, 3]], ['spc.topnum', 'topView', [3, 4]]];
test('✍️ 칸 칠하기 판 (3단계 · S1·S5 v195): 판 크기는 칸마다 늘 같다 · 판의 후보 = 문제 글의 후보 그림 · 목표 = 따로 푼 답 · 칠하는 말 = 풀이 카드 말 · 눌러서 목표를 만든다 · 짐작한 답은 보기와 안 겹친다 · 화면 배선', async () => {
  const { canDraw, paintOf, paintSay, paintText, paintTap, paintFromText } = await import('../js/drawview.js');
  const valOf = (s) => s.slice(2); // 's:2,3,1' · 't:110/011' → 판 값
  const kinds = new Set(); const per = {};
  for (const [id, type, size] of BOARDS) for (let s = 1; s <= SEEDS; s++) {
    const q = qOf(id, 'calc', s);
    const where = `${id} #${s}`;
    const sv = solveText(q.q);
    if (sv.type !== type) { assert.ok(!q.draw, `${where}: 본 모양 고르기가 아닌데(${sv.type}) 판이 있다`); continue; }
    assert.ok(q.draw, `${where}: 본 모양 고르기에 판이 없다`);
    assert.ok(canDraw(q.draw), where);
    const g = paintOf(q.draw);
    // 판의 종류 = 문제가 묻는 쪽 · 판 크기는 칸마다 늘 같다 (답 모양·오답 후보에 따라 달라지면 답을 흘린다 — S5는 "줄의 수를 더함" 후보가 4층까지라 늘 4층)
    assert.equal(g.kind, sv.f.d === 'top' ? 'top' : 'side', `${where}: 판 종류`);
    assert.deepEqual([g.cols, g.rows], size, `${where}: 판 크기`);
    kinds.add(`${id}:${g.kind}:${sv.f.d}`);
    per[id] = (per[id] || 0) + 1;
    // 판의 후보 = 문제 글의 [views] 그림 그대로(이름·값) · 그 그림은 문제 글에 한 번 · 목표 = 따로 푼 답의 모양
    assert.equal(q.q.split(`[${q.draw.fig}]`).length, 2, `${where}: 후보 그림이 문제 글에 한 번`);
    assert.deepEqual(q.draw.cands.map((z) => `${z.k}=${z.v}`), Object.entries(sv.f.C).map(([k, v]) => `${k}=${valOf(v)}`), `${where}: 판 후보 ≠ 그림 후보`);
    assert.equal(g.target, valOf(sv.f.C[sv.ans]), `${where}: 판의 목표 ≠ 따로 푼 답`);
    // 후보 → 보기: 모두 보기에 있고, 목표만 정답, 오답 후보는 이름표가 있다
    for (const z of q.draw.cands) {
      const ch = q.choices.find((x) => x.text === z.k);
      assert.ok(ch, `${where}: 후보 ${z.k}가 보기에 없다`);
      assert.equal(!!ch.ok, z.v === g.target, `${where}: ${z.k} 정답 표시`);
      if (!ch.ok) assert.ok(ch.tag, `${where}: 오답 후보 ${z.k}에 이름표 없음`);
      assert.equal(paintText(g, z.v), z.k, `${where}: 후보 모양을 칠하면 그 이름`);
    }
    // 칠하는 동안의 말 = 풀이 카드의 말 (앞·옆 "…2, 3, 1층" · 위 "뒤 줄부터 ■■□ / …")
    const st = q.solve.steps.map((x) => (typeof x === 'string' ? x : x.text || x.t).replace(/^[①-⑨] /, ''));
    const say = paintSay(g, g.target);
    if (g.kind === 'side') assert.ok(st.slice(0, -1).some((x) => x.endsWith(` ${say.replace('왼쪽부터 ', '')}`)), `${where}: ${say} · ${st.join(' / ')}`);
    else assert.equal(st[1], say, `${where}: ${say} · ${st[1]}`);
    // S5 옆: 오른쪽 옆에서는 앞 줄(위에서 본 모양의 아래쪽 줄)이 판의 왼쪽 — 풀이 카드가 그 말을 한다
    if (id === 'spc.topnum' && sv.f.d === 'right') assert.ok(st.some((x) => x.startsWith('오른쪽 옆에서는 앞 줄이 왼쪽 — ')), `${where}: ${st.join(' / ')}`);
    // 눌러서 목표 만들기 — 빈 판에서 (앞·옆) 기둥마다 그 높이 칸을 한 번 · (위) 칠할 칸마다 한 번
    const T = g.kind === 'side' ? g.target.split(',').map(Number) : g.target.split('/').map((r) => [...r].map(Number));
    let v = g.kind === 'side' ? Array(g.cols).fill(0).join(',') : '000/000/000';
    if (g.kind === 'side') T.forEach((h, i) => { v = paintTap(g, v, i, g.rows - h); });
    else T.forEach((row, r) => row.forEach((x, i) => { if (x) v = paintTap(g, v, i, r); }));
    assert.equal(v, g.target, `${where}: 눌러서 목표를 못 만든다`);
    // 짐작한 답(후보가 아닌 모양)의 글자는 어느 보기와도 안 겹친다 — 판 위 모든 모양을 다 칠해 본다
    const H = Array.from({ length: g.rows }, (_, k) => k + 1);
    const all = g.kind === 'side'
      ? H.flatMap((a) => H.flatMap((b) => H.map((c) => `${a},${b},${c}`)))
      : Array.from({ length: 511 }, (_, k) => (k + 1).toString(2).padStart(9, '0')).map((b) => `${b.slice(0, 3)}/${b.slice(3, 6)}/${b.slice(6)}`);
    for (const x of all) {
      const t = paintText(g, x);
      const cand = q.draw.cands.find((z) => z.v === x);
      if (cand) assert.equal(t, cand.k);
      else {
        assert.ok(!q.choices.some((ch) => ch.text === t), `${where}: 짐작한 답 "${t}"이 보기와 겹친다`);
        assert.equal(paintFromText(g, t), x, `${where}: 답한 뒤 화면이 "${t}"을 다시 칠하지 못한다`);
      }
    }
    // 고르기 문항이라 숫자판은 없다 — 판이 숫자판 자리에 선다
    assert.equal(padSpec(q, 'space'), null, where);
  }
  assert.equal(per['spc.view'], SEEDS, 'S2는 문항마다 판');
  for (const id of ['spc.dir', 'spc.topnum']) assert.ok(per[id] > SEEDS / 5, `${id} 판 문항 ${per[id]}`);
  assert.deepEqual([...kinds].sort(), ['spc.dir:side:back', 'spc.dir:side:front', 'spc.dir:side:left', 'spc.dir:side:right', 'spc.topnum:side:front', 'spc.topnum:side:right', 'spc.view:side:front', 'spc.view:side:right', 'spc.view:top:top'], `판 종류 ${[...kinds]}`);
  // 판 높이(draw.rows): S5는 후보가 3층까지인 문항도 4층 판 · 없으면 3층 · 3~4 밖이거나 정수가 아니면 판을 안 연다
  const s5 = (() => { for (let s = 1; s <= 400; s++) { const d = qOf('spc.topnum', 'calc', s).draw; if (d && Math.max(...d.cands.flatMap((z) => z.v.split(',').map(Number))) <= 3) return d; } return null; })();
  assert.ok(s5, 'S5 후보가 3층까지인 문항');
  assert.equal(paintOf(s5).rows, 4, 'S5 판은 후보가 3층까지여도 4층');
  assert.equal(paintOf({ ...s5, rows: undefined }).rows, 3, '판 높이를 안 정하면 3층');
  for (const bad of [2, 5, 3.5, '4', null]) assert.equal(canDraw({ ...s5, rows: bad }), false, `판 높이 ${bad}`);
  // 같은 기둥의 같은 칸을 다시 누르면 한 층 내린다 · 위 판은 다시 누르면 지운다
  const gs = { kind: 'side', cols: 3, rows: 3, cands: [], target: '' };
  assert.equal(paintTap(gs, '2,0,0', 0, 1), '1,0,0', '2층까지 칠한 기둥의 2층 칸을 다시 누르면 1층');
  assert.equal(paintTap(gs, '0,0,0', 2, 0), '0,0,3', '맨 위 칸을 누르면 3층까지');
  assert.equal(paintTap({ kind: 'top', cols: 3, rows: 3 }, '100/000/000', 0, 0), '000/000/000');
  assert.equal(paintSay(gs, '2,3,1'), '왼쪽부터 2, 3, 1층');
  assert.equal(paintSay({ kind: 'top' }, '110/011'), '뒤 줄부터 ■■□ / □■■');
  // 말이 안 되는 draw는 판을 안 연다 (보기로 되돌아간다) — 앞·옆 판과 위 판 둘 다로 (위 판 하나로만 보면 종류 대조가 빠져도 위 값이 앞·옆으로 안 읽혀 지나갔다, 변이 검사가 잡음)
  const drawOf = (kind) => { for (let s = 1; ; s++) { const d = qOf('spc.view', 'calc', s).draw; if (d.kind === kind) return d; } };
  for (const D of [drawOf('side'), drawOf('top')]) {
    assert.ok(canDraw(D));
    const other = D.kind === 'side' ? 'top' : 'side';
    for (const bad of [
      { ...D, fig: D.fig.replace('㉠=', '#=').replace('㉣=', '㉠=').replace('#=', '㉣=') }, // 그림 후보 이름이 draw와 다르다 (㉠·㉣ 맞바꿈)
      { ...D, target: D.kind === 'side' ? '4,4,4' : '111/111/111' }, // 목표가 후보에 없다
      { ...D, cands: D.cands.slice(0, 1) }, // 후보 하나
      { ...D, kind: other }, // 종류가 그림과 다르다
      { ...D, fig: 'views ㉠=9,9' }, // 못 읽는 그림
    ]) assert.equal(canDraw(bad), false, `${D.kind}: ${JSON.stringify(bad)}`);
  }
  // 두 종류로 다 읽히는 값 — 그림은 앞·옆 모양(기둥 하나 1층·2층)인데 판 종류만 "위"라고 적은 draw (종류 대조가 없으면 1 × 1 위 판이 열린다)
  assert.equal(canDraw({ mode: 'cells', kind: 'top', fig: 'views ㉠=1 ㉡=2', cands: [{ k: '㉠', v: '1' }, { k: '㉡', v: '2' }], target: '1' }), false, '그림과 판 종류가 다르다');
  assert.equal(canDraw({ mode: 'cells', kind: 'side', fig: 'views ㉠=1 ㉡=2', cands: [{ k: '㉠', v: '1' }, { k: '㉡', v: '2' }], target: '1' }), true, '같은 값, 맞는 종류면 연다');
  // 화면 배선 — 문항·🔁 쌍둥이 둘 다 판을 연다(숫자판 없이도), 칠한 글자로 보기를 찾는다, 문제 글에서는 후보 그림만 빼고 "칸을 칠해 보세요"
  const src = readFileSync(new URL('../js/math.js', import.meta.url), 'utf8');
  assert.match(src, /if \(q\.draw && \(q\.draw\.mode === 'grid' \|\| q\.draw\.mode === 'plane' \|\| q\.draw\.mode === 'cells'(?: \|\| q\.draw\.mode === '\w+')*\)\) return done !== 'choice' && \(done === 'typed' \|\| padOn\(\)\) && ui\.round && ui\.round\.mode !== 'special' && canDraw\(q\.draw\)/);
  assert.ok(src.includes("if (draw.mode === 'cells') return String(q.q).split(`[${draw.fig}]`).join('').replace('본 모양은 어느 것일까요?', '보면 어떤 모양일까요? 칸을 칠해 보세요.')"), 'qTextOf 칸 칠하기');
  assert.match(src, /const res = spec \? matchTyped\(q, typed, spec\) : \{ i: q\.choices\.findIndex\(\(c\) => c\.text === typed\.text\) \};/);
  const q1 = qOf('spc.view', 'calc', 1);
  assert.equal(q1.q.split('본 모양은 어느 것일까요?').length, 2, '바꿀 말이 한 번');
  assert.ok(/\[stack /.test(q1.q.split(`[${q1.draw.fig}]`).join('')), '후보 그림을 빼도 쌓은 모양 그림은 남는다');
  const dv = readFileSync(new URL('../js/drawview.js', import.meta.url), 'utf8');
  assert.match(dv, /if \(draw && draw\.mode === 'cells'\) return paintBox\(draw, \{ onSubmit, onIdk \}\);/);
  assert.match(dv, /if \(draw && draw\.mode === 'cells'\) return paintAnswered\(draw, text, ok\);/);
  // 판은 S1·S2·S5 본 모양 고르기에만 — 다른 문항·다른 칸·② 문항에는 draw가 없다
  for (const c of SPACE) for (const k of ['calc', 'misread']) for (let s = 1; s <= 30; s++) {
    const q = qOf(c.id, k, s);
    const want = k === 'calc' && BOARDS.some(([id, type]) => id === c.id && solveText(q.q).type === type);
    assert.equal(!!q.draw, want, `${c.id} ${k} #${s}`);
  }
  // S1·S5 문제 글도 바꿀 말이 한 번, 후보 그림을 빼도 쌓은 모양·수를 쓴 그림은 남는다
  for (const id of ['spc.dir', 'spc.topnum']) {
    const q = (() => { for (let s = 1; ; s++) { const x = qOf(id, 'calc', s); if (x.draw) return x; } })();
    assert.equal(q.q.split('본 모양은 어느 것일까요?').length, 2, `${id}: 바꿀 말이 한 번`);
    assert.ok(/\[(stack|top) /.test(q.q.split(`[${q.draw.fig}]`).join('')), `${id}: 후보 그림을 빼도 문제 그림은 남는다`);
  }
});

test('❓ 아빠에게 묻기: 칸 칠하기 판에 칠한 답은 "칸에 직접 칠함"으로 — 보기 ㉠~㉣는 아이가 못 본 후보 모양이라고 알린다', async () => {
  const { askContext, asksText } = await import('../js/mathask.js');
  const q = qOf('spc.view', 'calc', 1);
  assert.equal(q.draw.mode, 'cells');
  assert.equal(askContext(q, { chosen: '왼쪽부터 1, 1, 1층', p: 1, g: '왼쪽부터 1, 1, 1층', w: 'u' }).paint, 1);
  assert.equal(askContext(q, { chosen: q.choices[0].text }).paint, undefined, '보기를 누른 답(판 꺼짐)은 그대로');
  const src = readFileSync(new URL('../js/mathask.js', import.meta.url), 'utf8');
  assert.ok(src.includes("a.paint ? ' (✍️ 칸에 직접 칠함 — 보기의 ㉠~㉣는 진우가 못 본 후보 모양)'"));
  assert.equal(typeof asksText, 'function');
});

test('🔍 "바깥 면 = 본 모양의 칸 수"는 움푹 들어간 곳이 없을 때만 — 앞 줄 2·1·2처럼 들어간 곳이 있으면 옆에서 안 보이는 안쪽 면이 있다 (칸 설명·생성기 글·원고)', () => {
  assert.equal(paintCount(rowsOf('2 1 2')), 19, '2·1·2: 다섯 쪽에서 본 칸은 17, 들어간 곳 안쪽 면 2개가 더');
  const sentences = (t) => String(t).replace(/\*\*/g, '').split(/(?<=[.!?])\s+|\n+/);
  const bad = (t) => sentences(t).filter((x) => /본 모양의 칸 수(?:로|와)/.test(x) && !/움푹 들어간 곳이 없으면/.test(x));
  for (const c of SPACE) assert.deepEqual(bad([c.idea, c.rule, c.slip].join('\n')), [], c.id);
  for (const k of ['calc', 'misread']) for (let s = 1; s <= SEEDS; s++) assert.deepEqual(bad(allText(qOf('spc.apply', k, s))), [], `spc.apply ${k} #${s}`);
  for (const id of IDS) assert.deepEqual(bad(contentText(CONTENT[id])), [], id);
});

// ───────────────────── 🔍 Codex 34차 (2026-10-06) ─────────────────────

test('🔍 Codex 34차 #1·#2: ② 보기의 결론이 정답과 같은 수·같은 본 모양이면 그 보기가 정답이다 — 칸이 모두 1층이면 "위에서 본 칸만 — 5개"도 맞았다(S4 #34) · 4개가 있으면 "2 × 2 = 4개만 더"도 맞았다(S9 #15)', () => {
  // 보기 글의 마지막 수 (본 모양 "왼쪽부터 …층"은 목록째로 따로)
  const endN = (t) => { const m = String(t).match(/(\d+)개[^\d]*$/) || String(t).match(/= (\d+)[^\d]*$/); return m ? m[1] : null; }; // "…5개" · "… = 8" (층 이름 "2층"은 개수가 아니다)
  const list = (t) => (String(t).match(/왼쪽부터 ([\d, ]+)층/) || [])[1] || null;
  let n = 0;
  for (const { c, s, q } of every(['misread'])) {
    const ok = q.choices.find((x) => x.ok);
    for (const w of q.choices.filter((x) => !x.ok && x.text !== '맞게 말했어요')) {
      if (endN(ok.text) && endN(w.text)) { assert.notEqual(endN(w.text), endN(ok.text), `${c.id} #${s}: 오답 "${w.text}"의 결론이 정답 "${ok.text}"과 같다\n${q.q}`); n++; }
      if (list(ok.text) && list(w.text)) { assert.notEqual(list(w.text), list(ok.text), `${c.id} #${s}: 오답 "${w.text}"의 본 모양이 정답과 같다`); n++; }
    }
  }
  assert.ok(n > SEEDS * 4, `대조한 오답 ${n}`);
  // S9 ② "바닥만 채움" 오답은 정말 1층의 빈 칸 수다
  for (let s = 1; s <= SEEDS; s++) {
    const q = qOf('spc.apply', 'misread', s);
    if (q.probe.ask !== 'misCube') continue;
    const H = rowsOf(figsOf(q.q).find((x) => x.kind === 'top').arg);
    const fl = q.choices.find((x) => x.tag === TAGS.floorOnly);
    assert.ok(fl && Number(fl.text.match(/(\d+)개/)[1]) === 4 - cellsN(H), `spc.apply misread #${s}: ${fl && fl.text}`);
  }
});

test('🔍 Codex 34차 #3: 칠하기 판의 짐작한 답은 📊 기록에 셋째 줄까지 남는다 — 16자에서 잘려 "뒤 줄부터 ■■■ / ■■■"가 됐다', async () => {
  const { applyRound, conceptReport } = await import('../js/mathprog.js');
  const { emptyMath } = await import('../js/db.js');
  const m = emptyMath();
  const a = '뒤 줄부터 ■■■ / ■■■ / ■■■'; const b = '뒤 줄부터 ■■■ / ■■■ / ■■□';
  applyRound(m, 'spc.view', { correct: 0, total: 2, missTags: [], qs: [{ k: 'calc', ok: false, p: 1, g: a }, { k: 'calc', ok: false, p: 1, g: b }] }, '2026-10-06');
  const rep = conceptReport(m).find((x) => x.id === 'spc.view');
  assert.deepEqual(rep.guesses, [a, b], '두 짐작이 셋째 줄까지 따로 남는다');
});

test('🔍 Codex 34차 #4: 거울에 비친 모양이 늘 다른 모양은 아니다 — 한 층 ㄴ자와 그 거울 모양은 뒤집으면 같고, 2층으로 쌓는 나선 둘만 끝까지 다르다 · 원고 S7이 두 경우를 다 보여 준다', () => {
  assert.ok(sameShape(rowsOf('1 0 0 / 1 1 1'), mirrorOfH(rowsOf('1 0 0 / 1 1 1'))), '한 층 ㄴ자와 거울 모양은 같은 모양');
  assert.ok(!sameShape(rowsOf('0 1 / 2 1'), mirrorOfH(rowsOf('0 1 / 2 1'))), '나선과 거울 모양은 다른 모양');
  const P = polyShapes(4);
  assert.equal(P.all - P.mirrorOne, 1, '4개짜리에서 거울 짝이 따로인 것은 한 쌍뿐');
  // 원고 S7 배움 글의 "㉠과 ㉡은 거울에 비친" — 같은 모양인 쌍과 다른 모양인 쌍이 둘 다 나온다
  const kinds = new Set();
  for (const p of CONTENT['spc.make'].lesson) {
    const say = fillC(p.say);
    const CD = Object.assign({}, ...figsOf(say).filter((x) => x.kind === 'stacks').map((x) => stacksOf(x.arg)));
    for (const m of say.matchAll(/([㉠-㉣])과 ([㉠-㉣])은 거울에 비친/g)) kinds.add(sameShape(CD[m[1]], CD[m[2]]) ? 'same' : 'diff');
  }
  assert.deepEqual([...kinds].sort(), ['diff', 'same'], `원고가 보여 준 거울 쌍: ${[...kinds]}`);
  // 생성기 ② 거울 갈래의 고치는 말도 "이 두 모양"의 일이다 (일반 규칙으로 말하지 않는다 — BAD가 본다)
  for (let s = 1; s <= SEEDS; s++) {
    const q = qOf('spc.make', 'misread', s);
    if (q.probe.ask === 'misMirror') assert.ok(!/거울에 비친 모양은/.test(q.choices.find((x) => x.ok).text), `#${s}`);
  }
});
