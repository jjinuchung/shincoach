// 🎒 포켓몬 대여행 화면 (v341) — 규칙·저장은 journey.js(순수)·xp.js(journey* = houseDo 한 트랜잭션), 여기는 그리기·문제 원천·장면
// 홈 카드(mountJourneyCard) → 출발 준비(6마리 고르기·얻는 것/잃을 수 있는 것) → 여행 지도 → 등장(VS) → 누구를 내보낼까 → 배틀 → 끝(보상·데려올 포켓몬 / 잃은 것)
// 문제 원천(과목마다 { keys, make(key, seed) }): 🔢 math.journeyMathSource · 🔶 영상에서 본 단어 중 뜻을 맞혀 본 것 · 📚 배운 낱말 · 🖊️ 해 본 생활 주제
//   — 모두 배틀과 같은 꼴이고 공부 기록에 안 남긴다 · 어느 문제를 낼지는 journey.orderOf·slotOf·questionSeed(앱이 꺼져도 같은 자리)
// 대사창(.jr-dlg)만 Galmuri11 픽셀 글꼴(fonts/galmuri11.woff — 한 글자 12칸이라 크기는 crispPx로 기기 배율에 맞춘다)
// 그림: 앱이 받아 둔 포켓몬 그림만(loadCharacters · 없으면 ensureCast로 받기 · 그래도 없으면 타입 색 동그라미) — 저장소에 그림 파일을 넣지 않는다
// v362: 구역 6곳 · 👑 구역 대장(이기면 ❤️ +2 — 새 꼴 지도엔 🏥 점 없음) · 구역마다 이벤트(🎁 보물 상자 · 🧑‍🔬 박사 퀴즈 · 🔀 갈림길) · ❤️ 6 · 지도는 두 줄(산·숲·바다 → 화산·하늘·우주) · ⛺ 쉬었다 가기
import {
  JOURNEY, ZONES, PER_ZONE, OLD_STOPS, SUBJECTS, TYPE_KO, typesOf, advantage, strongZones, zoneOfStop, centersOf, zoneStart, pendingEvent, hpOf, heartsMax, stateOf, makeRoute, makeEvents,
  profChoices, subjectFor, orderOf, slotOf, questionSeed, rngOf, crispPx, lossPreview, ownedIds,
} from './journey.js';
import { journeyRaw, journeyStart, journeyAnswer, journeySwap, journeyHome, journeyPick, journeyEvent, getProfileSnapshot, getLevelInfo, rarityOf, monLv, getLook, korWordsMap, nonsulMap, profileReady, profileLoading, onProfileReload } from './xp.js';
import { ROSTER, loadCharacters, ensureCast, isUnlocked, isLegendary, isUltraBeast, isLetterMon } from './pokemon.js';
import { TRAINERS, MOVES, SIGNATURE } from './battle.js';
import { STONES } from './items.js';
import { todayKey } from './track.js';
import { sfx, unlock } from './sfx.js';
import * as bgm from './bgm.js';
import { josa } from './catch.js';

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
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
const hearts = (n, max = JOURNEY.hearts) => '❤️'.repeat(Math.max(0, n)) + '🤍'.repeat(Math.max(0, max - n)); // max — v341 꼴 여행은 5

let root = null;
let cardBox = null;
const ui = { open: false, run: 0, chars: new Map(), src: null, cur: null, mon: null, busy: false, ribbonAt: -1 };

/** 헤드리스 시험용 (?nosw=1에서만) — 지금 문제를 window에 */
const devQ = (q) => { try { if (/[?&]nosw=1/.test(location.search)) window.__journeyQ = q; } catch { /* 무시 */ } };

// ───────────── 홈 카드 ─────────────

/** 홈 화면 카드를 그린다 — box는 index.html #home-journey (홈을 그릴 때마다 부른다) */
export function mountJourneyCard(box) {
  cardBox = box || cardBox;
  const b = cardBox;
  if (!b) return;
  b.innerHTML = '';
  if (profileLoading()) { b.hidden = true; profileReady().then(() => mountJourneyCard(b)).catch(() => {}); return; } // 다 읽은 뒤 다시 (읽기 훅을 화면 모듈보다 늦게 걸면 못 들음)
  const p = getProfileSnapshot();
  if (!ownedIds(p).length) { b.hidden = true; return; }
  const st = stateOf(journeyRaw(), todayKey());
  const closed = st.mode === 'done';
  const card = el(closed ? 'div' : 'button', `jr-home${closed ? ' is-closed' : ''}`);
  if (!closed) { card.type = 'button'; card.addEventListener('click', () => openJourney()); }
  const band = el('span', 'jr-home-band');
  ZONES.forEach((z, i) => band.appendChild(el('span', `jr-z${i}`, z.emoji)));
  if (!closed) card.appendChild(band);
  const body = el('span', 'jr-home-body');
  body.appendChild(el('b', 'jr-home-title', '🎒 포켓몬 대여행'));
  const sub = {
    open: '이번 주 여행을 떠날 수 있어요',
    go: `여행을 이어 가요 ${st.cur ? hearts(st.cur.hearts, heartsMax(st.cur.route.length)) : ''}`,
    pick: '🎁 데려올 포켓몬을 골라요',
    done: '다음 여행은 토요일에 열려요',
  }[st.mode];
  body.appendChild(el('span', 'jr-home-sub', sub));
  card.appendChild(body);
  b.appendChild(card);
  b.hidden = false;
}
onProfileReload(() => { if (cardBox && !ui.open) mountJourneyCard(cardBox); });

// ───────────── 창 ─────────────

