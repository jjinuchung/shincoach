// 🧬 진화표 만들기 (2026-09-25, 아버님: "꼬부기 → 어니부기 → 거북왕 이런 진화")
//
// 1) `node tools/evo_table.mjs fetch <cache.json>` — 명단(ROSTER) 종의 진화 체인을 PokeAPI에서 받아 캐시
//    (체인 + 원작 조건 + 조건에 쓰이는 아이템의 한국어명)
// 2) `node tools/evo_table.mjs table <cache.json>` — js/evolve.js에 붙일 EVO 표와 요약을 찍는다
//
// 규칙:
//   - **명단에 둘 다 있는 링크만** 표에 넣는다 (진화형이 명단에 없으면 도감에 자리가 없어 갈 곳이 없다)
//   - 앱의 진화 레벨은 **명단 안에서의 단계**로 정한다: 명단에 이 종으로 들어오는 진화가 없으면(= 아이에겐 그게 시작)
//     Lv5, 있으면 Lv10. 체인의 depth를 그냥 쓰면 안 된다 — 룰리가 명단에 없는데 마릴이 Lv10을 요구하게 된다
//     (원작은 Lv14~64라 스톤으로 감당이 안 된다 — 압축하되 원작 조건은 화면에 글로 보여 준다)
//   - 원작 조건 문구(orig)는 여기서 받은 한국어명만 쓴다 (기억으로 쓰면 틀린다 — 오롱털·붐볼 사고)
import fs from 'node:fs';
import { ROSTER, subjectOf } from '../js/pokemon.js';

const [cmd, cachePath] = process.argv.slice(2);
if (!cmd || !cachePath) { console.error('사용법: node tools/evo_table.mjs fetch <cache.json> | table <cache.json>'); process.exit(1); }

const API = 'https://pokeapi.co/api/v2';

async function get(url) {
  for (let i = 0; i < 4; i++) {
    try { const res = await fetch(url); if (res.ok) return res.json(); if (res.status === 404) return null; } catch { /* 재시도 */ }
    await new Promise((r) => setTimeout(r, 700 * (i + 1)));
  }
  return null;
}

/** 동시 n개씩 */
async function pool(list, n, fn) {
  const out = [];
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < list.length) { const k = i++; out[k] = await fn(list[k]); }
  }));
  return out;
}

const koName = (o) => ((o && o.names) || []).find((n) => n.language.name === 'ko')?.name || null;
const idFromUrl = (u) => Number(String(u).split('/').filter(Boolean).pop());

async function doFetch() {
  const ids = ROSTER.map((r) => r.id);
  process.stderr.write(`종 ${ids.length}개…\n`);
  let done = 0;
  const species = await pool(ids, 6, async (id) => {
    const s = await get(`${API}/pokemon-species/${id}`);
    if (++done % 50 === 0) process.stderr.write(`  ${done}/${ids.length}\n`);
    return { id, ko: koName(s), chain: s?.evolution_chain?.url || null };
  });

  const chainUrls = [...new Set(species.map((s) => s.chain).filter(Boolean))];
  process.stderr.write(`체인 ${chainUrls.length}개…\n`);
  const chains = (await pool(chainUrls, 6, (u) => get(u))).filter(Boolean);

  // 조건에 나오는 아이템·타입의 한국어명 (불꽃의돌·달의돌·페어리…)
  const itemNames = new Set();
  const typeNames = new Set();
  const scan = (node) => {
    for (const nx of node.evolves_to || []) {
      for (const d of nx.evolution_details || []) {
        if (d.item) itemNames.add(d.item.name);
        if (d.held_item) itemNames.add(d.held_item.name);
        if (d.known_move_type) typeNames.add(d.known_move_type.name);
      }
      scan(nx);
    }
  };
  for (const c of chains) scan(c.chain);
  process.stderr.write(`아이템 ${itemNames.size}개 · 타입 ${typeNames.size}개…\n`);
  const items = {};
  for (const name of itemNames) items[name] = koName(await get(`${API}/item/${name}`)) || name;
  const types = {};
  for (const name of typeNames) types[name] = koName(await get(`${API}/type/${name}`)) || name;

  fs.writeFileSync(cachePath, JSON.stringify({ species, chains, items, types }, null, 1));
  process.stderr.write(`저장: ${cachePath}\n`);
}

/** 받침이 있으면 '을', 없으면 '를' (한글 마지막 글자 기준) */
function eulReul(word) {
  const c = String(word || '').trim().slice(-1).charCodeAt(0);
  if (!(c >= 0xac00 && c <= 0xd7a3)) return '를';
  return (c - 0xac00) % 28 ? '을' : '를';
}

/**
 * 원작 조건을 한 줄 한국어로 (애매하면 빈 문자열 → table이 ⚠로 알려 준다).
 * 지형지물(이끼바위·얼음바위)은 PokeAPI에 이름이 없어 ORIG_FIX에서 손으로 채운다.
 */
