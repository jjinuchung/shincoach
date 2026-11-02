// 📸 액자 사진 (v384 — 2026-11-02 아버님 기본안 「추천대로」) — 사진 규칙·고쳐 읽기·병합·그림·화면 잇기
// node --test tests/photo384.test.js
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  PHOTO_MAX, FRAME_ID, PHOTO_SCENES, photoIdOf, frameKey, photoRecOf, photosOf, copyPhotos, mergePhotos,
  takePhotoRule, hangRule, framePhotoOf, hungIds,
} from '../js/photo.js';
import { placeRule, storeRule, FIRST_ROOM } from '../js/house.js';
import { closeAfterSave } from '../js/playshow.js';
import { LOOK_BASE } from '../js/avatar.js';
import { SCENE_OF, photoStageHtml, photoCaption, photoScoreOf } from '../js/playart.js';
import { photoDate, photoLabel } from '../js/photoview.js';
import { emptyProfile, cloneProfile, mergeStatRecord } from '../js/db.js';

void fakeIdb;
const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const R = FIRST_ROOM;
const T0 = Date.UTC(2026, 10, 3, 9, 0, 0);
const pf = (extra = {}) => cloneProfile({ ...emptyProfile(), ...extra });
const rec = (n, o = {}) => ({ id: photoIdOf(T0 + n, (n % 97) / 97), scene: 'tv', mon: 658, look: { ...LOOK_BASE }, wall: '#fbf3e4', floor: '#e2c79f', t: 1, ...o });
/** n장 찍은 프로필 (n번째가 가장 새것) */
function withPhotos(n) {
  const p = pf();
  for (let i = 1; i <= n; i++) assert.equal(takePhotoRule(p, rec(i), T0 + i * 1000).ok, true);
  return p;
}
/** 🖼️ 액자를 1층 벽에 놓은 프로필 → [프로필, 놓은 번호] */
function withFrame(p = pf()) {
  p.items = { ...(p.items || {}), [FRAME_ID]: 2, f_clock: 1 };
  const a = placeRule(p, R, FRAME_ID, 0, 0);
  assert.equal(a.ok, true);
  return [p, a.u];
}

test('📸 사진 id · 장면 목록 · 한 장 고쳐 읽기 — 깨진 id·때·장면은 버리고, 차림은 기본 옷으로, 색·💗 단계·점수는 맞을 때만', () => {
  assert.equal(PHOTO_MAX, 30, '기본안 ④ — 📷 앨범은 30장까지');
  assert.equal(FRAME_ID, 'f_frame', '사진은 이미 파는 🖼️ 액자에 건다(기본안 ⑤ — 값 그대로)');
  const a = photoIdOf(T0, 0.5);
  assert.match(a, /^ph[0-9a-z]{6,24}$/);
  assert.notEqual(photoIdOf(T0, 0.5), photoIdOf(T0, 0.51));
  assert.notEqual(photoIdOf(T0, 0.5), photoIdOf(T0 + 1, 0.5));
  assert.deepEqual([...new Set(Object.values(SCENE_OF))].sort(), [...PHOTO_SCENES].sort(), '사진이 될 장면 = 놀기 장면 모두');
  assert.equal(frameKey(R, 7), `${R}:7`);
  const ok = photoRecOf({ ...rec(1), at: T0 });
  assert.equal(ok.scene, 'tv');
  assert.equal(ok.mon, 658);
  assert.equal(ok.t, 1);
  assert.equal(ok.wall, '#fbf3e4');
  for (const bad of [null, [], 'x', { ...rec(1), at: T0, id: 'nope' }, { ...rec(1), at: 0 }, { ...rec(1), at: T0, scene: 'bath' }, { ...rec(1), at: -5 }, { ...rec(1), at: 1e20 }]) assert.equal(photoRecOf(bad), null);
  const odd = photoRecOf({ ...rec(1), at: T0, mon: -3, look: { top: 'a_no_such', skin: 'zz' }, wall: 'red', floor: 'url(x)', t: 9, score: 50 });
  assert.equal(odd.mon, 0, '깨진 파트너는 혼자 사진');
  assert.equal(odd.look.top, LOOK_BASE.top);
  assert.equal(odd.look.skin, LOOK_BASE.skin);
  assert.equal(odd.wall, undefined);
  assert.equal(odd.floor, undefined);
  assert.equal(odd.t, undefined);
  assert.equal(odd.score, undefined, '점수는 🎮 장면만');
  assert.equal(photoRecOf({ ...rec(1), at: T0, scene: 'game', score: 31 }).score, 31);
  assert.equal(photoRecOf({ ...rec(1), at: T0, scene: 'game', score: 1e6 }).score, undefined);
  assert.equal(photoRecOf({ ...rec(1), at: T0, mon: 0, t: 2 }).t, undefined, '💗 테두리는 파트너가 있을 때만');
});

