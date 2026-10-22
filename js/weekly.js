// 📈 주간 흐름 (2026-10-18, 아버님 "이대로 진행") — 📊 학습 기록(부모 · 비밀번호 뒤)의 한 칸 + 📤 올릴 때 usage/weekly.md
// 최근 7일씩 끊어 4주(3주 전 · 2주 전 · 지난주 · 이번 주)를 나란히 놓고, 지난주와 견준 ↑↓(좋아진 쪽 초록 · 나빠진 쪽 주황).
// 순수 — 기록(daily · 수학 일지 math.log · 프로필의 국어 기록)을 받아 표 자료(model)와 HTML·마크다운 글을 만든다. 아이 화면에는 쓰지 않는다.
// 기록이 모자란 칸(일지가 잘렸거나 그 기록이 아직 없던 주)은 null → "—" (0으로 보이게 하지 않는다)
import { READS_MAX, readsOf, evSecOf } from './korean.js';

/** 몇 주를 보이나 · 한 주의 날 수 */
export const WEEKS = 4;
const SPAN = 7;
/** 수학 일지 줄 수의 끝 — mathprog.LOG_MAX와 같은 수(무거운 mathprog를 끌어오지 않으려고 불러 쓰는 쪽이 넘긴다) */
const LOG_MAX_DEFAULT = 400;

const p2 = (n) => String(n).padStart(2, '0');
/** 'YYYY-MM-DD' → 날 번호 (korean.dayNum과 같은 셈) */
export function keyNum(key) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ''));
  return m ? Math.floor(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86400000) : 0;
}
/** 날 번호 → 'YYYY-MM-DD' */
export function numKey(n) {
  const d = new Date(n * 86400000);
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`;
}
/** 날 번호 → '10/18' */
const md = (n) => { const d = new Date(n * 86400000); return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`; };

/** 최근 7일씩 WEEKS주 (오래된 → 이번 주) — { from, to (날 번호, 둘 다 넣음), label '10/12~10/18', name '이번 주'… } */
export function weekWindows(today, n = WEEKS) {
  const t = keyNum(today);
  const names = ['이번 주', '지난주', '2주 전', '3주 전', '4주 전', '5주 전'];
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const to = t - i * SPAN;
    const from = to - SPAN + 1;
    out.push({ from, to, label: `${md(from)}~${md(to)}`, name: names[i] || `${i}주 전` });
  }
  return out;
}

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
/** 비율 — 분모가 없거나, 깨진 값(음수·분자 > 분모)이면 null (🔍 Codex 94차 #6) */
const rate = (a, b) => (b > 0 && a >= 0 && a <= b ? a / b : null);
function median(list) {
  const a = list.filter((x) => Number.isFinite(x)).sort((x, y) => x - y);
  if (!a.length) return null;
  const h = Math.floor(a.length / 2);
  return a.length % 2 ? a[h] : (a[h - 1] + a[h]) / 2;
}
const inWin = (w, n) => n >= w.from && n <= w.to;

/** 칸 하나 — label · unit('%'|'분'|'초'|'개'|'일'|'편'|'번') · good('up'|'down'|null — 좋아진 쪽) · values(주마다 수 또는 null) */
const row = (label, unit, good, values) => ({ label, unit, good, values });

/**
 * 표 자료 (순수) → { today, weeks, groups: [{ key, title, rows, note? }] }
 * @param {object} src { daily: listDaily() 결과, math: getMath() 결과, profile: { korReads, korDone, korWordDay, korPuzzleDay }, logMax }
 */
