// 🎹 v420 (2026-11-12 아버님 → 기본안 「추천대로」) — node --test tests/music420.test.js
//   ① 음악 포켓몬은 한 곡을 하루에 열 번 연달아 「곡 전체」를 잘 쳐야 — 다른 곡을 잘 끝까지 치면 처음부터 · 못 친 판·한 줄 연습은 안 셈·안 끊음 ·
//      자정이면 처음부터 · 하루 한 마리 · 옛 규칙으로 모은 칸은 새 규칙에 안 이어짐 · 칸 옆에 곡 이름 · 🐾 안내 판 3
//   ② 🎹 태블릿으로 치기에서 ▶ 시작 → 앱 머리줄·메뉴 세 줄을 접고 악보·막대는 그 높이 그대로 · 남는 높이는 건반 · 모서리 ⏸ · 멈추면 돌아옴
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TAPS_PER_MON, TAP_DAY, tapRule, pianoOf, copyPiano, mergePiano, todayOf, dayKeyOf, pianoMd, playKeysH } from '../js/piano.js';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const REQ = { song: 'ode', line: -1, hand: 'R', lv: 1, sp: 1 };
const NOW = new Date('2026-11-13T18:00:00').getTime();
const DAY = 86400000;
const POOL = [{ id: 433, r: 1 }, { id: 358, r: 2 }, { id: 1024, r: 4 }];
const rng0 = () => 0;
const good = (song = 'ode', more = {}) => ({ ...REQ, song, ok: 9, bad: 1, ...more });
const play = (p, n, song = 'ode', at = NOW) => Array.from({ length: n }, () => tapRule(p, good(song), at, POOL, rng0));

test('🎹 한 곡을 열 번 연달아 → 열째에 한 마리 · 하루 한 마리(열하나째는 cap) · 💰는 따로', () => {
  assert.equal(TAPS_PER_MON, 10);
  const p = { coins: 0, coinsEarned: 0 };
  const r = play(p, 11);
  assert.deepEqual(r.map((x) => x.run && x.run.n), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10]);
  assert.deepEqual(r.map((x) => x.got.length), [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0]);
  assert.deepEqual(r.map((x) => x.slot), [...Array(10).fill('ok'), 'cap']);
  assert.deepEqual([r[9].won, r[10].won, r[0].won], [true, true, false]);
  assert.equal(r.filter((x) => x.coins).length, TAP_DAY, '💰 한도는 그대로');
  assert.deepEqual(todayOf(p, NOW), { paid: TAP_DAY, coins: 15 * TAP_DAY, notes: 0, taps: 10, run: { s: 'ode', n: 10, at: NOW }, won: 1 });
  assert.deepEqual([pianoOf(p.piano).taps, pianoOf(p.piano).tapMons], [10, 1]);
});

test('🎹 연달아 — 다른 곡을 잘 끝까지 치면 그 곡으로 처음부터(restart) · 못 친 판·한 줄 연습은 안 셈·안 끊음 · 자정이면 처음부터', () => {
  const p = { coins: 0, coinsEarned: 0 };
  play(p, 5, 'ode');
  // 다른 곡 — 못 친 판(70% 아래)은 안 끊음
  const miss = tapRule(p, good('mary', { ok: 6, bad: 4 }), NOW, POOL, rng0);
  assert.deepEqual([miss.slot, miss.run, miss.restart], ['try', { s: 'ode', n: 5, at: NOW }, false]);
  // 다른 곡 — 한 줄 연습도 안 끊음
  const line = tapRule(p, good('mary', { line: 0 }), NOW, POOL, rng0);
  assert.deepEqual([line.slot, line.run, line.restart], ['line', { s: 'ode', n: 5, at: NOW }, false]);
  // 같은 곡 다시 — 이어서
  assert.equal(tapRule(p, good('ode'), NOW, POOL, rng0).run.n, 6);
  // 다른 곡을 잘 끝까지 — 처음부터
  const sw = tapRule(p, good('mary'), NOW, POOL, rng0);
  assert.deepEqual([sw.slot, sw.run, sw.restart, sw.got.length], ['ok', { s: 'mary', n: 1, at: NOW }, true, 0]);
  // 아홉 + 아홉이어도 한 마리도 안 옴 · 모든 칸·날 칸도 안 늚(날 칸 합이 모든 칸을 넘어 몫이 생기지 않게)
  play(p, 8, 'mary');
  play(p, 9, 'ode');
  assert.deepEqual([pianoOf(p.piano).taps, pianoOf(p.piano).tapMons, todayOf(p, NOW).taps], [0, 0, undefined]);
  // 자정이면 처음부터
  const next = tapRule(p, good('ode'), NOW + DAY, POOL, rng0);
  assert.deepEqual([next.run, next.restart], [{ s: 'ode', n: 1, at: NOW + DAY }, false]);
  // 시계가 뒤로 가면 안 셈
  assert.deepEqual(tapRule(p, good('ode'), NOW - 3 * DAY, POOL, rng0), { ok: false, why: 'clock' });
});

