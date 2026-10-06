// 🛒 아이템: 💰 코인 규칙, 상점 카탈로그(🎀 장식·🎨 염색약·🧪 물약), ❤️ HP 규칙, 🎁 랜덤 상자, 꾸민 포켓몬 그림(figure) 만들기
// 그림은 이모지 오버레이 + CSS filter 라 파일이 필요 없음 (오프라인·저작권 문제 없음)
// 위쪽은 순수 규칙(테스트 가능), 아래쪽은 DOM 헬퍼. 프로필(코인·가방·꾸밈 상태)은 xp.js 가 들고 있음

// ── 💰 코인 (XP와 별개: XP는 레벨·해금, 코인은 상점) ──
export const COIN = {
  done: 1,              // 문장 하나 완료 (하루에 문장당 한 번)
  speak: 2,             // 말하기 통과
  speakStar: 3,         // 말하기 ⭐(80%↑) 통과
  puzzle: [5, 3, 2],    // 퍼즐 정답: 틀린 횟수 0/1/2번
  match: [5, 3, 2],     // 🔤 단어 이어 주기: 틀린 횟수 0번 / 1~2번 / 3번 이상
  puzzleRevealed: 0,    // 3번 틀려 정답 공개 → 코인 없음 (XP는 조금 줌)
  goal: 10,             // 오늘의 목표 달성
  streakPerDay: 5,      // 🔥 연속 학습일 × 5
  streakMax: 50,        // 스트릭 코인 상한 (10일)
  journey: 20,          // 🏁 콘텐츠 마지막 문장까지 도착 (콘텐츠당 한 번)
};

/** 🔤 단어 이어 주기 결과 → 코인 (경험치와 같은 계단) */
export function matchCoins(wrong) {
  const w = Math.max(0, Math.floor(Number(wrong) || 0));
  return COIN.match[w === 0 ? 0 : (w <= 2 ? 1 : 2)];
}

/** 퍼즐 결과 → 코인 */
export function puzzleCoins(result) {
  if (!result || !result.solved) return COIN.puzzleRevealed;
  return COIN.puzzle[Math.min(result.wrong || 0, COIN.puzzle.length - 1)];
}

/** 오늘까지 n일 연속 → 코인 5, 10, 15 … 최대 50 */
export function streakCoins(days) {
  return Math.min(COIN.streakMax, COIN.streakPerDay * Math.max(1, days));
}

// ── 🎀 장식: 개수로 보유, 장착하면 가방에서 빠지고 벗기면 돌아옴. pos = head(머리 위) | face(얼굴) ──
export const GEAR = [
  { id: 'ribbon', emoji: '🎀', ko: '리본', price: 30, pos: 'head' },
  { id: 'flower', emoji: '🌸', ko: '꽃', price: 30, pos: 'head' },
  { id: 'cap', emoji: '🧢', ko: '야구모자', price: 40, pos: 'head' },
  { id: 'tophat', emoji: '🎩', ko: '신사모자', price: 40, pos: 'head' },
  { id: 'shades', emoji: '🕶️', ko: '선글라스', price: 50, pos: 'head' }, // 눈 위치는 그림마다 달라 못 맞춘다 → 머리에 걸치는 쪽으로
  { id: 'star', emoji: '⭐', ko: '별', price: 60, pos: 'head' },
  { id: 'butterfly', emoji: '🦋', ko: '나비', price: 60, pos: 'head' },
  { id: 'grad', emoji: '🎓', ko: '학사모', price: 70, pos: 'head' },
  { id: 'crown', emoji: '👑', ko: '왕관', price: 100, pos: 'head' },
  { id: 'diamond', emoji: '💎', ko: '다이아몬드', price: 150, pos: 'head' },
];

