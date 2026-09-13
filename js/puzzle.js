// 🧩 문장 퍼즐: 방금 배운 문장의 단어를 뒤섞어 보여주고, 아이가 드래그(또는 탭)로 원래 어순을 맞추는 게임
// N문장을 진행할 때마다 플레이어가 openPuzzle()을 호출한다 (player.js).
// 위쪽은 순수 로직(테스트 가능), 아래쪽은 화면(DOM). 모듈 로드 시점에는 DOM을 건드리지 않는다.

export const PUZZLE_MIN_WORDS = 3; // 2단어는 너무 쉬움
export const PUZZLE_MAX_WORDS = 8; // 9단어 이상은 태블릿 화면에 안 맞음
export const PUZZLE_MAX_WRONG = 3; // 3번 틀리면 정답 공개

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

/** 퍼즐로 낼 수 있는 문장인지: 단어 수 3~8, 서로 다른 단어가 2개 이상 (전부 같으면 섞어도 그대로) */
export function isPuzzleable(cue, { min = PUZZLE_MIN_WORDS, max = PUZZLE_MAX_WORDS } = {}) {
  if (!cue || !cue.en) return false;
  const words = splitWords(cue.en);
  if (words.length < min || words.length > max) return false;
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
  slots: {},      // 단어 모음의 자리 (원래 자리 인덱스 → 요소). 단어가 빠져나가도 자리는 그대로 남음
};

export function initPuzzle() {
  // 정답 뒤에 다시 들으면 그 재생이 끝난 뒤 닫히도록 콜백을 다시 걸어줌
  $('puzzle-listen').addEventListener('click', () => { if (ui.onPlay) ui.onPlay(ui.result && ui.result.solved ? onSolvedPlayEnd : undefined); });
  $('puzzle-check').addEventListener('click', check);
  $('puzzle-continue').addEventListener('click', finish);
}

export function isPuzzleOpen() {
  return ui.open;
}

/** 퍼즐 열기. onClose(result)는 아이가 맞추고(문장을 한 번 더 들려준 뒤) 또는 정답 공개 후 계속하기를 눌렀을 때 호출 */
export function openPuzzle(cue, { onPlay, onClose } = {}) {
  closePuzzle();
  ui.open = true;
  ui.cue = cue;
  ui.answer = splitWords(cue.en);
  ui.wrongCount = 0;
  ui.locked = false;
  ui.result = null;
  ui.onPlay = onPlay || null;
  ui.onClose = onClose || null;

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
  ui.slots = {};
  const slots = [];
  for (const i of scrambleOrder(ui.answer)) {
    const slot = document.createElement('span');
    slot.className = 'puzzle-slot';
    slot.appendChild(makeChip(ui.answer[i], i));
    bank.appendChild(slot);
    ui.slots[i] = slot;
    slots.push(slot);
  }
  for (const slot of slots) { // 조각 크기로 자리 크기 고정 (빈 자리도 같은 크기)
    const chip = slot.firstChild;
    if (chip.offsetWidth) { slot.style.width = `${chip.offsetWidth}px`; slot.style.height = `${chip.offsetHeight}px`; }
  }
  afterChange();
}

/** 조각을 단어 모음의 원래 자기 자리로 */
function returnToBank(chip) {
  const slot = ui.slots[chip.dataset.idx];
  if (slot && chip.parentNode !== slot) slot.appendChild(chip);
}

/** 결과 전달 없이 닫기 (플레이어를 닫을 때 등) */
export function closePuzzle() {
  if (!ui.open) return;
  ui.open = false;
  clearTimeout(ui.timer);
  ui.timer = null;
  if (ui.drag) { if (ui.drag.clone) ui.drag.clone.remove(); ui.drag = null; }
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
  ui.timer = setTimeout(finish, 700);
}

function finish() {
  if (!ui.open) return;
  const cb = ui.onClose;
  const result = ui.result || { solved: false, wrong: ui.wrongCount };
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
  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onCancel);
  return el;
}

/** 조각이 움직인 뒤: 확인 버튼 활성(단어를 다 놓았을 때), 빈 정답 칸 안내 */
function afterChange() {
  const ans = $('puzzle-answer');
  const bank = $('puzzle-bank');
  ans.classList.toggle('empty', ans.children.length === 0);
  $('puzzle-check').disabled = ui.locked || bank.querySelectorAll('.puzzle-chip').length > 0;
}

// ── 드래그 / 탭 ──
// HTML5 drag-and-drop은 안드로이드 터치에서 동작하지 않으므로 포인터 이벤트로 직접 구현.
// 잡은 조각은 반투명(ghost)으로 남기고 복제본이 손가락을 따라다니며, 조각 자체를 실시간으로 그 자리에 끼워 넣는다.

