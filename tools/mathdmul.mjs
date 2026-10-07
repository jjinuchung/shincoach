// ✖️ W 소수의 곱셈 줄기 검수 페이지 만들기: node tools/mathdmul.mjs [출력 경로]
// coach/math/decmul.json(배움 원고 + 아빠 카드)과 js/mathdmul.js(사다리 + 생성기)를 한 HTML로 — 아버님이 출근해서 폰으로 본다.
// 분수의 덧셈·뺄셈 줄기(tools/mathfadd.mjs)를 본떴다: 개념마다 실제 문제 예시(① 계산 2 + ② 오개념 1)도 함께 싣는다.
// 항목마다 번호(W3-2 / W3-2✓ / W3-👨 / W3-①a)를 붙여 "W6-①a 오답이 너무 쉽다"처럼 가리켜 고칠 수 있게 한다.
// 분수는 세로로, 소수 곱셈 그림 [dmul rep|band|area …]은 앱과 같은 그림으로 그린다.
// ★ 공개 저장소에 실리는 페이지라 진우 기록 수치(몇 개 중 몇 개·몇 %)는 쓰지 않는다 (메모 public-repo-no-kid-records).
import { readFileSync, writeFileSync } from 'node:fs';
import { DMUL, gradeLabel, makeQuestion } from '../js/mathdmul.js';
import { fill } from '../js/mathgen.js';
import { richParts, renderFigures } from '../js/mathdraw.js';

const out = process.argv[2] || 'coach/math/review-dmul.html';
const content = JSON.parse(readFileSync('coach/math/decmul.json', 'utf8'));
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

const letter = 'W';

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

