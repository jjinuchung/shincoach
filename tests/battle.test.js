// ⚔️ 배틀 규칙 테스트: node --test tests/battle.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BATTLE, MOVES, DAMAGE, TYPE_OF, typeOf, movesOf, speakTier, damageFor, enemyDamage, shouldBattle, pickOpponent, eligibleMine, abortOutcome, formMult, FORM } from '../js/battle.js';
import { ROSTER } from '../js/pokemon.js';
import { battleWin, battleLoss, lossesOf, caughtCount, catchAttempt, consumeItem, addItem, itemCount } from '../js/xp.js';
import { mergeStatRecord } from '../js/db.js';

test('타입: 명단 60마리 전부 타입이 있고 기술 2개(강한/확실한)', () => {
  for (const m of ROSTER) {
    assert.ok(TYPE_OF[m.id], `${m.ko}(${m.id}) 타입 없음`);
    assert.ok(MOVES[typeOf(m.id)], `${m.ko} 기술 세트 없음`);
    const mv = movesOf(m.id);
    assert.equal(mv.length, 2);
    assert.equal(mv[0].key, 'strong'); assert.equal(mv[1].key, 'safe');
  }
  assert.equal(typeOf(25), 'electric'); assert.equal(typeOf(99999), 'normal');
});

test('말하기 결과 → 등급 → 데미지: 강한 기술은 잘 말할수록 크고, 확실한 기술은 고름', () => {
  const star = { passed: true, method: 'speech', score: { ratio: 0.9 }, transcript: 'x' };
  const pass = { passed: true, method: 'speech', score: { ratio: 0.5 }, transcript: 'x' };
  const fail = { passed: false, method: 'speech', transcript: 'y' };
  const none = { passed: false, method: 'speech', transcript: '', spokenMs: 0 };
  assert.equal(speakTier(star), 'star'); assert.equal(speakTier(pass), 'pass'); assert.equal(speakTier(fail), 'fail'); assert.equal(speakTier(none), 'none');
  assert.equal(speakTier(null), 'none');
  assert.equal(speakTier({ method: 'cancelled' }), 'none');
  assert.equal(speakTier({ method: 'none', passed: true }), 'pass', '마이크 못 쓰는 기기는 통과 취급');
  assert.equal(speakTier({ passed: true, method: 'energy' }), 'pass', '소리 길이 판정은 별은 못 받음');
  assert.equal(damageFor('strong', star), DAMAGE.strong.star);
  assert.equal(damageFor('strong', none), 0);
  assert.equal(damageFor('safe', fail), DAMAGE.safe.fail);
  assert.ok(DAMAGE.strong.star > DAMAGE.safe.star && DAMAGE.strong.fail < DAMAGE.safe.fail, '선택의 의미');
  for (let i = 0; i < 50; i++) { const d = enemyDamage(); assert.ok(d >= BATTLE.enemyMin && d <= BATTLE.enemyMax); }
  assert.equal(enemyDamage(() => 0), BATTLE.enemyMin); assert.equal(enemyDamage(() => 0.999), BATTLE.enemyMax);
});

test('등장 조건: 오늘 5문장 이상·하루 1번·확률 8%', () => {
  assert.equal(shouldBattle({ todayDone: 4, todayBattles: 0, rng: () => 0 }), false, '5문장 전엔 없음');
  assert.equal(shouldBattle({ todayDone: 5, todayBattles: 1, rng: () => 0 }), false, '하루 1번');
  assert.equal(shouldBattle({ todayDone: 5, todayBattles: 0, rng: () => BATTLE.chance - 0.001 }), true);
  assert.equal(shouldBattle({ todayDone: 5, todayBattles: 0, rng: () => BATTLE.chance + 0.001 }), false);
  assert.equal(BATTLE.chance, 0.08, '하루 30문장이면 4%에서는 셋 중 하루는 한 번도 못 만났다 (진우 신고)');
});

test('상대 고르기: 못 잡은 것 중, 흔할수록 자주. 내보낼 포켓몬: 파트너·😴 제외', () => {
  const list = [{ id: 25 }, { id: 4 }, { id: 150 }];
  assert.equal(pickOpponent(list, { 25: 1, 4: 1, 150: 1 }), null, '다 잡았으면 없음');
  assert.equal(pickOpponent(list, { 25: 1 }, () => 0).id, 4, '흔한 파이리(가중치 6)가 앞');
  assert.equal(pickOpponent(list, { 25: 1 }, () => 0.999).id, 150, '전설은 맨 뒤 한 칸');
  assert.deepEqual(eligibleMine([25, 4, 7], 25, (id) => id === 7), [4]);
  assert.deepEqual(eligibleMine([25, 4], null, null), [25, 4]);
});

