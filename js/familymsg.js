// 💌 아빠·엄마 한 줄 메시지 (2026-10-18, 아버님 "이대로 진행") — 규칙·글자 (순수 · DOM 없음 → node에서 시안 페이지도 이것으로)
// 두 길로 온다: ① 아버님이 Claude에게 말하면 비공개 저장소 family/messages.json(배포 필요 없음 · 📤 열쇠로 받는다)
//              ② 집에 계실 때 📊(비밀번호 뒤)의 "💌 한 줄 쓰기" — 이 기기에만
// 진우 홈(과목 고르기) 맨 위에 💌 카드 하나 — 오래된 것부터 하나씩, [💗 고마워요]를 누르면 읽음(이 기기에 시각) · 지난 말 보기(최근 MSG_SHOW개)
// 보상 없음 · 글은 글자로만(escape) · 한 메시지 MSG_LEN자 · 아이 화면에 셈 말 없음
// 읽은 시각은 📤 family/read.md로 — 아버님께 "읽었어요"를 알려 드린다
// v415 (2026-11-11 아버님 「추천대로」) — 📮 편지 포켓몬이 보낸 말: { from: 포켓몬 이름, mon: 도감 번호 } · 카드에 그 포켓몬 그림 · [📮 답장하러 가기] ·
//   누가 보낼 수 있는지(편지 포켓몬 · 진우에게 편지가 이미 온 아이)는 보내는 도구가 거른다 — 앱은 이름·번호 꼴만 본다 · 📊 한 줄 쓰기는 아빠·엄마 그대로

/** 비공개 저장소 경로 · 한 메시지 글자 수 · 지난 말 보기 수 · 남겨 둘 수 */
export const MSG_PATH = 'family/messages.json';
export const MSG_LEN = 80;
export const MSG_SHOW = 20;
const MSG_KEEP = 60;
/** 보내는 사람 */
export const FROM = { 아빠: '👨', 엄마: '👩' };
/** 📮 편지 포켓몬이 보낸 말 (v415) — 이름은 한글 1~8자 · 도감 번호 1~1025 · 머리 표시 */
const MON_NAME = /^[가-힣]{1,8}$/;
export const MON_ICON = '📮';

const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
/** 그 객체 자신의 칸만 — 'toString' 같은 이름이 물려받은 칸으로 읽히지 않게 (🔍 Codex 95차 #5) */
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const p2 = (n) => String(n).padStart(2, '0');
const monOf = (v) => (Number.isInteger(v) && v >= 1 && v <= 1025 ? v : 0);

/**
 * 메시지 하나 고쳐 읽기 (순수) — { id, from, text, at(ms) } (📮 포켓몬이면 mon까지) · 꼴이 틀리면 null · 글은 줄바꿈·제어 글자 없이 앞뒤 빈칸 없이 MSG_LEN자까지
 * mon이 맞는 번호면 from은 포켓몬 이름(아빠·엄마는 안 됨) · 아니면 아빠·엄마만
 */
