// 📐 J 삼각형·사각형 줄기 생성기 테스트: node --test tests/mathshape.test.js
//
// ★ 핵심은 **독립 검산** — 생성기가 알려 주는 값을 믿지 않고 **문제 글과 그림 지시문을 이 파일이 직접 읽는다**:
//   · 모눈 위 도형·직선: 꼭짓점에서 평행(외적 0)·수직(내적 0)·같은 길이(제곱 길이)를 따로 계산
//   · 각: **그려진 SVG 도형의 꼭짓점에서 각을 직접 잰다** (그림이 거짓말하면 여기서 잡힌다)
//   · 보기 문장("사다리꼴이면서 평행사변형이에요")은 이 파일이 따로 읽어 참거짓을 정한다 — 참인 보기가 딱 하나, 그것이 정답
// ★ 씨앗은 개념마다 수천 개 (SHAPE_SEEDS=20000으로 넓게).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  SHAPE, TAGS, makeQuestion, makeRound, conceptById, ladder, placeFrom, diagnosticSet, lessonOf, checkContent, gradeLabel, valueOf,
} from '../js/mathshape.js';
import { figureSvg, figText } from '../js/mathdraw.js';

const OPTS = { names: ['피카츄', '리자몽', '개굴닌자'], me: '진우', worlds: { pokemon: [], toystory: [], minions: [], moana: [] } };
const SEEDS = Number(process.env.SHAPE_SEEDS) || 1500;
// 사람이 쓴 원고 (coach/math/shape.json)
const CONTENT = JSON.parse(readFileSync('coach/math/shape.json', 'utf8'));
const strings = (v, out = []) => { if (typeof v === 'string') out.push(v); else if (v && typeof v === 'object') Object.values(v).forEach((x) => strings(x, out)); return out; };
const JAMO = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ'];

const nums = (t) => (String(t).match(/\d+/g) || []).map(Number);
const lastNum = (t) => { const n = nums(t); return n.length ? n[n.length - 1] : null; };
const plain = (q) => String(q).replace(/\*\*/g, '');
const EPS = 1e-9;
const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];

// ── 지시문 읽기 (이 파일이 따로) ──
function readFig(q) {
  const out = [];
  for (const m of String(q).matchAll(/\[(gpoly|lines|tris|tria|quad|reg) ([^\]]+)\]/g)) {
    const [kind, arg] = [m[1], m[2].trim()];
    if (kind === 'gpoly') out.push({ kind, raw: m[0], verts: arg.split(/\s+/).map((t) => { const q2 = /^(?:([ㄱ-ㅎ]):)?(\d+),(\d+)$/.exec(t); return { name: q2[1] || '', p: [+q2[2], +q2[3]] }; }) });
    else if (kind === 'lines') {
      const [W, H, ...items] = arg.split(/\s+/);
      out.push({ kind, raw: m[0], W: +W, H: +H, items: items.map((t) => { const q2 = /^(?:([^:\s]+):)?(\d+),(\d+),(\d+),(\d+)(=?)$/.exec(t); return { label: q2[1] || '', a: [+q2[2], +q2[3]], b: [+q2[4], +q2[5]], len: !!q2[6] }; }) });
    } else if (kind === 'tris') { const t = arg.split(/\s+/); out.push({ kind, raw: m[0], sides: t.map((s) => +s.replace('?', '')), ask: t.findIndex((s) => s.startsWith('?')) }); }
    else if (kind === 'tria' || kind === 'quad') {
      const t = arg.replace(/ (iso|rh)$/, '').split(/\s+/);
      out.push({ kind, raw: m[0], ang: t.map((s) => +s.replace(/[?_]/, '')), mode: t.map((s) => (s[0] === '?' ? 'ask' : s[0] === '_' ? 'hide' : 'val')), iso: / iso$/.test(arg), rh: / rh$/.test(arg) });
    } else { const [n, s] = arg.split(/\s+/).map(Number); out.push({ kind, raw: m[0], n, s }); }
  }
  return out;
}
/** 그려진 SVG의 다각형 꼭짓점 (화면 좌표) */
const svgPts = (spec) => /<polygon points="([^"]+)"/.exec(figureSvg(spec))[1].trim().split(/\s+/).map((s) => s.split(',').map(Number));
/** 다각형 안쪽 각 (도) — 볼록 다각형 */
function anglesOf(P) {
  return P.map((p, i) => {
    const a = sub(P[(i + P.length - 1) % P.length], p); const b = sub(P[(i + 1) % P.length], p);
    return (Math.acos(Math.max(-1, Math.min(1, dot(a, b) / (Math.hypot(...a) * Math.hypot(...b))))) * 180) / Math.PI;
  });
}
const measured = (raw) => anglesOf(svgPts(raw.slice(1, -1))).map((v) => Math.round(v * 1000) / 1000);

/** 모눈 위 사각형·다각형의 성질 — 꼭짓점에서 따로 */
function props(P) {
  const n = P.length;
  const e = P.map((p, i) => sub(P[(i + 1) % n], p));
  const L = e.map((v) => dot(v, v));
  const pairs = n === 4 ? [[0, 2], [1, 3]].filter(([i, j]) => cross(e[i], e[j]) === 0).length : 0;
  const right = e.map((v, i) => dot(v, e[(i + 1) % n]) === 0);
  const allEq = L.every((v) => v === L[0]);
  const angs = anglesOf(P); const allAng = angs.every((a) => Math.abs(a - angs[0]) < 1e-6);
  return {
    n, pairs, allEq, allRight: right.every(Boolean), allAng,
    names: { 사다리꼴: n === 4 && pairs >= 1, 평행사변형: n === 4 && pairs === 2, 마름모: n === 4 && allEq, 직사각형: n === 4 && right.every(Boolean), 정사각형: n === 4 && allEq && right.every(Boolean) },
  };
}
function triProps(sides) {
  const eq = (sides[0] === sides[1]) + (sides[1] === sides[2]) + (sides[0] === sides[2]);
  return { names: { 이등변삼각형: eq >= 1, 정삼각형: eq === 3 }, eq };
}
// 그림에서 잰 각은 좌표를 소수 한 자리로 적어서 ±0.05° 흔들린다
const triType = (angs) => (Math.max(...angs) > 90.05 ? '둔각삼각형' : Math.abs(Math.max(...angs) - 90) <= 0.05 ? '직각삼각형' : '예각삼각형');

/** 이름 문장·성질 문장의 참거짓 — 모르는 말투면 null */
function sentTruth(t0, pr) {
  let t = String(t0).replace(/^이 (사각형|삼각형|도형)은 /, '').replace(/^기울어져 있어서 /, '');
  const N = (w) => (w in pr.names ? pr.names[w] : null);
  const PROP = {
    '네 변의 길이가 모두 같아요': pr.allEq, '네 변의 길이가 모두 같지는 않아요': !pr.allEq,
    '네 각이 모두 직각이에요': pr.allRight, '네 각이 모두 직각은 아니에요': !pr.allRight,
  };
  if (t in PROP) return PROP[t];
  let m;
  if ((m = /^(정다각형이에요|정다각형이 아니에요) — (.+)$/.exec(t))) {
    const reg = pr.allEq && pr.allAng;
    const R = { '변의 길이가 모두 같아요': pr.allEq, '각의 크기가 모두 같아요': pr.allAng, '변의 길이가 모두 같지는 않아요': !pr.allEq, '각의 크기가 모두 같지는 않아요': !pr.allAng };
    if (!(m[2] in R)) return null;
    return (m[1] === '정다각형이에요' ? reg : !reg) && R[m[2]];
  }
  if ((m = /^(.+?)(?:이면서|면서) (.+?)(?:이에요|예요)$/.exec(t))) return N(m[1]) === null || N(m[2]) === null ? null : N(m[1]) && N(m[2]);
  if ((m = /^(.+?)(?:이지만|지만) (.+?)(?:은|는) 아니에요$/.exec(t))) return N(m[1]) === null || N(m[2]) === null ? null : N(m[1]) && !N(m[2]);
  if ((m = /^(.+?)도 (.+?)도 아니에요$/.exec(t))) return N(m[1]) === null || N(m[2]) === null ? null : !N(m[1]) && !N(m[2]);
  if ((m = /^(.+?)(?:이|가) 아니에요$/.exec(t))) return N(m[1]) === null ? null : !N(m[1]);
  if ((m = /^(.+?)(?:이에요|예요)$/.exec(t))) return N(m[1]);
  return null;
}

