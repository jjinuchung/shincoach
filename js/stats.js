// 📊 학습 기록 화면 (부모용): 이번 주 요약, 콘텐츠별 진행률, 어려워한 문장, 복습 단어장, 최근 세션, 내보내기/가져오기
import {
  listItems, getAllSentenceStats, listSessions, listDaily, listVocabViews, exportStats, importStats,
  applyEssayFixes,
} from './db.js';
import { exportText, parseFixes } from './essay.js';
import { parseSubtitle, mergeIntoSentences } from './srt.js';
import { openPlayer } from './player.js';
import { todayKey, MASTER_RATIO, reloadDaily } from './track.js';
import { reviewSummary, wordSummary, stageIcon, GRADUATED } from './review.js';
import { reloadProfile, listRarityAsks, decideRarity, RARITY } from './xp.js';
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
    return { id: it.id, title: it.title, total, done, mastered, seconds, attempts, pass, lastAt, pct: total ? Math.round((done / total) * 100) : 0 };
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
  let mergeSentences = true;
  try { mergeSentences = JSON.parse(localStorage.getItem('shincoach.settings') || '{}').mergeSentences !== false; } catch { /* 기본값 */ }
  let cues = parseSubtitle(item.enText || '');
  if (mergeSentences) cues = mergeIntoSentences(cues);
  return cues.length;
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
    row.appendChild(el('span', 'meta', `${s.pct}% · ${s.done}/${s.total}문장 · ⭐${s.mastered}`));
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
  const essayDays = daily
    .filter((d) => Array.isArray(d.essays) && d.essays.length)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 7);
  if (essayDays.length) {
    const total = essayDays.reduce((a, d) => a + d.essays.length, 0);
    const cE = card(`✍️ 에세이 — 배운 문장을 내 이야기로 (최근 ${essayDays.length}일 · ${total}문장)`);
    // 아직 고쳐 주지 않은 글의 번호 — 화면에 그대로 보여 준다.
    // 복사 없이 **사진만 찍어 보내도** 번호가 남으므로 [번호] 줄로 되돌려 받을 수 있다.
    const todoNo = essayNumbers(essayDays);
    for (const d of essayDays) {
      cE.appendChild(el('p', 'stats-sub', d.date));
      for (const e of d.essays) {
        const box = el('div', 'stats-essay');
        const no = todoNo.get(e.id);
        if (no) box.appendChild(el('div', 'stats-essay-no', `[${no}] 고쳐 주세요`));
        box.appendChild(el('div', 'stats-essay-origin', `배운 문장: ${e.origin || ''}`));
        box.appendChild(el('div', 'stats-essay-mine', `✍️ ${e.written || ''}`));
        if (e.fixed && e.fixed !== e.written) box.appendChild(el('div', 'stats-essay-fixed', `✅ ${e.fixed}`));
        if (Array.isArray(e.notes) && e.notes.length) box.appendChild(el('div', 'stats-essay-notes', e.notes.join(' · ')));
        if (e.coachFix) {
          box.appendChild(el('div', 'stats-essay-coach', `👨‍👩‍👦 ${e.coachFix}${e.readAt ? ' (읽음)' : ' (아직 안 읽음)'}`));
        }
        cE.appendChild(box);
      }
    }
    cE.appendChild(buildCoachTools(essayDays));
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
