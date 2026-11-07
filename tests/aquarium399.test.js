// 🐠 v399 진우 아쿠아리움 — 규칙(aquarium.js) · 저장 트랜잭션 · 병합
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  TANKS, TOP_TIER, DECO, DECO_GROUPS, tierItem, decoOf, tierOf, decoCount, aquaOf, copyAqua, mergeAqua,
  aquaTierRule, aquaBuyRule, aquaPutRule, aquaTakeRule, aquaSlotRule, aquaFishRows, aquaPhoto, aquaLine,
} from '../js/aquarium.js';
import { SPECIES } from '../js/fishing.js';
import { initProfile, flushProfile, getProfileSnapshot, aquaUpTier, aquaBuy, aquaPut, aquaTake, aquaSlot, gainCoins } from '../js/xp.js';
import { mergeStatRecord } from '../js/db.js';
import { EDGE_L, EDGE_R, slotsOf, artReady, lookReady } from '../js/aquaart.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const NOW = new Date(2026, 10, 7, 12).getTime();
const dex = (o) => ({ dex: Object.fromEntries(Object.entries(o).map(([k, n]) => [k, { n, best: 20, d: '2026-11-01' }])) });
const prof = (more = {}) => ({ coins: 0, items: {}, fishing: dex({ bungeo: 2, ingeo: 1, chamdom: 3, bass: 1, megi: 1, galchi: 1, godeung: 1 }), ...more });

test('여덟 단계 — 차례·재질·마리·값이 기본안 그대로', () => {
  assert.deepEqual(TANKS.map((t) => t.short), ['폐가', '일반', '철', '에메랄드', '금', '다이아몬드', '초특급', '우주']);
  assert.deepEqual(TANKS.map((t) => t.fish), [5, 8, 12, 16, 20, 24, 28, 32]);
  assert.deepEqual(TANKS.map((t) => t.deco), [3, 5, 7, 9, 11, 13, 15, 18]);
  assert.deepEqual(TANKS.map((t) => t.price), [0, 500, 1000, 2000, 3500, 5000, 7500, 10000]);
  assert.equal(TANKS.reduce((n, t) => n + t.price, 0), 29500);
  assert.deepEqual(TANKS.map((t) => t.n), [1, 2, 3, 4, 5, 6, 7, 8]);
  TANKS.forEach((t, i) => { if (i) assert.ok(t.size > TANKS[i - 1].size, '단계가 오르면 수조가 커진다'); });
});

test('가게 — 20종 · 값 표 그대로 · 묶음이 다 있고 id가 겹치지 않음', () => {
  assert.equal(DECO.length, 20);
  assert.equal(new Set(DECO.map((d) => d.id)).size, 20);
  const price = Object.fromEntries(DECO.map((d) => [d.ko, d.price]));
  assert.deepEqual(price, { 해초: 50, 다시마: 80, '붉은 산호': 120, '분홍 산호': 120, '파란 산호': 150, 말미잘: 150, '둥근 돌': 60, 불가사리: 80, 조개: 100, 항아리: 150, 닻: 200, '바위 아치': 200, '보물 상자': 500, '잠수부 인형': 600, 등대: 800, '유적 기둥': 800, 침몰선: 1500, '바닷속 성': 2000, '달 바위': 500, '작은 로켓': 2000 });
  const groups = DECO_GROUPS.map(([g]) => g);
  DECO.forEach((d) => { assert.ok(groups.includes(d.group), d.id); assert.ok(d.max >= 1, d.id); });
  DECO_GROUPS.forEach(([g]) => assert.ok(DECO.some((d) => d.group === g), g));
  assert.equal(decoOf('__proto__'), null);
  assert.equal(decoOf('constructor'), null);
});

test('단계 올리기 — 💰만큼 빠지고 한 칸씩 · 모자라면 그대로 · 맨 위에서 멈춤', () => {
  const p = prof({ coins: 499 });
  assert.equal(tierOf(p), 1);
  assert.deepEqual(aquaTierRule(p), { ok: false, why: 'short' });
  assert.equal(p.coins, 499);
  assert.deepEqual(p.items, {});
  p.coins = 500;
  assert.deepEqual(aquaTierRule(p), { ok: true, tier: 2 });
  assert.equal(p.coins, 0);
  assert.equal(p.items[tierItem(2)], 1);
  assert.equal(tierOf(p), 2);
  p.coins = 1e6;
  for (let n = 3; n <= TOP_TIER; n++) assert.deepEqual(aquaTierRule(p), { ok: true, tier: n });
  assert.equal(p.coins, 1e6 - 1000 - 2000 - 3500 - 5000 - 7500 - 10000);
  const left = p.coins;
  assert.deepEqual(aquaTierRule(p), { ok: false, why: 'top' });
  assert.equal(p.coins, left);
});

