// 📈 주간 흐름 (2026-10-18, 아버님 "이대로 진행") — 주 나누기 · 과목별 셈 · 잘린 일지는 — · 지난주와 견줌 · 표 글자 · 📤 글 · 잇기
// node --test tests/weekly.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { WEEKS, keyNum, numKey, weekWindows, weeklyModel, fmtVal, trendOf, weeklyHtml, weeklyMd } from '../js/weekly.js';
import { dayNum, READS_MAX } from '../js/korean.js';
import { gatherFiles } from '../js/upload.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const TODAY = '2026-10-18';
const T = keyNum(TODAY);
const day = (k) => numKey(T - k); // k일 전 'YYYY-MM-DD'
const rowOf = (m, g, label) => m.groups.find((x) => x.key === g).rows.find((r) => r.label === label);
const vals = (m, g, label) => rowOf(m, g, label).values;

test('🗓️ 주 나누기 — 최근 7일씩 4주(오래된 → 이번 주) · 빈틈·겹침 없음 · 이번 주는 오늘까지 · 날 번호는 국어 dayNum과 같은 셈', () => {
  const w = weekWindows(TODAY);
  assert.equal(w.length, WEEKS);
  assert.equal(w[3].to, T);
  assert.equal(w[3].name, '이번 주');
  assert.equal(w[2].name, '지난주');
  for (let i = 0; i < w.length; i++) {
    assert.equal(w[i].to - w[i].from, 6, '7일');
    if (i) assert.equal(w[i].from, w[i - 1].to + 1, '이어짐');
  }
  assert.equal(w[3].label, '10/12~10/18');
  assert.equal(w[0].label, '9/21~9/27');
  assert.equal(numKey(keyNum('2026-02-28') + 1), '2026-03-01');
  assert.equal(keyNum('2026-10-18'), dayNum(new Date(2026, 9, 18, 15, 30).getTime()), '국어 기록의 날 번호와 같다');
  assert.equal(keyNum('x'), 0);
});

test('📅🎤 공통·영어 — daily를 주마다 더함 · 7일 전 날은 지난주 · 시도가 없으면 비율은 — · 처음 통과한 문장은 목록 길이', () => {
  const daily = [
    { date: day(0), enTime: 600, mathTime: 0, korTime: 0, speakAttempts: 10, speakPass: 7, speakFirstKeys: ['a', 'b'], puzzles: 4, puzzleSolved: 3, speakSkipBtn: 1 },
    { date: day(6), enTime: 300, speakAttempts: 10, speakPass: 9, speakFirstKeys: ['c'] },
    { date: day(7), enTime: 120, speakAttempts: 4, speakPass: 1, speakSkipBtn: 3 }, // 지난주
    { date: day(8) }, // 아무것도 안 함 — 공부한 날이 아니다
    { date: day(30), enTime: 999 }, // 4주보다 오래됨
    { date: 'x', enTime: 5 }, null,
  ];
  const m = weeklyModel({ daily }, TODAY);
  assert.deepEqual(vals(m, 'all', '공부한 날'), [0, 0, 1, 2]);
  assert.deepEqual(vals(m, 'all', '🎤 영어 시간'), [0, 0, 120, 900]);
  assert.deepEqual(vals(m, 'en', '말하기 통과율'), [null, null, 0.25, 0.8]);
  assert.deepEqual(vals(m, 'en', '그날 처음 통과한 문장(날마다 더함)'), [0, 0, 0, 3]);
  // 깨진 값(분자 > 분모)은 비율로 안 보인다 (Codex 94차 #6)
  const bad = weeklyModel({ daily: [{ date: day(0), speakPass: 1e308, speakAttempts: 1 }] }, TODAY);
  assert.deepEqual(vals(bad, 'en', '말하기 통과율'), [null, null, null, null]);
  assert.deepEqual(vals(m, 'en', '퍼즐 정답률'), [null, null, null, 0.75]);
  assert.deepEqual(vals(m, 'en', '직접 넘김'), [0, 0, 3, 1]);
  assert.deepEqual(trendOf(rowOf(m, 'en', '말하기 통과율')), { mark: '↑', tone: 'good' });
  assert.deepEqual(trendOf(rowOf(m, 'en', '직접 넘김')), { mark: '↓', tone: 'good' }, '넘김은 줄면 좋아짐');
});

