// 🔺 I 다각형의 둘레와 넓이 줄기 생성기 테스트: node --test tests/matharea.test.js
//
// ★ 핵심은 **독립 검산** — 생성기가 알려 주는 값(probe)을 믿지 않고 **문제 글과 그림 지시문을 이 파일이 직접 읽어**
//   꼭짓점을 따로 세우고, 넓이는 신발끈 공식·둘레는 변 길이의 합으로 다시 구한다 (공식을 쓰지 않는다 — 공식이 틀려도 잡힌다).
// ★ 그림이 거짓말하지 않는지: 그림에 적힌 옆변 길이 = 실제 꼭짓점 사이 거리, 숨긴 "?"는 그림에 안 보인다.
// ★ 씨앗은 개념마다 수천 개 (AREA_SEEDS=20000으로 넓게).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  AREA, TAGS, makeQuestion, makeRound, conceptById, ladder, placeFrom, diagnosticSet, lessonOf, checkContent, gradeLabel, valueOf,
} from '../js/matharea.js';
import { figureSvg, figText } from '../js/mathdraw.js';

const OPTS = { names: ['피카츄', '리자몽', '개굴닌자'], me: '진우', worlds: { pokemon: [], toystory: [], minions: [], moana: [] } };
const SEEDS = Number(process.env.AREA_SEEDS) || 1500;

const nums = (t) => (String(t).match(/\d+/g) || []).map(Number);
const lastNum = (t) => { const n = nums(t); return n.length ? n[n.length - 1] : null; };
const plain = (q) => String(q).replace(/\*\*/g, '');
const EPS = 1e-9;

