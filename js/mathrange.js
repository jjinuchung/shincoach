// 🔢 수학 — L 수의 범위와 어림하기 줄기 (초5 2학기 1단원 「수의 범위와 어림하기」):
// 개념 사다리 + 문제 생성기 + 내용 형식 검사. 순수 함수만 — 화면 없음 (node 테스트에서 그대로 돈다).
//
// 왜 이 줄기인가 (2026-10-01, 아버님 "L로 가자"): 4-2(지금 학기)·5-1(다음 학기) 단원은 줄기가 다 있고,
// 5-2의 첫 단원이 처음으로 빈 자리다. 글자는 K 다음 L (D는 문자와 식 몫으로 비워 둠).
//
// 오답은 아이가 실제로 하는 틀린 생각 흉내다:
//   · 이상·이하인데 경계 수를 뺌 / 초과·미만인데 넣음 · 큰 쪽과 작은 쪽을 바꿈 · ●와 ○를 바꿔 읽음
//   · 범위에 드는 자연수를 셀 때 두 수의 차만 셈 / 양 끝을 모두 셈·모두 뺌
//   · 올림인데 아래를 그냥 0으로 · "~까지"를 "~에서"로 읽어 한 자리 위까지 · 올린 자리 아래를 0으로 안 바꿈 · 아래 자리를 지워 버림
//   · 반올림에서 5를 버림 · 두 번 반올림 (2449 → 2450 → 2500)
//   · 버스 대수에 버림(사람이 남는다) · 팔 수 있는 봉지에 올림(덜 찬 봉지)
//
// 새 줄기의 함정(메모 stem-generator-pitfalls)을 처음부터:
//   · 🔁 쌍둥이 틀 이름(tplKey)이 갈리지 않게 — 말(이상·이하)·자리(십·백)·묻는 것마다 **틀을 따로** 두고, 요청이 오면 그 틀로 (variant)
//   · 틀 글에서 수 뒤에 "이에요/예요"를 쓰지 않는다 (tplKey가 안 지운다) · 수 모양이 늘 같게 (소수는 늘 같은 자리 수)
//   · ② 갈래는 요청(want)을 따르고, 보기 문장이 그 예에서 우연히 맞는 말이 되지 않게
//   · 이름표는 방향까지 (경계를 넣었나 뺐나·어느 쪽으로) — 테스트가 문제 글을 직접 읽어 확인한다
//   · 아직 안 배운 말: 이상·이하(L1) → 초과·미만(L2) → 올림·어림(L6) → 버림(L7) → 반올림(L8). 앞 칸 글에 뒤 칸 말을 쓰지 않는다
//
// ★ 답은 테스트가 **따로 만든 계산기**로, 문제 글을 **직접 읽어** 다시 푼다.

import { figureSvg } from './mathdraw.js';
import { rng, shuffle, fill, castOf, worldPick, ask, solve, int, pick, pickFamily, humanQuestion, checkHuman, diagnosticOf, placeFromOf, ladderOf, numJosa } from './mathgen.js';
import { gradeLabel } from './mathmix.js';

export { gradeLabel };

// ───────────────────── 수 (0.001 단위 정수로 — 소수 셈이 어긋나지 않게) ─────────────────────

const M = 1000;
/** 0.001 단위 정수 → 글자 ("243", "3.47") */
function fmt(v) {
  const i = Math.floor(v / M);
  const f = v - i * M;
  return f ? `${i}.${String(f).padStart(3, '0').replace(/0+$/, '')}` : String(i);
}
/** 자리 이름 → 그 자리 한 칸의 크기 (0.001 단위) */
const PLACE = { 만: 10000 * M, 천: 1000 * M, 백: 100 * M, 십: 10 * M, 일: M, '소수 첫째': 100, '소수 둘째': 10 };
/** 한 자리 위 — "~까지"를 "~에서"로 읽으면 한 자리 위까지 어림하게 된다 */
const UP_PLACE = { '소수 둘째': '소수 첫째', '소수 첫째': '일', 일: '십', 십: '백', 백: '천', 천: '만' };
/** 한 자리 아래 — 반올림에서 보는 자리 */
const DOWN_PLACE = { 만: '천', 천: '백', 백: '십', 십: '일', 일: '소수 첫째', '소수 첫째': '소수 둘째', '소수 둘째': '소수 셋째' };
/** "십의 자리" · "소수 첫째 자리" */
const pName = (p) => (p.startsWith('소수') ? `${p} 자리` : `${p}의 자리`);
/** "십의 자리까지" */
const placeText = (p) => `${pName(p)}까지`;
const upTo = (v, u) => Math.ceil(v / u) * u;
const downTo = (v, u) => Math.floor(v / u) * u;
const roundTo = (v, u) => Math.floor((v + u / 2) / u) * u;
/** v의 그 자리 숫자 (u = 자리 한 칸 크기, u가 0.001보다 작으면 0) */
const digitAt = (v, u) => (u >= 1 ? Math.floor(v / u) % 10 : 0);

// ── 조사 — 수 뒤에서는 읽는 소리로. 십·백·천·만·영(0)은 받침 있음 ──
const BAT = new Set(['0', '1', '3', '6', '7', '8']);
const lastDigit = (t) => String(t).replace(/\D+$/, '').slice(-1);
/** 수 글자 + 조사 (이/가·을/를·은/는·과/와·이에요/예요…) */
function jn(t, withB, without) {
  const s = String(t);
  return s + (BAT.has(lastDigit(s)) ? withB : without);
}
/** 수 글자 + (으)로 — ㄹ받침(1·7·8) 뒤에는 '로' */
function ro(t) {
  const s = String(t);
  return s + numJosa(Number(lastDigit(s)), '으로', '로');
}
/** 범위 말 + 조사 — 이상·미만은 받침 있음, 이하·초과는 없음 */
const WB = new Set(['이상', '미만']);
const wj = (w, withB, without) => w + (WB.has(w) ? withB : without);
/** 범위 글("10 이상 15 미만")·수 글 끝 + 조사 — 끝말이 범위 말이면 그 말로, 아니면 수로 */
function endj(s, withB, without) {
  const t = String(s).trim();
  const last = t.split(/\s+/).pop();
  if (['이상', '이하', '초과', '미만'].includes(last)) return t + (WB.has(last) ? withB : without);
  return jn(t, withB, without);
}

// ───────────────────── 수의 범위 ─────────────────────

const LOWW = ['이상', '초과'];
const HIGHW = ['이하', '미만'];
/** x가 "a w"에 드는가 */
const holds = (x, a, w) => (w === '이상' ? x >= a : w === '초과' ? x > a : w === '이하' ? x <= a : x < a);
/** 경계 수를 넣고 빼는 것만 바꾼 말 (이상 ↔ 초과, 이하 ↔ 미만) */
const FLIP_EDGE = { 이상: '초과', 초과: '이상', 이하: '미만', 미만: '이하' };
/** 큰 쪽·작은 쪽만 바꾼 말 (이상 ↔ 이하, 초과 ↔ 미만) */
const FLIP_DIR = { 이상: '이하', 이하: '이상', 초과: '미만', 미만: '초과' };
const inclusive = (w) => w === '이상' || w === '이하';
const dotOf = (w) => (inclusive(w) ? '●' : '○');
/** "130 cm 이상" · "10 이상 15 미만" */
function rangeWords(a, wa, b, wb, unit = '') {
  const u = unit ? ` ${unit}` : '';
  return b === undefined ? `${a}${u} ${wa}` : `${a}${u} ${wa} ${b}${u} ${wb}`;
}
const inRange = (x, a, wa, b, wb) => holds(x, a, wa) && (b === undefined || holds(x, b, wb));

/** 경계 수를 잘못 봤을 때의 이름표 — 들어가야 하는데 뺐나, 빠져야 하는데 넣었나 */
const edgeTag = (w) => (inclusive(w) ? TAGS.edgeOut : TAGS.edgeIn);

// ───────────────────── 보기 ─────────────────────

/** 보기 글자 → 값 (겹침 검사용). 수 하나일 때만 — 목록·말·범위 보기는 null */
export function valueOf(text) {
  const s = String(text == null ? '' : text).trim();
  return /^\d+(\.\d+)?$/.test(s) ? Number(s) : null;
}
const sameValue = (a, b) => a !== null && b !== null && Math.abs(a - b) < 1e-9;

/** 정답 근처의 "계산 실수" — 보기가 모자랄 때만. 소수 답은 마지막 자리 한 칸씩 */
function nearOf(answer, k, step = 0) {
  const s = String(answer);
  const dec = Math.max((s.split('.')[1] || '').length, step ? (String(step).split('.')[1] || '').length : 0);
  const unit = step || 10 ** -dec;
  const st = [1, -1, 2, -2, 3, -3, 5, -5][k % 8];
  const v = Math.round((Number(s) + st * unit) * 10 ** dec) / 10 ** dec;
  return v > 0 ? v.toFixed(dec) : '';
}
/** 수 보기 4개 — 정답 + 오개념 오답. 글자·값이 같은 보기는 넣지 않는다 */
function choices(r, answer, wrongs, step = 0) {
  const list = [{ text: String(answer), ok: true }];
  const vals = [valueOf(answer)];
  const seen = new Set([String(answer)]);
  const dup = (t) => { const v = valueOf(t); return seen.has(String(t)) || (v !== null && vals.some((x) => sameValue(x, v))); };
  const add = (t, tag) => { seen.add(String(t)); vals.push(valueOf(t)); list.push({ text: String(t), ok: false, tag }); };
  for (const w of wrongs) {
    if (!w || w.text === undefined || w.text === '' || dup(w.text) || list.length >= 4) continue;
    add(w.text, w.tag);
  }
  for (let k = 0; list.length < 4 && k < 30; k++) {
    const alt = nearOf(answer, k, step);
    if (alt && !dup(alt)) add(alt, '계산 실수');
  }
  return shuffle(r, list);
}
/** 목록·말·범위 보기 — 근처 수로 채우지 않는다 (채운 것이 또 맞는 답이 될 수 있다) */
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

/** ② 갈래 고르기 — 🔁 쌍둥이·🤔 오답 노트가 요청한 갈래를 먼저 (mathfac·mathdec와 같은 규칙) */
function branchOf(r, c, names) {
  const want = c && c.want && c.want.startsWith('misread:') ? c.want.slice(8) : '';
  if (names.includes(want)) return want;
  const fresh = names.filter((n) => !(c && c.recent && c.recent.includes(`misread:${n}`)));
  return pick(r, fresh.length ? fresh : names);
}
function misreadAsk(id, branch, q, chs, o) {
  return { ...ask(id, 'misread', q, chs, o), key: `misread:${branch}` };
}
const showWork = (line, verb = '말했어요') => `{mon/이/가} 이렇게 ${verb}.\n\n**${line}**\n\n어디가 틀렸을까요?`;
const step = (no, text) => `${['①', '②', '③', '④'][no] || '·'} ${text}`;

const RIGHT_AS_WRONG = '틀린 줄 모름';
const OFF = '엉뚱한 지적';

/** 이 줄기의 오개념 이름표 (📊·🤔 노트·결과 카드에 그대로 뜬다 — 아직 안 배운 말을 쓰지 않는다) */
export const TAGS = {
  edgeOut: '경계 수를 뺌',                  // 이상·이하인데 그 수를 뺐다
  edgeIn: '경계 수를 넣음',                 // 초과·미만인데 그 수를 넣었다
  dirSwap: '큰 쪽과 작은 쪽을 바꿈',        // 이상 ↔ 이하, 초과 ↔ 미만
  dirEdge: '큰 쪽·작은 쪽과 경계를 다 바꿈',
  edgeBoth: '양 끝 경계를 모두 잘못 봄',
  dotSwap: '●와 ○를 바꿔 봄',
  subOnly: '두 수의 차만 셈',
  bothIn: '양 끝을 모두 셈',
  bothOut: '양 끝을 모두 뺌',
  misTable: '표를 잘못 읽음',
  downForUp: '아래 자리를 올리지 않음',     // 올림인데 아래를 그냥 0으로 (L6 — "버림"은 아직 안 배운 말)
  upForDown: '버리지 않고 올림',            // 버림인데 올림
  wrongPlace: '한 자리 위까지 어림함',      // "~까지"를 "~에서"로
  lowPlace: '한 자리 아래까지 어림함',      // 천의 자리까지인데 백의 자리까지
  noZero: '올린 자리 아래를 0으로 안 바꿈',
  carryMiss: '받아올림을 빠뜨림',           // 2960 → 2000 (9 + 1 = 10에서 윗자리로 1을 안 올림) — Codex 21차 #8
  zeroUp: '아래가 모두 0인데도 올림',       // 4300을 올림하여 백의 자리까지 → 4400 (그대로 4300)
  dropDigits: '아래 자리를 지워 버림',      // 247 → 24
  roundUpWrong: '버려야 하는데 올림',       // 반올림: 바로 아래가 0~4
  roundDownWrong: '올려야 하는데 버림',     // 반올림: 바로 아래가 6~9
  fiveDown: '5를 버림',
  doubleRound: '두 번 반올림함',
  useDown: '모자라는데 버림',               // 버스 대수 — 남은 사람이 못 탄다
  useUp: '남는데 올림',                     // 팔 수 있는 봉지 — 덜 찬 봉지
  wrongMethod: '알맞은 어림 방법을 모름',
  revSame: '어림한 수를 그대로 씀',
  revMode: '올림·버림의 범위로 봄',
};

