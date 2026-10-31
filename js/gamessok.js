// 🌀 쏙쏙! 파트너 모험 — 🎮 게임기 미니 게임 열여섯째 (v373 · 2026-10-31 아버님 「진우가 스위치로 하는 『별의 커비』 같은 게임」 → 여쭘
// (디스커버리 · 빨아들이기·날기·보스·친구 모두 좋아함 · 새 게임 · 60초 두 엄지) → 기본안 「추천대로」)
// 장르의 재미만 가져온다 — 원작의 캐릭터·이름·그림·소리·스테이지는 쓰지 않는다(공개 저장소) · 주인공은 🤝 파트너(없으면 내 캐릭터) ·
//   메카·찌리리공·피죤·열매는 🗺️ 대모험과 같은 세계
// 두 엄지 — 마당 왼쪽 반: 톡 폴짝 · 공중에서 꾹 둥실(누르는 동안 천천히 떠오르고, 떼면 천천히 내려온다)
//          마당 오른쪽 반: 꾹 빨아들이기(떼면 그침) · 입에 물었으면 누르는 순간 ⭐ 별 뱉기 · 능력이 있으면 누르는 순간 기술
// 능력은 포켓몬 타입 셋 — 가슴에 타입 그림이 붙은 능력 메카를 빨아들이면 바로 그 능력(삼키는 손짓 없음)
//   🔥 불꽃: 불꽃탄 — 🌿 덤불을 태운다 · ⚡ 전기: 몸 둘레 번개 + 앞의 첫 적에 번개 — 높이 나는 🛸 드론도 ·
//   🪨 바위: 돌이 되어 쿵(그동안 안 다침) → 내려앉으면 바위가 굴러가 금 간 바위를 깬다 · 🔥🪨⚡ 모두 보스가 굴린 것을 부순다(⭐ 별은 지나침)
//   능력이 없어도 빨아들이기·뱉기만으로 끝까지 — 능력은 숨은 ✨와 빠른 보스의 덤 · 능력 칸을 톡 하면 내려놓는다
// 저절로 천천히 걷는다(대모험의 절반) · 길 약 40초 → 🤖 로켓단 큰 메카(체력 10칸 · 20초 — 못 이기면 「도망갔다!」) · 목숨·게임 오버 없음
//   (꽈당 1초 — 능력은 별이 되어 튀어나가고 3초 안에 빨아들이거나 닿으면 돌아온다 · 구덩이는 🐦 피죤) · 💰·스톤·경험치 없음(다른 게임과 같게)
// 1단계 = 빨아들이기·뱉기·능력 셋·둥실·보스 · 2단계(10-31 아버님 「다음 2단계 가자」 — 같은 v373에) =
//   🔒 로켓단 우리(한 판에 셋 · 별·기술·번개로 맞히면 열림 · 우리 앞에 늘 보통 메카 하나 = 뱉을 별) → 갇혔던 포켓몬이 친구가 되어 뒤따라옴(셋까지 ·
//   1·2세대 작은 포켓몬 20마리 가운데 · 도감엔 안 듦) → 🤖 보스에서 친구마다 한 번 몸통박치기(1칸) ·
//   🔴 큰 몬스터볼 머금기(디스커버리의 「머금기」를 우리 물건으로) — 빨아들이면 3초 동안 데굴데굴 빨리 굴러가며 메카·덤불·금 간 바위·우리를 부수고 연다(그동안 안 다침)
//
// 위쪽(엔진)은 순수 — 시각(ms)과 rng만 받는다(길은 시작할 때 rng로 한 번 만든다 · node 시험이 가짜 시계로 끝까지) · 아래쪽(runSsok)이 화면
// 자리는 🗺️ 대모험과 같은 "칸"(화면 너비 100칸 · 높이 64칸 · y는 아래에서 위로 · 땅 윗면 8) · 누름은 다음 걸음(16ms)에 한다(s.act)
import { sfx, vibrate } from './sfx.js';
import { musicMode } from './gamesong.js';
import { ART as RUN_ART } from './gamerun.js';
import { FALLBACK as DIG_FALLBACK } from './gamedig.js';
import { ADV_W, ADV_H, GROUND, ME, ADV_ART, ART as ADV_DRAW } from './gameadv.js';

/** 한 판 길이(초) — 길 약 40초 + 🤖 보스 20초 (게임 목록에 적는 값 · 끝은 보스) */
export const SSOK_SEC = 60;
/** 앞으로 걷기(칸/초) — 🗺️ 대모험(26)의 절반: 빨아들이고 뱉을 틈 */
export const WALK_V = 13;
/** 뛰기 — 중력 · 처음 힘(톡 약 17칸) */
export const GRAVITY = 300;
export const JUMP_V = 100;
/** 🫧 둥실 — 누르는 동안 이 빠르기까지 천천히 오른다 · 거기까지 붙는 힘 · 떼면 이 빠르기로 천천히 내려온다 · 꼭대기(위 줄 아래) */
export const HOVER_UP = 16;
export const HOVER_ACC = 240;
export const FALL_SLOW = 9;
export const CEIL = ADV_H - ME.h - 6;
/** 뛰고 나서 꾹 누른 채 이만큼(ms) 지나면 둥실 — 톡(짧게)은 그냥 폴짝 */
export const PUFF_AFTER_MS = 220;
/** 발판 끝에서 떨어진 바로 뒤에도 폴짝(ms) */
export const COYOTE_MS = 100;
/** 꽈당 · 피죤이 구덩이에서 건너편으로 · 앞이 이만큼 막히면 피죤이 넘겨 줌 · 넘겨 주는 모습 (ms) */
export const STUMBLE_MS = 1000;
export const RESCUE_MS = 1200;
export const HELP_MS = 2000;
export const HELP_ANIM_MS = 600;
/** 메카를 위에서 밟으면 튀어 오르는 힘 */
export const BOUNCE_V = 70;
/** 🌀 빨아들이기 — 바람이 닿는 앞(칸) · 위아래로 몸보다 이만큼 더 · 끌려오는 빠르기(칸/초) */
export const SUCK_LEN = 20;
export const SUCK_PAD = 3;
export const SUCK_V = 45;
/** 날아가는 것 — ⭐ 별 · 🔥 불꽃탄 · 🪨 굴러가는 바위 빠르기(칸/초) · 날아가는 끝(칸) · ⚡ 번개가 닿는 앞(칸) */
export const SPIT_V = 60;
export const FIRE_V = 55;
export const ROCK_V = 45;
export const SHOT_RANGE = 60;
export const ZAP_RANGE = 50;
/** ⚡ 몸 둘레 번개가 닿는 넓이(칸 — 몸 둘레로) */
export const ZAP_RING = 8;
/**
 * 기술 사이(ms — 🪨는 더 길게: 돌인 동안은 안 다쳐서, 짧으면 늘 돌이었다) · 🪨 돌인 동안(ms — 걷기는 그대로: 멈추면 바위를 잇달아 누를 때 판이 100초를 넘었다) ·
 * 공중에서 돌이 되면 떨어지는 빠르기
 */
export const MOVE_CD_MS = 600;
export const ROCK_CD_MS = 1200;
export const STONE_MS = 600;
export const STONE_FALL = 150;
/** 꽈당하거나 내려놓아 튀어나간 능력 별 — 이 안에(ms) 빨아들이거나 닿으면 돌아온다 */
export const LOST_MS = 3000;
/** 능력 — 포켓몬 타입 셋 · emoji는 떠오르는 글에만(🪨는 옛 기기 글꼴에 없을 수 있어 그림은 화면의 abIcon이 그린다) */
export const ABILITIES = {
  fire: { emoji: '🔥', ko: '불꽃' },
  elec: { emoji: '⚡', ko: '전기' },
  rock: { emoji: '', ko: '바위' },
};
const AB_IDS = Object.keys(ABILITIES);
/** 물건 — 크기(칸) · ⭐ (움직이는 것은 빠르기도) · bolt/ball = 보스가 굴리는 볼트·찌리리공 · ab = 튀어나간 능력 별 */
export const SSOK_KINDS = {
  berry: { w: 5, h: 5, pts: 1 },
  gold: { w: 5, h: 5, pts: 3 },
  mecha: { w: 8, h: 8, pts: 2, v: 5 },
  drone: { w: 8, h: 5, pts: 2, v: 6 },
  volt: { w: 6, h: 6, pts: 0 },
  bush: { w: 7, h: 7, pts: 2 },
  crack: { w: 7, h: 7, pts: 2 },
  bolt: { w: 5, h: 5, pts: 0 },
  ball: { w: 6, h: 6, pts: 0 },
  ab: { w: 6, h: 6, pts: 0 },
  star: { w: 5, h: 5 },
  fire: { w: 5, h: 4 },
  rock: { w: 6, h: 6 },
  cage: { w: 8, h: 10, pts: 3 }, // 🔒 로켓단 우리 — 그루터기처럼 막는다(밟고 넘을 수도) · 열면 친구 ⭐3
  mball: { w: 9, h: 9, pts: 0 }, // 🔴 큰 몬스터볼 — 길에 놓여 있다(막지 않는다) · 빨아들이면 머금고 데굴데굴
};
/** 🤝 친구가 될 포켓몬 — 1·2세대의 작은 포켓몬 20마리(앱 명단 ROSTER에 있는 것 · 이름도 같게 — 시험이 대조) · 한 판에 셋을 고른다 */
export const FRIENDS = [
  { id: 1, ko: '이상해씨' }, { id: 4, ko: '파이리' }, { id: 7, ko: '꼬부기' }, { id: 25, ko: '피카츄' }, { id: 35, ko: '삐삐' },
  { id: 39, ko: '푸린' }, { id: 43, ko: '뚜벅쵸' }, { id: 54, ko: '고라파덕' }, { id: 60, ko: '발챙이' }, { id: 79, ko: '야돈' },
  { id: 104, ko: '탕구리' }, { id: 133, ko: '이브이' }, { id: 152, ko: '치코리타' }, { id: 155, ko: '브케인' }, { id: 158, ko: '리아코' },
  { id: 161, ko: '꼬리선' }, { id: 172, ko: '피츄' }, { id: 175, ko: '토게피' }, { id: 179, ko: '메리프' }, { id: 183, ko: '마릴' },
];
/** 한 판의 우리 수 = 따라오는 친구 끝 */
export const FRIEND_MAX = 3;
/** 🤖 보스에서 친구 몸통박치기 — 처음(ms) · 친구 사이(ms) · 한 방(칸) */
export const FRIEND_HELP = { first: 2500, gap: 3500, dmg: 1 };
/** 🔴 머금고 굴러가는 동안(ms) · 빠르기(칸/초 — 걷기의 두 배 반 남짓 · 3초에 102칸) */
export const MOUTHFUL_MS = 3000;
export const BALL_V = 34;
/**
 * 🤖 보스 — 체력 칸 · 싸우는 시간(ms) · ⭐ 별 한 방(칸) · 기술 한 방(칸) · 이기면 ⭐ · 남은 이만큼(ms)마다 ⭐1 더 · 굴리는 사이(ms) · 첫 굴리기(ms) ·
 * 굴러오는 빠르기 · 크기 · 셋째마다 ⚡ 찌리리공(못 빨아들인다 — 폴짝·둥실로 넘는다) · 깎은 칸마다 ⭐1
 * 능력 없이 별만으로: 볼트 다섯을 되뱉으면 이긴다(12초쯤) · 🔥 불꽃이면 7초쯤 — 시험이 둘 다 풀어 본다
 */
