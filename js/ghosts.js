// 👻 되살린 백업의 영상 자리 (v361 ☁️ 자동 백업)
//
// 문장 기록의 열쇠는 "<영상 id>|<시작×10>"이고 영상 id는 넣을 때마다 새로 만든다(db.makeId).
// 새 태블릿에 백업을 되살린 뒤 같은 영상을 다시 넣으면 새 id가 생겨 끝낸 문장·🔁 복습·💖·🏁 영상 보상 기록(profile.parcels 'video:<id>')이
// 그 영상과 이어지지 않았다 → 되살릴 때(db.importStats) 이 기기에 없는 영상의 자리(id·제목·파일 이름)를 적어 두었다가,
// 같은 파일 이름(없으면 같은 제목)의 영상을 넣으면(db.addItem) 그 id를 다시 쓴다.
// 이 기기에만 둔다(localStorage) — 영상 파일 자체는 백업하지 않는다. 아무것도 import하지 않는다 (db.js가 부른다 — 순환 없음)

const KEY = 'shincoach.ghostItems';
/** 적어 두는 영상 자리 상한 */
export const GHOST_MAX = 300;

const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');

/** 영상 자리 목록 꼴 고치기 (순수) — id가 글자인 것만 · 칸마다 꼴 · 같은 id는 처음 것 하나 · GHOST_MAX까지 */
export function ghostsOf(raw) {
  const out = [];
  const seen = new Set();
  for (const g of Array.isArray(raw) ? raw : []) {
    if (!g || typeof g.id !== 'string' || !g.id || seen.has(g.id)) continue;
    seen.add(g.id);
    const one = {
      id: g.id.slice(0, 80),
      title: str(g.title, 200),
      videoName: str(g.videoName, 300),
      duration: Number.isFinite(Number(g.duration)) && Number(g.duration) > 0 ? Number(g.duration) : 0,
      lastCue: Number.isInteger(Number(g.lastCue)) && Number(g.lastCue) > 0 ? Number(g.lastCue) : 0,
      createdAt: Number.isFinite(Number(g.createdAt)) && Number(g.createdAt) > 0 ? Number(g.createdAt) : 0,
    };
    if (typeof g.noReview === 'boolean') one.noReview = g.noReview;
    out.push(one);
    if (out.length >= GHOST_MAX) break;
  }
  return out;
}

/**
 * 되살린 백업의 영상(items) 가운데 이 기기에 없는 것을 자리 목록에 더한다 (순수 — 새 목록)
 * @param {Array} list 지금 목록 · @param {Array} items 백업의 items · @param {Iterable<string>} haveIds 이 기기에 있는 영상 id
 */
export function addGhosts(list, items, haveIds) {
  const have = new Set([...(haveIds || [])].map(String));
  const fresh = ghostsOf(items).filter((g) => !have.has(g.id));
  const old = ghostsOf(list).filter((g) => !have.has(g.id) && !fresh.some((f) => f.id === g.id));
  return ghostsOf([...fresh, ...old]); // 새로 되살린 것이 앞 — 상한을 넘으면 오래된 자리가 빠진다
}

/**
 * 새로 넣는 영상에 맞는 자리 (순수) — 파일 이름이 같은 것 하나 · 제목으로는 파일 이름을 모르는 자리(v361 전 백업)만 ·
 * 맞는 자리가 둘 이상이면 이어 붙이지 않는다(다른 화의 진도가 붙지 않게 — 🔍 Codex 165차 #3) · 빈 이름·빈 제목으로는 안 맞춘다
 * @returns {object|null}
 */
export function pickGhost(list, videoName, title) {
  const all = ghostsOf(list);
  const vn = String(videoName || '');
  const t = String(title || '').trim();
  const one = (l) => (l.length === 1 ? l[0] : null);
  const byName = vn ? all.filter((g) => g.videoName && g.videoName === vn) : [];
  if (byName.length) return one(byName);
  return t ? one(all.filter((g) => !g.videoName && g.title && g.title.trim() === t)) : null;
}

/** 이 기기의 자리 목록 (못 읽으면 빈 목록) */
export function readGhosts() {
  try { return ghostsOf(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch { return []; }
}

/** 자리 목록을 이 기기에 (못 적어도 그만 — 영상은 새 id로 들어갈 뿐) */
export function writeGhosts(list) {
  try {
    const l = ghostsOf(list);
    if (l.length) localStorage.setItem(KEY, JSON.stringify(l)); else localStorage.removeItem(KEY);
  } catch { /* 저장 못 해도 */ }
}

/** 쓴 자리(또는 이미 있는 영상의 자리)를 뺀다 */
export function dropGhost(id) {
  writeGhosts(readGhosts().filter((g) => g.id !== id));
}
