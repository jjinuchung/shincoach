// 🔢 Y 큰 수 줄기 — 생성기 테스트.
// ★ 정답·오답은 이 파일이 **문제 글을 따로 읽어** 다시 푼다 — 한글로 읽은 수("칠백육십사조 천이백삼십구억")도 이 파일의 풀이기로 수로 바꾼다
//   (생성기의 readKo·mixed를 쓰지 않는다). 이름표 판정은 생성기 이름표를 보지 않고 **그 틀린 생각이 실제로 한 일**로 다시 계산한다.
// 함정(stem-generator-pitfalls)을 처음부터: 쌍둥이 틀 · 오답끼리 같은 값 · 한 값이 두 틀린 생각에서 나오는 일(Codex 39차 #3) ·
//   아직 안 배운 단위(십만·억·조)를 앞 칸 글에 · 숫자판(8자리까지) · 참말 금지 · 글 속 셈식 · 그림 = 지시문 = 문제 글의 수

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BIG, TAGS, makeQuestion, makeRound, ladder, placeFrom, diagnosticSet, lessonOf, checkContent, gradeLabel, readKo, mixed } from '../js/mathbig.js';
import { tplKey } from '../js/mathgen.js';
import { figureSvg, renderFigures, figText } from '../js/mathdraw.js';
import { padSpec, readTyped, matchTyped, partsOf } from '../js/mathpad.js';

const OPTS = { names: ['피카츄', '리자몽', '개굴닌자'], me: '진우', worlds: { pokemon: [], toystory: [], minions: [], moana: [] } };
const SEEDS = Number(process.env.RNG_SEEDS) || 300;
const IDS = BIG.map((c) => c.id);
const LIMIT = 9e15;

// ───────────────────── 이 파일의 수 풀이기 ─────────────────────

const KD = { 일: 1, 이: 2, 삼: 3, 사: 4, 오: 5, 육: 6, 칠: 7, 팔: 8, 구: 9 };
const KS = { 천: 1000, 백: 100, 십: 10 };
const KB = [['조', 1e12], ['억', 1e8], ['만', 1e4]];
/** 네 자리 안쪽 읽은 말 → 수 ("천이백삼십구" → 1239, 앞의 일이 빠진 천·백·십은 1) — 단위는 천 → 백 → 십 차례로 한 번씩만("백천"·"십십"은 못 읽음, Codex 40차 #4) */
function parseSmall(s) {
  let v = 0; let cur = 0; let last = 10000;
  for (const ch of s) {
    if (KD[ch]) { if (cur) throw new Error(`숫자 두 번: ${s}`); cur = KD[ch]; } else if (KS[ch]) {
      if (KS[ch] >= last) throw new Error(`단위 차례: ${s}`);
      last = KS[ch]; v += (cur || 1) * KS[ch]; cur = 0;
    } else throw new Error(`못 읽음 "${ch}" in ${s}`);
  }
  return v + cur;
}
/** 한글로 읽은 수 → 수 ("삼만 사백팔십일" → 30481, "만 오천" → 15000, "일억" → 100000000) — 못 읽으면 null */
function parseKo(text) {
  const s0 = String(text).trim();
  if (!/^[일이삼사오육칠팔구십백천만억조 ]+$/.test(s0)) return null;
  let rest = s0.replace(/\s+/g, ''); let total = 0;
  try {
    for (const [u, m] of KB) {
      const i = rest.indexOf(u);
      if (i >= 0) { const head = rest.slice(0, i); total += (head ? parseSmall(head) : 1) * m; rest = rest.slice(i + 1); }
    }
    return total + (rest ? parseSmall(rest) : 0);
  } catch { return null; }
}
/** 만·억·조를 섞어 쓴 꼴 → 수 ("1조 6200억" → 1620000000000, "1569만" → 15690000) — 못 읽으면 null */
function parseMixed(text) {
  let t = 0;
  for (const tok of String(text).trim().split(/\s+/)) {
    const m = /^(\d+)(조|억|만)?$/.exec(tok);
    if (!m) return null;
    t += +m[1] * ({ 조: 1e12, 억: 1e8, 만: 1e4 }[m[2]] || 1);
  }
  return t;
}
/** 보기 글 → 수 (숫자 · 섞어 쓴 꼴 · 한글로 읽은 말) */
function valOf(text) {
  const s = String(text).trim();
  if (/^\d+$/.test(s)) return +s;
  if (/^\d+(조|억|만)?( \d+(조|억|만)?)*$/.test(s)) return parseMixed(s);
  return parseKo(s);
}
const formOf = (text) => (/^\d+$/.test(String(text).trim()) ? 'num' : /\d/.test(String(text)) ? 'mixed' : 'ko');
const lenOf = (n) => String(n).length;
/** 네 자리 묶음 [일, 만, 억, 조] — 글자를 잘라서 */
const grp = (n) => { const s = String(n).padStart(16, '0'); return [s.slice(12, 16), s.slice(8, 12), s.slice(4, 8), s.slice(0, 4)].map(Number); };
const P10 = (k) => 10 ** k;
const bolds = (q) => [...String(q).matchAll(/\*\*(.+?)\*\*/g)].map((m) => m[1]);
/** 식 계산기 — 자연수 + − × (사칙 몇 개만, 셈식 검사용). 못 읽으면 throw */
function evalExpr(src) {
  const s = String(src).trim();
  if (!/^[\d +−×]+$/.test(s)) throw new Error(`식 아님: ${s}`);
  const terms = s.split(/ ([+−]) /);
  const prod = (t) => t.split(' × ').reduce((a, x) => { if (!/^\d+$/.test(x.trim())) throw new Error(`수 아님: ${x}`); return a * +x; }, 1);
  let v = prod(terms[0]);
  for (let i = 1; i < terms.length; i += 2) v = terms[i] === '+' ? v + prod(terms[i + 1]) : v - prod(terms[i + 1]);
  return v;
}

// ───────────────────── 문제 글 읽기 ─────────────────────

/**
 * 문제 글 → { type, pick(보기에서 고르기), ans(정답 값), f(판정표 재료) }
 * 고르기 문제(가장 큰 수·가장 가까운 수)는 보기 값으로 정답을 정한다 — choices가 필요하다
 */
function solveText(q, choices = []) {
  let m;
  const b = bolds(q);
  if ((m = /^10000은 (\d+)보다 얼마 큰 수일까요\?/.exec(q)) || (m = /(\d+)원에서 얼마를 더 모으면 10000원이 될까요\?/.exec(q))) return { type: 'more', ans: 10000 - +m[1], f: { kind: 'x10' } };
  if ((m = /^10000은 (\d+)[이가] 몇 개인 수일까요\?/.exec(q)) || (m = /(\d+)원짜리 돈이 몇 개 있으면 10000원이 될까요\?/.exec(q))) return { type: 'count', ans: 10000 / +m[1], f: { kind: 'x10' } };
  if (/^다음을 수로 (쓰면 얼마일까요|쓴 것은 어느 것일까요)\?/.test(q)) { const n = parseKo(b[0]); return { type: 'write', pick: /어느 것/.test(q), ans: n, f: { kind: 'write', n } }; }
  if (/^다음을 하나의 수로 나타내면 얼마일까요\?/.test(q)) { const n = evalExpr(b[0]); return { type: 'expand', ans: n, f: { kind: 'expand', n } }; }
  if ((m = /^다음 수에서 숫자 (\d)[이가] 나타내는 값은 (얼마일까요|어느 것일까요)\?/.exec(q))) {
    const s = b[0]; const d = +m[1]; const at = s.indexOf(m[1]);
    assert.equal(at, s.lastIndexOf(m[1]), `${q}: 숫자 ${d}가 두 번`);
    return { type: 'value', pick: m[2] === '어느 것일까요', ans: d * P10(s.length - 1 - at), f: { kind: 'value', d } };
  }
  if (/^다음 수를 바르게 읽은 것은 어느 것일까요\?/.test(q)) { const n = +b[0]; return { type: 'read', pick: true, ans: n, f: { kind: 'read', n } }; }
  if ((m = /^10000이 (\d+)개인 수는 얼마일까요\?/.exec(q))) return { type: 'count10k', ans: +m[1] * 1e4, f: { kind: 'countk', k: +m[1] } };
  if ((m = /^1억이 (\d+)개인 수는 어느 것일까요\?/.exec(q))) return { type: 'countEok', pick: true, ans: +m[1] * 1e8, f: { kind: 'countk', k: +m[1] } };
  if ((m = /^1조가 (\d+)개, 1억이 (\d+)개인 수는 어느 것일까요\?/.exec(q))) return { type: 'mixJo', pick: true, ans: +m[1] * 1e12 + +m[2] * 1e8, f: { kind: 'mix', a: +m[1], b: +m[2] } };
  if ((m = /^1조가 (\d+)개인 수는 어느 것일까요\?/.exec(q))) return { type: 'countJo', pick: true, ans: +m[1] * 1e12, f: { kind: 'countk', k: +m[1] } };
  if ((m = /^(\d+)에서 (\d+)씩 (\d+)번 뛰어 세면 얼마일까요\?/.exec(q))) { const [s, st, k] = [+m[1], +m[2], +m[3]]; return { type: 'skip', ans: s + k * st, f: { kind: 'skip', s, st: k * st } }; }
  if ((m = /^(\d+)억에서 (\d+)억씩 (\d+)번 뛰어 센 수는 어느 것일까요\?/.exec(q))) { const [a, st, k] = [+m[1], +m[2], +m[3]]; return { type: 'skipEok', pick: true, ans: (a + k * st) * 1e8, f: { kind: 'skip', s: a * 1e8, st: k * st * 1e8 } }; }
  if (/^규칙에 따라 뛰어 세었어요\. □에 알맞은 수는 어느 것일까요\?/.test(q)) {
    const xs = b[0].split(' — ').slice(0, 3).map(parseMixed); const d = xs[1] - xs[0];
    assert.equal(xs[2] - xs[1], d, `${q}: 규칙이 고르지 않다`);
    return { type: 'pattern', pick: true, ans: xs[2] + d, f: { kind: 'skip', s: xs[2], st: d } };
  }
  if ((m = /^다음 중 (가장 큰|가장 작은) 수는 어느 것일까요\?/.exec(q))) {
    const big = m[1] === '가장 큰'; const vs = choices.map((c) => valOf(c.text));
    return { type: 'compare', pick: true, ans: big ? Math.max(...vs) : Math.min(...vs), f: { kind: 'compare', big } };
  }
  if ((m = /^숫자 카드 \*\*([\d, ]+)\*\*[을를] 한 번씩 모두 써서 만들 수 있는 가장 (작은|큰) 수는 얼마일까요\?/.exec(q))) {
    const ds = m[1].split(', ').map(Number); const asc = ds.slice().sort((x, y) => x - y);
    const L = +asc.slice().reverse().join('');
    const first = asc.find((x) => x > 0); const rest = asc.slice(); rest.splice(rest.indexOf(first), 1); const S = +[first, ...rest].join('');
    return { type: m[2] === '작은' ? 'cardSmall' : 'cardLarge', ans: m[2] === '작은' ? S : L, f: { kind: m[2] === '작은' ? 'cardSmall' : 'cardLarge', S, L, asc: +asc.join('') } };
  }
  if ((m = /^다음 중 (1억|1조)에 가장 가까운 수는 어느 것일까요\?/.exec(q))) {
    const T = m[1] === '1억' ? 1e8 : 1e12; const vs = choices.map((c) => valOf(c.text));
    const best = vs.slice().sort((x, y) => Math.abs(x - T) - Math.abs(y - T))[0];
    assert.ok(vs.filter((v) => Math.abs(v - T) === Math.abs(best - T)).length === 1, `${q}: 가장 가까운 수가 둘`);
    return { type: 'near', pick: true, ans: best, f: { kind: 'near', T } };
  }
  return { type: 'unknown' };
}

