// 🔵 N 원의 넓이 줄기 검수 페이지 만들기: node tools/mathcircle.mjs [출력 경로]
// coach/math/circle.json(배움 원고 + 아빠 카드)과 js/mathcircle.js(사다리 + 생성기)를 한 HTML로 — 아버님이 출근해서 폰으로 본다.
// 수의 범위 줄기(tools/mathrange.mjs)를 본떴다: 개념마다 실제 문제 예시(① 계산 2 + ② 오개념 1)도 함께 싣는다.
// 항목마다 번호(N3-2 / N3-2✓ / N3-👨 / N3-①a)를 붙여 "N6-①a 오답이 너무 쉽다"처럼 가리켜 고칠 수 있게 한다.
// 확인 질문에도 원 그림이 들어가므로 확인 질문 글도 그림을 그린다(paras).
import { readFileSync, writeFileSync } from 'node:fs';
import { CIRCLE, gradeLabel, makeQuestion } from '../js/mathcircle.js';
import { fill } from '../js/mathgen.js';
import { renderFigures } from '../js/mathdraw.js';

const out = process.argv[2] || 'coach/math/review-cir.html';
const content = JSON.parse(readFileSync('coach/math/circle.json', 'utf8'));
// 예시 출연진 — 실제 앱에서는 진우가 도감에서 잡은 포켓몬이 들어간다
const NAMES = ['피카츄', '리자몽', '개굴닌자', '루카리오', '푸린', '잠만보', '이브이', '뮤츠'];
const OPTS = { names: NAMES.slice(0, 4), me: '진우' };

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** **굵게**, 세로 분수, 한 줄 바꿈 */
function rich(s) {
  let h = esc(s);
  h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  h = h.replace(/(?<![\d/.])(\d+)\/(\d+)(?![\d/])/g, '<span class="fr"><span class="n">$1</span><span class="d">$2</span></span>');
  h = h.replace(/\n/g, '<br>');
  return h;
}
function richWithFigs(p) {
  return String(p).split(/(\[[a-z]+ [^\]]+\])/g).map((seg) => (/^\[[a-z]+ [^\]]+\]$/.test(seg) ? `<span class="fig">${renderFigures(seg)}</span>` : rich(seg))).join('');
}
const paras = (s) => String(s).split(/\n\n+/).map((p) => (/^\[[a-z]+ [^\]]+\]$/.test(p.trim()) ? `<div class="fig">${renderFigures(p.trim())}</div>` : `<p>${richWithFigs(p)}</p>`)).join('');

const letter = 'N';

/** 🧪 생성기가 만든 문제 예시 — 정답 ✔, 오답마다 오개념 이름표 */
function sampleHtml(c, no) {
  const items = [
    { ref: `${letter}${no}-①a`, lbl: '① 계산', q: makeQuestion(c.id, 'calc', 1009 + no * 17, OPTS) },
    { ref: `${letter}${no}-①b`, lbl: '① 계산', q: makeQuestion(c.id, 'calc', 7001 + no * 31, OPTS) },
    { ref: `${letter}${no}-②`, lbl: '② 어디가 틀렸을까', q: makeQuestion(c.id, 'misread', 4242 + no * 13, OPTS) },
  ];
  return items.map(({ ref, lbl, q }) => `<div class="sample" id="${ref}">
      <div class="ref"><span class="lbl">${lbl}</span><code>${ref}</code></div>
      <div class="say">${paras(q.q)}</div>
      ${q.expr ? `<p class="expr">${rich(q.expr)}</p>` : ''}
      <ol class="ch">${q.choices.map((x) => `<li class="${x.ok ? 'ok' : 'no'}"><span class="mark">${x.ok ? '✔' : ''}</span><span class="txt">${rich(x.text)}</span>${x.ok ? '' : `<span class="tag">${esc(x.tag || '')}</span>`}</li>`).join('')}</ol>
    </div>`).join('');
}