export const BOSS = { hp: 10, ms: 20000, star: 2, move: 1, win: 10, bonusMs: 5000, every: 1500, first: 1200, roll: 20, w: 20, h: 22, ballEvery: 3 };
/** 싸움터 — 넓이(한 화면) · 보스 자리(싸움터 왼쪽 끝에서 칸) · 나는 싸움터 왼쪽 끝에서 ME.screen칸에 선다 */
export const ARENA = { len: ADV_W, bossX: 74 };
/** 길 — 처음 평지 · 조각 수 · 처음 서 있는 자리 · 싸움터 앞 평지 */
export const START_LEN = 30;
export const CHUNK_N = 9;
/** 정해 둔 자리의 조각 — 둘째는 능력 메카 · 셋째·다섯째·여덟째는 🔒 우리 · 일곱째는 🔴 몬스터볼(바로 뒤 우리까지 굴러가 열 수 있게) */
export const FORCED = { 1: 'ab', 2: 'cage', 4: 'cage', 6: 'mball', 7: 'cage' };
export const START_X = 10;
export const END_LEN = 24;
/** 받을 그림 — ⚡ 찌리리공 · 🐦 피죤 (🗺️ 대모험과 같은 번호) */
export const SSOK_ART = ADV_ART;
/** 혹시 몰라 둔 끝(ms) — 안 눌러도 보통 70초 안에 끝난다 */
export const MAX_MS = 150000;
const STEP_MS = 16;
const EPS = 0.01;

const nz = (v) => {
  const n = Math.floor(Number(v) || 0);
  return n > 0 ? n : 0;
};
const overlap = (a0, a1, b0, b1) => a0 < b1 && a1 > b0;
const pickAb = (rng) => {
  const r = Number(rng());
  return AB_IDS[Math.min(AB_IDS.length - 1, Math.max(0, Math.floor((r >= 0 && r < 1 ? r : 0) * AB_IDS.length)))];
};

/**
 * 길 조각 — 앞뒤 끝은 늘 평지 · lv 0 쉬움 → 2 어려움(뒤로 갈수록) · ab = 능력 메카가 나오는 조각(둘째 조각은 늘 이 가운데 하나)
 * 덤불·금 간 바위는 그루터기처럼 밟고 넘을 수 있다 — 🔥·🪨로 깨면 숨은 ✨ (능력이 없어도 지나간다)
 * forced = 정해 둔 자리(FORCED)에만 나온다(🔒 우리 · 🔴 몬스터볼) — 우리 앞에는 늘 보통 메카 하나(빨아들여 뱉을 별)
 */
export const CHUNKS = [
  { id: 'row', lv: 0, len: 44, make: (c) => { for (const dx of [10, 17, 24, 31]) c.item('berry', dx, GROUND + 2); } },
  { id: 'mecha', lv: 0, len: 50, make: (c) => { c.item('berry', 12, GROUND + 2); c.mecha(32, 14, 38); } },
  { id: 'stump', lv: 0, len: 40, make: (c) => { c.solid(16, 7, 7); c.item('berry', 17, GROUND + 9); } },
  { id: 'fire', lv: 0, ab: 'fire', len: 62, make: (c) => { c.mecha(26, 16, 30, 'fire'); c.block('bush', 48); } },
  { id: 'rock', lv: 1, ab: 'rock', len: 62, make: (c) => { c.mecha(26, 16, 30, 'rock'); c.block('crack', 48); } },
  { id: 'elec', lv: 1, ab: 'elec', len: 70, make: (c) => { c.mecha(22, 14, 26, 'elec'); c.drone(52, 30, 44, 62); } },
  { id: 'pit', lv: 1, len: 48, make: (c) => { c.pit(14, 30); c.item('berry', 17, GROUND + 18); c.item('berry', 24, GROUND + 20); } },
  { id: 'volt', lv: 1, len: 44, make: (c) => { c.volt(20); c.item('gold', 21, GROUND + 22); } },
  { id: 'drones', lv: 1, len: 60, make: (c) => { c.drone(24, 28, 16, 34); c.drone(46, 36, 38, 56); } },
  { id: 'widepit', lv: 2, len: 56, make: (c) => { c.pit(12, 40); for (const dx of [18, 25, 32]) c.item('berry', dx, GROUND + 22); } },
  { id: 'mechas', lv: 2, len: 72, make: (c, rng) => { c.mecha(28, 12, 32); c.mecha(56, 44, 62, pickAb(rng)); } },
  { id: 'blocks', lv: 2, len: 56, make: (c) => { c.block('bush', 16); c.block('crack', 36); } },
  { id: 'pitmecha', lv: 2, len: 64, make: (c) => { c.pit(10, 24); c.mecha(46, 36, 52); } },
  { id: 'cage', lv: 0, forced: true, len: 56, make: (c) => { c.mecha(12, 8, 16); c.cage(40); } },
  // 🔴 3초에 102칸 — 짧게 두어 다음 조각(우리 · 덤불·금 간 바위)까지 굴러간다(84칸일 때는 1칸 모자랐고, 바람 끝에서 빨아들이면 머금는 자리가 6칸쯤 뒤가 된다)
  { id: 'mball', lv: 1, forced: true, len: 52, make: (c) => { c.mball(6); c.mecha(20, 16, 24); c.mecha(34, 30, 38); c.volt(44); } },
];
/** 조각 차례의 어려움 — 처음 셋은 쉬운 것 · 다섯째까지 보통 · 그 뒤 어려운 것도 */
export function chunkLevel(i) {
  return i < 3 ? 0 : i < 5 ? 1 : 2;
}

/** 🤝 이번 판 친구 셋 (순수) — FRIENDS에서 겹치지 않게 k마리 */
export function ssokFriendPick(rng = Math.random, k = FRIEND_MAX) {
  const pool = FRIENDS.slice();
  const out = [];
  while (out.length < k && pool.length) {
    const r = Number(rng());
    out.push(pool.splice(Math.min(pool.length - 1, Math.max(0, Math.floor((r >= 0 && r < 1 ? r : 0) * pool.length))), 1)[0]);
  }
  return out;
}

/**
 * 길 하나 만들기 (순수) → { len, arenaX, pits, ground, solids, blocks, fruits, mechas, drones, volts, chunks, seq }
 * 처음 평지 → 조각 열(둘째는 늘 능력 메카 조각 · 같은 조각이 잇달아 나오지 않게 · 그 어려움의 조각을 두 배로) → 평지 → 🤖 싸움터
 * ids를 주면 그 조각들로만(시험이 조각 하나씩 볼 때)
 */
export function ssokStage(rng = Math.random, ids = null) {
  const st = { len: 0, arenaX: 0, pits: [], ground: [], solids: [], blocks: [], fruits: [], mechas: [], drones: [], volts: [], cages: [], mballs: [], chunks: [], seq: 0 };
  const maker = (x0) => ({
    item: (kind, dx, y) => { const k = SSOK_KINDS[kind]; st.fruits.push({ n: ++st.seq, kind, x: x0 + dx, y, w: k.w, h: k.h }); },
    solid: (dx, w, h) => { st.solids.push({ n: ++st.seq, x: x0 + dx, w, top: GROUND + h }); },
    block: (kind, dx) => { const k = SSOK_KINDS[kind]; st.blocks.push({ n: ++st.seq, kind, x: x0 + dx, y: GROUND, w: k.w, h: k.h }); },
    pit: (a, b) => { st.pits.push([x0 + a, x0 + b]); },
    mecha: (dx, a, b, ab = null) => { const k = SSOK_KINDS.mecha; st.mechas.push({ n: ++st.seq, x: x0 + dx, y: GROUND, w: k.w, h: k.h, a: x0 + a, b: x0 + b, ab }); },
    drone: (dx, y, a, b) => { const k = SSOK_KINDS.drone; st.drones.push({ n: ++st.seq, x: x0 + dx, y: GROUND + y, w: k.w, h: k.h, a: x0 + a, b: x0 + b }); },
    volt: (dx) => { const k = SSOK_KINDS.volt; st.volts.push({ n: ++st.seq, x: x0 + dx, y: GROUND, w: k.w, h: k.h }); },
    cage: (dx) => { const k = SSOK_KINDS.cage; st.cages.push({ n: ++st.seq, x: x0 + dx, y: GROUND, w: k.w, h: k.h, fi: st.cages.length }); }, // fi = 몇째 친구
    mball: (dx) => { const k = SSOK_KINDS.mball; st.mballs.push({ n: ++st.seq, x: x0 + dx, y: GROUND, w: k.w, h: k.h }); },
  });
  let x = START_LEN;
  let prev = '';
  const order = Array.isArray(ids) ? ids.map((id) => CHUNKS.find((c) => c.id === id)).filter(Boolean) : null;
  for (let i = 0; i < (order ? order.length : CHUNK_N); i++) {
    let ch = order && order[i];
    if (!ch) {
      const lv = chunkLevel(i);
      const f = FORCED[i];
      const pool = f === 'ab' ? CHUNKS.filter((c) => c.ab) : f ? CHUNKS.filter((c) => c.id === f) : CHUNKS.filter((c) => !c.forced && c.lv <= lv && c.id !== prev);
      const weighted = f ? pool : pool.flatMap((c) => (c.lv === lv ? [c, c] : [c]));
      const r = Number(rng());
      ch = weighted[Math.min(weighted.length - 1, Math.max(0, Math.floor((r >= 0 && r < 1 ? r : 0) * weighted.length)))];
    }
    ch.make(maker(x), rng);
    st.chunks.push(ch.id);
    prev = ch.id;
    x += ch.len;
  }
  st.arenaX = x + END_LEN;
  st.len = st.arenaX + ARENA.len;
  // 땅 = 처음부터 끝까지에서 구덩이를 뺀 것
  let at = 0;
  for (const [a, b] of [...st.pits].sort((p, q) => p[0] - q[0])) {
    if (a > at) st.ground.push([at, a]);
    at = Math.max(at, b);
  }
  st.ground.push([at, st.len]);
  return st;
}

/** 새 판 (순수) — now = 시작 시각(ms) · 길은 rng로 한 번 만든다 (ids — 시험용 조각 차례) */
export function ssokStart(now, rng = Math.random, ids = null) {
  const stage = ssokStage(rng, ids);
  return {
    t0: now, last: now, end: now + MAX_MS, stage, seq: stage.seq,
    x: START_X, y: GROUND, vy: 0, onGround: true,
    held: false, jumpAt: 0, offAt: 0, puffed: false,
    sucking: false, mouth: null, ability: null, act: null, cdUntil: 0, stoneUntil: 0, stoneRolled: true,
    stumbleUntil: 0, rescueUntil: 0, blockedMs: 0, helpAt: 0,
    fruits: stage.fruits.map((o) => ({ ...o, pull: false })),
    blocks: stage.blocks.map((o) => ({ ...o })),
    mechas: stage.mechas.map((m) => ({ ...m, vx: -SSOK_KINDS.mecha.v, pull: false })),
    drones: stage.drones.map((d) => ({ ...d, y0: d.y, vx: -SSOK_KINDS.drone.v, pull: false })),
    volts: stage.volts.map((v) => ({ ...v })),
    cages: stage.cages.map((c) => ({ ...c })),
    mballs: stage.mballs.map((b) => ({ ...b, pull: false })),
    shots: [], rollers: [], lost: null, zap: null, rollUntil: 0, freed: [],
    boss: null,
    score: 0, berries: 0, golds: 0, sucked: 0, spits: 0, hits: 0, abilities: 0, moves: 0, opened: 0, stomps: 0, bumps: 0, rescues: 0, helps: 0, bossDmg: 0, rolls: 0,
    done: false, win: false, fled: false, doneAt: 0, bossPts: 0,
  };
}

/** 화면 왼쪽 끝(칸) (순수) — 나를 왼쪽에서 ME.screen칸에 두고 따라간다 · 싸움터에 들어서면 멈춘다 */
export function ssokCam(s) {
  return Math.max(0, Math.min(s.stage.arenaX, s.x - ME.screen));
}

/** 🎵 음악이 서두를 때 (순수) — 🤖 보스와 싸우는 동안 */
export function ssokHurry(s) {
  return !!s && !s.done && !!s.boss;
}

