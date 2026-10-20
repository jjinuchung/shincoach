// ✍️ 🖊️ 논술 짧은 글 쓰기 칸 (v304, 2026-10-20 — 아버님 물음 넷 모두 추천안) — 칸마다 머리말(나는 · 왜냐하면 · 또 · 물론 · 그래도 나는) 뒤를 채운다
// 규칙은 nonsul.js(composeEssay·essayCheck) · 보내기·답장·기다림·다시 쓰기·읽음·보상은 국어 ✍️와 같다(korwriteview.writeBoxEl에 ctx.form으로 이 칸만 바꿔 끼운다)
// · 아이 글은 늘 textContent로 그린다(innerHTML 금지) · 쓰던 칸은 이 기기에 남긴다(다른 화면을 다녀와도) · 보낼 때만 글자 수를 본다
import { korWritesMap, korWriteAdd } from './xp.js';
import { cardWriteState } from './korwrite.js';
import { rewardLine, sendWhy } from './korwriteview.js';
import { ESSAY_HEADS, composeEssay, essayCheck } from './nonsul.js';

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

/** 🖊️ 논술 칸에 건네는 korwriteview.writeBoxEl 말 */
export const ESSAY_WORDS = {
  label: '내 말로 짧은 글',
  head: '✍️ 내 말로 짧은 글',
  wait: '✉️ 아빠에게 보낸 글이에요 — 답장을 기다리고 있어요. 다른 주제를 해도 돼요.',
  done: '✅ 이 주제 짧은 글은 끝! 잘했어요',
  where: '🖊️ 논술 첫 화면에',
};

// ── 쓰던 칸 (이 기기에만 — 아이 편의, 못 쓰면 메모리에만) ──
const DRAFT_KEY = (id) => `shincoach.nonsulDraft.${id}`;
const drafts = new Map();
const KEYS = ESSAY_HEADS.map((h) => h.k);
/** 저장된 칸 고쳐 읽기 — 칸 이름만 · 글만 */
function cleanDraft(o) {
  const out = {};
  if (o && typeof o === 'object') for (const k of KEYS) if (typeof o[k] === 'string' && o[k]) out[k] = o[k];
  return out;
}
function getDraft(id) {
  if (drafts.has(id)) return { ...drafts.get(id) };
  try { return cleanDraft(JSON.parse(localStorage.getItem(DRAFT_KEY(id)) || '{}')); } catch { return {}; }
}
function setDraft(id, fields) {
  const f = cleanDraft(fields);
  drafts.set(id, f);
  try { if (Object.keys(f).length) localStorage.setItem(DRAFT_KEY(id), JSON.stringify(f)); else localStorage.removeItem(DRAFT_KEY(id)); } catch { /* 이 기기에 못 적어도 메모리에는 */ }
}

/** 글 상태 줄 (순수) — 의견·이유 칸이 비었음 · 김 · 짧음 · 괜찮음 · 글자 수 숫자는 띄우지 않는다(Codex 110차 #3 — 상한 NONSUL_WRITE_MAX는 규칙이 본다) */
export function essayCountLine(fields) {
  const c = essayCheck(fields);
  if (c.ok) return { text: '✉️ 보낼 수 있어요', ok: true, warn: false };
  if (c.why === 'long') return { text: '글이 조금 길어요 — 조금 줄여 볼까요?', ok: false, warn: true };
  if (c.why === 'claim') return { text: '💭 내 의견 칸을 채우면 보낼 수 있어요', ok: false, warn: false };
  if (c.why === 'why') return { text: '💡 이유 칸을 채우면 보낼 수 있어요', ok: false, warn: false };
  return { text: '조금만 더 써 볼까요?', ok: false, warn: false };
}
/** 보내기 결과 말 (순수) — 칸이 빈 것은 논술 말로, 나머지는 국어 ✍️와 같게 */
export function essaySendWhy(r) {
  if (r && r.why === 'claim') return '💭 내 의견 칸을 채워 볼까요?';
  if (r && r.why === 'why') return '💡 이유 칸을 채워 볼까요?';
  if (r && (r.why === 'short' || r.why === 'own')) return '조금만 더 써 볼까요?';
  return sendWhy(r);
}

