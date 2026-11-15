// 🎯 v429 음악 포켓몬 → 몬스터볼 잡기 (2026-11-15 아버님 「추천대로」) — node --test tests/music429.test.js
//   📖 책 곡 하루 열 번 · 🎧 ♪ 다섯 칸마다 음악 포켓몬이 「그냥 오던」 것을 **다른 과목과 같은 잡기 화면**으로:
//   ① 둘 다 잡기 기회 하나(장부 profile.piano.ball { earned, used, refunded } — 늘기만 · 병합 max · refunded ≤ used)
//   ② 못 잡으면 그 기회는 끝 · 하루 한 기회 그대로(책 곡 day.won → cap)
//   ③ 몫이 찬 그 자리에서 바로 잡기 화면 · 안 던지고 닫았거나 밀린 기회는 「🎯 음악 포켓몬 잡기」 단추(숫자 없음)
//   ④ 후보 넷은 안 만난 아이 먼저(흔함 4·보통 3·희귀 2·전설 1 무게) · 그림 있는 음악 포켓몬에서
//   ⑤ 남은 몫은 새 판 첫 진입에 기회로 · 이미 받은 음악 포켓몬·옛 'p' 줄·pnMons는 그대로
//   국어 runKorCatch와 같은 안전 — 띄우기 전에 빼고(못 빼면 안 띄움) · 판정 때 장부 줄 지우기 · 안 던지면 돌려주기 · 꺼진 뒤 남은 줄은 들어올 때
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  TAPS_PER_MON, NOTES_PER_MON, CANDS, PIANO_DAILY, MON_WEIGHT, ballOf, ballLeft, musicTakeRule, musicGiveBackRule, musicJudgedRule, musicThrowsLeft, pickMusicCands,
  tapRule, listenRule, monsDueRule, pianoOf, copyPiano, mergePiano, todayOf, dayKeyOf, pianoDayLine, pianoMd,
} from '../js/piano.js';
import { ROSTER, ART_FETCH_MS } from '../js/pokemon.js';
import { initProfile, getProfileSnapshot, houseDo, pianoTap, pianoTakeThrow, pianoGiveBackThrow, pianoThrowsLeft, pianoJudged, rarityOf, caughtCount } from '../js/xp.js';
import { getDaily } from '../js/db.js';
import { loadToday, clockDay } from '../js/timelimit.js';
import { initCatch, closeCatch, isCatchOpen } from '../js/catch.js';
import { holdAdd, PAGE_ID, HOLD_BEAT_MS } from '../js/throwhold.js';
import { setSfxEnabled } from '../js/sfx.js';
import { setBgmEnabled } from '../js/bgm.js';
import { PUBLIC_SONGS } from '../js/pianosongs.js';

void fakeIdb;
const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const MUSIC = ROSTER.filter((r) => r.subject === 'music').map((r) => r.id);
const REQ = { song: 'bk', line: -1, hand: 'R', lv: 1, sp: 1 };
const NOW = new Date('2026-11-15T18:00:00').getTime();
const DAY = 86400000;
const bookPlay = (more = {}) => ({ ...REQ, ok: 9, bad: 1, book: true, ...more });
const Z = { earned: 0, used: 0, refunded: 0 };

// ───────────────────── ① 장부 (순수) ─────────────────────

test('🎯 장부 고쳐 읽기 — 늘기만 하는 세 카운터 · 깨진 값은 0 · 내림 · 돌려준 수는 뺀 수를 넘지 않는다 · 남은 기회', () => {
  assert.deepEqual(ballOf(null), Z);
  assert.deepEqual(ballOf({ earned: 3.9, used: '2', refunded: 9 }), { earned: 3, used: 2, refunded: 2 }, '돌려준 수 ≤ 뺀 수');
  assert.deepEqual(ballOf({ earned: -1, used: NaN, refunded: Infinity }), Z);
  assert.deepEqual(ballOf({ earned: 2 ** 60 }), Z, '안전한 정수만');
  assert.equal(ballLeft({ earned: 3, used: 2, refunded: 1 }), 2, 'earned − used + refunded');
  assert.equal(ballLeft({ earned: 1, used: 4, refunded: 0 }), 0, '음수는 0');
  assert.equal(musicThrowsLeft({ ball: { earned: 2, used: 1 } }), 1);
  assert.equal(musicThrowsLeft(null), 0);
  // 셈이 없으면 profile.piano에 칸이 안 생긴다 — 옛 기록 꼴 그대로(piano402 pianoOf('junk') 통째 비교)
  assert.equal('ball' in pianoOf({ ball: { earned: 0, used: 0 } }), false);
  assert.equal('ball' in pianoOf({}), false);
  assert.deepEqual(pianoOf({ ball: { earned: 1 } }).ball, { earned: 1, used: 0, refunded: 0 });
});

test('🎯 빼기·돌려주기 — 남은 기회가 없으면 why none · 돌려주기는 refunded +1(used를 줄이지 않는다) · 뺀 수보다 많이 돌려주지 않는다', () => {
  const p = { piano: { notes: 0, days: {} } };
  assert.deepEqual(musicTakeRule(p), { ok: false, why: 'none' });
  assert.equal('ball' in pianoOf(p.piano), false, '없으면 아무것도 안 쓴다');
  assert.deepEqual(musicGiveBackRule(p), { ok: false, why: 'none' }, '뺀 게 없으면 돌려줄 것도 없다');
  p.piano = { notes: 5, mons: 1, days: {}, ball: { earned: 1 } };
  assert.deepEqual(musicTakeRule(p), { ok: true, left: 0 });
  assert.deepEqual(p.piano.ball, { earned: 1, used: 1, refunded: 0 });
  assert.deepEqual(musicTakeRule(p), { ok: false, why: 'none' }, '두 창이 같은 기회를 두 번 못 뺀다');
  assert.deepEqual(musicGiveBackRule(p), { ok: true, left: 1 });
  assert.deepEqual(p.piano.ball, { earned: 1, used: 1, refunded: 1 }, '늘기만 — used는 그대로');
  assert.deepEqual(musicGiveBackRule(p), { ok: false, why: 'none' }, '뺀 수보다 많이 돌려주지 않는다');
  assert.deepEqual(musicTakeRule(p), { ok: true, left: 0 });
  assert.deepEqual(p.piano.ball, { earned: 1, used: 2, refunded: 1 });
  assert.equal(p.piano.mons, 1, '다른 칸은 그대로');
});

test('🎯 저장·병합 — 카운터마다 큰 쪽 · 옛 백업이 쓴 기회를 되살리지 못한다 · 차례와 상관없이 · 복사는 새 객체', () => {
  const backup = { notes: 5, mons: 1, ball: { earned: 1 } }; // 기회를 받은 뒤 백업
  const now = { notes: 5, mons: 1, ball: { earned: 1, used: 1 } }; // 그 기회를 던졌다
  const m = mergePiano(backup, now);
  assert.deepEqual(m.ball, { earned: 1, used: 1, refunded: 0 });
  assert.equal(ballLeft(m.ball), 0, '옛 백업으로 던진 기회가 돌아오지 않는다');
  assert.deepEqual(mergePiano(now, backup), m, '차례와 상관없이');
  assert.deepEqual(mergePiano({ ball: { earned: 3, used: 2, refunded: 2 } }, { ball: { earned: 3, used: 1, refunded: 0 } }).ball, { earned: 3, used: 2, refunded: 2 });
  assert.deepEqual(mergePiano({ ball: { earned: 1, used: 1, refunded: 1 } }, { ball: { earned: 2, used: 0 } }).ball, { earned: 2, used: 1, refunded: 1 });
  assert.equal('ball' in mergePiano({ notes: 1 }, { notes: 2 }), false, '둘 다 없으면 칸 없음');
  const c = copyPiano({ ball: { earned: 2, used: 1 } });
  const raw = { ball: { earned: 2, used: 1 } };
  const c2 = copyPiano(raw);
  c2.ball.used = 9;
  assert.equal(raw.ball.used, 1, '복사는 새 객체');
  assert.deepEqual(c.ball, { earned: 2, used: 1, refunded: 0 });
  // 기록 줄 'b' — s는 'n'(♪)·'t'(책 곡) · c는 생긴 수(1 이상)
  const log = pianoOf({ log: [{ at: 1, m: 'b', s: 'n', c: 1 }, { at: 2, m: 'b', s: 't', c: 3 }, { at: 3, m: 'b', s: 'x', c: 1 }, { at: 4, m: 'b', s: 'n', c: 0 }, { at: 5, m: 'b', s: 'n' }] }).log;
  assert.deepEqual(log.map((r) => [r.m, r.s, r.c]), [['b', 'n', 1], ['b', 't', 3]]);
});

// ───────────────────── ② 몫 → 기회 (순수) ─────────────────────

test('🎹 책 곡 열째 판 — 기회 하나(포켓몬은 안 옴) · 받은 수와 장부가 같은 트랜잭션에서 함께 · 하루 한 기회 · 내일 다시 열 번이면 또', () => {
  const p = { coins: 0, coinsEarned: 0, caught: { 25: 1 } };
  const r = Array.from({ length: 11 }, () => tapRule(p, bookPlay(), NOW));
  assert.deepEqual(r.map((x) => x.chances), [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0]);
  assert.deepEqual(r.map((x) => x.left), [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1]);
  assert.deepEqual(r.map((x) => x.slot).slice(9), ['ok', 'cap'], '열하나째는 cap — 하루 한 기회');
  assert.deepEqual(p.caught, { 25: 1 }, '음악 포켓몬은 그냥 오지 않는다');
  const tr = pianoOf(p.piano);
  assert.deepEqual([tr.taps, tr.tapMons, tr.ball], [TAPS_PER_MON, 1, { earned: 1, used: 0, refunded: 0 }], '묶음 소비(tapMons)와 기회(earned)가 함께');
  assert.deepEqual(tr.log.filter((x) => x.m === 'b').map((x) => [x.s, x.c, x.at]), [['t', 1, NOW]]);
  assert.equal(tr.log.filter((x) => x.m === 'p').length, 0);
  // 못 잡아도(던져서 끝) 오늘은 cap — 다음은 내일 다시 열 번
  musicTakeRule(p);
  assert.equal(tapRule(p, bookPlay(), NOW + 1000).slot, 'cap');
  const t = Array.from({ length: TAPS_PER_MON }, (_, i) => tapRule(p, bookPlay(), NOW + DAY + i));
  assert.deepEqual(t.map((x) => x.chances).reduce((a, b) => a + b, 0), 1, '내일 열 번 → 기회 하나 더');
  assert.deepEqual(pianoOf(p.piano).ball, { earned: 2, used: 1, refunded: 0 });
  assert.deepEqual(todayOf(p, NOW + DAY).won, 1);
});

test('🎧 ♪ 다섯째 칸 — 기회 하나 · 하루 세 칸이라 하루 많아야 한 기회 · 옛 백업과 병합해도 같은 묶음 기회를 두 번 받지 못한다', () => {
  const p = { caught: {}, piano: { notes: 4, days: {} } };
  const r = listenRule(p, { ...REQ, song: 'ode', line: 0 }, NOW);
  assert.deepEqual([r.chances, r.left, r.mons], [1, 1, 1]);
  assert.deepEqual(p.caught, {});
  const before = copyPiano({ notes: 4, days: {} }); // 다섯째 칸 전의 백업
  const merged = { caught: {}, piano: mergePiano(before, p.piano) };
  assert.deepEqual(monsDueRule(merged, NOW + 1).chances, 0, '받은 수(mons) max가 묶음을 소비했다고 남는다');
  assert.equal(ballLeft(pianoOf(merged.piano).ball), 1);
  assert.equal(NOTES_PER_MON, 5);
});

