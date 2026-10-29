// 🐾 포켓몬 수학 (v364, 2026-10-29 아버님 「이대로」 — 기본안 YPhyv33x6uCnJd8H5n78x1) — 문제 만들기 (순수 · 화면 없음)
// 진우가 잡은 포켓몬의 도감 숫자(키·몸무게)와 앱 가게 값으로 푸는 4학년 수학 한 판 · 화면은 mathpokeview.js · 판 끝 저장·보상은 mathprog.pokeCommit
// 숫자 원고 coach/math/pokemath.json (tools/pokemath_data.mjs — PokeAPI height dm · weight hg 그대로: 키·몸무게를 「십분의 일」 정수로 셈 → 소수 한 자리)
//  · 4학년만: 소수 크기 비교·덧셈·뺄셈 · 길이·무게 단위 · 큰 수 읽기 · (세 자리)×(두 자리) · (세 자리)÷(두 자리) · 막대그래프 읽기
//    (소수×자연수·소수÷자연수는 5학년 — 「3마리면 몇 kg?」은 내지 않는다)
//  · 보기는 넷(크기 비교는 포켓몬 셋) — 틀린 보기마다 그 실수(trap)가 있고, 고르면 그 실수에 맞춘 힌트(hints[trap]) · 두 번 틀리면 풀이(solve)
//  · 기술 위력·종족값은 쓰지 않는다(게임마다 숫자가 달라 사실이 흔들린다)
import { rng as makeRng, shuffle, pick } from './mathgen.js';
import { GEAR, POTION, GREATBALL, ULTRABALL, CALL_PAL } from './items.js';

/** 한 판 문제 수 */
export const POKE_N = 5;
/** 판에 낼 꼴 — 이름은 아이 화면 머리 줄(셈 없음) */
export const POKE_KINDS = {
  cmp: { icon: '📏', ko: '소수 크기 비교' },
  sub: { icon: '➖', ko: '소수의 뺄셈' },
  add: { icon: '➕', ko: '소수의 덧셈' },
  unit: { icon: '📐', ko: '단위 바꾸기' },
  big: { icon: '🔢', ko: '큰 수 읽기' },
  mul: { icon: '✖️', ko: '곱셈' },
  div: { icon: '➗', ko: '나눗셈' },
  bar: { icon: '📊', ko: '막대그래프' },
};
export const POKE_KIND_LIST = Object.keys(POKE_KINDS);
/** 곱셈·나눗셈에 쓰는 가게 물건 — 💰로 사는 볼·물약·동료 부르기·꾸미기만 (염색약 「파랑」·시간 연장권·알·스톤은 뺀다 — 이름만 보고 물건인지 헷갈리거나 💰로 사지 않는다) */
export const POKE_GOODS = [GREATBALL, ULTRABALL, ...POTION, CALL_PAL, ...GEAR].map((x) => ({ ko: x.ko, emoji: x.emoji, price: x.price }));
/** 잡은 포켓몬이 모자랄 때(넷 아래) 쓰는 흔한 포켓몬 — 앱 명단 앞쪽 */
export const POKE_FALLBACK = [25, 133, 4, 5, 6, 7, 8, 9, 1, 39, 52, 54];

const HIGH = 30; // 키 3 m까지(30 dm) — 문제 숫자가 너무 크지 않게
const HEAVY = 1000; // 몸무게 100 kg까지(1000 hg)

/** 십분의 일 정수 → 글자 (15 → "1.5" · 70 → "7" · 3 → "0.3") */
export function tenth(t) {
  const n = Math.round(Number(t));
  return n % 10 ? `${Math.floor(n / 10)}.${n % 10}` : String(n / 10);
}
/** 백분의 일 정수 → 글자 (12 → "0.12" · 120 → "1.2" — 끝의 0은 뗀다) */
function hundredth(h) {
  const n = Math.round(Number(h));
  if (n % 100 === 0) return String(n / 100);
  if (n % 10 === 0) return `${Math.floor(n / 100)}.${(n % 100) / 10}`;
  return `${Math.floor(n / 100)}.${String(n % 100).padStart(2, '0')}`;
}