// ── 🎨 염색약: 소모품(쓰면 사라짐). 어떤 그림이든 같은 색이 나오도록 sepia로 단색화한 뒤 색조를 돌림. 원래 색으로 되돌리기는 무료 ──
export const DYE = [
  // 각도·채도는 실제 일러스트(피카츄·파이리·꼬부기·뮤츠·이브이)로 비교해서 고름 — 밝은 노랑(피카츄)은 hue-rotate가 약하게 먹어 빨강은 크게 돌림
  { id: 'red', emoji: '🔴', ko: '빨강', price: 50, filter: 'sepia(1) saturate(6) hue-rotate(-50deg) contrast(1.15) brightness(0.92)' },
  { id: 'blue', emoji: '🔵', ko: '파랑', price: 50, filter: 'sepia(1) saturate(4) hue-rotate(180deg)' },
  { id: 'green', emoji: '🟢', ko: '초록', price: 50, filter: 'sepia(1) hue-rotate(70deg) saturate(3) brightness(0.9)' },
  { id: 'purple', emoji: '🟣', ko: '보라', price: 50, filter: 'sepia(1) hue-rotate(230deg) saturate(3) brightness(0.9)' },
  { id: 'pink', emoji: '💗', ko: '분홍', price: 50, filter: 'sepia(1) hue-rotate(290deg) saturate(3)' },
  { id: 'gold', emoji: '🟡', ko: '금색', price: 50, filter: 'sepia(1) saturate(4) contrast(1.2) brightness(1.05)' },
  // 까망은 hue-rotate로는 안 된다 (색을 돌리는 것이지 어둡게 하는 게 아니다) → 회색조 + 밝기.
  // 실제 일러스트 넷(피카츄·이브이·꼬부기·리자몽)으로 비교해서 고름: 더 어두우면 눈·윤곽이 사라져
  // 누군지 모를 실루엣이 되고, 더 밝으면 "까망"이 아니라 진회색이 된다 (진우 요청, 2026-09-19)
  { id: 'black', emoji: '🖤', ko: '까망', price: 50, filter: 'grayscale(1) brightness(0.4) contrast(1.5)' },
  { id: 'shiny', emoji: '✨', ko: '반짝반짝', price: 150, filter: '', cls: 'shiny' }, // 무지개로 반짝이는 색 (CSS 애니메이션)
];

// ── 🧪 물약: 소모품. 파트너 HP 회복 ──
export const POTION = [
  { id: 'potion', emoji: '🧪', ko: '물약', price: 10, heal: 30 },
  { id: 'potion_big', emoji: '⚗️', ko: '큰 물약', price: 25, heal: 100 },
];

// ── ❤️ HP: 파트너 한 마리에게만. "틀림"이 아니라 "대충 넘김·안 함"에만 깎임 (틀리는 건 배움의 과정) ──
export const HP = {
  max: 100,
  revealed: -20,     // 퍼즐 3번 틀려 정답 공개
  speakSkipped: -10, // 말하기 3번 미달로 그냥 통과
  missedDay: -30,    // 어제 학습 안 함 (5문장 미만) → 오늘 첫 진입 때 한 번
  goalHeal: 20,      // 오늘 목표 달성 → 자동 회복
};