/** 밟고 설 수 있는 것들 (땅 · 그루터기 · 아직 안 깬 덤불·금 간 바위 · 아직 안 연 🔒 우리) → [{ x, w, top, bottom, ref? }] — ref = 🔴 굴러가며 깰 수 있는 것 */
function boxes(s) {
  const out = [];
  for (const [a, b] of s.stage.ground) out.push({ x: a, w: b - a, top: GROUND, bottom: -100 });
  for (const o of s.stage.solids) out.push({ x: o.x, w: o.w, top: o.top, bottom: -100 });
  for (const o of s.blocks) out.push({ x: o.x, w: o.w, top: o.y + o.h, bottom: -100, ref: o });
  for (const o of s.cages) out.push({ x: o.x, w: o.w, top: o.y + o.h, bottom: -100, ref: o });
  return out;
}

/** 🔒 우리를 엶 — 갇혔던 친구가 나온다(⭐3) · 셋까지 뒤따라오고(s.freed 차례) · 보스에서 한 번씩 돕는다 */
function openCage(s, c, by, ev) {
  const i = s.cages.indexOf(c);
  if (i < 0) return;
  s.cages.splice(i, 1);
  const pts = SSOK_KINDS.cage.pts;
  s.score += pts;
  s.freed.push(c.fi);
  ev.freed.push({ c, fi: c.fi, pts, by });
}

/** 지금 발밑의 가장 높은 윗면 (없으면 -Infinity) — 발 양쪽 1칸은 봐준다 */
function footTop(s, list, y) {
  let top = -Infinity;
  for (const b of list) if (overlap(s.x + 1, s.x + ME.w - 1, b.x, b.x + b.w) && b.top <= y + EPS && b.top > top) top = b.top;
  return top;
}

function jumpNow(s, t, v = JUMP_V) {
  s.vy = v;
  s.onGround = false;
  s.puffed = false;
  s.jumpAt = t;
  s.offAt = 0;
}

/** 입·몸 앞 — 빨려 오는 것이 닿는 자리 · 날아가는 것이 나가는 자리 */
const mouthX = (s) => s.x + ME.w - 2;
const mouthY = (s) => s.y + 3;

/** ✨ 숨은 황금 열매 — 덤불·금 간 바위를 깨면 그 자리에 */
function openBlock(s, b, ev) {
  s.blocks = s.blocks.filter((o) => o !== b);
  const pts = SSOK_KINDS[b.kind].pts;
  s.score += pts;
  s.opened += 1;
  const k = SSOK_KINDS.gold;
  const gold = { n: ++s.seq, kind: 'gold', x: b.x + (b.w - k.w) / 2, y: GROUND + 1, w: k.w, h: k.h, pull: false };
  s.fruits.push(gold);
  ev.opened.push({ b, pts, gold });
}

/** 적을 쓰러뜨림 (별·기술·돌·밟기) — 메카·드론 ⭐2 · 굴러오는 것은 ⭐ 없이 */
function defeat(s, list, o, by, ev) {
  const i = list.indexOf(o);
  if (i < 0) return;
  list.splice(i, 1);
  const pts = list === s.rollers ? 0 : SSOK_KINDS[list === s.drones ? 'drone' : 'mecha'].pts;
  s.score += pts;
  if (by !== 'stomp') s.hits += 1;
  ev.killed.push({ o, pts, by });
}

/**
 * 🤖 보스에 한 방 — 깎은 칸마다 ⭐1(바로 보이게) · 다 깎으면 이김: 보스 몫이 모두 ⭐10 + 남은 5초마다 1이 되게 모자란 만큼만 더한다
 * (깎은 ⭐에 ⭐10을 또 얹어 이긴 판이 ⭐20+였다 — 기본안은 「이기면 ⭐10 · 못 이기면 깎은 만큼」 · 🔍 Codex 177차 P1)
 * ev.won = 보스 몫 전체(⭐10+) · ev.wonAdd = 이길 때 더한 것(빨리 이긴 덤)
 */
function bossHit(s, t, dmg, ev) {
  const b = s.boss;
  if (!b || s.done) return;
  const d = Math.min(b.hp, dmg);
  b.hp -= d;
  b.hitAt = t;
  s.bossDmg += d;
  s.score += d;
  ev.bossHit.push(d);
  if (b.hp <= 0) {
    s.win = true;
    s.done = true;
    s.doneAt = t;
    s.bossPts = BOSS.win + Math.floor(Math.max(0, b.until - t) / BOSS.bonusMs);
    const add = Math.max(0, s.bossPts - s.bossDmg);
    s.score += add;
    ev.won = s.bossPts;
    ev.wonAdd = add;
  }
}

/** 꽈당 — 1초 멈칫 · 능력은 별이 되어 앞으로 튀어나간다(3초 안에 빨아들이거나 닿으면 돌아온다) · 입에 문 것은 놓친다 */
function hurt(s, t, what, ev) {
  s.stumbleUntil = t + STUMBLE_MS;
  s.bumps += 1;
  s.puffed = false;
  if (s.ability) popAbility(s, t, ev);
  if (s.mouth) { s.mouth = null; ev.spilled = true; }
  ev.hurt.push(what);
}
function popAbility(s, t, ev) {
  const k = SSOK_KINDS.ab;
  s.lost = { n: ++s.seq, ab: s.ability, x: s.x + ME.w + 4, y: s.y + 4, w: k.w, h: k.h, vy: 40, until: t + LOST_MS, pull: false };
  ev.lost = s.ability;
  s.ability = null;
  s.stoneUntil = 0;
}

/** 날아가는 것 하나 내보내기 — ⭐ 별 · 🔥 불꽃탄 · 🪨 굴러가는 바위(땅 위로) */
function shoot(s, kind) {
  const k = SSOK_KINDS[kind];
  const v = kind === 'star' ? SPIT_V : kind === 'fire' ? FIRE_V : ROCK_V;
  const y = kind === 'rock' ? GROUND : mouthY(s);
  s.shots.push({ n: ++s.seq, kind, x: mouthX(s), y, w: k.w, h: k.h, vx: v, from: mouthX(s) });
}

/**
 * ⚡ 번개 — ① 몸 둘레(ZAP_RING칸)의 것을 모두 친다(보스가 굴린 것도 · 능력이 있으면 빨아들일 수 없으니 막을 길) ·
 * ② 앞(ZAP_RANGE칸 안)의 가장 가까운 적 하나 — 높이는 상관없다(높이 나는 드론도) · 🤖 보스도 · 없으면 헛방
 */
function zapNow(s, t, ev) {
  const ring = (o) => overlap(s.x - ZAP_RING, s.x + ME.w + ZAP_RING, o.x, o.x + o.w) && overlap(s.y - ZAP_RING, s.y + ME.h + ZAP_RING, o.y, o.y + o.h);
  for (const lst of [s.mechas, s.drones, s.rollers]) for (const o of lst.filter((x) => !x.pull && ring(x))) defeat(s, lst, o, 'zap', ev);
  ev.ring = true;
  const x0 = s.x + ME.w - 1;
  let best = null;
  const near = (list, o) => {
    if (o.pull || o.x + o.w < x0 || o.x > x0 + ZAP_RANGE) return;
    if (!best || o.x < best.o.x) best = { list, o };
  };
  for (const m of s.mechas) near(s.mechas, m);
  for (const d of s.drones) near(s.drones, d);
  for (const c of s.cages) near(s.cages, c); // 🔒 우리 자물쇠도 번개로 열린다
  const b = s.boss;
  const bossFirst = b && !s.done && b.x <= x0 + ZAP_RANGE && (!best || b.x < best.o.x);
  if (bossFirst) {
    s.zap = { x: b.x + b.w / 2, y: b.y + b.h * 0.7, t };
    bossHit(s, t, BOSS.move, ev);
  } else if (best) {
    s.zap = { x: best.o.x + best.o.w / 2, y: best.o.y + best.o.h / 2, t };
    if (best.list === s.cages) openCage(s, best.o, 'zap', ev); else defeat(s, best.list, best.o, 'zap', ev);
  } else s.zap = { x: x0 + ZAP_RANGE * 0.6, y: GROUND, t, miss: true };
  ev.zap = s.zap;
}

/** 🪨 돌이 내려앉음 — 앞으로 바위가 굴러간다(한 번) */
function rollRock(s, ev) {
  s.stoneRolled = true;
  shoot(s, 'rock');
  ev.rocked = true;
}

/** 누른 것 하기 (걸음 처음에) — 'spit' · 'move'(능력 기술) · 'drop'(능력 내려놓기) */
function doAct(s, t, ev) {
  const a = s.act;
  s.act = null;
  if (a === 'spit' && s.mouth) {
    s.mouth = null;
    s.spits += 1;
    shoot(s, 'star');
    ev.spat = true;
  } else if (a === 'move' && s.ability) {
    s.moves += 1;
    ev.move = s.ability;
    if (s.ability === 'fire') shoot(s, 'fire');
    else if (s.ability === 'elec') zapNow(s, t, ev);
    else if (s.ability === 'rock') {
      s.stoneUntil = t + STONE_MS;
      s.stoneRolled = false;
      s.puffed = false;
      if (!s.onGround) s.vy = -STONE_FALL;
      else rollRock(s, ev);
    }
  } else if (a === 'drop' && s.ability) {
    popAbility(s, t, ev);
    ev.dropped = true;
  }
}

/** ⭐·🔥·🪨 날아가는 것 — 덤불·금 간 바위 · 메카·드론 · 🤖 보스 가운데 먼저 닿는 것 하나에서 멈춘다 (보스가 굴린 것은 ⭐ 지나침 · 🔥🪨 부수며 지나감) */
function moveShots(s, t, dt, ev) {
  for (let i = s.shots.length - 1; i >= 0; i--) {
    const sh = s.shots[i];
    sh.x += sh.vx * dt;
    const hit = (o) => overlap(sh.x, sh.x + sh.w, o.x, o.x + o.w) && overlap(sh.y, sh.y + sh.h, o.y, o.y + o.h);
    let gone = false;
    for (const b of s.blocks) {
      if (!hit(b)) continue;
      if ((sh.kind === 'fire' && b.kind === 'bush') || (sh.kind === 'rock' && b.kind === 'crack')) openBlock(s, b, ev);
      else ev.thud = true; // 별·맞지 않는 기술은 막힌다
      gone = true;
      break;
    }
    if (!gone) {
      const c = s.cages.find((x) => hit(x)); // 🔒 우리 — 별·불꽃·바위 무엇이든 맞으면 열린다
      if (c) { openCage(s, c, sh.kind, ev); gone = true; }
    }
    if (!gone) {
      for (const [list, ok] of [[s.mechas, true], [s.drones, sh.kind !== 'rock']]) {
        if (!ok) continue;
        const o = list.find((x) => !x.pull && hit(x));
        if (o) { defeat(s, list, o, sh.kind, ev); gone = true; break; }
      }
    }
    // 보스가 굴린 볼트·찌리리공 — ⭐ 별은 그냥 지나친다(막히면 보스에 못 닿고, 부수면 빨아들일 볼트가 반으로 줄었다) ·
    //   🔥 불꽃탄·🪨 바위는 부수며 지나간다(능력이 있으면 빨아들일 수 없으니 막을 길이 있어야)
    if (!gone && sh.kind !== 'star') for (const r of s.rollers.filter((x) => !x.pull && hit(x))) defeat(s, s.rollers, r, sh.kind, ev);
    if (!gone && s.boss && !s.done && hit(s.boss)) {
      bossHit(s, t, sh.kind === 'star' ? BOSS.star : BOSS.move, ev);
      gone = true;
    }
    if (!gone && sh.x - sh.from > SHOT_RANGE) { gone = true; ev.fizz.push(sh); }
    if (gone) { s.shots.splice(i, 1); ev.shotGone.push(sh); }
  }
}

