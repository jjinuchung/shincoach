// 📸 액자 사진 (v384 — 2026-11-02 아버님 기본안 「추천대로」) — 집에서 논 장면을 사진으로 남겨 📷 앨범에 모으고, 벽에 건 🖼️ 액자에 건다
// 순수 함수만 — 화면 없음(node 시험에서 그대로 돈다). 저장은 xp.houseDo(저장된 프로필로 한 트랜잭션), 그림은 playart.photoStageHtml, 화면은 photoview.js·houseview.js
//
// 사진은 그림 파일이 아니라 장면을 다시 그릴 재료다(진짜 카메라는 쓰지 않는다 — 얼굴·집 안이 찍히지 않고 저장도 가볍다):
//   { id, at: 찍은 때(ms), scene: 장면 이름, mon: 그때 파트너(0 = 혼자), look: 그때 캐릭터 차림, wall·floor: 그때 방 색, t?: 💗 테두리 단계, score?: 🎮 점수,
//     g?: 🐾 같이 논 손님(v385 — 파트너와 다를 때만) }
//   → 나중에 옷을 갈아입거나 파트너가 진화해도 옛 사진은 그때 모습 그대로다
// 저장: profile.homePhotos = { list: [사진…], gone: { 사진 id: 뺀 때 }, frames: { '방 id:놓은 번호': { p: 사진 id | '', at: 바꾼 때 } } }
//  · 앨범은 새것부터 PHOTO_MAX장까지 · 가득 차면 진우가 뺄 사진을 골라야 새 사진이 들어간다(저절로 빠지지 않게 — 기본안 ④)
//  · 뺀 사진은 gone에 적는다 — 옛 백업과 합쳐도 되살아나지 않게(합집합 · 칸마다 늦은 때) · 액자 칸은 바꾼 때가 나중인 쪽
//  · 액자에서 가리키는 사진이 앨범에 없으면(빠졌거나 합치다 밀려남) 빈 액자로 읽는다 · 액자를 서랍에 넣으면 놓는 번호가 바뀌어 빈 액자로 돌아온다(옛 칸은 다음에 걸 때 지운다)
// 💰·🔷·🔶·경험치는 주지 않는다 — 사진 찍기·걸기는 공짜(기본안 「새 보상은 💗와 추억뿐」)
import { houseOf } from './house.js';
import { lookOf } from './avatar.js';

/** 📷 앨범에 둘 수 있는 사진 수 (기본안 ④ — 30장 · 가득 차면 진우가 뺄 것을 고른다) */
export const PHOTO_MAX = 30;
/** 사진을 걸 수 있는 가구 — 🖼️ 액자(벽 소품, 💰200 그대로 · 기본안 ⑤) */
export const FRAME_ID = 'f_frame';
/** 사진이 될 수 있는 장면 — playart.SCENE_OF의 값들(🎮 일상 행동 · 🍚 · 🛏️ 가구 놀기) + 🤝 손님과 인사하기(v385 — 가구 없는 장면) */
export const PHOTO_SCENES = ['tv', 'game', 'pc', 'piano', 'meal', 'nap', 'sofa', 'pet', 'teddy', 'book', 'plant', 'flower', 'window', 'toy', 'hello'];
/** 뺀 사진 표의 끝 · 액자 칸 수의 끝 · 읽을 사진 칸 수의 끝 (깨진 백업이 끝없이 커지지 않게)
 *  뺀 표는 넉넉히 — 표에서 잘린 사진은 그 사진이 든 옛 백업과 합치면 되살아나 아끼던 사진을 밀어낸다(300이면 301번째 바꾸기부터 · Codex 187차 #1) ·
 *  3,000 = 날마다 빼도 몇 년치 · 다 차도 100KB 남짓 */
const GONE_MAX = 3000;
const FRAME_KEYS_MAX = 200;
const LIST_READ_MAX = 500;
/** 사진 id — ph + 찍은 때·주사위를 36진법으로 (photoIdOf) */
const ID_RE = /^ph[0-9a-z]{6,24}$/;
/** 액자 칸 열쇠 — 방 id(r1·r2…) : 놓은 번호 */
const FRAME_KEY_RE = /^r\d{1,2}:\d{1,10}$/;
const COLOR_RE = /^#[0-9a-f]{3,8}$/i;
/** 때의 끝 — 깨진 큰 수가 영영 "나중"이 되지 않게 (Date 최대값) */
const TIME_MAX = 8.64e15;
const MON_MAX = 100000;

const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const okTime = (v) => (Number.isSafeInteger(v) && v > 0 && v <= TIME_MAX ? v : 0);
/** 새것부터 — 같은 때면 id 차례(어느 기기에서 읽어도 같은 차례) */
const newer = (a, b) => b.at - a.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** 사진 id 만들기 (순수 — now·rnd를 받는다) · rnd = 0 이상 1 미만 */
export function photoIdOf(now, rnd) {
  const t = Math.max(0, Math.floor(Number(now) || 0)).toString(36);
  const r = Math.floor(Math.min(0.999999, Math.max(0, Number(rnd) || 0)) * 36 ** 4).toString(36).padStart(4, '0');
  return `ph${t}${r}`.slice(0, 26);
}

