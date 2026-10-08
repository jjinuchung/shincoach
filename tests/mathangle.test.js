// 📐 Z 각도 줄기 — 생성기 테스트.
// ★ 정답·오답은 이 파일이 **문제 글과 그림 지시문을 따로 읽어** 다시 푼다 — 그림은 그린 SVG에서 각을 다시 잰다(그림이 거짓말하면 잡힌다).
//   이름표 판정은 생성기 이름표를 보지 않고 **그 틀린 생각이 실제로 한 일**로 다시 계산한다.
// 함정(stem-generator-pitfalls)을 처음부터: 쌍둥이 틀 · 오답끼리 같은 값 · 한 값이 두 틀린 생각에서 나오는 일(Codex 39차 #3) ·
//   아직 안 배운 말(°·각도기·예각/둔각·어림·일직선)을 앞 칸 글에 · 숫자판(° 단위) · 참말 금지 · 글 속 셈식 · ° 뒤 조사(도 → 는·가·를·예요)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ANGLE, TAGS, makeQuestion, makeRound, ladder, placeFrom, diagnosticSet, lessonOf, checkContent, gradeLabel } from '../js/mathangle.js';
import { tplKey } from '../js/mathgen.js';
import { figureSvg, renderFigures, figText } from '../js/mathdraw.js';
import { padSpec, readTyped, matchTyped, partsOf } from '../js/mathpad.js';

const OPTS = { names: ['피카츄', '리자몽', '개굴닌자'], me: '진우', worlds: { pokemon: [], toystory: [], minions: [], moana: [] } };
const SEEDS = Number(process.env.RNG_SEEDS) || 300;
const IDS = ANGLE.map((c) => c.id);

// ───────────────────── 그림 읽기 (생성기·그림 코드를 쓰지 않는다) ─────────────────────

const figsOf = (q) => [...String(q).matchAll(/\[([a-z]+) ([^\]]+)\]/g)].map((m) => ({ kind: m[1], arg: m[2], raw: m[0] }));
/** [ang] 지시문 → [{name, v, arm, arc, rot}] */
const angItems = (arg) => arg.trim().split(/\s+/).map((t) => {
  const m = /^(?:([가-다]):)?(\d+)\/(\d+)\/(\d+)@(\d+)$/.exec(t);
  assert.ok(m, `ang 토큰 ${t}`);
  return { name: m[1] || '', v: +m[2], arm: +m[3], arc: +m[4], rot: +m[5] };
});
const num = (s) => +s;
const attrs = (s) => { const o = {}; for (const a of String(s).matchAll(/([a-z][a-z0-9-]*)="([^"]*)"/g)) o[a[1]] = a[2]; return o; };
const deg = (rad) => (rad * 180) / Math.PI;
/** 두 선분(같은 꼭짓점에서 나감)이 이루는 각 */
const between = (u, v) => deg(Math.acos(Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v))))));
/** [ang] 그림 → 이름마다 잰 각·변 길이·호 반지름·직각 표시 */
function measureAng(svg) {
  return [...svg.matchAll(/<g class="ang-a"([^>]*)>(.*?)<\/g>/g)].map((m) => {
    const a = attrs(m[1]); const body = m[2];
    const rays = [...body.matchAll(/<line class="ang-ray"([^>]*)\/>/g)].map((x) => attrs(x[1]));
    assert.equal(rays.length, 2, '변 둘');
    const vec = (l) => [num(l.x2) - num(l.x1), -(num(l.y2) - num(l.y1))];
    const arc = /<path class="ang-arc" data-r="(\d+)" d="M [-\d.]+ [-\d.]+ A ([\d.]+) /.exec(body);
    return { name: a['data-name'], v: between(vec(rays[0]), vec(rays[1])), arm: [Math.hypot(...vec(rays[0])), Math.hypot(...vec(rays[1]))], arc: arc ? +arc[2] : null, right: /class="ang-right"/.test(body), dataV: +a['data-v'] };
  });
}
/** [prot] 그림 → 두 변의 방향(밑금 오른쪽 기준 시계 반대 각)과 눈금 수 자리 */
function measureProt(svg) {
  const CX = 200; const CY = 206;
  const arms = [...svg.matchAll(/<line class="prot-arm"([^>]*)\/>/g)].map((m) => { const a = attrs(m[1]); return { v: +a['data-v'], phi: deg(Math.atan2(CY - num(a.y2), num(a.x2) - CX)), x1: num(a.x1), y1: num(a.y1) }; });
  const nums = [...svg.matchAll(/<text class="prot-n"([^>]*)>(\d+)<\/text>/g)].map((m) => { const a = attrs(m[1]); return { ring: a['data-ring'], v: +a['data-v'], t: +m[2], phi: deg(Math.atan2(CY - (num(a.y) - 5), num(a.x) - CX)) }; });
  return { arms, nums, left: /data-left="1"/.test(svg) };
}
/** [prot] 그림을 읽어 각도를 정한다 — 0이 있는 쪽(밑금 위 변)의 눈금으로 다른 변을 읽는다 */
function readProt(svg) {
  const P = measureProt(svg);
  const reading = (phi) => (P.left ? 180 - phi : phi);
  const [r1, r2] = P.arms.map((a) => Math.round(reading(a.phi)));
  return { lo: Math.min(r1, r2), hi: Math.max(r1, r2), left: P.left, P };
}
/** [fan] 그림 → 변마다 방향(첫 변 기준) */
function measureFan(svg) {
  const rays = [...svg.matchAll(/<line class="fan-ray"([^>]*)\/>/g)].map((m) => { const a = attrs(m[1]); return { i: +a['data-i'], x1: num(a.x1), y1: num(a.y1), x2: num(a.x2), y2: num(a.y2) }; });
  const dir = (r) => { let d = deg(Math.atan2(-(r.y2 - r.y1), r.x2 - r.x1)); if (d < -0.5) d += 360; return d; };
  return { dirs: rays.map(dir), labs: [...svg.matchAll(/<text class="fan-lab" data-i="(\d+)" x="([-\d.]+)" y="([-\d.]+)"[^>]*>([^<]+)<\/text>/g)].map((m) => ({ i: +m[1], x: +m[2], y: +m[3], t: m[4] })), v: rays[0] ? [rays[0].x1, rays[0].y1] : null };
}
/** 도형 그림의 꼭짓점 (J 테스트와 같은 방법) → 각 */
const polyPts = (svg) => /<polygon points="([^"]+)"/.exec(svg)[1].trim().split(/\s+/).map((s) => s.split(',').map(Number));
function polyAngles(pts) {
  return pts.map((p, i) => { const a = pts[(i + pts.length - 1) % pts.length]; const b = pts[(i + 1) % pts.length]; return between([a[0] - p[0], -(a[1] - p[1])], [b[0] - p[0], -(b[1] - p[1])]); });
}

// ───────────────────── 문제 글 읽기 ─────────────────────

const bolds = (q) => [...String(q).matchAll(/\*\*(.+?)\*\*/g)].map((m) => m[1]);
/** 보기 글 → 값 (수 · "약 60°" · "115°" · 이름 가/나/다 · "가가 더 커요" → "가>" · "두 각의 크기가 같아요" → "=") */
function valOf(text) {
  const s = String(text).trim(); let m;
  if ((m = /^(?:약 )?(\d+)(?:°|개)?$/.exec(s))) return +m[1];
  if (/^[가나다]$/.test(s)) return s;
  if ((m = /^([가나다])가 더 커요$/.exec(s))) return `${m[1]}>`;
  if (s === '두 각의 크기가 같아요') return '=';
  return null;
}
const listOf = (s) => s.split(', ').map((x) => +x.replace('°', ''));
/** 이름 붙은 각 셋·둘 — 가장 큰/작은 각, 변이 가장 긴/짧은 각, 호가 가장 큰/작은 각 (하나뿐일 때만) */
const extremeName = (items, key, big) => {
  const vals = items.map((x) => x[key]); const t = big ? Math.max(...vals) : Math.min(...vals);
  const hit = items.filter((x) => x[key] === t);
  return hit.length === 1 ? hit[0].name : null;
};

/** 문제 글(+그림) → { type, ans(값), f(판정표 재료) } — 보기는 고르기 문제에서만 쓴다 */
function solveText(q, choices = []) {
  let m;
  const F = figsOf(q); const fig = (k) => F.find((x) => x.kind === k);
  const b = bolds(q);
  if ((m = /세 각 가, 나, 다 중에서 가장 (큰|작은) 각은 어느 것일까요\?/.exec(q))) {
    const items = angItems(fig('ang').arg); const big = m[1] === '큰';
    const ans = extremeName(items, 'v', big); assert.ok(ans, `${q}: 가장 ${m[1]} 각이 둘`);
    return { type: big ? 'max' : 'min', ans, f: { kind: 'most', armPick: extremeName(items, 'arm', big), arcPick: extremeName(items, 'arc', big) } };
  }
  if (/두 각 가와 나의 크기를 바르게 비교한 것은 어느 것일까요\?/.test(q)) {
    const items = angItems(fig('ang').arg); const [x, y] = items;
    const ans = x.v === y.v ? '=' : `${x.v > y.v ? x.name : y.name}>`;
    return { type: 'same', ans, f: { kind: 'same', armPick: `${extremeName(items, 'arm', true)}>`, arcPick: `${extremeName(items, 'arc', true)}>` } };
  }
  if (/각도기로 각의 크기를 재었어요\. 이 각은 몇 도일까요\?/.test(q)) {
    const R = readProt(figureSvg(`prot ${fig('prot').arg}`)); assert.equal(R.lo, 0, `${q}: 한 변이 0이 아님`);
    return { type: R.left ? 'protL' : 'protR', ans: R.hi, f: { kind: 'prot', A: R.hi } };
  }
  if (/^다음 중 둔각은 어느 것일까요\?$/.test(q)) { const vs = choices.map((c) => valOf(c.text)).filter((v) => v > 90 && v < 180); assert.equal(vs.length, 1, `${q}: 둔각 보기 ${vs}`); return { type: 'pickOb', ans: vs[0], f: { kind: 'pickOb' } }; }
  if (/^다음 중 예각은 어느 것일까요\?$/.test(q)) { const vs = choices.map((c) => valOf(c.text)).filter((v) => v > 0 && v < 90); assert.equal(vs.length, 1, `${q}: 예각 보기 ${vs}`); return { type: 'pickAc', ans: vs[0], f: { kind: 'pickAc' } }; }
  if (/위의 각도 중에서 둔각은 모두 몇 개일까요\?/.test(q)) {
    const L = listOf(b[0]); const cnt = (p) => L.filter(p).length;
    return { type: 'count', ans: cnt((v) => v > 90 && v < 180), f: { kind: 'count', ob: cnt((v) => v > 90 && v < 180), ac: cnt((v) => v > 0 && v < 90), n90: cnt((v) => v === 90), n180: cnt((v) => v === 180) } };
  }
  if (/세 각 가, 나, 다 중에서 둔각은 어느 것일까요\?/.test(q)) {
    const items = angItems(fig('ang').arg); const ob = items.filter((x) => x.v > 90 && x.v < 180);
    assert.equal(ob.length, 1, `${q}: 둔각 ${ob.length}`);
    return { type: 'figOb', ans: ob[0].name, f: { kind: 'figOb', ac: items.filter((x) => x.v < 90).map((x) => x.name), right: items.filter((x) => x.v === 90).map((x) => x.name) } };
  }
  if (/각도기 없이 어림해 보세요\. 이 각의 크기에 가장 가까운 것은 어느 것일까요\?/.test(q)) {
    const [it] = angItems(fig('ang').arg); const vs = choices.map((c) => valOf(c.text));
    const best = vs.slice().sort((x, y) => Math.abs(x - it.v) - Math.abs(y - it.v))[0];
    assert.equal(vs.filter((v) => Math.abs(v - it.v) === Math.abs(best - it.v)).length, 1, `${q}: 가장 가까운 어림이 둘`);
    return { type: 'near', side: it.v > 90 ? 'ob' : 'ac', ans: best, f: { kind: 'near', A: it.v } };
  }
  if ((m = /약 (\d+)°로 어림했어요\. 각도기로 재어 보니 (\d+)°였어요\.\n\n어림한 각도와 잰 각도의 차는 몇 도일까요\?/.exec(q))) { const [E, A] = [+m[1], +m[2]]; return { type: 'diff', ans: Math.abs(E - A), f: { kind: 'diff', E, A } }; }
  if (b[0] && (m = /^(\d+)° \+ (\d+)°$/.exec(b[0])) && /두 각도의 합은 몇 도일까요\?/.test(q)) return { type: 'sum', ans: +m[1] + +m[2], f: { kind: 'sum', a: +m[1], b: +m[2] } };
  if (b[0] && (m = /^(\d+)° − (\d+)°$/.exec(b[0])) && /두 각도의 차는 몇 도일까요\?/.test(q)) return { type: 'sub', ans: +m[1] - +m[2], f: { kind: 'sub', a: +m[1], b: +m[2] } };
  if (/두 각을 겹치지 않게 붙였어요\. 각 ㄱㅇㄷ은 몇 도일까요\?/.test(q)) {
    const t = fig('fan').arg.split(/\s+/); const [a, bb] = [+t[0], +t[1]];
    return { type: 'joined', ans: a + bb, f: { kind: 'sum', a, b: bb } };
  }
  if ((m = /각 ㄱㅇㄷ은 (\d+)°예요\. 각 ㄴㅇㄷ은 몇 도일까요\?/.exec(q))) {
    const t = fig('fan').arg.split(/\s+/); const A = +t[0]; const Wv = +m[1];
    return { type: 'rest', ans: Wv - A, f: { kind: 'rest', W: Wv, A } };
  }
  if ((m = /삼각형 ㄱㄴㄷ에서 각 ([ㄱㄴㄷ])의 크기는 몇 도일까요\?/.exec(q))) {
    const t = fig('tria').arg.split(/\s+/); const i = 'ㄱㄴㄷ'.indexOf(m[1]);
    assert.ok(t[i].startsWith('?'), `${q}: 묻는 각과 ?가 다른 자리`);
    const known = t.filter((_, j) => j !== i).map(Number);
    return { type: 'tria', ans: 180 - known[0] - known[1], f: { kind: 'tri', known } };
  }
  if (/삼각형의 세 각을 잘라 꼭짓점이 한 점에 모이도록 이어 붙였더니 일직선이 되었어요\. \?로 표시한 각은 몇 도일까요\?/.test(q)) {
    const t = fig('fan').arg.split(/\s+/); const known = t.filter((x) => !x.startsWith('?')).map(Number);
    assert.equal(t.reduce((a, x) => a + +x.replace('?', ''), 0), 180, `${q}: 일직선인데 세 조각의 합이 180°가 아님`);
    return { type: 'triCut', ans: 180 - known[0] - known[1], f: { kind: 'tri', known } };
  }
  if ((m = /^삼각형의 두 각의 크기가 (\d+)°, (\d+)°예요\. 나머지 한 각은 몇 도일까요\?$/.exec(q))) { const known = [+m[1], +m[2]]; return { type: 'triWords', ans: 180 - known[0] - known[1], f: { kind: 'tri', known } }; }
  if (/사각형 ㄱㄴㄷㄹ에서 각 ㄹ의 크기는 몇 도일까요\?/.test(q)) {
    const t = fig('quad').arg.split(/\s+/); assert.ok(t[3].startsWith('?'));
    const known = t.slice(0, 3).map(Number); return { type: 'quad', ans: 360 - known[0] - known[1] - known[2], f: { kind: 'quad', known } };
  }
  if (/사각형의 네 각을 잘라 꼭짓점이 한 점에 모이도록 이어 붙였더니 빈틈없이 한 바퀴가 되었어요\. \?로 표시한 각은 몇 도일까요\?/.test(q)) {
    const t = fig('fan').arg.split(/\s+/); const known = t.filter((x) => !x.startsWith('?')).map(Number);
    assert.equal(t.reduce((a, x) => a + +x.replace('?', ''), 0), 360, `${q}: 한 바퀴인데 네 조각의 합이 360°가 아님`);
    return { type: 'quadCut', ans: 360 - known[0] - known[1] - known[2], f: { kind: 'quad', known } };
  }
  if ((m = /^사각형의 세 각의 크기가 (\d+)°, (\d+)°, (\d+)°예요\. 나머지 한 각은 몇 도일까요\?$/.exec(q))) { const known = [+m[1], +m[2], +m[3]]; return { type: 'quadWords', ans: 360 - known[0] - known[1] - known[2], f: { kind: 'quad', known } }; }
  if ((m = /^사각형의 두 각의 크기가 (\d+)°, (\d+)°예요\. 나머지 두 각의 크기의 합은 몇 도일까요\?$/.exec(q))) { const known = [+m[1], +m[2]]; return { type: 'pair', ans: 360 - known[0] - known[1], f: { kind: 'pair', known } }; }
  if (/삼각형 ㄱㄴㄷ의 변 ㄱㄴ을 늘였어요\. ㉠의 크기는 몇 도일까요\?/.test(q)) {
    // 그림에서 잰 안쪽 각 ㄴ으로 — 가린 각(_)도 그림의 모양은 거짓말하지 않는다
    const t = fig('tria').arg.replace(/ ext$/, '').split(/\s+/); const known = [+t[0], +t[2]];
    const inner = Math.round(polyAngles(polyPts(figureSvg(`tria ${fig('tria').arg}`)))[1]);
    assert.equal(inner, 180 - known[0] - known[1], `${q}: 그림의 각 ㄴ`);
    return { type: 'triExt', ans: 180 - inner, f: { kind: 'triExt', known, inner } };
  }
  if (/사각형 ㄱㄴㄷㄹ의 변 ㄱㄴ을 늘였어요\. ㉠의 크기는 몇 도일까요\?/.test(q)) {
    const t = fig('quad').arg.replace(/ ext$/, '').split(/\s+/); const known = [+t[0], +t[2], +t[3]];
    const inner = Math.round(polyAngles(polyPts(figureSvg(`quad ${fig('quad').arg}`)))[1]);
    assert.equal(inner, 360 - known[0] - known[1] - known[2], `${q}: 그림의 각 ㄴ`);
    return { type: 'quadExt', ans: 180 - inner, f: { kind: 'quadExt', known, inner } };
  }
  return { type: 'unknown' };
}

