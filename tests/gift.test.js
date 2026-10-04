// 🎁 진짜 선물 교환권 (🔔 피카츄 자전거 벨, 2026-10-04) 테스트: node --test tests/gift.test.js
//
// 아버님 요청: 지금 영상 교환권이 끝나면 그다음 차례로 자전거 벨 교환권 — 얻으면 아빠가 실제로 사 준다.
// 빨리 끝내고 싶게 차례 전부터 사진과 함께 미리 보여 준다. 조건은 💰 2,000 · 📼+🔢 1,800 · 🔁 100.
// 사진은 아빠가 태블릿에서 넣는다 (공개 저장소에 올리지 않는다).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import {
  LOCKED, GIFTS, NEED, unlockState, voucherOrder, nextTarget, previewGift, pendingGifts, ownedVoucherIds,
  findVoucher, needOf, isGift, ticketId, totalsFrom, nextLocked,
} from '../js/unlock.js';
import { cloneProfile, purchaseRule, giftGivenRule, mergeStatRecord, giftPhotoKey, emptyProfile } from '../js/db.js';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const recs = (done, reviewed) => Array.from({ length: done }, (_, i) => ({ key: `d${i}`, done: true, reviewPass: i < reviewed ? 1 : 0 }));
const bell = GIFTS.find((g) => g.id === 'bell');

test('🎁 자전거 벨: 아버님이 정한 조건 그대로 — 💰 2,000 · 📼+🔢 1,800 · 🔁 100 (영상은 그대로 1,000 · 50)', () => {
  assert.ok(bell, '🔔 bell 선물이 있다');
  assert.equal(bell.price, 2000);
  assert.deepEqual(needOf(bell), { doneSentences: 1800, reviewPassed: 100 });
  for (const v of LOCKED) assert.deepEqual(needOf(v), NEED, `${v.id}: 영상 조건은 그대로`);
  assert.equal(bell.after, 'iconic', '지금 진행 중인 영상 교환권 다음');
  assert.ok(isGift(bell) && !isGift(LOCKED[0]));
  assert.equal(findVoucher('bell'), bell);
  assert.equal(findVoucher('iconic'), LOCKED[0]);
});

test('🎁 줄: 지금 영상 → 🔔 벨 → 다음 영상들 · 지금 모으는 것은 하나, 벨은 차례 전부터 미리 보기', () => {
  assert.deepEqual(voucherOrder().map((c) => c.id), ['iconic', 'bell', 'wild2', 'prime_suspect']);
  // 아무것도 안 가짐 → 영상(iconic)을 모으고, 벨은 미리 보기
  assert.equal(nextTarget([]).id, 'iconic');
  assert.equal(previewGift([]).id, 'bell');
  // 영상 교환권을 받음 → 이제 벨 차례 (미리 보기는 없음 — 그 카드가 곧 진짜 카드)
  assert.equal(nextTarget(['iconic']).id, 'bell');
  assert.equal(previewGift(['iconic']), null);
  // 벨도 받음 → 다음 영상, 미리 볼 선물 없음
  assert.equal(nextTarget(['iconic', 'bell']).id, 'wild2');
  assert.equal(previewGift(['iconic', 'bell']), null);
  // 영상 교환권 목록(nextLocked)은 예전처럼 영상만 — 📊 "넣어줘야 할 영상"·제목 배달 판정은 그대로
  assert.equal(nextLocked(['iconic']).id, 'wild2');
});

test('🎁 앞선 영상을 배달하고 목록에서 빼도(unlock.js 규칙) 벨은 줄 맨 앞에 남는다', () => {
  const order = voucherOrder(LOCKED.filter((c) => c.id !== 'iconic'));
  assert.deepEqual(order.map((c) => c.id), ['bell', 'wild2', 'prime_suspect']);
});

