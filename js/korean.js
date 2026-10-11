// 📚 국어 — 읽기 줄기 + 작품 도감의 규칙 (순수 — 화면 없음, 아무것도 import하지 않는다: db·check.mjs·테스트가 그대로 부른다)
// 화면은 koreanview.js, 글은 coach/korean/reading.json(사람이 씀 — checkContent가 배포 전에 검사, tools/check.mjs)
//
// 아버님 (2026-10-10·11): "앞으로 교과서에 자주 나올 유명한 작품에 게임 요소와 함께 익숙해지게 + 네가 생각하는 국어 교과에 도움이 되게" ·
//   맞춤법은 안 한다 · 방향 제안(읽기 줄기 + 작품 도감) → "샘플부터" → 샘플 검수 페이지 → "우선 만들고 적용한 후에 반응을 보자"
// 설계 (샘플을 그대로 앱으로):
//  · 글 한 편 = 도감 카드 한 장 — 📄 연습(신코치가 쓴 글) · ✨ 명작(저작권이 끝난 작품, 원문을 오늘 맞춤법으로)
//    (📘 교과서 카드 — 저작권이 있어 원문 없이 제목·지은이·단원·질문만 — 는 나중)
//  · 물음은 네 보기 하나 고르기 — 틀린 보기 = 흔한 잘못 읽기(수학의 틀린 생각처럼, TYPES) · 맞히면 🔍 근거 잡기(그렇게 생각한 문장 누르기 —
//    국어 문제는 "답이 둘로 읽히는 것"이 가장 위험해서, 근거 문장을 정해 두고 채점을 분명하게)
//  · 다 풀면 ★: 처음 ★ · 다른 날 다시 ★★ · 처음 날부터 STAR3_DAYS일 지나 다시 ★★★ (수학 🥚 → 🐣처럼 다시 보기) — 별마다 💰 한 번
// 저장의 집 규칙(메모 profile-merge-invariants):
//  · 받은 별 = profile.korDone { '카드id:별': 그날 번호(dayNum) } — 병합 합집합(이른 날) → 두 창·옛 백업으로 같은 별을 두 번 못 받는다
//  · 잘못 읽기 횟수 = profile.korMiss { 종류: 수 } — 늘어나기만(병합 max)
//  · 💰는 별과 같은 트랜잭션(db.applyHouseRule = mutateProfile) · 날은 규칙을 돌리는 때(트랜잭션 안의 now)로 센다

/** 틀린 보기의 종류 = 흔한 잘못 읽기 — name 이름 · what 뜻(아빠용) · hint 아이에게 주는 힌트 */
export const TYPES = {
  make: { name: '지어내기', what: '글에 없는 내용이나 마음을 만들어 냄', hint: '글에 그런 말이 있나요? 글에 있는 것만 가지고 짐작해요.' },
  flip: { name: '거꾸로 읽기', what: '글과 반대로 읽음', hint: '글을 다시 읽어 보세요. 반대로 쓰여 있어요.' },
  time: { name: '때 헷갈리기', what: '다른 때에 일어난 일을 끌어옴', hint: '그건 다른 때에 일어난 일이에요. 언제 일어났는지 보세요.' },
  link: { name: '엉뚱한 연결', what: '묻는 것과 상관없는 내용을 이어 붙임', hint: '그 내용은 이 물음과 이어지지 않아요.' },
  literal: { name: '글자만 보기', what: '쓰인 낱말·문장만 보고 묻는 것에 답하지 않음', hint: '글에 쓰인 걸 그대로 골랐어요. 묻는 것에 대한 답이 되나요?' },
  detail: { name: '세부만 보기', what: '글 전체가 아니라 한 부분을 고름', hint: '글의 한 부분만 말하고 있어요. 글 전체가 하는 말은 무엇일까요?' },
  fo: { name: '사실·의견 헷갈리기', what: '글쓴이의 생각·짐작을 사실로(또는 거꾸로) 봄', hint: '그건 확인할 수 있는 일인가요, 글쓴이의 생각인가요?' },
};

/** 카드 종류 */
export const KINDS = { practice: '📄 연습 카드', classic: '✨ 명작 카드' };