const pairs = (xs) => xs.flatMap((x, i) => xs.slice(i + 1).map((y) => [x, y]));
/** 이름표마다 그 틀린 생각이 실제로 하는 일 — 문제의 종류(f.kind)와 정답으로 다시 계산한다 (생성기 이름표를 베끼지 않는다) */
function tagHolds(f, ans, tag, wv) {
  if (wv === null || wv === undefined || wv === ans) return false;
  const n = typeof wv === 'number';
  const sameSide = (x, y) => (x - 90) * (y - 90) > 0;
  switch (tag) {
    case TAGS.armLen: return ['most', 'same'].includes(f.kind) && wv === f.armPick;
    case TAGS.arcBig: return ['most', 'same'].includes(f.kind) && wv === f.arcPick;
    case TAGS.scaleSwap: return f.kind === 'prot' && wv === 180 - f.A;
    case TAGS.tickMiss: return f.kind === 'prot' && f.A % 10 === 5 && wv === f.A - 5;
    case TAGS.notZero: return f.kind === 'zero' && wv === f.E;
    case TAGS.swap:
      if (f.kind === 'pickOb') return n && wv > 0 && wv < 90;
      if (f.kind === 'pickAc') return n && wv > 90 && wv < 180;
      if (f.kind === 'count') return wv === f.ac;
      if (f.kind === 'figOb') return f.ac.includes(wv);
      if (f.kind === 'setAc') return wv === f.ob;
      if (f.kind === 'setOb') return wv === f.ac;
      return false;
    case TAGS.rightAs:
      if (f.kind === 'pickOb' || f.kind === 'pickAc') return wv === 90;
      if (f.kind === 'count') return f.n90 > 0 && wv === f.ob + f.n90;
      if (f.kind === 'figOb') return f.right.includes(wv);
      if (f.kind === 'setAc') return wv === f.acWith90;
      if (f.kind === 'setOb') return wv === f.obWith90;
      return false;
    case TAGS.straightAs:
      if (f.kind === 'pickOb') return wv === 180;
      if (f.kind === 'count') return f.n180 > 0 && wv === f.ob + f.n180;
      return false;
    case TAGS.sideMiss: return f.kind === 'near' && n && !sameSide(wv, f.A) && wv !== 90;
    case TAGS.refMiss: return f.kind === 'near' && n && sameSide(wv, f.A) && Math.abs(wv - f.A) >= 30;
    case TAGS.opSwap:
      if (f.kind === 'sum') return wv === Math.abs(f.a - f.b);
      if (f.kind === 'sub') return wv === f.a + f.b;
      if (f.kind === 'rest') return wv === f.W + f.A;
      if (f.kind === 'diff') return wv === f.E + f.A;
      if (f.kind === 'zero') return wv === f.E + f.S;
      if (f.kind === 'set') return wv === Math.abs(f.a - f.b);
      if (f.kind === 'rest3') return wv === f.W + f.known[0] + f.known[1]; // 원고 — 셋으로 나눈 각에서 빼야 할 두 각을 더함
      return false;
    case TAGS.otherAngle: return f.kind === 'set' && wv === 90 - f.a + f.b;
    case TAGS.triAs360:
      if (f.kind === 'tri') return wv === 360 - f.known[0] - f.known[1];
      if (f.kind === 'measure') return wv === 360;
      return false;
    case TAGS.quadAs180:
      if (f.kind === 'quad') return wv === 180 - f.known.reduce((a, x) => a + x, 0);
      if (f.kind === 'pair') return wv === 180 - f.known[0] - f.known[1];
      if (f.kind === 'four') return wv === 180;
      return false;
    case TAGS.addNotSub: return ['tri', 'quad', 'pair'].includes(f.kind) && wv === f.known.reduce((a, x) => a + x, 0);
    case TAGS.missOne:
      if (f.kind === 'tri') return f.known.some((k) => wv === 180 - k);
      if (f.kind === 'quad') return pairs(f.known).some(([x, y]) => wv === 360 - x - y);
      if (f.kind === 'pair') return f.known.some((k) => wv === 360 - k);
      if (f.kind === 'triExt') return f.known.includes(wv); // 각 ㄴ = 180 − (하나만) → ㉠ = 그 하나
      if (f.kind === 'quadExt') return pairs(f.known).some(([x, y]) => x + y - 180 > 0 && wv === x + y - 180);
      if (f.kind === 'rest3') return f.known.some((k) => wv === f.W - k); // 원고 — 아는 두 각 중 하나만 뺌
      return false;
    case TAGS.measured: return f.kind === 'measure' && n && wv > 175 && wv < 185 && wv !== 180;
    case TAGS.innerExtra: return f.kind === 'four' && wv === 720;
    // ㉠ 문제에서 안쪽 각 ㄴ에서 멈춤 — "더한 뒤 180°에서 뺌"도 같은 값이지만 교과서(천재 2022 지도서 141쪽)가 짚는 생각은 이것이라 ㉠ 문제의 b는 이것만으로 본다
    case TAGS.straightMiss: return ['triExt', 'quadExt'].includes(f.kind) && wv === f.inner;
    default: return false;
  }
}
const ALL_TAGS = Object.values(TAGS);
const allText = (q) => [q.q, ...q.choices.map((x) => x.text), ...(q.solve ? [...q.solve.steps, ...Object.values(q.solve.why), q.solve.whyAny, q.solve.rule] : [])].join('\n');
function* every(kinds = ['calc', 'misread'], n = SEEDS) {
  for (const c of ANGLE) for (const k of kinds) for (let s = 1; s <= n; s++) yield { c, k, s, q: makeQuestion(c.id, k, s, OPTS) };
}
// 문항 캐시 — 테스트마다 다시 만들지 않게 (씨앗 3,000개 넘게는 메모리를 아끼려고 그때그때 만든다 — 2만이면 문항 60만 개)
const CACHE = new Map();
const cached = (kinds, n) => {
  if (n > 3000) return every(kinds, n);
  const key = `${kinds}|${n}`; if (!CACHE.has(key)) CACHE.set(key, [...every(kinds, n)]); return CACHE.get(key);
};

// ───────────────────── 사다리 ─────────────────────

test('사다리: 8칸, 모두 초4, needs가 바로 앞 칸 · 맨 뒤는 ⭐ · 교과서 차시 순서', () => {
  assert.deepEqual(IDS, ['ang.compare', 'ang.measure', 'ang.acute', 'ang.estimate', 'ang.addsub', 'ang.tri', 'ang.quad', 'ang.apply']);
  ANGLE.forEach((c, i) => {
    assert.equal(c.grade, 4, c.id);
    assert.deepEqual(c.needs, i ? [IDS[i - 1]] : [], c.id);
    assert.ok(c.idea && c.rule && c.slip, c.id);
  });
  assert.equal(gradeLabel(4), '초4');
  assert.match(ANGLE[7].name, /^⭐/);
});

// ───────────────────── 문제 ─────────────────────

test('★ 독립 검산: ① 정답이 문제 글·그림을 따로 읽어 푼 답과 같다 · 딱 하나만 맞다 · 각은 5의 배수(개수 빼고)', () => {
  const types = new Set();
  for (const { c, s, q } of cached(['calc'], SEEDS)) {
    const sv = solveText(q.q, q.choices);
    assert.notEqual(sv.type, 'unknown', `${c.id} #${s}: 못 읽는 문제\n${q.q}`);
    const right = q.choices.filter((x) => valOf(x.text) === sv.ans);
    assert.equal(right.length, 1, `${c.id} #${s} (${sv.type}): 맞는 보기 ${right.map((x) => x.text).join(', ') || '없음'} — 따로 푼 답 ${sv.ans}\n${q.q}\n${q.choices.map((x) => x.text).join(' | ')}`);
    assert.ok(right[0].ok, `${c.id} #${s}: 정답 표시가 다른 보기\n${q.q}`);
    if (typeof sv.ans === 'number' && sv.type !== 'count') assert.equal(sv.ans % 5, 0, `${c.id} #${s}: 정답 ${sv.ans}`);
    types.add(`${c.id}:${sv.type}`);
  }
  assert.ok(types.size >= 24, `문제 종류 ${types.size}: ${[...types]}`);
});

