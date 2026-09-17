// ⚔️ 배틀 이벤트: 학습 중 아주 가끔 트레이너가 배틀을 걸어옴 → 내 포켓몬을 골라 싸움.
// 공격 = 문장 하나를 따라 말하기 → 얼마나 잘 말했는지가 데미지 (배틀이 곧 학습). 상대는 자동 공격.
// 이기면 상대 포켓몬을 얻고, 지면 그 포켓몬의 패배 수가 +1 (3번 지면 잃음 — xp.js battleLoss). 참가는 선택.
// 위쪽은 순수 규칙(테스트 가능), 아래쪽은 화면(DOM)
import { rarityOf, RARITY } from './xp.js';
import { POTION, itemById, makeFigure, setFigure } from './items.js';
import { sfx, vibrate, unlock } from './sfx.js';
import { burstConfetti, josa } from './catch.js';

// ── 규칙 ──
export const BATTLE = {
  // 문장을 제대로 완료할 때마다 이 확률로 등장 (3% → 4% → 8%).
  // 4%에서는 하루 30문장이면 **셋 중 하루는 한 번도 못 만났다**(0.96^26 = 35%). 진우가 하루 종일 못 만난 날이 그것.
  // 8%면 30문장에 11%, 50문장이면 2%로 떨어진다. 하루 최대 1번(maxPerDay)이라 너무 자주 나올 걱정은 없다.
  chance: 0.08,
  maxPerDay: 1,      // 하루 최대
  minDoneToday: 5,   // 오늘 이만큼 완료해야 등장 (대충 넘기기로는 못 만남)
  hp: 100,           // 양쪽 배틀 HP (파트너 HP와 별개)
  maxTurns: 8,       // 이 안에 못 끝내면 HP 많은 쪽 승
  enemyMin: 15, enemyMax: 25, // 상대 공격 데미지
  winXp: 40, winCoins: 15,
  lossesToLose: 3,   // 포켓몬마다 이만큼 지면 잃음
};

// 타입별 기술 2개: [강한 기술(잘 말하면 큼, 못 말하면 작음), 확실한 기술(고르게)]
// 데미지 표: 🌟완벽(일치 80%↑) / 🎯통과 / 미달 / 안 말함
export const MOVES = {
  electric: { emoji: '⚡', ko: '전기', strong: '백만볼트', safe: '전광석화' },
  fire: { emoji: '🔥', ko: '불꽃', strong: '화염방사', safe: '불꽃세례' },
  water: { emoji: '💧', ko: '물', strong: '하이드로펌프', safe: '물대포' },
  grass: { emoji: '🌿', ko: '풀', strong: '솔라빔', safe: '덩굴채찍' },
  normal: { emoji: '⭐', ko: '노말', strong: '몸통박치기', safe: '할퀴기' },
  psychic: { emoji: '🔮', ko: '에스퍼', strong: '사이코키네시스', safe: '염동력' },
  dragon: { emoji: '🐉', ko: '드래곤', strong: '용의숨결', safe: '드래곤클로' },
  ghost: { emoji: '👻', ko: '고스트', strong: '섀도볼', safe: '핥기' },
  fighting: { emoji: '👊', ko: '격투', strong: '파동탄', safe: '마하펀치' },
  ice: { emoji: '❄️', ko: '얼음', strong: '냉동빔', safe: '눈보라' },
  fairy: { emoji: '🧚', ko: '페어리', strong: '문포스', safe: '요정의바람' },
  dark: { emoji: '🌙', ko: '악', strong: '깨물어부수기', safe: '속임수' },
  rock: { emoji: '🗿', ko: '바위', strong: '스톤에지', safe: '돌떨구기' },
  ground: { emoji: '🏔️', ko: '땅', strong: '지진', safe: '진흙뿌리기' },
  steel: { emoji: '⚙️', ko: '강철', strong: '아이언헤드', safe: '메탈크로' },
};
/** ⭐ 변신 효과 (배틀에서만) — 메가는 배틀 내내, 거다이맥스는 3턴 */
export const FORM = {
  megaMult: 1.4,   // 메가진화: 공격 데미지 ×1.4
  gmaxMult: 1.6,   // 거다이맥스: ×1.6
  gmaxTurns: 3,    // 거다이맥스는 3턴만 (원작처럼)
};

