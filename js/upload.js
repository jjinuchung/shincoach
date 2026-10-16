// 📤 Claude에게 기록 보내기 (2026-10-06, 아버님: "매번 사진을 찍어서 보여주는 거 말고 앱에서 바로 github에 올리고 그걸 니가 확인해서 피드백을 주는 방법은 없을까?")
//
// 신코치 저장소(jjinuchung/shincoach)는 **공개**라 아이 기록(이름·질문·글)을 올리면 인터넷에 그대로 공개된다
//   → 기록만 받는 **비공개** 저장소 jjinuchung/shincoach-data에 올린다. Claude는 아버님 "기록 봐 줘"에 거기서 읽는다.
// 열쇠: 아버님이 GitHub에서 만든 fine-grained token (이 저장소 하나 · Contents 읽기/쓰기 · 기한 1년).
//   📊(비밀번호 뒤)에서 한 번 넣으면 **이 기기 localStorage에만** 둔다. ★ 코드(공개 저장소)에는 절대 넣지 않는다.
//   (같은 jjinuchung.github.io 주소의 다른 Pages도 localStorage를 같이 쓰지만, 공개 Pages는 신코치뿐이다)
// 올리는 것: math/YYYY-MM-DD.md (📋 수학 기록 글 + ❓ 답할 차례인 질문 글 — 같은 날은 덮어쓴다)
//           math/latest.json (수학 기록 원본 전체 — 복사 글은 12개념까지라 진단은 원본으로)
//           essay/todo.md · essay/todo.json (✍️ 아직 아빠가 고쳐 주지 않은 글 — 📊 "📮 고쳐 주세요"와 같은 글·같은 [번호], 2026-10-06 v199)
//           korean/todo.md · korean/todo.json (✍️ 국어 서술형 — 답장 기다리는 글, 2026-10-11 v237 · 하나도 없으면 빈 목록도 올린다)
//           english/YYYY-MM-DD.md (🎤 영어 기록 요약 — 최근 7일 넘김·말하기 · 영상별 말해 본 문장, 2026-10-14 v253 · 같은 날은 덮어쓴다)
//           korean/YYYY-MM-DD.md (📚 국어 기록 요약 — 국어 시간 · 글마다 별·틀린 물음 · 잘못 읽기 · 낱말 · 퍼즐 · 생각 쓰기, 2026-10-14 v254 · korreport.js)
//           usage/YYYY-MM-DD.md (🕒 앱 사용 기록 — 최근 7일 앱을 연 수 · 쓴 때 · 화면마다 머문 시간 · ⏳ 과목 시간, 2026-10-16 v272 · usage.js)
// 언제: 앱을 열 때 · 🏠 홈으로 돌아올 때 · 앱을 내릴 때 — 10분에 한 번까지, 내용이 그대로면 안 올린다.
//       📊 "📤 지금 보내기"는 바로. 못 올려도 앱은 그대로이고 진우 화면엔 아무것도 안 뜬다 (다음에 다시).
// 받는 것 (2026-10-07 Codex 35차 #1 — 전엔 공개 저장소 coach/fixes.json·coach/math/replies.json으로 배포해 진우 글·질문이 공개됐다):
//           essay/fixes.json (✍️ 아빠 교정 — Claude가 essay/todo.json을 보고 날짜·글·교정을 적는다)
//           math/replies.json (❓ 아빠 답장 [{ no, text }]) — 같은 열쇠로 읽는다, 배포가 필요 없다
//           korean/replies.json (✍️ 국어 서술형 답장 [{ card, id, at, v, grade, text }] — korwrite.checkReplies가 칸마다 검사, v237 · id는 v239 · 채점한 판 v는 v243)
// 한 번에 하나씩 (Codex 52차 #1): 같은 창은 serialSender(보내는 중에 "지금 보내기"가 또 오면 끝난 뒤 한 번 더) ·
//   다른 창(같은 주소)은 Web Locks(withUploadLock) · 국어 목록은 올리는 순간마다 다시 만든다(겹쳐서 다시 올릴 때도 — 옛 목록으로 덮지 않게)

import { VIDEO_STONE } from './items.js'; // 🏁 영상 보상 기준 (🎤 영어 요약, v253) — items.js는 아무것도 import하지 않는다

export const DATA_REPO = 'jjinuchung/shincoach-data';
export const PRIVATE_FIXES = 'essay/fixes.json';
export const PRIVATE_REPLIES = 'math/replies.json';
export const PRIVATE_KOR_REPLIES = 'korean/replies.json';
export const DATA_BRANCH = 'main';
export const AUTO_GAP_MS = 10 * 60 * 1000;
/** 📥 받는 파일 크기 상한 — 넘으면 풀지도 읽지도 않는다 (GitHub contents API도 1 MB 넘으면 내용을 안 준다, Codex 52차 #5) */
export const PRIVATE_MAX_BYTES = 1000 * 1000;
const TOKEN_KEY = 'shincoach.dataToken';
const STATE_KEY = 'shincoach.dataUpload';
const READ_KEY = 'shincoach.dataRead'; // 📥 받기 결과 (파일마다) — Codex 36차 #4
const API = 'https://api.github.com';

// ───────────────────── 순수 ─────────────────────

/** 올릴 파일들 (순수) — 글은 앱의 📋 복사 글과 같은 것을 넘겨받는다 */
export function reportFiles(math, today, reportText, askText) {
  const md = [String(reportText || '').trim(), '', String(askText || '').trim()].join('\n').trim() + '\n';
  return [
    { path: `math/${today}.md`, text: md },
    { path: 'math/latest.json', text: `${JSON.stringify({ day: today, math: math || null }, null, 1)}\n` },
  ];
}

