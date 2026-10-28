// 📣 응원 포켓몬 — 국어 글 읽기·논술 판 (v327, 2026-10-23 아버님 "이대로") — 수학(math.maybeCheer·runCheer)과 같은 규칙(cheer.js —
// 틀린 직후 CHANCE_AFTER_WRONG · 맞힌 뒤 CHANCE · 한 번 나오면 COOLDOWN 문제는 쉼 · 켤 때마다 MAX_PER_SESSION까지)·같은 자리(#cheer).
// **아이 조작을 막지 않는다**: 탭이 통과하고(pointer-events:none — css) 화면 아래쪽으로만 지나간다 · 큰 창(잡기·배틀·로켓단)이 열릴 참이면 비켜 준다.
// 누가: 잡은 포켓몬 가운데 그 과목 포켓몬(📚 국어 150 · 🖊️ 논술 100)을 먼저 — 없으면 잡은 포켓몬 아무나(파트너는 반쯤)
// 이 파일은 koreanview·nonsulview를 import하지 않는다
import { shouldCheer, pickCheerer, pickLine, pickSide, WALK_MS, COOLDOWN } from './cheer.js';
import { getProfileSnapshot, getPartner, getLook, haveCount } from './xp.js';
import { ROSTER, loadCharacters, forSubject } from './pokemon.js';
import { animUrl, ensureAnims } from './sprite.js';
import { setFigure } from './items.js';

// cd = 남은 쉼 · n = 이번에 켠 뒤 지나간 수(장식이라 저장하지 않는다 — 수학과 같다) · chars = 받아 둔 포켓몬 그림
const C = { cd: 0, n: 0, last: '', timer: 0, pendingLine: '', chars: null, dotBusy: false };

/** 국어·논술 화면에 들어올 때 — 그림 목록을 읽고 움직이는 도트를 조금 받아 둔다(없으면 정지 그림이 미끄러진다) */
export function warmKorCheer() {
  loadCharacters().then((c) => { C.chars = c || []; topUpDots(); }).catch(() => { C.chars = C.chars || []; });
}

function topUpDots(n = 6) {
  if (C.dotBusy) return;
  const need = cheerMons().filter((m) => !m.dot && !(m.look && (m.look.formUrl || m.look.shinyUrl))).slice(0, n).map((m) => m.id);
  if (!need.length) return;
  C.dotBusy = true;
  ensureAnims(need).catch(() => {}).finally(() => { C.dotBusy = false; });
}

/** 응원하러 나올 수 있는 포켓몬: 지금 데리고 있고 그림이 있는 것 (😴 지친 애도 응원은 한다 · 진화로 보낸 모습은 안 온다 — 수학과 같다) */
function cheerMons() {
  const caught = getProfileSnapshot().caught;
  return Object.keys(caught).filter((k) => haveCount(k) > 0).map(Number).map((id) => {
    const r = ROSTER.find((m) => m.id === id);
    const c = (C.chars || []).find((x) => x.id === id);
    const look = getLook(id);
    const shiny = look && (look.formUrl || look.shinyUrl); // 🟢 지가르데 모습 그림도 (v359 — 도트는 50%폼뿐)
    return { id, ko: r ? r.ko : String(id), url: shiny || (c ? c.url : ''), dot: shiny ? null : animUrl(id), look };
  }).filter((m) => m.url || m.dot);
}

/**
 * 고른 답 하나마다 — 확률이 맞으면 포켓몬 하나가 화면 아래를 지나간다
 * @param {boolean} wrong 방금 틀렸나
 * @param {{subject:'korean'|'nonsul', visible:() => boolean, busy?:() => boolean}} o busy = 큰 창이 열렸거나 열릴 참
 */
export function korCheer(wrong, { subject, visible, busy }) {
  if (C.cd > 0) { C.cd--; return; }
  if (busy && busy()) return;
  if (!shouldCheer({ wrong, cooldown: 0, todayCount: C.n })) return;
  if (!C.chars) { warmKorCheer(); return; } // 그림 목록을 아직 못 읽었다 — 다음 기회에
  const all = cheerMons();
  const mine = new Set(forSubject(C.chars, subject).map((c) => c.id));
  const own = all.filter((m) => mine.has(m.id));
  const mon = pickCheerer(own.length ? own : all, getPartner());
  if (!mon) return; // 아직 잡은 포켓몬이 없거나 그림을 못 받았다
  run(mon, wrong, { visible, busy });
}

/**
 * 그림이 뜨는 그 순간 — 다시 보고 뜰 때만 횟수·쉼을 센다 (🔍 Codex 131차 #3: 그림이 늦게 뜨는 사이 화면을 떠났거나
 *   🚀 로켓단·잡기가 열릴 참이 되었으면 안 뜨고 세지도 않는다) · 떴으면 true
 * @param {{ko:string}} line @param {{visible:() => boolean, busy?:() => boolean}} gate @param {() => void} show
 */
export function cheerWalk(line, { visible, busy }, show) {
  if (!visible() || (busy && busy())) return false;
  C.last = line.ko;
  C.cd = COOLDOWN;
  C.n += 1;
  show();
  return true;
}

/** 🧪 시험용 — 남은 쉼·지나간 수 */
export function korCheerState() {
  return { cd: C.cd, n: C.n };
}

/** 한 번 지나가게 한다 — 그림이 실제로 뜬 뒤에만 횟수·쉼을 센다 (수학 Codex 9차 #10과 같다) */
function run(mon, wrong, gate) {
  const box = document.getElementById('cheer');
  if (!box) return;
  const line = pickLine(wrong, C.last);
  const show = () => {
    const side = pickSide();
    box.classList.remove('go-left', 'go-right');
    void box.offsetWidth; // 애니메이션을 처음부터 다시 돌리려면 한 번 끊어야 한다
    box.style.setProperty('--cheer-ms', `${WALK_MS}ms`);
    box.classList.add(side === 'left' ? 'go-right' : 'go-left');
    box.hidden = false;
    clearTimeout(C.timer);
    C.timer = setTimeout(() => { box.hidden = true; box.classList.remove('go-left', 'go-right'); }, WALK_MS + 100);
  };
  box.querySelector('.cheer-ko').textContent = line.ko;
  box.querySelector('.cheer-en').textContent = line.en;
  const face = box.querySelector('.cheer-mon');
  face.classList.toggle('dot', !!mon.dot);
  setFigure(face, mon.dot || mon.url, mon.dot ? null : mon.look);
  const img = box.querySelector('.cheer-mon img');
  const walk = () => { cheerWalk(line, gate, show); };
  img.onerror = () => { box.hidden = true; box.classList.remove('go-left', 'go-right'); }; // 죽은 그림 주소면 빈 네모가 걷지 않게
  if (img.complete) { if (img.naturalWidth === 0) return; walk(); return; }
  img.onload = () => { if (C.pendingLine === line.ko) walk(); };
  C.pendingLine = line.ko;
}

/** 국어·논술 화면을 떠날 때 — 걷던 것도 지운다 (app.showView) */
export function stopKorCheer() {
  const box = typeof document !== 'undefined' && document.getElementById('cheer');
  clearTimeout(C.timer);
  C.pendingLine = '';
  if (box) { box.hidden = true; box.classList.remove('go-left', 'go-right'); }
}