test('단계 올리기 — 다른 창이 먼저 올렸으면 보여 주지 않은 값으로 사지 않음', () => {
  const p = prof({ coins: 5000 });
  assert.deepEqual(aquaTierRule(p, 2), { ok: true, tier: 2 });
  assert.deepEqual(aquaTierRule(p, 2), { ok: false, why: 'changed' }); // 옛 창이 2단계 단추를 또 누름
  assert.equal(p.coins, 4500);
  assert.equal(tierOf(p), 2);
  assert.deepEqual(aquaTierRule(p, 3), { ok: true, tier: 3 });
  assert.deepEqual(aquaTierRule(p, 9), { ok: false, why: 'changed' });
});

test('단계 — 가방 표시가 끊기면 끊긴 앞까지 · 깨진 값은 없는 것으로', () => {
  assert.equal(tierOf({ items: { aq_t2: 1, aq_t4: 1 } }), 2);
  assert.equal(tierOf({ items: { aq_t3: 1 } }), 1);
  assert.equal(tierOf({ items: { aq_t2: 'x' } }), 1);
  assert.equal(tierOf({ items: null }), 1);
  assert.equal(tierOf(null), 1);
});

test('장식 사기 — 값만큼 빠지고 개수가 쌓임 · 상한에서 멈춤 · 모르는 것은 안 팖', () => {
  const p = prof({ coins: 100 });
  assert.deepEqual(aquaBuyRule(p, 'aq_weed'), { ok: true, have: 1 });
  assert.equal(p.coins, 50);
  assert.deepEqual(aquaBuyRule(p, 'aq_weed'), { ok: true, have: 2 });
  assert.equal(p.coins, 0);
  assert.deepEqual(aquaBuyRule(p, 'aq_weed'), { ok: false, why: 'short' });
  assert.equal(decoCount(p, 'aq_weed'), 2);
  p.coins = 5000;
  assert.deepEqual(aquaBuyRule(p, 'aq_wreck'), { ok: true, have: 1 });
  assert.deepEqual(aquaBuyRule(p, 'aq_wreck'), { ok: false, why: 'max' });
  assert.equal(p.coins, 3500);
  assert.deepEqual(aquaBuyRule(p, 'aq_none'), { ok: false, why: 'unknown' });
  assert.deepEqual(aquaBuyRule(p, 'coins'), { ok: false, why: 'unknown' });
  assert.equal(p.coins, 3500);
});

test('물고기 넣기 — 도감 종만 · 낚은 수만큼 · 자리까지 · 도감은 안 줄어듦', () => {
  const p = prof();
  assert.equal(aquaPutRule(p, 'bungeo', NOW).ok, true);
  assert.equal(aquaPutRule(p, 'bungeo', NOW).ok, true);
  assert.deepEqual(aquaPutRule(p, 'bungeo', NOW), { ok: false, why: 'none' }); // 2마리 낚음
  assert.deepEqual(aquaPutRule(p, 'pirami', NOW), { ok: false, why: 'none' }); // 안 낚음
  assert.deepEqual(aquaPutRule(p, 'nothing', NOW), { ok: false, why: 'bad' });
  assert.equal(aquaPutRule(p, 'chamdom', NOW).ok, true);
  assert.equal(aquaPutRule(p, 'chamdom', NOW).ok, true);
  assert.equal(aquaPutRule(p, 'chamdom', NOW).ok, true);
  assert.equal(aquaOf(p).fish.length, 5);
  assert.deepEqual(aquaPutRule(p, 'ingeo', NOW), { ok: false, why: 'full' }); // 1단계 다섯
  assert.equal(p.fishing.dex.bungeo.n, 2);
  p.items = { aq_t2: 1 };
  assert.equal(aquaPutRule(p, 'ingeo', NOW).ok, true); // 단계가 오르면 자리가 는다
});

test('📸 어름치는 수조에 안 들어가고 벽 액자로', () => {
  const sp = SPECIES.filter((s) => s.photo);
  assert.deepEqual(sp.map((s) => s.key), ['eoreumchi']);
  const p = prof({ fishing: dex({ eoreumchi: 2, bungeo: 1 }) });
  assert.deepEqual(aquaPutRule(p, 'eoreumchi', NOW), { ok: false, why: 'photo' });
  assert.equal(aquaPhoto(p), true);
  assert.equal(aquaPhoto(prof()), false);
  p.aquarium = { fish: ['eoreumchi', 'bungeo'], deco: [], at: 1 };
  assert.deepEqual(aquaOf(p).fish, ['bungeo']); // 저장값에 있어도 읽을 때 뺀다
});

