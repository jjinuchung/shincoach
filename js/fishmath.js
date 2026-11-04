// 🐟 물고기 수학 (v367 · 2026-10-30 아버님 낚시 2단계 기본안 「이대로」) — 그 기기 도감의 물고기 길이·무게로 4학년 문제 하나 (순수 · 화면 없음)
// 🐾 포켓몬 수학(mathpoke.js · v364)과 같은 꼴·범위 — 보기 넷(크기 비교·가장 많이는 셋) · 틀린 보기마다 그 실수(trap)와 그 실수에 맞춘 힌트
//  · 길이 = 도감 「가장 긴 cm」(소수 한 자리) · 무게 = 그 길이로 어림한 무게(weightOf — 1 kg 넘는 물고기만 · kg 소수 두 자리)
//  · 꼴: 📏 길이 비교 · ➖ 길이 차 · ➕ 길이 합 · ⚖️ 무게 합 · 📐 단위(kg → g) · 📊 막대그래프(지금까지 낚은 마리)
//  · 소수의 나눗셈은 5학년이라 내지 않는다(기본안 표의 「나눗셈」 자리는 길이 합으로)
// 낚시터(lakeview)가 수학 차례의 반쯤에 낸다 — 서로 다른 물고기를 두 종 이상 낚은 뒤부터 · 기록은 수학 칸 + daily fishFmQ/fishFmOk
// v386 (🚤 원고 「이대로」 정할 것 3): 🐙 문어 무리(soft)는 길이 문제(비교·차·합)에 안 낸다 — 문어는 다리까지·오징어는 몸통 길이라 견주기가 공정하지 않다 ·
//   무게 합·단위·막대그래프엔 나오고, 그 글은 「물고기」라고 부르지 않는다(막대그래프에 문어 무리가 있으면 「가장 많이 낚은 것」)
// v392 (📐 다지기 기본안 「추천대로」): 다지는 동안(ud.stage) 📐은 🐾과 같은 단계·같은 몸통(mathpoke.unitCore)으로 하루 세 번까지(ud.ask) · 옛 꼴(1.38 kg)은 다른 꼴이 없을 때만 ·
//   🐟 도감 무게는 어림값이라 「약」을 붙이고 자연수·소수 한 자리로 · 끝나면(ud 없음) 옛 꼴 그대로
import { rng as makeRng, shuffle, pick } from './mathgen.js';
import { SPECIES, lakeOf, weightOf } from './fishing.js';
import { unitCore } from './mathpoke.js';

/** 꼴 — 아이 화면 머리 줄엔 안 쓴다(셈 없음) · 📤·시험용 이름 */
export const FM_KINDS = {
  cmp: '길이 비교',
  sub: '길이 차',
  add: '길이 합',
  wadd: '무게 합',
  unit: '단위 바꾸기',
  bar: '막대그래프',
};
export const FM_KIND_LIST = Object.keys(FM_KINDS);
/** 꼴 → 단계 (v378 난이도 기본안 「추천대로」) — 1 비교·막대그래프 읽기 · 2 길이 차·합 · 3 무게 합(kg 소수 두 자리)·단위(kg → g) */
export const FM_LEVEL = { cmp: 1, bar: 1, sub: 2, add: 2, wadd: 3, unit: 3 };
/** 카드 머리 줄 */
export const FM_LABEL = '🔢 수학 · 🐟 물고기 수학';

/** 십분의 일 정수 → 글자 (312 → "31.2" · 300 → "30") */
export function tenth(t) {
  const n = Math.round(Number(t));
  return n % 10 ? `${Math.floor(n / 10)}.${n % 10}` : String(n / 10);
}
/** 백분의 일 정수 → 글자 (138 → "1.38" · 130 → "1.3" · 200 → "2") */
export function hundredth(h) {
  const n = Math.round(Number(h));
  if (n % 100 === 0) return String(n / 100);
  if (n % 10 === 0) return `${Math.floor(n / 100)}.${(n % 100) / 10}`;
  return `${Math.floor(n / 100)}.${String(n % 100).padStart(2, '0')}`;
}

