// 📊 학습 기록 화면 (부모용): 이번 주 요약, 콘텐츠별 진행률, 어려워한 문장, 복습 단어장, 최근 세션, 내보내기/가져오기
import {
  listItems, getAllSentenceStats, listSessions, listDaily, listVocabViews, exportStats, importStats,
  applyEssayFixes,
} from './db.js';
import { exportText, parseFixes } from './essay.js';
import { countPlayableCues } from './srt.js';
import { openPlayer } from './player.js';
import { todayKey, MASTER_RATIO, reloadDaily } from './track.js';
import { reviewSummary, wordSummary, stageIcon, GRADUATED } from './review.js';
import { reloadProfile, listRarityAsks, decideRarity, RARITY, inventory } from './xp.js';
import { pendingTickets } from './unlock.js';
import { restoreOffer, restoreFromMirror, lastFileBackup, markFileBackup, needsFileBackup, daysSince } from './backup.js';
import { ROSTER } from './pokemon.js';

const $ = (id) => document.getElementById(id);

// ───────────────────── 순수 계산 (테스트 가능) ─────────────────────

/** 초 → "1시간 20분" / "25분" / "40초" */
export function fmtDur(sec) {
  sec = Math.round(sec || 0);
  if (sec < 60) return `${sec}초`;
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h ? `${h}시간 ${m}분` : `${m}분`;
}

function fmtDate(ts) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function relDay(dateKey, today) {
  if (dateKey === today) return '오늘';
  const [y, m, d] = dateKey.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  const diff = Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(y, m - 1, d)) / 86400000);
  if (diff === 1) return '어제';
  return `${m}/${d}`;
}

/** 최근 7일(오늘 포함) 일별 학습 시간·문장 수 */
export function weekSeries(dailyList, today = todayKey()) {
  const byDate = new Map(dailyList.map((d) => [d.date, d]));
  const out = [];
  const [y, m, d] = today.split('-').map(Number);
  for (let i = 6; i >= 0; i--) {
    const dt = new Date(y, m - 1, d - i);
    const key = todayKey(dt);
    const rec = byDate.get(key);
    out.push({
      date: key, label: ['일', '월', '화', '수', '목', '금', '토'][dt.getDay()],
      seconds: rec ? rec.seconds : 0, sentences: rec ? rec.doneKeys.length : 0,
      speakAttempts: rec ? rec.speakAttempts : 0, speakPass: rec ? rec.speakPass : 0,
      puzzles: rec ? rec.puzzles || 0 : 0, puzzleSolved: rec ? rec.puzzleSolved || 0 : 0,
      reviewSentences: rec ? rec.reviewSentences || 0 : 0, reviewRounds: rec ? rec.reviewRounds || 0 : 0, isToday: i === 0,
    });
  }
  return out;
}

/** 어려워한 문장 점수: 3번 미달 통과·미달·낮은 점수·과다 반복 순으로 가중 */
export function hardScore(r) {
  let s = (r.speakSkipped || 0) * 3 + (r.speakFail || 0) * 1.5;
  if (r.speakAttempts > 0) s += (1 - (r.bestRatio || 0)) * 2;
  if (r.plays > 8) s += (r.plays - 8) * 0.15; // ∞ 반복이 기본이라 재생 횟수는 약한 신호로만
  return s;
}

