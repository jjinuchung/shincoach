// 💎 스페셜 문제 검수 페이지 만들기: node tools/mathspecial_review.mjs [출력 경로] [문항수] [--frag]
//   --frag 를 주면 Artifact용 조각(<!DOCTYPE>·<html>·<head>·<body> 없이 <title>+<style>+내용)으로 낸다 —
//   claude.ai 아티팩트는 그 껍데기를 스스로 씌우므로, 통째로 넣으면 중첩돼 깨진다.
// 여덟 얼굴 × 세 문제를 한 HTML로 — 아버님이 출근해서 폰으로 본다.
// 항목마다 번호(S1 … S24)를 붙여 "S7 오답이 너무 쉽다"처럼 가리켜 고칠 수 있게 한다.
import { writeFileSync } from 'node:fs';
import { KINDS, BADGE_NEED, makeSpecial } from '../js/mathspecial.js';

const out = process.argv[2] || 'coach/math/review-special.html';
const PER = Number(process.argv[3] || 3);
const FRAG = process.argv.includes('--frag');
// 예시 출연진 — 실제 앱에서는 진우가 도감에서 잡은 포켓몬이 들어간다
const NAMES = ['피카츄', '리자몽', '개굴닌자', '루카리오', '푸린', '잠만보', '이브이', '뮤츠'];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** **굵게**, 세로 분수, 줄바꿈 (다른 검수 페이지와 같은 규칙) */
function rich(s) {
  let h = esc(s);
  h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  h = h.replace(/(?<![\d/])(\d+) (\d+)\/(\d+)(?![\d/])/g, '<span class="mx"><span class="w">$1</span><span class="fr"><span class="n">$2</span><span class="d">$3</span></span></span>');
  h = h.replace(/(?<![\d/])(\d+)\/(\d+)(?![\d/])/g, '<span class="fr"><span class="n">$1</span><span class="d">$2</span></span>');
  h = h.replace(/\n/g, '<br>');
  return h;
}

let no = 0;
const blocks = [];
for (const k of KINDS) {
  const items = [];
  for (let i = 0; i < PER; i++) {
    const q = makeSpecial(k.id, 20260926 + i * 7919 + k.id.length * 131, { cast: NAMES });
    if (!q) continue;
    no += 1;
    const ok = q.choices.find((c) => c.ok);
    items.push(`
      <article class="q">
        <div class="qno">S${no}</div>
        <p class="ask">${rich(q.q)}</p>
        ${q.expr ? `<div class="expr">${rich(q.expr)}</div>` : ''}
        ${q.hint ? `<p class="hint">💡 ${rich(q.hint)}</p>` : ''}
        <ul class="ch">
          ${q.choices.map((c) => `<li class="${c.ok ? 'ok' : ''}">${rich(c.text)}${c.ok ? ' <b>← 정답</b>' : c.tag ? ` <span class="tag">${esc(c.tag)}</span>` : ''}</li>`).join('')}
        </ul>
        <details class="sol"><summary>풀이 보기</summary>
          <ol>${q.solve.steps.map((t) => `<li>${rich(t)}</li>`).join('')}</ol>
          ${Object.keys(q.solve.why || {}).length ? `<div class="why"><b>틀렸을 때 해 주는 말</b><ul>${Object.entries(q.solve.why).map(([t, w]) => `<li><span class="tag">${esc(t)}</span> ${rich(w)}</li>`).join('')}</ul></div>` : ''}
        </details>
      </article>`);
  }
  blocks.push(`
    <section class="kind">
      <h2>${k.badge} ${esc(k.ko)} <span class="gym">${esc(k.gym)}</span></h2>
      <p class="kdesc">${esc(k.hint)}</p>
      <div class="qs">${items.join('')}</div>
    </section>`);
}

