// 🎮 게임기 미니 게임 v344 (2026-10-26 아버님 미니 게임 추천 "추천 순서대로" → 기본안 "이대로") — node --test tests/minigame344.test.js
// 🎯 몬스터볼 던지기(30초 · 끌어서 휙 · 원이 작을수록 ⭐) · 🎣 잉어킹 낚시(45초 · 쏙 하면 톡 · 꾹 눌러 초록 칸) — 맞혀도·낚아도 도감엔 안 들어간다
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GAMES, gameById } from '../js/minigame.js';
import { GAME_SONGS } from '../js/gamesong.js';
import {
  THR_SEC, THR_W, BALL, MON, RING_MS, RING_MIN, GRADES, FLY_MS, CATCH_MS, MISS_MS, FIRST_MS, MIN_LEN, REACH_K, HIT_R, SHINY_FROM, CX_SPREAD, THR_FEW,
  thrPace, thrStart, thrPos, thrRing, thrGrade, thrThrow, thrAuto, thrTick, thrShift, runThrow,
} from '../js/gamethrow.js';
import {
  FISH_SEC, FISH, FISH_KEYS, CAST_MS, BITE_MIN, BITE_SPAN, BITE_MS, AGAIN_MIN, AGAIN_SPAN, GOT_MS, ESCAPE_MS, REEL_MAX_K, UNWIND, BAR0, FLOAT, ROD_TIP, FISH_HINT,
  fishPick, fishZone, fishStart, fishTap, fishHold, fishTick, fishShift, lineOf, runFish,
} from '../js/gamefish.js';

const src = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
function seeded(seed = 7) {
  let x = seed >>> 0;
  return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 2 ** 32; };
}
const SEEDS = [1, 7, 42, 2026, 99999, 31337, 5, 777];

// ───────────────────── 목록 · 게임기 화면 연결 ─────────────────────

test('🎮 v344 게임 목록 — 🎯 던지기 30초 · 🎣 낚시 45초 · 설명에 숫자 없음 · 「도감엔 안 들어가요」 · 화면(RUNNERS)·준비(prep) · 음악', () => {
  assert.deepEqual(GAMES.map((g) => g.id).slice(0, 12), ['dig', 'run', 'shadow', 'pair', 'berry', 'balloon', 'tower', 'tug', 'adv', 'jig', 'throw', 'fish'], '열둘째까지 (v345부터 더 늘어난다 — minigame345)');
  assert.deepEqual([gameById('throw').emoji, gameById('throw').ko, gameById('throw').sec], ['🎯', '몬스터볼 던지기', THR_SEC]);
  assert.deepEqual([gameById('fish').emoji, gameById('fish').ko, gameById('fish').sec], ['🎣', '잉어킹 낚시', FISH_SEC]);
  assert.deepEqual([THR_SEC, FISH_SEC], [30, 45]);
  for (const g of GAMES) assert.ok(!/\d/.test(g.how), `${g.id}: 아이가 보는 설명에 숫자 없음`);
  for (const id of ['throw', 'fish']) assert.ok(gameById(id).how.endsWith('도감엔 안 들어가요'), `${id}: 진짜 잡기와 헷갈리지 않게 (아버님 2026-10-26)`);
  assert.ok(!gameById('throw').clock && !gameById('fish').clock, '최고 기록은 ⭐');
  const gv = src('js/gameview.js');
  assert.match(gv, /\n {2}throw: \{ run: runThrow, prep: \(\) => throwPrep\(\), none: '포켓몬 그림이 아직 없어요 — 인터넷이 될 때 다시 해 봐요\.' \},/);
  assert.match(gv, /\n {2}fish: \{ run: runFish, prep: async \(\) => \(\{ art: await artFor\(Object\.values\(FISH\)\.map\(\(f\) => f\.id\)\.filter\(Boolean\)\) \}\) \},/);
  const prep = gv.slice(gv.indexOf('async function throwPrep('), gv.indexOf('\n}\n', gv.indexOf('async function throwPrep(')));
  assert.match(prep, /const use = own\.length >= THR_FEW \? own : pool;/, '잡은 포켓몬이 넉넉하면 그것만');
  assert.match(prep, /return use\.length \? \{ pool: use\.map\(\(p\) => \(\{ id: p\.id, ko: p\.ko, url: p\.url \}\)\) \} : null;/, '그림이 하나도 없으면 판을 안 쓴다');
  assert.equal(THR_FEW, 4);
  // 음악: 던지기는 「바쁘다 바빠」 · 낚시는 「두근두근 생각」(느긋하게)
  assert.ok(GAME_SONGS.find((s) => s.id === 'busy').games.includes('throw'));
  assert.ok(GAME_SONGS.find((s) => s.id === 'think').games.includes('fish'));
  // 저장·가방·도감을 안 만진다 — 점수는 게임기(gameview → xp.gameEnd)가 최고 기록으로만
  for (const f of ['js/gamethrow.js', 'js/gamefish.js']) assert.ok(!/coins|addCoins|applyPurchase|items\[|xp\.js|db\.js|pokemon\.js|houseDo|catchRule|p\.caught/.test(src(f)), `${f}: 저장·도감을 안 만진다`);
  // 낚이는 것의 이름·번호 (PokeAPI 2026-10-26 확인)
  assert.deepEqual(FISH_KEYS.filter((k) => FISH[k].id).map((k) => [FISH[k].id, FISH[k].ko]), [[129, '잉어킹'], [118, '콘치'], [116, '쏘드라'], [54, '고라파덕'], [130, '갸라도스']]);
});

test('🎮 서비스워커 v344 · 새 파일 · css (던지기 마당은 끌어도 화면이 안 밀린다 · 낚시 찌·힘겨루기 칸)', () => {
  const sw = src('sw.js');
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(sw) || [])[1]) >= 344, 'sw v344 이상');
  for (const f of ['./js/gamethrow.js', './js/gamefish.js']) assert.ok(sw.includes(`'${f}'`), f);
  const css = src('css/style.css');
  assert.match(css, /\.gx-field \{[^}]*touch-action: none;/, '끄는 동안 화면이 안 밀리게');
  assert.match(css, /\.gf-field \{[^}]*touch-action: none;/);
  assert.match(css, /\.gx-ball\.is-fly \{ transition: transform 0\.42s/, '날아가는 데 = FLY_MS');
  assert.equal(FLY_MS, 420);
  assert.match(css, /\.gx-ring\.is-excellent \{/);
  assert.match(css, /\.gf\.is-reel \.gf-gauge \{ display: block; \}/, '힘겨루기 막대는 걸렸을 때만');
  assert.match(css, /\.gf\.is-bite \.gf-ripple \{ animation: gf-ripple/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{[^\n]*\.gf\.is-bite \.gf-float \{ animation: none; transform: translateY\(60%\); \}/, '움직임을 줄여도 입질이 보인다');
  // 찌·낚싯대 자리 = 엔진 칸 (CSS %와 맞춤)
  assert.match(css, /\.gf-float \{[^}]*left: 61\.5%; top: 53\.6%;[^}]*width: 5%;/);
  assert.deepEqual([FLOAT.x - 2.5, Math.round(((FLOAT.y - 2.5) / 70) * 1000) / 10], [61.5, 53.6]);
  assert.deepEqual(ROD_TIP, { x: 26, y: 18 });
  const rod = /\.gf-rod \{[^}]*left: 15%; top: 37\.14%;[^}]*width: 13\.6%;[^}]*rotate\(-36deg\)/.exec(css);
  assert.ok(rod, '낚싯대');
  const tipX = 15 + 13.6 * Math.cos((36 * Math.PI) / 180);
  const tipY = 26 - 13.6 * Math.sin((36 * Math.PI) / 180);
  assert.ok(Math.abs(tipX - ROD_TIP.x) < 0.1 && Math.abs(tipY - ROD_TIP.y) < 0.1, `낚싯대 끝 ${tipX.toFixed(2)},${tipY.toFixed(2)}`);
});