test('물고기 빼기 — 같은 종은 한 마리만 · 없으면 그대로', () => {
  const p = prof();
  ['bungeo', 'ingeo', 'bungeo'].forEach((k) => aquaPutRule(p, k, NOW));
  assert.equal(aquaTakeRule(p, 'bungeo', NOW).ok, true);
  assert.deepEqual(aquaOf(p).fish, ['bungeo', 'ingeo']);
  assert.deepEqual(aquaTakeRule(p, 'megi', NOW), { ok: false, why: 'none' });
});

test('장식 놓기 — 칸 범위 · 가진 수만큼 · 빼도 가방에 남음 · 같은 칸에 다시 놓기', () => {
  const p = prof({ items: { aq_weed: 1, aq_jar: 2 } });
  assert.equal(aquaSlotRule(p, 0, 'aq_weed', NOW).ok, true);
  assert.deepEqual(aquaSlotRule(p, 1, 'aq_weed', NOW), { ok: false, why: 'used' }); // 하나뿐
  assert.equal(aquaSlotRule(p, 0, 'aq_weed', NOW).ok, true); // 같은 칸에는 또 놓아도 된다
  assert.equal(aquaSlotRule(p, 1, 'aq_jar', NOW).ok, true);
  assert.equal(aquaSlotRule(p, 2, 'aq_jar', NOW).ok, true);
  assert.deepEqual(aquaOf(p).deco, ['aq_weed', 'aq_jar', 'aq_jar']);
  assert.deepEqual(aquaSlotRule(p, 3, 'aq_jar', NOW), { ok: false, why: 'bad' }); // 1단계는 셋
  assert.deepEqual(aquaSlotRule(p, -1, 'aq_jar', NOW), { ok: false, why: 'bad' });
  assert.deepEqual(aquaSlotRule(p, 1.5, 'aq_jar', NOW), { ok: false, why: 'bad' });
  assert.deepEqual(aquaSlotRule(p, 0, 'aq_none', NOW), { ok: false, why: 'bad' });
  assert.equal(aquaSlotRule(p, 0, '', NOW).ok, true);
  assert.deepEqual(aquaOf(p).deco, ['', 'aq_jar', 'aq_jar']);
  assert.equal(decoCount(p, 'aq_weed'), 1);
});

test('고쳐 읽기 — 깨진 저장값 · 안 가진 것 · 넘친 칸이 빠짐', () => {
  const a = aquaOf({ coins: 0, items: {}, aquarium: 'broken', fishing: 'x' });
  assert.deepEqual([a.tier, a.fish, a.deco], [1, [], ['', '', '']]);
  const p = prof({ items: { aq_weed: 1 }, aquarium: { fish: ['bungeo', 'bungeo', 'bungeo', 7, 'none', 'ingeo'], deco: ['aq_weed', 'aq_weed', 'aq_wreck', 'aq_weed', 'aq_weed'], at: 'x' } });
  const r = aquaOf(p);
  assert.deepEqual(r.fish, ['bungeo', 'bungeo', 'ingeo']);
  assert.deepEqual(r.deco, ['aq_weed', '', '']);
  assert.equal(r.at, 0);
  const big = copyAqua({ fish: Array(500).fill('bungeo'), deco: Array(500).fill('aq_weed'), at: 3 });
  assert.equal(big.fish.length, 64);
  assert.equal(big.deco.length, 64);
  const over = prof({ fishing: dex({ bungeo: 9 }), aquarium: { fish: Array(9).fill('bungeo'), deco: [], at: 1 } });
  assert.equal(aquaOf(over).fish.length, 5, '자리 넘친 저장값은 읽을 때 자른다');
});

test('바꾼 시각 — 시계가 뒤로 가도 늘 앞으로 · 병합은 늦은 쪽', () => {
  const p = prof({ aquarium: { fish: [], deco: [], at: NOW + 5000 } });
  aquaPutRule(p, 'bungeo', NOW);
  assert.equal(p.aquarium.at, NOW + 5001);
  const a = { fish: ['bungeo'], deco: [], at: 10 };
  const b = { fish: ['ingeo'], deco: [], at: 20 };
  assert.deepEqual(mergeAqua(a, b).fish, ['ingeo']);
  assert.deepEqual(mergeAqua(b, a).fish, ['ingeo']);
  assert.deepEqual(mergeAqua(a, { ...b, at: 10 }).fish, ['bungeo']); // 같으면 앞쪽
  assert.deepEqual(mergeAqua(null, b).fish, ['ingeo']);
  assert.deepEqual(mergeAqua(a, 'x').fish, ['bungeo']);
  assert.equal(mergeAqua(null, 'x'), null);
});

