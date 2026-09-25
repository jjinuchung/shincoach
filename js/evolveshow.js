// ✨ 진화 연출 — 원작처럼 하얀 실루엣이 커졌다 작아졌다 하다가 번쩍 하고 새 모습이 된다.
// 소유는 이미 트랜잭션(db.evolveRule)에서 끝났다 — 이 화면은 축하만 한다 (🐣 hatch.js와 같은 자리).
//
// 구형 태블릿(갤럭시탭 A7, Android 10)을 생각해 **움직이는 것은 transform·opacity만** 쓴다.
// 실루엣은 filter지만 애니메이션 중에 값이 바뀌지 않는(켜고 끄기만 하는) 고정값이라 부담이 없다.
import { setFigure } from './items.js';
import { sfx } from './sfx.js';
import { ensureCast, artUrl } from './pokemon.js';

const $ = (id) => document.getElementById(id);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let skip = false;    // 아이가 화면을 눌러 건너뛰었나 (여러 번 보면 지겹다)
let running = false; // 연출(실루엣~번쩍)이 도는 중인가 — 이때는 탭이 "건너뛰기"다
let busy = false;    // 열려 있는 동안 내내 — 두 번째 호출이 첫 호출자의 promise를 가로채지 않게
let onDone = null;   // 딱 한 번만 부른다 (settle)

/** 받침이 있으면 '이', 없으면 '가' */
function iga(word) {
  const c = String(word || '').trim().slice(-1).charCodeAt(0);
  if (!(c >= 0xac00 && c <= 0xd7a3)) return '가';
  return (c - 0xac00) % 28 ? '이' : '가';
}

/** 받침이 있으면 '으로', 없으면 '로' (ㄹ 받침은 '로') — "거북왕로 진화했어요"가 안 되게 */
function euro(word) {
  const c = String(word || '').trim().slice(-1).charCodeAt(0);
  if (!(c >= 0xac00 && c <= 0xd7a3)) return '로';
  const jong = (c - 0xac00) % 28;
  return jong === 0 || jong === 8 ? '로' : '으로';
}

export function initEvolveShow() {
  const box = $('evolve');
  if (!box) return;
  const ok = $('evolve-ok');
  if (ok) ok.addEventListener('click', close);
  // 연출 중 아무 데나 누르면 건너뛴다 (끝난 뒤에는 버튼으로만 닫는다 — 실수로 못 보고 지나치지 않게)
  box.addEventListener('click', (e) => {
    if (running && e.target !== ok) skip = true;
  });
}

/** 화면을 닫고, 기다리던 쪽을 **딱 한 번** 풀어 준다 */
function close() {
  const box = $('evolve');
  if (!box) return;
  box.hidden = true;
  box.classList.remove('evolving');
  running = false;
  busy = false;
  const f = onDone; onDone = null;
  if (typeof f === 'function') f();
}

/**
 * 🧬 진화 연출을 보여 준다. 끝날 때까지 기다릴 수 있다(await).
 * @param {{from:{id:number,ko:string,url?:string}, to:{id:number,ko:string}, look?:object, first?:boolean, partnerMoved?:boolean, gearBack?:string|null}} o
 */
