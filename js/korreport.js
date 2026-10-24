// 📤 국어 기록 요약 (순수, 2026-10-14 v254 — 아버님 "1단계부터 진행하고 8번을 넣자") — 비공개 저장소 korean/YYYY-MM-DD.md
// Claude가 "올라온 거 봐 줘" 때 어느 글·물음에서 막히는지 보고 다음 국어 자료를 고른다 (영어 요약 english/날짜.md와 같은 꼴)
// 싣는 것: 최근 7일 국어 시간 · 최근 7일 읽은 글(v258 — 읽은 시간·첫 답까지·첫 번에 맞힘·끝까지 고름·근거 먼저·둘째 힌트) ·
//          글마다 별·처음 받은 날·틀린 물음 · 완료 기록이 없는 글 · 잘못 읽기 종류별 합 ·
//          자주 틀린 물음(v254부터 셈 — profile.korQMiss) · 🔤 낱말 묶음마다 · 🧩 퍼즐 꼴마다 · ✍️ 생각 쓰기
// ★ 공개 저장소에는 올리지 않는다 — upload.js가 비공개 저장소로만 (아이 기록)
import { TYPES, starsOf, missOf, qMissOf, readsOf, READS_MAX, validCards } from './korean.js';
import { deckStats, DECKS, DECK_ORDER, allWords } from './korwords.js';
import { puzzleStats, KINDS as PUZZLE_KINDS, allPuzzles, puzzleSessions, oneSessions } from './korpuzzle.js';
import { writesOf, cardWriteState } from './korwrite.js';
import { allTopics, nonsulReport, essayReport } from './nonsul.js'; // 🖊️ 논술 (v303 · ✍️ 짧은 글 v304)

/** 자주 틀린 물음을 몇 개까지 싣나 */
export const KOR_TOP = 12;
/** 📤 최근 7일 읽은 글 — 몇 줄까지 싣나 (최근 것부터 · 넘치면 앞을 줄였다고 적는다, v258) */
export const READ_LINES = 60;

