// 🎮 일상 행동 (2026-10-18, 아버님 "이대로 해") — 방에 놓은 📺 TV · 🎮 게임기 · 💻 컴퓨터 · 🎹 피아노를 누르면 캐릭터와 🤝 파트너가 함께 논다
// 규칙(순수) — 저장은 xp.houseDo(저장된 프로필로 한 트랜잭션), 장면은 playshow.js · 그림은 playart.js
//
// 보상은 💰·🔷·🔶·경험치가 **아니다**(공부보다 쉬운 벌이가 되지 않게) — 기기마다 하루 한 번 파트너에게 💗 사이좋음 +1, 같은 날 두 번째부터는 장면만.
// 저장: profile.homePlay = { days: { 기기 id: 마지막으로 💗를 받은 날 번호 }, bond: { 포켓몬 id: 💗 }, best?: { 게임 id: 최고 점수 } }
//  · 🎮 미니 게임(v307 — minigame.js)의 최고 기록은 best — 늘기만 한다(병합은 칸마다 큰 쪽) · 한 번도 안 했으면 칸이 없다
//  · ⏱️ 다 맞추면 끝나는 게임(v339 🖼️ 그림 맞추기 — GAMES clock)의 최고 기록은 fast: { 게임 id: 가장 빠른 초 } — 줄기만 한다(병합은 칸마다 작은 쪽) · 끝까지 한 판만
//  · 날은 트랜잭션 안의 시각으로 센다 · 지난 날보다 **뒤인 날**에만 준다(시계를 되돌려도 또 받지 않게 — 기록은 늘 큰 쪽)
//  · 💗는 늘기만 한다 — 병합은 칸마다 큰 쪽(두 창·옛 백업을 합쳐도 늘어나지 않는다)
//  · 진화하면 💗를 이어받는다 — 읽을 때 진화 전 모습들의 💗 중 가장 큰 것(bondOf), 주면 그 수 + 1을 지금 모습에 적는다(옛 칸은 지우지 않음 — 단조)
import { houseOf, houseShape, takenCells, furnById, turnOf, CUSHION } from './house.js';
import { avatarOf, partnerSpot } from './avatar.js';
import { evoFrom, evoOf, haveOf } from './evolve.js';
import { dayNum } from './korean.js';

/** 놀 수 있는 기기 — btn = 도구 줄 단추 · did = 장면 끝 말("개굴닌자와 ○○") */
export const PLAYS = {
  f_tv: { emoji: '📺', btn: '📺 TV 보기', did: 'TV를 봤어요' },
  f_game: { emoji: '🎮', btn: '🎮 게임하기', did: '게임을 했어요' },
  f_pc: { emoji: '💻', btn: '💻 컴퓨터 하기', did: '컴퓨터를 했어요' },
  f_piano: { emoji: '🎹', btn: '🎹 피아노 치기', did: '피아노를 쳤어요' },
  f_table: { emoji: '🍽️', btn: '🍚 밥 먹기', did: '밥을 먹었어요' }, // ③ 가구 더하기 (2026-10-18) — 식탁은 가구지만 놀 수 있다
};
export const PLAY_IDS = Object.keys(PLAYS);
/** 💗 한 칸의 끝 (깨진 큰 수가 끝없이 커지지 않게) · 💗 칸 수의 끝 */
export const BOND_MAX = 1e6;
const BOND_KEYS_MAX = 2000;
/** 날 번호의 끝 — 깨진 큰 날이 영영 "오늘보다 뒤"가 되지 않게(서기 9999년쯤) */
const DAY_MAX = 3e6;
/** 🎮 미니 게임 최고 점수의 끝 · 게임 열쇠 꼴(minigame.GAMES의 id — 소문자) · 칸 수의 끝 */
export const SCORE_MAX = 99999;
const GAME_KEY = /^[a-z]{2,12}$/;
const BEST_KEYS_MAX = 40;
/** ⏱️ 가장 빠른 시간(초)의 끝 — 하루 (v339) */
export const FAST_MAX = 86400;

const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const cnt = (v, max) => (Number.isSafeInteger(v) && v > 0 ? Math.min(v, max) : 0);