/** 🤖 보스 — 굴리기 · 시간이 다 되면 「도망갔다!」 · 굴러오는 것은 싸움터 왼쪽 밖으로 나가면 사라진다 */
function bossStep(s, t, dt, ev) {
  const b = s.boss;
  if (!b) return;
  if (t >= b.nextAt) {
    const kind = b.seq % BOSS.ballEvery === BOSS.ballEvery - 1 ? 'ball' : 'bolt';
    const k = SSOK_KINDS[kind];
    const r = { n: ++s.seq, kind, x: b.x - k.w, y: GROUND, w: k.w, h: k.h, vx: -BOSS.roll, pull: false };
    s.rollers.push(r);
    b.seq += 1;
    b.nextAt += BOSS.every;
    ev.thrown.push(r);
  }
  for (let i = s.rollers.length - 1; i >= 0; i--) {
    const r = s.rollers[i];
    if (r.pull) continue;
    r.x += r.vx * dt;
    if (r.x + r.w < s.stage.arenaX - 4) { s.rollers.splice(i, 1); ev.rolledOff.push(r); }
  }
  // 🤝 친구 몸통박치기 — 구한 친구마다 한 번(정해 둔 때에)
  for (const h of b.helps) {
    if (h.done || t < h.at || s.done) continue;
    h.done = true;
    ev.friendHit.push({ fi: h.fi, k: h.k });
    bossHit(s, t, FRIEND_HELP.dmg, ev);
  }
  if (s.done) return;
  if (t >= b.until && !s.done) {
    s.done = true;
    s.fled = true;
    s.doneAt = t;
    ev.fled = true;
  }
}

/** 빨려 오는 것들 — [list, o, what] (⚡ 찌리리공은 무거워서 안 빨려 온다) */
function suckables(s) {
  const out = [];
  for (const m of s.mechas) out.push([s.mechas, m, 'mecha']);
  for (const d of s.drones) out.push([s.drones, d, 'drone']);
  for (const f of s.fruits) out.push([s.fruits, f, 'fruit']);
  for (const r of s.rollers) if (r.kind === 'bolt') out.push([s.rollers, r, 'bolt']);
  if (s.lost) out.push([null, s.lost, 'ab']);
  for (const b of s.mballs) out.push([s.mballs, b, 'mball']);
  return out;
}

/** 놓아줌 — 빨려 오다 만 것은 제자리로 (메카는 땅에 · 드론은 제 높이 · 다니던 길에 지금 자리를 넣는다) */
function release(s) {
  for (const [, o, what] of suckables(s)) {
    if (!o.pull) continue;
    o.pull = false;
    if (what === 'mecha' || what === 'bolt' || what === 'mball') o.y = GROUND;
    if (what === 'drone') o.y = o.y0;
    if (what === 'mecha' || what === 'drone') { o.a = Math.min(o.a, o.x); o.b = Math.max(o.b, o.x); }
  }
}

/** 입에 들어옴 — 열매는 바로 ⭐ · 능력 메카는 바로 능력(⭐2) · 튀어나간 능력 별은 돌아옴 · 🔴 몬스터볼은 머금고 굴러감 · 보통 메카·드론(⭐2)·볼트는 입에 문다 */
function swallow(s, t, list, o, what, ev) {
  if (list) { const i = list.indexOf(o); if (i >= 0) list.splice(i, 1); }
  s.sucked += 1;
  if (what === 'fruit') {
    const pts = SSOK_KINDS[o.kind].pts;
    s.score += pts;
    if (o.kind === 'gold') s.golds += 1; else s.berries += 1;
    ev.got.push({ o, pts, sucked: true });
    return;
  }
  if (what === 'ab') {
    s.ability = o.ab;
    s.lost = null;
    ev.regained = o.ab;
    return;
  }
  if (what === 'mball') { // 🔴 머금고 데굴데굴 — 3초
    s.rollUntil = t + MOUTHFUL_MS;
    s.rolls += 1;
    s.puffed = false;
    ev.mouthful = true;
    return;
  }
  const pts = what === 'bolt' ? 0 : SSOK_KINDS[what].pts;
  s.score += pts;
  if (what === 'mecha' && o.ab) {
    s.ability = o.ab;
    s.abilities += 1;
    ev.ability.push({ o, ab: o.ab, pts });
    return;
  }
  s.mouth = what;
  ev.mouthed.push({ o, what, pts });
}

function step(s, t, dt, ev) {
  if (s.done) return;
  if (s.act) doAct(s, t, ev);
  // 🤖 메카·🛸 드론 — 정해진 사이를 오간다(내가 멈춰도 · 빨려 오는 동안은 바람 쪽으로)
  for (const m of [...s.mechas, ...s.drones]) {
    if (m.pull) continue;
    m.x += m.vx * dt;
    if (m.x <= m.a) { m.x = m.a; m.vx = Math.abs(m.vx); }
    if (m.x >= m.b) { m.x = m.b; m.vx = -Math.abs(m.vx); }
  }
  moveShots(s, t, dt, ev);
  if (s.done) return;
  bossStep(s, t, dt, ev);
  if (s.done) return;
  // 튀어나간 능력 별 — 땅에 떨어져 기다리다 3초 지나면 사라진다
  if (s.lost && !s.lost.pull) {
    const l = s.lost;
    if (t >= l.until) { s.lost = null; ev.lostGone = true; } else {
      l.vy -= GRAVITY * dt;
      l.y = Math.max(GROUND, l.y + l.vy * dt);
      if (l.y <= GROUND) l.vy = 0;
    }
  }
  // 🔴 머금고 굴러가기가 끝남(3초)
  if (s.rollUntil && t >= s.rollUntil) { s.rollUntil = 0; ev.mouthfulEnd = true; }
  if (t < s.rescueUntil) return; // 🐦 피죤이 구덩이에서 건너편으로 데려가는 동안
  let list = boxes(s);
  const stone = t < s.stoneUntil;
  const rolling = t < s.rollUntil;
  // ➡️ 걷기(꽈당·보스 동안은 멈춤 — 🪨 돌이어도 걷는다 · 🔴 굴러가면 빨리) — 앞을 막는 것이 있으면 멈춘다 · 오래 막히면 피죤이 넘겨 준다 · 싸움터에 들어서면 🤖
  if (!s.boss && t >= s.stumbleUntil) {
    const nx = Math.min(s.x + (rolling ? BALL_V : WALK_V) * dt, s.stage.arenaX + ME.screen);
    const front = s.x + ME.w - 1;
    let wall = null;
    for (const b of list) {
      if (b.x >= front - EPS && b.x < nx + ME.w - 1 && s.y < b.top - EPS && s.y + ME.h > b.bottom + EPS && (!wall || b.x < wall.x)) wall = b;
    }
    // 🔴 굴러가면 덤불·금 간 바위는 깨고, 🔒 우리는 열고 그대로 지나간다(그루터기는 그대로 막는다)
    if (wall && rolling && wall.ref) {
      if (s.cages.includes(wall.ref)) openCage(s, wall.ref, 'ball', ev); else openBlock(s, wall.ref, ev);
      list = boxes(s);
      wall = null;
    }
    if (wall) {
      s.x = wall.x - ME.w + 1;
      s.blockedMs += dt * 1000;
      if (s.blockedMs >= HELP_MS && s.onGround) {
        s.blockedMs = 0;
        jumpNow(s, t, Math.sqrt(2 * GRAVITY * Math.max(4, wall.top - s.y + 3)));
        s.helps += 1;
        s.helpAt = t;
        ev.helped = true;
      }
    } else {
      s.x = nx;
      s.blockedMs = 0;
    }
    if (s.x >= s.stage.arenaX + ME.screen - EPS) {
      // 🤝 구한 친구마다 한 번 몸통박치기 — 정해 둔 때(처음 2.5초 · 3.5초 사이)
      const helps = s.freed.slice(0, FRIEND_MAX).map((fi, k) => ({ fi, k, at: t + FRIEND_HELP.first + k * FRIEND_HELP.gap, done: false }));
      const b = { hp: BOSS.hp, x: s.stage.arenaX + ARENA.bossX, y: GROUND, w: BOSS.w, h: BOSS.h, t0: t, until: t + BOSS.ms, nextAt: t + BOSS.first, seq: 0, hitAt: 0, helps };
      s.boss = b;
      if (s.rollUntil) { s.rollUntil = 0; ev.mouthfulEnd = true; } // 싸움터에서는 몬스터볼을 내려놓는다
      ev.boss = true;
    }
  }
  // 발밑이 사라졌으면 떨어지기 시작(조금은 폴짝할 수 있다)
  if (s.onGround && footTop(s, list, s.y) < s.y - EPS) { s.onGround = false; s.vy = 0; s.offAt = t; }
  // ⬆️⬇️ 폴짝·둥실·떨어지기 (🪨 돌이면 쿵 떨어진다)
  const prevY = s.y;
  if (!s.onGround) {
    if (stone) s.vy = -STONE_FALL;
    else if (s.puffed && !rolling) {
      if (s.held) s.vy = s.vy > HOVER_UP ? Math.max(HOVER_UP, s.vy - GRAVITY * dt) : Math.min(HOVER_UP, s.vy + HOVER_ACC * dt);
      else s.vy = Math.max(s.vy - GRAVITY * dt, -FALL_SLOW);
    } else {
      s.vy -= GRAVITY * dt;
      if (!rolling && s.held && (s.vy <= HOVER_UP || t - s.jumpAt >= PUFF_AFTER_MS)) { s.puffed = true; ev.puffed = true; } // 🔴 머금은 동안은 둥실 없음
    }
    let ny = s.y + s.vy * dt;
    if (ny > CEIL) { ny = CEIL; if (s.vy > 0) s.vy = 0; }
    if (s.vy <= 0) {
      const top = footTop(s, list, s.y);
      if (top > -Infinity && ny <= top) {
        ny = top;
        s.vy = 0;
        s.onGround = true;
        s.offAt = 0;
        s.puffed = false;
        if (stone && !s.stoneRolled) rollRock(s, ev);
      }
    }
    s.y = ny;
  }
  // 🕳️ 구덩이 아래로 — 피죤이 건너편 땅에 내려 준다
  if (s.y < GROUND - ME.h - 2) {
    const mid = s.x + ME.w / 2;
    const pit = s.stage.pits.find(([a, b]) => mid >= a - ME.w && mid <= b + ME.w) || null;
    s.x = pit ? pit[1] + 1 : s.x;
    s.y = GROUND;
    s.vy = 0;
    s.onGround = true;
    s.puffed = false;
    s.stoneUntil = 0;
    if (s.rollUntil) { s.rollUntil = 0; ev.mouthfulEnd = true; }
    s.rescues += 1;
    s.rescueUntil = t + RESCUE_MS;
    release(s);
    ev.rescued = true;
    return;
  }
  // 🌀 빨아들이기 — 오른쪽 엄지를 누르는 동안 · 입이 비고 능력이 없을 때 · 바람 안의 것이 입 쪽으로 끌려와 닿으면 입에
  const canSuck = s.sucking && !s.mouth && !s.ability && t >= s.stumbleUntil && t >= s.stoneUntil && t >= s.rollUntil;
  if (canSuck) {
    const x0 = s.x + ME.w - 1;
    const x1 = x0 + SUCK_LEN;
    const y0 = s.y - SUCK_PAD;
    const y1 = s.y + ME.h + SUCK_PAD;
    const mx = mouthX(s);
    const my = mouthY(s);
    for (const [lst, o, what] of suckables(s)) {
      if (s.mouth || s.ability || t < s.rollUntil) break; // 입이 찼다(능력을 얻었다 · 몬스터볼을 머금었다) — 나머지는 다음에
      if (!o.pull) {
        if (!overlap(x0, x1, o.x, o.x + o.w) || !overlap(y0, y1, o.y, o.y + o.h)) continue;
        o.pull = true;
        ev.pulling.push(o);
      }
      o.x = Math.max(mx, o.x - SUCK_V * dt);
      const dy = my - o.y;
      o.y += Math.sign(dy) * Math.min(Math.abs(dy), SUCK_V * dt);
      if (o.x <= mx + EPS) swallow(s, t, lst, o, what, ev);
    }
    if (s.mouth || s.ability || t < s.rollUntil) release(s);
  } else release(s);
  // 부딪히는 몸은 양옆·위아래를 조금 봐준다
  const hx0 = s.x + 2;
  const hx1 = s.x + ME.w - 2;
  const hy0 = s.y + 1;
  const hy1 = s.y + ME.h - 1;
  const touch = (o) => overlap(hx0, hx1, o.x + 1, o.x + o.w - 1) && overlap(hy0, hy1, o.y, o.y + o.h - 1);
  const stoneNow = t < s.stoneUntil;
  const ballNow = t < s.rollUntil; // 🔴 굴러가는 동안도 안 다치고 닿는 것을 쓰러뜨린다
  // 🤖 메카·🛸 드론 — 🪨 돌·🔴 굴러가기면 닿기만 해도 펑 · 위에서 밟으면 펑 · 옆이면 꽈당
  for (const lst of [s.mechas, s.drones]) {
    for (let i = lst.length - 1; i >= 0; i--) {
      const m = lst[i];
      if (m.pull || !touch(m)) continue;
      const fromTop = s.vy < 0 && prevY >= m.y + m.h - 3;
      if (stoneNow || ballNow) defeat(s, lst, m, ballNow ? 'ball' : 'stone', ev);
      else if (fromTop) {
        defeat(s, lst, m, 'stomp', ev);
        s.stomps += 1;
        s.vy = BOUNCE_V;
        s.onGround = false;
        s.puffed = false;
        s.jumpAt = t;
      } else if (t >= s.stumbleUntil) {
        lst.splice(i, 1);
        hurt(s, t, { o: m, kind: lst === s.drones ? 'drone' : 'mecha' }, ev);
      }
    }
  }
  // ⚡ 찌리리공 — 닿으면 찌릿 꽈당 · 🪨 돌이면 데굴데굴 굴러간다
  for (let i = s.volts.length - 1; i >= 0; i--) {
    const v = s.volts[i];
    if (!touch(v)) continue;
    s.volts.splice(i, 1);
    if (stoneNow || ballNow) { ev.rolled.push(v); continue; }
    if (t >= s.stumbleUntil) hurt(s, t, { o: v, kind: 'volt' }, ev); else ev.rolled.push(v);
  }
  // 🤖 보스가 굴린 것 — 닿으면 꽈당 · 🪨 돌이면 튕겨 낸다
  for (let i = s.rollers.length - 1; i >= 0; i--) {
    const r = s.rollers[i];
    if (r.pull || !touch(r)) continue;
    if (stoneNow) { defeat(s, s.rollers, r, 'stone', ev); continue; }
    if (t >= s.stumbleUntil) { s.rollers.splice(i, 1); hurt(s, t, { o: r, kind: r.kind }, ev); }
  }
  // 🍓 열매 — 닿아도 먹는다(조금 넉넉히)
  for (let i = s.fruits.length - 1; i >= 0; i--) {
    const o = s.fruits[i];
    if (o.pull || !overlap(s.x - 1, s.x + ME.w + 1, o.x, o.x + o.w) || !overlap(s.y - 1, s.y + ME.h + 1, o.y, o.y + o.h)) continue;
    s.fruits.splice(i, 1);
    const pts = SSOK_KINDS[o.kind].pts;
    s.score += pts;
    if (o.kind === 'gold') s.golds += 1; else s.berries += 1;
    ev.got.push({ o, pts, sucked: false });
  }
  // 튀어나간 능력 별 — 닿아도 돌아온다(꽈당 바로 뒤 1초는 빼고)
  if (s.lost && !s.lost.pull && t >= s.stumbleUntil && !s.ability && !s.mouth) {
    const l = s.lost;
    if (overlap(s.x - 1, s.x + ME.w + 1, l.x, l.x + l.w) && overlap(s.y - 1, s.y + ME.h + 1, l.y, l.y + l.h)) {
      s.ability = l.ab;
      s.lost = null;
      ev.regained = l.ab;
    }
  }
}

