// 🖼️ 포켓몬 그림 맞추기 (v339 · 2026-10-25 아버님 "퍼즐을 포켓몬스터들로 20피스 정도 나눠놓고 맞추는 게임" → 기본안 "이대로") — node --test tests/minigame339.test.js
// 잡은 포켓몬 셋 가운데 고르기 · 5×4 = 20조각(볼록·오목 — 이웃끼리 딱 맞는 선) · 제자리 가까이면 딸깍(⭐1) · 틀린 곳은 그 자리 · 시간 제한 없음 ·
// 다 맞추면 걸린 시간 → 가장 빠른 시간이 최고 기록(homeplay fast · 병합은 작은 쪽) · 「어떤 포켓몬?」에서 그만두면 판을 돌려받음
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GAMES, gameById, clockText } from '../js/minigame.js';
import {
  JIG_COLS, JIG_ROWS, JIG_N, JIG_CHOICES, JIG_SEC, CELL_W, CELL_H, BOARD_X, BOARD_Y, TAB, SNAP, BIG_WAIT_MS, KNOB_OUT,
  X_MIN, X_MAX, Y_MIN, Y_MAX, TYPE_COLOR,
  jigChoices, jigShapes, jigSlots, jigStart, jigNear, jigMove, jigSec, jigDrop, jigShift, edgeOps, jigPath, mixColor, runJig,
} from '../js/gamejig.js';
import { resultLines } from '../js/gameview.js';
import { playOf, copyPlay, mergePlay, fastOf, bestOf, gameEndRule, FAST_MAX } from '../js/homeplay.js';
import { songFor } from '../js/gamesong.js';
import { LOOK_BASE } from '../js/avatar.js';
import { FIRST_ROOM } from '../js/house.js';
import { emptyProfile, cloneProfile } from '../js/db.js';
import { initProfile, flushProfile, reloadProfile, gameEnd, gameFast, gameBest, getProfileSnapshot } from '../js/xp.js';

const src = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
function seeded(seed = 7) {
  let x = seed >>> 0;
  return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 2 ** 32; };
}
const SEEDS = [1, 7, 42, 2026, 99999, 31337, 5, 777, 12, 64];
const R = FIRST_ROOM;
const T = 1_700_000_000_000;
const DAY = 86_400_000;
const FROG = 658;
const made = () => ({ made: true, gifted: true, look: { ...LOOK_BASE }, name: '', spot: { room: R, x: 6, y: 5 }, at: T });
const GAME = { u: 2, id: 'f_game', x: 5, y: 0 };
const pf = (extra = {}) => cloneProfile({
  ...emptyProfile(), coins: 500, items: { f_game: 1 }, caught: { [FROG]: 1 }, partner: FROG,
  house: { started: true, seq: 20, rooms: [{ id: R, wall: '', floor: '', items: [GAME] }] }, avatar: made(), ...extra,
});
const POOL = (n = 10, mineN = 4) => Array.from({ length: n }, (_, i) => ({ id: i + 1, ko: `몬${i + 1}`, url: `u${i + 1}`, type: 'water', mine: i < mineN }));

// ───────────────────── 목록 · 게임기 화면 연결 ─────────────────────

test('🖼️ 게임 목록 — 열째 · 시간 제한 없음(clock — 최고 기록은 가장 빠른 시간) · 넓은 카드(wide) · 설명에 숫자 없음 · 음악은 두근두근 생각', () => {
  assert.deepEqual(GAMES.map((g) => g.id).slice(0, 10), ['dig', 'run', 'shadow', 'pair', 'berry', 'balloon', 'tower', 'tug', 'adv', 'jig'], '열째까지 (v344부터 더 늘어난다 — minigame344)');
  const g = gameById('jig');
  assert.deepEqual([g.emoji, g.ko, g.sec, g.clock, g.wide], ['🖼️', '포켓몬 그림 맞추기', JIG_SEC, true, true]);
  assert.equal(g.how, '조각을 끌어다 제자리에 놓아 그림을 완성해요 · 시간 제한은 없어요');
  for (const x of GAMES) assert.ok(!/\d/.test(x.how), `${x.id}: 아이가 보는 설명에 숫자 없음`);
  assert.equal(GAMES.filter((x) => x.clock).map((x) => x.id).join(), 'jig,diff', '⏱️ 기록은 그림 맞추기 · v345 🔍 다른 그림 찾기');
  assert.deepEqual([JIG_COLS, JIG_ROWS, JIG_N, JIG_CHOICES], [5, 4, 20, 3], '아버님 「20피스 정도」 · 셋 가운데 고르기');
  assert.equal(songFor('jig').id, 'think');
  const gv = src('js/gameview.js');
  assert.match(gv, /import \{ runJig, JIG_CHOICES \} from '\.\/gamejig\.js';/);
  assert.match(gv, /\n {2}jig: \{ run: runJig, prep: \(\) => jigPrep\(\), none: '[^']+' \},/);
  // 준비 — 잡은 포켓몬 먼저 · 그림 없는 잡은 포켓몬은 몇 장 받아 봄 · 하나도 없으면 null(판을 안 쓴다) · 원본 크기 그림은 fullArt
  const prep = gv.slice(gv.indexOf('async function jigPrep('), gv.indexOf('\n}\n', gv.indexOf('async function jigPrep(')));
  assert.match(prep, /const mine = new Set\(ownedMonIds\(\)\);/);
  assert.match(prep, /\(\{ \.\.\.p, mine: mine\.has\(p\.id\) \}\)/);
  assert.match(prep, /await Promise\.race\(\[ensureCast\(shadowShuffle\(gap\)\.slice\(0, JIG_CHOICES \* 2\)\)\.catch\(\(\) => \[\]\), wait\(ART_WAIT_MS\)\]\);/);
  assert.match(prep, /return pool\.length \? \{ pool, big: \(id\) => fullArt\(id\) \} : null;/);
  // 넓은 카드는 판 동안만 — 고르기·끝 화면·닫기에서 내린다
  assert.match(gv, /ui\.view = 'play';\n\s+wideCard\(g\.wide\);/);
  for (const f of ['function renderPick() {', 'function renderResult(g, res, end) {', 'export function closeGames() {']) {
    const body = gv.slice(gv.indexOf(f), gv.indexOf('\n}\n', gv.indexOf(f)));
    assert.ok(body.includes('wideCard(false);'), f);
  }
  // 끝 → 걸린 시간을 저장으로 (⏱️ 게임만 · 그만둔 판은 sec 없음) · 고르기 카드의 기록 줄
  assert.ok(gv.includes('await gameEnd(ctx.roomId, ctx.u, id, res.score, g.clock ? res.sec || 0 : 0);'));
  assert.match(gv, /const rec = recordText\(g\);\n\s+if \(rec\) txt\.appendChild\(el\('span', 'gm-game-best', rec\)\);/);
  // 그림을 못 펼쳐 돌려받은 판 — 고르기 화면에 한 줄
  assert.ok(gv.includes('if (live() && res.msg) ui.msg = res.msg;'));
  assert.ok(!/coins|addCoins|applyPurchase|items\[|itemCount|xp\.js|db\.js|pokemon\.js/.test(src('js/gamejig.js')), '저장·가방을 안 만진다');
});

test('🖼️ 원본 크기 그림(pokemon.fullArt) — 메모리에만 · 끝(ms)까지 못 받으면 null · 저장소(putCharacter)에 안 넣는다', () => {
  const pk = src('js/pokemon.js');
  const f = pk.slice(pk.indexOf('export async function fullArt('), pk.indexOf('\n}\n', pk.indexOf('export async function fullArt(')));
  assert.ok(f.length > 100);
  assert.ok(f.includes('fetch(ART_URL(key)') && f.includes('ctl.abort()') && f.includes('fullUrls.set(key, url);'));
  assert.ok(!f.includes('putCharacter'), '256px로 줄여 둔 저장 그림은 그대로');
  assert.ok(f.includes('return null;'));
});

test('🖼️ 서비스워커 v339 · 새 파일 · css (넓은 카드 · 마당 2:1 · 끄는 동안 안 밀림 · 손잡이는 칸만 · 줄인 움직임)', () => {
  const sw = src('sw.js');
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(sw) || [])[1]) >= 339, 'sw v339 이상');
  assert.ok(sw.includes("'./js/gamejig.js',"));
  const css = src('css/style.css');
  assert.match(css, /\.gm-card\.is-wide \{ width: min\(1000px, 100%\); \}/);
  assert.match(css, /\.gm-card\.is-wide \.gm-stage \{ max-width: calc\(\(100vh - 220px\) \* 2\); \}/);
  assert.match(css, /\.gj-field \{[^}]*isolation: isolate;[^}]*aspect-ratio: 2 \/ 1;[^}]*touch-action: none;/);
  assert.match(css, /\.gj-board \{[^}]*left: 25%; top: 10%; width: 50%; height: 80%;/, '판 자리 = BOARD_X·BOARD_Y·5칸·4칸');
  assert.match(css, /\.gj-full \{[^}]*left: 25%; top: 10%; width: 50%; height: 80%;/);
  assert.match(css, /\.gj-pc \{[^}]*width: 15%; height: 30%; pointer-events: none;/, '칸 + 둘레 여유 = 1.5칸');
  assert.match(css, /\.gj-hit \{[^}]*top: 16\.667%; right: 16\.667%; bottom: 16\.667%; left: 16\.667%; pointer-events: auto; touch-action: none;/);
  assert.ok(css.includes('.gj-pick[hidden] { display: none; }') && css.includes('.gj-peek[hidden] { display: none; }'));
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.gj-pc\.is-snap \{ animation: none; \} \.gj-full \{ transition: none; \} \}/);
  // css 숫자와 엔진 숫자가 같다
  assert.deepEqual([BOARD_X, BOARD_Y, JIG_COLS * CELL_W, JIG_ROWS * CELL_H], [25, 10, 50, 80]);
  assert.equal(CELL_W * (1 + 2 * TAB), 15);
  assert.equal(CELL_H * (1 + 2 * TAB), 30);
  assert.equal(Number(((TAB / (1 + 2 * TAB)) * 100).toFixed(3)), 16.667);
  assert.equal(CELL_W * 2, CELL_H, '마당이 2:1이라 한 칸이 화면에서 정사각형');
});