/** 끝 글자의 받침 번호 (0 = 없음) */
function jong(word) {
  const c = String(word || '').trim().slice(-1).charCodeAt(0);
  return c >= 0xac00 && c <= 0xd7a3 ? (c - 0xac00) % 28 : 0;
}
const eun = (w) => `${w}${jong(w) ? '은' : '는'}`;
const iga = (w) => `${w}${jong(w) ? '이' : '가'}`;
const wagwa = (w) => `${w}${jong(w) ? '과' : '와'}`;
const eul = (w) => `${w}${jong(w) ? '을' : '를'}`;

/**
 * 문제에 쓸 물고기 (순수) — 도감에서 한 번이라도 낚은 종 → [{ key, ko, L 십분의 일 cm, n 낚은 수, H 백분의 일 kg, soft? 🐙 문어 무리(v386) }]
 * @param {Object} raw 프로필 fishing (lakeOf로 고쳐 읽음)
 */
export function poolOf(raw) {
  const lk = lakeOf(raw);
  return SPECIES.filter((sp) => lk.dex[sp.key] && lk.dex[sp.key].best > 0).map((sp) => {
    const e = lk.dex[sp.key];
    return { key: sp.key, ko: sp.ko, L: Math.round(e.best * 10), n: e.n, H: Math.round(weightOf(sp, e.best) / 10), ...(sp.soft ? { soft: true } : {}) };
  });
}
/** 길이 문제에 쓸 것 — 🐙 문어 무리는 빼고 (v386) */
const finned = (pool) => pool.filter((x) => !x.soft);
/**
 * 물고기 수학을 낼 수 있나 — 서로 다른 물고기 두 종 이상이고, 실제로 문제가 하나라도 만들어질 때
 * (Codex 189차 — 작은 🐙 문어 무리만 있는 도감은 길이 문제도 무게 문제도 못 만들어 「낼 수 있음」인데 문제가 안 나왔다 · 씨앗 셋으로 꼴을 모두 시도)
 */
export function fishMathReady(raw) {
  return poolOf(raw).length >= 2 && [1, 2, 3].some((s) => fishMathQ(raw, s) !== null);
}

/** 보기 — 정답 하나 + 서로 다른 틀린 보기(먼저 온 실수부터) · 모자라면 null */
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
const lenTag = (x) => `${x.ko} ${tenth(x.L)} cm`;
const kgTag = (x) => `${x.ko} ${hundredth(x.H)} kg`;
/** 소수점을 맞추지 않고 끝자리끼리 맞춘 셈 — 자연수(소수 첫째 자리가 0)를 십분의 일로 읽은 값 */
const misread = (t) => (t % 10 === 0 ? t / 10 : null);

/** 📏 길이 비교 — 셋 가운데 가장 긴·짧은 물고기 · 자연수 부분이 같은 둘이 있게 먼저 고른다(소수 첫째 자리로 가르게) */
function makeCmp(r, all) {
  const pool = finned(all);
  for (let t = 0; t < 30; t++) {
    const a = pick(r, pool);
    if (!a) return null;
    const same = pool.filter((x) => x.key !== a.key && Math.floor(x.L / 10) === Math.floor(a.L / 10) && x.L !== a.L);
    const b = same.length ? pick(r, same) : pick(r, pool.filter((x) => x.key !== a.key && x.L !== a.L));
    if (!b) continue;
    const c = pick(r, pool.filter((x) => x.key !== a.key && x.key !== b.key && x.L !== a.L && x.L !== b.L));
    if (!c) continue;
    const three = shuffle(r, [a, b, c]);
    const long = r() < 0.5;
    const ans = three.reduce((m, x) => ((long ? x.L > m.L : x.L < m.L) ? x : m));
    return {
      kind: 'cmp',
      facts: three.map(lenTag),
      text: long ? '가장 긴 물고기는 무엇일까요?' : '가장 짧은 물고기는 무엇일까요?',
      opts: shuffle(r, three.map((x) => (x === ans ? { t: x.ko, ok: true } : { t: x.ko, ok: false, trap: 'cmp' }))),
      hints: { cmp: '🤔 소수점 왼쪽 수(자연수 부분)부터 견주고, 같으면 소수 첫째 자리를 견줘요.' },
      solve: `${three.map(lenTag).join(' · ')} → ${ans.ko}`,
    };
  }
  return null;
}

