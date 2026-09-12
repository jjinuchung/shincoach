// 자막 전체에 단어장을 적용해 커버리지와 샘플을 출력
// 사용: node tools/vocab_scan.mjs <영어.srt> [샘플수]
import fs from 'node:fs';
import { parseSubtitle } from '../js/srt.js';
import { createVocab } from '../js/vocab.js';

const read = (f) => JSON.parse(fs.readFileSync(new URL('../vocab/' + f, import.meta.url), 'utf8'));
const vocab = createVocab({ basic: read('basic.json'), words: read('words.json'), phrases: read('phrases.json') });
const cues = parseSubtitle(fs.readFileSync(process.argv[2], 'utf8'));
const sampleN = Number(process.argv[3] || 12);
let hit = 0; let items = 0; const phraseHits = new Map();
const samples = [];
cues.forEach((c, i) => {
  const r = vocab.lookup(c.text);
  if (r.length) { hit++; items += r.length; }
  r.filter((x) => x.kind === 'phrase').forEach((x) => phraseHits.set(x.term, (phraseHits.get(x.term) || 0) + 1));
  if (r.length && i % Math.max(1, Math.floor(cues.length / sampleN)) === 0) samples.push({ text: c.text.replace(/\n/g, ' '), r });
});
console.log(`문장 ${cues.length}개 중 단어장 항목 있는 문장 ${hit}개 (${(hit / cues.length * 100).toFixed(0)}%), 항목 총 ${items}개, 사전 ${vocab.size}단어`);
console.log('표현 등장 상위:', [...phraseHits.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => `${k}(${v})`).join(', '));
for (const s of samples.slice(0, sampleN)) console.log(`\n"${s.text}"\n   → ${s.r.map((x) => `${x.kind === 'phrase' ? '[표현] ' : ''}${x.term}: ${x.meaning}`).join(' / ')}`);
