// 📮 포켓몬 편지 화면 (v351, 2026-10-27 — 기본안 「추천대로」 · 원고 30통 「이대로」) — 규칙은 letters.js
// 영어 목록 맨 위 우체통 띠(refreshLetterStrip) · 홈 영어 카드 줄(homeLetterDot) · view-letters(enterLetters)
// · 아이 글·답장 글은 늘 textContent로 그린다(innerHTML 금지) · 봉투 띠엔 숫자를 안 보인다(feedback-no-pressure-counts)
// · 쓰던 글은 이 기기에 남긴다(다른 화면을 다녀와도) · 답장 받기는 기다리는 글이 있을 때만(5분에 한 번 — 우체통을 열면 바로)
import { lettersMap, letterStart, letterSeen, letterSend, letterApply, letterRead, getProfileSnapshot, profileReady } from './xp.js';
import { letterNow, letterDot, lettersList, letterCheck, envelopeFill, giftLine, stripText, sayLines, letterReplyStats, lettersOf, GRADE_ICON } from './letters.js';
import { characterUrl, ensureArt } from './pokemon.js';
import { readAloud, stopReading, canReadAloud } from './essay.js';
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
const S = { data: null, list: [], loading: null, lastSync: 0, syncing: null, showView: null, readTok: 0 };

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

/** 📮 영어 목록 맨 위 우체통 띠 — 처음 연 날을 적고(첫 편지는 그다음 날) · 답장을 받아 온 뒤 다시 그린다 */
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
  box.appendChild(el('h2', 'lt-head', `${GRADE_ICON[r.g] || '📮'} ${name}의 답장이 왔어요!`));
  const lines = ['Dear Jinwoo,', ...r.en.split('\n').map((x) => x.trim()).filter(Boolean), ...(r.ps ? [`P.S. ${r.ps}`] : []), `From, ${L ? L.en : ''}`];
  box.appendChild(paperEl({ mon: e.mon, name, lines, ko: [r.ko, r.psKo ? `P.S. ${r.psKo}` : ''].filter(Boolean).join(' — '), cls: r.gift && r.gift.k === 'friend' ? 'is-friend' : '' }));
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

function pastEl() {
  const L = lettersOf(lettersMap());
  const byMon = new Map(S.list.map((x) => [x.id, x]));
  const done = L.sent.filter((e) => e.r && e.rd && e.r.g !== 'again' && byMon.has(e.mon)).reverse();
  if (!done.length) return null;
  const list = el('div', 'lt-past');
  for (const e of done) {
    const x = byMon.get(e.mon);
    const item = el('div', 'lt-past-item');
    item.appendChild(el('p', 'lt-past-name', `${GRADE_ICON[e.r.g] || '📮'} ${x.ko}`));
    item.appendChild(foldEl(`${x.ko}의 편지`, paperEl({ mon: x.id, name: x.ko, lines: letterLines(x), ko: x.koText })));
    item.appendChild(foldEl('✉️ 내가 보낸 답장', mineEl(x, e.text)));
    item.appendChild(foldEl(`📮 ${x.ko}의 답장`, paperEl({ mon: x.id, name: x.ko, lines: ['Dear Jinwoo,', ...e.r.en.split('\n'), ...(e.r.ps ? [`P.S. ${e.r.ps}`] : []), `From, ${x.en}`], ko: e.r.ko })));
    list.appendChild(item);
  }
  return foldEl('📬 지난 편지', list);
}

/** 우체통 화면 다시 그리기 */
function render() {
  const main = $('letters-main');
  if (!main) return;
  S.readTok++;
  stopReading();
  main.innerHTML = '';
  if (!S.list.length) { main.appendChild(el('p', 'lt-empty', '📮 편지를 못 불러왔어요 — 인터넷이 되면 다시 열어 주세요')); return; }
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
  const past = pastEl();
  if (past) main.appendChild(past);
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
}

export function initLetters({ showView }) {
  S.showView = showView;
  const back = $('btn-letters-back');
  if (back) back.addEventListener('click', () => showView('library'));
}