test('📸 사진 찍기 — 새것이 맨 앞 · 찍은 때는 트랜잭션의 now · 같은 사진 두 번은 한 장 · 💰·가방·집은 그대로', () => {
  const p = pf({ coins: 777, items: { f_tv: 1 } });
  const before = JSON.stringify({ coins: p.coins, items: p.items, house: p.house });
  const a = takePhotoRule(p, { ...rec(1), at: 5 }, T0 + 1000);
  assert.deepEqual(a, { ok: true, id: rec(1).id, dropped: '' });
  const b = takePhotoRule(p, rec(2), T0 + 2000);
  assert.equal(b.ok, true);
  const ph = photosOf(p.homePhotos);
  assert.deepEqual(ph.list.map((x) => x.id), [rec(2).id, rec(1).id], '새것부터');
  assert.equal(ph.list[1].at, T0 + 1000, '넘겨준 at이 아니라 저장할 때');
  assert.deepEqual(takePhotoRule(p, rec(2), T0 + 3000), { ok: true, id: rec(2).id, dropped: '', again: true });
  assert.equal(photosOf(p.homePhotos).list.length, 2);
  assert.equal(JSON.stringify({ coins: p.coins, items: p.items, house: p.house }), before, '보상·값 없음');
  assert.deepEqual(takePhotoRule(p, { ...rec(3), scene: 'bath' }, T0), { ok: false, why: 'bad' });
  assert.deepEqual(takePhotoRule(p, rec(3), 0), { ok: false, why: 'save' });
  assert.deepEqual(takePhotoRule(p, null, T0), { ok: false, why: 'bad' });
});

test('📷 앨범이 가득 차면 — 뺄 사진 없이는 안 넣음(아무것도 안 바뀜) · 고른 사진을 빼고 넣음 · 뺀 사진은 다시 못 넣음 · 그새 빠진 사진이면 changed · 가득 차지 않았으면 drop은 안 씀', () => {
  const p = withPhotos(PHOTO_MAX);
  const snap = JSON.stringify(p.homePhotos);
  assert.deepEqual(takePhotoRule(p, rec(100), T0 + 1e6), { ok: false, why: 'full' });
  assert.equal(JSON.stringify(p.homePhotos), snap, '가득 찼을 때 저절로 빠지지 않는다');
  const old = rec(5).id;
  const r = takePhotoRule(p, rec(100), T0 + 1e6, old);
  assert.deepEqual(r, { ok: true, id: rec(100).id, dropped: old });
  const ph = photosOf(p.homePhotos);
  assert.equal(ph.list.length, PHOTO_MAX);
  assert.ok(!ph.list.some((x) => x.id === old));
  assert.equal(ph.gone[old], T0 + 1e6);
  assert.equal(ph.list[0].id, rec(100).id);
  assert.deepEqual(takePhotoRule(p, rec(101), T0 + 2e6, old), { ok: false, why: 'changed' }, '그새 빠진 사진을 고른 옛 창');
  const q = withPhotos(3);
  assert.deepEqual(takePhotoRule(q, rec(50), T0 + 1e6, rec(1).id), { ok: true, id: rec(50).id, dropped: '' }, '자리가 났으면 아무것도 안 뺀다');
  assert.equal(photosOf(q.homePhotos).list.length, 4);
  const g = pf({ homePhotos: { list: [], gone: { [rec(9).id]: T0 } } });
  assert.deepEqual(takePhotoRule(g, rec(9), T0 + 5), { ok: false, why: 'bad' }, '뺀 사진 id는 다시 못 넣는다');
});

