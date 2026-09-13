// 🎯 포켓몬 잡기 화면: 퍼즐 정답 뒤 경험치를 보여주고, 퍼즐에 나온 포켓몬 중 한 마리를 골라 몬스터볼을 던진다.
// 잡힐지는 운(xp.catchAttempt) — 볼이 날아가 맞고, 포켓몬이 볼로 들어가고, 볼이 흔들리다가 잡히거나 튀어나온다 (전부 CSS 연출)
import { rarityOf, RARITY, caughtCount } from './xp.js';

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ui = { open: false, run: 0, onDone: null, attempt: null, timer: null, practice: false, xpGain: 0 };

export function initCatch() {
  $('catch-continue').addEventListener('click', finish);
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
  mon.className = 'catch-mon';
  $('catch-fx').textContent = '';

  const pick = $('catch-pick');
  pick.innerHTML = '';
  pick.hidden = false;
  for (const c of o.candidates) {
    const r = rarityOf(c.id);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'catch-cand';
    const img = document.createElement('img');
    img.src = c.url;
    img.alt = c.ko;
    img.draggable = false;
    btn.appendChild(img);
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
    btn.addEventListener('click', () => throwBall(c));
    pick.appendChild(btn);
  }
  $('catch').hidden = false;
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
  left.textContent = ui.practice ? '🎯 잡기 연습' : xpGain ? `⚡ +${xpGain} 경험치!` : '';
  const right = document.createElement('span');
  right.textContent = info ? `Lv.${info.level}  ${info.into}/${info.need}` : '';
  head.appendChild(left);
  head.appendChild(right);
  $('catch-xpbar-fill').style.width = info ? `${Math.round((info.into / info.need) * 100)}%` : '0%';
  const lv = $('catch-levelup');
  lv.hidden = !levelUp;
  if (levelUp) lv.textContent = `🎉 레벨 업! Lv.${levelUp} — 포켓몬이 더 잘 잡혀요`;
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
  mon.src = c.url;
  mon.alt = c.ko;
  mon.className = 'catch-mon';
  ball.className = 'catch-ball';
  fx.textContent = '';
  fx.style.bottom = '';
  stage.hidden = false;
  $('catch-msg').textContent = `${c.ko}${josa(c.ko, '이', '가')} 나타났다! 몬스터볼, 가라!`;
  await sleep(700); if (!alive()) return;

  ball.className = 'catch-ball throw';
  await sleep(650); if (!alive()) return;
  fx.textContent = '💥';
  fx.style.bottom = '150px'; // 포켓몬 위치에서 맞는 효과
  mon.classList.add('captured');
  ball.className = 'catch-ball at-mon';
  await sleep(400); if (!alive()) return;
  fx.textContent = '';
  fx.style.bottom = '';
  ball.className = 'catch-ball drop';
  await sleep(500); if (!alive()) return;

  const res = ui.attempt(c.id); // 결과는 여기서 결정, 흔들림 횟수로 긴장감만
  const wobbles = res.caught ? 3 : 1 + Math.floor(Math.random() * 3);
  $('catch-msg').textContent = '…';
  for (let i = 0; i < wobbles; i++) {
    ball.className = 'catch-ball';
    void ball.offsetWidth; // 애니메이션 재시작
    ball.className = 'catch-ball wobble';
    await sleep(750); if (!alive()) return;
  }

  const result = $('catch-result');
  if (res.caught) {
    ball.className = 'catch-ball caught';
    fx.textContent = '✨';
    $('catch-msg').textContent = '찰칵!';
    result.innerHTML = '';
    const pic = document.createElement('img');
    pic.className = 'catch-result-img';
    pic.src = c.url;
    pic.alt = c.ko;
    result.appendChild(pic);
    result.appendChild(document.createTextNode(`🎉 잡았다! ${c.ko}!`));
    const sub = document.createElement('small');
    sub.textContent = ui.practice ? '(연습이라 도감에는 안 들어가요)'
      : res.first ? '도감에 새로 등록됐어요!' : `또 잡았어요 ×${res.count} (+${res.bonusXp} 경험치)`;
    result.appendChild(sub);
    if (res.info) renderHeader(ui.xpGain + (res.bonusXp || 0), res.info, 0);
  } else {
    ball.className = 'catch-ball open';
    mon.classList.remove('captured');
    mon.classList.add('escaped');
    fx.textContent = '💨';
    $('catch-msg').textContent = '앗!';
    result.innerHTML = '';
    result.appendChild(document.createTextNode(`${c.ko}${josa(c.ko, '이', '가')} 도망갔어요…`));
    const sub = document.createElement('small');
    sub.textContent = '레벨이 오르면 더 잘 잡혀요. 다음에 다시!';
    result.appendChild(sub);
  }
  $('catch-continue').hidden = false;
  ui.timer = setTimeout(finish, 5000);
}