export function hardSentences(records, limit = 10) {
  return records
    .filter((r) => (r.speakAttempts || 0) > 0 || (r.plays || 0) >= 12)
    .map((r) => ({ ...r, score: hardScore(r) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || b.lastAt - a.lastAt)
    .slice(0, limit);
}

/** 콘텐츠별 요약 */
export function contentSummary(items, records, cueCountOf) {
  return items.map((it) => {
    const rs = records.filter((r) => r.itemId === it.id);
    const total = cueCountOf(it);
    const done = rs.filter((r) => r.done).length;
    const mastered = rs.filter((r) => (r.bestRatio || 0) >= MASTER_RATIO).length;
    const seconds = rs.reduce((a, r) => a + (r.seconds || 0), 0);
    const attempts = rs.reduce((a, r) => a + (r.speakAttempts || 0), 0);
    const pass = rs.reduce((a, r) => a + (r.speakPass || 0), 0);
    const lastAt = rs.reduce((a, r) => Math.max(a, r.lastAt || 0), 0);
    return { id: it.id, title: it.title, broken: !!it.broken, total, done, mastered, seconds, attempts, pass, lastAt, pct: total ? Math.round((done / total) * 100) : 0 };
  });
}

// ───────────────────── 렌더링 ─────────────────────

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function card(title) {
  const c = el('section', 'stats-card');
  c.appendChild(el('h2', '', title));
  return c;
}

function cueCountOf(item) {
  let merge = true;
  try { merge = JSON.parse(localStorage.getItem('shincoach.settings') || '{}').mergeSentences !== false; } catch { /* 기본값 */ }
  return countPlayableCues(item.enText, { merge, duration: item.duration });
}

/**
 * 👨‍👩‍👦 부모용 도구: 아이 글을 복사해 나가고, 고쳐 온 글을 붙여넣어 앱에 되돌린다.
 * 태블릿과 PC 사이에 서버가 없으므로 "글자를 복사해 옮기는" 길을 만들어 둔다.
 */
let coachMsg = ''; // 적용 뒤 화면을 다시 그리므로, 안내 문구를 넘겨 받아 새 화면에 보여준다

/**
 * 아직 고쳐 주지 않은 글의 번호 (오래된 것이 [1]).
 * **오래된 순**이라 새 글을 써도 이미 매긴 번호가 밀리지 않는다 —
 * 화면을 사진 찍어 두고 나중에 붙여넣어도 번호가 맞는다.
 * @returns {Map<string, number>} id → 번호
 */
export function essayNumbers(essayDays) {
  const todo = collectTodo(essayDays);
  return new Map(todo.map((e, i) => [e.id, i + 1]));
}

function collectTodo(essayDays) {
  const days = [...(essayDays || [])].sort((a, b) => String(a.date).localeCompare(String(b.date))); // 오래된 날부터
  const todo = [];
  for (const d of days) for (const e of (d.essays || [])) if (e && e.id && e.written && !e.coachFix) todo.push(e);
  return todo;
}

/**
 * ✍️ 날짜별 에세이를 "아직 고쳐 줄 글" / "이미 고쳐 준 글" 한쪽만 남겨 돌려준다.
 * 날짜 묶음은 그대로 두고 그 안의 글만 고르며, 남는 글이 없는 날은 버린다.
 * @param {Array<{date:string, essays:Array}>} essayDays 날짜별 에세이
 * @param {boolean} fixed true = 고쳐 준 글만, false = 아직 안 고쳐 준 글만
 */
export function splitEssayDays(essayDays, fixed) {
  const out = [];
  for (const d of (essayDays || [])) {
    const essays = (d.essays || []).filter((e) => e && e.id && e.written && (fixed ? !!e.coachFix : !e.coachFix));
    if (essays.length) out.push({ date: d.date, essays });
  }
  return out;
}

/** 날짜 묶음 안의 글 수 */
export function countEssays(essayDays) {
  return (essayDays || []).reduce((a, d) => a + ((d && d.essays) ? d.essays.length : 0), 0);
}

/** 며칠 전인지 한 마디로 — '오늘' / '어제' / 'N일 전' */
export function agoLabel(dateKey, today) {
  if (!dateKey || !today) return '';
  if (dateKey === today) return '오늘';
  const [y, m, d] = String(dateKey).split('-').map(Number);
  const [ty, tm, td] = String(today).split('-').map(Number);
  const diff = Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(y, m - 1, d)) / 86400000);
  if (!Number.isFinite(diff) || diff <= 0) return '오늘';
  return diff === 1 ? '어제' : `${diff}일 전`;
}