test('★ 보기: 정답 하나, 글자·값 겹침 없음, 3개 이상, 빈 글자·undefined·NaN 없음 · 그림 지시문은 모두 그려진다', () => {
  let figs = 0;
  for (const { c, k, s, q } of cached(['calc', 'misread'], SEEDS)) {
    const at = `${c.id} ${k} #${s}`;
    assert.ok(q.choices.length >= 3, `${at}: 보기 ${q.choices.length}`);
    assert.equal(q.choices.filter((x) => x.ok).length, 1, at);
    assert.equal(new Set(q.choices.map((x) => x.text)).size, q.choices.length, `${at}: 같은 글자 보기`);
    assert.ok(!/undefined|NaN|\{(me|mon)|null|Infinity|object Object/.test(allText(q)), `${at}: ${allText(q)}`);
    if (k === 'calc') { const vals = q.choices.map((x) => valOf(x.text)); assert.ok(vals.every((v) => v !== null), `${at}: 못 읽는 보기 ${q.choices.map((x) => x.text)}`); assert.equal(new Set(vals).size, vals.length, `${at}: 값이 같은 보기`); }
    for (const f of figsOf(q.q)) { assert.ok(figureSvg(`${f.kind} ${f.arg}`).startsWith('<svg'), `${at}: 못 그리는 ${f.raw}`); figs++; }
  }
  assert.ok(figs > 8 * SEEDS, `그림 ${figs}`);
});

test('★ 오개념 이름표: 그 오답이 정말 그 틀린 생각이다 — 문제의 수로 틀린 셈을 다시 한다 · 이름표 붙은 오답이 늘 하나 이상 · 둘 이상인 문항이 칸마다 · ①의 이름표가 다 쓰인다', () => {
  let n = 0; const used = new Set(); const two = {};
  for (const { c, s, q } of cached(['calc'], SEEDS)) {
    const sv = solveText(q.q, q.choices);
    const tagged = q.choices.filter((x) => !x.ok && x.tag !== '계산 실수');
    assert.ok(tagged.length >= 1, `${c.id} #${s}: 이름표 붙은 오답 없음\n${q.q}`);
    if (tagged.length >= 2) two[c.id] = (two[c.id] || 0) + 1;
    for (const w of tagged) { assert.ok(tagHolds(sv.f, sv.ans, w.tag, valOf(w.text)), `${c.id} #${s} (${sv.type}): "${w.text}"의 이름표 "${w.tag}"가 뜻과 다르다\n${q.q}`); n++; used.add(w.tag); }
  }
  // 각도의 합과 차(Z5)는 흔한 오개념이 "합과 차를 바꿈" 하나뿐 — 나머지는 근처 수(계산 실수)로 채운다
  for (const id of IDS.filter((x) => x !== 'ang.addsub')) assert.ok((two[id] || 0) > SEEDS / 4, `${id}: 이름표 붙은 오답이 둘 이상인 문항 ${two[id] || 0}`);
  const calcTags = ALL_TAGS.filter((t) => ![TAGS.notZero, TAGS.measured, TAGS.innerExtra, TAGS.otherAngle].includes(t));
  assert.equal(used.size, calcTags.length, `안 쓰인 이름표: ${calcTags.filter((t) => !used.has(t))}`);
  assert.ok(n > 1.5 * 8 * SEEDS, `본 이름표 ${n}`);
});

// Codex 39차 #3 — 한 값이 두 틀린 생각에서 나오면 보기에 남은 이름표 하나로는 어느 생각인지 모른다 → 그런 값은 아예 안 나오게
test('★ 한 오답 값이 두 틀린 생각에 다 맞는 일이 없다 — 보기에서 겹쳐 빠지기 전(probe.allWrong)까지 · 빠진 오답도 이름표의 뜻 그대로 · 정답과 같은 값 없음', () => {
  let n = 0;
  for (const { c, s, q } of cached(['calc'], SEEDS)) {
    const sv = solveText(q.q, q.choices);
    const W = q.probe.allWrong; const vals = W.map((w) => valOf(w.text));
    assert.equal(new Set(vals).size, vals.length, `${c.id} #${s}: 오답 값이 겹친다 ${W.map((w) => w.text)}`);
    for (const w of W) {
      const v = valOf(w.text);
      assert.notEqual(v, sv.ans, `${c.id} #${s}: 오답 "${w.text}"이 맞는 값`);
      assert.ok(tagHolds(sv.f, sv.ans, w.tag, v), `${c.id} #${s}: 오답 "${w.text}"[${w.tag}]의 뜻\n${q.q}`);
      const both = ALL_TAGS.filter((tg) => tagHolds(sv.f, sv.ans, tg, v));
      assert.equal(both.length, 1, `${c.id} #${s}: "${w.text}"이 두 생각에 다 맞다 — ${both.join(' · ')}\n${q.q}`);
      n++;
    }
  }
  assert.ok(n > 1.5 * 8 * SEEDS, `본 오답 ${n}`);
});

// 드문 조합은 씨앗을 넓혀 따로 (메모 test-seed-breadth — 300씨앗이 놓친 것을 2만이 잡았다)
test('★ 한 값 = 한 생각 — 칸마다 씨앗 3,000개 (빠른 판정만)', () => {
  const N = Math.max(3000, SEEDS);
  for (const c of ANGLE) {
    for (let s = 1; s <= N; s++) {
      const q = makeQuestion(c.id, 'calc', s, OPTS); const sv = solveText(q.q, q.choices);
      for (const w of q.probe.allWrong) { const v = valOf(w.text); const both = ALL_TAGS.filter((tg) => tagHolds(sv.f, sv.ans, tg, v)); assert.ok(v !== sv.ans && both.length === 1 && both[0] === w.tag, `${c.id} #${s}: "${w.text}"[${w.tag}] → ${both.join(' · ') || '맞는 생각 없음'}\n${q.q}`); }
    }
  }
});

test('★ 숫자판: 수가 답인 ①은 숫자판(단위 ° · 개수는 개) · 모든 보기를 쳐서 그 보기로 간다 · 고르는 문제("어느 것")는 숫자판 없음', () => {
  const pv = readFileSync(new URL('../js/padview.js', import.meta.url), 'utf8');
  const MAX = +/const MAX = (\d+);/.exec(pv)[1];
  let n = 0; let picks = 0;
  for (const { c, s, q } of cached(['calc'], SEEDS)) {
    const spec = padSpec(q, 'angle');
    if (/어느 것/.test(q.q)) { assert.equal(spec, null, `${c.id} #${s}: 고르는 문제에 숫자판`); picks++; continue; }
    assert.ok(spec, `${c.id} #${s}: 숫자판이 없다\n${q.q}`);
    assert.equal(spec.signed, false);
    assert.equal(spec.unit, /몇 개/.test(q.q) ? '개' : '°', `${c.id} #${s}: 단위 "${spec.unit}"\n${q.q}`);
    for (const ch of q.choices) {
      assert.match(ch.text, /^[1-9]\d{0,2}$/, `${c.id} #${s}: 숫자판 보기 "${ch.text}"`);
      assert.ok(String(ch.text).length <= MAX);
      const t = partsOf(ch.text); const hit = matchTyped(q, readTyped(t.mode, t.p, spec), spec);
      assert.equal(q.choices[hit.i], ch, `${c.id} #${s}: "${ch.text}"를 쳐도 그 보기로 안 간다`);
      n++;
    }
  }
  assert.ok(n > 10 * SEEDS && picks > 2 * SEEDS, `쳐 본 보기 ${n} · 고르기 ${picks}`);
});

/** ② 문항 — 바른 값(문제 글·그림에서 따로) · 보여 준 말의 결론 · 판정표 재료 · 보기 글 → 결론 */
function misreadFacts(q) {
  const B = bolds(q.q); const shown = B[B.length - 1] || ''; const F = figsOf(q.q); const fig = (k) => F.find((x) => x.kind === k);
  let m;
  const lastNum = (t) => { const mm = /(\d+)°(?:예요)?$/.exec(String(t).trim()); return mm ? +mm[1] : null; };
  const setOf = (t) => { const mm = /(?:예각|둔각)은 ((?:\d+°(?:, )?)+)예요$/.exec(String(t).trim()); return mm ? listOf(mm[1]).sort((x, y) => x - y).join(',') : null; };
  if ((m = /^([가나다])의 (변이 가장 기니까|호가 가장 크니까) \1가 가장 큰 각이에요$/.exec(shown))) {
    const items = angItems(fig('ang').arg);
    const name = (t) => { const mm = /([가나다])가 가장 큰 각이에요$/.exec(t); return mm ? mm[1] : null; };
    return { shown: m[1], right: extremeName(items, 'v', true), f: { kind: 'most', armPick: extremeName(items, 'arm', true), arcPick: extremeName(items, 'arc', true) }, tail: name };
  }
  if ((m = /^이 각은 (\d+)°예요$/.exec(shown)) && fig('prot')) {
    const R = readProt(figureSvg(`prot ${fig('prot').arg}`));
    if (R.lo === 0) return { shown: +m[1], right: R.hi, f: { kind: 'prot', A: R.hi }, tail: lastNum };
    return { shown: +m[1], right: R.hi - R.lo, f: { kind: 'zero', S: R.lo, E: R.hi }, tail: lastNum };
  }
  if ((m = /^((?:\d+°, )+\d+°) 중에서 (예각|둔각)은 ((?:\d+°(?:, )?)+)예요$/.exec(shown))) {
    const L = listOf(m[1]); const ac = L.filter((v) => v < 90).sort((x, y) => x - y); const ob = L.filter((v) => v > 90 && v < 180).sort((x, y) => x - y);
    const j = (xs) => xs.slice().sort((x, y) => x - y).join(',');
    const isAc = m[2] === '예각';
    return { shown: j(listOf(m[3])), right: j(isAc ? ac : ob), f: { kind: isAc ? 'setAc' : 'setOb', ac: j(ac), ob: j(ob), acWith90: j([...ac, 90]), obWith90: j([...ob, 90]) }, tail: setOf };
  }
  if ((m = /^이 각은 약 (\d+)°예요$/.exec(shown))) { const [it] = angItems(fig('ang').arg); return { shown: +m[1], right: it.v, f: { kind: 'near', A: it.v }, tail: (t) => { const mm = /약 (\d+)°예요$/.exec(t); return mm ? +mm[1] : null; } }; }
  if ((m = /^어림한 각도와 잰 각도의 차는 (\d+)°예요$/.exec(shown))) {
    const mm = /약 (\d+)°로 어림했고, 재어 보니 (\d+)°였어요/.exec(q.q); const [E, A] = [+mm[1], +mm[2]];
    return { shown: +m[1], right: Math.abs(E - A), f: { kind: 'diff', E, A }, tail: lastNum };
  }
  if ((m = /^각 ㄱㅇㄷ은 \d+° − \d+° = (\d+)°예요$/.exec(shown))) { const t = fig('fan').arg.split(/\s+/); return { shown: +m[1], right: +t[0] + +t[1], f: { kind: 'sum', a: +t[0], b: +t[1] }, tail: lastNum }; }
  if ((m = /^붙여 만든 각은 \d+° \+ \d+° = (\d+)°예요$/.exec(shown))) {
    const mm = /30°·60°·90° 삼각자의 (가장 작은 각|가장 큰 예각)과 45°·45°·90° 삼각자의 (한 예각|직각)/.exec(q.q);
    const a = mm[1] === '가장 작은 각' ? 30 : 60; const b = mm[2] === '직각' ? 90 : 45;
    return { shown: +m[1], right: a + b, f: { kind: 'set', a, b }, tail: lastNum };
  }
  if ((m = /^이 삼각형의 세 각의 크기의 합은 (\d+)°예요$/.exec(shown))) return { shown: +m[1], right: 180, f: { kind: 'measure' }, tail: lastNum };
  if ((m = /^각 ㄷ은 (\d+)° \+ (\d+)° = (\d+)°예요$/.exec(shown))) { const t = fig('tria').arg.split(/\s+/); assert.ok(t[2].startsWith('?')); return { shown: +m[3], right: 180 - +t[0] - +t[1], f: { kind: 'tri', known: [+t[0], +t[1]] }, tail: lastNum }; }
  if (/^삼각형이 4개니까 사각형의 네 각의 합은 180° × 4 = 720°예요$/.test(shown)) return { shown: 720, right: 360, f: { kind: 'four' }, tail: lastNum };
  if ((m = /^각 ㄹ은 \d+° \+ \d+° \+ \d+° = (\d+)°예요$/.exec(shown))) { const t = fig('quad').arg.split(/\s+/); const known = t.slice(0, 3).map(Number); return { shown: +m[1], right: 360 - known[0] - known[1] - known[2], f: { kind: 'quad', known }, tail: lastNum }; }
  if ((m = /^㉠은 .+ = (\d+)°예요$/.exec(shown))) {
    const kind = fig('tria') ? 'tria' : 'quad'; const fg = fig(kind);
    const t = fg.arg.replace(/ ext$/, '').split(/\s+/);
    const inner = Math.round(polyAngles(polyPts(figureSvg(`${kind} ${fg.arg}`)))[1]);
    const known = kind === 'tria' ? [+t[0], +t[2]] : [+t[0], +t[2], +t[3]];
    return { shown: +m[1], right: 180 - inner, f: { kind: kind === 'tria' ? 'triExt' : 'quadExt', known, inner }, tail: lastNum };
  }
  return null;
}
test('★ ② 오개념 문항: 보여 준 말은 정말 틀렸다 · 보여 준 틀린 답은 한 생각에만 맞다 · 고치는 말의 결론만 맞다 · 이름표 붙은 보기의 결론은 그 틀린 생각 · 갈래 열쇠 둘씩', () => {
  const keys = {}; let n = 0; let shownN = 0;
  for (const { c, s, q } of cached(['misread'], Math.max(SEEDS, 600))) {
    (keys[c.id] = keys[c.id] || new Set()).add(q.key);
    const at = `${c.id} #${s} ${q.key}`;
    const F = misreadFacts(q);
    assert.ok(F && F.right !== null && F.right !== undefined, `${at}: 못 읽는 ②\n${q.q}`);
    assert.notEqual(F.shown, F.right, `${at}: 보여 준 말이 맞다\n${q.q}`);
    const shownTags = ALL_TAGS.filter((tg) => tagHolds(F.f, F.right, tg, F.shown));
    assert.equal(shownTags.length, 1, `${at}: 보여 준 답 ${F.shown}에 맞는 틀린 생각 ${shownTags.length}개 ${shownTags.join(' · ')}\n${q.q}`);
    shownN++;
    const ok = q.choices.find((x) => x.ok);
    assert.equal(F.tail(ok.text), F.right, `${at}: 고치는 말 "${ok.text}"의 결론`);
    for (const w of q.choices.filter((x) => !x.ok)) {
      if (w.tag === '엉뚱한 지적') { assert.match(w.text, /(없어요|있어요|각도예요|알 수 없어요)$/, `${at}: 엉뚱한 지적 "${w.text}"`); continue; }
      if (w.tag === '틀린 줄 모름') { assert.equal(w.text, '맞게 말했어요'); continue; }
      const v = F.tail(w.text);
      assert.ok(v !== null && v !== F.right, `${at}: 오개념 보기 "${w.text}"의 결론 ${v}`);
      assert.ok(tagHolds(F.f, F.right, w.tag, v), `${at}: ② 보기 "${w.text}"의 이름표 "${w.tag}"가 뜻과 다르다\n${q.q}`);
      assert.equal(ALL_TAGS.filter((tg) => tagHolds(F.f, F.right, tg, v)).length, 1, `${at}: ② 보기 "${w.text}"가 두 생각에 맞다`);
      n++;
    }
  }
  for (const id of IDS) assert.equal(keys[id].size, 2, `${id}: ② 갈래 ${[...keys[id]]}`);
  assert.ok(n >= 600 * 5 && shownN === 8 * Math.max(SEEDS, 600), `본 ② 이름표 ${n}`);
});

// ───────────────────── 글 ─────────────────────

test('★ 조사: 수 뒤는 읽는 소리 · ° 뒤는 "도"(받침 없음 — 는·가·를·와·예요·로·였어요) · ㄱㅇㄷ 같은 자모 뒤는 받침 · ASCII 빼기 없음 · 칸 설명도', () => {
  const BAT = new Set(['0', '1', '3', '6', '7', '8']);
  const PAIRS = [['을', '를'], ['은', '는'], ['이', '가'], ['과', '와'], ['이에요', '예요']];
  let hitN = 0; let degN = 0;
  const look = (all, at) => {
    for (const [wb, nb] of PAIRS) {
      for (const m of all.matchAll(new RegExp(`(?<![\\d/])(\\d+)(${wb}|${nb})(?=[\\s.,!?)—:]|$)`, 'g'))) { assert.equal(m[2], BAT.has(m[1].slice(-1)) ? wb : nb, `${at}: "…${m[1]}${m[2]}"\n${all}`); hitN++; }
      for (const m of all.matchAll(new RegExp(`°(${wb}|${nb})(?=[\\s.,!?)—:]|$)`, 'g'))) { assert.equal(m[1], nb, `${at}: "…°${m[1]}"\n${all}`); degN++; }
      for (const m of all.matchAll(new RegExp(`ㄱㅇ[ㄴㄷ](${wb}|${nb})(?=[\\s.,!?)—:]|$)`, 'g'))) assert.equal(m[1], wb, `${at}: "…${m[0]}"`);
    }
    assert.ok(!/°(으로|이었어요|이었고)/.test(all), `${at}: ° 뒤 받침 조사\n${all}`);
    for (const m of all.matchAll(/(?<![\d/])(\d+)(으로|로)(?=[\s.,]|$)/g)) assert.equal(m[2], ['1', '7', '8'].includes(m[1].slice(-1)) ? '로' : BAT.has(m[1].slice(-1)) ? '으로' : '로', `${at}: "…${m[1]}${m[2]}"`);
    assert.ok(!/-\d|\d-/.test(all.replace(/\[[a-z]+ [^\]]+\]/g, '')), `${at}: ASCII 빼기`);
  };
  for (const { c, k, s, q } of cached(['calc', 'misread'], SEEDS)) look(allText(q).replace(/\*\*/g, '').replace(/\[[a-z]+ [^\]]+\]/g, ''), `${c.id} ${k} #${s}`);
  for (const c of ANGLE) look([c.name, c.idea, c.rule, c.slip].join('\n').replace(/\*\*/g, ''), `${c.id} 설명`);
  assert.ok(hitN > SEEDS && degN > 5 * SEEDS, `실제로 본 곳: 수 ${hitN} · ° ${degN}`);
});

