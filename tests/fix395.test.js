// 🔢 v395 (2026-11-04 전수 검사 판단 「추천대로」): 문제 생성기 글 18건 — 실제 생성기를 씨앗 수천 개로 돌려 나오면 안 되는 글을 본다
//  · 틀린 설명: 몫 0.1 · 0.2는 0.2보다 · 나머지 검산 · 돌린 변 · 빚 하루치 · 곱셈 모으기 · 분수 음수
//  · 어색한 문제: 통분 · 곱의 소수 자리 · 키 그래프 · 깎아 준 금액 · 넓이 도움말 · 둥근 판 · 바나나 장부 · 수면 높이 · 쌓기나무
//  · 조사: 「… 를 계산하면?」(틀 글은 그대로 — 오답 노트 열쇠) · 큰 수가
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fixNumJosa, WORLDS } from '../js/mathgen.js';
import { makeQuestion as ddiv } from '../js/mathddiv.js';
import { makeQuestion as muldiv } from '../js/mathmuldiv.js';
import { makeQuestion as solid } from '../js/mathsolid.js';
import { makeQuestion as neg } from '../js/mathneg.js';
import { makeQuestion as fmul } from '../js/mathfmul.js';
import { makeQuestion as dmul } from '../js/mathdmul.js';
import { makeQuestion as dec } from '../js/mathdec.js';
import { makeQuestion as data } from '../js/mathdata.js';
import { makeQuestion as expr } from '../js/mathexpr.js';
import { makeQuestion as area } from '../js/matharea.js';
import { makeQuestion as circle } from '../js/mathcircle.js';
import { makeQuestion as space } from '../js/mathspace.js';
import { makeQuestion as mix } from '../js/mathmix.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const worlds = { toystory: WORLDS.toystory.cast, minions: WORLDS.minions.cast, moana: WORLDS.moana.cast };
const idsOf = (name) => [...new Set([...read(`js/${name}.js`).matchAll(/^\s+id: '([a-z]+\.\w+)'/gm)].map((m) => m[1]))];
const strs = (o, out = []) => { if (typeof o === 'string') out.push(o); else if (o && typeof o === 'object') for (const v of Object.values(o)) strs(v, out); return out; };
const okOf = (q) => String(((q.choices || []).find((c) => c.ok) || {}).text || '');
const decs = (s) => { const m = /\.(\d+)/.exec(String(s)); return m ? m[1].length : 0; };
const num = (s) => Number(String(s).replace(/−/g, '-'));

/** 그 줄기의 문제를 씨앗 N개로 만들어 하나씩 넘긴다 */
function each(mk, ids, kinds, N, fn) {
  for (const id of [].concat(ids)) for (const kind of [].concat(kinds)) for (let s = 1; s <= N; s++) {
    const q = mk(id, kind, s * 7 + 1, { worlds });
    if (q) fn(q, id, kind);
  }
}

test('1 몫 0.1은 안 나온다 — 어림 글의 「0.1보다 커요」가 늘 참', () => {
  let est = 0;
  each(ddiv, 'ddiv.small', 'misread', 4000, (q) => {
    const w = fixNumJosa(q.solve.whyAny);
    const m = /([\d.]+)[은는] (\d+) × 0\.1 = ([\d.]+)보다 커서 몫은 0\.1보다 커요/.exec(w);
    if (m) { est += 1; assert.ok(num(m[1]) > num(m[3]), w); }
    assert.ok(!/(?:사이: |= )0\.1$/.test(okOf(q)), okOf(q)); // 어림·소수점 빠뜨림 두 갈래 다
  });
  assert.ok(est > 100, `어림 문제 ${est}`);
});

test('2 처음 수와 같아도 맞는 말 — 「0.2는 0.2보다 크지 않아요」', () => {
  let n = 0; let same = 0;
  each(ddiv, 'ddiv.diff', 'misread', 4000, (q) => {
    const w = fixNumJosa(q.solve.whyAny);
    if (!/나누는 수만 옮겼어요/.test(w)) return;
    const m = /— ([\d.]+)[은는] ([\d.]+)보다 크지 않아요/.exec(w);
    assert.ok(m, w);
    assert.ok(num(m[1]) <= num(m[2]), w);
    n += 1; if (m[1] === m[2]) same += 1;
  });
  assert.ok(n > 100 && same > 0, `${n}개 중 같은 수 ${same}`);
});

