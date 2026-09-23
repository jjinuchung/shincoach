// 🔢 B 혼합계산 줄기 검수 페이지 만들기: node tools/mathmixed.mjs [출력 경로]
// coach/math/mixed.json(사다리 + 배움 원고 + 아빠 카드)을 이름을 끼운 채 한 HTML로 — 아버님이 출근해서 폰으로 본다.
// 진우가 직접 만들어 달라고 한 줄기(2026-09-23). 초5 자연수의 혼합 계산 + 초6 분수·소수까지.
// 항목마다 번호(B3-2 / B3-2✓ / B3-👨)를 붙여 "B4-3✓ 오답이 너무 쉽다"처럼 가리켜 고칠 수 있게 한다.
// 사다리는 아직 생성기 모듈이 없어 mixed.json의 _ladder에서 읽는다 (2단계에서 js/mathmix.js로 옮긴다).
import { readFileSync, writeFileSync } from 'node:fs';
import { gradeLabel } from '../js/mathneg.js';
import { fill } from '../js/mathgen.js';
import { renderFigures, figureSvg } from '../js/mathdraw.js';

const out = process.argv[2] || 'coach/math/review-mix.html';
const content = JSON.parse(readFileSync('coach/math/mixed.json', 'utf8'));
const NEGATIVE = content._ladder; // 사다리 (이름만 그대로 — 아래 코드를 그대로 쓰기 위해)
// 예시 출연진 — 실제 앱에서는 진우가 도감에서 잡은 포켓몬이 들어간다
const NAMES = ['피카츄', '리자몽', '개굴닌자', '루카리오', '푸린', '잠만보', '이브이', '뮤츠'];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** **굵게**, 세로 분수, 한 줄 바꿈(규칙표) */
function rich(s) {
  let h = esc(s);
  h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  h = h.replace(/(?<![\d/])(\d+) (\d+)\/(\d+)(?![\d/])/g, '<span class="mx"><span class="w">$1</span><span class="fr"><span class="n">$2</span><span class="d">$3</span></span></span>');
  h = h.replace(/(?<![\d/])(\d+)\/(\d+)(?![\d/])/g, '<span class="fr"><span class="n">$1</span><span class="d">$2</span></span>');
  h = h.replace(/\n/g, '<br>');
  return h;
}
function richWithFigs(p) {
  return String(p).split(/(\[[a-z]+ [^\]]+\])/g).map((seg) => (/^\[[a-z]+ [^\]]+\]$/.test(seg) ? `<span class="fig">${renderFigures(seg)}</span>` : rich(seg))).join('');
}
const paras = (s) => String(s).split(/\n\n+/).map((p) => (/^\[[a-z]+ [^\]]+\]$/.test(p.trim()) ? `<div class="fig">${renderFigures(p.trim())}</div>` : `<p>${richWithFigs(p)}</p>`)).join('');