test('🔢 수학 — 푼 문제·정답률은 daily · 개념 편은 시작한 날(sd) · 통과 = 다 맞힘 또는 실수 하나 고쳐(sl) · 끝까지 이어 푼 편의 그만두기는 뺌 · 걸린 시간 가운데값', () => {
  const daily = [{ date: day(1), mathQ: 20, mathOk: 15 }, { date: day(9), mathQ: 10, mathOk: 9 }];
  const log = [
    { d: day(1), id: 'C1', mode: 'learn', ok: 5, n: 5, qs: [{ s: 10 }, { s: 30 }] },
    { d: day(1), id: 'C2', mode: 'review', ok: 4, n: 5, sl: 1, qs: [{ s: 20 }] },
    { d: day(1), id: 'C3', mode: 'practice', ok: 2, n: 5 },
    { d: day(7), sd: day(8), id: 'C4', mode: 'learn', ok: 5, n: 5 }, // 지난주에 시작 — 지난주로 센다 (끝낸 날 d는 일지의 가장 이른 날 = 지난주 마지막 날)
    { d: day(0), sd: day(7), id: 'C8', mode: 'review', ok: 5, n: 5 }, // 지난주 마지막 날 시작 · 오늘 끝냄 — 시작한 주(지난주)로 센다
    { d: day(1), id: 'C9', mode: 'learn' }, // 깨진 줄(문항 수 없음) — 통과로도 못 넘김으로도 안 센다 (Codex 94차 #5)
    { d: day(1), rid: 'r7', id: 'C1', mode: 'learn', ok: 5, n: 5 }, { d: day(1), rid: 'r7', id: 'C1', mode: 'learn', ok: 5, n: 5 }, // 같은 편이 두 번 — 한 번만
    { d: day(2), mode: 'quit', ok: 1, n: 5, of: 'C5' },
    { d: day(2), mode: 'quit', rid: 'r9', ok: 1, n: 5 }, { d: day(2), rid: 'r9', id: 'C5', mode: 'learn', ok: 5, n: 5 }, // 이어서 끝냄 — 그만두기 아님
    { d: day(3), mode: 'diag', ok: 3, n: 5 }, // 진단은 개념 편이 아니다
  ];
  const m = weeklyModel({ daily, math: { log }, logMax: 400 }, TODAY);
  assert.deepEqual(vals(m, 'math', '푼 문제'), [0, 0, 10, 20]);
  assert.deepEqual(vals(m, 'math', '정답률'), [null, null, 0.9, 0.75]);
  assert.deepEqual(vals(m, 'math', '개념 통과'), [0, 0, 2, 4], '지난주 C4·C8(시작한 주) · 이번 주 C1 · C2(실수 고쳐) · C5(이어 끝냄) · r7(두 번 적혔어도 한 번)');
  assert.deepEqual(vals(m, 'math', '못 넘긴 편'), [0, 0, 0, 1]);
  assert.deepEqual(vals(m, 'math', '그만두기'), [0, 0, 0, 1]);
  assert.deepEqual(vals(m, 'math', '실수 하나 고쳐 통과'), [0, 0, 0, 1]);
  assert.deepEqual(vals(m, 'math', '문제당 걸린 시간(가운데값)'), [null, null, null, 20]);
  assert.equal(m.groups.find((g) => g.key === 'math').note, '');
  // 일지가 꽉 차 옛 줄이 밀려났으면 일지가 시작된 날보다 앞선 주는 — (0이 아니다)
  const cut = weeklyModel({ daily, math: { log }, logMax: log.length }, TODAY);
  assert.deepEqual(vals(cut, 'math', '개념 통과'), [null, null, null, 4], '일지 첫 줄이 지난주 마지막 날 — 이번 주는 다 있고, 지난주는 잘렸을 수 있어 —');
  // 일지 첫 줄이 이번 주 첫날이면 그날 앞부분이 지워졌을 수 있다 → 이번 주도 — (Codex 94차 #1)
  const edge = weeklyModel({ daily, math: { log: log.map((e) => (e.id === 'C4' ? { ...e, d: day(6) } : e)) }, logMax: log.length }, TODAY);
  assert.deepEqual(vals(edge, 'math', '개념 통과'), [null, null, null, null]);
  // 일지 첫 줄이 이번 주 한가운데면 이번 주도 일부가 잘렸을 수 있다 → —
  const mid = weeklyModel({ daily, math: { log: log.map((e) => (e.id === 'C4' ? { ...e, d: day(2) } : e)) }, logMax: log.length }, TODAY);
  assert.deepEqual(vals(mid, 'math', '개념 통과'), [null, null, null, null]);
  assert.deepEqual(vals(cut, 'math', '푼 문제'), [0, 0, 10, 20], 'daily 칸은 그대로');
  assert.match(cut.groups.find((g) => g.key === 'math').note, /최근 \d+편까지만/);
  assert.deepEqual(trendOf(rowOf(m, 'math', '그만두기')), { mark: '↑', tone: 'bad' }, '그만두기가 늘면 덜함');
});