// ───────────────────── 가족·틀 (variant) ─────────────────────
// 가족 하나 = 틀 여러 개(말·자리·묻는 것마다 하나). 틀마다 그 틀에 맞는 수를 미리 뽑아 둔다 —
// 🔁 쌍둥이·🤔 노트가 요청한 틀(c.want = tplKey)이 오면 그 틀이 그대로 골라진다.

function famOf(variants) {
  return { variants, pools: { pokemon: variants.map((x) => x.t) } };
}
function runFamily(r, c, fams) {
  const f = pickFamily(r, c, fams);
  const t = worldPick(r, c, f.pools);
  return f.variants.find((x) => x.t === t) || f.variants[0];
}
/** 고른 틀로 ① 문항 만들기 — v: { t, ans, wr, steps, why, rule, text(목록·말 보기), probe } */
function calcAsk(r, c, concept, v) {
  const chs = v.text ? textChoices(r, v.ans, v.wr) : choices(r, v.ans, v.wr, v.step || 0);
  return {
    ...ask(concept.id, 'calc', fill(v.t, c), chs, {
      solve: solve(v.steps.map((s, i) => step(i, s)), { why: v.why || {}, whyAny: v.whyAny || '', rule: v.rule || concept.rule }),
    }),
    probe: v.probe || null,
  };
}

/** N을 넣고 N보다 작은 수 below개·큰 수 above개 (9칸 안에서) — 섞어서 */
function aroundSet(r, N, below, above) {
  const lows = shuffle(r, Array.from({ length: 9 }, (_, i) => N - 1 - i)).slice(0, below);
  const highs = shuffle(r, Array.from({ length: 9 }, (_, i) => N + 1 + i)).slice(0, above);
  return shuffle(r, [...lows, N, ...highs]);
}
const L = (arr) => arr.join(', ');
const LABELS = ['㉠', '㉡', '㉢', '㉣'];

// ── L1·L2 공통: 한쪽 범위 (이상·이하·초과·미만) ──
function oneSide(r, c, concept, words) {
  const fams = [];
  // 목록에서 모두 고르기
  fams.push(famOf(words.map((W) => {
    const N = int(r, 12, 40);
    const below = int(r, 2, 3);
    const S = aroundSet(r, N, below, 5 - below); // 늘 6개 — 개수가 틀 이름(tplKey)에 든다
    const pick2 = (w) => S.filter((x) => holds(x, N, w));
    const ans = pick2(W);
    return {
      t: `다음 수 중에서 ${N} ${W}인 수를 모두 고르면 어느 것일까요?\n\n**${L(S)}**`,
      text: true, ans: L(ans),
      wr: [
        { text: L(pick2(FLIP_EDGE[W])), tag: edgeTag(W) },
        { text: L(pick2(FLIP_DIR[W])), tag: TAGS.dirSwap },
        { text: L(pick2(FLIP_DIR[FLIP_EDGE[W]])), tag: TAGS.dirEdge },
      ],
      steps: [`${N} ${W}: ${meaning(N, W)}`, `${L(S)} 중에서 → ${L(ans)}`],
      why: whyOneSide(N, W),
      probe: { range: [N, W], list: S },
    };
  })));
  // 몇 개 — 경계를 잘못 본 수·반대쪽 수가 정답과 겹치지 않게 아래·위 개수를 고른다
  fams.push(famOf(words.map((W) => {
    const N = int(r, 12, 40);
    // 6개 = 아래 b + N + 위 (5 − b). 세 값(정답·경계 잘못·반대쪽)이 다 다른 b만
    const okB = [1, 2, 3, 4].filter((b) => {
      const S0 = [...Array(b).fill(N - 1), N, ...Array(5 - b).fill(N + 1)];
      const n = (w) => S0.filter((x) => holds(x, N, w)).length;
      return new Set([n(W), n(FLIP_EDGE[W]), n(FLIP_DIR[W])]).size === 3;
    });
    const b = pick(r, okB);
    const S = aroundSet(r, N, b, 5 - b);
    const n = (w) => S.filter((x) => holds(x, N, w)).length;
    const ans = n(W);
    return {
      t: `다음 수 중에서 ${N} ${W}인 수는 모두 몇 개일까요?\n\n**${L(S)}**`,
      ans: String(ans),
      wr: [{ text: String(n(FLIP_EDGE[W])), tag: edgeTag(W) }, { text: String(n(FLIP_DIR[W])), tag: TAGS.dirSwap }],
      steps: [`${N} ${W}: ${meaning(N, W)}`, `${L(S.filter((x) => holds(x, N, W)))} → ${ans}개`],
      why: whyOneSide(N, W),
      probe: { range: [N, W], list: S, count: true },
    };
  })));
  // 가장 작은·큰 자연수 — 경계에 서는 수
  fams.push(famOf(words.map((W) => {
    const N = int(r, 12, 60);
    const small = W === '이상' || W === '초과';
    const ans = W === '이상' || W === '이하' ? N : small ? N + 1 : N - 1;
    const wrong = W === '이상' ? N + 1 : W === '이하' ? N - 1 : N;
    return {
      t: `${N} ${W}인 자연수 중에서 가장 ${small ? '작은' : '큰'} 수는 얼마일까요?`,
      ans: String(ans),
      wr: [{ text: String(wrong), tag: edgeTag(W) }],
      steps: [`${N} ${W}: ${meaning(N, W)}`, `그중 가장 ${small ? '작은' : '큰'} 자연수 → ${ans}`],
      why: whyOneSide(N, W),
      probe: { range: [N, W], extreme: small ? 'min' : 'max' },
    };
  })));
  // 생활 — 기호 ㉠~㉣로 고르기 (이름을 지어내지 않는다)
  fams.push(famOf(words.map((W) => storyOneSide(r, W))));
  return calcAsk(r, c, concept, runFamily(r, c, fams));
}
/** "N과 같거나 큰 수 (N도 들어가요)" */
function meaning(N, W) {
  return {
    이상: `${jn(N, '과', '와')} 같거나 큰 수 (${N}도 들어가요)`,
    이하: `${jn(N, '과', '와')} 같거나 작은 수 (${N}도 들어가요)`,
    초과: `${N}보다 큰 수 (${jn(N, '은', '는')} 안 들어가요)`,
    미만: `${N}보다 작은 수 (${jn(N, '은', '는')} 안 들어가요)`,
  }[W];
}
function whyOneSide(N, W) {
  const inc = inclusive(W);
  return {
    [TAGS.edgeOut]: `${N} ${W}에는 ${N}도 들어가요 — ${wj(W, '은', '는')} ${jn(N, '과', '와')} 같은 수까지예요.`,
    [TAGS.edgeIn]: `${N} ${W}에는 ${jn(N, '이', '가')} 들어가지 않아요 — ${wj(W, '은', '는')} ${jn(N, '을', '를')} 빼요.`,
    [TAGS.dirSwap]: `${wj(W, '은', '는')} ${N}보다 ${W === '이상' || W === '초과' ? '큰' : '작은'} 쪽이에요. 반대쪽을 골랐어요.`,
    [TAGS.dirEdge]: `${wj(W, '은', '는')} ${N}보다 ${W === '이상' || W === '초과' ? '큰' : '작은'} 쪽이고, ${jn(N, '은', '는')} ${inc ? '들어가요' : '안 들어가요'}.`,
  };
}
function storyOneSide(r, W) {
  // 이상: 놀이기구 키 · 이하: 놀이방 키 · 초과: 택배 무게 · 미만: 수영장 나이
  const kind = { 이상: 'ride', 이하: 'room', 초과: 'box', 미만: 'pool' }[W];
  const unit = kind === 'box' ? 'kg' : kind === 'pool' ? '살' : 'cm';
  const N = kind === 'box' ? int(r, 8, 20) : kind === 'pool' ? int(r, 9, 13) : int(r, 125, 145);
  const b = int(r, 1, 2);
  const lows = shuffle(r, Array.from({ length: 6 }, (_, i) => N - 1 - i).filter((x) => x >= 2)).slice(0, b); // 0 kg·음수 무게가 나오지 않게
  const highs = shuffle(r, Array.from({ length: 6 }, (_, i) => N + 1 + i)).slice(0, 3 - b);
  const vals = shuffle(r, [...lows, N, ...highs]);
  const items = vals.map((x, i) => `${LABELS[i]} ${x}${unit === '살' ? '' : ' '}${unit}`).join(' · ');
  const who = (w) => vals.map((x, i) => (holds(x, N, w) ? LABELS[i] : null)).filter(Boolean);
  const head = {
    ride: `어린이 놀이기구는 키가 ${N} cm 이상인 사람만 탈 수 있어요. 탈 수 있는 사람을 모두 고르면 어느 것일까요?`,
    room: `키즈 놀이방은 키가 ${N} cm 이하인 어린이만 들어갈 수 있어요. 들어갈 수 있는 어린이를 모두 고르면 어느 것일까요?`,
    box: `택배는 무게가 ${N} kg 초과이면 요금을 더 내요. 요금을 더 내는 상자를 모두 고르면 어느 것일까요?`,
    pool: `어린이 수영장은 나이가 ${N}살 미만인 어린이만 들어갈 수 있어요. 들어갈 수 있는 어린이를 모두 고르면 어느 것일까요?`,
  }[kind];
  const wrongList = (w) => who(w);
  const wr = [
    { text: L(wrongList(FLIP_EDGE[W])), tag: edgeTag(W) },
    { text: L(wrongList(FLIP_DIR[W])), tag: TAGS.dirSwap },
  ].filter((x) => x.text);
  const ans = who(W);
  const u = unit === '살' ? '살' : ` ${unit}`;
  const big = W === '이상' || W === '초과';
  // 단위 뒤 조사는 단위마다 달라(cm는·kg은) — "~인"·"~도"·"~보다"처럼 안 바뀌는 말만 쓴다
  return {
    t: `${head}\n\n**${items}**`,
    text: true, ans: L(ans), wr,
    steps: [`${N}${u} ${W}: 딱 ${N}${u}인 것${inclusive(W) ? '도 들어가요' : '은 빼요'}`, `${N}${u}보다 ${big ? '큰' : '작은'} 쪽 → ${L(ans)}`],
    why: {
      [TAGS.edgeOut]: `${N}${u} ${W}에는 딱 ${N}${u}인 것도 들어가요.`,
      [TAGS.edgeIn]: `${N}${u} ${W}에는 딱 ${N}${u}인 것은 안 들어가요.`,
      [TAGS.dirSwap]: `${wj(W, '은', '는')} ${N}${u}보다 ${big ? '큰' : '작은'} 쪽이에요. 반대쪽을 골랐어요.`,
    },
    probe: { range: [N, W], labelled: vals },
  };
}

// ───────────────────── 반올림·올림·버림 ─────────────────────

