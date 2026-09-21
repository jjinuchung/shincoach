// 🔢 수학 진도 규칙 (순수 함수) — 화면(math.js)과 저장(db.js updateMath)이 이 규칙을 쓴다
//
// 개념 하나의 기록: { done, box, dueAt, passes, fails, lastAt }
//  - done: 처음으로 한 편(①②③⭐)을 **다 맞혀** "안다"가 된 상태. 사다리에서 다음 개념이 열린다
//  - box·dueAt: 영어 문장 복습과 같은 라이트너(1·2·4·7·14일). box가 GRADUATED(5)에 닿으면 👑 이해 완료
//  "정말로 이해한 게 맞는지 검증하고 또 검증"(아버님)이 곧 이 라이트너다 — 그날 맞힌 것은 "안다"이지 "이해 완료"가 아니다.

import { schedule, isDue, enroll, addDays, GRADUATED, STAGES } from './review.js';
import { FRACTION, ladder, placeFrom } from './mathgen.js';

/** 보상 — 영어 쪽 규모에 맞춤 (문장 완료 +2, 퍼즐 정답 30, 복습 회차 30) */
export const REWARD = {
  q: { xp: 3, coin: 1 },          // 문항 하나 정답
  firstPass: { xp: 40, coin: 12 }, // 개념을 처음으로 다 맞힘 → 🎯 잡기 1회
  reviewPass: { xp: 25, coin: 8 }, // 복습에서 다 맞힘
  crown: { xp: 60, coin: 20 },     // 👑 이해 완료 (라이트너 졸업)
  diag: { xp: 2, coin: 1 },        // 진단 문항 정답
  fix: { xp: 1, coin: 0 },         // 🔁 틀린 뒤 풀이를 읽고 쌍둥이 문제를 맞힘 (편의 통과 여부는 안 바뀐다)
};

/** 진단 결과로 "아는 것"으로 친 개념의 첫 복습까지 며칠 — 진단은 한 문제뿐이라 곧 다시 확인한다 */
export const PLACED_RECHECK_DAYS = 3;

/** 영상 제목 → 세계관 (없으면 null). 진우가 끝까지 본 영상만 문제에 출연시키려고 쓴다 */
export function worldOfTitle(title) {
  const t = String(title || '');
  if (/토이\s*스토리|toy\s*story/i.test(t)) return 'toystory';
  if (/미니언|minion/i.test(t)) return 'minions';
  if (/모아나|moana/i.test(t)) return 'moana';
  return null;
}

/** 끝까지 봤다고 칠 진행률(%) — 마지막 몇 문장은 자막 사고로 못 끝내는 일이 있어 100은 안 잡는다 */
export const SEEN_PCT = 90;

/**
 * 영상 목록·진행률에서 "본 영상 세계" 목록을 만든다.
 * @param {Array<{title:string, pct:number}>} summaries stats.contentSummary 결과
 * @returns {Object<string, string[]>} mathgen의 opts.worlds 모양 ({ toystory: [], ... }). 포켓몬은 항상 포함
 */
export function seenWorlds(summaries) {
  const out = { pokemon: [] };
  for (const s of (summaries || [])) {
    const w = worldOfTitle(s && s.title);
    if (w && (Number(s.pct) || 0) >= SEEN_PCT) out[w] = [];
  }
  return out;
}

export function doneIds(m) {
  return Object.entries((m && m.concepts) || {}).filter(([, v]) => v && v.done).map(([k]) => k);
}

/** 사다리 상태 + 각 개념의 복습 정보 */
export function ladderOf(m, today) {
  const done = doneIds(m);
  return ladder(done).map((row) => {
    const rec = (m && m.concepts && m.concepts[row.id]) || null;
    const box = rec ? (rec.box || 0) : 0;
    return {
      ...row,
      box,
      left: Math.max(0, GRADUATED - box), // 👑까지 남은 확인 횟수
      crowned: !!rec && rec.done && box >= GRADUATED,
      due: !!rec && rec.done && isDue(rec, today),
      notes: rec && Array.isArray(rec.notes) ? rec.notes.length : 0, // 🤔 다시 볼 유형 수
      icon: rec && rec.done ? STAGES[Math.min(box, STAGES.length - 1)] : (row.state === 'now' ? '▶' : row.state === 'open' ? '○' : '🔒'),
    };
  });
}

