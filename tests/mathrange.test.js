// 🔢 L 수의 범위와 어림하기 줄기 생성기 테스트: node --test tests/mathrange.test.js
//
// ★ 핵심은 **독립 검산** — 생성기가 알려 주는 값(probe)을 믿지 않고 **문제 글을 이 파일이 직접 읽어** 다시 푼다.
//   어림(올림·버림·반올림)은 이 파일에서 BigInt 자릿수 셈으로 새로 짠다 (생성기의 Number 셈을 쓰면 검산이 아니다).
// ★ 이름표는 값만이 아니라 **방향**까지 — 경계를 넣었나 뺐나, 위 자리인가 아래 자리인가.
// ★ 씨앗은 개념마다 수백 개 (RNG_SEEDS=20000으로 넓게).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  RANGE, TAGS, makeQuestion, makeRound, conceptById, ladder, placeFrom, diagnosticSet, lessonOf, checkContent, gradeLabel, valueOf,
} from '../js/mathrange.js';
import { figureSvg, figText, renderFigures } from '../js/mathdraw.js';
import { tplKey } from '../js/mathgen.js';
import { padSpec } from '../js/mathpad.js';

const OPTS = { names: ['피카츄', '리자몽', '개굴닌자'], me: '진우', worlds: { pokemon: [], toystory: [], minions: [], moana: [] } };
const SEEDS = Number(process.env.RNG_SEEDS) || 600;
const IDS = RANGE.map((c) => c.id);

// ───────────────────── 독립 계산기 ─────────────────────

const holdsT = (x, a, w) => ({ 이상: x >= a, 이하: x <= a, 초과: x > a, 미만: x < a }[w]);
const FLIP_E = { 이상: '초과', 초과: '이상', 이하: '미만', 미만: '이하' };
const FLIP_D = { 이상: '이하', 이하: '이상', 초과: '미만', 미만: '초과' };
const incl = (w) => w === '이상' || w === '이하';
const nums = (t) => (String(t).match(/\d+(?:\.\d+)?/g) || []).map(Number);
const boldList = (q) => { const m = /\*\*([\d, ]+)\*\*/.exec(q); return m ? m[1].split(', ').map(Number) : null; };

/** 범위 글 읽기 — "10 이상 15 미만" · "130 cm 이상" · "9번 초과 22번 미만" */
function readRange(t) {
  let m = /(\d+)(?:번| ?cm| ?kg| ?g|살)? (이상|초과) (\d+)(?:번| ?cm| ?kg| ?g|살)? (이하|미만)/.exec(t);
  if (m) return { a: +m[1], wa: m[2], b: +m[3], wb: m[4] };
  m = /(\d+)(?:번| ?cm| ?kg| ?g|살)? (이상|이하|초과|미만)/.exec(t);
  return m ? { a: +m[1], wa: m[2] } : null;
}
const inR = (x, R) => holdsT(x, R.a, R.wa) && (R.b === undefined || holdsT(x, R.b, R.wb));
const phrase = (R) => (R.b === undefined ? `${R.a} ${R.wa}` : `${R.a} ${R.wa} ${R.b} ${R.wb}`);

// 어림 — 0.001 단위 BigInt
const PL = { 만: 10000000n, 천: 1000000n, 백: 100000n, 십: 10000n, 일: 1000n, '소수 첫째': 100n, '소수 둘째': 10n };
const ABOVE = { '소수 둘째': '소수 첫째', '소수 첫째': '일', 일: '십', 십: '백', 백: '천', 천: '만' };
const BELOW = { 만: '천', 천: '백', 백: '십', 십: '일', 일: '소수 첫째', '소수 첫째': '소수 둘째' };
function toMilli(s) { const [i, f = ''] = String(s).split('.'); return BigInt(i) * 1000n + BigInt((f + '000').slice(0, 3)); }
function fromMilli(v) { const i = v / 1000n; const f = v % 1000n; return f === 0n ? String(i) : `${i}.${String(f).padStart(3, '0').replace(/0+$/, '')}`; }
function aim(s, mode, place) {
  const v = toMilli(s); const u = PL[place]; const q = v / u;
  if (mode === '올림') return fromMilli(v % u ? (q + 1n) * u : v);
  if (mode === '버림') return fromMilli(q * u);
  const d = u >= 10n ? (v / (u / 10n)) % 10n : 0n;
  return fromMilli(d >= 5n ? (q + 1n) * u : q * u);
}
const nextDigit = (s, place) => { const u = PL[place]; return Number((toMilli(s) / (u / 10n)) % 10n); };
const readPlace = (t) => { const m = /(만|천|백|십|일)의 자리까지|소수 (첫째|둘째) 자리까지/.exec(t); return m ? (m[1] || `소수 ${m[2]}`) : null; };

/** 표 읽기 — "· 이름: A kg 초과 B kg 이하" / "· A g 이하: P원" / "· a살 이상 b살 미만: 어린이 요금" */
function readTable(q) {
  return q.split('\n').filter((l) => l.startsWith('· ')).map((l) => {
    const s = l.slice(2);
    let m = /^([^:]+): (.+)$/.exec(s);
    if (m && /\d/.test(m[2]) && !/원$/.test(m[2])) return { name: m[1], R: readRange(m[2]) };
    m = /^(.+): (\d+)원$/.exec(s);
    if (m) return { name: m[2], R: readRange(m[1]) };
    m = /^(.+): (.+)$/.exec(s);
    return { name: m[2], R: readRange(m[1]) };
  });
}

