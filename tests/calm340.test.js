// v340 (2026-10-25 아버님 "국어와 논술에서 나오는 음악만 지브리 음악으로 랜덤 플레이" · "항상 랜덤하게") — node --test tests/calm340.test.js
//  🌿 국어·논술 배경음 = ⚙에서 고른 곡 파일 (calmfiles.js) — 곡 고르기(순수) · 섞기(앱을 켤 때마다 · 지난번 마지막 곡은 맨 앞이 아님 · 한 바퀴 뒤 다시) ·
//  이 기기 저장(db blobs 'music:*' — 바꿔 넣으면 옛 곡은 지움) · <audio> 재생기(깨진 곡 건너뜀 · 모두 깨지면 조용히 · 꺼내는 중 멈춤 · ⚙에서 바꾸면 새 묶음) · ⚙ 고르기 칸
import { fakeIdb } from './fakeidb.js'; // ★ db.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MUSIC_EXT, MUSIC_MAX, CALM_FILE, isMusicFile, pickMusicFiles, shuffleOrder, sizeText } from '../js/calmfiles.js';
import { getMusicList, getMusicBlob, putMusicSet, clearMusicSet, MUSIC_LIST_ID, getDaily } from '../js/db.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
function seeded(seed = 7) {
  let x = seed >>> 0;
  return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 2 ** 32; };
}
const settle = (ms = 20) => new Promise((r) => setTimeout(r, ms));
const F = (name, size = 1000, type = '') => ({ name, size, type });

// ───────────────────── 고르기 · 섞기 (순수) ─────────────────────

test('🌿 음악 파일 — audio/* 이거나 m4a·mp3 같은 확장자 · 숨은 파일(._)·사진·자막은 아님', () => {
  for (const n of ['01 언제나 몇 번이라도 - 센과 치히로의 행방불명.m4a', 'a.MP3', 'b.aac', 'c.ogg', 'd.opus', 'e.wav', 'f.flac']) assert.equal(isMusicFile(F(n)), true, n);
  assert.equal(isMusicFile(F('noext', 10, 'audio/mp4')), true, 'type이 audio면');
  for (const n of ['._01 곡.m4a', '.hidden.mp3', 'cover.jpg', 'a.srt', 'video.mp4', 'desktop.ini', '']) assert.equal(isMusicFile(F(n)), false, n);
  assert.equal(isMusicFile(null), false);
  assert.ok(MUSIC_EXT.includes('m4a') && MUSIC_EXT.includes('mp3'));
});

test('🌿 고른 파일에서 곡만 — 이름순(숫자는 숫자대로) · 크기 0은 뺌 · 곡 수·크기 끝을 넘으면 뺀 수를 알림', () => {
  const r = pickMusicFiles([F('10 곡.m4a'), F('2 곡.m4a'), F('cover.jpg'), F('01 곡.m4a'), F('빈.m4a', 0), F('._2 곡.m4a')]);
  assert.deepEqual(r.files.map((f) => f.name), ['01 곡.m4a', '2 곡.m4a', '10 곡.m4a'], '「2」가 「10」보다 앞');
  assert.deepEqual([r.skipped, r.over, r.bytes], [3, 0, 3000], '사진·크기 0·숨은 파일은 음악이 아닌 것으로');
  const many = Array.from({ length: MUSIC_MAX.count + 5 }, (_, i) => F(`${i} 곡.mp3`));
  const m = pickMusicFiles(many);
  assert.deepEqual([m.files.length, m.over], [MUSIC_MAX.count, 5]);
  const big = pickMusicFiles([F('a.m4a', MUSIC_MAX.bytes - 10), F('b.m4a', 100), F('c.m4a', 5)]);
  assert.deepEqual(big.files.map((f) => f.name), ['a.m4a', 'c.m4a'], '크기 끝을 넘는 곡만 빼고 뒤의 작은 곡은 넣는다');
  assert.equal(big.over, 1);
  assert.deepEqual(pickMusicFiles(null), { files: [], skipped: 0, over: 0, bytes: 0 });
  assert.deepEqual([MUSIC_MAX.count, MUSIC_MAX.bytes], [60, 400 * 1024 * 1024]);
});

