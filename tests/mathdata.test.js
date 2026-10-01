// 📊 K 자료와 그래프 줄기 생성기·그림 테스트: node --test tests/mathdata.test.js
//
// ★ 핵심은 **독립 검산** — 생성기가 알려 주는 값(probe)을 믿지 않고 **문제 글·그래프 지시문을 이 파일이 직접 읽어** 다시 푼다.
//   지시문 읽기도 이 파일에서 새로 짠다 (mathdraw.parseChart를 쓰면 검산이 아니다).
// ★ 그래프는 **그려진 SVG에서 잰다** — 이름 붙은 눈금선 두 개로 자를 만들고, 막대 꼭대기·점의 y를 값으로 되돌려 지시문과 대조.
// ★ 이름표는 값만이 아니라 뜻까지 (그 오답이 정말 그 실수인가) · 칸마다 아직 안 배운 말 · 쌍둥이 열쇠.
// ★ 씨앗은 개념마다 수백~수천 (DATA_SEEDS=20000으로 넓게).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  DATA, TAGS, makeQuestion, makeRound, conceptById, ladder, placeFrom, diagnosticSet, lessonOf, checkContent, gradeLabel, valueOf,
} from '../js/mathdata.js';
import { figureSvg, figText, renderFigures, chartGeom, parseChart } from '../js/mathdraw.js';
import { padSpec, textVal, matchTyped } from '../js/mathpad.js';

const OPTS = { names: ['피카츄', '리자몽', '개굴닌자'], me: '진우', worlds: { pokemon: [], toystory: [], minions: [], moana: [] } };
const SEEDS = Number(process.env.DATA_SEEDS) || 600;
const IDX = Object.fromEntries(DATA.map((c, i) => [c.id, i]));
const CONTENT = JSON.parse(readFileSync('coach/math/data.json', 'utf8'));
const strings = (v, out = []) => { if (typeof v === 'string') out.push(v); else if (v && typeof v === 'object') Object.values(v).forEach((x) => strings(x, out)); return out; };

// ── 글 읽기 (이 파일의 것) ──
const nums = (t) => (String(t).match(/\d+/g) || []).map(Number);
const lastNum = (t) => { const n = nums(t); return n.length ? n[n.length - 1] : null; };
const plain = (q) => String(q).replace(/\*\*/g, '');
const num = (t) => { const v = textVal(String(t).replace(/%$/, '')); return v ? v.v.n / v.v.d : NaN; };

/** [bgraph 2x5 명 사과:12 …] · [lgraph 5x5 kg ~25 1월:30 …] → {kind, s, lab, unit, base, items:[{label, v}]} */
function readChart(q) {
  const m = /\[(bgraph|lgraph) ([^\]]+)\]/.exec(q);
  if (!m) return null;
  const t = m[2].trim().split(/\s+/);
  const sm = /^([\d.]+)x(\d+)$/.exec(t[0]);
  let i = 2; let base = 0;
  if (/^~/.test(t[2] || '')) { base = Number(t[2].slice(1)); i = 3; }
  const items = t.slice(i).map((x) => { const [l, v] = x.split(':'); return { label: l, v: v === '?' ? null : Number(v) }; });
  return { kind: m[1], s: Number(sm[1]), lab: Number(sm[2]), unit: t[1], base, items, raw: m[0] };
}
/** [band 봄:30 …] · [pie …] → {kind, items:[{label, v}]} (? 는 null) */
function readPct(q) {
  const m = /\[(band|pie) ([^\]]+)\]/.exec(q);
  if (!m) return null;
  return { kind: m[1], items: m[2].trim().split(/\s+/).map((x) => { const [l, v] = x.split(':'); return { label: l, v: v === '?' ? null : Number(v) }; }) };
}
/** "**월 38쪽 · 화 10쪽 · …**" → [[이름, 값]] */
function readList(q) {
  const m = /\*\*([^*]+)\*\*/.exec(q);
  if (!m) return null;
  return m[1].split(' · ').map((p) => { const x = /^(\S+) (\d+)/.exec(p.trim()); return x ? [x[1], Number(x[2])] : null; });
}
/** 막대그래프 주제의 "몇 수" 말 → 항목 이름 (이 파일이 따로 읽는다) */
function labelIn(phrase, labels) {
  const hit = labels.filter((L) => [`${L}을 좋아하는`, `${L}를 좋아하는`, `${L} 타입을`, `${L}요일에`, `${L} 책의`, `팔린 ${L}의`].some((p) => phrase.startsWith(p)));
  assert.equal(hit.length, 1, `항목을 못 찾음: "${phrase}" (${labels.join(',')})`);
  return hit[0];
}

/** 가능성 상황 글 → 0~4 (불가능·아닐 것 같다·반반·일 것 같다·확실) */
function chanceLevel(t) {
  let m;
  if ((m = /1부터 (\d+)까지의 수 카드 \d+장 중 한 장을 뽑을 때 (.+?) 나올 가능성/.exec(t))) {
    const f = +m[1]; const w = m[2];
    if (/짝수/.test(w)) return f % 2 === 0 ? 2 : null;
    const le = /^(\d+) 이하의 수가$/.exec(w); if (le) return +le[1] >= f ? 4 : null;
    const eq = /^(\d+)[이가]$/.exec(w); if (eq) return +eq[1] > f ? 0 : null;
    return null;
  }
  if ((m = /빨간 구슬만 (\d+)개 들어 있는 주머니에서 구슬 하나를 꺼낼 때 (빨간|파란) 구슬이 나올 가능성/.exec(t))) return m[2] === '빨간' ? 4 : 0;
  if ((m = /빨간 구슬 (\d+)개와 파란 구슬 (\d+)개가 들어 있는 주머니에서 구슬 하나를 꺼낼 때 (빨간|파란) 구슬이 나올 가능성/.exec(t))) {
    const red = +m[1]; const blue = +m[2]; const mine = m[3] === '빨간' ? red : blue; const other = m[3] === '빨간' ? blue : red;
    if (mine === other) return 2;
    return mine > other ? (mine >= 3 * other ? 3 : null) : (other >= 3 * mine ? 1 : null);
  }
  if (/동전 한 개를 \d+번째로 던질 때 그림 면이 나올 가능성/.test(t)) return 2;
  return null;
}
const LV = ['불가능하다', '~아닐 것 같다', '반반이다', '~일 것 같다', '확실하다'];
const LVN = { 0: '0', 2: '1/2', 4: '1' };

/**
 * ① 문제 글을 따로 읽어 푼다 → {v} 수 답 · {pick(text)→bool} 문장 보기 판정 · ctx(이름표 검사용)
 */
