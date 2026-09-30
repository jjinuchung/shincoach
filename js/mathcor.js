// 🔢 수학 — H 규칙과 대응 줄기 (초4 「규칙 찾기」 → 초5 1학기 「규칙과 대응」):
// 개념 사다리 + 문제 생성기 + 내용 형식 검사. 순수 함수만 — 화면 없음 (node 테스트에서 그대로 돈다).
//
// 왜 이 줄기인가 (2026-09-30, 아버님 "다음 줄기로 규칙과 대응 만들어보자"): F 비례식, 중1 정비례, D 문자와 식(x·y)이
// "두 양의 대응 관계를 식으로 쓴다"를 안다고 치는데 가르치는 칸이 없었다. 글자 D는 문자와 식 몫, G까지 썼으므로 H.
//
// 오답은 아이가 실제로 하는 틀린 생각 흉내다:
//   · ★ 표에서 **옆으로 늘어나는 수**를 대응 규칙으로 봄 (△가 4씩 커지니까 △ = □ + 4 — 실은 □ × 4)
//   · 첫 칸만 보고 규칙을 정함 (1 → 4니까 + 3) · □와 △를 거꾸로 씀 (□ = △ × 4)
//   · 거꾸로 구할 때 같은 셈 (△ = □ × 6, △ 72 → 72 × 6) · 차이가 그대로인 관계를 배로 봄 (함께 오르는 레벨)
//   · 통나무 도막 수 = 자른 횟수 · 곱해 가는 수 배열을 더하기로 봄 · 몇 번째를 한 칸 밀려 셈
//
// 새 줄기의 함정(메모 stem-generator-pitfalls)을 처음부터:
//   · 🔁 쌍둥이 틀 이름(tplKey)이 수에 따라 갈리지 않게 — 몇 번째는 **숫자**("10번째"), 표는 칸 수·? 자리 고정,
//     물건 이야기(탁자·상자…)·도시는 `pickFor`로 요청한 틀의 것을 다시 고른다
//   · 대응표·도형 배열은 **문제 글 안의 그림 지시문**([table …] [steps …]) — ❓ 복사문·테스트가 글에서 표를 읽는다
//   · ② 갈래는 요청(want)을 따르고, 진단 보기가 그 예에서 우연히 맞는 말이 되지 않게
//   · 이름표는 값만이 아니라 **방향**까지 (앞으로/거꾸로·어느 양이 큰가)
//
// ★ 답은 테스트가 문제 글·표·그림 지시문을 **직접 읽어** 규칙을 따로 찾고 다시 푼다.

import { figureSvg } from './mathdraw.js';
import { rng, shuffle, fill, castOf, worldPick, ask, solve, int, pick, pickFamily, humanQuestion, checkHuman, diagnosticOf, placeFromOf, ladderOf, josa, numJosa } from './mathgen.js';
import { gradeLabel, valueOf as numValue } from './mathmix.js';

export { gradeLabel };

// ───────────────────── 글자 ─────────────────────

const L = (arr) => arr.join(', ');
const range = (n, f) => Array.from({ length: n }, (_, i) => f(i));

/**
 * 보기 글자 → 값 (겹침 검사용). 식("△ = □ × 4")·문장 보기는 null — mathmix.valueOf는 수가 하나뿐인 글에서
 * 그 수를 값으로 읽으므로 "△ = □ × 4"와 "△ = □ + 4"가 같은 4로 보여 한쪽이 버려진다
 */
export function valueOf(text) {
  const s = String(text == null ? '' : text).trim();
  if (/[□△]/.test(s)) return null;
  if (/[가-힣]/.test(s.replace(/(개|대|마리|번째|번|시)$/, ''))) return null;
  return numValue(s);
}
const sameValue = (a, b) => a !== null && b !== null && Math.abs(a - b) < 1e-9;

// ── 조사 — 수 뒤에서는 읽는 소리로. □(네모)·△(세모)는 받침이 없어 가·를·는·와·라고 ──
const BAT = new Set(['0', '1', '3', '6', '7', '8']);
const lastDigit = (t) => String(t).replace(/\D+$/, '').slice(-1);
/** 수 글자 + 조사 (이/가·을/를·은/는·과/와·이에요/예요·이라서/라서…) */
function jn(t, withB, without) {
  const s = String(t);
  return s + (BAT.has(lastDigit(s)) ? withB : without);
}
/** 수 글자 + (으)로 — ㄹ받침(1·7·8) 뒤에는 '로' */
function ro(t) {
  const s = String(t);
  return s + numJosa(Number(lastDigit(s)), '으로', '로');
}
/** 낱말 + 조사 (탁자가·몬스터볼이·방콕은) */
const jw = (w, a, b) => w + josa(w, a, b);

// ───────────────────── 보기 ─────────────────────

/** 정답 근처의 "계산 실수" — 보기가 모자랄 때만 (자연수 답) */
function nearOf(answer, k) {
  const v = Number(answer); const st = [1, -1, 2, -2, 3, -3, 5, -5][k % 8];
  return Number.isInteger(v) && v + st > 0 ? String(v + st) : '';
}
/** 수 보기 4개 — 정답 + 오개념 오답. 글자·값이 같은 보기는 넣지 않는다 */
function choices(r, answer, wrongs) {
  const list = [{ text: String(answer), ok: true }];
  const vals = [valueOf(answer)];
  const seen = new Set([String(answer)]);
  const dup = (t) => { const v = valueOf(t); return seen.has(String(t)) || (v !== null && vals.some((x) => sameValue(x, v))); };
  const add = (t, tag) => { seen.add(String(t)); vals.push(valueOf(t)); list.push({ text: String(t), ok: false, tag }); };
  for (const w of wrongs) {
    if (!w || w.text === undefined || w.text === '' || Number(w.text) <= 0 || dup(w.text) || list.length >= 4) continue;
    add(w.text, w.tag);
  }
  for (let k = 0; list.length < 4 && k < 30; k++) {
    const alt = nearOf(answer, k);
    if (alt && !dup(alt)) add(alt, '계산 실수');
  }
  return shuffle(r, list);
}
/** 식·문장 보기 — 근처 수로 채우지 않는다 (채운 식이 우연히 표에 맞으면 답이 둘이 된다) */
function textChoices(r, ok, wrongs) {
  const list = [{ text: ok, ok: true }];
  const seen = new Set([ok]);
  for (const w of wrongs) {
    if (!w || !w.text || seen.has(w.text) || list.length >= 4) continue;
    seen.add(w.text);
    list.push({ text: w.text, ok: false, tag: w.tag });
  }
  return shuffle(r, list);
}

/** ② 갈래 고르기 — 🔁 쌍둥이·🤔 오답 노트가 요청한 갈래를 먼저 (Codex 12차 P1, 다른 줄기와 같은 규칙) */
function branchOf(r, c, names) {
  const want = c && c.want && c.want.startsWith('misread:') ? c.want.slice(8) : '';
  if (names.includes(want)) return want;
  const fresh = names.filter((n) => !(c && c.recent && c.recent.includes(`misread:${n}`)));
  return pick(r, fresh.length ? fresh : names);
}
/** 요청한 틀(want)에 든 물건·도시를 다시 고른다 — 무작위로 새로 뽑으면 🔁 쌍둥이가 다른 틀로 간다 (mathrat pickFor) */
function pickFor(r, c, list, has) {
  if (c && c.want) {
    const hit = list.filter((x) => has(x, c.want));
    if (hit.length) return hit[hit.length - 1];
  }
  return pick(r, list);
}
const showWork = (line, verb = '말했어요') => `{mon/이/가} 이렇게 ${verb}.\n\n**${line}**\n\n어디가 틀렸을까요?`;
const step = (no, text) => `${['①', '②', '③', '④'][no] || '·'} ${text}`;

const RIGHT_AS_WRONG = '틀린 줄 모름';
const OFF = '엉뚱한 지적';
const MIS_OK = '오개념을 옳다고 함';

/** 이 줄기의 오개념 이름표 (📊·🤔 노트에 그대로 뜬다) */
export const TAGS = {
  addForMul: '곱하는 규칙을 더하기로 봄',        // 3, 6, 12, 24 → 27 · 탁자 5개면 의자 5 + 4
  growDiff: '늘어나는 차이를 못 봄',             // 3, 6, 12, 24 → 36 (마지막 차이 12를 또 더함)
  mulForAdd: '더하는 규칙을 곱하기로 봄',        // 표 1 → 4를 보고 × 4 (실은 + 3)
  offByOne: '몇 번째를 한 칸 밀려 셈',           // 10번째 = 처음 수 + 늘어나는 수 × 10
  nextOnly: '바로 다음 것만 구함',
  noStart: '처음 수를 빠뜨림',                    // 10번째 = 늘어나는 수 × 10
  wrongDir: '커지는지 작아지는지 거꾸로 봄',
  countAsStep: '놓인 수를 늘어나는 수로 봄',      // 1번째 모양 5개 → "5개씩 늘어요"
  stepAsRule: '옆으로 늘어나는 수를 대응 규칙으로 봄', // ★ △가 4씩 커지니까 △ = □ + 4
  firstPairOnly: '첫 칸만 보고 규칙을 정함',      // 1 → 4니까 △ = □ + 3
  swapDir: '두 양을 거꾸로 봄',                  // □ = △ × 4 · 방콕이 서울보다 늦다 · 도막 수 + 1번
  noFollow: '한 양이 변해도 다른 양은 그대로라고 봄',
  noInverse: '거꾸로 구할 때 같은 셈을 함',       // △ = □ × 6, △ 72 → 72 × 6
  wrongInverse: '반대 셈을 잘못 고름',           // △ = □ × 6, △ 72 → 72 − 6
  halfInverse: '거꾸로 셈을 반만 함',            // △ = □ × 2 + 1, △ 21 → 21 − 1 (나누기를 빠뜨림)
  propForAdd: '차이가 그대로인데 배로 늘어난다고 봄', // 레벨 4·7 → 12·21
  sameCount: '두 양이 같다고 봄',                // 도막 12개 → 12번 자름
  dropAdd: '더하는 수를 빠뜨림',                 // △ = □ × 2 + 1을 □ × 2
  firstAsMul: '1번째 모양 수를 곱함',            // 1번째가 3개 → 10번째 30개
};