test('🎹 받은 날은 다른 곡도 cap · 옛 규칙으로 모은 칸(남은 몫 없음)은 새 규칙에 안 이어짐 · 열 번이면 묶음 하나만 · 옛 판에 못 받은 몫은 온다', () => {
  const p = { coins: 0, coinsEarned: 0 };
  play(p, 10, 'ode');
  const other = tapRule(p, good('mary'), NOW, POOL, rng0);
  assert.deepEqual([other.slot, other.run, other.got.length], ['cap', { s: 'ode', n: 10, at: NOW }, 0], '하루 한 마리 — 받은 뒤엔 다른 곡도');
  // 옛 규칙으로 37칸(세 마리 받음 · 일곱 칸 남음) — 오늘 새 규칙은 0부터 · 열 번이면 한 마리만
  const old = { coins: 0, coinsEarned: 0, piano: { taps: 37, tapMons: 3, days: { [dayKeyOf(NOW - DAY)]: { paid: 0, coins: 0, notes: 0, taps: 7 } } } };
  const o1 = tapRule(old, good('ode'), NOW, POOL, rng0);
  assert.deepEqual([o1.run, o1.got.length, o1.taps, o1.tapMons], [{ s: 'ode', n: 1, at: NOW }, 0, 37, 3], '남은 일곱 칸으로 바로 오지 않음');
  const rest = play(old, 9, 'ode');
  assert.deepEqual([rest[8].got.length, rest[8].taps, rest[8].tapMons], [1, 47, 4], '열 번 → 한 마리');
  // 옛 판에 찼는데 저장이 실패해 못 받은 몫(묶음 수 > 받은 수)은 그대로 온다
  const owed = { coins: 0, coinsEarned: 0, piano: { taps: 20, tapMons: 1, days: {} } };
  assert.equal(tapRule(owed, good('ode', { ok: 1, bad: 9 }), NOW, POOL, rng0).got.length, 1);
});

test('🎹 저장 — 날 칸 run은 곡 id·1~10만 · won · 병합은 더 간 쪽·받은 날 OR · 복사는 run도 새 객체', () => {
  const k = dayKeyOf(NOW);
  const day = (e) => pianoOf({ days: { [k]: { paid: 0, coins: 0, notes: 0, ...e } } }).days[k];
  assert.deepEqual(day({ run: { s: 'ode', n: 3 } }), { paid: 0, coins: 0, notes: 0, run: { s: 'ode', n: 3 } }, 'run만 있는 날도 남김');
  for (const bad of [{ s: 'o de', n: 3 }, { s: 'ode', n: 0 }, { s: 'ode', n: 11 }, { s: 'ode', n: 'x' }, { n: 3 }, 'ode', null]) assert.equal(day({ paid: 1, run: bad }).run, undefined, JSON.stringify(bad));
  assert.equal(day({ run: { s: 'ode', n: 4.7 } }).run.n, 4);
  assert.equal(day({ won: true }).won, 1);
  assert.equal(day({ paid: 1, won: 0 }).won, undefined);
  const a = { days: { [k]: { paid: 1, coins: 15, notes: 0, run: { s: 'ode', n: 4 } } } };
  const b = { days: { [k]: { paid: 2, coins: 30, notes: 0, run: { s: 'mary', n: 7 }, won: 1 } } };
  assert.deepEqual(mergePiano(a, b).days[k], { paid: 2, coins: 30, notes: 0, run: { s: 'mary', n: 7 }, won: 1 });
  assert.deepEqual(mergePiano(b, a).days[k], mergePiano(a, b).days[k], '차례와 상관없이');
  const c = copyPiano(a);
  c.days[k].run.n = 9;
  assert.equal(a.days[k].run.n, 4, '복사는 run도 새 객체');
});