test('🌿 섞기 — 한 번씩 다 · 맨 앞은 avoid가 아님(곡이 둘 이상일 때) · 씨앗마다 다르고 맨 앞 곡이 고르게 흩어진다', () => {
  const first = new Map();
  const orders = new Set();
  for (let seed = 1; seed <= 3000; seed++) {
    const o = shuffleOrder(15, 4, seeded(seed));
    assert.deepEqual([...o].sort((a, b) => a - b), Array.from({ length: 15 }, (_, i) => i), `seed ${seed}: 한 번씩`);
    assert.notEqual(o[0], 4, `seed ${seed}: 지난번 마지막 곡이 맨 앞`);
    first.set(o[0], (first.get(o[0]) || 0) + 1);
    orders.add(o.join(','));
  }
  assert.equal(first.size, 14, '나머지 열네 곡 모두 맨 앞에 와 본다');
  for (const [i, n] of first) assert.ok(n > 3000 / 14 * 0.6 && n < 3000 / 14 * 1.4, `곡 ${i}이 맨 앞 ${n}번 — 고르게`);
  assert.ok(orders.size > 2990, '차례가 거의 다 다르다');
  assert.deepEqual(shuffleOrder(1, 0, seeded(1)), [0], '한 곡이면 그 곡');
  assert.deepEqual(shuffleOrder(0, -1), []);
  assert.deepEqual(shuffleOrder(2, 0, () => 0), [1, 0]);
  assert.deepEqual([...shuffleOrder(5, -1, seeded(3))].sort(), [0, 1, 2, 3, 4], 'avoid가 없으면 그냥 섞기');
});

test('🌿 크기 말 · 정해 둔 값', () => {
  assert.equal(sizeText(52 * 1024 * 1024 + 300000), '52 MB');
  assert.equal(sizeText(400 * 1024), '0.4 MB');
  assert.equal(sizeText(0), '0.0 MB');
  assert.equal(CALM_FILE.volume, 0.15, '효과음·🎧보다 작게');
  assert.equal(CALM_FILE.lastKey, 'shincoach.calmTrack');
});

// ───────────────────── 이 기기 저장 (db blobs) ─────────────────────

test('★ 🌿 저장 — 곡 묶음 통째로 · 목록은 고른 차례 · 다시 고르면 옛 곡을 지우고 바꿔 넣음 · 지우기 · 영상·선물 사진은 안 건드림', async () => {
  await getDaily('2000-01-01'); // 가짜 저장소 열기
  fakeIdb.put('blobs', { id: 'gift:bell', blob: 'photo' });
  fakeIdb.put('blobs', { id: 'v123', blob: 'video' });
  assert.equal(await getMusicList(), null, '처음엔 없음');
  const list = await putMusicSet([1, 2, 3].map((n) => ({ name: `0${n} 곡.m4a`, blob: new Blob([`곡${n}`]) })));
  assert.deepEqual(list.items.map((it) => [it.id, it.name]), [['music:1', '01 곡.m4a'], ['music:2', '02 곡.m4a'], ['music:3', '03 곡.m4a']]);
  assert.equal(list.items[0].size, new Blob(['곡1']).size);
  const got = await getMusicList();
  assert.equal(got.id, MUSIC_LIST_ID);
  assert.deepEqual(got.items, list.items);
  assert.equal(await (await getMusicBlob('music:2')).text(), '곡2');
  assert.equal(await getMusicBlob('v123'), null, '음악 열쇠가 아니면 안 꺼낸다');
  assert.equal(await getMusicBlob('music:x'), null);
  // 두 곡으로 바꿈 → music:3은 지워진다
  await putMusicSet([{ name: 'a.mp3', blob: new Blob(['A']) }, { name: 'b.mp3', blob: new Blob(['B']) }]);
  assert.deepEqual((await getMusicList()).items.map((it) => it.name), ['a.mp3', 'b.mp3']);
  assert.equal(fakeIdb.get('blobs', 'music:3'), undefined, '옛 곡 지움');
  assert.equal(await (await getMusicBlob('music:1')).text(), 'A');
  await clearMusicSet();
  assert.equal(await getMusicList(), null);
  assert.equal(fakeIdb.get('blobs', 'music:1'), undefined);
  assert.deepEqual([fakeIdb.get('blobs', 'gift:bell').blob, fakeIdb.get('blobs', 'v123').blob], ['photo', 'video'], '다른 것은 그대로');
  // 저장 실패면 옛 묶음 그대로
  await putMusicSet([{ name: 'k.m4a', blob: new Blob(['K']) }]);
  fakeIdb.failNext('blobs');
  await assert.rejects(putMusicSet([{ name: 'z.m4a', blob: new Blob(['Z']) }]));
  assert.deepEqual((await getMusicList()).items.map((it) => it.name), ['k.m4a']);
  await clearMusicSet();
});

