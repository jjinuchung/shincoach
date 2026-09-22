// 🔢 수학 전용 포켓몬 명단 만들기 (2026-09-22, 아버님 결정: 기존 161마리는 그대로, 새 150마리를 수학에서만 잡히게 —
// 흔함 4 : 보통 3 : 희귀 2 : 전설 1 = 60 / 45 / 30 / 15).
//
// 1) `node tools/math_roster.mjs fetch <cache.json>`  — PokeAPI 종(species) 1..1025 전부를 받아 캐시 (한국어명·세대·포획률·전설/환상·진화 전 단계)
// 2) `node tools/math_roster.mjs pick <cache.json> <ids...>` — 후보 id를 등급별로 분류해 표로 찍고, ROSTER·TYPE_OF·RARITY_IDS 줄을 만든다
//    (타입·공식 일러스트 유무는 이 단계에서 pokemon 엔드포인트로 확인)
//
// 등급 규칙 (roster_candidates.mjs와 같되 진화 단계를 더 본다 — 스타터·600족 최종형은 포획률 45라 "보통"이 되는데 아이에겐 귀한 얼굴):
//   전설 = is_legendary || is_mythical
//   희귀 = 포획률 < 45, 또는 (포획률 < 75 이고 3단계 진화형)
//   보통 = 포획률 45~119
//   흔함 = 포획률 ≥ 120
// 이름은 반드시 여기서 받은 것만 쓴다 (기억으로 쓰면 틀린다 — 오롱털·붐볼 사고).
import fs from 'node:fs';
import { ROSTER } from '../js/pokemon.js';

const [cmd, cachePath, ...rest] = process.argv.slice(2);
if (!cmd || !cachePath) { console.error('사용법: node tools/math_roster.mjs fetch <cache.json> | pick <cache.json> <ids…>'); process.exit(1); }

async function get(url) {
  for (let i = 0; i < 4; i++) {
    try { const res = await fetch(url); if (res.ok) return res.json(); if (res.status === 404) return null; } catch { /* 재시도 */ }
    await new Promise((r) => setTimeout(r, 700 * (i + 1)));
  }
  return null;
}

const GEN = { 'generation-i': 1, 'generation-ii': 2, 'generation-iii': 3, 'generation-iv': 4, 'generation-v': 5, 'generation-vi': 6, 'generation-vii': 7, 'generation-viii': 8, 'generation-ix': 9 };

async function species(id) {
  const sp = await get(`https://pokeapi.co/api/v2/pokemon-species/${id}`);
  if (!sp) return { id, error: true };
  const nm = (lang) => (sp.names.find((n) => n.language.name === lang) || {}).name || '';
  return {
    id, ko: nm('ko'), en: nm('en') || sp.name, gen: GEN[sp.generation.name] || 0, cr: sp.capture_rate,
    legend: !!(sp.is_legendary || sp.is_mythical), baby: !!sp.is_baby,
    from: sp.evolves_from_species ? Number(sp.evolves_from_species.url.replace(/\/+$/, '').split('/').pop()) : 0,
  };
}

if (cmd === 'fetch') {
  const MAX = 1025;
  const out = [];
  for (let i = 1; i <= MAX; i += 8) {
    const ids = [];
    for (let k = i; k < i + 8 && k <= MAX; k++) ids.push(k);
    out.push(...await Promise.all(ids.map(species)));
    process.stderr.write(`${Math.min(i + 7, MAX)}/${MAX}\r`);
  }
  process.stderr.write('\n');
  fs.writeFileSync(cachePath, JSON.stringify(out));
  console.log(`saved ${out.length} (errors ${out.filter((s) => s.error).length})`);
  process.exit(0);
}

const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
const byId = new Map(cache.map((s) => [s.id, s]));
function stageOf(id) { let n = 1; let s = byId.get(id); while (s && s.from) { n++; s = byId.get(s.from); } return n; }
export function rarityOf(s) {
  if (s.legend) return 4;
  if (s.cr < 45 || (s.cr < 75 && stageOf(s.id) >= 3)) return 3;
  return s.cr >= 120 ? 1 : 2;
}
const have = new Set(ROSTER.map((r) => r.id));

if (cmd === 'stats') {
  // 후보 풀 크기 — 명단에 없는 것만, 등급별
  const cnt = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const s of cache) if (!s.error && !have.has(s.id)) cnt[rarityOf(s)]++;
  console.log(cnt);
  process.exit(0);
}

