// 🎯 포켓몬 잡기 화면: 퍼즐 정답 뒤 경험치를 보여주고, 퍼즐에 나온 포켓몬 중 한 마리를 골라 몬스터볼을 던진다.
// 잡힐지는 운(xp.catchAttempt) — 볼이 날아가 맞고, 포켓몬이 볼로 들어가고, 볼이 흔들리다가 잡히거나 튀어나온다 (전부 CSS 연출)
import { rarityOf, RARITY, caughtCount, haveCount, xpToReach, inventory, rollTrueGold, spendBall, refundBall } from './xp.js';
import * as bgm from './bgm.js';
import { nextUnlockLevel, unlockCountAt } from './pokemon.js';
import { sfx, vibrate, unlock } from './sfx.js';
import { makeFigure, setFigure, BALLS, POKEBALL, TRUE_GOLD } from './items.js';
import { openShop, closeShop, isBallShopOpen } from './shop.js'; // 🛒 볼 사러 가기 — 잡기 화면 위에 볼 상점
import { animUrl, ensureAnims } from './sprite.js'; // 🕺 움직이는 도트 그림
import { isUltraBeast } from './pokemon.js'; // 🌌 울트라비스트 — ⚪ 비스트볼이 있어야 제대로 잡힌다

const $ = (id) => document.getElementById(id);
const BEASTBALL_ID = 'beastball';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ui = { open: false, run: 0, threw: false, onDone: null, attempt: null, timer: null, practice: false, xpGain: 0, coinGain: 0, pendingAuto: false, candidates: [], shop: false }; // candidates = 지금 화면의 후보 (🧭 레이더가 바꿔 그린다) · shop = 이 잡기 화면이 연 🛒 볼 상점이 떠 있다

export function initCatch() {
  $('catch-continue').addEventListener('click', finish);
  // 🛒 가방이 바뀌면(볼 상점이 아닌 곳에서 샀어도) 던지기 전이면 볼 줄을 다시 — 고르던 볼은 그대로
  document.addEventListener('shincoach:profilechange', () => { if (ui.open) refreshBalls(ui.ball); });
  // 화면이 꺼진 동안 자동 종료가 밀려 있었으면, 돌아왔을 때 잠깐 보여주고 이어감
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || !ui.open || !ui.pendingAuto) return;
    ui.pendingAuto = false;
    clearTimeout(ui.timer);
    ui.timer = setTimeout(autoFinish, 1500);
  });
}

/** 자동 종료: 화면이 꺼져 있으면(잠금 등) 보류 — 안 보이는 사이에 다음 문장이 재생되지 않게 */
function autoFinish() {
  if (!ui.open) return;
  if (document.hidden) { ui.pendingAuto = true; return; }
  finish();
}

export function isCatchOpen() {
  return ui.open;
}

/** 받침 유무로 조사 고르기: josa('피카츄', '이', '가') → '가' */
export function josa(word, withBatchim, without) {
  const ch = String(word || '').slice(-1);
  const code = ch.charCodeAt(0) - 0xAC00;
  if (code < 0 || code > 11171) return without;
  return code % 28 === 0 ? without : withBatchim;
}

/**
 * 잡기 화면 열기
 * @param {object} o
 * @param {Array<{id:number, ko:string, url:string}>} o.candidates 고를 수 있는 포켓몬 (퍼즐에 나온 것)
 * @param {number} [o.xpGain] 방금 얻은 XP (머리글에 표시)
 * @param {number} [o.coinGain] 방금 얻은 💰 코인 (머리글에 표시)
 * @param {{level:number, into:number, need:number}} o.levelInfo 현재 레벨
 * @param {number} [o.levelUp] 레벨업했으면 새 레벨
 * @param {(id:number) => {caught:boolean, chance:number, count:number, first:boolean, bonusXp:number, info:object}} o.attempt 던지기 판정
 * @param {boolean} [o.practice] 연습 모드 표시
 * @param {'math'} [o.subject] 🔢 수학에서 연 잡기 — 후보가 수학 전용 포켓몬이라는 걸 아이에게 알린다
 * @param {string} [o.note] 머리글에 덧붙일 한 줄
 * @param {{count:number, use:(cur:Array)=>Promise<{candidates:Array, pickId:number, note:string}|null>}} [o.radar] 🧭 레이더가 가방에 있으면 — 아이가 누르면 use()가 후보를 바꿔 준다
 * @param {() => void} [o.onDone] 닫힐 때
 * @param {() => number} [o.goldRng] 🌕 진짜 황금 몬스터볼 뽑기의 난수 (헤드리스 확인용 — 보통은 Math.random)
 */