// ───────────────────── 재생기 (가짜 <audio>) ─────────────────────

class FakeAudio {
  constructor() { this.src = ''; this.paused = true; this.volume = 1; this.l = {}; this.plays = 0; }
  addEventListener(t, f) { (this.l[t] ||= []).push(f); }
  fire(t) { for (const f of this.l[t] || []) f(); }
  play() { this.plays += 1; this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; this.pauses = (this.pauses || 0) + 1; }
  removeAttribute(k) { if (k === 'src') this.src = ''; }
  load() {}
}
let fresh = 0;
/** 새 재생기 하나 (모듈을 새로 불러 상태가 섞이지 않게) — items 곡 · last = 지난번 마지막 곡 id */
async function player({ n = 5, last = null, rng = seeded(1), blob = async (id) => ({ id }) } = {}) {
  const mem = new Map(last ? [['shincoach.calmTrack', last]] : []);
  const audios = [];
  const revoked = [];
  const items = Array.from({ length: n }, (_, i) => ({ id: `music:${i + 1}`, name: `곡${i + 1}`, size: 10 }));
  const m = await import(`../js/calmfiles.js?p=${++fresh}`);
  const deps = {
    makeAudio: () => { const a = new FakeAudio(); audios.push(a); return a; },
    loadList: async () => ({ id: 'music:list', items: deps.items }),
    loadBlob: blob,
    makeUrl: (b) => `blob:${b.id}`,
    revokeUrl: (u) => { revoked.push(u); },
    rng,
    storage: () => ({ getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); } }),
    items,
  };
  m.setCalmMusicDeps(deps);
  await m.loadCalmMusic();
  return { m, mem, audios, revoked, items, deps, a: () => audios[0] };
}

test('🌿 앱을 켤 때마다 새로 섞음 — 지난번 마지막 곡은 맨 앞에 안 옴(씨앗 200개) · 처음 곡은 이 기기에 적어 다음에 피함', async () => {
  for (let seed = 1; seed <= 200; seed++) {
    const p = await player({ n: 4, last: 'music:2', rng: seeded(seed) });
    assert.notEqual(p.m.calmMusicState().order[0], 1, `seed ${seed}`);
  }
  const p = await player({ n: 4, last: 'music:2', rng: seeded(9) });
  p.m.calmMusicPlay(0);
  await settle();
  const st = p.m.calmMusicState();
  assert.equal(st.track, p.items[st.order[0]].name);
  assert.equal(p.mem.get('shincoach.calmTrack'), p.items[st.order[0]].id);
  assert.equal(p.a().volume, CALM_FILE.volume, '들어오기 0초면 바로 정한 음량');
  assert.equal(p.a().paused, false);
  assert.equal(st.playing, true);
});

test('🌿 곡이 끝나면 다음 · 한 바퀴(다섯 곡)는 겹치지 않음 · 다시 섞을 때 바로 앞 곡이 맨 앞에 안 옴 · 옛 곡 주소는 놓아줌', async () => {
  for (let seed = 1; seed <= 40; seed++) {
    const p = await player({ n: 5, rng: seeded(seed) });
    p.m.calmMusicPlay(0);
    await settle(5);
    const seen = [p.m.calmMusicState().track];
    for (let k = 0; k < 9; k++) { p.a().fire('ended'); await settle(5); seen.push(p.m.calmMusicState().track); }
    assert.equal(new Set(seen.slice(0, 5)).size, 5, `seed ${seed}: 첫 바퀴`);
    assert.equal(new Set(seen.slice(5, 10)).size, 5, `seed ${seed}: 둘째 바퀴`);
    for (let k = 1; k < seen.length; k++) assert.notEqual(seen[k], seen[k - 1], `seed ${seed}: 같은 곡 연달아 (${k})`);
    assert.equal(p.revoked.length, 9, '바꿀 때마다 옛 주소를 놓아줌');
  }
  // 한 곡뿐이면 그 곡을 되풀이
  const one = await player({ n: 1 });
  one.m.calmMusicPlay(0);
  await settle(5);
  one.a().fire('ended');
  await settle(5);
  assert.equal(one.m.calmMusicState().track, '곡1');
  assert.equal(one.a().paused, false);
});

