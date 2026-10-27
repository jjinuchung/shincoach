// 🎮 v351 미니 게임 15개를 조금씩 어렵게 — 새 난이도 기록은 따로(쉬울 때 기록은 그대로): node --test tests/games351.test.js
// 값마다의 시험은 게임 시험(minigame307~346)에 · 여기는 기록 열쇠와 게임 카드 줄
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { recKey, REC_SUFFIX, playOf, mergePlay, bestOf, fastOf } from '../js/homeplay.js';
import { GAMES } from '../js/minigame.js';

test('🎮 새 난이도 기록 열쇠 — 게임 id + h · 모든 게임에 맞는 열쇠 · 꼴이 틀리면 없음', () => {
  assert.equal(REC_SUFFIX, 'h');
  assert.equal(recKey('dig'), 'digh');
  for (const g of GAMES) assert.match(recKey(g.id), /^[a-z]{3,12}$/, g.id);
  assert.equal(new Set(GAMES.map((g) => recKey(g.id))).size, GAMES.length, '열쇠가 겹치지 않는다');
  assert.ok(GAMES.every((g) => !GAMES.some((x) => x.id === recKey(g.id))), '새 열쇠가 다른 게임 id와 같지 않다');
  for (const bad of ['', 'Dig', 'abcdefghijkl', 'constructor!', 'a']) assert.equal(recKey(bad), '', String(bad));
});

test('🎮 옛 판(v350) 앱이 읽어도 새 기록이 안 사라진다 — 같은 best·fast 칸 안의 열쇠 · 병합은 열쇠마다', () => {
  const raw = { days: {}, bond: {}, best: { dig: 50, digh: 12 }, fast: { jig: 70, jigh: 95 } };
  const p = playOf(raw); // 옛 판도 같은 꼴로 읽는다(GAME_KEY에 맞는 열쇠는 다 남긴다)
  assert.deepEqual([p.best, p.fast], [{ dig: 50, digh: 12 }, { jig: 70, jigh: 95 }]);
  const m = mergePlay(raw, { best: { digh: 20, dig: 30 }, fast: { jigh: 90 } });
  assert.deepEqual([m.best, m.fast], [{ dig: 50, digh: 20 }, { jig: 70, jigh: 90 }]);
  assert.deepEqual([bestOf(m, recKey('dig')), bestOf(m, 'dig'), fastOf(m, recKey('jig')), fastOf(m, 'jig')], [20, 50, 90, 70]);
});

test('🎮 게임 카드 — 「최고」는 새 난이도 기록 · 쉬울 때 기록은 뒤에 작게', () => {
  const gv = readFileSync(new URL('../js/gameview.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert.match(gv, /const best = gameBest\(g\.id\);\n\s*const easy = gameEasyBest\(g\.id\);\n\s*return \{ best: best > 0 \? `최고 ⭐ \$\{best\}` : '', easy: easy > 0 \? `쉬울 때 ⭐ \$\{easy\}` : '' \};/);
  assert.match(gv, /easy: e \? `쉬울 때 ⏱️ \$\{e\}` : ''/);
  assert.match(gv, /if \(rec\.easy\) txt\.appendChild\(el\('span', 'gm-game-easy', rec\.easy\)\);/, '쉬울 때 기록은 따로 (🔍 Codex 156차)');
  assert.match(readFileSync(new URL('../css/style.css', import.meta.url), 'utf8'), /\.gm-game-easy \{ font-size: 0\.72rem;/, '작게');
  const xp = readFileSync(new URL('../js/xp.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert.match(xp, /export function gameBest\(gameId\) \{\n\s*return bestOf\(profile && profile\.homePlay, recKey\(gameId\)\);/);
  assert.match(xp, /export function gameEasyBest\(gameId\) \{\n\s*return bestOf\(profile && profile\.homePlay, gameId\);/);
});