test('고르는 칸 — 낚은 종만 · 넣은 수 · 사진 표시', () => {
  const p = prof({ fishing: dex({ bungeo: 2, eoreumchi: 1 }) });
  aquaPutRule(p, 'bungeo', NOW);
  const rows = aquaFishRows(p);
  assert.deepEqual(rows.map((r) => [r.key, r.n, r.put, !!r.photo]), [['bungeo', 2, 1, false], ['eoreumchi', 1, 0, true]]);
});

test('📤 한 줄', () => {
  const p = prof({ items: { aq_t2: 1, aq_weed: 1 } });
  aquaPutRule(p, 'bungeo', NOW);
  aquaSlotRule(p, 0, 'aq_weed', NOW);
  assert.equal(aquaLine(p), '🐠 아쿠아리움 2단계 일반 · 물고기 1 · 장식 1');
});

test('아이 화면 글 — 남은 수·모자란 수를 말하지 않음', () => {
  const v = read('js/aquaview.js');
  assert.ok(!/남은|모자란 \$|더 모으|\$\{[^}]*short/.test(v.replace(/\/\/.*$/gm, '')), '셈 문구 없음');
});

test('창 목록 — 다른 창이 수조 위로 안 뜨고 사용 시간에 들어감', () => {
  for (const f of ['js/hatch.js', 'js/parcel.js', 'js/korbattleview.js', 'js/usage.js']) assert.ok(read(f).includes("'aq-tank'"), f);
  assert.ok(read('sw.js').includes('./js/aquarium.js'));
  assert.ok(read('sw.js').includes('./js/aquaart.js'));
  assert.ok(read('sw.js').includes('./js/aquaview.js'));
});

test('그림 표 — 단계마다 빛·겹·틀이 있고 장식마다 그림이 있음', () => {
  TANKS.forEach((t) => assert.ok(lookReady(t.key), t.key));
  DECO.forEach((d) => assert.ok(artReady(d.art), d.id));
  assert.equal(artReady('nothing'), false);
});

test('장식 칸 — 단계마다 칸 수 그대로 · 큰 칸 하나와 작은 칸 둘이 어긋남 · 뒤로 갈수록 바닥이 높음', () => {
  TANKS.forEach((t) => {
    const q = slotsOf(t);
    assert.equal(q.length, t.deco, t.key);
    assert.equal(new Set(q.map((v) => `${v.u}|${v.d}`)).size, q.length, `${t.key} 겹친 칸`);
    assert.deepEqual(q.slice(0, 3).map((v) => v.big), [true, false, false], t.key);
    const [a, b, c] = q;
    assert.ok(a.d !== b.d && b.d !== c.d && a.d !== c.d, `${t.key} 앞뒤가 다름`);
    assert.notEqual(Math.round((b.u - a.u) * 100), Math.round((c.u - b.u) * 100), `${t.key} 간격이 다름`);
    q.forEach((v) => assert.ok(v.u > 0 && v.u < 1 && v.d >= 0 && v.d <= 1, t.key));
  });
});

test('앞 겹 — 가장자리에만(왼쪽 17% · 오른쪽 13%) · 가운데를 지움 · 장면마다 방을 안 그림', () => {
  assert.equal(EDGE_L, 0.17);
  assert.equal(EDGE_R, 0.13);
  const art = read('js/aquaart.js');
  assert.match(art, /c\.clearRect\(lw, 0, iw - lw - rw, ih\);/);
  const draw = art.slice(art.indexOf('export function drawScene'), art.indexOf('const slotR'));
  assert.ok(!/paintRoom|drawFrame|drawFish|createLinearGradient|createRadialGradient/.test(draw), '장면마다 무거운 그리기 없음');
  assert.ok(!/document\.createElement/.test(draw));
  assert.match(art, /drawFish\(c, key, cv\.width \/ 2, cv\.height \/ 2, L \* SC, \{ wag \}\);/); // 앱 그림을 한 번 찍어 둔다
});

