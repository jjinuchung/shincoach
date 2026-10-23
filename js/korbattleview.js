// ⚔️ 국어·논술 배틀 화면 쪽 (v325) — 규칙은 korbattle.js(순수) · 배틀 판은 battle.js(영어·수학과 같은 것)
// koreanview(글 한 편)·nonsulview(한 판)가 저장을 마친 뒤 rollOffer → 끝 화면에 offerEl 단추 →
//   누르면 하루 몫을 선점(db.claimDailyCount 'battles' — 영어·수학과 같은 칸)하고 openBattle → 끝나면 결과 반영(수학 배틀과 같은 함수) → after()
// 배틀을 곧바로 띄우지 않고 단추로 — 방금 받은 ★·💰 화면을 가리지 않게, 🐣 부화·🎯 잡기 화면과 겹치지 않게
// 이 파일은 koreanview·nonsulview를 import하지 않는다(서로 돌지 않게 — 원고·화면은 부르는 쪽이 건넨다)
import { openBattle, BATTLE, TRAINERS, pickOpponent, eligibleMine } from './battle.js';
import { offerRoll, korBattleQ } from './korbattle.js';
import { allWords } from './korwords.js';
import { getDaily, claimDailyCount, releaseDailyCount } from './db.js';
import { todayKey } from './track.js';
import { guardStart } from './timeup.js'; // ⏳ 국어 하루 시간 — 배틀은 새로 시작하는 것 (🔍 Codex 129차 #5)
import { getProfileSnapshot, getPartner, isTired, getLook, lossesOf, haveCount, monLv, hasKeystone, hasMegaStone, hasGmax, battleWin, battleLoss, gainXp, gainCoins, consumeItem, inventory, getLevelInfo, korWordsMap } from './xp.js';
import { ROSTER, loadCharacters, isUnlocked, formsOf, formUrl } from './pokemon.js';
import { POTION, CALL_PAL } from './items.js';
import { josa } from './catch.js';

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

/** 헤드리스 시험용 — ?nosw=1에서 window.__korBattleForce면 확률 없이 (하루 몫은 그대로 본다) */
function forced() {
  return typeof location !== 'undefined' && /[?&]nosw=1/.test(location.search) && !!window.__korBattleForce;
}

/** 오늘 배틀 수(영어·수학·국어·논술 합) — 못 읽으면 다 쓴 것으로(단추를 안 낸다) */
async function todayBattles() {
  try { const d = await getDaily(todayKey()); return (d && Number(d.battles)) || 0; } catch { return BATTLE.maxPerDay; }
}

/**
 * 내보낼 수 있는 포켓몬 — 수학 배틀(math.myBattleMons)과 같은 규칙: 지금 데리고 있는 종 중 파트너·😴 제외 · ⭐ 변신은 키스톤+메가스톤 / 다이스프
 * @param {Array<{id:number, url:string}>} chars 받아 둔 포켓몬 그림
 */
export function battleMons(chars) {
  const caught = getProfileSnapshot().caught;
  const ids = Object.keys(caught).filter((k) => haveCount(k) > 0).map(Number);
  return eligibleMine(ids, getPartner(), (id) => isTired(id)).map((id) => {
    const r = ROSTER.find((m) => m.id === id);
    const c = (chars || []).find((x) => x.id === id);
    const f = formsOf(id) || {};
    const canMega = !!(f.mega && hasKeystone() && hasMegaStone(id));
    const canGmax = !!(f.gmax && hasGmax(id));
    return {
      id, ko: r ? r.ko : String(id), url: c ? c.url : '', look: getLook(id), losses: lossesOf(id), lv: monLv(id),
      canMega, canGmax,
      megaUrl: canMega ? formUrl(id, 'mega') : null,
      gmaxUrl: canGmax ? formUrl(id, 'gmax') : null,
    };
  });
}

// 🔤 낱말 원고 — 한 번 받아 두고 계속 쓴다 (배틀은 손질한 네 묶음만 — 📖 글에서 만난 낱말은 안 쓴다, korbattle.korBattleQ)
const W = { all: null };

