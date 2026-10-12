// 📚 국어 화면 — 작품 도감(카드 목록) → 글 읽기 → 한 문제씩(네 보기 · 틀리면 힌트) → 🔍 근거 잡기 → 다 풀면 ★·💰 (2026-10-11)
// 규칙·검사는 korean.js(순수), 저장은 xp.korFinish(한 트랜잭션 — 별과 💰가 같이), 글은 coach/korean/reading.json
// 샘플 검수 페이지(artifact 9QUtn2o2L8ogq7DJBZnp3f)를 그대로 앱으로 — 아버님 "우선 만들고 적용한 후에 반응을 보자"
//  · 보기는 물음마다 섞어 그린다(원고의 정답 자리를 외우지 않게) · 틀린 보기는 한 번 누르면 꺼지고 힌트(잘못 읽기 종류)
//  · 근거가 둘 이상이면 하나만 눌러도 맞고, 맞히면 모두 칠한다 · 근거를 잘못 누른 것은 잘못 읽기로 세지 않는다
//  · ⏳ 국어도 하루 1시간 30분(v232, 아버님) — 읽던 글은 끝까지, 새 글만 막는다
import { TYPES, KINDS, PRE, KOR_COINS, LISTEN_KIND, isListen, circled, lineCount, lineText, unitOf, validCards, starsOf, nextStar } from './korean.js';
import { newListenState, playListen, haltListen, stopListening, listenBoxEl, scriptEl, confirmHeard, syncListenBox } from './korlistenview.js'; // 🎧 듣기 카드 (v245) — 이 파일을 import하지 않는다
import { korFinish, korDoneMap, onProfileReload, profileLoading, korTakeThrow, korGiveBackThrow, korThrowsLeft, getLevelInfo, isTired, getLook, inventory, catchAttempt, tickEgg } from './xp.js';
import { loadCharacters, downloadCharacters, forSubject, isUnlocked, pickCharacters } from './pokemon.js';
import { openCatch, isCatchOpen } from './catch.js';
import { holdStore, refundOutcome } from './throwhold.js'; // 🎯 뺀 던지기 예약 장부 (Codex 49차 #1·#2)
import { guardStart } from './timeup.js'; // ⏳ 국어 하루 1시간 30분 — 새 글을 열 때만 막는다(읽던 글은 끝까지, 아버님 결정 ②)
import { sfx, unlock as sfxUnlock } from './sfx.js';
import { todayKey } from './track.js';
import { showHatchIfAny } from './hatch.js';
import { eggProgress } from './egg.js';
import * as tabs from './kortabs.js'; // 🔤 낱말 · 📘 단원 탭 (v234) — 탭 쪽은 이 파일을 import하지 않는다(ctx로 건넴)
import * as puzzles from './korpuzzleview.js'; // 🧩 퍼즐 탭 (v242) — 같은 꼴(ctx로 건넴)
import { writeBoxEl, replyBannerEl, renderReplyView, slotWriteText, syncWrites, appliedLine } from './korwriteview.js'; // ✍️ 서술형 (v237) — 이 파일을 import하지 않는다(ctx로 건넴)
import { cardWriteState } from './korwrite.js';
import { korWritesMap } from './xp.js';

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

/** 글 원고 자리 */
export const CONTENT_URL = './coach/korean/reading.json';

// cards: 쓸 수 있는 카드(validCards) · read: 읽는 중인 글 { card, qi, qs: [물음 상태], misses, result, saving }
const ui = { cards: null, loadErr: '', read: null, wired: false, catching: false, catchMsg: '', charBusy: false, catchState: null, tab: 'cards', wview: '', writeNote: '' };
// wview = 📬 답장 화면을 보고 있는 카드 id (그동안 목록이 덮지 않게) · writeNote = 답장이 붙었을 때 도감 위 한 줄(한 번)
// tab = 📚 도감(cards) · 🔤 낱말(words) · 📘 단원(units) — 글을 읽고 돌아오면 그 탭으로
// catchState = 지금 열어 둔 잡기 창 { threw, hold } — 창이 바깥에서 닫혀(catch.closeCatch는 부른 쪽에 안 알린다) 소식이 없을 때 안 던진 기회를 돌려주려고

