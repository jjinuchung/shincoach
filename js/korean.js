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

/** 틀린 보기의 종류 = 흔한 잘못 읽기 — name 이름 · what 뜻(아빠용) · hint 아이에게 주는 힌트 ·
 *  hintL 🎧 듣기 카드에서 주는 힌트(글이 안 보이니 "들은 말"로 — v245) */
export const TYPES = {
  make: { name: '지어내기', what: '글에 없는 내용이나 마음을 만들어 냄', hint: '글에 그런 말이 있나요? 글에 있는 것만 가지고 짐작해요.', hintL: '들은 말에 그런 내용이 있었나요? 들은 것만 가지고 짐작해요.' },
  flip: { name: '거꾸로 읽기', what: '글과 반대로 읽음', hint: '글을 다시 읽어 보세요. 반대로 쓰여 있어요.', hintL: '다시 들어 보세요. 반대로 말했어요.' },
  time: { name: '때 헷갈리기', what: '다른 때에 일어난 일을 끌어옴', hint: '그건 다른 때에 일어난 일이에요. 언제 일어났는지 보세요.', hintL: '그건 다른 때의 일이에요. 언제라고 했는지 다시 들어 보세요.' },
  link: { name: '엉뚱한 연결', what: '묻는 것과 상관없는 내용을 이어 붙임', hint: '그 내용은 이 물음과 이어지지 않아요.', hintL: '들은 내용이지만 이 물음과는 이어지지 않아요.' },
  literal: { name: '글자만 보기', what: '쓰인 낱말·문장만 보고 묻는 것에 답하지 않음', hint: '글에 쓰인 걸 그대로 골랐어요. 묻는 것에 대한 답이 되나요?', hintL: '들은 말을 그대로 골랐어요. 묻는 것에 대한 답이 되나요?' },
  detail: { name: '세부만 보기', what: '글 전체가 아니라 한 부분을 고름', hint: '글의 한 부분만 말하고 있어요. 글 전체가 하는 말은 무엇일까요?', hintL: '들은 내용의 한 부분만 말하고 있어요. 전체가 하는 말은 무엇일까요?' },
  fo: { name: '사실·의견 헷갈리기', what: '글쓴이의 생각·짐작을 사실로(또는 거꾸로) 봄', hint: '그건 확인할 수 있는 일인가요, 글쓴이의 생각인가요?', hintL: '그건 확인할 수 있는 일인가요, 말한 사람의 생각인가요?' },
  // v236 (5-2 「올바른 문장으로 글을 써요」 — 문장의 호응): 맞춤법이 아니라 문장 짜임
  agree: { name: '짜임 놓치기', what: '문장의 앞뒤(주어·목적어·때를 나타내는 말과 서술어)가 어울리는지 놓침', hint: '문장의 처음과 끝만 이어 읽어 보세요. 어울리나요?', hintL: '문장의 처음과 끝만 이어 보세요. 어울리나요?' },
};

/** 🎧 듣기 카드 (v245, 2026-10-12 아버님 "이대로 진행") — 글 대신 소리로 듣고 답한다. 원고 꼴 = 연습 카드 + listen { who }
 *  · who = 말하는 사람(대화·토의 — 줄마다 "이름: 말", 사람마다 목소리 높낮이를 달리) · 빈 목록이면 한 사람(안내 방송·발표·메시지·이야기)
 *  · 글이 보이지 않으니: 근거 잡기 없음 · 물음·보기·풀이에 문장 번호(①…) 없음 · 📖 낱말·✍️ 쓰기 없음 ·
 *    읽어 주기가 이상하게 읽는 글자(숫자·가운뎃점·괄호·물결·빗금) 없음 — 수는 "여덟 시 사십 분"처럼 한글로 */
export const LISTEN_KIND = '🎧 듣기 카드';
export const LISTEN_WHO_MAX = 4;
export const LISTEN_LINES = { min: 6, max: 16 };
export const LISTEN_LINE_MAX = 90;
/** 듣기 카드인가 */
export function isListen(card) {
  return !!card && isObj(card.listen);
}
/** 줄 → { who 말하는 사람('' = 한 사람), text 읽을 말 } — who 목록에 있는 이름 + ": "로 시작하는 줄만 사람을 가른다 */
export function speakerOf(card, line) {
  const s = String(line || '');
  const who = card && isObj(card.listen) && Array.isArray(card.listen.who) ? card.listen.who : [];
  const k = s.indexOf(': ');
  if (k > 0 && who.includes(s.slice(0, k))) return { who: s.slice(0, k), text: s.slice(k + 2) };
  return { who: '', text: s };
}

/** 카드 종류 */
export const KINDS = { practice: '📄 연습 카드', classic: '✨ 명작 카드' };
/** ⭐ 미리보기 카드(pre) — 5학년 단원 밖, 다음 학교에서 만날 작품을 미리 (v244, 수학 M9 ⭐ 중1 미리보기처럼) ·
 *  도감 맨 뒤에 따로 · 잠그지 않고 보상은 같다 · 작품이 학년마다·출판사마다 달라 "중1"이 아니라 "중학교"로 */
