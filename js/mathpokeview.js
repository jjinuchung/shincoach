// 🐾 포켓몬 수학 화면 (v364, 2026-10-29 아버님 「이대로」) — 진우가 잡은 포켓몬의 도감 숫자로 푸는 4학년 수학 한 판 (5문제)
// 문제는 mathpoke.js(순수), 판 끝 저장은 xp.commitChalRound(mathprog.pokeCommit — 일지·그날 첫 판 💰·🎯 예약·보상 한 트랜잭션)
// math.js가 ctx로 화면 비우기·사다리로 돌아가기·수학 기록을 건넨다(이 파일은 math.js를 import하지 않는다 — mathpuzzleview와 같은 꼴)
//  · 문제마다 보기 넷 — 틀리면 그 실수에 맞춘 힌트(소수점 맞춰 세로 셈 등)로 한 번 더 · 두 번 틀리면 풀이를 보여 주고 다음 문제
//  · 처음 고른 답만 센다(💰·🎯) · 💔·감점·남은 수 문구 없음 · 그만하기는 언제든(판을 버린다 — 저장도 보상도 없음)
import { makeBoard, dataOf, poolOf, POKE_KINDS, tenth, colRows } from './mathpoke.js';
import { quickLeft, pokeCommit } from './mathprog.js';
import { applyDailyDelta } from './db.js';
import { commitChalRound, getProfileSnapshot } from './xp.js';
import { ROSTER, characterUrl, artUrl, ensureArt } from './pokemon.js';
import { EVO } from './evolve.js';
import { todayKey } from './track.js';
import { guardStart } from './timeup.js';
import { sfx, unlock as sfxUnlock } from './sfx.js';

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

/** 숫자 원고 */
export const POKE_URL = './coach/math/pokemath.json';
// ps: 지금 푸는 판 { qs, i, wrong: [[틀린 보기 글]], first: [처음 답 맞았나], trap: [처음 틀린 실수], solved, finishing, finishErr, done }
const S = { ps: null, data: null, loading: null };

/** 지금 🐾 판을 푸는 중인가 (math.js가 🎒·📊에서 돌아올 때 본다) */
export function pokeActive() {
  return !!S.ps;
}

/** 헤드리스 걷기에만 — 지금 문제를 창에 걸어 둔다(?nosw=1 · 🎒 대여행 devQ와 같은 꼴) */
const devQ = (q) => { try { if (/[?&]nosw=1/.test(location.search)) window.__pokeQ = q; } catch { /* 무시 */ } };

/** 판을 버린다 (사다리·홈으로 나갈 때 — 끝내기 전이면 저장도 보상도 없다) */
export function endPoke() {
  S.ps = null;
}

/** 숫자 원고 받기 (한 번 · 실패하면 다음에 다시) */
function loadData() {
  if (S.data) return Promise.resolve(S.data);
  if (!S.loading) {
    S.loading = fetch(POKE_URL).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))).then((j) => {
      const d = dataOf(j);
      if (!d.size) throw new Error('빈 원고');
      S.data = d;
      return d;
    }).finally(() => { S.loading = null; });
  }
  return S.loading;
}

/** 사다리 머리의 🐾 단추 — 셈 문구 없이 「다 맞히면 🎯」/「지금은 연습」 */
export function pokeButton(ctx) {
  const box = el('div', 'mpk-slot');
  const b = el('button', 'btn btn-big-wide mpk-btn', '🐾 포켓몬 수학');
  b.type = 'button';
  b.addEventListener('click', () => guardStart('math', () => startPoke(ctx)));
  box.appendChild(b);
  const left = quickLeft(ctx.getState() || {}, todayKey()) > 0;
  box.appendChild(el('p', 'math-note mpk-note', left ? '내 포켓몬의 진짜 도감 숫자로 5문제 — 다 맞히면 🎯 포켓몬 잡기!' : '내 포켓몬의 진짜 도감 숫자로 5문제 — 오늘 🎯는 다 받았어요, 지금은 연습이에요'));
  return box;
}

