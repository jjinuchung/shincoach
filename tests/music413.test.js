// 🎹 v413 (2026-11-10 아버님 기본안 「추천대로」) — node --test tests/music413.test.js
//   ① 🎹 태블릿으로 치기도 「곡 전체」를 잘 끝까지 치면 건반 한 칸(하루 열 칸) · 열 칸이면 음악 포켓몬 — ♪ 칸과 따로
//   ② 「치다 보면 멈췄다가 3~4초 뒤 풀린다」 — 연주 중 위쪽 톡이 ⏸가 되던 것 · 건반 바로 위 띠는 건반 · 판 도중 멈춤은 크게 · 화면 멈칫은 📤
//   ③ 끝날 때 박자 판정(진우 바람) — 🎉 빵빠레 · 👏 짝짝 · 🎺 뿌우~ · 점수는 📤에만 · 보상과 상관없음
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  TAPS_PER_MON, TAP_DAY, COIN, BEAT, STALL, GRADE_DAILY, PIANO_DAILY, MONS_AT_ONCE,
  tapRule, listenRule, monsDueRule, pianoOf, copyPiano, mergePiano, slotsOf, todayOf, dayKeyOf, stepPoint, beatScore, beatGrade, pianoDayLine, pianoMd,
} from '../js/piano.js';
import { SUBJECTS } from '../js/home.js';
import { getDaily } from '../js/db.js';
import { initProfile, getProfileSnapshot, houseDo } from '../js/xp.js';
import { loadToday, clockDay } from '../js/timelimit.js';
import { PUBLIC_SONGS } from '../js/pianosongs.js';

void fakeIdb;
const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const REQ = { song: 'ode', line: -1, hand: 'R', lv: 1, sp: 1, book: true }; // v423 — 🎹 칸은 📖 진우 책 곡만(book) · 연습곡은 music423
const NOW = new Date('2026-11-10T18:00:00').getTime();
const DAY = 86400000;
const POOL = [{ id: 433, r: 1 }, { id: 358, r: 2 }, { id: 1024, r: 4 }];
const rng0 = () => 0;

// ───────────────────── ① 🎹 건반 칸 (순수) ─────────────────────

test('🎹 건반 칸 — 「곡 전체」를 잘 친 판만 · 한 줄 연습·잘 못 친 판은 안 셈 · 💰 한도와 따로 · 하루 열 칸 · 열 칸이면 음악 포켓몬', () => {
  assert.equal(TAPS_PER_MON, 10);
  const p = { coins: 0, coinsEarned: 0 };
  const line = tapRule(p, { ...REQ, line: 0, ok: 9, bad: 1 }, NOW, POOL, rng0);
  assert.deepEqual([line.slot, line.coins, line.taps], ['line', COIN.line, 0], '한 줄 연습은 💰만');
  const miss = tapRule(p, { ...REQ, ok: 6, bad: 4 }, NOW, POOL, rng0);
  assert.deepEqual([miss.slot, miss.coins, miss.why, miss.taps], ['try', 0, 'try', 0], '맞게 70% 아래는 칸도 💰도 없음');
  const r = [];
  for (let i = 0; i < 11; i += 1) r.push(tapRule(p, { ...REQ, ok: 9, bad: 1 }, NOW, POOL, rng0));
  assert.deepEqual(r.map((x) => x.slot), [...Array(10).fill('ok'), 'cap'], '책 곡 열 번 · 열하나째는 cap(하루 한 마리 — v420 · v423)');
  assert.deepEqual(r.map((x) => x.coins), [15, 15, 15, 15, 0, 0, 0, 0, 0, 0, 0], `💰는 하루 ${TAP_DAY}번 (한 줄 판 하나 포함) — 칸과 따로`);
  assert.deepEqual(r.map((x) => x.got.length), [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0], '열째 칸에 한 마리');
  assert.deepEqual([r[9].got[0], r[9].firsts[0], r[9].taps, r[9].tapMons], [433, true, 10, 1], '안 만난 아이 가운데 무게대로 · 받은 수 +1');
  assert.deepEqual(r.slice(0, 9).map((x) => x.taps), Array(9).fill(0), 'v420 — 모든 칸은 열 번을 채운 때 열 묶음째로');
  assert.equal(p.caught[433], 1, '도감에 들어감');
  assert.deepEqual(todayOf(p, NOW), { paid: 5, coins: 65, notes: 0, taps: 10, book: { n: 10, at: NOW }, won: 1 });
  const log = pianoOf(p.piano).log;
  assert.deepEqual(log.filter((x) => x.m === 't').map((x) => x.x), [0, 0, ...Array(10).fill(1), 0], '기록 줄 x = 건반 칸을 셌나');
  assert.equal(log.filter((x) => x.m === 'p').length, 1, '온 줄');
  // 다음 날은 처음부터 (v420 · v423 — 그날 책 곡 한 칸)
  const next = tapRule(p, { ...REQ, ok: 9, bad: 0 }, NOW + DAY, POOL, rng0);
  assert.deepEqual([next.slot, next.taps, next.tapMons, next.got.length, next.book], ['ok', 10, 1, 0, { n: 1, at: NOW + DAY }]);
  // 시계가 뒤로 가면 아무것도 안 셈
  assert.deepEqual(tapRule(p, { ...REQ, ok: 9, bad: 0 }, NOW - 3 * DAY, POOL, rng0), { ok: false, why: 'clock' });
});