export function openCatch(o) {
  bgm.play(); // 🎵 이어서
  closeCatch();
  ui.open = true;
  ui.run++;
  ui.onDone = o.onDone || null;
  ui.attempt = o.attempt;
  ui.practice = !!o.practice;
  ui.xpGain = o.xpGain || 0;
  ui.coinGain = o.coinGain || 0;
  ui.pendingAuto = false;

  renderHeader(o.xpGain, o.levelInfo, o.levelUp);
  $('catch-msg').textContent = (o.note ? `${o.note} · ` : '') + (o.subject === 'math'
    ? '🔢 수학에서만 만나는 포켓몬이에요! 한 마리 골라 몬스터볼을 던져봐요'
    : '포켓몬을 한 마리 골라 몬스터볼을 던져봐요!');
  $('catch-result').innerHTML = '';
  $('catch-continue').hidden = true;
  const stage = $('catch-stage');
  stage.hidden = true;
  const ball = $('catch-ball');
  ball.className = 'catch-ball';
  ball.style.transform = '';
  const mon = $('catch-mon');
  mon.className = 'catch-mon mon-figure';
  $('catch-fx').textContent = '';
  ui.asking = null;
  const cc = $('catch-confirm');
  if (cc) { cc.hidden = true; cc.innerHTML = ''; }

  renderPick(o.candidates, 0);
  // 🌌 울트라비스트가 후보에 있으면 **던지기 전에** 알려 준다 — 몬스터볼로 던지면 거의 못 잡고 기회만 쓴다
  if ((o.candidates || []).some((c) => isUltraBeast(c.id))) {
    const has = (o.ballCounts || {})[BEASTBALL_ID] > 0;
    const gold = (o.ballCounts || {})[TRUE_GOLD.id] > 0; // 🌕 진짜 황금 몬스터볼도 울트라비스트를 무조건 잡는다
    $('catch-msg').textContent = has
      ? `🌌 울트라비스트가 나타났다! ⚪ 비스트볼로 던져야 잡혀요${gold ? ' (🌕 진짜 황금 몬스터볼도 돼요)' : ''}`
      : gold
        ? '🌌 울트라비스트가 나타났다! 🌕 진짜 황금 몬스터볼이면 무조건 잡혀요 (아니면 ⚪ 비스트볼이 있어야 해요)'
        : `🌌 울트라비스트가 나타났다! ⚪ 비스트볼이 있어야 잡을 수 있어요 ${ui.practice ? '(🛒 상점)' : '— 아래 🛒 볼 사러 가기'}`;
  }
  // 🕺 도트를 아직 안 받았으면 받아서 **그림만** 바꿔 끼운다.
  // ★ 여기서 renderPick을 다시 부르면 안 된다 — 후보 버튼을 통째로 새로 만들기 때문에,
  //   아이가 포켓몬을 누르려던 바로 그 순간 버튼이 사라져 **탭이 씹힌다**.
  //   수학은 잡기 화면을 띄우기 **전에** 던지기를 차감하므로, 그대로 닫으면 던질 기회만 날아간다
  //   (진우: "볼을 던졌는데 아무 일도 안 일어나고 낭비만 했어요" — v130에서 제가 만든 회귀).
  const needDots = (o.candidates || []).filter((c) => !animUrl(c.id)).map((c) => c.id);
  if (needDots.length) {
    const run = ui.run;
    ensureAnims(needDots).then(() => { if (ui.open && ui.run === run) swapDots(); }).catch(() => {});
  }
  // 🧭 레이더 — 가방에 있을 때만 버튼. 누르면 하나 쓰고 후보 한 마리가 희귀 이상으로 (어느 것인지 🧭 배지)
  const rbox = $('catch-radar');
  if (rbox) {
    rbox.innerHTML = '';
    rbox.hidden = !(o.radar && o.radar.count > 0);
    if (o.radar && o.radar.count > 0) {
      const rb = document.createElement('button');
      rb.type = 'button';
      rb.className = 'btn catch-radar-btn';
      rb.textContent = `🧭 레이더 쓰기 (${o.radar.count}개) — 희귀 이상 한 마리 부르기`;
      rb.addEventListener('click', async () => {
        const run = ui.run; // 이 잡기 화면의 것인지 — 던진 뒤·다음 잡기 위에 옛 후보를 다시 그리지 않게 (Codex 7차 #4)
        rb.disabled = true;
        rb.textContent = '🧭 레이더 작동 중…';
        const cands = Array.from($('catch-pick').querySelectorAll('button'));
        for (const b of cands) b.disabled = true; // 레이더가 도는 동안은 던질 수 없다
        let r = null;
        try { r = await o.radar.use(ui.candidates); } catch { r = null; }
        if (!ui.open || run !== ui.run || $('catch-pick').hidden) return; // 그 사이 던졌거나 닫혔다 — 아무것도 안 바꾼다
        for (const b of cands) b.disabled = false;
        if (!r) { rb.textContent = '🧭 레이더를 못 썼어요 — 그림을 못 받았어요 (레이더는 그대로예요)'; return; }
        renderPick(r.candidates, r.pickId);
        $('catch-msg').textContent = `${r.note} · 누구에게 던질까요?`;
        rbox.hidden = true;
      });
      rbox.appendChild(rb);
    }
  }
  renderBalls(o.ballCounts || {}, POKEBALL.id);
  const tg = $('catch-truegold');
  if (tg) tg.hidden = true;
  $('catch').hidden = false;
  // 🌕 진짜 황금 몬스터볼 — 잡기 화면이 열릴 때마다 0.1% (⚙ 잡기 연습은 빼고). 세상에 하나뿐이라 가지고 있으면 안 굴린다
  if (!ui.practice) {
    const run = ui.run;
    rollTrueGold(o.goldRng || Math.random).then((got) => { if (got) foundTrueGold(run); }).catch(() => {});
  }
}