const num = (v) => { const n = Math.floor(Number(v)); return Number.isSafeInteger(n) && n > 0 ? n : 0; };
const pad = (n) => String(n).padStart(2, '0');
/** 날 번호(korean.dayNum) → 'MM-DD' (0·깨진 값은 '?') */
export function dayLabel(n) {
  const k = num(n);
  if (k <= 1) return '?'; // 1은 "받았지만 날을 모름" 자리표시(korean.mergeDone)
  const d = new Date(k * 86400000);
  return `${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
/** today에서 k일 전 'YYYY-MM-DD' */
function dayBefore(today, k) {
  const [y, m, d] = String(today).split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d - k));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}
/** 'YYYY-MM-DD' → 날 번호 (korean.dayNum과 같은 셈 — 그 날짜의 자정) */
function dayNumOf(today) {
  const [y, m, d] = String(today).split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}
/** 초 → "4분 10초" · "40초" (순수) */
export function secText(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const m = Math.floor(s / 60);
  return m ? `${m}분${s % 60 ? ` ${s % 60}초` : ''}` : `${s}초`;
}

/**
 * 📤 최근 7일 읽은 글 (순수, v258) — profile.korReads(korean.readsOf)에서 today를 넣은 7일 · 연 차례
 * 맨 위 한 줄은 모은 수(글 몇 번 · 한 편 평균 · 📖 문제 보기까지 평균(v260, 누른 줄만) · 첫 번에 맞힌 물음 · 오답 보기를 모두 고른 물음 · 근거 먼저 · 둘째 힌트 ·
 * 📍 근거부터(v273, 있는 줄만 — 찾기까지 평균 · 잘못 누른 줄 · 찾은 뒤 첫 번에)), 그 아래 READ_LINES줄까지(최근 것)
 * 기기에 저장된 최근 READS_MAX줄 안에서 센다 — 그보다 많이 읽은 주에는 앞의 것이 빠진다 (Codex 69차 #5)
 */
export function readLines(reads, cards, today) {
  const title = new Map((Array.isArray(cards) ? cards : []).map((c) => [c.id, c.title]));
  const to = dayNumOf(today);
  const list = readsOf(reads).filter((x) => x.d <= to && x.d > to - 7);
  const L = ['', `## 최근 7일 읽은 글 (v258부터 셈 — 끝까지 읽을 때마다 한 줄 · 기기에 저장된 최근 ${READS_MAX}줄 안에서 · 시간은 화면이 보이고 2분 안에 손을 댄 동안만 셈 — 오래 조용히 읽은 시간은 일부 빠질 수 있음 · 첫 답까지 = 글을 연 뒤 처음 보기를 고를 때까지 · 문제 보기까지 = 글을 연 뒤 📖 [문제 보기]를 누를 때까지(v260부터, 🎧 빼고) · 🔍 근거 먼저 = 틀린 보기를 두 번 고른 뒤 근거 줄부터 찾은 물음 · 📍 근거부터 = 별을 받을 수 있는 읽기(v273은 ★ 전의 글만 · v274부터 ★·★★·★★★ 받는 날, 🎧 빼고)에서 근거가 있는 첫 물음 하나는 보기를 고르기 전에 근거 줄부터 — 그 물음이 나온 뒤 찾기까지 · 잘못 누른 줄 · 찾은 뒤 첫 번에 맞혔나(그 물음도 "첫 번에 맞힌 물음"·"첫 답까지"에 든다) · 🔍 두 줄로 좁히기(v300) = 답을 고르기 전 근거 찾기(📍 근거부터·🔍 근거 먼저)에서 줄을 세 번 잘못 누르면 근거 줄과 그 옆 줄 둘만 남김(남길 옆 줄이 없으면 안 좁힘) · 두 줄 = 그렇게 좁힌 물음 수(v300부터 적음 — 그 전 줄에는 없음) · 🎯 v300부터 ★★·★★★를 새로 받은 읽기는 첫 번에 맞힌 물음이 반 이상일 때만 🎯(별·💰는 그대로))`];
  if (!list.length) { L.push('(아직 기록 없음)'); return L; }
  const sum = (k) => list.reduce((n, x) => n + x[k], 0);
  const qs = sum('n');
  const f = sum('f');
  const asked = list.filter((x) => x.q !== undefined);
  const gated = list.filter((x) => x.v !== undefined); // 📍 근거부터 (v273)
  const gsum = (k) => gated.reduce((n, x) => n + x[k], 0);
  const paired = list.filter((x) => x.p !== undefined); // 🔍 두 줄 (v300 — 적은 줄만)
  L.push(`- 모두 ${list.length}번 읽음 · 한 번 평균 ${secText(sum('s') / list.length)}` +
    `${asked.length ? ` · 📖 문제 보기까지 평균 ${secText(asked.reduce((n, x) => n + x.q, 0) / asked.length)}(${asked.length}번)` : ''}` +
    ` · 첫 번에 맞힌 물음 ${f}/${qs}${qs ? ` (${Math.round((f / qs) * 100)}%)` : ''}` +
    ` · 오답 보기를 모두 고른 물음 ${sum('x')} · 🔍 근거 먼저 ${sum('e')} · 💡 둘째 힌트 ${sum('h')}` +
    `${gated.length ? ` · 📍 근거부터 ${gated.length}번(찾기까지 평균 ${secText(gsum('v') / gated.length)} · 잘못 누른 줄 ${gsum('w')} · 찾은 뒤 첫 번에 ${gsum('k')}/${gated.length})` : ''}` +
    `${paired.length ? ` · 🔍 두 줄로 좁힌 물음 ${paired.reduce((n, x) => n + x.p, 0)}(v300부터 읽은 ${paired.length}번에서)` : ''}`);
  const shown = list.slice(-READ_LINES);
  if (shown.length < list.length) L.push(`- (앞의 ${list.length - shown.length}줄은 줄였어요)`);
  for (const x of shown) {
    const how = x.m === 'listen' ? ' 🎧 들음' : x.m === 'text' ? ' 🎧→📄 글로 읽음' : '';
    const star = x.g ? `${'★'.repeat(x.g)} 새로` : '별 없이 다시';
    const gate = x.v !== undefined ? `📍 근거부터 찾기까지 ${secText(x.v)}${x.w ? `(잘못 누른 줄 ${x.w})` : ''}${x.k ? '' : ' · 찾은 뒤에도 틀림'}` : '';
    const more = [x.x ? `오답 보기를 모두 고른 물음 ${x.x}` : '', x.e ? `🔍 근거 먼저 ${x.e}` : '', x.h ? `💡 둘째 힌트 ${x.h}` : '', gate, x.p ? `🔍 두 줄 ${x.p}` : ''].filter(Boolean);
    L.push(`- ${dayLabel(x.d)} ${x.c} 「${title.get(x.c) || '?'}」${how} ${star} · ${secText(x.s)} (${x.q !== undefined ? `문제 보기까지 ${secText(x.q)} · ` : ''}첫 답까지 ${secText(x.a)}) · 첫 번에 ${x.f}/${x.n}${more.length ? ` · ${more.join(' · ')}` : ''}`);
  }
  return L;
}

