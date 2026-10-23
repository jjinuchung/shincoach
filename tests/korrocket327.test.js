// 🚀·📣 국어·논술 로켓단·응원 — 실제로 돌려 보는 시험 (v327 · 🔍 Codex 131차 세 가지, 2026-10-23 아버님 "추천대로 반영"): node --test tests/korrocket327.test.js
//  #1 문제 원천(낱말·논술 원고)을 못 받으면 열지 않는다 — 몫도 배틀 기록도 안 쓰고, 이어 가던 습격은 그대로 남긴다
//  #2 다음 단추의 로켓단 기다림은 읽던 상태(r.rocketWait)에 — 끝난 뒤 넘기기는 한 번만, 깨져도 단추가 영영 잠기지 않게
//  #3 응원은 그림이 뜨는 그 순간에 다시 보고, 뜰 때만 센다
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROCKET, rocketNew } from '../js/rocket.js';
import { emptyProfile } from '../js/db.js';
import { initProfile, flushProfile, reloadProfile, battleWin, rarityIn, rocketAdmit, rocketCurrent, getPartner, rocketPick } from '../js/xp.js';
import { ROSTER, isUltraBeast } from '../js/pokemon.js';
import { todayKey } from '../js/track.js';
import { COOLDOWN } from '../js/cheer.js';
import { quizSource, startKorRocket, korRocketAt, resumeKorRocketIfAny } from '../js/korrocket.js';
import { cheerWalk, korCheerState } from '../js/korcheer.js';

const BASE = emptyProfile();
const [C1, C2] = ROSTER.map((m) => m.id).filter((id) => rarityIn(BASE, id) === 1 && !isUltraBeast(id));
const Q = (id) => ({ id, label: '🔤', q: `${id}?`, choices: [{ text: 'a', ok: true }, { text: 'b', ok: false }] });
const dailyKor = () => Number((fakeIdb.get('daily', todayKey()) || {})[ROCKET.field.kor]) || 0;

let ready = null;
/** 파트너 C1 · 노릴 포켓몬 C2 (rocketstore.test와 같은 재료) · 다른 창은 없다(overlayOpen이 보는 document) */
function setup() {
  if (!ready) {
    ready = (async () => {
      await initProfile();
      for (let i = 0; i < 6; i++) { battleWin(C1); battleWin(C2); }
      battleWin(C1);
      await flushProfile();
      await reloadProfile();
      await flushProfile();
      globalThis.document = { getElementById: () => null };
    })();
  }
  return ready;
}

test('#1 quizSource: 원천을 못 받거나(없음·깨짐·함수 아님) 첫 문제가 없으면 null · 낸 문제가 바닥나면 처음부터 다시(⏭ 틀림으로 세지 않게)', async () => {
  assert.equal(await quizSource(async () => null), null, '원고를 못 받음');
  assert.equal(await quizSource(async () => { throw new Error('net'); }), null, '받다가 깨짐');
  assert.equal(await quizSource(() => 'x'), null, '함수가 아님');
  assert.equal(await quizSource(async () => () => null), null, '첫 문제가 없다');
  assert.equal(await quizSource(async () => () => { throw new Error('bad'); }), null, '문제를 만들다 깨짐');
  const pool = ['w1', 'w2'];
  const getQ = await quizSource(async () => (seen) => { const id = pool.find((x) => !seen.has(x)); return id ? Q(id) : null; });
  assert.equal(typeof getQ, 'function');
  const seen = new Set();
  const ids = [];
  for (let i = 0; i < 5; i++) { const q = getQ(seen); assert.ok(q, `${i + 1}번째 문제`); seen.add(q.id); ids.push(q.id); }
  assert.deepEqual(ids.slice(0, 2), ['w1', 'w2'], '처음엔 겹치지 않게');
  assert.equal(ids.length, 5, '다섯 문제 모두 나온다 — 바닥나도 null(⏭ 틀림)이 아니다');
});

test('#1 새 습격: 문제 원천을 못 받으면 열지 않는다 — 오늘 몫(rocketKor)도 배틀 기록도 안 쓰고 after()는 한 번', async () => {
  await setup();
  assert.ok(getPartner() && rocketPick(), '파트너와 노릴 포켓몬이 있다(그래야 원천까지 간다)');
  let made = 0;
  let after = 0;
  await startKorRocket({ kind: 'korean', visible: () => true, makeQ: async () => { made++; return null; }, after: () => { after++; } });
  assert.equal(made, 1, '원천을 받으러 갔다');
  assert.equal(after, 1);
  assert.equal(rocketCurrent(), null, '배틀 기록 없음');
  assert.equal(dailyKor(), 0, '오늘 몫을 안 썼다');
  // 원천은 받았는데 그 사이 화면을 떠났다 — 역시 안 연다
  let calls = 0;
  await startKorRocket({ kind: 'nonsul', visible: () => (calls++ === 0), makeQ: async () => (seen) => Q('n1'), after: () => { after++; } });
  assert.equal(after, 2);
  assert.equal(rocketCurrent(), null);
  assert.equal(dailyKor(), 0);
});