export const PRE = { '중학교': '⭐ 중학교 미리보기' };
/** 글 꼴(layout, v261) — rows면 문장마다 줄을 바꾼다(극본의 대사 · 두 사람의 글 · 기사 제목처럼 줄이 나뉘어야 읽기 쉬운 글 · v266 토의·독서 모임 기록) · 없으면 이어 쓴 문단 */
export const LAYOUTS = { rows: '문장마다 줄 바꿈' };
/** 이름: 말 꼴처럼 보이는 줄 — 🎧 who가 빈 듣기 카드에서 막고(한 사람 글인데 사람 이름처럼 읽히지 않게) · 읽는 글은 rows를 요구한다(v266) */
const LOOKS_SPEAKER = /^[가-힣]{1,6}: /;
/** 글 상자를 문장마다 줄 바꿔 보일까 (v266) — layout rows이거나, 말하는 사람이 있는 🎧 듣기 카드(대화·토의)를 📄 글로 읽을 때 */
export function rowsLayout(card) {
  if (!card) return false;
  if (card.layout === 'rows') return true;
  return isListen(card) && Array.isArray(card.listen.who) && card.listen.who.length > 0;
}
/** 바탕 글(source, v265) — 신문 기사처럼 다른 글을 바탕으로 신코치가 다시 쓴 연습 글은 무엇을 바탕으로 했는지 글 아래에 작게 밝힌다 ·
 *  명작은 facts의 원문·저작권 줄로 밝히므로 연습 카드에만 */
export const SOURCE_MAX = 120;

/** ✍️ 서술형 답 글자 수 (공백 정리 뒤) — 규칙은 korwrite.js, 원고 검사(write.model)도 같은 값 (v237) */
export const WRITE_MIN = 10;
export const WRITE_MAX = 200;
/** ✍️ 🧩 문장 틀의 빈자리 — 틀마다 하나까지, 누르면 그 자리에 커서 (v240) · 틀은 2~4개, 스스로 확인(checks)은 2~3줄 */
export const FRAME_GAP = '~';
export const FRAMES_MAX = 4;
export const CHECKS_MAX = 3;
export const FRAME_LEN_MAX = 40;
/** ✍️ 옛 채점 기준 판(write.past)은 몇 개까지 — 답장 기다리는 글이 그 판으로 남아 있을 동안만 있으면 된다 (v243) */
export const PAST_MAX = 5;

/** 별마다 💰 — 수학 개념 편과 같은 크기(처음 다 맞힘 12 · 복습 통과 8 · 👑 이해 완료 20, mathprog.REWARD) */
export const KOR_COINS = { 1: 12, 2: 8, 3: 20 };
/** 🟩 국어스톤 아이템 id (items.STONE_KOREAN과 같아야 한다 — 테스트로 고정) · 별을 새로 받을 때 **보기·근거를 모두 한 번에** 맞혔으면 하나
 *  (아버님 2026-10-11 "국어 스톤도 만들자" — 다른 스톤처럼 "제대로 배웠나"에서만, 글마다 많아야 별 수만큼 3개) */