/** 오늘 다시 확인할(복습) 개념 id들 — 사다리 순서대로 */
export function dueIds(m, today) {
  return ladderOf(m, today).filter((r) => r.due).map((r) => r.id);
}

/** 지금 배울 개념 (사다리의 ▶). 다 끝났으면 null */
export function nowId(m) {
  const row = ladderOf(m, '0000-00-00').find((r) => r.state === 'now');
  return row ? row.id : null;
}

/** 진단을 아직 안 했는가 (줄기별) */
export function needsPlacement(m, strand = 'fraction') {
  return !(m && m.placed && m.placed[strand]);
}

/**
 * 📏 진단 결과 반영 — 틀린 가장 앞 개념 앞까지를 "안다"로 치되, 며칠 뒤 복습에서 **다시 확인**한다.
 * @param {object} m 복사본 (updateMath 안에서)
 * @param {Array<{concept:string, correct:boolean}>} answers
 */
export function applyPlacement(m, answers, today, strand = 'fraction', missTags = []) {
  const { startId, knownIds } = placeFrom(answers);
  m.placed = m.placed || {};
  m.placed[strand] = today;
  m.concepts = m.concepts || {};
  m.miss = m.miss || {};
  for (const id of knownIds) {
    if (m.concepts[id] && m.concepts[id].done) continue; // 이미 배운 것은 그대로
    m.concepts[id] = { done: true, box: 1, dueAt: addDays(today, PLACED_RECHECK_DAYS), passes: 1, fails: 0, lastAt: Date.now(), placed: true };
  }
  // 진단에서 고른 오개념도 부모 화면에 쌓는다 (Codex 리뷰 #8 — 버려지고 있었다)
  for (const t of (missTags || [])) if (t) m.miss[t] = (m.miss[t] || 0) + 1;
  const ok = (answers || []).filter((a) => a && a.correct).length;
  pushLog(m, { d: today, t: Date.now(), id: 'diag', mode: 'diag', ok, n: (answers || []).length,
    qs: (answers || []).map((a) => ({ k: 'calc', c: a.concept, ok: a.correct ? 1 : 0, ...(a.tag ? { tag: a.tag } : {}) })) });
  return { startId, knownIds };
}

/**
 * 📒 회차 일지 — 한 편마다 한 줄. 아버님이 나중에 "어디서 자꾸 틀리다 언제 나아졌나"를 보려고 (2026-09-20 요청).
 * { d: 날짜, t: 시각, id: 개념|'diag', mode, ok, n, qs: [{ k: 얼굴, ok: 0|1, tag?: 오개념, c?: 진단 개념 }] }
 * 최근 LOG_MAX편만 — 한 줄이 200B 안팎이라 400편이면 80KB. 개념별 누적(kinds·miss)은 따로 있어 잘려도 요약은 남는다.
 */
export const LOG_MAX = 400;
/** 🤔 개념마다 남겨 두는 오답 노트 수 — 유형(틀)별로 하나씩이라 12면 넉넉하다 */
export const NOTES_MAX = 12;
/**
 * 지운 노트의 시각 — 옛 백업을 가져와도(mergeMath) 이미 고친 유형이 되살아나지 않게 (Codex 2차 #3).
 * { key: 지운 시각 }, 최근 NOTES_MAX개만
 */
export function markCleared(rec, key) {
  rec.cleared = rec.cleared || {};
  rec.cleared[key] = Date.now();
  const keys = Object.keys(rec.cleared);
  if (keys.length > NOTES_MAX) for (const k of keys.sort((a, b) => rec.cleared[a] - rec.cleared[b]).slice(0, keys.length - NOTES_MAX)) delete rec.cleared[k];
}
function pushLog(m, entry) {
  m.log = Array.isArray(m.log) ? m.log : [];
  m.log.push(entry);
  if (m.log.length > LOG_MAX) m.log.splice(0, m.log.length - LOG_MAX);
}