export function msgOf(raw) {
  if (!isObj(raw)) return null;
  const id = typeof raw.id === 'string' && /^[\w-]{1,40}$/.test(raw.id) ? raw.id : '';
  const mon = monOf(raw.mon);
  const name = typeof raw.from === 'string' ? raw.from : '';
  const from = mon ? (MON_NAME.test(name) && !own(FROM, name) ? name : '') : own(FROM, name) ? name : '';
  // eslint-disable-next-line no-control-regex
  const text = typeof raw.text === 'string' ? Array.from(raw.text.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, MSG_LEN).join('') : '';
  const at = Number.isSafeInteger(raw.at) && raw.at > 0 ? raw.at : typeof raw.at === 'string' ? Date.parse(raw.at.replace(' ', 'T')) : NaN;
  if (!id || !from || !text || !(at > 0)) return null;
  return mon ? { id, from, text, at, mon } : { id, from, text, at };
}
/** 보낸 이 표시 — 아빠 👨 · 엄마 👩 · 📮 포켓몬 */
export function iconOf(m) {
  return m && m.mon ? MON_ICON : (m && own(FROM, m.from) ? FROM[m.from] : '');
}
/** 「○○가/이 보낸 말」 — 이름 끝 글자에 받침이 있으면 「이」 (아빠가 · 네오비트가 · 볼비트가 · …) */
export function gaOf(name) {
  const s = String(name || '');
  const c = s.charCodeAt(s.length - 1) - 0xac00;
  return c >= 0 && c < 11172 && c % 28 ? '이' : '가';
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

/**
 * 💌 카드 HTML (순수 글자) — 안 읽은 맨 앞 하나 · 단추 [💗 고마워요] · 지난 말 보기 (안 읽은 게 없으면 '')
 * 📮 포켓몬이 보낸 말(v415)이면 그림 자리(familyview가 그 포켓몬 그림을 넣는다 · 못 넣으면 📮)와 [📮 답장하러 가기]
 */
export function letterHtml(m) {
  if (!m) return '';
  const who = `${esc(m.from)}${gaOf(m.from)} 보낸 말`;
  const text = `<p class="letter-text">${esc(m.text)}</p>`;
  return `<section class="letter${m.mon ? ' is-mon' : ''}" data-id="${esc(m.id)}" aria-label="${who}">`
    + `<p class="letter-from">💌 ${who} <span>${esc(iconOf(m))} ${esc(whenOf(m.at))}</span></p>`
    + (m.mon ? `<div class="letter-row"><span class="letter-mon" data-mon="${m.mon}" aria-hidden="true">${MON_ICON}</span>${text}</div>` : text)
    + '<div class="letter-foot"><button type="button" class="btn btn-primary letter-ok">💗 고마워요</button>'
    + (m.mon ? '<button type="button" class="btn letter-go">📮 답장하러 가기</button>' : '')
    + '<button type="button" class="btn letter-past">💌 지난 말 보기</button></div>'
    + '</section>';
}
/** 💌 지난 말 목록 HTML (순수 글자) — 최근 MSG_SHOW개, 새것부터 */
export function pastHtml(msgs) {
  const list = msgs.slice(-MSG_SHOW).reverse();
  if (!list.length) return '<section class="letter-past-box"><p class="letter-empty">아직 받은 말이 없어요</p></section>';
  return `<section class="letter-past-box" aria-label="지난 말"><p class="letter-from">💌 지난 말</p><ul class="letter-list">${list.map((m) => `<li><span class="letter-who">${esc(iconOf(m))} ${esc(m.from)} · ${esc(whenOf(m.at))}</span>${esc(m.text)}</li>`).join('')}</ul><button type="button" class="btn letter-close">닫기</button></section>`;
}

/** 📤 family/read.md (순수) — 아버님께: 무엇이 왔고 언제 읽었나 (비공개 저장소에만) */
export function readMd(msgs, seen, today) {
  const s = seenOf(seen);
  const fmt = (t) => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()} ${p2(d.getHours())}:${p2(d.getMinutes())}`; };
  // 이 기기(태블릿)에서 [💗 고마워요]·[📮 답장하러 가기]를 누른 때 — 다른 기기에서 읽은 것은 모른다 (🔍 Codex 95차 #3 · 219차 P3-2)
  const out = [`# 💌 한 줄 메시지 — 읽었나 (${today} · 이 기기 기준 — [💗 고마워요] 또는 [📮 답장하러 가기]를 누른 때)`, ''];
  if (!msgs.length) out.push('(받은 말 없음)');
  for (const m of msgs.slice(-MSG_SHOW)) out.push(`- ${fmt(m.at)} ${iconOf(m)} ${m.from}${m.mon ? '(포켓몬 편지)' : ''}${m.id.startsWith('l') ? '(태블릿에서)' : ''}: "${m.text}" — ${own(s, m.id) ? `💗 읽음 ${fmt(s[m.id])}` : '아직'}`);
  return out.join('\n') + '\n';
}
