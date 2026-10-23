// 🏠 과목 카드 색 (v323, 2026-10-23 진우 「영어·수학은 테두리 색이 있는데 국어는 왜 없어? 초록색으로 해 줘」) — node --test tests/homecolor323.test.js
//  카드 색을 차례(nth-child 1·2)로 달아서 셋째·넷째 카드(국어·논술)는 테두리가 투명했다 → 과목 키(is-키)로 단다
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SUBJECTS } from '../js/home.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const css = read('css/style.css');
const rule = (key) => (new RegExp(`\\.home-card\\.is-${key} \\.home-card-btn \\{([^}]*)\\}`).exec(css) || [])[1] || '';

test('🎨 과목마다 테두리 색 — 모든 과목 카드에 색이 있고 서로 다르다 · 국어는 초록', () => {
  const colors = SUBJECTS.map((s) => {
    const r = rule(s.key);
    const c = (/border-color: (#[0-9a-f]{6})/.exec(r) || [])[1];
    assert.ok(c, `${s.key} 카드에 테두리 색`);
    assert.match(r, /background: linear-gradient/, `${s.key} 카드 위쪽이 옅은 같은 색`);
    return c;
  });
  assert.equal(new Set(colors).size, SUBJECTS.length, '과목마다 다른 색');
  assert.equal((/border-color: (#[0-9a-f]{6})/.exec(rule('korean')) || [])[1], '#86efac', '국어는 초록');
  // 영어·수학은 원래 색 그대로
  assert.equal((/border-color: (#[0-9a-f]{6})/.exec(rule('english')) || [])[1], '#a5b4fc');
  assert.equal((/border-color: (#[0-9a-f]{6})/.exec(rule('math')) || [])[1], '#fcd34d');
});

test('🎨 색은 차례가 아니라 과목 키로 — 카드에 is-키 · 차례(nth-child) 색 줄은 없다 · ✨ 반짝임은 과목 색보다 뒤에 있어 이긴다', () => {
  const home = read('js/home.js');
  assert.ok(home.includes("li.className = `home-card is-${subject.key}` + (subject.ready ? '' : ' soon');"));
  assert.ok(!/\.home-card:nth-child\(\d\) \.home-card-btn/.test(css), '차례로 단 색 없음');
  const last = Math.max(...SUBJECTS.map((s) => css.indexOf(`.home-card.is-${s.key} .home-card-btn {`)));
  assert.ok(last > 0 && css.indexOf('.home-card.sparkle .home-card-btn {') > last, '✨ 오늘의 보너스 테두리가 수학 색을 덮는다');
});
