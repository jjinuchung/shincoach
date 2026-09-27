// ⏳ 하루 과목별 시간 제한 규칙: node --test tests/timelimit.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SUBJECTS, DEFAULT_MIN, WARN_SEC, GRANT_MIN, IDLE_SEC, FIELD, KO,
  isWeekend, limitSec, usedSec, bonusSec, statusOf, tickDelta, grantDelta, fmtLeft, fmtUsed,
} from '../js/timelimit.js';
import { emptyDaily, mergeDailyDelta, mergeStatRecord } from '../js/db.js';

test('⏳ 아버님이 정한 값: 평일 1시간 · 주말 2시간 · 10분 전 미리 알림 · +10/20/30분 · 2분 쉬면 멈춤', () => {
  assert.deepEqual(DEFAULT_MIN, { weekday: 60, weekend: 120 });
  assert.equal(WARN_SEC, 600);
  assert.deepEqual(GRANT_MIN, [10, 20, 30]);
  assert.equal(IDLE_SEC, 120);
  assert.deepEqual(SUBJECTS, ['math', 'english']);
  assert.ok(KO.math && KO.english);
});

test('⏳ 주말 가리기 — 문자열을 조각으로 읽는다 (new Date("YYYY-MM-DD")는 UTC라 한국에선 하루 밀린다)', () => {
  assert.equal(isWeekend('2026-09-26'), true, '토요일');
  assert.equal(isWeekend('2026-09-27'), true, '일요일');
  assert.equal(isWeekend('2026-09-28'), false, '월요일');
  assert.equal(isWeekend('2026-10-02'), false, '금요일');
  // ★ UTC로 읽으면 월요일 00시가 전날(일요일)이 되어 평일에 주말 시간이 나온다 — 이 검사가 그걸 지킨다
  for (const d of ['2026-01-05', '2026-06-01', '2026-12-28']) assert.equal(isWeekend(d), false, `${d}는 월요일`);
  for (const d of ['2026-01-04', '2026-06-07', '2026-12-27']) assert.equal(isWeekend(d), true, `${d}는 일요일`);
  assert.equal(isWeekend(''), false, '이상한 값은 평일로');
  assert.equal(isWeekend(null), false);
});

test('⏳ 제한(초) — 평일 3600 · 주말 7200 · ⚙ 설정으로 바꿀 수 있고, 이상한 값은 기본값으로', () => {
  assert.equal(limitSec('2026-09-28'), 3600);
  assert.equal(limitSec('2026-09-27'), 7200);
  assert.equal(limitSec('2026-09-28', { weekday: 30 }), 1800);
  assert.equal(limitSec('2026-09-27', { weekday: 30 }), 7200, '주말은 주말 값');
  assert.equal(limitSec('2026-09-28', { weekday: 0 }), 0, '0분도 뜻이 있다 (오늘은 쉬는 날)');
  assert.equal(limitSec('2026-09-28', { weekday: -5 }), 3600, '음수는 기본값으로');
  assert.equal(limitSec('2026-09-28', { weekday: 'abc' }), 3600);
});

test('⏳ 지금 형편 — 쓴 시간·남은 시간·잠김·미리 알림', () => {
  const d = { ...emptyDaily('2026-09-28'), mathTime: 0 };
  let st = statusOf(d, 'math', '2026-09-28');
  assert.deepEqual([st.used, st.total, st.left, st.locked, st.warn], [0, 3600, 3600, false, false]);

  st = statusOf({ ...d, mathTime: 3000 }, 'math', '2026-09-28');
  assert.equal(st.left, 600);
  assert.equal(st.warn, true, '10분 남으면 미리 알린다');
  assert.equal(st.locked, false);

  st = statusOf({ ...d, mathTime: 3600 }, 'math', '2026-09-28');
  assert.deepEqual([st.left, st.locked, st.warn], [0, true, false]);

  st = statusOf({ ...d, mathTime: 9999 }, 'math', '2026-09-28');
  assert.equal(st.left, 0, '남은 시간은 음수가 되지 않는다');
  assert.equal(st.locked, true);

  // 과목은 따로 센다
  const both = { ...d, mathTime: 3600, enTime: 60 };
  assert.equal(statusOf(both, 'math', '2026-09-28').locked, true);
  assert.equal(statusOf(both, 'english', '2026-09-28').locked, false);
  assert.equal(statusOf(both, 'english', '2026-09-28').left, 3540);
});