/** 이번 턴 내 공격에 곱할 배율 (변신 안 했으면 1) */
export function formMult(form, turnsLeft) {
  if (form === 'mega') return FORM.megaMult;
  if (form === 'gmax' && turnsLeft > 0) return FORM.gmaxMult;
  return 1;
}

export const DAMAGE = {
  strong: { star: 40, pass: 25, fail: 8, none: 0 },
  safe: { star: 28, pass: 22, fail: 15, none: 5 },
};

// 명단 60마리의 타입 (pokemon.js ROSTER 순서와 무관, id 기준. 없으면 normal)
export const TYPE_OF = {
  25: 'electric', 26: 'electric', 135: 'electric', 145: 'electric', 644: 'electric', 172: 'electric', 179: 'electric', 125: 'electric',
  4: 'fire', 6: 'fire', 58: 'fire', 59: 'fire', 136: 'fire', 146: 'fire', 155: 'fire', 250: 'fire', 643: 'fire', 5: 'fire', 37: 'fire', 257: 'fire',
  7: 'water', 9: 'water', 54: 'water', 129: 'water', 130: 'water', 134: 'water', 158: 'water', 382: 'water', 393: 'water', 484: 'water', 658: 'water', 8: 'water', 194: 'water', 116: 'water', 260: 'water', 91: 'water',
  1: 'grass', 3: 'grass', 152: 'grass', 251: 'grass', 2: 'grass', 187: 'grass',
  39: 'fairy', 175: 'fairy', 700: 'fairy', 716: 'fairy', 888: 'fairy', 35: 'fairy',
  52: 'normal', 113: 'normal', 133: 'normal', 143: 'normal', 493: 'normal', 12: 'normal', 19: 'normal', 123: 'normal', 137: 'normal',
  94: 'ghost', 487: 'ghost', 778: 'ghost', 92: 'ghost',
  131: 'ice', 144: 'ice', 220: 'ice', 646: 'ice',
  149: 'dragon', 384: 'dragon', 445: 'dragon', 147: 'dragon', 148: 'dragon', 373: 'dragon', 380: 'dragon', 381: 'dragon', 887: 'dragon', 890: 'dragon',
  150: 'psychic', 151: 'psychic', 196: 'psychic', 249: 'psychic', 282: 'psychic', 280: 'psychic', 63: 'psychic', 65: 'psychic', 386: 'psychic', 800: 'psychic',
  448: 'fighting', 68: 'fighting', 447: 'fighting', 66: 'fighting',
  197: 'dark',
  95: 'rock', 248: 'rock', 246: 'rock', 142: 'rock',
  104: 'ground', 383: 'ground', 645: 'ground',
  483: 'steel', 212: 'steel', 376: 'steel',
};

export function typeOf(id) {
  return TYPE_OF[id] || 'normal';
}

/** 포켓몬의 기술 2개 → [{ key:'strong'|'safe', name, emoji }] */
export function movesOf(id) {
  const m = MOVES[typeOf(id)] || MOVES.normal;
  return [
    { key: 'strong', name: m.strong, emoji: m.emoji, hint: '잘 말하면 세게!' },
    { key: 'safe', name: m.safe, emoji: m.emoji, hint: '꾸준히' },
  ];
}

/** 말하기 결과 → 등급: star | pass | fail | none */
export function speakTier(result) {
  if (!result || result.method === 'cancelled') return 'none';
  if (result.method === 'none') return 'pass'; // 마이크를 못 쓰는 기기: 확인 없이 통과 취급
  if (!result.passed) return result.transcript || (result.spokenMs || 0) > 300 ? 'fail' : 'none';
  if (result.score && result.score.ratio >= 0.8) return 'star';
  return 'pass';
}

export function damageFor(moveKey, result) {
  const t = DAMAGE[moveKey] || DAMAGE.safe;
  return t[speakTier(result)];
}