test('🎹 건반 칸 저장 — 받은 수는 묶음 수보다 클 수 없다 · 날 칸은 하루 칸으로 자르지 않는다 · 옛 기록(칸 없음)은 0 · 병합은 큰 쪽 · 복사', () => {
  const today = dayKeyOf(NOW);
  assert.deepEqual([pianoOf({}).taps, pianoOf({}).tapMons], [0, 0], '옛 기록');
  assert.equal(pianoOf({ taps: 25, tapMons: 9 }).tapMons, 2, '묶음 수(2)보다 클 수 없다');
  // Codex 217차 P2 — 읽을 때 하루 칸(열)으로 자르면 한도를 바꾼 뒤 옛 창이 깎아 저장해 같은 날 칸이 다시 열린다 (💰 PAID_KEEP과 같은 꼴)
  assert.equal(pianoOf({ days: { [today]: { paid: 0, coins: 0, notes: 0, taps: 12 } } }).days[today].taps, 12, '날 칸은 줄이지 않는다');
  assert.equal(pianoOf({ days: { [today]: { paid: 0, coins: 0, notes: 0, taps: 400 } } }).days[today].taps, 99, '터무니없는 수만 막는다');
  // v420 · v423 — 옛 규칙으로 칸이 찬 날도 새 규칙은 0부터(책 곡 한 칸) · 날 칸은 그대로(열 번을 채우기 전엔 안 늚)
  const over = { coins: 0, coinsEarned: 0, piano: { taps: 12, tapMons: 1, days: { [today]: { paid: 0, coins: 0, notes: 0, taps: 12 } } } };
  assert.deepEqual([tapRule(over, { ...REQ, ok: 9, bad: 1 }, NOW, POOL, rng0).slot, todayOf(over, NOW).taps, todayOf(over, NOW).book], ['ok', 12, { n: 1, at: NOW }], '옛 날 칸 그대로 · 새 규칙은 한 칸부터');
  assert.equal(pianoOf({ days: { [today]: { paid: 0, coins: 0, notes: 0, taps: 7 } } }).taps, 7, '모든 칸은 날 칸 합보다 작을 수 없다');
  assert.deepEqual(pianoOf({ days: { [today]: { paid: 1, coins: 5, notes: 0 } } }).days[today], { paid: 1, coins: 5, notes: 0 }, '칸이 없는 날은 옛 꼴 그대로');
  const m = mergePiano({ taps: 12, tapMons: 1, days: { [today]: { paid: 1, coins: 5, notes: 0, taps: 2 } } }, { taps: 8, tapMons: 0, days: { [today]: { paid: 2, coins: 10, notes: 1, taps: 1 } } });
  assert.deepEqual([m.taps, m.tapMons, m.days[today]], [12, 1, { paid: 2, coins: 10, notes: 1, taps: 2 }], '큰 쪽 — 옛 백업이 받은 수를 줄이면 같은 몫이 또 온다');
  assert.deepEqual(mergePiano({ taps: 3 }, { taps: 30, tapMons: 3 }), mergePiano({ taps: 30, tapMons: 3 }, { taps: 3 }));
  const c = copyPiano({ taps: 21, tapMons: 2, days: { [today]: { paid: 0, coins: 0, notes: 0, taps: 1 } } });
  assert.deepEqual([c.taps, c.tapMons, c.days[today].taps], [21, 2, 1]);
  assert.deepEqual(slotsOf(21, 2, TAPS_PER_MON), { filled: 1, sets: 2 }, '받은 뒤엔 다시 0부터');
  assert.deepEqual(slotsOf(20, 1, TAPS_PER_MON), { filled: 10, sets: 2 }, '아직 안 온 몫이 있으면 가득');
  assert.deepEqual(slotsOf(7, 0), { filled: 5, sets: 1 }, '♪ 칸은 그대로 다섯');
});

test('🎹 밀린 몫 — 들어올 때 ♪ 몫 다음 건반 몫 · 한 번에 다섯까지 · 「다 쳤어요」도 건반 몫을 함께 · 후보가 없으면 남는다', () => {
  const p = { piano: { notes: 10, mons: 1, taps: 40, tapMons: 0, days: {} } };
  const a = monsDueRule(p, NOW, POOL, rng0);
  assert.equal(a.got.length, MONS_AT_ONCE, '♪ 하나 + 건반 넷');
  const tr = pianoOf(p.piano);
  assert.deepEqual([tr.mons, tr.tapMons], [2, 4]);
  const none = { piano: { taps: 10, days: {} } };
  assert.equal(monsDueRule(none, NOW, [], rng0).got.length, 0);
  assert.equal(pianoOf(none.piano).tapMons, 0, '후보가 없으면 몫은 남는다');
  const l = listenRule(none, { ...REQ, line: 0 }, NOW, POOL, rng0);
  assert.deepEqual([l.counted, l.got.length], [true, 1], '「다 쳤어요」 때 밀린 건반 몫도 온다');
});

// ───────────────────── ③ 🎺 박자 판정 (순수) ─────────────────────

