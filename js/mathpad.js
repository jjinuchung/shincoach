// 🔢 수학 — 숫자판(주관식) 답칸의 순수 로직: 어떤 칸을 보여 줄지 · 친 칸을 답 글로 · 답 글을 보기 번호로.
// 화면 없음 (node 테스트에서 그대로 돈다). 화면은 math.js가 이 결과로 그린다.
//
// 왜 (2026-10-01, 아버님 사진 — 📊 수학 기록): 분수 ÷ 분수 ① 계산이 6/30(20%)으로 찍어도 나오는 25%보다 낮고,
// 오답이 세 오개념에 9·9·8로 고르게 흩어졌다 = 보기를 찍고 있었다. 수가 답인 ① 계산은 숫자판으로 직접 쓴다.
//
// ★ 오개념 진단은 그대로 산다: 친 값이 오답 보기의 값과 같으면 그 보기를 고른 것으로 친다(이름표가 그대로 쌓인다).
//   어느 보기와도 안 같으면 "짐작한 답"(i = -1) — 오개념 집계에는 안 넣고 친 답만 남긴다.
// ★ 칸은 [수] [분수] (대분수가 나오는 문제면 [대분수])를 아이가 바꾼다 — 분수 × 자연수의 정답은 자연수 6인데
//   "분모에도 곱함" 오답은 18/27이다. 정답 꼴로 칸을 고정하면 그 오개념을 칠 수가 없다.
//   처음 칸은 **보기 전체에서 가장 많은 꼴**이다 — 어느 보기가 정답인지와 상관없어서 칸이 답을 흘리지 않는다.
// ★ 꼴을 묻는 문제("대분수로", "소수로", "기약분수로", "약분하면", "간단한 자연수의 비")는 값이 같아도 꼴까지 맞아야 한다.
//   꼴을 안 묻는 문제에서 약분이 덜 된 답은 맞음 + 한 줄 안내 (아버님 결정 a).

/** 최대공약수 */
function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}
/** 기약 유리수 {n, d} (부호는 n에) */
function rat(n, d = 1) {
  if (d < 0) { n = -n; d = -d; }
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}
/** "12.05" → 1205/100 (떠돌이 소수 오차 없이) */
function decRat(s) {
  const [i, f = ''] = String(s).split('.');
  return rat(Number(i + f), 10 ** f.length);
}
const same = (x, y) => x.n * y.d === y.n * x.d;

/**
 * 보기·답 글 → 값. 수가 아닌 글(문장·이름·식)은 null.
 *   "6" "0.17" "−5" "+3" "69%" → {form:'num', v, pct}
 *   "1/3" "−1/2" → {form:'frac', v, reduced}
 *   "2 1/6" → {form:'mixed', v}
 *   "2 : 4" "24 : 1.5" → {form:'ratio', a, b}
 */
export function textVal(text) {
  const s = String(text == null ? '' : text).trim().replace(/−/g, '-').replace(/\s+/g, ' ');
  let m;
  if ((m = /^(\d+(?:\.\d+)?) ?: ?(\d+(?:\.\d+)?)$/.exec(s))) return { form: 'ratio', a: decRat(m[1]), b: decRat(m[2]) };
  if ((m = /^([+-]?)(\d+) (\d+)\/(\d+)$/.exec(s))) {
    if (+m[4] === 0) return null;
    const v = rat(+m[2] * +m[4] + +m[3], +m[4]);
    // proper: 자연수 부분 1 이상 · 분수 부분 1보다 작음 — "대분수로"를 물었을 때 0 17/4·3 5/4를 맞음으로 치지 않게 (Codex 18차 #2)
    return { form: 'mixed', v: m[1] === '-' ? rat(-v.n, v.d) : v, proper: +m[2] >= 1 && +m[3] > 0 && +m[3] < +m[4] };
  }
  if ((m = /^([+-]?)(\d+)\/(\d+)$/.exec(s))) {
    if (+m[3] === 0) return null;
    return { form: 'frac', v: rat((m[1] === '-' ? -1 : 1) * +m[2], +m[3]), reduced: gcd(+m[2], +m[3]) === 1 };
  }
  if ((m = /^([+-]?)(\d+(?:\.\d+)?)(%?)$/.exec(s))) {
    const v = decRat(m[2]);
    return { form: 'num', v: m[1] === '-' ? rat(-v.n, v.d) : v, pct: !!m[3] };
  }
  return null;
}

