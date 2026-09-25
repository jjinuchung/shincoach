// 🧬 포켓몬 레벨업 · 진화 (2026-09-25, 아버님: "레벨업 스톤으로 레벨업하고, 꼬부기 → 어니부기 → 거북왕 진화도")
//
// 왜: 🔷🔶 스톤은 지금까지 **사는 것**(🧭 레이더·🥚 알·🌈 이로치)에만 쓰였다. 셋을 다 사고 나면 매일 버는 스톤이 갈 곳이 없다.
//     포켓몬을 **키우는 데** 쓰이면 스톤이 계속 쓸모 있고, "오늘 수학을 해서 꼬부기를 거북왕으로" 가 된다.
//
// 아버님 결정 (2026-09-25):
//   ① 진화하면 **원작대로 변한다** — 꼬부기 한 마리가 어니부기가 된다(마릿수 이동). 도감 칸은 "잡았던 적 있음"으로 남아 수집 숫자는 안 줄어든다
//   ② 레벨업 비용은 **레벨 구간마다 스톤이 늘어난다**
//   ③ 과목이 갈리는 37쌍은 **원작대로 과목도 바뀐다** — 영어로 키운 고라파덕이 수학 골덕이 되면 그다음부터 🔷 수학스톤이 필요하다
//
// 규칙의 생김새:
//   - 레벨은 **종(種) 단위**다. 이 앱은 꾸밈·❤️HP·🌈이로치가 전부 종 단위다(꼬부기 2마리를 따로 꾸밀 수 없다) — 레벨만 개체 단위로 두면
//     그 구조를 통째로 뜯어야 한다. 대신 **진화는 잡은 마릿수를 하나 쓴다**: 꼬부기 3마리면 3번 진화할 수 있고,
//     레벨만 올려놓고 공짜로 계속 진화하는 구멍이 마릿수로 자연히 막힌다
//   - 진화해도 **레벨은 이어진다**(어니부기 쪽이 이미 더 높으면 그대로) — 진화가 성장을 되돌리면 키울 마음이 사라진다
//   - 진화 자체는 **무료**다. 값은 레벨업에서 이미 치렀다
//
// ★ 이 파일은 아무것도 import하지 않는다 (db.js가 트랜잭션 규칙에서 쓴다 — egg.js와 같은 원칙, 순환 없음).
//   그래서 "이 포켓몬이 어느 과목인가"(pokemon.subjectOf)는 부르는 쪽이 알려 준다.
// 🧬 진화표 — tools/evo_table.mjs가 PokeAPI에서 뽑은 것 (명단에 **둘 다 있는** 링크만)
// at = 앱에서 진화하는 레벨(명단에서 시작인 종 5, 한 번 진화한 종 10) · orig = 원작 조건(화면에 글로만 보여 준다)
export const EVO = {
  1: [{ to: 2, at: 5, orig: 'Lv16' }],                // 이상해씨 → 이상해풀
  2: [{ to: 3, at: 10, orig: 'Lv32' }],               // 이상해풀 → 이상해꽃
  4: [{ to: 5, at: 5, orig: 'Lv16' }],                // 파이리 → 리자드
  5: [{ to: 6, at: 10, orig: 'Lv36' }],               // 리자드 → 리자몽
  7: [{ to: 8, at: 5, orig: 'Lv16' }],                // 꼬부기 → 어니부기
  8: [{ to: 9, at: 10, orig: 'Lv36' }],               // 어니부기 → 거북왕
  16: [{ to: 17, at: 5, orig: 'Lv18' }],               // 구구 → 피죤
  19: [{ to: 20, at: 5, orig: 'Lv20' }],               // 꼬렛 → 레트라
  25: [{ to: 26, at: 10, orig: '천둥의돌 사용' }],           // 피카츄 → 라이츄
  35: [{ to: 36, at: 5, orig: '달의돌 사용' }],             // 삐삐 → 픽시
  37: [{ to: 38, at: 5, orig: '불꽃의돌 사용' }],            // 식스테일 → 나인테일
  54: [{ to: 55, at: 5, orig: 'Lv33' }],               // 고라파덕 → 골덕
  58: [{ to: 59, at: 5, orig: '불꽃의돌 사용' }],            // 가디 → 윈디
  63: [{ to: 64, at: 5, orig: 'Lv16' }],               // 캐이시 → 윤겔라
  64: [{ to: 65, at: 10, orig: '통신교환' }],              // 윤겔라 → 후딘
  79: [{ to: 199, at: 5, orig: '왕의징표석을 지니고 통신교환' }],   // 야돈 → 야도킹
  92: [{ to: 93, at: 5, orig: 'Lv25' }],               // 고오스 → 고우스트
  93: [{ to: 94, at: 10, orig: '통신교환' }],              // 고우스트 → 팬텀
  95: [{ to: 208, at: 5, orig: '금속코트를 지니고 통신교환' }],    // 롱스톤 → 강철톤
  104: [{ to: 105, at: 5, orig: 'Lv28' }],              // 탕구리 → 텅구리
  123: [{ to: 212, at: 5, orig: '금속코트를 지니고 통신교환' }],    // 스라크 → 핫삼
  129: [{ to: 130, at: 5, orig: 'Lv20' }],              // 잉어킹 → 갸라도스
  133: [{ to: 134, at: 5, orig: '물의돌 사용' }, { to: 135, at: 5, orig: '천둥의돌 사용' }, { to: 136, at: 5, orig: '불꽃의돌 사용' }, { to: 196, at: 5, orig: '낮에 친하게 지내면' }, { to: 197, at: 5, orig: '밤에 친하게 지내면' }, { to: 470, at: 5, orig: '이끼바위 근처에서 레벨업' }, { to: 471, at: 5, orig: '얼음바위 근처에서 레벨업' }, { to: 700, at: 5, orig: '페어리 기술을 배우고 친하게 지내면' }], // 이브이 → 샤미드·쥬피썬더·부스터·에브이·블래키·리피아·글레이시아·님피아
  147: [{ to: 148, at: 5, orig: 'Lv30' }],              // 미뇽 → 신뇽
  148: [{ to: 149, at: 10, orig: 'Lv55' }],             // 신뇽 → 망나뇽
  155: [{ to: 156, at: 5, orig: 'Lv14' }],              // 브케인 → 마그케인
  156: [{ to: 157, at: 10, orig: 'Lv36' }],             // 마그케인 → 블레이범
  158: [{ to: 159, at: 5, orig: 'Lv18' }],              // 리아코 → 엘리게이
  159: [{ to: 160, at: 10, orig: 'Lv30' }],             // 엘리게이 → 장크로다일
  172: [{ to: 25, at: 5, orig: '친하게 지내면' }],            // 피츄 → 피카츄
  183: [{ to: 184, at: 5, orig: 'Lv18' }],              // 마릴 → 마릴리
  228: [{ to: 229, at: 5, orig: 'Lv24' }],              // 델빌 → 헬가
  246: [{ to: 247, at: 5, orig: 'Lv30' }],              // 애버라스 → 데기라스
  247: [{ to: 248, at: 10, orig: 'Lv55' }],             // 데기라스 → 마기라스
  255: [{ to: 256, at: 5, orig: 'Lv16' }],              // 아차모 → 영치코
  256: [{ to: 257, at: 10, orig: 'Lv36' }],             // 영치코 → 번치코
  258: [{ to: 259, at: 5, orig: 'Lv16' }],              // 물짱이 → 늪짱이
  259: [{ to: 260, at: 10, orig: 'Lv36' }],             // 늪짱이 → 대짱이
  261: [{ to: 262, at: 5, orig: 'Lv18' }],              // 포챠나 → 그라에나
  371: [{ to: 372, at: 5, orig: 'Lv30' }],              // 아공이 → 쉘곤
  372: [{ to: 373, at: 10, orig: 'Lv50' }],             // 쉘곤 → 보만다
  375: [{ to: 376, at: 5, orig: 'Lv45' }],              // 메탕구 → 메타그로스
  390: [{ to: 391, at: 5, orig: 'Lv14' }],              // 불꽃숭이 → 파이숭이
  391: [{ to: 392, at: 10, orig: 'Lv36' }],             // 파이숭이 → 초염몽
  393: [{ to: 394, at: 5, orig: 'Lv16' }],              // 팽도리 → 팽태자
  394: [{ to: 395, at: 10, orig: 'Lv36' }],             // 팽태자 → 엠페르트
  403: [{ to: 404, at: 5, orig: 'Lv15' }],              // 꼬링크 → 럭시오
  404: [{ to: 405, at: 10, orig: 'Lv30' }],             // 럭시오 → 렌트라
  443: [{ to: 444, at: 5, orig: 'Lv24' }],              // 딥상어동 → 한바이트
  444: [{ to: 445, at: 10, orig: 'Lv48' }],             // 한바이트 → 한카리아스
  447: [{ to: 448, at: 5, orig: '낮에 친하게 지내면' }],        // 리오르 → 루카리오
  506: [{ to: 507, at: 5, orig: 'Lv16' }],              // 요테리 → 하데리어
  570: [{ to: 571, at: 5, orig: 'Lv30' }],              // 조로아 → 조로아크
  613: [{ to: 614, at: 5, orig: 'Lv37' }],              // 코고미 → 툰베어
  634: [{ to: 635, at: 5, orig: 'Lv64' }],              // 디헤드 → 삼삼드래
  656: [{ to: 657, at: 5, orig: 'Lv16' }],              // 개구마르 → 개굴반장
  657: [{ to: 658, at: 10, orig: 'Lv36' }],             // 개굴반장 → 개굴닌자
  661: [{ to: 662, at: 5, orig: 'Lv17' }],              // 화살꼬빈 → 불화살빈
  744: [{ to: 745, at: 5, orig: 'Lv25' }],              // 암멍이 → 루가루암
};