// ── 도형: 지시문 → 꼭짓점 (이 파일이 따로 세운다) ──
function shapeOf(kind, arg) {
  const um = / (cm|m)$/.exec(arg); const unit = um ? um[1] : 'cm';
  const v = arg.replace(/ (cm|m)$/, '');
  let m;
  if (kind === 'rect' && (m = /^(\d+)x(\??)(\d+)$/.exec(v))) { const [W, H] = [+m[1], +m[3]]; return { kind, unit, W, H, hidden: m[2] === '?', pts: [[0, 0], [W, 0], [W, H], [0, H]] }; }
  if (kind === 'reg' && (m = /^(\d+) (\d+)$/.exec(v))) {
    const [n, s] = [+m[1], +m[2]]; const R = s / (2 * Math.sin(Math.PI / n));
    return { kind, unit, n, s, pts: Array.from({ length: n }, (_, i) => [R * Math.cos((2 * Math.PI * i) / n), R * Math.sin((2 * Math.PI * i) / n)]) };
  }
  if (kind === 'grid' && (m = /^(\d+)x(\d+)(?: -(\d+)x(\d+))?$/.exec(v))) {
    const [W, H, w, h] = [+m[1], +m[2], m[3] ? +m[3] : 0, m[4] ? +m[4] : 0];
    const pts = w ? [[0, 0], [W, 0], [W, H - h], [W - w, H - h], [W - w, H], [0, H]] : [[0, 0], [W, 0], [W, H], [0, H]];
    return { kind, unit: 'cm', W, H, w, h, pts };
  }
  if (kind === 'para' && (m = /^(\d+) (\d+) (\d+)$/.exec(v))) { const [b, h, s] = [+m[1], +m[2], +m[3]]; return { kind, unit, b, h, s, pts: [[0, 0], [b, 0], [b + s, h], [s, h]] }; }
  if (kind === 'tri' && (m = /^(\d+) (\d+) (\d+)$/.exec(v))) { const [b, h, p] = [+m[1], +m[2], +m[3]]; return { kind, unit, b, h, p, pts: [[0, 0], [b, 0], [p, h]] }; }
  if (kind === 'rhom' && (m = /^(\d+) (\??)(\d+)$/.exec(v))) { const [d1, d2] = [+m[1], +m[3]]; return { kind, unit, d1, d2, hidden: m[2] === '?', pts: [[0, d2 / 2], [d1 / 2, 0], [d1, d2 / 2], [d1 / 2, d2]] }; }
  if (kind === 'trap' && (m = /^(\d+) (\d+) (\d+) (\d+)$/.exec(v))) { const [a, b, h, s] = [+m[1], +m[2], +m[3], +m[4]]; return { kind, unit, a, b, h, s, pts: [[0, 0], [b, 0], [s + a, h], [s, h]] }; }
  if (kind === 'lshape' && (m = /^(\d+) (\d+) (\d+) (\d+)$/.exec(v))) { const [W, H, w, h] = [+m[1], +m[2], +m[3], +m[4]]; return { kind, unit, W, H, w, h, pts: [[0, 0], [W, 0], [W, H - h], [W - w, H - h], [W - w, H], [0, H]] }; }
  return null;
}
const readShapes = (q) => [...String(q).matchAll(/\[(rect|reg|grid|para|tri|rhom|trap|lshape) ([^\]]+)\]/g)].map((m) => ({ ...shapeOf(m[1], m[2]), raw: m[0] }));
/** 신발끈 공식 — 공식(가로 × 세로, ÷ 2…)을 쓰지 않는 넓이 */
const shoelace = (pts) => Math.abs(pts.reduce((a, p, i) => { const q = pts[(i + 1) % pts.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
const perimeter = (pts) => pts.reduce((a, p, i) => { const q = pts[(i + 1) % pts.length]; return a + Math.hypot(q[0] - p[0], q[1] - p[1]); }, 0);
const round = (x) => { assert.ok(Math.abs(x - Math.round(x)) < 1e-6, `정수가 아닌 값 ${x}`); return Math.round(x); };

/** 넓이 비교 문장 참거짓 */
function cmpTruth(t, A1, A2) {
  if (t === '㉮와 ㉯의 넓이는 같아요') return A1 === A2;
  if (t === '㉮의 넓이가 더 넓어요') return A1 > A2;
  if (t === '㉯의 넓이가 더 넓어요') return A2 > A1;
  if (t === '모양이 달라서 비교할 수 없어요') return false;
  return null;
}

/**
 * 문제 글 → 정답 (생성기와 따로). { v } 수 · { sent } 참인 문장이 딱 하나 — ctx: 이름표 확인용 재료
 */
function solveText(q0) {
  const q = plain(q0);
  let m;
  // 넓이 단위 바꾸기
  if ((m = /^(\d+) m²는 몇 cm²일까요/.exec(q)) || (m = /바닥은 (\d+) m²예요\. 이 넓이는 몇 cm²일까요/.exec(q))) return { v: +m[1] * 100 * 100, ctx: { kind: 'conv', from: +m[1], f: 10000 } };
  if ((m = /^(\d+) cm²는 몇 m²일까요/.exec(q))) { const v = +m[1] / (100 * 100); assert.ok(Number.isInteger(v), q); return { v, ctx: { kind: 'convDown', from: +m[1], f: 10000 } }; }
  if ((m = /^(\d+) km²는 몇 m²일까요/.exec(q))) return { v: +m[1] * 1000 * 1000, ctx: { kind: 'conv', from: +m[1], f: 1000000 } };
  // 넓이로 길이를 거꾸로
  if ((m = /넓이가 (\d+) cm²이고 밑변이 (\d+) cm인 (평행사변형|삼각형)의 높이는 몇/.exec(q))) {
    const [A, b] = [+m[1], +m[2]]; const v = m[3] === '삼각형' ? (2 * A) / b : A / b;
    assert.ok(Number.isInteger(v), q);
    return { v, ctx: { kind: 'inv', shape: m[3], A, b } };
  }
  const S = readShapes(q);
  if ((m = /넓이가 (\d+) cm²이고 가로가 (\d+) cm인 직사각형/.exec(q)) && /세로는 몇/.test(q)) {
    const [A, W] = [+m[1], +m[2]];
    assert.equal(S.length, 1, q); assert.ok(S[0].hidden && S[0].W === W, `그림이 글과 다르거나 세로가 보인다: ${q}`);
    const v = A / W; assert.ok(Number.isInteger(v), q);
    return { v, ctx: { kind: 'inv', shape: '직사각형', A, b: W } };
  }
  if ((m = /넓이가 (\d+) cm²인 마름모의 한 대각선이 (\d+) cm예요/.exec(q)) && /다른 대각선은 몇/.test(q)) {
    const [A, d1] = [+m[1], +m[2]];
    assert.equal(S.length, 1, q); assert.ok(S[0].hidden && S[0].d1 === d1, `그림이 글과 다르거나 대각선이 보인다: ${q}`);
    const v = (2 * A) / d1; assert.ok(Number.isInteger(v), q);
    return { v, ctx: { kind: 'inv', shape: '마름모', A, b: d1 } };
  }
  // 넓이 비교 (두 도형)
  if (S.length === 2 && /넓이를 비교/.test(q)) {
    const [A1, A2] = S.map((s) => shoelace(s.pts));
    return { sent: (t) => cmpTruth(t, A1, A2), ctx: { kind: 'cmp' } };
  }
  if (S.length !== 1) return null;
  const s = S[0];
  // 글에 적힌 길이가 그림과 같은지
  if ((m = /한 변은 (\d+) cm예요/.exec(q))) assert.equal(+m[1], s.s, `글과 그림의 한 변이 다르다: ${q}`);
  if ((m = /한 변이 (\d+) cm인 정사각형/.exec(q))) assert.ok(s.W === +m[1] && s.H === +m[1], q);
  if (s.kind === 'reg') {
    const P = { 정삼각형: 3, 정사각형: 4, 정오각형: 5, 정육각형: 6, 정칠각형: 7, 정팔각형: 8 };
    const name = Object.keys(P).find((k) => q.includes(k)); assert.equal(P[name], s.n, `도형 이름과 변의 수가 다르다: ${q}`);
  }
  const area = shoelace(s.pts); const per = perimeter(s.pts); // 둘레는 물을 때만 정수여야 한다 (삼각형 오른쪽 변은 정수가 아닐 수 있다)
  const ctx = { kind: 'shape', s, area, per };
  if (/둘레는 몇|울타리는 모두 몇/.test(q)) return { v: round(per), ctx: { ...ctx, ask: 'perim' } };
  if ((m = /넓이는 몇 (cm²|m²)/.exec(q))) {
    const f = s.unit === 'm' && m[1] === 'cm²' ? 10000 : 1;
    assert.ok(!(s.unit === 'cm' && m[1] === 'm²'), `cm 그림에 m²를 묻는다: ${q}`);
    return { v: round(area) * f, ctx: { ...ctx, ask: 'area', f } };
  }
  return null;
}

test('독립 도형 읽기 자체 점검', () => {
  assert.equal(shoelace(shapeOf('para', '10 4 3').pts), 40);
  assert.equal(round(perimeter(shapeOf('para', '10 4 3').pts)), 30);
  assert.equal(shoelace(shapeOf('tri', '10 4 3').pts), 20);
  assert.equal(shoelace(shapeOf('rhom', '12 16').pts), 96);
  assert.equal(shoelace(shapeOf('trap', '5 12 4 3 m').pts), 34);
  assert.equal(shoelace(shapeOf('lshape', '12 9 5 4').pts), 88);
  assert.equal(round(perimeter(shapeOf('lshape', '12 9 5 4').pts)), 42);
  assert.equal(round(perimeter(shapeOf('reg', '6 5').pts)), 30);
  assert.equal(solveText('직사각형 모양 매트예요.\n\n[rect 3x2 m]\n\n매트의 넓이는 몇 cm²일까요?').v, 60000);
  assert.equal(solveText('넓이가 60 cm²이고 밑변이 10 cm인 삼각형의 높이는 몇 cm일까요?').v, 12);
});

test('그림: 도형 여덟 가지를 그리고 — 적힌 옆변 길이는 실제 거리, 숨긴 "?"는 안 보인다, 말이 안 되는 모양은 빈 글자', () => {
  const svgText = (svg) => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);
  for (const [spec, want] of [
    ['para 10 4 3', ['10 cm', '4 cm', '5 cm']], ['para 14 12 5 m', ['14 m', '12 m', '13 m']], ['tri 12 8 6', ['12 cm', '8 cm', '10 cm']],
    ['rhom 12 16', ['12 cm', '16 cm', '10 cm']], ['trap 5 12 4 3 m', ['5 m', '12 m', '4 m', '5 m']], ['rect 8x5 m', ['8 m', '5 m']],
    ['reg 5 6', ['6 cm']], ['lshape 12 9 5 4', ['12 cm', '5 cm', '5 cm', '4 cm', '7 cm', '9 cm']],
  ]) {
    const svg = figureSvg(spec);
    assert.ok(svg, spec);
    assert.deepEqual(svgText(svg).sort(), [...want].sort(), `${spec}: 이름표 ${svgText(svg)}`);
  }
  // 옆변이 정수가 아니면 적지 않는다 (그림이 거짓말하지 않게)
  assert.deepEqual(svgText(figureSvg('para 10 4 2')).sort(), ['10 cm', '4 cm']);
  // 숨긴 길이
  assert.ok(!svgText(figureSvg('rect 8x?6')).includes('6 cm') && svgText(figureSvg('rect 8x?6')).includes('? cm'));
  assert.ok(!svgText(figureSvg('rhom 10 ?24')).includes('24 cm') && !svgText(figureSvg('rhom 10 ?24')).includes('13 cm'), '숨긴 대각선이 한 변 이름표로 새지 않게');
  // 모눈 칸 수
  assert.equal((figureSvg('grid 7x5 -3x2').match(/fill-opacity="0.35"/g) || []).length, 35 - 6);
  // 말이 안 되는 모양
  for (const bad of ['tri 5 4 7', 'trap 8 10 4 3', 'lshape 5 5 6 2', 'grid 5x4 -5x1', 'reg 9 3', 'rect 0x4']) assert.equal(figureSvg(bad), '', bad);
  // 글로 풀어 쓰기
  assert.equal(figText('[para 10 4 3]'), '(평행사변형 밑변 10 cm · 높이 4 cm · 옆변 5 cm)');
  assert.equal(figText('[rect 8x?6]'), '(직사각형 가로 8 cm · 세로 ? cm)');
  assert.equal(figText('[lshape 12 9 5 4 m]', true), '(그림)');
});

test('사다리: 9칸, 모두 초5, needs가 바로 앞 칸', () => {
  assert.equal(AREA.length, 9);
  const ids = AREA.map((c) => c.id);
  assert.equal(new Set(ids).size, 9);
  for (const [k, c] of AREA.entries()) {
    assert.ok(/^are\./.test(c.id) && c.name && c.idea && c.slip, c.id);
    assert.equal(c.grade, 5);
    assert.deepEqual(c.needs, k ? [ids[k - 1]] : []);
  }
  assert.equal(gradeLabel(5), '초5');
  assert.equal(valueOf('48 cm²'), 48);
  assert.equal(valueOf('㉮와 ㉯의 넓이는 같아요'), null);
});

test('★ 독립 검산: ① 정답이 그림·글을 따로 읽어 신발끈 공식으로 구한 값과 같다 · 딱 하나만 맞다', () => {
  for (const c of AREA) {
    for (let s = 1; s <= SEEDS; s++) {
      const q = makeQuestion(c.id, 'calc', s * 7919, OPTS);
      const where = `${c.id} seed ${s}: "${q.q.replace(/\n/g, ' ')}"`;
      const w = solveText(q.q);
      assert.ok(w, `${where} — 글을 못 읽었다 (해석기에 말투를 더할 것)`);
      const ok = q.choices.find((x) => x.ok).text;
      if (w.v !== undefined) {
        assert.equal(Number(ok), w.v, `${where} — 정답`);
        for (const ch of q.choices.filter((x) => !x.ok)) assert.notEqual(Number(ch.text), w.v, `${where} — 오답 ${ch.text}이 사실 정답`);
      } else if (w.sent) {
        const truths = q.choices.map((x) => w.sent(x.text));
        assert.ok(truths.every((t) => t !== null), `${where} — 못 읽는 문장 보기`);
        assert.equal(truths.filter(Boolean).length, 1, where);
        assert.ok(q.choices[truths.indexOf(true)].ok, where);
      } else assert.fail(`${where} — 답을 정하지 못했다`);
    }
  }
});

test('★ 보기: 정답 하나, 겹침 없음, 새는 글자 없음, 수 범위, 그림 지시문은 그려진다', () => {
  for (const c of AREA) {
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
          if (/^\d+$/.test(t)) assert.ok(Number(t) > 0 && !/^0/.test(t), `${where}: 모양이 이상한 수 "${t}"`);
        }
        const all = `${q.q} ${JSON.stringify(q.solve)} ${JSON.stringify(q.choices)}`;
        assert.ok(!/undefined|NaN|null|\{(me|mon)/.test(all), `${where}: 새는 것 — ${all.slice(0, 160)}`);
        // 문제 글의 수: 단위 바꾸기 칸만 크다 (80000 cm²), 나머지는 초5 손셈 — ②는 틀린 셈을 보여 주는 게 문제라 500까지
        const cap = c.id === 'are.units' ? 10000000 : kind === 'calc' ? 200 : 500;
        for (const n of nums(q.q)) assert.ok(n <= cap, `${where}: 너무 큰 수 ${n} — ${q.q}`);
        for (const ch of q.choices) for (const n of nums(ch.text)) assert.ok(n <= (c.id === 'are.units' ? 10000000 : 5000), `${where}: 보기에 너무 큰 수 ${n}`);
        for (const f of q.q.match(/\[[a-z]+ [^\]]+\]/g) || []) assert.ok(figureSvg(f.slice(1, -1)), `${where}: 못 그리는 그림 ${f}`);
      }
    }
  }
});

