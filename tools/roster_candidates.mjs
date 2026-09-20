// 🎮 명단 늘리기 후보 조사: node tools/roster_candidates.mjs 10,16,41 …
// PokeAPI에서 한국어 이름·세대·포획률·전설/환상 여부·타입·공식 일러스트 유무를 받아 표로 찍고,
// ROSTER(pokemon.js)·TYPE_OF(battle.js)·RARITY_IDS(xp.js)에 붙여 넣을 줄을 만들어 준다.
// 등급은 **포획률(capture_rate)** 로 어림한다 — 게임에서 잡기 쉬운 순서가 곧 "흔함"이다:
//   ≥120 흔함(1) · 45~119 보통(2) · <45 희귀(3) · 전설/환상 전설(4)
// 기억으로 이름을 쓰면 틀린다(오롱털·붐볼 사고) — 반드시 이 도구로 받은 이름을 쓴다.
import { ROSTER } from '../js/pokemon.js';

const ids = (process.argv[2] || '').split(/[,\s]+/).map(Number).filter((n) => n > 0);
if (!ids.length) { console.error('사용법: node tools/roster_candidates.mjs 10,16,41'); process.exit(1); }
const have = new Set(ROSTER.map((r) => r.id));

async function get(url) {
  for (let i = 0; i < 3; i++) {
    try { const res = await fetch(url); if (res.ok) return res.json(); } catch { /* 재시도 */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

const GEN = { 'generation-i': 1, 'generation-ii': 2, 'generation-iii': 3, 'generation-iv': 4, 'generation-v': 5, 'generation-vi': 6, 'generation-vii': 7, 'generation-viii': 8, 'generation-ix': 9, 'generation-x': 10 };

async function info(id) {
  const [sp, pk] = await Promise.all([get(`https://pokeapi.co/api/v2/pokemon-species/${id}`), get(`https://pokeapi.co/api/v2/pokemon/${id}`)]);
  if (!sp || !pk) return { id, error: true };
  const ko = (sp.names.find((n) => n.language.name === 'ko') || {}).name || '';
  const en = (sp.names.find((n) => n.language.name === 'en') || {}).name || pk.name;
  const cr = sp.capture_rate;
  const legend = sp.is_legendary || sp.is_mythical;
  const rarity = legend ? 4 : cr >= 120 ? 1 : cr >= 45 ? 2 : 3;
  const anim = !!((((pk.sprites.versions || {})['generation-v'] || {})['black-white'] || {}).animated || {}).front_default;
  return {
    id, ko, en, gen: GEN[sp.generation.name] || 0, cr, legend, baby: sp.is_baby, rarity,
    types: pk.types.map((t) => t.type.name), art: !!(pk.sprites.other && pk.sprites.other['official-artwork'] && pk.sprites.other['official-artwork'].front_default), anim,
    inRoster: have.has(id),
  };
}

const out = [];
for (let i = 0; i < ids.length; i += 6) {
  const batch = await Promise.all(ids.slice(i, i + 6).map(info));
  out.push(...batch);
  process.stderr.write(`${Math.min(i + 6, ids.length)}/${ids.length}\r`);
}
process.stderr.write('\n');
const R = { 1: '흔함', 2: '보통', 3: '희귀', 4: '전설' };
console.log('id\tko\ten\tgen\tcr\trarity\ttypes\tart\tanim\tflags');
for (const r of out) {
  if (r.error) { console.log(`${r.id}\t(못 받음)`); continue; }
  const flags = [r.inRoster ? '이미명단' : '', r.legend ? '전설' : '', r.baby ? '아기' : '', r.art ? '' : '그림없음'].filter(Boolean).join(' ');
  console.log(`${r.id}\t${r.ko}\t${r.en}\t${r.gen}\t${r.cr}\t${R[r.rarity]}\t${r.types.join('/')}\t${r.art ? 'o' : 'x'}\t${r.anim ? 'o' : 'x'}\t${flags}`);
}
console.log(JSON.stringify(out.filter((r) => !r.error)));
