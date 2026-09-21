// 🔢 수학 내용 검수 페이지 만들기: node tools/mathreview.mjs [출력 경로]
// coach/math/fraction.json(사람이 쓴 것) + 생성기 표본을 이름을 끼운 채 한 HTML로 — 아버님이 출근해서 폰으로 본다.
// 항목마다 번호(A6-⭐2)를 붙여 "A6-⭐2 문장이 어색하다"처럼 가리켜 고칠 수 있게 한다.
import { readFileSync, writeFileSync } from 'node:fs';
import { FRACTION, WORLDS, makeQuestion, conceptStory } from '../js/mathgen.js';
import { renderFigures } from '../js/mathdraw.js';

const out = process.argv[2] || 'coach/math/review.html';
const content = JSON.parse(readFileSync('coach/math/fraction.json', 'utf8'));
// 예시 출연진 — 실제 앱에서는 진우가 도감에서 잡은 포켓몬이 들어간다
const NAMES = ['피카츄', '리자몽', '개굴닌자', '루카리오', '푸린', '잠만보', '이브이', '뮤츠'];
// 진우가 끝까지 본 영상 셋 — 앱에서는 진행률로 판단해 넘긴다
const opts = { content, names: NAMES, worlds: { pokemon: [], toystory: [], minions: [], moana: [] } };
/** 문장에서 세계를 알아본다 (표시용) */
function worldOf(q) {
  const hints = {
    toystory: /보니|제시|버즈|우디|불즈아이|포키|돌리|렉스|블레이즈|릴리패드|대포딜|지미 딘|결혼식|터틀 태그|장난감|슬립오버|카우걸|사료/,
    minions: /제임스|헨리|에드|딕|맥스|도르트|구미|하워드|필립스|아이린|바나나|미니언|필름|머핀|팝콘|괴물/,
    moana: /모아나|마우이|헤이헤이|푸아|탈라|투이|코코넛|모투누이|카누|카카모라|테 카|테 피티|낚싯바늘|타마토아|노를/,
  };
  for (const [w, rx] of Object.entries(hints)) if (rx.test(q.q)) return w;
  return 'pokemon';
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** 글자 속 분수를 세로 분수로: "2 3/8" → 2 와 3 위 8 아래, "5/6" → 5 위 6 아래 */
function rich(s) {
  let h = esc(s);
  h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  h = h.replace(/(?<![\d/])(\d+) (\d+)\/(\d+)(?![\d/])/g, '<span class="mx"><span class="w">$1</span><span class="fr"><span class="n">$2</span><span class="d">$3</span></span></span>');
  h = h.replace(/(?<![\d/])(\d+)\/(\d+)(?![\d/])/g, '<span class="fr"><span class="n">$1</span><span class="d">$2</span></span>');
  return h;
}
/** 문단 안 어디에 있든 [bar 7/8] 지시문은 그림으로, 나머지는 글로 (분수 세로 변환이 지시문을 건드리지 않게 먼저 가른다) */
function richWithFigs(p) {
  return String(p).split(/(\[[a-z]+ [^\]]+\])/g).map((seg) => (/^\[[a-z]+ [^\]]+\]$/.test(seg) ? `<span class="fig">${renderFigures(seg)}</span>` : rich(seg))).join('');
}
const paras = (s) => String(s).split(/\n\n+/).map((p) => (/^\[[a-z]+ [^\]]+\]$/.test(p.trim()) ? `<div class="fig">${renderFigures(p.trim())}</div>` : `<p>${richWithFigs(p)}</p>`)).join('');

function choicesHtml(chs) {
  return `<ol class="ch">${chs.map((c) => `<li class="${c.ok ? 'ok' : 'no'}"><span class="mark">${c.ok ? '✔' : ''}</span><span class="txt">${rich(c.text)}</span>${c.tag ? `<span class="tag">${esc(c.tag)}</span>` : ''}</li>`).join('')}</ol>`;
}

