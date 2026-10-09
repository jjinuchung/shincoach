// 🔄 AB 평면도형의 이동 줄기 검수 페이지 만들기: node tools/mathmove.mjs [출력 경로]
// coach/math/move.json(배움 원고 + 아빠 카드)과 js/mathmove.js(사다리 + 생성기)를 한 HTML로 — 아버님이 출근해서 폰으로 본다.
// 곱셈과 나눗셈 줄기(tools/mathmuldiv.mjs)를 본떴다: 개념마다 실제 문제 예시(① 계산 2 + ② 오개념 1)도 함께 싣는다.
// 항목마다 번호(AB3-2 / AB3-2✓ / AB3-👨 / AB3-①a)를 붙여 "AB6-①a 오답이 너무 쉽다"처럼 가리켜 고칠 수 있게 한다.
// 모눈 위 점·칸 도형 [move] · 모양 나란히 [shapes] · 디지털 숫자 카드 [seg]는 앱과 같은 그림으로 그린다.
// ★ 공개 저장소에 실리는 페이지라 진우 기록 수치(몇 개 중 몇 개·몇 %)는 쓰지 않는다 (메모 public-repo-no-kid-records).
import { readFileSync, writeFileSync } from 'node:fs';
import { MOVE, gradeLabel, makeQuestion } from '../js/mathmove.js';
import { fill } from '../js/mathgen.js';
import { richParts, renderFigures } from '../js/mathdraw.js';

const out = process.argv[2] || 'coach/math/review-move.html';
const content = JSON.parse(readFileSync('coach/math/move.json', 'utf8'));
// 예시 출연진 — 실제 앱에서는 진우가 도감에서 잡은 포켓몬이 들어간다
const NAMES = ['피카츄', '리자몽', '개굴닌자', '루카리오', '푸린', '잠만보', '이브이', '뮤츠'];
const OPTS = { names: NAMES.slice(0, 4), me: '진우' };

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** 글 조각 하나 → HTML — 앱 richNode와 같은 richParts (문자는 기울여, 분수는 세로로) */
function partHtml(p) {
  if (p.k === 'v') return `<i class="v">${esc(p.s)}</i>`;
  if (p.k === 'm') return `<span class="mx">${esc(p.w)}<span class="fr"><span class="n">${esc(p.n)}</span><span class="d">${esc(p.d)}</span></span></span>`;
  if (p.k === 'f') return `<span class="fr"><span class="n">${p.n.map(partHtml).join('')}</span><span class="d">${p.d.map(partHtml).join('')}</span></span>`;
  return esc(p.s);
}
/** **굵게**, 세로 분수, 기울인 문자, 한 줄 바꿈 */
function rich(s) {
  return String(s).split(/(\*\*[^*]+\*\*)/g).map((seg) => {
    const m = /^\*\*([^*]+)\*\*$/.exec(seg);
    return m ? `<strong>${richParts(m[1]).map(partHtml).join('')}</strong>` : richParts(seg).map(partHtml).join('');
  }).join('').replace(/\n/g, '<br>');
}
const FIG = /^\[[a-z]+ [^\]]+\]$/;
function richWithFigs(p) {
  return String(p).split(/(\[[a-z]+ [^\]]+\])/g).map((seg) => (FIG.test(seg) ? `<span class="fig">${renderFigures(seg)}</span>` : rich(seg))).join('');
}
/** 문단마다 — 그림 지시문만 있는 문단은 그림 한 장으로 */
const paras = (s) => String(s).split(/\n\n+/).map((p) => (FIG.test(p.trim()) ? `<div class="fig">${renderFigures(p.trim())}</div>` : `<p>${richWithFigs(p)}</p>`)).join('');

