// 📦 아빠의 구호품 (2026-10-05): node --test tests/parcel.test.js
// 왜: v179에서 이로치의 스톤을 "하나에 3번"으로 바꿀 때, 그 전에 이미 써 버린 스톤의 남은 2번은 돌려주지 않았다.
//     진우가 이로치를 빼자 스톤이 사라졌다 → 아빠가 coach/gifts.json으로 남은 2번을 보낸다. 받기는 한 번만.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { cloneProfile, emptyProfile, parcelRule, shinyRule, unshinyRule, mergeStatRecord } from '../js/db.js';
import { parcelOf, PARCEL_MAX, SHINY_CHARGE, SHINY_STONE, TRUE_GOLD, shinyUsesLeft, ITEMS } from '../js/items.js';
import { pendingParcels, parcelLabel, afterLine } from '../js/parcel.js';

const prof = (o = {}) => cloneProfile({ ...emptyProfile(), ...o });
const src = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const SHINY2 = { id: 'p1', items: { [SHINY_CHARGE]: 2 }, text: '아빠가 보낸다' };

test('📦 구호품 한 줄 읽기 — 가방 물건과 🌈 남은 횟수만, 1~10개 정수, 틀린 데가 하나라도 있으면 통째로 안 받는다', () => {
  assert.deepEqual(parcelOf(SHINY2), { id: 'p1', items: { [SHINY_CHARGE]: 2 }, title: '', text: '아빠가 보낸다' });
  assert.deepEqual(parcelOf({ id: ' p2 ', items: { [SHINY_STONE.id]: 1, potion: 3 }, title: ' 선물 ' }).items, { [SHINY_STONE.id]: 1, potion: 3 });
  assert.equal(parcelOf({ id: ' p2 ', items: { potion: 1 }, title: ' 선물 ' }).id, 'p2', 'id 앞뒤 빈칸은 뗀다');
  assert.equal(parcelOf({ id: 'p', items: { potion: 1 }, title: ' 선물 ' }).title, '선물');
  assert.equal(parcelOf({ id: 'p', items: { potion: PARCEL_MAX } }).items.potion, PARCEL_MAX);
  for (const [bad, why] of [
    [null, '없음'], [[], '배열'], ['p1', '글자'],
    [{ items: { potion: 1 } }, 'id 없음'], [{ id: '  ', items: { potion: 1 } }, '빈 id'], [{ id: 7, items: { potion: 1 } }, '수 id'],
    [{ id: 'x'.repeat(65), items: { potion: 1 } }, '너무 긴 id'],
    [{ id: 'p' }, 'items 없음'], [{ id: 'p', items: {} }, '빈 items'], [{ id: 'p', items: [1] }, 'items가 배열'],
    [{ id: 'p', items: { nope: 1 } }, '모르는 물건'], [{ id: 'p', items: { potion: 1, nope: 1 } }, '하나라도 모르는 물건'],
    [{ id: 'p', items: { [TRUE_GOLD.id]: 1 } }, '🌕 세상에 하나뿐인 것은 못 보낸다'],
    [{ id: 'p', items: { potion: 0 } }, '0개'], [{ id: 'p', items: { potion: -2 } }, '음수'], [{ id: 'p', items: { potion: 1.5 } }, '소수'],
    [{ id: 'p', items: { potion: '2' } }, '글자 수'], [{ id: 'p', items: { potion: PARCEL_MAX + 1 } }, '오타로 너무 많이'],
  ]) assert.equal(parcelOf(bad), null, why);
});