/** 새 판 — 잡은 포켓몬으로 (씨앗은 판을 열 때 정해 🎒를 다녀와도 같은 문제) */
export async function startPoke(ctx) {
  sfxUnlock();
  let data;
  try { data = await loadData(); } catch { data = null; }
  if (!data) { failEl(ctx); return; }
  const p = getProfileSnapshot();
  const names = new Map(ROSTER.map((r) => [r.id, r.ko]));
  const pool = poolOf(p.caught, data, names);
  const qs = makeBoard(pool, (Date.now() % 2147483646) + 1, { evo: EVO, partner: Number(p.partner) || 0 });
  if (!qs.length) { failEl(ctx); return; }
  S.ps = { qs, i: 0, wrong: qs.map(() => []), first: [], trap: [], solved: false, finishing: false, finishErr: false, done: null };
  render(ctx);
}
/** 🎒·📊에서 돌아왔다 — 하던 자리 그대로 */
export function resumePoke(ctx) {
  if (!S.ps) { ctx.back(); return; }
  render(ctx);
}

function quit(ctx) {
  S.ps = null;
  ctx.back();
}

/** 숫자 원고를 못 받았다 (처음 열 때 인터넷이 없고 아직 받아 둔 적도 없음) */
function failEl(ctx) {
  const m = ctx.clearMain();
  const card = el('section', 'math-card mpk-card');
  card.appendChild(el('p', 'mpk-done-title', '🐾 포켓몬 숫자를 아직 못 받았어요'));
  card.appendChild(el('p', 'math-note', '인터넷이 될 때 한 번 더 눌러 주세요'));
  const back = el('button', 'btn btn-primary btn-big-wide', '🔢 수학으로');
  back.type = 'button';
  back.addEventListener('click', () => ctx.back());
  card.appendChild(back);
  m.appendChild(card);
}

/** 포켓몬 그림 — 받아 둔 그림(없으면 받아서) · 못 받으면 🐾로 대신(빈 자리만 남지 않게, Codex 168차) */
function monImg(id, ko) {
  const img = el('img', 'mpk-img');
  img.alt = ko;
  img.decoding = 'async';
  const paw = () => {
    if (!img.isConnected) return;
    const s = el('span', 'mpk-img mpk-img-paw', '🐾');
    s.setAttribute('aria-hidden', 'true');
    img.replaceWith(s);
  };
  img.addEventListener('error', paw, { once: true });
  const url = characterUrl(id) || artUrl(id);
  if (url) img.src = url;
  else ensureArt(id).then((u) => { if (u) { if (img.isConnected) img.src = u; } else paw(); }).catch(paw);
  return img;
}

/** 📊 막대그래프 (SVG) — 눈금 한 칸 0.1 m · 0.5 m마다 글자 */
function chartEl(chart) {
  const NS = 'http://www.w3.org/2000/svg';
  const mk = (tag, attrs, text) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v)); if (text !== undefined) e.textContent = text; return e; };
  const bars = chart.bars;
  const top = Math.max(5, Math.ceil(Math.max(...bars.map((b) => b.v)) / 5) * 5); // 십분의 일 m
  const W = 300;
  const H = 210;
  const x0 = 42;
  const y0 = 172;
  const yTop = 16;
  const unit = (y0 - yTop) / top;
  const svg = mk('svg', { viewBox: `0 0 ${W} ${H}`, class: 'mpk-chart', role: 'img', 'aria-label': `막대그래프 — ${bars.map((b) => `${b.ko} ${tenth(b.v)} m`).join(', ')}` });
  svg.appendChild(mk('text', { x: 6, y: 12, class: 'mpk-axis' }, '(m)'));
  for (let t = 0; t <= top; t++) {
    const y = y0 - t * unit;
    svg.appendChild(mk('line', { x1: x0, y1: y, x2: W - 8, y2: y, class: t % 5 ? 'mpk-grid' : 'mpk-grid is-major' }));
    if (t % 5 === 0) svg.appendChild(mk('text', { x: x0 - 6, y: y + 4, 'text-anchor': 'end', class: 'mpk-axis' }, tenth(t)));
  }
  const slot = (W - 8 - x0) / bars.length;
  bars.forEach((b, i) => {
    const bw = Math.min(46, slot * 0.55);
    const x = x0 + slot * i + (slot - bw) / 2;
    svg.appendChild(mk('rect', { x, y: y0 - b.v * unit, width: bw, height: b.v * unit, rx: 3, class: 'mpk-bar' }));
    svg.appendChild(mk('text', { x: x + bw / 2, y: y0 + 18, 'text-anchor': 'middle', class: 'mpk-barname' }, b.ko));
  });
  svg.appendChild(mk('line', { x1: x0, y1: y0, x2: W - 8, y2: y0, class: 'mpk-base' }));
  return svg;
}

