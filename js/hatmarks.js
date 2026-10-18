// 🧢 지우 모자 무늬 받기 (v293, 2026-10-18 아버님 "모자 앞 무늬는 만화에 있는 것 중 하나로 · 여러 무늬를 만들어 다른 무늬의 모자도 살 수 있게")
// 애니의 공식 모자 무늬는 공개 저장소에 그림으로 두지 않는다(포켓몬 그림·음악과 같은 까닭) → 비공개 저장소 avatar/hatmarks.json을
// 📤 열쇠로 받아 이 기기에만 둔다(💌 한 줄 메시지와 같은 길). 열쇠가 없는 기기·아직 못 받은 때는 모자의 앞판까지만 보인다.
// 받기: 🏡 집을 열 때 10분에 한 번까지 · 받은 것은 이 기기에 두어 인터넷이 없어도 무늬가 남는다 · 빈 목록·깨진 목록이면 받아 둔 것을 그대로
// 그림에 넣는 것은 avatarart.setHatMarks — 허용한 도형·숫자·색만 통과한다(hatMarksOf)
import { setHatMarks, hatMarksOf } from './avatarart.js';

/** 비공개 저장소의 무늬 파일 — [{ id, shapes: [{ t, …, fill, stroke, sw }] }] */
export const MARKS_PATH = 'avatar/hatmarks.json';
const KEY = { cache: 'shincoach.hatMarks', at: 'shincoach.hatMarksAt' };
/** 받기 간격 */
export const SYNC_MS = 10 * 60 * 1000;

function load(k, d) {
  try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v === null ? d : v; } catch { return d; }
}
function save(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; }
}

/** 받아 둔 무늬를 그림에 넣는다 (앱을 켤 때 한 번) — 넣은 무늬 수 */
export function loadHatMarks() {
  return setHatMarks(load(KEY.cache, []));
}

/**
 * 받기 — 10분에 한 번까지(force면 바로) · 쓸 만한 무늬가 하나라도 있으면 받아 둔 것을 바꾸고 그림에 넣는다 → 바뀌었으면 true
 * 빈 목록(파일이 아직 없음·인터넷 없음·열쇠 없음)이나 모두 깨진 목록이면 받아 둔 것을 그대로 — 무늬가 사라지지 않게
 */
export async function syncHatMarks(force = false, deps = {}) {
  const now = (deps.now || Date.now)();
  const at = Number(load(KEY.at, 0)) || 0;
  if (!force && now - at >= 0 && now - at < SYNC_MS) return false;
  save(KEY.at, now);
  const readList = deps.readList || (async (p) => (await import('./upload.js')).readPrivateList(p));
  let list = [];
  try { list = await readList(MARKS_PATH); } catch { list = []; }
  if (!Array.isArray(list) || !list.length) return false;
  const ok = hatMarksOf(list);
  // 검사에서 빠진 무늬는 📊 📥 받기 줄에 ⚠️로 — 무늬가 안 보이는 까닭을 아버님이 알 수 있게 (🔍 Codex 99차 #2 · 💌 메시지와 같은 길)
  const noteCheck = deps.noteCheck || (async (c) => (await import('./upload.js')).noteReadCheck(MARKS_PATH, c));
  try { await noteCheck({ rows: list.length, bad: list.length - Object.keys(ok).length }); } catch { /* 못 적어도 받기는 그대로 */ }
  if (!Object.keys(ok).length) return false;
  // 받아 둘 때도 고쳐 읽은 꼴로 — 다음에 켤 때 다시 검사한다
  const next = Object.keys(ok).map((id) => ({ id, shapes: ok[id] }));
  const before = JSON.stringify(load(KEY.cache, []));
  save(KEY.cache, next);
  setHatMarks(next);
  return JSON.stringify(next) !== before;
}
