// 🎒 내 포켓몬(도감) 화면: 레벨·경험치·💰 코인, 잡은 포켓몬(그림·마릿수, 누르면 장식·염색), 못 잡은 포켓몬(검은 실루엣 + ???), 🛒 상점
import { ROSTER, loadCharacters, nextUnlockLevel, unlockCountAt, subjectOf, isUltraBeast } from './pokemon.js';
import { getLevelInfo, getProfileSnapshot, rarityOf, RARITY, RARITY_UB, caughtKinds, streakBefore, STREAK_MIN_DONE, xpToReach, coins, getLook, inventory, getPartner } from './xp.js';
import { listDaily, getMath } from './db.js';
import { todayKey, todayDone } from './track.js';
import { makeFigure, setFigure, itemById, STONES, FUTURE_STONES, SHINY_STONE, shinyUsesLeft, ENGLISH_STONE_SHORT } from './items.js';
import { eggSummary } from './egg.js';
import { gymClaimed } from './mathprog.js'; // 🕳 울트라홀 = 💎 스페셜 여덟 배지
import { haveOf, lvOf, fusedOf, fledOf, rocketHeldOf } from './evolve.js';
import { initMarket, openMarket, fusionFigure, fusionName } from './marketview.js'; // 🏪 5일장 · 🔀 퓨전 (2026-10-04)
import { marketOpen, nextMarket } from './fusion.js';
import { fusionList } from './xp.js';
import { showHatchIfAny } from './hatch.js';
import { initShop, openShop, openMon } from './shop.js';

const $ = (id) => document.getElementById(id);
let showView;
let urlById = new Map(); // 포켓몬 id → 그림 객체 URL (열 때 채움)
let openSeq = 0;         // 도감 그리기 요청 번호 (빠르게 두 번 누르면 두 번 그려지던 것 방지)
let backTo = 'home';     // 🎒를 연 화면 — 뒤로 가면 거기로 (홈·영어·수학 어디서든 연다, 2026-09-20)

/**
 * 지금 보이는 화면 이름. 🎒·📊·플레이어 위에서 열린 거면 홈으로 (거기로 "돌아가기"는 말이 안 된다).
 * 플레이어의 레벨 칩은 closePlayer() 뒤에 여니까 그때는 영어 목록이 보이는 상태다.
 */
export function visibleView() {
  const v = document.querySelector('.view:not([hidden])');
  const name = v ? v.id.replace(/^view-/, '') : 'home';
  return ['pokedex', 'stats', 'player'].includes(name) ? 'home' : name;
}

export function initPokedex(ctx) {
  showView = ctx.showView;
  // 홈·영어·수학 상단의 🎒 전부 — 버튼마다 따로 배선하면 하나를 빠뜨린다
  for (const b of document.querySelectorAll('[data-open="pokedex"]')) b.addEventListener('click', () => openPokedex());
  $('btn-pokedex-back').addEventListener('click', () => showView(backTo));
  $('pokedex-shop').addEventListener('click', openShop);
  initShop({ onChange: refreshAfterChange });
  initMarket();
}

/** 🏪 5일장 열기 — 닫으면 도감을 다시 그린다 (퓨전에 들어간 포켓몬 수·퓨전 도감이 바뀌었다). 돌아갈 화면은 그대로 */
function goMarket() {
  openMarket({ onClose: () => { if (!$('view-pokedex').hidden) openPokedex({ keepBack: true }); } });
}

/** 상점에서 사거나 포켓몬을 꾸민 뒤: 코인 표시와 그 포켓몬 자리만 다시 그림 (화면 전체를 다시 그리면 스크롤이 튐) */
function refreshAfterChange(monId) {
  renderCoins();
  refreshPartnerBadges();
  if (monId === null || monId === undefined) return;
  const fig = $('pokedex-main').querySelector(`.mon-figure[data-id="${monId}"]`);
  if (fig) {
    // 원래 그림도 같이 넘긴다 — 안 넘기면 이로치를 원래 색으로 되돌려도 칸에는 이로치 그림이 남았다 (Codex 29차 #4)
    setFigure(fig, urlById.get(Number(monId)), getLook(monId));
    fig.classList.remove('pop');
    void fig.offsetWidth;
    fig.classList.add('pop');
  }
}