/** 저장된 놀이 기록 고쳐 읽기 (새 객체) — 모르는 기기·깨진 값은 뺀다 · 🎮 최고 기록(best)은 있을 때만 칸을 둔다 */
export function playOf(raw) {
  const out = { days: {}, bond: {} };
  if (!isObj(raw)) return out;
  if (isObj(raw.days)) for (const id of PLAY_IDS) { const d = own(raw.days, id) ? cnt(raw.days[id], DAY_MAX) : 0; if (d) out.days[id] = d; }
  if (isObj(raw.bond)) {
    const keys = Object.keys(raw.bond).filter((k) => /^\d{1,6}$/.test(k) && cnt(raw.bond[k], BOND_MAX)).slice(0, BOND_KEYS_MAX);
    for (const k of keys) out.bond[k] = cnt(raw.bond[k], BOND_MAX);
  }
  if (isObj(raw.best)) {
    const keys = Object.keys(raw.best).filter((k) => GAME_KEY.test(k) && cnt(raw.best[k], SCORE_MAX)).slice(0, BEST_KEYS_MAX);
    if (keys.length) { out.best = {}; for (const k of keys) out.best[k] = cnt(raw.best[k], SCORE_MAX); }
  }
  if (isObj(raw.fast)) { // ⏱️ (v339) — 하루보다 긴 시간·깨진 값은 뺀다(자르면 「24시간」이 기록이 된다)
    const keys = Object.keys(raw.fast).filter((k) => GAME_KEY.test(k) && cnt(raw.fast[k], FAST_MAX) && raw.fast[k] <= FAST_MAX).slice(0, BEST_KEYS_MAX);
    if (keys.length) { out.fast = {}; for (const k of keys) out.fast[k] = raw.fast[k]; }
  }
  return out;
}
/** 복사 (프로필 복사용) — 객체가 아니면 null */
export function copyPlay(raw) {
  return isObj(raw) ? playOf(raw) : null;
}
/** 백업 병합 (순수) — 날·💗 모두 칸마다 큰 쪽 · 둘 다 없으면 null */
export function mergePlay(a, b) {
  if (!isObj(a) && !isObj(b)) return null;
  const x = playOf(a);
  const y = playOf(b);
  for (const id of Object.keys(y.days)) x.days[id] = Math.max(x.days[id] || 0, y.days[id]);
  for (const k of Object.keys(y.bond)) x.bond[k] = Math.max(x.bond[k] || 0, y.bond[k]);
  if (y.best) { x.best = x.best || {}; for (const k of Object.keys(y.best)) x.best[k] = Math.max(x.best[k] || 0, y.best[k]); }
  if (y.fast) { x.fast = x.fast || {}; for (const k of Object.keys(y.fast)) x.fast[k] = own(x.fast, k) ? Math.min(x.fast[k], y.fast[k]) : y.fast[k]; }
  return playOf(x);
}

/**
 * 🎮 기록 판 (v351 — 진우 「너무 쉬워요」 → 게임 15개를 조금씩 어렵게 · 아버님 「추천대로」) — 새 난이도 기록은 게임 id 뒤에 h를 붙인 열쇠(dig → digh)에
 * 따로 적고, 옛 열쇠(쉬울 때 기록)는 그대로 둔다(게임 카드에 「쉬울 때 ⭐」로 작게).
 * 새 칸(best2 같은)을 두지 않은 까닭: 옛 판 앱(v350)의 playOf는 모르는 칸을 버리지만 best·fast 안의 GAME_KEY 열쇠는 남긴다
 * — 태블릿이 옛 판으로 한 번 더 켜져 게임을 해도(옛 판은 옛 열쇠에 적는다) 새 기록이 안 사라진다
 */
export const REC_SUFFIX = 'h';
/** 새 난이도 기록 열쇠 — 열쇠 꼴(GAME_KEY · 12자까지)에 맞지 않으면 '' */
export function recKey(gameId) {
  const k = `${gameId}${REC_SUFFIX}`;
  return GAME_KEY.test(String(gameId)) && GAME_KEY.test(k) ? k : '';
}

/** 🎮 그 게임의 최고 점수 (없으면 0) — 열쇠 그대로(새 난이도 기록은 recKey로 부른다) */
export function bestOf(raw, gameId) {
  const b = playOf(raw).best;
  return b && own(b, gameId) ? b[gameId] : 0;
}
/** ⏱️ 그 게임의 가장 빠른 시간(초 · 없으면 0 — v339) */
export function fastOf(raw, gameId) {
  const f = playOf(raw).fast;
  return f && own(f, gameId) ? f[gameId] : 0;
}

/** 💗 사이좋음 — 이 포켓몬과 진화 전 모습들 가운데 가장 큰 것 (진화해도 이어진다) */
export function bondOf(raw, monId) {
  const p = isObj(raw) && isObj(raw.bond) ? raw : playOf(raw);
  const seen = new Set();
  let best = 0;
  const walk = (id) => {
    const k = String(Number(id));
    if (seen.has(k)) return;
    seen.add(k);
    best = Math.max(best, cnt(p.bond[k], BOND_MAX));
    for (const f of evoFrom(Number(k))) walk(f);
  };
  walk(monId);
  return best;
}