/** 이름표마다 그 틀린 생각이 실제로 하는 일 — 문제의 종류(f.kind)와 정답 값으로 다시 계산한다 (생성기 이름표를 베끼지 않는다) */
function tagHolds(f, ans, tag, wv) {
  if (!Number.isSafeInteger(wv) || wv <= 0) return false;
  const lead = (x) => +String(x)[0];
  switch (tag) {
    case TAGS.placeOff: return ['x10', 'write', 'expand', 'value', 'read', 'countk'].includes(f.kind) && (wv === ans * 10 || wv * 10 === ans);
    case TAGS.zeroPad: return ['write', 'mix'].includes(f.kind) && wv === +grp(ans).filter(Boolean).reverse().join('');
    // 수로 쓰기·조억 섞기에서도 — 0이 없는 묶음끼리면 "0 빼기"와 "네 자리를 채우지 않음"이 같은 값이 된다(삼만 사백육십팔 → 3468, Codex 40차 #2)
    case TAGS.zeroSkip: return ['expand', 'read', 'cardLarge', 'write', 'mix'].includes(f.kind) && wv === +String(ans).replace(/0/g, '');
    case TAGS.faceValue: return (f.kind === 'value' && wv === f.d) || (f.kind === 'countk' && wv === f.k);
    case TAGS.unitShift:
      if (f.kind === 'mix') return wv === f.a * 1e12 + f.b * 1e4;
      // 억 자리 값을 만으로(조를 억으로) — 만의 자리 숫자 하나(40000 → 4)는 "숫자만 봄"이다
      return ['write', 'value', 'read', 'countk'].includes(f.kind) && wv * 1e4 === ans && lenOf(ans) >= 9; // 만 아래로 내리면 그 수(개수·숫자)라 "숫자만 봄"
    case TAGS.skipPlace: return f.kind === 'skip' && (wv === f.s + f.st * 10 || (f.st % 10 === 0 && wv === f.s + f.st / 10));
    case TAGS.frontDigit:
      if (f.kind === 'near') return lead(wv) === lead(f.T) && lenOf(wv) !== lenOf(f.T);
      return f.kind === 'compare' && lenOf(wv) !== lenOf(ans) && (f.big ? lead(wv) > lead(ans) : lead(wv) < lead(ans));
    case TAGS.lowFirst: {
      if (f.kind !== 'compare' || lenOf(wv) !== lenOf(ans) || wv === ans) return false;
      const a = String(ans); const w = String(wv); let i = a.length - 1;
      while (a[i] === w[i]) i--;
      return f.big ? +w[i] > +a[i] : +w[i] < +a[i];
    }
    case TAGS.zeroFront: return f.kind === 'cardSmall' && wv === f.asc;
    case TAGS.reverse: return (f.kind === 'cardSmall' && wv === f.L) || (f.kind === 'cardLarge' && wv === f.S);
    default: return false;
  }
}
const ALL_TAGS = Object.values(TAGS);
const allText = (q) => [q.q, ...q.choices.map((x) => x.text), ...(q.solve ? [...q.solve.steps, ...Object.values(q.solve.why), q.solve.whyAny, q.solve.rule] : [])].join('\n');
function* every(kinds = ['calc', 'misread'], n = SEEDS) {
  for (const c of BIG) for (const k of kinds) for (let s = 1; s <= n; s++) yield { c, k, s, q: makeQuestion(c.id, k, s, OPTS) };
}

// ───────────────────── 사다리·풀이기 ─────────────────────

test('사다리: 8칸, 모두 초4, needs가 바로 앞 칸 · 맨 뒤는 ⭐ · 교과서 차시 순서', () => {
  assert.deepEqual(IDS, ['big.man', 'big.five', 'big.manunit', 'big.eok', 'big.jo', 'big.skip', 'big.compare', 'big.apply']);
  BIG.forEach((c, i) => {
    assert.equal(c.grade, 4, c.id);
    assert.deepEqual(c.needs, i ? [IDS[i - 1]] : [], c.id);
    assert.ok(c.idea && c.rule && c.slip, c.id);
  });
  assert.equal(gradeLabel(4), '초4');
  assert.match(BIG[7].name, /^⭐/);
});

test('풀이기 자체 점검 — 교과서 예(미래엔 4-1 14~21쪽)를 읽고 · 생성기의 읽은 말·섞어 쓴 꼴을 무작위 수로 되읽어 본다', () => {
  assert.equal(parseKo('삼만 사백팔십일'), 30481);
  assert.equal(parseKo('이천칠백오십구만'), 27590000);
  assert.equal(parseKo('사천육백삼십오억'), 463500000000);
  assert.equal(parseKo('칠백육십사조 천이백삼십구억'), 764123900000000);
  assert.equal(parseKo('만 오천'), 15000);
  assert.equal(parseKo('일억'), 1e8);
  assert.equal(parseMixed('1조 6200억'), 1620000000000);
  assert.equal(parseMixed('1569만'), 15690000);
  assert.equal(parseMixed('63조 8179억'), 63817900000000);
  assert.equal(parseKo('삼만 영'), null);
  // 생성기의 readKo·mixed — 9000조 미만 무작위 수 2,000개를 이 풀이기로 되읽어 같은 수인지
  let x = 12345;
  for (let i = 0; i < 2000; i++) {
    x = (x * 1103515245 + 12345) % 2147483648;
    const n = Math.floor((x / 2147483648) * (i % 2 ? 9e15 : 1e9)) + 1;
    assert.equal(parseKo(readKo(n)), n, `readKo(${n}) = ${readKo(n)}`);
    assert.equal(parseMixed(mixed(n)), n, `mixed(${n}) = ${mixed(n)}`);
  }
  assert.equal(readKo(10000), '만');
  assert.equal(readKo(100000000), '일억');
  // 교과서 읽는 법 — 천·백·십 앞의 일은 읽지 않는다 ("일천이백" 아님), 0인 자리는 읽지 않는다
  assert.equal(readKo(1234), '천이백삼십사');
  assert.equal(readKo(30481), '삼만 사백팔십일');
  assert.equal(readKo(110011), '십일만 십일');
  assert.equal(evalExpr('20000 + 5000 + 600 + 40 + 8'), 25648);
});

// ───────────────────── 문제 ─────────────────────

test('★ 독립 검산: ① 정답이 문제 글을 따로 읽어 푼 답과 같다 · 딱 하나만 맞다 · 모두 9000조 미만', () => {
  const types = new Set();
  for (const { c, s, q } of every(['calc'])) {
    const sv = solveText(q.q, q.choices);
    assert.notEqual(sv.type, 'unknown', `${c.id} #${s}: 못 읽는 문제\n${q.q}`);
    const right = q.choices.filter((x) => valOf(x.text) === sv.ans);
    assert.equal(right.length, 1, `${c.id} #${s} (${sv.type}): 맞는 보기 ${right.map((x) => x.text).join(', ') || '없음'} — 따로 푼 답 ${sv.ans}\n${q.q}\n${q.choices.map((x) => x.text).join(' | ')}`);
    assert.ok(right[0].ok, `${c.id} #${s}: 정답 표시가 다른 보기\n${q.q}`);
    for (const ch of q.choices) { const v = valOf(ch.text); assert.ok(Number.isSafeInteger(v) && v > 0 && v < LIMIT, `${c.id} #${s}: 보기 "${ch.text}" → ${v}`); }
    types.add(`${c.id}:${sv.type}`);
  }
  assert.ok(types.size >= 25, `문제 종류 ${types.size}: ${[...types]}`);
});

test('★ 보기: 정답 하나, 글자·값 겹침 없음, 3개 이상, 빈 글자·undefined·NaN 없음 · 한 문제 보기는 한 꼴(숫자/섞어 쓴 꼴/읽은 말) · ① 계산엔 그림 없음 · ② 그림은 자릿값 표만, 모두 그려진다', () => {
  let figs = 0;
  for (const { c, k, s, q } of every()) {
    const at = `${c.id} ${k} #${s}`;
    assert.ok(q.choices.length >= 3, `${at}: 보기 ${q.choices.length}`);
    assert.equal(q.choices.filter((x) => x.ok).length, 1, at);
    assert.equal(new Set(q.choices.map((x) => x.text)).size, q.choices.length, `${at}: 같은 글자 보기`);
    assert.ok(!/undefined|NaN|\{(me|mon)|null|Infinity|object Object|e\+\d/.test(allText(q)), `${at}: ${allText(q)}`);
    if (k === 'calc') {
      const vals = q.choices.map((x) => valOf(x.text));
      assert.equal(new Set(vals).size, vals.length, `${at}: 값이 같은 보기 ${q.choices.map((x) => x.text)}`);
      assert.equal(new Set(q.choices.map((x) => formOf(x.text))).size, 1, `${at}: 보기 꼴이 섞임 ${q.choices.map((x) => x.text)}`);
    }
    const ds = q.q.match(/\[[a-z]+ [^\]]+\]/g) || [];
    if (k === 'calc') assert.equal(ds.length, 0, `${at}: ① 계산에 그림 ${ds}`);
    for (const d of ds) { assert.match(d, /^\[place \d+\]$/, `${at}: 다른 그림 ${d}`); assert.ok(figureSvg(d.slice(1, -1)).startsWith('<svg'), `${at}: 못 그리는 ${d}`); figs++; }
  }
  assert.ok(figs > SEEDS / 2, `② 그림 ${figs}`);
});