function origText(d, items, types) {
  if (!d) return '';
  const t = d.trigger?.name;
  const held = d.held_item ? items[d.held_item.name] || d.held_item.name : null;
  if (t === 'trade') return held ? `${held}${eulReul(held)} 지니고 통신교환` : '통신교환';
  if (t === 'use-item') return d.item ? `${items[d.item.name] || d.item.name} 사용` : '';
  if (t === 'level-up') {
    if (d.min_level) return `Lv${d.min_level}`;
    const when = d.time_of_day === 'day' ? '낮에 ' : d.time_of_day === 'night' ? '밤에 ' : '';
    if (d.known_move_type) {
      const ty = (types && types[d.known_move_type.name]) || d.known_move_type.name;
      return `${when}${ty} 기술을 배우고 친하게 지내면`;
    }
    if (d.min_happiness || d.min_affection) return `${when}친하게 지내면`;
    return when ? `${when}레벨업` : '';
  }
  return '';
}

/** PokeAPI로는 알 수 없는 원작 조건 (지형지물) — 진우가 아는 이름으로 손으로 적는다 */
const ORIG_FIX = {
  '133→470': '이끼바위 근처에서 레벨업',
  '133→471': '얼음바위 근처에서 레벨업',
};

function doTable() {
  const { species, chains, items, types } = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  const inRoster = new Set(ROSTER.map((r) => r.id));
  const koOf = new Map(species.map((s) => [s.id, s.ko]));

  const links = [];
  const walk = (node) => {
    const from = idFromUrl(node.species.url);
    for (const nx of node.evolves_to || []) {
      const to = idFromUrl(nx.species.url);
      const orig = ORIG_FIX[`${from}→${to}`] || origText((nx.evolution_details || [])[0], items, types);
      links.push({ from, to, orig });
      walk(nx);
    }
  };
  for (const c of chains) walk(c.chain);

  const both = links.filter((l) => inRoster.has(l.from) && inRoster.has(l.to));
  // 앱의 진화 레벨: **명단 안에서** 이 종으로 들어오는 진화가 있으면 2단계(Lv10), 없으면 아이에겐 그게 시작(Lv5)
  const hasPrev = new Set(both.map((l) => l.to));
  const at = (from) => (hasPrev.has(from) ? 10 : 5);

  // from별로 묶기 (이브이만 갈래가 여럿)
  const byFrom = new Map();
  for (const l of both) byFrom.set(l.from, [...(byFrom.get(l.from) || []), l]);

  const lines = [];
  for (const [from, list] of [...byFrom.entries()].sort((a, b) => a[0] - b[0])) {
    const parts = list.sort((a, b) => a.to - b.to).map((l) => {
      const o = l.orig ? `, orig: '${l.orig}'` : '';
      return `{ to: ${l.to}, at: ${at(from)}${o} }`;
    });
    const names = list.map((l) => koOf.get(l.to)).join('·');
    lines.push(`  ${from}: [${parts.join(', ')}],${' '.repeat(Math.max(1, 46 - parts.join(', ').length))}// ${koOf.get(from)} → ${names}`);
  }

  console.log('// 🧬 진화표 — tools/evo_table.mjs가 PokeAPI에서 뽑은 것 (명단에 **둘 다 있는** 링크만)');
  console.log('// at = 앱에서 진화하는 레벨(명단에서 시작인 종 5, 한 번 진화한 종 10) · orig = 원작 조건(화면에 글로만 보여 준다)');
  console.log('export const EVO = {');
  for (const l of lines) console.log(l);
  console.log('};');

  // 요약
  const crossed = both.filter((l) => subjectOf(l.from) !== subjectOf(l.to));
  process.stderr.write('\n── 요약 ──\n');
  process.stderr.write(`링크 ${both.length} · 진화하는 종 ${byFrom.size} · 진화로 얻는 종 ${new Set(both.map((l) => l.to)).size}\n`);
  process.stderr.write(`Lv5 진화 ${both.filter((l) => at(l.from) === 5).length} · Lv10 진화 ${both.filter((l) => at(l.from) === 10).length}\n`);
  process.stderr.write(`과목이 갈리는 링크 ${crossed.length}\n`);
  const noOrig = both.filter((l) => !l.orig);
  if (noOrig.length) process.stderr.write(`⚠ 원작 조건 문구가 빈 링크 ${noOrig.length}개: ${noOrig.map((l) => `${koOf.get(l.from)}→${koOf.get(l.to)}`).join(', ')}\n`);
}

if (cmd === 'fetch') await doFetch();
else if (cmd === 'table') doTable();
else { console.error('알 수 없는 명령: ' + cmd); process.exit(1); }