// ───────────────────── 엔진 ─────────────────────

test('🖼️ 고를 포켓몬 — 잡은 것 먼저 · 셋까지 · 같은 id는 한 번 · 깨진 값은 뺌 · 없으면 []', () => {
  for (const seed of SEEDS) {
    const c = jigChoices(POOL(10, 4), seeded(seed));
    assert.equal(c.length, 3);
    assert.ok(c.every((id) => id <= 4), '잡은 포켓몬이 넷이면 셋 다 잡은 것');
    assert.equal(new Set(c).size, 3);
  }
  const few = jigChoices(POOL(10, 1), seeded(3));
  assert.equal(few[0], 1, '잡은 하나가 맨 앞 · 나머지는 앱 포켓몬');
  assert.equal(few.length, 3);
  assert.deepEqual(jigChoices([{ id: 5, mine: true }, { id: 5 }, { id: 'x' }, { id: -1 }, null], seeded(1)), [5]);
  assert.deepEqual(jigChoices([], seeded(1)), []);
  assert.deepEqual(jigChoices(null), []);
});

test('🖼️ 조각 모양 — 판 테두리는 곧은 변 · 안쪽은 볼록·오목 · 붙은 두 조각은 늘 반대 · 판마다 다르다', () => {
  const seen = new Set();
  for (const seed of SEEDS) {
    const sh = jigShapes(seeded(seed));
    assert.equal(sh.length, JIG_N);
    seen.add(JSON.stringify(sh));
    for (let r = 0; r < JIG_ROWS; r++) {
      for (let c = 0; c < JIG_COLS; c++) {
        const p = sh[r * JIG_COLS + c];
        assert.equal(p.top === 0, r === 0, `위 ${r},${c}`);
        assert.equal(p.bottom === 0, r === JIG_ROWS - 1, `아래 ${r},${c}`);
        assert.equal(p.left === 0, c === 0, `왼 ${r},${c}`);
        assert.equal(p.right === 0, c === JIG_COLS - 1, `오른 ${r},${c}`);
        for (const v of [p.top, p.right, p.bottom, p.left]) assert.ok([-1, 0, 1].includes(v));
        if (c < JIG_COLS - 1) assert.equal(p.right, -sh[r * JIG_COLS + c + 1].left, `가로 이웃 ${r},${c}`);
        if (r < JIG_ROWS - 1) assert.equal(p.bottom, -sh[(r + 1) * JIG_COLS + c].top, `세로 이웃 ${r},${c}`);
      }
    }
    const inner = sh.flatMap((p) => [p.right, p.bottom]).filter((v) => v);
    assert.equal(inner.length, (JIG_COLS - 1) * JIG_ROWS + JIG_COLS * (JIG_ROWS - 1), '안쪽 경계 31개 모두 꼭지');
    assert.ok(inner.includes(1) && inner.includes(-1), `seed ${seed}: 볼록·오목이 섞인다`);
  }
  assert.ok(seen.size >= SEEDS.length - 1, '판마다 다른 모양');
});

/** ops → 점 목록 (시작점 + 각 명령의 점들) */
const pts = (start, ops) => [start, ...ops.flatMap(([, ...a]) => { const out = []; for (let j = 0; j < a.length; j += 2) out.push([a[j], a[j + 1]]); return out; })];
const close = (a, b) => Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9;