test('🌿 깨진 곡 — 꺼내지 못함(null)·재생 오류(error)는 건너뜀 · 모두 깨지면 조용히(ready 아님) · 비운 주소의 늦은 오류는 무시', async () => {
  const broken = new Set(['music:2', 'music:4']);
  const p = await player({ n: 4, rng: seeded(3), blob: async (id) => (broken.has(id) ? null : { id }) });
  p.m.calmMusicPlay(0);
  for (let k = 0; k < 6; k++) { await settle(5); if (p.a() && !p.a().paused) p.a().fire('ended'); }
  await settle(5); // 마지막으로 넘긴 곡을 다 꺼낼 때까지
  const st = p.m.calmMusicState();
  assert.equal(st.bad, 2, '꺼내지 못한 두 곡');
  assert.ok(['곡1', '곡3'].includes(st.track));
  assert.equal(p.m.calmMusicReady(), true);
  // 남은 두 곡도 재생 오류
  p.a().fire('error');
  await settle(5);
  p.a().fire('error');
  await settle(5);
  assert.equal(p.m.calmMusicState().bad, 4);
  assert.equal(p.m.calmMusicReady(), false, '모두 깨지면 틀 곡이 없다');
  // 다시 읽으면(⚙에서 새로 고름) 깨진 표시는 지운다
  broken.clear();
  await p.m.loadCalmMusic();
  assert.equal(p.m.calmMusicReady(), true);
  assert.equal(p.m.calmMusicState().bad, 0);
  // 비운 주소에서 온 늦은 오류는 깨진 곡으로 안 친다
  const q = await player({ n: 3 });
  q.m.calmMusicPlay(0);
  await settle(5);
  q.a().src = '';
  q.a().fire('error');
  assert.equal(q.m.calmMusicState().bad, 0);
});

test('🌿 재생 오류가 난 곡은 다음 바퀴에도 다시 고르지 않는다 (세 바퀴 넘게)', async () => {
  const p = await player({ n: 3, rng: seeded(11) });
  p.m.calmMusicPlay(0);
  await settle(5);
  const broken = p.m.calmMusicState().track;
  p.a().fire('error');
  await settle(5);
  const seen = [];
  for (let k = 0; k < 10; k++) { seen.push(p.m.calmMusicState().track); p.a().fire('ended'); await settle(5); }
  assert.ok(!seen.includes(broken), `깨진 「${broken}」이 다시 나옴: ${seen.join(',')}`);
  assert.equal(new Set(seen).size, 2, '남은 두 곡을 번갈아');
});

test('🌿 늦게 꺼낸 옛 곡이 새 곡을 덮지 않는다 — 꺼내는 사이 ⚙에서 묶음을 바꿈', async () => {
  const gates = new Map();
  const wait = (id) => new Promise((r) => gates.set(id, r));
  const p = await player({ n: 2, blob: async (id) => { if (id === 'music:1' || id === 'music:2') await wait(id); return { id }; } }); // 옛 묶음 곡은 늦게 · 새 곡은 바로
  p.m.calmMusicPlay(0);
  await settle(5);
  const oldId = [...gates.keys()][0];
  assert.ok(oldId, '옛 묶음의 곡을 꺼내는 중');
  // 새 묶음 — 바로 꺼내지는 곡
  p.deps.items = [{ id: 'music:7', name: '새 곡', size: 1 }];
  await p.m.loadCalmMusic();
  await settle(5);
  assert.equal(p.a().src, 'blob:music:7');
  gates.get(oldId)(); // 옛 곡이 이제야 꺼내짐
  await settle(5);
  assert.equal(p.a().src, 'blob:music:7', '새 곡 그대로');
  assert.equal(p.m.calmMusicState().track, '새 곡');
});