/** 🌕 찾았다! — 크게 알리고 볼 줄에 넣는다. 저절로 고르지는 않는다 (아껴 쓰게) */
function foundTrueGold(run) {
  if (!ui.open || ui.run !== run) return; // 그 사이 던졌거나 닫혔다 — 볼은 가방에 있다 (다음 잡기 화면에 보인다)
  const tg = $('catch-truegold');
  if (tg) {
    tg.textContent = `✨ ${TRUE_GOLD.emoji} 세상에 하나뿐인 ${TRUE_GOLD.ko}을 찾았다! 무조건 잡히는 볼이에요 — 아껴 써요`;
    tg.hidden = false;
  }
  burstConfetti(120);
  sfx.success();
  vibrate([60, 40, 60, 40, 200]);
  refreshBalls(ui.ball);
}

/** 후보 목록 그리기 — pickId가 있으면 그 칸에 🧭 배지 */
function renderPick(candidates, pickId) {
  const pick = $('catch-pick');
  pick.innerHTML = '';
  pick.hidden = false;
  ui.candidates = candidates.slice();
  for (const c of candidates) {
    const r = rarityOf(c.id);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'catch-cand' + (pickId && c.id === pickId ? ' radar' : '');
    btn.dataset.id = String(c.id);
    // 🕺 후보는 움직이는 도트로 (작게 여럿 늘어서는 자리라 도트가 제격이다). 없으면 평소 일러스트
    const dot = animUrl(c.id);
    const face = makeFigure(dot || c.url, c.ko, dot ? null : c.look);
    if (dot) face.classList.add('dot');
    btn.appendChild(face);
    if (pickId && c.id === pickId) { const badge = document.createElement('span'); badge.className = 'radar-badge'; badge.textContent = '🧭'; btn.appendChild(badge); }
    // 🌌 울트라비스트 — 다른 차원에서 온 것이라 보통 볼이 거의 안 통한다. 던지기 전에 보이게
    if (isUltraBeast(c.id)) { const ub = document.createElement('span'); ub.className = 'ub-badge'; ub.textContent = '🌌'; ub.title = '울트라비스트 — ⚪ 비스트볼이 있어야 잡혀요'; btn.appendChild(ub); }
    const nm = document.createElement('span');
    nm.className = 'nm';
    nm.textContent = c.ko;
    btn.appendChild(nm);
    const rr = document.createElement('span');
    rr.className = 'rr';
    rr.textContent = `${RARITY[r].stars} ${RARITY[r].label}`;
    btn.appendChild(rr);
    const n = haveCount(c.id); // 🧬 도감 누적이 아니라 **지금 데리고 있는 수** (Codex 10차 #10)
    if (n > 0) {
      const own = document.createElement('span');
      own.className = 'own';
      own.textContent = `✔ 잡음 ×${n}`;
      btn.appendChild(own);
    }
    btn.addEventListener('click', () => { unlock(); askThrow(c); }); // 🎯 써서 없어지는 볼이면 던지기 전에 한 번 묻는다
    pick.appendChild(btn);
  }
}

/**
 * 🔴 어떤 볼로 던질까 — 몬스터볼은 언제나, 나머지는 가방에 있는 것만.
 * 등급이 올라갈수록 잡기 쉬워진다(슈퍼볼 ×1.5, 하이퍼볼 ×2, 마스터볼은 반드시 잡음).
 */