const sections = CIRCLE.map((c, i) => {
  const no = i + 1;
  const v = content[c.id];
  const cast = { me: '진우', mon: NAMES[i % NAMES.length], mon2: NAMES[(i + 3) % NAMES.length] };
  const f = (s) => fill(s, cast);
  const steps = v.lesson.map((s, k) => {
    const ref = `${letter}${no}-${k + 1}`;
    let check = '';
    if (s.check) {
      const ch = [{ text: s.check.ok, ok: true }, ...s.check.no.map((t) => ({ text: t, ok: false }))];
      check = `<div class="check" id="${ref}✓">
        <div class="ref"><span class="lbl">확인 질문</span><code>${ref}✓</code></div>
        <div class="qt">${paras(f(s.check.q))}</div>
        <ol class="ch">${ch.map((x) => `<li class="${x.ok ? 'ok' : 'no'}"><span class="mark">${x.ok ? '✔' : ''}</span><span class="txt">${rich(f(x.text))}</span></li>`).join('')}</ol>
        <p class="why"><span class="why-lbl">틀리면</span>${rich(f(s.check.why))}</p>
      </div>`;
    }
    return `<li class="step" id="${ref}">
      <div class="step-no">${k + 1}</div>
      <div class="step-body">
        <div class="ref"><span class="lbl">${k + 1}장</span><code>${ref}</code></div>
        <div class="say">${paras(f(s.say))}</div>
        ${check}
      </div>
    </li>`;
  }).join('');
  const dad = v.dad;
  const dadHtml = `<aside class="dad" id="${letter}${no}-👨">
    <div class="ref"><span class="lbl">👨 아빠 카드 · 저녁 10분</span><code>${letter}${no}-👨</code></div>
    <h3>${esc(dad.goal)}</h3>
    <h4>🗣 이렇게 말해 보세요</h4>
    <ol class="dad-say">${dad.say.map((s, k) => `<li id="${letter}${no}-👨말${k + 1}"><code class="mini">말${k + 1}</code><span>${rich(s)}</span></li>`).join('')}</ol>
    <h4>✋ 같이 해 보기</h4>
    <p class="dad-do">${rich(dad.do)}</p>
    <h4>⚠️ 여기서 헷갈려요</h4>
    <ul class="traps">${dad.traps.map((t, k) => `<li id="${letter}${no}-👨함정${k + 1}"><code class="mini">함정${k + 1}</code><div><div class="kid">${rich(t.kid)}</div><div class="dadsay">→ ${rich(t.dad)}</div></div></li>`).join('')}</ul>
    <h4>✅ 이걸 말하면 통과</h4>
    <p class="dad-pass">${rich(dad.pass)}</p>
  </aside>`;

  return `<section class="concept" id="${letter}${no}">
    <header class="ch-head">
      <div class="ch-no">${letter}${no}</div>
      <div>
        <div class="grade">${gradeLabel(c.grade)}${c.needs.length ? ` · ${c.needs.map((n) => letter + (CIRCLE.findIndex((x) => x.id === n) + 1)).join(', ')} 다음` : ' · 첫 개념'}</div>
        <h2>${esc(c.name)}</h2>
        <p class="idea">${rich(c.idea)}</p>
      </div>
    </header>
    <div class="cols">
      <div class="lesson">
        <h4 class="col-title">📘 배움 <small>${v.lesson.length}장 · 진우가 읽는 것 · 확인 질문에 답해야 다음 장</small></h4>
        <ol class="steps">${steps}</ol>
        <div class="rule" id="${letter}${no}-📏"><div class="ref"><span class="lbl">📏 한 줄로</span><code>${letter}${no}-📏</code></div><p>${rich(v.rule)}</p></div>
        <h4 class="col-title samples-title">🧪 문제 예시 <small>앱이 숫자를 바꿔 가며 만드는 문제 · 오답 옆 회색 글씨 = 📊에 쌓이는 오개념 이름</small></h4>
        <div class="samples">${sampleHtml(c, no)}</div>
      </div>
      ${dadHtml}
    </div>
  </section>`;
}).join('\n');

const totals = {
  steps: CIRCLE.reduce((a, c) => a + content[c.id].lesson.length, 0),
  checks: CIRCLE.reduce((a, c) => a + content[c.id].lesson.filter((s) => s.check).length, 0),
  figs: CIRCLE.reduce((a, c) => a + content[c.id].lesson.reduce((b, s) => b + (`${s.say} ${s.check ? s.check.q : ''}`.match(/\[[a-z]+ [^\]]+\]/g) || []).length, 0), 0),
  traps: CIRCLE.reduce((a, c) => a + content[c.id].dad.traps.length, 0),
};
const nav = CIRCLE.map((c, i) => `<a href="#${letter}${i + 1}"><b>${letter}${i + 1}</b> ${esc(c.name)}</a>`).join('');