function build() {
  root = el('div', 'jr');
  root.id = 'jr-trip'; // ★ 'journey'는 영어 플레이어의 여행 길 막대가 이미 쓴다(index.html) — 겹치면 다른 창 목록이 엉뚱한 것을 본다
  root.hidden = true;
  root.innerHTML = `
    <div class="jr-card" role="dialog" aria-modal="true" aria-label="포켓몬 대여행">
      <div class="jr-top"><span class="jr-hearts" aria-label="하트"></span><span class="jr-title">🎒 포켓몬 대여행</span><span class="jr-zone"></span><button type="button" class="btn jr-x" aria-label="닫기 — 나중에 이어 하기">✕</button></div>
      <div class="jr-body"></div>
    </div>`;
  document.body.appendChild(root);
  root.querySelector('.jr-x').addEventListener('click', () => { if (!ui.busy) closeJourney(); });
  root.addEventListener('pointerdown', () => { try { unlock(); } catch { /* 무시 */ } }, { passive: true });
}
const body = () => root.querySelector('.jr-body');
function topBar(cur) {
  const h = root.querySelector('.jr-hearts');
  const z = root.querySelector('.jr-zone');
  h.textContent = cur ? hearts(cur.hearts, cur.route ? heartsMax(cur.route.length) : JOURNEY.hearts) : '';
  h.setAttribute('aria-label', cur ? `하트 ${cur.hearts}개` : '하트');
  if (cur && cur.phase === 'go') {
    const zi = zoneOfStop(cur.at, cur.route.length);
    z.textContent = `${ZONES[zi].emoji} ${ZONES[zi].ko}`;
    z.className = `jr-zone jr-z${zi}`;
  } else { z.textContent = ''; z.className = 'jr-zone'; }
}
/** 새 화면 — 앞 화면의 기다리던 일은 run이 바뀌어 멈춘다 */
function fresh(cur) {
  ui.run++;
  ui.busy = false;
  topBar(cur);
  const b = body();
  b.innerHTML = '';
  b.scrollTop = 0;
  return { b, run: ui.run };
}
const alive = (run) => ui.open && run === ui.run;
function dlg(text, cls = '') {
  const d = el('div', `jr-dlg${cls ? ` ${cls}` : ''}`);
  String(text).split('\n').forEach((line, i) => { if (i) d.appendChild(el('br')); d.appendChild(document.createTextNode(line)); });
  return d;
}

/** 🎒 창 열기 — 지금 상태로 출발 준비 · 지도 · 데려올 포켓몬 고르기 */
export async function openJourney() {
  if (ui.open) return;
  if (!root) build();
  await profileReady();
  ui.open = true;
  ui.mon = null;
  ui.ribbonAt = -1;
  root.style.setProperty('--jr-dlg', `${crispPx(24, window.devicePixelRatio || 1)}px`);
  root.hidden = false;
  try { bgm.play(); } catch { /* 음악 없이 */ }
  const { b, run } = fresh(null);
  b.appendChild(dlg('여행 가방을 싸는 중…'));
  await prepare();
  if (!alive(run)) return;
  route();
}

/** 창 닫기 — 여행은 저장된 자리에 그대로(나중에 이어 하기) */
export function closeJourney() {
  if (!root) return;
  ui.open = false;
  ui.run++;
  ui.busy = false;
  root.hidden = true;
  try { bgm.stop(); } catch { /* 무시 */ }
  mountJourneyCard(cardBox);
}
/** 여행 창이 떠 있나 */
export function isJourneyOpen() {
  return !!root && !root.hidden;
}

/** 그림·문제 원천 준비 — 실패해도 이어 간다(그림 없이 · 문제 없는 과목은 건너뜀) */
async function prepare() {
  try { const list = await loadCharacters(); ui.chars = new Map((list || []).map((c) => [c.id, c.url])); } catch { ui.chars = new Map(); }
  ui.src = await loadSources();
}

/** 지금 상태에 맞는 화면으로 */
function route() {
  const st = stateOf(journeyRaw(), todayKey());
  ui.cur = st.cur || null;
  if (st.mode === 'pick') renderEnd('won');
  else if (st.mode === 'go') renderMap();
  else if (st.mode === 'done') renderDone(st.entry);
  else renderPrep();
}

// ───────────── 문제 원천 ─────────────

export async function loadSources() { // 🎣 학습 낚시터(v366 lakeview.js)도 같은 원천을 쓴다
  const tasks = {
    math: async () => (await import('./math.js')).journeyMathSource(),
    english: async () => {
      const [{ listVocabViews }, { wordPool }, { quizChoices }] = await Promise.all([import('./db.js'), import('./rocketquiz.js'), import('./review.js')]);
      const all = wordPool(await listVocabViews());
      const asked = new Map(all.filter((r) => Number(r.quizPass) >= 1).map((r) => [String(r.word), r]));
      if (!asked.size || all.length < 4) return null;
      return {
        keys: [...asked.keys()],
        make(word, seed) {
          const rec = asked.get(word);
          if (!rec) return null;
          const ch = quizChoices(rec, all, rngOf(seed));
          if (ch.length !== 4) return null; // 4지선다만 — 서로 다른 뜻이 모자라면 다른 문제·다른 과목으로 (🔍 Codex 145차 #3)
          const meaning = String(rec.meaning);
          return { id: `e:${word}`, label: '🔶 영어 · 영상에서 본 단어', word: String(rec.word), choices: ch.map((t) => ({ text: t, ok: t === meaning })) };
        },
      };
    },
    korean: async () => {
      const [{ allWords }, kb] = await Promise.all([import('./korwords.js'), import('./korbattle.js')]);
      const res = await fetch('./coach/korean/words.json');
      if (!res.ok) return null;
      const pool = kb.korPool(allWords(await res.json(), []));
      const st = korWordsMap();
      const learned = new Map(pool.filter((w) => own(st, w.id)).map((w) => [w.id, w]));
      if (!learned.size) return null;
      return {
        keys: [...learned.keys()],
        make(id, seed) {
          const w = learned.get(id);
          const q = w ? kb.korQFor(w, pool, rngOf(seed)) : null;
          return q ? { ...q, label: `📚 국어 · ${q.label.replace(/^🔤 /, '')}`, id: `k:${q.id}` } : null;
        },
      };
    },
    nonsul: async () => {
      const [{ allTopics }, kb] = await Promise.all([import('./nonsul.js'), import('./korbattle.js')]);
      const res = await fetch('./coach/korean/nonsul.json');
      if (!res.ok) return null;
      const played = nonsulMap();
      const pairs = new Map();
      for (const t of kb.nonsulPool(allTopics(await res.json())).filter((x) => own(played, x.id))) for (const side of ['yes', 'no']) pairs.set(`${t.id}:${side}`, [t, side]);
      if (!pairs.size) return null;
      return {
        keys: [...pairs.keys()],
        make(key, seed) {
          const x = pairs.get(key);
          const q = x ? kb.nonsulQFor(x[0], x[1], rngOf(seed)) : null;
          return q ? { ...q, id: `n:${q.id}` } : null;
        },
      };
    },
  };
  const out = {};
  await Promise.all(SUBJECTS.map(async (s) => {
    try { const src = await tasks[s](); out[s] = src && Array.isArray(src.keys) && src.keys.length ? src : null; } catch { out[s] = null; }
  }));
  return out;
}
const availOf = () => SUBJECTS.filter((s) => ui.src && ui.src[s]);

