// 🎮 게임기 미니 게임 3단계 (v309 · 2026-10-21 아버님 "다음 진행하자" → 물음 둘 모두 추천안) — node --test tests/minigame309.test.js
// 🃏 포켓몬 짝 맞추기(잡은 포켓몬 카드 · 60초 동안 짝 몇 개나 · 깔릴 때마다 2초 앞면) · 🍓 나무열매 받기(끌기 · 🍓⭐1 · ✨⭐3 · ⚡ 찌릿 1초)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GAMES, gameById } from '../js/minigame.js';
import { PAIR_SEC, PAIR_PAIRS, PEEK_MS, MISS_MS, CLEAR_MS, pairPick, pairDeal, pairStart, pairTap, pairTick, pairShift, runPair } from '../js/gamepair.js';
import {
  BERRY_SEC, BERRY_ZAP_MS, BERRY_W, BERRY_H, CATCH_Y, CATCH_HALF, X_MIN, X_MAX, BERRY_KINDS,
  berryPace, berryKind, berryStart, berryCatches, berryTick, berryMove, berryShift, runBerry,
} from '../js/gameberry.js';

const src = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
function seeded(seed = 7) {
  let x = seed >>> 0;
  return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 2 ** 32; };
}
const SEEDS = [1, 7, 42, 2026, 99999, 31337, 5, 777];
/** 카드 포켓몬 — 앞의 mineN마리가 잡은 것 */
const POOL = (n = 20, mineN = 8) => Array.from({ length: n }, (_, i) => ({ id: i + 1, ko: `몬${i + 1}`, url: `u${i + 1}`, mine: i < mineN }));

// ───────────────────── 목록 · 게임기 화면 연결 ─────────────────────

test('🎮 v309 게임 목록 — 🃏 짝 맞추기 60초 · 🍓 나무열매 받기 30초 · 화면(RUNNERS)·준비(prep)', () => {
  assert.deepEqual(GAMES.map((g) => g.id), ['dig', 'run', 'shadow', 'pair', 'berry']);
  assert.deepEqual([gameById('pair').sec, gameById('berry').sec], [PAIR_SEC, BERRY_SEC]);
  assert.deepEqual([PAIR_SEC, BERRY_SEC, PAIR_PAIRS, PEEK_MS], [60, 30, 6, 2000], '아버님 고른 60초 · 2초 앞면');
  for (const g of GAMES) {
    assert.match(g.id, /^[a-z]{2,12}$/);
    assert.ok(!/\d/.test(g.how), `${g.id}: 아이가 보는 설명에 숫자 없음`);
  }
  const gv = src('js/gameview.js');
  assert.match(gv, /\n {2}pair: \{ run: runPair, prep: \(\) => pairPrep\(\), none: '[^']+' \},/);
  assert.match(gv, /\n {2}berry: \{ run: runBerry, prep: async \(\) => \(\{ art: await artFor\(\[BERRY_KINDS\.voltorb\.id\]\) \}\) \},/);
  // 🃏 카드 — 잡은 포켓몬 먼저 · 그림 없는 잡은 포켓몬은 몇 장 받아 봄(기다리는 끝) · 여섯이 안 되면 null
  const prep = gv.slice(gv.indexOf('async function pairPrep('), gv.indexOf('\n}\n', gv.indexOf('async function pairPrep(')));
  assert.match(prep, /const mine = new Set\(ownedMonIds\(\)\);/);
  assert.match(prep, /\(\{ \.\.\.p, mine: mine\.has\(p\.id\) \}\)/);
  assert.match(prep, /await Promise\.race\(\[ensureCast\(shadowShuffle\(gap\)\.slice\(0, PAIR_PAIRS \* 2\)\)\.catch\(\(\) => \[\]\), wait\(ART_WAIT_MS\)\]\);/);
  assert.match(prep, /return pool\.length >= PAIR_PAIRS \? \{ pool \} : null;/);
  for (const f of ['js/gamepair.js', 'js/gameberry.js']) assert.ok(!/coins|addCoins|applyPurchase|items\[|xp\.js|db\.js/.test(src(f)), `${f}는 저장·가방을 안 만진다`);
});

test('🎮 서비스워커 v309 · 새 파일 둘 · css (끌 때 화면이 안 밀리게)', () => {
  const sw = src('sw.js');
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(sw) || [])[1]) >= 309, 'sw v309 이상');
  for (const f of ['gamepair.js', 'gameberry.js']) assert.ok(sw.includes(`'./js/${f}'`), f);
  const css = src('css/style.css');
  assert.match(css, /\.gb-field \{[^}]*touch-action: none;/, '🍓 마당을 끌어도 카드가 안 밀린다');
  assert.match(css, /\.gp-card\.is-open \.gp-in, \.gp-grid\.is-peek \.gp-in \{ transform: rotateY\(180deg\); \}/, '열림·앞면 보여 주기');
  assert.match(css, /backface-visibility: hidden;/);
  assert.ok(css.includes('.gp-front .gp-img { display: none; }') && css.includes('.gp-front.is-ready .gp-img { display: block; }') && css.includes('.gp-front.is-ready .gp-name { display: none; }'), '앞면은 이름 먼저 · 그림이 뜨면 그림 (🔍 Codex 115차 #3)');
});