/** 세로 셈 두 줄 — 자연수에도 「.0」을 붙여 소수 자리 수를 맞춘다 (화면은 기호 칸·수 칸을 따로 두고 수를 오른쪽에 맞춘다 → 소수점이 한 줄) */
export function colRows(col) {
  const pad = (s) => (String(s).includes('.') ? String(s) : `${s}.0`);
  return [{ op: '', n: pad(col.a) }, { op: col.op, n: pad(col.b) }];
}

const DIGIT = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
function read4(x) {
  let s = '';
  for (const [u, k] of [[1000, '천'], [100, '백'], [10, '십'], [1, '']]) {
    const d = Math.floor(x / u) % 10;
    if (!d) continue;
    s += (d === 1 && u > 1 ? '' : DIGIT[d]) + k;
  }
  return s;
}
/** 1억 아래 수를 우리말로 (460000 → "사십육만" · 58000 → "오만 팔천" · 10000 → "만") */
export function readKo(n) {
  const v = Math.floor(Number(n));
  if (!Number.isSafeInteger(v) || v < 0 || v >= 100000000) return '';
  if (v === 0) return '영';
  const man = Math.floor(v / 10000);
  const rest = v % 10000;
  const head = man ? `${man === 1 ? '' : read4(man)}만` : '';
  return [head, rest ? read4(rest) : ''].filter(Boolean).join(' ');
}

/** 끝 글자의 받침 번호 (0 = 없음 · 한글이 아니면 0 — 「포리곤2」·「폴리곤Z」는 읽는 소리가 받침 없이 끝난다) */
function jong(word) {
  const c = String(word || '').trim().slice(-1).charCodeAt(0);
  return c >= 0xac00 && c <= 0xd7a3 ? (c - 0xac00) % 28 : 0;
}
const eun = (w) => `${w}${jong(w) ? '은' : '는'}`;
const iga = (w) => `${w}${jong(w) ? '이' : '가'}`;
const wagwa = (w) => `${w}${jong(w) ? '과' : '와'}`;
/** 「으로/로」 — 받침이 없거나 ㄹ이면 「로」 (리자몽으로 · 라이츄로) */
const euro = (w) => `${w}${jong(w) && jong(w) !== 8 ? '으로' : '로'}`;
/** 수 뒤 조사는 읽는 소리로 — 💰25 「이십오」예요 · 💰600 「육백」이에요 · 💰750 「칠백오십」으로 */
const numIda = (n) => (jong(readKo(n)) ? '이에요' : '예요');
/** 자연수 뒤 조사 — nj(13, '은', '는') → 「13은」(십삼) · nj(12, '은', '는') → 「12는」(십이) */
const nj = (n, b, nb) => `${n}${jong(readKo(n)) ? b : nb}`;
const numEuro = (n) => (jong(readKo(n)) && jong(readKo(n)) !== 8 ? '으로' : '로');

/**
 * 숫자 원고 고쳐 읽기 → Map(id → { h: dm, w: hg }) · 깨진 줄은 뺀다
 * @param {{mons?:Object}} json coach/math/pokemath.json
 */
export function dataOf(json) {
  const out = new Map();
  const mons = json && typeof json === 'object' && json.mons && typeof json.mons === 'object' ? json.mons : {};
  for (const [k, v] of Object.entries(mons)) {
    const id = Number(k);
    if (!Number.isSafeInteger(id) || id <= 0 || !Array.isArray(v)) continue;
    const [h, w] = v;
    if (Number.isSafeInteger(h) && h > 0 && Number.isSafeInteger(w) && w > 0) out.set(id, { h, w });
  }
  return out;
}

/**
 * 판에 쓸 포켓몬 → [{ id, ko, h, w }] — 잡은 포켓몬(caught 키) 가운데 숫자·이름이 있는 것 · 넷 아래면 흔한 포켓몬으로 채움
 * @param {Object} caught 프로필 caught ({ id: 수 })
 * @param {Map} data dataOf 결과 · @param {Map|Object} names id → 우리말 이름
 */
