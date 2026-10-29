// 🐾 포켓몬 수학(v364) 숫자 원고 만들기 — 앱 명단(pokemon.ROSTER)과 📮 편지 포켓몬의 키·몸무게를 PokeAPI 도감에서 받아
// coach/math/pokemath.json에 쓴다 (아이가 잡을 수 있는 포켓몬만 · 키 dm · 몸무게 hg — PokeAPI 단위 그대로, 화면이 m·kg로 나눈다)
// node tools/pokemath_data.mjs   (인터넷 필요 · 650번쯤 받는다 — 한 번에 다섯씩)
import { readFileSync, writeFileSync } from 'node:fs';
import { ROSTER } from '../js/pokemon.js';

const letters = JSON.parse(readFileSync(new URL('../coach/english/letters.json', import.meta.url), 'utf8'));
const ids = [...new Set([...ROSTER.map((r) => r.id), ...(letters.letters || []).map((l) => l.id)])].sort((a, b) => a - b);
const get = async (id) => {
  for (let k = 0; k < 3; k++) {
    try {
      const r = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
      if (r.ok) { const p = await r.json(); return [p.height, p.weight]; }
    } catch { /* 다시 */ }
    await new Promise((ok) => setTimeout(ok, 800));
  }
  throw new Error(`못 받음 ${id}`);
};
const mons = {};
for (let i = 0; i < ids.length; i += 5) {
  const part = ids.slice(i, i + 5);
  const got = await Promise.all(part.map(get));
  part.forEach((id, k) => { mons[id] = got[k]; });
}
const out = { v: 1, src: 'PokeAPI /pokemon/{id} — height(dm)·weight(hg)', mons };
writeFileSync(new URL('../coach/math/pokemath.json', import.meta.url), `${JSON.stringify(out)}\n`);
console.log(`포켓몬 ${ids.length}마리 · coach/math/pokemath.json`);