test('🖼️ 조각 테두리 — 이웃 조각은 같은 경계를 거꾸로 따라가 선이 딱 겹친다 · 곧은 변은 칸 테두리 위 · 꼭지는 둘레 여유(TAB) 안', () => {
  const Z = 160;
  for (const sign of [1, -1]) {
    // 가로 이웃 — 왼 조각의 오른 변(위 → 아래)과 오른 조각의 왼 변(아래 → 위, 한 칸 오른쪽)
    const a = pts([Z, 0], edgeOps(Z, 0, Z, Z, 1, 0, sign, Z));
    const b = pts([Z, Z], edgeOps(Z, Z, Z, 0, -1, 0, -sign, Z)); // 오른 조각 기준 (0, Z) → (0, 0)을 Z만큼 옮긴 것
    assert.equal(a.length, b.length);
    a.reverse().forEach((p, k) => assert.ok(close(p, b[k]), `가로 sign ${sign} 점 ${k}: ${p} / ${b[k]}`));
    // 세로 이웃 — 위 조각의 아래 변(오른 → 왼)과 아래 조각의 위 변(왼 → 오른, 한 칸 아래)
    const c = pts([Z, Z], edgeOps(Z, Z, 0, Z, 0, 1, sign, Z));
    const d = pts([0, Z], edgeOps(0, Z, Z, Z, 0, -1, -sign, Z));
    c.reverse().forEach((p, k) => assert.ok(close(p, d[k]), `세로 sign ${sign} 점 ${k}`));
    // 꼭지가 나가는 끝 · 들어오는 끝
    const ys = pts([0, 0], edgeOps(0, 0, Z, 0, 0, -1, sign, Z)).map((p) => p[1]);
    const far = sign > 0 ? -Math.min(...ys) : Math.max(...ys);
    assert.ok(Math.abs(far - KNOB_OUT * Z) < 1e-9, `꼭지 끝 ${far}`);
  }
  assert.ok(KNOB_OUT < TAB, '꼭지가 캔버스 여유 안에');
  assert.deepEqual(edgeOps(0, 0, Z, 0, 0, -1, 0, Z), [['L', Z, 0]], '곧은 변');
  // 실제 판의 조각마다 — 닫힌 선(끝이 처음으로) · 모든 점이 여유 안 · 곧은 변은 칸 테두리 위
  for (const seed of SEEDS.slice(0, 4)) {
    for (const shape of jigShapes(seeded(seed))) {
      const ops = jigPath(shape, Z);
      assert.deepEqual(ops[0], ['M', 0, 0]);
      const all = pts([0, 0], ops.slice(1));
      assert.ok(close(all[all.length - 1], [0, 0]), '처음으로 돌아온다');
      for (const [x, y] of all) assert.ok(x >= -TAB * Z && x <= Z + TAB * Z && y >= -TAB * Z && y <= Z + TAB * Z, `여유 밖 ${x},${y}`);
      if (!shape.top) assert.ok(all.every(([, y]) => y >= -1e-9), '위가 곧으면 위로 안 나감');
      if (!shape.left) assert.ok(all.every(([x]) => x >= -1e-9), '왼쪽이 곧으면 왼쪽으로 안 나감');
      if (!shape.bottom) assert.ok(all.every(([, y]) => y <= Z + 1e-9), '아래가 곧으면 아래로 안 나감');
      if (!shape.right) assert.ok(all.every(([x]) => x <= Z + 1e-9), '오른쪽이 곧으면 오른쪽으로 안 나감');
    }
  }
});

test('🖼️ 처음 자리 — 판 양옆 20자리(겹치지 않게 섞음) · 꼭지까지 마당 안 · 판에 걸치지 않음 · 어느 조각도 처음부터 제자리 가까이 아님', () => {
  assert.deepEqual([X_MIN, X_MAX, Y_MIN, Y_MAX], [2.5, 87.5, 5, 75]);
  for (const seed of SEEDS) {
    const sl = jigSlots(seeded(seed));
    assert.equal(sl.length, JIG_N);
    const cols = new Map();
    for (const p of sl) {
      assert.ok(p.x >= X_MIN && p.x <= X_MAX && p.y >= Y_MIN && p.y <= Y_MAX, `마당 밖 ${p.x},${p.y}`);
      assert.ok(p.x + CELL_W <= BOARD_X || p.x >= BOARD_X + JIG_COLS * CELL_W, `판에 걸침 ${p.x}`);
      cols.set(p.x, (cols.get(p.x) || 0) + 1);
    }
    assert.deepEqual([...cols.values()], [5, 5, 5, 5], '네 줄에 다섯씩');
    const s = jigStart(1000, seeded(seed));
    for (const p of s.pieces) {
      assert.deepEqual([p.tx, p.ty], [BOARD_X + p.c * CELL_W, BOARD_Y + p.r * CELL_H]);
      assert.equal(p.i, p.r * JIG_COLS + p.c);
      assert.ok(!jigNear(p) && !p.done, '처음부터 붙을 자리가 아니다');
    }
    assert.deepEqual([s.t0, s.placed, s.score, s.moves, s.doneAt, s.sec], [1000, 0, 0, 0, 0, 0]);
  }
});

test('🖼️ 놓기 — 멀면 그 자리(감점 없음) · 제자리 가까이(SNAP 안)면 딱 맞춰 붙음 ⭐1 · 붙은 조각은 다시 안 움직임 · 마당 밖은 안으로', () => {
  const s = jigStart(0, seeded(4));
  const p = s.pieces[7];
  // 멀리
  let r = jigDrop(s, 7, 40, 50, 100);
  assert.deepEqual(r, { kind: 'loose', i: 7 });
  assert.deepEqual([p.x, p.y, p.done, s.score, s.moves], [40, 50, false, 0, 1], '놓은 자리에 둔다');
  // 마당 밖 → 안으로 자름
  jigDrop(s, 7, -50, 500, 200);
  assert.deepEqual([p.x, p.y], [X_MIN, Y_MAX]);
  assert.equal(jigMove(s, 7, NaN, 3), false, '깨진 값은 그대로');
  assert.deepEqual([p.x, p.y], [X_MIN, Y_MAX]);
  // SNAP 경계 — 딱 그 거리는 붙고 조금 넘으면 안 붙는다
  const q = { x: p.tx + SNAP * CELL_W, y: p.ty, tx: p.tx, ty: p.ty };
  assert.equal(jigNear(q), true);
  assert.equal(jigNear({ ...q, x: q.x + 0.01 }), false);
  assert.equal(jigNear({ x: p.tx, y: p.ty + SNAP * CELL_H * 1.01, tx: p.tx, ty: p.ty }), false, '세로는 칸 높이(20%)로 잰다');
  assert.equal(jigNear({ x: p.tx + 0.2 * CELL_W, y: p.ty + 0.2 * CELL_H, tx: p.tx, ty: p.ty }), true, '대각선 0.28칸');
  // 가까이 → 딱 맞춰 붙음
  r = jigDrop(s, 7, p.tx + 2, p.ty - 3, 300);
  assert.deepEqual(r, { kind: 'snap', i: 7, pts: 1 });
  assert.deepEqual([p.x, p.y, p.done, s.placed, s.score], [p.tx, p.ty, true, 1, 1]);
  // 붙은 조각
  assert.deepEqual(jigDrop(s, 7, 10, 10, 400), { kind: 'locked', i: 7 });
  assert.equal(jigMove(s, 7, 10, 10), false);
  assert.deepEqual([p.x, p.y, s.score], [p.tx, p.ty, 1]);
  // 다른 조각의 제자리에 놓으면 — 붙지 않는다(제 자리만)
  const o = s.pieces[0];
  assert.equal(jigDrop(s, 0, s.pieces[1].tx, s.pieces[1].ty, 500).kind, 'loose');
  assert.equal(o.done, false);
  assert.deepEqual(jigDrop(s, 99, 0, 0, 0), { kind: 'none' });
});

