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
export function applyPlacement(m, answers, today, strand = 'fraction') {
  const { startId, knownIds } = placeFrom(answers);
  m.placed = m.placed || {};
  m.placed[strand] = today;
  m.concepts = m.concepts || {};
  for (const id of knownIds) {
    if (m.concepts[id] && m.concepts[id].done) continue; // 이미 배운 것은 그대로
    m.concepts[id] = { done: true, box: 1, dueAt: addDays(today, PLACED_RECHECK_DAYS), passes: 1, fails: 0, lastAt: Date.now(), placed: true };
  }
  return { startId, knownIds };
}

/**
 * 개념 한 편의 결과 반영.
 * @param {object} m 복사본
 * @param {string} id 개념
 * @param {{correct:number, total:number, missTags:string[]}} r
 * @returns {{passed:boolean, first:boolean, crowned:boolean, review:boolean}}
 */
export function applyRound(m, id, r, today) {
  m.concepts = m.concepts || {};
  m.miss = m.miss || {};
  const rec = m.concepts[id] || { done: false, box: 0, dueAt: '', passes: 0, fails: 0, lastAt: 0 };
  const passed = r.total > 0 && r.correct === r.total;
  const wasDone = !!rec.done;
  const wasCrowned = wasDone && (rec.box || 0) >= GRADUATED;
  let review = false;
  if (!wasDone) {
    if (passed) { rec.done = true; Object.assign(rec, enroll(today)); rec.passes = (rec.passes || 0) + 1; }
    else rec.fails = (rec.fails || 0) + 1;
  } else {
    review = true;
    Object.assign(rec, schedule(rec.box || 0, passed, today));
    if (passed) rec.passes = (rec.passes || 0) + 1; else rec.fails = (rec.fails || 0) + 1;
  }
  rec.lastAt = Date.now();
  delete rec.placed;
  m.concepts[id] = rec;
  for (const t of (r.missTags || [])) if (t) m.miss[t] = (m.miss[t] || 0) + 1;
  m.rounds = (m.rounds || 0) + 1;
  const crowned = rec.done && (rec.box || 0) >= GRADUATED && !wasCrowned;
  return { passed, first: !wasDone && passed, crowned, review };
}

/** 한 편의 보상 계산 (지급은 화면이 한다) */
export function roundReward(result, correct) {
  let xp = correct * REWARD.q.xp;
  let coin = correct * REWARD.q.coin;
  let catchOnce = false;
  if (result.first) { xp += REWARD.firstPass.xp; coin += REWARD.firstPass.coin; catchOnce = true; }
  else if (result.review && result.passed) { xp += REWARD.reviewPass.xp; coin += REWARD.reviewPass.coin; }
  if (result.crowned) { xp += REWARD.crown.xp; coin += REWARD.crown.coin; }
  return { xp, coin, catchOnce };
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
  return { total: rows.length, done, crowned, rounds: (m && m.rounds) || 0, miss };
}