test('★ 오개념 이름표: 그 오답이 정말 그 틀린 생각이다 — 문제 글의 수로 틀린 셈을 다시 한다 · 이름표 붙은 오답이 늘 둘 이상 · 열 이름표가 다 쓰인다', () => {
  let n = 0; const used = new Set();
  for (const { c, s, q } of every(['calc'])) {
    const sv = solveText(q.q, q.choices);
    const tagged = q.choices.filter((x) => !x.ok && x.tag !== '계산 실수');
    assert.ok(tagged.length >= 2, `${c.id} #${s}: 이름표 붙은 오답 ${tagged.length}\n${q.q}\n${q.choices.map((x) => `${x.text}[${x.tag || ''}]`).join(' | ')}`);
    for (const w of tagged) { assert.ok(tagHolds(sv.f, sv.ans, w.tag, valOf(w.text)), `${c.id} #${s} (${sv.type}): "${w.text}"의 이름표 "${w.tag}"가 뜻과 다르다\n${q.q}`); n++; used.add(w.tag); }
  }
  assert.ok(n > 2 * 8 * SEEDS, `본 이름표 ${n}`);
  assert.equal(used.size, ALL_TAGS.length, `안 쓰인 이름표: ${ALL_TAGS.filter((t) => !used.has(t))}`);
});

