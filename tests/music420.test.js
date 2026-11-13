// 🎹 v420 (2026-11-12 아버님 → 기본안 「추천대로」) — node --test tests/music420.test.js
//   ① 음악 포켓몬은 한 곡을 하루에 열 번 연달아 — v423에 「📖 진우 책 곡을 섞어서 하루에 열 번」으로 바뀜(규칙 시험은 music423) ·
//      여기엔 남은 v420 기록(날 칸 run) 읽기·병합·📤 「🎹 연달아」 줄만
//   ② 🎹 태블릿으로 치기에서 ▶ 시작 → 앱 머리줄·메뉴 세 줄을 접고 악보·막대는 그 높이 그대로 · 남는 높이는 건반 · 모서리 ⏸ · 멈추면 돌아옴
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pianoOf, copyPiano, mergePiano, dayKeyOf, pianoMd, playKeysH } from '../js/piano.js';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const NOW = new Date('2026-11-13T18:00:00').getTime();
const DAY = 86400000;
/** v420 판이 남긴 날 칸 — run { s, n, at } · 받은 날 won */
const runDay = (s, n, at, won) => ({ paid: 0, coins: 0, notes: 0, run: { s, n, at }, ...(won ? { won: 1, taps: 10 } : {}) });

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

test('🎹 병합은 나중에 센 연달아 (Codex 223차 P2-1) — 아홉 번 뒤 백업 → 다른 곡으로 끊긴 기록 → 그 백업을 되돌려도 끊긴 채', () => {
  const k = dayKeyOf(NOW);
  const backup = { days: { [k]: runDay('ode', 9, NOW) } }; // ode 아홉
  const now = { days: { [k]: runDay('mary', 1, NOW + 60000) } }; // 다른 곡 — 끊김
  const merged = mergePiano(now, backup);
  assert.deepEqual(merged.days[k].run, { s: 'mary', n: 1, at: NOW + 60000 }, '나중에 센 쪽');
  assert.deepEqual(mergePiano(backup, now).days[k].run, merged.days[k].run, '차례와 상관없이');
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
  const raw = { taps: 3, days: { [dayKeyOf(NOW - 8 * DAY)]: runDay('ode', 2, NOW - 8 * DAY), [dayKeyOf(NOW - 6 * DAY)]: runDay('mary', 3, NOW - 6 * DAY) } }; // taps — 기록이 하나도 없으면 파일이 없다
  const md = pianoMd(raw, dayKeyOf(NOW), (s) => s);
  assert.match(md, /🎹 연달아\(v420 — 날마다 마지막 곡\) 11-07 「mary」 3\/10\n/, '이레 전까지만 · 여드레 전은 안 씀');
});

test('📤 music.md — 남은 v420 기록은 「🎹 연달아」 줄로 · 날마다 마지막 곡 「곡」 n/10 · 받은 날 🐾 · 읽는 법에 v420~v422', () => {
  const raw = { taps: 10, tapMons: 1, days: { [dayKeyOf(NOW - DAY)]: runDay('ode', 3, NOW - DAY), [dayKeyOf(NOW)]: runDay('mary', 10, NOW, true) } };
  const md = pianoMd(raw, dayKeyOf(NOW), (s) => ({ ode: '환희의 송가', mary: '메리의 어린 양' }[s] || s));
  assert.match(md, /· v420~v422는 한 곡을 하루에 10번 연달아\(「🎹 연달아」 줄\) · v419까지는 곡 섞기·날 넘김도 이어 열 칸마다/);
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

test('🔌 화면 잇기 — ▶ 시작에 메뉴 접기(🎹 태블릿·무대만) · 접기 전 위쪽 기억 · ⏸ 단추 · 하루 한 마리 말 · CSS · 판 v420', () => {
  const v = src('js/pianoview.js');
  assert.match(v, /const isPlaying = \(\) => S\.running && S\.mode === 'tap' && S\.screen === 'stage';/);
  assert.match(v, /function foldMenu\(\) \{\n\s+const fold = isPlaying\(\);\n\s+const p = \$\('pn-pause'\);\n\s+if \(p\) p\.hidden = !fold;\n\s+if \(S\.folded === fold\) return;\n\s+S\.folded = fold;\n\s+const v = \$\('view-music'\);\n\s+if \(v && v\.classList\) v\.classList\.toggle\('pn-playing', fold\);\n\s+layout\(\);/);
  assert.match(v, /if \(go\) go\.textContent = on \? '⏸ 멈춤' : '▶ 시작';\n\s+foldMenu\(\);/, '시작·멈춤마다');
  assert.match(v, /G\.keysH = playing \? playKeysH\(G\.H, keysH0, G\.up0\) : keysH0;/);
  assert.match(v, /G\.sheetH = S\.lv === 1 \? \(playing && G\.sheet0 \? Math\.min\(G\.sheet0, G\.keysTop - 60\) : Math\.round\(G\.H \* 0\.42\)\) : G\.keysTop - 38;\n\s+if \(!playing\) \{ G\.up0 = G\.keysTop; G\.sheet0 = G\.sheetH; \}/, '접기 전 위쪽·악보 높이를 기억');
  assert.match(v, /const pz = btn\('⏸', 'btn pn-pause', \(\) => toggle\(\)\);\n\s+pz\.id = 'pn-pause';\n\s+pz\.setAttribute\('aria-label', '멈춤'\);/);
  assert.match(v, /cap: '<br>오늘 음악 포켓몬은 만났어요 — 내일 또 만나요!',/);
  assert.doesNotMatch(v, /TAP_SLOT_DAY/);
  const css = src('css/style.css');
  assert.match(css, /#view-music\.pn-playing > \.topbar, #view-music\.pn-playing \.pn-stage-wrap > \.pn-row \{ display: none; \}/);
  assert.match(css, /\.pn-pause \{ position: absolute;/);
  assert.ok(Number((/CACHE_VERSION = 'v(\d+)'/.exec(src('sw.js')) || [])[1]) >= 420, 'sw v420 이상');
  assert.ok(Number((/APP_VERSION = 'v(\d+)'/.exec(src('js/version.js')) || [])[1]) >= 420, '앱 판 v420 이상');
});