test('★ 풀이 카드: 단계 · 기억할 것 · 오답마다 왜 · 정답이 단계에 나온다', () => {
  for (const { c, k, s, q } of cached(['calc', 'misread'], SEEDS)) {
    const sv = q.solve;
    assert.ok(sv && sv.steps.length >= 2 && sv.rule, `${c.id} ${k} #${s}`);
    for (const w of q.choices.filter((x) => !x.ok)) assert.ok(sv.why[w.tag] || sv.whyAny, `${c.id} ${k} #${s}: "${w.tag}" 설명 없음`);
    const ok = q.choices.find((x) => x.ok).text;
    if (k === 'calc') assert.ok(sv.steps.join(' ').includes(ok), `${c.id} #${s}: 정답 "${ok}"이 풀이에 없다\n${sv.steps.join('\n')}`);
  }
});

/** 글 속 "식 = 식" — 각도(°)·자연수 + − × (보여 준 말·오답 보기는 빼고) */
function eqChains(text) {
  const out = [];
  const ev = (src) => {
    const s = src.replace(/°/g, '').trim();
    if (!/^[\d +−×]+$/.test(s)) return null;
    const terms = s.split(/ ([+−]) /);
    const prod = (t) => t.split(' × ').reduce((a, x) => (a === null || !/^\d+$/.test(x.trim()) ? null : a * +x), 1);
    let v = prod(terms[0]);
    for (let i = 1; i < terms.length; i += 2) { const p = prod(terms[i + 1]); if (v === null || p === null) return null; v = terms[i] === '+' ? v + p : v - p; }
    return v;
  };
  for (const m of String(text).matchAll(/(?<![+−×] |[\d.])\d(?:[\d°+−×= ])*\d°?/g)) {
    const parts = m[0].split(' = ').map((x) => x.trim());
    if (parts.length < 2) continue;
    const vals = parts.map(ev);
    for (let i = 1; i < vals.length; i++) if (vals[i - 1] !== null && vals[i] !== null) out.push({ a: parts[i - 1], b: parts[i], ok: vals[i - 1] === vals[i] });
  }
  return out;
}
test('★ 글 속 셈식은 맞다 — 문제·정답·풀이·왜 · 칸 설명도', () => {
  let n = 0;
  for (const { c, k, s, q } of cached(['calc', 'misread'], SEEDS)) {
    // ② 보여 준 말(굵게)과 오답 보기는 일부러 틀린 셈 — 빼고
    const all = [q.q.replace(/\*\*.+?\*\*/g, ''), q.choices.find((x) => x.ok).text, ...q.solve.steps, ...Object.values(q.solve.why), q.solve.whyAny].join('\n');
    for (const e of eqChains(all)) { assert.ok(e.ok, `${c.id} ${k} #${s}: ${e.a} = ${e.b}`); n++; }
  }
  assert.ok(n > 3 * SEEDS, `셈식 ${n}`);
  let m = 0;
  for (const c of ANGLE) for (const e of eqChains(`${c.idea}\n${c.rule}`.replace(/\*\*/g, ''))) { assert.ok(e.ok, `${c.id} 설명: ${e.a} = ${e.b}`); m++; }
  assert.ok(m >= 2, `칸 설명 셈식 ${m}`);
  assert.deepEqual(eqChains('180° − 45° − 60° = 75°').map((e) => e.ok), [true]);
  assert.deepEqual(eqChains('180° × 4 = 720°').map((e) => e.ok), [true]);
  assert.deepEqual(eqChains('85° − 40° = 55°').map((e) => e.ok), [false], '틀린 셈은 잡는다');
});

