// v316 (2026-10-22 아버님 원고 검수 "이대로") — 📖 독서 논술: 진우가 ★를 받은 이야기 10편으로 만든 논술 주제(N33~N42)
// 주제 칸 card(이어진 국어 글)·intro(한 줄 소개)·편마다 ev(이유마다 근거 줄)·off = 글에 있지만 상관없는 말 + 글에 없는 지어낸 말(made) ·
// 논술 판에 📖 한 줄 소개·글 다시 보기 · 국어 그 글을 다 읽은 화면에 「🖊️ 이 글로 생각해 보기」(v353 — 기사문·토의 글도 생겨 「이야기로」에서 바꿈)
// node --test tests/reading316.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkNonsul, allTopics, readingTopicOf, dealTopic, nonsulRule, INTRO_MAX, REASONS } from '../js/nonsul.js';
import { dayNum } from '../js/korean.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const RAW = JSON.parse(read('coach/korean/nonsul.json'));
const LIST = allTopics(RAW);
const CARDS = new Map(JSON.parse(read('coach/korean/reading.json')).cards.map((c) => [c.id, c]));
const READ = LIST.filter((t) => t.card);
const lineText = (l) => (typeof l === 'string' ? l : (l && (l.t || l.text)) || '');

test('📖 원고 — 독서 논술 스물(v316 N33~N42 이야기 · v353 N63부터 셋째마다 — 기사문·생활문·토의 글도) · 근거 줄은 그 글 안 · 편마다 글에 근거가 있는 이유 하나 이상 · 지어낸 말은 글에 그대로 없다', () => {
  const V316 = Array.from({ length: 10 }, (_, i) => `N${33 + i}`);
  assert.deepEqual(READ.map((t) => t.id), [...V316, ...Array.from({ length: 10 }, (_, i) => `N${63 + 3 * i}`)]);
  assert.deepEqual(READ.map((t) => t.card), ['K68', 'K4', 'K66', 'K53', 'K31', 'K95', 'K71', 'K19', 'K33', 'K32', 'K124', 'K73', 'K1', 'K119', 'K76', 'K20', 'K92', 'K47', 'K61', 'K41']);
  assert.equal(new Set(READ.map((t) => t.card)).size, READ.length, '글마다 주제 하나');
  for (const t of READ) {
    const c = CARDS.get(t.card);
    assert.ok(c, `${t.id} 국어 글 ${t.card}`);
    // v316은 이야기 속 인물 · v353은 이야기가 모자라 기사문·생활문·토의·의견 글도(아버님 검수 「이대로」) — 시는 근거 줄로 이유를 세우기 어려워 뺀다
    if (V316.includes(t.id)) assert.match(c.genre, /이야기|동화|극본|소설/, `${t.id} 이야기 글`);
    else assert.doesNotMatch(c.genre, /시$|시조|동시|노래/, `${t.id} 시·노래는 아님`);
    assert.ok(t.intro.endsWith('요.') && [...t.intro].length <= INTRO_MAX);
    const n = c.lines.length;
    for (const side of ['yes', 'no']) {
      assert.equal(t[side].ev.length, REASONS);
      for (const ev of t[side].ev) for (const k of ev) assert.ok(k >= 1 && k <= n, `${t.id} ${side} 근거 줄 ${k}/${n}`);
      assert.ok(t[side].ev.some((e) => e.length), `${t.id} ${side} 글 근거`);
    }
    const made = t.off.filter((o) => o.made);
    const real = t.off.filter((o) => !o.made);
    assert.equal(made.length, 1);
    assert.equal(real.length, 1);
    for (const k of real[0].ev) assert.ok(k >= 1 && k <= n);
    const text = c.lines.map(lineText).join(' ');
    assert.ok(!text.includes(made[0].t.replace(/요\.$/, '')), `${t.id} 지어낸 말이 글에 그대로 있다`);
    assert.ok(made[0].why.startsWith('글에 없는 이야기예요'));
  }
  assert.ok(!READ.some((t) => t.card === 'K72'), '심청전은 뺐다(바다에 몸을 던지는 장면)');
});

