// ✍️ 에세이 철자 교정이 「진짜 영어 낱말」을 다른 낱말로 바꾸는지 훑기 (v443) — 단어장에 낱말을 더한 뒤 돌린다
// 사용: node tools/typo_sweep.mjs <빈도 목록.txt> [기준 비 0.05]
//   빈도 목록 = 「낱말 횟수」 줄 (예: FrequencyWords의 en_50k.txt — 영화 자막 영어 5만 낱말 · 저장소에는 넣지 않는다)
//   https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/en/en_50k.txt
// 찍는 것: 붙은 두 글자 바꾸기로 바뀌는 낱말(Y → X)과 빈도 비 Y/X · [지킴] = essay.js NOT_TYPO에 있음
//   ⚠️ 기준 비를 넘는데 NOT_TYPO에 없는 것 → 영어 낱말·이름이면 NOT_TYPO에 넣는다(외국어·줄임 조각은 그대로 — 치면 실수다)
//   ⚠️ NOT_TYPO에 있는데 더는 안 부딪히는 것 → 빼도 된다
import fs from 'node:fs';
import { correct, NOT_TYPO } from '../js/essay.js';
import { createVocab } from '../js/vocab.js';

// 기준을 넘지만 일부러 지키지 않는 것 — 외국어·외국 이름·줄임 조각(아이가 치면 그 짝 낱말을 바꿔 쓴 실수다) · v443에 한 번 골라 둠
const SKIP = new Set(['farid', 'toto', 'enos', 'martina', 'emme', 'soho', 'votre', 'roma', 'baek', 'sandstrom', 'carlo', 'hadn', 'carte', 'thorne', 'loeb', 'oslo', 'alva', 'pera',
  'bali', 'asuna', 'prue', 'shoko', 'domo', 'popo', 'tron', 'boer']);
const [file, cut = '0.05'] = process.argv.slice(2);
if (!file) { console.log('사용: node tools/typo_sweep.mjs <빈도 목록.txt> [기준 비]'); process.exit(1); }
const read = (f) => JSON.parse(fs.readFileSync(new URL(`../vocab/${f}`, import.meta.url), 'utf8'));
const known = createVocab({ basic: read('basic.json'), words: read('words.json'), phrases: read('phrases.json') }).known;

const freq = new Map();
for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
  const [w, n] = line.trim().split(/\s+/);
  if (w && !freq.has(w)) freq.set(w, Number(n) || 0);
}
// 지키는 목록을 빼고 돌려 본다 — 목록이 없을 때 바뀌는 것 전부
const saved = [...NOT_TYPO];
NOT_TYPO.clear();
const rows = [];
for (const [y, ny] of freq) {
  if (!/^[a-z]{3,}$/.test(y)) continue;
  const note = correct('I saw', `${y} today.`, { known }).notes.find((x) => x.why === '철자를 고쳤어요');
  if (!note) continue;
  const nx = freq.get(note.to) || 0;
  rows.push({ y, x: note.to, ratio: nx ? ny / nx : Infinity });
}
for (const w of saved) NOT_TYPO.add(w);
rows.sort((a, b) => b.ratio - a.ratio);
const limit = Number(cut);
const hit = new Set(rows.map((r) => r.y));
for (const r of rows) {
  const keep = NOT_TYPO.has(r.y);
  const flag = !keep && !SKIP.has(r.y) && r.ratio >= limit ? ' ⚠️ 기준을 넘는데 목록에 없음' : '';
  console.log(`${r.ratio === Infinity ? '∞' : r.ratio.toFixed(3)}\t${keep ? '[지킴]' : SKIP.has(r.y) ? '[고침 · 일부러]' : '[고침]'} ${r.y} → ${r.x}${flag}`);
}
// 빈도 목록에 없는 낱말은 훑지 못했을 뿐이다 — 「더는 안 부딪힘」과 갈라 적는다(다른·작은 목록을 넣었을 때 잘못 빼지 않게 · Codex 254차)
const unseen = saved.filter((w) => !freq.has(w));
const stale = saved.filter((w) => freq.has(w) && !hit.has(w));
console.log(`\n바뀌는 낱말 ${rows.length} · 지킴 ${rows.filter((r) => NOT_TYPO.has(r.y)).length} · 단어장 ${known.size}`);
if (stale.length) console.log(`⚠️ NOT_TYPO에 있는데 더는 안 부딪힘(빼도 된다): ${stale.join(', ')}`);
if (unseen.length) console.log(`(빈도 목록에 없어 못 훑은 NOT_TYPO: ${unseen.join(', ')} — 그대로 둔다)`);