/** 포켓몬이 오를 수 있는 가장 높은 레벨 */
export const MAX_LV = 12;

/** 레벨업 비용 — 구간마다 스톤이 늘어난다 (upto = 이 레벨까지 도달할 때 드는 값) */
export const COST = [
  { upto: 5, stones: 1, coins: 30 },    // Lv2~5   : 첫 진화까지 스톤 4개 (하루 2개면 이틀)
  { upto: 10, stones: 2, coins: 60 },   // Lv6~10  : 최종 진화까지 누적 14개 (일주일)
  { upto: MAX_LV, stones: 3, coins: 100 }, // Lv11~12 : 만렙까지 누적 20개
];

/** 스톤 아이템 id (items.js STONE_MATH/STONE_ENGLISH와 같아야 한다 — 테스트로 고정) */
export const STONE_ID = { math: 'stone_math', english: 'stone_english' };

/** 그 과목을 키우는 데 쓰는 스톤 id */
export function stoneIdFor(subject) {
  return subject === 'math' ? STONE_ID.math : STONE_ID.english;
}

/**
 * 지금 데리고 있는 마릿수 = 잡은 누적 − 진화로 내보낸 누적.
 *
 * ★ 진화가 `caught`를 직접 줄이면 안 된다 — 백업 병합이 `caught`를 **max**로 합치기 때문에
 *   옛 백업을 되돌리는 순간 내보낸 꼬부기가 되살아나 어니부기와 함께 **복제**된다(알 재부화와 같은 모양).
 *   내보낸 수를 단조 카운터(`mons[id].evo`)로 두면 양쪽 다 max로 합쳐도 답이 맞는다.
 * @param {number} caughtN profile.caught[id]
 * @param {object} mon profile.mons[id]
 */
