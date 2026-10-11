// ✍️ 국어 서술형 화면 — 끝 카드의 "생각 쓰기" · 📬 아빠 답장 보기 · 비공개 저장소 답장 받기 (v237, 규칙은 korwrite.js)
// koreanview를 import하지 않는다(돌고 돈다) — 필요한 것은 ctx로 받는다: { main, cards, back, rerender }
// · 아이 글·답장은 늘 textContent로 그린다(innerHTML 금지 — 글에 <img …>가 있어도 글자로, Codex 51차 PART 3 #7)
// · 쓰던 글은 이 기기에 남긴다(다른 화면을 다녀와도·다시 그려도) — 한글 입력 중에는 자르지 않고, 보낼 때만 글자 수를 본다
// · 📬 답장은 화면에 실제로 보였을 때만 "읽음"(watchSeen — Codex 52차 #9: 그리기만 해도 읽음이 되어, 끝 카드 아래로 밀린 답장을 못 보고 나가도 📬가 사라졌다)
import { korWritesMap, korWriteAdd, korWriteRead, korWriteApply } from './xp.js';
import { cardWriteState, unreadReplies, replyStats, writeCheck, textLen, GRADES, WRITE_MIN, WRITE_MAX, WRITE_COINS } from './korwrite.js';

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

// ── 쓰던 글 (이 기기에만 — 아이 편의, 못 쓰면 메모리에만) ──
const DRAFT_KEY = (id) => `shincoach.korDraft.${id}`;
const drafts = new Map();
function getDraft(id) {
  if (drafts.has(id)) return drafts.get(id);
  try { return localStorage.getItem(DRAFT_KEY(id)) || ''; } catch { return ''; }
}
function setDraft(id, text) {
  drafts.set(id, text);
  try { if (text) localStorage.setItem(DRAFT_KEY(id), text); else localStorage.removeItem(DRAFT_KEY(id)); } catch { /* 이 기기에 못 적어도 메모리에는 */ }
}

/** 글자 수 줄 (순수) — 짧음·김·괜찮음 */
export function countLine(text) {
  const n = textLen(text);
  if (n > WRITE_MAX) return { text: `${WRITE_MAX}자까지예요 — 조금 줄여 볼까요? (지금 ${n}자)`, ok: false, warn: true };
  if (n < WRITE_MIN) return { text: n ? `${WRITE_MIN}자는 넘게 써 볼까요? (지금 ${n}자)` : `한두 문장이면 돼요 (${WRITE_MAX}자까지)`, ok: false, warn: false };
  return { text: `${n} / ${WRITE_MAX}자`, ok: true, warn: false };
}
/** 보상 안내 (순수) — 카드마다 평생 한도에서 남은 것 */
export function rewardLine(paid) {
  const p = paid || {};
  const parts = [];
  if (!p.first) parts.push(`처음 보내면 💰${WRITE_COINS.first}`);
  const left = Math.max(0, WRITE_COINS.ok - (Number(p.coins) || 0));
  const okGain = [left ? `💰${left}` : '', p.stone ? '' : '🟩'].filter(Boolean).join(' + ');
  if (okGain) parts.push(`아빠가 ✅를 주면 ${okGain}`);
  return parts.join(' · ');
}
/** 보내기 결과 말 (순수) */
export function sendWhy(r) {
  if (!r) return '저장을 못 했어요 — 한 번 더 눌러 주세요';
  return ({
    pending: '이미 보낸 글이 있어요 — 아빠 답장을 기다려요',
    done: '✅ 이 생각 쓰기는 벌써 끝났어요',
    short: `${WRITE_MIN}자는 넘게 써 볼까요?`,
    long: `${WRITE_MAX}자까지예요 — 조금 줄여 볼까요?`,
    unknown: '이 글에는 생각 쓰기가 없어요',
  })[r.why] || '저장을 못 했어요 — 한 번 더 눌러 주세요 (쓴 글은 그대로 있어요)';
}