// ───────────────────── 🃏 짝 맞추기 — 엔진 ─────────────────────

test('🃏 카드 포켓몬 — 잡은 포켓몬 먼저(여섯 넘으면 그중에서 섞어) · 모자라면 다른 포켓몬으로 · 같은 id 한 번 · 여섯이 안 되면 null', () => {
  const rng = seeded(3);
  const seen = new Set();
  for (let k = 0; k < 40; k++) {
    const ids = pairPick(POOL(20, 8), rng);
    assert.equal(ids.length, PAIR_PAIRS);
    assert.equal(new Set(ids).size, PAIR_PAIRS);
    assert.ok(ids.every((id) => id <= 8), '잡은 게 여섯 넘으면 다 잡은 것');
    ids.forEach((id) => seen.add(id));
  }
  assert.equal(seen.size, 8, '잡은 여덟이 고루 나온다');
  const few = pairPick(POOL(20, 2), rng);
  assert.equal(few.filter((id) => id <= 2).length, 2, '잡은 둘은 꼭 들어가고');
  assert.equal(few.length, PAIR_PAIRS, '나머지는 다른 포켓몬으로 채움');
  assert.equal(pairPick(POOL(5, 5), rng), null, '다섯뿐이면 못 깐다');
  assert.equal(pairPick([...POOL(3, 3), ...POOL(3, 3)], rng), null, '같은 id는 한 번만 센다');
  assert.equal(pairPick(null, rng), null);
  assert.equal(pairPick([{ id: 0 }, { id: -2 }, { id: 'x' }, { id: 2.5 }, ...POOL(5, 0)], rng), null, '깨진 id는 안 센다');
});

test('🃏 카드 깔기 — 열두 장 · 포켓몬마다 두 장 · 섞임 · 2초 앞면부터', () => {
  const rng = seeded(5);
  const s = pairStart(1000, POOL(), rng);
  assert.equal(s.cards.length, 12);
  const count = {};
  for (const c of s.cards) count[c.id] = (count[c.id] || 0) + 1;
  assert.ok(Object.values(count).every((n) => n === 2) && Object.keys(count).length === 6);
  assert.ok(s.cards.every((c, i) => c.i === i && !c.open && !c.done));
  assert.equal(s.peekUntil, 1000 + PEEK_MS);
  assert.equal(s.boards, 1);
  const pos = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let k = 0; k < 300; k++) for (const c of pairStart(0, POOL(6, 6), rng).cards) if (c.id === 1) pos[c.i] += 1; // 두 장 다 센다 (기대 자리마다 50)
  assert.ok(pos.every((n) => n > 25), `같은 포켓몬이 늘 같은 자리에 있지 않다 ${pos}`);
  assert.deepEqual(pairStart(0, POOL(4, 4), rng).cards, [], '모자라면 카드 없이');
  // 짝 두 장이 늘 반 칸(여섯 칸) 떨어져 있지 않다 — 앞 여섯 장에 짝이 함께 있는 판이 흔하다
  let together = 0;
  for (let k = 0; k < 200; k++) { const c = pairStart(0, POOL(), rng).cards.slice(0, 6).map((x) => x.id); if (new Set(c).size < 6) together += 1; }
  assert.ok(together > 100, `카드를 섞는다 (${together}/200)`);
});

/** 짝 둘(같은 포켓몬 두 장의 자리)을 찾는다 */
const twins = (s, id) => s.cards.filter((c) => c.id === id).map((c) => c.i);
const other = (s, id) => s.cards.find((c) => c.id !== id && !c.done && !c.open).i;

test('🃏 누르기 — 앞면 보여 주는 동안 안 됨 · 한 장 뒤집기 · 짝이면 ⭐+1 · 아니면 0.8초 뒤 덮음(감점 없음 · 그동안 안 받음) · 열린 카드 다시 눌러도 그대로', () => {
  const rng = seeded(9);
  const s = pairStart(0, POOL(), rng);
  const id0 = s.cards[0].id;
  assert.equal(pairTap(s, 0, PEEK_MS - 1).kind, 'peek');
  assert.equal(s.cards[0].open, false);
  const T = PEEK_MS;
  assert.deepEqual(pairTap(s, 0, T), { kind: 'flip', i: 0, shut: null });
  assert.equal(pairTap(s, 0, T + 10).kind, 'open', '같은 카드 두 번은 짝이 아니다');
  const [, b] = twins(s, id0);
  const m = pairTap(s, b, T + 20);
  assert.deepEqual([m.kind, m.pts, m.j], ['match', 1, 0]);
  assert.deepEqual([s.score, s.pairs, s.cards[0].done, s.cards[b].done], [1, 1, true, true]);
  assert.equal(pairTap(s, b, T + 30).kind, 'open', '맞힌 카드는 그대로');
  // 짝이 아님
  const x = other(s, id0);
  pairTap(s, x, T + 100);
  const y = s.cards.find((c) => !c.done && !c.open && c.id !== s.cards[x].id).i;
  const miss = pairTap(s, y, T + 110);
  assert.equal(miss.kind, 'miss');
  assert.deepEqual([s.score, s.misses], [1, 1], '틀려도 점수 그대로');
  const z = s.cards.find((c) => !c.done && !c.open).i;
  assert.equal(pairTap(s, z, T + 110 + MISS_MS - 1).kind, 'busy', '틀린 짝을 보여 주는 동안은 안 받음');
  assert.equal(s.cards[z].open, false);
  assert.equal(pairTick(s, T + 110 + MISS_MS - 1, rng).shut, null);
  assert.deepEqual(pairTick(s, T + 110 + MISS_MS, rng).shut, [x, y], '0.8초 뒤 덮는다');
  assert.deepEqual([s.cards[x].open, s.cards[y].open], [false, false]);
  assert.equal(pairTap(s, z, s.end).kind, 'over');
});

