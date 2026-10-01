// ⏳ 하루 과목별 시간 제한 규칙: node --test tests/timelimit.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SUBJECTS, DEFAULT_MIN, WARN_SEC, GRANT_MIN, IDLE_SEC, FIELD, KO,
  isWeekend, limitSec, usedSec, bonusSec, statusOf, tickDelta, grantDelta, fmtLeft, fmtUsed,
  EXTEND_MIN, EXTEND_MAX, extCount, extMaxOf, extendPlan,
} from '../js/timelimit.js';
import { emptyDaily, mergeDailyDelta, mergeStatRecord, extendRule, cloneProfile } from '../js/db.js';
import { EXTEND_MATH, EXTEND_ENGLISH, EXTENDERS, extenderOf, itemById, lootBox, canBuy, ITEMS } from '../js/items.js';

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
  assert.deepEqual(FIELD.math, { used: 'mathTime', bonus: 'mathBonus', ext: 'mathExt' });
  assert.deepEqual(FIELD.english, { used: 'enTime', bonus: 'enBonus', ext: 'enExt' });
});

test('★ ⏳ 새 파일 두 개가 sw.js APP_SHELL에 있어야 한다 (빠지면 오프라인에서 앱이 죽는다)', async () => {
  const fs = await import('node:fs');
  const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  for (const f of ['./js/timelimit.js', './js/timeup.js']) {
    assert.ok(sw.includes(`'${f}'`), `${f}이 APP_SHELL에 없다`);
  }
});

// ───────────────────── ⏳ 시간 연장권 (2026-10-01, 진우 요청 → 아버님 "이대로 진행") ─────────────────────

test('⏳ 연장권 값: 15분 · 과목마다 하루 2개 · 수학 💰100+🔷1 · 영어 💰150+🔷1 (영어도 수학스톤)', () => {
  assert.equal(EXTEND_MIN, 15);
  assert.equal(EXTEND_MAX, 2);
  assert.deepEqual([EXTEND_MATH.price, EXTEND_MATH.stones], [100, { stone_math: 1 }]);
  assert.deepEqual([EXTEND_ENGLISH.price, EXTEND_ENGLISH.stones], [150, { stone_math: 1 }], '영상을 더 보려면 수학을 제대로 — 🔷');
  assert.deepEqual(EXTENDERS.map((x) => [x.subject, x.minutes, x.kind]), [['math', 15, 'extend'], ['english', 15, 'extend']]);
  assert.equal(extenderOf('math'), EXTEND_MATH);
  assert.equal(extenderOf('english'), EXTEND_ENGLISH);
  assert.equal(extenderOf('없는과목'), null);
  // 카탈로그에 있어야 산다(itemById) · 🎁 상자에서는 안 나온다(스톤이 드는 물건) · 코인만으로는 못 산다
  for (const it of EXTENDERS) {
    assert.equal(itemById(it.id), it, `${it.id}이 ITEMS에 없다 — 상점에서 사도 가방에 안 들어간다`);
    assert.equal(ITEMS.filter((x) => x.id === it.id).length, 1);
    assert.equal(canBuy(it.id, 9999, {}).ok, false, '🔷 없이는 못 산다');
    assert.equal(canBuy(it.id, it.price, { stone_math: 1 }).ok, true);
  }
  for (let i = 0; i < 400; i++) assert.ok(!lootBox(() => i / 400).startsWith('extend'), '🎁 상자에서 연장권이 나오면 시간을 공짜로 늘린다');
});

test('⏳ 쓴 연장권은 그 과목 제한 위에 15분씩 — 부모가 준 시간과 따로 더해진다', () => {
  const d = { ...emptyDaily('2026-09-28'), mathTime: 3600, mathExt: 1 };
  let st = statusOf(d, 'math', '2026-09-28');
  assert.deepEqual([st.extN, st.ext, st.total, st.left, st.locked, st.warn], [1, 900, 4500, 900, false, false]);
  st = statusOf({ ...d, mathBonus: 600, mathExt: 2 }, 'math', '2026-09-28');
  assert.equal(st.total, 3600 + 600 + 1800, '부모 +10분 + 연장권 2개');
  assert.equal(statusOf(d, 'english', '2026-09-28').extN, 0, '과목은 따로');
  assert.equal(extCount({ enExt: 3 }, 'english'), 3);
  assert.equal(extCount({ mathExt: -1 }, 'math'), 0);
  assert.equal(extCount(null, 'math'), 0);
});