/** 📚 국어 턴 문제 원천 — 낱말 원고를 받고 (seen) => 문제 · 받지 못하면 null */
export async function korWordsSource() {
  try {
    if (!W.all) {
      const res = await fetch('./coach/korean/words.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      W.all = allWords(await res.json(), []);
    }
  } catch { return null; }
  const all = W.all;
  return (seen) => korBattleQ(all, korWordsMap(), seen);
}

/**
 * 끝 화면에 배틀 단추를 낼까 — 하루 몫이 남았고 확률이 맞고, 상대·내 포켓몬·문제가 있으면 { subject, opponent, trainer, chars, getQ } · 아니면 null
 * @param {'korean'|'nonsul'} subject
 * @param {() => Promise<((seen:Set<string>) => object|null)|null>|((seen:Set<string>) => object|null)} prep 턴 문제 원천
 */
export async function rollOffer(subject, prep) {
  const n = await todayBattles();
  if (forced() ? n >= BATTLE.maxPerDay : !offerRoll({ todayBattles: n, max: BATTLE.maxPerDay })) return null;
  const getQ = await Promise.resolve().then(prep).catch(() => null);
  if (typeof getQ !== 'function' || !getQ(new Set())) return null;
  let chars = [];
  try { chars = (await loadCharacters()) || []; } catch { chars = []; }
  const level = getLevelInfo().level;
  const opponent = pickOpponent(chars.filter((c) => c && isUnlocked(c.id, level)), getProfileSnapshot().caught);
  if (!opponent || !battleMons(chars).length) return null;
  return { subject, opponent, trainer: TRAINERS[Math.floor(Math.random() * TRAINERS.length)], chars, getQ, used: false };
}

/**
 * 끝 화면의 배틀 단추 — 한 번만 눌린다 · ⏳ 국어 시간이 다 됐으면 잠금 화면부터(새로 시작하는 것 — 논술도 국어 시간, 🔍 Codex 129차 #5)
 * @param {object} offer rollOffer 결과 · @param {string} viewId 배틀 동안 뒤를 막을 화면('view-korean' · 'view-nonsul')
 * @param {() => void} after 배틀이 끝나거나(결과 반영 뒤) 열지 못했을 때 — 부르는 쪽이 단추를 치우고 다시 그린다
 * @param {{live:() => boolean, busy:() => boolean}} ctx live = 이 단추를 단 그 끝 화면이 아직 떠 있나 · busy = 🎯 잡기를 준비하는 중인가
 */
export function offerEl(offer, viewId, after, ctx) {
  const box = el('div', 'kor-battle-offer');
  box.appendChild(el('p', 'kor-battle-line', `${offer.trainer} 트레이너가 배틀하재요!`));
  const b = el('button', 'btn btn-primary kor-battle-btn', '⚔️ 배틀하러 가기');
  b.type = 'button';
  b.addEventListener('click', () => {
    if (offer.used || ctx.busy()) return; // 🎯 잡기를 준비하는 동안은 안 눌린다 (🔍 Codex 129차 #4)
    guardStart('korean', () => {
      if (offer.used || !ctx.live()) return;
      offer.used = true; // 연달아 눌러도 한 번
      b.disabled = true;
      startBattle(offer, viewId, after, ctx, b).catch(() => { after(); });
    });
  });
  box.appendChild(b);
  return box;
}

/** 다른 창(잡기·부화·⏳ 잠금·상점·진화 …)이 떠 있나 — 그 위에 배틀을 겹쳐 열지 않는다 (hatch.anyModalOpen과 같은 목록 + 부화) */
function overlayOpen() {
  return ['catch', 'hatch', 'shop', 'mon', 'battle', 'puzzle', 'review', 'essay', 'match', 'evolve', 'take', 'taken', 'timeup', 'market', 'parcel']
    .some((id) => { const e = document.getElementById(id); return !!e && !e.hidden; });
}

/** 잡아 둔 하루 몫 하나 돌려주기 — 배틀을 열지 못했을 때 (못 돌려줘도 조용히) */
function giveBack(day) {
  return releaseDailyCount(day, 'battles').catch(() => null);
}

/** 잠깐 떴다 사라지는 알림 (수학 배틀 결과와 같은 꼴) */
function toast(text) {
  const box = el('div', 'math-toast', text);
  document.body.appendChild(box);
  setTimeout(() => { box.classList.add('out'); }, 4200);
  setTimeout(() => { box.remove(); }, 5000);
}

/**
 * 배틀 열기 — 하루 몫을 선점하고(다른 창·과목이 다 썼으면 안 열림) 연다. 선점을 기다리는 사이 (🔍 Codex 129차 #1·#4)
 *   · 그 끝 화면을 떠났으면(다른 화면 · 같은 화면의 목록·다른 글·다음 판) 몫을 돌려주고 단추를 치운다
 *   · 🎯 잡기를 준비하기 시작했거나 다른 창이 떴으면 몫을 돌려주고 단추는 남긴다(다시 누를 수 있게)
 */
async function startBattle(offer, viewId, after, ctx, btn) {
  const day = todayKey();
  let won = false;
  try { won = (await claimDailyCount(day, 'battles', BATTLE.maxPerDay)).won; } catch { won = false; }
  if (!won) { toast('⚔️ 오늘 배틀은 다 했어요 — 내일 또 만나요'); after(); return; }
  const view = document.getElementById(viewId);
  if (!view || view.hidden || !ctx.live()) { await giveBack(day); after(); return; }
  if (ctx.busy() || overlayOpen()) { await giveBack(day); offer.used = false; btn.disabled = false; return; }
  const seen = new Set(); // 이번 배틀에 낸 문제 — 같은 낱말·주제가 거듭 나오지 않게
  const o = {
    opponent: offer.opponent,
    trainer: offer.trainer,
    mine: battleMons(offer.chars),
    potions: () => { const inv = inventory(); return POTION.filter((x) => inv[x.id] > 0).map((x) => ({ id: x.id, n: inv[x.id] })); },
    usePotion: (id) => consumeItem(id),
    palCount: () => inventory()[CALL_PAL.id] || 0, // 📣 동료 부르기 (v324 — 영어·수학과 같은 것)
    usePal: () => consumeItem(CALL_PAL.id),
    quiz: (box, hooks) => battleQuiz(box, hooks, () => offer.getQ(seen), seen),
    onDone: (r) => {
      view.inert = false;
      applyResult(r);
      after();
    },
  };
  view.inert = true; // 배틀 동안 뒤 화면 단추가 Tab으로 눌리지 않게 (영어 배틀과 같다)
  try { openBattle(o); } catch (e) { view.inert = false; await giveBack(day); throw e; } // 열다가 깨져도 뒤 화면은 풀고 몫은 돌려준다
}

/**
 * 배틀 한 턴의 문제 — battle.js가 자리를 주고, 문제·보기·판정은 여기서 (수학 battleQuiz와 같은 꼴)
 * @returns {Promise<{correct:boolean, skipped:boolean, interrupted:boolean}>}
 */
export function battleQuiz(box, hooks, getQ, seen) {
  return new Promise((resolve) => {
    let done = false;
    let picked = false; // 답을 고른 뒤 정답 표시 동안 ⏭가 판정을 뒤집지 않게 (수학 Codex 9차 #6과 같다)
    const finish = (r) => { if (done) return; done = true; resolve(r); };
    // 배틀이 닫히면(화면 꺼짐·뒤로) 이 턴은 없던 것으로 — 약속이 안 풀리면 배틀이 멈춘다
    if (hooks && hooks.register) hooks.register(() => finish({ correct: false, skipped: false, interrupted: true }));
    let q = null;
    try { q = getQ(); } catch { q = null; }
    if (!q) { finish({ correct: false, skipped: true, interrupted: false }); return; }
    if (seen) seen.add(q.id);
    if (typeof location !== 'undefined' && /[?&]nosw=1/.test(location.search)) window.__korBattleQ = q; // 헤드리스 검증용 (개발 모드에서만)
    box.appendChild(el('div', 'battle-quiz-label', q.label));
    box.appendChild(el('div', 'battle-quiz-q', q.q));
    const skip = el('button', 'btn battle-quiz-skip', '⏭ 모르겠어요');
    skip.type = 'button';
    const list = el('div', 'battle-quiz-choices is-text'); // 긴 글 보기 — 한 줄에 하나
    q.choices.forEach((ch) => {
      const b = el('button', 'btn battle-quiz-choice', ch.text);
      b.type = 'button';
      b.addEventListener('click', () => {
        if (done || picked) return;
        picked = true;
        [...list.children].forEach((x) => { x.disabled = true; });
        skip.disabled = true;
        b.classList.add(ch.ok ? 'ok' : 'no');
        if (!ch.ok) { const right = q.choices.findIndex((c) => c.ok); if (right >= 0) list.children[right].classList.add('ok'); }
        setTimeout(() => finish({ correct: !!ch.ok, skipped: false, interrupted: false }), ch.ok ? 350 : 1400); // 틀리면 정답을 읽을 틈
      });
      list.appendChild(b);
    });
    box.appendChild(list);
    skip.addEventListener('click', () => {
      if (done || picked) return;
      [...list.children].forEach((x) => { x.disabled = true; });
      finish({ correct: false, skipped: true, interrupted: false });
    });
    box.appendChild(skip);
  });
}

/** 배틀 결과: 승 → 상대 획득 + ⚡💰, 패(그만둠 포함) → 그 포켓몬 패배 +1 — 영어·수학과 같은 규칙·같은 함수 */
async function applyResult(r) {
  if (!r || r.outcome === 'declined') return;
  if (r.outcome === 'win') {
    const w = battleWin(r.opponent.id);
    gainXp(BATTLE.winXp);
    gainCoins(BATTLE.winCoins);
    toast(w.first
      ? `🎉 ${r.opponent.ko}${josa(r.opponent.ko, '이', '가')} 도감에 들어왔어요! ⚡+${BATTLE.winXp} 💰+${BATTLE.winCoins}`
      : `🎉 ${r.opponent.ko} 한 마리 더! ⚡+${BATTLE.winXp} 💰+${BATTLE.winCoins}`);
  } else if (r.my) {
    const l = await battleLoss(r.my.id, BATTLE.lossesToLose).catch(() => null);
    if (l && l.lost) toast(`😢 ${r.my.ko}${josa(r.my.ko, '이', '가')} ${BATTLE.lossesToLose}번 져서 떠났어요…`);
    else if (l) toast(`😢 졌어요. ${r.my.ko} 패배 ${l.losses}/${BATTLE.lossesToLose}`);
  }
}
