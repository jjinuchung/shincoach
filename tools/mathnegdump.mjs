// 🔢 E 음수 문제 생성기 표본 보기: node tools/mathnegdump.mjs [씨앗수]
// 개념 9개 × ①② × 씨앗으로 결함(보기 4개 아님·정답 둘·값이 같은 보기·자리표시 누출·undefined/NaN·풀이 빠짐)을 세고 개념별 표본을 찍는다
import { readFileSync } from 'node:fs';
import { NEGATIVE, makeQuestion, makeRound, diagnosticSet, placeFrom, ladder, valueOf } from '../js/mathneg.js';

const N = Number(process.argv[2]) || 2000;
const content = JSON.parse(readFileSync(new URL('../coach/math/negative.json', import.meta.url), 'utf8'));
const NAMES = ['피카츄', '리자몽', '개굴닌자', '루카리오', '푸린', '뮤츠'];
const opts = { names: NAMES, content, worlds: { pokemon: [], toystory: [], minions: [], moana: [] } };
const same = (a, b) => a && b && a.n * b.d === b.n * a.d;

let bad = 0; let total = 0; let leak = 0;
const shown = new Set();
for (const c of NEGATIVE) {
  for (const kind of ['calc', 'misread']) {
    for (let seed = 1; seed <= N; seed++) {
      total++;
      const q = makeQuestion(c.id, kind, seed, opts);
      const probs = [];
      if (!q) { probs.push('null'); }
      else {
        const oks = q.choices.filter((x) => x.ok);
        const texts = q.choices.map((x) => x.text);
        if (q.choices.length !== 4) probs.push(`보기 ${q.choices.length}개`);
        if (oks.length !== 1) probs.push(`정답 ${oks.length}개`);
        if (new Set(texts).size !== texts.length) probs.push('보기 글자 겹침');
        const vals = q.choices.map((x) => valueOf(x.text));
        for (let i = 0; i < vals.length; i++) for (let j = i + 1; j < vals.length; j++) if (same(vals[i], vals[j])) probs.push(`값 겹침 ${texts[i]}=${texts[j]}`);
        const all = [q.q, q.expr, ...texts, ...(q.solve ? [...q.solve.steps, q.solve.whyAny, q.solve.rule, ...Object.values(q.solve.why)] : [])].join('\n');
        if (/\{(me|mon|mon2)/.test(all)) { leak++; probs.push('자리표시 누출'); }
        if (/undefined|NaN|null/.test(all)) probs.push('undefined/NaN');
        if (!q.solve) probs.push('풀이 없음');
        else {
          if (q.solve.steps.length < 2) probs.push('풀이 단계 부족');
          for (const ch of q.choices) if (!ch.ok && !(q.solve.why[ch.tag] || q.solve.whyAny)) probs.push(`오답 "${ch.tag}" 설명 없음`);
          if (q.solve.figure && !q.solve.figure.startsWith('<svg')) probs.push('풀이 그림이 SVG 아님');
        }
        if (q.figure && !q.figure.startsWith('<svg')) probs.push('문제 그림이 SVG 아님');
      }
      if (probs.length) {
        bad++;
        const k = `${c.id}/${kind}/${probs[0]}`;
        if (!shown.has(k)) { shown.add(k); console.log('BAD', c.id, kind, seed, probs.join(' · '), q ? JSON.stringify(q.choices.map((x) => x.text)) : ''); }
      }
    }
  }
}
console.log(`검사 ${total}문항 — 문제 있는 것 ${bad}, 이름 자리가 안 채워진 것 ${leak}`);

console.log('\n════════ 표본 (씨앗 7) ════════');
for (const c of NEGATIVE) {
  console.log(`\n■ [중1] ${c.name}  (${c.id})`);
  console.log(`  💡 ${c.idea}`);
  for (const q of makeRound(c.id, 7, opts)) {
    console.log(`  ${q.kind.padEnd(7)} Q: ${q.q}`);
    if (q.expr) console.log(`          식: ${q.expr}`);
    for (const ch of q.choices) console.log(`          ${ch.ok ? '✅' : '  '} ${ch.text}${ch.tag ? `   ← ${ch.tag}` : ''}`);
    if (q.solve && q.solve.steps.length) for (const st of q.solve.steps) console.log(`          📖 ${st}`);
    if (q.solve && q.solve.whyAny) console.log(`          📖 ${q.solve.whyAny}`);
  }
}

console.log('\n════════ 📏 진단 5문제 (씨앗 3) ════════');
const diag = diagnosticSet(3, 5, opts);
for (const q of diag) console.log(`  [${q.concept}] ${q.q}  →  ${q.choices.find((x) => x.ok).text}`);
console.log('  다 맞으면:', JSON.stringify(placeFrom(diag.map((q) => ({ concept: q.concept, correct: true })))));
console.log('  3번째 틀리면:', JSON.stringify(placeFrom(diag.map((q, i) => ({ concept: q.concept, correct: i !== 2 })))));

console.log('\n════════ 사다리 (neg.mean·neg.line 완료) ════════');
for (const s of ladder(['neg.mean', 'neg.line'])) console.log(`  ${{ done: '👑', now: '▶', open: '○', locked: '🔒' }[s.state]} 중1 ${s.name}`);