/** 두 값이 같은가 — 비는 두 수가 그대로 같을 때만(2 : 4와 1 : 2는 다른 답이다) */
function sameVal(x, y) {
  if (!x || !y) return false;
  if (x.form === 'ratio' || y.form === 'ratio') return x.form === y.form && same(x.a, y.a) && same(x.b, y.b);
  return same(x.v, y.v);
}

/** 칸 옆에 적어도 되는 단위 — 목록 밖의 말("몇 판하고 몇 조각")은 적지 않는다 */
const UNITS = new Set(['cm³', 'm³', 'cm²', 'm²', 'km²', 'mm', 'cm', 'm', 'km', 'mL', 'L', 'kg', 'g', '°', '도', '개', '명', '배', '번째', '번', '병', '통', '판', '장', '권', '원', '분', '초', '시간', '살', '마리', '칸', '리터', '조각', '쪽', '층', '걸음', '점']);
/**
 * 질문 끝의 단위 — 칸 옆에 적는다 ("몇 cm²일까요?" → cm², "몇 도" → °, "몇 개씩" → 개). 없으면 ''.
 * 백분율을 묻는 문제는 %.
 */
export function unitOf(text) {
  const s = String(text || '');
  if (/백분율로|%로 나타내|몇 ?%/.test(s)) return '%';
  const m = /몇 ([^\s?]+)/.exec(s.split('\n').filter(Boolean).pop() || '');
  if (!m) return '';
  const w = m[1].replace(/(일까요|인가요|이에요|예요|을|를|이|가|씩|만큼|은|는|쯤)$/, '');
  const u = w === '도' ? (/각/.test(s) ? '°' : '도') : w; // 각이면 °, 온도(음수 줄기)면 "도"
  return UNITS.has(u) ? u : '';
}

const FORM_NAME = { num: '수', frac: '분수', mixed: '대분수', ratio: '비' };

/**
 * 보기에서 고르는 문제의 말 (2026-10-05, 아버님 사진 — "다음 중 45의 약수가 아닌 수는 어느 것일까요?"에 숫자판이 떠 보기가 사라졌다).
 * 고를 것이 보기에만 있거나(다음 중 가장 작은 수 · 약수가 아닌 수), 맞는 답이 여럿이라(비율이 같은 비 · 될 수 있는 배수 · 공배수가 아닌 것)
 * 친 답을 정답 보기 하나와만 견줄 수 없다 → 숫자판 대신 보기 그대로. "막대를 고르게 하면"(평균)은 고르기가 아니다
 */
export const CHOICE_WORDS = /다음 중|어느 것|어떤 것|보기 중|고르세요|골라/;

/**
 * 이 문항을 숫자판으로 받을지와 칸 모양. 수가 답인 ① 계산만 — 아니면 null (보기를 그대로 쓴다).
 * @param {{kind:string, q:string, expr?:string, choices:Array<{text:string, ok?:boolean}>}} q
 * @param {string} stemKey 줄기 (음수 줄기는 +/− 키)
 * @returns {null | {modes:string[], start:string, unit:string, signed:boolean, need:string|null, reduce:boolean}}
 *   need: 꼴을 묻는 문제의 꼴('num'|'frac'|'mixed'|'ratio') · reduce: 끝까지 약분해야 하나
 */