/**
 * ✍️ 고칠 에세이 글 (순수) — stats.collectTodo 목록 그대로(오래된 글이 [1], 📊와 같은 번호).
 * Claude는 이걸 읽어 비공개 저장소 essay/fixes.json에 date·written → fixed로 적는다 (태블릿에 아무것도 안 넣고, 배포도 없다)
 * @param {Array<{id:string, date?:string, origin?:string, written:string, fixed?:string, notes?:string[]}>} todo
 */
export function essayFiles(todo, today) {
  const list = (Array.isArray(todo) ? todo : []).filter((e) => e && e.written);
  const lines = [`✍️ 진우가 쓴 영어 문장 — 아직 아빠가 고쳐 주지 않은 글 ${list.length}개 (${today}) · 번호는 📊 "📮 고쳐 주세요"와 같아요`, ''];
  list.forEach((e, i) => {
    lines.push(`[${i + 1}] ${e.date || ''} 배운 문장: ${e.origin || ''}`);
    lines.push(`    진우: ${e.written}`);
    if (e.fixed && e.fixed !== e.written) lines.push(`    앱 교정: ${e.fixed}`);
    if (Array.isArray(e.notes) && e.notes.length) lines.push(`    앱 메모: ${e.notes.join(' · ')}`);
    lines.push('');
  });
  if (!list.length) lines.push('(고칠 글 없음)');
  const json = list.map((e, i) => ({ no: i + 1, id: e.id, date: e.date || '', origin: e.origin || '', written: e.written, fixed: e.fixed || '', notes: Array.isArray(e.notes) ? e.notes : [] }));
  return [
    { path: 'essay/todo.md', text: `${lines.join('\n').trim()}\n` },
    { path: 'essay/todo.json', text: `${JSON.stringify(json, null, 1)}\n` },
  ];
}

/** today에서 k일 전 'YYYY-MM-DD' (순수) */
function dayBefore(today, k) {
  const [y, m, d] = String(today).split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d - k));
  const p = (n) => String(n).padStart(2, '0');
  return `${t.getUTCFullYear()}-${p(t.getUTCMonth() + 1)}-${p(t.getUTCDate())}`;
}

/** 🎤 영어 요약에 싣는 영상 수 (최근에 연 순서) */
export const EN_VIDEOS = 10;

/**
 * 🎤 영어 기록 요약 (순수, 2026-10-14 v253 — 영어 ⏭ 넘기기) — Claude가 "올라온 거 봐 줘" 때 넘김을 숫자로 본다.
 * 최근 7일 날마다: 한 문장 · 🔁 복습 문장 · 🎤 말하기 통과/시도 · ⏭ 직접 넘김 · 3번 해 보고 넘어감 · 🎤 연속 보너스 (기록이 하나도 없는 날만 "영어 기록 없음")
 * 영상(최근에 연 순서 EN_VIDEOS편): 한 문장 · 🎤 말해 본 문장(🏁 영상 보상은 이것이 VIDEO_STONE.pct% 이상일 때)
 * @param {Array<object>} days listDaily 결과 · @param {Array<object>} summaries stats.contentSummary 결과
 */
export function englishFiles(days, summaries, today) {
  const num = (v) => Number(v) || 0;
  const byDate = new Map((Array.isArray(days) ? days : []).filter((d) => d && d.date).map((d) => [d.date, d]));
  const lines = [`🎤 영어 기록 (${today}) — ⏭ 직접 넘김과 3번 해 보고 넘어감은 v253부터 따로 셉니다 (그 전 날은 0)`, '', '## 최근 7일'];
  for (let k = 6; k >= 0; k--) {
    const day = dayBefore(today, k);
    const d = byDate.get(day);
    const done = d && Array.isArray(d.doneKeys) ? d.doneKeys.length : 0;
    // 복습·퍼즐·단어 잇기·영어 화면 시간만 있는 날도 영어를 한 날 (Codex 65차 #5 — 전엔 "영어 안 함"으로 적었다)
    const any = d && (done || ['speakAttempts', 'reviewItems', 'reviewSentences', 'puzzles', 'matches', 'seconds', 'enTime'].some((k) => num(d[k]) > 0));
    if (!any) { lines.push(`- ${day.slice(5)}: (영어 기록 없음)`); continue; }
    lines.push(`- ${day.slice(5)}: 한 문장 ${done} · 🔁 복습 문장 ${num(d.reviewSentences)} · 🎤 말하기 통과 ${num(d.speakPass)}/${num(d.speakAttempts)} · ⏭ 직접 넘김 ${num(d.speakSkipBtn)} · 3번 해 보고 넘어감 ${num(d.speakGaveUp)} · 🎤 연속 보너스 ${num(d.speakCombos)}번`);
  }
  const vids = (Array.isArray(summaries) ? summaries : []).filter((x) => x && !x.broken && num(x.lastAt) > 0 && num(x.total) > 0)
    .sort((a, b) => num(b.lastAt) - num(a.lastAt)).slice(0, EN_VIDEOS);
  lines.push('', `## 영상 (최근에 연 순서, ${EN_VIDEOS}편까지) — 🏁 영상 보상은 🎤 말해 본 문장이 ${VIDEO_STONE.pct}% 이상일 때`);
  for (const v of vids) lines.push(`- 「${v.title}」 한 문장 ${num(v.done)}/${num(v.total)} · 🎤 말해 본 문장 ${num(v.said)}/${num(v.total)} (${num(v.saidPct)}%)`);
  if (!vids.length) lines.push('(연 영상 없음)');
  return [{ path: `english/${today}.md`, text: `${lines.join('\n').trim()}\n` }];
}

