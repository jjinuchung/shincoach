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
 * poster = 표지로 쓸 포켓몬 id (이미 받아 둔 그림을 쓰므로 새 파일이 필요 없다)
 */
export const LOCKED = [
  {
    id: 'gengar', ko: '팬텀 대소동', en: 'Gengar to the Max',
    poster: 94, emoji: '👻', minutes: 15, sentences: 180, price: 4000,
    blurb: '팬텀이 거다이맥스로 변신해서 싸워요',
  },
  {
    id: 'ash_battles', ko: '지우와 피카츄 명장면', en: "Ash & Pikachu's Epic Battle Moments",
    poster: 25, emoji: '⚡', minutes: 8, sentences: 86, price: 4000,
    blurb: '지우와 피카츄의 가장 멋진 배틀만 모았어요',
  },
];

/**
 * 코인 말고 더 채워야 하는 조건.
 * 코인만이면 제일 쉬운 영상 한 편만 반복해도 모을 수 있어서, "기존 걸 다 본다"는 목적이 안 지켜진다.
 */
export const NEED = {
  progress: 0.8,      // 가진 영상 **전체 문장**의 80%를 완료
  reviewPassed: 60,   // 🔁 복습에서 한 번 이상 통과한 문장 60개 (배운 다음 날 이후에 다시 맞힌 것)
};

export function findLocked(id) {
  return LOCKED.find((c) => c.id === id) || null;
}

/**
 * 조건 현황 (순수 계산).
 * @param {{coins:number, records:Array, totalCues:number, owned:Set|Array}} o
 *   records = 모든 문장 기록(db.getAllSentenceStats), totalCues = 가진 영상의 문장 수 합,
 *   owned = 이미 산 영상 id
 * @returns {{done:number, total:number, progress:number, reviewed:number, coins:number,
 *            items:Array<{key:string, label:string, have:number, need:number, ok:boolean, pct:number}>}}
 */
export function unlockState({ coins = 0, records = [], totalCues = 0, price = 0 } = {}) {
  let done = 0;
  let reviewed = 0;
  for (const r of records || []) {
    if (!r) continue;
    if (r.done) done++;
    if ((r.reviewPass || 0) > 0) reviewed++; // 복습에서 한 번 이상 통과
  }
  const total = Math.max(0, Math.round(totalCues));
  const needDone = Math.ceil(total * NEED.progress);
  const pctOf = (have, need) => (need <= 0 ? 100 : Math.min(100, Math.round((have / need) * 100)));
  const items = [
    { key: 'coins', label: '💰 코인', have: Math.max(0, Math.floor(coins)), need: price },
    { key: 'progress', label: '📼 영상 문장', have: done, need: needDone },
    { key: 'review', label: '🔁 복습 통과 문장', have: reviewed, need: NEED.reviewPassed },
  ].map((it) => ({ ...it, ok: it.have >= it.need, pct: pctOf(it.have, it.need) }));
  return {
    done, total, reviewed, coins,
    progress: total ? done / total : 0,
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