export function enemyDamage(rng = Math.random) {
  return BATTLE.enemyMin + Math.floor(rng() * (BATTLE.enemyMax - BATTLE.enemyMin + 1));
}

/** 오늘 배틀이 나올 차례인지 (문장을 제대로 완료한 시점에 호출) */
export function shouldBattle({ todayDone, todayBattles, rng = Math.random }) {
  if (todayBattles >= BATTLE.maxPerDay) return false;
  if (todayDone < BATTLE.minDoneToday) return false;
  return rng() < BATTLE.chance;
}

/**
 * 상대 포켓몬 고르기: 아직 못 잡은 것 중 하나 (희귀할수록 덜 나옴). 없으면 null
 * @param {Array<{id:number}>} unlocked 지금 레벨에서 열린 명단
 * @param {Object} caught { id: 마릿수 }
 */
export function pickOpponent(unlocked, caught, rng = Math.random) {
  const pool = [];
  for (const m of unlocked) {
    if (caught[m.id] > 0) continue;
    const w = [0, 6, 4, 2, 1][rarityOf(m.id)] || 2; // 흔함 6 : 보통 4 : 희귀 2 : 전설 1
    for (let i = 0; i < w; i++) pool.push(m);
  }
  if (!pool.length) return null;
  return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
}

/** 내가 내보낼 수 있는 포켓몬: 잡은 것 중 파트너·😴 제외 */
export function eligibleMine(caughtIds, partnerId, isTiredFn) {
  return caughtIds.filter((id) => id !== partnerId && !(isTiredFn && isTiredFn(id)));
}

// ── 화면 ──
const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TRAINERS = ['🧢', '👧', '👦', '🤠', '🧙', '🧝', '🕵️', '👮']; // ZWJ 조합·최신 이모지 없이 (안드로이드 10)
const ui = { open: false, run: 0, o: null, my: null, myHp: 0, enemyHp: 0, turn: 0, busy: false, result: null };

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

export function initBattle() {
  $('battle-accept').addEventListener('click', () => { unlock(); showPick(); });
  $('battle-decline').addEventListener('click', () => finish({ outcome: 'declined' }));
  $('battle-continue').addEventListener('click', () => finish(ui.result));
  $('battle-speak-done').addEventListener('click', () => { if (ui.speakStop) ui.speakStop(); });
}

export function isBattleOpen() {
  return ui.open;
}

/**
 * 배틀 열기
 * @param {object} o
 * @param {{id:number, ko:string, url:string}} o.opponent 상대 포켓몬
 * @param {Array<{id:number, ko:string, url:string, look:object, losses:number}>} o.mine 내보낼 수 있는 내 포켓몬
 * @param {() => {id:string, n:number}[]} o.potions 가방의 물약 목록 (매번 새로 읽음)
 * @param {(potionId:string) => boolean} o.usePotion 물약 소모 (프로필에서 빼기)
 * @param {() => object|null} o.nextCue 이번 턴에 따라 말할 문장
 * @param {(cue:object, hooks:{onInterim:(t:string)=>void, onLevel:()=>void, register:(stop:()=>void)=>void}) => Promise<object>} o.speak 문장 들려주고 따라 말하기 → 말하기 결과
 * @param {boolean} [o.practice] 연습(결과 반영 없음)
 * @param {(result:{outcome:'win'|'lose'|'declined'|'quit', my?:object, opponent:object, turns:number}) => void} o.onDone
 */