const sections = DMUL.map((c, i) => {
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
        <div class="grade">${gradeLabel(c.grade)}${c.needs.length ? ` · ${c.needs.map((n) => letter + (DMUL.findIndex((x) => x.id === n) + 1)).join(', ')} 다음` : ' · 첫 개념'}</div>
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

const all = DMUL.map((c) => content[c.id]);
const totals = {
  steps: all.reduce((a, v) => a + v.lesson.length, 0),
  checks: all.reduce((a, v) => a + v.lesson.filter((s) => s.check).length, 0),
  traps: all.reduce((a, v) => a + v.dad.traps.length, 0),
  figs: all.reduce((a, v) => a + v.lesson.reduce((b, s) => b + (s.say.match(/\[dmul /g) || []).length + (s.check ? (s.check.q.match(/\[dmul /g) || []).length : 0), 0), 0),
};
// 셈식 줄 수 — 테스트가 "= …"로 내려 쓴 줄까지 이어서 소수·분수 계산기로 다시 계산한다 (tests/mathdmul.test.js)
const truthText = all.map((v) => [...v.lesson.flatMap((s) => [s.say, ...(s.check ? [s.check.why] : [])]), v.rule, ...v.dad.say, v.dad.do, v.dad.pass, ...v.dad.traps.map((t) => t.dad)].join('\n')).join('\n').replace(/\*\*/g, '');
const chains = truthText.split('\n').filter((l) => / = /.test(l)).length;
const nav = DMUL.map((c, i) => `<a href="#${letter}${i + 1}"><b>${letter}${i + 1}</b> ${esc(c.name)}</a>`).join('');

const html = `<title>소수의 곱셈 검수</title>
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
/* 소수 곱셈 그림 — 앱과 같은 SVG (currentColor라 어두운 화면에서도 보인다) */
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
    <h1>✖️ 소수의 곱셈 줄기 — 배움 원고 검수</h1>
    <p class="sub">신코치 수학 · 초5 「소수의 곱셈」(5-2) · 개념 ${DMUL.length}개</p>
    <div class="nav">${nav}</div>
  </div>

  <div class="intro">
    <div class="box">
      <h3>무엇을 봐 주시면 되나</h3>
      <div class="stats">
        <span><b>${DMUL.length}</b> 개념</span>
        <span><b>${totals.steps}</b> 📘 배움 장</span>
        <span><b>${totals.checks}</b> 확인 질문</span>
        <span><b>${totals.figs}</b> ✖️ 곱셈 그림</span>
        <span><b>${totals.traps}</b> 헷갈리는 자리</span>
        <span><b>${DMUL.length * 3}</b> 🧪 문제 예시</span>
      </div>
      <ol class="ladder">${DMUL.map((c, i) => `<li><b>${letter}${i + 1}</b>${esc(c.name)}<small>${gradeLabel(c.grade)}</small></li>`).join('')}</ol>
      <ul class="how">
        <li><b>📘 배움</b> — 진우가 앱에서 읽는 것. <b>한 장 = 한 화면</b>, 짧은 설명 → 확인 질문 → 다음 장. 범위는 2015 미래엔 5-2 지도서 4단원 「소수의 곱셈」 차시 계획 그대로입니다 — (소수) × (자연수) 소수 한 자리 → 두 자리 → (자연수) × (소수) 한 자리 → 두 자리 → (소수) × (소수) 한 자리끼리 → 두 자리와 한 자리 → 곱의 소수점 위치, W8은 생활 속 값·넓이·"몇 배"·곱의 크기 어림입니다. 2022 개정 성취기준 [6수01-13], 2022 미래엔 5-2 4단원도 같은 차례입니다</li>
        <li><b>방법 셋</b> — <b>0.1·0.01이 몇 개인지</b> 세기(0.7 × 3은 0.1이 21개), <b>분수로 바꾸기</b>(7/10 × 3 = 21/10), <b>자연수처럼 곱한 다음 1/10·1/100배</b>(23 × 4 = 92 → 9.2). 지도서 241쪽처럼 칸을 소수 자리 수(한 자리/두 자리)로 나눕니다. "자리 수를 더한다"는 말은 W5부터, "소수 세 자리"는 W6부터 나옵니다</li>
        <li><b>어림</b> — 칸마다 곱을 "몇과 몇 사이"로 어림해 소수점 위치를 확인합니다(2.3 × 4는 8과 12 사이 → 9.2). <b>0보다 큰 수에 1보다 작은 수를 곱하면 처음 수보다 작아진다</b>는 것은 W3(띠)·W5(넓이)·W8(계산하지 않고 고르기)에서 되풀이합니다(0에는 무엇을 곱해도 0이라는 것도 함께). 2022 성취기준 고려사항의 "어림셈이 필요한 실생활 상황"입니다</li>
        <li><b>✖️ 곱셈 그림</b> — 지도서 241쪽의 "수 모형, 띠 모델, 넓이 모델"을 그림으로 보여 줍니다. <b>0.1 막대</b>(0.7 × 3 — 10칸 막대 3개에 7칸씩), <b>띠</b>(2 × 0.9 — 2만큼의 띠를 10묶음으로 나눠 9묶음), <b>넓이</b>(0.4 × 0.8 — 1 m² 100칸에서 두 번 칠한 32칸). 그림은 1보다 작은 소수 한 자리만이고, 그림이 있는 장은 글에 같은 식과 칠한 칸 수가 나오는지 맞춰 봤습니다. ① 계산 문제에는 그림을 넣지 않습니다(답을 흘려서)</li>
        <li><b>답의 꼴</b> — 소수 부분의 끝자리 0은 지운 꼴(2.10 → 2.1, 5.00 → 5)로 씁니다. 풀이는 소수점을 먼저 찍은 꼴을 보이고 지웁니다(0.2 × 0.5 = 0.10 = 0.1). 4500처럼 자연수의 0은 지우지 않습니다. 지도서 채점 기준처럼 앱 숫자판은 지우지 않은 답(2.10)도 맞음으로 칩니다</li>
        <li><b>🧪 문제 예시</b> — 앱이 숫자를 바꿔 가며 끝없이 만드는 문제 중 몇 개입니다. 오답은 <b>아이가 실제로 하는 틀린 생각</b>이고, C 소수 줄기와 같은 말은 같은 이름을 써서 📊에서 한 오개념으로 모입니다 (소수점을 빼먹음 · 소수점 위치를 잘못 찍음 · 소수점 자리 수를 더하지 않음 · 분모를 10으로 봄 · 받아올림을 안 함 · 자연수 부분과 소수 부분을 따로 곱함 · 곱하지 않고 더함 · 소수점을 반대로 옮김 · 옮긴 칸 수가 틀림 · 0을 붙임 · 곱하면 항상 커진다). "소수점 위치를 잘못 찍음"(6.39 × 7을 447.3)과 "분모를 10으로 봄"(13 × 0.38을 49.4)은 5-2 익힘책 53·57쪽에 나오는 흔한 실수입니다</li>
        <li><b>🔢 숫자판</b> — 수가 답인 ① 문제는 앱에서 숫자판(소수 칸)으로 직접 씁니다. "곱이 8보다 큰 것은 어느 것" 같은 고르기는 보기 그대로입니다</li>
        <li><b>👨 아빠 카드</b> — 저녁 10분에 처음 소개할 때 쓰는 반 장. 동전·줄자·우유팩·모눈종이·계산기·마트 전단지처럼 집에서 실제로 할 수 있는 활동인지, 아버님 말투에 맞는지. 통과 기준의 답도 테스트가 다시 계산했습니다</li>
        <li>확인 질문 ${totals.checks}개는 테스트가 <b>문제 글을 따로 읽어</b> 소수 계산기로 다시 풀었고, 오답 보기 하나하나가 어느 틀린 셈에서 나왔는지(어느 수가 앞인지까지)·까닭에 그 오답 이야기가 있는지도 대조했습니다. 배움 글·까닭·아빠 카드의 <b>셈식 줄 ${chains}곳</b>도 "= …"로 이어지는 줄까지 다시 계산했습니다</li>
      </ul>
      <p>고칠 곳은 번호로 가리켜 주시면 됩니다. 예) <code>W3-2 설명이 길다</code>, <code>W5-1 그림이 헷갈린다</code>, <code>W7-①a 이 오답은 안 나올 것 같다</code>, <code>W1-👨함정1</code></p>
      <label class="toggle"><input type="checkbox" id="ans" checked> 정답·오개념 이름 보이기 (끄면 진우가 보는 모양)</label>
    </div>
    <div class="box dadbox">
      <h3>👨 이 줄기에서 제일 중요한 한 가지</h3>
      <p>소수의 곱셈은 지도서가 꼽은 대로 오답이 <b>소수점 찍기</b>(소수점을 빼먹음 · 한 자리 잘못 찍음 · 자리 수를 더하지 않음)에 가장 많이 몰리고, 소수 자리 수가 늘수록 더 많아집니다. C 소수 줄기의 곱셈은 두 칸(소수 × 자연수 · 소수 × 소수)뿐이고 배움 장이 없어서, 이 줄기가 처음부터 다시 세웁니다. 진우의 실제 기록은 📊와 비공개 기록에서 보시면 됩니다.</p>
      <p>그래서 규칙을 외우기 전에 <b>왜 그 자리에 소수점을 찍는지</b>부터 봅니다 — 0.7은 0.1이 7개라서 0.7 × 3은 0.1이 21개(W1), 소수 두 자리 수는 분모가 100인 분수(W4), 넓이 그림의 한 칸은 0.01(W5). "두 수의 소수 자리 수를 더한다"는 규칙은 이것들을 본 다음 W5·W7에서 정리합니다(2022 지도서의 "곱의 소수점 위치 찾기를 지나치게 기능적으로 접근하지 않도록").</p>
      <p>또 하나는 <b>어림</b>입니다. 곱을 구한 다음 늘 "몇과 몇 사이"인지 어림해 소수점이 맞는지 확인하고, <b>곱하면 늘 커진다</b>는 생각(0보다 큰 수에 1보다 작은 수를 곱하면 작아진다)을 띠·넓이·고르기로 깨뜨립니다.</p>
      <p>앱에서는 C 소수 바로 뒤에 놓입니다(3단계). C 줄기의 곱셈 두 칸은 그대로 둡니다.</p>
      <p style="margin-top:10px"><b>예시 출연진</b>: 앱에서는 진우가 도감에서 잡은 포켓몬이 들어갑니다. 이 페이지는 ${NAMES.slice(0, 4).join('·')} 등을 예시로 끼웠습니다.</p>
    </div>
  </div>

  ${sections}

  <footer>신코치 ✖️ 수학 · 소수의 곱셈 줄기 배움 원고 · ${new Date().toISOString().slice(0, 10)}</footer>
</div>
<script>
(function(){
  var cb=document.getElementById('ans');
  function apply(){document.body.classList.toggle('hide-ans',!cb.checked);}
  try{var v=localStorage.getItem('dmul-review-ans');if(v==='0'){cb.checked=false;}}catch(e){}
  cb.addEventListener('change',function(){apply();try{localStorage.setItem('dmul-review-ans',cb.checked?'1':'0');}catch(e){}});
  apply();
})();
</script>
`;
writeFileSync(out, html, 'utf8');
console.log(`검수 페이지: ${out} (${Math.round(html.length / 1024)}KB) — 배움 ${totals.steps}장 · 확인 ${totals.checks} · 그림 ${totals.figs} · 셈식 줄 ${chains} · 함정 ${totals.traps} · 문제 예시 ${DMUL.length * 3}`);
