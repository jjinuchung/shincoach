// 📐 수학 — Z 각도 줄기 (초4 「각도」 4-1 2단원): 개념 사다리 + 문제 생성기 + 내용 형식 검사.
// 순수 함수만 — 화면 없음 (node 테스트에서 그대로 돈다).
//
// 왜 이 줄기인가 (2026-10-08, 4-1 네 단원 설계안 → 아버님 "Z 각도 줄기의 칸별 설계안" → "이대로 진행"):
//   사다리에 각도의 바탕(1°·각도기·예각과 둔각·어림·합과 차)이 없었다 — J 줄기의 "삼각형·사각형의 각의 합" 칸 하나뿐.
//   지도서가 꼽은 흔한 오류: 변이 길면 각도도 크다고 봄(천재 2022 지도서 104쪽 Q&A) · 각도기의 반대쪽 눈금을 읽음 ·
//   각도기의 중심·밑금을 안 맞춤 · 예각과 둔각 구별 · 측정 오차(세 각의 합이 180°가 아니게 나옴) · 사각형을 삼각형 4개로 나눠 720°.
//   (아이 기록의 수치·칸별 진단은 공개 코드에 적지 않는다 — Codex 36~39차, 기록은 비공개 저장소에만)
// 칸 범위: 2022 개정 [4수03-02] 예각·둔각 · [4수03-24] 1°·각도기·측정과 어림 · [4수03-25] 삼각형·사각형 내각의 합 추론
//   — 천재(한대희) 2022 4-1 지도서 2단원 11차시: 각의 크기 비교 → 각도와 각도기 → 예각·둔각 → 어림 → 합과 차 → 삼각형 180° → 사각형 360°.
//   2022에서 빠진 것: 주어진 각 그리기([4수03-13]은 2015에만) · 180°보다 큰 각(270°·360°는 직관으로만) → 각은 180° 이하만 묻는다.
//   "내각"이라는 말은 쓰지 않는다(지도서). "대각선"은 J8(4-2)에서 배우는 말이라 쓰지 않는다 — "선분을 그어 삼각형 두 개로".
// 각은 5의 배수만 — 각도기 그림은 5°마다 눈금(폰에서 1° 눈금은 안 보인다), 합·차·삼각형·사각형도 같게.
// J 줄기의 "삼각형·사각형의 각의 합" 칸은 그대로 둔다(이등변·정다각형이 섞인 4-2 응용) — Z6·Z7은 4-1 수준(재기·잘라 모으기·한 각 구하기).
// 시곗바늘이 이루는 각은 넣지 않는다(그림이 하나 더 필요한데 교과서에서는 활동 자료 정도).
//
// 새 줄기의 함정(메모 stem-generator-pitfalls)을 처음부터: 가족 = 틀 여러 개 · ② 갈래마다 key · 그림의 변 길이·호 크기도 수로 적어 틀 열쇠가 늘 같게 ·
//   오답끼리·정답과 같은 값은 뽑지 않는다(clean → probe.allWrong) · 한 오답 값은 한 틀린 생각에만 맞게(뽑기 조건으로) ·
//   ° 뒤의 조사는 "도"로 읽어 늘 받침 없는 쪽(는·가·를·예요)
// ★ 정답·오답은 테스트가 **문제 글과 그림 지시문을 따로 읽어** 다시 푼다 — 그림은 그린 SVG에서 각을 다시 잰다 (tests/mathangle.test.js).

import { rng, castOf, fill, int, pick, shuffle, ask, solve, humanQuestion, checkHuman, diagnosticOf, placeFromOf, ladderOf } from './mathgen.js';
import { gradeLabel } from './mathmix.js';
import { _kit } from './mathexpr.js';

export { gradeLabel };

const { famOf, runFamily, misAsk, textChoices, jfix, branchOf, showWork, step, RIGHT_AS_WRONG, OFF } = _kit;

// ───────────────────── 재료 ─────────────────────

const NM = ['가', '나', '다'];
const VN = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ'];
/** 5의 배수 lo~hi */
const f5 = (r, lo, hi) => 5 * int(r, Math.ceil(lo / 5), Math.floor(hi / 5));
/** 조건에 맞을 때까지 다시 뽑기 */
function draw(gen, ok) {
  for (let k = 0; k < 6000; k++) { const v = gen(); if (ok(v)) return v; }
  throw new Error('draw: 조건에 맞는 수를 못 뽑음');
}
const allDiff = (...xs) => new Set(xs).size === xs.length;
/** [ang] 한 각의 지시문 — 이름:각도/변/호@돌림 (변·호·돌림도 수라서 틀 열쇠가 늘 같다) */
const angTok = (it) => `${it.name}:${it.v}/${it.arm}/${it.arc}@${it.rot}`;
/** 이름 순서(가·나·다)대로 적은 [ang] 지시문 */
const angFig = (items) => `[ang ${items.slice().sort((a, b) => NM.indexOf(a.name) - NM.indexOf(b.name)).map(angTok).join(' ')}]`;
/** 이름 셋을 섞어 붙인다 */
// 각이 둘이면 가·나 — 셋 중 둘을 뽑으면 "가와 다"처럼 틀 글이 바뀌어 🔁 쌍둥이 열쇠가 갈린다
const named = (r, items) => { const ns = shuffle(r, NM.slice(0, items.length)); return items.map((it, i) => ({ ...it, name: ns[i] })); };
const ARM_S = 60; const ARM_M = 85; const ARM_L = 125;
const BOLD = (x) => `**${x}**`;
const D = (v) => `${v}°`;
const WORK = (line, verb = '말했어요') => showWork(line, verb);
const RIGHT = { text: '맞게 말했어요', tag: RIGHT_AS_WRONG };

// ───────────────────── 오답 정리·보기 ─────────────────────

/** 수 오답 정리 — 자연수가 아니거나·360 넘거나·정답과 같거나·앞의 오답과 같은 값은 버린다 (probe.allWrong이 곧 이 목록) */
function clean(ans, list) {
  const out = [];
  for (const w of list) {
    if (!w || !Number.isInteger(w.v) || w.v <= 0 || w.v > 360 || w.v === ans || out.some((o) => o.v === w.v)) continue;
    out.push(w);
  }
  return out;
}
const W = (v, tag) => ({ v, tag });
/** 수 보기 4개 — 정답 + 오개념 오답 + 모자라면 근처 수("계산 실수": 각도는 5씩, 개수는 1씩) */
function nchoices(r, ans, wr) {
  const list = [{ text: String(ans), ok: true }];
  const seen = new Set([ans]);
  for (const w of wr) { if (list.length >= 4) break; seen.add(w.v); list.push({ text: String(w.v), ok: false, tag: w.tag }); }
  const st = ans < 10 ? [1, -1, 2, -2, 3] : [5, -5, 10, -10, 15, -15, 20];
  for (const d of st) {
    if (list.length >= 4) break;
    const v = ans + d;
    if (v > 0 && v <= 360 && !seen.has(v)) { seen.add(v); list.push({ text: String(v), ok: false, tag: '계산 실수' }); }
  }
  return shuffle(r, list);
}
/**
 * 고른 틀로 ① 문항 — v: { t, ans, words(보기에서 고르기 — ans·wr.v가 보기 글), wr: [{v, tag}], steps, why, whyAny, rule, probe }
 * 수 문제(words 없음)는 숫자판 — 보기도 수만("75"), 단위는 문제 끝 "몇 도일까요?"에서 숫자판이 읽는다(각이 든 글이면 °)
 */
function zcalcAsk(r, c, concept, v) {
  const F = (t) => jfix(fill(t, c));
  const wr = v.wr.map((w) => ({ text: F(String(w.v)), tag: w.tag }));
  const chs = v.words ? textChoices(r, F(String(v.ans)), wr) : nchoices(r, v.ans, v.wr);
  const why = Object.fromEntries(Object.entries(v.why || {}).map(([k, t]) => [k, F(t)]));
  return {
    ...ask(concept.id, 'calc', F(v.t), chs, { solve: solve(v.steps.map((s, i) => step(i, F(s))), { why, whyAny: F(v.whyAny || ''), rule: v.rule || concept.rule }) }),
    probe: { ...(v.probe || {}), allWrong: wr },
  };
}
const askFam = (r, c, concept, fams) => zcalcAsk(r, c, concept, runFamily(r, c, fams));