test('⏳ 연장권 버튼을 보일까 (extendPlan) — 꺼짐·부모가 0개·오늘 다 씀·가방에 없음·아직 이름·지금', () => {
  const day = '2026-09-28';
  const at = (sec, extra = {}) => statusOf({ ...emptyDaily(day), mathTime: sec, ...extra }, 'math', day);
  const off = statusOf({ ...emptyDaily(day), mathTime: 9999 }, 'math', day, null, { off: true });
  assert.equal(extendPlan(off, { have: 3, max: 2 }).why, 'off', '제한을 껐으면 칸째 숨긴다');
  assert.equal(extendPlan(at(3600), { have: 3, max: 0 }).why, 'disabled', '부모가 0개로 → 못 쓴다');
  assert.equal(extendPlan(at(4500, { mathExt: 1 }), { have: 3, max: 1 }).why, 'cap');
  assert.deepEqual(extendPlan(at(5400, { mathExt: 2 }), { have: 3 }), { why: 'cap', can: false, room: 0 }, '기본 하루 2개');
  assert.equal(extendPlan(at(3600), { have: 0, max: 2 }).why, 'none');
  assert.equal(extendPlan(at(1200), { have: 2, max: 2 }).why, 'early', '40분 남았는데 쓰면 낭비');
  assert.deepEqual(extendPlan(at(3600), { have: 1, max: 2 }), { why: 'ok', can: true, room: 2 }, '잠겼을 때');
  assert.equal(extendPlan(at(3100), { have: 1, max: 2 }).why, 'ok', '10분 안 남았을 때도');
  assert.equal(extendPlan(at(4500, { mathExt: 1 }), { have: 1, max: 2 }).room, 1);
  assert.equal(extendPlan(null, { have: 1 }).why, 'off');
  // ⚙ 값 — 0~3, 이상하면 기본 2
  assert.deepEqual([extMaxOf(0), extMaxOf('1'), extMaxOf(3), extMaxOf(9), extMaxOf(-1), extMaxOf('x'), extMaxOf(undefined)], [0, 1, 3, 3, 2, 2, 2]);
});

test('★ ⏳ 연장권 쓰기 규칙 (extendRule) — 가방에서 하나 빼고 오늘 +1, 한도·가방을 같은 자리에서 본다', () => {
  const day = '2026-09-28';
  const p = cloneProfile({ items: { extend_math: 2, stone_math: 4 }, coins: 50 });
  const before = { ...emptyDaily(day), mathTime: 3600, mathBonus: 600 };
  const r1 = extendRule(p, before, day, 'mathExt', 'extend_math', 2);
  assert.equal(r1.ok, true);
  assert.equal(p.items.extend_math, 1, '가방에서 하나');
  assert.deepEqual([r1.daily.mathExt, r1.daily.mathTime, r1.daily.mathBonus], [1, 3600, 600], '다른 기록은 그대로');
  assert.equal(before.mathExt, 0, '읽은 기록을 고치지 않는다');
  assert.deepEqual([p.coins, p.items.stone_math], [50, 4], '쓸 때는 코인·스톤이 안 든다 (살 때 냈다)');
  const r2 = extendRule(p, r1.daily, day, 'mathExt', 'extend_math', 2);
  assert.equal(r2.ok, true);
  assert.equal(p.items.extend_math, undefined, '0개면 가방에서 지운다');
  // 한도 — 가방에 또 있어도 오늘은 끝
  p.items.extend_math = 5;
  const r3 = extendRule(p, r2.daily, day, 'mathExt', 'extend_math', 2);
  assert.deepEqual([r3.ok, r3.why, p.items.extend_math], [false, 'cap', 5], '한도에 걸리면 가방도 그대로');
  assert.equal(extendRule(p, r2.daily, day, 'mathExt', 'extend_math', 0).why, 'cap', '부모가 0개로');
  assert.equal(extendRule(p, r2.daily, day, 'enExt', 'extend_english', 2).why, 'none', '영어 연장권은 없다');
  assert.equal(p.items.extend_math, 5);
  // 기록이 없는 날 (오늘 처음)
  const r4 = extendRule(cloneProfile({ items: { extend_english: 1 } }), undefined, day, 'enExt', 'extend_english', 2);
  assert.deepEqual([r4.ok, r4.daily.enExt, r4.daily.date], [true, 1, day]);
});

test('★ ⏳ 쓴 연장권 수는 DAILY_SUMS — 옛 백업을 되돌려도 줄지 않는다 (한도가 되살아나지 않게)', () => {
  const empty = emptyDaily('2026-09-28');
  assert.equal(empty.mathExt, 0, 'mathExt가 emptyDaily에 없다 = DAILY_SUMS에 안 넣었다');
  assert.equal(empty.enExt, 0);
  const today = { ...empty, mathExt: 2, enExt: 1 };
  const old = { ...empty };
  assert.equal(mergeStatRecord('daily', today, old).mathExt, 2);
  assert.equal(mergeStatRecord('daily', old, today).enExt, 1);
});