function onDown(e) {
  if (ui.locked || ui.drag) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const chip = e.currentTarget;
  const r = chip.getBoundingClientRect();
  ui.drag = {
    chip, id: e.pointerId, startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY,
    offX: e.clientX - r.left, offY: e.clientY - r.top, w: r.width, h: r.height, moved: false, clone: null, raf: 0,
  };
  try { chip.setPointerCapture(e.pointerId); } catch { /* 지원 안 하는 브라우저 */ }
  e.preventDefault();
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
  d.clone.style.transform = `translate(${d.x - d.offX}px, ${d.y - d.offY}px)`;
  if (!d.raf) d.raf = requestAnimationFrame(() => { d.raf = 0; if (ui.drag === d) placeAt(d); });
}

function onUp(e) {
  const d = ui.drag;
  if (!d || e.pointerId !== d.id) return;
  ui.drag = null;
  if (d.raf) cancelAnimationFrame(d.raf);
  if (d.moved) { placeAt(d); endDrag(d); } else tapChip(d.chip);
  afterChange();
}

function onCancel(e) {
  const d = ui.drag;
  if (!d || e.pointerId !== d.id) return;
  ui.drag = null;
  if (d.raf) cancelAnimationFrame(d.raf);
  if (d.moved) endDrag(d);
  afterChange();
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
}

function endDrag(d) {
  if (d.clone) d.clone.remove();
  d.clone = null;
  d.chip.classList.remove('ghost');
}

/** 탭: 단어 모음에 있으면 정답 칸 끝에, 정답 칸에 있으면 단어 모음의 원래 자리로 */
function tapChip(chip) {
  if (ui.locked) return;
  chip.classList.remove('bad');
  const ans = $('puzzle-answer');
  const bank = $('puzzle-bank');
  if (bank.contains(chip)) ans.appendChild(chip);
  else returnToBank(chip);
}

/** 손가락 위치에 따라 조각을 정답 칸의 알맞은 자리(또는 단어 모음)로 옮김 — 드래그 중 실시간 */
function placeAt(d) {
  const ans = $('puzzle-answer');
  const bank = $('puzzle-bank');
  const ar = ans.getBoundingClientRect();
  const br = bank.getBoundingClientRect();
  // 정답 칸과 단어 모음 사이 중간선 기준: 위쪽이면 정답 칸, 아래쪽이면 단어 모음 (어디에 떨어뜨려도 둘 중 하나)
  const mid = (ar.bottom + br.top) / 2;
  if (d.y >= mid) {
    returnToBank(d.chip); // 단어 모음 쪽이면 원래 자리로
    return;
  }
  // 정답 칸: 손가락보다 "뒤"에 있는 첫 조각(아랫줄이거나, 같은 줄에서 오른쪽) 앞에 끼움
  let ref = null;
  for (const c of Array.from(ans.children)) {
    if (c === d.chip) continue;
    const r = c.getBoundingClientRect();
    if (d.y < r.top || (d.y <= r.bottom && d.x < r.left + r.width / 2)) { ref = c; break; }
  }
  if (d.chip.parentNode === ans && d.chip.nextSibling === ref) return; // 이미 그 자리
  ans.insertBefore(d.chip, ref);
}

// ── 판정 ──

function check() {
  if (ui.locked || !ui.open) return;
  const ans = $('puzzle-answer');
  const chips = Array.from(ans.children);
  const placed = chips.map((c) => c.textContent);
  const res = checkOrder(placed, ui.answer);
  const root = $('puzzle');

  if (res.correct) {
    ui.locked = true;
    ui.result = { solved: true, wrong: ui.wrongCount };
    chips.forEach((c) => c.classList.add('ok'));
    root.classList.add('solved');
    setMsg(ui.wrongCount === 0 ? '🎉 정답이에요! 한 번에 맞췄어요! 🔊' : '🎉 정답이에요! 🔊');
    afterChange();
    // 맞춘 문장을 한 번 더 들려주고(각인), 재생이 끝나면 닫힘. 재생이 안 되는 경우를 대비한 안전망 타이머
    if (ui.onPlay) {
      ui.onPlay(onSolvedPlayEnd);
      ui.timer = setTimeout(finish, 12000);
    } else {
      ui.timer = setTimeout(finish, 1500);
    }
    return;
  }

  ui.wrongCount++;
  chips.forEach((c, i) => c.classList.toggle('bad', !!res.wrong[i]));
  root.classList.remove('shake');
  void root.offsetWidth; // 애니메이션 재시작
  root.classList.add('shake');

  if (ui.wrongCount >= PUZZLE_MAX_WRONG) {
    ui.locked = true;
    ui.result = { solved: false, wrong: ui.wrongCount };
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
  setMsg(`🤔 조금 달라요. 빨간 단어를 옮겨봐요! (${ui.wrongCount}/${PUZZLE_MAX_WRONG})`);
}