/** ➖ 길이 차 — 긴 물고기가 몇 cm 더 길까 (둘 가운데 하나는 소수 첫째 자리가 있게) */
function makeSub(r, all) {
  const pool = finned(all);
  for (let t = 0; t < 40; t++) {
    const [x, y] = [pick(r, pool), pick(r, pool)];
    if (!x || !y || x.key === y.key || x.L === y.L) continue;
    const [a, b] = x.L > y.L ? [x, y] : [y, x];
    if (a.L % 10 === 0 && b.L % 10 === 0) continue;
    const d = a.L - b.L;
    const wr = [];
    if (a.L % 10 < b.L % 10) wr.push({ t: `${tenth(d + 10)} cm`, trap: 'borrow' }); // 소수 첫째 자리에서 받아내림한 1을 잊음
    wr.push({ t: `${tenth(a.L + b.L)} cm`, trap: 'add' });
    const mb = misread(b.L);
    const ma = misread(a.L);
    if (mb !== null && a.L - mb > 0) wr.push({ t: `${tenth(a.L - mb)} cm`, trap: 'align' });
    else if (ma !== null && ma - b.L > 0) wr.push({ t: `${tenth(ma - b.L)} cm`, trap: 'align' });
    wr.push({ t: `${tenth(d * 10)} cm`, trap: 'dot' });
    wr.push({ t: `${hundredth(d)} cm`, trap: 'shift' });
    wr.push({ t: `${tenth(d + 1)} cm`, trap: 'near' });
    const opts = optsOf(r, `${tenth(d)} cm`, wr);
    if (!opts) continue;
    const whole = a.L % 10 === 0 ? a.L : b.L % 10 === 0 ? b.L : null;
    return {
      kind: 'sub',
      facts: [lenTag(a), lenTag(b)],
      text: `${eun(a.ko)} ${b.ko}보다 몇 cm 더 길까요?`,
      opts,
      hints: {
        borrow: '🤔 소수 첫째 자리에서 받아내림했으면, 일의 자리 수에서 1을 빼고 계산해요.',
        add: '🤔 「몇 cm 더」는 두 길이의 차이예요 — 긴 쪽에서 짧은 쪽을 빼요.',
        align: `🤔 소수점을 맞춰서 세로로 써 볼까요?${whole !== null ? ` ${tenth(whole)}도 ${tenth(whole)}.0으로 써서 맞춰요.` : ''}`,
        dot: '🤔 답에도 소수점을 찍어요 — 소수점은 세로로 쓴 자리 그대로 내려와요.',
        shift: '🤔 소수 첫째 자리끼리 빼요 — 답의 소수점 자리를 다시 보세요.',
        near: '🤔 세로로 써서 한 자리씩 다시 빼 볼까요?',
      },
      solve: `${tenth(a.L)} − ${tenth(b.L)} = ${tenth(d)} (cm)`,
    };
  }
  return null;
}