test('🌿 빠지는 사이 다음 곡을 꺼내는 중에 다시 틀라 하면 — 빠짐이 끝나도 멈추지 않는다', async () => {
  let release = null;
  const p = await player({ n: 3, rng: seeded(5), blob: async (id) => { if (release === 'hold') await new Promise((r) => { release = r; }); return { id }; } });
  p.m.calmMusicPlay(0);
  await settle(5);
  release = 'hold';
  p.a().fire('ended'); // 다음 곡을 꺼내는 중(늦음)
  await settle(5);
  p.m.calmMusicPause(0.1); // 빠지기 시작
  p.m.calmMusicPlay(0); // 꺼내는 중이라 그대로 두고 기다림
  const pauses = p.a().pauses || 0;
  await settle(200); // 빠짐이 끝날 시간
  assert.equal(p.a().pauses || 0, pauses, '빠짐이 끝나도 멈추지 않는다(다시 틀라고 했으니)');
  release();
  await settle(10);
  assert.equal(p.a().paused, false);
  assert.equal(p.m.calmMusicAudible(), true);
});

test('🌿 빠지는 중 — 더 급한 멈춤은 앞당기고 · 느린 요청은 늦추지 않고 · 0.1초마다 다시 불러도 끝까지 빠진다 (🔍 Codex 144차 #1)', async () => {
  const p = await player({ n: 2 });
  p.m.calmMusicPlay(0);
  await settle(5);
  // 느린 빠짐(0.6초) 도중 급한 빠짐(0.1초) → 0.1초 쯤에 멈춤
  p.m.calmMusicPause(0.6);
  await settle(30);
  p.m.calmMusicPause(0.1);
  await settle(180);
  assert.equal(p.a().paused, true, '앞당김');
  // 급한 빠짐(0.1초) 도중 느린 요청(0.6초) → 늦추지 않음
  p.m.calmMusicPlay(0);
  p.m.calmMusicPause(0.1);
  p.m.calmMusicPause(0.6);
  await settle(180);
  assert.equal(p.a().paused, true, '늦추지 않음');
  // 0.1초마다 같은 요청(calm.js의 따지기처럼) — 빠짐을 되풀이하지 않고 끝까지
  p.m.calmMusicPlay(0);
  const t0 = Date.now();
  while (Date.now() - t0 < 450) { p.m.calmMusicPause(0.2); await settle(50); }
  assert.equal(p.a().paused, true, '되불러도 끝난다');
  assert.equal(p.a().volume, 0);
  // 멈춘 뒤에 또 불러도 아무 일 없음 · 다시 틀면 들어옴
  p.m.calmMusicPause(0.6);
  p.m.calmMusicPlay(0);
  assert.equal(p.a().paused, false);
  assert.ok(Math.abs(p.a().volume - CALM_FILE.volume) < 1e-9);
});

test('🌿 꺼내는 중에 멈추라 하면 걸어만 두고 안 튼다 · 다시 틀면 그 곡 처음부터 · 빠지는 사이 다시 틀면 멈추지 않음', async () => {
  let release;
  const gate = new Promise((r) => { release = r; });
  const p = await player({ n: 3, blob: async (id) => { await gate; return { id }; } });
  p.m.calmMusicPlay(0);
  p.m.calmMusicPause(0);
  release();
  await settle();
  assert.ok(p.a().src.startsWith('blob:music:'), '걸어는 둔다');
  assert.equal(p.a().paused, true, '멈추라 했으니 안 튼다');
  const src = p.a().src;
  p.m.calmMusicPlay(0);
  assert.equal(p.a().src, src, '같은 곡');
  assert.equal(p.a().paused, false);
  // 빠지는 사이(0.2초) 다시 틀라고 하면 멈추지 않는다
  p.m.calmMusicPause(0.2);
  await settle(60);
  p.m.calmMusicPlay(0.2);
  await settle(300);
  assert.equal(p.a().paused, false);
  assert.ok(Math.abs(p.a().volume - CALM_FILE.volume) < 1e-9);
  // 끝까지 빠지면 멈춤 · 음량 0
  p.m.calmMusicPause(0.1);
  await settle(250);
  assert.deepEqual([p.a().paused, p.a().volume], [true, 0]);
  assert.equal(p.m.calmMusicAudible(), false);
});