test('📦 진우의 경우: 옛 규칙으로 쓴 스톤 → 이로치 빼기 → 0번 → 구호품 2번 → 두 마리에 입히고 세 번째는 새 스톤', () => {
  // v179 전: 스톤 1개 = 1번이라 입히는 순간 스톤이 통째로 사라졌다 (shinyAt도 없는 옛 이로치)
  const p = prof({ caught: { 25: 1, 4: 1, 7: 1 }, items: {}, mons: { 25: { shiny: true } } });
  assert.equal(unshinyRule(p, 25, 1000).ok, true, '이로치 빼기');
  assert.equal(shinyUsesLeft(p.items), 0, '남은 2번이 빠져 있었다 — 이게 신고된 "스톤이 없어졌다"');
  const r = parcelRule(p, SHINY2, 2000);
  assert.deepEqual(r, { ok: true, items: { [SHINY_CHARGE]: 2 } });
  assert.equal(shinyUsesLeft(p.items), 2, '구호품으로 남은 2번');
  assert.equal(p.parcels.p1, 2000, '받은 때를 적는다');
  assert.equal(shinyRule(p, 25, SHINY_STONE.id, 3000).ok, true);
  assert.equal(shinyRule(p, 4, SHINY_STONE.id, 4000).ok, true);
  assert.equal(shinyUsesLeft(p.items), 0);
  assert.deepEqual(shinyRule(p, 7, SHINY_STONE.id, 5000), { ok: false, why: 'item' }, '세 번째는 새 스톤이 있어야');
});

test('📦 한 번만 받는다 — 두 번 불러도(두 창·두 번 누름) +2, 이미 가진 스톤·횟수에 더해진다, 틀린 줄은 아무것도 안 바꾼다', () => {
  const p = prof({ items: { [SHINY_STONE.id]: 1, [SHINY_CHARGE]: 1, potion: 2 } });
  assert.equal(parcelRule(p, SHINY2, 100).ok, true);
  assert.deepEqual(parcelRule(p, SHINY2, 200), { ok: false, why: 'done' }, '두 번째는 끝난 일');
  assert.deepEqual(parcelRule(p, { ...SHINY2, items: { potion: 5 } }, 300), { ok: false, why: 'done' }, 'id가 같으면 내용이 바뀌어도 다시 안 받는다');
  assert.equal(p.items[SHINY_CHARGE], 3);
  assert.equal(shinyUsesLeft(p.items), 6, '스톤 1개(3번) + 남은 1번 + 구호품 2번');
  assert.equal(p.items.potion, 2);
  assert.equal(p.parcels.p1, 100, '받은 때는 처음 받은 때 그대로');
  const before = JSON.stringify(p);
  assert.deepEqual(parcelRule(p, { id: 'p9', items: { [TRUE_GOLD.id]: 1 } }, 400), { ok: false, why: 'bad' });
  assert.equal(JSON.stringify(p), before, '틀린 줄은 가방도 받은 기록도 안 바꾼다');
  // 다른 id는 따로 받는다 — 여러 개가 같은 물건이면 더해진다
  assert.equal(parcelRule(p, { id: 'p2', items: { potion: 1, [SHINY_CHARGE]: 1 } }, 500).ok, true);
  assert.deepEqual([p.items.potion, p.items[SHINY_CHARGE]], [3, 4]);
  // 저장된 프로필을 복사해 판정하므로(mutateProfile) 두 창이 같은 저장본에서 차례로 돌아도 한 번 — 복사본에도 받은 기록이 따라간다
  const copy = cloneProfile(p);
  assert.deepEqual(parcelRule(copy, SHINY2, 600), { ok: false, why: 'done' });
  copy.parcels.zz = 1;
  assert.equal(p.parcels.zz, undefined, '복사는 깊다 (받은 기록이 창끼리 섞이지 않는다)');
});

