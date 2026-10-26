// 🎮 게임기 미니 게임 v346 (2026-10-26 아버님 "다음 미니 게임 가자" → 기본안 "이대로") — node --test tests/minigame346.test.js
// 🧠 포켓몬 따라 하기(60초 · 🔥 불꽃 · 💧 물 · 🌿 풀 · ⚡ 전기 자리에 잡은 포켓몬 · 반짝인 차례대로 톡 · 다 맞히면 한 마리 더 · 배경 음악 없음)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GAMES, gameById } from '../js/minigame.js';
import { GAME_SONGS } from '../js/gamesong.js';
import { MON_TYPES } from '../js/montypes.js';
import { TYPE_COLOR } from '../js/gamesort.js';
import {
  SIMON_SEC, SIMON_PADS, PAD_HZ, STAND_IN, PAL_RATE, START_LEN, MIN_LEN, LINE_BONUS, MISS_MAX, FIRST_MS, GAP_MS, PAUSE_MS, OOPS_MS, HINT_MS, TAP_MS, IDLE_MS, LAG_MS,
  simonOn, simonAdd, simonFresh, simonPick, simonStart, simonShowEnd, simonTick, simonTap, simonLit, simonShift, simonReplay, simonLag, simonSay, simonLine, runSimon,
} from '../js/gamesimon.js';

const src = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
function seeded(seed = 7) {
  let x = seed >>> 0;
  return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 2 ** 32; };
}
const SEEDS = [1, 7, 42, 2026, 99999, 31337, 5, 777];
const fn = (text, head) => text.slice(text.indexOf(head), text.indexOf('\n}\n', text.indexOf(head)));

// ───────────────────── 목록 · 게임기 화면 연결 ─────────────────────

test('🎮 v346 게임 목록 — 🧠 포켓몬 따라 하기 60초 · 열다섯째 · 설명에 숫자 없음 · 배경 음악 없음(quiet — 곡 목록에도 없음) · 화면·준비 · 저장을 안 만짐', () => {
  assert.deepEqual(GAMES.map((g) => g.id).slice(0, 15), ['dig', 'run', 'shadow', 'pair', 'berry', 'balloon', 'tower', 'tug', 'adv', 'jig', 'throw', 'fish', 'sort', 'diff', 'simon']);
  const g = gameById('simon');
  assert.deepEqual([g.emoji, g.ko, g.sec, !!g.clock, !!g.wide, g.quiet], ['🧠', '포켓몬 따라 하기', SIMON_SEC, false, false, true]);
  assert.equal(SIMON_SEC, 60);
  for (const x of GAMES) assert.ok(!/\d/.test(x.how), `${x.id}: 설명에 숫자 없음`);
  assert.ok(!GAME_SONGS.some((s) => s.games.includes('simon')), '곡 목록에 없음 — 자리마다 제 음이 노래 대신');
  assert.deepEqual(GAMES.filter((x) => x.quiet).map((x) => x.id), ['simon'], 'quiet 게임은 🧠 하나');
  const gv = src('js/gameview.js');
  assert.match(gv, /\n {2}simon: \{ run: runSimon, prep: \(\) => simonPrep\(\), none: '포켓몬 그림이 아직 없어요 — 인터넷이 될 때 다시 해 봐요\.' \},/);
  const sp = fn(gv, 'async function simonPrep(');
  assert.match(sp, /let pads = simonPick\(make\(\), getPartner\(\)\);/, '잡은 포켓몬 먼저 · 파트너');
  assert.match(sp, /Array\.isArray\(MON_TYPES\[p\.id\]\)/, '타입 표에 있는 포켓몬만');
  assert.match(sp, /if \(!have\.has\(STAND_IN\[t\]\)\) want\.push\(STAND_IN\[t\]\);/, '못 채우면 대신할 포켓몬을 받아 봄');
  assert.match(sp, /return pads \? \{ pads \} : null;/, '그래도 못 채우면 판을 안 쓴다');
  // 🎵 quiet — 판 동안 음악을 안 틀고 🎵 단추도 숨긴다 · 끝 화면·고르기 화면에선 다시
  const round = fn(gv, 'async function startRound(');
  assert.match(round, /ui\.quiet = !!g\.quiet;\n {4}syncMusicBtn\(\);/);
  assert.ok(round.includes("tune = g.quiet ? 0 : gameMusicStart(id, typeof run.music === 'function' ? run.music : null);"));
  assert.ok(fn(gv, 'function syncMusicBtn(').includes("b.hidden = !gameMusicAllowed() || (ui.quiet && ui.view === 'play');"));
  for (const head of ['function renderPick(', 'function renderResult(']) assert.match(fn(gv, head), /ui\.view = '(pick|result)';\n {2}syncMusicBtn\(\);/, head);
  assert.ok(!/coins|addCoins|applyPurchase|items\[|xp\.js|db\.js|houseDo/.test(src('js/gamesimon.js')), '저장을 안 만진다');
  const sw = src('sw.js');
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(sw) || [])[1]) >= 346);
  assert.ok(sw.includes("'./js/gamesimon.js'"));
  assert.match(src('js/version.js'), /export const APP_VERSION = 'v(34[6-9]|3[5-9]\d)';/);
  const css = src('css/style.css');
  assert.match(css, /\.gc-grid \{[^}]*width: min\(100%, calc\(\(100vh - 330px\) \* 1\.15\)\);/, '칸 넷은 화면 높이에 맞춰');
  assert.match(css, /\.gc-pad\.is-lit \{[^}]*transform: scale\(1\.04\);/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.gc-pad, \.gc-img \{ transition: none; \}/);
});