export function haveOf(caughtN, mon) {
  const got = Math.max(0, Math.floor(Number(caughtN) || 0));
  const out = Math.max(0, Math.floor(Number(mon && mon.evo) || 0));
  return Math.max(0, got - out);
}

/** mons[id] 레코드 → 지금 레벨 (기록이 없으면 1) */
export function lvOf(mon) {
  const lv = Math.floor(Number(mon && mon.lv) || 0);
  return Math.max(1, Math.min(MAX_LV, lv || 1));
}

/** toLv에 **도달하는** 한 번의 값 → { stones, coins } (오를 수 없는 레벨이면 null) */
export function costTo(toLv) {
  const lv = Math.floor(Number(toLv) || 0);
  if (lv < 2 || lv > MAX_LV) return null;
  const step = COST.find((c) => lv <= c.upto);
  return step ? { stones: step.stones, coins: step.coins } : null;
}

/**
 * 이 종이 지금 올릴 수 있는 가장 높은 레벨.
 *
 * ★ 진화하는 종은 **진화 레벨에서 멈춘다**(아버님 결정 2026-09-25). 안 그러면 두 과목 요구가 뚫린다 —
 *   케이시(영어)를 🔶만으로 Lv10까지 올려 두면 윤겔라(수학)가 Lv10을 그대로 물려받아 🔷 한 개도 없이
 *   후딘까지 간다(Codex 10차 #7이 재현). 지금은 꼬부기 Lv5 → 어니부기 Lv10 → 거북왕 Lv12로 단계마다 끊긴다.
 *   누적 비용(20개)은 그대로고, 과목이 갈리는 줄기는 두 과목을 다 해야 끝까지 간다.
 */
export function levelCapOf(id) {
  const at = evoAt(id);
  return at === null ? MAX_LV : at;
}

