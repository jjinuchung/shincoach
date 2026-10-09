// 🚀 로켓단 습격 화면 (2026-10-09, 아버님 아이디어 — 2단계). 규칙·저장은 rocket.js·db.js·xp.js, 여기는 그리기와 애니메이션만.
// 과목과 무관하다 — 문제(quiz)·저장(saveStep·lose·win)은 부르는 쪽(math.js, 영어는 3단계)이 넘긴다.
//
// 장면: ① 경보(삐뽀·빨간 번쩍) → ② 나옹 열기구가 흔들리며 내려옴 → ③ 구호(말풍선 타이핑, 탭하면 건너뜀) →
//   ④ "진우의 ○○를 노린다옹!" 로봇팔이 그 포켓몬 위에 → ⑤ 문제: 맞히면 파트너 공격(타입 기술 이모지가 날아가 열기구에 맞고 ❤️ 깨짐),
//   틀리면 로봇팔이 한 칸 내려옴 → ⑥ 이기면 💥 폭발 → 로켓단이 빙글빙글 하늘 저편으로 → ✨ "반짝" → 아지트에서 한 마리 구하기 ·
//   지면 그물이 그 포켓몬을 낚아채 열기구에 매달고 날아감.
// 그림: 사람(로사·로이)은 이모지, 나옹은 앱이 쓰는 공식 도트 그림(52번, 없으면 😼). 저장소에 그림 파일을 넣지 않는다.
// ★ 구호·날아갈 때 대사는 한국판 표현을 진우·아버님께 확인받을 것 (MOTTO·BLAST — 틀리면 여기만 고치면 된다)
import { sfx, vibrate as buzz, unlock } from './sfx.js';
import { josa } from './catch.js';
import { typeOf, MOVES } from './battle.js';
import { animUrl, ensureAnim } from './sprite.js';
import { ROCKET } from './rocket.js';

/** 🎤 구호 — [누가, 말] (한국판, 확인 필요) */
export const MOTTO = [
  ['로사', '뭐냐고 물으신다면'],
  ['로이', '대답해 드리는 게 인지상정!'],
  ['로사', '이 세계의 파괴를 막기 위해'],
  ['로이', '이 세계의 평화를 지키기 위해'],
  ['로사', '사랑과 진실, 어둠을 뿌리고 다니는'],
  ['로이', '포켓몬의 감초, 귀염둥이 악당!'],
  ['로사', '나 로사!'],
  ['로이', '나 로이!'],
  ['나옹', '나옹! 바로 그거다옹!'],
];
/** 쫓겨날 때 외치는 말 (확인 필요) */
export const BLAST = '로켓단은 또 날아간다~!';
const MEOWTH = 52;
const WHO = { 로사: '👩‍🦰', 로이: '🧑', 나옹: '😼' };

/**
 * 아이가 이 화면(앱)을 한 번이라도 눌렀나 — 앱을 열자마자 이어 가는 배틀은 아직 누르기 전이라, 그때 진동·소리를 부르면
 * Chrome이 막고 콘솔에 오류를 남긴다(헤드리스가 잡음). 누르기 전엔 조용히, 첫 탭(구호 건너뛰기)에서 소리를 연다.
 * 옛 Chrome(userActivation 없음)은 예전처럼 부른다
 */
const touched = () => !navigator.userActivation || navigator.userActivation.hasBeenActive;
const vibrate = (p) => { if (touched()) buzz(p); };

let root = null;
const ui = { open: false, skip: null, closeQuiz: null };

const $ = (sel) => root.querySelector(sel);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
/** 애니메이션 클래스를 다시 건다 (같은 클래스를 연달아 걸어도 다시 돈다) */
function replay(node, cls) {
  if (!node) return;
  node.classList.remove(cls);
  void node.offsetWidth;
  node.classList.add(cls);
}