test('📖 토의·두 의견 글 — 이유가 말한 사람을 대면 근거 줄은 그 사람의 말만 · 인물의 주장은 「누구는 …」으로 (🔍 Codex 158차 — N72·N81)', () => {
  const speaker = (l) => (/^([가-힣]{1,5})\s*:/.exec(lineText(l)) || [])[1];
  let named = 0;
  for (const t of READ) {
    const c = CARDS.get(t.card);
    const who = new Set(c.lines.map(speaker).filter(Boolean));
    for (const side of ['yes', 'no']) t[side].reasons.forEach((r, i) => {
      const name = [...who].find((n) => r.startsWith(`${n}는 `) || r.startsWith(`${n}이는 `));
      if (!name) return;
      named++;
      for (const k of t[side].ev[i]) assert.equal(speaker(c.lines[k - 1]), name, `${t.id} ${side}[${i}] ${name}의 말인데 근거 ${k}줄은 ${speaker(c.lines[k - 1])}`);
    });
  }
  assert.ok(named >= 9, `말한 사람을 댄 이유 ${named}`);
  // 이유마다 [말한 사람(없으면 null — 일어난 일·생각 이유), 근거 줄]
  const want = {
    N72: { yes: [['하윤', [3]], ['하윤', [4]], [null, []]], no: [['예준', [6]], [null, [7]], ['예준', [8]]] },
    N81: { yes: [['시우', [3]], ['시우', [5]], [null, []]], no: [['지안', [2]], ['지안', [4]], [null, []]] },
  };
  for (const [id, sides] of Object.entries(want)) {
    const t = READ.find((x) => x.id === id);
    for (const side of ['yes', 'no']) sides[side].forEach(([name, ev], i) => {
      const r = t[side].reasons[i];
      assert.deepEqual(t[side].ev[i], ev, `${id} ${side}[${i}] 근거 줄`);
      if (name) assert.ok(r.startsWith(`${name}는 `) || r.startsWith(`${name}이는 `), `${id} ${side}[${i}] 「${name}」의 말로: ${r}`);
    });
  }
  // 시우의 걱정(한 학기 내내)·예준이의 말(종이 울림)을 글 속 사실처럼 쓰던 문장
  const txt = JSON.stringify(READ);
  for (const s of ['번호대로 하면 힘든 구역을 한 학기 내내 맡을 수 있어요.', '쉬는 시간은 10분이라 게임을 끝내기 전에 종이 울려요.', '번호대로 하면 빨리 정할 수 있어요.']) assert.ok(!txt.includes(`"${s}"`), s);
  // N75 반대 둘째 이유는 생각 이유(같은 반환 규칙의 예였던 푸바오를 뺌)
  const n75 = READ.find((x) => x.id === 'N75');
  assert.deepEqual(n75.no.ev, [[9], [], [8]]);
  assert.ok(!n75.no.reasons.some((r) => r.includes('푸바오')));
});

test('📖 checkNonsul — 독서 논술 칸이 깨지면 잡는다 · card 없는 주제는 예전 그대로', () => {
  const good = JSON.parse(JSON.stringify(READ[0]));
  const check = (f) => { const t = JSON.parse(JSON.stringify(good)); f(t); return checkNonsul({ write: RAW.write, topics: [t] }); };
  assert.deepEqual(check(() => {}), []);
  for (const [name, f] of [
    ['card 꼴', (t) => { t.card = 'X1'; }],
    ['소개 끝말', (t) => { t.intro = '실내화 이야기'; }],
    ['소개 길이', (t) => { t.intro = `${'가'.repeat(INTRO_MAX)}요.`; }],
    ['ev 칸 수', (t) => { t.yes.ev = [[1], [2]]; }],
    ['ev 꼴', (t) => { t.no.ev = [[0], [], []]; }],
    ['글 근거 없는 편', (t) => { t.no.ev = [[], [], []]; }],
    ['지어낸 말 둘', (t) => { t.off[0].made = true; delete t.off[0].ev; }],
    ['글에 있는 말에 근거 줄 없음', (t) => { t.off[0].ev = []; }],
    ['지어낸 말에 근거 줄', (t) => { t.off[1].ev = [1]; }],
    ['지어낸 말 까닭', (t) => { t.off[1].why = '상관없어요.'; }],
  ]) assert.ok(check(f).length > 0, name);
  const plain = JSON.parse(JSON.stringify(LIST.find((t) => !t.card)));
  assert.deepEqual(checkNonsul({ write: RAW.write, topics: [plain] }), [], 'card 없는 주제는 ev·intro가 없어도 된다');
});

