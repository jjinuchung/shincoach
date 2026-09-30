// 🔢 F 비와 비율 줄기 생성기 테스트: node --test tests/mathrat.test.js
//
// ★ 핵심은 **독립 검산** — 정답·오개념 오답·보여 주는 틀린 계산을 이 파일의 **따로 만든** 계산기로 다시 푼다.
//   비의 순서(기준량이 어느 쪽인가)는 생성기가 알려 주는 값이 아니라 **문제 글의 말투를 이 파일이 직접 읽어** 정한다.
// ★ 씨앗은 개념마다 수천 개 (RAT_SEEDS=20000으로 넓게).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  RATIO, TAGS, makeQuestion, makeRound, conceptById, ladder, placeFrom, diagnosticSet, lessonOf, checkContent, gradeLabel,
} from '../js/mathrat.js';

const OPTS = { names: ['피카츄', '리자몽', '개굴닌자'], me: '진우', worlds: { pokemon: [], toystory: [], minions: [], moana: [] } };
const SEEDS = Number(process.env.RAT_SEEDS) || 1500;

// ── 독립 계산기: 정확한 분수 산술 ──
const g = (a, b) => (b ? g(b, a % b) : Math.abs(a));
const Q = (n, d = 1) => { const s = d < 0 ? -1 : 1; const k = g(Math.abs(n), Math.abs(d)) || 1; return { n: (s * n) / k, d: (s * d) / k }; };
const add = (a, b) => Q(a.n * b.d + b.n * a.d, a.d * b.d);
const sub = (a, b) => Q(a.n * b.d - b.n * a.d, a.d * b.d);
const mul = (a, b) => Q(a.n * b.n, a.d * b.d);
const div = (a, b) => Q(a.n * b.d, a.d * b.n);
const eq = (a, b) => Math.abs(a - b) < 1e-9;
function evalExpr(src) {
  const s = String(src).replace(/−/g, '-').replace(/\s+/g, '');
  let i = 0;
  const peek = () => s[i];
  function number() {
    const m = /^\d+(\.\d+)?/.exec(s.slice(i));
    if (!m) throw new Error(`숫자가 아님: ${s.slice(i)} (${s})`);
    i += m[0].length;
    // m[1]은 ".35"처럼 점을 포함 — 소수 자리 수는 길이 − 1
    let v = m[1] ? Q(Number(m[0].replace('.', '')), 10 ** (m[1].length - 1)) : Q(Number(m[0]));
    if (s[i] === '/' && /\d/.test(s[i + 1] || '')) { i++; const m2 = /^\d+/.exec(s.slice(i)); i += m2[0].length; v = Q(v.n, v.d * Number(m2[0])); }
    return v;
  }
  function primary() {
    if (peek() === '(') { i++; const v = expr(); if (peek() !== ')') throw new Error(`괄호: ${s}`); i++; return v; }
    return number();
  }
  function term() {
    let v = primary();
    while (peek() === '×' || peek() === '÷') { const op = s[i++]; const rhs = primary(); v = op === '×' ? mul(v, rhs) : div(v, rhs); }
    return v;
  }
  function expr() {
    let v = term();
    while (peek() === '+' || peek() === '-') { const op = s[i++]; const rhs = term(); v = op === '+' ? add(v, rhs) : sub(v, rhs); }
    return v;
  }
  const out = expr();
  if (i !== s.length) throw new Error(`다 못 읽음: ${s}`);
  return out;
}
const val = (t) => { const q = evalExpr(t); return q.n / q.d; };
/** 보기 글자의 값 — 백분율은 /100, 비·말은 null (생성기의 valueOf와 따로 만든 것) */
function textVal(t) {
  const s = String(t).trim();
  let m;
  if ((m = /^(\d+(?:\.\d+)?)%$/.exec(s))) return val(m[1]) / 100;
  if (/^\d+(\.\d+)?$|^\d+\/\d+$/.test(s)) return val(s);
  return null;
}
/** "3 : 5" → [3, 5] (항이 소수·분수여도) */
function ratioOf(t) {
  const m = /^(\S+) : (\S+)$/.exec(String(t).trim());
  return m ? [val(m[1]), val(m[2])] : null;
}
const isNat = (x) => Number.isInteger(x) && x > 0;

