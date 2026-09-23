// 🔢 수학 — B 혼합계산 줄기 (초5 「자연수의 혼합 계산」 + 초6 분수·소수): 개념 사다리 + 문제 생성기 + 내용 형식 검사.
// 순수 함수만 — 화면 없음 (node 테스트에서 그대로 돈다).
//
// 왜 이 줄기인가: **진우가 직접 만들어 달라고 했다** (2026-09-23, 아버님 전달).
// 범위는 아버님 결정 — 초5 자연수부터 초6 분수·소수까지.
//
// 이 단원은 **규칙이 전부**다. 그래서 오답을 "실수"가 아니라 **규칙을 어긴 방식**으로 이름 붙인다:
//   · 왼쪽부터 계산  — 20 − 3 × 4 을 17 × 4 = 68 (가장 흔함)
//   · 괄호 무시      — (12 − 4) × 5 를 12 − 20
//   · 나눗셈을 나중에 — 24 ÷ 3 × 2 를 24 ÷ 6 = 4 ("곱셈이 더 세다"는 오해)
// 이 셋이 ①의 오답이자 📊의 오개념 이름표가 된다.
//
// ★ 답은 **식과 따로** 셈한다 — 생성기가 식 문자열을 만들고 답을 같은 코드로 셈하면 검산이 의미가 없다.
//   그래서 가족(family)마다 답을 **명시적 산술**로 적고, 테스트는 식 문자열을 **독립 파서**로 풀어 대조한다
//   (음수 줄기 Codex 리뷰의 교훈 — 그때 이게 없어서 6/36을 놓칠 뻔했다).

import { figureSvg } from './mathdraw.js';
import { rng, shuffle, fill, tplKey, castOf, worldPick, ask, solve, int, pick, humanQuestion, checkHuman, diagnosticOf, placeFromOf, ladderOf, gcd } from './mathgen.js';

/** 학년 표시 — 이 줄기는 초5·초6뿐이지만 다른 줄기와 같은 규칙을 쓴다 */
export function gradeLabel(g) {
  return g >= 7 ? `중${g - 6}` : `초${g}`;
}

// ───────────────────── 수 — 글자와 값 ─────────────────────

/** 기약분수로 줄인 {n, d} (d는 항상 양수) */
export function reduce(n, d) {
  if (!d) return { n: 0, d: 1 };
  const s = d < 0 ? -1 : 1;
  const g = gcd(Math.abs(n), Math.abs(d)) || 1;
  return { n: (s * n) / g, d: (s * d) / g };
}

/** 분수 → 글자. 분모가 1이면 정수로 ("6/3" 같은 답은 내지 않는다) */
export function fracText(n, d) {
  const r = reduce(n, d);
  return r.d === 1 ? String(r.n) : `${r.n}/${r.d}`;
}

/** 보기 글자 → 값 (겹침 검사용). "3/4" · "2.5" · "12" 를 읽는다. 못 읽으면 null */
export function valueOf(text) {
  const s = String(text == null ? '' : text).trim().replace(/−/g, '-').replace(/\s/g, '');
  if (!s) return null;
  let m = /^(-?\d+)\/(\d+)$/.exec(s);
  if (m) return Number(m[1]) / Number(m[2]);
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  // 문장 속 수 ("답은 12예요") — 값 겹침 검사를 빠져나가지 않게 (음수 줄기 Codex #2).
  // 단 **수가 하나일 때만**. 식으로 된 보기("(500+300)×4")에서 첫 수만 뽑으면
  // 서로 다른 식이 같은 값으로 보여 멀쩡한 문항이 걸린다 (2026-09-24 테스트가 잡음)
  const nums = s.match(/-?\d+(?:\.\d+)?(?:\/\d+)?/g) || [];
  if (nums.length === 1) return valueOf(nums[0]);
  return null;
}

const sameValue = (a, b) => a !== null && b !== null && Math.abs(a - b) < 1e-9;

/** 정답 근처의 그럴듯한 오답 (보기가 모자랄 때만) */
function nearMiss(answer, k) {
  const v = valueOf(answer);
  if (v === null) return '';
  const isFrac = /\//.test(String(answer));
  if (isFrac) {
    const [n, d] = String(answer).split('/').map(Number);
    const alts = [fracText(n + 1, d), fracText(n, d + 1), fracText(n - 1, d), fracText(n * 2, d)];
    return alts[k % alts.length];
  }
  const step = [1, -1, 2, -2, 10, -10, 5, -5][k % 8];
  const nv = v + step;
  if (nv < 0) return '';
  return Number.isInteger(v) ? String(nv) : String(Math.round(nv * 100) / 100);
}

/**
 * 보기 4개 — 정답 + 오개념 오답. **값이 같은 보기는 넣지 않는다**
 * ("2"와 "2.0", "1/2"와 "0.5"는 같은 수다. 글자만 보면 정답이 둘인 문항이 나간다)
 */
function choices(r, answer, wrongs) {
  const seen = new Set([String(answer)]);
  const vals = [valueOf(answer)];
  const list = [{ text: String(answer), ok: true }];
  const dup = (t) => { const v = valueOf(t); return seen.has(String(t)) || (v !== null && vals.some((x) => sameValue(x, v))); };
  const add = (t, tag) => { seen.add(String(t)); vals.push(valueOf(t)); list.push({ text: String(t), ok: false, tag }); };
  for (const w of wrongs) {
    if (!w || w.text === undefined || w.text === '' || dup(w.text) || list.length >= 4) continue;
    add(w.text, w.tag);
  }
  for (let k = 0; list.length < 4 && k < 24; k++) {
    const alt = nearMiss(answer, k);
    if (alt && !dup(alt)) add(alt, '계산 실수');
  }
  return shuffle(r, list);
}

/**
 * 이야기 가족 고르기 — 한 개념에 셈이 다른 틀 묶음이 여럿일 때.
 * 🔁 쌍둥이·🤔 오답 노트(c.want)는 **같은 가족**이어야 같은 셈이 나온다 → want가 든 가족을 먼저.
 * (음수 줄기와 같은 규칙 — 거기서 Codex가 잡아 준 recent 회피까지 그대로)
 */
function pickFamily(r, c, fams) {
  if (c && c.want) {
    const f = fams.find((x) => Object.values(x.pools).flat().some((t) => tplKey(t) === c.want));
    if (f) return f;
  }
  if (c && c.recent && c.recent.length) {
    const fresh = fams.filter((f) => {
      const list = (f.pools[c.world] && f.pools[c.world].length) ? f.pools[c.world] : f.pools.pokemon;
      return list.some((t) => !c.recent.includes(tplKey(t)));
    });
    if (fresh.length) return pick(r, fresh);
  }
  return pick(r, fams);
}

