// 🎮 보상 쪽 기록 (v278, 2026-10-17 아버님 "빠져 있는 기록 두 가지에 대해서도 진행하자") — 📤 reward/날짜.md (비공개 저장소에만, 아이 화면엔 안 보인다)
//
// 왜: 잡기·배틀·상점·5일장에서 무엇을 얼마나 했는지는 올라오지 않아, 공부 대신 보상에 시간을 쓰는지를 🕒 화면별 시간으로만 짐작했다.
// 어떻게: 프로필이 이미 쌓는 **누적**(던진 공·잡은 수·공부로 번 코인·쓴 스톤·레벨·진화·로켓단·판 수·교환·사탕)을 올릴 때마다
//   "그날의 마지막 값"으로 이 기기에 적어 두고(upload.js — localStorage), 하루 줄 = 그날 값 − 그 앞에 기록이 있는 날의 값.
//   보상 화면 곳곳에 새 셈을 끼우지 않는다 — 셀 곳을 하나라도 빠뜨리면 조용히 틀린다(잡기·배틀·알·레이더·로켓단…).
// 순수 — 화면·저장소 없음 (evolve·items만 import, 둘 다 아무것도 import하지 않는다)
import { haveOf, lvOf, candyCount, candyOf } from './evolve.js';
import { itemById } from './items.js';

/**
 * 하루 줄에 보여 줄 누적 칸 [열쇠, 이름] — coins만 잔액(줄 수 있다), 나머지는 늘어나기만 하는 누적.
 * 레벨 칸 = 종마다 (레벨−1)의 합 — 진화하면 물려받은 레벨까지 늘어난다 (Codex 86차: "레벨업"이라 부르면 진화만 해도 레벨업으로 읽힌다)
 */
export const SNAP_KEYS = [
  ['throws', '공 던짐'], ['catches', '잡음'], ['kinds', '새 도감'], ['coinsEarned', '공부로 번 💰'], ['coins', '💰 남은 돈'],
  ['stonesSpent', '레벨업에 쓴 스톤'], ['lvSum', '레벨 칸'], ['evoSum', '진화'], ['rocketWon', '🚀 이김'], ['rocketLost', '🚀 짐'],
  ['sold', '🏪 판 포켓몬'], ['traded', '🤝 교환'], ['candyGot', '🍬 받음'], ['candyUsed', '🍬 씀'],
];
/** 이 기기에 적어 두는 날 수 */
export const SNAP_DAYS = 10;

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const num = (v) => Math.max(0, Math.floor(Number(v) || 0));

/** 프로필 → 누적 한 벌 (순수) */
export function rewardSnap(p) {
  const pf = p || {};
  const mons = pf.mons || {};
  const caught = pf.caught || {};
  let lvSum = 0, evoSum = 0, sold = 0, traded = 0, candyGot = 0, candyUsed = 0;
  for (const id of Object.keys(mons)) {
    const m = mons[id] || {};
    lvSum += lvOf(m) - 1;
    evoSum += num(m.evo);
    sold += num(m.sold);
    traded += num(m.traded);
    candyGot += candyCount(m.candy);
    candyUsed += candyCount(m.candyUsed);
  }
  return {
    throws: num(pf.throws), catches: num(pf.catches), kinds: Object.keys(caught).filter((k) => num(caught[k]) > 0).length,
    coinsEarned: num(pf.coinsEarned), coins: num(pf.coins), stonesSpent: num(pf.stonesSpent), lvSum, evoSum,
    rocketWon: num(pf.rocketWon), rocketLost: num(pf.rocketLost), sold, traded, candyGot, candyUsed,
  };
}

/** 적어 둔 누적에 오늘 것을 넣는다 (순수 — 새 객체) · 날짜 꼴이 아닌 것은 버리고 최근 keep일만 */
export function putSnap(snaps, today, snap, keep = SNAP_DAYS) {
  const out = {};
  for (const d of Object.keys(snaps && typeof snaps === 'object' ? snaps : {})) if (DAY_RE.test(d) && snaps[d] && typeof snaps[d] === 'object') out[d] = snaps[d];
  out[today] = { ...snap };
  const keepDays = Object.keys(out).sort().slice(-keep);
  return Object.fromEntries(keepDays.map((d) => [d, out[d]]));
}

/** today에서 k일 전 'YYYY-MM-DD' (순수) */
function dayBefore(today, k) {
  const [y, m, d] = String(today).split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d - k));
  const p = (n) => String(n).padStart(2, '0');
  return `${t.getUTCFullYear()}-${p(t.getUTCMonth() + 1)}-${p(t.getUTCDate())}`;
}

