// 🎯 포켓몬 잡기 화면: 퍼즐 정답 뒤 경험치를 보여주고, 퍼즐에 나온 포켓몬 중 한 마리를 골라 몬스터볼을 던진다.
// 잡힐지는 운(xp.catchAttempt) — 볼이 날아가 맞고, 포켓몬이 볼로 들어가고, 볼이 흔들리다가 잡히거나 튀어나온다 (전부 CSS 연출)
import { rarityOf, RARITY, caughtCount, xpToReach } from './xp.js';
import { nextUnlockLevel, unlockCountAt } from './pokemon.js';
import { sfx, vibrate, unlock } from './sfx.js';
import { makeFigure, setFigure } from './items.js';

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ui = { open: false, run: 0, onDone: null, attempt: null, timer: null, practice: false, xpGain: 0, coinGain: 0, pendingAuto: false };

export function initCatch() {
  $('catch-continue').addEventListener('click', finish);
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
 * @param {() => void} [o.onDone] 닫힐 때
 */
export function openCatch(o) {
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
  $('catch-msg').textContent = '포켓몬을 한 마리 골라 몬스터볼을 던져봐요!';
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

  const pick = $('catch-pick');
  pick.innerHTML = '';
  pick.hidden = false;
  for (const c of o.candidates) {
    const r = rarityOf(c.id);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'catch-cand';
    btn.appendChild(makeFigure(c.url, c.ko, c.look));
    const nm = document.createElement('span');
    nm.className = 'nm';
    nm.textContent = c.ko;
    btn.appendChild(nm);
    const rr = document.createElement('span');
    rr.className = 'rr';
    rr.textContent = `${RARITY[r].stars} ${RARITY[r].label}`;
    btn.appendChild(rr);
    const n = caughtCount(c.id);
    if (n > 0) {
      const own = document.createElement('span');
      own.className = 'own';
      own.textContent = `✔ 잡음 ×${n}`;
      btn.appendChild(own);
    }
    btn.addEventListener('click', () => { unlock(); throwBall(c); });
    pick.appendChild(btn);
  }
  renderGolden(o.goldenCount || 0);
  $('catch').hidden = false;
}

/** 🌟 황금 볼 토글 (가방에 있을 때만 보임). 켜고 포켓몬을 고르면 황금 볼로 던진다 */
function renderGolden(count) {
  const box = $('catch-golden');
  if (!box) return;
  ui.golden = false;
  ui.goldenCount = count;
  box.innerHTML = '';
  box.hidden = count <= 0;
  if (count <= 0) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn catch-golden-btn';
  btn.textContent = `🌟 황금 볼로 던지기 (${count}개)`;
  btn.setAttribute('aria-pressed', 'false');
  btn.addEventListener('click', () => {
    ui.golden = !ui.golden;
    btn.classList.toggle('on', ui.golden);
    btn.setAttribute('aria-pressed', ui.golden ? 'true' : 'false');
    $('catch-msg').textContent = ui.golden
      ? '🌟 황금 볼! 잡힐 확률이 훨씬 높아요 — 누구에게 던질까요?'
      : '포켓몬을 한 마리 골라 몬스터볼을 던져봐요!';
  });
  box.appendChild(btn);
}

export function closeCatch() {
  if (!ui.open) return;
  ui.open = false;
  ui.run++;
  clearTimeout(ui.timer);
  ui.timer = null;
  $('catch').hidden = true;
  ui.onDone = null;
  ui.attempt = null;
}

function finish() {
  if (!ui.open) return;
  const cb = ui.onDone;
  closeCatch();
  if (cb) cb();
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

/** 볼 던지기 연출 → 판정 → 결과 */
async function throwBall(c) {
  if (!ui.open || !ui.attempt) return;
  const run = ++ui.run;
  const alive = () => ui.open && ui.run === run;
  $('catch-pick').hidden = true;
  const stage = $('catch-stage');
  const mon = $('catch-mon');
  const ball = $('catch-ball');
  const fx = $('catch-fx');
  setFigure(mon, c.url, c.look);
  mon.querySelector('img').alt = c.ko;
  mon.className = 'catch-mon mon-figure';
  ball.className = 'catch-ball';
  fx.textContent = '';
  fx.style.bottom = '';
  stage.hidden = false;
  $('catch-msg').textContent = `${c.ko}${josa(c.ko, '이', '가')} 나타났다! 몬스터볼, 가라!`;
  $('catch-msg').classList.remove('beat');
  await sleep(700); if (!alive()) return;

  ball.className = 'catch-ball throw';
  sfx.whoosh();
  await sleep(650); if (!alive()) return;
  fx.textContent = '💥';
  fx.style.bottom = '150px'; // 포켓몬 위치에서 맞는 효과
  sfx.hit();
  vibrate(25);
  mon.classList.add('captured');
  ball.className = 'catch-ball at-mon';
  await sleep(400); if (!alive()) return;
  fx.textContent = '';
  fx.style.bottom = '';
  ball.className = 'catch-ball drop';
  await sleep(500); if (!alive()) return;

  const res = ui.attempt(c.id, { golden: !!ui.golden }); // 결과는 여기서 결정, 흔들림 횟수로 긴장감만
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
  $('catch-continue').hidden = false;
  ui.timer = setTimeout(autoFinish, 5000);
}