/** 에세이 한 편 — 두 덩어리(📮 고쳐 주세요 / ✅ 이미 고쳐 준 글)가 같은 모양을 쓴다 */
function essayBox(e, no) {
  const box = el('div', 'stats-essay');
  if (no) box.appendChild(el('div', 'stats-essay-no', `[${no}] 고쳐 주세요`));
  box.appendChild(el('div', 'stats-essay-origin', `배운 문장: ${e.origin || ''}`));
  box.appendChild(el('div', 'stats-essay-mine', `✍️ ${e.written || ''}`));
  if (e.fixed && e.fixed !== e.written) box.appendChild(el('div', 'stats-essay-fixed', `✅ ${e.fixed}`));
  if (Array.isArray(e.notes) && e.notes.length) box.appendChild(el('div', 'stats-essay-notes', e.notes.join(' · ')));
  if (e.coachFix) {
    box.appendChild(el('div', 'stats-essay-coach', `👨‍👩‍👦 ${e.coachFix}${e.readAt ? ' (읽음)' : ' (아직 안 읽음)'}`));
  }
  return box;
}

function buildCoachTools(essayDays) {
  const wrap = el('div', 'stats-coach');
  const todo = collectTodo(essayDays); // 번호 순서 = 화면에 보이는 [번호]와 같다

  wrap.appendChild(el('p', 'stats-note', todo.length
    ? `아직 고쳐 주지 않은 글이 ${todo.length}개 있어요. 복사하거나 이 화면을 사진으로 찍어 보낸 뒤, 고친 글을 아래에 [번호] 줄로 넣으면 진우 화면에 나옵니다.`
    : '고쳐 주지 않은 글이 없어요. 새 글이 쌓이면 여기에 번호가 붙어요.'));

  const row = el('div', 'stats-coach-row');
  const copyBtn = el('button', 'btn', '📋 아이 글 복사');
  copyBtn.type = 'button';
  copyBtn.disabled = !todo.length;
  const area = el('textarea', 'stats-coach-box');
  area.placeholder = '여기에 고친 글을 붙여넣으세요 — 예)\n[1] I want to play with my brother at the park.\n[2] I can\'t believe I just got a new bicycle!';
  area.rows = 5;
  const applyBtn = el('button', 'btn btn-primary', '✍️ 고친 글 적용');
  applyBtn.type = 'button';
  const msg = el('p', 'stats-note', coachMsg);
  coachMsg = '';

  copyBtn.addEventListener('click', async () => {
    const { text } = exportText(todo); // 번호는 화면에 보이는 것과 같다 (오래된 글이 [1])
    let copied = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); copied = true; }
    } catch { /* 아래에서 직접 고르게 한다 */ }
    if (!copied) { area.value = text; area.select(); }
    msg.textContent = copied
      ? `복사했어요 (${todo.length}문장). 카톡·메모에 붙여넣어 PC로 보내세요.`
      : '복사가 막혀 있어요 — 아래 칸의 내용을 길게 눌러 복사하세요.';
  });

  applyBtn.addEventListener('click', async () => {
    // 번호는 화면에 보이는 것과 같은 순서(오래된 글이 [1]) — 따로 저장해 둘 필요가 없다
    const fixes = parseFixes(area.value, todo.map((e) => e.id));
    if (!fixes.length) { msg.textContent = '[번호] 로 시작하는 줄을 못 찾았어요. 예: [1] I want to ...'; return; }
    const n = await applyEssayFixes(fixes);
    if (!n) { msg.textContent = '해당하는 글을 못 찾았어요 (번호가 바뀌었을 수 있어요).'; return; }
    coachMsg = `${n}문장을 넣었어요. 진우가 앱을 열면 바로 보여요.`;
    area.value = '';
    renderStats();
  });

  row.appendChild(copyBtn);
  row.appendChild(applyBtn);
  wrap.appendChild(row);
  wrap.appendChild(area);
  wrap.appendChild(msg);
  return wrap;
}

