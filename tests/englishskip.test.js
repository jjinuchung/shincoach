// 🎤 영어 ⏭ 넘기기 (2026-10-14 v253, 노가다 탈출구 — 영어)
//  · 🏁 영상 보상은 🎤 말해 본 문장(통과·3번 해 봄·말하기 확인을 안 하는 줄)으로 — ⏭로 넘긴 문장은 영상은 넘어가도 🏁 칸이 안 찬다
//  · ⏭ 직접 넘김과 3번 해 보고 넘어감을 따로 세어 📊와 📤 영어 요약(english/날짜.md)에
//  · 🎤 연속 성공 보너스 · 한 번 더 읽기 기본값 (화면 쪽은 tests/player.logic.test.js · 기록 쪽은 tests/track.test.js)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { saidOf, saidFlag, mergeStatRecord, emptyDaily, mergeDailyDelta } from '../js/db.js';
import { contentSummary, weekSeries, cueKeysOf, cueCountOf } from '../js/stats.js';
import { playableStarts, countPlayableCues } from '../js/srt.js';
import { englishFiles, gatherFiles, EN_VIDEOS } from '../js/upload.js';
import { SPEAK_COMBO, VIDEO_STONE, videoStoneDue } from '../js/items.js';

const read = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const T = '2026-10-14';
const row = (o) => ({ key: 'x|10', itemId: 'x', start: 1, done: true, speakAttempts: 0, speakPass: 0, speakFail: 0, speakSkipped: 0, ...o });

test('🎤 saidOf — 새 줄(v 2)은 said만 · 옛 줄은 통과·두 번 이상 틀린 뒤 넘어감·말하기 기록 없음 · 끝내지 않은 문장은 아니다', () => {
  assert.equal(saidOf(row({ v: 2, said: 1 })), true);
  assert.equal(saidOf(row({ v: 2, said: 0, speakPass: 3 })), false, '새 줄은 옛 규칙을 안 본다');
  assert.equal(saidOf(row({ v: 2, said: 1, done: false })), false, '끝내지 않은 문장');
  assert.equal(saidOf(row({ speakAttempts: 1, speakPass: 1 })), true, '옛 줄 통과');
  assert.equal(saidOf(row({ speakAttempts: 3, speakFail: 2, speakSkipped: 1 })), true, '옛 줄 두 번 틀린 뒤 넘어감');
  assert.equal(saidOf(row({ speakAttempts: 2, speakFail: 1, speakSkipped: 1 })), false, '옛 줄 한 번 틀린 뒤 넘어감(⏭일 수 있다)');
  assert.equal(saidOf(row({ speakAttempts: 1, speakSkipped: 1 })), false, '옛 줄 ⏭만');
  assert.equal(saidOf(row({})), true, '옛 줄 말하기 기록 없음(영어가 아닌 대사·마이크 없음·말하기 확인 끔)');
  assert.equal(saidOf(row({ done: false })), false);
  assert.equal(saidOf(null), false);
  assert.equal(saidFlag(row({ done: false, v: 2, said: 1 })), true, 'saidFlag는 끝냈는지 안 본다');
});