function solveText(q) {
  const p = plain(q);
  const ch = readChart(q); const pc = readPct(q);
  let m;
  if (ch && /세로 눈금 한 칸은 몇/.test(p)) return { v: ch.s, ctx: { k: 'scale', ch } };
  if (ch && ch.kind === 'bgraph' && /막대가 가장 긴 것과 가장 짧은 것의 차/.test(p)) {
    const vs = ch.items.map((x) => x.v); return { v: Math.max(...vs) - Math.min(...vs), ctx: { k: 'diff', ch, mx: Math.max(...vs), mn: Math.min(...vs) } };
  }
  if (ch && ch.kind === 'bgraph' && (m = /\n\n(.+?수)는 (.+?수)의 몇 배일까요\?$/.exec(p))) {
    const L = ch.items.map((x) => x.label); const A = labelIn(m[1], L); const B = labelIn(m[2], L);
    const va = ch.items.find((x) => x.label === A).v; const vb = ch.items.find((x) => x.label === B).v;
    return { v: va / vb, ctx: { k: 'times', ch, va, vb } };
  }
  if (ch && ch.kind === 'bgraph' && /막대는 몇 칸만큼 그려야/.test(p)) {
    const v = +/는 (\d+)\S+(?:이에요|예요)\./.exec(p)[1];
    const X = /\n\n(\S+) 막대는 몇 칸/.exec(p)[1];
    assert.equal(ch.items.find((x) => x.label === X).v, null, `그릴 막대 ${X}는 ?여야`);
    return { v: v / ch.s, ctx: { k: 'cells', ch, v } };
  }
  if (ch && ch.kind === 'bgraph' && /막대를 고르게 하면 막대 하나는/.test(p)) {
    const vs = ch.items.map((x) => x.v); return { v: vs.reduce((a, b) => a + b, 0) / vs.length, ctx: { k: 'mean', vs, ch } };
  }
  // 원고 K1-1 — "가장 많은 학생이 좋아하는 과일은 무엇일까요?" (막대가 가장 긴 것 하나)
  if (ch && ch.kind === 'bgraph' && (m = /\n\n가장 (많은|적은) .+[은는] 무엇일까요\?$/.exec(p))) {
    const vs = ch.items.map((x) => x.v); const t = m[1] === '많은' ? Math.max(...vs) : Math.min(...vs);
    assert.equal(vs.filter((v) => v === t).length, 1, `가장 ${m[1]} 것이 둘: ${q}`);
    const L = ch.items.find((x) => x.v === t).label;
    return { pick: (x) => x === L, ctx: { k: 'top', L } };
  }
  if (ch && ch.kind === 'bgraph' && (m = /\n\n([^\n]+)는 몇 (\S+)일까요\?$/.exec(p))) {
    const X = labelIn(m[1], ch.items.map((x) => x.label)); const v = ch.items.find((x) => x.label === X).v;
    return { v, ctx: { k: 'read', ch, v } };
  }
  if ((m = /세로 눈금은 (\d+)칸이에요/.exec(p))) {
    const M = Math.max(...readList(q).map((x) => x[1])); const N = +m[1];
    return { v: [1, 2, 5, 10].find((s) => s * N >= M), ctx: { k: 'choose', M, N } };
  }
  if (ch && ch.kind === 'lgraph' && /가장 많이 변한 때는 언제와 언제 사이/.test(p)) {
    const vs = ch.items.map((x) => x.v); const ad = vs.slice(1).map((v, i) => Math.abs(v - vs[i]));
    const big = ad.indexOf(Math.max(...ad));
    assert.equal(ad.filter((x) => x === ad[big]).length, 1, `가장 많이 변한 곳이 둘: ${q}`);
    const xs = ch.items.map((x) => x.label);
    const gapOf = (t) => { const g = /^(\S+?)[과와] (\S+) 사이$/.exec(t); return g ? xs.indexOf(g[1]) : -1; };
    return { pick: (t) => gapOf(t) === big, ctx: { k: 'most', ch, vs, ad, big, gapOf } };
  }
  if (ch && ch.kind === 'lgraph' && (m = /\n\n(\S+)부터 (\S+)까지 .+몇 \S+ 늘었을까요\?$/.exec(p))) {
    const a = ch.items.find((x) => x.label === m[1]).v; const b = ch.items.find((x) => x.label === m[2]).v;
    assert.ok(b > a, `늘어난 구간이 아니다: ${q}`);
    return { v: b - a, ctx: { k: 'rise', ch, a, b } };
  }
  if (ch && ch.kind === 'lgraph' && (m = /\n\n(\d+시) 30분의 온도는 약 몇 도/.exec(p))) {
    const i = ch.items.findIndex((x) => x.label === m[1]); const a = ch.items[i].v; const b = ch.items[i + 1].v;
    return { v: (a + b) / 2, ctx: { k: 'mid', a, b } };
  }
  if (ch && ch.kind === 'lgraph' && /같은 만큼씩 늘어난다면/.test(p)) {
    const vs = ch.items.map((x) => x.v); const known = vs.filter((v) => v !== null);
    assert.equal(vs[vs.length - 1], null);
    const d = known[1] - known[0]; assert.ok(known.every((v, i) => !i || v - known[i - 1] === d), `같은 만큼씩이 아니다: ${q}`);
    return { v: known[known.length - 1] + d, ctx: { k: 'next', last: known[known.length - 1], d } };
  }
  if (ch && ch.kind === 'lgraph' && /물결선 위 첫 눈금에서 몇 칸 위에/.test(p)) {
    const v = +/(\d+) ?(?:kg|cm|명|번|개|도)(?:이에요|예요)\./.exec(p)[1];
    return { v: (v - ch.base) / ch.s, ctx: { k: 'point', ch, v } };
  }
  if (ch && ch.kind === 'lgraph' && (m = /\n\n(\S+)의 (.+?)[은는] 몇 (\S+)일까요\?$/.exec(p))) {
    const it = ch.items.find((x) => x.label === m[1]);
    return { v: it.v, ctx: { k: ch.base ? 'wave' : 'lread', ch, v: it.v } };
  }
  if ((m = /가장 작은 값 (\d+) · 가장 큰 값 (\d+)/.exec(p))) return { v: Math.floor(+m[1] / 5) * 5, ctx: { k: 'base', mn: +m[1], mx: +m[2] } };
  if ((m = /(꺾은선그래프|막대그래프)로 나타내기에 가장 알맞은 것은/.exec(p))) {
    const items = [...p.matchAll(/^([㉠㉡㉢㉣]) (.+)$/gm)].map((x) => ({ mk: x[1], t: x[2], time: /마다 (잰|적은) 것$/.test(x[2]) }));
    const want = m[1] === '꺾은선그래프';
    const good = items.filter((x) => x.time === want);
    assert.equal(good.length, 1, `알맞은 것이 ${good.length}개: ${q}`);
    return { pick: (t) => t === good[0].mk, ctx: { k: 'kind', items, want } };
  }
  if (/평균은 몇/.test(p) && readList(q)) {
    const vs = readList(q).map((x) => x[1]); return { v: vs.reduce((a, b) => a + b, 0) / vs.length, ctx: { k: 'mean', vs } };
  }
  if ((m = /(\d+)번의 \S+ 평균이 (\d+)\S+? .+모두 더하면 몇/.exec(p))) return { v: +m[1] * +m[2], ctx: { k: 'total', n: +m[1], m: +m[2] } };
  if ((m = /앞 (\d+)번 동안 ([\d점번, ]+?)(?:이었어요|였어요)\. (\d+)번의 평균이 (\d+)\S+ 되려면/.exec(p))) {
    const prev = nums(m[2]); assert.equal(prev.length, +m[1]); const n = +m[3]; const mm = +m[4];
    return { v: mm * n - prev.reduce((a, b) => a + b, 0), ctx: { k: 'missing', prev, n, m: mm } };
  }
  if ((m = /가 모둠 (\d+)명은 모두 (\d+)개, 나 모둠 (\d+)명은 모두 (\d+)개/.exec(p))) {
    const ga = +m[2] / +m[1]; const na = +m[4] / +m[3];
    assert.notEqual(ga, na); assert.ok((+m[2] > +m[4]) !== (ga > na), `합과 평균이 같은 쪽이면 오개념이 안 보인다: ${q}`);
    return { pick: (t) => t === (ga > na ? '가 모둠' : '나 모둠'), ctx: { k: 'group', sumBig: +m[2] > +m[4] ? '가 모둠' : '나 모둠' } };
  }
  if ((m = /게임을 (\d+)판 해서 점수 평균이 (\d+)점이에요\. 한 판을 더 해서 (\d+)판의 평균을 (\d+)점으로/.exec(p))) {
    const k = +m[1]; const m0 = +m[2]; assert.equal(+m[3], k + 1); const m1 = +m[4];
    return { v: m1 * (k + 1) - m0 * k, ctx: { k: 'raise', games: k, m0, m1 } };
  }
  if ((m = /^(.+ 가능성)[을를] 말로 나타내면/.exec(p))) {
    const lv = chanceLevel(m[1]); assert.ok(lv !== null, `가능성 글을 못 읽음: ${m[1]}`);
    return { pick: (t) => t === LV[lv], ctx: { k: 'chanceW', lv } };
  }
  if ((m = /^(.+ 가능성)[을를] 수로 나타내면/.exec(p))) {
    const lv = chanceLevel(m[1]); assert.ok(lv === 0 || lv === 2 || lv === 4, `수로 나타낼 수 없는 가능성: ${m[1]}`);
    return { v: num(LVN[lv]), ctx: { k: 'chanceN', lv, t: m[1] } };
  }
  if ((m = /빨간 구슬 (\d+)개와 파란 구슬 (\d+)개가 들어 있는 주머니에서 구슬 하나를 꺼내요\. 꺼낼 가능성이 더 높은/.exec(p))) {
    assert.notEqual(+m[1], +m[2]);
    return { pick: (t) => t === (+m[1] > +m[2] ? '빨간 구슬' : '파란 구슬'), ctx: { k: 'color', more: +m[1] > +m[2] ? '빨간 구슬' : '파란 구슬' } };
  }
  if (pc && (m = /\n\n(\S+?)[은는] 전체의 몇 %/.exec(p))) {
    const known = pc.items.filter((x) => x.v !== null).map((x) => x.v);
    assert.equal(pc.items.find((x) => x.label === m[1]).v, null);
    return { v: 100 - known.reduce((a, b) => a + b, 0), ctx: { k: 'pctRest', known } };
  }
  /** "봄을" · "불꽃 타입을" → 항목 */
  const pctLabel = (ph) => { const L = ph.replace(/ 타입[을를]$|[을를]$/, ''); const it = pc.items.find((x) => x.label === L); assert.ok(it, `항목을 못 찾음: ${ph}`); return it; };
  if (pc && (m = /조사한 학생이 모두 (\d+)명이라면 (\S+(?: 타입)?[을를]) 좋아하는 학생은 (\S+(?: 타입)?[을를]) 좋아하는 학생보다 몇 명 더 많을까요/.exec(p))) {
    const N = +m[1]; const a = pctLabel(m[2]).v; const b = pctLabel(m[3]).v;
    assert.ok(a > b, `앞 항목이 더 많아야: ${q}`);
    return { v: (N * (a - b)) / 100, ctx: { k: 'pctDiff', N, a, b } };
  }
  if (pc && (m = /조사한 학생이 모두 (\d+)명이라면 (\S+(?: 타입)?[을를]) 좋아하는 학생은 몇 명/.exec(p))) {
    const N = +m[1]; const it = pctLabel(m[2]);
    return { v: (N * it.v) / 100, ctx: { k: 'pctCount', N, pv: it.v } };
  }
  return null;
}

// ── SVG 재기 (그려진 그림에서 값으로) ──
const attr = (tag, a) => { const m = new RegExp(`\\b${a}="([^"]*)"`).exec(tag); return m ? m[1] : null; };
/** 막대·꺾은선 그림 → 이름 붙은 눈금으로 만든 자 + 막대 꼭대기·점의 값 */
function measureChart(svg) {
  const texts = [...svg.matchAll(/<text ([^>]*)>([^<]*)<\/text>/g)].map((m) => ({ a: m[1], t: m[2], x: +attr(m[1], 'x'), y: +attr(m[1], 'y') }));
  const lines = [...svg.matchAll(/<line ([^>]*)\/>/g)].map((m) => ({ x1: +attr(m[1], 'x1'), y1: +attr(m[1], 'y1'), x2: +attr(m[1], 'x2'), y2: +attr(m[1], 'y2'), op: attr(m[1], 'stroke-opacity'), cls: attr(m[1], 'class') }));
  const grid = lines.filter((l) => l.y1 === l.y2 && l.op !== null && l.cls === null);
  const ylabs = texts.filter((t) => /text-anchor="end"/.test(t.a) && /^\d+(\.\d+)?$/.test(t.t));
  // 이름 붙은 눈금 — 글자 바로 위(4.5px 아래 글자)의 눈금선
  const named = ylabs.map((t) => ({ v: Number(t.t), g: grid.find((l) => Math.abs(l.y1 - (t.y - 4.5)) < 0.01) })).filter((x) => x.g);
  assert.ok(named.length >= 2, `이름 붙은 눈금이 둘 미만: ${svg.slice(0, 200)}`);
  const top = named.sort((a, b) => a.g.y1 - b.g.y1).slice(0, 2);
  const perPx = (top[0].v - top[1].v) / (top[1].g.y1 - top[0].g.y1);
  const valAt = (y) => top[0].v + (top[0].g.y1 - y) * perPx;
  const bars = [...svg.matchAll(/<rect class="bar" ([^>]*)\/>/g)].map((m) => ({ i: +attr(m[1], 'data-i'), v: valAt(+attr(m[1], 'y')), h: +attr(m[1], 'height'), bottom: +attr(m[1], 'y') + +attr(m[1], 'height') }));
  const pts = [...svg.matchAll(/<circle class="pt" ([^>]*)\/>/g)].map((m) => ({ i: +attr(m[1], 'data-i'), v: valAt(+attr(m[1], 'cy')), y: +attr(m[1], 'cy') }));
  const gridY = grid.map((l) => l.y1);
  return { valAt, bars, pts, gridY, texts, named, perPx };
}
const close = (a, b) => Math.abs(a - b) < 1e-6;