/** 문제 글에서 "이름 수" → 비교량 : 기준량을 직접 읽는다 */
function ratioFromStory(q0) {
  const q = String(q0).replace(/\*\*/g, ''); // ② 문항은 **굵게** 안에 있다
  const cnt = {};
  for (const m of String(q).matchAll(/(\S+) (\d+)(개|장)/g)) cnt[m[1]] = Number(m[2]);
  let m;
  let cmp; let base;
  if ((m = /(\S+) 수의 (\S+) 수에 대한 비/.exec(q))) { cmp = m[1]; base = m[2]; } else if ((m = /(\S+) 수에 대한 (\S+) 수의 비/.exec(q))) { base = m[1]; cmp = m[2]; } else if ((m = /(\S+) 수 대 (\S+) 수/.exec(q))) { cmp = m[1]; base = m[2]; } else if ((m = /(\S+) 수와 (\S+) 수의 비/.exec(q))) { cmp = m[1]; base = m[2]; } else return null;
  assert.ok(cnt[cmp] && cnt[base], `이야기에서 ${cmp}·${base}의 수를 못 찾음: ${q}`);
  return `${cnt[cmp]} : ${cnt[base]}`;
}

test('독립 계산기·말투 해석기 자체 점검', () => {
  assert.equal(val('35 × 100 ÷ 100'), 35);
  assert.equal(val('8000 × (100 − 20) ÷ 100'), 6400);
  assert.equal(val('28 × 3 ÷ (3 + 4)'), 12);
  assert.equal(val('0.35'), 0.35);
  assert.equal(val('3/4'), 0.75);
  assert.equal(textVal('35%'), 0.35);
  assert.equal(textVal('12.5%'), 0.125);
  assert.deepEqual(ratioOf('0.4 : 1.2').map((x) => Math.round(x * 10)), [4, 12]);
  assert.equal(ratioFromStory('연필 4개, 지우개 7개가 있어요. 지우개 수에 대한 연필 수의 비는'), '4 : 7');
  assert.equal(ratioFromStory('연필 4개, 지우개 7개가 있어요. 연필 수의 지우개 수에 대한 비는'), '4 : 7');
  assert.equal(ratioFromStory('연필 4개, 지우개 7개가 있어요. 연필 수 대 지우개 수는'), '4 : 7');
  assert.equal(ratioFromStory('연필 4개, 지우개 7개가 있어요. 연필 수와 지우개 수의 비는'), '4 : 7');
});

test('사다리: 9칸, 모두 초6, needs가 바로 앞 칸', () => {
  assert.equal(RATIO.length, 9);
  const ids = RATIO.map((c) => c.id);
  assert.equal(new Set(ids).size, 9);
  for (const [k, c] of RATIO.entries()) {
    assert.ok(/^rat\./.test(c.id) && c.name && c.idea && c.slip, c.id);
    assert.equal(c.grade, 6);
    assert.deepEqual(c.needs, k ? [ids[k - 1]] : []);
  }
  assert.equal(gradeLabel(6), '초6');
});

function checkOk(c, s, q) {
  const ok = q.choices.find((x) => x.ok).text;
  const where = `${c.id} seed ${s}: "${q.q.replace(/\n/g, ' ')}" 정답 ${ok}`;
  const p = q.probe || {};
  if (p.calc) {
    assert.ok(eq(textVal(ok), val(p.calc)), `${where} — ${p.calc} = ${val(p.calc)}`);
    if (p.form === 'pct') assert.ok(/%$/.test(ok), `${where} — 백분율로 답해야`);
    if (p.form === 'dec') assert.ok(/^\d+(\.\d+)?$/.test(ok), `${where} — 소수로 답해야`);
    if (p.form === 'frac') { const m = /^(\d+)\/(\d+)$/.exec(ok); assert.ok(!m || g(+m[1], +m[2]) === 1, `${where} — 기약분수`); }
  } else if (p.base) {
    assert.equal(ok, p.base.split(' : ')[1], where);
    assert.ok(q.q.includes(p.base), `${where} — 문제에 그 비가 없다`);
  } else if (p.phrase) {
    assert.ok(q.q.includes(p.phrase), where);
    assert.equal(ok, ratioFromStory(q.q), where);
  } else if (p.constant) {
    assert.ok(ok.includes(`${p.constant.per[0] / p.constant.per[1]}배`), where);
  } else if (p.sameRatio) {
    const want = ratioOf(p.sameRatio); const got = ratioOf(ok);
    assert.ok(got && eq(got[0] / got[1], want[0] / want[1]), `${where} — 비율이 ${p.sameRatio}와 다르다`);
    if (p.simplest) assert.ok(isNat(got[0]) && isNat(got[1]) && g(got[0], got[1]) === 1, `${where} — 간단한 자연수의 비가 아니다`);
  } else {
    assert.fail(`${where} — 검산 재료(probe)가 없다`);
  }
}

