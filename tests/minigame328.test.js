// 🎮 미니 게임 판 규칙 바꿈 (v328, 2026-10-23 아버님 "15분을 하면 미니 게임을 하나씩은" · "하루 12판까지로 하자") — node --test tests/minigame328.test.js
//  공부 15분마다 1판 · 수학·영어·국어·논술을 합친 오늘 공부 시간으로(나눠 해도 시간이 버려지지 않게) · 하루 12판 ·
//  🎮 게임기 화면에 규칙과 "오늘 공부 N분 · M분 더 하면 한 판" (아이가 얼마나 해야 하는지 몰라 헷갈렸다 — 공부 화면엔 셈을 안 띄운다) ·
//  ⚙ 옛 값(20분 · 과목마다 2판)이 저장된 태블릿도 한 번만 새 값으로
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GAME_MIN, GAME_CAP, studySec, studyPlays, earnedPlays, playState, playLimit } from '../js/minigame.js';
import { ruleLines, statusLines, MOOD_LINE, playNoteStep } from '../js/gameview.js';
import { emptyDaily } from '../js/db.js';

const src = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const MIN = 60;
const C = { min: GAME_MIN, cap: GAME_CAP };
/** 오늘 기록 — 분으로 */
const day = (m = {}) => ({ ...emptyDaily('2026-10-23'), mathTime: (m.math || 0) * MIN, enTime: (m.en || 0) * MIN, korTime: (m.kor || 0) * MIN, gameBonus: m.bonus || 0, gamePlays: m.used || 0 });

test('🎮 아버님 숫자: 공부 15분에 1판 · 하루 12판', () => {
  assert.equal(GAME_MIN, 15);
  assert.equal(GAME_CAP, 12);
});

test('🎮 과목을 합친 공부 시간 — 나눠 해도 버려지지 않는다 · 아직 저장 안 한 초까지 · 깨진 값은 0', () => {
  assert.equal(studySec(day({ math: 10, en: 3, kor: 7 })), 20 * MIN);
  assert.equal(studySec(day({ math: 10 }), { korean: 30, english: 15 }), 10 * MIN + 45);
  assert.equal(studySec(null), 0);
  assert.equal(studySec({ mathTime: -50, enTime: 'x', korTime: NaN }), 0);
  assert.equal(studyPlays(studySec(day({ math: 10, kor: 5 })), C), 1, '수학 10분 + 국어 5분 = 한 판 (전엔 과목마다 따로라 0판)');
  assert.equal(studyPlays(15 * MIN - 1, C), 0, '14분 59초는 아직');
  assert.equal(studyPlays(15 * MIN, C), 1);
  assert.equal(studyPlays(179 * MIN, C), 11);
  assert.equal(studyPlays(180 * MIN, C), 12, '3시간 = 12판');
  assert.equal(studyPlays(300 * MIN, C), 12, '더 해도 하루 12판까지');
  for (const bad of [-5, NaN, 'x', null, undefined]) assert.equal(studyPlays(bad, C), 0, String(bad));
  assert.equal(studyPlays(300 * MIN, { min: 15, cap: 0 }), 0, '0판(게임기 쉼)이면 공부로는 안 생긴다');
});

test('🎮 오늘 받은 판 · 다음 판까지 남은 공부 초 — 하루 끝까지 받았거나 쉬는 중이면 0', () => {
  assert.deepEqual(earnedPlays(day({ math: 20, kor: 17 }), C), { sec: 37 * MIN, study: 2, bonus: 0, total: 2, max: 12, next: 8 * MIN });
  assert.deepEqual(earnedPlays(day({ en: 200, bonus: 1 }), C), { sec: 200 * MIN, study: 12, bonus: 1, total: 13, max: 13, next: 0 }, '🔒 부모 판은 12판 위에 더');
  assert.equal(earnedPlays(day(), C).next, 15 * MIN, '아직 0분 — 15분 더');
  assert.equal(earnedPlays(day({ math: 100 }), { min: 15, cap: 0 }).next, 0);
  // 판을 쓸 때 트랜잭션 안의 끝도 같은 셈
  assert.equal(playLimit(C)(day({ math: 10, en: 10, kor: 10 })), 2);
});