// ── 🔴 몬스터볼: 등급이 올라갈수록 잡기 쉬워진다 (원작 그대로) ──
// mult = 잡힐 확률 배율, cap = 확률 상한, sure = 반드시 잡음, free = 언제나 쓸 수 있음(가방에 없어도)
export const POKEBALL = { id: 'pokeball', emoji: '🔴', ko: '몬스터볼', price: 0, mult: 1, kind: 'ball', free: true };
export const GREATBALL = { id: 'greatball', emoji: '🔵', ko: '슈퍼볼', price: 25, mult: 1.5, kind: 'ball' };
export const ULTRABALL = { id: 'ultraball', emoji: '🟡', ko: '하이퍼볼', price: 600, mult: 2, kind: 'ball' };
export const MASTERBALL = { id: 'masterball', emoji: '🟣', ko: '마스터볼', price: 1200, kind: 'ball', sure: true };
// 🌟 황금 몬스터볼: 하이퍼볼과 같은 2배지만 상한이 더 높다(95%). 학습으로만 얻는다 — 🔁 영어 복습 완주(하루 1), 🔢 섞어 풀기 전부 정답(하루 1), ✨ 오늘의 보너스. (상점에서 못 사고 🎁 상자에서도 안 나옴)
export const GOLDEN = { id: 'goldenball', emoji: '🌟', ko: '황금 몬스터볼', price: 0, mult: 2, cap: 0.95, kind: 'ball' };
/**
 * 🌕 진짜 황금 몬스터볼 (2026-10-04, 진우: "포켓몬 세계에는 황금 몬스터볼이 딱 하나 있고 무조건 잡힌다" → 아버님 "진행해줘").
 * 🌟 황금 몬스터볼은 그대로 두고 따로 — 무조건 잡힌다(🌌 울트라비스트도), 상점에서 못 산다,
 * 잡기 화면이 열릴 때마다 0.1%(TRUE_GOLD_CHANCE)로 나온다. **세상에 하나뿐**(unique): 가지고 있는 동안은 안 나오고,
 * 쓰면 없어진 뒤 다시 0.1%. 두 창·백업을 합쳐도 하나 (xp.rollTrueGold — purchaseRule once)
 */
export const TRUE_GOLD = { id: 'truegold', emoji: '🌕', ko: '진짜 황금 몬스터볼', price: 0, kind: 'ball', sure: true, unique: true };
export const TRUE_GOLD_CHANCE = 0.001;
/** 잡기 화면에 보여줄 볼 순서 (몬스터볼은 언제나 첫 번째) */
export const BALLS = [POKEBALL, GREATBALL, ULTRABALL, GOLDEN, MASTERBALL];
// ⚪ 비스트볼은 아래(스톤 아이템 구역)에서 정의되므로 거기서 BALLS에 더한다 — 볼 고르기에 안 나오면 살 수는 있어도 못 던진다
/** 상점에서 파는 볼 */
export const SHOP_BALLS = [GREATBALL, ULTRABALL, MASTERBALL];

// ── ⭐ 메가진화 · 거다이맥스 (원작 규칙을 그대로) ──
// 메가진화: 트레이너의 🔑 키스톤 + 포켓몬이 지니는 💠 메가스톤. 배틀에서만, 한 배틀에 한 마리.
// 거다이맥스: 돈으로 못 산다. 🍄 다이버섯을 모아 🍲 다이스프를 만들어 먹인 포켓몬만 할 수 있다.
export const KEYSTONE = { id: 'keystone', emoji: '🔑', ko: '키스톤', price: 600, kind: 'mega' };
export const MEGASTONE = { id: 'megastone', emoji: '💠', ko: '메가스톤', price: 600, kind: 'mega' };
export const MUSHROOM = { id: 'mushroom', emoji: '🍄', ko: '다이버섯', price: 0, kind: 'mushroom' };
// ── 🧤 과목 스톤 (2026-09-22, 아버님 아이디어 "인피니티 스톤") ──
// 코인은 "얼마나 많이 했나"(문장·문항 수)로 쌓이지만 스톤은 **"제대로 배웠나"**(통과·👑·복습 완주)에서만 나온다.
// 상점에서 못 사고 🎁 상자에서도 안 나온다. 새 아이템은 코인 + 스톤을 같이 내야 산다 → "코인은 있는데 스톤이 없어서 못 산다"가
// 수학으로 가게 하는 힘. 과목이 늘면(과학·국어…) 스톤도 늘고, 건틀릿(🎒)에 🔒 칸으로 미리 보인다.
// 가방 아이템으로 두는 이유: purchaseRule의 cost.items(재료)·백업 병합·두 창 안전이 그대로 된다 (새 저장 구조 없음)
export const STONE_MATH = { id: 'stone_math', emoji: '🔷', ko: '수학스톤', subject: 'math', price: 0, kind: 'stone' };
export const STONE_ENGLISH = { id: 'stone_english', emoji: '🔶', ko: '영어스톤', subject: 'english', price: 0, kind: 'stone' };
export const STONES = [STONE_MATH, STONE_ENGLISH];
/** 아직 없는 과목의 자리 — 건틀릿에 🔒로만 보인다 */
export const FUTURE_STONES = [{ emoji: '🟩', ko: '???' }, { emoji: '🟪', ko: '???' }];
export function stoneOf(subject) {
  return STONES.find((s) => s.subject === subject) || null;
}