function build() {
  root = el('div', 'rocket');
  root.id = 'rocket';
  root.hidden = true;
  root.innerHTML = `
    <div class="rocket-card">
      <div class="rocket-sky">
        <div class="rocket-alarm"></div>
        <div class="rocket-stars"><i></i><i></i><i></i><i></i><i></i><i></i></div>
        <div class="rocket-gang">
          <div class="rocket-balloon"><img class="rocket-meowth" alt="나옹" draggable="false"><span class="rocket-meowth-alt">😼</span><span class="rocket-r">R</span></div>
          <div class="rocket-ropes"></div>
          <div class="rocket-basket"><span class="rocket-people"><span title="로사">${WHO.로사}</span><span title="로이">${WHO.로이}</span></span></div>
          <div class="rocket-arm"><div class="rocket-cable"></div><div class="rocket-claw">🦾</div></div>
          <div class="rocket-hp"></div>
        </div>
        <div class="rocket-bubble" hidden><b class="rocket-who"></b><span class="rocket-say"></span></div>
        <div class="rocket-ground">
          <div class="rocket-mon rocket-target"><img alt="" draggable="false"><div class="rocket-net">🕸️</div><span class="rocket-name"></span></div>
          <div class="rocket-mon rocket-partner"><img alt="" draggable="false"><span class="rocket-name"></span></div>
        </div>
        <div class="rocket-fx"></div>
        <div class="rocket-twinkle" hidden><span class="rocket-star">✨</span><span class="rocket-twinkle-text">반짝!</span></div>
      </div>
      <div class="rocket-panel">
        <div class="rocket-msg"></div>
        <div class="rocket-score"></div>
        <div class="rocket-quiz"></div>
        <div class="rocket-actions"></div>
      </div>
    </div>`;
  document.body.appendChild(root);
  // 구호는 탭하면 건너뛴다 (아이가 매번 다 들을 필요는 없다)
  root.querySelector('.rocket-sky').addEventListener('click', () => { unlock(); if (ui.skip) ui.skip(); });
}

/** 포켓몬 그림: 움직이는 도트가 있으면 그것, 없으면 일러스트 — 도트는 받아 오면 바꿔 끼운다 */
function setMon(img, mon) {
  const dot = animUrl(mon.id);
  img.src = dot || mon.url || '';
  img.hidden = !img.src;
  if (!dot) ensureAnim(mon.id).then((u) => { if (u && ui.open) { img.src = u; img.hidden = false; } }).catch(() => {});
}
function setMeowth() {
  const img = $('.rocket-meowth');
  const alt = $('.rocket-meowth-alt');
  const show = (u) => { img.src = u; img.hidden = false; alt.hidden = true; };
  img.hidden = true; alt.hidden = false;
  const u = animUrl(MEOWTH);
  if (u) show(u); else ensureAnim(MEOWTH).then((x) => { if (x && ui.open) show(x); }).catch(() => {});
}

function say(who, text) {
  const b = $('.rocket-bubble');
  b.hidden = false;
  $('.rocket-who').textContent = `${WHO[who] || ''} ${who}`;
  $('.rocket-say').textContent = text;
  replay(b, 'pop');
}
function msg(text) { $('.rocket-msg').textContent = text; }

/** ❤️ 열기구 체력(맞혀야 할 수) · 🕸 틀린 수 */
function paintScore(st) {
  const hp = $('.rocket-hp');
  hp.innerHTML = '';
  for (let i = 0; i < ROCKET.winAt; i++) hp.appendChild(el('span', i < st.right ? 'heart broken' : 'heart', i < st.right ? '💔' : '❤️'));
  $('.rocket-score').textContent = `맞힘 ${st.right}/${ROCKET.winAt} · 틀림 ${st.wrong}/${ROCKET.loseAt} — ${ROCKET.winAt}번 맞히면 쫓아내요!`;
  root.style.setProperty('--reach', String(Math.min(st.wrong, ROCKET.loseAt)));
}

/** 구호를 한 줄씩 — 탭하면 바로 끝 */
async function motto(lines) {
  let skipped = false;
  ui.skip = () => { skipped = true; };
  for (const [who, text] of lines) {
    if (skipped || !ui.open) break;
    say(who, text);
    for (let t = 0; t < 9 && !skipped; t++) await sleep(100);
  }
  ui.skip = null;
}

/** 맞힌 순간 — 파트너가 튀어나가고 기술 이모지가 열기구로 날아가 맞는다 */
async function attack(partner) {
  const mv = MOVES[typeOf(partner.id)] || MOVES.normal;
  replay($('.rocket-partner'), 'lunge');
  const shot = el('span', 'rocket-shot', mv.emoji);
  $('.rocket-fx').appendChild(shot);
  msg(`${partner.ko}의 ${mv.strong}!`);
  sfx.zap(); vibrate(30);
  await sleep(550);
  shot.remove();
  replay($('.rocket-balloon'), 'hit');
  replay($('.rocket-sky'), 'flash');
  sfx.hit();
  await sleep(450);
}

/** 틀린 순간 — 로봇팔이 한 칸 내려오고 나옹이 비웃는다 */
async function armDown() {
  replay($('.rocket-claw'), 'grab');
  say('나옹', '냐하하! 한 칸 더 가까워졌다옹!');
  sfx.wrong();
  await sleep(700);
}

/** 이겼다 — 💥 → 빙글빙글 하늘 저편 → ✨ 반짝 */
async function blastOff() {
  $('.rocket-bubble').hidden = true;
  const boom = el('span', 'rocket-boom', '💥');
  $('.rocket-fx').appendChild(boom);
  sfx.boom(); vibrate([40, 30, 80]);
  await sleep(500);
  say('로사', BLAST);
  $('.rocket-gang').classList.add('blast');
  await sleep(1500);
  boom.remove();
  $('.rocket-bubble').hidden = true;
  const tw = $('.rocket-twinkle');
  tw.hidden = false;
  replay(tw, 'go');
  sfx.twinkle();
  await sleep(1300);
}

