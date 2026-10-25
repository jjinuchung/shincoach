// 📬 피드백이 닿았나 (v314, 2026-10-22 아버님: "교정을 하고 다시 보내면 아이가 이걸 제대로 보고 확인은 하는건지 아닌지를 모르겠어 …
//    아무리 우리가 이렇게 피드백을 줘도 그게 제대로 효과가 있는건지 아닌지를 모르잖아?" → 기본안 "이대로 진행")
// 📤 올릴 때 usage/feedback.md 한 파일(날짜 없이 늘 최신) — 아빠·Claude가 보낸 것마다 세 칸: 앱에 붙은 때 → 진우가 본 때 → 해 본 것
//   ✍️ 영어 교정(하루 기록 essays — coachFix·fixedAt·readAt·readHow) · 📚 국어 답장(korWrites — rAt·read·rdAt · 그 뒤 다시 쓴 글) ·
//   🔢 수학 답장(asks — replies·readAt·status·tries) · 💌 한 줄 메시지는 family/read.md
// 효과(고친 낱말을 다음 글에서 또 틀리나 · 다시 쓴 글의 등급 · 고친 개념을 다음에 맞히나)는 Claude가 "올라온 거 봐 줘"에서 이 글과 기록을 함께 보고 말한다.
// ★ 아이 화면에는 아무것도 안 보인다 (아이 화면에 셈·재촉 문구 금지, 2026-10-15) · 비공개 저장소에만
// 순수 — 아무것도 import하지 않는다 (국어 글 꼴은 korwrite.writesOf를 거친 저장 꼴 그대로 읽는다 — upload가 프로필을 넘긴다)

/** 며칠 안에 붙은 것을 보이나 — 아직 안 본 것은 날과 상관없이 늘 */
export const FEEDBACK_DAYS = 14;
/** 갈래마다 **본 것**의 줄 수 상한 (최근 것) — 안 본 것은 모두 남긴다 (🔍 Codex 120차 #2: 같이 자르면 오래된 안 본 것이 빠져 "안 본 것 0"이 됐다) */
export const FEEDBACK_MAX = 30;
const DAY_MS = 86400000;

