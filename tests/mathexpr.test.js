// ✏️ D 문자와 식 줄기 생성기 테스트: node --test tests/mathexpr.test.js
//
// ★ 핵심은 **독립 검산** — 생성기가 알려 주는 값(probe)을 믿지 않고 **문제 글을 이 파일이 직접 읽어** 다시 푼다.
//   · 식은 이 파일의 계산기(evalExpr)가 읽는다 — 문자 x·y·a·b·c에 여러 수를 넣어 값이 같은지로 "같은 식"을 가린다
//   · 교과서 표기(수는 문자 앞·1 생략·같은 문자는 거듭제곱·알파벳 순·나눗셈은 분수 꼴)는 textbookForm이 글자로 따로 본다
//   · 식의 값·계수·상수항·차수는 계산기로 구하고, 성냥개비는 막대를 따로 세어 구한다
// ★ 이름표는 값만이 아니라 **뜻**까지 — 오답이 그 이름표의 틀린 생각으로 정말 나오는지 문제마다 다시 계산한다.
// ★ 씨앗은 개념마다 수백 개 (RNG_SEEDS=20000으로 넓게).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  EXPR, TAGS, makeQuestion, makeRound, ladder, placeFrom, diagnosticSet, lessonOf, checkContent, gradeLabel, valueOf,
} from '../js/mathexpr.js';
import { tplKey } from '../js/mathgen.js';
import { richParts, cutLine, figText } from '../js/mathdraw.js';
import { padSpec, readTyped, matchTyped, partsOf } from '../js/mathpad.js';

const OPTS = { names: ['피카츄', '리자몽', '개굴닌자'], me: '진우', worlds: { pokemon: [], toystory: [], minions: [], moana: [] } };
const SEEDS = Number(process.env.RNG_SEEDS) || 300;
const IDS = EXPR.map((c) => c.id);

// ───────────────────── 이 파일의 계산기 ─────────────────────

function tokens(s) {
  const out = []; const t = String(s).replace(/−/g, '-'); let i = 0;
  while (i < t.length) {
    const ch = t[i]; let m;
    if (/\s/.test(ch)) { i++; continue; }
    if ((m = /^\d+(\.\d+)?/.exec(t.slice(i)))) { out.push({ k: 'n', v: +m[0] }); i += m[0].length; continue; }
    if (/[a-z]/.test(ch)) { out.push({ k: 'v', v: ch }); i++; continue; }
    if ('+-×÷/()²³'.includes(ch)) { out.push({ k: ch }); i++; continue; }
    throw new Error(`모르는 글자 "${ch}" — ${s}`);
  }
  return out;
}
/** 식 → 값. ×·÷·/·붙여 쓴 곱셈은 같은 순위로 앞에서부터, 거듭제곱 ²이 먼저, 앞의 −는 그 뒤 전체에 */
function evalExpr(s, env = {}) {
  const T = tokens(s); let p = 0;
  const peek = () => T[p];
  const eat = (k) => { const t = T[p]; if (!t || (k && t.k !== k)) throw new Error(`식 읽기 실패: ${s}`); p++; return t; };
  const base = () => {
    const t = eat();
    if (t.k === 'n') return t.v;
    if (t.k === 'v') { if (!(t.v in env)) throw new Error(`값 없는 문자 ${t.v}: ${s}`); return env[t.v]; }
    if (t.k === '(') { const v = expr(); eat(')'); return v; }
    throw new Error(`식 읽기 실패: ${s}`);
  };
  // 세제곱 ³은 원고 배움 글(a × a × a = a³)에만 나온다
  const power = () => { let v = base(); while (peek() && (peek().k === '²' || peek().k === '³')) { v = eat().k === '²' ? v * v : v * v * v; } return v; };
  const unary = () => { if (peek() && peek().k === '-') { eat(); return -unary(); } return power(); };
  const term = () => {
    let v = unary();
    for (;;) {
      const t = peek(); if (!t) break;
      if (t.k === '×' || t.k === '÷' || t.k === '/') { eat(); const w = unary(); v = t.k === '×' ? v * w : v / w; } else if (t.k === 'n' || t.k === 'v' || t.k === '(') v *= unary();
      else break;
    }
    return v;
  };
  function expr() { let v = term(); while (peek() && (peek().k === '+' || peek().k === '-')) { const op = eat().k; const w = term(); v = op === '+' ? v + w : v - w; } return v; }
  const v = expr();
  if (p !== T.length) throw new Error(`식이 남음: ${s}`);
  return v;
}
const ENVS = [{ x: 2.7, y: -1.3, a: 3.1, b: 1.9, c: -2.2 }, { x: -4.1, y: 2.3, a: -1.7, b: 5.3, c: 0.7 }, { x: 0.6, y: 7.1, a: 2.2, b: -3.4, c: 4.4 }];
const ZERO = { x: 0, y: 0, a: 0, b: 0, c: 0 };
/** 두 식이 같은 식인가 (문자에 여러 수를 넣어 값으로) */
function same(e1, e2) {
  return ENVS.every((env) => { const v1 = evalExpr(e1, env); const v2 = evalExpr(e2, env); return Math.abs(v1 - v2) < 1e-9 * Math.max(1, Math.abs(v1)); });
}
const numOf = (t) => evalExpr(t, {});
const lastLine = (q) => q.trim().split('\n').filter(Boolean).pop();
const boldOf = (q) => (/\*\*(.+?)\*\*/.exec(q) || [])[1];

/** 괄호 밖의 + · − 로 항을 나눈다 (맨 앞 −는 그 항의 부호) */
function splitTop(s) {
  const out = []; let d = 0; let cur = '';
  const t = String(s).trim();
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (ch === '(') d++;
    if (ch === ')') d--;
    if (d === 0 && (t.slice(i, i + 3) === ' + ' || t.slice(i, i + 3) === ' − ')) { out.push(cur); cur = t[i + 1] === '−' ? '−' : ''; i += 2; continue; }
    cur += ch;
  }
  out.push(cur);
  return out.filter((x) => x !== '');
}
/** 단항식 문자 부분 "xy²" — 알파벳 순서로 한 번씩 */
const lettersOk = (lv) => { const L = lv.replace(/²/g, ''); return [...L].every((ch, i) => i === 0 || L[i - 1] < ch); };
/** 교과서 표기인가 — ×·÷ 없이, 수는 문자 앞, 계수 1은 쓰지 않음, 같은 문자는 거듭제곱, 알파벳 순, 나눗셈은 분수 꼴 */
function textbookForm(s) {
  if (/[×÷]/.test(s)) return false;
  return splitTop(s).every((raw) => {
    const t = raw.replace(/^−/, '');
    let m;
    if (/^\d+(\/\d+)?$/.test(t)) return true;
    if ((m = /^(\d*)((?:[a-z]²?)+)$/.exec(t))) return m[1] !== '1' && lettersOk(m[2]);
    if ((m = /^(\d*)((?:[a-z]²?)+)\/(\d+|[a-z]+|\(\d*[a-z]+\))$/.exec(t))) return m[1] !== '1' && lettersOk(m[2]);
    if ((m = /^(\d+)\/([a-z]+)$/.exec(t))) return lettersOk(m[2]);
    if ((m = /^(\d*)\((.+)\)$/.exec(t))) return m[1] !== '1' && textbookForm(m[2]);
    if ((m = /^\((.+)\)\/(\d+)$/.exec(t))) return textbookForm(m[1]);
    return false;
  });
}
/** 간단히 한 꼴인가 — 괄호를 다 풀었고(분수 꼴의 분자 괄호만), 같은 문자 부분의 항이 한 번씩 */
function simplified(s) {
  const fr = /^\((.+)\)\/\d+$/.exec(s);
  const body = fr ? fr[1] : s;
  if (/[()]/.test(body)) return false;
  const parts = splitTop(body).map((t) => t.replace(/^−/, '').replace(/^\d+/, ''));
  return new Set(parts).size === parts.length;
}

// ───────────────────── 문제 글 읽기 ─────────────────────

/** 문제 글만 보고 풀기 → { type, ans, f, form } — ans는 식 글자(form = 'expr') 또는 수(form = 'num'), 고르기 문항은 null */
function solveText(q) {
  const L = lastLine(q); let m;
  const E = (type, ans, f = {}, need = '') => ({ type, ans, f, form: 'expr', need });
  const N = (type, ans, f = {}) => ({ type, ans, f, form: 'num' });
  // D1 — 상황을 식으로 (기호를 그대로 쓴 식)
  if ((m = /한 개에 x원인 지우개를 (\d+)개/.exec(q))) return E('w_price', `x × ${m[1]}`, { n: +m[1] });
  if ((m = /한 봉지에 사탕이 (\d+)개씩/.exec(q))) return E('w_bags', `${m[1]} × a`, { n: +m[1] });
  if ((m = /(\d+)원을 내고 한 권에 a원인 공책을 (\d+)권/.exec(q))) return E('w_change', `${m[1]} − a × ${m[2]}`, { P: +m[1], n: +m[2] });
  if ((m = /한 시간에 (\d+) km씩 x시간/.exec(q))) return E('w_dist', `${m[1]} × x`, { v: +m[1] });
  if ((m = /y km인 길을 한 시간에 (\d+) km씩/.exec(q))) return E('w_time', `y ÷ ${m[1]}`, { v: +m[1] });
  if ((m = /a원인 옷을 (\d+) % 할인/.exec(q))) return E('w_pct', `a × ${m[1]} ÷ 100`, { p: +m[1] });
  if ((m = /가로가 x cm, 세로가 (\d+) cm/.exec(q))) return E('w_perim', `(x + ${m[1]}) × 2`, { n: +m[1] });
  if (/두 수의 평균/.test(q)) return E('w_mean', '(a + b) ÷ 2');
  // D2·D3 — 기호 생략: 값이 같고 교과서 표기
  if (/생략하여 나타내면/.test(L) || /생략하여 나타내면/.test(q)) { const e = boldOf(q); return E('omit', e, { e }, 'form'); }
  // D4 — 식의 값
  if ((m = /^(.+)일 때, 다음 식의 값은 얼마일까요\?/m.exec(q))) {
    const env = {}; for (const z of m[1].matchAll(/([a-z]) = (−?\d+)/g)) env[z[1]] = numOf(z[2]);
    const e = boldOf(q); return N('value', evalExpr(e, env), { e, env });
  }
  // D5 — 계수·상수항·차수·일차식
  if ((m = /다음 다항식에서 ([a-z])의 계수는/.exec(q))) { const e = boldOf(q); const v = m[1]; return N('coef', evalExpr(e, { ...ZERO, [v]: 1 }) - evalExpr(e, ZERO), { e, v }); }
  if (/다음 다항식의 상수항은/.test(q)) { const e = boldOf(q); return N('const', evalExpr(e, ZERO), { e }); }
  if (/다음 다항식의 차수는/.test(q)) { const e = boldOf(q); const big = Math.abs(evalExpr(e, { ...ZERO, x: 1e6 })); return N('deg', Math.round(Math.log10(big) / 6), { e }); }
  if (/다음 중 일차식은/.test(q)) return { type: 'linear', ans: null, f: {}, form: 'pick' };
  // D7 — 동류항 고르기
  if ((m = /다음 중 \*\*(\d+)x\*\*와 동류항/.exec(q))) return { type: 'like', ans: null, f: { a: +m[1] }, form: 'pick' };
  // D6~D9 — 계산: 값이 같고 간단히 한 꼴
  if (/계산하면 어느 것일까요\?/.test(q)) { const e = boldOf(q); return E('calc', e, { e }, 'simple'); }
  if ((m = /A − \((.+?)\) = (.+?)일 때/.exec(q))) return E('inv', `(${m[2]}) + (${m[1]})`, { inner: m[1], rhs: m[2] }, 'simple');
  if ((m = /가로가 \(x \+ (\d+)\) cm, 세로가 (\d+) cm/.exec(q))) return E('perim2', `2 × (x + ${m[1]} + ${m[2]})`, { a: +m[1], b: +m[2] }, 'simple');
  if ((m = /(정사각형|삼각형) 1개에는 성냥개비 (\d+)개, 하나 늘 때마다 (\d+)개씩/.exec(q))) {
    const k = +/(?:정사각형|삼각형) (\d+)개를 만들려면/.exec(q)[1];
    // 막대를 따로 센다 — 정사각형 k개: 세로 k + 1개, 가로 2k개 / 삼각형 k개(위아래로 번갈아): 비스듬한 k + 1개, 밑·윗변 k개
    const sticks = m[1] === '정사각형' ? (k + 1) + 2 * k : (k + 1) + k;
    assert.deepEqual([+m[2], +m[3]], m[1] === '정사각형' ? [4, 3] : [3, 2], `${q}: 이야기의 막대 수가 모양과 다르다`);
    return N('match', sticks, { k, first: +m[2], per: +m[3] });
  }
  throw new Error(`못 읽는 문제:\n${q}`);
}

