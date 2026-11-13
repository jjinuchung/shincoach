// 🎹 v423 (2026-11-13 아버님 「한 곡을 연속 10번은 좀 너무 했다 · 다른 곡들도 완주를 해서 10번이 되면 · 너가 넣은 교향곡은 제외하고 내가 넣은 곡들로만」
//   → 기본안 「추천대로」) — node --test tests/music423.test.js
//   ① 📖 진우 책 곡(비공개 저장소에서 받은 곡 · req.book)의 「곡 전체」를 잘 친 판이 그날 한 칸 — 곡을 섞어도·같은 곡을 다시 쳐도 이어 셈 ·
//      열 칸이면 음악 포켓몬 · 하루 한 마리 · 💰 하루 다섯 번 그대로
//   ② 🎼 연습곡(앱에 든 공개 곡 — 환희의 송가·Mary)은 💰만(slot 'free') · 못 친 판·한 줄 연습은 안 셈 · 자정이면 처음부터
//   ③ 바꾸는 날 — v420 연달아(run)는 안 이어짐 · 그날 v420으로 받았으면 하루 한 마리 · 옛 판에 못 받은 몫은 온다
//   ④ 저장(날 칸 book { n, at }) · 병합은 더 찬 쪽 · 📤 「🎹 책 곡 칸」 줄 · 화면 잇기
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TAPS_PER_MON, TAP_DAY, COIN, tapRule, pianoOf, copyPiano, mergePiano, todayOf, dayKeyOf, pianoMd } from '../js/piano.js';
import { PUBLIC_SONGS, allSongs } from '../js/pianosongs.js';
import { initProfile, pianoTap, pianoNow } from '../js/xp.js';

void fakeIdb;
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: (k) => { store.delete(k); },
};
const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const REQ = { song: 'ponyo', line: -1, hand: 'R', lv: 1, sp: 1 };
const NOW = new Date('2026-11-13T18:00:00').getTime();
const DAY = 86400000;
const POOL = [{ id: 433, r: 1 }, { id: 358, r: 2 }, { id: 1024, r: 4 }];
const rng0 = () => 0;
/** 잘 친 「곡 전체」 판 — 책 곡이면 book: true (화면이 S.song.book으로 붙인다) */
const bookPlay = (song = 'ponyo', more = {}) => ({ ...REQ, song, ok: 9, bad: 1, book: true, ...more });
const freePlay = (song = 'ode', more = {}) => ({ ...REQ, song, ok: 9, bad: 1, ...more });
const tap = (p, req, at = NOW) => tapRule(p, req, at, POOL, rng0);

// ───────────────────── ① 책 곡을 섞어서 하루에 열 번 ─────────────────────

test('🎹 📖 책 곡 — 곡을 섞어도 이어 셈 · 열째에 한 마리 · 열하나째는 cap(하루 한 마리) · 💰 한도는 그대로 · 기록 줄 k·x', () => {
  assert.equal(TAPS_PER_MON, 10);
  const p = { coins: 0, coinsEarned: 0 };
  const songs = ['ponyo', 'sanpo', 'ponyo', 'kiki', 'totoro', 'sanpo', 'may', 'ponyo', 'laputa', 'wind', 'ponyo'];
  const r = songs.map((s) => tap(p, bookPlay(s)));
  assert.deepEqual(r.map((x) => x.book && x.book.n), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10], '다른 곡을 쳐도 처음부터가 아니다');
  assert.deepEqual(r.map((x) => x.slot), [...Array(10).fill('ok'), 'cap']);
  assert.deepEqual(r.map((x) => x.got.length), [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0]);
  assert.deepEqual([r[0].won, r[9].won, r[10].won], [false, true, true]);
  assert.ok(r.every((x) => !('run' in x) && !('restart' in x)), 'v420 연달아·처음부터 알림은 없다');
  assert.deepEqual(r.map((x) => x.coins), [...Array(TAP_DAY).fill(COIN.all), ...Array(songs.length - TAP_DAY).fill(0)], '💰는 하루 다섯 번 그대로 — 칸과 따로');
  assert.deepEqual(todayOf(p, NOW), { paid: TAP_DAY, coins: COIN.all * TAP_DAY, notes: 0, taps: 10, book: { n: 10, at: NOW }, won: 1 });
  assert.deepEqual([pianoOf(p.piano).taps, pianoOf(p.piano).tapMons], [10, 1]);
  const rows = pianoOf(p.piano).log.filter((x) => x.m === 't');
  assert.deepEqual(rows.map((x) => x.x), [...Array(10).fill(1), 0], '열하나째(cap)는 칸을 안 셈');
  assert.ok(rows.every((x) => x.k === 1), '책 곡 판 표시');
  // 같은 곡만 열 번도 된다
  const q = { coins: 0, coinsEarned: 0 };
  const same = Array.from({ length: 10 }, () => tap(q, bookPlay('ponyo')));
  assert.equal(same[9].got.length, 1);
});

