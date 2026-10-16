// 🐸 단골 포켓몬 v274 (2026-10-16, 아버님 "개굴닌자 비율 추천대로 하고 개굴닌자로 해"):
//  · 잡기가 걸린 영어 퍼즐을 열 때 3번에 1번꼴로 개굴닌자가 퍼즐 캐릭터 가운데 하나로 꼭 나온다 → 맞히면 잡기 후보(영어 포켓몬)
//  · 잡힐 확률·볼 규칙은 그대로 · ⚙ 지금 퍼즐 해보기(잡기 없음)는 안 건다 · 😴 쉬는 중·그림이 없으면 퍼즐 목록에 없어 안 나온다
import { fakeIdb } from './fakeidb.js'; // ★ xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FAVORITE_ID, FAVORITE_RATE, favoriteFor, ROSTER, subjectOf, forPuzzle } from '../js/pokemon.js';
import { pickSome } from '../js/puzzle.js';
import { rarityOf } from '../js/xp.js';

void fakeIdb;
const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
/** 재현되는 난수 (mulberry32) */
function rng32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const mon = (id) => ({ id, ko: String(id), url: '' });

test('🐸 단골은 개굴닌자 · 영어 포켓몬 · 희귀 · 3번에 1번', () => {
  assert.equal(FAVORITE_ID, 658);
  const r = ROSTER.find((m) => m.id === FAVORITE_ID);
  assert.equal(r && r.ko, '개굴닌자');
  assert.equal(subjectOf(FAVORITE_ID), 'english', '영어 퍼즐에서 잡히는 포켓몬');
  assert.equal(rarityOf(FAVORITE_ID), 3, '등급은 그대로(희귀) — 잡힐 확률은 바꾸지 않는다');
  assert.equal(FAVORITE_RATE, 1 / 3);
});

test('🐸 favoriteFor (순수): 목록에 개굴닌자가 있고 난수가 비율 안일 때만 · 없으면 난수를 안 부름', () => {
  const list = [mon(25), mon(FAVORITE_ID), mon(7)];
  assert.equal(favoriteFor(list, () => 0), FAVORITE_ID);
  assert.equal(favoriteFor(list, () => FAVORITE_RATE - 1e-9), FAVORITE_ID);
  assert.equal(favoriteFor(list, () => FAVORITE_RATE), null, '경계는 밖');
  assert.equal(favoriteFor(list, () => 0.99), null);
  let calls = 0;
  assert.equal(favoriteFor([mon(25), mon(7)], () => { calls++; return 0; }), null, '목록에 없으면(쉬는 중·그림 없음) 안 나온다');
  assert.equal(calls, 0, '없으면 난수를 안 부른다');
  for (const bad of [null, undefined, [], [null], [{}]]) assert.equal(favoriteFor(bad, () => 0), null);
  // 넓게 — 비율이 1/3 언저리
  const rng = rng32(7);
  let hit = 0;
  const N = 30000;
  for (let i = 0; i < N; i++) if (favoriteFor(list, rng) === FAVORITE_ID) hit++;
  assert.ok(Math.abs(hit / N - 1 / 3) < 0.015, `비율 ${hit / N}`);
});

test('🧩 pickSome (순수): must가 있으면 꼭 넣고 n마리 · 겹치지 않음 · 자리는 여러 곳 · must가 없거나 목록에 없으면 예전처럼', () => {
  const pool = Array.from({ length: 460 }, (_, i) => mon(i + 1000)).concat([mon(FAVORITE_ID)]);
  const rng = rng32(11);
  const at = new Set();
  let first = 0;
  const N = 4000;
  for (let t = 0; t < N; t++) {
    const n = 5 + (t % 4); // 퍼즐은 5~8단어
    const got = pickSome(pool, n, FAVORITE_ID, rng);
    assert.equal(got.length, n);
    assert.equal(new Set(got.map((c) => c.id)).size, n, '겹치지 않음');
    const k = got.findIndex((c) => c.id === FAVORITE_ID);
    assert.ok(k >= 0, '꼭 들어감');
    at.add(k);
    if (k === 0) first++;
  }
  assert.deepEqual([...at].sort(), [0, 1, 2, 3, 4, 5, 6, 7], '자리는 앞 n자리 어디든');
  assert.ok(first / N < 0.25, `첫 자리에 몰리지 않는다 ${first / N} (단어 순서가 섞여도 늘 같은 칸이면 티가 난다)`);
  // must 없이 — 개굴닌자는 드물게(약 n/461)만
  const rng2 = rng32(5);
  let seen = 0;
  for (let t = 0; t < 20000; t++) if (pickSome(pool, 6, null, rng2).some((c) => c.id === FAVORITE_ID)) seen++;
  assert.ok(seen / 20000 < 0.03, `단골 없이 ${seen / 20000}`);
  assert.equal(pickSome(pool.slice(0, 10), 5, FAVORITE_ID, rng32(3)).some((c) => c.id === FAVORITE_ID), false, '목록에 없는 must는 넣지 않는다');
  assert.equal(pickSome(pool, 0, FAVORITE_ID, rng32(3)).length, 0);
  assert.equal(pickSome([mon(FAVORITE_ID), mon(1)], 5, FAVORITE_ID, rng32(3)).length, 2, '목록이 짧으면 있는 만큼');
});