/** ② 오개념 문항의 갈래 — 갈래마다 key('misread:갈래'). 갈래가 하나면 쌍둥이가 다른 유형으로 돌아온다 */
function misreadAsk(c, r, cast, branch, q, chs, o) {
  const a = ask(c.id, 'misread', q, chs, o);
  return { ...a, key: `misread:${branch}` };
}

/** 계산 순서를 보여 주는 풀이 줄 — "① 3 × 4 = 12" */
const step = (no, text) => `${['①', '②', '③', '④'][no] || '·'} ${text}`;

/** 이 줄기의 오개념 이름표 (📊·🤔 노트에 그대로 뜬다) */
export const TAGS = {
  left: '왼쪽부터 계산',
  right: '뒤부터 계산',          // 덧뺄·곱나눗만 있는 식에서 뒤엣것을 먼저 (왼쪽부터가 정답인 자리)
  mulFirst: '곱셈을 먼저',       // 24 ÷ 3 × 2 를 24 ÷ 6 ("곱셈이 나눗셈보다 세다")
  paren: '괄호 무시',
  outer: '바깥 괄호 먼저',
  onlyMul: '곱셈만 먼저',
  common: '곱셈인데 통분',
};

// ───────────────────── 개념 사다리 (B. 혼합계산 줄기) ─────────────────────