test('🔁 쌍둥이·🤔 노트: 요청한 틀·갈래로 온다 · 같은 셈 · 틀 글(수 빼고)이 같다 · 쌍둥이가 원래 문제와 똑같은 일은 드물다', () => {
  const norm = (t) => tplKey(String(t));
  for (const c of ANGLE) {
    let same = 0; let n = 0;
    for (let s = 1; s <= Math.min(Math.max(SEEDS, 150), 300); s++) {
      const q = makeQuestion(c.id, 'calc', s, OPTS);
      assert.ok(q.key, `${c.id} #${s}: 열쇠 없음`);
      const tw = makeQuestion(c.id, 'calc', s + 99991, { ...OPTS, want: { k: 'calc', key: q.key } });
      assert.equal(tw.key, q.key, `${c.id} #${s}: 쌍둥이가 다른 틀\n${q.q}\n---\n${tw.q}`);
      assert.equal(solveText(tw.q, tw.choices).type, solveText(q.q, q.choices).type, `${c.id} #${s}: 쌍둥이가 다른 셈`);
      if (!/\{/.test(q.key)) assert.equal(norm(tw.q), norm(q.q), `${c.id} #${s}: 틀 글이 다르다\n${q.q}\n---\n${tw.q}`);
      const sig = (x) => `${x.q}|${x.choices.map((ch) => ch.text).sort().join('|')}`;
      if (sig(tw) === sig(q)) same++;
      n++;
      const m = makeQuestion(c.id, 'misread', s, OPTS);
      const mt = makeQuestion(c.id, 'misread', s + 99991, { ...OPTS, want: { k: 'misread', key: m.key } });
      assert.equal(mt.key, m.key, `${c.id} #${s}: ② 갈래`);
    }
    assert.ok(same <= n * 0.3, `${c.id}: 쌍둥이가 원래와 똑같은 문제 ${same}/${n}`);
  }
});

test('🔁 틀마다 열쇠는 하나 — 칸마다 열쇠는 틀 수 이하 · 한 열쇠의 문제는 같은 틀 글(수 빼고)', () => {
  const MAXK = { 'ang.tri': 6 };
  for (const c of ANGLE) {
    const byKey = {};
    for (let s = 1; s <= SEEDS; s++) { const q = makeQuestion(c.id, 'calc', s, OPTS); (byKey[q.key] = byKey[q.key] || new Set()).add(tplKey(q.q)); }
    const keys = Object.keys(byKey);
    assert.ok(keys.length <= (MAXK[c.id] || 4), `${c.id}: 열쇠 ${keys.length}개`);
    // 출연진 자리({mon})가 든 틀은 이름이 채워져 글이 바뀐다 — 열쇠만 본다
    for (const [k, texts] of Object.entries(byKey)) if (!/\{/.test(k)) assert.equal(texts.size, 1, `${c.id}: 열쇠 "${k}"에 틀 글 ${texts.size}가지`);
  }
});

/** 참이라고 내미는 글에 틀린 말 — 오답 보기·② 보여 준 말은 빼고 */
const BAD = [
  [/변이 길(?:면|수록) (?:더 )?큰 각/, '변의 길이는 각의 크기와 상관없다'],
  [/호가 크(?:면|수록) (?:더 )?큰 각/, '호의 크기는 각의 크기와 상관없다'],
  [/90°(?:는|도) (?:예각|둔각)(?!일까|도 둔각도)/, '90°는 직각 (묻는 말 "…일까"는 빼고)'],
  [/180°(?:는|도) 둔각(?!이 아니|이야\?|일까)/, '둔각은 180°보다 작다 (묻는 말은 빼고)'],
  [/직각보다 큰 각(?:은|이) (?:모두 |늘 )?둔각/, '180°보다 작아야 둔각 — 조건 없는 일반 문장'],
  [/삼각형마다 (?:세 각의 합이 )?달라/, '삼각형의 세 각의 합은 늘 180°'],
  [/(?:사각형의 네 각의 합은|사각형은) 180°/, '사각형은 360°'],
  [/삼각형의 세 각의 합은 (?:늘 )?360°/, '삼각형은 180°'],
  [/(?:늘|언제나|항상) (?:바깥쪽|안쪽) 눈금/, '0이 있는 쪽 눈금을 읽는다 — 늘 한쪽 눈금이 아니다'],
];
test('★ 참말에 틀린 말이 없다 — 변·호로 비교 · 90°·180° · 조건 없는 둔각 · 세 각의 합 · 눈금', () => {
  const truths = (q) => [q.choices.find((x) => x.ok).text, ...(q.solve ? [...q.solve.steps, ...Object.values(q.solve.why), q.solve.whyAny, q.solve.rule] : [])].join('\n').replace(/\*\*/g, '');
  for (const { c, k, s, q } of cached(['calc', 'misread'], SEEDS)) for (const [re, why] of BAD) assert.ok(!re.test(truths(q)), `${c.id} ${k} #${s}: ${why}\n${truths(q)}`);
  for (const c of ANGLE) for (const [re, why] of BAD) assert.ok(!re.test([c.idea, c.rule, c.slip].join('\n').replace(/\*\*/g, '')), `${c.id}: ${why}`);
});

// 아직 안 배운 말 — 각도(°)·각도기는 Z2부터, 예각·둔각은 Z3부터, 어림은 Z4부터, 일직선은 Z6부터 (보기·풀이까지, 그림 지시문은 빼고)
// 4-2에서 배우는 말(대각선·이등변·…삼각형 이름)과 지도서가 쓰지 말라는 "내각"은 어느 칸에도
const FIRST = [[/\d+°|\d+도(?![가-힣])|각도기|1도/, 'ang.measure'], [/예각|둔각/, 'ang.acute'], [/어림/, 'ang.estimate'], [/일직선/, 'ang.tri']];
const NEVER = /대각선|내각|이등변|정삼각형|직각삼각형|예각삼각형|둔각삼각형|평행/;
test('★ 아직 안 배운 말을 앞 칸에 쓰지 않는다 — ° Z2부터 · 예각·둔각 Z3부터 · 어림 Z4부터 · 일직선 Z6부터 · 4-2 말·내각은 어디에도', () => {
  const idx = (id) => IDS.indexOf(id);
  for (const c of ANGLE) {
    const own = `${c.name} ${c.idea} ${c.rule} ${c.slip}`;
    for (const [re, at] of FIRST) if (idx(at) > idx(c.id)) assert.ok(!re.test(own), `${c.id}: 설명에 ${re}`);
    assert.ok(!NEVER.test(own), `${c.id}: 설명에 ${NEVER}`);
  }
  for (const { c, k, s, q } of cached(['calc', 'misread'], SEEDS)) {
    const all = allText(q).replace(/\[[a-z]+ [^\]]+\]/g, '');
    for (const [re, at] of FIRST) if (idx(at) > idx(c.id)) assert.ok(!re.test(all), `${c.id} ${k} #${s}: 아직 안 배운 ${re}\n${all}`);
    assert.ok(!NEVER.test(all), `${c.id} ${k} #${s}: ${NEVER}\n${all}`);
  }
});

// ───────────────────── 그림 ─────────────────────

test('🎨 [ang] 각: 그린 두 변이 이루는 각 = 지시문의 각도 · 변 길이·호 반지름 = 지시문 · 90°는 직각 표시 · 이름 · 못 그리는 지시문은 빈 그림 · 글로 바꾸기', () => {
  let n = 0;
  const check = (arg) => {
    const items = angItems(arg); const got = measureAng(figureSvg(`ang ${arg}`));
    assert.equal(got.length, items.length, arg);
    items.forEach((it, i) => {
      const g = got[i];
      assert.equal(g.name, it.name, `${arg}: 이름 순서`);
      assert.ok(Math.abs(g.v - it.v) < 0.2, `${arg}: ${it.name} 잰 각 ${g.v.toFixed(2)} ≠ ${it.v}`);
      for (const L of g.arm) assert.ok(Math.abs(L - it.arm) < 0.2, `${arg}: 변 ${L} ≠ ${it.arm}`);
      if (it.v === 90) assert.ok(g.right && g.arc === null, `${arg}: 직각 표시`); else assert.equal(g.arc, it.arc, `${arg}: 호 ${g.arc}`);
      n++;
    });
  };
  for (const a of ['가:60/120/16@0 나:45/60/34@30', '가:70/60/16@5 나:40/125/16@0 다:50/85/40@10', '65/85/16@40', '가:130/80/16@20 나:90/80/16@50 다:35/80/16@10', '175/130/44@180', '5/50/12@0']) check(a);
  for (const { q } of cached(['calc', 'misread'], SEEDS)) for (const f of figsOf(q.q)) if (f.kind === 'ang') check(f.arg);
  for (const bad of ['ang 가:60/120/16 가:45/60/16', 'ang 가:60/120/16 45/60/16', 'ang 60/120/16 45/60/16', 'ang 180/80/16', 'ang 60/140/16', 'ang 60/60/44', 'ang 60/80/9', 'ang 가:60/80/16 나:60/80/16 다:60/80/16 가:1/80/16', 'ang']) assert.equal(figureSvg(bad), '', bad);
  assert.equal(figText('[ang 가:60/120/16@0 나:45/60/34@30]'), '(각 그림: 가 60°(변 120·호 16) · 나 45°(변 60·호 34))');
  assert.equal(figText('[ang 65/85/16@40]', true), '(각 그림)');
  assert.ok(renderFigures('[ang 65/85/16@40]').startsWith('<svg'));
  assert.ok(n > 2 * SEEDS, `잰 각 ${n}`);
});

test('🎨 [ang] 이름 둘·셋은 각 아래 제자리 — 이름 글자가 서로 안 겹치고, 제 각의 가로 폭 안에', () => {
  for (const { q } of cached(['calc', 'misread'], SEEDS)) {
    for (const f of figsOf(q.q)) {
      if (f.kind !== 'ang' || !/[가나다]:/.test(f.arg)) continue;
      const svg = figureSvg(`ang ${f.arg}`);
      const groups = [...svg.matchAll(/<g class="ang-a"[^>]*>(.*?)<\/g>/g)].map((m) => {
        const xs = [...m[1].matchAll(/<line class="ang-ray"([^>]*)\/>/g)].flatMap((x) => { const a = attrs(x[1]); return [num(a.x1), num(a.x2)]; });
        const nm = /<text class="ang-name" x="([-\d.]+)"/.exec(m[1]);
        return { x0: Math.min(...xs), x1: Math.max(...xs), nx: +nm[1] };
      });
      groups.forEach((g, i) => {
        assert.ok(g.nx >= g.x0 - 16 && g.nx <= g.x1 + 16, `${f.raw}: ${i}번 이름이 제 각 밖`);
        if (i) assert.ok(g.nx - groups[i - 1].nx > 30 && g.x0 > groups[i - 1].x1, `${f.raw}: 이름·각이 겹침`);
      });
    }
  }
});

test('🎨 [prot] 각도기: 두 변 = 지시문의 눈금 · 바깥쪽 수는 왼쪽이 0, 안쪽 수는 오른쪽이 0(제자리) · 변이 지나는 자리의 수가 그 각도 · 글로 바꾸기', () => {
  for (const arg of ['0 75', '0 75 left', '20 95', '0 140', '0 30 left', '0 15', '0 165 left', '35 175']) {
    const svg = figureSvg(`prot ${arg}`); const P = measureProt(svg); const [a, b] = arg.split(' ').map(Number); const left = / left$/.test(arg);
    assert.equal(P.left, left);
    assert.deepEqual(P.arms.map((x) => x.v), [a, b]);
    for (const arm of P.arms) {
      assert.ok(Math.abs(arm.x1 - 200) < 0.01 && Math.abs(arm.y1 - 206) < 0.01, `${arg}: 꼭짓점이 각도기 중심이 아님`);
      assert.ok(Math.abs((left ? 180 - arm.phi : arm.phi) - arm.v) < 0.2, `${arg}: 변 ${arm.v}의 방향 ${arm.phi.toFixed(2)}`);
    }
    // 눈금 수 — 바깥쪽 v는 180 − v 방향, 안쪽 v는 v 방향 (글자 중심을 재므로 밑금 근처는 조금 흔들린다)
    for (const nm of P.nums) {
      const want = nm.ring === 'out' ? 180 - nm.v : nm.v;
      assert.equal(nm.t, nm.v);
      if (want > 10 && want < 170) assert.ok(Math.abs(nm.phi - want) < 1.5, `${arg}: ${nm.ring} ${nm.v} 자리 ${nm.phi.toFixed(1)}`);
    }
    assert.equal(P.nums.filter((x) => x.ring === 'out').length, 19);
    assert.equal(P.nums.filter((x) => x.ring === 'in').length, 19);
    // 변이 지나는 자리의 수: 0에서 시작한 쪽 눈금(오른쪽 0 = 안쪽)의 가장 가까운 수는 그 각도에서 5 이내
    const ring = left ? 'out' : 'in';
    const arm = P.arms[1]; const near = P.nums.filter((x) => x.ring === ring).sort((x, y) => Math.abs(x.phi - arm.phi) - Math.abs(y.phi - arm.phi))[0];
    assert.ok(Math.abs(near.v - b) <= 5, `${arg}: 변 옆의 ${ring} 수 ${near.v}`);
  }
  for (const bad of ['prot 0 77', 'prot 0 185', 'prot 70 95', 'prot 30 35', 'prot 0', 'prot 0 75 right']) assert.equal(figureSvg(bad), '', bad);
  assert.equal(figText('[prot 0 75]'), '(각도기 위의 각: 한 변은 안쪽 눈금 0(밑금), 다른 변은 안쪽 눈금 75·바깥쪽 눈금 105)');
  assert.equal(figText('[prot 0 75 left]', true), '(각도기)');
  // 각도기 수 글자 — 폰(318px로 줄어듦)에서도 9.5px 넘게 (Codex 40차 #6과 같은 잣대)
  const sizes = [...figureSvg('prot 0 75').matchAll(/class="prot-n"[^>]*font-size="(\d+)"/g)].map((m) => +m[1]);
  assert.ok(Math.min(...sizes) * (318 / 400) >= 9.5, `각도기 수 글자 ${Math.min(...sizes)}`);
});

test('🎨 [fan] 이어 붙인 각: 변의 방향 = 지시문 조각을 차례로 더한 각 · 각도 이름표는 제 조각 안 · 일직선(180)·한 바퀴(360) · 이름 ㅇ·ㄱ·ㄴ·ㄷ · 글로 바꾸기', () => {
  let n = 0;
  const check = (arg) => {
    const toks = arg.split(/\s+/).filter((t) => t !== 'names'); const vs = toks.map((t) => +t.replace(/^[?_]/, ''));
    const cum = [0]; for (const v of vs) cum.push(cum[cum.length - 1] + v);
    const M = measureFan(figureSvg(`fan ${arg}`));
    const want = cum[cum.length - 1] === 360 ? cum.slice(0, -1) : cum;
    assert.equal(M.dirs.length, want.length, `${arg}: 변 수`);
    M.dirs.forEach((d, i) => assert.ok(Math.abs(d - want[i]) < 0.2, `${arg}: ${i}번 변 ${d.toFixed(2)} ≠ ${want[i]}`));
    for (const lb of M.labs) {
      const a = deg(Math.atan2(-(lb.y - 5 - M.v[1]), lb.x - M.v[0])); const aa = a < -0.5 ? a + 360 : a;
      assert.ok(aa > cum[lb.i] + 2 && aa < cum[lb.i + 1] - 2, `${arg}: ${lb.t} 이름표가 제 조각 밖 (${aa.toFixed(1)})`);
      const tk = toks[lb.i];
      assert.equal(lb.t, tk.startsWith('?') ? '?' : `${vs[lb.i]}°`);
      n++;
    }
    assert.ok(!M.labs.some((lb) => toks[lb.i].startsWith('_')), `${arg}: _ 조각에 이름표`);
  };
  for (const a of ['40 ?35 _25 names', '50 70 ?60', '80 95 110 ?75', '45 ?75 names', '20 20 20 20 20', '175 175']) check(a);
  for (const { q } of cached(['calc', 'misread'], SEEDS)) for (const f of figsOf(q.q)) if (f.kind === 'fan') check(f.arg);
  for (const bad of ['fan 15 30', 'fan 200 40', 'fan 180 181', 'fan ?40 ?50', 'fan 100 100 100 100', 'fan 180 180 names', 'fan']) assert.equal(figureSvg(bad), '', bad);
  assert.equal(figText('[fan 40 ?35 names]'), '(이어 붙인 각: 각 ㄱㅇㄴ 40° · 각 ㄴㅇㄷ ?)');
  assert.equal(figText('[fan 50 70 ?60]'), '(이어 붙인 각: 50° · 70° · ? — 일직선)');
  assert.ok(n > 2 * SEEDS, `본 이름표 ${n}`);
  const names = [...figureSvg('fan 40 35 names').matchAll(/class="fan-name"[^>]*>([^<]+)</g)].map((m) => m[1]);
  assert.deepEqual(names, ['ㅇ', 'ㄱ', 'ㄴ', 'ㄷ']);
});

test('🎨 ext ㉠: 늘인 선은 변 ㄱㄴ과 한 직선 · ㉠ 이름표는 늘인 선과 변 ㄴㄷ 사이(도형 밖) · 각 ㄴ이 보이는 꼴은 못 그림 · 글로 바꾸기', () => {
  const check = (spec) => {
    const svg = figureSvg(spec); const pts = polyPts(svg);
    const ext = attrs(/<line class="ext-line"([^>]*)\/>/.exec(svg)[1]);
    const lab = /<text class="ext-lab" x="([-\d.]+)" y="([-\d.]+)"[^>]*>㉠<\/text>/.exec(svg);
    assert.ok(lab, `${spec}: ㉠ 없음`);
    const B = pts[1]; const A = pts[0]; const C = pts[2];
    assert.ok(Math.hypot(num(ext.x1) - B[0], num(ext.y1) - B[1]) < 0.2, `${spec}: 늘인 선이 ㄴ에서 시작하지 않음`);
    const u = [num(ext.x2) - B[0], -(num(ext.y2) - B[1])]; const ab = [B[0] - A[0], -(B[1] - A[1])];
    assert.ok(between(u, ab) < 0.3, `${spec}: 늘인 선이 변 ㄱㄴ과 한 직선이 아님`);
    const inner = polyAngles(pts)[1];
    assert.ok(Math.abs(between(u, [C[0] - B[0], -(C[1] - B[1])]) - (180 - inner)) < 0.3, `${spec}: ㉠ 자리의 각`);
    // ㉠ 이름표 방향이 늘인 선과 변 ㄴㄷ 사이
    const L = [+lab[1] - B[0], -((+lab[2] - 6) - B[1])];
    const t1 = between(L, u); const t2 = between(L, [C[0] - B[0], -(C[1] - B[1])]);
    assert.ok(Math.abs(t1 + t2 - (180 - inner)) < 1, `${spec}: ㉠ 이름표가 그 각 밖`);
  };
  for (const s of ['tria 50 _70 60 ext', 'tria 30 _40 110 ext', 'quad 60 _105 80 115 ext', 'quad 95 _70 110 85 ext']) check(s);
  for (const { q } of cached(['calc', 'misread'], SEEDS)) for (const f of figsOf(q.q)) if (/ ext$/.test(f.arg)) check(`${f.kind} ${f.arg}`);
  for (const bad of ['tria 50 70 60 ext', 'quad 60 105 80 115 ext', 'tria 50 _70 60 iso ext']) assert.equal(figureSvg(bad), '', bad);
  assert.equal(figText('[tria 50 _70 60 ext]'), '(삼각형 세 각 ㄱ 50° · ㄷ 60° · 변 ㄱㄴ을 늘인 직선과 변 ㄴㄷ이 이루는 각 ㉠)');
  // 옛 지시문은 그대로
  assert.equal(figText('[tria 50 60 ?70]'), '(삼각형 세 각 ㄱ 50° · ㄴ 60° · ㄷ ?)');
  assert.equal(figText('[quad 80 95 110 ?75]'), '(사각형 네 각 ㄱ 80° · ㄴ 95° · ㄷ 110° · ㄹ ?)');
});

test('🎨 도형·이어 붙인 각 그림의 각 = 지시문의 각 (J 테스트처럼 그린 꼭짓점에서 잰다)', () => {
  let n = 0;
  for (const { q } of cached(['calc', 'misread'], SEEDS)) {
    for (const f of figsOf(q.q)) {
      if (f.kind !== 'tria' && f.kind !== 'quad') continue;
      const want = f.arg.replace(/ ext$/, '').split(/\s+/).map((t) => +t.replace(/^[?_]/, ''));
      const got = polyAngles(polyPts(figureSvg(`${f.kind} ${f.arg}`)));
      want.forEach((v, i) => assert.ok(Math.abs(got[i] - v) < 0.2, `${f.raw}: ${i}번 각 ${got[i].toFixed(2)} ≠ ${v}`));
      n++;
    }
  }
  assert.ok(n > SEEDS, `잰 도형 ${n}`);
});

// 3단계 헤드리스(Z8 진단): 각 ㄴ이 작은 사각형에서 변 ㄷㄹ이 짧게 그려져 "95°"와 "115°"가 겹쳤다 — 같은 그림 코드를 쓰는 J 사각형도 함께 본다
test('🎨 사각형 그림의 글자: 꼭짓점 이름·각도·㉠ 글자끼리 겹치지 않고 4px 넘게 떨어진다 · 각도 글자에서 가장 가까운 꼭짓점이 그 각도의 꼭짓점 (Z·J 문항·원고)', async () => {
  const J = await import('../js/mathshape.js');
  const specs = new Map();
  const add = (t, where) => { for (const m of String(t).matchAll(/\[(quad [^\]]+)\]/g)) if (!specs.has(m[1])) specs.set(m[1], where); };
  const walk = (v, where) => { if (typeof v === 'string') add(v, where); else if (v && typeof v === 'object') for (const x of Object.values(v)) walk(x, where); };
  const NS = Math.max(SEEDS, 300); // 겹침은 Z8 사각형 스무 개 중 하나꼴 — 씨앗을 줄여 돌려도(변이 검사) 300개는 본다
  for (const { c, k, s, q } of cached(['calc', 'misread'], NS)) walk(q, `${c.id} ${k} #${s}`);
  for (const c of J.SHAPE) for (const k of ['calc', 'misread']) for (let s = 1; s <= NS; s++) { let q = null; try { q = J.makeQuestion(c.id, k, s, OPTS); } catch { q = null; } if (q) walk(q, `${c.id} ${k} #${s}`); }
  for (const f of ['angle.json', 'shape.json']) walk(JSON.parse(readFileSync(new URL(`../coach/math/${f}`, import.meta.url), 'utf8')), f);
  // 글자 폭 어림 (15px: 숫자 ≈ 8.2px, 한글·자모·㉠ ≈ 15px, ° ≈ 6px) — 글꼴 크기에 비례
  const wOf = (t, fs) => [...t].reduce((a, ch) => a + (/[ㄱ-ㅎ가-힣㉠-㉯°]/.test(ch) ? (ch === '°' ? 6 : 15) : 8.2), 0) * fs / 15;
  const gapOf = (a, b) => Math.max(0, a.x0 - b.x1, b.x0 - a.x1, a.y0 - b.y1, b.y0 - a.y1);
  let n = 0; let ext = 0; let minGap = Infinity;
  for (const [spec, where] of specs) {
    const svg = figureSvg(spec);
    if (!svg) continue;
    const V = polyPts(svg);
    const T = [...svg.matchAll(/<text([^>]*)>([^<]*)<\/text>/g)].map((m) => {
      const a = m[1]; const x = +/ x="([-\d.]+)"/.exec(a)[1]; const y = +/ y="([-\d.]+)"/.exec(a)[1]; const fs = +/font-size="([\d.]+)"/.exec(a)[1];
      const w = wOf(m[2], fs); return { t: m[2], cx: x, cy: y - fs * 0.3, x0: x - w / 2, x1: x + w / 2, y0: y - fs * 0.75, y1: y + fs * 0.2 };
    });
    for (let i = 0; i < T.length; i++) for (let j = i + 1; j < T.length; j++) {
      const g = gapOf(T[i], T[j]); minGap = Math.min(minGap, g);
      assert.ok(g > 4, `${spec} (${where}): "${T[i].t}"와 "${T[j].t}" 사이 ${g.toFixed(1)}px`);
    }
    // 꼭짓점마다 보여야 할 글자 — "65"는 65°, "?65"는 ?, "_65"는 글자 없음
    const want = spec.split(' ').slice(1).filter((x) => /^[?_]?\d+$/.test(x)).map((x) => (x[0] === '?' ? '?' : x[0] === '_' ? null : `${x}°`));
    for (const lab of T.filter((x) => /°$|^\?$/.test(x.t))) {
      const d = V.map((p) => Math.hypot(p[0] - lab.cx, p[1] - lab.cy));
      assert.equal(want[d.indexOf(Math.min(...d))], lab.t, `${spec} (${where}): "${lab.t}"에서 가장 가까운 꼭짓점의 각이 다르다`);
    }
    n++; if (/ ext$/.test(spec)) ext++;
  }
  assert.ok(n > 500 && ext > 200, `본 사각형 ${n} · ㉠ ${ext} · 가장 좁은 틈 ${minGap.toFixed(1)}px`);
});