/** 액자 칸 열쇠 */
export function frameKey(roomId, u) {
  return `${roomId}:${u}`;
}

/** 사진 한 장 고쳐 읽기 (새 객체) — id·때·장면이 깨졌으면 null · 차림은 avatar.lookOf로(모르는 옷은 기본 옷) */
export function photoRecOf(raw) {
  if (!isObj(raw)) return null;
  const id = typeof raw.id === 'string' && ID_RE.test(raw.id) ? raw.id : '';
  const at = okTime(raw.at);
  const scene = PHOTO_SCENES.includes(raw.scene) ? raw.scene : '';
  if (!id || !at || !scene) return null;
  const mon = Number.isSafeInteger(raw.mon) && raw.mon > 0 && raw.mon < MON_MAX ? raw.mon : 0;
  const out = { id, at, scene, mon, look: lookOf(raw.look) };
  if (typeof raw.wall === 'string' && COLOR_RE.test(raw.wall)) out.wall = raw.wall;
  if (typeof raw.floor === 'string' && COLOR_RE.test(raw.floor)) out.floor = raw.floor;
  if (mon && [1, 2, 3].includes(raw.t)) out.t = raw.t;
  if (scene === 'game' && Number.isSafeInteger(raw.score) && raw.score >= 0 && raw.score <= 99999) out.score = raw.score;
  if (Number.isSafeInteger(raw.g) && raw.g > 0 && raw.g < MON_MAX && raw.g !== mon) out.g = raw.g; // 🐾 손님 (v385)
  return out;
}