test('⏳ 🔒 부모가 준 시간은 제한 위에 더해진다 · 제한을 끄면 잠기지 않는다', () => {
  const d = { ...emptyDaily('2026-09-28'), mathTime: 3600, mathBonus: 1200 };
  const st = statusOf(d, 'math', '2026-09-28');
  assert.equal(st.bonus, 1200);
  assert.equal(st.total, 4800);
  assert.equal(st.left, 1200);
  assert.equal(st.locked, false);

  const off = statusOf({ ...emptyDaily('2026-09-28'), mathTime: 99999 }, 'math', '2026-09-28', null, { off: true });
  assert.equal(off.locked, false, '⚙ 제한을 껐으면 잠기지 않는다');
  assert.equal(off.warn, false);

  // 아직 저장 안 한 초(extra)도 같이 본다 — 15초마다 저장하므로 그 사이에도 정확해야 한다
  const pending = statusOf({ ...emptyDaily('2026-09-28'), mathTime: 3590 }, 'math', '2026-09-28', null, { extra: 10 });
  assert.equal(pending.locked, true, '저장 전 10초 때문에 이미 다 썼다');
});

test('⏳ 증분: 흐른 초는 …Time에, 부모가 준 분은 …Bonus에 (분 → 초)', () => {
  assert.deepEqual(tickDelta('math', 5), { mathTime: 5 });
  assert.deepEqual(tickDelta('english', 1), { enTime: 1 });
  assert.deepEqual(tickDelta('math', 0), {}, '0초는 저장하지 않는다');
  assert.deepEqual(tickDelta('math', -3), {}, '음수는 무시');
  assert.deepEqual(tickDelta('없는과목', 5), {});

  assert.deepEqual(grantDelta('math', 20), { mathBonus: 1200 });
  assert.deepEqual(grantDelta('english', 10), { enBonus: 600 });
  assert.deepEqual(grantDelta('math', 0), {});
  assert.deepEqual(grantDelta('math', -10), {}, '시간을 뺏는 길은 없다 (부모도)');

  // 두 번 주면 더해진다 (평소 쓰기는 mergeDailyDelta = 합)
  let rec = mergeDailyDelta(null, '2026-09-28', grantDelta('math', 10));
  rec = mergeDailyDelta(rec, '2026-09-28', grantDelta('math', 20));
  assert.equal(rec.mathBonus, 1800, '+10분 뒤 +20분 = 30분');
});

test('★ ⏳ 네 필드가 DAILY_SUMS에 들어 있어야 한다 — 빠지면 백업을 되돌려 시간이 지워진다', () => {
  const empty = emptyDaily('2026-09-28');
  for (const s of SUBJECTS) {
    for (const k of [FIELD[s].used, FIELD[s].bonus]) {
      assert.equal(empty[k], 0, `${k}이 emptyDaily에 없다 = DAILY_SUMS에 안 넣었다`);
    }
  }
  // 옛 백업(시간 0)을 오늘(50분 씀) 위에 넣어도 줄지 않는다
  const today = { ...empty, mathTime: 3000, mathBonus: 600, enTime: 120 };
  const old = { ...empty, mathTime: 0, mathBonus: 0, enTime: 0 };
  const merged = mergeStatRecord('daily', today, old);
  assert.equal(merged.mathTime, 3000, '되돌려도 쓴 시간이 안 줄어든다');
  assert.equal(merged.mathBonus, 600);
  assert.equal(merged.enTime, 120);
  // 반대 방향도 같다 (어느 쪽이 최근이든 큰 값)
  assert.equal(mergeStatRecord('daily', old, today).mathTime, 3000);
});

test('⏳ 남은 시간 말로 적기', () => {
  assert.equal(fmtLeft(0), '0분');
  assert.equal(fmtLeft(30), '1분 안 남았어요');
  assert.equal(fmtLeft(60), '1분');
  assert.equal(fmtLeft(1920), '32분');
  assert.equal(fmtLeft(3900), '1시간 5분');
  assert.equal(fmtUsed(0), '0분');
  assert.equal(fmtUsed(3600), '1시간 0분');
  assert.equal(fmtUsed(2100), '35분');
});

test('⏳ usedSec·bonusSec은 깨진 값에도 0을 준다 (옛 기록엔 필드가 없다)', () => {
  assert.equal(usedSec(null, 'math'), 0);
  assert.equal(usedSec({}, 'math'), 0);
  assert.equal(usedSec({ mathTime: -5 }, 'math'), 0);
  assert.equal(usedSec({ mathTime: '12' }, 'math'), 12);
  assert.equal(bonusSec({ mathBonus: NaN }, 'math'), 0);
  assert.equal(usedSec({ mathTime: 10 }, '없는과목'), 0);
  // 필드 이름이 바뀌면 바로 걸린다
  assert.deepEqual(FIELD.math, { used: 'mathTime', bonus: 'mathBonus' });
  assert.deepEqual(FIELD.english, { used: 'enTime', bonus: 'enBonus' });
});

test('★ ⏳ 새 파일 두 개가 sw.js APP_SHELL에 있어야 한다 (빠지면 오프라인에서 앱이 죽는다)', async () => {
  const fs = await import('node:fs');
  const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  for (const f of ['./js/timelimit.js', './js/timeup.js']) {
    assert.ok(sw.includes(`'${f}'`), `${f}이 APP_SHELL에 없다`);
  }
});