// ───────────────────── 🎯 엔진 ─────────────────────

test('🎯 빠르기·원·등급 — 좌우 폭 12 → 30칸 · 오가는 데 3.2 → 1.8초 · 원은 1 ↔ 0.35 · Excellent ≤ 0.48 < Great ≤ 0.72 < Nice', () => {
  assert.deepEqual(thrPace(0), { amp: 12, per: 3200 });
  assert.deepEqual(thrPace(THR_SEC * 1000), { amp: 30, per: 1800 });
  assert.deepEqual(thrPace(-5), thrPace(0));
  assert.deepEqual(thrPace(99e9), thrPace(THR_SEC * 1000));
  assert.deepEqual(thrPace(NaN), thrPace(0));
  assert.deepEqual(GRADES.map((g) => [g.key, g.pts]), [['excellent', 3], ['great', 2], ['nice', 1]]);
  for (const [k, want] of [[RING_MIN, 'excellent'], [0.48, 'excellent'], [0.481, 'great'], [0.72, 'great'], [0.721, 'nice'], [1, 'nice'], [9, 'nice']]) assert.equal(thrGrade(k).key, want, `원 ${k}`);
  const mon = { born: 1000, ring: 0 };
  assert.ok(Math.abs(thrRing(mon, 1000) - 1) < 1e-9, '시작 자리 0이면 가장 큼');
  assert.ok(Math.abs(thrRing(mon, 1000 + RING_MS / 2) - RING_MIN) < 1e-9, '반 바퀴에 가장 작음');
  assert.ok(Math.abs(thrRing(mon, 1000 + RING_MS) - 1) < 1e-9);
  assert.ok(Math.abs(thrRing({ born: 1000, ring: Math.PI }, 1000) - RING_MIN) < 1e-9, '포켓몬마다 시작 자리가 달라 바로 던져도 늘 같지 않다');
});

test('🎯 포켓몬이 나오는 모양 — 0.6초에 첫 포켓몬 · 앞과 다른 포켓몬 · 가운데는 ±8칸 · 마당 밖으로 안 나감(씨앗 300 × 30초) · 깡총은 위로만', () => {
  const s = thrStart(0, [25, 7, 4]);
  assert.deepEqual(thrTick(s, FIRST_MS - 50, seeded(1)).added, []);
  const ev = thrTick(s, FIRST_MS, seeded(1));
  assert.equal(ev.added.length, 1);
  assert.equal(s.mon.born, FIRST_MS);
  for (let seed = 1; seed <= 300; seed++) {
    const rng = seeded(seed);
    const st = thrStart(0, [25, 7, 4]);
    let prev = 0;
    for (let k = 0; k < 12; k++) {
      st.mon = null; st.next = st.last; // 다음 포켓몬을 바로
      const t = st.last + 2500;
      thrTick(st, t, rng);
      const m = st.mon;
      assert.ok(m, `씨앗 ${seed}`);
      assert.notEqual(m.id, prev, '앞과 다른 포켓몬');
      prev = m.id;
      assert.ok(Math.abs(m.cx - THR_W / 2) <= CX_SPREAD + 1e-9);
      for (let u = 0; u <= 6000; u += 37) {
        const p = thrPos(m, m.born + u);
        assert.ok(p.x >= MON.w / 2 + 1 - 1e-9 && p.x <= THR_W - MON.w / 2 - 1 + 1e-9, `x ${p.x}`);
        assert.ok(p.y <= MON.y + 1e-9 && p.y >= MON.y - 7 - 1e-9, `y ${p.y}`);
      }
    }
  }
  // 그림이 하나뿐이면 같은 포켓몬이 또 · 하나도 없으면 0(화면은 🐾)
  const one = thrStart(0, [25]);
  thrTick(one, 1000, seeded(3));
  assert.equal(one.mon.id, 25);
  const none = thrStart(0, []);
  thrTick(none, 1000, seeded(3));
  assert.equal(none.mon.id, 0);
  assert.deepEqual(thrStart(0, [25, 'x', -1, 0, 2.5, 7]).pool, [25, 7], '깨진 번호는 뺀다');
});

/** 지금 포켓몬을 향해(떨어질 때 자리) 끈 길이 len으로 */
function aimAt(s, t, len, offX = 0) {
  const p = thrPos(s.mon, t + FLY_MS);
  const dx = p.x + offX - BALL.x;
  const dy = p.y - BALL.y;
  const d = Math.hypot(dx, dy);
  return { dx: (dx / d) * len, dy: (dy / d) * len };
}