// ───────────────────── 🧠 엔진 ─────────────────────

test('🧠 자리 · 음 · 빛나는 동안 — 불꽃·물·풀·전기(🔀 상자와 같은 색) · 도·미·솔·높은 도 · 셋 0.7초 → 한 마리마다 0.05초 짧게 → 0.45초까지', () => {
  assert.deepEqual(SIMON_PADS, ['fire', 'water', 'grass', 'electric']);
  for (const t of SIMON_PADS) assert.ok(TYPE_COLOR[t], t);
  assert.deepEqual(PAD_HZ.map(Math.round), [523, 659, 784, 1047]);
  assert.deepEqual(STAND_IN, { fire: 4, water: 7, grass: 1, electric: 25 });
  for (const t of SIMON_PADS) assert.ok(MON_TYPES[STAND_IN[t]].includes(t), `대신할 포켓몬 ${STAND_IN[t]}는 ${t}`);
  assert.deepEqual([simonOn(3), simonOn(4), simonOn(6), simonOn(8), simonOn(20), simonOn(0), simonOn(NaN)], [700, 650, 550, 450, 450, 700, 700]);
  assert.deepEqual([START_LEN, MIN_LEN, LINE_BONUS, MISS_MAX, IDLE_MS], [3, 3, 2, 2, 8000]);
});

test('🧠 줄 — 처음 셋 · 한 마리씩 늘 때 앞 줄 그대로 · 같은 자리가 셋 잇달아 안 나옴(씨앗 여덟 × 2000) · 자리는 0~3', () => {
  for (const seed of SEEDS) {
    const rng = seeded(seed);
    let seq = simonFresh(START_LEN, rng);
    assert.equal(seq.length, 3);
    for (let k = 0; k < 2000; k++) {
      const next = simonAdd(seq, rng);
      assert.deepEqual(next.slice(0, seq.length), seq, '앞 줄 그대로');
      seq = next.length > 30 ? simonFresh(3, rng) : next;
      for (let i = 2; i < seq.length; i++) assert.ok(!(seq[i] === seq[i - 1] && seq[i] === seq[i - 2]), '셋 잇달아 없음');
      assert.ok(seq.every((p) => Number.isInteger(p) && p >= 0 && p < 4));
    }
  }
  // rng가 늘 같은 자리를 내도 셋째는 다른 자리
  assert.deepEqual(simonAdd([2, 2], () => 0.6), [2, 2, 3]);
  assert.deepEqual(simonFresh(5, () => 0), [0, 0, 1, 0, 0]);
});

const P = (id, types, mine = false) => ({ id, ko: `p${id}`, url: `blob:${id}`, types, mine });

test('🧠 자리 포켓몬 고르기(simonPick) — 잡은 포켓몬(첫 타입 → 둘째 타입) → 앱 포켓몬 · 파트너는 반쯤 · 한 포켓몬은 한 자리 · 못 채우면 null', () => {
  const list = [
    P(4, ['fire']), P(6, ['fire', 'flying'], true), P(126, ['fire']),
    P(658, ['water', 'dark'], true), P(7, ['water'], true), P(170, ['water', 'electric'], true), // 랜턴 — 첫 타입이 물
    P(1, ['grass', 'poison']), P(3, ['grass', 'poison'], true), P(45, ['grass', 'poison']),
    P(25, ['electric']), P(26, ['electric'], true),
  ];
  let pal = 0;
  for (let k = 0; k < 2000; k++) {
    const r = simonPick(list, 658, seeded(k + 1));
    assert.deepEqual(r.map((x) => x.type), SIMON_PADS);
    assert.equal(new Set(r.map((x) => x.id)).size, 4, '한 포켓몬은 한 자리');
    assert.equal(r[0].id, 6, '불꽃 — 잡은 리자몽 (잡지 않은 파이리·마그마보다 먼저)');
    assert.ok([658, 7, 170].includes(r[1].id), '물 — 첫 타입이 물인 잡은 포켓몬');
    assert.equal(r[2].id, 3, '풀 — 잡은 이상해꽃');
    assert.equal(r[3].id, 26, '전기 — 잡은 라이츄 (랜턴은 첫 타입이 물이라 뒤 · 물 자리에 쓰였으면 아예 못 옴)');
    assert.ok(r.every((x) => x.url && x.ko));
    if (r[1].id === 658) pal += 1;
  }
  const expect = 2000 * (PAL_RATE + (1 - PAL_RATE) / 3);
  assert.ok(Math.abs(pal - expect) < expect * 0.1, `파트너가 물 자리 ${pal}/2000 (반 + 나머지 반에서 셋 중 하나 ≈ ${Math.round(expect)})`);
  assert.equal(PAL_RATE, 0.5);
  // 잡은 포켓몬이 없으면 앱 포켓몬(첫 타입이 맞는 것 먼저) · 랜턴은 물 자리에 쓰였으면 전기 자리엔 못 감
  const app = simonPick([P(4, ['fire']), P(170, ['water', 'electric']), P(1, ['grass', 'poison']), P(25, ['electric'])], 0, seeded(3));
  assert.deepEqual(app.map((x) => x.id), [4, 170, 1, 25]);
  assert.equal(simonPick([P(4, ['fire']), P(170, ['water', 'electric']), P(1, ['grass'])], 0, seeded(3)), null, '전기 자리를 못 채움 (랜턴은 물 자리에 이미)');
  // 파트너가 그 타입이 아니면 · 잡지 않은 파트너 번호면 쓰지 않음
  assert.equal(simonPick([P(4, ['fire']), P(7, ['water']), P(658, ['water', 'dark']), P(1, ['grass']), P(25, ['electric'])], 658, () => 0)[1].id, 7, '잡지 않은 개굴닌자는 파트너로 안 셈');
  // 깨진 값은 뺌
  assert.equal(simonPick([null, { id: 4, types: ['fire'] }, P('x', ['water']), P(1, ['grass']), P(25, ['electric']), P(7, null)], 0), null);
  assert.equal(simonPick(null, 0), null);
});

