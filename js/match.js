// 🔤 단어 이어 주기 — 왼쪽 영어 5개, 오른쪽 한글 5개를 짝지어 잇는 게임.
//
// 왜 만들었나 (2026-09-19, 아버님 요청): 아이가 영상에서 만난 단어는 단어 패널에서 "보기만" 했다.
// 🔁 복습의 4지선다는 한 회차에 한 문제뿐이라 단어를 다루는 양이 적었다.
// 다섯 쌍을 한눈에 놓고 잇게 하면 **아는 것부터 지워 가며 나머지를 추론**하게 된다.
//
// 조작은 **탭 두 번**이다(왼쪽 탭 → 오른쪽 탭). 드래그로 선을 긋는 쪽이 재미있지만,
// 안드로이드는 화면이 꺼지면 pointerup을 안 줘서 드래그가 먹통이 된 적이 있다(v70 🧩 퍼즐).
// 탭은 그 구멍이 아예 없다.
//
// 위쪽은 순수 로직(테스트 가능), 아래쪽은 화면.
import { animUrl } from './sprite.js';
import { sfx, unlock, vibrate } from './sfx.js';
import * as bgm from './bgm.js';

// ── 규칙 ──

/** 한 판에 낼 쌍의 수 */
export const PAIRS = 5;
/** 이만큼 **새 단어**가 쌓이면 한 판 (아버님 요청: 20개쯤에 한 번씩) */
export const NEED_NEW = 20;

/**
 * 뜻에서 보기로 쓸 짧은 부분만 고른다.
 * 단어장의 뜻은 "관객, 청중" · "awake=깨어 있는; 깨다"처럼 여러 개가 붙어 있다.
 * 보기가 길면 다섯 개를 한 화면에 놓을 수 없고, 아이가 읽기도 어렵다.
 */
export function shortMeaning(meaning) {
  if (!meaning) return '';
  // ★ 괄호를 **먼저** 떼고 나서 첫 뜻을 자른다 — 순서를 바꾸면 괄호 안의 쉼표에서 잘려
  //   "~위에(독일어, auf Wiedersehen 안녕히)"가 "~위에(독일어"가 된다
  const clean = String(meaning).replace(/\([^)]*\)/g, ' ');
  return clean.split(/[;,]/)[0].trim();
}

/**
 * 이 단어를 게임에 낼 수 있나.
 * - "=awake" 같은 별칭은 뜻이 아니다
 * - 단어장에 일부러 넣어 둔 외국어(미니언 말·스페인어)는 영어 단어가 아니다 (vocab.foreign)
 * - 뜻이 너무 길면 보기로 못 쓴다
 */