/** 지금 낼 문제 → { subj, q } · 이 만남의 과목에서 못 만들면 다른 과목에서 · 아무것도 없으면 null · shift = 과목 차례를 밀기(🎁 보물 상자는 그 구역 첫 만남과 다른 과목으로) */
function buildQuestion(c, shift = 0) {
  const avail = availOf();
  const first = subjectFor(c.at + shift, avail);
  if (!first) return null;
  for (const subj of [first, ...avail.filter((s) => s !== first)]) {
    const src = ui.src[subj];
    const keys = orderOf(src.keys, c.id, subj);
    for (let t = 0; t < Math.min(keys.length, 12); t++) {
      let q = null;
      try { q = src.make(keys[slotOf(c, subj, keys.length, t)], questionSeed(c, t)); } catch { q = null; }
      if (q && Array.isArray(q.choices) && q.choices.length >= 2 && q.choices.filter((x) => x.ok).length === 1) return { subj, q };
    }
  }
  return null;
}

// ───────────── 포켓몬 그림 ─────────────

function urlOf(id) {
  const look = getLook(id);
  if (look && (look.formUrl || look.shinyUrl)) return look.formUrl || look.shinyUrl; // 🟢 지가르데 모습 그림이 먼저 (v359)
  return ui.chars.get(Number(id)) || '';
}
/** 포켓몬 동그라미 (그림이 없으면 타입 색 바탕에 첫 글자) */
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
  } else f.appendChild(el('span', 'jr-mon-alt', koOf(id).slice(0, 1)));
  return f;
}
function typeChips(id) {
  const box = el('span', 'jr-types');
  for (const t of typesOf(id)) box.appendChild(el('span', `jr-chip jr-t-${t}`, TYPE_KO[t] || t));
  return box;
}
/** 내 포켓몬의 기술 — 전용 기술이 있으면 그것, 아니면 타입의 센 기술(벌레·독·비행은 기술표가 없어 다음 타입 → 노말) */
function moveOf(id) {
  const sig = SIGNATURE[Number(id)];
  if (sig) return { name: sig.strong, emoji: sig.emoji };
  const t = typesOf(id).find((x) => MOVES[x]) || 'normal';
  return { name: MOVES[t].strong, emoji: MOVES[t].emoji };
}
/** 그림이 없는 포켓몬을 받아 둔다(기다리는 끝 ms) — 못 받아도 동그라미로 */
async function ensureArts(ids, ms = 6000) {
  const need = [...new Set(ids.map(Number))].filter((id) => !ui.chars.get(id));
  if (!need.length) return;
  try {
    const got = await Promise.race([ensureCast(need), sleep(ms).then(() => [])]);
    for (const c of got || []) if (c && c.url) ui.chars.set(Number(c.id), c.url);
  } catch { /* 그림 없이 */ }
}

// ───────────── 출발 준비 ─────────────

function renderPrep() {
  const { b, run } = fresh(null);
  const p = getProfileSnapshot();
  const owned = ownedIds(p).sort((x, y) => monLv(y) - monLv(x) || x - y);
  const need = Math.min(JOURNEY.party, owned.length);
  const party = [];
  let spot = owned[0];
  b.appendChild(el('h2', 'jr-h', '함께 갈 포켓몬'));
  const slots = el('div', 'jr-slots');
  const spotBox = el('div', 'jr-spot');
  const grid = el('div', 'jr-owned');
  const go = btn('btn-primary jr-go', '출발!');
  const note = el('p', 'jr-note');
  const avail = availOf();
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
      const zs = strongZones(spot);
      info.appendChild(el('span', 'jr-sub', zs.length ? `${zs.map((i) => ZONES[i].ko).join('·')}에서 세요` : '어디서나 꾸준히 싸워요'));
      spotBox.appendChild(info);
    }
    for (const c of grid.children) c.classList.toggle('is-in', party.includes(Number(c.dataset.id)));
    go.disabled = party.length !== need || !avail.length;
    note.textContent = !avail.length ? '아직 여행에서 낼 문제가 없어요 — 공부를 조금 더 하고 떠나요' : party.length === need ? '' : `포켓몬을 ${need}마리 골라요`;
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
  // 얻는 것 · 잃을 수 있는 것 (진우 자신의 숫자로)
  const lp = lossPreview(p);
  const stakes = el('div', 'jr-stakes');
  const win = el('div', 'jr-stake is-win');
  win.appendChild(el('h3', '', '끝까지 가면'));
  for (const [k, v] of [['💰 코인', `+${JOURNEY.coins}`], [STONES.map((s) => s.emoji).join(''), '+1씩'], ['함께 간 포켓몬', 'Lv +1'], ['야생 포켓몬', '1마리 데려오기']]) win.appendChild(rowEl(k, v));
  const lose = el('div', 'jr-stake is-lose');
  lose.appendChild(el('h3', '', '❤️를 다 잃으면'));
  for (const s of STONES) { const [n, left] = lp.items[s.id]; lose.appendChild(rowEl(`${s.emoji} ${s.ko}`, `${n} → ${left}`)); }
  lose.appendChild(rowEl('💰 코인', `${lp.coins[0]} → ${lp.coins[1]}`));
  stakes.appendChild(win);
  stakes.appendChild(lose);
  b.appendChild(stakes);
  b.appendChild(el('p', 'jr-sub', `${ZONES[0].emoji} 산부터 ${ZONES[ZONES.length - 1].emoji} 우주까지 여섯 곳을 지나는 긴 여행이에요. 👑 구역 대장을 이기면 ❤️가 ${JOURNEY.heal}개 돌아와요. 힘들면 ⛺ 쉬었다 가도 돼요 — 금요일까지 그 자리에서 이어 가요.`));
  b.appendChild(el('p', 'jr-sub', `포켓몬은 잃지 않아요. 스톤은 과목마다 최대 ${JOURNEY.loseMax.stone}개, 💰은 최대 ${JOURNEY.loseMax.coins}까지만 잃어요. 언제든 🏃 집으로 돌아올 수 있어요(그땐 보상도 없어요).`));
  b.appendChild(note);
  go.addEventListener('click', () => start(party.slice(), run, go));
  b.appendChild(go);
  draw();
}
function rowEl(k, v) {
  const r = el('div', 'jr-row');
  r.appendChild(el('span', '', k));
  r.appendChild(el('b', '', v));
  return r;
}

