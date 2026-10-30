// 🛏️ 가구 놀기 (v365 — 아버님 기본안 「이대로」 · 장면 시안 「이대로」) — node --test tests/furnplay365.test.js
// 가구 열 가지(침대·소파·쿠션·곰인형·책 더미·책장·큰 화분·해바라기·창문·장난감 상자) · 💗 가구 놀기는 합쳐 하루 셋(기기 놀기는 그대로) ·
// 벽 가구(창문)는 그 아래 바닥 칸 · 🐾 쿠션은 파트너가 그 위로 · 장면 말(셈 없음 · 조사) · 그림(장면마다 · 글자 넣기 막음) · 하늘 · 잇기 · 진짜 저장 경로
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PLAYS, PLAY_IDS, FURN_PLAY_IDS, FURN_HEART_MAX, furnHeartsOn, playRule, heartReady, playSpot, hasPlayable, playOf, mergePlay } from '../js/homeplay.js';
import { SCENE_OF, HANDS_ON, TOYS, STORY_COUNT, playLines, stageHtml, skyOf, toyOf, rainbowOf, storyOf, whoOf } from '../js/playart.js';
import { LOOK_BASE } from '../js/avatar.js';
import { FIRST_ROOM, HEAL, furnById } from '../js/house.js';
import { dayNum } from '../js/korean.js';
import { emptyProfile, cloneProfile } from '../js/db.js';
import { initProfile, flushProfile, reloadProfile, homePlay, getProfileSnapshot } from '../js/xp.js';

const src = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const R = FIRST_ROOM;
const T = 1_700_000_000_000;
const DAY = 86_400_000;
const FROG = 658;
const TEN = ['f_bed', 'f_sofa', 'f_cushion', 'f_teddy', 'f_books', 'f_shelf', 'f_plant', 'f_flower', 'f_window', 'f_toybox'];
const NEW_SCENES = ['nap', 'sofa', 'pet', 'teddy', 'book', 'plant', 'flower', 'window', 'toy'];

// 방 하나에 가구 열 + 📺 + 🕰️ (겹치지 않게 · 벽은 y 0)
const ALL = [
  { u: 1, id: 'f_bed', x: 0, y: 0 }, { u: 2, id: 'f_sofa', x: 3, y: 0 }, { u: 3, id: 'f_cushion', x: 6, y: 0 },
  { u: 4, id: 'f_teddy', x: 0, y: 2 }, { u: 5, id: 'f_books', x: 2, y: 2 }, { u: 6, id: 'f_shelf', x: 4, y: 2 }, { u: 7, id: 'f_plant', x: 6, y: 2 },
  { u: 8, id: 'f_flower', x: 0, y: 4 }, { u: 9, id: 'f_toybox', x: 2, y: 4 }, { u: 10, id: 'f_window', x: 3, y: 0 },
  { u: 11, id: 'f_tv', x: 5, y: 4 }, { u: 12, id: 'f_clock', x: 6, y: 0 },
];
const U = Object.fromEntries(ALL.map((i) => [i.id, i.u]));
const OWN = Object.fromEntries(ALL.map((i) => [i.id, 1]));
const made = (spot = { room: R, x: 7, y: 5 }) => ({ made: true, gifted: true, look: { ...LOOK_BASE }, name: '', spot, at: T });
const pf = (items = ALL, extra = {}) => cloneProfile({
  ...emptyProfile(), coins: 500, xp: 40, items: { ...OWN, f_chair: 1 }, caught: { [FROG]: 1 }, partner: FROG,
  house: { started: true, seq: 40, rooms: [{ id: R, wall: '', floor: '', items }] }, avatar: made(), ...extra,
});

// ───────────────────── 등록부 ─────────────────────