/**
 * 🕺 받아 온 도트 그림을 **이미 있는 버튼 안에서** 갈아 끼운다 (DOM을 새로 만들지 않는다).
 * 버튼을 다시 만들면 그 순간 누르던 탭이 사라진다 — 아이에겐 "눌렀는데 아무 일도 안 일어남"이다.
 */
function swapDots() {
  const pick = $('catch-pick');
  if (!pick) return;
  for (const btn of pick.querySelectorAll('.catch-cand')) {
    const id = Number(btn.dataset.id);
    const dot = id ? animUrl(id) : null;
    if (!dot) continue;
    const face = btn.querySelector('.mon-figure');
    const img = face && face.querySelector('img');
    if (!img || img.getAttribute('src') === dot) continue;
    img.src = dot;
    img.style.filter = '';         // 도트엔 🎨 염색을 씌우지 않는다 (일러스트 기준으로 맞춘 필터다)
    face.classList.add('dot');
    const gear = face.querySelector('.mon-gear');
    if (gear) gear.remove();       // 🎀 장식도 뺀다 — 도트는 비율이 달라 자리가 안 맞는다
  }
}

/** 볼 줄을 다시 그릴 때 고른 볼을 지킬까 — 가방에 남아 있으면 그대로, 없으면 몬스터볼 */
export function keepBall(counts, sel) {
  const b = sel ? BALLS.find((x) => x.id === sel) : null;
  return b && (b.free || ((counts || {})[b.id] || 0) > 0) ? b.id : POKEBALL.id;
}

/**
 * 볼을 골랐을 때 한마디 — 몬스터볼은 없음.
 * hasUb = 지금 후보에 🌌 울트라비스트가 있나 (false면 비스트볼은 몬스터볼과 같다고 말한다 — 사고 나서 좋아진 줄 알면 안 된다, Codex 28차 #6)
 */
export function ballTip(b, hasUb) {
  if (!b || b.free) return '';
  if (b.unique) return '세상에 하나뿐 — 무조건 잡혀요 (🌌 울트라비스트도)'; // 🌕 진짜 황금 몬스터볼
  if (b.sure) return '반드시 잡혀요';
  if (b.ub) return hasUb === false // ⚪ 비스트볼 — 보통 포켓몬에겐 몬스터볼과 같아 "1배"라고 하면 헷갈린다
    ? '이번 후보에는 🌌 울트라비스트가 없어서 몬스터볼과 확률이 같아요'
    : '🌌 울트라비스트에게 아주 잘 들어요';
  return `잡힐 확률이 ${b.mult}배예요`;
}

/** 지금 후보에 🌌 울트라비스트가 있나 (🧭 레이더가 후보를 바꾸면 ui.candidates도 바뀐다) */
const candHasUb = () => ui.candidates.some((c) => isUltraBeast(c.id));

/** 볼 줄 그리기 — sel이 가방에 남아 있으면 그 볼을 골라 둔 채로 (🛒 사고 돌아왔을 때·가방이 바뀌었을 때) */
function renderBalls(counts, sel) {
  const box = $('catch-golden');
  if (!box) return;
  ui.ballCounts = counts || {};
  ui.ball = keepBall(ui.ballCounts, sel);
  ui.golden = ui.ball === 'goldenball'; // 옛 이름을 쓰는 곳(연출)이 있어 같이 둔다
  box.innerHTML = '';
  box.hidden = false;
  for (const b of BALLS) {
    const n = b.free ? Infinity : (ui.ballCounts[b.id] || 0);
    if (!b.free && n <= 0) continue; // 없는 볼은 안 보여준다
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn catch-ball-btn' + (b.id === ui.ball ? ' on' : '');
    btn.dataset.ball = b.id;
    btn.textContent = b.free ? `${b.emoji} ${b.ko}` : `${b.emoji} ${b.ko} ${n}개`;
    btn.addEventListener('click', () => pickBall(b));
    box.appendChild(btn);
  }
  // 🛒 볼 사러 가기 (2026-10-04, 진우 요청) — 던지기 전에만(throwBall이 숨긴다). ⚙ 잡기 연습은 볼이 안 줄어서 빼 둔다
  if (!ui.practice) {
    const sb = document.createElement('button');
    sb.type = 'button';
    sb.className = 'btn catch-ball-btn catch-shop-btn';
    sb.textContent = '🛒 볼 사러 가기';
    sb.addEventListener('click', openBallShop);
    box.appendChild(sb);
  }
}