test('🎯 던지기 — 위로 휙이 아니면 안 던짐(셈 없음) · 맞히면 떨어질 때 ⭐(원 크기 등급) · 날아가는 동안·흔들리는 동안은 못 던짐 · 다음 포켓몬은 다른 포켓몬', () => {
  const rng = seeded(11);
  const s = thrStart(0, [25, 7, 4, 1]);
  thrTick(s, 1000, rng);
  for (const v of [{ dx: 0, dy: -MIN_LEN + 0.1 }, { dx: 0, dy: 20 }, { dx: 20, dy: -2 }, { dx: NaN, dy: NaN }, null]) assert.equal(thrThrow(s, v, 1000).kind, 'weak', JSON.stringify(v));
  assert.equal(s.throws, 0, '안 던진 것은 안 센다');
  const ring = thrGrade(thrRing(s.mon, 1000 + FLY_MS));
  const monN = s.mon.n;
  const r = thrThrow(s, aimAt(s, 1000, 30), 1000);
  assert.equal(r.kind, 'throw');
  assert.equal(r.hit, true);
  assert.equal(r.grade, ring.key, '떨어질 때 원 크기로');
  assert.equal(r.pts, ring.pts * (s.mon.shiny ? 2 : 1));
  assert.deepEqual(r.to, thrPos(s.mon, 1000 + FLY_MS), '볼은 떨어질 때 포켓몬 자리로');
  assert.equal(s.score, 0, '점수는 아직 — 떨어질 때');
  assert.equal(thrThrow(s, aimAt(s, 1050, 30), 1050).kind, 'busy', '날아가는 동안');
  const land = thrTick(s, 1000 + FLY_MS, rng);
  assert.ok(land.landed, '명중');
  assert.equal(s.score, r.pts);
  assert.equal(s.mon, null, '볼 안으로');
  assert.equal(thrThrow(s, { dx: 0, dy: -30 }, 1000 + FLY_MS + 100).kind, 'busy', '흔들리는 동안');
  const back = thrTick(s, 1000 + FLY_MS + CATCH_MS, rng);
  assert.ok(back.back, '볼이 다시 손에');
  assert.equal(back.added.length, 1, '바로 다음 포켓몬');
  assert.notEqual(s.mon.n, monN);
  assert.deepEqual([s.throws, s.hits, s.misses], [1, 1, 0]);
});

test('🎯 빗나감 — 옆으로 크게 빗나가면 「빗나갔다」 · 줄은 맞는데 약하면 「조금 더 세게」(short) · 감점 없음 · 0.4초 뒤 다시', () => {
  const rng = seeded(5);
  const s = thrStart(0, [25, 7]);
  thrTick(s, 1000, rng);
  const wide = thrThrow(s, aimAt(s, 1000, 30, 40), 1000);
  assert.equal(wide.hit, false);
  assert.equal(wide.short, false);
  let ev = thrTick(s, 1000 + FLY_MS, rng);
  assert.deepEqual(ev.missed && ev.missed.short, false);
  assert.equal(s.score, 0, '감점 없음');
  assert.ok(s.mon, '포켓몬은 그대로');
  assert.equal(thrThrow(s, aimAt(s, 1000 + FLY_MS + 100, 30), 1000 + FLY_MS + 100).kind, 'busy', '바로는 못 던짐');
  ev = thrTick(s, 1000 + FLY_MS + MISS_MS, rng);
  assert.ok(ev.back, '0.4초 뒤 다시 손에');
  // 약하게 — 날아가는 거리 = 끈 길이 × REACH_K
  const t2 = s.last;
  const p = thrPos(s.mon, t2 + FLY_MS);
  const dist = Math.hypot(p.x - BALL.x, p.y - BALL.y);
  const weakLen = Math.max(MIN_LEN, (dist - HIT_R - 3) / REACH_K);
  const sh = thrThrow(s, aimAt(s, t2, weakLen), t2);
  assert.equal(sh.hit, false);
  assert.equal(sh.short, true, '줄은 맞는데 세기가 모자람');
  ev = thrTick(s, t2 + FLY_MS, rng);
  assert.equal(ev.missed.short, true);
  assert.deepEqual([s.throws, s.hits, s.misses, s.shorts], [2, 0, 2, 1]);
});

test('🎯 ✨ 반짝이는 포켓몬은 ⭐ 두 배 · 5초 전엔 안 나옴 · 끝나기 전에 떨어지지 못하는 던지기는 안 받음(over) · 시계는 판 끝을 안 넘음', () => {
  const always = () => 0.01; // 늘 반짝(5초 뒤부터)
  const s = thrStart(0, [25, 7]);
  thrTick(s, 1000, always);
  assert.equal(s.mon.shiny, false, '5초 전');
  s.mon = null; s.next = SHINY_FROM; s.last = SHINY_FROM - 50;
  thrTick(s, SHINY_FROM, always);
  assert.equal(s.mon.shiny, true);
  const g = thrGrade(thrRing(s.mon, SHINY_FROM + FLY_MS));
  const r = thrThrow(s, aimAt(s, SHINY_FROM, 30), SHINY_FROM);
  assert.equal(r.pts, g.pts * 2);
  thrTick(s, SHINY_FROM + FLY_MS, always);
  assert.deepEqual([s.score, s.shinies], [g.pts * 2, 1]);
  const e = thrStart(0, [25]);
  thrTick(e, e.end - FLY_MS - 1, seeded(2));
  assert.equal(thrThrow(e, aimAt(e, e.end - FLY_MS + 1, 30), e.end - FLY_MS + 1).kind, 'over');
  assert.equal(thrThrow(e, aimAt(e, e.end - FLY_MS, 30), e.end - FLY_MS).kind, 'throw', '딱 맞게 떨어지면 받음');
  thrTick(e, e.end + 99999, seeded(2));
  assert.equal(e.last, e.end);
  assert.equal(e.score > 0 || e.misses > 0, true, '끝에 떨어진 것도 정산');
  const b = JSON.stringify(e);
  thrTick(e, e.end - 5000, seeded(2)); thrTick(e, NaN, seeded(2));
  assert.equal(JSON.stringify(e), b, '뒤로 간 때·깨진 때는 그대로');
});

test('🎯 30초 한 판(가짜 시계 · 씨앗 여덟) — 잘 겨누는 손 > 똑바로 위로만·엉성한 손 · 점수 = 명중마다 등급 ⭐(반짝 ×2) · 키보드(thrAuto)는 다 맞힘', () => {
  const play = (seed, kind) => {
    const rng = seeded(seed);
    const r2 = seeded(seed + 100);
    const s = thrStart(0, [25, 7, 4, 1]);
    let sum = 0;
    let t = 0;
    while (t < s.end) {
      t += 50;
      const ev = thrTick(s, t, rng);
      if (ev.landed) sum += ev.landed.pts;
      if (!s.fly && !s.catching && !s.away && s.mon && t + FLY_MS <= s.end && t >= s.ready + 150) {
        let v = thrAuto(s, t);
        if (kind === 'straight') v = { dx: 0, dy: -20 };
        if (kind === 'sloppy') { const p = thrPos(s.mon, t); v = { dx: (p.x - BALL.x) / 2.4 + (r2() - 0.5) * 8, dy: ((p.y - BALL.y) / 2.4) * (0.7 + r2() * 0.6) }; }
        thrThrow(s, v, t);
      }
    }
    assert.equal(s.score, sum, '점수 = 떨어진 명중의 ⭐ 합');
    assert.equal(s.hits, s.grades.nice + s.grades.great + s.grades.excellent);
    return s;
  };
  let good = 0;
  let straight = 0;
  let sloppy = 0;
  for (const seed of SEEDS) {
    const a = play(seed, 'auto');
    assert.equal(a.hits, a.throws, `씨앗 ${seed}: 키보드는 다 맞힘`);
    assert.ok(a.throws >= 15, `씨앗 ${seed}: 30초에 ${a.throws}번`);
    good += a.score;
    straight += play(seed, 'straight').score;
    sloppy += play(seed, 'sloppy').score;
  }
  assert.ok(good > straight * 1.5, `잘 겨눔 ${good} · 위로만 ${straight}`);
  assert.ok(good > sloppy * 1.5, `잘 겨눔 ${good} · 엉성 ${sloppy}`);
  assert.equal(thrAuto(thrStart(0, [25]), 0), null, '포켓몬이 없으면 null');
});

