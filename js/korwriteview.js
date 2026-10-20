// ✍️ 국어 서술형 화면 — 끝 카드의 "생각 쓰기" · 📬 아빠 답장 보기 · 비공개 저장소 답장 받기 (v237, 규칙은 korwrite.js)
// koreanview를 import하지 않는다(돌고 돈다) — 필요한 것은 ctx로 받는다: { main, cards, back, rerender }
// · 아이 글·답장은 늘 textContent로 그린다(innerHTML 금지 — 글에 <img …>가 있어도 글자로, Codex 51차 PART 3 #7)
// · 쓰던 글은 이 기기에 남긴다(다른 화면을 다녀와도·다시 그려도) — 한글 입력 중에는 자르지 않고, 보낼 때만 글자 수를 본다
// · 📬 답장은 화면에 실제로 보였을 때만 "읽음"(watchSeen — Codex 52차 #9: 그리기만 해도 읽음이 되어, 끝 카드 아래로 밀린 답장을 못 보고 나가도 📬가 사라졌다)
// · 생각 쓰기 도우미(v240): 🧩 문장 틀(늘 글 끝에 — 빈자리를 채운 뒤 커서가 문장 가운데 있어도, ~ 자리에 커서) · 🔢 글 번호 ①…(커서 자리에) · ✔️ 보내기 전 스스로 확인(채점·막기·저장 없음)
// · 🖊️ 논술 짧은 글(v304)도 이 칸을 쓴다 — 쓰기 칸만 ctx.form(칸마다 머리말 채우기)·말은 ctx.words로 바꾸고, 답장·기다림·다시 쓰기·읽음은 그대로
import { korWritesMap, korWriteAdd, korWriteRead, korWriteApply } from './xp.js';
import { cardWriteState, unreadReplies, replyStats, rowsOfFams, writeCheck, textLen, ownLen, questionOf, GRADES, WRITE_MIN, WRITE_MAX, WRITE_COINS, FRAME_GAP, OWN_MIN } from './korwrite.js';
import { circled, lineCount, validCards } from './korean.js';
import { nonsulWriteCards } from './nonsul.js';

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

/** 답장 기다리는 글의 판이 이 기기 원고에 없을 때 물음 자리에 (Codex 56차 — 지금 물음을 대신 보이면 다른 물음의 답처럼 보인다) */
export const NO_EDITION_Q = '이 글을 쓸 때의 물음은 앱이 새로워지면 다시 보여요.';

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

/**
 * 글 상태 줄 (순수) — 짧음·김·틀만·괜찮음 (frames = 그 카드의 🧩 틀 — 틀·번호·문장부호를 뺀 내 말이 OWN_MIN자)
 * 글자 수 숫자는 띄우지 않는다 (v304 Codex 110차 #3 — 아이 화면에 셈 없이, 2026-10-15) · 상한·하한은 규칙(writeCheck)이 그대로 본다
 */
export function countLine(text, frames) {
  const n = textLen(text);
  if (n > WRITE_MAX) return { text: '글이 조금 길어요 — 조금 줄여 볼까요?', ok: false, warn: true };
  if (n < WRITE_MIN) return { text: n ? '조금만 더 써 볼까요?' : '한두 문장이면 돼요', ok: false, warn: false };
  if (ownLen(text, frames) < OWN_MIN) return { text: '틀 말고 내 말을 조금 더 써 볼까요?', ok: false, warn: false };
  return { text: '✉️ 보낼 수 있어요', ok: true, warn: false };
}
/**
 * 🧩 틀·🔢 번호 끼워 넣기 (순수) — 고른 곳(없으면 커서 자리)을 piece로 바꾼다 · 앞이 글자면 빈칸 하나 · piece의 첫 ~ 자리에 커서(없으면 끝)
 * 뒤가 글자면 빈칸 하나 — glue(🔢 번호)면 안 띄운다: 틀 "~에서 …"의 빈자리에 ⑤를 넣으면 "⑤에서"
 * @returns {{ value: string, caret: number }}
 */