const letter = 'AB';

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
      <ol class="ch">${q.choices.map((x) => `<li class="${x.ok ? 'ok' : 'no'}"><span class="mark">${x.ok ? '✔' : ''}</span><span class="txt">${rich(x.text)}</span>${x.ok ? '' : `<span class="tag">${esc(x.tag || '')}</span>`}</li>`).join('')}</ol>
    </div>`).join('');
}

const sections = MOVE.map((c, i) => {
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
    <h3>${rich(dad.goal)}</h3>
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
        <div class="grade">${gradeLabel(c.grade)}${c.needs.length ? ` · ${c.needs.map((n) => letter + (MOVE.findIndex((x) => x.id === n) + 1)).join(', ')} 다음` : ' · 첫 개념'}</div>
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

const all = MOVE.map((c) => content[c.id]);
const totals = {
  steps: all.reduce((a, v) => a + v.lesson.length, 0),
  checks: all.reduce((a, v) => a + v.lesson.filter((s) => s.check).length, 0),
  traps: all.reduce((a, v) => a + v.dad.traps.length, 0),
  figs: all.reduce((a, v) => a + v.lesson.reduce((b, s) => b + (s.say.match(/\[[a-z]+ /g) || []).length + (s.check ? (s.check.q.match(/\[[a-z]+ /g) || []).length : 0), 0), 0),
};
// 배움 글의 그림 수 — 그림마다 붙은 그림 말("가는 처음 도형을 오른쪽으로 뒤집은 도형이에요")을 테스트가 그림과 대조한다 (tests/mathmove.test.js)
const sayFigs = all.reduce((a, v) => a + v.lesson.reduce((b, s) => b + (s.say.match(/\[[a-z]+ /g) || []).length, 0), 0);
const nav = MOVE.map((c, i) => `<a href="#${letter}${i + 1}"><b>${letter}${i + 1}</b> ${esc(c.name)}</a>`).join('');

const html = `<title>평면도형의 이동 검수</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gowun+Dodum&family=Noto+Sans+KR:wght@400;500;700&display=swap">
<style>
/* 레이아웃: 위에 개념 바로가기, 개념마다 [배움 + 문제 예시 | 아빠 카드] 두 칸 (폰에서는 한 칸) — 문자와 식 검수 페이지와 같은 체계 */
:root{
  --bg:#f5f7ff; --card:#ffffff; --ink:#1f2340; --muted:#6b7280; --line:#e3e6f3;
  --primary:#4f46e5; --primary-soft:#eef2ff; --accent:#f59e0b; --accent-soft:#fff7ed;
  --ok:#0f9f6e; --ok-soft:#ecfdf5; --no-soft:#f8f9fc;
  --dad:#fff8ec; --dad-line:#f3c27a; --dad-ink:#7c4a03;
  --font-display:"Gowun Dodum","Noto Sans KR",sans-serif;
  --font-body:"Noto Sans KR",system-ui,-apple-system,"Malgun Gothic",sans-serif;
  --font-math:"Times New Roman","Cambria Math",Georgia,serif;
}
@media (prefers-color-scheme:dark){ :root:not([data-theme="light"]){
  --bg:#14162a; --card:#1d2040; --ink:#e8e9f5; --muted:#a0a6c2; --line:#2e3258;
  --primary:#9b9cf8; --primary-soft:#262a55; --accent:#fbbf24; --accent-soft:#3a2f14;
  --ok:#34d399; --ok-soft:#153a2d; --no-soft:#22254a;
  --dad:#2c261a; --dad-line:#a16207; --dad-ink:#fcd9a0;
  color-scheme:dark;
}}
:root[data-theme="dark"]{
  --bg:#14162a; --card:#1d2040; --ink:#e8e9f5; --muted:#a0a6c2; --line:#2e3258;
  --primary:#9b9cf8; --primary-soft:#262a55; --accent:#fbbf24; --accent-soft:#3a2f14;
  --ok:#34d399; --ok-soft:#153a2d; --no-soft:#22254a;
  --dad:#2c261a; --dad-line:#a16207; --dad-ink:#fcd9a0;
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
.qt p{margin:0 0 6px}
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
/* 식: 문자는 기울여(교과서 표기), 나눗셈은 세로 분수 — 분수 막대가 괄호 노릇을 해서 괄호는 뗀다 */
i.v{font-family:var(--font-math);font-style:italic;font-size:1.1em;padding:0 .04em}
.fr{display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;line-height:1.1;margin:0 2px;font-variant-numeric:tabular-nums}
.fr .n{border-bottom:1.5px solid currentColor;padding:0 3px}
.fr .d{padding:0 3px}
.mx{display:inline-flex;align-items:center;gap:3px;vertical-align:middle}
/* 모눈·모양·숫자 카드 그림 — 앱과 같은 SVG (currentColor라 어두운 화면에서도 보인다) */
.fig{margin:6px 0 8px;color:var(--ink);display:inline-block;max-width:100%;overflow-x:auto}
.fig svg{max-width:100%;height:auto;display:block}
div.fig{display:block;max-width:400px}
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
  .step,.sample,.check,.rule,.traps li,.fr,.fig{break-inside:avoid}
}
</style>
<div class="wrap">
  <div class="top">
    <h1>🔄 평면도형의 이동 줄기 — 배움 원고 검수</h1>
    <p class="sub">신코치 수학 · 초4 「평면도형의 이동」(4-1 4단원) · 개념 ${MOVE.length}개</p>
    <div class="nav">${nav}</div>
  </div>

  <div class="intro">
    <div class="box">
      <h3>무엇을 봐 주시면 되나</h3>
      <div class="stats">
        <span><b>${MOVE.length}</b> 개념</span>
        <span><b>${totals.steps}</b> 📘 배움 장</span>
        <span><b>${totals.checks}</b> 확인 질문</span>
        <span><b>${totals.figs}</b> 🎨 그림</span>
        <span><b>${totals.traps}</b> 헷갈리는 자리</span>
        <span><b>${MOVE.length * 3}</b> 🧪 문제 예시</span>
      </div>
      <ol class="ladder">${MOVE.map((c, i) => `<li><b>${letter}${i + 1}</b>${esc(c.name)}<small>${gradeLabel(c.grade)}</small></li>`).join('')}</ol>
      <ul class="how">
        <li><b>📘 배움</b> — 진우가 앱에서 읽는 것. <b>한 장 = 한 화면</b>, 짧은 설명 → 확인 질문 → 다음 장. 범위는 4-1 4단원 「평면도형의 이동」 — 진우의 4학년 책이 2022 개정판이라 2022 성취기준 [4수03-04] 밀기·뒤집기·돌리기 · [4수03-05] 점의 이동(모눈 선을 따라 '몇 칸'·'몇 cm')을 기준으로, 천재(한대희) 2022 4-1 지도서 4단원 차례를 따랐습니다 — AB1 점의 이동 → AB2 밀기 → AB3 뒤집기 → AB4 뒤집기의 성질 → AB5 돌리기 → AB6 돌리기의 성질 → AB7 무늬의 규칙 → AB8 ⭐ 활용. 2022 교육과정이 "돌리고 뒤집기·뒤집고 돌리기 같은 복잡한 변화"를 피하라고 해서 두 움직임을 잇는 문제는 없고, 밀기·뒤집기는 위쪽·아래쪽·왼쪽·오른쪽, 돌리기는 90°·180°·270°·360°만 씁니다(지도서 유의 사항)</li>
        <li><b>🎨 그림</b> — 모눈 위의 점·칸 도형, 모양 나란히, 디지털 숫자 카드를 앱과 같은 그림으로 그립니다. 밀기 후보는 후보마다 작은 모눈에 그리고 처음 도형을 흐리게 겹쳐 자리를 견줄 수 있게 했습니다. 도형은 <b>어느 쪽으로 봐도 대칭이 없는 4~5칸 모양</b>만 써서(지도서: 비대칭 모양부터) 뒤집은 모양과 돌린 모양이 늘 달라 보입니다</li>
        <li><b>✍️ 그리는 문제</b> — 앱에서는 점을 직접 찍거나(점의 이동) 칸을 칠해서(밀기는 자리까지, 뒤집기·돌리기는 모양만 — 지도서: 모눈째 옮겨 그리기를 강요하지 않음) 답하는 판도 붙습니다(⚙ 숫자판 스위치를 켜 두면). 판에 후보 자리를 찍거나 칠하면 그 후보의 오개념으로 채점되고, 다른 자리는 "점 ㄱ에서 오른쪽으로 3칸, 위쪽으로 2칸"·"오른쪽으로 5칸 옮김"처럼 짐작한 답으로 남습니다. 점을 찍는 동안에는 몇 칸인지 말해 주지 않습니다 — 이 칸에서 배우는 것이 바로 칸 세기라서요</li>
        <li><b>🧪 문제 예시</b> — 앱이 모양과 자리를 바꿔 가며 끝없이 만드는 문제 중 몇 개입니다. 오답은 <b>아이가 실제로 하는 틀린 생각</b>입니다(지도서가 인용한 연구와 2015 지도서 오답 유형) — 출발한 점도 한 칸으로 셈 · 가로와 세로 칸 수를 바꿈 · 두 도형 사이의 빈칸을 민 길이로 봄 · 밀었는데 모양을 바꿈 · 뒤집는 방향을 바꿔 봄 · 뒤집을 때 두 쪽을 모두 바꿈 · 위쪽과 아래쪽으로 뒤집은 모양이 다르다고 봄 · 돌리는 방향을 반대로 봄 · 90°만큼과 180°만큼을 헷갈림 · 180°만큼 돌리기를 위아래 뒤집기로 봄 · 360°만큼 돌리면 처음 모양인 것을 모름 · 규칙대로 한 번 더 움직이지 않음 · 처음 도형을 찾을 때 거꾸로 하지 않음 · 디지털 숫자 카드를 돌리면 순서도 바뀌는 것을 놓침 등 23가지. <b>한 후보가 두 틀린 생각에서 다 나오는 모양</b>은 쓰지 않습니다 — 📊에 엉뚱한 이름이 쌓이지 않게</li>
        <li><b>👨 아빠 카드</b> — 저녁 10분에 처음 소개할 때 쓰는 반 장. 바둑돌·모눈종이·얇은 종이·숫자 카드처럼 집에서 실제로 할 수 있는 활동인지, 아버님 말투에 맞는지. 통과 기준의 문제도 테스트가 따로 풀어 괄호 속 답과 대조했습니다</li>
        <li>확인 질문 ${totals.checks}개는 테스트가 <b>문제 글과 그림을 따로 읽어 좌표로 다시 밀고 뒤집고 돌려</b> 풀었고, 오답 하나하나가 <b>한 가지</b> 틀린 생각에서만 나오는지·까닭이 보기를 다 말하는지도 대조했습니다. 배움 글의 그림 ${sayFigs}장마다 붙은 말("가는 처음 도형을 오른쪽으로 뒤집은 도형이에요", "시계 방향으로 90°만큼 돌리면 위쪽 부분이 오른쪽으로 가요")도 그림과 맞춰 봤습니다</li>
      </ul>
      <p>고칠 곳은 번호로 가리켜 주시면 됩니다. 예) <code>AB3-2 설명이 길다</code>, <code>AB2-1 그림이 작다</code>, <code>AB5-①a 이 오답은 안 나올 것 같다</code>, <code>AB8-👨함정1</code></p>
      <label class="toggle"><input type="checkbox" id="ans" checked> 정답·오개념 이름 보이기 (끄면 진우가 보는 모양)</label>
    </div>
    <div class="box dadbox">
      <h3>👨 이 줄기에서 제일 중요한 한 가지</h3>
      <p>뒤집기와 돌리기를 <b>"무엇이 바뀌었나"</b>로 가려내는 것입니다. 한 번 뒤집으면 <b>한 쌍만</b>(왼쪽과 오른쪽, 또는 위쪽과 아래쪽) 바뀌고, 180°만큼 돌리면 두 쌍이 모두 바뀝니다. 지도서가 인용한 연구가 꼽은 어려움이 바로 여기입니다 — 밀기를 뒤집기와 헷갈림, 위쪽으로 뒤집은 것과 아래쪽으로 뒤집은 것이 같다는 것을 모름, 돌리기는 방향과 각도가 많아 어려움.</p>
      <p>돌리기는 <b>"도형의 위쪽 부분이 어디로 가나"</b> 하나만 따라가게 했습니다 — 시계 방향으로 90°만큼이면 오른쪽, 180°만큼이면 아래쪽. 머릿속으로 안 되면 종이를 직접 돌려 보게 하는 것이 지도서의 방법이기도 합니다(아빠 카드의 활동).</p>
      <p>점의 이동은 <b>출발한 점은 세지 않기</b>, 밀기는 <b>같은 칸끼리 세기</b>(두 도형 사이의 빈칸만 세지 않기)가 핵심입니다. 진우의 실제 기록은 📊와 비공개 기록에서 보시면 됩니다.</p>
      <p>앱에서는 Z 각도 다음, J 삼각형·사각형 바로 앞에 놓입니다(3단계) — 4-1 네 단원(Y 큰 수 → Z 각도 → AA 곱셈과 나눗셈 → AB 평면도형의 이동)의 마지막 줄기입니다.</p>
      <p style="margin-top:10px"><b>예시 출연진</b>: 앱에서는 진우가 도감에서 잡은 포켓몬이 들어갑니다. 이 페이지는 ${NAMES.slice(0, 4).join('·')} 등을 예시로 끼웠습니다.</p>
    </div>
  </div>

  ${sections}

  <footer>신코치 🔄 수학 · 평면도형의 이동 줄기 배움 원고 · ${new Date().toISOString().slice(0, 10)}</footer>
</div>
<script>
(function(){
  var cb=document.getElementById('ans');
  function apply(){document.body.classList.toggle('hide-ans',!cb.checked);}
  try{var v=localStorage.getItem('move-review-ans');if(v==='0'){cb.checked=false;}}catch(e){}
  cb.addEventListener('change',function(){apply();try{localStorage.setItem('move-review-ans',cb.checked?'1':'0');}catch(e){}});
  apply();
})();
</script>
`;
writeFileSync(out, html, 'utf8');
console.log(`검수 페이지: ${out} (${Math.round(html.length / 1024)}KB) — 배움 ${totals.steps}장 · 확인 ${totals.checks} · 그림 ${totals.figs}(배움 글 ${sayFigs}) · 함정 ${totals.traps} · 문제 예시 ${MOVE.length * 3}`);