test('🎤 백업 합치기 — ⏭·3번 넘어감은 큰 값 · 말해 본 표시는 한쪽이라도(옛 줄은 옛 규칙으로 읽어 새 꼴로) · 어느 쪽에서 합쳐도 같다 · 둘 다 옛 줄이면 그대로', () => {
  const a = row({ v: 2, said: 0, speakSkipBtn: 2, speakGaveUp: 0, speakAttempts: 2, speakSkipped: 2 });
  const b = row({ v: 2, said: 1, speakSkipBtn: 1, speakGaveUp: 1, speakAttempts: 4, speakFail: 2, speakSkipped: 2 });
  for (const [x, y] of [[a, b], [b, a]]) {
    const m = mergeStatRecord('sentenceStats', x, y);
    assert.deepEqual([m.speakSkipBtn, m.speakGaveUp, m.said, m.v], [2, 1, 1, 2]);
  }
  const oldPass = row({ speakAttempts: 1, speakPass: 1 });
  const newSkip = row({ v: 2, said: 0, speakSkipBtn: 1, speakAttempts: 1, speakSkipped: 1 });
  for (const [x, y] of [[oldPass, newSkip], [newSkip, oldPass]]) {
    const m = mergeStatRecord('sentenceStats', x, y);
    assert.deepEqual([m.said, m.v], [1, 2], '옛 줄이 통과였으면 말해 본 문장');
  }
  const oldSkip = row({ speakAttempts: 1, speakSkipped: 1 });
  for (const [x, y] of [[oldSkip, newSkip], [newSkip, oldSkip]]) assert.equal(mergeStatRecord('sentenceStats', x, y).said, 0, '옛 줄도 ⏭만이면 아니다');
  const both = mergeStatRecord('sentenceStats', oldPass, oldSkip);
  assert.equal('v' in both || 'said' in both, false, '둘 다 옛 줄이면 새 칸을 만들지 않는다');
  assert.equal(saidOf(both), true, '옛 규칙 그대로(큰 값으로 합친 수)');
});

test('🎤 오늘 기록 — ⏭ 직접 넘김·3번 넘어감·연속 보너스는 더하는 수(두 창 합) · 백업 합치기는 큰 값', () => {
  const d = emptyDaily(T);
  assert.deepEqual([d.speakSkipBtn, d.speakGaveUp, d.speakCombos], [0, 0, 0]);
  const m = mergeDailyDelta(mergeDailyDelta(d, T, { speakSkipBtn: 2, speakGaveUp: 1 }), T, { speakSkipBtn: 1, speakCombos: 1 });
  assert.deepEqual([m.speakSkipBtn, m.speakGaveUp, m.speakCombos], [3, 1, 1]);
  const bk = mergeStatRecord('daily', { ...emptyDaily(T), speakSkipBtn: 5 }, { ...emptyDaily(T), speakSkipBtn: 2, speakCombos: 3 });
  assert.deepEqual([bk.speakSkipBtn, bk.speakCombos], [5, 3]);
});