test('📦 백업 병합: 받은 구호품은 합집합 — 옛 백업을 합쳐도 다시 받을 수 없다, 받은 때는 이른 쪽', () => {
  const got = { id: 'me', items: { [SHINY_CHARGE]: 2 }, parcels: { p1: 2000 }, updatedAt: 300 };
  const old = { id: 'me', items: {}, updatedAt: 100 };
  for (const [a, b] of [[got, old], [old, got]]) {
    const m = mergeStatRecord('profile', a, b);
    assert.deepEqual(m.parcels, { p1: 2000 }, '받은 기록이 남는다');
    assert.equal(m.items[SHINY_CHARGE], 2, '가방은 최근 쪽 — 받은 쪽이 최근이다');
    assert.deepEqual(parcelRule(cloneProfile({ ...emptyProfile(), ...m }), SHINY2).why, 'done', '합친 뒤에도 다시 못 받는다');
  }
  const m2 = mergeStatRecord('profile', { id: 'me', parcels: { p1: 2000, p2: 5 }, updatedAt: 1 }, { id: 'me', parcels: { p1: 1500, p3: 7 }, updatedAt: 2 });
  assert.deepEqual(m2.parcels, { p1: 1500, p2: 5, p3: 7 });
  const m3 = mergeStatRecord('profile', { id: 'me', parcels: { p1: 0 }, updatedAt: 1 }, { id: 'me', updatedAt: 2 });
  assert.ok(m3.parcels.p1 > 0, '깨진 때(0)라도 받은 기록은 받은 것으로 남는다');
  assert.deepEqual(parcelRule(prof({ parcels: { p1: 0 } }), SHINY2).why, 'done', '받은 때가 깨져(0) 있어도 기록이 있으면 받은 것');
  assert.deepEqual(pendingParcels([SHINY2], { p1: 0 }), [], '화면도 같은 판정');
});

test('📦 아직 안 받은 것만 하나씩 — 틀린 줄·받은 것·겹친 id는 뺀다 · 이름은 "이로치의 스톤 · 2번"', () => {
  const list = [SHINY2, { id: 'bad', items: { nope: 1 } }, { id: 'p1', items: { potion: 1 } }, { id: 'p2', items: { potion: 1 } }, null];
  assert.deepEqual(pendingParcels(list, {}).map((x) => x.id), ['p1', 'p2']);
  assert.deepEqual(pendingParcels(list, { p1: 1 }).map((x) => x.id), ['p2']);
  assert.deepEqual(pendingParcels(null, {}), []);
  assert.deepEqual(pendingParcels({ id: 'p1' }, {}), [], '배열이 아니면 아무것도');
  assert.deepEqual(parcelLabel(SHINY_CHARGE, 2), { emoji: '🌈', name: '이로치의 스톤', count: '2번' });
  assert.deepEqual(parcelLabel('potion', 3).count, '×3');
  assert.match(afterLine({ [SHINY_CHARGE]: 2 }, 2), /이로치 남은 횟수: 2번/);
  assert.equal(afterLine({ potion: 1 }, 0), '🎒 가방에서 볼 수 있어요');
});

test('📦 배포 파일 coach/gifts.json — 진우에게 🌈 2번 · 모든 줄이 맞는 꼴 · id가 겹치지 않는다', () => {
  const list = JSON.parse(src('coach/gifts.json'));
  assert.ok(Array.isArray(list));
  const ids = list.map((e) => (parcelOf(e) || {}).id);
  assert.ok(ids.every(Boolean), '틀린 줄은 앱이 조용히 건너뛴다 — 배포 전에 잡는다');
  assert.equal(new Set(ids).size, ids.length, 'id가 겹치면 뒤 줄은 안 간다');
  const shiny = list.map(parcelOf).find((x) => x.items[SHINY_CHARGE]);
  assert.deepEqual(shiny.items, { [SHINY_CHARGE]: 2 }, '아버님: 2번 쓸 수 있게');
  assert.ok(shiny.text.length > 0, '아빠 한마디');
});