test('🃏 덮을 때가 지난 틀린 짝은 누를 때 먼저 덮는다(시계가 늦어도)', () => {
  const rng = seeded(4);
  const s = pairStart(0, POOL(), rng);
  const a = 0;
  const b = s.cards.find((c) => c.id !== s.cards[0].id).i;
  pairTap(s, a, PEEK_MS);
  pairTap(s, b, PEEK_MS + 10);
  const c = s.cards.find((x) => x.i !== a && x.i !== b).i;
  const r = pairTap(s, c, PEEK_MS + 10 + MISS_MS);
  assert.deepEqual(r, { kind: 'flip', i: c, shut: [a, b] });
  assert.deepEqual([s.cards[a].open, s.cards[b].open, s.cards[c].open], [false, false, true]);
});

test('🃏 다 맞히면 0.7초 뒤 새 카드 열두 장(그동안 안 받음) · 새 카드도 2초 앞면 · 끝난 뒤엔 안 깜', () => {
  const rng = seeded(6);
  const s = pairStart(0, POOL(), rng);
  let t = PEEK_MS;
  let last = null;
  for (const id of [...new Set(s.cards.map((c) => c.id))]) {
    const [a, b] = twins(s, id);
    pairTap(s, a, t);
    last = pairTap(s, b, t + 1);
    t += 10;
  }
  assert.equal(last.kind, 'clear');
  assert.equal(s.score, 6);
  assert.equal(s.dealAt, t - 10 + 1 + CLEAR_MS);
  assert.equal(pairTap(s, 0, t).kind, 'busy', '새 카드를 기다리는 동안');
  assert.equal(pairTick(s, s.dealAt - 1, rng).dealt, false);
  const at = s.dealAt;
  assert.equal(pairTick(s, at, rng).dealt, true);
  assert.deepEqual([s.boards, s.cards.length, s.dealAt, s.peekUntil], [2, 12, 0, at + PEEK_MS]);
  assert.ok(s.cards.every((c) => !c.open && !c.done));
  assert.equal(pairTap(s, 0, at + 1).kind, 'peek');
  // 끝 무렵에 다 맞혀도 끝난 뒤에는 안 깐다
  const e = pairStart(0, POOL(), rng);
  e.dealAt = e.end - 1;
  e.cards.forEach((c) => { c.done = true; });
  assert.equal(pairTick(e, e.end, rng).dealt, false);
});

test('🃏 60초 한 판(가짜 시계 · 씨앗 여덟) — 다 기억하는 손 ⭐40 넘게 · 아무거나 누르는 손도 점수는 줄지 않고 틀린 짝은 셈만', () => {
  for (const seed of SEEDS) {
    for (const mode of ['memory', 'random']) {
      const rng = seeded(seed);
      const s = pairStart(0, POOL(), rng);
      let known = new Map();
      let next = PEEK_MS + 300;
      let prev = 0;
      for (let t = 0; t <= PAIR_SEC * 1000 + 500; t += 50) {
        if (pairTick(s, t, rng).dealt) { known = new Map(); next = t + PEEK_MS + 300; }
        assert.ok(s.score >= prev);
        prev = s.score;
        if (t < next) continue;
        if (mode === 'memory' && !known.size) s.cards.forEach((c) => known.set(c.i, c.id));
        const closed = s.cards.filter((c) => !c.open && !c.done);
        if (!closed.length) continue;
        let pick = closed[Math.floor(rng() * closed.length)];
        if (mode === 'memory' && s.first >= 0) pick = closed.find((c) => known.get(c.i) === s.cards[s.first].id) || pick;
        const r = pairTap(s, pick.i, t);
        if (['flip', 'match', 'clear', 'miss'].includes(r.kind)) next = t + 450;
      }
      if (mode === 'memory') {
        assert.equal(s.misses, 0, `seed ${seed}`);
        assert.ok(s.score >= 40 && s.boards >= 7, `seed ${seed}: ⭐ ${s.score} · 판 ${s.boards}`);
      } else {
        assert.ok(s.misses > 10 && s.score >= 1 && s.score < 20, `seed ${seed}: ⭐ ${s.score} · 틀림 ${s.misses}`);
      }
      assert.equal(s.score, s.pairs);
    }
  }
});