/** 시계를 dt씩 굴리며 따라 할 차례가 올 때까지 */
function toInput(s, t, dt = 10) {
  while (s.phase !== 'input' && t < s.end) { t += dt; simonTick(s, t); }
  return t;
}

test('🧠 한 줄 — 「잘 봐!」 0.9초 뒤 셋이 0.95초마다 반짝(빛남 0.7초) → 따라 할 차례 · 맞으면 ⭐1씩 · 줄 끝 ⭐2 더 · 한 마리 늘림(앞 줄 그대로) · 0.8초 뒤 다시 보여 줌', () => {
  const rng = seeded(11);
  const s = simonStart(1000, rng);
  const seq0 = s.seq.slice();
  assert.deepEqual([s.phase, s.seq.length, simonSay(s)], ['wait', 3, '잘 봐!']);
  const ev0 = simonTick(s, 1000 + FIRST_MS - 1);
  assert.deepEqual([s.phase, ev0.flashes.length], ['wait', 0]);
  const ev1 = simonTick(s, 1000 + FIRST_MS);
  assert.deepEqual([s.phase, ev1.flashes], ['show', [{ pad: seq0[0], at: 1900 }]], '첫 반짝은 바로');
  assert.deepEqual(simonLit(s, 1900), { pad: seq0[0], kind: 'show' });
  assert.equal(simonLit(s, 1900 + 699).pad, seq0[0]);
  assert.equal(simonLit(s, 1900 + 700), null, '반짝 사이');
  assert.equal(simonLit(s, 1900 + 950).pad, seq0[1]);
  const ev2 = simonTick(s, 1900 + 950 * 2);
  assert.deepEqual(ev2.flashes.map((f) => [f.pad, f.at]), [[seq0[1], 2850], [seq0[2], 3800]], '지나간 반짝도 차례로');
  assert.equal(simonTap(s, seq0[0], 3850, rng).kind, 'none', '보여 주는 동안은 안 셈');
  assert.equal(simonShowEnd(s), 1900 + 3 * 950 - GAP_MS);
  const ev3 = simonTick(s, simonShowEnd(s));
  assert.deepEqual([ev3.input, s.phase, s.turn, simonSay(s)], [true, 'input', 1, '따라 해 봐!']);
  const t0 = simonShowEnd(s);
  assert.deepEqual(simonTap(s, seq0[0], t0 + 400, rng), { kind: 'right', pad: seq0[0], pts: 1 });
  assert.deepEqual(simonLit(s, t0 + 400), { pad: seq0[0], kind: 'tap' });
  assert.equal(simonLit(s, t0 + 400 + TAP_MS), null);
  assert.equal(simonTap(s, seq0[1], t0 + 800, rng).pts, 1);
  const r = simonTap(s, seq0[2], t0 + 1200, rng);
  assert.deepEqual(r, { kind: 'line', pad: seq0[2], pts: 1 + LINE_BONUS, len: 3 });
  assert.deepEqual([s.score, s.lines, s.best, s.right, s.wrong], [5, 1, 3, 3, 0]);
  assert.equal(s.seq.length, 4);
  assert.deepEqual(s.seq.slice(0, 3), seq0, '앞 줄 그대로 + 하나');
  assert.deepEqual([s.phase, simonSay(s)], ['wait', '잘했어! 이번엔 4마리']);
  simonTick(s, t0 + 1200 + PAUSE_MS);
  assert.deepEqual([s.phase, simonSay(s), s.step], ['show', '잘 봐!', 0], '0.8초 뒤 넷을 보여 줌');
  assert.equal(simonShowEnd(s) - s.at, 4 * (simonOn(4) + GAP_MS) - GAP_MS, '넷은 조금 빨리');
});