// ───────────────────── 이야기 재료 ─────────────────────

/** 곱하는 대응 관계 이야기 — 한 개마다 똑같이 몇 개씩 (k는 물건마다 말이 되는 수만) */
const FRAMES = [
  { x: '탁자', xc: '개', y: '의자', yc: '개', ks: [4, 6], line: (k) => `탁자 1개에 의자가 ${k}개씩 있어요.` },
  { x: '상자', xc: '개', y: '몬스터볼', yc: '개', ks: [4, 6, 8, 10, 12], line: (k) => `상자 1개에 몬스터볼이 ${k}개씩 들어 있어요.` },
  { x: '세발자전거', xc: '대', y: '바퀴', yc: '개', ks: [3], line: (k) => `세발자전거 1대에 바퀴가 ${k}개씩 있어요.` },
  { x: '문어', xc: '마리', y: '다리', yc: '개', ks: [8], line: (k) => `문어 1마리에 다리가 ${k}개씩 있어요.` },
  { x: '봉지', xc: '개', y: '사탕', yc: '개', ks: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12], line: (k) => `봉지 1개에 사탕이 ${k}개씩 들어 있어요.` },
];
const frameFor = (r, c, list = FRAMES) => pickFor(r, c, list, (F, w) => w.includes(F.x) && w.includes(F.y));
/**
 * 문항 속 수가 k 하나뿐인 틀(관계 문장·이야기로 식 세우기)은 k가 여럿인 이야기만 — 문어(8)·세발자전거(3)로 내면
 * 🔁 쌍둥이가 원래 문제와 글자까지 똑같이 나온다 (헤드리스가 잡음: "문어 1마리에 다리가 8개씩" 쌍둥이)
 */
const MANY_K = FRAMES.filter((F) => F.ks.length >= 4);

/** 시차 — 서머타임이 없는 도시만 (서울 UTC+9 · 방콕 +7 · 베이징 +8 · 두바이 +4) */
const CITIES = [{ name: '방콕', g: 2 }, { name: '베이징', g: 1 }, { name: '두바이', g: 5 }];

/** 처음 수 a와 늘어나는 수 d — a = d면 "d × n"이 우연히 정답이라 다르게 */
function startStep(r) {
  let a = int(r, 2, 9); const d = int(r, 2, 9);
  if (a === d) a = a === 9 ? 2 : a + 1;
  return [a, d];
}
/** 도형 배열 1번째 블록 수 s와 늘어나는 수 d — s = d면 "처음 수를 빠뜨림"이 정답과 같아진다 */
function shapeStart(r) {
  let s = int(r, 1, 6); const d = int(r, 2, 5);
  if (s === d) s = s === 6 ? 1 : s + 1;
  return [s, d];
}

// ───────────────────── 문항 마무리 (출연진 이름을 글·보기·풀이에 모두 채운다) ─────────────────────

function finish(id, r, c, f) {
  const F = (t) => fill(t, c);
  const wr = f.wr.filter(Boolean).map((w) => ({ ...w, text: F(w.text) }));
  const chs = f.words ? textChoices(r, F(f.ans), wr) : choices(r, f.ans, wr);
  return {
    ...ask(id, 'calc', F(worldPick(r, c, f.pools)), chs, {
      solve: solve(f.steps.map((t, i) => step(i, F(t))), {
        why: Object.fromEntries(Object.entries(f.why || {}).map(([k, v]) => [k, F(v)])),
        rule: f.rule,
      }),
    }),
    probe: f.probe || null,
  };
}
function finishMis(id, branch, r, c, m) {
  const F = (t) => fill(t, c);
  const chs = textChoices(r, F(m.ok), m.wr.map((w) => ({ ...w, text: F(w.text) })));
  return {
    ...ask(id, 'misread', F(m.q), chs, { solve: solve(m.steps.map((t, i) => step(i, F(t))), { whyAny: F(m.whyAny), rule: m.rule }) }),
    key: `misread:${branch}`,
    probe: m.probe,
  };
}

// ───────────────────── 개념 사다리 (H. 규칙과 대응 줄기) ─────────────────────