export function poolOf(caught, data, names) {
  const nm = (id) => (names instanceof Map ? names.get(id) : names && names[id]) || '';
  const mk = (id) => { const d = data.get(id); const ko = nm(id); return d && ko ? { id, ko, h: d.h, w: d.w } : null; };
  const own = Object.keys(caught && typeof caught === 'object' ? caught : {}).map(Number).filter((id) => Number(caught[id]) > 0).map(mk).filter(Boolean);
  if (own.length >= 4) return own;
  const have = new Set(own.map((x) => x.id));
  return [...own, ...POKE_FALLBACK.filter((id) => !have.has(id)).map(mk).filter(Boolean)];
}

/** 보기 넷 — 정답 하나 + 서로 다른 틀린 보기(먼저 온 실수부터) · 셋이 안 되면 null */
function optsOf(r, right, wrongs, want = 3) {
  const seen = new Set([right]);
  const bad = [];
  for (const w of wrongs) {
    if (!w || !w.t || seen.has(w.t)) continue;
    seen.add(w.t);
    bad.push(w);
    if (bad.length >= want) break;
  }
  if (bad.length < want) return null;
  return shuffle(r, [{ t: right, ok: true }, ...bad.map((w) => ({ t: w.t, ok: false, trap: w.trap }))]);
}

const MEAS = {
  h: { name: '키', unit: 'm', max: HIGH },
  w: { name: '몸무게', unit: 'kg', max: HEAVY },
};
const tag = (x, p) => `${MEAS[p].name} ${tenth(x[p])} ${MEAS[p].unit}`;

/** 📏 소수 크기 비교 — 셋 가운데 가장 큰(무거운)·작은(가벼운) · 자연수 부분이 같은 둘이 있게 먼저 고른다(소수 첫째 자리로 가르게) */
function makeCmp(r, pool) {
  const p = r() < 0.5 ? 'h' : 'w';
  const ok = pool.filter((x) => x[p] <= MEAS[p].max);
  for (let t = 0; t < 30; t++) {
    const a = pick(r, ok);
    if (!a) return null;
    const same = ok.filter((x) => x.id !== a.id && Math.floor(x[p] / 10) === Math.floor(a[p] / 10) && x[p] !== a[p]);
    const b = same.length ? pick(r, same) : pick(r, ok.filter((x) => x.id !== a.id && x[p] !== a[p]));
    if (!b) continue;
    const c = pick(r, ok.filter((x) => x.id !== a.id && x.id !== b.id && x[p] !== a[p] && x[p] !== b[p]));
    if (!c) continue;
    const three = shuffle(r, [a, b, c]);
    const big = r() < 0.5;
    const ans = three.reduce((m, x) => ((big ? x[p] > m[p] : x[p] < m[p]) ? x : m));
    const word = p === 'h' ? (big ? '키가 가장 큰' : '키가 가장 작은') : (big ? '가장 무거운' : '가장 가벼운');
    return {
      kind: 'cmp', mons: three.map((x) => ({ id: x.id, ko: x.ko, tag: tag(x, p) })),
      text: `${word} 포켓몬은 누구일까요?`,
      opts: shuffle(r, three.map((x) => (x === ans ? { t: x.ko, ok: true } : { t: x.ko, ok: false, trap: 'cmp' }))),
      hints: { cmp: '🤔 소수점 왼쪽 수(자연수 부분)부터 견주고, 같으면 소수 첫째 자리를 견줘요.' },
      solve: `${three.map((x) => `${x.ko} ${tenth(x[p])} ${MEAS[p].unit}`).join(' · ')} → ${ans.ko}`,
    };
  }
  return null;
}

/** 소수점을 맞추지 않고 끝자리끼리 맞춘 셈 — 자연수(소수 첫째 자리가 0)를 십분의 일로 읽은 값 (없으면 null) */
const misread = (t) => (t % 10 === 0 ? t / 10 : null);

