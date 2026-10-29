// 🎮 일상 행동 (2026-10-18, 아버님 "이대로 해") — 규칙·장면 그림·저장 시험: node --test tests/homeplay.test.js
// 기기 넷(📺🎮💻🎹) · 놀이 기록 고쳐 읽기·복사·병합 · 💗 사이좋음(기기마다 하루 한 번 · 진화해도 이어짐 · 시계를 되돌려도 또 안 받음 · 경제는 그대로) ·
// 놀 칸(기기 옆 · 파트너도 설 칸 먼저) · 장면 말(셈 문구 없음 · 조사) · 장면 그림(글자 넣기 막음) · 진짜 저장 경로(fakeidb — 두 창이 동시에 · 저장 실패)
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLAYS, PLAY_IDS, BOND_MAX, playOf, copyPlay, mergePlay, bondOf, chainOf, partnerOf, heartReady, playSpot, playRule } from '../js/homeplay.js';
import { SCENE_OF, KEYS, whoOf, playLines, stageHtml, tvSvg, gameSvg, pcSvg, pianoSvg } from '../js/playart.js';
import { LOOK_BASE } from '../js/avatar.js';
import { FURN, HEAL, FIRST_ROOM, furnById } from '../js/house.js';
import { dayNum } from '../js/korean.js';
import { emptyProfile, cloneProfile, mergeStatRecord } from '../js/db.js';
import { initProfile, flushProfile, reloadProfile, homePlay, getProfileSnapshot } from '../js/xp.js';

const R = FIRST_ROOM;
const T = 1_700_000_000_000;
const DAY = 86_400_000;
const FROG = 658;
const houseWith = (items) => ({ started: true, seq: 20, rooms: [{ id: R, wall: '', floor: '', items }] });
const made = () => ({ made: true, gifted: true, look: { ...LOOK_BASE }, name: '', spot: { room: R, x: 6, y: 5 }, at: T });
const OWN = { f_tv: 1, f_game: 1, f_pc: 1, f_piano: 1, f_bed: 1, f_teddy: 2, f_books: 2, f_clock: 1, f_flower: 2 };
/** 캐릭터·파트너·집을 가진 프로필 (복사본) */
const pf = (items, extra = {}) => cloneProfile({
  ...emptyProfile(), coins: 500, xp: 40, items: { ...OWN, stone_math: 3 }, caught: { [FROG]: 1, 656: 1 }, partner: FROG,
  house: houseWith(items), avatar: made(), ...extra,
});
const TV = { u: 1, id: 'f_tv', x: 3, y: 2 };

// ───────────────────── 목록 ─────────────────────

test('🎮 놀 수 있는 것 = 📺🎮💻🎹 + 🍽️ 식탁(③ 가구 더하기) · 💊 캡슐·🧊 냉장고는 아님 · 모두 바닥 가구 · 장면 이름 · 🎹 건반 여덟은 도~높은 도', () => {
  // 🛏️ 가구 놀기(v365)의 열 가지(furn)는 tests/furnplay365.test.js — 여기는 기기 놀기 다섯 그대로
  const dev = PLAY_IDS.filter((id) => !PLAYS[id].furn);
  assert.deepEqual([...dev].sort(), ['f_game', 'f_pc', 'f_piano', 'f_table', 'f_tv']);
  for (const id of PLAY_IDS) assert.ok(furnById(id), id);
  assert.equal(PLAYS.f_fridge, undefined);
  for (const id of dev) {
    assert.equal(furnById(id).at, 'floor', id);
    assert.match(PLAYS[id].btn, /^\S+ \S/, id); // 그림 글자 + 말 (🍽️ 식탁은 🍚 밥 먹기)
    assert.ok(['tv', 'game', 'pc', 'piano', 'meal'].includes(SCENE_OF[id]), id);
  }
  assert.equal(PLAYS[HEAL], undefined);
  assert.deepEqual(KEYS.map((k) => k.ko), ['도', '레', '미', '파', '솔', '라', '시', '도']);
  for (let i = 1; i < KEYS.length; i++) assert.ok(KEYS[i].hz > KEYS[i - 1].hz);
  assert.equal(KEYS[7].hz, KEYS[0].hz * 2 - 1, '높은 도 = 도의 두 배쯤');
});

// ───────────────────── 기록 ─────────────────────