/** 이 줄기의 오개념 이름표 (📊·🤔 노트·결과 카드에 그대로 뜬다) — 이름표 하나에 생각 하나 */
export const TAGS = {
  armLen: '변이 긴 각을 큰 각으로 봄',
  arcBig: '각을 표시한 호가 큰 각을 큰 각으로 봄',
  scaleSwap: '안쪽과 바깥쪽 눈금을 바꿔 읽음',
  tickMiss: '숫자가 적힌 눈금만 읽음',
  notZero: '0에 맞추지 않은 변의 눈금을 그대로 읽음',
  swap: '예각과 둔각을 바꿔 앎',
  rightAs: '직각도 예각이나 둔각으로 봄',
  straightAs: '180°도 둔각으로 봄',
  sideMiss: '직각보다 작은지 큰지 먼저 보지 않음',
  refMiss: '30°·45°·60°와 견주어 보지 않음',
  opSwap: '합과 차를 바꿈',
  otherAngle: '삼각자의 다른 각을 씀',
  triAs360: '삼각형의 세 각의 합을 360°로 봄',
  quadAs180: '사각형의 네 각의 합을 180°로 봄',
  addNotSub: '아는 각을 더하기만 함',
  missOne: '아는 각 하나를 빼지 않음',
  measured: '잰 값을 그대로 믿음',
  innerExtra: '가운데 모인 각까지 셈',
  straightMiss: '일직선이 이루는 180°를 쓰지 않음',
};

// ───────────────────── Z1 그림 재료 — 크기·변·호가 서로 엇갈린 세 각 ─────────────────────

/**
 * 가장 큰 각 묻기 — 정답(변 짧고 호 작음) · 변이 가장 긴 각(armLen이 고른다) · 호가 가장 큰 각(arcBig이 고른다).
 * 변 길이 순서와 호 크기 순서가 각자 한 각만 가리키게 — 한 오답 = 한 생각
 */
function trioMax(r) {
  const [X, Y, Z] = draw(() => { const x = f5(r, 85, 150); return [x, f5(r, 30, x - 30), f5(r, 30, x - 30)]; }, ([x, y, z]) => Math.abs(y - z) >= 10 && y < x && z < x);
  const rot = () => f5(r, 0, 20);
  return named(r, [{ v: X, arm: ARM_S, arc: 16, rot: rot(), role: 'ok' }, { v: Y, arm: ARM_L, arc: 16, rot: rot(), role: 'arm' }, { v: Z, arm: ARM_M, arc: 40, rot: rot(), role: 'arc' }]);
}
/** 가장 작은 각 묻기 — 정답(변 가장 길고 호 가장 큼) · 변이 가장 짧은 각(armLen) · 호가 가장 작은 각(arcBig) */
function trioMin(r) {
  const [X, Y, Z] = draw(() => { const x = f5(r, 25, 60); return [x, f5(r, x + 30, 150), f5(r, x + 30, 150)]; }, ([, y, z]) => Math.abs(y - z) >= 10);
  const rot = () => f5(r, 0, 20);
  return named(r, [{ v: X, arm: ARM_L, arc: 40, rot: rot(), role: 'ok' }, { v: Y, arm: ARM_S, arc: 28, rot: rot(), role: 'arm' }, { v: Z, arm: ARM_M, arc: 14, rot: rot(), role: 'arc' }]);
}
const roleOf = (items, role) => items.find((x) => x.role === role).name;

// ───────────────────── 개념 사다리 (Z. 각도 줄기) ─────────────────────