if (cmd === 'list') {
  // 등급 하나의 후보 전부 (명단 제외) — 고르기용
  const r = Number(rest[0]);
  for (const s of cache) if (!s.error && !have.has(s.id) && rarityOf(s) === r) console.log(`${s.id}\t${s.ko}\t${s.en}\tg${s.gen}\tcr${s.cr}\tst${stageOf(s.id)}${s.baby ? '\t아기' : ''}`);
  process.exit(0);
}

// pick: 후보 id → pokemon 엔드포인트로 타입·그림 확인 → 표 + 코드 줄
const ids = rest.join(',').split(/[,\s]+/).map(Number).filter((n) => n > 0);
// 기술표(battle.js)에 없는 타입은 가까운 것으로 — 벌레·독·비행은 노말, (두 번째 타입이 있으면 그것을 먼저 본다)
const KNOWN = new Set(['electric', 'fire', 'water', 'grass', 'fairy', 'normal', 'ghost', 'ice', 'dragon', 'psychic', 'fighting', 'dark', 'rock', 'ground', 'steel']);
function battleType(types) {
  for (const t of types) if (KNOWN.has(t)) return t;
  return 'normal';
}
const rows = [];
for (let i = 0; i < ids.length; i += 6) {
  const batch = await Promise.all(ids.slice(i, i + 6).map(async (id) => {
    const s = byId.get(id);
    if (!s || s.error) return { id, error: true };
    const pk = await get(`https://pokeapi.co/api/v2/pokemon/${id}`);
    if (!pk) return { id, error: true };
    const types = pk.types.map((t) => t.type.name);
    const art = !!(pk.sprites.other && pk.sprites.other['official-artwork'] && pk.sprites.other['official-artwork'].front_default);
    const anim = !!((((pk.sprites.versions || {})['generation-v'] || {})['black-white'] || {}).animated || {}).front_default;
    return { ...s, types, art, anim, rarity: rarityOf(s), stage: stageOf(id), inRoster: have.has(id), bt: battleType(types) };
  }));
  rows.push(...batch);
  process.stderr.write(`${Math.min(i + 6, ids.length)}/${ids.length}\r`);
}
process.stderr.write('\n');
const R = { 1: '흔함', 2: '보통', 3: '희귀', 4: '전설' };
console.log('id\tko\ten\tgen\tcr\tst\trarity\ttypes\tbt\tart\tanim\tflags');
for (const r of rows) {
  if (r.error) { console.log(`${r.id}\t(못 받음)`); continue; }
  const flags = [r.inRoster ? '이미명단' : '', r.baby ? '아기' : '', r.art ? '' : '그림없음'].filter(Boolean).join(' ');
  console.log(`${r.id}\t${r.ko}\t${r.en}\t${r.gen}\t${r.cr}\t${r.stage}\t${R[r.rarity]}\t${r.types.join('/')}\t${r.bt}\t${r.art ? 'o' : 'x'}\t${r.anim ? 'o' : 'x'}\t${flags}`);
}
const ok = rows.filter((r) => !r.error && !r.inRoster && r.art);
const cnt = { 1: 0, 2: 0, 3: 0, 4: 0 };
for (const r of ok) cnt[r.rarity]++;
console.log(`\n등급별: 흔함 ${cnt[1]} · 보통 ${cnt[2]} · 희귀 ${cnt[3]} · 전설 ${cnt[4]} (총 ${ok.length})`);
console.log('\n// ROSTER (pokemon.js)');
for (const r of ok) console.log(`  { id: ${r.id}, ko: '${r.ko}', en: '${r.en.replace(/'/g, "\\'")}', subject: 'math' },`);
console.log('\n// RARITY_IDS (xp.js)');
for (const k of [1, 2, 3, 4]) console.log(`  ${k}: [${ok.filter((r) => r.rarity === k).map((r) => r.id).join(', ')}],`);
console.log('\n// TYPE_OF (battle.js)');
const byType = {};
for (const r of ok) (byType[r.bt] = byType[r.bt] || []).push(r.id);
for (const t of Object.keys(byType)) console.log(`  ${byType[t].map((id) => `${id}: '${t}'`).join(', ')},`);
fs.writeFileSync(cachePath.replace(/\.json$/, '.pick.json'), JSON.stringify(ok));