test('💾 놀이 기록 고쳐 읽기·복사·병합 — 모르는 기기·깨진 값은 뺌 · 병합은 칸마다 큰 쪽 · 입력은 그대로 · 둘 다 없으면 null', () => {
  const raw = { days: { f_tv: 19000, f_clock: 5, f_pc: -1, f_game: 1.5, f_piano: 1e300 }, bond: { 658: 3, 25: 0, x: 4, '1e3': 2, 7: BOND_MAX * 9 }, junk: 1 };
  assert.deepEqual(playOf(raw), { days: { f_tv: 19000 }, bond: { 658: 3, 7: BOND_MAX } });
  assert.deepEqual(playOf('x'), { days: {}, bond: {} });
  assert.deepEqual(playOf({ days: [1], bond: null }), { days: {}, bond: {} });
  assert.equal(copyPlay(null), null);
  const c = copyPlay(raw);
  c.bond[658] = 99;
  assert.equal(raw.bond[658], 3, '복사는 새 객체');
  const a = { days: { f_tv: 10, f_pc: 7 }, bond: { 658: 2, 25: 9 } };
  const b = { days: { f_tv: 12, f_game: 3 }, bond: { 658: 1, 1: 4 } };
  const m = mergePlay(a, b);
  assert.deepEqual(m, { days: { f_tv: 12, f_pc: 7, f_game: 3 }, bond: { 658: 2, 25: 9, 1: 4 } });
  assert.deepEqual(a, { days: { f_tv: 10, f_pc: 7 }, bond: { 658: 2, 25: 9 } }, '입력 그대로');
  assert.equal(mergePlay(undefined, 'x'), null);
  assert.deepEqual(mergePlay(undefined, b), playOf(b));
});

test('💗 진화해도 이어진다 — 진화 전 모습들의 💗 가운데 큰 것 · 이브이 갈래 형제끼리는 나누지 않음 · 🧬 진화 줄', () => {
  assert.equal(bondOf({ bond: { 656: 3 } }, 658), 3, '개구마르의 💗가 개굴닌자에게');
  assert.equal(bondOf({ bond: { 656: 3, 658: 5 } }, 658), 5);
  assert.equal(bondOf({ bond: { 658: 5 } }, 656), 0, '진화한 뒤의 💗는 진화 전 모습에 안 간다');
  assert.equal(bondOf({ bond: { 134: 4 } }, 135), 0, '샤미드의 💗가 쥬피썬더에게 안 간다');
  assert.equal(bondOf({ bond: { 133: 2, 134: 4 } }, 135), 2, '이브이 때의 💗는 둘 다');
  assert.equal(bondOf(null, 25), 0);
  assert.deepEqual(chainOf(658), [656, 657, 658]);
  assert.deepEqual(chainOf(656), [656, 657, 658], '갈래가 하나면 다음 모습까지');
  assert.deepEqual(chainOf(133), [133], '이브이는 갈래가 여럿 — 다음 모습을 고르지 않는다');
  assert.deepEqual(chainOf(134), [133, 134]);
});

// ───────────────────── 규칙 ─────────────────────

test('▶️ 놀기: 캐릭터를 먼저 · 그 방에 없는 기기 · 놀 수 없는 가구 · 🤝 파트너가 없거나 데리고 있지 않으면 장면만(기록 안 바뀜)', () => {
  const noMe = pf([TV], { avatar: undefined });
  delete noMe.avatar;
  assert.deepEqual(playRule(noMe, R, 1, T), { ok: false, why: 'made' });
  assert.deepEqual(playRule(pf([TV]), R, 9, T), { ok: false, why: 'gone' });
  assert.deepEqual(playRule(pf([TV]), 'r9', 1, T), { ok: false, why: 'gone' });
  assert.deepEqual(playRule(pf([{ u: 2, id: 'f_clock', x: 0, y: 0 }]), R, 2, T), { ok: false, why: 'play' });
  for (const extra of [{ partner: null }, { partner: 25 }, { partner: FROG, caught: {} }]) {
    const p = pf([TV], extra);
    assert.deepEqual(playRule(p, R, 1, T), { ok: true, kind: 'f_tv', heart: false, mon: null, bond: 0 }, JSON.stringify(extra));
    assert.equal(p.homePlay, undefined, '파트너 없이 논 날은 적지 않는다 — 나중에 파트너와 놀면 받게');
  }
  assert.equal(partnerOf({ partner: '658', caught: { 658: 2 } }), 658);
  assert.equal(partnerOf({ partner: 1.5, caught: { 1.5: 1 } }), null);
});