/**
 * 개념 한 편의 결과 반영.
 *
 * ★ 이미 아는 개념은 **오늘 복습 차례(dueAt ≤ today)일 때만** 라이트너가 움직인다. 차례가 아닌데 또 풀면
 *   `practice` — 기록·오개념은 남기되 box·dueAt은 그대로. 안 그러면 같은 날 여섯 번 풀어 👑을 받을 수 있고
 *   (Codex 리뷰 #1), 두 창이 같은 복습을 두 번 끝내면 두 번 올라간다. 판정은 저장소에서 읽은 rec로 하므로
 *   먼저 끝낸 창이 dueAt을 미루면 늦은 창은 자동으로 practice가 된다.
 * @param {object} m 복사본
 * @param {string} id 개념
 * @param {{correct:number, total:number, missTags:string[], qs?:Array<{k:string, ok:0|1, tag?:string}>, mode?:string}} r
 *   qs: 문항별 결과(얼굴·정오·고른 오개념) — 개념별 누적(kinds·miss)과 일지(log)에 남는다
 * @returns {{passed:boolean, first:boolean, crowned:boolean, review:boolean, practice:boolean}}
 */
export function applyRound(m, id, r, today) {
  m.concepts = m.concepts || {};
  m.miss = m.miss || {};
  const rec = m.concepts[id] || { done: false, box: 0, dueAt: '', passes: 0, fails: 0, lastAt: 0 };
  const passed = r.total > 0 && r.correct === r.total;
  const wasDone = !!rec.done;
  const wasCrowned = wasDone && (rec.box || 0) >= GRADUATED;
  let review = false;
  let practice = false;
  if (!wasDone) {
    if (passed) { rec.done = true; Object.assign(rec, enroll(today)); }
  } else if (isDue(rec, today)) {
    review = true;
    Object.assign(rec, schedule(rec.box || 0, passed, today));
  } else {
    practice = true; // 차례가 아닌 연습 — 일정은 안 건드린다
  }
  if (passed) rec.passes = (rec.passes || 0) + 1; else rec.fails = (rec.fails || 0) + 1;
  rec.lastAt = Date.now();
  delete rec.placed;
  // 얼굴별(①②③⭐) 누적과 개념별 오개념 — "이 개념에서 어느 얼굴이 약한가"를 보려고
  rec.kinds = rec.kinds || {};
  rec.miss = rec.miss || {};
  rec.notes = Array.isArray(rec.notes) ? rec.notes : [];
  for (const q of (r.qs || [])) {
    if (!q || !q.k) continue;
    const kk = rec.kinds[q.k] || [0, 0];
    rec.kinds[q.k] = [kk[0] + (q.ok ? 1 : 0), kk[1] + 1];
    if (q.tag) rec.miss[q.tag] = (rec.miss[q.tag] || 0) + 1;
    // 🤔 오답 노트 — 틀린 문항의 틀(key)을 적어 두고, 다음 편에서 그 유형을 한 문제 다시 낸다.
    //    처음에 맞히면(ok) 노트에서 지운다 — 쌍둥이로 고친 것(fx)은 "바로 고침"으로만 표시하고 남겨 둔다 (며칠 뒤에도 맞아야 진짜)
    if (q.key) {
      const prev = rec.notes.find((n) => n.key === q.key);
      rec.notes = rec.notes.filter((n) => n.key !== q.key);
      if (!q.ok) rec.notes.push({ k: q.k, key: q.key, d: today, t: Date.now(), ...(prev && prev.again ? { again: prev.again } : {}), ...(q.tag ? { tag: q.tag } : {}), ...(q.fx === undefined ? {} : { fx: q.fx ? 1 : 0 }) });
      else if (prev) markCleared(rec, q.key);
    }
  }
  if (rec.notes.length > NOTES_MAX) rec.notes.splice(0, rec.notes.length - NOTES_MAX);
  m.concepts[id] = rec;
  for (const t of (r.missTags || [])) if (t) m.miss[t] = (m.miss[t] || 0) + 1;
  m.rounds = (m.rounds || 0) + 1;
  const mode = practice ? 'practice' : review ? 'review' : (r.mode || 'learn');
  pushLog(m, { d: today, t: Date.now(), id, mode, ok: r.correct, n: r.total, qs: (r.qs || []).map((q) => ({ k: q.k, ok: q.ok ? 1 : 0, ...(q.tag ? { tag: q.tag } : {}), ...(q.fx === undefined ? {} : { fx: q.fx ? 1 : 0 }) })) });
  const crowned = rec.done && (rec.box || 0) >= GRADUATED && !wasCrowned;
  return { passed, first: !wasDone && passed, crowned, review, practice };
}