test('★ 오개념 이름표: 그 오답이 정말 그 실수다', () => {
  const seen = {};
  for (const c of AREA) {
    for (let s = 1; s <= SEEDS; s++) {
      const q = makeQuestion(c.id, 'calc', s * 31337, OPTS);
      const w = solveText(q.q); const x = w.ctx;
      for (const ch of q.choices.filter((y) => !y.ok)) {
        if (ch.tag === '계산 실수') continue;
        const where = `${c.id} seed ${s}: "${ch.tag}" 오답 ${ch.text} — ${q.q.replace(/\n/g, ' ')}`;
        const v = Number(ch.text);
        const hit = (cond) => { seen[ch.tag] = (seen[ch.tag] || 0) + 1; assert.ok(cond, where); };
        if (x.kind === 'cmp') {
          if (ch.tag === TAGS.shapeBigger) hit(/^㉮의 넓이가 더 넓어요$|^㉯의 넓이가 더 넓어요$/.test(ch.text) && w.sent(ch.text) === false);
          else if (ch.tag === TAGS.cantCompare) hit(ch.text === '모양이 달라서 비교할 수 없어요');
          else assert.fail(where);
          continue;
        }
        const sh = x.s || {};
        const slant = (dx, dy) => Math.hypot(dx, dy);
        switch (ch.tag) {
          case TAGS.halfPerim: hit(sh.kind === 'rect' && x.ask === 'perim' && v === sh.W + sh.H); break;
          case TAGS.areaForPerim: hit(x.ask === 'perim' && Math.abs(v - x.area) < EPS); break;
          case TAGS.perimForArea: hit(x.ask === 'area' && Math.abs(v - x.per) < EPS); break;
          case TAGS.sidesWrong: hit(sh.kind === 'reg' && (v === (sh.n - 1) * sh.s || v === (sh.n + 1) * sh.s)); break;
          case TAGS.addForMul:
            if (sh.kind === 'reg') hit(v === sh.n + sh.s);
            else hit((sh.kind === 'rect' || sh.kind === 'grid') && v === sh.W + sh.H);
            break;
          case TAGS.edgeOnly: hit(sh.kind === 'grid' && !sh.w && v === 2 * (sh.W + sh.H) - 4); break;
          case TAGS.cutIgnored: hit((sh.kind === 'grid' || sh.kind === 'lshape') && sh.w > 0 && v === sh.W * sh.H); break;
          case TAGS.cutAdd: hit(sh.kind === 'lshape' && v === sh.W * sh.H + sh.w * sh.h); break;
          case TAGS.edgesMissed: hit(sh.kind === 'lshape' && x.ask === 'perim' && Math.abs(v - (x.per - sh.w - sh.h)) < EPS); break;
          case TAGS.lengthFactor:
            if (x.kind === 'conv') hit(v === x.from * Math.sqrt(x.f));                         // 1 m² → 100 cm² (길이 배수)
            else if (x.kind === 'convDown') hit(v === x.from / Math.sqrt(x.f));
            else hit(x.f === 10000 && v === x.area * 100);
            break;
          case TAGS.zeros: {
            const right = x.kind === 'convDown' ? x.from / x.f : x.from * x.f;
            const ratio = v / right; const lg = Math.log10(ratio);
            hit(x.kind.startsWith('conv') && Math.abs(lg - Math.round(lg)) < EPS && Math.round(lg) !== 0 && v !== (x.kind === 'convDown' ? x.from / Math.sqrt(x.f) : x.from * Math.sqrt(x.f)));
            break;
          }
          case TAGS.noConvert: hit(x.f === 10000 && v === x.area); break;
          case TAGS.slantAsHeight:
            if (sh.kind === 'para') hit(v === sh.b * slant(sh.s, sh.h));
            else hit(sh.kind === 'tri' && (v === sh.b * slant(sh.p, sh.h) || v === (sh.b * slant(sh.p, sh.h)) / 2));
            break;
          case TAGS.halfWrong: hit(sh.kind === 'para' && v === x.area / 2); break;
          case TAGS.noHalf:
            if (x.kind === 'inv') hit((x.shape === '삼각형' || x.shape === '마름모') && v === x.A / x.b);   // × 2를 먼저 안 함
            else hit(['tri', 'rhom', 'trap'].includes(sh.kind) && v === x.area * 2);
            break;
          case TAGS.sideSquared: hit(sh.kind === 'rhom' && v === (sh.d1 / 2) ** 2 + (sh.d2 / 2) ** 2); break;
          case TAGS.topTimesBottom: hit(sh.kind === 'trap' && v === sh.a * sh.b); break;
          case TAGS.oneBase: hit(sh.kind === 'trap' && v === (sh.b * sh.h) / 2); break;
          case TAGS.wrongInverse: hit(x.kind === 'inv' && v === x.A - x.b); break;
          case TAGS.noInverse: hit(x.kind === 'inv' && v === x.A * x.b); break;
          default: assert.fail(`${where}: 검사 없는 이름표`);
        }
      }
    }
  }
  for (const tag of Object.values(TAGS)) assert.ok((seen[tag] || 0) >= 20, `"${tag}" 오답을 충분히 검사해야 한다 (${seen[tag] || 0}건)`);
});