/** ms → 'YYYY-MM-DD' (이 기기 시간대) — 없거나 깨졌으면 '' */
function dayOfMs(ms) {
  const n = Number(ms);
  if (!(n > 0)) return '';
  const d = new Date(n);
  if (Number.isNaN(d.getTime())) return '';
  const p = (v) => String(v).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * 📚 태블릿 영상 전체 목록 (v277, 2026-10-17 아버님 "이대로 해") — `english/library.md` 한 파일(날짜 없이 늘 최신 — 지난 것은 저장소 기록에).
 * 영어 요약(english/날짜.md)은 최근에 연 EN_VIDEOS편뿐이라 오래 안 연 영상은 있는지 몰랐다 → Claude가 아빠 PC의 자료 폴더와
 * 파일 이름으로 맞춰 "만들었지만 태블릿에 없는 자료"·"교환권 후보"·"다 배운 영상"을 알려 드린다. 영상 파일·자막 글은 안 올린다. 넣은 차례(오래된 것부터)
 * @param {Array<object>} summaries stats.contentSummary 결과 (videoName·createdAt·duration 포함)
 */
export function libraryFiles(summaries, today) {
  const num = (v) => Number(v) || 0;
  const list = (Array.isArray(summaries) ? summaries : []).filter((x) => x && x.id)
    .sort((a, b) => num(a.createdAt) - num(b.createdAt) || String(a.title || '').localeCompare(String(b.title || '')));
  const lines = [`📚 태블릿 영상 전체 (${today}) — ${list.length}편 · 넣은 차례 · 파일 = 넣을 때 고른 영상 파일 이름`, ''];
  for (const v of list) {
    if (v.broken) { lines.push(`- 「${v.title || '?'}」 (영상 정보를 못 읽음)`); continue; }
    const dur = num(v.duration);
    const len = dur > 0 ? ` · ${dur >= 60 ? `${Math.round(dur / 60)}분` : '1분 안'}` : '';
    lines.push(`- 「${v.title}」 · 파일 ${v.videoName || '(모름)'} · 넣은 날 ${dayOfMs(v.createdAt) || '(모름)'}${len} · 한 문장 ${num(v.done)}/${num(v.total)} · 🎤 말해 본 문장 ${num(v.said)}/${num(v.total)} (${num(v.saidPct)}%) · 마지막으로 연 날 ${dayOfMs(v.lastAt) || '안 엶'}`);
  }
  if (!list.length) lines.push('(영상 없음)');
  return [{ path: 'english/library.md', text: `${lines.join('\n').trim()}\n` }];
}

/** 초 → "1시간 12분" · "35분" · "1분 안" (순수) */
export function fmtMin(sec) {
  const s = Math.floor(Number(sec) || 0);
  if (s <= 0) return '0분';
  if (s < 60) return '1분 안';
  const m = Math.round(s / 60);
  return m >= 60 ? `${Math.floor(m / 60)}시간${m % 60 ? ` ${m % 60}분` : ''}` : `${m}분`;
}

/**
 * 🕒 앱 사용 기록 (순수, 2026-10-16 v272 — usage.js) — Claude가 날마다 "앱을 켰는지 · 어디에 머물렀는지 · 언제 썼는지"를 본다.
 * 최근 7일 날마다: 앱을 연 수 · 쓴 때(10분 칸을 이어 붙인 덩이) · 화면마다 머문 시간(0인 자리는 뺌) ·
 *   ⏳ 과목 시간(시간 제한에 센 시간 — 🎯 도전 문제·잠긴 뒤는 안 셈) · 부모가 더 준 시간 · ⏳ 연장권
 * @param {Array<object>} days listDaily 결과 · @param {Array<{key:string, field:string, ko:string}>} places usage.PLACES
 */
export function usageFiles(days, today, places) {
  const num = (v) => Math.max(0, Math.floor(Number(v) || 0));
  const byDate = new Map((Array.isArray(days) ? days : []).filter((d) => d && d.date).map((d) => [d.date, d]));
  const list = Array.isArray(places) ? places : [];
  const SUBJ = [['수학', 'mathTime', 'mathBonus', 'mathExt'], ['영어', 'enTime', 'enBonus', 'enExt'], ['국어', 'korTime', 'korBonus', 'korExt']];
  // 읽는 법 — 숫자를 넘겨 읽지 않게 (🔍 Codex 81차 A·E)
  const lines = [`🕒 앱 사용 기록 (${today}) — 머문 시간·쓴 때·앱을 연 수는 v272부터 셉니다 (그 전 날은 ⏳ 과목 시간만)`, '', '## 읽는 법',
    '- 머문 시간 = 화면이 보이고 2분 안에 손을 댄 동안 — 영상을 보거나 긴 글을 읽으며 2분 넘게 손을 안 대면 그동안은 빠져요',
    '- 쓴 때 = 센 초가 있는 10분 칸을 이은 것 (그 칸 내내 썼다는 뜻은 아니에요)',
    '- 앱을 연 수 = 창을 새로 연 수 (내렸다 다시 올린 것은 안 셈 · 밤을 넘겨 켜 둔 날은 0일 수 있어요)',
    '- 한 기기에서 두 창(홈 화면 앱·Chrome 탭)이 동시에 보이면 겹쳐 셀 수 있어요',
    '- ⏳ 과목 시간 = 시간 제한에 센 시간 (🎯 도전 문제·잠긴 뒤는 안 셈)',
    '- ⏱ 수학 문항마다 걸린 초는 math/latest.json 일지(log)의 qs[].s — 문제를 보인 때부터 처음 답할 때까지(앱을 내린 시간도 들어감, 쌍둥이 문제는 안 셈) · 600은 윗값 · 빠른 오답은 살펴볼 신호이지 찍었다는 증거는 아니에요',
    '', '## 최근 7일'];
  for (let k = 6; k >= 0; k--) {
    const day = dayBefore(today, k);
    const d = byDate.get(day);
    // 하루 기록이 없다고 안 썼다고는 못 한다 — 옛 판·저장 실패·기록 지움일 수도 (🔍 Codex 81차 #5)
    if (!d) { lines.push(`- ${day.slice(5)}: (이 기기에 저장된 기록 없음 — 앱을 안 썼는지·기록이 빠졌는지는 알 수 없어요)`); continue; }
    const stay = list.map((p) => [p.ko, num(d[p.field])]).filter(([, s]) => s > 0);
    const opens = num(d.appOpens);
    const slots = slotRanges(d.useSlots);
    const parts = [];
    if (opens || stay.length || slots) {
      parts.push(`앱을 연 수 ${opens}`);
      parts.push(`쓴 때 ${slots || '(없음)'}`);
      const all = stay.reduce((a, [, s]) => a + s, 0);
      parts.push(stay.length ? `머문 시간 모두 ${fmtMin(all)} — ${stay.map(([ko, s]) => `${ko} ${fmtMin(s)}`).join(' · ')}` : '머문 시간 (없음)');
    } else parts.push('(🕒 사용 기록 없음 — v272 전이거나 센 초가 없음)');
    parts.push(`⏳ 과목 시간 ${SUBJ.map(([ko, f]) => `${ko} ${fmtMin(d[f])}`).join(' · ')}`);
    const bonus = SUBJ.filter(([, , b]) => num(d[b]) > 0).map(([ko, , b]) => `${ko} +${fmtMin(d[b])}`);
    if (bonus.length) parts.push(`부모가 더 준 시간 ${bonus.join(' · ')}`);
    const ext = SUBJ.filter(([, , , e]) => num(d[e]) > 0).map(([ko, , , e]) => `${ko} ${num(d[e])}개`);
    if (ext.length) parts.push(`⏳ 연장권 ${ext.join(' · ')}`);
    lines.push(`- ${day.slice(5)}: ${parts.join(' · ')}`);
  }
  return [{ path: `usage/${today}.md`, text: `${lines.join('\n').trim()}\n` }];
}

/** 🕒 쓴 때 10분 칸 "HH:M"(usage.slotOf) → "07:40~08:20 · 21:30~21:50" (순수) — 이어진 칸은 한 덩이로, 끝은 마지막 칸 + 10분 */
export function slotRanges(slots) {
  const idx = [...new Set((Array.isArray(slots) ? slots : []).filter((s) => /^\d{2}:\d$/.test(s))
    .map((s) => Number(s.slice(0, 2)) * 6 + Number(s[3])))].filter((n) => n >= 0 && n < 144).sort((a, b) => a - b);
  const hm = (n) => `${String(Math.floor(n / 6)).padStart(2, '0')}:${n % 6}0`;
  const out = [];
  for (let i = 0; i < idx.length; i++) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1] === idx[j] + 1) j++;
    out.push(`${hm(idx[i])}~${hm(idx[j] + 1)}`); // 마지막 칸(23:50)의 끝은 hm(144) = "24:00"
    i = j;
  }
  return out.join(' · ');
}

