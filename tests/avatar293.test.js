// 🧢 v293 캐릭터를 포켓몬 주인공(지우)처럼 — 2026-10-18 아버님: 지우 느낌 · 처음부터 무료 · 진우가 직접 입게 ·
// "모자 앞 무늬는 만화에 있는 것 중 하나로 · 여러 무늬를 만들어 다른 무늬의 모자도 살 수 있게"
// 트레이너 모자·조끼·손가락 장갑·배낭(무료) · 🧤 장갑 칸 · [🧢 한 번에 입기] · 지우 모자 무늬는 비공개 저장소에서 받아 이 기기에만(hatmarks.js)
// node --test tests/avatar293.test.js
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); }, removeItem: (k) => { mem.delete(k); } };
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { WEAR, SLOTS, HAIRS, LOOK_BASE, OUTFITS, wearById, lookOf, outfitPatch, wearingOutfit, outfitRule, avatarLookRule, avatarOf } from '../js/avatar.js';
import { avatarSvg, hatMarksOf, setHatMarks, hasHatMark } from '../js/avatarart.js';
import { MARKS_PATH, syncHatMarks, loadHatMarks, SYNC_MS } from '../js/hatmarks.js';
import { closetOf, WEAR_VERB, OFF_VERB } from '../js/avatarview.js';
import { PRIVATE_HATMARKS, readSummary } from '../js/upload.js';
import { FIRST_ROOM } from '../js/house.js';
import { emptyProfile, cloneProfile } from '../js/db.js';

const R = FIRST_ROOM;
const T = 1_700_000_000_000;
const pf = (items = {}, avatar) => cloneProfile({ ...emptyProfile(), coins: 0, items: { ...items }, house: { started: true, seq: 9, rooms: [{ id: R, wall: '', floor: '', items: [] }] }, ...(avatar ? { avatar } : {}) });
const made = (look = {}) => ({ made: true, gifted: true, look: { ...LOOK_BASE, ...look }, name: '', spot: { room: R, x: 1, y: 1 }, at: T });
const src = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const KANTO = { id: 'kanto', shapes: [{ t: 'path', d: 'M2 2 L8 2 L8 12 Z', fill: '#22a06b' }, { t: 'circle', cx: 14, cy: 8, r: 3, fill: '#ffffff', stroke: '#22a06b', sw: 1 }] };

test('🧢 트레이너 차림 넷은 처음부터 무료 · 가게에 없다 · 🧤 장갑 칸(비울 수 있음) · 한 벌은 트레이너 차림', () => {
  for (const id of ['a_hat_trainer', 'a_top_trainer', 'a_glove_green', 'a_bag_trainer']) {
    const w = wearById(id);
    assert.ok(w && w.free && !w.price && !w.stones, id);
  }
  assert.ok(SLOTS.includes('gloves'));
  assert.equal(LOOK_BASE.gloves, '', '처음엔 장갑 없음');
  assert.equal(lookOf({ gloves: 'a_glove_green' }).gloves, 'a_glove_green');
  assert.equal(lookOf({ gloves: 'a_hat_cap' }).gloves, '', '다른 칸 옷은 장갑 칸에 못 낀다');
  assert.deepEqual(closetOf(pf(), 'gloves'), ['', 'a_glove_green']);
  assert.equal(WEAR_VERB.gloves, '꼈어요');
  assert.equal(OFF_VERB.gloves, '벗었어요');
  assert.equal(wearById('a_hat_trainer').art.kind, 'ash');
  assert.equal(OUTFITS.length, 1);
  assert.deepEqual([OUTFITS[0].id, OUTFITS[0].ko], ['trainer', '트레이너 차림']);
});