test('🔄 바꾸는 날 — 남은 몫(옛 판에 넘친 몫 · 업데이트 전 · 저장 실패)은 들어올 때 기회로 · 이미 받은 음악 포켓몬·옛 「온」 줄은 그대로', () => {
  const p = { caught: { 433: 1 }, piano: { notes: 12, mons: 1, taps: 20, tapMons: 1, days: {}, log: [{ at: NOW - DAY, m: 'p', s: '433' }] } };
  const r = monsDueRule(p, NOW);
  assert.deepEqual([r.chances, r.left], [2, 2], '♪ 몫 하나 + 건반 몫 하나');
  assert.deepEqual(p.caught, { 433: 1 }, '이미 받은 음악 포켓몬 그대로');
  const tr = pianoOf(p.piano);
  assert.deepEqual([tr.mons, tr.tapMons], [2, 2]);
  assert.deepEqual(tr.log.map((x) => [x.m, x.s]), [['p', '433'], ['b', 'n'], ['b', 't']], '옛 「온」 줄 그대로 · 기회 줄 둘');
  assert.equal(monsDueRule(p, NOW + 1).chances, 0, '두 번 바뀌지 않는다');
});

// ───────────────────── ④ 후보 (순수) ─────────────────────

test('🎯 후보 넷 — 안 만난 아이 먼저(무게) · 겹치지 않게 · 모자라면 만난 아이로 채움 · 깨진 후보는 뺀다 · 없으면 빈 목록', () => {
  assert.equal(CANDS, 4);
  const pool = [{ id: 433, r: 1 }, { id: 527, r: 1 }, { id: 358, r: 2 }, { id: 920, r: 3 }, { id: 891, r: 4 }, { id: 965, r: 1 }];
  for (let i = 0; i < 50; i += 1) {
    const rng = ((s) => () => { s = (s * 9301 + 49297) % 233280; return s / 233280; })(i + 1);
    const got = pickMusicCands(pool, { 433: 2, 527: 1 }, CANDS, rng);
    assert.equal(got.length, 4);
    assert.equal(new Set(got).size, 4, '겹치지 않는다');
    assert.deepEqual([...got].sort((a, b) => a - b), [358, 891, 920, 965], `안 만난 넷이 먼저 (씨앗 ${i})`);
  }
  // 안 만난 아이가 둘뿐 — 그 둘이 먼저 · 나머지는 만난 아이에서
  const two = pickMusicCands(pool, { 433: 1, 527: 1, 358: 1, 920: 1 }, CANDS, () => 0);
  assert.deepEqual(two.slice(0, 2).sort((a, b) => a - b), [891, 965]);
  assert.equal(two.length, 4);
  assert.ok(two.slice(2).every((id) => [433, 527, 358, 920].includes(id)));
  // 무게 — 안 만난 넷(보통 358 · 희귀 920 · 전설 891 · 흔함 965 = 무게 3·2·1·4, 합 10)에서 첫 후보 자리
  const first = (x) => pickMusicCands(pool, { 433: 1, 527: 1 }, 1, () => x)[0];
  assert.deepEqual([0, 0.29, 0.3, 0.49, 0.5, 0.59, 0.6, 0.99].map(first), [358, 358, 920, 920, 891, 891, 965, 965], '무게 3·2·1·4대로');
  assert.deepEqual(pickMusicCands([{ id: 433, r: 1 }], {}, CANDS, () => 0.5), [433], '모자라면 있는 만큼');
  assert.deepEqual(pickMusicCands([null, { id: 'x', r: 1 }, { id: 5, r: 9 }, { id: 433, r: 1 }, { id: 433, r: 1 }], {}, CANDS, () => 0.5), [433], '깨진 후보 · 같은 번호는 하나로');
  assert.deepEqual(pickMusicCands([], {}), []);
  assert.deepEqual(pickMusicCands(null, null), []);
  assert.deepEqual(MON_WEIGHT, { 1: 4, 2: 3, 3: 2, 4: 1 }, 'v404 기본안 무게 그대로');
});

// ───────────────────── 📤 (순수) ─────────────────────