/** 쓰기 칸 — 보내면 onSent() */
function formEl(card, ctx, onSent) {
  const st = cardWriteState(korWritesMap(), card.id);
  const box = el('div', 'kor-wform');
  const id = `kor-write-${card.id}`;
  const label = el('label', 'kor-wq-text', card.write.q);
  label.htmlFor = id;
  box.appendChild(label);
  const ta = el('textarea', 'kor-wtext');
  ta.id = id;
  ta.rows = 4;
  ta.placeholder = '내 생각을 한두 문장으로 써 보세요';
  ta.value = getDraft(card.id);
  box.appendChild(ta);
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
    const c = countLine(ta.value);
    count.textContent = c.text;
    count.classList.toggle('is-warn', c.warn);
    send.disabled = !c.ok;
  };
  ta.addEventListener('input', () => { setDraft(card.id, ta.value); paint(); });
  paint();
  send.addEventListener('click', async () => {
    const chk = writeCheck(ta.value);
    if (!chk.ok) { msg.textContent = sendWhy(chk); return; }
    send.disabled = true;
    ta.readOnly = true;
    send.textContent = '보내는 중…';
    let r;
    try { r = await korWriteAdd(card.id, ta.value, ctx.cards()); } catch { r = null; }
    if (r && r.ok) {
      setDraft(card.id, '');
      onSent(r);
      // 📤 바로 올린다 — 아빠가 "국어 답 봐 줘" 할 때 Claude가 볼 수 있게 (열쇠가 없거나 못 올려도 아이 화면은 그대로, 다음에 다시)
      import('./upload.js').then((m) => m.sendReport({ force: true })).catch(() => {});
      return;
    }
    ta.readOnly = false;
    send.textContent = '✉️ 아빠에게 보내기';
    paint();
    msg.textContent = sendWhy(r);
  });
  return box;
}

/** 답장 한 덩이의 머리 줄 (순수) — 답장이 둘 이상 보일 때는 어느 글의 답장인지 날짜를 붙인다 */
export function replyHead(e, dated) {
  const g = GRADES[e.grade];
  const d = new Date(e.at);
  return `📬 아빠 답장${dated ? ` (${d.getMonth() + 1}/${d.getDate()}에 쓴 글)` : ''} · ${g.icon} ${g.ko}`;
}
/** 답장 한 덩이 — 등급 · 내 글 · 아빠 답장 */
function replyEl(e, dated) {
  const box = el('div', `kor-wreply is-${e.grade}`);
  box.appendChild(el('p', 'kor-wgrade', replyHead(e, dated)));
  const mine = el('div', 'kor-wmine');
  mine.appendChild(el('p', 'kor-wlabel', '📝 내가 쓴 글'));
  mine.appendChild(el('p', 'kor-wbody', e.text));
  box.appendChild(mine);
  const dad = el('div', 'kor-wdad');
  dad.appendChild(el('p', 'kor-wlabel', '💬 아빠'));
  for (const para of String(e.reply).split(/\n+/)) if (para.trim()) dad.appendChild(el('p', 'kor-wbody', para.trim()));
  box.appendChild(dad);
  return box;
}

// ── 📬 읽음 = 화면에 보였을 때 ──
/** 답장 상자가 "보였다"고 할 만큼 화면에 들어왔나 (순수) — 보인 높이가 상자의 절반 이상, 상자가 화면보다 크면 화면의 40% 이상 */
export function seenEnough(visibleH, boxH, viewH) {
  if (!(visibleH > 0) || !(boxH > 0)) return false;
  return visibleH >= Math.min(boxH * 0.5, (viewH > 0 ? viewH : boxH) * 0.4);
}
/** 보인 채로 이만큼 머물러야 읽음 (스쳐 지나가면 그대로 📬) */
export const READ_DWELL_MS = 1200;
/**
 * 답장 상자가 보인 채로 READ_DWELL_MS 머물면 onSeen() 한 번 — 스쳐 지나가거나·다른 화면으로 가거나·앱을 내리면 그대로(다시 보일 때 또 잰다)
 * @param {{isConnected:boolean}} box 답장 상자
 * @param {() => void} onSeen 읽음으로 적기 (못 적으면 다음에 또 📬)
 * @param {object} [g] 테스트용 — IntersectionObserver·setTimeout·clearTimeout·document·innerHeight (안 주면 이 창)
 */