test('📦 화면 연결 — 앱을 열면(🔒 알림 뒤) 한 번 · [받기]를 눌러야 저장소 트랜잭션 · 저장이 안 되면 "못 받았어요" · 오프라인 셸', () => {
  const x = src('js/xp.js');
  assert.match(x, /export async function receiveParcel\(raw\) \{\s*const r = await runProfileOp\(\(\) => applyParcel\(raw\), \(\) => \(\{ ok: false, why: 'save' \}\)\);/, '저장 실패를 "받았어요"로 만들지 않는다');
  assert.match(x, /parcels: \{ \.\.\.\(p\.parcels \|\| \{\}\) \}/, '창의 프로필도 받은 기록을 읽는다 (fromStored)');
  const a = src('js/app.js');
  assert.match(a, /initParcel\(\);/);
  assert.match(a, /showTakenNoticeIfAny\(\)\.then\(\(shown\) => \(shown \? false : showParcelIfAny\(\)\)\)/, '🔒 알림이 없으면 바로');
  assert.match(a, /getElementById\('taken-ok'\)\?\.addEventListener\('click', \(\) => \{ setTimeout\(\(\) => \{ showParcelIfAny\(\)/, '🔒 알림을 닫은 뒤에');
  assert.match(src('js/taken.js'), /'take', 'parcel'\]/, '🔒 알림이 구호품 창 위에 겹쳐 뜨지 않는다');
  const v = src('js/parcel.js');
  assert.match(v, /'timeup', 'take', 'taken', 'market'\]/, '다른 창이 열려 있으면 기다린다');
  assert.match(v, /try \{ r = cur\.kind === 'video' \? await receiveVideoStones\(cur\.ids\) : await receiveParcel\(cur\); \}/, '받기 버튼이 트랜잭션을 부른다 (🏁 영상 칸은 영상 트랜잭션 — tests/englishstone.test.js)');
  assert.match(v, /if \(r\.ok\) \{\s*\$\('parcel-title'\)\.textContent = '🎒 가방에 넣었어요!';/, '"넣었어요"는 저장된 뒤에만');
  assert.match(v, /if \(step === 'busy'\) return;/, '두 번 눌러도 한 번');
  assert.match(v, /failed = true;/, '못 받았으면 이번에는 다시 안 띄운다');
  const h = src('index.html');
  for (const id of ['parcel', 'parcel-title', 'parcel-stage', 'parcel-text', 'parcel-sub', 'parcel-ok']) assert.match(h, new RegExp(`id="${id}"`));
  assert.match(h, /<div id="parcel" class="catch parcel" hidden>/);
  assert.match(src('sw.js'), /'\.\/js\/parcel\.js',/);
});

test('🔍 Codex 32차 #4 — 🥚 알은 구호품으로 못 보낸다 (가방이 아니라 profile.eggs에서 품는다) · 받을 수 있는 것은 모두 가방에서 쓰는 것', () => {
  assert.equal(parcelOf({ id: 'egg-gift', items: { egg_math: 1 } }), null);
  assert.equal(parcelOf({ id: 'egg-gift', items: { egg_english: 1, potion: 1 } }), null, '하나라도 알이면 통째로');
  const usable = new Set(['gear', 'dye', 'potion', 'ball', 'mega', 'mushroom', 'stone', 'tool', 'extend']);
  for (const it of ITEMS) if (parcelOf({ id: 'x', items: { [it.id]: 1 } })) assert.ok(usable.has(it.kind), `${it.id} (${it.kind})는 받아도 쓸 곳이 있어야`);
});

test('🔍 Codex 32차 #6·#7 — 부화 창은 구호품 위에 안 겹친다 · 다른 창 때문에 미뤄 둔 구호품은 홈으로 돌아올 때 다시', () => {
  assert.match(src('js/hatch.js'), /'evolve', 'take', 'taken', 'timeup', 'market', 'parcel'\]/);
  const v = src('js/parcel.js');
  assert.match(v, /if \(anyModalOpen\(\)\) \{ deferred = true; return false; \}/, '처음부터 다른 창이 열려 있으면 미룬다');
  assert.match(v, /if \(anyModalOpen\(\) \|\| !box\.hidden\) \{ deferred = true; return false; \}/, '받아 오는 사이 열렸어도 미룬다');
  assert.match(v, /if \(!queue\.length\) \{ deferred = false; return false; \}/, '받을 게 없으면 미룬 것도 없다');
  assert.match(v, /export function retryParcel\(\) \{\s*if \(!deferred \|\| failed\) return Promise\.resolve\(false\);\s*return showParcelIfAny\(\);/, '미룬 적이 없거나 저장을 못 했으면 받아 오지도 않는다');
  assert.match(src('js/app.js'), /if \(name === 'home'\) retryParcel\(\)\.catch\(\(\) => \{\}\);/);
});