/** 졌다 — 그물이 그 포켓몬을 낚아채 열기구에 매달고 날아간다 */
async function snatch(stolen) {
  if (stolen) {
    $('.rocket-net').classList.add('drop');
    sfx.whoosh();
    await sleep(700);
    $('.rocket-target').classList.add('taken');
    say('나옹', '잘 가져가겠다옹~!');
    await sleep(900);
  } else {
    say('나옹', '어라? 노리던 포켓몬이 없다옹…');
    await sleep(1100);
  }
  $('.rocket-gang').classList.add('flee');
  sfx.fail();
  await sleep(1300);
}

function clearPanel() {
  $('.rocket-quiz').innerHTML = '';
  $('.rocket-actions').innerHTML = '';
}
function button(label, primary, onClick) {
  const b = el('button', 'btn' + (primary ? ' btn-primary' : ''), label);
  b.type = 'button';
  b.addEventListener('click', onClick);
  $('.rocket-actions').appendChild(b);
  return b;
}
/**
 * 💾 저장 — 저장이 안 되면(why:'save') "다시 저장·나중에"를 묻는다 (Codex 43차 #2). 메모리로 이어 가지 않는다:
 * 그러면 다음 저장이 덮어 맞힌 답이 사라지거나 보상을 두 번 받았다. 나중에면 null — 화면을 닫고, 배틀은 저장된 데까지 남아 다음에 이어진다.
 * 저장 실패가 아닌 결과(이미 끝난 배틀 등)는 그대로 돌려준다
 * @param {() => Promise<{ok:boolean, why?:string}>} fn
 */
async function persist(fn) {
  for (;;) {
    const r = await fn();
    if (!r || r.why !== 'save') return r;
    clearPanel();
    msg('💾 저장이 안 됐어요. 다시 눌러 볼까요? (나중에 하면 다음에 이 자리부터 이어서 해요)');
    const again = await new Promise((resolve) => {
      button('다시 저장', true, () => resolve(true));
      button('나중에', false, () => resolve(false));
    });
    clearPanel();
    msg('');
    if (!again || !ui.open) return null;
  }
}

/** 마지막 버튼 하나 — 누르면 닫힌다 */
function finish(label) {
  return new Promise((resolve) => {
    const b = button(label, true, () => { b.disabled = true; resolve(); });
  });
}

/**
 * 🚀 로켓단 배틀을 연다 (이어 가기 포함). 닫히면 풀린다.
 * @param {{
 *   cur: {id:string, target:number, st:object},
 *   resume?: boolean,
 *   kid: string,
 *   target: {id:number, ko:string, url:string},
 *   partner: {id:number, ko:string, url:string},
 *   quiz: (box:HTMLElement, hooks:object) => Promise<{correct:boolean, skipped:boolean, interrupted:boolean}>,
 *   saveStep: (correct:boolean) => Promise<{ok:boolean, st:object|null}>,
 *   lose: () => Promise<{ok:boolean, stolen:boolean}>,
 *   hideout: () => Array<{id:number, ko:string, url:string, n:number}>,
 *   win: (backId:number|null) => Promise<{ok:boolean, back:number|null}>,
 * }} o
 */