/** ➖ 소수의 뺄셈 — 키·몸무게 차이 (둘 가운데 하나는 소수 첫째 자리가 있게) */
function makeSub(r, pool) {
  const p = r() < 0.5 ? 'h' : 'w';
  const ok = pool.filter((x) => x[p] <= MEAS[p].max);
  for (let t = 0; t < 40; t++) {
    const [x, y] = [pick(r, ok), pick(r, ok)];
    if (!x || !y || x.id === y.id || x[p] === y[p]) continue;
    const [a, b] = x[p] > y[p] ? [x, y] : [y, x];
    if (a[p] % 10 === 0 && b[p] % 10 === 0) continue; // 둘 다 자연수면 소수 셈이 아니다
    const d = a[p] - b[p];
    const u = MEAS[p].unit;
    const wr = [];
    wr.push({ t: `${tenth(a[p] + b[p])} ${u}`, trap: 'add' });
    const mb = misread(b[p]);
    const ma = misread(a[p]);
    if (mb !== null && a[p] - mb > 0) wr.push({ t: `${tenth(a[p] - mb)} ${u}`, trap: 'align' });
    else if (ma !== null && ma - b[p] > 0) wr.push({ t: `${tenth(ma - b[p])} ${u}`, trap: 'align' });
    wr.push({ t: `${tenth(d * 10)} ${u}`, trap: 'dot' });
    wr.push({ t: `${hundredth(d)} ${u}`, trap: 'shift' });
    wr.push({ t: `${tenth(d + 1)} ${u}`, trap: 'near' });
    const opts = optsOf(r, `${tenth(d)} ${u}`, wr);
    if (!opts) continue;
    const whole = a[p] % 10 === 0 ? a[p] : b[p] % 10 === 0 ? b[p] : null;
    return {
      kind: 'sub', mons: [a, b].map((m) => ({ id: m.id, ko: m.ko, tag: tag(m, p) })),
      text: p === 'h' ? `${eun(a.ko)} ${b.ko}보다 키가 몇 m 더 클까요?` : `${eun(a.ko)} ${b.ko}보다 몇 kg 더 무거울까요?`,
      opts,
      hints: {
        add: `🤔 「몇 ${u} 더」는 두 수의 차이예요 — 큰 수에서 작은 수를 빼요.`,
        align: `🤔 소수점을 맞춰서 세로로 써 볼까요?${whole !== null ? ` ${nj(whole / 10, '은', '는')} ${tenth(whole)}.0과 같아요.` : ''}`,
        dot: '🤔 답에도 소수점을 찍어요 — 소수점은 세로로 쓴 자리 그대로 내려와요.',
        shift: '🤔 소수 첫째 자리끼리 빼요 — 답의 소수점 자리를 다시 보세요.',
        near: '🤔 세로로 써서 한 자리씩 다시 빼 볼까요?',
      },
      col: { a: tenth(a[p]), b: tenth(b[p]), op: '−' },
      solve: `${tenth(a[p])} − ${tenth(b[p])} = ${tenth(d)} (${u})`,
    };
  }
  return null;
}

/** ➕ 소수의 덧셈 — 둘이 함께 저울에 (몸무게 · 하나는 소수 첫째 자리가 있게) */
function makeAdd(r, pool) {
  const ok = pool.filter((x) => x.w <= HEAVY);
  for (let t = 0; t < 40; t++) {
    const [a, b] = [pick(r, ok), pick(r, ok)];
    if (!a || !b || a.id === b.id) continue;
    if (a.w % 10 === 0 && b.w % 10 === 0) continue;
    const s = a.w + b.w;
    const wr = [];
    const ma = misread(a.w);
    const mb = misread(b.w);
    if (ma !== null) wr.push({ t: `${tenth(ma + b.w)} kg`, trap: 'align' });
    else if (mb !== null) wr.push({ t: `${tenth(a.w + mb)} kg`, trap: 'align' });
    if ((a.w % 10) + (b.w % 10) >= 10) wr.push({ t: `${tenth(s - 10)} kg`, trap: 'carry' });
    if (a.w !== b.w) wr.push({ t: `${tenth(Math.abs(a.w - b.w))} kg`, trap: 'sub' });
    wr.push({ t: `${tenth(s * 10)} kg`, trap: 'dot' });
    wr.push({ t: `${tenth(s + 10)} kg`, trap: 'near' });
    const opts = optsOf(r, `${tenth(s)} kg`, wr);
    if (!opts) continue;
    const whole = a.w % 10 === 0 ? a.w : b.w % 10 === 0 ? b.w : null;
    return {
      kind: 'add', mons: [a, b].map((m) => ({ id: m.id, ko: m.ko, tag: tag(m, 'w') })),
      text: `${wagwa(a.ko)} ${iga(b.ko)} 함께 저울에 올라가면 몇 kg일까요?`,
      opts,
      hints: {
        align: `🤔 소수점을 맞춰서 세로로 써 볼까요?${whole !== null ? ` ${nj(whole / 10, '은', '는')} ${tenth(whole)}.0과 같아요.` : ''}`,
        carry: '🤔 소수 첫째 자리끼리 더해 10이 되거나 넘으면 일의 자리로 1을 올려요.', // 5 + 5 = 10도 (Codex 168차 #2)
        sub: '🤔 함께 올라가면 두 몸무게를 더해요.',
        dot: '🤔 답에도 소수점을 찍어요 — 소수점은 세로로 쓴 자리 그대로 내려와요.',
        near: '🤔 세로로 써서 한 자리씩 다시 더해 볼까요?',
      },
      col: { a: tenth(a.w), b: tenth(b.w), op: '+' },
      solve: `${tenth(a.w)} + ${tenth(b.w)} = ${tenth(s)} (kg)`,
    };
  }
  return null;
}