test('🎼 연습곡은 💰만(free) — 칸이 안 차고 책 곡 칸도 끊지 않음 · book은 true만 · 받은 날에도 free · 못 친 판·한 줄은 안 셈 · 자정이면 처음부터 · 시계 뒤로', () => {
  const p = { coins: 0, coinsEarned: 0 };
  const f = tap(p, freePlay('ode'));
  assert.deepEqual([f.slot, f.coins, f.book, f.taps, f.got.length], ['free', COIN.all, null, 0, 0], '💰는 받고 칸은 없음');
  for (const book of [false, 'true', 1, undefined]) assert.equal(tap({}, freePlay('mary', { book })).slot, 'free', `book ${JSON.stringify(book)}`);
  // 책 곡 넷 · 연습곡 셋(끊지 않음) · 책 곡 여섯 → 열째 책 곡에 한 마리
  const q = { coins: 0, coinsEarned: 0 };
  const seq = [...Array(4).fill('bk'), 'ode', 'mary', 'ode', ...Array(6).fill('bk')];
  const r = seq.map((s, i) => tap(q, s === 'bk' ? bookPlay(['ponyo', 'sanpo'][i % 2]) : freePlay(s)));
  assert.deepEqual(r.map((x) => x.slot), ['ok', 'ok', 'ok', 'ok', 'free', 'free', 'free', 'ok', 'ok', 'ok', 'ok', 'ok', 'ok']);
  assert.deepEqual(r.map((x) => (x.book ? x.book.n : 0)), [1, 2, 3, 4, 4, 4, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual(r.map((x) => x.got.length).reduce((a, b) => a + b, 0), 1);
  assert.equal(r[12].got.length, 1, '열째 책 곡 판에');
  // 받은 날에도 연습곡은 「연습곡은 칸이 안 차요」(free) — 책 곡은 cap
  assert.deepEqual([tap(q, freePlay('ode')).slot, tap(q, bookPlay('kiki')).slot], ['free', 'cap']);
  // 연습곡만 열 번 — 한 마리도 안 옴 · 💰 한도가 차도 free · 날 칸에 book 없음
  const z = { coins: 0, coinsEarned: 0 };
  const ten = Array.from({ length: 10 }, (_, i) => tap(z, freePlay(i % 2 ? 'ode' : 'mary')));
  assert.equal(ten.reduce((a, x) => a + x.got.length, 0), 0);
  assert.deepEqual([ten[9].slot, ten[9].why], ['free', 'cap']);
  assert.equal(todayOf(z, NOW).book, undefined);
  assert.ok(pianoOf(z.piano).log.every((x) => !x.k && !x.x), '연습곡 판은 k·x 없음');
  // 못 친 책 곡 판 · 책 곡 한 줄 연습은 안 셈
  const w = { coins: 0, coinsEarned: 0 };
  tap(w, bookPlay('ponyo'));
  assert.deepEqual([tap(w, bookPlay('ponyo', { ok: 6, bad: 4 })).slot, tap(w, bookPlay('ponyo', { line: 0 })).slot], ['try', 'line']);
  assert.equal(todayOf(w, NOW).book.n, 1);
  // 자정이면 처음부터 · 시계가 뒤로 가면 안 셈
  assert.deepEqual(tap(w, bookPlay('sanpo'), NOW + DAY).book, { n: 1, at: NOW + DAY });
  assert.deepEqual(tap(w, bookPlay('sanpo'), NOW - 3 * DAY), { ok: false, why: 'clock' });
});

// ───────────────────── ③ 바꾸는 날 ─────────────────────

test('🔄 바꾸는 날 — v420 연달아(run)는 안 이어짐(남은 기록은 그대로) · 그날 v420으로 받았으면 cap · 옛 칸은 새로 · 못 받은 몫은 온다', () => {
  const k = dayKeyOf(NOW);
  const v420 = { coins: 0, coinsEarned: 0, piano: { days: { [k]: { paid: 2, coins: 30, notes: 0, run: { s: 'ponyo', n: 9, at: NOW - 60000 } } } } };
  const a = tap(v420, bookPlay('ponyo'));
  assert.deepEqual([a.slot, a.book, a.got.length], ['ok', { n: 1, at: NOW }, 0], '연달아 아홉에서 이어지지 않음');
  assert.deepEqual(todayOf(v420, NOW).run, { s: 'ponyo', n: 9, at: NOW - 60000 }, '남은 v420 기록은 그대로(📤 연달아 줄)');
  const won = { coins: 0, coinsEarned: 0, piano: { taps: 10, tapMons: 1, days: { [k]: { paid: 5, coins: 75, notes: 0, taps: 10, run: { s: 'mary', n: 10, at: NOW - 60000 }, won: 1 } } } };
  const b = tap(won, bookPlay('ponyo'));
  assert.deepEqual([b.slot, b.got.length, b.won], ['cap', 0, true], '하루 한 마리 — 그날 v420으로 받았으면');
  // 옛 규칙(v413~v419)으로 37칸(세 마리 받음 · 일곱 칸 남음) — 오늘 새 규칙은 0부터 · 열 번이면 한 마리만
  const old = { coins: 0, coinsEarned: 0, piano: { taps: 37, tapMons: 3, days: { [dayKeyOf(NOW - DAY)]: { paid: 0, coins: 0, notes: 0, taps: 7 } } } };
  const o1 = tap(old, bookPlay('ponyo'));
  assert.deepEqual([o1.book, o1.got.length, o1.taps, o1.tapMons], [{ n: 1, at: NOW }, 0, 37, 3], '남은 일곱 칸으로 바로 오지 않음');
  const rest = Array.from({ length: 9 }, (_, i) => tap(old, bookPlay(i % 2 ? 'kiki' : 'sanpo')));
  assert.deepEqual([rest[8].got.length, rest[8].taps, rest[8].tapMons], [1, 47, 4], '열 번 → 한 마리');
  // 옛 판에 찼는데 저장이 실패해 못 받은 몫(묶음 수 > 받은 수)은 연습곡·못 친 판에도 그대로 온다
  const owed = () => ({ coins: 0, coinsEarned: 0, piano: { taps: 20, tapMons: 1, days: {} } });
  assert.equal(tap(owed(), freePlay('ode')).got.length, 1);
  assert.equal(tap(owed(), bookPlay('ponyo', { ok: 1, bad: 9 })).got.length, 1);
});

// ───────────────────── ④ 저장 · 병합 · 📤 ─────────────────────

test('💾 저장 — 날 칸 book은 1~10만(내림) · at은 양수만 · book만 있는 날도 남김 · 기록 줄 k는 🎹 치기 줄의 1만 · 복사는 새 객체', () => {
  const k = dayKeyOf(NOW);
  const day = (e) => pianoOf({ days: { [k]: { paid: 0, coins: 0, notes: 0, ...e } } }).days[k];
  assert.deepEqual(day({ book: { n: 3, at: 7 } }), { paid: 0, coins: 0, notes: 0, book: { n: 3, at: 7 } }, 'book만 있는 날도 남김');
  for (const bad of [{ n: 0 }, { n: 11 }, { n: 'x' }, { n: -2 }, {}, '3', 3, null]) assert.equal(day({ paid: 1, book: bad }).book, undefined, JSON.stringify(bad));
  assert.deepEqual(day({ book: { n: 4.7, at: -3 } }).book, { n: 4 }, '내림 · 이상한 때는 버림');
  const log = pianoOf({ log: [{ at: 1, m: 't', s: 'a', k: 1 }, { at: 2, m: 't', s: 'b', k: true }, { at: 3, m: 'l', s: 'c', k: 1 }, { at: 4, m: 't', s: 'd' }] }).log;
  assert.deepEqual(log.map((r) => r.k), [1, undefined, undefined, undefined]);
  const a = { days: { [k]: { paid: 1, coins: 15, notes: 0, book: { n: 4, at: 100 } } } };
  const c = copyPiano(a);
  c.days[k].book.n = 9;
  assert.equal(a.days[k].book.n, 4, '복사는 book도 새 객체');
});

test('🔀 병합 — 책 곡 칸은 더 찬 쪽(차례와 상관없이) · 받은 날 OR · 옛 백업을 되돌려도 칸이 줄지 않아 몫이 다시 열리지 않음', () => {
  const k = dayKeyOf(NOW);
  const a = { days: { [k]: { paid: 1, coins: 15, notes: 0, book: { n: 4, at: 900 } } } };
  const b = { days: { [k]: { paid: 2, coins: 30, notes: 0, book: { n: 7, at: 100 } } } };
  assert.deepEqual(mergePiano(a, b).days[k], { paid: 2, coins: 30, notes: 0, book: { n: 7, at: 100 } }, '나중에 센 쪽이 아니라 더 찬 쪽');
  assert.deepEqual(mergePiano(b, a).days[k], mergePiano(a, b).days[k], '차례와 상관없이');
  const only = { days: { [k]: { paid: 1, coins: 15, notes: 0 } } };
  assert.deepEqual(mergePiano(only, b).days[k].book, { n: 7, at: 100 }, '한쪽에만 있으면 그것');
  assert.deepEqual(mergePiano(b, only).days[k].book, { n: 7, at: 100 });
  const w = { days: { [k]: { paid: 0, coins: 0, notes: 0, taps: 10, book: { n: 10, at: 5 }, won: 1 } } };
  assert.deepEqual(mergePiano(a, w).days[k], { paid: 1, coins: 15, notes: 0, taps: 10, book: { n: 10, at: 5 }, won: 1 });
  // 아홉 칸 → 백업(셋) 되돌림 → 칸은 아홉 그대로 · 한 판 더에 한 마리(두 마리가 아님)
  const p = { coins: 0, coinsEarned: 0 };
  for (let i = 0; i < 3; i += 1) tap(p, bookPlay('ponyo'));
  const backup = copyPiano(p.piano);
  for (let i = 0; i < 6; i += 1) tap(p, bookPlay('sanpo'));
  const q = { coins: 0, coinsEarned: 0, piano: mergePiano(backup, p.piano) };
  assert.equal(pianoOf(q.piano).days[k].book.n, 9);
  assert.equal(tap(q, bookPlay('kiki')).got.length, 1);
  assert.equal(tap(q, bookPlay('kiki')).got.length, 0, '하루 한 마리');
});

test('📤 music.md — 읽는 법 v423 · 「🎹 책 곡 칸」 줄(오늘부터 7일 · n/10 · 받은 날 🐾 · 칸을 채운 책 곡만 이름) · upload 읽는 법', () => {
  const p = { coins: 0, coinsEarned: 0 };
  const names = { ponyo: '벼랑 위의 포뇨', sanpo: '산책', kiki: '바다가 보이는 마을', ode: '환희의 송가' };
  tap(p, bookPlay('ponyo'), NOW - 8 * DAY); // 여드레 전 — 안 씀
  ['ponyo', 'sanpo', 'ponyo'].forEach((s, i) => tap(p, bookPlay(s), NOW - DAY + i * 1000));
  tap(p, freePlay('ode'), NOW - DAY + 5000); // 연습곡은 이름에 안 듦
  for (let i = 0; i < 10; i += 1) tap(p, bookPlay(i < 5 ? 'kiki' : 'sanpo'), NOW + i * 1000);
  const md = pianoMd(p.piano, dayKeyOf(NOW), (s) => names[s] || s);
  assert.match(md, /· v423부터 \*\*📖 진우 책 곡\(아빠가 넣은 곡\)을 하루에 10번\*\* 치면 🐾 음악 포켓몬 한 마리\(곡을 섞어도·같은 곡을 다시 쳐도 이어 셈 · 🎼 연습곡\(앱에 든 공개 곡\)은 💰만 · 못 친 판·한 줄 연습은 안 셈 · 자정이면 처음부터 · 하루 한 마리 · 💰 한도와 따로 — 「🎹 책 곡 칸」 줄\)/);
  assert.match(md, /\n🎹 책 곡 칸\(v423 — 날마다 찬 칸 · 채운 곡 — 최근 기록에 남은 것\) 11-13 10\/10 🐾 \(바다가 보이는 마을·산책\) · 11-12 3\/10 \(벼랑 위의 포뇨·산책\)\n/, '이레 안 · 연습곡 이름 없음');
  assert.doesNotMatch(md, /🎹 연달아\(v420/, 'v423 판만 친 기록엔 연달아 줄이 없다');
  // 바꾸는 날 — 그날 v420으로 칸을 센 판(k 없음)·칸을 안 채운 책 곡 판(x 없음 — 못 친 판·cap)은 이름에 안 듦
  const k = dayKeyOf(NOW);
  const mix = pianoMd({ days: { [k]: { paid: 0, coins: 0, notes: 0, book: { n: 1, at: NOW } } }, log: [
    { at: NOW - 5000, m: 't', s: 'mary', x: 1 }, { at: NOW, m: 't', s: 'ponyo', x: 1, k: 1 }, { at: NOW + 1000, m: 't', s: 'kiki', k: 1 },
  ] }, k, (s) => names[s] || s);
  assert.match(mix, /\n🎹 책 곡 칸\(v423 — 날마다 찬 칸 · 채운 곡 — 최근 기록에 남은 것\) 11-13 1\/10 \(벼랑 위의 포뇨\)\n/);
  assert.match(src('js/upload.js'), /열 칸마다 음악 포켓몬 · v423부터 📖 진우 책 곡만 — 자세히는 music\.md\)/);
});

test('🎵 곡 — 책 곡 표시는 비공개 저장소에서 받은 곡에만 · 연습곡은 제가 넣은 공개 곡 둘(환희의 송가·Mary)', () => {
  assert.deepEqual(PUBLIC_SONGS.map((s) => s.id), ['ode', 'mary']);
  assert.ok(PUBLIC_SONGS.every((s) => !('book' in s)));
  store.set('shincoach.pianoSongs', JSON.stringify([{ ...PUBLIC_SONGS[1], id: 'ponyo', ko: '벼랑 위의 포뇨' }]));
  const got = allSongs().map((s) => [s.id, s.book === true]);
  assert.deepEqual(got, [['ponyo', true], ['ode', false], ['mary', false]]);
  store.delete('shincoach.pianoSongs');
});

before(async () => { console.warn = () => {}; await initProfile(); });

test('💾 xp 한 트랜잭션 — 화면이 붙인 book이 그대로 규칙에 · 책 곡은 칸 · 연습곡은 💰만', async () => {
  const k = dayKeyOf();
  const a = await pianoTap({ ...REQ, ok: 9, bad: 1, book: true });
  assert.deepEqual([a.ok, a.slot, a.book && a.book.n], [true, 'ok', 1]);
  const b = await pianoTap({ ...REQ, song: 'ode', ok: 9, bad: 1 });
  assert.deepEqual([b.ok, b.slot, b.coins], [true, 'free', COIN.all]);
  assert.equal(pianoNow().days[k].book.n, 1);
  assert.equal(pianoOf(fakeIdb.get('profile', 'me').piano).days[k].book.n, 1, '저장됨');
});

// ───────────────────── 화면 잇기 ─────────────────────

test('🔌 화면 잇기 — 판 끝 요청에 book · 칸은 오늘 책 곡 몫(곡 이름 없음) · 연습곡 한 줄 · 「처음부터」 알림 없앰 · 안내 판 4 · CSS · 판 v423', () => {
  const v = src('js/pianoview.js');
  assert.match(v, /function passEnd\(\) \{\n\s+const req = \{ song: S\.song\.id, line: S\.line, hand: S\.hands, lv: S\.lv, sp: Math\.round\(S\.sp \* 100\) \/ 100, book: S\.song\.book === true \};/);
  assert.match(v, /function tapToday\(pn\) \{\n\s+const day = pn && pn\.days \? pn\.days\[dayKeyOf\(Date\.now\(\)\)\] : null;\n\s+return day && day\.won \? TAPS_PER_MON : day && day\.book \? day\.book\.n : 0;\n\}/);
  assert.match(v, /box\.innerHTML = `\$\{keysHtml\(tapToday\(pn\)\)\}<span class="pn-slots-mon">→ 🐾<\/span>`;/);
  assert.match(v, /ok: `<br>\$\{keysHtml\(r\.book \? r\.book\.n : 0\)\}`,/);
  assert.match(v, /free: '<br>🎼 연습곡은 🎹 칸이 안 차요 — 📖 진우 책 곡으로 채워요',/);
  assert.doesNotMatch(v, /pn-run-song|r\.restart|새 곡으로 🎹 칸이 처음부터|연달아 쳐요/);
  assert.match(v, /const INTRO_VER = '4';/);
  assert.match(v, /\[\['「🎹 태블릿으로 치기」', true\], \['에서 ', false\], \['📖 진우 책 곡', true\], \['의 ', false\], \['「곡 전체」', true\], \['를 골라요', false\]\]/);
  assert.match(v, /\[\['곡은 ', false\], \['섞어 쳐도 돼요', true\], \[' — 🎼 연습곡은 💰만 받아요', false\]\]/);
  assert.match(v, /'이 하루에 다 차면 🐾 음악 포켓몬이 와요! \(하루 한 마리\)'/);
  assert.doesNotMatch(src('css/style.css'), /\.pn-run-song/);
  assert.ok(Number((/CACHE_VERSION = 'v(\d+)'/.exec(src('sw.js')) || [])[1]) >= 423, 'sw v423 이상');
  assert.ok(Number((/APP_VERSION = 'v(\d+)'/.exec(src('js/version.js')) || [])[1]) >= 423, '앱 판 v423 이상');
});