const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>💎 스페셜 문제 검수</title>
<style>
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
  body { margin: 0; padding: 16px; background: #f5f7ff; color: #1f2340;
         font-family: "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif; line-height: 1.6; }
  .wrap { max-width: 820px; margin: 0 auto; }
  header.top { background: #4f46e5; color: #fff; border-radius: 16px; padding: 16px 18px; margin-bottom: 14px; }
  header.top h1 { margin: 0 0 6px; font-size: 1.25rem; }
  header.top p { margin: 0; font-size: 0.9rem; opacity: 0.95; }
  .kind { background: #fff; border-radius: 16px; padding: 14px 16px; margin-bottom: 14px; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
  .kind h2 { margin: 0 0 2px; font-size: 1.1rem; }
  .gym { font-size: 0.8rem; color: #6b21a8; background: #f3e8ff; border-radius: 999px; padding: 2px 8px; font-weight: 700; }
  .kdesc { margin: 0 0 10px; color: #6b7280; font-size: 0.88rem; }
  .q { border-top: 1px solid #eef0f6; padding: 12px 0 4px; position: relative; break-inside: avoid; }
  .qno { position: absolute; right: 0; top: 10px; font-size: 0.75rem; font-weight: 800; color: #fff;
         background: #6366f1; border-radius: 999px; padding: 1px 8px; }
  .ask { margin: 0 46px 8px 0; font-size: 1rem; font-weight: 600; }
  .expr { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 10px; padding: 8px 10px;
          font-size: 1.05rem; margin-bottom: 8px; white-space: pre-line; }
  .hint { margin: 0 0 8px; font-size: 0.85rem; color: #b45309; }
  .ch { list-style: none; margin: 0 0 8px; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .ch li { border: 2px solid #e5e7eb; border-radius: 10px; padding: 6px 10px; font-size: 1rem; background: #fff; }
  .ch li.ok { border-color: #10b981; background: #ecfdf5; }
  .tag { font-size: 0.72rem; color: #9333ea; background: #faf5ff; border-radius: 6px; padding: 1px 5px; }
  .sol { font-size: 0.9rem; }
  .sol summary { cursor: pointer; color: #4f46e5; font-weight: 700; }
  .sol ol { margin: 6px 0; padding-left: 20px; }
  .why { background: #fffbeb; border-radius: 10px; padding: 8px 10px; margin-top: 6px; }
  .why ul { margin: 4px 0 0; padding-left: 18px; }
  /* 세로 분수 */
  .fr { display: inline-flex; flex-direction: column; vertical-align: -0.45em; line-height: 1.05; text-align: center; margin: 0 2px; }
  .fr .n { border-bottom: 1.5px solid currentColor; padding: 0 3px; }
  .fr .d { padding: 0 3px; }
  .mx { display: inline-flex; align-items: center; gap: 2px; }
  .mx .w { font-weight: 700; }
  @media (max-width: 520px) { .ch { grid-template-columns: 1fr; } body { padding: 10px; } }
  @media print {
    body { background: #fff; padding: 0; font-size: 13px; }
    .wrap { max-width: 100%; }
    .kind { box-shadow: none; break-inside: auto; border: 1px solid #ddd; }
    .q, .ch li, .why { break-inside: avoid; }
    .sol summary { display: none; }
    .sol[open] > *, .sol > ol, .sol > .why { display: block !important; }
    details > summary { list-style: none; }
    details:not([open]) > *:not(summary) { display: block !important; }
  }
</style>
</head>
<body>
<div class="wrap">
  <header class="top">
    <h1>💎 스페셜 문제 — 검수</h1>
    <p>문제집(만점왕 4-2)에서 뽑은 <b>여덟 가지 얼굴</b>입니다. 각 얼굴을 ${BADGE_NEED}번 통과하면 🏅 체육관 배지 하나,
       여덟 개를 다 모으면 큰 것이 열립니다. 고칠 곳은 <b>번호(S1·S7…)</b>로 알려 주세요.</p>
  </header>
  ${blocks.join('')}
  <p style="color:#6b7280;font-size:.82rem;text-align:center;margin:18px 0 8px">
    문제는 씨앗 난수로 매번 새로 만들어집니다 — 여기 보이는 건 예시 ${no}개입니다.
    (생성기 <code>js/mathspecial.js</code> · 검산 테스트 6,000씨앗 통과)
  </p>
</div>
</body>
</html>`;

// Artifact 조각: 바깥 껍데기만 벗기고 <title>·<style>·내용은 그대로 (인쇄 CSS도 유지 — 아버님이 종이로 보실 수 있다)
const frag = html
  .replace(/^[\s\S]*?<title>/, '<title>')
  .replace(/<\/head>\s*<body>/, '')
  .replace(/<\/body>\s*<\/html>\s*$/, '')
  .replace(/<meta[^>]*>\s*/g, '');
writeFileSync(out, FRAG ? frag : html, 'utf8');
process.stderr.write(`문항 ${no}개 · ${out}\n`);
