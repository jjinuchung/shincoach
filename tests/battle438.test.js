// ⚔️ 상대 레벨 (v438, 2026-11-24 진우 「상대 레벨이 너무 낮아 재미없어요」 → 아버님 「비슷한 레벨로 · 높은 레벨을 얻으면 안 됨」 「이대로」) — node --test tests/battle438.test.js
//  상대에는 레벨이 없었다(HP 100 · 공격 15~25 고정) — 진우 쪽만 Lv와 공격 배율이 보였다
//  foeLevel: 고른 포켓몬 레벨 ±2 · enemyDamage: 상대 공격 × 같은 레벨 배수 · 레벨은 싸울 때만(데려와도 안 따라온다)
//  lossCounts: 🔁 다시 대결은 이겨도 포켓몬을 안 주니 져도 패배로 안 센다(세 번 지면 떠나는 규칙 밖)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BATTLE, foeLevel, enemyDamage, lossCounts, rematchLoseLine, attackMult } from '../js/battle.js';
import { lvMult, MAX_LV } from '../js/evolve.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const fnBody = (s, head) => {
  const i = s.indexOf(head);
  assert.ok(i >= 0, `없음: ${head}`);
  const j = s.indexOf('\n}\n', i);
  return s.slice(i, j);
};

test('foeLevel: 고른 포켓몬 레벨 ±2 안 · 다섯 칸 모두 나온다 · rng 0 → −2 · 끝 → +2', () => {
  assert.equal(BATTLE.foeLvSpread, 2);
  assert.equal(foeLevel(42, () => 0), 40);
  assert.equal(foeLevel(42, () => 0.5), 42);
  assert.equal(foeLevel(42, () => 0.999), 44);
  assert.equal(foeLevel(42, () => 1), 44, 'rng가 1을 내도 +2를 넘지 않는다');
  const seen = new Set();
  for (let i = 0; i < 100; i++) {
    const lv = foeLevel(10, () => i / 100);
    assert.ok(lv >= 8 && lv <= 12, `${lv}`);
    seen.add(lv);
  }
  assert.deepEqual([...seen].sort((a, b) => a - b), [8, 9, 10, 11, 12], '고르게 다섯 칸');
});

test('foeLevel: Lv1 아래·만렙 위로는 안 감 · 레벨 칸이 없거나 이상하면 Lv1로 본다(lvOf)', () => {
  assert.equal(foeLevel(1, () => 0), 1);
  assert.equal(foeLevel(2, () => 0), 1);
  assert.equal(foeLevel(1, () => 0.999), 3);
  assert.equal(foeLevel(MAX_LV, () => 0.999), MAX_LV);
  assert.equal(foeLevel(MAX_LV, () => 0), MAX_LV - 2);
  for (const odd of [undefined, null, 0, -5, NaN, 'x']) {
    const lv = foeLevel(odd, () => 0.999);
    assert.equal(lv, 3, `${String(odd)} → Lv1 ±2`);
  }
  assert.equal(foeLevel('42', () => 0.5), 42, '글자로 온 레벨도');
  assert.equal(foeLevel(12.7, () => 0.5), 12, '소수는 버림(lvOf와 같게)');
});

test('enemyDamage: Lv1(기본)이면 15~25 그대로 · 레벨이 있으면 같은 레벨 배수를 곱해 반올림', () => {
  assert.equal(enemyDamage(() => 0), BATTLE.enemyMin);
  assert.equal(enemyDamage(() => 0.999), BATTLE.enemyMax);
  assert.equal(enemyDamage(() => 0, 1), BATTLE.enemyMin);
  for (const lv of [2, 10, 12, 42, 100]) {
    for (const r of [0, 0.5, 0.999]) {
      const base = BATTLE.enemyMin + Math.floor(r * (BATTLE.enemyMax - BATTLE.enemyMin + 1));
      assert.equal(enemyDamage(() => r, lv), Math.round(base * lvMult(lv)), `Lv${lv} r${r}`);
    }
  }
  assert.equal(enemyDamage(() => 0.5, 42), Math.round(20 * lvMult(42)));
  assert.ok(enemyDamage(() => 0.5, 42) > enemyDamage(() => 0.5, 1), '높은 레벨 상대는 더 세게');
  // 같은 레벨이면 양쪽 배수가 같다 — 내 공격(attackMult · 변신 없음)과 상대 공격의 배수
  for (const lv of [1, 10, 42]) assert.equal(attackMult(null, 0, lv), lvMult(lv));
});

test('lossCounts: 🔁 다시 대결이면 안 셈 · 못 잡은 상대면 셈 · rematchLoseLine 글', () => {
  assert.equal(lossCounts({ id: 25, ko: '피카츄', rematch: true }), false);
  assert.equal(lossCounts({ id: 25, ko: '피카츄' }), true);
  assert.equal(lossCounts({ id: 25, ko: '피카츄', rematch: false }), true);
  assert.equal(rematchLoseLine({ id: 658, ko: '개굴닌자' }), '😢 졌어요. 🔁 다시 대결이라 개굴닌자 패배는 늘지 않아요');
});