test('🎯 시계 — 앱을 내렸다 돌아오면(thrShift) 남은 시간·포켓몬 자리·원 크기·날던 볼이 그대로 · 0·음수·NaN은 그대로', () => {
  const rng = seeded(9);
  const s = thrStart(1000, [25, 7]);
  thrTick(s, 3000, rng);
  thrThrow(s, aimAt(s, 3000, 30), 3000);
  const p0 = thrPos(s.mon, s.last);
  const k0 = thrRing(s.mon, s.last);
  const { tl } = s.fly;
  thrShift(s, 5000);
  assert.deepEqual([s.t0, s.end, s.last, s.fly.tl], [6000, 6000 + THR_SEC * 1000, 8000, tl + 5000]);
  assert.deepEqual(thrPos(s.mon, s.last), p0);
  assert.ok(Math.abs(thrRing(s.mon, s.last) - k0) < 1e-12);
  const b = JSON.stringify(s);
  thrShift(s, 0); thrShift(s, -1); thrShift(s, NaN);
  assert.equal(JSON.stringify(s), b);
});

// ───────────────────── 🎣 엔진 ─────────────────────

test('🎣 무엇이 걸리나 — 몫 합 1 · 잉어킹이 가장 많고 갸라도스가 가장 드묾 · 씨앗 2만 번의 비율 · 깨진 값은 잉어킹', () => {
  const sum = FISH_KEYS.reduce((a, k) => a + FISH[k].w, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9);
  assert.equal(fishPick(0), 'magikarp');
  assert.equal(fishPick(0.4199), 'magikarp');
  assert.equal(fishPick(0.42), 'goldeen');
  assert.equal(fishPick(0.9999), 'gyarados');
  assert.equal(fishPick(NaN), 'magikarp');
  assert.equal(fishPick(7), 'gyarados', '1보다 크면 끝 칸');
  const rng = seeded(4);
  const n = Object.fromEntries(FISH_KEYS.map((k) => [k, 0]));
  for (let i = 0; i < 20000; i++) n[fishPick(rng())] += 1;
  for (const k of FISH_KEYS) assert.ok(Math.abs(n[k] / 20000 - FISH[k].w) < 0.015, `${k} ${n[k]}`);
  assert.deepEqual(FISH_KEYS.map((k) => FISH[k].pts), [1, 2, 2, 3, 0, 8]);
  assert.ok(FISH.gyarados.hw < FISH.magikarp.hw && FISH.gyarados.need > FISH.magikarp.need, '갸라도스는 칸이 좁고 오래');
});

test('🎣 초록 칸 — 걸린 뒤 어느 때든 마당 안(가운데 ± 반쪽이 0~100 안) · 움직인다', () => {
  for (const k of FISH_KEYS) {
    const f = FISH[k];
    let lo = 100;
    let hi = 0;
    for (let ms = 0; ms <= 20000; ms += 13) {
      const z = fishZone(k, ms);
      assert.ok(z - f.hw >= -1e-9 && z + f.hw <= 100 + 1e-9, `${k} ${z}`);
      lo = Math.min(lo, z); hi = Math.max(hi, z);
    }
    assert.ok(hi - lo > f.amp, `${k} 움직임 ${lo.toFixed(1)}~${hi.toFixed(1)}`);
  }
  assert.equal(fishZone('없는것', 0), fishZone('magikarp', 0), '모르는 것은 잉어킹처럼');
});

test('🎣 던지기·입질·챔 — 톡 → 1.5~4.5초 뒤 쏙 · 일찍 누르면 「아직이야」(바뀌는 것 없음) · 1초 안에 톡 → 걸렸다 · 놓치면 다시 기다림', () => {
  const s = fishStart(0);
  assert.equal(fishTap(s, 100, () => 0).kind, 'cast');
  assert.equal(s.biteAt, 100 + CAST_MS + BITE_MIN);
  const s2 = fishStart(0);
  fishTap(s2, 100, () => 0.999999);
  assert.ok(Math.abs(s2.biteAt - (100 + CAST_MS + BITE_MIN + BITE_SPAN)) < 0.01);
  const before = JSON.stringify({ ...s, early: 0 });
  assert.equal(fishTap(s, 500, () => 0).kind, 'early');
  assert.equal(JSON.stringify({ ...s, early: 0 }), before, '일찍 눌러도 입질 때가 안 바뀐다');
  assert.equal(s.early, 1);
  let ev = fishTick(s, s.biteAt - 1, () => 0.5);
  assert.equal(ev.bite, '');
  ev = fishTick(s, s.biteAt + 49, () => 0.5);
  assert.equal(ev.bite, fishPick(0.5));
  assert.equal(s.st, 'bite');
  // 놓침
  const biteEnd = s.biteEnd;
  ev = fishTick(s, biteEnd + 50, () => 0);
  assert.equal(ev.slip, true);
  assert.equal(s.st, 'wait');
  assert.ok(s.biteAt >= s.last + AGAIN_MIN - 50 && s.biteAt <= s.last + AGAIN_MIN + AGAIN_SPAN);
  // 다시 쏙 → 톡 → 걸렸다
  fishTick(s, s.biteAt + 49, () => 0.1);
  assert.equal(s.st, 'bite');
  const r = fishTap(s, s.last + 300);
  assert.deepEqual(r, { kind: 'hook', fish: 'magikarp' });
  assert.equal(s.st, 'reel');
  assert.deepEqual([s.reel.b, s.reel.p], [BAR0, 0]);
  assert.equal(fishTap(s, s.last + 400).kind, 'busy', '힘겨루기 중 톡은 아무것도');
  assert.deepEqual([s.casts, s.bites, s.slips, s.hooks], [1, 2, 1, 1]);
  assert.equal(BITE_MS, 800, 'v351 — 진우 「너무 쉬워요」 — 1초였다');
});