// ───────────────────── 사다리·진단·칸마다 꼴 ─────────────────────

test('📏 진단·사다리·한 편·배움 예비·내용 검사', () => {
  const d = diagnosticSet(7, 5, OPTS);
  assert.equal(d.length, 5);
  assert.ok(d.every((q) => IDS.includes(q.concept)));
  const pl = placeFrom(d.map((q, i) => ({ concept: q.concept, correct: i < 2 })));
  assert.ok(IDS.includes(pl.startId) && pl.knownIds.every((id) => IDS.indexOf(id) < IDS.indexOf(pl.startId)));
  const L0 = ladder([]);
  assert.equal(L0[0].state, 'now');
  assert.ok(L0.slice(1).every((r) => r.state === 'locked'));
  for (const c of ANGLE) {
    const round = makeRound(c.id, 11, OPTS);
    assert.ok(round.length >= 2 && round.every((q) => q.concept === c.id), c.id);
    const les = lessonOf(c.id, 3, OPTS);
    assert.ok(les.pages.length >= 1 && les.title === c.name);
  }
  assert.ok(checkContent({}).length >= 8, '빈 원고는 칸마다 걸린다');
});

test('칸마다 꼴 — 나와야 하는 문제 종류 · 각은 180° 이하(사각형 각의 합·틀린 셈 빼고) · Z4 어림 보기끼리 30° 이상', () => {
  const shapes = {};
  for (const { c, s, q } of cached(['calc'], SEEDS)) {
    const sv = solveText(q.q, q.choices);
    shapes[`${c.id}:${sv.type}`] = (shapes[`${c.id}:${sv.type}`] || 0) + 1;
    for (const f of figsOf(q.q)) if (f.kind === 'ang') for (const it of angItems(f.arg)) assert.ok(it.v <= 175 && it.v % 5 === 0, `${c.id} #${s}: 그림 각 ${it.v}`);
    if (sv.type === 'near') { const vs = q.choices.map((x) => valOf(x.text)).sort((x, y) => x - y); for (let i = 1; i < vs.length; i++) assert.ok(vs[i] - vs[i - 1] >= 30, `${c.id} #${s}: 어림 보기 ${vs}`); }
    if (typeof sv.ans === 'number' && !['pair', 'count'].includes(sv.type)) assert.ok(sv.ans > 0 && sv.ans <= 180, `${c.id} #${s}: 답 ${sv.ans}`);
  }
  for (const k of ['ang.compare:max', 'ang.compare:min', 'ang.compare:same', 'ang.measure:protR', 'ang.measure:protL', 'ang.acute:pickOb', 'ang.acute:pickAc', 'ang.acute:count', 'ang.acute:figOb', 'ang.estimate:near', 'ang.estimate:diff', 'ang.addsub:sum', 'ang.addsub:sub', 'ang.addsub:joined', 'ang.addsub:rest', 'ang.tri:tria', 'ang.tri:triCut', 'ang.tri:triWords', 'ang.quad:quad', 'ang.quad:quadCut', 'ang.quad:quadWords', 'ang.quad:pair', 'ang.apply:triExt', 'ang.apply:quadExt']) assert.ok(shapes[k], `나와야 하는 꼴 ${k}`);
});

// ───────────────────── 2단계: 원고 (coach/math/angle.json) ─────────────────────
// 확인 질문은 생성기와 같은 문제 꼴로 써서 위의 solveText가 따로 푼다(원고에만 있는 꼴은 solveContent) — 오답은 위의 tagHolds로 한 생각에만 맞는지.
// 각도 원고는 그림이 많다 → 그림 지시문이 그려지는지, 글이 말하는 각도가 그 그림의 각도인지 대조한다.