/** 한 편의 보상 계산 (지급은 화면이 한다). 차례가 아닌 연습(practice)은 정답 수만큼만 */
export function roundReward(result, correct) {
  let xp = correct * REWARD.q.xp;
  let coin = correct * REWARD.q.coin;
  let catchOnce = false;
  if (result.practice) return { xp, coin, catchOnce };
  if (result.first) { xp += REWARD.firstPass.xp; coin += REWARD.firstPass.coin; catchOnce = true; }
  else if (result.review && result.passed) { xp += REWARD.reviewPass.xp; coin += REWARD.reviewPass.coin; }
  if (result.crowned) { xp += REWARD.crown.xp; coin += REWARD.crown.coin; }
  return { xp, coin, catchOnce };
}

/** 🤔 다음 편에서 다시 낼 오답 노트 하나 (가장 최근 것). 없으면 null */
export function nextNote(m, id) {
  const rec = m && m.concepts && m.concepts[id];
  const notes = rec && Array.isArray(rec.notes) ? rec.notes : [];
  return notes.length ? notes[notes.length - 1] : null;
}

/** 🤔 오답 노트 회차에 한 번에 내는 문항 수 */
export const NOTES_ROUND = 4;

/**
 * 🤔 오답 노트 회차에 낼 것 — **어제 이전에** 틀린 유형만 (같은 날은 그 개념을 다시 열 때 이미 한 번 끼어 든다).
 * 개념이 👑이거나 복습 차례가 아니어도 나온다 — 노트는 개념 일정과 따로 돈다. 오래된 것부터, 최대 NOTES_ROUND개.
 * @returns {Array<{id:string, note:object}>}
 */
export function dueNotes(m, today, limit = NOTES_ROUND) {
  const out = [];
  for (const [id, rec] of Object.entries((m && m.concepts) || {})) {
    for (const n of (rec && Array.isArray(rec.notes) ? rec.notes : [])) if (n && n.key && n.d && n.d < today) out.push({ id, note: n });
  }
  return out.sort((a, b) => (a.note.t || 0) - (b.note.t || 0)).slice(0, limit);
}

/** 모든 개념의 노트 수 (사다리 버튼·📊용). due: 어제 이전 것만 */
export function countNotes(m, today) {
  let all = 0; let due = 0;
  for (const rec of Object.values((m && m.concepts) || {})) {
    for (const n of (rec && Array.isArray(rec.notes) ? rec.notes : [])) { all++; if (n && n.d && today && n.d < today) due++; }
  }
  return { all, due };
}

/**
 * 🤔 오답 노트 회차 결과 반영 — 개념의 통과·라이트너는 건드리지 않는다 (연습). 맞히면 노트에서 지우고,
 * 틀리면 날짜를 오늘로 밀어 내일 이후에 다시 나오게 한다. 얼굴별 누적·오개념은 그 개념에 쌓이고, 일지에는 'notes' 한 줄.
 * @param {Array<{id:string, key:string, k:string, ok:0|1, tag?:string, fx?:0|1}>} qs
 */