/**
 * 시계 (순수) — 지난번부터 now까지 16ms씩 나눠 움직인다 · 보스를 이기거나 보스가 도망가면 멈춘다
 * → { got, pulling, mouthed, ability, regained, lost, lostGone, dropped, spat, move, zap, rocked, killed, opened, hurt, spilled, rolled,
 *     thrown, rolledOff, shotGone, fizz, bossHit, boss, won(⭐|0), fled, rescued, helped, puffed, jumped, thud,
 *     freed(🔒 우리를 엶 { c, fi, pts, by }), friendHit(🤝 { fi, k }), mouthful(🔴 머금음), mouthfulEnd }
 */
export function ssokTick(s, now) {
  const ev = {
    freed: [], friendHit: [], mouthful: false, mouthfulEnd: false,
    got: [], pulling: [], mouthed: [], ability: [], regained: null, lost: null, lostGone: false, dropped: false, spat: false, move: null, zap: null, rocked: false,
    killed: [], opened: [], hurt: [], spilled: false, rolled: [], thrown: [], rolledOff: [], shotGone: [], fizz: [], bossHit: [], boss: false, won: 0, wonAdd: 0, fled: false, ring: false,
    rescued: false, helped: false, puffed: false, jumped: false, thud: false,
  };
  const to = Math.min(Number(now) || 0, s.end);
  while (s.last < to && !s.done) {
    const dt = Math.min(STEP_MS, to - s.last);
    s.last += dt;
    step(s, s.last, dt / 1000, ev);
  }
  if (!s.done && s.last >= s.end) { s.done = true; s.doneAt = s.last; } // 혹시 몰라 둔 끝
  return ev;
}

/**
 * 왼쪽 엄지 누름 (순수) → 'jump'(땅에서 · 발판 끝에서 막 떨어진 바로 뒤도) | 'puff'(공중 — 누르는 동안 둥실) | 'stone' | 'stumble' | 'over'
 * 화면은 먼저 ssokTick(s, now)으로 now까지 움직인 뒤에 부른다
 */
export function ssokLeft(s, now) {
  if (s.done) return 'over';
  s.held = true;
  if (now < s.stumbleUntil || now < s.rescueUntil) return 'stumble';
  if (now < s.stoneUntil) return 'stone';
  if (s.onGround || (s.offAt && now - s.offAt <= COYOTE_MS && s.vy <= 0)) { jumpNow(s, now); return 'jump'; }
  if (now < s.rollUntil) return 'roll'; // 🔴 머금은 동안은 폴짝만(둥실 없음)
  s.puffed = true;
  return 'puff';
}

/** 왼쪽 엄지 뗌 (순수) — 둥실이면 천천히 내려오기 시작 */
export function ssokLeftUp(s) {
  s.held = false;
}

/**
 * 오른쪽 엄지 누름 (순수) → 'spit'(입에 물었으면 ⭐ 별) | 'move'(능력 기술) | 'wait'(기술 사이) | 'suck'(누르는 동안 빨아들이기) | 'stone' | 'stumble' | 'over'
 * 뱉기·기술은 다음 걸음(16ms)에 한다(s.act) — 걸음 안에서 맞힌 것·⭐를 함께 알린다
 */
export function ssokRight(s, now) {
  if (s.done) return 'over';
  s.sucking = true;
  if (now < s.stumbleUntil || now < s.rescueUntil) return 'stumble';
  if (now < s.stoneUntil) return 'stone';
  if (now < s.rollUntil) return 'roll'; // 🔴 머금은 동안은 굴러가기만
  if (s.mouth) { s.act = 'spit'; return 'spit'; }
  if (s.ability) {
    if (now < s.cdUntil) return 'wait';
    s.cdUntil = now + (s.ability === 'rock' ? ROCK_CD_MS : MOVE_CD_MS);
    s.act = 'move';
    return 'move';
  }
  return 'suck';
}

/** 오른쪽 엄지 뗌 (순수) — 빨아들이기 그침(끌려오던 것은 제자리로) */
export function ssokRightUp(s) {
  s.sucking = false;
}

/** 능력 내려놓기 (순수 · 위 줄 능력 칸을 톡) → 'drop' | 'none' | 'over' — 별이 되어 앞으로 튀어나간다(3초 안에 다시 빨아들이면 돌아온다) */
export function ssokDrop(s) {
  if (s.done) return 'over';
  if (!s.ability) return 'none';
  s.act = 'drop';
  return 'drop';
}

/** 끝 글 (순수) — 이김 · 도망 · (혹시 몰라 둔 끝) + 🤝 오늘 구한 친구 이름(도감엔 안 든다) · friends = 이번 판 친구 [{ ko }] */
export function ssokEndText(s, friends = []) {
  const head = s.win ? '🎉 이겼다!' : s.fled ? '🚀 로켓단이 도망갔다! 다음엔 꼭!' : '끝!';
  const met = s.freed.map((fi) => (friends[fi] && friends[fi].ko) || '친구');
  return met.length ? `${head} · 오늘 구한 친구: ${met.join(' · ')}` : head;
}

/** 멈췄던 만큼 뒤로 민다 (순수) — 앱을 내렸다 돌아오면 그대로 이어서 */
export function ssokShift(s, ms) {
  const d = nz(ms);
  if (!d) return;
  s.t0 += d; s.end += d; s.last += d;
  for (const k of ['stumbleUntil', 'rescueUntil', 'stoneUntil', 'cdUntil', 'jumpAt', 'offAt', 'helpAt', 'doneAt', 'rollUntil']) if (s[k]) s[k] += d;
  if (s.lost) s.lost.until += d;
  if (s.zap) s.zap.t += d;
  if (s.boss) {
    for (const k of ['t0', 'until', 'nextAt', 'hitAt']) if (s.boss[k]) s.boss[k] += d;
    for (const h of s.boss.helps) h.at += d;
  }
}

// ───────────────────── 화면 (여기부터 브라우저) ─────────────────────

