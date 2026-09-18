// 🎟️ 다음 영상 교환권 — 아직 태블릿에 없는 영상을 아이가 "벌어서" 연다.
//
// 왜 이런 모양인가: 재미있는 영상(포켓몬)을 그냥 넣어 주면 만들어 둔 기존 영상을 안 보게 된다.
// 그렇다고 아빠가 조용히 안 넣어 주면 아이는 이유를 모른다.
// → **보이게 잠가 두고, 조건을 채우면 아이가 직접 연다.** 같은 제한이지만 목표가 된다.
//
// 산다고 영상이 생기지는 않는다. 교환권이고, 파일은 아빠가 넣어 준다 (📊에 알림이 뜬다).

/** 교환권 아이템 id 접두사 (🎒 가방에 들어간다 — 구매는 xp.buyTicket → db.applyPurchase) */
export const TICKET_PREFIX = 'ticket_';
export const ticketId = (id) => `${TICKET_PREFIX}${id}`;

/**
 * 살 수 있는 영상 목록. 새 콘텐츠를 만들면 여기에 한 줄 더한다.
 *
 * 표지는 **실제 장면 캡처가 아니라 그 영상에 나오는 포켓몬 그림**이다.
 * 애니 장면을 저장소에 커밋하면 "닌텐도 저작물은 공개 저장소에 두지 않는다"는
 * 이 프로젝트의 원칙이 깨진다 (GitHub Pages 무료는 Public 저장소만 된다).
 * 포켓몬 그림은 지금도 PokeAPI에서 받아 기기에만 두므로 새 파일이 늘지 않고,
 * 수집이 목표인 아이에게는 "얘네가 나온다"가 장면 사진보다 직접적이다.
 *
 * cast  = 그 영상에 나오는 포켓몬 id (한국어 이름은 PokeAPI로 대조함)
 * teaser = 영상에 실제로 나오는 대사 한 줄 (사면 배우게 될 문장)
 */
export const LOCKED = [
  {
    id: 'gengar', ko: '팬텀 대소동', en: 'Gengar to the Max',
    poster: 94, emoji: '👻', minutes: 15, sentences: 180, price: 2000,
    blurb: '팬텀이 거다이맥스로 변신해서 싸워요',
    cast: [
      { id: 94, ko: '팬텀' }, { id: 861, ko: '오롱털' },
      { id: 26, ko: '라이츄' }, { id: 356, ko: '미라몽' },
    ],
    teaser: 'Gengar, Shadow Ball, now!',
  },
  {
    id: 'ash_battles', ko: '지우와 피카츄 명장면', en: "Ash & Pikachu's Epic Battle Moments",
    poster: 25, emoji: '⚡', minutes: 8, sentences: 86, price: 2000,
    blurb: '지우와 피카츄의 가장 멋진 배틀만 모았어요',
    cast: [
      { id: 25, ko: '피카츄' }, { id: 214, ko: '헤라크로스' },
      { id: 262, ko: '그라에나' }, { id: 101, ko: '붐볼' },
    ],
    teaser: 'Pikachu, use Iron Tail!',
  },
];

/**
 * 코인 말고 더 채워야 하는 조건.
 * 코인만이면 제일 쉬운 영상 한 편만 반복해도 모을 수 있어서, "기존 걸 다 본다"는 목적이 안 지켜진다.
 */
export const NEED = {
  // 끝낸 문장 **누적 개수** (2026-09-18에 "가진 영상 전체의 80%" 비율에서 바꿈).
  // 비율이면 영상을 넣을 때마다 목표가 멀어졌다: 태블릿에 5,527문장이 있어 80% = 4,422문장,
  // 하루 40문장을 해도 막대가 0.9%씩 움직여 아버님 눈에 "진도가 안 는다"로 보였고,
  // 새 영상 3편(214문장)을 넣으면 목표가 4,593으로 **더 멀어졌다**.
  // 개수로 세면 ① 영상을 넣어도 목표가 그대로 ② 영상을 지워도 진도가 줄지 않는다
  //   (그래서 "어려운 영화를 지워서 조건을 채우는" 옛 구멍도 원천적으로 없어진다).
  doneSentences: 1000,
  reviewPassed: 60,   // 🔁 복습에서 한 번 이상 통과한 문장 60개 (배운 다음 날 이후에 다시 맞힌 것)
};

export function findLocked(id) {
  return LOCKED.find((c) => c.id === id) || null;
}


/**
 * 조건 현황 (순수 계산).
 *
 * 문장 기록 **전부**를 센다 — 지운 영상의 기록도 포함한다. 아이가 실제로 배운 것이고,
 * 개수로 세므로 지운다고 늘지 않는다(비율이던 시절의 "삭제로 조건 채우기" 구멍이 없다).
 * 무엇보다 **진도가 뒤로 가지 않는다**: 영상을 지우거나 저장이 깨져도 숫자는 그대로다.
 *
 * @param {{coins:number, records:Array, price:number}} o
 *   records = 모든 문장 기록 (db.getAllSentenceStats)
 */
export function unlockState({ coins = 0, records = [], price = 0 } = {}) {
  let done = 0;
  let reviewed = 0;
  for (const r of records || []) {
    if (!r) continue;
    if (r.done) done++;
    if ((r.reviewPass || 0) > 0) reviewed++; // 복습에서 한 번 이상 통과
  }
  const pctOf = (have, need) => (need <= 0 ? 100 : Math.min(100, Math.round((have / need) * 100)));
  const items = [
    { key: 'coins', label: '💰 코인', have: Math.max(0, Math.floor(coins)), need: price },
    { key: 'progress', label: '📼 배운 문장', have: done, need: NEED.doneSentences },
    { key: 'review', label: '🔁 복습 통과 문장', have: reviewed, need: NEED.reviewPassed },
  ].map((it) => ({ ...it, ok: it.have >= it.need, pct: pctOf(it.have, it.need) }));
  return {
    done, reviewed, coins,
    items,
    ready: items.every((it) => it.ok),
  };
}

/** 아직 못 산 영상 중 다음으로 보여줄 것 (가진 것 제외, 싼 것부터) */
export function nextLocked(ownedIds = []) {
  const owned = new Set([...ownedIds].map(String));
  return LOCKED.filter((c) => !owned.has(c.id)).sort((a, b) => a.price - b.price)[0] || null;
}

/** 아이가 샀지만 아직 아빠가 파일을 안 넣은 것 (📊에 알림) */
export function pendingTickets(inventory = {}, items = []) {
  const have = new Set((items || []).map((it) => String(it.title || '')));
  return LOCKED
    .filter((c) => (inventory[ticketId(c.id)] || 0) > 0)
    .map((c) => ({ ...c, delivered: have.has(c.ko) }));
}
