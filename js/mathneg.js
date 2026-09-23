// 🔢 수학 — E 음수 줄기 (중1 「정수와 유리수」): 개념 사다리 + 문제 생성기(①②) + 사람이 쓴 내용의 형식 검사 (순수 함수, 화면 없음)
//
// 분수 줄기(mathgen.js)와 다른 점 하나 — **처음 배우는 줄기**다 (아버님 결정, 2026-09-20).
// 분수는 진우가 선행으로 이미 배운 것이라 📖 이야기 한 편(300~450자) → 문항으로 충분했지만,
// 음수는 학원도 안 다니고 누가 알려 준 적도 없는 개념이다. 한 문단 읽고 문제부터 풀면 틀리고 → 다시 읽고 → 또 틀리는 루프가 된다.
// 그래서 개념마다 📖 대신 **단계식 배움(lesson)** 을 둔다:
//   설명 한 조각(say) → 확인 질문 하나(check) → 다음 조각 … → 한 줄 요약(rule)
// 읽기만 하지 않고 매 장 손을 움직인다. 첫 개념은 배움을 다 거쳐야 문항이 열린다 (화면이 잠근다).
//
// ★ 그리고 **아빠 카드(dad)** — 개념마다 반 장. 저녁 10분에 아빠가 처음 소개하고(뭐라고 말할지·비유·활동·
//   진우가 낼 법한 오개념과 그때 할 말·통과 기준), 반복·검증·복습은 앱이 한다. 학원 선생님 일 중 "처음 소개"만 사람이.
//   앱의 배움은 아빠가 못 한 날에도 혼자 갈 수 있게 자립적으로 쓰되, 아빠 카드가 붙으면 훨씬 잘 붙는다.
//
// 왜 E가 분수 다음인가: 중1 첫 고비(부호 규칙이 무너지면 문자와 식·방정식이 전부 무너진다), D 문자와 식은 음수 없이 못 간다(x+5=3),
// 오답=오개념이 제일 선명하고(−3−5=−2 "빼기를 더하기로", (−2)×(−3)=−6 "음×음=음"), 유리수는 분수 줄기를 그대로 쓴다.
//
// 문제 생성기 (2026-09-21, 2단계) — 분수 줄기의 부품(출연진·이야기 틀·문항/풀이 틀·사다리·진단)을 mathgen.js에서 가져와 쓴다.
//   ① calc: 숫자를 바꿔 무한 생성. 오답은 흔한 오개념(tag). **풀이(solve)를 처음부터 같이** 만든다 (분수 v99의 교훈).
//   ② misread: "{포켓몬}이 …라고 했어요. 무엇이 틀렸을까?"
//   ③ why · ⭐ special: 사람이 쓴 것(coach/math/negative.json). 코드 안의 why는 파일이 없을 때의 예비.
//   ★ 보기는 **값**으로 겹침을 본다 — "+5"와 "5", "−4/2"와 "−2"는 같은 수다. 글자만 보면 정답이 둘인 문항이 나간다 (분수 v96·v103의 교훈).

import { figureSvg, lineSvg, walkSvg } from './mathdraw.js';
import { rng, shuffle, fill, numJosa, tplKey, castOf, worldPick, ask, solve, int, pick, pickFamily, humanQuestion, checkHuman, diagnosticOf, placeFromOf, ladderOf, gcd } from './mathgen.js';

/** 학년 표시 — 7은 중1. 분수 줄기는 4·5·6(초)이라 숫자로 통일하고 표시만 바꾼다 */
export function gradeLabel(g) {
  return g >= 7 ? `중${g - 6}` : `초${g}`;
}

// ───────────────────── 부호 있는 수 — 글자·값 ─────────────────────

const M = '−'; // U+2212 — 배움 원고와 같은 글자. 하이픈(-)은 읽을 때 "빼기"와 헷갈린다

/** 수 → 글자. num(-5) → "−5", num(1.5) → "1.5", num(-0.25) → "−0.25". 문자열이면 그대로 (분수 글자) */
export function num(v) {
  if (typeof v === 'string') return v;
  const a = Math.abs(v);
  const s = Number.isInteger(a) ? String(a) : String(+a.toFixed(4));
  return v < 0 ? M + s : s;
}
/** 식 안의 피연산자 — 음수는 괄호로: par(-3) → "(−3)", par(4) → "4" */
export const par = (v) => (typeof v === 'number' && v < 0 ? `(${num(v)})` : num(v));
/** 부호를 꼭 보이게: sgn(1, 5) → "+5", sgn(-1, 5) → "−5" (부호를 배우는 첫 개념에서만) */
const sgn = (s, n) => (s < 0 ? M : '+') + n;
/** 기약분수 글자, 부호는 맨 앞: frac(-2, 4) → "−1/2", frac(4, 2) → "2" */
export function frac(n, d) {
  if (!d) return '';
  if (d < 0) { n = -n; d = -d; }
  const g = gcd(n, d);
  n /= g; d /= g;
  if (d === 1) return num(n);
  return (n < 0 ? M : '') + `${Math.abs(n)}/${d}`;
}

/** 숫자 뒤 조사 — 읽는 소리로. 음수는 "마이너스 삼"이라 끝소리가 같고, 소수는 마지막 자리로 (1.5 → "오") */
function nj(v, a, b) {
  const s = String(Math.abs(Number(v) || 0)).replace('.', '');
  return numJosa(Number(s[s.length - 1]), a, b);
}

/**
 * 보기 글자의 값 — 부호 있는 정수·분수·소수·대분수 → {n, d} (n에 부호). 수가 아니면 null.
 * "−5" "-5" "+5" "(−5)" "−3/4" "−1.5" "−2 1/3" 전부 읽는다. 순서 나열("−7, −2, 0, 3")은 null → 글자로만 비교.
 */
export function valueOf(text) {
  let s = String(text || '').trim().replace(/[−–]/g, '-').replace(/[()]/g, '').replace(/\s+/g, ' ').trim();
  let sign = 1;
  if (/^[+-]/.test(s)) { sign = s[0] === '-' ? -1 : 1; s = s.slice(1).trim(); }
  let m;
  if ((m = /^(\d+) (\d+)\/(\d+)$/.exec(s))) return +m[3] ? { n: sign * (+m[1] * +m[3] + +m[2]), d: +m[3] } : null;
  if ((m = /^(\d+)\/(\d+)$/.exec(s))) return +m[2] ? { n: sign * +m[1], d: +m[2] } : null;
  if ((m = /^(\d+)\.(\d+)$/.exec(s))) { const d = 10 ** m[2].length; return { n: sign * (+m[1] * d + +m[2]), d }; }
  if ((m = /^(\d+)$/.exec(s))) return { n: sign * +m[1], d: 1 };
  return null;
}
const sameValue = (a, b) => !!(a && b && a.n * b.d === b.n * a.d);