test('🛏️ 놀 수 있는 가구 열 (furn) · 기기 놀기 다섯은 그대로 · 장면 이름 · 직접 하는 장면 · 놀 수 없는 가구', () => {
  assert.deepEqual([...FURN_PLAY_IDS].sort(), [...TEN].sort());
  assert.equal(FURN_HEART_MAX, 3);
  for (const id of TEN) {
    const f = furnById(id);
    assert.ok(f, id);
    assert.notEqual(f.group, 'device', `${id}: 기기가 아니다`);
    assert.equal(PLAYS[id].furn, true, id);
    assert.match(PLAYS[id].btn, /^\S+ \S/, id);
    assert.ok(NEW_SCENES.includes(SCENE_OF[id]), id);
  }
  for (const id of ['f_tv', 'f_game', 'f_pc', 'f_piano', 'f_table']) assert.ok(PLAYS[id] && !PLAYS[id].furn, id);
  for (const id of PLAY_IDS) assert.ok(SCENE_OF[id], `${id}: 장면 없음`);
  for (const id of ['f_chair', 'f_drawer', 'f_clock', 'f_lamp', 'f_frame', 'f_desk', 'f_fridge', HEAL]) assert.equal(PLAYS[id], undefined, `${id}는 이번엔 안 논다`);
  assert.deepEqual(Object.keys(HANDS_ON).sort(), ['flower', 'pet', 'piano', 'plant']);
  assert.deepEqual(TEN.map((id) => SCENE_OF[id]), ['nap', 'sofa', 'pet', 'teddy', 'book', 'book', 'plant', 'flower', 'window', 'toy']);
  assert.equal(furnById('f_window').at, 'wall');
});

// ───────────────────── 💗 하루 셋 ─────────────────────

test('💗 가구 놀기는 합쳐 하루 셋 — 넷째부터 장면만(날도 안 적음) · 기기 놀기는 따로 · 같은 가구 두 번째 · 다음 날 다시 셋 · 시계를 되돌려도 더 안 받음', () => {
  const p = pf();
  const order = ['f_bed', 'f_sofa', 'f_teddy', 'f_books', 'f_plant'];
  const rs = order.map((id) => playRule(p, R, U[id], T));
  assert.deepEqual(rs.map((r) => r.heart), [true, true, true, false, false]);
  assert.ok(rs.every((r) => r.ok), '넷째·다섯째도 장면은 본다');
  assert.deepEqual(rs.map((r) => r.kind), order);
  const day = dayNum(T);
  assert.deepEqual(Object.keys(playOf(p.homePlay).days).sort(), ['f_bed', 'f_sofa', 'f_teddy'], '💗를 받은 가구만 날이 적힌다');
  assert.equal(p.homePlay.bond[FROG], 3);
  assert.equal(furnHeartsOn(p.homePlay, day), 3);
  assert.equal(heartReady(p, 'f_toybox', T), false, '오늘 셋을 다 받았다');
  assert.equal(heartReady(p, 'f_tv', T), true, '📺 기기 놀기는 셋에 안 센다');
  assert.equal(playRule(p, R, U.f_tv, T).heart, true);
  assert.equal(p.homePlay.bond[FROG], 4);
  assert.equal(playRule(p, R, U.f_bed, T).heart, false, '같은 가구 두 번째');
  // 다음 날 — 다시 셋 (창문은 벽 가구)
  const t2 = T + DAY;
  assert.deepEqual(['f_books', 'f_window', 'f_bed', 'f_cushion'].map((id) => playRule(p, R, U[id], t2).heart), [true, true, true, false]);
  assert.equal(furnHeartsOn(p.homePlay, dayNum(t2)), 3);
  // 시계를 하루 되돌림 — 어제 받은 셋 + 오늘(되돌린 날 뒤로) 적힌 셋이 「그날이거나 그 뒤」로 세어져 더 안 준다
  assert.equal(playRule(p, R, U.f_toybox, T).heart, false, '시계를 되돌려도 넷째는 없다');
  assert.equal(p.homePlay.bond[FROG], 7, '💗 3 + 📺 1 + 다음 날 3');
  // 경제는 그대로
  assert.deepEqual([p.coins, p.xp, p.items.f_bed], [500, 40, 1]);
});