/** 볼 고르기 — msg가 없으면 그 볼의 한마디. 던진 뒤에는 못 바꾼다 (판정이 고른 볼을 붙잡아 두지만, 불·말도 그대로 둔다) */
function pickBall(b, msg) {
  if (!ui.open || $('catch-pick').hidden) return;
  ui.ball = b.id;
  ui.golden = b.id === 'goldenball';
  for (const btn of $('catch-golden').querySelectorAll('button[data-ball]')) btn.classList.toggle('on', btn.dataset.ball === b.id);
  $('catch-msg').textContent = msg || (b.free ? '포켓몬을 한 마리 골라 몬스터볼을 던져봐요!' : `${b.emoji} ${b.ko}! ${ballTip(b, candHasUb())} — 누구에게 던질까요?`);
}

/** 가방에서 볼 수를 다시 읽어 볼 줄을 새로 — 던지기 전(후보가 보일 때)만. bought면 그 볼을 고르고 "샀어요" */
function refreshBalls(sel, bought) {
  if (!ui.open || $('catch-pick').hidden) return; // 던지는 중·던진 뒤에는 그대로 (결과가 이미 정해졌다)
  renderBalls(inventory(), sel);
  const b = bought && ui.ball === sel ? BALLS.find((x) => x.id === sel) : null;
  if (b) pickBall(b, `🛒 ${b.emoji} ${b.ko}${josa(b.ko, '을', '를')} 샀어요! ${ballTip(b, candHasUb())} — 누구에게 던질까요?`);
}

/** 🛒 잡기 화면 위에 볼 상점 — 사면 닫히고 그 볼이 골라져 있다. 그냥 닫으면 잡기 화면 그대로 */
function openBallShop() {
  if (!ui.open || $('catch-pick').hidden) return;
  unlock();
  const run = ui.run;
  const mine = () => ui.open && ui.run === run; // 그 사이 이 잡기 화면이 닫혔으면 손대지 않는다
  ui.shop = true;
  openShop({
    balls: true,
    onBought: (id) => { ui.shop = false; if (mine()) refreshBalls(id, true); },
    onClose: () => { ui.shop = false; if (mine()) refreshBalls(ui.ball); },
  });
}

export function closeCatch() {
  bgm.stop();
  if (!ui.open) return;
  ui.open = false;
  ui.run++;
  // 🛒 이 잡기 화면이 연 볼 상점이 아직 떠 있으면 같이 닫는다 (영상을 닫는 등) — 잡기가 없는데 "사면 돌아가요"가 남지 않게
  if (ui.shop) { ui.shop = false; if (isBallShopOpen()) closeShop(); }
  clearTimeout(ui.timer);
  ui.timer = null;
  ui.asking = null;
  const cc = $('catch-confirm');
  if (cc) { cc.hidden = true; cc.innerHTML = ''; }
  $('catch').hidden = true;
  ui.onDone = null;
  ui.attempt = null;
  ui.threw = false;
}

function finish() {
  if (!ui.open) return;
  const cb = ui.onDone;
  const threw = ui.threw;
  closeCatch();
  if (cb) cb({ threw: !!threw }); // 한 번도 안 던지고 닫았으면 부르는 쪽이 기회를 돌려줄 수 있다
}

function renderHeader(xpGain, info, levelUp) {
  const head = $('catch-xp');
  head.innerHTML = '';
  const left = document.createElement('span');
  left.textContent = ui.practice ? '🎯 잡기 연습' : xpGain ? `⚡ +${xpGain} 경험치!${ui.coinGain ? ` 💰 +${ui.coinGain}` : ''}` : '';
  const right = document.createElement('span');
  right.textContent = info ? `Lv.${info.level}  ${info.into}/${info.need}` : '';
  head.appendChild(left);
  head.appendChild(right);
  $('catch-xpbar-fill').style.width = info ? `${Math.round((info.into / info.need) * 100)}%` : '0%';
  // 다음 해금까지 남은 XP (레벨이 왜 중요한지 보이게)
  const nx = $('catch-next');
  if (nx) {
    const lv = info ? nextUnlockLevel(info.level) : 0;
    nx.hidden = !lv;
    if (lv) nx.textContent = `🔒 Lv.${lv} 새 포켓몬 ${unlockCountAt(lv)}마리까지 ⚡${Math.max(0, xpToReach(lv) - (info.xp !== undefined ? info.xp : xpToReach(info.level) + info.into))}`;
  }
  const lv = $('catch-levelup');
  lv.hidden = !levelUp;
  if (levelUp) lv.textContent = `🎉 레벨 업! Lv.${levelUp} — 포켓몬이 더 잘 잡혀요`;
}