/** 구역마다 야생·트레이너 후보 — 그 구역 타입 · 열린 것 · 전설·울트라비스트 뺌 · 그림이 있는 것 먼저(모자라면 명단 전체에서) */
function candidates() {
  const level = getLevelInfo().level;
  const caught = getProfileSnapshot().caught || {};
  const ok = (id) => id !== 52 && !isLegendary(id) && !isUltraBeast(id) && !isLetterMon(id) && rarityOf(id) <= 3; // 📮 편지 포켓몬은 데려올 수 없다 (2026-10-27)
  return ZONES.map((z) => {
    const fit = ROSTER.filter((r) => ok(r.id) && typesOf(r.id).some((t) => z.types.includes(t)));
    const withArt = fit.filter((r) => ui.chars.has(r.id) && isUnlocked(r.id, level));
    const list = withArt.length >= 4 ? withArt : fit.filter((r) => isUnlocked(r.id, level)).length >= 4 ? fit.filter((r) => isUnlocked(r.id, level)) : fit;
    return list.map((r) => ({ id: r.id, caught: (caught[r.id] || 0) > 0, rarity: rarityOf(r.id) }));
  });
}
const newId = () => Array.from({ length: 12 }, () => '0123456789abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 36)]).join('');

async function start(party, run, go) {
  if (ui.busy) return;
  ui.busy = true;
  go.disabled = true;
  const cands = candidates();
  const routeList = makeRoute(cands, Math.random, TRAINERS);
  if (!routeList) { ui.busy = false; go.disabled = false; return; }
  const r = await journeyStart({ id: newId(), party, route: routeList, ev: makeEvents(routeList, cands, Math.random) });
  if (!alive(run)) return;
  ui.busy = false;
  if (!r.ok) {
    if (r.why === 'going' || r.why === 'pick' || r.why === 'done') { route(); return; }
    go.disabled = false;
    body().querySelector('.jr-note').textContent = r.why === 'save' ? '저장이 안 돼서 떠나지 못했어요. 잠시 뒤 다시 눌러 봐요' : '떠나지 못했어요. 다시 골라 봐요';
    return;
  }
  ui.cur = r.cur;
  ui.mon = null;
  play('whoosh');
  await ensureArts([...r.cur.route.map((s) => s.mon), ...r.cur.ev.map((e) => e.m || e.alt).filter(Boolean)], 5000); // 🧑‍🔬 그림자·🔀 갈림길 포켓몬 그림도
  if (!alive(run)) return;
  renderMap();
}

// ───────────── 여행 지도 ─────────────

const EV_ICON = { chest: '🎁', prof: '🔬', fork: '🔀' }; // 박사는 한 글자 그림으로 — 🧑‍🔬(이어 붙인 그림)은 글꼴에 따라 👦🔬 둘로 갈라져 지도 동그라미를 넘는다
const EV_KO = { chest: '보물 상자', prof: '박사 퀴즈', fork: '갈림길' };
const KIND_ICON = { wild: '🐾', trainer: '🧢', boss: '👑', rocket: '🚀' };

/**
 * 지도 점 차례 (v362) — 구역마다 [이벤트, 만남…] · 🏥는 그 만남 다음 · 🚀 끝 · 점마다 { t: 'ev'|'stop'|'center', z, done, now }
 * v341 꼴 길(만남 9)은 이벤트 없이 산·바다·하늘·우주 자리에
 */
function mapSlots(c) {
  const n = c.route.length;
  const centers = centersOf(n);
  const pend = pendingEvent(c);
  const out = [];
  for (let i = 0; i < n; i++) {
    const z = zoneOfStop(i, n);
    const ez = i % PER_ZONE === 0 && i < n - 1 ? i / PER_ZONE : -1;
    if (ez >= 0 && c.ev[ez]) out.push({ t: 'ev', z, k: c.ev[ez].k, done: !!c.ev[ez].d || c.at > i, now: pend === ez });
    out.push({ t: 'stop', z, kind: c.route[i].kind, done: i < c.at, now: i === c.at && pend < 0, rocket: i === n - 1 });
    if (centers.includes(i) && n === OLD_STOPS) out.push({ t: 'center', z, done: c.at > i }); // 새 꼴은 👑 대장을 이기면 ❤️ +2 — 🏥 점을 따로 두지 않는다(점이 30개면 폰에서 빽빽)
  }
  return out;
}
/** 구역 띠 자리 — 위 줄 산·숲·바다(왼쪽 → 오른쪽) · 아래 줄 화산·하늘·우주(오른쪽 → 왼쪽) */
const bandOf = (z) => (z < 3 ? { col: z, row: 0 } : { col: 5 - z, row: 1 });

function mapSvg(c) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 420 300');
  svg.setAttribute('class', 'jr-map');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', '산에서 숲·바다·화산·하늘을 지나 우주까지 이어진 길');
  const add = (tag, attrs, text) => {
    const n = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (text !== undefined) n.textContent = text;
    svg.appendChild(n);
    return n;
  };
  ZONES.forEach((z, i) => {
    const { col, row } = bandOf(i);
    add('rect', { x: col * 140, y: row * 150, width: 140, height: 150, class: `jr-z${i}-fill` });
    add('text', { x: col * 140 + 70, y: row * 150 + 22, class: 'jr-map-label' }, `${z.emoji} ${z.ko}`);
  });
  const slots = mapSlots(c);
  // 구역 안에서 고르게 · 위아래로 조금씩 엇갈리게
  const byZone = new Map();
  for (const s of slots) { if (!byZone.has(s.z)) byZone.set(s.z, []); byZone.get(s.z).push(s); }
  for (const [z, list] of byZone) {
    const { col, row } = bandOf(z);
    const pad = 20; // 🚀 동그라미(+ 지금 자리 테두리)가 지도 밖으로 나가지 않게 (🔍 Codex 166차 #3)
    list.forEach((s, k) => {
      const t = (k + 0.5) / list.length;
      s.x = Math.round(col * 140 + pad + (row === 0 ? t : 1 - t) * (140 - 2 * pad));
      s.y = row * 150 + (s.rocket ? 92 : 88 + (k % 2 ? -22 : 20));
    });
  }
  add('path', { d: `M${slots.map((s) => `${s.x},${s.y}`).join(' L')}`, class: 'jr-map-road' });
  for (const s of slots) {
    const r = s.rocket ? 21 : s.t === 'ev' ? 11 : s.kind === 'boss' ? 15 : 13;
    if (s.now) add('circle', { cx: s.x, cy: s.y, r: r + 5, class: 'jr-map-now' });
    const kind = s.t === 'ev' ? ' is-ev' : s.t === 'center' ? ' is-center' : s.rocket ? ' is-rocket' : s.kind === 'boss' ? ' is-boss' : '';
    add('circle', { cx: s.x, cy: s.y, r, class: `jr-map-node${s.done ? ' is-done' : ''}${kind}` });
    const icon = s.done ? '✓' : s.t === 'ev' ? EV_ICON[s.k] : s.t === 'center' ? '🏥' : KIND_ICON[s.kind];
    add('text', { x: s.x, y: s.y + 1, class: `jr-map-icon${s.rocket ? ' is-boss' : ''}` }, icon);
  }
  return svg;
}