test('★ ② 오개념 문항: 보여 준 말은 정말 틀렸다 · 고친 답은 맞다 · 진단 보기가 우연히 맞지 않다 · 갈래 열쇠', () => {
  const branches = {};
  for (const c of AREA) {
    for (let s = 1; s <= SEEDS; s++) {
      const q = makeQuestion(c.id, 'misread', s * 7717, OPTS);
      const where = `${c.id} seed ${s}: ${q.q.replace(/\n/g, ' ')}`;
      assert.ok(/^misread:/.test(q.key || ''), where);
      branches[`${c.id} ${q.key}`] = (branches[`${c.id} ${q.key}`] || 0) + 1;
      const shown = /\*\*(.+)\*\*/.exec(q.q)[1];
      const ok = q.choices.find((x) => x.ok).text;
      const wrongs = q.choices.filter((x) => !x.ok && x.tag !== '틀린 줄 모름');
      let right; let m;
      const S = readShapes(q.q);
      if (S.length === 1) {
        const ask = /둘레/.test(shown) ? 'perim' : 'area';
        right = round(ask === 'perim' ? perimeter(S[0].pts) : shoelace(S[0].pts));
      } else if ((m = /^(\d+) (m²|km²)를 (cm²|m²)로 바꿨어요/.exec(q.q))) right = +m[1] * (m[2] === 'm²' ? 10000 : 1000000);
      else if ((m = /^넓이가 (\d+) cm²이고 밑변이 (\d+) cm인 삼각형의 높이를/.exec(q.q))) right = (2 * +m[1]) / +m[2];
      else assert.fail(`${where}: 이 ② 모양을 모른다`);
      if (q.key === 'misread:unit') {
        // 수는 맞고 단위가 틀린 말 — 넓이를 cm로
        assert.ok(new RegExp(`${right} cm예요$`).test(shown), `${where}: 단위가 틀린 말이어야`);
        assert.ok(ok.endsWith(`${right} cm²`), where);
      } else {
        assert.notEqual(lastNum(shown), right, `${where}: 보여 준 값이 사실 맞다`);
        assert.equal(lastNum(ok), right, `${where}: 고친 답에 ${right}이 없다 — ${ok}`);
      }
      for (const ch of wrongs) if (lastNum(ch.text) !== null) assert.notEqual(lastNum(ch.text), right, `${where}: 오답 "${ch.text}"이 사실 바른 값`);
    }
  }
  for (const [k, n] of Object.entries(branches)) assert.ok(n >= 100, `${k} 갈래가 드물다 (${n})`);
  assert.equal(Object.keys(branches).length, 14, Object.keys(branches).join(', '));
});

