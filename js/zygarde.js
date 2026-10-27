// 🟢 지가르데 셀 모으기 — 순수 규칙 (화면 없음 · korean.js의 날 번호만 import — db·xp·zygview·시험이 그대로 부른다)
// 화면은 zygview.js(끝 화면 구석의 셀) · 도감 모습 칸은 shop.js · 배틀 스웜체인지는 battle.js
//
// 진우 (2026-10-27, 아버님 전달): 셀을 모을수록 모습이 바뀌는 지가르데를 앱에서도
//   → 기본안 55hXEcqCkZZ4HENPAfuBVX 「추천대로」 — 🔴 코어 먼저 · 공부를 끝낸 화면에 숨은 셀 · 하루 3개 ·
//     셀 10 → 10%폼 · 50 → 50%폼 · 100 → 퍼펙트폼(배틀에서 HP 절반 아래면 스웜체인지) · 퍼펙트폼 + 💠 → 메가 ·
//     논술에서 못 잡았어도 셀 10이면 10%폼 지가르데가 생긴다 · 큐브에 셀 수
// 세부(v352): 과목마다 하루 하나 · 모두 합쳐 하루 3(기본안의 「과목마다 나와서 여러 과목을 하게」) · 맨 처음 찾기는 코어(셀 수에는 안 셈) ·
//   셀 100이면 더는 안 나온다
// 저장의 집 규칙:
//  · 찾기·모습 바꾸기는 저장된 프로필로 한 트랜잭션(xp.houseDo) — 두 창이 같은 과목 셀을 둘 다 받지 않게
//  · 찾은 것은 「날:과목」 열쇠(keys)로 남긴다 — 병합은 열쇠 합집합이라 따로 진행한 두 사본의 셀이 모두 남는다(Codex 157차) ·
//    셀 수는 늘기만 한다(큰 쪽 · 열쇠가 더 많으면 열쇠 수) · 코어는 이른 쪽 · 고른 모습은 바꾼 시각(formAt)이 큰 쪽
//  · 셀 10·50·100 문턱은 처리한 가장 높은 문턱(seen)으로 — 병합이 문턱을 건너뛰어도 다음 찾기에서 (셀 10 선물이 빠지지 않게)
//  · 깨진 값은 없는 것으로 읽는다(병합이 멈추지 않게)
import { dayNum } from './korean.js';

/** 지가르데 도감 번호 (앱 명단의 50%폼) */
export const ZYG_ID = 718;
/** 셀이 나오는 과목 */
export const SUBJECTS = ['english', 'math', 'korean', 'nonsul'];
/** 하루에 찾을 수 있는 수 (코어 포함) */
export const DAY_MAX = 3;
/** 큐브에 모이는 셀 끝 — 퍼펙트폼 */
export const CELL_MAX = 100;
/** 모습이 열리는 셀 수 */
export const STEP = { ten: 10, fifty: 50, perfect: 100 };

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const cnt = (v) => { const n = Math.floor(Number(v)); return Number.isSafeInteger(n) && n > 0 ? n : 0; };
const minPos = (a, b) => (a && b ? Math.min(a, b) : a || b);
const formOk = (f) => (f === '10' || f === '50' ? f : '');
/** 찾은 것 열쇠 「날 번호:과목」 */
const keyOk = (k) => typeof k === 'string' && /^\d+:[a-z]+$/.test(k) && SUBJECTS.includes(k.slice(k.indexOf(':') + 1));

/** 큐브 장부 고쳐 읽기 — 새 객체 { core, cells, keys, form, formAt, gave, seen } */
export function zygOf(raw) {
  const x = isObj(raw) ? raw : {};
  const keys = [];
  if (Array.isArray(x.keys)) for (const k of x.keys) if (keyOk(k) && !keys.includes(k)) keys.push(k);
  const core = cnt(x.core);
  return {
    core,
    cells: Math.min(CELL_MAX, Math.max(cnt(x.cells), core ? keys.length - 1 : 0)), // 열쇠 하나는 코어
    keys,
    form: formOk(x.form),
    formAt: cnt(x.formAt),
    gave: cnt(x.gave) ? 1 : 0,
    seen: Math.min(CELL_MAX, cnt(x.seen)),
  };
}

/** 병합 — 찾은 열쇠 합집합(셀 수도 그만큼) · 코어 이른 쪽 · 모습은 나중에 바꾼 쪽 · 처리한 문턱은 높은 쪽 */
export function mergeZyg(a, b) {
  const x = zygOf(a);
  const y = zygOf(b);
  const late = y.formAt > x.formAt ? y : x;
  return zygOf({
    core: minPos(x.core, y.core),
    cells: Math.max(x.cells, y.cells),
    keys: [...x.keys, ...y.keys],
    form: late.form,
    formAt: late.formAt,
    gave: Math.max(x.gave, y.gave),
    seen: Math.max(x.seen, y.seen),
  });
}

/** 그날 찾은 과목 */
function subsToday(z, today) {
  const head = `${today}:`;
  return z.keys.filter((k) => k.startsWith(head)).map((k) => k.slice(head.length));
}