const MODE = {
  up: { word: '올림', f: upTo },
  down: { word: '버림', f: downTo },
  round: { word: '반올림', f: roundTo },
};
/** 자연수 고르기 — 그 자리 아래가 0이 아니고, 그 자리 숫자가 0·9가 아닌 수 (올림이 윗자리로 넘어가거나, 자리를 잘못 봐도 같은 값이 되지 않게) */
function pickNat(r, p, ok = () => true) {
  const u = PLACE[p];
  const digits = p === '십' ? 3 : 4;
  for (let t = 0; t < 400; t++) {
    const v = int(r, 10 ** (digits - 1) + 1, 10 ** digits - 1) * M;
    const d = digitAt(v, u);
    if (v % u === 0 || d === 0 || d === 9 || !ok(v, u)) continue;
    return v;
  }
  return null;
}
/**
 * 소수 고르기 — 일의 자리까지: 두 자리 소수 11.xx~29.xx / 소수 첫째 자리까지: x.yz / 둘째 자리까지: x.yzw.
 * 어림한 결과의 그 자리 숫자가 0이 아니게(3.0처럼 쓰지 않게) — 끝자리는 0이 아니다(소수 자리 수가 늘 같게)
 */
function pickDec(r, p, ok = () => true) {
  const u = PLACE[p];
  const dec = p === '소수 둘째' ? 3 : 2;
  for (let t = 0; t < 400; t++) {
    const a = p === '일' ? int(r, 11, 28) : int(r, 1, 9);
    const frac = int(r, 1, 10 ** dec - 1);
    if (frac % 10 === 0) continue; // 끝자리 0 금지 (3.40처럼 보이면 자리 수가 갈린다)
    const v = a * M + frac * (M / 10 ** dec);
    const d = digitAt(v, u);
    if (v % u === 0 || d === 0 || d === 9 || !ok(v, u)) continue;
    // 어림 결과의 그 자리 숫자가 0이 되면 다시 (올림·버림·반올림 어느 쪽이든)
    if ([upTo, downTo, roundTo].some((f) => digitAt(f(v, u), u) === 0)) continue;
    return v;
  }
  return null;
}

/**
 * 경계 경우 (Codex 21차 #8 — 위의 두 고르기는 그 자리 숫자 9와 "이미 딱 떨어진 수"를 일부러 뺀다):
 *   받아올림이 이어지는 수 — 그 자리 숫자가 9 (2960 → 3000, 397 → 400, 997 → 1000). 반올림이면 바로 아래가 5 이상
 */
function pickCarry(r, p, mode) {
  const u = PLACE[p];
  const digits = p === '십' ? 3 : 4;
  for (let t = 0; t < 400; t++) {
    const v = int(r, 10 ** (digits - 1) + 1, 10 ** digits - 1) * M;
    if (digitAt(v, u) !== 9 || v % u === 0) continue;
    if (mode === 'round' && digitAt(v, u / 10) < 5) continue;
    return v;
  }
  return null;
}
/** 이미 그 자리까지 딱 떨어진 수 (4300 — 백의 자리 아래가 모두 0) — 올림해도 그대로 */
function pickExact(r, p) {
  const u = PLACE[p];
  for (let t = 0; t < 400; t++) {
    const k = int(r, 11, 99);
    if (k % 10 === 0) continue; // 한 자리 위까지도 딱 떨어지면(4000) "백의 자리까지"가 뜻이 없어진다
    return k * u;
  }
  return 43 * u;
}
/** 경계 경우 이야기 틀 — 틀 글이 다른 틀과 겹치지 않게(쌍둥이가 보통 문제로 빠지지 않게) 이야기마다 하나 */
function boundaryStories(r, mode) {
  const out = [];
  const carry = (v, p, md, t) => {
    const parts = roundParts(v, p, md);
    const u = PLACE[p];
    const ans = MODE[md].f(v, u);
    const miss = downTo(v, PLACE[UP_PLACE[p]]);
    const nd = digitAt(v, u / 10);
    return {
      t, ...parts,
      wr: [{ text: fmt(miss), tag: TAGS.carryMiss }, ...parts.wr],
      why: { ...parts.why, [TAGS.carryMiss]: `${pName(p)} 숫자 9에 1을 더하면 10이에요. 0을 쓰고 윗자리로 1을 올려야 해요 → ${fmt(ans)}.` },
      steps: md === 'up'
        ? [`${pName(p)} 아래에 0이 아닌 수가 있어요 → ${pName(p)} 숫자 9를 1 크게 하면 10`, `10이 되면 0을 쓰고 윗자리로 1을 올려요 → ${fmt(ans)}`]
        : [`${pName(p)} 바로 아래 숫자를 봐요: ${nd} → 올려요`, `${pName(p)} 숫자 9가 10이 되어 0을 쓰고 윗자리로 1을 올려요 → ${fmt(ans)}`],
      probe: { round: [fmt(v), md, p] },
    };
  };
  if (mode === 'up') {
    const v1 = pickCarry(r, '백', 'up'); const v2 = pickCarry(r, '십', 'up'); const v3 = pickExact(r, '백');
    out.push(carry(v1, '백', 'up', `학용품값 ${v1 / M}원을 100원짜리 동전으로만 내려고 해요. 적어도 얼마를 내야 할까요?`));
    out.push(carry(v2, '십', 'up', `연필 ${v2 / M}자루를 10자루씩 묶음으로 사려고 해요. 적어도 몇 자루를 사야 할까요?`));
    const parts = roundParts(v3, '백', 'up');
    out.push({
      t: `준비물값 ${v3 / M}원을 100원짜리 동전으로만 내려고 해요. 적어도 얼마를 내야 할까요?`,
      ...parts,
      // 아래가 모두 0 — "올림이니 무조건 하나 올린다"(4400)가 이 칸의 오개념이다. 같은 값의 "올린 자리 아래를 0으로 안 바꿈"은 뺀다
      wr: [{ text: fmt(v3 + PLACE['백']), tag: TAGS.zeroUp }, ...parts.wr.filter((w) => w.tag !== TAGS.noZero)],
      why: { ...parts.why, [TAGS.zeroUp]: `백의 자리보다 아래가 모두 0이면 올릴 것이 없어요. 올림해도 그대로 → ${fmt(v3)}.` },
      steps: ['백의 자리보다 아래 자리가 모두 0이에요', `올릴 것이 없어서 그대로 → ${fmt(v3)}`],
      probe: { round: [fmt(v3), 'up', '백'] },
    });
  } else if (mode === 'round') {
    const v1 = pickCarry(r, '십', 'round'); const v2 = pickCarry(r, '백', 'round');
    out.push(carry(v1, '십', 'round', `줄넘기를 ${v1 / M}번 했어요. 반올림하여 십의 자리까지 나타내면 몇 번일까요?`));
    out.push(carry(v2, '백', 'round', `도서관 책이 ${v2 / M}권이에요. 반올림하여 백의 자리까지 나타내면 몇 권일까요?`));
  }
  return out;
}

/** 올림·버림·반올림 한 문항의 정답·오답·풀이 */
function roundParts(v, p, mode) {
  const u = PLACE[p];
  const f = MODE[mode].f;
  const ans = f(v, u);
  const nd = digitAt(v, u / 10 >= 1 ? u / 10 : 0);
  const wr = [];
  const why = {};
  const wp = f(v, PLACE[UP_PLACE[p]]);
  const wpOk = wp !== ans && wp > 0;
  // 한 자리 아래까지 — 그 자리 수가 남아 있어야(어림한 값이 원래 수와 다를 때만) 보기가 된다
  const lp = PLACE[DOWN_PLACE[p]] ? f(v, PLACE[DOWN_PLACE[p]]) : null;
  const lpOk = lp !== null && lp !== v && lp !== ans;
  if (mode === 'up') {
    wr.push({ text: fmt(downTo(v, u)), tag: TAGS.downForUp });
    if (wpOk) wr.push({ text: fmt(wp), tag: TAGS.wrongPlace });
    if (u >= 10 * M) wr.push({ text: fmt(v + u), tag: TAGS.noZero });
    why[TAGS.downForUp] = `${jn(fmt(downTo(v, u)), '은', '는')} ${pName(p)} 아래를 그냥 0으로 만든 수예요. 올림은 아래에 0이 아닌 수가 있으면 ${pName(p)} 숫자를 1 크게 해요 → ${fmt(ans)}.`;
    why[TAGS.noZero] = `${pName(p)} 숫자를 1 크게 한 뒤에는 그 아래 자리를 모두 0으로 써요 → ${fmt(ans)}.`;
  } else if (mode === 'down') {
    wr.push({ text: fmt(upTo(v, u)), tag: TAGS.upForDown });
    if (wpOk) wr.push({ text: fmt(wp), tag: TAGS.wrongPlace });
    if (u >= 10 * M) wr.push({ text: String(Math.floor(v / u)), tag: TAGS.dropDigits });
    why[TAGS.upForDown] = `${jn(fmt(upTo(v, u)), '은', '는')} 올림한 수예요. 버림은 ${pName(p)} 아래를 모두 0으로 해요 → ${fmt(ans)}.`;
    why[TAGS.dropDigits] = `아래 자리를 지우면 수가 아주 작아져요(${Math.floor(v / u)}). 지운 자리에는 0을 써요 → ${fmt(ans)}.`;
  } else {
    const upV = upTo(v, u); const dnV = downTo(v, u);
    if (nd >= 5) wr.push({ text: fmt(dnV), tag: nd === 5 ? TAGS.fiveDown : TAGS.roundDownWrong });
    else wr.push({ text: fmt(upV), tag: TAGS.roundUpWrong });
    const dbl = roundTo(roundTo(v, u / 10), u);
    if (u / 10 >= 10 && dbl !== ans) wr.push({ text: fmt(dbl), tag: TAGS.doubleRound });
    if (wpOk) wr.push({ text: fmt(wp), tag: TAGS.wrongPlace });
    why[TAGS.roundUpWrong] = `${pName(p)} 바로 아래 숫자가 ${jn(nd, '이라서', '라서')}(0~4) 버려요 → ${fmt(ans)}.`;
    why[TAGS.roundDownWrong] = `${pName(p)} 바로 아래 숫자가 ${jn(nd, '이라서', '라서')}(5~9) 올려요 → ${fmt(ans)}.`;
    why[TAGS.fiveDown] = `5는 올려요 — 0, 1, 2, 3, 4는 버리고 5, 6, 7, 8, 9는 올려요 → ${fmt(ans)}.`;
    why[TAGS.doubleRound] = `${pName(p)} 바로 아래 숫자(${nd})만 봐요. 그 아래부터 먼저 반올림하면 안 돼요 → ${fmt(ans)}.`;
  }
  if (lpOk) wr.push({ text: fmt(lp), tag: TAGS.lowPlace });
  why[TAGS.wrongPlace] = `${jn(fmt(wp), '은', '는')} ${placeText(UP_PLACE[p])} 나타낸 수예요. ${placeText(p)}니까 → ${fmt(ans)}.`;
  if (lpOk) why[TAGS.lowPlace] = `${jn(fmt(lp), '은', '는')} ${placeText(DOWN_PLACE[p])} 나타낸 수예요. ${placeText(p)}니까 → ${fmt(ans)}.`;
  const steps = mode === 'up'
    ? [`${pName(p)}보다 아래에 0이 아닌 수가 있으면 ${pName(p)} 숫자를 1 크게 하고, 아래는 모두 0`, `${fmt(v)} → ${fmt(ans)}`]
    : mode === 'down'
      ? [`${pName(p)}보다 아래 자리 수를 모두 0으로`, `${fmt(v)} → ${fmt(ans)}`]
      : [`${pName(p)} 바로 아래 숫자를 봐요: ${nd}`, `${nd >= 5 ? '5, 6, 7, 8, 9라서 올려요' : '0, 1, 2, 3, 4라서 버려요'} → ${fmt(ans)}`];
  return { ans: fmt(ans), wr, why, steps, step: u / M };
}