/** 📖 풀이 — 틀린 직후 아이가 보는 카드와 같은 내용 (2차: ③⭐도 사람이 쓴 풀이가 붙는다) */
function solveHtml(ref, q) {
  const s = q.solve;
  if (!s) return '';
  const whys = q.choices.filter((c) => !c.ok).map((c) => {
    const w = s.why[c.tag] || s.whyAny;
    return w ? `<li><span class="tagname">${esc(c.tag || '')}</span> ${rich(w)}</li>` : '';
  }).join('');
  return `<details class="solve" id="${esc(ref)}-📖">
    <summary>📖 풀이 <code>${esc(ref)}-📖</code></summary>
    ${s.whyAny && !s.steps.length ? `<p class="why">${rich(s.whyAny)}</p>` : ''}
    ${s.steps.length ? `<ol class="steps">${s.steps.map((st) => `<li>${rich(st)}</li>`).join('')}</ol>` : ''}
    ${s.figure ? `<div class="fig">${s.figure}</div>` : ''}
    ${whys ? `<div class="whys-h">오답을 고르면</div><ul class="whys">${whys}</ul>` : ''}
    ${s.rule ? `<p class="rule">💡 ${rich(s.rule)}</p>` : ''}
  </details>`;
}

function qHtml(ref, q, label) {
  const w = q.world || worldOf(q);
  return `<article class="q w-${w}" id="${esc(ref)}">
    <div class="ref"><span class="lbl">${esc(label)}</span><span class="world">${esc(WORLDS[w].label)}</span><code>${esc(ref)}</code></div>
    <p class="qt">${rich(q.q)}</p>
    ${q.figure ? `<div class="fig">${q.figure}</div>` : ''}
    ${q.expr ? `<p class="expr">${rich(q.expr)}</p>` : ''}
    ${choicesHtml(q.choices)}
    ${solveHtml(ref, q)}
  </article>`;
}

const letter = 'A'; // 분수 줄기 = A
const sections = FRACTION.map((c, i) => {
  const no = i + 1;
  const v = content[c.id] || {};
  const st = conceptStory(c.id, 11 + i, opts);
  const whys = (v.why || []).map((w, k) => {
    // 그 문항 하나만 든 content로 만들면 그 문항이 나온다 (이름 끼우기·풀이는 앱과 같은 코드로)
    const q = makeQuestion(c.id, 'why', 700 + i * 100 + k, { ...opts, content: { [c.id]: { why: [w] } } });
    // 검수용이라 정답을 첫 줄에 고정해 둔다 (앱에서는 섞인다)
    q.choices = [...q.choices.filter((x) => x.ok), ...q.choices.filter((x) => !x.ok)];
    return qHtml(`${letter}${no}-③${k + 1}`, q, '③ 왜 그런가');
  }).join('');
  const specials = (v.special || []).map((s, k) => {
    const q = makeQuestion(c.id, 'special', 1000 + i * 100 + k, { ...opts, content: { [c.id]: { special: [s] } } });
    q.world = s.world || 'pokemon';
    return qHtml(`${letter}${no}-⭐${k + 1}`, q, '⭐ 특별 문제');
  }).join('');
  // 표본: 포켓몬 + 영상 세계 하나씩 보이게 씨앗을 고른다 (실제 앱은 70/30 확률)
  const sample = (kind, want, base) => { for (let s = base; s < base + 400; s++) { const q = makeQuestion(c.id, kind, s, opts); if (worldOf(q) === want) return q; } return makeQuestion(c.id, kind, base, opts); };
  const gen = [['pokemon', 1], ['toystory', 2], ['minions', 3], ['moana', 4]].map(([w, k]) => qHtml(`${letter}${no}-①${k}`, sample('calc', w, 300 + i * 17 + k * 5), '① 계산 (코드 생성 표본)')).join('')
    + [['pokemon', 1], ['toystory', 2]].map(([w, k]) => qHtml(`${letter}${no}-②${k}`, sample('misread', w, 500 + i * 13 + k * 7), '② 오개념 (코드 생성 표본)')).join('');

  return `<section class="concept" id="${letter}${no}">
    <header class="ch-head">
      <div class="ch-no">${letter}${no}</div>
      <div>
        <div class="grade">초${c.grade}</div>
        <h2>${esc(c.name)}</h2>
        <p class="idea">${rich(c.idea)}</p>
      </div>
    </header>
    <div class="story" id="${letter}${no}-📖">
      <div class="ref"><span class="lbl">📖 개념 이야기</span><code>${letter}${no}-📖</code></div>
      <h3>${esc(st.title)}</h3>
      ${paras(st.text)}
    </div>
    <div class="cols">
      <div class="col"><h4>③ 왜 그런가 <small>${(v.why || []).length}개 · 제가 씀</small></h4>${whys}</div>
      <div class="col"><h4>⭐ 특별 문제 <small>${(v.special || []).length}개 · 제가 씀</small></h4>${specials}</div>
      <div class="col"><h4>①② 코드가 만드는 문제 <small>표본 6개 · 숫자·세계는 매번 바뀜</small></h4>${gen}</div>
    </div>
  </section>`;
}).join('\n');