// ───────────────────── 그림 ─────────────────────

test('그림: 지시문 → 그래프, 그린 막대·점을 **재면** 지시문 값 · 눈금선 위 · 말이 안 되는 것은 빈 글자', () => {
  const ok = ['bgraph 2x5 명 사과:12 배:20 포도:? 귤:8', 'bgraph 10x5 명 불꽃:40 물:70 풀:30 전기:120', 'lgraph 5x2 kg ~25 1월:30 2월:35 3월:?', 'lgraph 0.1x5 L 월:0.4 화:0.5 수:0.6 목:0.7 금:1.1', 'band 봄:30 여름:25 가을:35 겨울:?', 'pie 봄:30 여름:25 가을:35 겨울:10'];
  for (const s of ok) assert.ok(figureSvg(s), s);
  const bad = ['bgraph 2 명 사과:13 배:4', 'bgraph 2 명 사과:4', 'lgraph 5 kg ~23 1월:30 2월:35', 'lgraph 1 kg 1월:30 2월:?', 'band 봄:30 여름:75', 'band 봄:95 여름:5', 'pie 봄:?', 'bgraph 1 명 사과:40 배:2', 'bgraph 2x5 3 사과:4 배:2'];
  for (const s of bad) assert.equal(figureSvg(s), '', `그리면 안 된다: ${s}`);
  // 재기 — 소수 눈금·물결선 포함
  for (const s of ok.filter((x) => /graph/.test(x))) {
    const M = measureChart(figureSvg(s)); const ch = readChart(`[${s}]`);
    for (const b of M.bars) assert.ok(close(b.v, ch.items[b.i].v), `${s}: 막대 ${b.i} ${b.v} ≠ ${ch.items[b.i].v}`);
    for (const p of M.pts) assert.ok(close(p.v, ch.items[p.i].v), `${s}: 점 ${p.i} ${p.v} ≠ ${ch.items[p.i].v}`);
    assert.equal(M.bars.length + M.pts.length, ch.items.filter((x) => x.v !== null).length, `${s}: ?가 아닌 것은 다 그린다`);
  }
  assert.match(figText('[lgraph 5x2 kg ~25 1월:30 2월:35 3월:?]'), /꺾은선그래프: 눈금 한 칸 5 kg · 25부터\(물결선\) · 1월 30 · 2월 35 · 3월 \?/);
  assert.equal(figText('[pie 봄:30 여름:25 가을:35 겨울:10]', true), '(그래프)');
  assert.ok(renderFigures('a [band 봄:30 여름:70] b').includes('<svg'));
});

test('그림: 띠그래프 칸 너비 = 백분율 · 원그래프 조각 각 = 백분율 · ?는 나머지', () => {
  const svg = figureSvg('band 봄:30 여름:25 가을:35 겨울:?');
  const ws = [...svg.matchAll(/<rect class="seg" ([^>]*)\/>/g)].map((m) => +attr(m[1], 'width'));
  const tot = ws.reduce((a, b) => a + b, 0);
  assert.deepEqual(ws.map((w) => Math.round((w / tot) * 100)), [30, 25, 35, 10]);
  const pie = figureSvg('pie 봄:30 여름:25 가을:35 겨울:10');
  const paths = [...pie.matchAll(/<path class="seg" [^>]*d="M ([\d.]+) ([\d.]+) L ([\d.]+) ([\d.]+) A [\d.]+ [\d.]+ 0 (\d) 1 ([\d.]+) ([\d.]+) Z"/g)];
  assert.equal(paths.length, 4);
  const ang = (cx, cy, x, y) => (Math.atan2(y - cy, x - cx) * 180) / Math.PI;
  const pcts = paths.map((m) => { let d = ang(+m[1], +m[2], +m[6], +m[7]) - ang(+m[1], +m[2], +m[3], +m[4]); if (d < 0) d += 360; return Math.round(d / 3.6); });
  assert.deepEqual(pcts, [30, 25, 35, 10]);
});

// ───────────────────── 사다리 ─────────────────────

test('사다리: 9칸, 초4 다섯 + 초5 셋 + 초6 하나, needs가 바로 앞 칸, id는 dat.', () => {
  assert.equal(DATA.length, 9);
  const ids = DATA.map((c) => c.id);
  assert.equal(new Set(ids).size, 9);
  assert.deepEqual(DATA.map((c) => c.grade), [4, 4, 4, 4, 4, 5, 5, 5, 6]);
  for (const [k, c] of DATA.entries()) {
    assert.ok(/^dat\./.test(c.id) && c.name && c.idea && c.slip, c.id);
    assert.deepEqual(c.needs, k ? [ids[k - 1]] : []);
  }
  assert.equal(gradeLabel(6), '초6');
  assert.equal(valueOf('35%'), 35);
  assert.equal(valueOf('1/2'), 0.5);
  assert.equal(valueOf('반반이다'), null);
});

// ───────────────────── ① 독립 검산 ─────────────────────

test('★ 독립 검산: ① 정답이 문제 글·그래프를 따로 읽어 푼 답과 같다 · 딱 하나만 맞다', () => {
  const kinds = {};
  for (const c of DATA) {
    for (let s = 1; s <= SEEDS; s++) {
      const q = makeQuestion(c.id, 'calc', s * 7919, OPTS);
      const where = `${c.id} seed ${s}: "${q.q.replace(/\n/g, ' ')}"`;
      const w = solveText(q.q);
      assert.ok(w, `${where} — 글을 못 읽었다 (해석기에 말투를 더할 것)`);
      kinds[`${c.id} ${w.ctx.k}`] = (kinds[`${c.id} ${w.ctx.k}`] || 0) + 1;
      const ok = q.choices.find((x) => x.ok).text;
      if (w.v !== undefined) {
        assert.ok(close(num(ok), w.v), `${where} — 정답 ${ok} ≠ ${w.v}`);
        for (const x of q.choices.filter((y) => !y.ok)) assert.ok(!close(num(x.text), w.v), `${where} — 오답 ${x.text}이 사실 정답`);
      } else {
        const good = q.choices.filter((x) => w.pick(x.text));
        assert.equal(good.length, 1, `${where} — 맞는 보기가 ${good.length}개 (${q.choices.map((x) => x.text).join(' / ')})`);
        assert.ok(good[0].ok, `${where} — 맞는 보기가 정답 표시가 아니다`);
      }
    }
  }
  // 모든 문항 가족이 나온다 (개념마다 얼굴이 여럿)
  const want = ['dat.bar scale', 'dat.bar read', 'dat.bar diff', 'dat.bar times', 'dat.barmake cells', 'dat.barmake choose', 'dat.line lread', 'dat.line most', 'dat.line rise',
    'dat.wave wave', 'dat.wave mid', 'dat.wave next', 'dat.choose kind', 'dat.choose point', 'dat.choose base', 'dat.mean mean', 'dat.meanuse total', 'dat.meanuse missing', 'dat.meanuse group', 'dat.meanuse raise',
    'dat.chance chanceW', 'dat.chance chanceN', 'dat.chance color', 'dat.percent pctRest', 'dat.percent pctCount', 'dat.percent pctDiff'];
  for (const k of want) assert.ok(kinds[k] >= 10, `${k} 가족이 드물다 (${kinds[k] || 0})`);
});

test('★ 그린 그래프를 재면 지시문 값과 같다 — 생성기 문제의 모든 막대·꺾은선 (눈금선 위, 16칸 이하)', () => {
  let n = 0;
  for (const c of DATA) {
    for (let s = 1; s <= Math.min(SEEDS, 400); s++) {
      for (const kind of ['calc', 'misread']) {
        const q = makeQuestion(c.id, kind, s * 104729, OPTS);
        for (const f of q.q.match(/\[(bgraph|lgraph) [^\]]+\]/g) || []) {
          const svg = figureSvg(f.slice(1, -1)); assert.ok(svg, `${c.id}/${kind} seed ${s}: 못 그림 ${f}`);
          const ch = readChart(f); const M = measureChart(svg);
          for (const b of M.bars) { assert.ok(close(b.v, ch.items[b.i].v), `${f}: 막대 ${b.i} = ${b.v}`); assert.ok(M.gridY.some((y) => Math.abs(y - (b.bottom - b.h)) < 0.01), `${f}: 막대 꼭대기가 눈금선 위가 아니다`); }
          for (const p of M.pts) { assert.ok(close(p.v, ch.items[p.i].v), `${f}: 점 ${p.i} = ${p.v}`); assert.ok(M.gridY.some((y) => Math.abs(y - p.y) < 0.01), `${f}: 점이 눈금선 위가 아니다`); }
          assert.ok(chartGeom(parseChart(ch.kind, f.slice(ch.kind.length + 2, -1))).cells <= 16);
          n++;
        }
      }
    }
  }
  assert.ok(n > 2000, `잰 그래프 ${n}개`);
});