/** 별마다 💰 — 수학 개념 편과 같은 크기(처음 다 맞힘 12 · 복습 통과 8 · 👑 이해 완료 20, mathprog.REWARD) */
export const KOR_COINS = { 1: 12, 2: 8, 3: 20 };
/** ★★★는 처음 ★을 받은 날부터 이만큼 지나 다시 읽으면 */
export const STAR3_DAYS = 7;
/** 한 번 다 읽을 때 셀 수 있는 잘못 읽기 수(종류마다) — 보기가 넷이라 틀린 보기는 물음마다 셋, 물음은 많아야 다섯 */
export const MISS_MAX = 15;

const CIRC = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
const nonEmpty = (s) => typeof s === 'string' && s.trim().length > 0;

/** 번호 → ① (20까지) */
export function circled(n) {
  return CIRC[n - 1] || String(n);
}

/** 카드의 줄 수 (이야기·설명은 문장, 시는 줄) */
export function lineCount(card) {
  if (Array.isArray(card && card.lines)) return card.lines.length;
  if (Array.isArray(card && card.stanzas)) return card.stanzas.reduce((n, s) => n + (Array.isArray(s) ? s.length : 0), 0);
  return 0;
}
/** n번째(1부터) 문장·줄 */
export function lineText(card, n) {
  if (Array.isArray(card.lines)) return card.lines[n - 1];
  return card.stanzas.flat()[n - 1];
}
/** 근거를 세는 말 — 시는 "줄", 나머지는 "문장" */
export function unitOf(card) {
  return Array.isArray(card && card.stanzas) ? '줄' : '문장';
}

/** 그 시각의 **이 기기 날짜**로 센 날 번호 (1970-01-01 = 0) — "다른 날"·"7일 뒤"를 달력으로 센다 (자정을 넘기면 다음 날) */
export function dayNum(now) {
  const d = new Date(Number(now));
  if (!Number.isFinite(d.getTime())) return 0;
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
}

const starKey = (id, s) => `${id}:${s}`;
/** 받은 날 번호 (없거나 깨졌으면 0 — 깨진 것도 "받음"으로는 센다) */
function dayOf(done, id, s) {
  if (!own(done, starKey(id, s))) return null;
  const n = Math.floor(Number(done[starKey(id, s)]));
  return Number.isSafeInteger(n) && n > 0 ? n : 0;
}

/** 그 카드의 별 수 0~3 — ★부터 차례로 있는 것만 (★★만 있고 ★이 없는 깨진 기록은 0) */
export function starsOf(done, id) {
  let s = 0;
  while (s < 3 && dayOf(isObj(done) ? done : {}, id, s + 1) !== null) s++;
  return s;
}

/**
 * 지금 다 읽으면 받을 별 → { star: 1|2|3 } 또는 { star: 0, why: 'today' | 'wait' | 'full', days? }
 *  'today' ★은 받았고 오늘은 더 없음(내일 다시) · 'wait' ★★까지 받았고 days일 뒤 ★★★ · 'full' ★★★ 다 모음
 */
export function nextStar(done, id, now) {
  const d = isObj(done) ? done : {};
  const s = starsOf(d, id);
  const today = dayNum(now);
  if (s >= 3) return { star: 0, why: 'full' };
  if (s === 0) return { star: 1 };
  const first = dayOf(d, id, 1);
  if (s === 1) {
    const last = first;
    return today > last ? { star: 2 } : { star: 0, why: 'today' };
  }
  const gap = today - first;
  if (gap >= STAR3_DAYS && today > (dayOf(d, id, 2) || 0)) return { star: 3 };
  return { star: 0, why: 'wait', days: Math.max(1, STAR3_DAYS - gap) };
}

/** 잘못 읽기 횟수 고쳐 읽기 — 아는 종류만, 안전한 0 이상 정수만 */
export function missOf(m) {
  const out = {};
  if (!isObj(m)) return out;
  for (const k of Object.keys(TYPES)) {
    const n = Math.floor(Number(m[k]));
    if (Number.isSafeInteger(n) && n > 0) out[k] = n;
  }
  return out;
}
/** 병합 — 종류마다 큰 쪽 (늘어나기만 하는 카운터) */
export function mergeMiss(a, b) {
  const x = missOf(a);
  const y = missOf(b);
  const out = { ...x };
  for (const k of Object.keys(y)) out[k] = Math.max(out[k] || 0, y[k]);
  return out;
}

