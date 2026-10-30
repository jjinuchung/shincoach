// 🟢 지가르데 셀 모으기 — 순수 규칙 (화면 없음 · korean.js의 날 번호만 import — db·xp·zygview·시험이 그대로 부른다)
// 화면은 zygview.js(끝 화면 구석의 셀) · 도감 모습 칸은 shop.js · 배틀 스웜체인지는 battle.js
//
// 진우 (2026-10-27, 아버님 전달): 셀을 모을수록 모습이 바뀌는 지가르데를 앱에서도
//   → 기본안 55hXEcqCkZZ4HENPAfuBVX 「추천대로」 — 🔴 코어 먼저 · 공부를 끝낸 화면에 숨은 셀 · 하루 3개 ·
//     셀 10 → 10%폼 · 50 → 50%폼 · 100 → 퍼펙트폼(배틀에서 HP 절반 아래면 스웜체인지) · 퍼펙트폼 + 💠 → 메가 ·
//     논술에서 못 잡았어도 셀 10이면 10%폼 지가르데가 생긴다 · 큐브에 셀 수
// 세부(v352): 과목마다 하루 하나 · 모두 합쳐 하루 3(기본안의 「과목마다 나와서 여러 과목을 하게」) · 맨 처음 찾기는 코어(셀 수에는 안 셈) ·
//   셀 100이면 더는 안 나온다
// v359 (2026-10-28 아버님 「도감에 50%부터 시작되는 것처럼 나와 — 첫 단계 셀 모습부터」 → 기본안 「이대로」):
//   모습은 셀 수로만 열린다 — 1%폼(앱이 그린 🔴 코어 + 🟢 셀 · 원작 폼이 아니다 · 처음부터) · 셀 10 10%폼 · 셀 50 50%폼 ·
//   논술에서 잡은 지가르데도 같다(전에는 50%로 시작) · 셀 10·50 문턱에서 저절로 그 모습으로 · 열린 모습끼리는 도감에서 고른다
// v371 (2026-10-30 아버님 「낚시하다가도 셀을 낚게 — 2% 정도」 → 기본안 「추천대로」): 🎣 학습 낚시터 입질마다 2%로 셀(fishing.cellRoll) ·
//   낚시 셀은 하루 하나 · 공부 끝 화면 셀(하루 DAY_MAX)과 따로 센다 — 열쇠 「날:fish」(FISH_SRC) · 처음이면 코어 · 셀 100이면 안 나온다
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
/** 하루에 찾을 수 있는 수 (코어 포함 · 🎣 낚시 셀은 따로) */
export const DAY_MAX = 3;
/** 🎣 낚시터에서 낚은 셀의 열쇠 이름 (v371 — 하루 하나 · DAY_MAX와 따로) */
export const FISH_SRC = 'fish';
/** 큐브에 모이는 셀 끝 — 퍼펙트폼 */
export const CELL_MAX = 100;
/** 모습이 열리는 셀 수 */
export const STEP = { ten: 10, fifty: 50, perfect: 100 };

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const cnt = (v) => { const n = Math.floor(Number(v)); return Number.isSafeInteger(n) && n > 0 ? n : 0; };
const minPos = (a, b) => (a && b ? Math.min(a, b) : a || b);
/** 고를 수 있는 모습 — 1%폼(v359) · 10%폼 · 50%폼 (퍼펙트폼은 배틀에서만) */
export const FORM_LIST = ['1', '10', '50'];
const formOk = (f) => (FORM_LIST.includes(f) ? f : '');
/** 그 모습이 열리는 셀 수 */
const formNeed = (f) => (f === '50' ? STEP.fifty : f === '10' ? STEP.ten : 0);

// 1%폼 그림 — 끝 화면의 🔴 코어(짙은 초록 육각형 + 붉은 핵)에 🟢 셀(초록 덩어리 + 눈 하나)이 붙은 모습 (zygview.js의 CORE_ART·CELL_ART와 같은 꼴 ·
//   그림 파일 없이 data: 주소라 인터넷이 없어도 · 도트도 없다)
const CORE_FORM_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="240" height="240">'
  + '<g transform="translate(10 8) scale(2)"><path d="M20 3L35 11.5V28.5L20 37L5 28.5V11.5Z" fill="#14532d" stroke="#4ade80" stroke-width="2.5"/>'
  + '<circle cx="20" cy="20" r="8" fill="#ef4444" stroke="#fecaca" stroke-width="2"/><circle cx="17.5" cy="17.5" r="2.2" fill="#fee2e2"/></g>'
  + '<g transform="translate(70 68) scale(1.2)"><path d="M20 4C30 4 36 12 35 21C34 31 27 36 20 36C12 36 5 30 5 21C5 12 10 4 20 4Z" fill="#4ade80" stroke="#166534" stroke-width="2.5"/>'
  + '<circle cx="20" cy="19" r="5.5" fill="#14532d"/><circle cx="18.3" cy="17.4" r="1.8" fill="#bbf7d0"/></g></svg>';