test('🃏 앱을 내렸다 돌아오면(pairShift) 남은 시간·앞면·덮기·새 카드 때가 그대로', () => {
  const s = pairStart(1000, POOL(), seeded(2));
  s.lock = 1500; s.dealAt = 1700;
  pairShift(s, 4000);
  assert.deepEqual([s.t0, s.end, s.peekUntil, s.lock, s.dealAt], [5000, 5000 + PAIR_SEC * 1000, 7000, 5500, 5700]);
  const b = JSON.stringify(s);
  pairShift(s, 0); pairShift(s, -1); pairShift(s, NaN);
  assert.equal(JSON.stringify(s), b);
  const z = pairStart(0, POOL(), seeded(2));
  pairShift(z, 10);
  assert.deepEqual([z.lock, z.dealAt], [0, 0]);
});

// ───────────────────── 🍓 나무열매 받기 — 엔진 ─────────────────────

test('🍓 빠르기 — 끝으로 갈수록 자주·빨리 · 떨어지는 것: 황금 8% · 찌리리공은 3초 뒤부터 22% · 마당 크기', () => {
  assert.deepEqual(berryPace(0), { gap: 900, vy: 32 });
  assert.deepEqual(berryPace(BERRY_SEC * 1000), { gap: 450, vy: 55 });
  assert.deepEqual(berryPace(99e9), berryPace(BERRY_SEC * 1000));
  for (let ms = 0; ms < BERRY_SEC * 1000; ms += 1000) assert.ok(berryPace(ms + 1000).gap <= berryPace(ms).gap && berryPace(ms + 1000).vy >= berryPace(ms).vy);
  assert.equal(berryKind(0.05, 0), 'gold');
  assert.equal(berryKind(0.2, 2999), 'berry', '3초 전엔 찌리리공 없음');
  assert.equal(berryKind(0.2, 3000), 'voltorb');
  assert.equal(berryKind(0.31, 9000), 'berry');
  assert.deepEqual([BERRY_W, BERRY_H, CATCH_Y, CATCH_HALF, X_MIN, X_MAX, BERRY_ZAP_MS], [100, 75, 62, 9, 8, 92, 1000]);
  assert.deepEqual(Object.fromEntries(Object.entries(BERRY_KINDS).map(([k, v]) => [k, v.pts])), { berry: 1, gold: 3, voltorb: 0 });
  assert.equal(BERRY_KINDS.voltorb.id, 100);
});

test('🍓 받기 — 받는 높이를 지나갈 때 받는 쪽 안이면 받음(가장자리까지) · 밖이면 지나감 · 한 번에 1초를 건너뛰어도 받는다', () => {
  const s = berryStart(0);
  assert.equal(berryCatches(s, { x: 50 + CATCH_HALF, y: CATCH_Y }, CATCH_Y - 1), true, '가장자리');
  assert.equal(berryCatches(s, { x: 50 + CATCH_HALF + 0.1, y: CATCH_Y }, CATCH_Y - 1), false);
  assert.equal(berryCatches(s, { x: 50, y: CATCH_Y + 1 }, CATCH_Y), false, '이미 지나간 것은 다시 안 받음');
  const b = berryStart(0);
  b.next = 1e12;
  b.objs.push({ n: 1, kind: 'berry', x: 50, y: 20, vy: 50 });
  const ev = berryTick(b, 1000, seeded(1));
  assert.equal(ev.got.length, 1, '1초를 한 번에 건너뛰어도 받는다');
  assert.deepEqual([b.score, b.berries], [1, 1]);
  const many = berryStart(0);
  assert.ok(berryTick(many, 3000, seeded(2)).added.length >= 3, '3초를 한 번에 건너뛰어도 그동안 떨어질 것은 다 떨어진다');
  const m = berryStart(0);
  m.next = 1e12;
  m.objs.push({ n: 2, kind: 'gold', x: 80, y: 20, vy: 50 });
  assert.equal(berryTick(m, 3000, seeded(1)).gone.length, 1, '밖이면 바닥 아래로 사라진다');
  assert.deepEqual([m.score, m.objs.length], [0, 0]);
});

test('🍓 찌리리공 — 받으면 찌릿 1초(못 움직임 · 점수 그대로) · 황금 열매 ⭐3 · 끝을 넘지 않음 · 옮기기는 마당 안에서만', () => {
  const s = berryStart(0);
  s.next = 1e12;
  s.score = 4;
  s.objs.push({ n: 1, kind: 'voltorb', x: 50, y: CATCH_Y - 1, vy: 40 });
  const ev = berryTick(s, 100, seeded(1));
  assert.equal(ev.zaps.length, 1);
  assert.equal(s.score, 4, '찌릿은 점수를 안 깎는다');
  const zt = s.zapUntil;
  assert.ok(zt > 0 && zt <= 100 + BERRY_ZAP_MS);
  assert.equal(berryMove(s, 20, zt - 1), 'zapped');
  assert.equal(s.x, 50, '찌릿 동안은 못 움직임');
  assert.equal(berryMove(s, 20, zt), 'move');
  assert.equal(s.x, 20);
  berryMove(s, -50, zt + 1);
  assert.equal(s.x, X_MIN, '왼쪽 끝');
  berryMove(s, 500, zt + 2);
  assert.equal(s.x, X_MAX, '오른쪽 끝');
  berryMove(s, NaN, zt + 3);
  assert.equal(s.x, X_MAX, '깨진 자리는 그대로');
  s.objs.push({ n: 2, kind: 'gold', x: X_MAX, y: CATCH_Y - 1, vy: 40 });
  berryTick(s, zt + 200, seeded(1));
  assert.deepEqual([s.score, s.golds], [7, 1]);
  assert.equal(berryMove(s, 50, s.end), 'over');
  berryTick(s, s.end + 5000, seeded(1));
  assert.equal(s.last, s.end, '판 끝에서 멈춘다');
});