/** ① 문제 글을 직접 읽어 정답 글자를 낸다 */
function solveText(q) {
  let m;
  const L = (a) => a.join(', ');
  // 표 (체급·우편·나이)
  if (/체급표/.test(q)) { const T = readTable(q); const x = +/몸무게는 (\d+) kg/.exec(q)[1]; return T.filter((t) => inR(x, t.R)).map((t) => t.name).join('|'); }
  if (/우편 요금표/.test(q)) { const T = readTable(q); const x = +/무게가 (\d+) g인/.exec(q)[1]; return T.filter((t) => inR(x, t.R)).map((t) => t.name).join('|'); }
  if (/입장 요금표/.test(q)) { const T = readTable(q); const x = +/(\d+)살이에요/.exec(q)[1]; return T.filter((t) => inR(x, t.R)).map((t) => t.name).join('|'); }
  // 수직선 읽기
  if ((m = /\[range (\d+)\.\.(\d+)(?:x\d+)? ([^\]]+)\]/.exec(q)) && /바르게 말한 것/.test(q)) {
    const marks = m[3].trim().split(/\s+/).map((t) => { const z = /^(<?)(\d+)([●○])(>?)$/.exec(t); return { v: +z[2], c: z[3] === '●', dir: z[1] ? '<' : z[4] ? '>' : '' }; });
    if (marks.length === 2) return `${marks[0].v} ${marks[0].c ? '이상' : '초과'} ${marks[1].v} ${marks[1].c ? '이하' : '미만'}`;
    const k = marks[0];
    return `${k.v} ${k.dir === '>' ? (k.c ? '이상' : '초과') : (k.c ? '이하' : '미만')}`;
  }
  // 점 찍기
  if (/어떤 점을 찍어야/.test(q)) { const R = readRange(q); return `${R.a}에 ${incl(R.wa) ? '●' : '○'}, ${R.b}에 ${incl(R.wb) ? '●' : '○'}`; }
  // 거꾸로 반올림
  if ((m = /반올림하여 (.+?까지) 나타내면 (\d+)[이가] 되는 자연수 중에서 가장 (작은|큰) 수/.exec(q))) {
    const p = readPlace(m[1]); const R = m[2];
    const hits = []; for (let x = 1; x <= 20000; x++) if (aim(String(x), '반올림', p) === R) hits.push(x);
    return String(m[3] === '작은' ? hits[0] : hits[hits.length - 1]);
  }
  if ((m = /반올림하여 (.+?까지) 나타내면 (\d+)[이가] 되는 수의 범위/.exec(q))) {
    const p = readPlace(m[1]); const R = +m[2]; const u = Number(PL[p] / 1000n);
    // 경계 두 곳을 반 칸 단위로 시험: R − u/2 는 들어가고(5부터 올림) R + u/2 는 안 들어간다
    const lo = R - u / 2; const hi = R + u / 2;
    assert.equal(aim(String(lo), '반올림', p), String(R));
    assert.notEqual(aim(String(hi), '반올림', p), String(R));
    assert.equal(aim(String(hi - 0.001).replace(/(\.\d{3})\d+$/, '$1'), '반올림', p), String(R));
    return `${lo} 이상 ${hi} 미만`;
  }
  // 어림 방법 고르기
  if (/어떤 어림 방법이 알맞을까요/.test(q)) {
    if (/버스를 빌려요/.test(q) || /지폐로만 내요/.test(q)) return '올림';
    if (/봉지 수를 세려면/.test(q) || /지폐로 바꿔요\. 바꿀 수 있는 돈/.test(q)) return '버림';
    if (/가장 가깝게 말하려면/.test(q)) return '반올림';
    throw new Error(`못 읽는 상황: ${q}`);
  }
  // 버스·보트(모두 타야) · 사탕 봉지·지폐 장수(다 찬 것만)
  if ((m = /(?:버스 한 대|보트 한 척)에 (\d+)명씩 탈 수 있어요\. (?:학생 )?(\d+)명이 모두 타려면/.exec(q))) { const k = +m[1]; const n = +m[2]; return String(Math.ceil(n / k)); }
  if ((m = /사탕 (\d+)개를 한 봉지에 10개씩 담아 팔려고/.exec(q))) return String(Math.floor(+m[1] / 10));
  if ((m = /동전 (\d+)원을 1000원짜리 지폐로 바꾸려고 해요\. 지폐는 최대 몇 장/.exec(q))) return String(Math.floor(+m[1] / 1000));
  // 생활 속 어림
  if ((m = /물건값 (\d+)원을 1000원짜리 지폐로만 내려고/.exec(q))) return aim(m[1], '올림', '천');
  if ((m = /과자값 (\d+)원을 100원짜리 동전으로만 내려고/.exec(q))) return aim(m[1], '올림', '백');
  if ((m = /동전 (\d+)원을 1000원짜리 지폐로 바꾸려고 해요\. 지폐로 바꿀 수 있는 돈은 최대 얼마/.exec(q))) return aim(m[1], '버림', '천');
  if ((m = /귤 (\d+)개를 한 상자에 10개씩 담아 팔려고/.exec(q))) return aim(m[1], '버림', '십');
  if ((m = /관객은 (\d+)명이에요\. 관객 수를 반올림하여 (.+?까지)/.exec(q))) return aim(m[1], '반올림', readPlace(m[2]));
  // 어림 (글 그대로)
  if ((m = /^(\d+(?:\.\d+)?)[을를] (올림|버림|반올림)하여 (.+?까지) 나타내면/.exec(q))) return aim(m[1], m[2], readPlace(m[3]));
  // 범위에 드는 자연수 · 번호표
  if (/자연수는 모두 몇 개/.test(q) || /번호표가/.test(q)) {
    const R = readRange(q); let n = 0;
    for (let x = 1; x <= 1000; x++) if (inR(x, R)) n++;
    return String(n);
  }
  if ((m = /인 자연수 중에서 가장 (작은|큰) 수/.exec(q))) {
    const R = readRange(q); const hits = [];
    for (let x = 1; x <= 1000; x++) if (inR(x, R)) hits.push(x);
    return String(m[1] === '작은' ? hits[0] : hits[hits.length - 1]);
  }
  // 목록에서 고르기·세기
  const S = boldList(q);
  if (S && /모두 고르면/.test(q)) return L(S.filter((x) => inR(x, readRange(q))));
  if (S && /모두 몇 개/.test(q)) return String(S.filter((x) => inR(x, readRange(q))).length);
  // 기호 ㉠~㉣로 고르기 (놀이기구·놀이방·택배·수영장)
  const items = [...q.matchAll(/([㉠-㉣]) (\d+) ?(?:cm|kg|살)/g)].map((z) => ({ k: z[1], v: +z[2] }));
  if (items.length) { const R = readRange(q.split('\n')[0]); return L(items.filter((it) => inR(it.v, R)).map((it) => it.k)); }
  throw new Error(`못 읽는 문제: ${q}`);
}

/** 문항 하나씩 — 개념·씨앗·얼굴 */
function* every(kinds = ['calc', 'misread'], n = SEEDS) {
  for (const c of RANGE) for (const k of kinds) for (let s = 1; s <= n; s++) yield { c, k, s, q: makeQuestion(c.id, k, s, OPTS) };
}
const allText = (q) => [q.q, ...q.choices.map((x) => x.text), ...(q.solve ? [...q.solve.steps, ...Object.values(q.solve.why), q.solve.whyAny, q.solve.rule] : [])].join('\n');

// ───────────────────── 테스트 ─────────────────────

test('독립 계산기 자체 점검 (어림·범위 읽기)', () => {
  assert.equal(aim('243', '올림', '십'), '250');
  assert.equal(aim('240', '올림', '십'), '240');
  assert.equal(aim('247', '버림', '십'), '240');
  assert.equal(aim('245', '반올림', '십'), '250');
  assert.equal(aim('2449', '반올림', '백'), '2400');
  assert.equal(aim('3.47', '올림', '소수 첫째'), '3.5');
  assert.equal(aim('3.425', '올림', '소수 둘째'), '3.43');
  assert.equal(aim('1.45', '반올림', '일'), '1');
  assert.equal(aim('4370', '올림', '만'), '10000');
  assert.deepEqual(readRange('10 이상 15 미만인 수'), { a: 10, wa: '이상', b: 15, wb: '미만' });
  assert.deepEqual(readRange('키가 130 cm 이상인'), { a: 130, wa: '이상' });
  assert.deepEqual(readRange('9번 초과 22번 미만인'), { a: 9, wa: '초과', b: 22, wb: '미만' });
});