export const MIXED = [
  {
    id: 'mix.addsub', grade: 5, name: '덧셈과 뺄셈만 섞인 식', needs: [],
    idea: '덧셈과 뺄셈만 있으면 **앞에서부터 차례로** 계산해요. 순서를 바꾸면 답이 달라져요.',
    calc(r, c) {
      const b = int(r, 3, 9); const d = int(r, 2, 8);
      // a 를 b+d 보다 넉넉히 크게 — 그래야 "뒤부터 계산" 오답 a−(b+d) 도 음수가 안 된다.
      // 아직 음수를 안 배운 아이에게 −3 같은 보기를 내면 무슨 뜻인지 몰라 찍게 된다
      const a = int(r, b + d + 3, 40);
      const fams = [
        // a + b − d
        { expr: `${a} + ${b} − ${d}`, ans: a + b - d, bad: a + (b - d), pools: {
          pokemon: [
            `{me/이/가} 몬스터볼 ${a}개를 가지고 있었어요. ${b}개를 더 받고 ${d}개를 썼어요. 지금 몇 개일까요?`,
            `{mon}의 HP가 ${a}이었는데 ${b} 회복하고 ${d} 깎였어요. 지금 HP는?`,
            `${a} + ${b} − ${d} 를 계산하면?`,
          ],
          toystory: [`보니가 스티커 ${a}장을 가지고 있었어요. ${b}장을 더 받고 ${d}장을 붙였어요. 남은 건?`],
          minions: [`밥이 바나나 ${a}개를 모았어요. ${b}개를 더 받고 ${d}개를 먹었어요. 남은 건?`],
        } },
        // a − b + d  ← 뒤부터 하면 답이 달라지는 자리 (이 개념의 핵심)
        { expr: `${a} − ${b} + ${d}`, ans: a - b + d, bad: a - (b + d), pools: {
          pokemon: [
            `{me/이/가} 코인 ${a}개가 있었어요. ${b}개를 쓰고 ${d}개를 벌었어요. 지금 몇 개일까요?`,
            `${a} − ${b} + ${d} 를 계산하면?`,
            `{mon/이/가} 나무열매 ${a}개 중 ${b}개를 먹고, ${d}개를 더 받았어요. 지금 몇 개일까요?`,
          ],
          toystory: [`우디가 구슬 ${a}개 중 ${b}개를 잃어버리고 ${d}개를 찾았어요. 지금 몇 개일까요?`],
          minions: [`케빈이 바나나 ${a}개 중 ${b}개를 주고 ${d}개를 받았어요. 지금 몇 개일까요?`],
        } },
        // a − b − d
        { expr: `${a} − ${b} − ${d}`, ans: a - b - d, bad: a - (b - d), pools: {
          pokemon: [
            `${a} − ${b} − ${d} 를 계산하면?`,
            `{me/이/가} 코인 ${a}개에서 ${b}개를 쓰고 또 ${d}개를 썼어요. 남은 건?`,
          ],
          toystory: [`보니가 젤리 ${a}개에서 ${b}개를 먹고 또 ${d}개를 먹었어요. 남은 건?`],
        } },
      ];
      const f = pickFamily(r, c, fams);
      const story = worldPick(r, c, f.pools);
      const chs = choices(r, f.ans, [
        { text: f.bad, tag: TAGS.right },
        { text: f.ans + d, tag: '계산 실수' },
      ]);
      return ask(this.id, 'calc', fill(story, c), chs, {
        expr: f.expr,
        solve: solve([step(0, `앞에서부터 — ${f.expr}`), step(1, `답은 ${f.ans}`)], {
          why: { [TAGS.right]: `뒤에 있는 것을 먼저 하면 ${f.bad}이 나와요. 덧셈·뺄셈만 있으면 **왼쪽부터**예요.` },
          rule: '덧셈과 뺄셈만 있으면 앞에서부터 차례로.',
        }),
      });
    },
    misread(r, c) {
      const a = int(r, 15, 40); const b = int(r, 4, 9); const d = int(r, 2, 8);
      const expr = `${a} − ${b} + ${d}`;
      const bad = a - (b + d);
      const q = `{mon/이/가} 이렇게 풀었어요.\n\n**${expr} = ${bad}**\n\n어디가 틀렸을까요?`;
      const chs = choices(r, `${b} + ${d} 를 먼저 했어요`, [
        { text: `${a} − ${b} 를 먼저 했어요`, tag: '바르게 푼 것을 고름' },
        { text: '더하기를 빼기로 했어요', tag: '엉뚱한 지적' },
        { text: '숫자를 잘못 봤어요', tag: '엉뚱한 지적' },
      ]);
      return misreadAsk(this, r, c, 'left', fill(q, c), chs, {
        expr,
        solve: solve([step(0, `${a} − ${b} = ${a - b}`), step(1, `${a - b} + ${d} = ${a - b + d}`)], {
          whyAny: `덧셈·뺄셈만 있으면 왼쪽부터예요. 뒤의 ${b} + ${d}를 먼저 하면 ${bad}이 돼요.`,
          rule: '덧셈과 뺄셈만 있으면 앞에서부터 차례로.',
        }),
      });
    },
  },

  {
    id: 'mix.muldiv', grade: 5, name: '곱셈과 나눗셈만 섞인 식', needs: ['mix.addsub'],
    idea: '곱셈과 나눗셈도 **같은 급**이라 앞에서부터 차례로. "곱셈이 나눗셈보다 먼저"는 틀린 말이에요.',
    calc(r, c) {
      const b = pick(r, [2, 3, 4, 5, 6]);
      const k = pick(r, [2, 3, 4]);
      const a = b * k * int(r, 2, 6); // a ÷ b 가 딱 떨어지게
      const fams = [
        // a ÷ b × k  ← 뒤부터 하면 달라지는 자리
        { expr: `${a} ÷ ${b} × ${k}`, ans: (a / b) * k, bad: a / (b * k), tag: TAGS.mulFirst, pools: {
          pokemon: [
            `{mon/이/가} 사탕 ${a}개를 ${b}명에게 똑같이 나눠 주고, 각자 받은 것을 ${k}배로 늘려 줬어요. 한 명이 몇 개일까요?`,
            `${a} ÷ ${b} × ${k} 를 계산하면?`,
            `{me/이/가} 코인 ${a}개를 ${b}일로 나눠 쓰기로 했는데, 하루에 ${k}배씩 쓰면 하루에 몇 개일까요?`,
          ],
          toystory: [`보니가 블록 ${a}개를 ${b}칸에 똑같이 넣고, 각 칸을 ${k}배로 채웠어요. 한 칸에 몇 개일까요?`],
          minions: [`밥이 바나나 ${a}개를 ${b}묶음으로 나누고, 각 묶음을 ${k}배로 만들었어요. 한 묶음은?`],
        } },
        // a × k ÷ b
        { expr: `${a} × ${k} ÷ ${b}`, ans: (a * k) / b, bad: a * (k / b), tag: TAGS.right, pools: {
          pokemon: [
            `${a} × ${k} ÷ ${b} 를 계산하면?`,
            `{mon/이/가} 나무열매 ${a}개를 ${k}배로 늘리고 ${b}명이 나눠 가졌어요. 한 명이 몇 개일까요?`,
          ],
          toystory: [`우디가 구슬 ${a}개를 ${k}배로 모으고 ${b}명이 나눠 가졌어요. 한 명이 몇 개일까요?`],
        } },
      ];
      const f = pickFamily(r, c, fams);
      const story = worldPick(r, c, f.pools);
      const chs = choices(r, f.ans, [
        { text: Number.isInteger(f.bad) ? f.bad : Math.round(f.bad * 100) / 100, tag: f.tag },
        { text: f.ans * 2, tag: '계산 실수' },
      ]);
      return ask(this.id, 'calc', fill(story, c), chs, {
        expr: f.expr,
        solve: solve([step(0, `앞에서부터 — ${f.expr}`), step(1, `답은 ${f.ans}`)], {
          why: {
            [TAGS.mulFirst]: `뒤의 곱셈을 먼저 하면 ${Math.round(f.bad * 100) / 100}이 나와요. 곱셈과 나눗셈은 **같은 급**이라 왼쪽부터예요.`,
            [TAGS.right]: `뒤엣것을 먼저 하면 ${Math.round(f.bad * 100) / 100}이 나와요. 같은 급끼리는 **왼쪽부터**예요.`,
          },
          rule: '곱셈과 나눗셈만 있으면 앞에서부터 차례로.',
        }),
      });
    },
    misread(r, c) {
      const b = pick(r, [2, 3, 4]); const k = pick(r, [2, 3]); const a = b * k * int(r, 2, 5);
      const expr = `${a} ÷ ${b} × ${k}`;
      const bad = a / (b * k);
      const q = `{mon/이/가} 이렇게 풀었어요.\n\n**${expr} = ${bad}**\n\n어디가 틀렸을까요?`;
      const chs = choices(r, `${b} × ${k} 를 먼저 했어요`, [
        { text: '곱셈이 나눗셈보다 먼저예요', tag: '오개념을 옳다고 함' },
        { text: `${a} ÷ ${b} 를 먼저 했어요`, tag: '바르게 푼 것을 고름' },
        { text: '나누기를 곱하기로 했어요', tag: '엉뚱한 지적' },
      ]);
      return misreadAsk(this, r, c, 'divLast', fill(q, c), chs, {
        expr,
        solve: solve([step(0, `${a} ÷ ${b} = ${a / b}`), step(1, `${a / b} × ${k} = ${(a / b) * k}`)], {
          whyAny: `곱셈과 나눗셈은 같은 급이라 왼쪽부터예요. 뒤의 ${b} × ${k}를 먼저 하면 ${bad}이 돼요.`,
          rule: '곱셈과 나눗셈만 있으면 앞에서부터 차례로.',
        }),
      });
    },
  },

  {
    id: 'mix.order', grade: 5, name: '곱셈·나눗셈을 먼저', needs: ['mix.muldiv'],
    idea: '덧셈·뺄셈과 섞이면 **곱셈·나눗셈을 먼저**. 곱셈은 이미 하나로 묶인 덩어리이기 때문이에요.',
    calc(r, c) {
      const b = int(r, 2, 6); const k = int(r, 2, 6);
      const a = b * k + int(r, 3, 20);       // a − b×k 가 음수가 되지 않게
      const dv = pick(r, [2, 3, 4]); const e = dv * int(r, 2, 6);
      // 나눗셈 가족은 **정답도 오답도 딱 떨어지게** — 초5 아이는 17.67 같은 답을 내지 않는다.
      // (a + e)가 dv로 나뉘도록 a를 조금 올린다 → 왼쪽부터 푼 오답 (a+e)÷dv 도 자연수
      const aDiv = a + ((dv - ((a + e) % dv)) % dv);
      const fams = [
        // a − b × k
        { expr: `${a} − ${b} × ${k}`, ans: a - b * k, bad: (a - b) * k, tag: TAGS.left, pools: {
          pokemon: [
            `{me/이/가} 몬스터볼 ${a}개를 가지고 있었는데, ${b}개짜리 묶음 ${k}개를 썼어요. 남은 건?`,
            `${a} − ${b} × ${k} 를 계산하면?`,
            `{mon}의 HP가 ${a}이었는데 ${b}의 데미지를 ${k}번 맞았어요. 남은 HP는?`,
          ],
          toystory: [`보니가 스티커 ${a}장 중 ${b}장씩 ${k}명에게 줬어요. 남은 건?`],
          minions: [`케빈이 바나나 ${a}개 중 ${b}개씩 ${k}번 먹었어요. 남은 건?`],
        } },
        // a + b × k
        { expr: `${a} + ${b} × ${k}`, ans: a + b * k, bad: (a + b) * k, tag: TAGS.left, pools: {
          pokemon: [
            `${a} + ${b} × ${k} 를 계산하면?`,
            `{me/이/가} 코인 ${a}개가 있는데, ${b}개짜리 보상을 ${k}번 받았어요. 모두 몇 개일까요?`,
          ],
          toystory: [`보니가 블록 ${a}개가 있는데 ${b}개들이 상자 ${k}개를 더 받았어요. 모두 몇 개일까요?`],
        } },
        // a + e ÷ dv
        { expr: `${aDiv} + ${e} ÷ ${dv}`, ans: aDiv + e / dv, bad: (aDiv + e) / dv, tag: TAGS.left, pools: {
          pokemon: [
            `${aDiv} + ${e} ÷ ${dv} 를 계산하면?`,
            `{me/이/가} 코인 ${aDiv}개가 있는데, ${e}개를 ${dv}명이 나눈 몫만큼 더 받았어요. 모두 몇 개일까요?`,
          ],
          toystory: [`우디가 구슬 ${aDiv}개가 있는데, ${e}개를 ${dv}명이 나눈 만큼 더 받았어요. 모두 몇 개일까요?`],
        } },
      ];
      const f = pickFamily(r, c, fams);
      const story = worldPick(r, c, f.pools);
      const chs = choices(r, f.ans, [
        { text: Number.isInteger(f.bad) ? f.bad : Math.round(f.bad * 100) / 100, tag: f.tag },
      ]);
      const [x, op, y] = /×/.test(f.expr) ? ['×', 0, 0] : ['÷', 0, 0];
      return ask(this.id, 'calc', fill(story, c), chs, {
        expr: f.expr,
        solve: solve([
          step(0, `${x === '×' ? '곱셈' : '나눗셈'}을 먼저`),
          step(1, `남은 덧셈·뺄셈`),
          step(2, `답은 ${f.ans}`),
        ], {
          why: { [TAGS.left]: `왼쪽부터 하면 ${Math.round(f.bad * 100) / 100}이 나와요. ${x === '×' ? '곱셈' : '나눗셈'}이 **먼저**예요.` },
          rule: '곱셈·나눗셈을 먼저, 덧셈·뺄셈은 나중에.',
        }),
      });
    },
    misread(r, c) {
      const b = int(r, 2, 6); const k = int(r, 2, 6); const a = b * k + int(r, 3, 15);
      const expr = `${a} − ${b} × ${k}`;
      const bad = (a - b) * k;
      const q = `{mon/이/가} 이렇게 풀었어요.\n\n**${expr} = ${bad}**\n\n어디가 틀렸을까요?`;
      const chs = choices(r, '왼쪽부터 빼기를 먼저 했어요', [
        { text: `${b} × ${k} 를 먼저 했어요`, tag: '바르게 푼 것을 고름' },
        { text: '곱하기를 더하기로 했어요', tag: '엉뚱한 지적' },
        { text: '괄호를 빠뜨렸어요', tag: '엉뚱한 지적' },
      ]);
      return misreadAsk(this, r, c, 'left', fill(q, c), chs, {
        expr,
        solve: solve([step(0, `${b} × ${k} = ${b * k}`), step(1, `${a} − ${b * k} = ${a - b * k}`)], {
          whyAny: `곱셈이 먼저예요. 왼쪽부터 ${a} − ${b} = ${a - b}을 먼저 하면 ${bad}이 돼요.`,
          rule: '곱셈·나눗셈을 먼저, 덧셈·뺄셈은 나중에.',
        }),
      });
    },
  },

  {
    id: 'mix.paren', grade: 5, name: '괄호 ( ) 안을 먼저', needs: ['mix.order'],
    idea: '먼저 하고 싶은 곳을 **괄호**로 묶어요. 괄호가 1등, 그다음 곱셈·나눗셈, 마지막이 덧셈·뺄셈.',
    calc(r, c) {
      const b = int(r, 2, 5); const k = int(r, 2, 6);
      const a = b * k + int(r, 2, 12); // 괄호를 무시한 오답 a − b×k 도 음수가 안 되게
      const dv = pick(r, [2, 3, 4]);
      // p·qn 을 **각각** dv의 배수로 — 그래야 괄호를 무시한 오답 p + qn÷dv 도 자연수가 된다
      const p = dv * int(r, 1, 5); const qn = dv * int(r, 1, 5);
      const fams = [
        // (a + b) × k
        { expr: `(${a} + ${b}) × ${k}`, ans: (a + b) * k, bad: a + b * k, tag: TAGS.paren, pools: {
          pokemon: [
            `{me/이/가} ${a}원짜리와 ${b}원짜리를 한 세트로 ${k}세트 샀어요. 모두 얼마일까요?`,
            `(${a} + ${b}) × ${k} 를 계산하면?`,
            `{mon/이/가} 나무열매를 한 번에 ${a}개와 ${b}개씩 ${k}번 모았어요. 모두 몇 개일까요?`,
          ],
          toystory: [`보니가 ${a}개와 ${b}개를 한 상자에 넣어 ${k}상자를 만들었어요. 모두 몇 개일까요?`],
          minions: [`밥이 바나나 ${a}개와 ${b}개를 한 묶음으로 ${k}묶음 만들었어요. 모두 몇 개일까요?`],
        } },
        // (a − b) × k
        { expr: `(${a} − ${b}) × ${k}`, ans: (a - b) * k, bad: a - b * k, tag: TAGS.paren, pools: {
          pokemon: [
            `(${a} − ${b}) × ${k} 를 계산하면?`,
            `{me/이/가} ${a}개에서 ${b}개를 뺀 만큼을 ${k}번 모았어요. 모두 몇 개일까요?`,
          ],
          toystory: [`우디가 구슬 ${a}개에서 ${b}개를 뺀 만큼씩 ${k}번 담았어요. 모두 몇 개일까요?`],
        } },
        // (p + qn) ÷ dv
        { expr: `(${p} + ${qn}) ÷ ${dv}`, ans: (p + qn) / dv, bad: p + qn / dv, tag: TAGS.paren, pools: {
          pokemon: [
            `(${p} + ${qn}) ÷ ${dv} 를 계산하면?`,
            `{me/이/가} 코인 ${p}개와 ${qn}개를 합쳐 ${dv}명이 똑같이 나눴어요. 한 명이 몇 개일까요?`,
          ],
          toystory: [`보니가 블록 ${p}개와 ${qn}개를 합쳐 ${dv}칸에 똑같이 넣었어요. 한 칸에 몇 개일까요?`],
        } },
      ];
      const f = pickFamily(r, c, fams);
      const story = worldPick(r, c, f.pools);
      const chs = choices(r, f.ans, [
        { text: Number.isInteger(f.bad) ? f.bad : Math.round(f.bad * 100) / 100, tag: f.tag },
      ]);
      return ask(this.id, 'calc', fill(story, c), chs, {
        expr: f.expr,
        solve: solve([step(0, '괄호 안을 먼저'), step(1, '그다음 밖을'), step(2, `답은 ${f.ans}`)], {
          why: { [TAGS.paren]: `괄호를 무시하면 ${Math.round(f.bad * 100) / 100}이 나와요. 괄호가 **1등**이에요.` },
          rule: '괄호 ( ) 안을 가장 먼저.',
        }),
      });
    },
    misread(r, c) {
      const a = int(r, 8, 20); const b = int(r, 2, 6); const k = int(r, 2, 5);
      const expr = `(${a} − ${b}) × ${k}`;
      const bad = a - b * k;
      const q = `{mon/이/가} 이렇게 풀었어요.\n\n**${expr} = ${bad}**\n\n어디가 틀렸을까요?`;
      const chs = choices(r, '괄호를 안 보고 곱셈을 먼저 했어요', [
        { text: `${a} − ${b} 를 먼저 했어요`, tag: '바르게 푼 것을 고름' },
        { text: '괄호 안을 더하기로 했어요', tag: '엉뚱한 지적' },
        { text: '곱하기를 빼기로 했어요', tag: '엉뚱한 지적' },
      ]);
      return misreadAsk(this, r, c, 'paren', fill(q, c), chs, {
        expr,
        solve: solve([step(0, `${a} − ${b} = ${a - b}`), step(1, `${a - b} × ${k} = ${(a - b) * k}`)], {
          whyAny: `괄호가 1등이에요. 괄호를 무시하고 ${b} × ${k}를 먼저 하면 ${bad}이 돼요.`,
          rule: '괄호 ( ) 안을 가장 먼저.',
        }),
      });
    },
  },

  {
    id: 'mix.brace', grade: 5, name: '중괄호 { } 까지', needs: ['mix.paren'],
    idea: '괄호가 겹치면 **안쪽부터** — 소괄호 다음 중괄호. 괄호 안에서도 곱셈·나눗셈이 먼저예요.',
    calc(r, c) {
      const a = int(r, 3, 9); const b = int(r, 2, 8); const k = int(r, 2, 4);
      // sub 는 **괄호를 무시한 값**(a + b×k)보다 작게 — 그래야 오답도 음수가 안 된다
      // (정답 (a+b)×k − sub 는 언제나 그보다 크므로 함께 안전하다)
      const sub = int(r, 1, Math.max(1, a + b * k - 1));
      const dv = pick(r, [2, 3]); const e = int(r, 2, 6);
      // 둘 다 dv의 배수 — 괄호 안도, 괄호를 무시한 오답도 자연수로 떨어진다
      const lo = dv * int(r, 1, 4); const big = lo + dv * int(r, 1, 5);
      const fams = [
        // { (a + b) × k − sub } 형태는 수가 커져 아이가 지친다 → 두 단계까지만
        { expr: `{ (${a} + ${b}) × ${k} } − ${sub}`, ans: (a + b) * k - sub, bad: a + b * k - sub, tag: TAGS.paren, pools: {
          pokemon: [
            `{ (${a} + ${b}) × ${k} } − ${sub} 를 계산하면?`,
            `{me/이/가} ${a}개와 ${b}개를 한 묶음으로 ${k}묶음 만들고, 그중 ${sub}개를 썼어요. 남은 건?`,
          ],
          toystory: [`보니가 ${a}개와 ${b}개를 한 상자로 ${k}상자 만들고 ${sub}개를 꺼냈어요. 남은 건?`],
        } },
        // { (big − lo) ÷ dv } + e — big·lo 둘 다 dv의 배수라 깔끔하게 떨어진다
        { expr: `{ (${big} − ${lo}) ÷ ${dv} } + ${e}`,
          ans: (big - lo) / dv + e,
          bad: big - lo / dv + e, tag: TAGS.paren, pools: {
            pokemon: [
              `{ (${big} − ${lo}) ÷ ${dv} } + ${e} 를 계산하면?`,
              `{me/이/가} 코인 ${big}개에서 ${lo}개를 쓰고, 남은 것을 ${dv}명이 나눈 뒤 ${e}개를 더 받았어요. 몇 개일까요?`,
            ],
            toystory: [`우디가 구슬 ${big}개에서 ${lo}개를 빼고 ${dv}명이 나눈 뒤 ${e}개를 더 받았어요. 몇 개일까요?`],
          } },
      ];
      const f = pickFamily(r, c, fams);
      const story = worldPick(r, c, f.pools);
      const chs = choices(r, f.ans, [
        { text: Number.isInteger(f.bad) ? f.bad : Math.round(f.bad * 100) / 100, tag: f.tag },
      ]);
      return ask(this.id, 'calc', fill(story, c), chs, {
        expr: f.expr,
        solve: solve([step(0, '소괄호 ( ) 부터'), step(1, '그다음 중괄호 { }'), step(2, `답은 ${f.ans}`)], {
          why: {
            [TAGS.paren]: `괄호를 무시하면 ${Math.round(f.bad * 100) / 100}이 나와요. 양파 껍질처럼 **안쪽부터**예요.`,
            [TAGS.outer]: '중괄호를 먼저 풀면 안 돼요. 소괄호가 안쪽이라 먼저예요.',
          },
          rule: '괄호는 안쪽부터 — 소괄호 ( ) 다음 중괄호 { }.',
        }),
      });
    },
    misread(r, c) {
      const a = int(r, 3, 8); const b = int(r, 2, 7); const k = int(r, 2, 4);
      const expr = `{ (${a} + ${b}) × ${k} }`;
      const bad = a + b * k;
      const q = `{mon/이/가} 이렇게 풀었어요.\n\n**${expr} = ${bad}**\n\n어디가 틀렸을까요?`;
      const chs = choices(r, '소괄호를 안 보고 곱셈을 먼저 했어요', [
        { text: '중괄호를 먼저 풀었어요', tag: TAGS.outer },
        { text: `${a} + ${b} 를 먼저 했어요`, tag: '바르게 푼 것을 고름' },
        { text: '중괄호는 계산하지 않아요', tag: '엉뚱한 지적' },
      ]);
      return misreadAsk(this, r, c, 'paren', fill(q, c), chs, {
        expr,
        solve: solve([step(0, `${a} + ${b} = ${a + b}`), step(1, `${a + b} × ${k} = ${(a + b) * k}`)], {
          whyAny: `안쪽 소괄호가 먼저예요. 소괄호를 무시하면 ${bad}이 돼요.`,
          rule: '괄호는 안쪽부터.',
        }),
      });
    },
  },

  {
    id: 'mix.four', grade: 5, name: '네 가지가 모두 섞인 식', needs: ['mix.brace'],
    idea: '긴 식도 규칙은 같아요. **괄호 → 곱셈·나눗셈 → 덧셈·뺄셈**, 한 줄에 한 단계만 고치며 줄여 가요.',
    calc(r, c) {
      const dv = pick(r, [2, 3, 4, 5]); const p = int(r, 1, dv - 1); const qn = dv - p; // p + qn = dv
      const big = dv * int(r, 3, 8);
      const b = int(r, 2, 5); const k = int(r, 2, 5); const sub = int(r, 1, 9);
      const base = dv * b + int(r, 5, 30); // 정답 base − dv×b 가 음수가 안 되게
      const fams = [
        // big ÷ (p + qn) + b × k − sub
        { expr: `${big} ÷ (${p} + ${qn}) + ${b} × ${k} − ${sub}`,
          ans: big / dv + b * k - sub,
          bad: ((big / (p + qn) + b) * k) - sub, tag: TAGS.left, pools: {
            pokemon: [
              `${big} ÷ (${p} + ${qn}) + ${b} × ${k} − ${sub} 를 계산하면?`,
              `{me/이/가} 코인 ${big}개를 ${p}명과 ${qn}명이 함께 나누고, ${b}개짜리 보상을 ${k}번 받고, ${sub}개를 썼어요. 몇 개일까요?`,
            ],
            toystory: [`보니가 블록 ${big}개를 ${p}칸과 ${qn}칸에 나누고, ${b}개씩 ${k}번 더 받고 ${sub}개를 썼어요. 몇 개일까요?`],
          } },
        // base − { (p + qn) × b } ÷ dv 형태 대신 조금 짧게: base − (p + qn) × b + sub
        { expr: `${base} − (${p} + ${qn}) × ${b} + ${sub}`,
          ans: base - dv * b + sub,
          bad: (base - p) + qn * b + sub, tag: TAGS.paren, pools: {
            pokemon: [
              `${base} − (${p} + ${qn}) × ${b} + ${sub} 를 계산하면?`,
              `{mon}의 HP가 ${base}인데, ${p}과 ${qn}을 합친 만큼의 데미지를 ${b}번 맞고 ${sub} 회복했어요. HP는?`,
            ],
            toystory: [`우디가 구슬 ${base}개에서 ${p}개와 ${qn}개를 합친 만큼 ${b}번 잃고 ${sub}개를 찾았어요. 몇 개일까요?`],
          } },
      ];
      const f = pickFamily(r, c, fams);
      const story = worldPick(r, c, f.pools);
      const chs = choices(r, f.ans, [
        { text: Number.isInteger(f.bad) ? f.bad : Math.round(f.bad * 100) / 100, tag: f.tag },
      ]);
      return ask(this.id, 'calc', fill(story, c), chs, {
        expr: f.expr,
        solve: solve([step(0, '괄호 먼저'), step(1, '곱셈·나눗셈'), step(2, '남은 덧셈·뺄셈을 왼쪽부터'), step(3, `답은 ${f.ans}`)], {
          why: {
            [TAGS.left]: '왼쪽부터 쭉 계산하면 안 돼요. 괄호 → 곱셈·나눗셈 → 덧셈·뺄셈이에요.',
            [TAGS.paren]: '괄호가 1등이에요. 괄호 안을 먼저 하나로 만들어요.',
          },
          rule: '괄호 → 곱셈·나눗셈 → 덧셈·뺄셈. 같은 급은 왼쪽부터.',
        }),
      });
    },
    misread(r, c) {
      const b = int(r, 2, 5); const k = int(r, 2, 5); const a = b * k + int(r, 5, 20); const add = int(r, 2, 9);
      const expr = `${a} − ${b} × ${k} + ${add}`;
      const bad = a - (b * k + add);
      const q = `{mon/이/가} 이렇게 풀었어요.\n\n**${expr} = ${bad}**\n\n어디가 틀렸을까요?`;
      const chs = choices(r, `${b} × ${k} 와 ${add} 를 먼저 합쳤어요`, [
        { text: `${b} × ${k} 를 먼저 했어요`, tag: '바르게 푼 것을 고름' },
        { text: '더하기를 빼기로 했어요', tag: '엉뚱한 지적' },
        { text: '괄호를 무시했어요', tag: '엉뚱한 지적' },
      ]);
      return misreadAsk(this, r, c, 'left', fill(q, c), chs, {
        expr,
        solve: solve([step(0, `${b} × ${k} = ${b * k}`), step(1, `${a} − ${b * k} = ${a - b * k}`), step(2, `${a - b * k} + ${add} = ${a - b * k + add}`)], {
          whyAny: `곱셈을 먼저 한 건 맞지만, 남은 뺄셈·덧셈은 **왼쪽부터**예요. 뒤를 먼저 합치면 ${bad}이 돼요.`,
          rule: '같은 급은 왼쪽부터.',
        }),
      });
    },
  },

  {
    id: 'mix.frac', grade: 6, name: '분수가 섞인 혼합 계산', needs: ['mix.four'],
    idea: '숫자가 분수여도 순서는 그대로. **통분은 더하고 뺄 때만** 해요 (곱셈은 통분하지 않아요).',
    calc(r, c) {
      const d = pick(r, [2, 3, 4, 6]);
      const n1 = int(r, 1, d - 1);
      const d2 = pick(r, [2, 4, 6, 8]);
      const n2 = int(r, 1, d2 - 1);
      const k = pick(r, [2, 3, 4]);
      // ① n1/d + n2/d2 × k
      const mulN = n2 * k; const mulD = d2;
      const ansA = reduce(n1 * mulD + mulN * d, d * mulD);
      const badA = reduce((n1 * d2 + n2 * d) * k, d * d2); // 앞에서부터 더한 뒤 곱함
      // ② (n1/d + n2/d2) × k
      const sum = reduce(n1 * d2 + n2 * d, d * d2);
      const ansB = reduce(sum.n * k, sum.d);
      const badB = reduce(n1 * d2 + n2 * k * d, d * d2); // 괄호 무시: 뒤 분수만 곱함
      const fams = [
        { expr: `${n1}/${d} + ${n2}/${d2} × ${k}`, ans: fracText(ansA.n, ansA.d), bad: fracText(badA.n, badA.d), tag: TAGS.left, pools: {
          pokemon: [
            `${n1}/${d} + ${n2}/${d2} × ${k} 를 계산하면?`,
            `{me/이/가} 피자 ${n1}/${d}판을 먹고, ${n2}/${d2}판씩 ${k}번 더 먹었어요. 모두 얼마일까요?`,
          ],
          toystory: [`보니가 케이크 ${n1}/${d}판을 먹고 ${n2}/${d2}판씩 ${k}번 더 먹었어요. 모두 얼마일까요?`],
        } },
        { expr: `(${n1}/${d} + ${n2}/${d2}) × ${k}`, ans: fracText(ansB.n, ansB.d), bad: fracText(badB.n, badB.d), tag: TAGS.paren, pools: {
          pokemon: [
            `(${n1}/${d} + ${n2}/${d2}) × ${k} 를 계산하면?`,
            `{me/이/가} 한 번에 ${n1}/${d}판과 ${n2}/${d2}판을 먹기를 ${k}번 했어요. 모두 얼마일까요?`,
          ],
          toystory: [`우디가 한 번에 ${n1}/${d}컵과 ${n2}/${d2}컵을 담기를 ${k}번 했어요. 모두 얼마일까요?`],
        } },
      ];
      const f = pickFamily(r, c, fams);
      const story = worldPick(r, c, f.pools);
      const chs = choices(r, f.ans, [{ text: f.bad, tag: f.tag }]);
      return ask(this.id, 'calc', fill(story, c), chs, {
        expr: f.expr,
        solve: solve([step(0, '곱셈 먼저 (통분하지 않아요)'), step(1, '그다음 덧셈 — 여기서 통분'), step(2, `답은 ${f.ans}`)], {
          why: {
            [TAGS.left]: '분수여도 곱셈이 먼저예요. 앞에서부터 더하면 안 돼요.',
            [TAGS.paren]: '괄호 안을 먼저 하나로 만든 뒤에 곱해요.',
            [TAGS.common]: '곱셈은 통분하지 않아요. 분자끼리, 분모끼리 곱해요.',
          },
          rule: '분수여도 순서는 그대로. 통분은 더하고 뺄 때만.',
        }),
      });
    },
    misread(r, c) {
      const d = pick(r, [2, 3, 4]); const n1 = int(r, 1, d - 1);
      const d2 = pick(r, [4, 6, 8]); const n2 = int(r, 1, d2 - 1);
      const k = pick(r, [2, 3]);
      const bad = reduce((n1 * d2 + n2 * d) * k, d * d2);
      const expr = `${n1}/${d} + ${n2}/${d2} × ${k}`;
      const q = `{mon/이/가} 이렇게 풀었어요.\n\n**${expr} = ${fracText(bad.n, bad.d)}**\n\n어디가 틀렸을까요?`;
      const chs = choices(r, '덧셈을 먼저 했어요', [
        { text: '곱셈을 먼저 했어요', tag: '바르게 푼 것을 고름' },
        { text: '곱셈에서 통분을 안 했어요', tag: TAGS.common },
        { text: '분모끼리 더했어요', tag: '엉뚱한 지적' },
      ]);
      return misreadAsk(this, r, c, 'left', fill(q, c), chs, {
        expr,
        solve: solve([step(0, `${n2}/${d2} × ${k} 를 먼저`), step(1, '그다음 통분해서 더하기')], {
          whyAny: '분수여도 곱셈이 먼저예요. 앞에서부터 더하면 답이 달라져요.',
          rule: '분수여도 순서는 그대로.',
        }),
      });
    },
  },

  {
    id: 'mix.dec', grade: 6, name: '소수·분수가 섞인 혼합 계산', needs: ['mix.frac'],
    idea: '소수도 규칙은 같아요. 분수와 소수가 함께 나오면 **한쪽 모양으로 맞춰서** 계산해요.',
    calc(r, c) {
      const half = pick(r, [5, 25, 75]);          // 0.5 · 0.25 · 0.75
      const dec = half / 100;
      const k = pick(r, [2, 4, 8]);
      const a = int(r, 2, 12);
      const round2 = (v) => Math.round(v * 100) / 100;
      const fams = [
        // a − dec × k
        { expr: `${a} − ${dec} × ${k}`, ans: round2(a - dec * k), bad: round2((a - dec) * k), tag: TAGS.left, pools: {
          pokemon: [
            `${a} − ${dec} × ${k} 를 계산하면?`,
            `{me/이/가} 물 ${a}리터에서 ${dec}리터씩 ${k}번 따랐어요. 남은 건 몇 리터일까요?`,
          ],
          toystory: [`보니가 주스 ${a}컵에서 ${dec}컵씩 ${k}번 마셨어요. 남은 건 몇 컵일까요?`],
        } },
        // dec × k + a
        { expr: `${dec} × ${k} + ${a}`, ans: round2(dec * k + a), bad: round2(dec * (k + a)), tag: TAGS.right, pools: {
          pokemon: [
            `${dec} × ${k} + ${a} 를 계산하면?`,
            `{mon/이/가} ${dec}kg짜리를 ${k}개 들고 ${a}kg을 더 들었어요. 모두 몇 kg일까요?`,
          ],
          toystory: [`우디가 ${dec}kg짜리 ${k}개와 ${a}kg을 함께 들었어요. 모두 몇 kg일까요?`],
        } },
        // dec × k − 1/2  (소수와 분수가 함께)
        { expr: `${dec} × ${k} − 1/2`, ans: round2(dec * k - 0.5), bad: round2(dec * (k - 0.5)), tag: TAGS.right, pools: {
          pokemon: [
            `${dec} × ${k} − 1/2 를 계산하면? (답은 소수로)`,
            `{me/이/가} ${dec}리터씩 ${k}병을 모으고 1/2리터를 썼어요. 남은 건 몇 리터일까요?`,
          ],
          toystory: [`보니가 ${dec}컵씩 ${k}번 담고 1/2컵을 썼어요. 남은 건 몇 컵일까요?`],
        } },
      ];
      const f = pickFamily(r, c, fams);
      const story = worldPick(r, c, f.pools);
      const chs = choices(r, f.ans, [{ text: f.bad, tag: f.tag }]);
      return ask(this.id, 'calc', fill(story, c), chs, {
        expr: f.expr,
        solve: solve([step(0, '곱셈 먼저'), step(1, '그다음 덧셈·뺄셈 (소수점 자리 맞춰서)'), step(2, `답은 ${f.ans}`)], {
          why: {
            [TAGS.left]: `왼쪽부터 하면 ${f.bad}이 나와요. 소수여도 곱셈이 **먼저**예요.`,
            [TAGS.right]: `뒤엣것을 먼저 묶으면 ${f.bad}이 나와요. 곱셈을 먼저 하고 남은 것을 왼쪽부터예요.`,
          },
          rule: '소수·분수가 섞여도 순서는 그대로.',
        }),
      });
    },
    misread(r, c) {
      const dec = pick(r, [0.5, 0.25, 0.75]);
      const k = pick(r, [2, 4]); const a = int(r, 2, 9);
      const bad = Math.round((a - dec) * k * 100) / 100;
      const expr = `${a} − ${dec} × ${k}`;
      const q = `{mon/이/가} 이렇게 풀었어요.\n\n**${expr} = ${bad}**\n\n어디가 틀렸을까요?`;
      const chs = choices(r, '왼쪽부터 빼기를 먼저 했어요', [
        { text: `${dec} × ${k} 를 먼저 했어요`, tag: '바르게 푼 것을 고름' },
        { text: '소수점을 잘못 찍었어요', tag: '엉뚱한 지적' },
        { text: '소수는 분수로 바꿔야 해요', tag: '엉뚱한 지적' },
      ]);
      return misreadAsk(this, r, c, 'left', fill(q, c), chs, {
        expr,
        solve: solve([step(0, `${dec} × ${k} = ${Math.round(dec * k * 100) / 100}`), step(1, `${a} − ${Math.round(dec * k * 100) / 100}`)], {
          whyAny: `소수여도 곱셈이 먼저예요. 왼쪽부터 하면 ${bad}이 돼요.`,
          rule: '소수여도 순서는 그대로.',
        }),
      });
    },
  },
];