// ── 🧤 스톤 상점: 코인 + 스톤 ──
// 🧭 레이더: 다음 🔢 수학 잡기에서 후보 4마리 중 한 마리가 **희귀 이상**으로 확정 (쓰면 없어진다)
export const RADAR = { id: 'radar', emoji: '🧭', ko: '레이더', price: 100, stones: { stone_math: 1 }, kind: 'tool', hint: '🔢 수학 잡기 화면에서 "🧭 레이더 쓰기"를 누르면 희귀 이상 포켓몬이 한 마리 나와요' };
// 🥚 알: 사고 나서 **그 과목을 5일 완주**해야 부화 → 그 과목의 희귀 이상 포켓몬 한 마리가 도감에 (던지기 없이 확정). 과목마다 품는 알은 하나
export const EGG_MATH = { id: 'egg_math', emoji: '🥚', ko: '수학 알', price: 200, stones: { stone_math: 2 }, kind: 'egg', subject: 'math', hint: '☀️ 오늘의 수학을 5일 완주하면 부화해요 — 🎒에서 며칠 남았는지 보여요' };
export const EGG_ENGLISH = { id: 'egg_english', emoji: '🥚', ko: '영어 알', price: 200, stones: { stone_english: 2 }, kind: 'egg', subject: 'english', hint: '🎤 오늘의 목표 문장을 5일 채우면 부화해요 — 🎒에서 며칠 남았는지 보여요' };
// 🌈 이로치의 스톤: 잡은 포켓몬 한 마리를 **색이 다른 모습(이로치)** 으로 — 영원히, 어디서나(도감·잡기·퍼즐·배틀·파트너). 두 과목 스톤이 다 든다(인피니티)
// id를 'shiny'로 하면 안 된다 — 'shiny'는 이미 ✨ 반짝 염색약 id (Codex 6차)
/**
 * 🌌 ⚪ 비스트볼 — 울트라비스트를 잡는 전용 볼 (2026-09-27, 진우 요청).
 * 원작 그대로: 울트라비스트에게는 아주 잘 들고(×5), 보통 볼은 울트라비스트에게 거의 안 통한다(xp.UB_PENALTY).
 * 일반 포켓몬에게는 그냥 몬스터볼과 같다 — 원작은 오히려 불리하지만, 아이가 실수로 하나 날리면 억울하다.
 */
export const BEASTBALL = { id: 'beastball', emoji: '⚪', ko: '비스트볼', price: 300, stones: { stone_math: 2 }, mult: 1, ub: 5, cap: 0.9, kind: 'ball', hint: '🌌 울트라비스트에게만 아주 잘 들어요 — 보통 몬스터볼로는 거의 못 잡아요' };

BALLS.push(BEASTBALL); // 🌌 울트라비스트를 잡으려면 잡기 화면의 볼 고르기에 나와야 한다
BALLS.push(TRUE_GOLD); // 🌕 세상에 하나뿐 — 볼 줄 맨 끝
/**
 * 🛒 잡기 화면에서 바로 여는 볼 상점 (2026-10-04, 진우 요청 → 아버님 "이대로 진행하자").
 * 잡고 싶은 포켓몬 앞에서 더 좋은 볼이 필요할 때 — 파는 볼 셋 + ⚪ 비스트볼(스톤 상점에도 그대로 있다).
 * 사면 상점이 닫히고 잡기 화면에서 그 볼이 골라져 있다 (catch.js)
 */
export const CATCH_SHOP = [...SHOP_BALLS, BEASTBALL];

