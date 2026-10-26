// 🎮 게임기 미니 게임 v345 (2026-10-26 아버님 "다음 미니 게임 진행하자" → 기본안 "이대로") — node --test tests/minigame345.test.js
// 🔀 타입 나누기(40초 · 내려오는 포켓몬을 맞는 타입 상자에 · 빨리 ⭐2) · 🔍 우리 집 다른 그림 찾기(진우 1층 방 두 장 · 다른 곳 다섯 · 가장 빠른 시간)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GAMES, gameById } from '../js/minigame.js';
import { GAME_SONGS } from '../js/gamesong.js';
import { TYPE_KO } from '../js/journey.js';
import { MON_TYPES } from '../js/montypes.js';
import { ROOM, ROOM_WIDE, FURN, HEAL, furnById, canPlace } from '../js/house.js';
import {
  SORT_SEC, TOP_Y, BOT_Y, FIRST_MS, GAP_MS, FIRST_SET, FIRST_CARDS, SET_CARDS, FOUR_FROM, FAST, SORT_FEW, SORT_KINDS, TYPE_COLOR, TYPE_DARK_TEXT,
  sortFall, sortPool, sortKinds, sortReady, sortStart, sortSet, sortTick, sortPick, sortProg, sortY, sortShift, typeLine, josaNeun, runSort,
} from '../js/gamesort.js';
import {
  DIFF_SEC, DIFF_N, FILL_MIN, HINT_MS, PAD, WALL_RATIO, KINDS, FILL_IDS,
  diffRows, diffBox, diffScene, diffMake, inBox, diffStart, diffTap, diffHint, diffShift, runDiff,
} from '../js/gamediff.js';

const src = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
function seeded(seed = 7) {
  let x = seed >>> 0;
  return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 2 ** 32; };
}
const SEEDS = [1, 7, 42, 2026, 99999, 31337, 5, 777];
const ALL = Object.keys(MON_TYPES).map(Number);
const POOL = (n = 60) => ALL.slice(0, n).map((id, i) => ({ id, types: MON_TYPES[id], mine: i < 8 }));

// ───────────────────── 목록 · 게임기 화면 연결 ─────────────────────