export async function renderStats() {
  const main = $('stats-main');
  main.innerHTML = '';
  main.appendChild(el('p', 'stats-empty', '불러오는 중…'));
  const [items, records, sessions, daily, vocabViews] = await Promise.all([
    listItems(), getAllSentenceStats(), listSessions(30), listDaily(), listVocabViews(),
  ]);
  main.innerHTML = '';
  const today = todayKey();

  // 1) 이번 주 요약
  const week = weekSeries(daily, today);
  const wSec = week.reduce((a, d) => a + d.seconds, 0);
  const wDays = week.filter((d) => d.seconds > 0).length;
  const wSent = week.reduce((a, d) => a + d.sentences, 0);
  const wAtt = week.reduce((a, d) => a + d.speakAttempts, 0);
  const wPass = week.reduce((a, d) => a + d.speakPass, 0);
  const wPz = week.reduce((a, d) => a + d.puzzles, 0);
  const wPzOk = week.reduce((a, d) => a + d.puzzleSolved, 0);
  const wRv = week.reduce((a, d) => a + d.reviewSentences, 0);
  const rv = reviewSummary(records, today); // 🔁 복습 큐 현황 (전체 콘텐츠)
  const allSec = daily.reduce((a, d) => a + d.seconds, 0);

  // 0) 🛟 기록이 비어 있는데 사본이 있으면 — 되돌릴지는 **부모가** 정한다 (아이 화면엔 안 뜬다)
  renderRestoreOffer(main);
  renderBackupReminder(main);

  // 0) 🎟️ 아이가 산 영상 — 아빠가 파일을 넣어 줘야 볼 수 있다 (제일 위에, 놓치지 않게)
  const tickets = pendingTickets(inventory(), items).filter((t) => !t.delivered);
  if (tickets.length) {
    const c0 = card('🎟️ 넣어줘야 할 영상');
    c0.appendChild(el('p', 'stats-note', '아이가 코인으로 바꿨어요. 영상 파일을 태블릿에 넣어 주면 볼 수 있어요 (제목을 아래와 똑같이 해 주세요).'));
    for (const t of tickets) {
      const row = el('div', 'stats-row');
      row.appendChild(el('span', 'name', `${t.emoji} ${t.ko}`));
      row.appendChild(el('span', 'meta', `${t.en} · ${t.minutes}분 · ${t.sentences}문장`));
      c0.appendChild(row);
    }
    main.appendChild(c0);
  }

  const c1 = card('이번 주 (최근 7일)');
  const sum = el('div', 'stats-summary');
  const kpi = (v, l) => { const k = el('div', 'stats-kpi'); k.appendChild(el('div', 'v', v)); k.appendChild(el('div', 'l', l)); return k; };
  sum.appendChild(kpi(fmtDur(wSec), '학습 시간'));
  sum.appendChild(kpi(`${wDays}일`, '학습한 날'));
  sum.appendChild(kpi(`${wSent}문장`, '한 문장'));
  sum.appendChild(kpi(wAtt ? `${Math.round((wPass / wAtt) * 100)}%` : '-', `말하기 통과 (${wPass}/${wAtt})`));
  sum.appendChild(kpi(wPz ? `${Math.round((wPzOk / wPz) * 100)}%` : '-', `🧩 퍼즐 정답 (${wPzOk}/${wPz})`));
  sum.appendChild(kpi(`${wRv}문장`, '🔁 복습한 문장'));
  sum.appendChild(kpi(`${rv.dueCount}문장`, `🔁 오늘 복습할 것 (👑 ${rv.graduated} 완성)`));
  sum.appendChild(kpi(fmtDur(allSec), '전체 누적'));
  c1.appendChild(sum);
  const bars = el('div', 'stats-bars');
  const maxSec = Math.max(60, ...week.map((d) => d.seconds));
  for (const d of week) {
    const b = el('div', 'stats-bar' + (d.isToday ? ' today' : ''));
    b.appendChild(el('div', 'm', d.seconds ? fmtDur(d.seconds) : ''));
    const f = el('div', 'fill');
    f.style.height = `${Math.round((d.seconds / maxSec) * 60)}px`;
    b.appendChild(f);
    b.appendChild(el('div', 'd', d.label));
    bars.appendChild(b);
  }
  c1.appendChild(bars);
  main.appendChild(c1);

  // 2) 콘텐츠별
  const c2 = card('콘텐츠별 진행');
  const summ = contentSummary(items, records, cueCountOf);
  if (!summ.length) c2.appendChild(el('p', 'stats-empty', '아직 가져온 영상이 없어요'));
  for (const s of summ) {
    const wrap = el('div', 'stats-item');
    const row = el('div', 'stats-row');
    row.appendChild(el('span', 'name', s.title));
    row.appendChild(el('span', 'meta', s.broken
      ? '⚠️ 저장이 깨졌어요 — 다시 가져와 주세요 (기록은 남아 있어요)'
      : `${s.pct}% · ${s.done}/${s.total}문장 · ⭐${s.mastered}`));
    wrap.appendChild(row);
    const pg = el('div', 'stats-progress');
    const pf = el('div', 'fill'); pf.style.width = `${s.pct}%`; pg.appendChild(pf);
    wrap.appendChild(pg);
    wrap.appendChild(el('div', 'meta', `${fmtDur(s.seconds)} · 말하기 ${s.attempts ? Math.round((s.pass / s.attempts) * 100) + '%' : '-'} · 마지막: ${s.lastAt ? fmtDate(s.lastAt) : '-'}`));
    c2.appendChild(wrap);
  }
  main.appendChild(c2);

  // 3) 어려워한 문장
  const c3 = card('어려워한 문장 TOP 10 — 누르면 그 문장으로 이동');
  const hard = hardSentences(records, 10);
  if (!hard.length) c3.appendChild(el('p', 'stats-empty', '아직 말하기 확인 기록이 충분하지 않아요'));
  const titleOf = new Map(items.map((it) => [it.id, it.title]));
  for (const r of hard) {
    const d = el('div', 'stats-hard');
    // 🔁 복습 단계를 앞에 붙여 이 문장이 얼마나 자리 잡았는지 보이게 (🥚 처음 … 👑 완성)
    d.appendChild(el('div', 'en', `${r.dueAt || (r.box || 0) >= GRADUATED ? `${stageIcon(r)} ` : ''}${r.en}`));
    if (r.ko) d.appendChild(el('div', 'ko', r.ko));
    const why = [];
    if (r.speakSkipped) why.push(`3번 미달로 통과 ${r.speakSkipped}회`);
    if (r.speakFail) why.push(`미달 ${r.speakFail}회`);
    if (r.speakAttempts) why.push(`최고 점수 ${Math.round((r.bestRatio || 0) * 100)}%`);
    why.push(`재생 ${r.plays}회`);
    d.appendChild(el('div', 'why', `${titleOf.get(r.itemId) || ''} · ${why.join(' · ')}`));
    d.addEventListener('click', () => openPlayer(r.itemId, { startTime: r.start }));
    c3.appendChild(d);
  }
  main.appendChild(c3);

  // 3-1) 🎯 자주 놓치는 단어 — 따라 말하기에서 반복해서 안 나온 단어
  const missCount = Object.create(null); // 'constructor' 같은 단어가 상속 속성에 걸리지 않게
  for (const r of records) {
    const m = r.missed || {};
    for (const w of Object.keys(m)) {
      const n = m[w];
      if (!Number.isFinite(n)) continue;
      missCount[w] = (missCount[w] || 0) + n;
    }
  }
  const missTop = Object.keys(missCount).sort((a, b) => missCount[b] - missCount[a]).slice(0, 12);
  if (missTop.length) {
    const c3b = card('자주 놓치는 단어 — 따라 말할 때 안 들린 단어');
    const box = el('div', 'stats-missed');
    for (const w of missTop) {
      const chip = el('span', 'stats-missed-chip');
      chip.appendChild(el('b', '', w));
      chip.appendChild(el('span', 'n', ` ${missCount[w]}회`));
      box.appendChild(chip);
    }
    c3b.appendChild(box);
    c3b.appendChild(el('p', 'stats-note', '지금까지 음성 인식에 안 잡힌 누적 횟수예요(지금 발음이 나쁘다는 뜻은 아닙니다). 많이 나온 단어일수록 위에 오니, 같은 소리(th, r/l, 과거형 -ed)가 모이면 같이 연습해 보세요.'));
    main.appendChild(c3b);
  }

  // 3c) ✍️ 에세이 — 아이가 직접 쓴 문장 (부모가 보라고 남긴다)
  //   오랜만에 열었을 때 "어디부터 고쳐 줘야 하지"로 헤매지 않도록 두 덩어리로 나눈다:
  //   📮 고쳐 줄 글은 맨 위에 모아서(사진 한 장에 담기게), 이미 고쳐 준 글은 접어 둔다.
  const essayDays = daily
    .filter((d) => Array.isArray(d.essays) && d.essays.length)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  // 📮는 **오래된 날부터** — 번호가 오래된 글이 [1]이라 최신부터 그리면 [2][3][1] 순으로 보인다.
  //    고쳐 주는 순서도 묵은 글이 먼저다.
  const todoDays = splitEssayDays(essayDays, false).slice().reverse();
  // ★ 안 고쳐 준 글에는 날짜 제한을 두지 않는다 — 7일로 자르면 오랜만에 여신 날
  //   묵은 글이 화면에서 통째로 사라져 영영 고쳐 줄 수 없다. 자르는 건 끝난 글만.
  const doneDays = splitEssayDays(essayDays, true).slice(0, 7);
  if (todoDays.length || doneDays.length) {
    const todoCount = countEssays(todoDays);
    const doneCount = countEssays(doneDays);
    const cE = card(todoCount
      ? `✍️ 에세이 — 📮 고쳐 줄 글 ${todoCount}개`
      : '✍️ 에세이 — 다 고쳐 줬어요');
    // "언제 것까지 해 줬더라"에 직접 답하는 한 줄
    const lastDay = essayDays.find((d) => d.essays.some((e) => e && e.coachFix));
    cE.appendChild(el('p', 'stats-sub', lastDay
      ? `마지막으로 고쳐 준 글: ${lastDay.date} (${agoLabel(lastDay.date, today)})`
      : '아직 고쳐 준 글이 없어요'));

    // 아직 고쳐 주지 않은 글의 번호 — 화면에 그대로 보여 준다.
    // 복사 없이 **사진만 찍어 보내도** 번호가 남으므로 [번호] 줄로 되돌려 받을 수 있다.
    const todoNo = essayNumbers(todoDays);
    if (todoCount) {
      cE.appendChild(el('h3', 'stats-essay-head', '📮 여기까지만 사진으로 찍어 보내시면 돼요'));
      for (const d of todoDays) {
        cE.appendChild(el('p', 'stats-sub', d.date));
        for (const e of d.essays) cE.appendChild(essayBox(e, todoNo.get(e.id)));
      }
    }
    if (doneCount) {
      const det = el('details', 'stats-essay-done');
      det.appendChild(el('summary', '', `✅ 이미 고쳐 준 글 ${doneCount}개 — 눌러서 보기`));
      for (const d of doneDays) {
        det.appendChild(el('p', 'stats-sub', d.date));
        for (const e of d.essays) det.appendChild(essayBox(e, 0));
      }
      cE.appendChild(det);
    }
    cE.appendChild(buildCoachTools(todoDays));
    main.appendChild(cE);
  }

  // 3d) ⭐ 아이가 "등급이 이상해요" 하고 보낸 신청 (아이 화면에서는 바로 안 바뀐다)
  const asks = listRarityAsks();
  if (asks.length) {
    const cR = card(`⭐ 등급 바꿔달라는 신청 ${asks.length}개 — 진우가 보낸 것`);
    cR.appendChild(el('p', 'stats-note', '등급은 곧 잡기 확률이에요 (흔함 45% · 보통 30% · 희귀 15% · 전설 3%). 맞다고 생각되면 옮겨 주세요.'));
    // 하나씩 누르고 화면을 다시 내리는 게 번거로워서 일괄 처리를 위에 둔다
    const bulk = el('div', 'stats-ask-bulk');
    const allYes = el('button', 'btn btn-primary', `✅ ${asks.length}개 전부 옮겨 주기`);
    allYes.type = 'button';
    allYes.addEventListener('click', () => { for (const a of asks) decideRarity(a.id, true); renderStats(); });
    const allNo = el('button', 'btn', '전부 그대로 두기');
    allNo.type = 'button';
    allNo.addEventListener('click', () => { for (const a of asks) decideRarity(a.id, false); renderStats(); });
    bulk.appendChild(allYes);
    bulk.appendChild(allNo);
    cR.appendChild(bulk);
    for (const a of asks) {
      const mon = ROSTER.find((m) => m.id === a.id);
      const row = el('div', 'stats-ask');
      row.appendChild(el('div', 'stats-ask-name', `${mon ? mon.ko : '#' + a.id}`));
      row.appendChild(el('div', 'stats-ask-move', `${RARITY[a.from].stars} ${RARITY[a.from].label}  →  ${RARITY[a.to].stars} ${RARITY[a.to].label}`));
      const btns = el('div', 'stats-ask-btns');
      const yes = el('button', 'btn btn-primary', '옮겨 주기');
      yes.type = 'button';
      yes.addEventListener('click', () => { decideRarity(a.id, true); renderStats(); });
      const no = el('button', 'btn', '그대로 두기');
      no.type = 'button';
      no.addEventListener('click', () => { decideRarity(a.id, false); renderStats(); });
      btns.appendChild(no);
      btns.appendChild(yes);
      row.appendChild(btns);
      cR.appendChild(row);
    }
    main.appendChild(cR);
  }

  // 4) 복습 단어장
  const wordRv = wordSummary(vocabViews, today); // 🔤 출제와 같은 자격으로 센다 (Codex #7)
  const c4 = card(wordRv.due || wordRv.graduated
    ? `복습 단어장 — 아이가 찾아본 단어 (복습할 차례인 단어 ${wordRv.due}개 · 👑 ${wordRv.graduated}개 완성)`
    : '복습 단어장 — 아이가 찾아본 단어');
  const vv = vocabViews.filter((v) => v.taps > 0 || v.views > 1).sort((a, b) => (b.taps - a.taps) || (b.views - a.views) || (b.lastAt - a.lastAt)).slice(0, 40);
  if (!vv.length) c4.appendChild(el('p', 'stats-empty', '아직 단어 패널을 열어본 기록이 없어요'));
  else {
    const box = el('div');
    for (const v of vv) {
      const ch = el('span', 'stats-chip');
      ch.appendChild(el('b', '', v.word));
      ch.appendChild(document.createTextNode(` ${v.meaning}`));
      ch.appendChild(el('small', '', `×${v.taps || v.views}`));
      box.appendChild(ch);
    }
    c4.appendChild(box);
  }
  main.appendChild(c4);

  // 5) 최근 세션
  const c5 = card('최근 학습 세션');
  const ss = sessions.filter((s) => (s.seconds || 0) >= 30);
  if (!ss.length) c5.appendChild(el('p', 'stats-empty', '아직 기록이 없어요'));
  for (const s of ss) {
    const row = el('div', 'stats-row');
    const range = s.firstIdx !== null && s.firstIdx !== undefined ? ` #${s.firstIdx + 1}→#${(s.lastIdx || 0) + 1}` : '';
    row.appendChild(el('span', 'name', `${fmtDate(s.startedAt)} ${s.title}${range}`));
    row.appendChild(el('span', 'meta', `${fmtDur(s.seconds)} · ${s.sentences}문장${s.speakAttempts ? ` · 말하기 ${s.speakPass}/${s.speakAttempts}` : ''}${s.puzzles ? ` · 퍼즐 ${s.puzzleSolved}/${s.puzzles}` : ''}`));
    c5.appendChild(row);
  }
  main.appendChild(c5);

  main.appendChild(el('p', 'stats-empty', `기록은 이 기기 안에만 저장돼요. 위 "내보내기"로 파일 백업, "가져오기"로 다른 기기 기록 합치기. (${relDay(today, today)} 기준)`));
}

