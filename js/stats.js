// 📊 학습 기록 화면 (부모용): 이번 주 요약, 콘텐츠별 진행률, 어려워한 문장, 복습 단어장, 최근 세션, 내보내기/가져오기
import {
  listItems, getAllSentenceStats, listSessions, listDaily, listVocabViews, exportStats, importStats,
} from './db.js';
import { parseSubtitle, mergeIntoSentences } from './srt.js';
import { openPlayer } from './player.js';
import { todayKey, MASTER_RATIO } from './track.js';

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
      speakAttempts: rec ? rec.speakAttempts : 0, speakPass: rec ? rec.speakPass : 0, isToday: i === 0,
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
  const allSec = daily.reduce((a, d) => a + d.seconds, 0);
  const c1 = card('이번 주 (최근 7일)');
  const sum = el('div', 'stats-summary');
  const kpi = (v, l) => { const k = el('div', 'stats-kpi'); k.appendChild(el('div', 'v', v)); k.appendChild(el('div', 'l', l)); return k; };
  sum.appendChild(kpi(fmtDur(wSec), '학습 시간'));
  sum.appendChild(kpi(`${wDays}일`, '학습한 날'));
  sum.appendChild(kpi(`${wSent}문장`, '한 문장'));
  sum.appendChild(kpi(wAtt ? `${Math.round((wPass / wAtt) * 100)}%` : '-', `말하기 통과 (${wPass}/${wAtt})`));
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
    d.appendChild(el('div', 'en', r.en));
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

  // 4) 복습 단어장
  const c4 = card('복습 단어장 — 아이가 찾아본 단어');
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
    row.appendChild(el('span', 'meta', `${fmtDur(s.seconds)} · ${s.sentences}문장${s.speakAttempts ? ` · 말하기 ${s.speakPass}/${s.speakAttempts}` : ''}`));
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