test('#1 이어 가기: 원천을 못 받으면 열지 않고 저장된 습격을 그대로 남긴다(물음 0 · 다음에 들어올 때 다시)', async () => {
  await setup();
  const cur = rocketNew({ subject: 'kor', target: C2, stem: 'nonsul' });
  const b = await rocketAdmit(todayKey(), ROCKET.field.kor, ROCKET.maxPerDay, cur);
  assert.equal(b.ok, true);
  let made = 0;
  const r = await resumeKorRocketIfAny({ kind: 'nonsul', visible: () => true, busy: () => false, makeQ: async () => { made++; throw new Error('net'); } });
  assert.equal(made, 1, '이어 갈 조건은 맞아 원천을 받으러 갔다');
  assert.equal(r, false, '열지 않았다');
  const left = rocketCurrent();
  assert.ok(left && left.id === cur.id, '저장된 습격이 그대로');
  assert.deepEqual([left.st.asked, left.st.right, left.st.wrong, left.st.outcome], [0, 0, 0, null], '문제 하나 없이 틀림으로 세지 않았다');
  assert.equal(dailyKor(), 1, '몫은 처음 연 한 번뿐');
  // 다른 화면(국어)에서는 원천도 안 받는다
  made = 0;
  assert.equal(await resumeKorRocketIfAny({ kind: 'korean', visible: () => true, busy: () => false, makeQ: async () => { made++; return null; } }), false);
  assert.equal(made, 0);
});

test('#2 korRocketAt: 기다리는 자리를 r.rocketWait에 · 끝나면 next() 한 번 · 그 사이 다른 길로 넘어갔으면 안 부름 · 열다가 깨져도 풀림', async () => {
  await setup();
  // 열지 못함(원천 없음) → 바로 끝 — 기다림이 풀리고 넘어간다
  const r = { qi: 2 };
  let next = 0;
  const p = korRocketAt(r, 2, { kind: 'korean', visible: () => true, makeQ: async () => null, next: () => { next++; } });
  assert.equal(r.rocketWait, 2, '기다리는 동안 — 다시 그린 단추도 이것을 보고 잠근다');
  await p;
  assert.equal(next, 1);
  assert.equal(r.rocketWait, null);
  // 기다리는 사이 다른 길로 기다림이 지워졌다 — 끝나도 넘기지 않는다(물음을 건너뛰지 않게)
  const r2 = { step: 'reasons' };
  let n2 = 0;
  const p2 = korRocketAt(r2, 'reasons', { kind: 'nonsul', visible: () => true, makeQ: async () => { r2.rocketWait = null; return null; }, next: () => { n2++; } });
  await p2;
  assert.equal(n2, 0);
  // 열다가 깨짐(화면 확인에서 throw) — 단추가 영영 잠기지 않게 풀고 한 번 넘어간다
  const r3 = { qi: 0 };
  let n3 = 0;
  let k = 0;
  await korRocketAt(r3, 0, { kind: 'korean', visible: () => { if (k++ > 0) throw new Error('gone'); return true; }, makeQ: async () => (seen) => Q('w9'), next: () => { n3++; } });
  assert.equal(n3, 1);
  assert.equal(r3.rocketWait, null);
  assert.equal(r3.rocketWait === r3.qi, false, '물음 0도 풀린다(0은 거짓 값 — === 로 본다)');
});

test('#3 cheerWalk: 그림이 뜨는 그 순간 화면을 떠났거나 큰 창이 열릴 참이면 안 뜨고 세지도 않는다 · 뜨면 한 번 센다', () => {
  const line = { ko: '잘했어!', en: 'Nice!' };
  const s0 = korCheerState();
  let shown = 0;
  assert.equal(cheerWalk(line, { visible: () => false, busy: () => false }, () => { shown++; }), false, '화면을 떠났다');
  assert.equal(cheerWalk(line, { visible: () => true, busy: () => true }, () => { shown++; }), false, '🚀 로켓단·잡기가 열릴 참');
  assert.deepEqual(korCheerState(), s0, '안 떴으면 횟수·쉼 그대로');
  assert.equal(shown, 0);
  assert.equal(cheerWalk(line, { visible: () => true }, () => { shown++; }), true, 'busy가 없어도');
  assert.equal(shown, 1);
  assert.deepEqual(korCheerState(), { cd: COOLDOWN, n: s0.n + 1 });
});