/**
 * 글 한 편을 다 읽었다 — 한 트랜잭션에서: 잘못 읽기 횟수 더하기 · 받을 별이 있으면 별 + 💰.
 * ids = 지금 있는 카드 id들(모르는 카드로 💰를 받지 못하게) · misses = { 종류: 이번에 고른 수 } · now = 트랜잭션 안의 시각
 * why: 'unknown' 모르는 카드
 * @returns {{ok:boolean, why?:string, star?:number, coins?:number, stars?:number, wait?:string, days?:number}}
 *   star 0이면 wait('today'|'wait'|'full')·days
 */
export function korFinishRule(profile, cardId, now, misses, ids) {
  if (typeof cardId !== 'string' || !Array.isArray(ids) || !ids.includes(cardId)) return { ok: false, why: 'unknown' };
  const add = missOf(misses);
  const cur = missOf(profile.korMiss);
  for (const k of Object.keys(add)) cur[k] = (cur[k] || 0) + Math.min(MISS_MAX, add[k]);
  profile.korMiss = cur;
  const done = isObj(profile.korDone) ? { ...profile.korDone } : {};
  const next = nextStar(done, cardId, now);
  if (!next.star) {
    profile.korDone = done;
    return { ok: true, star: 0, coins: 0, stars: starsOf(done, cardId), wait: next.why, ...(next.days ? { days: next.days } : {}) };
  }
  done[starKey(cardId, next.star)] = dayNum(now) || 1;
  profile.korDone = done;
  const coins = KOR_COINS[next.star];
  profile.coins = (Number(profile.coins) || 0) + coins;
  profile.coinsEarned = (Number(profile.coinsEarned) || 0) + coins;
  return { ok: true, star: next.star, coins, stars: starsOf(done, cardId) };
}

/**
 * 원고(coach/korean/reading.json) 형식 검사 → 틀린 곳 목록(비면 통과). check.mjs·테스트·화면(깨진 카드는 빼고 그림)이 같이 쓴다.
 * 국어 문제는 답이 계산으로 검사되지 않으니, 모양이라도 빈틈없이:
 *  카드 id K숫자(겹치지 않음) · 종류 · 제목 · 글은 lines(문장) 또는 stanzas(시) 하나 · 명작은 지은이·출처(facts) ·
 *  물음 id = 카드id-차례 · 보기 넷·서로 다름 · 정답 하나 · 틀린 보기마다 종류(TYPES)와 까닭 · 근거는 있는 문장 번호(차례대로·겹치지 않음) ·
 *  근거가 있으면 근거 물음과 풀이, 없으면 다 푼 뒤 풀이 · 글에 쓴 ①②… 번호는 그 글에 있는 번호만
 */
export function checkContent(data) {
  const errs = [];
  const cards = data && Array.isArray(data.cards) ? data.cards : null;
  if (!cards || !cards.length) return ['cards가 없어요'];
  const ids = new Set();
  for (const c of cards) errs.push(...checkCard(c, ids));
  return errs;
}