test('🎮 게임기 화면 설명 — 규칙 세 줄(분·하루 판·그날만·가만히 두면 안 셈) · 쉬는 중이면 없음', () => {
  assert.deepEqual(ruleLines(C), [
    '공부 15분마다 한 판 (수학·영어·국어·논술 모두 세요)',
    '하루 12판까지 · 받은 판은 오늘만 (밤 12시가 지나면 없어져요)',
    '공부 화면을 켜 두기만 하고 가만히 있으면 안 세요',
  ]);
  assert.match(ruleLines({ min: 20, cap: 8 }).join(' '), /공부 20분마다 한 판[\s\S]*하루 8판까지/, '⚙ 값 그대로');
  assert.deepEqual(ruleLines({ min: 15, cap: 0 }), []);
});

test('🎮 게임기 화면 설명 — 오늘 형편: 공부 분 → 받은 판(한 판) · 몇 분 더 하면 한 판 · 다 받았으면', () => {
  const st = (m, c = C) => statusLines(playState(day(m), c));
  assert.deepEqual(st({ math: 20, kor: 17, used: 1 }), ['오늘 공부 37분 → 🎮 2판 받았어요 (1판 했어요)', '📚 8분 더 공부하면 한 판이 생겨요']);
  assert.deepEqual(st({}), ['오늘 공부 0분', '📚 15분 더 공부하면 한 판이 생겨요'], '아직 안 했을 때');
  assert.deepEqual(st({ math: 16 }), ['오늘 공부 16분 → 🎮 1판 받았어요', '📚 14분 더 공부하면 한 판이 생겨요'], '안 한 판은 말하지 않는다');
  // 30초 남음 — 0분이 아니라 1분
  assert.deepEqual(statusLines({ mood: 'study', left: 0, sec: 14 * MIN + 30, total: 0, used: 0, next: 30, cap: 12 }), ['오늘 공부 14분', '📚 1분 더 공부하면 한 판이 생겨요']);
  // 12판을 다 받았고 남은 판이 있다 — "다 받았어요" · 다 썼으면 맨 위 말(🌙 오늘 게임은 끝)이 하므로 한 줄만
  assert.deepEqual(st({ en: 200, used: 3 }), ['오늘 공부 200분 → 🎮 12판 받았어요 (3판 했어요)', '🌙 오늘 공부로 받을 판은 다 받았어요']);
  assert.deepEqual(st({ en: 200, used: 12 }), ['오늘 공부 200분 → 🎮 12판 받았어요 (12판 했어요)']);
  assert.equal(playState(day({ en: 200, used: 12 }), C).mood, 'done');
  assert.deepEqual(st({ math: 100, bonus: 1 }, { min: 15, cap: 0 }), [], '게임기 쉼이면 셈 없이(맨 위 💤 말만)');
  // 맨 위 한 줄(MOOD_LINE)은 그대로 숫자 없이
  for (const line of Object.values(MOOD_LINE)) assert.ok(!/\d/.test(line), line);
});

test('🎮 화면 연결 — 게임기 첫 화면에 형편·규칙 · 공부하는 동안 알림은 합친 시간으로 · ⚙ 부모 줄', () => {
  const gv = src('js/gameview.js');
  const pick = gv.slice(gv.indexOf('function renderPick('), gv.indexOf('const list = el(\'div\', \'gm-list\');'));
  assert.ok(pick.includes('const now = statusLines(st);') && pick.includes('const rules = ruleLines(conf);'), '게임 목록 위에');
  assert.ok(pick.includes("box.appendChild(el('p', 'gm-rule-title', '🎮 미니 게임은 이렇게 생겨요'));"));
  assert.ok(gv.includes('  const n = studyPlays(studySec(dailyNow()), conf);'), '알림도 과목을 합친 시간으로');
  assert.ok(gv.includes('  if (!currentSubject()) return;'), '알림은 공부 화면에서만');
  assert.ok(gv.includes("return `오늘 — 공부 ${Math.floor(e.sec / 60)}분 (${by}) · 받은 판 ${e.total}"));
  assert.ok(!/subjectPlays/.test(gv + src('js/minigame.js')), '과목마다 따로 세던 셈은 없앰');
  const css = src('css/style.css');
  for (const c of ['.gm-now ', '.gm-rule ', '.gm-rule-list ']) assert.ok(css.includes(c), c);
});