function renderMap() {
  const c = ui.cur;
  if (!c) { route(); return; }
  const { b, run } = fresh(c);
  const n = c.route.length;
  const pend = pendingEvent(c);
  const wrap = el('div', 'jr-mapwrap');
  wrap.appendChild(mapSvg(c));
  const first = zoneStart(c.at, n) && c.hp === hpOf(c.route, c.at) && ui.ribbonAt !== c.at;
  if (first) {
    ui.ribbonAt = c.at;
    const z = ZONES[zoneOfStop(c.at, n)];
    wrap.appendChild(el('div', 'jr-ribbon', c.at === n - 1 ? '로켓단이 기다린다!' : `${z.ko}에 왔다!`));
  }
  b.appendChild(wrap);
  b.appendChild(el('p', 'jr-legend', n === OLD_STOPS ? '🐾 야생 · 🧢 트레이너 · 🏥 포켓몬센터 · 🚀 로켓단' : `🐾 야생 · 🧢 트레이너 · 👑 대장(이기면 ❤️ +${JOURNEY.heal}) · 🎁🔬🔀 이벤트 · 🚀 로켓단`));
  const row = el('div', 'jr-btns');
  if (pend >= 0) {
    const k = c.ev[pend].k;
    row.appendChild(btn('btn-primary jr-next', `${EV_ICON[k]} ${k === 'chest' ? '보물 상자 열어 보기' : k === 'prof' ? '박사님의 퀴즈' : '갈림길로'}`, () => renderEvent(pend)));
  } else {
    const fight = c.hp < hpOf(c.route, c.at); // 그 만남에서 이미 한 방 넣었다
    row.appendChild(btn('btn-primary jr-next', fight ? '배틀 이어 가기' : '다음 만남으로', () => renderIntro()));
  }
  row.appendChild(btn('jr-rest', '⛺ 쉬었다 가기', () => closeJourney()));
  row.appendChild(btn('jr-home-go', '🏃 집으로', () => askHome(run)));
  b.appendChild(row);
  b.appendChild(el('p', 'jr-legend', '⛺ 쉬었다 가기 — 이 자리에 그대로 두고 금요일까지 언제든 이어 가요'));
}

// ───────────── 구역 이벤트 (v362) ─────────────

function renderEvent(z) {
  const c = ui.cur;
  if (!c || pendingEvent(c) !== z) { route(); return; }
  const k = c.ev[z].k;
  if (k === 'chest') renderChest(z);
  else if (k === 'prof') renderProf(z);
  else renderFork(z);
}
/** 이벤트 끝 — 한 줄 보여 주고 지도로 */
function eventDone(line, text) {
  line.textContent = text;
  const b = body();
  b.appendChild(btn('btn-primary jr-next', '다음으로', () => renderMap()));
}
/** 이벤트 저장 — 실패하면 단추를 다시 켜고 까닭 · 다른 창이 먼저면 지금 자리로 */
async function sendEvent(run, req, buttons, line) {
  if (ui.busy) return null;
  ui.busy = true;
  buttons.forEach((m) => { m.disabled = true; });
  const r = await journeyEvent({ id: ui.cur.id, qn: ui.cur.qn, ...req });
  if (!alive(run)) return null;
  ui.busy = false;
  if (!r.ok) {
    if (r.why === 'changed') { route(); return null; }
    buttons.forEach((m) => { m.disabled = false; });
    line.textContent = '저장이 안 됐어요. 다시 골라 봐요';
    return null;
  }
  if (r.end === 'expired') { renderNote('지난주 여행은 끝났어요.\n이번 주 여행을 새로 떠나요!'); return null; }
  ui.cur = r.cur || null;
  topBar(ui.cur);
  return r;
}
/** 보기 단추 줄 */
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
/** 문제 줄기 (배틀과 같은 꼴 — 영어 낱말은 🔊) */
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

/** 🎁 보물 상자 — 배운 문제 하나 · 맞히면 ❤️ +1(가득이면 💰) · 틀려도 ❤️ 그대로 */
function renderChest(z) {
  const c = ui.cur;
  const { b, run } = fresh(c);
  b.appendChild(el('div', 'jr-event-art', '🎁'));
  const line = dlg('보물 상자를 찾았다!\n문제를 맞히면 상자가 열려요. 틀려도 ❤️는 그대로예요.');
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
    eventDone(line, ch.ok
      ? (r.heart ? '상자가 열렸다!\n❤️ 하나가 돌아왔다!' : `상자가 열렸다!\n💰 ${r.coins} 코인을 찾았다!`)
      : `아쉽다! 상자가 열리지 않았다.\n정답은 「${q.choices[right] ? q.choices[right].text : ''}」`);
  });
  b.appendChild(moves);
}