test('★ 조사: 수 뒤(12는·36은·8과·3으로·7로·6이에요·9예요)', () => {
  const BAT = new Set(['0', '1', '3', '6', '7', '8']);
  const PAIR = { 이: true, 가: false, 을: true, 를: false, 은: true, 는: false, 과: true, 와: false };
  const LONG = { 이에요: true, 예요: false, 이라서: true, 라서: false, 이니까: true, 니까: false };
  let checked = 0;
  for (const c of AREA) {
    for (let s = 1; s <= 300; s++) {
      for (const kind of ['calc', 'misread']) {
        const q = makeQuestion(c.id, kind, s * 3571, OPTS);
        for (const t0 of [q.q, ...q.choices.map((x) => x.text), ...q.solve.steps, q.solve.whyAny, ...Object.values(q.solve.why)]) {
          const t = String(t0).replace(/\[[a-z]+ [^\]]+\]/g, '');
          for (const m of t.matchAll(/(\d+)(으로|로|이|가|을|를|은|는|과|와)(?![가-힣])/g)) {
            const last = m[1].slice(-1); checked++;
            if (m[2] === '으로' || m[2] === '로') assert.equal(m[2], ['0', '3', '6'].includes(last) ? '으로' : '로', `${c.id}/${kind} seed ${s}: "${m[0]}" (${t})`);
            else assert.equal(PAIR[m[2]], BAT.has(last), `${c.id}/${kind} seed ${s}: "${m[0]}" (${t})`);
          }
          for (const m of t.matchAll(/(\d+)(이에요|예요|이라서|라서|이니까|니까)/g)) { checked++; assert.equal(LONG[m[2]], BAT.has(m[1].slice(-1)), `${c.id}/${kind} seed ${s}: "${m[0]}" (${t})`); }
        }
      }
    }
  }
  assert.ok(checked > 500, `조사 검사 ${checked}건`);
});