const totals = {
  story: FRACTION.filter((c) => content[c.id] && content[c.id].story).length,
  why: FRACTION.reduce((a, c) => a + ((content[c.id] || {}).why || []).length, 0),
  special: FRACTION.reduce((a, c) => a + ((content[c.id] || {}).special || []).length, 0),
};

const nav = FRACTION.map((c, i) => `<a href="#${letter}${i + 1}"><b>${letter}${i + 1}</b> ${esc(c.name)}</a>`).join('');

const html = `<title>분수 줄기 검수</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gowun+Dodum&family=Noto+Sans+KR:wght@400;500;700&display=swap">
<style>
:root{
  --bg:#f5f7ff; --card:#ffffff; --ink:#1f2340; --muted:#6b7280; --line:#e3e6f3;
  --primary:#4f46e5; --primary-soft:#eef2ff; --accent:#f59e0b; --accent-soft:#fff7ed;
  --ok:#0f9f6e; --ok-soft:#ecfdf5; --no-soft:#f8f9fc; --tag:#b45309;
  --story:#fffbeb; --story-line:#fcd34d;
}
@media (prefers-color-scheme:dark){ :root:not([data-theme="light"]){
  --bg:#14162a; --card:#1d2040; --ink:#e8e9f5; --muted:#a0a6c2; --line:#2e3258;
  --primary:#9b9cf8; --primary-soft:#262a55; --accent:#fbbf24; --accent-soft:#3a2f14;
  --ok:#34d399; --ok-soft:#153a2d; --no-soft:#22254a; --tag:#fcd34d;
  --story:#2c2a1b; --story-line:#a16207;
}}
:root[data-theme="dark"]{
  --bg:#14162a; --card:#1d2040; --ink:#e8e9f5; --muted:#a0a6c2; --line:#2e3258;
  --primary:#9b9cf8; --primary-soft:#262a55; --accent:#fbbf24; --accent-soft:#3a2f14;
  --ok:#34d399; --ok-soft:#153a2d; --no-soft:#22254a; --tag:#fcd34d;
  --story:#2c2a1b; --story-line:#a16207;
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
.intro h3{font-size:1rem;margin-bottom:6px}
.intro p{margin:4px 0;font-size:.92rem}
.intro .stats{display:flex;flex-wrap:wrap;gap:8px 18px;font-size:.92rem}
.intro .stats b{font-size:1.25rem;color:var(--primary);font-variant-numeric:tabular-nums}
.cast{display:flex;flex-wrap:wrap;gap:6px}
.cast span{background:var(--primary-soft);color:var(--primary);border-radius:999px;padding:2px 10px;font-size:.85rem;font-weight:500}
.concept{margin-block:36px 0;scroll-margin-top:110px}
.ch-head{display:flex;gap:14px;align-items:flex-start;margin-bottom:12px}
.ch-no{font-family:"Gowun Dodum",sans-serif;font-size:1.6rem;font-weight:700;color:var(--primary);background:var(--primary-soft);border-radius:12px;min-width:56px;height:56px;display:grid;place-items:center}
.grade{font-size:.75rem;letter-spacing:.06em;color:var(--muted);text-transform:uppercase}
.ch-head h2{font-size:1.4rem}
.idea{color:var(--muted);margin:2px 0 0;font-size:.95rem;max-width:65ch}
.story{background:var(--story);border:1px solid var(--story-line);border-radius:14px;padding:14px 18px;margin-bottom:14px;max-width:72ch}
.story h3{font-size:1.15rem;margin:4px 0 8px}
.story p{margin:0 0 10px}
.story p:last-child{margin-bottom:0}
.cols{display:grid;grid-template-columns:1fr;gap:14px}
@media(min-width:900px){.cols{grid-template-columns:1fr 1fr 1fr}}
.col h4{margin:0 0 8px;font-size:.95rem;color:var(--ink)}
.col h4 small{color:var(--muted);font-weight:400;margin-left:6px}
.q{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin-bottom:10px;scroll-margin-top:110px}
.ref{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px}
.ref .lbl{font-size:.75rem;color:var(--muted);letter-spacing:.03em}
.ref code{font-size:.78rem;color:var(--primary);background:var(--primary-soft);border-radius:6px;padding:1px 7px;margin-left:6px}
.qt{margin:0 0 6px;font-weight:500}
.expr{margin:4px 0 8px;font-size:1.25rem;font-weight:700;letter-spacing:.02em;font-variant-numeric:tabular-nums}
.ch{list-style:none;margin:0;padding:0;display:grid;gap:5px}
.ch li{display:flex;align-items:center;gap:8px;border-radius:9px;padding:6px 10px;background:var(--no-soft);border:1px solid transparent}
.ch li.ok{background:var(--ok-soft);border-color:var(--ok)}
.ch .mark{width:16px;color:var(--ok);font-weight:700;flex:0 0 16px}
.ch .txt{flex:1}
.ch .tag{font-size:.74rem;color:var(--tag);background:var(--accent-soft);border-radius:999px;padding:1px 8px;white-space:nowrap}
body.hide-ans .ch li.ok{background:var(--no-soft);border-color:transparent}
body.hide-ans .ch .mark,body.hide-ans .ch .tag{visibility:hidden}
.fig{margin:6px 0 8px;color:var(--ink);--frac-fill:var(--primary);--frac-fill2:var(--accent);--frac-empty:var(--no-soft)}
.fig svg{max-width:100%;height:auto;display:block}
.world{font-size:.72rem;color:var(--muted);background:var(--no-soft);border-radius:999px;padding:1px 8px;margin-left:auto}
.q.w-toystory .world{color:#1d4ed8;background:#dbeafe}.q.w-minions .world{color:#a16207;background:#fef3c7}.q.w-moana .world{color:#0e7490;background:#cffafe}
.fr{display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;line-height:1.05;margin:0 2px;font-variant-numeric:tabular-nums}
.fr .n{border-bottom:1.5px solid currentColor;padding:0 3px}
.fr .d{padding:0 3px}
.mx{display:inline-flex;align-items:center;gap:2px;vertical-align:middle}
.solve{margin-top:8px;border-top:1px dashed var(--line);padding-top:6px}
.solve summary{cursor:pointer;font-weight:700;font-size:.88rem;color:var(--primary)}
.solve .why{margin:6px 0}
.solve .steps{margin:6px 0;padding-left:0;list-style:none;display:grid;gap:4px}
.solve .steps li{background:var(--no-soft);border-radius:8px;padding:5px 9px}
.solve .whys-h{font-size:.78rem;color:var(--muted);margin-top:8px}
.solve .whys{margin:4px 0;padding-left:0;list-style:none;display:grid;gap:4px;font-size:.9rem}
.solve .tagname{font-size:.74rem;color:var(--tag);background:var(--accent-soft);border-radius:999px;padding:1px 8px;margin-right:4px;white-space:nowrap}
.solve .rule{margin:8px 0 0;font-weight:700;background:var(--story);border:1px solid var(--story-line);border-radius:8px;padding:6px 10px}
body.hide-ans .solve{display:none}
.toggle{display:inline-flex;align-items:center;gap:8px;font-size:.9rem;cursor:pointer;user-select:none}
.toggle input{width:18px;height:18px;accent-color:var(--primary)}
.how li{margin:3px 0}
footer{margin-top:40px;color:var(--muted);font-size:.85rem;text-align:center}
@media (prefers-reduced-motion:no-preference){html{scroll-behavior:smooth}}
</style>
<div class="wrap">
  <div class="top">
    <h1>🔢 분수 줄기 — 내용 검수</h1>
    <p class="sub">신코치 수학 · 개념 10개 · 제가 쓴 글과 코드가 만드는 문제 + 📖 풀이(2차)를 이름 끼운 그대로</p>
    <div class="nav">${nav}</div>
  </div>

  <div class="intro">
    <div class="box">
      <h3>무엇을 봐 주시면 되나</h3>
      <div class="stats">
        <span><b>${totals.story}</b> 📖 개념 이야기</span>
        <span><b>${totals.why}</b> ③ 왜 그런가</span>
        <span><b>${totals.special}</b> ⭐ 특별 문제</span>
        <span><b>∞</b> ①② 코드 생성</span>
        <span><b>70:30</b> 포켓몬 : 본 영상</span>
      </div>
      <ul class="how">
        <li><b>📖 이야기</b> — 초4가 읽고 개념이 잡히는지, 포켓몬 이야기가 자연스러운지</li>
        <li><b>③ 왜 그런가</b> — 보기 넷 중 정답이 하나뿐인지, 오답이 너무 티 나지 않는지</li>
        <li><b>⭐ 특별 문제</b> — 진우가 좋아할 만한 상황인지 (계산은 기계가 검산했습니다)</li>
        <li><b>①②</b> — 코드가 숫자를 바꿔 무한히 내는 것의 표본. 문장 틀이 어색하면 알려 주세요</li>
        <li><b>📖 풀이</b> (2026-09-21 2차) — 문항마다 접혀 있어요. 틀린 직후 진우가 보는 카드와 같은 내용: 왜 그런가 · 이렇게 풀어요 · 오답을 고르면 한 마디 · 기억할 것. 번호는 <code>A6-⭐3-📖</code></li>
        <li><b>세계관</b> — 포켓몬 70%, 진우가 끝까지 본 영상(토이스토리5·미니언즈·모아나) 30%. 문제마다 오른쪽 위에 세계 표시</li>
        <li><b>그림</b> — 분수의 뜻·같은 분모·통분·가분수에는 막대·피자 그림이 붙습니다 (곱셈·나눗셈은 답을 흘려서 안 붙임)</li>
      </ul>
      <p>고칠 곳은 번호로 가리켜 주시면 됩니다 — 예) <code>A6-⭐2 문장이 길다</code>, <code>A3-③4 오답이 너무 쉽다</code></p>
      <label class="toggle"><input type="checkbox" id="ans" checked> 정답·오개념 이름 보이기 (끄면 진우가 보는 모양)</label>
    </div>
    <div class="box">
      <h3>예시 출연진</h3>
      <p>앱에서는 <b>진우가 도감에서 잡은 포켓몬</b>이 들어갑니다. 이 페이지는 예시로 이 여덟 마리를 썼습니다.</p>
      <div class="cast">${NAMES.map((n) => `<span>${esc(n)}</span>`).join('')}<span>진우</span></div>
      <p style="margin-top:10px">이브이 진화 8종·관동 배지 8개·잠만보처럼 <b>특정 포켓몬이 있어야 하는 문제는 고정</b>으로 썼습니다.</p>
      <p><b>오답 옆 갈색 이름표</b>는 그 오답을 고르면 기록되는 오개념입니다 — 📊에 "헷갈리는 개념"으로 쌓입니다.</p>
    </div>
  </div>

  ${sections}

  <footer>신코치 🔢 수학 · 분수 줄기 1차 · ${new Date().toISOString().slice(0, 10)}</footer>
</div>
<script>
(function(){
  var cb=document.getElementById('ans');
  function apply(){document.body.classList.toggle('hide-ans',!cb.checked);}
  cb.addEventListener('change',apply);
  try{var v=localStorage.getItem('frac-review-ans');if(v==='0'){cb.checked=false;}}catch(e){}
  cb.addEventListener('change',function(){try{localStorage.setItem('frac-review-ans',cb.checked?'1':'0');}catch(e){}});
  apply();
})();
</script>
`;
writeFileSync(out, html, 'utf8');
console.log(`검수 페이지: ${out} (${Math.round(html.length / 1024)}KB) — 이야기 ${totals.story} · 왜 ${totals.why} · 특별 ${totals.special}`);