const CONTENT = JSON.parse(readFileSync(new URL('../coach/math/angle.json', import.meta.url), 'utf8'));
const CAST = { me: '진우', mon: '피카츄', mon2: '리자몽' };
const fillC = (t) => String(t).replace(/\{(me|mon|mon2)(?:\/([^/}]+)\/([^}]+))?\}/g, (_, k, a, b) => {
  const n = CAST[k]; if (a === undefined) return n;
  const code = n.slice(-1).charCodeAt(0) - 0xac00; return n + (code >= 0 && code % 28 !== 0 ? a : b);
});
/** 원고 한 칸의 글 전부 (배움·확인 질문·보기·까닭·규칙·아빠 카드) */
const contentText = (v) => fillC([...v.lesson.flatMap((p) => [p.say, p.check.q, p.check.ok, ...p.check.no, p.check.why]), v.rule, v.dad.goal, ...v.dad.say, v.dad.do, v.dad.pass, ...v.dad.traps.flatMap((t) => [t.kid, t.dad])].join('\n'));
/** 참이라고 내미는 글 — 배움 글·확인의 정답·까닭·규칙·아빠 카드 (오답 보기·아이 말(함정 kid)은 빼고) */
const truthText = (v) => fillC([...v.lesson.flatMap((p) => [p.say, p.check.ok, p.check.why]), v.rule, v.dad.goal, ...v.dad.say, v.dad.do, v.dad.pass, ...v.dad.traps.map((t) => t.dad)].join('\n'));
/** 셈식을 보는 글 블록 — 아이 말·오답 보기는 빼고 */
const blocksOf = (v) => [...v.lesson.flatMap((p) => [p.say, p.check.why]), v.rule, v.dad.goal, ...v.dad.say, v.dad.do, v.dad.pass, ...v.dad.traps.map((t) => t.dad)].map(fillC);
const FIGS = /\[[a-z]+ [^\]]+\]/g;
/** 받아올림·받아내림 실수 — 합과 차 칸 원고의 셈 보기에만 (생성기 이름표는 아니다: 각도의 오개념이 아니라 셈 실수) */
const CALC = '받아올림·받아내림 실수';
function calcSlip(f, ans, wv) {
  const noBorrow = (a, b) => (Math.floor(a / 10) - Math.floor(b / 10)) * 10 + Math.abs((a % 10) - (b % 10));
  if (f.kind === 'sum') return (f.a % 10) + (f.b % 10) >= 10 && wv === ans - 10;
  if (f.kind === 'sub') return f.a % 10 < f.b % 10 && wv === noBorrow(f.a, f.b);
  if (f.kind === 'diff') { const [hi, lo] = f.A > f.E ? [f.A, f.E] : [f.E, f.A]; return hi % 10 < lo % 10 && wv === noBorrow(hi, lo); }
  return false;
}
const thoughtsOf = (f, ans, wv) => [...ALL_TAGS.filter((tg) => tagHolds(f, ans, tg, wv)), ...(calcSlip(f, ans, wv) ? [CALC] : [])];
/** 원고에만 있는 문제 틀 (생성기 틀은 solveText가 읽는다) */
function solveContent(q, choices = []) {
  const sv = solveText(q, choices);
  if (sv.type !== 'unknown') return sv;
  let m;
  const F = figsOf(q); const fig = (k) => F.find((x) => x.kind === k);
  if ((m = /각도기의 0에 맞추지 않고 재었어요\. 한 변이 (\d+)[을를], 다른 변이 (\d+)[을를] 지나요\. 이 각은 몇 도일까요\?/.exec(q))) {
    const R = readProt(figureSvg(`prot ${fig('prot').arg}`));
    assert.deepEqual([R.lo, R.hi], [+m[1], +m[2]], `${q}: 글의 눈금과 그림의 눈금`);
    return { type: 'zero', ans: R.hi - R.lo, f: { kind: 'zero', S: R.lo, E: R.hi } };
  }
  if ((m = /각 ㄱㅇㄹ은 (\d+)°예요\. 각 ㄴㅇㄷ은 몇 도일까요\?/.exec(q))) {
    const t = fig('fan').arg.split(/\s+/).filter((x) => x !== 'names');
    assert.ok(t.length === 3 && t[1].startsWith('?'), `${q}: 세 조각 · 가운데가 ?`);
    const known = [+t[0], +t[2]]; const Wv = +m[1];
    assert.equal(Wv, known[0] + known[1] + +t[1].slice(1), `${q}: 각 ㄱㅇㄹ이 그림의 세 조각의 합이 아님`);
    return { type: 'rest3', ans: Wv - known[0] - known[1], f: { kind: 'rest3', W: Wv, known } };
  }
  if ((m = /30°·60°·90° 삼각자의 (가장 작은 각|가장 큰 예각)과 45°·45°·90° 삼각자의 (한 예각|직각)을 겹치지 않게 붙였어요\. 붙여 만든 각은 몇 도일까요\?/.exec(q))) {
    const a = m[1] === '가장 작은 각' ? 30 : 60; const b = m[2] === '직각' ? 90 : 45;
    return { type: 'set', ans: a + b, f: { kind: 'set', a, b } };
  }
  if (/삼각형의 세 각을 각도기로 재어 더했더니 (\d+)°였어요\. 삼각형의 세 각의 크기의 합은 몇 도일까요\?/.test(q)) return { type: 'measure', ans: 180, f: { kind: 'measure' } };
  if (/삼각형 4개로 나누었어요\. 사각형의 네 각의 크기의 합은 몇 도일까요\?/.test(q)) return { type: 'four', ans: 360, f: { kind: 'four' } };
  return sv;
}
/** 원고 확인 질문 하나씩 — { id, i, at, p, chs(보기), sv(따로 읽은 문제) } */
function* checksOf() {
  for (const id of IDS) {
    for (const [i, p] of CONTENT[id].lesson.entries()) {
      const chs = [{ text: fillC(p.check.ok), ok: true }, ...p.check.no.map((t) => ({ text: fillC(t), ok: false }))];
      yield { id, i, at: `${id}[${i}]`, p, chs, sv: solveContent(fillC(p.check.q), chs) };
    }
  }
}
const reEsc = (s) => String(s).replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
/** 까닭에 그 보기 이야기가 있나 — 수는 낱개로("45"가 "145" 속에서 잡히지 않게), 이름은 "가는·가가"처럼, 문장은 그대로 */
function mentions(why, text) {
  const v = valOf(text);
  if (typeof v === 'number') return new RegExp(`(?<![\\d.])${v}(?![\\d])`).test(why);
  if (/^[가나다]$/.test(String(v))) return new RegExp(`(?<![가-힣])${v}(?:는|가|와)`).test(why);
  if (/>$/.test(String(v))) return new RegExp(`(?<![가-힣])${String(v)[0]}(?:는|가)`).test(why);
  if (v === '=') return /크기가 같아요/.test(why);
  return why.includes(text);
}