/** 🧑‍🔬 박사 퀴즈 — 포켓몬 타입 맞히기 · 그림자 맞히기(그림이 없으면 타입) · 맞히면 💰 · 틀려도 잃는 것 없음 */
function renderProf(z, typeOnly = false) {
  const c = ui.cur;
  const e = c.ev[z];
  const { b, run } = fresh(c);
  const pool = (candidates()[z] || []).map((x) => x.id);
  let f = !typeOnly && e.f === 'shadow' && urlOf(e.m) ? 'shadow' : 'type';
  let choices = profChoices(e.m, f, pool, koOf, rngOf(questionSeed(c)));
  if (!choices) { f = 'type'; choices = profChoices(e.m, 'type', pool, koOf, rngOf(questionSeed(c))); }
  devQ({ ev: 'prof', f, choices });
  const ko = koOf(e.m);
  const fig = monFig(e.m, `is-big jr-prof-mon${f === 'shadow' ? ' is-shadow' : ''}`);
  const img = fig.querySelector('img');
  if (img && f === 'shadow') img.alt = '그림자';
  let answered = false;
  // 그림 주소는 있는데 그림이 안 열리면(인터넷 끊김·깨진 그림) 그림자를 풀 수 없다 → 같은 칸을 타입 문제로 다시 (🔍 Codex 166차 #2)
  const broken = () => { if (!answered && alive(run)) renderProf(z, true); };
  if (img && f === 'shadow') {
    img.addEventListener('error', broken, { once: true });
    if (img.complete && !img.naturalWidth) setTimeout(broken, 0); // 이미 실패한 그림(캐시)
  }
  const art = el('div', 'jr-event-art');
  art.appendChild(el('span', 'jr-prof', '🧑‍🔬'));
  art.appendChild(fig);
  b.appendChild(art);
  if (f === 'type') { const tag = el('b', 'jr-prof-name', ko); b.appendChild(tag); }
  const line = dlg(f === 'shadow' ? '포켓몬 박사: 「이 그림자는 누구일까?」' : `포켓몬 박사: 「${ko}${josa(ko, '은', '는')} 무슨 타입일까?」`);
  b.appendChild(line);
  const moves = choiceRow(choices || [], async (ch, m) => {
    const all = [...moves.children];
    answered = true; // 고른 뒤엔 그림이 늦게 깨져도 다시 그리지 않는다
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

/** 🔀 갈림길 — 그 구역에서 만날 야생 포켓몬을 둘 가운데 고른다 (이기면 데려올 수 있는 후보) */
function renderFork(z) {
  const c = ui.cur;
  const e = c.ev[z];
  const { b, run } = fresh(c);
  const wi = [PER_ZONE * z, PER_ZONE * z + 1].find((i) => c.route[i].kind === 'wild');
  const pair = [c.route[wi].mon, e.alt];
  if (rngOf(questionSeed(c))() < 0.5) pair.reverse();
  const caught = getProfileSnapshot().caught || {};
  const line = dlg('갈림길이다! 어느 길로 갈까?\n고른 길에서 그 포켓몬을 만나요.');
  b.appendChild(el('div', 'jr-event-art', '🔀'));
  b.appendChild(line);
  const cards = el('div', 'jr-fork');
  const all = [];
  pair.forEach((id, i) => {
    const k = el('button', `jr-pc jr-t-${typesOf(id)[0]}-soft`);
    k.type = 'button';
    k.appendChild(el('span', 'jr-fork-way', i ? '오른쪽 길 ➡️' : '⬅️ 왼쪽 길'));
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
      eventDone(line, `${ko}${josa(ko, '이', '가')} 사는 길로 가자!`);
    });
    all.push(k);
    cards.appendChild(k);
  });
  b.appendChild(cards);
}

function askHome(run) {
  if (!alive(run)) return;
  const b = body();
  if (b.querySelector('.jr-ask')) return;
  const box = el('div', 'jr-ask');
  box.appendChild(dlg('집으로 돌아갈까?\n이번 주 여행은 여기서 끝나고 보상도 없어요.'));
  const row = el('div', 'jr-btns');
  const yes = btn('jr-home-yes', '집으로 돌아가기', async () => {
    if (ui.busy) return;
    ui.busy = true;
    yes.disabled = true; // e.currentTarget은 await 뒤에 null이다 — 단추를 잡아 둔다 (🔍 Codex 145차 #2)
    const r = await journeyHome({ id: ui.cur && ui.cur.id });
    if (!alive(run)) return;
    ui.busy = false;
    if (r.ok || r.why === 'changed') { closeJourney(); return; }
    box.querySelector('.jr-dlg').textContent = '저장이 안 됐어요. 잠시 뒤 다시 눌러 봐요';
    yes.disabled = false;
  });
  row.appendChild(yes);
  row.appendChild(btn('btn-primary', '계속 여행', () => box.remove()));
  box.appendChild(row);
  b.appendChild(box);
}

// ───────────── 등장 · 누구를 내보낼까 ─────────────

function foeLine(s, zone) {
  const ko = koOf(s.mon);
  if (s.kind === 'wild') return `앗! 야생 ${ko}${josa(ko, '이', '가')} 나타났다!`;
  if (s.kind === 'trainer') return `${s.who} 트레이너가 승부를 걸어왔다!\n${ko}${josa(ko, '을', '를')} 내보냈다!`;
  if (s.kind === 'boss') return `👑 ${zone.ko}의 대장이 길을 막아섰다!\n${ko}${josa(ko, '을', '를')} 내보냈다!`; // v362
  return '로켓단이 나타났다!\n나옹을 내보냈다!';
}

function renderIntro() {
  const c = ui.cur;
  if (!c) { route(); return; }
  const s = c.route[c.at];
  if (c.hp < hpOf(c.route, c.at) && ui.mon && c.party.includes(ui.mon)) { renderBattle(); return; } // 배틀 중이던 만남 — 등장은 건너뜀
  const { b, run } = fresh(c);
  const zi = zoneOfStop(c.at, c.route.length);
  const vs = el('button', `jr-vs jr-z${zi}${s.kind === 'boss' ? ' is-boss' : ''}`);
  vs.type = 'button';
  vs.setAttribute('aria-label', '넘어가기');
  const l = el('span', 'jr-vs-l');
  l.appendChild(el('span', 'jr-vs-me', s.kind === 'trainer' ? s.who : s.kind === 'boss' ? `👑${s.who}` : s.kind === 'rocket' ? '👩‍🦰🧑' : '🎒'));
  const r = el('span', 'jr-vs-r');
  r.appendChild(monFig(s.mon, 'is-big'));
  vs.appendChild(l);
  vs.appendChild(r);
  vs.appendChild(el('span', 'jr-vs-mark', 'VS'));
  b.appendChild(vs);
  b.appendChild(dlg(foeLine(s, ZONES[zi])));
  play(s.kind === 'rocket' || s.kind === 'boss' ? 'siren' : 'whoosh');
  let done = false;
  const next = () => { if (done || !alive(run)) return; done = true; renderChoose(); };
  vs.addEventListener('click', next);
  b.appendChild(btn('btn-primary jr-next', '누구를 내보낼까?', next));
  sleep(1400).then(next);
}

function renderChoose() {
  const c = ui.cur;
  const s = c.route[c.at];
  const { b } = fresh(c);
  b.appendChild(dlg('누구를 내보낼까?'));
  const grid = el('div', 'jr-choose');
  for (const id of c.party) {
    const card = el('button', 'jr-choose-card');
    card.type = 'button';
    card.appendChild(monFig(id));
    card.appendChild(el('b', '', koOf(id)));
    card.appendChild(typeChips(id));
    if (advantage(id, s.mon)) card.appendChild(el('span', 'jr-super-tag', '효과가 굉장해!'));
    card.addEventListener('click', () => { ui.mon = id; renderBattle(); });
    grid.appendChild(card);
  }
  b.appendChild(grid);
  const foe = el('p', 'jr-sub');
  foe.textContent = `상대: ${koOf(s.mon)} · ${typesOf(s.mon).map((t) => TYPE_KO[t] || t).join('·')}`;
  b.appendChild(foe);
}

// ───────────── 배틀 ─────────────

function pips(n, max) {
  const box = el('span', 'jr-pips');
  box.setAttribute('aria-label', `HP ${n}칸`);
  for (let i = 0; i < max; i++) box.appendChild(el('span', i < n ? '' : 'is-off'));
  return box;
}

function renderBattle(msg) {
  const c = ui.cur;
  if (!c || c.phase !== 'go') { route(); return; }
  if (!ui.mon || !c.party.includes(ui.mon)) { renderChoose(); return; }
  const s = c.route[c.at];
  const max = hpOf(c.route, c.at);
  const { b, run } = fresh(c);
  const adv = advantage(ui.mon, s.mon);
  const arena = el('div', `jr-arena jr-z${zoneOfStop(c.at, c.route.length)}-soft`);
  const foePlate = el('div', 'jr-plate is-foe');
  const fn = el('span', 'jr-plate-name');
  fn.appendChild(el('b', '', s.kind === 'trainer' ? `${s.who} ${koOf(s.mon)}` : s.kind === 'boss' ? `👑 ${koOf(s.mon)}` : s.kind === 'rocket' ? `🚀 ${koOf(s.mon)}` : koOf(s.mon)));
  fn.appendChild(typeChips(s.mon));
  foePlate.appendChild(fn);
  const foePips = pips(c.hp, max);
  foePlate.appendChild(foePips);
  const foeFig = monFig(s.mon, 'is-big jr-foe');
  const myFig = monFig(ui.mon, 'is-big jr-me');
  const myPlate = el('div', 'jr-plate is-me');
  const mn = el('span', 'jr-plate-name');
  mn.appendChild(el('b', '', `${koOf(ui.mon)} Lv.${monLv(ui.mon)}`));
  mn.appendChild(typeChips(ui.mon));
  myPlate.appendChild(mn);
  myPlate.appendChild(btn('jr-swapmon', '교체', () => { if (!ui.busy) renderChoose(); }));
  arena.appendChild(foePlate);
  arena.appendChild(foeFig);
  arena.appendChild(myFig);
  arena.appendChild(myPlate);
  b.appendChild(arena);
  if (adv) b.appendChild(el('div', 'jr-super', `${moveOf(ui.mon).emoji} 효과가 굉장해! 맞히면 2칸`));
  const line = dlg(msg || `${koOf(ui.mon)}${josa(koOf(ui.mon), '은', '는')} 무엇을 할까?`);
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
  card.appendChild(stem);
  b.appendChild(card);
  const mv = moveOf(ui.mon);
  const head = el('div', 'jr-movehead');
  head.appendChild(el('span', '', `정답을 고르면 ${mv.emoji} ${mv.name}!`));
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
    m.addEventListener('click', () => answer(run, { subj, q, ch, m, moves, swap, line, foePips, foeFig, myFig, max }));
    moves.appendChild(m);
  });
  b.appendChild(moves);
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