export function applyNotesRound(m, qs, today) {
  m.concepts = m.concepts || {};
  m.miss = m.miss || {};
  let ok = 0;
  for (const q of (qs || [])) {
    if (!q || !q.id) continue;
    const rec = m.concepts[q.id];
    if (!rec) continue;
    rec.kinds = rec.kinds || {};
    rec.miss = rec.miss || {};
    rec.notes = Array.isArray(rec.notes) ? rec.notes : [];
    if (q.k) { const kk = rec.kinds[q.k] || [0, 0]; rec.kinds[q.k] = [kk[0] + (q.ok ? 1 : 0), kk[1] + 1]; }
    if (q.ok) { ok++; rec.notes = rec.notes.filter((n) => n.key !== q.key); markCleared(rec, q.key); }
    else {
      if (q.tag) { rec.miss[q.tag] = (rec.miss[q.tag] || 0) + 1; m.miss[q.tag] = (m.miss[q.tag] || 0) + 1; }
      const n = rec.notes.find((x) => x.key === q.key);
      if (n) { n.d = today; n.t = Date.now(); n.again = (n.again || 0) + 1; if (q.tag) n.tag = q.tag; if (q.fx !== undefined) n.fx = q.fx ? 1 : 0; }
    }
  }
  pushLog(m, { d: today, t: Date.now(), id: 'notes', mode: 'notes', ok, n: (qs || []).length,
    qs: (qs || []).map((q) => ({ k: q.k, c: q.id, ok: q.ok ? 1 : 0, ...(q.tag ? { tag: q.tag } : {}), ...(q.fx === undefined ? {} : { fx: q.fx ? 1 : 0 }) })) });
  return { ok, total: (qs || []).length };
}

/** 아이에게 보여 주지 않는 진단용 이름표 — 부모 화면(📊)에는 그대로 쌓인다 */
export const META_TAGS = new Set(['오개념을 못 짚음', '틀린 줄 모름', '개념을 다르게 이해함', '계산 실수', '엉뚱한 수', '오개념']);
export function kidTags(tags) {
  return [...new Set((tags || []).filter((t) => t && !META_TAGS.has(t)))];
}

/** 개념 이름 (id → 이름). 없으면 id 그대로 */
export function nameOf(id) {
  const c = FRACTION.find((x) => x.id === id);
  return c ? c.name : id;
}

/** 📊용 요약 — 배운 개념 수·👑 수·헷갈리는 오개념 TOP */
export function mathSummary(m) {
  const rows = ladderOf(m, '9999-12-31');
  const done = rows.filter((r) => r.state === 'done').length;
  const crowned = rows.filter((r) => r.crowned).length;
  const miss = Object.entries((m && m.miss) || {}).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([tag, n]) => ({ tag, n }));
  return { total: rows.length, done, crowned, rounds: (m && m.rounds) || 0, miss, logged: ((m && m.log) || []).length };
}

export const KIND_SHORT = { calc: '①계산', misread: '②오개념', why: '③왜', special: '⭐특별' };

/**
 * 📊 개념별 보고 — 한 편이라도 푼 개념만. 부모가 "어디서 자꾸 틀리다 언제 나아졌나"를 보는 자리.
 *   trail: 최근 편의 통과 여부(오래된 → 최근), weak: 정답률이 제일 낮은 얼굴(2문항 이상), miss: 이 개념의 오개념 TOP3
 */