export const ANGLE = [
  {
    id: 'ang.compare', grade: 4, name: '각의 크기 비교', needs: [],
    idea: '각의 크기는 두 변이 **벌어진 정도**예요. 변을 길게 그리거나 각을 표시한 호를 크게 그려도 각의 크기는 그대로예요 — 변이 짧아도 더 많이 벌어진 각이 더 큰 각이에요.',
    rule: '각의 크기는 두 변이 벌어진 정도로 비교해요 — 변의 길이·호의 크기는 보지 않아요.',
    slip: '두 변이 얼마나 벌어졌는지만 봐요.',
    calc(r, c) {
      const most = (big) => {
        const items = big ? trioMax(r) : trioMin(r);
        const ok = roleOf(items, 'ok'); const arm = roleOf(items, 'arm'); const arc = roleOf(items, 'arc');
        const word = big ? '큰' : '작은';
        return {
          words: true, t: `${angFig(items)}\n\n세 각 가, 나, 다 중에서 가장 ${word} 각은 어느 것일까요?`, ans: ok,
          wr: [W(arm, TAGS.armLen), W(arc, TAGS.arcBig)],
          why: {
            [TAGS.armLen]: `${arm}는 변을 ${big ? '길게' : '짧게'} 그렸을 뿐이에요 — 벌어진 정도를 봐요.`,
            [TAGS.arcBig]: `${arc}는 호를 ${big ? '크게' : '작게'} 그렸을 뿐이에요 — 벌어진 정도를 봐요.`,
          },
          steps: ['두 변이 벌어진 정도를 비교해요 — 변의 길이·호의 크기는 상관없어요', `가장 ${big ? '많이' : '적게'} 벌어진 각은 ${ok}`],
          probe: { ask: big ? 'max' : 'min' },
        };
      };
      const same = () => {
        const V = f5(r, 35, 140);
        const items = named(r, [{ v: V, arm: ARM_L, arc: 16, rot: f5(r, 0, 30), role: 'arm' }, { v: V, arm: ARM_S, arc: 40, rot: f5(r, 0, 30), role: 'arc' }]);
        const arm = roleOf(items, 'arm'); const arc = roleOf(items, 'arc');
        return {
          words: true, t: `${angFig(items)}\n\n두 각 가와 나의 크기를 바르게 비교한 것은 어느 것일까요?`, ans: '두 각의 크기가 같아요',
          wr: [W(`${arm}가 더 커요`, TAGS.armLen), W(`${arc}가 더 커요`, TAGS.arcBig)],
          why: { [TAGS.armLen]: `${arm}는 변만 길어요 — 두 변이 벌어진 정도는 같아요.`, [TAGS.arcBig]: `${arc}는 호만 커요 — 두 변이 벌어진 정도는 같아요.` },
          steps: ['두 각을 겹쳐 보면 두 변이 벌어진 정도가 같아요', '두 각의 크기가 같아요'],
          probe: { ask: 'same' },
        };
      };
      return askFam(r, c, this, [famOf([most(true)]), famOf([most(false)]), famOf([same()])]);
    },
    misread(r, c) {
      const items = trioMax(r);
      const ok = roleOf(items, 'ok'); const arm = roleOf(items, 'arm'); const arc = roleOf(items, 'arc');
      const common = { ok: `벌어진 정도를 봐야 해요 — ${ok}가 가장 큰 각이에요`, steps: ['두 변이 벌어진 정도를 비교해요', `가장 많이 벌어진 각은 ${ok}`], probe: { ask: 'max' } };
      if (branchOf(r, c, ['arm', 'arc']) === 'arm') {
        return misAsk(r, c, this, 'arm', {
          ...common, q: `${angFig(items)}\n\n${WORK(`${arm}의 변이 가장 기니까 ${arm}가 가장 큰 각이에요`)}`,
          wr: [RIGHT, { text: `호가 가장 큰 ${arc}가 가장 큰 각이에요`, tag: TAGS.arcBig }, { text: '각은 크기를 비교할 수 없어요', tag: OFF }],
          whyAny: '변의 길이는 각의 크기와 상관없어요 — 두 변이 벌어진 정도를 봐요.',
        });
      }
      return misAsk(r, c, this, 'arc', {
        ...common, q: `${angFig(items)}\n\n${WORK(`${arc}의 호가 가장 크니까 ${arc}가 가장 큰 각이에요`)}`,
        wr: [RIGHT, { text: `변이 가장 긴 ${arm}가 가장 큰 각이에요`, tag: TAGS.armLen }, { text: '각은 크기를 비교할 수 없어요', tag: OFF }],
        whyAny: '각을 표시한 호의 크기는 각의 크기와 상관없어요 — 두 변이 벌어진 정도를 봐요.',
      });
    },
  },

  {
    id: 'ang.measure', grade: 4, name: '각도와 각도기', needs: ['ang.compare'],
    idea: '직각을 똑같이 90으로 나눈 것 하나가 **1도(1°)**예요 — 직각은 90°. 각도기로 잴 때는 **중심을 꼭짓점에**, **밑금을 각의 한 변에** 맞추고, 그 변이 지나는 0에서 시작하는 눈금(안쪽 또는 바깥쪽)을 따라 다른 변이 지나는 수를 읽어요.',
    rule: '각도기는 중심을 꼭짓점에, 밑금을 한 변에 맞추고 — 0에서 시작한 쪽 눈금을 읽어요.',
    slip: '한 변이 지나는 0이 안쪽 눈금인지 바깥쪽 눈금인지 먼저 봐요.',
    calc(r, c) {
      const read = (left) => {
        const A = draw(() => f5(r, 15, 165), (x) => x !== 90);
        const ring = left ? '바깥쪽' : '안쪽'; const other = left ? '안쪽' : '바깥쪽';
        const wr = [W(180 - A, TAGS.scaleSwap)];
        if (A % 10) wr.push(W(A - 5, TAGS.tickMiss));
        return {
          t: `[prot 0 ${A}${left ? ' left' : ''}]\n\n각도기로 각의 크기를 재었어요. 이 각은 몇 도일까요?`, ans: A, wr: clean(A, wr),
          why: {
            [TAGS.scaleSwap]: `${180 - A}은 ${other} 눈금이에요 — 한 변이 0에 있는 ${ring} 눈금을 따라 읽어요.`,
            [TAGS.tickMiss]: `작은 눈금 한 칸은 5°예요 — ${A - 5}에서 한 칸 더 가요.`,
          },
          steps: [`한 변이 ${left ? '왼쪽' : '오른쪽'}의 0에 있어요 — ${ring} 눈금을 읽어요`, `다른 변이 지나는 ${ring} 눈금은 ${A} — ${A}°`],
          probe: { ask: left ? 'left' : 'right' },
        };
      };
      return askFam(r, c, this, [famOf([read(false)]), famOf([read(true)])]);
    },
    misread(r, c) {
      if (branchOf(r, c, ['swap', 'zero']) === 'swap') {
        const A = draw(() => f5(r, 15, 165), (x) => x % 10 === 5);
        const left = r() < 0.5; const ring = left ? '바깥쪽' : '안쪽';
        return misAsk(r, c, this, 'swap', {
          q: `[prot 0 ${A}${left ? ' left' : ''}]\n\n${WORK(`이 각은 ${D(180 - A)}예요`)}`,
          ok: `0에서 시작한 ${ring} 눈금을 읽어요 — ${D(A)}예요`,
          wr: [RIGHT, { text: `숫자가 적힌 눈금만 읽어 ${D(A - 5)}예요`, tag: TAGS.tickMiss }, { text: '각도기로는 각을 잴 수 없어요', tag: OFF }],
          steps: [`한 변이 ${left ? '왼쪽' : '오른쪽'}의 0에 있어요 — ${ring} 눈금을 읽어요`, `이 각은 ${D(A)}`],
          whyAny: `안쪽과 바깥쪽 눈금을 바꿔 읽었어요 — ${180 - A}은 0이 반대쪽에 있는 눈금이에요.`,
          probe: { ask: 'swap' },
        });
      }
      const S = f5(r, 10, 40); const E = f5(r, S + 30, 175);
      return misAsk(r, c, this, 'zero', {
        q: `[prot ${S} ${E}]\n\n${WORK(`이 각은 ${D(E)}예요`, '쟀어요')}`,
        ok: `한 변이 0이 아닌 ${S}에 있어요 — ${D(E)} − ${D(S)} = ${D(E - S)}예요`,
        wr: [RIGHT, { text: `두 눈금을 더해 ${D(E + S)}예요`, tag: TAGS.opSwap }, { text: '0에 맞추지 않아도 끝 눈금이 각도예요', tag: OFF }],
        steps: [`한 변이 0이 아닌 ${S} 눈금에 있어요`, `${D(E)} − ${D(S)} = ${D(E - S)}`],
        whyAny: '밑금을 각의 한 변에 맞추지 않았어요 — 한 변을 0에 맞추고 재요.',
        probe: { ask: 'zero', S, E },
      });
    },
  },

  {
    id: 'ang.acute', grade: 4, name: '예각과 둔각', needs: ['ang.measure'],
    idea: '각도가 0°보다 크고 직각보다 작은 각은 **예각**, 직각보다 크고 180°보다 작은 각은 **둔각**이에요. 90°는 직각 — 예각도 둔각도 아니에요.',
    rule: '직각(90°)과 견줘요 — 작으면 예각, 크고 180°보다 작으면 둔각.',
    slip: '먼저 90°보다 작은지 큰지 봐요.',
    calc(r, c) {
      const ac = () => f5(r, 10, 85); const ob = () => f5(r, 95, 175);
      const pickOb = () => {
        const O = ob(); const A = ac();
        return {
          words: true, t: '다음 중 둔각은 어느 것일까요?', ans: D(O),
          wr: [W(D(A), TAGS.swap), W(D(90), TAGS.rightAs), W(D(180), TAGS.straightAs)],
          why: { [TAGS.swap]: `${D(A)}는 직각보다 작은 각 — 예각이에요.`, [TAGS.rightAs]: '90°는 직각이에요.', [TAGS.straightAs]: '둔각은 직각보다 크고 180°보다 작은 각이에요 — 180°는 둔각이 아니에요.' },
          steps: ['직각(90°)보다 크고 180°보다 작은 각이 둔각', `둔각은 ${D(O)}`],
          probe: { ask: 'pickOb' },
        };
      };
      const pickAc = () => {
        const O = ob(); const A = ac();
        return {
          words: true, t: '다음 중 예각은 어느 것일까요?', ans: D(A),
          wr: [W(D(O), TAGS.swap), W(D(90), TAGS.rightAs)],
          why: { [TAGS.swap]: `${D(O)}는 직각보다 큰 각 — 둔각이에요.`, [TAGS.rightAs]: '90°는 직각이에요.' },
          steps: ['0°보다 크고 직각(90°)보다 작은 각이 예각', `예각은 ${D(A)}`],
          probe: { ask: 'pickAc' },
        };
      };
      const count = () => {
        // 둔각 k개 · 예각 5−k개 · 90° 하나 — "90°도 셈"(k+1)과 "예각을 셈"(5−k)이 서로·정답과 다른 값이 되는 k만 (k = 2면 둘 다 3)
        const k = pick(r, [1, 3, 4]);
        const vs = draw(() => [...Array.from({ length: k }, ob), ...Array.from({ length: 5 - k }, ac)], (xs) => allDiff(...xs));
        const list = shuffle(r, [...vs, 90]);
        return {
          t: `${BOLD(list.map(D).join(', '))}\n\n위의 각도 중에서 둔각은 모두 몇 개일까요?`, ans: k,
          wr: clean(k, [W(k + 1, TAGS.rightAs), W(5 - k, TAGS.swap)]),
          why: { [TAGS.rightAs]: '90°는 직각이에요 — 둔각이 아니에요.', [TAGS.swap]: '직각보다 작은 각은 예각이에요 — 둔각은 직각보다 큰 각이에요.' },
          steps: [`직각보다 크고 180°보다 작은 각: ${vs.slice(0, k).slice().sort((a, b) => a - b).map(D).join(', ')}`, `둔각은 ${k}개`],
          probe: { ask: 'count' },
        };
      };
      const figure = () => {
        const O = f5(r, 115, 160); const A = f5(r, 25, 65);
        const items = named(r, [{ v: O, role: 'ok' }, { v: A, role: 'ac' }, { v: 90, role: 'right' }].map((x) => ({ ...x, arm: ARM_M, arc: 16, rot: f5(r, 0, 60) })));
        const ok = roleOf(items, 'ok'); const a = roleOf(items, 'ac'); const rt = roleOf(items, 'right');
        return {
          words: true, t: `${angFig(items)}\n\n세 각 가, 나, 다 중에서 둔각은 어느 것일까요?`, ans: ok,
          wr: [W(a, TAGS.swap), W(rt, TAGS.rightAs)],
          why: { [TAGS.swap]: `${a}는 직각보다 작게 벌어진 각 — 예각이에요.`, [TAGS.rightAs]: `${rt}는 직각이에요 — 직각 표시를 봐요.` },
          steps: ['직각 표시가 있는 각과 견줘요', `직각보다 크게 벌어진 각은 ${ok}`],
          probe: { ask: 'figure' },
        };
      };
      return askFam(r, c, this, [famOf([pickOb()]), famOf([pickAc()]), famOf([count()]), famOf([figure()])]);
    },
    misread(r, c) {
      const ac = () => f5(r, 10, 85); const ob = () => f5(r, 95, 175);
      if (branchOf(r, c, ['acute', 'obtuse']) === 'acute') {
        const [A1, O1, O2] = draw(() => [ac(), ob(), ob()], (xs) => allDiff(...xs));
        const list = shuffle(r, [A1, 90, O1, O2]).map(D).join(', ');
        const [p, q] = [O1, O2].sort((x, y) => x - y);
        return misAsk(r, c, this, 'acute', {
          q: WORK(`${list} 중에서 예각은 ${D(p)}, ${D(q)}예요`),
          ok: `직각보다 작은 각이 예각 — 예각은 ${D(A1)}예요`,
          wr: [RIGHT, { text: `예각은 ${D(A1)}, ${D(90)}예요`, tag: TAGS.rightAs }, { text: '각도만 보고는 알 수 없어요', tag: OFF }],
          steps: ['0°보다 크고 직각(90°)보다 작은 각이 예각', `예각은 ${D(A1)}`],
          whyAny: `예각과 둔각을 바꿨어요 — ${D(p)}와 ${D(q)}는 직각보다 커요.`,
          probe: { ask: 'acute' },
        });
      }
      const [A1, A2, O1] = draw(() => [ac(), ac(), ob()], (xs) => allDiff(...xs));
      const list = shuffle(r, [A1, A2, 90, O1]).map(D).join(', ');
      const [p, q] = [A1, A2].sort((x, y) => x - y);
      return misAsk(r, c, this, 'obtuse', {
        q: WORK(`${list} 중에서 둔각은 ${D(90)}, ${D(O1)}예요`),
        ok: `90°는 직각이에요 — 둔각은 ${D(O1)}예요`,
        wr: [RIGHT, { text: `둔각은 ${D(p)}, ${D(q)}예요`, tag: TAGS.swap }, { text: '각도만 보고는 알 수 없어요', tag: OFF }],
        steps: ['직각(90°)보다 크고 180°보다 작은 각이 둔각', `둔각은 ${D(O1)}`],
        whyAny: '90°는 직각이에요 — 예각도 둔각도 아니에요.',
        probe: { ask: 'obtuse' },
      });
    },
  },

  {
    id: 'ang.estimate', grade: 4, name: '각도 어림하기', needs: ['ang.acute'],
    idea: '각도를 어림할 때는 먼저 **직각(90°)보다 작은지 큰지** 보고, 직각의 반(45°)이나 삼각자의 각(30°·60°)과 견줘요. 어림한 다음 각도기로 재어 확인해요 — 어림한 각도와 잰 각도의 차가 작을수록 잘 어림한 거예요.',
    rule: '직각보다 작은지 큰지 먼저 — 그다음 30°·45°·60°와 견줘 어림해요.',
    slip: '직각과 견주어 예각인지 둔각인지부터 봐요.',
    calc(r, c) {
      // 예각·둔각 그림이 같은 틀 글이라 한 가족 — 따로 두면 열쇠가 같아 🔁 쌍둥이가 늘 앞 가족(예각)으로 간다
      const near = () => {
        const obtuse = r() < 0.5;
        const A = obtuse ? f5(r, 115, 160) : f5(r, 20, 65);
        const R = obtuse ? (A - 30 >= 95 ? A - 30 : A + 30) : (A + 30 <= 85 ? A + 30 : A - 30);
        const rot = f5(r, 0, 90);
        const E = (v) => `약 ${D(v)}`;
        return {
          words: true, t: `[ang ${A}/90/16@${rot}]\n\n각도기 없이 어림해 보세요. 이 각의 크기에 가장 가까운 것은 어느 것일까요?`, ans: E(A),
          wr: [W(E(180 - A), TAGS.sideMiss), W(E(R), TAGS.refMiss)],
          why: {
            [TAGS.sideMiss]: `이 각은 직각보다 ${obtuse ? '커요' : '작아요'} — ${obtuse ? '둔각' : '예각'}이에요.`,
            [TAGS.refMiss]: `${obtuse ? '직각에 45°를 더한 135°' : '직각의 반 45°'}와 견줘 봐요.`,
          },
          steps: [`직각보다 ${obtuse ? '커요 — 둔각' : '작아요 — 예각'}`, `${obtuse ? '135°' : '45°'}와 견주면 ${E(A)}`],
          probe: { ask: obtuse ? 'nearOb' : 'nearAc', A },
        };
      };
      const diff = () => {
        const A = draw(() => f5(r, 25, 155), (x) => x !== 90); const d = f5(r, 5, 20);
        const E = r() < 0.5 && A - d >= 10 ? A - d : A + d;
        return {
          t: `{mon/이/가} 어떤 각의 크기를 약 ${D(E)}로 어림했어요. 각도기로 재어 보니 ${D(A)}였어요.\n\n어림한 각도와 잰 각도의 차는 몇 도일까요?`, ans: d,
          wr: clean(d, [W(E + A, TAGS.opSwap)]),
          why: { [TAGS.opSwap]: '차는 큰 수에서 작은 수를 빼요.' },
          steps: [`큰 수에서 작은 수를 빼요: ${D(Math.max(A, E))} − ${D(Math.min(A, E))} = ${D(d)}`, `차는 ${d}°`],
          probe: { ask: 'diff' },
        };
      };
      return askFam(r, c, this, [famOf([near()]), famOf([diff()])]);
    },
    misread(r, c) {
      if (branchOf(r, c, ['side', 'diff']) === 'side') {
        const A = f5(r, 115, 160); const R = A - 30 >= 95 ? A - 30 : A + 30; const rot = f5(r, 0, 90);
        return misAsk(r, c, this, 'side', {
          q: `[ang ${A}/90/16@${rot}]\n\n${WORK(`이 각은 약 ${D(180 - A)}예요`, '어림했어요')}`,
          ok: `직각보다 크니까 둔각 — 약 ${D(A)}예요`,
          wr: [RIGHT, { text: `약 ${D(R)}예요`, tag: TAGS.refMiss }, { text: '각도기가 없으면 어림할 수 없어요', tag: OFF }],
          steps: ['직각보다 커요 — 둔각', `135°와 견주면 약 ${D(A)}`],
          whyAny: '직각보다 큰지 먼저 보지 않았어요 — 이 각은 직각보다 많이 벌어졌어요.',
          probe: { ask: 'side', A },
        });
      }
      const A = draw(() => f5(r, 25, 155), (x) => x !== 90); const d = f5(r, 5, 20); const E = A + d;
      return misAsk(r, c, this, 'diff', {
        q: `{mon/이/가} 어떤 각을 약 ${D(E)}로 어림했고, 재어 보니 ${D(A)}였어요.\n\n${WORK(`어림한 각도와 잰 각도의 차는 ${D(E + A)}예요`)}`,
        ok: `큰 수에서 작은 수를 빼요 — ${D(E)} − ${D(A)} = ${D(d)}예요`,
        wr: [RIGHT, { text: '어림한 각도와 잰 각도는 견줄 수 없어요', tag: OFF }],
        steps: [`${D(E)} − ${D(A)} = ${D(d)}`, `차는 ${D(d)}`],
        whyAny: '차를 구할 때 더했어요 — 큰 수에서 작은 수를 빼요.',
        probe: { ask: 'diff' },
      });
    },
  },

  {
    id: 'ang.addsub', grade: 4, name: '각도의 합과 차', needs: ['ang.estimate'],
    idea: '각도의 합과 차는 자연수의 덧셈·뺄셈처럼 계산하고 °를 붙여요. 두 각을 겹치지 않게 **붙이면** 합, 큰 각에서 작은 각을 **겹쳐 남은** 각은 차예요: 40° + 35° = 75°, 120° − 45° = 75°.',
    rule: '붙이면 더하고, 겹쳐서 남은 각은 빼요.',
    slip: '붙인 각인지 남은 각인지 보고 더할지 뺄지 정해요.',
    calc(r, c) {
      const sum = () => {
        const [A, B] = draw(() => [f5(r, 25, 140), f5(r, 20, 140)], ([a, b]) => a !== b && a + b <= 180);
        return {
          t: `${BOLD(`${D(A)} + ${D(B)}`)}\n\n두 각도의 합은 몇 도일까요?`, ans: A + B, wr: clean(A + B, [W(Math.abs(A - B), TAGS.opSwap)]),
          why: { [TAGS.opSwap]: '합은 더해요.' },
          steps: [`자연수처럼 ${A} + ${B} = ${A + B}`, `${D(A)} + ${D(B)} = ${D(A + B)}`],
          probe: { ask: 'sum' },
        };
      };
      const sub = () => {
        const [A, B] = draw(() => [f5(r, 60, 175), f5(r, 20, 155)], ([a, b]) => a - b >= 20);
        return {
          t: `${BOLD(`${D(A)} − ${D(B)}`)}\n\n두 각도의 차는 몇 도일까요?`, ans: A - B, wr: clean(A - B, [W(A + B, TAGS.opSwap)]),
          why: { [TAGS.opSwap]: '차는 빼요.' },
          steps: [`자연수처럼 ${A} − ${B} = ${A - B}`, `${D(A)} − ${D(B)} = ${D(A - B)}`],
          probe: { ask: 'sub' },
        };
      };
      const joined = () => {
        const [A, B] = draw(() => [f5(r, 20, 120), f5(r, 20, 120)], ([a, b]) => a !== b && a + b <= 175);
        return {
          t: `[fan ${A} ${B} names]\n\n두 각을 겹치지 않게 붙였어요. 각 ㄱㅇㄷ은 몇 도일까요?`, ans: A + B, wr: clean(A + B, [W(Math.abs(A - B), TAGS.opSwap)]),
          why: { [TAGS.opSwap]: '붙인 각은 두 각을 더해요.' },
          steps: ['각 ㄱㅇㄷ = 각 ㄱㅇㄴ + 각 ㄴㅇㄷ', `${D(A)} + ${D(B)} = ${D(A + B)}`],
          probe: { ask: 'joined' },
        };
      };
      const rest = () => {
        const [A, B] = draw(() => [f5(r, 20, 120), f5(r, 20, 120)], ([a, b]) => a + b <= 175);
        return {
          t: `[fan ${A} ?${B} names]\n\n각 ㄱㅇㄷ은 ${D(A + B)}예요. 각 ㄴㅇㄷ은 몇 도일까요?`, ans: B, wr: clean(B, [W(A + B + A, TAGS.opSwap)]),
          why: { [TAGS.opSwap]: '각 ㄱㅇㄷ에서 각 ㄱㅇㄴ을 빼고 남은 각이에요.' },
          steps: ['각 ㄴㅇㄷ = 각 ㄱㅇㄷ − 각 ㄱㅇㄴ', `${D(A + B)} − ${D(A)} = ${D(B)}`],
          probe: { ask: 'rest' },
        };
      };
      return askFam(r, c, this, [famOf([sum()]), famOf([sub()]), famOf([joined()]), famOf([rest()])]);
    },
    misread(r, c) {
      if (branchOf(r, c, ['joined', 'set']) === 'joined') {
        const [A, B] = draw(() => [f5(r, 20, 120), f5(r, 20, 120)], ([a, b]) => a !== b && a + b <= 175);
        const [hi, lo] = A > B ? [A, B] : [B, A];
        return misAsk(r, c, this, 'joined', {
          q: `[fan ${A} ${B} names]\n\n${WORK(`각 ㄱㅇㄷ은 ${D(hi)} − ${D(lo)} = ${D(hi - lo)}예요`)}`,
          ok: `두 각을 붙였으니 더해요 — ${D(A)} + ${D(B)} = ${D(A + B)}예요`,
          wr: [RIGHT, { text: '붙인 각은 크기를 구할 수 없어요', tag: OFF }],
          steps: ['각 ㄱㅇㄷ = 각 ㄱㅇㄴ + 각 ㄴㅇㄷ', `${D(A)} + ${D(B)} = ${D(A + B)}`],
          whyAny: '합과 차를 바꿨어요 — 붙인 각은 더해요.',
          probe: { ask: 'joined' },
        });
      }
      // 삼각자 두 개 (30°·60°·90° · 45°·45°·90°) — 어느 각인지 말로만 알려 준다
      const S = pick(r, [
        { a: 30, b: 45, other: 60, name: '30°·60°·90° 삼각자의 가장 작은 각과 45°·45°·90° 삼각자의 한 예각' },
        { a: 60, b: 45, other: 30, name: '30°·60°·90° 삼각자의 가장 큰 예각과 45°·45°·90° 삼각자의 한 예각' },
        { a: 30, b: 90, other: 60, name: '30°·60°·90° 삼각자의 가장 작은 각과 45°·45°·90° 삼각자의 직각' },
        { a: 60, b: 90, other: 30, name: '30°·60°·90° 삼각자의 가장 큰 예각과 45°·45°·90° 삼각자의 직각' },
      ]);
      const hi = Math.max(S.a, S.b); const lo = Math.min(S.a, S.b);
      return misAsk(r, c, this, 'set', {
        q: `${S.name}을 겹치지 않게 붙였어요.\n\n${WORK(`붙여 만든 각은 ${D(S.other)} + ${D(S.b)} = ${D(S.other + S.b)}예요`)}`,
        ok: `${S.a === 30 ? '가장 작은 각은 30°' : '가장 큰 예각은 60°'} — ${D(S.a)} + ${D(S.b)} = ${D(S.a + S.b)}예요`,
        wr: [RIGHT, { text: `${D(hi)} − ${D(lo)} = ${D(hi - lo)}예요`, tag: TAGS.opSwap }, { text: '삼각자의 각은 더할 수 없어요', tag: OFF }],
        steps: [`${S.a === 30 ? '30°·60°·90° 삼각자의 가장 작은 각은 30°' : '30°·60°·90° 삼각자의 가장 큰 예각은 60°'}`, `${D(S.a)} + ${D(S.b)} = ${D(S.a + S.b)}`],
        whyAny: '삼각자의 다른 각을 썼어요 — 30°·60°·90° 삼각자의 각을 다시 봐요.',
        probe: { ask: 'set', a: S.a, b: S.b, other: S.other },
      });
    },
  },

  {
    id: 'ang.tri', grade: 4, name: '삼각형의 세 각의 크기의 합', needs: ['ang.addsub'],
    idea: '삼각형의 세 각을 잘라 꼭짓점이 한 점에 모이도록 이어 붙이면 **일직선**이 돼요 — 일직선이 이루는 각은 180°. 그래서 **삼각형의 세 각의 크기의 합은 180°**예요. 모르는 한 각은 180°에서 아는 두 각을 빼요. 각도기로 재어 더하면 조금 어긋날 수 있지만, 삼각형의 세 각의 합은 언제나 180°예요.',
    rule: '삼각형의 세 각의 합은 180° — 모르는 각은 180°에서 아는 각을 모두 빼요.',
    slip: '삼각형이면 180°에서 아는 각을 하나씩 모두 빼 봐요.',
    calc(r, c) {
      // 아는 두 각 k1·k2 — 더하기만 함(k1 + k2)·360°에서 뺌·하나만 뺌(180 − k1, 180 − k2)이 서로·정답과 다른 값이 되게
      const two = () => draw(() => [f5(r, 30, 80), f5(r, 30, 80)], ([a, b]) => a + b <= 150 && a + b !== 90 && 2 * a + b !== 180 && a + 2 * b !== 180);
      const wrOf = (a, b) => [W(360 - a - b, TAGS.triAs360), W(a + b, TAGS.addNotSub), W(180 - a, TAGS.missOne)];
      const whyOf = (a, b) => ({
        [TAGS.triAs360]: '360°는 사각형의 네 각의 합이에요. 삼각형은 180°예요.',
        [TAGS.addNotSub]: '아는 두 각을 더한 다음, 180°에서 빼야 해요.',
        [TAGS.missOne]: `아는 각이 두 개예요 — ${D(b)}도 빼요.`,
      });
      const fig = () => {
        const [a, b] = two(); const c3 = 180 - a - b;
        // 묻는 각 자리마다 틀 하나 (각 ㄱ·ㄴ·ㄷ — 자리가 바뀌면 틀 글이 바뀐다)
        return [0, 1, 2].map((i) => {
          const angs = i === 2 ? [a, b, c3] : i === 1 ? [a, c3, b] : [c3, a, b];
          const known = angs.filter((_, j) => j !== i);
          return {
            t: `[tria ${angs.map((v, j) => (j === i ? `?${v}` : v)).join(' ')}]\n\n삼각형 ㄱㄴㄷ에서 각 ${VN[i]}의 크기는 몇 도일까요?`, ans: angs[i], wr: clean(angs[i], wrOf(...known)),
            why: whyOf(...known), steps: ['삼각형의 세 각의 합은 180°', `180° − ${D(known[0])} − ${D(known[1])} = ${D(angs[i])}`], probe: { ask: 'tria' },
          };
        });
      };
      const cut = () => {
        const [a, b] = two(); const c3 = 180 - a - b;
        return {
          t: `[fan ${a} ${b} ?${c3}]\n\n삼각형의 세 각을 잘라 꼭짓점이 한 점에 모이도록 이어 붙였더니 일직선이 되었어요. ?로 표시한 각은 몇 도일까요?`, ans: c3, wr: clean(c3, wrOf(a, b)),
          why: whyOf(a, b), steps: ['일직선이 이루는 각은 180° — 세 각의 합이 180°', `180° − ${D(a)} − ${D(b)} = ${D(c3)}`], probe: { ask: 'cut' },
        };
      };
      const words = () => {
        const [a, b] = two(); const c3 = 180 - a - b;
        return {
          t: `삼각형의 두 각의 크기가 ${D(a)}, ${D(b)}예요. 나머지 한 각은 몇 도일까요?`, ans: c3, wr: clean(c3, wrOf(a, b)),
          why: whyOf(a, b), steps: ['삼각형의 세 각의 합은 180°', `180° − ${D(a)} − ${D(b)} = ${D(c3)}`], probe: { ask: 'words' },
        };
      };
      const right = () => {
        // 직각이 있는 삼각형 — 하나만 뺀 값은 직각을 잊은 180 − b (b = 45면 "더하기만 함" 135와 같아서 뺀다)
        const b = draw(() => f5(r, 25, 65), (x) => x !== 45); const c3 = 90 - b;
        return {
          t: `[tria 90 ${b} ?${c3}]\n\n삼각형 ㄱㄴㄷ에서 각 ㄷ의 크기는 몇 도일까요?`, ans: c3,
          wr: clean(c3, [W(270 - b, TAGS.triAs360), W(90 + b, TAGS.addNotSub), W(180 - b, TAGS.missOne)]),
          why: { [TAGS.triAs360]: '360°는 사각형의 네 각의 합이에요. 삼각형은 180°예요.', [TAGS.addNotSub]: '아는 두 각을 더한 다음, 180°에서 빼야 해요.', [TAGS.missOne]: '각 ㄱ은 직각 — 90°도 빼요.' },
          steps: ['삼각형의 세 각의 합은 180° — 각 ㄱ은 직각 90°', `180° − 90° − ${D(b)} = ${D(c3)}`], probe: { ask: 'right' },
        };
      };
      return askFam(r, c, this, [famOf(fig()), famOf([cut()]), famOf([words()]), famOf([right()])]);
    },
    misread(r, c) {
      if (branchOf(r, c, ['measure', 'sub']) === 'measure') {
        const S = pick(r, [176, 177, 178, 179, 181, 182, 183, 184]);
        return misAsk(r, c, this, 'measure', {
          q: `{mon/이/가} 삼각형의 세 각을 각도기로 재어 더했더니 ${D(S)}였어요.\n\n${WORK(`이 삼각형의 세 각의 크기의 합은 ${D(S)}예요`)}`,
          ok: '재는 동안 조금씩 어긋날 수 있어요 — 삼각형의 세 각의 합은 늘 180°예요',
          wr: [RIGHT, { text: '삼각형의 세 각의 합은 늘 360°예요', tag: TAGS.triAs360 }, { text: '각도기로는 삼각형의 각을 잴 수 없어요', tag: OFF }],
          steps: ['세 각을 잘라 이어 붙이면 일직선 — 180°', '재어 더한 값이 조금 다른 것은 잴 때 생긴 차이'],
          whyAny: '잰 값을 그대로 믿었어요 — 각도기로 잴 때는 조금씩 어긋나요.',
          probe: { ask: 'measure', S },
        });
      }
      // ①과 같은 뽑기 조건 — 2a + b = 180이면 보여 준 a + b가 "하나만 뺌"(180 − a)과도 같다
      const [a, b] = draw(() => [f5(r, 30, 80), f5(r, 30, 80)], ([x, y]) => x + y <= 150 && x + y !== 90 && 2 * x + y !== 180 && x + 2 * y !== 180);
      const c3 = 180 - a - b;
      return misAsk(r, c, this, 'sub', {
        q: `[tria ${a} ${b} ?${c3}]\n\n${WORK(`각 ㄷ은 ${D(a)} + ${D(b)} = ${D(a + b)}예요`)}`,
        ok: `180° − ${D(a)} − ${D(b)} = ${D(c3)}예요`,
        wr: [RIGHT, { text: `360° − ${D(a)} − ${D(b)} = ${D(360 - a - b)}예요`, tag: TAGS.triAs360 }, { text: '삼각형의 각은 구할 수 없어요', tag: OFF }],
        steps: ['삼각형의 세 각의 합은 180°', `180° − ${D(a)} − ${D(b)} = ${D(c3)}`],
        whyAny: '아는 두 각을 더하기만 했어요 — 180°에서 빼야 해요.',
        probe: { ask: 'sub' },
      });
    },
  },

  {
    id: 'ang.quad', grade: 4, name: '사각형의 네 각의 크기의 합', needs: ['ang.tri'],
    idea: '사각형은 마주 보는 두 꼭짓점을 잇는 선분을 그어 **삼각형 두 개**로 나눌 수 있어요 — 그래서 사각형의 네 각의 크기의 합은 180° × 2 = **360°**예요. 네 각을 잘라 한 점에 모으면 빈틈없이 한 바퀴가 돼요. 모르는 한 각은 360°에서 아는 세 각을 빼요.',
    rule: '사각형의 네 각의 합은 360° — 모르는 각은 360°에서 아는 각을 모두 빼요.',
    slip: '사각형이면 360°에서 아는 각을 하나씩 모두 빼 봐요.',
    calc(r, c) {
      // 아는 세 각 65°~115°, 합 220°~315° (J 사각형과 같은 범위 — 그림이 닫힌다) · "더하기만"(합)과 "하나만 뺌"(360 − 둘)이 다른 값이게
      const three = () => draw(() => [f5(r, 65, 115), f5(r, 65, 115), f5(r, 65, 115)], (q) => {
        const s = q[0] + q[1] + q[2];
        return s >= 220 && s <= 315 && [[0, 1], [0, 2], [1, 2]].every(([i, j]) => 360 - q[i] - q[j] !== s);
      });
      const wrOf = (q) => [W(q[0] + q[1] + q[2], TAGS.addNotSub), W(360 - q[0] - q[1], TAGS.missOne)];
      const whyOf = (q) => ({ [TAGS.addNotSub]: '아는 세 각을 더한 다음, 360°에서 빼야 해요.', [TAGS.missOne]: `아는 각이 세 개예요 — ${D(q[2])}도 빼요.` });
      const fig = () => {
        const q = three(); const d = 360 - q[0] - q[1] - q[2];
        return {
          t: `[quad ${q[0]} ${q[1]} ${q[2]} ?${d}]\n\n사각형 ㄱㄴㄷㄹ에서 각 ㄹ의 크기는 몇 도일까요?`, ans: d, wr: clean(d, wrOf(q)),
          why: whyOf(q), steps: ['사각형의 네 각의 합은 360°', `360° − ${D(q[0])} − ${D(q[1])} − ${D(q[2])} = ${D(d)}`], probe: { ask: 'quad' },
        };
      };
      const cut = () => {
        const q = three(); const d = 360 - q[0] - q[1] - q[2];
        return {
          t: `[fan ${q[0]} ${q[1]} ${q[2]} ?${d}]\n\n사각형의 네 각을 잘라 꼭짓점이 한 점에 모이도록 이어 붙였더니 빈틈없이 한 바퀴가 되었어요. ?로 표시한 각은 몇 도일까요?`, ans: d, wr: clean(d, wrOf(q)),
          why: whyOf(q), steps: ['한 바퀴는 360° — 네 각의 합이 360°', `360° − ${D(q[0])} − ${D(q[1])} − ${D(q[2])} = ${D(d)}`], probe: { ask: 'cut' },
        };
      };
      const words = () => {
        const q = three(); const d = 360 - q[0] - q[1] - q[2];
        return {
          t: `사각형의 세 각의 크기가 ${D(q[0])}, ${D(q[1])}, ${D(q[2])}예요. 나머지 한 각은 몇 도일까요?`, ans: d, wr: clean(d, wrOf(q)),
          why: whyOf(q), steps: ['사각형의 네 각의 합은 360°', `360° − ${D(q[0])} − ${D(q[1])} − ${D(q[2])} = ${D(d)}`], probe: { ask: 'words' },
        };
      };
      const pair = () => {
        // 나머지 두 각의 합 — 180°에서 뺌(사각형을 180°로) · 더하기만 · 하나만 뺌(360 − a, 360 − b)이 서로·정답과 다른 값이게
        const [a, b] = draw(() => [f5(r, 40, 130), f5(r, 40, 130)], ([x, y]) => x + y >= 80 && x + y <= 155 && x + y !== 90 && 2 * x + y !== 360 && x + 2 * y !== 360);
        return {
          t: `사각형의 두 각의 크기가 ${D(a)}, ${D(b)}예요. 나머지 두 각의 크기의 합은 몇 도일까요?`, ans: 360 - a - b,
          wr: clean(360 - a - b, [W(180 - a - b, TAGS.quadAs180), W(a + b, TAGS.addNotSub), W(360 - a, TAGS.missOne)]),
          why: { [TAGS.quadAs180]: '180°는 삼각형의 세 각의 합이에요. 사각형은 360°예요.', [TAGS.addNotSub]: '아는 두 각을 더한 다음, 360°에서 빼야 해요.', [TAGS.missOne]: `아는 각이 두 개예요 — ${D(b)}도 빼요.` },
          steps: ['사각형의 네 각의 합은 360°', `360° − ${D(a)} − ${D(b)} = ${D(360 - a - b)}`], probe: { ask: 'pair' },
        };
      };
      return askFam(r, c, this, [famOf([fig()]), famOf([cut()]), famOf([words()]), famOf([pair()])]);
    },
    misread(r, c) {
      if (branchOf(r, c, ['four', 'sub']) === 'four') {
        return misAsk(r, c, this, 'four', {
          q: `{mon/이/가} 사각형 안에 점을 하나 찍고 네 꼭짓점과 이어 삼각형 4개로 나누었어요.\n\n${WORK('삼각형이 4개니까 사각형의 네 각의 합은 180° × 4 = 720°예요')}`,
          ok: '가운데 점에 모인 각 360°를 빼야 해요 — 720° − 360° = 360°예요',
          wr: [RIGHT, { text: '사각형의 네 각의 합은 180°예요', tag: TAGS.quadAs180 }, { text: '사각형은 삼각형으로 나눌 수 없어요', tag: OFF }],
          steps: ['삼각형 4개의 각을 모두 더하면 180° × 4 = 720°', '가운데 점에 모인 각(한 바퀴 360°)은 사각형의 각이 아니에요: 720° − 360° = 360°'],
          whyAny: '가운데 점에 모인 각까지 셌어요 — 그 각은 사각형의 각이 아니에요.',
          probe: { ask: 'four' },
        });
      }
      // ①과 같은 뽑기 조건 — 보여 준 합(더하기만)이 어느 두 각을 뺀 값(하나만 뺌)과도 같으면 두 생각
      const q = draw(() => [f5(r, 65, 115), f5(r, 65, 115), f5(r, 65, 115)], (x) => { const s = x[0] + x[1] + x[2]; return s >= 220 && s <= 315 && [[0, 1], [0, 2], [1, 2]].every(([i, j]) => 360 - x[i] - x[j] !== s); });
      const s = q[0] + q[1] + q[2]; const d = 360 - s;
      return misAsk(r, c, this, 'sub', {
        q: `[quad ${q[0]} ${q[1]} ${q[2]} ?${d}]\n\n${WORK(`각 ㄹ은 ${D(q[0])} + ${D(q[1])} + ${D(q[2])} = ${D(s)}예요`)}`,
        ok: `360° − ${D(q[0])} − ${D(q[1])} − ${D(q[2])} = ${D(d)}예요`,
        wr: [RIGHT, { text: `360° − ${D(q[0])} − ${D(q[1])} = ${D(360 - q[0] - q[1])}예요`, tag: TAGS.missOne }, { text: '사각형의 각은 구할 수 없어요', tag: OFF }],
        steps: ['사각형의 네 각의 합은 360°', `360° − ${D(q[0])} − ${D(q[1])} − ${D(q[2])} = ${D(d)}`],
        whyAny: '아는 세 각을 더하기만 했어요 — 360°에서 빼야 해요.',
        probe: { ask: 'sub' },
      });
    },
  },

  {
    id: 'ang.apply', grade: 4, name: '⭐ 각도 활용', needs: ['ang.quad'],
    idea: '모르는 각을 바로 구할 수 없으면 두 단계로 — 먼저 삼각형(180°)이나 사각형(360°)으로 이웃한 안쪽 각을 구하고, 그 각과 **일직선(180°)**을 이루는 각을 구해요: 180° − (안쪽 각).',
    rule: '이웃한 안쪽 각을 먼저 구하고, 일직선 180°에서 빼요.',
    slip: '㉠과 이웃한 안쪽 각을 먼저 구해 봐요.',
    calc(r, c) {
      const tri = () => {
        // ㉠ = 180 − 각 ㄴ = a + c · 안쪽 각에서 멈춤(b)·하나만 뺌(a)이 서로·정답과 다르게 (a + c = 90이면 b = ㉠)
        const [a, c3] = draw(() => [f5(r, 30, 80), f5(r, 30, 80)], ([x, z]) => x + z <= 150 && x + z !== 90 && allDiff(x, z, 180 - x - z, x + z));
        const b = 180 - a - c3;
        return {
          t: `[tria ${a} _${b} ${c3} ext]\n\n삼각형 ㄱㄴㄷ의 변 ㄱㄴ을 늘였어요. ㉠의 크기는 몇 도일까요?`, ans: a + c3,
          wr: clean(a + c3, [W(b, TAGS.straightMiss), W(a, TAGS.missOne)]),
          why: { [TAGS.straightMiss]: `${D(b)}는 각 ㄴ이에요 — ㉠은 각 ㄴ과 일직선(180°)을 이뤄요.`, [TAGS.missOne]: `각 ㄴ을 구할 때 ${D(c3)}도 빼요.` },
          steps: [`각 ㄴ = 180° − ${D(a)} − ${D(c3)} = ${D(b)}`, `㉠ = 180° − ${D(b)} = ${D(a + c3)}`],
          probe: { ask: 'tri' },
        };
      };
      const quad = () => {
        // ㉠ = 180 − 각 ㄴ (각 ㄴ = 360 − a − c − d, 90° 아님 — 90°면 ㉠도 90°)
        // "하나만 뺌"으로 나올 수 있는 값(두 각의 합 − 180, 0보다 클 때)이 안쪽 각·정답과 같지 않게
        const q = draw(() => [f5(r, 65, 115), f5(r, 65, 115), f5(r, 65, 115)], (x) => {
          const s = x[0] + x[1] + x[2]; const bb = 360 - s;
          return s >= 220 && s <= 315 && s !== 270 && [[0, 1], [0, 2], [1, 2]].every(([i, j]) => ![bb, 180 - bb].includes(x[i] + x[j] - 180));
        });
        const b = 360 - q[0] - q[1] - q[2]; const ans = 180 - b;
        const wr = [W(b, TAGS.straightMiss)];
        if (q[0] + q[1] > 180) wr.push(W(q[0] + q[1] - 180, TAGS.missOne)); // 각 ㄴ = 360 − ㄱ − ㄷ (ㄹ을 잊음) → ㉠ = ㄱ + ㄷ − 180
        return {
          t: `[quad ${q[0]} _${b} ${q[1]} ${q[2]} ext]\n\n사각형 ㄱㄴㄷㄹ의 변 ㄱㄴ을 늘였어요. ㉠의 크기는 몇 도일까요?`, ans,
          wr: clean(ans, wr),
          why: { [TAGS.straightMiss]: `${D(b)}는 각 ㄴ이에요 — ㉠은 각 ㄴ과 일직선(180°)을 이뤄요.`, [TAGS.missOne]: `각 ㄴ을 구할 때 ${D(q[2])}도 빼요.` },
          steps: [`각 ㄴ = 360° − ${D(q[0])} − ${D(q[1])} − ${D(q[2])} = ${D(b)}`, `㉠ = 180° − ${D(b)} = ${D(ans)}`],
          probe: { ask: 'quad' },
        };
      };
      return askFam(r, c, this, [famOf([tri()]), famOf([quad()])]);
    },
    misread(r, c) {
      if (branchOf(r, c, ['tri', 'quad']) === 'tri') {
        // ①과 같은 뽑기 조건 — 보여 준 안쪽 각 ㄴ이 아는 각과 같으면 "하나만 뺌"과도 같은 값
        const [a, c3] = draw(() => [f5(r, 30, 80), f5(r, 30, 80)], ([x, z]) => x + z <= 150 && x + z !== 90 && allDiff(x, z, 180 - x - z, x + z));
        const b = 180 - a - c3;
        return misAsk(r, c, this, 'tri', {
          q: `[tria ${a} _${b} ${c3} ext]\n\n${WORK(`㉠은 180° − ${D(a)} − ${D(c3)} = ${D(b)}예요`)}`,
          ok: `${D(b)}는 각 ㄴ이에요 — ㉠은 180° − ${D(b)} = ${D(a + c3)}예요`,
          wr: [RIGHT, { text: '㉠은 삼각형 밖에 있어서 구할 수 없어요', tag: OFF }],
          steps: [`각 ㄴ = 180° − ${D(a)} − ${D(c3)} = ${D(b)}`, `㉠ = 180° − ${D(b)} = ${D(a + c3)}`],
          whyAny: '안쪽 각 ㄴ을 구하고 멈췄어요 — ㉠은 각 ㄴ과 일직선(180°)을 이뤄요.',
          probe: { ask: 'tri' },
        });
      }
      const q = draw(() => [f5(r, 65, 115), f5(r, 65, 115), f5(r, 65, 115)], (x) => {
        const s = x[0] + x[1] + x[2]; const bb = 360 - s;
        return s >= 220 && s <= 315 && s !== 270 && [[0, 1], [0, 2], [1, 2]].every(([i, j]) => ![bb, 180 - bb].includes(x[i] + x[j] - 180));
      });
      const b = 360 - q[0] - q[1] - q[2];
      return misAsk(r, c, this, 'quad', {
        q: `[quad ${q[0]} _${b} ${q[1]} ${q[2]} ext]\n\n${WORK(`㉠은 360° − ${D(q[0])} − ${D(q[1])} − ${D(q[2])} = ${D(b)}예요`)}`,
        ok: `${D(b)}는 각 ㄴ이에요 — ㉠은 180° − ${D(b)} = ${D(180 - b)}예요`,
        wr: [RIGHT, { text: '㉠은 사각형 밖에 있어서 구할 수 없어요', tag: OFF }],
        steps: [`각 ㄴ = 360° − ${D(q[0])} − ${D(q[1])} − ${D(q[2])} = ${D(b)}`, `㉠ = 180° − ${D(b)} = ${D(180 - b)}`],
        whyAny: '안쪽 각 ㄴ을 구하고 멈췄어요 — ㉠은 각 ㄴ과 일직선(180°)을 이뤄요.',
        probe: { ask: 'quad' },
      });
    },
  },
];