async function doSwap(run, swap) {
  const c = ui.cur;
  if (ui.busy || !c || c.swap === c.at) return;
  ui.busy = true;
  swap.disabled = true;
  const r = await journeySwap({ id: c.id, qn: c.qn });
  if (!alive(run)) return;
  ui.busy = false;
  if (r.ok) { ui.cur = r.cur; renderBattle(); return; }
  if (r.why === 'changed' || r.why === 'event') { route(); return; }
  if (r.why !== 'used') swap.disabled = false;
}

async function answer(run, x) {
  const c = ui.cur;
  if (ui.busy || !c) return;
  ui.busy = true;
  const all = [...x.moves.children];
  all.forEach((m) => { m.disabled = true; });
  x.swap.disabled = true;
  const correct = !!x.ch.ok;
  const r = await journeyAnswer({ id: c.id, qn: c.qn, mon: ui.mon, subj: x.subj, correct });
  if (!alive(run)) return;
  if (!r.ok) {
    ui.busy = false;
    if (r.why === 'changed' || r.why === 'event') { route(); return; } // 이벤트가 먼저면 지도로 (v362)
    all.forEach((m) => { m.disabled = false; });
    x.swap.disabled = c.swap === c.at;
    x.line.textContent = '저장이 안 됐어요. 다시 골라 봐요';
    return;
  }
  if (r.end === 'expired') { ui.busy = false; renderNote('지난주 여행은 끝났어요.\n이번 주 여행을 새로 떠나요!'); return; }
  ui.cur = r.cur || null;
  const right = x.q.choices.findIndex((ch) => ch.ok);
  if (right >= 0 && all[right]) all[right].classList.add('is-ok');
  const myKo = koOf(ui.mon);
  const s = c.route[c.at];
  const foeKo = koOf(s.mon);
  if (correct) {
    const mv = moveOf(ui.mon);
    x.line.textContent = `${myKo}의 ${mv.name}!${r.adv ? ' 효과가 굉장했다!' : ''}`;
    x.myFig.classList.add('is-hit-go');
    x.foeFig.classList.add('is-hurt');
    play('hit');
    const left = r.beaten ? 0 : r.hp;
    [...x.foePips.children].forEach((p, i) => p.classList.toggle('is-off', i >= left));
    await sleep(900);
    if (!alive(run)) return;
    if (r.beaten) {
      x.line.textContent = `${foeKo}${josa(foeKo, '은', '는')} 쓰러졌다!`;
      x.foeFig.classList.add('is-down');
      play('success');
      await sleep(1100);
      if (!alive(run)) return;
      ui.busy = false;
      ui.mon = null;
      if (r.end === 'won') { renderEnd('won'); return; }
      if (r.healed) { renderCenter(r.healed); return; }
      renderMap();
      return;
    }
    ui.busy = false;
    renderBattle();
  } else {
    const chosen = all[x.q.choices.indexOf(x.ch)];
    if (chosen) chosen.classList.add('is-no');
    x.line.textContent = r.end === 'lost' ? '앗… ❤️를 다 써 버렸다!' : `앗, 아쉽다! ❤️ 하나를 잃었다.\n정답은 「${x.q.choices[right] ? x.q.choices[right].text : ''}」`;
    topBar(r.end === 'lost' ? { hearts: 0, phase: 'lost' } : ui.cur);
    play('wrong');
    await sleep(r.end === 'lost' ? 1500 : 2000);
    if (!alive(run)) return;
    ui.busy = false;
    if (r.end === 'lost') { renderEnd('lost', r.lost); return; }
    renderBattle();
  }
}