test('🧠 틀림 — 감점 없음 · 맞는 자리를 0.7초 · 1.1초 뒤 같은 줄을 처음부터 · 다시 볼 때 이미 ⭐를 받은 자리는 0 · 같은 줄에서 두 번이면 한 마리 줄인 새 줄(셋 아래로는 안 줄임)', () => {
  const rng = seeded(5);
  const s = simonStart(0, rng);
  let t = toInput(s, 0);
  const seq0 = s.seq.slice();
  simonTap(s, seq0[0], t += 300, rng);
  const bad = (seq0[1] + 1) % 4;
  const w1 = simonTap(s, bad, t += 300, rng);
  assert.deepEqual(w1, { kind: 'wrong', pad: bad, want: seq0[1], shorter: false });
  assert.deepEqual([s.score, s.wrong, s.misses, s.phase, simonSay(s)], [1, 1, 1, 'oops', '앗! 다시 볼까?'], '감점 없음');
  assert.deepEqual(simonLit(s, t + 10), { pad: seq0[1], kind: 'hint' }, '맞는 포켓몬을 살짝');
  assert.equal(simonLit(s, t + HINT_MS), null);
  simonTick(s, t + OOPS_MS - 1);
  assert.equal(s.phase, 'oops');
  simonTick(s, t + OOPS_MS);
  assert.deepEqual([s.phase, s.seq, s.step], ['show', seq0, 0], '같은 줄을 처음부터');
  t = toInput(s, t + OOPS_MS);
  assert.equal(simonTap(s, seq0[0], t += 300, rng).pts, 0, '이미 ⭐를 받은 자리');
  assert.equal(simonTap(s, seq0[1], t += 300, rng).pts, 1, '처음 맞힌 자리');
  // 두 번째 틀림(같은 줄) — 셋은 더 안 줄고 새 줄 · 틀린 수는 새로
  const w2 = simonTap(s, (seq0[2] + 1) % 4, t += 300, rng);
  assert.deepEqual([w2.kind, w2.shorter, s.seq.length, s.misses, s.paid, simonSay(s)], ['wrong', true, 3, 0, 0, '앗! 한 마리 줄여서 다시 볼까?']);
  // 다섯 마리 줄에서 두 번 틀리면 넷
  const f = simonStart(0, rng);
  f.seq = [0, 1, 2, 3, 0];
  let u = toInput(f, 0);
  simonTap(f, 3, u += 300, rng);
  u = toInput(f, u + OOPS_MS);
  const w3 = simonTap(f, 3, u += 300, rng);
  assert.deepEqual([w3.shorter, f.seq.length, f.shorter], [true, 4, 1]);
  // 틀릴수록 ⭐가 늘지 않는다 — 넷짜리 줄을 한 번에 vs 끝에서 한 번 틀린 뒤
  const lineStars = (slipAt) => {
    const q = simonStart(0, seeded(9));
    q.seq = [0, 1, 2, 3];
    let v = toInput(q, 0);
    if (slipAt >= 0) {
      for (let i = 0; i < slipAt; i++) simonTap(q, q.seq[i], v += 300, seeded(1));
      simonTap(q, (q.seq[slipAt] + 1) % 4, v += 300, seeded(1));
      v = toInput(q, v + OOPS_MS);
    }
    for (let i = 0; i < 4; i++) simonTap(q, q.seq[i], v += 300, seeded(1));
    return q.score;
  };
  assert.equal(lineStars(-1), 4 + LINE_BONUS);
  assert.equal(lineStars(3), 4 + LINE_BONUS, '끝에서 틀렸다 다시 해도 같은 ⭐');
  assert.equal(lineStars(1), 4 + LINE_BONUS);
});

test('🧠 안 누르면 — 8초 뒤 같은 줄을 한 번 더(처음부터 · 받은 ⭐는 그대로) · 차례 번호(turn)가 바뀜 · 없는 자리·차례 아님·끝난 뒤', () => {
  const rng = seeded(8);
  const s = simonStart(0, rng);
  let t = toInput(s, 0);
  const seq0 = s.seq.slice();
  simonTap(s, seq0[0], t += 500, rng);
  const turn = s.turn;
  assert.equal(simonTick(s, t + IDLE_MS - 1).replay, false);
  const ev = simonTick(s, t + IDLE_MS);
  assert.deepEqual([ev.replay, s.phase, s.step, s.replays, simonSay(s)], [true, 'show', 0, 1, '한 번 더 볼게요 — 잘 봐!']);
  assert.deepEqual(ev.flashes.map((f) => f.pad), [seq0[0]], '다시 보여 주기의 첫 반짝');
  t = toInput(s, t + IDLE_MS);
  assert.equal(s.turn, turn + 1, '새 차례');
  assert.equal(simonTap(s, seq0[0], t += 300, rng).pts, 0, '받은 ⭐는 다시 안 줌');
  assert.equal(simonTap(s, 4, t, rng).kind, 'none');
  assert.equal(simonTap(s, -1, t, rng).kind, 'none');
  assert.equal(simonTap(s, 1.5, t, rng).kind, 'none');
  assert.equal(simonTap(s, seq0[1], s.end, rng).kind, 'over');
  simonTick(s, s.end + 99999);
  assert.equal(s.last, s.end, '시계는 끝을 안 넘음');
});

test('🧠 앱을 내렸다 돌아오면 — 시간·빛남이 그대로 밀리고(simonShift) · 보던 줄·따라 하던 줄은 처음부터 다시 보여 줌(simonReplay) · 틈(잘했어·앗)은 그대로', () => {
  const rng = seeded(4);
  const s = simonStart(0, rng);
  let t = toInput(s, 0);
  simonTap(s, s.seq[0], t += 200, rng);
  const before = { end: s.end, idle: s.idleAt, tap: s.tapUntil };
  simonShift(s, 5000);
  assert.deepEqual([s.end, s.idleAt, s.tapUntil], [before.end + 5000, before.idle + 5000, before.tap + 5000]);
  const b = JSON.stringify(s);
  simonShift(s, 0); simonShift(s, -3); simonShift(s, NaN);
  assert.equal(JSON.stringify(s), b);
  assert.equal(simonReplay(s, t + 5000), true);
  assert.deepEqual([s.phase, s.step, s.at, simonSay(s)], ['show', 0, t + 5000, '한 번 더 볼게요 — 잘 봐!']);
  const w = simonStart(0, rng);
  assert.equal(simonReplay(w, 10), false, '처음 틈(wait)은 그대로');
  assert.equal(w.phase, 'wait');
});