export function conceptById(id) {
  return ANGLE.find((c) => c.id === id) || null;
}

// ───────────────────── 문항 만들기 (mathbig와 같은 모양) ─────────────────────

const SLIP = '한 번 더 천천히 — 두 변이 벌어진 정도와 직각(90°)을 먼저 봐요.';
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
  if (q && q.solve && !q.solve.whyAny) q.solve.whyAny = c.slip || SLIP;
  return q ? { ...q, key: q.key || cast.key || '' } : q;
}

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
  return diagnosticOf(ANGLE, makeQuestion, seed, n, opts);
}
export function placeFrom(answers) {
  return placeFromOf(ANGLE, answers);
}
export function ladder(doneIds) {
  return ladderOf(ANGLE, doneIds);
}

// ───────────────────── 사람이 쓴 내용 검사 (check.mjs가 부른다) ─────────────────────

function badPlaceholders(txt) {
  const leak = String(txt || '').match(/\{[^}]*\}/g) || [];
  return leak.filter((l) => !/^\{(me|mon|mon2)(\/[^/}]+\/[^}]+)?\}$/.test(l));
}
/** 글자 → 분수 값 {n, d} (checkHuman이 쓴다) — 자연수(끝의 ° 떼고)만 */
const ratOf = (t) => { const s = String(t || '').trim().replace(/°$/, ''); return /^\d+$/.test(s) ? { n: +s, d: 1 } : null; };