/** 그래프 하나의 이름표 검사 — 겹침·그림 밖·띠 칸 밖·원그래프 경계선 (생성기 문제와 원고가 같이 쓴다) */
function assertChartLabels(f) {
  const W = (t, size) => [...t].reduce((a, ch) => a + (/[가-힣ㄱ-ㅎ]/.test(ch) ? size * 1.05 : size * 0.62), 0);
  const svg = figureSvg(f.slice(1, -1)); const vb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg); const SW = +vb[1]; const SH = +vb[2];
  const texts = [...svg.matchAll(/<text ([^>]*)>([^<]*)<\/text>/g)].map((m) => {
    const size = +attr(m[1], 'font-size'); const w = W(m[2], size); const x = +attr(m[1], 'x'); const anc = attr(m[1], 'text-anchor');
    const x0 = anc === 'middle' ? x - w / 2 : anc === 'end' ? x - w : x; return { t: m[2], x0, x1: x0 + w, y0: +attr(m[1], 'y') - size * 0.8, y1: +attr(m[1], 'y') + size * 0.2 };
  });
  for (const t of texts) assert.ok(t.x0 >= -1 && t.x1 <= SW + 1 && t.y0 >= -1 && t.y1 <= SH + 1, `${f}: 이름 "${t.t}"이 그림 밖`);
  for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
    const a = texts[i]; const b = texts[j];
    const hit = a.x0 < b.x1 - 0.5 && b.x0 < a.x1 - 0.5 && a.y0 < b.y1 - 0.5 && b.y0 < a.y1 - 0.5;
    assert.ok(!hit, `${f}: 이름 "${a.t}"과 "${b.t}"이 겹침`);
  }
  if (/^\[band/.test(f)) {
    const segs = [...svg.matchAll(/<rect class="seg" ([^>]*)\/>/g)].map((m) => ({ x0: +attr(m[1], 'x'), x1: +attr(m[1], 'x') + +attr(m[1], 'width') }));
    const labs = texts.filter((t) => t.y1 < 60);
    for (const t of labs) assert.ok(segs.some((g) => t.x0 >= g.x0 - 0.5 && t.x1 <= g.x1 + 0.5), `${f}: 띠 이름 "${t.t}"이 칸 밖`);
  }
  if (/^\[pie/.test(f)) {
    // 조각 경계선(가운데 → 둘레)이 이름표를 지나가지 않는다 · 이름표는 원 안
    const rays = [...svg.matchAll(/<path class="seg" [^>]*d="M ([\d.]+) ([\d.]+) L ([\d.]+) ([\d.]+) A/g)].map((m) => [[+m[1], +m[2]], [+m[3], +m[4]]]);
    const cx = rays[0][0][0]; const cy = rays[0][0][1]; const R = Math.hypot(rays[0][1][0] - cx, rays[0][1][1] - cy);
    const crosses = ([a, b], B) => { let t0 = 0; let t1 = 1; const dx = b[0] - a[0]; const dy = b[1] - a[1]; for (const [p, q2] of [[-dx, a[0] - B.x0], [dx, B.x1 - a[0]], [-dy, a[1] - B.y0], [dy, B.y1 - a[1]]]) { if (p === 0) { if (q2 < 0) return false; continue; } const rr = q2 / p; if (p < 0) { if (rr > t1) return false; if (rr > t0) t0 = rr; } else { if (rr < t0) return false; if (rr < t1) t1 = rr; } } return true; };
    for (const t of texts) {
      for (const ray of rays) assert.ok(!crosses(ray, t), `${f}: 경계선이 이름 "${t.t}"을 지나간다`);
      for (const [x, y] of [[t.x0, t.y0], [t.x1, t.y0], [t.x0, t.y1], [t.x1, t.y1]]) assert.ok(Math.hypot(x - cx, y - cy) < R, `${f}: 이름 "${t.t}"이 원 밖`);
    }
  }
}

test('그래프 이름표: 가로 이름끼리·세로 눈금 이름끼리 안 겹치고 그림 밖으로 안 나간다 · 띠그래프 이름이 제 칸 안 · 원그래프 이름이 제 조각 안', () => {
  let n = 0;
  for (const c of DATA) {
    for (let s = 1; s <= 200; s++) {
      for (const kind of ['calc', 'misread']) {
        const q = makeQuestion(c.id, kind, s * 31, OPTS);
        for (const f of q.q.match(/\[(bgraph|lgraph|band|pie) [^\]]+\]/g) || []) { assertChartLabels(f); n++; }
      }
    }
  }
  assert.ok(n > 1000, `검사한 그래프 ${n}개`);
});

test('✍️ 그리기 문항(draw): 그래프에 ?가 그 자리 · 정답 칸이 그래프 안에 들어간다 · 숫자판 단위는 "칸"', () => {
  let n = 0;
  for (const id of ['dat.barmake', 'dat.choose']) {
    for (let s = 1; s <= SEEDS; s++) {
      const q = makeQuestion(id, 'calc', s * 7919, OPTS);
      if (!q.draw) continue;
      n++;
      const where = `${id} seed ${s}`;
      assert.ok(q.q.includes(`[${q.draw.fig}]`), `${where}: draw 그림이 문제 글의 그래프와 다르다`);
      const kind = q.draw.fig.split(' ')[0];
      const sp = parseChart(kind, q.draw.fig.slice(kind.length + 1)); const G = chartGeom(sp);
      assert.equal(sp.items[q.draw.target].v, null, `${where}: 그릴 자리가 ?가 아니다`);
      assert.equal(q.draw.mode, kind === 'bgraph' ? 'bar' : 'point');
      const ok = num(q.choices.find((x) => x.ok).text);
      assert.ok(Number.isInteger(ok) && ok >= 1 && ok <= G.cells, `${where}: 정답 ${ok}칸이 그래프(${G.cells}칸) 안에 없다`);
      assert.equal(G.valueOfCells(ok), solveText(q.q).ctx.v, `${where}: 정답 칸을 값으로 되돌리면 글의 값`);
      assert.equal(padSpec(q).unit, '칸');
    }
  }
  assert.ok(n > 100, `그리기 문항 ${n}개`);
});

test('★ 보기: 정답 하나, 겹침 없음, 새는 글자 없음, 수 범위, 그림 지시문은 그려진다 · 숫자판 단위', () => {
  for (const c of DATA) {
    for (let s = 1; s <= SEEDS; s++) {
      for (const kind of ['calc', 'misread']) {
        const q = makeQuestion(c.id, kind, s * 104729, OPTS);
        const where = `${c.id}/${kind} seed ${s}`;
        assert.equal(q.choices.filter((x) => x.ok).length, 1, `${where}: 정답 하나`);
        assert.ok(q.choices.length >= 3, `${where}: 보기 3개↑ (${q.choices.map((x) => x.text).join(' / ')})`);
        const texts = q.choices.map((x) => String(x.text).trim());
        assert.equal(new Set(texts).size, texts.length, `${where}: 글자가 같은 보기`);
        const vs = q.choices.map((x) => valueOf(x.text)).filter((v) => v !== null);
        assert.equal(new Set(vs).size, vs.length, `${where}: 값이 같은 보기 (${texts.join(' / ')})`);
        for (const ch of q.choices) {
          const t = String(ch.text);
          assert.ok(t && !/undefined|NaN|null|Infinity/.test(t), `${where}: 이상한 보기 "${t}"`);
          assert.ok(ch.ok || ch.tag, `${where}: 오답 "${t}"에 이름표가 없다`);
        }
        const all = `${q.q} ${q.expr} ${JSON.stringify(q.solve)} ${JSON.stringify(q.choices)}`;
        assert.ok(!/undefined|NaN|null|\{(me|mon)/.test(all), `${where}: 글에 새는 것 — ${all.slice(0, 160)}`);
        for (const n of nums(q.q.replace(/\[[a-z]+ [^\]]+\]/g, ''))) assert.ok(n <= 400, `${where}: 너무 큰 수 ${n} — ${q.q}`);
        for (const ch of q.choices) for (const n of nums(ch.text)) assert.ok(n <= 5000, `${where}: 보기에 너무 큰 수 ${n}`);
        for (const f of q.q.match(/\[[a-z]+ [^\]]+\]/g) || []) assert.ok(figureSvg(f.slice(1, -1)), `${where}: 못 그리는 그림 ${f}`);
        // 숫자판 — 수 답이면 칸이 생기고, 단위는 질문의 것 (%는 %)
        if (kind === 'calc' && textVal(q.choices.find((x) => x.ok).text)) {
          const sp = padSpec(q); assert.ok(sp, `${where}: 숫자판이 안 생김`);
          if (/몇 %/.test(q.q)) assert.equal(sp.unit, '%', where);
        }
      }
    }
  }
});

// ───────────────────── 이름표의 뜻 ─────────────────────

test('★ 오개념 이름표: 그 오답이 정말 그 실수다 (따로 읽은 문제로 그 실수를 흉내 내면 그 값)', () => {
  const seen = {};
  for (const c of DATA) {
    for (let s = 1; s <= SEEDS; s++) {
      const q = makeQuestion(c.id, 'calc', s * 31337, OPTS);
      const w = solveText(q.q); const x = w.ctx;
      for (const ch of q.choices.filter((y) => !y.ok)) {
        if (ch.tag === '계산 실수') continue;
        const where = `${c.id} seed ${s}: "${ch.tag}" 오답 ${ch.text} — ${q.q.replace(/\n/g, ' ')}`;
        const v = num(ch.text);
        const hit = (cond) => { seen[ch.tag] = (seen[ch.tag] || 0) + 1; assert.ok(cond, where); };
        const ch2 = x.ch; const s2 = ch2 ? ch2.s : 0; const sab = ch2 ? ch2.s * ch2.lab : 0;
        switch (ch.tag) {
          case TAGS.cellAsOne:
            if (x.k === 'scale') hit(v === 1);
            else if (x.k === 'read' || x.k === 'lread') hit(v === x.v / s2);
            else if (x.k === 'diff') hit(v === (x.mx - x.mn) / s2);
            else if (x.k === 'times') hit(v === (x.va - x.vb) / s2);
            else if (x.k === 'rise') hit(v === (x.b - x.a) / s2);
            else if (x.k === 'wave') hit(v === ch2.base + (x.v - ch2.base) / s2);
            else if (x.k === 'point') hit(v === x.v - ch2.base);
            else if (x.k === 'mean') hit(v === w.v / s2);
            else hit(false);
            break;
          case TAGS.labelGap: hit(x.k === 'scale' ? v === sab : v === (x.v / s2) * sab); break;
          case TAGS.countAsScale: hit(x.k === 'scale' && v === ch2.lab); break;
          case TAGS.addForDiff: hit(x.k === 'diff' ? v === x.mx + x.mn : x.k === 'pctDiff' ? v === (x.N * (x.a + x.b)) / 100 : v === x.a + x.b); break;
          case TAGS.maxOnly: hit(v === x.mx); break;
          case TAGS.diffForTimes: hit(x.k === 'times' ? v === x.va - x.vb : v === x.a - x.b); break;
          case TAGS.valueAsCells: hit(v === x.v); break;
          case TAGS.mulScale: hit(v === x.v * s2); break;
          case TAGS.tooSmall: hit(v * x.N < x.M); break;
          case TAGS.notSmallest: hit(v * x.N >= x.M && v > w.v); break;
          case TAGS.endOnly: hit(v === x.b); break;
          case TAGS.fromZero: hit(x.k === 'wave' ? v === x.v - ch2.base : v === x.v / s2); break;
          case TAGS.sumForMid: hit(v === x.a + x.b); break;
          case TAGS.nearOnly: hit(v === x.a || v === x.b); break;
          case TAGS.noChange: hit(v === x.last); break;
          case TAGS.diffOnly: hit(x.k === 'next' ? v === x.d : v === 1); break;
          case TAGS.skipOne: hit(v === x.last + 2 * x.d); break;
          case TAGS.aboveMin: hit(v > x.mn); break;
          case TAGS.noWave: hit(v === 0); break;
          case TAGS.sumOnly: hit(v === x.vs.reduce((a, b) => a + b, 0)); break;
          case TAGS.midrange: hit(v === (Math.max(...x.vs) + Math.min(...x.vs)) / 2); break;
          case TAGS.dropZero: hit(x.vs.includes(0) && v === x.vs.reduce((a, b) => a + b, 0) / x.vs.filter((y) => y).length); break;
          case TAGS.wrongCount:
            if (x.k === 'mean') hit(v === x.vs.reduce((a, b) => a + b, 0) / (x.vs.length - 1));
            else if (x.k === 'total') hit(v === x.m * (x.n - 1));
            else if (x.k === 'missing') hit(v === x.m * (x.n - 1) - x.prev.reduce((a, b) => a + b, 0));
            else hit(false);
            break;
          case TAGS.addForTimes: hit(v === x.m + x.n); break;
          case TAGS.meanAsTotal: hit(v === x.m); break;
          case TAGS.meanAsMissing: hit(x.k === 'missing' ? v === x.m : v === x.m1); break;
          case TAGS.totalOnly: hit(x.k === 'missing' ? v === x.m * x.n : v === x.m1 * (x.games + 1)); break;
          case TAGS.countAsChance: hit(Number.isInteger(v) && v > 1 && x.t.includes(String(v)) || (x.lv === 2 && /짝수/.test(x.t) && v === Number(/(\d+)까지/.exec(x.t)[1]) / 2)); break;
          case TAGS.restAsPart: hit(v === x.known.reduce((a, b) => a + b, 0)); break;
          case TAGS.dropOne: hit(v === 100 - x.known.slice(0, -1).reduce((a, b) => a + b, 0)); break;
          case TAGS.pctAsCount: hit(x.k === 'pctDiff' ? v === x.a - x.b : v === x.pv); break;
          case TAGS.restCount: hit(v === x.N - w.v); break;
          case TAGS.wrongDiv: hit(x.k === 'pctDiff' ? v === (x.N * (x.a - x.b)) / 10 : v === (x.N * x.pv) / 10); break;
          default:
            if (x.k === 'chanceN' && [TAGS.oppositeChance, TAGS.farChance, TAGS.evenAsLikely].includes(ch.tag)) {
              const pv = { 0: 0, 0.5: 2, 1: 4 }[v]; hit(pv !== undefined && pv !== x.lv); break;
            }
            // 문장 보기의 이름표
            if (x.k === 'most') {
              const gi = x.gapOf(ch.text); assert.ok(gi >= 0, where);
              if (ch.tag === TAGS.maxValueAsChange) hit(x.vs.indexOf(Math.max(...x.vs)) === gi + 1);
              else if (ch.tag === TAGS.leastChange) hit(x.ad[gi] === Math.min(...x.ad));
              else hit(false);
            } else if (x.k === 'kind') {
              const it = x.items.find((y) => y.mk === ch.text);
              hit(ch.tag === (x.want ? TAGS.barForLine : TAGS.lineForBar) && it && it.time !== x.want);
            } else if (x.k === 'group') hit(ch.tag === TAGS.sumCompare ? ch.text === x.sumBig : ch.tag === TAGS.equalGuess && ch.text === '두 모둠이 같아요');
            else if (x.k === 'color') hit(ch.tag === TAGS.fewerAsLikely ? ch.text !== x.more && ch.text !== '두 색이 같아요' : ch.tag === TAGS.equalGuess);
            else if (x.k === 'chanceW') {
              const pi = LV.indexOf(ch.text); assert.ok(pi >= 0, where);
              const exp = { [TAGS.likelyAsCertain]: [3, 4], [TAGS.certainAsLikely]: [4, 3], [TAGS.unlikelyAsImpossible]: [1, 0], [TAGS.impossibleAsUnlikely]: [0, 1] }[ch.tag];
              if (exp) hit(x.lv === exp[0] && pi === exp[1]);
              else if (ch.tag === TAGS.evenAsLikely) hit(x.lv === 2 && (pi === 1 || pi === 3));
              else if (ch.tag === TAGS.leanAsEven) hit((x.lv === 1 || x.lv === 3) && pi === 2);
              else if (ch.tag === TAGS.oppositeChance) hit(pi === 4 - x.lv);
              else if (ch.tag === TAGS.farChance) hit(Math.abs(pi - x.lv) >= 2 && pi !== 4 - x.lv);
              else hit(false);
            } else assert.fail(`${where}: 이 이름표를 검사하지 못했다`);
        }
      }
    }
  }
  const used = Object.values(TAGS).filter((t) => (seen[t] || 0) >= 5);
  const notSeen = Object.values(TAGS).filter((t) => !(seen[t] >= 5) && ![TAGS.equalGuess].includes(t));
  assert.ok(used.length >= 40, `검사한 이름표 ${used.length}종 — 안 나온 것: ${notSeen.join(', ')}`);
});

// ───────────────────── ② 오개념 문항 ─────────────────────

test('★ ② 오개념 문항: 보여 준 말은 정말 틀렸다 · 고친 답은 맞다 · 갈래 열쇠', () => {
  const branches = {};
  for (const c of DATA) {
    for (let s = 1; s <= SEEDS; s++) {
      const q = makeQuestion(c.id, 'misread', s * 7717, OPTS);
      const where = `${c.id} seed ${s}: ${q.q.replace(/\n/g, ' ')}`;
      assert.ok(/^misread:/.test(q.key || ''), where);
      branches[`${c.id} ${q.key}`] = (branches[`${c.id} ${q.key}`] || 0) + 1;
      assert.ok(/\*\*.+\*\*/.test(q.q), where);
      const shown = /\*\*(.+)\*\*/.exec(q.q)[1];
      const ok = q.choices.find((x) => x.ok).text;
      const ch = readChart(q.q); const pc = readPct(q.q);
      let m;
      // 평균 줄기의 mid·zero는 물결선 줄기의 mid·zero와 이름만 같다 — 따로 본다
      switch (c.id === 'dat.mean' ? `mean:${q.key}` : q.key) {
        case 'misread:scale':
          if (c.id === 'dat.bar') { const X = labelIn(shown, ch.items.map((x) => x.label)); const v = ch.items.find((x) => x.label === X).v; assert.notEqual(nums(shown)[0], v, where); assert.equal(lastNum(ok), v, where); }
          else { const M = +/가장 큰 값 (\d+)/.exec(q.q)[1]; assert.ok(nums(shown)[0] * 10 < M, where); assert.ok(/한 칸을 (\d+)/.exec(ok)[1] * 10 >= M, where); }
          break;
        case 'misread:diff': { const vs = ch.items.map((x) => x.v); const d = Math.max(...vs) - Math.min(...vs); assert.notEqual(lastNum(shown), d, where); assert.equal(lastNum(ok), d, where); break; }
        case 'misread:cells':
          if (c.id === 'dat.barmake') { const s1 = +/한 칸이 (\d+)/.exec(q.q)[1]; const v = +/학생 수 (\d+)|수 (\d+)\S+[을를] 그리려고/.exec(q.q).slice(1).find(Boolean); assert.notEqual(nums(shown).pop(), v / s1, where); assert.equal(lastNum(ok.replace(/칸만큼.*$/, '')), v / s1, where); }
          else { const X = /^(\S+)의/.exec(shown)[1]; const v = ch.items.find((x) => x.label === X).v; assert.notEqual(+/[은는] (\d+)/.exec(shown)[1], v, where); assert.equal(lastNum(ok), v, where); }
          break;
        case 'misread:most': {
          const vs = ch.items.map((x) => x.v); const ad = vs.slice(1).map((v, i) => Math.abs(v - vs[i])); const big = ad.indexOf(Math.max(...ad));
          const xs = ch.items.map((x) => x.label); const said = /때는 (\S+?)[과와] (\S+) 사이/.exec(shown); assert.notEqual(xs.indexOf(said[1]), big, where);
          const fix = /— (\S+?)[과와] (\S+) 사이$/.exec(ok); assert.equal(xs.indexOf(fix[1]), big, where);
          break;
        }
        case 'misread:zero': { const X = /^(\S+)의/.exec(shown)[1]; const v = ch.items.find((x) => x.label === X).v; assert.notEqual(+/[은는] (\d+)/.exec(shown)[1], v, where); assert.equal(lastNum(ok), v, where); break; }
        case 'misread:mid': { const h = /(\d+시) 30분/.exec(shown)[1]; const i = ch.items.findIndex((x) => x.label === h); const mid = (ch.items[i].v + ch.items[i + 1].v) / 2; assert.notEqual(lastNum(shown), mid, where); assert.equal(lastNum(ok), mid, where); break; }
        case 'misread:kind': assert.ok(/마다 (잰|적은) 것은 막대그래프/.test(shown) && /꺾은선그래프/.test(ok), where); break;
        case 'misread:wave': { const mn = +/가장 작은 값이 (\d+)/.exec(q.q)[1]; assert.ok(lastNum(shown) > mn, where); assert.ok(lastNum(ok) <= mn, where); break; }
        default:
          if (c.id === 'dat.mean') {
            const list = /: (.+)\n/.exec(q.q)[1].split(' · ').map((x) => +/ (\d+)/.exec(x)[1]);
            const mean = list.reduce((a, b) => a + b, 0) / list.length; assert.notEqual(lastNum(shown), mean, where); assert.equal(lastNum(ok), mean, where);
          } else if (q.key === 'misread:total') { m = /(\d+)번 기록의 평균이 (\d+)번/.exec(q.q); assert.notEqual(lastNum(shown), +m[1] * +m[2], where); assert.equal(lastNum(ok), +m[1] * +m[2], where); }
          else if (q.key === 'misread:compare') { m = /가 모둠 (\d+)명은 모두 (\d+)개, 나 모둠 (\d+)명은 모두 (\d+)개/.exec(q.q); const winner = +m[2] / +m[1] > +m[4] / +m[3] ? '가 모둠' : '나 모둠'; assert.ok(shown.includes('가 모둠') && winner === '나 모둠' && ok.endsWith(`${winner}이 더 많아요`), where); }
          else if (q.key === 'misread:likely') { assert.ok(/확실/.test(shown) && /~일 것 같다/.test(ok), where); }
          else if (q.key === 'misread:count') { assert.ok(nums(shown).pop() > 1 && /1\/2/.test(ok), where); }
          else if (q.key === 'misread:pct') { m = /조사한 학생은 (\d+)명/.exec(q.q); const X = /^(\S+?)[을를] 좋아하는|^(\S+) 타입/.exec(shown); const L = X[1] || X[2]; const p = pc.items.find((y) => y.label === L).v; assert.notEqual(lastNum(shown), (+m[1] * p) / 100, where); assert.equal(lastNum(ok), (+m[1] * p) / 100, where); }
          else if (q.key === 'misread:sum') { const known = pc.items.filter((y) => y.v !== null).map((y) => y.v); const right = 100 - known.reduce((a, b) => a + b, 0); assert.notEqual(lastNum(shown), right, where); assert.equal(lastNum(ok), right, where); }
          else assert.fail(`${where}: 이 ② 모양을 모른다`);
      }
    }
  }
  for (const [k, n] of Object.entries(branches)) assert.ok(n >= Math.min(100, SEEDS / 6), `${k} 갈래가 드물다 (${n})`);
  const want = ['dat.bar misread:scale', 'dat.bar misread:diff', 'dat.barmake misread:cells', 'dat.barmake misread:scale', 'dat.line misread:most', 'dat.line misread:cells', 'dat.wave misread:zero', 'dat.wave misread:mid',
    'dat.choose misread:kind', 'dat.choose misread:wave', 'dat.mean misread:mid', 'dat.mean misread:zero', 'dat.meanuse misread:total', 'dat.meanuse misread:compare', 'dat.chance misread:likely', 'dat.chance misread:count', 'dat.percent misread:pct', 'dat.percent misread:sum'];
  assert.deepEqual(Object.keys(branches).sort(), [...want].sort());
});

// ───────────────────── 글 ─────────────────────

test('★ 조사: 수 뒤(12는·36은·8과·3으로·7로·6이에요·9예요) · 단위 뒤(명이에요·kg이에요·cm예요)', () => {
  const BAT = new Set(['0', '1', '3', '6', '7', '8']);
  const PAIR = { 이: true, 가: false, 을: true, 를: false, 은: true, 는: false, 과: true, 와: false };
  const LONG = { 이에요: true, 예요: false, 이라서: true, 라서: false, 이니까: true, 니까: false, 이고: true, 고: false, 이면: true, 면: false };
  let checked = 0;
  for (const c of DATA) {
    for (let s = 1; s <= 300; s++) {
      for (const kind of ['calc', 'misread']) {
        const q = makeQuestion(c.id, kind, s * 3571, OPTS);
        const texts = [q.q, ...q.choices.map((x) => x.text), ...q.solve.steps, q.solve.whyAny, ...Object.values(q.solve.why)];
        for (const t0 of texts) {
          const t = String(t0).replace(/\[[a-z]+ [^\]]+\]/g, '');
          // 분수(1/2)는 분자로 읽는다("이분의 일이에요") — 분모 뒤 조사는 건너뛴다
          for (const m of t.matchAll(/(?<![/\d])(\d+)(으로|로|이|가|을|를|은|는|과|와)(?![가-힣])/g)) {
            const last = m[1].slice(-1); checked++;
            if (m[2] === '으로' || m[2] === '로') assert.equal(m[2], ['0', '3', '6'].includes(last) ? '으로' : '로', `${c.id}/${kind} seed ${s}: "${m[0]}" (${t})`);
            else assert.equal(PAIR[m[2]], BAT.has(last), `${c.id}/${kind} seed ${s}: "${m[0]}" (${t})`);
          }
          for (const m of t.matchAll(/(?<![/\d])(\d+)(이에요|예요|이라서|라서|이니까|니까|이고|고|이면|면)(?![가-힣])/g)) {
            checked++;
            assert.equal(LONG[m[2]], BAT.has(m[1].slice(-1)), `${c.id}/${kind} seed ${s}: "${m[0]}" (${t})`);
          }
          // 단위 뒤 — kg(킬로그램)은 받침, L·cm은 없음
          assert.doesNotMatch(t, /kg(예요|가|를|는|라서|와)(?![가-힣])|(cm|L)(이에요|이|을|은|이라서|과)(?![가-힣])/, `${c.id}/${kind} seed ${s}: 영문 단위 뒤 조사 (${t})`);
          assert.doesNotMatch(t, /\d(kg|cm|L)\b/, `${c.id}/${kind} seed ${s}: 영문 단위는 띄운다 (${t})`);
        }
      }
    }
  }
  assert.ok(checked > 1000, `조사 검사 ${checked}건`);
});