export function conceptById(id) {
  return MIXED.find((c) => c.id === id) || null;
}

// ───────────────────── 문항 만들기 (mathgen·mathneg와 같은 모양) ─────────────────────

/**
 * 개념 하나의 문항 한 개. 화면은 줄기 객체만 바꿔 끼운다.
 * @param {'calc'|'misread'|'why'|'special'} kind
 */
export function makeQuestion(conceptId, kind, seed, opts) {
  const c = conceptById(conceptId);
  if (!c) return null;
  const r = rng(seed);
  const cast = castOf(r, opts);
  if (cast.wantKind && cast.wantKind !== kind) cast.want = '';
  if (kind === 'why' || kind === 'special') return humanQuestion(c, kind, r, cast, opts);
  const q = kind === 'misread' ? c.misread(r, cast) : c.calc(r, cast);
  return q ? { ...q, key: q.key || cast.key || '' } : q;
}

/** 개념 한 편 = ①②③ (+ ⭐가 있으면 하나 더) */
export function makeRound(conceptId, seed, opts) {
  const out = ['calc', 'misread', 'why'].map((k, i) => makeQuestion(conceptId, k, seed + i * 7919, opts));
  const sp = makeQuestion(conceptId, 'special', seed + 3 * 7919, opts);
  if (sp) out.push(sp);
  return out.filter(Boolean);
}