export const KOR_STONE = 'stone_korean';
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
 * 지금 다 읽으면 받을 별 → { star: 1|2|3 } 또는 { star: 0, why: 'wait', next: 2|3, days } · { star: 0, why: 'full' }
 *  다음 별을 받을 수 있는 날을 직접 센다 — ★★ = 처음 날 + 1 · ★★★ = max(처음 날 + STAR3_DAYS, ★★ 날 + 1).
 *  days = 그날까지 남은 날(1이면 "내일") — 태블릿 시계를 되돌려 받은 날이 앞날이어도 남은 날이 맞게 (Codex 48차 #7: "내일"이라고 했는데 11일 뒤였다)
 */
export function nextStar(done, id, now) {
  const d = isObj(done) ? done : {};
  const s = starsOf(d, id);
  const today = dayNum(now);
  if (s >= 3) return { star: 0, why: 'full' };
  if (s === 0) return { star: 1 };
  const first = dayOf(d, id, 1);
  const at = s === 1 ? first + 1 : Math.max(first + STAR3_DAYS, (dayOf(d, id, 2) || 0) + 1);
  if (today >= at) return { star: s + 1 };
  return { star: 0, why: 'wait', next: s + 1, days: at - today };
}

/** 받은 별 병합 — 별마다 이른 날 · 바른 날(안전한 양의 정수)이 깨진 값을 이긴다 · 둘 다 깨졌으면 1(받은 것으로는 센다)
 *  (Codex 48차 #7: 공용 mergeParcels는 깨진 쪽이 먼저 오면 1이 이겨 ★★★가 엿새 일찍 열렸다 — 차례에 따라 결과가 달랐다) */
export function mergeDone(a, b) {
  const out = {};
  // 1은 "받았지만 날을 모름" 자리표시(korFinishRule·옛 병합) — 바른 날이 하나라도 있으면 그 날들의 가장 이른 날
  const ok = (v) => { const n = Math.floor(Number(v)); return Number.isSafeInteger(n) && n > 1 ? n : 0; };
  for (const side of [a, b]) {
    if (!isObj(side)) continue;
    for (const k of Object.keys(side)) {
      const v = ok(side[k]);
      if (v) out[k] = out[k] > 1 ? Math.min(out[k], v) : v;
      else if (!own(out, k)) out[k] = 1;
    }
  }
  return out;
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

/** 📤 물음마다 틀린 보기를 고른 수 (v254, 아버님 "8번을 넣자" — 국어 요약의 "자주 틀린 물음") · 열쇠 = 물음 id('K12-3') ·
 *  늘어나기만 하는 수(병합 max) · 한 번 읽을 때 물음마다 많아야 QMISS_ONCE(틀린 보기 셋) · 열쇠는 QMISS_KEYS까지 */
export const QMISS_ONCE = 3;
export const QMISS_KEYS = 600;
const QID_RE = /^K\d{1,3}-[1-5]$/;
/** 물음별 틀린 수 고쳐 읽기 — 물음 id 꼴의 열쇠만, 안전한 양의 정수만 */
export function qMissOf(m) {
  const out = {};
  if (!isObj(m)) return out;
  for (const k of Object.keys(m)) {
    if (!QID_RE.test(k)) continue;
    const n = Math.floor(Number(m[k]));
    if (Number.isSafeInteger(n) && n > 0) out[k] = n;
    if (Object.keys(out).length >= QMISS_KEYS) break;
  }
  return out;
}
/** 병합 — 물음마다 큰 쪽 */
export function mergeQMiss(a, b) {
  const out = qMissOf(a);
  const y = qMissOf(b);
  for (const k of Object.keys(y)) out[k] = Math.max(out[k] || 0, y[k]);
  return qMissOf(out);
}

// ── 🔍 근거 먼저 · 💡 둘째 힌트 (v258, 2026-10-14 아버님 "이대로 진행") ──
// 물음은 틀리면 그 보기만 꺼지고 다시 고른다 — 보기 넷 중 틀린 셋을 다 눌러 맞히는 것이 글을 다시 읽는 것보다 빨랐다.
// 그래서 틀린 보기를 EV_FIRST_AT번 고르면: 근거가 있는 물음은 남은 보기를 잠그고 답이 들어 있는 줄(근거)부터 찾게 하고,
// 근거가 없는 물음(글 전체를 보는 물음 · 🎧 듣기)은 둘째 힌트(원고 hint2 — 답을 말하지 않고 볼 곳만 짚는다)를 보인다.
// 별·💰·🎯는 그대로(🟩는 지금처럼 한 번에 다 맞혀야) — 찍기가 읽기보다 빠르지 않게 하는 것이 목적
export const EV_FIRST_AT = 2;
/** 근거 먼저에서 줄을 이만큼 잘못 누르면 근거 둘레의 줄 범위를 알려 준다 */
export const EV_RANGE_AT = 2;
/** 그 범위 — 근거 앞뒤로 이만큼 */
export const EV_RANGE_PAD = 2;
/** 둘째 힌트 글자 수 — 한두 문장 */
export const HINT2_MAX = 90;

/** 지금 근거부터 찾아야 하나 (순수) — 근거가 있고 · 아직 못 맞혔고 · 근거를 아직 못 찾았고 · 틀린 보기를 EV_FIRST_AT번 이상 골랐다 */
export function evFirstNow(q, st) {
  return !!q && Array.isArray(q.ev) && q.ev.length > 0 && !!st && !st.answered && !st.evDone && Array.isArray(st.wrong) && st.wrong.length >= EV_FIRST_AT;
}
/** 둘째 힌트를 보일 때인가 (순수) — 원고에 hint2가 있고(근거가 없는 물음) · 아직 못 맞혔고 · 틀린 보기를 EV_FIRST_AT번 이상 골랐다 */
export function hint2Now(q, st) {
  return !!q && nonEmpty(q.hint2) && !!st && !st.answered && Array.isArray(st.wrong) && st.wrong.length >= EV_FIRST_AT;
}
/** 근거 둘레 줄 범위 [처음, 끝] (순수) — 근거 가운데 **첫 줄** 앞뒤로 pad줄 (근거는 하나만 눌러도 맞다 — 근거가 ③⑤⑨처럼 흩어져 있으면
 *  모두를 감싼 범위가 글 거의 전체가 되어 도움이 안 됐다, 헤드리스 v258) · n = 글의 줄 수 · 근거가 없거나 깨졌으면 null */
export function evRange(ev, n, pad = EV_RANGE_PAD) {
  const xs = (Array.isArray(ev) ? ev : []).filter((x) => Number.isInteger(x) && x >= 1 && x <= n);
  if (!xs.length) return null;
  const at = Math.min(...xs);
  return [Math.max(1, at - pad), Math.min(n, at + pad)];
}

// ── 📤 읽은 기록 (v258 — 국어 요약 "최근 7일 읽은 글") ──
// 글을 끝까지 읽을 때마다 한 줄: 읽은 시간(⏳ 시계처럼 쉼은 빼고) · 첫 답까지 걸린 시간 · 첫 번에 맞힌 물음 · 끝까지 고른 물음 ·
// 근거 먼저 · 둘째 힌트를 쓴 수 — 막히면 어떻게 하는지 아빠·Claude가 본다. 별과 같은 트랜잭션(korFinishRule)에서 적는다.
// 저장 = profile.korReads [{ c 카드, t 연 시각(ms — 열쇠는 c@t), d 다 읽은 날 번호, s 읽은 초, a 첫 답까지 초, n 물음 수, f 첫 번에 맞힘,
//   x 오답 보기를 모두 고른 물음(요약 말 — "끝까지 고른"은 끝까지 푼 물음으로 읽혔다, Codex 69차 #4), e 근거 먼저, h 둘째 힌트, g 이번에 받은 별(0 = 별 없이 다시 읽음), m '' 글 · 'listen' 🎧 들음 · 'text' 🎧 글로 읽음,
//   q 📖 [문제 보기]를 누를 때까지 초(v260 글 먼저 — 그 전 줄과 🎧에는 없다) }]
// 병합은 열쇠로 합집합(같은 열쇠는 한 줄) · 최근 READS_MAX줄
export const READS_MAX = 120;
/** 한 줄의 읽은 초 상한 (6시간 — 깨진 시계 값이 요약을 부풀리지 않게) */
export const READ_SEC_MAX = 6 * 3600;
const READ_MODES = ['', 'listen', 'text'];
const int = (v) => { const n = Math.floor(Number(v)); return Number.isSafeInteger(n) ? n : NaN; };
const clampInt = (v, lo, hi) => { const n = int(v); return Number.isNaN(n) ? lo : Math.min(hi, Math.max(lo, n)); };
const readKey = (x) => `${x.c}@${x.t}`;

/** 읽은 기록 한 줄 고쳐 읽기 (순수) — 꼴이 틀리면 null · 수는 범위 안으로 */
export function readOf(x) {
  if (!isObj(x) || typeof x.c !== 'string' || !/^K\d{1,3}$/.test(x.c)) return null;
  const t = int(x.t);
  const d = int(x.d);
  const n = int(x.n);
  if (!(t > 0) || !(d > 1) || !(n >= 1 && n <= 5)) return null;
  const s = clampInt(x.s, 0, READ_SEC_MAX);
  const q = typeof x.q === 'number' ? int(x.q) : NaN;
  return {
    c: x.c, t, d, s, a: clampInt(x.a, 0, s), n,
    f: clampInt(x.f, 0, n), x: clampInt(x.x, 0, n), e: clampInt(x.e, 0, n), h: clampInt(x.h, 0, n),
    g: clampInt(x.g, 0, 3), m: READ_MODES.includes(x.m) ? x.m : '',
    ...(q >= 0 ? { q: Math.min(q, s) } : {}), // 📖 문제 보기까지 — 없거나 깨졌으면 뺀다(옛 줄과 같게)
  };
}
/**
 * 같은 열쇠 두 줄 가운데 남길 것 (순수) — q 말고 나머지를 견줘 큰 쪽 · 나머지가 같으면 q가 있는 쪽 · 그다음 전체 글
 *   (v260 Codex 71차 #2: 전체 글로만 견주면 q가 없는 줄이 이겼다 — "…,\"q\"" < "…}" — 옛 앱을 거친 사본이 q를 지운 채 돌아오면 q가 사라졌다)
 *   차례(누가 먼저 들어오든)와 상관없이 같은 줄이 남는다
 */
function betterRead(a, b) {
  const { q: qa, ...ra } = a;
  const { q: qb, ...rb } = b;
  const sa = JSON.stringify(ra);
  const sb = JSON.stringify(rb);
  if (sa !== sb) return sa > sb ? a : b;
  if ((qa === undefined) !== (qb === undefined)) return qa === undefined ? b : a;
  return JSON.stringify(a) >= JSON.stringify(b) ? a : b;
}
/** 읽은 기록 고쳐 읽기 (순수) — 깨진 줄은 버리고 · 같은 열쇠는 한 줄(차례와 상관없이 같은 것이 남게) · 연 시각 차례로 최근 READS_MAX줄 */
export function readsOf(list) {
  const by = new Map();
  for (const raw of Array.isArray(list) ? list : []) {
    const x = readOf(raw);
    if (!x) continue;
    const k = readKey(x);
    const had = by.get(k);
    by.set(k, had ? betterRead(had, x) : x);
  }
  return [...by.values()].sort((a, b) => a.t - b.t || (a.c < b.c ? -1 : a.c > b.c ? 1 : 0)).slice(-READS_MAX);
}
/** 병합 — 열쇠로 합집합 */
export function mergeReads(a, b) {
  return readsOf([...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])]);
}

