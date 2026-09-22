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
/** 잡기 화면에 보여줄 볼 순서 (몬스터볼은 언제나 첫 번째) */
export const BALLS = [POKEBALL, GREATBALL, ULTRABALL, GOLDEN, MASTERBALL];
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
export const STONE_SHOP = [RADAR];

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
  KEYSTONE,
  MEGASTONE,
  MUSHROOM,
  ...STONES,
  RADAR,
];
const byId = {};
for (const it of ITEMS) byId[it.id] = it;

/** 아이템 id → { id, kind, emoji, ko, price, … } (없으면 null) */
export function itemById(id) {
  return byId[id] || null;
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
  if (url !== undefined) {
    if (img.getAttribute('src') !== url) img.src = url;
    img.hidden = !url; // 그림을 아직 못 받았으면 깨진 아이콘 대신 빈 자리
  }
  const dye = look && look.dye ? byId[look.dye] : null;
  img.style.filter = dye && dye.filter ? dye.filter : '';
  if (dye && dye.cls) img.classList.add(dye.cls); else img.classList.remove('shiny');
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