/** 📚 배움 — 사람이 쓴 단계식 배움에 출연진을 끼워 돌려준다 */
export function lessonOf(conceptId, seed, opts) {
  const c = conceptById(conceptId);
  if (!c) return null;
  const cast = castOf(rng(seed), opts);
  const v = opts && opts.content && opts.content[conceptId];
  if (!v || !Array.isArray(v.lesson)) return { title: c.name, pages: [{ say: fill(c.idea, cast), check: null }], rule: c.idea };
  const pages = v.lesson.map((p) => ({
    say: fill(p.say, cast),
    check: p.check ? { q: fill(p.check.q, cast), ok: fill(p.check.ok, cast), no: p.check.no.map((t) => fill(t, cast)), why: fill(p.check.why, cast) } : null,
  }));
  return { title: c.name, pages, rule: v.rule || c.idea };
}

/** 📏 진단 5문제 — 사다리에서 고르게 */
export function diagnosticSet(seed, n = 5, opts) {
  return diagnosticOf(MIXED, makeQuestion, seed, n, opts);
}
export function placeFrom(answers) {
  return placeFromOf(MIXED, answers);
}
export function ladder(doneIds) {
  return ladderOf(MIXED, doneIds);
}

// ───────────────────── 사람이 쓴 내용 검사 (check.mjs가 부른다) ─────────────────────