/**
 * 글 한 편을 다 읽었다 — 한 트랜잭션에서: 잘못 읽기 횟수 더하기 · 받을 별이 있으면 별 + 💰.
 * ids = 지금 있는 카드 id들(모르는 카드로 💰를 받지 못하게) · misses = { 종류: 이번에 고른 수 } · now = 트랜잭션 안의 시각 ·
 * evMiss = 근거를 잘못 누른 수(잘못 읽기로는 안 세지만 🟩 "한 번에 다 맞힘"에는 든다) ·
 * opts.noStone = 🟩를 주지 않는다 — 🎧 듣기 카드를 글로 읽고 풀었다(별·💰·🎯는 같다, v245 아버님 "이대로 진행") ·
 * opts.qMiss = { 물음 id: 이번에 고른 틀린 보기 수 } — 이 카드의 물음만 korQMiss에 더한다(📤 국어 요약, v254) ·
 * opts.read = { t 연 시각, s 읽은 초, a 첫 답까지 초, n, f, x, e, h, m, q? 문제 보기까지 초 } — 읽은 기록 한 줄(📤, v258 · q v260). 카드·날·별은 여기서 채운다(트랜잭션 안의 now) ·
 *   같은 열쇠(카드·연 시각)가 이미 있으면 더 적지 않는다 — [다시 저장하기]가 두 줄을 만들지 않게
 * why: 'unknown' 모르는 카드
 * @returns {{ok:boolean, why?:string, star?:number, coins?:number, stars?:number, wait?:string, next?:number, days?:number}}
 *   star 0이면 wait('wait'|'full') · next(다음 별)·days(남은 날) — 별을 받았을 때도 다음 별이 남았으면 next·days
 */