/** 카드 하나 검사 (ids = 이미 본 카드 id — 겹침) */
export function checkCard(c, ids = new Set()) {
  const errs = [];
  const at = (m) => errs.push(`${(c && c.id) || '?'}: ${m}`);
  if (!isObj(c)) return ['카드가 객체가 아니에요'];
  const idOk = typeof c.id === 'string' && /^K\d{1,3}$/.test(c.id);
  if (!idOk) at('id는 K숫자');
  else if (ids.has(c.id)) at('id가 겹쳐요');
  else ids.add(c.id);
  if (!own(KINDS, c.kind)) at('kind는 practice 또는 classic');
  for (const k of ['title', 'genre', 'icon', 'skill']) if (!nonEmpty(c[k])) at(`${k}가 비었어요`);
  if (!Array.isArray(c.meta) || !c.meta.length || !c.meta.every(nonEmpty)) at('meta(만나는 곳·성취기준)가 비었어요');
  const hasLines = Array.isArray(c.lines);
  const hasStanzas = Array.isArray(c.stanzas);
  if (hasLines === hasStanzas) at('글은 lines 또는 stanzas 하나만');
  if (hasLines && (!c.lines.length || c.lines.length > 20 || !c.lines.every(nonEmpty))) at('lines는 1~20개의 문장');
  if (hasStanzas && (!c.stanzas.length || !c.stanzas.every((s) => Array.isArray(s) && s.length && s.every(nonEmpty)) || lineCount(c) > 20)) at('stanzas는 연마다 줄 하나 이상(모두 20줄까지)');
  if (c.kind === 'classic') {
    if (!nonEmpty(c.author)) at('명작은 지은이가 있어야 해요');
    if (!Array.isArray(c.facts) || !c.facts.length || !c.facts.every((f) => Array.isArray(f) && f.length === 2 && nonEmpty(f[0]) && nonEmpty(f[1]))) at('명작은 facts([이름, 내용])가 있어야 해요');
    else if (!c.facts.some((f) => f[0] === '저작권')) at('명작은 저작권 줄이 있어야 해요');
  }
  const n = lineCount(c);
  const refs = (s, where) => {
    for (const ch of String(s || '')) {
      const k = CIRC.indexOf(ch);
      if (k >= 0 && k + 1 > n) at(`${where}: ${ch}은 글에 없는 번호`);
    }
  };
  if (!Array.isArray(c.qs) || !c.qs.length || c.qs.length > 5) { at('물음은 1~5개'); return errs; }
  c.qs.forEach((q, i) => {
    const qid = `${c.id}-${i + 1}`;
    const qat = (m) => at(`${qid} ${m}`);
    if (!isObj(q)) { qat('물음이 객체가 아니에요'); return; }
    if (idOk && q.id !== qid) qat(`id는 ${qid}`); // 카드 id가 깨졌으면 그 오류 하나로(물음마다 따라 나오지 않게)
    if (!nonEmpty(q.q)) qat('물음 글이 비었어요');
    if (!nonEmpty(q.skill)) qat('skill이 비었어요');
    refs(q.q, `${qid} 물음`);
    if (!Array.isArray(q.opts) || q.opts.length !== 4) { qat('보기는 넷'); return; }
    const texts = new Set();
    let ok = 0;
    q.opts.forEach((o, k) => {
      if (!isObj(o) || !nonEmpty(o.t)) { qat(`보기 ${k + 1} 글이 비었어요`); return; }
      if (texts.has(o.t)) qat(`보기 ${k + 1}가 다른 보기와 같아요`);
      texts.add(o.t);
      if (o.ok === true) { ok++; if (own(o, 'type') || own(o, 'why')) qat('정답 보기에 type·why는 없어요'); return; }
      if (own(o, 'ok')) qat(`보기 ${k + 1}의 ok는 true만`);
      if (!own(TYPES, o.type)) qat(`보기 ${k + 1}의 type(잘못 읽기)이 없거나 모르는 것`);
      if (!nonEmpty(o.why)) qat(`보기 ${k + 1}의 why(왜 틀렸나)가 비었어요`);
      refs(o.why, `${qid} 보기 ${k + 1}`);
    });
    if (ok !== 1) qat(`정답은 하나(지금 ${ok})`);
    if (q.ev === null || q.ev === undefined) {
      if (!nonEmpty(q.doneNote)) qat('근거 잡기가 없으면 doneNote(다 푼 뒤 풀이)가 있어야 해요');
      if (own(q, 'evQ') || own(q, 'evNote')) qat('근거 잡기가 없는데 evQ·evNote가 있어요');
      refs(q.doneNote, `${qid} 풀이`);
    } else {
      const ev = q.ev;
      if (!Array.isArray(ev) || !ev.length || !ev.every((x) => Number.isInteger(x) && x >= 1 && x <= n)) qat(`ev는 1~${n} 문장 번호`);
      else if (ev.some((x, k) => k > 0 && x <= ev[k - 1])) qat('ev는 작은 번호부터, 겹치지 않게');
      if (!nonEmpty(q.evQ)) qat('근거 물음(evQ)이 비었어요');
      if (!nonEmpty(q.evNote)) qat('근거 풀이(evNote)가 비었어요');
      if (own(q, 'doneNote')) qat('근거 잡기가 있으면 풀이는 evNote 하나만');
      refs(q.evNote, `${qid} 근거 풀이`);
    }
  });
  return errs;
}

/** 쓸 수 있는 카드만 (깨진 카드는 빼고 그린다 — 배포 전 check.mjs가 막지만 마지막 보루) */
export function validCards(data) {
  const ids = new Set();
  return (data && Array.isArray(data.cards) ? data.cards : []).filter((c) => !checkCard(c, ids).length);
}