export const SHINY_STONE = { id: 'shiny_stone', emoji: '🌈', ko: '이로치의 스톤', price: 500, stones: { stone_math: 3, stone_english: 3 }, kind: 'tool', hint: '🎒 잡은 포켓몬을 눌러 "🌈 이로치로!" — 스톤 하나로 3번 쓸 수 있고, 🎨 칸에서 원래 색으로 되돌릴 수도 있어요 (되돌려도 횟수는 안 돌아와요)' };
/**
 * 🌈 이로치의 스톤은 3번 (2026-10-04, 진우 요청 → 아버님 "진행해줘"): 이로치를 입힐 때마다 1번, 3번 다 쓰면 스톤이 사라진다.
 * 원래 색으로 되돌리기는 공짜지만 쓴 횟수는 돌아오지 않는다 (A에 입혔다 되돌리면 1번 · B·C에 입히면 스톤 끝).
 * 남은 횟수 = 뜯지 않은 스톤 × 3 + 뜯은 스톤의 남은 횟수(가방의 SHINY_CHARGE — 카탈로그 밖의 개수라 🎁 상자·상점에 안 나온다).
 * 가방(items)에 두는 까닭: 두 창·백업 병합(가방은 최근 쪽 통째로)·복사가 스톤과 한 묶음으로 따라간다
 */
export const SHINY_USES = 3;
export const SHINY_CHARGE = 'shiny_charge';
/** 🌈 이로치를 입힐 수 있는 남은 횟수 */
export function shinyUsesLeft(bag) {
  const b = bag || {};
  return (Number(b[SHINY_STONE.id]) || 0) * SHINY_USES + (Number(b[SHINY_CHARGE]) || 0);
}
export const STONE_SHOP = [RADAR, EGG_MATH, EGG_ENGLISH, SHINY_STONE, BEASTBALL];

/**
 * ⏳ 시간 연장권 (2026-10-01, 진우 요청 → 아버님 "이대로 진행"): 하루 시간 제한이 다 됐을 때 그 과목을 15분 더.
 * · 값이 그 15분 동안 버는 코인보다 커야 한다 — 영어 15분 ≈ 💰60, 싸면 "연장해서 번 코인으로 또 연장"이 끝없이 돈다
 * · 🔷 수학스톤이 든다 — 영어 시간도. 영상을 더 보고 싶으면 수학을 제대로 해야 한다 (순서 잠금이 아니라 보상으로 끄는 힘)
 * · 과목마다 하루 쓸 수 있는 개수는 ⚙ 설정(부모, 기본 2) — 판정은 db.applyExtend 트랜잭션 안에서 (timelimit.extendPlan)
 * · 산 것은 🎒에 남고 다른 날에도 쓴다. 효과는 쓴 날 하루만
 */
export const EXTEND_MATH = { id: 'extend_math', emoji: '⏳', ko: '수학 +15분', price: 100, stones: { stone_math: 1 }, kind: 'extend', subject: 'math', minutes: 15, hint: '🔢 수학 시간이 다 되면 잠금 화면에서 "⏳ 연장권 쓰기"를 눌러요 — 오늘 15분 더!' };
export const EXTEND_ENGLISH = { id: 'extend_english', emoji: '⏳', ko: '영어 +15분', price: 150, stones: { stone_math: 1 }, kind: 'extend', subject: 'english', minutes: 15, hint: '🎤 영어 시간이 다 되면 잠금 화면에서 "⏳ 연장권 쓰기"를 눌러요 — 오늘 15분 더!' };
export const EXTENDERS = [EXTEND_MATH, EXTEND_ENGLISH];
/** 그 과목의 연장권 (없으면 null) */
export function extenderOf(subject) {
  return EXTENDERS.find((x) => x.subject === subject) || null;
}

/** 값 — 코인과 재료(스톤)를 한 묶음으로 (purchaseRule이 둘 다 한 트랜잭션에서 판정) */
export function costOf(it) {
  return { coins: (it && it.price) || 0, items: { ...((it && it.stones) || {}) } };
}

/** 🍲 다이스프 한 그릇에 드는 버섯 수 */
export const SOUP_MUSHROOMS = 10;
/** 🍄 다이버섯은 하루에 이만큼까지만 (몰아서 모으지 못하게) */
export const MUSHROOM_PER_DAY = 2;

