// 🚚 포켓몬 이사 대작전 화면 (v397) — 규칙·저장은 moveday.js(순수)·xp.js(move* = houseDo 한 트랜잭션), 그림은 movescene.js, 여기는 그리기·문제·연출
// 홈 카드(대여행 자리) → 함께 갈 6마리 → 단계 지도 → 일(문제) → 🍙 새참 → … → 🚀 → 보상 → 벽지·바닥 → 손님 → 가구 → 새 집 첫 밤 → 한 줄 쓰기
// 틀 양식은 대여행(.jr-*)을 그대로 쓴다 · 문제 원천도 대여행과 같다(journeyview.loadSources) — 공부 기록에 안 남긴다
// 아이 화면에 남은 수·셈을 쓰지 않는다 — 일의 양은 숫자 없는 막대로만
import { MOVE, STAGES, PER_STAGE, MOVE_STOPS, stopAt, hpOfStop, helps, strongStages, moveState, pendingEvent, makeGuests, makeMoveEvents } from './moveday.js';
import { JOURNEY, TYPE_KO, typesOf, questionFrom, questionSeed, profChoices, rngOf, crispPx, ownedIds } from './journey.js';
import { loadSources } from './journeyview.js';
import { paintMove } from './movescene.js';
import { journeyRaw, moveStart, moveAnswer, moveSwap, moveEvent, moveGift, movePick, moveFurn, moveEnd, getProfileSnapshot, getLevelInfo, rarityOf, monLv, getLook, profileReady, getPartner } from './xp.js';
import { ROSTER, loadCharacters, ensureCast, isUnlocked, isLegendary, isUltraBeast, isLetterMon } from './pokemon.js';
import { PAINT, PAINT_BASE } from './house.js';
import { avatarOf } from './avatar.js';
import { avatarSvg } from './avatarart.js';
import { MOVES } from './battle.js';
import { STONES } from './items.js';
import { todayKey } from './track.js';
import { sfx, unlock } from './sfx.js';
import * as bgm from './bgm.js';
import { enterCalmTrip, leaveCalmTrip, toggleCalm } from './calm.js';
import { createFx, impact, fxKindOf, faintStars, makeStage } from './jrscene.js';
import { josa } from './catch.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
function btn(cls, text, onClick) {
  const b = el('button', `btn ${cls}`, text);
  b.type = 'button';
  if (onClick) b.addEventListener('click', onClick);
  return b;
}
const play = (name) => { try { if (sfx[name]) sfx[name](); } catch { /* 소리 없이 */ } };
const koOf = (id) => { const r = ROSTER.find((m) => m.id === Number(id)); return r ? r.ko : String(id); };
const TITLE = '🚚 포켓몬 이사 대작전';
const newId = () => Array.from({ length: 12 }, () => '0123456789abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 36)]).join('');
/** 주인공 이름 — 캐릭터 이름이 있으면 그것 */
const hero = () => avatarOf(getProfileSnapshot()).name || '진우';

let root = null;
let stage = null;
const ui = { open: false, run: 0, chars: new Map(), src: null, cur: null, mon: null, busy: false };

/** 헤드리스 시험용 (?nosw=1에서만) — 지금 문제를 window에 */
const devQ = (q) => { try { if (/[?&]nosw=1/.test(location.search)) window.__moveQ = q; } catch { /* 무시 */ } };

// ───────────── 홈 카드 ─────────────

/** 대여행 자리에 이사 카드 — 이사 카드를 낼 때가 아니면 journeyview가 부르지 않는다 */
export function mountMoveCard(box) {
  if (!box) return;
  const st = moveState(journeyRaw(), todayKey());
  box.innerHTML = '';
  const card = el('button', 'jr-home mvt-home');
  card.type = 'button';
  card.addEventListener('click', () => openMove());
  const band = el('span', 'jr-home-band');
  STAGES.forEach((s, i) => band.appendChild(el('span', `jr-z${i}`, s.emoji)));
  card.appendChild(band);
  const body = el('span', 'jr-home-body');
  body.appendChild(el('b', 'jr-home-title', TITLE));
  body.appendChild(el('span', 'jr-home-sub', st.mode === 'open' ? '포켓몬 친구들도 이사한대요!' : st.mode === 'go' ? '이사를 이어 가요' : '새 집이 기다려요!'));
  card.appendChild(body);
  box.appendChild(card);
  box.hidden = false;
}

// ───────────── 창 ─────────────

function build() {
  root = el('div', 'jr');
  root.id = 'mv-trip';
  root.hidden = true;
  root.innerHTML = `
    <div class="jr-card" role="dialog" aria-modal="true" aria-label="포켓몬 이사 대작전">
      <div class="jr-top"><span class="jr-title">${TITLE}</span><span class="jr-zone"></span><button type="button" class="btn jr-music" data-calm hidden>🎵</button><button type="button" class="btn jr-x" aria-label="닫기 — 나중에 이어 하기">✕</button></div>
      <div class="jr-body"></div>
    </div>`;
  document.body.appendChild(root);
  stage = makeStage(window);
  root.querySelector('.jr-x').addEventListener('click', () => { if (!ui.busy) closeMove(); });
  root.querySelector('.jr-music').addEventListener('click', toggleCalm);
  root.addEventListener('pointerdown', () => { try { unlock(); } catch { /* 무시 */ } }, { passive: true });
}
const body = () => root.querySelector('.jr-body');
function topBar(c) {
  const z = root.querySelector('.jr-zone');
  if (c && c.phase === 'go') {
    const i = stopAt(c, c.at).stage;
    z.textContent = `${STAGES[i].emoji} ${STAGES[i].ko}`;
    z.className = `jr-zone jr-z${i}`; // 대여행 구역 여섯과 같은 색 띠
  } else { z.textContent = ''; z.className = 'jr-zone'; }
}
function fresh(c) {
  ui.run++;
  ui.busy = false;
  if (stage) stage.set([]);
  topBar(c);
  const b = body();
  b.innerHTML = '';
  b.scrollTop = 0;
  return { b, run: ui.run };
}
const alive = (run) => ui.open && run === ui.run;
function dlg(text) {
  const d = el('div', 'jr-dlg');
  String(text).split('\n').forEach((line, i) => { if (i) d.appendChild(el('br')); d.appendChild(document.createTextNode(line)); });
  return d;
}
function setDlg(d, text) {
  d.textContent = '';
  String(text).split('\n').forEach((line, i) => { if (i) d.appendChild(el('br')); d.appendChild(document.createTextNode(line)); });
}
function artCanvas(cls) {
  const cv = el('canvas', cls);
  cv.setAttribute('aria-hidden', 'true');
  return cv;
}
const calmMotion = () => !stage || stage.reduce;
function anim(node, frames, opts) {
  try { if (node && typeof node.animate === 'function') return node.animate(frames, opts); } catch { /* 움직임 없이 */ }
  return null;
}
function waitTap(ms) {
  return new Promise((res) => {
    let tm = 0;
    const end = () => { clearTimeout(tm); root.removeEventListener('pointerdown', end, true); res(); };
    tm = setTimeout(end, ms);
    root.addEventListener('pointerdown', end, true);
  });
}

/** 창 열기 */
export async function openMove() {
  if (ui.open) return;
  if (!root) build();
  await profileReady();
  ui.open = true;
  ui.mon = null;
  root.style.setProperty('--jr-dlg', `${crispPx(24, window.devicePixelRatio || 1)}px`);
  root.hidden = false;
  let calm = false;
  try { calm = enterCalmTrip(); } catch { calm = false; }
  root.querySelector('.jr-music').hidden = !calm;
  if (!calm) { try { bgm.play(); } catch { /* 음악 없이 */ } }
  const { b, run } = fresh(null);
  b.appendChild(dlg('이삿짐을 살피는 중…'));
  try { const list = await loadCharacters(); ui.chars = new Map((list || []).map((c) => [c.id, c.url])); } catch { ui.chars = new Map(); }
  ui.src = await loadSources();
  if (!alive(run)) return;
  route();
}
/** 창 닫기 — 이사는 저장된 자리에 그대로 */
export function closeMove() {
  if (!root) return;
  ui.open = false;
  ui.run++;
  ui.busy = false;
  root.hidden = true;
  if (stage) stage.stop();
  try { leaveCalmTrip(); } catch { /* 무시 */ }
  try { bgm.stop(); } catch { /* 무시 */ }
  import('./journeyview.js').then((m) => m.mountJourneyCard()).catch(() => {});
}
/** 이사 창이 떠 있나 */
export const isMoveOpen = () => !!root && !root.hidden;

function route() {
  const st = moveState(journeyRaw(), todayKey());
  ui.cur = st.m || null;
  if (st.mode === 'go') renderMap();
  else if (st.mode === 'gift') renderWin();
  else if (st.mode === 'pick') renderGuests();
  else if (st.mode === 'furn') renderFurn();
  else if (st.mode === 'last') renderNight();
  else if (st.mode === 'open') renderPrep();
  else closeMove();
}

// ───────────── 포켓몬 그림 ─────────────

function urlOf(id) {
  const look = getLook(id);
  if (look && (look.formUrl || look.shinyUrl)) return look.formUrl || look.shinyUrl;
  return ui.chars.get(Number(id)) || '';
}
function monFig(id, cls = '') {
  const t = typesOf(id)[0];
  const f = el('span', `jr-mon jr-t-${t}${cls ? ` ${cls}` : ''}`);
  const url = urlOf(id);
  if (url) {
    const img = el('img');
    img.src = url;
    img.alt = koOf(id);
    img.draggable = false;
    f.appendChild(img);
  } else { f.classList.add('is-alt'); f.appendChild(el('span', 'jr-mon-alt', koOf(id).slice(0, 1))); }
  return f;
}
function typeChips(id) {
  const box = el('span', 'jr-types');
  for (const t of typesOf(id)) box.appendChild(el('span', `jr-chip jr-t-${t}`, TYPE_KO[t] || t));
  return box;
}
async function ensureArts(ids, ms = 5000) {
  const need = [...new Set(ids.map(Number))].filter((id) => !ui.chars.get(id));
  if (!need.length) return;
  try {
    const got = await Promise.race([ensureCast(need), sleep(ms).then(() => [])]);
    for (const c of got || []) if (c && c.url) ui.chars.set(Number(c.id), c.url);
  } catch { /* 그림 없이 */ }
}
function rowEl(k, v) {
  const r = el('div', 'jr-row');
  r.appendChild(el('span', '', k));
  r.appendChild(el('b', '', v));
  return r;
}

// ───────────── 출발 준비 ─────────────

function renderPrep() {
  const { b, run } = fresh(null);
  const p = getProfileSnapshot();
  const owned = ownedIds(p).sort((x, y) => monLv(y) - monLv(x) || x - y);
  const need = Math.min(MOVE.party, owned.length);
  const party = [];
  let spot = owned[0];
  const who = hero();
  b.appendChild(dlg(`${who}${josa(who, '이', '가')} 이사했대!\n우리도 따라가자!`));
  b.appendChild(el('h2', 'jr-h', '함께 이사할 포켓몬'));
  const slots = el('div', 'jr-slots');
  const spotBox = el('div', 'jr-spot');
  const grid = el('div', 'jr-owned');
  const go = btn('btn-primary jr-go', '이사 시작!');
  const note = el('p', 'jr-note');
  const avail = Object.keys(ui.src || {}).filter((s) => ui.src[s]);
  const draw = () => {
    slots.innerHTML = '';
    for (let i = 0; i < need; i++) {
      const id = party[i];
      const s = el('button', `jr-slot${id ? '' : ' is-empty'}`);
      s.type = 'button';
      if (id) { s.appendChild(monFig(id)); s.appendChild(el('span', 'jr-slot-name', koOf(id))); s.addEventListener('click', () => { party.splice(i, 1); draw(); }); s.setAttribute('aria-label', `${koOf(id)} 빼기`); } else { s.appendChild(el('span', 'jr-slot-plus', '+')); s.disabled = true; }
      slots.appendChild(s);
    }
    spotBox.innerHTML = '';
    if (spot) {
      spotBox.appendChild(monFig(spot, 'is-big'));
      const info = el('div', 'jr-spot-info');
      info.appendChild(el('b', '', `${koOf(spot)} · Lv.${monLv(spot)}`));
      info.appendChild(typeChips(spot));
      const zs = strongStages(spot);
      info.appendChild(el('span', 'jr-sub', zs.length ? `${zs.map((i) => STAGES[i].short).join(' · ')}에서 힘을 내요` : '어떤 일이든 꾸준히 도와요'));
      spotBox.appendChild(info);
    }
    for (const c of grid.children) c.classList.toggle('is-in', party.includes(Number(c.dataset.id)));
    go.disabled = party.length !== need || !avail.length;
    note.textContent = !avail.length ? '아직 낼 문제가 없어요 — 공부를 조금 더 하고 이사해요' : party.length === need ? '' : `포켓몬을 ${need}마리 골라요`;
  };
  for (const id of owned) {
    const c = el('button', 'jr-pickmon');
    c.type = 'button';
    c.dataset.id = String(id);
    c.appendChild(monFig(id));
    c.setAttribute('aria-label', koOf(id));
    c.addEventListener('click', () => {
      spot = id;
      const k = party.indexOf(id);
      if (k >= 0) party.splice(k, 1); else if (party.length < need) party.push(id);
      draw();
    });
    grid.appendChild(c);
  }
  b.appendChild(slots);
  b.appendChild(spotBox);
  b.appendChild(grid);
  const win = el('div', 'jr-stake is-win');
  win.appendChild(el('h3', '', '이사가 끝나면'));
  for (const [k, v] of [['🏠 넓은 새 집', '2층까지'], ['🖌️ 벽지 · 바닥', '골라서 선물'], ['💰 코인', `+${JOURNEY.coins}`], [STONES.map((s) => s.emoji).join(''), '+1씩'], ['함께 간 포켓몬', 'Lv +1'], ['🎉 손님', '하나 데려오기']]) win.appendChild(rowEl(k, v));
  b.appendChild(win);
  b.appendChild(el('p', 'jr-sub', '일을 할 때마다 문제가 나와요. 틀려도 잃는 것이 없고, 며칠에 나눠서 해도 돼요.'));
  b.appendChild(note);
  go.addEventListener('click', () => start(party.slice(), run, go));
  b.appendChild(go);
  draw();
}

/** 손님 후보 — 대여행 야생과 같은 기준(전설·울트라비스트·편지 포켓몬 뺌) · 그림이 있는 것 먼저 */
function candidates() {
  const level = getLevelInfo().level;
  const caught = getProfileSnapshot().caught || {};
  const ok = (id) => id !== 52 && !isLegendary(id) && !isUltraBeast(id) && !isLetterMon(id) && rarityOf(id) <= 3;
  const open = ROSTER.filter((r) => ok(r.id) && isUnlocked(r.id, level));
  const withArt = open.filter((r) => ui.chars.has(r.id));
  const list = withArt.length >= 8 ? withArt : open.length >= 8 ? open : ROSTER.filter((r) => ok(r.id));
  return list.map((r) => ({ id: r.id, caught: (caught[r.id] || 0) > 0, rarity: rarityOf(r.id) }));
}

async function start(party, run, go) {
  if (ui.busy) return;
  ui.busy = true;
  go.disabled = true;
  const cands = candidates();
  const guests = makeGuests(cands, Math.random);
  if (!guests) { ui.busy = false; go.disabled = false; return; }
  const r = await moveStart({ id: newId(), party, guests, ev: makeMoveEvents(guests, cands, Math.random) });
  if (!alive(run)) return;
  ui.busy = false;
  if (!r.ok) {
    if (r.why === 'going') { route(); return; }
    go.disabled = false;
    body().querySelector('.jr-note').textContent = r.why === 'save' ? '저장이 안 돼서 시작하지 못했어요. 잠시 뒤 다시 눌러 봐요' : '시작하지 못했어요. 다시 골라 봐요';
    return;
  }
  ui.cur = r.cur;
  ui.mon = null;
  play('whoosh');
  await ensureArts([...r.cur.guests, 52, ...r.cur.ev.map((e) => e.m || e.alt).filter(Boolean)]);
  if (!alive(run)) return;
  renderMap();
}

// ───────────── 지도 ─────────────

function renderMap() {
  const c = ui.cur;
  if (!c) { route(); return; }
  const { b } = fresh(c);
  const now = stopAt(c, c.at).stage;
  const rocket = c.at === MOVE_STOPS - 1;
  const grid = el('div', 'mvt-map');
  const views = [];
  STAGES.forEach((s, i) => {
    const done = i < now;
    const tile = el('div', `mvt-tile${done ? ' is-done' : ''}${i === now ? ' is-now' : ''}`);
    const cv = artCanvas('mvt-tile-art');
    tile.appendChild(cv);
    tile.appendChild(el('span', 'mvt-tile-name', `${done ? '✓ ' : `${s.emoji} `}${s.ko}`));
    grid.appendChild(tile);
    views.push({ cv, fps: 6, draw: (g, w, h, t) => paintMove(g, w, h, t, s.key) });
  });
  b.appendChild(grid);
  if (stage) stage.set(views);
  const pend = pendingEvent(c);
  b.appendChild(dlg(rocket ? '앗! 선물 상자가 없어졌다?!' : c.at % PER_STAGE === 0 ? STAGES[now].arrive : `다음은 ${stopName(stopAt(c, c.at))}!`));
  const row = el('div', 'jr-btns');
  if (pend >= 0) {
    const k = c.ev[pend].k;
    row.appendChild(btn('btn-primary jr-next', `${EV_ICON[k]} ${k === 'chest' ? '상자 열어 보기' : k === 'prof' ? '박사님의 퀴즈' : '누구를 부를까?'}`, () => renderEvent(pend)));
  } else {
    const going = c.hp < hpOfStop(stopAt(c, c.at));
    row.appendChild(btn('btn-primary jr-next', going ? '일 이어 하기' : rocket ? '🚀 쫓아가자!' : '다음 일로', () => renderChoose()));
  }
  row.appendChild(btn('jr-rest', '⛺ 쉬었다 하기', () => closeMove()));
  b.appendChild(row);
  b.appendChild(el('p', 'jr-legend', '⛺ 쉬었다 하기 — 이 자리에 그대로 두고 언제든 이어 해요'));
}

// ───────────── 단계 이벤트 ─────────────

const EV_ICON = { chest: '🎁', prof: '🔬', fork: '🔀' };

function renderEvent(z) {
  const c = ui.cur;
  if (!c || pendingEvent(c) !== z) { route(); return; }
  const k = c.ev[z].k;
  if (k === 'chest') renderChest();
  else if (k === 'prof') renderProf(z);
  else renderFork(z);
}
function eventDone(line, text) {
  setDlg(line, text);
  body().appendChild(btn('btn-primary jr-next', '다음으로', () => renderMap()));
}
async function sendEvent(run, req, buttons, line) {
  if (ui.busy) return null;
  ui.busy = true;
  buttons.forEach((m) => { m.disabled = true; });
  const r = await moveEvent({ id: ui.cur.id, qn: ui.cur.qn, ...req });
  if (!alive(run)) return null;
  ui.busy = false;
  if (!r.ok) {
    if (r.why === 'changed') { route(); return null; }
    buttons.forEach((m) => { m.disabled = false; });
    setDlg(line, '저장이 안 됐어요. 다시 골라 봐요');
    return null;
  }
  ui.cur = r.cur || null;
  topBar(ui.cur);
  return r;
}
function choiceRow(choices, onPick) {
  const moves = el('div', 'jr-moves');
  choices.forEach((ch) => {
    const m = el('button', 'jr-move jr-stripe-normal');
    m.type = 'button';
    if (ch.node) m.appendChild(ch.node()); else m.appendChild(document.createTextNode(ch.text));
    m.addEventListener('click', () => onPick(ch, m));
    moves.appendChild(m);
  });
  return moves;
}
function say(word) {
  try {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(word);
    u.lang = 'en-US';
    u.rate = 0.85;
    window.speechSynthesis.speak(u);
  } catch { /* 소리 없이 */ }
}
function stemOf(q) {
  const stem = el('div', 'jr-q-stem');
  if (q.qNode) stem.appendChild(q.qNode());
  else if (q.word) {
    stem.appendChild(el('span', 'jr-q-word', q.word));
    const hear = btn('jr-q-hear', '🔊', () => say(q.word));
    hear.setAttribute('aria-label', '단어 듣기');
    stem.appendChild(hear);
    stem.appendChild(el('span', 'jr-q-ask', '— 뜻은?'));
    say(q.word);
  } else stem.textContent = q.q;
  return stem;
}
const buildQuestion = (c, shift = 0) => questionFrom(ui.src, c, shift);

function renderChest() {
  const c = ui.cur;
  const { b, run } = fresh(c);
  b.appendChild(el('div', 'jr-event-art', '🎁'));
  const line = dlg('짐 사이에서 상자를 찾았다!\n문제를 맞히면 상자가 열려요.');
  b.appendChild(line);
  const built = buildQuestion(c, 1);
  if (!built) {
    const pass = btn('btn-primary jr-next', '그냥 지나가기', async () => { const r = await sendEvent(run, { kind: 'chest', skip: true }, [pass], line); if (r) renderMap(); });
    b.appendChild(pass);
    return;
  }
  const { subj, q } = built;
  devQ({ subj, ...q, ev: 'chest' });
  const card = el('div', 'jr-q');
  card.appendChild(el('span', 'jr-q-label', q.label));
  card.appendChild(stemOf(q));
  b.appendChild(card);
  const moves = choiceRow(q.choices, async (ch, m) => {
    const all = [...moves.children];
    const r = await sendEvent(run, { kind: 'chest', subj, correct: !!ch.ok }, all, line);
    if (!r) return;
    const right = q.choices.findIndex((x) => x.ok);
    if (all[right]) all[right].classList.add('is-ok');
    if (!ch.ok) m.classList.add('is-no');
    play(ch.ok ? 'success' : 'wrong');
    eventDone(line, ch.ok ? `상자가 열렸다!\n💰 ${r.coins} 코인을 찾았다!` : `아쉽다! 상자는 그대로 트럭에 싣자.\n정답은 「${q.choices[right] ? q.choices[right].text : ''}」`);
  });
  b.appendChild(moves);
}

function renderProf(z, typeOnly = false) {
  const c = ui.cur;
  const e = c.ev[z];
  const { b, run } = fresh(c);
  const pool = candidates().map((x) => x.id);
  let f = !typeOnly && e.f === 'shadow' && urlOf(e.m) ? 'shadow' : 'type';
  let choices = profChoices(e.m, f, pool, koOf, rngOf(questionSeed(c)));
  if (!choices) { f = 'type'; choices = profChoices(e.m, 'type', pool, koOf, rngOf(questionSeed(c))); }
  devQ({ ev: 'prof', f, choices });
  const ko = koOf(e.m);
  const fig = monFig(e.m, `is-big jr-prof-mon${f === 'shadow' ? ' is-shadow' : ''}`);
  const img = fig.querySelector('img');
  if (img && f === 'shadow') img.alt = '그림자';
  let answered = false;
  const broken = () => { if (!answered && alive(run)) renderProf(z, true); };
  if (img && f === 'shadow') {
    img.addEventListener('error', broken, { once: true });
    if (img.complete && !img.naturalWidth) setTimeout(broken, 0);
  }
  const art = el('div', 'jr-event-art');
  art.appendChild(el('span', 'jr-prof', '🧑‍🔬'));
  art.appendChild(fig);
  b.appendChild(art);
  if (f === 'type') b.appendChild(el('b', 'jr-prof-name', ko));
  const line = dlg(f === 'shadow' ? '포켓몬 박사: 「이사 축하해! 이 그림자는 누구일까?」' : `포켓몬 박사: 「이사 축하해! ${ko}${josa(ko, '은', '는')} 무슨 타입일까?」`);
  b.appendChild(line);
  const moves = choiceRow(choices || [], async (ch, m) => {
    const all = [...moves.children];
    answered = true;
    const r = await sendEvent(run, { kind: 'prof', correct: !!ch.ok }, all, line);
    if (!r) { answered = false; return; }
    const right = choices.findIndex((x) => x.ok);
    if (all[right]) all[right].classList.add('is-ok');
    if (!ch.ok) m.classList.add('is-no');
    fig.classList.remove('is-shadow');
    if (img) img.alt = ko;
    play(ch.ok ? 'success' : 'wrong');
    const answer = f === 'shadow' ? ko : `${choices[right] ? choices[right].text : ''} 타입`;
    eventDone(line, ch.ok ? `정답이야! ${f === 'shadow' ? `${ko}였어!` : '훌륭해!'}\n💰 ${r.coins} 코인을 받았다!` : `아깝다! 정답은 「${answer}」\n다음엔 맞힐 수 있을 거야!`);
  });
  b.appendChild(moves);
}

/** 🔀 집들이에 부를 손님 — 둘 가운데 하나 */
function renderFork(z) {
  const c = ui.cur;
  const e = c.ev[z];
  const { b, run } = fresh(c);
  const pair = [c.guests[e.g], e.alt];
  if (rngOf(questionSeed(c))() < 0.5) pair.reverse();
  const caught = getProfileSnapshot().caught || {};
  const line = dlg('집들이 초대장이 한 장 남았다!\n누구를 부를까?');
  b.appendChild(el('div', 'jr-event-art', '💌'));
  b.appendChild(line);
  const cards = el('div', 'jr-fork');
  const all = [];
  for (const id of pair) {
    const k = el('button', `jr-pc jr-t-${typesOf(id)[0]}-soft`);
    k.type = 'button';
    k.appendChild(monFig(id));
    k.appendChild(el('b', '', koOf(id)));
    k.appendChild(typeChips(id));
    if (!((caught[id] || 0) > 0)) k.appendChild(el('span', 'jr-super-tag', '✨ 처음 보는 포켓몬'));
    k.addEventListener('click', async () => {
      const r = await sendEvent(run, { kind: 'fork', pick: id }, all, line);
      if (!r) return;
      k.classList.add('is-sel');
      play('whoosh');
      const ko = koOf(id);
      eventDone(line, `${ko}${josa(ko, '을', '를')} 집들이에 부르자!`);
    });
    all.push(k);
    cards.appendChild(k);
  }
  b.appendChild(cards);
}

// ───────────── 일 ─────────────

const stopName = (s) => (s.kind === 'guest' ? `손님 ${koOf(s.mon)}` : s.kind === 'rocket' ? '🚀 로켓단' : `${s.kind === 'big' ? '👑 ' : ''}${s.job.ko}`);
function stopLine(s) {
  if (s.kind === 'guest') { const ko = koOf(s.mon); return `${ko}${josa(ko, '이', '가')} 놀러 왔다!\n맞히면 친해져요.`; }
  if (s.kind === 'rocket') return '「그 선물 상자는 우리가 가져간다!」\n「안 돼! 우리 집들이 선물이야!」';
  return s.kind === 'big' ? `큰일이다! ${s.job.ko}!\n다 같이 힘을 내자!` : `${s.job.ko}!`;
}
function stopDone(s) {
  if (s.kind === 'guest') { const ko = koOf(s.mon); return `${ko}${josa(ko, '과', '와')} 친해졌다!`; }
  if (s.kind === 'rocket') return '로켓단은 멀리 날아갔다!\n선물 상자를 되찾았다!';
  return `${s.job.ko} 끝!`;
}

function renderChoose() {
  const c = ui.cur;
  if (!c || c.phase !== 'go') { route(); return; }
  if (ui.mon && c.party.includes(ui.mon) && c.hp < hpOfStop(stopAt(c, c.at))) { renderWork(); return; }
  const s = stopAt(c, c.at);
  const { b } = fresh(c);
  b.appendChild(dlg(`${stopLine(s)}\n누가 할까?`));
  const grid = el('div', 'jr-choose');
  for (const id of c.party) {
    const card = el('button', 'jr-choose-card');
    card.type = 'button';
    card.appendChild(monFig(id));
    card.appendChild(el('b', '', koOf(id)));
    card.appendChild(typeChips(id));
    if (helps(id, s)) card.appendChild(el('span', 'jr-super-tag', '딱 맞는 일이야!'));
    card.addEventListener('click', () => { ui.mon = id; renderWork(); });
    grid.appendChild(card);
  }
  b.appendChild(grid);
  const good = STAGES[s.stage].types.map((t) => TYPE_KO[t] || t).join(' · ');
  if (s.kind !== 'rocket') b.appendChild(el('p', 'jr-sub', `잘 돕는 친구: ${good}`));
}

/** 일 막대 — 숫자 없이 줄기만 한다 */
function bar(left, max) {
  const box = el('span', 'mvt-bar');
  box.setAttribute('aria-hidden', 'true');
  const i = el('i');
  i.style.width = `${Math.round((left / max) * 100)}%`;
  box.appendChild(i);
  return { box, set: (n) => { i.style.width = `${Math.round((n / max) * 100)}%`; } };
}
function jobFig(s) {
  if (s.kind === 'guest' || s.kind === 'rocket') return monFig(s.mon, 'is-big jr-foe');
  return el('span', 'mvt-job', s.job.emoji);
}
function floatUp(arena, node, text) {
  const ar = arena.getBoundingClientRect(), r = node.getBoundingClientRect();
  const p = el('span', 'jr-pop mvt-pop', text);
  p.style.left = `${r.left - ar.left + r.width * 0.4}px`;
  p.style.top = `${r.top - ar.top - 6}px`;
  arena.appendChild(p);
  const an = anim(p, [{ transform: 'translateY(8px) scale(.6)', opacity: 0 }, { transform: 'translateY(-6px) scale(1.15)', opacity: 1, offset: 0.2 }, { transform: 'translateY(-40px) scale(1)', opacity: 0 }], { duration: 950, easing: 'ease-out' });
  if (an && an.finished) an.finished.catch(() => {}).then(() => p.remove()); else setTimeout(() => p.remove(), 950);
}
const moveKind = (id) => typesOf(id).find((x) => MOVES[x]) || 'normal';

function renderWork(msg) {
  const c = ui.cur;
  if (!c || c.phase !== 'go') { route(); return; }
  if (!ui.mon || !c.party.includes(ui.mon)) { renderChoose(); return; }
  const s = stopAt(c, c.at);
  const max = hpOfStop(s);
  const { b, run } = fresh(c);
  const arena = el('div', 'jr-arena mvt-arena');
  const bg = artCanvas('jr-arena-bg');
  const fxc = artCanvas('jr-arena-fx');
  const slot = (side, fig, extra = '') => {
    const sl = el('div', `jr-stand ${side}${extra}`);
    const act = el('div', 'jr-act');
    const bob = el('div', 'jr-bob');
    bob.appendChild(fig);
    act.appendChild(bob);
    sl.appendChild(act);
    return [sl, act];
  };
  const foeFig = jobFig(s);
  const myFig = monFig(ui.mon, 'is-big jr-me');
  const [foeSlot, foeAct] = slot('is-foe', foeFig, s.kind === 'big' || s.kind === 'rocket' ? ' is-boss' : '');
  const [meSlot, meAct] = slot('is-me', myFig);
  const plate = el('div', 'jr-plate is-foe');
  plate.appendChild(el('b', 'jr-plate-name', stopName(s)));
  const work = bar(c.hp, max);
  plate.appendChild(work.box);
  const mine = el('div', 'jr-plate is-me');
  const mn = el('span', 'jr-plate-name');
  mn.appendChild(el('b', '', koOf(ui.mon)));
  mine.appendChild(mn);
  mine.appendChild(btn('jr-swapmon', '교체', () => { if (!ui.busy) { ui.mon = null; renderChoose(); } }));
  for (const n of [bg, foeSlot, meSlot, fxc, plate, mine]) arena.appendChild(n);
  b.appendChild(arena);
  const fx = createFx();
  const key = STAGES[s.stage].key;
  if (stage) stage.set([{ cv: bg, fps: 20, draw: (g, w, h, t) => paintMove(g, w, h, t, key) }, { cv: fxc, fx, draw: (g, w, h, t, dt) => { fx.step(dt); g.clearRect(0, 0, w, h); fx.draw(g); } }]);
  const adv = helps(ui.mon, s);
  if (adv) b.appendChild(el('div', 'jr-super', '딱 맞는 일이야! 맞히면 두 배로 줄어요'));
  const my = koOf(ui.mon);
  const line = dlg(msg || stopLine(s));
  b.appendChild(line);
  const built = buildQuestion(c);
  if (!built) {
    b.appendChild(el('p', 'jr-note', '문제를 만들지 못했어요. 창을 닫았다가 다시 열어 봐요'));
    return;
  }
  const { subj, q } = built;
  devQ({ subj, ...q });
  const card = el('div', 'jr-q');
  card.appendChild(el('span', 'jr-q-label', q.label));
  card.appendChild(stemOf(q));
  b.appendChild(card);
  const head = el('div', 'jr-movehead');
  head.appendChild(el('span', '', `정답을 고르면 ${my}${josa(my, '이', '가')} 힘을 내요!`));
  const swap = btn('jr-swapq', '🔄 다른 문제', () => doSwap(run, swap));
  swap.disabled = c.swap === c.at;
  head.appendChild(swap);
  b.appendChild(head);
  const moves = el('div', 'jr-moves');
  const myType = typesOf(ui.mon)[0];
  q.choices.forEach((ch) => {
    const m = el('button', `jr-move jr-stripe-${myType}`);
    m.type = 'button';
    if (ch.node) m.appendChild(ch.node()); else m.appendChild(document.createTextNode(ch.text));
    m.addEventListener('click', () => answer(run, { subj, q, ch, m, moves, swap, line, work, arena, fx, fxc, foeAct, meAct, foeFig, myFig, s }));
    moves.appendChild(m);
  });
  b.appendChild(moves);
}

async function doSwap(run, swap) {
  const c = ui.cur;
  if (ui.busy || !c || c.swap === c.at) return;
  ui.busy = true;
  swap.disabled = true;
  const r = await moveSwap({ id: c.id, qn: c.qn });
  if (!alive(run)) return;
  ui.busy = false;
  if (r.ok) { ui.cur = r.cur; renderWork(); return; }
  if (r.why === 'changed' || r.why === 'event') { route(); return; }
  if (r.why !== 'used') swap.disabled = false;
}

/** 힘쓰기 연출 — 내 포켓몬이 달려들고 일이 들썩인다 */
function strike(x, adv) {
  if (calmMotion()) return;
  const ar = x.fxc.getBoundingClientRect(), r = x.foeFig.getBoundingClientRect();
  const k = x.fxc.width / (ar.width || 1);
  const Q = { x: (r.left + r.width / 2 - ar.left) * k, y: (r.top + r.height / 2 - ar.top) * k, s: r.height * k };
  const type = moveKind(ui.mon);
  try { sfx.move(fxKindOf(type).k); } catch { /* 소리 없이 */ }
  anim(x.meAct, [{ transform: 'none' }, { transform: 'translate(-10px, 4px)', offset: 0.22 }, { transform: 'translate(26px, -10px)', offset: 0.58 }, { transform: 'none' }], { duration: 560, easing: 'ease-in-out' });
  setTimeout(() => {
    impact(x.fx, type, Q, x.fxc.width / 640, adv, 0.7);
    anim(x.foeAct, [{ transform: 'none' }, { transform: 'translateY(-10px) rotate(-3deg)', offset: 0.3 }, { transform: 'translateY(3px) rotate(2deg)', offset: 0.6 }, { transform: 'none' }], { duration: 480 });
    floatUp(x.arena, x.foeFig, adv ? '영차영차!' : '영차!');
  }, 300);
}

async function answer(run, x) {
  const c = ui.cur;
  if (ui.busy || !c) return;
  ui.busy = true;
  const all = [...x.moves.children];
  all.forEach((m) => { m.disabled = true; });
  x.swap.disabled = true;
  const correct = !!x.ch.ok;
  const r = await moveAnswer({ id: c.id, qn: c.qn, mon: ui.mon, subj: x.subj, correct });
  if (!alive(run)) return;
  if (!r.ok) {
    ui.busy = false;
    if (r.why === 'changed' || r.why === 'event') { route(); return; }
    all.forEach((m) => { m.disabled = false; });
    x.swap.disabled = c.swap === c.at;
    setDlg(x.line, '저장이 안 됐어요. 다시 골라 봐요');
    return;
  }
  ui.cur = r.cur || null;
  const right = x.q.choices.findIndex((ch) => ch.ok);
  if (right >= 0 && all[right]) all[right].classList.add('is-ok');
  const my = koOf(ui.mon);
  if (correct) {
    setDlg(x.line, `${my}${josa(my, '이', '가')} 힘을 냈다!${r.adv ? ' 딱 맞는 일이야!' : ''}`);
    play('hit');
    strike(x, !!r.adv);
    x.work.set(r.finished ? 0 : r.hp);
    await waitTap(r.adv ? 1500 : 1200);
    if (!alive(run)) return;
    if (r.finished) {
      setDlg(x.line, stopDone(x.s));
      play('success');
      if (!calmMotion()) {
        const ar = x.fxc.getBoundingClientRect(), f = x.foeFig.getBoundingClientRect(), k = x.fxc.width / (ar.width || 1);
        anim(x.foeAct, [{ transform: 'none', opacity: 1 }, { transform: 'translate(90px, -40px) scale(.6)', opacity: 0 }], { duration: 620, easing: 'ease-in', fill: 'forwards' });
        faintStars(x.fx, { x: (f.left + f.width / 2 - ar.left) * k, y: (f.top + f.height / 2 - ar.top) * k, s: f.height * k }, x.fxc.width / 640);
      }
      await waitTap(1100);
      if (!alive(run)) return;
      ui.busy = false;
      ui.mon = null;
      if (r.end === 'won') { renderWin(); return; }
      if (r.stageDone) { renderSnack(x.s.stage); return; }
      renderMap();
      return;
    }
    ui.busy = false;
    renderWork();
    return;
  }
  const chosen = all[x.q.choices.indexOf(x.ch)];
  if (chosen) chosen.classList.add('is-no');
  setDlg(x.line, `앗, 미끄러졌다! 괜찮아, 다시 해 보자.\n정답은 「${x.q.choices[right] ? x.q.choices[right].text : ''}」`);
  play('wrong');
  await sleep(2000);
  if (!alive(run)) return;
  ui.busy = false;
  renderWork();
}

/** 🍙 새참 — 단계가 끝날 때 잠깐 쉬는 장면 */
function renderSnack(done) {
  const c = ui.cur;
  const { b } = fresh(c);
  b.appendChild(el('div', 'jr-center', '🍙'));
  b.appendChild(dlg(`${STAGES[done].fin}\n다들 수고했어! 새참 먹고 하자!`));
  play('levelUp');
  const next = c ? STAGES[stopAt(c, c.at).stage] : null;
  b.appendChild(btn('btn-primary jr-next', next ? `${next.emoji} ${next.short}!` : '다음으로', () => renderMap()));
}

// ───────────── 끝 ─────────────

/** 🎉 끝까지 왔다 — 보상 보이고 벽지·바닥으로 */
function renderWin() {
  const c = ui.cur;
  if (!c || c.phase !== 'gift') { route(); return; }
  const { b } = fresh(c);
  b.appendChild(dlg('이사 끝!\n함께 간 포켓몬들의 레벨이 올랐다!'));
  play('levelUp');
  const rw = el('div', 'jr-rewards');
  rw.appendChild(rowEl('💰 코인', `+${JOURNEY.coins}`));
  rw.appendChild(rowEl(`${STONES.map((s) => s.emoji).join('')} 스톤`, '+1씩'));
  const lvRow = el('div', 'jr-lvrow');
  const lvMap = new Map((c.lv || []).map((x) => [x[0], x]));
  const subMap = new Map((c.sub || []).map((x) => [x[0], x]));
  for (const id of c.party) {
    const cell = el('div', 'jr-lvcell');
    cell.appendChild(monFig(id));
    const lv = lvMap.get(id);
    const sub = subMap.get(id);
    const st = sub ? STONES.find((s) => s.id === sub[1]) : null;
    cell.appendChild(el('span', '', lv ? `Lv ${lv[1]}→${lv[2]}` : st ? `${st.emoji} +1` : ''));
    lvRow.appendChild(cell);
  }
  rw.appendChild(el('span', 'jr-sub', '함께 간 포켓몬'));
  rw.appendChild(lvRow);
  b.appendChild(rw);
  b.appendChild(btn('btn-primary jr-next', '🏠 새 집 구경하기', () => renderGift()));
}

function swatchRow(title, part, base, onPick) {
  const box = el('div', 'mvt-paint');
  box.appendChild(el('h3', 'jr-h', title));
  const row = el('div', 'mvt-swatches');
  const list = [{ id: '', ko: `${base.ko} 그대로`, color: base.color }, ...PAINT.filter((x) => x.part === part)];
  const btns = [];
  for (const d of list) {
    const k = el('button', 'mvt-swatch');
    k.type = 'button';
    const dot = el('i');
    dot.style.background = d.color;
    k.appendChild(dot);
    k.appendChild(el('span', '', d.ko));
    k.addEventListener('click', () => { for (const x of btns) x.classList.toggle('is-sel', x === k); onPick(d.id); });
    btns.push(k);
    row.appendChild(k);
  }
  box.appendChild(row);
  return box;
}

/** 🖌️ 집 선물 — 방 넓히기 + 2층 · 벽지·바닥 고르기 */
function renderGift() {
  const c = ui.cur;
  if (!c || c.phase !== 'gift') { route(); return; }
  const { b, run } = fresh(c);
  b.appendChild(el('div', 'jr-event-art', '🏠'));
  b.appendChild(dlg('📐 방이 넓어졌다!\n🏗️ 2층도 생겼다!'));
  b.appendChild(el('p', 'jr-sub', '새 집에 어울리는 벽지와 바닥을 골라요. 나중에 언제든 바꿀 수 있어요.'));
  let wall = null;
  let floor = null;
  const go = btn('btn-primary jr-next', '벽지와 바닥을 골라요');
  go.disabled = true;
  const ready = () => { go.disabled = wall === null || floor === null; if (!go.disabled) go.textContent = '이걸로 할래요'; };
  b.appendChild(swatchRow('벽지', 'wall', PAINT_BASE.wall, (id) => { wall = id; ready(); }));
  b.appendChild(swatchRow('바닥', 'floor', PAINT_BASE.floor, (id) => { floor = id; ready(); }));
  go.addEventListener('click', async () => {
    if (ui.busy) return;
    ui.busy = true;
    go.disabled = true;
    const r = await moveGift({ id: c.id, wall, floor });
    if (!alive(run)) return;
    ui.busy = false;
    if (!r.ok) {
      if (r.why === 'changed') { route(); return; }
      go.disabled = false;
      go.textContent = '저장이 안 됐어요 — 다시 눌러 봐요';
      return;
    }
    ui.cur = r.cur;
    play('success');
    renderGuests();
  });
  b.appendChild(go);
}

/** 🎉 데려올 손님 하나 */
function renderGuests() {
  const c = ui.cur;
  if (!c || c.phase !== 'pick') { route(); return; }
  const { b, run } = fresh(c);
  b.appendChild(dlg('손님들이 새 집이 좋대요!\n누가 같이 살까?'));
  const cards = el('div', 'jr-pickcards');
  let sel = null;
  const take = btn('btn-primary jr-next', '같이 살 포켓몬을 골라요');
  take.disabled = true;
  for (const id of c.guests) {
    const k = el('button', `jr-pc jr-t-${typesOf(id)[0]}-soft`);
    k.type = 'button';
    k.appendChild(monFig(id));
    k.appendChild(el('b', '', koOf(id)));
    k.appendChild(typeChips(id));
    k.addEventListener('click', () => {
      sel = id;
      for (const x of cards.children) x.classList.toggle('is-sel', x === k);
      take.disabled = false;
      take.textContent = `${koOf(id)} 데려오기`;
    });
    cards.appendChild(k);
  }
  b.appendChild(cards);
  take.addEventListener('click', async () => {
    if (ui.busy || !sel) return;
    ui.busy = true;
    take.disabled = true;
    const r = await movePick({ id: c.id, mon: sel });
    if (!alive(run)) return;
    ui.busy = false;
    if (!r.ok) {
      if (r.why === 'changed') { route(); return; }
      take.disabled = false;
      take.textContent = '저장이 안 됐어요 — 다시 눌러 봐요';
      return;
    }
    ui.cur = r.cur;
    const ko = koOf(r.mon);
    const { b: b2 } = fresh(ui.cur);
    b2.appendChild(monFig(r.mon, 'is-big jr-caught'));
    b2.appendChild(dlg(r.first ? `${ko}${josa(ko, '이', '가')} 도감에 들어왔다!` : `${ko} 한 마리 더!`));
    play('success');
    b2.appendChild(btn('btn-primary jr-next', '다음으로', () => renderFurn()));
  });
  b.appendChild(take);
}

/** 📦 가구 — 진우가 고른다 */
function renderFurn() {
  const c = ui.cur;
  if (!c || c.phase !== 'furn') { route(); return; }
  const { b, run } = fresh(c);
  b.appendChild(el('div', 'jr-event-art', '📦'));
  const line = dlg('이제 가구를 어떻게 할까?');
  b.appendChild(line);
  const send = async (how, buttons) => {
    if (ui.busy) return;
    ui.busy = true;
    buttons.forEach((x) => { x.disabled = true; });
    const r = await moveFurn({ id: c.id, how });
    if (!alive(run)) return;
    ui.busy = false;
    if (!r.ok) {
      if (r.why === 'changed') { route(); return; }
      buttons.forEach((x) => { x.disabled = false; });
      setDlg(line, '저장이 안 됐어요. 다시 골라 봐요');
      return;
    }
    ui.cur = r.cur;
    renderNight();
  };
  const row = el('div', 'jr-btns');
  const fresh1 = btn('btn-primary', '📦 상자에서 꺼내 새로 놓기', () => send('fresh', [fresh1, keep]));
  const keep = btn('', '🏠 지금 자리 그대로 옮기기', () => send('keep', [fresh1, keep]));
  row.appendChild(fresh1);
  row.appendChild(keep);
  b.appendChild(row);
  b.appendChild(el('p', 'jr-sub', '새로 놓기를 고르면 가구가 서랍으로 들어가요. 하나도 없어지지 않고, 집에서 끌어다 놓으면 돼요.'));
}

/** 🌙 새 집 첫 밤 */
function renderNight() {
  const c = ui.cur;
  if (!c || c.phase !== 'last') { route(); return; }
  const { b } = fresh(c);
  const scene = el('div', 'mvt-night');
  const cv = artCanvas('jr-arena-bg');
  scene.appendChild(cv);
  const me = avatarOf(getProfileSnapshot());
  if (me.made) { const a = el('div', 'mvt-night-me'); a.innerHTML = avatarSvg(me.look, { uid: 'night', shadow: false }); scene.appendChild(a); }
  const pid = Number(getPartner()) || c.party[0];
  if (pid) { const f = monFig(pid, 'mvt-night-pal'); scene.appendChild(f); }
  scene.appendChild(el('div', 'mvt-night-quilt'));
  b.appendChild(scene);
  if (stage) stage.set([{ cv, fps: 12, draw: (g, w, h, t) => paintMove(g, w, h, t, 'night') }]);
  b.appendChild(dlg('여기가 우리 새 집이야.\n내일도 같이 놀자!'));
  b.appendChild(btn('btn-primary jr-next', '다음으로', () => renderNotes()));
}

/** ✍️ 한 줄 쓰기 — 안 써도 된다 */
function renderNotes() {
  const c = ui.cur;
  if (!c || c.phase !== 'last') { route(); return; }
  const { b, run } = fresh(c);
  b.appendChild(el('p', 'jr-sub', '쓰고 싶으면 한 줄씩 써 봐요. 안 써도 괜찮아요.'));
  const field = (id, label) => {
    const w = el('label', 'mvt-note');
    w.setAttribute('for', id);
    w.appendChild(el('span', '', label));
    const t = el('textarea');
    t.id = id;
    t.rows = 2;
    t.maxLength = MOVE.noteMax;
    w.appendChild(t);
    b.appendChild(w);
    return t;
  };
  const old = field('mvt-old', '옛집에서 제일 좋았던 것은…');
  const fav = field('mvt-fav', '새 집에서 제일 좋은 곳은…');
  const msg = el('p', 'jr-note');
  b.appendChild(msg);
  const done = btn('btn-primary jr-next', '🏠 새 집 보러 가기', async () => {
    if (ui.busy) return;
    ui.busy = true;
    done.disabled = true;
    const r = await moveEnd({ id: c.id, old: old.value, fav: fav.value });
    if (!alive(run)) return;
    ui.busy = false;
    if (!r.ok && r.why !== 'changed') {
      done.disabled = false;
      msg.textContent = '저장이 안 됐어요. 잠시 뒤 다시 눌러 봐요';
      return;
    }
    closeMove();
    import('./houseview.js').then((m) => m.openHouse()).catch(() => {});
  });
  b.appendChild(done);
}

