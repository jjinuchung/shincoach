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
 * ★ **순서가 곧 등장 순서다** — 위에서부터 하나씩만 광고로 보여 준다 (nextLocked).
 *   하나를 교환해야 다음 것이 보인다. 한꺼번에 다 보여 주면 "다음 목표 하나"가 흐려진다.
 *
 * ★ `ko`는 **아빠가 영상을 넣을 때 입력하는 제목과 글자까지 같아야** 배달로 인정된다
 *   (library의 가져오기 → 제목 칸, 판정은 pendingTickets).
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
// ★ **아빠가 영상을 넣어 준 것은 이 목록에서 뺀다.**
//   목록에 있는 한 "🎟️ 샀어요! 아빠에게 보여주세요" 대기 카드와 📊 알림이 계속 남는다
//   (배달 판정이 제목 일치라, 넣어 준 제목이 한 글자라도 다르면 영영 안 사라진다).
//   뺀 뒤에는 가방의 교환권을 보여 주는 곳이 없으므로 화면에서 깨끗이 사라진다.
//   빠진 영상들: gengar(팬텀 대소동, 2026-09-19 배달) · ash_battles(지우와 피카츄 명장면, 그냥 넣어 준 것)
export const LOCKED = [
  {
    id: 'iconic', ko: '지우와 피카츄 최고의 순간', en: "Ash & Pikachu's Iconic Moments",
    poster: 25, emoji: '⚡', minutes: 10, sentences: 103, price: 2000,
    blurb: '10만볼트부터 1000만볼트까지, 지우와 피카츄의 명장면',
    cast: [
      { id: 25, ko: '피카츄' }, { id: 448, ko: '루카리오' },
      { id: 727, ko: '어흥염' }, { id: 887, ko: '드래펄트' },
    ],
    teaser: 'Pikachu, use Ten Million Volt Thunderbolt!',
  },
  {
    id: 'wild2', ko: '야생의 포켓몬 2', en: 'Wild Pokemon 2',
    poster: 382, emoji: '🌊', minutes: 9, sentences: 46, price: 2000,
    blurb: '전설의 포켓몬 가이오가가 바다에서 나타나요',
    cast: [
      { id: 382, ko: '가이오가' }, { id: 184, ko: '마릴리' },
      { id: 892, ko: '우라오스' }, { id: 282, ko: '가디안' },
    ],
    teaser: "Kyogre, we're over here! This way!",
  },
  {
    id: 'prime_suspect', ko: '피카츄가 유력 용의자', en: 'Pikachu Is the Prime Suspect',
    poster: 25, emoji: '🔍', minutes: 4, sentences: 65, price: 2000,
    blurb: '피카츄가 전기 도둑으로 붙잡혔어요 — 누명을 벗겨 주세요',
    // 자막에는 피카츄만 이름이 나온다 — 나머지 둘은 영상 프레임을 직접 보고 확인했다
    // (흥나숭은 경찰서 장면, 가디는 제니 경관 옆. PokeAPI로 한국어 공식명 대조)
    cast: [
      { id: 25, ko: '피카츄' }, { id: 810, ko: '흥나숭' }, { id: 58, ko: '가디' },
    ],
    teaser: 'What are you arresting Pikachu for?',
  },
];

/**
 * 코인 말고 더 채워야 하는 조건.
 * 코인만이면 제일 쉬운 영상 한 편만 반복해도 모을 수 있어서, "기존 걸 다 본다"는 목적이 안 지켜진다.
 */
/**
 * 🔢 수학 환산 (2026-09-22, 아버님 결정): 정답 1문항 = 문장 2개 몫, ☀️ 하루 첫 완주 = 20, 🔁 복습 편 통과 1 = 복습 문장 5개 몫.
 * 하루 수학(8문항 + 완주) ≈ 36 ≈ 영어 40문장 — 두 과목이 같은 막대를 채운다. "아이가 목표로 삼은 그 영상"을 수학으로도 당길 수 있게.
 */
export const MATH_PTS = { ok: 2, daily: 20, rev: 5 };

export const NEED = {
  // 끝낸 문장 **누적 개수** (2026-09-18에 "가진 영상 전체의 80%" 비율에서 바꿈).
  // 비율이면 영상을 넣을 때마다 목표가 멀어졌다: 태블릿에 5,527문장이 있어 80% = 4,422문장,
  // 하루 40문장을 해도 막대가 0.9%씩 움직여 아버님 눈에 "진도가 안 는다"로 보였고,
  // 새 영상 3편(214문장)을 넣으면 목표가 4,593으로 **더 멀어졌다**.
  // 개수로 세면 ① 영상을 넣어도 목표가 그대로 ② 영상을 지워도 진도가 줄지 않는다
  //   (그래서 "어려운 영화를 지워서 조건을 채우는" 옛 구멍도 원천적으로 없어진다).
  doneSentences: 1000,
  reviewPassed: 50,   // 🔁 복습에서 한 번 이상 통과한 문장 50개 (배운 다음 날 이후에 다시 맞힌 것)
};

