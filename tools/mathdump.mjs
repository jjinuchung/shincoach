// 🔢 분수 문제 생성기 표본 보기: node tools/mathdump.mjs  — 씨앗 2,000개로 결함(보기 중복·정답 둘·0/n)을 세고 개념별 표본을 찍는다
import { FRACTION, makeQuestion, makeRound, diagnosticSet, placeFrom, ladder } from '../js/mathgen.js';

// 진우가 잡은 포켓몬이라 치고 (화면은 도감에서 넘긴다)
const NAMES = ['피카츄', '리자몽', '개굴닌자', '루카리오', '푸린', '뮤츠'];
let leak = 0;
let bad = 0; let total = 0;
for (const c of FRACTION) {
  for (const kind of ['calc', 'misread', 'why']) {
    for (let seed = 1; seed <= 2000; seed++) {
      total++;
      const q = makeQuestion(c.id, kind, seed, { names: NAMES });
      const oks = q.choices.filter((x) => x.ok).length;
      const texts = new Set(q.choices.map((x) => x.text));
      if (/\{(me|mon|mon2)/.test(q.q)) leak++;
      const zero = q.choices.some((x) => /^0\//.test(x.text) || /\/0$/.test(x.text) || /\/1$/.test(x.text) && kind === 'calc' && false);
      if (q.choices.length !== 4 || oks !== 1 || texts.size !== 4 || zero) {
        bad++;
        if (bad <= 8) console.log('BAD', c.id, kind, seed, JSON.stringify(q.choices.map((x) => x.text)));
      }
    }
  }
}
console.log(`검사 ${total}문항 — 문제 있는 것 ${bad}, 이름 자리가 안 채워진 것 ${leak}`);

console.log('\n════════ 표본 (씨앗 7) ════════');
for (const c of FRACTION) {
  console.log(`\n■ [초${c.grade}] ${c.name}  (${c.id})`);
  console.log(`  💡 ${c.idea}`);
  for (const q of makeRound(c.id, 7, { names: NAMES })) {
    console.log(`  ${q.kind.padEnd(7)} Q: ${q.q}`);
    if (q.expr) console.log(`          ${q.expr}`);
    for (const ch of q.choices) console.log(`          ${ch.ok ? '✅' : '  '} ${ch.text}${ch.tag ? `   ← ${ch.tag}` : ''}`);
  }
}

console.log('\n════════ 📏 진단 5문제 (씨앗 3) ════════');
const diag = diagnosticSet(3, 5, { names: NAMES });
for (const q of diag) console.log(`  [${q.concept}] ${q.q}  →  ${q.choices.find((x) => x.ok).text}`);
console.log('  다 맞으면:', JSON.stringify(placeFrom(diag.map((q) => ({ concept: q.concept, correct: true })))));
console.log('  3번째 틀리면:', JSON.stringify(placeFrom(diag.map((q, i) => ({ concept: q.concept, correct: i !== 2 })))));

console.log('\n════════ 사다리 (frac.mean·frac.same 완료) ════════');
for (const s of ladder(['frac.mean', 'frac.same'])) console.log(`  ${{ done: '👑', now: '▶', open: '○', locked: '🔒' }[s.state]} 초${s.grade} ${s.name}`);
