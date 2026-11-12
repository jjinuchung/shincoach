// 🎣 낚시터 수학 ✍️ 직접 쓰기 (v418, 2026-11-12 아버님 「낚시에서 나오는 수학 문제들을 주관식으로」 → 기본안 「추천대로」) — 순수 · 화면 없음
// 숫자판 칸·채점은 수학 과목과 같은 mathpad.js(padSpec·readTyped·matchTyped) · 그리기는 padview.js · 잇기는 fishview(카드)·lakeview(문제 고르기)
//   🔢 배운 칸: math.journeyMathSource(make의 opt.typed)가 계산 문제만 padSpec으로 pad를 붙인다
//   🐟 물고기 수학·📐 다지기: 보기가 모두 같은 단위의 수(「12.3 cm」「1380 g」「3마리」)면 단위를 떼어 수 칸 하나 + 칸 옆 단위 (numPad)
//   말로 고르는 문제(무엇이 틀렸을까·왜·가장 긴 물고기·다음 중)는 낚시터에서 안 낸다 — 숫자로 낼 문제가 하나도 없을 때만 보기 그대로(lakeview)
// pad = { spec(padSpec 꼴), texts(보기마다 숫자판 말로 — 단위 뗀 글), keepDen?, known?[{ text, tag, hint }](화면에 없는 오개념 오답 후보), why?(짐작한 답에 줄 한 줄) }
import { CHOICE_WORDS, textVal, padSpec, matchTyped } from './mathpad.js';
import { mathHint } from './lakelevel.js';

/**
 * 🔢 배운 칸 계산 문제 → 숫자판 꼴 (math.journeyMathSource가 make의 opt.typed일 때 부른다) · 숫자판으로 못 받는 문제(padSpec null — 보기에서 고르는 말·식 답)는 null
 * 보기 글 그대로 견준다 · 화면에 없는 오개념 후보(probe)도 그 실수의 풀이로 · 짐작한 답엔 어느 오답이든 같은 풀이(whyAny)
 */
export function learnedPad(q, stemKey = '') {
  const spec = padSpec(q, stemKey);
  if (!spec) return null;
  return {
    spec,
    texts: q.choices.map((c) => String(c.text)),
    keepDen: !!q.keepDen,
    known: ((q.probe && q.probe.allWrong) || []).filter((w) => w && w.tag).map((w) => ({ text: String(w.text), tag: w.tag, hint: mathHint(q, { ok: false, tag: w.tag }) })),
    why: mathHint(q, { ok: false }),
  };
}

/** 「12.3 cm」「1380 g」「3마리」「−5」 → { n: 수 글, u: 단위('' = 없음) } · 수 하나와 단위 말이 아니면(분수·식·이름) null */
export function numUnit(text) {
  const m = /^([+−-]?\d+(?:\.\d+)?)\s*([^\d\s.:/…+−-][^\d]*)?$/.exec(String(text == null ? '' : text).trim());
  return m ? { n: m[1], u: (m[2] || '').trim() } : null;
}

/**
 * 🐟·📐 문제 → 숫자판 꼴 · 보기가 모두 같은 단위의 수일 때만(아니면 null — 물고기 이름을 고르는 문제 등)
 * why = 짐작한 답(어느 보기와도 다름)에 보일 풀이 한 줄(문제의 solve)
 */
export function numPad(q) {
  if (!q || !Array.isArray(q.choices) || q.choices.length < 2 || q.choices.filter((c) => c && c.ok).length !== 1) return null;
  if (CHOICE_WORDS.test(String(q.text || q.q || ''))) return null;
  const xs = q.choices.map((c) => numUnit(c && c.text));
  if (xs.some((x) => !x || !textVal(x.n))) return null;
  const u = xs[0].u;
  if (xs.some((x) => x.u !== u)) return null;
  return {
    spec: { modes: ['num'], start: 'num', unit: u, signed: xs.some((x) => /^[+−-]/.test(x.n)), need: null, reduce: false },
    texts: xs.map((x) => x.n),
    why: q.solve ? `풀이: ${String(q.solve)}` : '',
  };
}

/** 친 답 글에 단위를 붙여 보이기 — 한글 단위(마리)는 붙여서 · 영문 단위(cm)는 띄워서 · %는 이미 붙어 있다 */
export function shownTyped(text, unit = '') {
  const t = String(text || '');
  if (!unit || unit === '%' || /%$/.test(t)) return t;
  return /^[가-힣]/.test(unit) ? `${t}${unit}` : `${t} ${unit}`;
}

/**
 * 친 답 → 채점 (정답 판정은 수학 과목과 같다 — matchTyped: 값이 같으면 맞음 · 꼴을 묻는 문제는 꼴까지 · 오답 보기와 같은 값이면 그 실수)
 * → { ok, i(고른 보기 번호 · -1 = 어느 보기도 아님), hint(틀렸을 때 한 줄 · 없으면 ''), note(맞았을 때 한 줄 · 없으면 null), trap?(그 실수 — 📐 기록), guess(어느 보기·후보와도 다른 짐작) }
 */
export function lakeTyped(q, typed) {
  const p = q && q.pad;
  if (!p || !Array.isArray(p.texts) || !typed || !typed.val) return { ok: false, i: -1, hint: '', note: null, guess: true };
  const choices = q.choices.map((c, i) => ({ text: p.texts[i], ok: !!(c && c.ok) }));
  const known = Array.isArray(p.known) ? p.known : [];
  const res = matchTyped({ choices, keepDen: !!p.keepDen, probe: { allWrong: known } }, typed, p.spec || {});
  if (res.i >= 0) {
    const c = q.choices[res.i];
    if (c.ok) return { ok: true, i: res.i, hint: '', note: res.note || null, guess: false };
    return { ok: false, i: res.i, hint: c.hint || p.why || '', note: null, ...(c.trap ? { trap: c.trap } : {}), guess: false };
  }
  const k = res.reason === 'known' && res.known ? known.find((w) => w.tag === res.known.tag) : null;
  return { ok: false, i: -1, hint: res.note || (k && k.hint) || p.why || '', note: null, guess: res.reason === 'none' };
}