test('🎹 병합은 나중에 센 연달아 (Codex 223차 P2-1) — 아홉 번 뒤 백업 → 다른 곡으로 끊김 → 그 백업을 되돌려도 끊긴 채 · 한 번 더로 포켓몬이 오지 않음', () => {
  const k = dayKeyOf(NOW);
  const p = { coins: 0, coinsEarned: 0 };
  play(p, 9, 'ode', NOW);
  const backup = copyPiano(p.piano); // ode 아홉
  tapRule(p, good('mary'), NOW + 60000, POOL, rng0); // 다른 곡 — 끊김
  const merged = mergePiano(p.piano, backup);
  assert.deepEqual(merged.days[k].run, { s: 'mary', n: 1, at: NOW + 60000 }, '나중에 센 쪽');
  assert.deepEqual(mergePiano(backup, p.piano).days[k].run, merged.days[k].run, '차례와 상관없이');
  const q = { coins: 0, coinsEarned: 0, piano: merged };
  assert.equal(tapRule(q, good('ode'), NOW + 120000, POOL, rng0).got.length, 0, 'ode 한 번으로 포켓몬이 오지 않음');
  assert.equal(pianoOf(q.piano).days[k].run.n, 1);
  // 센 때가 같으면(옛 기록 — at 없음) 더 간 쪽
  const a = { days: { [k]: { paid: 0, coins: 0, notes: 0, run: { s: 'ode', n: 4, at: 5 } } } };
  const b = { days: { [k]: { paid: 0, coins: 0, notes: 0, run: { s: 'mary', n: 7, at: 5 } } } };
  assert.equal(mergePiano(a, b).days[k].run.s, 'mary');
  assert.equal(pianoOf({ days: { [k]: { paid: 1, run: { s: 'ode', n: 2, at: -3 } } } }).days[k].run.at, undefined, '이상한 때는 버림');
});