test('🌿 듣는 중에 ⚙에서 곡을 바꾸면 새 묶음으로 · 곡을 다 지우면 멈추고 주소를 놓음 · 곡이 없으면 틀기를 불러도 아무것도 안 함', async () => {
  const p = await player({ n: 3 });
  p.m.calmMusicPlay(0);
  await settle();
  assert.equal(p.a().paused, false);
  p.deps.items = [{ id: 'music:1', name: '새 곡1', size: 1 }, { id: 'music:2', name: '새 곡2', size: 1 }];
  await p.m.loadCalmMusic();
  await settle();
  assert.ok(['새 곡1', '새 곡2'].includes(p.m.calmMusicState().track), '새 묶음의 곡');
  assert.equal(p.a().paused, false, '듣던 중이면 이어서 튼다');
  p.deps.items = [];
  await p.m.loadCalmMusic();
  assert.equal(p.a().paused, true);
  assert.equal(p.a().src, '');
  assert.equal(p.m.calmMusicReady(), false);
  const plays = p.a().plays;
  p.m.calmMusicPlay(0);
  await settle();
  assert.equal(p.a().plays, plays, '곡이 없으면 안 튼다');
  assert.equal(p.m.calmMusicAudible(), false);
  // 곡이 다시 들어오면 — 틀던 중(want)이었으니 새 묶음으로 바로 (멈추는 일은 calm.js가 곡이 없을 때 calmMusicPause로)
  p.deps.items = [{ id: 'music:1', name: '돌아온 곡', size: 1 }];
  await p.m.loadCalmMusic();
  await settle();
  assert.equal(p.m.calmMusicState().track, '돌아온 곡');
  assert.equal(p.a().paused, false);
});

test('🌿 목록을 못 읽으면(저장소 오류) 곡이 없는 것으로 — 앱이 멈추지 않는다', async () => {
  const p = await player({ n: 2 });
  p.m.setCalmMusicDeps({ loadList: async () => { throw new Error('읽기 실패'); } });
  assert.equal(await p.m.loadCalmMusic(), 0);
  assert.equal(p.m.calmMusicReady(), false);
  p.m.setCalmMusicDeps({ loadList: async () => ({ items: [{ id: 'gift:x', name: '사진' }, { id: 'music:1', name: '곡' }, null] }) });
  assert.equal(await p.m.loadCalmMusic(), 1, '음악 열쇠만');
});

// ───────────────────── ⚙ 곡 고르기 ─────────────────────