export function padSpec(q, stemKey = '') {
  if (!q || q.kind !== 'calc' || !Array.isArray(q.choices)) return null;
  if (CHOICE_WORDS.test(String(q.q || ''))) return null; // 보기에서 고르는 문제는 보기 그대로
  const ok = q.choices.find((c) => c.ok);
  const okV = ok && textVal(ok.text);
  if (!okV) return null;
  const text = `${q.q || ''}\n${q.expr || ''}`.replace(/\[[a-z]+ [^\]]*\]/g, ' '); // 그림 지시문의 수는 빼고
  const vals = q.choices.map((c) => textVal(c.text)).filter(Boolean);
  if (okV.form === 'ratio') return { modes: ['ratio'], start: 'ratio', unit: '', signed: false, need: 'ratio', reduce: false };
  // "약분해서 나타내면"을 못 알아봐 4/10·0.4가 맞음이 됐다 (Codex 18차 #1) — 약분하면·약분해서·약분하여 모두
  const need = /대분수로/.test(text) ? 'mixed' : /분수로|기약분수|약분(하면|해서|하여)/.test(text) ? 'frac' : /소수로|백분율로/.test(text) ? 'num' : null;
  const reduce = /기약분수|약분(하면|해서|하여)|가장 간단한/.test(text);
  const hasMixed = need === 'mixed' || /대분수|\d+ \d+\/\d+/.test(text) || vals.some((v) => v.form === 'mixed');
  const modes = hasMixed ? ['num', 'frac', 'mixed'] : ['num', 'frac'];
  // 처음 칸 — 보기 전체에서 가장 많은 꼴 (정답이 어느 것인지와 상관없게). 같으면 문제 글에 분수가 있을 때 분수
  const count = { num: 0, frac: 0, mixed: 0 };
  for (const v of vals) if (v.form in count) count[v.form] += 1;
  const top = Object.entries(count).sort((a, b) => b[1] - a[1]);
  const start = need || (top[0][1] > top[1][1] ? top[0][0] : /\d+\/\d+/.test(text) ? 'frac' : 'num');
  const signed = stemKey === 'negative' || stemKey === 'expr' || stemKey === 'equation' || stemKey === 'coord' || q.choices.some((c) => /^[+−-]\d/.test(String(c.text).trim()));
  return { modes, start: modes.includes(start) ? start : 'num', unit: unitOf(q.q), signed, need, reduce };
}

/** "007" → "7", "0.50" → "0.5", "3." → "3" (쓴 그대로의 수를 보기 글 모양으로) */
function cleanNum(s) {
  let t = String(s || '');
  if (!/^\d*\.?\d*$/.test(t) || !/\d/.test(t)) return null;
  if (t.includes('.')) t = t.replace(/0+$/, '').replace(/\.$/, '');
  t = t.replace(/^0+(?=\d)/, '');
  if (t.startsWith('.')) t = `0${t}`;
  return t;
}
const intOf = (s) => (/^\d+$/.test(String(s || '')) ? String(Number(s)) : null);

/**
 * 친 칸 → 답 글과 값. 덜 쳤거나 말이 안 되면(분모 0) null — 화면은 "확인"을 잠근다.
 * @param {string} mode 'num'|'frac'|'mixed'|'ratio'
 * @param {{sign?:string, x?:string, w?:string, n?:string, d?:string, a?:string, b?:string}} p 칸마다 친 글자
 * @param {{unit?:string}} spec
 * @returns {null | {text:string, val:object}}
 */
export function readTyped(mode, p, spec = {}) {
  const sign = p.sign === '-' ? '−' : p.sign === '+' ? '+' : '';
  let text = null;
  if (mode === 'num') { const x = cleanNum(p.x); if (x !== null) text = `${sign}${x}${spec.unit === '%' ? '%' : ''}`; }
  else if (mode === 'frac') { const n = intOf(p.n); const d = intOf(p.d); if (n !== null && d !== null && +d > 0) text = `${sign}${n}/${d}`; }
  else if (mode === 'mixed') { const w = intOf(p.w); const n = intOf(p.n); const d = intOf(p.d); if (w !== null && n !== null && d !== null && +d > 0) text = `${sign}${w} ${n}/${d}`; }
  else if (mode === 'ratio') { const a = cleanNum(p.a); const b = cleanNum(p.b); if (a !== null && b !== null) text = `${a} : ${b}`; }
  if (text === null) return null;
  const val = textVal(text);
  return val ? { text, val } : null;
}

const norm = (t) => String(t).replace(/−/g, '-').replace(/\s*:\s*/g, ' : ').replace(/\s+/g, ' ').trim();