test('🏁 contentSummary — said·saidPct(말해 본 문장)와 pct(한 문장)는 따로 · videoStoneDue는 saidPct로 · 📊 진행률·수학 이야기 세계는 pct 그대로', () => {
  const items = [{ id: 'x', title: '가' }];
  const recs = Array.from({ length: 10 }, (_, i) => row({ key: `x|${i}`, start: i, v: 2, said: i < 8 ? 1 : 0 }));
  const [s] = contentSummary(items, recs, () => 10);
  assert.deepEqual([s.done, s.said, s.pct, s.saidPct], [10, 8, 100, 80]);
  assert.deepEqual(videoStoneDue([s], {}), [], '한 문장 100%여도 말해 본 문장 80%면 없음');
  recs[8].said = 1; recs[9].said = 1;
  const [s2] = contentSummary(items, recs, () => 10);
  assert.equal(videoStoneDue([s2], {}).length, 1);
  assert.equal(VIDEO_STONE.pct, 90);
  assert.match(read('js/math.js'), /worlds = seenWorlds\(contentSummary\(/, '수학 이야기 세계는 같은 요약의 pct');
  assert.match(read('js/mathprog.js'), /s\.pct/, '그대로 pct');
});

test('📊 weekSeries — 날마다 ⏭ 직접 넘김·3번 넘어감·연속 보너스 (그 전 날은 0) · 화면 줄 · 어려워한 문장 까닭 셋', () => {
  const days = [{ ...emptyDaily(T), doneKeys: ['a'], speakSkipBtn: 2, speakGaveUp: 1, speakCombos: 1 }, { date: '2026-10-13', doneKeys: [], seconds: 9, speakAttempts: 1, speakPass: 1 }];
  const w = weekSeries(days, T);
  const t = w.find((d) => d.date === T);
  const y = w.find((d) => d.date === '2026-10-13');
  assert.deepEqual([t.speakSkipBtn, t.speakGaveUp, t.speakCombos], [2, 1, 1]);
  assert.deepEqual([y.speakSkipBtn, y.speakGaveUp, y.speakCombos], [0, 0, 0], 'v253 전 날');
  const st = read('js/stats.js');
  assert.ok(st.includes("sum.appendChild(kpi(`⏭ ${wSkip}`, `직접 넘김 · 3번 해 보고 넘어감 ${wGave}`));"));
  assert.ok(st.includes("`${s.pct}% · ${s.done}/${s.total}문장 · 🎤 말한 문장 ${s.said} · ⭐${s.mastered}`"));
  for (const w2 of ['`⏭ 직접 넘김 ${btn}회`', '`3번 해 보고 넘어감 ${gave}회`', '`넘어감 ${oldSkip}회(옛 기록)`']) assert.ok(st.includes(w2), w2);
  assert.ok(!st.includes('3번 미달로 통과'), '섞인 옛 말이 남지 않게');
});

test('📤 영어 요약(english/날짜.md) — 최근 7일 날마다 넘김·말하기 · 최근에 연 영상 10편의 말해 본 문장 · 깨진·안 연 영상은 빼고 · 아이 이름 없이', () => {
  const days = [{ date: T, doneKeys: ['a', 'b', 'c'], speakAttempts: 6, speakPass: 3, speakSkipBtn: 2, speakGaveUp: 1, speakCombos: 1 }, { date: '2026-10-08', doneKeys: [], speakAttempts: 0 }, { date: '2026-10-01', doneKeys: ['z'], speakAttempts: 1 }];
  const sums = [
    { id: 'a', title: '오래된 것', total: 100, done: 50, said: 40, saidPct: 40, lastAt: 1 },
    { id: 'b', title: '최근 것', total: 10, done: 10, said: 9, saidPct: 90, lastAt: 9 },
    { id: 'c', title: '깨짐', total: 10, broken: true, lastAt: 99 },
    { id: 'd', title: '안 연 것', total: 10, lastAt: 0 },
    ...Array.from({ length: 12 }, (_, i) => ({ id: `m${i}`, title: `영상${i}`, total: 5, done: 1, said: 1, saidPct: 20, lastAt: 2 + i / 100 })),
  ];
  const [f] = englishFiles(days, sums, T);
  assert.equal(f.path, `english/${T}.md`);
  const L = f.text.split('\n');
  assert.equal(L[0], `🎤 영어 기록 (${T}) — ⏭ 직접 넘김과 3번 해 보고 넘어감은 v253부터 따로 셉니다 (그 전 날은 0)`);
  assert.ok(f.text.includes(`- 10-14: 한 문장 3 · 🔁 복습 문장 0 · 🎤 말하기 통과 3/6 · ⏭ 직접 넘김 2 · 3번 해 보고 넘어감 1 · 🎤 연속 보너스 1번\n`));
  assert.ok(f.text.includes('- 10-08: (영어 기록 없음)\n'), '아무것도 안 한 날');
  assert.ok(!f.text.includes('10-01'), '7일 밖');
  assert.equal(L.filter((l) => /^- \d\d-\d\d: /.test(l)).length, 7, '7일 다');
  assert.ok(f.text.includes(`## 영상 (최근에 연 순서, ${EN_VIDEOS}편까지) — 🏁 영상 보상은 🎤 말해 본 문장이 ${VIDEO_STONE.pct}% 이상일 때`));
  const vids = L.filter((l) => l.startsWith('- 「'));
  assert.equal(vids.length, EN_VIDEOS);
  assert.match(vids[0], /^- 「최근 것」 한 문장 10\/10 · 🎤 말해 본 문장 9\/10 \(90%\)$/);
  assert.ok(!f.text.includes('깨짐') && !f.text.includes('안 연 것') && !f.text.includes('오래된 것'), '깨진·안 연 영상 빼고 10편까지');
  assert.ok(f.text.endsWith('\n') && !f.text.includes(String.fromCharCode(0xC9C4, 0xC6B0)), '아이 이름 없이');
  assert.ok(englishFiles([], [], T)[0].text.includes('(연 영상 없음)'));
});

test('📤 gatherFiles — getEnglish가 있으면 english/날짜.md를 함께 · 못 읽으면 통째로 실패(빈 요약으로 덮어쓰지 않게) · 앱은 enNow를 넘긴다', async () => {
  const base = { getMath: async () => null, listDaily: async () => [{ date: T, doneKeys: ['a'], speakAttempts: 1, speakPass: 1 }], mathReportText: () => '', asksText: () => '', collectTodo: () => [], today: T };
  const without = await gatherFiles(base);
  assert.ok(!without.some((f) => f.path.startsWith('english/')), '넘기지 않으면 없음');
  const files = await gatherFiles({ ...base, getEnglish: async () => [{ id: 'b', title: '영상', total: 4, done: 4, said: 2, saidPct: 50, lastAt: 3 }] });
  const en = files.find((f) => f.path === `english/${T}.md`);
  assert.ok(en && /- 「영상」 한 문장 4\/4 · 🎤 말해 본 문장 2\/4 \(50%\)/.test(en.text));
  await assert.rejects(gatherFiles({ ...base, getEnglish: async () => { throw new Error('idb'); } }));
  const u = read('js/upload.js');
  assert.ok(u.includes('collectTodo: st.collectTodo, getKorTodo: korTodoNow, getEnglish: enNow, getKorReport: korReportNow, today }); } catch {'));
  assert.ok(u.includes("return st.contentSummary(items, records, st.cueCountOf, st.cueKeysOf);"), '지금 문장 열쇠로 (Codex 65차 #1)');
});

test('🎤 연속 보너스 상수 · 안내 글 — 5번마다 💰5, 하루 6번(💰30) · 📦·🏁 말은 "90% 이상을 따라 했어요"(Codex 65차 #7) · ⚙ 기본값', () => {
  assert.deepEqual(SPEAK_COMBO, { every: 5, coin: 5, maxPerDay: 6 });
  assert.match(read('js/parcel.js'), /— 문장의 \$\{VIDEO_STONE\.pct\}% 이상을 따라 했어요\. 긴 영상일수록/);
  assert.match(read('js/player.js'), /sayWhenFree\(`🏁 「\$\{it\.title\}」 영상 보상! 문장의 \$\{VIDEO_STONE\.pct\}% 이상을 따라 했어요 \$\{got\}`, 6000, \(\) => sfx\.success\(\)\);/);
  for (const f of ['js/parcel.js', 'js/player.js']) assert.ok(!read(f).includes('넘게 따라 말했어요'), `${f} — 말하기 확인을 안 하는 줄로 채웠을 수도 있다`);
  assert.match(read('js/player.js'), /essayCount: ESSAY_COUNT, rereadMode: 'missed',/);
  assert.match(read('css/style.css'), /\.said-counter \{/);
  assert.ok(+(/const CACHE_VERSION = 'v(\d+)';/.exec(read('sw.js')) || [])[1] >= 253, 'sw v253 이상');
});

// ── 🔍 Codex 65차 (v253) ──
const SRT = '1\n00:00:01,000 --> 00:00:02,000\nI want to\n\n2\n00:00:02,200 --> 00:00:03,000\ngo home.\n\n3\n00:00:10,000 --> 00:00:11,000\nOkay.\n';

test('🔍 Codex 65차 #1 — 말해 본 문장은 지금 문장 열쇠의 기록만 (합치기를 바꿔 남은 옛 조각 기록은 안 셈) · playableStarts는 countPlayableCues와 같은 규칙 · 📊·📦·📤가 같은 셈', () => {
  assert.deepEqual(playableStarts(SRT), [1, 10], '조각 둘이 한 문장으로');
  assert.deepEqual(playableStarts(SRT, { merge: false }), [1, 2.2, 10]);
  assert.deepEqual(playableStarts(SRT, { duration: 5 }), [1], '영상 길이 밖은 버린다');
  assert.equal(countPlayableCues(SRT), playableStarts(SRT).length);
  const it = { id: 'x', title: '가', enText: SRT };
  assert.deepEqual([...cueKeysOf(it)], ['x|10', 'x|100']);
  assert.equal(cueCountOf(it), 2);
  // 합치기를 끄고 했던 기록: 첫 조각(x|10 — 합친 문장과 같은 열쇠)·둘째 조각(x|22 — 지금은 없는 문장) 모두 말해 봄 · 마지막 문장은 ⏭
  const recs = [row({ key: 'x|10', start: 1, v: 2, said: 1 }), row({ key: 'x|22', start: 2.2, v: 2, said: 1 }), row({ key: 'x|100', start: 10, v: 2, said: 0 })];
  const [old] = contentSummary([it], recs, cueCountOf);
  assert.deepEqual([old.said, old.saidPct], [2, 100], '열쇠를 안 주면 옛 셈(부푼다)');
  const [s] = contentSummary([it], recs, cueCountOf, cueKeysOf);
  assert.deepEqual([s.total, s.said, s.saidPct, s.done], [2, 1, 50, 3], '지금 문장 2개 중 1개 · 한 문장(done)은 그대로');
  assert.deepEqual(videoStoneDue([s], {}), [], '옛 조각으로 🏁가 나오지 않는다');
  const [k] = contentSummary([it], [row({ key: 'x|10', start: 1, said: 0, v: 2, done: true }), row({ key: 'x|99', start: 9.9, v: 2, said: 1 })], cueCountOf, cueKeysOf);
  assert.equal(k.said, 0, '열쇠가 없는 기록(r.key 없음도 itemId·start로)');
  assert.equal(contentSummary([it], [{ itemId: 'x', start: 10, done: true, v: 2, said: 1 }], cueCountOf, cueKeysOf)[0].said, 1, 'key 칸이 없어도 itemId·start로 열쇠를 만든다');
  assert.ok(read('js/stats.js').includes('const summ = contentSummary(items, records, cueCountOf, cueKeysOf);'), '📊');
  assert.ok(read('js/parcel.js').includes('return videoStoneDue(st.contentSummary(items, records, st.cueCountOf, st.cueKeysOf), parcelsReceived());'), '📦');
  assert.ok(read('js/upload.js').includes('return st.contentSummary(items, records, st.cueCountOf, st.cueKeysOf);'), '📤');
  const pl = read('js/player.js');
  assert.ok(!/track\.saidCount\(\)/.test(pl), '플레이어는 늘 지금 문장 목록으로');
  assert.match(pl, /if \(videoPct\(track\.saidCount\(state\.cues\), state\.cues\.length\) < VIDEO_STONE\.pct\) return;/);
  assert.match(pl, /c\.textContent = `🎤 말한 문장 \$\{track\.saidCount\(state\.cues\)\}\/\$\{n\}`;/);
});

test('🔍 Codex 65차 #5 — 📤 영어 요약: 복습·퍼즐·단어 잇기·영어 화면 시간만 있는 날도 그날 줄 · 🔁 복습 문장 수 · 기록이 하나도 없는 날만 "영어 기록 없음"', () => {
  const days = [
    { date: '2026-10-12', doneKeys: [], speakAttempts: 0, reviewSentences: 4, reviewItems: 5 },
    { date: '2026-10-11', doneKeys: [], enTime: 300 },
    { date: '2026-10-10', doneKeys: [], matches: 1 },
    { date: '2026-10-09', doneKeys: [], mathQ: 20, seconds: 0 },
  ];
  const t = englishFiles(days, [], T)[0].text;
  assert.ok(t.includes('- 10-12: 한 문장 0 · 🔁 복습 문장 4 · 🎤 말하기 통과 0/0 · ⏭ 직접 넘김 0 · 3번 해 보고 넘어감 0 · 🎤 연속 보너스 0번\n'), '복습만 한 날');
  assert.ok(t.includes('- 10-11: 한 문장 0 · 🔁 복습 문장 0 ·'), '영어 화면 시간만');
  assert.ok(t.includes('- 10-10: 한 문장 0 ·'), '단어 잇기만');
  assert.ok(t.includes('- 10-09: (영어 기록 없음)\n'), '수학만 한 날은 영어 기록 없음');
  assert.ok(t.includes('- 10-13: (영어 기록 없음)\n'), '기록이 없는 날');
  assert.ok(!t.includes('영어 안 함'), '하지 않았다고 단정하지 않는다');
});