export function openBattle(o) {
  closeBattle();
  ui.open = true;
  ui.run++;
  ui.o = o;
  ui.my = null;
  ui.turn = 0;
  ui.busy = false;
  ui.result = null;
  ui.speakStop = null;
  const trainer = TRAINERS[Math.floor(Math.random() * TRAINERS.length)];
  $('battle-title').textContent = o.practice ? '⚔️ 배틀 연습' : '⚔️ 배틀!';
  $('battle-trainer').textContent = trainer;
  $('battle-msg').textContent = `"${o.opponent.ko}${josa(o.opponent.ko, '이', '가')} 나랑 있어. 배틀 할래?"`;
  const ef = $('battle-intro-fig');
  setFigure(ef, o.opponent.url || '', null);
  $('battle-intro-name').textContent = `${o.opponent.ko} · ${RARITY[rarityOf(o.opponent.id)].stars}`;
  $('battle-intro').hidden = false;
  $('battle-pick').hidden = true;
  $('battle-stage').hidden = true;
  $('battle-speak').hidden = true;
  $('battle-actions').hidden = true;
  $('battle-result').textContent = '';
  $('battle-continue').hidden = true;
  $('battle-note').textContent = o.practice ? '연습이라 결과가 남지 않아요' : `이기면 ${o.opponent.ko}${josa(o.opponent.ko, '을', '를')} 데려와요. 지면 내보낸 포켓몬의 패배가 1 늘어요 (${BATTLE.lossesToLose}번 지면 떠나요)`;
  $('battle').hidden = false;
}

export function closeBattle() {
  if (!ui.open) return;
  ui.open = false;
  ui.run++;
  if (ui.speakStop) { try { ui.speakStop('cancel'); } catch (e) { /* 무시 */ } ui.speakStop = null; }
  $('battle').hidden = true;
  ui.o = null;
}

/**
 * 강제로 닫힐 때 넘길 결과: 이미 확정된 승패가 있으면 그대로(Codex #1: '계속하기' 전에 닫아도 보상·패배가 사라지지 않게),
 * 싸우던 중이면 패배(quit), 아직 안 싸웠으면 거절
 */
export function abortOutcome({ my, result, turn, opponent }) {
  if (result && (result.outcome === 'win' || result.outcome === 'lose')) return { ...result };
  if (my) return { outcome: 'quit', my, opponent, turns: turn || 0 };
  return { outcome: 'declined', opponent, turns: 0 };
}

/** 배틀 중 강제로 닫힘(콘텐츠 닫기 등) */
export function abortBattle() {
  if (!ui.open) return;
  const o = ui.o;
  const r = abortOutcome({ my: ui.my, result: ui.result, turn: ui.turn, opponent: o.opponent });
  closeBattle();
  if (o && o.onDone) o.onDone(r);
}

function finish(result) {
  if (!ui.open) return;
  const o = ui.o;
  closeBattle();
  if (o && o.onDone) o.onDone({ outcome: 'declined', opponent: o.opponent, turns: 0, ...(result || {}) });
}

function showPick() {
  const o = ui.o;
  $('battle-intro').hidden = true;
  const pick = $('battle-pick');
  pick.innerHTML = '';
  pick.hidden = false;
  $('battle-msg').textContent = '누구를 내보낼까요?';
  if (!o.mine.length) {
    pick.appendChild(el('div', 'battle-empty', '내보낼 포켓몬이 없어요 (파트너는 못 내보내요)'));
    $('battle-continue').hidden = false;
    ui.result = { outcome: 'declined' };
    return;
  }
  for (const c of o.mine) {
    const btn = el('button', 'catch-cand');
    btn.type = 'button';
    btn.appendChild(makeFigure(c.url, c.ko, c.look));
    btn.appendChild(el('span', 'nm', c.ko));
    const t = MOVES[typeOf(c.id)];
    btn.appendChild(el('span', 'rr', `${t.emoji} ${t.ko}`));
    if (c.losses) btn.appendChild(el('span', 'own lose', `패배 ${c.losses}/${BATTLE.lossesToLose}`));
    if (c.canMega) btn.appendChild(el('span', 'own mega', '💠 메가진화'));
    else if (c.canGmax) btn.appendChild(el('span', 'own mega', '🍲 거다이맥스'));
    btn.addEventListener('click', () => startFight(c));
    pick.appendChild(btn);
  }
}