/** 정답과 같은 모양(정수/분수/소수)으로 n/d를 글자로 */
function fmtLike(answer, n, d) {
  const s = String(answer);
  if (/\./.test(s)) return num(n / d);
  if (/\//.test(s)) return frac(n, d);
  return num(n / d);
}
/** 정답 근처의 "계산 실수" 오답 — 오개념 오답끼리 값이 겹쳐 모자랄 때만 (보기가 둘뿐이면 찍어서 맞는다) */
function nearMiss(answer, k) {
  const v = valueOf(answer);
  if (!v) return '';
  const tries = [[v.n + 1, v.d], [v.n - 1, v.d], [v.n + 2, v.d], [v.n - 2, v.d], [-v.n, v.d], [v.n + 3, v.d], [v.n - 3, v.d]];
  const [n, d] = tries[k % tries.length];
  return fmtLike(answer, n, d);
}

/** 보기 네 개 — 정답 하나 + 오개념 오답. 글자가 같거나 **값이 같으면** 하나로 (mathgen.choices와 같은 규칙, 값 읽기만 부호 있는 것으로) */
function choices(r, answer, wrongs) {
  const seen = new Set([answer]);
  const vals = [valueOf(answer)];
  const list = [{ text: answer, ok: true }];
  const dup = (t) => { const v = valueOf(t); return seen.has(t) || (v && vals.some((x) => sameValue(x, v))); };
  const add = (t, tag) => { seen.add(t); vals.push(valueOf(t)); list.push({ text: t, ok: false, tag }); };
  for (const w of wrongs) {
    if (!w || !w.text || dup(w.text) || list.length >= 4) continue;
    add(w.text, w.tag);
  }
  for (let k = 0; list.length < 4 && k < 20; k++) {
    const alt = nearMiss(answer, k);
    if (alt && !dup(alt)) add(alt, '계산 실수');
  }
  return shuffle(r, list);
}


/**
 * ② 오개념 문항의 갈래 고르기 — 갈래마다 key('misread:갈래')를 남긴다.
 * 분수 줄기는 ②가 한 갈래라 key가 'misread' 하나였지만, 음수는 개념마다 2~3갈래다. 키가 하나면 🔁 쌍둥이·🤔 오답 노트가
 * **다른 오류 유형**으로 돌아와(음수÷음수 부호 → 0으로 나누기) 엉뚱한 문제를 맞히고 노트가 지워진다 (Codex #4)
 */
function pickVariant(r, c, names) {
  const want = c && c.want && c.want.startsWith('misread:') ? c.want.slice(8) : '';
  let v = names.includes(want) ? want : '';
  if (!v) {
    const fresh = names.filter((n) => !(c && c.recent && c.recent.includes('misread:' + n)));
    v = pick(r, fresh.length ? fresh : names);
  }
  if (c) c.key = 'misread:' + v;
  return v;
}

/**
 * 이야기 없이 식만 묻는 틀 — 계산 연습 자리. 출연진은 끼우되 억지 상황은 안 만든다.
 * 식을 글에 넣는 이유: 틀의 이름표(tplKey)가 가족마다 달라야 🔁 쌍둥이가 **같은 셈**의 가족으로 돌아온다
 * ("(−#) × (−#)"과 "# × (−#)"은 다른 틀).
 */
const plainFor = (expr) => [
  `{mon/이/가} 문제를 냈어요: ${expr}. 계산해 봐요!`,
  `{me/아/야}, ${expr} — 얼마일까? {mon/이/가} 물어요.`,
];

/** 수직선 범위 — 0·점들을 모두 품고 양쪽 한 칸 여유 (너무 넓으면 폰 폭을 넘는다 → 점은 ±9 안에서 낸다) */
function lineWith(dots, o = {}) {
  const lo = Math.min(0, ...dots) - 1; const hi = Math.max(0, ...dots) + 1;
  return lineSvg(lo, hi, { dots, vertical: !!o.vertical });
}

/** 정수 풀이 — 화면이 내 답·정답을 수직선 점 두 개로 그려도 된다 */
const solveN = (steps, o = {}) => solve(steps, { ...o, numline: true });

const abs = Math.abs;
/** 부호 다른 두 수를 더하는 이유 한 줄 (걷기 말로) */
const walkWord = (d) => (d > 0 ? `오른쪽으로 ${d}칸` : `왼쪽으로 ${-d}칸`);

// ───────────────────── 개념 사다리 (E. 음수 줄기) ─────────────────────
//
// `needs`가 잠금이다. 학년은 전부 중1이라 표시일 뿐이고, 진단으로 시작점을 잡는다. `idea`는 사다리 카드와 배움 끝에 보이는 한 줄.
// calc(r, c) · misread(r, c)는 mathgen과 같은 모양 — c는 castOf()가 준 출연진(+ recent·want).

export const NEGATIVE = [
  {
    id: 'neg.mean', grade: 7, name: '0보다 작은 수', needs: [],
    idea: '0보다 작은 수가 있어요. 앞에 −를 붙여 써요. 서로 반대인 것(위/아래, 벌기/쓰기)을 +와 −로 나타내요.',
    calc(r, c) {
      const k = int(r, 1, 8);
      let n = int(r, 1, 8); if (n === k) n = n === 8 ? 7 : n + 1; // 기준 수와 물은 수가 같으면 "기준 수를 그대로 씀" 오답이 정답과 겹친다
      const m = int(r, 1, 8);
      const ra = nj(k, '으로', '로'); // 으로/로는 tplKey가 한 모양으로 접는다 (이라고/라고는 안 접어 틀 이름표가 갈라졌다)
      const fams = [
        // 가족 A: 기준을 +k로 정하고, 반대 상황 n을 묻는다 → −n
        { ref: k, ans: -n, pools: {
          pokemon: [
            `동쪽으로 ${k}km 가는 것을 +${k}${ra} 나타내면, 서쪽으로 ${n}km 가는 것은 어떻게 쓸까요?`,
            `{mon}의 HP가 ${k} 회복되는 것을 +${k}${ra} 나타내면, 독 데미지로 HP가 ${n} 깎이는 것은?`,
            `{me/이/가} 코인 ${k}개를 버는 것을 +${k}${ra} 나타내면, 코인 ${n}개를 쓰는 것은?`,
            `얼음 동굴의 온도가 ${k}도 올라가는 것을 +${k}${ra} 나타내면, ${n}도 내려가는 것은?`,
            `디그다가 땅 위로 ${k}m 올라오는 것을 +${k}${ra} 나타내면, 땅속으로 ${n}m 파고 내려가는 것은?`,
          ],
          toystory: [
            `보니가 릴리패드에서 ${k}점을 얻는 것을 +${k}${ra} 나타내면, 터틀 태그에서 ${n}점을 잃는 것은?`,
            `우디가 농장 언덕을 ${k}m 올라가는 것을 +${k}${ra} 나타내면, ${n}m 내려가는 것은?`,
          ],
          minions: [
            `헨리가 바나나 ${k}개를 얻는 것을 +${k}${ra} 나타내면, 바나나 ${n}개를 먹어 없애는 것은?`,
            `맥스 감독의 영화 점수가 ${k}점 오르는 것을 +${k}${ra} 나타내면, ${n}점 떨어지는 것은?`,
          ],
          moana: [
            `모아나의 카누가 섬에서 ${k}km 앞으로 가는 것을 +${k}${ra} 나타내면, 파도에 ${n}km 밀려 뒤로 가는 것은?`,
            `마우이가 하늘로 ${k}m 올라가는 것을 +${k}${ra} 나타내면, 바닷속으로 ${n}m 내려가는 것은?`,
          ],
        } },
        // 가족 A′: 기준을 −k로 정하고, 반대 상황 n을 묻는다 → +n
        { ref: -k, ans: n, pools: {
          pokemon: [
            `{mon}의 HP가 ${k} 깎이는 것을 −${k}${ra} 나타내면, 상처약으로 HP가 ${n} 회복되는 것은?`,
            `코인 ${k}개를 빚지는 것을 −${k}${ra} 나타내면, 코인 ${n}개를 버는 것은?`,
            `얼음 동굴의 온도가 ${k}도 내려가는 것을 −${k}${ra} 나타내면, ${n}도 올라가는 것은?`,
            `디그다가 땅속으로 ${k}m 내려가는 것을 −${k}${ra} 나타내면, 땅 위로 ${n}m 올라오는 것은?`,
          ],
          toystory: [`제시가 터틀 태그에서 ${k}점을 잃는 것을 −${k}${ra} 나타내면, ${n}점을 얻는 것은?`],
          minions: [`도르트의 우주선이 ${k}m 내려가는 것을 −${k}${ra} 나타내면, ${n}m 올라가는 것은?`],
          moana: [`헤이헤이가 바닷속으로 ${k}m 가라앉는 것을 −${k}${ra} 나타내면, ${n}m 떠오르는 것은?`],
        } },
        // 가족 B: 0이 기준 — 아래 m과 위 k를 **한 쌍**으로 묻는다 (−m, +k).
        // 하나만 물으면 오답이 "부호 반대" 하나뿐이라 나머지가 '계산 실수'로 채워졌다 (Codex #8: neg.mean의 49%가 보충 보기)
        { ref: 0, ans: -m, up: k, pools: {
          pokemon: [
            `얼음 동굴 안은 0도보다 ${m}도 낮고, 동굴 밖은 0도보다 ${k}도 높아요. 둘을 부호를 붙여 쓰면? (안, 밖 순서로)`,
            `{mon/이/가} 지하 ${m}층에, {me/이/가} 지상 ${k}층에 있어요. 두 층수를 부호를 붙여 쓰면? ({mon}, {me} 순서로)`,
            `디그다는 땅(0m)에서 ${m}m 아래에, 피죤은 ${k}m 위에 있어요. 두 위치를 부호를 붙여 쓰면? (디그다, 피죤 순서로)`,
            `{me}의 코인 장부: 오늘 ${m}개를 빚졌고(0보다 ${m} 모자람), 내일 ${k}개를 벌 거예요. 둘을 부호를 붙여 쓰면? (오늘, 내일 순서로)`,
          ],
          toystory: [`포키는 릴리패드 지하 ${m}층 주차장에, 보니는 지상 ${k}층에 있어요. 두 층수를 부호를 붙여 쓰면? (포키, 보니 순서로)`],
          minions: [`도르트의 우주선은 바다 수면(0m)에서 ${m}m 아래에, 헨리의 열기구는 ${k}m 위에 있어요. 둘을 부호를 붙여 쓰면? (우주선, 열기구 순서로)`],
          moana: [`타마토아의 동굴은 수면(0m)에서 ${m}m 아래에, 마우이는 절벽 ${k}m 위에 있어요. 둘을 부호를 붙여 쓰면? (동굴, 마우이 순서로)`],
        } },
      ];
      const f = pickFamily(r, c, fams);
      const story = worldPick(r, c, f.pools);
      const ans = f.ans; const s = ans < 0 ? -1 : 1; const mag = abs(ans);
      const vertical = /온도|층|땅|아래|수면|하늘/.test(story);
      let wrongs; let steps; let why;
      if (!f.ref) {
        // 가족 B: 답은 "−m, +k" 한 쌍 (글자 보기 — 값 비교는 안 되므로 오답은 전부 분명히 다른 쌍으로)
        const pair = (a, b) => `${a}, ${b}`;
        const okPair = pair(sgn(-1, m), sgn(1, k));
        return ask(this.id, 'calc', fill(story, c), choices(r, okPair, [
          { text: pair(sgn(1, m), sgn(-1, k)), tag: '위·아래를 반대로 봄' },
          { text: pair(m, k), tag: '부호를 안 붙임' },
          { text: pair(sgn(-1, m), sgn(-1, k)), tag: '둘 다 −로 씀' },
        ]), {
          figure: lineSvg(-Math.max(m, k) - 1, Math.max(m, k) + 1, { vertical }),
          solve: solveN([
            '① 0이 기준이에요',
            `② 0보다 ${m}만큼 아래(낮음·지하·빚) → −${m}`,
            `③ 0보다 ${k}만큼 위(높음·지상·이득) → +${k}`,
            `④ 답: ${okPair}`,
          ], {
            why: {
              '위·아래를 반대로 봄': `아래·지하·빚은 −, 위·지상·이득은 +예요. 부호가 서로 바뀌었어요.`,
              '부호를 안 붙임': `${m}${nj(m, '과', '와')} ${k}${nj(k, '은', '는')} 둘 다 0보다 위처럼 보여요. 아래 ${m}은 −${m}${nj(m, '이라고', '라고')} 써야 달라요.`,
              '둘 다 −로 씀': `0보다 ${k}만큼 위는 +${k}예요. −는 0보다 아래일 때만.`,
              '계산 실수': `0에서 아래로 ${m}, 위로 ${k}.`,
            },
            figure: lineWith([-m, k], { vertical }), rule: '0이 기준. 위·이득은 +, 아래·빚은 −.',
          }),
        });
      }
      {
        // 가족 A·A′: 기준 수(ref)의 반대
        const rs = f.ref < 0 ? -1 : 1;
        wrongs = [
          { text: sgn(rs, mag), tag: '반대인데 부호를 안 바꿈' },
          { text: sgn(rs, k), tag: '기준 수를 그대로 씀' },
          { text: sgn(s, k), tag: '기준 수에 부호만 바꿈' },
        ];
        steps = [
          `① 기준: 한쪽을 ${sgn(rs, k)}${nj(k, '으로', '로')} 정했어요`,
          `② 물은 것은 그 **반대** 쪽 → 부호가 반대(${s < 0 ? M : '+'})`,
          `③ 크기는 ${mag} → 답: ${sgn(s, mag)}`,
        ];
        why = {
          '반대인데 부호를 안 바꿈': `${sgn(rs, mag)}${nj(mag, '은', '는')} 기준과 **같은** 쪽이에요. 반대 상황은 부호가 반대예요.`,
          '기준 수를 그대로 씀': `${sgn(rs, k)}${nj(k, '은', '는')} 기준으로 정한 수예요. 물은 것은 크기 ${mag}, 그리고 방향은 반대.`,
          '기준 수에 부호만 바꿈': `방향(부호)은 맞게 바꿨는데 크기가 ${k}가 아니라 ${mag}예요.`,
          '계산 실수': `크기를 다시 봐요: ${mag}. 부호는 기준의 반대.`,
        };
      }
      const okText = sgn(s, mag);
      return ask(this.id, 'calc', fill(story, c), choices(r, okText, wrongs), {
        figure: lineWith([f.ref], { vertical }), // 문제 그림: 기준 점만 (답은 안 보여 준다)
        solve: solveN(steps, { why, figure: lineWith([f.ref, ans], { vertical }), rule: '서로 반대인 것은 부호가 반대. 위·이득·오른쪽은 +, 아래·빚·왼쪽은 −.' }),
      });
    },
    misread(r, c) {
      const n = int(r, 2, 9);
      const v = pickVariant(r, c, ['floor', 'temp']);
      if (v === 'floor') {
        return ask(this.id, 'misread', fill(`{mon/이/가} "지하 ${n}층"을 ${n}${nj(n, '이라고', '라고')} 썼어요. {me/아/야}, 무엇이 틀렸을까?`, c), choices(r, `아래(지하)니까 −를 붙여 −${n}${nj(n, '이라고', '라고')} 써야 해요`, [
          { text: '숫자를 잘못 셌어요', tag: '오개념을 못 짚음' },
          { text: `+를 붙여 +${n}${nj(n, '이라고', '라고')} 써야 해요`, tag: '오개념을 못 짚음' },
          { text: '틀린 곳이 없어요', tag: '틀린 줄 모름' },
        ]), { solve: solveN([
          '① 땅(0)에서 위로 올라가면 +, 아래로 내려가면 −',
          `② 지하 ${n}층은 0(땅)보다 ${n} 아래 → −${n}`,
        ], { whyAny: fill(`{mon/이/가} 부호를 안 붙였어요. ${n}${nj(n, '은', '는')} 땅 위 ${n}층이에요. 지하는 −${n}.`, c), figure: lineWith([-n], { vertical: true }), rule: '아래·지하·빚은 −, 위·지상·이득은 +.' }) });
      }
      return ask(this.id, 'misread', fill(`{mon/이/가} "0도보다 ${n}도 높은 온도"를 −${n}${nj(n, '이라고', '라고')} 썼어요. {me/아/야}, 무엇이 틀렸을까?`, c), choices(r, `높은 쪽은 +예요. +${n}(그냥 ${n})${nj(n, '이라고', '라고')} 써야 해요`, [
        { text: '숫자를 잘못 셌어요', tag: '오개념을 못 짚음' },
        { text: `0${nj(0, '이라고', '라고')} 써야 해요`, tag: '오개념을 못 짚음' },
        { text: '틀린 곳이 없어요', tag: '틀린 줄 모름' },
      ]), { solve: solveN([
        '① 0도가 기준. 0보다 높으면 +, 낮으면 −',
        `② 0보다 ${n}도 높음 → +${n} (그냥 ${n}${nj(n, '이라고', '라고')} 써도 돼요)`,
      ], { whyAny: fill(`{mon/이/가} 높은 쪽에 −를 붙였어요. −${n}${nj(n, '은', '는')} 0보다 ${n}도 **낮은** 온도예요.`, c), figure: lineWith([n], { vertical: true }), rule: '아래·지하·빚은 −, 위·지상·이득은 +.' }) });
    },
    why: [
      { q: '−5는 어떤 수인가요?', ok: '0보다 5만큼 작은 수', no: ['5보다 조금 작은 수', '5에서 부호만 뗀 수', '0과 같은 수'], explain: { text: '−5는 0에서 왼쪽(아래)으로 5칸 간 자리예요. "5보다 조금 작은 수"가 아니라 0보다도 5만큼 작아요. 부호 −는 "0보다 아래"라는 표시예요.' } },
      { q: '"코인 3개 벌기"를 +3이라고 하면, −3은 무엇일까요?', ok: '코인 3개를 쓰거나 빚지기 (반대 상황)', no: ['코인 3개를 두 번 벌기', '코인이 하나도 없는 것', '코인 3개를 그냥 가진 것'], explain: { text: '+와 −는 서로 반대 상황을 나타내요. 벌기가 +3이면, 그 반대인 쓰기(빚지기)가 −3이에요. "없다"는 0이고, "두 번 벌기"는 +6이에요.' } },
    ],
  },

  {
    id: 'neg.line', grade: 7, name: '수직선에서 크기 비교', needs: ['neg.mean'],
    idea: '수직선에서 오른쪽이 커요. 음수는 0에 가까울수록 커요. 0에서 떨어진 거리가 절댓값이에요.',
    calc(r, c) {
      // 네 수: 음수 둘(크기 다름) + {0 또는 양수} 둘, 절댓값이 전부 달라야 "부호 무시" 오답이 한 가지로 정해진다.
      // 늘어놓는 순서는 −, +, −, + 로 고정 — 이름표(tplKey)는 숫자만 지우고 부호는 남기므로, 부호 자리가 바뀌면 다른 틀이 돼 🔁 쌍둥이·recent가 안 맞는다
      // 크기 넷을 정렬해 가장 작은 것은 음수에, 양수 하나는 다른 음수보다 작게 — 그래야 "부호 무시" 순서와 "음수만 반대" 순서가 서로 다른 오답이 된다
      const ms = shuffle(r, [1, 2, 3, 4, 5, 6]).slice(0, 4).sort((x, y) => x - y);
      const nbHigh = r() < 0.5;
      const na = ms[0]; const nb = nbHigh ? ms[3] : ms[2];
      const [pa, pb] = nbHigh ? [ms[1], ms[2]] : [ms[1], ms[3]];
      const withZero = r() < 0.4;
      const nums = [-na, -nb, withZero ? 0 : pa, pb];
      const list = [-na, pb, -nb, withZero ? 0 : pa];
      const listText = list.map(num).join(', ');
      // 칸 이동 — 방향과 출발점의 부호로 가족을 넷으로 (부호도 틀 이름표에 남으므로 가족 안에서는 고정)
      const sNeg = -int(r, 1, 4); const sPos = int(r, 1, 4); let k = int(r, 2, 5); // 출발점 0은 뺀다 — 0에서는 "방향 반대"와 "부호 반대"가 같은 수
      while (k === abs(sNeg) || k === sPos) k++; // 0에 도착하면 "부호 반대" 오답이 정답과 겹쳐 보충 보기가 된다 (k ≤ 6)
      const stepFam = (left, s0) => ({ kind: 'step', left, s0, pools: {
        pokemon: [
          `{mon/이/가} 수직선의 ${num(s0)}에 서 있어요. ${left ? '왼쪽' : '오른쪽'}으로 ${k}칸 가면 어떤 수에 도착할까요?`,
          `수직선에서 ${num(s0)}보다 ${k}칸 ${left ? '왼쪽' : '오른쪽'}에 있는 수는?`,
        ],
      } });
      const fams = [
        { kind: 'order', pools: {
          pokemon: [
            `얼음 동굴 네 곳의 온도가 ${listText}도예요. 낮은 온도부터 차례로 늘어놓으면?`,
            `{mon}의 배틀 점수 기록: ${listText}. 작은 점수부터 차례로 늘어놓으면?`,
            `수직선 위의 네 수 ${listText}${nj(list[3], '을', '를')} 작은 수부터 차례로 늘어놓으면?`,
          ],
          toystory: [`릴리패드 게임 점수 — 보니·제시·버즈·우디: ${listText}. 작은 점수부터 차례로 늘어놓으면?`],
          minions: [`미니언 네 명의 바나나 장부: ${listText} (빚은 −). 작은 것부터 차례로 늘어놓으면?`],
          moana: [`모투누이 바다 네 곳의 깊이가 ${listText}m예요(수면 아래는 −). 낮은 곳부터 차례로 늘어놓으면?`],
        } },
        stepFam(true, sNeg), stepFam(true, sPos), stepFam(false, sNeg), stepFam(false, sPos),
        { kind: 'far', pools: {
          pokemon: [
            `${listText} 중에서 0에서 **가장 먼** 수는? (절댓값이 가장 큰 수)`,
            `얼음 동굴 네 곳의 온도가 ${listText}도예요. 0도에서 가장 많이 떨어진 온도는?`,
          ],
        } },
      ];
      // 늘어놓기 2 : 칸 이동 4(넷이 한 가족) : 가장 먼 수 2 — 같은 것을 두 번 넣어 무게를 준다 (want 찾기는 첫 것에서 잡힌다)
      const f = pickFamily(r, c, [fams[0], fams[0], fams[1], fams[2], fams[3], fams[4], fams[5], fams[5]]);
      const story = worldPick(r, c, f.pools);
      const rule = '수직선에서 오른쪽이 큰 수. 음수는 0에 가까울수록 크다.';
      if (f.kind === 'order') {
        const asc = [...nums].sort((a, b) => a - b);
        const j = (arr) => arr.map(num).join(', ');
        const byAbsNeg = [...nums].sort((a, b) => (a < 0 && b < 0 ? abs(a) - abs(b) : a - b)); // 음수끼리는 숫자 작은 쪽이 작다고 봄
        const byAbs = [...nums].sort((a, b) => abs(a) - abs(b));
        return ask(this.id, 'calc', fill(story, c), choices(r, j(asc), [
          { text: j(byAbsNeg), tag: '음수는 숫자가 작을수록 작다고 봄' },
          { text: j([...asc].reverse()), tag: '큰 수부터 늘어놓음' },
          { text: j(byAbs), tag: '부호를 무시하고 크기만 비교' },
        ]), { figure: lineWith(nums), solve: solveN([
          `① 수직선에 점을 찍어요: ${j(list)}`,
          '② 왼쪽에 있을수록 작은 수예요. 음수는 0에서 멀수록(절댓값이 클수록) 더 작아요',
          `③ 왼쪽부터 읽으면: ${j(asc)}`,
        ], {
          why: {
            '음수는 숫자가 작을수록 작다고 봄': `${num(-na > -nb ? -nb : -na)}${nj(Math.max(na, nb), '이', '가')} 0에서 더 멀어요(왼쪽). 음수는 절댓값이 **클수록** 더 작아요.`,
            '큰 수부터 늘어놓음': '작은 수부터 물었어요. 수직선의 왼쪽(음수 쪽)에서 시작해요.',
            '부호를 무시하고 크기만 비교': '−가 붙은 수는 0보다 왼쪽이에요. 크기(숫자)만 보면 안 되고 부호를 먼저 봐요.',
            '계산 실수': '수직선에 점을 찍고 왼쪽부터 읽어요.',
          },
          figure: lineWith(nums), rule,
        }) });
      }
      if (f.kind === 'step') {
        const { left, s0 } = f;
        const ans = left ? s0 - k : s0 + k;
        // "0을 한 칸으로 셈"은 0을 **지나는** 이동에서만 생기는 실수 — 안 지나면 그냥 한 칸 더 간 것 (Codex #5)
        const crosses = (s0 < 0 && ans > 0) || (s0 > 0 && ans < 0);
        const overTag = crosses ? '0을 한 칸으로 셈' : '한 칸 더 감';
        return ask(this.id, 'calc', fill(story, c), choices(r, num(ans), [
          { text: num(left ? s0 + k : s0 - k), tag: '왼쪽·오른쪽을 반대로' },
          { text: num(-ans), tag: '답의 부호를 반대로' },
          { text: num(left ? s0 - k - 1 : s0 + k + 1), tag: overTag },
        ]), { figure: lineWith([s0]), solve: solveN([
          `① 출발: ${num(s0)}`,
          `② ${left ? '왼쪽' : '오른쪽'}으로 ${k}칸: 눈금을 하나씩 세요 (0도 한 눈금이에요)`,
          `③ 도착: ${num(ans)}`,
        ], {
          why: {
            '왼쪽·오른쪽을 반대로': `${left ? '왼쪽' : '오른쪽'}으로 가라고 했어요. ${left ? '왼쪽은 작아지는 쪽' : '오른쪽은 커지는 쪽'}이에요.`,
            '답의 부호를 반대로': `${num(s0)}에서 ${k}칸 ${left ? '왼쪽' : '오른쪽'}은 ${num(ans)}예요. 0을 지나면 부호가 바뀌는지 그림에서 확인해요.`,
            '0을 한 칸으로 셈': '0도 눈금 하나예요. 0을 지날 때 한 칸 더 세면 안 돼요 — 눈금마다 한 칸.',
            '한 칸 더 감': `${k}칸만 가요. 출발한 눈금은 세지 않고, 다음 눈금부터 하나·둘 세요.`,
            '계산 실수': `${num(s0)}에서 ${k}칸을 눈금 하나씩 세어 봐요.`,
          },
          figure: walkSvg(s0, left ? -k : k), rule: '수직선에서 오른쪽은 커지고 왼쪽은 작아진다. 눈금 하나가 한 칸.',
        }) });
      }
      // far: 0에서 가장 먼 수 (절댓값이 가장 큰 수)
      // 절댓값이 가장 큰 수는 가장 큰 수(max)이거나 가장 작은 수(min)다 → 답이 아닌 쪽 극단이 오답 (답이 max면 max 오답이 정답과 겹쳐 보충이 됐었다)
      const far = nums.reduce((a, b) => (abs(b) > abs(a) ? b : a));
      const near = nums.reduce((a, b) => (abs(b) < abs(a) ? b : a));
      const max = Math.max(...nums); const min = Math.min(...nums);
      const other = far === max ? min : max;
      const otherTag = far === max ? '음수면 0에서 멀다고 봄' : '큰 수가 0에서 제일 멀다고 봄';
      const rest = nums.filter((v) => v !== far && v !== near && v !== other);
      return ask(this.id, 'calc', fill(story, c), choices(r, num(far), [
        { text: num(other), tag: otherTag },
        { text: num(near), tag: '0과의 거리를 반대로 봄' },
        ...(rest.length ? [{ text: num(rest[0]), tag: '눈금을 잘못 셈' }] : []), // 네 수 중 남은 하나 — 오개념이 아니라 거리를 잘못 센 것 (보충 '계산 실수'와 구분, Codex #8)
      ]), { figure: lineWith(nums), solve: solveN([
        `① 0에서 떨어진 거리(절댓값)를 재요: ${nums.map((v) => `${num(v)} → ${abs(v)}`).join(', ')}`,
        '② 부호는 방향일 뿐, 거리는 숫자예요',
        `③ 제일 먼 것: ${num(far)} (거리 ${abs(far)})`,
      ], {
        why: {
          '큰 수가 0에서 제일 멀다고 봄': `${num(max)}${nj(max, '은', '는')} 가장 **큰** 수지만, 0에서 먼 것은 ${num(far)}예요. 왼쪽으로도 멀어질 수 있어요.`,
          '음수면 0에서 멀다고 봄': `${num(min)}${nj(min, '은', '는')} 가장 작은 수지만 0에서는 ${abs(min)}칸이에요. ${num(far)}${nj(far, '은', '는')} 오른쪽으로 ${abs(far)}칸 — 더 멀어요.`,
          '0과의 거리를 반대로 봄': `${num(near)}${nj(near, '은', '는')} 0에 제일 **가까운** 수예요.`,
          '눈금을 잘못 셈': '수마다 0에서 몇 칸인지 다시 세어 봐요. 부호는 빼고 거리만.',
          '계산 실수': '수마다 0에서 몇 칸인지 세어 봐요. 부호는 빼고.',
        },
        figure: lineWith(nums), rule: '절댓값 = 0에서 떨어진 거리. 부호는 방향, 거리는 숫자.',
      }) });
    },
    misread(r, c) {
      const b = int(r, 1, 6); const a = b + int(r, 1, 3);
      const v = pickVariant(r, c, ['bigger', 'dist']);
      if (v === 'bigger') {
        return ask(this.id, 'misread', fill(`{mon/이/가} "−${a}${nj(a, '이', '가')} −${b}보다 커요. ${a}${nj(a, '이', '가')} ${b}보다 크니까요."라고 했어요. {me/아/야}, 무엇이 틀렸을까?`, c), choices(r, `음수는 절댓값(0에서 떨어진 거리)이 클수록 더 작아요. −${b}${nj(b, '이', '가')} 더 커요`, [
          { text: `−${a}${nj(a, '과', '와')} −${b}는 같은 수예요`, tag: '오개념을 못 짚음' },
          { text: '음수끼리는 비교할 수 없어요', tag: '오개념을 못 짚음' },
          { text: '틀린 곳이 없어요', tag: '틀린 줄 모름' },
        ]), { figure: lineWith([-a, -b]), solve: solveN([
          `① 수직선에 −${a}${nj(a, '과', '와')} −${b}${nj(b, '을', '를')} 찍어요`,
          `② −${a}${nj(a, '이', '가')} 더 왼쪽(0에서 더 멀어요) → 더 작아요`,
          `③ 그러니 −${b}${nj(b, '이', '가')} 더 커요`,
        ], { whyAny: fill(`{mon/이/가} 부호를 빼고 크기만 비교했어요. 음수는 반대예요 — 절댓값이 클수록 0에서 왼쪽으로 멀어져서 더 작아요.`, c), figure: lineWith([-a, -b]), rule: '음수는 0에 가까울수록 크다.' }) });
      }
      return ask(this.id, 'misread', fill(`{mon/이/가} "−${a}${nj(a, '은', '는')} 0에서 −${a}만큼 떨어져 있어요"라고 했어요. {me/아/야}, 무엇이 틀렸을까?`, c), choices(r, `거리는 부호 없이 ${a}예요 (절댓값)`, [
        { text: `0에서 ${a * 2}만큼 떨어져 있어요`, tag: '오개념을 못 짚음' },
        { text: '음수는 0에서 떨어진 거리를 잴 수 없어요', tag: '오개념을 못 짚음' },
        { text: '틀린 곳이 없어요', tag: '틀린 줄 모름' },
      ]), { figure: lineWith([-a]), solve: solveN([
        `① 0에서 −${a}까지 눈금을 세요: ${a}칸`,
        `② 거리(절댓값)에는 부호가 없어요 → ${a}`,
      ], { whyAny: fill(`{mon/이/가} 거리에 −를 붙였어요. 거리는 "몇 칸"이라 늘 0 이상이에요. −${a}는 위치, ${a}${nj(a, '은', '는')} 거리.`, c), figure: lineWith([-a]), rule: '절댓값 = 0에서 떨어진 거리. 부호는 방향, 거리는 숫자.' }) });
    },
    why: [
      { q: '−7과 −2 중 어느 것이 더 클까요? 왜일까요?', ok: '−2 — 0에 더 가까우니까', no: ['−7 — 7이 2보다 크니까', '똑같아요 — 둘 다 음수니까', '−7 — 더 왼쪽에 있으니까'], explain: { text: '수직선에서 오른쪽이 큰 수예요. −2는 −7보다 오른쪽(0에 더 가까움)에 있어서 더 커요. 7이 2보다 크다는 건 절댓값(거리) 이야기지 크기 순서가 아니에요.' } },
      { q: '절댓값은 무엇인가요?', ok: '0에서 그 수까지 떨어진 거리', no: ['부호를 반대로 바꾼 수', '그 수보다 1 큰 수', '수직선의 맨 왼쪽 수'], explain: { text: '절댓값은 0에서 그 수까지 떨어진 거리예요. 거리라서 부호가 없어요: |−7| = 7, |7| = 7. "부호를 반대로 바꾼 수"는 반대수(−7 ↔ 7)로, 다른 말이에요.' } },
    ],
  },

  {
    id: 'neg.add', grade: 7, name: '음수가 있는 덧셈', needs: ['neg.line'],
    idea: '더하기는 수직선에서 걷기예요. 양수를 더하면 오른쪽으로, 음수를 더하면 왼쪽으로.',
    calc(r, c) {
      const a = int(r, 2, 9);
      let b = int(r, 2, 9); if (b === a) b = b === 9 ? 8 : b + 1; // 같으면 답 0 → 오답끼리 겹친다
      const fams = [
        { x: a, y: -b, pools: {
          pokemon: [
            `얼음 동굴의 온도가 ${a}도였는데 ${b}도 내려갔어요. 지금 온도는 몇 도일까요?`,
            `{me/이/가} 코인 ${a}개를 가지고 있는데 ${b}개짜리 상처약을 외상으로 샀어요(−${b}). 코인 셈은?`,
            `{mon/이/가} 수직선의 ${a}에 서 있다가 왼쪽으로 ${b}칸 걸었어요. 도착한 수는?`,
          ],
          toystory: [`보니의 릴리패드 점수가 ${a}점이었는데 터틀 태그에서 ${b}점을 잃었어요(−${b}). 점수는?`],
          minions: [`헨리의 바나나 셈이 ${a}였는데 ${b}개를 먹어 없앴어요(−${b}). 바나나 셈은?`],
          moana: [`모아나의 카누가 섬에서 ${a}km 앞에 있었는데 파도에 ${b}km 밀려났어요(−${b}). 지금 위치는?`],
        } },
        { x: -a, y: b, pools: {
          pokemon: [
            `얼음 동굴의 온도가 −${a}도였는데 ${b}도 올라갔어요. 지금 온도는 몇 도일까요?`,
            `디그다가 땅속 ${a}m(−${a})에 있다가 ${b}m 올라왔어요. 지금 위치는?`,
            `{me}의 코인 셈이 −${a}(빚 ${a}개)였는데 ${b}개를 벌었어요. 지금 코인 셈은?`,
          ],
          toystory: [`제시의 점수가 −${a}점이었는데 ${b}점을 얻었어요. 점수는?`],
          minions: [`도르트의 우주선이 바다 수면 아래 ${a}m(−${a})에 있다가 ${b}m 올라왔어요. 지금 위치는?`],
          moana: [`헤이헤이가 바닷속 ${a}m(−${a})에 있다가 ${b}m 떠올랐어요. 지금 위치는?`],
        } },
        { x: -a, y: -b, pools: {
          pokemon: [
            `얼음 동굴의 온도가 −${a}도였는데 ${b}도 더 내려갔어요. 지금 온도는 몇 도일까요?`,
            `{mon}의 HP가 독으로 ${a} 깎였는데(−${a}) 또 ${b} 깎였어요(−${b}). HP는 모두 얼마나 변했나요?`,
            `{me/이/가} 코인 ${a}개를 빚졌는데(−${a}) ${b}개를 더 빚졌어요(−${b}). 코인 셈은?`,
          ],
          toystory: [`우디가 언덕 아래 ${a}m(−${a})에 있다가 ${b}m 더 내려갔어요. 지금 위치는?`],
          minions: [`맥스 감독의 영화 점수가 −${a}점이었는데 ${b}점 더 떨어졌어요. 점수는?`],
          moana: [`타마토아의 동굴은 수면 아래 ${a}m(−${a})인데 마우이가 ${b}m 더 내려갔어요. 지금 위치는?`],
        } },
      ];
      const f = pickFamily(r, c, fams);
      const story = worldPick(r, c, f.pools);
      const { x, y } = f; const ans = x + y;
      const expr = `${par(x)} + ${par(y)}`;
      const wrongs = (x < 0 && y < 0) ? [
        { text: num(a + b), tag: '답에 부호를 안 붙임' },
        { text: num(-abs(a - b)), tag: '음수끼리 더하는데 뺌' },
        { text: num(abs(a - b)), tag: '뺀 뒤 부호도 안 붙임' },
      ] : [
        { text: num(a + b), tag: '부호를 무시하고 더함' },
        { text: num(-(a + b)), tag: '둘 다 왼쪽으로 걸음' },
        { text: num(-ans), tag: '답의 부호를 반대로' },
      ];
      return ask(this.id, 'calc', fill(story, c), choices(r, num(ans), wrongs), { expr, hint: '수직선에서 걷기로 생각해요', solve: solveN([
        `① 출발: ${num(x)}`,
        `② ${par(y)}${nj(y, '을', '를')} 더해요 → ${walkWord(y)} 걷기`,
        `③ 도착: ${num(ans)}`,
      ], {
        why: {
          '부호를 무시하고 더함': `${par(y)}${nj(y, '은', '는')} ${walkWord(y)} 걷는 거예요. 부호를 빼고 더하면 반대로 걸은 게 돼요.`,
          '둘 다 왼쪽으로 걸음': `${num(x)}${nj(x, '은', '는')} 출발점이에요. 거기서 ${walkWord(y)}만 걸어요 — 둘 다 왼쪽으로 가면 안 돼요.`,
          '답의 부호를 반대로': `${num(x)}에서 ${walkWord(y)} 가면 ${num(ans)}예요. 0을 어느 쪽으로 지나는지 그림에서 봐요.`,
          '답에 부호를 안 붙임': `왼쪽으로 ${a}칸, 또 왼쪽으로 ${b}칸이니 0보다 왼쪽이에요 → −${a + b}.`,
          '음수끼리 더하는데 뺌': `둘 다 왼쪽으로 걸으면 거리가 **합쳐져요**: ${a} + ${b} = ${a + b}칸 → −${a + b}. 빼면 안 돼요.`,
          '뺀 뒤 부호도 안 붙임': `왼쪽으로만 걸었으니 답은 음수, 거리는 합쳐서 ${a + b} → −${a + b}.`,
          '계산 실수': `${num(x)}에서 ${walkWord(y)} — 눈금을 하나씩 세어 봐요.`,
        },
        figure: walkSvg(x, y), rule: '양수를 더하면 오른쪽, 음수를 더하면 왼쪽으로 걷기.',
      }) });
    },
    misread(r, c) {
      const a = int(r, 2, 9); let b = int(r, 2, 9); if (b === a) b = b === 9 ? 8 : b + 1;
      const v = pickVariant(r, c, ['ignore', 'nosign', 'sub']);
      const rule = '양수를 더하면 오른쪽, 음수를 더하면 왼쪽으로 걷기.';
      if (v === 'ignore') {
        return ask(this.id, 'misread', fill(`{mon/이/가} ${a} + (−${b}) = ${a + b} 라고 했어요. {me/아/야}, 무엇이 틀렸을까?`, c), choices(r, `−${b}${nj(b, '을', '를')} 더하는 건 왼쪽으로 ${b}칸이에요. 오른쪽으로 가 버렸어요`, [
          { text: `${b}${nj(b, '이', '가')} ${a}보다 커서 더할 수 없어요`, tag: '오개념을 못 짚음' },
          { text: '부호가 두 개면 계산이 안 돼요', tag: '오개념을 못 짚음' },
          { text: '틀린 곳이 없어요', tag: '틀린 줄 모름' },
        ]), { solve: solveN([`① 출발 ${a}`, `② −${b}${nj(b, '을', '를')} 더하기 = 왼쪽으로 ${b}칸`, `③ 도착 ${num(a - b)}`], { whyAny: fill(`{mon/이/가} 부호를 무시하고 더했어요. 음수를 더하면 왼쪽으로 걸어요: ${a} + (−${b}) = ${num(a - b)}.`, c), figure: walkSvg(a, -b), rule }) });
      }
      if (v === 'nosign') {
        return ask(this.id, 'misread', fill(`{mon/이/가} (−${a}) + (−${b}) = ${a + b} 라고 했어요. {me/아/야}, 무엇이 틀렸을까?`, c), choices(r, `왼쪽으로 ${a}칸, 또 왼쪽으로 ${b}칸이라 −${a + b}예요. 부호를 빠뜨렸어요`, [
          { text: `${a}${nj(a, '과', '와')} ${b}${nj(b, '을', '를')} 빼야 해요`, tag: '오개념을 못 짚음' },
          { text: '음수끼리는 더할 수 없어요', tag: '오개념을 못 짚음' },
          { text: '틀린 곳이 없어요', tag: '틀린 줄 모름' },
        ]), { solve: solveN([`① 출발 −${a}`, `② −${b}${nj(b, '을', '를')} 더하기 = 왼쪽으로 ${b}칸`, `③ 도착 −${a + b}`], { whyAny: fill(`{mon/이/가} 크기만 더하고 부호를 안 붙였어요. 둘 다 왼쪽이니 답은 0보다 왼쪽: −${a + b}.`, c), figure: walkSvg(-a, -b), rule }) });
      }
      return ask(this.id, 'misread', fill(`{mon/이/가} (−${a}) + (−${b}) = ${num(-abs(a - b))} 라고 했어요. {me/아/야}, 무엇이 틀렸을까?`, c), choices(r, `둘 다 왼쪽으로 걸으니 거리가 합쳐져요(−${a + b}). 빼면 안 돼요`, [
        { text: '부호를 +로 붙여야 해요', tag: '오개념을 못 짚음' },
        { text: `${a}에서 ${b}${nj(b, '을', '를')} 빼는 순서가 틀렸어요`, tag: '오개념을 못 짚음' },
        { text: '틀린 곳이 없어요', tag: '틀린 줄 모름' },
      ]), { solve: solveN([`① 출발 −${a}`, `② 왼쪽으로 ${b}칸 더`, `③ 0에서 ${a} + ${b} = ${a + b}칸 왼쪽 → −${a + b}`], { whyAny: fill(`{mon/이/가} 같은 방향인데 거리를 뺐어요. 같은 쪽으로 두 번 걸으면 거리는 더해져요.`, c), figure: walkSvg(-a, -b), rule }) });
    },
    why: [
      { q: '3 + (−5)를 수직선에서 어떻게 할까요?', ok: '3에서 왼쪽으로 5칸 걸어요', no: ['3에서 오른쪽으로 5칸 걸어요', '5에서 왼쪽으로 3칸 걸어요', '0에서 오른쪽으로 8칸 걸어요'], explain: { text: '더하기는 걷기예요. 출발은 앞의 수 3, 더하는 수 −5는 왼쪽으로 5칸. 3에서 왼쪽으로 5칸 가면 0을 지나 −2에 도착해요.' } },
      { q: '(−4) + (−2)는 왜 −6인가요?', ok: '둘 다 왼쪽으로 걸어서 거리가 합쳐지니까', no: ['음수끼리 더하면 빼야 하니까', '−가 두 개면 +가 되니까', '4에서 2를 빼고 부호를 붙이니까'], explain: { text: '−4에서 출발해 −2를 더하면 왼쪽으로 2칸 더 가요. 같은 방향으로 두 번 걸으니 거리가 합쳐져서 0에서 6칸 왼쪽, 즉 −6이에요. "−가 두 개면 +"는 곱셈 이야기지 덧셈이 아니에요.' } },
    ],
  },

  {
    id: 'neg.sub', grade: 7, name: '음수가 있는 뺄셈', needs: ['neg.add'],
    idea: '빼기는 반대수 더하기예요. 3 − 5 = 3 + (−5). 음수를 빼면 오히려 더해져요: 3 − (−5) = 8.',
    calc(r, c) {
      const a = int(r, 1, 8); const b = a + int(r, 1, 9 - a); // a < b (S1에서 답이 음수가 되도록)
      const p = int(r, 2, 9); let q = int(r, 2, 9); if (q === p) q = q === 9 ? 8 : q + 1; // 나머지 가족: 크기 다른 둘
      const fams = [
        { x: a, y: b, pools: {
          pokemon: [
            `{me/이/가} 코인 ${a}개가 있는데 ${b}개짜리 몬스터볼을 꼭 사야 해요. 사고 나면 코인 셈은? (빚은 −)`,
            `{mon}의 점수 ${a}점에서 ${b}점을 빼면?`,
            `얼음 동굴이 ${a}도였는데 ${b}도를 빼면(내려가면) 몇 도일까요?`,
          ],
          toystory: [`보니의 점수 ${a}점에서 터틀 태그로 ${b}점을 빼면? (0 아래는 −)`],
          minions: [`헨리의 바나나 ${a}개에서 ${b}개를 빼면? (모자라면 −)`],
          moana: [`모아나의 코코넛 ${a}개에서 ${b}개를 빼면? (모자라면 −)`],
        } },
        // 장부의 **항목 하나를 지운다** — "빚 2개인데 빚 9개를 없앤다"처럼 크기가 뒤집혀도 말이 되는 틀 (Codex #6).
        // 합계가 p인 장부에 −q 항목이 있을 수 있다(다른 항목이 더 크면). 그 항목을 지우면 합계는 p − (−q)
        { x: p, y: -q, pools: {
          pokemon: [
            `{me}의 코인 장부 합계가 ${p}인데, 장부에 적힌 −${q} 항목(빚)을 아빠가 지워 줬어요(−${q}${nj(q, '을', '를')} 빼기). 합계는?`,
            `{mon}의 HP 변화표 합계가 ${p}인데, 표에 적힌 저주 −${q} 항목을 없앴어요(−${q}${nj(q, '을', '를')} 빼기). 합계는?`,
            `${p}에서 −${q}${nj(q, '을', '를')} 빼면 얼마일까요?`,
          ],
        } },
        { x: -p, y: q, pools: {
          pokemon: [
            `얼음 동굴이 −${p}도인데 ${q}도를 더 빼면(내려가면) 몇 도일까요?`,
            `{me}의 코인 셈이 −${p}(빚)인데 ${q}개를 더 써야 해요. 코인 셈은?`,
            `−${p}에서 ${q}${nj(q, '을', '를')} 빼면 얼마일까요?`,
          ],
        } },
        { x: -p, y: -q, pools: {
          pokemon: [
            `{me}의 코인 장부 합계가 −${p}인데, 장부에 적힌 −${q} 항목(빚)을 아빠가 지워 줬어요(−${q}${nj(q, '을', '를')} 빼기). 합계는?`,
            `{mon}의 HP 변화표 합계가 −${p}인데, 표에 적힌 저주 −${q} 항목을 없앴어요(−${q}${nj(q, '을', '를')} 빼기). 합계는?`,
            `−${p}에서 −${q}${nj(q, '을', '를')} 빼면 얼마일까요?`,
          ],
        } },
      ];
      const f = pickFamily(r, c, fams);
      const story = worldPick(r, c, f.pools);
      const { x, y } = f; const ans = x - y;
      const expr = `${par(x)} − ${par(y)}`;
      const ax = abs(x); const ay = abs(y);
      let wrongs;
      if (x > 0 && y > 0) wrongs = [ // a − b (a<b)
        { text: num(y - x), tag: '순서를 바꿔 뺌' },
        { text: num(x + y), tag: '빼기를 더하기로' },
        { text: num(-(x + y)), tag: '둘 다 음수로 봄' },
      ];
      else if (x > 0 && y < 0) wrongs = [ // a − (−b)
        { text: num(x - ay), tag: '음수 빼기를 그냥 빼기로' },
        { text: num(-(x + ay)), tag: '답의 부호를 반대로' },
        { text: num(ay - x), tag: '부호를 둘 다 지우고 순서 바꿔 뺌' },
      ];
      else if (x < 0 && y > 0) wrongs = [ // (−a) − b
        { text: num(-abs(ax - ay)), tag: '음수에서 빼는데 크기를 뺌' },
        { text: num(ax + ay), tag: '답에 부호를 안 붙임' },
        { text: num(abs(ax - ay)), tag: '부호를 전부 무시' },
      ];
      else wrongs = [ // (−a) − (−b)
        { text: num(-(ax + ay)), tag: '음수 빼기를 더 빼기로' },
        { text: num(ax - ay), tag: '부호를 둘 다 지움' },
        { text: num(ax + ay), tag: '부호를 전부 +로' },
      ];
      const d = -y; // 반대수 더하기
      return ask(this.id, 'calc', fill(story, c), choices(r, num(ans), wrongs), { expr, hint: '빼기는 반대수 더하기로 바꿔요', solve: solveN([
        `① 빼기는 반대수 더하기: ${expr} = ${par(x)} + ${par(d)}`,
        `② 걷기: ${num(x)}에서 ${walkWord(d)}`,
        `③ 도착: ${num(ans)}`,
      ], {
        why: {
          '순서를 바꿔 뺌': `${x} − ${y}${nj(y, '은', '는')} ${x}에서 ${y}칸 왼쪽이에요. 순서를 바꾸면 다른 수가 돼요: ${num(ans)}.`,
          '빼기를 더하기로': `${y}${nj(y, '을', '를')} 빼는 건 왼쪽으로 ${y}칸이에요. 오른쪽으로 갔어요.`,
          '둘 다 음수로 봄': `${x}${nj(x, '은', '는')} 출발점(양수)이에요. 거기서 왼쪽으로 ${y}칸 → ${num(ans)}.`,
          '음수 빼기를 그냥 빼기로': `−${ay}${nj(ay, '을', '를')} 빼는 건 +${ay}${nj(ay, '을', '를')} 더하는 거예요(반대의 반대). ${x} + ${ay} = ${num(ans)}.`,
          '답의 부호를 반대로': `${x}에서 오른쪽으로 ${ay}칸 가면 ${num(ans)}예요. 0보다 오른쪽이라 양수.`,
          '부호를 둘 다 지우고 순서 바꿔 뺌': `−가 두 개라고 지우면 안 돼요. −${ay}${nj(ay, '을', '를')} 빼기 = +${ay} 더하기 → ${x} + ${ay} = ${num(ans)}.`,
          '음수에서 빼는데 크기를 뺌': `−${ax}에서 ${ay}${nj(ay, '을', '를')} 빼면 왼쪽으로 **더** 가요: ${num(ans)}. 크기끼리 빼면 안 돼요.`,
          '답에 부호를 안 붙임': `−${ax}에서 왼쪽으로 ${ay}칸이니 0보다 왼쪽이에요 → ${num(ans)}.`,
          '부호를 전부 무시': `출발이 −${ax}(0보다 왼쪽)이고 거기서 또 왼쪽이에요. 부호를 빼면 다른 문제가 돼요.`,
          '음수 빼기를 더 빼기로': `−${ay}${nj(ay, '을', '를')} 빼는 건 +${ay}${nj(ay, '을', '를')} 더하는 거예요. −${ax} + ${ay} = ${num(ans)}.`,
          '부호를 둘 다 지움': `−${ax}${nj(ax, '은', '는')} 출발점이라 그대로예요. 뒤집는 건 빼는 수(−${ay}) 하나만: −${ax} + ${ay} = ${num(ans)}.`,
          '부호를 전부 +로': `출발점 −${ax}${nj(ax, '은', '는')} 안 바뀌어요. 빼는 수만 반대로: −${ax} + ${ay} = ${num(ans)}.`,
          '계산 실수': `${par(x)} + ${par(d)}${nj(d, '을', '를')} 걷기로 다시 해 봐요: ${num(ans)}.`,
        },
        figure: walkSvg(x, d), rule: '빼기는 반대수 더하기: a − b = a + (−b). 음수를 빼면 더해진다.',
      }) });
    },
    misread(r, c) {
      const a = int(r, 1, 6); const b = a + int(r, 1, 3);
      const v = pickVariant(r, c, ['negneg', 'swap', 'both']);
      const rule = '빼기는 반대수 더하기: a − b = a + (−b). 음수를 빼면 더해진다.';
      if (v === 'negneg') {
        return ask(this.id, 'misread', fill(`{mon/이/가} ${a} − (−${b}) = ${num(a - b)} 라고 했어요. {me/아/야}, 무엇이 틀렸을까?`, c), choices(r, `−${b}${nj(b, '을', '를')} 빼는 건 +${b}${nj(b, '을', '를')} 더하는 거예요. ${a} + ${b} = ${a + b}`, [
          { text: `${a}${nj(a, '이', '가')} ${b}보다 작아서 뺄 수 없어요`, tag: '오개념을 못 짚음' },
          { text: '−가 두 개면 그냥 지우고 계산해요', tag: '오개념을 못 짚음' },
          { text: '틀린 곳이 없어요', tag: '틀린 줄 모름' },
        ]), { solve: solveN([`① −${b}의 반대수는 +${b}`, `② ${a} − (−${b}) = ${a} + ${b}`, `③ = ${a + b}`], { whyAny: fill(`{mon/이/가} 음수 빼기를 그냥 빼기로 했어요. 장부에서 −${b} 항목(빚)을 지우면 합계는 오히려 ${b}만큼 늘어요.`, c), figure: walkSvg(a, b), rule }) });
      }
      if (v === 'swap') {
        return ask(this.id, 'misread', fill(`{mon/이/가} ${a} − ${b} = ${b - a} 라고 했어요. {me/아/야}, 무엇이 틀렸을까?`, c), choices(r, `순서를 바꾸면 안 돼요. ${a}에서 ${b}칸 왼쪽 → −${b - a}`, [
          { text: `${a}에서 ${b}${nj(b, '을', '를')} 뺄 수 없으니 답이 없어요`, tag: '오개념을 못 짚음' },
          { text: `답은 ${a + b}예요`, tag: '오개념을 못 짚음' },
          { text: '틀린 곳이 없어요', tag: '틀린 줄 모름' },
        ]), { solve: solveN([`① ${a} − ${b} = ${a} + (−${b})`, `② ${a}에서 왼쪽으로 ${b}칸`, `③ 0을 지나 −${b - a}`], { whyAny: fill(`{mon/이/가} 큰 수에서 작은 수를 빼고 부호를 안 붙였어요. 작은 수에서 큰 수를 빼면 답은 음수예요.`, c), figure: walkSvg(a, -b), rule }) });
      }
      return ask(this.id, 'misread', fill(`{mon/이/가} (−${a}) − (−${b}) = ${num(-(a + b))} 라고 했어요. {me/아/야}, 무엇이 틀렸을까?`, c), choices(r, `−${b}${nj(b, '을', '를')} 빼는 건 +${b} 더하기예요. −${a} + ${b} = ${b - a}`, [
        { text: `앞의 −${a}도 +${a}로 바꿔야 해요`, tag: '오개념을 못 짚음' },
        { text: '음수에서 음수는 뺄 수 없어요', tag: '오개념을 못 짚음' },
        { text: '틀린 곳이 없어요', tag: '틀린 줄 모름' },
      ]), { solve: solveN([`① 빼는 수 −${b}${nj(b, '을', '를')} 반대수 +${b}로`, `② (−${a}) + ${b}: −${a}에서 오른쪽으로 ${b}칸`, `③ = ${b - a}`], { whyAny: fill(`{mon/이/가} 음수를 빼는데 더 왼쪽으로 갔어요. 합계 −${a}인 장부에서 −${b} 항목을 지우면 합계는 ${b - a}(오른쪽으로 ${b}칸)예요.`, c), figure: walkSvg(-a, b), rule }) });
    },
    why: [
      { q: '3 − (−5)는 왜 8인가요?', ok: '−5를 빼는 건 그 반대인 +5를 더하는 거니까', no: ['−가 두 개면 지우고 3 + 5니까', '5가 3보다 커서 뒤집으니까', '3에서 왼쪽으로 5칸 가니까'], explain: { text: '빼기는 반대수 더하기예요. −5의 반대수는 +5니까 3 − (−5) = 3 + 5 = 8. 장부에서 −5 항목을 지우면 합계가 5만큼 늘어나는 것과 같아요. "−가 두 개면 지운다"는 왜 그런지 설명이 아니라 외운 규칙이에요.' } },
      { q: '2 − 6을 덧셈으로 바꾸면?', ok: '2 + (−6)', no: ['2 + 6', '(−2) + 6', '6 + (−2)'], explain: { text: '빼는 수의 부호를 뒤집고 더하기로 바꿔요: 2 − 6 = 2 + (−6). 앞의 2는 그대로예요. 2에서 왼쪽으로 6칸 → −4.' } },
    ],
  },

  {
    id: 'neg.addsub', grade: 7, name: '덧셈·뺄셈 섞인 계산', needs: ['neg.sub'],
    idea: '2 − 5 + 3은 (+2) + (−5) + (+3)이에요. 전부 덧셈으로 보고 양수끼리·음수끼리 모으면 편해요.',
    calc(r, c) {
      const a = int(r, 2, 9); let b = int(r, 2, 9); if (b === a) b = b === 9 ? 8 : b + 1; const cc = int(r, 2, 9);
      const exprOf = (t) => `${num(t[0])} ${t[1] < 0 ? M : '+'} ${abs(t[1])} ${t[2] < 0 ? M : '+'} ${abs(t[2])}`;
      const fams = [
        { t: [a, -b, cc], pools: {
          pokemon: [
            `{me}의 코인 장부: ${a}개 벌고, ${b}개 쓰고, ${cc}개 벌었어요. 모두 합치면 코인 셈은?`,
            `얼음 동굴의 온도가 ${a}도에서 ${b}도 내려갔다가 ${cc}도 올라갔어요. 지금 온도는?`,
            ...plainFor(exprOf([a, -b, cc])),
          ],
          toystory: [`보니의 릴리패드 점수: ${a}점 얻고, ${b}점 잃고, ${cc}점 얻었어요. 점수는?`],
          minions: [`헨리의 바나나 셈: ${a}개 얻고, ${b}개 먹어 없애고, ${cc}개 얻었어요. 바나나 셈은?`],
          moana: [`모아나의 카누: 앞으로 ${a}km, 뒤로 ${b}km, 앞으로 ${cc}km. 섬에서 어디에 있을까요?`],
        } },
        { t: [-a, b, -cc], pools: {
          pokemon: [
            `{mon}의 HP 변화: ${a} 깎이고, ${b} 회복하고, ${cc} 깎였어요. 모두 합치면 얼마나 변했나요?`,
            `{me}의 코인 장부: ${a}개 쓰고, ${b}개 벌고, ${cc}개 썼어요. 모두 합치면?`,
            ...plainFor(exprOf([-a, b, -cc])),
          ],
        } },
        { t: [-a, -b, cc], pools: {
          pokemon: [
            `얼음 동굴의 온도가 −${a}도에서 ${b}도 더 내려갔다가 ${cc}도 올라갔어요. 지금 온도는?`,
            `디그다가 땅속 ${a}m(−${a})에서 ${b}m 더 파고 내려갔다가 ${cc}m 올라왔어요. 지금 위치는?`,
            ...plainFor(exprOf([-a, -b, cc])),
          ],
        } },
      ];
      const f = pickFamily(r, c, fams);
      const story = worldPick(r, c, f.pools);
      const [t1, t2, t3] = f.t; const ans = t1 + t2 + t3;
      const expr = exprOf(f.t);
      const pos = f.t.filter((v) => v > 0); const neg = f.t.filter((v) => v < 0);
      const P = pos.reduce((s, v) => s + v, 0); const N = neg.reduce((s, v) => s + v, 0);
      let wrongs;
      if (t2 < 0 && t3 > 0 && t1 > 0) wrongs = [
        { text: num(t1 + t2 - t3), tag: '뒤의 두 수를 묶어서 뺌' },
        { text: num(a + b + cc), tag: '부호를 무시하고 전부 더함' },
        { text: num(-ans), tag: '답의 부호를 반대로' },
        { text: num(a + b - cc), tag: '부호를 엉뚱한 수에 붙임' },
      ];
      else if (t1 < 0 && t2 > 0) wrongs = [
        { text: num(-(a + b - cc)), tag: '맨 앞 −를 전체에 붙임' },
        { text: num(a + b + cc), tag: '부호를 무시하고 전부 더함' },
        { text: num(-(a + b + cc)), tag: '전부 음수로 봄' },
        { text: num(-ans), tag: '답의 부호를 반대로' },
      ];
      else wrongs = [
        { text: num(-abs(a - b) + cc), tag: '음수끼리 더하는데 뺌' },
        { text: num(a + b + cc), tag: '부호를 무시하고 전부 더함' },
        { text: num(-ans), tag: '답의 부호를 반대로' },
        { text: num(-(a + b + cc)), tag: '전부 음수로 봄' },
      ];
      const j = (arr) => arr.map(par).join(' + ');
      return ask(this.id, 'calc', fill(story, c), choices(r, num(ans), wrongs), { expr, hint: '양수끼리, 음수끼리 모아요', solve: solveN([
        `① 전부 덧셈으로: ${j(f.t)}`,
        `② 양수끼리: ${pos.length ? j(pos) + ' = ' + P : '없음'} / 음수끼리: ${neg.length ? j(neg) + ' = ' + num(N) : '없음'}`,
        `③ 합치기: ${par(P)} + ${par(N)} = ${num(ans)}`,
      ], {
        why: {
          '뒤의 두 수를 묶어서 뺌': `+${abs(t3)}${nj(t3, '은', '는')} 더하는 수예요. ${abs(t2)}${nj(t2, '과', '와')} ${abs(t3)}${nj(t3, '을', '를')} 묶어서 같이 빼면 안 돼요 — 부호는 바로 앞의 것만 따라요.`,
          '부호를 무시하고 전부 더함': `−가 붙은 수는 왼쪽으로 걷는 거예요. 음수끼리 모으면 ${num(N)}.`,
          '답의 부호를 반대로': `양수 ${P}${nj(P, '과', '와')} 음수 ${num(N)}${nj(N, '을', '를')} 합치면 절댓값(크기)이 큰 쪽의 부호를 따라요: ${P > abs(N) ? '양수 쪽 크기 ' + P + '가 더 커서 +' : '음수 쪽 크기 ' + abs(N) + '가 더 커서 −'} → ${num(ans)}.`,
          '맨 앞 −를 전체에 붙임': `맨 앞의 −는 첫 수(${num(t1)})에만 붙어요. 나머지는 각자 부호대로: ${j(f.t)}.`,
          '전부 음수로 봄': `${j(pos)}${nj(pos[pos.length - 1], '은', '는')} 양수예요. 음수끼리(${j(neg)})만 모으고 양수는 따로.`,
          '부호를 엉뚱한 수에 붙임': `부호는 바로 앞의 기호를 따라요: ${abs(t2)} 앞은 ${t2 < 0 ? '−' : '+'}, ${abs(t3)} 앞은 ${t3 < 0 ? '−' : '+'}. 바꿔 붙이면 다른 계산이 돼요.`,
          '음수끼리 더하는데 뺌': `${num(t1)}${nj(t1, '과', '와')} ${num(t2)}${nj(t2, '은', '는')} 둘 다 음수라 거리가 합쳐져요: ${num(N)}. 그다음 +${cc}.`,
          '계산 실수': `양수끼리 ${P}, 음수끼리 ${num(N)}, 합치면 ${num(ans)}.`,
        },
        rule: '전부 덧셈으로 보고 양수끼리·음수끼리 모은다.',
      }) });
    },
    misread(r, c) {
      const a = int(r, 2, 9); let b = int(r, 2, 9); if (b === a) b = b === 9 ? 8 : b + 1;
      // front 갈래의 주장 −(a + b − cc)는 b = cc이면 참(−a)이 된다 — 맞는 등식을 "무엇이 틀렸나" 물으면 안 된다 (Codex #1)
      let cc = int(r, 2, 9); if (cc === b) cc = cc === 9 ? 8 : cc + 1;
      const v = pickVariant(r, c, ['group', 'front']);
      const rule = '전부 덧셈으로 보고 양수끼리·음수끼리 모은다.';
      if (v === 'group') {
        return ask(this.id, 'misread', fill(`{mon/이/가} ${a} − ${b} + ${cc} = ${num(a - b - cc)} 라고 했어요. {me/아/야}, 무엇이 틀렸을까?`, c), choices(r, `+${cc}${nj(cc, '은', '는')} 더해야 해요. ${b}${nj(b, '과', '와')} ${cc}${nj(cc, '을', '를')} 묶어서 빼 버렸어요`, [
          { text: `${a}에서 ${b}${nj(b, '을', '를')} 뺄 수 없어요`, tag: '오개념을 못 짚음' },
          { text: `${b} + ${cc}${nj(cc, '을', '를')} 먼저 계산해야 해요`, tag: '오개념을 못 짚음' },
          { text: '틀린 곳이 없어요', tag: '틀린 줄 모름' },
        ]), { solve: solveN([`① 전부 덧셈으로: ${a} + (−${b}) + ${cc}`, `② 양수끼리 ${a} + ${cc} = ${a + cc}, 음수는 −${b}`, `③ ${a + cc} + (−${b}) = ${num(a - b + cc)}`], { whyAny: fill(`{mon/이/가} 뒤의 두 수를 묶어서 같이 뺐어요. 부호는 바로 앞의 것만 따라요 — ${cc} 앞은 +.`, c), rule }) });
      }
      return ask(this.id, 'misread', fill(`{mon/이/가} −${a} + ${b} − ${cc} = ${num(-(a + b - cc))} 라고 했어요. {me/아/야}, 무엇이 틀렸을까?`, c), choices(r, `맨 앞 −는 ${a}에만 붙어요. +${b}${nj(b, '은', '는')} 양수예요`, [
        { text: `${b}도 −${b}로 바꿔야 해요`, tag: '오개념을 못 짚음' },
        { text: '맨 앞에 −가 오면 계산할 수 없어요', tag: '오개념을 못 짚음' },
        { text: '틀린 곳이 없어요', tag: '틀린 줄 모름' },
      ]), { solve: solveN([`① 전부 덧셈으로: (−${a}) + ${b} + (−${cc})`, `② 양수 ${b} / 음수끼리 (−${a}) + (−${cc}) = −${a + cc}`, `③ ${b} + (−${a + cc}) = ${num(b - a - cc)}`], { whyAny: fill(`{mon/이/가} 맨 앞의 −를 전체에 붙였어요. 부호는 바로 뒤의 수 하나에만 붙어요.`, c), rule }) });
    },
    why: [
      { q: '2 − 5 + 3을 계산할 때 왜 전부 덧셈으로 바꾸나요?', ok: '덧셈은 순서를 바꿔 모아도 되니까 — 양수끼리·음수끼리', no: ['뺄셈은 계산할 수 없으니까', '답이 항상 양수가 되니까', '수가 세 개면 규칙이라서'], explain: { text: '덧셈은 순서를 바꿔 모아도 값이 같아요(교환·결합). 2 + (−5) + 3으로 보면 양수끼리(2 + 3 = 5), 음수(−5)를 따로 모아 5 + (−5) = 0으로 편하게 셀 수 있어요.' } },
      { q: '−4 + 6 − 3에서 음수끼리 모으면?', ok: '(−4) + (−3) = −7', no: ['(−4) + (−6) = −10', '4 + 3 = 7', '(−4) − (−3) = −1'], explain: { text: '전부 덧셈으로 쓰면 (−4) + 6 + (−3). 음수는 −4와 −3이니 (−4) + (−3) = −7, 양수는 6. 합치면 6 + (−7) = −1.' } },
    ],
  },

  {
    id: 'neg.mul', grade: 7, name: '음수가 있는 곱셈', needs: ['neg.addsub'],
    idea: '같은 부호끼리 곱하면 +, 다른 부호끼리 곱하면 −. 음수 × 음수 = 양수는 규칙표에서 스스로 찾아요.',
    calc(r, c) {
      const a = int(r, 2, 9); const b = int(r, 2, 9);
      const fams = [
        { x: -a, y: b, pools: {
          pokemon: [
            `{mon/이/가} 독 데미지 −${a}${nj(a, '을', '를')} ${b}번 받았어요. HP는 모두 얼마나 변했나요?`,
            `얼음 동굴의 온도가 하루에 ${a}도씩(−${a}) 내려가요. ${b}일 뒤에는 지금보다 몇 도 변할까요?`,
            `{me/이/가} 하루에 코인 ${a}개씩(−${a}) 써요. ${b}일 동안 코인은 얼마나 변할까요?`,
          ],
          toystory: [`보니가 터틀 태그에서 한 판에 ${a}점씩(−${a}) 잃어요. ${b}판이면 점수는 얼마나 변할까요?`],
          minions: [`헨리가 하루에 바나나 ${a}개씩(−${a}) 먹어 없애요. ${b}일이면 바나나는 얼마나 변할까요?`],
          moana: [`카누가 파도에 한 번에 ${a}km씩(−${a}) 밀려요. ${b}번 밀리면 위치는 얼마나 변할까요?`],
        } },
        { x: a, y: -b, pools: {
          pokemon: [
            `${a} × (−${b})의 답은 얼마일까요? {mon/이/가} 규칙표를 보라고 해요.`,
            ...plainFor(`${a} × (−${b})`),
          ],
        } },
        { x: -a, y: -b, pools: {
          pokemon: [
            `얼음 동굴의 온도가 하루에 ${a}도씩(−${a}) 내려가요. ${b}일 **전**(−${b}일)에는 지금보다 몇 도 달랐을까요?`,
            `{me/이/가} 하루에 코인 ${a}개씩(−${a}) 써요. ${b}일 **전**(−${b}일)에는 지금보다 코인이 얼마나 달랐을까요?`,
            `(−${a}) × (−${b})의 답은 얼마일까요? {mon/이/가} 규칙표를 보라고 해요.`,
          ],
          toystory: [`보니가 한 판에 ${a}점씩(−${a}) 잃어요. ${b}판 **전**(−${b}판)에는 지금보다 점수가 얼마나 달랐을까요?`],
          minions: [`헨리가 하루에 바나나 ${a}개씩(−${a}) 없애요. ${b}일 **전**(−${b}일)에는 지금보다 바나나가 얼마나 달랐을까요?`],
          moana: [`카누가 한 번에 ${a}km씩(−${a}) 밀려요. ${b}번 밀리기 **전**(−${b}번)에는 지금보다 어디에 있었을까요?`],
        } },
      ];
      const f = pickFamily(r, c, fams);
      const story = worldPick(r, c, f.pools);
      const { x, y } = f; const ans = x * y; const same = (x < 0) === (y < 0);
      const expr = `${par(x)} × ${par(y)}`;
      // 연산 혼동 오답은 **실제로 그 연산을 했을 때의 값**이어야 이름표가 진단이 된다 (Codex #5: −(a+b)에 "덧셈으로"를 붙였는데 (−9)+9는 0)
      const wrongs = [
        { text: num(-ans), tag: same ? '음수×음수를 음수로 봄' : '다른 부호끼리 곱하면 +라고 봄' },
        { text: num(x + y), tag: '곱셈을 덧셈으로' },
        { text: num(x - y), tag: '곱셈을 뺄셈으로' },
        { text: num(-(x + y)), tag: '곱셈을 덧셈으로 하고 부호도 틀림' },
      ];
      return ask(this.id, 'calc', fill(story, c), choices(r, num(ans), wrongs), { expr, hint: '크기 먼저, 부호는 규칙표로', solve: solveN([
        `① 크기: ${a} × ${b} = ${a * b}`,
        `② 부호: ${same ? `같은 부호끼리(${par(x)}, ${par(y)}) → +` : `다른 부호끼리(${par(x)}, ${par(y)}) → −`}`,
        `③ 답: ${num(ans)}`,
      ], {
        why: {
          '음수×음수를 음수로 봄': `같은 부호끼리 곱하면 +예요. "${a}씩 줄어드는 것을 ${b}번 되감으면" 오히려 늘어나요: +${a * b}.`,
          '다른 부호끼리 곱하면 +라고 봄': `다른 부호끼리 곱하면 −예요. −${a}${nj(a, '을', '를')} ${b}번 더하면 −${a * b}.`,
          '곱셈을 덧셈으로': `${par(x)} + ${par(y)} = ${num(x + y)}는 더한 거예요. 곱셈은 ${par(x)}${nj(x, '을', '를')} ${b}번 모으는 것 → 크기 ${a * b}.`,
          '곱셈을 뺄셈으로': `${par(x)} − ${par(y)} = ${num(x - y)}는 뺀 거예요. 곱셈은 크기 ${a} × ${b} = ${a * b}, 부호는 ${same ? '같아서 +' : '달라서 −'}.`,
          '곱셈을 덧셈으로 하고 부호도 틀림': `더한 것도 아니고 부호도 틀렸어요. 크기는 곱해서 ${a * b}, 부호는 ${same ? '같은 부호끼리라 +' : '다른 부호끼리라 −'}.`,
          '계산 실수': `${a} × ${b} = ${a * b}. 부호는 ${same ? '같아서 +' : '달라서 −'}.`,
        },
        rule: '같은 부호 → +, 다른 부호 → −. 크기는 그냥 곱한다.',
      }) });
    },
    misread(r, c) {
      const a = int(r, 2, 9); const b = int(r, 2, 9);
      const v = pickVariant(r, c, ['negneg', 'mixed']);
      const rule = '같은 부호 → +, 다른 부호 → −. 크기는 그냥 곱한다.';
      if (v === 'negneg') {
        return ask(this.id, 'misread', fill(`{mon/이/가} (−${a}) × (−${b}) = −${a * b} 라고 했어요. {me/아/야}, 무엇이 틀렸을까?`, c), choices(r, '같은 부호끼리 곱하면 +예요. 음수 × 음수 = 양수', [
          { text: '크기를 잘못 곱했어요', tag: '오개념을 못 짚음' },
          { text: '음수끼리는 곱할 수 없어요', tag: '오개념을 못 짚음' },
          { text: '틀린 곳이 없어요', tag: '틀린 줄 모름' },
        ]), { solve: solveN([`① 크기: ${a} × ${b} = ${a * b}`, '② 부호: −와 − 는 같은 부호 → +', `③ = ${a * b}`], { whyAny: fill(`{mon/이/가} 음수가 있으니 답도 음수라고 생각했어요. 규칙표: 같은 부호끼리는 +, 그래서 (−${a}) × (−${b}) = ${a * b}.`, c), rule }) });
      }
      return ask(this.id, 'misread', fill(`{mon/이/가} (−${a}) × ${b} = ${a * b} 라고 했어요. {me/아/야}, 무엇이 틀렸을까?`, c), choices(r, `다른 부호끼리 곱하면 −예요. −${a * b}`, [
        { text: '크기를 잘못 곱했어요', tag: '오개념을 못 짚음' },
        { text: `${b}에도 −를 붙여야 해요`, tag: '오개념을 못 짚음' },
        { text: '틀린 곳이 없어요', tag: '틀린 줄 모름' },
      ]), { solve: solveN([`① 크기: ${a} × ${b} = ${a * b}`, '② 부호: −와 + 는 다른 부호 → −', `③ = −${a * b}`], { whyAny: fill(`{mon/이/가} 부호를 빠뜨렸어요. −${a}${nj(a, '을', '를')} ${b}번 더하는 것이니 −${a * b}.`, c), rule }) });
    },
    why: [
      { q: '(−2) × (−3)은 왜 +6인가요?', ok: '2씩 줄어드는 것을 3번 되감으면(전으로 가면) 오히려 6 늘어나니까', no: ['−가 두 개면 지우면 되니까', '음수는 곱하면 항상 양수니까', '2 × 3에 −를 두 번 붙이니까'], explain: { text: '(−2) × 3은 −2를 3번 더한 것(−6). 곱하는 수를 −3으로 바꾸면 "3번 앞으로"가 아니라 "3번 되감기"예요. 2씩 줄어드는 걸 3번 되감으면 오히려 6만큼 늘어나서 +6. 규칙표에서 −2 × 3, −2 × 2, −2 × 1, −2 × 0, … 으로 2씩 커지는 걸 보면 −2 × (−1)은 +2가 돼요.' } },
      { q: '(−4) × 5의 부호는?', ok: '− (다른 부호끼리 곱해서)', no: ['+ (음수가 하나뿐이라서)', '+ (5가 4보다 커서)', '− (음수가 앞에 있어서)'], explain: { text: '부호는 두 수의 부호가 같은지 다른지로만 정해요. −4와 5는 다른 부호라 답은 −(−20). 어느 쪽이 크거나 앞에 있는지는 상관없어요.' } },
    ],
  },

  {
    id: 'neg.div', grade: 7, name: '음수가 있는 나눗셈', needs: ['neg.mul'],
    idea: '나눗셈은 곱셈의 반대예요. 부호 규칙은 곱셈과 똑같아요. 0으로는 못 나눠요.',
    calc(r, c) {
      const b = int(r, 2, 9); const q = int(r, 2, 9); const a = b * q;
      const fams = [
        { x: -a, y: b, pools: {
          pokemon: [
            `{mon}의 HP가 ${b}번 똑같이 깎여서 모두 ${a}만큼 줄었어요(변화량 −${a}). 한 번의 변화량은?`,
            `얼음 동굴의 온도가 ${b}일 동안 똑같이 내려가서 모두 −${a}도 변했어요. 하루에 몇 도씩 변했을까요?`,
            `{me}의 코인 빚 −${a}${nj(a, '을', '를')} ${b}일에 똑같이 나눠 갚기로 했어요. 하루치는 얼마일까요?`,
          ],
          toystory: [`보니가 ${b}판 동안 똑같이 점수를 잃어서 변화량이 모두 −${a}점이에요. 한 판에 얼마씩 변했을까요?`],
          minions: [`헨리가 ${b}일 동안 똑같이 바나나를 없애서 변화량이 모두 −${a}개예요. 하루에 얼마씩 변했을까요?`],
          moana: [`카누가 ${b}번 똑같이 밀려서 모두 −${a}km 변했어요. 한 번에 얼마씩 변했을까요?`],
        } },
        { x: a, y: -b, pools: {
          pokemon: [
            `${a} ÷ (−${b})의 답은 얼마일까요? {mon/이/가} 곱셈 규칙표를 떠올리라고 해요.`,
            ...plainFor(`${a} ÷ (−${b})`),
          ],
        } },
        { x: -a, y: -b, pools: {
          pokemon: [
            `얼음 동굴의 온도가 하루에 −${b}도씩 변해요. 모두 −${a}도 변하려면 며칠이 걸릴까요?`,
            `{mon}의 HP가 독으로 한 번에 −${b}씩 변해요. 변화량이 모두 −${a}${nj(a, '이', '가')} 되려면 몇 번 받아야 할까요?`,
            `(−${a}) ÷ (−${b})의 답은 얼마일까요? {mon/이/가} 곱셈 규칙표를 떠올리라고 해요.`,
          ],
        } },
      ];
      const f = pickFamily(r, c, fams);
      const story = worldPick(r, c, f.pools);
      const { x, y } = f; const ans = x / y; const same = (x < 0) === (y < 0);
      const expr = `${par(x)} ÷ ${par(y)}`;
      // 연산 혼동 오답은 실제로 그 연산을 한 값으로 (Codex #5) — 나눗셈을 곱셈으로 = x × y, 뺄셈으로 = x − y
      const wrongs = [
        { text: num(-ans), tag: same ? '음수÷음수를 음수로 봄' : '다른 부호끼리 나누면 +라고 봄' },
        { text: num(x * y), tag: '나눗셈을 곱셈으로' },
        { text: num(x - y), tag: '나눗셈을 뺄셈으로' },
        { text: num(-(x * y)), tag: '나눗셈을 곱셈으로 하고 부호도 틀림' },
      ];
      return ask(this.id, 'calc', fill(story, c), choices(r, num(ans), wrongs), { expr, hint: '크기 먼저, 부호는 곱셈 규칙과 같아요', solve: solveN([
        `① 크기: ${a} ÷ ${b} = ${q}`,
        `② 부호: ${same ? `같은 부호끼리(${par(x)}, ${par(y)}) → +` : `다른 부호끼리(${par(x)}, ${par(y)}) → −`} (곱셈과 같은 규칙)`,
        `③ 답: ${num(ans)}  — 확인: ${par(ans)} × ${par(y)} = ${num(x)}`,
      ], {
        why: {
          '음수÷음수를 음수로 봄': `같은 부호끼리는 +예요. 확인: ${par(-ans)} × ${par(y)} = ${num(-ans * y)} ≠ ${num(x)}.`,
          '다른 부호끼리 나누면 +라고 봄': `다른 부호끼리는 −예요. 확인: ${par(-ans)} × ${par(y)} = ${num(-ans * y)} ≠ ${num(x)}.`,
          '나눗셈을 곱셈으로': `${par(x)} × ${par(y)} = ${num(x * y)}는 곱한 거예요. 나눗셈은 "몇 묶음인가": ${a}${nj(a, '을', '를')} ${b}${nj(b, '으로', '로')} 나누면 ${q}.`,
          '나눗셈을 곱셈으로 하고 부호도 틀림': `곱한 것도 아니고 부호도 틀렸어요. 크기는 ${a} ÷ ${b} = ${q}, 부호는 ${same ? '같은 부호끼리라 +' : '다른 부호끼리라 −'}.`,
          '나눗셈을 뺄셈으로': `${par(x)} − ${par(y)} = ${num(x - y)}는 뺀 거예요. 나눗셈은 ${a} ÷ ${b} = ${q}, 부호는 ${same ? '같아서 +' : '달라서 −'}.`,
          '계산 실수': `${a} ÷ ${b} = ${q}. 부호는 ${same ? '같아서 +' : '달라서 −'}. 곱해서 되돌아가는지 확인해요.`,
        },
        rule: '나눗셈의 부호 규칙은 곱셈과 같다. 답 × 나누는 수 = 원래 수로 확인.',
      }) });
    },
    misread(r, c) {
      const b = int(r, 2, 9); const q = int(r, 2, 9); const a = b * q;
      const v = pickVariant(r, c, ['negneg', 'zero']);
      const rule = '나눗셈의 부호 규칙은 곱셈과 같다. 0으로는 못 나눈다.';
      if (v === 'negneg') {
        return ask(this.id, 'misread', fill(`{mon/이/가} (−${a}) ÷ (−${b}) = −${q} 라고 했어요. {me/아/야}, 무엇이 틀렸을까?`, c), choices(r, `같은 부호끼리 나누면 +예요. ${q}`, [
          { text: '크기를 잘못 나눴어요', tag: '오개념을 못 짚음' },
          { text: '음수끼리는 나눌 수 없어요', tag: '오개념을 못 짚음' },
          { text: '틀린 곳이 없어요', tag: '틀린 줄 모름' },
        ]), { solve: solveN([`① 크기: ${a} ÷ ${b} = ${q}`, '② 부호: −와 − 는 같은 부호 → +', `③ 확인: ${q} × (−${b}) = −${a} ✔`], { whyAny: fill(`{mon/이/가} 음수가 있으니 답도 음수라고 했어요. 확인해 보면 −${q} × (−${b}) = ${a}지 −${a}${nj(a, '이', '가')} 아니에요.`, c), rule }) });
      }
      return ask(this.id, 'misread', fill(`{mon/이/가} (−${a}) ÷ 0 = 0 이라고 했어요. {me/아/야}, 무엇이 틀렸을까?`, c), choices(r, '0으로는 나눌 수 없어요 — 답이 없어요', [
        { text: `답은 −${a}예요`, tag: '오개념을 못 짚음' },
        { text: '답은 0이 아니라 −0이에요', tag: '오개념을 못 짚음' },
        { text: '틀린 곳이 없어요', tag: '틀린 줄 모름' },
      ]), { solve: solveN(['① 나눗셈은 "답 × 나누는 수 = 원래 수"로 확인해요', `② 어떤 수 × 0 = 0이라 −${a}${nj(a, '이', '가')} 될 수 없어요`, '③ 0으로 나누는 건 정할 수 없어요'], { whyAny: fill(`{mon/이/가} 0으로 나눴어요. 0으로 나누면 확인이 안 돼요 — 어떤 수를 0에 곱해도 −${a}${nj(a, '이', '가')} 안 나와요.`, c), rule }) });
    },
    why: [
      { q: '(−12) ÷ (−3)의 부호는 왜 +인가요?', ok: '4 × (−3) = −12 이니까 (곱셈과 같은 규칙)', no: ['음수는 나누면 항상 +니까', '12가 3보다 크니까', '−가 두 개면 지우니까'], explain: { text: '나눗셈은 곱셈의 반대예요. 답 × (−3) = −12가 되어야 하니 답은 4 (4 × (−3) = −12). 같은 부호끼리 나누면 +, 곱셈과 같은 규칙이에요.' } },
      { q: '5 ÷ 0은 왜 안 되나요?', ok: '어떤 수를 0에 곱해도 5가 안 되니까', no: ['답이 0이라서', '0은 수가 아니라서', '답이 너무 커서'], explain: { text: '나눗셈은 "무엇을 0에 곱하면 5가 되나?"를 묻는 거예요. 어떤 수를 0에 곱해도 0이라서 5가 될 수 없어요. 그래서 0으로 나누는 건 정할 수 없어요.' } },
    ],
  },

  {
    id: 'neg.frac', grade: 7, name: '음의 분수와 소수', needs: ['neg.div'],
    idea: '분수·소수에도 부호가 붙어요(유리수). 부호는 정수 규칙대로, 숫자는 분수 줄기에서 하던 대로.',
    calc(r, c) {
      // 분자는 분모와 서로소 — 부호를 묻는 자리에 −3/6 같은 수가 나오면 산만하다 (분수 줄기와 같은 이유)
      const d = pick(r, [3, 4, 5, 6, 8]);
      const cop = [...Array(d - 1).keys()].map((i) => i + 1).filter((n) => gcd(n, d) === 1);
      const a = pick(r, cop); const b = pick(r, cop.filter((n) => n !== a));
      const t = pick(r, [5, 15, 25, 2, 4, 12]); const k = int(r, 2, 4); // 소수 t/10 × k
      // 네 수의 모양(소수·정수·소수·정수 순)은 고정 — 틀 이름표는 숫자만 지우므로 소수점 자리가 바뀌면 다른 틀이 된다
      const set = pick(r, [[-1.5, -2, 0.5, 1], [-0.5, -2, 1.5, 1], [-2.5, -1, 0.5, 2], [-1.5, -1, 2.5, 3], [-0.5, -3, 1.5, 2]]);
      const dec = num(t / 10);
      const fams = [
        { kind: 'add', pools: {
          pokemon: [
            `{me}의 코인 장부에 −${a}/${d}${nj(a, '과', '와')} +${b}/${d}${nj(b, '이', '가')} 적혀 있어요. 합치면?`,
            `얼음 동굴의 온도가 −${a}/${d}도였는데 ${b}/${d}도 올라갔어요. 지금 온도는?`,
            ...plainFor(`(−${a}/${d}) + ${b}/${d}`),
          ],
        } },
        // 소수 × 정수 — 곱하는 수의 부호로 가족을 나눈다 (이야기가 "뒤"와 "전"으로 다르다)
        { kind: 'dec', kneg: false, pools: {
          pokemon: [
            `{mon}의 HP가 한 번에 ${dec}씩 깎여요(−${dec}). ${k}번 깎이면 HP는 얼마나 변할까요?`,
            `얼음 동굴의 온도가 한 시간에 ${dec}도씩(−${dec}) 내려가요. ${k}시간 뒤에는 지금보다 몇 도 변할까요?`,
            ...plainFor(`(−${dec}) × ${k}`),
          ],
        } },
        { kind: 'dec', kneg: true, pools: {
          pokemon: [
            `얼음 동굴의 온도가 한 시간에 ${dec}도씩(−${dec}) 내려가요. ${k}시간 **전**(−${k}시간)에는 지금보다 몇 도 달랐을까요?`,
            ...plainFor(`(−${dec}) × (−${k})`),
          ],
        } },
        { kind: 'near', pools: {
          pokemon: [
            `${set.map(num).join(', ')} 중에서 0에 **가장 가까운** 수는?`,
            `수직선에 ${set.map(num).join(', ')}${nj(set[3], '을', '를')} 찍었어요. 0에 가장 가까운 점은?`,
          ],
        } },
      ];
      const f = pickFamily(r, c, fams);
      const story = worldPick(r, c, f.pools);
      const rule = '부호는 정수 규칙대로, 숫자는 분수·소수 규칙대로.';
      if (f.kind === 'add') {
        const n = b - a; const ans = frac(n, d);
        return ask(this.id, 'calc', fill(story, c), choices(r, ans, [
          { text: frac(-(a + b), d), tag: '부호를 무시하고 더한 뒤 −를 붙임' },
          { text: frac(a + b, d), tag: '부호를 무시하고 더함' },
          { text: frac(-n, d), tag: '답의 부호를 반대로' },
          { text: frac(n, 2 * d), tag: '분모끼리 더함' },
        ]), { expr: `(−${a}/${d}) + ${b}/${d}`, hint: '부호는 정수처럼, 숫자는 분수처럼', solve: solve([
          `① 분모가 같아요(${d}) → 분자만 계산: (−${a}) + ${b}`,
          `② 부호가 다르면 절댓값(크기)이 큰 쪽에서 작은 쪽을 빼고, 절댓값이 큰 쪽의 부호: ${b > a ? `${b} − ${a} = ${b - a}, 부호 +` : `${a} − ${b} = ${a - b}, 부호 −`}`,
          `③ 답: ${frac(n, d)}${gcd(abs(n), d) !== 1 ? ` (${num(n)}/${d}${nj(d, '을', '를')} 약분)` : ''}`,
        ], {
          why: {
            '부호를 무시하고 더한 뒤 −를 붙임': `(−${a}) + ${b}${nj(b, '은', '는')} −${a}에서 오른쪽으로 ${b}칸이에요. 크기를 더하면 안 돼요.`,
            '부호를 무시하고 더함': `−${a}/${d}${nj(a, '은', '는')} 0보다 작은 수예요. 부호가 다르니 크기의 차이를 구해요: ${abs(n)}/${d}.`,
            '답의 부호를 반대로': `절댓값(크기)이 큰 쪽은 ${b > a ? `${b}/${d}(양수)` : `${a}/${d}(음수)`}라서 답의 부호는 ${b > a ? '+' : '−'}.`,
            '분모끼리 더함': `분모는 조각 크기예요. 분수 줄기에서 배운 대로 분모는 ${d} 그대로.`,
            '계산 실수': `분자만: (−${a}) + ${b} = ${num(n)} → ${frac(n, d)}.`,
          },
          figure: lineSvg(-1, 1, { dots: [n / d] }), rule,
        }) });
      }
      if (f.kind === 'dec') {
        const kneg = f.kneg;
        const x = -t / 10; const y = kneg ? -k : k; const ans = (kneg ? t * k : -t * k) / 10;
        const same = kneg;
        return ask(this.id, 'calc', fill(story, c), choices(r, num(ans), [
          { text: num(-ans), tag: same ? '음수×음수를 음수로 봄' : '다른 부호끼리 곱하면 +라고 봄' },
          { text: num(ans * 10), tag: '소수점을 잃음' },
          { text: num(x + y), tag: '곱셈을 덧셈으로' },
          { text: num(x - y), tag: '곱셈을 뺄셈으로' },
        ]), { expr: `${par(x)} × ${par(y)}`, hint: '크기 먼저, 부호는 규칙표로', solve: solve([
          `① 크기: ${num(t / 10)} × ${k} = ${num(t * k / 10)} (소수점 자리 그대로)`,
          `② 부호: ${same ? '같은 부호끼리 → +' : '다른 부호끼리 → −'}`,
          `③ 답: ${num(ans)}`,
        ], {
          why: {
            '음수×음수를 음수로 봄': '같은 부호끼리 곱하면 +예요. 소수라도 규칙은 같아요.',
            '다른 부호끼리 곱하면 +라고 봄': `다른 부호끼리 곱하면 −예요. −${num(t / 10)}${nj(t, '을', '를')} ${k}번 더하면 ${num(ans)}.`,
            '소수점을 잃음': `${num(t / 10)}${nj(t, '은', '는')} 소수예요. ${t}${nj(t, '이', '가')} 아니라 ${num(t / 10)} — 소수점 자리를 지켜요.`,
            '곱셈을 덧셈으로': `곱셈이에요. ${num(t / 10)}${nj(t, '을', '를')} ${k}번 모으면 크기가 ${num(t * k / 10)}.`,
            '곱셈을 뺄셈으로': `${par(x)} − ${par(y)} = ${num(x - y)}는 뺀 거예요. 곱셈은 크기 ${num(t / 10)} × ${k} = ${num(t * k / 10)}, 부호는 ${same ? '+' : '−'}.`,
            '계산 실수': `${num(t / 10)} × ${k} = ${num(t * k / 10)}, 부호는 ${same ? '+' : '−'}.`,
          },
          rule,
        }) });
      }
      // near: 0에 가장 가까운 수
      const near = set.reduce((p, v) => (abs(v) < abs(p) ? v : p));
      const min = Math.min(...set); const max = Math.max(...set);
      const rest = set.filter((v) => v !== near && v !== min && v !== max);
      return ask(this.id, 'calc', fill(story, c), choices(r, num(near), [
        { text: num(min), tag: '작은 수가 0에 가깝다고 봄' },
        { text: num(max), tag: '큰 수가 0에 가깝다고 봄' },
        ...(rest.length ? [{ text: num(rest[0]), tag: '눈금을 잘못 셈' }] : []), // 네 수 중 남은 하나 — 오개념이 아니라 거리를 잘못 센 것 (보충 '계산 실수'와 구분, Codex #8)
      ]), { figure: lineSvg(-3, 3, { dots: set }), solve: solve([
        `① 0에서 떨어진 거리(절댓값): ${set.map((v) => `${num(v)} → ${num(abs(v))}`).join(', ')}`,
        '② 거리가 제일 짧은 것이 0에 제일 가까워요',
        `③ 답: ${num(near)}`,
      ], {
        why: {
          '작은 수가 0에 가깝다고 봄': `${num(min)}${nj(min, '은', '는')} 가장 **작은** 수예요. 0에서 왼쪽으로 멀리 있어요.`,
          '큰 수가 0에 가깝다고 봄': `${num(max)}${nj(max, '은', '는')} 가장 **큰** 수예요. 0에서 오른쪽으로 멀리 있어요.`,
          '눈금을 잘못 셈': '수마다 0에서 얼마나 떨어졌는지 다시 재요. 분수·소수도 눈금 사이에 있을 뿐 똑같아요.',
          '계산 실수': '수마다 0에서 얼마나 떨어졌는지 재요. 분수·소수도 똑같아요.',
        },
        figure: lineSvg(-3, 3, { dots: set }), rule: '절댓값 = 0에서 떨어진 거리. 분수·소수도 똑같이 잰다.',
      }) });
    },
    misread(r, c) {
      const d = pick(r, [4, 5, 8]);
      const cop = [...Array(d - 1).keys()].map((i) => i + 1).filter((n) => gcd(n, d) === 1);
      const a = pick(r, cop.slice(0, -1)); const b = pick(r, cop.filter((n) => n > a));
      const v = pickVariant(r, c, ['add', 'dec']);
      const rule = '부호는 정수 규칙대로, 숫자는 분수·소수 규칙대로.';
      if (v === 'add') {
        return ask(this.id, 'misread', fill(`{mon/이/가} (−${a}/${d}) + ${b}/${d} = −${a + b}/${d} 라고 했어요. {me/아/야}, 무엇이 틀렸을까?`, c), choices(r, `부호가 다르면 크기의 차이를 구하고 큰 쪽 부호를 따라요. ${frac(b - a, d)}`, [
          { text: '분모도 더해야 해요', tag: '오개념을 못 짚음' },
          { text: '분수에는 부호를 붙일 수 없어요', tag: '오개념을 못 짚음' },
          { text: '틀린 곳이 없어요', tag: '틀린 줄 모름' },
        ]), { solve: solve([`① 분모가 같으니 분자만: (−${a}) + ${b}`, `② −${a}에서 오른쪽으로 ${b}칸 → ${b - a}`, `③ ${frac(b - a, d)}`], { whyAny: fill(`{mon/이/가} 부호를 무시하고 크기를 더한 뒤 −를 붙였어요. 정수에서 (−${a}) + ${b}${nj(b, '을', '를')} 하듯이 해요.`, c), rule }) });
      }
      return ask(this.id, 'misread', fill(`{mon/이/가} (−0.5) × 4 = 2 라고 했어요. {me/아/야}, 무엇이 틀렸을까?`, c), choices(r, '다른 부호끼리 곱하면 −예요. −2', [
        { text: '0.5 × 4는 20이에요', tag: '오개념을 못 짚음' },
        { text: '소수는 음수가 될 수 없어요', tag: '오개념을 못 짚음' },
        { text: '틀린 곳이 없어요', tag: '틀린 줄 모름' },
      ]), { solve: solve(['① 크기: 0.5 × 4 = 2', '② 부호: −와 + 는 다른 부호 → −', '③ = −2'], { whyAny: fill('{mon/이/가} 부호를 빠뜨렸어요. −0.5를 4번 더하면 −2예요. 소수라도 부호 규칙은 정수와 같아요.', c), rule }) });
    },
    why: [
      { q: '−1/2과 −2 중 어느 것이 더 클까요?', ok: '−1/2 — 0에 더 가까우니까', no: ['−2 — 2가 1/2보다 크니까', '똑같아요 — 둘 다 음수니까', '−2 — 정수가 분수보다 크니까'], explain: { text: '수직선에 찍으면 −1/2는 0 바로 왼쪽, −2는 더 왼쪽이에요. 오른쪽이 큰 수니까 −1/2가 더 커요. 음수는 0에 가까울수록 커요 — 분수라도 똑같아요.' } },
      { q: '(−0.5) × (−4)의 답은 왜 +2인가요?', ok: '같은 부호끼리 곱하면 +니까 (소수도 규칙은 같아요)', no: ['소수를 곱하면 항상 +니까', '0.5가 1보다 작아서', '−가 두 개면 지우니까'], explain: { text: '부호 규칙은 정수와 같아요: 같은 부호끼리 곱하면 +. 크기는 0.5 × 4 = 2. 그래서 +2예요. 소수라서 달라지는 건 없어요.' } },
    ],
  },

  {
    id: 'neg.mixed', grade: 7, name: '섞인 계산과 거듭제곱', needs: ['neg.frac'],
    idea: '괄호 → 거듭제곱 → 곱셈·나눗셈 → 덧셈·뺄셈 순서. (−2)² = 4 이지만 −2² = −4 예요.',
    calc(r, c) {
      const a = int(r, 3, 9); const a3 = int(r, 2, 5); const p = int(r, 2, 6); const q = int(r, 3, 6); const s = int(r, 2, 6); // q ≥ 3: 2면 제곱과 ×2가 같은 값
      const fams = [
        { kind: 'sq', pools: { pokemon: [`(−${a})²의 값은 얼마일까요? {mon/이/가} 괄호를 잘 보라고 해요.`, ...plainFor(`(−${a})²`)] } },
        { kind: 'nosq', pools: { pokemon: [`−${a}²의 값은 얼마일까요? {mon/이/가} 괄호가 없다고 해요.`, ...plainFor(`−${a}²`)] } },
        { kind: 'cube', pools: { pokemon: [`(−${a3})³의 값은 얼마일까요? {mon/이/가} 세 번 곱하라고 해요.`, ...plainFor(`(−${a3})³`)] } },
        { kind: 'order', pools: { pokemon: [`{mon/이/가} 낸 문제: ${p} − ${q} × (−${s}). 순서를 지켜 계산하면?`, ...plainFor(`${p} − ${q} × (−${s})`)] } },
        { kind: 'addsq', pools: { pokemon: [`{mon/이/가} 낸 문제: ${p} + (−${q})². 거듭제곱 먼저!`, ...plainFor(`${p} + (−${q})²`)] } },
      ];
      const f = pickFamily(r, c, fams);
      const story = worldPick(r, c, f.pools);
      const rule = '괄호 → 거듭제곱 → 곱셈·나눗셈 → 덧셈·뺄셈. (−2)²와 −2²는 다르다.';
      if (f.kind === 'sq') {
        return ask(this.id, 'calc', fill(story, c), choices(r, num(a * a), [
          { text: num(-a * a), tag: '음수의 제곱을 음수로' },
          { text: num(-2 * a), tag: '제곱을 ×2로' },
          { text: num(2 * a), tag: '제곱을 ×2로 하고 부호도' },
        ]), { expr: `(−${a})²`, solve: solve([
          `① (−${a})²는 (−${a}) × (−${a}) — 괄호 안 전체를 두 번 곱해요`,
          `② 같은 부호끼리 → +, 크기 ${a} × ${a} = ${a * a}`,
          `③ 답: ${a * a}`,
        ], {
          why: {
            '음수의 제곱을 음수로': `(−${a}) × (−${a})는 음수 × 음수라 +예요. 괄호가 부호까지 감싸고 있어요.`,
            '제곱을 ×2로': `제곱은 2를 곱하는 게 아니라 **같은 수를 두 번 곱하는** 거예요: ${a} × ${a} = ${a * a}.`,
            '제곱을 ×2로 하고 부호도': `같은 수를 두 번: ${a} × ${a} = ${a * a}. 부호는 같은 부호끼리라 +.`,
            '계산 실수': `(−${a}) × (−${a}) = ${a * a}.`,
          },
          rule,
        }) });
      }
      if (f.kind === 'nosq') {
        return ask(this.id, 'calc', fill(story, c), choices(r, num(-a * a), [
          { text: num(a * a), tag: '괄호가 없는데 −까지 제곱' },
          { text: num(-2 * a), tag: '제곱을 ×2로' },
          { text: num(2 * a), tag: '제곱을 ×2로 하고 부호도' },
        ]), { expr: `−${a}²`, solve: solve([
          `① 괄호가 없으면 제곱은 ${a}에만 붙어요: ${a}² = ${a * a}`,
          `② −는 그대로 앞에: −(${a * a})`,
          `③ 답: −${a * a}`,
        ], {
          why: {
            '괄호가 없는데 −까지 제곱': `−${a}²는 −(${a}²)예요. (−${a})²와 달라요 — 괄호가 없으면 −는 제곱에 안 들어가요.`,
            '제곱을 ×2로': `제곱은 같은 수를 두 번 곱하는 거예요: ${a} × ${a} = ${a * a}, 앞에 −.`,
            '제곱을 ×2로 하고 부호도': `${a} × ${a} = ${a * a}, 그리고 −는 그대로 → −${a * a}.`,
            '계산 실수': `${a}² = ${a * a}, 앞의 −를 붙여 −${a * a}.`,
          },
          rule,
        }) });
      }
      if (f.kind === 'cube') {
        const cube = a3 ** 3;
        return ask(this.id, 'calc', fill(story, c), choices(r, num(-cube), [
          { text: num(cube), tag: '세제곱인데 +로' },
          { text: num(-3 * a3), tag: '세제곱을 ×3으로' },
          { text: num(3 * a3), tag: '세제곱을 ×3으로 하고 부호도' },
        ]), { expr: `(−${a3})³`, solve: solve([
          `① (−${a3})³ = (−${a3}) × (−${a3}) × (−${a3})`,
          `② 앞의 둘: (−${a3}) × (−${a3}) = ${a3 * a3} (+), 다시 × (−${a3}) → −`,
          `③ 크기 ${a3} × ${a3} × ${a3} = ${cube} → 답: −${cube}`,
        ], {
          why: {
            '세제곱인데 +로': `음수를 **홀수 번** 곱하면 −예요. 세 번이니까 −${cube}. (두 번이면 +)`,
            '세제곱을 ×3으로': `세제곱은 3을 곱하는 게 아니라 같은 수를 **세 번** 곱하는 거예요: ${a3} × ${a3} × ${a3} = ${cube}.`,
            '세제곱을 ×3으로 하고 부호도': `같은 수를 세 번: ${cube}. 음수를 세 번 곱하면 −.`,
            '계산 실수': `${a3} × ${a3} × ${a3} = ${cube}, 음수 세 번이라 −.`,
          },
          rule: '음수를 짝수 번 곱하면 +, 홀수 번 곱하면 −.',
        }) });
      }
      if (f.kind === 'order') {
        const ans = p + q * s;
        return ask(this.id, 'calc', fill(story, c), choices(r, num(ans), [
          { text: num((p - q) * -s), tag: '앞부터 계산' },
          { text: num(p - q * s), tag: '음수 곱셈 부호 틀림' },
          { text: num(-ans), tag: '답의 부호를 반대로' },
        ]), { expr: `${p} − ${q} × (−${s})`, solve: solve([
          `① 곱셈 먼저: ${q} × (−${s}) = −${q * s}`,
          `② ${p} − (−${q * s}) — 음수를 빼면 더하기: ${p} + ${q * s}`,
          `③ 답: ${ans}`,
        ], {
          why: {
            '앞부터 계산': `곱셈이 먼저예요. ${p} − ${q}${nj(q, '을', '를')} 먼저 하면 안 돼요. ${q} × (−${s})부터.`,
            '음수 곱셈 부호 틀림': `${q} × (−${s}) = −${q * s}(다른 부호 → −). 그다음 ${p} − (−${q * s}) = ${p} + ${q * s}.`,
            '답의 부호를 반대로': `${p} − (−${q * s})는 ${p} + ${q * s} = ${ans}, 양수예요.`,
            '계산 실수': `${q} × (−${s}) = −${q * s}, ${p} + ${q * s} = ${ans}.`,
          },
          rule,
        }) });
      }
      const ans = p + q * q;
      return ask(this.id, 'calc', fill(story, c), choices(r, num(ans), [
        { text: num(p - q * q), tag: '제곱의 부호를 −로' },
        { text: num((p - q) ** 2), tag: '괄호를 무시하고 앞부터' },
        { text: num(p + 2 * q), tag: '제곱을 ×2로' },
      ]), { expr: `${p} + (−${q})²`, solve: solve([
        `① 거듭제곱 먼저: (−${q})² = (−${q}) × (−${q}) = ${q * q}`,
        `② ${p} + ${q * q}`,
        `③ 답: ${ans}`,
      ], {
        why: {
          '제곱의 부호를 −로': `(−${q})²는 음수 × 음수라 +${q * q}예요.`,
          '괄호를 무시하고 앞부터': `거듭제곱이 먼저예요. ${p} + (−${q})를 먼저 하면 안 돼요.`,
          '제곱을 ×2로': `제곱은 같은 수를 두 번 곱해요: ${q} × ${q} = ${q * q}.`,
          '계산 실수': `(−${q})² = ${q * q}, ${p} + ${q * q} = ${ans}.`,
        },
        rule,
      }) });
    },
    misread(r, c) {
      // a = 2면 −a² = −4 와 오답 보기 "답은 −2a예요" = −4 가 같은 값 — 문장 보기라 값 검사가 못 잡는다 (Codex #2)
      const a = int(r, 3, 9); const p = int(r, 2, 6); const q = int(r, 2, 6); const s = int(r, 2, 6);
      const v = pickVariant(r, c, ['nosq', 'sq', 'order']);
      const rule = '괄호 → 거듭제곱 → 곱셈·나눗셈 → 덧셈·뺄셈. (−2)²와 −2²는 다르다.';
      if (v === 'nosq') {
        return ask(this.id, 'misread', fill(`{mon/이/가} −${a}² = ${a * a} 라고 했어요. {me/아/야}, 무엇이 틀렸을까?`, c), choices(r, `괄호가 없으면 ${a}만 제곱하고 −는 그대로: −${a * a}`, [
          { text: `답은 −${2 * a}예요`, tag: '오개념을 못 짚음' },
          { text: '음수는 제곱할 수 없어요', tag: '오개념을 못 짚음' },
          { text: '틀린 곳이 없어요', tag: '틀린 줄 모름' },
        ]), { solve: solve([`① −${a}² = −(${a}²)`, `② ${a}² = ${a * a}`, `③ = −${a * a}`], { whyAny: fill(`{mon/이/가} 괄호도 없는데 −까지 제곱했어요. (−${a})²라면 ${a * a}지만, −${a}²는 −${a * a}예요.`, c), rule }) });
      }
      if (v === 'sq') {
        return ask(this.id, 'misread', fill(`{mon/이/가} (−${a})² = −${a * a} 라고 했어요. {me/아/야}, 무엇이 틀렸을까?`, c), choices(r, `(−${a}) × (−${a}) = ${a * a}. 음수 × 음수는 양수예요`, [
          { text: `답은 −${2 * a}예요`, tag: '오개념을 못 짚음' },
          { text: '괄호를 빼고 계산해야 해요', tag: '오개념을 못 짚음' },
          { text: '틀린 곳이 없어요', tag: '틀린 줄 모름' },
        ]), { solve: solve([`① (−${a})² = (−${a}) × (−${a})`, '② 같은 부호끼리 → +', `③ = ${a * a}`], { whyAny: fill(`{mon/이/가} 음수의 제곱을 음수로 했어요. 괄호가 부호까지 감싸니 두 번 곱하면 +.`, c), rule }) });
      }
      return ask(this.id, 'misread', fill(`{mon/이/가} ${p} − ${q} × (−${s}) = ${num((p - q) * -s)} 라고 했어요. {me/아/야}, 무엇이 틀렸을까?`, c), choices(r, `곱셈 먼저: ${q} × (−${s}) = −${q * s}, 그다음 ${p} − (−${q * s}) = ${p + q * s}`, [
        { text: `${q} × (−${s})는 ${q * s}예요`, tag: '오개념을 못 짚음' },
        { text: `답은 ${num(p - q * s)}예요`, tag: '오개념을 못 짚음' },
        { text: '틀린 곳이 없어요', tag: '틀린 줄 모름' },
      ]), { solve: solve([`① 곱셈 먼저: ${q} × (−${s}) = −${q * s}`, `② ${p} − (−${q * s}) = ${p} + ${q * s}`, `③ = ${p + q * s}`], { whyAny: fill(`{mon/이/가} 앞에서부터 ${p} − ${q}${nj(q, '을', '를')} 먼저 했어요. 곱셈·나눗셈이 덧셈·뺄셈보다 먼저예요.`, c), rule }) });
    },
    why: [
      { q: '(−3)²와 −3²는 왜 다른가요?', ok: '괄호가 있으면 −3 전체를 두 번 곱하고(+9), 없으면 3만 제곱하고 −를 붙여요(−9)', no: ['똑같아요 — 둘 다 9', '똑같아요 — 둘 다 −9', '괄호가 있으면 2를 곱해요'], explain: { text: '(−3)²는 괄호 안 전체 −3을 두 번 곱한 것: (−3) × (−3) = 9. −3²는 괄호가 없어서 3만 제곱하고 −를 그대로 붙인 것: −(3 × 3) = −9. 괄호가 부호를 감싸는지가 차이예요.' } },
      { q: '2 − 3 × (−4)에서 무엇을 먼저 하나요?', ok: '3 × (−4) — 곱셈이 먼저', no: ['2 − 3 — 앞에서부터', '−4 — 음수가 먼저', '아무거나 — 순서는 상관없어요'], explain: { text: '순서는 괄호 → 거듭제곱 → 곱셈·나눗셈 → 덧셈·뺄셈이에요. 3 × (−4) = −12를 먼저 하고, 2 − (−12) = 2 + 12 = 14. 앞에서부터 2 − 3을 먼저 하면 답이 달라져요.' } },
    ],
  },
];

export function conceptById(id) {
  return NEGATIVE.find((c) => c.id === id) || null;
}

// ───────────────────── 문항 만들기 (mathgen과 같은 모양) ─────────────────────

/**
 * 개념 하나의 문항 한 개. mathgen.makeQuestion과 같은 인터페이스 — 화면이 줄기만 바꿔 끼운다.
 * @param {'calc'|'misread'|'why'|'special'} kind
 * @param {{names?:string[], me?:string, worlds?:Object, content?:Object, recent?:string[], want?:string|{k:string,key:string}}} [opts]
 */
export function makeQuestion(conceptId, kind, seed, opts) {
  const c = conceptById(conceptId);
  if (!c) return null;
  const r = rng(seed);
  const cast = castOf(r, opts);
  if (cast.wantKind && cast.wantKind !== kind) cast.want = '';
  if (kind === 'why' || kind === 'special') return humanQuestion(c, kind, r, cast, opts);
  const q = kind === 'misread' ? c.misread(r, cast) : c.calc(r, cast);
  return q ? { ...q, key: cast.key || (kind === 'misread' ? 'misread' : '') } : q;
}

/** 개념 한 편 = ①②③ (+ ⭐가 있으면 하나 더). 분수 줄기와 같은 씨앗 간격 */
export function makeRound(conceptId, seed, opts) {
  const out = ['calc', 'misread', 'why'].map((k, i) => makeQuestion(conceptId, k, seed + i * 7919, opts));
  const sp = makeQuestion(conceptId, 'special', seed + 3 * 7919, opts);
  if (sp) out.push(sp);
  return out.filter(Boolean);
}

/**
 * 📚 배움 — 사람이 쓴 단계식 배움에 출연진을 끼워 돌려준다 (📖 conceptStory의 자리).
 * @returns {{title:string, pages:Array<{say:string, check:null|{q:string, ok:string, no:string[], why:string}}>, rule:string}|null}
 */
export function lessonOf(conceptId, seed, opts) {
  const c = conceptById(conceptId);
  if (!c) return null;
  const cast = castOf(rng(seed), opts);
  const v = opts && opts.content && opts.content[conceptId];
  if (!v || !Array.isArray(v.lesson)) return { title: c.name, pages: [{ say: fill(c.idea, cast), check: null }], rule: c.idea };
  const pages = v.lesson.map((p) => ({
    say: fill(p.say, cast),
    check: p.check ? { q: fill(p.check.q, cast), ok: fill(p.check.ok, cast), no: p.check.no.map((t) => fill(t, cast)), why: fill(p.check.why, cast), ...(Array.isArray(p.check.walk) ? { walk: [...p.check.walk] } : {}) } : null,
  }));
  return { title: c.name, pages, rule: v.rule || c.idea };
}

/** 📏 진단 5문제 — 사다리에서 고르게 (뜻·덧셈·섞인 계산·나눗셈·거듭제곱) */
export function diagnosticSet(seed, n = 5, opts) {
  return diagnosticOf(NEGATIVE, makeQuestion, seed, n, opts);
}
export function placeFrom(answers) {
  return placeFromOf(NEGATIVE, answers);
}
export function ladder(doneIds) {
  return ladderOf(NEGATIVE, doneIds);
}

// ───────────────────── 사람이 쓴 내용 검사 ─────────────────────

/** 자리표시 `{me}` `{mon/이/가}` 가 아닌 중괄호는 잘못 쓴 것 (mathgen.checkContent와 같은 규칙) */
function badPlaceholders(txt) {
  const leak = String(txt || '').match(/\{[^}]*\}/g) || [];
  return leak.filter((l) => !/^\{(me|mon|mon2)(\/[^/}]+\/[^}]+)?\}$/.test(l));
}
/** 못 그리는 그림 지시문 — 화면에서 조용히 사라지므로 여기서 잡는다 */
function badFigures(txt) {
  const figs = String(txt || '').match(/\[[a-z]+ [^\]]+\]/g) || [];
  return figs.filter((f) => !figureSvg(f.slice(1, -1)));
}