test('🎺 박자 판정 — 걸음마다 제때 한 점 · 반 점 · 0점 · 맞게 누른 비율을 곱함 · 잘 못 친 판은 🎺 · 문턱', () => {
  assert.deepEqual(BEAT, { early: 0.35, late: 0.35, lateHalf: 1, great: 80, good: 50 });
  assert.deepEqual([stepPoint({ late: 0 }), stepPoint({ late: 0.35 }), stepPoint({ late: 0.36 }), stepPoint({ late: 1 }), stepPoint({ late: 1.01 })], [1, 1, 0.5, 0.5, 0], '막대가 닿은 뒤 기다리게 한 박');
  assert.deepEqual([stepPoint({ early: 0.1 }), stepPoint({ early: 0.35 }), stepPoint({ early: 0.5 })], [1, 1, 0.5], '막대가 닿기 전에 다 누름');
  assert.deepEqual([stepPoint({}), stepPoint({ early: 0.5, late: 0 }), stepPoint(null)], [1, 1, 0], '기다리게 했으면 늦은 쪽으로');
  assert.equal(beatScore([{ late: 0 }, { early: 0.5 }, { late: 2 }], 9, 1), 45, '(1 + 0.5 + 0) / 3 × 0.9');
  assert.equal(beatScore([{ late: 0 }], 4, 0), 100);
  assert.deepEqual([beatScore([], 3, 0), beatScore([{ late: 0 }], 0, 0)], [0, 0], '걸음·맞힌 게 없으면 0');
  assert.deepEqual([beatGrade(100, 9, 1), beatGrade(80, 9, 1), beatGrade(79, 9, 1), beatGrade(50, 9, 1), beatGrade(49, 9, 1)], ['great', 'great', 'good', 'good', 'boo']);
  assert.equal(beatGrade(100, 6, 4), 'boo', '건반을 마구 누른 판(맞게 70% 아래)은 박자가 맞아도 🎺');
  assert.deepEqual(GRADE_DAILY, { great: 'pnFan', good: 'pnClap', boo: 'pnBoo' });
  const p = {};
  tapRule(p, { ...REQ, ok: 9, bad: 1, g: 85, st: 3210 }, NOW, POOL, rng0);
  tapRule(p, { ...REQ, ok: 9, bad: 1, g: 101, st: 400 }, NOW, POOL, rng0);
  tapRule(p, { ...REQ, ok: 9, bad: 1, g: 'x' }, NOW, POOL, rng0);
  const rows = pianoOf(p.piano).log;
  assert.deepEqual([rows[0].g, rows[0].st], [85, 3210]);
  assert.deepEqual(['g' in rows[1], 'st' in rows[1], 'g' in rows[2]], [false, false, false], '깨진 점수 · 1초 아래 멈칫은 안 남긴다');
  assert.equal(pianoOf({ log: [{ at: NOW, m: 'l', s: 'ode', g: 90, st: 5000 }] }).log[0].g, undefined, '🎧 줄엔 없다');
});

// ───────────────────── 📤 · 잇기 ─────────────────────

test('📤 하루 줄 — 건반 칸 · 박자 🎉👏🎺 · 화면 멈칫(멈칫만 있던 날도) · 옛 줄 꼴 그대로 · music.md 읽는 법 · 줄 끝', () => {
  for (const k of ['pnTapSlots', 'pnFan', 'pnClap', 'pnBoo', 'pnStallN', 'pnStallLong']) assert.ok(PIANO_DAILY.includes(k), k);
  assert.deepEqual(STALL, { ms: 1000, long: 2500 });
  assert.equal(pianoDayLine({ pnTapN: 3, pnTapOk: 2, pnCoins: 20, pnTapSlots: 1, pnFan: 1, pnClap: 1, pnBoo: 1 }), '🎹 태블릿 치기 끝까지 3판(잘 친 판 2 · 💰20 · 🎹 건반 칸 1 · 박자 🎉1 👏1 🎺1)');
  assert.equal(pianoDayLine({ pnTapN: 1, pnTapOk: 1, pnCoins: 5 }), '🎹 태블릿 치기 끝까지 1판(잘 친 판 1 · 💰5)', '옛 날 줄');
  assert.equal(pianoDayLine({ pnStallN: 2, pnStallLong: 1 }), '⚠️ 연주 중 화면 멈칫 2번(2.5초 넘게 1번)', '멈칫만 있던 날도');
  assert.equal(pianoDayLine({ pnStallLong: 1 }), '');
  const p = {};
  tapRule(p, { ...REQ, ok: 9, bad: 1, g: 85, st: 3210 }, NOW, POOL, rng0);
  tapRule(p, { ...REQ, line: 0, ok: 6, bad: 4, g: 95 }, NOW, POOL, rng0);
  const md = pianoMd(p.piano, '2026-11-10');
  assert.match(md, /- 🎹 건반 칸\(v413\) = 🎹 태블릿 치기로 「곡 전체」를 잘\(맞게 70% 넘게\) 끝까지 친 판 — 줄 끝 「🎹 칸」 · v423부터 \*\*📖 진우 책 곡\(아빠가 넣은 곡\)을 하루에 10번\*\* 치면 🐾 음악 포켓몬 한 마리/);
  assert.match(md, /- 박자\(v413\) = .*🎉 빵빠레 80점 이상 · 👏 짝짝 50점 이상 · 🎺 뿌우~ 그 아래/);
  assert.match(md, /- 멈칫\(v413\) = 그 판 동안 화면이 1초 넘게 멈춘 가장 긴 시간/);
  assert.doesNotMatch(md, /\n🎹 건반 칸 모두/, 'v420 — 열 번을 채우기 전엔 모든 칸이 안 늚');
  assert.match(md, /\n🎹 책 곡 칸\(v423 — 날마다 찬 칸 · 채운 곡 — 최근 기록에 남은 것\) 11-10 1\/10 \(ode\)\n/, '오늘 책 곡 칸 줄');
  assert.match(md, /🎹 치기 · ode 곡 전체 · 오른손 · 도움 1 · 100% · 맞게 9\/10 \(90%\) · 💰15 · 🎹 칸 · 박자 85점 🎉 · 멈칫 3\.2초\n/);
  assert.match(md, /🎹 치기 · ode 1째 줄 · 오른손 · 도움 1 · 100% · 맞게 6\/10 \(60%\) · 박자 95점 🎺\n/, '잘 못 친 판은 점수가 높아도 🎺');
  assert.doesNotMatch(pianoMd({ notes: 1 }, '2026-11-10'), /🎹 건반 칸 모두/, '칸이 없으면 그 줄 없음');
  assert.ok(pianoMd({ taps: 1 }, '2026-11-10'), '칸만 있어도 파일');
  assert.match(src('js/upload.js'), /🎹 건반 칸\(v413\) = 태블릿 치기로 「곡 전체」를 잘 끝까지 친 판\(하루 열 칸 · 열 칸마다 음악 포켓몬 · v423부터 📖 진우 책 곡만 — 자세히는 music\.md\) · 박자 🎉 빵빠레·👏 짝짝·🎺 뿌우~ = 판 끝 박자 판정\(아이 화면엔 점수 없음 · 점수는 music\.md\) · ⚠️ 연주 중 화면 멈칫 = 연주 중에 화면이 1초 넘게 멈춘 번/);
});