/** ➕ 길이 합 — 두 물고기를 한 줄로 이어 놓으면 (하나는 소수 첫째 자리가 있게) */
function makeAdd(r, all) {
  const pool = finned(all);
  for (let t = 0; t < 40; t++) {
    const [a, b] = [pick(r, pool), pick(r, pool)];
    if (!a || !b || a.key === b.key) continue;
    if (a.L % 10 === 0 && b.L % 10 === 0) continue;
    const s = a.L + b.L;
    const wr = [];
    const ma = misread(a.L);
    const mb = misread(b.L);
    if (ma !== null) wr.push({ t: `${tenth(ma + b.L)} cm`, trap: 'align' });
    else if (mb !== null) wr.push({ t: `${tenth(a.L + mb)} cm`, trap: 'align' });
    if ((a.L % 10) + (b.L % 10) >= 10) wr.push({ t: `${tenth(s - 10)} cm`, trap: 'carry' });
    if (a.L !== b.L) wr.push({ t: `${tenth(Math.abs(a.L - b.L))} cm`, trap: 'sub' });
    wr.push({ t: `${tenth(s * 10)} cm`, trap: 'dot' });
    wr.push({ t: `${tenth(s + 10)} cm`, trap: 'near' });
    const opts = optsOf(r, `${tenth(s)} cm`, wr);
    if (!opts) continue;
    const whole = a.L % 10 === 0 ? a.L : b.L % 10 === 0 ? b.L : null;
    return {
      kind: 'add',
      facts: [lenTag(a), lenTag(b)],
      text: `${eul(a.ko)} ${b.ko} 뒤에 한 줄로 이어 놓으면 모두 몇 cm일까요?`,
      opts,
      hints: {
        align: `🤔 소수점을 맞춰서 세로로 써 볼까요?${whole !== null ? ` ${tenth(whole)}도 ${tenth(whole)}.0으로 써서 맞춰요.` : ''}`,
        carry: '🤔 소수 첫째 자리끼리 더해 10이 되거나 넘으면 일의 자리로 1을 올려요.',
        sub: '🤔 한 줄로 이어 놓으면 두 길이를 더해요.',
        dot: '🤔 답에도 소수점을 찍어요 — 소수점은 세로로 쓴 자리 그대로 내려와요.',
        near: '🤔 세로로 써서 한 자리씩 다시 더해 볼까요?',
      },
      solve: `${tenth(a.L)} + ${tenth(b.L)} = ${tenth(s)} (cm)`,
    };
  }
  return null;
}

/** 1 kg 넘고 100 kg 아래 · 소수 둘째 자리까지 있는 물고기 */
const heavy = (x) => x.H >= 100 && x.H < 10000;

/** ⚖️ 무게 합 — 두 물고기를 함께 저울에 (둘 다 1 kg 넘게 · 하나는 소수 둘째 자리가 있게) */
function makeWadd(r, pool) {
  const ok = pool.filter(heavy);
  for (let t = 0; t < 40; t++) {
    const [a, b] = [pick(r, ok), pick(r, ok)];
    if (!a || !b || a.key === b.key) continue;
    if (a.H % 10 === 0 && b.H % 10 === 0) continue;
    const s = a.H + b.H;
    const wr = [];
    // 소수 둘째 자리가 비어 보이는 쪽(1.3 kg · 1 kg) — 끝자리끼리 맞추면 1.3을 0.13으로, 1을 0.01로 읽은 셈 (Codex 171차 — 정수 kg를 0.1로 읽던 보기·「1도 10으로」 힌트)
    const one = a.H % 10 === 0 ? a : b.H % 10 === 0 ? b : null;
    if (one) wr.push({ t: `${hundredth(s - one.H + (one.H % 100 === 0 ? one.H / 100 : one.H / 10))} kg`, trap: 'align' });
    if ((a.H % 10) + (b.H % 10) >= 10) wr.push({ t: `${hundredth(s - 10)} kg`, trap: 'carry' });
    if (Math.floor((a.H % 100) / 10) + Math.floor((b.H % 100) / 10) + ((a.H % 10) + (b.H % 10) >= 10 ? 1 : 0) >= 10) wr.push({ t: `${hundredth(s - 100)} kg`, trap: 'carry' });
    if (a.H !== b.H) wr.push({ t: `${hundredth(Math.abs(a.H - b.H))} kg`, trap: 'sub' });
    wr.push({ t: `${hundredth(s + 10)} kg`, trap: 'near' });
    wr.push({ t: `${hundredth(s + 100)} kg`, trap: 'near' });
    const opts = optsOf(r, `${hundredth(s)} kg`, wr);
    if (!opts) continue;
    return {
      kind: 'wadd',
      facts: [kgTag(a), kgTag(b)],
      text: `${wagwa(a.ko)} ${iga(b.ko)} 함께 저울에 올라가면 몇 kg일까요?`,
      opts,
      hints: {
        align: `🤔 소수점을 맞춰서 세로로 써 볼까요?${one ? ` ${hundredth(one.H)}도 ${(one.H / 100).toFixed(2)}으로 써서 맞춰요.` : ''}`,
        carry: '🤔 같은 자리끼리 더해 10이 되거나 넘으면 바로 윗자리로 1을 올려요.',
        sub: '🤔 함께 저울에 올라가면 두 무게를 더해요.',
        near: '🤔 세로로 써서 한 자리씩 다시 더해 볼까요?',
      },
      solve: `${hundredth(a.H)} + ${hundredth(b.H)} = ${hundredth(s)} (kg)`,
    };
  }
  return null;
}

