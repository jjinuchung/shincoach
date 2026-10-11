// 📘 5학년 국어 단원 지도 (2026-10-11, 아버님 "니 제안대로 하자") — 순수 규칙
// 단원마다 이어진 📚 글 카드(units.json의 cards)와 🔤 국어 공부 말(words.json의 unit) · 진행(★ · ⭐ 익힌 낱말)
// 이어진 것이 없는 단원은 "준비 중" — 다음 글을 고를 때 빈 단원부터 채운다
import { starsOf } from './korean.js';
import { MASTER_BOX, wordsOf } from './korwords.js';

export const TERMS = ['5-1', '5-2'];

/**
 * 단원 고쳐 읽기 — 형식이 깨진 단원은 빼고, 없는 카드·낱말은 버린다
 * @param {object} data units.json
 * @param {Array<{id:string, title:string, icon:string}>} cards 쓸 수 있는 글 카드
 * @param {Array<{id:string, deck:string, w:string, unit?:string}>} words korwords.allWords
 * @returns {Array<{id,term,no,title,goal,note,cards:object[],words:object[]}>}
 */
export function unitsOf(data, cards, words) {
  const byCard = new Map((cards || []).map((c) => [c.id, c]));
  const list = data && Array.isArray(data.units) ? data.units : [];
  return list
    .filter((u) => u && typeof u.id === 'string' && TERMS.includes(u.term) && typeof u.title === 'string' && u.title)
    .map((u) => ({
      id: u.id,
      term: u.term,
      no: typeof u.no === 'string' ? u.no : '',
      title: u.title,
      goal: typeof u.goal === 'string' ? u.goal : '',
      note: typeof u.note === 'string' ? u.note : '',
      cards: (Array.isArray(u.cards) ? u.cards : []).map((id) => byCard.get(id)).filter(Boolean),
      words: (words || []).filter((w) => w.unit === u.id),
    }));
}

/** 단원 머리 이름 — "6단원 「빗대어 표현해요」" · 독서·매체 단원은 그 이름 그대로 */
export function unitLabel(u) {
  if (!u) return '';
  if (u.no === '독서') return `📖 ${u.title}`;
  if (u.no === '매체') return `📺 매체 단원 「${u.title}」`;
  return `${u.no}단원 「${u.title}」`;
}

/** 단원 진행 — { stars, starMax, words, mastered, empty } */
export function unitProgress(u, korDone, states) {
  const st = wordsOf(states);
  const stars = (u.cards || []).reduce((n, c) => n + starsOf(korDone, c.id), 0);
  const mastered = (u.words || []).filter((w) => st[w.id] && st[w.id].box >= MASTER_BOX).length;
  return { stars, starMax: (u.cards || []).length * 3, words: (u.words || []).length, mastered, empty: !(u.cards || []).length && !(u.words || []).length };
}

/** 단원 원고 검사 — 오류 문장 배열 · id 겹침 없음 · 학기·이름·배울 것 · 카드는 reading.json에 있는 것 · 낱말의 unit은 있는 단원 */
export function checkUnits(data, cards, wordsData) {
  const errs = [];
  const list = data && Array.isArray(data.units) ? data.units : null;
  if (!list || !list.length) return ['units가 없어요'];
  const cardIds = new Set((cards || []).map((c) => c && c.id));
  const ids = new Set();
  list.forEach((u, i) => {
    const at = (m) => errs.push(`units[${i}] ${u && u.id ? u.id : ''}: ${m}`);
    if (!u || typeof u.id !== 'string' || !u.id) { at('id가 없어요'); return; }
    if (ids.has(u.id)) at('id가 겹쳐요');
    ids.add(u.id);
    if (!TERMS.includes(u.term)) at('term은 5-1 또는 5-2');
    if (typeof u.title !== 'string' || !u.title) at('title이 없어요');
    if (typeof u.goal !== 'string' || !u.goal) at('goal(배울 것)이 없어요');
    for (const c of (Array.isArray(u.cards) ? u.cards : [])) if (!cardIds.has(c)) at(`없는 카드 ${c}`);
    if (u.cards !== undefined && !Array.isArray(u.cards)) at('cards는 배열');
  });
  for (const w of (wordsData && Array.isArray(wordsData.words) ? wordsData.words : [])) {
    if (w && w.unit !== undefined && !ids.has(w.unit)) errs.push(`낱말 ${w.w}: 없는 단원 ${w.unit}`);
  }
  return errs;
}