test('🖼️ 액자에 걸기 — 놓인 🖼️ 액자에만 · 앨범에 있는 사진만 · 빈 액자로 · 바꾼 때는 늘 앞으로 · 걸린 사진 읽기 · 빠진 사진은 빈 액자', () => {
  const [p0, u] = withFrame(withPhotos(3));
  const p = p0;
  assert.deepEqual(hangRule(p, R, u, rec(2).id, T0 + 5000), { ok: true, id: rec(2).id });
  assert.equal(framePhotoOf(p, R, u).id, rec(2).id);
  assert.deepEqual([...hungIds(p)], [rec(2).id]);
  assert.deepEqual(hangRule(p, R, u, 'ph00000000', T0 + 6000), { ok: false, why: 'nophoto' });
  assert.deepEqual(hangRule(p, R, 999, rec(1).id, T0 + 6000), { ok: false, why: 'gone' }, '없는 번호');
  const c = placeRule(p, R, 'f_clock', 1, 0);
  assert.deepEqual(hangRule(p, R, c.u, rec(1).id, T0 + 6000), { ok: false, why: 'gone' }, '시계에는 못 건다');
  // 시계가 뒤로 가도 바꾼 때는 앞으로
  assert.equal(hangRule(p, R, u, rec(3).id, T0 - 99999).ok, true);
  const f = photosOf(p.homePhotos).frames[frameKey(R, u)];
  assert.equal(f.p, rec(3).id);
  assert.equal(f.at, T0 + 5001);
  assert.equal(hangRule(p, R, u, '', T0 + 7000).ok, true);
  assert.equal(framePhotoOf(p, R, u), null, '빈 액자');
  assert.equal(hungIds(p).size, 0);
  // 걸린 사진이 앨범에서 빠지면 빈 액자로 읽는다
  assert.equal(hangRule(p, R, u, rec(1).id, T0 + 8000).ok, true);
  p.homePhotos = { ...photosOf(p.homePhotos), gone: { [rec(1).id]: T0 + 9000 } };
  assert.equal(framePhotoOf(p, R, u), null);
  assert.equal(hungIds(p).size, 0);
});

test('🔀 병합 — 사진 합집합 · 뺀 사진은 옛 백업에서 안 되살아남 · 액자는 바꾼 때가 나중인 쪽 · 합쳐 넘치면 새것부터 30장 · 둘 다 없으면 null · 깨진 쪽은 없는 것으로', () => {
  assert.equal(mergePhotos(undefined, null), null);
  assert.equal(mergePhotos('x', 5), null);
  const a = withPhotos(3);
  const b = pf();
  for (let i = 10; i <= 11; i++) takePhotoRule(b, rec(i), T0 + i * 1000);
  const m = mergePhotos(a.homePhotos, b.homePhotos);
  assert.deepEqual(m.list.map((x) => x.id), [rec(11), rec(10), rec(3), rec(2), rec(1)].map((x) => x.id));
  assert.deepEqual(mergePhotos(a.homePhotos, 'broken'), photosOf(a.homePhotos));
  // 새 기기에서 뺀 사진 + 옛 백업(그 사진이 아직 있음)
  const nw = withPhotos(PHOTO_MAX);
  const backup = JSON.parse(JSON.stringify(nw.homePhotos));
  assert.equal(takePhotoRule(nw, rec(200), T0 + 9e6, rec(7).id).ok, true);
  const mm = mergePhotos(backup, nw.homePhotos);
  assert.ok(!mm.list.some((x) => x.id === rec(7).id), '뺀 사진은 안 되살아난다');
  assert.ok(mm.list.some((x) => x.id === rec(200).id));
  assert.equal(mm.list.length, PHOTO_MAX);
  // 넘치면 새것부터
  const big = pf();
  for (let i = 300; i < 300 + PHOTO_MAX; i++) takePhotoRule(big, rec(i), T0 + i * 1000);
  const both = mergePhotos(big.homePhotos, nw.homePhotos);
  assert.equal(both.list.length, PHOTO_MAX);
  assert.equal(both.list[0].id, rec(200).id, '가장 늦게 찍은 사진이 맨 앞');
  assert.equal(both.list[1].id, rec(300 + PHOTO_MAX - 1).id);
  assert.ok(!both.list.some((x) => x.id === rec(1).id), '가장 오래된 것부터 밀려난다');
  // 액자 — 나중에 바꾼 쪽 · 같은 때면 id가 큰 쪽(어느 쪽에서 합쳐도 같게)
  const x = { list: [], frames: { [frameKey(R, 1)]: { p: rec(1).id, at: 10 }, [frameKey(R, 2)]: { p: 'ph0000000a', at: 7 } } };
  const y = { list: [], frames: { [frameKey(R, 1)]: { p: '', at: 11 }, [frameKey(R, 2)]: { p: 'ph0000000b', at: 7 } } };
  assert.deepEqual(mergePhotos(x, y).frames, mergePhotos(y, x).frames);
  assert.deepEqual(mergePhotos(x, y).frames[frameKey(R, 1)], { p: '', at: 11 });
  assert.equal(mergePhotos(x, y).frames[frameKey(R, 2)].p, 'ph0000000b');
});