test('📚 국어 — 읽은 글 · 처음 읽을 때(★를 받은 판, v314) · 다시 읽을 때(★★·★★★) 첫 번에 맞힘 · 📍 근거(v·k) · 🧠 적기 전 주는 — · 별·낱말·퍼즐 한 날 · 잘린 일지는 —', () => {
  const N = (k) => T - k;
  const reads = [
    { c: 'K1', t: 1000, d: N(9), n: 4, f: 2, s: 100, g: 1 }, // 지난주 첫 읽기(★)
    { c: 'K1', t: 2000, d: N(2), n: 4, f: 4, s: 100, g: 2 }, // 다시 읽기(★★) — 처음 읽기 셈에서 빠짐
    { c: 'K2', t: 3000, d: N(1), n: 4, f: 3, s: 100, g: 1, v: 10, w: 1, k: 1, y: 0 },
    { c: 'K3', t: 4000, d: N(0), n: 2, f: 1, s: 100, g: 1, v: 30, w: 0, k: 0, y: 2 },
    { c: 'K4', t: 5000, d: N(0), n: 4, f: 0, s: 100, g: 0 }, // 별 없이 다시 읽음 — 읽은 글에만
  ];
  const profile = { korReads: reads, korDone: { 'K1:1': N(9), 'K2:1': N(1), 'K3:1': N(0) }, korWordDay: { [N(0)]: 1, [N(10)]: 2 }, korPuzzleDay: { [N(1)]: 1 } };
  const m = weeklyModel({ profile }, TODAY);
  assert.deepEqual(vals(m, 'kor', '읽은 글'), [0, 0, 1, 4]);
  assert.deepEqual(vals(m, 'kor', '처음 읽을 때 첫 번에 맞힘'), [null, null, 0.5, 4 / 6]);
  assert.deepEqual(vals(m, 'kor', '다시 읽을 때 첫 번에 맞힘(★★·★★★)'), [null, null, null, 1], '★★·★★★를 받은 판만 (별 없이 다시 읽은 K4는 빠짐)');
  assert.deepEqual(vals(m, 'kor', '📍 근거 찾는 데 걸린 시간(가운데값)'), [null, null, null, 20]);
  assert.deepEqual(vals(m, 'kor', '📍 근거 찾은 뒤 첫 번에 맞힘'), [null, null, null, 0.5]);
  assert.deepEqual(vals(m, 'kor', '🧠 아는 것으로 답하기'), [null, null, null, null], '적기 전 읽기(K1 다시 읽기)가 섞인 주는 —');
  const allY = weeklyModel({ profile: { korReads: reads.filter((x) => x.y !== undefined) } }, TODAY);
  assert.deepEqual(vals(allY, 'kor', '🧠 아는 것으로 답하기'), [null, null, null, 2], '모두 적힌 주는 더한 수');
  assert.deepEqual(vals(m, 'kor', '새로 받은 별'), [0, 0, 1, 2]);
  assert.deepEqual(vals(m, 'kor', '🔤 낱말 한 날'), [0, 0, 1, 1]);
  assert.deepEqual(vals(m, 'kor', '🧩 퍼즐 한 날'), [0, 0, 0, 1]);
  // 읽기 일지가 꽉 찼으면 일지 첫 줄보다 앞선 주는 —
  // 일지 첫 줄 = 지난주 마지막 날(앞 10편) · 나머지는 이번 주
  const many = Array.from({ length: READS_MAX }, (_, i) => ({ c: `K${(i % 90) + 1}`, t: 10000 + i, d: i < 10 ? N(7) : N(3), n: 4, f: 4, s: 10 }));
  const cut = weeklyModel({ profile: { korReads: many } }, TODAY);
  assert.deepEqual(vals(cut, 'kor', '읽은 글'), [null, null, null, READS_MAX - 10]);
  const edge = weeklyModel({ profile: { korReads: many.map((x) => ({ ...x, d: x.d === N(7) ? N(6) : x.d })) } }, TODAY);
  assert.deepEqual(vals(edge, 'kor', '읽은 글'), [null, null, null, null], '일지 첫 줄이 이번 주 첫날이면 이번 주도 — (Codex 94차 #1)');
  // 🧠 적기 전 읽기가 한 편이라도 섞인 주는 — (일부만 더한 0을 그 주 전체처럼 보이지 않게, Codex 94차 #2)
  const mixed = weeklyModel({ profile: { korReads: [{ c: 'K5', t: 1, d: N(2), n: 4, f: 4, s: 10 }, { c: 'K6', t: 2, d: N(1), n: 4, f: 4, s: 10, y: 0 }] } }, TODAY);
  assert.deepEqual(vals(mixed, 'kor', '🧠 아는 것으로 답하기'), [null, null, null, null]);
  assert.match(m.groups.find((g) => g.key === 'kor').note, /처음 읽을 때 = 그 글로 ★를 받은 판 · 다시 읽을 때 = ★★·★★★를 받은 판 · 읽기 일지/, '"처음 읽을 때"의 기준과 어디로 셌는지를 밝힌다 (Codex 94차 #3 · v314)');
  assert.deepEqual(vals(cut, 'kor', '새로 받은 별'), [0, 0, 0, 0], '별 받은 날은 일지와 따로');
});