test('★ 풀이 카드: 단계 2줄↑ · 기억할 것 · 오답마다 왜 · 수 정답은 단계에 나온다', () => {
  for (const c of DATA) {
    for (const kind of ['calc', 'misread']) {
      for (let s = 1; s <= 400; s++) {
        const q = makeQuestion(c.id, kind, s * 131, OPTS);
        const where = `${c.id}/${kind} seed ${s}`;
        assert.ok(q.solve && q.solve.steps.length >= 2 && q.solve.rule, where);
        for (const ch of q.choices) if (!ch.ok) assert.ok(q.solve.why[ch.tag] || q.solve.whyAny, `${where}: 오답 "${ch.tag}" 설명 없음`);
        if (kind !== 'calc') continue;
        const ok = q.choices.find((x) => x.ok).text;
        const v = valueOf(ok);
        assert.ok(q.solve.steps.some((st) => st.includes(ok.replace('%', '')) || (v !== null && nums(st).includes(v))), `${where}: 풀이에 정답 ${ok} 없음 — ${q.solve.steps.join(' / ')}`);
      }
    }
  }
});

test('아직 안 배운 말을 앞 칸에서 쓰지 않는다 — 꺾은선 K3 · 물결선 K4 · 평균 K6 · 가능성 K8 · 띠·원그래프·백분율·% K9', () => {
  const RULES = [[/꺾은선/, 2], [/물결선/, 3], [/평균/, 5], [/가능성|불가능|확실/, 7], [/띠그래프|원그래프|백분율|%/, 8]];
  for (const c of DATA) {
    const i = IDX[c.id];
    const texts = [c.name, c.idea, c.slip];
    for (let s = 1; s <= 200; s++) for (const kind of ['calc', 'misread']) {
      const q = makeQuestion(c.id, kind, s * 977, OPTS);
      texts.push(q.q, ...q.choices.map((x) => x.text), ...q.solve.steps, q.solve.whyAny, q.solve.rule, ...Object.values(q.solve.why));
    }
    for (const [re, from] of RULES) if (i < from) for (const t of texts) assert.doesNotMatch(String(t).replace(/\[[a-z]+ [^\]]+\]/g, ''), re, `${c.id}: 아직 안 배운 말 ${re} — ${t}`);
  }
});