function renderCenter(healed) {
  const c = ui.cur;
  const { b } = fresh(c);
  const old = !c || c.route.length === OLD_STOPS;
  b.appendChild(el('div', 'jr-center', old ? '🏥' : '💖'));
  b.appendChild(dlg(old ? `포켓몬센터에서 쉬었다!\n❤️ ${healed}개가 돌아왔다!` : `👑 대장을 이겼다! 힘이 솟는다!\n❤️ ${healed}개가 돌아왔다!`));
  play('levelUp');
  const next = c ? ZONES[zoneOfStop(c.at, c.route.length)] : null; // 다음 구역 (v362 — 화산·우주 · v341 꼴은 하늘)
  b.appendChild(btn('btn-primary jr-next', next ? `${next.emoji} ${next.ko}에 가자!` : '다음으로', () => renderMap()));
}

function renderNote(text) {
  const { b } = fresh(null);
  b.appendChild(dlg(text));
  b.appendChild(btn('btn-primary jr-next', '닫기', () => closeJourney()));
}

// ───────────── 끝 ─────────────

function renderDone(entry) {
  const { b } = fresh(null);
  b.appendChild(dlg(entry && entry.r === 'won' ? '이번 주 여행은 무사히 다녀왔다!\n다음 여행은 토요일에 열려요.' : '이번 주 여행은 끝났어요.\n다음 여행은 토요일에 열려요.'));
  b.appendChild(btn('btn-primary jr-next', '닫기', () => closeJourney()));
}

function renderEnd(kind, lost) {
  if (kind === 'lost') {
    const { b } = fresh({ hearts: 0, phase: 'lost' });
    b.appendChild(dlg('❤️를 다 썼다…\n포켓몬들은 모두 무사하다!'));
    const box = el('div', 'jr-lost');
    box.appendChild(el('h3', '', '이번 여행에서 잃은 것'));
    const st = STONES.filter((s) => lost && lost.items && lost.items[s.id]).map((s) => `${s.emoji} ${lost.items[s.id]}개`);
    const ul = el('ul');
    if (st.length) ul.appendChild(el('li', '', st.join(' · ')));
    if (lost && lost.coins) ul.appendChild(el('li', '', `💰 ${lost.coins}`));
    if (!ul.children.length) ul.appendChild(el('li', '', '잃은 것이 없어요'));
    box.appendChild(ul);
    box.appendChild(el('p', 'jr-sub', '다음 토요일에 다시 떠나요.'));
    b.appendChild(box);
    b.appendChild(btn('btn-primary jr-next', '집으로', () => closeJourney()));
    return;
  }
  const c = ui.cur;
  if (!c || c.phase !== 'pick') { route(); return; }
  const { b, run } = fresh(null);
  const entry = (stateOf(journeyRaw(), todayKey()).done || {})[c.week] || {};
  b.appendChild(dlg('무사히 돌아왔다!\n함께 간 포켓몬들의 레벨이 올랐다!'));
  play('levelUp');
  const rw = el('div', 'jr-rewards');
  rw.appendChild(rowEl('💰 코인', `+${JOURNEY.coins}`));
  rw.appendChild(rowEl(`${STONES.map((s) => s.emoji).join('')} 스톤`, '+1씩'));
  const lvRow = el('div', 'jr-lvrow');
  const lvMap = new Map((entry.lv || []).map((x) => [x[0], x]));
  const subMap = new Map((entry.sub || []).map((x) => [x[0], x]));
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
  b.appendChild(el('h3', 'jr-h', '데려올 포켓몬 하나'));
  const cards = el('div', 'jr-pickcards');
  let sel = null;
  const take = btn('btn-primary jr-next', '데려올 포켓몬을 골라요');
  take.disabled = true;
  for (const id of c.won) {
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
    const r = await journeyPick({ id: c.id, mon: sel });
    if (!alive(run)) return;
    ui.busy = false;
    if (!r.ok) {
      if (r.why === 'changed') { route(); return; }
      take.disabled = false;
      take.textContent = '저장이 안 됐어요 — 다시 눌러 봐요';
      return;
    }
    const ko = koOf(r.mon);
    const { b: b2 } = fresh(null);
    b2.appendChild(monFig(r.mon, 'is-big jr-caught'));
    b2.appendChild(dlg(r.first ? `${ko}${josa(ko, '이', '가')} 도감에 들어왔다!` : `${ko} 한 마리 더!`));
    play('success');
    b2.appendChild(btn('btn-primary jr-next', '집으로', () => closeJourney()));
  });
  b.appendChild(take);
}
