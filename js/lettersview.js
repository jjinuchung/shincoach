// 📮 포켓몬 편지 화면 (v351, 2026-10-27 — 기본안 「추천대로」 · 원고 30통 「이대로」) — 규칙은 letters.js
// 영어 목록 맨 위 우체통 띠(refreshLetterStrip) · 홈 영어 카드 줄(homeLetterDot) · view-letters(enterLetters)
// · 아이 글·답장 글은 늘 textContent로 그린다(innerHTML 금지) · 봉투 띠엔 숫자를 안 보인다(feedback-no-pressure-counts)
// · 쓰던 글은 이 기기에 남긴다(다른 화면을 다녀와도) · 답장 받기는 기다리는 글이 있을 때만(5분에 한 번 — 우체통을 열면 바로)
// v360 (2026-10-28 아버님 — 기본안 「이대로」): 고친 글(fix)이 있는 답장 = 포켓몬 답장 → ✏️ 고친 글(바뀐 낱말 색) → 문장마다 🔊 듣고 🎤 따라 읽기
//   (3번 해 보면 통과 못 해도 다음 · 🎤 없이는 못 넘김) → 🎁 선물 열기(그때 선물·읽음) · 📒 편지 도감(바인더 · 빈 칸은 실루엣 · 카드를 누르면 주고받은 글)
import { lettersMap, letterStart, letterSeen, letterSend, letterApply, letterRead, letterOpen, getProfileSnapshot, profileReady } from './xp.js';
import { letterNow, letterDot, lettersList, letterCheck, envelopeFill, giftLine, stripText, sayLines, letterReplyStats, GRADE_ICON, giftWaits, fixLines, letterAlbum, normLetter } from './letters.js';
import { characterUrl, ensureArt } from './pokemon.js';
import { readAloud, stopReading, canReadAloud, diffMarks, readSeconds } from './essay.js';
import { runSpeakCheck, releaseMic } from './speak.js';
import { guardStart } from './timeup.js';

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

/** 답장 받기 간격 — 우체통을 열면 이 간격과 상관없이 바로 */
export const SYNC_GAP_MS = 5 * 60 * 1000;
const S = { data: null, list: [], loading: null, lastSync: 0, syncing: null, showView: null, readTok: 0, sayTok: 0, speakStop: null, micUsed: false, album: false, albumMon: 0 };
/** 🎤 한 문장을 몇 번까지 해 보면 다음으로 넘어갈 수 있나 (통과 못 해도 — 에세이와 같게 · 아이 화면엔 숫자를 안 보인다) */
export const SAY_TRIES = 3;