export function korFinishRule(profile, cardId, now, misses, ids, evMiss = 0, opts = {}) {
  if (typeof cardId !== 'string' || !Array.isArray(ids) || !ids.includes(cardId)) return { ok: false, why: 'unknown' };
  const add = missOf(misses);
  const cur = missOf(profile.korMiss);
  for (const k of Object.keys(add)) cur[k] = Math.min(Number.MAX_SAFE_INTEGER, (cur[k] || 0) + Math.min(MISS_MAX, add[k])); // 끝에서 멈춘다(넘치면 다음 읽기에서 0이 됐다, Codex 48차 #8)
  profile.korMiss = cur;
  // 📤 물음마다 틀린 수 — 이 카드의 물음만, 한 번에 QMISS_ONCE까지 (별을 받든 안 받든 센다 — 다시 읽기에서 틀린 것도 막힌 자리다)
  const qadd = qMissOf(opts && opts.qMiss);
  const qcur = qMissOf(profile.korQMiss);
  for (const k of Object.keys(qadd)) if (k.startsWith(`${cardId}-`)) qcur[k] = Math.min(Number.MAX_SAFE_INTEGER, (qcur[k] || 0) + Math.min(QMISS_ONCE, qadd[k]));
  profile.korQMiss = qMissOf(qcur);
  const done = isObj(profile.korDone) ? { ...profile.korDone } : {};
  const next = nextStar(done, cardId, now);
  // 📤 읽은 기록 한 줄 — 별을 받든 안 받든(다시 읽기도 읽기다) · 같은 열쇠는 한 번
  const rd = opts && isObj(opts.read) ? readOf({ ...opts.read, c: cardId, d: dayNum(now), g: next.star || 0 }) : null;
  if (rd) {
    const cur = readsOf(profile.korReads);
    profile.korReads = cur.some((x) => readKey(x) === readKey(rd)) ? cur : readsOf([...cur, rd]);
  }
  if (!next.star) {
    profile.korDone = done;
    return { ok: true, star: 0, coins: 0, stars: starsOf(done, cardId), wait: next.why, ...(next.days ? { next: next.next, days: next.days } : {}) };
  }
  done[starKey(cardId, next.star)] = dayNum(now) || 1;
  // 🎯 별을 새로 받을 때마다 국어 포켓몬 잡기 한 번 (아버님 2026-10-11 — 다음 날 다시 읽어 ★★를 받아도 잡을 수 있게)
  const tw = throwsOf(profile.korThrow);
  tw.earned = Math.min(Number.MAX_SAFE_INTEGER, tw.earned + 1);
  profile.korThrow = tw;
  profile.korDone = done;
  const coins = KOR_COINS[next.star];
  // 🟩 보기도 근거도 한 번에 다 맞혔으면 국어스톤 하나 — 별을 새로 받을 때만(같은 날 다시 읽어 모으지 못하게)
  const perfect = !Object.keys(add).length && !(Number(evMiss) > 0) && !(opts && opts.noStone);
  if (perfect) profile.items = { ...(profile.items || {}), [KOR_STONE]: Math.min(Number.MAX_SAFE_INTEGER, (Math.floor(Number((profile.items || {})[KOR_STONE])) || 0) + 1) };
  profile.coins = (Number(profile.coins) || 0) + coins;
  profile.coinsEarned = (Number(profile.coinsEarned) || 0) + coins;
  // 다음 별까지 남은 날 — ★★ 뒤 "처음 읽은 날부터 일주일"은 ★★를 늦게 받으면 틀렸다(10/1 ★ · 10/11 ★★ → ★★★는 10/12, Codex 49차)
  const after = nextStar(done, cardId, now);
  return { ok: true, star: next.star, coins, stone: perfect ? 1 : 0, throws: pendingOf(tw), stars: starsOf(done, cardId), ...(after.why === 'wait' ? { next: after.next, days: after.days } : {}) };
}

// ── 🎯 국어 잡기 기회 (2026-10-11, 아버님 "국어에서만 나오는 포켓몬 150") ──
// 별을 새로 받을 때마다 한 번. 수학(mathprog.throwsOf)과 같은 꼴 — 늘어나기만 하는 세 카운터 { earned 번 수, used 뺀 수, refunded 돌려준 수 }
// 남은 기회 = earned − used + refunded. 잡기 화면을 띄우기 **전에** 하나 빼고(korTakeRule), 한 번도 안 던지고 닫으면 돌려준다(korGiveBackRule)
// → 두 창이 같은 기회를 두 번 던지지 못하고, 옛 백업이 쓴 기회를 되살리지 못한다(병합은 카운터마다 max)

const cnt = (v) => { const n = Math.floor(Number(v)); return Number.isSafeInteger(n) && n > 0 ? n : 0; };
/** 잡기 기회 고쳐 읽기 — 새 객체 { earned, used, refunded } (돌려준 수는 뺀 수를 넘지 않는다) */
export function throwsOf(t) {
  const x = isObj(t) ? t : {};
  const used = cnt(x.used);
  return { earned: cnt(x.earned), used, refunded: Math.min(cnt(x.refunded), used) };
}
/** 남은 잡기 기회 */
export function pendingOf(t) {
  const x = throwsOf(t);
  return Math.max(0, x.earned - x.used + x.refunded);
}
/** 병합 — 카운터마다 큰 쪽 */
export function mergeThrows(a, b) {
  const x = throwsOf(a);
  const y = throwsOf(b);
  return throwsOf({ earned: Math.max(x.earned, y.earned), used: Math.max(x.used, y.used), refunded: Math.max(x.refunded, y.refunded) });
}
/** 🎯 잡기 기회 하나 빼기 (잡기 화면을 띄우기 전, 한 트랜잭션) — why 'none' 남은 기회 없음 */
export function korTakeRule(profile) {
  const t = throwsOf(profile.korThrow);
  if (t.earned - t.used + t.refunded <= 0) return { ok: false, why: 'none' };
  t.used += 1;
  profile.korThrow = t;
  return { ok: true, left: pendingOf(t) };
}
/** 🎯 뺐는데 한 번도 안 던졌다 → 돌려준다 (뺀 수보다 많이 돌려주지 않는다) — why 'none' */
export function korGiveBackRule(profile) {
  const t = throwsOf(profile.korThrow);
  if (t.refunded >= t.used) return { ok: false, why: 'none' };
  t.refunded += 1;
  profile.korThrow = t;
  return { ok: true, left: pendingOf(t) };
}

