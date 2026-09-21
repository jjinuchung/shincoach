// 🛟 아이 기록 지키기
//
// 코인·도감·공부 기록은 IndexedDB 한 곳에만 있다. 2026-09-17 저장 깨짐 사고 때는 살아남았지만
// (작은 레코드라 곁 파일을 안 써서), 사이트 데이터가 통째로 지워지면 몇 달 모은 도감이 사라진다.
// 아이에게는 영상보다 이쪽이 훨씬 아프다.
//
//  ① 기기 안에 작은 사본을 자동으로 남긴다 (localStorage — IndexedDB가 깨져도 따로 산다)
//  ② 사본은 있는데 기록이 비어 있으면 **부모에게만**(📊) 복구 버튼을 보여 준다. 아이 화면엔 아무 말도 안 한다
//  ③ 진짜 백업은 파일이다 — 주 1회 아버님께만 알린다
//
// ※ 사본은 "없는 것보다 나은 것"이다. 사이트 데이터를 통째로 지우면 이것도 같이 사라지므로
//    파일 백업을 대신하지 못한다. 그래서 ③이 함께 있다.

import { getAllSentenceStats, listDaily, getProfile, getMath, importStats } from './db.js';

const KEY = 'shincoach.backup';
const FILE_KEY = 'shincoach.lastFileBackup';
export const FILE_BACKUP_DAYS = 7; // 이만큼 지나면 📊에서 아버님께 알린다

// ───────────────────── 순수 계산 ─────────────────────

/**
 * 문장 기록에서 **되살려야 하는 것만** 남긴다.
 * 전부 담으면 localStorage 한도(보통 5MB)를 넘긴다 — 문장 수천 개면 레코드당 250B라 금방 찬다.
 * 다시 만들 수 없는 것: 끝냈는지(done)·제일 잘한 점수(bestRatio)·🔁 복습 진도(box·dueAt).
 * 재생 횟수·시간 같은 통계는 파일 백업에 맡기고 여기선 뺀다.
 */
export function slimStats(records = []) {
  const out = [];
  for (const r of records || []) {
    if (!r || !r.key) continue;
    const keep = { key: r.key, itemId: r.itemId };
    if (r.done) keep.done = r.done;
    if (r.bestRatio) keep.bestRatio = r.bestRatio;
    if (r.box) keep.box = r.box;
    if (r.dueAt) keep.dueAt = r.dueAt;
    if (r.reviewedAt) keep.reviewedAt = r.reviewedAt;
    if (r.reviewPass) keep.reviewPass = r.reviewPass;
    if (r.speakPass) keep.speakPass = r.speakPass;
    // 아무 성과도 없는 문장은 담지 않는다 (사본을 작게)
    if (Object.keys(keep).length > 2) out.push(keep);
  }
  return out;
}

/** 사본 한 덩이 — 📊의 "가져오기"가 먹는 형식 그대로라 복구에 그 규칙(mergeStatRecord)을 그대로 쓴다 */
export function makeSnapshot({ profile = null, math = null, daily = [], sentenceStats = [] } = {}, now = new Date()) {
  // 🔢 수학 진도(profile 스토어의 'math' 레코드)도 담는다 — 개념·복습 일정·일지는 다시 만들 수 없다 (Codex 2026-09-21 #3)
  const hasMath = math && Object.keys(math.concepts || {}).length;
  return {
    app: 'shincoach',
    version: 1,
    kind: 'auto',
    exportedAt: now.toISOString(),
    profile: [profile, hasMath ? math : null].filter(Boolean),
    daily: daily || [],
    sentenceStats: slimStats(sentenceStats),
  };
}

/** 지금 기기의 기록이 비어 있는가 (= 잃어버린 것으로 보이는가) */
export function isEmptyNow({ profile = null, sentenceStats = [] } = {}) {
  const p = profile || {};
  const caught = Object.keys(p.caught || {}).length;
  return !(sentenceStats || []).length && !(p.xp || 0) && !(p.coins || 0) && !caught;
}

/** 사본에 되살릴 만한 것이 들어 있는가 */
export function snapshotHas(snap) {
  if (!snap || snap.app !== 'shincoach') return false;
  const p = (snap.profile || []).find((r) => r && r.id !== 'math') || {};
  const m = (snap.profile || []).find((r) => r && r.id === 'math') || {};
  return !!((snap.sentenceStats || []).length || p.xp || p.coins || Object.keys(p.caught || {}).length || Object.keys(m.concepts || {}).length);
}