function startFight(c) {
  const o = ui.o;
  ui.my = c;
  ui.form = null;        // ⭐ 이번 배틀에서 변신했는지 ('mega' | 'gmax')
  ui.gmaxLeft = 0;       // 거다이맥스 남은 턴
  ui.myHp = BATTLE.hp;
  ui.enemyHp = BATTLE.hp;
  ui.turn = 0;
  $('battle-pick').hidden = true;
  const stage = $('battle-stage');
  stage.hidden = false;
  setFigure($('battle-enemy-fig'), o.opponent.url || '', null);
  $('battle-enemy-name').textContent = o.opponent.ko;
  setFigure($('battle-my-fig'), c.url || '', c.look);
  $('battle-my-name').textContent = c.ko;
  $('battle-enemy-fig').className = 'mon-figure battle-fig';
  $('battle-my-fig').className = 'mon-figure battle-fig';
  renderHp();
  $('battle-msg').textContent = `${c.ko}, 가자! 기술을 골라요`;
  sfx.whoosh();
  renderActions();
}

function renderHp() {
  $('battle-enemy-hp').style.width = `${(ui.enemyHp / BATTLE.hp) * 100}%`;
  $('battle-my-hp').style.width = `${(ui.myHp / BATTLE.hp) * 100}%`;
  $('battle-enemy-hp').classList.toggle('low', ui.enemyHp <= 30);
  $('battle-my-hp').classList.toggle('low', ui.myHp <= 30);
  $('battle-enemy-hpt').textContent = ui.enemyHp;
  $('battle-my-hpt').textContent = ui.myHp;
}

/** ⭐ 변신! (배틀당 한 번, 턴을 쓰지 않는다 — 원작처럼 "이번 턴에 변신하고 바로 공격") */
function transform(kind) {
  if (ui.form) return;
  ui.form = kind;
  ui.gmaxLeft = kind === 'gmax' ? FORM.gmaxTurns : 0;
  const url = kind === 'mega' ? ui.my.megaUrl : ui.my.gmaxUrl;
  const fig = $('battle-my-fig');
  if (url) setFigure(fig, url, null);           // 변신한 모습 (꾸밈은 빼고 — 모습이 통째로 바뀐다)
  fig.classList.toggle('gmax', kind === 'gmax'); // 거다이맥스는 거대하게
  $('battle-msg').textContent = kind === 'mega'
    ? `💠 ${ui.my.ko} 메가진화! 공격이 강해졌어요`
    : `🍲 ${ui.my.ko} 거다이맥스! ${FORM.gmaxTurns}턴 동안 아주 강해져요`;
  if (ui.o.sfx) ui.o.sfx.levelUp();
  renderActions();
}

/** 거다이맥스 3턴이 끝나면 원래 모습으로 */
function revertForm() {
  ui.form = null;
  const fig = $('battle-my-fig');
  setFigure(fig, ui.my.url || '', ui.my.look);
  fig.classList.remove('gmax');
}

function renderActions() {
  const box = $('battle-actions');
  box.innerHTML = '';
  box.hidden = false;
  // ⭐ 아직 변신 안 했으면 변신 버튼을 맨 앞에
  if (!ui.form) {
    for (const [kind, ok, emoji, name, hint] of [
      ['mega', ui.my.canMega, '💠', '메가진화!', `공격 ×${FORM.megaMult}`],
      ['gmax', ui.my.canGmax, '🍲', '거다이맥스!', `${FORM.gmaxTurns}턴 동안 ×${FORM.gmaxMult}`],
    ]) {
      if (!ok) continue;
      const btn = el('button', 'btn battle-move form');
      btn.type = 'button';
      btn.appendChild(el('span', 'em', emoji));
      btn.appendChild(el('span', 'nm', name));
      btn.appendChild(el('span', 'hint', hint));
      btn.addEventListener('click', () => transform(kind));
      box.appendChild(btn);
    }
  }
  for (const mv of movesOf(ui.my.id)) {
    const btn = el('button', 'btn battle-move');
    btn.type = 'button';
    btn.appendChild(el('span', 'em', mv.emoji));
    btn.appendChild(el('span', 'nm', mv.name));
    btn.appendChild(el('span', 'hint', mv.hint));
    btn.addEventListener('click', () => playerTurn(mv.key));
    box.appendChild(btn);
  }
  for (const pt of ui.o.potions()) {
    const it = itemById(pt.id);
    if (!it) continue;
    const btn = el('button', 'btn battle-move potion');
    btn.type = 'button';
    btn.appendChild(el('span', 'em', it.emoji));
    btn.appendChild(el('span', 'nm', `${it.ko} +${it.heal}`));
    btn.appendChild(el('span', 'hint', `가방 ${pt.n}개`));
    btn.disabled = ui.myHp >= BATTLE.hp;
    btn.addEventListener('click', () => potionTurn(pt.id));
    box.appendChild(btn);
  }
}