test('🖼️ 다 맞춤 — 마지막 조각에서 done(걸린 시간) · 그 뒤는 over · 내려 둔 동안은 시간에 안 들어감 · 적어도 1초', () => {
  for (const seed of SEEDS) {
    const s = jigStart(10_000, seeded(seed));
    const order = s.pieces.map((p) => p.i).sort((a, b) => (seed % 2 ? a - b : b - a));
    jigShift(s, 30_000); // 30초 내려 둠
    assert.equal(s.t0, 40_000);
    let last = null;
    order.forEach((i, k) => {
      const p = s.pieces[i];
      last = jigDrop(s, i, p.tx + 1, p.ty + 1, 40_000 + (k + 1) * 4_000);
      assert.equal(last.kind, k < JIG_N - 1 ? 'snap' : 'done');
    });
    assert.deepEqual(last, { kind: 'done', i: order[JIG_N - 1], pts: 1, sec: 80 });
    assert.deepEqual([s.placed, s.score, s.sec, s.doneAt], [JIG_N, JIG_N, 80, 120_000]);
    assert.equal(jigSec(s, 999_999), 80, '다 맞춘 뒤엔 시간이 안 간다');
    assert.deepEqual(jigDrop(s, 0, 0, 0, 200_000), { kind: 'over' });
    jigShift(s, 5000);
    assert.equal(s.t0, 40_000, '다 맞춘 뒤엔 밀지 않는다');
  }
  const z = jigStart(5000, seeded(1));
  assert.equal(jigSec(z, 5200), 1, '1초 안이어도 1초');
  assert.equal(jigSec(z, 6499), 1);
  assert.equal(jigSec(z, 6500), 2, '반올림');
  assert.equal(jigSec(z, NaN), 1);
  jigShift(z, -3); jigShift(z, NaN); jigShift(z, 0);
  assert.equal(z.t0, 5000);
  // 시계가 뒤로 가도 done의 시간은 1초
  const b = jigStart(5000, seeded(2));
  b.pieces.forEach((p, k) => { if (k < JIG_N - 1) { p.done = true; b.placed += 1; } });
  const p = b.pieces[JIG_N - 1];
  assert.equal(jigDrop(b, JIG_N - 1, p.tx, p.ty, 100).sec, 1);
});

