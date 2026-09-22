// 🔁 복습 (간격 반복): 배운 문장을 며칠에 걸쳐 다시 물어본다
//
// 왜 필요한가: 지금까지는 문장이 한 번 지나가면 끝이라 며칠 뒤엔 대부분 잊는다.
// 라이트너 박스 방식으로 "맞히면 간격을 늘리고, 못 하면 줄여서" 다시 만나게 한다.
//
// 이 파일 앞부분은 순수 로직(테스트 대상)이고, 뒷부분은 오버레이 UI다.

// ── 규칙 ──

/** box 단계별 "다음 복습까지 며칠" (box 0 → 1일 뒤, 1 → 2일 뒤 …) */
export const REVIEW_INTERVALS = [1, 2, 4, 7, 14];
/** box가 이 값이 되면 👑 졸업 — 복습 큐에서 빠진다 */
export const GRADUATED = REVIEW_INTERVALS.length; // 5
/** 문장 성장 단계 아이콘 (box 0~5) */
export const STAGES = ['🥚', '🐣', '🐥', '⭐', '🏅', '👑'];
/** 한 회차에 낼 문장 수 (⚙에서 조절, 기본 3 — 짧아야 아이가 시작한다) */
export const DEFAULT_COUNT = 3;
/** 복습 보상 */
export const REWARD = {
  xp: 8,          // 문장 하나 통과
  coin: 3,
  bonusXp: 30,    // 회차 완주
  bonusCoin: 10,
  hp: 15,         // 파트너 HP 회복 (물약 없이 회복하는 유일한 공짜 수단)
  golden: 1,      // 🌟 황금 몬스터볼 — 하루 1개만, 복습에서만 나온다
  stone: 1,       // 🔶 영어스톤 — 회차 완주마다 (복습은 밀린 문장이 있을 때만 열려 유한)
};
/** 말하기를 몇 번 미달하면 넘어가는지 (복습은 짧게 끝나야 하므로 평소 3번보다 적게) */
export const MAX_FAILS = 2;

/** "YYYY-MM-DD"에 n일 더하기 (로컬 날짜 기준) */
export function addDays(dateKey, n) {
  const [y, m, d] = String(dateKey).split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + n);
  const p = (v) => String(v).padStart(2, '0');
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}