/** 내 턴: 기술 선택 → 문장 따라 말하기 → 데미지 */
async function playerTurn(moveKey) {
  if (!ui.open || ui.busy) return;
  const run = ui.run;
  const alive = () => ui.open && ui.run === run;
  ui.busy = true;
  ui.turn++;
  $('battle-actions').hidden = true;
  const cue = ui.o.nextCue();
  const mv = movesOf(ui.my.id).find((m) => m.key === moveKey);
  const sp = $('battle-speak');
  sp.hidden = false;
  $('battle-sentence').textContent = cue ? cue.en : '';
  $('battle-speak-status').textContent = '🔊 듣고 나서 따라 말해요…';
  $('battle-speak-done').textContent = '⏭ 듣기 건너뛰기'; // 듣는 중 / 말하는 중에 버튼 뜻이 다름 (Codex #8)
  $('battle-msg').textContent = `${ui.my.ko}의 ${mv.emoji} ${mv.name}! 문장을 따라 말하면 공격!`;
  let result = null;
  try {
    result = await ui.o.speak(cue, {
      onInterim: (t) => { $('battle-speak-status').textContent = `🗣 ${t}`; },
      onListening: () => { $('battle-speak-status').textContent = '🎤 지금 따라 말해요!'; $('battle-speak-done').textContent = '다 말했어요 ✓'; },
      onLevel: (level, spokenMs) => { if (spokenMs > 300) $('battle-speak-status').textContent = '🗣 듣고 있어요…'; }, // 소리 길이 판정 기기에서도 반응 표시
      register: (stop) => { ui.speakStop = stop; },
    });
  } catch (e) { result = null; }
  ui.speakStop = null;
  if (!alive()) return;
  sp.hidden = true;
  // 화면이 꺼지는 등으로 중단된 턴은 없던 것으로 — 데미지·턴 소모 없이 다시 고르기 (Codex #3)
  if (result && result.method === 'interrupted') {
    ui.turn--;
    ui.busy = false;
    $('battle-msg').textContent = '📵 잠깐 멈췄어요. 이 턴은 다시 해요 — 기술을 골라요';
    renderActions();
    return;
  }
  const tier = speakTier(result);
  const mult = formMult(ui.form, ui.gmaxLeft);
  const dmg = Math.round(damageFor(moveKey, result) * mult);
  if (ui.form === 'gmax' && ui.gmaxLeft > 0) {
    ui.gmaxLeft--;
    if (ui.gmaxLeft === 0) revertForm(); // 3턴이 지나면 원래 모습으로
  }
  const tierMsg = { star: '🌟 완벽해요!', pass: '🎯 잘했어요!', fail: '🔁 조금 아쉬워요', none: '😶 말소리가 없었어요' }[tier];
  const heard = result && result.transcript ? ` "${result.transcript}"` : '';
  $('battle-msg').textContent = `${tierMsg}${heard} → ${mv.name} 데미지 ${dmg}`;
  if (dmg > 0) {
    ui.enemyHp = Math.max(0, ui.enemyHp - dmg);
    hitFx('enemy', dmg, tier === 'star');
    sfx.hit(); vibrate(30);
  } else { sfx.wrong(); }
  renderHp();
  await sleep(1300); if (!alive()) return;
  if (ui.enemyHp <= 0) { endFight('win'); return; }
  await enemyTurn(); if (!alive()) return;
  if (ui.myHp <= 0) { endFight('lose'); return; }
  if (ui.turn >= BATTLE.maxTurns) { endFight(ui.myHp >= ui.enemyHp ? 'win' : 'lose'); return; }
  ui.busy = false;
  $('battle-msg').textContent = '기술을 골라요';
  renderActions();
}

