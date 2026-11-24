// ⚔️ 🔁 다시 대결 (v434, 2026-11-18 진우 「배틀이 안 나와요」 → 아버님 「이미 잡은 포켓몬과 다시 배틀하기」) — node --test tests/battle434.test.js
//  배틀 상대는 「열린 명단 중 못 잡은 포켓몬」뿐이었다 → 진우가 다 잡자(11-07) 영어·수학·국어 배틀이 하루도 안 나왔다
//  pickFoe: 못 잡은 상대가 먼저 · 없으면 이미 잡은 포켓몬과 다시 대결(rematch) · 이기면 ⚡💰만(포켓몬은 안 줌) · 🌌📮🎹는 그대로 뺀다
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pickFoe, pickOpponent, winLine, BATTLE } from '../js/battle.js';
import { ROSTER, isUltraBeast, isLetterMon, isMusicMon } from '../js/pokemon.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const skipped = (id) => isUltraBeast(id) || isLetterMon(id) || isMusicMon(id);

test('pickFoe: 못 잡은 상대가 있으면 그것(다시 대결 표시 없음) — pickOpponent와 같다', () => {
  const list = [{ id: 25, ko: '피카츄' }, { id: 4, ko: '파이리' }, { id: 150, ko: '뮤츠' }];
  for (const r of [0, 0.3, 0.6, 0.999]) {
    const a = pickFoe(list, { 25: 1 }, () => r);
    assert.deepEqual(a, pickOpponent(list, { 25: 1 }, () => r));
    assert.equal(a.rematch, undefined);
  }
  assert.equal(pickFoe(list, { 25: 1, 4: 1 }, () => 0.5).id, 150, '못 잡은 것이 하나뿐이면 그것 — 잡은 것과 섞지 않는다');
});

test('pickFoe: 다 잡았으면 이미 잡은 포켓몬과 다시 대결 { ...상대, rematch: true } · 받은 목록은 그대로 · 무게는 같은 규칙', () => {
  const list = [{ id: 25, ko: '피카츄', url: 'a' }, { id: 4, ko: '파이리', url: 'b' }, { id: 150, ko: '뮤츠', url: 'c' }];
  const caught = { 25: 1, 4: 2, 150: 1 };
  const a = pickFoe(list, caught, () => 0);
  assert.equal(a.rematch, true);
  assert.equal(a.url, list.find((m) => m.id === a.id).url, '그림 주소도 그대로 따라온다');
  assert.ok(list.every((m) => m.rematch === undefined), '화면의 캐릭터 목록 칸을 고치지 않는다');
  assert.notEqual(a, list.find((m) => m.id === a.id), '새 객체');
  for (const r of [0, 0.25, 0.5, 0.75, 0.999]) {
    const b = pickFoe(list, caught, () => r);
    const want = pickOpponent(list, {}, () => r); // 다 잡은 목록에서 같은 무게로
    assert.equal(b.id, want.id);
  }
  assert.equal(pickFoe(list, caught, () => 0.999).id, 150, '전설은 맨 뒤 한 칸(무게 1)');
});

test('pickFoe: 다시 대결도 잡은 것만 · 🌌 울트라비스트·📮 편지·🎹 음악 포켓몬은 다시 대결에도 안 나온다 · 아무것도 없으면 null', () => {
  const ub = ROSTER.find((m) => isUltraBeast(m.id)).id;
  const letter = ROSTER.find((m) => isLetterMon(m.id)).id;
  const music = ROSTER.find((m) => isMusicMon(m.id)).id;
  const only = [ub, letter, music].map((id) => ({ id }));
  const all = Object.fromEntries([ub, letter, music].map((id) => [id, 1]));
  assert.equal(pickFoe(only, all, () => 0.5), null, '잡았어도 🌌📮🎹뿐이면 상대 없음');
  assert.equal(pickFoe(only, {}, () => 0.5), null);
  assert.equal(pickFoe([], {}, () => 0.5), null);
  assert.equal(pickFoe([{ id: 25 }], {}, () => 0.5).rematch, undefined, '하나도 안 잡았으면 못 잡은 상대');
  assert.equal(pickFoe([{ id: 25 }, { id: 4 }], { 25: 0 }, () => 0).rematch, undefined, '마릿수 0은 못 잡은 것');
  const mixed = [...only, { id: 25 }];
  for (let i = 0; i < 50; i++) {
    const o = pickFoe(mixed, { ...all, 25: 1 }, () => i / 50);
    assert.equal(o.id, 25, '다시 대결 후보는 거른 뒤 남은 잡은 것');
    assert.equal(o.rematch, true);
  }
});