const letter = 'B';
const sections = NEGATIVE.map((c, i) => {
  const no = i + 1;
  const v = content[c.id];
  const cast = { me: '진우', mon: NAMES[i % NAMES.length], mon2: NAMES[(i + 3) % NAMES.length] };
  const f = (s) => fill(s, cast);
  const steps = v.lesson.map((s, k) => {
    const ref = `${letter}${no}-${k + 1}`;
    let check = '';
    if (s.check) {
      const ch = [{ text: s.check.ok, ok: true }, ...s.check.no.map((t) => ({ text: t, ok: false }))];
      // 🚶 끌어 보기 확인 — 앱에서는 보기 대신 수직선 위의 말을 답 자리로 끈다 (걷기 그림으로 답을 보여 준다)
      const walk = Array.isArray(s.check.walk) ? `<p class="walk-note">🚶 <b>끌어 보기</b> — 앱에서는 보기 대신 수직선의 말을 ${s.check.walk[0]}에서 답 자리(${s.check.walk[0] + s.check.walk[1]})로 끌어요</p>${figureSvg(`walk ${s.check.walk[0]} ${s.check.walk[1]}`)}` : '';
      check = `<div class="check" id="${ref}✓">
        <div class="ref"><span class="lbl">확인 질문</span><code>${ref}✓</code></div>
        <p class="qt">${rich(f(s.check.q))}</p>
        ${walk}
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
    <ol class="dad-say">${dad.say.map((s, k) => `<li id="${letter}${no}-👨말${k + 1}"><code class="mini">말${k + 1}</code>${rich(s)}</li>`).join('')}</ol>
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
        <div class="grade">${gradeLabel(c.grade)}${c.needs.length ? ` · ${c.needs.map((n) => letter + (NEGATIVE.findIndex((x) => x.id === n) + 1)).join(', ')} 다음` : ' · 첫 개념'}</div>
        <h2>${esc(c.name)}</h2>
        <p class="idea">${rich(c.idea)}</p>
      </div>
    </header>
    <div class="cols">
      <div class="lesson">
        <h4 class="col-title">📘 배움 <small>${v.lesson.length}장 · 진우가 읽는 것 · 한 장씩 넘기며 확인 질문에 답해야 다음 장</small></h4>
        <ol class="steps">${steps}</ol>
        <div class="rule" id="${letter}${no}-📏"><div class="ref"><span class="lbl">📏 한 줄로</span><code>${letter}${no}-📏</code></div><p>${rich(v.rule)}</p></div>
      </div>
      ${dadHtml}
    </div>
  </section>`;
}).join('\n');

const totals = {
  steps: NEGATIVE.reduce((a, c) => a + content[c.id].lesson.length, 0),
  checks: NEGATIVE.reduce((a, c) => a + content[c.id].lesson.filter((s) => s.check).length, 0),
  figs: NEGATIVE.reduce((a, c) => a + content[c.id].lesson.reduce((b, s) => b + (s.say.match(/\[[a-z]+ [^\]]+\]/g) || []).length, 0), 0),
  traps: NEGATIVE.reduce((a, c) => a + content[c.id].dad.traps.length, 0),
};
const nav = NEGATIVE.map((c, i) => `<a href="#${letter}${i + 1}"><b>${letter}${i + 1}</b> ${esc(c.name)}</a>`).join('');

const html = `<title>혼합계산 줄기 검수</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gowun+Dodum&family=Noto+Sans+KR:wght@400;500;700&display=swap">
<style>
:root{
  --bg:#f5f7ff; --card:#ffffff; --ink:#1f2340; --muted:#6b7280; --line:#e3e6f3;
  --primary:#4f46e5; --primary-soft:#eef2ff; --accent:#f59e0b; --accent-soft:#fff7ed;
  --ok:#0f9f6e; --ok-soft:#ecfdf5; --no-soft:#f8f9fc;
  --dad:#fff8ec; --dad-line:#f3c27a; --dad-ink:#7c4a03;
  --frac-fill:#4f46e5; --frac-fill2:#f59e0b; --frac-empty:#ffffff;
}
@media (prefers-color-scheme:dark){ :root:not([data-theme="light"]){
  --bg:#14162a; --card:#1d2040; --ink:#e8e9f5; --muted:#a0a6c2; --line:#2e3258;
  --primary:#9b9cf8; --primary-soft:#262a55; --accent:#fbbf24; --accent-soft:#3a2f14;
  --ok:#34d399; --ok-soft:#153a2d; --no-soft:#22254a;
  --dad:#2c261a; --dad-line:#a16207; --dad-ink:#fcd9a0;
  --frac-fill:#9b9cf8; --frac-fill2:#fbbf24; --frac-empty:#1d2040;
}}
:root[data-theme="dark"]{
  --bg:#14162a; --card:#1d2040; --ink:#e8e9f5; --muted:#a0a6c2; --line:#2e3258;
  --primary:#9b9cf8; --primary-soft:#262a55; --accent:#fbbf24; --accent-soft:#3a2f14;
  --ok:#34d399; --ok-soft:#153a2d; --no-soft:#22254a;
  --dad:#2c261a; --dad-line:#a16207; --dad-ink:#fcd9a0;
  --frac-fill:#9b9cf8; --frac-fill2:#fbbf24; --frac-empty:#1d2040;
}
*{box-sizing:border-box}
body{background:var(--bg);color:var(--ink);font-family:"Noto Sans KR",system-ui,-apple-system,"Malgun Gothic",sans-serif;font-size:15px;line-height:1.65;margin:0;padding-block:0 60px;padding-inline:16px}
h1,h2,h3{font-family:"Gowun Dodum","Noto Sans KR",sans-serif;text-wrap:balance;margin:0}
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
.intro .box{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px 16px}
.intro .box.dadbox{background:var(--dad);border-color:var(--dad-line)}
.intro h3{font-size:1rem;margin-bottom:6px}
.intro p{margin:4px 0;font-size:.92rem}
.intro .stats{display:flex;flex-wrap:wrap;gap:8px 18px;font-size:.92rem}
.intro .stats b{font-size:1.25rem;color:var(--primary);font-variant-numeric:tabular-nums}
.how li{margin:3px 0}
.concept{margin-block:36px 0;scroll-margin-top:110px}
.ch-head{display:flex;gap:14px;align-items:flex-start;margin-bottom:12px}
.ch-no{font-family:"Gowun Dodum",sans-serif;font-size:1.6rem;font-weight:700;color:var(--primary);background:var(--primary-soft);border-radius:12px;min-width:56px;height:56px;display:grid;place-items:center}
.grade{font-size:.75rem;letter-spacing:.06em;color:var(--muted)}
.ch-head h2{font-size:1.4rem}
.idea{color:var(--muted);margin:2px 0 0;font-size:.95rem;max-width:65ch}
.cols{display:grid;grid-template-columns:1fr;gap:16px;align-items:start}
@media(min-width:900px){.cols{grid-template-columns:1.35fr 1fr}}
.col-title{margin:0 0 10px;font-size:.95rem}
.col-title small{color:var(--muted);font-weight:400;margin-left:6px}
.steps{list-style:none;margin:0;padding:0;display:grid;gap:12px}
.step{display:flex;gap:10px;scroll-margin-top:110px}
.step-no{flex:0 0 30px;height:30px;border-radius:50%;background:var(--primary);color:#fff;font-weight:700;display:grid;place-items:center;font-size:.9rem;margin-top:12px}
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
.why{margin:8px 0 0;font-size:.9rem;color:var(--muted)}
.walk-note{margin:6px 0 4px;font-size:.88rem;color:var(--muted)}
.why-lbl{display:inline-block;font-size:.72rem;background:var(--accent-soft);color:var(--accent);border-radius:999px;padding:1px 8px;margin-right:6px;font-weight:700}
body.hide-ans .ch li.ok{background:var(--no-soft);border-color:transparent}
body.hide-ans .ch .mark,body.hide-ans .why{visibility:hidden}
.rule{margin-top:12px;background:var(--primary-soft);border-radius:12px;padding:10px 14px;scroll-margin-top:110px}
.rule p{margin:2px 0 0;font-weight:700;font-size:1.05rem}
.dad{background:var(--dad);border:1px solid var(--dad-line);border-radius:14px;padding:14px 16px;position:sticky;top:104px;scroll-margin-top:110px;color:var(--ink)}
.dad h3{font-size:1.05rem;margin:4px 0 10px;color:var(--dad-ink)}
.dad h4{margin:12px 0 4px;font-size:.9rem;color:var(--dad-ink)}
.dad-say{margin:0;padding-left:0;list-style:none;display:grid;gap:6px}
.dad-say li,.traps li{display:flex;gap:8px;align-items:flex-start;scroll-margin-top:110px}
.dad-do,.dad-pass{margin:0;font-size:.95rem}
.traps{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.traps .kid{font-weight:500}
.traps .dadsay{color:var(--muted);font-size:.92rem}
.ref{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px}
.ref .lbl{font-size:.75rem;color:var(--muted);letter-spacing:.03em}
.ref code,code.mini{font-size:.78rem;color:var(--primary);background:var(--primary-soft);border-radius:6px;padding:1px 7px;white-space:nowrap}
code.mini{flex:0 0 auto;margin-top:2px}
.dad .ref code,.dad code.mini{color:var(--dad-ink);background:rgba(243,194,122,.28)}
.fig{margin:6px 0 8px;color:var(--ink);display:inline-block;max-width:100%;overflow-x:auto}
.fig svg{max-width:100%;height:auto;display:block}
div.fig{display:block}
.fr{display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;line-height:1.05;margin:0 2px;font-variant-numeric:tabular-nums}
.fr .n{border-bottom:1.5px solid currentColor;padding:0 3px}
.fr .d{padding:0 3px}
.mx{display:inline-flex;align-items:center;gap:2px;vertical-align:middle}
.toggle{display:inline-flex;align-items:center;gap:8px;font-size:.9rem;cursor:pointer;user-select:none;margin-top:8px}
.toggle input{width:18px;height:18px;accent-color:var(--primary)}
footer{margin-top:40px;color:var(--muted);font-size:.85rem;text-align:center}
@media (prefers-reduced-motion:no-preference){html{scroll-behavior:smooth}}
@media (max-width:899px){.dad{position:static}}
</style>
<div class="wrap">
  <div class="top">
    <h1>🔢 혼합계산 줄기 — 배움 원고 검수</h1>
    <p class="sub">신코치 수학 3차 · 초5 「자연수의 혼합 계산」 + 초6 분수·소수 · 개념 8개 · 진우가 직접 만들어 달라고 한 줄기</p>
    <div class="nav">${nav}</div>
  </div>

  <div class="intro">
    <div class="box">
      <h3>무엇을 봐 주시면 되나</h3>
      <div class="stats">
        <span><b>8</b> 개념</span>
        <span><b>${totals.steps}</b> 📘 배움 장</span>
        <span><b>${totals.checks}</b> 확인 질문</span>
        <span><b>${totals.figs}</b> 그림</span>
        <span><b>${totals.traps}</b> 헷갈리는 자리</span>
      </div>
      <ul class="how">
        <li><b>📘 배움</b> — 진우가 앱에서 읽는 것. <b>한 장 = 한 화면</b>, 짧은 설명 → 확인 질문 하나 → 다음 장. 확인 질문에 답해야 다음 장이 열립니다. 초4가 혼자 읽고 잡히는지, 한 장이 너무 길지 않은지, 확인 질문이 너무 쉽거나 어렵지 않은지 봐 주세요</li>
        <li><b>📏 한 줄로</b> — 배움 끝과 사다리 카드에 붙는 요약</li>
        <li><b>👨 아빠 카드</b> — 저녁 10분에 아버님이 처음 소개할 때 쓰는 반 장. 실제로 집에서 할 수 있는 활동인지, 말투가 아버님 말투에 맞는지</li>
        <li><b>그림</b> — 혼합계산은 그림보다 <b>계산 순서(① ② ③)</b>를 줄 바꿔 보여 주는 쪽이 중요해서, 그림은 분수 편(B7·B8)에만 붙였습니다</li>
        <li><b>①②③⭐ 문제</b>는 이 검수 뒤에 만듭니다 (배움이 굳어야 문제의 오개념 보기를 정할 수 있어서). 오개념 후보는 <b>왼쪽부터 계산·괄호 무시·나눗셈을 뒤로 미룸</b> 셋을 축으로 잡을 생각입니다</li>
      </ul>
      <p>고칠 곳은 번호로 가리켜 주시면 됩니다 — 예) <code>B3-1 묶음 비유가 어렵다</code>, <code>B4-2✓ 오답이 너무 쉽다</code>, <code>B7-👨함정1 이렇게 안 틀릴 것 같다</code></p>
      <label class="toggle"><input type="checkbox" id="ans" checked> 정답·틀렸을 때 한 마디 보이기 (끄면 진우가 보는 모양)</label>
    </div>
    <div class="box dadbox">
      <h3>👨 아빠 카드는 왜 있나</h3>
      <p>혼합계산은 <b>규칙이 전부</b>인 단원입니다. 규칙을 외우기만 하면 조금 복잡해지는 순간 무너지고, "왜 곱셈이 먼저인가"를 한 번 납득하면 오래갑니다. 그 납득을 만드는 자리가 아빠 카드입니다.</p>
      <p>그래서 학원 선생님이 하는 일 중 <b>"처음 소개"만 아빠가</b>, 반복·검증·며칠 뒤 복습은 앱이 합니다. 카드는 개념 하나에 10분 — 말할 거리 셋, 같이 해 볼 것 하나, 진우가 낼 법한 오개념과 그때 할 말, 통과 기준.</p>
      <p>아빠가 못 한 날에도 앱의 📘 배움만으로 갈 수 있게 썼지만, 카드가 먼저 가면 훨씬 잘 붙습니다.</p>
      <p style="margin-top:10px"><b>예시 출연진</b>: 앱에서는 진우가 도감에서 잡은 포켓몬이 들어갑니다. 이 페이지는 ${NAMES.slice(0, 4).join('·')} 등을 예시로 끼웠습니다.</p>
    </div>
  </div>

  ${sections}

  <footer>신코치 🔢 수학 · 혼합계산 줄기 배움 원고 · ${new Date().toISOString().slice(0, 10)}</footer>
</div>
<script>
(function(){
  var cb=document.getElementById('ans');
  function apply(){document.body.classList.toggle('hide-ans',!cb.checked);}
  cb.addEventListener('change',apply);
  try{var v=localStorage.getItem('neg-review-ans');if(v==='0'){cb.checked=false;}}catch(e){}
  cb.addEventListener('change',function(){try{localStorage.setItem('neg-review-ans',cb.checked?'1':'0');}catch(e){}});
  apply();
})();
</script>
`;
writeFileSync(out, html, 'utf8');
console.log(`검수 페이지: ${out} (${Math.round(html.length / 1024)}KB) — 배움 ${totals.steps}장 · 확인 ${totals.checks} · 그림 ${totals.figs} · 함정 ${totals.traps}`);