export function insertAt(value, start, end, piece, glue = false) {
  const v = String(value || '');
  const at = (x, lo) => Math.min(v.length, Math.max(lo, Number.isInteger(x) ? x : v.length));
  const s = at(start, 0);
  const e = at(end, s);
  const p = String(piece || '');
  const k = p.indexOf(FRAME_GAP);
  const head = k < 0 ? p : p.slice(0, k);
  const tail = k < 0 ? '' : p.slice(k + FRAME_GAP.length);
  const before = v.slice(0, s);
  const after = v.slice(e);
  const pre = before && !/\s$/.test(before) ? ' ' : '';
  const post = !glue && after && !/^\s/.test(after) ? ' ' : '';
  return { value: `${before}${pre}${head}${tail}${post}${after}`, caret: s + pre.length + head.length };
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
    short: '조금만 더 써 볼까요?',
    own: '틀 말고 내 말을 조금 더 써 볼까요?',
    long: '글이 조금 길어요 — 조금 줄여 볼까요?',
    unknown: '이 글에는 생각 쓰기가 없어요',
  })[r.why] || '저장을 못 했어요 — 한 번 더 눌러 주세요 (쓴 글은 그대로 있어요)';
}

/** 버튼 줄 하나 — 머리 말 + 버튼들 (누르면 put(그 항목)) */
function helpRow(cls, head, items, put) {
  const row = el('div', `kor-whelp ${cls}`);
  row.setAttribute('role', 'group');
  row.setAttribute('aria-label', head);
  row.appendChild(el('p', 'kor-wlabel', head));
  const btns = el('div', 'kor-whbtns');
  for (const it of items) {
    const b = el('button', 'kor-whbtn', it.label);
    b.type = 'button';
    if (it.title) { b.title = it.title; b.setAttribute('aria-label', it.title); }
    b.addEventListener('click', () => put(it));
    btns.appendChild(b);
  }
  row.appendChild(btns);
  return row;
}
/** ✔️ 보내기 전 스스로 확인 — 아이가 제 글을 다시 읽으며 누르는 칸 (채점도·막기도·저장도 안 한다) */
function checksEl(card) {
  const box = el('fieldset', 'kor-wchk');
  box.appendChild(el('legend', 'kor-wlabel', '✔️ 보내기 전에 내 글을 다시 읽어 봐요'));
  card.write.checks.forEach((c, k) => {
    const lab = el('label', 'kor-wchk-row');
    const cb = el('input');
    cb.type = 'checkbox';
    cb.id = `kor-wchk-${card.id}-${k}`;
    lab.appendChild(cb);
    lab.appendChild(el('span', '', c));
    box.appendChild(lab);
  });
  return box;
}

