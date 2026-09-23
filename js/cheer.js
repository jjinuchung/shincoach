// ✨ 응원 포켓몬 — 수학을 푸는 동안 잡은 포켓몬이 화면을 가로질러 지나가며 한마디 남긴다.
//
// 왜 (2026-09-23, 아버님 아이디어): "수학은 약간 어렵고 지겨울 수도 있으니, 갑자기 화면 밖에서
// 피카츄나 아이가 얻은 포켓몬이 나타나 '힘내라~ 넌 할 수 있어!' 하고 지나갔으면 좋겠다."
//
// 규칙 — **방해하지 않는다**가 첫째다:
//  · 아이의 조작을 가로막지 않는다 (탭이 통과한다, 버튼을 가리지 않게 화면 아래쪽으로 지나간다)
//  · 문제를 **틀린 직후**에 잘 나온다 (지겹고 속상할 때가 제일 필요한 순간)
//  · 너무 자주 나오면 성가시다 → 확률 + 쿨다운 + 하루 상한
//  · 한 번에 하나만. 배틀·잡기 같은 큰 화면이 열려 있으면 비켜 준다 (부르는 쪽이 판단)

/** 문항을 끝낼 때마다 이 확률로 지나간다 (틀렸으면 AFTER_WRONG) */
export const CHANCE = 0.18;
/** 틀린 직후 — 응원이 제일 필요한 자리라 확률을 올린다 */
export const CHANCE_AFTER_WRONG = 0.5;
/** 한 번 지나간 뒤 이만큼 문항은 안 나온다 */
export const COOLDOWN = 3;
/** 하루 최대 (이만큼 보면 그날은 그만 — 반가움이 사라진다) */
export const MAX_PER_DAY = 8;
/** 걸어가는 시간(ms) — 너무 빠르면 못 읽고, 느리면 거슬린다 */
export const WALK_MS = 5200;

/**
 * 응원 문구 — 한글 한 줄 + 영어 한 줄.
 * 영어를 같이 두는 이유: 이 앱은 영어도 같이 하는 앱이라 눈에 익게. 초4가 읽을 수 있는 짧은 것만.
 */
export const LINES = [
  { ko: '넌 할 수 있어!', en: 'You can do it!' },
  { ko: '힘내라 힘!', en: 'Keep going!' },
  { ko: '거의 다 왔어!', en: "You're almost there!" },
  { ko: '천천히 해도 괜찮아', en: 'Take your time.' },
  { ko: '아까보다 잘하는데?', en: "You're getting better!" },
  { ko: '포기하지 마!', en: "Don't give up!" },
  { ko: '나도 보고 있어!', en: "I'm watching you!" },
  { ko: '멋지다!', en: 'Awesome!' },
  { ko: '한 문제만 더!', en: 'One more!' },
  { ko: '집중 최고!', en: 'Nice focus!' },
];

/** 틀린 직후에만 쓰는 문구 — "잘한다"는 이 자리에서 비꼬는 말로 들린다 */
export const LINES_WRONG = [
  { ko: '괜찮아, 틀려도 돼!', en: "It's okay to miss one." },
  { ko: '틀리면서 느는 거야', en: 'Mistakes help you learn.' },
  { ko: '다시 한 번 해 보자!', en: "Let's try again!" },
  { ko: '나도 처음엔 틀렸어', en: 'I missed it too at first.' },
  { ko: '포기하지 마, 할 수 있어!', en: "Don't give up. You can do it!" },
];

/**
 * 지금 응원이 지나갈 차례인가 (순수).
 * @param {{wrong:boolean, cooldown:number, todayCount:number, rng?:function}} o
 */
export function shouldCheer({ wrong = false, cooldown = 0, todayCount = 0, rng = Math.random } = {}) {
  if (cooldown > 0) return false;
  if (todayCount >= MAX_PER_DAY) return false;
  return rng() < (wrong ? CHANCE_AFTER_WRONG : CHANCE);
}

/**
 * 이번에 지나갈 포켓몬 하나 (순수).
 * 파트너가 자주 나오되(절반) 다른 잡은 애들도 섞인다 — 늘 같은 얼굴이면 금방 시시해진다.
 * @param {Array<{id:number, url?:string}>} mine 잡은 포켓몬 (그림이 있는 것만 넘겨 준다)
 * @param {number|null} partnerId
 */
export function pickCheerer(mine, partnerId, rng = Math.random) {
  const pool = (mine || []).filter((m) => m && m.url);
  if (!pool.length) return null;
  const partner = partnerId ? pool.find((m) => m.id === partnerId) : null;
  if (partner && rng() < 0.5) return partner;
  return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
}

/** 이번에 할 말 (순수). 방금 것과 같은 말은 피한다 */
export function pickLine(wrong, lastKo = '', rng = Math.random) {
  const pool = (wrong ? LINES_WRONG : LINES).filter((l) => l.ko !== lastKo);
  const list = pool.length ? pool : (wrong ? LINES_WRONG : LINES);
  return list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
}

/** 어느 쪽에서 들어올지 (순수) — 'left'면 왼쪽에서 들어와 오른쪽으로 나간다 */
export function pickSide(rng = Math.random) {
  return rng() < 0.5 ? 'left' : 'right';
}