/**
 * coach/math/negative.json 형식 검사 — 배포로 실려 가므로 check.mjs가 부른다.
 *   lesson: [{ say, check?: { q, ok, no: [1~2개], why } }, …] 3장 이상, 확인 질문 2개 이상
 *   rule:   한 줄 요약 (배움 끝과 사다리 카드에)
 *   dad:    { goal, say: [문장…], do, traps: [{ kid, dad }…], pass }
 *   why · special: 분수 줄기와 같은 형식 (mathgen.checkHuman — 정답과 **값**이 같은 오답은 부호 있는 valueOf로 잡는다)
 * @returns {string[]} 문제 목록 (비어 있으면 통과)
 */
export function checkContent(content) {
  const bad = [];
  if (!content || typeof content !== 'object') return ['내용이 객체가 아님'];
  for (const [id, v] of Object.entries(content)) {
    if (id === '_') continue;
    if (!conceptById(id)) { bad.push(`${id}: 없는 개념`); continue; }
    const lesson = v.lesson;
    if (!Array.isArray(lesson) || lesson.length < 3) { bad.push(`${id}.lesson: 3장 이상 필요`); }
    else {
      let checks = 0;
      lesson.forEach((step, i) => {
        if (!step || !step.say) bad.push(`${id}.lesson[${i}]: say 필요`);
        const c = step && step.check;
        if (c) {
          checks++;
          if (!c.q || !c.ok || !Array.isArray(c.no) || c.no.length < 1 || c.no.length > 2) bad.push(`${id}.lesson[${i}].check: q·ok·no(1~2개) 필요`);
          else if (c.no.includes(c.ok)) bad.push(`${id}.lesson[${i}].check: 오답에 정답이 있음`);
          else if (new Set(c.no).size !== c.no.length) bad.push(`${id}.lesson[${i}].check: 오답이 겹침`);
          else for (const t of c.no) if (sameValue(valueOf(c.ok), valueOf(t))) bad.push(`${id}.lesson[${i}].check: 오답 "${t}"가 정답과 같은 값`);
          if (!c.why) bad.push(`${id}.lesson[${i}].check: why(틀렸을 때 한 마디) 필요`);
          // 🚶 끌어 보기: [출발, 이동] 정수 둘, 출발 + 이동이 정답(ok)의 값과 같아야 한다 — 다르면 앱이 엉뚱한 자리를 정답으로 친다
          if (c.walk !== undefined) {
            const w = c.walk;
            if (!Array.isArray(w) || w.length !== 2 || !w.every(Number.isInteger)) bad.push(`${id}.lesson[${i}].check.walk: [출발, 이동] 정수 둘이어야 함`);
            else {
              const okV = valueOf(c.ok); // 정답이 수면 출발+이동과 같아야 한다 ("0의 왼쪽으로 2칸"처럼 말로 쓴 정답은 walk가 곧 답)
              if (okV && (okV.d !== 1 || okV.n !== w[0] + w[1])) bad.push(`${id}.lesson[${i}].check.walk: ${w[0]} + (${w[1]}) = ${w[0] + w[1]} 인데 정답은 "${c.ok}"`);
              if (Math.abs(w[0]) > 9 || Math.abs(w[0] + w[1]) > 9) bad.push(`${id}.lesson[${i}].check.walk: 수직선이 ±9를 넘음`);
            }
          }
        }
        for (const txt of [step && step.say, c && c.q, c && c.why]) {
          for (const l of badPlaceholders(txt)) bad.push(`${id}.lesson[${i}]: 잘못된 자리표시 ${l}`);
          for (const f of badFigures(txt)) bad.push(`${id}.lesson[${i}]: 못 그리는 그림 지시문 ${f}`);
        }
      });
      if (checks < 2) bad.push(`${id}.lesson: 확인 질문이 2개 이상 있어야 배움이 됨`);
    }
    if (!v.rule) bad.push(`${id}.rule: 한 줄 요약 필요`);
    const d = v.dad;
    if (!d || typeof d !== 'object') bad.push(`${id}.dad: 아빠 카드 필요`);
    else {
      if (!d.goal) bad.push(`${id}.dad.goal 필요`);
      if (!Array.isArray(d.say) || !d.say.length) bad.push(`${id}.dad.say: 말할 거리 1개 이상`);
      if (!d.do) bad.push(`${id}.dad.do: 같이 해 볼 활동 필요`);
      if (!Array.isArray(d.traps) || !d.traps.length) bad.push(`${id}.dad.traps: 헷갈리는 자리 1개 이상`);
      else d.traps.forEach((t, i) => { if (!t || !t.kid || !t.dad) bad.push(`${id}.dad.traps[${i}]: kid·dad 필요`); });
      if (!d.pass) bad.push(`${id}.dad.pass: 통과 기준 필요`);
    }
    // ③ why · ⭐ special (있을 때만) — 분수 줄기와 같은 검사, 값 읽기만 부호 있는 것으로
    if (v.why || v.special) checkHuman(id, v, bad, valueOf);
  }
  for (const c of NEGATIVE) if (!content[c.id]) bad.push(`${c.id}: 내용 없음`);
  return bad;
}