/** 세로 셈 (힌트에) — 기호 칸·수 칸을 따로 두고 수를 오른쪽에 맞춘다: 소수 자리 수가 같아 소수점이 한 줄
 *  (Codex 168차 #1 — 둘째 줄에만 「+ 」가 붙어 소수점이 두 칸 어긋났다) */
function colEl(col) {
  const box = el('div', 'mpk-col');
  const row = (op, n, cls) => {
    box.appendChild(el('span', `mpk-col-op${cls}`, op));
    box.appendChild(el('span', `mpk-col-num${cls}`, n));
  };
  for (const r of colRows(col)) row(r.op, r.n, '');
  row('', '?', ' mpk-col-rule');
  return box;
}

/** 초점 옮기기 (없어도 된다) */
const focusOn = (e) => { if (e && e.focus) { try { e.focus({ preventScroll: true }); } catch { /* 초점은 없어도 */ } } };

/** 다시 그리기 */
function render(ctx) {
  const ps = S.ps;
  if (!ps) { ctx.back(); return; }
  const m = ctx.clearMain();
  const card = el('section', 'math-card mpk-card');
  if (!ps.done && !ps.finishing) {
    const top = el('div', 'mpk-top');
    const q = el('button', 'btn btn-small mpk-quit', '← 그만하기');
    q.type = 'button';
    q.addEventListener('click', () => quit(ctx));
    top.appendChild(q);
    card.appendChild(top);
  }
  if (ps.i >= ps.qs.length) {
    card.appendChild(finishEl(ctx));
    m.appendChild(card);
    focusOn(card.querySelector('.mpk-done button')); // 끝 화면·[다시 저장하기]의 첫 단추로 (Codex 168차)
    return;
  }
  const q = ps.qs[ps.i];
  devQ(q);
  const k = POKE_KINDS[q.kind];
  card.appendChild(el('div', 'math-eyebrow', `🐾 포켓몬 수학 · ${k.icon} ${k.ko}`)); // 몇째 문제인지는 안 보인다 (셈 문구 — Codex 168차 #4)
  if (q.mons.length) {
    const mons = el('div', `mpk-mons is-${q.mons.length}`);
    for (const mo of q.mons) {
      const t = el('div', 'mpk-mon');
      t.appendChild(monImg(mo.id, mo.ko));
      t.appendChild(el('span', 'mpk-name', mo.ko));
      t.appendChild(el('span', `mpk-val${mo.tag.startsWith('몸무게') ? ' is-w' : mo.tag.startsWith('키') ? '' : ' is-shop'}`, mo.tag));
      mons.appendChild(t);
    }
    card.appendChild(mons);
  }
  if (q.chart) card.appendChild(chartEl(q.chart));
  card.appendChild(el('p', 'math-qtext mpk-ask', q.text));
  if (q.tip) card.appendChild(el('p', 'mpk-tip', q.tip)); // 💡 단위 사이 (단위 바꾸기)
  const opts = el('div', `mpk-opts${q.kind === 'cmp' ? ' is-three' : ''}`);
  const wrong = ps.wrong[ps.i];
  q.opts.forEach((o) => {
    const isNo = wrong.includes(o.t);
    const isOk = ps.solved && o.ok;
    const b = el('button', `mpk-opt${isNo ? ' is-no' : ''}${isOk ? ' is-ok' : ''}`, o.t);
    b.type = 'button';
    b.disabled = ps.solved || isNo;
    b.addEventListener('click', () => pick(ctx, o));
    opts.appendChild(b);
  });
  card.appendChild(opts);
  const live = el('div', 'mpk-fb');
  live.setAttribute('aria-live', 'polite');
  const last = wrong.length ? q.opts.find((o) => o.t === wrong[wrong.length - 1]) : null;
  if (ps.solved) {
    const right = wrong.length < 2;
    live.appendChild(el('p', `mpk-say ${right ? 'is-ok' : 'is-show'}`, right ? (wrong.length ? '맞아요! 힌트를 보고 잘 고쳤어요.' : '맞아요!') : '괜찮아요 — 풀이를 같이 봐요.'));
    live.appendChild(el('p', 'mpk-solve', `📝 ${q.solve}`));
  } else if (last) {
    const h = el('div', 'mpk-hint');
    h.appendChild(el('p', '', q.hints[last.trap] || '🤔 다시 한 번 생각해 볼까요?'));
    if (q.col && ['align', 'dot', 'shift', 'near', 'carry'].includes(last.trap)) h.appendChild(colEl(q.col));
    live.appendChild(h);
  }
  card.appendChild(live);
  if (ps.solved) {
    const next = el('button', 'btn btn-primary btn-big-wide mpk-next', ps.i + 1 < ps.qs.length ? '다음 문제 →' : '끝내기');
    next.type = 'button';
    next.addEventListener('click', () => nextQ(ctx));
    card.appendChild(next);
  }
  // 메가·폼 숫자와 헷갈리지 않게 「기본 모습」 (Codex 168차) · 가게 값만 쓰는 곱셈·나눗셈엔 안 붙인다
  if (q.kind !== 'mul' && q.kind !== 'div') card.appendChild(el('p', 'mpk-src', '📖 키·몸무게는 기본 모습의 도감 숫자예요'));
  m.appendChild(card);
  focusOn(ps.solved ? card.querySelector('.mpk-next') : card.querySelector('.mpk-opt:not(:disabled)'));
}