/**
 * 국어 요약 글 (순수)
 * @param {object} p 프로필(korDone·korMiss·korQMiss·korWords·korPuzzle·korWrites)
 * @param {{cards:Array, words:Array, puzzles:Array}} data 쓸 수 있는 카드(validCards) · 모든 낱말(allWords) · 모든 퍼즐(allPuzzles)
 * @param {string} today 'YYYY-MM-DD' · @param {Array<object>} days listDaily 결과(korTime 초 · korExt)
 */
export function korReportText(p, data, today, days) {
  const prof = p && typeof p === 'object' ? p : {};
  const cards = Array.isArray(data && data.cards) ? data.cards : [];
  const done = prof.korDone && typeof prof.korDone === 'object' ? prof.korDone : {};
  const qmiss = qMissOf(prof.korQMiss);
  const byDate = new Map((Array.isArray(days) ? days : []).filter((d) => d && d.date).map((d) => [d.date, d]));
  const L = [`📚 국어 기록 (${today}) — 읽은 글(v258부터) · 글마다 별 · 잘못 읽기 · 자주 틀린 물음(v254부터 셈) · 낱말 · 퍼즐 · 생각 쓰기`,
    '(틀린 물음 수는 끝까지 다 읽은 글에서만 세요 · 두 기기의 기록을 합칠 때는 물음마다 큰 쪽 수만 남아서 둘을 더한 수가 아니에요)',
    '', '## 최근 7일 국어 시간'];
  for (let k = 6; k >= 0; k--) {
    const day = dayBefore(today, k);
    const d = byDate.get(day);
    const sec = d ? num(d.korTime) : 0;
    const min = Math.round(sec / 60);
    const ext = d ? num(d.korExt) : 0;
    // 30초 아래는 반올림하면 0분 — "기록 없음"이 아니라 "1분 미만" (Codex 66차)
    L.push(`- ${day.slice(5)}: ${min ? `${min}분` : sec ? '1분 미만' : '(국어 기록 없음)'}${ext ? ` · ⏳ 연장권 ${ext}개` : ''}`);
  }
  L.push(...readLines(prof.korReads, cards, today)); // 📤 최근 7일 읽은 글 (v258)
  // 글마다
  const st = cards.map((c) => ({ c, s: starsOf(done, c.id), wrong: c.qs.filter((q) => qmiss[q.id]).map((q) => `${q.id}(${qmiss[q.id]})`) }));
  const read = st.filter((x) => x.s > 0 || x.wrong.length);
  const n3 = st.filter((x) => x.s === 3).length;
  const n2 = st.filter((x) => x.s === 2).length;
  const n1 = st.filter((x) => x.s === 1).length;
  L.push('', `## 글 — ${cards.length}편 중 별을 받은 글 ${n1 + n2 + n3}편 (★★★ ${n3} · ★★ ${n2} · ★ ${n1})`);
  for (const { c, s, wrong } of read) {
    const first = s ? ` — 처음 ${dayLabel(done[`${c.id}:1`])}` : ' — 별 없음';
    L.push(`- ${c.id} 「${c.title}」 ${s ? '★'.repeat(s) : '☆'}${first}${wrong.length ? ` · 틀린 물음 ${wrong.join(' ')}` : ''}`);
  }
  // 별·틀린 물음은 끝까지 다 읽어야 남는다 — 읽다가 그만둔 글은 기록이 없어 "안 읽은 글"이라 하지 않는다 (Codex 66차)
  if (!read.length) L.push('(아직 완료 기록 없음)');
  const unread = st.filter((x) => !x.s && !x.wrong.length);
  if (unread.length) L.push(`- 완료 기록이 없는 글 ${unread.length}편: ${unread.map(({ c }) => `${c.id} 「${c.title}」`).join(' · ')}`);
  // 잘못 읽기
  const miss = missOf(prof.korMiss);
  const kinds = Object.keys(TYPES).filter((k) => miss[k]);
  L.push('', '## 잘못 읽기 (모두 합친 수)', kinds.length ? `- ${kinds.map((k) => `${TYPES[k].name} ${miss[k]}`).join(' · ')}` : '(없음)');
  // 자주 틀린 물음
  const qinfo = new Map(cards.flatMap((c) => c.qs.map((q) => [q.id, { c, q }])));
  const top = Object.keys(qmiss).filter((id) => qinfo.has(id)).sort((a, b) => qmiss[b] - qmiss[a] || a.localeCompare(b, 'en', { numeric: true })).slice(0, KOR_TOP);
  L.push('', `## 자주 틀린 물음 (v254부터 셈 — 다 읽은 글에서 틀린 보기를 고른 수 · 두 기기는 큰 쪽 수, 많은 차례 ${KOR_TOP}개까지)`);
  for (const id of top) {
    const { c, q } = qinfo.get(id);
    L.push(`- ${id} 「${c.title}」 ${q.skill} — ${qmiss[id]}번 · 물음: ${q.q}`);
  }
  if (!top.length) L.push('(아직 없음)');
  // 낱말
  L.push('', '## 🔤 낱말 (열린 것 중 배우는 중 · ⭐ 다 익힘)');
  for (const x of deckStats(Array.isArray(data && data.words) ? data.words : [], prof.korWords, done)) {
    const d = DECKS[x.deck];
    if (d && DECK_ORDER.includes(x.deck)) L.push(`- ${d.icon} ${d.ko}: 배우는 중 ${x.learning} · ⭐ ${x.mastered} · 열린 ${x.open} / 전체 ${x.total}`);
  }
  // 퍼즐
  // tried = 기록은 있지만 아직 ⭐ 아닌 것(⭐는 따로 셈) — "풀어 봄"이라 하면 ⭐까지 든 수로 읽힌다 (Codex 66차)
  L.push('', '## 🧩 퍼즐 (열린 것 중 ⭐ 다 맞힘 · 풀어 봤지만 아직 ⭐ 아님)');
  for (const x of puzzleStats(Array.isArray(data && data.puzzles) ? data.puzzles : [], prof.korPuzzle, done)) {
    const k = PUZZLE_KINDS[x.kind];
    L.push(`- ${k.icon} ${k.ko}: ⭐ ${x.solved} · 풀어 봤지만 아직 ⭐ 아님 ${x.tried} · 열린 ${x.open} / 전체 ${x.total}`);
  }
  // 🧩 오늘의 퍼즐 판 — 시작·끝냄·그만둔 자리 (v315부터 셈 · 연습 판은 안 셈) — 판을 열었다 그만둔 것인지 안 연 것인지 가른다
  //   기간 안에 일어난 일을 따로 센다(7일 경계를 넘긴 판은 시작이나 끝냄 한쪽만 들 수 있다 — 끝냄 ÷ 시작으로 나누지 않기) ·
  //   끝난 기록이 없는 판은 까닭을 단정하지 않는다 — 지금 풀고 있는 판·다른 화면으로 가 둔 판·앱을 닫은 판·기록 저장 실패가 다 든다 (🔍 Codex 121차 #1)
  const ps = puzzleSessions(Array.from({ length: 7 }, (_, k) => byDate.get(dayBefore(today, k))));
  L.push(`- 🧩 최근 7일 오늘의 퍼즐 판(v315부터 · 이 기간에 일어난 일을 따로 셈): 시작 ${ps.start} · 끝냄 ${ps.done} · 그만둠 ${ps.quit}${ps.quitAt.length ? ` (그만둔 자리: ${ps.quitAt.map(([at, n]) => `${at} ${n}번`).join(' · ')})` : ''} · 끝난 기록이 없는 판 ${ps.left}(풀고 있는 판·다른 화면으로 가 둔 판·앱을 닫은 판·기록 실패가 다 들어요)`);
  // 🧩 글 끝 퍼즐 하나 (v331) — 국어 글을 다 읽은 화면의 단추로 연 한 개짜리 판 · 오늘의 퍼즐 판 줄과 따로
  const one = oneSessions(Array.from({ length: 7 }, (_, k) => byDate.get(dayBefore(today, k))));
  L.push(`- 🧩 최근 7일 글 끝 퍼즐 하나(v331부터 · 이 기간에 일어난 일을 따로 셈): 누름 ${one.start} · 끝냄 ${one.done}${one.kinds.length ? ` (${one.kinds.map(([k, n]) => `${k} ${n}`).join(' · ')})` : ''}`);
  // 생각 쓰기
  const w = writesOf(prof.korWrites);
  const wcards = Object.keys(w).filter((id) => id.startsWith('K') && w[id].list.length); // 📚 국어 카드만 — 🖊️ 논술 짧은 글(N##)은 논술 절에 (v304)
  const entries = wcards.flatMap((id) => w[id].list);
  const okCards = wcards.filter((id) => cardWriteState(w, id).done).length;
  L.push('', '## ✍️ 생각 쓰기', entries.length
    ? `- 쓴 글 ${entries.length}개 (카드 ${wcards.length}장) · 답장 받은 글 ${entries.filter((e) => e.grade).length}개 · 답장 기다리는 글 ${entries.filter((e) => !e.grade).length}개 · ✅까지 간 카드 ${okCards}장`
    : '(아직 쓴 글 없음)');
  // 🖊️ 논술 (v303) — 원고를 못 받았으면 이 절만 빠진다
  if (Array.isArray(data && data.nonsul) && data.nonsul.length) {
    const now = new Date(`${today}T12:00:00`).getTime();
    L.push('', '## 🖊️ 논술', `- ${nonsulReport(data.nonsul, prof.nonsul, prof.nonsulDay, Number.isFinite(now) ? now : Date.now())}`, `- ${essayReport(prof.korWrites)}`);
  }
  return `${L.join('\n').trim()}\n`;
}

/**
 * 받은 원고 세 파일로 요약 글 (순수) — 꼴이 틀리면 null: 이번엔 국어 요약만 안 올린다
 * (Codex 66차: JSON은 맞지만 cards가 없는 원고가 "0편" 요약으로 비공개 저장소의 좋은 요약을 덮을 뻔했다)
 * @param {object} p 프로필 · @param {Array} raw [reading.json, words.json, puzzles.json] 받은 그대로
 * @param {string} today · @param {Array<object>} days
 */
export function korReportFromRaw(p, raw, today, days) {
  const [r, w, z, ns] = Array.isArray(raw) ? raw : []; // ns = 🖊️ 논술 원고(v303 · 없거나 깨지면 논술 절만 빠진다)
  const listOf = (o, k) => (o && typeof o === 'object' && Array.isArray(o[k]) && o[k].length ? o[k] : null);
  if (!listOf(r, 'cards') || !listOf(w, 'words') || !listOf(z, 'puzzles')) return null;
  const cards = validCards(r);
  if (!cards.length) return null;
  return korReportText(p || {}, { cards, words: allWords(w, cards), puzzles: allPuzzles(z, cards), nonsul: allTopics(ns) }, today, days);
}