/**
 * 🎁 진짜 선물 교환권 (2026-10-04, 아버님: "자전거 벨도 교환권으로 — 얻으면 내가 사 준다").
 * 영상 교환권과 같은 줄에 선다: `after` 영상 교환권을 받은 **다음** 차례가 된다 (그 순간이 출발선 — 기준선 방식 그대로).
 * 다만 "빨리 끝내고 싶게" 차례가 오기 전부터 **미리 보기 카드**로 보인다 (previewGift).
 *
 * ★ 사진은 저장소에 넣지 않는다 — 피카츄 상품 사진이라 공개 저장소 원칙(위 LOCKED 주석)에 걸린다.
 *   아빠가 ⚙ 설정에서 태블릿의 사진을 골라 넣는다 (db의 blobs 'gift:<id>', 기기에만). 없으면 포켓몬 그림 + 이모지.
 * need  = 이 선물만의 조건 (없으면 영상과 같은 NEED)
 * after = 이 영상 교환권 다음 차례 (그 영상을 LOCKED에서 뺐으면 = 이미 배달됨 → 맨 앞)
 */
export const GIFTS = [
  {
    id: 'bell', ko: '피카츄 자전거 벨', emoji: '🔔', poster: 25, price: 2000, after: 'iconic',
    blurb: '자전거 손잡이에 다는 피카츄 벨 — 진짜 선물이에요! 교환권을 받으면 아빠가 사 줘요',
    need: { doneSentences: 1800, reviewPassed: 100 },
  },
];

export const isGift = (c) => !!c && GIFTS.some((g) => g.id === c.id);
/** 그 교환권의 학습 조건 (선물은 따로, 영상은 NEED) */
export const needOf = (c) => ({ ...NEED, ...((c && c.need) || {}) });

/** 교환권이 서는 줄 — 영상 사이사이에 선물을 `after` 뒤로 끼운다 (after가 목록에 없으면 맨 앞) */
export function voucherOrder(locked = LOCKED, gifts = GIFTS) {
  const out = [];
  const known = new Set(locked.map((c) => c.id));
  for (const g of gifts) if (!known.has(g.after)) out.push(g);
  for (const c of locked) {
    out.push(c);
    for (const g of gifts) if (g.after === c.id) out.push(g);
  }
  return out;
}

export function findVoucher(id) {
  return voucherOrder().find((c) => c.id === id) || null;
}

/** 가방에서 가진 교환권 id (영상·선물 모두) */
export function ownedVoucherIds(inventory = {}) {
  return voucherOrder().filter((c) => (inventory[ticketId(c.id)] || 0) > 0).map((c) => c.id);
}

/** 지금 모으는 교환권 — 줄에서 아직 안 가진 첫 번째 (영상이든 선물이든) */
export function nextTarget(ownedIds = []) {
  const owned = new Set([...ownedIds].map(String));
  return voucherOrder().find((c) => !owned.has(c.id)) || null;
}

/**
 * 🔒 차례는 아직이지만 미리 보여 줄 선물 — 안 가졌고 지금 모으는 것도 아닌 첫 선물.
 * 영상 교환권을 모으는 동안 "이걸 받으면 다음은 진짜 선물"이 보이게 (아버님: 빨리 끝내고 싶게)
 */
export function previewGift(ownedIds = []) {
  const owned = new Set([...ownedIds].map(String));
  const now = nextTarget(ownedIds);
  return GIFTS.find((g) => !owned.has(g.id) && (!now || now.id !== g.id)) || null;
}

/** 아이가 받았지만 아빠가 아직 안 건넨 선물 (📊에 알림 · 아이 화면엔 "아빠에게 보여 주세요") */
export function pendingGifts(inventory = {}, given = {}) {
  return GIFTS.filter((g) => (inventory[ticketId(g.id)] || 0) > 0 && !(given && given[g.id]));
}

export function findLocked(id) {
  return LOCKED.find((c) => c.id === id) || null;
}

/**
 * 지금까지 쌓인 누적치 (기준선을 만들 때도, 현황을 셀 때도 이 한 함수를 쓴다).
 * @param {Array} records 모든 문장 기록 (db.getAllSentenceStats)
 */
export function totalsFrom(records = [], mathTot = null) {
  let done = 0;
  let reviewed = 0;
  for (const r of records || []) {
    if (!r) continue;
    if (r.done) done++;
    if ((r.reviewPass || 0) > 0) reviewed++; // 복습에서 한 번 이상 통과
  }
  const n = (v) => Math.max(0, Math.floor(Number(v) || 0));
  // 🔢 수학 누적(math 레코드 tot) — 없으면 0. 기준선도 같은 모양으로 저장된다
  return { done, reviewed, mathOk: n(mathTot && mathTot.ok), mathDaily: n(mathTot && mathTot.daily), mathRev: n(mathTot && mathTot.rev) };
}