/**
 * 문제 글 → 정답 (생성기와 따로). { v } 수 · { truth(choiceText) } 참인 보기가 딱 하나 · ctx: 이름표 확인용 재료
 */
function solveText(q0) {
  const q = plain(q0);
  const F = readFig(q);
  let m;
  const line = (fig, lab) => fig.items.find((it) => it.label === lab);
  const dir = (it) => sub(it.b, it.a);
  const segMeet = (s, t) => {
    const o = (a, b, c) => Math.sign(cross(sub(b, a), sub(c, a)));
    return o(s.a, s.b, t.a) !== o(s.a, s.b, t.b) && o(t.a, t.b, s.a) !== o(t.a, t.b, s.b);
  };
  // J1 — 직선 ㉮에 수직인 직선
  if (/직선 ㉮에 (수직인 직선|대한 수선)은 어느 것/.test(q)) {
    const fig = F[0]; const base = line(fig, '㉮');
    return { truth: (t) => { const l = line(fig, t.replace('직선 ', '')); return l ? dot(dir(l), dir(base)) === 0 : null; }, ctx: { kind: 'perpLine', fig, base } };
  }
  if ((m = /변 ([ㄱ-ㅎ]{2})에 수직인 변은 어느 것/.exec(q))) {
    const V = F[0].verts; const idx = (ch) => V.findIndex((v) => v.name === ch);
    const side = (nm) => [V[idx(nm[0])].p, V[idx(nm[1])].p];
    const base = side(m[1]);
    return { truth: (t) => { const s = side(t.replace('변 ', '')); return dot(sub(s[1], s[0]), sub(base[1], base[0])) === 0; }, ctx: { kind: 'perpSide', side, base } };
  }
  // J2
  if (/서로 평행한 두 직선은/.test(q)) {
    const fig = F[0];
    return { truth: (t) => { const mm = /^직선 (\S)와 직선 (\S)$/.exec(t); return mm ? cross(dir(line(fig, mm[1])), dir(line(fig, mm[2]))) === 0 : null; }, ctx: { kind: 'paraPair', fig } };
  }
  if (/평행선 사이의 거리(는 몇 cm|를 나타내는 선분은)/.test(q)) {
    const fig = F[0]; const [p1, p2] = fig.items.filter((it) => !it.label);
    assert.equal(cross(dir(p1), dir(p2)), 0, `평행선이 평행하지 않다: ${q}`);
    const d = Math.abs(cross(sub(p2.a, p1.a), dir(p1))) / Math.hypot(...dir(p1));
    const perpSeg = (it) => dot(dir(it), dir(p1)) === 0;
    if (/몇 cm/.test(q)) return { v: d, ctx: { kind: 'dist', fig, d } };
    return { truth: (t) => { const it = line(fig, t.replace('선분 ', '')); return it ? perpSeg(it) : null; }, ctx: { kind: 'distSeg', fig } };
  }
  // J3
  if (F[0] && F[0].kind === 'tris' && /바르게 말한 것은/.test(q)) { const pr = triProps(F[0].sides); return { truth: (t) => sentTruth(t, pr), ctx: { kind: 'triSent', pr, sides: F[0].sides } }; }
  if (F[0] && F[0].kind === 'tris' && /세 변의 길이의 합은 몇 cm/.test(q)) {
    const s = F[0].sides; assert.ok(/이등변삼각형/.test(q)); const pr = triProps(s); assert.equal(pr.eq, 1, `이등변삼각형이 아니다: ${q}`);
    const shown = s.filter((_, i) => i !== F[0].ask);
    return { v: s[0] + s[1] + s[2], ctx: { kind: 'isoPerim', s, shown, a: s[F[0].ask] } };
  }
  // 각을 묻는 문항 — 그려진 그림에서 잰다
  if ((m = /각 ([ㄱ-ㅎ])의 크기는 몇 도/.exec(q)) && F[0] && (F[0].kind === 'tria' || F[0].kind === 'quad')) {
    const f = F[0]; const i = JAMO.indexOf(m[1]); const got = measured(f.raw);
    assert.equal(f.mode[i], 'ask', `묻는 각에 ? 표시가 없다: ${q}`);
    const known = f.ang.filter((_, j) => f.mode[j] === 'val');
    return { v: Math.round(got[i]), ctx: { kind: f.kind === 'tria' ? (f.iso ? 'isoAng' : 'triAng') : /평행사변형|마름모/.test(q) ? 'paraAng' : 'quadAng', f, i, known, got } };
  }
  if ((m = /(정[가-힣]+형)의 한 각의 크기는 몇 도/.exec(q))) { const f = F[0]; const got = measured(f.raw); return { v: Math.round(got[0]), ctx: { kind: 'regAng', n: f.n } }; }
  // J4
  if (F[0] && F[0].kind === 'tria' && /어떤 삼각형일까요/.test(q)) { const got = measured(F[0].raw); const ty = triType(got); return { truth: (t) => (['예각삼각형', '직각삼각형', '둔각삼각형'].includes(t) ? t === ty : null), ctx: { kind: 'triType', ty } }; }
  if ((m = /세 삼각형의 각을 재었어요\.\n\n([\s\S]+?)\n\n(예각삼각형|직각삼각형|둔각삼각형)은 어느 것/.exec(q))) {
    const list = Object.fromEntries(m[1].split('\n').map((l) => { const mm = /^(\S) (.+)$/.exec(l); const a = nums(mm[2]); assert.equal(a[0] + a[1] + a[2], 180, l); return [mm[1], triType(a)]; }));
    return { truth: (t) => (t in list ? list[t] === m[2] : null), ctx: { kind: 'triPick', list, target: m[2] } };
  }
  // J5~J8 모눈 위 도형
  if (F[0] && F[0].kind === 'gpoly') {
    const pr = props(F[0].verts.map((v) => v.p));
    if (/부를 수 없는 이름은/.test(q)) return { truth: (t) => (t in pr.names ? !pr.names[t] : null), ctx: { kind: 'cant', pr } };
    if (/이 도형의 이름은 무엇/.test(q)) { const NG = { 3: '삼각형', 4: '사각형', 5: '오각형', 6: '육각형', 7: '칠각형', 8: '팔각형', 9: '구각형' }; return { truth: (t) => t === NG[pr.n], ctx: { kind: 'ngon', n: pr.n, NG } }; }
    if (/바르게 말한 것은/.test(q)) return { truth: (t) => sentTruth(t, pr), ctx: { kind: 'quadSent', pr } };
  }
  if (/대각선은 모두 몇 개/.test(q)) { const n = F[0].n; return { v: (n * (n - 1)) / 2 - n, ctx: { kind: 'diag', n } }; } // 꼭짓점 두 개 고르기 − 변
  return null;
}