/** 🎊 종이가루: 화면 위에서 색종이 조각이 쏟아짐 (CSS 애니메이션, 3.6초 뒤 정리) */
export function burstConfetti(count = 70) {
  const layer = document.createElement('div');
  layer.className = 'confetti-layer';
  const colors = ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#a855f7', '#fbbf24', '#ec4899'];
  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    p.className = 'confetti';
    p.style.left = `${Math.random() * 100}%`;
    p.style.background = colors[i % colors.length];
    p.style.width = `${6 + Math.random() * 8}px`;
    p.style.height = `${10 + Math.random() * 8}px`;
    p.style.animationDuration = `${1.8 + Math.random() * 1.2}s`;
    p.style.animationDelay = `${Math.random() * 0.5}s`;
    p.style.setProperty('--dx', `${(Math.random() - 0.5) * 200}px`);
    p.style.setProperty('--rot', `${360 + Math.random() * 720}deg`);
    layer.appendChild(p);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 3600);
}

/**
 * 🎯 볼 확인 (2026-10-05, 아버님: "황금볼 안 썼는데 썼다고 — 볼을 정말 쓰는지 아이에게 확인받자").
 * 써서 없어지는 볼(🔵🟡🌟🟣⚪🌕)을 고른 채 포켓몬을 누르면 바로 던지지 않고 한 번 묻는다.
 * 🔴 몬스터볼은 공짜라 묻지 않는다 · ⚙ 잡기 연습은 볼이 안 줄어서 묻지 않는다
 */
export function needsConfirm(ballId, practice) {
  const b = BALLS.find((x) => x.id === ballId);
  return !!b && !b.free && !practice;
}

/** 확인 칸의 말 { q, sub, go } — 가방 n개 → n−1개, 🌕는 세상에 하나뿐 */
export function confirmText(b, monKo, n) {
  const q = `${b.emoji} ${b.ko}${josa(b.ko, '을', '를')} ${monKo}에게 던질까요?`;
  const sub = b.unique ? '세상에 하나뿐 — 던지면 다시 세상 어딘가로 떠나요' : `가방 ${n}개 → ${Math.max(0, n - 1)}개`;
  return { q, sub, go: `${b.emoji} ${b.ko} 던지기` };
}

/** 결과 화면 한 줄 — 공짜 몬스터볼·🌕(따로 말한다)·연습은 없음 */
export function usedBallText(ballId, left, practice) {
  const b = BALLS.find((x) => x.id === ballId);
  if (!b || b.free || b.unique || practice) return '';
  return `${b.emoji} ${b.ko}${josa(b.ko, '을', '를')} 썼어요 (남은 ${left}개)`;
}

/** 포켓몬을 눌렀을 때 — 써서 없어지는 볼이면 확인 칸, 아니면 바로 던진다 */
function askThrow(c) {
  if (!ui.open || ui.threw || $('catch-pick').hidden) return;
  if (!needsConfirm(ui.ball, ui.practice)) { throwBall(c); return; }
  const b = BALLS.find((x) => x.id === ui.ball);
  const n = (ui.ballCounts || {})[b.id] || 0;
  const t = confirmText(b, c.ko, n);
  const radar = $('catch-radar');
  ui.asking = { c, radarHidden: radar ? radar.hidden : true };
  $('catch-pick').hidden = true;   // 확인하는 동안은 다른 포켓몬·볼을 못 누른다 (볼 줄을 다시 그리는 것도 멈춘다 — refreshBalls)
  $('catch-golden').hidden = true;
  if (radar) radar.hidden = true;
  const cc = $('catch-confirm');
  cc.innerHTML = '';
  const face = makeFigure(animUrl(c.id) || c.url, c.ko, animUrl(c.id) ? null : c.look);
  face.classList.add('cc-face');
  cc.appendChild(face);
  cc.appendChild(Object.assign(document.createElement('div'), { className: 'cc-q', textContent: t.q }));
  cc.appendChild(Object.assign(document.createElement('div'), { className: 'cc-sub', textContent: t.sub }));
  const row = document.createElement('div');
  row.className = 'cc-row';
  const btn = (cls, text, fn) => {
    const e = document.createElement('button');
    e.type = 'button';
    e.className = `btn ${cls}`;
    e.textContent = text;
    e.addEventListener('click', () => { unlock(); fn(); });
    row.appendChild(e);
  };
  btn('btn-primary cc-go', t.go, () => { if (!closeConfirm(false)) return; throwBall(c); }); // 그 사이 볼이 없어졌으면 throwBall이 "이제 가방에 없어요"
  btn('cc-free', `${POKEBALL.emoji} ${POKEBALL.ko}로 던지기`, () => { if (!closeConfirm(false)) return; pickBall(POKEBALL); throwBall(c); });
  btn('cc-back', '↩ 다시 고르기', () => { if (!closeConfirm(true)) return; $('catch-msg').textContent = '볼과 포켓몬을 다시 골라요'; });
  cc.appendChild(row);
  cc.hidden = false;
  $('catch-msg').textContent = '정말 이 볼을 쓸까요?';
}