export function weeklyModel(src = {}, today) {
  const weeks = weekWindows(today);
  const daily = (Array.isArray(src.daily) ? src.daily : []).filter((d) => d && keyNum(d.date));
  const dayIn = (w) => daily.filter((d) => inWin(w, keyNum(d.date)));
  const sum = (w, f) => dayIn(w).reduce((a, d) => a + num(d[f]), 0);
  const lenSum = (w, f) => dayIn(w).reduce((a, d) => a + (Array.isArray(d[f]) ? d[f].length : 0), 0);
  const groups = [];

  // 📅 공통 — 공부한 날 · 과목별 시간(⏳ 시계와 같은 초)
  const studied = (d) => num(d.enTime) + num(d.mathTime) + num(d.korTime) + num(d.seconds) + num(d.mathQ) > 0;
  groups.push({
    key: 'all', title: '📅 공통', rows: [
      row('공부한 날', '일', 'up', weeks.map((w) => dayIn(w).filter(studied).length)),
      row('🎤 영어 시간', '분', null, weeks.map((w) => sum(w, 'enTime'))),
      row('🔢 수학 시간', '분', null, weeks.map((w) => sum(w, 'mathTime'))),
      row('📚 국어 시간', '분', null, weeks.map((w) => sum(w, 'korTime'))),
    ],
  });

  // 🎤 영어 — daily 칸 그대로
  groups.push({
    key: 'en', title: '🎤 영어', rows: [
      row('말하기 통과율', '%', 'up', weeks.map((w) => rate(sum(w, 'speakPass'), sum(w, 'speakAttempts')))),
      // 그날 처음 통과한 문장을 날마다 더한 수 — 같은 문장을 이틀 통과하면 2 (서로 다른 문장 수가 아니다, Codex 94차 #4)
      row('그날 처음 통과한 문장(날마다 더함)', '개', 'up', weeks.map((w) => lenSum(w, 'speakFirstKeys'))),
      row('복습 문장', '개', 'up', weeks.map((w) => sum(w, 'reviewSentences'))),
      row('퍼즐 정답률', '%', 'up', weeks.map((w) => rate(sum(w, 'puzzleSolved'), sum(w, 'puzzles')))),
      row('직접 넘김', '번', 'down', weeks.map((w) => sum(w, 'speakSkipBtn'))),
      row('3번 해 보고 넘어감', '번', null, weeks.map((w) => sum(w, 'speakGaveUp'))),
    ],
  });

  // 🔢 수학 — 푼 문제는 daily, 개념 편·그만두기·실수 고쳐 통과·걸린 시간은 일지(최근 logMax줄 — 잘린 주는 —)
  const rawLog = src.math && Array.isArray(src.math.log) ? src.math.log.filter((e) => e && typeof e === 'object') : [];
  // 끝까지 이어 푼 편의 그만두기 줄은 뺀다 (mathprog.shownLog와 같은 규칙) · 같은 편(rid)의 끝낸 줄이 두 번 있으면 한 번만 (guardReport처럼, Codex 94차)
  const fin = new Set(rawLog.filter((e) => e.rid && e.mode !== 'quit').map((e) => e.rid));
  const seenRid = new Set();
  const log = rawLog.filter((e) => {
    if (e.mode === 'quit') return !(e.rid && fin.has(e.rid));
    if (!e.rid) return true;
    if (seenRid.has(e.rid)) return false;
    seenRid.add(e.rid);
    return true;
  });
  const logMax = Number(src.logMax) > 0 ? Number(src.logMax) : LOG_MAX_DEFAULT;
  const logStart = rawLog.reduce((a, e) => { const n = keyNum(e.d); return n && (!a || n < a) ? n : a; }, 0);
  const logCut = rawLog.length >= logMax; // 옛 줄이 밀려났을 수 있다
  // 잘렸으면 남은 첫 줄의 날도 앞부분이 지워졌을 수 있다 — 그날이 든 주도 — (🔍 Codex 94차 #1 · 그 다음 날부터 시작하는 주만 온전)
  const logOk = (w) => !logCut || (logStart && w.from > logStart);
  const CONCEPT = ['learn', 'review', 'practice'];
  const lines = (w, f) => (logOk(w) ? log.filter((e) => f(e) && inWin(w, keyNum(e.mode === 'quit' ? e.d : e.sd || e.d))) : null);
  const cnt = (w, f) => { const l = lines(w, f); return l ? l.length : null; };
  // 개념 편 — 문항 수(n)·맞힌 수(ok)가 바른 줄만 (깨진 줄이 0 = 0으로 "통과"가 되지 않게, Codex 94차 #5 · mathprog도 n > 0을 본다)
  const isRound = (e) => CONCEPT.includes(e.mode) && typeof e.id === 'string' && Number.isSafeInteger(e.n) && e.n > 0 && Number.isSafeInteger(e.ok) && e.ok >= 0 && e.ok <= e.n;
  const passed = (e) => isRound(e) && (e.ok === e.n || e.sl === 1);
  groups.push({
    key: 'math', title: '🔢 수학', rows: [
      row('푼 문제', '개', 'up', weeks.map((w) => sum(w, 'mathQ'))),
      row('정답률', '%', 'up', weeks.map((w) => rate(sum(w, 'mathOk'), sum(w, 'mathQ')))),
      row('개념 통과', '편', 'up', weeks.map((w) => cnt(w, passed))),
      row('못 넘긴 편', '편', 'down', weeks.map((w) => cnt(w, (e) => isRound(e) && !passed(e)))),
      row('그만두기', '번', 'down', weeks.map((w) => cnt(w, (e) => e.mode === 'quit'))),
      row('실수 하나 고쳐 통과', '편', null, weeks.map((w) => cnt(w, (e) => isRound(e) && e.sl === 1))),
      row('문제당 걸린 시간(가운데값)', '초', null, weeks.map((w) => {
        const l = lines(w, isRound);
        return l ? median(l.flatMap((e) => (Array.isArray(e.qs) ? e.qs : []).map((q) => (q && Number.isFinite(q.s) ? q.s : NaN)))) : null;
      })),
    ],
    note: logCut ? `수학 일지는 최근 ${logMax}편까지만 남아요 — 그보다 오래된 주는 —` : '',
  });

  // 📚 국어 — 읽기 날마다 합계(하루 기록 kor…, v314)가 그 주를 다 덮으면 그것으로 · 아니면 읽기 일지(최근 READS_MAX편 — 잘린 주는 —) ·
  //   별 받은 날(korDone) · 낱말·퍼즐 한 날
  // (v314 전엔 일지뿐이라 하루 30편 넘게 읽으면 나흘이면 일지가 차서 이번 주까지 모두 —였다)
  const prof = src.profile || {};
  const reads = readsOf(prof.korReads).slice().sort((a, b) => a.t - b.t);
  const readStart = reads.length ? Math.min(...reads.map((x) => x.d)) : 0;
  const readCut = reads.length >= READS_MAX;
  // 잘렸으면 남은 첫 줄의 날도 앞부분이 지워졌을 수 있다 — 그날이 든 주도 — (🔍 Codex 94차 #1)
  const readOk = (w) => !readCut || (readStart && w.from > readStart);
  // 날마다 합계를 처음 센 날 — 그날은 새 판을 받기 전의 읽기가 빠졌을 수 있어 그다음 날부터 시작하는 주만 온전(일지의 남은 첫 날과 같은 규칙)
  const sumStart = daily.reduce((a, d) => { const n = keyNum(d.date); return num(d.korReads) > 0 && (!a || n < a) ? n : a; }, 0);
  const sumOk = (w) => sumStart > 0 && w.from > sumStart;
  /** 그 주의 값 — 합계로(bySum(그 주의 하루 기록들)) · 아니면 일지로(byLog(그 주의 읽은 줄)) · 둘 다 못 하면 null */
  const kor = (bySum, byLog) => weeks.map((w) => {
    if (sumOk(w)) return bySum(dayIn(w));
    return readOk(w) ? byLog(reads.filter((x) => inWin(w, x.d))) : null;
  });
  const total = (ds, f) => ds.reduce((a, d) => a + num(d[f]), 0);
  const rateOf = (l) => rate(l.reduce((a, x) => a + x.f, 0), l.reduce((a, x) => a + x.n, 0));
  const doneDays = Object.values(prof.korDone && typeof prof.korDone === 'object' ? prof.korDone : {}).map(Number).filter((n) => n > 0);
  const dayKeys = (o) => Object.keys(o && typeof o === 'object' ? o : {}).map(Number).filter((n) => n > 0);
  groups.push({
    key: 'kor', title: '📚 국어', rows: [
      row('읽은 글', '편', 'up', kor((ds) => total(ds, 'korReads'), (l) => l.length)),
      // 처음 읽을 때 = 그 글로 ★를 받은 판(처음 끝까지 읽은 판, g 1) — v314 전엔 "일지 안에서 그 글의 첫 줄"이라 일지보다 앞선 읽기를 몰랐다
      row('처음 읽을 때 첫 번에 맞힘', '%', 'up', kor((ds) => rate(total(ds, 'korNewF'), total(ds, 'korNewN')), (l) => rateOf(l.filter((x) => x.g === 1)))),
      // 다시 읽을 때 = ★★·★★★를 받은 판(g 2~3) — 🎯 다시 읽기 규칙(v300)의 효과를 본다
      row('다시 읽을 때 첫 번에 맞힘(★★·★★★)', '%', 'up', kor((ds) => rate(total(ds, 'korReF'), total(ds, 'korReN')), (l) => rateOf(l.filter((x) => x.g >= 2)))),
      row('📍 근거 찾는 데 걸린 시간(가운데값)', '초', 'down', kor(
        (ds) => median(ds.flatMap((d) => (Array.isArray(d.korEvSecs) ? d.korEvSecs : []).map(evSecOf))),
        (l) => median(l.filter((x) => x.v !== undefined).map((x) => x.v)))),
      row('📍 근거 찾은 뒤 첫 번에 맞힘', '%', 'up', kor((ds) => rate(total(ds, 'korEvK'), total(ds, 'korEvN')), (l) => { const g = l.filter((x) => x.k !== undefined); return rate(g.reduce((a, x) => a + x.k, 0), g.length); })),
      // 🧠 아는 것으로 답하기 — 글마다 적기 시작한 뒤(v287)의 줄만 · 그 전 읽기가 한 편이라도 섞인 주는 —
      //    (일부만 더한 수를 그 주 전체처럼 보이지 않게, 🔍 Codex 94차 #2) · 날마다 합계(v314)는 모두 적은 뒤라 그대로
      row('🧠 아는 것으로 답하기', '번', 'down', kor((ds) => total(ds, 'korKnow'), (l) => (l.length && l.every((x) => x.y !== undefined) ? l.reduce((a, x) => a + x.y, 0) : null))),
      row('새로 받은 별', '개', 'up', weeks.map((w) => doneDays.filter((n) => inWin(w, n)).length)),
      row('🔤 낱말 한 날', '일', 'up', weeks.map((w) => dayKeys(prof.korWordDay).filter((n) => inWin(w, n)).length)),
      row('🧩 퍼즐 한 날', '일', 'up', weeks.map((w) => dayKeys(prof.korPuzzleDay).filter((n) => inWin(w, n)).length)),
    ],
    // 어느 주가 무엇으로 셌는지 화면·📤 글에 밝힌다 (🔍 Codex 94차 #3)
    note: `처음 읽을 때 = 그 글로 ★를 받은 판 · 다시 읽을 때 = ★★·★★★를 받은 판 · ${sumStart ? `날마다 합계는 ${md(sumStart)}부터 세요(그다음 날부터 시작하는 주가 온전) — 그 전 주는 ` : ''}읽기 일지(최근 ${READS_MAX}편)로${readCut ? ' · 일지가 꽉 차 오래된 주는 —' : ''} · 🧠은 10/18(v287)부터 적어요`,
  });

  // ⏱️ 어디에 시간을 썼나 — 화면별 머문 초(🕒 v272부터) · 공부(수학·국어·영어) · 놀이(집·상점·잡기·배틀·도감)
  const STUDY = ['uMath', 'uKor', 'uEn'];
  const PLAY = ['uHouse', 'uShop', 'uCatch', 'uBattle', 'uDex'];
  const ALL = [...STUDY, ...PLAY, 'uHome', 'uStats', 'uLock'];
  const share = (w, fs) => { const all = ALL.reduce((a, f) => a + sum(w, f), 0); return all > 0 ? fs.reduce((a, f) => a + sum(w, f), 0) / all : null; };
  groups.push({
    key: 'use', title: '⏱️ 어디에 시간을 썼나', rows: [
      row('공부 화면', '%', 'up', weeks.map((w) => share(w, STUDY))),
      row('놀이 화면(집·상점·잡기·배틀·도감)', '%', 'down', weeks.map((w) => share(w, PLAY))),
    ],
    note: '화면별 시간은 10/16(v272)부터 적어요',
  });
  return { today, weeks, groups };
}