test('독립 읽기 자체 점검 — 각 재기·성질·문장', () => {
  assert.deepEqual(measured('[tria 50 60 ?70]').map(Math.round), [50, 60, 70]);
  assert.deepEqual(measured('[quad 80 95 110 ?75]').map(Math.round), [80, 95, 110, 75]);
  const pr = props([[0, 0], [6, 0], [7, 3], [1, 3]]);
  assert.equal(pr.pairs, 2); assert.equal(sentTruth('이 사각형은 사다리꼴이면서 평행사변형이에요', pr), true);
  assert.equal(sentTruth('이 사각형은 평행사변형이지만 사다리꼴은 아니에요', pr), false);
  assert.equal(sentTruth('이 사각형은 마름모예요', pr), false);
  const sq = props([[1, 0], [3, 1], [2, 3], [0, 2]]);
  assert.equal(sq.names.정사각형, true); assert.equal(sentTruth('이 사각형은 기울어져 있어서 정사각형이 아니에요', sq), false);
  assert.equal(sentTruth('이 도형은 정다각형이 아니에요 — 각의 크기가 모두 같지는 않아요', props([[0, 4], [3, 0], [6, 4], [3, 8]])), true);
  assert.equal(solveText('사각형 ㄱㄴㄷㄹ이에요.\n\n[quad 80 95 110 ?75]\n\n각 ㄹ의 크기는 몇 도일까요?').v, 75);
});

test('그림: J 지시문 다섯 가지를 그리고 — 그린 각·변이 글과 같다, 같은 변 눈금, 말이 안 되는 것은 빈 글자', () => {
  // 세 각·네 각은 그린 도형에서 잰 각이 글의 각과 같다
  for (const s of ['tria 50 60 70', 'tria 30 120 30', 'tria 90 45 45', 'tria 20 25 135', 'quad 80 95 110 75', 'quad 65 115 65 115', 'quad 70 110 70 110 rh', 'quad 90 90 90 90']) {
    const want = s.split(' ').slice(1).filter((t) => /^\d/.test(t)).map(Number);
    const got = measured(`[${s}]`);
    assert.ok(got.every((v, i) => Math.abs(v - want[i]) < 0.1), `${s}: 그린 각 ${got.join(', ')}`);
  }
  // 마름모(rh)는 네 변이 같다 · 세 변 삼각형은 변의 비가 글과 같다
  const P = svgPts('quad 70 110 70 110 rh'); const L = P.map((p, i) => Math.hypot(...sub(P[(i + 1) % 4], p)));
  assert.ok(L.every((v) => Math.abs(v - L[0]) / L[0] < 0.003), `rh 네 변 ${L.join(', ')}`); // 좌표를 소수 한 자리로 적는 만큼만 흔들린다
  const T = svgPts('tris 5 7 9'); const TL = T.map((p, i) => Math.hypot(...sub(T[(i + 1) % 3], p)));
  assert.ok(Math.abs(TL[0] / TL[1] - 5 / 7) < 1e-3 && Math.abs(TL[1] / TL[2] - 7 / 9) < 1e-3, 'tris 변의 비');
  // 같은 변 눈금: 5 5 6 → 두 개, 6 6 6 → 세 개, iso → 두 개
  const ticks = (s) => (figureSvg(s).match(/stroke="currentColor" stroke-width="1.4"\/>/g) || []).length;
  assert.equal(ticks('tris 5 5 6'), 2); assert.equal(ticks('tris 6 6 6'), 3); assert.equal(ticks('tris 5 6 7'), 0); assert.equal(ticks('tria 70 70 40 iso'), 2);
  // 숨긴 변·숨긴 각
  const texts = (s) => [...figureSvg(s).matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);
  assert.ok(texts('tris 7 ?7 4').includes('? cm') && texts('tris 7 ?7 4').filter((t) => t === '7 cm').length === 1);
  assert.ok(!texts('tria _70 ?70 40 iso').includes('70°') && texts('tria _70 ?70 40 iso').includes('?'));
  // 직선 그림: 길이는 정수일 때만
  assert.ok(texts('lines 12 6 0,1,12,1 0,5,12,5 ㉠:1,1,1,5= ㉡:3,1,6,5=').includes('㉡ 5 cm'));
  assert.ok(texts('lines 12 6 0,1,12,1 ㉢:3,1,5,5=').includes('㉢'), '정수가 아니면 이름만');
  // 말이 안 되는 것
  for (const bad of ['tria 50 60 80', 'tria 50 60 ?80', 'quad 60 60 60 180', 'tris 1 2 3', 'tris 7 ?7 ?4', 'tria 60 70 50 iso', 'quad 70 110 60 120 rh', 'gpoly 0,0 13,0 5,5', 'lines 13 5 0,0,1,1', 'lines 10 5 ㉮:1,1,1,1']) assert.equal(figureSvg(bad), '', bad);
  // 글로 풀어 쓰기
  assert.equal(figText('[tria 50 60 ?70]'), '(삼각형 세 각 ㄱ 50° · ㄴ 60° · ㄷ ?)');
  assert.equal(figText('[quad 65 _115 ?65 _115]'), '(사각형 네 각 ㄱ 65° · ㄷ ?)');
  assert.equal(figText('[tris 7 ?7 4]'), '(삼각형 세 변 7 cm · ? cm · 4 cm)');
  assert.equal(figText('[gpoly ㄱ:0,0 ㄴ:6,0 ㄷ:7,3 ㄹ:1,3]', true), '(그림)');
});

test('사다리: 9칸, 모두 초4, needs가 바로 앞 칸', () => {
  assert.equal(SHAPE.length, 9);
  const ids = SHAPE.map((c) => c.id);
  assert.equal(new Set(ids).size, 9);
  for (const [k, c] of SHAPE.entries()) {
    assert.ok(/^shp\./.test(c.id) && c.name && c.idea && c.slip, c.id);
    assert.equal(c.grade, 4);
    assert.deepEqual(c.needs, k ? [ids[k - 1]] : []);
  }
  assert.equal(gradeLabel(4), '초4');
  assert.equal(valueOf('70'), 70);
  assert.equal(valueOf('직선 ㉯'), null);
});

test('★ 독립 검산: ① 정답이 그림·글을 따로 읽어 정한 답과 같다 · 딱 하나만 맞다', () => {
  for (const c of SHAPE) {
    for (let s = 1; s <= SEEDS; s++) {
      const q = makeQuestion(c.id, 'calc', s * 7919, OPTS);
      const where = `${c.id} seed ${s}: "${q.q.replace(/\n/g, ' ')}"`;
      const w = solveText(q.q);
      assert.ok(w, `${where} — 글을 못 읽었다 (해석기에 말투를 더할 것)`);
      if (w.v !== undefined) {
        const ok = q.choices.find((x) => x.ok).text;
        assert.equal(Number(ok), w.v, `${where} — 정답`);
        for (const ch of q.choices.filter((x) => !x.ok)) assert.notEqual(Number(ch.text), w.v, `${where} — 오답 ${ch.text}이 사실 정답`);
      } else {
        const truths = q.choices.map((x) => w.truth(x.text));
        assert.ok(truths.every((t) => t !== null), `${where} — 못 읽는 보기 ${q.choices.filter((_, i) => truths[i] === null).map((x) => x.text).join(' / ')}`);
        assert.equal(truths.filter(Boolean).length, 1, `${where} — 참인 보기 ${truths.filter(Boolean).length}개: ${q.choices.map((x, i) => `${truths[i] ? '⭕' : '❌'}${x.text}`).join(' / ')}`);
        assert.ok(q.choices[truths.indexOf(true)].ok, where);
      }
    }
  }
});