test('사다리: 9칸, 모두 초5, needs가 바로 앞 칸 · 학년 표시', () => {
  assert.equal(RANGE.length, 9);
  assert.deepEqual(IDS, ['rng.above', 'rng.over', 'rng.line', 'rng.count', 'rng.table', 'rng.up', 'rng.down', 'rng.round', 'rng.apply']);
  RANGE.forEach((c, i) => {
    assert.equal(c.grade, 5);
    assert.deepEqual(c.needs, i ? [IDS[i - 1]] : []);
    assert.ok(c.idea && c.rule && c.slip && c.name, c.id);
  });
  assert.equal(gradeLabel(5), '초5');
  assert.equal(conceptById('rng.round').name, '반올림');
});

test('★ 독립 검산: ① 정답이 문제 글을 따로 읽어 푼 답과 같다 · 딱 하나만 맞다 · 오답은 그 답이 아니다', () => {
  let n = 0;
  for (const { c, s, q } of every(['calc'])) {
    const want = solveText(q.q);
    const oks = q.choices.filter((x) => x.ok);
    assert.equal(oks.length, 1, `${c.id} #${s}`);
    // 표는 이름이 하나여야 (경계 수가 두 칸에 들면 표가 틀렸다)
    assert.ok(!want.includes('|'), `${c.id} #${s}: 표에서 두 칸에 든다 — ${want}\n${q.q}`);
    assert.equal(oks[0].text, want, `${c.id} #${s}\n${q.q}`);
    for (const w of q.choices.filter((x) => !x.ok)) assert.notEqual(w.text, want, `${c.id} #${s}: 오답이 정답과 같다`);
    n++;
  }
  assert.ok(n >= 9 * SEEDS);
});