/** 값 글자 */
export function fmtVal(v, unit) {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  // 바꾼 뒤에도 유한한 수인지 본다 — 깨진 큰 값이 "Infinity%"가 되지 않게 (🔍 Codex 94차 #6)
  const n = Math.round(unit === '%' ? v * 100 : unit === '분' ? v / 60 : v);
  if (!Number.isFinite(n) || n < 0) return '—';
  return `${n}${unit}`;
}
/** 지난주 → 이번 주 (순수) — { mark: '↑'|'↓'|'→'|'', tone: 'good'|'bad'|'' } · 분은 1분 안 차이, %는 1%p 안 차이는 같은 것으로 */
export function trendOf(r) {
  const [a, b] = r.values.slice(-2);
  if (a === null || b === null || a === undefined || b === undefined || !Number.isFinite(a) || !Number.isFinite(b)) return { mark: '', tone: '' };
  const eps = r.unit === '%' ? 0.01 : r.unit === '분' ? 60 : 0;
  if (Math.abs(b - a) <= eps) return { mark: '→', tone: '' };
  const up = b > a;
  const tone = !r.good ? '' : (up === (r.good === 'up') ? 'good' : 'bad');
  return { mark: up ? '↑' : '↓', tone };
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** 📊 칸 HTML (순수 글자) — 과목마다 표 하나(넓으면 옆으로 밀어 보기) */
export function weeklyHtml(model) {
  const head = `<tr><th scope="col">항목</th>${model.weeks.map((w, i) => `<th scope="col"${i === model.weeks.length - 1 ? ' class="is-now"' : ''}>${esc(w.name)}<span>${esc(w.label)}</span></th>`).join('')}<th scope="col" class="wk-tr" aria-label="지난주와 견줌"></th></tr>`;
  const body = (g) => g.rows.map((r) => {
    const t = trendOf(r);
    return `<tr><th scope="row">${esc(r.label)}</th>${r.values.map((v, i) => `<td${i === r.values.length - 1 ? ' class="is-now"' : ''}>${esc(fmtVal(v, r.unit))}</td>`).join('')}<td class="wk-tr${t.tone ? ` is-${t.tone}` : ''}">${esc(t.mark)}</td></tr>`;
  }).join('');
  return `<div class="wk">${model.groups.map((g) => `<section class="wk-g"><h4 class="wk-h">${esc(g.title)}</h4><div class="wk-scroll"><table class="wk-t"><thead>${head}</thead><tbody>${body(g)}</tbody></table></div>${g.note ? `<p class="wk-note">${esc(g.note)}</p>` : ''}</section>`).join('')}`
    + '<p class="wk-note">최근 7일씩 끊어 견줘요(이번 주는 오늘까지 7일). ↑↓는 지난주와 견준 것 — 초록은 좋아진 쪽, 주황은 덜한 쪽이에요. 한 주로 단정하지 말고 흐름으로 봐 주세요.</p></div>';
}

/** 📤 usage/weekly.md 글 (순수) — Claude가 "올라온 거 봐 줘"에서 같은 숫자로 말하게 */
export function weeklyMd(model) {
  const out = [`# 📈 주간 흐름 (${model.today}) — 최근 7일씩 ${model.weeks.length}주`, ''];
  for (const g of model.groups) {
    out.push(`## ${g.title}`, '');
    out.push(`| 항목 | ${model.weeks.map((w) => `${w.name} ${w.label}`).join(' | ')} | 지난주→이번 주 |`);
    out.push(`|---|${model.weeks.map(() => '---:').join('|')}|:---:|`);
    for (const r of g.rows) {
      const t = trendOf(r);
      out.push(`| ${r.label} | ${r.values.map((v) => fmtVal(v, r.unit)).join(' | ')} | ${t.mark}${t.tone === 'good' ? ' 좋아짐' : t.tone === 'bad' ? ' 덜함' : ''} |`);
    }
    if (g.note) out.push('', `> ${g.note}`);
    out.push('');
  }
  return out.join('\n');
}