test('★ 보기: 정답 하나, 겹침 없음, 새는 글자 없음, 수 범위, 그림 지시문은 그려진다', () => {
  for (const c of SHAPE) {
    for (let s = 1; s <= SEEDS; s++) {
      for (const kind of ['calc', 'misread']) {
        const q = makeQuestion(c.id, kind, s * 104729, OPTS);
        const where = `${c.id}/${kind} seed ${s}`;
        assert.equal(q.choices.filter((x) => x.ok).length, 1, `${where}: 정답 하나`);
        assert.ok(q.choices.length >= 3, `${where}: 보기 3개↑`);
        const texts = q.choices.map((x) => String(x.text).trim());
        assert.equal(new Set(texts).size, texts.length, `${where}: 글자가 같은 보기`);
        for (const ch of q.choices) {
          const t = String(ch.text);
          assert.ok(t && !/undefined|NaN|null|Infinity/.test(t), `${where}: 이상한 보기 "${t}"`);
          assert.ok(ch.ok || ch.tag, `${where}: 오답 "${t}"에 이름표가 없다`);
          if (/^\d+$/.test(t)) assert.ok(Number(t) > 0 && Number(t) <= 1100 && !/^0/.test(t), `${where}: 모양이 이상한 수 "${t}"`);
        }
        const all = `${q.q} ${JSON.stringify(q.solve)} ${JSON.stringify(q.choices)}`;
        assert.ok(!/undefined|NaN|null|\{(me|mon)/.test(all), `${where}: 새는 것 — ${all.slice(0, 160)}`);
        for (const f of q.q.match(/\[[a-z]+ [^\]]+\]/g) || []) assert.ok(figureSvg(f.slice(1, -1)), `${where}: 못 그리는 그림 ${f}`);
      }
    }
  }
});

test('★ 오개념 이름표: 그 오답이 정말 그 실수다', () => {
  const seen = {};
  const isVert = (it) => it.a[0] === it.b[0];
  for (const c of SHAPE) {
    for (let s = 1; s <= SEEDS; s++) {
      const q = makeQuestion(c.id, 'calc', s * 31337, OPTS);
      const w = solveText(q.q); const x = w.ctx;
      for (const ch of q.choices.filter((y) => !y.ok)) {
        if (ch.tag === '계산 실수') continue;
        const where = `${c.id} seed ${s}: "${ch.tag}" 오답 ${ch.text} — ${q.q.replace(/\n/g, ' ')}`;
        const v = Number(ch.text); const t = ch.text;
        const hit = (cond) => { seen[ch.tag] = (seen[ch.tag] || 0) + 1; assert.ok(cond, where); };
        const says = (name, yes) => { const tt = t.replace(/^이 (사각형|삼각형|도형)은 /, ''); return yes ? new RegExp(`^(기울어져 있어서 )?${name}(이에요|예요|이면서|면서)|(이면서|면서) ${name}|^${name}(이지만|지만)`).test(tt) : new RegExp(`${name}(이|가) 아니에요|${name}(은|는) 아니에요|${name}도`).test(tt); };
        switch (ch.tag) {
          case TAGS.meetAsPerp:
            if (x.kind === 'perpLine') { const l = x.fig.items.find((it) => `직선 ${it.label}` === t); hit(dot(sub(l.b, l.a), sub(x.base.b, x.base.a)) !== 0); } else { const s2 = x.side(t.replace('변 ', '')); hit(dot(sub(s2[1], s2[0]), sub(x.base[1], x.base[0])) !== 0 && (s2.some((p) => x.base.some((b) => p[0] === b[0] && p[1] === b[1])))); }
            break;
          case TAGS.uprightAsPerp: { const l = x.fig.items.find((it) => `직선 ${it.label}` === t); hit(isVert(l) && x.base.a[1] !== x.base.b[1] && dot(sub(l.b, l.a), sub(x.base.b, x.base.a)) !== 0); break; }
          case TAGS.apartAsPerp:
            if (x.kind === 'perpLine') { const l = x.fig.items.find((it) => `직선 ${it.label}` === t); hit(cross(sub(l.b, l.a), sub(x.base.b, x.base.a)) === 0 && l.a[1] !== x.base.a[1]); } else { const s2 = x.side(t.replace('변 ', '')); hit(!s2.some((p) => x.base.some((b) => p[0] === b[0] && p[1] === b[1])) && dot(sub(s2[1], s2[0]), sub(x.base[1], x.base[0])) !== 0); }
            break;
          case TAGS.looksParallel:
            if (x.kind === 'paraPair') { const [, a, b] = /^직선 (\S)와 직선 (\S)$/.exec(t); const la = x.fig.items.find((it) => it.label === a); const lb = x.fig.items.find((it) => it.label === b); hit(cross(sub(la.b, la.a), sub(lb.b, lb.a)) !== 0 && dot(sub(la.b, la.a), sub(lb.b, lb.a)) !== 0); } else hit(x.kind === 'quadSent' && x.pr.pairs === 0 && (says('사다리꼴', true) || says('평행사변형', true)));
            break;
          case TAGS.perpAsPara: { const [, a, b] = /^직선 (\S)와 직선 (\S)$/.exec(t); const la = x.fig.items.find((it) => it.label === a); const lb = x.fig.items.find((it) => it.label === b); hit(dot(sub(la.b, la.a), sub(lb.b, lb.a)) === 0); break; }
          case TAGS.slantAsDist:
            if (x.kind === 'dist') hit(x.fig.items.some((it) => it.len && Math.abs(Math.hypot(...sub(it.b, it.a)) - v) < EPS && dot(sub(it.b, it.a), [1, 0]) !== 0));
            else { const it = x.fig.items.find((i2) => `선분 ${i2.label}` === t); hit(dot(sub(it.b, it.a), [1, 0]) !== 0); }
            break;
          case TAGS.eqNotIsos: hit(x.pr.eq === 3 && says('정삼각형', true) && says('이등변삼각형', false)); break;
          case TAGS.twoAsAll: hit(x.pr.eq === 1 && says('정삼각형', true)); break;
          case TAGS.missEqual: hit(x.pr.eq >= 1 && (says('이등변삼각형', false) || (x.pr.eq === 3 && says('정삼각형', false)))); break;
          case TAGS.looksEqual: hit(x.pr.eq === 0 && (says('이등변삼각형', true) || says('정삼각형', true))); break;
          case TAGS.missSide: hit(v === x.shown[0] + x.shown[1]); break;
          case TAGS.allEqual: hit(v === 3 * x.a); break;
          case TAGS.wrongPair: hit(v === x.a + 2 * x.s.find((u) => u !== x.a)); break;
          case TAGS.isoAngleSub: hit(x.kind === 'isoAng' && v === 180 - Math.round(x.got[x.i])); break;
          case TAGS.isoApex: hit(x.kind === 'isoAng' && v === Math.round(x.got[2])); break;
          case TAGS.oneAcute: hit(t === '예각삼각형' ? x.ty !== '예각삼각형' : x.target === '예각삼각형' && x.list[t] !== '예각삼각형'); break;
          case TAGS.rightAsObtuse: hit(t === '둔각삼각형' ? x.ty === '직각삼각형' : x.target === '둔각삼각형' && x.list[t] === '직각삼각형'); break;
          case TAGS.wrongBiggest: hit(x.kind === 'triType' ? t !== x.ty && t !== '예각삼각형' : x.list[t] !== x.target); break;
          case TAGS.trapOnlyOne: hit(x.kind === 'cant' ? t === '사다리꼴' && x.pr.pairs === 2 : x.pr.pairs === 2 && says('사다리꼴', false)); break;
          case TAGS.oneAsTwo: hit(x.pr.pairs === 1 && says('평행사변형', true)); break;
          case TAGS.missParallel: hit(x.pr.pairs >= 1 && (says('사다리꼴', false) || (x.pr.pairs === 2 && says('평행사변형', false)))); break;
          case TAGS.oppAsAdj: hit(x.kind === 'paraAng' && (x.i + 2) % 4 === x.f.mode.indexOf('val') && v === 180 - x.known[0]); break;
          case TAGS.adjSame: hit(x.kind === 'paraAng' && (x.i + 2) % 4 !== x.f.mode.indexOf('val') && v === x.known[0]); break;
          case TAGS.rhomRight: hit(x.pr.names.마름모 && !x.pr.allRight && (says('직사각형', true) || t.endsWith('네 각이 모두 직각이에요'))); break;
          case TAGS.sidesAsSquare: hit(x.pr.allEq && !x.pr.allRight && says('정사각형', true)); break;
          case TAGS.tiltNotSquare: hit(x.pr.names.정사각형 && sentTruth(t, x.pr) === false); break;
          case TAGS.rightAsRhom: hit(x.pr.allRight && !x.pr.allEq && says('마름모', true)); break;
          case TAGS.rectAsSquare: hit(x.pr.allRight && !x.pr.allEq && (says('정사각형', true) || t.endsWith('네 변의 길이가 모두 같아요'))); break;
          case TAGS.squareNotRect: hit(x.pr.names.정사각형 && says('직사각형', false)); break;
          case TAGS.squareNotRhom: hit(x.pr.names.정사각형 && says('마름모', false)); break;
          case TAGS.specialNotPara: hit(x.pr.pairs === 2 && (x.kind === 'cant' ? t === '평행사변형' : says('평행사변형', false))); break;
          case TAGS.countWrong: hit(Math.abs(Object.entries(x.NG).find(([, nm]) => nm === t)[0] - x.n) === 1); break;
          case TAGS.sidesOnlyReg: hit(x.pr.allEq && !x.pr.allAng && t.includes('정다각형이에요')); break;
          case TAGS.anglesOnlyReg: hit(x.pr.allAng && !x.pr.allEq && t.includes('정다각형이에요')); break;
          case TAGS.wrongReason: hit(t.includes('정다각형이 아니에요') && sentTruth(t, x.pr) === false); break;
          case TAGS.diagNoHalf: hit(v === x.n * (x.n - 3)); break;
          case TAGS.diagWithSides: hit(v === (x.n * (x.n - 1)) / 2); break;
          case TAGS.diagOneVertex: hit(v === x.n - 3); break;
          case TAGS.triAs360: hit(x.kind === 'triAng' && v === 360 - x.known[0] - x.known[1]); break;
          case TAGS.addNotSub: hit(v === x.known.reduce((a, b) => a + b, 0)); break;
          case TAGS.missOne: hit(x.kind === 'triAng' ? v === 180 - x.known[0] : v === 360 - x.known[0] - x.known[1]); break;
          case TAGS.noHalfBase: hit(x.kind === 'isoAng' && v === 2 * Math.round(x.got[x.i])); break;
          case TAGS.apexAsBase: hit(x.kind === 'isoAng' && v === Math.round(x.got[2])); break;
          case TAGS.sumNotEach: hit(v === (x.n - 2) * 180); break;
          case TAGS.centerAngle: hit(v === 360 / x.n); break;
          default: assert.fail(`${where}: 검사 없는 이름표`);
        }
      }
    }
  }
  // ② 문항에만 쓰는 이름표(없으면 ①에서 20번↑)
  for (const tag of Object.values(TAGS)) assert.ok((seen[tag] || 0) >= 20 || MISREAD_ONLY.includes(tag), `"${tag}" 오답을 충분히 검사해야 한다 (${seen[tag] || 0}건)`);
});
const MISREAD_ONLY = [];