test('🔌 잇기 — 홈 카드 · xp 한 트랜잭션 · 안내 판 · CSS · sw v413', () => {
  assert.equal(SUBJECTS.find((s) => s.key === 'music').desc, '🐾 끝까지 치면 음악 포켓몬!');
  assert.match(src('js/xp.js'), /pianoTapRule\(p, req, Date\.now\(\), musicPool\(p\), Math\.random\)/);
  const v = src('js/pianoview.js');
  assert.match(v, /const INTRO_VER = '4';/); // v420 · v423 — 새 규칙으로 한 번 더
  const css = src('css/style.css');
  for (const s of ['.pn-tkeys {', '.pn-tkeys span.on {', '.pn-intro-way {', '.pn-toast .pn-tkeys span {', '.pn-toast.is-high { top: 22%; }']) assert.ok(css.includes(s), s);
  assert.match(css, /\.pn-intro-card \{ max-height: calc\(100vh - 32px\); max-height: calc\(100dvh - 32px\); overflow-y: auto; \}/, '안내 창이 길어져도 낮은 화면에서 내려 본다');
  assert.ok(!css.includes('.pn-intro-tap'), '옛 「화면 건반은 💰」 줄 꼴은 지움');
  assert.ok(Number((/CACHE_VERSION = 'v(\d+)'/.exec(src('sw.js')) || [])[1]) >= 413, 'sw v413 이상');
  assert.ok(Number((/APP_VERSION = 'v(\d+)'/.exec(src('js/version.js')) || [])[1]) >= 413, '앱 판 v413 이상');
});

// ───────────────────── 화면 — 가짜 화면으로 pianoview.js를 직접 ─────────────────────

const all = [];
let draws = 0;
let texts = [];
class El {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.children = []; this.parent = null; this.on = {}; this.attrs = {}; this.style = {};
    this.hidden = false; this.disabled = false; this._text = ''; this._html = ''; this.className = ''; this.id = ''; this.value = ''; this.src = '';
    all.push(this);
  }
  get textContent() { return this._text + this.children.map((c) => c.textContent).join(''); }
  set textContent(v) { for (const c of this.children) c.parent = null; this.children = []; this._text = String(v); }
  get innerHTML() { return this._html; }
  set innerHTML(v) { this.textContent = ''; this._html = String(v); }
  appendChild(c) { c.parent = this; this.children.push(c); return c; }
  remove() { if (this.parent) { this.parent.children = this.parent.children.filter((c) => c !== this); this.parent = null; } }
  addEventListener(t, f) { (this.on[t] ||= []).push(f); }
  click() { for (const f of this.on.click || []) f({ offsetX: 10, offsetY: 10 }); }
  fire(t, ev) { for (const f of this.on[t] || []) f(ev); }
  focus() {}
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  getContext() {
    const o = {};
    const fns = { setTransform: () => { draws += 1; }, fillText: (t) => { texts.push(String(t)); }, createLinearGradient: () => ({ addColorStop() {} }) };
    return new Proxy(o, { get: (x, k) => (k in x ? x[k] : fns[k] || (() => {})), set: (x, k, v) => { x[k] = v; return true; } });
  }
  getBoundingClientRect() { return { top: 80, left: 0, width: 1000, height: 600 }; }
  get clientWidth() { return 1000; }
  setPointerCapture() {}
}
const ROOT = new El('html');
const VIEW = new El('section');
VIEW.id = 'view-music';
ROOT.appendChild(VIEW);
for (const id of ['music-main', 'btn-music-back']) { const e = new El('div'); e.id = id; VIEW.appendChild(e); }
const attached = (e) => { for (let x = e; x; x = x.parent) if (x === ROOT) return true; return false; };
const byId = (id) => { for (let i = all.length - 1; i >= 0; i -= 1) if (all[i].id === id && attached(all[i])) return all[i]; return null; };
function button(text) {
  for (let i = all.length - 1; i >= 0; i -= 1) if (all[i].tagName === 'BUTTON' && all[i].textContent.trim() === text && attached(all[i])) return all[i];
  throw new Error(`단추 없음: ${text}`);
}
const canvas = () => { for (let i = all.length - 1; i >= 0; i -= 1) if (all[i].tagName === 'CANVAS' && attached(all[i])) return all[i]; return null; };
globalThis.document = { hidden: false, documentElement: ROOT, getElementById: byId, createElement: (t) => new El(t), addEventListener() {}, querySelectorAll: () => [] };
// 소리 장치 — 효과 소리(거른 톱니파 · 손뼉 잡음)까지 되는 가짜 · 무엇을 울렸나 센다
class Param { constructor(v = 1) { this.value = v; } setValueAtTime() {} exponentialRampToValueAtTime() {} linearRampToValueAtTime() {} setTargetAtTime() {} cancelScheduledValues() {} }
const snd = { saw: 0, clap: 0, cut: 0 }; // cut = 때 없이 stop() — 「지금 끄기」 (예약된 끝은 때를 준다)
let fullAudio = true;
class FakeAC {
  constructor() { this.currentTime = 0; this.state = 'running'; this.destination = {}; this.sampleRate = 8000; }
  createGain() { return { gain: new Param(1), connect() {}, disconnect() {} }; }
  createDynamicsCompressor() { return { connect() {} }; }
  createOscillator() { return { type: '', frequency: new Param(440), connect() {}, start() { if (this.type === 'sawtooth') snd.saw += 1; }, stop(t) { if (t === undefined) snd.cut += 1; }, onended: null }; }
  createBiquadFilter() { if (!fullAudio) throw new Error('없음'); return { type: '', frequency: new Param(1000), Q: new Param(1), connect() {} }; }
  createBuffer(c, n) { const d = new Float32Array(n); return { getChannelData: () => d }; }
  createBufferSource() { return { buffer: null, connect() {}, start() { snd.clap += 1; }, stop(t) { if (t === undefined) snd.cut += 1; }, onended: null }; }
  resume() { this.state = 'running'; return Promise.resolve(); }
  suspend() { this.state = 'suspended'; return Promise.resolve(); }
}
globalThis.window = { addEventListener() {}, innerHeight: 800, devicePixelRatio: 1, AudioContext: FakeAC };
const rafs = new Map();
let rafId = 0;
globalThis.requestAnimationFrame = (f) => { rafId += 1; rafs.set(rafId, f); return rafId; };
globalThis.cancelAnimationFrame = (id) => { rafs.delete(id); };
let skew = 0;
const base = performance.now();
Object.defineProperty(performance, 'now', { value: () => base + skew, configurable: true, writable: true });
function frames(n, step = 16) {
  const drew = [];
  for (let i = 0; i < n; i += 1) {
    skew += step;
    const batch = [...rafs.values()];
    rafs.clear();
    const d0 = draws;
    for (const f of batch) f(performance.now());
    drew.push(draws > d0);
  }
  return drew;
}
globalThis.fetch = () => Promise.reject(new Error('시험에선 그림을 안 받는다'));
Object.defineProperty(globalThis, 'navigator', { value: { wakeLock: { request: () => Promise.reject(new Error('없음')) } }, configurable: true });
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: (k) => { store.delete(k); },
};
store.set('shincoach.pianoSongsAt', String(Date.now()));
store.set('shincoach.pianoSongs', JSON.stringify([{ ...PUBLIC_SONGS[0], id: 'bk', ko: '책 곡' }])); // 📖 진우 책 곡 하나 — v423부터 🎹 칸은 책 곡만
store.set('shincoach.musicIntro', '4');
const settle = (ms = 20) => new Promise((r) => setTimeout(r, ms));
async function waitFor(cond, what, ms = 4000) {
  const t0 = Date.now();
  while (!(await cond())) {
    if (Date.now() - t0 > ms) throw new Error(`기다림 넘침: ${what}`);
    await settle(10);
  }
}
const daily = async () => (await getDaily(clockDay())) || {};
const num = (v) => Number(v) || 0;
const piano = () => pianoOf(getProfileSnapshot().piano);
const tapRows = () => piano().log.filter((r) => r.m === 't');
const setPiano = (pn) => houseDo((p) => { p.piano = pn; return { ok: true }; });
let PV;
let P;