/** 원고 받기 (한 번 — 못 받으면 다음에 다시) */
export function loadLetters() {
  if (S.list.length) return Promise.resolve(S.list);
  if (!S.loading) {
    S.loading = fetch('./coach/english/letters.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { S.data = d; S.list = lettersList(d); return S.list; })
      .catch(() => [])
      .finally(() => { S.loading = null; });
  }
  return S.loading;
}

/** 지금 우체통 */
function nowState() {
  const p = getProfileSnapshot();
  return letterNow(lettersMap(), p.caught, S.list, Date.now());
}

/**
 * 📥 letters/replies.json → 그 글에 한 번만 붙이고 선물 (한 트랜잭션) · 기다리는 글이 없으면 묻지도 않는다 ·
 * 열쇠가 없거나 못 받으면 조용히 그대로 · 원고를 못 받았으면 안 붙인다(편지 포켓몬을 몰라 모든 줄이 「받지 않은 줄」이 되지 않게)
 */
export function syncLetterReplies(force = false) {
  if (S.syncing) return S.syncing;
  if (!force && Date.now() - S.lastSync < SYNC_GAP_MS) return Promise.resolve(false);
  S.syncing = (async () => {
    const list = await loadLetters();
    if (!list.length) return false;
    if (!lettersMap().sent.some((e) => !e.r)) return false;
    S.lastSync = Date.now();
    const { readPrivateList, noteReadCheck, PRIVATE_LETTER_REPLIES } = await import('./upload.js');
    const rows = await readPrivateList(PRIVATE_LETTER_REPLIES);
    if (!rows.length) return false;
    const r = await letterApply(rows, list);
    noteReadCheck(PRIVATE_LETTER_REPLIES, letterReplyStats(lettersMap(), rows, list));
    return !!(r && r.ok);
  })().catch(() => false).finally(() => { S.syncing = null; });
  return S.syncing;
}

/** 🏠 홈 영어 카드에 「📮 편지가 왔어요」를 붙일까 — 새 편지(안 연)나 안 읽은 답장 */
export async function homeLetterDot() {
  await profileReady();
  await loadLetters();
  return letterDot(nowState());
}

/** 📮 영어 목록 맨 위 우체통 띠 — 처음 연 날을 적고(첫 편지는 그날 바로 — v358) · 답장을 받아 온 뒤 다시 그린다 */
export async function refreshLetterStrip() {
  const box = $('library-mail');
  if (!box) return;
  await profileReady();
  // 처음 연 날은 원고를 받았든 못 받았든 적는다 — 못 받은 날이 빠지면 첫 편지가 하루 더 밀린다 (🔍 Codex 155차 #3)
  if (!lettersMap().start) await letterStart().catch(() => {});
  await loadLetters();
  if (!S.list.length) { box.hidden = true; return; }
  paintStrip(box);
  if (await syncLetterReplies()) paintStrip(box);
}
function paintStrip(box) {
  const st = nowState();
  const text = stripText(st);
  if (!text) { box.hidden = true; return; }
  box.innerHTML = '';
  const btn = el('button', 'lt-strip');
  btn.type = 'button';
  const dot = letterDot(st);
  btn.classList.toggle('is-new', dot);
  btn.appendChild(el('span', 'lt-strip-text', text));
  if (dot) { const d = el('span', 'lt-dot'); d.setAttribute('aria-label', '새 소식'); btn.appendChild(d); }
  btn.addEventListener('click', () => guardStart('english', () => { if (S.showView) S.showView('letters'); }));
  box.appendChild(btn);
  box.hidden = false;
}

// ── 쓰던 글 (이 기기에만 — 아이 편의, 못 쓰면 메모리에만) ──
const DRAFT_KEY = 'shincoach.letterDraft';
let draftMem = null;
function getDraft(mon) {
  let d = draftMem;
  if (!d) { try { d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch { d = null; } }
  return d && d.mon === mon && typeof d.text === 'string' ? d.text : '';
}
function setDraft(mon, text) {
  draftMem = text ? { mon, text: String(text).slice(0, 2000) } : null;
  try { if (draftMem) localStorage.setItem(DRAFT_KEY, JSON.stringify(draftMem)); else localStorage.removeItem(DRAFT_KEY); } catch { /* 메모리에는 */ }
}

// ── 그리기 ──

/** 우표 그림 — 기기에 있는 그림 · 없으면 받아 오고 · 못 받으면 📮 */
function stampEl(mon, name) {
  const s = el('span', 'lt-stamp');
  const put = (url) => {
    if (!url) { if (!s.firstChild) s.textContent = '📮'; return; }
    s.textContent = '';
    const img = el('img');
    img.src = url;
    img.alt = name;
    img.width = 64;
    img.height = 64;
    s.appendChild(img);
  };
  const have = characterUrl(mon);
  if (have) put(have);
  else { s.textContent = '📮'; ensureArt(mon).then(put).catch(() => {}); }
  return s;
}

/**
 * 편지지 — 항공우편 테두리 · 우표 · 영어 줄 · 🔊 한 문장씩 · 우리말로 보기
 * @param {{mon:number, name:string, lines:string[], ko:string, cls?:string}} o lines = 보이는 영어 줄(Dear·From 포함)
 */
function paperEl(o) {
  const wrap = el('div', `lt-air ${o.cls || ''}`.trim());
  const paper = el('div', 'lt-paper');
  paper.appendChild(stampEl(o.mon, o.name));
  const en = el('div', 'lt-en');
  en.lang = 'en';
  const rows = o.lines.map((t) => { const p = el('p', 'lt-line', t); en.appendChild(p); return p; });
  paper.appendChild(en);
  const ko = el('p', 'lt-ko', o.ko);
  ko.hidden = true;
  const tools = el('div', 'lt-tools');
  if (canReadAloud()) {
    const say = el('button', 'btn lt-say', '🔊 읽어 주기');
    say.type = 'button';
    say.addEventListener('click', () => {
      if (say.classList.contains('is-on')) { stopSay(); return; }
      stopSpeak(); // 🎤 듣던 것은 멈춘다(안 셈) — 읽어 주는 소리를 인식이 듣지 않게 (🔍 Codex 164차)
      const tok = ++S.readTok;
      say.classList.add('is-on');
      say.textContent = '⏹ 멈추기';
      (async () => {
        for (let i = 0; i < rows.length && tok === S.readTok; i++) {
          const line = sayLines([o.lines[i]])[0];
          if (!line) continue;
          rows[i].classList.add('is-say');
          await readAloud(line);
          rows[i].classList.remove('is-say');
        }
      })().finally(() => { if (tok === S.readTok) stopSay(); });
      function stopSay() {
        S.readTok++;
        stopReading();
        for (const r of rows) r.classList.remove('is-say');
        say.classList.remove('is-on');
        say.textContent = '🔊 읽어 주기';
      }
    });
    tools.appendChild(say);
  }
  if (o.ko) {
    const tr = el('button', 'btn lt-tr', '우리말로 보기');
    tr.type = 'button';
    tr.setAttribute('aria-expanded', 'false');
    tr.addEventListener('click', () => {
      ko.hidden = !ko.hidden;
      tr.textContent = ko.hidden ? '우리말로 보기' : '우리말 닫기';
      tr.setAttribute('aria-expanded', String(!ko.hidden));
    });
    tools.appendChild(tr);
  }
  paper.appendChild(tools);
  paper.appendChild(ko);
  wrap.appendChild(paper);
  return wrap;
}
const letterLines = (L) => ['Dear Jinwoo,', ...L.body, `From, ${L.en}`];
const letterPaper = (L) => paperEl({ mon: L.id, name: L.ko, lines: letterLines(L), ko: `진우에게 — ${L.koText} — ${L.ko}${josa(L.ko) === '이' ? '이가' : '가'}` });
/** 내가 보낸 답장 */
function mineEl(L, text) {
  const box = el('div', 'lt-mine');
  box.lang = 'en';
  box.appendChild(el('p', 'lt-line', `Dear ${L.en},`));
  for (const t of String(text).split('\n')) box.appendChild(el('p', 'lt-line', t));
  box.appendChild(el('p', 'lt-line', 'From, Jinwoo'));
  return box;
}
function foldEl(title, child, open = false) {
  const d = el('details', 'lt-fold');
  d.open = open;
  d.appendChild(el('summary', '', title));
  d.appendChild(child);
  return d;
}

/** 봉투 띠 말 (순수) — 숫자 없이 */
export function envelopeLine(text) {
  const c = letterCheck(text);
  if (c.ok) return { text: '✉️ 봉투가 꽉 찼어요! 보낼 수 있어요', ok: true };
  if (c.why === 'long') return { text: '글이 조금 길어요 — 조금 줄여 볼까요?', ok: false };
  if (c.why === 'english') return { text: '영어로 써 볼까요? 봉투는 영어 글자로 차요', ok: false };
  return { text: '✏️ 봉투가 찰 때까지 조금 더 써 볼까요?', ok: false };
}
/** 보내기가 안 됐을 때 말 (순수) */
export function sendFailText(r) {
  if (r && r.why === 'changed') return '편지가 바뀌었어요 — 화면을 다시 볼게요';
  if (r && (r.why === 'short' || r.why === 'long' || r.why === 'english')) return envelopeLine('').text;
  return '저장이 안 됐어요 — 한 번 더 눌러 주세요. 쓴 글은 그대로예요';
}

function formEl(L) {
  const box = el('div', 'lt-form');
  const help = el('div', 'lt-help');
  help.appendChild(el('p', 'lt-ask', `💡 답장 도움: ${L.ask}`));
  if (L.starter) {
    const st = el('p', 'lt-starter');
    st.appendChild(el('span', '', '첫 줄 본보기 '));
    const b = el('b', '', L.starter);
    b.lang = 'en';
    st.appendChild(b);
    help.appendChild(st);
  }
  box.appendChild(help);
  const paper = el('div', 'lt-write');
  paper.lang = 'en';
  paper.appendChild(el('p', 'lt-line lt-fixed', `Dear ${L.en},`));
  const ta = el('textarea', 'lt-text');
  ta.rows = 6;
  ta.lang = 'en';
  ta.autocapitalize = 'sentences';
  ta.placeholder = `${L.ko}에게 영어로 답장을 써 봐요`;
  ta.setAttribute('aria-label', `${L.ko}에게 보내는 영어 답장`);
  ta.value = getDraft(L.id);
  paper.appendChild(ta);
  paper.appendChild(el('p', 'lt-line lt-fixed', 'From, Jinwoo'));
  box.appendChild(paper);
  const env = el('div', 'lt-env');
  env.setAttribute('aria-hidden', 'true');
  env.appendChild(el('span', 'lt-env-icon', '✉️'));
  const bar = el('span', 'lt-env-bar');
  const fill = el('i');
  bar.appendChild(fill);
  env.appendChild(bar);
  box.appendChild(env);
  const line = el('p', 'lt-env-text');
  line.setAttribute('aria-live', 'polite');
  box.appendChild(line);
  const send = el('button', 'btn btn-primary lt-send', '✉️ 보내기');
  send.type = 'button';
  box.appendChild(send);
  const msg = el('p', 'lt-msg');
  msg.setAttribute('role', 'status');
  box.appendChild(msg);
  const paint = () => {
    const f = envelopeFill(ta.value);
    fill.style.width = `${Math.round(f * 100)}%`;
    env.classList.toggle('is-full', f >= 1);
    const c = envelopeLine(ta.value);
    line.textContent = c.text;
    send.disabled = !c.ok;
  };
  ta.addEventListener('input', () => { setDraft(L.id, ta.value); msg.textContent = ''; paint(); });
  paint();
  send.addEventListener('click', async () => {
    const c = letterCheck(ta.value);
    if (!c.ok) { msg.textContent = envelopeLine(ta.value).text; return; }
    send.disabled = true;
    ta.readOnly = true;
    send.textContent = '보내는 중…';
    let r;
    try { r = await letterSend(L.id, ta.value, S.list); } catch { r = null; }
    if (r && r.ok) {
      setDraft(L.id, '');
      render();
      // 📤 바로 올린다 — 아빠가 「올라온 거 봐 줘」 할 때 Claude가 볼 수 있게 (열쇠가 없거나 못 올려도 아이 화면은 그대로, 다음에 다시)
      import('./upload.js').then((m) => m.sendReport({ force: true })).catch(() => {});
      return;
    }
    ta.readOnly = false;
    send.textContent = '✉️ 보내기';
    paint();
    msg.textContent = sendFailText(r);
    if (r && r.why === 'changed') setTimeout(render, 1200);
  });
  return box;
}

function replyEl(st) {
  const L = st.letter;
  const e = st.entry;
  const r = e.r;
  const name = L ? L.ko : '포켓몬';
  const box = el('div', 'lt-reply');
  const waits = giftWaits(e); // 🎁 선물은 따라 읽은 뒤 (v360) — 등급 그림도 그때
  box.appendChild(el('h2', 'lt-head', `${waits ? '📮' : GRADE_ICON[r.g] || '📮'} ${name}의 답장이 왔어요!`));
  box.appendChild(paperEl({ mon: e.mon, name, lines: replyLines(r, L), ko: [r.ko, r.psKo ? `P.S. ${r.psKo}` : ''].filter(Boolean).join(' — '), cls: r.gift && r.gift.k === 'friend' ? 'is-friend' : '' }));
  if (waits) { box.appendChild(sayEl(st)); return box; }
  if (r.fix && r.g === 'again') box.appendChild(foldEl('✏️ 이렇게 고쳐 보면 좋아요', fixTextEl(e.text, r.fix)));
  const g = giftLine(r.g, r.gift, name);
  if (g) box.appendChild(el('p', `lt-gift${r.gift && r.gift.k === 'friend' ? ' is-friend' : ''}`, g));
  if (L) box.appendChild(foldEl('✉️ 내가 보낸 답장', mineEl(L, e.text)));
  const ok = el('button', 'btn btn-primary lt-done', r.g === 'again' ? '✏️ 다시 써 볼게요' : '😊 다 읽었어요');
  ok.type = 'button';
  ok.addEventListener('click', async () => {
    ok.disabled = true;
    let res;
    try { res = await letterRead(e.id); } catch { res = null; }
    if (!(res && (res.ok || res.why === 'none'))) { ok.disabled = false; return; }
    render();
  });
  box.appendChild(ok);
  return box;
}

/** 포켓몬 답장 줄 (편지지) */
const replyLines = (r, L) => ['Dear Jinwoo,', ...r.en.split('\n').map((x) => x.trim()).filter(Boolean), ...(r.ps ? [`P.S. ${r.ps}`] : []), `From, ${L ? L.en : ''}`];

/** ✏️ 고친 글 — 진우 글에서 바뀐 낱말에 색 (에세이 diffMarks · 다 같거나 다 다르면 칠하지 않는다) */
function fixTextEl(written, fixed) {
  const p = el('p', 'lt-fixtext');
  p.lang = 'en';
  const marks = diffMarks(written, fixed);
  if (!marks.some((x) => x.chg) || marks.every((x) => x.chg)) { p.textContent = fixed; return p; }
  marks.forEach((x, k) => {
    if (k) p.appendChild(document.createTextNode(' '));
    p.appendChild(x.chg ? el('mark', 'lt-chg', x.w) : document.createTextNode(x.w));
  });
  return p;
}
/** 🔊 여러 문장을 차례로 읽어 주는 단추 (편지 도감의 고친 글) */
function sayAllBtn(lines) {
  const b = el('button', 'btn lt-say', '🔊 읽어 주기');
  b.type = 'button';
  if (!canReadAloud() || !lines.length) { b.hidden = true; return b; }
  b.addEventListener('click', () => {
    if (b.classList.contains('is-on')) { S.readTok++; stopReading(); b.classList.remove('is-on'); b.textContent = '🔊 읽어 주기'; return; }
    const tok = ++S.readTok;
    b.classList.add('is-on');
    b.textContent = '⏹ 멈추기';
    (async () => { for (let i = 0; i < lines.length && tok === S.readTok; i++) await readAloud(lines[i]); })()
      .finally(() => { if (tok === S.readTok) { b.classList.remove('is-on'); b.textContent = '🔊 읽어 주기'; } });
  });
  return b;
}
/** 🎤 따라 읽던 것을 멈춘다 (우체통을 떠날 때 · 다시 그릴 때 · 화면이 꺼질 때) */
function stopSpeak() {
  S.sayTok++;
  const stop = S.speakStop;
  S.speakStop = null;
  if (stop) { try { stop(); } catch { /* 이미 끝남 */ } }
}
/** 🎤 우체통에서 마이크를 썼으면 놓는다 (떠날 때 · 화면이 꺼질 때 — 에너지 판정이 연 마이크가 켜진 채 남지 않게 · 🔍 Codex 164차) */
function freeMic() {
  if (!S.micUsed) return;
  S.micUsed = false;
  try { releaseMic(); } catch { /* 놓을 것 없음 */ }
}

/**
 * 🎤 고친 글 따라 읽기 → 🎁 선물 열기 (v360) — 문장마다 🔊 듣고 🎤 따라 읽기 · 통과하거나 SAY_TRIES번 해 보면 다음 ·
 * 🎤 없이는 넘어가지 않는다 · 마지막 문장 뒤 [🎁 선물 열기] = letterOpen(선물·읽음 한 트랜잭션) · 셈 글은 안 보인다
 */
function sayEl(st) {
  const e = st.entry;
  const r = e.r;
  const L = st.letter;
  const name = L ? L.ko : '포켓몬';
  const lines = fixLines(r.fix);
  const same = normLetter(e.text) === normLetter(r.fix);
  const wrap = el('div', 'lt-sayall');
  wrap.appendChild(el('h3', 'lt-sub', same ? '✏️ 고칠 곳이 없어요! 네 답장을 따라 읽어 봐요' : '✏️ 네 답장을 이렇게 고쳐 봤어'));
  if (!same) {
    if (L) wrap.appendChild(foldEl('✉️ 내가 쓴 글', mineEl(L, e.text)));
    wrap.appendChild(fixTextEl(e.text, r.fix));
  }
  wrap.appendChild(el('p', 'lt-note', `🔊 듣고 🎤 한 문장씩 따라 읽으면 ${name}의 🎁 선물이 열려요`));
  const ol = el('ol', 'lt-says');
  const rows = lines.map((t) => {
    const li = el('li', 'lt-sayline');
    li.lang = 'en';
    li.appendChild(el('span', 'lt-saymark', ''));
    li.appendChild(el('span', 'lt-saytext', t));
    ol.appendChild(li);
    return li;
  });
  wrap.appendChild(ol);
  const tools = el('div', 'lt-tools');
  const mk = (t, cls = '') => { const b = el('button', `btn ${cls}`.trim(), t); b.type = 'button'; tools.appendChild(b); return b; };
  const hear = mk('🔊 듣기', 'lt-hear');
  const mic = mk('🎤 따라 읽기', 'btn-primary lt-mic');
  const next = mk('다음 문장 →', 'lt-next');
  if (!canReadAloud()) hear.hidden = true;
  wrap.appendChild(tools);
  const level = el('span', 'lt-level');
  level.setAttribute('aria-hidden', 'true');
  const fill = el('i');
  level.appendChild(fill);
  wrap.appendChild(level);
  const msg = el('p', 'lt-saymsg');
  msg.setAttribute('role', 'status');
  wrap.appendChild(msg);
  const open = el('button', 'btn btn-primary lt-done lt-open', '🎁 선물 열기');
  open.type = 'button';
  wrap.appendChild(open);
  const pass = lines.map(() => false);
  let i = 0;
  let tries = 0;
  let busy = false;
  const done = () => i >= lines.length;
  const paint = () => {
    rows.forEach((li, k) => {
      li.classList.toggle('is-now', k === i);
      li.classList.toggle('is-pass', pass[k]);
      li.classList.toggle('is-tried', k < i && !pass[k]);
      li.firstChild.textContent = pass[k] ? '✅' : k < i ? '🎤' : k === i ? '👉' : '';
    });
    const end = done();
    hear.hidden = end || !canReadAloud();
    mic.hidden = end;
    mic.disabled = busy;
    hear.disabled = busy;
    next.hidden = end || !(pass[i] || tries >= SAY_TRIES);
    next.disabled = busy;
    if (!end && i === lines.length - 1) next.textContent = '다 읽었어요 →';
    open.hidden = !end;
    level.hidden = !busy;
  };
  hear.addEventListener('click', () => {
    if (busy || done()) return;
    stopReading();
    const tok = ++S.readTok;
    rows[i].classList.add('is-say');
    readAloud(lines[i]).finally(() => { if (tok === S.readTok) rows.forEach((x) => x.classList.remove('is-say')); });
  });
  mic.addEventListener('click', async () => {
    if (busy || done()) return;
    stopReading(); // 읽어 주기와 겹치면 인식이 제 소리를 듣는다
    S.readTok++;
    rows.forEach((x) => x.classList.remove('is-say'));
    busy = true;
    const tok = ++S.sayTok;
    const at = i;
    msg.textContent = '🎤 듣고 있어요 — 따라 읽어 보세요';
    fill.style.width = '0%';
    paint();
    let res = null;
    try {
      S.micUsed = true;
      const run = runSpeakCheck({ target: lines[at], durationSec: readSeconds(lines[at]), onLevel: (lv) => { fill.style.width = `${Math.round(Math.min(1, lv) * 100)}%`; } });
      S.speakStop = () => run.cancel();
      res = await run.promise;
    } catch { res = null; }
    if (!wrap.isConnected) return; // 다시 그렸거나 떠났다
    if (tok === S.sayTok) S.speakStop = null;
    busy = false;
    // 화면이 꺼졌거나(stopSpeak — 같은 화면이 남아 있으니 단추는 다시 켠다 · 🔍 Codex 164차) 취소된 것은 「해 봤다」가 아니다
    if (tok !== S.sayTok || !res || res.method === 'interrupted' || res.method === 'cancelled') { msg.textContent = ''; paint(); return; }
    if (res.passed) { pass[at] = true; msg.textContent = '✅ 잘 읽었어요!'; } else { tries++; msg.textContent = tries >= SAY_TRIES ? '괜찮아요 — 다음 문장으로 가 볼까요?' : '🔁 한 번 더 해 볼까요?'; }
    paint();
  });
  next.addEventListener('click', () => {
    if (busy || done() || !(pass[i] || tries >= SAY_TRIES)) return;
    i++;
    tries = 0;
    msg.textContent = done() ? `🎉 다 따라 읽었어요! ${name}의 선물을 열어 봐요` : '';
    paint();
  });
  open.addEventListener('click', async () => {
    if (!done()) return;
    open.disabled = true;
    let res;
    try { res = await letterOpen(e.id, { n: lines.length, ok: pass.filter(Boolean).length }); } catch { res = null; }
    if (!wrap.isConnected) return;
    if (res && !res.ok && res.why === 'none') { render(); return; } // 다른 창에서 이미 열었다
    if (!(res && res.ok)) { open.disabled = false; msg.textContent = '저장이 안 됐어요 — 한 번 더 눌러 주세요'; return; }
    wrap.innerHTML = '';
    const g = giftLine(r.g, res.gift, name);
    wrap.appendChild(el('h3', 'lt-sub', `${GRADE_ICON[r.g] || '📮'} ${name}의 선물!`));
    if (g) wrap.appendChild(el('p', `lt-gift${res.gift && res.gift.k === 'friend' ? ' is-friend' : ''}`, g));
    const ok = el('button', 'btn btn-primary lt-done', '😊 다 읽었어요');
    ok.type = 'button';
    ok.addEventListener('click', () => render());
    wrap.appendChild(ok);
    // 📤 바로 올린다 — 따라 읽기 결과를 「올라온 거 봐 줘」 때 볼 수 있게 (열쇠가 없거나 못 올려도 화면은 그대로)
    import('./upload.js').then((m) => m.sendReport({ force: true })).catch(() => {});
  });
  paint(); // 읽을 영어 문장이 없으면 done()이라 바로 [🎁 선물 열기]
  return wrap;
}

/** 그림 — 기기에 있는 그림 · 없으면 받아 오고 · 못 받으면 ❔ (편지 도감 · 빈 칸도 실루엣으로 쓰려고 받는다) */
function artInto(box, mon, alt) {
  const put = (url) => {
    if (!url) { if (!box.firstChild) box.textContent = '❔'; return; }
    box.textContent = '';
    const img = el('img');
    img.src = url;
    img.alt = alt;
    img.draggable = false;
    box.appendChild(img);
  };
  const have = characterUrl(mon);
  if (have) put(have);
  else { box.textContent = '❔'; ensureArt(mon).then(put).catch(() => {}); }
}
const mdOf = (t) => { const d = new Date(t); return `${d.getMonth() + 1}월 ${d.getDate()}일`; };
/** 📒 편지 도감 단추 (우체통 맨 위) */
function albumBtn() {
  const b = el('button', 'btn lt-album-btn', '📒 편지 도감');
  b.type = 'button';
  b.addEventListener('click', () => { stopSpeak(); S.album = true; S.albumMon = 0; render(); });
  return b;
}
/** 📒 포켓몬 편지 도감 (v360) — 씰 바인더처럼 편지 포켓몬 칸 · 빈 칸은 실루엣 · 받은 편지는 카드(끝난 답장은 등급 테두리) · 셈 글 없음 */
function albumEl() {
  const wrap = el('div', 'lt-album');
  const top = el('div', 'lt-album-top');
  const back = el('button', 'btn lt-album-back', '← 우체통');
  back.type = 'button';
  back.addEventListener('click', () => { S.album = false; S.albumMon = 0; render(); });
  top.appendChild(back);
  top.appendChild(el('h2', 'lt-head', '📒 포켓몬 편지 도감'));
  wrap.appendChild(top);
  const slots = letterAlbum(lettersMap(), S.list);
  const pick = S.albumMon ? slots.find((x) => x.mon === S.albumMon && x.state !== 'empty') : null;
  if (pick) { wrap.appendChild(cardOpenEl(pick)); return wrap; }
  S.albumMon = 0;
  const binder = el('div', 'lt-binder');
  const rings = el('div', 'lt-rings');
  rings.setAttribute('aria-hidden', 'true');
  for (let k = 0; k < 4; k++) rings.appendChild(el('span', 'lt-ring'));
  binder.appendChild(rings);
  const page = el('div', 'lt-page');
  page.appendChild(el('p', 'lt-page-title', 'POKéMON LETTERS'));
  const grid = el('div', 'lt-cards');
  for (const sl of slots) grid.appendChild(cardEl(sl));
  page.appendChild(grid);
  binder.appendChild(page);
  wrap.appendChild(binder);
  return wrap;
}
function cardEl(sl) {
  const empty = sl.state === 'empty';
  const c = el(empty ? 'div' : 'button', `lt-card is-${sl.state}${sl.grade ? ` g-${sl.grade}` : ''}`);
  if (empty) c.setAttribute('aria-label', '아직 못 받은 편지');
  else {
    c.type = 'button';
    c.setAttribute('aria-label', `${sl.letter.ko}의 편지 카드`);
    c.addEventListener('click', () => { S.albumMon = sl.mon; render(); });
  }
  c.appendChild(el('span', 'lt-card-no', `No.${String(sl.no).padStart(2, '0')}`));
  const pic = el('span', 'lt-card-pic');
  artInto(pic, sl.mon, empty ? '' : sl.letter.ko);
  c.appendChild(pic);
  c.appendChild(el('span', 'lt-card-name', empty ? '???' : sl.letter.ko));
  if (!empty) c.appendChild(el('span', 'lt-card-badge', sl.state === 'done' ? GRADE_ICON[sl.grade] || '' : '✉️'));
  return c;
}
/** 카드 펼치기 — 포켓몬 편지 · 주고받은 글마다(내 답장 · ✏️ 고친 글 · 포켓몬 답장) */
function cardOpenEl(sl) {
  const x = sl.letter;
  const box = el('div', 'lt-cardopen');
  const back = el('button', 'btn lt-album-back', '← 편지 도감');
  back.type = 'button';
  back.addEventListener('click', () => { S.readTok++; stopReading(); S.albumMon = 0; render(); });
  box.appendChild(back);
  const head = el('div', `lt-card is-${sl.state} is-big${sl.grade ? ` g-${sl.grade}` : ''}`);
  head.appendChild(el('span', 'lt-card-no', `No.${String(sl.no).padStart(2, '0')}`));
  const pic = el('span', 'lt-card-pic');
  artInto(pic, x.id, x.ko);
  head.appendChild(pic);
  head.appendChild(el('span', 'lt-card-name', `${x.ko} (${x.en})`));
  head.appendChild(el('span', 'lt-card-badge', sl.state === 'done' ? GRADE_ICON[sl.grade] || '' : '✉️'));
  box.appendChild(head);
  box.appendChild(foldEl(`📮 ${x.ko}의 편지`, letterPaper(x), !sl.entries.length));
  for (const e of sl.entries) {
    const item = el('div', 'lt-past-item');
    item.appendChild(el('p', 'lt-past-name', `✉️ ${mdOf(e.at)} 내가 보낸 답장`));
    item.appendChild(mineEl(x, e.text));
    if (!e.r) { item.appendChild(el('p', 'lt-note', `${x.ko}${josa(x.ko)} 답장을 쓰고 있어요`)); box.appendChild(item); continue; }
    if (giftWaits(e)) { item.appendChild(el('p', 'lt-note', `📮 ${x.ko}의 답장이 와 있어요 — 우체통에서 읽어요`)); box.appendChild(item); continue; }
    if (e.r.fix) {
      const fx = el('div', 'lt-fixwrap');
      fx.appendChild(fixTextEl(e.text, e.r.fix));
      fx.appendChild(sayAllBtn(fixLines(e.r.fix)));
      item.appendChild(foldEl('✏️ 고친 글', fx));
    }
    item.appendChild(foldEl(`${GRADE_ICON[e.r.g] || '📮'} ${x.ko}의 답장`, paperEl({ mon: x.id, name: x.ko, lines: replyLines(e.r, x), ko: [e.r.ko, e.r.psKo ? `P.S. ${e.r.psKo}` : ''].filter(Boolean).join(' — ') })));
    box.appendChild(item);
  }
  return box;
}

/** 우체통 화면 다시 그리기 */
function render() {
  const main = $('letters-main');
  if (!main) return;
  S.readTok++;
  stopReading();
  stopSpeak();
  main.innerHTML = '';
  if (!S.list.length) { main.appendChild(el('p', 'lt-empty', '📮 편지를 못 불러왔어요 — 인터넷이 되면 다시 열어 주세요')); return; }
  if (S.album) { main.appendChild(albumEl()); return; }
  main.appendChild(albumBtn());
  const st = nowState();
  if (st.kind === 'reply') main.appendChild(replyEl(st));
  else if (st.kind === 'sent') {
    const L = st.letter;
    const name = L ? L.ko : '포켓몬';
    main.appendChild(el('h2', 'lt-head', `✉️ ${name}에게 답장을 보냈어요`));
    main.appendChild(el('p', 'lt-note', `${name}${josa(name)} 답장을 쓰고 있어요. 답장이 오면 우체통에 빨간 점이 떠요.`));
    if (L) {
      main.appendChild(mineEl(L, st.entry.text));
      main.appendChild(foldEl(`${name}의 편지 다시 보기`, letterPaper(L)));
    }
  } else if (st.kind === 'letter') {
    const L = st.letter;
    main.appendChild(el('h2', 'lt-head', st.again ? `📮 ${L.ko}에게 다시 써 볼까요?` : `📮 ${L.ko}에게서 편지가 왔어요!`));
    main.appendChild(letterPaper(L));
    main.appendChild(formEl(L));
    if (st.fresh) letterSeen(L.id, S.list).then(() => paintStripIfAny()).catch(() => {});
  } else if (st.kind === 'wait' || st.kind === 'off') {
    main.appendChild(el('p', 'lt-empty', '📮 새 편지는 내일 와요 — 오늘은 영상 따라 하기를 해 볼까요?'));
  } else {
    main.appendChild(el('p', 'lt-empty', '📮 지금은 우체통이 비어 있어요'));
  }
}
function josa(name) {
  const c = String(name).charCodeAt(String(name).length - 1);
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0 ? '이' : '가';
}
function paintStripIfAny() {
  const box = $('library-mail');
  if (box && S.list.length) paintStrip(box);
}

/** 우체통 화면에 들어올 때 — 원고를 받고 그린 뒤, 기다리는 글이 있으면 답장을 바로 받아 와 다시 그린다 */
export async function enterLetters() {
  S.album = false; // 들어올 때는 늘 우체통부터
  S.albumMon = 0;
  const main = $('letters-main');
  if (main && !S.list.length) { main.innerHTML = ''; main.appendChild(el('p', 'lt-empty', '📮 우체통을 여는 중…')); }
  await profileReady();
  if (!lettersMap().start) await letterStart().catch(() => {});
  await loadLetters();
  render();
  if (await syncLetterReplies(true)) render();
}
/** 우체통을 떠날 때 — 읽어 주던 소리를 멈춘다 */
export function leaveLetters() {
  S.readTok++;
  stopReading();
  stopSpeak(); // 🎤 따라 읽던 것도 (v360)
  freeMic();
}

export function initLetters({ showView }) {
  S.showView = showView;
  const back = $('btn-letters-back');
  if (back) back.addEventListener('click', () => showView('library'));
  // 화면이 꺼지면 🎤를 멈춘다 — 꺼진 사이 들은 것은 「해 봤다」가 아니다 (v360)
  document.addEventListener('visibilitychange', () => { if (document.hidden) { stopSpeak(); freeMic(); } });
}