test('★ ② 오개념 문항: 보여 준 말은 정말 틀렸다 · 고친 답은 맞다 · 진단 보기가 우연히 맞지 않다 · 갈래 열쇠', () => {
  const branches = {};
  for (const c of SHAPE) {
    for (let s = 1; s <= SEEDS; s++) {
      const q = makeQuestion(c.id, 'misread', s * 7717, OPTS);
      const where = `${c.id} seed ${s}: ${q.q.replace(/\n/g, ' ')}`;
      assert.ok(/^misread:/.test(q.key || ''), where);
      branches[`${c.id} ${q.key}`] = (branches[`${c.id} ${q.key}`] || 0) + 1;
      const shown = /\*\*(.+)\*\*/.exec(q.q)[1];
      const ok = q.choices.find((x) => x.ok).text;
      const wrongs = q.choices.filter((x) => !x.ok && x.tag !== '틀린 줄 모름');
      const F = readFig(plain(q.q)); const f = F[0];
      const lineOf = (lab) => f.items.find((it) => it.label === lab);
      const dirL = (it) => sub(it.b, it.a);
      const key = q.key.slice(8);
      if (c.id === 'shp.perp') {
        const base = lineOf('㉮');
        const said = /^직선 (\S)는/.exec(shown)[1];
        assert.notEqual(dot(dirL(lineOf(said)), dirL(base)), 0, `${where}: 보여 준 직선이 사실 수직`);
        const good = /직선 (\S)$/.exec(ok)[1];
        assert.equal(dot(dirL(lineOf(good)), dirL(base)), 0, `${where}: 고친 답의 직선이 수직이 아니다`);
        for (const w of wrongs) { const mm = /직선 (\S)/.exec(w.text); if (mm) assert.notEqual(dot(dirL(lineOf(mm[1])), dirL(base)), 0, `${where}: 오답 "${w.text}"이 사실 맞다`); }
        if (key === 'upright') assert.ok(lineOf(said).a[0] === lineOf(said).b[0], `${where}: 세로 직선이 아니다`);
      } else if (c.id === 'shp.para' && key === 'dist') {
        const [p1, p2] = f.items.filter((it) => !it.label);
        const d = Math.abs(cross(sub(p2.a, p1.a), dirL(p1))) / Math.hypot(...dirL(p1));
        assert.notEqual(lastNum(shown), d, where); assert.equal(lastNum(ok), d, where);
        for (const w of wrongs) if (lastNum(w.text) !== null) assert.notEqual(lastNum(w.text), d, where);
      } else if (c.id === 'shp.para') {
        const [, a, n] = /직선 (\S)와 직선 (\S)는/.exec(shown);
        assert.notEqual(cross(dirL(lineOf(a)), dirL(lineOf(n))), 0, `${where}: 보여 준 두 직선이 사실 평행`);
        const [, g1, g2] = /직선 (\S)와 직선 (\S)$/.exec(ok);
        assert.equal(cross(dirL(lineOf(g1)), dirL(lineOf(g2))), 0, `${where}: 고친 답이 평행이 아니다`);
        for (const w of wrongs) { const mm = /직선 (\S)와 직선 (\S)/.exec(w.text); if (mm) assert.notEqual(cross(dirL(lineOf(mm[1])), dirL(lineOf(mm[2]))), 0, where); }
      } else if (c.id === 'shp.isos') {
        const pr = triProps(f.sides);
        if (key === 'eq') assert.equal(pr.eq, 3, where); else { assert.equal(pr.eq, 1, where); assert.ok(/정삼각형이에요$/.test(shown), where); }
        assert.ok(/이등변삼각형이에요$/.test(ok), where);
      } else if (c.id === 'shp.acute') {
        const ty = triType(measured(f.raw));
        assert.ok(!shown.endsWith(`${ty}이에요`), `${where}: 보여 준 말이 사실 맞다`);
        assert.ok(ok.includes(ty), `${where}: 고친 답에 ${ty}이 없다`);
        for (const w of wrongs) assert.ok(!w.text.includes(ty), `${where}: 오답 "${w.text}"이 사실 맞다`);
      } else if (c.id === 'shp.trap' && key === 'opp') {
        const got = Math.round(measured(f.raw)[2]);
        assert.notEqual(lastNum(shown), got, where); assert.equal(lastNum(ok), got, where);
        for (const w of wrongs) if (lastNum(w.text) !== null) assert.notEqual(lastNum(w.text), got, where);
      } else if (c.id === 'shp.angle') {
        const i = f.mode.indexOf('ask'); const got = Math.round(measured(f.raw)[i]);
        assert.notEqual(lastNum(shown), got, where); assert.equal(lastNum(ok), got, where);
        for (const w of wrongs) if (lastNum(w.text) !== null) assert.notEqual(lastNum(w.text), got, where);
      } else if (c.id === 'shp.poly' && key === 'diag') {
        const n = f.n; const right = (n * (n - 1)) / 2 - n;
        assert.notEqual(lastNum(shown), right, where); assert.equal(lastNum(ok), right, where);
        for (const w of wrongs) if (lastNum(w.text) !== null) assert.notEqual(lastNum(w.text), right, where);
      } else {
        // 모눈 위 사각형 — 보여 준 말(이름 주장)은 거짓, 고친 답의 이름은 참
        const pr = props(f.verts.map((v) => v.p));
        const claims = { 'shp.trap only': !pr.names.사다리꼴, 'shp.rhom tilt': !pr.names.정사각형, 'shp.rhom right': pr.allRight, 'shp.relate square': !pr.names.직사각형, 'shp.relate rect': !pr.names.평행사변형, 'shp.poly reg': pr.allEq && pr.allAng };
        const k2 = `${c.id} ${key}`;
        assert.ok(k2 in claims, `${where}: 이 ② 모양을 모른다`);
        assert.equal(claims[k2], false, `${where}: 보여 준 말이 사실 맞다`);
      }
    }
  }
  for (const [k, n] of Object.entries(branches)) assert.ok(n >= 100, `${k} 갈래가 드물다 (${n})`);
  assert.equal(Object.keys(branches).length, 18, Object.keys(branches).join(', '));
});