/**
 * ✍️ 국어 서술형 — 답장 기다리는 글 (순수) — korwrite.writeTodo 목록 그대로. Claude는 card·id·at을 그대로 korean/replies.json에 적는다.
 * 하나도 없어도 빈 목록을 올린다 (다 답장한 뒤에도 옛 목록이 남아 있지 않게 — Codex 51차 PART 3 #6)
 * @param {Array<{card,id,title,q,v,at,date,text,before?:Array}>} todo
 */
export function koreanFiles(todo, today) {
  const list = Array.isArray(todo) ? todo : [];
  const lines = [`✍️ 진우가 쓴 국어 서술형 — 답장 기다리는 글 ${list.length}개 (${today}) · 답장은 korean/replies.json에 { card, id, at, v, grade(ok·near·again), text } (card·id·at·v는 아래 그대로 — v는 채점한 판, 그 판의 rubric으로)`, ''];
  for (const e of list) {
    // 원고를 고친 뒤의 옛 글 — 그 판의 물음·기준으로 (Codex 52차 #8)
    const old = e.vNow && e.vNow !== e.v ? ` (지금 원고는 v${e.vNow} — 이 글은 v${e.v} 물음·기준으로, 원고 write.past)` : '';
    lines.push(`[${e.card} · id ${e.id} · at ${e.at} · v ${e.v}] ${e.date} 「${e.title}」 · 채점 기준 v${e.v}${old}`);
    lines.push(e.vNow && !e.q ? `    ⚠️ v${e.v} 물음을 원고(write.past)에서 못 찾았어요 — 원고를 확인해 주세요` : `    물음: ${e.q}`);
    lines.push(`    진우: ${e.text}`);
    for (const b of (Array.isArray(e.before) ? e.before : [])) lines.push(`    (전에 ${b.date} · ${b.grade}) ${b.text} → 답장: ${b.reply}`);
    lines.push('');
  }
  if (!list.length) lines.push('(답장 기다리는 글 없음)');
  return [
    { path: 'korean/todo.md', text: `${lines.join('\n').trim()}\n` },
    { path: 'korean/todo.json', text: `${JSON.stringify(list, null, 1)}\n` },
  ];
}