/** 저장된 사진 기록 고쳐 읽기 (새 객체) — 깨진 칸은 빼고 · 뺀 사진은 앨범에서 빼고 · 같은 id는 하나 · 새것부터 PHOTO_MAX장 */
export function photosOf(raw) {
  const out = { list: [], gone: {}, frames: {} };
  if (!isObj(raw)) return out;
  if (isObj(raw.gone)) {
    const ks = Object.keys(raw.gone).filter((k) => ID_RE.test(k) && okTime(raw.gone[k]));
    ks.sort((a, b) => raw.gone[b] - raw.gone[a] || (a < b ? -1 : 1));
    for (const k of ks.slice(0, GONE_MAX)) out.gone[k] = raw.gone[k];
  }
  const seen = new Set();
  const list = Array.isArray(raw.list) ? raw.list.slice(0, LIST_READ_MAX) : [];
  for (const r of list) {
    const p = photoRecOf(r);
    if (!p || seen.has(p.id) || own(out.gone, p.id)) continue;
    seen.add(p.id);
    out.list.push(p);
  }
  out.list.sort(newer);
  out.list = out.list.slice(0, PHOTO_MAX);
  if (isObj(raw.frames)) {
    const fr = [];
    for (const k of Object.keys(raw.frames)) {
      const f = raw.frames[k];
      if (!FRAME_KEY_RE.test(k) || !isObj(f)) continue;
      const at = okTime(f.at);
      const p = f.p === '' || (typeof f.p === 'string' && ID_RE.test(f.p)) ? f.p : null;
      if (!at || p === null) continue;
      fr.push([k, { p, at }]);
    }
    // 끝을 넘으면 바꾼 때가 나중인 칸부터 남긴다 — 방금 건 액자가 잘리지 않고, 어느 차례로 합쳐도 같게 (Codex 187차 #3)
    fr.sort((a, b) => b[1].at - a[1].at || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    for (const [k, f] of fr.slice(0, FRAME_KEYS_MAX)) out.frames[k] = f;
  }
  return out;
}

/** 복사 (규칙이 마음껏 고칠 수 있게) — 객체가 아니면(없거나 깨진 백업) null */
export function copyPhotos(raw) {
  return isObj(raw) ? photosOf(raw) : null;
}

/**
 * 백업·두 창 병합 (순수) — 사진은 합집합(같은 id는 하나) · 뺀 사진은 합집합(칸마다 늦은 때 — 옛 백업이 뺀 사진을 되살리지 않게) ·
 * 액자 칸은 바꾼 때가 나중인 쪽(같은 때면 사진 id가 큰 쪽 — 어느 기기에서 합쳐도 같게) · 합쳐서 PHOTO_MAX를 넘으면 오래된 것부터 밀려난다 · 둘 다 없으면 null
 */
export function mergePhotos(a, b) {
  if (!isObj(a) && !isObj(b)) return null;
  const x = photosOf(a);
  const y = photosOf(b);
  const gone = { ...x.gone };
  for (const k of Object.keys(y.gone)) gone[k] = Math.max(gone[k] || 0, y.gone[k]);
  const frames = { ...x.frames };
  for (const k of Object.keys(y.frames)) {
    const f = y.frames[k];
    const g = frames[k];
    if (!g || f.at > g.at || (f.at === g.at && f.p > g.p)) frames[k] = f;
  }
  return photosOf({ list: [...x.list, ...y.list], gone, frames });
}

/**
 * 📸 사진 찍기 (규칙 · profile을 고친다) — rec = { id, scene, mon, look, wall, floor, t?, score? } · 찍은 때는 트랜잭션 안의 now
 * 가득 찼으면 drop(진우가 고른 뺄 사진 id)이 있어야 넣는다 — 없으면 { why: 'full' } · 가득 차지 않았으면 drop은 쓰지 않는다(그 사이 자리가 났으면 아무것도 안 뺀다)
 * 같은 id를 두 번 넣으면(저장 뒤 다시 누름·두 창) 그대로 ok · 뺀 사진 id는 다시 못 넣는다
 * @returns {{ok:true, id:string, dropped:string, again?:true}|{ok:false, why:'save'|'bad'|'full'|'changed'}}
 */
export function takePhotoRule(profile, rec, now, drop = '') {
  const t = okTime(now);
  if (!t) return { ok: false, why: 'save' };
  const p = photoRecOf({ ...(isObj(rec) ? rec : {}), at: t });
  if (!p) return { ok: false, why: 'bad' };
  const cur = photosOf(profile.homePhotos);
  if (cur.list.some((x) => x.id === p.id)) return { ok: true, id: p.id, dropped: '', again: true };
  if (own(cur.gone, p.id)) return { ok: false, why: 'bad' };
  let dropped = '';
  if (cur.list.length >= PHOTO_MAX) {
    if (!drop) return { ok: false, why: 'full' };
    if (!cur.list.some((x) => x.id === drop)) return { ok: false, why: 'changed' }; // 그새 다른 창에서 빠졌다 — 다시 고르게
    cur.gone[drop] = Math.max(cur.gone[drop] || 0, t);
    cur.list = cur.list.filter((x) => x.id !== drop);
    dropped = drop;
  }
  cur.list.unshift(p);
  profile.homePhotos = photosOf(cur);
  return { ok: true, id: p.id, dropped };
}

/**
 * 🖼️ 액자에 사진 걸기 (규칙 · profile을 고친다) — 그 방 그 번호에 놓인 것이 🖼️ 액자여야 · 사진은 앨범에 있어야 · id ''면 빈 액자로
 * 바꾼 때는 늘 앞으로(앞서 적힌 때 + 1 이상 — 시계가 뒤로 가도 옛 백업이 이기지 않게)
 * @returns {{ok:true, id:string}|{ok:false, why:'save'|'gone'|'nophoto'}}
 */
export function hangRule(profile, roomId, u, photoId, now) {
  const t = okTime(now);
  if (!t) return { ok: false, why: 'save' };
  const rooms = houseOf(profile).rooms;
  const rm = rooms.find((r) => r.id === roomId);
  const it = rm && rm.items.find((i) => i.u === u);
  if (!it || it.id !== FRAME_ID) return { ok: false, why: 'gone' };
  const id = typeof photoId === 'string' ? photoId : '';
  const cur = photosOf(profile.homePhotos);
  if (id && !cur.list.some((x) => x.id === id)) return { ok: false, why: 'nophoto' };
  const key = frameKey(roomId, u);
  const prev = cur.frames[key];
  // 지금 방에 놓여 있지 않은 액자 칸은 지운다 — 서랍에 넣었다 다시 놓을 때마다 번호가 바뀌어 옛 칸이 쌓였다
  //   (끝을 넘으면 새로 건 사진이 「걸었어요」인데 빈 액자 · Codex 187차 #3) · 지운 것은 기록하지 않는다(옛 백업과 합치면 돌아와도 놓인 액자가 아니라 그만)
  const placed = new Set();
  for (const r of rooms) for (const i of r.items) if (i.id === FRAME_ID) placed.add(frameKey(r.id, i.u));
  for (const k of Object.keys(cur.frames)) if (!placed.has(k)) delete cur.frames[k];
  cur.frames[key] = { p: id, at: prev ? Math.max(t, prev.at + 1) : t };
  profile.homePhotos = photosOf(cur);
  return { ok: true, id };
}

/** 이 액자에 걸린 사진 (순수) — 없으면 null */
export function framePhotoOf(profile, roomId, u) {
  const ph = photosOf(profile && profile.homePhotos);
  const f = ph.frames[frameKey(roomId, u)];
  if (!f || !f.p) return null;
  return ph.list.find((x) => x.id === f.p) || null;
}

/** 지금 어느 액자에든 걸린 사진 id (순수 · 앨범의 🖼️ 표시) — 그 자리에 정말 🖼️ 액자가 놓여 있을 때만 */
export function hungIds(profile) {
  const ph = photosOf(profile && profile.homePhotos);
  const out = new Set();
  for (const rm of houseOf(profile).rooms) {
    for (const it of rm.items) {
      if (it.id !== FRAME_ID) continue;
      const f = ph.frames[frameKey(rm.id, it.u)];
      if (f && f.p && ph.list.some((x) => x.id === f.p)) out.add(f.p);
    }
  }
  return out;
}