test('🎮 ⚙ — 「하루 최대」 0~20판(12 포함) · 옛 값이 저장된 태블릿은 한 번만 새 값으로(분은 옛 기본값 20일 때만 · 0판 게임기 쉼은 그대로)', () => {
  const html = src('index.html');
  const sel = html.slice(html.indexOf('<select id="set-game-cap">'), html.indexOf('</select>', html.indexOf('<select id="set-game-cap">')));
  const vals = [...sel.matchAll(/<option value="(\d+)">/g)].map((m) => Number(m[1]));
  assert.deepEqual(vals, [0, 4, 6, 8, 10, 12, 16, 20]);
  assert.ok(html.includes('<span class="field-label">하루 최대</span>'));
  assert.ok(html.includes('수학·영어·국어·논술을 합쳐 셈'));
  const pl = src('js/player.js');
  assert.ok(pl.includes("  if (!s.gameRule328) {\n    if (Number(s.gameMin) === 20) s.gameMin = GAME_MIN;\n    if (Number(s.gameCap) !== 0) s.gameCap = GAME_CAP;\n    s.gameRule328 = true;\n    try { localStorage.setItem('shincoach.settings', JSON.stringify(s)); } catch { /* 무시 */ }\n  }"));
  // 옮기기 규칙을 그대로 돌려 본다 (loadSettings 안의 그 조각)
  const bump = (saved) => {
    const s = { gameMin: GAME_MIN, gameCap: GAME_CAP, ...saved };
    if (!s.gameRule328) {
      if (Number(s.gameMin) === 20) s.gameMin = GAME_MIN;
      if (Number(s.gameCap) !== 0) s.gameCap = GAME_CAP;
      s.gameRule328 = true;
    }
    return [s.gameMin, s.gameCap];
  };
  assert.deepEqual(bump({ gameMin: 20, gameCap: 2 }), [15, 12], '옛 기본값');
  assert.deepEqual(bump({ gameMin: 30, gameCap: 3 }), [30, 12], '일부러 고친 분은 그대로 · 상한은 뜻이 바뀌어 새 값');
  assert.deepEqual(bump({ gameMin: 20, gameCap: 0 }), [15, 0], '게임기 쉼은 그대로');
  assert.deepEqual(bump({}), [15, 12], '처음 쓰는 기기');
  assert.deepEqual(bump({ gameMin: 20, gameCap: 4, gameRule328: true }), [20, 4], '한 번 옮긴 뒤 아버님이 고친 값은 그대로');
});

// ───────────────────── 🔍 Codex 132차 ─────────────────────