/** 📐 단위 바꾸기 — 무게 kg → g (1 kg 넘게 · 소수 부분이 있게) · 물음 밑에 💡 처음부터 (포켓몬 수학과 같다 — Codex 168차) */
function makeUnit(r, pool) {
  const ok = pool.filter((x) => heavy(x) && x.H % 100 !== 0);
  const a = pick(r, ok);
  if (!a) return null;
  const v = a.H * 10; // g
  const part = a.H % 100;
  const opts = optsOf(r, `${v} g`, [
    { t: `${a.H} g`, trap: 'small' },
    { t: `${Math.floor(a.H / 100) * 1000 + part} g`, trap: 'mix' },
    { t: `${v * 10} g`, trap: 'big' },
  ]);
  if (!opts) return null;
  const pp = String(part).padStart(2, '0');
  return {
    kind: 'unit',
    facts: [kgTag(a)],
    text: `${a.ko}의 무게 ${hundredth(a.H)} kg은 몇 g일까요?`,
    tip: '💡 1 kg = 1000 g · 0.01 kg = 10 g',
    opts,
    hints: {
      small: '🤔 1 kg은 1000 g이에요 — 0을 하나 더 붙여 볼까요?',
      mix: `🤔 0.${pp} kg은 ${part} g이 아니라 ${part * 10} g이에요 (0.01 kg = 10 g).`,
      big: `🤔 ${v * 10} g이면 ${hundredth(a.H * 10)} kg이에요. ${iga(a.ko)} 그렇게 무거울까요?`, // 크기 감각 (v392 — 🐾과 같게)
    },
    solve: `${hundredth(a.H)} kg = ${Math.floor(a.H / 100)} kg ${part * 10} g = ${v} g`,
  };
}

/** 📐 다지기 단계마다 쓸 무게 (십분의 일 kg · 못 쓰면 0) — 1 자연수 kg(2 kg부터 — 🐾과 같게) · 2 소수 첫째 자리가 2 이상(1 kg 아래도) · 3 1 kg 이상이고 소수 첫째 자리가 있게 */
function drillKg(H, s) {
  const t = s === 1 ? Math.round(H / 100) * 10 : Math.round(H / 10);
  if (s === 1) return t >= 20 ? t : 0;
  if (s === 2) return t % 10 >= 2 ? t : 0;
  return t % 10 !== 0 && t >= 10 ? t : 0;
}
/** 📐 다지기 문제 — 그 단계를 만들 물고기가 없으면 다음 단계 · ud = 실제로 낸 단계 */
function makeDrill(r, pool, stage) {
  for (let s = stage; s <= 3; s++) {
    const a = pick(r, pool.filter((x) => drillKg(x.H, s)));
    const t = a ? drillKg(a.H, s) : 0;
    const c = t ? unitCore(r, t, 'w', a.ko, s) : null;
    if (c) return { kind: 'unit', facts: [`${a.ko} 약 ${tenth(t)} kg`], text: c.ask, tip: c.tip, opts: c.opts, hints: c.hints, solve: c.solve, ud: s };
  }
  return null;
}