/** 코드로 그린 것 — 인터넷 없이도 (메카·⭐ 별은 🗺️ 대모험 그림 · 열매는 🏃 달리기 그림) */
export const ART = {
  drone: '<svg viewBox="0 0 40 25" aria-hidden="true"><ellipse cx="20" cy="15" rx="18" ry="6" fill="#adb5bd" stroke="#495057" stroke-width="2"/><path d="M9 13a11 9 0 0 1 22 0z" fill="#74c0fc" stroke="#495057" stroke-width="2"/><circle cx="20" cy="17" r="3.2" fill="#e8413b" stroke="#fff" stroke-width="1"/><text x="20" y="19.2" font-size="4.5" font-weight="900" text-anchor="middle" fill="#fff" font-family="sans-serif">R</text><circle cx="8" cy="16" r="1.6" fill="#ffd43b"/><circle cx="32" cy="16" r="1.6" fill="#ffd43b"/></svg>',
  bush: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M3 38c-2-9 4-15 10-14-1-8 8-13 13-8 5-5 14 0 11 9 4 3 3 10 0 13z" fill="#2f9e44" stroke="#1b5e20" stroke-width="2.5" stroke-linejoin="round"/><path d="M12 30l4-6 3 7 4-8 4 8" fill="none" stroke="#69db7c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  crack: '<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="2" y="2" width="36" height="36" rx="5" fill="#ced4da" stroke="#495057" stroke-width="3"/><path d="M20 3l-4 10 6 6-5 9 4 9M22 19l9-4M16 13l-9 3" fill="none" stroke="#343a40" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  bolt: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 3l14.7 8.5v17L20 37 5.3 28.5v-17z" fill="#adb5bd" stroke="#495057" stroke-width="3" stroke-linejoin="round"/><circle cx="20" cy="20" r="7" fill="#f1f3f5" stroke="#495057" stroke-width="3"/></svg>',
  fire: '<svg viewBox="0 0 40 32" aria-hidden="true"><path d="M2 16C10 4 22 2 38 16 22 30 10 28 2 16z" fill="#ff922b"/><path d="M12 16c5-6 12-7 20 0-8 7-15 6-20 0z" fill="#ffd43b"/></svg>',
  rock: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M8 30L4 18l8-11 15-2 9 10 0 14-9 8H15z" fill="#a9a29a" stroke="#5c544c" stroke-width="3" stroke-linejoin="round"/><path d="M14 14l7 3 6-4M17 26l6-3" fill="none" stroke="#5c544c" stroke-width="2" stroke-linecap="round"/></svg>',
  boss: '<svg viewBox="0 0 80 88" aria-hidden="true"><rect x="36" y="2" width="4" height="12" fill="#868e96"/><circle cx="38" cy="3" r="3.5" fill="#e8413b"/><rect x="6" y="12" width="68" height="52" rx="12" fill="#868e96" stroke="#343a40" stroke-width="3"/><rect x="14" y="20" width="52" height="18" rx="5" fill="#212529"/><path d="M20 26l9 4M60 26l-9 4" stroke="#ff6b6b" stroke-width="3" stroke-linecap="round"/><circle cx="28" cy="31" r="4" fill="#ff6b6b"/><circle cx="52" cy="31" r="4" fill="#ff6b6b"/><circle cx="40" cy="51" r="9" fill="#e8413b" stroke="#fff" stroke-width="2.5"/><text x="40" y="56" font-size="13" font-weight="900" text-anchor="middle" fill="#fff" font-family="sans-serif">R</text><rect x="-2" y="34" width="10" height="22" rx="4" fill="#495057"/><rect x="72" y="34" width="10" height="22" rx="4" fill="#495057"/><rect x="12" y="64" width="20" height="18" rx="3" fill="#495057"/><rect x="48" y="64" width="20" height="18" rx="3" fill="#495057"/><rect x="8" y="80" width="28" height="7" rx="3" fill="#343a40"/><rect x="44" y="80" width="28" height="7" rx="3" fill="#343a40"/></svg>',
};

/** 🤝 뒤따라오는 친구 — 사이(칸) · 크기(칸) · 보스까지 갔다 오는 시간(ms) */
const PAL_GAP = 7;
const PAL_W = 7;
const PAL_H = 8;
const PAL_ATK_MS = 700;
/** 🔒 로켓단 우리의 창살(친구 그림 위에 겹친다) · 🔴 큰 몬스터볼 */
const CAGE_SVG = '<svg viewBox="0 0 40 50" preserveAspectRatio="none" aria-hidden="true"><rect x="1.5" y="1.5" width="37" height="47" rx="4" fill="none" stroke="#495057" stroke-width="3"/><path d="M10 2v46M20 2v46M30 2v46" stroke="#495057" stroke-width="2.6"/><rect x="1.5" y="1.5" width="37" height="7" fill="#868e96"/><circle cx="20" cy="30" r="5" fill="#e8413b" stroke="#fff" stroke-width="1.5"/><text x="20" y="32.6" font-size="7" font-weight="900" text-anchor="middle" fill="#fff" font-family="sans-serif">R</text></svg>';
const MBALL_SVG = '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="#fff" stroke="#212529" stroke-width="3"/><path d="M2 20a18 18 0 0 1 36 0z" fill="#e8413b" stroke="#212529" stroke-width="3"/><rect x="2" y="18" width="36" height="4" fill="#212529"/><circle cx="20" cy="20" r="6" fill="#fff" stroke="#212529" stroke-width="3"/></svg>';

/** 능력 그림(HTML) — 🔥·⚡는 그림 글자 · 바위는 코드로 그린 돌(옛 기기 글꼴에 🪨가 없을 수 있다) · 떠오르는 글에는 abName */
const abIcon = (ab) => (ab === 'rock' ? `<span class="gs-ico">${ART.rock}</span>` : ABILITIES[ab].emoji);
const abName = (ab) => [ABILITIES[ab].emoji, ABILITIES[ab].ko].filter(Boolean).join(' ');
/** 🌀 빨아들이는 바람 — 입에서 앞으로 퍼지는 점선 셋(점선이 입 쪽으로 흐른다) */
const WIND_SVG = '<svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><path d="M2 20Q50 2 98 3"/><path d="M2 20H98"/><path d="M2 20Q50 38 98 37"/></svg>';

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
/** 애니메이션 다시 틀기 — 꼴을 뗐다가 다시 붙인다 */
function replay(node, cls) {
  node.classList.remove(cls);
  void node.offsetWidth;
  node.classList.add(cls);
}
const pctX = (x) => `${x}%`;
const pctY = (y) => `${((y / ADV_H) * 100).toFixed(3)}%`;
/** 가만히 있는 것을 % 자리에 — 화면 크기가 바뀌어도 다시 잴 것 없다 */
function place(e, x, y, w, h) {
  e.style.left = pctX(x);
  e.style.bottom = pctY(y);
  e.style.width = pctX(w);
  e.style.height = pctY(h);
}

/**
 * 한 판 돌리기 → { done: Promise<{ score, quit }>, stop(), music() }
 * stage = 그릴 자리(비워서 쓴다) · o.hero = 주인공 { html } (파트너 그림 또는 캐릭터) · o.art = { 100: 찌리리공, 17: 피죤 그림 주소|null } · o.rng
 * stop()은 ✕·집을 닫을 때 — 그 자리에서 끝(quit)
 */