test('🔁 계속 저장 실패 (Codex 223차 P2-3) — 멈추고 메뉴를 펼쳐 「다시 받기」부터 · 📤 연달아 줄은 오늘부터 7일 안만 (P3)', () => {
  const v = src('js/pianoview.js');
  assert.match(v, /S\.retry = \(\) => sendTap\(req\);\n\s+if \(S\.running\) setRun\(false\);[^\n]*\n\s+showRetry\(\);\n\s+toast\('<b>저장이 안 됐어요<\/b>/);
  assert.match(v, /\.catch\(\(\) => \{\n\s+if \(gen !== S\.gen\) return;\n\s+S\.retry = \(\) => sendTap\(req\);\n\s+if \(S\.running\) setRun\(false\);/);
  const p = { coins: 0, coinsEarned: 0 };
  play(p, 2, 'ode', NOW - 8 * DAY);
  play(p, 3, 'mary', NOW - 6 * DAY);
  const md = pianoMd(p.piano, dayKeyOf(NOW), (s) => s);
  assert.match(md, /🎹 연달아\(v420 — 날마다 마지막 곡\) 11-07 「mary」 3\/10\n/, '이레 전까지만 · 여드레 전은 안 씀');
});

test('📤 music.md — 읽는 법 새 규칙 · 날마다 마지막 곡 「곡」 n/10 · 받은 날 🐾', () => {
  const p = { coins: 0, coinsEarned: 0 };
  play(p, 3, 'ode', NOW - DAY);
  play(p, 10, 'mary', NOW);
  const md = pianoMd(p.piano, dayKeyOf(NOW), (s) => ({ ode: '환희의 송가', mary: '메리의 어린 양' }[s] || s));
  assert.match(md, /v420부터 \*\*한 곡을 하루에 10번 연달아\*\* 쳐야 🐾 음악 포켓몬 한 마리\(다른 곡을 잘 끝까지 치면 처음부터 · 못 친 판·한 줄 연습은 안 셈·안 끊음 · 자정이면 처음부터 · 하루 한 마리/);
  assert.match(md, /\n🎹 연달아\(v420 — 날마다 마지막 곡\) 11-13 「메리의 어린 양」 10\/10 🐾 · 11-12 「환희의 송가」 3\/10\n/);
});

test('📐 연주 중 건반 높이 — 위쪽은 접기 전 높이 그대로 · 남는 높이는 건반 · 접기 전보다 작지 않게 · 그림판의 60%까지', () => {
  // 1280×740 태블릿 어림: 접기 전 그림판 530 → 건반 138 · 위쪽 392 / 접은 뒤 그림판 720
  assert.equal(playKeysH(720, Math.round(720 * 0.26), 392), 328);
  assert.equal(playKeysH(530, 138, 392), 138, '같은 높이면 그대로');
  assert.equal(playKeysH(760, 198, 200), 456, '그림판의 60%까지');
  assert.equal(playKeysH(400, 104, 392), 104, '그림판이 줄어도 접기 전 비율보다 작지 않게');
  assert.equal(playKeysH(720, 187, undefined), 187, '위쪽 높이를 모르면 비율대로');
  assert.equal(playKeysH(720, 187, 0), 187);
});

test('🔌 화면 잇기 — ▶ 시작에 메뉴 접기(🎹 태블릿·무대만) · 접기 전 위쪽 기억 · ⏸ 단추 · 칸 옆 곡 이름 · 다른 곡 한 줄 · 하루 한 마리 말 · 안내 판 3 · CSS · 판 v420', () => {
  const v = src('js/pianoview.js');
  assert.match(v, /const isPlaying = \(\) => S\.running && S\.mode === 'tap' && S\.screen === 'stage';/);
  assert.match(v, /function foldMenu\(\) \{\n\s+const fold = isPlaying\(\);\n\s+const p = \$\('pn-pause'\);\n\s+if \(p\) p\.hidden = !fold;\n\s+if \(S\.folded === fold\) return;\n\s+S\.folded = fold;\n\s+const v = \$\('view-music'\);\n\s+if \(v && v\.classList\) v\.classList\.toggle\('pn-playing', fold\);\n\s+layout\(\);/);
  assert.match(v, /if \(go\) go\.textContent = on \? '⏸ 멈춤' : '▶ 시작';\n\s+foldMenu\(\);/, '시작·멈춤마다');
  assert.match(v, /G\.keysH = playing \? playKeysH\(G\.H, keysH0, G\.up0\) : keysH0;/);
  assert.match(v, /G\.sheetH = S\.lv === 1 \? \(playing && G\.sheet0 \? Math\.min\(G\.sheet0, G\.keysTop - 60\) : Math\.round\(G\.H \* 0\.42\)\) : G\.keysTop - 38;\n\s+if \(!playing\) \{ G\.up0 = G\.keysTop; G\.sheet0 = G\.sheetH; \}/, '접기 전 위쪽·악보 높이를 기억');
  assert.match(v, /const pz = btn\('⏸', 'btn pn-pause', \(\) => toggle\(\)\);\n\s+pz\.id = 'pn-pause';\n\s+pz\.setAttribute\('aria-label', '멈춤'\);/);
  assert.match(v, /return \{ filled: day && day\.won \? TAPS_PER_MON : run \? run\.n : 0, song:/, '오늘 몫 · 받았으면 가득');
  assert.match(v, /<span class="pn-run-song">🎹 \$\{String\(r\.song\)\.replace\(/, '곡 이름은 글로만(HTML 막음)');
  assert.match(v, /r\.restart \? '<br>새 곡으로 🎹 칸이 처음부터 차요 — 한 곡을 연달아 쳐요!' : ''/);
  assert.match(v, /cap: '<br>오늘 음악 포켓몬은 만났어요 — 내일 또 만나요!',/);
  assert.match(v, /const INTRO_VER = '3';/);
  assert.match(v, /\[\['한 곡', true\], \['을 ', false\], \['하루에 열 번 연달아', true\], \[' 쳐요 — 다른 곡을 끝까지 치면 칸이 처음부터예요', false\]\]/);
  assert.doesNotMatch(v, /TAP_SLOT_DAY/);
  const css = src('css/style.css');
  assert.match(css, /#view-music\.pn-playing > \.topbar, #view-music\.pn-playing \.pn-stage-wrap > \.pn-row \{ display: none; \}/);
  assert.match(css, /\.pn-pause \{ position: absolute;/);
  assert.match(css, /\.pn-run-song \{/);
  assert.ok(Number((/CACHE_VERSION = 'v(\d+)'/.exec(src('sw.js')) || [])[1]) >= 420, 'sw v420 이상');
  assert.ok(Number((/APP_VERSION = 'v(\d+)'/.exec(src('js/version.js')) || [])[1]) >= 420, '앱 판 v420 이상');
});