export const ITEMS = [
  ...GEAR.map((g) => ({ ...g, kind: 'gear' })),
  ...DYE.map((d) => ({ ...d, kind: 'dye' })),
  ...POTION.map((p) => ({ ...p, kind: 'potion' })),
  POKEBALL,
  GREATBALL,
  ULTRABALL,
  MASTERBALL,
  GOLDEN,
  TRUE_GOLD,
  KEYSTONE,
  MEGASTONE,
  MUSHROOM,
  ...STONES,
  RADAR,
  EGG_MATH,
  EGG_ENGLISH,
  SHINY_STONE,
  BEASTBALL,
  ...EXTENDERS,
];
const byId = {};
for (const it of ITEMS) byId[it.id] = it;

/** 아이템 id → { id, kind, emoji, ko, price, … } (없으면 null) */
export function itemById(id) {
  return byId[id] || null;
}

/**
 * 📦 아빠의 구호품 (2026-10-05, 아버님: "이로치의 스톤 2번을 구호품(선물)으로 보내 주자").
 * 배포 파일 coach/gifts.json의 한 줄 = { id, items: { 아이템id: 개수 }, title?, text? }.
 * 보낼 수 있는 것은 가방 물건(카탈로그)과 🌈 이로치 남은 횟수(SHINY_CHARGE)뿐 — 세상에 하나뿐인 것(🌕)은 못 보낸다.
 * 개수는 1~PARCEL_MAX 정수 (오타로 99개가 가지 않게). 하나라도 틀리면 그 구호품 통째로 안 받는다
 */
export const PARCEL_MAX = 10;
/** 받은 구호품인가 — 받은 때 값이 아니라 **기록이 있느냐**로 (깨진 때 0이 "안 받음"이 되어 두 번 받지 않게) */
export function parcelGot(received, id) {
  return !!received && Object.prototype.hasOwnProperty.call(received, id);
}
/** @returns {{id:string, items:Object<string,number>, title:string, text:string}|null} 틀린 줄이면 null */
export function parcelOf(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  if (!id || id.length > 64) return null;
  if (id.startsWith(VIDEO_PARCEL)) return null; // 🏁 영상 🔶 기록 자리 — 아빠 구호품이 이 이름이면 영상 몫과 섞인다
  const src = raw.items;
  if (!src || typeof src !== 'object' || Array.isArray(src)) return null;
  const items = {};
  for (const [k, n] of Object.entries(src)) {
    const it = byId[k];
    // 🥚 알은 가방이 아니라 profile.eggs에서 품는다 — 가방에 넣으면 받기만 되고 못 품는다 (Codex 32차 #4)
    if (k !== SHINY_CHARGE && (!it || it.unique || it.kind === 'egg')) return null;
    if (!Number.isInteger(n) || n < 1 || n > PARCEL_MAX) return null;
    items[k] = n;
  }
  if (!Object.keys(items).length) return null;
  const str = (v) => (typeof v === 'string' ? v.trim() : '');
  return { id, items, title: str(raw.title), text: str(raw.text) };
}

/**
 * 🏁 영상 끝까지 → 🔶 영어스톤 (2026-10-06, 진우 "영어 스톤 구하기가 너무 힘들다 — 수학 스톤은 남아돈다").
 * 아버님 9/22 스톤 결정의 "영상 완주 +3"이 v113에서 빠져 있었다 → 되살림 (아버님 "이대로 진행").
 * "끝까지" = 그 영상 문장의 VIDEO_STONE.pct% 이상을 했다 — 📊 진행률·수학 이야기 세계가 열리는 기준(mathprog SEEN_PCT)과 같다.
 * 마지막 문장 하나만 끝내도 뜨는 🏁 여행 끝과 다르다(목록에서 마지막 줄을 눌러 받는 길을 막는다). 영상마다 한 번.
 * 받은 기록은 📦 구호품과 같은 profile.parcels에 'video:<영상 id>'로 — 한 트랜잭션·백업 병합 합집합을 그대로 쓴다 (db.videoStoneRule)
 */