test('⏱️ 어디에 시간을 썼나 — 화면별 초의 몫 · 기록이 없는 주는 —', () => {
  const daily = [{ date: day(0), uMath: 600, uKor: 200, uEn: 200, uHouse: 300, uShop: 100, uCatch: 0, uBattle: 0, uDex: 100, uHome: 400, uStats: 50, uLock: 50 }];
  const m = weeklyModel({ daily }, TODAY);
  assert.deepEqual(vals(m, 'use', '공부 화면'), [null, null, null, 0.5]);
  assert.deepEqual(vals(m, 'use', '놀이 화면(집·상점·잡기·배틀·도감)'), [null, null, null, 0.25]);
});

test('🔤 값 글자 · ↑↓ — 없는 값은 — · %·분·초 · 분은 1분, %는 1%p 안 차이는 → · 좋은 쪽이 없으면 색 없음', () => {
  assert.deepEqual([fmtVal(null, '%'), fmtVal(0.456, '%'), fmtVal(3599, '분'), fmtVal(12.4, '초'), fmtVal(3, '편'), fmtVal(NaN, '개')], ['—', '46%', '60분', '12초', '3편', '—']);
  assert.deepEqual([fmtVal(1e308, '%'), fmtVal(-3, '개')], ['—', '—'], '깨진 큰 값·음수는 — (Codex 94차 #6)');
  const r = (values, unit = '개', good = 'up') => ({ unit, good, values });
  assert.deepEqual(trendOf(r([0, 0, 3, 5])), { mark: '↑', tone: 'good' });
  assert.deepEqual(trendOf(r([0, 0, 5, 3])), { mark: '↓', tone: 'bad' });
  assert.deepEqual(trendOf(r([0, 0, 0.5, 0.505], '%')), { mark: '→', tone: '' });
  assert.deepEqual(trendOf(r([0, 0, 600, 650], '분')), { mark: '→', tone: '' });
  assert.deepEqual(trendOf(r([0, 0, 600, 700], '분', null)), { mark: '↑', tone: '' });
  assert.deepEqual(trendOf(r([0, 0, null, 3])), { mark: '', tone: '' });
});

