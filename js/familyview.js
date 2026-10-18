// 💌 아빠·엄마 한 줄 메시지 — 받기·그리기 (2026-10-18 v288 · 규칙·글자는 familymsg.js)
// 받기: 비공개 저장소 family/messages.json을 📤 열쇠로 — 홈에 올 때 10분에 한 번까지 · 받은 것은 이 기기에 두어 인터넷이 없어도 지난 말이 남는다
// 그리기: 과목 고르기 맨 위 #home-letter — 안 읽은 맨 앞 하나 → [💗 고마워요]면 읽음(이 기기에 시각) · 다 읽으면 [💌 지난 말 보기]만
// 📊 "💌 한 줄 쓰기"(부모)는 이 기기 목록에 더한다 — 저장소에는 안 올리고, 읽음과 함께 📤 family/read.md로
import { MSG_PATH, msgsOf, unreadOf, markSeen, localMsg, letterHtml, pastHtml, readMd } from './familymsg.js';

const KEY = { cache: 'shincoach.familyCache', local: 'shincoach.familyLocal', seen: 'shincoach.familySeen', at: 'shincoach.familyAt' };
/** 받기 간격 */
export const SYNC_MS = 10 * 60 * 1000;

/** 이 기기 저장 (못 읽거나 못 써도 화면은 그대로 — 사생활 창·막힌 저장소) */
function load(k, d) {
  try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v === null ? d : v; } catch { return d; }
}
/** 저장했으면 true — 못 쓰면(가득 참·막힘) false (🔍 Codex 95차 #1: 못 쓴 것을 "남겼어요"로 알렸다) */
function save(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; }
}
/** 읽음을 못 쓴 기기에서도 이번에 켠 동안은 [💗 고마워요]가 넘어가게 — 메모리에만 */
let memSeen = null;
const seenAll = () => ({ ...load(KEY.seen, {}), ...(memSeen || {}) });

/** 지금 가진 메시지 전부 — 받아 둔 것 + 이 기기에서 쓴 것 (보낸 시각 차례) */
export function allMsgs() {
  return msgsOf(load(KEY.cache, []), load(KEY.local, []));
}

/**
 * 받기 — 10분에 한 번까지(force면 바로) · 받은 목록이 있으면 받아 둔 것을 바꾼다 → 새로 받았으면 true
 * 빈 목록(파일이 아직 없음·인터넷 없음·열쇠 없음)이면 받아 둔 것을 그대로 둔다 — 지난 말이 사라지지 않게
 */
export async function syncFamily(force = false, deps = {}) {
  const now = (deps.now || Date.now)();
  const at = Number(load(KEY.at, 0)) || 0;
  if (!force && now - at >= 0 && now - at < SYNC_MS) return false;
  save(KEY.at, now);
  const readList = deps.readList || (async (p) => (await import('./upload.js')).readPrivateList(p));
  let list = [];
  try { list = await readList(MSG_PATH); } catch { list = []; }
  if (!Array.isArray(list) || !list.length) return false;
  const next = msgsOf(list);
  // 받지 않은 줄(꼴이 틀림·같은 id)은 📊 📥 받기 줄에 ⚠️로 — 아버님이 알 수 있게 (🔍 Codex 95차 #6)
  const noteCheck = deps.noteCheck || (async (c) => (await import('./upload.js')).noteReadCheck(MSG_PATH, c));
  try { await noteCheck({ rows: list.length, bad: list.length - next.length }); } catch { /* 못 적어도 받기는 그대로 */ }
  // 쓸 만한 메시지가 하나도 없으면(모두 깨짐) 받아 둔 것을 그대로 — 지우지 않는다 (🔍 Codex 95차 #2)
  if (!next.length) return false;
  const before = JSON.stringify(msgsOf(load(KEY.cache, [])));
  save(KEY.cache, next);
  return JSON.stringify(next) !== before;
}

/** 과목 고르기 맨 위 칸 — 없으면 만든다(index.html을 고치지 않게) · "오늘은 무엇을 공부할까?" 바로 위 */
export function letterBox(doc = document) {
  let box = doc.getElementById('home-letter');
  if (box) return box;
  const main = doc.querySelector('#view-home .home-main');
  if (!main) return null;
  box = doc.createElement('div');
  box.id = 'home-letter';
  main.insertBefore(box, main.firstChild);
  return box;
}

/** 칸 그리기 — 안 읽은 맨 앞 하나 · 다 읽었으면 [💌 지난 말 보기] · 받은 말이 없으면 비움 */
export function renderLetter(box) {
  if (!box) return;
  wire(box);
  const msgs = allMsgs();
  const un = unreadOf(msgs, seenAll());
  box.innerHTML = un.length ? letterHtml(un[0]) : msgs.length ? '<button type="button" class="btn letter-past letter-chip">💌 지난 말 보기</button>' : '';
}

/** 누르기 — 한 번만 붙인다 (칸 안을 다시 그려도 그대로) */
function wire(box) {
  if (box.dataset.wired) return;
  box.dataset.wired = '1';
  box.addEventListener('click', (e) => {
    const b = e.target && e.target.closest ? e.target.closest('button') : null;
    if (!b) return;
    if (b.classList.contains('letter-ok')) {
      const card = b.closest('.letter');
      const id = card && card.dataset.id;
      if (id) {
        const next = markSeen(seenAll(), id, Date.now(), allMsgs());
        if (!save(KEY.seen, next)) memSeen = next;
      }
      renderLetter(box);
    } else if (b.classList.contains('letter-past')) {
      box.innerHTML = pastHtml(allMsgs());
    } else if (b.classList.contains('letter-close')) {
      renderLetter(box);
    }
  });
}

/** 홈에 올 때 — 가진 것으로 바로 그리고, 받아서 바뀌었으면 다시 (받기를 기다리느라 홈이 늦지 않게) */
export async function refreshLetter(box) {
  renderLetter(box);
  let changed = false;
  try { changed = await syncFamily(); } catch { changed = false; }
  if (changed) renderLetter(box);
}

/** 📊 💌 한 줄 쓰기 — 이 기기 목록에 더한다 → { ok: true, msg } · { ok: false, why: 'empty'(빈 글·모르는 사람) | 'save'(이 기기에 못 씀) } */
export function addLocal(from, text) {
  const m = localMsg(from, text, Date.now());
  if (!m) return { ok: false, why: 'empty' };
  if (!save(KEY.local, msgsOf(load(KEY.local, []), [m]))) return { ok: false, why: 'save' };
  return { ok: true, msg: m };
}
/** 읽은 표시 (📊 보낸 말 목록) */
export function seenNow() {
  return seenAll();
}
/** 📤 family/read.md */
export function familyReadMd(today) {
  // 받은 말이 없는 기기는 안 올린다 — 다른 기기가 올린 "읽음"을 "받은 말 없음"으로 덮지 않게 (🔍 Codex 95차 #3)
  const msgs = allMsgs();
  return msgs.length ? readMd(msgs, seenAll(), today) : '';
}