/** 이 과목 끝 화면에 셀(또는 코어)을 숨겨 둘까 — now는 시각(ms) */
export function zygCanFind(raw, sub, now) {
  const z = zygOf(raw);
  if (!SUBJECTS.includes(sub) || z.cells >= CELL_MAX) return false;
  const subs = subsToday(z, dayNum(now));
  return !subs.includes(sub) && subs.length < DAY_MAX;
}

/** 다음에 찾을 것 — 'core' | 'cell' */
export function zygNext(raw) {
  return zygOf(raw).core ? 'cell' : 'core';
}

/**
 * 셀(또는 코어) 찾기 — 저장된 프로필로 한 트랜잭션 (xp.zygFind → houseDo)
 * @returns {{ok:boolean, why?:'sub'|'full'|'subject'|'day', found?:'core'|'cell', cells?:number, ev?:'gift'|'ten'|'fifty'|'perfect'|null, form?:string}}
 *   ev — gift: 셀 10에 지가르데가 생김(10%폼) · ten: 이미 있어서 10%폼을 고를 수 있게 · fifty: 셀 50(10%폼이었으면 50%폼으로) · perfect: 셀 100
 */
export function zygFindRule(p, sub, now) {
  if (!SUBJECTS.includes(sub)) return { ok: false, why: 'sub' };
  const z = zygOf(p.zyg);
  if (z.cells >= CELL_MAX) return { ok: false, why: 'full' };
  const today = dayNum(now);
  const subs = subsToday(z, today);
  if (subs.includes(sub)) return { ok: false, why: 'subject' };
  if (subs.length >= DAY_MAX) return { ok: false, why: 'day' };
  z.keys.push(`${today}:${sub}`);
  if (!z.core) {
    z.core = cnt(now) || 1;
    p.zyg = z;
    return { ok: true, found: 'core', cells: z.cells, ev: null };
  }
  z.cells += 1;
  let ev = null;
  const at = Math.max(cnt(now), z.formAt + 1); // 바꾼 시각은 늘 앞으로 (병합의 나중 쪽)
  for (const n of [STEP.ten, STEP.fifty, STEP.perfect]) {
    if (z.cells < n || z.seen >= n) continue; // 아직이거나 이미 처리한 문턱
    z.seen = n;
    if (n === STEP.ten) {
      const caught = isObj(p.caught) ? p.caught : {};
      if (cnt(caught[ZYG_ID]) > 0) ev = 'ten';
      else {
        // 논술에서 못 잡았어도 큐브가 지가르데를 만든다 — 편지 🌟와 같은 꼴(도감 +1 · 처음 얻은 포켓몬이면 파트너)
        p.caught = { ...caught, [ZYG_ID]: 1 };
        if (!p.partner) p.partner = ZYG_ID;
        z.gave = 1;
        z.form = '10';
        z.formAt = at;
        ev = 'gift';
      }
    } else if (n === STEP.fifty) {
      if (z.form === '10') { z.form = '50'; z.formAt = at; }
      ev = 'fifty';
    } else ev = 'perfect';
  }
  p.zyg = z;
  return { ok: true, found: 'cell', cells: z.cells, ev, form: z.form };
}

/** 지금 모습 — '10' | '50' (고른 적 없으면 앱의 지금 모습 50%) */
export function zygFormOf(raw) {
  return zygOf(raw).form || '50';
}

/** 50%폼을 고를 수 있나 — 셀 50 이상 · 또는 논술에서 잡은 지가르데가 있다(도감 수가 큐브가 준 수보다 많다) */
export function zygCan50(raw, caught) {
  const z = zygOf(raw);
  const have = cnt(isObj(caught) ? caught[ZYG_ID] : 0);
  return z.cells >= STEP.fifty || have > z.gave;
}

/** 이 모습을 고를 수 있나 */
export function zygFormOpen(raw, caught, form) {
  const z = zygOf(raw);
  if (!cnt(isObj(caught) ? caught[ZYG_ID] : 0)) return false;
  if (form === '10') return z.cells >= STEP.ten;
  if (form === '50') return zygCan50(z, caught);
  return false;
}

/** 도감에서 모습 고르기 — 한 트랜잭션 */
export function zygFormRule(p, form, now) {
  if (form !== '10' && form !== '50') return { ok: false, why: 'form' };
  const z = zygOf(p.zyg);
  if (!zygFormOpen(z, p.caught, form)) return { ok: false, why: 'locked' };
  if (zygFormOf(z) === form) return { ok: true, same: true, form };
  z.form = form;
  z.formAt = Math.max(cnt(now), z.formAt + 1);
  p.zyg = z;
  return { ok: true, form };
}

/** 퍼펙트폼이 열렸나 (배틀 스웜체인지 · 💠) */
export function zygPerfect(raw) {
  return zygOf(raw).cells >= STEP.perfect;
}

/** 📤 보상 기록 한 줄 (코어 전이면 '') */
export function zygLine(raw, now) {
  const z = zygOf(raw);
  if (!z.core) return '';
  const subs = subsToday(z, dayNum(now));
  const KO = { english: '영어', math: '수학', korean: '국어', nonsul: '논술' };
  const today = subs.length ? subs.map((s) => KO[s]).join('·') : '없음';
  return `🟢 지가르데 큐브: 셀 ${z.cells}/${CELL_MAX} · 오늘 찾은 곳 ${today} · 모습 ${zygFormOf(z)}%${z.gave ? ' · 큐브가 만든 지가르데' : ''}`;
}