// ───────────────────── 🛟 기록 지키기 (부모 화면에서만) ─────────────────────

/**
 * 기록이 비어 있는데 기기 안 사본에는 남아 있을 때만 나온다.
 * 자동으로 되돌리지 않는 이유: 사본이 낡았을 수도 있고, 되돌리는 건 부모가 알고 눌러야 한다.
 */
function renderRestoreOffer(main) {
  const box = card('🛟 기록 되돌리기');
  box.hidden = true;
  main.appendChild(box);
  restoreOffer().then((offer) => {
    if (!offer) { box.remove(); return; }
    const when = daysSince(offer.savedAt);
    box.hidden = false;
    box.appendChild(el('p', 'stats-note', `공부 기록이 비어 있어요. 기기 안에 남아 있는 사본으로 되돌릴 수 있어요 (${when === 0 ? '오늘' : `${when}일 전`} 저장됨).`));
    box.appendChild(el('p', 'stats-row', offer.summary));
    const btn = el('button', 'btn btn-primary', '🛟 이 사본으로 되돌리기');
    btn.addEventListener('click', async () => {
      if (!confirm(`사본으로 되돌릴까요?\n\n${offer.summary}\n\n지금 기록과 합쳐지며, 큰 값이 남습니다.`)) return;
      btn.disabled = true;
      try {
        const n = await restoreFromMirror();
        await reloadDaily();
        await reloadProfile();
        alert(`기록 ${n}건을 되돌렸어요`);
        renderStats();
      } catch (e) {
        btn.disabled = false;
        alert(`되돌리기 실패: ${e.message}`);
      }
    });
    box.appendChild(btn);
  }).catch(() => box.remove());
}

