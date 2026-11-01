// 🚀 로켓단 등장 건너뛰기 (v379 — 진우 「처음 등장 대사가 너무 길어 늘 기다려야 해」 → 아버님 「skip 기능」) — node --test tests/rocketskip379.test.js
// 기다림 묶음(makeIntro)은 진짜 시계로 · 화면 배선은 소스로(DOM은 node에서 못 돌린다 — 화면은 헤드리스로)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeIntro, MOTTO } from '../js/rocketview.js';

const view = readFileSync(new URL('../js/rocketview.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const now = () => performance.now();

test('⏱️ 기다림 — 건너뛰지 않으면 그만큼 · 기다리는 중에 건너뛰면 그 자리에서 · 건너뛴 뒤엔 바로 · 두 번 눌러도 한 번', async () => {
  const a = makeIntro();
  let t = now();
  await a.nap(120);
  assert.ok(now() - t >= 100, '그대로 기다림');
  assert.equal(a.skipped(), false);
  const b = makeIntro();
  t = now();
  const p1 = b.nap(5000);
  const p2 = b.nap(9000); // 겹친 기다림도 함께 깨움
  setTimeout(() => b.skip(), 30);
  await Promise.all([p1, p2]);
  assert.ok(now() - t < 1000, `건너뛰면 바로 (${Math.round(now() - t)}ms)`);
  assert.equal(b.skipped(), true);
  t = now();
  await b.nap(5000);
  assert.ok(now() - t < 50, '건너뛴 뒤의 기다림은 0');
  b.skip();
  assert.equal(b.skipped(), true);
  assert.equal(makeIntro().skipped(), false, '판마다 새로');
});

test('🔘 화면 배선 — 등장 동안 「⏭ 건너뛰기」 단추 · 하늘을 눌러도 같은 일 · 경보·구호·노리는 대사 기다림 모두 건너뛸 수 있는 기다림 · 문제 전에 묶음을 치움', () => {
  const at = view.indexOf('export async function openRocket(');
  const fn = view.slice(at);
  const k = fn.indexOf('ui.intro = makeIntro();');
  assert.ok(k > 0);
  assert.ok(fn.indexOf("button('⏭ 건너뛰기', false, () => { unlock(); skipIntro(); })") > k, '단추는 묶음을 만든 뒤');
  const loop = fn.indexOf('while (!st.outcome && ui.open)');
  const intro = fn.slice(k, loop);
  assert.equal((intro.match(/await introNap\((1300|900)\);/g) || []).length, 2, '경보 1.3초 · 노리는 대사 0.9초 둘 다 건너뛸 수 있게');
  assert.doesNotMatch(intro, /await sleep\(/, '등장 장면 안에 못 건너뛰는 기다림이 없다');
  assert.ok(intro.lastIndexOf('ui.intro = null;') > intro.lastIndexOf('await introNap(900);'), '문제 전에 묶음을 치운다(문제 중 하늘 탭은 아무 일 없음)');
  assert.ok(intro.indexOf("say('나옹', `${o.kid}의 ${o.target.ko}") > 0 && intro.indexOf('msg(`🚀 로켓단이 ${o.target.ko}') > 0, '건너뛰어도 노리는 포켓몬은 말풍선·글줄에 남는다');
  assert.match(view, /\.addEventListener\('click', \(\) => \{ unlock\(\); skipIntro\(\); \}\);/, '하늘 탭 = 건너뛰기');
  const m = view.slice(view.indexOf('async function motto('), view.indexOf('async function attack('));
  assert.match(m, /if \(\(ui\.intro && ui\.intro\.skipped\(\)\) \|\| !ui\.open\) break;/);
  assert.match(m, /await introNap\(900\);/);
  assert.doesNotMatch(m, /sleep\(/);
  assert.match(view, /\} finally \{\n\s*ui\.open = false;\n\s*ui\.intro = null;/, '닫히면 묶음도 치움');
  assert.ok(!/ui\.skip\b/.test(view), '옛 ui.skip이 남지 않았다');
  assert.equal(MOTTO.length, 9, '구호 글은 그대로(건너뛸 수 있을 뿐)');
});