/** 고르기 문항의 정답 판정 */
const isLinear = (t) => !/²/.test(t) && !/\/[a-z(]/.test(t) && !/[a-z][a-z]/.test(t) && /[a-z]/.test(t);
const isLikeX = (t) => /^−?\d*x$/.test(t);

// ───────────────────── 이름표의 뜻 ─────────────────────

const eqE = (t, e) => { try { return same(t, e); } catch { return false; } };
const absEnv = (env) => Object.fromEntries(Object.entries(env).map(([k, v]) => [k, Math.abs(v)]));
/** calc 꼴마다 수를 읽어 둔다 (D6~D9) */
function calcForm(e) {
  let m;
  if ((m = /^(\d+) × (\d+)x$/.exec(e))) return { f: 'mulc', a: +m[1], b: +m[2] };
  if ((m = /^(\d+)x × \(−(\d+)\)$/.exec(e))) return { f: 'mulneg', a: +m[1], b: +m[2] };
  if ((m = /^(\d+)\((\d+)x − (\d+)\)$/.exec(e))) return { f: 'dist', a: +m[1], b: +m[2], k: +m[3] };
  if ((m = /^−(\d+)\(x − (\d+)\)$/.exec(e))) return { f: 'negdist', a: +m[1], b: +m[2] };
  if ((m = /^\((\d+)x \+ (\d+)\) ÷ (\d+)$/.exec(e))) return { f: 'div', A: +m[1], B: +m[2], k: +m[3] };
  if ((m = /^(\d+)x \+ (\d+)x$/.exec(e))) return { f: 'addx', a: +m[1], b: +m[2] };
  if ((m = /^(\d+)x − x$/.exec(e))) return { f: 'minusx', a: +m[1] };
  if ((m = /^(\d+)x \+ (\d+) \+ (\d+)x$/.exec(e))) return { f: 'mix', a: +m[1], b: +m[2], k: +m[3] };
  if ((m = /^(\d+)x − (\d+) − (\d+)x \+ (\d+)$/.exec(e))) return { f: 'four', a: +m[1], b: +m[2], k: +m[3], d: +m[4] };
  if ((m = /^\((\d+)x \+ (\d+)\) \+ \((\d+)x − (\d+)\)$/.exec(e))) return { f: 'add2', a: +m[1], b: +m[2], k: +m[3], d: +m[4] };
  if ((m = /^\((\d+)x \+ (\d+)\) − \((\d+)x − (\d+)\)$/.exec(e))) return { f: 'sub2', a: +m[1], b: +m[2], k: +m[3], d: +m[4] };
  if ((m = /^(\d+)\(x \+ (\d+)\) − (\d+)\(x − (\d+)\)$/.exec(e))) return { f: 'dist2', a: +m[1], b: +m[2], k: +m[3], d: +m[4] };
  if ((m = /^−\((\d+)x − (\d+)\) \+ (\d+)x$/.exec(e))) return { f: 'negp', a: +m[1], b: +m[2], k: +m[3] };
  if ((m = /^\(x \+ (\d+)\)\/2 \+ \(x − (\d+)\)\/3$/.exec(e))) return { f: 'frac', a: +m[1], b: +m[2] };
  throw new Error(`모르는 계산 꼴: ${e}`);
}
const CALCV = {
  mulc: { [TAGS.mulAsAdd]: (g) => `${g.a + g.b}x`, [TAGS.concatNum]: (g) => `${g.a}${g.b} × x` },
  mulneg: { [TAGS.signDrop]: (g) => `${g.a * g.b}x`, [TAGS.mulAsSub]: (g) => `${g.a}x − ${g.b}` },
  dist: { [TAGS.distribFirst]: (g) => `${g.a * g.b}x − ${g.k}`, [TAGS.mulAsAdd]: (g) => `(${g.a} + ${g.b})x − (${g.a} + ${g.k})` },
  negdist: { [TAGS.signKeep]: (g) => `−${g.a}x − ${g.a * g.b}`, [TAGS.distribFirst]: (g) => `−${g.a}x − ${g.b}` },
  div: { [TAGS.divFirst]: (g) => `${g.A / g.k}x + ${g.B}`, [TAGS.divAsMul]: (g) => `(${g.A}x + ${g.B}) × ${g.k}` },
  addx: { [TAGS.mulVar]: (g) => `${g.a + g.b}x²`, [TAGS.dropVar]: (g) => `${g.a + g.b}` },
  minusx: { [TAGS.minusX]: (g) => `${g.a}`, [TAGS.dropVar]: (g) => `${g.a - 1}` },
  mix: { [TAGS.constWithX]: (g) => `${g.a + g.b + g.k}x`, [TAGS.dropConst]: (g) => `${g.a + g.k}x` },
  four: { [TAGS.minusAsPlus]: (g) => `${g.a}x + ${g.b} + ${g.k}x + ${g.d}`, [TAGS.constWithX]: (g) => `(${g.a} − ${g.k} − ${g.b} + ${g.d})x` },
  add2: { [TAGS.minusAsPlus]: (g) => `${g.a}x + ${g.b} + ${g.k}x + ${g.d}`, [TAGS.constWithX]: (g) => `(${g.a} + ${g.b} + ${g.k} − ${g.d})x` },
  sub2: { [TAGS.minusFirst]: (g) => `${g.a}x + ${g.b} − ${g.k}x − ${g.d}`, [TAGS.minusAsPlus]: (g) => `(${g.a}x + ${g.b}) + (${g.k}x − ${g.d})` },
  dist2: { [TAGS.signKeep]: (g) => `${g.a}x + ${g.a * g.b} − ${g.k}x − ${g.k * g.d}`, [TAGS.distribFirst]: (g) => `${g.a}x + ${g.b} − ${g.k}x + ${g.d}` },
  negp: { [TAGS.minusFirst]: (g) => `−${g.a}x − ${g.b} + ${g.k}x`, [TAGS.minusDrop]: (g) => `${g.a}x − ${g.b} + ${g.k}x` },
  frac: { [TAGS.numerAdd]: (g) => `(x + ${g.a} + x − ${g.b})/(2 + 3)`, [TAGS.noLCD]: (g) => `(3x + ${g.a} + 2x − ${g.b})/6` },
};
/** 이름표 뜻 — (type, tag, f, 오답 글, 정답 글) → 그 틀린 생각에서 나온 오답인가 */
function tagHolds(type, tag, f, t, ok) {
  const W = {
    w_price: { [TAGS.addForMul]: `x + ${f.n}`, [TAGS.divForMul]: `x ÷ ${f.n}` },
    w_bags: { [TAGS.addForMul]: `${f.n} + a`, [TAGS.divForMul]: `a ÷ ${f.n}` },
    w_change: { [TAGS.subSwap]: `a × ${f.n} − ${f.P}`, [TAGS.dropCount]: `${f.P} − a` },
    w_dist: { [TAGS.speedDiv]: `${f.v} ÷ x`, [TAGS.addForMul]: `${f.v} + x` },
    w_time: { [TAGS.timeMul]: `y × ${f.v}`, [TAGS.divSwap]: `${f.v} ÷ y` },
    w_pct: { [TAGS.pctWhole]: `a × ${f.p}`, [TAGS.pctFlip]: `a × 100 ÷ ${f.p}` },
    w_perim: { [TAGS.halfPerim]: `x + ${f.n}`, [TAGS.perimArea]: `x × ${f.n}`, [TAGS.noParen]: `x + ${f.n} × 2` },
    w_mean: { [TAGS.noParen]: 'a + b ÷ 2', [TAGS.mulForDiv]: '(a + b) × 2' },
  };
  if (W[type]) return !!W[type][tag] && eqE(t, W[type][tag]);
  if (type === 'omit') {
    const e = f.e; let m;
    switch (tag) {
      case TAGS.numAfter: return eqE(t, e) && /[a-z)]\d+$/.test(t);
      case TAGS.keepOrder: return eqE(t, e) && !textbookForm(t) && !/[a-z)]\d+$/.test(t);
      case TAGS.mulAsAdd: return eqE(t, e.replace(/ × /g, ' + '));
      case TAGS.powAsMul: return /²/.test(ok) && eqE(t, ok.replace(/([a-z])²/g, '(2$1)'));
      case TAGS.powOnce: return /²/.test(ok) && eqE(t, ok.replace(/²/g, ''));
      case TAGS.signDrop: return /\(−\d+\)/.test(e) && eqE(t, `−(${e})`);
      case TAGS.mulAsSub: return (m = /^(.+) × \(−(\d+)\)$/.exec(e)) && eqE(t, `${m[1]} − ${m[2]}`);
      case TAGS.parenFirst: return (m = /^\(a \+ b\) × (\d+)$/.exec(e)) && eqE(t, `${m[1]}a + b`);
      case TAGS.flip: return !/×/.test(e) && (m = /^(.+) ÷ (.+)$/.exec(e)) && eqE(t, `(${m[2]}) ÷ (${m[1]})`);
      case TAGS.divAsMul: return eqE(t, e.replace(/÷/g, '×'));
      case TAGS.mulDivOrder: return (m = /^(.+?) ÷ (.+?) × (.+)$/.exec(e)) && eqE(t, `${m[1]} ÷ (${m[2]} × ${m[3]})`);
      case TAGS.noParenDiv: return (m = /^\((.+)\) ÷ (.+)$/.exec(e)) && eqE(t, `${m[1]} ÷ ${m[2]}`);
      default: return false;
    }
  }
  if (type === 'value') {
    const { e, env } = f; const v = numOf(t);
    const at = (e2, env2 = env) => Math.abs(evalExpr(e2, env2) - v) < 1e-9;
    switch (tag) {
      case TAGS.concat: return /\d[a-z]/.test(e) && [...e.matchAll(/\d([a-z])/g)].every((z) => env[z[1]] >= 0) && at(e.replace(/(\d+)([a-z])(?!²)/g, (_, n, x) => String(Number(`${n}${env[x]}`))));
      case TAGS.mulAsAdd: return at(e.replace(/(\d+)([a-z])/g, '($1 + $2)'));
      case TAGS.noParenSub: return at(e.replace(/(\d+)([a-z])/g, (_, n, x) => `${n} ${String(env[x]).replace('-', '− ')}`), {});
      case TAGS.signDrop: case TAGS.subNeg: return Object.values(env).some((x) => x < 0) && at(e, absEnv(env));
      case TAGS.negPow: return /²/.test(e) && at(e.replace(/([a-z])²/g, '(−($1 × $1))'));
      case TAGS.powAsMul: return /²/.test(e) && at(e.replace(/([a-z])²/g, '(2 × $1)'));
      default: return false;
    }
  }
  if (type === 'coef' || type === 'const' || type === 'deg') {
    const v = numOf(t); const { e } = f;
    const coefOf = (x) => evalExpr(e, { ...ZERO, [x]: 1 }) - evalExpr(e, ZERO);
    switch (tag) {
      case TAGS.coefSign: case TAGS.constSign: { const a = type === 'const' ? evalExpr(e, ZERO) : coefOf(f.v); return a < 0 && v === -a; }
      case TAGS.otherCoef: return ['x', 'y'].filter((x) => x !== f.v && new RegExp(x).test(e)).some((x) => v === coefOf(x));
      case TAGS.oneAsZero: return coefOf(f.v) === 1 && v === 0;
      case TAGS.denomAsCoef: return /\/(\d+)/.test(e) && v === +/\/(\d+)/.exec(e)[1];
      case TAGS.denomDrop: return /\/\d+/.test(e) && v === 1;
      case TAGS.coefAsConst: return v === coefOf('x');
      case TAGS.termAsDeg: return v === splitTop(e).length;
      case TAGS.coefAsDeg: return v === +(/^(\d+)x²/.exec(e) || [])[1];
      default: return false;
    }
  }
  if (type === 'linear') return { [TAGS.squareLinear]: /²/.test(t), [TAGS.denomVar]: /\/[a-z]/.test(t), [TAGS.prodLinear]: /[a-z][a-z]/.test(t) }[tag] === true;
  if (type === 'like') return { [TAGS.powLike]: t === `${f.a}x²`, [TAGS.coefLike]: t === `${f.a}y`, [TAGS.constLike]: t === String(f.a) }[tag] === true;
  if (type === 'calc') { const g = calcForm(f.e); const fn = CALCV[g.f] && CALCV[g.f][tag]; return !!fn && eqE(t, fn(g)); }
  if (type === 'inv') return { [TAGS.invSub]: eqE(t, `(${f.rhs}) − (${f.inner})`), [TAGS.minusFirst]: eqE(t, `(${f.rhs}) + (${f.inner.replace(' − ', ' + ')})`) }[tag] === true;
  if (type === 'perim2') return { [TAGS.halfPerim]: eqE(t, `x + ${f.a} + ${f.b}`), [TAGS.distribFirst]: eqE(t, `2x + ${f.a} + ${f.b}`) }[tag] === true;
  if (type === 'match') { const v = numOf(t); return { [TAGS.allFour]: v === f.first * f.k, [TAGS.dropStart]: v === f.per * f.k }[tag] === true; }
  return false;
}