test('🧢 지우 모자 일곱 — 관동 모자는 처음부터(트레이너 차림) · 호연·신오·하나·칼로스·알로라·월드는 👕 가게에서 💰600 · 무늬 이름은 모두 다르다 · 색은 #rrggbb', () => {
  const hats = WEAR.filter((w) => w.art.kind === 'ash');
  assert.deepEqual(hats.map((w) => [w.ko, w.free ? 0 : w.price]), [['관동 모자', 0], ['호연 모자', 600], ['신오 모자', 600], ['하나 모자', 600], ['칼로스 모자', 600], ['알로라 모자', 600], ['월드 모자', 600]]);
  assert.deepEqual(hats.map((w) => w.art.mark), ['kanto', 'hoenn', 'sinnoh', 'unova', 'kalos', 'alola', 'world']);
  for (const w of hats) {
    assert.equal(w.slot, 'hat');
    assert.ok(!w.special && !w.stones, `${w.id} 코인으로만`);
    for (const k of ['color', 'panel', 'bill', 'button', 'billEdge']) if (w.art[k] !== undefined) assert.match(w.art[k], /^#[0-9a-f]{6}$/i, `${w.id}.${k}`);
  }
  assert.equal(OUTFITS[0].wear.hat, 'a_hat_trainer', '트레이너 차림의 모자는 관동 모자');
  // 그림 — 신오는 넓은 검정 앞판 · 칼로스·알로라·월드는 흰 챙 · 알로라는 챙 가장자리 띠 · 앞판이 없는 모자는 앞판을 안 그린다
  const svgOf = (id) => avatarSvg({ hat: id }, { uid: id });
  assert.ok(svgOf('a_hat_sinnoh').includes('M27.5 38 L27.5 26 Q28 18 34 15.6'));
  for (const id of ['a_hat_kalos', 'a_hat_alola', 'a_hat_world']) assert.ok(svgOf(id).includes(`fill="${wearById(id).art.bill}"`), id);
  assert.ok(svgOf('a_hat_alola').includes('stroke="#3a7cc6"'));
  assert.equal(svgOf('a_hat_world').includes('Q32 17.5 50 17'), false, '앞판 없음');
});

test('🧢 한 번에 입기 — 옷만(얼굴 그대로) · 빨간 운동화를 가졌으면 그것, 없으면 기본 신발 · 망토는 벗는다 · 모르는 차림은 null · 입고 나면 "그 차림"', () => {
  const noShoe = outfitPatch(pf(), 'trainer');
  assert.deepEqual(noShoe, { top: 'a_top_trainer', bottom: 'a_bot_jean', shoes: 'a_shoe_basic', gloves: 'a_glove_green', hat: 'a_hat_trainer', bag: 'a_bag_trainer', cape: '' });
  assert.equal(outfitPatch(pf({ a_shoe_run: 1 }), 'trainer').shoes, 'a_shoe_run');
  for (const k of ['skin', 'hair', 'hairColor', 'eyes']) assert.equal(k in noShoe, false, `${k}는 건드리지 않는다`);
  assert.equal(outfitPatch(pf(), 'nope'), null);
  const p = pf({ a_shoe_run: 1, a_cape: 1 }, made({ hair: 'spiky', hairColor: 'gold', cape: 'a_cape', top: 'a_top_red' }));
  assert.equal(wearingOutfit(p, avatarOf(p).look, 'trainer'), false);
  assert.deepEqual(avatarLookRule(p, outfitPatch(p, 'trainer'), T + 5), { ok: true });
  const look = avatarOf(p).look;
  assert.deepEqual([look.hair, look.hairColor, look.cape, look.hat, look.gloves, look.shoes], ['spiky', 'gold', '', 'a_hat_trainer', 'a_glove_green', 'a_shoe_run']);
  assert.equal(wearingOutfit(p, look, 'trainer'), true, '단추가 숨는다');
  assert.equal(wearingOutfit(p, { ...look, gloves: '' }, 'trainer'), false, '하나라도 다르면 다시 보인다');
});

test('🧢 그림 — 조끼는 몸통 양쪽 판·흰 깃·소매도 조끼 색 · 장갑은 낄 때만 · 지우 모자는 무늬가 있을 때만 무늬를 그린다', () => {
  setHatMarks([]);
  const plain = avatarSvg({ top: 'a_top_blue' }, { uid: 'p' });
  const vest = avatarSvg({ top: 'a_top_trainer' }, { uid: 'v' });
  const v = wearById('a_top_trainer').art;
  assert.ok(vest.includes(`fill="${v.ink}"`) && vest.includes(`stroke="${v.trim}"`), '조끼 판·깃');
  assert.equal((vest.match(new RegExp(`<rect x="[\\d.]+" y="67" width="10" height="12" rx="4" fill="${v.ink}"`, 'g')) || []).length, 2, '소매 둘 다 조끼 색');
  assert.equal(plain.includes('y="84" width="10.4"'), false, '장갑이 없으면 안 그린다');
  const gl = avatarSvg({ gloves: 'a_glove_green' }, { uid: 'g' });
  assert.equal((gl.match(/y="84" width="10\.4"/g) || []).length, 2, '두 손');
  const hatNoMark = avatarSvg({ hat: 'a_hat_trainer' }, { uid: 'h' });
  assert.ok(hatNoMark.includes('Q32 17.5 50 17'), '앞판');
  assert.equal(hatNoMark.includes('translate(23 12)'), false, '받은 무늬가 없으면 앞판까지만');
  setHatMarks([KANTO]);
  const hat = avatarSvg({ hat: 'a_hat_trainer' }, { uid: 'm' });
  assert.ok(hat.includes('<g transform="translate(23 12)"><path d="M2 2 L8 2 L8 12 Z" fill="#22a06b"/>'), hat);
  for (const s of [plain, vest, gl, hat]) assert.equal(/undefined|NaN/.test(s), false);
  setHatMarks([]);
});

test('🧢 받은 무늬 검사 — 허용한 도형·숫자·색만 · 하나라도 틀리면 그 무늬는 통째로 버린다 · 꼴이 틀린 목록은 빈 것', () => {
  assert.deepEqual(Object.keys(hatMarksOf([KANTO])), ['kanto']);
  const bad = [
    { id: 'a', shapes: [{ t: 'path', d: 'M0 0 L1 1"/><script>alert(1)</script>', fill: '#fff000' }] },
    { id: 'b', shapes: [{ t: 'circle', cx: 5, cy: 5, r: 3, fill: 'red' }] },
    { id: 'c', shapes: [{ t: 'circle', cx: 5, cy: 5, r: 3, fill: '#00ff00' }, { t: 'image', href: 'http://x' }] },
    { id: 'd', shapes: [{ t: 'circle', cx: 500, cy: 5, r: 3 }] },
    { id: 'e', shapes: Array.from({ length: 31 }, () => ({ t: 'circle', cx: 1, cy: 1, r: 1 })) },
    { id: 'Bad Id', shapes: [{ t: 'circle', cx: 1, cy: 1, r: 1 }] },
    { id: 'f', shapes: [] },
    { id: 'g', shapes: [{ t: 'rect', x: 1, y: 1, w: 2, h: 2, stroke: '#123456', sw: 9 }] },
    { id: 'h', shapes: [{ t: 'polygon', points: '1,1 2,2 javascript', fill: '#000000' }] },
    null, 'x', 7,
  ];
  assert.deepEqual(hatMarksOf(bad), {});
  for (const x of [null, undefined, {}, 'x', 7]) assert.deepEqual(hatMarksOf(x), {});
  const ok = hatMarksOf([{ id: 'r', shapes: [{ t: 'rect', x: 1, y: 2, w: 3, h: 4 }, { t: 'ellipse', cx: 10, cy: 8, rx: 5, ry: 3, fill: 'none', stroke: '#e5484d', sw: 1.2 }, { t: 'polygon', points: '1,1 5,1 3,4', fill: '#ffd23f' }] }]);
  assert.deepEqual(ok.r[0], { t: 'rect', x: 1, y: 2, w: 3, h: 4, rx: 0 });
  assert.equal(setHatMarks([KANTO, ...bad]), 1);
  assert.equal(hasHatMark('kanto'), true);
  assert.equal(hasHatMark('a'), false);
  setHatMarks([]);
});

test('🧢 무늬 받기 — 비공개 저장소 avatar/hatmarks.json을 10분에 한 번 · 받은 것은 이 기기에 두고 다음에 켤 때 넣는다 · 빈 목록·모두 깨진 목록은 받아 둔 것을 그대로', async () => {
  mem.clear(); setHatMarks([]);
  assert.equal(MARKS_PATH, 'avatar/hatmarks.json');
  assert.equal(PRIVATE_HATMARKS, MARKS_PATH, '📊 받기 줄과 같은 경로');
  const asked = [];
  let list = [KANTO];
  const deps = (now) => ({ now: () => now, readList: async (p) => { asked.push(p); return list; } });
  assert.equal(await syncHatMarks(false, deps(T)), true);
  assert.deepEqual(asked, ['avatar/hatmarks.json']);
  assert.equal(hasHatMark('kanto'), true);
  assert.equal(await syncHatMarks(false, deps(T + SYNC_MS - 1)), false, '10분 안에는 다시 안 받는다');
  assert.equal(asked.length, 1);
  assert.equal(await syncHatMarks(false, deps(T + SYNC_MS)), false, '같은 무늬면 바뀐 것 없음');
  list = [];
  assert.equal(await syncHatMarks(true, deps(T + 2 * SYNC_MS)), false, '빈 목록(파일 없음·열쇠 없음)');
  list = [{ id: 'kanto', shapes: [{ t: 'script' }] }];
  assert.equal(await syncHatMarks(true, deps(T + 3 * SYNC_MS)), false, '모두 깨진 목록');
  assert.equal(hasHatMark('kanto'), true, '받아 둔 무늬는 그대로');
  setHatMarks([]);
  assert.equal(loadHatMarks(), 1, '다음에 켤 때 받아 둔 것을 넣는다');
  assert.equal(hasHatMark('kanto'), true);
  // 받기가 던져도 앱은 그대로
  assert.equal(await syncHatMarks(true, { now: () => T, readList: async () => { throw new Error('offline'); } }), false);
  // 📊 받기 줄
  assert.match(readSummary({ [PRIVATE_HATMARKS]: { at: T, ok: true, n: 3 } }, () => '10/18'), /🧢 모자 무늬 ✅ 10\/18 \(3개\)/);
  setHatMarks([]);
});

test('🧢 잇기 — 앱이 켤 때 받아 둔 무늬를 넣고 · 🏡 집을 열 때 받는다(새로 받으면 다시 그림) · 옷장 단추는 그 차림이 아닐 때만 · 앱 셸 · 공개 코드에 무늬 그림이 없다', () => {
  const app = src('js/app.js');
  assert.ok(app.includes("import { loadHatMarks } from './hatmarks.js';") && /async function main\(\) \{\n {2}try \{ loadHatMarks\(\); \} catch/.test(app));
  const hv = src('js/houseview.js');
  assert.ok(hv.includes('syncHatMarks().then((changed) => { if (changed && ui.open) render(); }).catch(() => {});'));
  const av = src('js/avatarview.js');
  assert.ok(av.includes('if (wearingOutfit(pf, look, o.id)) continue;') && av.includes('runQ(ctx, (p) => outfitRule(p, o.id, Date.now()), `${o.emoji} ${o.ko}${euro(o.ko)} 갈아입었어요`)'));
  // 옷장 고르기 칸은 입는 곳 전부(🧤 장갑 포함) — 칸이 빠지면 산 옷을 못 고른다
  const wearSlots = /const WEAR_SLOTS = \[([^\]]*)\];/.exec(av);
  assert.ok(wearSlots, 'WEAR_SLOTS');
  assert.deepEqual(wearSlots[1].split(',').map((s) => s.trim().replace(/'/g, '')).sort(), [...SLOTS].sort());
  assert.ok(src('sw.js').includes("'./js/hatmarks.js',"));
  // 무늬 그림(도형 자료)은 공개 코드에 없다 — 모자 정의에는 무늬 이름만
  for (const w of WEAR.filter((x) => x.art.kind === 'ash')) assert.equal(typeof w.art.mark, 'string', w.id);
  assert.equal(/t\s*:\s*'(path|polygon|circle|rect|ellipse)'\s*,\s*(d|points|cx|x)\s*:\s*['\d]/.test(src('js/avatar.js') + src('js/avatarart.js') + src('js/hatmarks.js')), false, '무늬 도형 자료는 비공개 저장소에만');
});

test('🔍 Codex 99차 ① 한 번에 입기는 저장하는 순간의 프로필로 고른다 — 그린 때와 운동화가 달라도 차림 전체가 입혀진다', () => {
  const look = { top: 'a_top_red' };
  // 그릴 때는 빨간 운동화가 있었는데 저장된 프로필에는 없다(옷장을 연 사이 백업 합치기) → 옛 길(그린 때의 패치)은 통째로 실패
  const drawn = pf({ a_shoe_run: 1 }, made(look));
  const stored = pf({}, made(look));
  assert.equal(avatarLookRule(cloneProfile(stored), outfitPatch(drawn, 'trainer'), T + 1).ok, false, '옛 길');
  assert.deepEqual(outfitRule(stored, 'trainer', T + 1), { ok: true });
  assert.deepEqual([avatarOf(stored).look.shoes, avatarOf(stored).look.hat], ['a_shoe_basic', 'a_hat_trainer']);
  // 반대로 저장 때 운동화가 생겼으면 그것을 신는다
  const later = pf({ a_shoe_run: 1 }, made(look));
  assert.deepEqual(outfitRule(later, 'trainer', T + 1), { ok: true });
  assert.equal(avatarOf(later).look.shoes, 'a_shoe_run');
  // 모르는 차림 · 아직 안 만든 캐릭터
  assert.deepEqual(outfitRule(pf({}, made(look)), 'nope', T + 1), { ok: false, why: 'unknown' });
  assert.equal(outfitRule(pf(), 'trainer', T + 1).why, 'made');
});

test('🔍 Codex 99차 ② 받은 무늬가 검사에서 빠지면 📊 받기 줄에 ⚠️ "받지 않은 무늬" — 모두 빠져도 · 일부만 빠져도 · 다 받으면 0', async () => {
  mem.clear(); setHatMarks([]);
  const checks = [];
  const deps = (list) => ({ now: () => T, readList: async () => list, noteCheck: async (c) => { checks.push(c); } });
  const BROKEN = { id: 'hoenn', shapes: [{ t: 'circle', cx: 5, cy: 5, r: 3, fill: 'red' }] };
  assert.equal(await syncHatMarks(true, deps([BROKEN, { ...BROKEN, id: 'sinnoh' }])), false, '모두 빠짐 — 받아 둔 것 그대로');
  assert.equal(await syncHatMarks(true, deps([KANTO, BROKEN])), true);
  assert.equal(await syncHatMarks(true, deps([KANTO])), false);
  assert.deepEqual(checks, [{ rows: 2, bad: 2 }, { rows: 2, bad: 1 }, { rows: 1, bad: 0 }]);
  const fmt = () => 't';
  assert.match(readSummary({ [PRIVATE_HATMARKS]: { ok: true, at: 1, n: 7, check: { rows: 7, bad: 7 } } }, fmt), /🧢 모자 무늬 ⚠️ t \(7개 — 받지 않은 무늬 7 · Claude에게 "모자 무늬 확인해 줘"\)/);
  assert.match(readSummary({ [PRIVATE_HATMARKS]: { ok: true, at: 1, n: 7, check: { rows: 7, bad: 0 } } }, fmt), /🧢 모자 무늬 ✅ t \(7개\)/);
  assert.match(readSummary({ 'family/messages.json': { ok: true, at: 1, n: 2, check: { rows: 2, bad: 1 } } }, fmt), /받지 않은 줄 1 · Claude에게 "메시지 확인해 줘"/, '💌는 그대로');
  // 받기 줄에 적는 데 실패해도 무늬는 받는다
  setHatMarks([]);
  assert.equal(await syncHatMarks(true, { now: () => T, readList: async () => [KANTO], noteCheck: async () => { throw new Error('x'); } }), false);
  assert.equal(hasHatMark('kanto'), true);
  setHatMarks([]);
});

test('🔍 Codex 99차 제안 — 받기: 시계가 뒤로 가면 다시 받는다 · 받기가 실패해도 10분은 다시 안 묻는다', async () => {
  mem.clear(); setHatMarks([]);
  let asked = 0;
  const deps = (now, fail) => ({ now: () => now, noteCheck: async () => {}, readList: async () => { asked++; if (fail) throw new Error('offline'); return [KANTO]; } });
  assert.equal(await syncHatMarks(false, deps(T, true)), false, '실패');
  assert.equal(await syncHatMarks(false, deps(T + SYNC_MS - 1)), false, '실패 뒤 10분 안');
  assert.equal(asked, 1);
  assert.equal(await syncHatMarks(false, deps(T - 1)), true, '시계가 뒤로 — 다시 받는다');
  assert.equal(asked, 2);
  setHatMarks([]);
});

test('🔍 Codex 99차 제안 — 지우 모자 일곱 × 머리 모양 × 장갑 있고 없음 × 무늬 있고 없음 · 그림이 깨지지 않는다', () => {
  const hats = WEAR.filter((w) => w.art.kind === 'ash');
  const marks = hats.map((w) => ({ id: w.art.mark, shapes: KANTO.shapes }));
  let n = 0;
  for (const withMarks of [false, true]) {
    setHatMarks(withMarks ? marks : []);
    for (const w of hats) for (const h of HAIRS) for (const gloves of ['', 'a_glove_green']) for (const top of ['a_top_blue', 'a_top_trainer']) {
      const svg = avatarSvg({ hair: h.id, hat: w.id, gloves, top }, { uid: `x${n++}` });
      const at = `${w.id}·${h.id}·${gloves || '맨손'}·${top}`;
      assert.equal(/undefined|NaN|null/.test(svg), false, at);
      assert.equal((svg.match(/<svg/g) || []).length, 1, at);
      assert.ok(svg.endsWith('</svg>'), at);
      assert.equal(svg.includes('translate(23 12)'), withMarks, `${at} 무늬`);
      assert.equal((svg.match(/<g\b/g) || []).length, (svg.match(/<\/g>/g) || []).length, `${at} 묶음`);
    }
  }
  assert.equal(n, 2 * hats.length * HAIRS.length * 2 * 2);
  setHatMarks([]);
});