/**
 * coach/math/angle.json 형식 검사 — mathbig.checkContent와 같은 규칙
 * @returns {string[]}
 */
export function checkContent(content) {
  const bad = [];
  const same = (a, b) => !!(a && b && a.n * b.d === b.n * a.d);
  for (const c of ANGLE) {
    const v = content && content[c.id];
    if (!v) { bad.push(`${c.id}: 내용 없음`); continue; }
    if (!Array.isArray(v.lesson) || v.lesson.length < 3) bad.push(`${c.id}: lesson 3장 이상이어야 함`);
    if (!v.rule) bad.push(`${c.id}: rule 없음`);
    const checks = (v.lesson || []).filter((p) => p && p.check);
    if (checks.length < 2) bad.push(`${c.id}: 확인 질문 2개 이상이어야 함`);
    for (const [i, p] of (v.lesson || []).entries()) {
      if (!p || !p.say) { bad.push(`${c.id}[${i}]: say 없음`); continue; }
      for (const l of badPlaceholders(p.say)) bad.push(`${c.id}[${i}]: 잘못된 자리표시 ${l}`);
      if (!p.check) continue;
      const ck = p.check;
      if (!ck.q || !ck.ok || !Array.isArray(ck.no) || !ck.no.length || !ck.why) { bad.push(`${c.id}[${i}]: check 칸이 빔`); continue; }
      for (const l of badPlaceholders(`${ck.q} ${ck.ok} ${ck.no.join(' ')} ${ck.why}`)) bad.push(`${c.id}[${i}]: 잘못된 자리표시 ${l}`);
      const ov = ratOf(ck.ok);
      for (const n of ck.no) {
        if (String(n).trim() === String(ck.ok).trim()) bad.push(`${c.id}[${i}]: 정답이 오답에도 있음`);
        if (same(ov, ratOf(n))) bad.push(`${c.id}[${i}]: 값이 같은 보기 (${ck.ok} = ${n})`);
      }
      if (new Set(ck.no.map((n) => String(n).trim())).size !== ck.no.length) bad.push(`${c.id}[${i}]: 오답끼리 겹침`);
    }
    const d = v.dad;
    if (!d || !d.goal || !Array.isArray(d.say) || !d.say.length || !d.do) bad.push(`${c.id}: 아빠 카드 미완`);
    if (d && (!Array.isArray(d.traps) || !d.traps.length || !d.pass)) bad.push(`${c.id}: 아빠 카드 함정·통과 기준 없음`);
    if (v.why || v.special) checkHuman(c.id, v, bad, ratOf);
  }
  return bad;
}