test('🍓 30초 한 판(가짜 시계 · 씨앗 여덟) — 따라가는 손이 가만히 있는 손보다 훨씬 많이 · 점수 = 열매 + 황금×3 · 점수는 줄지 않음', () => {
  for (const seed of SEEDS) {
    const res = {};
    for (const mode of ['follow', 'still']) {
      const rng = seeded(seed);
      const s = berryStart(0);
      let prev = 0;
      const kinds = { berry: 0, gold: 0, voltorb: 0 };
      for (let t = 0; t <= BERRY_SEC * 1000 + 500; t += 33) {
        const ev = berryTick(s, t, rng);
        for (const o of ev.added) {
          kinds[o.kind] += 1;
          assert.ok(o.x >= X_MIN && o.x <= X_MAX && o.y < 0, '마당 위 안쪽에서 나온다');
          assert.ok(o.kind !== 'voltorb' || s.last - s.t0 >= 3000, '찌리리공은 3초 뒤');
        }
        assert.ok(s.score >= prev);
        prev = s.score;
        if (mode === 'follow') {
          const good = s.objs.filter((o) => o.kind !== 'voltorb').sort((a, b) => b.y - a.y)[0];
          if (good) berryMove(s, s.x + Math.max(-4, Math.min(4, good.x - s.x)), t);
        }
      }
      assert.equal(s.score, s.berries + 3 * s.golds);
      assert.ok(kinds.berry > kinds.voltorb && kinds.voltorb > 0, `seed ${seed}: ${JSON.stringify(kinds)}`);
      assert.ok(kinds.berry + kinds.gold + kinds.voltorb >= 35 && kinds.berry + kinds.gold + kinds.voltorb <= 60);
      res[mode] = s.score;
    }
    assert.ok(res.follow >= 25 && res.follow > res.still * 2, `seed ${seed}: 따라감 ${res.follow} · 가만히 ${res.still}`);
  }
});

test('🍓 시계 — 깨진 때·뒤로 간 때는 안 움직임 · 앱을 내렸다 돌아오면(berryShift) 남은 시간·다음 것·찌릿 그대로', () => {
  const s = berryStart(1000);
  berryTick(s, 2000, seeded(1));
  const snap = JSON.stringify(s);
  berryTick(s, NaN, seeded(1));
  berryTick(s, 1500, seeded(1));
  assert.equal(JSON.stringify(s), snap);
  s.zapUntil = 2500;
  const next = s.next;
  berryShift(s, 5000);
  assert.deepEqual([s.t0, s.end, s.last, s.next, s.zapUntil], [6000, 6000 + BERRY_SEC * 1000, 7000, next + 5000, 7500]);
  const b = JSON.stringify(s);
  berryShift(s, 0); berryShift(s, -2); berryShift(s, NaN);
  assert.equal(JSON.stringify(s), b);
  const z = berryStart(0);
  berryShift(z, 10);
  assert.equal(z.zapUntil, 0);
});

// ───────────────────── 화면 (가짜 화면 · 가짜 시계) ─────────────────────

