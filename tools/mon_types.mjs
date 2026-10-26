// 🎒 포켓몬 대여행(v341) 타입 표 만들기: node tools/mon_types.mjs
// PokeAPI /type/{이름} 18번만 물어 명단(ROSTER) 모든 포켓몬의 타입을 받아 js/montypes.js를 새로 쓴다.
// 기억으로 쓰면 틀린다(진우는 포켓몬 전문가) — 손으로 고치지 말고 이 도구를 다시 돌린다.
// battle.TYPE_OF는 기술 이름용(명단 일부 · 벌레·독·비행이 없어 가까운 타입으로 바꿔 둠)이라 따로 둔다.
import { writeFileSync } from 'node:fs';
import { ROSTER } from '../js/pokemon.js';

const TYPES = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'];

async function get(url) {
  for (let i = 0; i < 4; i++) {
    try { const res = await fetch(url); if (res.ok) return res.json(); } catch { /* 다시 */ }
    await new Promise((r) => setTimeout(r, 800));
  }
  throw new Error(`못 받음: ${url}`);
}

const want = new Set(ROSTER.map((r) => r.id));
const got = new Map(); // id → [[slot, type]]
for (const t of TYPES) {
  const data = await get(`https://pokeapi.co/api/v2/type/${t}`);
  for (const p of data.pokemon || []) {
    const m = /\/pokemon\/(\d+)\/?$/.exec(p.pokemon.url);
    const id = m ? Number(m[1]) : 0;
    if (!want.has(id)) continue; // 다른 모습(10000번대)·명단 밖은 뺀다
    if (!got.has(id)) got.set(id, []);
    got.get(id).push([p.slot, t]);
  }
  await new Promise((r) => setTimeout(r, 200));
}
const missing = [...want].filter((id) => !got.has(id));
if (missing.length) { console.error('타입을 못 받은 포켓몬:', missing.join(',')); process.exit(1); }
const ids = [...got.keys()].sort((a, b) => a - b);
const body = ids.map((id) => {
  const ts = got.get(id).sort((a, b) => a[0] - b[0]).map(([, t]) => `'${t}'`);
  return `${id}:[${ts.join(',')}]`;
});
const lines = [];
for (let i = 0; i < body.length; i += 8) lines.push(`  ${body.slice(i, i + 8).join(', ')},`);
const out = `// 🎒 포켓몬 타입 (v341 포켓몬 대여행) — PokeAPI /type/{이름}에서 받은 그대로 · ${ids.length}마리 · tools/mon_types.mjs가 쓴다 (손으로 고치지 않는다)
// 첫째가 주 타입(slot 1) · 명단(pokemon.js ROSTER)에 포켓몬을 더하면 이 도구를 다시 돌린다 — 시험(journey341)이 빠진 포켓몬을 잡는다
export const MON_TYPES = {
${lines.join('\n')}
};
`;
writeFileSync(new URL('../js/montypes.js', import.meta.url), out);
console.log(`js/montypes.js — ${ids.length}마리`);
