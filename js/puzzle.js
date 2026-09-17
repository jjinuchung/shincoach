// 🧩 문장 퍼즐: 방금 배운 문장의 단어를 뒤섞어 보여주고, 아이가 드래그(또는 탭)로 원래 어순을 맞추는 게임
// N문장을 진행할 때마다 플레이어가 openPuzzle()을 호출한다 (player.js).
// 위쪽은 순수 로직(테스트 가능), 아래쪽은 화면(DOM). 모듈 로드 시점에는 DOM을 건드리지 않는다.

// 3~4단어는 "Use Fire Punch!" "Gengar, let's go!" 처럼 감탄·명령 조각이라 나열할 거리가 없다.
// 자막을 세어 보니 5단어 이상만 써도 문장의 3분의 1이 남으므로(10문장에 3개꼴) 퍼즐이 마르지 않는다.
export const PUZZLE_MIN_WORDS = 5;
export const PUZZLE_MAX_WORDS = 8; // 9단어 이상은 태블릿 화면에 안 맞음
export const PUZZLE_MAX_WRONG = 3; // 3번 틀리면 정답 공개

import { sfx, unlock } from './sfx.js';
import { makeFigure } from './items.js';

const hasLetter = (s) => /[A-Za-z0-9À-ɏ]/.test(s); // 영문·숫자·라틴 확장(é 등)