/** 🧬 진화 줄 (순수 — 💻 도감 쪽) — 진화 전 모습들 → 이 포켓몬 → (갈래가 하나뿐이면) 다음 모습들 · id 목록 */
export function chainOf(monId) {
  const id = Number(monId);
  const seen = new Set([id]);
  const back = [];
  for (let c = id; ;) {
    const f = evoFrom(c).find((x) => !seen.has(x));
    if (!f) break;
    back.unshift(f);
    seen.add(f);
    c = f;
  }
  const fwd = [];
  for (let c = id; ;) {
    const n = evoOf(c);
    if (n.length !== 1 || seen.has(n[0].to)) break;
    fwd.push(n[0].to);
    seen.add(n[0].to);
    c = n[0].to;
  }
  return [...back, id, ...fwd];
}

/** 💗 단계 — 쌓이면 방·장면의 파트너에게 테두리(꾸밈만 — 💰·스톤·다른 보상과 안 이어짐) · 다음 단계까지 남은 수는 아이 화면에 쓰지 않는다 */
export const BOND_TIERS = [10, 25, 50];
export function bondTier(n) {
  const v = cnt(n, BOND_MAX);
  return BOND_TIERS.filter((t) => v >= t).length;
}

/** 🤝 홈 화면에 나올 파트너 (순수 — homepal · 2026-10-18) — 데리고 있는 파트너의 💗가 첫 테두리(10)부터 → { id, tier } | null
 *  ("몇 개 더 모으면 나와요" 같은 말은 아이 화면에 쓰지 않는다 — 조용히 나타난다) */
export function homePalOf(profile) {
  const id = partnerOf(profile);
  if (!id) return null;
  const tier = bondTier(bondOf(profile && profile.homePlay, id));
  return tier >= 1 ? { id, tier } : null;
}

/** 🐾 파트너가 쉬는 칸 (순수) — 캐릭터가 선 방에 파트너 쿠션이 있으면 그 위(먼저 놓은 쿠션 — 번호가 작은 것), 없으면 캐릭터 옆(avatar.partnerSpot) · spot = avatarOf().spot */
export function palHome(profile, spot) {
  if (!spot) return null;
  const room = houseOf(profile).rooms.find((r) => r.id === spot.room);
  // 먼저 놓은 쿠션 = 번호(u)가 작은 것 — 방의 물건 차례(houseOf가 고쳐 읽은 차례)에 기대지 않는다
  const c = room && room.items.filter((i) => i.id === CUSHION).sort((a, b) => a.u - b.u)[0];
  if (c) return { room: room.id, x: c.x, y: c.y, cushion: true };
  return partnerSpot(profile, spot);
}

/** 🤝 지금 파트너 — 데리고 있을 때만 id, 아니면 null */
export function partnerOf(profile) {
  const id = Number(profile && profile.partner);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  return haveOf((profile.caught || {})[id], (profile.mons || {})[id]) > 0 ? id : null;
}

/** 오늘 이 기기로 💗를 받을 수 있나 (순수 — 화면 말에만 · 판정은 playRule이 트랜잭션 안에서) */
export function heartReady(profile, id, now) {
  const day = dayNum(now);
  return !!PLAYS[id] && day > 0 && day <= DAY_MAX && day > (playOf(profile && profile.homePlay).days[id] || 0);
}

/**
 * 🚶 놀러 갈 칸 (순수) — 기기 옆 빈 바닥 칸: 왼쪽 → 오른쪽 → 앞줄 → 가장 가까운 빈 칸. 🤝 파트너도 옆에 설 수 있는 칸을 먼저 고른다.
 * 캐릭터가 서 있는 칸은 비어 있는 것으로 본다(거기서 걸어 나가니까) · 없으면 null
 * → { me: { room, x, y }, pal: { room, x, y } | null }
 */
export function playSpot(profile, roomId, u) {
  const h = houseOf(profile);
  const room = h.rooms.find((r) => r.id === roomId);
  const it = room && room.items.find((i) => i.u === u);
  if (!it) return null;
  const d = furnById(it.id);
  if (!d || d.at !== 'floor') return null;
  const size = houseShape(profile).size;
  const taken = takenCells(room);
  const free = (x, y) => x >= 0 && y >= 0 && x < size.W && y < size.H && !taken.has(`${x},${y}`);
  const cand = [];
  if (turnOf(d, it.r)) { // 🔄 세로로 놓인 가구 (v334) — 양옆을 위에서부터, 그다음 아래
    for (let dy = 0; dy < d.w; dy++) cand.push({ x: it.x - 1, y: it.y + dy }, { x: it.x + 1, y: it.y + dy });
    cand.push({ x: it.x, y: it.y + d.w });
  } else {
    cand.push({ x: it.x - 1, y: it.y }, { x: it.x + d.w, y: it.y });
    for (let dx = 0; dx < d.w; dx++) cand.push({ x: it.x + dx, y: it.y + 1 });
  }
  // 그다음은 가장 가까운 빈 칸 (거리가 같으면 위·왼쪽 먼저)
  const rest = [];
  for (let y = 0; y < size.H; y++) for (let x = 0; x < size.W; x++) rest.push({ x, y, k: Math.abs(x - it.x) + Math.abs(y - it.y) });
  rest.sort((a, b) => a.k - b.k || a.y - b.y || a.x - b.x);
  const all = [...cand, ...rest].filter((c) => free(c.x, c.y));
  if (!all.length) return null;
  const hasPal = !!partnerOf(profile);
  const palAt = (c) => partnerSpot(profile, { room: room.id, x: c.x, y: c.y });
  const pick = (hasPal && all.find((c) => palAt(c))) || all[0];
  return { me: { room: room.id, x: pick.x, y: pick.y }, pal: hasPal ? palAt(pick) : null };
}