/** 쓰기 칸 — 보내면 onSent() */
function formEl(card, ctx, onSent) {
  const st = cardWriteState(korWritesMap(), card.id);
  const frames = card.write.frames;
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
  // 🧩 틀은 늘 끝에(빈자리를 채우면 커서는 "…이해된다|고 생각해요." 가운데 — 다음 틀이 문장 한가운데 끼지 않게)
  // 🔢 번호는 커서 자리에 — 단 커서를 한 번도 안 놓았으면 끝에(그리기 전에 값을 넣은 칸의 커서 자리는 브라우저마다 다르다)
  let touched = false;
  ta.addEventListener('focus', () => { touched = true; });
  const put = (it) => {
    if (ta.readOnly) return; // 보내는 중
    const end = ta.value.length;
    const here = touched && !it.atEnd;
    const r = insertAt(ta.value, here ? ta.selectionStart : end, here ? ta.selectionEnd : end, it.piece, it.glue);
    ta.value = r.value;
    ta.focus();
    ta.setSelectionRange(r.caret, r.caret);
    setDraft(card.id, ta.value);
    msg.textContent = ''; // 못 보낸 까닭은 글을 고치면 지운다
    paint();
  };
  if (Array.isArray(frames) && frames.length) {
    box.appendChild(helpRow('kor-wframes', '🧩 이렇게 써 볼까요? 누르면 내 글 끝에 붙어요', frames.map((f) => ({ label: f, piece: f, atEnd: true })), put));
  }
  box.appendChild(ta);
  const n = lineCount(card);
  if (n > 0) {
    const nums = Array.from({ length: n }, (_, i) => ({ label: circled(i + 1), piece: circled(i + 1), glue: true, title: `${i + 1}번 문장 번호 넣기` }));
    box.appendChild(helpRow('kor-wnums', '🔢 글 번호 넣기', nums, put));
  }
  const count = el('p', 'kor-wcount');
  count.setAttribute('aria-live', 'polite');
  box.appendChild(count);
  const reward = rewardLine(st.paid);
  if (reward) box.appendChild(el('p', 'kor-wreward', reward));
  if (Array.isArray(card.write.checks) && card.write.checks.length) box.appendChild(checksEl(card));
  const send = el('button', 'btn btn-primary kor-wsend', '✉️ 아빠에게 보내기');
  send.type = 'button';
  box.appendChild(send);
  const msg = el('p', 'kor-wmsg');
  msg.setAttribute('role', 'status');
  box.appendChild(msg);
  const paint = () => {
    const c = countLine(ta.value, frames);
    count.textContent = c.text;
    count.classList.toggle('is-warn', c.warn);
    send.disabled = !c.ok;
  };
  ta.addEventListener('input', () => { setDraft(card.id, ta.value); msg.textContent = ''; paint(); });
  paint();
  send.addEventListener('click', async () => {
    const chk = writeCheck(ta.value, frames);
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
/** 보임을 다시 재는 칸 — 5%마다(키 큰 답장 상자는 화면의 40% 경계가 칸 사이에 있어 넘나들어도 못 들었다, Codex 53차 #3) */
export const SEEN_STEPS = Array.from({ length: 21 }, (_, i) => i / 20);
/**
 * 답장 상자가 보인 채로 READ_DWELL_MS 머물면 onSeen() 한 번 — 스쳐 지나가거나·다른 화면으로 가거나·앱을 내리면 그대로(다시 보일 때 처음부터 또 잰다)
 * · 앱을 내리면(visibilitychange) 재던 시간을 끊고, 돌아와서 보이면 처음부터 (Codex 53차 #3: 내렸다 돌아온 시간까지 세어 0.1초 보고 읽음이 됐다)
 * · 시간이 다 되면 상자 자리를 한 번 더 잰다(관찰 칸 사이에서 화면 밖으로 밀렸을 수 있다)
 * @param {{isConnected:boolean, getBoundingClientRect?:Function}} box 답장 상자
 * @param {() => void} onSeen 읽음으로 적기 (못 적으면 다음에 또 📬)
 * @param {object} [g] 테스트용 — IntersectionObserver·setTimeout·clearTimeout·document·innerHeight (안 주면 이 창)
 */
export function watchSeen(box, onSeen, g = globalThis) {
  const doc = g.document;
  const hidden = () => !!doc && doc.visibilityState === 'hidden';
  if (typeof g.IntersectionObserver !== 'function') { // 아주 옛 브라우저 — 붙은 뒤 머물면
    g.setTimeout(() => { if (box.isConnected && !hidden()) onSeen(); }, READ_DWELL_MS);
    return;
  }
  const listen = !!doc && typeof doc.addEventListener === 'function';
  let timer = 0;
  let ok = false; // 마지막으로 잰 "보였다"
  let done = false;
  let io = null;
  // 지금 보이나 — 상자 자리를 잴 수 있으면 다시 잰다(못 재면 마지막 관찰대로)
  const seenNow = () => {
    if (typeof box.getBoundingClientRect !== 'function') return ok;
    const r = box.getBoundingClientRect();
    const vh = g.innerHeight;
    return seenEnough(Math.min(r.bottom, vh) - Math.max(r.top, 0), r.height, vh);
  };
  const stop = () => {
    done = true;
    g.clearTimeout(timer);
    if (io) io.disconnect();
    if (listen) doc.removeEventListener('visibilitychange', onVis);
  };
  const arm = () => {
    g.clearTimeout(timer);
    if (done || !ok || hidden()) return;
    timer = g.setTimeout(() => {
      if (done) return;
      if (!box.isConnected) { stop(); return; }
      if (hidden()) return; // 내린 채로 시간이 다 됨 — 돌아오면(onVis) 다시 잰다
      if (!seenNow()) { ok = false; return; } // 관찰 칸 사이에서 밀려났다 — 다시 보일 때(스크롤) 또 잰다
      stop();
      onSeen();
    }, READ_DWELL_MS);
  };
  function onVis() {
    if (done) return;
    if (!box.isConnected) { stop(); return; }
    if (hidden()) { g.clearTimeout(timer); return; } // 내리면 끊는다 — 돌아오면 처음부터
    ok = seenNow();
    arm();
  }
  io = new g.IntersectionObserver((entries) => {
    if (done) return;
    if (!box.isConnected) { stop(); return; }
    const en = entries[entries.length - 1];
    ok = seenEnough(en.intersectionRect.height, en.boundingClientRect.height, g.innerHeight);
    arm();
  }, { threshold: SEEN_STEPS });
  io.observe(box);
  if (listen) doc.addEventListener('visibilitychange', onVis);
}

/** 칸의 말 — 📚 국어 카드(기본) · 🖊️ 논술 짧은 글은 ctx.words로 바꾼다 (v304) */
export const WRITE_WORDS = {
  label: '생각 쓰기',
  head: '✍️ 생각 쓰기',
  wait: '✉️ 아빠에게 보낸 글이에요 — 답장을 기다리고 있어요. 다른 글을 읽어도 돼요.',
  done: '✅ 이 생각 쓰기는 끝! 잘했어요',
  where: '📚 도감 위에',
};

/**
 * ✍️ 카드의 생각 쓰기 칸 — 상태에 따라: 쓰기 · 답장 기다림 · 답장(🔸·🔁면 다시 써 보기) · ✅ 끝
 * 답장은 안 읽은 것을 모두 보인다(병합으로 앞 글의 답장이 따로 있어도 — Codex 52차 #4) · 보통은 하나
 * @param {object} card write가 있는 카드
 * @param {{cards:Function, form?:Function, words?:object}} ctx form(card, ctx, onSent) = 쓰기 칸을 바꿀 때(🖊️ 논술) · words = WRITE_WORDS 중 바꿀 말
 */
export function writeBoxEl(card, ctx) {
  const W = { ...WRITE_WORDS, ...(ctx.words || {}) };
  const form = (onSent) => (typeof ctx.form === 'function' ? ctx.form(card, ctx, onSent) : formEl(card, ctx, onSent));
  const sec = el('section', 'kor-write');
  sec.setAttribute('aria-label', W.label);
  const draw = (note) => {
    sec.textContent = '';
    const st = cardWriteState(korWritesMap(), card.id);
    sec.appendChild(el('h3', 'kor-wh', W.head));
    if (note) sec.appendChild(el('p', 'kor-wnote', note));
    const dated = st.shown.length + st.pendings.length > 1; // 글이 둘 이상 보이면 어느 글인지 날짜
    for (const e of st.shown) {
      const r = replyEl(e, dated);
      sec.appendChild(r);
      if (!e.read) watchSeen(r, () => { korWriteRead(card.id, e.id).catch(() => {}); }); // 읽음은 보였을 때
    }
    if (st.pendings.length) {
      // 물음은 그 글을 쓴 판의 것 — 원고를 고친 뒤에도 진우가 답한 물음이 보이게 (Codex 52차 #8)
      // 이 기기 원고에 그 판이 없으면(다른 기기가 새 판으로 쓴 글이 병합으로 옴) 지금 물음을 대신 보이지 않는다 (Codex 56차)
      const qs = st.pendings.map((p) => { const ed = questionOf(card.write, p.v); return ed ? ed.q : NO_EDITION_Q; });
      sec.appendChild(el('p', 'kor-wq-text', qs[0]));
      sec.appendChild(el('p', 'kor-wwait', W.wait));
      st.pendings.forEach((p, k) => {
        const mine = el('div', 'kor-wmine');
        if (k > 0 && qs[k] !== qs[0]) mine.appendChild(el('p', 'kor-wq-text', qs[k])); // 판이 다른 글(두 기기)
        if (dated) { const d = new Date(p.at); mine.appendChild(el('p', 'kor-wlabel', `📝 ${d.getMonth() + 1}/${d.getDate()}에 쓴 글`)); }
        mine.appendChild(el('p', 'kor-wbody', p.text));
        sec.appendChild(mine);
      });
      return;
    }
    if (st.done) { sec.appendChild(el('p', 'kor-wdone', W.done)); return; }
    if (st.lastGraded) {
      const again = el('button', 'btn kor-wagain', '✍️ 다시 써 보기');
      again.type = 'button';
      again.addEventListener('click', () => { again.replaceWith(form(onSent)); const t = sec.querySelector('textarea'); if (t) t.focus(); });
      sec.appendChild(again);
      return;
    }
    sec.appendChild(form(onSent));
  };
  const onSent = (r) => draw(`✉️ 보냈어요!${r.coins ? ` 💰 +${r.coins}` : ''} 아빠 답장이 오면 ${W.where} 📬가 떠요.`);
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

// ── 서술형 카드 — 📚 국어 카드(reading.json) + 🖊️ 논술 주제(nonsul.json) (v304: 같은 장부·같은 답장 파일) ──
const famCache = { K: null, N: null };
const FAM_URL = { K: './coach/korean/reading.json', N: './coach/korean/nonsul.json' };
/** 한 원고의 카드 — 받으면 이 기기 메모리에 두고 다시 쓴다 · 못 받으면 null(다음에 다시) */
async function famCards(fam) {
  if (famCache[fam]) return famCache[fam];
  try {
    const res = await fetch(FAM_URL[fam]);
    if (!res.ok) throw new Error(String(res.status));
    const json = await res.json();
    const cards = fam === 'K' ? validCards(json) : nonsulWriteCards(json);
    if (!cards.length) return null;
    famCache[fam] = cards;
    return cards;
  } catch {
    return null;
  }
}
/**
 * 답장 붙이기에 넘길 카드 — 그 화면이 이미 받은 카드(given)에 다른 원고의 카드를 더한다 · fams = 카드를 가진 원고(K·N)
 * (한 화면의 카드만 넘기면 다른 원고의 답장이 "서술형이 있는 카드가 아님"으로 📊에 ⚠️가 떴다)
 */
export async function writeCardsNow(given) {
  const cards = (Array.isArray(given) ? given : []).filter((c) => c && typeof c.id === 'string');
  const fams = new Set(cards.map((c) => c.id[0]));
  for (const fam of ['K', 'N']) {
    if (fams.has(fam)) continue;
    const more = await famCards(fam);
    if (more) { cards.push(...more); fams.add(fam); }
  }
  return { cards, fams };
}

// ── 📥 비공개 저장소의 답장 받기 ──
let syncing = null;
/**
 * 📥 korean/replies.json → 그 글에 한 번만 붙이고 보상 (한 트랜잭션) · 열쇠가 없거나 못 받으면 조용히 그대로
 * 붙인 뒤 📊 받기 줄에 "받지 않은 줄 · 맞는 글 없음" 수를 적는다(글은 안 적는다 — Codex 52차 #5: 줄 수만 보고 다 받은 줄 알았다)
 * 국어·논술 어느 화면에서 불러도 두 원고의 카드를 함께 — 이번에 못 받은 원고의 줄은 빼고 다음에(rowsOfFams, v304)
 * @param {Array} given 그 화면이 가진 카드
 * @returns {Promise<{ok:boolean, coins?:number, stone?:number, applied?:Array}>}
 */
export function syncWrites(given) {
  if (syncing) return syncing;
  syncing = (async () => {
    const { readPrivateList, noteReadCheck, PRIVATE_KOR_REPLIES } = await import('./upload.js');
    const raw = await readPrivateList(PRIVATE_KOR_REPLIES);
    if (!raw.length) return { ok: false };
    const { cards, fams } = await writeCardsNow(given);
    const list = rowsOfFams(raw, fams);
    if (!list.length) return { ok: false }; // 모두 못 받은 원고의 줄 — 📊 받기 줄은 그대로 두고 다음에
    const r = await korWriteApply(list, cards);
    noteReadCheck(PRIVATE_KOR_REPLIES, replyStats(korWritesMap(), list, cards));
    return r;
  })().catch(() => ({ ok: false })).finally(() => { syncing = null; });
  return syncing;
}
/** 답장이 붙었을 때 도감 위 한 줄 (순수) — fam('K'·'N')을 주면 그 원고의 답장만 세고 보상도 그만큼 (국어 화면에 논술 답장 수가 섞이지 않게, v304) */
export function appliedLine(r, fam) {
  if (!r || !r.ok || !r.applied || !r.applied.length) return '';
  const mine = fam ? r.applied.filter((a) => a && String(a.card).startsWith(fam)) : r.applied;
  if (!mine.length) return '';
  const coins = fam ? mine.reduce((s, a) => s + (Number(a.coins) || 0), 0) : r.coins;
  const stone = fam ? mine.reduce((s, a) => s + (Number(a.stone) || 0), 0) : r.stone;
  const gain = [coins ? `💰 +${coins}` : '', stone ? `🟩 국어스톤 +${stone}` : ''].filter(Boolean).join(' · ');
  return `📬 아빠 답장이 ${mine.length}개 왔어요${gain ? ` — ${gain}` : ''}`;
}