test('세 과목 배선 — 다시 대결에서 지면 battleLoss를 안 부르고 rematchLoseLine · 못 잡은 상대는 지금처럼 battleLoss', () => {
  for (const f of ['js/player.js', 'js/math.js', 'js/korbattleview.js']) {
    const s = read(f);
    assert.match(s, /import \{[^}]*\blossCounts\b[^}]*\brematchLoseLine\b[^}]*\} from '\.\/battle\.js';/, `${f}: battle.js에서 lossCounts·rematchLoseLine`);
    assert.equal((s.match(/battleLoss\(/g) || []).length, 1, `${f}: battleLoss는 한 곳`);
    const guard = s.indexOf('} else if (r.my && !lossCounts(r.opponent)) {');
    const loss = s.indexOf('battleLoss(r.my.id');
    assert.ok(guard > 0 && guard < loss, `${f}: 다시 대결 가르기가 battleLoss보다 먼저`);
    const between = s.slice(guard, loss);
    assert.ok(between.includes('rematchLoseLine(r.my)'), `${f}: 다시 대결 패배 알림`);
    assert.ok(between.includes('} else if (r.my) {'), `${f}: 못 잡은 상대 패배는 그 다음 갈래`);
    assert.ok(s.includes('battleWin(r.opponent.id)'), `${f}: 이기면 마릿수만(id 하나)`);
  }
});

test('레벨은 싸울 때만 — 상대 레벨은 화면 상태(ui.foeLv)에만 · 상대 객체·결과에 안 실림 · battleWin은 마릿수만 +1', () => {
  const s = read('js/battle.js');
  assert.ok(s.includes('  ui.foeLv = foeLevel(c.lv);'), '고른 포켓몬(c) 레벨로 정한다');
  assert.ok(s.includes('  const dmg = enemyDamage(Math.random, ui.foeLv);'), '상대 공격에 상대 레벨');
  assert.ok(!/opponent\.lv\b/.test(s) && !/lv: ui\.foeLv/.test(s) && !/foeLv: /.test(s.slice(s.indexOf('function endFight'))), '상대 객체·결과에 레벨을 안 싣는다');
  // 무대 이름 칸에 두 레벨을 나란히
  assert.ok(s.includes("  nameWithLv($('battle-enemy-name'), o.opponent.ko, ui.foeLv);"));
  assert.ok(s.includes("  nameWithLv($('battle-my-name'), c.ko, lvOf(c));"));
  // 상대 레벨이 정해지기 전(startFight 앞)에 상대 공격이 나가는 길이 없다 — enemyTurn은 startFight 뒤 턴에서만
  const sf = fnBody(s, 'function startFight(c) {');
  assert.ok(sf.indexOf('ui.foeLv = foeLevel') < sf.indexOf('renderActions()'), '기술 단추보다 먼저 정한다');
  // xp.battleWin: 받는 것은 id 하나 · 레벨 칸을 건드리지 않는다
  const bw = fnBody(read('js/xp.js'), 'export function battleWin(opponentId) {');
  assert.ok(!/\blv\b/.test(bw) && !/mons\[/.test(bw), 'battleWin은 caught만');
});

test('배틀 창 글 — 세 갈래 모두 레벨 안내 · 다시 대결은 「져도 패배는 늘지 않아요」 · 못 잡은 상대는 「레벨은 따라오지 않아요」 · 진 줄도 다시 대결이면 안 셈', () => {
  const s = read('js/battle.js');
  const note = s.slice(s.indexOf("  const lvNote = "), s.indexOf("$('battle').hidden = false;"));
  assert.ok(note.includes("const lvNote = '상대는 내보낸 포켓몬과 비슷한 레벨로 나와요';"));
  assert.equal((note.match(/\$\{lvNote\}/g) || []).length, 3, '연습·다시 대결·못 잡은 상대 세 갈래');
  assert.ok(note.includes('· 져도 패배는 늘지 않아요.'));
  const rematchPart = note.slice(note.indexOf('o.opponent.rematch ?'), note.indexOf('      : `이기면'));
  assert.ok(!rematchPart.includes('${lose}'), '다시 대결 안내에 「패배가 1 늘어요」가 없다');
  assert.ok(note.includes('데려와요(레벨은 따라오지 않아요). ${lose}.'));
  const lose = fnBody(s, 'function endFight(outcome) {');
  const i = lose.indexOf("!lossCounts(o.opponent) ? `🔁 다시 대결이라 ${ui.my.ko} 패배는 늘지 않아요 — ${tip}`");
  assert.ok(i > 0 && i < lose.indexOf('losses >= BATTLE.lossesToLose'), '진 줄 — 다시 대결이 먼저');
});

test('Codex 245차 — 다시 대결이면 고르는 칸에 「패배 n/3」을 안 보임 · 연습 진 줄도 다시 대결이면 「패배가 늘지 않아요」', () => {
  const s = read('js/battle.js');
  const pick = fnBody(s, 'function showPick() {');
  assert.equal((pick.match(/'own lose'/g) || []).length, 1, '패배 칸은 한 곳');
  assert.ok(pick.includes("if (c.losses && lossCounts(o.opponent)) btn.appendChild(el('span', 'own lose',"), '다시 대결이면 안 붙인다');
  const end = fnBody(s, 'function endFight(outcome) {');
  assert.ok(end.includes("o.practice ? (lossCounts(o.opponent) ? '(연습) 진짜 배틀이면 패배가 1 늘어요' : '(연습) 다시 대결은 져도 패배가 늘지 않아요')"));
  assert.equal((end.match(/진짜 배틀이면 패배가 1 늘어요/g) || []).length, 1);
});

test('이름 칸 레벨 글씨 — CSS .blv (작게 · 줄바꿈 안 함)', () => {
  const css = read('css/style.css');
  assert.match(css, /\.battle-info \.nm \.blv \{[^}]*white-space: nowrap;[^}]*\}/);
});