/** 📐 단위 바꾸기 — 키 m → cm (1 m 이상 · 소수 첫째 자리가 있게) · 몸무게 kg → g (1 kg 이상 100 kg 아래 · 소수 첫째 자리가 있게) */
function makeUnit(r, pool, prefer) {
  const cm = r() < 0.5;
  const fit = cm ? (x) => x.h >= 10 && x.h <= HIGH && x.h % 10 : (x) => x.w >= 10 && x.w < HEAVY && x.w % 10;
  const ok = pool.filter(fit);
  const a = prefer && fit(prefer) && r() < 0.5 ? prefer : pick(r, ok);
  if (!a) return null;
  if (cm) {
    const v = a.h * 10; // cm
    const opts = optsOf(r, `${v} cm`, [
      { t: `${v / 10} cm`, trap: 'small' },
      { t: `${Math.floor(a.h / 10) * 100 + (a.h % 10)} cm`, trap: 'mix' },
      { t: `${v * 10} cm`, trap: 'big' },
    ]);
    if (!opts) return null;
    const rest = a.h % 10;
    return {
      kind: 'unit', mons: [{ id: a.id, ko: a.ko, tag: tag(a, 'h') }],
      text: `${a.ko}의 키 ${tenth(a.h)} m는 몇 cm일까요?`,
      tip: '💡 1 m = 100 cm', // 물음 밑에 처음부터 (쉬운 판 — Codex 168차)
      opts,
      hints: {
        small: '🤔 1 m는 100 cm예요 — 1 m가 넘으니 100 cm보다 커요.',
        mix: `🤔 0.${rest} m는 ${rest} cm가 아니라 ${rest * 10} cm예요 (0.1 m = 10 cm).`,
        big: '🤔 1 m = 100 cm예요 — 1000을 곱하지 않아요.',
      },
      solve: `${tenth(a.h)} m = ${Math.floor(a.h / 10)} m ${rest * 10} cm = ${v} cm`,
    };
  }
  const v = a.w * 100; // g
  const opts = optsOf(r, `${v} g`, [
    { t: `${v / 10} g`, trap: 'small' },
    { t: `${Math.floor(a.w / 10) * 1000 + (a.w % 10)} g`, trap: 'mix' },
    { t: `${v * 10} g`, trap: 'big' },
  ]);
  if (!opts) return null;
  const rest = a.w % 10;
  return {
    kind: 'unit', mons: [{ id: a.id, ko: a.ko, tag: tag(a, 'w') }],
    text: `${a.ko}의 몸무게 ${tenth(a.w)} kg은 몇 g일까요?`,
    tip: '💡 1 kg = 1000 g · 0.1 kg = 100 g', // 소수 kg → g는 교과서마다 직접 배운다는 보장이 없어 처음부터 (Codex 168차)
    opts,
    hints: {
      small: '🤔 1 kg은 1000 g이에요 — 0을 하나 더 붙여 볼까요?',
      mix: `🤔 0.${rest} kg은 ${rest} g이 아니라 ${rest * 100} g이에요 (0.1 kg = 100 g).`,
      big: '🤔 1 kg = 1000 g이에요 — 0의 개수를 다시 세어 봐요.',
    },
    solve: `${tenth(a.w)} kg = ${Math.floor(a.w / 10)} kg ${rest * 100} g = ${v} g`,
  };
}

