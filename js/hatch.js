// 🐣 부화 화면 — 🥚 알이 5일을 채워 부화했을 때 한 번 보여 준다 (소유는 이미 트랜잭션에서 도감에 들어갔다 — 이 화면은 축하만)
import { makeFigure } from './items.js';
import { sfx } from './sfx.js';
import { hatchedUnseen, markEggSeen } from './xp.js';
import { ROSTER, ensureCast } from './pokemon.js';

const $ = (id) => document.getElementById(id);
let onDone = null;

/**
 * @param {{ko:string, url?:string|null, subject:'math'|'english', onDone?:()=>void}} o url이 없으면(그림을 못 받음) 🥚 이모지로
 */
export function openHatch(o) {
  const box = $('hatch');
  if (!box) return;
  onDone = o.onDone || null;
  const stage = $('hatch-stage');
  stage.innerHTML = '';
  if (o.url) stage.appendChild(makeFigure(o.url, o.ko, null, 'hatch-mon'));
  else { const em = document.createElement('div'); em.className = 'hatch-emoji'; em.textContent = '🐣'; stage.appendChild(em); }
  $('hatch-title').textContent = `🐣 ${o.subject === 'math' ? '수학' : '영어'} 알이 부화했어요!`;
  $('hatch-text').textContent = `${o.ko}${josa(o.ko, '이', '가')} 태어났어요 — 도감에 들어갔어요. 잘 배운 5일의 선물이에요!`;
  box.hidden = false;
  try { sfx.levelUp(); } catch { /* 소리는 없어도 */ }
}

export function closeHatch() {
  const box = $('hatch');
  if (!box || box.hidden) return;
  box.hidden = true;
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
/** 다른 모달(잡기·상점·포켓몬 팝업·배틀·퍼즐·복습·에세이·단어)이 열려 있나 — 그 위에 겹치지 않는다 */
function anyModalOpen() {
  return ['catch', 'shop', 'mon', 'battle', 'puzzle', 'review', 'essay', 'match'].some((id) => { const e = $(id); return e && !e.hidden; });
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
    openHatch({ ko: r ? r.ko : '포켓몬', url, subject: egg.subject, onDone: () => { markEggSeen(egg.id).catch(() => {}); } });
    return true;
  } finally { showing = false; }
}

function josa(word, withBatchim, without) {
  const ch = String(word || '').slice(-1);
  const code = ch.charCodeAt(0) - 0xAC00;
  if (code < 0 || code > 11171) return without;
  return code % 28 === 0 ? without : withBatchim;
}