export function watchSeen(box, onSeen, g = globalThis) {
  const hidden = () => !!g.document && g.document.visibilityState === 'hidden';
  if (typeof g.IntersectionObserver !== 'function') { // 아주 옛 브라우저 — 붙은 뒤 머물면
    g.setTimeout(() => { if (box.isConnected && !hidden()) onSeen(); }, READ_DWELL_MS);
    return;
  }
  let timer = 0;
  const io = new g.IntersectionObserver((entries) => {
    const en = entries[entries.length - 1];
    g.clearTimeout(timer);
    if (!box.isConnected) { io.disconnect(); return; }
    if (!seenEnough(en.intersectionRect.height, en.boundingClientRect.height, g.innerHeight)) return;
    timer = g.setTimeout(() => {
      if (!box.isConnected) { io.disconnect(); return; }
      if (hidden()) return; // 앱을 내렸다 — 다시 보일 때(스크롤하면) 또 잰다
      io.disconnect();
      onSeen();
    }, READ_DWELL_MS);
  }, { threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.75, 1] });
  io.observe(box);
}

/**
 * ✍️ 카드의 생각 쓰기 칸 — 상태에 따라: 쓰기 · 답장 기다림 · 답장(🔸·🔁면 다시 써 보기) · ✅ 끝
 * 답장은 안 읽은 것을 모두 보인다(병합으로 앞 글의 답장이 따로 있어도 — Codex 52차 #4) · 보통은 하나
 * @param {object} card write가 있는 카드
 * @param {{cards:Function}} ctx
 */
export function writeBoxEl(card, ctx) {
  const sec = el('section', 'kor-write');
  sec.setAttribute('aria-label', '생각 쓰기');
  const draw = (note) => {
    sec.textContent = '';
    const st = cardWriteState(korWritesMap(), card.id);
    sec.appendChild(el('h3', 'kor-wh', '✍️ 생각 쓰기'));
    if (note) sec.appendChild(el('p', 'kor-wnote', note));
    const dated = st.shown.length + st.pendings.length > 1; // 글이 둘 이상 보이면 어느 글인지 날짜
    for (const e of st.shown) {
      const r = replyEl(e, dated);
      sec.appendChild(r);
      if (!e.read) watchSeen(r, () => { korWriteRead(card.id, e.id).catch(() => {}); }); // 읽음은 보였을 때
    }
    if (st.pendings.length) {
      sec.appendChild(el('p', 'kor-wq-text', card.write.q));
      sec.appendChild(el('p', 'kor-wwait', '✉️ 아빠에게 보낸 글이에요 — 답장을 기다리고 있어요. 다른 글을 읽어도 돼요.'));
      for (const p of st.pendings) {
        const mine = el('div', 'kor-wmine');
        if (dated) { const d = new Date(p.at); mine.appendChild(el('p', 'kor-wlabel', `📝 ${d.getMonth() + 1}/${d.getDate()}에 쓴 글`)); }
        mine.appendChild(el('p', 'kor-wbody', p.text));
        sec.appendChild(mine);
      }
      return;
    }
    if (st.done) { sec.appendChild(el('p', 'kor-wdone', '✅ 이 생각 쓰기는 끝! 잘했어요')); return; }
    if (st.lastGraded) {
      const again = el('button', 'btn kor-wagain', '✍️ 다시 써 보기');
      again.type = 'button';
      again.addEventListener('click', () => { again.replaceWith(formEl(card, ctx, onSent)); const t = sec.querySelector('textarea'); if (t) t.focus(); });
      sec.appendChild(again);
      return;
    }
    sec.appendChild(formEl(card, ctx, onSent));
  };
  const onSent = (r) => draw(`✉️ 보냈어요!${r.coins ? ` 💰 +${r.coins}` : ''} 아빠 답장이 오면 📚 도감 위에 📬가 떠요.`);
  draw('');
  return sec;
}

