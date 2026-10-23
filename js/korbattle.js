// ⚔️ 국어·논술 배틀 (v325, 2026-10-23 — 아버님 "국어·논술에도 배틀이 있어야 하지 않을까?" → 기본안 → "진행해줘") — 순수 규칙
// 배틀 판(상대 고르기·내 포켓몬·HP·물약·📣·보상·패배)은 영어·수학과 똑같이 battle.js · 다른 것은 턴마다 푸는 문제 하나:
//   📚 국어 = 🔤 낱말 뜻 고르기(korwords.makeQuestion — 진우가 배운 낱말에서, 없으면 아무 낱말에서) ·
//     손질한 네 묶음(📘·🗣️·🐢·🀄 — 헷갈리는 짝·넓은 말 좁은 말을 원고가 적어 둠)에서만: 📖 글에서 만난 낱말은 글마다 따로 적어
//     뜻이 거의 같은 짝이 있다(표지판/안내판 · 횡단보도/건널목 — 정답이 둘인 문제, 🔍 Codex 129차 #2)
//   🖊️ 논술 = 이 의견에 알맞은 이유 고르기 — 원고 nonsul.json의 이유·상관없는 말 그대로(새 글 없음 · 이미 검수한 문장만):
//     보기 넷 = 그 편 이유 하나(정답) · 반대편 이유 둘 · 상관없는 말 하나 · 생활 주제에서만: 📖 독서 논술(card)은 이야기 없이 보면
//     양쪽 이유로 읽히는 문장이 있었다(이야기 줄을 알아야 편이 정해진다 · 지어낸 말 — 🔍 Codex 129차 #3 · 그 문장들은 v326에서 고쳤어도 배틀엔 이야기가 없다)
//   배틀 문제는 기록하지 않는다(낱말 칸·주제 칸을 안 옮긴다 — 수학 배틀 문제와 같다)
// 나오는 때(화면은 korbattleview): 글 한 편 · 논술 한 판을 끝내고 저장된 화면에 가끔(KOR_BATTLE.chance) 「⚔️ 배틀하러 가기」 단추 —
//   하루 몫(battle.BATTLE.maxPerDay)은 영어·수학과 함께 세고, 단추를 누를 때 쓴다(배틀 화면에서 거절해도 쓴 것 — 다른 과목과 같다)
import { makeQuestion, DECKS } from './korwords.js';

export const KOR_BATTLE = {
  chance: 1 / 3, // 글 한 편·한 판마다 — 하루 두세 편이면 하루 한 번쯤 (영어·수학과 합쳐 하루 3번이 끝)
};

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
const str = (v) => typeof v === 'string' && v.trim().length > 0;

function shuffle(list, rng) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.min(i, Math.floor((Number(rng()) || 0) * (i + 1))); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const pick = (list, rng) => list[Math.min(list.length - 1, Math.floor((Number(rng()) || 0) * list.length))];

/**
 * 이번에 단추를 내놓을까 — 오늘 배틀(영어·수학·국어·논술 합)이 아직 남았고 확률이 맞으면
 * @param {{todayBattles:number, max:number, rng?:() => number}} o
 */
export function offerRoll({ todayBattles = 0, max = 0, rng = Math.random } = {}) {
  if (!((Number(todayBattles) || 0) < max)) return false;
  return rng() < KOR_BATTLE.chance;
}

/**
 * 🔤 국어 턴 문제 — 뜻 고르기 하나 → { id, label, q, choices: [{ text, ok }] } · 낼 수 없으면 null
 *   묻는 낱말: 손질한 네 묶음의 배운 낱말(칸 기록이 있는 것) · 하나도 없으면 네 묶음 아무 낱말 · 이번 배틀에 낸 낱말(seen)은 피한다(다 냈으면 다시)
 *   보기: 같은 묶음의 낱말 뜻(makeQuestion — 헷갈리는 짝 먼저 · 넓은 말·좁은 말은 같이 안 냄) · 📖 글에서 만난 낱말은 묻지도 보기로도 안 쓴다
 * @param {Array} words korwords.allWords
 * @param {object} states 낱말 칸(korWords)
 * @param {Set<string>} [seen] 이번 배틀에 낸 문제 id
 */
export function korBattleQ(words, states, seen = new Set(), rng = Math.random) {
  const pool = (Array.isArray(words) ? words : []).filter((w) => w && w.deck !== 'passage' && own(DECKS, w.deck));
  const learned = pool.filter((w) => own(states, w.id));
  const base = learned.length ? learned : pool;
  const fresh = base.filter((w) => !seen.has(w.id));
  for (const w of shuffle(fresh.length ? fresh : base, rng)) {
    const q = makeQuestion(w, 'mean', pool, rng);
    if (!q) continue;
    const d = DECKS[w.deck];
    return { id: w.id, label: `🔤 ${d ? `${d.icon} ${d.ko}` : '낱말'}`, q: q.prompt, choices: q.opts.map((o) => ({ text: o.t, ok: !!o.ok })) };
  }
  return null;
}

/**
 * 논술 배틀에 쓸 수 있는 주제인가 — 생활 주제(📖 독서 논술 card는 빼고)이고 두 편 의견·이유(반대편 둘 이상)·상관없는 말이 있고
 * 보기 글이 서로 다르다
 */
function topicOk(t) {
  if (!t || t.card || !str(t.id) || !str(t.q)) return false;
  for (const side of ['yes', 'no']) {
    const s = t[side];
    if (!s || !str(s.label) || !Array.isArray(s.reasons) || s.reasons.length < 2 || !s.reasons.every(str)) return false;
  }
  if (!Array.isArray(t.off) || !t.off.length || !t.off.every((o) => o && str(o.t))) return false;
  const all = [...t.yes.reasons, ...t.no.reasons, ...t.off.map((o) => o.t)];
  return new Set(all).size === all.length;
}

/**
 * 🖊️ 논술 턴 문제 — 「(한 편 의견)」라는 의견에 알맞은 이유 → { id: '주제:편', label, q, choices: [{ text, ok }] } · 낼 수 없으면 null
 *   주제: 판을 해 본 생활 주제(played에 칸이 있는 것) · 없으면 아무 생활 주제 · 이번 배틀에 낸 주제·편(seen)은 피한다(다 냈으면 다시)
 *   보기 넷: 그 편 이유 하나(정답) · 반대편 이유 둘 · 상관없는 말 하나 — 차례는 섞는다
 * @param {Array} topics nonsul.allTopics · @param {object} played 주제 칸(nonsulMap)
 */
export function nonsulBattleQ(topics, played, seen = new Set(), rng = Math.random) {
  const list = (Array.isArray(topics) ? topics : []).filter(topicOk);
  const tried = list.filter((t) => own(played, t.id));
  const base = tried.length ? tried : list;
  const pairs = [];
  for (const t of base) for (const side of ['yes', 'no']) pairs.push([t, side]);
  if (!pairs.length) return null;
  const fresh = pairs.filter(([t, side]) => !seen.has(`${t.id}:${side}`));
  const [t, side] = pick(fresh.length ? fresh : pairs, rng);
  const other = side === 'yes' ? 'no' : 'yes';
  const choices = shuffle([
    { text: pick(t[side].reasons, rng), ok: true },
    ...shuffle(t[other].reasons, rng).slice(0, 2).map((x) => ({ text: x, ok: false })),
    { text: pick(t.off, rng).t, ok: false },
  ], rng);
  return { id: `${t.id}:${side}`, label: `🖊️ ${t.icon ? `${t.icon} ` : ''}${t.q}`, q: `「${t[side].label}」라는 의견에 알맞은 이유는 무엇인가요?`, choices };
}