test('진짜 명단 — 진우처럼 🌌📮🎹 말고 다 잡았으면(11-07부터) v433은 늘 null, v434는 늘 다시 대결 상대가 나온다', () => {
  const caught = Object.fromEntries(ROSTER.filter((m) => !skipped(m.id)).map((m) => [m.id, 1]));
  for (let i = 0; i < 300; i++) {
    const rng = () => i / 300;
    assert.equal(pickOpponent(ROSTER, caught, rng), null, '옛 규칙: 상대 없음 — 배틀이 안 나온 까닭');
    const o = pickFoe(ROSTER, caught, rng);
    assert.ok(o && o.rematch === true);
    assert.ok(caught[o.id] > 0 && !skipped(o.id), `${o.id}: 잡은 것 · 🌌📮🎹 아님`);
  }
  // 한 마리라도 못 잡은 것이 남으면 그것이 먼저
  const left = ROSTER.find((m) => !skipped(m.id));
  const less = { ...caught };
  delete less[left.id];
  const o = pickFoe(ROSTER, less, () => 0.5);
  assert.equal(o.id, left.id);
  assert.equal(o.rematch, undefined);
});

test('winLine: 처음 → 「도감에 들어왔어요」 · 또 → 「한 마리 더」 · 🔁 다시 대결 → 「…를 이겼어요」(받침 따라 을/를) · ⚡💰 그대로', () => {
  assert.equal(BATTLE.winXp, 40);
  assert.equal(BATTLE.winCoins, 15);
  assert.equal(winLine({ id: 25, ko: '피카츄' }, true), '🎉 피카츄가 도감에 들어왔어요! ⚡+40 💰+15');
  assert.equal(winLine({ id: 4, ko: '파이리' }, false), '🎉 파이리 한 마리 더! ⚡+40 💰+15');
  assert.equal(winLine({ id: 25, ko: '피카츄', rematch: true }, false), '🎉 피카츄를 이겼어요! ⚡+40 💰+15');
  assert.equal(winLine({ id: 150, ko: '뮤츠', rematch: true }, true), '🎉 뮤츠를 이겼어요! ⚡+40 💰+15', '다시 대결이면 first가 와도 도감 말을 안 한다');
  assert.equal(winLine({ id: 6, ko: '리자몽', rematch: true }, false), '🎉 리자몽을 이겼어요! ⚡+40 💰+15');
});

test('세 과목 배선 — 영어·수학·국어(논술) 모두 pickFoe로 고르고, 다시 대결이면 battleWin을 안 부르고, 알림은 winLine', () => {
  for (const f of ['js/player.js', 'js/math.js', 'js/korbattleview.js']) {
    const s = read(f);
    assert.match(s, /import \{[^}]*\bpickFoe\b[^}]*\bwinLine\b[^}]*\} from '\.\/battle\.js';/, `${f}: battle.js에서 pickFoe·winLine`);
    assert.ok(!/\bpickOpponent\(/.test(s), `${f}: 옛 pickOpponent를 직접 부르지 않는다`);
    assert.ok(/pickFoe\(/.test(s), `${f}: 상대는 pickFoe로`);
    const wins = s.match(/battleWin\(/g) || [];
    assert.equal(wins.length, 1, `${f}: battleWin은 한 곳`);
    assert.ok(s.includes('const w = r.opponent.rematch ? null : battleWin(r.opponent.id);'), `${f}: 다시 대결이면 포켓몬을 안 준다`);
    assert.ok(s.includes('winLine(r.opponent, !!(w && w.first))'), `${f}: 알림은 winLine`);
    assert.ok(!s.includes('도감에 들어왔어요'), `${f}: 옛 알림 글이 남지 않는다`);
  }
});

test('배틀 창 글 — 다시 대결이면 「데려와요」 대신 「🔁 다시 대결 — 벌써 도감에 있어요」 · 이긴 줄도 「우리 편이 됐어요」 대신 winLine', () => {
  const s = read('js/battle.js');
  // v438: 다시 대결은 져도 패배가 늘지 않는다 → 「지면 패배가 1 늘어요」 대신 「져도 패배는 늘지 않아요」 · 레벨 안내 덧붙임
  assert.ok(s.includes("o.opponent.rematch ? `🔁 다시 대결 — ${o.opponent.ko}${josa(o.opponent.ko, '은', '는')} 벌써 도감에 있어요. 이기면 ⚡+${BATTLE.winXp} 💰+${BATTLE.winCoins} · 져도 패배는 늘지 않아요. ${lvNote}`"));
  assert.ok(s.includes('o.opponent.rematch ? winLine(o.opponent, false)'));
  // 데려온다는 말은 다시 대결이 아닌 길에만
  const note = s.slice(s.indexOf("$('battle-note').textContent"), s.indexOf("$('battle').hidden = false;"));
  assert.ok(note.indexOf('rematch') < note.indexOf('데려와요'), '다시 대결을 먼저 가른다');
});