/** 막대가 칸 가운데보다 아래면 꾹 — 잘하는 손 */
function smartReel(s, t) {
  const z = fishZone(s.reel.kind, t - s.reel.t0);
  fishHold(s, s.reel.b < z);
}

test('🎣 힘겨루기 — 칸 안에 두면 감겨서 낚았다(⭐) · 1.3초 보여 주고 다시 던질 수 있음 · 장화는 ⭐0 · 꾹만 누르거나 안 누르면 3초 뒤 도망(감점 없음)', () => {
  for (const kind of FISH_KEYS) {
    const s = fishStart(0);
    s.st = 'reel'; s.kind = kind; s.reel = { kind, t0: 0, b: BAR0, p: 0 };
    let t = 0;
    let got = null;
    while (!got && t < 20000) { t += 50; smartReel(s, t); got = fishTick(s, t).got; }
    assert.ok(got, `${kind} 낚음`);
    assert.deepEqual(got, { kind, pts: FISH[kind].pts });
    assert.ok(t >= FISH[kind].need && t <= FISH[kind].need * 3, `${kind} ${t}ms`);
    assert.deepEqual([s.score, s.caught[kind], s.st], [FISH[kind].pts, 1, 'got']);
    assert.equal(fishTap(s, t + 10).kind, 'busy', '보여 주는 동안');
    const ev = fishTick(s, t + GOT_MS);
    assert.equal(ev.idle, true);
    assert.equal(s.st, 'idle');
    assert.equal(fishTap(s, t + GOT_MS + 10).kind, 'cast');
  }
  for (const hold of [true, false]) {
    const s = fishStart(0);
    s.st = 'reel'; s.kind = 'magikarp'; s.reel = { kind: 'magikarp', t0: 0, b: BAR0, p: 0 };
    fishHold(s, hold);
    let t = 0;
    let esc = '';
    while (!esc && t < 20000) { t += 50; esc = fishTick(s, t).escape; }
    assert.equal(esc, 'magikarp', hold ? '꾹만' : '안 누름');
    assert.ok(t <= ESCAPE_MS + 2500, `${t}ms`);
    assert.deepEqual([s.st, s.score, s.escapes, s.reel], ['idle', 0, 1, null]);
  }
  // 칸에 잠깐 들어갔다 나와도 처음부터 다시 3초 (줄곧 밖일 때만 도망)
  const s = fishStart(0);
  s.st = 'reel'; s.kind = 'magikarp'; s.reel = { kind: 'magikarp', t0: 0, b: 50, p: 0, out: ESCAPE_MS - 100 };
  fishHold(s, false);
  const z0 = fishZone('magikarp', 50);
  s.reel.b = z0 + 3; // 칸 안
  fishTick(s, 50);
  assert.equal(s.reel.out, 0);
});

test('🎣 4학년 손 — 0.3초 늦게 보고 눌러도 갸라도스 말고는 8초 안에 낚음 · 어떤 손이든 힘겨루기는 다 감는 데의 4배를 안 넘김(갸라도스 14초)', () => {
  const reel = (kind, lag, hold) => {
    const s = fishStart(0);
    s.st = 'reel'; s.kind = kind; s.reel = { kind, t0: 0, b: BAR0, p: 0 };
    const seen = [];
    let t = 0;
    while (t < 60000) {
      t += 50;
      seen.push({ t, b: s.reel ? s.reel.b : 0, z: s.reel ? fishZone(kind, t - s.reel.t0) : 0 });
      const o = seen.find((x) => x.t >= t - lag) || seen[seen.length - 1];
      fishHold(s, hold === undefined ? o.b < o.z : hold);
      const ev = fishTick(s, t);
      if (ev.got) return { got: true, t };
      if (ev.escape) return { got: false, t };
    }
    return { got: false, t: Infinity };
  };
  for (const k of ['magikarp', 'goldeen', 'horsea', 'psyduck', 'boot']) {
    const r = reel(k, 300);
    assert.ok(r.got && r.t <= 8000, `${k}: ${JSON.stringify(r)}`);
  }
  for (const k of FISH_KEYS) {
    for (const lag of [0, 150, 300, 450, 900]) {
      const r = reel(k, lag);
      assert.ok(r.t <= FISH[k].need * REEL_MAX_K, `${k} 늦음 ${lag}: ${r.t}`);
    }
    // 반만 맞게 누르는 손(칸을 넘나듦)도 끝 시간 안에
    let flip = false;
    const s = fishStart(0);
    s.st = 'reel'; s.kind = k; s.reel = { kind: k, t0: 0, b: BAR0, p: 0 };
    let t = 0;
    let end = '';
    while (!end && t < 60000) { t += 50; flip = !flip; fishHold(s, flip); const ev = fishTick(s, t); end = ev.got ? 'got' : ev.escape ? 'esc' : ''; }
    assert.ok(t <= FISH[k].need * REEL_MAX_K, `${k} 깜빡이는 손 ${t}`);
  }
  assert.equal(REEL_MAX_K, 4);
  assert.equal(UNWIND, 3);
});

test('🎣 판 끝 — 끝난 뒤 톡은 over · 시계는 끝을 안 넘음 · 앱을 내렸다 돌아오면(fishShift) 입질 때·칸 움직임 그대로', () => {
  const s = fishStart(0);
  assert.equal(fishTap(s, s.end).kind, 'over');
  fishTick(s, s.end + 9999, () => 0.5);
  assert.equal(s.last, s.end);
  const w = fishStart(1000);
  fishTap(w, 1000, () => 0.5);
  const { biteAt } = w;
  fishShift(w, 4000);
  assert.deepEqual([w.t0, w.end, w.last, w.biteAt], [5000, 5000 + FISH_SEC * 1000, 5000, biteAt + 4000]);
  const r = fishStart(0);
  r.st = 'reel'; r.reel = { kind: 'goldeen', t0: 100, b: 30, p: 0.4 };
  fishShift(r, 700);
  assert.equal(r.reel.t0, 800);
  const b = JSON.stringify(r);
  fishShift(r, 0); fishShift(r, -3); fishShift(r, NaN);
  assert.equal(JSON.stringify(r), b);
});