function badPlaceholders(txt) {
  const leak = String(txt || '').match(/\{[^}]*\}/g) || [];
  // 중괄호 식 `{ (3 + 5) × 4 }` 는 이 줄기에서 **정상**이다 — 숫자·기호만 든 중괄호는 통과시킨다
  return leak.filter((l) => !/^\{(me|mon|mon2)(\/[^/}]+\/[^}]+)?\}$/.test(l) && !/^\{[\s\d+\-−×÷*/().]+\}$/.test(l));
}
function badFigures(txt) {
  const figs = String(txt || '').match(/\[[a-z]+ [^\]]+\]/g) || [];
  return figs.filter((f) => !figureSvg(f.slice(1, -1)));
}

/**
 * coach/math/mixed.json 형식 검사 — 배포로 실려 가므로 check.mjs가 부른다.
 * @returns {string[]} 문제 목록 (비어 있으면 통과)
 */
export function checkContent(content) {
  const bad = [];
  for (const c of MIXED) {
    const v = content && content[c.id];
    if (!v) { bad.push(`${c.id}: 내용 없음`); continue; }
    if (!Array.isArray(v.lesson) || v.lesson.length < 3) bad.push(`${c.id}: lesson 3장 이상이어야 함`);
    if (!v.rule) bad.push(`${c.id}: rule 없음`);
    const checks = (v.lesson || []).filter((p) => p && p.check);
    if (checks.length < 2) bad.push(`${c.id}: 확인 질문 2개 이상이어야 함`);
    for (const [i, p] of (v.lesson || []).entries()) {
      if (!p || !p.say) { bad.push(`${c.id}[${i}]: say 없음`); continue; }
      for (const l of badPlaceholders(p.say)) bad.push(`${c.id}[${i}]: 잘못된 자리표시 ${l}`);
      for (const f of badFigures(p.say)) bad.push(`${c.id}[${i}]: 못 그리는 그림 ${f}`);
      if (!p.check) continue;
      const ck = p.check;
      if (!ck.q || !ck.ok || !Array.isArray(ck.no) || !ck.no.length || !ck.why) { bad.push(`${c.id}[${i}]: check 칸이 빔`); continue; }
      for (const l of badPlaceholders(`${ck.q} ${ck.ok} ${ck.no.join(' ')} ${ck.why}`)) bad.push(`${c.id}[${i}]: 잘못된 자리표시 ${l}`);
      // 정답과 **값**이 같은 오답은 정답이 둘인 문항이 된다
      const ov = valueOf(ck.ok);
      for (const n of ck.no) {
        if (String(n).trim() === String(ck.ok).trim()) bad.push(`${c.id}[${i}]: 정답이 오답에도 있음`);
        const nv = valueOf(n);
        if (ov !== null && nv !== null && sameValue(ov, nv)) bad.push(`${c.id}[${i}]: 값이 같은 보기 (${ck.ok} = ${n})`);
      }
      if (new Set(ck.no.map((n) => String(n).trim())).size !== ck.no.length) bad.push(`${c.id}[${i}]: 오답끼리 겹침`);
    }
    const d = v.dad;
    if (!d || !d.goal || !Array.isArray(d.say) || !d.say.length || !d.do) bad.push(`${c.id}: 아빠 카드 미완`);
    if (d && (!Array.isArray(d.traps) || !d.traps.length || !d.pass)) bad.push(`${c.id}: 아빠 카드 함정·통과 기준 없음`);
    // ③ why · ⭐ special 은 분수·음수 줄기와 같은 형식
    if (v.why) bad.push(...checkHuman(c.id, v.why, [], valueOf));
    if (v.special) bad.push(...checkHuman(c.id, v.special, [], valueOf));
  }
  return bad;
}