/** 올림·버림·반올림 칸의 ① — 자연수(십·백·천) · 소수(일·첫째·둘째) · 생활 */
function roundCalc(r, c, concept, mode) {
  const W = MODE[mode].word;
  const fams = [];
  // 반올림은 5·두 번 반올림 함정을 자주 — 바로 아래 숫자를 정해서 뽑는다
  const roundOk = (want) => (v, u) => {
    const nd = digitAt(v, u / 10 >= 1 ? u / 10 : 0);
    if (want === 'five') return nd === 5;
    if (want === 'double') return nd === 4 && u / 100 >= 1 && digitAt(v, u / 100) >= 5;
    return true;
  };
  const flavor = mode === 'round' ? pick(r, ['five', 'double', 'any', 'any']) : 'any';
  fams.push(famOf(['십', '백', '천'].map((p) => {
    const v = pickNat(r, p, mode === 'round' ? roundOk(p === '십' && flavor === 'double' ? 'any' : flavor) : undefined) || pickNat(r, p);
    const parts = roundParts(v, p, mode);
    return { t: `${jn(fmt(v), '을', '를')} ${W}하여 ${placeText(p)} 나타내면 얼마일까요?`, ...parts, probe: { round: [fmt(v), mode, p] } };
  })));
  fams.push(famOf(['일', '소수 첫째', '소수 둘째'].map((p) => {
    const v = pickDec(r, p, mode === 'round' ? roundOk(flavor === 'double' && p === '소수 둘째' ? 'any' : flavor) : undefined) || pickDec(r, p);
    const parts = roundParts(v, p, mode);
    return { t: `${jn(fmt(v), '을', '를')} ${W}하여 ${placeText(p)} 나타내면 얼마일까요?`, ...parts, probe: { round: [fmt(v), mode, p] } };
  })));
  fams.push(famOf(roundStories(r, mode)));
  // 경계 경우 — 이어지는 받아올림(올림·반올림)·이미 딱 떨어진 수(올림). 버림은 받아올림이 없고, 결과가 0인 문제는 아이에게 어색해 뺀다
  if (mode !== 'down') fams.push(famOf(boundaryStories(r, mode)));
  return calcAsk(r, c, concept, runFamily(r, c, fams));
}
/** 생활 속 올림·버림·반올림 — 이야기 틀마다 자리가 정해져 있다 */
function roundStories(r, mode) {
  const out = [];
  if (mode === 'up') {
    const v1 = pickNat(r, '천'); const v2 = pickNat(r, '백');
    out.push({ t: `물건값 ${v1 / M}원을 1000원짜리 지폐로만 내려고 해요. 적어도 얼마를 내야 할까요?`, ...roundParts(v1, '천', 'up'), probe: { round: [fmt(v1), 'up', '천'] } });
    out.push({ t: `과자값 ${v2 / M}원을 100원짜리 동전으로만 내려고 해요. 적어도 얼마를 내야 할까요?`, ...roundParts(v2, '백', 'up'), probe: { round: [fmt(v2), 'up', '백'] } });
  } else if (mode === 'down') {
    const v1 = pickNat(r, '천'); const v2 = pickNat(r, '십');
    out.push({ t: `동전 ${v1 / M}원을 1000원짜리 지폐로 바꾸려고 해요. 지폐로 바꿀 수 있는 돈은 최대 얼마일까요?`, ...roundParts(v1, '천', 'down'), probe: { round: [fmt(v1), 'down', '천'] } });
    out.push({ t: `귤 ${v2 / M}개를 한 상자에 10개씩 담아 팔려고 해요. 상자에 담아 팔 수 있는 귤은 최대 몇 개일까요?`, ...roundParts(v2, '십', 'down'), probe: { round: [fmt(v2), 'down', '십'] } });
  } else {
    for (const p of ['백', '천']) {
      const v = pickNat(r, p);
      out.push({ t: `어느 영화관에 온 관객은 ${v / M}명이에요. 관객 수를 반올림하여 ${placeText(p)} 나타내면 몇 명일까요?`, ...roundParts(v, p, 'round'), probe: { round: [fmt(v), 'round', p] } });
    }
  }
  return out;
}

// ───────────────────── 개념 사다리 (L. 수의 범위와 어림하기 줄기) ─────────────────────