test('🧠 화면이 멈췄다 오면(simonLag · 🔍 Codex 150차 #1) — 0.2초 넘게 멈춘 사이 보여 주는 중이었거나 · 보여 주기가 시작됐어야 했거나 · 안 눌러 다시 보여 줄 때가 지났으면 그 자리에서 줄을 처음부터 · 아니면 그대로', () => {
  assert.ok(LAG_MS < GAP_MS, '가장 짧은 틈(같은 칸 두 번 사이)보다 짧게');
  const rng = seeded(12);
  // 보여 주는 중 0.3초 멈춤 — 같은 칸 두 번 사이 0.25초 틈을 통째로 건너뛸 수 있다 → 처음부터
  const s = simonStart(0, rng);
  simonTick(s, FIRST_MS);
  simonTick(s, FIRST_MS + 100);
  assert.equal(simonLag(s, FIRST_MS + 100 + LAG_MS), false, '0.2초까지는 그대로');
  assert.equal(simonLag(s, FIRST_MS + 400), true);
  assert.deepEqual([s.phase, s.at, s.step, s.why, s.lags, s.last], ['show', 1300, 0, 'back', 1, 1300]);
  assert.deepEqual(simonTick(s, 1300).flashes.map((f) => f.at), [1300], '첫 반짝부터 다시 (밀린 소리를 한꺼번에 안 냄)');
  assert.equal(simonSay(s), '한 번 더 볼게요 — 잘 봐!');
  // 따라 할 차례로 넘어갈 만큼 멈춰도 — 「따라 해 봐!」가 아니라 다시 보여 주기
  const b = simonStart(0, rng);
  simonTick(b, FIRST_MS);
  assert.equal(simonLag(b, FIRST_MS + 5000), true);
  simonTick(b, FIRST_MS + 5000);
  assert.equal(b.phase, 'show', '못 본 줄로 따라 하기가 되지 않음');
  // 틈(잘 봐 · 잘했어 · 앗)이 멈춘 사이 끝났으면 — 보여 주기는 멈춤이 끝난 때부터 (첫 반짝을 못 그린 채 지나가지 않게)
  const w = simonStart(0, rng);
  assert.equal(simonLag(w, 500), false, '틈이 아직 안 끝남');
  assert.equal(simonLag(w, 3000), true);
  assert.deepEqual([w.phase, w.at, w.why], ['show', 3000, 'first'], '「잘 봐!」 그대로');
  // 따라 할 차례 — 멈춘 사이 8초가 지났으면 다시 보여 주기(안 누른 셈) · 아니면 그대로
  const p = simonStart(0, rng);
  const t = toInput(p, 0);
  assert.equal(simonLag(p, t + 3000), false, '따라 하는 중 3초 멈춤은 그대로');
  assert.equal(p.phase, 'input');
  assert.equal(simonLag(p, t + IDLE_MS + 4000), true);
  assert.deepEqual([p.phase, p.why, p.replays, p.at], ['show', 'idle', 1, t + IDLE_MS + 4000]);
  // 끝난 뒤의 멈춤 — 판 끝을 넘지 않는다
  const e = simonStart(0, rng);
  simonTick(e, FIRST_MS);
  assert.equal(simonLag(e, e.end + 9999), true);
  assert.equal(e.at, e.end);
});

test('🧠 60초 한 판(가짜 시계 · 씨앗 여덟) — 잘 기억하는 손 > 덜 기억하는 손 > 아무 데나 · 빠른 손 > 느린 손 · 점수 = 받은 ⭐ 합 · 시계는 끝을 안 넘음', () => {
  const play = (seed, { react, cap, err, random = false }) => {
    const rng = seeded(seed);
    const me = seeded(seed + 101);
    const s = simonStart(0, rng);
    let t = 0;
    let nextTap = Infinity;
    let slip = -1;
    let turn = -1;
    let sum = 0;
    while (t < s.end) {
      t += 10;
      simonTick(s, t);
      if (s.phase === 'input' && s.turn !== turn) {
        turn = s.turn;
        nextTap = t + react + 300;
        slip = s.seq.length > cap && me() < err ? Math.floor(me() * s.seq.length) : -1;
      }
      if (s.phase === 'input' && t >= nextTap) {
        const want = s.seq[s.step];
        const pad = random ? Math.floor(me() * 4) : s.step === slip ? (want + 1) % 4 : want;
        const r = simonTap(s, pad, t, rng);
        if (r.pts) sum += r.pts;
        nextTap = t + react * (0.8 + 0.4 * me());
      }
    }
    assert.equal(s.score, sum);
    assert.equal(s.last, s.end);
    return s;
  };
  const tot = (k) => SEEDS.reduce((a, seed) => a + play(seed, k).score, 0);
  const best = (k) => SEEDS.reduce((a, seed) => a + play(seed, k).best, 0) / SEEDS.length;
  const big = tot({ react: 500, cap: 7, err: 0.7 });
  const small = tot({ react: 500, cap: 5, err: 0.7 });
  const slow = tot({ react: 800, cap: 5, err: 0.7 });
  const rand = tot({ react: 500, cap: 9, err: 0, random: true });
  assert.ok(big > small && small > slow && slow > rand, `기억 일곱 ${big} · 다섯 ${small} · 느린 손 ${slow} · 아무 데나 ${rand}`);
  assert.ok(best({ react: 500, cap: 7, err: 0.7 }) >= 7, '잘 기억하면 일곱 마리 넘게');
  assert.ok(best({ react: 800, cap: 4, err: 0.8 }) >= 3, '덜 기억해도 셋은 끝냄');
  assert.ok(big / SEEDS.length < 70, `한 판 ⭐ 다른 게임과 비슷하게 (${big / SEEDS.length})`);
});

test('🧠 끝 화면 한 줄 — 「🧠 가장 긴 줄 5마리」 · 한 줄도 못 끝냈으면 없음', () => {
  assert.equal(simonLine(5), '🧠 가장 긴 줄 5마리');
  assert.equal(simonLine(3), '🧠 가장 긴 줄 3마리');
  assert.deepEqual([simonLine(0), simonLine(2), simonLine(NaN), simonLine(undefined)], ['', '', '', '']);
});