/** 보기를 골랐다 — 맞으면 풀이와 다음 · 틀리면 힌트(두 번째 틀리면 풀이) · 처음 답만 센다 */
function pick(ctx, o) {
  const ps = S.ps;
  if (!ps || ps.solved || ps.i >= ps.qs.length) return;
  const wrong = ps.wrong[ps.i];
  if (wrong.includes(o.t)) return;
  const firstTry = !wrong.length;
  if (o.ok) {
    if (firstTry) ps.first[ps.i] = true;
    ps.solved = true;
    try { sfx.ding(); } catch { /* 소리는 없어도 */ }
  } else {
    if (firstTry) { ps.first[ps.i] = false; ps.trap[ps.i] = o.trap || ''; }
    wrong.push(o.t);
    if (wrong.length >= 2) ps.solved = true; // 두 번 틀리면 풀이를 보여 주고 다음으로
    try { sfx.wrong(); } catch { /* 소리는 없어도 */ }
  }
  render(ctx);
}

function nextQ(ctx) {
  const ps = S.ps;
  if (!ps || !ps.solved) return;
  ps.i += 1;
  ps.solved = false;
  if (ps.i >= ps.qs.length) { finish(ctx); return; }
  render(ctx);
}

/** 판 끝 — 일지·그날 첫 판 💰·🎯 예약·보상을 한 트랜잭션 (실패하면 [다시 저장하기]) */
async function finish(ctx) {
  const ps = S.ps;
  if (!ps || ps.finishing || ps.done) return;
  ps.finishing = true;
  ps.finishErr = false;
  render(ctx);
  const today = todayKey();
  const recs = ps.qs.map((q, i) => ({ k: q.kind, ok: ps.first[i] ? 1 : 0, ...(ps.trap[i] ? { tag: ps.trap[i] } : {}) }));
  let saved;
  try { saved = await commitChalRound((s) => pokeCommit(s, recs, today)); } catch { saved = { ok: false }; }
  const good = !!(saved && saved.ok);
  // 저장이 됐으면 그 사이 화면을 떠났어도(홈으로) 하루 기록·수학 기록부터 — ⚡와 같게
  //   (Codex 168차 #3 — 화면 검사를 먼저 해 💰·🎯·일지는 저장됐는데 📈 「푼 문제」만 빠졌다)
  if (good) {
    const ok = recs.filter((r) => r.ok).length;
    applyDailyDelta(today, { mathQ: recs.length, mathOk: ok, mathRounds: 1 }).catch(() => {}); // 📈 「푼 문제」·정답률
    ctx.setState(saved.math);
    ctx.updateChip();
  }
  if (S.ps !== ps) return; // 그 사이 다른 화면으로 갔다 — 그리지 않는다
  ps.finishing = false;
  if (!good) { ps.finishErr = true; render(ctx); return; }
  ps.done = { ...saved.result, coin: (saved.reward && saved.reward.coin) || 0 };
  if (ps.done.perfect) { try { sfx.success(); } catch { /* 소리는 없어도 */ } }
  render(ctx);
}