test('🧹 고쳐 읽기 — 깨진 칸은 빼고 · 같은 id는 하나 · 뺀 표·액자 칸은 끝이 있음 · 복사는 새 객체', () => {
  const dup = { ...rec(1), at: T0 };
  const raw = {
    list: [dup, { ...dup }, { id: 'bad' }, 7, { ...rec(2), at: T0 + 5 }],
    gone: { [rec(3).id]: T0, nope: T0, [rec(4).id]: 'x' },
    frames: { [frameKey(R, 1)]: { p: rec(1).id, at: T0 }, 'zz:1': { p: '', at: T0 }, [frameKey(R, 2)]: { p: 5, at: T0 }, [frameKey(R, 3)]: { p: '', at: 0 } },
  };
  const ph = photosOf(raw);
  assert.deepEqual(ph.list.map((x) => x.id), [rec(2).id, rec(1).id]);
  assert.deepEqual(Object.keys(ph.gone), [rec(3).id]);
  assert.deepEqual(Object.keys(ph.frames), [frameKey(R, 1)]);
  const many = { list: [], gone: {}, frames: {} };
  for (let i = 0; i < 3100; i++) many.gone[photoIdOf(T0 + i, 0.1)] = T0 + i;
  for (let i = 0; i < 300; i++) many.frames[frameKey(R, i + 1)] = { p: '', at: T0 };
  const capped = photosOf(many);
  assert.equal(Object.keys(capped.gone).length, 3000, '뺀 표는 늦은 것부터 3,000 (Codex 187차 #1 — 300이면 옛 백업이 뺀 사진을 되살렸다)');
  assert.ok(own(capped.gone, photoIdOf(T0 + 3099, 0.1)));
  assert.ok(!own(capped.gone, photoIdOf(T0 + 99, 0.1)), '가장 먼저 뺀 것부터 잘린다');
  assert.equal(Object.keys(capped.frames).length, 200);
  assert.equal(copyPhotos('x'), null);
  const cp = copyPhotos(raw);
  assert.notEqual(cp, raw);
  assert.deepEqual(cp, ph);
});
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

test('🔗 저장 잇기 — cloneProfile이 사진 칸을 복사 · 프로필 병합(mergeStatRecord)이 사진을 합친다 · xp가 저장본을 복사하고 찍기·걸기를 houseDo로', () => {
  const a = withPhotos(2);
  const c = cloneProfile(a);
  assert.notEqual(c.homePhotos, a.homePhotos);
  assert.deepEqual(c.homePhotos, photosOf(a.homePhotos));
  const b = pf();
  takePhotoRule(b, rec(9), T0 + 9000);
  const m = mergeStatRecord('profile', { ...a, updatedAt: 10 }, { ...b, updatedAt: 20 });
  assert.deepEqual(m.homePhotos.list.map((x) => x.id), [rec(9).id, rec(2).id, rec(1).id]);
  const none = mergeStatRecord('profile', { ...emptyProfile(), updatedAt: 1 }, { ...emptyProfile(), updatedAt: 2 });
  assert.equal(none.homePhotos, undefined);
  const xp = read('js/xp.js');
  assert.ok(xp.includes('...(p.homePhotos ? { homePhotos: copyPhotos(p.homePhotos) } : {})'), 'xp.fromStored가 사진 칸을 복사');
  assert.ok(xp.includes('return houseDo((p) => takePhotoRule(p, rec, Date.now(), drop));'));
  assert.ok(xp.includes('return houseDo((p) => hangRule(p, roomId, u, id, Date.now()));'));
});