test('🔍 Codex 169차 #1 — 시계가 크게 앞섰다 돌아와도 먼 앞날 기록은 그 가구 하나만 막는다(다른 가구 💗는 오늘 셋) · 하루 되돌림은 그대로 막음 · 깨진 큰 날', () => {
  const p = pf();
  const far = T + 365 * DAY;
  assert.deepEqual(['f_bed', 'f_sofa', 'f_teddy'].map((id) => playRule(p, R, U[id], far).heart), [true, true, true], '1년 앞선 시계');
  assert.equal(furnHeartsOn(p.homePlay, dayNum(T)), 0, '먼 앞날은 오늘 셋에 안 센다');
  assert.deepEqual(['f_books', 'f_plant', 'f_window', 'f_toybox'].map((id) => playRule(p, R, U[id], T).heart), [true, true, true, false], '시계를 바로잡은 날 — 다른 가구로 셋');
  assert.equal(playRule(p, R, U.f_bed, T + DAY).heart, false, '앞날에 받은 침대는 그날까지 그대로 막힘(기기 놀기와 같음)');
  assert.deepEqual(['f_shelf', 'f_flower', 'f_cushion'].map((id) => playRule(p, R, U[id], T + DAY).heart), [true, true, true], '다음 날도 다른 가구로 셋');
  // 하루 되돌림 — 내일 셋을 받고 오늘로 돌아오면 「오늘·내일」 셋이라 더 안 준다
  const q = pf();
  for (const id of ['f_bed', 'f_sofa', 'f_teddy']) playRule(q, R, U[id], T + DAY);
  assert.equal(furnHeartsOn(q.homePlay, dayNum(T)), 3);
  assert.equal(playRule(q, R, U.f_books, T).heart, false);
  // 깨진 큰 날(DAY_MAX로 잘림) 셋이 남아 있어도 오늘 가구 💗는 막지 않는다
  const z = pf(ALL, { homePlay: { days: { f_bed: Number.MAX_SAFE_INTEGER, f_sofa: 1e300, f_teddy: 9e15 }, bond: { [FROG]: 3 } } });
  assert.equal(furnHeartsOn(z.homePlay, dayNum(T)), 0);
  assert.equal(playRule(z, R, U.f_books, T).heart, true);
});

test('💗 파트너가 없으면 장면만(날도 안 적음) · 캐릭터가 먼저 · 치운 가구 · 놀 수 없는 가구', () => {
  const p = pf(ALL, { partner: 0, caught: {} });
  const r = playRule(p, R, U.f_bed, T);
  assert.deepEqual([r.ok, r.heart, r.mon], [true, false, null]);
  assert.deepEqual(playOf(p.homePlay).days, {});
  assert.deepEqual(playRule(pf(ALL, { avatar: undefined }), R, U.f_bed, T), { ok: false, why: 'made' });
  assert.deepEqual(playRule(pf(), R, 99, T), { ok: false, why: 'gone' });
  assert.deepEqual(playRule(pf(), R, U.f_clock, T), { ok: false, why: 'play' });
});

test('💾 두 기기 병합 — 날은 가구마다 큰 쪽(합치면 그날 셋을 넘게 적혀 있어도 더 안 줌) · 💗는 더하지 않고 큰 쪽', () => {
  const a = pf();
  const b = pf();
  for (const id of ['f_bed', 'f_sofa', 'f_teddy']) playRule(a, R, U[id], T);
  for (const id of ['f_books', 'f_plant', 'f_window']) playRule(b, R, U[id], T);
  const m = mergePlay(a.homePlay, b.homePlay);
  assert.equal(furnHeartsOn(m, dayNum(T)), 6);
  assert.equal(m.bond[FROG], 3, '더하지 않는다');
  const c = pf(ALL, { homePlay: m });
  assert.equal(playRule(c, R, U.f_toybox, T).heart, false);
  assert.equal(playRule(c, R, U.f_toybox, T + DAY).heart, true, '다음 날은 다시');
  // 옛 판 앱의 playOf처럼 모르는 칸을 버려도 깨지지 않는다(그날 💗를 한 번 더 받을 수 있을 뿐 — 기본안 「걱정되는 것」)
  const old = { days: { f_tv: dayNum(T) }, bond: { [FROG]: 3 } };
  assert.equal(furnHeartsOn(old, dayNum(T)), 0);
});

// ───────────────────── 놀 칸 ─────────────────────