before(async () => {
  console.warn = () => {};
  await initProfile();
  await loadToday();
  PV = await import('../js/pianoview.js');
  PV.initMusic({ showView: () => {} });
  await PV.enterMusic();
  P = globalThis.window.__piano;
});

/** 무대 — 🎹 태블릿으로 치기 · 오른손 · 어디를 · 되풀이 · 곡(🎹 칸을 보는 시험은 📖 책 곡 'bk' — v423) */
function stage({ line = '곡 전체', loop = '한 번', song = 'ode' } = {}) {
  P.openSong(song);
  button('🎹 태블릿으로 치기').click();
  button('오른손').click();
  button(line).click();
  button(loop).click();
}
/** 기다리는 걸음마다 — late박 더 기다리게 한 뒤 맞는 건반 (판 끝까지 · 또는 한 판이 끝날 때까지) */
function playTimed(late = 0) {
  const gen = P.S.gen;
  const start = tapRows().length;
  for (let g = 0; g < 5000 && P.S.running && P.S.gen === gen; g += 1) {
    const si = P.S.si;
    const st = P.S.steps[si];
    if (P.S.waiting && st) {
      if (late) P.advance(late);
      for (const m of st.need) P.press(m);
    }
    P.advance(0.25);
    if (P.S.t < -3.9 && P.S.si === 0 && g > 10) break; // 🔁 계속 — 다음 판 처음으로 왔다
  }
  return start;
}
const keyY = () => P.G.keysTop + P.G.keysH * 0.9;
const whiteX = (k) => (k + 0.5) * P.G.kw;

test('② 위쪽 톡 — 멈춰 있으면 시작 · 연주 중엔 멈추지 않는다(⏸ 단추로만) · 🎧은 그대로', () => {
  stage({ line: '1줄' });
  const cv = canvas();
  skew += 2000;
  cv.fire('click', { offsetX: 500, offsetY: 60 });
  assert.equal(P.S.running, true, '위쪽 톡 = 시작');
  for (const y of [60, P.G.barsTop + 20, P.G.keysTop - 40]) {
    cv.fire('click', { offsetX: 300, offsetY: y });
    assert.equal(P.S.running, true, `연주 중 위쪽(${Math.round(y)}) 톡은 멈춤이 아니다`);
  }
  byId('pn-go').click();
  assert.equal(P.S.running, false, '⏸ 단추로는 멈춘다');
  button('🎧 듣고 따라 치기').click();
  canvas().fire('click', { offsetX: 500, offsetY: 60 });
  assert.equal(P.S.running, true);
  canvas().fire('click', { offsetX: 500, offsetY: 60 });
  assert.equal(P.S.running, false, '🎧은 톡 = 시작·멈춤 그대로(진우가 화면을 안 만진다)');
});

