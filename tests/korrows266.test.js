// 📄 예전 대화·토의 글도 문장마다 줄 v266 (2026-10-16, 아버님 "이것도 하자"):
//  · 신문 글(v265)처럼 줄이 나뉘어야 읽기 쉬운 예전 글 — K15·K23 토의(사회자·친구들의 "이름: 말") · K48 독서 모임 기록(친구들의 말이 따옴표 줄로)
//  · 🎧 듣기 카드는 layout을 못 쓰지만(글이 처음엔 안 보인다), 말하는 사람이 있는 대화·토의(K36·K39)를 📄 글로 읽고 풀 때는 사람마다 줄 — rowsLayout
//  · 원고 검사: 대사 꼴(이름: 말) 줄이 둘 이상인 읽는 글은 layout rows여야 한다(새 글이 이어 쓴 문단으로 들어오지 않게)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkCard, checkContent, isListen, rowsLayout } from '../js/korean.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const DATA = JSON.parse(read('coach/korean/reading.json'));
const card = (id) => DATA.cards.find((c) => c.id === id);
const SPEAKER = /^[가-힣]{1,6}: /;

test('📄 문장마다 줄 (v266): 토의 둘·독서 모임 기록은 layout rows · 🎧 말하는 사람이 있는 듣기 카드는 글로 읽을 때 rows · 나머지는 그대로', () => {
  assert.deepEqual(checkContent(DATA), []);
  for (const id of ['K15', 'K23', 'K48']) assert.equal(card(id).layout, 'rows', id);
  assert.deepEqual(['K15', 'K23', 'K48', 'K61', 'K68', 'K73'].map((id) => rowsLayout(card(id))), [true, true, true, true, true, true]);
  // 🎧 — who가 있는 대화·토의만 (안내 방송·발표·음성 메시지·이야기는 문단 그대로)
  const listens = DATA.cards.filter(isListen);
  assert.deepEqual(listens.filter(rowsLayout).map((c) => c.id), ['K36', 'K39']);
  assert.deepEqual(listens.filter((c) => !rowsLayout(c)).map((c) => c.id), ['K37', 'K38', 'K40', 'K41']);
  for (const c of listens) assert.ok(!Object.hasOwn(c, 'layout'), `${c.id} 듣기 카드에는 layout 칸이 없다`);
  // 이어 쓴 문단 그대로인 글 — 이야기·설명·생활문(따옴표 대화가 섞여도 한 사람이 쓴 글)
  for (const id of ['K1', 'K2', 'K45', 'K47', 'K13', 'K43', 'K78']) assert.equal(rowsLayout(card(id)), false, id);
  assert.equal(rowsLayout(null), false);
  assert.equal(rowsLayout({ listen: {} }), false);
  assert.equal(rowsLayout({ listen: { who: [] } }), false);
});

test('📄 원고 검사 (v266): 대사 꼴(이름: 말) 줄이 둘 이상인 읽는 글은 layout rows — 빠지면 잡는다 · 한 줄만이면 괜찮다 · 듣기 카드는 rowsLayout이 맡는다', () => {
  // 지금 원고에서 대사 꼴 읽는 글은 모두 rows
  const talk = DATA.cards.filter((c) => !isListen(c) && Array.isArray(c.lines) && c.lines.filter((t) => SPEAKER.test(t)).length >= 2);
  assert.deepEqual(talk.map((c) => [c.id, c.layout]), [['K15', 'rows'], ['K23', 'rows'], ['K68', 'rows'], ['K81', 'rows'], ['K83', 'rows'], ['K85', 'rows'], ['K86', 'rows'], ['K92', 'rows'], ['K99', 'rows'], ['K107', 'rows'], ['K111', 'rows'], ['K114', 'rows'], ['K119', 'rows'], ['K126', 'rows'], ['K131', 'rows'], ['K137', 'rows'], ['K138', 'rows']]); // v322 독서 대화·전화 대화·단체 대화 · v267 모둠 대화·독서 대화 · v281 독서 대화·문자 대화·토의 · v282 토의 · v298 두 친구의 글·학급 회의·댓글
  const bad = (id, fix) => { const c = JSON.parse(JSON.stringify(card(id))); fix(c); return checkCard(c).join(' '); };
  assert.equal(bad('K15', () => {}), '');
  assert.match(bad('K15', (c) => { delete c.layout; }), /대사 꼴\(이름: 말\) 줄이 있는 글은 layout rows로/);
  assert.match(bad('K68', (c) => { delete c.layout; }), /대사 꼴\(이름: 말\) 줄이 있는 글은 layout rows로/);
  // 대사 꼴이 한 줄뿐이면 문단이어도 괜찮다
  assert.equal(bad('K1', (c) => { c.lines[0] = `엄마: ${c.lines[0]}`; }), '');
  assert.match(bad('K1', (c) => { c.lines[0] = `엄마: ${c.lines[0]}`; c.lines[1] = `나: ${c.lines[1]}`; }), /대사 꼴/);
  // 듣기 카드는 layout 없이도 통과(글로 읽을 때 rowsLayout) · layout을 넣으면 그대로 막는다
  assert.equal(checkCard(card('K36')).join(' '), '');
  assert.match(bad('K36', (c) => { c.layout = 'rows'; }), /듣기 카드에는 layout가 없어요/);
});

test('📄 화면 (v266): 글 상자는 rowsLayout으로 is-rows — 🎧 글로 읽고 풀 때도 같은 글 상자 · sw v266', () => {
  const view = read('js/koreanview.js');
  assert.match(view, /import \{[^}]*\browsLayout\b[^}]*\} from '\.\/korean\.js';/);
  assert.match(view, /function proseEl\(card\) \{\n {2}const prose = el\('p', rowsLayout\(card\) \? 'kor-prose is-rows' : 'kor-prose'\);/);
  assert.ok(!/card\.layout === 'rows'/.test(view), '글 꼴은 rowsLayout 한 곳에서만 정한다');
  assert.match(read('css/style.css'), /\.kor-prose\.is-rows \.kor-sent \{ display: block;/);
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(read('sw.js')) || [])[1]) >= 266, 'sw는 v266 이상(원고·코드가 앱 셸)');
});