test('🖼️ 사진 그림 — 장면 끝 모습(is-on·is-done) + 움직임 멈춤(is-photo) · 장면마다 끝 이름표 · 혼자면 🧸 안기 없음 · 🎮 점수 · 사진마다 다른 이름 · 한 줄 말', () => {
  const base = photoRecOf({ ...rec(1), at: T0 });
  for (const scene of PHOTO_SCENES) {
    const h = photoStageHtml({ ...base, scene }, { ko: '개굴닌자', url: '', day: 3, sky: 'day', uid: `t${scene}` });
    assert.match(h, new RegExp(`class="pshow-stage is-on is-done is-photo[^"]* is-${scene}`), scene);
  }
  const cls = (scene, mon = 658) => (photoStageHtml({ ...base, scene, mon }, { ko: 'x', day: 1 }).match(/class="(pshow-stage[^"]*)"/) || [])[1];
  assert.ok(cls('game').includes('is-clear'));
  assert.ok(cls('nap').includes('is-morning'));
  assert.ok(cls('sofa').includes('is-lean'));
  assert.ok(cls('toy').includes('is-out'));
  assert.ok(cls('plant').includes('is-g3') && cls('flower').includes('is-g3'));
  assert.ok(cls('teddy').includes('is-hug'));
  assert.ok(!cls('teddy', 0).includes('is-hug') && !cls('teddy', 0).includes('is-at-pal'), '혼자면 안기 없음');
  assert.ok(cls('tv', 0).includes('is-alone'));
  assert.ok(photoStageHtml({ ...base, scene: 'game', score: 31 }, { day: 2 }).includes('>⭐ 31</text>'));
  assert.ok(photoStageHtml({ ...base, scene: 'game' }, { day: 2 }).includes(`>⭐ ${photoScoreOf(undefined, 2)}</text>`), '점수가 없으면 장면과 같은 날마다 다른 수');
  const one = photoStageHtml({ ...base, scene: 'tv' }, { uid: 'aa1' });
  const two = photoStageHtml({ ...base, scene: 'tv' }, { uid: 'bb2' });
  assert.notEqual(one, two, 'uid가 그림 안 이름에 들어간다');
  assert.equal(photoCaption('tv', '개굴닌자'), '📺 개굴닌자와 TV를 봤어요');
  assert.equal(photoCaption('tv', ''), '📺 TV를 봤어요');
  assert.equal(photoCaption('pet', '피카츄'), '🤗 피카츄를 쓰다듬어 줬어요');
  assert.ok(!/💗/.test(photoCaption('meal', '꼬부기')), '사진 말엔 💗 없음');
  assert.equal(photoDate(T0), `${new Date(T0).getMonth() + 1}월 ${new Date(T0).getDate()}일`);
  assert.equal(photoDate(NaN), '');
  assert.deepEqual(photoLabel({ ...base, mon: 0 }, '개굴닌자'), { date: photoDate(base.at), line: '📺 TV를 봤어요' }, '혼자 찍은 사진엔 파트너 이름 없음');
});