/**
 * 친 답 → 고른 보기. 같은 글 → 정답과 같은 값(꼴을 묻는 문제면 꼴까지) → 오답 보기와 같은 값 → 짐작한 답(-1).
 * @param {{choices:Array<{text:string, ok?:boolean}>}} q
 * @param {{text:string, val:object}} typed readTyped의 결과
 * @param {{need?:string|null, reduce?:boolean}} spec padSpec의 결과
 * @returns {{i:number, note:string|null, reason?:string}} i = 보기 번호(-1이면 어느 보기도 아님) · note = 한 줄 안내 ·
 *   reason(i가 -1일 때): 'form' 값은 맞는데 꼴이 다름 · 'reduce' 약분이 덜 됨 · 'none' 어느 보기와도 다른 짐작한 답
 *   (꼴·약분은 "짐작"이 아니다 — 값은 안다. 📊에 짐작으로 적히던 것, Codex 18차 #4)
 */
export function matchTyped(q, typed, spec = {}) {
  const choices = q.choices || [];
  const okI = choices.findIndex((c) => c.ok);
  const ok = choices[okI];
  const okV = textVal(ok && ok.text);
  const v = typed.val;
  // 꼴을 묻는 문제 — 값이 같아도 꼴이 다르면 틀림 (0.5를 "분수로" 물었는데 0.5라고 쓰면 안 된다)
  if (sameVal(v, okV) && spec.need && v.form !== spec.need) {
    return { i: -1, note: `${FORM_NAME[spec.need]}로 나타내야 해요 — ${ok.text}`, reason: 'form' };
  }
  if (sameVal(v, okV) && spec.need === 'mixed' && v.form === 'mixed' && !v.proper) {
    return { i: -1, note: `대분수는 앞의 자연수가 1 이상이고 분수 부분이 1보다 작아야 해요 — ${ok.text}`, reason: 'form' };
  }
  if (sameVal(v, okV) && spec.reduce && v.form === 'frac' && !v.reduced) {
    return { i: -1, note: `끝까지 약분해야 해요 — ${ok.text}`, reason: 'reduce' };
  }
  const exact = choices.findIndex((c) => norm(c.text) === norm(typed.text));
  if (exact >= 0) return { i: exact, note: null };
  if (sameVal(v, okV)) {
    // 약분 안내는 값을 끝까지 약분한 꼴로 (정답 글이 6/8처럼 일부러 약분 안 한 것일 수도 있다 — 분수의 뜻)
    const low = `${v.v.n < 0 ? '−' : ''}${Math.abs(v.v.n)}/${v.v.d}`;
    const note = v.form === 'frac' && !v.reduced && okV.form === 'frac' && v.v.d !== 1 ? `맞아요! 약분하면 ${low} — 다음엔 끝까지 약분해요`
      : v.form !== okV.form && (v.form === 'mixed' || okV.form === 'mixed') ? `맞아요! ${ok.text}로 써도 같아요` : null;
    return { i: okI, note };
  }
  const wrong = choices.findIndex((c) => !c.ok && sameVal(v, textVal(c.text)));
  return wrong >= 0 ? { i: wrong, note: null } : { i: -1, note: null, reason: 'none' };
}

/** 보기 글 → 그 꼴의 칸에 친 글자 (테스트·헤드리스 도우미가 "정답을 쳐 본다") */
export function partsOf(text) {
  const s = String(text).trim().replace(/−/g, '-');
  const sign = s.startsWith('-') ? '-' : s.startsWith('+') ? '+' : '';
  const b = s.replace(/^[+-]/, '').replace(/%$/, '');
  let m;
  if ((m = /^(\d+(?:\.\d+)?) ?: ?(\d+(?:\.\d+)?)$/.exec(b))) return { mode: 'ratio', p: { a: m[1], b: m[2] } };
  if ((m = /^(\d+) (\d+)\/(\d+)$/.exec(b))) return { mode: 'mixed', p: { sign, w: m[1], n: m[2], d: m[3] } };
  if ((m = /^(\d+)\/(\d+)$/.exec(b))) return { mode: 'frac', p: { sign, n: m[1], d: m[2] } };
  if (/^\d+(\.\d+)?$/.test(b)) return { mode: 'num', p: { sign, x: b } };
  return null;
}