test('📤 하루 줄 — 🎯 기회 생김 · 던져서 잡음·놓침(잡기만 한 날도) · music.md 장부 줄 · 기회 줄 · 읽는 법', () => {
  for (const k of ['pnBall', 'pnCaught', 'pnFled']) assert.ok(PIANO_DAILY.includes(k), k);
  assert.equal(pianoDayLine({ pnBall: 1, pnCaught: 1 }), '🎯 음악 포켓몬 잡기 기회 1번 생김 · 던져서 잡음 1 · 놓침 0');
  // 셋 중 하나만 있는 날도 한 줄 — 빈 날 거르기(piano.js pianoDayLine)에서 조건 하나가 빠지면 여기서 잡힌다
  assert.equal(pianoDayLine({ pnBall: 2 }), '🎯 음악 포켓몬 잡기 기회 2번 생김 · 던져서 잡음 0 · 놓침 0', '들어오기만 해서 밀린 몫이 기회로만 바뀐 날도(안 던짐)');
  assert.equal(pianoDayLine({ pnCaught: 1 }), '🎯 음악 포켓몬 잡기 기회 0번 생김 · 던져서 잡음 1 · 놓침 0', '밀린 기회로 잡기만 한 날도');
  assert.equal(pianoDayLine({ pnFled: 2 }), '🎯 음악 포켓몬 잡기 기회 0번 생김 · 던져서 잡음 0 · 놓침 2', '밀린 기회로 놓치기만 한 날도');
  assert.match(pianoDayLine({ pnMons: 1 }), /🐾 음악 포켓몬 1마리 옴/, '옛 날 줄은 그대로');
  const p = { caught: {}, piano: { notes: 4, days: {} } };
  listenRule(p, { ...REQ, song: 'ode', line: 0 }, NOW);
  musicTakeRule(p);
  musicGiveBackRule(p);
  musicTakeRule(p);
  const md = pianoMd(p.piano, dayKeyOf(NOW));
  assert.match(md, /\n🎯 음악 잡기 기회\(v429\) 받음 1 · 씀 1\(뺌 2 · 돌려줌 1\) · 남음 0\n/, '판정 없이 띄운 창도 「던짐」이 아니라 「씀」(v429 검토)');
  assert.match(md, /씀\(잡기 화면을 띄우며 뺀 수 − 돌려준 수 = 던진 수 \+ 지금 열린 잡기 창 \+ 앱이 꺼졌거나 저장이 안 돼 아직 못 돌려준 것 — 음악에 다시 들어오면 돌려줌\)/, '읽는 법');
  assert.doesNotMatch(md, /던짐/);
  assert.match(md, /- 11-15 18:00 🎯 잡기 기회 생김 — 🎧 ♪ 다섯 칸\n/);
  assert.match(md, /- 🎯 잡기 기회\(v429\) = 몫마다 하나 — 몫이 찬 그 자리에서 바로 잡기 화면\(다른 과목과 같이 가방의 볼을 골라 한 번 던지기 · 못 잡으면 그 기회는 끝/);
  assert.doesNotMatch(md, /하루 한 번은 그대로라 다음은 내일/, '놓친 뒤 다음 기회 — 책 곡만 내일(v429 검토)');
  assert.match(md, /놓쳐도 같은 몫을 다시 주지 않는다: 📖 책 곡은 하루 한 번이라 다음은 내일 다시 열 번 · 🎧 ♪는 다섯 칸을 새로 채워야 해서\(하루 세 칸\) 빨라야 내일 · 같은 날 다른 몫이 차거나 남은 기회가 있으면 그날 또 잡기/, '읽는 법 — 다음 기회');
  assert.match(md, /후보 넷은 이 기기에 그림이 있는 음악 포켓몬 가운데 아직 안 만난 아이 먼저\(흔함 4·보통 3·희귀 2·전설 1 무게\) — 안 만난 아이 그림이 넷이 안 되면 잡기를 열 때 몇 마리 받아 오고, 8초 안에 못 받은 만큼은 만난 아이로 채운다/, '읽는 법 — 후보는 그림 있는 것에서');
  assert.match(md, /다섯 칸마다 몫 하나 — v404~v428은 🐾 음악 포켓몬이 그냥 왔고 v429부터 🎯 잡기 기회/);
  assert.match(pianoMd({ log: [{ at: NOW, m: 'b', s: 't', c: 2 }], taps: 20, tapMons: 2 }, dayKeyOf(NOW)), /🎯 잡기 기회 생김 — 📖 책 곡 열 번 ×2\n/);
  assert.doesNotMatch(pianoMd({ notes: 3 }, dayKeyOf(NOW)), /🎯 음악 잡기 기회\(v429\)/, '기회가 생긴 적이 없으면 장부 줄 없음');
  assert.match(src('js/upload.js'), /🎯 음악 포켓몬 잡기 기회\(v429\) = 그날 생긴 기회\(♪ 다섯 칸 · 📖 책 곡 열 번 · 밀린 몫\) · 던져서 잡음\/놓침 = 그날 잡기 화면에서 던진 결과/);
});

test('📤 던진 결과 줄(v429 검토) — 판정 때 「🎯 잡음·놓침 — 포켓몬」 기록만(기회·칸 그대로) · 번호가 아니면 버림 · 병합에도 남음 · 책 곡 칸 받은 날 ✅', () => {
  const p = { caught: {}, piano: { notes: 5, mons: 1, days: {}, ball: { earned: 1, used: 1 } } };
  assert.deepEqual(musicJudgedRule(p, 1024, false, NOW), { ok: true });
  assert.deepEqual(musicJudgedRule(p, 433, true, NOW + 1000), { ok: true });
  assert.deepEqual(musicJudgedRule(p, 'x', true, NOW + 2000), { ok: false, why: 'id' });
  const tr = pianoOf(p.piano);
  assert.deepEqual(ballOf(tr.ball), { earned: 1, used: 1, refunded: 0 }, '기회는 그대로');
  assert.deepEqual([tr.notes, tr.mons], [5, 1]);
  assert.deepEqual(tr.log.map((r) => [r.m, r.s, r.x]), [['j', '1024', 0], ['j', '433', 1]]);
  assert.equal(pianoOf({ log: [{ at: NOW, m: 'j', s: 'abc', x: 1 }] }).log.length, 0, '번호가 아닌 줄은 버린다');
  assert.equal(mergePiano(p.piano, { log: [] }).log.filter((r) => r.m === 'j').length, 2, '병합에도 남는다');
  const names = { 1024: '테라파고스', 433: '랑딸랑' };
  const md = pianoMd(p.piano, dayKeyOf(NOW), (s) => s, null, (id) => names[id] || `#${id}`);
  assert.match(md, /- 11-15 18:00 🎯 잡음 — 랑딸랑\n- 11-15 18:00 🎯 놓침 — 테라파고스\n/, '새것부터');
  assert.match(md, /던진 결과는 기록 줄 「🎯 잡음·놓침 — 포켓몬」과 하루 줄/);
  // 📖 책 곡 칸 — 받은 날 ✅ (v428까지 🐾 포켓몬 · v429부터 잡기 기회 — 날 칸엔 둘을 가르는 칸이 없어 같은 표시)
  const q = { caught: {}, piano: { days: { [dayKeyOf(NOW)]: { paid: 0, coins: 0, notes: 0, book: { n: 9 } } } } };
  assert.equal(tapRule(q, bookPlay(), NOW).chances, 1);
  const qmd = pianoMd(q.piano, dayKeyOf(NOW));
  assert.match(qmd, /\n🎹 책 곡 칸\(v423[^\n]*\) 11-15 10\/10 ✅/);
  assert.match(qmd, /「🎹 책 곡 칸」 줄 끝 ✅ = 그날 몫을 받은 날\(v428까지 🐾 음악 포켓몬이 옴 · v429부터 🎯 잡기 기회\)/);
});

// ───────────────────── xp (한 트랜잭션) ─────────────────────

before(async () => {
  console.warn = () => {};
  setSfxEnabled(false); // 가짜 소리 장치로 효과음·배경 음악을 굴리지 않는다(잡기 화면이 부른다)
  setBgmEnabled(false);
  await initProfile();
  await loadToday();
});

const setPiano = (pn) => houseDo((p) => { p.piano = pn; return { ok: true }; });
const ball = () => pianoOf(getProfileSnapshot().piano).ball || Z;
const saved = () => pianoOf((fakeIdb.get('profile', 'me') || {}).piano).ball || Z;
/** 저장소의 🎯 던진 결과 줄('j') — [포켓몬 번호, 잡음 1 · 놓침 0] (오래된 것부터) */
const savedJ = () => pianoOf((fakeIdb.get('profile', 'me') || {}).piano).log.filter((x) => x.m === 'j').map((x) => [x.s, x.x]);

test('xp — 빼기·돌려주기는 저장된 프로필로 한 트랜잭션 · 메모리도 · 없으면 none · 저장이 안 되면 {ok:false}(장부 그대로) · 책 곡 열째 판은 같은 트랜잭션에서 기회', async () => {
  await setPiano({ notes: 0, days: {} });
  assert.deepEqual(await pianoTakeThrow(), { ok: false, why: 'none' });
  await setPiano({ notes: 5, mons: 1, days: {}, ball: { earned: 1 } });
  assert.equal(pianoThrowsLeft(), 1);
  assert.deepEqual(await pianoTakeThrow(), { ok: true, left: 0 });
  assert.deepEqual([ball(), saved()], [{ earned: 1, used: 1, refunded: 0 }, { earned: 1, used: 1, refunded: 0 }], '메모리와 저장소 모두');
  assert.equal(pianoThrowsLeft(), 0);
  fakeIdb.failNext('profile');
  const bad = await pianoGiveBackThrow();
  assert.equal(bad.ok, false, '저장 실패는 오류가 아니라 {ok:false}');
  assert.equal(fakeIdb.failsLeft(), 0);
  assert.deepEqual(saved(), { earned: 1, used: 1, refunded: 0 }, '저장이 안 되면 없던 일');
  assert.deepEqual(await pianoGiveBackThrow(), { ok: true, left: 1 });
  assert.deepEqual(await pianoGiveBackThrow(), { ok: false, why: 'none' });
  // 📖 책 곡 아홉 칸 → 열째 판 — 💰·칸·기회가 한 트랜잭션
  await setPiano({ days: { [dayKeyOf()]: { paid: 0, coins: 0, notes: 0, book: { n: 9 } } } });
  const r = await pianoTap(bookPlay());
  assert.deepEqual([r.ok, r.slot, r.chances, r.left], [true, 'ok', 1, 1]);
  assert.deepEqual(saved(), { earned: 1, used: 0, refunded: 0 });
  assert.equal(pianoOf(fakeIdb.get('profile', 'me').piano).tapMons, 1);
});

test('xp — 던진 결과 줄(pianoJudged)은 저장된 프로필에 · 잡음 1·놓침 0 · 그 포켓몬 번호 · 기회는 그대로 · 번호가 아니면 안 씀 · 저장이 안 되면 {ok:false}(줄 없음)', async () => {
  await setPiano({ notes: 5, mons: 1, days: {}, ball: { earned: 1, used: 1 } });
  assert.deepEqual(await pianoJudged(1024, true), { ok: true });
  assert.deepEqual(await pianoJudged(433, false), { ok: true });
  assert.deepEqual(savedJ(), [['1024', 1], ['433', 0]], '저장소에 — 번호·잡음/놓침이 거꾸로 적히지 않는다(music.md 「🎯 잡음·놓침 — 이름」)');
  assert.deepEqual(pianoOf(getProfileSnapshot().piano).log.filter((x) => x.m === 'j').map((x) => [x.s, x.x]), savedJ(), '메모리도');
  assert.deepEqual(saved(), { earned: 1, used: 1, refunded: 0 }, '기회는 그대로');
  assert.equal((await pianoJudged('x', true)).ok, false, '번호가 아니면 안 쓴다');
  fakeIdb.failNext('profile');
  assert.equal((await pianoJudged(358, true)).ok, false, '저장 실패는 오류가 아니라 {ok:false}');
  assert.equal(fakeIdb.failsLeft(), 0);
  assert.deepEqual(savedJ(), [['1024', 1], ['433', 0]], '저장이 안 되면 줄 없음');
});

test('🗄️ 저장소 판 번호 5(v429 · 아버님 11-16) — 옛 v428 창은 새 판이 열리면 스스로 닫혀 새 장부(ball)를 지우지 못한다 · 업그레이드는 없는 스토어만 만든다', () => {
  const d = src('js/db.js');
  assert.match(d, /const DB_VERSION = 5;/);
  assert.match(d, /db\.onversionchange = \(\) => \{ db\.close\(\); dbPromise = null; window\.dispatchEvent\(new CustomEvent\('shincoach:dbversionchange'\)\); \};/);
  assert.match(src('js/app.js'), /shincoach:dbversionchange', \(\) => showError\('새 버전이 열렸어요/);
  const up = /req\.onupgradeneeded = \(\) => \{([\s\S]*?)\n {4}\};/.exec(d)[1];
  const made = up.match(/createObjectStore\('(\w+)'/g).length;
  assert.equal((up.match(/if \(!db\.objectStoreNames\.contains\('\w+'\)\)/g) || []).length, made, '스토어마다 있을 때는 건너뜀(판만 올려도 기록 그대로)');
});

// ───────────────────── ③ 화면 잇기 (소스) ─────────────────────

test('🔌 잡기 흐름 차례(소스) — 띄우기 전 빼기(못 빼면 안 띄움) · 장부 줄 · 판정에서 judged · 안 던지면 돌려주기 · 들어올 때 정리 차례 · subject music · 숫자 없는 단추', () => {
  const v = src('js/pianoview.js');
  const i0 = v.indexOf('async function runMusicCatch() {');
  const i1 = v.indexOf('\n}\n', i0);
  assert.ok(i0 > 0 && i1 > i0, '함수 자르기');
  const run = v.slice(i0, i1);
  const at = (s) => { const i = run.indexOf(s); assert.ok(i >= 0, `없음: ${s}`); return i; };
  assert.ok(at('await settleLostMusicCatch();') < at('if (S.catching || isCatchOpen()) return;'), '남은 단추를 눌러도 지난 창부터 정리 · 한 번에 하나만');
  assert.ok(at('pauseForCatch();') < at('try { pool = await musicPool(); }'), '창이 악보를 가리기 전에 멈춤(Codex 217차 P2와 같은 멈춤)');
  assert.ok(at('taken = await pianoTakeThrow();') < at('openCatch({'), '띄우기 전에 뺀다');
  assert.ok(at("if (!taken || !taken.ok) { S.catchMsg = taken && taken.why === 'none' ? '' : CATCH_WHY.save; done(); return; }") < at('openCatch({'), '못 빼면 안 띄운다');
  assert.ok(at('const st = { threw: false, hold: holds.track() };') > at('taken = await pianoTakeThrow();'), '뺀 뒤 장부 줄');
  assert.ok(at('if (!S.active || isCatchOpen()) { await st.hold.refund(musicGiveBack); done(); return; }') < at('openCatch({'), '뺀 사이 나갔거나 다른 잡기 창 — 돌려준다');
  assert.ok(at('S.catchState = st;') < at('openCatch({'));
  assert.match(run, /attempt: \(id, opts\) => \{\n\s+st\.threw = true;\n\s+st\.hold\.judged\(\);\n\s+const r = catchAttempt\(id, Math\.random, opts\);/, '판정이 나는 순간(동기) 장부 줄을 지운다');
  assert.match(run, /applyDailyDelta\(clockDay\(\), r && r\.caught \? \{ pnCaught: 1 \} : \{ pnFled: 1 \}\)\.catch\(\(\) => \{\}\);\n\s+pianoJudged\(id, !!\(r && r\.caught\)\)\.catch\(\(\) => \{\}\);/, '📤 잡음·놓침 · 기록 줄은 판정 뒤에');
  assert.match(run, /if \(r && r\.threw === false && !st\.threw\) st\.hold\.refund\(musicGiveBack\)\.then\(\(ok\) => \{ if \(!ok\) S\.catchMsg = CATCH_WHY\.owed; \}\)\.finally\(done\);/, '안 던지고 닫으면 돌려준다(실패면 장부 줄이 남아 다음에)');
  assert.match(run, /\} catch \{\n\s+if \(S\.catchState === st\) S\.catchState = null;\n\s+const back = await st\.hold\.refund\(musicGiveBack\);\n\s+S\.catchMsg = back \? CATCH_WHY\.error : CATCH_WHY\.errorOwed;/, '못 열면 돌려주고 사실대로 말한다');
  assert.match(run, /subject: 'music', xpGain: 0, coinGain: 0/);
  assert.match(run, /pickMusicCands\(pool\.map\(\(c\) => \(\{ id: c\.id, r: rarityOf\(c\.id\) \}\)\), caught, CANDS\)/, '안 만난 아이 먼저(무게)');
  assert.match(v, /const holds = holdStore\('shincoach\.music\.throwHolds'\);/);
  assert.match(v, /async function musicGiveBack\(\) \{\n\s+try \{ return refundOutcome\(await pianoGiveBackThrow\(\)\); \} catch \{ return 'fail'; \}/, '저장 결과를 refundOutcome으로(.catch만 보면 놓친다 — Codex 49차 #2)');
  assert.match(v, /return forSubject\(chars, 'music'\)\.filter\(\(c\) => isUnlocked\(c\.id, level\) && !isTired\(c\.id\)\)/, '후보는 음악 전용 · 그림 있는 것');
  assert.match(v, /if \(!artJob\) \{\n[^\n]*\n\s+const order = pickMusicCands\(missing\.map\(\(id\) => \(\{ id, r: rarityOf\(id\) \}\)\), Object\.fromEntries\(missing\.map\(\(id\) => \[id, caughtCount\(id\)\]\)\), missing\.length\);\n\s+artJob = downloadCharacters\(null, 6, 'music', order\)/, '4마리가 안 되면 음악 그림을 받아 온다 — 받기는 하나로 묶고 안 만난 아이·등급 무게 차례로(v429 검토)');
  assert.match(v, /pool = await read\(late\);/, '8초를 넘겼으면 그 사이 저장된 그림까지 다시 읽는다(Codex 233차 P2)');
  assert.match(src('js/pokemon.js'), /const ranked = Array\.isArray\(order\) \? order\.map\(\(id\) => list\.find\(\(r\) => r\.id === id\)\)\.filter\(Boolean\) : list;/);
  // 들어올 때 — 소식 없이 닫힌 창 → 남은 장부 줄 → 밀린 몫 (국어 enterKorean과 같은 차례)
  assert.match(v, /Promise\.resolve\(settleLostMusicCatch\(\)\)\.catch\(\(\) => \{\}\)\.then\(\(\) => settleMusicThrows\(\)\)\.then\(\(\) => dueMons\(\)\);/);
  // 단추 — 숫자 없음 · 남은 기회가 있을 때만
  assert.match(v, /const left = pianoThrowsLeft\(\);\n[^\n]*\n\s+if \(left <= 0 && !OWED\.includes\(S\.catchMsg\)\) S\.catchMsg = '';\n\s+if \(left > 0\) \{\n\s+const b = btn\('🎯 음악 포켓몬 잡기', 'btn btn-primary pn-catch-btn'/);
  assert.match(v, /const cleared = OWED\.includes\(S\.catchMsg\) && !Object\.values\(holds\.list\(\)\)\.some\(\(h\) => h\.page === PAGE_ID\);/, '「돌려줘요」 한 줄은 이 창의 장부 줄이 정리되면 지운다(Codex 233차 P3)');
  // ▶는 잡기 흐름 동안 막는다 · 잡기 창 밑에서 PC 자판 건반을 새로 치지 않는다 (v429 검토)
  assert.match(v, /function toggle\(\) \{\n  audio\(\);\n  if \(S\.running\) \{ setRun\(false\); return; \}\n  settleLostMusicCatch\(\);[^\n]*\n  if \(S\.catching\) \{/);
  assert.match(v, /if \(down && isCatchOpen\(\)\) return;[^\n]*\n  if \(down\) \{ if \(e\.repeat\) return;/);
  assert.match(v, /wrap\.appendChild\(catchBox\(\)\); \/\/ 🎯/, '곡 목록');
  assert.match(v, /acts\.appendChild\(catchBox\(\)\); \/\/ 🎯/, '무대');
  for (const w of Object.values(src('js/pianoview.js').match(/export const CATCH_WHY = \{[\s\S]*?\n\};/)[0].match(/'[^']*'/g))) assert.doesNotMatch(w, /\d/, `한 줄에 숫자 없음: ${w}`);
  // 몫이 찬 그 자리 — 🎹 sendTap · 🎧 saveListen · 밀린 몫은 단추만
  assert.match(v, /if \(n\) gotChances\(\); \/\/ 🎯 책 곡 열째 판/);
  assert.match(v, /if \(n\) gotChances\(\); \/\/ 🎯 ♪ 다섯째 칸/);
  const due = v.slice(v.indexOf('function dueMons() {'), v.indexOf('\n}\n', v.indexOf('function dueMons() {')));
  assert.ok(due.includes('renderCatchBtns();') && !due.includes('gotChances') && !due.includes('runMusicCatch'), '밀린 기회는 바로 띄우지 않는다');
  assert.match(v, /if \(\$\('pn-intro'\)\) \{ S\.catchWant = true; return; \}/, '안내 창이 떠 있으면 닫은 뒤에');
  assert.match(v, /if \(S\.catchWant\) \{ S\.catchWant = false; gotChances\(\); \}/);
  assert.doesNotMatch(v, /showArrivals|nextArrival|'pn-arrive'\)/, '「왔어요」 창 흐름은 없다');
  assert.match(src('js/blackbox.js'), /\['pn-arrive', '🐾 음악 포켓몬 옴'\]/, '옛 꺼진 기록을 읽는 이름표는 그대로');
});

test('🔌 문구·잇기 — 잡기 화면 음악 갈래(국어·논술 줄 꼴 그대로) · JSDoc · 홈 · 상점 · 포켓몬 머리말 · CSS · 판 v429', () => {
  const c = src('js/catch.js');
  assert.match(c, /: o\.subject === 'music'\n\s+\? '🎹 음악에서만 만나는 포켓몬이에요! 한 마리 골라 몬스터볼을 던져봐요'/);
  assert.match(c, /o\.subject === 'korean'\n\s+\? '📚 국어에서만 만나는 포켓몬이에요!/, '국어 줄 꼴 그대로(korpokemon)');
  assert.ok(c.includes("'🖊️ 논술에서만 만나는 포켓몬이에요! 한 마리 골라 몬스터볼을 던져봐요'"), '논술 줄 그대로(nonsul303)');
  assert.match(c, /@param \{'math'\|'korean'\|'nonsul'\|'music'\} \[o\.subject\]/);
  assert.match(src('js/home.js'), /desc: '🎯 끝까지 치면 음악 포켓몬 잡기!'/);
  assert.match(src('js/shop.js'), /music: ' · 🎹 음악에서 만나요'/);
  assert.match(src('js/pokemon.js'), /'music'이면 🎹 음악\(🎧 ♪ 다섯 칸 · 📖 책 곡 하루 열 번마다 잡기 기회/);
  assert.doesNotMatch(src('js/pokemon.js'), /잡기 없음/);
  const css = src('css/style.css');
  for (const s of ['.pn-catch {', '.pn-catch-btn {', '.pn-catch-msg {', '.pn-intro-catch {']) assert.ok(css.includes(s), s);
  assert.equal((/CACHE_VERSION = '(v\d+)'/.exec(src('sw.js')) || [])[1], (/APP_VERSION = '(v\d+)'/.exec(src('js/version.js')) || [])[1]);
  assert.ok(Number((/APP_VERSION = 'v(\d+)'/.exec(src('js/version.js')) || [])[1]) >= 429, '앱 판 v429 이상');
});

// ───────────────────── ③ 화면 — 가짜 화면(잡기 창 #catch까지)으로 pianoview.js · catch.js를 직접 ─────────────────────

const all = [];
class El {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.children = []; this.parent = null; this.on = {}; this.attrs = {}; this.dataset = {}; this.style = { setProperty() {} };
    this.hidden = false; this.disabled = false; this._text = ''; this._html = ''; this.className = ''; this.id = ''; this.value = ''; this.src = ''; this.alt = ''; this.type = '';
    this.offsetWidth = 0;
    all.push(this);
  }
  get classList() {
    const list = () => this.className.split(/\s+/).filter(Boolean);
    return {
      add: (...cs) => { this.className = [...new Set([...list(), ...cs])].join(' '); },
      remove: (...cs) => { this.className = list().filter((x) => !cs.includes(x)).join(' '); },
      toggle: (cl, on) => { const has = list().includes(cl); const want = on === undefined ? !has : !!on; if (want !== has) this.className = want ? [...list(), cl].join(' ') : list().filter((x) => x !== cl).join(' '); return want; },
      contains: (cl) => list().includes(cl),
    };
  }
  get textContent() { return this._text + this.children.map((c) => c.textContent).join(''); }
  set textContent(v) { for (const c of this.children) c.parent = null; this.children = []; this._text = String(v); }
  get innerHTML() { return this._html; }
  set innerHTML(v) { this.textContent = ''; this._html = String(v); }
  appendChild(c) { c.parent = this; this.children.push(c); return c; }
  remove() { if (this.parent) { this.parent.children = this.parent.children.filter((c) => c !== this); this.parent = null; } }
  addEventListener(t, f) { (this.on[t] ||= []).push(f); }
  click() { for (const f of this.on.click || []) f({ offsetX: 10, offsetY: 10 }); }
  focus() {}
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  matches(sel) {
    if (sel.startsWith('.')) return this.className.split(/\s+/).includes(sel.slice(1));
    const m = /^([a-z]+)(?:\[data-([a-z]+)\])?$/i.exec(sel);
    return !!m && this.tagName === m[1].toUpperCase() && (!m[2] || this.dataset[m[2]] !== undefined);
  }
  querySelectorAll(sel) { const out = []; const walk = (e) => { for (const c of e.children) { if (c.matches(sel)) out.push(c); walk(c); } }; walk(this); return out; }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  getContext() { return new Proxy({}, { get: (o, k) => (k in o ? o[k] : k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => {}), set: (o, k, v) => { o[k] = v; return true; } }); }
  getBoundingClientRect() { return { top: 80, left: 0, width: 1000, height: 600 }; }
  get clientWidth() { return 1000; }
  setPointerCapture() {}
}
const ROOT = new El('html');
const BODY = new El('body');
ROOT.appendChild(BODY);
const VIEW = new El('section');
VIEW.id = 'view-music';
BODY.appendChild(VIEW);
for (const id of ['music-main', 'btn-music-back']) { const e = new El('div'); e.id = id; VIEW.appendChild(e); }
// 🎯 잡기 창 (index.html #catch와 같은 id들)
const CATCH = new El('div');
CATCH.id = 'catch';
CATCH.hidden = true;
BODY.appendChild(CATCH);
for (const id of ['catch-xp', 'catch-xpbar-fill', 'catch-next', 'catch-levelup', 'catch-truegold', 'catch-msg', 'catch-radar', 'catch-pick', 'catch-golden', 'catch-confirm', 'catch-stage', 'catch-ball', 'catch-fx', 'catch-result']) {
  const e = new El('div'); e.id = id; CATCH.appendChild(e);
}
const MON = new El('span');
MON.id = 'catch-mon';
MON.appendChild(new El('img'));
CATCH.appendChild(MON);
const CONT = new El('button');
CONT.id = 'catch-continue';
CONT.hidden = true;
CATCH.appendChild(CONT);
const attached = (e) => { for (let x = e; x; x = x.parent) if (x === ROOT) return true; return false; };
const byId = (id) => { for (let i = all.length - 1; i >= 0; i -= 1) if (all[i].id === id && attached(all[i])) return all[i]; return null; };
function button(text) {
  for (let i = all.length - 1; i >= 0; i -= 1) if (all[i].tagName === 'BUTTON' && all[i].textContent.trim() === text && attached(all[i])) return all[i];
  throw new Error(`단추 없음: ${text}`);
}
const hasButton = (text) => { try { button(text); return true; } catch { return false; } };
globalThis.document = {
  hidden: false, documentElement: ROOT, body: BODY, getElementById: byId, createElement: (t) => new El(t),
  createTextNode: (s) => { const e = new El('#text'); e._text = String(s); return e; }, addEventListener() {}, querySelectorAll: () => [],
};
class Param { constructor(v = 1) { this.value = v; } setValueAtTime() {} exponentialRampToValueAtTime() {} linearRampToValueAtTime() {} setTargetAtTime() {} cancelScheduledValues() {} }
class FakeAC {
  constructor() { this.currentTime = 0; this.state = 'running'; this.destination = {}; }
  createGain() { return { gain: new Param(1), connect: (x) => x, disconnect() {} }; }
  createDynamicsCompressor() { return { connect: (x) => x }; }
  createOscillator() { return { type: '', frequency: new Param(440), connect: (x) => x, start() {}, stop() {}, onended: null }; }
  resume() { return Promise.resolve(); }
}
const WIN = {}; // window 듣기 — PC 자판 건반 시험이 직접 부른다
globalThis.window = { addEventListener(t, f) { (WIN[t] = WIN[t] || []).push(f); }, innerHeight: 800, devicePixelRatio: 1, AudioContext: FakeAC };
const pcPress = (down, key) => (WIN[down ? 'keydown' : 'keyup'] || []).forEach((f) => f({ key, target: BODY, repeat: false }));
// 실패한 시험이 잡기 창을 연 채 끝나면 장부 박동(HOLD_BEAT_MS 간격 setInterval)이 남아 node --test가 끝나지 않는다 — 박동만 unref (v429 검토)
const realSetInterval = globalThis.setInterval;
globalThis.setInterval = (fn, ms, ...a) => { const t = realSetInterval(fn, ms, ...a); if (ms === HOLD_BEAT_MS && t && typeof t.unref === 'function') t.unref(); return t; };
globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = () => {};
const fetched = [];
globalThis.fetch = (u) => { fetched.push(String(u)); return Promise.reject(new Error('시험에선 그림을 안 받는다')); };
/** 받으려 한 포켓몬 그림(공식 그림) 번호 — 잡기 후보 그림을 받아 오려 했나 */
const artFetches = () => fetched.map((u) => /official-artwork\/(\d+)\.png$/.exec(u)).filter(Boolean).map((m) => Number(m[1]));
Object.defineProperty(globalThis, 'navigator', { value: { wakeLock: { request: () => Promise.reject(new Error('없음')) } }, configurable: true });
const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: (k) => { store.delete(k); } };
store.set('shincoach.pianoSongsAt', String(Date.now()));
store.set('shincoach.pianoSongs', JSON.stringify([{ ...PUBLIC_SONGS[0], id: 'bk', ko: '책 곡' }])); // 📖 진우 책 곡 하나
store.set('shincoach.musicIntro', '5'); // 🐾 안내 창은 본 것으로 (v429 판)
const settle = (ms = 20) => new Promise((r) => setTimeout(r, ms));
async function waitFor(cond, what, ms = 4000) {
  const t0 = Date.now();
  while (!(await cond())) {
    if (Date.now() - t0 > ms) throw new Error(`기다림 넘침: ${what}`);
    await settle(10);
  }
}
const HOLD_KEY = 'shincoach.music.throwHolds';
const holdRows = () => Object.keys(JSON.parse(store.get(HOLD_KEY) || '{}'));
const cands = () => byId('catch-pick').children.map((b) => Number(b.dataset.id));
const PICS = [433, 527, 965, 358, 1024]; // 그림이 있는 음악 포켓몬 다섯 — 433은 만난 아이
let P;
let PV;

test('화면 준비 — 그림 다섯(음악) · 잡기 창 잇기', async () => {
  for (const id of PICS) fakeIdb.put('characters', { id, ko: '', en: '', blob: new Blob(['x']), anchor: { x: 0.5, y: 0.2 }, savedAt: 0 });
  await houseDo((p) => { p.caught = { ...p.caught, 433: 1 }; for (const id of [527, 965, 358, 1024]) delete p.caught[id]; return { ok: true }; });
  initCatch();
  PV = await import('../js/pianoview.js');
  PV.initMusic({ showView: () => {}, requirePin: (ok) => ok() });
  P = globalThis.window.__piano;
  assert.ok(P.runMusicCatch && P.holds, '걷기용');
});

test('화면 ① 밀린 몫 → 기회(단추) → 누르면 잡기 화면: 띄우기 전에 뺌 · 장부 줄 · 🎹 음악 문구 · 후보는 안 만난 넷 · 안 던지고 닫으면 돌려줌', async () => {
  await setPiano({ notes: 5, days: {} });
  await PV.enterMusic();
  await waitFor(() => ball().earned === 1, '밀린 몫 → 기회');
  await settle(30);
  assert.equal(isCatchOpen(), false, '밀린 기회는 바로 띄우지 않는다');
  const art0 = artFetches().length;
  button('🎯 음악 포켓몬 잡기').click();
  await waitFor(() => isCatchOpen(), '잡기 화면');
  assert.equal(artFetches().length, art0, '안 만난 아이 그림이 넷이면 더 받지 않는다');
  assert.deepEqual(saved(), { earned: 1, used: 1, refunded: 0 }, '띄우기 전에 저장소에서 뺐다');
  assert.equal(holdRows().length, 1, '뺀 기회 장부 줄');
  assert.equal(CATCH.hidden, false);
  assert.equal(byId('catch-msg').textContent, '🎹 음악에서만 만나는 포켓몬이에요! 한 마리 골라 몬스터볼을 던져봐요');
  assert.deepEqual([...cands()].sort((a, b) => a - b), [358, 527, 965, 1024], '안 만난 넷 — 만난 랑딸랑(433)은 빠진다');
  assert.ok(cands().every((id) => MUSIC.includes(id)));
  assert.equal(P.S.catching, true);
  assert.equal(button('🎯 음악 포켓몬 잡기').disabled, true, '도는 동안 단추 잠김 — 한 번에 하나만');
  await P.runMusicCatch();
  assert.equal(saved().used, 1, '창이 떠 있는 동안 또 눌러도 겹쳐 열지 않는다');
  // 안 던지고 닫았다 → 돌려준다
  CONT.click();
  await waitFor(() => saved().refunded === 1 && !P.S.catching, '돌려주기');
  assert.equal(isCatchOpen(), false);
  assert.deepEqual(holdRows(), [], '돌려주기가 저장되면 장부 줄도 지운다');
  assert.equal(pianoThrowsLeft(), 1);
  assert.equal(hasButton('🎯 음악 포켓몬 잡기'), true, '단추로 다시');
});

test('화면 ② 던지기 — 판정 때 장부 줄을 지움 · 잡으면 도감에 · 📤 잡음 · 쓴 기회는 돌려주지 않음 · 남은 기회가 없으면 단추가 사라짐', async () => {
  button('🎯 음악 포켓몬 잡기').click();
  await waitFor(() => isCatchOpen(), '잡기 화면');
  assert.deepEqual(saved(), { earned: 1, used: 2, refunded: 1 });
  const id = cands()[0];
  const d0 = Number(((await getDaily(clockDay())) || {}).pnCaught) || 0;
  const realRandom = Math.random;
  Math.random = () => 0; // 반드시 잡힘(rng < 확률)
  try {
    byId('catch-pick').children[0].click();
    await waitFor(() => holdRows().length === 0, '판정 — 장부 줄 지움', 6000);
    await waitFor(() => CONT.hidden === false, '결과', 8000);
  } finally { Math.random = realRandom; }
  assert.equal(Number(getProfileSnapshot().caught[id]), 1, '잡은 음악 포켓몬이 도감에');
  CONT.click();
  await waitFor(() => !P.S.catching, '닫힘');
  await settle(30);
  assert.deepEqual(saved(), { earned: 1, used: 2, refunded: 1 }, '던졌으면 돌려주지 않는다');
  assert.equal(pianoThrowsLeft(), 0);
  assert.equal(hasButton('🎯 음악 포켓몬 잡기'), false, '남은 기회가 없으면 단추 없음');
  await waitFor(async () => (Number(((await getDaily(clockDay())) || {}).pnCaught) || 0) === d0 + 1, '📤 잡음');
});

test('화면 ③ 🎧 다섯째 칸 — 안내 창이 떠 있으면 닫은 뒤에 잡기 화면 · 잡기 창이 떠 있으면 안내 창은 안 뜸 · 바깥에서 닫히면(소식 없음) 들어올 때 돌려줌', async () => {
  await setPiano({ notes: 4, days: {} });
  P.openSong('ode');
  button('🎧 듣고 따라 치기').click();
  button('1줄').click();
  byId('pn-go').click();
  P.advance(100);
  byId('pn-slots').click(); // 🐾 안내 창
  assert.ok(byId('pn-intro'));
  byId('pn-done').click();
  await waitFor(() => ball().earned === 1, '다섯째 칸 — 기회');
  await settle(30);
  assert.deepEqual([isCatchOpen(), P.S.catching, P.S.catchWant], [false, false, true], '안내 창 위에 겹치지 않는다');
  button('알겠어요!').click();
  await waitFor(() => isCatchOpen(), '닫으면 잡기 화면');
  assert.equal(saved().used, 1);
  byId('pn-slots').click();
  assert.equal(byId('pn-intro'), null, '잡기 창이 떠 있으면 안내 창은 안 뜬다');
  // 다른 화면이 잡기 창을 닫았다(catch.closeCatch는 onDone을 안 부른다) — 다음에 들어오면 돌려준다
  closeCatch();
  assert.equal(P.S.catching, true, '소식이 없으니 아직 모른다');
  PV.leaveMusic();
  await PV.enterMusic();
  await waitFor(() => saved().refunded === 1 && !P.S.catching, '들어올 때 돌려줌');
  assert.deepEqual(holdRows(), []);
  assert.equal(hasButton('🎯 음악 포켓몬 잡기'), true);
});

test('화면 ④ 빼기가 저장되지 않으면 띄우지 않는다 — 한 줄(숫자 없음) · 장부 그대로 · 다시 누를 수 있다', async () => {
  const b0 = saved();
  fakeIdb.failNext('profile');
  button('🎯 음악 포켓몬 잡기').click();
  await waitFor(() => P.S.catchMsg === PV.CATCH_WHY.save && !P.S.catching, '저장 실패 한 줄');
  assert.equal(fakeIdb.failsLeft(), 0, '실패는 빼기가 먹었다');
  assert.equal(isCatchOpen(), false);
  assert.deepEqual(saved(), b0);
  assert.deepEqual(holdRows(), []);
  assert.ok(byId('pn-catch').textContent.includes(PV.CATCH_WHY.save));
  assert.equal(button('🎯 음악 포켓몬 잡기').disabled, false);
});

test('화면 ⑤ 뺀 뒤 판정 전에 앱이 꺼졌다 — 남은 장부 줄은 다음에 들어올 때 돌려준다(이 창의 줄)', async () => {
  P.S.catchMsg = '';
  const t = await pianoTakeThrow();
  assert.equal(t.ok, true);
  const b0 = saved();
  store.set(HOLD_KEY, JSON.stringify(holdAdd({}, 'crash1', PAGE_ID, Date.now())));
  PV.leaveMusic();
  await PV.enterMusic();
  await waitFor(() => saved().refunded === b0.refunded + 1, '남은 줄 돌려주기');
  assert.deepEqual(holdRows(), []);
  assert.equal(pianoThrowsLeft(), 1);
});

test('화면 ⑥ 기기 그림이 만난 아이 것뿐이면 — 안 만난 음악 포켓몬 그림을 받아 오려 한다(「안 만난 아이 먼저」) · 못 받으면 있는 그림으로 잡기', async () => {
  await houseDo((p) => { for (const id of PICS) p.caught[id] = Math.max(1, Number(p.caught[id]) || 0); return { ok: true }; });
  const art0 = artFetches().length;
  P.S.catchMsg = '';
  button('🎯 음악 포켓몬 잡기').click();
  await waitFor(() => isCatchOpen(), '잡기 화면', 6000);
  const asked = artFetches().slice(art0);
  assert.ok(asked.length > 0, '그림을 받아 오려 했다');
  assert.ok(asked.every((id) => MUSIC.includes(id) && !PICS.includes(id)), `받으려 한 것은 아직 그림이 없는 음악 포켓몬: ${asked}`);
  assert.equal(cands().length, CANDS);
  assert.ok(cands().every((id) => PICS.includes(id)), '못 받았으면 있는 그림(만난 아이)으로');
  CONT.click(); // 안 던지고 닫음 — 돌려준다
  await waitFor(() => !P.S.catching && pianoThrowsLeft() === 1, '돌려주기');
  assert.deepEqual(holdRows(), []);
});

test('화면 ⑦ 안 던지고 닫았는데 돌려주는 저장이 안 됐다 — 사실대로 한 줄(숫자 없음) · 장부 줄이 남아 다음에 들어올 때 돌려준다', async () => {
  P.S.catchMsg = '';
  button('🎯 음악 포켓몬 잡기').click();
  await waitFor(() => isCatchOpen(), '잡기 화면', 6000);
  const b0 = saved();
  assert.equal(holdRows().length, 1);
  fakeIdb.failNext('profile');
  CONT.click(); // 안 던지고 닫음 — 돌려주기 저장이 실패한다
  await waitFor(() => !P.S.catching && P.S.catchMsg === PV.CATCH_WHY.owed, '돌려주기 실패 한 줄');
  assert.equal(fakeIdb.failsLeft(), 0, '실패는 돌려주기가 먹었다');
  assert.deepEqual(saved(), b0, '저장소는 그대로(뺀 채)');
  assert.equal(holdRows().length, 1, '장부 줄이 남는다 — 다음 진입에 돌려줄 몫');
  assert.equal(pianoThrowsLeft(), 0);
  assert.ok(byId('pn-catch').textContent.includes(PV.CATCH_WHY.owed), '단추 칸에 한 줄');
  PV.leaveMusic();
  await PV.enterMusic();
  await waitFor(() => saved().refunded === b0.refunded + 1, '다음 진입에 돌려줌');
  assert.deepEqual(holdRows(), []);
  assert.equal(pianoThrowsLeft(), 1);
  await waitFor(() => hasButton('🎯 음악 포켓몬 잡기'), '단추로 다시');
  await waitFor(() => P.S.catchMsg === '' && !byId('pn-catch').textContent.includes(PV.CATCH_WHY.owed), '돌려준 뒤엔 「다시 들어오면 돌려줘요」 한 줄도 지운다(Codex 233차 P3)');
});

test('화면 ⑧ 던져서 놓쳤다 — 그 기회는 끝(돌려주지 않음) · 판정 때 장부 줄 지움 · 도감 그대로 · 📤 놓침', async () => {
  P.S.catchMsg = '';
  button('🎯 음악 포켓몬 잡기').click();
  await waitFor(() => isCatchOpen(), '잡기 화면', 6000);
  const b0 = saved();
  const caught0 = { ...getProfileSnapshot().caught };
  const d0 = Number(((await getDaily(clockDay())) || {}).pnFled) || 0;
  const realRandom = Math.random;
  Math.random = () => 0.9999; // 반드시 놓침(rng ≥ 확률)
  try {
    byId('catch-pick').children[0].click();
    await waitFor(() => holdRows().length === 0, '판정 — 장부 줄 지움', 6000);
    await waitFor(() => CONT.hidden === false, '결과', 10000);
  } finally { Math.random = realRandom; }
  assert.deepEqual(getProfileSnapshot().caught, caught0, '놓치면 도감 그대로');
  CONT.click();
  await waitFor(() => !P.S.catching, '닫힘');
  await settle(30);
  assert.deepEqual(saved(), b0, '던졌으면 돌려주지 않는다 — 그 기회는 끝');
  assert.equal(pianoThrowsLeft(), 0);
  assert.equal(hasButton('🎯 음악 포켓몬 잡기'), false);
  await waitFor(async () => (Number(((await getDaily(clockDay())) || {}).pnFled) || 0) === d0 + 1, '📤 놓침');
});

test('화면 ⑨ 잡기 흐름이 그림을 받는 사이 ▶ — 새 판을 시작하지 않고 알림(곧 뜰 창이 판 가운데를 끊지 않게 · v429 검토) · 흐름이 없으면 그대로 ▶', async () => {
  await setPiano({ notes: 0, days: {} });
  P.openSong('ode');
  P.S.catching = true; // 그림을 받는 사이(창은 아직)
  try {
    byId('pn-go').click();
    assert.equal(P.S.running, false, '새 판을 시작하지 않는다');
    assert.match(byId('pn-toast').innerHTML, /음악 포켓몬을 부르는 중이에요/);
    assert.doesNotMatch(byId('pn-toast').innerHTML.replace(/<[^>]+>/g, ''), /\d/, '알림에 숫자 없음');
  } finally { P.S.catching = false; }
  byId('pn-go').click();
  assert.equal(P.S.running, true, '흐름이 없으면 ▶');
  byId('pn-go').click();
  assert.equal(P.S.running, false, '⏸');
});

test('화면 ⑩ 잡기 창이 떠 있으면 PC 자판 건반이 창 밑 그림판을 새로 치지 않는다 · 닫으면 다시 친다(v429 검토)', async () => {
  await setPiano({ notes: 5, mons: 1, days: {}, ball: { earned: 1 } });
  P.openSong('ode');
  button('🎹 태블릿으로 치기').click();
  P.S.catchMsg = '';
  P.runMusicCatch();
  await waitFor(() => isCatchOpen(), '잡기 화면', 6000);
  pcPress(true, 'a');
  assert.equal(P.S.pcDown.has(60), false, '창 밑에선 안 친다');
  pcPress(false, 'a');
  CONT.click();
  await waitFor(() => !P.S.catching && pianoThrowsLeft() === 1, '안 던지고 닫음 — 돌려줌');
  pcPress(true, 'a');
  assert.equal(P.S.pcDown.has(60), true, '창이 없으면 자판 건반이 친다(위 단언이 빈 단언이 아니다)');
  pcPress(false, 'a');
  assert.equal(P.S.pcDown.has(60), false);
});

test('화면 ⑪ 「다시 눌러 주세요」 한 줄이 뜬 뒤 다른 창이 그 기회를 썼다 — 들어오면 단추도 지난 한 줄도 없다(다음 기회 때 되살아나지 않게 · Codex 233차 P3)', async () => {
  await setPiano({ notes: 5, mons: 1, days: {}, ball: { earned: 1 } });
  PV.leaveMusic();
  await PV.enterMusic();
  await waitFor(() => hasButton('🎯 음악 포켓몬 잡기'), '단추');
  P.S.catchMsg = '';
  fakeIdb.failNext('profile');
  button('🎯 음악 포켓몬 잡기').click();
  await waitFor(() => P.S.catchMsg === PV.CATCH_WHY.save && !P.S.catching, '저장 실패 한 줄');
  assert.equal((await pianoTakeThrow()).ok, true, '다른 창이 그 기회를 썼다');
  PV.leaveMusic();
  await PV.enterMusic();
  await waitFor(() => !hasButton('🎯 음악 포켓몬 잡기'), '단추 없음');
  assert.equal(P.S.catchMsg, '', '지난 「다시 눌러 주세요」는 지운다');
  assert.equal(byId('pn-catch').hidden, true);
});

// ───────────────────── 🔍 v429 변이 검사 빈틈 (mutate_v429 — 살아남은 변이를 잡는 시험) ─────────────────────

const pnBall = async () => Number(((await getDaily(clockDay())) || {}).pnBall) || 0;
const goodChance = { notes: 5, mons: 1, days: {}, ball: { earned: 1 } }; // 남은 기회 하나(밀린 몫 없음)

test('빈틈 ⓐ 순수 — 병합은 어느 쪽 earned가 커도 큰 쪽 · 밀린 묶음 여럿은 한 번에 그만큼(b 줄 c) · 몫이 없으면 p.piano를 안 건드린다', () => {
  assert.deepEqual(mergePiano({ ball: { earned: 3, used: 1 } }, { ball: { earned: 1 } }).ball, { earned: 3, used: 1, refunded: 0 }, '앞쪽 earned가 커도');
  const p = { caught: {}, piano: { notes: 15, mons: 0, days: {} } }; // v402·v403 때 넘친 ♪ 묶음 셋
  const r = monsDueRule(p, NOW);
  assert.deepEqual([r.chances, r.left, r.mons], [3, 3, 3]);
  assert.deepEqual(pianoOf(p.piano).log.map((x) => [x.m, x.s, x.c]), [['b', 'n', 3]], '한 줄에 ×3');
  const raw = { notes: 5, mons: 1, days: {} };
  const q = { caught: {}, piano: raw };
  assert.equal(monsDueRule(q, NOW).chances, 0);
  assert.equal(q.piano, raw, '몫이 없으면 그대로(들어올 때마다 쓰지 않게)');
  const e = { caught: {} };
  monsDueRule(e, NOW);
  assert.equal('piano' in e, false, '음악 기록이 없던 프로필에 칸을 만들지 않는다');
});

test('빈틈 ⓑ 밀린 몫 둘 → 들어올 때 기회 둘(바로 안 띄움) · 📤 pnBall · 단추 칸에 숫자 없음', async () => {
  const d0 = await pnBall();
  await setPiano({ notes: 10, mons: 0, days: {} });
  PV.leaveMusic();
  await PV.enterMusic();
  await waitFor(() => pianoThrowsLeft() === 2 && hasButton('🎯 음악 포켓몬 잡기'), '밀린 몫 둘 → 기회 둘');
  assert.equal(isCatchOpen(), false);
  assert.doesNotMatch(byId('pn-catch').textContent, /\d/, '단추 칸에 남은 수를 쓰지 않는다');
  await waitFor(async () => (await pnBall()) === d0 + 2, '📤 밀린 몫도 pnBall');
});

test('빈틈 ⓒ 🎧 ♪ 다섯째 칸 — 저장을 기다리는 사이 판이 바뀌어도(손 바꿈) 바로 잡기 화면 · 📤 pnBall', async () => {
  const d0 = await pnBall();
  await setPiano({ notes: 4, days: {} });
  P.openSong('ode');
  button('🎧 듣고 따라 치기').click();
  button('1줄').click();
  byId('pn-go').click();
  P.advance(100);
  byId('pn-done').click();
  button(P.S.hands === 'L' ? '오른손' : '왼손').click(); // 판이 바뀜(gen +1)
  await waitFor(() => isCatchOpen(), '판이 바뀌었어도 바로 잡기 화면', 6000);
  CONT.click();
  await waitFor(() => !P.S.catching && pianoThrowsLeft() === 1, '안 던지고 닫음 — 돌려줌');
  await waitFor(async () => (await pnBall()) === d0 + 1, '📤 ♪ 다섯째 칸 pnBall');
});

test('빈틈 ⓓ 🎧 「가득 찼어요」는 ♪ 묶음이 이번 칸으로 찼을 때만 — 밀린 책 곡 몫만 기회로 바뀐 판은 보통 알림(잡기 화면은 뜬다)', async () => {
  await setPiano({ notes: 1, taps: 10, tapMons: 0, days: {} }); // 밀린 책 곡 몫 하나(들어올 때 저장 실패로 남았다)
  byId('pn-go').click();
  P.advance(100);
  byId('pn-done').click();
  await waitFor(() => isCatchOpen(), '밀린 몫 — 잡기 화면', 6000);
  const t = byId('pn-toast').innerHTML;
  assert.ok(t.includes('🎵 음표를 채웠어요!') && !t.includes('가득'), t);
  CONT.click();
  await waitFor(() => !P.S.catching, '닫음');
});

test('빈틈 ⓔ 🎹 책 곡 열째 판 — 저장을 기다리는 사이 판이 바뀌어도 바로 잡기 화면 · 📤 pnBall', async () => {
  const d0 = await pnBall();
  await setPiano({ days: { [dayKeyOf()]: { paid: 0, coins: 0, notes: 0, book: { n: 9 } } } });
  P.openSong('bk');
  button('🎹 태블릿으로 치기').click();
  button('곡 전체').click();
  button('한 번').click();
  byId('pn-go').click();
  const gen = P.S.gen;
  for (let g = 0; g < 5000 && P.S.running && P.S.gen === gen; g += 1) {
    const st = P.S.steps[P.S.si];
    if (P.S.waiting && st) for (const m of st.need) P.press(m);
    P.advance(0.25);
  }
  button(P.S.hands === 'L' ? '오른손' : '왼손').click(); // 판이 바뀜(gen +1)
  await waitFor(() => isCatchOpen(), '판이 바뀌었어도 바로 잡기 화면', 6000);
  CONT.click();
  await waitFor(() => !P.S.catching && pianoThrowsLeft() === 1, '돌려줌');
  await waitFor(async () => (await pnBall()) === d0 + 1, '📤 책 곡 열째 판 pnBall');
});

test('빈틈 ⓕ 🐾 안내 창 — 잡는 중(그림을 받는 사이 · 창은 아직)엔 안 뜬다 · 바깥에서 닫힌 잡기 창은 ♪ 칸을 누를 때 먼저 정리해 안내 창이 뜬다', async () => {
  P.S.catching = true;
  byId('pn-slots').click();
  assert.equal(byId('pn-intro'), null, '곧 뜰 잡기 창 밑에 안내 창이 남지 않게');
  P.S.catching = false;
  await setPiano(goodChance);
  const b0 = saved();
  P.runMusicCatch();
  await waitFor(() => isCatchOpen(), '잡기 화면', 6000);
  closeCatch(); // 다른 화면이 닫음 — onDone 없음
  byId('pn-slots').click();
  assert.ok(byId('pn-intro'), '「잡는 중」이 남아 ♪ 칸이 말없이 안 열리지 않게');
  await waitFor(() => saved().refunded === b0.refunded + 1 && !P.S.catching, '안 던졌으니 돌려줌');
  button('알겠어요!').click();
});

test('빈틈 ⓖ 바깥에서 닫힌 잡기 창 — 곡 목록을 그릴 때 먼저 정리 · 돌려주는 저장이 안 되면 사실대로 한 줄 · 다음 진입에 돌려줌', async () => {
  await setPiano(goodChance);
  P.S.catchMsg = '';
  P.runMusicCatch();
  await waitFor(() => isCatchOpen(), '잡기 화면', 6000);
  closeCatch();
  fakeIdb.failNext('profile');
  P.renderList();
  await waitFor(() => !P.S.catching && P.S.catchMsg === PV.CATCH_WHY.owed, '돌려주기 실패 한 줄');
  assert.equal(fakeIdb.failsLeft(), 0, '실패는 돌려주기가 먹었다');
  assert.ok(byId('pn-catch').textContent.includes(PV.CATCH_WHY.owed));
  PV.leaveMusic();
  await PV.enterMusic();
  await waitFor(() => pianoThrowsLeft() === 1 && hasButton('🎯 음악 포켓몬 잡기') && !button('🎯 음악 포켓몬 잡기').disabled, '다음 진입에 돌려주고 단추로');
});

test('빈틈 ⓗ 던진 뒤 바깥에서 닫힘 — 쓴 기회라 돌려주지 않고 거짓 「돌려주기 실패」 한 줄도 없다', async () => {
  await setPiano(goodChance);
  P.S.catchMsg = '';
  P.runMusicCatch();
  await waitFor(() => isCatchOpen(), '잡기 화면', 6000);
  const realRandom = Math.random;
  Math.random = () => 0.9999; // 반드시 놓침
  try {
    byId('catch-pick').children[0].click();
    await waitFor(() => CONT.hidden === false, '결과', 10000);
  } finally { Math.random = realRandom; }
  const b0 = saved();
  closeCatch();
  PV.leaveMusic();
  await PV.enterMusic();
  await waitFor(() => !P.S.catching, '정리');
  await settle(50);
  assert.equal(P.S.catchMsg, '', '돌려줄 게 없다 — 「돌려주기 실패」라고 하지 않는다');
  assert.deepEqual(saved(), b0, '쓴 기회는 돌려주지 않는다');
});

test('빈틈 ⓘ 다른 창의 장부 줄 — 그 창이 멈춘 지 1분이 되면 기다렸다가 돌려준다(그 사이엔 그대로)', async () => {
  await setPiano({ notes: 5, mons: 1, days: {}, ball: { earned: 1, used: 1 } }); // 다른 창이 뺀 기회
  const b0 = saved();
  store.set(HOLD_KEY, JSON.stringify(holdAdd({}, 'other1', 'otherpage', Date.now() - 60000 + 6000))); // 1분까지 6초 — 들어오고 200ms 뒤 「아직」을 볼 여유(바쁜 PC · Codex 234차 P3)
  PV.leaveMusic();
  await PV.enterMusic();
  await settle(200);
  assert.equal(saved().refunded, b0.refunded, '아직 살아 있는 다른 창의 줄은 그대로');
  await waitFor(() => saved().refunded === b0.refunded + 1, '1분이 되면 돌려줌', 14000);
  assert.deepEqual(holdRows(), []);
});

test('빈틈 ⓙ 그림은 있는데 모두 😴 쉬는 중 — 「지금은 만날 수 있는 음악 포켓몬이 없어요」(그림을 못 받았다고 하지 않는다) · 기회 그대로', async () => {
  await setPiano(goodChance);
  await houseDo((p) => { for (const id of PICS) p.mons[id] = { ...(p.mons[id] || {}), hp: 0 }; return { ok: true }; });
  try {
    P.S.catchMsg = '';
    await P.runMusicCatch();
    assert.equal(P.S.catchMsg, PV.CATCH_WHY.noavail);
    assert.equal(isCatchOpen(), false);
    assert.equal(pianoThrowsLeft(), 1, '빼기 전이라 기회 그대로');
  } finally {
    await houseDo((p) => { for (const id of PICS) if (p.mons[id]) delete p.mons[id].hp; return { ok: true }; });
  }
});

test('빈틈 ⓚ 그림 받기가 끝나면(실패여도) 8초 시계를 지운다', async () => {
  await setPiano(goodChance);
  const realSet = globalThis.setTimeout;
  const realClear = globalThis.clearTimeout;
  const eight = [];
  const cleared = new Set();
  globalThis.setTimeout = (f, ms, ...a) => { const t = realSet(f, ms, ...a); if (ms === 8000) eight.push(t); return t; };
  globalThis.clearTimeout = (t) => { cleared.add(t); return realClear(t); };
  try {
    P.S.catchMsg = '';
    P.runMusicCatch();
    await waitFor(() => isCatchOpen(), '잡기 화면', 6000);
  } finally { globalThis.setTimeout = realSet; globalThis.clearTimeout = realClear; }
  assert.ok(eight.length >= 1, '안 만난 아이 그림을 받으려 했다(8초 시계)');
  assert.ok(eight.every((t) => cleared.has(t)), '8초 시계를 남기지 않는다');
  CONT.click();
  await waitFor(() => !P.S.catching && pianoThrowsLeft() === 1, '돌려줌');
});

test('빈틈 ⓛ 무대의 단추 줄이 생기거나 사라지면 그림판 자리를 다시 잡는다(layout)', async () => {
  await setPiano({ notes: 0, days: {} });
  P.openSong('ode'); // 무대 — 남은 기회가 없어 단추 칸이 비었다
  await setPiano(goodChance);
  Object.defineProperty(El.prototype, 'offsetHeight', { configurable: true, get() { return this.id === 'pn-catch' ? this.children.length * 44 : 0; } });
  try {
    P.G.bg = 'mark';
    P.runMusicCatch(); // 시작에 단추 칸을 다시 그린다 — 단추 줄이 생김
    await waitFor(() => P.S.catching, '도는 중');
    assert.notEqual(P.G.bg, 'mark', '단추 줄 높이가 바뀌면 layout');
    await waitFor(() => isCatchOpen(), '잡기 화면', 6000);
  } finally { delete El.prototype.offsetHeight; }
  CONT.click();
  await waitFor(() => !P.S.catching && pianoThrowsLeft() === 1, '돌려줌');
});

test('빈틈 ⓜ 잡기 창을 띄우기 전에 ⏸처럼 멈추고 누른 건반 소리를 끈다(창 위에서 뗀 손가락은 그림판이 못 듣는다)', async () => {
  await setPiano(goodChance);
  byId('pn-go').click();
  assert.equal(P.S.running, true);
  P.S.held.set(60, {});
  P.S.ptr.set(1, 60);
  P.S.pcDown.add('a');
  P.runMusicCatch();
  await waitFor(() => P.S.catching, '도는 중');
  assert.equal(P.S.running, false, '⏸처럼 멈춤');
  assert.deepEqual([P.S.held.size, P.S.ptr.size, P.S.pcDown.size], [0, 0, 0], '누른 건반 정리');
  await waitFor(() => isCatchOpen(), '잡기 화면', 6000);
  CONT.click();
  await waitFor(() => !P.S.catching && pianoThrowsLeft() === 1, '돌려줌');
});

test('빈틈 ⓝ 그림 받기가 8초를 넘기면 그 사이 저장된 그림까지 후보로 · 다음 잡기는 도는 받기를 같이 기다린다 · 끝나지 않는 요청은 제한 시간에 끊겨 다음 받기가 다시 시작된다 (Codex 234차)', async () => {
  await houseDo((p) => { for (const id of PICS) p.caught[id] = Math.max(1, Number(p.caught[id]) || 0); return { ok: true }; });
  await setPiano({ notes: 5, mons: 1, days: {}, ball: { earned: 2 } });
  PV.leaveMusic();
  await PV.enterMusic(); // 혼자 돌려도(이름 고르기) 음악 화면 안에서
  const NEW = MUSIC.find((id) => !PICS.includes(id) && !(Number(getProfileSnapshot().caught[id]) > 0));
  const realFetch = globalThis.fetch;
  const realSet = globalThis.setTimeout;
  const hung = [];
  // 그림 요청이 끝나지 않는다(끊기 신호만 받는다) · 8초 → 0.3초 · 한 장 제한 시간 → 1.5초
  // 공식 그림만 매달린다 — 잡기 창이 받으러 가는 움직이는 도트(.gif)까지 hung에 들면 셈이 흔들린다(v429 변이 검사)
  globalThis.fetch = (u, o) => { fetched.push(String(u)); if (!/official-artwork/.test(String(u))) return Promise.reject(new Error('시험에선 도트 그림을 안 받는다')); return new Promise((res, rej) => { hung.push(String(u)); if (o && o.signal) o.signal.addEventListener('abort', () => rej(new Error('끊음'))); }); };
  globalThis.setTimeout = (f, ms, ...a) => realSet(f, ms === 8000 ? 300 : ms === ART_FETCH_MS ? 1500 : ms, ...a);
  try {
    P.S.catchMsg = '';
    P.runMusicCatch();
    await waitFor(() => hung.length === 1, '첫 그림 요청이 매달림');
    fakeIdb.put('characters', { id: NEW, ko: '', en: '', blob: new Blob(['x']), anchor: { x: 0.5, y: 0.2 }, savedAt: 0 }); // 기다리는 사이 저장된 그림
    await waitFor(() => isCatchOpen(), '8초(줄인 시계)가 지나면 있는 만큼으로 잡기 화면', 6000);
    assert.ok(cands().includes(NEW), `그 사이 저장된 그림도 다시 읽어 후보로: ${cands()}`);
    CONT.click();
    await waitFor(() => !P.S.catching, '안 던지고 닫음');
    const n0 = hung.length;
    P.runMusicCatch(); // 받기가 아직 도는 중 — 같이 기다린다
    await waitFor(() => isCatchOpen(), '두 번째 잡기 화면', 6000);
    assert.equal(hung.length, n0, '같은 그림을 또 받지 않는다');
    CONT.click();
    await waitFor(() => !P.S.catching, '닫음');
    globalThis.fetch = realFetch; // 다음 요청부터는 바로 실패 — 매달린 요청은 제한 시간에 끊겨야 받기가 끝난다
    const a0 = artFetches().length;
    P.runMusicCatch();
    await waitFor(() => artFetches().length > a0, '매달린 받기가 끊긴 뒤 새로 받는다', 8000);
    await waitFor(() => isCatchOpen(), '세 번째 잡기 화면', 8000);
    CONT.click();
    await waitFor(() => !P.S.catching && pianoThrowsLeft() === 2, '안 던지고 닫음 — 기회 그대로');
  } finally {
    globalThis.fetch = realFetch;
    globalThis.setTimeout = realSet;
    if (isCatchOpen()) CONT.click();
  }
});

// ───────────────────── 🔍 v429b 변이 검사 빈틈 (mut429fix — 검토 뒤 고침에서 살아남은 변이를 잡는 시험) ─────────────────────

test('빈틈 ⓞ 바깥에서 닫힌 잡기 창 — ▶를 누르면 먼저 정리해 바로 시작한다(「부르는 중」으로 막히지 않게) · 안 던졌으니 돌려줌', async () => {
  await setPiano(goodChance);
  P.openSong('ode');
  P.S.catchMsg = '';
  const b0 = saved();
  P.runMusicCatch();
  await waitFor(() => isCatchOpen(), '잡기 화면', 6000);
  closeCatch(); // 다른 화면이 닫음 — onDone 없음
  assert.equal(P.S.catching, true, '소식이 없으니 아직 모른다');
  byId('pn-go').click();
  assert.equal(P.S.catching, false, '▶가 먼저 정리한다');
  assert.equal(P.S.running, true, '「부르는 중」으로 막히지 않고 시작');
  byId('pn-go').click(); // ⏸
  assert.equal(P.S.running, false);
  await waitFor(() => saved().refunded === b0.refunded + 1 && pianoThrowsLeft() === 1, '안 던졌으니 돌려줌');
});

test('빈틈 ⓟ 「돌려줘요」 한 줄 — 이 창 몫을 돌려주면 다른 창의 살아 있는 줄이 남아도 바로 지운다', async () => {
  await setPiano(goodChance);
  P.S.catchMsg = '';
  P.runMusicCatch();
  await waitFor(() => isCatchOpen(), '잡기 화면', 6000);
  fakeIdb.failNext('profile');
  CONT.click(); // 안 던지고 닫음 — 돌려주는 저장이 안 됨
  await waitFor(() => !P.S.catching && P.S.catchMsg === PV.CATCH_WHY.owed, '돌려주기 실패 한 줄');
  store.set(HOLD_KEY, JSON.stringify(holdAdd(JSON.parse(store.get(HOLD_KEY) || '{}'), 'other3', 'otherpage', Date.now() - 60000 + 6000))); // 아직 살아 있는 다른 창의 줄(1분까지 6초)
  try {
    PV.leaveMusic();
    await PV.enterMusic();
    await waitFor(() => pianoThrowsLeft() === 1, '이 창 몫은 돌려줌');
    await waitFor(() => P.S.catchMsg === '' && !byId('pn-catch').textContent.includes(PV.CATCH_WHY.owed), '이 창 몫이 정리됐으니 「돌려줘요」 한 줄을 지운다(다른 창 줄을 기다리지 않는다)', 3000);
    assert.deepEqual(holdRows(), ['other3'], '다른 창의 살아 있는 줄은 그대로');
    await waitFor(() => holdRows().length === 0, '다른 창 줄은 1분이 되면 정리', 12000);
  } finally { store.delete(HOLD_KEY); }
});

test('빈틈 ⓠ 「돌려줘요」 한 줄 — 들어올 때 돌려주기가 또 저장되지 않아 이 창 몫이 남았으면 한 줄을 그대로 둔다', async () => {
  await setPiano(goodChance);
  P.S.catchMsg = '';
  P.runMusicCatch();
  await waitFor(() => isCatchOpen(), '잡기 화면', 6000);
  fakeIdb.failNext('profile');
  CONT.click();
  await waitFor(() => !P.S.catching && P.S.catchMsg === PV.CATCH_WHY.owed, '돌려주기 실패 한 줄');
  PV.leaveMusic();
  fakeIdb.failNext('profile');
  await PV.enterMusic();
  await waitFor(() => fakeIdb.failsLeft() === 0, '들어올 때 돌려주기도 저장 안 됨');
  await settle(50);
  assert.equal(holdRows().length, 1, '이 창 몫이 아직 남았다');
  assert.equal(pianoThrowsLeft(), 0);
  assert.equal(P.S.catchMsg, PV.CATCH_WHY.owed, '아직 못 돌려줬다 — 「다시 들어오면 돌려줘요」 그대로');
  assert.ok(byId('pn-catch').textContent.includes(PV.CATCH_WHY.owed));
  PV.leaveMusic();
  await PV.enterMusic();
  await waitFor(() => pianoThrowsLeft() === 1 && holdRows().length === 0 && P.S.catchMsg === '', '다음 진입에 돌려주고 한 줄도 지움');
});

test('빈틈 ⓡ 들어올 때 장부 정리는 「돌려줘요」 한 줄만 지운다 — 「다시 눌러 주세요(기회 그대로)」 한 줄은 단추와 함께 남는다', async () => {
  await setPiano(goodChance);
  PV.leaveMusic();
  await PV.enterMusic();
  await waitFor(() => hasButton('🎯 음악 포켓몬 잡기'), '단추');
  P.S.catchMsg = '';
  fakeIdb.failNext('profile');
  await P.runMusicCatch();
  assert.equal(P.S.catchMsg, PV.CATCH_WHY.save);
  PV.leaveMusic();
  await PV.enterMusic();
  await settle(100);
  assert.equal(P.S.catchMsg, PV.CATCH_WHY.save, '기회가 그대로 있으니 한 줄도 그대로');
  assert.ok(hasButton('🎯 음악 포켓몬 잡기'));
  assert.ok(byId('pn-catch').textContent.includes(PV.CATCH_WHY.save));
  P.S.catchMsg = '';
});

test('빈틈 ⓢ 「돌려줘요」 한 줄 — 이 창 몫을 다른 창이 먼저 돌려줬으면(여기서 돌려준 수 0) 들어올 때 한 줄을 지우고 단추 칸을 다시 그린다', async () => {
  await setPiano(goodChance);
  P.S.catchMsg = '';
  P.runMusicCatch();
  await waitFor(() => isCatchOpen(), '잡기 화면', 6000);
  fakeIdb.failNext('profile');
  CONT.click();
  await waitFor(() => !P.S.catching && P.S.catchMsg === PV.CATCH_WHY.owed, '돌려주기 실패 한 줄');
  store.delete(HOLD_KEY); // 이 창이 멈춘 사이 다른 창이 1분 지난 이 줄을 돌려줬다
  assert.equal((await pianoGiveBackThrow()).ok, true);
  PV.leaveMusic();
  await PV.enterMusic();
  await waitFor(() => P.S.catchMsg === '' && !byId('pn-catch').textContent.includes(PV.CATCH_WHY.owed), '한 줄을 지우고 다시 그린다');
  assert.ok(hasButton('🎯 음악 포켓몬 잡기'));
});

test('빈틈 ⓣ 그림 받기 차례 — 안 만난 아이 먼저·등급 무게 차례(명단 차례 아님 · 그림 없이 만난 아이는 뒤로) · 한 번에 여섯', async () => {
  const noPic = MUSIC.filter((id) => !fakeIdb.get('characters', id));
  const seenNoPic = noPic[noPic.length - 1]; // 그림은 없는데 만난 아이(백업을 되살린 새 기기 꼴)
  await houseDo((p) => { for (const id of PICS) p.caught[id] = Math.max(1, Number(p.caught[id]) || 0); p.caught[seenNoPic] = 1; return { ok: true }; });
  await setPiano(goodChance);
  const rng = () => 0.9999; // 무게 고르기가 늘 끝쪽 — 명단 차례와 갈린다
  const want = pickMusicCands(noPic.map((id) => ({ id, r: rarityOf(id) })), Object.fromEntries(noPic.map((id) => [id, caughtCount(id)])), noPic.length, rng).slice(0, 6);
  assert.equal(want.length, 6);
  assert.notEqual(want[0], noPic[0], '명단 차례와 다르다(빈 단언이 아니다)');
  assert.ok(!want.includes(seenNoPic), '만난 아이는 뒤로');
  const a0 = artFetches().length;
  const realRandom = Math.random;
  try {
    Math.random = rng;
    try {
      P.S.catchMsg = '';
      P.runMusicCatch();
      await waitFor(() => isCatchOpen(), '잡기 화면', 8000);
    } finally { Math.random = realRandom; }
    assert.deepEqual(artFetches().slice(a0), want, '받는 차례');
  } finally {
    if (isCatchOpen()) CONT.click();
    await waitFor(() => !P.S.catching, '닫음');
    await houseDo((p) => { delete p.caught[seenNoPic]; return { ok: true }; });
  }
  assert.equal(pianoThrowsLeft(), 1, '안 던지고 닫았으니 돌려줌');
});

test('빈틈 ⓤ 던진 결과 줄은 저장된 프로필에 남는다 — 놓치면 x 0 · 잡으면 x 1 · 그 포켓몬 번호(📤 「🎯 잡음·놓침 — 이름」)', async () => {
  await setPiano({ ...goodChance, ball: { earned: 2 } });
  const want = [];
  for (const [rnd, x] of [[0.9999, 0], [0, 1]]) { // 반드시 놓침 → 반드시 잡음
    P.S.catchMsg = '';
    P.runMusicCatch();
    await waitFor(() => isCatchOpen(), '잡기 화면', 6000);
    const id = cands()[0];
    const realRandom = Math.random;
    Math.random = () => rnd;
    try {
      byId('catch-pick').children[0].click();
      await waitFor(() => CONT.hidden === false, '결과', 10000);
    } finally { Math.random = realRandom; }
    want.push([String(id), x]);
    await waitFor(() => savedJ().length === want.length, '저장된 던진 결과 줄');
    assert.deepEqual(savedJ(), want);
    CONT.click();
    await waitFor(() => !P.S.catching, '닫힘');
  }
  assert.equal(pianoThrowsLeft(), 0, '던졌으니 돌려주지 않는다');
});