test('🎬 화면 잇기 — 장면 [📸 사진 찍기](o.onPhoto · 끝 모습·직접 하는 장면에서 · 한 장 · 건너뛰기에서 뺌) · 집: 📷 앨범 탭 · 액자 도구 · 가득 차면 장면 뒤 뺄 사진 고르기 · 닫으면 크게 보기도 · 앱 셸', () => {
  const ps = read('js/playshow.js');
  assert.ok(ps.includes("photo: typeof o.onPhoto === 'function' ? o.onPhoto : null, shot: false"));
  assert.ok(ps.includes("!e.target.closest('.pshow-photo')) skip = true;"), '사진 단추를 눌러도 장면을 건너뛰지 않는다');
  assert.equal((ps.match(/showPhotoBtn\(\);/g) || []).length, 2, '끝 모습 · 직접 하는 장면');
  assert.ok(ps.includes('mine.shot = true;'), '두 번 눌러도 한 장');
  assert.ok(!/(\d+)\s*장/.test(ps.slice(ps.indexOf('PHOTO_SAID'), ps.indexOf('function showPhotoBtn'))), '사진 말에 셈 없음');
  const hv = read('js/houseview.js');
  assert.ok(hv.includes("else if (ui.tab === 'album') body.appendChild(albumView());"));
  assert.ok(hv.includes('if (it.id === FRAME_ID) for (const b of frameTools(it, rid)) t.appendChild(b);'));
  assert.ok(hv.includes('const ph = it.id === FRAME_ID ? framePhotoOf(getProfileSnapshot(), roomId(), it.u) : null;'));
  assert.ok(hv.includes("if (res && res.why === 'full' && live()) ui.pendingPhoto = photoRec;"));
  assert.ok(hv.includes("if (ui.open && ui.pendingPhoto) { ui.tab = 'album';"), '가득 차면 장면 뒤 📷 앨범에서 고르기');
  assert.ok(hv.includes('wall: wallC, floor: floorC, onPhoto,'));
  assert.ok(/closePlay\(\);\n {2}closePhotoBig\(\);/.test(hv), '집을 닫으면 크게 보기도 닫는다');
  const sw = read('sw.js');
  assert.ok(sw.includes("'./js/photo.js'") && sw.includes("'./js/photoview.js'"));
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(sw) || [])[1]) >= 384);
});

// ───────────── Codex 187차 (v384) ─────────────

test('🗑️ 뺀 사진 301번 넘게 바꿔도 — 첫 뺀 사진이 든 옛 백업과 합쳐 되살아나지 않고, 아끼던 29장은 그대로 (Codex 187차 #1)', () => {
  const p = withPhotos(PHOTO_MAX); // rec(1)~rec(30) · rec(1)~rec(29)는 아끼는 사진
  const backup = JSON.parse(JSON.stringify(p.homePhotos)); // 첫 뺀 사진 rec(30)이 아직 든 옛 백업
  let last = rec(PHOTO_MAX).id;
  for (let i = 0; i < 301; i++) {
    const nw = rec(1000 + i);
    const r = takePhotoRule(p, nw, T0 + 1e6 + i * 1000, last); // 늘 새로 넣은 자리 하나만 바꾼다
    assert.equal(r.ok, true, `${i}번째 바꾸기`);
    last = nw.id;
  }
  assert.equal(Object.keys(photosOf(p.homePhotos).gone).length, 301);
  const m = mergePhotos(backup, p.homePhotos);
  assert.ok(!m.list.some((x) => x.id === rec(PHOTO_MAX).id), '처음 뺀 사진이 되살아나지 않는다');
  for (let i = 1; i < PHOTO_MAX; i++) assert.ok(m.list.some((x) => x.id === rec(i).id), `아끼던 사진 ${i}이 밀려나지 않는다`);
  assert.equal(m.list.length, PHOTO_MAX);
  assert.ok(m.list.some((x) => x.id === last), '마지막에 넣은 사진');
  assert.deepEqual(mergePhotos(p.homePhotos, backup), m, '어느 차례로 합쳐도 같다');
});