const num = (v) => { const n = Math.floor(Number(v)); return Number.isSafeInteger(n) && n > 0 ? n : 0; };
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const p2 = (n) => String(n).padStart(2, '0');
/** ms → 'MM-DD HH:MM' (이 기기 시간대) · 없으면 '' */
export function fmtAt(ms) {
  const n = num(ms);
  if (!n) return '';
  const d = new Date(n);
  return Number.isNaN(d.getTime()) ? '' : `${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
}
const oneLine = (s, max = 160) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, max);

/** ✍️ 영어 교정을 어떻게 읽고 넘어갔나 (db.READ_HOW) — try는 듣는 중에 넘긴 것·인식이 안 된 것도 · skip은 고친 문장을 소리로 들려준 뒤 (🔍 Codex 120차 #5) */
const HOW_KO = { pass: '🎤 따라 읽어 통과', try: '🎤 해 봄(통과 기록 없음)', skip: '🎤 결과 없이 넘김' };
/** 📚 등급 */
const GRADE_KO = { ok: '✅', near: '🔸', again: '🔁' };
/** 🔢 질문 상태 → 진우가 한 것 (mathask STATUS — answered는 askItems에서 본 것으로 가른다) */
const ASK_KO = {
  understood: '😄 알았어요 — 같은 틀 문제는 아직 못 맞힘',
  again: '🤔 아직 모르겠대요 — 다시 아빠 차례',
  fixed: '😄 알았어요 → 같은 틀 문제 맞힘 ✅',
  closed: '아빠가 닫음',
};

/** 보일 것인가 — 붙은 지 FEEDBACK_DAYS일 안이거나 아직 안 봤으면 */
const shown = (at, seen, now) => !seen || (num(at) && num(at) >= now - FEEDBACK_DAYS * DAY_MS);
/** 줄 고르기 — 안 본 것은 모두 · 본 것은 최근 FEEDBACK_MAX개 · 붙은 차례(오래된 것부터) */
function keep(items) {
  const byAt = (a, b) => a.at - b.at;
  return [...items.filter((x) => !x.seen), ...items.filter((x) => x.seen).sort(byAt).slice(-FEEDBACK_MAX)].sort(byAt);
}

/** ✍️ 영어 교정 줄들 (순수) — [{ at 붙은 때, seen, text }] 오래된 것부터 */
export function essayItems(days, now) {
  const out = [];
  for (const d of Array.isArray(days) ? days : []) {
    if (!d || typeof d.date !== 'string') continue;
    for (const e of Array.isArray(d.essays) ? d.essays : []) {
      if (!e || !e.coachFix || !e.written) continue;
      const seen = num(e.readAt) > 0;
      if (!shown(e.fixedAt, seen, now)) continue;
      const how = !seen ? '아직 안 봄 — 그날 에세이를 다 쓰면 가장 최근 것부터 하루 한 문장씩 떠요' : (HOW_KO[e.readHow] || '봄 (🎤로 읽었는지는 v314부터 적어요)');
      out.push({
        at: num(e.fixedAt), seen,
        text: [`- ${d.date.slice(5)}에 쓴 글 · 붙은 때 ${fmtAt(e.fixedAt) || '(모름)'} · 본 때 ${seen ? fmtAt(e.readAt) : '—'} · ${how}`,
          `  진우: ${oneLine(e.written)}`, `  아빠: ${oneLine(e.coachFix)}`].join('\n'),
      });
    }
  }
  return keep(out);
}

/**
 * ✍️ 내 에세이 — 쓰고 나서 고친 문장을 🎤로 읽었나 (순수, v318) — 최근 FEEDBACK_DAYS일 날마다 한 줄 (글이 있는 날만)
 * sayHow 없음 = v318 전에 쓴 글이거나 넘어가지 않고 닫은 글
 */
export function selfItems(days, now) {
  const from = now - FEEDBACK_DAYS * DAY_MS;
  const out = [];
  for (const d of Array.isArray(days) ? days : []) {
    if (!d || typeof d.date !== 'string') continue;
    const t = new Date(`${d.date}T12:00:00`).getTime();
    if (!(t >= from)) continue;
    const list = (Array.isArray(d.essays) ? d.essays : []).filter((e) => e && e.written);
    if (!list.length) continue;
    const n = (h) => list.filter((e) => (h ? e.sayHow === h : !HOW_KO[e.sayHow])).length;
    out.push({ date: d.date, text: `- ${d.date.slice(5)}: 글 ${list.length} · 🎤 통과 ${n('pass')} · 해 봄 ${n('try')} · 🎤 없이 넘김 ${n('skip')} · 기록 없음 ${n('')}` });
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** 📚 국어 답장 줄들 (순수) — writes는 저장 꼴 { 카드: { list:[{ at, grade, rAt, read, rdAt? }] } } · 그 뒤 같은 카드에 다시 쓴 글이 있으면 그 등급까지 */
export function korItems(writes, now) {
  const out = [];
  for (const card of Object.keys(isObj(writes) ? writes : {})) {
    const list = (isObj(writes[card]) && Array.isArray(writes[card].list) ? writes[card].list : []).filter((e) => isObj(e) && num(e.at)).slice().sort((a, b) => a.at - b.at);
    list.forEach((e, i) => {
      if (!GRADE_KO[e.grade]) return;
      const seen = e.read === true;
      if (!shown(e.rAt, seen, now)) return;
      const next = list[i + 1];
      // 다음 글이 답장을 본 뒤에 쓴 것인가 — 본 때를 모르면 안 적는다 (🔍 Codex 120차 작은 것)
      const when = !next ? '' : !seen ? ' (답장을 보기 전)' : num(e.rdAt) ? (num(next.at) > num(e.rdAt) ? ' (답장을 본 뒤)' : ' (답장을 보기 전)') : '';
      const after = next ? `그 뒤 다시 씀 ${fmtAt(next.at)}${when} → ${GRADE_KO[next.grade] || '답장 기다림'}` : e.grade === 'ok' ? '✅ 끝' : seen ? '아직 다시 안 씀' : '';
      const name = /^N/.test(card) ? `${card} 🖊️ 논술` : card;
      out.push({
        at: num(e.rAt), seen,
        text: `- ${name} ${GRADE_KO[e.grade]} · 붙은 때 ${fmtAt(e.rAt) || '(모름)'} · 본 때 ${seen ? fmtAt(e.rdAt) || '읽음 (때는 v314부터 적어요)' : '— 아직 안 봄 (국어를 열면 📬로 떠요)'}${after ? ` · ${after}` : ''}`,
      });
    });
  }
  return keep(out);
}

/**
 * 🔢 마지막 답장을 봤나 (순수) — { seen, at 본 때(모르면 0) } (🔍 Codex 120차 #1: readAt은 처음 답장을 연 때라 두 번째 답장이 붙어도 그대로다)
 * · seenT(v314)가 마지막 답장 시각 이상이면 그때 본 것 · 😄/🤔를 골랐거나 문제를 풀었으면(understood·again·fixed — 답장이 붙으면 answered로 돌아간다) 본 것
 * · v314 전 기록은 답장이 하나뿐일 때만 readAt을 믿는다 · 아빠가 닫은 질문(closed)은 seenT·readAt으로만
 */
export function askSeen(a, lastT) {
  if (num(a.seenT) && num(a.seenT) >= lastT) return { seen: true, at: num(a.seenAt) };
  const one = Array.isArray(a.replies) && a.replies.length === 1 && num(a.readAt) > 0;
  if (['understood', 'again', 'fixed'].includes(a.status)) return { seen: true, at: one ? num(a.readAt) : 0 };
  return one ? { seen: true, at: num(a.readAt) } : { seen: false, at: 0 };
}

/** 🔢 수학 답장 줄들 (순수) — 답장이 붙은 질문만 · 붙은 때 = 마지막 답장 */
export function askItems(asks, now, conceptName) {
  const out = [];
  for (const a of Array.isArray(asks) ? asks : []) {
    if (!isObj(a) || !Array.isArray(a.replies) || !a.replies.length) continue;
    const at = Math.max(0, ...a.replies.map((r) => num(r && r.t)));
    const { seen, at: seenAt } = askSeen(a, at);
    if (!shown(at, seen, now)) continue;
    let name = String(a.concept || '');
    try { if (typeof conceptName === 'function') name = conceptName(a.concept) || name; } catch { /* 이름을 못 찾으면 id 그대로 */ }
    // 풀어 본 수는 그 질문의 모든 답장을 통틀은 수 (🔍 Codex 120차 #4)
    const tries = num(a.tries) ? ` · 확인 문제 모두 ${num(a.tries)}번 풀어 봄` : '';
    // 원래 틀이 없어 다른 문제로 확인했으면(sameKey 0) 같은 틀로 확인한 것이 아니다 (🔍 Codex 120차 #4 — math.js askTry)
    const state = a.status === 'answered' ? (seen ? '읽음 — 😄/🤔 아직 안 고름' : '아직 안 읽음')
      : a.status === 'fixed' && a.sameKey === 0 ? '😄 알았어요 → 다른 문제로 확인 ✅ (원래 틀은 이제 없어요)'
        : ASK_KO[a.status] || String(a.status || '');
    out.push({
      at, seen,
      text: `- ❓${num(a.no) || '?'} ${oneLine(name, 40)} · 답장 ${fmtAt(at) || '(모름)'}${a.replies.length > 1 ? ` (${a.replies.length}번째)` : ''} · 본 때 ${seen ? fmtAt(seenAt) || '읽음 (때는 v314부터 적어요)' : '— 아직 안 봄 (수학 화면을 열면 떠요)'} · ${state}${tries}`,
    });
  }
  return keep(out);
}

/** 갈래 하나의 요약 — "3 (본 것 2 · 안 본 것 1)" */
function tally(items) {
  const seen = items.filter((x) => x.seen).length;
  return `${items.length}${items.length ? ` (본 것 ${seen} · 안 본 것 ${items.length - seen})` : ''}`;
}

/**
 * 📤 usage/feedback.md 글 (순수)
 * @param {{days:Array, writes:object, asks:Array, today:string, now:number, conceptName?:Function}} o
 */
export function feedbackMd({ days, writes, asks, today, now, conceptName } = {}) {
  const t = num(now) || Date.now();
  const en = essayItems(days, t);
  const self = selfItems(days, t);
  const ko = korItems(writes, t);
  const ma = askItems(asks, t, conceptName);
  const lines = [
    `# 📬 피드백이 닿았나 (${today} · 이 기기 기준) — 최근 ${FEEDBACK_DAYS}일 안에 붙은 것 + 아직 안 본 것 모두`,
    '',
    `요약: ✍️ 영어 교정 ${tally(en)} · 📚 국어 답장 ${tally(ko)} · 🔢 수학 답장 ${tally(ma)}`,
    '읽는 법: 붙은 때 = 태블릿이 비공개 저장소에서 받아 붙인 때 · 본 때 = 진우 화면에 떠서 읽고 넘어간 때 · 그 뒤 = 진우가 해 본 것 · 💌 한 줄 메시지는 family/read.md',
    '',
    '## ✍️ 영어 교정 — v336부터 그날 에세이를 다 쓴 바로 뒤에 가장 최근 것 한 문장(그 전엔 영어 영상을 열 때 3개까지 · 앞의 것은 밀려 "아직 안 봄"으로 남을 수 있어요)(내 글 · 아빠 글(바뀐 곳 색) → 🔊 끝까지 들은 뒤 넘어감 → 🎤 읽어보기 · v318부터 ⚡💰는 🎤를 해 봤을 때만)',
    ...(en.length ? en.map((x) => x.text) : ['(없음)']),
    '',
    '## ✍️ 내 에세이 — 쓰고 나서 고친 문장을 🎤로 읽었나 (v318부터 · 기록 없음 = 그 전 글이거나 넘어가지 않고 닫음 · 🎤로 통과하면 🔶 하루 2개까지)',
    ...(self.length ? self.map((x) => x.text) : ['(없음)']),
    '',
    '## 📚 국어 답장 — 국어를 열면 📬로 떠요 (그 뒤 = 같은 카드에 다시 쓴 글)',
    ...(ko.length ? ko.map((x) => x.text) : ['(없음)']),
    '',
    '## 🔢 수학 답장 — 수학 화면을 열면 떠요 (읽어야 ☀️ 오늘의 수학이 열려요)',
    ...(ma.length ? ma.map((x) => x.text) : ['(없음)']),
  ];
  return `${lines.join('\n').trim()}\n`;
}