// ───────────────────── 화면 (가짜 화면 · 가짜 시계) ─────────────────────

class FakeEl {
  constructor(tag) { this.tagName = String(tag).toUpperCase(); this.className = ''; this.children = []; this.listeners = {}; this.style = { setProperty(k, v) { this[k] = v; } }; this.attrs = {}; this.dataset = {}; this.textContent = ''; this.html = ''; this.disabled = false; }
  get classList() {
    const list = () => this.className.split(/\s+/).filter(Boolean);
    const set = (a) => { this.className = a.join(' '); };
    return {
      add: (...c) => set([...new Set([...list(), ...c])]),
      remove: (...c) => set(list().filter((x) => !c.includes(x))),
      toggle: (c, on) => { const want = on === undefined ? !list().includes(c) : !!on; set(want ? [...new Set([...list(), c])] : list().filter((x) => x !== c)); return want; },
      contains: (c) => list().includes(c),
    };
  }
  set innerHTML(v) { this.html = String(v); this.children = []; }
  get innerHTML() { return this.html; }
  get offsetWidth() { return 100; }
  appendChild(c) { this.children.push(c); c.parent = this; return c; }
  append(...cs) { for (const c of cs) this.appendChild(c); }
  setAttribute(k, v) { this.attrs[k] = v; }
  addEventListener(type, f) { (this.listeners[type] ||= []).push(f); }
  fire(type, extra = {}) { for (const f of this.listeners[type] || []) f({ preventDefault() {}, ...extra }); }
  getBoundingClientRect() { return { left: 0, top: 0, right: 100, bottom: 70, width: 100, height: 70 }; }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((x) => x !== this); }
}
function world(t, make) {
  const doc = { hidden: false, listeners: {}, createElement: (tag) => new FakeEl(tag),
    addEventListener(type, f) { (this.listeners[type] ||= []).push(f); },
    removeEventListener(type, f) { this.listeners[type] = (this.listeners[type] || []).filter((x) => x !== f); },
    fire(type, ev) { for (const f of [...(this.listeners[type] || [])]) f(ev); } };
  let clock = 1000;
  const realPerf = globalThis.performance;
  Object.defineProperty(globalThis, 'performance', { value: { now: () => clock }, configurable: true, writable: true });
  globalThis.document = doc;
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  t.after(() => { Object.defineProperty(globalThis, 'performance', { value: realPerf, configurable: true, writable: true }); delete globalThis.document; });
  const stage = new FakeEl('div');
  const h = make(stage);
  const st = { over: null };
  h.done.then((r) => { st.over = r; });
  const adv = (ms) => { for (let k = 0; k < ms; k += 50) { clock += 50; t.mock.timers.tick(50); } };
  /** 시각만 간다 — 화면(프레임)이 밀린 동안처럼 시계(loop)는 안 돈다 */
  const jump = (ms) => { clock += ms; };
  const flush = () => new Promise((r) => setImmediate(r));
  const hide = (on) => { doc.hidden = on; doc.fire('visibilitychange'); };
  return { stage, h, doc, adv, jump, flush, st, hide };
}
const PADS = [{ type: 'fire', id: 6, ko: '리자몽', url: 'blob:6' }, { type: 'water', id: 658, ko: '개굴닌자', url: 'blob:658' }, { type: 'grass', id: 3, ko: '이상해꽃', url: 'blob:3' }, { type: 'electric', id: 25, ko: '피카츄', url: 'blob:25' }];

function simonScreen(w) {
  const root = w.stage.children[0];
  const [top, say, dots, grid, hint, fx, banner] = root.children;
  const pads = grid.children;
  const litNow = () => pads.findIndex((b) => b.classList.contains('is-lit'));
  /** 보여 주기를 끝까지 보며 반짝인 차례를 적는다 (사람처럼 — 따라 할 차례가 올 때까지 · 누른 칸의 빛은 보여 주기가 아니라 안 셈) */
  const watch = () => {
    const seq = [];
    let prev = -1;
    const look = () => {
      const p = root.dataset.phase === 'show' ? litNow() : -1;
      if (p >= 0 && p !== prev) seq.push(p);
      prev = p;
    };
    look();
    for (let k = 0; k < 600 && !root.classList.contains('is-input'); k++) { w.adv(50); look(); }
    return seq;
  };
  const score = () => top.children[0].textContent;
  return { root, top, say, dots, grid, hint, fx, banner, pads, litNow, watch, score };
}