test('★ 보기: 정답 하나, 글자·값 겹침 없음, 빈 글자·undefined·NaN·남은 자리표시 없음 · 목록 보기는 비지 않음', () => {
  for (const { c, k, s, q } of every()) {
    const texts = q.choices.map((x) => String(x.text));
    assert.equal(new Set(texts).size, texts.length, `${c.id} ${k} #${s}: 같은 보기 ${texts}`);
    const vals = texts.map(valueOf).filter((v) => v !== null);
    assert.equal(new Set(vals).size, vals.length, `${c.id} ${k} #${s}: 값이 같은 보기 ${texts}`);
    assert.ok(q.choices.length >= 3, `${c.id} ${k} #${s}: 보기가 ${q.choices.length}개`);
    const all = allText(q);
    assert.ok(!/undefined|NaN|null|\{(?!mon|me)/.test(all), `${c.id} ${k} #${s}: ${all}`);
    for (const t of texts) assert.ok(t.trim() && !/^[, ]+$/.test(t) && !/, ,|^, |, $/.test(t), `${c.id} #${s}: 빈 목록 보기 "${t}"`);
  }
});

test('★ 오개념 이름표: 그 오답이 정말 그 실수다 — 경계·방향·자리까지', () => {
  const L = (a) => a.join(', ');
  let checked = 0;
  for (const { c, s, q } of every(['calc'])) {
    const t = q.q;
    for (const w of q.choices.filter((x) => !x.ok && x.tag && x.tag !== '계산 실수')) {
      const tag = w.tag;
      const S = boldList(t);
      const R = readRange(t);
      const ok = (cond, msg = '') => { assert.ok(cond, `${c.id} #${s} [${tag}] "${w.text}" ${msg}\n${t}`); checked++; };
      // 목록·기호 고르기 (한쪽·두 쪽 범위)
      const items = [...t.matchAll(/([㉠-㉣]) (\d+) ?(?:cm|kg|살)/g)].map((z) => ({ k: z[1], v: +z[2] }));
      if ((S && /모두 고르면/.test(t)) || (items.length && !/체급|요금표/.test(t))) {
        const pickW = (Rx) => (S ? L(S.filter((x) => inR(x, Rx))) : L(items.filter((it) => inR(it.v, readRange(t.split('\n')[0]) && Rx)).map((it) => it.k)));
        const R0 = S ? R : readRange(t.split('\n')[0]);
        const sel = (Rx) => (S ? L(S.filter((x) => inR(x, Rx))) : L(items.filter((it) => inR(it.v, Rx)).map((it) => it.k)));
        void pickW;
        if (R0.b === undefined) {
          if (tag === TAGS.edgeOut) ok(incl(R0.wa) && w.text === sel({ ...R0, wa: FLIP_E[R0.wa] }));
          else if (tag === TAGS.edgeIn) ok(!incl(R0.wa) && w.text === sel({ ...R0, wa: FLIP_E[R0.wa] }));
          else if (tag === TAGS.dirSwap) ok(w.text === sel({ ...R0, wa: FLIP_D[R0.wa] }));
          else if (tag === TAGS.dirEdge) ok(w.text === sel({ ...R0, wa: FLIP_D[FLIP_E[R0.wa]] }));
          else ok(false, '모르는 이름표');
        } else {
          const lowF = sel({ ...R0, wa: FLIP_E[R0.wa] }); const highF = sel({ ...R0, wb: FLIP_E[R0.wb] });
          if (tag === TAGS.edgeBoth) ok(w.text === sel({ ...R0, wa: FLIP_E[R0.wa], wb: FLIP_E[R0.wb] }));
          else if (tag === TAGS.edgeOut || tag === TAGS.edgeIn) {
            const side = w.text === lowF ? R0.wa : w.text === highF ? R0.wb : null;
            ok(side && (tag === TAGS.edgeOut) === incl(side), `(어느 쪽 경계인가: ${side})`);
          } else ok(false, '모르는 이름표');
        }
        continue;
      }
      // 목록 세기
      if (S && /모두 몇 개/.test(t)) {
        const cnt = (Rx) => String(S.filter((x) => inR(x, Rx)).length);
        if (tag === TAGS.edgeOut || tag === TAGS.edgeIn) ok((tag === TAGS.edgeOut) === incl(R.wa) && w.text === cnt({ ...R, wa: FLIP_E[R.wa] }));
        else if (tag === TAGS.dirSwap) ok(w.text === cnt({ ...R, wa: FLIP_D[R.wa] }));
        else ok(false, '모르는 이름표');
        continue;
      }
      // 수직선 읽기
      if (/\[range/.test(t) && /바르게 말한 것/.test(t)) {
        const right = solveText(t); const Rw = readRange(w.text); const Rr = readRange(right);
        if (tag === TAGS.dotSwap) ok(Rw.a === Rr.a && Rw.b === Rr.b && (Rw.wa !== Rr.wa || Rw.wb !== Rr.wb) && (Rw.wa === Rr.wa || Rw.wa === FLIP_E[Rr.wa]) && (Rw.wb === Rr.wb || Rw.wb === FLIP_E[Rr.wb]));
        else if (tag === TAGS.dirSwap) ok(Rw.wa === FLIP_D[Rr.wa]);
        else if (tag === TAGS.dirEdge) ok(Rw.wa === FLIP_D[FLIP_E[Rr.wa]]);
        else ok(false, '모르는 이름표');
        continue;
      }
      if (/어떤 점을 찍어야/.test(t)) { ok(tag === TAGS.dotSwap && w.text !== solveText(t)); continue; }
      // 범위에 드는 자연수 세기 · 번호표
      if (/자연수는 모두 몇 개/.test(t) || /번호표가/.test(t)) {
        const v = +w.text;
        if (tag === TAGS.bothIn) ok(v === R.b - R.a + 1);
        else if (tag === TAGS.bothOut) ok(v === R.b - R.a - 1);
        else if (tag === TAGS.subOnly) ok(v === R.b - R.a);
        else ok(false, '모르는 이름표');
        continue;
      }
      if (/인 자연수 중에서 가장 (작은|큰) 수/.test(t) && !/반올림/.test(t)) {
        const big = /가장 큰/.test(t);
        const word = R.b === undefined ? R.wa : big ? R.wb : R.wa;
        const Rf = R.b === undefined ? { ...R, wa: FLIP_E[R.wa] } : big ? { ...R, wb: FLIP_E[R.wb] } : { ...R, wa: FLIP_E[R.wa] };
        const hits = []; for (let x = 1; x <= 1000; x++) if (inR(x, Rf)) hits.push(x);
        ok((tag === TAGS.edgeOut) === incl(word) && [TAGS.edgeOut, TAGS.edgeIn].includes(tag) && +w.text === (big ? hits[hits.length - 1] : hits[0]));
        continue;
      }
      // 표
      if (/체급표|우편 요금표|입장 요금표/.test(t)) {
        const T = readTable(t);
        const x = +(/몸무게는 (\d+) kg/.exec(t) || /무게가 (\d+) g인/.exec(t) || /(\d+)살이에요/.exec(t))[1];
        if (tag === TAGS.edgeIn) {
          // 초과·미만을 이상·이하로 읽으면 그 칸에도 든다
          const L0 = (w) => (w === '초과' ? '이상' : w === '미만' ? '이하' : w);
          const loose = T.filter((r0) => inR(x, { a: r0.R.a, wa: L0(r0.R.wa), b: r0.R.b, wb: L0(r0.R.wb) }) && !inR(x, r0.R));
          ok(loose.some((r0) => r0.name === w.text), `(느슨하게 읽으면 드는 칸: ${loose.map((z) => z.name)})`);
        } else ok(tag === TAGS.misTable && T.some((r0) => r0.name === w.text && !inR(x, r0.R)));
        continue;
      }
      // 거꾸로 반올림
      let m;
      if ((m = /반올림하여 (.+?까지) 나타내면 (\d+)[이가] 되는 자연수 중에서 가장 (작은|큰) 수/.exec(t))) {
        const R0 = +m[2]; const u = Number(PL[readPlace(m[1])] / 1000n); const small = m[3] === '작은'; const v = +w.text;
        if (tag === TAGS.revSame) ok(v === R0);
        else if (tag === TAGS.revMode) ok(v === (small ? R0 - u + 1 : R0 + u - 1));
        else if (tag === TAGS.edgeOut) ok(small && v === R0 - u / 2 + 1);
        else if (tag === TAGS.edgeIn) ok(!small && v === R0 + u / 2 && aim(String(v), '반올림', readPlace(m[1])) !== String(R0));
        else ok(false, '모르는 이름표');
        continue;
      }
      if ((m = /반올림하여 (.+?까지) 나타내면 (\d+)[이가] 되는 수의 범위/.exec(t))) {
        const R0 = +m[2]; const u = Number(PL[readPlace(m[1])] / 1000n); const Rw = readRange(w.text);
        if (tag === TAGS.edgeIn) ok(Rw.wa === '이상' && Rw.wb === '이하' && Rw.a === R0 - u / 2 && Rw.b === R0 + u / 2);
        else if (tag === TAGS.edgeOut) ok(Rw.wa === '초과' && Rw.wb === '미만' && Rw.a === R0 - u / 2);
        else if (tag === TAGS.revMode) ok(Rw.a === R0 && Rw.b === R0 + u && Rw.wa === '이상' && Rw.wb === '미만');
        else ok(false, '모르는 이름표');
        continue;
      }
      if (/어떤 어림 방법이 알맞을까요/.test(t)) {
        const right = solveText(t);
        if (tag === TAGS.useDown) ok(right === '올림' && w.text === '버림');
        else if (tag === TAGS.useUp) ok(right === '버림' && w.text === '올림');
        else ok(tag === TAGS.wrongMethod && (w.text === '반올림' || right === '반올림'));
        continue;
      }
      if (/모두 타려면/.test(t)) { const k = +/(\d+)명씩/.exec(t)[1]; const N = +/(\d+)명이 모두/.exec(t)[1]; ok(tag === TAGS.useDown && +w.text === Math.floor(N / k)); continue; }
      if (/봉지는 최대|지폐는 최대 몇 장/.test(t)) { const N = nums(t)[0]; const k = /봉지/.test(t) ? 10 : 1000; ok(tag === TAGS.useUp && +w.text === Math.ceil(N / k)); continue; }
      // 어림 — 원래 수·방법·자리
      let src; let mode; let place;
      if ((m = /^(\d+(?:\.\d+)?)[을를] (올림|버림|반올림)하여 (.+?까지)/.exec(t))) [src, mode, place] = [m[1], m[2], readPlace(m[3])];
      else if ((m = /물건값 (\d+)원을 1000원짜리 지폐로만/.exec(t))) [src, mode, place] = [m[1], '올림', '천'];
      else if ((m = /과자값 (\d+)원을 100원짜리/.exec(t))) [src, mode, place] = [m[1], '올림', '백'];
      else if ((m = /동전 (\d+)원을 1000원짜리 지폐로 바꾸려고 해요\. 지폐로 바꿀 수 있는 돈/.exec(t))) [src, mode, place] = [m[1], '버림', '천'];
      else if ((m = /귤 (\d+)개를/.exec(t))) [src, mode, place] = [m[1], '버림', '십'];
      else if ((m = /관객은 (\d+)명이에요\. 관객 수를 반올림하여 (.+?까지)/.exec(t))) [src, mode, place] = [m[1], '반올림', readPlace(m[2])];
      if (src) {
        const nd = nextDigit(src, place);
        if (tag === TAGS.downForUp) ok(mode === '올림' && w.text === aim(src, '버림', place));
        else if (tag === TAGS.upForDown) ok(mode === '버림' && w.text === aim(src, '올림', place));
        else if (tag === TAGS.wrongPlace) ok(w.text === aim(src, mode, ABOVE[place]));
        else if (tag === TAGS.lowPlace) ok(w.text === aim(src, mode, BELOW[place]));
        else if (tag === TAGS.noZero) ok(mode === '올림' && w.text === fromMilli(toMilli(src) + PL[place]));
        else if (tag === TAGS.dropDigits) ok(mode === '버림' && w.text === String(toMilli(src) / PL[place]));
        else if (tag === TAGS.roundUpWrong) ok(mode === '반올림' && nd <= 4 && w.text === aim(src, '올림', place));
        else if (tag === TAGS.roundDownWrong) ok(mode === '반올림' && nd >= 6 && w.text === aim(src, '버림', place));
        else if (tag === TAGS.fiveDown) ok(mode === '반올림' && nd === 5 && w.text === aim(src, '버림', place));
        else if (tag === TAGS.doubleRound) ok(mode === '반올림' && w.text === aim(aim(src, '반올림', BELOW[place]), '반올림', place));
        else ok(false, '모르는 이름표');
        continue;
      }
      ok(false, '못 읽는 문항');
    }
  }
  assert.ok(checked > 9 * SEEDS, `확인한 오답 ${checked}`);
});

test('★ ② 오개념 문항: 보여 준 것은 정말 틀렸다 · 고치는 말만 맞다 · 갈래 열쇠', () => {
  const branches = {};
  for (const { c, s, q } of every(['misread'])) {
    assert.match(q.key, /^misread:[a-z]+$/, `${c.id} #${s}`);
    (branches[c.id] ||= new Set()).add(q.key);
    const t = q.q;
    const ok = q.choices.find((x) => x.ok).text;
    const bad = q.choices.filter((x) => !x.ok);
    const said = (/\*\*(.+?)\*\*/s.exec(t) || [])[1] || '';
    const at = (cond, msg) => assert.ok(cond, `${c.id} #${s} ${msg}\n${t}\n✔ ${ok}`);
    at(bad.some((x) => x.tag === '틀린 줄 모름'), '"맞게 말했어요" 보기');
    let m;
    if ((m = /^(\d+) (이상|이하|초과|미만)인 수에 \d+[은는도] (들어가지 않아요|들어가요)$/.exec(said))) {
      const N = +m[1]; const truth = holdsT(N, N, m[2]);
      at((m[3] === '들어가요') !== truth, '보여 준 말이 참이다');
      at(ok.includes(truth ? `${N}도 들어가요` : '안 들어가요'), '고치는 말');
    } else if ((m = /^(\d+) (이상|이하)인 수는 (\d+), (\d+), (\d+), …이에요$/.exec(said))) {
      const N = +m[1]; const seq = [m[3], m[4], m[5]].map(Number);
      at(!seq.every((x) => holdsT(x, N, m[2])), '보여 준 목록이 다 맞다');
      const okSeq = nums(ok.split('—')[1]);
      at(okSeq.every((x) => holdsT(x, N, m[2])) && okSeq[0] === N, '고친 목록');
      for (const b of bad.filter((x) => x.tag === TAGS.edgeOut)) at(!nums(b.text.split('—')[1]).includes(N) && nums(b.text.split('—')[1]).every((x) => holdsT(x, N, m[2])), '경계 수를 뺀 목록(방향은 맞게)');
    } else if ((m = /^"(\d+) 이하"와 "\d+ 미만"은 같은 말이에요$/.exec(said))) {
      at(/^달라요/.test(ok), '같은 말이 아니다');
    } else if ((m = /^이 수직선은 (.+?)(이에요|예요)$/.exec(said))) {
      const right = solveText(`바르게 말한 것 ${(/\[range [^\]]+\]/.exec(t) || [''])[0]}`);
      at(m[1] !== right && ok.endsWith(right), `수직선 읽기 (${right})`);
      for (const b of bad.filter((x) => x.tag === TAGS.dotSwap)) at(!b.text.endsWith(right), '바꿔 읽기 보기가 맞는 말이다');
    } else if (/수직선에 이렇게 나타냈어요/.test(t)) {
      const R = readRange(/"([^"]+)"/.exec(t)[1]);
      const drawn = /\[range \d+\.\.\d+ (\d+)([●○]) (\d+)([●○])\]/.exec(t);
      at((drawn[2] === '●') !== incl(R.wa) && (drawn[4] === '●') === incl(R.wb), '틀린 그림은 왼쪽 점만 틀렸다');
      at(ok.includes(`${R.a}`) && ok.includes(incl(R.wa) ? '●' : '○'), '고치는 말');
    } else if ((m = /^(\d+) (이상|초과) (\d+) (이하|미만)인 자연수는 .*?(\d+)개예요$/.exec(said))) {
      const R = { a: +m[1], wa: m[2], b: +m[3], wb: m[4] };
      let n = 0; for (let x = 1; x <= 1000; x++) if (inR(x, R)) n++;
      at(+m[5] !== n && ok.endsWith(`${n}개`), `세기 (${n})`);
      for (const b of bad.filter((x) => x.tag !== '틀린 줄 모름' && x.tag !== '엉뚱한 지적')) at(!b.text.endsWith(`${n}개`), '오답이 맞는 개수');
    } else if ((m = /^몸무게 (\d+) kg은 "(\d+) kg 초과/.exec(said))) {
      at(m[1] === m[2] && /플라이급/.test(ok) && ok.includes(`${m[1]} kg 이하`), '체급');
    } else if ((m = /(\d+)살 이상: 어른 요금"이면 (\d+)살은 어린이 요금도/.exec(said))) {
      at(m[1] === m[2] && /어른 요금만/.test(ok), '나이 요금');
    } else if ((m = /^(\d+(?:\.\d+)?)[을를] (올림|버림|반올림)하여 (.+?까지) 나타내면 (?:5는 버리니까 )?(.+?)(이에요|예요)$/.exec(said))) {
      const right = aim(m[1], m[2], readPlace(m[3]));
      const shown = nums(m[4]).pop();
      at(String(shown) !== right && ok.endsWith(right), `어림 (${right})`);
      for (const b of bad) at(!b.text.endsWith(` ${right}`) && !b.text.endsWith(`— ${right}`), `오답 보기가 맞는 값 ${right}`);
    } else if ((m = /학생 (\d+)명이 (\d+)명씩 타는 버스를 타요\. 버스 (\d+)대에/.exec(said))) {
      const need = Math.ceil(+m[1] / +m[2]);
      at(+m[3] !== need && ok.endsWith(`${need}대`), '버스');
      at(Math.round(+m[1] / +m[2]) === +m[3], '반올림 보기가 정말 그 값 (그래서 틀린 말)');
    } else if ((m = /사탕 (\d+)개를 10개씩 봉지에 담으면 올림해서 (\d+)봉지/.exec(said))) {
      const can = Math.floor(+m[1] / 10);
      at(+m[2] !== can && ok.endsWith(`${can}봉지`), '봉지');
      at(Math.round(+m[1] / 10) === +m[2], '반올림 보기가 정말 그 값');
    } else at(false, '못 읽는 ②');
  }
  for (const id of IDS) assert.equal(branches[id].size, 2, `${id}: 갈래 둘`);
});

test('★ 조사: 수·범위 말·단위 뒤 (250을·245를·36으로·27로·이상은·이하는·cm는·kg은)', () => {
  const BAT = new Set(['0', '1', '3', '6', '7', '8']);
  const PAIRS = [['을', '를'], ['은', '는'], ['이', '가'], ['과', '와'], ['이에요', '예요'], ['이라서', '라서']];
  for (const { c, k, s, q } of every()) {
    const all = allText(q);
    for (const [wb, nb] of PAIRS) {
      for (const m of all.matchAll(new RegExp(`(\\d)(${wb}|${nb})(?=[\\s.,!?)—]|$)`, 'g'))) {
        const has = BAT.has(m[1]);
        assert.equal(m[2], has ? wb : nb, `${c.id} ${k} #${s}: "…${m[1]}${m[2]}"\n${all}`);
      }
    }
    for (const m of all.matchAll(/(\d)(으로|로)(?=[\s.,]|$)/g)) {
      const want = ['1', '7', '8'].includes(m[1]) ? '로' : BAT.has(m[1]) ? '으로' : '로';
      assert.equal(m[2], want, `${c.id} ${k} #${s}: "…${m[1]}${m[2]}"`);
    }
    for (const m of all.matchAll(/(이상|미만|이하|초과)(은|는|이에요|예요|을|를)(?=[\s.,]|$)/g)) {
      const has = m[1] === '이상' || m[1] === '미만';
      const ok = { 은: has, 는: !has, 이에요: has, 예요: !has, 을: has, 를: !has }[m[2]];
      assert.ok(ok, `${c.id} ${k} #${s}: "${m[0]}"`);
    }
    assert.ok(!/cm(은|을|이 |과)|kg(는|를|가 |와)|\d g(는|를|가 |와)|살(는|를|가 |와)/.test(all), `${c.id} ${k} #${s}: 단위 뒤 조사\n${all}`);
  }
});

test('★ 풀이 카드: 단계 2줄↑ · 기억할 것 · 오답마다 왜 · 정답이 단계에 나온다', () => {
  for (const { c, k, s, q } of every()) {
    const sv = q.solve;
    assert.ok(sv && sv.steps.length >= 2 && sv.rule, `${c.id} ${k} #${s}`);
    for (const w of q.choices.filter((x) => !x.ok)) assert.ok(sv.why[w.tag] || sv.whyAny, `${c.id} ${k} #${s}: "${w.tag}" 설명 없음`);
    if (k === 'calc') {
      const ok = q.choices.find((x) => x.ok).text;
      assert.ok(sv.steps.join(' ').includes(ok), `${c.id} #${s}: 정답 "${ok}"이 풀이에 없다\n${sv.steps.join('\n')}`);
    }
  }
});

test('★ 글 속 셈식은 맞다 (곱셈 먼저) — 문제·보기·풀이 전부', () => {
  const ev = (expr) => Function(`return (${expr.replace(/×/g, '*').replace(/−/g, '-')})`)();
  for (const { c, k, s, q } of every()) {
    const all = allText(q);
    for (const m of all.matchAll(/(?<![\d.□])(\d+(?:\.\d+)?(?: [+−×] \d+(?:\.\d+)?)+) = (\d+(?:\.\d+)?)/g)) {
      assert.ok(Math.abs(ev(m[1]) - Number(m[2])) < 1e-9, `${c.id} ${k} #${s}: ${m[0]}`);
    }
  }
});

test('🔁 쌍둥이·🤔 노트: 요청한 틀·갈래로 온다 · 쌍둥이 글이 원래 글과 같은 일은 드물다', () => {
  const same = {}; const tot = {};
  // 포켓몬 출연진만 — 이름과 그 뒤 조사를 지우고 틀 글을 견준다 (영상 세계 출연진·조사가 섞이면 글로는 못 견준다)
  const P = { names: OPTS.names, me: OPTS.me };
  const strip = (t) => tplKey(t.replace(/(피카츄|리자몽|개굴닌자)(이|가|은|는|을|를|과|와|의)?/g, ''));
  for (const c of RANGE) {
    for (let s = 1; s <= Math.min(SEEDS, 300); s++) {
      const q = makeQuestion(c.id, 'calc', s, P);
      assert.ok(q.key, `${c.id} #${s}: 열쇠 없음`);
      const tw = makeQuestion(c.id, 'calc', s + 99991, { ...P, want: { k: 'calc', key: q.key } });
      assert.equal(tw.key, q.key, `${c.id} #${s}: 쌍둥이가 다른 틀\n${q.q}\n---\n${tw.q}`);
      assert.equal(strip(tw.q), strip(q.q), `${c.id} #${s}: 틀 글이 다르다`);
      tot[q.key] = (tot[q.key] || 0) + 1;
      if (tw.q === q.q) same[q.key] = (same[q.key] || 0) + 1;
      const m = makeQuestion(c.id, 'misread', s, OPTS);
      const mt = makeQuestion(c.id, 'misread', s + 99991, { ...OPTS, want: { k: 'misread', key: m.key } });
      assert.equal(mt.key, m.key, `${c.id} #${s}: ② 갈래`);
    }
  }
  for (const key of Object.keys(tot)) assert.ok((same[key] || 0) / tot[key] <= 0.3, `쌍둥이 = 원래 글 ${same[key]}/${tot[key]}: ${key}`);
});

test('★ 아직 안 배운 말을 앞 칸에 쓰지 않는다 (문제·보기·풀이·이름표·idea)', () => {
  const FIRST = { 초과: 'rng.over', 미만: 'rng.over', 올림: 'rng.up', 어림: 'rng.up', 버림: 'rng.down', 반올림: 'rng.round' };
  const idx = (id) => IDS.indexOf(id);
  const banned = (id) => Object.entries(FIRST).filter(([, at]) => idx(at) > idx(id)).map(([w]) => w);
  for (const c of RANGE) {
    const words = banned(c.id);
    const own = `${c.name} ${c.idea} ${c.rule} ${c.slip}`;
    for (const w of words) assert.ok(!own.replace(/반올림/g, w === '올림' ? '' : '반올림').includes(w), `${c.id}: 설명에 "${w}"`);
  }
  for (const { c, k, s, q } of every()) {
    const all = allText(q) + ' ' + q.choices.map((x) => x.tag || '').join(' ');
    for (const w of banned(c.id)) {
      const hay = w === '올림' ? all.replace(/반올림/g, '') : all;
      assert.ok(!hay.includes(w), `${c.id} ${k} #${s}: 아직 안 배운 "${w}"\n${all}`);
    }
  }
});

test('🎨 [range] 수직선: 그린 SVG에서 점의 자리·●○·칠한 쪽을 다시 잰다 · 폰 폭 · 눈금 글자 겹침 없음 · 글로 바꾸기', () => {
  let n = 0;
  for (const { c, k, s, q } of every(['calc', 'misread'], 200)) {
    for (const d of q.q.match(/\[range [^\]]+\]/g) || []) {
      const spec = d.slice(1, -1);
      const svg = figureSvg(spec);
      assert.ok(svg, `${c.id} ${k} #${s}: 못 그리는 ${d}`);
      const W = +/viewBox="0 0 (\d+(?:\.\d+)?) /.exec(svg)[1];
      assert.ok(W <= 400, `${d}: 폭 ${W}`);
      // 눈금 글자 → 수와 x
      const ticks = [...svg.matchAll(/<text class="range-tick" x="([\d.]+)"[^>]*>(\d+)<\/text>/g)].map((m) => ({ x: +m[1], v: +m[2] }));
      for (let i = 1; i < ticks.length; i++) assert.ok(ticks[i].x - ticks[i - 1].x >= String(ticks[i].v).length * 6.6, `${d}: 눈금 글자 겹침`);
      const xOf = (v) => { const a = ticks[0]; const b = ticks[ticks.length - 1]; return a.x + ((v - a.v) / (b.v - a.v)) * (b.x - a.x); };
      const marks = [...spec.matchAll(/(<?)(\d+)([●○])(>?)/g)].map((m) => ({ v: +m[2], closed: m[3] === '●', dir: m[1] ? '<' : m[4] ? '>' : '' }));
      const dots = [...svg.matchAll(/<circle class="range-dot (closed|open)" data-v="(\d+)" cx="([\d.]+)"/g)].map((m) => ({ closed: m[1] === 'closed', v: +m[2], x: +m[3] }));
      assert.equal(dots.length, marks.length, d);
      marks.forEach((mk, i) => {
        assert.ok(Math.abs(dots[i].x - xOf(mk.v)) < 0.01, `${d}: ${mk.v}의 점 자리`);
        assert.equal(dots[i].closed, mk.closed, `${d}: ${mk.v}의 점 모양`);
      });
      const span = /class="range-span" x1="([\d.-]+)" y1="[\d.]+" x2="([\d.-]+)"/.exec(svg);
      const [x1, x2] = [+span[1], +span[2]];
      if (marks.length === 2) assert.ok(Math.abs(x1 - xOf(marks[0].v)) < 0.01 && Math.abs(x2 - xOf(marks[1].v)) < 0.01, `${d}: 칠한 범위`);
      else if (marks[0].dir === '>') assert.ok(Math.abs(x1 - xOf(marks[0].v)) < 0.01 && x2 > ticks[ticks.length - 1].x, `${d}: 오른쪽으로`);
      else assert.ok(Math.abs(x2 - xOf(marks[0].v)) < 0.01 && x1 < ticks[0].x, `${d}: 왼쪽으로`);
      const txt = figText(q.q.split('\n').find((l) => l.includes('[range')));
      assert.ok(!/\[range/.test(txt) && !/이상|이하|초과|미만/.test(txt), `${d}: 글로 바꾼 것 "${txt}"`);
      n++;
    }
  }
  assert.ok(n > 100, `그린 수직선 ${n}`);
  // ★ 앱이 글 속 그림을 그리는 자리(renderFigures — 문항·배움·답장)도 [range]를 안다 — 목록에 없으면 아이 화면에 "[range …]" 글자가 그대로 찍힌다
  //   (2단계 검수 페이지에서 그림이 0개로 나와 잡았다. 메모 stem-generator-pitfalls 18번: 그림을 그리는 모든 자리를 세라)
  const out = renderFigures('글 [range 10..20 13● 17○] 글');
  assert.ok(out.includes('range-fig') && !out.includes('[range'), 'renderFigures가 [range]를 그린다');
  const ask = readFileSync(new URL('../js/mathask.js', import.meta.url), 'utf8');
  const stats = readFileSync(new URL('../js/stats.js', import.meta.url), 'utf8');
  assert.ok(ask.includes('[range 10..20 13● 17○]') && stats.includes('[range 10..20 13● 17○]'), '❓ 복사문·📊 답장 안내에 [range] 예');
  // 말이 안 되는 지시문은 빈 글자
  for (const bad of ['range 10..12 11●>', 'range 10..40 15● 20○', 'range 10..20 25●>', 'range 10..20 13●', 'range 10..20 15○ 13●', 'range 10..20x3 13●>']) assert.equal(figureSvg(bad), '', bad);
});

test('🔢 숫자판: 수가 답인 ①만 숫자판 — 목록·말·범위가 답이면 보기 고르기 (여러 답이 맞는 문제가 숫자판으로 가지 않게)', () => {
  for (const { c, s, q } of every(['calc'], 200)) {
    const ok = q.choices.find((x) => x.ok).text;
    const numeric = /^\d+(\.\d+)?$/.test(ok);
    const spec = padSpec(q, 'range');
    assert.equal(!!spec, numeric, `${c.id} #${s}: 정답 "${ok}" 숫자판 ${!!spec}`);
  }
});

test('📏 진단·사다리·한 편·배움 예비·내용 검사', () => {
  const d = diagnosticSet(7, 5, OPTS);
  assert.equal(d.length, 5);
  assert.deepEqual(d.map((q) => q.concept), ['rng.above', 'rng.line', 'rng.table', 'rng.down', 'rng.apply']);
  assert.deepEqual(placeFrom(d.map((q, i) => ({ concept: q.concept, correct: i < 2 }))), { startId: 'rng.table', knownIds: ['rng.above', 'rng.over', 'rng.line', 'rng.count'] });
  const L0 = ladder([]);
  assert.equal(L0[0].state, 'now');
  assert.ok(L0.slice(1).every((r) => r.state === 'locked'));
  for (const c of RANGE) {
    const round = makeRound(c.id, 11, OPTS);
    assert.ok(round.length >= 2 && round.every((q) => q.concept === c.id), c.id);
    const les = lessonOf(c.id, 3, OPTS);
    assert.ok(les.pages.length >= 1 && les.title === c.name);
  }
  assert.ok(checkContent({}).length >= 9, '빈 원고는 칸마다 걸린다');
});

test('화면 연결 (3단계): STEMS.range는 이 생성기·원고를 쓰고, 앱 셸이 둘 다 들고 간다 (오프라인)', async () => {
  const { STEMS, stemOf } = await import('../js/mathprog.js');
  assert.equal(STEMS.range.code, 'L');
  assert.equal(STEMS.range.list, RANGE);
  assert.equal(STEMS.range.gen.makeQuestion, makeQuestion);
  assert.ok(IDS.every((id) => stemOf(id) === STEMS.range), '모든 칸이 L 줄기로 찾아진다');
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  for (const f of ['./js/mathrange.js', './coach/math/range.json']) assert.ok(sw.includes(`'${f}'`), `APP_SHELL에 ${f}`);
});

// ───────────────────── 2단계: 원고 coach/math/range.json ─────────────────────

const CONTENT = JSON.parse(readFileSync(new URL('../coach/math/range.json', import.meta.url), 'utf8'));
const CAST = { me: '진우', mon: '피카츄', mon2: '리자몽', recent: [], want: '', wantKind: '', key: '' };
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

test('원고(range.json)가 형식 검사를 통과한다 — 9칸 모두 배움 3장↑·확인 2개↑·아빠 카드 (함정·통과 기준)', () => {
  assert.deepEqual(checkContent(CONTENT), []);
  for (const id of IDS) {
    const v = CONTENT[id];
    assert.ok(v.lesson.length >= 3 && v.lesson.length <= 5, `${id}: ${v.lesson.length}장`);
    assert.ok(v.dad.traps.length >= 2 && v.dad.say.length >= 2, id);
    const les = lessonOf(id, 1, { ...OPTS, content: CONTENT });
    assert.equal(les.pages.length, v.lesson.length);
    assert.ok(!/\{(me|mon)/.test(les.pages.map((p) => p.say).join('')), `${id}: 자리표시가 남음`);
  }
});

test('★ 원고 확인 질문도 따로 풀어 대조 — 전부 읽히고, 정답은 맞고, 오답은 정말 틀렸다', () => {
  const UNIT = /(개|명|원|대|봉지|척|장)$/;
  const strip = (t) => String(t).replace(UNIT, '');
  let solved = 0; let member = 0;
  for (const id of IDS) {
    for (const [i, p] of CONTENT[id].lesson.entries()) {
      if (!p.check) continue;
      const q = fillC(p.check.q); const ok = fillC(p.check.ok); const no = p.check.no.map(fillC);
      const where = `${id}[${i}]: ${q}`;
      let want = null;
      try { want = solveText(q); } catch { want = null; }
      if (want !== null) {
        assert.ok(!want.includes('|'), `${where}: 표에서 두 칸`);
        assert.equal(strip(ok), want, where);
        for (const n of no) assert.notEqual(strip(n), want, `${where}: 오답 "${n}"이 맞는 답`);
        solved++;
        continue;
      }
      // "~인 것은 어느 것일까요?" + 수 보기 하나씩 — 정답만 범위에 들고 오답은 안 든다
      const R = readRange(q);
      const val = (t) => { const m = /^(\d+)(?: ?(?:cm|kg|g|살))?$/.exec(String(t).trim()); return m ? +m[1] : null; };
      assert.ok(R && val(ok) !== null && no.every((n) => val(n) !== null), `${where}: 읽을 수 없는 확인 질문`);
      assert.ok(inR(val(ok), R), `${where}: 정답 ${ok}이 범위 밖`);
      for (const n of no) assert.ok(!inR(val(n), R), `${where}: 오답 ${n}도 범위에 든다`);
      member++;
    }
  }
  assert.ok(solved >= 25 && member >= 2, `따로 푼 확인 질문 ${solved} · 범위로 본 것 ${member}`);
});

test('★ 원고의 수직선 그림: 모두 그려지고, 배움 글이 말하는 범위 = 그 장의 그림', () => {
  const readFig = (d) => solveText(`바르게 말한 것 ${d}`);
  let n = 0;
  for (const id of IDS) {
    for (const [i, p] of CONTENT[id].lesson.entries()) {
      for (const d of [...(p.say.match(/\[[a-z]+ [^\]]+\]/g) || []), ...((p.check && p.check.q.match(/\[[a-z]+ [^\]]+\]/g)) || [])]) {
        assert.ok(figureSvg(d.slice(1, -1)), `${id}[${i}]: 못 그리는 ${d}`);
        n++;
      }
      // 배움 글의 그림은 그 장의 글이 같은 범위를 말해야 한다 (단위는 빼고 견준다)
      for (const d of p.say.match(/\[range [^\]]+\]/g) || []) {
        const words = readFig(d);
        assert.ok(p.say.replace(/ ?(cm|kg|g)(?= )/g, '').replace(/\*\*/g, '').includes(words), `${id}[${i}]: 글에 "${words}"가 없다\n${p.say}`);
      }
    }
  }
  assert.ok(n >= 8, `그림 ${n}`);
});

test('★ 원고의 조사·셈식·아직 안 배운 말 (배움 글·확인 질문·아빠 카드 전부)', () => {
  const BAT = new Set(['0', '1', '3', '6', '7', '8']);
  const PAIRS = [['을', '를'], ['은', '는'], ['이', '가'], ['과', '와'], ['이에요', '예요'], ['이라서', '라서']];
  const FIRST = { 초과: 'rng.over', 미만: 'rng.over', 올림: 'rng.up', 어림: 'rng.up', 버림: 'rng.down', 반올림: 'rng.round' };
  const ev = (expr) => Function(`return (${expr.replace(/×/g, '*').replace(/−/g, '-')})`)();
  for (const id of IDS) {
    const all = contentText(CONTENT[id]);
    for (const [wb, nb] of PAIRS) {
      for (const m of all.matchAll(new RegExp(`(\\d)(${wb}|${nb})(?=[\\s.,!?)—]|$)`, 'g'))) assert.equal(m[2], BAT.has(m[1]) ? wb : nb, `${id}: "…${m[1]}${m[2]}"`);
    }
    for (const m of all.matchAll(/(이상|미만|이하|초과)(은|는|이에요|예요)(?=[\s.,]|$)/g)) {
      const has = m[1] === '이상' || m[1] === '미만';
      assert.ok({ 은: has, 는: !has, 이에요: has, 예요: !has }[m[2]], `${id}: "${m[0]}"`);
    }
    assert.ok(!/cm(은|을|이 |과)|kg(는|를|가 |와)|\d g(는|를|가 |와)|살(는|를|가 |와)/.test(all), `${id}: 단위 뒤 조사`);
    for (const m of all.matchAll(/(?<![\d.□])(\d+(?:\.\d+)?(?: [+−×] \d+(?:\.\d+)?)+) = (\d+(?:\.\d+)?)/g)) assert.ok(Math.abs(ev(m[1]) - Number(m[2])) < 1e-9, `${id}: ${m[0]}`);
    const at = IDS.indexOf(id);
    for (const [w, first] of Object.entries(FIRST)) {
      if (IDS.indexOf(first) <= at) continue;
      const hay = w === '올림' ? all.replace(/반올림/g, '') : all;
      assert.ok(!hay.includes(w), `${id}: 아직 안 배운 "${w}"`);
    }
  }
});