test('프로필: 승리는 상대 획득, 패배 3번이면 한 마리 잃음(마릿수 −1), 배틀 물약은 가방에서만', async () => {
  catchAttempt(4, () => 0);
  assert.equal(caughtCount(4), 1);
  assert.equal(battleWin(150).first, true); assert.equal(caughtCount(150), 1);
  assert.equal(battleWin(150).first, false); assert.equal(caughtCount(150), 2);
  assert.deepEqual(await battleLoss(4), { losses: 1, lost: false });
  assert.deepEqual(await battleLoss(4), { losses: 2, lost: false });
  assert.equal(lossesOf(4), 2);
  assert.deepEqual(await battleLoss(4), { losses: 0, lost: true }, '3번째 패배에 잃음');
  assert.equal(caughtCount(4), 0, '한 마리뿐이었으니 도감에서 사라짐');
  assert.deepEqual(await battleLoss(150), { losses: 1, lost: false });
  assert.deepEqual(await battleLoss(150, 2), { losses: 0, lost: true }, '기준을 2로 주면 2번째에');
  assert.equal(caughtCount(150), 1, '2마리 중 1마리 남음');
  assert.equal(consumeItem('potion'), false);
  addItem('potion', 1);
  assert.equal(consumeItem('potion'), true); assert.equal(itemCount('potion'), 0);
});

test('강제 닫힘 결과(Codex #1): 확정된 승패는 그대로, 싸우던 중이면 quit, 안 싸웠으면 declined', () => {
  const opponent = { id: 7 };
  const my = { id: 25 };
  assert.equal(abortOutcome({ my, result: { outcome: 'win', my, opponent, turns: 3 }, turn: 3, opponent }).outcome, 'win', '결과 화면에서 닫아도 승리 보상 유지');
  assert.equal(abortOutcome({ my, result: { outcome: 'lose', my, opponent, turns: 5 }, turn: 5, opponent }).outcome, 'lose');
  const q = abortOutcome({ my, result: null, turn: 2, opponent });
  assert.equal(q.outcome, 'quit'); assert.equal(q.my, my); assert.equal(q.turns, 2);
  assert.equal(abortOutcome({ my: null, result: null, turn: 0, opponent }).outcome, 'declined');
  assert.equal(abortOutcome({ my: null, result: { outcome: 'declined' }, turn: 0, opponent }).outcome, 'declined');
  assert.equal(speakTier({ method: 'interrupted' }), 'none', '중단 결과는 데미지 없음 (턴은 battle.js에서 되돌림)');
});

test('daily 병합: battles는 큰 값', () => {
  assert.equal(mergeStatRecord('daily', { date: 'd', doneKeys: [], battles: 1 }, { date: 'd', doneKeys: [], battles: 0 }).battles, 1);
});

test('명단 100마리 전부 배틀 타입이 있다 (없으면 전부 노말이 되어 기술이 단조로워짐)', () => {
  const missing = ROSTER.filter((r) => !TYPE_OF[r.id]);
  assert.deepEqual(missing.map((r) => `${r.id} ${r.ko}`), [], '타입 없는 포켓몬');
  // 타입이 골고루 퍼져 있는지 (한 타입에 몰리면 배틀이 지루해짐)
  const count = {};
  for (const r of ROSTER) count[TYPE_OF[r.id]] = (count[TYPE_OF[r.id]] || 0) + 1;
  assert.ok(Object.keys(count).length >= 10, `타입 종류: ${Object.keys(count).length}`);
  assert.ok(Math.max(...Object.values(count)) <= ROSTER.length * 0.3, `한 타입이 너무 많음: ${JSON.stringify(count)}`);
});

test('⭐ 변신 배율: 메가는 배틀 내내 ×1.4, 거다이맥스는 3턴만 ×1.6', () => {
  assert.equal(formMult(null, 0), 1, '변신 안 하면 그대로');
  assert.equal(formMult('mega', 0), FORM.megaMult);
  assert.equal(formMult('mega', 3), FORM.megaMult, '메가는 턴과 무관');
  assert.equal(formMult('gmax', 3), FORM.gmaxMult);
  assert.equal(formMult('gmax', 1), FORM.gmaxMult);
  assert.equal(formMult('gmax', 0), 1, '거다이맥스는 3턴이 지나면 원래대로');
  assert.ok(FORM.gmaxMult > FORM.megaMult, '거다이맥스가 더 세지만 짧다');
  assert.equal(FORM.gmaxTurns, 3);
});