test('원고(angle.json)가 형식 검사를 통과한다 — 8칸이 사다리 순서대로 · 배움 4~5장·장마다 확인 질문(오답 둘)·아빠 카드(말 2개↑·함정 2개↑·통과 기준)', () => {
  assert.deepEqual(checkContent(CONTENT), []);
  assert.deepEqual(Object.keys(CONTENT).filter((k) => k !== '_'), IDS);
  for (const id of IDS) {
    const v = CONTENT[id];
    assert.ok(v.lesson.length >= 4 && v.lesson.length <= 5, `${id}: 배움 ${v.lesson.length}장`);
    assert.ok(v.lesson.every((p) => p.check && p.check.no.length === 2), `${id}: 장마다 확인 질문(오답 둘)`);
    assert.ok(v.dad.say.length >= 2 && v.dad.traps.length >= 2 && /통과/.test(v.dad.pass), `${id}: 아빠 카드`);
    assert.ok(!/\{/.test([v.dad.goal, ...v.dad.say, v.dad.do, v.dad.pass, ...v.dad.traps.flatMap((t) => [t.kid, t.dad])].join(' ')), `${id}: 아빠 카드에 자리표시`);
  }
  const L = lessonOf('ang.tri', 3, { ...OPTS, content: CONTENT });
  assert.equal(L.pages.length, CONTENT['ang.tri'].lesson.length);
  assert.ok(L.pages.every((p) => p.check && p.check.ok));
  assert.equal(L.rule, CONTENT['ang.tri'].rule);
});

test('★ 원고 확인 질문도 따로 풀어 대조 — 전부 읽히고, 맞는 보기는 정답 하나뿐 · 오답 하나하나가 **한** 틀린 생각에만 맞다 · 까닭은 정답·오답을 다 말한다 · 이름표 19개 다 쓰임', () => {
  let n = 0; const types = new Set(); const used = new Set();
  for (const { at, p, chs, sv } of checksOf()) {
    const q = fillC(p.check.q); const why = fillC(p.check.why);
    assert.notEqual(sv.type, 'unknown', `${at}: 못 읽는 확인 질문\n${q}`);
    types.add(sv.type);
    const vals = chs.map((x) => valOf(x.text));
    assert.ok(vals.every((v) => v !== null), `${at}: 못 읽는 보기 ${chs.map((x) => x.text)}`);
    const right = chs.filter((x, k) => vals[k] === sv.ans);
    assert.ok(right.length === 1 && right[0].ok, `${at} (${sv.type}): 맞는 보기 ${right.map((x) => x.text).join(', ') || '없음'} — 따로 푼 답 ${sv.ans}\n${q}`);
    assert.equal(new Set(vals).size, vals.length, `${at}: 값이 같은 보기 ${chs.map((x) => x.text)}`);
    for (const x of chs.filter((c) => !c.ok)) {
      const tags = thoughtsOf(sv.f, sv.ans, valOf(x.text));
      assert.equal(tags.length, 1, `${at} (${sv.type}): 오답 "${x.text}"에 맞는 틀린 생각 ${tags.length}개 ${tags.join(' · ')}\n${q}`);
      used.add(tags[0]);
      assert.ok(mentions(why, x.text), `${at}: 까닭에 오답 "${x.text}" 이야기가 없다\n${why}`);
      n++;
    }
    assert.ok(mentions(why, p.check.ok), `${at}: 까닭에 정답 "${p.check.ok}"이 없다\n${why}`);
  }
  assert.ok(n >= 70, `본 오답 ${n}`);
  assert.ok(types.size >= 20, `확인 질문 종류 ${types.size}: ${[...types]}`);
  assert.deepEqual(ALL_TAGS.filter((t) => !used.has(t)), [], '원고 오답이 안 쓴 틀린 생각');
});

// 칸마다 그 칸의 문제
const CELL = {
  'ang.compare': ['max', 'min', 'same'], 'ang.measure': ['protR', 'protL', 'zero'], 'ang.acute': ['pickOb', 'pickAc', 'count', 'figOb'],
  'ang.estimate': ['near', 'diff'], 'ang.addsub': ['sum', 'sub', 'rest3', 'set', 'joined', 'rest'], 'ang.tri': ['triWords', 'triCut', 'tria', 'measure'],
  'ang.quad': ['quadWords', 'pair', 'quadCut', 'quad', 'four'], 'ang.apply': ['triExt', 'quadExt'],
};
test('★ 원고 확인 질문은 칸마다 그 칸의 문제 · 보기 꼴이 문제와 맞다 (각도는 "75°" · 어림은 "약 60°" · 개수는 "3개" · 고르기는 이름·각도)', () => {
  let n = 0;
  for (const { id, at, chs, sv } of checksOf()) {
    assert.ok(CELL[id].includes(sv.type), `${at}: 이 칸의 문제가 아니다 (${sv.type})`);
    const want = sv.type === 'near' ? /^약 \d+°$/ : sv.type === 'count' ? /^\d+개$/ : ['max', 'min', 'figOb'].includes(sv.type) ? /^[가나다]$/ : sv.type === 'same' ? /^(?:[가나]가 더 커요|두 각의 크기가 같아요)$/ : /^\d+°$/;
    for (const x of chs) assert.match(x.text, want, `${at} (${sv.type}): 보기 꼴 "${x.text}"`);
    n++;
  }
  assert.equal(n, IDS.reduce((a, id) => a + CONTENT[id].lesson.length, 0));
});

/** 글 속 각도 — "40°" · 이름 붙은 "가는 40°" */
const degsIn = (t) => [...String(t).matchAll(/(?<![\d.])(\d+)°/g)].map((m) => +m[1]);
test('🎨 원고의 그림: 모두 그려진다 · 글이 말하는 각도는 그 그림의 각도 (각도기는 읽은 값, 이름 붙은 각은 그 이름의 각, 도형·이어 붙인 각은 조각·합·㉠) · 각은 5의 배수', () => {
  let n = 0;
  for (const id of IDS) {
    CONTENT[id].lesson.forEach((p, i) => {
      const at = `${id}[${i}]`;
      for (const part of [p.say, p.check.q]) {
        const figs = figsOf(part); const plain = fillC(part).replace(FIGS, '').replace(/\*\*/g, '');
        for (const f of figs) {
          assert.ok(figureSvg(`${f.kind} ${f.arg}`).startsWith('<svg'), `${at}: 못 그리는 ${f.raw}`);
          for (const v of (f.arg.match(/\d+/g) || []).map(Number)) if (['tria', 'quad', 'fan', 'prot'].includes(f.kind)) assert.equal(v % 5, 0, `${at}: ${f.raw}의 ${v}`);
          n++;
        }
        // 각도기 — 글(배움 글 / 확인 질문은 까닭)이 말하는 0의 자리(오른쪽·왼쪽)와 안쪽·바깥쪽 눈금이 그림과 같다
        for (const f of figs.filter((x) => x.kind === 'prot')) {
          const left = / left$/.test(f.arg); const told = fillC(part === p.say ? p.say : p.check.why);
          if (/오른쪽 0|왼쪽 0/.test(told)) { assert.ok(new RegExp(left ? '왼쪽 0' : '오른쪽 0').test(told) && !new RegExp(left ? '오른쪽 0' : '왼쪽 0').test(told), `${at}: 그림은 ${left ? '왼쪽' : '오른쪽'} 0인데 글은 다르다`); n++; }
          if (/(안쪽|바깥쪽) 눈금으로 읽/.test(told)) assert.equal(/(안쪽|바깥쪽) 눈금으로 읽/.exec(told)[1], left ? '바깥쪽' : '안쪽', `${at}: 읽는 눈금`);
        }
        if (part !== p.say || !figs.length) continue;
        // 배움 글이 말하는 각도
        for (const f of figs) {
          if (f.kind === 'prot') { const R = readProt(figureSvg(`prot ${f.arg}`)); assert.ok(degsIn(plain).includes(R.hi - R.lo), `${at}: 각도기 그림의 각 ${R.hi - R.lo}°가 글에 없다`); }
          if (f.kind === 'ang') {
            const items = angItems(f.arg);
            for (const m of plain.matchAll(/(?<![가-힣])([가나다])는 (\d+)°/g)) assert.equal(+m[2], items.find((x) => x.name === m[1]).v, `${at}: "${m[0]}" — 그림의 ${m[1]}는 ${items.find((x) => x.name === m[1]).v}°`);
            for (const m of plain.matchAll(/이 각은 (\d+)°/g)) assert.equal(+m[1], items[0].v, `${at}: "${m[0]}"`);
          }
          if (['tria', 'quad', 'fan'].includes(f.kind)) {
            const vs = f.arg.replace(/ (ext|names)$/, '').split(/\s+/).map((t) => +t.replace(/^[?_]/, ''));
            const hidden = f.arg.split(/\s+/).filter((t) => t.startsWith('_')).map((t) => 180 - +t.slice(1));
            const ok = new Set([...vs, vs.reduce((a, x) => a + x, 0), ...hidden, 90, 180, 360]);
            // 그림 밖 기준 각(삼각자 30°·45°·60°)을 말하는 장은 각 그림이 아니다 — 도형·이어 붙인 각 그림의 장만
            for (const d of degsIn(plain)) assert.ok(ok.has(d) || (f.kind === 'tria' && d === 180 * 2), `${at}: 글의 ${d}°가 그림 ${f.raw}의 각이 아니다`);
          }
        }
      }
    });
  }
  assert.ok(n >= 30, `원고 그림 ${n}`);
});

test('★ 원고의 셈식 — "= …"로 내려 쓴 줄까지 이어서 전부 맞다 · 한 줄에 "="는 둘까지 · 셈식 줄은 폰 폭(약 22글자)에 한 줄', () => {
  const em = (line) => [...line].reduce((a, ch) => a + (/[가-힣ㄱ-ㅎ㉠-㉯①-⑨]/.test(ch) ? 1 : 0.6), 0);
  let n = 0; let lines = 0;
  for (const id of IDS) {
    const kidText = new Set(CONTENT[id].lesson.flatMap((p) => [p.say, p.check.why]).map(fillC));
    for (const b of blocksOf(CONTENT[id])) {
      const t = b.replace(FIGS, '').replace(/\*\*/g, '');
      for (const line of t.split('\n')) {
        assert.ok((line.match(/ = /g) || []).length <= 2, `${id}: 한 줄에 = 셋 이상 "${line}"`);
        // 진우가 보는 배움 글·까닭만 — 아빠 카드는 줄글이라 식이 글 속에 있어도 된다
        if (/ = /.test(line) && kidText.has(b)) { assert.ok(em(line) <= 22, `${id}: 셈식 줄이 폰에서 두 줄로 끊긴다 (${em(line).toFixed(1)}글자) "${line}"`); lines++; }
      }
      for (const e of eqChains(t.replace(/\n= /g, ' = '))) { assert.ok(e.ok, `${id}: ${e.a} = ${e.b}`); n++; }
    }
  }
  assert.ok(n >= 40 && lines >= 30, `본 셈식 ${n} · 줄 ${lines}`);
});

/** 아빠 카드 통과 기준의 문제 — 생성기·원고 틀이거나, 말로 묻는 꼴 */
function solvePass(q) {
  const sv = solveContent(q);
  if (sv.type !== 'unknown') return sv.ans;
  let m;
  if ((m = /^한 변이 (오른쪽|왼쪽) 0에 있고, 다른 변이 안쪽 눈금 (\d+)[과와] 바깥쪽 눈금 (\d+)[을를] 지나요\. 이 각은 몇 도일까요\?$/.exec(q))) {
    assert.equal(+m[2] + +m[3], 180, `${q}: 안쪽·바깥쪽 눈금의 합이 180이 아님`);
    return m[1] === '오른쪽' ? +m[2] : +m[3];
  }
  if ((m = /^(.+) 중에서 (둔각|예각)은 무엇일까요\?$/.exec(q))) {
    const vs = listOf(m[1]).filter((v) => (m[2] === '둔각' ? v > 90 && v < 180 : v > 0 && v < 90));
    assert.equal(vs.length, 1, `${q}: ${m[2]} ${vs.length}개`);
    return vs[0];
  }
  if ((m = /^어떤 각을 약 (\d+)°로 어림했는데 재어 보니 (\d+)°였어요\. 어림한 각도와 잰 각도의 차는 몇 도일까요\?$/.exec(q))) return Math.abs(+m[1] - +m[2]);
  if ((m = /^(\d+)° ([+−]) (\d+)°는 몇 도일까요\?$/.exec(q))) return m[2] === '+' ? +m[1] + +m[3] : +m[1] - +m[3];
  if ((m = /^삼각형의 두 각이 (\d+)°, (\d+)°예요\. 남은 꼭짓점에서 한 변을 늘인 직선과 다른 변이 이루는 각은 몇 도일까요\?$/.exec(q))) return 180 - (180 - +m[1] - +m[2]);
  if ((m = /^사각형의 세 각이 (\d+)°, (\d+)°, (\d+)°예요\. 남은 꼭짓점에서 한 변을 늘인 직선과 다른 변이 이루는 각은 몇 도일까요\?$/.exec(q))) return 180 - (360 - +m[1] - +m[2] - +m[3]);
  return null;
}
test('★ 원고 아빠 카드: 통과 기준의 문제를 따로 풀어 괄호 속 답과 대조 (Z1은 가위로 비교하는 활동)', () => {
  let n = 0;
  for (const id of IDS) {
    const ps = fillC(CONTENT[id].dad.pass);
    if (id === 'ang.compare') { assert.match(ps, /벌린 쪽이 크다고 말하고/); continue; }
    const qs = [...ps.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    const ans = ((/\(([^)]+)\)/.exec(ps.replace(/"[^"]+"/g, '')) || [])[1] || '').split(' · ');
    assert.ok(qs.length >= 2, `${id}: 통과 기준의 문제 ${qs.length}개 "${ps}"`);
    assert.equal(ans.length, qs.length, `${id}: 문제 ${qs.length}개 · 답 ${ans.length}개`);
    qs.forEach((q, k) => {
      const a = solvePass(q);
      assert.ok(a !== null && a > 0, `${id}: 못 읽는 통과 기준 문제 "${q}"`);
      assert.match(ans[k], /^\d+°$/, `${id}: 답 꼴 "${ans[k]}"`);
      assert.equal(valOf(ans[k]), a, `${id}: "${q}"의 답 ${ans[k]} ≠ ${a}°`);
      n++;
    });
  }
  assert.ok(n >= 14, `본 통과 기준 문제 ${n}`);
});

test('★ 원고의 조사·아직 안 배운 말·틀린 말 (배움 글·확인 질문·아빠 카드 전부) — 수 뒤는 읽는 소리 · ° 뒤는 "도" · ㄱㅇㄷ·각 ㄴ·㉠ 뒤는 받침 · ° Z2·예각 Z3·어림 Z4·일직선 Z6부터 · 4-2 말·내각 없음', () => {
  const BAT = new Set(['0', '1', '3', '6', '7', '8']);
  const PAIRS = [['을', '를'], ['은', '는'], ['이', '가'], ['과', '와'], ['이에요', '예요']];
  const END = '(?=[\\s.,!?)—"·]|$)';
  const idx = (id) => IDS.indexOf(id);
  let hitN = 0; let degN = 0; let jamoN = 0;
  for (const id of IDS) {
    const all = contentText(CONTENT[id]).replace(/\*\*/g, '').replace(FIGS, '');
    for (const [wb, nb] of PAIRS) {
      for (const m of all.matchAll(new RegExp(`(?<![\\d/])(\\d+)(${wb}|${nb})${END}`, 'g'))) { assert.equal(m[2], BAT.has(m[1].slice(-1)) ? wb : nb, `${id}: "…${m[1]}${m[2]}"`); hitN++; }
      for (const m of all.matchAll(new RegExp(`°(${wb}|${nb})${END}`, 'g'))) { assert.equal(m[1], nb, `${id}: "…°${m[1]}"`); degN++; }
      for (const m of all.matchAll(new RegExp(`([ㄱ-ㅎ㉠-㉯])(${wb}|${nb})${END}`, 'g'))) { assert.equal(m[2], wb, `${id}: "…${m[1]}${m[2]}"`); jamoN++; }
    }
    assert.ok(!/°(으로|이었어요|이라면)/.test(all), `${id}: ° 뒤 받침 조사`);
    for (const m of all.matchAll(/(?<![\d/])(\d+)(으로|로)(?=[\s.,"]|$)/g)) assert.equal(m[2], ['1', '7', '8'].includes(m[1].slice(-1)) ? '로' : BAT.has(m[1].slice(-1)) ? '으로' : '로', `${id}: "…${m[1]}${m[2]}"`);
    assert.ok(!/-\d|\d-/.test(all), `${id}: ASCII 빼기`);
    for (const [re, at] of FIRST) if (idx(at) > idx(id)) assert.ok(!re.test(all), `${id}: 아직 안 배운 ${re} — ${(all.match(re) || [])[0]}`);
    assert.ok(!NEVER.test(all), `${id}: ${NEVER} — ${(all.match(NEVER) || [])[0]}`);
    const truth = truthText(CONTENT[id]).replace(/\*\*/g, '').replace(FIGS, '');
    for (const [re, why] of BAD) assert.ok(!re.test(truth), `${id}: ${why}`);
  }
  // 원고의 각도는 거의 "75°" 꼴이라 숫자 바로 뒤 조사는 적다(15·100·140 같은 눈금 수) — ° 뒤가 대부분
  assert.ok(hitN >= 15 && degN >= 100 && jamoN >= 15, `실제로 본 조사 — 수 ${hitN} · ° ${degN} · 자모 ${jamoN}`);
});

test('원고는 배포 파일 검사(check.mjs)에도 걸린다 — angle.json → mathangle.js의 checkContent', () => {
  const src = readFileSync(new URL('../tools/check.mjs', import.meta.url), 'utf8');
  assert.ok(src.includes("'coach/math/angle.json': '../js/mathangle.js'"));
});

// ───────────────────── 3단계: 화면 연결 ─────────────────────

test('화면 연결 (3단계): STEMS.angle(Z)는 이 생성기·원고를 쓰고 I 둘레와 넓이 다음·J 삼각형·사각형 바로 앞 · 앱 셸이 둘 다 들고 간다 · 사다리 안내에 아직 안 배운 말·틀린 말 없음 · 숫자판은 ° · 각도기를 📊·❓가 안다', async () => {
  const { STEMS, STEM_ORDER, stemOf } = await import('../js/mathprog.js');
  const Z = STEMS.angle;
  assert.equal(Z.key, 'angle');
  assert.equal(Z.code, 'Z');
  assert.equal(Z.label, '각도 줄기', '줄기 고르기·📊에 보이는 이름');
  const at = STEM_ORDER.indexOf('angle');
  assert.deepEqual(STEM_ORDER.slice(at - 1, at + 2), ['area', 'angle', 'shape'], 'I 둘레와 넓이 다음·J 삼각형·사각형 바로 앞 (4-1 각도 — J의 4-2 도형·각의 합보다 먼저)');
  assert.equal(Z.list, ANGLE);
  assert.equal(Z.gen.makeQuestion, makeQuestion);
  assert.equal(Z.gen.lessonOf, lessonOf, '📚 배움은 이 생성기의 lessonOf');
  assert.equal(Z.lesson, true);
  assert.equal(Z.file, './coach/math/angle.json');
  assert.equal(Z.range, '초4');
  assert.ok(IDS.every((id) => stemOf(id) === Z), '모든 칸이 Z 줄기로 찾아진다');
  assert.match(Z.pick, /두 변이 벌어진 정도/);
  // 사다리 안내·첫 안내는 Z1부터 본다 — 아직 안 배운 말(°·각도기·예각·어림·일직선)·4-2 말·참말에 틀린 말이 없다
  const guide = `${Z.pick} ${Z.intro}`;
  for (const [re] of FIRST) assert.ok(!re.test(guide), `안내에 ${re}`);
  assert.ok(!NEVER.test(guide), `안내에 ${NEVER}`);
  for (const [re, why] of BAD) assert.ok(!re.test(guide), `안내에 ${why}`);
  // 앱이 가져오는 원고(Z.file)로 배움 장이 그대로 만들어진다
  const content = JSON.parse(readFileSync(new URL(Z.file.replace('./', '../'), import.meta.url), 'utf8'));
  for (const id of IDS) assert.equal(Z.gen.lessonOf(id, 5, { ...OPTS, content }).pages.length, content[id].lesson.length, `${id}: 원고 배움 장`);
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  for (const f of ['./js/mathangle.js', './coach/math/angle.json']) assert.ok(sw.includes(`'${f}'`), `APP_SHELL에 ${f}`);
  // 숫자판은 이 줄기 열쇠로 — 각은 늘 0보다 커서 ± 없음 · "몇 도"는 °
  let pads = 0;
  for (let s = 1; s <= 40; s++) {
    const spec = padSpec(makeQuestion('ang.measure', 'calc', s, OPTS), Z.key);
    if (!spec) continue;
    assert.equal(spec.signed, false); assert.equal(spec.unit, '°'); pads++;
  }
  assert.ok(pads > 10, `숫자판 뜬 Z2 문항 ${pads}`);
  // 📊 펼친 문제 글(figText)·❓ 복사문·📊 답장 안내 — 각도기를 안다, 안내의 예는 그대로 그려진다
  assert.equal(figText('앞 [prot 0 75] 뒤', true), '앞 (각도기) 뒤');
  const ask = readFileSync(new URL('../js/mathask.js', import.meta.url), 'utf8');
  const stats = readFileSync(new URL('../js/stats.js', import.meta.url), 'utf8');
  assert.ok(ask.includes('[prot 0 75]') && stats.includes('[prot 0 75]'), '❓ 복사문·📊 답장 안내에 [prot] 예');
  assert.ok(renderFigures('[prot 0 75]').startsWith('<svg'), '안내의 예도 그려진다');
});