export function matchable(rec, foreign) {
  if (!rec || !rec.word || !rec.meaning) return false;
  if (String(rec.meaning).trim().startsWith('=')) return false;
  if (foreign && foreign.has && foreign.has(rec.word)) return false;
  if (!/^[a-z][a-z'-]*$/i.test(rec.word)) return false; // 한 낱말만 (표현은 너무 길다)
  const m = shortMeaning(rec.meaning);
  return m.length > 0 && m.length <= 12;
}

/** 섞기 (판마다 자리가 달라야 위치를 외우지 못한다) */
export function shuffle(list, random = Math.random) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 이번 판에 낼 단어 고르기.
 *
 * 아직 이 게임에 안 쓴 단어가 `need`개 모이면 그중 **많이 본 순서로 need개를 한 묶음**으로 잡고,
 * 그 묶음에서 `pairs`개를 출제한다. 묶음 전체를 "썼다"고 표시하므로 **다음 판은 새 단어가
 * 또 20개 모여야** 열린다 (5개만 표시하면 5개 볼 때마다 열려 너무 잦다).
 *
 * @returns {{items:Array<{word,meaning,full}>, consumed:string[]}|null} 아직 이르면 null
 */
export function pickMatchRound(views, { pairs = PAIRS, need = NEED_NEW, foreign = null, random = Math.random } = {}) {
  const fresh = (views || []).filter((r) => r && !r.matchedAt && matchable(r, foreign));
  if (fresh.length < need) return null;
  const group = fresh
    .slice()
    .sort((a, b) => (b.views || 0) - (a.views || 0) || String(a.word).localeCompare(String(b.word)))
    .slice(0, need);

  // 뜻이 겹치면 정답이 둘이 되어 버린다 ("바다"가 두 개면 아이가 맞혀도 틀렸다고 나온다)
  const items = [];
  const seen = new Set();
  for (const r of shuffle(group, random)) {
    const m = shortMeaning(r.meaning);
    if (seen.has(m) || seen.has(r.word)) continue;
    seen.add(m);
    seen.add(r.word);
    items.push({ word: r.word, meaning: m, full: r.meaning });
    if (items.length >= pairs) break;
  }
  if (items.length < pairs) return null;
  return { items, consumed: group.map((r) => r.word) };
}

/** 틀린 횟수 → 보상 단계 (0번 / 1~2번 / 3번 이상) — 🧩 퍼즐과 같은 계단 */
export function rewardStep(wrong) {
  const w = Math.max(0, Math.floor(Number(wrong) || 0));
  if (w === 0) return 0;
  return w <= 2 ? 1 : 2;
}

// ── 화면 ──

const $ = (id) => document.getElementById(id);

const ui = {
  open: false,
  items: [],      // 이번 판의 정답 쌍
  picked: null,   // 지금 고른 칸 { side, word, el }
  solved: 0,
  wrong: 0,
  locked: false,
  onDone: null,
};

export function isMatchOpen() {
  return ui.open;
}

function setMsg(text) {
  const el = $('match-msg');
  if (el) el.textContent = text;
}

/** 두 칸을 잇는 선 하나 (보드 기준 좌표) */
function drawLine(leftEl, rightEl, cls) {
  const svg = $('match-lines');
  const board = $('match-board');
  if (!svg || !board) return null;
  const b = board.getBoundingClientRect();
  const l = leftEl.getBoundingClientRect();
  const r = rightEl.getBoundingClientRect();
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', String(l.right - b.left));
  line.setAttribute('y1', String(l.top - b.top + l.height / 2));
  line.setAttribute('x2', String(r.left - b.left));
  line.setAttribute('y2', String(r.top - b.top + r.height / 2));
  line.setAttribute('class', `match-line ${cls}`);
  svg.appendChild(line);
  return line;
}

/** 화면이 돌아가거나 글자 크기가 바뀌면 선이 엉뚱한 데 남는다 → 맞힌 쌍만 다시 그린다 */
function redrawLines() {
  const svg = $('match-lines');
  if (!svg || !ui.open) return;
  svg.innerHTML = '';
  for (const it of ui.items) {
    if (!it._ok) continue;
    const l = $('match-left').querySelector(`[data-word="${CSS.escape(it.word)}"]`);
    const r = $('match-right').querySelector(`[data-word="${CSS.escape(it.word)}"]`);
    if (l && r) drawLine(l, r, 'ok');
  }
}

function clearPick() {
  if (ui.picked && ui.picked.el) ui.picked.el.classList.remove('sel');
  ui.picked = null;
}

function onPick(side, word, el) {
  if (ui.locked || el.classList.contains('ok')) return;
  unlock(); // 소리를 쓰려면 사용자 제스처 안에서 한 번 깨워야 한다

  // 같은 쪽을 또 누르면 고른 것을 바꾼다 (아이가 마음을 바꿔도 막히지 않게)
  if (!ui.picked || ui.picked.side === side) {
    if (ui.picked && ui.picked.el === el) { clearPick(); return; }
    clearPick();
    ui.picked = { side, word, el };
    el.classList.add('sel');
    sfx.tick();
    return;
  }

  const first = ui.picked;
  clearPick();
  const correct = first.word === word;
  const leftEl = first.side === 'left' ? first.el : el;
  const rightEl = first.side === 'left' ? el : first.el;

  if (correct) {
    const it = ui.items.find((x) => x.word === word);
    if (it) it._ok = true;
    leftEl.classList.add('ok');
    rightEl.classList.add('ok');
    drawLine(leftEl, rightEl, 'ok');
    ui.solved++;
    sfx.ding();
    if (ui.solved >= ui.items.length) finish();
    else setMsg(`좋아요! ${ui.solved} / ${ui.items.length}`);
    return;
  }

  ui.wrong++;
  const line = drawLine(leftEl, rightEl, 'bad');
  leftEl.classList.add('bad');
  rightEl.classList.add('bad');
  sfx.wrong();
  vibrate(40);
  setMsg('음… 다시 볼까요?');
  setTimeout(() => {
    leftEl.classList.remove('bad');
    rightEl.classList.remove('bad');
    if (line && line.parentNode) line.parentNode.removeChild(line);
  }, 650);
}

function finish() {
  ui.locked = true;
  const step = rewardStep(ui.wrong);
  setMsg(step === 0 ? '🎉 한 번도 안 틀렸어요! 대단해요!' : (step === 1 ? '잘했어요! 거의 다 맞혔어요' : '다 맞혔어요! 다음엔 더 빨리!'));
  const root = $('match');
  if (root) root.classList.add('solved');
  sfx.success();
  const btn = $('match-continue');
  if (btn) { btn.hidden = false; btn.focus(); }
}

function makeCell(side, item, label) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = `match-cell match-${side}-cell`;
  el.dataset.word = item.word;
  el.textContent = label;
  el.addEventListener('click', (e) => { e.stopPropagation(); onPick(side, item.word, el); });
  return el;
}

/** 무대에서 춤추는 포켓몬들 (움직이는 도트 그림이 있는 것만, 없으면 무대는 비워 둔다) */
function fillStage(monIds) {
  const stage = $('match-stage');
  if (!stage) return;
  stage.innerHTML = '';
  const urlsFound = (monIds || []).map((id) => ({ id, url: animUrl(id) })).filter((m) => m.url).slice(0, 4);
  stage.hidden = urlsFound.length === 0;
  urlsFound.forEach((m, i) => {
    const img = document.createElement('img');
    img.className = 'match-dancer';
    img.src = m.url;
    img.alt = '';
    img.style.animationDelay = `${(i * 0.18).toFixed(2)}s`;
    stage.appendChild(img);
  });
}

/**
 * 게임 열기.
 * @param {{items:Array, monIds:number[], onDone:(r:{wrong:number, words:string[]})=>void}} o
 */
export function openMatch({ items, monIds = [], onDone = null } = {}) {
  closeMatch();
  bgm.play(); // 🎵 지난 이벤트에서 끊긴 자리부터 이어서
  ui.open = true;
  ui.items = (items || []).map((it) => ({ ...it, _ok: false }));
  ui.picked = null;
  ui.solved = 0;
  ui.wrong = 0;
  ui.locked = false;
  ui.onDone = onDone;

  const left = $('match-left');
  const right = $('match-right');
  const svg = $('match-lines');
  left.innerHTML = '';
  right.innerHTML = '';
  if (svg) svg.innerHTML = '';
  setMsg('같은 뜻끼리 이어 주세요!');

  for (const it of ui.items) left.appendChild(makeCell('left', it, it.word));
  for (const it of shuffle(ui.items)) right.appendChild(makeCell('right', it, it.meaning));

  fillStage(monIds);
  const btn = $('match-continue');
  if (btn) btn.hidden = true;
  const root = $('match');
  root.classList.remove('solved');
  root.hidden = false;
  window.addEventListener('resize', redrawLines);
}

export function closeMatch() {
  if (!ui.open) return;
  ui.open = false;
  ui.locked = true;
  clearPick();
  window.removeEventListener('resize', redrawLines);
  const root = $('match');
  if (root) { root.hidden = true; root.classList.remove('solved'); }
  bgm.stop();
}

/** 화면 배선 (앱 시작 때 한 번) */
export function initMatch() {
  const btn = $('match-continue');
  if (btn) {
    btn.addEventListener('click', () => {
      const result = { wrong: ui.wrong, words: ui.items.map((it) => it.word) };
      const done = ui.onDone;
      ui.onDone = null;
      closeMatch();
      if (done) done(result);
    });
  }
}
