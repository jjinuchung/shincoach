// 🎯 볼 확인 (2026-10-05) 테스트: node --test tests/ballconfirm.test.js
//
// 아버님: "황금볼 안 썼는데 썼다고 하더라 — 일반볼 눌렀는데. 볼을 정말 쓰는지 아이에게 확인받자" → 기본값 5개 "이대로 진행".
// 까닭: 볼을 고르는 것과 던지는 것은 맞았지만, 던질 때 말은 늘 "몬스터볼, 가라!"·날아가는 볼은 늘 빨간 몬스터볼·결과에 쓴 볼이 없어
//       🌟을 한 번 눌러 둔 채 포켓몬을 누르면 아이는 몬스터볼을 던진 줄 알았다.
//  ① 써서 없어지는 볼(🔵🟡🌟🟣⚪🌕)이면 포켓몬을 눌러도 바로 안 던지고 확인 칸: [그 볼 던지기] [🔴 몬스터볼로 던지기] [↩ 다시 고르기]
//  ② 🔴 몬스터볼(공짜)·⚙ 잡기 연습은 묻지 않는다 ③ 던질 때 말·볼 그림이 실제 볼 ④ 결과에 "🌟 황금 몬스터볼을 썼어요 (남은 N개)"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BALLS, POKEBALL, GOLDEN, TRUE_GOLD } from '../js/items.js';
import { needsConfirm, confirmText, usedBallText } from '../js/catch.js';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const byId = (id) => BALLS.find((b) => b.id === id);

test('🎯 묻는 볼: 써서 없어지는 볼은 모두 · 🔴 몬스터볼(공짜)과 ⚙ 연습은 안 묻는다', () => {
  assert.equal(needsConfirm('pokeball', false), false, '공짜');
  for (const id of ['greatball', 'ultraball', 'goldenball', 'masterball', 'beastball', 'truegold']) {
    assert.ok(byId(id), `${id}가 볼 줄에 있다`);
    assert.equal(needsConfirm(id, false), true, id);
    assert.equal(needsConfirm(id, true), false, `${id} 연습은 볼이 안 줄어서`);
  }
  for (const b of BALLS) assert.equal(needsConfirm(b.id, false), !b.free, `볼 줄의 모든 볼: ${b.id}`);
  assert.equal(needsConfirm('nope', false), false);
  assert.equal(needsConfirm(undefined, false), false);
});

test('🎯 확인 칸의 말 — 무슨 볼을 누구에게, 가방이 몇 개에서 몇 개로 · 🌕는 세상에 하나뿐 · 조사', () => {
  assert.deepEqual(confirmText(GOLDEN, '피카츄', 2), { q: '🌟 황금 몬스터볼을 피카츄에게 던질까요?', sub: '가방 2개 → 1개', go: '🌟 황금 몬스터볼 던지기' });
  assert.equal(confirmText(byId('greatball'), '이브이', 1).q, '🔵 슈퍼볼을 이브이에게 던질까요?');
  assert.equal(confirmText(byId('greatball'), '이브이', 1).sub, '가방 1개 → 0개');
  assert.equal(confirmText(byId('greatball'), '이브이', 0).sub, '가방 0개 → 0개', '음수로 안 내려간다');
  assert.equal(confirmText(TRUE_GOLD, '뮤츠', 1).sub, '세상에 하나뿐 — 던지면 다시 세상 어딘가로 떠나요');
  // 볼 이름은 모두 받침이 있다(볼) — "을"
  for (const b of BALLS.filter((x) => !x.free)) assert.match(confirmText(b, '구구', 1).q, new RegExp(`^${b.emoji} ${b.ko}을 구구에게 던질까요\\?$`), b.id);
});

test('🎯 결과 한 줄 — 쓴 볼과 남은 수 · 공짜 몬스터볼·🌕(따로 말한다)·연습은 없음', () => {
  assert.equal(usedBallText('goldenball', 1, false), '🌟 황금 몬스터볼을 썼어요 (남은 1개)');
  assert.equal(usedBallText('ultraball', 0, false), '🟡 하이퍼볼을 썼어요 (남은 0개)');
  assert.equal(usedBallText('pokeball', 0, false), '');
  assert.equal(usedBallText('truegold', 0, false), '', '🌕는 "다시 세상 어딘가로" 줄이 따로 있다');
  assert.equal(usedBallText('goldenball', 1, true), '', '연습은 볼이 안 줄어서');
  assert.equal(usedBallText(undefined, 0, false), '');
});