// Codex 39차 #3 — 한 값이 두 틀린 생각에서 나오면(X 4.5 ÷ 2.5 → 18) 보기에 남은 이름표 하나로는 어느 생각인지 모른다 → 그런 값은 아예 안 나오게
test('★ 한 오답 값이 두 틀린 생각에 다 맞는 일이 없다 — 보기에서 겹쳐 빠지기 전(probe.allWrong)까지 · 빠진 오답도 이름표의 뜻 그대로 · 정답과 같은 값 없음', () => {
  let n = 0;
  for (const { c, s, q } of every(['calc'])) {
    const sv = solveText(q.q, q.choices);
    const W = q.probe.allWrong;
    const vals = W.map((w) => valOf(w.text));
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
  assert.ok(n > 2 * 8 * SEEDS, `본 오답 ${n}`);
});

test('★ 보기 꼴: 숫자판 문제는 8자리 이하 자연수(앞에 0 없음) · 9자리 이상 수·섞어 쓴 꼴·읽은 말은 고르기("어느 것") · 정답의 꼴과 문제 꼴이 맞다', () => {
  let n = 0;
  for (const { c, s, q } of every(['calc'])) {
    const sv = solveText(q.q, q.choices);
    const ok = q.choices.find((x) => x.ok).text;
    if (/어느 것/.test(q.q)) { assert.ok(sv.pick, `${c.id} #${s}: 고르는 말인데 고르기가 아니다`); continue; }
    assert.ok(!sv.pick, `${c.id} #${s}: 고르기 문제에 "어느 것"이 없다`);
    for (const x of q.choices) { assert.match(x.text, /^[1-9]\d{0,7}$/, `${c.id} #${s}: 숫자판 보기 "${x.text}"`); n++; }
    assert.match(ok, /^[1-9]\d{0,7}$/);
  }
  assert.ok(n > 10 * SEEDS, `본 보기 ${n}`);
});

/** ② 문항 — 바른 값(문제 글에서 따로) · 보여 준 말의 결론 · 판정표 재료 */
function misreadFacts(q) {
  const B = bolds(q.q); const shown = B[B.length - 1] || '';
  let m;
  const tailVal = (t) => { // 글 끝의 수 — 섞어 쓴 꼴("4336조 4918만")까지 한 덩어리로
    const mm = /(\d+(?:조|억|만)?(?: \d+(?:조|억|만)?)*)(?:[이가은는을를]? ?(?:가장 커요|나타내요|큰 수예요|개예요|개인 수예요))?$/.exec(String(t).trim());
    return mm ? parseMixed(mm[1]) : null;
  };
  if ((m = /^10000은 (\d+)[이가] (\d+)개인 수예요$/.exec(shown))) return { shown: +m[2], right: 10000 / +m[1], f: { kind: 'x10' }, tail: tailVal };
  if ((m = /^10000은 (\d+)보다 (\d+) 큰 수예요$/.exec(shown))) return { shown: +m[2], right: 10000 - +m[1], f: { kind: 'x10' }, tail: tailVal };
  if ((m = /^(.+) → (\d+)$/.exec(shown))) return { shown: +m[2], right: parseKo(m[1]), f: { kind: 'write' }, tail: tailVal };
  if ((m = /^(\d+)에서 숫자 (\d)[이가] 나타내는 값은 (\d+)$/.exec(shown))) {
    const s = m[1]; const at = s.indexOf(m[2]);
    return { shown: +m[3], right: +m[2] * P10(s.length - 1 - at), f: { kind: 'value', d: +m[2] }, tail: tailVal, fig: s };
  }
  if ((m = /^10000이 (\d+)개인 수는 (\d+)$/.exec(shown))) return { shown: +m[2], right: +m[1] * 1e4, f: { kind: 'countk', k: +m[1] }, tail: tailVal };
  if ((m = /^1억이 (\d+)개인 수는 (\d+)$/.exec(shown))) return { shown: +m[2], right: +m[1] * 1e8, f: { kind: 'countk', k: +m[1] }, tail: tailVal };
  if ((m = /^(\d+)[은는] (\d+)(억|만)$/.exec(shown))) return { shown: parseMixed(`${m[2]}${m[3]}`), right: +m[1], f: { kind: 'read' }, tail: tailVal, fig: m[1] };
  if ((m = /^1조가 (\d+)개, 1억이 (\d+)개인 수는 (\d+)$/.exec(shown))) return { shown: +m[3], right: +m[1] * 1e12 + +m[2] * 1e8, f: { kind: 'mix', a: +m[1], b: +m[2] }, tail: tailVal };
  if ((m = /^(\d+)에서 (\d+)씩 뛰어 세면 ([\d, ]+)$/.exec(shown))) {
    const [s0, st] = [+m[1], +m[2]]; const seq = m[3].split(', ').map(Number);
    return { shown: seq[seq.length - 1], right: s0 + seq.length * st, f: { kind: 'skip', s: s0, st: seq.length * st }, tail: tailVal };
  }
  if ((m = /^(.+) 다음은 (.+)$/.exec(shown))) {
    const xs = m[1].split(', ').map(parseMixed); const d = xs[1] - xs[0];
    return { shown: parseMixed(m[2]), right: xs[2] + d, f: { kind: 'skip', s: xs[2], st: d }, tail: tailVal };
  }
  if ((m = /^(.+) 중에서 가장 큰 수는 (.+)$/.exec(shown))) {
    const xs = m[1].split(', ').map(valOf);
    return { shown: valOf(m[2]), right: Math.max(...xs), f: { kind: 'compare', big: true }, tail: tailVal };
  }
  if ((m = /^숫자 카드 ([\d, ]+)[으로]+ 만든 가장 (작은|큰) 수는 (\d+)$/.exec(shown))) {
    const asc = m[1].split(', ').map(Number).sort((x, y) => x - y);
    const L = +asc.slice().reverse().join(''); const first = asc.find((x) => x > 0); const rest = asc.slice(); rest.splice(rest.indexOf(first), 1); const S = +[first, ...rest].join('');
    return { shown: +m[3], right: m[2] === '작은' ? S : L, f: { kind: m[2] === '작은' ? 'cardSmall' : 'cardLarge', S, L, asc: +asc.join('') }, tail: tailVal };
  }
  return null;
}
test('★ ② 오개념 문항: 보여 준 말은 정말 틀렸다 · 고치는 말의 결론만 맞다 · 이름표 붙은 보기의 결론은 그 틀린 생각 · 보여 준 틀린 답도 어느 틀린 셈 · 갈래 열쇠 둘씩 · 그림의 수 = 보여 준 수', () => {
  const keys = {}; let n = 0;
  for (const { c, s, q } of every(['misread'], Math.max(SEEDS, 600))) {
    (keys[c.id] = keys[c.id] || new Set()).add(q.key);
    const at = `${c.id} #${s} ${q.key}`;
    const F = misreadFacts(q);
    assert.ok(F && F.right > 0, `${at}: 못 읽는 ②\n${q.q}`);
    assert.notEqual(F.shown, F.right, `${at}: 보여 준 말이 맞다\n${q.q}`);
    // 보여 준 틀린 답도 한 생각에만 맞는다 — 둘에 맞으면 고치는 말·풀이가 한 생각만 짚는다 (Codex 40차 #2를 ②에도)
    const shownTags = ALL_TAGS.filter((tg) => tagHolds(F.f, F.right, tg, F.shown));
    assert.equal(shownTags.length, 1, `${at}: 보여 준 답 ${F.shown}에 맞는 틀린 생각 ${shownTags.length}개 ${shownTags.join(' · ')}\n${q.q}`);
    const ok = q.choices.find((x) => x.ok);
    assert.equal(F.tail(ok.text), F.right, `${at}: 고치는 말 "${ok.text}"의 결론`);
    for (const w of q.choices.filter((x) => !x.ok)) {
      if (w.tag === '엉뚱한 지적') { assert.match(w.text, /(없어요|안 돼요|않아요|있어요|같은 값이에요)$/, `${at}: 엉뚱한 지적 "${w.text}"`); continue; }
      if (w.tag === '틀린 줄 모름') { assert.equal(w.text, '맞게 말했어요'); continue; }
      const v = F.tail(w.text);
      assert.ok(v !== null && v !== F.right, `${at}: 오개념 보기 "${w.text}"의 결론 ${v}`);
      assert.ok(tagHolds(F.f, F.right, w.tag, v), `${at}: ② 보기 "${w.text}"의 이름표 "${w.tag}"가 뜻과 다르다\n${q.q}`);
      n++;
    }
    const fig = /\[place (\d+)\]/.exec(q.q);
    if (fig) assert.equal(fig[1], F.fig, `${at}: 그림의 수 ${fig[1]} ≠ 보여 준 수 ${F.fig}`);
  }
  for (const id of IDS) assert.equal(keys[id].size, 2, `${id}: ② 갈래 ${[...keys[id]]}`);
  assert.ok(n >= 8 * 600, `본 ② 이름표 ${n}`);
});

// ───────────────────── 글 ─────────────────────

test('★ 조사: 수 뒤는 읽는 소리 · 한글로 읽은 수·섞어 쓴 꼴 뒤는 받침 · ASCII 빼기 없음 · 칸 설명도', () => {
  const BAT = new Set(['0', '1', '3', '6', '7', '8']);
  const PAIRS = [['을', '를'], ['은', '는'], ['이', '가'], ['과', '와'], ['이에요', '예요']];
  const batchim = (ch) => { const c = ch.charCodeAt(0) - 0xac00; return c >= 0 && c < 11172 && c % 28 !== 0; };
  let hitN = 0;
  const look = (all, at) => {
    for (const [wb, nb] of PAIRS) {
      for (const m of all.matchAll(new RegExp(`(?<![\\d/])(\\d+)(${wb}|${nb})(?=[\\s.,!?)—:]|$)`, 'g'))) { assert.equal(m[2], BAT.has(m[1].slice(-1)) ? wb : nb, `${at}: "…${m[1]}${m[2]}"\n${all}`); hitN++; }
      // 한글로 읽은 수·단위 끝(만·억·조·십·백·천 + 일~구) 뒤 조사
      for (const m of all.matchAll(new RegExp(`([일이삼사오육칠팔구십백천만억조])(${wb}|${nb}) (?=수로|나타내|가장|견줘)`, 'g'))) { assert.equal(m[2], batchim(m[1]) ? wb : nb, `${at}: "…${m[1]}${m[2]}"\n${all}`); hitN++; }
    }
    for (const m of all.matchAll(/(?<![\d/])(\d+)(으로|로)(?=[\s.,]|$)/g)) assert.equal(m[2], ['1', '7', '8'].includes(m[1].slice(-1)) ? '로' : BAT.has(m[1].slice(-1)) ? '으로' : '로', `${at}: "…${m[1]}${m[2]}"`);
    assert.ok(!/-\d|\d-/.test(all), `${at}: ASCII 빼기`);
  };
  for (const { c, k, s, q } of every()) look(allText(q).replace(/\*\*/g, '').replace(/\[place \d+\]/g, ''), `${c.id} ${k} #${s}`);
  for (const c of BIG) look([c.name, c.idea, c.rule, c.slip].join('\n').replace(/\*\*/g, ''), `${c.id} 설명`);
  assert.ok(hitN > 5 * SEEDS, `실제로 본 곳 ${hitN}`);
});

test('★ 풀이 카드: 단계 · 기억할 것 · 오답마다 왜 · 숫자 정답이 단계에 나온다', () => {
  for (const { c, k, s, q } of every()) {
    const sv = q.solve;
    assert.ok(sv && sv.steps.length >= 2 && sv.rule, `${c.id} ${k} #${s}`);
    for (const w of q.choices.filter((x) => !x.ok)) assert.ok(sv.why[w.tag] || sv.whyAny, `${c.id} ${k} #${s}: "${w.tag}" 설명 없음`);
    const ok = q.choices.find((x) => x.ok).text;
    if (k === 'calc') assert.ok(sv.steps.join(' ').includes(ok), `${c.id} #${s}: 정답 "${ok}"이 풀이에 없다\n${sv.steps.join('\n')}`);
  }
});

/** 글 속 "식 = 식" — 자연수 + − × (② 보여 준 말·오답 보기는 빼고) */
function eqChains(text) {
  const out = [];
  for (const m of String(text).matchAll(/(?<![+−×] |[\d.])\d(?:[\d +−×=])*\d/g)) {
    const parts = m[0].split(' = ').map((x) => x.trim());
    if (parts.length < 2) continue;
    const vals = parts.map((p) => { try { return evalExpr(p); } catch { return null; } });
    for (let i = 1; i < vals.length; i++) if (vals[i - 1] !== null && vals[i] !== null) out.push({ a: parts[i - 1], b: parts[i], ok: vals[i - 1] === vals[i] });
  }
  return out;
}
test('★ 글 속 셈식은 맞다 — 문제·정답·풀이·왜 · 칸 설명도', () => {
  let n = 0;
  for (const { c, k, s, q } of every()) {
    const all = [q.q.replace(/\*\*.+?\*\*/g, ''), q.choices.find((x) => x.ok).text, ...q.solve.steps, ...Object.values(q.solve.why), q.solve.whyAny].join('\n');
    for (const e of eqChains(all)) { assert.ok(e.ok, `${c.id} ${k} #${s}: ${e.a} = ${e.b}`); n++; }
  }
  assert.ok(n > 2 * SEEDS, `셈식 ${n}`);
  let m = 0;
  for (const c of BIG) for (const e of eqChains(`${c.idea}\n${c.rule}`.replace(/\*\*/g, ''))) { assert.ok(e.ok, `${c.id} 설명: ${e.a} = ${e.b}`); m++; }
  assert.ok(m >= 1, `칸 설명 셈식 ${m}`);
});

test('🔁 쌍둥이·🤔 노트: 요청한 틀·갈래로 온다 · 같은 셈 · 굵은 글씨(바뀌는 수·읽은 말)를 빼면 틀 글이 같다', () => {
  // 굵은 글씨(바뀌는 수·읽은 말)를 지우고, 그 뒤 조사(끝 숫자를 따라 을/를)도 한 모양으로
  const norm = (t) => tplKey(String(t).replace(/\*\*[^*]+\*\*/g, '**#**').replace(/\*\*#\*\*(을|를)/g, '**#**을'));
  for (const c of BIG) {
    for (let s = 1; s <= Math.min(Math.max(SEEDS, 150), 300); s++) {
      const q = makeQuestion(c.id, 'calc', s, OPTS);
      assert.ok(q.key, `${c.id} #${s}: 열쇠 없음`);
      const tw = makeQuestion(c.id, 'calc', s + 99991, { ...OPTS, want: { k: 'calc', key: q.key } });
      assert.equal(tw.key, q.key, `${c.id} #${s}: 쌍둥이가 다른 틀\n${q.q}\n---\n${tw.q}`);
      assert.equal(solveText(tw.q, tw.choices).type, solveText(q.q, q.choices).type, `${c.id} #${s}: 쌍둥이가 다른 셈`);
      if (!/\{/.test(q.key)) assert.equal(norm(tw.q), norm(q.q), `${c.id} #${s}: 틀 글이 다르다\n${q.q}\n---\n${tw.q}`);
      const m = makeQuestion(c.id, 'misread', s, OPTS);
      const mt = makeQuestion(c.id, 'misread', s + 99991, { ...OPTS, want: { k: 'misread', key: m.key } });
      assert.equal(mt.key, m.key, `${c.id} #${s}: ② 갈래`);
    }
  }
});

// 틀 열쇠(tplKey)는 숫자만 #로 바꾼다 — 한글로 읽은 수·카드 장수·섞어 쓴 꼴이 열쇠에 들어가면 문제마다 열쇠가 달라 🔁 쌍둥이가 같은 틀을 못 찾는다
test('🔁 틀마다 열쇠는 하나 — 칸마다 열쇠는 가족 수(4개) 이하 · 한 열쇠의 문제는 굵은 글씨를 빼면 같은 틀 글', () => {
  const norm = (t) => tplKey(String(t).replace(/\*\*[^*]+\*\*/g, '**#**').replace(/\*\*#\*\*(을|를)/g, '**#**을'));
  for (const c of BIG) {
    const byKey = {};
    for (let s = 1; s <= SEEDS; s++) { const q = makeQuestion(c.id, 'calc', s, OPTS); (byKey[q.key] = byKey[q.key] || new Set()).add(norm(q.q)); }
    const keys = Object.keys(byKey);
    assert.ok(keys.length <= 4, `${c.id}: 열쇠 ${keys.length}개 — ${keys.slice(0, 3).join(' / ')}`);
    for (const [k, texts] of Object.entries(byKey)) assert.equal(texts.size, 1, `${c.id}: 열쇠 "${k}"에 틀 글 ${texts.size}가지 — ${[...texts].slice(0, 2).join(' / ')}`);
  }
});

/** 참이라고 내미는 글에 틀린 말 — 오답 보기·② 보여 준 말은 빼고 */
const BAD = [
  [/앞자리 숫자가 크면 (?:더 )?큰 수/, '자리 수가 다르면 앞자리 숫자로 비교하지 않는다'],
  [/0(?:은|인 자리는) (?:쓰지 않아도|안 써도|빼고 써)/, '읽지 않는 0도 쓸 때는 쓴다'],
  [/세 자리씩 끊어/, '우리말은 네 자리씩 끊어 읽는다'],
  [/둘째 묶음(?:이|에)[^\n—.]{0,8}억|셋째 묶음(?:이|에)[^\n—.]{0,8}조/, '둘째 묶음은 만, 셋째는 억, 넷째는 조'],
  [/낮은 자리부터 (?:차례로 )?비교해요/, '높은 자리부터 비교한다'],
];
test('★ 참말에 틀린 말이 없다 — 앞자리만 비교 · 0은 안 써도 · 세 자리씩 끊기 · 묶음 이름 · 낮은 자리부터 비교', () => {
  const truths = (q) => [q.choices.find((x) => x.ok).text, ...(q.solve ? [...q.solve.steps, ...Object.values(q.solve.why), q.solve.whyAny, q.solve.rule] : [])].join('\n').replace(/\*\*/g, '');
  for (const { c, k, s, q } of every()) for (const [re, why] of BAD) assert.ok(!re.test(truths(q)), `${c.id} ${k} #${s}: ${why}\n${truths(q)}`);
  for (const c of BIG) for (const [re, why] of BAD) assert.ok(!re.test([c.idea, c.rule, c.slip].join('\n').replace(/\*\*/g, '')), `${c.id}: ${why}`);
});

// 아직 안 배운 단위 — 십만·백만·천만은 Y3부터, 억은 Y4부터, 조는 Y5부터 (오답 보기·읽은 말까지)
const FIRST = [[/[십백천]만/, 'big.manunit'], [/(?:\d|[일이삼사오육칠팔구십백천])억/, 'big.eok'], [/(?:\d|[일이삼사오육칠팔구십백천])조/, 'big.jo']];
test('★ 아직 안 배운 단위를 앞 칸에 쓰지 않는다 — 십만·백만·천만 Y3부터 · 억 Y4부터 · 조 Y5부터 (보기·읽은 말·그림까지) · 숫자도 그 칸의 자리 수까지', () => {
  const idx = (id) => IDS.indexOf(id);
  for (const c of BIG) for (const [re, at] of FIRST) if (idx(at) > idx(c.id)) assert.ok(!re.test(`${c.name} ${c.idea} ${c.rule} ${c.slip}`), `${c.id}: 설명에 ${re}`);
  const MAXLEN = { 'big.man': 5, 'big.five': 6, 'big.manunit': 8, 'big.eok': 13 };
  for (const { c, k, s, q } of every()) {
    const all = figText(allText(q));
    for (const [re, at] of FIRST) if (idx(at) > idx(c.id)) assert.ok(!re.test(all), `${c.id} ${k} #${s}: 아직 안 배운 ${re}\n${all}`);
    if (MAXLEN[c.id]) for (const ch of q.choices) { const v = valOf(ch.text); if (formOf(ch.text) !== 'num') assert.ok(lenOf(v) <= MAXLEN[c.id], `${c.id} ${k} #${s}: 보기 "${ch.text}" ${lenOf(v)}자리`); }
  }
});

test('🔢 숫자판: 8자리 이하 수가 답인 ①은 숫자판 · 모든 보기를 쳐서 그 보기로 간다 · 고르기는 숫자판 없음 · ± 없음', () => {
  const pv = readFileSync(new URL('../js/padview.js', import.meta.url), 'utf8');
  const MAX = +/const MAX = (\d+);/.exec(pv)[1];
  let n = 0; let picks = 0;
  for (const { c, s, q } of every(['calc'], 200)) {
    const spec = padSpec(q, 'bignum');
    if (/어느 것/.test(q.q)) { assert.equal(spec, null, `${c.id} #${s}: 고르는 문제에 숫자판`); picks++; continue; }
    assert.ok(spec, `${c.id} #${s}: 숫자판이 없다\n${q.q}`);
    assert.equal(spec.signed, false);
    for (const ch of q.choices) {
      assert.ok(String(ch.text).length <= MAX, `${c.id} #${s}: "${ch.text}"`);
      const t = partsOf(ch.text);
      const hit = matchTyped(q, readTyped(t.mode, t.p, spec), spec);
      assert.equal(q.choices[hit.i], ch, `${c.id} #${s}: "${ch.text}"를 쳐도 그 보기로 안 간다`);
      n++;
    }
  }
  assert.ok(n > 1000 && picks > 200, `쳐 본 보기 ${n} · 고르기 ${picks}`);
});

// ───────────────────── 그림 ─────────────────────

const attrsOf = (svg, cls) => [...svg.matchAll(new RegExp(`<(?:rect|text) class="${cls}"([^>]*)>`, 'g'))].map((m) => {
  const o = {}; for (const a of m[1].matchAll(/([a-z-]+)="([^"]*)"/g)) o[a[1]] = a[2]; return o;
});
test('🎨 자릿값 표 [place]: 숫자 칸 = 수의 숫자(자리마다) · 묶음 이름 조·억·만·일 · 빈 윗자리 · 폭 400 · 글로 바꾸기 · 못 그리는 지시문은 빈 그림', () => {
  for (const n of ['30481', '27590300', '352900000000', '5438000000000000', '7', '1234']) {
    const svg = figureSvg(`place ${n}`);
    const cells = attrsOf(svg, 'pl-d');
    const G = Math.ceil(n.length / 4);
    assert.equal(cells.length, G * 4, `${n}: 칸 수`);
    for (const cl of cells) { const p = +cl['data-place']; assert.equal(cl['data-v'], p < n.length ? n[n.length - 1 - p] : '', `${n}: ${p}자리`); }
    assert.deepEqual(attrsOf(svg, 'pl-g').map((g) => g['data-name']), ['일', '만', '억', '조'].slice(0, G).reverse(), `${n}: 묶음 이름`);
    assert.ok(+/viewBox="0 0 (\d+)/.exec(svg)[1] <= 400, n);
  }
  for (const bad of ['place 0123', 'place 12345678901234567', 'place 1.5', 'place', 'place 12 34']) assert.equal(figureSvg(bad), '', bad);
  assert.equal(figText('앞 [place 352900000000] 뒤'), '앞 (자릿값 표: 3529억 | 0000만 | 0000) 뒤');
  assert.equal(figText('[place 30481]', true), '(자릿값 표)');
  assert.ok(renderFigures('[place 30481]').startsWith('<svg'));
});

// ───────────────────── 사다리·진단·칸마다 수의 꼴 ─────────────────────

test('📏 진단·사다리·한 편·배움 예비·내용 검사', () => {
  const d = diagnosticSet(7, 5, OPTS);
  assert.equal(d.length, 5);
  assert.ok(d.every((q) => IDS.includes(q.concept)));
  const pl = placeFrom(d.map((q, i) => ({ concept: q.concept, correct: i < 2 })));
  assert.ok(IDS.includes(pl.startId) && pl.knownIds.every((id) => IDS.indexOf(id) < IDS.indexOf(pl.startId)));
  const L0 = ladder([]);
  assert.equal(L0[0].state, 'now');
  assert.ok(L0.slice(1).every((r) => r.state === 'locked'));
  for (const c of BIG) {
    const round = makeRound(c.id, 11, OPTS);
    assert.ok(round.length >= 2 && round.every((q) => q.concept === c.id), c.id);
    const les = lessonOf(c.id, 3, OPTS);
    assert.ok(les.pages.length >= 1 && les.title === c.name);
  }
  assert.ok(checkContent({}).length >= 8, '빈 원고는 칸마다 걸린다');
});

test('칸마다 수의 꼴 — Y1 10000 근처 · Y2 다섯 자리 · Y3 여섯~여덟 자리 · Y4 아홉~열두 자리 · Y5 열세~열여섯 자리(9000조 미만) · Y6 뛰어 세기 · Y7 비교 · Y8 카드·가장 가까운 수', () => {
  const shapes = {};
  const mark = (k) => { shapes[k] = (shapes[k] || 0) + 1; };
  for (let s = 1; s <= SEEDS; s++) {
    for (const c of BIG) {
      const q = makeQuestion(c.id, 'calc', s, OPTS); const sv = solveText(q.q, q.choices); const L = lenOf(sv.ans);
      const at = `${c.id} #${s} ${sv.type} ${sv.ans}`;
      if (c.id === 'big.man') assert.ok(sv.ans <= 9000, at);
      if (c.id === 'big.five') assert.ok(['write', 'expand', 'read'].includes(sv.type) ? L === 5 : L <= 5, at);
      if (c.id === 'big.manunit') assert.ok(sv.type === 'value' ? L >= 5 && L <= 8 : L >= 6 && L <= 8, at);
      if (c.id === 'big.eok') assert.ok(L >= 9 && L <= 12, at);
      if (c.id === 'big.jo') assert.ok(L >= 13 && L <= 16 && sv.ans < LIMIT, at);
      mark(`${c.id}:${sv.type}`);
    }
  }
  for (const k of ['big.man:more', 'big.man:count', 'big.five:write', 'big.five:expand', 'big.five:value', 'big.five:read', 'big.manunit:count10k', 'big.manunit:write', 'big.manunit:value', 'big.manunit:read', 'big.eok:countEok', 'big.eok:write', 'big.eok:read', 'big.eok:value', 'big.jo:countJo', 'big.jo:mixJo', 'big.jo:write', 'big.jo:read', 'big.skip:skip', 'big.skip:skipEok', 'big.skip:pattern', 'big.compare:compare', 'big.apply:cardSmall', 'big.apply:cardLarge', 'big.apply:near']) assert.ok(shapes[k], `나와야 하는 꼴 ${k}`);
});

// ───────────────────── 2단계: 원고 (coach/math/bignum.json) ─────────────────────
// 확인 질문은 생성기와 같은 문제 꼴로 써서 위의 solveText가 따로 푼다(원고에만 있는 꼴은 solveContent) — 오답은 위의 tagHolds로 한 생각에만 맞는지.
// 큰 수 줄기의 원고는 **한글로 읽은 수**가 많다 → 읽은 말을 이 파일의 풀이기로 수로 바꿔, 같은 글에 그 수가 있는지 본다(오타·잘못 읽은 말).

const CONTENT = JSON.parse(readFileSync(new URL('../coach/math/bignum.json', import.meta.url), 'utf8'));
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
const PLACE_FIG = /\[place \d+\]/g;
/** 원고에만 있는 문제 틀 (생성기 틀은 solveText가 읽는다) */
function solveContent(q, choices = []) {
  const sv = solveText(q, choices);
  if (sv.type !== 'unknown') return sv;
  const m = /^1억 원을 (\d+)원짜리 지폐로만 바꾸면 몇 장일까요\?$/.exec(q);
  if (m) return { type: 'bill', ans: 1e8 / +m[1], f: { kind: 'x10' } };
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
const KO = '일이삼사오육칠팔구십백천만억조';
/** 글에 그 보기(수·섞어 쓴 꼴·읽은 말)가 낱개로 있는가 — "24"가 "240" 속에서, "칠백삼십육"이 "칠백삼십육만" 속에서 잡히지 않게 */
const hasNum = (text, w) => (formOf(w) === 'ko'
  ? new RegExp(`(?<![가-힣])${reEsc(w)}(?![${KO}])`).test(text)
  : new RegExp(`(?<![\\d/.])(?<!\\d )${reEsc(w)}(?![\\d/]|\\.\\d)`).test(text));

test('원고(bignum.json)가 형식 검사를 통과한다 — 8칸이 사다리 순서대로 · 배움 4~5장·장마다 확인 질문(오답 둘)·아빠 카드(말 2개↑·함정 2개↑·통과 기준)', () => {
  assert.deepEqual(checkContent(CONTENT), []);
  assert.deepEqual(Object.keys(CONTENT).filter((k) => k !== '_'), IDS);
  for (const id of IDS) {
    const v = CONTENT[id];
    assert.ok(v.lesson.length >= 4 && v.lesson.length <= 5, `${id}: 배움 ${v.lesson.length}장`);
    assert.ok(v.lesson.every((p) => p.check && p.check.no.length === 2), `${id}: 장마다 확인 질문(오답 둘)`);
    assert.ok(v.dad.say.length >= 2 && v.dad.traps.length >= 2 && v.dad.pass, `${id}: 아빠 카드`);
    assert.ok(!/\{/.test([v.dad.goal, ...v.dad.say, v.dad.do, v.dad.pass, ...v.dad.traps.flatMap((t) => [t.kid, t.dad])].join(' ')), `${id}: 아빠 카드에 자리표시`);
  }
  const L = lessonOf('big.eok', 3, { ...OPTS, content: CONTENT });
  assert.equal(L.pages.length, CONTENT['big.eok'].lesson.length);
  assert.ok(L.pages.every((p) => p.check && p.check.ok));
  assert.equal(L.rule, CONTENT['big.eok'].rule);
});

test('★ 원고 확인 질문도 따로 풀어 대조 — 전부 읽히고, 맞는 보기는 정답 하나뿐 · 보기 꼴은 한 가지 · 오답 하나하나가 **한** 틀린 생각에만 맞다 · 오답끼리 값이 다르다 · 까닭은 정답·오답을 낱개로 다 말한다 · 이름표 10개 다 쓰임', () => {
  let n = 0; const types = new Set(); const used = new Set();
  for (const { at, p, chs, sv } of checksOf()) {
    const q = fillC(p.check.q); const why = fillC(p.check.why);
    assert.notEqual(sv.type, 'unknown', `${at}: 못 읽는 확인 질문\n${q}`);
    types.add(sv.type);
    const vals = chs.map((x) => valOf(x.text));
    for (const [k, v] of vals.entries()) assert.ok(Number.isSafeInteger(v) && v > 0 && v < LIMIT, `${at}: 보기 "${chs[k].text}" → ${v}`);
    const right = chs.filter((x, k) => vals[k] === sv.ans);
    assert.ok(right.length === 1 && right[0].ok, `${at} (${sv.type}): 맞는 보기 ${right.map((x) => x.text).join(', ') || '없음'} — 따로 푼 답 ${sv.ans}\n${q}`);
    assert.equal(new Set(vals).size, vals.length, `${at}: 값이 같은 보기 ${chs.map((x) => x.text)}`);
    assert.equal(new Set(chs.map((x) => formOf(x.text))).size, 1, `${at}: 보기 꼴이 섞임 ${chs.map((x) => x.text)}`);
    for (const x of chs.filter((c) => !c.ok)) {
      const tags = ALL_TAGS.filter((tg) => tagHolds(sv.f, sv.ans, tg, valOf(x.text)));
      assert.equal(tags.length, 1, `${at} (${sv.type}): 오답 "${x.text}"에 맞는 틀린 생각 ${tags.length}개 ${tags.join(' · ')}\n${q}`);
      used.add(tags[0]);
      assert.ok(hasNum(why, x.text), `${at}: 까닭에 오답 "${x.text}" 이야기가 없다`);
      n++;
    }
    assert.ok(hasNum(why, p.check.ok), `${at}: 까닭에 정답 "${p.check.ok}"이 없다`);
  }
  assert.ok(n >= 60, `본 오답 ${n}`);
  assert.ok(types.size >= 18, `확인 질문 종류 ${types.size}: ${[...types]}`);
  assert.equal(used.size, ALL_TAGS.length, `원고 오답이 안 쓴 틀린 생각: ${ALL_TAGS.filter((t) => !used.has(t))}`);
});

// 칸마다 그 칸의 문제 — 생성기의 "칸마다 수의 꼴"과 같은 잣대
const CELL = {
  'big.man': (sv) => ['more', 'count'].includes(sv.type) && sv.ans < 10000,
  'big.five': (sv) => ['expand', 'read', 'write', 'value'].includes(sv.type) && (sv.type === 'value' ? lenOf(sv.ans) <= 5 : lenOf(sv.ans) === 5),
  'big.manunit': (sv) => ['count10k', 'read', 'write', 'value'].includes(sv.type) && lenOf(sv.ans) >= 6 && lenOf(sv.ans) <= 8,
  'big.eok': (sv) => sv.type === 'bill' || (['countEok', 'read', 'write', 'value'].includes(sv.type) && lenOf(sv.ans) >= 9 && lenOf(sv.ans) <= 12),
  'big.jo': (sv) => ['countJo', 'mixJo', 'read', 'write', 'value'].includes(sv.type) && lenOf(sv.ans) >= 13 && lenOf(sv.ans) <= 16,
  'big.skip': (sv) => ['skip', 'skipEok', 'pattern'].includes(sv.type),
  'big.compare': (sv) => sv.type === 'compare',
  'big.apply': (sv) => ['cardLarge', 'cardSmall', 'near'].includes(sv.type),
};
test('★ 원고 확인 질문은 칸마다 그 칸의 문제 · 보기 꼴이 문제와 맞다 (읽기는 읽은 말 · 뛰어 센 억·만은 섞어 쓴 꼴 · 아홉 자리 이상의 "나타내는 값"은 섞어 쓴 꼴 · 크기 비교는 숫자나 섞어 쓴 꼴 · 나머지는 숫자)', () => {
  let n = 0;
  for (const { id, at, chs, sv } of checksOf()) {
    assert.ok(CELL[id](sv), `${at}: 이 칸의 문제가 아니다 (${sv.type} ${sv.ans})`);
    const want = sv.type === 'read' ? ['ko'] : ['skipEok', 'pattern'].includes(sv.type) || (sv.type === 'value' && lenOf(sv.ans) >= 9) ? ['mixed'] : sv.type === 'compare' ? ['num', 'mixed'] : ['num'];
    assert.ok(want.includes(formOf(chs[0].text)), `${at} (${sv.type}): 보기 꼴 ${chs.map((x) => x.text)}`);
    n++;
  }
  assert.ok(n >= 30, `본 확인 질문 ${n}`);
});

test('★ 원고의 셈식 — "= …"로 내려 쓴 줄까지 이어서 전부 맞다 · 한 줄에 "="는 둘까지', () => {
  let n = 0;
  for (const id of IDS) {
    for (const b of blocksOf(CONTENT[id])) {
      const t = b.replace(PLACE_FIG, '').replace(/\*\*/g, '');
      for (const line of t.split('\n')) assert.ok((line.match(/ = /g) || []).length <= 2, `${id}: 한 줄에 = 셋 이상 "${line}"`);
      for (const e of eqChains(t.replace(/\n= /g, ' = '))) { assert.ok(e.ok, `${id}: ${e.a} = ${e.b}`); n++; }
    }
  }
  assert.ok(n >= 25, `본 셈식 ${n}`);
});

/** 글 속 수 — 숫자·섞어 쓴 꼴(2조 4670억)·네 자리씩 끊은 꼴(2759 | 0300 → 27590300) */
function numbersIn(text) {
  let t = String(text).replace(/\*\*/g, '').replace(/\[place (\d+)\]/g, '$1');
  for (let k = 0; k < 4; k++) t = t.replace(/(\d+) \| (\d{4})/g, '$1$2');
  const out = new Set();
  for (const m of t.matchAll(/\d+[조억만]?(?: \d+[조억만])*/g)) { const v = parseMixed(m[0]); if (v !== null) out.add(v); }
  for (const m of t.matchAll(/\d+/g)) out.add(+m[0]);
  return out;
}
/**
 * 글 속 한글로 읽은 수 — [{ r, alts(읽은 말 후보), seg(그 말이 있는 줄 — "→ "로 시작하는 줄은 앞 줄에 이어서) }]
 * 자리 이름(천만의 자리 · 천·백·십·일)·한 글자(만·천)·수 뒤 단위(386만)는 뺀다 · 끝의 "이"는 수(천이 = 1002)일 수도 조사일 수도 있어 후보 둘
 * (단 한 글자 큰 단위 + 이 — "억이 있는 수"·"만이야" — 는 조사) — Codex 40차 #4: 끝의 이를 늘 떼면 "육만 사백이"가 60400으로 읽혔다
 */
function readingsIn(text) {
  const t = String(text).replace(/\*\*/g, '').replace(PLACE_FIG, '');
  const segs = [];
  for (const line of t.split('\n')) { if (/^→ /.test(line) && segs.length) segs[segs.length - 1] += `\n${line}`; else segs.push(line); }
  const out = [];
  for (const seg of segs) {
    for (const m of seg.matchAll(new RegExp(`[${KO}]+(?: [${KO}]+)*`, 'g'))) {
      const r = m[0];
      const prev = seg[m.index - 1] || ''; const next = seg.slice(m.index + r.length);
      if (/[\d가-힣·]/.test(prev) || next.startsWith('·') || next.startsWith('의')) continue;
      const alts = [r];
      if (r.endsWith('이') && r.length > 1) {
        const cut = r.slice(0, -1);
        if (/^[만억조]$/.test(cut)) continue;
        alts.push(cut);
      }
      if (r.replace(/ /g, '').length < 2) continue;
      out.push({ r, alts, seg });
    }
  }
  return out;
}
/**
 * 읽은 말이 그 수를 바르게 읽었나 — 그 줄(→ 줄은 이어서)에 백 이상의 수가 있으면 그 줄의 수와, 없으면 글 전체(all)의 수와 맞춘다
 * (장 전체로만 보면 "30481은 칠만 삼백육십"이 같은 장 확인 질문의 70360 때문에 지나갔다 — Codex 40차 #4)
 * @returns {{ n: number, bad: string[] }}
 */
function readingProblems(allText, readText) {
  const nums = numbersIn(allText); const bad = []; let n = 0;
  for (const { r, alts, seg } of readingsIn(readText)) {
    const vals = alts.map(parseKo).filter((x) => x !== null);
    if (!vals.length) { bad.push(`못 읽는 말 "${r}"`); continue; }
    const local = [...numbersIn(seg)].filter((x) => x >= 100);
    const pool = local.length ? new Set(local) : nums;
    if (!vals.some((x) => pool.has(x))) bad.push(`"${r}"(= ${vals.join(' 또는 ')})이 ${local.length ? `그 줄의 수(${local.join(', ')})` : '같은 글의 수'}가 아니다`);
    n++;
  }
  return { n, bad };
}
test('★ 원고의 한글로 읽은 수는 그 줄(없으면 같은 글)에 있는 수를 바르게 읽은 말이다 — 장마다(배움·확인 질문·보기·까닭) · 아빠 카드마다 (아이 말은 빼고 읽는다)', () => {
  // 검사 자체 점검 (Codex 40차 #4의 예)
  assert.deepEqual(readingProblems('', '30481은 삼만 사백팔십일이라고 읽어요.').bad, []);
  assert.equal(readingProblems('70360', '30481은 칠만 삼백육십 — 천의 자리가 0이에요.').bad.length, 1, '같은 장의 다른 수로 지나가지 않는다');
  assert.deepEqual(readingProblems('', '60402는 육만 사백이라고 읽어요.').bad, [], '끝의 "이"가 수(2)인 말');
  assert.deepEqual(readingProblems('', '1002는 천이라고 읽어요.').bad, []);
  assert.equal(readingProblems('', '60400은 육만 사백이라고 읽어요.').bad.length, 0, '조사 "이라고"로도 읽힌다(후보 둘)');
  assert.equal(readingProblems('', '60402는 육만 오백이라고 읽어요.').bad.length, 1);
  assert.deepEqual(readingProblems('', '억이 있는 수도 끊어요. 10000은 만이야.').bad, [], '한 글자 단위 + 조사 이');
  let n = 0;
  for (const id of IDS) {
    const v = CONTENT[id];
    const groups = [
      ...v.lesson.map((p) => ({ all: [p.say, p.check.q, p.check.ok, ...p.check.no, p.check.why], read: [p.say, p.check.q, p.check.ok, ...p.check.no, p.check.why] })),
      { all: [v.rule], read: [v.rule] },
      { all: [v.dad.goal, ...v.dad.say, v.dad.do, v.dad.pass, ...v.dad.traps.flatMap((t) => [t.kid, t.dad])], read: [v.dad.goal, ...v.dad.say, v.dad.do, v.dad.pass, ...v.dad.traps.map((t) => t.dad)] },
    ];
    for (const g of groups) {
      const res = readingProblems(fillC(g.all.join('\n')), fillC(g.read.join('\n')));
      assert.deepEqual(res.bad, [], `${id}`);
      n += res.n;
    }
  }
  assert.ok(n >= 40, `본 읽은 말 ${n}`);
});

test('★ 원고의 네 자리씩 끊은 꼴(2759 | 0300)은 같은 글의 수를 끊은 것이다 — 이어 붙인 수가 그 글에 숫자·섞어 쓴 꼴·읽은 말로 있다 (0으로 시작하는 아래 묶음 "0000 | 0000"은 빼고)', () => {
  let n = 0;
  for (const id of IDS) {
    const v = CONTENT[id];
    const groups = [
      ...v.lesson.map((p) => [p.say, p.check.q, p.check.ok, ...p.check.no, p.check.why]),
      [v.dad.goal, ...v.dad.say, v.dad.do, v.dad.pass, ...v.dad.traps.flatMap((t) => [t.kid, t.dad])],
    ];
    for (const g of groups) {
      const text = fillC(g.join('\n')).replace(/\*\*/g, '');
      for (const m of text.matchAll(/(?<![\d|] ?)([1-9]\d{0,3})((?: \| \d{4})+)/g)) {
        const joined = +(m[1] + m[2].replace(/ \| /g, ''));
        const rest = text.slice(0, m.index) + ' ' + text.slice(m.index + m[0].length);
        const seen = new Set([...numbersIn(rest), ...readingsIn(rest).flatMap((x) => x.alts.map(parseKo))]);
        assert.ok(seen.has(joined), `${id}: "${m[0]}"(= ${joined})이 같은 글의 어느 수도 아니다`);
        n++;
      }
    }
  }
  assert.ok(n >= 20, `본 끊은 꼴 ${n}`);
});

// 3단계 헤드리스(390)가 잡음 — "764123900000000 → 764 | 1239 | 0000 | 0000 — 칠백육십사조 …"를 한 줄로 쓰면 폰 폭에서 끊은 꼴 한가운데가 끊긴다
test('★ 원고의 끊은 꼴이 든 줄은 폰 폭(글 칸 약 20글자)에 한 줄로 들어간다 — 한 단계 한 줄("수 / → 끊은 꼴 / → 읽은 말") · 배움 글·까닭', () => {
  const em = (line) => [...line].reduce((a, ch) => a + (/[가-힣]/.test(ch) ? 1 : 0.6), 0);
  let n = 0;
  for (const id of IDS) {
    CONTENT[id].lesson.forEach((p, i) => {
      for (const t of [p.say, p.check.why]) {
        for (const line of fillC(t).replace(/\*\*/g, '').split('\n')) {
          if (!/\d \| \d/.test(line)) continue;
          assert.ok(em(line) <= 20, `${id}[${i}]: 끊은 꼴이 든 줄이 폰에서 두 줄로 끊긴다 (${em(line).toFixed(1)}글자) "${line}"`);
          n++;
        }
      }
    });
  }
  assert.ok(n >= 15, `본 줄 ${n}`);
});

/** 아빠 카드 통과 기준의 문제 — 생성기·원고 틀이거나, 말로 시키는 꼴("…을 읽어 보세요." 등) */
function solvePass(q) {
  const sv = solveContent(q);
  if (sv.type !== 'unknown') return { ans: sv.ans, form: 'num' };
  let m;
  if ((m = /^(\d+)[을를] 읽어 보세요\.$/.exec(q))) return { ans: +m[1], form: 'ko' };
  if ((m = /^(.+?)[을를] 수로 써 보세요\.$/.exec(q))) return { ans: parseKo(m[1]), form: 'num' };
  if ((m = /^(\d+)에서 숫자 (\d)[이가] 나타내는 값은 얼마일까요\?$/.exec(q))) {
    const s = m[1]; const at = s.indexOf(m[2]);
    assert.equal(at, s.lastIndexOf(m[2]), `${q}: 숫자가 두 번`);
    return { ans: +m[2] * P10(s.length - 1 - at), form: 'num' };
  }
  if ((m = /^1(억|조)[이가] (\d+)개인 수를 써 보세요\.$/.exec(q))) return { ans: +m[2] * (m[1] === '억' ? 1e8 : 1e12), form: 'num' };
  if ((m = /^(\d+)억에서 (\d+)억씩 (\d+)번 뛰어 센 수를 써 보세요\.$/.exec(q))) return { ans: (+m[1] + +m[2] * +m[3]) * 1e8, form: 'mixed' };
  if ((m = /^(.+) 중에서 가장 (큰|작은) 수는 무엇일까요\?$/.exec(q))) {
    const xs = m[1].split(', '); const vs = xs.map(valOf); const t = m[2] === '큰' ? Math.max(...vs) : Math.min(...vs);
    return { ans: t, form: formOf(xs[vs.indexOf(t)]) };
  }
  if ((m = /^숫자 카드 ([\d, ]+)[을를] 한 번씩 모두 써서 만들 수 있는 가장 (작은|큰) 수는 얼마일까요\?$/.exec(q))) {
    const asc = m[1].split(', ').map(Number).sort((x, y) => x - y);
    const first = asc.find((x) => x > 0); const rest = asc.slice(); rest.splice(rest.indexOf(first), 1);
    return { ans: m[2] === '작은' ? +[first, ...rest].join('') : +asc.slice().reverse().join(''), form: 'num' };
  }
  return null;
}
test('★ 원고 아빠 카드: 통과 기준의 문제를 따로 풀어 괄호 속 답과 대조 (읽기는 읽은 말로 · 수로 쓰기는 숫자로)', () => {
  let n = 0;
  for (const id of IDS) {
    const ps = fillC(CONTENT[id].dad.pass);
    const qs = [...ps.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    const ans = ((/\(([^)]+)\)/.exec(ps.replace(/"[^"]+"/g, '')) || [])[1] || '').split(' · ');
    assert.ok(qs.length >= 2, `${id}: 통과 기준의 문제 ${qs.length}개 "${ps}"`);
    assert.equal(ans.length, qs.length, `${id}: 문제 ${qs.length}개 · 답 ${ans.length}개 "${ps}"`);
    qs.forEach((q, k) => {
      const sv = solvePass(q);
      assert.ok(sv && sv.ans > 0, `${id}: 못 읽는 통과 기준 문제 "${q}"`);
      assert.equal(valOf(ans[k]), sv.ans, `${id}: "${q}"의 답 ${ans[k]} ≠ ${sv.ans}`);
      assert.equal(formOf(ans[k]), sv.form, `${id}: "${q}"의 답 꼴 "${ans[k]}"`);
      n++;
    });
  }
  assert.ok(n >= 17, `본 통과 기준 문제 ${n}`);
});

test('🎨 원고의 그림: 자릿값 표만 · 모두 그려진다 · 확인 질문엔 그림 없음 · 그림의 수가 그 장의 글에 숫자로 있다', () => {
  let n = 0;
  for (const id of IDS) {
    CONTENT[id].lesson.forEach((p, i) => {
      const at = `${id}[${i}]`;
      assert.ok(!/\[[a-z]+ [^\]]+\]/.test(p.check.q), `${at}: 확인 질문에 그림 (답을 흘린다)`);
      const plain = p.say.replace(/\[[^\]]+\]/g, '').replace(/\*\*/g, '');
      for (const m of p.say.matchAll(/\[([a-z]+) ([^\]]+)\]/g)) {
        assert.equal(m[1], 'place', `${at}: 그림 ${m[0]}`);
        assert.ok(figureSvg(`place ${m[2]}`).startsWith('<svg'), `${at}: 못 그리는 ${m[0]}`);
        assert.ok(hasNum(plain, m[2]), `${at}: 그림 ${m[0]}의 수가 글에 없다`);
        n++;
      }
    });
  }
  assert.ok(n >= 8, `원고 그림 ${n}`);
});

test('★ 원고의 조사·아직 안 배운 단위·틀린 말 (배움 글·확인 질문·아빠 카드 전부) — 수 뒤는 읽는 소리 · 만·억·조 뒤는 받침 · 읽은 말 뒤도 받침 · 쉼표 없이 · 십만 Y3·억 Y4·조 Y5부터(그림 글까지) · 숫자 자리 수도 그 칸까지', () => {
  const BAT = new Set(['0', '1', '3', '6', '7', '8']);
  const batchim = (ch) => { const c = ch.charCodeAt(0) - 0xac00; return c >= 0 && c < 11172 && c % 28 !== 0; };
  const PAIRS = [['을', '를'], ['은', '는'], ['이', '가'], ['과', '와'], ['이에요', '예요']];
  const END = '(?=[\\s.,!?)—"]|$)';
  const MAXLEN = { 'big.man': 5, 'big.five': 6, 'big.manunit': 8, 'big.eok': 12 };
  const idx = (id) => IDS.indexOf(id);
  let hitN = 0; let unitN = 0; let koN = 0;
  for (const id of IDS) {
    const raw = contentText(CONTENT[id]).replace(/\*\*/g, '');
    const all = raw.replace(PLACE_FIG, '');
    for (const [wb, nb] of PAIRS) {
      for (const m of all.matchAll(new RegExp(`(?<![\\d/])(\\d+)(${wb}|${nb})${END}`, 'g'))) { assert.equal(m[2], BAT.has(m[1].slice(-1)) ? wb : nb, `${id}: "…${m[1]}${m[2]}"`); hitN++; }
      for (const m of all.matchAll(new RegExp(`\\d([만억조])(${wb}|${nb})${END}`, 'g'))) { assert.equal(m[2], batchim(m[1]) ? wb : nb, `${id}: "…${m[1]}${m[2]}"`); unitN++; }
    }
    // 한글로 읽은 수 뒤 — 이·가는 수 이름 "이(2)"와 헷갈려 원고에 쓰지 않으니 은/는·을/를·과/와만 본다
    const KO_PAIR = { 은: ['은', '는'], 는: ['은', '는'], 을: ['을', '를'], 를: ['을', '를'], 과: ['과', '와'], 와: ['과', '와'] };
    for (const m of all.matchAll(new RegExp(`(?<![가-힣])([${KO}]{2,})(은|는|을|를|과|와)${END}`, 'g'))) {
      const [wb, nb] = KO_PAIR[m[2]];
      assert.equal(m[2], batchim(m[1].slice(-1)) ? wb : nb, `${id}: 읽은 말 뒤 조사 "${m[0]}"`);
      koN++;
    }
    for (const m of all.matchAll(/(?<![\d/])(\d+)(으로|로)(?=[\s.,"]|$)/g)) assert.equal(m[2], ['1', '7', '8'].includes(m[1].slice(-1)) ? '로' : BAT.has(m[1].slice(-1)) ? '으로' : '로', `${id}: "…${m[1]}${m[2]}"`);
    assert.ok(!/-\d|\d-/.test(all), `${id}: ASCII 빼기`);
    assert.ok(!/\d,\d/.test(all), `${id}: 큰 수에 쉼표 (교과서처럼 쉼표 없이)`);
    if (MAXLEN[id]) for (const m of all.matchAll(/\d+/g)) assert.ok(m[0].length <= MAXLEN[id], `${id}: ${m[0].length}자리 수 ${m[0]} (이 칸은 ${MAXLEN[id]}자리까지)`);
    const withFig = figText(raw);
    for (const [re, at] of FIRST) if (idx(at) > idx(id)) assert.ok(!re.test(withFig), `${id}: 아직 안 배운 ${re}`);
    const truth = truthText(CONTENT[id]).replace(/\*\*/g, '');
    for (const [re, why] of BAD) assert.ok(!re.test(truth), `${id}: ${why}`);
  }
  assert.ok(hitN >= 150 && unitN >= 30 && koN >= 10, `실제로 본 조사 — 수 ${hitN} · 단위 ${unitN} · 읽은 말 ${koN}`);
});

test('원고는 배포 파일 검사(check.mjs)에도 걸린다 — bignum.json → mathbig.js의 checkContent', () => {
  const src = readFileSync(new URL('../tools/check.mjs', import.meta.url), 'utf8');
  assert.ok(src.includes("'coach/math/bignum.json': '../js/mathbig.js'"));
});

// ───────────────────── 3단계: 화면 연결 ─────────────────────

test('화면 연결 (3단계): STEMS.bignum(Y)는 이 생성기·원고를 쓰고 AA 곱셈과 나눗셈 바로 앞(그다음 B 혼합계산) · 앱 셸이 둘 다 들고 간다 · 사다리 안내에 아직 안 배운 단위·틀린 말 없음 · 숫자판 ± 없음 · 자릿값 표를 📊·❓가 안다', async () => {
  const { STEMS, STEM_ORDER, stemOf } = await import('../js/mathprog.js');
  const Y = STEMS.bignum;
  assert.equal(Y.code, 'Y');
  assert.equal(Y.label, '큰 수 줄기', '줄기 고르기·📊에 보이는 이름');
  const at = STEM_ORDER.indexOf('bignum');
  assert.deepEqual(STEM_ORDER.slice(at - 1, at + 2), ['fracdiv', 'bignum', 'muldiv'], 'T 분수의 나눗셈 뒤·AA 곱셈과 나눗셈 바로 앞 (4-1 큰 수 → 곱셈과 나눗셈 → B 혼합계산 — 혼합계산의 자연수 셈보다 먼저)');
  assert.equal(Y.list, BIG);
  assert.equal(Y.gen.makeQuestion, makeQuestion);
  assert.equal(Y.gen.lessonOf, lessonOf, '📚 배움은 이 생성기의 lessonOf');
  assert.equal(Y.lesson, true);
  assert.equal(Y.file, './coach/math/bignum.json');
  assert.equal(Y.range, '초4');
  assert.ok(IDS.every((id) => stemOf(id) === Y), '모든 칸이 Y 줄기로 찾아진다');
  assert.match(Y.pick, /네 자리씩 끊어 읽어요/);
  // 사다리 안내·첫 안내는 Y1부터 본다 — 아직 안 배운 단위(십만·억·조)·참말에 틀린 말이 없다
  const guide = `${Y.pick} ${Y.intro}`;
  for (const [re] of FIRST) assert.ok(!re.test(guide), `안내에 ${re}`);
  for (const [re, why] of BAD) assert.ok(!re.test(guide), `안내에 ${why}`);
  // 앱이 가져오는 원고(Y.file)로 배움 장이 그대로 만들어진다
  const content = JSON.parse(readFileSync(new URL(Y.file.replace('./', '../'), import.meta.url), 'utf8'));
  for (const id of IDS) assert.equal(Y.gen.lessonOf(id, 5, { ...OPTS, content }).pages.length, content[id].lesson.length, `${id}: 원고 배움 장`);
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  for (const f of ['./js/mathbig.js', './coach/math/bignum.json']) assert.ok(sw.includes(`'${f}'`), `APP_SHELL에 ${f}`);
  // 숫자판은 이 줄기 열쇠로 — 큰 수는 늘 자연수라 ± 없음
  assert.equal(padSpec(makeQuestion('big.five', 'calc', 1, OPTS), Y.key).signed, false);
  // 📊 펼친 문제 글(figText)·❓ 복사문·📊 답장 안내 — 자릿값 표를 안다, 안내의 예는 그대로 그려진다
  assert.equal(figText('앞 [place 27590300] 뒤', true), '앞 (자릿값 표) 뒤');
  const ask = readFileSync(new URL('../js/mathask.js', import.meta.url), 'utf8');
  const stats = readFileSync(new URL('../js/stats.js', import.meta.url), 'utf8');
  assert.ok(ask.includes('[place 27590300]') && stats.includes('[place 27590300]'), '❓ 복사문·📊 답장 안내에 [place] 예');
  assert.ok(renderFigures('[place 27590300]').startsWith('<svg'), '안내의 예도 그려진다');
});

// ───────────────────── 🔍 Codex 40차 ─────────────────────

const PNT = ['일', '십', '백', '천', '만', '십만', '백만', '천만', '억', '십억', '백억', '천억', '조', '십조', '백조', '천조'];
const digitAt = (n, p) => Math.floor(n / P10(p)) % 10;
// #1 — "397874에서 10000씩: 만의 자리 숫자가 1씩 커져요 — 407874, 417874"는 만의 자리가 9 → 0 → 1이다(정답 보기에 틀린 말)
test('★ Y6 뛰어 세기: "…의 자리 숫자가 1씩 커져요"라고 말한 수열은 정말 그 자리 숫자가 1씩 커진다 — 9에서 0으로 넘어가면 그 글에 "9 다음에는 0" · ② 갈래는 받아올림 없이 · 규칙 가족은 "차"를 말하는 규칙 (Codex 40차 #1)', () => {
  let claims = 0; let carries = 0; let patterns = 0;
  for (const k of ['calc', 'misread']) {
    for (let s = 1; s <= Math.max(SEEDS, 600); s++) {
      const q = makeQuestion('big.skip', k, s, OPTS);
      const at = `${k} #${s}`;
      if (/규칙에 따라|다음은/.test(q.q)) { assert.match(q.solve.rule, /차/, `${at}: 규칙 가족의 기억할 것 "${q.solve.rule}"`); patterns++; continue; }
      let m; let start; let step; let count;
      if ((m = /^(\d+)에서 (\d+)씩 (\d+)번 뛰어 세면/.exec(q.q))) [start, step, count] = [+m[1], +m[2], +m[3]];
      else if ((m = /^(\d+)억에서 (\d+)억씩 (\d+)번 뛰어 센/.exec(q.q))) [start, step, count] = [+m[1] * 1e8, +m[2] * 1e8, +m[3]];
      else if ((m = /\*\*(\d+)에서 (\d+)씩 뛰어 세면 /.exec(q.q))) [start, step, count] = [+m[1], +m[2], 3];
      assert.ok(start !== undefined, `${at}: 못 읽는 뛰어 세기\n${q.q}`);
      for (const t of [...q.choices.map((c) => c.text), ...q.solve.steps, ...Object.values(q.solve.why)]) {
        const c = /(\S+)의 자리 숫자가 1씩 커져요/.exec(t);
        if (!c) continue;
        const p = PNT.indexOf(c[1]) + (/억의 묶음에서/.test(t) ? 8 : 0);
        assert.ok(PNT.includes(c[1]), `${at}: 자리 이름 "${c[1]}"`);
        // 수열 — 보기는 "— a, b, c"(그 보기가 말한 수), 풀이·왜는 문제의 수열
        const listed = / — ([\d, ]+)$/.exec(t);
        const seq = listed ? [start, ...listed[1].split(', ').map(Number)] : Array.from({ length: count + 1 }, (_, i) => start + i * step);
        let wrap = false;
        for (let i = 1; i < seq.length; i++) {
          const a = digitAt(seq[i - 1], p); const b = digitAt(seq[i], p);
          assert.equal(b, (a + 1) % 10, `${at}: "${t}" — ${seq[i - 1]} → ${seq[i]}에서 ${PNT[p]}의 자리가 ${a} → ${b}`);
          if (a === 9) wrap = true;
        }
        if (wrap) {
          assert.equal(k, 'calc', `${at}: ② 갈래에 받아올림 "${t}"`);
          assert.match(t, /9 다음에는 0/, `${at}: 받아올림인데 "9 다음에는 0"이 없다 "${t}"`);
          carries++;
        }
        claims++;
      }
    }
  }
  assert.ok(claims > 400 && carries > 20 && patterns > 100, `본 말 ${claims} · 받아올림 ${carries} · 규칙 가족 ${patterns}`);
  // 칸 규칙(기억할 것)도 일반으로 참 — 9 다음은 0
  assert.match(BIG.find((c) => c.id === 'big.skip').rule, /9 다음에는 0/);
});

// #3 — 앞에 더 큰 묶음이 있으면 1만은 "일만"(삼억 일만) · 맨 앞이면 "만"(교과서 "만 또는 일만")
test('한글로 읽기: 맨 앞의 1만은 "만", 억·조 뒤에 끼인 1만은 "일만" — 글자 그대로 대조 (Codex 40차 #3) · 풀이기는 단위 차례가 틀린 말을 못 읽는다 (#4)', () => {
  assert.equal(readKo(10000), '만');
  assert.equal(readKo(10010), '만 십');
  assert.equal(readKo(110000), '십일만');
  assert.equal(readKo(300010000), '삼억 일만');
  assert.equal(readKo(100010000), '일억 일만');
  assert.equal(readKo(1000000010000), '일조 일만');
  assert.equal(readKo(1000100000000), '일조 일억');
  assert.equal(parseKo('삼억 일만'), 300010000);
  assert.equal(parseKo('백천'), null);
  assert.equal(parseKo('십십'), null);
  assert.equal(parseKo('천이'), 1002);
});

// #6 — 16칸 표는 viewBox 400에 글자 12라 폰(318px)에서 9.5px였다
test('🎨 자릿값 표: 묶음이 셋 이상(12·16칸)이면 글자 15 이상·칸이 글자보다 넓다 — 폰 폭(318px)에서도 12px쯤 (Codex 40차 #6)', () => {
  for (const n of ['352900000000', '764123900000000', '4170235896000000']) {
    const svg = figureSvg(`place ${n}`);
    const fs = [...svg.matchAll(/font-size="([\d.]+)"/g)].map((m) => +m[1]);
    assert.ok(fs.length && Math.min(...fs) >= 15, `${n}: 글자 ${Math.min(...fs)}`);
    const cw = +attrsOf(svg, 'pl-d')[0].width;
    assert.ok(cw >= Math.min(...fs) * 1.4, `${n}: 칸 ${cw} · 글자 ${Math.min(...fs)}`);
    assert.ok(+/viewBox="0 0 (\d+)/.exec(svg)[1] <= 400, n);
  }
});