test('★ 조사: 수 뒤 · ㄱ·ㄴ 자모 뒤(변 ㄱㄴ과·ㄷ은) · ㉮ 뒤(와·는) · ㉠ 뒤(과·은)', () => {
  const BAT = new Set(['0', '1', '3', '6', '7', '8']);
  const PAIR = { 이: true, 가: false, 을: true, 를: false, 은: true, 는: false, 과: true, 와: false };
  let checked = 0;
  for (const c of SHAPE) {
    for (let s = 1; s <= 300; s++) {
      for (const kind of ['calc', 'misread']) {
        const q = makeQuestion(c.id, kind, s * 3571, OPTS);
        for (const t0 of [q.q, ...q.choices.map((x) => x.text), ...q.solve.steps, q.solve.whyAny, ...Object.values(q.solve.why)]) {
          const t = String(t0).replace(/\[[a-z]+ [^\]]+\]/g, '');
          // 70°는 "70도는"으로 읽는다 — ° 뒤는 받침 없는 조사
          for (const m of t.matchAll(/(\d+)(°?)(이|가|을|를|은|는|과|와)(?![가-힣])/g)) { checked++; assert.equal(PAIR[m[3]], m[2] ? false : BAT.has(m[1].slice(-1)), `${c.id}/${kind} seed ${s}: "${m[0]}" (${t})`); }
          assert.doesNotMatch(t, /[ㄱ-ㅎ](가|를|는|와|로)(?![가-힣])/, `${c.id}/${kind} seed ${s}: 자모 뒤 조사 — ${t}`);
          assert.doesNotMatch(t, /[㉮-㉱](이|을|은|과)(?![가-힣])/, `${c.id}/${kind} seed ${s}: ㉮ 뒤 조사 — ${t}`);
          assert.doesNotMatch(t, /[㉠-㉢](가|를|는|와)(?![가-힣])/, `${c.id}/${kind} seed ${s}: ㉠ 뒤 조사 — ${t}`);
          assert.doesNotMatch(t, /사다리꼴(예요|가 |는 |를 )|마름모(이에요|이 |은 |을 )|각형(예요|가 |는 |를 )/, `${c.id}/${kind} seed ${s}: 도형 이름 뒤 조사 — ${t}`);
        }
      }
    }
  }
  assert.ok(checked > 300, `조사 검사 ${checked}건`);
});

test('★ 풀이 카드: 단계 2줄↑ · 기억할 것 · 오답마다 왜 · 수 정답은 단계에 나온다', () => {
  for (const c of SHAPE) {
    for (const kind of ['calc', 'misread']) {
      for (let s = 1; s <= 400; s++) {
        const q = makeQuestion(c.id, kind, s * 131, OPTS);
        const where = `${c.id}/${kind} seed ${s}`;
        assert.ok(q.solve && q.solve.steps.length >= 2 && q.solve.rule, where);
        for (const ch of q.choices) if (!ch.ok) assert.ok(q.solve.why[ch.tag] || q.solve.whyAny, `${where}: 오답 "${ch.tag}" 설명 없음`);
        if (kind !== 'calc') continue;
        const ok = q.choices.find((x) => x.ok).text;
        if (/^\d+$/.test(ok)) assert.ok(q.solve.steps.some((st) => nums(st).includes(Number(ok))), `${where}: 풀이에 정답 ${ok} 없음 — ${q.solve.steps.join(' / ')}`);
      }
    }
  }
});

test('🔁 쌍둥이·🤔 노트: 요청한 틀·갈래로 온다 · 원래 문제와 글자까지 같은 쌍둥이는 틀마다 30% 이하', () => {
  let tried = 0;
  for (const c of SHAPE) {
    for (const kind of ['calc', 'misread']) {
      const keys = new Set();
      for (let s = 1; s <= 300; s++) keys.add(makeQuestion(c.id, kind, s * 37, OPTS).key);
      for (const key of keys) {
        for (let s = 1; s <= 60; s++) {
          const q = makeQuestion(c.id, kind, s * 911, { ...OPTS, want: { k: kind, key } });
          tried++;
          assert.equal(q.key, key, `${c.id}/${kind} seed ${s}: ${key.slice(0, 60)}를 요청했는데 ${q.key.slice(0, 60)}`);
        }
      }
      const byKey = {};
      for (let s = 1; s <= 400; s++) {
        const q = makeQuestion(c.id, kind, s * 131, OPTS);
        const t = makeQuestion(c.id, kind, s * 131 + 7, { ...OPTS, want: { k: kind, key: q.key } });
        const b = (byKey[q.key] = byKey[q.key] || { n: 0, same: 0 });
        b.n++; if (t.q === q.q) b.same++;
      }
      for (const [key, b] of Object.entries(byKey)) if (b.n >= 20) assert.ok(b.same / b.n <= 0.3, `${c.id}/${kind} "${key.slice(0, 50)}": 쌍둥이 ${b.same}/${b.n}가 같은 글`);
    }
  }
  assert.ok(tried > 2000, `검사 ${tried}건`);
});

// ── 글 속 셈식 검산 — °를 떼고 괄호까지: "180° − 50° − 60° = 70°" ──
function evalExpr(src) {
  const toks = src.replace(/\s+/g, '').match(/\d+|[+−×÷()]/g) || [];
  let i = 0;
  const peek = () => toks[i];
  function atom() { const t = toks[i++]; if (t === '(') { const v = sum(); if (toks[i++] !== ')') throw new Error('paren'); return v; } if (!/^\d+$/.test(t || '')) throw new Error('num'); return Number(t); }
  function prod() { let v = atom(); while (peek() === '×' || peek() === '÷') { const o = toks[i++]; const w = atom(); v = o === '×' ? v * w : v / w; } return v; }
  function sum() { let v = prod(); while (peek() === '+' || peek() === '−') { const o = toks[i++]; const w = prod(); v = o === '+' ? v + w : v - w; } return v; }
  const v = sum(); if (i !== toks.length) throw new Error('left');
  return v;
}
function badArith(text) {
  const bad = [];
  const T = '\\(?\\d+\\)?'; const E = `${T}(?: [+−×÷] ${T})*`;
  for (const m of plain(text).replace(/°/g, '').matchAll(new RegExp(`(?<![\\d.)])(?<![+−×÷] )${E}(?: = ${E})+`, 'g'))) {
    let parts;
    try { parts = m[0].split(' = ').map(evalExpr); } catch { continue; }
    if (parts.some((v) => Math.abs(v - parts[0]) > EPS)) bad.push(m[0]);
  }
  return bad;
}