/** 정답 하나 — 수는 값이 같은 것, 식은 값이 같고 꼴(교과서 표기·간단히 한 꼴)이 맞는 것, 고르기는 그 뜻 */
function rightOnes(s, chs) {
  if (s.form === 'num') return chs.filter((x) => Math.abs(numOf(x.text) - s.ans) < 1e-9);
  if (s.type === 'linear') return chs.filter((x) => isLinear(x.text));
  if (s.type === 'like') return chs.filter((x) => isLikeX(x.text));
  return chs.filter((x) => eqE(x.text, s.ans) && (s.need === 'form' ? textbookForm(x.text) : s.need === 'simple' ? textbookForm(x.text) && simplified(x.text) : true));
}

const allText = (q) => [q.q, ...q.choices.map((x) => x.text), ...(q.solve ? [...q.solve.steps, ...Object.values(q.solve.why), q.solve.whyAny, q.solve.rule] : [])].join('\n');
function* every(kinds = ['calc', 'misread'], n = SEEDS) {
  for (const c of EXPR) for (const k of kinds) for (let s = 1; s <= n; s++) yield { c, k, s, q: makeQuestion(c.id, k, s, OPTS) };
}

// ───────────────────── 사다리 ─────────────────────

test('사다리: 9칸, 모두 중1, needs가 바로 앞 칸 · 맨 뒤는 ⭐', () => {
  assert.deepEqual(IDS, ['exp.write', 'exp.mul', 'exp.div', 'exp.value', 'exp.terms', 'exp.scale', 'exp.like', 'exp.addsub', 'exp.apply']);
  EXPR.forEach((c, i) => {
    assert.equal(c.grade, 7, c.id);
    assert.deepEqual(c.needs, i ? [IDS[i - 1]] : [], c.id);
    assert.ok(c.idea && c.rule && c.slip, c.id);
  });
  assert.equal(gradeLabel(7), '중1');
  assert.match(EXPR[8].name, /^⭐/);
});

test('계산기 자체 점검 — 붙여 쓴 곱셈·분수·거듭제곱·앞의 −·괄호', () => {
  assert.equal(evalExpr('2x + 3', { x: 4 }), 11);
  assert.equal(evalExpr('x/3', { x: 6 }), 2);
  assert.equal(evalExpr('ac/b', { a: 2, b: 4, c: 6 }), 3);
  assert.equal(evalExpr('a/(bc)', { a: 12, b: 2, c: 3 }), 2);
  assert.equal(evalExpr('−x²', { x: 3 }), -9);
  assert.equal(evalExpr('(−3)²'), 9);
  assert.equal(evalExpr('2(a + b)', { a: 1, b: 2 }), 6);
  assert.equal(evalExpr('a × 30/100', { a: 50 }), 15);
  assert.ok(textbookForm('4xy²') && textbookForm('−a/7') && textbookForm('(x + 3)/6') && textbookForm('2(a + b)') && textbookForm('5x − 3'));
  assert.ok(!textbookForm('x8') && !textbookForm('a2b') && !textbookForm('1ab') && !textbookForm('4yxy') && !textbookForm('ba') && !textbookForm('x × 3'));
  assert.ok(simplified('5x + 3') && simplified('(5x + 20)/6') && !simplified('3x + 2x') && !simplified('2(x + 1)'));
});

// ───────────────────── 문제 ─────────────────────

test('★ 독립 검산: ① 정답이 문제 글을 따로 읽어 푼 답과 같다 · 딱 하나만 맞다 · 수 답은 값, 식 답은 값과 꼴(교과서 표기·간단히 한 꼴)', () => {
  const types = new Set();
  for (const { c, s, q } of every(['calc'])) {
    const sv = solveText(q.q);
    const ok = q.choices.find((x) => x.ok);
    const right = rightOnes(sv, q.choices);
    assert.equal(right.length, 1, `${c.id} #${s} (${sv.type}): 맞는 보기 ${right.map((x) => x.text).join(', ')}\n${q.q}\n${q.choices.map((x) => x.text).join(' | ')}`);
    assert.equal(right[0], ok, `${c.id} #${s}: 정답 표시 "${ok.text}" ≠ 따로 푼 "${right[0].text}"\n${q.q}`);
    types.add(sv.type);
  }
  assert.ok(types.size >= 19, `문제 종류 ${types.size}`);
});