test('② 건반 바로 위 띠는 건반 · 그 위는 아무것도 아님 · 건반을 누른 손가락이 위로 미끄러져 뗀 톡은 시작이 아니다', () => {
  stage();
  const cv = canvas();
  const x = whiteX(3);
  assert.equal(P.hitKey(x, P.G.keysTop - 12), P.hitKey(x, P.G.keysTop + 1), '띠 = 건반 윗부분');
  assert.notEqual(P.hitKey(x, P.G.keysTop - 12), null);
  assert.equal(P.hitKey(x, P.G.keysTop - 26), null, '그 위는 건반이 아니다');
  assert.equal(P.hitKey(x, keyY()), P.hitKey(x, P.G.keysTop + P.G.keysH * 0.8), '아래쪽은 그대로');
  let xb = 0; // 검은 건반이 있는 흰 건반 사이 (미·시 뒤는 없다)
  for (let wi = P.S.win.lo; wi < P.S.win.hi && !xb; wi += 1) if (![2, 6].includes(((wi % 7) + 7) % 7)) xb = (wi - P.S.win.lo + 1) * P.G.kw;
  const black = P.hitKey(xb, P.G.keysTop + 2);
  assert.ok(black > 0 && [1, 3, 6, 8, 10].includes(black % 12), '검은 건반 자리');
  assert.equal(P.hitKey(xb, P.G.keysTop - 10), black, '검은 건반 위 띠는 그 검은 건반 — 흰 건반 아래로 보내지 않는다');
  // 누름 없이 띠를 톡 (마우스·오래 누른 뒤) — 시작이 아니다
  skew += 2000;
  cv.fire('click', { offsetX: x, offsetY: P.G.keysTop - 10 });
  assert.equal(P.S.running, false, '띠 톡은 시작이 아니다');
  skew += 2000;
  // 멈춰 있을 때 건반을 누르고 위로 미끄러져 뗐다 — 그 뒤 오는 톡은 시작이 아니다
  cv.fire('pointerdown', { offsetX: x, offsetY: keyY(), pointerId: 7, preventDefault() {} });
  cv.fire('pointermove', { offsetX: x, offsetY: P.G.keysTop - 60, pointerId: 7 });
  cv.fire('pointerup', { offsetX: x, offsetY: P.G.keysTop - 60, pointerId: 7 });
  cv.fire('click', { offsetX: x, offsetY: P.G.keysTop - 60 });
  assert.equal(P.S.running, false, '건반에서 미끄러진 톡');
  assert.equal(P.S.held.size, 0, '뗀 건반 소리는 멈춤');
  skew += 900;
  cv.fire('click', { offsetX: x, offsetY: P.G.keysTop - 60 });
  assert.equal(P.S.running, true, '조금 뒤 위쪽 톡은 시작');
  byId('pn-go').click();
  // 띠를 눌러도 시작이 아니라 건반
  skew += 2000;
  const n0 = P.S.flash.size;
  cv.fire('pointerdown', { offsetX: x, offsetY: P.G.keysTop - 10, pointerId: 8, preventDefault() {} });
  cv.fire('pointerup', { offsetX: x, offsetY: P.G.keysTop - 10, pointerId: 8 });
  cv.fire('click', { offsetX: x, offsetY: P.G.keysTop - 10 });
  assert.equal(P.S.running, false);
  assert.ok(P.S.flash.size > n0 || P.S.flash.has(P.hitKey(x, P.G.keysTop)), '건반 빛');
});

test('② 판 도중 멈추면 가운데 「⏸ 멈췄어요」 · 처음 자리에선 작은 「위쪽을 톡 = 시작」 · 🎧은 「톡 누르면 이어서」', () => {
  stage();
  texts = [];
  frames(20);
  assert.ok(texts.includes('위쪽을 톡 = 시작'));
  assert.ok(!texts.includes('⏸ 멈췄어요'), '처음 자리엔 멈춤 띠 없음');
  byId('pn-go').click();
  P.advance(6);
  byId('pn-go').click();
  texts = [];
  frames(20);
  assert.ok(texts.includes('⏸ 멈췄어요'));
  assert.ok(texts.includes('▶ 시작을 누르면 이어서 쳐요'));
  assert.ok(!texts.includes('위쪽을 톡 = 시작'));
  button('🎧 듣고 따라 치기').click();
  byId('pn-go').click();
  P.advance(3);
  byId('pn-go').click();
  texts = [];
  frames(20);
  assert.ok(texts.includes('톡 누르면 이어서 들어요'));
});

test('② 연주 중 화면 멈칫 — 1초 넘으면 하루 칸 · 2.5초 넘으면 따로 · 그 판의 가장 긴 것은 🎹 치기 줄에 · 멈춰 있을 때는 안 셈', async () => {
  stage();
  const d0 = await daily();
  byId('pn-go').click();
  frames(1, 1200);
  frames(3);
  frames(1, 3100);
  byId('pn-go').click();
  frames(1, 5000); // 멈춰 있을 때 — 안 셈
  await waitFor(async () => num((await daily()).pnStallN) - num(d0.pnStallN) === 2, '멈칫 두 번');
  const d1 = await daily();
  assert.equal(num(d1.pnStallLong) - num(d0.pnStallLong), 1);
  assert.equal(P.S.passStall, 3100);
  const at = tapRows().length;
  byId('pn-go').click();
  playTimed(0);
  await waitFor(() => tapRows().length === at + 1, '판 끝 저장');
  assert.equal(tapRows().at(-1).st, 3100, '그 판의 가장 긴 멈칫');
  assert.equal(P.S.passStall, 0, '다음 판은 0부터');
});