/** 두 날짜 키의 차이(일). a가 b보다 과거면 양수 */
export function daysBetween(a, b) {
  const toDate = (k) => { const [y, m, d] = String(k).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
  return Math.round((toDate(b) - toDate(a)) / 86400000);
}

/** box 단계 → 다음 복습 날짜 */
export function nextDue(box, today) {
  const b = Math.max(0, Math.min(box, REVIEW_INTERVALS.length - 1));
  return addDays(today, REVIEW_INTERVALS[b]);
}

/** 문장을 처음 복습 큐에 넣을 때 (완료한 다음 날부터) */
export function enroll(today) {
  return { box: 0, dueAt: addDays(today, REVIEW_INTERVALS[0]) };
}

/**
 * 복습 결과 → 다음 상태
 *  - 통과: box+1 (GRADUATED에 닿으면 👑 졸업, 더 안 나옴)
 *  - 미달: box-1 (0 아래로는 안 감) → 내일 다시
 */
export function schedule(box, passed, today) {
  const cur = Math.max(0, Number(box) || 0);
  if (passed) {
    const next = Math.min(cur + 1, GRADUATED);
    if (next >= GRADUATED) return { box: GRADUATED, dueAt: '' }; // 졸업 — dueAt 없음
    return { box: next, dueAt: nextDue(next, today) };
  }
  const next = Math.max(0, cur - 1);
  return { box: next, dueAt: addDays(today, 1) };
}

/** 이 문장이 오늘 복습 대상인가 */
export function isDue(rec, today) {
  if (!rec || !rec.dueAt) return false;
  if ((rec.box || 0) >= GRADUATED) return false;
  return rec.dueAt <= today;
}

/** 문장의 성장 단계 아이콘 */
export function stageIcon(rec) {
  const box = Math.max(0, Math.min((rec && rec.box) || 0, GRADUATED));
  return STAGES[box];
}

/**
 * 오늘 낼 복습 문장 고르기.
 * 우선순위: ① 그냥 넘긴 문장 ② box 낮은 것 ③ 발음 점수 낮은 것 ④ 오래 밀린 것 ⑤ 앞 문장
 * (넘긴 문장 = 말하기 3번 미달로 통과된 적이 있는 문장 — 가장 안 되는 문장이므로 먼저 본다)
 */
export function pickReviews(records, today, count = DEFAULT_COUNT) {
  const due = (records || []).filter((r) => isDue(r, today));
  const score = (r) => ({
    skipped: (r.speakSkipped || 0) > 0 ? 0 : 1,
    box: r.box || 0,
    ratio: r.bestRatio || 0,
    late: -daysBetween(r.dueAt, today), // 오래 밀릴수록 앞으로
    start: r.start || 0,
  });
  due.sort((a, b) => {
    const x = score(a);
    const y = score(b);
    return x.skipped - y.skipped || x.box - y.box || x.ratio - y.ratio || x.late - y.late || x.start - y.start;
  });
  return due.slice(0, Math.max(0, count));
}

/** 한 회차에 단어 문항을 최대 몇 개 넣을지 (문장이 주, 단어는 보조) */
export const MAX_WORD_ITEMS = 1;
/** 단어를 복습 큐에 넣는 기준: 아이가 이만큼 본 단어 */
export const WORD_MIN_VIEWS = 2;

/**
 * 🔤 오늘 낼 단어 고르기 — 아이가 여러 번 본 단어부터.
 * 문장과 같은 라이트너 규칙을 쓰되, 아직 복습에 들어오지 않은 단어(dueAt 없음)는
 * 여기서 바로 처음 출제한다 (단어는 "완료" 시점이 따로 없으므로).
 */
export function isWordDue(r, today) {
  if (!r || !r.word || !r.meaning) return false;
  if ((r.box || 0) >= GRADUATED) return false;
  if ((r.views || 0) < WORD_MIN_VIEWS) return false;
  return !r.dueAt || r.dueAt <= today; // 처음 보는 단어이거나, 때가 된 단어
}

/** 단어 복습 현황 — 출제와 같은 자격으로 센다 (📊가 실제 후보와 어긋나지 않게, Codex #7) */
export function wordSummary(records, today) {
  let due = 0;
  let graduated = 0;
  (records || []).forEach((r) => {
    if (!r || !r.word) return;
    if ((r.box || 0) >= GRADUATED) { graduated++; return; }
    if (isWordDue(r, today)) due++;
  });
  return { due, graduated };
}

export function pickWordReviews(records, today, count = MAX_WORD_ITEMS) {
  const pool = (records || []).filter((r) => isWordDue(r, today));
  pool.sort((a, b) => {
    const boxA = a.box || 0;
    const boxB = b.box || 0;
    if (boxA !== boxB) return boxA - boxB;               // 덜 익은 것 먼저
    const tapA = (a.taps || 0) > 0 ? 0 : 1;
    const tapB = (b.taps || 0) > 0 ? 0 : 1;
    if (tapA !== tapB) return tapA - tapB;               // 직접 눌러 찾아본 단어 먼저
    return (b.views || 0) - (a.views || 0);              // 자주 본 것 먼저
  });
  return pool.slice(0, Math.max(0, count));
}

/**
 * 4지선다 보기 만들기 — 정답 + 다른 단어의 뜻 3개.
 * 뜻이 같은 보기는 빼고(정답이 둘이 되지 않게), 모자라면 있는 만큼만.
 */
export function quizChoices(answer, others, rng = Math.random) {
  // "조심해!"와 "조심해"는 아이에게 같은 뜻이다 — 표기만 다른 보기를 오답으로 내면
  // 정답을 알고도 틀렸다고 나온다 (Codex #3). 비교는 정규화해서, 화면에는 원문 그대로.
  const key = (m) => String(m).replace(/[\s!?.,~…'"()\[\]]/g, '');
  const seen = new Set([key(answer.meaning)]);
  const wrong = [];
  const pool = (others || []).filter((r) => r && r.meaning && r.word !== answer.word);
  // 섞어서 앞에서부터 (같은 뜻·같은 표기는 제외)
  const idx = pool.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = idx[i]; idx[i] = idx[j]; idx[j] = t;
  }
  for (const i of idx) {
    const m = String(pool[i].meaning);
    const k = key(m);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    wrong.push(m);
    if (wrong.length >= 3) break;
  }
  const all = [String(answer.meaning), ...wrong];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = all[i]; all[i] = all[j]; all[j] = t;
  }
  return all;
}

/** 복습 큐 현황 (📊·시작 화면 표시용) */
export function reviewSummary(records, today) {
  let dueCount = 0;
  let waiting = 0;
  let graduated = 0;
  (records || []).forEach((r) => {
    if ((r.box || 0) >= GRADUATED) { graduated++; return; }
    if (!r.dueAt) return;
    if (r.dueAt <= today) dueCount++;
    else waiting++;
  });
  return { dueCount, waiting, graduated };
}

/**
 * 이번 회차에 줄 보상.
 * 🌟 황금 볼만 **하루 한 개** — 복습에서만 나오는 특별한 것이라 여러 개면 의미가 없다.
 * ⚡·💰·❤️ 회복은 회차마다 준다: 복습을 하루에 여러 번 하게 바꿨으므로(2026-09-18)
 * 두 번째부터 빈손이면 아이가 "왜 또 해?"가 된다. 회복량은 회차당 15로 작고,
 * 복습은 밀린 문장이 있을 때만 열리므로 무한정 회복되지는 않는다.
 */
export function roundReward(alreadyRewardedToday) {
  if (alreadyRewardedToday) {
    return { xp: REWARD.bonusXp, coin: REWARD.bonusCoin, hp: REWARD.hp, golden: 0, first: false, stone: REWARD.stone };
  }
  return { xp: REWARD.bonusXp, coin: REWARD.bonusCoin, hp: REWARD.hp, golden: REWARD.golden, first: true, stone: REWARD.stone };
}

// ── 화면 ──
import { checkBlank as dictCheck } from './dictation.js';

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 화면이 다시 켜질 때까지 기다림 */
function whenVisible() {
  return new Promise((resolve) => {
    const on = () => {
      if (document.hidden) return;
      document.removeEventListener('visibilitychange', on);
      resolve();
    };
    document.addEventListener('visibilitychange', on);
  });
}

/**
 * 다음 문항으로 자동으로 넘어가기 전 대기 — **화면이 꺼져 있으면 돌아올 때까지 멈춘다**.
 * 잠긴 태블릿에서 복습이 혼자 넘어가면 아이가 못 보고 지나치고, 소리도 주머니 속에서 난다.
 * 🧩 퍼즐·🎯 잡기는 이미 같은 규칙(pendingAuto) — 복습만 빠져 있었다.
 */
function settle(ms) {
  return sleep(ms).then(() => (document.hidden ? whenVisible() : undefined));
}
const ui = { open: false, run: 0, o: null, i: 0, fails: 0, passed: 0, started: false, granted: false, reward: null, busy: false, speakStop: null, blankAt: 0, dictWrong: 0 };

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

export function initReview() {
  // 시작은 한 번만 — 아이가 버튼을 빠르게 두 번 눌러도 문장이 겹쳐 진행되지 않게
  $('review-start').addEventListener('click', () => {
    if (!ui.open || ui.started) return;
    ui.started = true;
    if (ui.o && ui.o.unlock) ui.o.unlock();
    runNext();
  });
  $('review-later').addEventListener('click', () => finish({ started: false }));
  $('review-continue').addEventListener('click', () => finish({ started: true }));
  $('review-speak-done').addEventListener('click', () => { if (ui.speakStop) ui.speakStop(); });
  $('review-dict-listen').addEventListener('click', () => {
    const it = ui.o && ui.o.items[ui.i];
    if (it && it.type === 'dictation' && ui.o.onPlay) ui.o.onPlay(it.cue);
  });
}

export function isReviewOpen() {
  return ui.open;
}

/**
 * 복습 회차 열기
 * @param {object} o
 * @param {Array<{cue:object, rec:object}>} o.items 이번에 낼 문장들
 * @param {{golden:number, hp:number, xp:number, coin:number}} o.reward 완주하면 받을 것 (미리 보여줌)
 * @param {{url:string, ko:string, look:object}|null} o.partner 시작 화면에 세울 파트너
 * @param {number} o.waiting 아직 때가 안 된 복습 문장 수 (안내용)
 * @param {boolean} [o.practice] 연습 (기록·보상 없음)
 * @param {(cue:object, hooks:object) => Promise<object>} o.speak 문장 들려주고 따라 말하기
 * @param {(cue:object, passed:boolean) => object} o.onSentence 문장 하나 끝날 때마다 (기록·XP) → { box, graduated }
 * @param {(summary:{started:boolean, done:number, passed:number, finished:boolean}) => void} o.onDone
 */
export function openReview(o) {
  closeReview();
  ui.open = true;
  ui.run++;
  ui.o = o;
  ui.i = 0;
  ui.fails = 0;
  ui.passed = 0;
  ui.started = false;
  ui.granted = false;
  ui.reward = null;
  ui.busy = false;
  ui.speakStop = null;

  const nWord = o.items.filter((it) => it.type === 'word').length;
  const nDict = o.items.filter((it) => it.type === 'dictation').length;
  const nSent = o.items.length - nWord - nDict;
  $('review-title').textContent = o.practice ? '🔁 복습 연습' : '🔁 오늘의 복습';
  // 받아쓰기도 문장 복습의 한 종류라 문장으로 함께 센다 (아이에게는 "문장 2개"가 자연스럽다)
  const sentTotal = nSent + nDict;
  $('review-msg').textContent = nWord
    ? `배운 문장 ${sentTotal}개와 단어 ${nWord}개를 다시 만나요`
    : `배운 문장 ${sentTotal}개를 다시 만나요`;
  const rw = $('review-reward');
  rw.innerHTML = '';
  if (o.practice) {
    rw.appendChild(el('span', 'review-chip', '연습이라 기록이 남지 않아요'));
  } else {
    if (o.reward.golden) rw.appendChild(el('span', 'review-chip gold', '🌟 황금 몬스터볼 1개'));
    if (o.reward.hp) rw.appendChild(el('span', 'review-chip hp', `❤️ 파트너 +${o.reward.hp}`));
    rw.appendChild(el('span', 'review-chip', `⚡+${o.reward.xp} 💰+${o.reward.coin}`));
    if (!o.reward.golden) rw.appendChild(el('span', 'review-chip dim', '🌟 황금 볼은 오늘 이미 받았어요'));
  }
  const fig = $('review-partner-fig');
  if (o.partner && o.partner.url && o.setFigure) {
    o.setFigure(fig, o.partner.url, o.partner.look);
    fig.hidden = false;
  } else fig.hidden = true;
  $('review-note').textContent = o.waiting
    ? `다른 ${o.waiting}문장은 아직 쉬는 중이에요 (며칠 뒤에 다시 만나요)`
    : '맞히면 다음에 더 늦게, 못 하면 내일 또 만나요';

  $('review-intro').hidden = false;
  $('review-stage').hidden = true;
  $('review-dict').hidden = true;
  $('review-dict-listen').hidden = true;
  const ch = $('review-choices');
  ch.hidden = true;
  ch.dataset.done = '';
  $('review-speak').hidden = true;
  $('review-done').hidden = true;
  $('review-continue').hidden = true;
  $('review').hidden = false;
}

export function closeReview() {
  if (!ui.open) return;
  ui.open = false;
  ui.run++;
  if (ui.speakStop) { try { ui.speakStop('cancel'); } catch (e) { /* 무시 */ } ui.speakStop = null; }
  $('review').hidden = true;
  ui.o = null;
}

/** 복습 중 강제로 닫힘 (콘텐츠 닫기 등) — 여기까지 한 것은 이미 기록돼 있다 */
export function abortReview() {
  if (!ui.open) return;
  const o = ui.o;
  const summary = { started: ui.started, done: ui.i, passed: ui.passed, finished: ui.granted };
  closeReview();
  if (o && o.onDone) o.onDone(summary);
}

function finish(patch) {
  if (!ui.open) return;
  const o = ui.o;
  const summary = { started: ui.started, done: ui.i, passed: ui.passed, finished: ui.granted, ...patch };
  closeReview();
  if (o && o.onDone) o.onDone(summary);
}

/** 진행 점 ●●○ */
function renderDots() {
  const box = $('review-dots');
  box.innerHTML = '';
  ui.o.items.forEach((_, k) => {
    box.appendChild(el('span', 'review-dot' + (k < ui.i ? ' done' : k === ui.i ? ' now' : '')));
  });
}

/** 다음 문장으로 (없으면 완주 화면) */
async function runNext() {
  const o = ui.o;
  if (!o) return;
  $('review-intro').hidden = true;
  if (ui.i >= o.items.length) { showDone(); return; }
  ui.fails = 0;
  const kind = o.items[ui.i].type;
  if (kind === 'word') { askWord(); return; }            // 🔤 뜻 맞히기
  if (kind === 'dictation') { askDictation(); return; }  // ✍️ 듣고 빈칸 채우기
  await askSentence();
}

/**
 * ✍️ 받아쓰기 문항: 문장을 거의 다 보여주고 한두 칸만 비운 뒤, 소리를 듣고 그 칸을 채운다.
 * 빈칸이 둘이면 앞에서부터 하나씩. 문장은 자동으로 한 번 들려주고, 🔊로 다시 들을 수 있다.
 */
function askDictation() {
  const o = ui.o;
  const item = o.items[ui.i];
  ui.busy = true;
  ui.blankAt = 0;
  ui.dictWrong = 0;

  $('review-speak').hidden = true;
  const stage = $('review-stage');
  stage.hidden = false;
  renderDots();
  $('review-stage-icon').textContent = stageIcon(item.rec);
  $('review-count').textContent = `${ui.i + 1} / ${o.items.length}`;
  $('review-ko').textContent = '🔊 잘 듣고 빈칸을 채워요';
  $('review-en').hidden = true; // 문장은 아래 빈칸 줄로 보여준다
  $('review-feedback').textContent = '';
  $('review-feedback').className = 'review-feedback';

  renderDictLine(item);
  renderDictChoices(item);
  $('review-dict-listen').hidden = false;
  if (o.onPlay) o.onPlay(item.cue); // 한 번 들려주기
}

/** 빈칸이 뚫린 문장 줄 */
function renderDictLine(item) {
  const box = $('review-dict');
  box.innerHTML = '';
  box.hidden = false;
  item.words.forEach((w, i) => {
    const b = item.blanks.find((x) => x.index === i);
    if (!b) { box.appendChild(el('span', 'dict-word', w)); return; }
    const filled = b.filled;
    const span = el('span', `dict-blank${filled ? (b.ok ? ' ok' : ' bad') : ''}${!filled && item.blanks[ui.blankAt] === b ? ' now' : ''}`, filled || '＿＿');
    box.appendChild(span);
  });
}

/** 지금 채울 빈칸의 보기 */
function renderDictChoices(item) {
  const box = $('review-choices');
  box.innerHTML = '';
  box.dataset.done = '';
  const b = item.blanks[ui.blankAt];
  if (!b) { box.hidden = true; return; }
  box.hidden = false;
  for (const choice of b.choices) {
    const btn = el('button', 'review-choice dict', choice);
    btn.type = 'button';
    btn.addEventListener('click', () => pickBlankChoice(btn, choice, item, b));
    box.appendChild(btn);
  }
}

/** 빈칸 하나를 채움 → 맞으면 다음 칸, 다 채우면 결과 */
async function pickBlankChoice(btn, choice, item, blank) {
  const run = ui.run;
  const alive = () => ui.open && ui.run === run;
  const o = ui.o;
  const box = $('review-choices');
  if (box.dataset.done === '1') return; // 연타 방지
  box.dataset.done = '1';

  const ok = dictCheck(blank, choice);
  blank.filled = choice;
  blank.ok = ok;
  if (!ok) ui.dictWrong++;
  [...box.children].forEach((c) => {
    c.disabled = true;
    if (dictCheck(blank, c.textContent)) c.classList.add('right');
  });
  if (!ok) btn.classList.add('wrong');
  if (o.sfx) (ok ? o.sfx.ding() : o.sfx.wrong());
  renderDictLine(item);

  const fb = $('review-feedback');
  fb.className = `review-feedback ${ok ? 'good' : 'bad'}`;
  fb.textContent = ok ? '🎯 맞았어요!' : `👍 괜찮아요 — 정답은 "${blank.answer}"`;

  await settle(ok ? 1000 : 1900);
  if (!alive()) return;

  ui.blankAt++;
  if (ui.blankAt < item.blanks.length) { // 다음 빈칸
    fb.textContent = '';
    fb.className = 'review-feedback';
    renderDictLine(item);
    renderDictChoices(item);
    if (o.onPlay) o.onPlay(item.cue); // 다음 칸을 위해 한 번 더 들려주기
    return;
  }
  await settleDictation(item);
}

/** 받아쓰기 문항 끝: 다 맞았으면 통과 */
async function settleDictation(item) {
  const run = ui.run;
  const alive = () => ui.open && ui.run === run;
  const o = ui.o;
  const passed = ui.dictWrong === 0;
  $('review-choices').hidden = true;
  $('review-dict-listen').hidden = true;

  const info = o.onDictation ? o.onDictation(item, passed) : null;
  ui.i++;
  if (passed) ui.passed++;
  if (info && !info.graduated && passed) {
    $('review-stage-icon').textContent = stageIcon({ box: info.box });
    $('review-stage-icon').classList.add('up');
  }
  if (ui.i >= o.items.length && !ui.granted) {
    ui.granted = true;
    ui.reward = (o.onFinished && await o.onFinished()) || null;
  }
  await settle(1500);
  if (!alive()) return;
  $('review-stage-icon').classList.remove('up');
  $('review-dict').hidden = true;
  await runNext();
}

/** 🔤 단어 문항: 영어 단어를 보여주고 뜻 4개 중에 고르기 */
function askWord() {
  const o = ui.o;
  const item = o.items[ui.i];
  ui.busy = true;

  $('review-speak').hidden = true;
  $('review-dict').hidden = true;
  $('review-dict-listen').hidden = true;
  const stage = $('review-stage');
  stage.hidden = false;
  renderDots();
  $('review-stage-icon').textContent = stageIcon(item.rec);
  $('review-count').textContent = `${ui.i + 1} / ${o.items.length}`;
  $('review-ko').textContent = '이 단어는 무슨 뜻일까요?';
  $('review-en').textContent = item.word;
  $('review-en').hidden = false;
  $('review-feedback').textContent = '';
  $('review-feedback').className = 'review-feedback';

  const box = $('review-choices');
  box.innerHTML = '';
  box.hidden = false;
  for (const choice of item.choices) {
    const b = el('button', 'review-choice', choice);
    b.type = 'button';
    b.addEventListener('click', () => pickChoice(b, choice, item));
    box.appendChild(b);
  }
}

/** 보기를 고름 → 맞으면 바로, 틀리면 정답을 보여주고 다음 */
async function pickChoice(btn, choice, item) {
  const run = ui.run;
  const alive = () => ui.open && ui.run === run;
  const o = ui.o;
  const box = $('review-choices');
  if (box.dataset.done === '1') return; // 연타 방지
  box.dataset.done = '1';

  const passed = choice === item.meaning;
  [...box.children].forEach((b) => {
    b.disabled = true;
    if (b.textContent === item.meaning) b.classList.add('right');
  });
  if (!passed) btn.classList.add('wrong');

  const fb = $('review-feedback');
  fb.className = `review-feedback ${passed ? 'good' : 'bad'}`;
  fb.textContent = passed ? '🎯 맞았어요!' : `👍 괜찮아요 — "${item.word}"는 ${item.meaning}`;
  if (o.sfx) (passed ? o.sfx.ding() : o.sfx.wrong());

  const info = o.onWord ? o.onWord(item, passed) : null;
  ui.i++;
  if (passed) ui.passed++;
  if (info && !info.graduated && passed) {
    $('review-stage-icon').textContent = stageIcon({ box: info.box });
    $('review-stage-icon').classList.add('up');
  }
  if (ui.i >= o.items.length && !ui.granted) {
    ui.granted = true;
    ui.reward = (o.onFinished && await o.onFinished()) || null;
  }
  await settle(passed ? 1500 : 2400);
  if (!alive()) return;
  $('review-stage-icon').classList.remove('up');
  box.hidden = true;
  box.dataset.done = '';
  await runNext();
}

/** 문장 하나: 한글 뜻 → 🔊 듣기 → 🎤 따라 말하기 → 결과 */
async function askSentence() {
  const run = ui.run;
  const alive = () => ui.open && ui.run === run;
  const o = ui.o;
  const { cue, rec } = o.items[ui.i];
  ui.busy = true;

  const stage = $('review-stage');
  stage.hidden = false;
  $('review-choices').hidden = true;
  $('review-dict').hidden = true;
  $('review-dict-listen').hidden = true;
  renderDots();
  $('review-stage-icon').textContent = stageIcon(rec);
  $('review-count').textContent = `${ui.i + 1} / ${o.items.length}`;
  $('review-ko').textContent = cue.ko || '';
  $('review-en').textContent = cue.en;
  $('review-en').hidden = ui.fails < MAX_FAILS; // 두 번 못 하면 글자를 보여준다
  $('review-feedback').textContent = '';
  $('review-feedback').className = 'review-feedback';

  const sp = $('review-speak');
  sp.hidden = false;
  $('review-speak-status').textContent = '🔊 잘 듣고 따라 말해요…';
  $('review-speak-done').textContent = '⏭ 듣기 건너뛰기';

  let result = null;
  try {
    result = await o.speak(cue, {
      onInterim: (t) => { $('review-speak-status').textContent = `🗣 ${t}`; },
      onListening: () => { $('review-speak-status').textContent = '🎤 지금 따라 말해요!'; $('review-speak-done').textContent = '다 말했어요 ✓'; },
      onLevel: (level, spokenMs) => { if (spokenMs > 300) $('review-speak-status').textContent = '🗣 듣고 있어요…'; },
      register: (stop) => { ui.speakStop = stop; },
    });
  } catch (e) { result = null; }
  // 내 회차가 아니면 speakStop을 건드리지 않는다 — 새 회차가 등록해 둔 것을 지우면
  // 아이가 "다 말했어요 ✓"를 눌러도 아무 일도 안 일어난다 (essay.js는 이 순서로 되어 있다)
  if (!alive()) return;
  ui.speakStop = null;
  sp.hidden = true;

  // 화면이 꺼져서 끊긴 문장은 없던 것으로 (복귀하면 같은 문장을 다시)
  if (result && result.method === 'interrupted') {
    $('review-feedback').textContent = '📵 잠깐 멈췄어요 — 이 문장을 다시 해요';
    await settle(1200);
    if (!alive()) return;
    await askSentence();
    return;
  }

  const passed = !!(result && (result.passed || result.method === 'none')); // 마이크를 못 쓰는 기기는 통과로
  if (!passed && ui.fails + 1 < MAX_FAILS) {
    ui.fails++;
    $('review-feedback').className = 'review-feedback bad';
    $('review-feedback').textContent = result && result.transcript
      ? `들린 말: "${result.transcript}" — 한 번 더!`
      : '잘 안 들렸어요 — 한 번 더!';
    await settle(1400);
    if (!alive()) return;
    await askSentence();
    return;
  }

  await settleSentence(cue, passed, result);
}

/** 문장 결과 확정: 기록하고 단계 변화를 보여준 뒤 다음 문장 */
async function settleSentence(cue, passed, result) {
  const run = ui.run;
  const alive = () => ui.open && ui.run === run;
  const o = ui.o;
  const info = o.onSentence ? o.onSentence(cue, passed) : null;
  // 문장 확정과 완주 보상은 결과 애니메이션보다 먼저 — 아이가 마지막 문장을 말한 직후
  // 앱을 닫아도 회차가 완주로 남고 보상을 잃지 않게 (Codex #4)
  ui.i++;
  if (ui.i >= o.items.length && !ui.granted) {
    ui.granted = true;
    ui.reward = (o.onFinished && await o.onFinished()) || null;
  }

  $('review-en').hidden = false; // 결과에서는 영어를 보여준다 (들린 말과 비교)
  const fb = $('review-feedback');
  if (passed) {
    ui.passed++;
    fb.className = 'review-feedback good';
    const heard = result && result.transcript ? ` "${result.transcript}"` : '';
    fb.textContent = info && info.graduated
      ? `👑 이 문장은 이제 완전히 내 것! ${heard}`
      : `🎯 잘했어요!${heard}`;
    if (info && !info.graduated) {
      $('review-stage-icon').textContent = stageIcon({ box: info.box });
      $('review-stage-icon').classList.add('up');
    }
    if (o.sfx) o.sfx.ding();
  } else {
    fb.className = 'review-feedback bad';
    fb.textContent = '👍 괜찮아요 — 내일 또 만나요';
    if (o.sfx) o.sfx.wrong();
  }
  await settle(passed ? 1600 : 1900);
  if (!alive()) return;
  $('review-stage-icon').classList.remove('up');
  await runNext();
}

/** 완주 화면 */
function showDone() {
  const o = ui.o;
  ui.busy = false;
  $('review-stage').hidden = true;
  $('review-speak').hidden = true;
  $('review-choices').hidden = true;
  $('review-dict').hidden = true;
  $('review-dict-listen').hidden = true;
  const box = $('review-done');
  box.innerHTML = '';
  box.hidden = false;
  box.appendChild(el('div', 'review-done-title', '🎉 복습 끝!'));
  const total = o.items.length;
  const hasWord = o.items.some((it) => it.type !== 'sentence');
  box.appendChild(el('div', 'review-done-sub', hasWord
    ? `${total}개 중 ${ui.passed}개를 맞혔어요`
    : `${total}문장 중 ${ui.passed}문장을 잘 말했어요`));
  // 보상은 마지막 문장을 확정할 때 이미 지급됐다 (settleSentence) — 여기서는 그 내용만 보여준다
  const given = ui.reward;
  if (!o.practice && given) {
    const rw = el('div', 'review-done-reward');
    if (given.golden) rw.appendChild(el('span', 'review-chip gold', '🌟 황금 몬스터볼 +1'));
    if (given.hp) rw.appendChild(el('span', 'review-chip hp', `❤️ +${given.hp}`));
    rw.appendChild(el('span', 'review-chip', `⚡+${given.xp} 💰+${given.coin}`));
    box.appendChild(rw);
    if (given.golden) box.appendChild(el('div', 'review-done-note', '황금 볼은 잡힐 확률이 2배! 🎯 잡기에서 써 봐요'));
  }
  $('review-continue').hidden = false;
}