/** 1%폼 그림 주소 (v359) */
export const CORE_FORM_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(CORE_FORM_SVG)}`;
/** 찾은 것 열쇠 「날 번호:과목」 · 「날 번호:fish」(🎣 v371) */
const keyOk = (k) => {
  if (typeof k !== 'string' || !/^\d+:[a-z]+$/.test(k)) return false;
  const src = k.slice(k.indexOf(':') + 1);
  return SUBJECTS.includes(src) || src === FISH_SRC;
};

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

/** 그날 찾은 곳 (과목 · 🎣 fish) */
function foundToday(z, today) {
  const head = `${today}:`;
  return z.keys.filter((k) => k.startsWith(head)).map((k) => k.slice(head.length));
}
/** 그날 찾은 과목 — 하루 DAY_MAX는 과목만 센다 (🎣 낚시 셀은 따로 · v371) */
function subsToday(z, today) {
  return foundToday(z, today).filter((s) => s !== FISH_SRC);
}

/** 이 과목 끝 화면에 셀(또는 코어)을 숨겨 둘까 — now는 시각(ms) */
export function zygCanFind(raw, sub, now) {
  const z = zygOf(raw);
  if (!SUBJECTS.includes(sub) || z.cells >= CELL_MAX) return false;
  const subs = subsToday(z, dayNum(now));
  return !subs.includes(sub) && subs.length < DAY_MAX;
}

/** 🎣 오늘 낚시터에서 셀(또는 코어)이 걸릴 수 있나 — 오늘 낚시 셀을 아직 안 찾았고 큐브가 덜 찼다 (v371 · now는 시각(ms)) */
export function zygCanFish(raw, now) {
  const z = zygOf(raw);
  return z.cells < CELL_MAX && !foundToday(z, dayNum(now)).includes(FISH_SRC);
}

/** 다음에 찾을 것 — 'core' | 'cell' */
export function zygNext(raw) {
  return zygOf(raw).core ? 'cell' : 'core';
}

/**
 * 셀(또는 코어) 찾기 — 저장된 프로필로 한 트랜잭션 (xp.zygFind → houseDo)
 * @returns {{ok:boolean, why?:'sub'|'full'|'subject'|'day', found?:'core'|'cell', cells?:number, ev?:'gift'|'ten'|'fifty'|'perfect'|null, form?:string}}
 *   ev — gift: 셀 10에 지가르데가 생김(10%폼) · ten: 이미 있어서 10%폼으로(v359 — 전에는 고를 수 있게만) · fifty: 셀 50(50%폼으로) · perfect: 셀 100
 */
export function zygFindRule(p, sub, now) {
  const fish = sub === FISH_SRC; // 🎣 낚시 셀 (v371) — 하루 하나 · 과목 셀 하루 DAY_MAX와 따로
  if (!SUBJECTS.includes(sub) && !fish) return { ok: false, why: 'sub' };
  const z = zygOf(p.zyg);
  if (z.cells >= CELL_MAX) return { ok: false, why: 'full' };
  const today = dayNum(now);
  if (fish) {
    if (foundToday(z, today).includes(FISH_SRC)) return { ok: false, why: 'day' };
  } else {
    const subs = subsToday(z, today);
    if (subs.includes(sub)) return { ok: false, why: 'subject' };
    if (subs.length >= DAY_MAX) return { ok: false, why: 'day' };
  }
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
      if (cnt(caught[ZYG_ID]) > 0) {
        z.form = '10'; // 1%폼에서 저절로 (v359)
        z.formAt = at;
        ev = 'ten';
      } else {
        // 논술에서 못 잡았어도 큐브가 지가르데를 만든다 — 편지 🌟와 같은 꼴(도감 +1 · 처음 얻은 포켓몬이면 파트너)
        p.caught = { ...caught, [ZYG_ID]: 1 };
        if (!p.partner) p.partner = ZYG_ID;
        z.gave = 1;
        z.form = '10';
        z.formAt = at;
        ev = 'gift';
      }
    } else if (n === STEP.fifty) {
      z.form = '50'; // 1%·10%폼에서 저절로 (v359 — 고른 적 없던 지가르데도 이제 50%폼이 처음 열리는 때)
      z.formAt = at;
      ev = 'fifty';
    } else ev = 'perfect';
  }
  p.zyg = z;
  return { ok: true, found: 'cell', cells: z.cells, ev, form: z.form };
}

/**
 * 지금 모습 — '1' | '10' | '50' · 고른 모습이 셀 수로 열려 있으면 그것 · 아니면(고른 적 없거나 잠김) 열린 가장 큰 모습
 * (v359 — 전에는 고른 적 없으면 50% · 그래서 논술에서 잡은 지가르데가 셀 1개에도 50%폼이었다)
 */
export function zygFormOf(raw) {
  const z = zygOf(raw);
  if (z.form && z.cells >= formNeed(z.form)) return z.form;
  return z.cells >= STEP.fifty ? '50' : z.cells >= STEP.ten ? '10' : '1';
}

/** 50%폼이 열렸나 — 셀 50 이상 (v359 — 논술에서 잡은 지가르데도 같다) */
export function zygCan50(raw) {
  return zygOf(raw).cells >= STEP.fifty;
}

/** 이 모습을 고를 수 있나 — 지가르데가 도감에 있고 그 모습의 셀 수가 모였다 (1%폼은 처음부터) */
export function zygFormOpen(raw, caught, form) {
  const z = zygOf(raw);
  if (!cnt(isObj(caught) ? caught[ZYG_ID] : 0)) return false;
  return !!formOk(form) && z.cells >= formNeed(form);
}

/** 도감에서 모습 고르기 — 한 트랜잭션 */
export function zygFormRule(p, form, now) {
  if (!formOk(form)) return { ok: false, why: 'form' };
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
  const subs = foundToday(z, dayNum(now));
  const KO = { english: '영어', math: '수학', korean: '국어', nonsul: '논술', [FISH_SRC]: '낚시' };
  const today = subs.length ? subs.map((s) => KO[s]).join('·') : '없음';
  return `🟢 지가르데 큐브: 셀 ${z.cells}/${CELL_MAX} · 오늘 찾은 곳 ${today} · 모습 ${zygFormOf(z)}%${z.gave ? ' · 큐브가 만든 지가르데' : ''}`;
}