/**
 * 확인 칸을 내리고 후보·볼 줄을 되살린다 — 이미 닫혔거나 던졌으면 false.
 * refresh = 볼 줄을 가방에서 다시 읽기 ("다시 고르기"만 — 던지는 길에서 다시 읽으면 없어진 볼이 몰래 몬스터볼로 바뀐다)
 */
function closeConfirm(refresh) {
  const a = ui.asking;
  ui.asking = null;
  const cc = $('catch-confirm');
  if (cc) { cc.hidden = true; cc.innerHTML = ''; }
  if (!ui.open || ui.threw || !a) return false;
  $('catch-pick').hidden = false;
  const radar = $('catch-radar');
  if (radar) radar.hidden = a.radarHidden;
  if (refresh) refreshBalls(ui.ball); // 묻는 사이 가방이 바뀌었을 수 있다 (🌕를 찾았다·다른 화면) — 볼 줄을 다시
  return true;
}

/** 볼 던지기 연출 → 판정 → 결과 */
async function throwBall(c) {
  if (!ui.open || !ui.attempt) return;
  ui.threw = true; // 던졌다 — 그냥 닫은 것과 구분한다 (수학은 던질 기회를 미리 차감해 둔다)
  const run = ++ui.run;
  const alive = () => ui.open && ui.run === run;
  // 🔴 던지는 순간 고른 볼을 붙잡는다 — 판정은 연출 뒤(약 2초)라, 그 사이 볼 줄을 누르면 다른 볼이 쓰였다
  //    (슈퍼볼로 던지고 마스터볼을 누르면 마스터볼이 사라짐, Codex 28차 #2). 볼 줄·🛒도 통째로 숨긴다
  const ballId = ui.ball;
  $('catch-pick').hidden = true;
  $('catch-golden').hidden = true;
  // 🌕·🔵·🟡·🟣·⚪ 가방 볼은 **저장소에서 먼저 쓴다** — 다른 화면에서 이미 썼거나 팔았으면 볼을 다시 고르게
  //    (🌕 Codex 29차 #1 → 모든 가방 볼 Codex 32차 ⑨: 💰 팔기가 생겨 다른 창에서 판 볼을 또 던질 수 있었다).
  //    🔴 몬스터볼은 언제나 공짜. ⚙ 연습은 볼이 안 줄어서 쓰지 않는다. 쓴 뒤 던지기 전에 화면이 닫히면 돌려준다 (giveBack)
  const picked = BALLS.find((x) => x.id === ballId);
  let paid;
  if (picked && !picked.free && !ui.practice) {
    if (picked.unique) $('catch-msg').textContent = `${picked.emoji} ${picked.ko}${josa(picked.ko, '을', '를')} 꺼내는 중…`;
    const ok = await spendBall(ballId);
    if (!alive()) { if (ok) refundBall(ballId).catch(() => {}); return; }
    if (!ok) {
      ui.threw = false;
      const tg = $('catch-truegold');
      if (tg) tg.hidden = true; // "찾았다!" 알림이 남아 있으면 없는 볼을 가리킨다
      $('catch-pick').hidden = false;
      refreshBalls(POKEBALL.id);
      $('catch-msg').textContent = picked.unique
        ? `${picked.emoji} ${picked.ko}${josa(picked.ko, '은', '는')} 다른 화면에서 이미 썼어요 — 볼을 다시 골라요`
        : `${picked.emoji} ${picked.ko}${josa(picked.ko, '이', '가')} 이제 가방에 없어요 (다른 화면에서 썼거나 팔았어요) — 볼을 다시 골라요`;
      return;
    }
    paid = ballId;
  }
  // 던지기 전에 화면이 닫혔다 — 미리 쓴 볼을 돌려준다 (판정이 없었으니 쓴 게 아니다)
  const giveBack = () => { if (paid) refundBall(paid).catch(() => {}); };
  const stage = $('catch-stage');
  const mon = $('catch-mon');
  const ball = $('catch-ball');
  const fx = $('catch-fx');
  const thrown = picked || POKEBALL; // 🎯 날아가는 볼·말은 실제로 고른 볼 (예전엔 늘 빨간 볼·"몬스터볼, 가라!"라 무슨 볼을 썼는지 몰랐다)
  ball.dataset.ball = thrown.id;
  setFigure(mon, c.url, c.look);
  mon.querySelector('img').alt = c.ko;
  mon.className = 'catch-mon mon-figure';
  ball.className = 'catch-ball';
  fx.textContent = '';
  fx.style.bottom = '';
  stage.hidden = false;
  $('catch-msg').textContent = `${c.ko}${josa(c.ko, '이', '가')} 나타났다! ${thrown.emoji} ${thrown.ko}, 가라!`;
  $('catch-msg').classList.remove('beat');
  await sleep(700); if (!alive()) return giveBack();

  ball.className = 'catch-ball throw';
  sfx.whoosh();
  await sleep(650); if (!alive()) return giveBack();
  fx.textContent = '💥';
  fx.style.bottom = '150px'; // 포켓몬 위치에서 맞는 효과
  sfx.hit();
  vibrate(25);
  mon.classList.add('captured');
  ball.className = 'catch-ball at-mon';
  await sleep(400); if (!alive()) return giveBack();
  fx.textContent = '';
  fx.style.bottom = '';
  ball.className = 'catch-ball drop';
  await sleep(500); if (!alive()) return giveBack();

  const res = ui.attempt(c.id, { ball: ballId, paid }); // 결과는 여기서 결정, 흔들림 횟수로 긴장감만 (볼은 던질 때 고른 것, 🌕는 미리 쓴 것)
  const wobbles = res.caught ? 3 : 1 + Math.floor(Math.random() * 3);
  const msg = $('catch-msg');
  msg.textContent = '두근두근…';
  msg.classList.add('beat');
  for (let i = 0; i < wobbles; i++) {
    ball.className = 'catch-ball';
    stage.classList.remove('shaking');
    void ball.offsetWidth; // 애니메이션 재시작
    ball.className = 'catch-ball wobble';
    stage.classList.add('shaking'); // 화면이 같이 두근거림
    sfx.tick();
    vibrate(30);
    await sleep(750); if (!alive()) return;
  }
  stage.classList.remove('shaking');
  msg.classList.remove('beat');

  const result = $('catch-result');
  if (res.caught) {
    ball.className = 'catch-ball caught';
    fx.textContent = '✨';
    $('catch-msg').textContent = '찰칵!';
    sfx.success();
    vibrate([40, 60, 40, 60, 160]);
    burstConfetti();
    result.innerHTML = '';
    mon.classList.remove('captured');
    mon.classList.add('caughtpop'); // 잡은 포켓몬이 볼 위로 뿅 나타남 (기뻐하는 느낌)
    result.appendChild(document.createTextNode(`🎉 잡았다! ${c.ko}!`));
    const sub = document.createElement('small');
    sub.textContent = ui.practice ? '(연습이라 도감에는 안 들어가요)'
      : res.partnerSet ? '도감에 새로 등록됐어요! 🤝 첫 파트너가 됐어요 — 위쪽 ❤️ 칩에서 볼 수 있어요'
      : res.first ? '도감에 새로 등록됐어요!' : `또 잡았어요 ×${res.count} (+${res.bonusXp} 경험치)`;
    result.appendChild(sub);
    // 🌕 세상에 하나뿐인 볼을 썼다 — 없어졌고, 언젠가 또 나타난다 (0.1%). ⚙ 연습은 볼이 그대로라 그렇게 말한다 (Codex 29차 #5)
    if (res.ball === TRUE_GOLD.id) result.appendChild(Object.assign(document.createElement('small'), { textContent: ui.practice ? `연습이라 ${TRUE_GOLD.emoji} ${TRUE_GOLD.ko}은 그대로예요` : `${TRUE_GOLD.emoji} ${TRUE_GOLD.ko}은 다시 세상 어딘가로 떠났어요 — 언젠가 또 나타날지도 몰라요!` }));
    if (res.info) renderHeader(ui.xpGain + (res.bonusXp || 0), res.info, 0);
  } else {
    ball.className = 'catch-ball open';
    mon.classList.remove('captured');
    mon.classList.add('escaped');
    fx.textContent = '💨';
    $('catch-msg').textContent = '앗!';
    sfx.fail();
    vibrate(180);
    result.innerHTML = '';
    result.appendChild(document.createTextNode(`${c.ko}${josa(c.ko, '이', '가')} 도망갔어요…`));
    const sub = document.createElement('small');
    sub.textContent = '레벨이 오르면 더 잘 잡혀요. 다음에 다시!';
    result.appendChild(sub);
  }
  const usedLine = usedBallText(res.ball, (inventory()[res.ball] || 0), ui.practice); // 🎯 무슨 볼을 썼는지 (남은 수와 함께)
  if (usedLine) result.appendChild(Object.assign(document.createElement('small'), { className: 'catch-used', textContent: usedLine }));
  $('catch-continue').hidden = false;
  ui.timer = setTimeout(autoFinish, 5000);
}