/** 물약 턴: 회복하고 상대가 공격 */
async function potionTurn(potionId) {
  if (!ui.open || ui.busy) return;
  const run = ui.run;
  const alive = () => ui.open && ui.run === run;
  const it = itemById(potionId);
  if (!it || !ui.o.usePotion(potionId)) return;
  ui.busy = true;
  ui.turn++;
  $('battle-actions').hidden = true;
  const before = ui.myHp;
  ui.myHp = Math.min(BATTLE.hp, ui.myHp + it.heal);
  $('battle-msg').textContent = `${it.emoji} ${it.ko}! ${ui.my.ko} HP ${before} → ${ui.myHp}`;
  sfx.ding();
  renderHp();
  await sleep(1000); if (!alive()) return;
  await enemyTurn(); if (!alive()) return;
  if (ui.myHp <= 0) { endFight('lose'); return; }
  if (ui.turn >= BATTLE.maxTurns) { endFight(ui.myHp >= ui.enemyHp ? 'win' : 'lose'); return; }
  ui.busy = false;
  $('battle-msg').textContent = '기술을 골라요';
  renderActions();
}

async function enemyTurn() {
  const run = ui.run;
  const alive = () => ui.open && ui.run === run;
  const o = ui.o;
  const t = MOVES[typeOf(o.opponent.id)];
  const dmg = enemyDamage();
  $('battle-msg').textContent = `상대 ${o.opponent.ko}의 ${t.emoji} ${t.safe}!`;
  await sleep(700); if (!alive()) return;
  ui.myHp = Math.max(0, ui.myHp - dmg);
  hitFx('my', dmg, false);
  sfx.hit(); vibrate(40);
  renderHp();
  await sleep(1100);
}

function hitFx(side, dmg, big) {
  const fig = $(side === 'enemy' ? 'battle-enemy-fig' : 'battle-my-fig');
  fig.classList.remove('hit');
  void fig.offsetWidth;
  fig.classList.add('hit');
  const fx = el('span', 'battle-dmg' + (big ? ' big' : ''), `-${dmg}`);
  const box = $(side === 'enemy' ? 'battle-enemy' : 'battle-my');
  box.appendChild(fx);
  setTimeout(() => fx.remove(), 1200);
}

function endFight(outcome) {
  const o = ui.o;
  ui.busy = true;
  $('battle-actions').hidden = true;
  const res = $('battle-result');
  if (outcome === 'win') {
    $('battle-enemy-fig').classList.add('down');
    $('battle-msg').textContent = '🏆 이겼다!';
    res.textContent = o.practice ? `(연습) ${o.opponent.ko}${josa(o.opponent.ko, '을', '를')} 데려왔을 거예요` : `🎉 ${o.opponent.ko}${josa(o.opponent.ko, '이', '가')} 우리 편이 됐어요! ⚡+${BATTLE.winXp} 💰+${BATTLE.winCoins}`;
    sfx.success(); vibrate([40, 60, 40, 60, 160]); burstConfetti();
  } else {
    $('battle-my-fig').classList.add('down');
    $('battle-msg').textContent = '😢 졌어요…';
    const losses = (ui.my.losses || 0) + 1;
    res.textContent = o.practice ? '(연습) 진짜 배틀이면 패배가 1 늘어요'
      : losses >= BATTLE.lossesToLose ? `${ui.my.ko}${josa(ui.my.ko, '이', '가')} ${BATTLE.lossesToLose}번 져서 떠났어요… 다음엔 더 또렷하게 말해봐요` : `${ui.my.ko} 패배 ${losses}/${BATTLE.lossesToLose} — 다음엔 더 또렷하게 말해봐요`;
    sfx.fail(); vibrate(200);
  }
  ui.result = { outcome, my: ui.my, opponent: o.opponent, turns: ui.turn };
  $('battle-continue').hidden = false;
}