test('🎁 가방에서 가진 교환권 · 받았지만 아직 안 건넨 선물', () => {
  const bag = { [ticketId('iconic')]: 1, [ticketId('bell')]: 1, pokeball: 3 };
  assert.deepEqual(ownedVoucherIds(bag), ['iconic', 'bell']);
  assert.deepEqual(pendingGifts(bag, {}).map((g) => g.id), ['bell'], '받았는데 아직 안 건넴 → 📊 알림');
  assert.deepEqual(pendingGifts(bag, { bell: '2026-10-20' }), [], '건넸으면 사라진다');
  assert.deepEqual(pendingGifts({ [ticketId('iconic')]: 1 }, {}), [], '안 받은 선물은 알림이 없다');
  // 건넨 뒤에도 교환권은 가방에 남아 줄에서 "가진 것" — 벨을 또 모으지 않는다
  assert.equal(nextTarget(ownedVoucherIds(bag)).id, 'wild2');
});

test('🎁 벨 조건: 1,800 · 100을 채워야 바꿀 수 있다 (영상 기준 1,000 · 50으로는 아직)', () => {
  const half = unlockState({ coins: 5000, records: recs(1000, 50), price: bell.price, need: needOf(bell) });
  assert.equal(half.ready, false);
  assert.deepEqual(half.items.map((i) => [i.key, i.have, i.need]), [['coins', 5000, 2000], ['progress', 1000, 1800], ['review', 50, 100]]);
  const full = unlockState({ coins: 2000, records: recs(1800, 100), price: bell.price, need: needOf(bell) });
  assert.equal(full.ready, true);
  const poor = unlockState({ coins: 1999, records: recs(1800, 100), price: bell.price, need: needOf(bell) });
  assert.equal(poor.ready, false, '코인 하나 모자라도 못 바꾼다');
  // 🔢 수학도 같은 막대를 채운다 (정답 1 = 2, 완주 = 20, 복습 편 = 5)
  const math = unlockState({ coins: 2000, records: [], price: 2000, need: needOf(bell), math: { ok: 900, daily: 0, rev: 20 } });
  assert.equal(math.ready, true, '수학만으로도 1,800 · 100');
});

test('🎁 벨은 영상 교환권을 받은 **다음부터** 센다 — 받는 순간의 누적치가 출발선 (기존 기준선 방식 그대로)', () => {
  // 영상 교환권을 받을 때까지 1,200문장·60복습 → 그 뒤 600문장·40복습 더
  const atIconic = totalsFrom(recs(1200, 60));
  const p = cloneProfile({ coins: 2000, items: {} });
  assert.equal(purchaseRule(p, { coins: 2000 }, { items: { [ticketId('iconic')]: 1 }, unlockBase: atIconic }).ok, true);
  const later = unlockState({ coins: 2000, records: recs(1800, 100), price: bell.price, base: p.unlockBase, need: needOf(bell) });
  assert.deepEqual(later.items.map((i) => i.have), [2000, 600, 40], '영상 교환권 이후 몫만');
  assert.equal(later.ready, false);
  // 벨을 받으면 다음 영상도 다시 0부터
  const q = cloneProfile({ coins: 2000, items: { [ticketId('iconic')]: 1 } });
  purchaseRule(q, { coins: 2000 }, { items: { [ticketId('bell')]: 1 }, unlockBase: totalsFrom(recs(3000, 160)) });
  const next = unlockState({ coins: 0, records: recs(3000, 160), price: 2000, base: q.unlockBase, need: needOf(findVoucher('wild2')) });
  assert.deepEqual(next.items.slice(1).map((i) => i.have), [0, 0]);
});