const html = `<title>원의 넓이 검수</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gowun+Dodum&family=Noto+Sans+KR:wght@400;500;700&display=swap">
<style>
/* 레이아웃: 위에 개념 바로가기, 개념마다 [배움 + 문제 예시 | 아빠 카드] 두 칸 (폰에서는 한 칸) — 혼합계산 검수 페이지와 같은 체계 */
:root{
  --bg:#f5f7ff; --card:#ffffff; --ink:#1f2340; --muted:#6b7280; --line:#e3e6f3;
  --primary:#4f46e5; --primary-soft:#eef2ff; --accent:#f59e0b; --accent-soft:#fff7ed;
  --ok:#0f9f6e; --ok-soft:#ecfdf5; --no-soft:#f8f9fc;
  --dad:#fff8ec; --dad-line:#f3c27a; --dad-ink:#7c4a03;
  --frac-fill:#4f46e5; --frac-fill2:#f59e0b; --frac-empty:#ffffff;
  --font-display:"Gowun Dodum","Noto Sans KR",sans-serif;
  --font-body:"Noto Sans KR",system-ui,-apple-system,"Malgun Gothic",sans-serif;
}
@media (prefers-color-scheme:dark){ :root:not([data-theme="light"]){
  --bg:#14162a; --card:#1d2040; --ink:#e8e9f5; --muted:#a0a6c2; --line:#2e3258;
  --primary:#9b9cf8; --primary-soft:#262a55; --accent:#fbbf24; --accent-soft:#3a2f14;
  --ok:#34d399; --ok-soft:#153a2d; --no-soft:#22254a;
  --dad:#2c261a; --dad-line:#a16207; --dad-ink:#fcd9a0;
  --frac-fill:#9b9cf8; --frac-fill2:#fbbf24; --frac-empty:#1d2040;
  color-scheme:dark;
}}
:root[data-theme="dark"]{
  --bg:#14162a; --card:#1d2040; --ink:#e8e9f5; --muted:#a0a6c2; --line:#2e3258;
  --primary:#9b9cf8; --primary-soft:#262a55; --accent:#fbbf24; --accent-soft:#3a2f14;
  --ok:#34d399; --ok-soft:#153a2d; --no-soft:#22254a;
  --dad:#2c261a; --dad-line:#a16207; --dad-ink:#fcd9a0;
  --frac-fill:#9b9cf8; --frac-fill2:#fbbf24; --frac-empty:#1d2040;
  color-scheme:dark;
}
*{box-sizing:border-box}
body{background:var(--bg);color:var(--ink);font-family:var(--font-body);font-size:15px;line-height:1.65;margin:0;padding-block:0 60px;padding-inline:16px}
h1,h2,h3{font-family:var(--font-display);text-wrap:balance;margin:0}
.wrap{max-width:1180px;margin:0 auto}
.top{position:sticky;top:env(safe-area-inset-top,0px);z-index:5;background:var(--bg);padding-block:12px 8px;border-bottom:1px solid var(--line);margin-inline:-16px;padding-inline:16px}
.top h1{font-size:1.35rem}
.top .sub{color:var(--muted);font-size:.9rem;margin:2px 0 8px}
.nav{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;scrollbar-width:thin}
.nav a{flex:0 0 auto;font-size:.8rem;color:var(--ink);text-decoration:none;background:var(--card);border:1px solid var(--line);border-radius:999px;padding:4px 10px;white-space:nowrap}
.nav a b{color:var(--primary);margin-right:3px}
.nav a:hover,.nav a:focus-visible{border-color:var(--primary);outline:none}
.intro{display:grid;grid-template-columns:1fr;gap:12px;margin-block:16px}
@media(min-width:760px){.intro{grid-template-columns:1.2fr 1fr}}
.intro .box{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px 16px;min-width:0}
.intro .box.dadbox{background:var(--dad);border-color:var(--dad-line)}
.intro h3{font-size:1rem;margin-bottom:6px}
.intro p{margin:4px 0;font-size:.92rem}
.intro .stats{display:flex;flex-wrap:wrap;gap:8px 18px;font-size:.92rem}
.intro .stats b{font-size:1.25rem;color:var(--primary);font-variant-numeric:tabular-nums}
.how{padding-left:20px}
.how li{margin:3px 0}
.ladder{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px;margin:8px 0 4px;padding:0;list-style:none}
.ladder li{font-size:.85rem;background:var(--primary-soft);border-radius:8px;padding:5px 9px}
.ladder li b{color:var(--primary);margin-right:4px}
.ladder li small{color:var(--muted);margin-left:4px}
.concept{margin-block:36px 0;scroll-margin-top:110px}
.ch-head{display:flex;gap:14px;align-items:flex-start;margin-bottom:12px}
.ch-head > div:last-child{min-width:0}
.ch-no{font-family:var(--font-display);font-size:1.6rem;font-weight:700;color:var(--primary);background:var(--primary-soft);border-radius:12px;min-width:56px;height:56px;display:grid;place-items:center}
.grade{font-size:.75rem;letter-spacing:.06em;color:var(--muted)}
.ch-head h2{font-size:1.4rem}
.idea{color:var(--muted);margin:2px 0 0;font-size:.95rem;max-width:65ch}
.cols{display:grid;grid-template-columns:1fr;gap:16px;align-items:start}
.cols > *{min-width:0}
@media(min-width:900px){.cols{grid-template-columns:1.35fr 1fr}}
.col-title{margin:0 0 10px;font-size:.95rem}
.col-title small{color:var(--muted);font-weight:400;margin-left:6px}
.samples-title{margin-top:18px}
.steps{list-style:none;margin:0;padding:0;display:grid;gap:12px}
.step{display:flex;gap:10px;scroll-margin-top:110px}
.step-no{flex:0 0 30px;height:30px;border-radius:50%;background:var(--primary);color:var(--card);font-weight:700;display:grid;place-items:center;font-size:.9rem;margin-top:12px}
.step-body{flex:1;min-width:0;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 14px}
.say{max-width:65ch}
.say p{margin:0 0 10px}
.say p:last-child{margin-bottom:0}
.check{margin-top:12px;border-top:1px dashed var(--line);padding-top:10px;scroll-margin-top:110px}
.qt{margin:0 0 6px;font-weight:500}
.ch{list-style:none;margin:0;padding:0;display:grid;gap:5px}
.ch li{display:flex;align-items:center;gap:8px;border-radius:9px;padding:6px 10px;background:var(--no-soft);border:1px solid transparent}
.ch li.ok{background:var(--ok-soft);border-color:var(--ok)}
.ch .mark{width:16px;color:var(--ok);font-weight:700;flex:0 0 16px}
.ch .txt{flex:1;min-width:0}
.ch .tag{font-size:.75rem;color:var(--muted);text-align:right}
.why{margin:8px 0 0;font-size:.9rem;color:var(--muted)}
.why-lbl{display:inline-block;font-size:.72rem;background:var(--accent-soft);color:var(--accent);border-radius:999px;padding:1px 8px;margin-right:6px;font-weight:700}
.samples{display:grid;gap:10px}
.sample{background:var(--card);border:1px dashed var(--line);border-radius:12px;padding:10px 14px;scroll-margin-top:110px}
.expr{font-size:1.15rem;font-weight:700;margin:4px 0 8px;font-variant-numeric:tabular-nums}
body.hide-ans .ch li.ok{background:var(--no-soft);border-color:transparent}
body.hide-ans .ch .mark,body.hide-ans .why,body.hide-ans .ch .tag{visibility:hidden}
.rule{margin-top:12px;background:var(--primary-soft);border-radius:12px;padding:10px 14px;scroll-margin-top:110px}
.rule p{margin:2px 0 0;font-weight:700;font-size:1.05rem}
.dad{background:var(--dad);border:1px solid var(--dad-line);border-radius:14px;padding:14px 16px;position:sticky;top:104px;scroll-margin-top:110px;color:var(--ink)}
.dad h3{font-size:1.05rem;margin:4px 0 10px;color:var(--dad-ink)}
.dad h4{margin:12px 0 4px;font-size:.9rem;color:var(--dad-ink)}
.dad-say{margin:0;padding-left:0;list-style:none;display:grid;gap:6px}
.dad-say li,.traps li{display:flex;gap:8px;align-items:flex-start;scroll-margin-top:110px}
.dad-say li > span,.traps li > div{min-width:0}
.dad-do,.dad-pass{margin:0;font-size:.95rem}
.traps{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.traps .kid{font-weight:500}
.traps .dadsay{color:var(--muted);font-size:.92rem}
.ref{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px}
.ref .lbl{font-size:.75rem;color:var(--muted);letter-spacing:.03em}
.ref code,code.mini{font-size:.78rem;color:var(--primary);background:var(--primary-soft);border-radius:6px;padding:1px 7px;white-space:nowrap}
code.mini{flex:0 0 auto;margin-top:2px}
.dad .ref code,.dad code.mini{color:var(--dad-ink);background:var(--accent-soft)}
.fig{margin:6px 0 8px;color:var(--ink);display:inline-block;max-width:100%;overflow-x:auto}
.fig svg{max-width:100%;height:auto;display:block}
div.fig{display:block}
.fr{display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;line-height:1.05;margin:0 2px;font-variant-numeric:tabular-nums}
.fr .n{border-bottom:1.5px solid currentColor;padding:0 3px}
.fr .d{padding:0 3px}
.toggle{display:inline-flex;align-items:center;gap:8px;font-size:.9rem;cursor:pointer;user-select:none;margin-top:8px}
.toggle input{width:18px;height:18px;accent-color:var(--primary)}
footer{margin-top:40px;color:var(--muted);font-size:.85rem;text-align:center}
@media (prefers-reduced-motion:no-preference){html{scroll-behavior:smooth}}
@media (max-width:899px){.dad{position:static}}
@media print{
  *{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}
  body{background:#fff;padding:0;font-size:13px}
  .wrap{max-width:100%}
  .top{position:static}
  .dad{position:static;box-shadow:none;break-inside:auto}
  .step,.sample,.check,.rule,.traps li,figure,svg{break-inside:avoid}
}
</style>
<div class="wrap">
  <div class="top">
    <h1>🔵 원의 넓이 줄기 — 배움 원고 검수</h1>
    <p class="sub">신코치 수학 · 초6-2 5단원 「원의 둘레와 넓이」 · 개념 ${CIRCLE.length}개</p>
    <div class="nav">${nav}</div>
  </div>

  <div class="intro">
    <div class="box">
      <h3>무엇을 봐 주시면 되나</h3>
      <div class="stats">
        <span><b>${CIRCLE.length}</b> 개념</span>
        <span><b>${totals.steps}</b> 📘 배움 장</span>
        <span><b>${totals.checks}</b> 확인 질문</span>
        <span><b>${totals.figs}</b> 그림</span>
        <span><b>${totals.traps}</b> 헷갈리는 자리</span>
        <span><b>${CIRCLE.length * 3}</b> 🧪 문제 예시</span>
      </div>
      <ol class="ladder">${CIRCLE.map((c, i) => `<li><b>${letter}${i + 1}</b>${esc(c.name)}<small>${gradeLabel(c.grade)}</small></li>`).join('')}</ol>
      <ul class="how">
        <li><b>📘 배움</b> — 진우가 앱에서 읽는 것. <b>한 장 = 한 화면</b>, 짧은 설명 → 확인 질문 → 다음 장. 칸 범위는 미래엔 6-2 교사용 지도서의 차시표(11차시)로 확인했습니다. N1(원의 중심·반지름·지름)은 3학년 복습 칸이라 📏 진단에서 알면 건너뜁니다. 새 말은 그 칸에서 처음 씁니다 — <b>원주·원주율 N2</b>, <b>원의 넓이 N4</b>, <b>반지름 × 반지름 N5</b>, <b>반원·고리·4등분 N7</b>부터(앞 칸은 테스트로 막았습니다)</li>
        <li><b>원주율</b> — 3.14 하나만 씁니다. 문제마다 "(원주율: 3.14)"를 붙이고, 배움 글에서는 "원주율은 3.1415…로 끝없이 이어져서 <b>약</b> 3.14로 쓴다"고 말합니다("원주율은 3.14예요"라고 단정하는 문장은 테스트가 막습니다)</li>
        <li><b>🧪 문제 예시</b> — 앱이 숫자를 바꿔 가며 끝없이 만드는 문제 중 몇 개입니다. 오답은 <b>아이가 실제로 하는 틀린 생각</b>입니다 (반지름과 지름을 바꿈 · 원주를 반지름으로 나눠 6.28 · 큰 원은 원주율도 크다 · 반지름에 바로 3.14 · 거꾸로 할 때 곱함 · 원 밖 정사각형을 원의 넓이로 · 잘라 붙인 가로를 원주 전체로 · 지름 × 지름 × 3.14 · 반지름 3배면 넓이도 3배 · 고리를 반지름의 차로 · 반원 둘레에 지름을 빠뜨림)</li>
        <li><b>그림</b> — 원·반원·원을 4등분한 조각·고리·정사각형 속 원·원 안팎 정사각형·원 안 정육각형·모눈·잘라 붙이기·나란히 놓은 동전. 모두 <b>실제 비율</b>로 그리고, 테스트가 그려진 그림에서 반지름·한 변·고리 두 원의 비율·잘라 붙인 띠의 가로(≈ 원주의 반)를 다시 쟀습니다. 모눈 칸 수(반지름 5 cm면 60칸·88칸)는 테스트가 따로 세어 교과서(반지름 10 cm: 276칸·344칸)와도 맞췄습니다</li>
        <li><b>🔢 숫자판</b> — 답이 수 하나인 ① 문제는 앱에서 숫자판으로 직접 씁니다(78.5처럼 소수도). 범위("72 cm²보다 크고 144 cm²보다 작아요")나 식("7 × 7 × 3.14")이 답이면 보기를 고릅니다</li>
        <li><b>👨 아빠 카드</b> — 저녁 10분에 처음 소개할 때 쓰는 반 장. 컵·접시·끈·자·모눈종이·색종이·종이 접시·피자 전단처럼 집에서 실제로 할 수 있는 활동인지, 아버님 말투에 맞는지</li>
        <li>확인 질문 ${totals.checks}개는 테스트가 <b>문제 글을 따로 읽어</b> 다시 풀었고, 오답 보기 하나하나가 어느 틀린 셈에서 나왔는지도 대조했습니다. 배움 글이 말하는 길이("지름이 10 cm")도 그 장의 그림과 같은지 하나씩 봤습니다</li>
      </ul>
      <p>고칠 곳은 번호로 가리켜 주시면 됩니다. 예) <code>N2-3 설명이 길다</code>, <code>N4-2✓ 오답이 너무 쉽다</code>, <code>N6-①a 이 오답은 안 나올 것 같다</code>, <code>N7-👨함정1</code></p>
      <label class="toggle"><input type="checkbox" id="ans" checked> 정답·오개념 이름 보이기 (끄면 진우가 보는 모양)</label>
    </div>
    <div class="box dadbox">
      <h3>👨 이 줄기에서 제일 중요한 한 가지</h3>
      <p>원 문제의 실수는 대부분 <b>"이 길이가 반지름이야, 지름이야?"</b> 하나에서 나옵니다. 원주는 지름에 3.14를 곱하고, 넓이는 반지름을 두 번 곱합니다. 문제에 반지름이 나오면 원주에서 × 2를 빠뜨리고, 지름이 나오면 넓이에서 ÷ 2를 빠뜨립니다. 그래서 문제마다 반지름과 지름을 번갈아 주고, 그림에도 어느 선의 길이인지 그어 두었습니다.</p>
      <p>N4~N5는 공식을 외우기 전에 <b>왜 반지름 × 반지름 × 3.14인지</b>를 봅니다. 원 안 정사각형보다 크고 원 밖 정사각형보다 작다(어림) → 잘게 잘라 엇갈려 붙이면 직사각형에 가까워진다(가로 = 원주의 반, 세로 = 반지름). 색종이로 한 번 잘라 붙여 보면 오래 갑니다.</p>
      <p>N7 ⭐은 교과서 「원의 둘레와 넓이를 활용해요」 차시입니다. <b>넓이는 나누거나 빼서, 둘레는 곡선과 곧은 선을 모두</b> — 반원의 둘레에 지름을 빠뜨리는 실수가 가장 흔합니다. C 소수 줄기(소수의 곱셈·나눗셈)를 먼저 하면 3.14 셈이 훨씬 편합니다.</p>
      <p style="margin-top:10px"><b>예시 출연진</b>: 앱에서는 진우가 도감에서 잡은 포켓몬이 들어갑니다. 이 페이지는 ${NAMES.slice(0, 4).join('·')} 등을 예시로 끼웠습니다.</p>
    </div>
  </div>

  ${sections}

  <footer>신코치 🔵 수학 · 원의 넓이 줄기 배움 원고 ·${new Date().toISOString().slice(0, 10)}</footer>
</div>
<script>
(function(){
  var cb=document.getElementById('ans');
  function apply(){document.body.classList.toggle('hide-ans',!cb.checked);}
  try{var v=localStorage.getItem('cir-review-ans');if(v==='0'){cb.checked=false;}}catch(e){}
  cb.addEventListener('change',function(){apply();try{localStorage.setItem('cir-review-ans',cb.checked?'1':'0');}catch(e){}});
  apply();
})();
</script>
`;
writeFileSync(out, html, 'utf8');
console.log(`검수 페이지: ${out} (${Math.round(html.length / 1024)}KB) — 배움 ${totals.steps}장 · 확인 ${totals.checks} · 그림 ${totals.figs} · 함정 ${totals.traps} · 문제 예시 ${CIRCLE.length * 3}`);