test('🖼️ 색 섞기 · 타입 색 · 걸린 시간 말', () => {
  assert.equal(mixColor('#000000', '#ffffff', 0.5), '#808080');
  assert.equal(mixColor('#6390f0', '#ffffff', 0), '#6390f0');
  assert.equal(mixColor('#6390f0', '#000000', 1), '#000000');
  assert.equal(mixColor('#123456', '#ffffff', 9), '#ffffff', '끝으로 자름');
  assert.equal(mixColor('bad', '#ffffff', 0), '#000000');
  for (const t of ['normal', 'fire', 'water', 'grass', 'electric', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy']) {
    assert.match(TYPE_COLOR[t], /^#[0-9a-f]{6}$/, t);
  }
  assert.deepEqual([clockText(45), clockText(133), clockText(120), clockText(60), clockText(1), clockText(3599)], ['45초', '2분 13초', '2분', '1분', '1초', '59분 59초']);
  for (const bad of [0, -5, NaN, undefined, null, 'x']) assert.equal(clockText(bad), '', String(bad));
  assert.equal(clockText(90.7), '1분 30초');
});

// ───────────────────── ⏱️ 가장 빠른 시간 (homeplay fast) ─────────────────────

test('⏱️ 기록 — 있을 때만 칸 · 하루보다 긴 시간·깨진 값·모르는 열쇠는 뺀다 · 병합은 작은 쪽 · 복사본은 따로', () => {
  assert.deepEqual(playOf({ days: {}, bond: {} }), { days: {}, bond: {} }, '기록이 없으면 옛 모양 그대로');
  assert.deepEqual(playOf({ fast: { jig: 95, Bad: 5, x: 3, run: -1, dig: '7', tug: 2.5, adv: FAST_MAX + 1, tower: FAST_MAX } }).fast, { jig: 95, tower: FAST_MAX });
  assert.equal(playOf({ fast: { jig: 0 } }).fast, undefined);
  assert.deepEqual(mergePlay({ fast: { jig: 120 } }, { fast: { jig: 95, adv: 40 } }).fast, { jig: 95, adv: 40 });
  assert.deepEqual(mergePlay({ fast: { jig: 80 } }, { fast: { jig: 95 } }).fast, { jig: 80 });
  assert.deepEqual(mergePlay({ days: { f_tv: 3 } }, { fast: { jig: 50 } }), { days: { f_tv: 3 }, bond: {}, fast: { jig: 50 } });
  assert.deepEqual(mergePlay({ best: { jig: 20 }, fast: { jig: 70 } }, { best: { jig: 12 } }), { days: {}, bond: {}, best: { jig: 20 }, fast: { jig: 70 } }, '⭐는 큰 쪽 · ⏱️는 한쪽만 있으면 그것');
  assert.equal(fastOf({ fast: { jig: 70 } }, 'jig'), 70);
  assert.equal(fastOf(null, 'jig'), 0);
  assert.equal(fastOf({ fast: { jig: 70 } }, 'constructor'), 0);
  const a = { fast: { jig: 70 } };
  const c = copyPlay(a);
  c.fast.jig = 9;
  assert.equal(a.fast.jig, 70);
});

test('⏱️ 한 판 끝 규칙 — 처음은 첫 기록 · 더 빠르면 새 기록 · 느리거나 같으면 그대로 · sec 없음(그만둔 판)·깨진 값은 기록 없음 · 💗·⭐ 그대로', () => {
  const p = pf();
  const a = gameEndRule(p, R, 2, 'jig', 20, T, 130);
  assert.deepEqual([a.ok, a.heart, a.fast, a.prevFast, a.newFast, a.best, a.newBest], [true, true, 130, 0, true, 20, true]);
  const b = gameEndRule(p, R, 2, 'jig', 20, T + 1000, 150);
  assert.deepEqual([b.heart, b.fast, b.prevFast, b.newFast], [false, 130, 130, false], '느리면 그대로 · 💗는 하루 한 번');
  const c = gameEndRule(p, R, 2, 'jig', 20, T + 2000, 130);
  assert.equal(c.newFast, false, '같으면 새 기록 아님');
  const d = gameEndRule(p, R, 2, 'jig', 20, T + 3000, 95);
  assert.deepEqual([d.fast, d.prevFast, d.newFast], [95, 130, true]);
  const e = gameEndRule(p, R, 2, 'jig', 7, T + 4000);
  assert.deepEqual([e.fast, e.newFast, e.best], [95, false, 20], '그만둔 판(sec 없음)은 시간 기록을 안 건드린다');
  assert.deepEqual(p.homePlay.fast, { jig: 95 });
  assert.deepEqual(p.homePlay.best, { jig: 20 });
  for (const bad of [-3, 2.5, NaN, '9', FAST_MAX + 1, 0]) {
    const q = pf();
    const r = gameEndRule(q, R, 2, 'jig', 20, T, bad);
    assert.deepEqual([r.newFast, r.fast], [false, 0], String(bad));
    assert.equal(q.homePlay.fast, undefined);
  }
  // ⭐ 게임은 sec 없이 예전 그대로
  const g = gameEndRule(pf(), R, 2, 'dig', 15, T);
  assert.deepEqual([g.best, g.newBest, g.fast, g.newFast], [15, true, 0, false]);
  // 파트너가 없어도 기록 (💗만 없음) · 못 하는 경우는 그대로
  const n = pf({ partner: null });
  assert.deepEqual([gameEndRule(n, R, 2, 'jig', 20, T, 88).newFast, n.homePlay.fast.jig], [true, 88]);
  assert.equal(gameEndRule(pf(), R, 9, 'jig', 20, T, 88).why, 'gone');
  assert.deepEqual([p.coins, p.items.f_game], [500, 1], '경제는 그대로');
});

const stored = () => fakeIdb.get('profile', 'me');
test('★ ⏱️ 저장 경로: 가장 빠른 시간이 저장된 프로필에 · 두 창이 동시에 끝내도 더 빠른 쪽 · 저장이 실패하면 없던 일', async () => {
  await initProfile();
  await flushProfile();
  const cur = stored() || emptyProfile();
  fakeIdb.put('profile', { ...pf(), updatedAt: (cur.updatedAt || 0) + 1 });
  await reloadProfile();
  const rs = await Promise.all([gameEnd(R, 2, 'jig', 20, 140), gameEnd(R, 2, 'jig', 20, 110)]);
  assert.deepEqual(rs.map((r) => r.heart).sort(), [false, true]);
  assert.equal(stored().homePlay.fast.jig, 110);
  assert.equal(gameFast('jig'), 110, '창의 프로필도');
  assert.equal(gameBest('jig'), 20);
  await gameEnd(R, 2, 'jig', 20, 125);
  assert.equal(stored().homePlay.fast.jig, 110, '느린 판은 기록을 안 바꾼다');
  await gameEnd(R, 2, 'jig', 5);
  assert.equal(stored().homePlay.fast.jig, 110, '그만둔 판');
  const s0 = stored();
  fakeIdb.failNext('profile');
  const f = await gameEnd(R, 2, 'jig', 20, 60);
  assert.deepEqual(f, { ok: false, why: 'save' });
  assert.deepEqual(stored().homePlay, s0.homePlay);
  assert.equal(getProfileSnapshot().homePlay.fast.jig, 110, '메모리로 성공한 척하지 않는다');
  assert.equal(fastOf(stored().homePlay, 'jig'), 110);
  assert.equal(bestOf(stored().homePlay, 'jig'), 20);
});

test('⏱️ 끝 말(resultLines) — 다 맞춤 「완성! ⏱️ 2분 13초」 · 첫·새 기록 · 아니면 최고 시간 · 그만둔 판 「끝! ⭐ 7」 · ⭐ 게임은 예전 그대로', () => {
  const jig = gameById('jig');
  const dig = gameById('dig');
  assert.deepEqual(resultLines(jig, { score: 20, sec: 133 }, { ok: true, newFast: true, prevFast: 0, fast: 133 }), { head: '완성! ⏱️ 2분 13초', rec: '⏱️ 첫 기록!', recNew: true });
  assert.deepEqual(resultLines(jig, { score: 20, sec: 95 }, { ok: true, newFast: true, prevFast: 133, fast: 95 }), { head: '완성! ⏱️ 1분 35초', rec: '🎉 새 기록!', recNew: true });
  assert.deepEqual(resultLines(jig, { score: 20, sec: 150 }, { ok: true, newFast: false, prevFast: 95, fast: 95, newBest: false, best: 20 }), { head: '완성! ⏱️ 2분 30초', rec: '최고 ⏱️ 1분 35초', recNew: false });
  assert.deepEqual(resultLines(jig, { score: 7, quit: true }, { ok: true, newFast: false, fast: 95, newBest: true, prevBest: 0, best: 7 }), { head: '끝! ⭐ 7', rec: '최고 ⏱️ 1분 35초', recNew: false }, '그만둔 판 — ⭐ 첫 기록 말은 안 함');
  assert.deepEqual(resultLines(jig, { score: 3 }, { ok: true, newFast: false, fast: 0 }), { head: '끝! ⭐ 3', rec: '', recNew: false });
  assert.deepEqual(resultLines(jig, { score: 20, sec: 60 }, { ok: false, why: 'save' }), { head: '완성! ⏱️ 1분', rec: '', recNew: false }, '저장을 못 했으면 기록 줄 없음');
  assert.deepEqual(resultLines(jig, { score: 20, sec: 60 }, null), { head: '완성! ⏱️ 1분', rec: '', recNew: false });
  assert.deepEqual(resultLines(jig, { score: 20, sec: 60 }, { ok: false, why: 'save', fast: 95 }), { head: '완성! ⏱️ 1분', rec: '', recNew: false }, '저장 실패면 옛 값이 붙어 와도 기록 줄 없음');
  // ⭐ 게임 — 예전 끝 화면 그대로
  assert.deepEqual(resultLines(dig, { score: 12 }, { ok: true, newBest: true, prevBest: 0, best: 12 }), { head: '끝! ⭐ 12', rec: '⭐ 첫 기록!', recNew: true });
  assert.deepEqual(resultLines(dig, { score: 15 }, { ok: true, newBest: true, prevBest: 12, best: 15 }), { head: '끝! ⭐ 15', rec: '🎉 새 기록!', recNew: true });
  assert.deepEqual(resultLines(dig, { score: 9 }, { ok: true, newBest: false, prevBest: 15, best: 15 }), { head: '끝! ⭐ 9', rec: '최고 ⭐ 15', recNew: false });
  assert.deepEqual(resultLines(dig, { score: 0 }, { ok: true, newBest: false, best: 0 }), { head: '끝! ⭐ 0', rec: '', recNew: false });
  assert.deepEqual(resultLines(dig, { score: 4 }, null), { head: '끝! ⭐ 4', rec: '', recNew: false });
});

// ───────────────────── 화면 (가짜 화면 · 가짜 시계) ─────────────────────

class FakeEl {
  constructor(tag) { this.tagName = String(tag).toUpperCase(); this.className = ''; this.children = []; this.listeners = {}; this.style = { setProperty() {} }; this.attrs = {}; this.textContent = ''; this.html = ''; this.hidden = false; this.disabled = false; }
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
  fire(type, extra = {}) { for (const f of [...(this.listeners[type] || [])]) f({ preventDefault() {}, ...extra }); }
  getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 50 }; }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((x) => x !== this); }
}
function world(t, o = {}) {
  const made = [];
  const doc = { hidden: false, listeners: {}, createElement: (tag) => { const e = new FakeEl(tag); made.push(e); return e; },
    addEventListener(type, f) { (this.listeners[type] ||= []).push(f); },
    removeEventListener(type, f) { this.listeners[type] = (this.listeners[type] || []).filter((x) => x !== f); },
    fire(type) { for (const f of [...(this.listeners[type] || [])]) f(); } };
  let clock = 1000;
  const realPerf = globalThis.performance;
  Object.defineProperty(globalThis, 'performance', { value: { now: () => clock }, configurable: true, writable: true });
  globalThis.document = doc;
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  t.after(() => { Object.defineProperty(globalThis, 'performance', { value: realPerf, configurable: true, writable: true }); delete globalThis.document; });
  const stage = new FakeEl('div');
  const bigCalls = [];
  const h = runJig(stage, { pool: o.pool || POOL(), rng: seeded(o.seed || 3), hero: { html: '<b>파트너</b>' },
    ...(o.noBig ? {} : { big: (id) => { bigCalls.push(id); return o.big ? o.big(id) : `big${id}`; } }) });
  const st = { over: null };
  h.done.then((r) => { st.over = r; });
  const adv = (ms) => { for (let k = 0; k < ms; k += 50) { clock += 50; t.mock.timers.tick(50); } };
  const flush = async () => { for (let k = 0; k < 4; k++) await new Promise((r) => setImmediate(r)); };
  const hide = (on) => { doc.hidden = on; doc.fire('visibilitychange'); };
  const root = stage.children[0];
  const [top, field] = root.children;
  const pick = field.children.find((c) => c.className === 'gj-pick');
  const row = pick.children.find((c) => c.className === 'gj-pick-row');
  const msg = pick.children.find((c) => c.className === 'gj-wait');
  const banner = root.children.find((c) => c.className.startsWith('gd-banner'));
  /** src가 이 주소인 마지막 그림 (load 밖에서 만든 것까지) */
  const img = (url) => [...made].reverse().find((e) => e.tagName === 'IMG' && e.src === url);
  const pieces = () => field.children.filter((c) => c.className.split(' ').includes('gj-pc'));
  return { stage, h, doc, adv, flush, st, hide, root, top, field, pick, row, msg, banner, img, pieces, bigCalls, now: () => clock };
}
/** 고르기 카드 그림을 띄우고 i번째를 골라 큰 그림까지 띄운다 → 「준비!」 */
async function pickAndBuild(w, k = 0, url) {
  for (const b of w.row.children) b.children[0].fire('load');
  const card = w.row.children[k];
  card.fire('click');
  await w.flush();
  const big = w.img(url);
  assert.ok(big, `큰 그림 ${url}`);
  big.fire('load');
  await w.flush();
}
/** 조각 i를 마당 % 자리 (x, y)로 끌어다 놓는다 — 가짜 마당은 100 × 50 */
function dragTo(w, i, x, y, id = 1) {
  const pc = w.pieces()[i];
  const hit = pc.children[1];
  const left = parseFloat(pc.style.left) + TAB * CELL_W;
  const topY = parseFloat(pc.style.top) + TAB * CELL_H;
  hit.fire('pointerdown', { pointerId: id, clientX: 0, clientY: 0 });
  hit.fire('pointermove', { pointerId: id, clientX: (x - left) / 2, clientY: (y - topY) / 4 });
  hit.fire('pointerup', { pointerId: id, clientX: x - left, clientY: (y - topY) / 2 });
  return pc;
}
const targetOf = (i) => ({ x: BOARD_X + (i % JIG_COLS) * CELL_W, y: BOARD_Y + Math.floor(i / JIG_COLS) * CELL_H });