test('3 나머지가 있어도 맞는 검산 글', () => {
  let rest = 0;
  each(muldiv, 'md.div10s', 'calc', 1500, (q) => {
    assert.match(q.solve.whyAny, /곱하고 나머지를 더해 나누어지는 수가 되는지/);
    if (okOf(q).includes('…')) rest += 1;
  });
  assert.ok(rest > 50, `나머지 있는 문제 ${rest}`);
});

test('4 돌린 직각삼각형 풀이·배움 글 — 빗변도 축에서 떨어져 있어 「떨어진 변」이라 부르지 않는다', () => {
  let tri = 0; let rect = 0;
  each(solid, 'sol.round', ['calc', 'misread'], 3000, (q) => {
    const text = strs(q).join('\n');
    if (/\[spin tri /.test(q.q)) {
      tri += 1;
      assert.ok(!/떨어진 변/.test(text), text.slice(0, 120));
      const m = /축과 직각으로 만나는 변이 (\d+) cm — 밑면의 반지름 (\d+) cm/.exec(text);
      if (m) assert.equal(m[1], m[2]);
    }
    if (/떨어진 변/.test(text)) { rect += 1; assert.match(q.q, /\[spin rect /); }
  });
  assert.ok(tri > 50 && rect > 50, `삼각형 ${tri} · 직사각형 ${rect}`);
  assert.ok(!read('js/mathsolid.js').includes('축에서 떨어진 변의 길이가'));
  assert.ok(read('js/mathsolid.js').includes('축과 직각으로 만나는 변의 길이가 밑면의 **반지름**이에요'));
});

test('5 빚을 나눠 갚는 글이 없고, 줄어든 코인의 답은 음수', () => {
  let hit = 0;
  each(neg, 'neg.div', 'calc', 3000, (q) => {
    assert.ok(!/나눠 갚기로|코인 빚/.test(q.q), q.q);
    const m = /코인 셈이 (\d+)일 동안 똑같이 줄어서 모두 −(\d+)만큼 변했어요/.exec(q.q);
    if (m) { hit += 1; assert.equal(num(okOf(q)), -Number(m[2]) / Number(m[1]), q.q); }
  });
  assert.ok(hit > 10, `코인 글 ${hit}`);
});

test('6 곱셈 풀이가 음수를 몇 번 모은다고 말하지 않는다 — 크기와 부호로', () => {
  let hit = 0;
  each(neg, idsOf('mathneg'), 'calc', 800, (q) => {
    const w = q.solve && q.solve.why && q.solve.why['곱셈을 덧셈으로'];
    if (!w || w.startsWith('곱셈이에요.')) return; // 소수 칸의 글은 크기만 말해서 참이다
    hit += 1;
    assert.ok(!/번 모으는 것/.test(w), w);
    assert.match(w, /곱셈은 크기 \d+ × \d+ = \d+, 부호는 (같아서 \+|달라서 −)\./);
  });
  assert.ok(hit > 50, `풀이 ${hit}`);
});

test('7 음수 분수는 − 를 붙여 쓴다', () => {
  let hit = 0;
  each(neg, idsOf('mathneg'), 'calc', 800, (q) => {
    for (const t of strs(q)) {
      const m = /큰 쪽은 (−?)\d+\/\d+\(음수\)/.exec(t);
      if (m) { hit += 1; assert.equal(m[1], '−', t); }
    }
  });
  assert.ok(hit > 10, `글 ${hit}`);
});

test('8 분수 곱셈 — 통분 자체를 틀렸다고 하지 않는다', () => {
  let hit = 0;
  each(fmul, idsOf('mathfmul'), 'misread', 800, (q) => {
    const w = q.solve.whyAny || '';
    assert.ok(!/곱셈은 통분하지 않고/.test(w), w);
    if (/덧셈처럼 통분한 뒤 분모를 그대로 뒀어요/.test(w)) { hit += 1; assert.match(okOf(q), /^곱셈은 통분이 필요 없어요 — 분자끼리, 분모끼리 곱해서 /); }
  });
  assert.ok(hit > 50, `문제 ${hit}`);
  // 8번과 같은 글 — 풀이·왜·규칙 어디에도 (Codex 198차)
  const noOld = (q) => { for (const t of strs(q)) assert.ok(!/곱셈은 통분하지 않|\(통분하지 않아요\)/.test(t), t); };
  each(fmul, idsOf('mathfmul'), 'calc', 400, noOld);
  each(mix, 'mix.frac', ['calc', 'misread'], 800, noOld);
  for (const f of ['js/mathfmul.js', 'js/mathmix.js']) assert.ok(!/통분하지 않아요/.test(read(f)), f);
});

test('9 소수 곱 — 답보다 많은 자리를 곱의 자리라고 말하지 않고, 끝이 0일 때만 「끝의 0은 지워요」', () => {
  const seen = { point: 0, pointZero: 0, step: 0, stepZero: 0, misZero: 0 };
  const scan = (q) => {
    const all = strs(q);
    for (const t of all) {
      assert.ok(!/곱도 소수/.test(t), t);
      const said = /곱은 소수 (\d)자리/.exec(t);
      if (said && /\d$/.test(okOf(q)) && /[\d.]+$/.test(okOf(q))) assert.ok(decs(/[\d.]+$/.exec(okOf(q))[0]) >= Number(said[1]), `${t} → ${okOf(q)}`);
      const m = /(\d+)에 소수점을 (?:\d|한|두|세)(?: )?자리로 찍어요(\(끝의 0은 지워요\))?/.exec(t);
      if (m) {
        seen.point += 1;
        assert.equal(Boolean(m[2]), m[1].endsWith('0'), t);
        if (m[2]) seen.pointZero += 1;
      }
    }
  };
  each(dmul, idsOf('mathdmul'), ['calc', 'misread'], 700, scan);
  each(dec, idsOf('mathdec'), ['calc', 'misread'], 700, (q) => {
    scan(q);
    const text = strs(q).join('\n');
    const m = /소수점을 떼고 (\d+) × (\d+) = (\d+)/.exec(text);
    if (m) {
      seen.step += 1;
      assert.equal(text.includes('(끝의 0은 지워요)'), m[3].endsWith('0'), text.slice(0, 200));
      if (m[3].endsWith('0')) seen.stepZero += 1;
    }
    if (/소수 한 자리 × 소수 한 자리는/.test(text)) {
      assert.ok(!/소수 두 자리예요 — 답은/.test(text), text.slice(0, 200));
      const k = /① (\d+) × (\d+) = (\d+)/.exec(text);
      assert.ok(k, text.slice(0, 200));
      assert.equal(text.includes('(끝의 0은 지워요)'), k[3].endsWith('0'), text.slice(0, 200));
      if (k[3].endsWith('0')) seen.misZero += 1;
    }
  });
  for (const [k, v] of Object.entries(seen)) assert.ok(v > 5, `${k} ${v}`);
  assert.ok(read('js/mathdmul.js').includes("slip: '소수 두 자리 수를 곱했으면 소수점을 두 자리로 찍었는지 봐요(끝의 0은 지워요).'"));
});

test('10 키 그래프는 사람도 강낭콩도 해마다 늘기만 하고, 다른 그래프는 내려갈 수 있다', () => {
  const seen = { tall: 0, bean: 0, ask: 0, down: 0 };
  each(data, idsOf('mathdata'), ['calc', 'misread'], 1200, (q, id) => {
    const g = /\[lgraph [^\]]*\]/.exec(q.q || '');
    if (!g) return;
    const cols = g[0].slice(1, -1).split(/\s+/).filter((t) => t.includes(':')).map((t) => t.split(':'));
    const tall = /의 키를 해마다/.test(q.q); const bean = /강낭콩의 키를 닷새마다/.test(q.q);
    const vals = cols.map(([, v]) => (v === '?' ? null : Number(v)));
    if (tall || bean) {
      seen[tall ? 'tall' : 'bean'] += 1;
      const known = vals.filter((v) => v !== null);
      assert.ok(known.every((v, i) => !i || v > known[i - 1]), q.q.slice(0, 160));
      const at = vals.indexOf(null);
      if (at >= 0) {
        // 빠진 점의 값도 앞뒤 사이에 든다 (값을 맞바꾸면 여기서 걸린다)
        if (id === 'dat.choose') {
          seen.ask += 1;
          assert.ok(at < cols.length - 1, `마지막 칸이 빠짐: ${q.q.slice(0, 160)}`);
          const m = new RegExp(`${cols[at][0]}의 키[은는] (\\d+) ?cm`).exec(fixNumJosa(q.q));
          assert.ok(m, q.q.slice(0, 200));
          const v = Number(m[1]);
          assert.ok((at === 0 || v > vals[at - 1]) && v < vals[at + 1], q.q.slice(0, 200));
        }
      }
    } else if (id !== 'dat.choose' && /몸무게를 달마다|손님 수를 요일마다/.test(q.q) && vals.some((v, i) => i && v !== null && vals[i - 1] !== null && v < vals[i - 1])) seen.down += 1;
  });
  for (const [k, v] of Object.entries(seen)) assert.ok(v > 5, `${k} ${v}`);
});

test('11 깎아 준 금액 — 낼 값으로 읽히지 않는다', () => {
  let hit = 0;
  each(expr, idsOf('mathexpr'), 'calc', 1200, (q) => {
    assert.ok(!/할인한 금액/.test(q.q), q.q);
    if (/깎아 준 금액은 몇 원인지/.test(q.q)) hit += 1;
  });
  assert.ok(hit > 10, `문제 ${hit}`);
});

test('12 둘레와 넓이 활용 도움말 — 높이를 구하는 문제에도 맞는 글', () => {
  let high = 0;
  each(area, 'are.use', 'calc', 1500, (q) => {
    const w = q.solve.whyAny;
    assert.ok(!/빈 곳이 어디인지/.test(w), w);
    if (/높이는 몇/.test(q.q) && w.startsWith('구하는 것을 먼저 봐요')) high += 1;
  });
  assert.ok(high > 50, `높이 문제 ${high}`);
});

test('13 7 cm 동전이 아니라 둥근 판 — 줄 세우기 답은 그대로 지름 × 개수', () => {
  let hit = 0;
  each(circle, idsOf('mathcircle'), ['calc', 'misread'], 800, (q) => {
    const text = strs(q).join('\n');
    assert.ok(!text.includes('동전'), text.slice(0, 160));
    const m = /반지름이 (\d+) cm인 둥근 판 (\d+)개를 한 줄로 맞닿게/.exec(q.q);
    if (m) { hit += 1; assert.equal(num(okOf(q)), 2 * m[1] * m[2], q.q); }
  });
  assert.ok(hit > 10, `문제 ${hit}`);
});

test('14 있는 것보다 많이 먹지 않는다 — 바나나 장부는 빌려 먹어도 음수가 될 수 있다', () => {
  let hit = 0;
  each(neg, idsOf('mathneg'), 'calc', 1200, (q) => {
    assert.ok(!/바나나 셈|개를 먹어 없앴어요|개 먹어 없애고/.test(q.q), q.q);
    if (/바나나 장부(가|:) /.test(q.q) && /빌려 먹/.test(q.q)) hit += 1;
  });
  assert.ok(hit > 10, `문제 ${hit}`);
});

test('15 수면 위아래 높이 — 깊이가 양수인 곳이 없다', () => {
  let hit = 0;
  each(neg, idsOf('mathneg'), 'calc', 1500, (q) => {
    assert.ok(!/바다 네 곳의 깊이/.test(q.q), q.q);
    if (/모투누이 네 곳의 높이가 .*m예요\(수면은 0, 수면 아래는 −\)/.test(q.q)) hit += 1;
  });
  assert.ok(hit > 3, `문제 ${hit}`);
});

test('16 쌓기나무 — 「보이는 것을 세었다」가 아니라 「모두 N개」가 틀린 말', () => {
  let hit = 0;
  each(space, idsOf('mathspace'), 'misread', 800, (q) => {
    assert.ok(!/보이는 쌓기나무를 세었더니/.test(q.q), q.q);
    const m = /쌓기나무는 모두 (\d+)개예요 — 보이는 것을 다 세었어요/.exec(q.q);
    if (m) { hit += 1; const t = /더하면 (\d+)개/.exec(okOf(q)); assert.ok(t && Number(m[1]) < Number(t[1]), `${m[0]} / ${okOf(q)}`); }
  });
  assert.ok(hit > 30, `문제 ${hit}`);
});

test('17 「… 를 계산하면?」은 그릴 때 조사를 고치고, 틀 글·열쇠는 그대로다', () => {
  for (const [a, b] of [
    ['14.58 + 4.81 를 계산하면?', '14.58 + 4.81을 계산하면?'],
    ['10 + 0.48 를 계산하면?', '10 + 0.48을 계산하면?'],
    ['1.2 × 3 를 계산하면?', '1.2 × 3을 계산하면?'],
    ['7 − 2 를 계산하면?', '7 − 2를 계산하면?'],
    ['4 ÷ 0.5 를 계산하면?', '4 ÷ 0.5를 계산하면?'],
    ['3 − 1/2 를 계산하면? (답은 소수로)', '3 − 1/2을 계산하면? (답은 소수로)'],
    ['{ (2 + 3) × 4 } − 10 를 계산하면?', '{ (2 + 3) × 4 } − 10을 계산하면?'],
    ['문제 를 계산하면?', '문제 를 계산하면?'],
    ['3 를 더하면?', '3 를 더하면?'],
  ]) assert.equal(fixNumJosa(a), b);

  // 틀 글을 고치면 q.key가 달라져 🤔 오답 노트가 지워진다 — 36곳 그대로
  const raw = (read('js/mathdec.js') + read('js/mathmix.js')).match(/ 를 계산하면\?/g) || [];
  assert.equal(raw.length, 36);

  let hit = 0;
  const check = (q) => {
    if (!/ 를 계산하면\?/.test(q.q || '')) return;
    hit += 1;
    assert.match(q.key, / 를 계산하면\?/);
    const shown = fixNumJosa(q.q);
    assert.ok(!/ 를 계산하면/.test(shown), shown);
    const m = /([\d.]+)(?:\/(\d+))?([을를]) 계산하면/.exec(shown);
    assert.ok(m, shown);
    assert.equal(m[3], '013678'.includes(m[1].slice(-1)) ? '을' : '를', shown);
  };
  each(dec, idsOf('mathdec'), 'calc', 300, check);
  each(mix, idsOf('mathmix'), 'calc', 300, check);
  assert.ok(hit > 300, `문제 ${hit}`);

  // 🤔 노트가 찾아오는 길 그대로 — 그 열쇠를 want로 주면 같은 틀이 온다 (Codex 198차)
  let back = 0;
  const again = (mk) => (q, id) => {
    if (!/ 를 계산하면\?/.test(q.q || '')) return;
    let g = null;
    for (let t = 0; t < 6 && (!g || g.key !== q.key); t++) g = mk(id, 'calc', 900001 + t * 7919, { worlds, want: { k: 'calc', key: q.key } });
    assert.equal(g && g.key, q.key);
    back += 1;
  };
  each(dec, idsOf('mathdec'), 'calc', 60, again(dec));
  each(mix, idsOf('mathmix'), 'calc', 60, again(mix));
  assert.ok(back > 50, `찾은 틀 ${back}`);

  // ❓ 아빠에게 묻기 짧은 단추도 — 평문이라 직접 고친다
  assert.ok(read('js/math.js').includes('cutLine(fixNumJosa(q1), 26)'));
});

test('18 큰 수가 작은 수로 나누어떨어져야', () => {
  const s = read('js/mathfac.js');
  assert.ok(s.includes('**큰 수가 작은 수로 나누어떨어져야** 약수와 배수의 관계예요.'));
  assert.ok(!s.includes('큰 수를 작은 수로 나누어떨어져야'));
});