/** 🔢 큰 수 읽기 — 몸무게를 g으로 (10 kg 이상 → 1만 g 이상) */
function makeBig(r, pool, prefer) {
  const fit = (x) => x.w >= 100;
  const ok = pool.filter(fit);
  const a = prefer && fit(prefer) && r() < 0.5 ? prefer : pick(r, ok);
  if (!a) return null;
  const g = a.w * 100;
  const opts = optsOf(r, readKo(g), [
    { t: readKo(g / 10), trap: 'less' },
    { t: readKo(g * 10), trap: 'more' },
    { t: g / 100 >= 100 ? readKo(g / 100) : readKo(g * 100), trap: g / 100 >= 100 ? 'less' : 'more' },
  ]);
  if (!opts) return null;
  const man = Math.floor(g / 10000);
  const rest = g % 10000;
  return {
    kind: 'big', mons: [{ id: a.id, ko: a.ko, tag: tag(a, 'w') }],
    text: `${a.ko}의 몸무게 ${tenth(a.w)} kg은 ${g} g이에요. ${g}을 읽으면?`,
    opts,
    hints: {
      less: `🤔 일의 자리부터 네 자리씩 끊어 읽어요 — ${man} | ${String(rest).padStart(4, '0')}`,
      more: `🤔 0이 몇 개인지 세어 보고, 일의 자리부터 네 자리씩 끊어요 — ${man} | ${String(rest).padStart(4, '0')}`,
    },
    solve: `${man} | ${String(rest).padStart(4, '0')} → ${readKo(g)}`,
  };
}

/** 가게 물건 고쳐 읽기 — [{ ko, emoji, price }] 가운데 값이 자연수인 것 */
function goodsOf(items) {
  return (Array.isArray(items) ? items : []).filter((x) => x && typeof x.ko === 'string' && x.ko && Number.isSafeInteger(x.price) && x.price > 0);
}

/** ✖️ 곱셈 — (세 자리 값) × (두 자리 개수, 10의 배수 아님) · 가게 값 */
function makeMul(r, pool, prefer, items) {
  const big = goodsOf(items).filter((x) => x.price >= 100 && x.price <= 999);
  const it = pick(r, big);
  if (!it) return null;
  const k = pick(r, [11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 24, 25]);
  const P = it.price;
  const v = P * k;
  const tens = Math.floor(k / 10);
  const ones = k % 10;
  const opts = optsOf(r, `💰${v}`, [
    { t: `💰${P * tens + P * ones}`, trap: 'place' },
    { t: `💰${v * 10}`, trap: 'zero' },
    { t: v % 10 === 0 ? `💰${v / 10}` : `💰${P * (k + 1)}`, trap: v % 10 === 0 ? 'zero' : 'near' },
    { t: `💰${P * (k + 1)}`, trap: 'near' },
  ]);
  if (!opts) return null;
  const a = prefer || pick(r, pool);
  return {
    kind: 'mul', mons: a ? [{ id: a.id, ko: a.ko, tag: '🛒 가게' }] : [],
    text: `🛒 ${[it.emoji, eun(it.ko)].filter(Boolean).join(' ')} 하나에 💰${P}${numIda(P)}. ${k}개를 사려면 💰 얼마가 들까요?`,
    opts,
    hints: {
      place: `🤔 ${nj(k, '은', '는')} ${tens}0과 ${ones}${numIda(ones)} — ${P} × ${tens}0과 ${P} × ${nj(ones, '을', '를')} 더해요.`,
      zero: '🤔 곱한 뒤 0의 개수를 다시 세어 봐요.',
      near: `🤔 ${P} × ${k}를 세로로 다시 계산해 볼까요? (${P} × ${tens}0 + ${P} × ${ones})`,
    },
    solve: `${P} × ${k} = ${P} × ${tens}0 + ${P} × ${ones} = ${P * tens * 10} + ${P * ones} = ${v}`,
  };
}