/**
 * 원고(coach/korean/reading.json) 형식 검사 → 틀린 곳 목록(비면 통과). check.mjs·테스트·화면(깨진 카드는 빼고 그림)이 같이 쓴다.
 * 국어 문제는 답이 계산으로 검사되지 않으니, 모양이라도 빈틈없이:
 *  카드 id K숫자(겹치지 않음) · 종류 · 제목 · 글은 lines(문장) 또는 stanzas(시) 하나 · 명작은 지은이·출처(facts) ·
 *  물음 id = 카드id-차례 · 보기 넷·서로 다름 · 정답 하나 · 틀린 보기마다 종류(TYPES)와 까닭 · 근거는 있는 문장 번호(차례대로·겹치지 않음) ·
 *  근거가 있으면 근거 물음과 풀이, 없으면 다 푼 뒤 풀이와 💡 둘째 힌트(hint2, v258) · 글에 쓴 ①②… 번호는 그 글에 있는 번호만 ·
 *  📖 낱말 풀이(words, 없어도 됨)는 [낱말, 뜻] 여섯 개까지 — 낱말은 그 글에 나오는 말(Codex 48차 제안)
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
  if (own(c, 'pre') && !own(PRE, c.pre)) at(`pre(미리보기)는 ${Object.keys(PRE).join('·')}`);
  for (const k of ['title', 'genre', 'icon', 'skill']) if (!nonEmpty(c[k])) at(`${k}가 비었어요`);
  if (!Array.isArray(c.meta) || !c.meta.length || !c.meta.every(nonEmpty)) at('meta(만나는 곳·성취기준)가 비었어요');
  if (own(c, 'source') && (c.kind !== 'practice' || !nonEmpty(c.source) || [...c.source].length > SOURCE_MAX)) at(`source(바탕 글)는 연습 카드에 ${SOURCE_MAX}자까지의 글로`);
  const hasLines = Array.isArray(c.lines);
  const hasStanzas = Array.isArray(c.stanzas);
  if (hasLines === hasStanzas) at('글은 lines 또는 stanzas 하나만');
  if (own(c, 'layout') && (!own(LAYOUTS, c.layout) || !hasLines)) at(`layout(글 꼴)은 ${Object.keys(LAYOUTS).join('·')}만 — 문장(lines)으로 된 글에`);
  // 대사 꼴(이름: 말) 줄이 둘 이상인 읽는 글은 사람마다 줄 (v266 — 이어 쓴 문단이면 누가 한 말인지 놓친다 · 🎧 듣기 카드는 rowsLayout이 알아서)
  if (hasLines && !isListen(c) && c.layout !== 'rows' && c.lines.filter((t) => LOOKS_SPEAKER.test(String(t))).length >= 2) at('대사 꼴(이름: 말) 줄이 있는 글은 layout rows로 — 사람마다 줄을 바꿔요');
  if (hasLines && (!c.lines.length || c.lines.length > 20 || !c.lines.every(nonEmpty))) at('lines는 1~20개의 문장');
  if (hasStanzas && (!c.stanzas.length || !c.stanzas.every((s) => Array.isArray(s) && s.length && s.every(nonEmpty)) || lineCount(c) > 20)) at('stanzas는 연마다 줄 하나 이상(모두 20줄까지)');
  if (c.kind === 'classic') {
    if (!nonEmpty(c.author)) at('명작은 지은이가 있어야 해요');
    if (!Array.isArray(c.facts) || !c.facts.length || !c.facts.every((f) => Array.isArray(f) && f.length === 2 && nonEmpty(f[0]) && nonEmpty(f[1]))) at('명작은 facts([이름, 내용])가 있어야 해요');
    else if (!c.facts.some((f) => f[0] === '저작권')) at('명작은 저작권 줄이 있어야 해요');
  }
  if (own(c, 'words')) {
    const text = hasLines ? c.lines.join(' ') : hasStanzas ? c.stanzas.flat().join(' ') : '';
    if (!Array.isArray(c.words) || c.words.length > 6) at('words는 여섯 개까지의 [낱말, 뜻]');
    else c.words.forEach((w, k) => {
      if (!Array.isArray(w) || w.length !== 2 || !nonEmpty(w[0]) || !nonEmpty(w[1])) at(`words ${k + 1}은 [낱말, 뜻]`);
      else if (!text.includes(w[0])) at(`words ${k + 1} "${w[0]}"은 글에 없는 말`);
    });
  }
  const n = lineCount(c);
  const refs = (s, where) => {
    for (const ch of String(s || '')) {
      const k = CIRC.indexOf(ch);
      if (k >= 0 && k + 1 > n) at(`${where}: ${ch}은 글에 없는 번호`);
    }
  };
  if (own(c, 'write')) {
    for (const m of checkWriteItem(c.write)) at(m);
    if (isObj(c.write)) {
      refs(c.write.q, 'write.q'); refs(c.write.model, 'write.model');
      for (const [k, f] of (Array.isArray(c.write.frames) ? c.write.frames : []).entries()) refs(f, `write.frames ${k + 1}`);
      for (const [k, f] of (Array.isArray(c.write.checks) ? c.write.checks : []).entries()) refs(f, `write.checks ${k + 1}`);
    }
  }
  const listen = own(c, 'listen');
  if (listen) for (const m of checkListen(c)) at(m);
  if (!Array.isArray(c.qs) || !c.qs.length || c.qs.length > 5) { at('물음은 1~5개'); return errs; }
  c.qs.forEach((q, i) => {
    const qid = `${c.id}-${i + 1}`;
    const qat = (m) => at(`${qid} ${m}`);
    if (!isObj(q)) { qat('물음이 객체가 아니에요'); return; }
    if (listen) {
      // 🎧 글이 보이지 않는다 — 근거 잡기 없이, 문장 번호 없이 (풀이는 맞힌 바로 뒤에 나온다 — 들은 글은 다 푼 뒤에야 보인다)
      if (q.ev !== null && q.ev !== undefined) qat('듣기 카드는 근거 잡기(ev) 없이 doneNote로');
      const said = [q.q, q.doneNote, q.hint2, ...(Array.isArray(q.opts) ? q.opts.flatMap((o) => (isObj(o) ? [o.t, o.why] : [])) : [])];
      if (said.some((s) => [...String(s || '')].some((ch) => CIRC.includes(ch)))) qat('듣기 카드의 물음·보기·풀이에는 문장 번호(①…)를 쓰지 않아요 — 글이 보이지 않아요');
    }
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
      // 💡 둘째 힌트 (v258) — 두 번 틀린 뒤에 보인다 · 볼 곳만 짚고 답은 말하지 않는다(정답 보기 글이 그대로 들어 있으면 막는다)
      if (!nonEmpty(q.hint2)) qat(`근거 잡기가 없으면 hint2(틀린 보기를 ${EV_FIRST_AT}번 고른 뒤 보일 둘째 힌트)가 있어야 해요`);
      else {
        if ([...q.hint2].length > HINT2_MAX) qat(`hint2는 ${HINT2_MAX}자까지`);
        refs(q.hint2, `${qid} 둘째 힌트`);
        const bare = (s) => String(s || '').normalize('NFC').replace(/[\s.,!?'"“”‘’·…—–-]/g, '');
        const right = q.opts.find((o) => isObj(o) && o.ok === true);
        if (right && bare(right.t).length >= 2 && bare(q.hint2).includes(bare(right.t))) qat('hint2에 정답 보기 글이 그대로 있어요 — 볼 곳만 짚어 주세요');
      }
    } else {
      if (own(q, 'hint2')) qat('근거 잡기가 있는 물음은 hint2 없이 — 두 번 틀리면 근거부터 찾아요');
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

/** 🎧 읽어 주기가 이상하게 읽는 글자 — 숫자(8시 → "팔 시"로 읽는 기기) · 가운뎃점 · 괄호 · 물결 · 빗금 */
export const LISTEN_BAD_CHARS = /[0-9·()~/]/;