test('🌿 ⚙ 곡 고르기 — 폴더(webkitdirectory)·파일(audio/*) · 저장하면 「✅ N곡」 · 음악이 아닌 파일은 뺀 수 · 곡이 없으면 안내 · 지우기는 확인 뒤', async () => {
  const els = {};
  const mk = (tag) => {
    const e = { tagName: tag, attrs: {}, l: {}, hidden: false, textContent: '', files: [], value: '', clicks: 0 };
    e.addEventListener = (t, f) => { (e.l[t] ||= []).push(f); };
    e.setAttribute = (k, v) => { e.attrs[k] = v; };
    e.click = () => { e.clicks += 1; };
    e.fire = async (t) => { for (const f of e.l[t] || []) await f(); };
    return e;
  };
  for (const id of ['set-calm-folder', 'set-calm-files', 'set-calm-del', 'set-calm-note']) els[id] = mk('el');
  const made = [];
  globalThis.document = {
    getElementById: (id) => els[id] || null,
    createElement: (tag) => { const e = mk(tag); made.push(e); return e; },
    body: { appendChild: () => {} },
  };
  let asked = 0;
  globalThis.confirm = () => { asked += 1; return true; };
  const m = await import(`../js/calmfiles.js?ui=${++fresh}`);
  m.setCalmMusicDeps({ makeAudio: () => new FakeAudio(), storage: () => null });
  m.initCalmMusicSettings();
  await settle();
  const note = els['set-calm-note'];
  assert.match(note.textContent, /^아직 곡이 없어요/);
  assert.equal(els['set-calm-del'].hidden, true);
  const [folder, files] = made;
  assert.equal(folder.attrs.webkitdirectory, '', '폴더 고르기');
  assert.equal(folder.multiple, true);
  assert.match(files.accept, /^audio\/\*/);
  els['set-calm-folder'].fire('click');
  assert.equal(folder.clicks, 1);
  // 고름 — 곡 둘 + 사진 하나
  const blobFile = (name, text) => Object.assign(new Blob([text], { type: name.endsWith('.jpg') ? 'image/jpeg' : '' }), { name });
  folder.files = [blobFile('02 곡.m4a', 'BB'), blobFile('01 곡.m4a', 'A'), blobFile('cover.jpg', 'img')];
  await folder.fire('change');
  assert.match(note.textContent, /^✅ 2곡이 들어 있어요 \(0\.0 MB\) — 국어·논술 화면에서 늘 섞어서 틀어요 · 음악이 아닌 파일 1개는 뺐어요$/);
  assert.equal(folder.value, '', '같은 폴더를 다시 골라도 바뀜이 오게 비운다');
  assert.deepEqual((await getMusicList()).items.map((it) => it.name), ['01 곡.m4a', '02 곡.m4a'], '이름순으로 저장');
  assert.equal(els['set-calm-del'].hidden, false);
  assert.equal(m.calmMusicReady(), true, '재생기도 새 목록을 읽었다');
  // 음악이 없는 폴더 — 옛 곡은 그대로
  files.files = [blobFile('a.jpg', 'x')];
  await files.fire('change');
  assert.match(note.textContent, /^음악 파일이 없어요/);
  assert.equal((await getMusicList()).items.length, 2);
  // 지우기 — 확인 뒤
  await els['set-calm-del'].fire('click');
  assert.equal(asked, 1);
  assert.equal(await getMusicList(), null);
  assert.match(note.textContent, /^아직 곡이 없어요/);
  assert.equal(m.calmMusicReady(), false);
  // 확인에서 아니요 — 그대로
  folder.files = [blobFile('x.mp3', 'X')];
  await folder.fire('change');
  globalThis.confirm = () => false;
  await els['set-calm-del'].fire('click');
  assert.equal((await getMusicList()).items.length, 1);
  await clearMusicSet();
  delete globalThis.document;
  delete globalThis.confirm;
});

// ───────────────────── 잇기 ─────────────────────

test('🔗 잇기 — ⚙ 칸(비밀번호 뒤 설정 창 안) · app.js가 한 번 · 앱 셸 · 저작물은 저장소에 없음 · 🎮 게임기·🧩⚔️🎯 음악은 그대로', () => {
  const html = read('index.html');
  const dlg = html.slice(html.indexOf('<dialog id="dlg-settings"'), html.indexOf('</dialog>', html.indexOf('<dialog id="dlg-settings"')));
  for (const id of ['set-calm-folder', 'set-calm-files', 'set-calm-del', 'set-calm-note']) assert.ok(dlg.includes(`id="${id}"`), `설정 창 안에 ${id}`);
  assert.ok(dlg.includes('곡은 이 태블릿에만 저장되고 인터넷에 올라가지 않아요'));
  const app = read('js/app.js');
  assert.ok(app.includes("import { initCalmMusicSettings } from './calmfiles.js';"));
  assert.equal((app.match(/^ {2}initCalmMusicSettings\(\);/gm) || []).length, 1);
  const sw = read('sw.js');
  assert.ok(sw.includes("'./js/calmfiles.js',"));
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(sw) || [])[1]) >= 340);
  // 게임기 음악·창 음악은 그대로 — calmfiles를 쓰지 않는다
  for (const f of ['js/gamebgm.js', 'js/bgm.js', 'js/gamesong.js']) assert.ok(!read(f).includes('calmfiles'), `${f}는 그대로`);
  const cf = read('js/calmfiles.js');
  assert.ok(!/fetch\(|XMLHttpRequest|sendBeacon/.test(cf), '곡을 어디로도 보내지 않는다');
});