/** 도감 칸 아래 서술형 한 줄 (순수 — 그리기용 상태) — '' 이면 안 붙인다 */
export function slotWriteText(st, hasWrite) {
  if (!hasWrite) return '';
  if (st.unread) return '📬 아빠 답장이 왔어요';
  if (st.pending) return '✉️ 답장 기다리는 중';
  if (st.done) return '✍️ 생각 쓰기 ✅';
  return '';
}

/** 📬 도감 위 띠 — 안 읽은 답장이 있으면 [열어 보기] (첫 것부터) */
export function replyBannerEl(ctx) {
  const list = unreadReplies(korWritesMap()).filter((u) => (ctx.cards() || []).some((c) => c.id === u.card && c.write));
  if (!list.length) return null;
  const b = el('button', 'btn btn-primary kor-wbanner', `📬 아빠가 봐 준 생각 쓰기 ${list.length}개 — 열어 보기`);
  b.type = 'button';
  b.addEventListener('click', () => renderReplyView(list[0].card, ctx));
  return b;
}

/** 📬 답장 화면 — 글을 다시 읽지 않고도 답장을 보고 다시 써 볼 수 있게 */
export function renderReplyView(cardId, ctx) {
  const card = (ctx.cards() || []).find((c) => c.id === cardId && c.write);
  const main = ctx.main();
  if (!card || !main) return;
  if (ctx.open) ctx.open(card.id); // 그동안 목록이 덮지 않게 (koreanview ui.wview)
  main.textContent = '';
  const back = el('button', 'btn kor-back', '← 도감');
  back.type = 'button';
  back.addEventListener('click', () => ctx.back());
  main.appendChild(back);
  const head = el('section', 'kor-head');
  head.appendChild(el('h2', 'kor-h', `${card.icon} 「${card.title}」`));
  main.appendChild(head);
  const box = writeBoxEl(card, ctx);
  main.appendChild(box);
  const h = box.querySelector('.kor-wgrade') || box.querySelector('.kor-wh');
  if (h) { h.tabIndex = -1; h.focus(); }
  window.scrollTo(0, 0);
}

// ── 📥 비공개 저장소의 답장 받기 ──
let syncing = null;
/**
 * 📥 korean/replies.json → 그 글에 한 번만 붙이고 보상 (한 트랜잭션) · 열쇠가 없거나 못 받으면 조용히 그대로
 * 붙인 뒤 📊 받기 줄에 "받지 않은 줄 · 맞는 글 없음" 수를 적는다(글은 안 적는다 — Codex 52차 #5: 줄 수만 보고 다 받은 줄 알았다)
 * @param {Array} cards 지금 있는 카드
 * @returns {Promise<{ok:boolean, coins?:number, stone?:number, applied?:Array}>}
 */
export function syncWrites(cards) {
  if (syncing) return syncing;
  syncing = (async () => {
    const { readPrivateList, noteReadCheck, PRIVATE_KOR_REPLIES } = await import('./upload.js');
    const list = await readPrivateList(PRIVATE_KOR_REPLIES);
    if (!list.length) return { ok: false };
    const r = await korWriteApply(list, cards);
    noteReadCheck(PRIVATE_KOR_REPLIES, replyStats(korWritesMap(), list, cards));
    return r;
  })().catch(() => ({ ok: false })).finally(() => { syncing = null; });
  return syncing;
}
/** 답장이 붙었을 때 도감 위 한 줄 (순수) */
export function appliedLine(r) {
  if (!r || !r.ok || !r.applied || !r.applied.length) return '';
  const gain = [r.coins ? `💰 +${r.coins}` : '', r.stone ? `🟩 국어스톤 +${r.stone}` : ''].filter(Boolean).join(' · ');
  return `📬 아빠 답장이 ${r.applied.length}개 왔어요${gain ? ` — ${gain}` : ''}`;
}