test('🖼️ 화면 — 「어떤 포켓몬?」 셋(잡은 것) · 그림이 뜬 카드만 · 고르면 큰 그림 → 조각 20 · 「준비!」 뒤 끌기 · 붙으면 ⭐ · 다 맞추면 완성(걸린 시간)', async (t) => {
  const w = world(t);
  assert.equal(w.row.children.length, 3);
  assert.ok(w.row.children.every((b) => b.disabled), '그림이 뜨기 전엔 못 누른다');
  assert.deepEqual(w.row.children.map((b) => b.attrs['aria-label']).every((n) => /^몬[1-4]$/.test(n)), true, '잡은 포켓몬(1~4)');
  await w.flush();
  assert.deepEqual(w.bigCalls, w.row.children.map((b) => Number(b.attrs['aria-label'].slice(1))), '고르는 동안 카드 셋의 원본 크기 그림을 받아 본다');
  assert.equal(w.h.music(), 'play');
  const id = Number(w.row.children[1].attrs['aria-label'].slice(1));
  await pickAndBuild(w, 1, `big${id}`);
  assert.equal(w.pick.hidden, true);
  assert.equal(w.pieces().length, JIG_N);
  assert.equal(w.banner.textContent, '준비!');
  // 「준비!」 동안은 못 끈다
  const before = w.pieces()[0].style.left;
  dragTo(w, 0, targetOf(0).x, targetOf(0).y);
  assert.equal(w.pieces()[0].style.left, before);
  w.adv(850);
  assert.ok(w.root.className.includes('is-go'));
  // 멀리 놓으면 그 자리
  const pc = dragTo(w, 3, 50, 50);
  assert.equal(pc.style.left, `${(50 - TAB * CELL_W).toFixed(3)}%`);
  assert.ok(!pc.className.includes('is-done'));
  assert.equal(w.top.children[0].textContent, '⭐ 0');
  // 제자리 가까이 → 붙음
  dragTo(w, 3, targetOf(3).x + 1, targetOf(3).y - 2);
  assert.ok(w.pieces()[3].className.includes('is-done'));
  assert.equal(w.pieces()[3].style.zIndex, '1');
  assert.equal(w.pieces()[3].style.left, `${(targetOf(3).x - TAB * CELL_W).toFixed(3)}%`);
  assert.equal(w.top.children[0].textContent, '⭐ 1');
  // 붙은 조각은 다시 안 끌린다
  dragTo(w, 3, 5, 5);
  assert.equal(w.pieces()[3].style.left, `${(targetOf(3).x - TAB * CELL_W).toFixed(3)}%`);
  // 나머지 — 10초 뒤에 모두
  w.adv(10_000);
  for (let i = 0; i < JIG_N; i++) if (i !== 3) dragTo(w, i, targetOf(i).x, targetOf(i).y);
  assert.equal(w.banner.textContent, '완성!');
  assert.equal(w.h.music(), 'stop');
  assert.equal(w.st.over, null, '완성 그림을 잠깐 보여 준 뒤');
  w.adv(2300);
  await w.flush();
  assert.deepEqual(w.st.over, { score: JIG_N, quit: false, sec: 10 });
});