test('🧠 화면 — 「준비!」 뒤 칸 넷(포켓몬 그림·이름 · 타입 색 · 풀·전기는 진한 글씨) · 반짝인 차례 보고 톡 → ⭐ · 줄 끝 「+3 잘했어!」 · 넷째 줄 · 틀리면 흔들림·맞는 칸 살짝(감점 없음) · ⌨️ 1~4 · 끝 화면 한 줄 · 듣기를 뗀다', async (t) => {
  const w = world(t, (stage) => runSimon(stage, { rng: seeded(3), pads: PADS }));
  const g = simonScreen(w);
  assert.equal(g.banner.textContent, '준비!');
  assert.equal(g.hint.textContent, '포켓몬이 반짝인 차례대로 톡! (숫자 1·2·3·4도 돼요)');
  assert.deepEqual(g.pads.map((b) => b.children[1].textContent), ['리자몽', '개굴닌자', '이상해꽃', '피카츄']);
  assert.deepEqual(g.pads.map((b) => b.style.backgroundColor), SIMON_PADS.map((x) => TYPE_COLOR[x]));
  assert.deepEqual(g.pads.map((b) => b.className.includes('is-dark')), [false, false, true, true]);
  assert.equal(g.pads[1].attrs['aria-label'], '개굴닌자 (물)');
  assert.equal(g.pads[0].children[0].children[0].src, 'blob:6');
  w.adv(800);
  assert.ok(g.root.classList.contains('is-go') && g.root.classList.contains('is-show'));
  assert.equal(g.say.textContent, '잘 봐!');
  g.pads[0].fire('pointerdown'); // 보여 주기 전·도중엔 안 셈
  const seq1 = g.watch();
  assert.equal(seq1.length, 3, `반짝 셋 ${seq1}`);
  assert.equal(g.score(), '⭐ 0', '보여 주는 동안 누른 것은 안 셈');
  assert.equal(g.say.textContent, '따라 해 봐!');
  assert.equal(g.dots.children.length, 3);
  g.pads[seq1[0]].fire('pointerdown');
  assert.equal(g.score(), '⭐ 1');
  assert.ok(g.pads[seq1[0]].classList.contains('is-lit'), '누른 칸이 빛남');
  assert.equal(g.dots.children.filter((d) => d.className === 'is-on').length, 1, '● ○ ○');
  w.doc.fire('keydown', { key: String(seq1[1] + 1), preventDefault() {} }); // ⌨️ 숫자
  assert.equal(g.score(), '⭐ 2');
  g.pads[seq1[2]].fire('click', { detail: 0 }); // ⌨️ Enter
  assert.equal(g.score(), '⭐ 5', '줄 끝 ⭐2 더');
  assert.ok(g.fx.children.some((f) => f.textContent === '+3 잘했어!'));
  assert.equal(g.say.textContent, '잘했어! 이번엔 4마리');
  g.pads[0].fire('click', { detail: 1 }); // 손가락 뒤의 click은 안 셈
  const seq2 = g.watch();
  assert.equal(seq2.length, 4);
  assert.deepEqual(seq2.slice(0, 3), seq1, '앞 줄 그대로 + 하나');
  // 틀림 — 둘째 칸에서
  g.pads[seq2[0]].fire('pointerdown');
  const bad = (seq2[1] + 1) % 4;
  g.pads[bad].fire('pointerdown');
  assert.equal(g.score(), '⭐ 6', '틀려도 그대로');
  assert.ok(g.pads[bad].classList.contains('is-no'), '누른 칸이 흔들림');
  assert.ok(g.pads[seq2[1]].classList.contains('is-hint'), '맞는 칸을 살짝');
  assert.equal(g.say.textContent, '앗! 다시 볼까?');
  w.adv(HINT_MS);
  assert.ok(!g.pads[seq2[1]].classList.contains('is-hint'));
  const seq3 = g.watch();
  assert.deepEqual(seq3, seq2, '같은 줄을 처음부터');
  for (const p of seq3) g.pads[p].fire('pointerdown');
  assert.equal(g.score(), '⭐ 11', '앞 칸은 이미 받음 — 셋(둘째부터 넷째) + 2');
  w.adv(SIMON_SEC * 1000);
  await w.flush();
  assert.deepEqual(w.st.over, { score: 11, quit: false, line: '🧠 가장 긴 줄 4마리' });
  for (const ty of ['visibilitychange', 'keydown']) assert.equal((w.doc.listeners[ty] || []).length, 0, ty);
  assert.ok(g.pads.every((b) => b.disabled && !b.classList.contains('is-lit')));
});

test('🧠 화면 — 앱을 내린 동안 멈춤(눌러도 안 셈) · 돌아오면 지금 줄을 처음부터 다시 보여 줌 · 화면이 밀린 사이 차례가 넘어갔으면(안 눌러 다시 보여 주기) 그 손길은 안 셈 · 그만두면 quit · 「끝!」 중 그만두면 바로 한 번', async (t) => {
  const w = world(t, (stage) => runSimon(stage, { rng: seeded(6), pads: PADS }));
  const g = simonScreen(w);
  w.adv(800);
  const seq1 = g.watch();
  g.pads[seq1[0]].fire('pointerdown');
  assert.equal(g.score(), '⭐ 1');
  w.hide(true);
  assert.ok(g.root.classList.contains('is-paused'));
  g.pads[seq1[1]].fire('pointerdown');
  w.adv(90000);
  await w.flush();
  assert.deepEqual([w.st.over, g.score()], [null, '⭐ 1'], '숨은 동안 안 끝남 · 안 셈');
  w.hide(false);
  assert.ok(!g.root.classList.contains('is-paused'));
  assert.equal(g.say.textContent, '한 번 더 볼게요 — 잘 봐!');
  const again = g.watch();
  assert.deepEqual(again, seq1, '같은 줄을 처음부터');
  // 화면이 밀림 — 따라 할 차례에 시각만 8초 넘게 → 안 누른 셈으로 다시 보여 주기 → 그 사이의 톡은 안 셈
  w.jump(IDLE_MS + 300);
  g.pads[seq1[0]].fire('pointerdown');
  assert.equal(g.score(), '⭐ 1', '밀린 사이 넘어간 차례의 톡은 안 셈');
  assert.ok(g.root.classList.contains('is-show'));
  assert.equal(g.say.textContent, '한 번 더 볼게요 — 잘 봐!');
  // 보여 주는 중에 시각만 따라 할 차례를 지나도(🔍 Codex 150차 #1) — 「따라 해 봐!」가 아니라 처음부터 다시 · 그 톡은 안 셈
  w.jump(5000);
  g.pads[seq1[0]].fire('pointerdown');
  assert.equal(g.score(), '⭐ 1', '보여 주는 동안 누른 톡은 안 셈');
  assert.equal(g.root.dataset.phase, 'show', '못 본 줄로 따라 하기가 안 됨');
  assert.equal(g.dots.children.filter((d) => d.className === 'is-on').length, 0, '● 하나도 안 채움');
  assert.deepEqual(g.watch(), seq1, '다시 처음부터 다 봄');
  // ✕ 그만둠
  w.h.stop();
  await w.flush();
  assert.deepEqual(w.st.over, { score: 1, quit: true, line: '' });
});