export function conceptReport(m, limit = 8) {
  const log = (m && Array.isArray(m.log)) ? m.log : [];
  return Object.entries((m && m.concepts) || {}).map(([id, rec]) => {
    const mine = log.filter((e) => e.id === id);
    // 🤔 노트 회차(id 'notes')의 이 개념 문항들 — 편의 통과/실패 흔적(trail)에는 안 넣고, 바로 고침·활동에만 센다
    const noteQs = log.filter((e) => e.id === 'notes').flatMap((e) => (e.qs || []).filter((q) => q.c === id));
    const trail = mine.slice(-limit).map((e) => ({ d: e.d, ok: e.ok, n: e.n, pass: e.n > 0 && e.ok === e.n, mode: e.mode }));
    const kinds = Object.entries(rec.kinds || {}).map(([k, v]) => ({ k, label: KIND_SHORT[k] || k, ok: v[0], n: v[1], rate: v[1] ? v[0] / v[1] : 1 }));
    const weak = kinds.filter((x) => x.n >= 2).sort((a, b) => a.rate - b.rate)[0] || null;
    const miss = Object.entries(rec.miss || {}).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([tag, n]) => ({ tag, n }));
    const rounds = (rec.passes || 0) + (rec.fails || 0);
    const fixed = mine.reduce((a, e) => a + (e.qs || []).filter((q) => q.fx === 1).length, 0) + noteQs.filter((q) => q.fx === 1).length; // 🔁 틀렸다가 쌍둥이로 바로 고친 문항 수 (남아 있는 일지 안에서)
    // 진단으로만 "안다"가 된 개념(passes 1은 진단의 것)은 한 편도 안 푼 것이라 표에 안 올린다 — 복습에서 풀면 일지가 생겨 올라온다
    const noteList = (Array.isArray(rec.notes) ? rec.notes : []).map((n) => ({ k: n.k, label: KIND_SHORT[n.k] || n.k || '', tag: n.tag || '', d: n.d || '', again: n.again || 0, fx: n.fx }));
    const notes = noteList.length;
    return { id, name: nameOf(id), done: !!rec.done, box: rec.box || 0, rounds, passes: rec.passes || 0, fails: rec.fails || 0, trail, kinds, weak, miss, fixed, notes, noteList, lastAt: rec.lastAt || 0, placedOnly: !!rec.placed && !mine.length && !noteQs.length };
  }).filter((r) => r.trail.length || r.notes || (r.rounds > 0 && !r.placedOnly)).sort((a, b) => b.lastAt - a.lastAt); // 🤔 노트만 있는 개념(진단으로 안 것)도 표에 — 못 고친 유형을 보여 줘야 한다
}

/**
 * 📋 아빠가 Claude에게 붙여 넣을 글 — 개념별 요약 + 최근 일지. JSON보다 짧고 사람이 읽을 수 있다.
 * (내보내기 JSON에도 math 레코드가 통째로 들어가지만, 폰에서 대화창에 붙이기엔 이게 낫다)
 */
export function mathReportText(m, today) {
  const s = mathSummary(m);
  const lines = [`🔢 신코치 수학 기록 (${today}) — 개념 ${s.done}/${s.total} 배움 · 👑 ${s.crowned} · 지금까지 ${s.rounds}편`];
  for (const r of conceptReport(m, 12)) {
    const trail = r.trail.map((t) => (t.pass ? '✔' : `✘${t.ok}/${t.n}`)).join(' ');
    const kinds = r.kinds.map((k) => `${k.label} ${k.ok}/${k.n}`).join(', ');
    const miss = r.miss.map((x) => `${x.tag}×${x.n}`).join(', ');
    lines.push(`- ${r.name}${r.done ? (r.box >= GRADUATED ? ' 👑' : ' ✅') : ''}: ${r.passes}통과/${r.fails}실패 · ${trail}${kinds ? ` · ${kinds}` : ''}${miss ? ` · 헷갈림: ${miss}` : ''}${r.fixed ? ` · 바로 고침 ${r.fixed}` : ''}${r.notes ? ` · 🤔 다시 볼 유형 ${r.notes}` : ''}`);
  }
  if (s.miss.length) lines.push(`전체 오개념 TOP: ${s.miss.map((x) => `${x.tag}×${x.n}`).join(', ')}`);
  const log = ((m && m.log) || []).slice(-30);
  if (log.length) {
    lines.push('', `최근 ${log.length}편 (날짜 · 개념 · 결과 · 문항별 정오와 오개념):`);
    for (const e of log) {
      const qs = (e.qs || []).map((q) => `${(KIND_SHORT[q.k] || q.k || '?').slice(0, 1)}${q.ok ? '○' : '✘'}${q.tag ? `(${q.tag})` : ''}${q.fx === 1 ? '→고침' : q.fx === 0 ? '→또틀림' : ''}${q.c ? `[${nameOf(q.c)}]` : ''}`).join(' ');
      lines.push(`${e.d} ${e.id === 'diag' ? '📏진단' : e.id === 'notes' ? '🤔오답노트' : nameOf(e.id)} ${e.mode || ''} ${e.ok}/${e.n} ${qs}`);
    }
  }
  return lines.join('\n');
}
