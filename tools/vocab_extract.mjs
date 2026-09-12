// 영어 자막에서 "사전에 넣을 후보 단어" 추출 (기초 단어·이름·감탄사 제외, 변화형은 기본형으로 묶음)
// 사용: node tools/vocab_extract.mjs <영어.srt> [...더 많은 srt] > 후보목록.txt
import fs from 'node:fs';
import { parseSubtitle } from '../js/srt.js';
import { stemWord } from '../js/vocab.js';

const basic = new Set(JSON.parse(fs.readFileSync(new URL('../vocab/basic.json', import.meta.url), 'utf8')));
const existing = fs.existsSync(new URL('../vocab/words.json', import.meta.url))
  ? JSON.parse(fs.readFileSync(new URL('../vocab/words.json', import.meta.url), 'utf8'))
  : {};

const files = process.argv.slice(2);
const counts = new Map();   // 기본형 → { n, forms:Set, sample }
const capitalized = new Map(); // 단어 → [대문자 시작 횟수, 전체 횟수] (이름 판별)

for (const file of files) {
  const cues = parseSubtitle(fs.readFileSync(file, 'utf8'));
  for (const cue of cues) {
    const raw = cue.text.replace(/\n/g, ' ');
    const tokens = raw.split(/\s+/);
    tokens.forEach((tok, i) => {
      const clean = tok.replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, '');
      if (!clean || /\d/.test(clean)) return;
      const lower = clean.toLowerCase();
      // 이름 판별용: 문장 첫 단어가 아닌데 대문자로 시작하면 카운트
      const prevTok = i > 0 ? tokens[i - 1] : '';
      const sentenceStart = i === 0 || /[.!?…]["')]*$/.test(prevTok);
      const c = capitalized.get(lower) || [0, 0];
      c[1]++;
      if (!sentenceStart && /^[A-Z]/.test(clean)) c[0]++;
      capitalized.set(lower, c);
    });
  }
}

for (const [lower, [capMid, total]] of capitalized) {
  if (lower.length < 2) continue;
  if (basic.has(lower)) continue;
  if (capMid > 0 && capMid >= total * 0.8) continue; // 거의 항상 대문자 → 이름
  const stem = stemWord(lower, basic);
  if (basic.has(stem)) continue;
  if (existing[stem] || existing[lower]) continue;   // 이미 사전에 있음
  const e = counts.get(stem) || { n: 0, forms: new Set() };
  e.n += total;
  e.forms.add(lower);
  counts.set(stem, e);
}

const list = [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
for (const [stem, e] of list) {
  const forms = [...e.forms].filter((f) => f !== stem);
  console.log(`${stem}${forms.length ? ' (' + forms.join(', ') + ')' : ''}\t${e.n}`);
}
console.error(`후보 ${list.length}개`);