test('🧠 화면 — 보여 주는 중 화면이 멈췄다 오면(2초 · 0.3초) 그 줄을 처음부터 다시 · 다 보기 전엔 「따라 해 봐!」가 안 됨 · 꾹 누른 숫자 키의 자동 반복은 안 셈 (🔍 Codex 150차 #1·#2)', async (t) => {
  const w = world(t, (stage) => runSimon(stage, { rng: seeded(3), pads: PADS }));
  const g = simonScreen(w);
  w.adv(800 + FIRST_MS + 50); // 첫 반짝이 켜진 때
  assert.equal(g.root.dataset.phase, 'show');
  const first = g.litNow();
  assert.ok(first >= 0);
  w.jump(2000); // 2초 멈춤 — 둘째·셋째 반짝을 못 그림
  w.adv(50);
  assert.equal(g.root.dataset.phase, 'show', '못 본 줄로 따라 하기가 안 됨');
  assert.equal(g.say.textContent, '한 번 더 볼게요 — 잘 봐!');
  const seq = g.watch();
  assert.equal(seq.length, 3, `셋을 처음부터 다 봄 ${seq}`);
  assert.equal(seq[0], first);
  for (const p of seq) g.pads[p].fire('pointerdown');
  assert.equal(g.score(), '⭐ 5');
  // 다음 줄 — 첫 반짝 뒤 0.3초 멈춤(같은 칸 두 번 사이 틈을 건너뛸 만큼)
  for (let k = 0; k < 60 && !(g.root.dataset.phase === 'show' && g.litNow() >= 0); k++) w.adv(50); // 누른 칸의 빛은 말고 보여 주기의 첫 반짝
  assert.equal(g.root.dataset.phase, 'show');
  w.jump(300);
  w.adv(50);
  assert.equal(g.say.textContent, '한 번 더 볼게요 — 잘 봐!');
  const seq2 = g.watch();
  assert.equal(seq2.length, 4);
  assert.deepEqual(seq2.slice(0, 3), seq);
  // ⌨️ 꾹 누르면 — 처음 한 번만 · 자동 반복(repeat)은 안 셈
  w.doc.fire('keydown', { key: String(seq2[0] + 1), preventDefault() {} });
  assert.equal(g.score(), '⭐ 6');
  for (const k of [seq2[0], seq2[1], (seq2[1] + 1) % 4]) w.doc.fire('keydown', { key: String(k + 1), repeat: true, preventDefault() {} });
  assert.equal(g.score(), '⭐ 6', '자동 반복은 안 셈');
  assert.equal(g.root.dataset.phase, 'input', '틀린 것으로도 안 셈');
  assert.equal(g.dots.children.filter((d) => d.className === 'is-on').length, 1, '● 하나 그대로');
  w.h.stop();
  await w.flush();
});

test('🧠 화면 — 마지막 반짝 끝 무렵에 누른 톡은(화면엔 아직 「잘 봐!」) 그사이 시작된 「따라 해 봐!」의 첫 칸으로 안 셈', async (t) => {
  const w = world(t, (stage) => runSimon(stage, { rng: seeded(9), pads: PADS }));
  const g = simonScreen(w);
  w.adv(800);
  let n = 0;
  let prev = -1;
  let seq0 = -1;
  for (let k = 0; k < 200 && n < 3; k++) { // 셋째 반짝이 켜질 때까지
    w.adv(50);
    const p = g.root.dataset.phase === 'show' ? g.litNow() : -1;
    if (p >= 0 && p !== prev) { n += 1; if (n === 1) seq0 = p; }
    prev = p;
  }
  assert.equal(n, 3);
  w.adv(550); // 셋째 반짝 0.6초쯤 — 아직 보여 주는 중
  assert.equal(g.root.dataset.phase, 'show');
  w.jump(150); // 0.15초(멈춤 문턱 아래) 뒤 누름 — 그 사이 보여 주기가 끝남
  g.pads[seq0].fire('pointerdown');
  assert.equal(g.root.dataset.phase, 'input', '따라 할 차례는 시작됨');
  assert.equal(g.score(), '⭐ 0', '보여 주는 동안의 손길은 안 셈');
  assert.equal(g.dots.children.filter((d) => d.className === 'is-on').length, 0);
  w.h.stop();
  await w.flush();
});

test('🧠 화면 — 「끝!」을 보여 주는 동안 그만두면 기다리지 않고 바로 한 번 · 배경 음악 없음', async (t) => {
  const w2 = world(t, (stage) => runSimon(stage, { rng: seeded(6), pads: PADS }));
  w2.adv(800 + SIMON_SEC * 1000);
  assert.equal(w2.stage.children[0].children[6].textContent, '끝!');
  await w2.flush();
  assert.equal(w2.st.over, null, '아직 「끝!」을 보여 주는 중');
  w2.h.stop();
  await w2.flush();
  assert.deepEqual(w2.st.over, { score: 0, quit: false, line: '' }, '기다리지 않고 바로');
  assert.equal(w2.h.music(), 'stop', '배경 음악 없음');
});