test('🎮 v345 게임 목록 — 🔀 타입 나누기 40초 · 🔍 다른 그림 찾기(⏱️ 가장 빠른 시간 · 넓은 카드) · 설명에 숫자 없음 · 화면·준비 · 음악 · 저장을 안 만짐', () => {
  assert.deepEqual(GAMES.map((g) => g.id).slice(0, 14), ['dig', 'run', 'shadow', 'pair', 'berry', 'balloon', 'tower', 'tug', 'adv', 'jig', 'throw', 'fish', 'sort', 'diff']);
  const so = gameById('sort');
  const di = gameById('diff');
  assert.deepEqual([so.emoji, so.ko, so.sec, !!so.clock], ['🔀', '타입 나누기', SORT_SEC, false]);
  assert.deepEqual([di.emoji, di.ko, di.sec, di.clock, di.wide], ['🔍', '우리 집 다른 그림 찾기', DIFF_SEC, true, true]);
  assert.equal(SORT_SEC, 40);
  for (const g of GAMES) assert.ok(!/\d/.test(g.how), `${g.id}: 설명에 숫자 없음`);
  const gv = src('js/gameview.js');
  assert.match(gv, /\n {2}sort: \{ run: runSort, prep: \(\) => sortPrep\(\), none: '포켓몬 그림이 아직 없어요 — 인터넷이 될 때 다시 해 봐요\.' \},/);
  assert.match(gv, /\n {2}diff: \{ run: runDiff, prep: async \(\) => \(\{ scene: diffScene\(\) \}\) \},/);
  const sp = gv.slice(gv.indexOf('async function sortPrep('), gv.indexOf('\n}\n', gv.indexOf('async function sortPrep(')));
  assert.match(sp, /Array\.isArray\(MON_TYPES\[p\.id\]\)/, '타입 표에 있는 포켓몬만');
  assert.match(sp, /mine: mine\.has\(p\.id\)/, '잡은 포켓몬 표시');
  assert.match(sp, /if \(!sortReady\(pool\)\) \{/, '못 열면(장수·타입) 몇 장 더 받아 본다 — 🔍 Codex 149차 #1');
  assert.match(sp, /return sortReady\(pool\) \? \{ pool \} : null;/, '그래도 못 열면 판을 안 쓴다');
  const ds = gv.slice(gv.indexOf('function diffScene('), gv.indexOf('\n}\n', gv.indexOf('function diffScene(')));
  assert.match(ds, /const room = \(h && h\.rooms && h\.rooms\[0\]\) \|\| \{ items: \[\] \};/, '1층 방');
  assert.match(ds, /items: \(room\.items \|\| \[\]\)\.map\(\(it\) => \(\{ \.\.\.it \}\)\),/, '복사본 — 진짜 방은 안 건드린다');
  assert.ok(GAME_SONGS.find((s) => s.id === 'busy').games.includes('sort'));
  assert.ok(GAME_SONGS.find((s) => s.id === 'think').games.includes('diff'));
  for (const f of ['js/gamesort.js', 'js/gamediff.js']) assert.ok(!/coins|addCoins|applyPurchase|items\[|xp\.js|db\.js|houseDo|placeRule|moveRule/.test(src(f)), `${f}: 저장·집 바꾸기를 안 만진다`);
  const sw = src('sw.js');
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(sw) || [])[1]) >= 345);
  for (const f of ['./js/gamesort.js', './js/gamediff.js']) assert.ok(sw.includes(`'${f}'`), f);
  const css = src('css/style.css');
  assert.match(css, /\.gk-field \{[^}]*touch-action: none;/, '카드를 끌 때 화면이 안 밀림');
  assert.match(css, /\.gk-boxes\.is-4 \{ grid-template-columns: repeat\(4, minmax\(0, 1fr\)\); \}/);
  assert.match(css, /\.gq-pic \.house-item \{ cursor: inherit; touch-action: auto; pointer-events: none; \}/, '그림 속 가구는 집 꾸미기처럼 끌리지 않는다');
  assert.match(css, /@media \(max-aspect-ratio: 1\/1\) \{ \.gq-pics \{ grid-template-columns: minmax\(0, 1fr\);/, '세로 화면은 위아래로');
});

// ───────────────────── 🔀 엔진 ─────────────────────

test('🔀 타입 자료 — 열여덟 타입마다 색 · 이름(대여행과 같은 말) · 잘 아는 포켓몬 타입(PokeAPI 표) · 「은/는」', () => {
  assert.deepEqual(Object.keys(TYPE_COLOR).sort(), Object.keys(TYPE_KO).sort());
  for (const t of TYPE_DARK_TEXT) assert.ok(TYPE_COLOR[t], t);
  assert.deepEqual([MON_TYPES[25], MON_TYPES[1], MON_TYPES[6], MON_TYPES[7], MON_TYPES[658]], [['electric'], ['grass', 'poison'], ['fire', 'flying'], ['water'], ['water', 'dark']]);
  assert.equal(typeLine('피카츄', ['electric']), '피카츄는 전기 타입!');
  assert.equal(typeLine('이상해씨', ['grass', 'poison']), '이상해씨는 풀·독 타입!');
  assert.equal(typeLine('리자몽', ['fire', 'flying']), '리자몽은 불꽃·비행 타입!');
  assert.deepEqual([josaNeun('개굴닌자'), josaNeun('꼬부기'), josaNeun('Mew'), josaNeun('')], ['는', '는', '는', '는']);
  assert.equal(josaNeun('잉어킹'), '은');
});

test('🔀 빠르기·카드 모음 — 다 내려오는 데 5.2 → 2.8초 · 높이 4 → 30칸 · 깨진 카드·모르는 타입·같은 번호는 뺀다', () => {
  assert.equal(sortFall(0), 5200);
  assert.equal(sortFall(SORT_SEC * 1000), 2800);
  assert.equal(sortFall(-9), 5200);
  assert.equal(sortFall(9e9), 2800);
  const card = { born: 1000, fall: 4000 };
  assert.deepEqual([sortProg(card, 1000), sortProg(card, 3000), sortProg(card, 9000), sortY(card, 1000), sortY(card, 5000)], [0, 0.5, 1, TOP_Y, BOT_Y]);
  assert.deepEqual(sortPool([{ id: 25, types: ['electric'] }, { id: 25, types: ['electric'] }, { id: 7, types: ['water', 'mystery'] }, { id: 'x', types: ['fire'] }, { id: 9, types: [] }, null, { id: 4 }]),
    [{ id: 25, types: ['electric'], mine: false }, { id: 7, types: ['water'], mine: false }]);
});

test('🔀 상자 — 처음은 불꽃·물·풀 다섯 장 · 그 뒤 여섯 장마다 다른 타입(카드가 둘 이상인 타입만 · 앞과 같은 묶음 피함) · 25초부터 상자 넷 · 카드는 늘 상자 타입 하나 이상', () => {
  for (const seed of SEEDS) {
    const rng = seeded(seed);
    const s = sortStart(0, POOL(80));
    const sets = [];
    let t = 0;
    while (t < s.end) {
      t += 50;
      const ev = sortTick(s, t, rng);
      if (ev.set) sets.push({ at: t, boxes: ev.set });
      if (ev.added) assert.ok(ev.added.types.some((x) => s.boxes.includes(x)), '카드가 상자 타입 하나 이상');
      if (s.card && t - s.card.born >= 900) sortPick(s, s.boxes.findIndex((b) => s.card.types.includes(b)), t);
    }
    assert.deepEqual(sets[0].boxes, FIRST_SET);
    assert.equal(sets[0].at, FIRST_MS);
    for (const st of sets) {
      assert.equal(new Set(st.boxes).size, st.boxes.length, '상자 타입이 겹치지 않음');
      assert.equal(st.boxes.length, st.at >= FOUR_FROM ? 4 : 3);
    }
    for (let k = 1; k < sets.length; k++) assert.notDeepEqual([...sets[k].boxes].sort(), [...sets[k - 1].boxes].sort(), '앞과 같은 묶음 피함');
  }
  // 그림 있는 포켓몬이 적어도 상자 타입은 카드가 둘 이상인 타입만
  const few = sortStart(0, POOL(12));
  const counts = {};
  for (const p of few.pool) for (const ty of p.types) counts[ty] = (counts[ty] || 0) + 1;
  few.first = false;
  for (let k = 0; k < 50; k++) for (const ty of sortSet(few, 3, seeded(k))) assert.ok(counts[ty] >= 2, ty);
});

// 🔍 Codex 149차 #1 — 그림이 열둘이어도 타입이 모두 다르면 상자를 못 만들어 40초 빈 화면이었다
const ONE_EACH = [4, 7, 25, 35, 50, 52, 63, 66, 88, 114, 127, 147]; // 모두 다른 홑 타입 (Codex가 찾은 열둘)
const byType = (types, each) => types.flatMap((t, k) => Array.from({ length: each }, (_, j) => ({ id: 1000 + k * 10 + j, types: [t] })));

test('🔀 한 판을 열 수 있나(sortReady) — 그림 열둘 + 상자로 쓸 타입(카드 둘 이상) 넷 · 열둘이어도 타입이 모두 다르면 못 엶 · 타입이 셋뿐이면 25초 뒤에도 상자 셋(카드마다 다시 안 만듦)', () => {
  const one = ONE_EACH.map((id) => ({ id, types: MON_TYPES[id] }));
  assert.ok(one.every((p) => p.types.length === 1));
  assert.equal(new Set(one.map((p) => p.types[0])).size, 12, '열둘 모두 다른 타입');
  assert.deepEqual([SORT_FEW, SORT_KINDS], [12, 4]);
  assert.deepEqual([sortKinds(one), sortReady(one)], [0, false]);
  assert.deepEqual([sortKinds(byType(['fire', 'water', 'grass'], 4)), sortReady(byType(['fire', 'water', 'grass'], 4))], [3, false], '열둘이어도 타입 셋');
  assert.deepEqual([sortKinds(byType(['fire', 'water', 'grass', 'bug'], 3)), sortReady(byType(['fire', 'water', 'grass', 'bug'], 3))], [4, true]);
  assert.equal(sortReady(byType(['fire', 'water', 'grass', 'bug'], 2)), false, '타입 넷이어도 여덟 장');
  assert.equal(sortReady([...byType(['fire', 'water', 'grass', 'bug'], 2), ...one.slice(4, 8)]), true, '열두 장 · 넷은 둘씩');
  assert.equal(sortKinds([{ id: 1, types: ['grass', 'poison'] }, { id: 2, types: ['grass', 'poison'] }]), 2, '타입 둘인 카드는 두 타입에 셈');
  assert.equal(sortReady(POOL(60)), true);
  assert.equal(sortReady(null), false);
  // 타입이 셋뿐인 판 — 25초 뒤에도 상자 셋 · 상자는 여섯 장마다만 바꾼다 (넷을 찾다 카드마다 새로 만들지 않음)
  for (const seed of SEEDS) {
    const rng = seeded(seed);
    const s = sortStart(0, byType(['fire', 'water', 'grass'], 4));
    assert.equal(s.kinds, 3);
    let t = 0;
    let late = 0;
    let lateSets = 0;
    while (t < s.end) {
      t += 50;
      const ev = sortTick(s, t, rng);
      if (ev.set) { assert.equal(ev.set.length, 3); if (t >= FOUR_FROM) lateSets += 1; }
      if (ev.added && t >= FOUR_FROM) late += 1;
      if (s.card && t - s.card.born >= 900) sortPick(s, 0, t);
    }
    assert.ok(late >= 8, `25초 뒤 카드 ${late}장`);
    assert.ok(lateSets <= Math.ceil(late / SET_CARDS) + 1, `25초 뒤 상자 ${lateSets}번 · 카드 ${late}장`);
  }
  // 상자로 쓸 타입이 없으면 카드도 없다 — 그래서 sortPrep이 판을 안 연다
  const none = sortStart(0, one);
  for (let t = 50; t <= none.end; t += 50) assert.equal(sortTick(none, t, seeded(1)).added, null);
});

test('🔀 고르기 — 맞으면 ⭐(절반 전 ⭐2 · 그 뒤 ⭐1) · 틀리면 감점 없이 다음 · 타입 둘은 어느 쪽이든 · 바닥까지 가도 감점 없음 · 없는 상자·끝난 뒤', () => {
  const rng = seeded(3);
  const s = sortStart(0, [{ id: 1, types: ['grass', 'poison'] }, { id: 4, types: ['fire'] }, { id: 5, types: ['fire'] }, { id: 7, types: ['water'] }, { id: 8, types: ['water'] }, { id: 2, types: ['grass', 'poison'] }]);
  sortTick(s, FIRST_MS, rng);
  assert.deepEqual(s.boxes, FIRST_SET);
  assert.equal(sortPick(s, 9, FIRST_MS + 10).kind, 'none', '없는 상자');
  const c1 = s.card;
  const right = s.boxes.findIndex((b) => c1.types.includes(b));
  const r1 = sortPick(s, right, FIRST_MS + c1.fall * (FAST - 0.1));
  assert.deepEqual([r1.kind, r1.pts, s.score, s.fast], ['right', 2, 2, 1], '절반 전에 ⭐2');
  assert.equal(sortPick(s, right, FIRST_MS + 100).kind, 'none', '카드가 없으면 none');
  const t2 = FIRST_MS + c1.fall * (FAST - 0.1) + GAP_MS;
  sortTick(s, t2, rng);
  const c2 = s.card;
  assert.ok(c2 && c2.n === 2);
  const wrong = s.boxes.findIndex((b) => !c2.types.includes(b));
  const r2 = sortPick(s, wrong, t2 + 100);
  assert.deepEqual([r2.kind, s.score, s.wrong], ['wrong', 2, 1], '틀려도 감점 없음');
  sortTick(s, t2 + 100 + GAP_MS, rng);
  const c3 = s.card;
  const r3 = sortPick(s, s.boxes.findIndex((b) => c3.types.includes(b)), t2 + 100 + GAP_MS + c3.fall * 0.8);
  assert.deepEqual([r3.kind, r3.pts], ['right', 1], '늦으면 ⭐1');
  // 타입 둘 — 이상해씨는 풀이든 독이든
  const d = sortStart(0, [{ id: 1, types: ['grass', 'poison'] }]);
  d.boxes = ['grass', 'poison', 'fire'];
  d.card = { n: 1, id: 1, types: ['grass', 'poison'], born: 0, fall: 5000 };
  assert.equal(sortPick({ ...d, card: { ...d.card } }, 0, 10).kind, 'right');
  assert.equal(sortPick({ ...d, card: { ...d.card } }, 1, 10).kind, 'right');
  assert.equal(sortPick({ ...d, card: { ...d.card } }, 2, 10).kind, 'wrong');
  // 바닥까지
  const b = sortStart(0, POOL(30));
  sortTick(b, FIRST_MS, rng);
  const fall = b.card.fall;
  const ev = sortTick(b, FIRST_MS + fall, rng);
  assert.ok(ev.drop, '바닥까지 감');
  assert.deepEqual([b.score, b.drops], [0, 1]);
  assert.equal(sortPick(b, 0, b.end).kind, 'over');
});

test('🔀 40초 한 판(가짜 시계 · 씨앗 여덟) — 빨리 맞히는 손 > 천천히 맞히는 손 > 아무 상자나 · 점수 = 맞힌 ⭐ 합 · 시계는 끝을 안 넘음 · 앱을 내렸다 돌아오면(sortShift) 그대로', () => {
  const play = (seed, kind) => {
    const rng = seeded(seed);
    const r2 = seeded(seed + 9);
    const s = sortStart(0, POOL(120));
    let sum = 0;
    let t = 0;
    let seen = 0;
    while (t < s.end) {
      t += 50;
      sortTick(s, t, rng);
      const wait = kind === 'quick' ? 900 : kind === 'slow' ? 2200 : 1200;
      if (s.card && s.card.n !== seen && t - s.card.born >= wait) {
        seen = s.card.n;
        const right = s.boxes.findIndex((b) => s.card.types.includes(b));
        const r = sortPick(s, kind === 'random' ? Math.floor(r2() * s.boxes.length) : right, t);
        if (r.kind === 'right') sum += r.pts;
      }
    }
    assert.equal(s.score, sum);
    assert.equal(s.last, s.end);
    return s.score;
  };
  let q = 0;
  let sl = 0;
  let rd = 0;
  for (const seed of SEEDS) { q += play(seed, 'quick'); sl += play(seed, 'slow'); rd += play(seed, 'random'); }
  assert.ok(q > sl * 2, `빨리 ${q} · 천천히 ${sl}`);
  assert.ok(sl > rd, `천천히 ${sl} · 아무거나 ${rd}`);
  const s = sortStart(1000, POOL(30));
  sortTick(s, 1000 + FIRST_MS + 500, seeded(1));
  const y0 = sortY(s.card, s.last);
  sortShift(s, 4000);
  assert.ok(Math.abs(sortY(s.card, s.last) - y0) < 1e-9);
  assert.equal(s.end, 1000 + 4000 + SORT_SEC * 1000);
  const b = JSON.stringify(s);
  sortShift(s, 0); sortShift(s, -2); sortShift(s, NaN);
  assert.equal(JSON.stringify(s), b);
});

// ───────────────────── 🔍 엔진 ─────────────────────

test('🔍 자리 셈 — 집 꾸미기(houseview.boxOf)와 같은 꼴 · 벽 줄 1.3칸 · 벽 가구는 벽 가운데 · 두 칸 가구 · 🔄 세로', () => {
  assert.match(src('js/houseview.js'), /export const WALL_RATIO = 1\.3;/);
  assert.equal(WALL_RATIO, 1.3);
  assert.equal(diffRows(ROOM), 7.3);
  const rows = 7.3;
  assert.deepEqual(diffBox(ROOM, 'f_teddy', 2, 3), { left: 25, top: ((1.3 + 3) / rows) * 100, width: 12.5, height: (1 / rows) * 100 });
  assert.deepEqual(diffBox(ROOM, 'f_frame', 4, 0), { left: 50, top: ((1.3 - 1) / 2 / rows) * 100, width: 12.5, height: (1 / rows) * 100 }, '벽 가구는 벽 줄 가운데');
  assert.deepEqual(diffBox(ROOM, 'f_sofa', 1, 2).width, 25);
  assert.deepEqual([diffBox(ROOM, 'f_sofa', 1, 2, 1).width, diffBox(ROOM, 'f_sofa', 1, 2, 1).height], [12.5, (2 / rows) * 100]);
  assert.equal(diffBox(ROOM, 'f_none', 0, 0), null);
});

const JINWOO = [{ u: 1, id: 'f_bed', x: 0, y: 4 }, { u: 2, id: 'f_game', x: 3, y: 2 }, { u: 3, id: 'f_frame', x: 2, y: 0 }, { u: 4, id: 'f_teddy', x: 6, y: 5, f: 1 }, { u: 5, id: 'f_desk', x: 4, y: 0 }, { u: 6, id: 'f_sofa', x: 6, y: 1, r: 1 }];

test('🔍 그림 바탕 — 진우 방 가구를 그대로(뒤집기·🔄 세로 포함) · 깨진 자리·겹침·모르는 가구는 뺌 · 일곱보다 적으면 게임 그림에만 채움(💊는 안 채움) · 입력은 안 바뀜', () => {
  const raw = { items: [...JINWOO, { u: 9, id: 'f_chair', x: 0, y: 4 }, { u: 10, id: 'f_nope', x: 1, y: 1 }, { u: 11, id: 'f_teddy', x: 99, y: 1 }] };
  const before = JSON.stringify(raw);
  const sc = diffScene(raw, ROOM, seeded(2));
  assert.equal(JSON.stringify(raw), before, '입력 그대로');
  assert.deepEqual(sc.items.slice(0, 6).map((it) => [it.id, it.x, it.y, it.r || 0, it.f || 0]), JINWOO.map((it) => [it.id, it.x, it.y, it.r || 0, it.f || 0]));
  assert.ok(!sc.items.some((it) => it.id === 'f_nope' || it.x === 99), '깨진 것은 뺀다');
  assert.ok(!sc.items.slice(6).some((it) => it.id === 'f_chair' && it.x === 0 && it.y === 4), '겹친 것은 뺀다');
  assert.equal(sc.items.length, FILL_MIN, '일곱까지 채움');
  assert.ok(!FILL_IDS.includes(HEAL));
  const empty = diffScene({}, ROOM_WIDE, seeded(5));
  assert.equal(empty.items.length, FILL_MIN, '빈 방도 일곱');
  for (const [k, it] of empty.items.entries()) assert.ok(canPlace(ROOM_WIDE, { items: empty.items.filter((_, j) => j < k) }, it.id, it.x, it.y, undefined, it.r || 0), '채운 가구끼리 안 겹침');
  const many = diffScene({ items: [...JINWOO, { u: 7, id: 'f_chair', x: 2, y: 3 }, { u: 8, id: 'f_clock', x: 6, y: 0 }] }, ROOM, seeded(1));
  assert.equal(many.items.length, 8, '일곱 넘으면 그대로(채우지 않음)');
});

/** 오른쪽 그림이 왼쪽과 다른 곳 — 가구 하나하나를 견줘 (u로) */
function changes(left, right) {
  const L = new Map(left.map((it) => [it.u, it]));
  const R = new Map(right.map((it) => [it.u, it]));
  const out = [];
  for (const [u, it] of L) {
    const r = R.get(u);
    if (!r) out.push('gone');
    else if (r.id !== it.id) out.push('swap');
    else if (r.x !== it.x || r.y !== it.y) out.push('moved');
    else if ((r.r || 0) !== (it.r || 0) || (r.f || 0) !== (it.f || 0)) out.push('other');
  }
  for (const u of R.keys()) if (!L.has(u)) out.push('extra');
  return out.sort();
}

test('🔍 다른 곳 만들기(씨앗 300 × 방 넷) — 늘 다섯 · 오른쪽만 바뀜 · 실제로 바뀐 것 = 다른 곳 목록 · 상자는 그림 안 · 다른 곳끼리 안 겹침 · 오른쪽 가구끼리도 안 겹침', () => {
  const full = [];
  for (let y = 0; y < 6; y += 2) for (let x = 0; x < 8; x += 2) full.push({ u: full.length + 1, id: 'f_chair', x, y });
  for (let x = 0; x < 8; x++) full.push({ u: full.length + 1, id: 'f_clock', x, y: 0 });
  const rooms = [[ROOM, []], [ROOM, JINWOO], [ROOM_WIDE, JINWOO], [ROOM, full]];
  const kindsSeen = new Set();
  for (const [size, items] of rooms) {
    for (let seed = 1; seed <= 300; seed++) {
      const rng = seeded(seed);
      const sc = diffScene({ items }, size, rng);
      const m = diffMake(sc, size, rng);
      assert.equal(m.spots.length, DIFF_N, `씨앗 ${seed}`);
      assert.deepEqual(m.left, sc.items, '왼쪽은 바탕 그대로');
      assert.deepEqual(changes(m.left, m.right), m.spots.map((sp) => sp.kind).sort(), '바뀐 것 = 다른 곳');
      for (const sp of m.spots) {
        kindsSeen.add(sp.kind);
        assert.ok(KINDS.includes(sp.kind) && sp.ko);
        assert.equal(sp.boxes.length, sp.kind === 'moved' ? 2 : 1);
        for (const b of sp.boxes) assert.ok(b.left >= 0 && b.top >= 0 && b.left + b.width <= 100 + 1e-9 && b.top + b.height <= 100 + 1e-9, JSON.stringify(b));
      }
      const boxes = m.spots.flatMap((sp, i) => sp.boxes.map((b) => ({ ...b, i })));
      for (const a of boxes) for (const b of boxes) if (a.i < b.i) assert.ok(!(a.left < b.left + b.width && b.left < a.left + a.width && a.top < b.top + b.height && b.top < a.top + a.height), `씨앗 ${seed} 다른 곳 겹침`);
      for (const [k, it] of m.right.entries()) assert.ok(canPlace(size, { items: m.right.filter((_, j) => j !== k) }, it.id, it.x, it.y, undefined, it.r || 0), `씨앗 ${seed} 오른쪽 겹침 ${it.id}`);
      for (const it of m.right) assert.ok(furnById(it.id) && it.id !== HEAL || m.left.some((l) => l.u === it.u && l.id === it.id), '💊는 새로 안 생김');
    }
  }
  assert.deepEqual([...kindsSeen].sort(), [...KINDS].sort(), '네 종류가 다 나온다');
  for (const sp of diffMake(diffScene({ items: JINWOO }, ROOM, seeded(8)), ROOM, seeded(8)).spots) if (sp.kind === 'swap') assert.ok(true);
  assert.ok(FURN.every((d) => d.id === HEAL || FILL_IDS.includes(d.id)));
});

test('🔍 누르기 — 상자 둘레 3%까지 찾음 · 옮겨진 가구는 둘 중 어디든 · 찾은 곳을 또 누르면 miss(셈 없음) · 다섯이면 끝(걸린 초) · 끝난 뒤 over', () => {
  const sc = diffScene({ items: JINWOO }, ROOM, seeded(4));
  const m = diffMake(sc, ROOM, seeded(4));
  const s = diffStart(1000, m.spots);
  assert.deepEqual(diffTap(s, -50, -50, 1100), { kind: 'miss' });
  assert.deepEqual(diffTap(s, NaN, 3, 1100), { kind: 'miss' });
  assert.equal(s.misses, 2);
  const b0 = m.spots[0].boxes[0];
  assert.equal(PAD, 3, '둘레 3% — 4학년 손가락에 너그럽게');
  assert.ok(inBox(b0, b0.left - 2.9, b0.top), '상자 밖 2.9%도 찾음');
  assert.ok(!inBox(b0, b0.left - 3.5, b0.top));
  const order = m.spots.map((sp, i) => i);
  for (const [k, i] of order.entries()) {
    const sp = m.spots[i];
    const b = sp.boxes[sp.boxes.length - 1]; // 옮겨진 가구는 새 자리로
    const r = diffTap(s, b.left + b.width / 2, b.top + b.height / 2, 1000 + (k + 1) * 4000);
    assert.equal(r.i, i);
    assert.equal(r.kind, k < DIFF_N - 1 ? 'found' : 'done');
    if (k === 0) assert.deepEqual(diffTap(s, b.left + b.width / 2, b.top + b.height / 2, 1000 + 4100), { kind: 'miss' }, '찾은 곳을 또');
  }
  assert.deepEqual([s.score, s.sec], [DIFF_N, 20]);
  assert.equal(diffTap(s, 50, 50, 99999).kind, 'over');
});

test('🔍 힌트 — 마지막으로 찾은 뒤 20초면 남은 곳 하나(맨 앞) · 이미 있으면 그대로 · 그곳을 찾으면 지워지고 시계가 다시 · 앱을 내린 동안은 시계에 안 들어감(diffShift) · 다 찾은 뒤엔 안 밂', () => {
  const m = diffMake(diffScene({ items: JINWOO }, ROOM, seeded(6)), ROOM, seeded(6));
  const s = diffStart(0, m.spots);
  assert.equal(diffHint(s, HINT_MS - 1), -1);
  assert.equal(diffHint(s, HINT_MS), 0);
  assert.equal(diffHint(s, HINT_MS + 5000), -1, '이미 힌트');
  const b = m.spots[0].boxes[0];
  diffTap(s, b.left + 1, b.top + 1, HINT_MS + 6000);
  assert.equal(s.hint, -1, '찾으면 힌트 지움');
  assert.equal(diffHint(s, HINT_MS + 6000 + HINT_MS - 1), -1, '시계가 다시');
  diffShift(s, 10000);
  assert.deepEqual([s.t0, s.lastFind], [10000, HINT_MS + 16000]);
  assert.equal(diffHint(s, HINT_MS + 6000 + HINT_MS + 5000), -1, '내린 동안은 안 셈');
  const b2 = JSON.stringify(s);
  diffShift(s, 0); diffShift(s, -1); diffShift(s, NaN);
  assert.equal(JSON.stringify(s), b2);
  s.doneAt = 1;
  diffShift(s, 500);
  assert.equal(s.t0, 10000, '다 찾은 뒤엔 그대로');
});

// ───────────────────── 화면 (가짜 화면 · 가짜 시계) ─────────────────────

class FakeEl {
  constructor(tag) { this.tagName = String(tag).toUpperCase(); this.className = ''; this.children = []; this.listeners = {}; this.style = { setProperty(k, v) { this[k] = v; } }; this.attrs = {}; this.dataset = {}; this.textContent = ''; this.html = ''; this.rect = null; }
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
  /** rect를 주면 그 자리 (🔀 상자마다 다른 자리) · 없으면 모두 같은 자리 */
  getBoundingClientRect() { return this.rect || { left: 0, top: 0, right: 100, bottom: 70, width: 100, height: 70 }; }
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
  /** 시각만 간다 — 화면(프레임)이 밀린 동안처럼 시계(loop)는 안 돈다 (🔍 Codex 149차 #2) */
  const jump = (ms) => { clock += ms; };
  const flush = () => new Promise((r) => setImmediate(r));
  const hide = (on) => { doc.hidden = on; doc.fire('visibilitychange'); };
  return { stage, h, doc, adv, jump, flush, st, hide };
}
const KO = { 25: '피카츄', 4: '파이리', 7: '꼬부기', 1: '이상해씨', 37: '식스테일', 60: '발챙이', 43: '뚜벅쵸', 58: '가디', 116: '쏘드라', 69: '모다피', 77: '포니타', 118: '콘치' };
const SPOOL = Object.keys(KO).map(Number).map((id, i) => ({ id, ko: KO[id], url: `blob:${id}`, types: MON_TYPES[id], mine: i < 4 }));

test('🔀 화면 — 「준비!」 뒤 상자 셋(불꽃·물·풀 · 이름·색) · 카드(그림·이름) · 맞는 상자 톡 → ⭐ · 틀린 상자 → 「○○는 △ 타입!」 · ⌨️ · 끌어서 상자에 · 40초 뒤 끝 · 듣기를 뗀다', async (t) => {
  const w = world(t, (stage) => runSort(stage, { rng: seeded(3), pool: SPOOL }));
  const root = w.stage.children[0];
  const [top, field, hint, fx] = root.children;
  const [card, boxRow] = field.children;
  assert.equal(hint.textContent, '맞는 타입 상자를 톡! (끌어 넣어도 돼요)');
  w.adv(800 + FIRST_MS + 50);
  assert.deepEqual(boxRow.children.map((b) => b.textContent), ['불꽃', '물', '풀']);
  assert.equal(boxRow.children[0].style.backgroundColor, TYPE_COLOR.fire);
  assert.ok(boxRow.children[2].className.includes('is-dark'), '풀 상자는 진한 글씨');
  assert.equal(card.className, 'gk-card is-on');
  const nameOf = () => card.children[1].textContent;
  const typesOf = () => SPOOL.find((p) => p.ko === nameOf()).types;
  const rightIdx = () => ['fire', 'water', 'grass'].findIndex((x) => typesOf().includes(x));
  assert.match(card.children[0].children[0].src, /^blob:\d+$/);
  boxRow.children[rightIdx()].fire('pointerdown');
  assert.equal(top.children[0].textContent, '⭐ 2', '빨리 맞히면 ⭐2');
  assert.equal(card.className, 'gk-card is-right');
  w.adv(GAP_MS + 50);
  const wrongIdx = ['fire', 'water', 'grass'].findIndex((x) => !typesOf().includes(x));
  const nm = nameOf();
  boxRow.children[wrongIdx].fire('click', { detail: 0 }); // ⌨️
  assert.equal(top.children[0].textContent, '⭐ 2', '틀려도 그대로');
  assert.ok(fx.children.some((f) => f.textContent === typeLine(nm, typesOf())), '답을 알려 줌');
  boxRow.children[0].fire('click', { detail: 1 }); // 손가락 뒤의 click은 안 셈
  w.adv(GAP_MS + 50);
  // 끌어서 상자에 — 가짜 화면은 상자들이 모두 같은 자리라 첫 상자로
  card.fire('pointerdown', { pointerId: 4, clientX: 50, clientY: 10 });
  assert.ok(card.classList.contains('is-drag'));
  w.doc.fire('pointermove', { pointerId: 4, clientX: 50, clientY: 60 });
  w.doc.fire('pointerup', { pointerId: 4, clientX: 50, clientY: 60 });
  assert.ok(/is-(right|wrong)/.test(card.className), '놓은 상자로 골랐다');
  w.adv(45000);
  await w.flush();
  assert.ok(w.st.over && w.st.over.quit === false);
  for (const ty of ['visibilitychange', 'pointermove', 'pointerup', 'pointercancel']) assert.equal((w.doc.listeners[ty] || []).length, 0, ty);
});

test('🔀 화면 — 내려 둔 동안 멈춤 · 그만두면 quit · 「끝!」 중 그만두면 바로 한 번', async (t) => {
  const w = world(t, (stage) => runSort(stage, { rng: seeded(5), pool: SPOOL }));
  const root = w.stage.children[0];
  w.adv(800 + FIRST_MS + 100);
  w.hide(true);
  w.adv(60000);
  await w.flush();
  assert.equal(w.st.over, null, '숨은 동안 안 끝남');
  w.hide(false);
  w.adv(SORT_SEC * 1000 - FIRST_MS); // 끝난 지 0.1초 — 「끝!」을 보여 주는 중(0.9초 기다림 안)
  assert.equal(root.children[4].textContent, '끝!');
  await w.flush();
  assert.equal(w.st.over, null, '아직 「끝!」을 보여 주는 중');
  w.h.stop();
  await w.flush();
  assert.deepEqual(w.st.over, { score: 0, quit: false }, '기다리지 않고 바로');
});

// 🔍 Codex 149차 #2 · P2 — 끌어 놓은 자리(상자마다 다른 자리) · 다른 손가락 · 숨김 · 화면이 밀린 사이 바뀐 카드
function sortScreen(w) {
  const root = w.stage.children[0];
  const [top, field] = root.children;
  const [card, boxRow] = field.children;
  const nameOf = () => card.children[1].textContent;
  const typesOf = () => SPOOL.find((p) => p.ko === nameOf()).types;
  const boxTypes = () => boxRow.children.map((b) => /\bis-(\w+)/.exec(b.className)[1]);
  /** 상자를 가로로 나란히 (상자마다 25칸 · 높이 60~70) */
  const lay = () => boxRow.children.forEach((b, i) => { b.rect = { left: i * 25, right: i * 25 + 24, top: 60, bottom: 70, width: 24, height: 10 }; });
  const clear = () => { for (const b of boxRow.children) b.classList.remove('is-ok', 'is-no'); };
  /** 상자마다 방금 고른 표시 — ok · no · '' */
  const marks = () => boxRow.children.map((b) => (b.classList.contains('is-ok') ? 'ok' : b.classList.contains('is-no') ? 'no' : ''));
  const want = (i) => (typesOf().includes(boxTypes()[i]) ? 'ok' : 'no');
  const press = (id) => card.fire('pointerdown', { pointerId: id, clientX: 50, clientY: 10 });
  const ptr = (type, id, x, y) => w.doc.fire(type, { pointerId: id, clientX: x, clientY: y });
  const dragTo = (id, x, y) => { press(id); ptr('pointermove', id, x, y); ptr('pointerup', id, x, y); };
  const score = () => top.children[0].textContent;
  /** 카드가 보일 때까지 (그동안 고르지 않는다) */
  const toCard = (more = () => true) => { for (let k = 0; k < 800 && !(card.className === 'gk-card is-on' && more()); k++) w.adv(50); assert.equal(card.className, 'gk-card is-on'); };
  return { card, boxRow, nameOf, typesOf, boxTypes, lay, clear, marks, want, press, ptr, dragTo, score, toCard };
}

test('🔀 화면 — 끌어 놓은 자리 아래 상자로(상자마다 다른 자리 · 둘째 · 셋째 · 25초 뒤 넷째) · 상자 밖이면 제자리 · 다른 손가락의 움직임·떼기·취소·누름은 안 셈', async (t) => {
  const w = world(t, (stage) => runSort(stage, { rng: seeded(3), pool: SPOOL }));
  const g = sortScreen(w);
  w.adv(800 + FIRST_MS + 50);
  g.lay();
  // 상자 밖(카드 자리)에 놓으면 제자리 — 고르지 않음
  g.press(4);
  g.ptr('pointerup', 4, 50, 30);
  assert.equal(g.card.className, 'gk-card is-on', '상자 밖이면 안 고름');
  assert.deepEqual(g.marks(), ['', '', '']);
  // 둘째 상자에 놓으면 둘째 상자
  const w1 = g.want(1);
  g.dragTo(4, 37, 65);
  assert.deepEqual(g.marks(), ['', w1, ''], '둘째 상자');
  assert.equal(g.card.className, w1 === 'ok' ? 'gk-card is-right' : 'gk-card is-wrong');
  g.toCard();
  g.clear();
  // 다른 손가락 — 움직임·떼기·취소·카드 누름은 끄는 손가락 것만
  g.press(4);
  g.press(5);
  g.ptr('pointermove', 5, 87, 65);
  g.ptr('pointerup', 5, 12, 65);
  g.ptr('pointercancel', 5, 12, 65);
  assert.ok(g.card.classList.contains('is-drag'), '아직 끄는 중');
  assert.deepEqual(g.marks(), ['', '', ''], '다른 손가락을 떼도 안 고름');
  const w2 = g.want(2);
  g.ptr('pointerup', 4, 62, 65);
  assert.deepEqual(g.marks(), ['', '', w2], '끄던 손가락을 뗀 자리(셋째 상자)');
  g.toCard();
  g.clear();
  // 끄던 손가락이 취소되면 — 그 뒤 떼도 안 고름
  g.press(4);
  g.ptr('pointercancel', 4, 12, 65);
  assert.ok(!g.card.classList.contains('is-drag'));
  g.ptr('pointerup', 4, 12, 65);
  assert.deepEqual(g.marks(), ['', '', '']);
  assert.equal(g.card.className, 'gk-card is-on');
  // 25초 뒤 상자 넷 — 넷째 상자에 놓으면 넷째
  g.toCard(() => g.boxRow.children.length === 4);
  g.lay();
  const w4 = g.want(3);
  g.dragTo(4, 87, 65);
  assert.deepEqual(g.marks(), ['', '', '', w4], '넷째 상자');
  w.h.stop();
  await w.flush();
});

test('🔀 화면 — 끄는 중 앱을 내리면 끌기 끝(돌아와 떼도 안 고름) · 끄는 중 바닥에 닿으면 새 카드는 손가락을 안 따라옴 · 화면이 밀린 사이 바뀐 새 카드는 앞 카드의 놓기·톡으로 안 셈(🔍 Codex 149차 #2)', async (t) => {
  const w = world(t, (stage) => runSort(stage, { rng: seeded(5), pool: SPOOL }));
  const g = sortScreen(w);
  w.adv(800 + FIRST_MS + 50);
  g.lay();
  // 끄는 중 숨김 → 끌기 끝
  g.press(4);
  g.ptr('pointermove', 4, 80, 40);
  w.hide(true);
  assert.ok(!g.card.classList.contains('is-drag'), '숨기면 끌기 끝');
  w.hide(false);
  g.ptr('pointerup', 4, 12, 65);
  assert.deepEqual([g.card.className, g.marks(), g.score()], ['gk-card is-on', ['', '', ''], '⭐ 0'], '돌아와 떼도 안 고름');
  // 끄는 중 카드가 바닥까지 → 새 카드는 손가락 자리로 안 밀림 · 앞 손가락을 떼도 안 고름
  g.press(4);
  g.ptr('pointermove', 4, 80, 40);
  assert.match(g.card.style.transform, /calc\(-50% \+ 30\.0px\)/, '끄는 동안 손가락을 따라감');
  for (let k = 0; k < 200 && g.card.className !== 'gk-card is-drop'; k++) w.adv(50);
  assert.equal(g.card.className, 'gk-card is-drop', '바닥까지');
  g.toCard();
  assert.match(g.card.style.transform, /calc\(-50% \+ 0\.0px\)/, '새 카드는 제자리');
  g.ptr('pointermove', 4, 90, 60);
  assert.match(g.card.style.transform, /calc\(-50% \+ 0\.0px\)/, '앞 손가락이 움직여도 그대로');
  g.ptr('pointerup', 4, 12, 65);
  assert.deepEqual([g.card.className, g.marks()], ['gk-card is-on', ['', '', '']], '앞 손가락을 떼도 새 카드를 안 고름');
  // 화면이 밀림 — 끌기 시작 뒤 시각만 카드가 다 내려오고도 0.55초 넘게 → 놓기는 새 카드를 매기지 않는다
  const s0 = g.score();
  const n0 = g.nameOf();
  g.press(6);
  w.jump(5200 + GAP_MS + 300);
  g.ptr('pointerup', 6, 12, 65);
  assert.deepEqual([g.card.className, g.marks(), g.score()], ['gk-card is-on', ['', '', ''], s0], '밀린 사이 바뀐 새 카드는 안 셈 (놓기)');
  assert.ok(g.card.children[1].textContent, '새 카드가 보인다');
  // 상자 톡도 — 톡한 순간 보이던 카드는 이미 바닥 · 새 카드는 안 셈
  w.jump(5200 + GAP_MS + 300);
  g.boxRow.children[0].fire('pointerdown');
  assert.deepEqual([g.card.className, g.score()], ['gk-card is-on', s0], '밀린 사이 바뀐 새 카드는 안 셈 (톡)');
  w.jump(5200 + GAP_MS + 300);
  g.boxRow.children[0].fire('click', { detail: 0 }); // ⌨️도
  assert.deepEqual([g.card.className, g.score()], ['gk-card is-on', s0], '밀린 사이 바뀐 새 카드는 안 셈 (⌨️)');
  // 그 뒤 보이는 카드는 보통처럼
  const right = g.boxTypes().findIndex((x) => g.typesOf().includes(x));
  g.boxRow.children[right].fire('pointerdown');
  assert.equal(g.card.className, 'gk-card is-right', '보이는 카드는 그대로 고른다');
  assert.notEqual(g.score(), s0);
  assert.ok(n0);
  // 카드가 없는 틈(맞힌 뒤 0.55초)에 톡 — 그 사이 나온, 안 보이던 새 카드는 안 셈
  const s1 = g.score();
  w.jump(GAP_MS + 100);
  g.boxRow.children[0].fire('pointerdown');
  assert.deepEqual([g.card.className, g.score()], ['gk-card is-on', s1], '틈에 톡 — 새 카드는 안 셈');
  w.h.stop();
  await w.flush();
});

const SCENE = { size: ROOM, wall: '#fbf3e4', floor: '#e2c79f', items: JINWOO };

test('🔍 화면 — 방 그림 둘(벽지·바닥 색 · 가구) · 다른 곳 톡 → 두 그림에 동그라미 · 틀린 곳 → ✕(감점 없음) · 20초 힌트 ✨ · 다섯이면 「완성!」 → 걸린 초 · 듣기를 뗀다', async (t) => {
  const w = world(t, (stage) => runDiff(stage, { rng: seeded(4), scene: SCENE }));
  const root = w.stage.children[0];
  const [top, pics, hint] = root.children;
  const [pl, pr] = pics.children;
  assert.equal(hint.textContent, '두 그림에서 다른 곳 다섯 개를 톡! 어느 그림을 눌러도 돼요');
  assert.deepEqual([pl.attrs['aria-label'], pr.attrs['aria-label']], ['왼쪽 그림', '오른쪽 그림']);
  assert.equal(pl.children[0].style.background, '#fbf3e4');
  assert.equal(pl.children[1].style.backgroundColor, '#e2c79f');
  const items = (p) => p.children.filter((c) => c.className.includes('gq-item'));
  assert.equal(items(pl).length, FILL_MIN);
  assert.ok(items(pl).some((e) => e.className.includes('is-flip')), '뒤집힌 곰인형 그대로');
  assert.ok(items(pl).some((e) => e.className.includes('is-turn')), '🔄 세로 소파 그대로');
  const marks = (p) => p.children[p.children.length - 1];
  w.adv(900);
  assert.equal(top.children[1].textContent, '남은 곳 5');
  const made = w.h.made;
  // 틀린 곳 — 왼쪽 위 구석(가구 없는 벽 끝은 아닐 수 있어 다른 곳 상자 밖을 고른다)
  let miss = null;
  for (let x = 1; x < 100 && !miss; x += 3) for (let y = 1; y < 100 && !miss; y += 3) if (!made.spots.some((sp) => sp.boxes.some((b) => inBox(b, x, y)))) miss = [x, y];
  pl.fire('pointerdown', { clientX: miss[0], clientY: miss[1] * 0.7 });
  assert.ok(marks(pl).children.some((m) => m.textContent === '✕'));
  assert.equal(top.children[0].textContent, '⭐ 0');
  // 20초 동안 못 찾으면 ✨
  w.adv(HINT_MS + 300);
  assert.ok(marks(pr).children.some((m) => m.className.includes('is-hint')), '힌트');
  for (const [k, sp] of made.spots.entries()) {
    const b = sp.boxes[0];
    (k % 2 ? pr : pl).fire('pointerdown', { clientX: b.left + b.width / 2, clientY: (b.top + b.height / 2) * 0.7 });
    assert.equal(top.children[0].textContent, `⭐ ${k + 1}`);
    if (k === 0) {
      assert.ok(marks(pl).children.some((m) => m.className.includes('is-found')) && marks(pr).children.some((m) => m.className.includes('is-found')), '두 그림 모두 동그라미');
      assert.ok(!marks(pr).children.some((m) => m.className.includes('is-hint') && m.dataset.i === '0'), '찾은 곳의 힌트는 지움');
    }
    w.adv(1000);
  }
  assert.equal(root.children[4].textContent, '완성!');
  w.adv(2000);
  await w.flush();
  assert.equal(w.st.over.quit, false);
  assert.equal(w.st.over.score, DIFF_N);
  assert.equal(w.st.over.sec, 24, '「준비!」 뒤부터 마지막을 찾을 때까지 24.4초'); // 시작 1.8초 · 틀린 곳 · 힌트까지 20.3초 · 다섯을 1초마다 → 26.2초
  assert.equal((w.doc.listeners.visibilitychange || []).length, 0);
});

test('🔍 화면 — 도중에 그만두면 찾은 수가 ⭐(시간 없음) · 내려 둔 동안은 눌러도 안 셈 · 「완성!」 중 그만두면 바로 한 번(시간 그대로)', async (t) => {
  const w = world(t, (stage) => runDiff(stage, { rng: seeded(9), scene: { size: ROOM, items: [] } }));
  const root = w.stage.children[0];
  const [pl] = root.children[1].children;
  w.adv(900);
  const sp = w.h.made.spots;
  const tap = (i) => { const b = sp[i].boxes[0]; pl.fire('pointerdown', { clientX: b.left + b.width / 2, clientY: (b.top + b.height / 2) * 0.7 }); };
  tap(0);
  w.hide(true);
  tap(1);
  assert.equal(root.children[0].children[0].textContent, '⭐ 1', '내려 둔 동안은 안 셈');
  w.hide(false);
  w.h.stop();
  await w.flush();
  assert.deepEqual(w.st.over, { score: 1, quit: true });
});

test('🔍 화면 — 「완성!」을 보여 주는 동안 그만두면 기다리지 않고 바로 한 번(걸린 초 그대로)', async (t) => {
  const w = world(t, (stage) => runDiff(stage, { rng: seeded(11), scene: SCENE }));
  const root = w.stage.children[0];
  const [pl] = root.children[1].children;
  w.adv(900);
  for (const s of w.h.made.spots) { const b = s.boxes[0]; pl.fire('pointerdown', { clientX: b.left + b.width / 2, clientY: (b.top + b.height / 2) * 0.7 }); w.adv(2000); }
  w.h.stop();
  await w.flush();
  assert.equal(w.st.over.quit, false);
  assert.equal(w.st.over.score, DIFF_N);
  assert.ok(w.st.over.sec >= 1);
});