/** 진짜 백업은 파일이다 — 주 1회 아버님께만 알린다 (사이트 데이터를 지우면 기기 안 사본도 같이 사라진다) */
function renderBackupReminder(main) {
  const last = lastFileBackup();
  if (!needsFileBackup(last)) return;
  const d = daysSince(last);
  const box = card('💾 파일로 백업할 때가 됐어요');
  box.appendChild(el('p', 'stats-note', d === null
    ? '아직 한 번도 파일로 백업하지 않았어요. 기기 안 사본은 사이트 데이터를 지우면 같이 사라져요 — 파일 하나를 받아 두면 안전해요.'
    : `마지막 파일 백업이 ${d}일 전이에요. 파일 하나를 받아 두면 태블릿을 초기화해도 도감·코인이 안 사라져요.`));
  const btn = el('button', 'btn btn-primary', '💾 지금 파일로 백업하기');
  btn.addEventListener('click', () => { doExport(); box.remove(); });
  box.appendChild(btn);
  main.appendChild(box);
}

// ───────────────────── 내보내기 / 가져오기 ─────────────────────

async function doExport() {
  const data = await exportStats();
  const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `shincoach-기록-${todayKey().replace(/-/g, '')}.json`;
  document.body.appendChild(a);
  a.click();
  markFileBackup(); // 주 1회 알림 기준 — 누른 시점을 기록
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 2000);
}

function doImport(file) {
  const fr = new FileReader();
  fr.onload = async () => {
    try {
      const n = await importStats(JSON.parse(fr.result));
      await reloadDaily();
      await reloadProfile();
      alert(`기록 ${n}건을 가져왔어요`);
      renderStats();
    } catch (e) {
      alert(`가져오기 실패: ${e.message}`);
    }
  };
  fr.readAsText(file);
}

export function initStats({ showView, requirePin }) {
  $('btn-stats').addEventListener('click', () => {
    requirePin(() => { showView('stats'); renderStats(); });
  });
  $('btn-stats-back').addEventListener('click', () => showView('library'));
  $('btn-stats-export').addEventListener('click', doExport);
  $('stats-import-file').addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) doImport(f);
    e.target.value = '';
  });
}