export function runSsok(stage, o = {}) {
  const now = () => performance.now();
  const rng = typeof o.rng === 'function' ? o.rng : Math.random;
  stage.innerHTML = '';
  const root = el('div', 'gd ga gs');
  const top = el('div', 'gd-top');
  const scoreEl = el('span', 'gd-score', '⭐ 0');
  // 능력 칸 — 톡 하면 내려놓는다 (능력이 있을 때만 보인다)
  const abBtn = el('button', 'btn gs-ab');
  abBtn.type = 'button';
  abBtn.hidden = true;
  const prog = el('div', 'ga-prog');
  const progIn = el('i');
  prog.append(progIn, el('span', 'ga-prog-flag', '🤖'));
  // 🤖 보스 체력 — 싸움터에 들어서면 길 막대 대신
  const hp = el('div', 'gs-hp');
  const hpIn = el('i');
  hp.append(hpIn, el('span', 'gs-hp-ico', '🤖'));
  hp.hidden = true;
  // 🤝 구한 친구 수 — 처음엔 숨김
  const palsEl = el('span', 'gs-pals');
  palsEl.hidden = true;
  top.append(scoreEl, palsEl, abBtn, prog, hp);
  const field = el('div', 'ga-field gs-field');
  field.setAttribute('aria-label', '왼쪽 엄지: 톡 하면 폴짝, 꾹 누르면 둥실 · 오른쪽 엄지: 꾹 누르면 빨아들이기, 톡 하면 뱉기나 기술');
  const far = el('div', 'ga-far');
  const near = el('div', 'ga-near');
  const world = el('div', 'ga-world');
  // 두 엄지 자리 — 처음 3초는 크게, 그 뒤엔 흐리게 늘
  const zoneL = el('span', 'gs-zone is-l', '👈 톡 폴짝 · 꾹 둥실');
  const zoneR = el('span', 'gs-zone is-r', '꾹 빨아들이기 · 톡 뱉기 👉');
  field.append(far, near, world, zoneL, zoneR);
  const hint = el('p', 'ga-hint', '왼쪽 엄지 톡 폴짝 · 꾹 둥실 — 오른쪽 엄지 꾹 빨아들이기 · 톡 뱉기·기술');
  const fx = el('div', 'gd-fx');
  const banner = el('div', 'gd-banner', '준비!');
  root.append(top, field, hint, fx, banner);
  stage.appendChild(root);

  let unit = 3; // 한 칸 = px (마당 너비 ÷ 100)
  const measure = () => {
    const w = field.getBoundingClientRect().width;
    if (w > 0) unit = w / ADV_W;
    far.style.backgroundSize = `${50 * unit}px 100%`;
    near.style.backgroundSize = `${30 * unit}px 100%`;
  };
  // 그림 — 받은 그림이 깨지면 코드로 그린 모습으로
  let volt = (o.art && o.art[SSOK_ART.volt]) || '';
  const bird = (o.art && o.art[SSOK_ART.bird]) || '';
  const voltEl = (e) => {
    if (volt) {
      const img = el('img');
      img.alt = '';
      img.draggable = false;
      img.addEventListener('error', () => { volt = ''; e.innerHTML = DIG_FALLBACK.voltorb; });
      img.src = volt;
      e.appendChild(img);
    } else e.innerHTML = DIG_FALLBACK.voltorb;
  };

  let s = null;
  let timer = 0;
  let frame = 0;
  let pausedAt = 0;
  let finished = false;
  let endTimer = 0;
  let introTimer = 0;
  let warned = false;
  let resolveDone;
  const done = new Promise((r) => { resolveDone = r; });
  const els = new Map(); // 물건 n → 그림
  let me = null;
  let meIn = null;
  let meAb = null;
  let birdEl = null;
  let bossEl = null;
  let zapEl = null;
  let lostN = 0; // 그려 둔 능력 별의 번호
  let ballEl = null; // 🔴 머금은 몬스터볼(내 몸 위)
  // 🤝 이번 판 친구 셋 { id, ko, art? } — 게임기가 준비해 준다(gameview prep · 그림은 미리 받음) · 없으면(시험) 여기서 고른다(길 rng는 안 씀)
  const friends = (Array.isArray(o.friends) && o.friends.length ? o.friends : ssokFriendPick(Math.random)).slice(0, FRIEND_MAX);
  const pals = []; // 뒤따라오는 친구 그림 [{ fi, e, atkAt }]
  /** 친구 그림 — 받은 그림 · 깨지거나 없으면 🐾 */
  const palArt = (e, fi) => {
    const f = friends[fi] || {};
    if (f.art) {
      const img = el('img');
      img.alt = f.ko || '';
      img.draggable = false;
      img.addEventListener('error', () => { e.innerHTML = '<span class="gs-pal-emoji">🐾</span>'; });
      img.src = f.art;
      e.appendChild(img);
    } else e.innerHTML = '<span class="gs-pal-emoji">🐾</span>';
  };
  const palName = (fi) => (friends[fi] && friends[fi].ko) || '친구';

  /** 움직이는 것 하나 그리기 (메카·드론·굴러오는 것·날아가는 것·능력 별) — 자리는 draw에서 transform으로 */
  const mover = (n, cls, html, w, h) => {
    const e = el('span', cls);
    if (html) e.innerHTML = html;
    place(e, 0, 0, w, h);
    world.appendChild(e);
    els.set(n, e);
    return e;
  };
  const mechaEl = (m) => {
    const e = mover(m.n, `ga-mecha gs-mecha${m.ab ? ` is-${m.ab}` : ''}`, ADV_DRAW.mecha, m.w, m.h);
    if (m.ab) { const g = el('span', 'gs-badge'); g.innerHTML = abIcon(m.ab); e.appendChild(g); } // 머리 위 타입 그림 = 능력 메카
  };
  const fruitEl = (it) => {
    const e = el('span', `ga-obj is-${it.kind}`);
    e.innerHTML = RUN_ART[it.kind];
    place(e, it.x, it.y, it.w, it.h);
    world.appendChild(e);
    els.set(it.n, e);
    return e;
  };

  /** 길 그리기 — 판을 시작할 때 한 번 (가만히 있는 것은 %로) */
  const build = () => {
    const st = s.stage;
    world.innerHTML = '';
    els.clear();
    for (const [a, b] of st.ground) {
      const g = el('span', 'ga-ground');
      place(g, a, 0, b - a, GROUND);
      world.appendChild(g);
    }
    for (const b of st.solids) {
      const e = el('span', 'ga-solid');
      place(e, b.x, 0, b.w, b.top);
      world.appendChild(e);
    }
    for (const b of s.blocks) {
      const e = el('span', `ga-obj gs-block is-${b.kind}`);
      e.innerHTML = ART[b.kind];
      place(e, b.x, b.y, b.w, b.h);
      world.appendChild(e);
      els.set(b.n, e);
    }
    for (const it of s.fruits) fruitEl(it);
    for (const v of s.volts) {
      const e = el('span', 'ga-obj is-volt');
      voltEl(e);
      place(e, v.x, v.y, v.w, v.h);
      world.appendChild(e);
      els.set(v.n, e);
    }
    for (const m of s.mechas) mechaEl(m);
    for (const d of s.drones) mover(d.n, 'ga-mecha gs-drone', ART.drone, d.w, d.h);
    // 🔒 로켓단 우리 — 갇힌 친구 그림 위에 창살 · 🔴 큰 몬스터볼
    for (const c of s.cages) {
      const e = el('span', 'gs-cage');
      const mon = el('span', 'gs-cage-mon');
      palArt(mon, c.fi);
      const bars = el('span', 'gs-bars');
      bars.innerHTML = CAGE_SVG;
      e.append(mon, bars);
      place(e, c.x, c.y, c.w, c.h);
      world.appendChild(e);
      els.set(c.n, e);
    }
    for (const b of s.mballs) {
      const e = el('span', 'ga-obj gs-mball');
      e.innerHTML = MBALL_SVG;
      place(e, b.x, b.y, b.w, b.h);
      world.appendChild(e);
      els.set(b.n, e);
    }
    // 🤖 싸움터 — 보스는 처음부터 서 있다(멀리서 보인다)
    bossEl = el('span', 'gs-boss');
    bossEl.innerHTML = ART.boss;
    place(bossEl, st.arenaX + ARENA.bossX, GROUND, BOSS.w, BOSS.h);
    world.appendChild(bossEl);
    me = el('div', 'ga-me gs-me');
    meIn = el('div', 'ga-me-in');
    meIn.innerHTML = (o.hero && o.hero.html) || '<span class="gd-pal-emoji">🐾</span>';
    const wind = el('span', 'gs-wind');
    wind.innerHTML = WIND_SVG;
    me.append(wind, meIn);
    meAb = el('span', 'gs-me-ab');
    meAb.hidden = true;
    me.appendChild(meAb);
    ballEl = el('span', 'gs-me-ball');
    ballEl.innerHTML = MBALL_SVG;
    me.appendChild(ballEl); // 🔴 머금은 동안만 보인다(is-ball)
    place(me, 0, 0, ME.w, ME.h);
    world.appendChild(me);
    birdEl = el('div', 'ga-bird');
    if (bird) {
      const img = el('img');
      img.alt = '';
      img.draggable = false;
      img.addEventListener('error', () => { birdEl.innerHTML = '<span>🐦</span>'; });
      img.src = bird;
      birdEl.appendChild(img);
    } else birdEl.innerHTML = '<span>🐦</span>';
    birdEl.hidden = true;
    place(birdEl, 0, 0, 14, 14);
    world.appendChild(birdEl);
    zapEl = el('span', 'gs-zap');
    zapEl.hidden = true;
    world.appendChild(zapEl);
  };
  const drop = (n, cls, ms = 450) => {
    const e = els.get(n);
    els.delete(n);
    if (!e) return;
    if (!cls) { e.remove(); return; }
    e.classList.add(cls);
    setTimeout(() => e.remove(), ms);
  };
  /** 떠오르는 글 — 길 위의 자리(칸)를 지금 화면 자리로 */
  const fly = (text, x, y, cls) => {
    const a = field.getBoundingClientRect();
    const b = root.getBoundingClientRect();
    const cam = s ? ssokCam(s) : 0;
    const f = el('span', `gd-fly ${cls || ''}`, text);
    f.style.left = `${a.left - b.left + (x - cam) * unit}px`;
    f.style.top = `${a.top - b.top + (ADV_H - y) * unit - 12}px`;
    fx.appendChild(f);
    setTimeout(() => f.remove(), 900);
  };
  const at = (e, x, y) => { e.style.transform = `translate3d(${(x * unit).toFixed(1)}px, ${(-y * unit).toFixed(1)}px, 0)`; };

  const syncAb = () => {
    const ab = s && s.ability;
    abBtn.hidden = !ab;
    if (ab) {
      abBtn.innerHTML = `${abIcon(ab)} ${ABILITIES[ab].ko} · 놓기`;
      abBtn.setAttribute('aria-label', `${ABILITIES[ab].ko} 능력 내려놓기`);
    }
    if (meAb) {
      meAb.hidden = !ab;
      if (ab && meAb.dataset.ab !== ab) { meAb.innerHTML = abIcon(ab); meAb.dataset.ab = ab; }
    }
  };

  const draw = () => {
    if (!s) return;
    const t = s.last;
    const cam = ssokCam(s);
    world.style.transform = `translate3d(${(-cam * unit).toFixed(1)}px, 0, 0)`;
    far.style.transform = `translate3d(${(-((cam * 0.2) % 50) * unit).toFixed(1)}px, 0, 0)`;
    near.style.transform = `translate3d(${(-((cam * 0.5) % 30) * unit).toFixed(1)}px, 0, 0)`;
    for (const lst of [s.mechas, s.drones, s.rollers, s.shots]) {
      for (const m of lst) {
        const e = els.get(m.n);
        if (!e) continue;
        at(e, m.x, m.y);
        if (m.vx !== undefined) e.classList.toggle('is-r', m.vx > 0 && lst !== s.shots);
        e.classList.toggle('is-pull', !!m.pull);
      }
    }
    for (const f of s.fruits) if (f.pull) { const e = els.get(f.n); if (e) place(e, f.x, f.y, f.w, f.h); }
    // 🔴 몬스터볼은 늘 — 빨아들이다 놓으면 엔진은 땅으로 되돌리는데(release) 그림은 끌려오던 높이에 남았다 (🔍 Codex 178차 P1)
    for (const b of s.mballs) { const e = els.get(b.n); if (e) place(e, b.x, b.y, b.w, b.h); }
    if (s.lost) { const e = els.get(s.lost.n); if (e) at(e, s.lost.x, s.lost.y); }
    at(me, s.x, s.y);
    me.classList.toggle('is-ball', t < s.rollUntil);
    // 🤝 뒤따라오는 친구 — 내 뒤로 줄지어(땅이면 땅에 · 내가 뜨면 조금 아래로) · 🤖 보스에서 몸통박치기 때는 보스까지 갔다가 돌아온다
    //   몸통박치기 시각은 화면 시계(now) — 마지막 일격이면 게임 시계(s.last)가 멈춰 친구가 제자리에 서 있었다 (🔍 Codex 178차 P1) · 숨은 동안은 onVis가 민다
    const wall = now();
    for (const p of pals) {
      const k = pals.indexOf(p);
      let x = s.x - (k + 1) * PAL_GAP;
      let y = Math.max(GROUND, s.y - (k + 1) * 2);
      if (p.atkAt && s.boss && wall - p.atkAt < PAL_ATK_MS) {
        const q = (wall - p.atkAt) / PAL_ATK_MS;
        const go = q < 0.5 ? q * 2 : (1 - q) * 2; // 갔다가 돌아오기
        x += (s.boss.x - PAL_W - x) * go;
        y = GROUND;
      }
      at(p.e, x, y);
    }
    me.classList.toggle('is-air', !s.onGround);
    me.classList.toggle('is-puff', s.puffed);
    me.classList.toggle('is-suck', s.sucking && !s.mouth && !s.ability && t >= s.stumbleUntil && t >= s.stoneUntil && t >= s.rollUntil); // 엔진 canSuck과 같게(굴러가는 동안엔 바람 없음)
    me.classList.toggle('is-full', !!s.mouth);
    me.classList.toggle('is-stone', t < s.stoneUntil);
    const carried = t < s.rescueUntil || (s.helpAt > 0 && t - s.helpAt < HELP_ANIM_MS);
    birdEl.hidden = !carried;
    if (carried) at(birdEl, s.x, s.y + ME.h + 1);
    me.classList.toggle('is-carried', carried);
    zapEl.hidden = !s.zap || t - s.zap.t > 260;
    if (!zapEl.hidden) place(zapEl, s.zap.x - 2, s.zap.y, 4, ADV_H - s.zap.y);
    if (s.boss) {
      hpIn.style.transform = `scaleX(${(s.boss.hp / BOSS.hp).toFixed(3)})`;
      if (bossEl) bossEl.classList.toggle('is-hit', t - s.boss.hitAt < 220);
    } else progIn.style.transform = `scaleX(${Math.max(0, Math.min(1, (s.x - START_X) / (s.stage.arenaX + ME.screen - START_X))).toFixed(3)})`;
  };
  const apply = (ev) => {
    if (!s) return;
    const head = (text, cls) => fly(text, s.x + ME.w / 2, s.y + ME.h + 4, cls);
    for (const g of ev.got) {
      drop(g.o.n, g.sucked ? '' : 'is-got');
      head(`+${g.pts}`, g.pts > 1 ? 'is-big' : '');
      if (g.pts > 1) sfx.twinkle(); else sfx.ding();
    }
    if (ev.pulling.length) sfx.drag();
    for (const m of ev.mouthed) { drop(m.o.n, ''); head(m.pts ? `쏙! +${m.pts}` : '쏙!', ''); sfx.plop(); }
    for (const a of ev.ability) {
      drop(a.o.n, '');
      head(`${abName(a.ab)} 능력!`, 'is-big');
      sfx.levelUp();
    }
    if (ev.regained) { head(`${abName(ev.regained)} 다시 내 능력!`, 'is-big'); sfx.twinkle(); }
    // 튀어나간 능력 별 — 하나뿐(새로 튀어나가면 옛것은 지운다) · 사라지면 반짝 · 되찾으면 바로
    if (lostN && (!s.lost || s.lost.n !== lostN)) { drop(lostN, ev.lostGone ? 'is-got' : ''); lostN = 0; }
    if (s.lost && !lostN) {
      lostN = s.lost.n;
      const g = el('span', 'gs-badge');
      g.innerHTML = abIcon(s.lost.ab);
      mover(lostN, 'gs-lost', ADV_DRAW.star, s.lost.w, s.lost.h).appendChild(g);
    }
    if (ev.dropped) head('능력을 내려놓았어요', '');
    // 날아가는 것 — 새로 나간 것은 그림을 만들고, 끝난 것은 지운다
    for (const sh of s.shots) if (!els.has(sh.n)) mover(sh.n, `gs-shot is-${sh.kind}`, sh.kind === 'star' ? ADV_DRAW.star : ART[sh.kind], sh.w, sh.h);
    for (const sh of ev.shotGone) drop(sh.n, ev.fizz.includes(sh) ? 'is-got' : '');
    if (ev.spat) sfx.whoosh();
    if (ev.move === 'fire') sfx.whoosh();
    if (ev.zap) sfx.zap();
    if (ev.ring) replay(me, 'is-ring'); // ⚡ 몸 둘레 번개
    if (ev.rocked) { sfx.boom(); vibrate(40); }
    for (const k of ev.killed) {
      drop(k.o.n, k.by === 'stomp' ? 'is-squash' : 'is-knock');
      if (k.pts) fly(`펑! +${k.pts}`, k.o.x + k.o.w / 2, k.o.y + k.o.h + 2, 'is-big');
      sfx.boom();
    }
    for (const b of ev.opened) {
      drop(b.b.n, 'is-knock');
      fly(`${b.b.kind === 'bush' ? '활활' : '와장창'}! +${b.pts}`, b.b.x + b.b.w / 2, b.b.y + b.b.h + 2, 'is-big');
      fruitEl(b.gold).classList.add('is-pop');
      sfx.twinkle();
    }
    if (ev.thud) sfx.tick();
    for (const h of ev.hurt) {
      drop(h.o.n, 'is-knock');
      head(h.kind === 'volt' || h.kind === 'ball' ? '찌릿! 꽈당!' : '꽈당!', 'is-zap');
      replay(me, 'is-bonk');
      sfx.hit();
      vibrate(80);
    }
    if (ev.spilled) head('앗, 놓쳤다!', 'is-zap');
    for (const v of ev.rolled) drop(v.n, 'is-roll');
    for (const r of ev.thrown) mover(r.n, `ga-obj gs-roller is-${r.kind}`, r.kind === 'bolt' ? ART.bolt : '', r.w, r.h);
    for (const r of ev.thrown) if (r.kind === 'ball') voltEl(els.get(r.n));
    for (const r of ev.rolledOff) drop(r.n, '');
    if (ev.rescued) { head('피죤이 건너편으로!', ''); sfx.whoosh(); }
    if (ev.helped) { head('영차! 피죤이 올려 줬어요', ''); sfx.whoosh(); }
    if (ev.boss) {
      prog.hidden = true;
      hp.hidden = false;
      fly('🤖 로켓단 큰 메카가 나타났다!', s.stage.arenaX + ADV_W / 2, ADV_H - 14, 'is-big');
      sfx.siren();
    }
    for (const d of ev.bossHit) { fly(`쾅! +${d}`, s.boss.x + s.boss.w / 2, s.boss.y + s.boss.h + 2, 'is-big'); sfx.boom(); }
    if (s.boss && !warned && !s.done && s.boss.until - s.last <= 5000) {
      warned = true;
      fly('로켓단이 도망가려 해요!', s.stage.arenaX + ADV_W / 2, ADV_H - 14, 'is-zap');
    }
    if (ev.won) { fly(ev.wonAdd ? `🎉 이겼다! 빨리 +${ev.wonAdd}` : '🎉 이겼다!', s.boss.x + s.boss.w / 2, s.boss.y + s.boss.h + 6, 'is-big'); if (bossEl) bossEl.classList.add('is-down'); sfx.success(); }
    if (ev.fled) { if (bossEl) bossEl.classList.add('is-flee'); sfx.whoosh(); }
    // 🔒 우리를 엶 → 친구가 나와 뒤따라온다
    for (const f of ev.freed) {
      drop(f.c.n, 'is-open', 500);
      fly(`🤝 ${palName(f.fi)} 구했다! +${f.pts}`, f.c.x + f.c.w / 2, f.c.y + f.c.h + 3, 'is-big');
      if (pals.length < FRIEND_MAX) {
        const e = el('span', 'gs-pal');
        palArt(e, f.fi);
        place(e, 0, 0, PAL_W, PAL_H);
        world.appendChild(e);
        pals.push({ fi: f.fi, e, atkAt: 0 });
      }
      palsEl.hidden = false;
      palsEl.textContent = `🤝 ${s.freed.length}`;
      sfx.levelUp();
    }
    // 🤝 보스에 몸통박치기
    for (const h of ev.friendHit) {
      const p = pals.find((x) => x.fi === h.fi);
      if (p) p.atkAt = now();
      fly(`${palName(h.fi)} 몸통박치기!`, s.stage.arenaX + ADV_W / 2, ADV_H - 20, 'is-big');
    }
    // 🔴 몬스터볼 머금기 — 길에 있던 공은 지운다
    if (ev.mouthful) {
      for (const [n, e] of els) if (e.classList.contains('gs-mball') && !s.mballs.some((b) => b.n === n)) drop(n, '');
      head('🔴 데굴데굴!', 'is-big');
      sfx.whoosh();
    }
    if (ev.mouthfulEnd && !ev.boss) head('퐁!', '');
    if (ev.got.length || ev.mouthed.length || ev.ability.length || ev.killed.length || ev.opened.length || ev.bossHit.length || ev.won || ev.freed.length) scoreEl.textContent = `⭐ ${s.score}`;
    syncAb();
  };

  const onVis = () => {
    if (!s || finished) return;
    if (document.hidden) { pausedAt = now(); root.classList.add('is-paused'); letGo('L'); letGo('R'); return; } // 숨으면 두 엄지 모두 뗀다(숨은 동안 뗌이 안 올 수 있다)
    if (pausedAt) {
      const d = now() - pausedAt;
      ssokShift(s, d);
      for (const p of pals) if (p.atkAt) p.atkAt += d; // 몸통박치기 도중 앱을 내렸다 돌아와도 이어서
      pausedAt = 0;
      root.classList.remove('is-paused');
    }
  };
  const hasWin = typeof window !== 'undefined' && typeof window.addEventListener === 'function';
  // 끝을 알리는 것은 한 번만 — 끝 글을 보여 주는 동안 ✕·집 닫기가 오면 기다리지 않고 바로(끝난 판이라 점수 그대로 · 🗺️ 대모험과 같게)
  let settled = false;
  let settleTimer = 0;
  const settle = (r) => {
    if (settled) return;
    settled = true;
    clearTimeout(settleTimer);
    resolveDone(r);
  };
  const finish = (quit) => {
    if (finished) { if (quit) settle({ score: s ? s.score : 0, quit: false }); return; }
    finished = true;
    clearInterval(timer);
    clearTimeout(endTimer);
    clearTimeout(introTimer);
    if (frame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame);
    document.removeEventListener('visibilitychange', onVis);
    document.removeEventListener('pointerup', up);
    document.removeEventListener('pointercancel', up);
    document.removeEventListener('keyup', onKeyUp);
    if (hasWin) window.removeEventListener('resize', measure);
    const score = s ? s.score : 0;
    if (quit) { settle({ score, quit: true }); return; }
    // 🤝 친구가 있으면 끝 글을 조금 더 오래 보여 준다
    banner.textContent = s ? ssokEndText(s, friends) : '끝!';
    banner.classList.add('is-on');
    settleTimer = setTimeout(() => settle({ score, quit: false }), s && s.freed.length ? 2400 : 1400);
  };
  const loop = () => {
    if (!s || pausedAt || finished) return;
    apply(ssokTick(s, now()));
    draw();
    if (s.done && !endTimer) endTimer = setTimeout(() => finish(false), 1000); // 보스 쪽을 잠깐 보고
  };
  // 그림이 부드럽게 — 브라우저면 화면 그릴 때마다, 아니면(시험) 33ms마다
  const startLoop = () => {
    if (typeof requestAnimationFrame === 'function') {
      const f = () => {
        if (finished) return;
        loop();
        if (!finished) frame = requestAnimationFrame(f);
      };
      frame = requestAnimationFrame(f);
    } else timer = setInterval(loop, 33);
  };
  // 두 엄지 — 마당 왼쪽 반·오른쪽 반에 손가락 하나씩 기억한다 · 키보드는 'kl'·'kr'
  //   같은 쪽에 새 손가락이 오면 그 손가락이 이어받는다 · 앱이 숨으면 두 엄지 모두 뗀 것으로 · 키 뗌은 문서 어디서든 · 마당을 떠나면 키 엄지를 뗀다
  //   (앞 손가락·키의 뗌을 놓치면 그쪽 엄지가 판 끝까지 먹통이었다 — 입에 별을 물고도 못 뱉음 · 🔍 Codex 177차 P1)
  let leftId = null;
  let rightId = null;
  /** 그쪽 엄지를 뗀다 — 숨은 동안이면 멈춘 때를 뗀 때로 */
  const letGo = (side) => {
    if (side === 'L') { if (leftId === null) return; leftId = null; } else { if (rightId === null) return; rightId = null; }
    if (!s || finished) return;
    const t = pausedAt || now();
    if (!pausedAt) apply(ssokTick(s, t));
    if (side === 'L') ssokLeftUp(s, t); else ssokRightUp(s, t);
  };
  const press = (side, id) => {
    if (!s || finished || pausedAt) return;
    const owner = side === 'L' ? leftId : rightId;
    if (owner === id) return;
    if (owner !== null) letGo(side); // 이어받기
    const t = now();
    apply(ssokTick(s, t)); // 누른 때까지 움직이고 나서
    if (side === 'L') {
      leftId = id;
      if (ssokLeft(s, t) === 'jump') sfx.tick();
    } else {
      rightId = id;
      const r = ssokRight(s, t);
      if (r === 'suck') sfx.whoosh();
      else if (r === 'wait') sfx.tick();
    }
    draw();
  };
  function up(e) {
    const id = !e ? null : e.pointerId !== undefined ? e.pointerId : 'touch';
    if (id === null) return;
    if (id === leftId) letGo('L');
    else if (id === rightId) letGo('R');
  }
  const sideOf = (e) => {
    const r = field.getBoundingClientRect();
    return e.clientX - r.left < r.width / 2 ? 'L' : 'R';
  };
  field.addEventListener('pointerdown', (e) => { e.preventDefault(); press(sideOf(e), e.pointerId !== undefined ? e.pointerId : 'touch'); });
  document.addEventListener('pointerup', up);
  document.addEventListener('pointercancel', up);
  abBtn.addEventListener('click', () => {
    if (!s || finished || pausedAt) return;
    if (ssokDrop(s) === 'drop') sfx.tick();
  });
  // ⌨️ 마당에 포커스가 있을 때만 — 스페이스·↑ = 왼쪽 엄지 · X·→ = 오른쪽 엄지 · C = 능력 내려놓기
  field.tabIndex = 0;
  field.setAttribute('role', 'application');
  const keySide = (k) => (k === ' ' || k === 'ArrowUp' ? 'L' : k === 'x' || k === 'X' || k === 'ArrowRight' ? 'R' : '');
  field.addEventListener('keydown', (e) => {
    if ((e.key === 'c' || e.key === 'C') && !e.repeat) { e.preventDefault(); if (s && !finished && !pausedAt) ssokDrop(s); return; }
    const side = keySide(e.key);
    if (!side) return;
    e.preventDefault();
    if (!e.repeat) press(side, side === 'L' ? 'kl' : 'kr');
  });
  function onKeyUp(e) {
    const side = keySide(e.key);
    if (!side) return;
    up({ pointerId: side === 'L' ? 'kl' : 'kr' });
  }
  document.addEventListener('keyup', onKeyUp);
  field.addEventListener('blur', () => { if (leftId === 'kl') letGo('L'); if (rightId === 'kr') letGo('R'); });
  root.addEventListener('animationend', (e) => {
    if (e.animationName === 'ga-bonk' && me) me.classList.remove('is-bonk');
    if (e.animationName === 'gs-ring' && me) me.classList.remove('is-ring');
  });

  // 준비! → 시작 · 앱이 내려간 것은 「준비!」 때부터 듣는다
  document.addEventListener('visibilitychange', onVis);
  if (hasWin) window.addEventListener('resize', measure);
  field.classList.add('is-intro');
  setTimeout(() => {
    if (finished) return;
    banner.classList.remove('is-on');
    measure();
    s = ssokStart(now(), rng);
    build();
    root.classList.add('is-go');
    if (document.hidden) { pausedAt = now(); root.classList.add('is-paused'); }
    draw();
    startLoop();
    introTimer = setTimeout(() => field.classList.remove('is-intro'), 3000);
    if (typeof field.focus === 'function') { try { field.focus({ preventScroll: true }); } catch { /* 옛 브라우저 */ } }
  }, 800);
  banner.classList.add('is-on');
  measure();
  sfx.tick();

  // 🎵 게임 음악 — 보스와 싸우는 동안 서두른다 · 끝나면 stop(끝 소리가 들리게)
  // state — 시험용(가짜 DOM 시험이 판 상태를 만져 본다 · 화면은 쓰지 않는다)
  return { done, stop: () => finish(true), music: () => musicMode({ over: finished || !!(s && s.done), hurry: ssokHurry(s) }), state: () => s };
}