test('★ 글 속 셈식이 모두 맞다 (° 떼고, 괄호 포함)', () => {
  assert.deepEqual(badArith('180° − 50° − 60° = 70°'), []);
  assert.deepEqual(badArith('180° − 50° = 120°'), ['180 − 50 = 120']);
  assert.deepEqual(badArith('6 × 3 ÷ 2 = 9'), []);
  let checked = 0;
  for (const c of SHAPE) {
    for (let s = 1; s <= 500; s++) {
      for (const kind of ['calc', 'misread']) {
        const q = makeQuestion(c.id, kind, s * 2027, OPTS);
        for (const t of [q.q, ...q.choices.map((x) => x.text), ...q.solve.steps, q.solve.whyAny, ...Object.values(q.solve.why)]) { checked++; assert.deepEqual(badArith(t), [], `${c.id}/${kind} seed ${s}: ${t}`); }
      }
    }
  }
  assert.ok(checked > 10000, `${checked}건`);
});

test('아직 안 배운 말을 앞 칸에서 쓰지 않는다 — 평행 J2 · 이등변·정삼각형 J3 · 예각·둔각삼각형 J4 · 사다리꼴·평행사변형 J5 · 마름모 J6 · 다각형·대각선 J8 · 각의 합 J9', () => {
  const LATER = [[/평행/, 'shp.para'], [/이등변삼각형|정삼각형/, 'shp.isos'], [/예각삼각형|둔각삼각형/, 'shp.acute'], [/사다리꼴|평행사변형/, 'shp.trap'], [/마름모/, 'shp.rhom'], [/다각형|대각선/, 'shp.poly'], [/각의 (크기의 )?합/, 'shp.angle']];
  const at = (id) => SHAPE.findIndex((c) => c.id === id);
  for (const [i, c] of SHAPE.entries()) {
    const early = LATER.filter(([, id]) => at(id) > i).map(([re]) => re);
    if (!early.length) continue;
    for (let s = 1; s <= 300; s++) {
      for (const kind of ['calc', 'misread']) {
        const q = makeQuestion(c.id, kind, s * 881, OPTS);
        const kid = [q.q, ...q.choices.map((x) => x.text), ...q.solve.steps, q.solve.whyAny, q.solve.rule, ...Object.values(q.solve.why), c.idea, c.slip].join(' / ');
        for (const re of early) assert.doesNotMatch(kid, re, `${c.id}/${kind} seed ${s}: ${kid.slice(0, 200)}`);
      }
    }
  }
});

test('그림 이름표: 서로 겹치지 않고 · 도형 외곽선을 가로지르지 않고 · 그림 밖으로 안 나간다 — 생성기 문제의 모든 J 그림', () => {
  let labels = 0;
  const wide = (ch) => /[ㄱ-ㅎ가-힣㉠-㉯]/.test(ch);
  const boxes = (svg) => [...svg.matchAll(/<text x="([\d.-]+)" y="([\d.-]+)" font-size="(\d+)" text-anchor="(\w+)"[^>]*>([^<]*)<\/text>/g)].map((m) => {
    labels++;
    const x = +m[1]; const y = +m[2]; const fs = +m[3]; const w = [...m[5]].reduce((a, ch) => a + fs * (wide(ch) ? 0.95 : ch === '°' ? 0.4 : 0.55), 0);
    const x0 = m[4] === 'middle' ? x - w / 2 : m[4] === 'end' ? x - w : x;
    return { t: m[5], x0, x1: x0 + w, y0: y - fs * 0.73, y1: y + fs * 0.2 };
  });
  const hit = (a, b) => a.x0 < b.x1 - 1 && b.x0 < a.x1 - 1 && a.y0 < b.y1 - 1 && b.y0 < a.y1 - 1;
  const outline = (svg) => { const p = /<polygon points="([^"]+)"/.exec(svg)[1].trim().split(/\s+/).map((s) => s.split(',').map(Number)); return p.map((a, i) => [a, p[(i + 1) % p.length]]); };
  function crosses([a, b], B) {
    const x0 = B.x0 + 1; const x1 = B.x1 - 1; const y0 = B.y0 + 1; const y1 = B.y1 - 1;
    let t0 = 0; let t1 = 1; const dx = b[0] - a[0]; const dy = b[1] - a[1];
    for (const [p, q] of [[-dx, a[0] - x0], [dx, x1 - a[0]], [-dy, a[1] - y0], [dy, y1 - a[1]]]) {
      if (p === 0) { if (q < 0) return false; continue; }
      const r = q / p;
      if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
    }
    return true;
  }
  const figs = new Set();
  for (const c of SHAPE) for (let s = 1; s <= 600; s++) for (const kind of ['calc', 'misread']) for (const f of makeQuestion(c.id, kind, s * 409, OPTS).q.match(/\[[a-z]+ [^\]]+\]/g) || []) figs.add(f.slice(1, -1));
  for (const t of strings(CONTENT)) for (const f of t.match(/\[[a-z]+ [^\]]+\]/g) || []) figs.add(f.slice(1, -1)); // 원고 그림도
  const bad = [];
  for (const f of figs) {
    const svg = figureSvg(f);
    const B = boxes(svg);
    for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) if (hit(B[i], B[j])) bad.push(`${f}: "${B[i].t}" ↔ "${B[j].t}"`);
    if (/<polygon/.test(svg)) for (const b of B) if (outline(svg).some((e) => crosses(e, b))) bad.push(`${f}: "${b.t}"이 외곽선을 가로지름`);
    // 직선 그림: 이름표가 그려진 직선에 얹히면 어느 선의 이름인지 헷갈린다 (굵은 선만 — 모눈선은 빼고)
    const lines = [...svg.matchAll(/<line x1="([\d.-]+)" y1="([\d.-]+)" x2="([\d.-]+)" y2="([\d.-]+)" stroke="currentColor" stroke-width="2.2"/g)].map((m) => [[+m[1], +m[2]], [+m[3], +m[4]]]);
    for (const b of B) if (lines.some((e) => crosses(e, b))) bad.push(`${f}: "${b.t}"이 직선에 얹힘`);
    // 직선 이름(㉮)은 이름표 가운데에서 제 선이 남의 어느 선보다 가깝다(그림은 6px, 여기선 반올림 몫을 빼고 5px) — 끝이 남의 선 위면 두 선에서 같은 거리에 앉았다
    if (f.startsWith('lines ')) {
      const own = f.split(/\s+/).slice(3).map((tok) => (/^(\S):/.exec(tok) || [])[1] || null);
      const pd = ([px, py], [[ax, ay], [bx, by]]) => { const vx = bx - ax; const vy = by - ay; const u = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy))); return Math.hypot(px - ax - u * vx, py - ay - u * vy); };
      for (const b of B) {
        if ([...b.t].length !== 1) continue; // "㉠ 4 cm" 길이표는 빼고
        const me = own.indexOf(b.t); const c = [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2];
        if (lines.some((e, i) => i !== me && pd(c, e) < pd(c, lines[me]) + 5)) bad.push(`${f}: "${b.t}"이 남의 선에 더 가깝거나 같음`);
      }
    }
    const [, vw, vh] = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg).map(Number);
    for (const b of B) if (b.x0 < 0 || b.y0 < 0 || b.x1 > vw || b.y1 > vh) bad.push(`${f}: "${b.t}"이 그림 밖`);
  }
  assert.ok(figs.size > 800 && labels > 3000, `도형 ${figs.size}개 · 이름표 ${labels}개`);
  assert.deepEqual(bad.slice(0, 12), [], `${bad.length}건`);
});