/** ➗ 나눗셈 — 💰(세 자리) ÷ (두 자리 값) · 나누어떨어지게 · 몫은 두 자리 */
function makeDiv(r, pool, prefer, items) {
  const two = goodsOf(items).filter((x) => x.price >= 10 && x.price <= 99);
  for (let t = 0; t < 30; t++) {
    const it = pick(r, two);
    if (!it) return null;
    const P = it.price;
    const ks = [];
    for (let k = 11; k <= 39; k++) if (P * k >= 100 && P * k <= 999) ks.push(k);
    if (!ks.length) continue;
    const k = pick(r, ks);
    const N = P * k;
    const opts = optsOf(r, `${k}개`, [
      { t: `${Math.floor(k / 10)}개`, trap: 'tens' },
      { t: `${k * 10}개`, trap: 'zero' },
      { t: `${k + 1}개`, trap: 'near' },
      { t: `${k - 1}개`, trap: 'near' },
    ]);
    if (!opts) continue;
    const a = prefer || pick(r, pool);
    return {
      kind: 'div', mons: a ? [{ id: a.id, ko: a.ko, tag: '🛒 가게' }] : [],
      text: `🛒 ${[it.emoji, eun(it.ko)].filter(Boolean).join(' ')} 하나에 💰${P}${numIda(P)}. 💰${N}${numEuro(N)} 몇 개를 살 수 있을까요?`,
      opts,
      hints: {
        tens: `🤔 몫의 일의 자리까지 구해요 — ${P} × ${nj(Math.floor(k / 10), '은', '는')} ${nj(P * Math.floor(k / 10), '이라', '라')} ${N}보다 작아요.`,
        zero: `🤔 곱셈으로 확인해 봐요 — ${P} × ${nj(k * 10, '은', '는')} ${nj(P * k * 10, '이라', '라')} ${N}보다 커요.`,
        near: `🤔 곱셈으로 확인해 봐요 — ${P} × □ = ${N}이 되는 □를 찾아요.`,
      },
      solve: `${N} ÷ ${P} = ${k} (${P} × ${k} = ${N})`,
    };
  }
  return null;
}

/** 진화 셋 — a → b → c가 모두 판에 있고 키가 차례로 커지면 [a, b, c] (EVO: { id: [{ to }] }) */
function chainsOf(pool, evo) {
  const by = new Map(pool.map((x) => [x.id, x]));
  const out = [];
  for (const a of pool) {
    for (const e1 of (evo && evo[a.id]) || []) {
      const b = by.get(Number(e1 && e1.to));
      if (!b) continue;
      for (const e2 of (evo && evo[b.id]) || []) {
        const c = by.get(Number(e2 && e2.to));
        if (c && a.h < b.h && b.h < c.h && c.h <= 20 && b.h - a.h >= 2 && c.h - b.h >= 2) out.push([a, b, c]);
      }
    }
  }
  return out;
}