test('🎁 건넸다는 표시: 한 번 표시하면 그대로(처음 건넨 날) · 백업을 합쳐도 사라지지 않는다(합집합) · 복사본도 따로', () => {
  const p = cloneProfile(emptyProfile());
  assert.deepEqual(p.giftsGiven, {});
  assert.equal(giftGivenRule(p, 'bell', '2026-10-20').ok, true);
  assert.equal(giftGivenRule(p, 'bell', '2026-11-01').ok, false, '이미 건넴');
  assert.deepEqual(p.giftsGiven, { bell: '2026-10-20' });
  assert.equal(giftGivenRule(p, '', 'x').ok, false);
  const c = cloneProfile(p); c.giftsGiven.other = 'x';
  assert.deepEqual(p.giftsGiven, { bell: '2026-10-20' }, '복사본을 고쳐도 원본은 그대로');
  // 병합: 건넨 기록이 없는 최근 백업(가방은 최근 쪽)을 합쳐도 건넨 기록은 남는다
  const given = { id: 'me', items: { [ticketId('bell')]: 1 }, giftsGiven: { bell: '2026-10-20' }, updatedAt: 100 };
  const newerWithout = { id: 'me', items: { [ticketId('bell')]: 1 }, updatedAt: 200 };
  assert.deepEqual(mergeStatRecord('profile', newerWithout, given).giftsGiven, { bell: '2026-10-20' });
  assert.deepEqual(mergeStatRecord('profile', given, newerWithout).giftsGiven, { bell: '2026-10-20' });
});

test('🎁 사진은 저장소에 두지 않는다 — 아빠가 ⚙에서 태블릿 사진을 넣고(blobs "gift:bell"), 저장소에는 그림 파일도 사진 주소도 없다', () => {
  assert.equal(giftPhotoKey('bell'), 'gift:bell');
  for (const g of GIFTS) for (const v of Object.values(g)) assert.ok(!/https?:|\.(png|jpe?g|webp|gif)\b/i.test(String(v)), `${g.id}: 사진 주소/파일 ${v}`);
  const gift = src('js/gift.js');
  assert.ok(!/https?:\/\//.test(gift), 'gift.js가 사진을 인터넷에서 받지 않는다');
  assert.match(gift, /putGiftPhoto\(g\.id, f\)/, '고른 파일을 이 기기에 저장');
  // 저장소에 추적되는 그림은 아이콘뿐 (상품 사진을 실수로 커밋하지 않게)
  const imgs = (dir) => { try { return readdirSync(new URL(`../${dir}/`, import.meta.url)).filter((f) => /\.(png|jpe?g|webp|gif)$/i.test(f)); } catch { return []; } };
  for (const dir of ['coach', 'coach/math', 'css', 'js']) assert.deepEqual(imgs(dir), [], `${dir}에 그림 파일`);
});

test('🎁 화면 연결 — 영어 목록·수학 🎟️ 줄은 같은 줄(nextTarget)과 그 교환권의 조건(needOf)을 쓰고, 미리 보기·받은 선물 카드·📊 건네줬어요·⚙ 사진 · 앱 셸', () => {
  const lib = src('js/library.js');
  assert.match(lib, /const next = nextTarget\(owned\);/);
  assert.match(lib, /currentState\(next\.price, records, needOf\(next\)\)/);
  assert.match(lib, /isGift\(next\) \? giftCard\(next, st\) : lockedCard\(next, st\)/);
  assert.match(lib, /const pv = previewGift\(owned\);\s*if \(pv\) box\.appendChild\(giftPreviewCard\(pv, next\)\);/);
  assert.match(lib, /pendingGifts\(bag, giftsGiven\(\)\)/);
  // 교환 버튼의 다시 판정(ready 함수와 fresh 둘 다)도 그 교환권의 조건으로 — 하나만 영상 조건이면 벨을 1,000·50에 바꿔 준다 (변이 검사가 잡은 구멍)
  assert.equal((lib.match(/currentState\(c\.price, null, needOf\(c\)\)/g) || []).length, 2, '교환 버튼의 두 판정 모두 needOf(c)');
  assert.ok(!/currentState\(c\.price\)/.test(lib), '조건 없이 부르는 currentState(c.price)가 남아 있다');
  const math = src('js/math.js');
  assert.match(math, /const next = nextTarget\(owned\);/);
  assert.match(math, /need: needOf\(next\)/);
  assert.match(math, /previewGift\(owned\)/);
  assert.match(src('js/xp.js'), /const c = findVoucher\(contentId\);/, '구매는 영상·선물 모두 찾는다');
  const stats = src('js/stats.js');
  assert.match(stats, /pendingGifts\(inventory\(\), giftsGiven\(\)\)/);
  assert.match(stats, /markGiven\(g\.id, todayKey\(\)\)/);
  assert.match(src('js/app.js'), /initGiftSettings\(\);/);
  assert.match(src('index.html'), /id="set-gift-photo"/);
  const sw = src('sw.js');
  assert.ok(sw.includes("'./js/gift.js'"), 'APP_SHELL에 gift.js');
  // 미리 보기 글: 영상 제목 뒤 조사 (받침 있으면 을)
  assert.match(lib, /const eulReul = /);
});

test('🎁 Codex 28차 #1 — 두 창에서 같은 교환권을 두 번 못 산다: 저장된 가방에 이미 있으면 거절(코인·기준선 그대로)', () => {
  const base = totalsFrom(recs(3000, 160));
  // 저장소 하나에 창 둘이 차례로 산다 — 둘 다 "아직 안 가졌다"고 본 화면에서 누른 것
  const stored = cloneProfile({ coins: 4000, items: { [ticketId('iconic')]: 1 }, unlockBase: { done: 1, review: 1 } });
  const gain = { items: { [ticketId('bell')]: 1 }, unlockBase: base, once: ticketId('bell') };
  assert.equal(purchaseRule(stored, { coins: 2000 }, gain).ok, true, '창 A');
  const before = JSON.stringify(stored.unlockBase);
  const r = purchaseRule(stored, { coins: 2000 }, { ...gain, unlockBase: totalsFrom(recs(3500, 170)) });
  assert.equal(r.ok, false, '창 B는 거절');
  assert.equal(r.why, 'owned');
  assert.equal(stored.coins, 2000, '코인은 한 번만');
  assert.equal(stored.items[ticketId('bell')], 1, '교환권 한 장');
  assert.equal(JSON.stringify(stored.unlockBase), before, '거절이면 기준선도 그대로');
  // once가 없는 보통 물건(볼)은 여러 개 산다
  const p = cloneProfile({ coins: 100, items: {} });
  assert.equal(purchaseRule(p, { coins: 25 }, { items: { greatball: 1 } }).ok, true);
  assert.equal(purchaseRule(p, { coins: 25 }, { items: { greatball: 1 } }).ok, true);
  assert.equal(p.items.greatball, 2);
  // 교환권 구매 경로가 once를 넘긴다 (영상·선물 모두)
  assert.match(src('js/xp.js'), /unlockBase: base \|\| null, once: `ticket_\$\{contentId\}` \}/);
});