test('③ 박자 판정 — 제때 치면 🎉 빵빠레·꽃가루 · 반쯤 늦으면 👏 · 많이 늦으면 🎺 뿌우~ · 하루 칸 · 점수는 기록 줄에만 · 화면 글에 숫자 없음', async () => {
  const cases = [[0, 'great', '🎉 빠바밤!', '박자가 딱딱 맞았어요!', 100], [0.4, 'good', '👏 짝짝짝!', '끝까지 잘 쳤어요!', 50], [1.5, 'boo', '🎺 뿌우~', '다음엔 박자에 맞춰 볼까요?', 0]];
  for (const [late, kind, big, small, score] of cases) {
    stage();
    const d0 = await daily();
    const s0 = { ...snd };
    const at = tapRows().length;
    byId('pn-go').click();
    playTimed(late);
    assert.equal(P.S.running, false, '한 번이면 판 끝에 멈춤');
    assert.equal(P.S.fx.kind, kind);
    assert.equal(P.S.fx.bits ? P.S.fx.bits.length : 0, kind === 'great' ? 36 : 0, '꽃가루는 🎉만');
    texts = [];
    const drew = frames(10);
    assert.ok(drew.every(Boolean), '멈춰 있어도 효과 동안은 화면마다 그린다');
    assert.ok(texts.includes(big) && texts.includes(small), `${kind} 글`);
    assert.ok(!texts.includes('⏸ 멈췄어요') && !texts.includes('위쪽을 톡 = 시작'), '효과 동안 다른 글은 가린다');
    assert.ok(![big, small].some((t) => /\d/.test(t)), '효과 글에 숫자 없음');
    const want = { great: [8, 0], good: [1, 3], boo: [4, 0] }[kind]; // 🎉 가락 넷 + 화음 넷 · 👏 손뼉 셋 + 띠링 · 🎺 뿌- 셋 + 뿌우~
    assert.deepEqual([snd.saw - s0.saw, snd.clap - s0.clap], want, `${kind} 소리`);
    await waitFor(async () => num((await daily())[GRADE_DAILY[kind]]) - num(d0[GRADE_DAILY[kind]]) === 1, `하루 칸 ${kind}`);
    await waitFor(() => tapRows().length === at + 1, '기록 줄');
    assert.equal(tapRows().at(-1).g, score, '박자 점수는 기록 줄에');
    frames(170); // 2.7초 — 효과 끝
    texts = [];
    frames(20);
    assert.ok(!texts.includes(big), '효과가 끝나면 사라진다');
    assert.ok(texts.includes('위쪽을 톡 = 시작'));
  }
});

test('③ 막대가 닿기 반 박 전에 누르면(일찍) 반 점 — 걸음마다 남은 박을 적는다 · 👏', async () => {
  stage();
  const at = tapRows().length;
  byId('pn-go').click();
  for (let g = 0; g < 5000 && P.S.running; g += 1) {
    const st = P.S.steps[P.S.si];
    if (st && !P.S.waiting && st.got.size === 0 && st.t - P.S.t <= 0.5 + 1e-9) for (const m of st.need) P.press(m);
    P.advance(0.25);
  }
  assert.ok(P.S.steps.length > 0);
  assert.equal(P.S.fx.kind, 'good');
  await waitFor(() => tapRows().length === at + 1, '기록 줄');
  assert.equal(tapRows().at(-1).g, 50, '모두 반 박 일찍 — 반 점씩');
});

test('③ 🔁 계속 — 효과 동안 다음 판 준비 숫자를 가린다 · 끝나면 준비 · 소리 장치가 모자라도 그림은 나온다 · 곡을 바꾸면 효과는 지운다', () => {
  stage({ loop: '🔁 계속' });
  byId('pn-go').click();
  fullAudio = false;
  try {
    playTimed(0);
  } finally { fullAudio = true; }
  assert.equal(P.S.running, true, '계속 — 다음 판');
  assert.equal(P.S.fx.kind, 'great', '소리가 안 나도 그림');
  texts = [];
  frames(5);
  assert.ok(texts.includes('🎉 빠바밤!') && !texts.includes('준비'), '효과 동안 준비 숫자는 가림');
  frames(150);
  texts = [];
  frames(5);
  assert.ok(texts.includes('준비'), '효과가 끝나면 준비');
  byId('pn-go').click();
  button('1줄').click();
  assert.equal(P.S.fx, null, '판을 새로 하면 효과는 지운다');
});

test('① 화면 — 🎹 치기 칸은 건반 열 · 곡 전체를 잘 치면 한 칸(알림에 칸 그림) · 한 줄 연습은 「곡 전체」 안내 · 열째 칸에 음악 포켓몬 · 하루 칸', async () => {
  await setPiano({ taps: 0, tapMons: 0, days: {} });
  stage({ song: 'bk' });
  assert.match(byId('pn-slots').innerHTML, /^<span class="pn-tkeys">(<span class=""><\/span>){10}<\/span>/);
  const d0 = await daily();
  byId('pn-go').click();
  playTimed(0);
  const bookN = () => { const e = piano().days[clockDay()]; return e && e.book ? e.book.n : 0; }; // v423 — 오늘 책 곡 칸
  await waitFor(() => bookN() === 1, '한 칸');
  await settle(30);
  assert.match(byId('pn-slots').innerHTML, /^<span class="pn-tkeys"><span class="on"><\/span>(<span class=""><\/span>){9}<\/span>/, '건반 하나가 빛남 · 칸 옆 곡 이름 없음(v423)');
  assert.match(byId('pn-toast').innerHTML, /<span class="pn-tkeys"><span class="on"><\/span>/, '알림에도 칸 그림');
  assert.equal(byId('pn-toast').className, 'pn-toast is-high', '효과가 떠 있으면 알림은 위로 — 효과 띠를 가리지 않게');
  assert.doesNotMatch(byId('pn-toast').innerHTML.replace(/💰 \+\d+/, ''), /\d/, '칸 수는 글로 안 쓴다');
  assert.equal(num((await daily()).pnTapSlots) - num(d0.pnTapSlots), 1);
  // 한 줄 연습
  stage({ line: '1줄', song: 'bk' });
  byId('pn-go').click();
  playTimed(0);
  await waitFor(() => /「곡 전체」를 끝까지 치면 🎹 건반 칸이 차요/.test(byId('pn-toast').innerHTML), '한 줄 연습 안내');
  assert.equal(bookN(), 1, '한 줄은 안 셈');
  // 🎼 연습곡 「곡 전체」 — 💰만 · 칸은 안 참 · 한 줄 안내 (v423)
  stage();
  byId('pn-go').click();
  playTimed(0);
  await waitFor(() => /🎼 연습곡은 🎹 칸이 안 차요 — 📖 진우 책 곡으로 채워요/.test(byId('pn-toast').innerHTML), '연습곡 안내');
  assert.equal(bookN(), 1, '연습곡은 안 셈');
  assert.equal(num((await daily()).pnTapSlots) - num(d0.pnTapSlots), 1, '하루 칸도 그대로');
  // 책 곡으로 아홉 칸 찬 날 — 열째 판에 음악 포켓몬 (v423 — 곡을 섞어도)
  await setPiano({ taps: 0, tapMons: 0, days: { [clockDay()]: { paid: 0, coins: 0, notes: 0, book: { n: 9 } } } });
  stage({ song: 'bk' });
  assert.match(byId('pn-slots').innerHTML, /^<span class="pn-tkeys">(<span class="on"><\/span>){9}<span class=""><\/span><\/span>/);
  const m0 = num((await daily()).pnMons);
  byId('pn-go').click();
  playTimed(0);
  await waitFor(() => byId('pn-arrive'), '온 창');
  assert.match(byId('pn-arrive').textContent, /🎵 (새 음악 포켓몬이 왔어요!|음악 포켓몬이 또 놀러 왔어요!)/);
  assert.deepEqual([piano().taps, piano().tapMons], [10, 1]);
  assert.match(byId('pn-slots').innerHTML, /<span class="pn-tkeys">(<span class="on"><\/span>){10}<\/span>/, '오늘 받았으면 가득(하루 한 마리 · v420)');
  await waitFor(async () => num((await daily()).pnMons) === m0 + 1, '하루 칸 온 수');
  button('좋아요!').click();
  // 오늘은 받았다 — 더 쳐도 💰만
  stage({ song: 'bk' });
  byId('pn-go').click();
  playTimed(0);
  await waitFor(() => /오늘 음악 포켓몬은 만났어요/.test(byId('pn-toast').innerHTML), '하루 한 마리');
  assert.equal(piano().taps, 10);
});