test('문제 이야기에 가족을 지어내지 않는다 (진우에게는 동생이 없다)', () => {
  for (const c of DATA) for (let s = 1; s <= 200; s++) for (const kind of ['calc', 'misread']) {
    const q = makeQuestion(c.id, kind, s * 59, OPTS);
    assert.doesNotMatch(`${q.q} ${q.choices.map((x) => x.text).join(' ')}`, /동생|누나|언니|오빠|형이|형은|형의/, `${c.id}: ${q.q}`);
  }
});

// ───────────────────── 쌍둥이 ─────────────────────

test('🔁 쌍둥이·🤔 노트: 요청한 틀·갈래로 온다 (주제·물을 항목·? 자리·조건이 붙은 짝까지)', () => {
  let tried = 0;
  for (const c of DATA) {
    for (const kind of ['calc', 'misread']) {
      const keys = new Set();
      for (let s = 1; s <= 300; s++) keys.add(makeQuestion(c.id, kind, s * 37, OPTS).key);
      for (const key of keys) {
        for (let s = 1; s <= 40; s++) {
          const q = makeQuestion(c.id, kind, s * 911, { ...OPTS, want: { k: kind, key } });
          tried++;
          assert.equal(q.key, key, `${c.id}/${kind} seed ${s}: ${key.slice(0, 90)}를 요청했는데 ${q.key.slice(0, 90)}`);
        }
      }
    }
  }
  assert.ok(tried > 2000, `검사 ${tried}건`);
});

test('🔁 쌍둥이는 같은 틀이되 글이 달라야 한다 — 원래 문제와 글자까지 같은 쌍둥이는 틀마다 30% 이하', () => {
  for (const c of DATA) {
    for (const kind of ['calc', 'misread']) {
      const byKey = {};
      for (let s = 1; s <= 400; s++) {
        const q = makeQuestion(c.id, kind, s * 131, OPTS);
        const t = makeQuestion(c.id, kind, s * 131 + 7, { ...OPTS, want: { k: kind, key: q.key } });
        const b = (byKey[q.key] = byKey[q.key] || { n: 0, same: 0 });
        b.n++; if (t.q === q.q) b.same++;
      }
      for (const [key, b] of Object.entries(byKey)) if (b.n >= 20) assert.ok(b.same / b.n <= 0.3, `${c.id}/${kind} "${key.slice(0, 60)}": 쌍둥이 ${b.same}/${b.n}가 원래 문제와 같은 글`);
    }
  }
});

// ───────────────────── 진단·사다리·한 편·원고 ─────────────────────

test('📏 진단·사다리·한 편·배움 예비·내용 검사', () => {
  const d = diagnosticSet(9, 5, OPTS);
  assert.deepEqual(d.map((q) => q.concept), ['dat.bar', 'dat.line', 'dat.choose', 'dat.meanuse', 'dat.percent']);
  const pl = placeFrom([{ concept: 'dat.bar', correct: true }, { concept: 'dat.line', correct: false }]);
  assert.equal(pl.startId, 'dat.line');
  assert.deepEqual(pl.knownIds, ['dat.bar', 'dat.barmake']);
  assert.deepEqual(ladder(['dat.bar']).slice(0, 3).map((x) => x.state), ['done', 'now', 'locked']);
  const round = makeRound('dat.mean', 5, OPTS);
  assert.deepEqual(round.map((q) => q.kind), ['calc', 'misread']);
  const ls = lessonOf('dat.mean', 3, OPTS);
  assert.equal(ls.title, '평균 구하기'); assert.ok(ls.pages[0].say.includes('평균'));
  assert.equal(conceptById('dat.nope'), null);
  assert.equal(checkContent({}).length, 9, '원고가 없으면 칸마다 하나씩');
  // 화면 연결용 — 한 줄 요약은 그래프를 (그래프)로
  assert.equal(figText('글 [bgraph 2x5 명 사과:12 배:20]', true), '글 (그래프)');
});

