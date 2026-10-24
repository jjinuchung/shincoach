// 🔥 국어·논술 연속 학습 · ✨ 오늘의 보너스 (v329, 2026-10-24 아버님 "이대로") — 순수 규칙 (주기·끝 화면 조각은 kordayview.js)
//
// 🔥 연속 학습 — 국어·논술을 합쳐 하나. 공부한 날 = 국어 글 한 편(다시 읽기·🎧 듣기 카드 포함)이나 논술 한 판(⭐ 연습 포함)을 끝낸 날
//    🔤 낱말·🧩 퍼즐만 한 날은 치지 않는다(글·논술 쪽으로 이끌려고) · 그날 처음 끝냈을 때 한 번 — daily.korStreak를 claimDailyCount로 선점(두 창이어도 한 번)
//    얼마는 영어와 같다: xp.streakBonus ⚡ 10 → 15 → … 40 · items.streakCoins 💰 5 → 10 → … 50
//    끝 화면 한 줄만 — 끊겨도 아무 말 없음 · 영어의 "어제 안 하면 HP 깎기"는 없음 · 목록·홈에 날 수를 띄우지 않음(압박하는 셈 금지)
//    지난날: 하루 기록(korReads v314 · nsRounds v327 · korStreak) + 프로필의 읽은 기록 줄(korReads — 최근 120줄)·논술 보상 받은 날(nonsulDay)
// ✨ 오늘의 보너스 — 국어 카드·논술 카드 따로(mathbonus.subjectBonus — 수학·국어·논술이 그날 모두 다르다)
//    그 과목 그날 첫 끝냄에 한 번 — daily.korDayBonus · nsDayBonus (★ korBonus는 ⏳ 국어 부모 추가 시간 칸이라 쓰지 않는다)
import { readsOf, dayKeyOf } from './korean.js';
import { subjectBonus, bonusText } from './mathbonus.js';

/** 하루 기록(daily)의 칸 — 모두 db.DAILY_SUMS (병합은 큰 쪽이라 옛 백업으로 받은 몫을 되살리지 못한다) */
export const KOR_DAY = {
  streak: 'korStreak',
  bonus: { korean: 'korDayBonus', nonsul: 'nsDayBonus' },
  match: 'korMatches', // 🔤 낱말 이어 주기 판 수 (kormatch.js)
};

/** 홈 카드 밑 한 줄 — 무엇을 하면 받나 */
export const BONUS_TIP = { korean: '📚 글 한 편 다 읽으면 받아요', nonsul: '🖊️ 논술 한 판 끝내면 받아요' };

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const num = (v) => Number(v) || 0;

/** ✨ 그 과목의 하루 기록 칸 — 국어·논술만 (물려받은 이름 'constructor' 같은 것은 아니다) */
export function bonusField(subject) {
  return typeof subject === 'string' && Object.hasOwn(KOR_DAY.bonus, subject) ? KOR_DAY.bonus[subject] : null;
}

/** 그날 국어·논술 공부를 했나 — 글 한 편 · 논술 한 판 · 🔥를 받은 날 */
export function korDayOk(d) {
  return !!d && (num(d.korReads) > 0 || num(d.nsRounds) > 0 || num(d[KOR_DAY.streak]) > 0);
}

/** 'YYYY-MM-DD' → 하루 전 (달력으로 — 시간대·서머타임과 상관없이) */
export function prevKey(key) {
  const [y, m, d] = String(key).split('-').map(Number);
  return dayKeyOf(Math.floor(Date.UTC(y, m - 1, d) / 86400000) - 1);
}

/**
 * 어제까지 이어 온 날 수 (오늘은 빼고 — 오늘은 부르는 쪽이 +1) · xp.streakBefore와 같은 꼴
 * @param {Array} list db.listDaily · @param {string} today · @param {Iterable<string>} [extra] 공부한 날로 더 칠 날('YYYY-MM-DD')
 */
export function korStreakBefore(list, today, extra = []) {
  const ok = new Set((Array.isArray(list) ? list : []).filter((d) => d && d.date !== today && korDayOk(d)).map((d) => d.date));
  for (const k of extra || []) if (DAY_RE.test(k) && k !== today) ok.add(k);
  if (!DAY_RE.test(String(today))) return 0;
  let n = 0;
  let day = prevKey(today);
  while (ok.has(day)) { n++; day = prevKey(day); }
  return n;
}

/** 프로필에 남은 공부한 날 — 읽은 기록 줄의 날 · 논술 보상 받은 날 (하루 기록에 국어 칸이 생기기 전 날들까지) */
export function profileKorDays(p) {
  const out = new Set();
  for (const x of readsOf(p && p.korReads)) { const k = dayKeyOf(x.d); if (k) out.add(k); }
  const nd = p && p.nonsulDay && typeof p.nonsulDay === 'object' && !Array.isArray(p.nonsulDay) ? p.nonsulDay : {};
  for (const k of Object.keys(nd)) { const s = dayKeyOf(Number(k)); if (s && num(nd[k]) > 0) out.add(s); }
  return [...out];
}

/** 🔥 끝 화면 한 줄 (순수) — { days, xp, coin } → 말 · 받지 않았으면 '' */
export function streakLine(s) {
  if (!s || !(s.days > 0)) return '';
  return s.days > 1
    ? `🔥 ${s.days}일 연속 국어·논술 공부! ⚡+${s.xp} 💰+${s.coin}`
    : `🔥 오늘 국어·논술 공부 시작! ⚡+${s.xp} 💰+${s.coin} (내일도 하면 더 많이)`;
}

/** ✨ 끝 화면 한 줄 (순수) */
export function bonusLine(b) {
  return b ? `✨ 오늘의 보너스 ${bonusText(b)} 받았어요!` : '';
}

/**
 * 홈 카드에 얹을 오늘의 보너스 (순수) — { text, tip, got } · 보너스 칸이 없는 과목이면 null
 * @param {object|null} daily 오늘 하루 기록 · @param {string} today · @param {'korean'|'nonsul'} subject
 */
export function korBonusFor(daily, today, subject) {
  const field = bonusField(subject);
  if (!field) return null;
  const b = subjectBonus(today, subject);
  if (!b) return null;
  return { text: bonusText(b), tip: BONUS_TIP[subject], got: num(daily && daily[field]) > 0 };
}