/** 부모가 "무엇을 되돌리는지" 알고 누르도록 한 줄로 */
export function snapshotSummary(snap) {
  if (!snapshotHas(snap)) return '';
  const p = (snap.profile || []).find((r) => r && r.id !== 'math') || {};
  const m = (snap.profile || []).find((r) => r && r.id === 'math') || {};
  const mons = Object.values(p.caught || {}).reduce((a, n) => a + (Number(n) || 0), 0);
  const days = (snap.daily || []).filter((d) => d && (d.seconds || 0) > 0).length;
  const parts = [
    `💰 ${(p.coins || 0).toLocaleString()}코인`,
    `⚡ ${(p.xp || 0).toLocaleString()}XP`,
    `🎒 포켓몬 ${mons}마리`,
    `📚 공부한 날 ${days}일`,
    `✍️ 문장 ${(snap.sentenceStats || []).length}개`,
  ];
  const mc = Object.keys(m.concepts || {}).length;
  if (mc) parts.push(`🔢 수학 개념 ${mc}개`);
  return parts.join(' · ');
}

export function daysSince(iso, now = new Date()) {
  const t = Date.parse(iso || '');
  if (!t) return null;
  return Math.floor((now.getTime() - t) / 86400000);
}

/** 파일 백업을 권할 때가 됐는가 (한 번도 안 했으면 권한다) */
export function needsFileBackup(lastIso, now = new Date()) {
  const d = daysSince(lastIso, now);
  return d === null || d >= FILE_BACKUP_DAYS;
}

// ───────────────────── 저장소 ─────────────────────

export function readMirror() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null; // 깨진 사본은 없는 것으로
  }
}

/**
 * 지금 기록으로 사본을 새로 쓴다.
 * ★ 기록이 비어 있으면 저장하지 않는다 — 빈 것으로 멀쩡한 사본을 덮으면 백업이 없느니만 못하다.
 * 용량이 넘치면 문장 기록을 빼고 프로필만이라도 남긴다.
 */
export async function saveMirror(now = new Date()) {
  let profile = null;
  let math = null;
  let daily = [];
  let sentenceStats = [];
  try {
    [profile, math, daily, sentenceStats] = await Promise.all([
      getProfile().catch(() => null),
      getMath().catch(() => null),
      listDaily().catch(() => []),
      getAllSentenceStats().catch(() => []),
    ]);
  } catch {
    return false;
  }
  if (isEmptyNow({ profile, sentenceStats }) && !(math && Object.keys(math.concepts || {}).length)) return false;

  const snap = makeSnapshot({ profile, math, daily, sentenceStats }, now);
  try {
    localStorage.setItem(KEY, JSON.stringify(snap));
    return true;
  } catch {
    try { // 문장 기록을 빼고 다시 (도감·코인만이라도)
      localStorage.setItem(KEY, JSON.stringify({ ...snap, sentenceStats: [], trimmed: true }));
      return true;
    } catch {
      return false; // 저장 공간이 아예 없으면 조용히 포기 — 학습은 계속돼야 한다
    }
  }
}

/** 지금 기록이 비었고 사본이 있으면 복구를 제안할 만한가 (부모 화면에서만 쓴다) */
export async function restoreOffer() {
  const snap = readMirror();
  if (!snapshotHas(snap)) return null;
  const [profile, sentenceStats] = await Promise.all([
    getProfile().catch(() => null),
    getAllSentenceStats().catch(() => []),
  ]);
  if (!isEmptyNow({ profile, sentenceStats })) return null;
  return { snap, summary: snapshotSummary(snap), savedAt: snap.exportedAt };
}

/** 부모가 눌렀을 때만 실행 — 가져오기와 같은 병합 규칙을 쓴다 */
export async function restoreFromMirror() {
  const snap = readMirror();
  if (!snapshotHas(snap)) throw new Error('되돌릴 사본이 없어요');
  return importStats(snap);
}

export function lastFileBackup() {
  try { return localStorage.getItem(FILE_KEY) || ''; } catch { return ''; }
}

export function markFileBackup(now = new Date()) {
  try { localStorage.setItem(FILE_KEY, now.toISOString()); } catch { /* 안 되면 알림이 계속 뜰 뿐 */ }
}