test('🎣 45초 한 판(가짜 시계 · 씨앗 여덟) — 잘하는 손은 여러 마리 · 꾹만·안 누름은 늘 도망 · 점수 = 낚은 것의 ⭐ 합', () => {
  const play = (seed, kind) => {
    const rng = seeded(seed);
    const s = fishStart(0);
    let t = 0;
    while (t < s.end) {
      t += 50;
      fishTick(s, t, rng);
      if (s.st === 'idle') fishTap(s, t, rng);
      if (s.st === 'bite' && t >= s.biteEnd - 700) fishTap(s, t, rng);
      if (s.st === 'reel') {
        if (kind === 'smart') smartReel(s, t);
        else fishHold(s, kind === 'always');
      }
    }
    assert.equal(s.score, FISH_KEYS.reduce((a, k) => a + s.caught[k] * FISH[k].pts, 0));
    return s;
  };
  for (const seed of SEEDS) {
    const a = play(seed, 'smart');
    const got = FISH_KEYS.reduce((n, k) => n + a.caught[k], 0);
    assert.ok(got >= 3, `씨앗 ${seed}: ${got}마리`);
    for (const kind of ['always', 'never']) {
      const b = play(seed, kind);
      assert.equal(b.score, 0, `${seed} ${kind}`);
      assert.ok(b.escapes >= 3, `${seed} ${kind}: 도망 ${b.escapes} — 한 마리에 판 내내 묶이지 않는다`);
    }
  }
});

test('🎣 줄·아래 한 줄 — 낚싯대 끝에서 찌까지 거리·각도 · 단계마다 말', () => {
  const l = lineOf(ROD_TIP, FLOAT);
  assert.ok(Math.abs(l.len - Math.hypot(FLOAT.x - ROD_TIP.x, FLOAT.y - ROD_TIP.y)) < 1e-9);
  assert.ok(l.deg > 0 && l.deg < 90, '오른쪽 아래로');
  assert.deepEqual(lineOf({ x: 0, y: 0 }, { x: 10, y: 0 }), { len: 10, deg: 0 });
  assert.deepEqual(Object.keys(FISH_HINT), ['idle', 'wait', 'bite', 'reel', 'got']);
  assert.equal(FISH_HINT.bite, '지금 톡!');
});

// ───────────────────── 화면 (가짜 화면 · 가짜 시계) ─────────────────────

class FakeEl {
  constructor(tag) { this.tagName = String(tag).toUpperCase(); this.className = ''; this.children = []; this.listeners = {}; this.style = { setProperty(k, v) { this[k] = v; } }; this.attrs = {}; this.textContent = ''; this.html = ''; }
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
  getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 70 }; }
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
  /** 화면이 오래 멈췄다 한꺼번에 — 시계만 ms 가고 그림 한 번(🔍 Codex 148차 #1) */
  const jump = (ms) => { clock += ms; t.mock.timers.tick(50); };
  const flush = () => new Promise((r) => setImmediate(r));
  const hide = (on) => { doc.hidden = on; doc.fire('visibilitychange'); };
  return { stage, h, doc, adv, jump, flush, st, hide };
}
const POOL = [{ id: 25, ko: '피카츄', url: 'blob:25' }, { id: 7, ko: '꼬부기', url: 'blob:7' }];

test('🎯 화면 — 안내 · 「준비!」 때 내려도 안 끝남 · 아래로 끌면 안 던짐(안내가 흔들림) · ⌨️ 스페이스로 명중 → ⭐ · 볼 흔들림 · 다음 포켓몬 · 30초 뒤 끝 · 듣기를 뗀다', async (t) => {
  const w = world(t, (stage) => runThrow(stage, { rng: seeded(3), pool: POOL }));
  const root = w.stage.children[0];
  const [top, field, hint, fx] = root.children;
  const monEl = field.children[2];
  const ball = field.children[3];
  assert.equal(hint.textContent, '볼을 끌어서 위로 휙! 원이 작을 때 맞히면 ⭐가 더');
  assert.equal(field.attrs.role, 'button');
  w.adv(400);
  w.hide(true);
  w.adv(40000);
  await w.flush();
  assert.equal(w.st.over, null, '숨은 동안 안 끝남');
  w.hide(false);
  w.adv(1500);
  const img = monEl.children[1].children[0];
  assert.ok(img && (img.src === 'blob:25' || img.src === 'blob:7'), '포켓몬 그림');
  assert.match(monEl.style.transform, /^translate3d\(-?[\d.]+px, -?[\d.]+px, 0\)$/);
  assert.match(monEl.children[0].className, /^gx-ring is-(nice|great|excellent)$/);
  // 아래로 끌기 — 안 던짐
  field.fire('pointerdown', { pointerId: 1, clientX: 50, clientY: 62 });
  assert.equal(ball.className, 'gx-ball is-drag');
  w.doc.fire('pointermove', { pointerId: 1, clientX: 50, clientY: 70 });
  w.doc.fire('pointerup', { pointerId: 1, clientX: 50, clientY: 72 });
  assert.equal(ball.className, 'gx-ball is-rest');
  assert.ok(hint.classList.contains('is-nudge'), '「위로 휙」 안내가 흔들린다');
  // ⌨️ 스페이스 — 넉넉한 세기로 명중
  field.fire('keydown', { key: ' ', repeat: false });
  assert.equal(ball.className, 'gx-ball is-fly');
  w.adv(FLY_MS + 50);
  assert.equal(ball.className, 'gx-ball is-catch');
  assert.ok(monEl.classList.contains('is-in'), '볼 안으로');
  const sc = Number(top.children[0].textContent.replace('⭐ ', ''));
  assert.ok(sc >= 1 && sc <= 6, `⭐ ${sc}`);
  assert.ok(fx.children.some((f) => /^(Nice|Great|Excellent)! \+\d$/.test(f.textContent)), '등급 글');
  field.fire('pointerdown', { pointerId: 2, clientX: 50, clientY: 62 });
  assert.equal(ball.className, 'gx-ball is-catch', '흔들리는 동안은 못 끈다');
  w.adv(CATCH_MS);
  assert.equal(ball.className, 'gx-ball is-rest', '볼이 다시 손에');
  assert.ok(!monEl.classList.contains('is-in'), '다음 포켓몬');
  // 손가락으로 위로 휙 — 날아간다(맞든 안 맞든)
  field.fire('pointerdown', { pointerId: 3, clientX: 50, clientY: 62 });
  w.doc.fire('pointerup', { pointerId: 9, clientX: 50, clientY: 20 }); // 다른 손가락의 뗌은 무시
  assert.equal(ball.className, 'gx-ball is-drag');
  w.doc.fire('pointerup', { pointerId: 3, clientX: 50, clientY: 30 });
  assert.equal(ball.className, 'gx-ball is-fly');
  w.adv(40000);
  await w.flush();
  assert.ok(w.st.over && w.st.over.quit === false);
  assert.match(top.children[0].textContent, new RegExp(`^⭐ ${w.st.over.score}$`));
  for (const ty of ['visibilitychange', 'pointermove', 'pointerup', 'pointercancel']) assert.equal((w.doc.listeners[ty] || []).length, 0, `끝나면 ${ty} 듣기를 뗀다`);
});