export const CORRESPOND = [
  {
    id: 'cor.numseq', grade: 4, name: '수 배열의 규칙', needs: [],
    idea: '늘어놓은 수에서 **규칙**을 찾아요. 이웃한 두 수의 **차이**부터 구해 봐요 — 차이가 늘 같으면 그만큼 더하는(빼는) 규칙, 차이가 점점 커지면 **곱하는** 규칙인지 봐요.',
    slip: '이웃한 수끼리 차이를 모두 구해서, 늘 같은지부터 봐요.',
    calc(r, c) {
      // ㉮ 몇 번째 수 (더하는 규칙)
      const [a, d] = startStep(r); const n = int(r, 8, 12);
      const t4 = range(4, (i) => a + i * d); const nth = a + (n - 1) * d;
      // ㉯ 곱하는 규칙의 다음 수 — 다섯째 수가 200을 넘지 않게
      const k = pick(r, [2, 2, 3]); const g0 = k === 2 ? int(r, 1, 6) : int(r, 1, 2);
      const gs = range(4, (i) => g0 * Math.pow(k, i)); const gNext = g0 * Math.pow(k, 4);
      const gd = [gs[1] - gs[0], gs[2] - gs[1], gs[3] - gs[2]];
      // ㉰ 줄어드는 규칙의 가운데 빈칸 — 다섯째 수가 1 이상
      const e = int(r, 3, 12); const top = int(r, 5 * e, 5 * e + 30);
      const ds = range(5, (i) => top - i * e);
      // ㉱ 규칙 말하기
      const [a2, d2] = startStep(r);
      const ws = range(5, (i) => a2 + i * d2);
      const say = `${a2}부터 시작해서 ${d2}씩 커져요`;
      const fams = [
        { ans: String(nth), wr: [{ text: String(a + n * d), tag: TAGS.offByOne }, { text: String(n * d), tag: TAGS.noStart }, { text: String(a + 4 * d), tag: TAGS.nextOnly }],
          why: {
            [TAGS.offByOne]: `1번째 수가 벌써 ${jn(a, '이에요', '예요')}. ${n}번째까지는 ${jn(d, '을', '를')} ${n - 1}번만 더해요.`,
            [TAGS.noStart]: `${d} × ${n}에는 처음 수 ${jn(a, '이', '가')} 빠졌어요.`,
            [TAGS.nextOnly]: `${jn(a + 4 * d, '은', '는')} 바로 다음 5번째 수예요. ${n}번째까지 더 가야 해요.`,
          },
          steps: [`이웃한 수의 차이: ${d}씩 커져요`, `1번째 ${a}에서 ${n}번째까지 ${jn(d, '을', '를')} ${n - 1}번 더해요`, `${a} + ${d} × ${n - 1} = ${nth}`],
          rule: '몇 번째 수 = 처음 수 + 늘어나는 수 × (몇 번째 − 1).',
          pools: { pokemon: [
            `규칙에 따라 수를 늘어놓았어요.\n\n**${L(t4)}, …**\n\n이 규칙대로라면 ${n}번째 수는 얼마일까요?`,
            `{mon/이/가} 모은 나무열매를 날마다 세어 보니 ${L(t4)}, …처럼 늘어나요. 이대로라면 ${n}번째 날에는 모두 몇 개일까요?`,
          ] } },
        { ans: String(gNext), wr: [{ text: String(gs[3] + gd[0]), tag: TAGS.addForMul }, { text: String(gs[3] + gd[2]), tag: TAGS.growDiff }],
          why: {
            [TAGS.addForMul]: `처음 차이 ${gd[0]}만 보고 더했어요. 차이가 ${ro(L(gd))} 커지니까 더하는 규칙이 아니라 ${k}씩 곱하는 규칙이에요.`,
            [TAGS.growDiff]: `차이도 ${k}배씩 커져요 — 다음 차이는 ${jn(gd[2], '이', '가')} 아니라 ${jn(gNext - gs[3], '이에요', '예요')}.`,
          },
          steps: [`이웃한 수의 차이: ${L(gd)} — 차이가 점점 커져요`, `앞의 수에 ${jn(k, '을', '를')} 곱하면 다음 수: ${gs[0]} × ${k} = ${gs[1]}`, `${gs[3]} × ${k} = ${gNext}`],
          rule: '차이가 점점 커지면 곱하는 규칙인지 확인한다.',
          pools: { pokemon: [`규칙에 따라 수를 늘어놓았어요.\n\n**${L(gs)}, □**\n\n□에 알맞은 수는 얼마일까요?`] } },
        { ans: String(ds[2]), wr: [{ text: String(ds[1] + e), tag: TAGS.wrongDir }],
          why: { [TAGS.wrongDir]: `이 수들은 ${e}씩 **작아져요**. ${ds[1]}에서 ${jn(e, '을', '를')} 빼야 해요.` },
          steps: [`${ds[0]} → ${ds[1]}: ${e}씩 작아져요`, `${ds[1]} − ${e} = ${ds[2]}`, `확인: ${ds[2]} − ${e} = ${ds[3]}`],
          rule: '빈칸 앞뒤의 수로 규칙이 맞는지 확인한다.',
          pools: { pokemon: [`규칙에 따라 수를 늘어놓았어요.\n\n**${ds[0]}, ${ds[1]}, □, ${ds[3]}, ${ds[4]}**\n\n□에 알맞은 수는 얼마일까요?`] } },
        { words: true, ans: say, wr: [
            { text: `${a2}부터 시작해서 ${d2}씩 곱해요`, tag: TAGS.mulForAdd },
            { text: `${a2}부터 시작해서 ${a2 + d2}씩 커져요`, tag: TAGS.countAsStep },
            { text: `${a2}부터 시작해서 ${d2}씩 작아져요`, tag: TAGS.wrongDir }],
          why: {
            [TAGS.mulForAdd]: `${a2} × ${d2} = ${jn(a2 * d2, '이라서', '라서')} 둘째 수 ${jn(ws[1], '이', '가')} 안 나와요. ${jn(d2, '을', '를')} 더하는 규칙이에요.`,
            [TAGS.countAsStep]: `${jn(a2 + d2, '은', '는')} 둘째 수예요. 늘어나는 수는 차이 ${ws[1]} − ${ws[0]} = ${jn(d2, '이에요', '예요')}.`,
            [TAGS.wrongDir]: `수가 ${ro(L(ws.slice(0, 3)))} 점점 커지고 있어요.`,
          },
          steps: [`처음 수: ${a2}`, `차이: ${ws[1]} − ${ws[0]} = ${d2}, ${ws[2]} − ${ws[1]} = ${d2}`, `→ ${say}`],
          rule: '규칙은 "처음 수 + 늘어나는 수"로 말한다.',
          pools: { pokemon: [`**${L(ws)}**\n\n이 수 배열의 규칙을 바르게 말한 것은 어느 것일까요?`] } },
      ];
      return finish(this.id, r, c, pickFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['mul', 'nth']) === 'mul') {
        const k = pick(r, [2, 2, 3]); const g0 = k === 2 ? int(r, 1, 6) : int(r, 1, 2);
        const gs = range(4, (i) => g0 * Math.pow(k, i)); const right = g0 * Math.pow(k, 4);
        const gd = [gs[1] - gs[0], gs[2] - gs[1], gs[3] - gs[2]]; const shown = gs[3] + gd[0];
        return finishMis(this.id, 'mul', r, c, {
          q: `규칙에 따라 수를 늘어놓았어요: ${L(gs)}, □\n\n${showWork(`□는 ${jn(shown, '이에요', '예요')} — ${gd[0]}씩 커지니까요`)}`,
          ok: `차이가 ${ro(L(gd))} 커져요 — ${k}씩 곱하면 ${right}`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: `마지막 차이 ${gd[2]}만큼 커져서 □는 ${jn(gs[3] + gd[2], '이에요', '예요')}`, tag: TAGS.growDiff },
            { text: '수가 커지면 언제나 같은 수만큼 더하는 규칙이에요', tag: MIS_OK },
          ],
          steps: [`이웃한 수의 차이: ${L(gd)} — 점점 커져요`, `${k}씩 곱하는 규칙: ${gs[3]} × ${k} = ${right}`],
          whyAny: `처음 차이 ${gd[0]}만 보고 더했어요. 차이가 커지는 수 배열은 곱하는 규칙인지 봐요.`,
          rule: '차이가 점점 커지면 곱하는 규칙인지 확인한다.',
          probe: { seq: gs, shown },
        });
      }
      const [a, d] = startStep(r); const n = int(r, 8, 12);
      const t4 = range(4, (i) => a + i * d); const right = a + (n - 1) * d; const shown = a + d * n;
      return finishMis(this.id, 'nth', r, c, {
        q: `규칙에 따라 수를 늘어놓았어요: ${L(t4)}, …\n\n${showWork(`${n}번째 수는 ${a} + ${d} × ${n} = ${jn(shown, '이에요', '예요')}`)}`,
        ok: `${jn(d, '을', '를')} ${n - 1}번만 더해요 — ${a} + ${d} × ${n - 1} = ${right}`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `처음 수는 빼고 ${d} × ${n} = ${jn(d * n, '이에요', '예요')}`, tag: TAGS.noStart },
          { text: `${n}번째 수는 늘어놓지 않아서 알 수 없어요`, tag: OFF },
        ],
        steps: [`1번째가 ${a} — ${n}번째까지 ${d}씩 ${n - 1}번 커져요`, `${a} + ${d} × ${n - 1} = ${right}`],
        whyAny: `1번째 수 ${jn(a, '을', '를')} 이미 셌는데 ${jn(d, '을', '를')} ${n}번 더했어요 — 한 번 많아요.`,
        rule: '몇 번째 수 = 처음 수 + 늘어나는 수 × (몇 번째 − 1).',
        probe: { seq: t4, nth: n, shown },
      });
    },
  },

  {
    id: 'cor.shapeseq', grade: 4, name: '도형 배열의 규칙', needs: ['cor.numseq'],
    idea: '모양이 하나씩 늘어날 때 **블록이 몇 개씩 늘어나는지** 찾아요. 1번째 모양의 블록 수에서 시작해서, 늘어나는 수를 (몇 번째 − 1)번 더하면 돼요.',
    slip: '이웃한 두 모양의 블록 수 차이를 먼저 구해 봐요.',
    calc(r, c) {
      const [s, d] = shapeStart(r);
      const cs = range(4, (i) => s + i * d);
      const head = `{mon/이/가} 블록으로 규칙에 따라 모양을 만들었어요.\n\n[steps ${cs.join(' ')}]\n\n`;
      const n = int(r, 7, 12); const nth = s + (n - 1) * d;
      const m = int(r, 6, 12); const M = s + (m - 1) * d;
      const fams = [
        { ans: String(nth), wr: [{ text: String(s + n * d), tag: TAGS.offByOne }, { text: String(n * d), tag: TAGS.noStart }, { text: String(s + 4 * d), tag: TAGS.nextOnly }],
          why: {
            [TAGS.offByOne]: `1번째가 벌써 ${s}개예요. ${n}번째까지는 ${n - 1}번만 늘어요.`,
            [TAGS.noStart]: `${d} × ${n}에는 1번째 모양의 ${s}개가 빠졌어요.`,
            [TAGS.nextOnly]: `${s + 4 * d}개는 바로 다음 5번째 모양이에요. ${n}번째까지 더 가야 해요.`,
          },
          steps: [`블록 수: ${L(cs)} — ${d}개씩 늘어요`, `1번째 ${s}개에서 ${n}번째까지 ${d}개씩 ${n - 1}번 늘어요`, `${s} + ${d} × ${n - 1} = ${nth}개`],
          rule: '몇 번째 모양 = 1번째 블록 수 + 늘어나는 수 × (몇 번째 − 1).',
          pools: { pokemon: [`${head}${n}번째 모양에는 블록이 몇 개일까요?`] } },
        { ans: String(d), wr: [{ text: String(s), tag: TAGS.countAsStep }, { text: String(s + d), tag: TAGS.countAsStep }],
          why: { [TAGS.countAsStep]: `그건 모양 하나의 블록 수예요. 늘어나는 수는 이웃한 두 모양의 차이 ${s + d} − ${s} = ${jn(d, '이에요', '예요')}.` },
          steps: [`블록 수: ${s}개 → ${s + d}개 → ${s + 2 * d}개`, `${s + d} − ${s} = ${d} → ${d}개씩 늘어요`],
          rule: '늘어나는 수 = 이웃한 두 모양의 블록 수 차이.',
          pools: { pokemon: [`${head}모양이 하나씩 늘어날 때마다 블록은 몇 개씩 늘어날까요?`] } },
        { ans: String(m), wr: [{ text: String(m - 1), tag: TAGS.offByOne }, { text: String(m + 1), tag: TAGS.offByOne }, M % d === 0 && M / d !== m ? { text: String(M / d), tag: TAGS.noStart } : null],
          why: {
            [TAGS.offByOne]: `${d}개씩 ${m - 1}번 늘었으니까 1번째에서 ${m - 1}번 더 간 ${m}번째예요.`,
            [TAGS.noStart]: `${M} ÷ ${d}에는 1번째 모양의 ${s}개가 빠졌어요.`,
          },
          steps: [`1번째 ${s}개에서 ${d}개씩 늘어요`, `${M} − ${s} = ${M - s}, ${M - s} ÷ ${d} = ${m - 1} → ${m - 1}번 늘었어요`, `1번째에서 ${m - 1}번 더 가면 ${m}번째`],
          rule: '늘어난 횟수 + 1 = 몇 번째.',
          pools: { pokemon: [`${head}블록이 ${M}개인 모양은 몇 번째일까요?`] } },
      ];
      return finish(this.id, r, c, pickFamily(r, c, fams));
    },
    misread(r, c) {
      const [s, d] = shapeStart(r);
      const cs = range(4, (i) => s + i * d);
      const head = `{me/이/가} 블록으로 규칙에 따라 모양을 만들었어요.\n\n[steps ${cs.join(' ')}]\n\n`;
      if (branchOf(r, c, ['nth', 'step']) === 'nth') {
        const n = int(r, 7, 12); const right = s + (n - 1) * d; const shown = s + d * n;
        return finishMis(this.id, 'nth', r, c, {
          q: `${head}${showWork(`${n}번째 모양은 ${d}개씩 ${n}번 늘어서 ${s} + ${d} × ${n} = ${shown}개예요`)}`,
          ok: `1번째가 ${s}개라서 ${n - 1}번만 늘어요 — ${s} + ${d} × ${n - 1} = ${right}개`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: `처음 ${s}개는 빼고 ${d} × ${n} = ${d * n}개예요`, tag: TAGS.noStart },
            { text: '모양이 커질수록 늘어나는 블록 수도 커져요', tag: OFF },
          ],
          steps: [`블록 수: ${L(cs)} — ${d}개씩`, `${s} + ${d} × ${n - 1} = ${right}개`],
          whyAny: `1번째 모양에 이미 ${s}개가 있어요. ${n}번째까지 ${d}개씩 ${n - 1}번만 늘어요.`,
          rule: '몇 번째 모양 = 1번째 블록 수 + 늘어나는 수 × (몇 번째 − 1).',
          probe: { steps: cs, nth: n, shown },
        });
      }
      return finishMis(this.id, 'step', r, c, {
        q: `${head}${showWork(`모양이 하나 늘 때마다 블록이 ${s + d}개씩 늘어나요`)}`,
        ok: `${s}개 → ${s + d}개 → ${s + 2 * d}개 — ${d}개씩 늘어나요`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `${s}개씩 늘어나요`, tag: TAGS.countAsStep },
          { text: '늘어나는 블록 수는 모양마다 달라요', tag: OFF },
        ],
        steps: [`블록 수: ${L(cs)}`, `이웃한 두 모양의 차이: ${s + d} − ${s} = ${d}`],
        whyAny: `${s + d}개는 2번째 모양의 블록 수예요. 늘어나는 수는 두 모양의 차이예요.`,
        rule: '늘어나는 수 = 이웃한 두 모양의 블록 수 차이.',
        probe: { steps: cs, shownStep: s + d },
      });
    },
  },

  {
    id: 'cor.pair', grade: 5, name: '두 양 사이의 관계', needs: ['cor.shapeseq'],
    idea: '한 양이 변할 때 다른 양이 **따라서** 변하는 관계를 **대응 관계**라고 해요. 탁자가 1개 늘면 의자가 4개씩 늘어요 — 의자 수는 늘 탁자 수의 4배예요.',
    slip: '1개일 때, 2개일 때, 3개일 때를 차례로 세어 봐요.',
    calc(r, c) {
      const F = frameFor(r, c); const k = pick(r, F.ks); const N = int(r, 5, 12);
      const X = `${F.x} 수`; const Y = `${F.y} 수`;
      // 관계 문장은 k 말고 수가 없다 — k가 여럿인 이야기로 (문어·세발자전거면 🔁 쌍둥이가 같은 글)
      const G = frameFor(r, c, MANY_K); const kg = pick(r, G.ks);
      const GX = `${G.x} 수`; const GY = `${G.y} 수`;
      const say = `${GY}는 ${GX}의 ${kg}배예요`;
      const s5 = int(r, 1, 3); const xs5 = range(5, (i) => s5 + i); const xq = xs5[2]; // 표 칸 채우기 — 1·2·3 중에서 시작
      const fams = [
        { ans: String(k * N), wr: [{ text: String(N + k), tag: TAGS.addForMul }],
          why: { [TAGS.addForMul]: `${jw(F.x, '이', '가')} 하나 늘 때마다 ${jw(F.y, '이', '가')} ${k}${F.yc}씩 늘어요 — ${N} + ${jn(k, '이', '가')} 아니라 ${N} × ${jn(k, '이에요', '예요')}.` },
          steps: [`${F.x} 1${F.xc}마다 ${F.y} ${k}${F.yc} → ${Y}는 ${X}의 ${k}배`, `${N} × ${k} = ${k * N}${F.yc}`],
          rule: '한 개마다 똑같이 몇 개씩이면 곱하는 대응 관계.',
          pools: { pokemon: [`${F.line(k)} ${jw(F.x, '이', '가')} ${N}${F.xc}면 ${jw(F.y, '은', '는')} 모두 몇 ${F.yc}일까요?`] } },
        { words: true, ans: say, wr: [
            { text: `${GY}는 ${GX}보다 ${kg} 많아요`, tag: TAGS.addForMul },
            { text: `${GX}는 ${GY}의 ${kg}배예요`, tag: TAGS.swapDir },
            { text: `${jw(G.x, '이', '가')} 늘어도 ${GY}는 그대로예요`, tag: TAGS.noFollow }],
          why: {
            [TAGS.addForMul]: `${G.x} 2${G.xc}면 ${jw(G.y, '은', '는')} ${2 * kg}${G.yc} — 2보다 ${kg} 많은 ${2 + kg}${G.yc}가 아니에요.`,
            [TAGS.swapDir]: `거꾸로 말했어요. 더 많은 쪽은 ${jw(G.y, '이에요', '예요')} — ${GY}가 ${GX}의 ${kg}배.`,
            [TAGS.noFollow]: `${jw(G.x, '이', '가')} 하나 늘면 ${G.y}도 ${kg}${G.yc} 늘어요 — 따라서 변해요.`,
          },
          steps: [`${G.x} 1${G.xc} → ${G.y} ${kg}${G.yc}, ${G.x} 2${G.xc} → ${G.y} ${2 * kg}${G.yc}, ${G.x} 3${G.xc} → ${G.y} ${3 * kg}${G.yc}`, `→ ${say}`],
          rule: '한 양이 변할 때 다른 양이 어떻게 따라 변하는지를 말한다.',
          pools: { pokemon: [`${G.line(kg)}\n\n${GX}와 ${GY} 사이의 대응 관계를 바르게 말한 것은 어느 것일까요?`] } },
        // 표 칸 채우기도 수가 k와 시작 칸뿐 — k가 여럿인 이야기로, 표는 1·2·3 중에서 시작
        { ans: String(xq * kg), wr: [{ text: String(xq + kg), tag: TAGS.addForMul }],
          why: { [TAGS.addForMul]: `표를 보면 ${GY}는 ${GX}의 ${kg}배예요 — ${xq} + ${jn(kg, '이', '가')} 아니라 ${xq} × ${jn(kg, '이에요', '예요')}.` },
          steps: [`${GY}는 ${GX}의 ${kg}배`, `${xq} × ${kg} = ${xq * kg}`],
          rule: '한 개마다 똑같이 몇 개씩이면 곱하는 대응 관계.',
          pools: { pokemon: [`${G.line(kg)}\n\n[table ${GX}(${G.xc}):${L(xs5)} / ${GY}(${G.yc}):${xs5[0] * kg}, ${xs5[1] * kg}, ?, ${xs5[3] * kg}, ${xs5[4] * kg}]\n\n표의 ?에 알맞은 수는 얼마일까요?`] } },
      ];
      return finish(this.id, r, c, pickFamily(r, c, fams));
    },
    misread(r, c) {
      const F = frameFor(r, c); const k = pick(r, F.ks); const N = int(r, 5, 12);
      const X = `${F.x} 수`; const Y = `${F.y} 수`;
      return finishMis(this.id, 'add', r, c, {
        q: `${F.line(k)}\n\n${showWork(`${jw(F.x, '이', '가')} ${N}${F.xc}면 ${jw(F.y, '은', '는')} ${N} + ${k} = ${N + k}${F.yc}예요`)}`,
        ok: `${F.x} 1${F.xc}마다 ${k}${F.yc}씩 — ${N} × ${k} = ${N * k}${F.yc}`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `${X}가 ${Y}의 ${k}배예요`, tag: TAGS.swapDir },
          { text: `${Y}와 ${X}는 늘 같아요`, tag: OFF },
        ],
        steps: [`${F.x} 1${F.xc}마다 ${F.y} ${k}${F.yc} → ${Y}는 ${X}의 ${k}배`, `${N} × ${k} = ${N * k}${F.yc}`],
        whyAny: `${jw(F.x, '이', '가')} 하나 늘 때마다 ${jw(F.y, '이', '가')} ${k}${F.yc}씩 늘어요. 더하기가 아니라 곱하기예요.`,
        rule: '한 개마다 똑같이 몇 개씩이면 곱하는 대응 관계.',
        probe: { k, N, shown: N + k },
      });
    },
  },

  {
    id: 'cor.table', grade: 5, name: '대응표로 규칙 찾기', needs: ['cor.pair'],
    idea: '대응표에서는 **위아래 짝**을 봐요. 옆으로 몇씩 커지는지만 보면 규칙을 잘못 찾기 쉬워요 — 모든 짝에 같은 셈이 맞는지 확인하면, 표에 없는 칸도 구할 수 있어요.',
    slip: '위아래 짝 두세 개에 같은 셈이 맞는지 확인해 봐요.',
    calc(r, c) {
      const F = frameFor(r, c); const k = pick(r, F.ks); const s0 = int(r, 1, 3);
      const xs = range(4, (i) => s0 + i); const ys = xs.map((x) => k * x); const fp = ys[0] - xs[0];
      const X = `${F.x} 수`; const Y = `${F.y} 수`;
      const head = `${X}와 ${Y} 사이의 대응 관계를 표로 나타냈어요.\n\n[table ${X}(${F.xc}):${L(xs)} / ${Y}(${F.yc}):${L(ys)}]\n\n`;
      const N = int(r, s0 + 6, 15);
      const Nb = int(r, 6, 15); const M = k * Nb;
      const cc = int(r, 2, 9); const Nl = int(r, 10, 30);
      const lv = `[table {mon}의 레벨:1, 2, 3, 4 / {mon2}의 레벨:${L([1, 2, 3, 4].map((x) => x + cc))}]`;
      const pairs = `위아래 짝: ${xs[0]} → ${ys[0]}, ${xs[1]} → ${ys[1]}, ${xs[2]} → ${ys[2]}`;
      const fams = [
        { ans: String(k * N), wr: [{ text: String(N + k), tag: TAGS.stepAsRule }, { text: String(N + fp), tag: TAGS.firstPairOnly }, { text: String(k * (s0 + 4)), tag: TAGS.nextOnly }],
          why: {
            [TAGS.stepAsRule]: `${Y}가 옆으로 ${k}씩 커지는 건 ${X}가 1씩 커질 때예요. 위아래 짝을 보면 ${k}배 — ${N} + ${jn(k, '이', '가')} 아니라 ${N} × ${jn(k, '이에요', '예요')}.`,
            [TAGS.firstPairOnly]: `첫 칸(${xs[0]} → ${ys[0]})만 보면 ${jn(fp, '을', '를')} 더한 것 같지만, 둘째 칸은 ${xs[1]} + ${fp} = ${jn(xs[1] + fp, '이라서', '라서')} ${jn(ys[1], '과', '와')} 달라요. 모든 짝에 맞는 셈은 × ${jn(k, '이에요', '예요')}.`,
            [TAGS.nextOnly]: `${jn(k * (s0 + 4), '은', '는')} 표 바로 다음 칸(${X} ${s0 + 4})이에요.`,
          },
          steps: [pairs, `${Y}는 늘 ${X}의 ${k}배`, `${N} × ${k} = ${k * N}`],
          rule: '대응표는 위아래 짝으로 규칙을 찾는다 — 모든 짝에 맞는지 확인.',
          pools: { pokemon: [`${head}표를 보고, ${X}가 ${N}${F.xc}일 때 ${Y}는 몇 ${F.yc}일까요?`] } },
        { ans: String(Nl + cc), wr: [{ text: String(Nl * (1 + cc)), tag: TAGS.mulForAdd }, { text: String(Nl + 1), tag: TAGS.stepAsRule }, { text: String(5 + cc), tag: TAGS.nextOnly }],
          why: {
            [TAGS.mulForAdd]: `첫 칸(1 → ${1 + cc})만 보면 ${1 + cc}배 같지만, 2 → ${jn(2 + cc, '은', '는')} ${1 + cc}배가 아니에요. 늘 ${cc} 차이예요.`,
            [TAGS.stepAsRule]: `위아래 모두 1씩 커지는 건 옆으로 본 거예요. 위아래 짝은 늘 ${cc} 차이예요.`,
            [TAGS.nextOnly]: `${jn(5 + cc, '은', '는')} 표 바로 다음 칸(레벨 5)이에요.`,
          },
          steps: [`위아래 짝: 1 → ${1 + cc}, 2 → ${2 + cc}, 3 → ${3 + cc}`, `{mon2}의 레벨이 늘 ${cc} 높아요`, `${Nl} + ${cc} = ${Nl + cc}`],
          rule: '대응표는 위아래 짝으로 규칙을 찾는다 — 모든 짝에 맞는지 확인.',
          pools: { pokemon: [`{mon/과/와} {mon2/은/는} 늘 함께 배틀해서 레벨이 같이 올라요.\n\n${lv}\n\n표를 보고, {mon}의 레벨이 ${Nl}일 때 {mon2}의 레벨은 얼마일까요?`] } },
        { ans: String(Nb), wr: [{ text: String(M * k), tag: TAGS.noInverse }, { text: String(M - k), tag: TAGS.stepAsRule }, { text: String(M - fp), tag: TAGS.firstPairOnly }],
          why: {
            [TAGS.noInverse]: `${M} × ${jn(k, '은', '는')} ${Y}를 또 ${k}배 한 거예요. ${Y}가 ${X}의 ${k}배니까 거꾸로는 ${ro(k)} 나눠요.`,
            [TAGS.stepAsRule]: `${Y}가 ${k}씩 커지는 건 옆으로 본 거예요. 위아래 짝은 ${k}배라서 ${ro(k)} 나눠요.`,
            [TAGS.firstPairOnly]: `첫 칸의 차이 ${fp}만 뺐어요. 모든 짝에 맞는 셈은 × ${k} — 거꾸로는 ÷ ${jn(k, '이에요', '예요')}.`,
          },
          steps: [pairs, `${Y}는 ${X}의 ${k}배 → 거꾸로 ${X} = ${Y} ÷ ${k}`, `${M} ÷ ${k} = ${Nb}`],
          rule: '거꾸로 구할 때는 반대 셈 — 곱했으면 나눈다.',
          pools: { pokemon: [`${head}표를 보고, ${Y}가 ${M}${F.yc}일 때 ${X}는 몇 ${F.xc}일까요?`] } },
      ];
      return finish(this.id, r, c, pickFamily(r, c, fams));
    },
    misread(r, c) {
      const F = frameFor(r, c); const k = pick(r, F.ks); const N = int(r, 8, 15);
      const xs = [1, 2, 3, 4]; const ys = xs.map((x) => k * x);
      const X = `${F.x} 수`; const Y = `${F.y} 수`;
      return finishMis(this.id, 'step', r, c, {
        q: `${X}와 ${Y} 사이의 대응 관계를 표로 나타냈어요.\n\n[table ${X}(${F.xc}):${L(xs)} / ${Y}(${F.yc}):${L(ys)}]\n\n${showWork(`${Y}가 ${k}씩 커지니까 ${X}가 ${N}${F.xc}면 ${Y}는 ${N} + ${k} = ${N + k}${F.yc}예요`)}`,
        ok: `${Y}는 ${X}의 ${k}배예요 — ${N} × ${k} = ${N * k}${F.yc}`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `첫 칸에서 ${k - 1} 많으니까 ${N} + ${k - 1} = ${N + k - 1}${F.yc}예요`, tag: TAGS.firstPairOnly },
          { text: '표에 없는 칸은 구할 수 없어요', tag: OFF },
        ],
        steps: [`위아래 짝: 1 → ${k}, 2 → ${2 * k}, 3 → ${3 * k} — ${k}배`, `${N} × ${k} = ${N * k}${F.yc}`],
        whyAny: `옆으로 ${k}씩 커지는 건 ${X}가 1씩 커질 때예요. 대응 규칙은 위아래 짝 — ${k}배예요.`,
        rule: '대응표는 위아래 짝으로 규칙을 찾는다.',
        probe: { xs, ys, N, shown: N + k },
      });
    },
  },

  {
    id: 'cor.symbol', grade: 5, name: '대응 관계를 식으로', needs: ['cor.table'],
    idea: '두 양을 **□, △ 같은 기호**로 두면 대응 관계를 식으로 쓸 수 있어요. 탁자 수를 □, 의자 수를 △라고 하면 △ = □ × 4 — 거꾸로 쓰면 □ = △ ÷ 4예요.',
    slip: '표의 짝 몇 개를 식에 넣어 보고 모두 맞는지 확인해요.',
    calc(r, c) {
      const k = int(r, 3, 9); const s0 = int(r, 1, 3);
      const xs = range(4, (i) => s0 + i); const ys = xs.map((x) => k * x); const fp = ys[0] - xs[0];
      const tbl = `[table □:${L(xs)} / △:${L(ys)}]`;
      const pairs = `위아래 짝: ${xs[0]} → ${ys[0]}, ${xs[1]} → ${ys[1]}, ${xs[2]} → ${ys[2]}`;
      const cc = int(r, 2, 9);
      const F = frameFor(r, c, MANY_K); const kf = pick(r, F.ks); // 수가 kf 하나뿐인 틀 — k가 여럿인 이야기로
      const mulEq = `△ = □ × ${k}`; const addEq = `△ = □ + ${cc}`; const frEq = `△ = □ × ${kf}`; const invEq = `□ = △ ÷ ${k}`;
      const fams = [
        { words: true, ans: mulEq, wr: [{ text: `△ = □ + ${k}`, tag: TAGS.stepAsRule }, { text: `△ = □ + ${fp}`, tag: TAGS.firstPairOnly }, { text: `□ = △ × ${k}`, tag: TAGS.swapDir }],
          why: {
            [TAGS.stepAsRule]: `△가 ${k}씩 커지는 건 □가 1씩 커질 때예요. 짝마다 보면 □ × ${k} = △.`,
            [TAGS.firstPairOnly]: `□ + ${jn(fp, '은', '는')} 첫 칸(${xs[0]} → ${ys[0]})에만 맞아요. ${xs[1]} + ${fp} = ${jn(xs[1] + fp, '이라서', '라서')} ${jn(ys[1], '이', '가')} 안 나와요.`,
            [TAGS.swapDir]: `□ = △ × ${jn(k, '이라면', '라면')} □가 △보다 커야 해요. 거꾸로 쓰려면 반대 셈 — □ = △ ÷ ${k}.`,
          },
          steps: [pairs, `△는 늘 □의 ${k}배 → ${mulEq}`],
          rule: '식은 표의 모든 짝에 맞아야 한다.',
          pools: { pokemon: [`${tbl}\n\n□와 △ 사이의 대응 관계를 식으로 나타내면 어느 것일까요?`] } },
        { words: true, ans: addEq, wr: [{ text: `△ = □ × ${1 + cc}`, tag: TAGS.mulForAdd }, { text: `□ = △ + ${cc}`, tag: TAGS.swapDir }, { text: '△ = □ + 1', tag: TAGS.stepAsRule }],
          why: {
            [TAGS.mulForAdd]: `□ × ${jn(1 + cc, '은', '는')} 첫 칸(1 → ${1 + cc})에만 맞아요. 2 × ${1 + cc} = ${2 + 2 * cc}인데 표에서는 ${jn(2 + cc, '이에요', '예요')}.`,
            [TAGS.swapDir]: `□ = △ + ${jn(cc, '이라면', '라면')} □가 △보다 커야 해요. 표에서는 □가 더 작아요.`,
            [TAGS.stepAsRule]: `1씩 커지는 건 옆으로 본 거예요. 위아래 짝은 늘 ${cc} 차이예요.`,
          },
          steps: [`위아래 짝: 1 → ${1 + cc}, 2 → ${2 + cc}, 3 → ${3 + cc}`, `△는 늘 □보다 ${cc} 커요 → ${addEq}`],
          rule: '식은 표의 모든 짝에 맞아야 한다.',
          pools: { pokemon: [`{mon}의 레벨을 □, {mon2}의 레벨을 △라고 해요. 둘은 늘 함께 레벨이 올라요.\n\n[table □:1, 2, 3, 4 / △:${L([1, 2, 3, 4].map((x) => x + cc))}]\n\n□와 △ 사이의 대응 관계를 식으로 나타내면 어느 것일까요?`] } },
        { words: true, ans: frEq, wr: [{ text: `△ = □ + ${kf}`, tag: TAGS.addForMul }, { text: `□ = △ × ${kf}`, tag: TAGS.swapDir }, { text: `△ = □ ÷ ${kf}`, tag: TAGS.swapDir }],
          why: {
            [TAGS.addForMul]: `${jw(F.x, '이', '가')} 하나 늘 때마다 ${jw(F.y, '이', '가')} ${kf}${F.yc}씩 늘어요 — 더하기가 아니라 곱하기예요.`,
            [TAGS.swapDir]: `${F.y} 수(△)가 더 많아요 — △가 □의 ${kf}배예요.`,
          },
          steps: [`${F.x} 1${F.xc}마다 ${F.y} ${kf}${F.yc} → △는 □의 ${kf}배`, `→ ${frEq}`],
          rule: '곱하는 대응 관계: △ = □ × (한 개에 몇 개).',
          pools: { pokemon: [`${F.line(kf)} ${F.x} 수를 □, ${F.y} 수를 △라고 할 때, 두 양 사이의 대응 관계를 식으로 나타내면 어느 것일까요?`] } },
        { words: true, ans: invEq, wr: [{ text: `□ = △ × ${k}`, tag: TAGS.noInverse }, { text: `□ = △ − ${k}`, tag: TAGS.stepAsRule }, { text: `△ = □ ÷ ${k}`, tag: TAGS.swapDir }],
          why: {
            [TAGS.noInverse]: `△ = □ × ${jn(k, '을', '를')} 거꾸로 쓸 때는 곱하기를 되돌려 나눠요.`,
            [TAGS.stepAsRule]: `△는 □보다 ${k} 큰 게 아니라 ${k}배예요.`,
            [TAGS.swapDir]: `△ = □ ÷ ${jn(k, '이라면', '라면')} △가 □보다 작아야 해요. 표에서는 △가 더 커요.`,
          },
          steps: [`${pairs} → △ = □ × ${k}`, `거꾸로는 반대 셈 → ${invEq}`],
          rule: '거꾸로 쓰면 반대 셈: △ = □ × 4 이면 □ = △ ÷ 4.',
          pools: { pokemon: [`${tbl}\n\n△를 알 때 □를 구하는 식은 어느 것일까요?`] } },
      ];
      return finish(this.id, r, c, pickFamily(r, c, fams));
    },
    misread(r, c) {
      const k = int(r, 3, 9);
      if (branchOf(r, c, ['swap', 'step']) === 'swap') {
        const s0 = int(r, 1, 3); const xs = range(4, (i) => s0 + i); const ys = xs.map((x) => k * x);
        return finishMis(this.id, 'swap', r, c, {
          q: `[table □:${L(xs)} / △:${L(ys)}]\n\n${showWork(`△ = □ × ${jn(k, '이니까', '니까')} □ = △ × ${jn(k, '이에요', '예요')}`)}`,
          ok: `거꾸로 쓸 때는 반대 셈이에요 — □ = △ ÷ ${k}`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: `□ = △ − ${jn(k, '이에요', '예요')}`, tag: TAGS.wrongInverse },
            { text: '□와 △는 자리를 바꿔 쓸 수 없어요', tag: OFF },
          ],
          steps: [`△가 □의 ${k}배 → □는 △를 ${ro(k)} 나눈 수`, `□ = △ ÷ ${k}`],
          whyAny: `□ = △ × ${jn(k, '이라면', '라면')} □가 △보다 커야 해요. 거꾸로 쓸 때는 곱하기를 나누기로 바꿔요.`,
          rule: '거꾸로 쓰면 반대 셈: △ = □ × 4 이면 □ = △ ÷ 4.',
          probe: { xs, ys, shownEq: `□ = △ × ${k}` },
        });
      }
      const xs = [1, 2, 3, 4]; const ys = xs.map((x) => k * x);
      return finishMis(this.id, 'step', r, c, {
        q: `[table □:${L(xs)} / △:${L(ys)}]\n\n${showWork(`△가 ${k}씩 커지니까 △ = □ + ${jn(k, '이에요', '예요')}`)}`,
        ok: `□가 1이면 △는 ${k} — △ = □ × ${k}`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `△ = □ + ${jn(k - 1, '이에요', '예요')}`, tag: TAGS.firstPairOnly },
          { text: '이 표는 식으로 나타낼 수 없어요', tag: OFF },
        ],
        steps: [`위아래 짝: 1 → ${k}, 2 → ${2 * k}, 3 → ${3 * k}`, `△는 □의 ${k}배 → △ = □ × ${k}`],
        whyAny: `△가 ${k}씩 커지는 건 □가 1씩 커질 때예요. 짝마다 보면 ${k}배예요.`,
        rule: '식은 표의 모든 짝에 맞아야 한다.',
        probe: { xs, ys, shownEq: `△ = □ + ${k}` },
      });
    },
  },

  {
    id: 'cor.value', grade: 5, name: '식으로 값 구하기', needs: ['cor.symbol'],
    idea: '식이 있으면 표를 끝까지 쓰지 않아도 돼요. △ = □ × 6에서 □가 15면 △ = 15 × 6 = 90. **거꾸로** △를 알 때는 **반대 셈**으로 □를 구해요 — □ = △ ÷ 6.',
    slip: '□와 △ 중에 어느 것을 알려 줬는지 먼저 봐요.',
    calc(r, c) {
      const k = int(r, 3, 9); const t = int(r, 2, 9); const N = k * t;          // 앞으로 ×
      const kb = int(r, 3, 9); const Nb = int(r, 5, 20); const Mb = kb * Nb;    // 거꾸로 ×
      const cc = int(r, 3, 15); const Nc = int(r, 5, 40); const Mc = Nc + cc;   // 거꾸로 +
      const kd = int(r, 2, 6); const Md = int(r, 3, 20);                        // 거꾸로 ÷
      const ce = int(r, 2, 9); const Ne = int(r, ce + 3, 40);                   // 앞으로 −
      const fams = [
        { ans: String(k * N), wr: [{ text: String(N + k), tag: TAGS.addForMul }, { text: String(t), tag: TAGS.swapDir }],
          why: {
            [TAGS.addForMul]: `식은 × ${jn(k, '이에요', '예요')}. □에 ${jn(k, '을', '를')} 더하지 않고 곱해요.`,
            [TAGS.swapDir]: `${N} ÷ ${jn(k, '은', '는')} △가 ${N}일 때 □를 구하는 셈이에요. 지금은 □가 ${jn(N, '이에요', '예요')}.`,
          },
          steps: [`□ 자리에 ${jn(N, '을', '를')} 넣어요 → △ = ${N} × ${k}`, `△ = ${k * N}`],
          rule: '□를 알면 식대로, △를 알면 반대 셈으로.',
          pools: { pokemon: [`△ = □ × ${k}에서 □가 ${N}일 때 △는 얼마일까요?`] } },
        { ans: String(Nb), wr: [{ text: String(Mb * kb), tag: TAGS.noInverse }, { text: String(Mb - kb), tag: TAGS.wrongInverse }],
          why: {
            [TAGS.noInverse]: `${Mb} × ${jn(kb, '은', '는')} △를 또 ${kb}배 한 거예요. 거꾸로는 ${ro(kb)} 나눠요.`,
            [TAGS.wrongInverse]: '곱하기를 되돌리는 셈은 빼기가 아니라 나누기예요.',
          },
          steps: [`□ × ${kb} = ${Mb}`, `거꾸로는 반대 셈: □ = ${Mb} ÷ ${kb} = ${Nb}`],
          rule: '□를 알면 식대로, △를 알면 반대 셈으로.',
          pools: { pokemon: [`△ = □ × ${kb}에서 △가 ${Mb}일 때 □는 얼마일까요?`] } },
        { ans: String(Nc), wr: [{ text: String(Mc + cc), tag: TAGS.noInverse }],
          why: { [TAGS.noInverse]: `${Mc} + ${jn(cc, '은', '는')} △에 또 더한 거예요. 거꾸로는 빼요.` },
          steps: [`□ + ${cc} = ${Mc}`, `거꾸로는 반대 셈: □ = ${Mc} − ${cc} = ${Nc}`],
          rule: '□를 알면 식대로, △를 알면 반대 셈으로.',
          pools: { pokemon: [`△ = □ + ${cc}에서 △가 ${Mc}일 때 □는 얼마일까요?`] } },
        { ans: String(Md * kd), wr: [Md % kd === 0 ? { text: String(Md / kd), tag: TAGS.noInverse } : null, { text: String(Md + kd), tag: TAGS.wrongInverse }],
          why: {
            [TAGS.noInverse]: `${Md} ÷ ${jn(kd, '은', '는')} △를 또 나눈 거예요. 거꾸로는 곱해요.`,
            [TAGS.wrongInverse]: '나누기를 되돌리는 셈은 더하기가 아니라 곱하기예요.',
          },
          steps: [`□ ÷ ${kd} = ${Md}`, `거꾸로는 반대 셈: □ = ${Md} × ${kd} = ${Md * kd}`],
          rule: '□를 알면 식대로, △를 알면 반대 셈으로.',
          pools: { pokemon: [`△ = □ ÷ ${kd}에서 △가 ${Md}일 때 □는 얼마일까요?`] } },
        { ans: String(Ne - ce), wr: [{ text: String(Ne + ce), tag: TAGS.swapDir }],
          why: { [TAGS.swapDir]: `□에서 ${jn(ce, '을', '를')} 빼야 △예요. ${Ne} + ${jn(ce, '은', '는')} △가 ${Ne}일 때 □를 구하는 셈이에요.` },
          steps: [`□ 자리에 ${jn(Ne, '을', '를')} 넣어요 → △ = ${Ne} − ${ce}`, `△ = ${Ne - ce}`],
          rule: '□를 알면 식대로, △를 알면 반대 셈으로.',
          pools: { pokemon: [`△ = □ − ${ce}에서 □가 ${Ne}일 때 △는 얼마일까요?`] } },
      ];
      return finish(this.id, r, c, pickFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['inv', 'fwd']) === 'inv') {
        // 보여 주는 틀린 곱(M × k)이 500을 넘지 않게
        const k = int(r, 3, 6); const N = int(r, 4, 12); const M = k * N;
        return finishMis(this.id, 'inv', r, c, {
          q: `△ = □ × ${k}에서 △가 ${M}일 때 □를 구했어요.\n\n${showWork(`□ = ${M} × ${k} = ${jn(M * k, '이에요', '예요')}`)}`,
          ok: `□ × ${k} = ${jn(M, '이니까', '니까')} □ = ${M} ÷ ${k} = ${N}`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: `□ = ${M} − ${k} = ${jn(M - k, '이에요', '예요')}`, tag: TAGS.wrongInverse },
            { text: '□는 △보다 커야 해요', tag: OFF },
          ],
          steps: [`□ × ${k} = ${M}`, `□ = ${M} ÷ ${k} = ${N}`],
          whyAny: `△에 식을 또 썼어요. △를 알 때는 반대 셈 — ${ro(k)} 나눠요.`,
          rule: '□를 알면 식대로, △를 알면 반대 셈으로.',
          probe: { eq: `△ = □ × ${k}`, given: '△', val: M, shown: M * k },
        });
      }
      const cc = int(r, 3, 9); const N = int(r, cc + 2, 30);
      return finishMis(this.id, 'fwd', r, c, {
        q: `△ = □ + ${cc}에서 □가 ${N}일 때 △를 구했어요.\n\n${showWork(`△ = ${N} − ${cc} = ${jn(N - cc, '이에요', '예요')}`)}`,
        ok: `□에 ${jn(cc, '을', '를')} 더해요 — △ = ${N} + ${cc} = ${N + cc}`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `△ = ${N} × ${cc} = ${jn(N * cc, '이에요', '예요')}`, tag: TAGS.mulForAdd },
          { text: '△는 □보다 작아요', tag: OFF },
        ],
        steps: [`□ 자리에 ${jn(N, '을', '를')} 넣어요`, `△ = ${N} + ${cc} = ${N + cc}`],
        whyAny: `빼기로 했어요. 식이 □ + ${jn(cc, '이라서', '라서')} □에 더해요.`,
        rule: '□를 알면 식대로, △를 알면 반대 셈으로.',
        probe: { eq: `△ = □ + ${cc}`, given: '□', val: N, shown: N - cc },
      });
    },
  },

  {
    id: 'cor.life', grade: 5, name: '생활 속 대응 관계', needs: ['cor.value'],
    idea: '생활 속에도 대응 관계가 많아요 — 도시마다 다른 시각, 통나무 도막과 자른 횟수, 함께 오르는 레벨. **곱하는 관계인지, 차이가 늘 같은 관계인지**부터 가려요.',
    slip: '작은 수로 몇 번 해 보고 두 양이 어떻게 따라 변하는지 봐요.',
    calc(r, c) {
      const p = int(r, 2, 9); const cc = int(r, 2, 6); const q = p + cc; const t = int(r, 2, 4); const N = p * t;
      const C = pickFor(r, c, CITIES, (x, w) => w.includes(x.name)); const g = C.g;
      // 물어보는 시각 H는 H + g가 12를 넘지 않게 ("오후 14시" 같은 오답이 안 나오게), 알려 주는 시각 h는 H와 다르게
      const H = int(r, g + 1, 12 - g); let h = int(r, g + 1, 11); if (h === H) h = h === 11 ? g + 1 : h + 1;
      const n = int(r, 5, 15);
      const pr = pick(r, [5, 10, 15, 20]); const Nd = int(r, 3, 10); const Md = pr * Nd;
      const fams = [
        { ans: String(N + cc), wr: [{ text: String(q * t), tag: TAGS.propForAdd }, { text: String(N - cc), tag: TAGS.swapDir }],
          why: {
            [TAGS.propForAdd]: `레벨이 ${t}배가 되는 게 아니라 둘 다 똑같이 ${N - p}씩 올라요. 차이 ${jn(cc, '은', '는')} 그대로예요.`,
            [TAGS.swapDir]: `{mon2}의 레벨이 늘 ${cc} 높아요 — 빼지 않고 더해요.`,
          },
          steps: [`레벨이 똑같이 오르니까 차이는 늘 ${q} − ${p} = ${cc}`, `${N} + ${cc} = ${N + cc}`],
          rule: '함께 늘어나는 두 양은 차이가 그대로다.',
          pools: { pokemon: [`{mon/과/와} {mon2/은/는} 늘 함께 배틀해서 레벨이 똑같이 올라요. 지금 {mon}의 레벨은 ${p}, {mon2}의 레벨은 ${q}인데, {mon}의 레벨이 ${jn(N, '이', '가')} 되면 {mon2}의 레벨은 얼마일까요?`] } },
        { ans: String(H - g), wr: [{ text: String(H + g), tag: TAGS.swapDir }, { text: String(H), tag: TAGS.sameCount }],
          why: {
            [TAGS.swapDir]: `${jw(C.name, '은', '는')} 서울보다 ${g}시간 느려요 — 더하지 않고 빼요.`,
            [TAGS.sameCount]: `두 도시의 시각은 달라요 — 늘 ${g}시간 차이예요.`,
          },
          steps: [`서울 ${h}시일 때 ${C.name} ${h - g}시 → ${jw(C.name, '은', '는')} 서울보다 늘 ${g}시간 느려요`, `${H} − ${g} = ${H - g} → 오후 ${H - g}시`],
          rule: '시차처럼 차이가 늘 같은 관계는 더하거나 뺀다.',
          pools: { pokemon: [`서울이 오후 ${h}시일 때 ${jw(C.name, '은', '는')} 오후 ${h - g}시예요. 서울이 오후 ${H}시일 때 ${jw(C.name, '은', '는')} 오후 몇 시일까요?`] } },
        { ans: String(n - 1), wr: [{ text: String(n), tag: TAGS.sameCount }, { text: String(n + 1), tag: TAGS.swapDir }],
          why: {
            [TAGS.sameCount]: '마지막 도막은 자르지 않아도 생겨요 — 1번만 잘라도 벌써 2도막이에요.',
            [TAGS.swapDir]: '자른 횟수가 도막 수보다 1 적어요 — 더하지 않고 빼요.',
          },
          steps: ['1번 자르면 2도막, 2번 자르면 3도막 — 자른 횟수는 도막 수보다 1 적어요', `${n} − 1 = ${n - 1}번`],
          rule: '자른 횟수 = 도막 수 − 1.',
          pools: { pokemon: [`{mon/이/가} 통나무를 잘라서 똑같은 길이의 도막 ${n}개를 만들려고 해요. 몇 번 잘라야 할까요?`] } },
        { ans: String(Nd), wr: [{ text: String(Md * pr), tag: TAGS.noInverse }, { text: String(Md - pr), tag: TAGS.wrongInverse }],
          why: {
            [TAGS.noInverse]: `${Md} × ${jn(pr, '은', '는')} 코인을 또 ${pr}배 한 거예요. 코인 수를 알 때는 ${ro(pr)} 나눠요.`,
            [TAGS.wrongInverse]: `한 개에 ${pr}개씩이니까 빼기가 아니라 나누기예요.`,
          },
          steps: [`(코인 수) = (나무열매 수) × ${pr}`, `거꾸로: ${Md} ÷ ${pr} = ${Nd}개`],
          rule: '곱하는 관계를 거꾸로 → 나누기.',
          pools: { pokemon: [`{mon/이/가} 나무열매를 사요. 나무열매는 한 개에 코인 ${pr}개예요. 코인 ${Md}개를 모두 쓰면 나무열매를 몇 개 살 수 있을까요?`] } },
        // (통나무 식 "△ = □ − 1" 고르기는 수가 하나도 없어 🔁 쌍둥이가 늘 같은 글이 된다 — 배움 장 H7-2에만 둔다)
      ];
      return finish(this.id, r, c, pickFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['prop', 'fence']) === 'prop') {
        const p = int(r, 2, 9); const cc = int(r, 2, 6); const q = p + cc; const t = int(r, 2, 4); const N = p * t;
        return finishMis(this.id, 'prop', r, c, {
          q: `{mon/과/와} {mon2/은/는} 늘 함께 배틀해서 레벨이 똑같이 올라요. 지금 {mon}의 레벨은 ${p}, {mon2}의 레벨은 ${jn(q, '이에요', '예요')}.\n\n${showWork(`{mon}의 레벨이 ${jn(N, '이', '가')} 되면 {mon2}의 레벨은 ${jn(q * t, '이에요', '예요')} — 둘 다 ${t}배가 되니까요`)}`,
          ok: `레벨 차이는 늘 ${cc} — ${N} + ${cc} = ${N + cc}`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: `${N} − ${cc} = ${jn(N - cc, '이에요', '예요')}`, tag: TAGS.swapDir },
            { text: '두 레벨은 곧 똑같아져요', tag: OFF },
          ],
          steps: [`둘 다 똑같이 ${N - p}씩 올라요 — 차이 ${jn(cc, '은', '는')} 그대로`, `${N} + ${cc} = ${N + cc}`],
          whyAny: `레벨은 배로 늘지 않고 둘 다 똑같이 올라요. 차이 ${jn(cc, '이', '가')} 그대로예요.`,
          rule: '함께 늘어나는 두 양은 차이가 그대로다.',
          probe: { p, q, N, shown: q * t },
        });
      }
      const n = int(r, 5, 15);
      return finishMis(this.id, 'fence', r, c, {
        q: `통나무를 잘라서 똑같은 길이의 도막 ${n}개를 만들려고 해요.\n\n${showWork(`도막이 ${n}개니까 ${n}번 잘라야 해요`)}`,
        ok: `마지막 도막은 안 잘라도 생겨요 — ${n - 1}번`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `${n + 1}번 잘라야 해요`, tag: TAGS.swapDir },
          { text: '자른 횟수와 도막 수는 상관없어요', tag: OFF },
        ],
        steps: ['1번 자르면 2도막, 2번 자르면 3도막', `도막 ${n}개 → ${n - 1}번`],
        whyAny: '자른 횟수는 도막 수보다 1 적어요 — 1번만 잘라도 2도막이에요.',
        rule: '자른 횟수 = 도막 수 − 1.',
        probe: { n, shown: n },
      });
    },
  },

  {
    id: 'cor.twostep', grade: 5, name: '두 번 셈하는 대응', needs: ['cor.life'],
    idea: '늘어나는 수가 2인데 1번째가 2가 아니면 식이 **두 번 셈**이 돼요. 3, 5, 7, 9 → 2씩 늘고 1번째가 3 = 2 × 1 + 1 → △ = □ × 2 + 1. 곱하는 수는 **늘어나는 수**, 더하는 수는 **처음에 남는 수**예요.',
    slip: '늘어나는 수를 먼저 찾고, 1번째에서 얼마가 남는지 봐요.',
    calc(r, c) {
      const a = int(r, 2, 5); const b = int(r, 1, 4); const s = a + b;
      const cs3 = [s, s + a, s + 2 * a]; const ys = [s, s + a, s + 2 * a, s + 3 * a];
      const N = int(r, 8, 15);
      const Nc = int(r, 6, 15); const M = a * Nc + b;
      const two = `△ = □ × ${a} + ${b}`;
      const fams = [
        { ans: String(a * N + b), wr: [{ text: String(a * N), tag: TAGS.dropAdd }, { text: String(s * N), tag: TAGS.firstAsMul }, { text: String(N + a), tag: TAGS.stepAsRule }],
          why: {
            [TAGS.dropAdd]: `${a} × ${N}에는 처음에 남는 ${b}개가 빠졌어요 — 1번째가 ${a}개가 아니라 ${s}개예요.`,
            [TAGS.firstAsMul]: `1번째가 ${s}개지만, 그다음부터는 ${s}개씩이 아니라 ${a}개씩 늘어요.`,
            [TAGS.stepAsRule]: `${N} + ${jn(a, '은', '는')} 모양 순서에 늘어나는 수를 한 번 더한 거예요. 늘어나는 수는 모양마다 한 번씩 — 곱해요.`,
          },
          steps: [`블록 수: ${L(cs3)} — ${a}개씩 늘어요`, `1번째 ${s}개 = ${a} × 1 + ${b} → 몇 번째 × ${a} + ${b}`, `${a} × ${N} + ${b} = ${a * N + b}개`],
          rule: '블록 수 = 늘어나는 수 × 몇 번째 + 처음에 남는 수.',
          pools: { pokemon: [`{mon/이/가} 블록으로 규칙에 따라 모양을 만들었어요.\n\n[steps ${cs3.join(' ')}]\n\n${N}번째 모양에는 블록이 몇 개일까요?`] } },
        { words: true, ans: two, wr: [{ text: `△ = □ × ${a}`, tag: TAGS.dropAdd }, { text: `△ = □ + ${a}`, tag: TAGS.stepAsRule }, { text: `△ = □ × ${s}`, tag: TAGS.firstAsMul }],
          why: {
            [TAGS.dropAdd]: `□ × ${jn(a, '은', '는')} □가 1일 때 ${jn(a, '이에요', '예요')}. 표는 ${jn(s, '이라서', '라서')} ${jn(b, '을', '를')} 더해야 해요.`,
            [TAGS.stepAsRule]: `□ + ${jn(a, '은', '는')} □가 2일 때 ${jn(2 + a, '이에요', '예요')}. 표는 ${jn(s + a, '이에요', '예요')}.`,
            [TAGS.firstAsMul]: `□ × ${jn(s, '은', '는')} 1번째에만 맞아요 — □가 2면 ${2 * s}인데 표는 ${jn(s + a, '이에요', '예요')}.`,
          },
          steps: [`△가 ${a}씩 커져요 → □ × ${a}에서 시작`, `□가 1일 때 □ × ${a} = ${a}, △는 ${jn(s, '이라서', '라서')} ${b} 더 → ${two}`],
          rule: '△ = □ × (늘어나는 수) + (처음에 남는 수).',
          pools: { pokemon: [`블록 모양의 순서와 블록 수를 표로 나타냈어요.\n\n[table 모양의 순서(□):1, 2, 3, 4 / 블록 수(△):${L(ys)}]\n\n□와 △ 사이의 대응 관계를 식으로 나타내면 어느 것일까요?`] } },
        { ans: String(Nc), wr: [{ text: String(M - b), tag: TAGS.halfInverse }, (M + b) % a === 0 ? { text: String((M + b) / a), tag: TAGS.wrongInverse } : null, { text: String(a * M + b), tag: TAGS.noInverse }],
          why: {
            [TAGS.halfInverse]: `${jn(b, '은', '는')} 뺐지만 × ${jn(a, '을', '를')} 되돌리지 않았어요 — ${ro(a)} 나눠야 해요.`,
            [TAGS.wrongInverse]: `더한 ${jn(b, '은', '는')} 되돌릴 때 빼요.`,
            [TAGS.noInverse]: '△에 식을 또 쓴 거예요. 거꾸로는 반대 셈을 반대 순서로 해요.',
          },
          steps: [`□ × ${a} + ${b} = ${M}`, `거꾸로 — 먼저 ${jn(b, '을', '를')} 빼요: ${M} − ${b} = ${M - b}`, `그다음 ${ro(a)} 나눠요: ${M - b} ÷ ${a} = ${Nc}`],
          rule: '두 번 셈을 거꾸로: 더한 것을 먼저 빼고, 곱한 것을 나눈다.',
          pools: { pokemon: [`${two}에서 △가 ${M}일 때 □는 얼마일까요?`] } },
      ];
      return finish(this.id, r, c, pickFamily(r, c, fams));
    },
    misread(r, c) {
      const a = int(r, 2, 5); const b = int(r, 1, 4); const s = a + b;
      if (branchOf(r, c, ['drop', 'first']) === 'drop') {
        const ys = [s, s + a, s + 2 * a, s + 3 * a];
        return finishMis(this.id, 'drop', r, c, {
          q: `블록 모양의 순서와 블록 수를 표로 나타냈어요.\n\n[table 모양의 순서(□):1, 2, 3, 4 / 블록 수(△):${L(ys)}]\n\n${showWork(`△ = □ × ${jn(a, '이에요', '예요')} — ${a}개씩 늘어나니까요`)}`,
          ok: `□가 1일 때 △는 ${s} — △ = □ × ${a} + ${b}`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: `△ = □ + ${jn(a, '이에요', '예요')}`, tag: TAGS.stepAsRule },
            { text: '두 번 셈하는 식은 쓸 수 없어요', tag: OFF },
          ],
          steps: [`□가 1일 때 □ × ${a} = ${a}, 표는 ${s} → ${b} 더 많아요`, `△ = □ × ${a} + ${b}`],
          whyAny: `늘어나는 수만 봤어요. □가 1일 때 △가 ${jn(s, '이라서', '라서')} ${jn(b, '을', '를')} 더해야 해요.`,
          rule: '△ = □ × (늘어나는 수) + (처음에 남는 수).',
          probe: { xs: [1, 2, 3, 4], ys, shownEq: `△ = □ × ${a}` },
        });
      }
      const cs3 = [s, s + a, s + 2 * a]; const N = int(r, 8, 15);
      return finishMis(this.id, 'first', r, c, {
        q: `{me/이/가} 블록으로 규칙에 따라 모양을 만들었어요.\n\n[steps ${cs3.join(' ')}]\n\n${showWork(`1번째 모양이 ${s}개니까 ${N}번째는 ${s} × ${N} = ${s * N}개예요`)}`,
        ok: `${a}개씩 늘어요 — ${a} × ${N} + ${b} = ${a * N + b}개`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `${a} × ${N} = ${a * N}개예요`, tag: TAGS.dropAdd },
          { text: `${N}번째 모양은 1번째 모양과 블록 수가 같아요`, tag: OFF },
        ],
        steps: [`${s}개 → ${s + a}개 → ${s + 2 * a}개: ${a}개씩`, `${a} × ${N} + ${b} = ${a * N + b}개`],
        whyAny: `1번째 블록 수를 곱했어요. 그다음부터는 ${a}개씩 늘어요.`,
        rule: '블록 수 = 늘어나는 수 × 몇 번째 + 처음에 남는 수.',
        probe: { steps: cs3, nth: N, shown: s * N },
      });
    },
  },
];