function finishEl(ctx) {
  const ps = S.ps;
  const box = el('div', 'mpk-done');
  if (ps.finishing) { box.appendChild(el('p', 'mpk-done-title', '저장하는 중…')); return box; }
  if (ps.finishErr || !ps.done) {
    box.appendChild(el('p', 'mpk-done-title', '저장이 안 됐어요'));
    box.appendChild(el('p', 'math-note', '[다시 저장하기]를 눌러 주세요 — 푼 것은 그대로예요'));
    const again = el('button', 'btn btn-primary btn-big-wide', '💾 다시 저장하기');
    again.type = 'button';
    again.addEventListener('click', () => finish(ctx));
    box.appendChild(again);
    return box;
  }
  const d = ps.done;
  box.appendChild(el('p', 'mpk-done-icon', '🐾'));
  box.appendChild(el('p', 'mpk-done-title', d.perfect ? '🐾 처음 고른 답이 다 맞았어요!' : '🐾 포켓몬 수학 끝!'));
  const ul = el('ul', 'mpk-done-list');
  ps.qs.forEach((q, i) => ul.appendChild(el('li', '', `${ps.first[i] ? '⭕' : '❌'} ${POKE_KINDS[q.kind].icon} ${POKE_KINDS[q.kind].ko}`)));
  box.appendChild(ul);
  box.appendChild(el('p', 'mpk-done-line', `💰 +${d.coin}${d.catch ? ' · 🎯 포켓몬 잡기 1번!' : ''}`));
  if (d.catch) box.appendChild(el('p', 'math-note', '🎯 잡기는 수학 화면 위 🎯 단추에서 던져요'));
  else if (!d.perfect) box.appendChild(el('p', 'math-note', '틀린 문제가 있어도 괜찮아요 — 힌트를 보고 고친 것도 다 공부예요.'));
  const row = el('div', 'mpk-tools');
  const back = el('button', 'btn btn-primary mpk-back', '🔢 수학으로');
  back.type = 'button';
  back.addEventListener('click', () => quit(ctx));
  row.appendChild(back);
  const more = el('button', 'btn mpk-more', '🐾 한 판 더');
  more.type = 'button';
  more.addEventListener('click', () => guardStart('math', () => { S.ps = null; startPoke(ctx); }));
  row.appendChild(more);
  box.appendChild(row);
  // ☀️ 오늘의 수학으로 잇기 — 오늘 ☀️를 아직 끝내지 않았으면 단추 하나(math.js가 정함) · 누르면 이 판을 닫고 ☀️로
  const sun = ctx.sunEl ? ctx.sunEl('poke', () => { S.ps = null; }) : null;
  if (sun) box.appendChild(sun);
  if (ctx.addCell) ctx.addCell(box); // 🟢 숨은 지가르데 셀 (v352)
  return box;
}