test('🎯 화면 — 그림이 깨지면 🐾 · 그만두면 그때 점수로(quit) · 끄던 중 앱을 내리면 볼이 제자리', async (t) => {
  const w = world(t, (stage) => runThrow(stage, { rng: seeded(4), pool: POOL }));
  const root = w.stage.children[0];
  const field = root.children[1];
  const monEl = field.children[2];
  const ball = field.children[3];
  w.adv(1500);
  const art = monEl.children[1];
  art.children[0].fire('error');
  assert.equal(art.innerHTML, '<span class="gx-alt">🐾</span>');
  field.fire('pointerdown', { pointerId: 1, clientX: 50, clientY: 62 });
  w.hide(true);
  assert.equal(ball.className, 'gx-ball is-rest', '내리면 놓친 것으로');
  w.hide(false);
  w.h.stop();
  await w.flush();
  assert.deepEqual(w.st.over, { score: 0, quit: true });
  field.fire('keydown', { key: ' ', repeat: false });
  w.adv(2000);
  assert.equal(root.children[0].children[0].textContent, '⭐ 0', '그 뒤로 눌러도 그대로');
});

test('🎣 화면 — 톡 → 찌 · 일찍 누르면 「아직이야~」 · 쏙(is-bite) → 톡 → 힘겨루기 칸(is-reel) · 막대를 칸에 맞추면 낚았다(⭐ · 그림 · 말) · 45초 뒤 끝 · 듣기를 뗀다', async (t) => {
  const w = world(t, (stage) => runFish(stage, { rng: () => 0.5, art: { 118: 'blob:118' }, hero: { html: '<img class="gd-pal-img">' } }));
  const root = w.stage.children[0];
  const [top, field, hint, fx] = root.children;
  const [, , , , me, , catchEl, gauge] = field.children;
  const [zone, bar] = gauge.children;
  assert.equal(me.innerHTML, '<img class="gd-pal-img">', '낚싯대는 파트너가');
  assert.equal(hint.textContent, FISH_HINT.idle);
  w.adv(900);
  assert.ok(root.classList.contains('is-idle'));
  field.fire('pointerdown', { pointerId: 1 });
  w.doc.fire('pointerup', { pointerId: 1 });
  w.adv(100);
  assert.ok(root.classList.contains('is-wait'));
  assert.equal(hint.textContent, FISH_HINT.wait);
  field.fire('pointerdown', { pointerId: 1 });
  w.doc.fire('pointerup', { pointerId: 1 });
  assert.ok(fx.children.some((f) => f.textContent === '아직이야~'));
  // rng 0.5 → 던진 뒤 0.5 + 1 + 1.5 = 3초에 쏙 · 콘치(⭐2)
  let k = 0;
  while (!root.classList.contains('is-bite') && k++ < 200) w.adv(50);
  assert.ok(root.classList.contains('is-bite'), '쏙');
  assert.equal(hint.textContent, '지금 톡!');
  field.fire('pointerdown', { pointerId: 1 });
  w.adv(50);
  assert.ok(root.classList.contains('is-reel'), '걸렸다');
  assert.ok(fx.children.some((f) => f.textContent === '걸렸다!'));
  // 막대(bottom %)가 칸 가운데보다 아래면 꾹
  let pressing = true;
  k = 0;
  while (root.classList.contains('is-reel') && k++ < 400) {
    const b = parseFloat(bar.style.bottom);
    const z = parseFloat(zone.style.bottom) + parseFloat(zone.style.height) / 2;
    if (b < z && !pressing) { field.fire('pointerdown', { pointerId: 1 }); pressing = true; }
    if (b >= z && pressing) { w.doc.fire('pointerup', { pointerId: 1 }); pressing = false; }
    w.adv(50);
  }
  if (pressing) w.doc.fire('pointerup', { pointerId: 1 });
  assert.ok(root.classList.contains('is-got'), '낚았다');
  assert.equal(top.children[0].textContent, '⭐ 2');
  assert.equal(hint.textContent, '콘치 낚았다!');
  assert.ok(catchEl.classList.contains('is-on'));
  assert.equal(catchEl.children[0].src, 'blob:118');
  w.adv(GOT_MS + 100);
  assert.ok(root.classList.contains('is-idle'), '다시 던질 수 있음');
  w.adv(60000);
  await w.flush();
  assert.ok(w.st.over && w.st.over.quit === false);
  assert.equal(w.st.over.score, 2);
  for (const ty of ['visibilitychange', 'pointerup', 'pointercancel']) assert.equal((w.doc.listeners[ty] || []).length, 0, `끝나면 ${ty} 듣기를 뗀다`);
});

test('🎣 화면 — 꾹만 누르면 「도망갔다」 · 그림이 없으면 🐟/🥾 · 숨기면 손을 뗀 것으로 · 그만두면 quit', async (t) => {
  const w = world(t, (stage) => runFish(stage, { rng: () => 0.5, art: {} }));
  const root = w.stage.children[0];
  const [, field, , fx] = root.children;
  w.adv(900);
  field.fire('keydown', { key: ' ', repeat: false });
  field.fire('keyup', { key: ' ' });
  let k = 0;
  while (!root.classList.contains('is-bite') && k++ < 200) w.adv(50);
  field.fire('keydown', { key: 'Enter', repeat: false }); // ⌨️ 챔 + 누르고 있음
  k = 0;
  while (root.classList.contains('is-reel') && k++ < 200) w.adv(50);
  assert.ok(fx.children.some((f) => f.textContent === '도망갔다… 다시 톡!'));
  assert.ok(root.classList.contains('is-idle'));
  field.fire('keyup', { key: 'Enter' });
  // 숨기면 손을 뗀 것으로 — 다시 보여도 누르고 있지 않다
  field.fire('pointerdown', { pointerId: 5 });
  w.hide(true);
  w.hide(false);
  w.doc.fire('pointerup', { pointerId: 5 }); // 이미 뗀 것으로 — 아무 일 없음
  w.h.stop();
  await w.flush();
  assert.deepEqual(w.st.over, { score: 0, quit: true });
});

// ───────────────────── 🔍 Codex 148차 ─────────────────────

const scoreOf = (top) => Number(top.children[0].textContent.replace('⭐ ', ''));