test('① 들어올 때 밀린 건반 몫도 — 저장이 실패해 못 받은 몫', async () => {
  await setPiano({ taps: 20, tapMons: 1, days: {} });
  PV.leaveMusic();
  await PV.enterMusic();
  await waitFor(() => byId('pn-arrive'), '밀린 몫 온 창');
  assert.equal(piano().tapMons, 2);
  button('좋아요!').click();
});

// ───────────────────── Codex 217차 ─────────────────────

test('Codex 217차 P2 — 🔁 계속으로 치다 열째 칸 — 온 창이 뜨면 ⏸ · 창 뒤에서 다음 판이 흐르지 않는다 · 닫고 ▶로 이어', async () => {
  await setPiano({ taps: 0, tapMons: 0, days: { [clockDay()]: { paid: 0, coins: 0, notes: 0, book: { n: 9 } } } }); // v423 — 책 곡 아홉 칸
  stage({ loop: '🔁 계속', song: 'bk' });
  byId('pn-go').click();
  playTimed(0);
  assert.equal(P.S.running, true, '계속 — 다음 판');
  await waitFor(() => byId('pn-arrive'), '온 창');
  assert.equal(P.S.running, false, '온 창이 뜨면 멈춤');
  const t0 = P.S.t;
  frames(60);
  assert.equal(P.S.t, t0, '창 뒤에서 흐르지 않는다');
  assert.ok(!P.S.steps[0].late, '다음 판 첫 음에 「늦음」이 쌓이지 않는다');
  button('좋아요!').click();
  byId('pn-go').click();
  assert.equal(P.S.running, true, '닫고 ▶로 이어');
  byId('pn-go').click();
});

test('Codex 217차 P2 — 판 끝 효과 소리는 떠날 때·곡을 바꿀 때 끈다(그림도) · 한 번 판 끝 멈춤은 효과를 끄지 않는다', async () => {
  stage();
  const c0 = snd.cut;
  byId('pn-go').click();
  playTimed(0);
  assert.equal(P.S.fx.kind, 'great');
  assert.equal(snd.cut, c0, '판 끝 멈춤은 효과를 끄지 않는다');
  PV.leaveMusic();
  assert.equal(snd.cut - c0, 12, '떠나면 🎉 나팔 여덟 + 떨림 넷을 끈다');
  assert.equal(P.S.fx, null, '효과 그림도 지운다');
  await PV.enterMusic();
  byId('pn-go').click();
  playTimed(1.5);
  assert.equal(P.S.fx.kind, 'boo');
  const c1 = snd.cut;
  button('1줄').click();
  assert.equal(snd.cut - c1, 5, '곡·줄을 바꾸면 🎺 뿌- 셋 + 뿌우~ + 떨림 하나를 끈다');
  byId('pn-go').click();
  playTimed(0.4);
  assert.equal(P.S.fx.kind, 'good');
  const c2 = snd.cut;
  PV.leaveMusic();
  assert.equal(snd.cut - c2, 4, '👏 손뼉 셋 + 띠링만 — 이미 끈 소리는 다시 끄지 않는다');
  await PV.enterMusic();
});

test('Codex 217차 P3 — 건반을 오래 누르다 위로 미끄러져 떼도 그 톡은 시작이 아니다', () => {
  stage();
  const cv = canvas();
  const x = whiteX(3);
  skew += 2000;
  cv.fire('pointerdown', { offsetX: x, offsetY: keyY(), pointerId: 11, preventDefault() {} });
  skew += 1500; // 0.8초 넘게 누르고 있다
  cv.fire('pointermove', { offsetX: x, offsetY: P.G.keysTop - 60, pointerId: 11 });
  cv.fire('pointerup', { offsetX: x, offsetY: P.G.keysTop - 60, pointerId: 11 });
  cv.fire('click', { offsetX: x, offsetY: P.G.keysTop - 60 });
  assert.equal(P.S.running, false, '뗀 때부터 0.8초는 시작이 아니다');
  skew += 900;
  cv.fire('click', { offsetX: x, offsetY: P.G.keysTop - 60 });
  assert.equal(P.S.running, true, '조금 뒤 위쪽 톡은 시작');
  byId('pn-go').click();
});
