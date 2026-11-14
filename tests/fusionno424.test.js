// 🏷️ 퓨전 띠부실 번호 (v424 — 진우 신청 · 아버님 「추천대로」): node --test tests/fusionno424.test.js
// 포켓몬빵 띠부실 책처럼 — 번호 = 모양(앞) 포켓몬의 도감 번호 · 같은 모양·다른 색은 같은 번호로 나란히 · 저장 없이 셈 · 빈 번호 칸은 안 그림
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fusionNo, noText, byFusionNo, parseFusionId } from '../js/fusion.js';
import { emptyProfile } from '../js/db.js';
import { initProfile, flushProfile, reloadProfile, fusionList } from '../js/xp.js';

const src = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const stored = () => fakeIdb.get('profile', 'me');

test('번호 = 모양(앞) 포켓몬의 도감 번호 · 세 자리(No.025) · 천 넘으면 네 자리 · 이상한 값은 0', () => {
  assert.equal(fusionNo({ a: 25, b: 4 }), 25, '피카츄 모양');
  assert.equal(fusionNo({ a: 4, b: 25 }), 4, '순서를 바꾸면 모양이 파이리 — 다른 번호');
  assert.equal(fusionNo(parseFusionId('150-7')), 150, '이미 만든 퓨전도 id에서 바로');
  assert.equal(noText(25), 'No.025');
  assert.equal(noText(1), 'No.001');
  assert.equal(noText(150), 'No.150');
  assert.equal(noText(1007), 'No.1007');
  assert.equal(noText(fusionNo({ a: 25.7, b: 1 })), 'No.025');
  for (const bad of [null, undefined, 'x', -3]) assert.equal(noText(fusionNo({ a: bad })), 'No.000', String(bad));
  assert.equal(fusionNo(null), 0);
});

test('번호 순 — 모양 번호 → 색 번호 · 같은 모양·다른 색은 나란히', () => {
  const list = [{ a: 25, b: 7 }, { a: 4, b: 25 }, { a: 150, b: 1 }, { a: 25, b: 1 }, { a: 1007, b: 4 }, { a: 25, b: 4 }];
  assert.deepEqual(list.sort(byFusionNo).map((f) => `${f.a}-${f.b}`), ['4-25', '25-1', '25-4', '25-7', '150-1', '1007-4']);
});

test('★ 퓨전 도감(fusionList) — 저장된 퓨전이 번호 순 · 만든 적 없는 줄은 빠짐 · 나눈 퓨전도 제 번호 자리 · 처음 만든 때와 상관없음', async () => {
  await initProfile();
  await flushProfile();
  const cur0 = stored() || emptyProfile();
  fakeIdb.put('profile', {
    ...emptyProfile(),
    fusions: {
      '25-4': { a: 25, b: 4, made: 1, split: 0, at: 300 },
      '4-25': { a: 4, b: 25, made: 2, split: 0, at: 900 },
      '25-1': { a: 25, b: 1, made: 1, split: 1, at: 100, name: '피카씨' },
      '150-7': { a: 150, b: 7, made: 1, split: 0, at: 50 },
      '7-1': { a: 7, b: 1, made: 0, split: 0, at: 10 },
    },
    updatedAt: (cur0.updatedAt || 0) + 1,
  });
  await reloadProfile();
  const list = fusionList();
  assert.deepEqual(list.map((f) => f.fid), ['4-25', '25-1', '25-4', '150-7'], '번호 순 (처음 만든 때 순이 아니다)');
  assert.deepEqual(list.map((f) => noText(fusionNo(f))), ['No.004', 'No.025', 'No.025', 'No.150']);
  assert.equal(list[1].held, 0, '나눈 퓨전도 도감에 그 번호로');
  assert.equal(list[1].name, '피카씨');
  assert.equal(list.some((f) => f.fid === '7-1'), false, '만든 적 없는 줄은 없다');
  assert.equal(JSON.stringify(stored().fusions['25-4']), JSON.stringify({ a: 25, b: 4, made: 1, split: 0, at: 300 }), '번호는 저장하지 않는다(셈)');
});

test('화면 배선 — 5일장 퓨전 도감·태어난 카드·🎒 도감의 🔀 칸에 번호 딱지 · 한 줄 안내 · 빈 번호 칸은 안 그림', () => {
  const mv = src('js/marketview.js');
  assert.match(mv, /import \{ [^}]*\bnoText\b[^}]* \} from '\.\/fusion\.js';/);
  assert.match(mv, /const cell = el\('div', 'fz-cell' \+ \(f\.held > 0 \? ' held' : ''\)\);\n    cell\.appendChild\(el\('div', 'fz-no', noText\(f\.a\)\)\);/);
  assert.match(mv, /'🏷️ 띠부실 번호는 모양\(앞\) 포켓몬의 도감 번호예요 — 번호 순서대로 모여요'/);
  assert.match(mv, /box\.appendChild\(el\('div', 'fz-no', `🏷️ \$\{noText\(f\.a\)\}`\)\);/, '새로 태어난 카드에도');
  assert.match(mv, /const list = fusionList\(\);/, '5일장 도감은 fusionList 차례 그대로');
  const pd = src('js/pokedex.js');
  assert.match(pd, /const cell = el\('div', 'pokedex-cell got fz-dex-cell'\);\n      cell\.appendChild\(el\('div', 'fz-no', noText\(f\.a\)\)\);/);
  assert.match(pd, /const fz = fusionList\(\);/);
  assert.match(src('js/xp.js'), /\}\)\.filter\(Boolean\)\.sort\(byFusionNo\);/);
  const css = src('css/style.css');
  assert.match(css, /\.fz-no \{ justify-self: start;[^}]+\}\n\.fz-result \.fz-no \{[^}]+\}\n\.pokedex-cell \.fz-no \{ position: absolute; top: 4px; left: 6px;/);
  assert.match(css, /\n\.fz-dex-cell \.cnt \{ position: static; margin-top: 2px; \}/, '🎒 도감 퓨전 칸의 「나눔」·「×2」는 이름 아래 — 번호 딱지와 안 겹치게(걷기에서 찾음)');
});