/** 📊 막대그래프 — 지금까지 낚은 마리(세 종 · 20마리까지 · 눈금 한 칸 1마리, 10마리 넘으면 2마리) · 가장 많이 낚은 물고기 또는 두 종의 차 */
function makeBar(r, pool) {
  const ok = pool.filter((x) => x.n >= 1 && x.n <= 20);
  for (let t = 0; t < 40; t++) {
    const s = [pick(r, ok), pick(r, ok), pick(r, ok)];
    if (s.some((x) => !x) || new Set(s.map((x) => x.key)).size < 3) continue;
    const top = Math.max(...s.map((x) => x.n));
    const unit = top <= 10 ? 1 : 2;
    if (unit === 2 && s.some((x) => x.n % 2)) continue; // 눈금 사이에 걸치는 막대는 안 낸다
    const sorted = s.slice().sort((p, q) => p.n - q.n);
    if (sorted[1].n === sorted[0].n || sorted[2].n === sorted[1].n) continue;
    const chart = { unit, bars: s.map((x) => ({ ko: x.ko, v: x.n })) };
    const head = `세로 눈금 한 칸은 ${unit}마리예요.`;
    const soft = s.some((x) => x.soft); // 🐙 문어 무리가 있으면 「물고기」라고 부르지 않는다 (v386)
    if (r() < 0.4) {
      const ans = sorted[2];
      return {
        kind: 'bar', facts: [], chart,
        text: `${head} 지금까지 가장 많이 낚은 ${soft ? '것은' : '물고기는'} 무엇일까요?`,
        opts: shuffle(r, s.map((x) => (x === ans ? { t: x.ko, ok: true } : { t: x.ko, ok: false, trap: 'most' }))),
        hints: { most: '🤔 가장 긴 막대를 찾아요 — 막대가 길수록 많이 낚은 거예요.' },
        solve: `${s.map((x) => `${x.ko} ${x.n}마리`).join(' · ')} → ${ans.ko}`,
      };
    }
    const [lo, hi] = r() < 0.5 ? [sorted[0], sorted[2]] : r() < 0.5 ? [sorted[0], sorted[1]] : [sorted[1], sorted[2]];
    const d = hi.n - lo.n;
    const others = [];
    for (const p of s) for (const q of s) if (p.n > q.n && !(p === hi && q === lo)) others.push(p.n - q.n);
    const opts = optsOf(r, `${d}마리`, [
      ...others.map((v) => ({ t: `${v}마리`, trap: 'pair' })),
      { t: `${hi.n}마리`, trap: 'read' },
      { t: `${hi.n + lo.n}마리`, trap: 'add' },
      { t: `${d + unit}마리`, trap: 'near' },
    ]);
    if (!opts) continue;
    return {
      kind: 'bar', facts: [], chart,
      text: `${head} ${eun(hi.ko)} ${lo.ko}보다 몇 마리 더 낚았을까요?`,
      opts,
      hints: {
        pair: `🤔 물음의 두 ${soft ? '' : '물고기 '}막대를 다시 보세요 — ${wagwa(hi.ko)} ${lo.ko}${jong(lo.ko) ? '이에요' : '예요'}.`,
        read: `🤔 한 ${soft ? '막대' : '물고기'}의 마리 수가 아니라 두 막대의 차이를 물었어요.`,
        add: '🤔 「몇 마리 더」는 두 수의 차이예요 — 큰 수에서 작은 수를 빼요.',
        near: `🤔 눈금 한 칸이 ${unit}마리예요 — 칸 수를 다시 세어 봐요.`,
      },
      solve: `${hi.ko} ${hi.n}마리 − ${lo.ko} ${lo.n}마리 = ${d}마리`,
    };
  }
  return null;
}