/** 보기 차례를 섞는다 (rng = 0 이상 1 미만) → 원고 보기 번호 배열 */
export function shuffled(n, rng = Math.random) {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 도감 칸 아래 말 (순수) — 받은 별·다음 별 → { text, ready(지금 읽으면 별) } · listen 🎧 듣기 카드는 "들으면" (v245) */
export function statusOf(done, id, now, listen = false) {
  const s = starsOf(done, id);
  const n = nextStar(done, id, now);
  const v = listen ? '들으면' : '읽으면';
  if (s === 0) return { text: `${listen ? '새 듣기' : '새 글'} · 다 ${v} ★ 💰${KOR_COINS[1]}`, ready: true };
  if (n.star) return { text: `다시 ${v} ${'★'.repeat(n.star)} 💰${KOR_COINS[n.star]}`, ready: true };
  if (n.why === 'wait') return { text: `${whenText(n.days)} 다시 ${v} ${'★'.repeat(n.next)}`, ready: false };
  return { text: '★★★ 다 모았어요!', ready: false };
}

/** 남은 날 → "내일" · "N일 뒤" (순수) */
export function whenText(days) {
  const d = Math.max(1, Math.floor(Number(days) || 1));
  return d === 1 ? '내일' : `${d}일 뒤`;
}

/** 맞힌 뒤 보여 줄 "아까 고른 보기가 왜 틀렸나" (순수) — 고른 차례대로 { t, why } (Codex 48차 #6: 써 둔 까닭이 화면에 안 나왔다) */
export function wrongNotes(q, wrong) {
  return (wrong || []).map((k) => q.opts[k]).filter((o) => o && !o.ok).map((o) => ({ t: o.t, why: o.why }));
}

/** 다 읽은 뒤의 말 (순수) — korFinish 결과 → { title, lines } · listen 🎧 듣기 카드는 "들으면"·"들었어요" (v245) */
export function finishText(r, listen = false) {
  if (!r || !r.ok) {
    if (r && r.why === 'unknown') return { title: '이 글은 지금 도감에 없어요', lines: ['도감으로 돌아가 다른 글을 골라요'] };
    return { title: '저장이 안 됐어요', lines: ['[다시 저장하기]를 눌러 주세요 — 푼 것은 그대로예요'] };
  }
  const v = listen ? '들으면' : '읽으면';
  const got = `💰 +${r.coins}${r.stone ? ' · 🟩 국어스톤 +1 (한 번에 다 맞혔어요!)' : ''} · 🎯 국어 포켓몬 잡기 1번`;
  // 다음 별까지 남은 날은 규칙이 센 것(r.days) — ★★ 뒤 "일주일이 지나면"은 ★★를 늦게 받으면 틀렸다 (Codex 49차)
  if (r.star === 1) return { title: '📚 도감 등록!', lines: [got, `${whenText(r.next === 2 ? r.days : 1)} 다시 ${v} ★★ 💰${KOR_COINS[2]}`] };
  if (r.star === 2) return { title: '★★ 두 번째 별!', lines: [got, r.next === 3 ? `${whenText(r.days)} 다시 ${v} ★★★ 💰${KOR_COINS[3]}` : `처음 ${listen ? '들은' : '읽은'} 날부터 일주일이 지나 다시 ${v} ★★★ 💰${KOR_COINS[3]}`] };
  if (r.star === 3) return { title: '★★★ 다 모았어요!', lines: [got, '이 글은 이제 진우 거예요'] };
  if (r.wait === 'wait' && (r.next === 2 || r.next === 3)) {
    return { title: r.next === 2 ? `오늘도 잘 ${listen ? '들었어요' : '읽었어요'}` : `또 ${listen ? '들었어요' : '읽었어요'}!`, lines: [`${whenText(r.days)} 다시 ${v} ${'★'.repeat(r.next)} 💰${KOR_COINS[r.next]}`] };
  }
  return { title: `또 ${listen ? '들어' : '읽어'} 줘서 고마워요`, lines: ['★★★를 다 모은 글이에요'] };
}

async function loadCards() {
  if (ui.cards) return ui.cards;
  try {
    const res = await fetch(CONTENT_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    ui.cards = validCards(await res.json());
    ui.loadErr = '';
  } catch (e) {
    ui.loadErr = String((e && e.message) || e);
    ui.cards = null;
  }
  return ui.cards;
}

/** 📚 국어 화면에 들어올 때 (app.showView) — 읽던 글이 있으면 그대로(🎒·📊에서 돌아옴), 아니면 도감 */
export async function enterKorean() {
  topUpKorChars(); // 🎯 국어 포켓몬 그림을 조금씩 먼저
  // 🎯 소식 없이 닫힌 창부터 정리한 뒤 장부 정리 — 지난번에 뺐는데 판정 전에 꺼진 기회·돌려주다 실패한 기회 (Codex 49차 #1·#2 · 50차 #1 차례대로)
  Promise.resolve(settleLostCatch()).catch(() => {}).then(() => settleKorThrows());
  // 📥 ✍️ 서술형 아빠 답장 — 비공개 저장소에서 받아 그 글에 한 번만 붙인다(보상도 한 트랜잭션) · 못 받으면 조용히
  loadCards().then((cards) => (cards ? syncWrites(cards) : null)).then((r) => {
    const line = appliedLine(r);
    if (!line) return;
    ui.writeNote = line;
    if (!ui.read && !anySession() && !ui.wview && ui.tab === 'cards') renderList().catch(() => {});
  }).catch(() => {});
  if (ui.read) { if (!$('korean-main').querySelector('.kor-read')) renderRead(); return; }
  if (anySession()) { resumeSession(); return; } // 🔤 낱말·🧩 퍼즐을 풀다 🎒·📊를 다녀왔다 — 그대로 이어서
  if (ui.wview) { renderReplyView(ui.wview, writeCtx); return; } // 📬 답장을 보다 🎒·📊를 다녀왔다
  await renderList();
}

/** ✍️ 서술형 쪽(korwriteview)에 건네는 것 — 서로 import하지 않게 */
const writeCtx = {
  main: () => $('korean-main'),
  cards: () => ui.cards || [],
  open: (id) => { ui.wview = id; },
  back: () => { ui.wview = ''; renderList(); window.scrollTo(0, 0); },
};

/** 탭 쪽(kortabs)에 건네는 것 — 서로 import하지 않게 */
const tabCtx = {
  main: () => $('korean-main'),
  cards: () => ui.cards || [],
  catchBtnEl: () => catchBtnEl(),
  tickKorDay: () => tickKorDay(),
  eggLine: (e) => eggLine(e),
  openCard: (id) => openCard(id),
  toWords: () => { ui.tab = 'words'; renderList(); window.scrollTo(0, 0); },
  toPuzzle: () => { ui.tab = 'puzzle'; renderList(); window.scrollTo(0, 0); },
  toCards: () => { ui.tab = 'cards'; renderList(); window.scrollTo(0, 0); },
  rerender: () => { renderList(); },
};
/** 🔤 낱말 판 · 🧩 퍼즐 판을 푸는 중인가 — 다시 그릴 때 목록이 판을 덮지 않게 (v242: 퍼즐 판도 같은 다섯 자리에서 본다) */
function anySession() {
  return tabs.inSession() || puzzles.inSession();
}
/** 푸는 중이던 판을 그대로 다시 그린다 */
function resumeSession() {
  if (puzzles.inSession()) puzzles.renderSession(tabCtx);
  else tabs.renderSession(tabCtx);
}

/** 📚 도감 · 🔤 낱말 · 📘 단원 · 🧩 퍼즐 탭 막대 */
function tabBarEl() {
  const bar = el('div', 'kor-tabs');
  bar.setAttribute('role', 'tablist');
  for (const [id, label] of [['cards', '📚 도감'], ['words', '🔤 낱말'], ['units', '📘 단원'], ['puzzle', '🧩 퍼즐']]) {
    const b = el('button', `kor-tab${ui.tab === id ? ' is-on' : ''}`, label);
    b.type = 'button';
    b.dataset.tab = id;
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(ui.tab === id));
    b.addEventListener('click', () => { if (ui.tab === id) return; ui.tab = id; renderList(); });
    bar.appendChild(b);
  }
  return bar;
}

/** 도감 묶음 (순수) — '' 보통 · 'listen' 🎧 듣기 카드 · 'pre' ⭐ 미리보기 */
export function groupOf(c) {
  return c && c.pre ? 'pre' : isListen(c) ? 'listen' : '';
}

/** 도감 (카드 목록) */
export async function renderList() {
  const main = $('korean-main');
  if (!main) return;
  const cards = await loadCards();
  if (ui.read || anySession() || ui.wview) return; // 읽는 사이 글을 골랐다 · 🔤 낱말·🧩 퍼즐 판을 시작했다 · 📬 답장 화면
  main.textContent = '';
  if (!cards || !cards.length) {
    const box = el('div', 'kor-empty');
    box.appendChild(el('p', '', '글을 불러오지 못했어요 — 인터넷을 확인하고 다시 열어 주세요'));
    if (ui.loadErr) box.appendChild(el('p', 'kor-small', ui.loadErr));
    const again = el('button', 'btn btn-primary', '다시 불러오기');
    again.type = 'button';
    again.addEventListener('click', () => { ui.cards = null; renderList(); });
    box.appendChild(again);
    main.appendChild(box);
    return;
  }
  main.appendChild(tabBarEl());
  if (ui.tab === 'words' || ui.tab === 'units' || ui.tab === 'puzzle') {
    const body = el('div', 'kor-tabbody');
    main.appendChild(body);
    if (ui.tab === 'puzzle') await puzzles.renderPuzzleTab(body, tabCtx);
    else await (ui.tab === 'words' ? tabs.renderWordsTab(body, tabCtx) : tabs.renderUnitsTab(body, tabCtx));
    return;
  }
  const done = korDoneMap();
  const now = Date.now();
  const total = cards.length;
  const got = cards.filter((c) => starsOf(done, c.id) > 0).length;
  const stars = cards.reduce((n, c) => n + starsOf(done, c.id), 0);
  const head = el('section', 'kor-head');
  head.appendChild(el('h2', 'kor-h', '📚 작품 도감'));
  head.appendChild(el('p', 'kor-intro', '글을 읽고 문제를 풀면 카드가 모여요. 다른 날 다시 읽으면 ★★, 처음 읽은 날부터 일주일이 지나 다시 읽으면 ★★★!'));
  head.appendChild(el('p', 'kor-count', `모은 카드 ${got} / ${total} · ★ ${stars} / ${total * 3}`));
  const cb = catchBtnEl(); // 🎯 남은 국어 잡기 기회 — 다 읽은 카드에서 안 던지고 나왔어도 여기서
  if (cb) head.appendChild(cb);
  if (ui.writeNote) { head.appendChild(el('p', 'kor-wnote', ui.writeNote)); ui.writeNote = ''; } // 📬 답장이 붙었다 — 한 번
  const wb = replyBannerEl({ ...writeCtx, cards: () => cards }); // 📬 안 읽은 아빠 답장
  if (wb) head.appendChild(wb);
  main.appendChild(head);
  const writes = korWritesMap();
  const grid = el('div', 'kor-grid');
  // 묶음마다 제목 한 줄 아래 따로 — 🎧 듣기 카드(v245) 다음 ⭐ 미리보기 카드(v244, 맨 뒤) · 원고 차례와 상관없이
  const shown = [...cards.filter((c) => !groupOf(c)), ...cards.filter((c) => groupOf(c) === 'listen'), ...cards.filter((c) => groupOf(c) === 'pre')];
  shown.forEach((c, i) => {
    const g = groupOf(c);
    if (g && !(i && groupOf(shown[i - 1]) === g)) grid.appendChild(el('p', 'kor-grid-h', g === 'pre' ? `${PRE[c.pre]} — 앞으로 국어 시간에 만날 작품을 미리 읽어요` : '🎧 듣고 답하기 — 글 대신 귀로 듣고 물음에 답해요'));
    const s = starsOf(done, c.id);
    const st = statusOf(done, c.id, now, g === 'listen');
    const b = el('button', `kor-slot is-${c.kind}${c.pre ? ' is-pre' : ''}${g === 'listen' ? ' is-listen' : ''}${s ? ' is-got' : ''}${st.ready ? ' is-ready' : ''}`);
    b.type = 'button';
    b.dataset.card = c.id;
    b.appendChild(el('span', 'kor-slot-no', `No.${i + 1}`));
    b.appendChild(el('span', 'kor-slot-ico', c.icon));
    b.appendChild(el('span', 'kor-slot-title', c.title));
    b.appendChild(el('span', 'kor-slot-kind', c.kind === 'classic' ? `${KINDS.classic} · ${c.author}` : `${g === 'listen' ? LISTEN_KIND : KINDS.practice} · ${c.genre}`));
    if (c.pre) b.appendChild(el('span', 'kor-slot-pre', PRE[c.pre]));
    b.appendChild(el('span', 'kor-slot-stars', '★'.repeat(s) + '☆'.repeat(3 - s)));
    b.appendChild(el('span', 'kor-slot-status', st.text));
    const wl = slotWriteText(cardWriteState(writes, c.id), !!c.write); // ✍️ 서술형 — 답장 기다림 · 📬 왔어요 · ✅
    if (wl) b.appendChild(el('span', 'kor-slot-write', wl));
    b.setAttribute('aria-label', `${c.title}${c.pre ? ` (${PRE[c.pre]})` : g === 'listen' ? ` (${LISTEN_KIND})` : ''} — 별 ${s}개 · ${st.text}${wl ? ` · ${wl}` : ''}`);
    b.addEventListener('click', () => guardStart('korean', () => openCard(c.id)));
    grid.appendChild(b);
  });
  main.appendChild(grid);
}

function openCard(id) {
  const card = (ui.cards || []).find((c) => c.id === id);
  if (!card) return;
  sfxUnlock();
  ui.read = {
    card,
    qi: 0,
    qs: card.qs.map((q) => ({ order: shuffled(q.opts.length), wrong: [], answered: false, evDone: false, evWrong: [] })),
    misses: {},
    evMiss: 0, // 근거를 잘못 누른 수 — 잘못 읽기로는 안 세고 🟩 "한 번에 다 맞힘"에만
    result: null,
    saving: false,
    focus: '', // 다시 그린 뒤 초점을 옮길 곳 (moveFocus)
    ls: isListen(card) ? newListenState() : null, // 🎧 듣기 카드 — 들었나 · 글로 읽나 · 읽는 중 (v245)
  };
  stopListening(); // 앞 카드에서 읽던 소리
  renderRead();
  window.scrollTo(0, 0);
}

function backToList() {
  if (ui.read) haltListen(ui.read.ls);
  ui.read = null;
  renderList();
  window.scrollTo(0, 0);
}

/** 🎧 국어 화면을 떠난다(app.showView — 🎒·📊·홈) · 앱을 내렸다 — 읽던 소리를 멈추고 상자를 "멈춤"으로 (돌아오면 ▶ 다시 듣기) */
export function leaveKorean() {
  const r = ui.read;
  if (r && r.ls) { if (haltListen(r.ls)) refreshListenBox(); }
  else stopListening();
}

/** 🎧 읽는 동안 줄이 바뀌었다 — 상자는 그대로 두고 칩·점·글자만 (⏹에 있던 초점이 다시 읽히지 않게, Codex 57차 #6) */
function tickListenBox() {
  const r = ui.read;
  const main = $('korean-main');
  const box = main && main.querySelector('.kor-listen');
  if (!r || !r.ls || !box) return;
  if (!syncListenBox(box, r.card, r.ls)) refreshListenBox();
}

/** 🎧 끝·멈춤·실패를 알림 칸(.kor-live — 다시 그려도 남는 한 곳)에 한 번 · 줄마다는 알리지 않는다 */
function sayLive(text) {
  const live = document.querySelector('#korean-main .kor-live');
  if (live && text) live.textContent = text;
}

/** 🎧 상자만 다시 그린다 — 물음 칸은 그대로 · 상자 안에 있던 초점은 같은 일을 하는 단추로(없으면 첫 단추) */
function refreshListenBox() {
  const r = ui.read;
  const main = $('korean-main');
  const old = main && main.querySelector('.kor-listen');
  if (!r || !r.ls || !old) return;
  const had = old.contains(document.activeElement) ? (document.activeElement.dataset.act || 'any') : '';
  const box = listenBoxEl(r.card, r.ls, listenAct);
  old.replaceWith(box);
  if (had) {
    const t = box.querySelector(`[data-act="${had}"]`) || box.querySelector('button');
    if (t) { try { t.focus({ preventScroll: true }); } catch { /* 초점은 없어도 */ } }
  }
}

/** 🎧 상자 단추가 하는 일 */
const listenAct = {
  play: (slow) => {
    const r = ui.read;
    if (!r || !r.ls || r.ls.text) return;
    sfxUnlock();
    playListen(r.card, r.ls, slow, {
      alive: () => ui.read === r && koreanVisible(),
      onChange: () => { if (ui.read === r) refreshListenBox(); },
      onLine: () => { if (ui.read === r) tickListenBox(); },
      onHeard: () => { if (ui.read === r) { r.focus = 'head'; renderQ(); bringQ(); } }, // 처음 끝까지 들었다 — 물음이 나온다(화면 밖이면 데려온다)
      onEnd: (say) => { if (ui.read === r) sayLive(say); },
    }).catch(() => {});
  },
  stop: () => {
    const r = ui.read;
    if (!r || !r.ls) return;
    const was = haltListen(r.ls);
    refreshListenBox();
    if (was) sayLive('멈췄어요');
  },
  // ✅ 끝까지 들렸어요 — 끝 알림이 빠진 줄이 있어 끝났는지 몰랐다 (Codex 57차 #1)
  heard: () => {
    const r = ui.read;
    if (!r || !r.ls || !confirmHeard(r.ls)) return;
    refreshListenBox();
    r.focus = 'head';
    renderQ();
    bringQ();
    sayLive(`물음 ${r.card.qs.length}개가 나왔어요`);
  },
  // 📄 글로 읽고 풀기 — 글이 보이고 물음이 나온다(이 판은 🟩 없음) · 되돌리지 않는다
  toText: () => {
    const r = ui.read;
    if (!r || !r.ls) return;
    haltListen(r.ls);
    r.ls.text = true;
    r.focus = 'head';
    renderRead();
  },
};

/** 번호 붙은 문장 — 연습 글과 이야기 명작(「알에서 태어나다」)이 같이 쓴다 */
function proseEl(card) {
  const prose = el('p', 'kor-prose');
  card.lines.forEach((t, i) => {
    const sp = el('span', 'kor-sent');
    sp.dataset.n = String(i + 1);
    sp.appendChild(el('span', 'kor-num', circled(i + 1)));
    sp.appendChild(document.createTextNode(`${t} `));
    prose.appendChild(sp);
  });
  return prose;
}

/** 글 상자 — 이야기·설명은 번호 붙은 문장, 명작은 금빛 카드(시는 연·줄, 이야기는 문장) */
function passageEl(card) {
  if (card.kind === 'classic') {
    const box = el('div', 'kor-classic');
    const top = el('div', 'kor-classic-top');
    top.appendChild(el('span', 'kor-classic-badge', KINDS.classic));
    if (card.pre) top.appendChild(el('span', 'kor-pre-badge', PRE[card.pre])); // ⭐ 미리보기 (v244)
    top.appendChild(el('span', 'kor-classic-by', `${card.author} · ${card.genre}`));
    box.appendChild(top);
    box.appendChild(el('h3', 'kor-classic-title', `「${card.title}」`));
    if (!Array.isArray(card.stanzas)) box.appendChild(proseEl(card)); // 이야기 명작 — 시가 아니라 문장
    const poem = Array.isArray(card.stanzas) ? el('div', 'kor-poem') : null;
    let n = 0;
    for (const st of poem ? card.stanzas : []) {
      const s = el('div', 'kor-stanza');
      for (const t of st) {
        n++;
        const row = el('div', 'kor-line');
        row.dataset.n = String(n);
        row.appendChild(el('span', 'kor-num', circled(n)));
        row.appendChild(el('span', '', t));
        s.appendChild(row);
      }
      poem.appendChild(s);
    }
    if (poem) box.appendChild(poem);
    if (card.words) box.appendChild(wordsEl(card));
    const facts = el('div', 'kor-facts');
    for (const [k, v] of card.facts) {
      const p = el('p');
      p.appendChild(el('b', '', `${k} `));
      p.appendChild(document.createTextNode(v));
      facts.appendChild(p);
    }
    box.appendChild(facts);
    return box;
  }
  const box = el('div', 'kor-passage');
  const top = el('div', 'kor-passage-top');
  top.appendChild(el('span', 'kor-passage-badge', KINDS.practice));
  top.appendChild(el('span', 'kor-passage-by', `${card.genre} · 글 신코치`));
  box.appendChild(top);
  box.appendChild(el('h3', 'kor-passage-title', `「${card.title}」`));
  box.appendChild(proseEl(card));
  if (card.words) box.appendChild(wordsEl(card));
  return box;
}

/** 📖 낱말 풀이 — 글 아래 작게 (어려운 낱말 몇 개, Codex 48차 제안 · 🔤 낱말 줄기의 첫걸음) */
function wordsEl(card) {
  const box = el('div', 'kor-words');
  box.appendChild(el('span', 'kor-words-h', '📖 낱말'));
  for (const [w, mean] of card.words) {
    const p = el('p', 'kor-word');
    p.appendChild(el('b', '', w));
    p.appendChild(document.createTextNode(` — ${mean}`));
    box.appendChild(p);
  }
  return box;
}

/** 읽기 화면 — 위(가로 화면은 왼쪽)에 글, 아래(오른쪽)에 지금 물음 하나 */
function renderRead() {
  const main = $('korean-main');
  const r = ui.read;
  if (!main || !r) return;
  main.textContent = '';
  const wrap = el('section', 'kor-read');
  const top = el('div', 'kor-read-top');
  const back = el('button', 'btn kor-back', '← 도감');
  back.type = 'button';
  back.addEventListener('click', backToList);
  top.appendChild(back);
  top.appendChild(el('span', 'kor-read-skill', r.card.skill));
  wrap.appendChild(top);
  const body = el('div', 'kor-read-body');
  if (r.ls && !r.ls.text) body.appendChild(listenBoxEl(r.card, r.ls, listenAct)); // 🎧 글 대신 듣기 상자
  else {
    const p = passageEl(r.card);
    if (r.ls) p.insertBefore(el('p', 'kor-listen-textnote', '📄 글로 읽고 풀어요 — 🟩 국어스톤은 듣고 풀어서 한 번에 다 맞혔을 때 받아요'), p.firstChild);
    body.appendChild(p);
  }
  const col = el('div', 'kor-qcol');
  body.appendChild(col);
  wrap.appendChild(body);
  // 읽어 주기 알림은 다시 그려도 남는 한 곳에서 (매번 새로 만든 role=status는 잘 안 읽힌다, Codex 48차 #9)
  const live = el('p', 'kor-live');
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  wrap.appendChild(live);
  main.appendChild(wrap);
  // 위쪽 띠(sticky)만큼 글 상자·물음 칸을 띄운다 — 가로 화면에서 글 윗줄이 띠 밑으로 들어갔다 (Codex 48차 #3)
  const bar = document.querySelector('#view-korean .topbar');
  main.style.setProperty('--kor-top', `${Math.ceil(bar ? bar.getBoundingClientRect().height : 64) + 8}px`);
  renderQ();
}

/** 화면에 다시 그린 뒤 다음에 누를 곳으로 초점(키보드) — 'opt' 남은 보기 · 'ev' 근거 줄 · 'next' 다음 단추 · 'head' 새 물음 · 'done' 끝 카드 */
function moveFocus(col, where) {
  const pickEl = {
    opt: () => col.querySelector('.kor-opt:not(:disabled)'),
    ev: () => col.querySelector('.kor-ev-row:not(:disabled)'),
    next: () => col.querySelector('.kor-next'),
    head: () => col.querySelector('.kor-q-text'),
    done: () => col.querySelector('.kor-done-title'),
  }[where];
  const t = pickEl && pickEl();
  if (!t) return;
  if (!t.matches('button')) t.setAttribute('tabindex', '-1');
  try { t.focus({ preventScroll: true }); } catch { /* 초점은 없어도 */ }
}

/** 지금 물음(또는 다 읽은 뒤 카드)만 다시 그린다 — 글 상자는 그대로(칠한 근거만 바꾼다) */
function renderQ() {
  const r = ui.read;
  const main = $('korean-main');
  const col = main && main.querySelector('.kor-qcol');
  if (!r || !col) return;
  col.textContent = '';
  for (const m of main.querySelectorAll('.kor-sent.is-mark, .kor-line.is-mark')) m.classList.remove('is-mark');
  const live = main.querySelector('.kor-live');
  const focusTo = r.focus;
  r.focus = '';
  if (r.qi >= r.card.qs.length) {
    const done = finishEl();
    col.appendChild(done);
    if (live) live.textContent = (done.querySelector('.kor-done-title') || {}).textContent || '';
    if (focusTo) moveFocus(col, 'done');
    return;
  }
  if (r.ls && !r.ls.heard && !r.ls.text) {
    // 🎧 아직 처음 끝까지 안 들었다 — 물음은 들은 뒤에 (먼저 보이면 듣기 전에 보기부터 읽는다)
    const wait = el('div', 'kor-q kor-listen-wait');
    wait.appendChild(el('p', 'kor-q-text', `🎧 처음부터 끝까지 들으면 물음 ${r.card.qs.length}개가 나와요`));
    wait.appendChild(el('p', 'kor-tnote', '▶ 듣기를 눌러요. 잘 안 들리면 🐢 천천히 들을 수 있어요.'));
    col.appendChild(wait);
    if (live) live.textContent = '';
    if (focusTo) moveFocus(col, 'head');
    return;
  }
  const q = r.card.qs[r.qi];
  const st = r.qs[r.qi];
  const unit = unitOf(r.card);
  const card = el('div', 'kor-q');
  const head = el('div', 'kor-q-head');
  head.appendChild(el('span', 'kor-q-no', `문제 ${r.qi + 1} / ${r.card.qs.length}`));
  head.appendChild(el('span', 'kor-q-skill', q.skill));
  card.appendChild(head);
  card.appendChild(el('p', 'kor-q-text', q.q));
  const opts = el('div', 'kor-opts');
  st.order.forEach((k, pos) => {
    const o = q.opts[k];
    const isWrong = st.wrong.includes(k);
    const isRight = st.answered && o.ok;
    const b = el('button', `kor-opt${isWrong ? ' is-no' : ''}${isRight ? ' is-ok' : ''}${st.answered && !o.ok && !isWrong ? ' is-dim' : ''}`);
    b.type = 'button';
    b.dataset.k = String(k);
    b.disabled = st.answered || isWrong;
    b.appendChild(el('span', 'kor-opt-mark', circled(pos + 1)));
    b.appendChild(el('span', '', o.t));
    b.addEventListener('click', () => pick(k));
    opts.appendChild(b);
  });
  card.appendChild(opts);
  const fb = el('p', 'kor-fb');
  const lastWrong = st.wrong.length ? q.opts[st.wrong[st.wrong.length - 1]] : null;
  if (st.answered) { fb.classList.add('is-ok'); fb.textContent = q.ev && !st.evDone ? '맞아요! 이제 그렇게 생각한 까닭을 글에서 찾아볼까요?' : '맞아요!'; }
  else if (lastWrong) { fb.classList.add('is-no'); fb.textContent = `🤔 ${hintOf(lastWrong.type, r)}`; }
  card.appendChild(fb);
  let say = fb.textContent;
  if (st.answered && q.ev) {
    const ev = evidenceEl(q, st, unit);
    card.appendChild(ev);
    const m = ev.querySelector('.kor-fb');
    if (m && m.textContent) say = m.textContent;
  }
  const qDone = st.answered && (!q.ev || st.evDone);
  if (qDone) {
    if (q.ev) for (const n of q.ev) { const m = main.querySelector(`.kor-read-body [data-n="${n}"]`); if (m) m.classList.add('is-mark'); }
    const note = el('div', 'kor-note');
    note.appendChild(el('p', '', `💡 ${q.ev ? q.evNote : q.doneNote}`));
    // 아까 고른 틀린 보기가 왜 틀렸나 — 틀릴 때는 종류 힌트만 주고(답을 미리 알려 주지 않게), 맞힌 뒤에 보여 준다 (Codex 48차 #6)
    for (const w of wrongNotes(q, st.wrong)) {
      const p = el('p', 'kor-note-wrong');
      p.appendChild(el('b', '', `✗ ${w.t}`));
      p.appendChild(document.createTextNode(` — ${w.why}`));
      note.appendChild(p);
    }
    card.appendChild(note);
    const last = r.qi === r.card.qs.length - 1;
    const next = el('button', 'btn btn-primary kor-next', last ? '다 풀었어요! →' : '다음 문제 →');
    next.type = 'button';
    next.addEventListener('click', () => { r.qi++; r.focus = 'head'; if (r.qi >= r.card.qs.length) finishCard(); else renderQ(); bringQ(); });
    card.appendChild(next);
  }
  col.appendChild(card);
  if (live) live.textContent = say;
  if (focusTo) moveFocus(col, focusTo === 'answer' ? (qDone ? 'next' : st.answered ? 'ev' : 'opt') : focusTo);
}

/** 틀린 보기 힌트 (순수) — 🎧 듣고 푸는 중이면 "들은 말" 말투(hintL), 글로 읽고 풀면 글 말투 */
export function hintOf(type, r) {
  const t = TYPES[type];
  if (!t) return '';
  return r && r.ls && !r.ls.text ? t.hintL : t.hint;
}

/** 새 물음(또는 다 읽은 카드)의 머리가 위쪽 띠에 가렸거나 화면 위로 지나갔으면 띠 바로 아래로 — 세로 화면에서 긴 근거 줄 아래
 *  "다음 문제"를 누르면 새 물음 머리가 화면 밖이었다 · 띠(sticky)를 셈에 넣는다 (Codex 48차 #3, css scroll-margin-top)
 *  🎧 다 들은 뒤 물음이 화면 아래 밖에 있어도 데려온다 (Codex 57차 #6 — 초점은 preventScroll이라 저절로 안 온다) */
function bringQ() {
  const col = document.querySelector('#korean-main .kor-qcol');
  if (!col) return;
  const bar = document.querySelector('#view-korean .topbar');
  const under = bar ? bar.getBoundingClientRect().bottom : 0;
  const top = col.getBoundingClientRect().top;
  if (top < under + 4 || top > window.innerHeight - 96) col.scrollIntoView({ block: 'start' });
}

function evidenceEl(q, st, unit) {
  const box = el('div', 'kor-ev');
  box.appendChild(el('p', 'kor-ev-title', `🔍 근거 잡기 — ${q.evQ}`));
  const rows = el('div', 'kor-ev-rows');
  const card = ui.read.card;
  for (let n = 1; n <= lineCount(card); n++) {
    const hit = st.evDone && q.ev.includes(n);
    const miss = st.evWrong.includes(n);
    const b = el('button', `kor-ev-row${hit ? ' is-mark' : ''}${miss ? ' is-no' : ''}`);
    b.type = 'button';
    b.dataset.n = String(n);
    b.disabled = st.evDone || miss;
    b.appendChild(el('span', 'kor-num', circled(n)));
    b.appendChild(el('span', '', lineText(card, n)));
    b.addEventListener('click', () => evPick(n));
    rows.appendChild(b);
  }
  box.appendChild(rows);
  const msg = el('p', 'kor-fb');
  if (st.evDone) { msg.classList.add('is-ok'); msg.textContent = `찾았어요! 근거 ${unit}: ${q.ev.map(circled).join(', ')}`; }
  // "까닭이 없어요"는 너무 단정적 — 그 문장도 조금은 관계있을 수 있다 (Codex 48차 #2)
  else if (st.evWrong.length) { msg.classList.add('is-no'); msg.textContent = `그 ${unit}보다 답을 더 잘 받쳐 주는 ${unit}을 찾아볼까요?`; }
  box.appendChild(msg);
  return box;
}

function pick(k) {
  const r = ui.read;
  if (!r || r.qi >= r.card.qs.length) return;
  const q = r.card.qs[r.qi];
  const st = r.qs[r.qi];
  if (st.answered || st.wrong.includes(k)) return;
  const o = q.opts[k];
  if (o.ok) {
    st.answered = true;
    try { sfx.ding(); } catch { /* 소리는 없어도 */ }
  } else {
    st.wrong.push(k);
    r.misses[o.type] = (r.misses[o.type] || 0) + 1; // 잘못 읽기 종류를 센다 — 다 읽을 때 한 번에 저장
    try { sfx.wrong(); } catch { /* 소리는 없어도 */ }
  }
  r.focus = 'answer';
  renderQ();
}

function evPick(n) {
  const r = ui.read;
  if (!r || r.qi >= r.card.qs.length) return;
  const q = r.card.qs[r.qi];
  const st = r.qs[r.qi];
  if (!st.answered || !q.ev || st.evDone || st.evWrong.includes(n)) return;
  if (q.ev.includes(n)) {
    st.evDone = true;
    try { sfx.ding(); } catch { /* 소리는 없어도 */ }
  } else {
    st.evWrong.push(n);
    r.evMiss += 1;
    try { sfx.wrong(); } catch { /* 소리는 없어도 */ }
  }
  r.focus = 'answer';
  renderQ();
}

/** 다 읽었다 — 저장(별·💰 한 트랜잭션) → 다 읽은 카드 */
async function finishCard() {
  const r = ui.read;
  if (!r || r.saving) return;
  r.saving = true;
  renderQ();
  let res;
  try {
    // 🎧 글로 읽고 풀었으면 🟩는 없다(별·💰·🎯는 같다)
    res = await korFinish(r.card.id, r.misses, (ui.cards || []).map((c) => c.id), r.evMiss, { noStone: !!(r.ls && r.ls.text) });
  } catch { res = { ok: false, why: 'save' }; }
  // 🥚 글 한 편을 끝까지 읽은 날 — 별이 없어도(다시 읽기도 공부). ★ 저장이 됐으면 화면과 상관없이 칸을 채운다
  //   (저장하는 사이 ← 도감을 누르면 그날 칸이 빠졌다, Codex 51차 — 🔤 낱말 판과 같은 꼴)
  const eggP = res && res.ok ? tickKorDay() : null;
  if (ui.read !== r) return; // 그 사이 도감으로 나갔다 — 그리기만 그만
  r.saving = false;
  r.result = res;
  r.focus = 'done';
  renderQ();
  if (res && res.ok && res.star) {
    try { sfx.success(); } catch { /* 소리는 없어도 */ }
    import('./catch.js').then((m) => m.burstConfetti(res.star === 3 ? 90 : 50)).catch(() => {});
  }
  if (eggP) {
    const egg = await eggP;
    if (ui.read === r && egg && egg.ok) { r.egg = egg; renderQ(); }
  }
}

/**
 * 🥚 국어 알 하루 칸 (글 한 편을 끝까지 · 🔤 오늘의 낱말을 끝낸 날) — 품는 알이 없으면 {ok:false}. 5일째면 그 트랜잭션에서 부화하고 🐣 화면을 띄운다
 * @returns {Promise<{ok:boolean, ticked?:boolean, hatched?:boolean, egg?:object}|null>}
 */
export async function tickKorDay() {
  let egg = null;
  try { egg = await tickEgg('korean', todayKey()); } catch { egg = null; }
  if (egg && egg.hatched) setTimeout(() => { showHatchIfAny(); }, 1200);
  return egg;
}

/** 🥚 끝 카드의 알 줄 (순수) — tickEgg 결과 → 말 · 오늘 이미 칸을 채웠으면 '' */
export function eggLine(e) {
  if (!e || !e.ok) return '';
  if (e.hatched) return '🐣 국어 알이 부화해요!';
  if (!e.ticked) return '';
  const pg = eggProgress(e.egg);
  return `🥚 국어 알 ${pg.done}/${pg.need}일 — 오늘 칸을 채웠어요`;
}

function finishEl() {
  const r = ui.read;
  const box = el('div', 'kor-done');
  if (r.saving || !r.result) { box.appendChild(el('p', 'kor-done-title', '저장하는 중…')); return box; }
  const res = r.result;
  const t = finishText(res, !!r.ls);
  const stars = res.ok ? res.stars : starsOf(korDoneMap(), r.card.id);
  box.classList.toggle('is-star', !!(res.ok && res.star));
  box.appendChild(el('p', 'kor-done-icon', r.card.icon));
  box.appendChild(el('p', 'kor-done-title', t.title));
  box.appendChild(el('p', 'kor-done-stars', '★'.repeat(stars) + '☆'.repeat(3 - stars)));
  for (const line of t.lines) box.appendChild(el('p', 'kor-done-line', line));
  if (res.ok && res.star && r.ls && r.ls.text) box.appendChild(el('p', 'kor-done-line', '🟩 국어스톤은 듣고 풀어서 한 번에 다 맞혔을 때 받아요')); // 🎧 글로 읽고 풀었다
  const eg = eggLine(r.egg);
  if (eg) box.appendChild(el('p', 'kor-done-line kor-egg', eg));
  const first = r.qs.filter((s) => !s.wrong.length).length;
  box.appendChild(el('p', 'kor-done-sub', `보기를 한 번에 맞힌 문제 ${first}개 · 「${r.card.title}」`));
  if (r.ls && !r.ls.text) box.appendChild(scriptEl(r.card)); // 🎧 다 푼 뒤에 들은 글 (글로 읽었으면 이미 위에 있다)
  const row = el('div', 'kor-done-btns');
  if (!res.ok && res.why !== 'unknown') {
    const again = el('button', 'btn btn-primary', '다시 저장하기');
    again.type = 'button';
    again.addEventListener('click', () => { r.result = null; finishCard(); });
    row.appendChild(again);
  }
  const list = el('button', `btn${res.ok ? ' btn-primary' : ''}`, '📚 도감으로');
  list.type = 'button';
  list.addEventListener('click', backToList);
  row.appendChild(list);
  if (res.ok) {
    const re = el('button', 'btn', r.ls ? '🔁 처음부터 다시 듣기' : '🔁 처음부터 다시 읽기');
    re.type = 'button';
    re.addEventListener('click', () => guardStart('korean', () => openCard(r.card.id)));
    row.appendChild(re);
  }
  box.appendChild(row);
  const cb = catchBtnEl(); // 🎯 별을 받았으면 국어 포켓몬 잡기
  if (cb) box.appendChild(cb);
  if (res.ok && r.card.write) box.appendChild(writeBoxEl(r.card, writeCtx)); // ✍️ 생각 쓰기 — 객관식 뒤, 건너뛰어도 별은 그대로
  return box;
}

// ───────────────────── 🎯 국어 포켓몬 잡기 (2026-10-11) ─────────────────────
// 별을 새로 받을 때마다 한 번(korean.korFinishRule이 korThrow.earned +1). 수학 runCatches와 같은 안전:
//  화면을 띄우기 **전에** 기회를 하나 빼고(xp.korTakeThrow — 두 창이 같은 기회를 두 번 던지지 못하게),
//  한 번도 안 던지고 닫으면 돌려준다(korGiveBackThrow). 후보는 📚 국어 전용 150마리 중 그림이 있는 것 — 4마리 안 되면 몇 마리 받아 온다

export const CATCH_WHY = {
  nopics: '🎯 포켓몬 그림을 아직 못 받았어요 — 인터넷이 되는 곳에서 다시 눌러 주세요 (몬스터볼은 그대로 있어요)',
  noavail: '🎯 지금은 만날 수 있는 포켓몬이 없어요 — 조금 뒤에 다시 눌러 주세요 (몬스터볼은 그대로 있어요)',
  save: '🎯 기록이 잠깐 저장되지 않았어요 — 다시 눌러 주세요 (몬스터볼은 그대로 있어요)',
  error: '🎯 잡기 화면을 열지 못했어요 — 다시 눌러 주세요 (몬스터볼은 돌려놨어요)',
  // 돌려주는 저장까지 안 됐다 — "돌려놨어요"라고 하면 거짓말이다 (Codex 49차 #2)
  errorOwed: '🎯 잡기 화면을 열지 못했어요 — 몬스터볼은 국어에 다시 들어오면 돌려줘요',
  owed: '🎯 몬스터볼을 돌려주는 기록이 잠깐 저장되지 않았어요 — 국어에 다시 들어오면 돌려줘요',
};

// 🎯 뺀 기회 장부 — 뺄 때 한 줄, 판정이 나면(attempt) 지우고, 돌려주기가 저장되면 지운다. 남은 줄은 국어에 들어올 때 돌려준다
const holds = holdStore('shincoach.korean.throwHolds');
/** 기회 하나 돌려주기 → 'ok' · 'none'(돌려줄 게 없다) · 'fail'(저장 안 됨 — houseDo는 실패를 오류 대신 {ok:false}로 준다, Codex 49차 #2) */
async function korGiveBack() {
  try { return refundOutcome(await korGiveBackThrow()); } catch { return 'fail'; }
}
let holdTimer = null;
/** 남은 예약을 돌려준다 — 돌려준 게 있으면 다시 그린다 · 다른 창의 줄은 그 창이 닫힌 지 1분 뒤에 (그때 다시 돈다) */
function settleKorThrows() {
  return holds.settle(korGiveBack).then((n) => {
    if (n > 0) refreshAfterCatch();
    const w = holds.waitMs();
    if (w !== null && !holdTimer) holdTimer = setTimeout(() => { holdTimer = null; settleKorThrows(); }, w + 1000);
    return n;
  }).catch(() => 0);
}

function koreanVisible() {
  const v = $('view-korean');
  return !!v && !v.hidden;
}

/** 잡기 후보 — 📚 국어 전용, 레벨에 열린 것, 😴 쉬는 중 빼고 */
async function korPool() {
  const read = async () => {
    let chars = [];
    try { chars = await loadCharacters(); } catch { chars = []; }
    const level = getLevelInfo().level;
    return forSubject(chars, 'korean').filter((c) => isUnlocked(c.id, level) && !isTired(c.id)).map((c) => ({ ...c, look: getLook(c.id) }));
  };
  let pool = await read();
  // 국어 그림이 4마리도 없으면(새 명단을 넣은 첫날) 몇 마리 받아서라도 — 번 기회를 그림이 없다고 삼키지 않는다 (8초 안에 못 받으면 있는 만큼)
  if (pool.length < 4 && navigator.onLine !== false) {
    try {
      await Promise.race([downloadCharacters(null, 6, 'korean'), new Promise((res) => setTimeout(res, 8000))]);
      pool = await read();
    } catch { /* 오프라인·실패 — 있는 만큼으로 */ }
  }
  return pool;
}

/** 국어 화면에 들어올 때마다 국어 포켓몬 그림을 조금씩 먼저 받아 둔다 (명단 맨 뒤라 영어 자동 받기로는 늦게 온다) */
function topUpKorChars() {
  if (ui.charBusy || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;
  ui.charBusy = true;
  downloadCharacters(null, 8, 'korean').catch(() => {}).then(() => { ui.charBusy = false; });
}

/** 🎯 잡기 단추 (남은 기회가 있을 때만) — 다 읽은 카드·도감 머리에 */
/** 잡기 창이 소식 없이 닫혔다(다른 화면이 catch.closeCatch를 불렀다) — 안 던졌으면 기회를 돌려주고 단추를 다시 살린다 */
function settleLostCatch() {
  const st = ui.catchState;
  if (!ui.catching || !st || isCatchOpen()) return null;
  ui.catchState = null;
  ui.catching = false;
  if (st.threw) return null; // 판정이 났다 — 쓴 기회
  return st.hold.refund(korGiveBack).then((ok) => { if (!ok) ui.catchMsg = CATCH_WHY.owed; refreshAfterCatch(); });
}

function catchBtnEl() {
  settleLostCatch();
  const n = korThrowsLeft();
  const box = el('div', 'kor-catch');
  if (n > 0) {
    const b = el('button', 'btn btn-primary kor-catch-btn', `🎯 국어 포켓몬 잡기 (몬스터볼 ${n}개)`);
    b.type = 'button';
    b.disabled = !!ui.catching;
    b.addEventListener('click', () => { runKorCatch().catch(() => {}); });
    box.appendChild(b);
  }
  if (ui.catchMsg) box.appendChild(el('p', 'kor-catch-msg', ui.catchMsg));
  return box.childNodes.length ? box : null;
}

/** 잡은 뒤(또는 못 열었을 때) 지금 화면을 다시 그린다 — 남은 기회 수가 바뀐다 */
function refreshAfterCatch() {
  if (!koreanVisible()) return;
  if (ui.read) renderQ();
  else if (anySession()) resumeSession();
  else renderList().catch(() => {});
}

export async function runKorCatch() {
  leaveKorean(); // 🎧 다시 듣던 소리는 잡기 창 밑에서 계속되지 않게 멈춘다 (Codex 57차 #7)
  await settleLostCatch(); // 남은 단추를 눌렀다 — 지난 창이 소식 없이 닫혔으면 먼저 정리
  if (ui.catching) return;
  ui.catching = true;
  ui.catchMsg = '';
  const done = () => { ui.catching = false; refreshAfterCatch(); };
  let pool = [];
  try { pool = await korPool(); } catch { pool = []; }
  if (!koreanVisible()) { ui.catching = false; return; } // 그 사이 나갔다 — 기회는 그대로(빼기 전)
  if (!pool.length) {
    let hasPics = false;
    try { hasPics = forSubject(await loadCharacters(), 'korean').length > 0; } catch { hasPics = false; }
    ui.catchMsg = CATCH_WHY[hasPics ? 'noavail' : 'nopics'];
    done();
    return;
  }
  let taken;
  try { taken = await korTakeThrow(); } catch { taken = { ok: false, why: 'save' }; }
  if (!taken || !taken.ok) { ui.catchMsg = taken && taken.why === 'none' ? '' : CATCH_WHY.save; done(); return; }
  const st = { threw: false, hold: holds.track() }; // 뺀 기회를 장부에 — 판정 전에 앱이 꺼져도 다음에 돌려준다 (Codex 49차 #1)
  if (!koreanVisible()) { await st.hold.refund(korGiveBack); ui.catching = false; return; } // 뺀 사이 나갔다 — 돌려준다
  ui.catchState = st;
  try {
    openCatch({
      candidates: pickCharacters(pool, 4), subject: 'korean', xpGain: 0, coinGain: 0, levelInfo: getLevelInfo(), levelUp: 0,
      ballCounts: inventory(),
      // 판정이 나는 순간 쓴 기회 — 장부의 줄을 지운다(동기). 판정 전에 닫히면 attempt가 안 불려 돌려준다
      attempt: (id, opts) => { st.threw = true; st.hold.judged(); return catchAttempt(id, Math.random, opts); },
      // ★ 한 번도 안 던지고 닫았으면 기회를 돌려준다 — 화면을 띄우기 전에 이미 뺐다 (저장이 안 되면 장부에 남아 다음에)
      onDone: (r) => {
        if (ui.catchState === st) ui.catchState = null;
        if (r && r.threw === false && !st.threw) st.hold.refund(korGiveBack).then((ok) => { if (!ok) ui.catchMsg = CATCH_WHY.owed; }).finally(done);
        else done();
      },
    });
  } catch {
    if (ui.catchState === st) ui.catchState = null;
    const back = await st.hold.refund(korGiveBack);
    ui.catchMsg = back ? CATCH_WHY.error : CATCH_WHY.errorOwed;
    done();
  }
}

/** 배선 (app.main) — ← 과목 고르기 · 다른 창에서 별을 받고 돌아오면 도감을 다시 그린다 */
export function initKorean({ showView }) {
  if (ui.wired) return;
  ui.wired = true;
  const back = $('btn-korean-back');
  if (back) back.addEventListener('click', () => showView('home'));
  // 🎧 앱을 내리면(다른 앱·화면 끔) 읽던 소리를 멈춘다 — 돌아오면 ▶ 다시 듣기
  document.addEventListener('visibilitychange', () => { if (document.hidden) leaveKorean(); });
  onProfileReload(() => {
    const v = $('view-korean');
    if (v && !v.hidden && !ui.read && !anySession() && !ui.wview && !profileLoading()) renderList().catch(() => {});
  });
}