test('🖼️ 화면 — 「어떤 포켓몬?」에서 ✕면 판을 돌려받음(unplayed) · 고른 뒤 그림 펴는 중·「준비!」의 ✕는 판을 쓴 것 · 판 도중 ✕는 맞춘 조각 ⭐', async (t) => {
  const a = world(t);
  a.h.stop();
  await a.flush();
  assert.deepEqual(a.st.over, { score: 0, quit: true, unplayed: true, msg: '' });
  assert.ok(a.row.children.every((b) => b.disabled));
});

test('🖼️ 화면 — 고른 뒤(그림 펴는 중) ✕는 판을 쓴 것', async (t) => {
  const b = world(t);
  for (const x of b.row.children) x.children[0].fire('load');
  b.row.children[0].fire('click');
  b.h.stop();
  await b.flush();
  assert.deepEqual(b.st.over, { score: 0, quit: true });
});

test('🖼️ 화면 — 「준비!」의 ✕는 판을 쓴 것 · 판 도중 ✕는 그때까지 맞춘 조각', async (t) => {
  const c = world(t);
  const id = Number(c.row.children[0].attrs['aria-label'].slice(1));
  await pickAndBuild(c, 0, `big${id}`);
  c.h.stop();
  await c.flush();
  assert.deepEqual(c.st.over, { score: 0, quit: true });
});

test('🖼️ 화면 — 판 도중 ✕는 그때까지 맞춘 조각 ⭐ (걸린 시간 없음)', async (t) => {
  const d = world(t);
  const id = Number(d.row.children[2].attrs['aria-label'].slice(1));
  await pickAndBuild(d, 2, `big${id}`);
  d.adv(850);
  for (const i of [0, 1, 2]) dragTo(d, i, targetOf(i).x, targetOf(i).y);
  d.h.stop();
  await d.flush();
  assert.deepEqual(d.st.over, { score: 3, quit: true });
});

test('🖼️ 화면 — 큰 그림을 못 받으면(null·깨짐) 저장한 그림으로 · 저장한 그림도 깨지면 판을 돌려받고 한 줄', async (t) => {
  const a = world(t, { big: () => null });
  const id = Number(a.row.children[0].attrs['aria-label'].slice(1));
  for (const b of a.row.children) b.children[0].fire('load');
  a.row.children[0].fire('click');
  await a.flush();
  assert.equal(a.msg.textContent, '그림을 펼치는 중…');
  assert.ok(a.row.children.every((b) => b.disabled), '고른 뒤엔 다른 카드를 못 누른다');
  const own = a.img(`u${id}`);
  assert.ok(own && own.className !== 'gj-who-img', '카드 그림이 아니라 새로 받은 저장 그림');
  own.fire('load');
  await a.flush();
  assert.equal(a.pieces().length, JIG_N);
});

test('🖼️ 화면 — 큰 그림이 깨지면 저장한 그림 · 그것도 깨지면 unplayed + 한 줄', async (t) => {
  const a = world(t);
  const id = Number(a.row.children[0].attrs['aria-label'].slice(1));
  for (const b of a.row.children) b.children[0].fire('load');
  a.row.children[0].fire('click');
  await a.flush();
  a.img(`big${id}`).fire('error');
  await a.flush();
  const own = a.img(`u${id}`);
  assert.notEqual(own.className, 'gj-who-img', '카드 그림이 아니라 새로 받은 저장 그림');
  own.fire('error');
  await a.flush();
  assert.deepEqual(a.st.over, { score: 0, quit: true, unplayed: true, msg: '앗, 그림을 못 펼쳤어요 — 다시 골라 봐요.' });
  assert.equal(a.pieces().length, 0);
});

test('🖼️ 화면 — 큰 그림이 늦으면 BIG_WAIT_MS 뒤 저장한 그림으로', async (t) => {
  const a = world(t, { big: () => new Promise(() => {}) }); // 영영 안 옴
  const id = Number(a.row.children[0].attrs['aria-label'].slice(1));
  for (const b of a.row.children) b.children[0].fire('load');
  a.row.children[0].fire('click');
  await a.flush();
  assert.equal(a.img(`u${id}`) && a.img(`u${id}`).className, 'gj-who-img', '아직 저장 그림을 새로 받지 않았다');
  assert.equal(BIG_WAIT_MS, 1500);
  a.adv(BIG_WAIT_MS + 50);
  await a.flush();
  const own = a.img(`u${id}`);
  assert.notEqual(own.className, 'gj-who-img');
  own.fire('load');
  await a.flush();
  assert.equal(a.pieces().length, JIG_N);
});

test('🖼️ 화면 — 카드 그림이 다 깨지면 판을 돌려받고 한 줄 · 하나만 깨지면 그 카드만 뺀다 · o.big이 없어도 된다', async (t) => {
  const a = world(t, { noBig: true });
  a.row.children[0].children[0].fire('error');
  assert.equal(a.row.children.length, 2);
  assert.equal(a.st.over, null);
  a.row.children[0].children[0].fire('error');
  a.row.children[0].children[0].fire('error');
  await a.flush();
  assert.deepEqual(a.st.over, { score: 0, quit: true, unplayed: true, msg: '앗, 포켓몬 그림을 못 불러왔어요.' });
});

test('🖼️ 화면 — o.big 없이 고르면 저장한 그림 · 고를 포켓몬이 없으면 바로 unplayed', async (t) => {
  const a = world(t, { noBig: true, pool: POOL(2, 0) });
  assert.equal(a.row.children.length, 2, '둘뿐이면 둘');
  const id = Number(a.row.children[0].attrs['aria-label'].slice(1));
  for (const b of a.row.children) b.children[0].fire('load');
  a.row.children[0].fire('click');
  await a.flush();
  const own = a.img(`u${id}`);
  assert.notEqual(own.className, 'gj-who-img');
  own.fire('load');
  await a.flush();
  assert.equal(a.pieces().length, JIG_N);
});