/**
 * 지금 레벨에서 한 번 올리는 값 → { toLv, stones, coins } (더 못 올리면 null)
 * @param {number} [id] 종을 주면 진화 레벨에서 멈춘다 (안 주면 만렙까지)
 */
export function nextCost(curLv, id) {
  const cap = id === undefined || id === null ? MAX_LV : levelCapOf(id);
  const to = lvOf({ lv: curLv }) + 1;
  if (to > cap) return null;
  const c = costTo(to);
  return c ? { toLv: to, ...c } : null;
}

/** 더 못 올리는 까닭: 만렙이라서인가('max'), 진화를 해야 해서인가('evolve') */
export function capReason(id, lv) {
  if (nextCost(lv, id)) return null;
  return lvOf({ lv }) >= MAX_LV ? 'max' : 'evolve';
}

/** Lv1에서 toLv까지 다 올리는 데 드는 누적 → { stones, coins } (화면에 "앞으로 얼마" 를 보여 줄 때) */
export function totalTo(toLv) {
  let stones = 0;
  let coins = 0;
  for (let lv = 2; lv <= Math.min(MAX_LV, Math.floor(Number(toLv) || 0)); lv++) {
    const c = costTo(lv);
    if (c) { stones += c.stones; coins += c.coins; }
  }
  return { stones, coins };
}

/** curLv에서 toLv까지 남은 값 → { stones, coins } */
export function costBetween(curLv, toLv) {
  const a = totalTo(lvOf({ lv: curLv }));
  const b = totalTo(toLv);
  return { stones: Math.max(0, b.stones - a.stones), coins: Math.max(0, b.coins - a.coins) };
}

/** 이 포켓몬의 진화 갈래 목록 (못 하면 빈 배열) — 이브이만 8갈래, 나머지는 하나 */
export function evoOf(id) {
  return EVO[Number(id)] || [];
}

/** 이 포켓몬이 진화하는 레벨 (못 하면 null) */
export function evoAt(id) {
  const list = evoOf(id);
  return list.length ? list[0].at : null;
}

/** 갈래가 여럿이라 아이가 골라야 하는가 (이브이) */
export function needsChoice(id) {
  return evoOf(id).length > 1;
}

/** 진화 갈래 하나 찾기 (아이가 고른 것이 진짜 갈래인지 확인할 때) */
export function evoTo(id, toId) {
  return evoOf(id).find((e) => e.to === Number(toId)) || null;
}

/**
 * 지금 진화할 수 있는가 → { ok, why }
 * why: 'no-evo'(진화가 없는 종) | 'level'(레벨이 모자람) | 'none'(한 마리도 없음) | 'to'(고른 갈래가 없음)
 * @param {number} id 지금 포켓몬
 * @param {number} lv 지금 레벨
 * @param {number} count 잡은 마릿수 (진화는 한 마리를 쓴다)
 * @param {number} [toId] 갈래를 골랐다면 그 id
 */
export function canEvolve(id, lv, count, toId) {
  const list = evoOf(id);
  if (!list.length) return { ok: false, why: 'no-evo' };
  if (!(Number(count) > 0)) return { ok: false, why: 'none' };
  if (lvOf({ lv }) < list[0].at) return { ok: false, why: 'level' };
  if (toId !== undefined && toId !== null && !evoTo(id, toId)) return { ok: false, why: 'to' };
  if (toId === undefined || toId === null) {
    if (list.length > 1) return { ok: false, why: 'to' }; // 갈래가 여럿이면 골라야 한다
  }
  return { ok: true };
}

/** 갈래를 안 골랐을 때 쓸 기본 진화 대상 (갈래가 하나인 종만) */
export function soleEvo(id) {
  const list = evoOf(id);
  return list.length === 1 ? list[0].to : null;
}

/**
 * ⚔️ 배틀에서 레벨이 주는 힘 — 레벨당 +3% (Lv1 = 1.0, Lv12 = 1.33).
 * 메가진화(×1.4)와 비슷한 크기로 맞췄다. 더 키우면 배틀이 시시해진다.
 */
export const LV_ATK = 0.03;
export function lvMult(lv) {
  return 1 + (lvOf({ lv }) - 1) * LV_ATK;
}

/** 이 종이 다른 무엇으로부터 진화해 온 것인가 (도감에서 "무엇이 진화한 모습" 을 보여 줄 때) → [id…] */
export function evoFrom(id) {
  const to = Number(id);
  return Object.keys(EVO).filter((k) => EVO[k].some((e) => e.to === to)).map(Number);
}