/** 📊 막대그래프 — 세 포켓몬 키(2 m까지 · 눈금 한 칸 0.1 m) · 진화 셋이 다 있으면 「진화할 때 몇 m 커졌을까」 */
function makeBar(r, pool, evo) {
  const chains = chainsOf(pool, evo);
  let three = null;
  let ask = null;
  if (chains.length && r() < 0.7) {
    three = pick(r, chains);
    const [a, b, c] = three;
    const [x, y] = r() < 0.5 ? [a, b] : [b, c];
    ask = { x, y, text: `세로 눈금 한 칸은 0.1 m예요. ${iga(x.ko)} ${euro(y.ko)} 진화할 때 키가 몇 m 커졌을까요?` };
  } else {
    const ok = pool.filter((x) => x.h <= 20);
    for (let t = 0; t < 40 && !three; t++) {
      const s = [pick(r, ok), pick(r, ok), pick(r, ok)];
      if (s.some((x) => !x) || new Set(s.map((x) => x.id)).size < 3) continue;
      const hs = s.map((x) => x.h).sort((p, q) => p - q);
      if (hs[1] - hs[0] < 2 || hs[2] - hs[1] < 2) continue;
      three = s;
    }
    if (!three) return null;
    const sorted = three.slice().sort((p, q) => p.h - q.h);
    ask = { x: sorted[0], y: sorted[2], text: '세로 눈금 한 칸은 0.1 m예요. 가장 큰 포켓몬은 가장 작은 포켓몬보다 키가 몇 m 더 클까요?' };
  }
  const d = ask.y.h - ask.x.h;
  const others = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (three[i].h > three[j].h && !(three[i] === ask.y && three[j] === ask.x)) others.push(three[i].h - three[j].h);
  const opts = optsOf(r, `${tenth(d)} m`, [
    ...others.map((v) => ({ t: `${tenth(v)} m`, trap: 'pair' })),
    { t: `${tenth(ask.y.h)} m`, trap: 'read' },
    { t: `${tenth(ask.y.h + ask.x.h)} m`, trap: 'add' },
  ]);
  if (!opts) return null;
  return {
    kind: 'bar', mons: [],
    text: ask.text,
    chart: { bars: three.map((x) => ({ id: x.id, ko: x.ko, v: x.h })) },
    opts,
    hints: {
      pair: `🤔 물음의 두 포켓몬 막대를 다시 보세요 — ${wagwa(ask.x.ko)} ${ask.y.ko}${jong(ask.y.ko) ? '이에요' : '예요'}.`,
      read: '🤔 키 자체가 아니라 두 막대의 차이를 물었어요 — 칸 수를 세어 빼요.',
      add: '🤔 「몇 m 더」는 두 키의 차이예요 — 큰 수에서 작은 수를 빼요.',
    },
    solve: `${ask.y.ko} ${tenth(ask.y.h)} m − ${ask.x.ko} ${tenth(ask.x.h)} m = ${tenth(d)} m`,
  };
}

const MAKERS = {
  cmp: (r, pool) => makeCmp(r, pool),
  sub: (r, pool) => makeSub(r, pool),
  add: (r, pool) => makeAdd(r, pool),
  unit: (r, pool, o) => makeUnit(r, pool, o.prefer),
  big: (r, pool, o) => makeBig(r, pool, o.prefer),
  mul: (r, pool, o) => makeMul(r, pool, o.prefer, o.items),
  div: (r, pool, o) => makeDiv(r, pool, o.prefer, o.items),
  bar: (r, pool, o) => makeBar(r, pool, o.evo),
};

/** 문제 하나 (시험·화면) — 꼴 하나로 · 못 만들면 null */
export function makePokeQ(kind, pool, seed, { items = POKE_GOODS, evo = {}, partner = 0 } = {}) {
  const f = MAKERS[kind];
  if (!f || !Array.isArray(pool) || !pool.length) return null;
  const r = makeRng(seed);
  const prefer = pool.find((x) => x.id === Number(partner)) || null;
  const q = f(r, pool, { items, evo, prefer });
  return q ? { ...q, seed } : null;
}

/**
 * 한 판 (순수) — 꼴을 섞어 POKE_N 문제 · 꼴은 겹치지 않게(못 만드는 꼴은 건너뜀) · 셋이 안 되면 [] (단추를 안 띄운다)
 * @param {Array} pool poolOf 결과 · @param {number} seed
 * @param {{items?:Array, evo?:Object, partner?:number}} o items 가게 물건 { ko, emoji, price } · evo 진화표 · partner 파트너 id(한 마리 문제에 먼저)
 */
export function makeBoard(pool, seed, o = {}) {
  const r = makeRng(seed);
  const out = [];
  for (const kind of shuffle(r, [...POKE_KIND_LIST])) {
    if (out.length >= POKE_N) break;
    const q = makePokeQ(kind, pool, Math.floor(r() * 2147483646) + 1, o);
    if (q) out.push(q);
  }
  return out.length >= 3 ? out : [];
}