test('★ 풀이 카드: 단계 2줄↑ · 기억할 것 · 오답마다 왜 · 정답이 단계에 나온다', () => {
  for (const c of AREA) {
    for (const kind of ['calc', 'misread']) {
      for (let s = 1; s <= 400; s++) {
        const q = makeQuestion(c.id, kind, s * 131, OPTS);
        const where = `${c.id}/${kind} seed ${s}`;
        assert.ok(q.solve && q.solve.steps.length >= 2 && q.solve.rule, where);
        for (const ch of q.choices) if (!ch.ok) assert.ok(q.solve.why[ch.tag] || q.solve.whyAny, `${where}: 오답 "${ch.tag}" 설명 없음`);
        if (kind !== 'calc') continue;
        const ok = q.choices.find((x) => x.ok).text;
        assert.ok(q.solve.steps.some((st) => st.includes(ok) || (/^\d+$/.test(ok) && nums(st).includes(Number(ok)))), `${where}: 풀이에 정답 ${ok} 없음 — ${q.solve.steps.join(' / ')}`);
      }
    }
  }
});

test('🔁 쌍둥이·🤔 노트: 요청한 틀·갈래로 온다 · 원래 문제와 글자까지 같은 쌍둥이는 틀마다 30% 이하', () => {
  let tried = 0;
  for (const c of AREA) {
    for (const kind of ['calc', 'misread']) {
      const keys = new Set();
      for (let s = 1; s <= 300; s++) keys.add(makeQuestion(c.id, kind, s * 37, OPTS).key);
      for (const key of keys) {
        for (let s = 1; s <= 60; s++) {
          const q = makeQuestion(c.id, kind, s * 911, { ...OPTS, want: { k: kind, key } });
          tried++;
          assert.equal(q.key, key, `${c.id}/${kind} seed ${s}: ${key}를 요청했는데 ${q.key}`);
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

// ── 글 속 셈식 검산 — 괄호까지: "(13 + 4) × 2 = 17 × 2 = 34" ──
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
  for (const m of plain(text).matchAll(new RegExp(`(?<![\\d.)])(?<![+−×÷] )${E}(?: = ${E})+`, 'g'))) {
    let parts;
    try { parts = m[0].split(' = ').map(evalExpr); } catch { continue; } // 괄호가 식 밖에서 열린 조각 — 건너뛴다
    if (parts.some((v) => Math.abs(v - parts[0]) > EPS)) bad.push(m[0]);
  }
  return bad;
}

test('★ 글 속 셈식이 모두 맞다 (괄호 포함)', () => {
  assert.deepEqual(badArith('(13 + 4) × 2 = 17 × 2 = 34'), []);
  assert.deepEqual(badArith('(13 + 4) × 2 = 35'), ['(13 + 4) × 2 = 35']);
  assert.deepEqual(badArith('18 × 6 ÷ 2 = 54'), []);
  let checked = 0;
  for (const c of AREA) {
    for (let s = 1; s <= 500; s++) {
      for (const kind of ['calc', 'misread']) {
        const q = makeQuestion(c.id, kind, s * 2027, OPTS);
        for (const t of [q.q, ...q.choices.map((x) => x.text), ...q.solve.steps, q.solve.whyAny, ...Object.values(q.solve.why)]) { checked++; assert.deepEqual(badArith(t), [], `${c.id}/${kind} seed ${s}: ${t}`); }
      }
    }
  }
  assert.ok(checked > 10000, `${checked}건`);
});

test('📏 진단·사다리·한 편·배움 예비·내용 검사 · 가족 지어내지 않기', () => {
  const d = diagnosticSet(9, 5, OPTS);
  assert.deepEqual(d.map((q) => q.concept), ['are.perimeter', 'are.rect', 'are.para', 'are.rhom', 'are.use']);
  const pl = placeFrom([{ concept: 'are.perimeter', correct: true }, { concept: 'are.rect', correct: false }]);
  assert.equal(pl.startId, 'are.rect');
  assert.deepEqual(pl.knownIds, ['are.perimeter', 'are.unit']);
  assert.deepEqual(ladder(['are.perimeter']).slice(0, 3).map((x) => x.state), ['done', 'now', 'locked']);
  for (const c of AREA) {
    assert.deepEqual(makeRound(c.id, 5, OPTS).map((q) => q.kind), ['calc', 'misread']);
    assert.equal(lessonOf(c.id, 1, OPTS).pages.length, 1);
    for (let s = 1; s <= 200; s++) for (const kind of ['calc', 'misread']) assert.doesNotMatch(JSON.stringify(makeQuestion(c.id, kind, s * 57, OPTS)), /동생|누나|언니|엄마|아빠|할아버지/); // ("형이"는 빼 둔다 — 직사각형이·평행사변형이)
  }
  assert.equal(conceptById('are.nope'), null);
  assert.equal(checkContent({}).filter((x) => /내용 없음/.test(x)).length, 9);
});

// ── 사람이 쓴 원고 (coach/math/area.json) ──
const CONTENT = JSON.parse(readFileSync('coach/math/area.json', 'utf8'));
const strings = (v, out = []) => { if (typeof v === 'string') out.push(v); else if (v && typeof v === 'object') Object.values(v).forEach((x) => strings(x, out)); return out; };

test('원고(area.json)가 형식 검사를 통과한다 — 9칸 모두 배움 3장↑·확인 2개↑·아빠 카드 · 그림은 모두 그려진다', () => {
  assert.deepEqual(checkContent(CONTENT), []);
  for (const c of AREA) {
    const L = lessonOf(c.id, 3, { ...OPTS, content: CONTENT });
    assert.ok(L.pages.length >= 3, c.id);
    assert.ok(!/\{(me|mon)/.test(JSON.stringify(L)), `${c.id}: 이름 자리표시가 남았다`);
  }
  for (const t of strings(CONTENT)) for (const f of t.match(/\[[a-z]+ [^\]]+\]/g) || []) assert.ok(figureSvg(f.slice(1, -1)), `못 그리는 그림 ${f}`);
});

/** 원고 확인 질문에만 있는 말투 — 그림에서 높이 찾기 · 둘레로 세로 · cm 길이로 m² 넓이. 나머지는 생성기와 같은 solveText */
function solveLesson(q0) {
  const q = plain(q0); let m;
  const S = readShapes(q);
  if ((m = /높이는 몇 (cm|m)일까요/.exec(q)) && !/넓이가/.test(q) && S.length === 1 && ['para', 'tri', 'trap'].includes(S[0].kind)) {
    assert.equal(m[1], S[0].unit, `묻는 단위와 그림 단위가 다르다: ${q}`);
    return { v: S[0].h };
  }
  if ((m = /둘레가 (\d+) cm이고 가로가 (\d+) cm인 직사각형/.exec(q)) && /세로는 몇/.test(q)) {
    const [P, W] = [+m[1], +m[2]];
    assert.equal(S.length, 1, q); assert.ok(S[0].hidden && S[0].W === W, `그림이 글과 다르거나 세로가 보인다: ${q}`);
    const v = P / 2 - W; assert.ok(Number.isInteger(v) && v > 0, q);
    return { v };
  }
  if ((m = /가로가 (\d+) cm, 세로가 (\d+) cm인 직사각형/.exec(q)) && /넓이는 몇 m²/.test(q)) {
    const v = (+m[1] / 100) * (+m[2] / 100); assert.ok(Number.isInteger(v), q);
    return { v };
  }
  return solveText(q0);
}
/** 확인 보기 값 — 단위를 떼고 수 하나 */
const lessonVal = (t) => { const s = String(t).trim().replace(/ ?(cm²|m²|km²|cm|m|km|칸|개)$/, ''); return /^\d+$/.test(s) ? Number(s) : null; };

test('★ 원고 확인 질문도 따로 풀어 대조 — 전부 읽히고, 정답은 맞고, 오답은 정말 틀렸다 · 보기 단위 = 묻는 단위', () => {
  let total = 0; const unread = [];
  for (const c of AREA) {
    const L = lessonOf(c.id, 3, { ...OPTS, content: CONTENT });
    for (const [i, p] of L.pages.entries()) {
      if (!p.check) continue;
      total++;
      const where = `${c.id}[${i}] "${p.check.q.replace(/\n/g, ' ')}"`;
      const w = solveLesson(p.check.q);
      if (!w) { unread.push(where); continue; }
      const all = [p.check.ok, ...p.check.no];
      if (w.v !== undefined) {
        assert.equal(lessonVal(p.check.ok), w.v, `${where} — 따로 푼 답 ${w.v} ≠ 원고 정답 ${p.check.ok}`);
        for (const n of p.check.no) { assert.notEqual(lessonVal(n), null, `${where} — 오답 ${n}을 못 읽는다`); assert.notEqual(lessonVal(n), w.v, `${where} — 오답 ${n}이 사실 정답`); }
        const unit = /몇 (cm²|m²|km²|cm|m|km)/.exec(plain(p.check.q))[1];
        for (const t of all) assert.ok(t.endsWith(` ${unit}`), `${where} — 보기 "${t}"의 단위가 묻는 단위(${unit})와 다르다`);
      } else if (w.sent) {
        assert.deepEqual(all.map(w.sent), [true, ...p.check.no.map(() => false)], `${where} — 참인 문장이 정답 하나뿐이어야`);
      } else assert.fail(where);
    }
  }
  assert.deepEqual(unread, [], '해석기가 못 읽은 확인 질문 — solveLesson에 말투를 더할 것');
  assert.ok(total >= 30, `확인 질문 ${total}개`);
});

test('★ 배움 글의 굵은 값이 그 장의 그림과 맞다 — 넓이는 신발끈 공식, 길이는 둘레나 그림 속 길이 (단위까지)', () => {
  let checked = 0;
  for (const c of AREA) {
    for (const [i, p] of CONTENT[c.id].lesson.entries()) {
      const S = readShapes(p.say);
      if (S.length !== 1) continue;
      const s = S[0];
      // 결과 자리(= · → · 넓이는 뒤)의 굵은 값만 — "**1 cm²**라고 써요" 같은 정의는 빼고
      for (const m of p.say.matchAll(/(?:= |→ |넓이는 )\*\*(\d+) (cm²|m²|cm|m)\*\*/g)) {
        checked++;
        const where = `${c.id}[${i}] ${m[0]} — ${s.raw}`;
        if (m[2].endsWith('²')) {
          assert.equal(m[2], `${s.unit}²`, `${where}: 넓이 단위`);
          assert.equal(+m[1], round(shoelace(s.pts)), `${where}: 넓이`);
        } else {
          assert.equal(m[2], s.unit, `${where}: 길이 단위`);
          const lens = [s.W, s.H, s.b, s.h, s.s, s.a, s.d1, s.d2, s.w, s.n && s.s].filter(Number.isFinite);
          assert.ok(Math.abs(perimeter(s.pts) - +m[1]) < 1e-6 || lens.includes(+m[1]), `${where}: 둘레도 그림 속 길이도 아니다`);
        }
      }
    }
  }
  assert.ok(checked >= 12, `굵은 값 ${checked}개`);
});

test('★ 원고의 셈식(괄호까지)·수 뒤 조사·□ 뒤 조사 (배움 글·확인 질문·아빠 카드 전부)', () => {
  const BAT = new Set(['0', '1', '3', '6', '7', '8']);
  const PAIR = { 이: true, 가: false, 을: true, 를: false, 은: true, 는: false, 과: true, 와: false };
  const LONG = { 이에요: true, 예요: false, 이라서: true, 라서: false, 이면: true, 면: false, 이니까: true, 니까: false };
  let checked = 0;
  for (const t0 of strings(CONTENT)) {
    assert.deepEqual(badArith(t0), [], `틀린 셈식 — ${t0}`);
    const t = t0.replace(/\[[a-z]+ [^\]]+\]/g, '');
    for (const m of t.matchAll(/(\d+)(으로|로|이|가|을|를|은|는|과|와)(?![가-힣])/g)) {
      checked++;
      const last = m[1].slice(-1);
      if (m[2] === '으로' || m[2] === '로') assert.equal(m[2], ['0', '3', '6'].includes(last) ? '으로' : '로', `"${m[0]}" — ${t}`);
      else assert.equal(PAIR[m[2]], BAT.has(last), `"${m[0]}" — ${t}`);
    }
    for (const m of t.matchAll(/(\d+)(이에요|예요|이라서|라서|이면|면|이니까|니까)(?![가-힣])/g)) { checked++; assert.equal(LONG[m[2]], BAT.has(m[1].slice(-1)), `"${m[0]}" — ${t}`); }
    assert.doesNotMatch(t, /□(이|을|은|과|으로)(?![가-힣])/, `□ 뒤 조사 — ${t}`);
  }
  assert.ok(checked >= 25, `조사 검사 ${checked}건`);
});

test('아직 안 배운 말을 앞 칸에서 쓰지 않는다 — 넓이·cm²는 I2, m²는 I3, km²는 I4, 밑변·높이는 I5부터 (원고·생성기 모두)', () => {
  const EARLY = {
    'are.perimeter': /넓이|cm²|m²|밑변|높이/,
    'are.unit': /(?<!c)m²|밑변|높이/,
    'are.rect': /km²|밑변|높이/,
    'are.units': /밑변|높이/,
  };
  for (const [id, re] of Object.entries(EARLY)) {
    for (const t of strings(CONTENT[id])) assert.doesNotMatch(t, re, `${id} 원고: ${t}`);
    for (let s = 1; s <= 300; s++) {
      for (const kind of ['calc', 'misread']) {
        const q = makeQuestion(id, kind, s * 881, OPTS);
        const kid = [q.q, ...q.choices.map((x) => x.text), ...q.solve.steps, q.solve.whyAny, q.solve.rule, ...Object.values(q.solve.why)].join(' / ');
        assert.doesNotMatch(kid, re, `${id}/${kind} seed ${s}: ${kid.slice(0, 200)}`);
      }
    }
  }
});

test('그림 이름표끼리 겹치지 않는다 — 생성기 문제·원고의 모든 도형 (ㄴ자 작은 홈 2 × 2·납작한 마름모에서 겹쳤다)', () => {
  // 글자 상자 어림: 한 글자 ≈ 글꼴 × 0.55, 기준선 위 글꼴 × 0.73·아래 × 0.2
  // 글꼴 크기는 그림에서 읽는다 — 크기가 바뀌어도 이름표를 못 찾아 빈 채로 통과하지 않게 (이름표 수도 센다)
  let labels = 0;
  const boxes = (svg) => [...svg.matchAll(/<text x="([\d.-]+)" y="([\d.-]+)" font-size="(\d+)" text-anchor="(\w+)"[^>]*>([^<]*)<\/text>/g)].map((m) => {
    labels++;
    const x = +m[1]; const y = +m[2]; const fs = +m[3]; const w = m[5].length * fs * 0.55;
    const x0 = m[4] === 'middle' ? x - w / 2 : m[4] === 'end' ? x - w : x;
    return { t: m[5], x0, x1: x0 + w, y0: y - fs * 0.73, y1: y + fs * 0.2 };
  });
  const hit = (a, b) => a.x0 < b.x1 - 1 && b.x0 < a.x1 - 1 && a.y0 < b.y1 - 1 && b.y0 < a.y1 - 1;
  const figs = new Set();
  for (const c of AREA) for (let s = 1; s <= 600; s++) for (const kind of ['calc', 'misread']) for (const f of makeQuestion(c.id, kind, s * 409, OPTS).q.match(/\[[a-z]+ [^\]]+\]/g) || []) figs.add(f.slice(1, -1));
  for (const t of strings(CONTENT)) for (const f of t.match(/\[[a-z]+ [^\]]+\]/g) || []) figs.add(f.slice(1, -1));
  const bad = [];
  for (const f of figs) {
    const B = boxes(figureSvg(f));
    for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) if (hit(B[i], B[j])) bad.push(`${f}: "${B[i].t}" ↔ "${B[j].t}"`);
  }
  assert.ok(figs.size > 500 && labels > 1500, `도형 ${figs.size}개 · 이름표 ${labels}개`);
  assert.deepEqual(bad.slice(0, 12), [], `${bad.length}건`);
});