test('🖼️ 액자를 서랍↔방으로 210번 오가도 — 새로 건 사진이 정말 걸리고, 지금 놓인 액자 칸만 남음 · 다른 액자 칸은 그대로 (Codex 187차 #3)', () => {
  let [p, u] = withFrame(withPhotos(3));
  const other = placeRule(p, R, FRAME_ID, 3, 0); // 두 번째 액자 — 계속 놓여 있다
  assert.equal(other.ok, true);
  assert.equal(hangRule(p, R, other.u, rec(1).id, T0 + 10).ok, true);
  for (let i = 0; i < 210; i++) {
    assert.equal(hangRule(p, R, u, rec(2 + (i % 2)).id, T0 + 100 + i).ok, true);
    assert.equal(framePhotoOf(p, R, u).id, rec(2 + (i % 2)).id, `${i}번째 걸기가 정말 걸림`);
    assert.equal(storeRule(p, R, u).ok, true);
    const a = placeRule(p, R, FRAME_ID, 0, 0);
    assert.equal(a.ok, true);
    assert.notEqual(a.u, u, '다시 놓으면 새 번호');
    u = a.u;
    assert.equal(framePhotoOf(p, R, u), null, '다시 놓은 액자는 빈 액자');
  }
  assert.equal(hangRule(p, R, u, rec(3).id, T0 + 9999).ok, true);
  assert.equal(framePhotoOf(p, R, u).id, rec(3).id);
  assert.deepEqual(Object.keys(photosOf(p.homePhotos).frames).sort(), [frameKey(R, other.u), frameKey(R, u)].sort(), '서랍에 들어간 액자 칸은 지운다');
  assert.equal(framePhotoOf(p, R, other.u).id, rec(1).id, '놓여 있는 다른 액자는 그대로');
});

test('🖼️ 액자 칸 끝(200) — 바꾼 때가 나중인 칸부터 남김 · 방금 건 칸이 잘리지 않음 · mergePhotos(a,b) = (b,a) (Codex 187차 #3)', () => {
  const ph = rec(1).id;
  const old = {};
  for (let i = 1; i <= 200; i++) old[frameKey(R, i)] = { p: '', at: T0 + i };
  const fresh = { [frameKey(R, 999)]: { p: ph, at: T0 + 5000 } };
  const one = photosOf({ list: [{ ...rec(1), at: T0 }], frames: { ...old, ...fresh } }); // 새 칸이 맨 뒤에 붙어 있어도
  assert.equal(Object.keys(one.frames).length, 200);
  assert.deepEqual(one.frames[frameKey(R, 999)], { p: ph, at: T0 + 5000 }, '방금 건 칸이 남는다');
  assert.ok(!own(one.frames, frameKey(R, 1)), '가장 먼저 바꾼 칸이 잘린다');
  const a = { list: [{ ...rec(1), at: T0 }], frames: old };
  const b = { list: [], frames: fresh };
  const ab = mergePhotos(a, b);
  const ba = mergePhotos(b, a);
  assert.deepEqual(ab, ba, '차례가 달라도 같다');
  assert.equal(ab.frames[frameKey(R, 999)].p, ph);
  // 같은 때끼리는 열쇠 차례로 — 어느 기기에서 읽어도 같은 200칸
  const tie = {};
  for (let i = 1; i <= 250; i++) tie[frameKey(R, i)] = { p: '', at: T0 };
  const rev = Object.fromEntries(Object.entries(tie).reverse());
  assert.deepEqual(Object.keys(photosOf({ frames: tie }).frames).sort(), Object.keys(photosOf({ frames: rev }).frames).sort());
});