export const VIDEO_STONE = { n: 3, pct: 90 };
/** 🔶 영어스톤이 생기는 곳 — 아이에게 보이는 안내(🛒 스톤 상점·🏪 5일장·도감·📊)가 같이 쓴다. 받는 곳을 바꾸면 여기 한 곳만 */
export const ENGLISH_STONE_HOW = `복습을 다 맞히거나, 받아쓰기·단어를 다 맞히거나, 에세이를 쓰거나, 영상을 끝까지(문장 ${VIDEO_STONE.pct}%) 하면`;
export const ENGLISH_STONE_SHORT = '복습 다 맞힘·받아쓰기·단어 만점·에세이·영상 끝까지';
export const VIDEO_PARCEL = 'video:';
export function videoParcelId(itemId) {
  return `${VIDEO_PARCEL}${itemId}`;
}
/** 진행률(%) — stats.contentSummary의 pct와 같은 셈 (반올림) */
export function videoPct(done, total) {
  return total > 0 ? Math.round((done / total) * 100) : 0;
}
/** 🔶을 받을 영상 (순수) — 깨진 영상·이미 받은 영상은 빼고 VIDEO_STONE.pct% 이상 한 것만, 같은 id는 한 번 */
export function videoStoneDue(summaries, received) {
  const out = [];
  const seen = new Set();
  for (const s of Array.isArray(summaries) ? summaries : []) {
    if (!s || s.broken || s.id === undefined || s.id === null || s.id === '') continue;
    const id = String(s.id);
    if (seen.has(id) || parcelGot(received, videoParcelId(id))) continue;
    if (!(Number(s.total) > 0) || !(Number(s.pct) >= VIDEO_STONE.pct)) continue;
    seen.add(id);
    out.push({ id, title: String(s.title || '') });
  }
  return out;
}

/** 🎁 레벨업 선물 상자에서 나올 수 있는 것 (🌟 황금 볼·⭐ 메가 아이템·🍄 다이버섯·🧤 스톤·스톤 상점 물건은 제외 — 귀한 것이라 따로 모아야 한다) */
const LOOT = ITEMS.filter((it) => it.kind !== 'ball' && it.kind !== 'mega' && it.kind !== 'mushroom' && it.kind !== 'stone' && !it.stones); // 스톤이 드는 물건은 종류를 불문하고 제외

/** 🎁 레벨업 선물 상자: 아이템 중 하나를 고르게 뽑음 */
export function lootBox(rng = Math.random) {
  return LOOT[Math.min(LOOT.length - 1, Math.floor(rng() * LOOT.length))].id;
}

/**
 * 살 수 있는지 → { ok, short(부족한 코인), shortStones: [{id, emoji, ko, n}] }
 * @param {Object} [bag] 가방 { 아이템id: 개수 } — 스톤이 드는 물건이면 필요
 */
export function canBuy(id, coins, bag) {
  const it = itemById(id);
  if (!it || it.price <= 0) return { ok: false, short: 0, shortStones: [] }; // 🌟 황금 볼·스톤처럼 파는 물건이 아닌 것
  const short = Math.max(0, it.price - (coins || 0));
  const shortStones = [];
  for (const sid of Object.keys(it.stones || {})) {
    const need = it.stones[sid] - ((bag && bag[sid]) || 0);
    if (need > 0) { const st = itemById(sid); shortStones.push({ id: sid, emoji: st ? st.emoji : '', ko: st ? st.ko : sid, n: need }); }
  }
  return { ok: short === 0 && !shortStones.length, short, shortStones };
}

/** 값 표시 — "💰100 + 🔷1" */
export function priceText(it) {
  const parts = [`💰${it.price}`];
  for (const sid of Object.keys(it.stones || {})) { const st = itemById(sid); parts.push(`${st ? st.emoji : ''}${it.stones[sid]}`); }
  return parts.join(' + ');
}