export function conceptById(id) {
  return CORRESPOND.find((c) => c.id === id) || null;
}

// ───────────────────── 문항 만들기 (mathfac·mathrat와 같은 모양) ─────────────────────

/**
 * 개념 하나의 문항 한 개. `probe` = 테스트가 쓰는 재료 (화면은 쓰지 않는다)
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
  // "계산 실수" 오답(보기를 채운 근처 값)에도 한 마디 — 이름표별 설명이 없는 오답은 이것을 본다
  if (q && q.solve && !q.solve.whyAny) q.solve.whyAny = c.slip || SLIP;
  return q ? { ...q, key: q.key || cast.key || '' } : q;
}
const SLIP = '한 번 더 천천히 — 위아래 짝에 같은 셈이 맞는지 확인해 봐요.';

export function makeRound(conceptId, seed, opts) {
  const out = ['calc', 'misread', 'why'].map((k, i) => makeQuestion(conceptId, k, seed + i * 7919, opts));
  const sp = makeQuestion(conceptId, 'special', seed + 3 * 7919, opts);
  if (sp) out.push(sp);
  return out.filter(Boolean);
}

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

export function diagnosticSet(seed, n = 5, opts) {
  return diagnosticOf(CORRESPOND, makeQuestion, seed, n, opts);
}
export function placeFrom(answers) {
  return placeFromOf(CORRESPOND, answers);
}
export function ladder(doneIds) {
  return ladderOf(CORRESPOND, doneIds);
}

// ───────────────────── 사람이 쓴 내용 검사 (check.mjs가 부른다) ─────────────────────

function badPlaceholders(txt) {
  const leak = String(txt || '').match(/\{[^}]*\}/g) || [];
  return leak.filter((l) => !/^\{(me|mon|mon2)(\/[^/}]+\/[^}]+)?\}$/.test(l));
}
function badFigures(txt) {
  const figs = String(txt || '').match(/\[[a-z]+ [^\]]+\]/g) || [];
  return figs.filter((f) => !figureSvg(f.slice(1, -1)));
}
/** 보기 글자 → {n, d} — checkHuman의 "정답과 같은 값" 검사용 */
function fracValue(text) {
  const v = valueOf(text);
  if (v === null) return null;
  return { n: Math.round(v * 10000), d: 10000 };
}

/**
 * coach/math/correspond.json 형식 검사 — mathfac.checkContent와 같은 규칙
 * @returns {string[]}
 */
export function checkContent(content) {
  const bad = [];
  for (const c of CORRESPOND) {
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
      for (const f of badFigures(ck.q)) bad.push(`${c.id}[${i}]: 확인 질문의 못 그리는 그림 ${f}`);
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
    if (v.why || v.special) checkHuman(c.id, v, bad, fracValue);
  }
  return bad;
}