test('★ 보기: 정답 하나, 글자 겹침 없음, 3개 이상, 빈 글자·undefined·NaN·남은 자리표시 없음 · 그림 지시문 없음', () => {
  for (const { c, k, s, q } of every()) {
    const at = `${c.id} ${k} #${s}`;
    assert.ok(q.choices.length >= 3, `${at}: 보기 ${q.choices.length}`);
    assert.equal(q.choices.filter((x) => x.ok).length, 1, at);
    assert.equal(new Set(q.choices.map((x) => x.text)).size, q.choices.length, `${at}: 같은 글자 보기`);
    const all = allText(q);
    assert.ok(!/undefined|NaN|\{(me|mon)|null/.test(all), `${at}: ${all}`);
    assert.ok(!/\[[a-z]+ /.test(q.q), `${at}: 그림 지시문`);
  }
});

test('★ 오개념 이름표: 그 오답이 정말 그 틀린 생각이다 — 문제 글을 읽어 틀린 생각을 다시 한다 · 이름표 붙은 오답이 늘 둘 이상', () => {
  let n = 0;
  for (const { c, s, q } of every(['calc'])) {
    const sv = solveText(q.q); const ok = q.choices.find((x) => x.ok).text;
    const tagged = q.choices.filter((x) => !x.ok && x.tag !== '계산 실수');
    assert.ok(tagged.length >= 2, `${c.id} #${s}: 이름표 붙은 오답 ${tagged.length}\n${q.q}`);
    for (const w of tagged) { assert.ok(tagHolds(sv.type, w.tag, sv.f, w.text, ok), `${c.id} #${s} (${sv.type}): "${w.text}"의 이름표 "${w.tag}"가 뜻과 다르다\n${q.q}`); n++; }
  }
  assert.ok(n > 18 * SEEDS, `본 이름표 ${n}`);
});

test('★ 오답끼리 같은 값·같은 글이 되지 않는다 — 보기에서 겹쳐 빠지기 전(probe.allWrong) · 빠진 오답도 이름표의 뜻 그대로', () => {
  for (const { c, s, q } of every(['calc'])) {
    const sv = solveText(q.q); const ok = q.choices.find((x) => x.ok).text;
    const W = q.probe.allWrong;
    assert.equal(new Set(W.map((w) => w.text)).size, W.length, `${c.id} #${s}: 오답 글이 겹친다 ${W.map((w) => w.text)}`);
    for (const w of W) {
      assert.ok(w.text !== ok, `${c.id} #${s}: 오답 "${w.text}" = 정답`);
      if (sv.form === 'num') assert.ok(Math.abs(numOf(w.text) - sv.ans) > 1e-9, `${c.id} #${s}: 오답 "${w.text}"이 맞는 값`);
      if (sv.form === 'expr' && sv.type !== 'omit') assert.ok(!eqE(w.text, sv.ans), `${c.id} #${s}: 오답 "${w.text}"이 맞는 식\n${q.q}`);
      assert.ok(tagHolds(sv.type, w.tag, sv.f, w.text, ok), `${c.id} #${s}: 빠진 오답 "${w.text}"도 "${w.tag}"의 뜻`);
    }
    if (sv.form === 'num') { const vals = W.map((w) => numOf(w.text)); assert.equal(new Set(vals).size, vals.length, `${c.id} #${s}: 오답 값이 겹친다 ${vals}`); }
  }
});

/** ② 갈래마다 — 보여 준 말이 정말 틀렸고, 고치는 말이 맞는다 (이 파일이 따로 계산) */
function checkMisread(q) {
  const shown = (/\*\*(.+?)\*\*/.exec(q.q) || [])[1] || '';
  const ok = q.choices.find((x) => x.ok).text;
  let m;
  const last = (t) => t.split(/ — | = |니까 /).pop().replace(/(이에요|예요)$/, '').replace(/^A = /, '').trim();
  switch (q.key) {
    case 'misread:change': { m = /(\d+)원을 내고 한 권에 a원인 공책을 (\d+)권/.exec(q.q); const want = `${m[1]} − a × ${m[2]}`; assert.ok(!eqE(shown.replace(/^거스름돈은 |원이에요$/g, ''), want)); assert.ok(eqE(/— (.+)원이에요/.exec(ok)[1], want), ok); break; }
    case 'misread:speed': { m = /한 시간에 (\d+) km씩/.exec(q.q); const want = `${m[1]} × x`; assert.ok(!eqE(/거리는 (.+) km예요/.exec(shown)[1], want)); assert.ok(eqE(/니까 (.+) km예요/.exec(ok)[1], want), ok); break; }
    case 'misread:one': { m = /\(−1\) × ([a-z]) × ([a-z])는 (.+)예요/.exec(shown); assert.ok(!textbookForm(m[3])); const fix = /는 (.+)예요$/.exec(ok)[1]; assert.ok(textbookForm(fix) && eqE(fix, `−${m[1]}${m[2]}`), ok); break; }
    case 'misread:pow': if (q.concept === 'exp.mul') { m = /a × a × (\d+)[은는] (.+)예요/.exec(shown); assert.ok(!eqE(m[2], `a × a × ${m[1]}`)); const fix = last(ok); assert.ok(eqE(fix, `${m[1]}a²`) && textbookForm(fix), ok); } else if (q.concept === 'exp.value') { m = /x = −(\d+)일 때/.exec(q.q); const p = +m[1]; assert.notEqual(numOf(/= (−?\d+)(이에요|예요)$/.exec(shown)[1]), p * p); assert.ok(new RegExp(`= ${p * p}(이에요|예요)$`).test(ok), ok); } else { assert.ok(/동류항이 아니에요/.test(ok)); m = /(\d+)x \+ (\d+)x² = (.+)/.exec(shown); assert.ok(!eqE(m[3], `${m[1]}x + ${m[2]}x²`)); } break;
    case 'misread:flip': { m = /^x ÷ (\d+) = (.+)$/.exec(shown); assert.ok(!eqE(m[2], `x ÷ ${m[1]}`)); const fix = last(ok); assert.ok(eqE(fix, `x ÷ ${m[1]}`) && textbookForm(fix), ok); break; }
    case 'misread:order': { assert.equal(shown, 'a ÷ b × c = a/(bc)'); assert.ok(!eqE('a/(bc)', 'a ÷ b × c')); const fix = last(ok); assert.ok(eqE(fix, 'a ÷ b × c') && textbookForm(fix), ok); break; }
    case 'misread:paren': { m = /x = −(\d+)일 때, (\d+)x \+ (\d+)의 값/.exec(q.q); const want = evalExpr(`${m[2]}x + ${m[3]}`, { x: -m[1] }); const sv = numOf(/= (−?\d+)(이에요|예요)/.exec(shown)[1]); assert.notEqual(sv, want); assert.equal(numOf(/= (−?\d+)(이에요|예요)$/.exec(ok)[1]), want, ok); break; }
    case 'misread:coef': { m = /다항식 (\d+)x − (\d+)y/.exec(q.q); assert.ok(!new RegExp(`−${m[2]}`).test(shown)); assert.ok(new RegExp(`−${m[2]}(이에요|예요)$`).test(ok), ok); break; }
    case 'misread:linear': assert.match(shown, /x² \+ \d+도 일차식이에요/); assert.match(ok, /x².*일차식이 아니에요/); break;
    case 'misread:first': case 'misread:sign': case 'misread:minus': case 'misread:neg': case 'misread:frac': {
      const [lhs, rhs] = shown.split(' = '); assert.ok(!eqE(lhs, rhs), `보여 준 말이 맞다: ${shown}`);
      const fix = last(ok); assert.ok(eqE(fix, lhs) && textbookForm(fix) && simplified(fix), `고친 말 "${fix}" ≠ ${lhs}`); break;
    }
    case 'misread:const': m = /(\d+)x \+ (\d+) = (.+)/.exec(shown); assert.ok(!eqE(m[3], `${m[1]}x + ${m[2]}`)); assert.match(ok, /동류항이 아니라서/); break;
    case 'misread:inv': { m = /A − \((.+?)\) = (.+?)\n/.exec(q.q); const want = `(${m[2]}) + (${m[1]})`; assert.ok(!eqE(shown.split(' = ').pop(), want)); const fix = last(ok); assert.ok(eqE(fix, want) && simplified(fix), ok); break; }
    default: throw new Error(`모르는 ② 갈래 ${q.key}`);
  }
}

test('★ ② 오개념 문항: 보여 준 말은 정말 틀렸다 · 고치는 말만 맞다 · 갈래 열쇠 둘씩', () => {
  const keys = {};
  for (const { c, s, q } of every(['misread'], Math.max(SEEDS, 600))) {
    (keys[c.id] = keys[c.id] || new Set()).add(q.key);
    try { checkMisread(q); } catch (e) { throw new Error(`${c.id} #${s} ${q.key}: ${e.message}\n${q.q}\n${q.choices.map((x) => x.text).join(' | ')}`); }
    assert.equal(q.choices.filter((x) => x.ok).length, 1);
    assert.ok(q.choices.some((x) => x.tag === '틀린 줄 모름'), `${c.id} #${s}: "맞게 말했어요" 보기`);
  }
  for (const id of IDS) assert.equal(keys[id].size, 2, `${id}: ② 갈래 ${[...keys[id]]}`);
});

// ───────────────────── 글 ─────────────────────

test('★ 조사: 수 뒤는 읽는 소리 · 문자(x·y·a·b) 뒤는 받침 없는 쪽 · ² 뒤는 받침 쪽 · 식·항·계수 … 뒤', () => {
  const BAT = new Set(['0', '1', '3', '6', '7', '8']);
  const PAIRS = [['을', '를'], ['은', '는'], ['이', '가'], ['과', '와'], ['이에요', '예요'], ['이니까', '니까'], ['이라서', '라서']];
  const jong = (ch) => { const code = ch.charCodeAt(0) - 0xac00; return code >= 0 && code < 11172 ? code % 28 : -1; };
  let hitN = 0; let hitL = 0; let hitW = 0;
  for (const { c, k, s, q } of every()) {
    const all = allText(q).replace(/\*\*/g, '');
    for (const [wb, nb] of PAIRS) {
      for (const m of all.matchAll(new RegExp(`(\\d)(${wb}|${nb})(?=[\\s.,!?)—]|$)`, 'g'))) { assert.equal(m[2], BAT.has(m[1]) ? wb : nb, `${c.id} ${k} #${s}: "…${m[1]}${m[2]}"\n${all}`); hitN++; }
      for (const m of all.matchAll(new RegExp(`([a-z])(${wb}|${nb})(?=[\\s.,!?)—]|$)`, 'g'))) { assert.equal(m[2], nb, `${c.id} ${k} #${s}: "…${m[1]}${m[2]}"`); hitL++; }
      for (const m of all.matchAll(new RegExp(`(²)(${wb}|${nb})(?=[\\s.,!?)—]|$)`, 'g'))) { assert.equal(m[2], wb, `${c.id} ${k} #${s}: "…${m[1]}${m[2]}"`); hitL++; }
      for (const m of all.matchAll(new RegExp(`(상수항|계수|차수|다항식|일차식|동류항|분모|분자|괄호|부호|(?<![가-힣])식|(?<![가-힣])항|(?<![가-힣])값)(${wb}|${nb})(?=[\\s.,!?)—]|$)`, 'g'))) {
        assert.equal(m[2], jong(m[1].slice(-1)) > 0 ? wb : nb, `${c.id} ${k} #${s}: "…${m[1]}${m[2]}"`); hitW++;
      }
    }
    for (const m of all.matchAll(/(\d)(으로|로)(?=[\s.,]|$)/g)) assert.equal(m[2], ['1', '7', '8'].includes(m[1]) ? '로' : BAT.has(m[1]) ? '으로' : '로', `${c.id} ${k} #${s}: "…${m[1]}${m[2]}"`);
  }
  assert.ok(hitN > SEEDS && hitL > SEEDS && hitW > SEEDS, `실제로 본 곳: 수 ${hitN} · 문자 ${hitL} · 낱말 ${hitW} (검사가 빈 채 통과하지 않게)`);
});

test('★ 풀이 카드: 단계 · 기억할 것 · 오답마다 왜 · 정답이 단계에 나온다', () => {
  for (const { c, k, s, q } of every()) {
    const sv = q.solve;
    assert.ok(sv && sv.steps.length >= 1 && sv.rule, `${c.id} ${k} #${s}`);
    for (const w of q.choices.filter((x) => !x.ok)) assert.ok(sv.why[w.tag] || sv.whyAny, `${c.id} ${k} #${s}: "${w.tag}" 설명 없음`);
    const ok = q.choices.find((x) => x.ok).text;
    if (k === 'calc' && ok.length <= 16) assert.ok(sv.steps.join(' ').includes(ok), `${c.id} #${s}: 정답 "${ok}"이 풀이에 없다\n${sv.steps.join('\n')}`);
  }
});

test('★ 풀이 카드 "다음에 기억할 것"은 그 문항 가족의 말 — 백분율·괄호·둘레·거꾸로·통분·규칙 (헤드리스가 잡음: D9 둘레 문제에 "거꾸로는 더해서 · 분수 꼴은 통분해서")', () => {
  const WANT = { w_pct: /100으로 나눠/, w_perim: /괄호/, w_mean: /괄호/, perim2: /둘레/, inv: /되돌리려면 더해요/, match: /늘 때마다/ };
  const seen = new Set();
  for (const id of ['exp.write', 'exp.apply']) {
    for (let s = 1; s <= SEEDS; s++) {
      const q = makeQuestion(id, 'calc', s, OPTS); const sv = solveText(q.q);
      const want = sv.type === 'calc' ? /통분/ : WANT[sv.type];
      if (!want) continue;
      assert.match(q.solve.rule, want, `${id} #${s} (${sv.type}): 기억할 것 "${q.solve.rule}"`);
      seen.add(sv.type);
      const m = makeQuestion(id, 'misread', s, OPTS);
      if (id === 'exp.apply') assert.match(m.solve.rule, m.key === 'misread:frac' ? /통분/ : /되돌리려면 더해요/, `${id} ② #${s}: ${m.solve.rule}`);
    }
  }
  assert.equal(seen.size, 7, `본 가족 ${[...seen]}`);
});

test('★ 글 속 셈식은 맞다 (곱셈·나눗셈 먼저) — 문제·보기·풀이 전부 (수만 있는 식)', () => {
  const ev = (expr) => Function(`return (${expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-')})`)();
  let n = 0;
  for (const { c, k, s, q } of every()) {
    // ② "보여 준 말"은 틀린 말이라 빼고
    const all = (k === 'misread' ? allText(q).replace(/\*\*.+?\*\*/g, '') : allText(q));
    for (const m of all.matchAll(/(?<![\d.□a-z(−])(\d+(?:\.\d+)?(?: [+−×÷] \d+(?:\.\d+)?)+) = (\d+(?:\.\d+)?)(?![\d.a-z²/(])/g)) {
      assert.ok(Math.abs(ev(m[1]) - Number(m[2])) < 1e-6, `${c.id} ${k} #${s}: ${m[0]}`);
      n++;
    }
  }
  assert.ok(n > 2 * SEEDS, `셈식 ${n}`);
});

test('🔁 쌍둥이·🤔 노트: 요청한 틀·갈래로 온다 · 같은 셈 · 쌍둥이 글이 원래 글과 같은 일은 드물다', () => {
  const same2 = {}; const tot = {};
  const strip = (t) => tplKey(t.replace(/(피카츄|리자몽|개굴닌자|진우)(이|가|은|는|을|를|과|와|의)?/g, ''));
  for (const c of EXPR) {
    for (let s = 1; s <= Math.min(SEEDS, 300); s++) {
      const q = makeQuestion(c.id, 'calc', s, OPTS);
      assert.ok(q.key, `${c.id} #${s}: 열쇠 없음`);
      const tw = makeQuestion(c.id, 'calc', s + 99991, { ...OPTS, want: { k: 'calc', key: q.key } });
      assert.equal(tw.key, q.key, `${c.id} #${s}: 쌍둥이가 다른 틀\n${q.q}\n---\n${tw.q}`);
      assert.equal(strip(tw.q), strip(q.q), `${c.id} #${s}: 틀 글이 다르다`);
      assert.equal(solveText(tw.q).type, solveText(q.q).type, `${c.id} #${s}: 쌍둥이가 다른 셈`);
      tot[q.key] = (tot[q.key] || 0) + 1;
      if (tw.q === q.q) same2[q.key] = (same2[q.key] || 0) + 1;
      const m = makeQuestion(c.id, 'misread', s, OPTS);
      const mt = makeQuestion(c.id, 'misread', s + 99991, { ...OPTS, want: { k: 'misread', key: m.key } });
      assert.equal(mt.key, m.key, `${c.id} #${s}: ② 갈래`);
    }
  }
  for (const key of Object.keys(tot)) if (tot[key] >= 20 && /\d/.test(key)) assert.ok((same2[key] || 0) / tot[key] <= 0.35, `쌍둥이 = 원래 글 ${same2[key]}/${tot[key]}: ${key}`);
});

/** 처음 배우는 칸 — 그 앞 칸의 글·이름표에는 나오면 안 된다 */
const FIRST = [
  [/생략/, 'exp.mul'], [/대입|식의 값/, 'exp.value'],
  [/(?<![가-힣])항(?=[이을은의과에도만]|\s|$)|상수항|계수|차수|다항식|단항식|일차식/, 'exp.terms'], [/분배법칙/, 'exp.scale'], [/동류항/, 'exp.like'],
];
test('★ 아직 안 배운 말을 앞 칸에 쓰지 않는다 — 생략 D2 · 대입·식의 값 D4 · 항·계수·차수·일차식 D5 · 분배법칙 D6 · 동류항 D7', () => {
  const idx = (id) => IDS.indexOf(id);
  const banned = (id) => FIRST.filter(([, at]) => idx(at) > idx(id));
  for (const c of EXPR) {
    const own = `${c.name} ${c.idea} ${c.rule} ${c.slip}`;
    for (const [re] of banned(c.id)) assert.ok(!re.test(own), `${c.id}: 설명에 ${re}`);
  }
  for (const { c, k, s, q } of every()) {
    const all = allText(q) + ' ' + q.choices.map((x) => x.tag || '').join(' ');
    for (const [re] of banned(c.id)) assert.ok(!re.test(all), `${c.id} ${k} #${s}: 아직 안 배운 ${re}\n${all}`);
  }
});

/** 참이라고 내미는 글에 틀린 말 — 오답 보기·② 보여 준 말은 빼고, 굵게(**)는 떼고 */
const BAD = [
  [/x와 x²[은는이가]? 동류항이에요/, 'x와 x²은 동류항이 아니다'],
  [/분모에 문자가 있어도 일차식이에요/, '분모에 문자가 있으면 다항식이 아니다'],
  [/(?<!보통 )알파벳 순서로 써야/, '알파벳 순서는 "보통" — 약속'],
  [/x²[이도] 있어도 일차식이에요/, 'x²이 있으면 일차식이 아니다'],
  [/상수항[도은는] 일차식/, '수만 있는 식은 일차식이 아니다'],
  [/−\([a-z] − (\d+)\) = −[a-z] − \1(?!\d)/, '괄호 앞 −는 모든 항의 부호를 바꾼다'],
  [/(?<![\d×(] *)([a-z]) × \1 = 2\1/, '같은 문자의 곱은 거듭제곱'],
  // Codex 26차 #1·#2·#3
  [/항이 (?:여러|두) 개(?: 이상)?인 식[은을이]? ?다항식/, '단항식도 다항식 — 다항식은 항이 하나 이상인 식'],
  [/(?:더할|뺄|곱할|나눌|대입할|생략할|제곱할) 수 없/, '연산 자체를 "할 수 없다"고 하면 ②의 엉뚱한 보기("덧셈은 할 수 없어요")가 맞는 말이 된다 — "하나의 항으로 합칠 수 없다"처럼'],
  [/시간이 거리보다/, '단위가 다른 양(시간·거리)을 크기로 비교하지 않는다'],
];
test('★ 참말에 틀린 말이 없다 — 동류항·일차식·괄호 앞 −·거듭제곱', () => {
  const truths = (q) => [q.choices.find((x) => x.ok).text, ...(q.solve ? [...q.solve.steps, ...Object.values(q.solve.why), q.solve.whyAny, q.solve.rule] : [])].join('\n').replace(/\*\*/g, '');
  for (const { c, k, s, q } of every()) {
    const t = truths(q);
    for (const [re, why] of BAD) assert.ok(!re.test(t), `${c.id} ${k} #${s}: ${why}\n${t.match(new RegExp(`.*${re.source}.*`))?.[0]}`);
    if (k === 'calc') for (const [re, why] of BAD) assert.ok(!re.test(q.q.replace(/\*\*/g, '')), `${c.id} #${s}: 문제 글에 ${why}`);
  }
  for (const c of EXPR) for (const [re, why] of BAD) assert.ok(!re.test([c.idea, c.rule, c.slip].join('\n').replace(/\*\*/g, '')), `${c.id}: ${why}`);
});

test('★ ① 문제 글의 식은 교과서 표기 — "1x"·"−1x"·수 뒤 문자 없음 (틀 모양이 바뀌면 🔁 열쇠도 갈린다)', () => {
  for (const { c, s, q } of every(['calc'])) {
    const e = boldOf(q.q) || '';
    assert.ok(!/(?<![\d./])1[a-z]/.test(q.q), `${c.id} #${s}: 계수 1을 썼다\n${q.q}`);
    if (/계산하면|다음 다항식/.test(q.q)) assert.ok(!/[a-z]\d/.test(e), `${c.id} #${s}: 수가 문자 뒤\n${q.q}`);
  }
});

test('🔢 숫자판: 수가 답인 ①만 숫자판 · 음수·분수 답도 칠 수 있다 · 모든 수 보기를 쳐서 그 보기로 간다', () => {
  const pv = readFileSync(new URL('../js/padview.js', import.meta.url), 'utf8');
  const MAX = +/const MAX = (\d+);/.exec(pv)[1];
  let n = 0;
  for (const { c, s, q } of every(['calc'], 200)) {
    const ok = q.choices.find((x) => x.ok).text;
    const spec = padSpec(q, 'expr');
    assert.equal(!!spec, valueOf(ok) !== null, `${c.id} #${s}: 정답 "${ok}" 숫자판 ${!!spec}`);
    if (!spec) continue;
    assert.equal(spec.unit, (/몇 (개)/.exec(lastLine(q.q)) || [])[1] || '', `${c.id} #${s}: 단위`);
    for (const ch of q.choices) {
      assert.ok(String(ch.text).length <= MAX, `${c.id} #${s}: "${ch.text}"`);
      const t = partsOf(ch.text);
      assert.ok(t, `${c.id} #${s}: "${ch.text}"를 칸으로 못 나눔`);
      const hit = matchTyped(q, readTyped(t.mode, t.p, spec), spec);
      assert.equal(q.choices[hit.i], ch, `${c.id} #${s}: "${ch.text}"를 쳐도 그 보기로 안 간다`);
      n++;
    }
  }
  assert.ok(n > 200, `쳐 본 보기 ${n}`);
});

test('📏 진단·사다리·한 편·배움 예비·내용 검사', () => {
  const d = diagnosticSet(7, 5, OPTS);
  assert.equal(d.length, 5);
  assert.deepEqual(d.map((q) => q.concept), ['exp.write', 'exp.div', 'exp.terms', 'exp.like', 'exp.apply']);
  assert.deepEqual(placeFrom(d.map((q, i) => ({ concept: q.concept, correct: i < 2 }))), { startId: 'exp.terms', knownIds: ['exp.write', 'exp.mul', 'exp.div', 'exp.value'] });
  const L0 = ladder([]);
  assert.equal(L0[0].state, 'now');
  assert.ok(L0.slice(1).every((r) => r.state === 'locked'));
  for (const c of EXPR) {
    const round = makeRound(c.id, 11, OPTS);
    assert.ok(round.length >= 2 && round.every((q) => q.concept === c.id), c.id);
    const les = lessonOf(c.id, 3, OPTS);
    assert.ok(les.pages.length >= 1 && les.title === c.name);
  }
  assert.ok(checkContent({}).length >= 9, '빈 원고는 칸마다 걸린다');
});

// ───────────────────── 2단계: 원고 (coach/math/expr.json) ─────────────────────

const CONTENT = JSON.parse(readFileSync(new URL('../coach/math/expr.json', import.meta.url), 'utf8'));
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
/** 참이라고 내미는 글 — 덩이마다 (확인 질문은 문제 글·정답·풀이를 한 덩이로: 문제 글의 "x = 5"가 풀이의 식에 쓰인다). 오답 보기·아이가 하는 틀린 말(함정 kid)은 뺀다 */
function truthBlocks(v) {
  const out = [];
  for (const p of v.lesson) { out.push(p.say); if (p.check) out.push([p.check.q, p.check.ok, p.check.why].join('\n')); }
  out.push(v.rule, v.dad.goal, ...v.dad.say, v.dad.do, v.dad.pass, ...v.dad.traps.map((t) => t.dad));
  return out.map((t) => fillC(t).replace(/\*\*/g, ''));
}
const unitOff = (t) => String(t).replace(/개$/, '');

/** 원고 확인 질문 읽기 — 생성기 문제 꼴(solveText) + 원고에만 있는 꼴 */
function solveCheck(q) {
  let m;
  if ((m = /구슬 x개를 (\d+)명이 똑같이 나누어/.exec(q))) return { type: 'w_share', ans: `x ÷ ${m[1]}`, f: { n: +m[1] }, form: 'expr', need: '' };
  return solveText(q);
}
/** 이름표 뜻 — 원고에만 있는 꼴 + 생성기 꼴(tagHolds) */
function tagHoldsC(type, tag, f, t, ok) {
  if (type === 'w_share') { const w = { [TAGS.divSwap]: `${f.n} ÷ x`, [TAGS.mulForDiv]: `x × ${f.n}` }[tag]; return !!w && eqE(t, w); }
  try { return !!tagHolds(type, tag, f, t, ok); } catch { return false; }
}

test('원고(expr.json)가 형식 검사를 통과한다 — 9칸이 사다리 순서대로 · 배움 4~5장·확인 질문 4개↑·아빠 카드(말 2개↑·함정 2개↑·통과 기준)', () => {
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

test('★ 원고 확인 질문도 따로 풀어 대조 — 전부 읽히고, 맞는 보기는 정답 하나뿐(식은 값과 꼴까지), 오답 하나하나가 이름표 있는 틀린 생각이다 · "몇 개 필요할까요" 보기는 "수개"', () => {
  let solved = 0; let wrongs = 0; const types = new Set(); const forms = new Set();
  for (const id of IDS) {
    for (const [i, p] of CONTENT[id].lesson.entries()) {
      if (!p.check) continue;
      const q = fillC(p.check.q); const ok = fillC(p.check.ok); const no = p.check.no.map(fillC);
      const where = `${id}[${i}]: ${q}`;
      const sv = solveCheck(q);
      const chs = [{ text: unitOff(ok), ok: true }, ...no.map((n) => ({ text: unitOff(n), ok: false }))];
      const right = rightOnes(sv, chs);
      assert.equal(right.length, 1, `${where} (${sv.type}): 맞는 보기 ${right.map((x) => x.text).join(', ') || '없음'}`);
      assert.ok(right[0].ok, `${where}: 정답 "${ok}" ≠ 따로 푼 "${right[0].text}"`);
      // 오답이 어느 틀린 생각인지 — 그 문제 꼴의 이름표 하나의 뜻에 맞아야 한다 (아무 식이나 쓰지 않았다)
      for (const n of no) {
        assert.ok(Object.values(TAGS).some((tag) => tagHoldsC(sv.type, tag, sv.f, unitOff(n), unitOff(ok))), `${where}: 오답 "${n}"은 어느 틀린 생각인가 (${sv.type})`);
        wrongs++;
      }
      const unit = /몇 개 필요할까요\?$/.test(lastLine(q));
      for (const t of [ok, ...no]) assert.ok(unit ? /^\d+개$/.test(t) : !/개$/.test(t), `${where}: 보기 "${t}"`);
      types.add(sv.type);
      if (sv.type === 'calc') forms.add(calcForm(sv.f.e).f);
      solved++;
    }
  }
  assert.equal(solved, IDS.reduce((a, id) => a + CONTENT[id].lesson.filter((p) => p.check).length, 0));
  assert.ok(solved >= 40 && wrongs >= 2 * solved, `따로 푼 확인 질문 ${solved} · 오답 ${wrongs}`);
  assert.ok(types.size >= 15 && forms.size >= 12, `확인 질문이 다룬 문제 종류 ${types.size} · 계산 꼴 ${forms.size} — 같은 모양만 묻지 않게`);
});

// 배움 글 속 식 — 글자 한 덩이(띄어 쓴 연산 기호로 이어짐). A는 "어떤 식 A"
const TOK = '[0-9a-zA²³()/−]+';
const RUN = `${TOK}(?: [+−×÷] ${TOK})*`;
/** "(b × a = ab)"처럼 글 속 괄호에 든 식 — 짝이 안 맞는 바깥 괄호를 뗀다 */
function trimParen(s) {
  const cnt = (x, ch) => x.split(ch).length - 1;
  let t = s;
  while (t.startsWith('(') && cnt(t, '(') > cnt(t, ')')) t = t.slice(1);
  while (t.endsWith(')') && cnt(t, ')') > cnt(t, '(')) t = t.slice(0, -1);
  return t;
}
/**
 * 글 한 덩이의 "식 = 식 = …" — 이웃한 두 식이 같은 식인가 (문자에 수 세 벌을 넣어 값으로).
 * "x = 4"처럼 문자 하나 = 수는 대입이라 그 뒤 식에 넣어 보고, "A = …"는 어떤 식 A로 기억해 A가 나오는 식에 넣는다
 */
function chainClaims(block) {
  const t = block.replace(/ (cm|km)(?![a-z])/g, '');
  const chains = [...t.matchAll(new RegExp(`${RUN}(?: = ${RUN})+`, 'g'))].map((m) => {
    const segs = m[0].split(' = ');
    segs[0] = trimParen(segs[0]); segs[segs.length - 1] = trimParen(segs[segs.length - 1]);
    return segs;
  });
  const defA = chains.find((s) => s[0] === 'A');
  const subA = (s) => (defA ? s.replace(/A/g, `(${defA[defA.length - 1]})`) : s);
  const env = {}; const out = [];
  for (const segs of chains) {
    if (segs.length === 2 && /^[a-z]$/.test(segs[0]) && /^−?\d+$/.test(segs[1])) { env[segs[0]] = numOf(segs[1]); continue; }
    let ok;
    try {
      ok = ENVS.every((E) => {
        const vals = segs.map((s) => evalExpr(subA(s), { ...E, ...env }));
        return vals.every((v, k) => k === 0 || Math.abs(v - vals[k - 1]) < 1e-9 * Math.max(1, Math.abs(v)));
      });
    } catch (e) { ok = false; segs.push(`(${e.message})`); }
    out.push([ok, segs.join(' = ')]);
  }
  return out;
}
const degOf = (e) => Math.round(Math.log10(Math.abs(evalExpr(e, { x: 1e6, y: 1e6, a: 1e6, b: 1e6, c: 1e6 }))) / 6);
const likeKey = (t) => t.replace(/^−/, '').replace(/^\d+/, '');
/** 글이 말하는 계수·상수항·차수·일차식·동류항 — 이 파일의 계산기로 다시 */
function textClaims(t) {
  const out = [];
  const each = (re, fn) => { for (const m of t.matchAll(re)) out.push([fn(m), m[0]]); };
  const near = (a, b) => Math.abs(a - b) < 1e-9;
  const coefOf = (e, v) => evalExpr(e, { ...ZERO, [v]: 1 }) - evalExpr(e, ZERO);
  for (const m of t.matchAll(new RegExp(`(${RUN})에서 ([^.\\n]*)`, 'g'))) {
    for (const z of m[2].matchAll(/([a-z])의 계수는 (−?\d+(?:\/\d+)?)/g)) out.push([near(coefOf(m[1], z[1]), numOf(z[2])), `${m[1]}에서 ${z[0]}`]);
  }
  each(new RegExp(`(${RUN})의 상수항은 (−?\\d+)`, 'g'), (m) => near(evalExpr(m[1], ZERO), numOf(m[2])));
  each(new RegExp(`(${RUN})의 차수는 (\\d+)`, 'g'), (m) => degOf(m[1]) === +m[2]);
  each(new RegExp(`((?:${RUN})(?:(?:, |[과와] )(?:${RUN}))*)(?:은|는|도) (?:모두 )?일차식이( 아니에요|에요)`, 'g'), (m) => m[1].split(/, |[과와] /).every((e) => isLinear(e) === (m[2] === '에요')));
  each(new RegExp(`(${RUN})[와과] (${RUN})[은는] (?:[가-힣]+ )*?동류항이( 아니에요|에요)`, 'g'), (m) => (likeKey(m[1]) === likeKey(m[2])) === (m[3] === '에요'));
  return out;
}

test('★ 원고의 식: 배움 글·확인 풀이·아빠 카드의 "식 = 식"은 모두 같은 식 (대입은 그 수로) · 글이 말하는 계수·상수항·차수·일차식·동류항 = 계산기', () => {
  let chains = 0; let claims = 0;
  for (const id of IDS) {
    for (const block of truthBlocks(CONTENT[id])) {
      for (const [ok, what] of chainClaims(block)) { assert.ok(ok, `${id}: "${what}"이 같은 식이 아니다\n${block}`); chains++; }
      for (const [ok, what] of textClaims(block)) { assert.ok(ok, `${id}: "${what}"이 계산기와 다르다\n${block}`); claims++; }
    }
  }
  assert.ok(chains >= 80, `대조한 "식 = 식" ${chains} (검사가 빈 채 통과하지 않게)`);
  assert.ok(claims >= 12, `대조한 계수·차수·일차식·동류항 말 ${claims}`);
});

test('★ 원고의 조사·셈식·아직 안 배운 말·틀린 말 (배움 글·확인 질문·아빠 카드 전부) · 분수 바로 뒤에는 조사가 없다(x/3은 "3분의 x" — 끝소리가 분자)', () => {
  const BAT = new Set(['0', '1', '3', '6', '7', '8']);
  const PAIRS = [['을', '를'], ['은', '는'], ['이', '가'], ['과', '와'], ['이에요', '예요'], ['이니까', '니까'], ['이라서', '라서']];
  const jong = (ch) => { const code = ch.charCodeAt(0) - 0xac00; return code >= 0 && code < 11172 ? code % 28 : -1; };
  const ev = (expr) => Function(`return (${expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-')})`)();
  let exprs = 0; let hitN = 0; let hitL = 0; let hitW = 0;
  for (const id of IDS) {
    const all = contentText(CONTENT[id]).replace(/\*\*/g, '');
    for (const [wb, nb] of PAIRS) {
      // 템플릿 글자 안이라 \\d · \\s (N 2단계에서 \d 한 번만 써서 검사가 빈 채 통과한 적 있다)
      for (const m of all.matchAll(new RegExp(`(\\d)(${wb}|${nb})(?=[\\s.,!?)—]|$)`, 'g'))) { assert.equal(m[2], BAT.has(m[1]) ? wb : nb, `${id}: "…${m[1]}${m[2]}"`); hitN++; }
      for (const m of all.matchAll(new RegExp(`([a-z])(${wb}|${nb})(?=[\\s.,!?)—]|$)`, 'g'))) { assert.equal(m[2], nb, `${id}: "…${m[1]}${m[2]}"`); hitL++; }
      for (const m of all.matchAll(new RegExp(`(²)(${wb}|${nb})(?=[\\s.,!?)—]|$)`, 'g'))) { assert.equal(m[2], wb, `${id}: "…${m[1]}${m[2]}"`); hitL++; }
      for (const m of all.matchAll(new RegExp(`(상수항|계수|차수|다항식|일차식|동류항|분모|분자|괄호|부호|(?<![가-힣])식|(?<![가-힣])항|(?<![가-힣])값)(${wb}|${nb})(?=[\\s.,!?)—]|$)`, 'g'))) {
        assert.equal(m[2], jong(m[1].slice(-1)) > 0 ? wb : nb, `${id}: "…${m[1]}${m[2]}"`); hitW++;
      }
    }
    for (const m of all.matchAll(/(\d)(으로|로)(?=[\s.,]|$)/g)) assert.equal(m[2], ['1', '7', '8'].includes(m[1]) ? '로' : BAT.has(m[1]) ? '으로' : '로', `${id}: "…${m[1]}${m[2]}"`);
    assert.ok(!/(cm|km)(은|을|이 |과|이에요|으로)/.test(all), `${id}: 단위 뒤 조사`);
    const fp = /\/(?:\d+|[a-z]+|\([^()]*\))(?:이|가|은|는|을|를|와|과|도|로|으로|의|에|예요|라서|니까)/.exec(all);
    assert.ok(!fp, `${id}: 분수 바로 뒤 조사 "${fp && fp[0]}"\n${fp && all.slice(Math.max(0, fp.index - 30), fp.index + 20)}`);
    for (const m of all.matchAll(/(?<![\d.□a-z(−])(\d+(?:\.\d+)?(?: [+−×÷] \d+(?:\.\d+)?)+) = (\d+(?:\.\d+)?)(?![\d.a-z²/(])/g)) { assert.ok(Math.abs(ev(m[1]) - Number(m[2])) < 1e-6, `${id}: ${m[0]}`); exprs++; }
    const at = IDS.indexOf(id);
    for (const [re, first] of FIRST) if (IDS.indexOf(first) > at) assert.ok(!re.test(all), `${id}: 아직 안 배운 ${re}\n${all.match(new RegExp(`.*(${re.source}).*`))?.[0]}`);
    const truths = truthBlocks(CONTENT[id]).join('\n');
    for (const [re, why] of BAD) assert.ok(!re.test(truths), `${id}: ${why}\n${truths.match(new RegExp(`.*${re.source}.*`))?.[0]}`);
  }
  assert.ok(exprs >= 12, `원고 속 셈식 ${exprs}`);
  assert.ok(hitN >= 40 && hitL >= 40 && hitW >= 30, `조사를 실제로 본 곳: 수 ${hitN} · 문자 ${hitL} · 낱말 ${hitW} (검사가 빈 채 통과하지 않게)`);
});

// ───────────────────── 3단계: 화면 연결 ─────────────────────

test('화면 연결 (3단계): STEMS.expr(D)는 이 생성기·원고를 쓰고 C 소수와 E 음수 사이 · 앱 셸이 둘 다 들고 간다 · 사다리 안내에 E·H 줄기 · 숫자판은 ± 늘 켬', async () => {
  const { STEMS, STEM_ORDER, stemOf } = await import('../js/mathprog.js');
  assert.equal(STEMS.expr.code, 'D');
  assert.deepEqual(STEM_ORDER.slice(STEM_ORDER.indexOf('decimal'), STEM_ORDER.indexOf('decimal') + 3), ['decimal', 'expr', 'negative'], 'C 소수와 E 음수 사이 (비워 둔 D 자리)');
  assert.equal(STEMS.expr.list, EXPR);
  assert.equal(STEMS.expr.gen.makeQuestion, makeQuestion);
  assert.equal(STEMS.expr.gen.lessonOf, lessonOf, '📚 배움은 이 생성기의 lessonOf');
  assert.equal(STEMS.expr.range, '중1');
  assert.ok(IDS.every((id) => stemOf(id) === STEMS.expr), '모든 칸이 D 줄기로 찾아진다');
  assert.match(STEMS.expr.pick, /E 음수 줄기.*H 규칙과 대응/);
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  for (const f of ['./js/mathexpr.js', './coach/math/expr.json']) assert.ok(sw.includes(`'${f}'`), `APP_SHELL에 ${f}`);
  // 화면은 개념의 줄기 키로 숫자판을 연다 — 그 키가 'expr'이면 답이 양수인 문항도 ± 키가 있다 (음수 답이 많아 칸을 바꿔 가며 헷갈리지 않게)
  const app = readFileSync(new URL('../js/math.js', import.meta.url), 'utf8');
  assert.match(app, /padSpec\(q, \(stemOf\(q\.concept\) \|\| S\(\)\)\.key\)/);
  let n = 0;
  for (const c of EXPR) for (let s = 1; s <= 60; s++) {
    const q = makeQuestion(c.id, 'calc', s, OPTS);
    const spec = padSpec(q, stemOf(q.concept).key);
    if (!spec) continue;
    assert.equal(spec.signed, true, `${c.id} #${s}: ± 키 없음`);
    n++;
  }
  assert.ok(n > 100, `숫자판 문항 ${n}`);
});

/** 예전 richNode가 나누던 수 분수·대분수 (2026-10-03 전) */
const OLD_FRAC = /(?<![\d/])\d+ \d+\/\d+(?![\d/])|(?<![\d/])\d+\/\d+(?![\d/])/g;
const fracsOf = (seg) => richParts(seg).filter((p) => p.k === 'f' || p.k === 'm').map((p) => (p.k === 'm' ? `${p.w} ${p.n}/${p.d}` : `${p.n.map((x) => x.s).join('')}/${p.d.map((x) => x.s).join('')}`));
/** richNode처럼 **굵게**를 먼저 나눈 조각 (그림 지시문은 qtNode가 먼저 그림으로 바꾼다) */
const segsOf = (t) => String(t).replace(/\[[a-z]+ [^\]]*\]/g, ' ').split(/\*\*/);
function* stringsIn(v) { if (typeof v === 'string') yield v; else if (v && typeof v === 'object') for (const x of Object.values(v)) yield* stringsIn(x); }
const qTexts = (q) => [q.q, q.expr || '', ...q.choices.map((x) => x.text), ...(q.solve ? [...q.solve.steps, ...Object.values(q.solve.why || {}), q.solve.whyAny || '', q.solve.rule || ''] : [])];

test('🖋 글 속 식 (richParts): 문자 분수는 세로로·바깥 괄호 떼고 · 문자 a·b·c·x·y만 기울임(cm·km는 그대로) · km/h처럼 단위 사이 /는 분수 아님', () => {
  const show = (t) => richParts(t).map((p) => (p.k === 'v' ? `<${p.s}>` : p.k === 'f' ? `[${p.n.map((x) => (x.k === 'v' ? `<${x.s}>` : x.s)).join('')}|${p.d.map((x) => (x.k === 'v' ? `<${x.s}>` : x.s)).join('')}]` : p.k === 'm' ? `{${p.w} ${p.n}|${p.d}}` : p.s)).join('');
  assert.equal(show('x/3'), '[<x>|3]');
  assert.equal(show('(x + 2)/3 + 1'), '[<x> + 2|3] + 1');
  assert.equal(show('a ÷ b × c = ac/b'), '<a> ÷ <b> × <c> = [<ac>|<b>]');
  assert.equal(show('a/(bc)'), '[<a>|<bc>]');
  assert.equal(show('a ÷ (−2) = −a/2'), '<a> ÷ (−2) = −[<a>|2]');
  assert.equal(show('1/3a로'), '[1|3]<a>로');
  assert.equal(show('(3(x + 1) + 2(x − 1))/6'), '[3(<x> + 1) + 2(<x> − 1)|6]');
  assert.equal(show('7/(a − 4)'), '[7|<a> − 4]');
  assert.equal(show('a × 30/100'), '<a> × [30|100]');
  assert.equal(show('2 3/8 + 5/6'), '{2 3|8} + [5|6]');
  assert.equal(show('5 cm, 3 km/h, 2 kg'), '5 cm, 3 km/h, 2 kg');
  assert.equal(show('x²이 4x²'), '<x>²이 4<x>²');
  assert.equal(show('1/2/3 · (가로)/2'), '1/2/3 · (가로)/2', '이어진 /와 글자 괄호는 분수가 아니다');
  assert.equal(show('45 × 5/(4 + 5) = 25'), '45 × 5/(4 + 5) = 25', '괄호 속이 수뿐이면 예전처럼 한 줄 (F 비례배분 풀이)');
});

test('🖋 다른 줄기는 예전과 똑같이 그린다 — 모든 원고 글·생성 문항에서 수 분수·대분수가 예전 richNode와 같다 · 문자 분수는 D·Q·R 줄기에만 (Q 일차방정식도 x/2 · x/3을, R 좌표평면도 y = x/2 · y = 6/x를 쓴다)', async () => {
  const { STEMS, STEM_ORDER } = await import('../js/mathprog.js');
  const { readdirSync } = await import('node:fs');
  let segs = 0; let fr = 0;
  const same = (t, where) => {
    for (const seg of segsOf(t)) {
      const old = seg.match(OLD_FRAC) || [];
      assert.deepEqual(fracsOf(seg), old, `${where}: 분수가 예전과 다르다\n${seg}`);
      segs++; fr += old.length;
    }
  };
  const dir = new URL('../coach/math/', import.meta.url);
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json') && !['expr.json', 'equation.json', 'coord.json'].includes(x))) {
    for (const s of stringsIn(JSON.parse(readFileSync(new URL(f, dir), 'utf8')))) same(s, f);
  }
  for (const key of STEM_ORDER.filter((k) => !['expr', 'equation', 'coord'].includes(k))) {
    const S = STEMS[key];
    for (const c of S.list) {
      same(`${c.idea || ''}\n${c.rule || ''}`, c.id);
      for (const kind of ['calc', 'misread']) for (let s = 1; s <= 25; s++) {
        let q = null;
        try { q = S.gen.makeQuestion(c.id, kind, s, OPTS); } catch { q = null; }
        if (q && q.choices) for (const t of qTexts(q)) same(t, `${c.id} ${kind} #${s}`);
      }
    }
  }
  assert.ok(segs > 20000 && fr > 2000, `대조한 글 조각 ${segs} · 분수 ${fr}`);
});

test('🖋 D 줄기의 /는 모두 세로 분수가 된다 — 원고 글·생성 문항(문제·보기·풀이)에 글자로 남는 /가 없다', () => {
  let n = 0;
  const all = (t, where) => {
    for (const seg of segsOf(fillC(t))) {
      const parts = richParts(seg);
      const left = parts.filter((p) => p.k === 't' && p.s.includes('/'));
      assert.equal(left.length, 0, `${where}: 분수가 안 된 / — ${left.map((p) => p.s).join(' | ')}\n${seg}`);
      n += parts.filter((p) => p.k === 'f').length;
    }
  };
  for (const s of stringsIn(Object.fromEntries(Object.entries(CONTENT).filter(([k]) => k !== '_')))) all(s, '원고');
  for (const c of EXPR) {
    all(`${c.idea}\n${c.rule}\n${c.slip}`, c.id);
    for (const kind of ['calc', 'misread']) for (let s = 1; s <= 200; s++) for (const t of qTexts(makeQuestion(c.id, kind, s, OPTS))) all(t, `${c.id} ${kind} #${s}`);
  }
  assert.ok(n > 1000, `세로로 그린 분수 ${n}`);
});

test('🖋 앱(richNode)·D 검수 페이지(tools/mathexpr.mjs)가 같은 richParts로 그린다', () => {
  const app = readFileSync(new URL('../js/math.js', import.meta.url), 'utf8');
  const tool = readFileSync(new URL('../tools/mathexpr.mjs', import.meta.url), 'utf8');
  assert.match(app, /function richNode[\s\S]{0,600}richParts\(p\)/, 'richNode가 richParts로 나눈다');
  assert.match(app, /\.mv|'mv'/, '문자는 mv 칸(기울임)');
  assert.match(tool, /import \{[^}]*richParts[^}]*\} from '\.\.\/js\/mathdraw\.js'/, '검수 페이지도 richParts');
  const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
  assert.match(css, /\.mv \{[^}]*font-style: italic/);
});

// ───────────────────── Codex 26차 ─────────────────────

const FRAC_JOSA = /\/(?:\d+|[a-z]+|\([^()]*\))(?:이에요|예요|이라서|라서|이니까|니까|이|가|은|는|을|를|와|과|도|으로|로|의|에)/;

test('★ 생성 문항에도 분수 바로 뒤 조사가 없다 — 문제·보기·풀이·설명 (Codex 26차 #4: "6/x예요"는 "엑스분의 육"이라 이에요가 맞다)', () => {
  for (const c of EXPR) for (const t of [c.idea, c.rule, c.slip]) assert.ok(!FRAC_JOSA.test(t), `${c.id}: ${t}`);
  let n = 0;
  for (const { c, k, s, q } of every()) {
    for (const t of qTexts(q)) {
      const m = FRAC_JOSA.exec(t);
      assert.ok(!m, `${c.id} ${k} #${s}: "…${m && t.slice(Math.max(0, m.index - 20), m.index + m[0].length)}"`);
      n += richParts(t).filter((p) => p.k === 'f').length;
    }
  }
  assert.ok(n > 3 * SEEDS, `본 분수 ${n}`);
});

/** 보기 글에서 식 하나 — " — "·" = "·"은/는 " 으로 나눈 조각 중 이 파일의 계산기가 읽는 것 (보기는 앞에서부터, 고친 말은 끝에서부터) */
function exprIn(t, fromEnd) {
  const parts = String(t).replace(/^A = /, '').split(/ — | = |[은는] |니까 /).map((x) => x.replace(/(이에요|예요)$/, '').replace(/ ?(km|cm|원)$/, '').replace(/^A = /, '').trim()).filter(Boolean);
  for (const x of fromEnd ? parts.reverse() : parts) { try { evalExpr(x, ENVS[0]); return x; } catch { /* 다음 조각 */ } }
  return null;
}

test('★ ② 나머지 보기도 그 예에서 정말 틀린 말 — 오개념 보기의 식·값은 바른 답과 다르고, 엉뚱한 지적은 거짓 단정("…수 없어요")이며 배움 글·설명에 그 말이 없다 (Codex 26차 #2·F)', () => {
  const truths = [...IDS.flatMap((id) => truthBlocks(CONTENT[id])), ...EXPR.flatMap((c) => [c.idea, c.rule, c.slip])].join('\n').replace(/\*\*/g, '');
  let parsed = 0; let off = 0;
  for (const { c, s, q } of every(['misread'], Math.max(SEEDS, 600))) {
    const shown = (/\*\*(.+?)\*\*/.exec(q.q) || [])[1] || '';
    const ok = q.choices.find((x) => x.ok).text;
    const ref = exprIn(ok, true) || exprIn(shown.split(' = ')[0], true);
    for (const w of q.choices.filter((x) => !x.ok && x.tag !== '틀린 줄 모름')) {
      const at = `${c.id} #${s} ${q.key}: "${w.text}"`;
      if (w.tag === '엉뚱한 지적') {
        assert.match(w.text, /(수 없어요|아니에요|없어요)$/, `${at} — 엉뚱한 지적은 거짓 단정으로`);
        assert.ok(!truths.includes(w.text.replace(/(어요|에요)$/, '')), `${at} — 배움 글·설명이 같은 말을 한다`);
        off++; continue;
      }
      const e = exprIn(w.text, / = /.test(w.text)); // "6x + 1 = 7이에요"처럼 등식이면 끝 값이 그 보기의 말
      if (!e || !ref) continue;
      assert.ok(!eqE(e, ref), `${at} — 오개념 보기의 ${e}가 바른 답 ${ref}과 같다`);
      parsed++;
    }
  }
  assert.ok(parsed > 3000 && off > 5000, `대조한 오개념 보기 ${parsed} · 엉뚱한 지적 ${off}`);
});

test('🖋 한 줄 요약(🤔 오답 노트 60자·❓ 버튼 26자)은 괄호·분수 중간에서 자르지 않는다 · 펼친 오답 노트는 문제 글 전체 (Codex 26차 #5)', () => {
  const app = readFileSync(new URL('../js/math.js', import.meta.url), 'utf8');
  assert.ok(app.includes("const oneLine = (t) => figText(t, true).replace(/\\*\\*/g, '').replace(/\\s*\\n+\\s*/g, ' · ');"), 'math.js의 oneLine이 이 테스트와 같은 꼴');
  assert.match(app, /richNode\(cutLine\(q1, 60\)\)/);
  assert.match(app, /cutLine\(q1, 26\)/);
  assert.match(app, /qtNode\(w\.q\.q\)/, '펼친 오답 노트에 문제 글 전체');
  const oneLine = (t) => figText(t, true).replace(/\*\*/g, '').replace(/\s*\n+\s*/g, ' · ');
  const repro = cutLine(oneLine(makeQuestion('exp.div', 'misread', 1, OPTS).q), 60);
  assert.ok(!/\/\(?[a-z]*…$/.test(repro), `Codex 재현 씨앗: ${repro}`);
  let n = 0;
  for (const { c, k, s, q } of every()) {
    const line = oneLine(q.q);
    for (const w of [60, 26]) {
      const cut = cutLine(line, w);
      const bal = (cut.match(/\(/g) || []).length - (cut.match(/\)/g) || []).length;
      assert.ok(cut.length <= w + 1 && (line.length <= w || cut.length > w / 2), `${c.id} ${k} #${s}: 길이 ${cut.length}`);
      assert.equal(bal, 0, `${c.id} ${k} #${s}: 괄호가 열린 채 잘림 "${cut}"`);
      assert.ok(!richParts(cut).some((p) => p.k === 't' && p.s.includes('/')), `${c.id} ${k} #${s}: 분수가 잘림 "${cut}"`);
      if (line.length > w) n++;
    }
  }
  assert.ok(n > SEEDS, `잘린 요약 ${n}`);
  assert.equal(cutLine('짧은 글', 60), '짧은 글');
});

test('📘 다항식 — 단항식도 다항식이다 (배움 글·설명), 7a는 단항식이면서 일차식 (Codex 26차 #1)', () => {
  const d5 = truthBlocks(CONTENT['exp.terms']).join('\n');
  assert.match(d5, /항이 하나 이상인 식을 다항식/);
  assert.match(d5, /단항식도 다항식/);
  assert.match(d5, /7a처럼 항이 하나뿐인 단항식도 차수가 1이면 일차식/);
  assert.match(EXPR.find((c) => c.id === 'exp.terms').idea.replace(/\*\*/g, ''), /항이 하나 이상인 식을 다항식[^.]*단항식도 다항식/);
});