/**
 * 쓰기 칸 — korwriteview.writeBoxEl의 ctx.form · 보내면 onSent(r)
 * @param {object} card 논술 주제 카드(nonsul.nonsulWriteCards) · @param {{cards:Function}} ctx
 */
export function essayFormEl(card, ctx, onSent) {
  const st = cardWriteState(korWritesMap(), card.id);
  const fields = getDraft(card.id);
  const box = el('div', 'kor-wform ns-wform');
  box.appendChild(el('p', 'kor-wq-text', card.write.q));
  box.appendChild(el('p', 'ns-whint', '판에서 고른 이유를 써도 되고, 내 생각을 써도 돼요. 💭 의견과 💡 이유만 채워도 보낼 수 있어요.'));
  const tas = [];
  for (const h of ESSAY_HEADS) {
    const row = el('div', `ns-wrow ns-w-${h.k}`);
    if (h.label) row.appendChild(el('p', 'kor-wlabel', `${h.icon} ${h.label}`));
    const line = el('div', 'ns-wline');
    const head = el('span', 'ns-whead', h.head);
    head.setAttribute('aria-hidden', 'true');
    line.appendChild(head);
    const ta = el('textarea', 'kor-wtext ns-wtext');
    ta.rows = 2;
    ta.placeholder = h.ph;
    ta.value = fields[h.k] || '';
    ta.setAttribute('aria-label', `${h.label || '이유 하나 더'} — 「${h.head}」 다음을 써요`);
    ta.addEventListener('input', () => { fields[h.k] = ta.value; setDraft(card.id, fields); msg.textContent = ''; paint(); });
    line.appendChild(ta);
    row.appendChild(line);
    box.appendChild(row);
    tas.push(ta);
  }
  const pre = el('div', 'kor-wmine ns-wpreview');
  pre.appendChild(el('p', 'kor-wlabel', '📝 내 글 미리 보기'));
  const preText = el('p', 'kor-wbody');
  pre.appendChild(preText);
  box.appendChild(pre);
  const count = el('p', 'kor-wcount');
  count.setAttribute('aria-live', 'polite');
  box.appendChild(count);
  const reward = rewardLine(st.paid);
  if (reward) box.appendChild(el('p', 'kor-wreward', reward));
  const send = el('button', 'btn btn-primary kor-wsend', '✉️ 아빠에게 보내기');
  send.type = 'button';
  box.appendChild(send);
  const msg = el('p', 'kor-wmsg');
  msg.setAttribute('role', 'status');
  box.appendChild(msg);
  const paint = () => {
    const text = composeEssay(fields);
    preText.textContent = text || '칸을 채우면 여기에 내 글이 보여요';
    pre.classList.toggle('is-empty', !text);
    const c = essayCountLine(fields);
    count.textContent = c.text;
    count.classList.toggle('is-warn', c.warn);
    send.disabled = !c.ok;
  };
  paint();
  const lock = (on) => { for (const t of tas) t.readOnly = on; };
  send.addEventListener('click', async () => {
    const chk = essayCheck(fields);
    if (!chk.ok) { msg.textContent = essaySendWhy(chk); return; }
    send.disabled = true;
    lock(true);
    send.textContent = '보내는 중…';
    let r;
    try { r = await korWriteAdd(card.id, composeEssay(fields), ctx.cards()); } catch { r = null; }
    if (r && r.ok) {
      setDraft(card.id, {});
      onSent(r);
      // 📤 바로 올린다 — 아빠가 "올라온 거 봐 줘" 할 때 Claude가 볼 수 있게 (열쇠가 없거나 못 올려도 아이 화면은 그대로, 다음에 다시)
      import('./upload.js').then((m) => m.sendReport({ force: true })).catch(() => {});
      return;
    }
    lock(false);
    send.textContent = '✉️ 아빠에게 보내기';
    paint();
    msg.textContent = essaySendWhy(r);
  });
  return box;
}