/**
 * ▶️ 놀기 — 캐릭터를 만들었고 그 방에 그 기기가 놓여 있으면 언제든 장면은 본다.
 * 🤝 파트너가 있고 그 기기로 오늘 아직 💗를 안 받았으면 💗 +1 (그 기기의 날을 오늘로).
 * why: 'made' 캐릭터를 먼저 · 'gone' 그 기기가 그 방에 없음(다른 창에서 치움) · 'play' 놀 수 없는 가구
 * → { ok, kind, heart, mon, bond }  (bond = 놀고 난 뒤의 💗 · 파트너가 없으면 mon null)
 */
export function playRule(profile, roomId, u, now) {
  if (!avatarOf(profile).made) return { ok: false, why: 'made' };
  const room = houseOf(profile).rooms.find((r) => r.id === roomId);
  const it = room && room.items.find((i) => i.u === u);
  if (!it) return { ok: false, why: 'gone' };
  if (!PLAYS[it.id]) return { ok: false, why: 'play' };
  const mon = partnerOf(profile);
  const hp = playOf(profile.homePlay);
  if (!mon) return { ok: true, kind: it.id, heart: false, mon: null, bond: 0 };
  const before = bondOf(hp, mon);
  const day = dayNum(now);
  // 🔍 Codex 91차 #1: 먼 앞날(DAY_MAX 넘음 — 깨진 시계)엔 주지 않는다 — 적을 때만 줄이면 그날 내내 "지난 날보다 뒤"라 계속 받았다
  if (!(day > 0 && day <= DAY_MAX && day > (hp.days[it.id] || 0))) return { ok: true, kind: it.id, heart: false, mon, bond: before };
  hp.days[it.id] = day;
  hp.bond[String(mon)] = Math.min(BOND_MAX, before + 1);
  profile.homePlay = hp;
  return { ok: true, kind: it.id, heart: true, mon, bond: hp.bond[String(mon)] };
}

/**
 * 🎮 미니 게임 한 판이 끝났다 (v307) — 그 기기로 놀기(playRule — 💗 하루 한 번) + 그 게임의 최고 점수(v351부터 새 난이도 열쇠 recKey).
 * 판은 시작할 때 이미 썼다(gameview — daily gamePlays) · 점수는 게임이 센 것(0 ~ SCORE_MAX로 자름 — 💰·스톤과 안 이어진다)
 * why: playRule과 같고 + 'game' 모르는 게임 · 최고 점수는 늘기만 한다(파트너가 없어도 적는다)
 * sec = ⏱️ 다 맞추는 데 걸린 초(v339 🖼️ 그림 맞추기 — 끝까지 한 판만 · 없으면 0) — 가장 빠른 시간은 줄기만 한다
 * → { ...playRule 결과, best, prevBest, newBest, fast, prevFast, newFast }
 */
export function gameEndRule(profile, roomId, u, gameId, score, now, sec = 0) {
  const key = recKey(gameId); // 🎮 새 난이도 기록 열쇠 (v351)
  if (!key) return { ok: false, why: 'game' };
  const r = playRule(profile, roomId, u, now);
  if (!r.ok) return r;
  const hp = playOf(profile.homePlay);
  const prevBest = bestOf(hp, key);
  const s = Number.isSafeInteger(score) && score > 0 ? Math.min(score, SCORE_MAX) : 0;
  const newBest = s > prevBest;
  if (newBest) hp.best = { ...(hp.best || {}), [key]: s };
  const prevFast = fastOf(hp, key);
  const t = Number.isSafeInteger(sec) && sec > 0 && sec <= FAST_MAX ? sec : 0;
  const newFast = t > 0 && (!prevFast || t < prevFast);
  if (newFast) hp.fast = { ...(hp.fast || {}), [key]: t };
  if (newBest || newFast) profile.homePlay = hp;
  return { ...r, best: Math.max(prevBest, s), prevBest, newBest, fast: newFast ? t : prevFast, prevFast, newFast };
}