/** 🤝 파트너 배지는 한 마리에게만 — 파트너가 바뀌면 전 자리의 배지를 떼고 새 자리에 붙임 */
function refreshPartnerBadges() {
  const partner = getPartner();
  for (const cell of $('pokedex-main').querySelectorAll('.pokedex-cell.got')) {
    const fig = cell.querySelector('.mon-figure');
    const on = !!fig && String(partner) === fig.dataset.id;
    let b = cell.querySelector('.partner');
    if (on && !b) { b = el('div', 'partner', '🤝'); cell.appendChild(b); }
    else if (!on && b) b.remove();
  }
}

function renderCoins() {
  $('pokedex-shop').textContent = `💰 ${coins()} · 🛒`;
  const amt = $('pokedex-main').querySelector('.pokedex-coins .amt');
  if (amt) amt.textContent = `💰 ${coins()} 코인`;
  const bag = $('pokedex-main').querySelector('.pokedex-bag');
  if (bag) bag.textContent = bagText();
}

/** 🎒 가방 한 줄 요약: "🎩×1 🔴×2" */
function bagText() {
  const inv = inventory();
  // ⏳ 연장권은 두 과목이 같은 ⏳라 과목 표시를 붙인다 (⏳🔢×1 ⏳🎤×2)
  const parts = Object.keys(inv).map((id) => itemById(id)).filter((it) => it && it.id !== SHINY_STONE.id).map((it) => `${it.emoji}${it.kind === 'extend' ? (it.subject === 'math' ? '🔢' : '🎤') : ''}×${inv[it.id]}`);
  // 🌈 이로치의 스톤은 개수가 아니라 남은 횟수로 (스톤 하나 = 3번, 뜯은 스톤의 남은 횟수 포함)
  const left = shinyUsesLeft(inv);
  if (left > 0) parts.push(`${SHINY_STONE.emoji}${left}번`);
  return parts.length ? `가방: ${parts.join(' ')}` : '가방이 비어 있어요';
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/** 도감 열기. opts.shop = true 면 열자마자 🛒 상점도 띄움 (플레이어 코인 칩에서) */
export async function openPokedex(opts) {
  if (!(opts && opts.keepBack)) backTo = visibleView(); // 열기 전에 잡는다 (🏪 5일장에서 돌아와 다시 그릴 때는 그대로) — 그려지는 사이에 화면이 바뀌면 안 되니까
  // 화면을 지운 뒤에 await가 있으므로, 아이가 🎒를 빠르게 두 번 누르면 도감이 두 번 그려진다
  // (라이브러리 🎟️ 예고가 두 번 나온 것과 같은 원인 — 2026-09-17). 마지막 요청만 화면에 남긴다.
  const seq = ++openSeq;
  const chars = await loadCharacters().catch(() => []);
  if (seq !== openSeq) return;
  urlById = new Map(chars.map((c) => [c.id, c.url]));
  const info = getLevelInfo();
  const p = getProfileSnapshot();
  const main = $('pokedex-main');
  main.innerHTML = '';
  const daily = await listDaily().catch(() => []);
  if (seq !== openSeq) return;
  // 🕳 울트라홀이 열렸나 — 🌌 구역에 "왜 아직 못 만나는지"를 적기 위해 (💎 배지 여덟 개)
  const hole = gymClaimed(await getMath().catch(() => null));
  if (seq !== openSeq) return;
  const today = todayKey();
  const todayRec = daily.find((d) => d.date === today);
  const todayOk = (todayRec ? todayRec.doneKeys.length : todayDone()) >= STREAK_MIN_DONE;
  const streak = streakBefore(daily, today) + (todayOk ? 1 : 0);
  const nextLv = nextUnlockLevel(info.level);
  const unlocked = ROSTER.filter((m) => (m.unlock || 1) <= info.level || p.caught[m.id] > 0); // 🥚 알로 얻은 잠긴 레벨의 포켓몬도 내 것 (Codex 8차 #7)

  $('pokedex-level').textContent = `Lv.${info.level}`;

  // 레벨·경험치
  const card = el('div', 'stats-card');
  const row = el('div', 'pokedex-xp');
  row.appendChild(el('span', '', `⚡ Lv.${info.level}`));
  row.appendChild(el('span', '', `${info.into} / ${info.need} 다음 레벨까지 ${info.need - info.into}`));
  card.appendChild(row);
  const bar = el('div', 'catch-xpbar');
  const fill = el('div', 'catch-xpbar-fill');
  fill.style.width = `${Math.round((info.into / info.need) * 100)}%`;
  bar.appendChild(fill);
  card.appendChild(bar);
  card.appendChild(el('div', 'pokedex-stats', `잡은 포켓몬 ${caughtKinds()}/${unlocked.length}마리 · 몬스터볼 ${p.throws}번 던져서 ${p.catches}번 성공 · 총 경험치 ${p.xp}`));
  // 🎤/🔢 어디서 잡히는 포켓몬인지 — 도감은 하나, 잡히는 곳만 다르다 (2026-09-22)
  const bySubj = (subj) => unlocked.filter((m) => subjectOf(m.id) === subj);
  const en = bySubj('english');
  const ma = bySubj('math');
  const ko = bySubj('korean');
  const got = (list) => list.filter((m) => p.caught[m.id] > 0).length;
  card.appendChild(el('div', 'pokedex-stats pokedex-subjects', `🎤 영어 퍼즐에서 잡아요 ${got(en)}/${en.length} · 🔢 수학에서 잡아요 ${got(ma)}/${ma.length}${ko.length ? ` · 📚 국어에서 잡아요 ${got(ko)}/${ko.length}` : ''}`));
  const hint = el('div', 'pokedex-hint');
  hint.appendChild(el('span', 'streak', streak > 0 ? `🔥 ${streak}일 연속 학습 중` : `🔥 하루 ${STREAK_MIN_DONE}문장 이상 하면 연속 학습이 시작돼요`));
  if (nextLv) hint.appendChild(el('span', 'unlock', `🔒 Lv.${nextLv}에 새 포켓몬 ${unlockCountAt(nextLv)}마리 — ⚡${xpToReach(nextLv) - p.xp} 남음`));
  card.appendChild(hint);
  // 🧤 건틀릿 — 과목 스톤 (2026-09-22): 배워야만 생기고, 상점의 🧤 칸에서 코인과 같이 쓴다. 아직 없는 과목은 🔒 자리만
  const gl = el('div', 'pokedex-gauntlet');
  gl.appendChild(el('span', 'ttl', '🧤 스톤'));
  for (const s of STONES) {
    const n = p.items && p.items[s.id] ? p.items[s.id] : 0;
    gl.appendChild(el('span', 'stone' + (n > 0 ? ' have' : ''), `${s.emoji} ${s.ko} ${n}`));
  }
  for (const f of FUTURE_STONES) gl.appendChild(el('span', 'stone locked', `🔒 ${f.emoji} ${f.ko}`));
  for (const e of eggSummary(p)) gl.appendChild(el('span', 'egg', `🥚 ${e.subject === 'math' ? '수학' : '영어'} 알 ${e.done}/${e.need}일`)); // 품는 알 — 그 과목을 완주한 날 수
  card.appendChild(gl);
  showHatchIfAny(); // 🐣 다른 화면에서 부화했는데 아직 못 본 것
  card.appendChild(el('div', 'pokedex-stats', `스톤은 배워야만 생겨요 — 🔷 개념 통과·👑 / 🔶 ${ENGLISH_STONE_SHORT} / 🟩 국어 글을 한 번에 다 맞혀 별 받기. 🛒 상점 🧤 칸에서 코인과 같이 써요`));
  // 💰 코인·🎒 가방·🛒 상점
  const coinRow = el('div', 'pokedex-coins');
  const coinLeft = el('div');
  coinLeft.appendChild(el('div', 'amt', `💰 ${coins()} 코인`));
  coinLeft.appendChild(el('div', 'pokedex-bag pokedex-stats', bagText()));
  coinRow.appendChild(coinLeft);
  const shopBtn = el('button', 'btn btn-primary', '🛒 상점');
  shopBtn.type = 'button';
  shopBtn.addEventListener('click', openShop);
  coinRow.appendChild(shopBtn);
  card.appendChild(coinRow);
  // 🏪 5일장 — 5일마다 열린다. 장이 안 서는 날도 눌러서 다음 장날과 퓨전 도감을 볼 수 있다
  const nx = nextMarket(today);
  const mk = el('div', 'pokedex-coins pokedex-market' + (marketOpen(today) ? ' open' : ''));
  const mkLeft = el('div');
  mkLeft.appendChild(el('div', 'amt', marketOpen(today) ? '🏪 오늘은 5일장 날!' : '🏪 5일장'));
  mkLeft.appendChild(el('div', 'pokedex-stats', marketOpen(today) ? '🔀 퓨전 가게 · 🤝 교환 상인 세 명이 왔어요' : nx ? `다음 장날 ${Number(nx.key.slice(5, 7))}월 ${Number(nx.key.slice(8))}일 (${nx.days === 1 ? '내일' : `${nx.days}일 뒤`})` : ''));
  mk.appendChild(mkLeft);
  const mkBtn = el('button', 'btn' + (marketOpen(today) ? ' btn-primary' : ''), marketOpen(today) ? '🏪 장 보러 가기' : '🏪 들어가 보기');
  mkBtn.type = 'button';
  mkBtn.addEventListener('click', goMarket);
  mk.appendChild(mkBtn);
  card.appendChild(mk);
  main.appendChild(card);

  // 🔀 퓨전 도감 — 만든 적 있는 퓨전 (누르면 5일장에서 이름을 바꾸거나 장날에 나눈다)
  const fz = fusionList();
  if (fz.length) {
    const sec = el('div', 'stats-card');
    sec.appendChild(el('h2', '', `🔀 퓨전 도감 (${fz.length}종)`));
    const grid = el('div', 'pokedex-grid');
    for (const f of fz) {
      const cell = el('div', 'pokedex-cell got fz-dex-cell');
      cell.appendChild(fusionFigure(f.a, f.b, urlById, 'fz-art small'));
      cell.appendChild(el('div', 'nm', fusionName(f)));
      if (f.held > 1) cell.appendChild(el('div', 'cnt', `×${f.held}`));
      else if (f.held === 0) cell.appendChild(el('div', 'cnt evolved', '나눔'));
      cell.addEventListener('click', goMarket);
      grid.appendChild(cell);
    }
    sec.appendChild(grid);
    main.appendChild(sec);
  }

  main.appendChild(el('p', 'stats-note', '⭐ 등급이 이상하다고 생각되면 포켓몬을 눌러서 아빠에게 말할 수 있어요 (아직 못 잡은 포켓몬도요)'));

  if (chars.length === 0) {
    main.appendChild(el('p', 'stats-empty', '⚙ 설정에서 "포켓몬 캐릭터 받기"를 하면 그림이 보여요.'));
  }

  // 희귀도별 도감 (지금 레벨에서 열린 것만). 🌌 울트라비스트는 ⭐ 밖의 제 등급이라 맨 아래 따로 선다
  for (let r = 1; r <= RARITY_UB; r++) {
    const list = unlocked.filter((m) => rarityOf(m.id) === r);
    if (!list.length) continue;
    const ub = r === RARITY_UB;
    const sec = el('div', 'stats-card' + (ub ? ' pokedex-ub' : ''));
    const got = list.filter((m) => p.caught[m.id] > 0).length;
    sec.appendChild(el('h2', '', `${RARITY[r].stars} ${RARITY[r].label} (${got}/${list.length})`));
    // 🕳 울트라홀이 아직이면 왜 못 만나는지 알려 준다 — 아이가 "이건 뭐지?" 하고 묻는 자리다
    if (ub) sec.appendChild(el('p', 'pokedex-ub-note', hole
      ? '🕳 울트라홀이 열렸어요! 🔢 수학 잡기에서 만날 수 있어요 — ⚪ 비스트볼로 던져야 잡혀요'
      : '🕳 다른 차원에서 온 포켓몬들이에요. 💎 스페셜 문제로 🏅 배지 여덟 개를 모으면 울트라홀이 열려요'));
    const grid = el('div', 'pokedex-grid');
    for (const m of list) {
      const n = p.caught[m.id] || 0;                 // 도감에 적힌 누적 (🧬 진화로 보내도 줄지 않는다)
      const have = haveOf(n, p.mons[m.id]);          // 지금 데리고 있는 수
      const lv = lvOf(p.mons[m.id]);
      const cell = el('div', 'pokedex-cell' + (n > 0 ? ' got' : ' unknown'));
      const url = urlById.get(m.id);
      if (url) {
        // 잡은 포켓몬은 장식·염색이 보이고, 누르면 꾸미기 화면
        const fig = makeFigure(url, n > 0 ? m.ko : '???', n > 0 ? getLook(m.id) : null);
        fig.dataset.id = String(m.id);
        cell.appendChild(fig);
      } else {
        cell.appendChild(el('div', 'pokedex-noimg', '?'));
      }
      cell.appendChild(el('div', 'nm', n > 0 ? m.ko : '???'));
      if (have > 1) cell.appendChild(el('div', 'cnt', `×${have}`));
      // 🧬 다 진화시켜 지금은 없는 모습 — 도감 칸은 남고 "보냈다"는 것만 보여 준다
      // 🔀 퓨전에 들어가 있으면 🔀 (5일장에서 나누면 돌아온다)
      // 💨 배틀에서 져서 떠났으면 💨 (2026-10-05 — 도감 칸은 남는다, 다시 잡으면 돌아온다)
      // 🚀 로켓단 아지트에 갇혀 있으면 🚀 (2026-10-09 — 도감 칸은 남는다, 로켓단을 이기면 구해 온다)
      else if (n > 0 && have === 0) cell.appendChild(el('div', 'cnt evolved', fusedOf(p.mons[m.id]) > 0 ? '🔀' : rocketHeldOf(p.mons[m.id]) > 0 ? '🚀' : fledOf(p.mons[m.id]) > 0 ? '💨' : '🧬'));
      if (n > 0 && have > 0 && rocketHeldOf(p.mons[m.id]) > 0) cell.appendChild(el('div', 'rocket-held', '🚀')); // 데리고 있는 것 말고 한 마리가 더 아지트에
      if (n > 0 && lv > 1) cell.appendChild(el('div', 'lv', `Lv${lv}`));
      // 🌌 울트라비스트는 🕳 울트라홀이 열려야 만난다 — 🔢 대신 🌌를 달아 "다른 차원에서 온 것"을 표시
      if (isUltraBeast(m.id)) cell.appendChild(el('div', 'subj ub', '🌌'));
      else if (subjectOf(m.id) === 'math') cell.appendChild(el('div', 'subj', '🔢')); // 수학에서만 잡히는 얼굴 — 못 잡은 칸에도 붙어 "수학 가면 있다"가 보인다
      else if (subjectOf(m.id) === 'korean') cell.appendChild(el('div', 'subj', '📚')); // 📚 국어에서만 (2026-10-11)
      if (n > 0 && getPartner() === m.id) cell.appendChild(el('div', 'partner', '🤝'));
      // 못 잡은 포켓몬도 누를 수 있다 — 등급은 **잡기 전에** 맞아야 의미가 있다 (전설이 흔함에 있으면 쉽게 잡힌다)
      cell.addEventListener('click', () => openMon({ id: m.id, ko: m.ko, url, caught: n > 0 }));
      grid.appendChild(cell);
    }
    sec.appendChild(grid);
    main.appendChild(sec);
  }
  // 아직 안 열린 포켓몬: 레벨별로 잠금 표시 (실루엣만, 이름 없음)
  const lockedLevels = [...new Set(ROSTER.map((m) => m.unlock || 1))].filter((u) => u > info.level).sort((a, b) => a - b);
  for (const lv of lockedLevels) {
    const list = ROSTER.filter((m) => (m.unlock || 1) === lv && !(p.caught[m.id] > 0));
    const sec = el('div', 'stats-card locked');
    sec.appendChild(el('h2', '', `🔒 Lv.${lv}에 열려요 (${list.length}마리)`));
    const grid = el('div', 'pokedex-grid');
    for (const m of list) {
      const cell = el('div', 'pokedex-cell unknown');
      const url = urlById.get(m.id);
      if (url) cell.appendChild(makeFigure(url, '???', null));
      else cell.appendChild(el('div', 'pokedex-noimg', '?'));
      cell.appendChild(el('div', 'nm', '???'));
      grid.appendChild(cell);
    }
    sec.appendChild(grid);
    main.appendChild(sec);
  }
  renderCoins();
  showView('pokedex');
  if (opts && opts.shop) openShop();
}