class FakeEl {
  constructor(tag) { this.tagName = String(tag).toUpperCase(); this.className = ''; this.children = []; this.listeners = {}; this.style = { setProperty() {} }; this.attrs = {}; this.textContent = ''; this.html = ''; }
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
  getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 75 }; }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((x) => x !== this); }
}
function world(t, make) {
  const doc = { hidden: false, listeners: {}, createElement: (tag) => new FakeEl(tag),
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
  const h = make(stage);
  const st = { over: null };
  h.done.then((r) => { st.over = r; });
  const adv = (ms) => { for (let k = 0; k < ms; k += 50) { clock += 50; t.mock.timers.tick(50); } };
  const flush = () => new Promise((r) => setImmediate(r));
  const hide = (on) => { doc.hidden = on; doc.fire('visibilitychange'); };
  return { stage, h, doc, adv, flush, st, hide };
}

test('🃏 화면 — 처음 2초는 앞면(누르면 안 됨) · 뒤집기 · 짝이면 ⭐·초록 · 아니면 0.8초 뒤 덮음 · 다 맞히면 새 카드 · 60초 뒤 끝', async (t) => {
  const w = world(t, (stage) => runPair(stage, { pool: POOL(), rng: seeded(8), hero: { html: '<b>파트너</b>' } }));
  const root = w.stage.children[0];
  const [top, grid, pal] = root.children;
  const btn = (i) => grid.children[i];
  const idOf = (i) => Number(btn(i).children[0].children[1].children[0].src.slice(1));
  assert.equal(pal.innerHTML, '<b>파트너</b>');
  w.adv(850);
  assert.ok(grid.classList.contains('is-peek'), '깔리면 앞면부터');
  const ids = Array.from({ length: 12 }, (_, i) => idOf(i));
  assert.ok(ids.every((id) => id >= 1 && id <= 8), '잡은 포켓몬 카드');
  btn(0).fire('click');
  assert.equal(btn(0).classList.contains('is-open'), false, '앞면 보여 주는 동안은 안 뒤집힘');
  w.adv(PEEK_MS);
  assert.equal(grid.classList.contains('is-peek'), false, '2초 뒤 덮음');
  // 짝
  const j = ids.findIndex((id, k) => k > 0 && id === ids[0]);
  btn(0).fire('click');
  assert.ok(btn(0).classList.contains('is-open'));
  assert.equal(btn(0).attrs['aria-label'], `몬${ids[0]}`, '열린 카드는 이름으로 읽힌다');
  btn(j).fire('click');
  assert.ok(btn(0).classList.contains('is-done') && btn(j).classList.contains('is-done'));
  assert.equal(top.children[0].textContent, '⭐ 1');
  // 짝 아님
  const a = ids.findIndex((id, k) => k !== 0 && k !== j);
  const b = ids.findIndex((id, k) => k !== 0 && k !== j && k !== a && id !== ids[a]);
  btn(a).fire('click');
  btn(b).fire('click');
  assert.ok(btn(a).classList.contains('is-open') && btn(b).classList.contains('is-open'));
  w.adv(MISS_MS + 100);
  assert.ok(!btn(a).classList.contains('is-open') && !btn(b).classList.contains('is-open'), '0.8초 뒤 덮음');
  assert.equal(btn(a).attrs['aria-label'], `카드 ${a + 1}`);
  assert.equal(top.children[0].textContent, '⭐ 1', '틀려도 점수 그대로');
  // 나머지를 다 맞히면 새 카드
  for (const id of [...new Set(ids)].filter((x) => x !== ids[0])) {
    const [p, q] = ids.map((x, k) => (x === id ? k : -1)).filter((k) => k >= 0);
    btn(p).fire('click');
    btn(q).fire('click');
  }
  assert.equal(top.children[0].textContent, '⭐ 6');
  w.adv(CLEAR_MS + 100);
  assert.ok(grid.classList.contains('is-peek'), '새 카드도 앞면부터');
  assert.ok(Array.from({ length: 12 }, (_, i) => btn(i)).every((x) => !x.classList.contains('is-done') && !x.classList.contains('is-open')), '새 카드는 다 덮인 채');
  // 앱을 내렸다 돌아와도 남은 시간 그대로
  w.hide(true);
  w.adv(90000);
  await w.flush();
  assert.equal(w.st.over, null);
  w.hide(false);
  w.adv(PAIR_SEC * 1000);
  await w.flush();
  assert.deepEqual(w.st.over, { score: 6, quit: false });
  assert.ok(btn(0).disabled, '끝나면 못 누름');
  assert.equal((w.doc.listeners.visibilitychange || []).length, 0);
});

test('🃏 화면 — 앞면엔 이름이 먼저 · 그림이 뜨면 그림으로 · 앞면 보여 주는 동안은 이름으로 읽힘 · 앞 판 그림의 늦은 load·error는 새 카드를 안 바꿈 (🔍 Codex 115차 #2·#3)', async (t) => {
  const w = world(t, (stage) => runPair(stage, { pool: POOL(), rng: seeded(8) }));
  w.adv(850);
  const grid = w.stage.children[0].children[1];
  const btn = (i) => grid.children[i];
  const front = (i) => btn(i).children[0].children[1];
  const f0 = front(0);
  assert.deepEqual(f0.children.map((x) => x.className), ['gp-img', 'gp-name'], '그림 + 이름');
  assert.match(f0.children[1].textContent, /^몬\d$/);
  assert.equal(f0.classList.contains('is-ready'), false, '그림이 뜨기 전엔 이름이 보인다');
  assert.match(btn(0).attrs['aria-label'], /^몬\d$/, '앞면 보여 주는 동안은 이름으로 읽힘');
  const oldImg = f0.children[0];
  oldImg.fire('load');
  assert.ok(f0.classList.contains('is-ready'), '그림이 뜨면 그림으로');
  w.adv(2000);
  assert.equal(btn(0).attrs['aria-label'], '카드 1', '덮이면 「카드 n」');
  // 다 맞혀 새 카드를 깐다
  const ids = Array.from({ length: 12 }, (_, i) => front(i).children[1].textContent);
  for (const ko of [...new Set(ids)]) {
    const [p, q] = ids.map((x, k) => (x === ko ? k : -1)).filter((k) => k >= 0);
    btn(p).fire('click');
    btn(q).fire('click');
  }
  w.adv(800);
  const nf = front(0);
  const kids = nf.children.map((x) => x.className).join(',');
  assert.equal(nf.classList.contains('is-ready'), false, '새 카드는 이름부터');
  oldImg.fire('load');
  oldImg.fire('error');
  assert.equal(nf.classList.contains('is-ready'), false, '앞 판 그림의 늦은 load는 무시');
  assert.equal(nf.children.map((x) => x.className).join(','), kids, '앞 판 그림의 늦은 error도 무시');
  w.h.stop();
});

test('🃏 화면 — 카드 그림이 깨지면 이름으로 · 「준비!」 뒤 그만두면 그때 점수로', async (t) => {
  const w = world(t, (stage) => runPair(stage, { pool: POOL(), rng: seeded(8) }));
  w.adv(850);
  const front = w.stage.children[0].children[1].children[0].children[0].children[1];
  const img = front.children[0];
  img.fire('error');
  assert.equal(front.children[0].className, 'gp-name');
  assert.match(front.children[0].textContent, /^몬\d$/);
  w.h.stop();
  await w.flush();
  assert.equal(w.st.over.quit, true);
});

test('🃏 화면 — 카드 포켓몬이 다섯뿐이면 빈 판으로 바로 끝', async (t) => {
  const v = world(t, (stage) => runPair(stage, { pool: POOL(5, 5), rng: seeded(8) }));
  v.adv(850);
  await v.flush();
  v.adv(1000);
  await v.flush();
  assert.deepEqual(v.st.over, { score: 0, quit: false });
});

test('🍓 화면 — 끌면 따라옴(놓으면 멈춤) · 화살표로도 · 「준비!」 때 내려도 안 끝남 · 30초 뒤 끝 · 듣기를 뗀다', async (t) => {
  const w = world(t, (stage) => runBerry(stage, { rng: seeded(4), hero: { html: '<img class="gd-pal-img">' }, art: {} }));
  const root = w.stage.children[0];
  const field = root.children[1];
  const layer = field.children[1];
  const me = field.children[2];
  assert.equal(me.children[0].innerHTML, '<img class="gd-pal-img">');
  assert.equal(field.tabIndex, 0);
  w.adv(400);
  w.hide(true);
  w.adv(40000);
  await w.flush();
  assert.equal(w.st.over, null, '숨은 동안 안 끝남');
  assert.equal(layer.children.length, 0, '숨은 동안 안 떨어짐');
  w.hide(false);
  w.adv(100);
  assert.equal(me.style.transform, 'translate3d(40.0px, 0, 0)', '가운데(50칸 − 반 폭 10칸)');
  field.fire('pointerdown', { clientX: 20, pointerId: 1 });
  assert.equal(me.style.transform, 'translate3d(10.0px, 0, 0)', '누른 자리로');
  field.fire('pointermove', { clientX: 70, pointerId: 1 });
  assert.equal(me.style.transform, 'translate3d(60.0px, 0, 0)', '끄는 대로');
  field.fire('pointerup', { pointerId: 1 });
  field.fire('pointermove', { clientX: 30, pointerId: 1 });
  assert.equal(me.style.transform, 'translate3d(60.0px, 0, 0)', '놓으면 안 따라옴');
  field.fire('keydown', { key: 'ArrowLeft' });
  assert.equal(me.style.transform, 'translate3d(50.0px, 0, 0)', '← 열 칸');
  field.fire('keydown', { key: 'a' });
  assert.equal(me.style.transform, 'translate3d(50.0px, 0, 0)');
  w.adv(2000);
  assert.ok(layer.children.length > 0, '돌아오면 떨어진다');
  w.adv(27000); // 돌아온 뒤 29.1초
  await w.flush();
  assert.equal(w.st.over, null);
  w.adv(2000); // 30초 + 「끝!」 0.9초
  await w.flush();
  assert.ok(w.st.over && w.st.over.quit === false);
  assert.match(root.children[0].children[0].textContent, new RegExp(`^⭐ ${w.st.over.score}$`));
  assert.equal((w.doc.listeners.visibilitychange || []).length, 0);
  field.fire('pointerdown', { clientX: 90, pointerId: 1 });
  assert.equal(me.style.transform, 'translate3d(50.0px, 0, 0)', '끝난 뒤엔 안 움직임');
});

test('🍓 화면 — 「준비!」 때 그만두면 안 열리고 듣기도 뗀다', async (t) => {
  const w = world(t, (stage) => runBerry(stage, { rng: seeded(4) }));
  w.adv(300);
  w.h.stop();
  await w.flush();
  assert.deepEqual(w.st.over, { score: 0, quit: true });
  w.adv(3000);
  assert.equal(w.stage.children[0].children[1].children[1].children.length, 0, '그만둔 판은 안 열림');
  assert.equal((w.doc.listeners.visibilitychange || []).length, 0);
});

test('🍓 화면 — 판 도중 그만두면(✕·집 닫기) 그때 점수로 · 그 뒤로 끌어도 안 움직임', async (t) => {
  const w = world(t, (stage) => runBerry(stage, { rng: seeded(4) }));
  const field = w.stage.children[0].children[1];
  const me = field.children[2];
  w.adv(5000);
  w.h.stop();
  await w.flush();
  assert.equal(w.st.over.quit, true);
  const at = me.style.transform;
  field.fire('pointerdown', { clientX: 10, pointerId: 1 });
  field.fire('keydown', { key: 'ArrowRight' });
  assert.equal(me.style.transform, at, '그만둔 뒤엔 안 움직임');
});

test('🍓 화면 — 찌리리공을 받으면 찌릿(못 움직임 · 「찌릿!」) · 받은 그림이 없으면 코드로 그린 찌리리공 · 받은 그림이 있으면 그것', async (t) => {
  const w = world(t, (stage) => runBerry(stage, { rng: seeded(11), art: { 100: 'blob:volt' } }));
  const root = w.stage.children[0];
  const field = root.children[1];
  const me = field.children[2];
  let zapped = false;
  let k = 0;
  // 찌리리공만 따라가서 받는다
  while (!zapped && k++ < 600) {
    w.adv(50);
    const layer = field.children[1];
    const volt = layer.children.find((e) => e.className.includes('is-voltorb') && !e.className.includes('is-got'));
    if (volt) {
      assert.equal(volt.children[0].src, 'blob:volt', '받은 그림');
      const x = Number((/translate3d\(([\d.-]+)px/.exec(volt.style.transform) || [])[1]) + 4;
      field.fire('pointerdown', { clientX: x, pointerId: 1 });
      field.fire('pointerup', { pointerId: 1 });
    }
    zapped = me.classList.contains('is-zap');
  }
  assert.ok(zapped, '찌릿');
  assert.ok(root.children[3].children.some((f) => f.textContent === '찌릿!'));
  const before = me.style.transform;
  field.fire('pointerdown', { clientX: 5, pointerId: 1 });
  assert.equal(me.style.transform, before, '찌릿 동안은 못 움직임');
  field.fire('pointerup', { pointerId: 1 });
  w.h.stop();
  const v = runBerry(new FakeEl('div'), { rng: seeded(11) });
  v.stop();
  const src309 = src('js/gameberry.js');
  assert.ok(src309.includes("e.innerHTML = ob.kind === 'voltorb' ? DIG_FALLBACK.voltorb : RUN_ART[ob.kind];"), '그림이 없으면 코드로 그린 찌리리공');
});

test('🍓 화면 — 받은 찌리리공 그림이 깨지면 코드로 그린 찌리리공 · 그 판의 다음 찌리리공도 처음부터 (🔍 Codex 115차 #5)', async (t) => {
  const w = world(t, (stage) => runBerry(stage, { rng: seeded(11), art: { 100: 'blob:volt' } }));
  const layer = w.stage.children[0].children[1].children[1];
  const volts = () => layer.children.filter((e) => e.className.includes('is-voltorb'));
  let k = 0;
  while (!volts().length && k++ < 400) w.adv(50);
  const first = volts()[0];
  assert.equal(first.children[0].src, 'blob:volt');
  first.children[0].fire('error');
  assert.match(first.innerHTML, /^<svg/, '깨지면 코드 그림');
  const seen = new Set([first]);
  let next = null;
  k = 0;
  while (!next && k++ < 600) { w.adv(50); next = volts().find((e) => !seen.has(e)); }
  assert.ok(next, '다음 찌리리공');
  assert.match(next.innerHTML, /^<svg/, '다음 것도 처음부터 코드 그림');
  w.h.stop();
});

test('🍓 화면 — 두 번째 손가락은 무시 · 두 번째 손가락을 떼도 첫 손가락 끌기는 그대로 · 앱을 내리면 끌기를 놓음 (🔍 Codex 115차 #4)', async (t) => {
  const w = world(t, (stage) => runBerry(stage, { rng: seeded(4) }));
  const field = w.stage.children[0].children[1];
  const me = field.children[2];
  w.adv(900);
  field.fire('pointerdown', { clientX: 20, pointerId: 1 });
  assert.equal(me.style.transform, 'translate3d(10.0px, 0, 0)');
  field.fire('pointerdown', { clientX: 80, pointerId: 2 });
  assert.equal(me.style.transform, 'translate3d(10.0px, 0, 0)', '두 번째 손가락은 무시');
  field.fire('pointermove', { clientX: 90, pointerId: 2 });
  assert.equal(me.style.transform, 'translate3d(10.0px, 0, 0)');
  field.fire('pointerup', { pointerId: 2 });
  field.fire('pointermove', { clientX: 60, pointerId: 1 });
  assert.equal(me.style.transform, 'translate3d(50.0px, 0, 0)', '첫 손가락은 계속 끈다');
  field.fire('lostpointercapture', { pointerId: 1 });
  field.fire('pointermove', { clientX: 30, pointerId: 1 });
  assert.equal(me.style.transform, 'translate3d(50.0px, 0, 0)', '손가락을 놓치면 멈춤');
  field.fire('pointerdown', { clientX: 40, pointerId: 3 });
  assert.equal(me.style.transform, 'translate3d(30.0px, 0, 0)', '새 손가락으로 다시');
  w.hide(true);
  w.hide(false);
  field.fire('pointermove', { clientX: 70, pointerId: 3 });
  assert.equal(me.style.transform, 'translate3d(30.0px, 0, 0)', '앱을 내렸다 오면 끌기는 놓은 것');
  w.h.stop();
});