test('🚶 놀 칸 — 🌤️ 창문(벽)은 그 아래 바닥 칸(막히면 옆) · 🕰️ 시계(못 노는 벽 가구)는 null · 🐾 쿠션은 파트너가 그 위에 앉고 캐릭터만 옆 · 파트너가 없으면 보통', () => {
  const win = [{ u: 1, id: 'f_window', x: 5, y: 0 }];
  assert.deepEqual(playSpot(pf(win), R, 1).me, { room: R, x: 5, y: 0 });
  const blocked = [{ u: 1, id: 'f_window', x: 5, y: 0 }, { u: 2, id: 'f_chair', x: 5, y: 0 }];
  assert.deepEqual(playSpot(pf(blocked), R, 1).me, { room: R, x: 4, y: 0 }, '바로 아래가 막히면 왼쪽');
  assert.equal(playSpot(pf([{ u: 1, id: 'f_clock', x: 2, y: 0 }]), R, 1), null);
  const cush = [{ u: 1, id: 'f_cushion', x: 3, y: 3 }];
  assert.deepEqual(playSpot(pf(cush), R, 1), { me: { room: R, x: 2, y: 3 }, pal: { room: R, x: 3, y: 3, cushion: true } });
  const alone = playSpot(pf(cush, { partner: 0, caught: {} }), R, 1);
  assert.deepEqual([alone.me, alone.pal], [{ room: R, x: 2, y: 3 }, null]);
  const bed = playSpot(pf([{ u: 1, id: 'f_bed', x: 2, y: 2 }]), R, 1);
  assert.deepEqual(bed.me, { room: R, x: 1, y: 2 }, '바닥 가구는 지금처럼 왼쪽부터');
});

test('🛋️ 처음 한 번 안내를 띄울 때 — 놀 수 있는 가구·기기가 방에 놓였을 때만', () => {
  assert.equal(hasPlayable(pf([])), false);
  assert.equal(hasPlayable(pf([{ u: 1, id: 'f_clock', x: 2, y: 0 }, { u: 2, id: 'f_chair', x: 1, y: 1 }])), false);
  assert.equal(hasPlayable(pf([{ u: 1, id: 'f_teddy', x: 1, y: 1 }])), true);
  assert.equal(hasPlayable(pf([{ u: 1, id: 'f_tv', x: 1, y: 1 }])), true, '기기도');
  assert.equal(hasPlayable(emptyProfile()), false);
});

// ───────────────────── 장면 말 ─────────────────────