test('✍️ 점 찍기 판(3단계): 그린 칸 수가 숫자판과 같은 채점 길로 — 정답 칸은 정답 · "값을 그대로 칸으로"·"0부터"는 그 오개념 · 다른 칸은 짐작 · 글에서 뺄 그래프는 하나뿐', () => {
  const seen = { ok: 0, tag: 0, guess: 0 };
  for (const id of ['dat.barmake', 'dat.choose']) {
    for (let s = 1; s <= 300; s++) {
      const q = makeQuestion(id, 'calc', s * 7919, OPTS);
      if (!q.draw) continue;
      const where = `${id} seed ${s}`;
      const spec = padSpec(q, 'data'); assert.ok(spec, where);
      const G = chartGeom(parseChart(q.draw.fig.split(' ')[0], q.draw.fig.slice(q.draw.fig.indexOf(' ') + 1)));
      const draw = (k) => matchTyped(q, { text: String(k), val: textVal(String(k)) }, spec);
      const okI = q.choices.findIndex((x) => x.ok);
      assert.equal(draw(+q.choices[okI].text).i, okI, `${where}: 정답 칸을 그렸는데 정답이 아니다`); seen.ok++;
      for (const [i, ch] of q.choices.entries()) {
        if (ch.ok || !/^\d+$/.test(ch.text) || +ch.text > G.cells) continue; // 판 밖의 칸(값을 그대로 칸으로 → 30칸)은 그릴 수 없다
        assert.equal(draw(+ch.text).i, i, `${where}: ${ch.text}칸 → "${ch.tag}"`); seen.tag++;
      }
      for (let k = 0; k <= G.cells; k++) if (!q.choices.some((x) => +x.text === k)) { assert.equal(draw(k).i, -1, `${where}: ${k}칸은 짐작`); seen.guess++; }
      // 판이 그래프를 다시 그리므로 문제 글에서 빼는 그래프는 정확히 하나, 빼고 나면 그래프 지시문이 안 남는다
      assert.equal(q.q.split(`[${q.draw.fig}]`).length, 2, where);
      assert.doesNotMatch(q.q.replace(`[${q.draw.fig}]`, ''), /\[(bgraph|lgraph|band|pie) /, where);
    }
  }
  assert.ok(seen.ok > 100 && seen.tag > 50 && seen.guess > 100, JSON.stringify(seen));
  // 이름표 없는 오답(계산 실수·그린 칸이 어느 보기와도 다름)의 설명은 그 문항 이야기 — K5는 한 칸에 "알맞은 그래프"·"첫 눈금"·"점 찍기"가 같이 있어서
  // 개념의 slip("시간에 따라 변하는지, 비교하는지부터")이 점 찍기 풀이 카드에 떴다 (2026-10-01 헤드리스)
  const slip = conceptById('dat.choose').slip;
  for (let s = 1; s <= 600; s++) {
    const q = makeQuestion('dat.choose', 'calc', s * 7919, OPTS);
    if (!/[㉠㉡㉢㉣]/.test(q.q)) assert.notEqual(q.solve.whyAny, slip, `dat.choose seed ${s}: 그래프 고르기가 아닌 문항에 그래프 고르기 안내 — ${q.q.replace(/\n/g, ' ')}`);
  }
  // 화면 배선 — 문항 화면·🔁 쌍둥이 화면 둘 다 판을 쓰고, 답한 뒤 그린 그래프를 남긴다 (한 곳만 걸면 쌍둥이가 보기로 샌다)
  const src = readFileSync(new URL('../js/math.js', import.meta.url), 'utf8');
  assert.equal((src.match(/const draw = drawFor\(q, spec\);/g) || []).length, 2, 'renderQuestion·renderTwin 둘 다');
  assert.equal((src.match(/qtNode\(qTextOf\(q, draw\)\)/g) || []).length, 2);
  assert.equal((src.match(/typedBox\(q, spec, draw,/g) || []).length, 2);
  assert.equal((src.match(/if \(list\.classList\.contains\('is-pad'\)\) typedAnswered\(/g) || []).length, 2);
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  for (const f of ['./js/drawview.js', './js/mathdata.js', './coach/math/data.json']) assert.ok(sw.includes(`'${f}'`), `APP_SHELL에 ${f}`);
});

// ───────────────────── 원고 coach/math/data.json (2단계) ─────────────────────

test('원고(data.json)가 형식 검사를 통과한다 — 9칸 모두 배움 3장↑·확인 2개↑·아빠 카드 · 그림은 모두 그려진다', () => {
  assert.deepEqual(checkContent(CONTENT), []);
  for (const c of DATA) {
    const L = lessonOf(c.id, 3, { ...OPTS, content: CONTENT });
    assert.ok(L.pages.length >= 3, c.id);
    assert.ok(!/\{(me|mon)/.test(JSON.stringify(L)), `${c.id}: 이름 자리표시가 남았다`);
  }
  for (const t of strings(CONTENT)) for (const f of t.match(/\[[a-z]+ [^\]]+\]/g) || []) assert.ok(figureSvg(f.slice(1, -1)), `못 그리는 그림 ${f}`);
});

/** 확인 보기 값 — "약 "·단위(명·kg·칸…)를 떼고 수·분수·% 하나 */
const lessonVal = (t) => { const s = String(t).trim().replace(/^약 /, '').replace(/ ?(명|개|권|번|점|쪽|마리|칸|배|도|kg|cm)$/, ''); return /^\d+(\/\d+)?%?$/.test(s) ? num(s) : null; };

test('★ 원고 확인 질문도 따로 풀어 대조 — 전부 읽히고, 정답은 맞고, 오답은 정말 틀렸다 · 문장 보기는 정답 하나만 맞다', () => {
  let total = 0; const unread = [];
  for (const c of DATA) {
    const L = lessonOf(c.id, 3, { ...OPTS, content: CONTENT });
    for (const [i, p] of L.pages.entries()) {
      if (!p.check) continue;
      total++;
      const where = `${c.id}[${i}] "${p.check.q.replace(/\n/g, ' ')}"`;
      const w = solveText(p.check.q);
      if (!w) { unread.push(where); continue; }
      const all = [p.check.ok, ...p.check.no];
      if (w.v !== undefined) {
        assert.ok(close(lessonVal(p.check.ok), w.v), `${where} — 따로 푼 답 ${w.v} ≠ 원고 정답 ${p.check.ok}`);
        for (const n of p.check.no) { assert.notEqual(lessonVal(n), null, `${where} — 오답 ${n}을 못 읽는다`); assert.ok(!close(lessonVal(n), w.v), `${where} — 오답 ${n}이 사실 정답`); }
      } else {
        assert.deepEqual(all.map((t) => w.pick(t)), [true, ...p.check.no.map(() => false)], `${where} — 맞는 보기는 정답 하나뿐이어야 (${all.join(' / ')})`);
      }
      // 보기 단위 = 묻는 단위 ("몇 kg일까요"면 보기도 kg)
      const um = /몇 (명|개|권|번|점|쪽|마리|칸|도|kg|cm)/.exec(plain(p.check.q));
      if (um) for (const t of all) assert.ok(new RegExp(`(^|\\d) ?${um[1]}$`).test(t), `${where} — 보기 "${t}"의 단위가 ${um[1]}가 아니다`);
    }
  }
  assert.deepEqual(unread, [], '해석기가 못 읽은 확인 질문 — solveText에 말투를 더할 것');
  assert.ok(total >= 30, `확인 질문 ${total}개`);
});

/**
 * 배움 글이 그 장의 그래프에 대해 하는 말 → [말, 맞는가] (이 파일이 따로 읽는다)
 *   "한 칸은 2명" · "포도 막대는 8칸" · "동화 7칸" · "11일의 점은 0에서 9칸 위" · "포도 16명" · "1일→6일 +3"
 *   "가장 많이 변한 때는 … 6일과 11일 사이" · "평균은 5개" · "가을(35%)" · "과자가 40%로 가장 많아요"
 */
function chartClaims(say) {
  const p = plain(say); const ch = readChart(say); const pc = readPct(say);
  const out = [];
  if (ch) {
    const item = (L) => ch.items.find((x) => x.label === L && x.v !== null);
    const cellsOf = (it) => (it.v - ch.base) / ch.s;
    for (const m of p.matchAll(/한 칸(?:은|이) (\d+)/g)) out.push([m[0], +m[1] === ch.s]);
    for (const m of p.matchAll(/(\S+?)(?: 막대는|는)? (\d+)칸(?! 위)/g)) { const it = item(m[1]); if (it) out.push([m[0], cellsOf(it) === +m[2]]); }
    for (const m of p.matchAll(/(\S+)의 점은 [^.\n]*?(\d+)칸 위/g)) { const it = item(m[1]); if (it) out.push([m[0], cellsOf(it) === +m[2]]); }
    for (const m of p.matchAll(/(\S+) (\d+) ?(?:kg|cm|명|개|권|번|도|마리)/g)) { const it = item(m[1]); if (it) out.push([m[0], it.v === +m[2]]); }
    for (const m of p.matchAll(/(\S+)→(\S+) ([+−])(\d+)/g)) { const a = item(m[1]); const b = item(m[2]); if (a && b) out.push([m[0], b.v - a.v === (m[3] === '+' ? 1 : -1) * +m[4]]); }
    const vs = ch.items.map((x) => x.v);
    for (const m of p.matchAll(/가장 많이 (?:변한|자란) 때는 [^.\n]*?(\S+?)[과와] (\S+) 사이/g)) {
      const ad = vs.slice(1).map((v, i) => Math.abs(v - vs[i])); const i = ch.items.findIndex((x) => x.label === m[1]);
      out.push([m[0], i >= 0 && ch.items[i + 1].label === m[2] && ad[i] === Math.max(...ad) && ad.filter((x) => x === ad[i]).length === 1]);
    }
    for (const m of p.matchAll(/(\S+)부터 (\S+)까지는 (계속 올라가요|내려가요)/g)) {
      const a = ch.items.findIndex((x) => x.label === m[1]); const b = ch.items.findIndex((x) => x.label === m[2]);
      const seg = vs.slice(a, b + 1); const up = m[3] !== '내려가요';
      out.push([m[0], a >= 0 && b > a && seg.every((v, k) => !k || (up ? v > seg[k - 1] : v < seg[k - 1]))]);
    }
    for (const m of p.matchAll(/평균은 (\d+)/g)) out.push([m[0], vs.every((v) => v !== null) && vs.reduce((x, y) => x + y, 0) / vs.length === +m[1]]);
  }
  if (pc) {
    for (const m of p.matchAll(/(\S+?)\((\d+)%\)/g)) { const it = pc.items.find((x) => x.label === m[1]); if (it) out.push([m[0], it.v === +m[2]]); }
    for (const m of p.matchAll(/(\S+?)[이가] (\d+)%로 가장 많아요/g)) { const it = pc.items.find((x) => x.label === m[1]); out.push([m[0], !!it && it.v === +m[2] && it.v === Math.max(...pc.items.map((x) => x.v))]); }
    for (const m of p.matchAll(/모든 (?:칸|조각)을 더하면 ([\d +]+) = (\d+)/g)) out.push([m[0], m[1].split(' + ').map(Number).join() === pc.items.map((x) => x.v).join() && +m[2] === 100]);
  }
  return out;
}

test('★ 원고 그래프: 그린 막대·점을 재면 지시문 값 · 이름표 겹침 없음 · 배움 글이 말하는 값이 그 장의 그래프와 같다', () => {
  let figs = 0; let claims = 0;
  for (const c of DATA) {
    for (const [i, p] of CONTENT[c.id].lesson.entries()) {
      for (const t of [p.say, p.check ? p.check.q : '']) {
        for (const f of t.match(/\[(bgraph|lgraph|band|pie) [^\]]+\]/g) || []) {
          assertChartLabels(f); figs++;
          if (!/^\[(bgraph|lgraph)/.test(f)) continue;
          const ch = readChart(f); const M = measureChart(figureSvg(f.slice(1, -1)));
          for (const b of M.bars) assert.ok(close(b.v, ch.items[b.i].v), `${c.id}[${i}] ${f}: 막대 ${b.i} = ${b.v}`);
          for (const pt of M.pts) assert.ok(close(pt.v, ch.items[pt.i].v), `${c.id}[${i}] ${f}: 점 ${pt.i} = ${pt.v}`);
        }
      }
      // 한 장에 그래프가 둘이면 어느 그래프 이야기인지 못 가른다 — 배움 글은 그래프 하나만
      assert.ok((p.say.match(/\[(bgraph|lgraph|band|pie) /g) || []).length <= 1, `${c.id}[${i}]: 배움 글에 그래프가 둘`);
      for (const [said, ok] of chartClaims(p.say)) { claims++; assert.ok(ok, `${c.id} 배움 ${i + 1}: "${said}"가 그래프와 다르다`); }
    }
  }
  assert.ok(figs >= 30, `원고 그래프 ${figs}개`);
  assert.ok(claims >= 25, `배움 글의 그래프 이야기 ${claims}개`);
});

// ── 글 속 셈식 검산 — 괄호까지: "(10 + 12 + 14 + 32) ÷ 4 = 68 ÷ 4 = 17" ──
function evalExpr(src) {
  const toks = src.replace(/\s+/g, '').match(/\d+|[+−×÷()]/g) || [];
  let i = 0;
  const peek = () => toks[i];
  function atom() { const t = toks[i++]; if (t === '(') { const v = sumE(); if (toks[i++] !== ')') throw new Error('paren'); return v; } if (!/^\d+$/.test(t || '')) throw new Error('num'); return Number(t); }
  function prod() { let v = atom(); while (peek() === '×' || peek() === '÷') { const o = toks[i++]; const w = atom(); v = o === '×' ? v * w : v / w; } return v; }
  function sumE() { let v = prod(); while (peek() === '+' || peek() === '−') { const o = toks[i++]; const w = prod(); v = o === '+' ? v + w : v - w; } return v; }
  const v = sumE(); if (i !== toks.length) throw new Error('left');
  return v;
}
function badArith(text) {
  const bad = [];
  const T = '\\(?\\d+\\)?'; const E = `${T}(?: [+−×÷] ${T})*`;
  for (const m of plain(text).matchAll(new RegExp(`(?<![\\d.)])(?<![+−×÷] )${E}(?: = ${E})+`, 'g'))) {
    let parts;
    try { parts = m[0].split(' = ').map(evalExpr); } catch { continue; } // 괄호가 식 밖에서 열린 조각 — 건너뛴다
    if (parts.some((v) => Math.abs(v - parts[0]) > 1e-9)) bad.push(m[0]);
  }
  return bad;
}

test('★ 글 속 셈식이 모두 맞다 (괄호 포함) — 생성기 문제·풀이 전부', () => {
  assert.deepEqual(badArith('(10 + 12 + 14 + 32) ÷ 4 = 68 ÷ 4 = 17'), []);
  assert.deepEqual(badArith('(32 + 10) ÷ 2 = 22'), ['(32 + 10) ÷ 2 = 22']);
  assert.deepEqual(badArith('20 × 40 ÷ 100 = 8'), []);
  let checked = 0;
  for (const c of DATA) {
    for (let s = 1; s <= 400; s++) {
      for (const kind of ['calc', 'misread']) {
        const q = makeQuestion(c.id, kind, s * 2027, OPTS);
        for (const t of [q.q, ...q.choices.map((x) => x.text), ...q.solve.steps, q.solve.whyAny, ...Object.values(q.solve.why)]) { checked++; assert.deepEqual(badArith(t), [], `${c.id}/${kind} seed ${s}: ${t}`); }
      }
    }
  }
  assert.ok(checked > 10000, `${checked}건`);
});

test('★ 원고의 셈식(괄호까지)·수 뒤 조사·% 뒤 조사·단위 뒤 조사 (배움 글·확인 질문·아빠 카드 전부)', () => {
  const BAT = new Set(['0', '1', '3', '6', '7', '8']);
  const PAIR = { 이: true, 가: false, 을: true, 를: false, 은: true, 는: false, 과: true, 와: false };
  const LONG = { 이에요: true, 예요: false, 이라서: true, 라서: false, 이니까: true, 니까: false, 이고: true, 고: false, 이면: true, 면: false };
  let checked = 0; let ariths = 0;
  for (const t0 of strings(CONTENT)) {
    assert.deepEqual(badArith(t0), [], `틀린 셈식 — ${t0}`);
    ariths += (plain(t0).match(/ = /g) || []).length;
    const t = plain(t0).replace(/\[[a-z]+ [^\]]+\]/g, '');
    for (const m of t.matchAll(/(?<![/\d])(\d+)(으로|로|이|가|을|를|은|는|과|와)(?![가-힣])/g)) {
      const last = m[1].slice(-1); checked++;
      if (m[2] === '으로' || m[2] === '로') assert.equal(m[2], ['0', '3', '6'].includes(last) ? '으로' : '로', `"${m[0]}" — ${t}`);
      else assert.equal(PAIR[m[2]], BAT.has(last), `"${m[0]}" — ${t}`);
    }
    for (const m of t.matchAll(/(?<![/\d])(\d+)(이에요|예요|이라서|라서|이니까|니까|이고|고|이면|면)(?![가-힣])/g)) { checked++; assert.equal(LONG[m[2]], BAT.has(m[1].slice(-1)), `"${m[0]}" — ${t}`); }
    // % 는 "퍼센트" — 받침 없음
    assert.doesNotMatch(t, /%(이에요|이|을|은|과|으로|이라서|이니까)(?![가-힣])/, `% 뒤 조사 — ${t}`);
    // 단위 뒤 — 명·권·번·점·쪽·칸·kg은 받침, 개·마리·도·cm은 없음 · 영문 단위는 띄운다
    assert.doesNotMatch(t, /\d ?(명|권|번|점|쪽|칸)(예요|가|를|는|와|라서|니까)(?![가-힣])/, `단위 뒤 조사 — ${t}`);
    assert.doesNotMatch(t, /\d ?(개|마리|도)(이에요|이|을|은|과|이라서|이니까)(?![가-힣])/, `단위 뒤 조사 — ${t}`);
    assert.doesNotMatch(t, /kg(예요|가|를|는|라서|와)(?![가-힣])|cm(이에요|이|을|은|이라서|과)(?![가-힣])/, `영문 단위 뒤 조사 — ${t}`);
    assert.doesNotMatch(t, /\d(kg|cm)\b/, `영문 단위는 띄운다 — ${t}`);
  }
  assert.ok(checked >= 30, `조사 검사 ${checked}건`);
  assert.ok(ariths >= 30, `원고의 셈식 ${ariths}개`);
});

test('원고도 아직 안 배운 말을 앞 칸에서 쓰지 않는다 (꺾은선 K3 · 물결선 K4 · 평균 K6 · 가능성 K8 · 띠·원그래프·백분율·% K9)', () => {
  const RULES = [[/꺾은선/, 2], [/물결선/, 3], [/평균/, 5], [/가능성|불가능|확실/, 7], [/띠그래프|원그래프|백분율|%/, 8]];
  for (const c of DATA) {
    const i = IDX[c.id];
    for (const [re, from] of RULES) if (i < from) for (const t of strings(CONTENT[c.id])) assert.doesNotMatch(t.replace(/\[[a-z]+ [^\]]+\]/g, ''), re, `${c.id} 원고: ${t.slice(0, 120)}`);
  }
  // 이야기에 가족을 지어내지 않는다 (진우에게는 동생이 없다)
  assert.doesNotMatch(strings(CONTENT).join(' '), /동생|누나|언니|오빠|형이|형은|형의/);
});

test('🧩 STEMS·화면 등록 전 — 생성기 모듈은 다른 줄기와 같은 이름의 함수를 낸다', async () => {
  const mod = await import('../js/mathdata.js');
  for (const f of ['makeQuestion', 'makeRound', 'diagnosticSet', 'placeFrom', 'ladder', 'lessonOf', 'checkContent']) assert.equal(typeof mod[f], 'function', f);
  const src = readFileSync(new URL('../js/mathdata.js', import.meta.url), 'utf8');
  assert.ok(!/document\.|window\./.test(src), '순수 모듈 — 화면을 건드리지 않는다');
});