test('🐸 한 퍼즐에서 개굴닌자가 나올 비율 — 실제 명단(영어 + 잡은 포켓몬)으로 단골 없이 1%대 → 단골로 1/3 넘게', () => {
  // 잡은 포켓몬이 많은 도감: 열린 명단 모두가 퍼즐 목록에 든다고 보면(가장 넓은 경우)
  const all = ROSTER.map((m) => mon(m.id));
  const list = forPuzzle(all, () => true);
  assert.ok(list.some((c) => c.id === FAVORITE_ID));
  const rng = rng32(21);
  let before = 0;
  let after = 0;
  const N = 20000;
  for (let t = 0; t < N; t++) {
    const n = 5 + (t % 4);
    if (pickSome(list, n, null, rng).some((c) => c.id === FAVORITE_ID)) before++;
    if (pickSome(list, n, favoriteFor(list, rng), rng).some((c) => c.id === FAVORITE_ID)) after++;
  }
  assert.ok(before / N < 0.03, `단골 없이 ${before / N}`);
  assert.ok(after / N > 1 / 3 && after / N < 0.37, `단골로 ${after / N}`);
});

test('🐸 배선: 잡기가 걸린 퍼즐(startPuzzle)만 favorite · ⚙ 지금 퍼즐 해보기는 안 건다 · 퍼즐은 must를 pickSome에 · 잡기 후보는 퍼즐에 나온 영어 포켓몬 · sw', () => {
  const src = read('js/player.js');
  const body = (head) => { const i = src.indexOf(head); assert.ok(i >= 0, head); return src.slice(i, src.indexOf('\n}\n', i)); };
  assert.ok(body('function startPuzzle(continueFn) {').includes('}, { favorite: true });'), '잡기가 걸린 퍼즐');
  const now = body('function startPuzzleNow() {');
  assert.ok(now.includes('showPuzzle(cue, () => { state.practiceOpen = false; restoreSpot(spot); });') && !now.includes('favorite'), '연습 퍼즐은 그대로');
  const sp = body('function showPuzzle(cue, onDone, opts) {');
  assert.ok(sp.includes('must: opts && opts.favorite ? favoriteFor(characters) : null,'), '퍼즐에 넘기는 목록과 같은 목록에서');
  assert.ok(sp.includes('const characters = forPuzzle(unlockedCharacters(), (id) => caughtCount(id) > 0)') && sp.includes('characters,'), '😴 쉬는 중·잠김은 unlockedCharacters가 이미 뺀다');
  assert.equal((src.match(/showPuzzle\(/g) || []).length, 3, '퍼즐을 여는 곳은 셋(정의 · 잡기 · 연습)');
  assert.ok(body('function englishCandidates(shown) {').includes("const out = forHole(forSubject(shown || [], 'english'), holeOpen);"), '퍼즐에 나온 영어 포켓몬이 잡기 후보');
  const pz = read('js/puzzle.js');
  assert.ok(pz.includes('export function openPuzzle(cue, { onPlay, onClose, characters, must = null } = {}) {'));
  assert.ok(pz.includes('const chars = characters && characters.length >= n ? pickSome(characters, n, must) : null;'));
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(read('sw.js')) || [])[1]) >= 274, 'sw는 v274 이상');
});