export async function showEvolve(o) {
  const box = $('evolve');
  // ★ 끝 화면에서 "좋아!"를 누르기 전에 또 부르면 첫 호출자의 promise가 영영 안 풀린다 (Codex 10차 #5B).
  //   그래서 busy는 **닫힐 때까지** 잡고 있는다 (연출이 끝나는 순간이 아니라)
  if (!box || busy) return;
  const fig = $('evolve-fig');
  const title = $('evolve-title');
  const text = $('evolve-text');
  const ok = $('evolve-ok');
  if (!fig || !title || !text || !ok) return;

  running = true;
  busy = true;
  skip = false;
  ok.hidden = true;
  try {
    title.textContent = '어라…?';
    text.textContent = `${o.from.ko}${iga(o.from.ko)} 이상해요!`;
    // ★ 연출 동안 카드를 어둡게 — 실루엣이 흰색이라 흰 배경에서는 포켓몬이 **사라진 것처럼** 보인다
    box.classList.add('evolving');
    box.hidden = false;

    // 진화형 그림은 없을 수도 있다(아직 안 받았거나 오프라인) — 연출을 시작해 두고 그 사이에 받아 온다.
    // ★ 8초 제한을 건다: 안 그러면 다운로드가 영영 안 끝날 때 await에 갇혀 **닫을 수 없는 화면**이 된다 (Codex 10차 #5A).
    //   진화는 이미 저장됐으니 그림이 없어도 연출은 끝나야 한다 (🐣 hatch.js와 같은 방식)
    const fromUrl = o.from.url || artUrl(o.from.id) || '';
    setFigure(fig, fromUrl, null); // 꾸밈은 빼고 몸만 (진화 중엔 장식이 의미 없다)
    const art = Promise.race([
      ensureCast([o.to.id]).then(() => artUrl(o.to.id) || '').catch(() => ''),
      new Promise((res) => setTimeout(() => res(''), 8000)),
    ]).catch(() => '');

    await pause(500);
    fig.classList.add('silhouette');
    sfx.whoosh();

    // 실루엣이 커졌다 작아졌다 — 점점 빨라지면서 두 모습이 번갈아 나온다
    let toUrl = '';
    const steps = [700, 560, 430, 320, 240];
    for (let i = 0; i < steps.length; i++) {
      if (skip) break;
      if (!toUrl) toUrl = await art.catch(() => '');
      const showTo = i % 2 === 1 && toUrl;
      setFigure(fig, showTo ? toUrl : fromUrl, null);
      fig.classList.remove('pulse');
      void fig.offsetWidth; // 애니메이션 다시 시작
      fig.style.animationDuration = `${steps[i]}ms`;
      fig.classList.add('pulse');
      try { sfx.tick(); } catch { /* 소리는 없어도 */ }
      await pause(steps[i]);
    }
    fig.classList.remove('pulse');
    fig.style.animationDuration = '';

    if (!toUrl) toUrl = await art.catch(() => '');
    setFigure(fig, toUrl || fromUrl, o.look || null);
    flash();
    box.classList.remove('evolving');
    fig.classList.remove('silhouette');
    fig.classList.add('reveal');
    try { sfx.levelUp(); } catch { /* 소리는 없어도 */ }

    title.textContent = '🧬 축하해요!';
    const bits = [`${o.from.ko}${iga(o.from.ko)} ${o.to.ko}${euro(o.to.ko)} 진화했어요!`];
    if (o.first) bits.push('🎒 도감에 새로 등록됐어요!');
    if (o.partnerMoved) bits.push('🤝 파트너도 새 모습이 됐어요.');
    if (o.gearBack) bits.push('🎀 달고 있던 장식은 가방으로 돌아갔어요.');
    text.textContent = bits.join(' ');
    ok.hidden = false;
    running = false; // 연출은 끝 — 이제 탭은 "건너뛰기"가 아니다. busy는 닫힐 때까지 잡고 있는다
  } catch (e) {
    // 그림·소리에서 무엇이 터져도 화면이 잠기면 안 된다 — 진화는 이미 저장됐다
    console.warn('진화 연출 오류 (진화는 이미 저장됐어요):', e);
    close();
    return;
  }

  await new Promise((resolve) => { onDone = resolve; });
}

/** 건너뛰기를 누르면 기다리지 않고 바로 지나간다 */
async function pause(ms) {
  const step = 60;
  for (let t = 0; t < ms; t += step) {
    if (skip) return;
    await wait(Math.min(step, ms - t));
  }
}

function flash() {
  const f = $('evolve-flash');
  if (!f) return;
  f.classList.remove('on');
  void f.offsetWidth;
  f.classList.add('on');
}

/** 연출이 열려 있나 (다른 모달이 그 위에 겹치지 않게) */
export function isEvolveOpen() {
  const box = $('evolve');
  return !!(box && !box.hidden);
}