test('💗 기기마다 하루 한 번 · 같은 날 두 번째는 장면만 · 다른 기기는 따로 · 다음 날 다시 · 시계를 되돌려도 또 안 받음 · 💰·스톤·경험치·가방은 그대로', () => {
  const p = pf([TV, { u: 2, id: 'f_game', x: 5, y: 0 }]);
  const econ = (x) => JSON.stringify([x.coins, x.xp, x.items, x.caught, x.mons, x.house, x.avatar]);
  const before = econ(p);
  assert.deepEqual(playRule(p, R, 1, T), { ok: true, kind: 'f_tv', heart: true, mon: FROG, bond: 1 });
  assert.deepEqual(p.homePlay, { days: { f_tv: dayNum(T) }, bond: { [FROG]: 1 } });
  assert.deepEqual(playRule(p, R, 1, T + 3_600_000), { ok: true, kind: 'f_tv', heart: false, mon: FROG, bond: 1 });
  assert.equal(heartReady(p, 'f_tv', T), false);
  assert.equal(heartReady(p, 'f_game', T), true);
  assert.equal(playRule(p, R, 2, T).heart, true, '게임기는 따로');
  assert.equal(p.homePlay.bond[FROG], 2);
  assert.equal(playRule(p, R, 1, T + DAY).heart, true, '다음 날 다시');
  assert.equal(p.homePlay.bond[FROG], 3);
  assert.equal(playRule(p, R, 1, T).heart, false, '시계를 어제로 되돌려도');
  assert.equal(playRule(p, R, 2, T - DAY).heart, false, '게임기도 지난날로는 안 받는다');
  assert.equal(p.homePlay.days.f_tv, dayNum(T + DAY), '기록은 늘 큰 쪽');
  assert.equal(econ(p), before, '경제와 집·캐릭터는 그대로');
  // 🔍 Codex 91차 #1: 먼 앞날(DAY_MAX 넘음 — 깨진 시계)엔 주지 않는다 — 적을 때만 줄이면 같은 날 계속 받았다
  const far = 3_000_002 * DAY;
  const z = pf([TV]);
  assert.ok(dayNum(far) > 3e6);
  assert.deepEqual([playRule(z, R, 1, far).heart, playRule(z, R, 1, far).heart, heartReady(z, 'f_tv', far)], [false, false, false]);
  assert.equal(z.homePlay, undefined);
  const q = pf([TV], { homePlay: { days: { f_tv: 3e6 }, bond: {} } });
  assert.equal(playRule(q, R, 1, T).heart, false, '깨진 먼 앞날 기록이 있으면 안 준다(늘지 않는 쪽)');
});

test('💗 진화한 파트너가 놀면 진화 전 💗에 이어서 +1 — 지금 모습에 적고 옛 칸은 그대로(늘기만)', () => {
  const p = pf([TV], { homePlay: { days: {}, bond: { 656: 2 } } });
  assert.equal(playRule(p, R, 1, T).bond, 3);
  assert.deepEqual(p.homePlay.bond, { 656: 2, [FROG]: 3 });
  const full = pf([TV], { homePlay: { days: {}, bond: { [FROG]: BOND_MAX } } });
  assert.equal(playRule(full, R, 1, T).bond, BOND_MAX, '끝을 넘지 않는다');
});

test('🚶 놀 칸: 기기 왼쪽 → 오른쪽 → 앞줄 → 가장 가까운 빈 칸 · 🤝 파트너도 옆에 설 칸 먼저 · 2칸 피아노 · 벽 가구·없는 가구는 null', () => {
  assert.deepEqual(playSpot(pf([TV]), R, 1), { me: { room: R, x: 2, y: 2 }, pal: { room: R, x: 1, y: 2 } }, '왼쪽 · 파트너는 그 왼쪽(오른쪽은 TV)');
  const leftBlocked = [TV, { u: 2, id: 'f_teddy', x: 2, y: 2 }];
  assert.deepEqual(playSpot(pf(leftBlocked), R, 1), { me: { room: R, x: 4, y: 2 }, pal: { room: R, x: 5, y: 2 } });
  // 왼쪽은 비었지만 파트너가 설 데가 없으면(양옆이 막힘) 오른쪽 — 파트너가 없으면 왼쪽
  const squeeze = [TV, { u: 2, id: 'f_teddy', x: 1, y: 2 }];
  assert.deepEqual(playSpot(pf(squeeze), R, 1).me, { room: R, x: 4, y: 2 });
  assert.deepEqual(playSpot(pf(squeeze, { partner: null }), R, 1), { me: { room: R, x: 2, y: 2 }, pal: null });
  const front = [TV, { u: 2, id: 'f_teddy', x: 2, y: 2 }, { u: 3, id: 'f_books', x: 4, y: 2 }];
  assert.deepEqual(playSpot(pf(front), R, 1), { me: { room: R, x: 3, y: 3 }, pal: { room: R, x: 4, y: 3 } }, '양옆이 막히면 앞줄');
  const piano = [{ u: 4, id: 'f_piano', x: 0, y: 4 }];
  assert.deepEqual(playSpot(pf(piano), R, 4).me, { room: R, x: 2, y: 4 }, '왼쪽은 방 밖 — 2칸 피아노의 오른쪽');
  assert.equal(playSpot(pf([{ u: 5, id: 'f_clock', x: 1, y: 0 }]), R, 5), null, '벽 가구');
  assert.equal(playSpot(pf([TV]), R, 99), null);
});