test('📏 진단·사다리·한 편·배움 예비·내용 검사 · 가족 지어내지 않기', () => {
  const d = diagnosticSet(9, 5, OPTS);
  assert.deepEqual(d.map((q) => q.concept), ['shp.perp', 'shp.isos', 'shp.trap', 'shp.relate', 'shp.angle']);
  const pl = placeFrom([{ concept: 'shp.perp', correct: true }, { concept: 'shp.isos', correct: false }]);
  assert.equal(pl.startId, 'shp.isos');
  assert.deepEqual(pl.knownIds, ['shp.perp', 'shp.para']);
  assert.deepEqual(ladder(['shp.perp']).slice(0, 3).map((x) => x.state), ['done', 'now', 'locked']);
  for (const c of SHAPE) {
    assert.deepEqual(makeRound(c.id, 5, OPTS).map((q) => q.kind), ['calc', 'misread']);
    assert.equal(lessonOf(c.id, 1, OPTS).pages.length, 1);
    for (let s = 1; s <= 200; s++) for (const kind of ['calc', 'misread']) assert.doesNotMatch(JSON.stringify(makeQuestion(c.id, kind, s * 57, OPTS)), /동생|누나|언니|엄마|아빠|할아버지/);
  }
  assert.equal(conceptById('shp.nope'), null);
  assert.equal(checkContent({}).filter((x) => /내용 없음/.test(x)).length, 9);
});

// ── 사람이 쓴 원고 (coach/math/shape.json) ──
test('원고(shape.json)가 형식 검사를 통과한다 — 9칸 모두 배움 3장↑·확인 2개↑·아빠 카드 · 그림은 모두 그려진다', () => {
  assert.deepEqual(checkContent(CONTENT), []);
  for (const c of SHAPE) {
    const L = lessonOf(c.id, 3, { ...OPTS, content: CONTENT });
    assert.ok(L.pages.length >= 3, c.id);
    assert.ok(!/\{(me|mon)/.test(JSON.stringify(L)), `${c.id}: 이름 자리표시가 남았다`);
  }
  for (const t of strings(CONTENT)) for (const f of t.match(/\[[a-z]+ [^\]]+\]/g) || []) assert.ok(figureSvg(f.slice(1, -1)), `못 그리는 그림 ${f}`);
});

/** 확인 보기 값 — 단위(cm·°·개)를 떼고 수 하나 */
const lessonVal = (t) => { const s = String(t).trim().replace(/ ?(cm|°|개)$/, ''); return /^\d+$/.test(s) ? Number(s) : null; };

test('★ 원고 확인 질문도 따로 풀어 대조 — 전부 읽히고, 정답은 맞고, 오답은 정말 틀렸다 · 참인 보기는 정답 하나', () => {
  let total = 0; const unread = [];
  for (const c of SHAPE) {
    const L = lessonOf(c.id, 3, { ...OPTS, content: CONTENT });
    for (const [i, p] of L.pages.entries()) {
      if (!p.check) continue;
      total++;
      const where = `${c.id}[${i}] "${p.check.q.replace(/\n/g, ' ')}"`;
      const w = solveText(p.check.q);
      if (!w) { unread.push(where); continue; }
      const all = [p.check.ok, ...p.check.no];
      if (w.v !== undefined) {
        assert.equal(lessonVal(p.check.ok), w.v, `${where} — 따로 푼 답 ${w.v} ≠ 원고 정답 ${p.check.ok}`);
        for (const n of p.check.no) { assert.notEqual(lessonVal(n), null, `${where} — 오답 ${n}을 못 읽는다`); assert.notEqual(lessonVal(n), w.v, `${where} — 오답 ${n}이 사실 정답`); }
      } else {
        const truths = all.map(w.truth);
        assert.ok(truths.every((t) => t !== null), `${where} — 못 읽는 보기 ${all.filter((_, k) => truths[k] === null).join(' / ')}`);
        assert.deepEqual(truths, [true, ...p.check.no.map(() => false)], `${where} — 참인 보기는 정답 하나뿐이어야`);
      }
    }
  }
  assert.deepEqual(unread, [], '해석기가 못 읽은 확인 질문 — solveText에 말투를 더할 것');
  assert.ok(total >= 27, `확인 질문 ${total}개`);
});

test('★ 배움 글의 굵은 각도가 그 장 그림의 "?" 각을 잰 값과 같다', () => {
  let checked = 0;
  for (const c of SHAPE) {
    for (const [i, p] of CONTENT[c.id].lesson.entries()) {
      const F = readFig(p.say).filter((f) => f.kind === 'tria' || f.kind === 'quad');
      if (F.length !== 1) continue;
      const f = F[0]; const k = f.mode.indexOf('ask'); if (k < 0) continue;
      const got = Math.round(measured(f.raw)[k]);
      // 그 장의 답 = 마지막으로 굵게 적힌 각도 ("180° × 2 = **360°**"처럼 앞의 굵은 합은 답이 아니다)
      const bold = [...p.say.matchAll(/\*\*(\d+)°\*\*/g)].map((m) => +m[1]);
      if (!bold.length) continue;
      checked++;
      assert.equal(bold[bold.length - 1], got, `${c.id}[${i}] 마지막 굵은 각도 ${bold[bold.length - 1]}° — 그림의 ? 각은 ${got}°`);
    }
  }
  assert.ok(checked >= 5, `굵은 각도 ${checked}개`);
});

test('★ 원고의 셈식(° 떼고)·수 뒤 조사·자모·㉮·㉠ 뒤 조사 (배움 글·확인 질문·아빠 카드 전부)', () => {
  const BAT = new Set(['0', '1', '3', '6', '7', '8']);
  const PAIR = { 이: true, 가: false, 을: true, 를: false, 은: true, 는: false, 과: true, 와: false };
  let checked = 0;
  for (const t0 of strings(CONTENT)) {
    assert.deepEqual(badArith(t0), [], `틀린 셈식 — ${t0}`);
    const t = t0.replace(/\[[a-z]+ [^\]]+\]/g, '');
    for (const m of t.matchAll(/(\d+)(°?)(이|가|을|를|은|는|과|와)(?![가-힣])/g)) { checked++; assert.equal(PAIR[m[3]], m[2] ? false : BAT.has(m[1].slice(-1)), `"${m[0]}" — ${t}`); }
    assert.doesNotMatch(t, /[ㄱ-ㅎ](가|를|는|와|로)(?![가-힣])/, `자모 뒤 조사 — ${t}`);
    assert.doesNotMatch(t, /[㉮-㉱](이|을|은|과)(?![가-힣])/, `㉮ 뒤 조사 — ${t}`);
    assert.doesNotMatch(t, /[㉠-㉢](가|를|는|와)(?![가-힣])/, `㉠ 뒤 조사 — ${t}`);
    assert.doesNotMatch(t, /사다리꼴(예요|가 |는 |를 )|마름모(이에요|이 |은 |을 )|각형(예요|가 |는 |를 )/, `도형 이름 뒤 조사 — ${t}`);
  }
  assert.ok(checked >= 5, `조사 검사 ${checked}건`);
});

test('원고도 아직 안 배운 말을 앞 칸에서 쓰지 않는다 (평행 J2 · 이등변·정삼각형 J3 · 예각·둔각삼각형 J4 · 사다리꼴·평행사변형 J5 · 마름모 J6 · 다각형·대각선 J8 · 각의 합 J9)', () => {
  const LATER = [[/평행/, 'shp.para'], [/이등변삼각형|정삼각형/, 'shp.isos'], [/예각삼각형|둔각삼각형/, 'shp.acute'], [/사다리꼴|평행사변형/, 'shp.trap'], [/마름모/, 'shp.rhom'], [/다각형|대각선/, 'shp.poly'], [/각의 (크기의 )?합/, 'shp.angle']];
  const at = (id) => SHAPE.findIndex((c) => c.id === id);
  for (const [i, c] of SHAPE.entries()) {
    for (const [re, id] of LATER) if (at(id) > i) for (const t of strings(CONTENT[c.id])) assert.doesNotMatch(t, re, `${c.id} 원고: ${t.slice(0, 120)}`);
  }
});