export const RANGE = [
  {
    id: 'rng.above', grade: 5, name: '이상과 이하', needs: [],
    idea: '**10 이상**인 수는 10과 같거나 큰 수, **10 이하**인 수는 10과 같거나 작은 수예요. 둘 다 **10도 들어가요** — 수직선에는 속이 찬 점 ●으로 나타내요.',
    rule: '이상·이하는 그 수도 들어간다 (●).',
    slip: '경계에 있는 수가 들어가는지부터 봐요 — 이상·이하는 들어가요.',
    calc(r, c) { return oneSide(r, c, this, ['이상', '이하']); },
    misread(r, c) {
      const N = int(r, 12, 40);
      if (branchOf(r, c, ['edge', 'dir']) === 'edge') {
        const W = pick(r, ['이상', '이하']);
        const q = showWork(`${N} ${W}인 수에 ${jn(N, '은', '는')} 들어가지 않아요`);
        const chs = textChoices(r, `${N}도 들어가요 — ${N} ${wj(W, '은', '는')} ${jn(N, '과', '와')} 같거나 ${W === '이상' ? '큰' : '작은'} 수예요`, [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `${N} ${wj(W, '은', '는')} ${N}보다 ${W === '이상' ? '작은' : '큰'} 수예요`, tag: TAGS.dirSwap },
          { text: `${N} ${W}인 수는 ${N}부터 ${N + 9}까지 10개뿐이에요`, tag: OFF },
        ]);
        return {
          ...misreadAsk(this.id, 'edge', fill(q, c), chs, {
            solve: solve([step(0, `${N} ${W} = ${meaning(N, W)}`), step(1, `${jn(N, '은', '는')} 들어가요 (수직선에 ●)`)], {
              whyAny: `${W}에는 경계에 있는 ${N}도 들어가요.`,
              rule: '이상·이하는 그 수도 들어간다.',
            }),
          }),
          probe: { claim: [N, W, 'excludes'] },
        };
      }
      const W = pick(r, ['이상', '이하']);
      const wrongSeq = W === '이상' ? [N, N - 1, N - 2] : [N, N + 1, N + 2];
      const okSeq = W === '이상' ? [N, N + 1, N + 2] : [N, N - 1, N - 2];
      const q = showWork(`${N} ${W}인 수는 ${L(wrongSeq)}, …${'이에요'}`);
      const chs = textChoices(r, `${N} ${wj(W, '은', '는')} ${N}보다 ${W === '이상' ? '큰' : '작은'} 쪽이에요 — ${L(okSeq)}, …`, [
        { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
        { text: `${jn(N, '은', '는')} 빼야 해요 — ${L(W === '이상' ? [N + 1, N + 2, N + 3] : [N - 1, N - 2, N - 3])}, …`, tag: TAGS.edgeOut },
        { text: `${N} ${W}인 수는 하나도 없어요`, tag: OFF },
      ]);
      return {
        ...misreadAsk(this.id, 'dir', fill(q, c), chs, {
          solve: solve([step(0, `${N} ${W} = ${meaning(N, W)}`), step(1, `${L(okSeq)}, …`)], {
            whyAny: `${wj(W, '은', '는')} ${N}보다 ${W === '이상' ? '큰' : '작은'} 쪽이에요. 반대쪽으로 갔어요.`,
            rule: '이상은 큰 쪽, 이하는 작은 쪽.',
          }),
        }),
        probe: { seq: [N, W, wrongSeq] },
      };
    },
  },

  {
    id: 'rng.over', grade: 5, name: '초과와 미만', needs: ['rng.above'],
    idea: '**10 초과**인 수는 10보다 큰 수, **10 미만**인 수는 10보다 작은 수예요. 둘 다 **10은 안 들어가요** — 수직선에는 속이 빈 점 ○으로 나타내요.',
    rule: '초과·미만은 그 수가 안 들어간다 (○).',
    slip: '경계에 있는 수가 들어가는지부터 봐요 — 초과·미만은 안 들어가요.',
    calc(r, c) { return oneSide(r, c, this, ['초과', '미만']); },
    misread(r, c) {
      const N = int(r, 12, 40);
      if (branchOf(r, c, ['edge', 'same']) === 'edge') {
        const W = pick(r, ['초과', '미만']);
        const q = showWork(`${N} ${W}인 수에 ${N}도 들어가요`);
        const chs = textChoices(r, `${jn(N, '은', '는')} 안 들어가요 — ${N} ${wj(W, '은', '는')} ${N}보다 ${W === '초과' ? '큰' : '작은'} 수예요`, [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `${N} ${wj(W, '은', '는')} ${jn(N, '과', '와')} 같거나 ${W === '초과' ? '큰' : '작은'} 수예요`, tag: TAGS.edgeIn },
          { text: `${N} ${W}인 수는 ${N}부터 ${N + 9}까지 10개뿐이에요`, tag: OFF },
        ]);
        return {
          ...misreadAsk(this.id, 'edge', fill(q, c), chs, {
            solve: solve([step(0, `${N} ${W} = ${meaning(N, W)}`), step(1, `${jn(N, '은', '는')} 안 들어가요 (수직선에 ○)`)], {
              whyAny: `${W}에는 경계에 있는 ${jn(N, '이', '가')} 안 들어가요.`,
              rule: '초과·미만은 그 수가 안 들어간다.',
            }),
          }),
          probe: { claim: [N, W, 'includes'] },
        };
      }
      const q = showWork(`"${N} 이하"와 "${N} 미만"은 같은 말이에요`);
      const chs = textChoices(r, `달라요 — ${N} 이하에는 ${jn(N, '이', '가')} 들어가고, ${N} 미만에는 안 들어가요`, [
        { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
        { text: `둘 다 ${jn(N, '이', '가')} 들어가요`, tag: TAGS.edgeIn },
        { text: `${N} 이하는 ${N}보다 큰 수예요`, tag: OFF },
      ]);
      return {
        ...misreadAsk(this.id, 'same', fill(q, c), chs, {
          solve: solve([step(0, `${N} 이하: ${N}도 들어가요 (●)`), step(1, `${N} 미만: ${jn(N, '은', '는')} 안 들어가요 (○)`)], {
            whyAny: `${N} 이하와 ${N} 미만은 ${N} 하나 때문에 달라요.`,
            rule: '이하는 들어가고, 미만은 안 들어간다.',
          }),
        }),
        probe: { claim: [N, '이하≠미만'] },
      };
    },
  },

  {
    id: 'rng.line', grade: 5, name: '수의 범위를 수직선에', needs: ['rng.over'],
    idea: '**10 이상 15 미만**처럼 두 조건을 합치면 그 사이의 수예요. 수직선에는 10에 ●, 15에 ○를 찍고 **사이를 칠해요**. 속이 찬 점 ●은 들어가고 속이 빈 점 ○는 안 들어가요.',
    rule: '속이 찬 점 ●은 들어가고 속이 빈 점 ○는 안 들어간다 — 두 점 사이를 칠한다.',
    slip: '양 끝의 점이 ●인지 ○인지 하나씩 봐요.',
    calc(r, c) {
      const fams = [];
      // 수직선 읽기 — 두 점 넷 + 한 점(오른쪽·왼쪽) 넷
      const two = [];
      for (const LW of LOWW) for (const HW of HIGHW) {
        const A = int(r, 10, 40); const B = A + int(r, 3, 7);
        const lo = A - int(r, 1, 3); const hi = Math.min(B + int(r, 1, 3), lo + 14);
        const ans = rangeWords(A, LW, B, HW);
        two.push({
          t: `수직선에 나타낸 수의 범위를 바르게 말한 것은 어느 것일까요?\n\n[range ${lo}..${hi} ${A}${dotOf(LW)} ${B}${dotOf(HW)}]`,
          text: true, ans,
          wr: [
            { text: rangeWords(A, FLIP_EDGE[LW], B, HW), tag: TAGS.dotSwap },
            { text: rangeWords(A, LW, B, FLIP_EDGE[HW]), tag: TAGS.dotSwap },
            { text: rangeWords(A, FLIP_EDGE[LW], B, FLIP_EDGE[HW]), tag: TAGS.dotSwap },
          ],
          steps: [`${A}에 ${dotOf(LW)} → ${A} ${LW} · ${B}에 ${dotOf(HW)} → ${B} ${HW}`, `→ ${ans}`],
          why: { [TAGS.dotSwap]: `속이 찬 점 ●은 그 수가 들어가고(이상·이하), 속이 빈 점 ○는 안 들어가요(초과·미만). ${A}에는 ${dotOf(LW)}, ${B}에는 ${dotOf(HW)}예요.` },
          probe: { line: true },
        });
      }
      const one = [];
      for (const W of ['이상', '초과', '이하', '미만']) {
        const A = int(r, 10, 40);
        const right = W === '이상' || W === '초과';
        const lo = right ? A - int(r, 2, 4) : A - int(r, 5, 8);
        const hi = right ? A + int(r, 5, 8) : A + int(r, 2, 4);
        const mark = right ? `${A}${dotOf(W)}>` : `<${A}${dotOf(W)}`;
        const ans = rangeWords(A, W);
        one.push({
          t: `수직선에 나타낸 수의 범위를 바르게 말한 것은 어느 것일까요?\n\n[range ${lo}..${hi} ${mark}]`,
          text: true, ans,
          wr: [
            { text: rangeWords(A, FLIP_EDGE[W]), tag: TAGS.dotSwap },
            { text: rangeWords(A, FLIP_DIR[W]), tag: TAGS.dirSwap },
            { text: rangeWords(A, FLIP_DIR[FLIP_EDGE[W]]), tag: TAGS.dirEdge },
          ],
          steps: [`${A}에 ${dotOf(W)}, ${right ? '오른쪽(큰 쪽)' : '왼쪽(작은 쪽)'}으로 칠함`, `→ ${ans}`],
          why: {
            [TAGS.dotSwap]: `${A}에 ${dotOf(W)}니까 ${jn(A, '은', '는')} ${inclusive(W) ? '들어가요' : '안 들어가요'}.`,
            [TAGS.dirSwap]: `칠한 쪽이 ${right ? '오른쪽(큰 쪽)' : '왼쪽(작은 쪽)'}이에요.`,
            [TAGS.dirEdge]: `칠한 쪽(${right ? '큰 쪽' : '작은 쪽'})과 점(${dotOf(W)})을 둘 다 봐요.`,
          },
          probe: { line: true },
        });
      }
      fams.push(famOf(two), famOf(one));
      // 범위에 드는 수 모두 고르기
      fams.push(famOf(LOWW.flatMap((LW) => HIGHW.map((HW) => {
        const A = int(r, 12, 40); const B = A + int(r, 4, 8);
        const mids = shuffle(r, Array.from({ length: B - A - 1 }, (_, i) => A + 1 + i)).slice(0, 2);
        const S = shuffle(r, [A - int(r, 1, 3), A, ...mids, B, B + int(r, 1, 3)]);
        const sel = (wa, wb) => S.filter((x) => inRange(x, A, wa, B, wb));
        const ans = sel(LW, HW);
        return {
          t: `다음 수 중에서 ${A} ${LW} ${B} ${HW}인 수를 모두 고르면 어느 것일까요?\n\n**${L(S)}**`,
          text: true, ans: L(ans),
          wr: [
            { text: L(sel(FLIP_EDGE[LW], HW)), tag: edgeTag(LW) },
            { text: L(sel(LW, FLIP_EDGE[HW])), tag: edgeTag(HW) },
            { text: L(sel(FLIP_EDGE[LW], FLIP_EDGE[HW])), tag: TAGS.edgeBoth },
          ],
          steps: [`${A} ${LW}: ${jn(A, '은', '는')} ${inclusive(LW) ? '들어가요' : '안 들어가요'} · ${B} ${HW}: ${jn(B, '은', '는')} ${inclusive(HW) ? '들어가요' : '안 들어가요'}`, `→ ${L(ans)}`],
          why: {
            [TAGS.edgeOut]: `이상·이하의 경계 수는 들어가요.`,
            [TAGS.edgeIn]: `초과·미만의 경계 수는 안 들어가요.`,
            [TAGS.edgeBoth]: `양 끝 수(${A}, ${B})를 하나씩 따로 봐요 — ${A} ${LW}, ${B} ${HW}.`,
          },
          probe: { range2: [A, LW, B, HW], list: S },
        };
      }))));
      // 점 찍기 — 어느 점을 찍어야 하나
      fams.push(famOf(LOWW.flatMap((LW) => HIGHW.map((HW) => {
        const A = int(r, 10, 40); const B = A + int(r, 3, 9);
        const say = (dl, dh) => `${A}에 ${dl}, ${B}에 ${dh}`;
        const ans = say(dotOf(LW), dotOf(HW));
        const all = [['●', '●'], ['●', '○'], ['○', '●'], ['○', '○']].map(([x, y]) => say(x, y)).filter((t) => t !== ans);
        return {
          t: `${A} ${LW} ${B} ${HW}인 수를 수직선에 나타내려고 해요. ${jn(A, '과', '와')} ${B}에 어떤 점을 찍어야 할까요?`,
          text: true, ans,
          wr: all.map((t) => ({ text: t, tag: TAGS.dotSwap })),
          steps: [`${A} ${LW} → ${dotOf(LW)} · ${B} ${HW} → ${dotOf(HW)}`, `→ ${ans}`],
          why: { [TAGS.dotSwap]: `들어가는 수(이상·이하)는 ●, 안 들어가는 수(초과·미만)는 ○예요.` },
          probe: { dots: [A, LW, B, HW] },
        };
      }))));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      const LW = pick(r, LOWW); const HW = pick(r, HIGHW);
      const A = int(r, 10, 40); const B = A + int(r, 3, 7);
      const lo = A - int(r, 1, 3); const hi = Math.min(B + int(r, 1, 3), lo + 14);
      const right = rangeWords(A, LW, B, HW);
      if (branchOf(r, c, ['read', 'draw']) === 'read') {
        const said = rangeWords(A, FLIP_EDGE[LW], B, HW);
        const q = `{mon/이/가} 수직선을 보고 이렇게 말했어요.\n\n[range ${lo}..${hi} ${A}${dotOf(LW)} ${B}${dotOf(HW)}]\n\n**이 수직선은 ${endj(said, '이에요', '예요')}**\n\n어디가 틀렸을까요?`;
        const chs = textChoices(r, `${A}에 찍힌 점은 ${dotOf(LW)} — ${jn(A, '은', '는')} ${inclusive(LW) ? '들어가요' : '안 들어가요'}. ${right}`, [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `${B}의 점도 반대로 읽어야 해요 — ${rangeWords(A, FLIP_EDGE[LW], B, FLIP_EDGE[HW])}`, tag: TAGS.dotSwap },
          { text: '수직선은 왼쪽으로 갈수록 큰 수예요', tag: OFF },
        ]);
        return {
          ...misreadAsk(this.id, 'read', fill(q, c), chs, {
            solve: solve([step(0, `${A}에 ${dotOf(LW)} → ${A} ${LW}`), step(1, `${B}에 ${dotOf(HW)} → ${B} ${HW} — ${right}`)], {
              whyAny: `${A}의 점(${dotOf(LW)})을 반대로 읽었어요. 속이 찬 점 ●은 들어가고 속이 빈 점 ○는 안 들어가요.`,
              rule: '속이 찬 점 ●은 이상·이하, 속이 빈 점 ○는 초과·미만.',
            }),
          }),
          probe: { range2: [A, LW, B, HW] },
        };
      }
      const drawn = `${A}${dotOf(FLIP_EDGE[LW])} ${B}${dotOf(HW)}`;
      const q = `{mon/이/가} "${right}"인 수를 수직선에 이렇게 나타냈어요.\n\n[range ${lo}..${hi} ${drawn}]\n\n어디가 틀렸을까요?`;
      const chs = textChoices(r, `${jn(A, '은', '는')} ${inclusive(LW) ? '들어가니까 ●' : '안 들어가니까 ○'}로 찍어야 해요`, [
        { text: '맞게 나타냈어요', tag: RIGHT_AS_WRONG },
        { text: `${B}의 점을 바꿔야 해요`, tag: TAGS.dotSwap },
        { text: `${A}보다 왼쪽을 칠해야 해요`, tag: OFF },
      ]);
      return {
        ...misreadAsk(this.id, 'draw', fill(q, c), chs, {
          solve: solve([step(0, `${A} ${LW} → ${A}에 ${dotOf(LW)}`), step(1, `${B} ${HW} → ${B}에 ${dotOf(HW)}, 사이를 칠해요`)], {
            whyAny: `${A}의 점을 반대로 찍었어요.`,
            rule: '들어가면 ●, 안 들어가면 ○.',
          }),
        }),
        probe: { range2: [A, LW, B, HW], drawn },
      };
    },
  },

  {
    id: 'rng.count', grade: 5, name: '범위에 드는 수 세기', needs: ['rng.line'],
    idea: '**10 이상 15 이하**인 자연수는 10, 11, 12, 13, 14, 15 — 6개예요. 15 − 10 = 5만 하면 하나가 모자라요. **양 끝이 들어가는지**를 보고 세요.',
    // "차만 구하면 하나가 어긋난다"는 41 초과 60 이하(60 − 41 = 19, 답도 19)에서 거짓이었다 (Codex 21차 #2) — 원고와 같은 규칙으로
    rule: '양 끝이 들어가는지 보고 센다 — 가장 작은 수와 가장 큰 수를 찾고 (큰 수 − 작은 수) + 1.',
    slip: '양 끝의 수를 직접 써 보고 세어 봐요.',
    calc(r, c) {
      const fams = [];
      const countOf = (A, LW, B, HW) => { let n = 0; for (let x = A - 1; x <= B + 1; x++) if (inRange(x, A, LW, B, HW)) n++; return n; };
      const wrongCounts = (A, B, ans) => {
        const out = [];
        if (B - A + 1 !== ans) out.push({ text: String(B - A + 1), tag: TAGS.bothIn });
        if (B - A - 1 !== ans) out.push({ text: String(B - A - 1), tag: TAGS.bothOut });
        if (B - A !== ans) out.push({ text: String(B - A), tag: TAGS.subOnly });
        return out;
      };
      const countWhy = (A, LW, B, HW, ans) => {
        const out = [!inclusive(LW) ? A : null, !inclusive(HW) ? B : null].filter((x) => x !== null);
        const inn = [inclusive(LW) ? A : null, inclusive(HW) ? B : null].filter((x) => x !== null);
        // 이 범위에서 쓰는 이름표만 — 안 들어가는 끝이 없는데 "양 끝을 모두 셈" 설명을 만들면 빈 자리가 생긴다
        return {
          ...(out.length ? { [TAGS.bothIn]: `${out.length === 2 ? `${jn(A, '과', '와')} ${jn(B, '은', '는')} 둘 다` : jn(out[0], '은', '는')} 안 들어가요 → ${ans}개.` } : {}),
          ...(inn.length ? { [TAGS.bothOut]: `${inn.length === 2 ? `${jn(A, '과', '와')} ${B}도` : `${inn[0]}도`} 들어가요 → ${ans}개.` } : {}),
          [TAGS.subOnly]: `${B} − ${A} = ${jn(B - A, '은', '는')} ${A}에서 ${B}까지 간 칸의 수예요. 들어가는 수를 세면 ${ans}개.`,
        };
      };
      const first = (A, LW) => (inclusive(LW) ? A : A + 1);
      const last = (B, HW) => (inclusive(HW) ? B : B - 1);
      fams.push(famOf(LOWW.flatMap((LW) => HIGHW.map((HW) => {
        const A = int(r, 10, 60); const B = A + int(r, 5, 25);
        const ans = countOf(A, LW, B, HW);
        return {
          t: `${A} ${LW} ${B} ${HW}인 자연수는 모두 몇 개일까요?`,
          ans: String(ans), wr: wrongCounts(A, B, ans),
          steps: [`가장 작은 수 ${first(A, LW)}, 가장 큰 수 ${last(B, HW)}`, `${last(B, HW)} − ${first(A, LW)} + 1 = ${ans} → ${ans}개`],
          why: countWhy(A, LW, B, HW, ans),
          probe: { count2: [A, LW, B, HW] },
        };
      }))));
      fams.push(famOf(LOWW.flatMap((LW) => HIGHW.map((HW) => {
        const A = int(r, 1, 30); const B = A + int(r, 5, 20);
        const ans = countOf(A, LW, B, HW);
        return {
          t: `번호표가 ${A}번 ${LW} ${B}번 ${HW}인 사람이 첫째 줄에 서요. 번호표는 한 사람에 하나씩이에요. 첫째 줄에 서는 사람은 모두 몇 명일까요?`,
          ans: String(ans), wr: wrongCounts(A, B, ans),
          steps: [`첫 번호 ${first(A, LW)}번, 끝 번호 ${last(B, HW)}번`, `${last(B, HW)} − ${first(A, LW)} + 1 = ${ans} → ${ans}명`],
          why: countWhy(A, LW, B, HW, ans),
          probe: { count2: [A, LW, B, HW] },
        };
      }))));
      fams.push(famOf(LOWW.flatMap((LW) => HIGHW.flatMap((HW) => ['큰', '작은'].map((side) => {
        const A = int(r, 10, 60); const B = A + int(r, 5, 25);
        const big = side === '큰';
        const ans = big ? last(B, HW) : first(A, LW);
        const w = big ? HW : LW;
        const wrong = big ? (inclusive(HW) ? B - 1 : B) : (inclusive(LW) ? A + 1 : A);
        return {
          t: `${A} ${LW} ${B} ${HW}인 자연수 중에서 가장 ${side} 수는 얼마일까요?`,
          ans: String(ans), wr: [{ text: String(wrong), tag: edgeTag(w) }],
          steps: [`${big ? `${B} ${HW}` : `${A} ${LW}`}: ${jn(big ? B : A, '은', '는')} ${inclusive(w) ? '들어가요' : '안 들어가요'}`, `가장 ${side} 수 → ${ans}`],
          why: whyOneSide(big ? B : A, w),
          probe: { range2: [A, LW, B, HW], extreme: big ? 'max' : 'min' },
        };
      })))));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      const A = int(r, 10, 40);
      if (branchOf(r, c, ['fence', 'both']) === 'fence') {
        const B = A + int(r, 4, 9);
        const ans = B - A + 1;
        const q = showWork(`${A} 이상 ${B} 이하인 자연수는 ${B} − ${A} = ${B - A}, ${B - A}개예요`);
        const chs = textChoices(r, `${jn(A, '과', '와')} ${B}도 들어가요 — ${A}부터 ${B}까지 ${ans}개`, [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `${jn(A, '과', '와')} ${jn(B, '은', '는')} 빼야 해서 ${B - A - 1}개예요`, tag: TAGS.bothOut },
          { text: '자연수 말고 소수도 세야 해요', tag: OFF },
        ]);
        return {
          ...misreadAsk(this.id, 'fence', fill(q, c), chs, {
            solve: solve([step(0, `${A} 이상 ${B} 이하 → ${A}, ${A + 1}, …, ${B}`), step(1, `${B} − ${A} + 1 = ${ans} → ${ans}개`)], {
              whyAny: `${B} − ${jn(A, '은', '는')} ${A}에서 ${B}까지 간 칸 수예요. 수는 그보다 하나 많아요.`,
              rule: '양 끝이 다 들어가면 (큰 수 − 작은 수) + 1.',
            }),
          }),
          probe: { count2: [A, '이상', B, '이하'], shown: B - A },
        };
      }
      const B = A + int(r, 5, 10);
      const ans = B - A - 1;
      const q = showWork(`${A} 초과 ${B} 미만인 자연수는 ${A}, ${A + 1}, …, ${ro(B)} ${B - A + 1}개예요`);
      const chs = textChoices(r, `${jn(A, '과', '와')} ${jn(B, '은', '는')} 안 들어가요 — ${A + 1}부터 ${B - 1}까지 ${ans}개`, [
        { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
        { text: `${B} − ${A} = ${B - A}, ${B - A}개예요`, tag: TAGS.subOnly },
        { text: '자연수 말고 소수도 세야 해요', tag: OFF },
      ]);
      return {
        ...misreadAsk(this.id, 'both', fill(q, c), chs, {
          solve: solve([step(0, `${A} 초과 ${B} 미만 → ${A + 1}, …, ${B - 1}`), step(1, `${B - 1} − ${A + 1} + 1 = ${ans} → ${ans}개`)], {
            whyAny: `초과·미만이라 양 끝 ${jn(A, '과', '와')} ${jn(B, '은', '는')} 빼야 해요.`,
            rule: '초과·미만은 양 끝을 뺀다.',
          }),
        }),
        probe: { count2: [A, '초과', B, '미만'], shown: B - A + 1 },
      };
    },
  },

  {
    id: 'rng.table', grade: 5, name: '수의 범위 활용', needs: ['rng.count'],
    idea: '체급표·요금표는 **수의 범위**로 칸을 나눠요. 경계에 있는 수(35 kg)는 "35 kg 이하" 칸에 들고 "35 kg 초과" 칸에는 안 들어요 — **한 칸에만** 들어가요.',
    rule: '경계의 수는 "이하·이상"인 칸에만 든다 — 초과·미만인 칸에는 안 든다.',
    slip: '그 수가 들어가는 칸을 위에서부터 하나씩 확인해 봐요.',
    calc(r, c) {
      const fams = [];
      // 태권도 체급 — 몸무게는 늘 경계 수 (그게 문제의 핵심)
      fams.push(famOf([0, 1, 2].map((j) => {
        const b0 = int(r, 30, 36); const w = pick(r, [3, 4]);
        const U = [b0, b0 + w, b0 + 2 * w, b0 + 3 * w];
        const names = ['핀급', '플라이급', '밴텀급', '페더급'];
        const lines = [`· 핀급: ${U[0]} kg 이하`, ...[1, 2, 3].map((i) => `· ${names[i]}: ${U[i - 1]} kg 초과 ${U[i]} kg 이하`)].join('\n');
        const x = U[j];
        const others = names.filter((_, i) => i !== j && i !== j + 1);
        return {
          t: `태권도 체급표예요.\n\n${lines}\n\n{mon}의 몸무게는 ${x} kg이에요. {mon/은/는} 어느 체급일까요?`,
          text: true, ans: names[j],
          wr: [{ text: names[j + 1], tag: TAGS.edgeIn }, ...others.map((n) => ({ text: n, tag: TAGS.misTable }))],
          steps: [`${x} kg은 "${x} kg 이하"에 들어가요 — "${x} kg 초과"에는 안 들어가요`, `→ ${names[j]}`],
          why: {
            [TAGS.edgeIn]: `"${x} kg 초과"에는 ${x} kg이 안 들어가요. ${x} kg은 "${x} kg 이하"인 ${names[j]}이에요.`,
            [TAGS.misTable]: `${x} kg이 들어가는 줄을 찾아요 — "${x} kg 이하"가 있는 줄이에요.`,
          },
          probe: { table: { kind: 'weight', U, names, x } },
        };
      })));
      // 우편 요금 — 답이 수(숫자판)
      fams.push(famOf([0, 1].map((j) => {
        const g0 = pick(r, [20, 25, 50]);
        const U = [g0, g0 * 2, g0 * 4];
        const p1 = int(r, 3, 5) * 100; const P = [p1, p1 + int(r, 1, 3) * 100];
        P.push(P[1] + int(r, 1, 3) * 100);
        const lines = [`· ${U[0]} g 이하: ${P[0]}원`, `· ${U[0]} g 초과 ${U[1]} g 이하: ${P[1]}원`, `· ${U[1]} g 초과 ${U[2]} g 이하: ${P[2]}원`].join('\n');
        const x = U[j];
        return {
          t: `편지 무게에 따른 우편 요금표예요.\n\n${lines}\n\n무게가 ${x} g인 편지를 보내려면 얼마를 내야 할까요?`,
          ans: String(P[j]),
          wr: [{ text: String(P[j + 1]), tag: TAGS.edgeIn }, ...(j > 0 ? [{ text: String(P[j - 1]), tag: TAGS.misTable }] : [{ text: String(P[2]), tag: TAGS.misTable }])],
          steps: [`${x} g은 "${x} g 이하" 줄에 들어가요`, `→ ${P[j]}원`],
          why: {
            [TAGS.edgeIn]: `"${x} g 초과"에는 ${x} g이 안 들어가요 → ${P[j]}원.`,
            [TAGS.misTable]: `${x} g이 들어가는 줄을 찾아요 — "${x} g 이하"가 있는 줄 → ${P[j]}원.`,
          },
          probe: { table: { kind: 'mail', U, P, x } },
        };
      })));
      // 놀이공원 나이 요금 — 이상·미만으로 나뉜 표
      fams.push(famOf([0, 1].map((j) => {
        const a = int(r, 6, 8); const b = int(r, 12, 14);
        const names = ['무료', '어린이 요금', '어른 요금'];
        const lines = [`· ${a}살 미만: 무료`, `· ${a}살 이상 ${b}살 미만: 어린이 요금`, `· ${b}살 이상: 어른 요금`].join('\n');
        const x = j === 0 ? a : b;
        const ok = j === 0 ? 1 : 2;
        const edge = j === 0 ? 0 : 1;
        const rest = [0, 1, 2].find((i) => i !== ok && i !== edge);
        return {
          t: `놀이공원 입장 요금표예요.\n\n${lines}\n\n{mon/은/는} ${x}살이에요. 어떤 요금을 내야 할까요?`,
          text: true, ans: names[ok],
          wr: [{ text: names[edge], tag: TAGS.edgeIn }, { text: names[rest], tag: TAGS.misTable }],
          steps: [`${x}살은 "${x}살 미만"에 안 들어가고 "${x}살 이상"에 들어가요`, `→ ${names[ok]}`],
          why: {
            [TAGS.edgeIn]: `"${x}살 미만"에는 ${x}살이 안 들어가요 → ${names[ok]}.`,
            [TAGS.misTable]: `${x}살이 들어가는 줄을 찾아요 — "${x}살 이상"이 있는 줄 → ${names[ok]}.`,
          },
          probe: { table: { kind: 'age', a, b, names, x } },
        };
      })));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['edge', 'both']) === 'edge') {
        const b0 = int(r, 30, 36); const w = pick(r, [3, 4]);
        const x = b0 + w;
        const q = showWork(`몸무게 ${x} kg은 "${x} kg 초과 ${x + w} kg 이하"인 밴텀급이에요`);
        const chs = textChoices(r, `${x} kg은 "${x} kg 초과"에 안 들어가요 — "${b0} kg 초과 ${x} kg 이하"인 플라이급이에요`, [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `${x} kg은 어느 체급에도 안 들어가요`, tag: TAGS.edgeOut },
          { text: '체급은 키로 정해요', tag: OFF },
        ]);
        return {
          ...misreadAsk(this.id, 'edge', fill(q, c), chs, {
            solve: solve([step(0, `${x} kg 초과 → ${x} kg은 안 들어가요`), step(1, `${b0} kg 초과 ${x} kg 이하 → ${x} kg이 들어가요 — 플라이급`)], {
              whyAny: `초과에는 경계 수가 안 들어가요. ${x} kg은 "${x} kg 이하" 칸이에요.`,
              rule: '경계의 수는 이하·이상인 칸에만 든다.',
            }),
          }),
          probe: { claim: [x, '초과', 'includes'] },
        };
      }
      const a = int(r, 6, 8); const b = int(r, 12, 14);
      const q = showWork(`"${a}살 이상 ${b}살 미만: 어린이 요금 · ${b}살 이상: 어른 요금"이면 ${b}살은 어린이 요금도 되고 어른 요금도 돼요`);
      const chs = textChoices(r, `${b}살은 "${b}살 미만"에 안 들어가요 — 어른 요금만 내요`, [
        { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
        { text: `${b}살은 어린이 요금만 내요`, tag: TAGS.edgeIn },
        { text: `${b}살은 무료예요`, tag: OFF },
      ]);
      return {
        ...misreadAsk(this.id, 'both', fill(q, c), chs, {
          solve: solve([step(0, `${b}살 미만 → ${b}살은 안 들어가요`), step(1, `${b}살 이상 → ${b}살이 들어가요 — 어른 요금`)], {
            whyAny: `경계 수는 한 칸에만 들어가요. 미만인 칸에는 안 들어가요.`,
            rule: '경계의 수는 한 칸에만 든다.',
          }),
        }),
        probe: { claim: [b, '미만', 'includes'] },
      };
    },
  },

  {
    id: 'rng.up', grade: 5, name: '올림', needs: ['rng.table'],
    idea: '**올림**은 구하려는 자리 아래에 0이 아닌 수가 있으면 그 자리 숫자를 1 크게 하고, 아래 자리는 모두 0으로 해요. 243을 올림하여 십의 자리까지 나타내면 **250**. 이렇게 대강 나타내는 것을 **어림**한다고 해요.',
    rule: '올림: 그 자리 아래에 0이 아닌 수가 있으면 그 자리를 1 크게, 아래는 0.',
    slip: '구하려는 자리에 밑줄을 긋고, 그 아래 자리를 봐요.',
    calc(r, c) { return roundCalc(r, c, this, 'up'); },
    misread(r, c) {
      if (branchOf(r, c, ['nozero', 'place']) === 'nozero') {
        const v = pickNat(r, '백');
        const u = PLACE['백'];
        const wrong = v + u; const ok = upTo(v, u);
        const q = showWork(`${jn(fmt(v), '을', '를')} 올림하여 백의 자리까지 나타내면 ${jn(fmt(wrong), '이에요', '예요')}`);
        const chs = textChoices(r, `백의 자리를 1 크게 한 뒤 아래는 0으로 — ${fmt(ok)}`, [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `백의 자리 아래를 그냥 0으로 — ${fmt(downTo(v, u))}`, tag: TAGS.downForUp },
          { text: `백의 자리 숫자만 쓰면 돼요 — ${digitAt(v, u)}`, tag: OFF },
        ]);
        return {
          ...misreadAsk(this.id, 'nozero', fill(q, c), chs, {
            solve: solve([step(0, `${fmt(v)} — 백의 자리 아래 ${jn(fmt(v % u), '이', '가')} 0이 아니라서 백의 자리 숫자를 1 크게`), step(1, `아래 자리는 모두 0 → ${fmt(ok)}`)], {
              whyAny: `백의 자리를 1 크게 하고 아래 자리를 그대로 두었어요. 아래는 0으로 바꿔요.`,
              rule: '올림하면 그 아래 자리는 모두 0.',
            }),
          }),
          probe: { round: [fmt(v), 'up', '백'], shown: fmt(wrong) },
        };
      }
      const v = pickDec(r, '소수 첫째', (x, u) => digitAt(x, u / 10) !== 9);
      // 소수 셋째 자리까지 있는 수로 — "첫째 자리까지"를 "둘째 자리까지"로 잘못 본 답이 보이게
      const v3 = v + int(r, 1, 9) * 1; // 0.001 단위 끝자리
      const ok = upTo(v3, PLACE['소수 첫째']); const wrong = upTo(v3, PLACE['소수 둘째']);
      const q = showWork(`${jn(fmt(v3), '을', '를')} 올림하여 소수 첫째 자리까지 나타내면 ${jn(fmt(wrong), '이에요', '예요')}`);
      const chs = textChoices(r, `소수 첫째 자리까지니까 소수 둘째 자리부터 아래를 봐요 — ${fmt(ok)}`, [
        { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
        { text: `소수 첫째 자리 아래를 그냥 0으로 — ${fmt(downTo(v3, PLACE['소수 첫째']))}`, tag: TAGS.downForUp },
        { text: '소수는 올림할 수 없어요', tag: OFF },
      ]);
      return {
        ...misreadAsk(this.id, 'place', fill(q, c), chs, {
          solve: solve([step(0, `소수 첫째 자리까지 → 소수 둘째 자리부터 아래를 봐요`), step(1, `${fmt(v3)} → ${fmt(ok)}`)], {
            whyAny: `소수 둘째 자리까지 나타냈어요. 소수 첫째 자리까지예요.`,
            rule: '"~자리까지"는 그 자리까지만 남긴다.',
          }),
        }),
        probe: { round: [fmt(v3), 'up', '소수 첫째'], shown: fmt(wrong) },
      };
    },
  },

  {
    id: 'rng.down', grade: 5, name: '버림', needs: ['rng.up'],
    idea: '**버림**은 구하려는 자리 아래의 수를 모두 0으로 해요(버려요). 247을 버림하여 십의 자리까지 나타내면 **240**. 지운 자리에는 0을 써야 해요 — 24가 아니에요.',
    rule: '버림: 그 자리 아래를 모두 0으로.',
    slip: '구하려는 자리에 밑줄을 긋고, 그 아래를 모두 0으로 바꿔 봐요.',
    calc(r, c) { return roundCalc(r, c, this, 'down'); },
    misread(r, c) {
      if (branchOf(r, c, ['up', 'drop']) === 'up') {
        const v = pickDec(r, '소수 첫째');
        const u = PLACE['소수 첫째'];
        const q = showWork(`${jn(fmt(v), '을', '를')} 버림하여 소수 첫째 자리까지 나타내면 ${jn(fmt(upTo(v, u)), '이에요', '예요')}`);
        const chs = textChoices(r, `버림은 아래를 0으로 해요 — ${fmt(downTo(v, u))}`, [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: '버림은 소수 첫째 자리 숫자를 1 크게 해요', tag: TAGS.upForDown },
          { text: '소수는 버림할 수 없어요', tag: OFF },
        ]);
        return {
          ...misreadAsk(this.id, 'up', fill(q, c), chs, {
            solve: solve([step(0, '소수 첫째 자리 아래(소수 둘째 자리)를 0으로'), step(1, `${fmt(v)} → ${fmt(downTo(v, u))}`)], {
              whyAny: `그건 올림한 수예요. 버림은 아래 자리를 모두 0으로 해요.`,
              rule: '버림은 아래를 0으로 — 크게 하지 않는다.',
            }),
          }),
          probe: { round: [fmt(v), 'down', '소수 첫째'], shown: fmt(upTo(v, u)) },
        };
      }
      const v = pickNat(r, '백');
      const u = PLACE['백'];
      const dd = Math.floor(v / u);
      const q = showWork(`${jn(fmt(v), '을', '를')} 버림하여 백의 자리까지 나타내면 ${jn(dd, '이에요', '예요')}`);
      const chs = textChoices(r, `지운 자리에 0을 써야 해요 — ${fmt(downTo(v, u))}`, [
        { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
        { text: `백의 자리를 1 크게 해야 해요 — ${fmt(upTo(v, u))}`, tag: TAGS.upForDown },
        { text: `천의 자리까지 버려야 해요 — ${fmt(downTo(v, PLACE['천']))}`, tag: OFF }, // 백의 자리 숫자는 0이 아니라(pickNat) 늘 정답과 다르다
      ]);
      return {
        ...misreadAsk(this.id, 'drop', fill(q, c), chs, {
          solve: solve([step(0, `${fmt(v)} — 백의 자리 아래를 0으로`), step(1, `${fmt(downTo(v, u))} (${jn(dd, '이', '가')} 아니에요)`)], {
            whyAny: `아래 자리를 지워 버려서 수가 아주 작아졌어요. 지운 자리에는 0을 써요.`,
            rule: '버림해도 자리 수는 그대로 — 아래는 0.',
          }),
        }),
        probe: { round: [fmt(v), 'down', '백'], shown: String(dd) },
      };
    },
  },

  {
    id: 'rng.round', grade: 5, name: '반올림', needs: ['rng.down'],
    idea: '**반올림**은 구하려는 자리 **바로 아래 숫자**만 봐요. 0, 1, 2, 3, 4면 버리고 5, 6, 7, 8, 9면 올려요. 245를 반올림하여 십의 자리까지 → 바로 아래 5라서 **250**.',
    rule: '반올림: 바로 아래 숫자가 0~4면 버리고, 5~9면 올린다.',
    slip: '구하려는 자리 바로 아래 숫자 하나만 봐요.',
    calc(r, c) { return roundCalc(r, c, this, 'round'); },
    misread(r, c) {
      if (branchOf(r, c, ['five', 'double']) === 'five') {
        const v = pickDec(r, '소수 첫째', (x, u) => digitAt(x, u / 10) === 5);
        const u = PLACE['소수 첫째'];
        const q = showWork(`${jn(fmt(v), '을', '를')} 반올림하여 소수 첫째 자리까지 나타내면 5는 버리니까 ${jn(fmt(downTo(v, u)), '이에요', '예요')}`);
        const chs = textChoices(r, `5부터는 올려요 — ${fmt(roundTo(v, u))}`, [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `일의 자리까지 반올림해야 해요 — ${fmt(roundTo(v, M))}`, tag: TAGS.wrongPlace },
          { text: '소수는 반올림할 수 없어요', tag: OFF },
        ]);
        return {
          ...misreadAsk(this.id, 'five', fill(q, c), chs, {
            solve: solve([step(0, '소수 첫째 자리 바로 아래 숫자: 5'), step(1, `5, 6, 7, 8, 9는 올려요 → ${fmt(roundTo(v, u))}`)], {
              whyAny: `5는 버리는 쪽이 아니라 올리는 쪽이에요.`,
              rule: '0~4는 버리고 5~9는 올린다.',
            }),
          }),
          probe: { round: [fmt(v), 'round', '소수 첫째'], shown: fmt(downTo(v, u)) },
        };
      }
      const v = pickDec(r, '일', (x, u) => digitAt(x, u / 10) === 4 && digitAt(x, u / 100) >= 5);
      const u = PLACE['일'];
      const mid = roundTo(v, u / 10);
      const q = showWork(`${jn(fmt(v), '을', '를')} 반올림하여 일의 자리까지 나타내면 ${fmt(v)} → ${fmt(mid)} → ${jn(fmt(roundTo(mid, u)), '이에요', '예요')}`);
      const chs = textChoices(r, `일의 자리 바로 아래 숫자 4만 봐요 — ${fmt(roundTo(v, u))}`, [
        { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
        { text: `맨 끝 숫자부터 올려야 해서 ${jn(fmt(roundTo(mid, u)), '이', '가')} 맞아요`, tag: TAGS.doubleRound },
        { text: '일의 자리까지 나타내면 늘 10이 돼요', tag: OFF },
      ]);
      return {
        ...misreadAsk(this.id, 'double', fill(q, c), chs, {
          solve: solve([step(0, '일의 자리 바로 아래(소수 첫째 자리) 숫자: 4'), step(1, `0~4라서 버려요 → ${fmt(roundTo(v, u))}`)], {
            whyAny: `두 번 반올림했어요. 바로 아래 숫자 하나만 보고 한 번에 해요.`,
            rule: '반올림은 한 번만 — 바로 아래 숫자 하나로.',
          }),
        }),
        probe: { round: [fmt(v), 'round', '일'], shown: fmt(roundTo(mid, u)) },
      };
    },
  },

  {
    id: 'rng.apply', grade: 5, name: '어림하기 활용', needs: ['rng.round'],
    idea: '어림하기는 **상황에 맞게** 골라요. 모두 타야 하는 버스는 모자라면 안 되니까 **올림**, 꽉 찬 봉지만 팔 수 있으면 **버림**, 대강 가까운 수로 말할 때는 **반올림**.',
    rule: '모자라면 안 되면 올림 · 다 찬 것만 세면 버림 · 가까운 수로 말하면 반올림.',
    slip: '어림한 수로 정말 되는지 — 사람이 남는지, 덜 찬 봉지가 생기는지 — 따져 봐요.',
    calc(r, c) {
      const fams = [];
      // 모두 타야 한다 → 올림
      fams.push(famOf(['버스', '보트'].map((kind) => {
        const k = kind === '버스' ? pick(r, [20, 30, 40]) : pick(r, [4, 5, 6]);
        const q = int(r, 3, 8); const rem = int(r, 1, k - 1);
        const N = k * q + rem;
        const unit = kind === '버스' ? '대' : '척';
        return {
          t: kind === '버스'
            ? `버스 한 대에 ${k}명씩 탈 수 있어요. 학생 ${N}명이 모두 타려면 버스는 적어도 몇 대 있어야 할까요?`
            : `보트 한 척에 ${k}명씩 탈 수 있어요. ${N}명이 모두 타려면 보트는 적어도 몇 척 있어야 할까요?`,
          ans: String(q + 1),
          wr: [{ text: String(q), tag: TAGS.useDown }],
          steps: [`${k} × ${q} = ${k * q} → ${N} − ${k * q} = ${rem}명이 남아요`, `남은 ${rem}명도 타야 하니까 ${q} + 1 = ${q + 1}${unit}`],
          why: { [TAGS.useDown]: `${q}${unit}에는 ${k * q}명만 타고 ${rem}명이 남아요. 모두 타야 하니까 하나 더 → ${q + 1}${unit}.` },
          probe: { need: [N, k, 'up'] },
        };
      })));
      // 다 찬 것만 → 버림
      fams.push(famOf(['사탕', '지폐'].map((kind) => {
        if (kind === '사탕') {
          const v = pickNat(r, '십'); const N = v / M; const q = Math.floor(N / 10);
          return {
            t: `사탕 ${N}개를 한 봉지에 10개씩 담아 팔려고 해요. 팔 수 있는 봉지는 최대 몇 봉지일까요?`,
            ans: String(q),
            wr: [{ text: String(q + 1), tag: TAGS.useUp }],
            steps: [`10 × ${q} = ${10 * q} → ${N} − ${10 * q} = ${N - 10 * q}개가 남아요`, `남은 ${N - 10 * q}개로는 한 봉지가 안 차요 → ${q}봉지`],
            why: { [TAGS.useUp]: `${q + 1}번째 봉지는 ${N - 10 * q}개뿐이라 다 차지 않아요. 다 찬 봉지만 팔 수 있어요 → ${q}봉지.` },
            probe: { need: [N, 10, 'down'] },
          };
        }
        const v = pickNat(r, '천'); const N = v / M; const q = Math.floor(N / 1000);
        return {
          t: `동전 ${N}원을 1000원짜리 지폐로 바꾸려고 해요. 지폐는 최대 몇 장까지 바꿀 수 있을까요?`,
          ans: String(q),
          wr: [{ text: String(q + 1), tag: TAGS.useUp }],
          steps: [`1000 × ${q} = ${1000 * q} → ${N} − ${1000 * q} = ${N - 1000 * q}원이 남아요`, `남은 ${N - 1000 * q}원으로는 1000원짜리 한 장이 안 돼요 → ${q}장`],
          why: { [TAGS.useUp]: `${q + 1}장이면 ${1000 * (q + 1)}원이 있어야 해요. 동전은 ${N}원뿐이에요 → ${q}장.` },
          probe: { need: [N, 1000, 'down'] },
        };
      })));
      // 알맞은 어림 방법 고르기 — 상황마다 틀 하나 (수가 들어 있어 쌍둥이가 원래 글과 같아지지 않는다)
      fams.push(famOf(['bus', 'pack', 'pay', 'swap', 'crowd'].map((kind) => {
        const N = int(r, 120, 380); const k = pick(r, [20, 30, 40]);
        // 풀이가 "남는 사람·덜 찬 봉지가 생겨요"라고 말하므로 **정말 남아야** 한다 — 360명 ÷ 40명은 9대로 딱 맞아
        // 버림해도 아무도 안 남는다 (Codex 21차 #1). 나누어떨어지면 1~9를 더한다 (k ≥ 20이라 나머지가 1~9가 된다)
        const nBus = N % k ? N : N + int(r, 1, 9);
        const nPack = N % 10 ? N : N + int(r, 1, 9);
        const v = pickNat(r, '천') / M;
        const ok = { bus: '올림', pack: '버림', pay: '올림', swap: '버림', crowd: '반올림' }[kind];
        const sit = {
          bus: `학생 ${nBus}명이 한 대에 ${k}명씩 타는 버스를 빌려요. 몇 대를 빌릴지 정하려면`,
          pack: `사탕 ${nPack}개를 10개씩 봉지에 담아 팔아요. 팔 수 있는 봉지 수를 세려면`,
          pay: `물건값 ${v}원을 1000원짜리 지폐로만 내요. 낼 돈을 정하려면`,
          swap: `동전 ${v}원을 1000원짜리 지폐로 바꿔요. 바꿀 수 있는 돈을 정하려면`,
          crowd: `관객 ${v}명을 "약 몇천 명"이라고 가장 가깝게 말하려면`,
        }[kind];
        const others = ['올림', '버림', '반올림'].filter((x) => x !== ok);
        const tagOf = (x) => (ok === '올림' && x === '버림' ? TAGS.useDown : ok === '버림' && x === '올림' ? TAGS.useUp : TAGS.wrongMethod);
        return {
          t: `${sit} 어떤 어림 방법이 알맞을까요?`,
          text: true, ans: ok,
          wr: others.map((x) => ({ text: x, tag: tagOf(x) })),
          steps: [{ 올림: '모자라면 안 돼요', 버림: '다 찬 것만 셀 수 있어요', 반올림: '가장 가까운 수로 말해요' }[ok], `→ ${ok}`],
          why: {
            [TAGS.useDown]: '버림하면 모자라요 — 남는 사람이나 모자란 돈이 생겨요.',
            [TAGS.useUp]: '올림하면 덜 찬 것까지 세요 — 덜 찬 봉지나 모자란 돈이 생겨요.',
            [TAGS.wrongMethod]: `이 상황은 ${{ 올림: '모자라면 안 되니까 올림', 버림: '다 찬 것만 세니까 버림', 반올림: '가장 가까운 수로 말하니까 반올림' }[ok]}이에요.`,
          },
          probe: { method: kind },
        };
      })));
      // ⭐ 거꾸로 — 반올림해서 R이 되는 자연수의 가장 작은·큰 수
      fams.push(famOf(['십', '백'].flatMap((p) => ['작은', '큰'].map((side) => {
        const u = PLACE[p] / M;
        const R = (p === '십' ? int(r, 12, 98) : int(r, 12, 98)) * u;
        const ans = side === '작은' ? R - u / 2 : R + u / 2 - 1;
        const wr = side === '작은'
          ? [{ text: String(R), tag: TAGS.revSame }, { text: String(R - u + 1), tag: TAGS.revMode }, { text: String(R - u / 2 + 1), tag: TAGS.edgeOut }]
          : [{ text: String(R), tag: TAGS.revSame }, { text: String(R + u - 1), tag: TAGS.revMode }, { text: String(R + u / 2), tag: TAGS.edgeIn }];
        return {
          t: `반올림하여 ${placeText(p)} 나타내면 ${jn(R, '이', '가')} 되는 자연수 중에서 가장 ${side} 수는 얼마일까요?`,
          ans: String(ans), wr,
          steps: [`반올림하여 ${jn(R, '이', '가')} 되는 수: ${R - u / 2} 이상 ${R + u / 2} 미만`, `그중 가장 ${side} 자연수 → ${ans}`],
          why: {
            [TAGS.revSame]: `${jn(R, '은', '는')} 반올림한 결과예요. ${side === '작은' ? `${R}보다 작은 수도 반올림하면 ${jn(R, '이', '가')} 돼요` : `${R}보다 큰 수도 반올림하면 ${jn(R, '이', '가')} 돼요`} → ${ans}.`,
            [TAGS.revMode]: `그건 ${side === '작은' ? '올림' : '버림'}하면 ${jn(R, '이', '가')} 되는 수예요. 반올림은 바로 아래가 5부터 올라가요 → ${ans}.`,
            [TAGS.edgeOut]: `${R - u / 2}도 반올림하면 ${jn(R, '이', '가')} 돼요 — 바로 아래가 5라서 올려요.`,
            [TAGS.edgeIn]: `${jn(R + u / 2, '은', '는')} 반올림하면 ${jn(R + u, '이', '가')} 돼요 — 바로 아래가 5라서 올라가요.`,
          },
          probe: { reverse: [R, p, side] },
        };
      }))));
      // ⭐ 거꾸로 — 수의 범위로
      fams.push(famOf(['십', '백'].map((p) => {
        const u = PLACE[p] / M;
        const R = int(r, 12, 98) * u;
        const ans = rangeWords(R - u / 2, '이상', R + u / 2, '미만');
        return {
          t: `반올림하여 ${placeText(p)} 나타내면 ${jn(R, '이', '가')} 되는 수의 범위는 어느 것일까요?`,
          text: true, ans,
          wr: [
            { text: rangeWords(R - u / 2, '이상', R + u / 2, '이하'), tag: TAGS.edgeIn },
            { text: rangeWords(R - u / 2, '초과', R + u / 2, '미만'), tag: TAGS.edgeOut },
            { text: rangeWords(R, '이상', R + u, '미만'), tag: TAGS.revMode },
          ],
          steps: [`${R - u / 2}부터 반올림하면 ${jn(R, '이', '가')} 돼요 (5부터 올림) · ${jn(R + u / 2, '은', '는')} ${jn(R + u, '이', '가')} 돼요`, `→ ${ans}`],
          why: {
            [TAGS.edgeIn]: `${jn(R + u / 2, '은', '는')} 반올림하면 ${jn(R + u, '이', '가')} 되니까 들어가지 않아요 → 미만.`,
            [TAGS.edgeOut]: `${R - u / 2}도 반올림하면 ${jn(R, '이', '가')} 되니까 들어가요 → 이상.`,
            [TAGS.revMode]: `그건 버림하면 ${jn(R, '이', '가')} 되는 범위예요. 반올림은 ${R}의 양쪽으로 반씩이에요 → ${ans}.`,
          },
          probe: { reverseRange: [R, p] },
        };
      })));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['bus', 'pack']) === 'bus') {
        const k = pick(r, [20, 30, 40]); const q = int(r, 3, 7); const rem = int(r, 1, Math.floor(k / 2) - 1);
        const N = k * q + rem;
        const q2 = `{mon/이/가} 이렇게 말했어요.\n\n**학생 ${N}명이 ${k}명씩 타는 버스를 타요. 버스 ${q}대에 ${k * q}명이 타니까 ${q}대면 돼요**\n\n어디가 틀렸을까요?`;
        const chs = textChoices(r, `${rem}명이 남아서 못 타요 — 올림해서 ${q + 1}대`, [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `반올림해서 ${q}대가 맞아요`, tag: TAGS.wrongMethod },
          { text: '버스는 한 대만 있으면 돼요', tag: OFF },
        ]);
        return {
          ...misreadAsk(this.id, 'bus', fill(q2, c), chs, {
            solve: solve([step(0, `${k} × ${q} = ${k * q} → ${N} − ${k * q} = ${rem}명이 남아요`), step(1, `모두 타야 하니까 올림 → ${q + 1}대`)], {
              whyAny: `${q}대면 ${rem}명이 못 타요. 모두 타야 할 때는 올림해요.`,
              rule: '모자라면 안 되면 올림.',
            }),
          }),
          probe: { need: [N, k, 'up'], shown: q },
        };
      }
      const v = pickNat(r, '십', (x, u) => digitAt(x, u / 10) >= 5); const N = v / M; const q = Math.floor(N / 10);
      const q2 = `{mon/이/가} 이렇게 말했어요.\n\n**사탕 ${N}개를 10개씩 봉지에 담으면 올림해서 ${q + 1}봉지를 팔 수 있어요**\n\n어디가 틀렸을까요?`;
      const chs = textChoices(r, `${q + 1}번째 봉지는 다 안 차요 — 버림해서 ${q}봉지`, [
        { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
        { text: `반올림해서 ${q + 1}봉지가 맞아요`, tag: TAGS.wrongMethod },
        { text: '봉지는 사탕 수만큼 있어야 해요', tag: OFF },
      ]);
      return {
        ...misreadAsk(this.id, 'pack', fill(q2, c), chs, {
          solve: solve([step(0, `10 × ${q} = ${10 * q} → ${N} − ${10 * q} = ${N - 10 * q}개가 남아요`), step(1, `다 찬 봉지만 팔 수 있으니까 버림 → ${q}봉지`)], {
            whyAny: `덜 찬 봉지까지 셌어요. 다 찬 것만 셀 때는 버림해요.`,
            rule: '다 찬 것만 세면 버림.',
          }),
        }),
        probe: { need: [N, 10, 'down'], shown: q + 1 },
      };
    },
  },
];

export function conceptById(id) {
  return RANGE.find((c) => c.id === id) || null;
}

// ───────────────────── 문항 만들기 (mathfac·mathdec와 같은 모양) ─────────────────────

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
const SLIP = '한 번 더 천천히 — 경계의 수와 구하려는 자리부터 봐요.';

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
  return diagnosticOf(RANGE, makeQuestion, seed, n, opts);
}
export function placeFrom(answers) {
  return placeFromOf(RANGE, answers);
}
export function ladder(doneIds) {
  return ladderOf(RANGE, doneIds);
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
 * coach/math/range.json 형식 검사 — mathfac.checkContent와 같은 규칙
 * @returns {string[]}
 */
export function checkContent(content) {
  const bad = [];
  for (const c of RANGE) {
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