test('🔍 Codex 132차 #1 — "N분 더"는 실제로 놀 수 있는 판이 생기는 때: 쓴 판이 받은 판보다 많으면(⚙에서 분을 늘림·다른 기기) 그만큼 더 · 더 못 받으면 말 안 함', () => {
  // 30분 공부로 2판을 쓴 뒤 ⚙에서 30분에 1판으로 — 받은 판 1 · 쓴 판 2 → 60분 더 해야 놀 수 있다 (30분이 아니다)
  const c30 = { min: 30, cap: 12 };
  const a = playState(day({ math: 30, used: 2 }), c30);
  assert.deepEqual([a.left, a.mood, a.next], [0, 'study', 60 * MIN]);
  assert.deepEqual(statusLines(a), ['오늘 공부 30분 → 🎮 1판 받았어요 (2판 했어요)', '📚 60분 더 공부하면 한 판이 생겨요']);
  // 쓴 판이 오늘 끝(12 + 선물)을 넘었다 — 더 공부하라고 하지 않는다 · 🌙 오늘 게임은 끝
  const b = playState(day({ math: 30, used: 13 }), C);
  assert.deepEqual([b.left, b.mood, b.next], [0, 'done', 0]);
  assert.deepEqual(statusLines(b), ['오늘 공부 30분 → 🎮 2판 받았어요 (13판 했어요)']);
  // 약속 검사 — 여러 형편에서 next초를 더 공부하면 놀 수 있는 판이 정확히 하나 더 생기고, 1초 모자라면 안 생긴다
  for (const min of [15, 20, 30]) for (const cap of [4, 12]) for (const bonus of [0, 2]) for (let used = 0; used <= 15; used += 3) for (let s = 0; s <= 200; s += 13) {
    const c = { min, cap };
    const d = { ...day({ bonus, used }), mathTime: s * MIN };
    const st = playState(d, c);
    const avail = (sec) => Math.max(0, playLimit(c)({ ...d, mathTime: sec }) - used);
    const tag = `${min}분 ${cap}판 선물${bonus} 씀${used} ${s}분`;
    if (st.next > 0) {
      assert.equal(avail(s * MIN + st.next), st.left + 1, `${tag}: next초 뒤 한 판 더`);
      assert.equal(avail(s * MIN + st.next - 1), st.left, `${tag}: 1초 모자라면 그대로`);
    } else {
      assert.equal(avail(100000 * MIN), st.left, `${tag}: next 0이면 오늘은 더 안 생긴다`);
    }
  }
});

test('🔍 Codex 132차 #2 — 판이 생겼어요 알림은 판마다 한 번: 과목을 옮기며 저장하는 사이 합친 시간이 잠깐 줄었다 돌아와도 또 울리지 않음 · 날·⚙가 바뀌면 기준만 새로', () => {
  const seen = { day: '', n: null, key: '' };
  const ring = (n, d = '2026-10-23', k = '15:12') => playNoteStep(seen, d, k, n);
  assert.equal(ring(0), false, '처음은 기준만 (앱을 켜자마자 안 울림)');
  assert.equal(ring(1), true, '15분 — 한 판');
  assert.equal(ring(0), false, '저장하는 사이 잠깐 줄었다 (flushTime이 모아 둔 초를 먼저 비움)');
  assert.equal(ring(1), false, '돌아왔다 — 같은 판을 또 알리지 않는다');
  assert.equal(ring(2), true, '30분 — 다음 판');
  assert.equal(ring(1, '2026-10-23', '30:12'), false, '⚙에서 분을 늘렸다 — 기준만 새로');
  assert.equal(ring(2, '2026-10-23', '30:12'), true);
  assert.equal(ring(0, '2026-10-24', '30:12'), false, '날이 바뀌면 기준만 새로');
  assert.equal(ring(1, '2026-10-24', '30:12'), true);
  const gv = src('js/gameview.js');
  assert.ok(!/n < seen\.n/.test(gv), '기준을 내리는 줄이 없다');
});

test('🔍 Codex 132차 #3 — 🔒 부모가 준 판은 「🎁 선물 N판」으로 따로 (공부로 받은 판과 섞지 않는다)', () => {
  const st = (m) => statusLines(playState(day(m), C));
  assert.deepEqual(st({ bonus: 1 }), ['오늘 공부 0분 · 🎁 선물 1판', '📚 15분 더 공부하면 한 판이 생겨요'], '공부 0분인데 "1판 받았어요"라고 하지 않는다');
  assert.deepEqual(st({ en: 200, bonus: 1, used: 3 }), ['오늘 공부 200분 → 🎮 12판 받았어요 · 🎁 선물 1판 (3판 했어요)', '🌙 오늘 공부로 받을 판은 다 받았어요'], '하루 12판과 어긋나 보이지 않게');
  assert.deepEqual(st({ math: 20, kor: 17, bonus: 2, used: 1 }), ['오늘 공부 37분 → 🎮 2판 받았어요 · 🎁 선물 2판 (1판 했어요)', '📚 8분 더 공부하면 한 판이 생겨요']);
});