/** 저장된 기준선을 안전한 숫자로 (없으면 0부터) — 옛 기준선엔 수학 칸이 없으니 0 */
export function normalizeBase(base) {
  const n = (v) => Math.max(0, Math.floor(Number(v) || 0));
  return { done: n(base && base.done), reviewed: n(base && base.reviewed), mathOk: n(base && base.mathOk), mathDaily: n(base && base.mathDaily), mathRev: n(base && base.mathRev) };
}

/** 🔢 수학 누적 → 교환권 점수 (기준선 이후만). 막대 둘에 각각 더해진다 */
export function mathPoints(total, base) {
  const b = normalizeBase(base);
  const d = (k) => Math.max(0, (Number(total && total[k]) || 0) - b[k]);
  return { progress: d('mathOk') * MATH_PTS.ok + d('mathDaily') * MATH_PTS.daily, review: d('mathRev') * MATH_PTS.rev };
}

/**
 * 조건 현황 (순수 계산).
 *
 * ★ **기준선(base) 이후에 쌓인 것만 센다** (2026-09-19).
 *   전에는 누적 전체를 세서, 교환권을 하나 사고 나면 다음 영상의 조건이 **이미 꽉 차 있었다**.
 *   아이 입장에선 "사자마자 다음 것도 다 채워져 있다" → 목표가 사라진다.
 *   그래서 교환권을 살 때 그 시점의 누적치를 기준선으로 박아 두고, 다음 영상은 0부터 다시 센다.
 *
 * 문장 기록 **전부**를 센다 — 지운 영상의 기록도 포함한다. 아이가 실제로 배운 것이고,
 * 개수로 세므로 지운다고 늘지 않는다(비율이던 시절의 "삭제로 조건 채우기" 구멍이 없다).
 * 백업을 되돌려 누적이 기준선보다 작아지면 음수가 되지 않게 0으로 막는다.
 *
 * @param {{coins:number, records:Array, price:number, base:Object}} o
 *   records = 모든 문장 기록 (db.getAllSentenceStats)
 *   base    = 직전 교환권을 산 시점의 누적치 (profile.unlockBase)
 *   need    = 학습 조건 (🎁 선물은 needOf(c) — 기본은 영상의 NEED)
 */
export function unlockState({ coins = 0, records = [], price = 0, base = null, math = null, need = NEED } = {}) {
  const total = totalsFrom(records, math);
  const b = normalizeBase(base);
  // 라벨의 "(교환권 이후)"는 실제로 기준선이 잡혀 있을 때만 — 아직 하나도 안 산 아이에겐 그냥 누적이다
  const since = (b.done || b.reviewed || b.mathOk || b.mathDaily || b.mathRev) ? ' (교환권 이후)' : '';
  const done = Math.max(0, total.done - b.done);
  const reviewed = Math.max(0, total.reviewed - b.reviewed);
  const mp = mathPoints(total, b); // 🔢 수학 몫 — 같은 막대에 더한다
  const pctOf = (have, need) => (need <= 0 ? 100 : Math.min(100, Math.round((have / need) * 100)));
  const items = [
    { key: 'coins', label: '💰 코인', have: Math.max(0, Math.floor(coins)), need: price },
    { key: 'progress', label: `📼 배운 문장 + 🔢 수학${since}`, have: done + mp.progress, need: need.doneSentences, detail: `📼 영어 ${done.toLocaleString()} · 🔢 수학 ${mp.progress.toLocaleString()}` },
    { key: 'review', label: `🔁 복습 통과 + 🔢 수학 복습${since}`, have: reviewed + mp.review, need: need.reviewPassed, detail: `🔁 영어 ${reviewed.toLocaleString()} · 🔢 수학 ${mp.review.toLocaleString()}` },
  ].map((it) => ({ ...it, ok: it.have >= it.need, pct: pctOf(it.have, it.need) }));
  return {
    done, reviewed, coins, math: mp,
    total, base: b,
    items,
    ready: items.every((it) => it.ok),
  };
}

/**
 * 아직 못 산 영상 중 다음으로 보여줄 것 (가진 것 제외, **목록에 적은 순서대로**).
 * 값싼 것부터가 아니라 적은 순서인 이유: 아빠가 "이걸 먼저 보여 주고 싶다"를 정할 수 있어야 한다.
 */
export function nextLocked(ownedIds = []) {
  const owned = new Set([...ownedIds].map(String));
  return LOCKED.find((c) => !owned.has(c.id)) || null;
}

/** 아이가 샀지만 아직 아빠가 파일을 안 넣은 것 (📊에 알림) */
export function pendingTickets(inventory = {}, items = []) {
  const have = new Set((items || []).map((it) => String(it.title || '')));
  return LOCKED
    .filter((c) => (inventory[ticketId(c.id)] || 0) > 0)
    .map((c) => ({ ...c, delivered: have.has(c.ko) }));
}