test('🔍 Codex 148차 #1 🎯 — 던진 뒤 화면이 1.6초 멈췄다 한꺼번에 와도(착지·흔들림·다음 포켓몬이 한 번에) 새 포켓몬이 보이고 볼은 손에 · 점수는 한 번', async (t) => {
  const w = world(t, (stage) => runThrow(stage, { rng: seeded(6), pool: POOL }));
  const root = w.stage.children[0];
  const [top, field] = root.children;
  const monEl = field.children[2];
  const ball = field.children[3];
  w.adv(1500);
  field.fire('keydown', { key: ' ', repeat: false });
  assert.equal(ball.className, 'gx-ball is-fly');
  w.jump(FLY_MS + CATCH_MS + 200);
  assert.ok(!monEl.classList.contains('is-in'), '새 포켓몬이 투명하게 남지 않는다');
  assert.equal(ball.className, 'gx-ball is-rest', '볼은 손에');
  const sc = scoreOf(top);
  assert.ok(sc >= 1 && sc <= 6, `⭐ ${sc}`);
  w.adv(500);
  assert.equal(scoreOf(top), sc, '점수는 한 번만');
  field.fire('keydown', { key: ' ', repeat: false });
  assert.equal(ball.className, 'gx-ball is-fly', '바로 다시 던질 수 있다');
});

test('🔍 Codex 148차 #2 🎯 — 끝난 뒤엔 남은 타이머가 화면을 안 만짐(글자 지우기·「명중!」) · 「준비!」 때 그만두면 시작도 안 함 · 내려 둔 동안 「명중!」 안 띄움', async (t) => {
  const w = world(t, (stage) => runThrow(stage, { rng: seeded(6), pool: POOL }));
  const root = w.stage.children[0];
  const [, field, , fx] = root.children;
  w.adv(1500);
  field.fire('keydown', { key: ' ', repeat: false });
  w.adv(FLY_MS + 50); // 등급 글자가 떴다
  w.hide(true);
  w.adv(CATCH_MS);
  assert.ok(!fx.children.some((f) => f.textContent === '명중!'), '내려 둔 동안은 「명중!」 안 띄움');
  w.hide(false);
  const n = fx.children.length;
  assert.ok(n >= 1);
  w.h.stop();
  w.adv(3000);
  assert.equal(fx.children.length, n, '끝난 뒤엔 글자를 지우는 타이머도 없다');
  await w.flush();
  assert.equal(w.st.over.quit, true);
});

test('🔍 Codex 148차 #2 🎯 — 「준비!」 때 그만두면 판이 시작되지 않는다(예약도 지움)', async (t) => {
  const w = world(t, (stage) => runThrow(stage, { rng: seeded(6), pool: POOL }));
  const root = w.stage.children[0];
  w.adv(300);
  w.h.stop();
  w.adv(2000);
  assert.ok(!root.classList.contains('is-go'), '시작 안 함');
  assert.equal(root.children[4].textContent, '준비!');
  await w.flush();
  assert.deepEqual(w.st.over, { score: 0, quit: true });
});

test('🔍 Codex 148차 #2 🎯 — 「끝!」을 보여 주는 동안 그만두면 기다리지 않고 바로 한 번 정산(끝난 판 — quit 아님)', async (t) => {
  const w = world(t, (stage) => runThrow(stage, { rng: seeded(6), pool: POOL }));
  const root = w.stage.children[0];
  const banner = root.children[4];
  w.adv(800 + THR_SEC * 1000 + 100);
  assert.equal(banner.textContent, '끝!');
  await w.flush();
  assert.equal(w.st.over, null, '아직 「끝!」을 보여 주는 중');
  w.h.stop();
  await w.flush();
  assert.deepEqual(w.st.over, { score: 0, quit: false }, '바로 정산');
  const first = w.st.over;
  w.adv(2000);
  await w.flush();
  assert.equal(w.st.over, first, '한 번만');
});

test('🔍 Codex 148차 #2 🎣 — 끝난 뒤 글자 지우는 타이머 없음 · 「끝!」 중 그만두면 바로 한 번 정산', async (t) => {
  const w = world(t, (stage) => runFish(stage, { rng: () => 0.5, art: {} }));
  const root = w.stage.children[0];
  const [, field, , fx] = root.children;
  const banner = root.children[4];
  w.adv(900);
  field.fire('pointerdown', { pointerId: 1 });
  w.doc.fire('pointerup', { pointerId: 1 });
  assert.ok(fx.children.some((f) => f.textContent === '휙!'));
  w.adv(FISH_SEC * 1000 + 200);
  assert.equal(banner.textContent, '끝!');
  const n = fx.children.length;
  w.h.stop();
  await w.flush();
  assert.deepEqual(w.st.over, { score: 0, quit: false });
  w.adv(3000);
  assert.equal(fx.children.length, n, '끝난 뒤엔 화면을 안 만진다');
});

test('🔍 Codex 148차 #2 🎣 — 글자(「휙!」)가 뜬 직후 그만두면 그 글자를 지우는 타이머도 없다(닫힌 화면을 안 만짐)', async (t) => {
  const w = world(t, (stage) => runFish(stage, { rng: () => 0.5, art: {} }));
  const root = w.stage.children[0];
  const [, field, , fx] = root.children;
  w.adv(900);
  field.fire('pointerdown', { pointerId: 1 });
  w.doc.fire('pointerup', { pointerId: 1 });
  const n = fx.children.length;
  assert.ok(fx.children.some((f) => f.textContent === '휙!'));
  w.h.stop();
  w.adv(3000);
  assert.equal(fx.children.length, n);
  await w.flush();
  assert.deepEqual(w.st.over, { score: 0, quit: true });
});

test('🔍 Codex 148차 #3 🎣 — ⌨️ 키로 챈 채 초점이 마당 밖으로 가면(blur) 뗀 것으로 — 막대가 내려간다', async (t) => {
  const w = world(t, (stage) => runFish(stage, { rng: () => 0.5, art: {} }));
  const root = w.stage.children[0];
  const field = root.children[1];
  const bar = field.children[7].children[1];
  w.adv(900);
  field.fire('keydown', { key: ' ', repeat: false });
  field.fire('keyup', { key: ' ' });
  let k = 0;
  while (!root.classList.contains('is-bite') && k++ < 200) w.adv(50);
  field.fire('keydown', { key: ' ', repeat: false }); // 챔 + 누르고 있음
  w.adv(300);
  const up1 = parseFloat(bar.style.bottom);
  assert.ok(up1 > BAR0, `오른다 ${up1}`);
  field.fire('blur');
  w.adv(300);
  const up2 = parseFloat(bar.style.bottom);
  assert.ok(up2 < up1, `떼어서 내려간다 ${up1} → ${up2}`);
  w.h.stop();
});