/**
 * 🎧 듣기 카드 검사 (checkCard가 부른다 — 카드 id는 checkCard가 붙인다)
 *  연습 카드만 · 글은 lines 6~16줄 · 줄마다 읽을 말 90자까지 · listen은 { who }만 · who는 0~4명(서로 다른 이름) ·
 *  who가 있으면 줄마다 "이름: 말"이고 모두 한 번 이상 말한다 · 없으면 "이름: "처럼 보이는 줄이 없다 ·
 *  읽을 말에 숫자·가운뎃점·괄호·물결·빗금 없음 · words·write·pre·stanzas 없음
 */
export function checkListen(c) {
  const errs = [];
  if (!isObj(c)) return ['카드가 객체가 아니에요'];
  const L = c.listen;
  if (!isObj(L)) return ['listen은 { who: [말하는 사람] }'];
  for (const k of Object.keys(L)) if (k !== 'who') errs.push(`listen에는 who만 — ${k}`);
  const who = L.who;
  const whoOk = Array.isArray(who) && who.length <= LISTEN_WHO_MAX && who.every((w) => nonEmpty(w) && /^[가-힣]{1,6}$/.test(w)) && new Set(who).size === who.length;
  if (!whoOk) errs.push(`listen.who는 0~${LISTEN_WHO_MAX}명의 서로 다른 이름(한글 1~6자)`);
  if (c.kind !== 'practice') errs.push('듣기 카드는 신코치가 쓴 연습 카드(practice)만');
  for (const k of ['words', 'write', 'pre', 'stanzas', 'layout']) if (own(c, k)) errs.push(`듣기 카드에는 ${k}가 없어요 — 글이 보이지 않아요`);
  if (!Array.isArray(c.lines)) { errs.push('듣기 카드의 글은 lines(문장)로'); return errs; }
  if (c.lines.length < LISTEN_LINES.min || c.lines.length > LISTEN_LINES.max) errs.push(`듣기 카드는 ${LISTEN_LINES.min}~${LISTEN_LINES.max}줄`);
  const spoke = new Set();
  c.lines.forEach((line, k) => {
    if (!nonEmpty(line)) return; // 빈 줄은 checkCard가 잡는다
    const s = whoOk ? speakerOf(c, line) : { who: '', text: line };
    const where = `listen ${k + 1}줄`;
    if (!whoOk) { /* who가 깨졌으면 그 오류 하나로(줄마다 따라 나오지 않게) */ } else if (who.length) {
      if (!s.who) errs.push(`${where}: "이름: 말" 꼴이 아니거나 who에 없는 이름`);
      else spoke.add(s.who);
    } else if (LOOKS_SPEAKER.test(line)) errs.push(`${where}: 한 사람 글인데 "이름: "처럼 시작해요 — who에 넣거나 바꿔 주세요`);
    if (!nonEmpty(s.text)) errs.push(`${where}: 읽을 말이 비었어요`);
    else if ([...s.text].length > LISTEN_LINE_MAX) errs.push(`${where}: 읽을 말은 ${LISTEN_LINE_MAX}자까지 — 긴 말은 기기가 중간에 끊어요`);
    if (LISTEN_BAD_CHARS.test(s.text)) errs.push(`${where}: 읽어 주기가 이상하게 읽는 글자(숫자·가운뎃점·괄호·물결·빗금) — 수는 한글로`);
  });
  if (whoOk) for (const w of who) if (!spoke.has(w)) errs.push(`listen.who "${w}"가 한 번도 말하지 않아요`);
  return errs;
}