/** UTF-8 글 → base64 (GitHub contents API) — 한글·이모지까지. 긴 글은 나눠서 (spread 한계) */
export function b64(text) {
  const bytes = new TextEncoder().encode(String(text));
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** base64 → UTF-8 글 (GitHub contents API가 돌려주는 content — 60자마다 줄바꿈이 끼어 온다) */
export function unb64(s) {
  const bin = atob(String(s || '').replace(/\s+/g, ''));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

/**
 * 올릴 파일들 — 기기 기록을 읽어 만든다. ★ 읽기가 실패하면 그대로 실패한다 (Codex 35차 #2: 전엔 실패를 null·[]로 바꿔
 * "수학 기록 없음"·빈 에세이 목록을 올리고 성공으로 적어, 비공개 저장소의 좋은 기록을 덮어썼다). 읽었는데 없는 것(null·[])은 "없음"으로.
 * getKorTodo(있으면) = ✍️ 국어 서술형 답장 기다리는 글 — 프로필을 못 읽으면 실패해야 한다(빈 목록으로 덮어쓰지 않게)
 * getEnglish(있으면) = 🎤 영상 요약(stats.contentSummary) — 영상 기록을 못 읽으면 실패 (v253)
 * getKorReport(있으면) = 📚 국어 요약 글(today, days) — 프로필을 못 읽으면 실패 · 원고를 못 받거나 꼴이 틀리면 null(이번엔 국어 요약만 안 올림, v254)
 * usagePlaces(있으면) = 🕒 앱 사용 기록의 자리 목록(usage.PLACES) — 하루 기록(days)으로 만든다 (v272)
 * @param {{getMath:Function, listDaily:Function, mathReportText:Function, asksText:Function, collectTodo:Function, getKorTodo?:Function, getEnglish?:Function, getKorReport?:Function, usagePlaces?:Array, today:string}} o
 */
export async function gatherFiles({ getMath, listDaily, mathReportText, asksText, collectTodo, getKorTodo, getEnglish, getKorReport, usagePlaces, today }) {
  const math = await getMath();
  const days = await listDaily();
  const kor = getKorTodo ? await getKorTodo() : null;
  const en = getEnglish ? await getEnglish() : null;
  const korRep = getKorReport ? await getKorReport(today, days || []) : null;
  return [
    ...reportFiles(math, today, math ? mathReportText(math, today) : '(수학 기록 없음)', math ? asksText(math, today) : ''),
    ...essayFiles(collectTodo(days || []), today), // ✍️ 📊 "📮 고쳐 주세요"와 같은 목록·번호
    ...(getKorTodo ? koreanFiles(kor, today) : []), // ✍️ 국어 서술형 (v237)
    ...(getEnglish ? englishFiles(days, en, today) : []), // 🎤 영어 요약 (v253)
    ...(getEnglish ? libraryFiles(en, today) : []), // 📚 태블릿 영상 전체 목록 (v277)
    ...(typeof korRep === 'string' && korRep ? [{ path: `korean/${today}.md`, text: korRep }] : []), // 📚 국어 요약 (v254)
    ...(usagePlaces ? usageFiles(days, today, usagePlaces) : []), // 🕒 앱 사용 기록 (v272)
  ];
}

/**
 * ✍️ 국어 서술형 답장 기다리는 글 — 이 기기 프로필 + 원고(제목·물음). 프로필을 못 읽으면 실패(위와 같은 까닭) ·
 * 원고를 못 받으면 카드 id만으로(제목·물음 없이) — Claude는 원고를 저장소에서 따로 읽는다
 */
async function korTodoNow() {
  const [{ getProfile }, { writeTodo }, { validCards }] = await Promise.all([import('./db.js'), import('./korwrite.js'), import('./korean.js')]);
  const p = await getProfile();
  let cards = [];
  try { cards = validCards(await (await fetch('./coach/korean/reading.json')).json()); } catch { cards = []; }
  return writeTodo(p && p.korWrites, cards);
}

/**
 * 📚 국어 기록 요약 글 (v254) — 이 기기 프로필 + 원고(글·낱말·퍼즐). 프로필을 못 읽으면 실패(빈 기록으로 덮어쓰지 않게) ·
 * 원고를 못 받거나 꼴이 틀리면(cards 없음 등) null — 이번엔 국어 요약만 안 올린다(옛 요약을 원고 없는 글로 덮지 않게, Codex 66차)
 */
async function korReportNow(today, days) {
  const [{ getProfile }, kr] = await Promise.all([import('./db.js'), import('./korreport.js')]);
  const p = await getProfile();
  let raw;
  try {
    raw = await Promise.all(['reading', 'words', 'puzzles'].map((n) => fetch(`./coach/korean/${n}.json`).then((r) => { if (!r.ok) throw new Error(n); return r.json(); })));
  } catch { return null; }
  return kr.korReportFromRaw(p, raw, today, days);
}

/** 🎤 영어 영상 요약 — 이 기기의 영상·문장 기록. 못 읽으면 실패 (빈 요약으로 덮어쓰지 않게, v253) */
async function enNow() {
  const [db, st] = await Promise.all([import('./db.js'), import('./stats.js')]);
  const [items, records] = await Promise.all([db.listItems(), db.getAllSentenceStats()]);
  return st.contentSummary(items, records, st.cueCountOf, st.cueKeysOf);
}

/** 내용 지문 (FNV-1a 32비트) — 그대로면 또 올리지 않으려고 */
export function hashOf(files) {
  let h = 0x811c9dc5;
  const s = (files || []).map((f) => `${f.path}\n${f.text}`).join('\n\u0000\n');
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

/** 열쇠 꼴 (순수) — 앞뒤 빈칸은 떼고, 빈칸이 끼었거나 너무 짧으면 null. fine-grained(github_pat_)·classic(ghp_) 다 받는다 */
export function cleanToken(raw) {
  const t = String(raw || '').trim();
  if (t.length < 20 || /\s/.test(t)) return null;
  return t;
}

/**
 * 저절로 보낼 때인가 (순수) — 열쇠가 있고 · 인터넷이 되고 · 마지막 시도에서 10분이 지났고 · 내용이 바뀌었거나 지난번에 실패했을 때
 * @param {{token:string|null, online:boolean, now:number, state:{at?:number, ok?:boolean, hash?:string}|null, hash:string}} o
 */
export function shouldAuto({ token, online, now, state, hash }) {
  if (!token || !online) return false;
  const s = state || {};
  if (s.at && now - s.at < AUTO_GAP_MS) return false;
  return !(s.ok && s.hash === hash);
}

/** HTTP 상태 → 아버님이 볼 까닭 (순수) */
export function whyOf(status) {
  if (status === 401) return '열쇠가 틀렸거나 기한이 지났어요 — GitHub에서 새로 만들어 넣어 주세요';
  if (status === 403) return '열쇠에 쓰기 권한이 없어요 — Contents를 "Read and write"로 만들어 주세요';
  if (status === 404) return `저장소를 못 찾았어요 — 열쇠를 만들 때 ${DATA_REPO.split('/')[1]}를 골라 주세요`;
  if (status === 409 || status === 422) return '다른 곳에서 동시에 올려서 겹쳤어요 — 잠시 뒤 다시';
  if (status === 0) return '인터넷이 안 돼요';
  return `GitHub가 받지 않았어요 (${status})`;
}

// ───────────────────── GitHub ─────────────────────

function httpError(status) {
  const e = new Error(whyOf(status));
  e.status = status;
  return e;
}

/**
 * 파일 하나 올리기 — 있으면 sha를 받아 덮어쓰고, 없으면 새로 만든다. 겹치면(409·422) sha를 다시 받아 한 번 더.
 * text가 함수면 올릴 때마다(다시 올릴 때도) 새로 만든다 — 겹쳤다는 건 그 사이 다른 곳이 새 내용을 올렸다는 뜻이라,
 * 처음 만든 옛 내용을 새 sha로 다시 올리면 새 목록을 덮는다 (Codex 52차 #1)
 * @param {{fetchFn:Function, token:string, path:string, text:string|(() => Promise<string>|string), message:string, repo?:string}} o
 */
export async function putFile({ fetchFn, token, path, text, message, repo = DATA_REPO }) {
  const url = `${API}/repos/${repo}/contents/${path}`;
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  for (let attempt = 0; attempt < 2; attempt++) {
    let sha;
    let g;
    try { g = await fetchFn(`${url}?ref=${DATA_BRANCH}`, { headers, cache: 'no-store' }); } catch { throw httpError(0); }
    if (g.status === 200) sha = (await g.json()).sha;
    else if (g.status !== 404) throw httpError(g.status);
    const body = { message, content: b64(typeof text === 'function' ? await text() : text), branch: DATA_BRANCH, ...(sha ? { sha } : {}) };
    let p;
    try { p = await fetchFn(url, { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); } catch { throw httpError(0); }
    if (p.status === 200 || p.status === 201) return { created: p.status === 201 };
    if ((p.status === 409 || p.status === 422) && attempt === 0) continue;
    throw httpError(p.status);
  }
  throw httpError(409);
}

/**
 * 파일 하나 읽기 — 없으면(404) null · 못 읽으면 까닭과 함께 실패 (열쇠는 머리글에만, 까닭 글에는 안 넣는다)
 * @param {{fetchFn:Function, token:string, path:string, repo?:string}} o
 * @returns {Promise<string|null>}
 */
export async function getFile({ fetchFn, token, path, repo = DATA_REPO }) {
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  let g;
  try { g = await fetchFn(`${API}/repos/${repo}/contents/${path}?ref=${DATA_BRANCH}`, { headers, cache: 'no-store' }); } catch { throw httpError(0); }
  if (g.status === 404) return null;
  if (g.status !== 200) throw httpError(g.status);
  const body = await g.json();
  if (body && Number(body.size) > PRIVATE_MAX_BYTES) throw httpError('big'); // 풀기 전에
  return unb64(body && body.content);
}

/**
 * 📥 비공개 저장소의 목록 파일(JSON 배열) — 아빠 교정 essay/fixes.json · ❓ 답장 math/replies.json (Codex 35차 #1: 공개 배포 대신).
 * 열쇠가 없으면 묻지도 않고, 없거나·못 읽거나·배열이 아니면 빈 목록 (앱은 그대로 — 다음에 다시).
 * @param {string} path
 * @param {{fetchFn?:Function, token?:string|null}} [o] 테스트용 — 안 주면 이 기기 열쇠·fetch
 * @returns {Promise<Array>}
 */
export async function readPrivateList(path, o = {}) {
  const token = 'token' in o ? o.token : getToken();
  if (!token) return [];
  // 받기 결과를 파일마다 이 기기에 적는다 — 📊 📤 카드가 한 줄로 보인다 (Codex 36차 #4: 실패가 "받을 것 없음"과 똑같이 보였다)
  const note = (kind, n) => noteRead(path, readStatus(kind, n, (o.now || Date.now)()), o.store);
  let text;
  try { text = await getFile({ fetchFn: o.fetchFn || fetch, token, path }); } catch (e) { note(e && e.status !== undefined ? e.status : 0); return []; }
  if (text === null) { note('missing'); return []; }
  if (text.length > PRIVATE_MAX_BYTES) { note('big'); return []; }
  let list;
  try { list = JSON.parse(text); } catch { note('json'); return []; }
  if (!Array.isArray(list)) { note('shape'); return []; }
  note('ok', list.length);
  return list;
}

/**
 * 📥 받기 결과 → 아버님이 볼 상태 (순수). kind: 'ok' · 'missing'(404 — 아직 안 올렸으면 정상) · 'json' · 'shape' · 'big'(크기 상한) · HTTP 상태 수(0 = 인터넷)
 * @returns {{at:number, ok:boolean, n?:number, missing?:boolean, why?:string}}
 */
export function readStatus(kind, n = 0, at = Date.now()) {
  if (kind === 'ok') return { at, ok: true, n };
  if (kind === 'missing') return { at, ok: true, n: 0, missing: true };
  if (kind === 'big') return { at, ok: false, why: `파일이 너무 커요(${PRIVATE_MAX_BYTES / 1000 / 1000} MB 넘음) — 하나도 안 받았어요. Claude에게 오래된 줄을 지워 달라고 해 주세요` };
  if (kind === 'json') return { at, ok: false, why: '파일이 깨져 못 읽었어요 (JSON) — Claude에게 고쳐 달라고 해 주세요' };
  if (kind === 'shape') return { at, ok: false, why: '파일 모양이 틀렸어요 (목록이 아님) — Claude에게 고쳐 달라고 해 주세요' };
  if (kind === 403) return { at, ok: false, why: '이 열쇠로는 저장소를 읽을 수 없어요 — 열쇠의 저장소·권한(Contents)을 확인해 주세요' };
  return { at, ok: false, why: whyOf(kind) };
}
const READ_NAMES = { [PRIVATE_FIXES]: '✍️ 교정', [PRIVATE_REPLIES]: '❓ 답장', [PRIVATE_KOR_REPLIES]: '📚 국어 답장' };
/**
 * 📊 📤 카드의 받기 한 줄 (순수) — "📥 받기: ✍️ 교정 ✅ 10/07 10:32 (3개) · ❓ 답장 · 아직 없음"
 * check(국어 답장 — 붙여 본 뒤의 수, noteReadCheck)가 있으면: 너무 많아 통째로 안 받음 ❌ · 받지 않은 줄·맞는 글 없음·판 다름 ⚠️
 * @param {Object<string, {at:number, ok:boolean, n?:number, missing?:boolean, why?:string, check?:{rows:number, bad:number, none:number, stale?:number, over:boolean}}>|null} state readState()
 * @param {(t:number) => string} fmt 시각 글
 */
export function readSummary(state, fmt) {
  const s = state || {};
  const parts = Object.keys(READ_NAMES).filter((p) => s[p]).map((p) => {
    const r = s[p]; const name = READ_NAMES[p];
    if (!r.ok) return `${name} ❌ ${fmt(r.at)} 못 받았어요 — ${r.why}`;
    if (r.missing) return `${name} · 아직 없음`;
    const c = r.check;
    if (c && c.over) return `${name} ❌ ${fmt(r.at)} 답장이 너무 많아(${c.rows}줄) 하나도 안 받았어요 — Claude에게 오래된 줄을 지워 달라고 해 주세요`;
    const warn = c ? [c.bad ? `받지 않은 줄 ${c.bad}` : '', c.none ? `맞는 글 없음 ${c.none}` : '', c.stale ? `판 다름 ${c.stale}` : ''].filter(Boolean).join(' · ') : '';
    return warn ? `${name} ⚠️ ${fmt(r.at)} (${r.n}개 — ${warn} · Claude에게 "국어 답장 확인해 줘")` : `${name} ✅ ${fmt(r.at)} (${r.n}개)`;
  });
  return parts.length ? `📥 받기: ${parts.join(' · ')}` : '📥 받기: 아직 받아 본 적이 없어요 (앱을 열 때·수학을 열 때 저절로)';
}

// ───────────────────── 이 기기의 열쇠·상태 ─────────────────────

function readJson(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
}
export function getToken() {
  try { return cleanToken(localStorage.getItem(TOKEN_KEY)); } catch { return null; }
}
/** @returns {boolean} 저장했는가 (꼴이 틀리면 false) */
export function setToken(raw) {
  const t = cleanToken(raw);
  if (!t) return false;
  try { localStorage.setItem(TOKEN_KEY, t); return true; } catch { return false; }
}
export function clearToken() {
  try { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(STATE_KEY); localStorage.removeItem(READ_KEY); } catch { /* 없으면 그만 */ }
}
/** 마지막 시도 { at, ok, why, hash, files } */
export function uploadState() {
  return readJson(STATE_KEY);
}
/** 📥 받기 결과 — { 파일 경로: readStatus } (store는 테스트용, 안 주면 이 기기 localStorage) */
export function readState(store) {
  try { return JSON.parse((store || localStorage).getItem(READ_KEY) || 'null') || {}; } catch { return {}; }
}
function noteRead(path, st, store) {
  try { const s = readState(store); s[path] = st; (store || localStorage).setItem(READ_KEY, JSON.stringify(s)); } catch { /* 적지 못해도 받기는 그대로 */ }
}
/** 📥 받은 파일을 앱이 검사·적용해 본 수를 그 파일의 받기 결과에 붙인다 (국어 답장 — korwrite.replyStats, 글은 없다) */
export function noteReadCheck(path, check, store) {
  try {
    const s = readState(store);
    if (!s[path] || !s[path].ok) return;
    s[path] = { ...s[path], check: { rows: check.rows | 0, bad: check.bad | 0, none: check.none | 0, stale: check.stale | 0, over: !!check.over } };
    (store || localStorage).setItem(READ_KEY, JSON.stringify(s));
  } catch { /* 적지 못해도 받기는 그대로 */ }
}

// ───────────────────── 보내기 ─────────────────────

/**
 * 같은 창에서 한 번에 하나씩 (순수 — run만 받는다). 보내는 중이면 같은 약속을 돌려준다(두 번 눌러도·홈과 내림이 겹쳐도 한 번).
 * 보내는 중에 force가 오면 끝난 뒤 force로 한 번 더 — 그 사이 저장한 글이 "보내는 중"에 묻혀 빠지지 않게 (여러 번 와도 한 번 더, Codex 52차 #1)
 * 끝나면(실패해도) 반드시 풀린다 — 껐다 켜야 낫는 전역 플래그가 되지 않게
 * @param {(force:boolean) => Promise<any>} run
 */
export function serialSender(run) {
  let running = null;
  let again = null;
  const send = ({ force = false } = {}) => {
    if (running) {
      if (!force) return running;
      if (!again) again = running.catch(() => {}).then(() => { again = null; return send({ force: true }); });
      return again;
    }
    running = Promise.resolve().then(() => run(force)).finally(() => { running = null; });
    return running;
  };
  return send;
}

/** 다른 창과 한 번에 하나씩 — 기다림 상한 (그 창이 멈춰 있으면 이번엔 그만, 다음에 다시) */
export const LOCK_WAIT_MS = 90 * 1000;
/**
 * 같은 주소의 다른 창과 한 번에 하나씩 올린다 (Web Locks) — 없으면 그냥 (Codex 52차 #1)
 * @param {() => Promise<any>} fn
 * @param {{request:Function}|undefined} [locks] 테스트용 — 안 주면 navigator.locks
 */
export function withUploadLock(fn, locks = typeof navigator !== 'undefined' ? navigator.locks : undefined) {
  if (!locks || typeof locks.request !== 'function') return Promise.resolve().then(fn);
  const opts = typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? { signal: AbortSignal.timeout(LOCK_WAIT_MS) } : {};
  return locks.request('shincoach-upload', opts, () => fn());
}

/** ✍️ 국어 파일 하나의 글 — 올리는 순간의 프로필로 새로 만든다 */
/** 올리는 순간마다 다시 만드는 국어 파일 — ✍️ 답장 기다리는 글 (koreanFiles) */
const KOR_LIVE = new Set(['korean/todo.md', 'korean/todo.json']);
async function koreanTextNow(path, today) {
  const f = koreanFiles(await korTodoNow(), today).find((x) => x.path === path);
  return f ? f.text : '';
}

const sendQueue = serialSender((force) => withUploadLock(() => sendOnce(force)).catch((e) => ({ ok: false, why: e && e.name === 'TimeoutError' ? '다른 창이 올리는 중이라 기다리다 멈췄어요 — 잠시 뒤 다시' : (e && e.message) || String(e) })));

/**
 * 📤 보내기. force면 10분·내용 비교 없이 바로 (📊 버튼 · ✍️ 국어 글 보낸 뒤).
 * @returns {Promise<{ok:boolean, skipped?:boolean, why?:string, at?:number}>}
 */
export function sendReport({ force = false } = {}) {
  return sendQueue({ force });
}

/** 한 번 보내기 — 다른 창과 겹치지 않는 자리(withUploadLock 안)에서 모으고 올린다 */
async function sendOnce(force) {
  const token = getToken();
  if (!token) return { ok: false, skipped: true, why: '열쇠가 없어요' };
  // 🕒 사용 기록(v272)은 못 불러와도 나머지는 그대로 올린다 — 새 모듈 하나 때문에 📤 전체가 멈추지 않게
  const [{ getMath, listDaily }, prog, ask, { todayKey }, st, usage] = await Promise.all([import('./db.js'), import('./mathprog.js'), import('./mathask.js'), import('./track.js'), import('./stats.js'), import('./usage.js').catch(() => null)]);
  const today = todayKey();
  let files;
  try {
    // 🕒 모아 둔 사용 초를 먼저 적는다 — 앱을 내리는 순간에 올릴 때 마지막 몇 초가 빠지지 않게 (실패해도 그대로 올린다)
    if (usage) await usage.flushUsage().catch(() => {});
    files = await gatherFiles({ getMath, listDaily, mathReportText: prog.mathReportText, asksText: ask.asksText, collectTodo: st.collectTodo, getKorTodo: korTodoNow, getEnglish: enNow, getKorReport: korReportNow, usagePlaces: usage ? usage.PLACES : undefined, today });
  } catch {
    // 기기 기록을 못 읽었다 — 아무것도 안 올린다 (빈 기록으로 덮어쓰지 않게). 실패로 적어 두면 10분 뒤 다시
    const fail = { ok: false, at: Date.now(), why: '이 기기 기록을 못 읽었어요 — 잠시 뒤 다시' };
    try { localStorage.setItem(STATE_KEY, JSON.stringify({ at: fail.at, ok: false, why: fail.why, hash: '', files: [] })); } catch { /* 저장 못 해도 */ }
    return fail;
  }
  const hash = hashOf(files);
  const online = typeof navigator === 'undefined' || navigator.onLine !== false;
  if (!force && !shouldAuto({ token, online, now: Date.now(), state: uploadState(), hash })) return { ok: false, skipped: true };
  const at = Date.now();
  let res;
  try {
    for (const f of files) {
      // ✍️ 국어 서술형은 올리는 순간마다(겹쳐서 다시 올릴 때도) 다시 만든다 — 모은 뒤 저장된 글이 빠지거나 옛 목록이 새 목록을 덮지 않게 (Codex 51차 PART 3 #6 · 52차 #1)
      //   📚 국어 요약(korean/날짜.md, v254)은 모은 글 그대로 — 다시 만드는 것은 답장 기다리는 글 두 파일만
      const text = KOR_LIVE.has(f.path) ? () => koreanTextNow(f.path, today) : f.text;
      await putFile({ fetchFn: fetch, token, path: f.path, text, message: `📤 진우 기록 ${today} — ${f.path}` }); // 메시지에는 글을 넣지 않는다
    }
    res = { ok: true, at };
  } catch (e) {
    res = { ok: false, at, why: (e && e.message) || String(e) };
  }
  try { localStorage.setItem(STATE_KEY, JSON.stringify({ at, ok: res.ok, why: res.why || '', hash: res.ok ? hash : '', files: files.map((f) => f.path) })); } catch { /* 저장 못 해도 */ }
  return res;
}

/** 저절로 보내기 — 실패해도 조용히 (진우 화면엔 아무것도 안 뜬다) */
export function autoSend() {
  return sendReport().catch(() => ({ ok: false }));
}