test('📸 저장 중 [좋아!] — 저장 대답(앨범 가득 참) 뒤에 닫는다 · 또 눌러도 한 번 · 저장이 실패해도 닫힘 · 그새 집을 닫았으면 안 닫음 · 저장이 없으면 바로 (Codex 187차 #2)', async () => {
  const later = () => { let done; let fail; const p = new Promise((ok, no) => { done = ok; fail = no; }); return { p, done, fail }; };
  const tick = () => new Promise((r) => setTimeout(r, 0));
  // 집의 onPhoto가 full을 받으면 pendingPhoto를 먼저 적고 대답한다 → 장면이 닫힌 뒤 playAt의 finally가 📷 앨범 고르기로 간다
  const home = { pendingPhoto: null, tab: 'room' };
  const d = later();
  const sc = { saving: d.p.then((r) => { if (r.why === 'full') home.pendingPhoto = 'new'; return r; }) };
  const log = [];
  const closeScene = () => { log.push('닫힘'); if (home.pendingPhoto) home.tab = 'album'; };
  closeAfterSave(sc, () => true, closeScene);
  closeAfterSave(sc, () => true, closeScene); // 대답을 기다리는 동안 또 누름
  await tick();
  assert.deepEqual(log, [], '저장 대답 전에는 닫지 않는다');
  d.done({ ok: false, why: 'full' });
  await tick();
  assert.deepEqual(log, ['닫힘'], '대답 뒤에 한 번');
  assert.equal(home.tab, 'album', '닫힌 뒤 바로 뺄 사진 고르기');
  assert.equal(sc.saving, null, '대답이 왔으면 다시 기다리지 않는다');
  // 저장이 깨져도 닫힌다
  const e = later();
  const s2 = { saving: e.p };
  let n2 = 0;
  closeAfterSave(s2, () => true, () => { n2++; });
  e.fail(new Error('x'));
  await tick();
  assert.equal(n2, 1);
  // 기다리는 사이 집을 닫음(다른 장면) → 닫지 않는다
  const f = later();
  let n3 = 0;
  closeAfterSave({ saving: f.p }, () => false, () => { n3++; });
  f.done({ ok: true });
  await tick();
  assert.equal(n3, 0);
  // 저장 중이 아니면 바로
  let n4 = 0;
  closeAfterSave({ saving: null }, () => true, () => { n4++; });
  closeAfterSave(null, () => true, () => { n4++; });
  assert.equal(n4, 2);
  // 장면에 이어져 있나
  const ps = read('js/playshow.js');
  assert.ok(ps.includes('if (cur.saving) { const mine = cur; closeAfterSave(mine, () => cur === mine, onOk); return; }'), '[좋아!]·[다 했어요]가 저장 대답을 기다린다');
  assert.ok(ps.includes('mine.saving = (async () => { try { return await mine.photo(); } catch { return null; } finally { mine.saving = null; } })();'));
  assert.ok(/export function closePlay\(\) \{\n {2}if \(box && !box\.hidden\) close\(\);/.test(ps), '집을 닫으면 장면은 기다리지 않고 바로 닫는다(못 넣은 새 사진은 그만두기)');
});

test('🎨 사진 속 💗 테두리·✨(가상 요소)도 멈춤 · 🔍 크게 보기 — Esc 닫기 · 초점은 안에 · 돌아갈 단추가 사라졌으면 📷 앨범 탭 (Codex 187차 #4·#5)', () => {
  const css = read('css/style.css');
  const rule = css.split('\n').find((l) => l.includes('animation-play-state: paused !important') && l.includes('.pshow-stage.is-photo')) || '';
  for (const sel of ['.pshow-stage.is-photo *', '.pshow-stage.is-photo *::before', '.pshow-stage.is-photo *::after', '.pshow-stage.is-photo::before', '.pshow-stage.is-photo::after']) {
    assert.ok(rule.split(/\s*,\s*|\s*\{/).includes(sel), `멈춤 규칙에 ${sel}`);
  }
  assert.ok(/\.pshow-pal\.is-bond2::before[^{]*\{[^}]*animation: bond-pulse/.test(css), '멈춰야 할 움직임이 가상 요소에 있다(이 시험의 까닭)');
  const pv = read('js/photoview.js');
  assert.ok(pv.includes("big.setAttribute('aria-modal', 'true');"));
  assert.ok(pv.includes("if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closePhotoBig(); } else if (e.key === 'Tab') { e.preventDefault(); focusBigClose(); }"));
  assert.ok(pv.includes("document.addEventListener('focusin', (e) => { if (!big.hidden && !big.contains(e.target)) focusBigClose(); });"), '떠 있는 동안 초점이 뒤로 빠지면 되돌린다');
  assert.ok(pv.includes('if (!(back && back.isConnected) && bigBack) { try { back = bigBack(); } catch { back = null; } }'), '누른 단추가 사라졌으면 대신 갈 곳');
  const hv = read('js/houseview.js');
  assert.ok(hv.includes(`return { ...artOpts(), backTo: () => document.querySelector('#house-tabs [data-tab="album"]') };`));
  assert.equal((hv.match(/showPhotoBig\([a-z]+, bigOpts\(\)\)/g) || []).length, 2, '앨범·액자 두 곳 모두');
  assert.ok(!hv.includes('showPhotoBig(ph, artOpts())') && !hv.includes('showPhotoBig(rec, artOpts())'));
});