test('🔌 잇기 — 홈 단추 · 낚시터 단추(시계 멈춤) · 상점 단추 · 보상 기록 · 저장 복사', () => {
  const fv = read('js/fishview.js');
  assert.match(fv, /class="lk-topbtn lk-aqbtn"/);
  const lake = fv.slice(fv.indexOf('function lakeAqua()'), fv.indexOf('export function closeShop()'));
  assert.match(lake, /if \(!canMenu\(\)/, '던지기 전에만');
  assert.match(lake, /ui\.paused = true;/, '보는 동안 낚시 시계 멈춤');
  assert.match(lake, /ui\.paused = false;/, '닫으면 되돌림');
  assert.match(lake, /ui\.covered = true;/, '덮인 동안 낚시터를 안 그림');
  assert.match(lake, /ui\.covered = false;/, '닫으면 다시 그림');
  assert.match(fv, /if \(document\.hidden \|\| ui\.covered\)/);
  const lv = read('js/lakeview.js');
  assert.match(lv, /'lk-home-aq'/);
  assert.match(lv, /if \(caught\) \{\n    const aq =/, '낚은 뒤에만 · 낚시가 끝난 날에도');
  assert.match(lv, /aqua: \(done\) =>/);
  assert.match(read('js/shop.js'), /m\.openAqua\(\{ tab: 'shop' \}\)/);
  assert.match(read('js/rewardlog.js'), /aquaLine\(pf\)/);
  assert.match(read('js/xp.js'), /aquarium: copyAqua\(p\.aquarium\)/);
  assert.match(read('js/db.js'), /aquarium: copyAqua\(cur\.aquarium\)/);
  const view = read('js/aquaview.js');
  assert.match(view, /root\.id = 'aq-tank';/);
  assert.match(view, /ui\.scene = null;/, '닫으면 그림을 놓는다');
  assert.match(view, /aquaUpTier\(next\.n\)/, '보여 준 단계를 넘긴다');
  assert.match(view, /if \(gen !== ui\.gen\) \{ render\(\); return; \}/, '닫았다 다시 열면 새 상태로');
  assert.match(view, /document\.hidden/, '안 보이면 안 그린다');
});

before(async () => { console.warn = () => {}; await initProfile(); });

test('저장 — 가방·💰·자리가 한 트랜잭션으로 · 모자라면 안 바뀜', async () => {
  const c0 = getProfileSnapshot().coins || 0;
  assert.equal((await aquaUpTier()).why, 'short');
  await gainCoins(700);
  await flushProfile();
  const r = await aquaUpTier();
  assert.equal(r.ok, true);
  assert.equal(r.tier, 2);
  assert.equal(getProfileSnapshot().coins, c0 + 200);
  assert.equal(tierOf(getProfileSnapshot()), 2);
  assert.equal((await aquaBuy('aq_weed')).ok, true);
  assert.equal(getProfileSnapshot().coins, c0 + 150);
  assert.equal((await aquaSlot(0, 'aq_weed')).ok, true);
  assert.deepEqual(aquaOf(getProfileSnapshot()).deco[0], 'aq_weed');
  assert.equal((await aquaPut('bungeo')).why, 'none'); // 아직 안 낚음
  assert.equal((await aquaTake('bungeo')).why, 'none');
});

test('저장 실패 — 💰와 가방이 그대로 · 메모리도 그대로', async () => {
  await gainCoins(300);
  await flushProfile();
  const c0 = getProfileSnapshot().coins;
  const n0 = decoCount(getProfileSnapshot(), 'aq_stone');
  fakeIdb.failNext('profile');
  const r = await aquaBuy('aq_stone');
  assert.equal(r.ok, false);
  assert.equal(r.why, 'save');
  assert.equal(getProfileSnapshot().coins, c0);
  assert.equal(decoCount(getProfileSnapshot(), 'aq_stone'), n0);
  const stored = fakeIdb.get('profile', 'me');
  assert.equal(stored.coins, c0);
  assert.equal(decoCount(stored, 'aq_stone'), n0);
});

test('병합 — 프로필을 합쳐도 자리는 늦은 쪽 · 돈과 물건은 같은 쪽', () => {
  const older = { updatedAt: 100, coins: 900, items: {}, aquarium: { fish: [], deco: ['aq_weed'], at: 5 } };
  const later = { updatedAt: 200, coins: 400, items: { aq_t2: 1 }, aquarium: { fish: [], deco: [], at: 3 } };
  const out = mergeStatRecord('profile', older, later);
  assert.equal(out.coins, 400);
  assert.equal(tierOf(out), 2);
  assert.deepEqual(out.aquarium.deco, ['aq_weed']); // 바꾼 시각이 늦은 쪽
});