/**
 * ✍️ 서술형 하나 검사 — { q 물음, v 채점 기준 판 번호(고치면 올린다 — 옛 글은 그 판으로 채점), rubric { must 꼭 들어갈 생각 ≥1, ok 괜찮은 다른 답, miss 흔한 잘못 }, model 예시 답,
 *   frames 🧩 문장 틀 2~4(빈자리 ~ 하나까지), checks ✔️ 보내기 전 스스로 확인 2~3 (v240 — 아이에게 보이는 것: q·frames·checks뿐) }
 * rubric·model은 공개 원고(앱은 보여 주지 않는다) — Claude가 세션이 바뀌어도 같은 잣대로 채점하려고 (Codex 51차 PART 3 #11)
 * past [{ v, q, rubric, model }] — 옛 판 (v243, Codex 52차 #8): 물음·rubric을 고칠 때 v를 올리고 지금 판을 여기로 옮긴다 —
 *   그 판으로 쓴 글은 그 판의 물음·기준으로 채점하고(korean/todo.json에 그 판의 물음), 답장의 v가 글의 판과 같아야 붙는다
 */
export function checkWriteItem(w) {
  const errs = [];
  const strs = (a) => Array.isArray(a) && a.every(nonEmpty);
  if (!isObj(w)) return ['write는 { q, v, rubric, model, frames, checks }'];
  /** 한 판의 물음·rubric·예시 답 (지금 판·옛 판 같은 검사) */
  const edition = (x, name) => {
    if (!nonEmpty(x.q)) errs.push(`${name}.q(물음)가 비었어요`);
    if (!isObj(x.rubric) || !strs(x.rubric.must) || !x.rubric.must.length) errs.push(`${name}.rubric.must(꼭 들어갈 생각)가 하나 이상`);
    else {
      if (!strs(x.rubric.ok)) errs.push(`${name}.rubric.ok(괜찮은 다른 답)는 글 목록`);
      if (!strs(x.rubric.miss)) errs.push(`${name}.rubric.miss(흔한 잘못)는 글 목록`);
    }
    if (!nonEmpty(x.model)) errs.push(`${name}.model(예시 답)이 비었어요`);
    else if ([...x.model.normalize('NFC').replace(/\s+/g, ' ').trim()].length > WRITE_MAX) errs.push(`${name}.model은 ${WRITE_MAX}자까지 — 아이에게 바라는 길이보다 길면 안 돼요`);
  };
  const vOk = Number.isInteger(w.v) && w.v > 0;
  if (!vOk) errs.push('write.v(채점 기준 판 번호)는 1부터');
  edition(w, 'write');
  if (w.past !== undefined) {
    if (!Array.isArray(w.past) || w.past.length > PAST_MAX) errs.push(`write.past(옛 판)는 ${PAST_MAX}개까지의 목록`);
    else {
      const seen = new Set();
      w.past.forEach((x, k) => {
        const name = `write.past ${k + 1}`;
        if (!isObj(x)) { errs.push(`${name}은 { v, q, rubric, model }`); return; }
        if (!Number.isInteger(x.v) || x.v <= 0 || (vOk && x.v >= w.v)) errs.push(`${name}의 v는 1부터, 지금 판(v${w.v})보다 작게`);
        else if (seen.has(x.v)) errs.push(`${name}의 v${x.v}가 앞의 옛 판과 겹쳐요`);
        seen.add(x.v);
        edition(x, name);
      });
    }
  }
  const list = (a, lo, hi, name, each) => {
    if (!Array.isArray(a) || a.length < lo || a.length > hi || !a.every(nonEmpty)) { errs.push(`${name}는 ${lo}~${hi}개의 글`); return; }
    const seen = new Set();
    a.forEach((s, k) => {
      const t = s.normalize('NFC').replace(/\s+/g, ' ').trim();
      if (seen.has(t)) errs.push(`${name} ${k + 1}이 앞의 것과 같아요`);
      seen.add(t);
      if ([...t].length > FRAME_LEN_MAX) errs.push(`${name} ${k + 1}은 ${FRAME_LEN_MAX}자까지 — 버튼·한 줄에 들어가게`);
      if (each) each(t, k);
    });
  };
  list(w.frames, 2, FRAMES_MAX, 'write.frames(문장 틀)', (t, k) => {
    if (t.split(FRAME_GAP).length > 2) errs.push(`write.frames ${k + 1}의 빈자리 ${FRAME_GAP}는 하나까지`);
    if (!t.replace(FRAME_GAP, '').trim()) errs.push(`write.frames ${k + 1}은 빈자리만 있어요`);
  });
  list(w.checks, 2, CHECKS_MAX, 'write.checks(스스로 확인)', (t, k) => {
    if (t.includes(FRAME_GAP)) errs.push(`write.checks ${k + 1}에 빈자리 ${FRAME_GAP}가 있어요 — 확인 줄은 물음으로`);
  });
  return errs;
}

/** 쓸 수 있는 카드만 (깨진 카드는 빼고 그린다 — 배포 전 check.mjs가 막지만 마지막 보루) */
export function validCards(data) {
  const ids = new Set();
  return (data && Array.isArray(data.cards) ? data.cards : []).filter((c) => !checkCard(c, ids).length);
}