test('🖼️ 표 글자 · 📤 글 — 과목마다 표 하나 · 이번 주 칸 표시 · 글자는 태그로 못 들어감 · NaN 없음 · 📤 마크다운 표', () => {
  const m = weeklyModel({ daily: [{ date: day(0), enTime: 60 }] }, TODAY);
  m.groups[0].rows[0].label = '<b>x</b>';
  const h = weeklyHtml(m);
  assert.equal((h.match(/<table class="wk-t">/g) || []).length, 5);
  assert.ok(h.includes('&lt;b&gt;x&lt;/b&gt;') && !h.includes('<b>x'));
  assert.ok(h.includes('class="is-now"') && !/NaN|undefined/.test(h));
  const md = weeklyMd(weeklyModel({ daily: [{ date: day(0), enTime: 60 }] }, TODAY));
  assert.ok(md.startsWith('# 📈 주간 흐름 (2026-10-18)'));
  assert.ok(md.includes('| 공부한 날 | 0일 | 0일 | 0일 | 1일 | ↑ 좋아짐 |'));
  assert.ok(!/NaN|undefined/.test(md));
});

test('📤 올리기 — getWeekly가 있으면 usage/weekly.md · 못 만들면 그 글만 빼고 나머지는 그대로', async () => {
  const base = { getMath: async () => null, listDaily: async () => [], mathReportText: () => '', asksText: () => '', collectTodo: () => [], today: TODAY };
  const ok = await gatherFiles({ ...base, getWeekly: (t, days, math) => `W ${t} ${days.length} ${math}` });
  assert.deepEqual(ok.filter((f) => f.path === 'usage/weekly.md').map((f) => f.text), [`W ${TODAY} 0 null`]);
  const bad = await gatherFiles({ ...base, getWeekly: () => { throw new Error('x'); } });
  assert.ok(!bad.some((f) => f.path === 'usage/weekly.md') && bad.length > 0);
  const none = await gatherFiles(base);
  assert.ok(!none.some((f) => f.path === 'usage/weekly.md'));
});

test('🔌 잇기 — 📊 카드(이번 주 요약 위 · 못 그려도 나머지 그대로) · 📤 weeklyNow · 앱 셸 · 국어 읽기 줄의 🧠(y)', () => {
  const st = read('js/stats.js');
  assert.ok(st.includes("cw.insertAdjacentHTML('beforeend', weeklyHtml(weeklyModel({ daily, math, profile: getProfileSnapshot(), logMax: LOG_MAX }, today)));"));
  assert.ok(st.indexOf("card('📈 주간 흐름')") < st.indexOf("card('이번 주 (최근 7일)')"));
  assert.ok(st.indexOf("card('🚀 로켓단')") < st.indexOf("card('📈 주간 흐름')"));
  assert.ok(st.includes("for (const s of cw.querySelectorAll('.wk-scroll')) s.scrollLeft = s.scrollWidth;"), '폰에서는 최근 주가 먼저 보이게');
  assert.ok(read('css/style.css').includes('.wk-t th[scope="row"], .wk-t thead th:first-child { position: sticky; left: 0;'), '항목 이름은 왼쪽에 붙어 있게');
  const up = read('js/upload.js');
  assert.ok(up.includes('getWeekly: weeklyNow,'));
  assert.ok(read('sw.js').includes("'./js/weekly.js'"));
  assert.ok(read('js/korean.js').includes('y: add.know || 0'));
});