test('🖼️ 화면 — 고를 포켓몬이 없으면 바로 unplayed', async (t) => {
  const z = world(t, { pool: [] });
  z.adv(50);
  await z.flush();
  assert.equal(z.st.over && z.st.over.unplayed, true);
});

test('★ 🖼️ 화면 — 끄던 중에 앱을 내리면 숨기기 전에 그 자리에 놓는다 · 숨긴 동안 온 끝 신호는 무시 · 숨긴 시간은 완성 기록에 안 든다 (🔍 Codex 143차 #1)', async (t) => {
  const w = world(t);
  const id = Number(w.row.children[0].attrs['aria-label'].slice(1));
  await pickAndBuild(w, 0, `big${id}`);
  w.adv(850);
  // 먼 조각을 끄다가 내림 → 끈 자리에 놓이고 붙지 않음 · 숨긴 동안의 pointerup은 무시 · 돌아오면 다시 끌 수 있다
  const h0 = w.pieces()[0].children[1];
  h0.fire('pointerdown', { pointerId: 1, clientX: 0, clientY: 0 });
  h0.fire('pointermove', { pointerId: 1, clientX: 40, clientY: 5 });
  const movedLeft = w.pieces()[0].style.left;
  w.hide(true);
  assert.ok(!w.pieces()[0].className.includes('is-drag'), '숨기기 전에 놓았다');
  h0.fire('pointerup', { pointerId: 1, clientX: 60, clientY: 30 });
  assert.equal(w.pieces()[0].style.left, movedLeft, '숨긴 동안 온 끝 신호로 옮기지 않는다');
  w.hide(false);
  dragTo(w, 0, targetOf(0).x, targetOf(0).y);
  assert.ok(w.pieces()[0].className.includes('is-done'), '돌아오면 다시 끌린다');
  // 마지막 조각을 제자리 위까지 끈 채 내림 → 숨기기 전에 붙어 다 맞춤 · 숨긴 60초는 안 듦 · 뒤늦은 pointercancel 무시
  w.adv(4000);
  for (let i = 1; i < JIG_N - 1; i++) dragTo(w, i, targetOf(i).x, targetOf(i).y);
  const last = JIG_N - 1;
  const pc = w.pieces()[last];
  const hl = pc.children[1];
  const left = parseFloat(pc.style.left) + TAB * CELL_W;
  const top = parseFloat(pc.style.top) + TAB * CELL_H;
  hl.fire('pointerdown', { pointerId: 2, clientX: 0, clientY: 0 });
  hl.fire('pointermove', { pointerId: 2, clientX: targetOf(last).x - left, clientY: (targetOf(last).y - top) / 2 });
  w.hide(true);
  assert.equal(w.banner.textContent, '완성!', '숨기기 전에 다 맞춤');
  w.adv(60_000);
  hl.fire('pointercancel', { pointerId: 2 });
  w.hide(false);
  w.adv(2300);
  await w.flush();
  assert.deepEqual(w.st.over, { score: JIG_N, quit: false, sec: 4 });
});

test('🖼️ 화면 — pointerup 뒤 따라오는 lostpointercapture·pointercancel은 한 번 더 놓지 않는다', async (t) => {
  const w = world(t);
  const id = Number(w.row.children[1].attrs['aria-label'].slice(1));
  await pickAndBuild(w, 1, `big${id}`);
  w.adv(850);
  const pc = dragTo(w, 6, targetOf(6).x + 1, targetOf(6).y + 1);
  assert.equal(w.top.children[0].textContent, '⭐ 1');
  pc.children[1].fire('lostpointercapture', { pointerId: 1 });
  pc.children[1].fire('pointercancel', { pointerId: 1 });
  assert.equal(w.top.children[0].textContent, '⭐ 1', '한 번만 셈');
  const far = dragTo(w, 7, 50, 50);
  const at = far.style.left;
  far.children[1].fire('lostpointercapture', { pointerId: 1 });
  far.children[1].fire('pointermove', { pointerId: 1, clientX: 30, clientY: 30 });
  assert.equal(far.style.left, at, '놓은 뒤의 움직임·끝 신호로 안 옮긴다');
});

test('🖼️ 화면 — ✕ 뒤 늦게 뜬 그림은 판을 안 깐다', async (t) => {
  const b = world(t);
  const bid = Number(b.row.children[0].attrs['aria-label'].slice(1));
  for (const x of b.row.children) x.children[0].fire('load');
  b.row.children[0].fire('click');
  await b.flush();
  b.h.stop();
  await b.flush();
  b.img(`big${bid}`).fire('load');
  await b.flush();
  assert.equal(b.pieces().length, 0, '✕ 뒤엔 판을 안 깐다');
  assert.deepEqual(b.st.over, { score: 0, quit: true });
});

test('🖼️ 화면 — 앱을 내려 둔 동안은 걸린 시간에 안 들어간다 · 내려 둔 동안은 못 끈다 · 두 번째 손가락은 무시', async (t) => {
  const w = world(t);
  const id = Number(w.row.children[0].attrs['aria-label'].slice(1));
  await pickAndBuild(w, 0, `big${id}`);
  w.adv(850);
  w.adv(5000);
  w.hide(true);
  const before = w.pieces()[0].style.left;
  dragTo(w, 0, targetOf(0).x, targetOf(0).y);
  assert.equal(w.pieces()[0].style.left, before, '내려 둔 동안은 못 끈다');
  w.adv(60_000);
  w.hide(false);
  // 두 손가락 — 처음 손가락만
  const h0 = w.pieces()[0].children[1];
  const h1 = w.pieces()[1].children[1];
  h0.fire('pointerdown', { pointerId: 1, clientX: 0, clientY: 0 });
  h1.fire('pointerdown', { pointerId: 2, clientX: 0, clientY: 0 });
  assert.ok(w.pieces()[0].className.includes('is-drag'));
  assert.ok(!w.pieces()[1].className.includes('is-drag'), '두 번째 조각은 안 잡힘');
  h0.fire('pointermove', { pointerId: 2, clientX: 30, clientY: 10 });
  assert.equal(w.pieces()[0].style.left, before, '다른 손가락의 움직임은 무시');
  h0.fire('pointercancel', { pointerId: 1 }); // 끊김 — 마지막 자리에 놓는다
  assert.ok(!w.pieces()[0].className.includes('is-drag'));
  w.adv(3000);
  for (let i = 0; i < JIG_N; i++) dragTo(w, i, targetOf(i).x, targetOf(i).y);
  w.adv(2300);
  await w.flush();
  assert.equal(w.st.over.sec, 8, '5초 + 3초 (내려 둔 60초는 빼고)');
});