// ───────────────────── 장면 말·그림 ─────────────────────

test('💬 장면 말: "몇 번 남음" 같은 셈 없음 · 받침 조사 · 이름표가 비면 나/내가 · 파트너가 없으면 혼자 + 도움말 · 📰 소식은 날마다 · 💻 진화 줄', () => {
  const all = [];
  for (const scene of ['tv', 'game', 'pc', 'piano']) {
    for (const ctx of [{ mon: '개굴닌자', name: '', heart: true, lv: 12, chain: ['개구마르', '개굴반장', '개굴닌자'] }, { mon: '', name: '개굴대장', heart: false }]) {
      for (let day = 0; day < 6; day++) {
        const L = playLines(scene, ctx, day);
        assert.ok(L.start.length >= 1, scene);
        all.push(...L.start, L.end, L.tip);
      }
    }
  }
  for (const line of all) assert.doesNotMatch(line, /\d+\s*(번|회|개)\b|남음|남았|밀린|더 하면/, line);
  assert.equal(playLines('tv', { mon: '개굴닌자', heart: true }).end, '💗 개굴닌자와 더 친해졌어요');
  assert.equal(playLines('tv', { mon: '피카츄', heart: false }).end, '📺 피카츄와 TV를 봤어요');
  assert.equal(playLines('piano', { mon: '', heart: true }).end, '🎹 피아노를 쳤어요', '파트너가 없으면 💗 말 없음');
  assert.match(playLines('tv', { mon: '개굴닌자', name: '' }, 0).start[0], /나와 함께/);
  assert.match(playLines('tv', { mon: '', name: '' }, 0).start[0], /내가 TV를/);
  assert.match(playLines('tv', { mon: '개굴닌자', name: '번개' }, 0).start[0], /번개와 함께/);
  assert.match(playLines('tv', { mon: '개굴닌자', name: '지환' }, 0).start[0], /지환과 함께/);
  assert.deepEqual(whoOf('Ash'), { subj: 'Ash가', with: 'Ash와', of: 'Ash의', bare: 'Ash' });
  assert.notEqual(playLines('tv', { mon: '개굴닌자' }, 0).start[0], playLines('tv', { mon: '개굴닌자' }, 1).start[0], '소식은 날마다 바뀐다');
  assert.match(playLines('tv', { mon: '' }).tip, /파트너로!/);
  assert.equal(playLines('tv', { mon: '개굴닌자' }).tip, '');
  assert.ok(playLines('pc', { mon: '개굴닌자', lv: 12, chain: ['개구마르', '개굴반장', '개굴닌자'] }).start.includes('🧬 개구마르 → 개굴반장 → 개굴닌자'));
  assert.ok(!playLines('pc', { mon: '이브이', chain: ['이브이'] }).start.some((x) => x.startsWith('🧬')), '한 모습뿐이면 진화 줄 없음');
});

