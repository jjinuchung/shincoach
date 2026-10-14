// 📤 국어 기록 요약 (순수, 2026-10-14 v254 — 아버님 "1단계부터 진행하고 8번을 넣자") — 비공개 저장소 korean/YYYY-MM-DD.md
// Claude가 "올라온 거 봐 줘" 때 어느 글·물음에서 막히는지 보고 다음 국어 자료를 고른다 (영어 요약 english/날짜.md와 같은 꼴)
// 싣는 것: 최근 7일 국어 시간 · 글마다 별·처음 받은 날·틀린 물음 · 완료 기록이 없는 글 · 잘못 읽기 종류별 합 ·
//          자주 틀린 물음(v254부터 셈 — profile.korQMiss) · 🔤 낱말 묶음마다 · 🧩 퍼즐 꼴마다 · ✍️ 생각 쓰기
// ★ 공개 저장소에는 올리지 않는다 — upload.js가 비공개 저장소로만 (아이 기록)
import { TYPES, starsOf, missOf, qMissOf, validCards } from './korean.js';
import { deckStats, DECKS, DECK_ORDER, allWords } from './korwords.js';
import { puzzleStats, KINDS as PUZZLE_KINDS, allPuzzles } from './korpuzzle.js';
import { writesOf, cardWriteState } from './korwrite.js';

/** 자주 틀린 물음을 몇 개까지 싣나 */
export const KOR_TOP = 12;

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
  const L = [`📚 국어 기록 (${today}) — 글마다 별 · 잘못 읽기 · 자주 틀린 물음(v254부터 셈) · 낱말 · 퍼즐 · 생각 쓰기`,
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
  // 생각 쓰기
  const w = writesOf(prof.korWrites);
  const wcards = Object.keys(w).filter((id) => w[id].list.length);
  const entries = wcards.flatMap((id) => w[id].list);
  const okCards = wcards.filter((id) => cardWriteState(w, id).done).length;
  L.push('', '## ✍️ 생각 쓰기', entries.length
    ? `- 쓴 글 ${entries.length}개 (카드 ${wcards.length}장) · 답장 받은 글 ${entries.filter((e) => e.grade).length}개 · 답장 기다리는 글 ${entries.filter((e) => !e.grade).length}개 · ✅까지 간 카드 ${okCards}장`
    : '(아직 쓴 글 없음)');
  return `${L.join('\n').trim()}\n`;
}

/**
 * 받은 원고 세 파일로 요약 글 (순수) — 꼴이 틀리면 null: 이번엔 국어 요약만 안 올린다
 * (Codex 66차: JSON은 맞지만 cards가 없는 원고가 "0편" 요약으로 비공개 저장소의 좋은 요약을 덮을 뻔했다)
 * @param {object} p 프로필 · @param {Array} raw [reading.json, words.json, puzzles.json] 받은 그대로
 * @param {string} today · @param {Array<object>} days
 */
export function korReportFromRaw(p, raw, today, days) {
  const [r, w, z] = Array.isArray(raw) ? raw : [];
  const listOf = (o, k) => (o && typeof o === 'object' && Array.isArray(o[k]) && o[k].length ? o[k] : null);
  if (!listOf(r, 'cards') || !listOf(w, 'words') || !listOf(z, 'puzzles')) return null;
  const cards = validCards(r);
  if (!cards.length) return null;
  return korReportText(p || {}, { cards, words: allWords(w, cards), puzzles: allPuzzles(z, cards) }, today, days);
}
