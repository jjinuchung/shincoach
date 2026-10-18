// 💌 아빠·엄마 한 줄 메시지 (2026-10-18, 아버님 "이대로 진행") — 규칙·글자 (순수 · DOM 없음 → node에서 시안 페이지도 이것으로)
// 두 길로 온다: ① 아버님이 Claude에게 말하면 비공개 저장소 family/messages.json(배포 필요 없음 · 📤 열쇠로 받는다)
//              ② 집에 계실 때 📊(비밀번호 뒤)의 "💌 한 줄 쓰기" — 이 기기에만
// 진우 홈(과목 고르기) 맨 위에 💌 카드 하나 — 오래된 것부터 하나씩, [💗 고마워요]를 누르면 읽음(이 기기에 시각) · 지난 말 보기(최근 MSG_SHOW개)
// 보상 없음 · 글은 글자로만(escape) · 한 메시지 MSG_LEN자 · 아이 화면에 셈 말 없음
// 읽은 시각은 📤 family/read.md로 — 아버님께 "읽었어요"를 알려 드린다

/** 비공개 저장소 경로 · 한 메시지 글자 수 · 지난 말 보기 수 · 남겨 둘 수 */
export const MSG_PATH = 'family/messages.json';
export const MSG_LEN = 80;
export const MSG_SHOW = 20;
const MSG_KEEP = 60;
/** 보내는 사람 */
export const FROM = { 아빠: '👨', 엄마: '👩' };

const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
/** 그 객체 자신의 칸만 — 'toString' 같은 이름이 물려받은 칸으로 읽히지 않게 (🔍 Codex 95차 #5) */
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const p2 = (n) => String(n).padStart(2, '0');

/** 메시지 하나 고쳐 읽기 (순수) — { id, from, text, at(ms) } · 꼴이 틀리면 null · 글은 줄바꿈·제어 글자 없이 앞뒤 빈칸 없이 MSG_LEN자까지 */
export function msgOf(raw) {
  if (!isObj(raw)) return null;
  const id = typeof raw.id === 'string' && /^[\w-]{1,40}$/.test(raw.id) ? raw.id : '';
  const from = Object.prototype.hasOwnProperty.call(FROM, raw.from) ? raw.from : '';
  // eslint-disable-next-line no-control-regex
  const text = typeof raw.text === 'string' ? Array.from(raw.text.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, MSG_LEN).join('') : '';
  const at = Number.isSafeInteger(raw.at) && raw.at > 0 ? raw.at : typeof raw.at === 'string' ? Date.parse(raw.at.replace(' ', 'T')) : NaN;
  if (!id || !from || !text || !(at > 0)) return null;
  return { id, from, text, at };
}
/** 메시지 목록 (순수) — 깨진 것은 버리고 · 같은 id는 한 번(먼저 온 것) · 보낸 시각 차례(같으면 id) · 최근 MSG_KEEP개 */
export function msgsOf(...lists) {
  const by = new Map();
  for (const list of lists) for (const raw of Array.isArray(list) ? list : []) {
    const m = msgOf(raw);
    if (m && !by.has(m.id)) by.set(m.id, m);
  }
  return [...by.values()].sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : 1)).slice(-MSG_KEEP);
}
/** 읽은 표시 고쳐 읽기 (순수) — { id: 읽은 시각(ms) } */
export function seenOf(raw) {
  const out = {};
  if (!isObj(raw)) return out;
  for (const [k, v] of Object.entries(raw)) if (/^[\w-]{1,40}$/.test(k) && Number.isSafeInteger(v) && v > 0) out[k] = v;
  return out;
}
/** 아직 안 읽은 것 (순수) — 오래된 것부터 */
export function unreadOf(msgs, seen) {
  const s = seenOf(seen);
  return msgs.filter((m) => !own(s, m.id));
}
/** 읽음 표시 (순수 — 새 객체) · 이 기기 표시가 끝없이 늘지 않게 지금 목록에 있는 것만 남긴다 */
export function markSeen(seen, id, now, msgs) {
  const s = seenOf(seen);
  if (!own(s, id)) s[id] = now;
  const keep = new Set((msgs || []).map((m) => m.id));
  if (keep.size) for (const k of Object.keys(s)) if (!keep.has(k)) delete s[k];
  return s;
}
/** 📊 "💌 한 줄 쓰기" — 이 기기 메시지 하나 (순수) → 메시지 또는 null(빈 글·모르는 사람) */
export function localMsg(from, text, now) {
  return msgOf({ id: `l${now}`, from, text, at: now });
}

/** 보낸 때 — '10/18 저녁' (아이 화면 · 지역 시각) */
export function whenOf(at) {
  const d = new Date(at);
  const h = d.getHours();
  const part = h < 5 ? '밤' : h < 12 ? '아침' : h < 17 ? '낮' : h < 21 ? '저녁' : '밤';
  return `${d.getMonth() + 1}/${d.getDate()} ${part}`;
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** 💌 카드 HTML (순수 글자) — 안 읽은 맨 앞 하나 · 단추 [💗 고마워요] · 지난 말 보기 (안 읽은 게 없으면 '') */
export function letterHtml(m) {
  if (!m) return '';
  return `<section class="letter" data-id="${esc(m.id)}" aria-label="${esc(m.from)}가 보낸 말">`
    + `<p class="letter-from">💌 ${esc(m.from)}가 보낸 말 <span>${esc(FROM[m.from])} ${esc(whenOf(m.at))}</span></p>`
    + `<p class="letter-text">${esc(m.text)}</p>`
    + '<div class="letter-foot"><button type="button" class="btn btn-primary letter-ok">💗 고마워요</button><button type="button" class="btn letter-past">💌 지난 말 보기</button></div>'
    + '</section>';
}
/** 💌 지난 말 목록 HTML (순수 글자) — 최근 MSG_SHOW개, 새것부터 */
export function pastHtml(msgs) {
  const list = msgs.slice(-MSG_SHOW).reverse();
  if (!list.length) return '<section class="letter-past-box"><p class="letter-empty">아직 받은 말이 없어요</p></section>';
  return `<section class="letter-past-box" aria-label="지난 말"><p class="letter-from">💌 지난 말</p><ul class="letter-list">${list.map((m) => `<li><span class="letter-who">${esc(FROM[m.from])} ${esc(m.from)} · ${esc(whenOf(m.at))}</span>${esc(m.text)}</li>`).join('')}</ul><button type="button" class="btn letter-close">닫기</button></section>`;
}

/** 📤 family/read.md (순수) — 아버님께: 무엇이 왔고 언제 읽었나 (비공개 저장소에만) */
export function readMd(msgs, seen, today) {
  const s = seenOf(seen);
  const fmt = (t) => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()} ${p2(d.getHours())}:${p2(d.getMinutes())}`; };
  // 이 기기(태블릿)에서 [💗 고마워요]를 누른 때 — 다른 기기에서 읽은 것은 모른다 (🔍 Codex 95차 #3)
  const out = [`# 💌 한 줄 메시지 — 읽었나 (${today} · 이 기기 기준 — [💗 고마워요]를 누른 때)`, ''];
  if (!msgs.length) out.push('(받은 말 없음)');
  for (const m of msgs.slice(-MSG_SHOW)) out.push(`- ${fmt(m.at)} ${FROM[m.from]} ${m.from}${m.id.startsWith('l') ? '(태블릿에서)' : ''}: "${m.text}" — ${own(s, m.id) ? `💗 읽음 ${fmt(s[m.id])}` : '아직'}`);
  return out.join('\n') + '\n';
}