export async function openRocket(o) {
  if (!root) build();
  if (ui.open) return;
  ui.open = true;
  if (touched()) unlock();
  root.hidden = false;
  root.className = 'rocket';
  root.querySelectorAll('.blast, .flee, .taken, .drop, .go').forEach((n) => n.classList.remove('blast', 'flee', 'taken', 'drop', 'go'));
  $('.rocket-twinkle').hidden = true;
  $('.rocket-bubble').hidden = true;
  $('.rocket-fx').innerHTML = '';
  clearPanel();
  msg('');
  setMeowth();
  setMon($('.rocket-target img'), o.target);
  setMon($('.rocket-partner img'), o.partner);
  $('.rocket-target .rocket-name').textContent = `🎯 ${o.target.ko}`;
  $('.rocket-partner .rocket-name').textContent = `🤝 ${o.partner.ko}`;
  let st = { asked: 0, right: 0, wrong: 0, outcome: null, ...(o.cur.st || {}) };
  paintScore(st);
  try {
    // ① 경보 → ② 열기구가 내려옴 → ③ 구호
    root.classList.add('alarm');
    sfx.siren(); vibrate([80, 60, 80]);
    replay($('.rocket-gang'), 'descend');
    await sleep(1300);
    root.classList.remove('alarm');
    if (o.resume) await motto([['로사', '아직 안 끝났다! 로켓단이 돌아왔다!'], ['나옹', '이번엔 꼭 가져가겠다옹!']]);
    else await motto(MOTTO);
    // ④ 노리는 포켓몬
    say('나옹', `${o.kid}의 ${o.target.ko}${josa(o.target.ko, '을', '를')} 가져가겠다옹!`);
    replay($('.rocket-target'), 'aimed');
    msg(`🚀 로켓단이 ${o.target.ko}${josa(o.target.ko, '을', '를')} 노려요! 문제를 맞혀 쫓아내요.`);
    await sleep(900);
    // ⑤ 문제 — 승패가 날 때까지 (저장된 상태로 이어 간다)
    while (!st.outcome && ui.open) {
      clearPanel();
      const box = $('.rocket-quiz');
      const r = await o.quiz(box, { register: (fn) => { ui.closeQuiz = fn; } });
      ui.closeQuiz = null;
      if (!ui.open || r.interrupted) return;
      const correct = !!r.correct && !r.skipped; // ⏭ 모르겠어요는 틀린 것
      const saved = await persist(() => o.saveStep(correct));
      if (!saved) return; // 💾 나중에 — 이 답은 저장되지 않았다(다음에 이 자리부터)
      if (!saved.ok) {
        // 다른 창(또는 다시 연 앱)이 이미 이 배틀을 끝냈다
        if (saved.st && saved.st.outcome) { st = saved.st; break; }
        clearPanel();
        msg('다른 화면에서 이미 끝난 배틀이에요.');
        await finish('닫기');
        return;
      }
      st = saved.st;
      paintScore(st);
      if (correct) await attack(o.partner); else await armDown();
    }
    clearPanel();
    if (st.outcome === 'win') {
      await blastOff();
      msg(`🎉 로켓단을 쫓아냈어요! ⚡+${ROCKET.winXp} 💰+${ROCKET.winCoins}`);
      const held = o.hideout();
      if (held.length) {
        $('.rocket-score').textContent = '🚀 로켓단 아지트에 갇힌 포켓몬을 하나 구해 올 수 있어요. 누구를 구할까요?';
        const backId = await new Promise((resolve) => {
          for (const h of held) {
            const b = button('', false, () => { [...$('.rocket-actions').children].forEach((x) => { x.disabled = true; }); resolve(h.id); });
            b.classList.add('rocket-rescue');
            const img = el('img'); img.alt = ''; img.draggable = false; setMon(img, h);
            b.appendChild(img);
            b.appendChild(el('span', '', `${h.ko}${h.n > 1 ? ` ×${h.n}` : ''}`));
          }
        });
        const w = await persist(() => o.win(backId));
        if (!w) return; // 💾 나중에 — 이긴 배틀로 남아 다음에 다시 고른다
        clearPanel();
        const got = held.find((h) => h.id === w.back);
        msg(w.ok ? (got ? `🎉 ${got.ko}${josa(got.ko, '을', '를')} 구했어요! ⚡+${ROCKET.winXp} 💰+${ROCKET.winCoins}` : `🎉 로켓단을 쫓아냈어요! ⚡+${ROCKET.winXp} 💰+${ROCKET.winCoins}`) : '이미 끝난 배틀이에요.');
        $('.rocket-score').textContent = '';
      } else {
        const w = await persist(() => o.win(null));
        if (!w) return;
        if (!w.ok) msg('이미 끝난 배틀이에요.');
        $('.rocket-score').textContent = '';
      }
      await finish('계속하기 ▶');
    } else if (st.outcome === 'lose') {
      const l = await persist(() => o.lose()); // 그림보다 먼저 저장 — 애니메이션 중에 꺼져도 결과는 남는다
      if (!l) return; // 💾 나중에 — 진 배틀로 남아 다음에 이어진다
      if (!l.ok) { msg('다른 화면에서 이미 끝난 배틀이에요.'); await finish('닫기'); return; } // "빈손"이라고 잘못 말하지 않게
      await snatch(!!l.stolen);
      $('.rocket-score').textContent = '';
      msg(l && l.stolen
        ? `😢 ${o.target.ko}${josa(o.target.ko, '을', '를')} 빼앗겼어요… 다음에 로켓단을 이기면 아지트에서 구해 올 수 있어요!`
        : `로켓단이 빈손으로 돌아갔어요!`);
      await finish('계속하기 ▶');
    }
  } finally {
    ui.open = false;
    ui.skip = null;
    if (ui.closeQuiz) { const f = ui.closeQuiz; ui.closeQuiz = null; f(); }
    root.hidden = true;
  }
}

/** 지금 로켓단 화면이 열려 있나 */
export function isRocketOpen() {
  return ui.open;
}