/** 문장 → 단어 조각. 구두점·대문자는 단어에 붙은 채 둠(힌트 역할). 구두점만 있는 조각은 앞 단어에 붙이고, 맨 앞이면 버림 */
export function splitWords(en) {
  const raw = String(en || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const out = [];
  for (const tok of raw) {
    if (hasLetter(tok)) out.push(tok);
    else if (out.length) out[out.length - 1] += tok; // "Hello ." → "Hello."
  }
  return out;
}

/**
 * 두 화자가 겹쳐 말한 자막인지 — 같은 구절이 잇달아 반복되면 그렇게 본다.
 * 예: "Yeah, But I'm her deputy. I'm her deputy." (두 사람이 동시에 같은 말)
 * 이런 문장은 어느 쪽에 놓아도 맞아서 퍼즐로는 찍기 문제가 되고, 받아쓰기도 의미가 없다.
 */
export function hasEchoedRun(words, minRun = 2) {
  const w = (words || []).map((x) => String(x).toLowerCase().replace(/[^a-z0-9']+/g, ''));
  const n = w.length;
  for (let len = minRun; len <= Math.floor(n / 2); len++) {
    for (let i = 0; i + 2 * len <= n; i++) {
      let same = true;
      for (let k = 0; k < len; k++) {
        if (!w[i + k] || w[i + k] !== w[i + len + k]) { same = false; break; }
      }
      if (same) return true;
    }
  }
  return false;
}

/** 퍼즐로 낼 수 있는 문장인지: 단어 수 5~8, 서로 다른 단어가 2개 이상 (전부 같으면 섞어도 그대로) */
export function isPuzzleable(cue, { min = PUZZLE_MIN_WORDS, max = PUZZLE_MAX_WORDS } = {}) {
  if (!cue || !cue.en) return false;
  const words = splitWords(cue.en);
  if (words.length < min || words.length > max) return false;
  if (hasEchoedRun(words)) return false; // 두 화자가 겹쳐 말한 자막
  return new Set(words).size >= 2;
}

/** 배열 섞기 (Fisher-Yates). rng는 0 이상 1 미만을 주는 함수 (테스트에서 고정용) */
export function shuffle(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

/** 보이는 단어 순서가 원래와 달라지도록 섞은 인덱스 배열. 전부 같은 단어면 그대로 */
export function scrambleOrder(words, rng = Math.random) {
  const idx = words.map((_, i) => i);
  if (new Set(words).size < 2) return idx;
  for (let n = 0; n < 20; n++) {
    const a = shuffle(idx, rng);
    if (a.some((j, i) => words[j] !== words[i])) return a;
  }
  // 극히 드물게 20번 다 같으면 서로 다른 이웃 단어를 바꿔서라도 다르게
  for (let i = 0; i < idx.length - 1; i++) {
    if (words[i] !== words[i + 1]) { const a = idx.slice(); a[i] = i + 1; a[i + 1] = i; return a; }
  }
  return idx;
}

/** 후보 문장들 중 퍼즐로 낼 만한 것 하나를 무작위로 고름 (없으면 null) */
export function pickPuzzle(cues, rng = Math.random) {
  const ok = (cues || []).filter((c) => isPuzzleable(c));
  if (!ok.length) return null;
  return ok[Math.min(ok.length - 1, Math.floor(rng() * ok.length))];
}

/** 놓은 순서가 정답과 같은지. wrong[i] = i번째 자리가 틀렸는지 (같은 단어가 여러 번 나와도 자리별로 비교) */
export function checkOrder(placed, answer) {
  const wrong = answer.map((w, i) => placed[i] !== w);
  return { correct: placed.length === answer.length && !wrong.some(Boolean), wrong };
}

// ───────────────────── 화면 ─────────────────────

const $ = (id) => document.getElementById(id);

const ui = {
  open: false,
  cue: null,
  answer: [],     // 정답 단어 배열
  wrongCount: 0,
  locked: false,  // 정답/정답 공개 뒤에는 조각을 못 움직임
  result: null,
  timer: null,
  onPlay: null,   // 🔊 다시 듣기 → 플레이어가 그 문장을 재생. onPlay(onEnd)의 onEnd는 재생이 끝났을 때 호출됨
  onClose: null,  // 끝났을 때 { solved, wrong } 전달
  drag: null,     // 드래그 중 정보
  slots: {},      // 단어의 "집" (원래 자리 인덱스 → 요소): 캐릭터가 있으면 말풍선, 없으면 자리 자체. 단어가 나가도 자리는 그대로
  chars: null,    // 이번 퍼즐에 나온 캐릭터 (결과에 실어 보냄 → 잡기 화면 후보)
  dragEndAt: 0,   // 드래그가 끝난 시각 (직후에 따라오는 click을 무시)
  pendingAuto: false, // 화면이 꺼진 동안 자동 종료를 미뤄 둠
};

export function initPuzzle() {
  // 정답 뒤에 다시 들으면 그 재생이 끝난 뒤 닫히도록 콜백을 다시 걸어줌
  $('puzzle-listen').addEventListener('click', () => { if (ui.onPlay) ui.onPlay(ui.result && ui.result.solved ? onSolvedPlayEnd : undefined); });
  $('puzzle-check').addEventListener('click', () => { unlock(); check(); });
  $('puzzle-continue').addEventListener('click', finish);
  document.addEventListener('visibilitychange', () => {
    // 화면이 꺼지거나 다른 앱으로 넘어가면 손을 뗀 이벤트가 안 온다 → 드래그를 여기서 끝낸다
    // (안 그러면 돌아왔을 때 조각이 하나도 안 눌린다)
    if (document.hidden) cancelDrag();
    if (document.hidden || !ui.open || !ui.pendingAuto) return;
    ui.pendingAuto = false;
    clearTimeout(ui.timer);
    ui.timer = setTimeout(autoFinish, 1000);
  });
  // 알림창이 내려오는 등 창이 포커스를 잃는 경우도 마찬가지 (화면은 켜져 있어 visibilitychange가 안 온다)
  window.addEventListener('blur', cancelDrag);
}

/** 자동 종료(정답 뒤): 화면이 꺼져 있으면 보류 — 잠긴 태블릿에서 다음 문장이 재생되지 않게 */
function autoFinish() {
  if (!ui.open) return;
  if (document.hidden) { ui.pendingAuto = true; return; }
  finish();
}

export function isPuzzleOpen() {
  return ui.open;
}

/**
 * 퍼즐 열기. onClose(result)는 아이가 맞추고(문장을 한 번 더 들려준 뒤) 또는 정답 공개 후 계속하기를 눌렀을 때 호출.
 * characters: [{ id, ko, url, look }] — 단어 수 이상 있으면 캐릭터가 단어를 말풍선에 들고 있는 모양으로 (없으면 단어 조각만). look = 장식·염색 (xp.getLook)
 */
export function openPuzzle(cue, { onPlay, onClose, characters } = {}) {
  closePuzzle();
  ui.open = true;
  ui.cue = cue;
  ui.answer = splitWords(cue.en);
  ui.wrongCount = 0;
  ui.locked = false;
  ui.result = null;
  ui.onPlay = onPlay || null;
  ui.onClose = onClose || null;
  ui.pendingAuto = false;

  const ko = $('puzzle-ko');
  ko.textContent = cue.ko || '';
  ko.hidden = !cue.ko;
  const bank = $('puzzle-bank');
  const ans = $('puzzle-answer');
  bank.innerHTML = '';
  ans.innerHTML = '';
  setMsg('단어를 순서대로 놓아봐요!');
  $('puzzle-check').hidden = false;
  $('puzzle-continue').hidden = true;
  const root = $('puzzle');
  root.classList.remove('solved', 'shake');
  root.hidden = false; // 크기를 재야 하므로 먼저 보이게
  // 단어마다 고정된 "자리"를 만들고 그 안에 조각을 넣음 → 조각을 꺼내 가도 나머지 단어가 밀려오지 않음 (아이가 누르려던 단어가 움직이면 헷갈림)
  // 캐릭터가 충분하면 자리 = [말풍선(단어) + 캐릭터 그림 + 이름] 카드. 캐릭터를 눌러도 단어가 오간다
  const n = ui.answer.length;
  const chars = characters && characters.length >= n ? pickSome(characters, n) : null;
  ui.chars = chars;
  ui.slots = {};
  const slots = [];
  const order = scrambleOrder(ui.answer);
  for (let k = 0; k < order.length; k++) {
    const i = order[k];
    const slot = document.createElement('span');
    slot.className = 'puzzle-slot' + (chars ? ' has-char' : '');
    slot.dataset.idx = String(i);
    let home = slot;
    if (chars) {
      home = document.createElement('span');
      home.className = 'puzzle-bubble';
      slot.appendChild(home);
      slot.appendChild(makeFigure(chars[k].url, chars[k].ko, chars[k].look, 'puzzle-char')); // 장식·염색이 있으면 같이 보임
      const name = document.createElement('span');
      name.className = 'puzzle-char-name';
      name.textContent = chars[k].ko;
      slot.appendChild(name);
      slot.addEventListener('click', onSlotClick);
    }
    home.appendChild(makeChip(ui.answer[i], i));
    bank.appendChild(slot);
    ui.slots[i] = home;
    slots.push(slot);
  }
  for (const slot of slots) { // 크기 고정 (조각이 나가도 자리·말풍선이 줄어들지 않게)
    const home = ui.slots[slot.dataset.idx];
    if (home !== slot && home.offsetWidth) { home.style.width = `${home.offsetWidth}px`; home.style.height = `${home.offsetHeight}px`; }
    if (slot.offsetWidth) { slot.style.width = `${slot.offsetWidth}px`; slot.style.height = `${slot.offsetHeight}px`; }
  }
  afterChange();
}

/** 배열에서 n개를 무작위로 (캐릭터 고르기) */
function pickSome(arr, n) {
  return shuffle(arr).slice(0, n);
}

/** 캐릭터 카드(그림·이름·빈 말풍선)를 누름: 단어가 집에 있으면 정답 칸으로, 정답 칸에 있으면 다시 집으로 */
function onSlotClick(e) {
  if (ui.locked || !ui.open) return;
  if (Date.now() - ui.dragEndAt < 400) return; // 드래그 직후 생기는 click은 무시
  if (e.target.closest && e.target.closest('.puzzle-chip')) return; // 조각 자체는 포인터 핸들러가 처리
  const idx = e.currentTarget.dataset.idx;
  const home = ui.slots[idx];
  const chip = home.querySelector('.puzzle-chip') || $('puzzle-answer').querySelector(`.puzzle-chip[data-idx="${idx}"]`);
  if (chip) tapChip(chip);
  afterChange();
}

/** 조각을 단어 모음의 원래 자기 자리로. 정답 칸에서 빼는 거면 그 자리에 빈 자리(점선)를 남겨 다음 단어가 거기로 들어가게 */
function returnToBank(chip, leaveGap = true) {
  const slot = ui.slots[chip.dataset.idx];
  if (!slot || chip.parentNode === slot) return;
  const ans = $('puzzle-answer');
  if (leaveGap && chip.parentNode === ans) ans.insertBefore(makeGap(), chip);
  slot.appendChild(chip);
}

function makeGap() {
  const g = document.createElement('span');
  g.className = 'puzzle-gap';
  g.setAttribute('aria-label', '빈 자리');
  return g;
}

/** 정답 칸에 조각 넣기: 빈 자리가 있으면 첫 빈 자리에, 없으면 맨 뒤에 */
function putInAnswer(chip) {
  const ans = $('puzzle-answer');
  const gap = ans.querySelector('.puzzle-gap');
  if (gap) ans.replaceChild(chip, gap);
  else ans.appendChild(chip);
}

/** 탭: 단어 모음에 있으면 정답 칸(빈 자리가 있으면 거기, 없으면 끝)에, 정답 칸에 있으면 단어 모음으로(빈 자리 남김) */
function tapChip(chip) {
  if (ui.locked) return;
  chip.classList.remove('bad');
  const bank = $('puzzle-bank');
  if (bank.contains(chip)) putInAnswer(chip);
  else returnToBank(chip, true);
}

/** 단어를 다 놓았으면 남은 빈 자리는 지움 (빈 자리는 "여기에 넣을 차례" 표시일 뿐) */
function clearGapsIfDone() {
  const ans = $('puzzle-answer');
  if ($('puzzle-bank').querySelectorAll('.puzzle-chip').length === 0) {
    for (const g of Array.from(ans.querySelectorAll('.puzzle-gap'))) g.remove();
  }
}

/** 결과 전달 없이 닫기 (플레이어를 닫을 때 등) */
export function closePuzzle() {
  if (!ui.open) return;
  ui.open = false;
  clearTimeout(ui.timer);
  ui.timer = null;
  cancelDrag(); // 드래그 중에 닫히면 리스너·자리표시·복제본까지 정리
  const root = $('puzzle');
  root.hidden = true;
  root.classList.remove('solved', 'shake');
  ui.cue = null;
  ui.onPlay = null;
  ui.onClose = null;
}

/** 정답 뒤 들려주기가 끝남 → 잠깐 두고 닫기 */
function onSolvedPlayEnd() {
  if (!ui.open || !ui.result || !ui.result.solved) return;
  clearTimeout(ui.timer);
  ui.timer = setTimeout(autoFinish, 700);
}

function finish() {
  if (!ui.open) return;
  const cb = ui.onClose;
  const result = ui.result || { solved: false, wrong: ui.wrongCount, characters: ui.chars || [] };
  closePuzzle();
  if (cb) cb(result);
}

function setMsg(text) {
  $('puzzle-msg').textContent = text;
}

function makeChip(word, idx) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'puzzle-chip';
  el.textContent = word;
  el.dataset.idx = String(idx); // 원래 자리 (정답 공개 때 이 순서로 재배열)
  el.addEventListener('pointerdown', onDown); // 이동/놓기는 드래그 중에만 document에서 받음 (조각을 DOM에서 옮겨도 안 끊기게)
  return el;
}

/** 조각이 움직인 뒤: 확인 버튼 활성(단어를 다 놓았을 때), 빈 정답 칸 안내 */
function afterChange() {
  const ans = $('puzzle-answer');
  const bank = $('puzzle-bank');
  clearGapsIfDone();
  ans.classList.toggle('empty', ans.children.length === 0);
  $('puzzle-check').disabled = ui.locked || bank.querySelectorAll('.puzzle-chip').length > 0;
  // 단어를 건네준 캐릭터는 흐리게
  for (const slot of Array.from(bank.children)) slot.classList.toggle('taken', !slot.querySelector('.puzzle-chip'));
}

// ── 드래그 / 탭 ──
// HTML5 drag-and-drop은 안드로이드 터치에서 동작하지 않으므로 포인터 이벤트로 직접 구현.
// 원칙: 드래그 중에는 잡은 조각을 DOM에서 옮기지 않는다 (옮기면 브라우저가 포인터 캡처를 놓쳐 드래그가 중간에 끊김 — 태블릿에서 재현).
// 대신 원래 자리는 반투명(ghost)으로 남기고, 복제본이 손가락을 따라다니며, 들어갈 자리에는 점선 자리표시(drop)만 끼워 보여준다.
// 이동/놓기 이벤트는 document에서 받아 손가락이 조각 밖으로 나가도 계속 따라온다.

function onDown(e) {
  if (ui.locked) return;
  // ★ 앞선 드래그가 끝나지 못하고 남아 있으면 여기서 되돌리고, 이번 터치는 정상으로 받는다.
  // 안드로이드에서는 드래그 도중 화면이 꺼지거나 알림·다른 앱으로 넘어가면 pointerup이 **아예 오지 않는다**.
  // 그대로 두면 ui.drag가 남아 이 아래 모든 터치(탭·드래그)가 조용히 무시돼,
  // 아이가 앱을 껐다 켜야만 퍼즐을 다시 할 수 있었다 (2026-09-17 진우 신고, 헤드리스로 재현).
  if (ui.drag) cancelDrag();
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const chip = e.currentTarget;
  const r = chip.getBoundingClientRect();
  ui.drag = {
    chip, id: e.pointerId, startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY,
    offX: e.clientX - r.left, offY: e.clientY - r.top, w: r.width, h: r.height,
    moved: false, clone: null, drop: null, raf: 0, scrollRaf: 0, card: null, evalX: -1e9, evalY: -1e9,
  };
  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp);
  document.addEventListener('pointercancel', onCancel);
  e.preventDefault();
}

function unbindDrag() {
  document.removeEventListener('pointermove', onMove);
  document.removeEventListener('pointerup', onUp);
  document.removeEventListener('pointercancel', onCancel);
}

/**
 * 진행 중인 드래그를 없던 일로 하고 흔적(복제본·자리표시·ghost·리스너·rAF)을 모두 정리한다.
 * 조각 자체는 드래그 중에 DOM에서 옮기지 않으므로 원래 자리에 그대로 있다.
 * 손을 뗀 이벤트를 못 받는 모든 경우(화면 꺼짐, 앱 전환, 퍼즐 닫힘, 다음 터치)의 공통 출구.
 */
function cancelDrag() {
  const d = ui.drag;
  if (!d) return;
  ui.drag = null;
  unbindDrag();
  if (d.raf) { cancelAnimationFrame(d.raf); d.raf = 0; }
  if (d.scrollRaf) { cancelAnimationFrame(d.scrollRaf); d.scrollRaf = 0; }
  if (d.moved) endDrag(d);
}

function onMove(e) {
  const d = ui.drag;
  if (!d || e.pointerId !== d.id) return;
  if (!d.moved) {
    if (Math.abs(e.clientX - d.startX) + Math.abs(e.clientY - d.startY) < 8) return; // 살짝 흔들린 건 탭으로
    d.moved = true;
    beginDrag(d);
  }
  d.x = e.clientX;
  d.y = e.clientY;
  d.clone.style.transform = `translate(${d.x - d.offX}px, ${d.y - d.offY}px)`; // 복제본은 매번 (transform만이라 가벼움)
  // 자리표시 계산은 6px 이상 움직였을 때 한 프레임에 한 번만
  if (Math.abs(d.x - d.evalX) + Math.abs(d.y - d.evalY) < 6) return;
  if (!d.raf) d.raf = requestAnimationFrame(() => { d.raf = 0; if (ui.drag === d) { d.evalX = d.x; d.evalY = d.y; updateDrop(d); } });
}

function onUp(e) {
  const d = ui.drag;
  if (!d || e.pointerId !== d.id) return;
  ui.drag = null;
  unbindDrag();
  if (d.raf) cancelAnimationFrame(d.raf);
  if (d.moved) { updateDrop(d); finishDrop(d); endDrag(d); } else tapChip(d.chip);
  afterChange();
}

function onCancel(e) {
  const d = ui.drag;
  if (!d || e.pointerId !== d.id) return;
  ui.drag = null;
  unbindDrag();
  if (d.raf) cancelAnimationFrame(d.raf);
  if (d.moved) endDrag(d);
  afterChange();
}

// 가로 모드·큰 글자에서는 카드가 화면보다 길어서 정답 칸이 화면 밖에 있을 수 있다
// (.puzzle-card는 overflow-y:auto). 조각에 touch-action:none이 걸려 있어 드래그 중에는
// 손으로 스크롤할 수도 없으므로, 손가락이 가장자리에 오면 카드를 대신 밀어 준다.
const EDGE_ZONE = 56;   // 위·아래 이 안에 손가락이 오면
const EDGE_SPEED = 14;  // 한 프레임에 최대 이만큼 (px)

function autoScroll(d) {
  d.scrollRaf = 0;
  if (ui.drag !== d) return;
  const card = d.card; // 매 프레임 찾지 않도록 잡을 때 한 번만 (beginDrag)
  if (card && card.scrollHeight > card.clientHeight + 1) {
    const r = card.getBoundingClientRect();
    let dy = 0;
    if (d.y < r.top + EDGE_ZONE) dy = -EDGE_SPEED * Math.min(1, (r.top + EDGE_ZONE - d.y) / EDGE_ZONE);
    else if (d.y > r.bottom - EDGE_ZONE) dy = EDGE_SPEED * Math.min(1, (d.y - (r.bottom - EDGE_ZONE)) / EDGE_ZONE);
    if (dy) {
      const before = card.scrollTop;
      card.scrollTop = before + dy;
      if (card.scrollTop !== before) { d.evalX = -1e9; updateDrop(d); } // 화면이 밀렸으니 자리표시 다시 계산
    }
  }
  d.scrollRaf = requestAnimationFrame(() => autoScroll(d));
}

function beginDrag(d) {
  const clone = d.chip.cloneNode(true);
  clone.className = 'puzzle-chip puzzle-drag';
  clone.style.width = `${d.w}px`;
  clone.style.height = `${d.h}px`;
  $('puzzle').appendChild(clone);
  d.clone = clone;
  d.chip.classList.add('ghost');
  d.chip.classList.remove('bad');
  d.card = $('puzzle').querySelector('.puzzle-card');
  autoScroll(d);
}

function endDrag(d) {
  ui.dragEndAt = Date.now();
  if (d.scrollRaf) { cancelAnimationFrame(d.scrollRaf); d.scrollRaf = 0; }
  if (d.clone) d.clone.remove();
  d.clone = null;
  if (d.drop) d.drop.remove();
  d.drop = null;
  d.chip.classList.remove('ghost');
}

/** 손가락 위치에 따라 정답 칸에 자리표시(drop)를 끼우거나 치움 — 잡은 조각 자체는 건드리지 않음 */
function updateDrop(d) {
  const ans = $('puzzle-answer');
  const bank = $('puzzle-bank');
  const ar = ans.getBoundingClientRect();
  const br = bank.getBoundingClientRect();
  // 정답 칸과 단어 모음 사이 중간선 기준: 위쪽이면 정답 칸, 아래쪽이면 단어 모음 (어디에 떨어뜨려도 둘 중 하나)
  const mid = (ar.bottom + br.top) / 2;
  if (d.y >= mid) {
    if (d.drop) { d.drop.remove(); d.drop = null; }
    d.zone = 'bank';
    return;
  }
  d.zone = 'answer';
  // 손가락보다 "뒤"에 있는 첫 조각/빈 자리(아랫줄이거나, 같은 줄에서 오른쪽) 앞이 들어갈 자리
  let ref = null;
  for (const c of Array.from(ans.children)) {
    if (c === d.chip || c === d.drop) continue;
    const r = c.getBoundingClientRect();
    if (d.y < r.top || (d.y <= r.bottom && d.x < r.left + r.width / 2)) { ref = c; break; }
  }
  // 원래 자기 자리(바로 앞/뒤)면 자리표시 없이 그대로
  if (d.chip.parentNode === ans && (ref === d.chip || ref === d.chip.nextSibling)) {
    if (d.drop) { d.drop.remove(); d.drop = null; }
    return;
  }
  if (!d.drop) {
    d.drop = document.createElement('span');
    d.drop.className = 'puzzle-drop';
    d.drop.style.width = `${d.w}px`;
    d.drop.style.height = `${d.h}px`;
  }
  if (d.drop.parentNode === ans && d.drop.nextSibling === ref) return; // 이미 그 자리
  ans.insertBefore(d.drop, ref);
}

/** 놓기: 자리표시가 있으면 그 자리에, 단어 모음 쪽이면 원래 자리로(정답 칸에서 끌어냈으면 빈 자리 남김) */
function finishDrop(d) {
  const ans = $('puzzle-answer');
  const chip = d.chip;
  if (d.zone === 'bank') {
    returnToBank(chip, true);
    return;
  }
  if (!d.drop) return; // 제자리
  ans.replaceChild(chip, d.drop); // 정답 칸 안에서 옮기는 건 순서만 바뀜 (빈 자리 안 남김)
  d.drop = null;
  // 바로 옆 빈 자리는 "그 자리에 넣은 것"으로 침
  const isGap = (n) => !!(n && n.classList && n.classList.contains('puzzle-gap'));
  if (isGap(chip.nextSibling)) chip.nextSibling.remove();
  else if (isGap(chip.previousSibling)) chip.previousSibling.remove();
}

// ── 판정 ──

function check() {
  if (ui.locked || !ui.open) return;
  const ans = $('puzzle-answer');
  for (const g of Array.from(ans.querySelectorAll('.puzzle-gap'))) g.remove();
  const chips = Array.from(ans.querySelectorAll('.puzzle-chip'));
  const placed = chips.map((c) => c.textContent);
  const res = checkOrder(placed, ui.answer);
  const root = $('puzzle');

  if (res.correct) {
    ui.locked = true;
    ui.result = { solved: true, wrong: ui.wrongCount, characters: ui.chars || [] };
    chips.forEach((c) => c.classList.add('ok'));
    root.classList.add('solved');
    sfx.ding();
    setMsg(ui.wrongCount === 0 ? '🎉 정답이에요! 한 번에 맞췄어요! 🔊' : '🎉 정답이에요! 🔊');
    afterChange();
    // 맞춘 문장을 한 번 더 들려주고(각인), 재생이 끝나면 닫힘. 재생이 안 되는 경우를 대비한 안전망 타이머
    if (ui.onPlay) {
      ui.onPlay(onSolvedPlayEnd);
      ui.timer = setTimeout(autoFinish, 12000);
    } else {
      ui.timer = setTimeout(autoFinish, 1500);
    }
    return;
  }

  ui.wrongCount++;
  sfx.wrong();
  chips.forEach((c, i) => c.classList.toggle('bad', !!res.wrong[i]));
  root.classList.remove('shake');
  void root.offsetWidth; // 애니메이션 재시작
  root.classList.add('shake');

  if (ui.wrongCount >= PUZZLE_MAX_WRONG) {
    ui.locked = true;
    ui.result = { solved: false, wrong: ui.wrongCount, characters: ui.chars || [] };
    // 정답 순서로 다시 배열해 보여주고, 소리도 들려줌
    chips.slice().sort((a, b) => Number(a.dataset.idx) - Number(b.dataset.idx)).forEach((c) => {
      c.classList.remove('bad');
      c.classList.add('ok');
      ans.appendChild(c);
    });
    setMsg('👀 정답은 이거예요. 한 번 읽어봐요!');
    $('puzzle-check').hidden = true;
    $('puzzle-continue').hidden = false;
    afterChange();
    if (ui.onPlay) ui.onPlay();
    return;
  }
  setMsg(`🤔 조금 달라요. 빨간 단어를 빼서 바꾸거나 끌어서 옮겨봐요! (${ui.wrongCount}/${PUZZLE_MAX_WRONG})`);
}