// ── DOM 헬퍼: 꾸민 포켓몬 그림 ──
// <span class="mon-figure [cls]"><img> [<span class="mon-gear head|face">🎩</span>]</span>
// 크기는 호출하는 쪽 CSS(.puzzle-char, .pokedex-cell 등)가 정함. look = { gear, dye, hp } (xp.getLook). hp가 0이면 😴 쉬는 중(회색·누움)

/** 새 figure 만들기 */
export function makeFigure(url, alt, look, cls) {
  const fig = document.createElement('span');
  fig.className = 'mon-figure' + (cls ? ' ' + cls : '');
  const img = document.createElement('img');
  img.alt = alt || '';
  img.draggable = false;
  fig.appendChild(img);
  setFigure(fig, url, look);
  return fig;
}

/** 이미 있는 figure의 그림·꾸밈 갱신 (잡기 무대처럼 요소를 재사용하는 곳). url이 undefined면 그림은 그대로 */
export function setFigure(fig, url, look) {
  const img = fig.querySelector('img');
  // 🌈 이로치: look.shinyUrl(받아 둔 이로치 그림)이 있으면 그것을 — 변신 그림처럼 url을 통째로 주는 곳(배틀 메가·거다이맥스)은 look이 null이라 그대로 (변신 > 이로치 > 일반)
  const src = look && look.shinyUrl ? look.shinyUrl : url;
  if (src !== undefined) {
    if (img.getAttribute('src') !== src) img.src = src;
    img.hidden = !src; // 그림을 아직 못 받았으면 깨진 아이콘 대신 빈 자리
  }
  // 이로치면 염색 필터는 끈다 — 이로치는 제 색이 볼거리 (염색약은 가방·기록에 그대로 남는다)
  const dye = look && look.dye && !look.shiny ? byId[look.dye] : null;
  img.style.filter = dye && dye.filter ? dye.filter : '';
  if (dye && dye.cls) img.classList.add(dye.cls); else img.classList.remove('shiny');
  // ✨ 이로치 배지 — 그림을 아직 못 받아 일반 모습이어도 "이로치"라는 건 보이게
  let sb = fig.querySelector('.mon-shiny');
  if (look && look.shiny) {
    if (!sb) { sb = document.createElement('span'); sb.className = 'mon-shiny'; sb.textContent = '✨'; fig.appendChild(sb); }
  } else if (sb) sb.remove();
  const gear = look && look.gear ? byId[look.gear] : null;
  let g = fig.querySelector('.mon-gear');
  if (gear) {
    if (!g) { g = document.createElement('span'); fig.appendChild(g); }
    g.className = 'mon-gear ' + (gear.pos || 'head');
    g.textContent = gear.emoji;
    // 자리 정하기: ① 아이가 직접 끌어다 놓은 자리 ② 그림에서 찾은 머리 꼭대기 ③ CSS 기본값(가운데 위)
    const pos = look && look.gearPos;
    const a = look && look.anchor;
    g.classList.toggle('placed', !!pos);
    if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
      g.style.left = `${pos.x * 100}%`;
      g.style.top = `${pos.y * 100}%`;
    } else if (a && Number.isFinite(a.x) && Number.isFinite(a.y)) {
      g.style.left = `${Math.min(88, Math.max(12, a.x * 100))}%`;
      g.style.top = `${a.y * 100 - 9}%`; // 머리 꼭대기에 살짝 걸치게
    } else {
      g.style.left = '';
      g.style.top = '';
    }
  } else if (g) g.remove();
  const tired = !!(look && look.hp === 0);
  // 😴 쉬는 중은 CSS가 옆으로 누인 채 숨 쉬게 한다 (.mon-figure.tired img)
  fig.classList.toggle('tired', tired);
  let z = fig.querySelector('.mon-zzz');
  if (tired) {
    if (!z) { z = document.createElement('span'); z.className = 'mon-zzz'; z.textContent = '💤'; fig.appendChild(z); }
  } else if (z) z.remove();
}