/** 지금 가진 것 두 줄 (순수) */
export function holdingLines(p) {
  const pf = p || {};
  const items = pf.items || {};
  const mons = pf.mons || {};
  const caught = pf.caught || {};
  const n = (id) => num(items[id]);
  const stones = ['stone_math', 'stone_english', 'stone_korean'].map((id) => `${(itemById(id) || {}).emoji || id} ${n(id)}`).join(' · ');
  const tickets = Object.keys(items).filter((id) => id.startsWith('ticket_') && n(id) > 0).length;
  const candy = Object.keys(mons).reduce((a, id) => a + candyOf(mons[id]), 0);
  const eggs = (pf.eggs || []).filter((e) => e && !e.hatchedAt).length;
  const bag = Object.keys(items).filter((id) => n(id) > 0 && !id.startsWith('ticket_') && !id.startsWith('stone_'))
    .map((id) => itemById(id)).filter(Boolean).map((it) => `${it.emoji}×${n(it.id)}`);
  const have = Object.keys(caught).reduce((a, id) => a + haveOf(caught[id], mons[id]), 0);
  const snap = rewardSnap(pf);
  return [
    `- 💰 ${num(pf.coins)} · ${stones} · 🍬 ${candy} · 🎟️ 교환권 ${tickets}장 · 🥚 품는 알 ${eggs}`,
    `- 가방: ${bag.length ? bag.join(' ') : '(비어 있음)'}`,
    `- 도감 ${snap.kinds}종 · 데리고 있는 포켓몬 ${have}마리 · 레벨 칸 합 ${snap.lvSum} · 진화 ${snap.evoSum}번`,
  ];
}

/** 하루 줄의 한 칸 — 0이면 뺀다 · 늘면 +, 줄면 −(💰 남은 돈은 쓰면 준다 · 누적이 줄었으면 백업을 되돌린 것) */
function part(name, v) {
  return v ? `${name} ${v > 0 ? '+' : '−'}${Math.abs(v)}` : '';
}

/**
 * reward/날짜.md 글 (순수)
 * @param {{profile:object, snaps:object, days:Array, today:string}} o snaps = putSnap으로 오늘 것까지 넣은 것 · days = listDaily
 */
export function rewardText({ profile, snaps, days, today }) {
  const sn = snaps && typeof snaps === 'object' ? snaps : {};
  const dates = Object.keys(sn).filter((d) => DAY_RE.test(d)).sort();
  const byDate = new Map((Array.isArray(days) ? days : []).filter((d) => d && d.date).map((d) => [d.date, d]));
  const lines = [
    `🎮 보상 쪽 기록 (${today}) — 하루 줄 = 그날 마지막으로 올릴 때의 누적 − 그 앞에 기록이 있는 날 (이 태블릿에 적어 둔 것)`,
    // 읽는 법 (Codex 86차 — 코드 주석에만 있던 한계를 글에도)
    '읽는 법: 올린 날 기준(자정 넘어 올리면 다음 날에 들어감) · 앱을 안 열었거나 열쇠가 없던 날은 기록 없음 · 레벨 칸 = 종마다 (레벨−1)의 합이라 진화하면 물려받은 레벨까지 늘어남 · 누적이 줄었으면(−) 백업을 되돌렸거나 기록이 지워진 것',
    '', '## 지금 가진 것', ...holdingLines(profile), '', '## 최근 7일',
  ];
  for (let k = 6; k >= 0; k--) {
    const day = dayBefore(today, k);
    const d = byDate.get(day) || {};
    const extra = [num(d.battles) ? `⚔️ 배틀 ${num(d.battles)}번` : '', num(d.rocketMath) + num(d.rocketEn) + num(d.rocketKor) ? `🚀 로켓단 나옴 ${num(d.rocketMath) + num(d.rocketEn) + num(d.rocketKor)}번` : ''].filter(Boolean);
    const cur = sn[day];
    if (!cur) { lines.push(`- ${day.slice(5)}: (기록 없음)${extra.length ? ` · ${extra.join(' · ')}` : ''}`); continue; }
    const prev = dates.filter((x) => x < day).pop();
    if (!prev) { lines.push(`- ${day.slice(5)}: (견줄 앞 기록 없음 — 이날부터 적음)${extra.length ? ` · ${extra.join(' · ')}` : ''}`); continue; }
    const parts = SNAP_KEYS.map(([key, name]) => part(name, (Number(cur[key]) || 0) - (Number(sn[prev][key]) || 0))).filter(Boolean);
    const since = prev === dayBefore(day, 1) ? '' : ` (${prev.slice(5)} 기록부터)`;
    lines.push(`- ${day.slice(5)}${since}: ${[...parts, ...extra].join(' · ') || '바뀐 것 없음'}`);
  }
  return `${lines.join('\n').trim()}\n`;
}