test('🎯 날아가는 볼 그림 — 써서 없어지는 볼마다 색이 다르다 (예전엔 늘 빨간 몬스터볼)', () => {
  const css = src('css/style.css');
  for (const b of BALLS.filter((x) => !x.free)) assert.match(css, new RegExp(`\\.catch-ball\\[data-ball="${b.id}"\\] \\{ background:`), b.id);
  assert.match(css, /\.catch-confirm\[hidden\] \{ display: none; \}/, '확인 칸은 hidden이면 안 보인다');
});

test('🔌 화면 연결 — 포켓몬을 누르면 묻고 · 확인하는 동안 다른 것을 못 누른다 · 세 버튼 · 말·볼 그림·결과는 실제 볼 · 열고 닫을 때 내린다', () => {
  const c = src('js/catch.js');
  assert.match(c, /btn\.addEventListener\('click', \(\) => \{ unlock\(\); askThrow\(c\); \}\);/, '후보를 누르면 askThrow');
  assert.ok(!/unlock\(\); throwBall\(c\); \}\);/.test(c), '후보가 바로 던지는 길이 남지 않았다');
  const i0 = c.indexOf('function askThrow(c) {'), i1 = c.indexOf('function closeConfirm(refresh) {');
  assert.ok(i0 > 0 && i1 > i0, 'askThrow 다음에 closeConfirm — 자르는 자리가 없으면 파일 끝까지 읽어 엉뚱한 줄에 속는다 (변이 검사가 잡음)');
  const a = c.slice(i0, i1);
  assert.match(a, /if \(!needsConfirm\(ui\.ball, ui\.practice\)\) \{ throwBall\(c\); return; \}/, '공짜·연습은 바로');
  assert.match(a, /\n {2}\$\('catch-pick'\)\.hidden = true;[^\n]*\n {2}\$\('catch-golden'\)\.hidden = true;/, '묻는 동안 후보·볼 줄을 숨긴다 (줄 첫머리부터 — 주석 속 글자에 속지 않게)');
  assert.match(a, /if \(!ui\.open \|\| ui\.threw \|\| \$\('catch-pick'\)\.hidden\) return;/, '숨은 동안 다시 눌러도 또 묻지 않는다');
  assert.match(a, /btn\('btn-primary cc-go', t\.go, \(\) => \{ if \(!closeConfirm\(false\)\) return; throwBall\(c\); \}\);/, '그 볼로 던지기 — 볼 줄을 다시 읽지 않는다 (없어졌으면 throwBall이 말한다)');
  assert.match(a, /btn\('cc-free', `\$\{POKEBALL\.emoji\} \$\{POKEBALL\.ko\}로 던지기`, \(\) => \{ if \(!closeConfirm\(false\)\) return; pickBall\(POKEBALL\); throwBall\(c\); \}\);/, '몬스터볼로 바꿔 던지기');
  assert.match(a, /btn\('cc-back', '↩ 다시 고르기', \(\) => \{ if \(!closeConfirm\(true\)\) return;/, '다시 고르기는 볼 줄을 다시 읽는다');
  assert.match(c, /if \(!ui\.open \|\| ui\.threw \|\| !a\) return false;/, '닫혔거나 던졌으면 아무것도');
  const t = c.slice(c.indexOf('async function throwBall('));
  assert.ok(!t.includes('나타났다! 몬스터볼, 가라!'), '늘 "몬스터볼, 가라!"가 아니다');
  assert.match(t, /나타났다! \$\{thrown\.emoji\} \$\{thrown\.ko\}, 가라!/);
  assert.match(t, /const thrown = picked \|\| POKEBALL;[\s\S]*ball\.dataset\.ball = thrown\.id;/, '날아가는 볼 그림');
  assert.match(t, /const usedLine = usedBallText\(res\.ball, \(inventory\(\)\[res\.ball\] \|\| 0\), ui\.practice\);/, '결과는 판정이 실제로 쓴 볼(res.ball)로');
  assert.equal((c.match(/if \(cc\) \{ cc\.hidden = true; cc\.innerHTML = ''; \}/g) || []).length, 3, '열 때·닫을 때·확인을 내릴 때');
  assert.match(src('index.html'), /<div id="catch-confirm" class="catch-confirm" hidden><\/div>/);
  // 확인하는 동안은 볼 줄을 다시 그리지 않는다 — refreshBalls가 후보가 숨어 있으면 멈춘다
  assert.match(c, /function refreshBalls\(sel, bought\) \{\s*if \(!ui\.open \|\| \$\('catch-pick'\)\.hidden\) return;/);
});