const MAKERS = { cmp: makeCmp, sub: makeSub, add: makeAdd, wadd: makeWadd, unit: makeUnit, bar: makeBar };

/** 꼴 하나로 문제 (시험용) — 못 만들면 null */
export function makeFishQ(kind, pool, seed) {
  const f = MAKERS[kind];
  if (!f || !Array.isArray(pool) || pool.length < 2) return null;
  const q = f(makeRng(seed), pool);
  return q ? { ...q, seed } : null;
}

/**
 * 낚시터에 낼 문제 하나 (순수) — 꼴을 씨앗으로 섞어 처음 만들어지는 것 · 서로 다른 물고기 두 종 아래면 null
 * → { fm: true, kind, lv, label, facts, text, tip, chart, choices: [{ text, ok, hint }], solve } (choices는 낚시터 카드 꼴 — 틀린 보기마다 그 실수의 힌트)
 * v378: 그 단계(lv)의 꼴부터 → 못 만들면 한 단계씩 아래 → 그래도 없으면 위 단계(물고기 두 종뿐이면 비교·막대그래프를 못 만들어 길이 차·합으로 — 수학 차례가 비지 않게) · lv = 실제 낸 꼴의 단계
 * v392: ud = { stage 📐 다지기 단계(0이면 끝남), ask 지금 내도 되나(하루 몫) } — 내도 되고 바로 앞이 📐이 아니면 다지기 문제(lv 1 · ud 단계 — 🐋 단계 칸에 안 셈) · 다지는 동안 옛 📐 꼴은 맨 뒤로
 * @param {Object} raw 프로필 fishing · @param {number} seed · @param {string} [avoid] 바로 앞 꼴(되도록 다른 꼴부터) · @param {number} [lv] 1~3 · @param {{stage:number, ask:boolean}} [ud]
 */
export function fishMathQ(raw, seed, avoid = '', lv = 1, ud = null) {
  const pool = poolOf(raw);
  if (pool.length < 2) return null;
  const r = makeRng(seed);
  const order = shuffle(r, [...FM_KIND_LIST]);
  const stage = ud && [1, 2, 3].includes(ud.stage) ? ud.stage : 0;
  const card = (kind, l, q) => ({
    fm: true,
    kind,
    lv: l,
    label: FM_LABEL,
    facts: q.facts,
    text: q.text,
    tip: q.tip || '',
    chart: q.chart || null,
    choices: q.opts.map((o) => ({ text: o.t, ok: !!o.ok, hint: o.ok ? '' : (q.hints && q.hints[o.trap]) || '', ...(o.trap ? { trap: o.trap } : {}) })),
    solve: q.solve,
    ...(q.ud ? { ud: q.ud } : {}),
  });
  if (stage && ud.ask && avoid !== 'unit') {
    const q = makeDrill(r, pool, stage);
    if (q) return card('unit', 1, q);
  }
  const want = [1, 2, 3].includes(lv) ? lv : 1;
  const steps = [want, ...[3, 2, 1].filter((l) => l < want), ...[1, 2, 3].filter((l) => l > want)];
  const kinds = steps.flatMap((l) => {
    const g = order.filter((k) => FM_LEVEL[k] === l);
    return [...g.filter((k) => k !== avoid), ...g.filter((k) => k === avoid)];
  });
  if (stage) kinds.push(...kinds.splice(kinds.indexOf('unit'), 1)); // 옛 📐은 맨 뒤 — 다른 꼴을 하나도 못 만드는 도감에서만 (Codex 195차 #5)
  for (const kind of kinds) {
    const q = makeFishQ(kind, pool, Math.floor(r() * 2147483646) + 1);
    if (q) return card(kind, FM_LEVEL[kind], q);
  }
  return null;
}