test('🖼️ 장면 그림: 장면마다 기기 그림 · 🎹 그림 건반 여덟이 단추와 이어짐 · 이름·포켓몬 이름은 글자로만(태그 못 넣음) · 위험한 그림 주소는 안 그림', () => {
  const o = { look: LOOK_BASE, name: '<b>나</b>', mon: { ko: '<img src=x onerror=alert(1)>', url: 'javascript:alert(1)' }, wall: 'red;}', floor: '#e2c79f', lv: 3, bond: 2 };
  for (const scene of ['tv', 'game', 'pc', 'piano']) {
    const h = stageHtml(scene, { ...o, uid: `t${scene}` });
    assert.ok(h.includes(`pshow-stage is-${scene}`), scene);
    assert.ok(h.includes(`pv-${scene}`), scene);
    assert.ok(!h.includes('<img src=x') && !h.includes('<b>나') && !h.includes('javascript:'), scene);
    assert.ok(!h.includes('red;}'), '벽 색은 # 색만');
    assert.equal((h.match(/class="pshow-pal"/g) || []).length, 1);
  }
  // 그림 주소가 멀쩡해도 포켓몬 이름은 글자로만 (그림 대신 🐾로 가는 길만 보면 놓친다 — 변이 검사)
  const withImg = stageHtml('tv', { look: LOOK_BASE, mon: { ko: '<img src=x onerror=alert(1)>', url: 'https://x/a.png' } });
  assert.ok(withImg.includes('class="pshow-pal-img" src="https://x/a.png"') && !withImg.includes('<img src=x'));
  const noPal = stageHtml('tv', { look: LOOK_BASE, mon: null });
  assert.ok(!noPal.includes('pshow-pal'), '파트너가 없으면 그리지 않는다');
  assert.equal((pianoSvg().match(/pv-k\d/g) || []).length, 8);
  assert.ok(gameSvg('', 'g').includes('pv-score') && gameSvg('', 'g').includes('CLEAR!'));
  assert.ok(tvSvg('https://x/a"b.png', 'q').includes('&quot;'), '따옴표는 글자로');
  assert.ok(!tvSvg('', 'q').includes('<image'), '그림이 없으면 몬스터볼');
  assert.ok(pcSvg('', { name: '피카츄', lv: 5, bond: 1 }).includes('⭐ Lv 5'));
  assert.ok(stageHtml('tv', { look: LOOK_BASE, uid: 'a"b' }).includes('pv-tvclip-ab'), 'uid는 글자·숫자만');
});

// ───────────────────── 프로필 복사·병합 ─────────────────────

test('💾 프로필 복사·백업 병합: 놀이 기록은 깊은 복사 · 병합은 칸마다 큰 쪽(옛 백업이 날을 되돌려 또 받지 않게) · 없으면 키도 없음', () => {
  const orig = { ...emptyProfile(), homePlay: { days: { f_tv: 10 }, bond: { 658: 2 } } };
  const c = cloneProfile(orig);
  c.homePlay.bond[658] = 9;
  assert.equal(orig.homePlay.bond[658], 2);
  const dev = { ...emptyProfile(), homePlay: { days: { f_tv: 12 }, bond: { 658: 2 } }, updatedAt: 20 };
  const bak = { ...emptyProfile(), homePlay: { days: { f_tv: 10, f_pc: 3 }, bond: { 658: 1, 25: 4 } }, updatedAt: 10 };
  assert.deepEqual(mergeStatRecord('profile', dev, bak).homePlay, { days: { f_tv: 12, f_pc: 3 }, bond: { 658: 2, 25: 4 } });
  assert.deepEqual(mergeStatRecord('profile', bak, dev).homePlay, { days: { f_tv: 12, f_pc: 3 }, bond: { 658: 2, 25: 4 } }, '어느 쪽이 나중이어도');
  const none = mergeStatRecord('profile', { ...emptyProfile(), updatedAt: 1 }, { ...emptyProfile(), updatedAt: 2 });
  assert.equal('homePlay' in none, false);
});

// ───────────────────── 진짜 저장 경로 (fakeidb) ─────────────────────

const stored = () => fakeIdb.get('profile', 'me');
async function seed(extra) {
  await flushProfile();
  const cur = stored() || emptyProfile();
  const next = { ...cur, ...pf([TV, { u: 2, id: 'f_game', x: 5, y: 0 }]), ...extra, updatedAt: (cur.updatedAt || 0) + 1 };
  if (!('homePlay' in extra)) delete next.homePlay;
  fakeIdb.put('profile', next);
  await reloadProfile();
}

test('★ 🎮 저장 경로: 💗가 저장된 프로필에 · 두 창이 같은 기기로 동시에 놀아도 💗 한 번 · 저장이 실패하면 없던 일', async () => {
  await initProfile();
  await seed({});
  const rs = await Promise.all([homePlay(R, 1), homePlay(R, 1)]);
  assert.deepEqual(rs.map((r) => r.heart).sort(), [false, true]);
  assert.ok(rs.every((r) => r.ok && r.kind === 'f_tv'));
  assert.equal(stored().homePlay.bond[FROG], 1);
  assert.equal(getProfileSnapshot().homePlay.bond[FROG], 1, '창의 프로필도');
  const s0 = stored();
  fakeIdb.failNext('profile');
  assert.deepEqual(await homePlay(R, 2), { ok: false, why: 'save' });
  assert.deepEqual(stored().homePlay, s0.homePlay);
  assert.equal(getProfileSnapshot().homePlay.days.f_game, undefined, '메모리로 성공한 척하지 않는다');
  assert.equal((await homePlay(R, 2)).heart, true, '다시 하면 받는다');
  assert.deepEqual([stored().coins, stored().items.f_tv], [500, 1], '경제는 그대로');
});