test('🎁 Codex 28차 #4·#5 — 다른 📊 창에서 먼저 건넸어도 성공 · 안 열리는 사진은 넣지 않고, 보일 때 깨지면 그림 → 이모지', () => {
  const p = cloneProfile(emptyProfile());
  giftGivenRule(p, 'bell', '2026-10-20');
  const again = giftGivenRule(p, 'bell', '2026-11-01');
  assert.deepEqual([again.ok, again.why], [false, 'already']);
  assert.equal(p.giftsGiven.bell, '2026-10-20', '처음 건넨 날 그대로');
  assert.match(src('js/xp.js'), /r\.ok \|\| r\.why === 'already'/, 'markGiven은 "이미 건넴"도 끝난 일로 — 📊 카드가 사라진다');
  const gift = src('js/gift.js');
  assert.match(gift, /if \(!\(await decodable\(f\)\)\) \{ say\([^)]*열 수 없어요/, '넣기 전에 열어 본다');
  assert.ok(gift.indexOf('await decodable(f)') < gift.indexOf('await putGiftPhoto(g.id, f)'), '열어 본 뒤에 저장');
  assert.match(gift, /addEventListener\('error', \(\) => \{ if \(img\.parentNode === box\) onFail\(\); \}, \{ once: true \}\)/, '안 열리면 한 단계 아래로 (바뀐 그림의 늦은 오류는 무시)');
  assert.match(gift, /show\(u, g\.ko, showArt\)/, '사진 → 그림');
  assert.match(gift, /show\(art, '', showEmoji\)/, '그림 → 이모지');
});