test('★ 독립 검산: ① 정답이 따로 푼 값·따로 읽은 비와 같다', () => {
  for (const c of RATIO) for (let s = 1; s <= SEEDS; s++) checkOk(c, s, makeQuestion(c.id, 'calc', s * 7919, OPTS));
});

const NUMERIC = /^(\d+(\.\d+)?%?|\d+\/\d+)$/;
test('★ 보기: 정답 하나, 글자·값 겹침 없음, 나오면 안 되는 글자 없음, 수가 너무 크지 않음', () => {
  for (const c of RATIO) {
    for (let s = 1; s <= SEEDS; s++) {
      for (const kind of ['calc', 'misread']) {
        const q = makeQuestion(c.id, kind, s * 104729, OPTS);
        const where = `${c.id}/${kind} seed ${s}`;
        assert.equal(q.choices.filter((x) => x.ok).length, 1, `${where}: 정답 하나`);
        assert.ok(q.choices.length >= 3, `${where}: 보기 3개↑ (${q.choices.map((x) => x.text).join(' / ')})`);
        const texts = q.choices.map((x) => String(x.text).trim());
        assert.equal(new Set(texts).size, texts.length, `${where}: 글자가 같은 보기`);
        const nums = q.choices.filter((x) => NUMERIC.test(x.text));
        for (let a = 0; a < nums.length; a++) for (let b = a + 1; b < nums.length; b++) assert.ok(!eq(textVal(nums[a].text), textVal(nums[b].text)), `${where}: 값이 같은 보기 ${nums[a].text} / ${nums[b].text}`);
        for (const ch of q.choices) {
          const t = String(ch.text);
          assert.ok(t && !/undefined|NaN|null|Infinity|e[-+]\d/.test(t), `${where}: 이상한 보기 "${t}"`);
          assert.ok(ch.ok || ch.tag, `${where}: 오답 "${t}"에 이름표가 없다`);
          if (NUMERIC.test(t)) {
            assert.ok(!/^0\d/.test(t) && !/\.\d*0%?$/.test(t), `${where}: 모양이 이상한 수 "${t}"`);
            assert.ok((t.split('.')[1] || '').replace('%', '').length <= 3, `${where}: 소수 자리가 너무 긺 "${t}"`);
          }
        }
        const all = `${q.q} ${q.expr} ${JSON.stringify(q.solve)}`;
        assert.ok(!/undefined|NaN|null|\{(me|mon)/.test(all), `${where}: 글에 새는 것 — ${all.slice(0, 160)}`);
        for (const m of q.q.matchAll(/\d+/g)) assert.ok(Number(m[0]) <= 20000, `${where}: 너무 큰 수 ${m[0]} — ${q.q}`);
      }
    }
  }
});

test('★ 오개념 이름표: 그 오답이 정말 그 실수의 값이다', () => {
  const seen = {};
  const nums = (t) => (String(t).match(/\d+(?:\.\d+)?/g) || []).map(Number);
  for (const c of RATIO) {
    for (let s = 1; s <= SEEDS; s++) {
      const q = makeQuestion(c.id, 'calc', s * 31337, OPTS);
      const p = q.probe || {};
      const okText = q.choices.find((x) => x.ok).text;
      const v0 = p.calc ? val(p.calc) : null;
      const n = p.calc ? nums(p.calc) : [];
      for (const ch of q.choices.filter((x) => !x.ok)) {
        const v = textVal(ch.text);
        const where = `${c.id} seed ${s}: "${ch.tag}" 오답 ${ch.text} (${p.calc || p.phrase || p.sameRatio || p.base || ''})`;
        const hit = (want) => { seen[ch.tag] = (seen[ch.tag] || 0) + 1; assert.ok(v !== null && eq(v, want), `${where} ≠ ${want}`); };
        const hitText = (cond) => { seen[ch.tag] = (seen[ch.tag] || 0) + 1; assert.ok(cond, where); };
        switch (ch.tag) {
          case TAGS.diffForTimes: hit(n[0] - n[1]); break;
          case TAGS.timesForDiff: hit(n[0] / n[1]); break;
          case TAGS.swap:
            if (p.phrase) hitText(ch.text === ratioFromStory(q.q).split(' : ').reverse().join(' : '));
            else if (p.base) hitText(ch.text === p.base.split(' : ')[0]);
            else if (p.sameRatio) hitText(eq(ratioOf(ch.text)[0] / ratioOf(ch.text)[1], ratioOf(p.sameRatio)[1] / ratioOf(p.sameRatio)[0]));
            else hit(1 / v0);
            break;
          case TAGS.whole:
            if (p.phrase) { const [x, y] = ratioOf(ratioFromStory(q.q)); const w = ratioOf(ch.text); hitText((eq(w[0], x) && eq(w[1], x + y)) || (eq(w[0], x + y) && eq(w[1], y))); } else if (p.base) { const [x, y] = ratioOf(p.base); hit(x + y); } else hit(v0 / (1 + v0));
            break;
          case TAGS.noHundred: hit(v0 / 100); break;
          case TAGS.byTen: seen[ch.tag] = (seen[ch.tag] || 0) + 1; assert.ok(eq(v, v0 * 10) || eq(v, v0 / 10), where); break;
          case TAGS.pctNumerator: hit(n[0] / 100); break;
          case TAGS.pctAsNum: hit(/÷ 100$/.test(p.calc) && n.length === 3 ? n[1] : n[0]); break;
          case TAGS.discountAsPrice: hit(n[0] - v0); break;
          case TAGS.pctAsWon: hit(/\(100/.test(p.calc) ? n[0] - n[2] : n[1]); break;
          case TAGS.misses: hit(n[0] - v0); break;
          case TAGS.baseWater: hit(n[0] / (n[1] - n[0])); break;
          case TAGS.addSame:
            if (p.sameRatio) { const [a, b] = ratioOf(p.sameRatio); const k = ratioOf(okText)[0] / a; hitText(ch.text === `${a + k} : ${b + k}`); } else if (/^\d+ × \d+ ÷ \d+$/.test(p.calc)) { const [x, y, z] = n; hit(x > v0 ? x - (z - y) : x + (y - z)); }
            break;
          case TAGS.oneSide:
            if (p.sameRatio) { const [a, b] = ratioOf(p.sameRatio); const k = ratioOf(okText)[0] / a; hitText(ch.text === `${a * k} : ${b}`); } else hit(n[0]);
            break;
          case TAGS.notLowest: { const w = ratioOf(ch.text); const want = ratioOf(p.sameRatio); hitText(isNat(w[0]) && isNat(w[1]) && g(w[0], w[1]) > 1 && eq(w[0] / w[1], want[0] / want[1])); break; }
          case TAGS.decOneSide: { const [x, y] = ratioOf(p.sameRatio); const w = ratioOf(ch.text); hitText(eq(w[0], x * 10) && eq(w[1], y)); break; }
          case TAGS.denomRatio: { const f = p.sameRatio.split(' : ').map((t) => t.split('/')[1]); hitText(ch.text === `${f[0]} : ${f[1]}`); break; }
          case TAGS.numerRatio: { const f = p.sameRatio.split(' : ').map((t) => t.split('/')[0]); hitText(ch.text === `${f[0]} : ${f[1]}`); break; }
          case TAGS.diffSame: { const [b, cc, a] = n; hit(cc + (b - a)); break; }
          case TAGS.wrongPair: { const [b, cc, a] = n; hit((a * cc) / b); break; }
          case TAGS.noSum: { const [N, mineN, p1, q1] = n; hit((N * mineN) / (mineN === p1 ? q1 : p1)); break; }
          case TAGS.divideByTerm: { const [N, mineN] = n; hit(N / mineN); break; }
          case TAGS.half: hit(n[0] / 2); break;
          case TAGS.otherShare: hit(n[0] - v0); break;
          case TAGS.diffConst: hitText(ch.text.includes(`${p.constant.per[0] - p.constant.per[1]}명`)); break;
          default: break;
        }
      }
    }
  }
  for (const tag of Object.values(TAGS)) assert.ok((seen[tag] || 0) >= 20, `"${tag}" 오답을 충분히 검사해야 한다 (${seen[tag] || 0}건)`);
});

test('★ ② 오개념 문항: 보여 준 것은 정말 틀렸다 · 갈래 열쇠가 있다', () => {
  const branches = {};
  for (const c of RATIO) {
    for (let s = 1; s <= SEEDS; s++) {
      const q = makeQuestion(c.id, 'misread', s * 7717, OPTS);
      const p = q.probe || {};
      const where = `${c.id} seed ${s}: ${q.q.replace(/\n/g, ' ')}`;
      assert.ok(/^misread:/.test(q.key || ''), where);
      branches[`${c.id} ${q.key}`] = (branches[`${c.id} ${q.key}`] || 0) + 1;
      assert.ok(/\*\*.+\*\*/.test(q.q), where);
      if (p.calc) {
        assert.ok(!eq(textVal(p.shown), val(p.calc)), `${where}: 보여 준 ${p.shown}이 사실 정답`);
        assert.ok(q.q.includes(p.shown), where);
      } else if (p.phrase) {
        assert.notEqual(p.shown, ratioFromStory(q.q), `${where}: 보여 준 비가 사실 맞다`);
      } else if (p.ratioEq) {
        const [l, r] = p.ratioEq.map(ratioOf);
        assert.ok(!eq(l[0] / l[1], r[0] / r[1]), `${where}: 보여 준 두 비가 사실 같다`);
      } else if (p.shownNotLowest) {
        const w = ratioOf(p.shownNotLowest); const want = ratioOf(p.sameRatio);
        assert.ok(eq(w[0] / w[1], want[0] / want[1]) && g(w[0], w[1]) > 1, `${where}: 덜 나눈 비가 아니다`);
      } else assert.fail(`${where}: probe 없음`);
    }
  }
  for (const [k, n] of Object.entries(branches)) assert.ok(n >= 100, `${k} 갈래가 드물다 (${n})`);
});

test('★ 수 뒤의 조사 (5는·3은·35%를·3 : 5를·3/5을·10으로·7로)', () => {
  const BAT = new Set(['0', '1', '3', '6', '7', '8']);
  const PAIR = { 이: true, 가: false, 을: true, 를: false, 은: true, 는: false, 과: true, 와: false };
  let checked = 0;
  for (const c of RATIO) {
    for (let s = 1; s <= 300; s++) {
      for (const kind of ['calc', 'misread']) {
        const q = makeQuestion(c.id, kind, s * 3571, OPTS);
        const texts = [q.q, ...q.choices.map((x) => x.text), ...q.solve.steps, q.solve.whyAny, ...Object.values(q.solve.why)];
        for (const t of texts) {
          for (const m of String(t).matchAll(/(\d+(?:\.\d+)?(?:\/\d+)?%?)(으로|로|이|가|을|를|은|는|과|와)(?![가-힣])/g)) {
            const tok = m[1]; const j = m[2];
            const pct = tok.endsWith('%');
            const last = tok.includes('/') ? tok.split('/')[0].slice(-1) : tok.replace('%', '').slice(-1);
            checked++;
            if (j === '으로' || j === '로') {
              const want = !pct && ['0', '3', '6'].includes(last) ? '으로' : '로';
              assert.equal(j, want, `${c.id}/${kind} seed ${s}: "${tok}${j}" (${t})`);
            } else {
              assert.equal(PAIR[j], !pct && BAT.has(last), `${c.id}/${kind} seed ${s}: "${tok}${j}" (${t})`);
            }
          }
        }
      }
    }
  }
  assert.ok(checked > 1000, `조사 검사 ${checked}건`);
});

test('★ 풀이 카드: 단계 2줄↑ · 기억할 것 · 오답마다 왜 · 정답이 단계에 나온다', () => {
  for (const c of RATIO) {
    for (const kind of ['calc', 'misread']) {
      for (let s = 1; s <= 400; s++) {
        const q = makeQuestion(c.id, kind, s * 131, OPTS);
        const where = `${c.id}/${kind} seed ${s}`;
        assert.ok(q.solve && q.solve.steps.length >= 2 && q.solve.rule, where);
        for (const ch of q.choices) if (!ch.ok) assert.ok(q.solve.why[ch.tag] || q.solve.whyAny, `${where}: 오답 "${ch.tag}" 설명 없음`);
        if (kind !== 'calc') continue;
        const ok = q.choices.find((x) => x.ok).text;
        assert.ok(q.solve.steps.some((st) => st.includes(ok) || (NUMERIC.test(ok) && (st.match(/\d+(?:\.\d+)?(?:\/\d+)?%?/g) || []).some((t) => eq(textVal(t) ?? NaN, textVal(ok))))), `${where}: 풀이에 정답 ${ok} 없음 — ${q.solve.steps.join(' / ')}`);
      }
    }
  }
});

test('🔁 쌍둥이·🤔 노트: 요청한 틀·갈래로 온다', () => {
  for (const c of RATIO) {
    for (const kind of ['calc', 'misread']) {
      for (let s = 1; s <= 60; s++) {
        const a = makeQuestion(c.id, kind, s * 97, OPTS);
        if (!a.key) continue;
        const b = makeQuestion(c.id, kind, s * 97 + 5, { ...OPTS, want: { k: kind, key: a.key } });
        assert.equal(b.key, a.key, `${c.id}/${kind} seed ${s}: 쌍둥이 틀이 다르다`);
      }
    }
  }
});

test('📏 진단·사다리·한 편·배움 예비', () => {
  const d = diagnosticSet(9, 5, OPTS);
  assert.deepEqual(d.map((q) => q.concept), ['rat.compare', 'rat.value', 'rat.percentuse', 'rat.simplest', 'rat.distribute']);
  const pl = placeFrom([{ concept: 'rat.compare', correct: true }, { concept: 'rat.value', correct: false }]);
  assert.equal(pl.startId, 'rat.value');
  assert.deepEqual(pl.knownIds, ['rat.compare', 'rat.ratio']);
  assert.deepEqual(ladder(['rat.compare']).slice(0, 3).map((x) => x.state), ['done', 'now', 'locked']);
  for (const c of RATIO) {
    assert.deepEqual(makeRound(c.id, 5, OPTS).map((q) => q.kind), ['calc', 'misread']);
    assert.equal(lessonOf(c.id, 1, OPTS).pages.length, 1);
  }
  assert.equal(conceptById('rat.nope'), null);
  assert.equal(checkContent({}).filter((x) => /내용 없음/.test(x)).length, 9);
});

test('이야기에 없는 가족을 지어내지 않는다 — 진우에게는 동생이 없다 (수학 생성기·원고 전체)', async () => {
  const { readdirSync } = await import('node:fs');
  const files = [
    ...readdirSync('js').filter((f) => /^math.*\.js$/.test(f)).map((f) => `js/${f}`),
    ...readdirSync('coach/math').filter((f) => f.endsWith('.json')).map((f) => `coach/math/${f}`),
  ];
  assert.ok(files.length >= 10);
  for (const f of files) assert.doesNotMatch(readFileSync(f, 'utf8'), /동생/, f);
});

// ── 사람이 쓴 원고 (coach/math/ratio.json) ──
const CONTENT = JSON.parse(readFileSync('coach/math/ratio.json', 'utf8'));

test('원고(ratio.json)가 형식 검사를 통과한다 — 9칸 모두 배움 3장↑·확인 2개↑·아빠 카드', () => {
  assert.deepEqual(checkContent(CONTENT), []);
  for (const c of RATIO) {
    const L = lessonOf(c.id, 3, { ...OPTS, content: CONTENT });
    assert.ok(L.pages.length >= 3, c.id);
    assert.ok(!/\{(me|mon)/.test(JSON.stringify(L)), `${c.id}: 이름 자리표시가 남았다`);
  }
});

/**
 * 원고 확인 질문을 문제 글에서 **직접 읽어** 다시 푼다 — 사람이 쓴 답도 틀릴 수 있다.
 * 돌려주는 것: { v: 값, form? } · { text: 정확한 글자 } · { ratio: 같아야 할 비, simplest } · { nums: [수들] } · null(못 읽음)
 */
function answerOfCheck(q0) {
  const q = String(q0);
  let m;
  const N = (t) => val(t);
  // ── 두 수 비교 ──
  if ((m = /한 모둠에 학생 (\d+)명, 책상 (\d+)개씩이에요\. 모둠이 (\d+)개면 학생은 책상보다 몇 명 더/.exec(q))) return { v: (N(m[1]) - N(m[2])) * N(m[3]) };
  if ((m = /(\S+) (\d+)(?:개|장), (\S+) (\d+)(?:개|장)/.exec(q))) {
    const a = N(m[2]); const b = N(m[4]);
    if (/수는 \S+ 수의 몇 배/.test(q)) return { v: a / b };
    if (/몇 (?:개|장) 더 많을까요/.test(q)) return { v: a - b };
    const r = ratioFromStory(q);
    if (r) return { text: r };
  }
  // ── 비 ──
  if ((m = /^(\d+) : (\d+)[을를] 바르게 읽은/.exec(q))) return { text: `${m[2]}에 대한 ${m[1]}의 비` };
  if ((m = /^(\d+) : (\d+)에서 기준량은/.exec(q))) return { v: N(m[2]) };
  if ((m = /(\S+) (\d+)개 중 (\S+) \S+이 (\d+)개예요\. 전체 \S+ 수에 대한 \S+ \S+ 수의 비/.exec(q))) return { text: `${m[4]} : ${m[2]}` };
  // ── 비율·백분율 ──
  if ((m = /^(\d+) : (\d+)의 비율을 소수로/.exec(q))) return { v: N(m[1]) / N(m[2]), form: 'dec' };
  if ((m = /(\d+)번 던져 \S+ (\d+)번 넣었어요\. 던진 횟수에 대한 넣은 횟수의 비율을 소수로/.exec(q))) return { v: N(m[2]) / N(m[1]), form: 'dec' };
  if ((m = /^(\d+(?:\.\d+)?|\d+\/\d+)[을를] 백분율로/.exec(q))) return { v: N(m[1]), form: 'pct' };
  if ((m = /^(\d+)%를 소수로/.exec(q))) return { v: N(m[1]) / 100, form: 'dec' };
  if ((m = /확률 (\d+)%를 기약분수로/.exec(q))) return { v: N(m[1]) / 100, form: 'frac' };
  if ((m = /(\d+)원의 (\d+)%는/.exec(q))) return { v: N(`${m[1]} × ${m[2]} ÷ 100`) };
  if ((m = /(\d+)원짜리 .*?(\d+)% 할인해요\. 몇 원에 살 수/.exec(q))) return { v: N(`${m[1]} × (100 − ${m[2]}) ÷ 100`) };
  if ((m = /확률이 (\d+)%예요\. 몬스터볼을 (\d+)번 던지면/.exec(q))) return { v: N(`${m[2]} × ${m[1]} ÷ 100`) };
  if ((m = /소금 (\d+)g을 물 (\d+)g에 녹였어요\. 소금물의 진하기/.exec(q))) return { v: N(`${m[1]} ÷ (${m[1]} + ${m[2]})`), form: 'pct' };
  // ── 비의 성질·간단한 비·비례식 ──
  if ((m = /^(\d+) : (\d+)의 전항과 후항에 (\d+)[을를] 곱하면/.exec(q))) return { text: `${N(m[1]) * N(m[3])} : ${N(m[2]) * N(m[3])}` };
  if ((m = /^(\d+) : (\d+) = (\d+) : □/.exec(q))) return { v: N(`${m[2]} × ${m[3]} ÷ ${m[1]}`) };
  if ((m = /^(\S+) : (\S+?)[을를] 간단한 자연수의 비로/.exec(q))) return { ratio: `${m[1]} : ${m[2]}`, simplest: true };
  if ((m = /^(\d+) : (\d+) = (\d+) : (\d+)에서 외항은/.exec(q))) return { nums: [N(m[1]), N(m[4])] };
  if ((m = /사탕 (\d+)개에 (\d+)원이에요\. 사탕 (\d+)개는 몇 원/.exec(q))) return { v: N(`${m[2]} × ${m[3]} ÷ ${m[1]}`) };
  // ── 비례배분 — 앞사람·뒷사람, 또는 "나(me)와 친구" 중 나 = 앞 ──
  if ((m = /(\d+)(?:개|장)[을를] (\d+) : (\d+)[으로]+ 나누면 (앞|뒷)사람/.exec(q))) return { v: N(`${m[1]} × ${m[4] === '앞' ? m[2] : m[3]} ÷ (${m[2]} + ${m[3]})`) };
  if ((m = /(\S+?)[이가] \S+ (\d+)(?:개|장)[을를] 친구와 (\d+) : (\d+)[으로]+ 나눠 가져요\. (\S+?)[은는] 몇/.exec(q)) && m[1] === m[5]) return { v: N(`${m[2]} × ${m[3]} ÷ (${m[3]} + ${m[4]})`) };
  return null;
}
/** 보기 글자의 값 — 단위(배·명·장·개)를 떼고 textVal */
const choiceVal = (t) => textVal(String(t).trim().replace(/(배|명|장|개)$/, ''));
function matchesAnswer(want, t) {
  if (want.v !== undefined) { const x = choiceVal(t); return x !== null && eq(x, want.v); }
  if (want.text !== undefined) return String(t).trim() === want.text;
  if (want.ratio !== undefined) {
    const w = ratioOf(want.ratio); const got = ratioOf(t);
    if (!got || !eq(got[0] / got[1], w[0] / w[1])) return false;
    return !want.simplest || (isNat(got[0]) && isNat(got[1]) && g(got[0], got[1]) === 1);
  }
  if (want.nums !== undefined) {
    const ns = (String(t).match(/\d+(?:\.\d+)?/g) || []).map(Number).sort((a, b) => a - b);
    return JSON.stringify(ns) === JSON.stringify([...want.nums].sort((a, b) => a - b));
  }
  return false;
}

test('★ 원고 확인 질문도 따로 풀어 대조 — 32개 전부 읽히고, 정답은 맞고, 오답은 정말 틀렸다', () => {
  assert.equal(answerOfCheck('사과 15개, 배 5개가 있어요. 사과 수는 배 수의 몇 배일까요?').v, 3); // 해석기 자체 점검
  assert.deepEqual(answerOfCheck('1/4 : 1/6을 간단한 자연수의 비로 나타내면 어느 것일까요?'), { ratio: '1/4 : 1/6', simplest: true });
  let total = 0; const unread = [];
  for (const c of RATIO) {
    const L = lessonOf(c.id, 3, { ...OPTS, content: CONTENT });
    for (const [i, p] of L.pages.entries()) {
      if (!p.check) continue;
      total++;
      const where = `${c.id}[${i}] "${p.check.q}"`;
      const want = answerOfCheck(p.check.q);
      if (!want) { unread.push(where); continue; }
      assert.ok(matchesAnswer(want, p.check.ok), `${where} — 따로 푼 답 ${JSON.stringify(want)} ≠ 원고 정답 ${p.check.ok}`);
      for (const n of p.check.no) assert.ok(!matchesAnswer(want, n), `${where} — 오답 ${n}이 사실 정답`);
      if (want.form === 'pct') assert.ok(/%$/.test(p.check.ok), `${where} — 백분율로 답해야`);
      if (want.form === 'dec') assert.ok(/^\d+(\.\d+)?$/.test(p.check.ok), `${where} — 소수로 답해야`);
      if (want.form === 'frac') { const f = /^(\d+)\/(\d+)$/.exec(p.check.ok); assert.ok(f && g(+f[1], +f[2]) === 1, `${where} — 기약분수로 답해야`); }
    }
  }
  assert.deepEqual(unread, [], '해석기가 못 읽은 확인 질문 — answerOfCheck에 말투를 더할 것');
  assert.ok(total >= 27, `확인 질문 ${total}개`);
});