test('💬 장면 말 — 셈 없음 · 받침 조사 · 이름표가 비면 나/내가 · 파트너가 없으면 혼자 + 도움말 · 직접 하는 장면의 다 됐을 때 말 · 하늘·장난감·이야기는 날·시각마다', () => {
  const all = [];
  for (const scene of NEW_SCENES) {
    for (const ctx of [{ mon: '개굴닌자', name: '', heart: true }, { mon: '리자몽', name: '지환', heart: false, sky: 'night' }, { mon: '', name: '', heart: false, sky: 'dusk' }]) {
      for (let day = 0; day < 13; day++) {
        const L = playLines(scene, ctx, day);
        assert.ok(L.start.length >= 1, scene);
        all.push(...L.start, L.end, L.tip, L.extra);
        if (ctx.heart && ctx.mon) assert.equal(L.end, `💗 ${ctx.mon}와 더 친해졌어요`);
        assert.equal(!!L.tip, !ctx.mon, `${scene}: 도움말은 파트너가 없을 때만`);
        assert.equal(!!L.extra, ['pet', 'plant', 'flower'].includes(scene), `${scene}: extra`);
      }
    }
  }
  for (const line of all) {
    assert.doesNotMatch(line, /\d+\s*(번|회|개)\b|남음|남았|밀린|더 하면/, line);
    assert.doesNotMatch(line, /undefined|NaN|null|\[object/, line);
  }
  assert.equal(playLines('pet', { mon: '리자몽' }).end, '🤗 리자몽을 쓰다듬어 줬어요');
  assert.equal(playLines('pet', { mon: '피카츄' }).end, '🤗 피카츄를 쓰다듬어 줬어요');
  assert.equal(playLines('pet', { mon: '' }).end, '🐾 쿠션을 폭신폭신 눌러 봤어요');
  assert.equal(playLines('nap', { mon: '리자몽' }).end, '😴 리자몽과 낮잠을 잤어요');
  assert.equal(playLines('flower', { mon: '' }).end, '💧 해바라기에 물을 줬어요');
  assert.equal(playLines('teddy', { mon: '리자몽' }, 0).start[2], '🤗 리자몽이 곰인형을 꼭 안았어요');
  assert.equal(playLines('sofa', { mon: '', name: '' }, 0).start[1], '💬 나: "아, 편하다!"');
  assert.match(playLines('sofa', { mon: '개굴닌자', name: '지환' }, 0).start[2], /^💬 지환: "/);
  // 🔭 하늘 — 밤 · 노을 · 낮(무지개 날 · 구름 날)
  const sky = (s, d) => playLines('window', { mon: '개굴닌자', sky: s }, d).start[1];
  assert.match(sky('night', 0), /달님/);
  assert.match(sky('dusk', 0), /노을/);
  assert.match(sky('day', 1), /무지개/);
  assert.match(sky('day', 2), /개굴닌자 같아/);
  assert.match(sky('nope', 2), /구름/, '모르는 하늘은 낮');
  // 🧩 장난감 — 날마다 셋이 돈다
  const toys = new Set([0, 1, 2].map((d) => playLines('toy', { mon: '' }, d).start[1].slice(0, 2)));
  assert.equal(toys.size, 3);
  // 📖 이야기 — 제목 + 세 쪽 · 여섯이 돈다 · 이름표·파트너 이름 · 파트너가 없으면 「포켓몬 친구」
  const titles = new Set();
  for (let d = 0; d < STORY_COUNT; d++) {
    const L = playLines('book', { mon: '리자몽', name: '지환' }, d);
    assert.equal(L.start.length, 4);
    assert.match(L.start[0], /^📖 「.+」$/);
    titles.add(L.start[0]);
    assert.ok(L.start.slice(1).join(' ').includes('리자몽'), `${L.start[0]}: 파트너 이름`);
  }
  assert.equal(titles.size, STORY_COUNT);
  assert.equal(STORY_COUNT, 6);
  assert.equal(playLines('book', {}, 0).start[0], playLines('book', {}, STORY_COUNT).start[0], '여섯 날마다 처음으로');
  assert.ok(playLines('book', { mon: '리자몽', name: '지환' }, 0).start.join(' ').includes('지환이 손을'), '받침 있는 이름표 + 이');
  assert.ok(playLines('book', { mon: '', name: '' }, 3).start.join(' ').includes('내가 포켓몬 친구에게'));
  assert.equal(storyOf(-7, whoOf(''), '피카츄').title, storyOf(7, whoOf(''), '피카츄').title, '깨진 날도 이야기 하나');
});

test('🔭 하늘 시각 — 6~16시 낮 · 17~18시 노을 · 그 밖은 밤 · 깨진 시각은 낮 · 🧩·🌈 날 고르기', () => {
  assert.deepEqual([0, 5, 6, 16, 17, 18, 19, 23].map(skyOf), ['night', 'night', 'day', 'day', 'dusk', 'dusk', 'night', 'night']);
  assert.deepEqual([NaN, undefined, 'x', '7'].map(skyOf), ['day', 'day', 'day', 'day']);
  assert.deepEqual([0, 1, 2, 3, -1, 2.7].map(toyOf), ['blocks', 'top', 'ball', 'blocks', 'top', 'ball']);
  assert.deepEqual(TOYS, ['blocks', 'top', 'ball']);
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(rainbowOf), [false, true, false, false, false, true]);
});

// ───────────────────── 장면 그림 ─────────────────────

test('🖼️ 장면 그림 — 장면마다 가구 그림 · 침대·소파는 앞 판 · 낮잠은 밤·햇살 판 · 물 주기는 물뿌리개 · 혼자면 is-alone · 하늘·장난감 · 글자 넣기·위험한 주소 막음', () => {
  const mon = { ko: '개굴닌자', url: 'https://example.com/658.png' };
  const mark = { nap: 'pv-bed', sofa: 'pv-sofa', pet: 'pv-cushion', teddy: 'pv-teddy', book: 'pv-book', plant: 'pv-pot is-plant', flower: 'pv-pot is-flower', window: 'pv-window', toy: 'pv-toybox' };
  for (const scene of NEW_SCENES) {
    const h = stageHtml(scene, { look: LOOK_BASE, mon, day: 3, sky: 'day' });
    assert.ok(h.includes(`pshow-stage is-${scene}"`), scene);
    assert.ok(h.includes(mark[scene]), `${scene}: ${mark[scene]}`);
    assert.equal(h.includes('pshow-front'), scene === 'nap' || scene === 'sofa', `${scene}: 앞 판`);
    assert.equal(h.includes('pshow-dim') && h.includes('pshow-sun'), scene === 'nap', `${scene}: 밤·햇살`);
    assert.equal(h.includes('pshow-can'), scene === 'plant' || scene === 'flower', `${scene}: 물뿌리개`);
    assert.ok(h.includes('class="pshow-pal'), scene);
    const a = stageHtml(scene, { look: LOOK_BASE, mon: null, day: 3 });
    assert.ok(a.includes('is-alone') && !a.includes('class="pshow-pal'), `${scene}: 혼자`);
    assert.doesNotMatch(h + a, /undefined|NaN/, scene);
  }
  assert.ok(stageHtml('book', { look: LOOK_BASE, mon }).includes('pv-bookmon'), '책에 파트너 그림');
  assert.ok(stageHtml('flower', { look: LOOK_BASE, mon }).includes('pv-bloom'));
  assert.ok(!stageHtml('plant', { look: LOOK_BASE, mon }).includes('pv-bloom'), '큰 화분엔 꽃 없음');
  const win = (sky, day) => stageHtml('window', { look: LOOK_BASE, mon, sky, day });
  assert.ok(win('night', 0).includes('pv-twinkle') && !win('day', 0).includes('pv-twinkle'));
  assert.ok(win('dusk', 0).includes('#ffa94d'));
  assert.ok(win('day', 1).includes('#9775fa') && !win('day', 2).includes('#9775fa'), '🌈은 무지개 날만');
  assert.ok(win('<script>', 0).includes('#8fd3ff'), '모르는 하늘은 낮');
  assert.notEqual(win('day', 0).match(/pv-winclip-[\w-]+/)[0], stageHtml('window', { look: LOOK_BASE, mon, uid: 'b' }).match(/pv-winclip-[\w-]+/)[0], '창 잘라내기 이름이 무대마다 다르다');
  const toy = (d) => stageHtml('toy', { look: LOOK_BASE, mon, day: d });
  assert.ok(toy(0).includes('pv-b3') && toy(1).includes('pv-spin') && toy(2).includes('pv-bounce'));
  // 글자 넣기·위험한 그림 주소
  const bad = stageHtml('book', { look: LOOK_BASE, mon: { ko: '<b>x</b>', url: 'javascript:alert(1)' }, name: '<i>' });
  assert.ok(!bad.includes('<b>') && !bad.includes('javascript') && !bad.includes('<i>'));
});

// ───────────────────── 잇기 (화면·차례·css·판) ─────────────────────

test('🔌 잇기 — 집 화면(하늘 시각 · 가게 「놓으면 …」 · 처음 한 번 안내 · 쿠션에 앉기) · 장면 차례(직접 하는 장면 · 보기만 여섯) · css · 판 v365', () => {
  const hv = src('js/houseview.js');
  assert.match(hv, /sky: skyOf\(new Date\(\)\.getHours\(\)\)/);
  assert.match(hv, /if \(PLAYS\[it\.id\]\) b\.appendChild\(el\('span', 'house-shop-what', `놓으면 \$\{PLAYS\[it\.id\]\.btn\}`\)\)/);
  assert.match(hv, /PLAY_HINT = '🛋️ 가구를 눌러 보세요 — 파트너와 같이 놀 수 있어요'/);
  assert.match(hv, /if \(ui\.tab === 'room' && !profileLoading\(\) && playHintDue\(\)\) \{\n\s*const pf = getProfileSnapshot\(\);\n\s*if \(avatarOf\(pf\)\.made && hasPlayable\(pf\)\) \{ ui\.msg = PLAY_HINT; playHintSeen\(\); \}/);
  assert.match(hv, /try \{ return !localStorage\.getItem\(PLAY_HINT_KEY\); \} catch \{ return false; \}/, '못 읽으면 안 띄운다');
  assert.match(hv, /node\.classList\.toggle\('is-sit', !!to\.cushion\)/);
  const ps = src('js/playshow.js');
  assert.match(ps, /const hands = HANDS_ON\[scene\] \|\| '';\n\s*ok\.textContent = hands \|\| '좋아!';\n\s*ok\.hidden = !hands;/);
  assert.match(ps, /const RUN = \{ tv: runTv, game: runGame, meal: runMeal, nap: runNap, sofa: runSofa, teddy: runTeddy, book: runBook, window: runWindow, toy: runToy \};/);
  assert.match(ps, /if \(HANDS_ON\[cur\.scene\] && !hearted && cur\.o\.heart && cur\.o\.mon\) \{/, '다 되기 전에 닫아도 💗를 보인다');
  assert.match(ps, /keys\.classList\.remove\('is-one'\); \}/, '닫으면 물 주기 단추 꼴을 뗀다');
  assert.match(ps, /if \(now - last < 300\) return;/);
  assert.equal((ps.match(/if \(n === 3\) handsDone\(''\);/g) || []).length, 2, '🤗·💧 세 번이면 다 됨');
  assert.match(ps, /setTimeout\(\(\) => \{ if \(cur === mine\) showHeart\(\); \}, 900\);/, '그새 닫히면 💗 말을 안 띄운다');
  // 🔍 Codex 169차 #2 — 닫힌 장면의 차례·예약이 새 장면에 섞이지 않게 (진짜 브라우저 걷기: walk365.sh 「닫고 바로 다른 장면」)
  assert.equal((ps.match(/if \(cur !== me\) throw GONE;/g) || []).length, 2, '기다리기 전과 뒤에 이 장면인지 본다');
  assert.match(ps, /\} catch \(e\) \{ if \(e === GONE\) return;/);
  assert.match(ps, /if \(cur !== mine\) return; \/\/ 그새 닫힘/);
  assert.match(ps, /if \(cur === mine\) fly\('💧'/, '물방울');
  assert.match(ps, /setTimeout\(\(\) => \{ if \(cur === mine\) close\(\); \}, 900\);/, '다 되기 전 닫기 예약');
  assert.match(hv, /for \(const \[n, sat\] of moved\) if \(n\.isConnected\) \{ n\.style\.transform = ''; n\.classList\.toggle\('is-sit', sat\); \}/, '돌아올 때 앉음 그대로 (Codex 169차 #5)');
  const css = src('css/style.css');
  assert.ok(css.includes('/* ===== 🛏️ 가구 놀기 (v365'));
  const rm = css.slice(css.indexOf('/* 「움직임 줄이기」면 멈춘 그림'));
  for (const s of NEW_SCENES) assert.ok(rm.slice(0, 700).includes(`.pshow-stage.is-${s} *`), `움직임 줄이기 ${s}`);
});

// ───────────────────── 진짜 저장 경로 (fakeidb) ─────────────────────

const stored = () => fakeIdb.get('profile', 'me');
async function seed(extra = {}) {
  await flushProfile();
  const cur = stored() || emptyProfile();
  const next = { ...cur, ...pf(), ...extra, updatedAt: (cur.updatedAt || 0) + 1 };
  if (!('homePlay' in extra)) delete next.homePlay;
  fakeIdb.put('profile', next);
  await reloadProfile();
}

test('★ 💾 저장 경로 — 두 창이 가구 놀기를 한꺼번에 해도 💗는 셋 · 저장된 프로필에 · 저장이 실패하면 없던 일', async () => {
  await initProfile();
  await seed();
  const ids = ['f_bed', 'f_sofa', 'f_teddy', 'f_books', 'f_plant', 'f_toybox'];
  const rs = await Promise.all([...ids.map((id) => homePlay(R, U[id])), ...ids.map((id) => homePlay(R, U[id]))]);
  assert.ok(rs.every((r) => r.ok));
  assert.equal(rs.filter((r) => r.heart).length, 3);
  assert.equal(stored().homePlay.bond[FROG], 3);
  assert.equal(Object.keys(stored().homePlay.days).length, 3);
  assert.equal(getProfileSnapshot().homePlay.bond[FROG], 3, '창의 프로필도');
  const s0 = stored();
  assert.equal((await homePlay(R, U.f_tv)).heart, true, '📺은 따로');
  fakeIdb.failNext('profile');
  assert.deepEqual(await homePlay(R, U.f_window), { ok: false, why: 'save' });
  assert.equal(stored().homePlay.days.f_window, undefined);
  assert.deepEqual([stored().coins, stored().items.f_bed, s0.coins], [500, 1, 500], '경제는 그대로');
});