test('⏳ 연장권 배선 — 잠금 화면·칩·상점·⚙·📊가 같은 규칙을 쓴다', async () => {
  const fs = await import('node:fs');
  const read = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
  const up = read('js/timeup.js');
  assert.match(up, /openTimeUp\(subject, \{ retry: fn \}\)/, '잠금 때문에 못 한 것을 연장권 뒤 "계속하기"로');
  assert.match(up, /useExtend\(s, clockDay\(\), FIELD\[s\]\.ext, extMax\(\)\)/, '한 트랜잭션 경로로만 쓴다');
  assert.match(up, /adoptDaily\(r\.daily\)/, '쓴 뒤 칩·잠금이 바로 따라온다');
  assert.equal((up.match(/extendPlan\(/g) || []).length, 2, '보여 줄 때·누를 때 둘 다 같은 판정');
  const html = read('index.html');
  for (const id of ['time-chip-math', 'time-chip-library', 'time-chip-player']) assert.match(html, new RegExp(`<button type="button" id="${id}"`), `${id}는 누를 수 있다`);
  for (const id of ['timeup-extend', 'timeup-extend-btn', 'timeup-extend-note', 'timeup-shop', 'set-time-ext']) assert.ok(html.includes(`id="${id}"`), id);
  assert.match(read('js/shop.js'), /shopSection\('⏳ 시간 연장권', [^\n]*EXTENDERS/);
  const pl = read('js/player.js');
  assert.match(pl, /extMax: extMaxOf\(settings\.timeExtMax\)/, '⚙ 값을 시계가 읽는다');
  assert.match(pl, /settings\.timeExtMax = extMaxOf\(\$\('set-time-ext'\)\.value\)/);
  assert.match(read('js/stats.js'), /td\.mathExt\], \['🎤 영어', td && td\.enExt\]/, '📊에 오늘 쓴 연장권');
  const xp = read('js/xp.js');
  assert.match(xp, /runProfileOp\(\(\) => applyExtend\(date, field, it\.id, max\), \(\) => \(\{ ok: false, why: 'save' \}\)\)/, '저장 실패면 시간을 안 늘린다');
});

test('★ ⏳ 연장권 Codex 21차 — 자정 넘김·느린 저장 사이 다른 창·다른 창의 ⚙·영어 이어 열기', async () => {
  const fs = await import('node:fs');
  const read = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
  // #4 시계는 날짜를 **가장 먼저** 본다 — 🎯 제한 밖·쉼·화면 꺼짐보다 앞에서 (안 그러면 어제 기록에 연장권이 쓰인다)
  const tl = read('js/timelimit.js');
  const tick = tl.slice(tl.indexOf('function tick() {'), tl.indexOf('/** 모아 둔 초를 저장한다'));
  const iDay = tick.indexOf('dayKey() !== clock.today'); const iEx = tick.indexOf('if (clock.exempt) return;');
  assert.ok(iDay > 0 && iEx > 0 && iDay < iEx, '자정 확인이 제한 밖(exempt)보다 먼저');
  assert.match(tl, /rolling = flushTime\(\)\.catch\(\(\) => \{\}\)\.then\(\(\) => loadToday\(\)\)/, '모아 둔 초는 어제 기록에 먼저 저장하고 오늘을 읽는다');
  // #4·#5 연장권 쓰기 — 날짜를 다시 확인하고, 이 창의 이어 할 것을 기다리기 **전에** 붙잡고, 이어 하기 전에 잠김을 다시 본다
  const up = read('js/timeup.js');
  const doEx = up.slice(up.indexOf('async function doExtend() {'), up.indexOf('export function closeTimeUp() {'));
  assert.ok(doEx.indexOf('const retry = retryFn;') < doEx.indexOf('await ensureToday()'), '기다리기 전에 retry를 붙잡는다');
  assert.ok(doEx.indexOf('await ensureToday()') < doEx.indexOf('useExtend('), '쓰기 전에 오늘 날짜로');
  assert.match(doEx, /closeCb = retry \? \(\) => \{ if \(!isLocked\(s\)\) retry\(\); \} : null;/, '그 과목이 정말 풀렸을 때만 이어서');
  assert.match(doEx, /const here = seq === openSeq && box && !box\.hidden;/, '그 사이 다른 창이 열렸으면 그 창은 건드리지 않는다');
  assert.equal((up.match(/openSeq \+= 1;/g) || []).length, 2, '열 때·닫을 때 둘 다');
  // #6 다른 창에서 바꾼 ⚙ 시간 제한·연장권 한도를 이 창도 따른다
  assert.match(read('js/player.js'), /window\.addEventListener\('storage', \(e\) => \{[\s\S]{0,300}for \(const k of \['timeLimit', 'timeWeekday', 'timeWeekend', 'timeExtMax'\]\)/);
  // #7 영어 영상·🔁 복습도 잠금 뒤 "계속하기"로 이어서 연다 — 이어 할 것 없이 부르는 곳이 남지 않았다
  const lib = read('js/library.js');
  assert.equal((lib.match(/guardStart\('english', \(\) => \{ open\(\)/g) || []).length, 2);
  assert.doesNotMatch(lib, /guardStart\('english'\)/);
});
