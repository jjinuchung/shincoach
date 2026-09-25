// 🐣 부화 화면 — 🥚 알이 5일을 채워 부화했을 때 한 번 보여 준다 (소유는 이미 트랜잭션에서 도감에 들어갔다 — 이 화면은 축하만)
import { makeFigure } from './items.js';
import { animUrl, ensureAnim } from './sprite.js'; // 🕺 움직이는 도트 그림
import { sfx } from './sfx.js';
import { hatchedUnseen, markEggSeen, getLook } from './xp.js';
import { ROSTER, ensureCast } from './pokemon.js';

const $ = (id) => document.getElementById(id);

/** 🕺 큰 일러스트 아래에 움직이는 도트를 세운다 (없으면 조용히 받아 와서 보여 준다) */
export function showDot(el, monId) {
  if (!el) return;
  const id = Number(monId);
  const u = id ? animUrl(id) : null;
  el.hidden = !u;
  if (u) { if (el.getAttribute('src') !== u) el.src = u; return; }
  if (!id) return;
  ensureAnim(id).then((got) => { if (got && el.isConnected) { el.src = got; el.hidden = false; } }).catch(() => {});
}
let onDone = null;

/**
 * @param {{id?:number, ko:string, url?:string|null, subject:'math'|'english', onDone?:()=>void}} o url이 없으면(그림을 못 받음) 🥚 이모지로
 */
export function openHatch(o) {
  const box = $('hatch');
  if (!box) return;
  onDone = o.onDone || null;
  const stage = $('hatch-stage');
  stage.innerHTML = '';
  if (o.url) stage.appendChild(makeFigure(o.url, o.ko, o.look || null, 'hatch-mon'));
  else { const em = document.createElement('div'); em.className = 'hatch-emoji'; em.textContent = '🐣'; stage.appendChild(em); }
  showDot($('hatch-dot'), o.id); // 🕺 갓 태어난 모습이 움직인다
  $('hatch-title').textContent = `🐣 ${o.subject === 'math' ? '수학' : '영어'} 알이 부화했어요!`;
  $('hatch-text').textContent = `${o.ko}${josa(o.ko, '이', '가')} 태어났어요 — 도감에 들어갔어요. 잘 배운 5일의 선물이에요!`;
  box.hidden = false;
  try { sfx.levelUp(); } catch { /* 소리는 없어도 */ }
}

export function closeHatch() {
  const box = $('hatch');
  if (!box || box.hidden) return;
  box.hidden = true;
  const d = $('hatch-dot');
  if (d) d.hidden = true;
  const f = onDone; onDone = null;
  if (typeof f === 'function') f();
}

export function initHatch() {
  const b = $('hatch-ok');
  if (b) b.addEventListener('click', closeHatch);
}

let showing = false;
/**
 * 🐣 아직 안 보여 준 부화가 있으면 하나 보여 주고 "봤다"고 적는다 (소유는 이미 트랜잭션에서 끝났다 — 이 화면은 축하만).
 * 그림은 있으면 받아 오고(ensureCast), 못 받으면 🐣로. 한 번에 하나, 열려 있으면 다음 기회에.
 */
/** 다른 모달(잡기·상점·포켓몬 팝업·배틀·퍼즐·복습·에세이·단어·🧬 진화 연출)이 열려 있나 — 그 위에 겹치지 않는다 */
function anyModalOpen() {
  return ['catch', 'shop', 'mon', 'battle', 'puzzle', 'review', 'essay', 'match', 'evolve'].some((id) => { const e = $(id); return e && !e.hidden; });
}
export async function showHatchIfAny() {
  const box = $('hatch');
  if (!box || !box.hidden || showing) return false;
  const list = hatchedUnseen();
  if (!list.length) return false;
  showing = true;
  const egg = list[0];
  try {
    const r = ROSTER.find((x) => x.id === egg.monId);
    let url = null;
    try { const got = await Promise.race([ensureCast([egg.monId]), new Promise((res) => setTimeout(() => res([]), 8000))]); url = got && got[0] ? got[0].url : null; } catch { url = null; }
    if (anyModalOpen()) return false; // 그 사이 다른 게 열렸다 — 다음 기회에 (봤다고 적지 않는다)
    // "봤다"는 아이가 좋아!를 눌렀을 때 적는다 — 그림을 못 받거나 화면이 안 떴는데 봤다고 남지 않게 (Codex 7차 #7). 두 창이 같이 보여 주는 건 괜찮다
    openHatch({ id: egg.monId, ko: r ? r.ko : '포켓몬', url, subject: egg.subject, look: getLook(egg.monId), onDone: () => { markEggSeen(egg.id).catch(() => {}); } });
    return true;
  } finally { showing = false; }
}

function josa(word, withBatchim, without) {
  const ch = String(word || '').slice(-1);
  const code = ch.charCodeAt(0) - 0xAC00;
  if (code < 0 || code > 11171) return without;
  return code % 28 === 0 ? without : withBatchim;
}