test('📖 readingTopicOf · 판 보기에 지어낸 말이 그대로 나오고 까닭이 따라온다 · 저장 규칙은 다른 주제와 같다(그날 첫 판 💰)', () => {
  assert.equal(readingTopicOf(LIST, 'K31').id, 'N37');
  assert.equal(readingTopicOf(LIST, 'K72'), null);
  assert.equal(readingTopicOf(null, 'K31'), null);
  const t = readingTopicOf(LIST, 'K31');
  let seed = 7;
  const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const madeT = t.off.find((o) => o.made).t;
  let seenMade = 0;
  for (let i = 0; i < 60; i++) {
    const d = dealTopic(t, i % 2 ? 'yes' : 'no', rng);
    const all = [...d.reasons, ...d.counter];
    const m = all.find((o) => o.t === madeT);
    assert.ok(m && m.k === 'off' && m.why.startsWith('글에 없는 이야기예요'), '지어낸 말은 판마다 ②나 ③에 한 번');
    seenMade++;
  }
  assert.equal(seenMade, 60);
  const NOW = new Date(2026, 9, 22, 20).getTime();
  const p = { nonsul: {}, nonsulDay: {}, coins: 0, coinsEarned: 0 };
  const r = nonsulRule(p, { id: 'N37', ok: true, from: 0 }, NOW, LIST.map((x) => x.id));
  assert.deepEqual([r.ok, r.first, r.coins, r.solved], [true, true, 10, true]);
  assert.equal(p.nonsulDay[dayNum(NOW)], 1);
});

test('📖 화면 잇기 — 논술 판에 한 줄 소개·글 다시 보기 · 주제를 정해 시작 · 국어 다 읽은 화면에 단추(⭐면 안 띄움 · ⏳ 국어 시간 안) · 셈 문구 없음', () => {
  const v = read('js/nonsulview.js');
  assert.ok(v.includes("if (r.t.card) card.appendChild(storyEl(r.t, r));"), '판 위에 📖');
  assert.ok(v.includes("det.appendChild(el('summary', '', '📖 글 다시 보기'));"));
  assert.ok(v.includes("box.appendChild(el('p', 'ns-story-intro', `📖 ${st ? `「${st.title}」 ` : ''}${t.intro}`));"), '글을 못 받아도 한 줄 소개는');
  // 들어올 때 국어 글을 받아 두되 기다리지 않는다 — 받으면 글이 안 붙은 독서 논술 판만 다시 그린다 (🔍 Codex 122차 #2)
  const enter = v.slice(v.indexOf('export async function enterNonsul()'), v.indexOf('export async function readingTopicFor('));
  assert.ok(enter.includes('loadStories().then(() => {') && !enter.includes('await loadStories()'), '첫 화면은 국어 글을 기다리지 않는다');
  assert.ok(enter.includes("if (r && r.t.card && S.stories && S.stories.has(r.t.card) && nonsulVisible() && m && !m.querySelector('.ns-story-text')) renderRound();"));
  // 🔍 Codex 122차 #1 — 민서의 의심을 글 속 사실처럼 쓰지 않는다 · N39 근거 줄 ⑪⑫
  const n33 = READ.find((t) => t.id === 'N33');
  assert.ok(n33.yes.reasons.includes('민서는 태오가 신발장 앞에서 장난쳤다고 생각했어요.') && !JSON.stringify(n33).includes('태오가 쉬는 시간에 신발장 앞에서 장난쳤어요.'));
  assert.deepEqual(READ.find((t) => t.id === 'N39').yes.ev[1], [9, 10, 11, 12]);
  assert.ok(v.includes("const id = want || planTopic(S.list, nonsulMap(), Date.now(), practice);"), '주제를 정해 시작');
  assert.ok(v.includes('return isSolved(nonsulMap()[t.id]) ? null : { id: t.id, icon: t.icon, q: t.q };'), '⭐ 주제는 단추를 안 띄운다');
  const k = read('js/koreanview.js');
  assert.ok(k.includes('if (res.ok) box.appendChild(storyNonsulEl(r.card.id));'), '저장이 된 다 읽은 화면에만');
  assert.ok(k.includes("b.addEventListener('click', () => guardStart('korean', () => { if (ns.openTopic(t.id)) ui.showView('nonsul'); }));"), '⏳ 국어 시간 안에서 논술 화면으로');
  assert.ok(k.includes('ui.showView = showView;'));
  const fn = k.slice(k.indexOf('function storyNonsulEl('), k.indexOf('// ───', k.indexOf('function storyNonsulEl(')));
  assert.ok(!/\d+\s*\/\s*\d+|남은|개 중/.test(fn), '아이 화면에 셈 문구 없음');
  assert.ok(fn.includes("'🖊️ 이 글로 생각해 보기'") && !fn.includes('이 이야기로'), 'v353: 기사문·토의 글도 있어 「이 글로」');
  const css = read('css/style.css');
  assert.ok(css.includes('.kor-ns-link:empty { display: none; }'), '주제가 없으면 빈 자리를 안 남긴다');
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(read('sw.js')) || [])[1]) >= 316, 'sw v316 이상 (판을 못 박으면 다음 판에서 깨진다)');
});
