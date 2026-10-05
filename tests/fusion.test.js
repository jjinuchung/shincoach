// 🏪 5일장 · 🔀 퓨전 (2026-10-04) 테스트: node --test tests/fusion.test.js
//
// 진우 요청 → 아버님 결정: 장날은 5일마다 · 데리고 있는 두 마리를 앞(모양)+뒤(색)로 섞어 새 포켓몬 · 그림은 "모양 + 색" ·
// 이름은 앞 두 글자 + 끝 한 글자(진우가 바꿀 수 있다) · 값은 스톤만(🔷1 + 🔶1) · 두 마리가 하나로, 장날에 분리하면 돌아온다
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  MARKET_ANCHOR, MARKET_EVERY, FUSION_COST, marketOpen, nextMarket, dayNum, fusionId, parseFusionId, blendName, cleanName,
  fusionHeld, mergeFusions, copyFusions, recolor, hueGroups, toHsl,
} from '../js/fusion.js';
import { cloneProfile, emptyProfile, fuseRule, unfuseRule, renameFusionRule, mergeStatRecord, evolveRule, takeMonRule, battleLossRule } from '../js/db.js';
import { haveOf, fusedOf } from '../js/evolve.js';
import { ROSTER } from '../js/pokemon.js';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const prof = (o) => cloneProfile({ ...emptyProfile(), ...o });
const OPEN = MARKET_ANCHOR; // 2026-10-05 첫 장날
const CLOSED = '2026-10-06';

test('🏪 장날: 첫 장날(10/5)부터 5일마다 — 달·해가 바뀌어도 · 다음 장날과 남은 날', () => {
  assert.equal(MARKET_ANCHOR, '2026-10-05');
  assert.equal(MARKET_EVERY, 5);
  const open = [];
  for (let n = dayNum('2026-10-01'); n <= dayNum('2026-11-12'); n++) {
    const d = new Date(n * 864e5);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    if (marketOpen(key)) open.push(key.slice(5));
  }
  assert.deepEqual(open, ['10-05', '10-10', '10-15', '10-20', '10-25', '10-30', '11-04', '11-09'], '10월 31일에서 11월로 넘어가도 5일 간격');
  assert.equal(marketOpen('2026-10-04'), false, '오늘(10/4)은 장날이 아니다');
  assert.equal(marketOpen('2026-09-30'), true, '첫 장날 전에도 같은 간격 (계산이 앞뒤로 같다)');
  assert.equal(marketOpen('2026-12-29') && marketOpen('2027-01-03'), true, '해가 바뀌어도');
  assert.deepEqual(nextMarket('2026-10-04'), { key: '2026-10-05', days: 1 });
  assert.deepEqual(nextMarket('2026-10-05'), { key: '2026-10-05', days: 0 }, '장날이면 오늘');
  assert.deepEqual(nextMarket('2026-10-06'), { key: '2026-10-10', days: 4 });
  assert.equal(marketOpen('엉뚱한 날'), false);
  assert.equal(nextMarket('x'), null);
});

test('🔀 이름: 앞 두 글자 + 뒤 끝 한 글자 (겹치면 끝 두 글자) · 아이가 지은 이름 다듬기', () => {
  assert.equal(blendName('피카츄', '이상해씨'), '피카씨', '아버님이 든 예');
  assert.equal(blendName('이상해씨', '피카츄'), '이상츄', '순서를 바꾸면 다른 이름');
  assert.equal(blendName('꼬부기', '파이리'), '꼬부리');
  assert.equal(blendName('리자몽', '개굴닌자'), '리자닌자', '리자 + 자 → 겹치면 끝 두 글자');
  assert.equal(blendName('뮤', '피카츄'), '뮤츄', '한 글자 이름');
  assert.equal(blendName('팬텀', '루카리오'), '팬오', '두 글자 이름은 앞 한 글자');
  // 명단의 모든 짝이 빈 이름이나 한 글자 이름을 만들지 않는다
  const names = ROSTER.map((m) => m.ko);
  for (const a of names) for (const b of names) if (a !== b) { const n = [...blendName(a, b)].length; assert.ok(n >= 2 && n <= 4, `${a}+${b} → ${blendName(a, b)}`); }
  assert.equal(cleanName('  피카\n  씨  '), '피카 씨');
  assert.equal(cleanName('번개초록피카츄대장님'), '번개초록피카츄대', '8글자까지');
  assert.equal(cleanName('   '), '', '빈 이름 = 원래 이름으로');
  assert.equal(cleanName(null), '');
  assert.equal(cleanName('피카\u0000씨'), '피카 씨', '제어 문자는 뺀다');
});

test('🔀 섞기 규칙: 장날 · 서로 다른 종 · 둘 다 데리고 있어야 · 스톤만(🔷1 + 🔶1, 코인 그대로) · 두 마리가 하나로', () => {
  assert.deepEqual(FUSION_COST, { stone_math: 1, stone_english: 1 }, '스톤만 — 코인은 쓰지 않는다 (아버님 결정)');
  const p = prof({ coins: 500, caught: { 25: 2, 1: 1 }, items: { stone_math: 2, stone_english: 1 }, mons: { 25: { lv: 7, shiny: true, gear: 'cap' } }, partner: 1 });
  assert.deepEqual(fuseRule(p, 25, 1, CLOSED), { ok: false, why: 'closed' }, '장날이 아니면 못 섞는다');
  assert.deepEqual(fuseRule(p, 25, 25, OPEN), { ok: false, why: 'same' }, '같은 종끼리는 안 된다');
  assert.deepEqual(fuseRule(p, 25, 4, OPEN), { ok: false, why: 'have' }, '데리고 있지 않은 포켓몬');
  const r = fuseRule(p, 25, 1, OPEN, 1000);
  assert.deepEqual(r, { ok: true, fid: '25-1', first: true });
  assert.equal(p.coins, 500, '코인은 그대로');
  assert.deepEqual([p.items.stone_math, p.items.stone_english], [1, undefined], '🔷1 🔶1 씀');
  assert.equal(haveOf(p.caught[25], p.mons[25]), 1, '피카츄 2 → 1');
  assert.equal(haveOf(p.caught[1], p.mons[1]), 0, '이상해씨 1 → 0');
  assert.equal(p.caught[25], 2, '도감 기록(잡은 수)은 그대로');
  assert.deepEqual([p.mons[25].lv, p.mons[25].shiny, p.mons[25].gear], [7, true, 'cap'], '종의 레벨·이로치·장식은 남는다 (분리하면 그대로)');
  assert.equal(p.partner, null, '마지막 파트너(이상해씨)를 넣었으면 파트너를 비운다');
  assert.deepEqual(p.fusions['25-1'], { a: 25, b: 1, made: 1, split: 0, at: 1000 });
  assert.deepEqual(fuseRule(p, 25, 1, OPEN), { ok: false, why: 'have' }, '이상해씨가 이제 없다');
  // 스톤이 모자라면 아무것도 안 바뀐다
  const q = prof({ caught: { 7: 1, 4: 1 }, items: { stone_math: 1 } });
  const before = JSON.stringify(q);
  assert.deepEqual(fuseRule(q, 7, 4, OPEN), { ok: false, why: 'stones' });
  assert.equal(JSON.stringify(q), before, '스톤이 모자라면 포켓몬도 그대로');
});

test('🔀 분리: 장날에만 · 두 마리가 돌아온다 · 스톤은 안 돌아온다 · 퓨전 도감 칸은 남는다 · 다시 섞으면 같은 칸', () => {
  const p = prof({ caught: { 7: 1, 4: 1 }, items: { stone_math: 2, stone_english: 2 } });
  fuseRule(p, 7, 4, OPEN, 10);
  assert.deepEqual(unfuseRule(p, '7-4', CLOSED), { ok: false, why: 'closed' });
  assert.deepEqual(unfuseRule(p, '4-7', OPEN), { ok: false, why: 'none' }, '순서가 다른 퓨전은 없다');
  assert.deepEqual(unfuseRule(p, '7-4', OPEN), { ok: true, a: 7, b: 4 });
  assert.deepEqual([haveOf(p.caught[7], p.mons[7]), haveOf(p.caught[4], p.mons[4])], [1, 1], '둘 다 돌아왔다');
  assert.deepEqual([p.items.stone_math, p.items.stone_english], [1, 1], '스톤은 안 돌아온다');
  assert.equal(fusionHeld(p.fusions['7-4']), 0);
  assert.equal(p.fusions['7-4'].made, 1, '만든 기록은 남는다 (퓨전 도감)');
  assert.deepEqual(unfuseRule(p, '7-4', OPEN), { ok: false, why: 'none' }, '없는 퓨전은 또 못 나눈다');
  const again = fuseRule(p, 7, 4, OPEN, 20);
  assert.deepEqual(again, { ok: true, fid: '7-4', first: false }, '다시 섞으면 같은 칸 (처음이 아니다)');
  assert.deepEqual([p.fusions['7-4'].made, p.fusions['7-4'].at], [2, 10], '처음 만든 때 그대로');
  assert.equal(fusedOf(p.mons[7]), 1);
});

test('🔀 이름 바꾸기: 언제든 · 다듬어서 · 빈 이름이면 원래 이름 · 만든 적 없는 퓨전은 못 바꾼다', () => {
  const p = prof({ caught: { 25: 1, 1: 1 }, items: { stone_math: 1, stone_english: 1 } });
  assert.equal(renameFusionRule(p, '25-1', '번개씨').ok, false, '아직 안 만든 퓨전');
  fuseRule(p, 25, 1, OPEN);
  assert.deepEqual(renameFusionRule(p, '25-1', '  번개씨  ', 50), { ok: true, name: '번개씨' });
  assert.deepEqual([p.fusions['25-1'].name, p.fusions['25-1'].nameAt], ['번개씨', 50]);
  renameFusionRule(p, '25-1', '', 60);
  assert.equal(p.fusions['25-1'].name, undefined, '빈 이름이면 원래 이름(피카씨)으로');
  assert.equal(p.fusions['25-1'].nameAt, 60);
});

test('🔀 백업 병합: 퓨전에 넣은 포켓몬이 옛 백업으로 되살아나지 않는다(max) · 퓨전 도감 합치기 · 복사본은 따로', () => {
  const p = prof({ caught: { 7: 1, 4: 1 }, items: { stone_math: 1, stone_english: 1 }, updatedAt: 100 });
  const backup = cloneProfile(p);
  fuseRule(p, 7, 4, OPEN, 200);
  p.updatedAt = 300;
  for (const [cur, rec] of [[p, backup], [backup, p]]) {
    const m = mergeStatRecord('profile', cur, rec);
    assert.equal(haveOf(m.caught[7], m.mons[7]), 0, '옛 백업(퓨전 전)을 합쳐도 꼬부기가 둘이 되지 않는다');
    assert.equal(fusionHeld(m.fusions['7-4']), 1, '퓨전은 남는다');
  }
  // 분리한 뒤 옛 백업(퓨전한 상태)을 합쳐도 분리가 되돌려지지 않는다
  const fusedBackup = cloneProfile(p);
  unfuseRule(p, '7-4', OPEN);
  p.updatedAt = 400;
  const m2 = mergeStatRecord('profile', p, fusedBackup);
  assert.equal(fusionHeld(m2.fusions['7-4']), 0);
  assert.equal(haveOf(m2.caught[7], m2.mons[7]), 1, '분리해 돌아온 꼬부기 그대로');
  // 이름은 나중에 고친 쪽, 처음 만든 때는 이른 쪽
  const mf = mergeFusions({ '1-2': { made: 1, split: 0, at: 50, name: '가', nameAt: 10 } }, { '1-2': { made: 2, split: 1, at: 40, name: '나', nameAt: 20 } });
  assert.deepEqual(mf['1-2'], { a: 1, b: 2, made: 2, split: 1, at: 40, name: '나', nameAt: 20 });
  assert.deepEqual(mergeFusions({ bad: { made: 1 } }, {}), {}, '모양이 이상한 id는 버린다');
  const c = copyFusions(p.fusions); c['7-4'].made = 99;
  assert.notEqual(p.fusions['7-4'].made, 99, '복사본을 고쳐도 원본은 그대로');
  assert.deepEqual(emptyProfile().fusions, {});
});

test('🔀 다른 규칙과 함께: 퓨전에 들어간 포켓몬은 진화·데려가기에서 빠진다 (보유 수 하나로)', () => {
  const p = prof({ caught: { 7: 1, 4: 1 }, items: { stone_math: 1, stone_english: 1 }, mons: { 7: { lv: 5 } } });
  fuseRule(p, 7, 4, OPEN);
  assert.equal(evolveRule(p, 7, 8, 100).ok, false, '퓨전에 들어간 꼬부기는 진화 못 한다');
  assert.equal(takeMonRule(p, 4, 1).ok, false, '퓨전에 들어간 파이리는 아빠가 데려갈 수 없다');
  assert.equal(fusionId(25, 1), '25-1');
  assert.deepEqual(parseFusionId('25-1'), { a: 25, b: 1 });
  assert.equal(parseFusionId('25'), null);
});

// ── 🎨 그림 (순수): 앞의 모양 + 뒤의 색 ──
function img(w, h, paint) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [r, g, b, a] = paint(x, y); const i = (y * w + x) * 4; data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = a; }
  return { data, width: w, height: h };
}
const at = (d, x, y) => Array.from(d.data.slice((y * d.width + x) * 4, (y * d.width + x) * 4 + 4));

test('🎨 모양 + 색: 앞의 모양(투명·테두리·흰 빛·크림)은 그대로, 몸 색은 뒤의 색 계열로 · 명암은 앞 것', () => {
  // 앞: 노란 원(밝은 쪽·어두운 쪽) + 검은 테두리 + 흰 빛 + 크림 배, 바깥은 투명
  const A = img(20, 20, (x, y) => {
    const d = Math.hypot(x - 10, y - 10);
    if (d > 9) return [0, 0, 0, 0];
    if (d > 8) return [40, 20, 10, 255];               // 테두리 — 진짜 그림처럼 짙은 갈색(채도는 있다, 밝기 0.1) — 순수 검정이면 채도 규칙만으로 남아 테두리 규칙을 못 본다 (변이가 지나갔다)
    if (x === 10 && y === 6) return [250, 250, 250, 255]; // 흰 빛
    if (y > 13) return [200, 195, 190, 255];            // 회색빛 배 (채도 0.08 — HSL은 밝을수록 채도가 부풀어 [235,225,200]은 0.47이다)
    return y < 10 ? [250, 210, 60, 255] : [200, 160, 30, 255]; // 노랑 (밝은·어두운)
  });
  const B = img(20, 20, (x, y) => (Math.hypot(x - 10, y - 10) > 9 ? [0, 0, 0, 0] : [60, 120, 220, 255])); // 파랑
  const F = recolor(A, B);
  assert.deepEqual(at(F, 0, 0), at(A, 0, 0), '투명은 그대로');
  assert.deepEqual(at(F, 10, 1), at(A, 10, 1), '검은 테두리는 그대로');
  assert.deepEqual(at(F, 10, 6), at(A, 10, 6), '흰 빛은 그대로');
  assert.deepEqual(at(F, 10, 15), at(A, 10, 15), '회색빛(채도 낮음)은 그대로');
  const hueOf = (p) => toHsl(p[0], p[1], p[2])[0];
  const blue = hueOf([60, 120, 220]);
  for (const [x, y] of [[10, 4], [10, 12]]) assert.ok(Math.abs(hueOf(at(F, x, y)) - blue) < 0.03, `(${x},${y}) 몸이 파란 계열`);
  const L = (p) => toHsl(p[0], p[1], p[2])[2];
  assert.ok(L(at(F, 10, 4)) > L(at(F, 10, 12)), '밝은 곳은 밝게, 어두운 곳은 어둡게 (앞의 명암)');
  assert.equal(F.data.length, A.data.length);
  assert.notEqual(F.data, A.data, '앞 그림을 고치지 않고 새 그림');
});

test('🎨 앞의 큰 부분에 뒤의 작은 장식 색(눈·볼)을 입히지 않는다 · 비슷한 색은 한 계열 · 색 없는 그림은 그대로', () => {
  // 앞: 파랑 몸(60%, 첫째 계열) + 노란 배(40%, 둘째 계열 — 15%보다 크다). 뒤: 주황 몸(아주 큼) + 파란 눈(아주 작음, 둘째 계열)
  // ★ 둘의 크기가 같으면 계열 순서가 우연히 맞아 규칙을 빼도 지나간다 (변이가 지나갔다) → 배를 둘째 계열로
  const A = img(20, 20, (x, y) => (y < 12 ? [60, 140, 220, 255] : [230, 200, 80, 255]));
  const B = img(20, 20, (x, y) => (x === 0 && y === 0 ? [40, 90, 230, 255] : [240, 130, 50, 255]));
  const F = recolor(A, B);
  const hueOf = (p) => toHsl(p[0], p[1], p[2])[0];
  const orange = hueOf([240, 130, 50]);
  assert.ok(Math.abs(hueOf(at(F, 5, 15)) - orange) < 0.05, '노란 배(큰 부분)는 파란 눈 색이 아니라 주황 쪽');
  // 초록과 청록빛 초록(15° 차이 — 25° 안)은 한 계열, 초록과 파랑(멀다)은 두 계열
  const G = img(10, 10, (x) => (x < 5 ? [60, 180, 80, 255] : [60, 180, 110, 255]));
  assert.equal(hueGroups(G).length, 1, '초록·청록빛 초록 = 한 계열');
  const GB = img(10, 10, (x) => (x < 5 ? [60, 180, 80, 255] : [60, 90, 220, 255]));
  assert.equal(hueGroups(GB).length, 2, '초록·파랑 = 두 계열');
  const grey = img(5, 5, () => [128, 128, 128, 255]);
  assert.deepEqual(Array.from(recolor(grey, B).data), Array.from(grey.data), '색 없는 그림은 그대로');
});

test('🔀 연결: 저장 규칙이 쓰는 비용·장날 · 앱 셸 · 화면 파일 (화면 연결은 marketview 테스트가 따로)', () => {
  const db = src('js/db.js');
  assert.match(db, /if \(!marketOpen\(dateKey\)\) return \{ ok: false, why: 'closed' \};/);
  assert.match(db, /purchaseRule\(profile, \{ items: \{ \.\.\.FUSION_COST \} \}, \{\}\)/, '스톤만 (coins 없음)');
  assert.match(db, /for \(const k of \['fused', 'unfused', 'fled', 'traded', 'sold'\]\)/, '병합은 max (⚔️ 배틀에서 떠난 수도 · 🤝 상인에게 보낸 수도 · 💰 판 수도)');
  assert.match(db, /out\.fusions = mergeFusions\(cur\.fusions, rec\.fusions\);/);
  assert.match(src('js/evolve.js'), /return Math\.max\(0, got - out - gone - fusedOf\(mon\) - fledOf\(mon\) - tradedOf\(mon\) - soldOf\(mon\)\);/, '퓨전·배틀에서 떠난 수·상인에게 보낸 수·💰 판 수까지 뺀다');
  const xp = src('js/xp.js');
  assert.match(xp, /fusions: copyFusions\(p\.fusions\)/, '메모리 프로필도 퓨전을 복사');
});

test('🏪 화면 연결 — 오늘 날짜로 판정 · 장이 닫히면 섞기·나누기 막음 · 고르기는 데리고 있는 것만(다른 칸 종 빼고) · 나누기는 두 번 · 도감에서 열고 닫으면 다시 그림', () => {
  const v = src('js/marketview.js');
  // Codex 30차 #1 — 창을 연 날을 들고 있지 않고 누를 때마다 오늘을 다시 읽는다 (자정을 넘겨도 장이 열린 채였다)
  assert.match(v, /ui\.override = opts\.today \|\| null;/, '시험용 날짜만 따로');
  assert.match(v, /function dayNow\(\) \{\s*return ui\.override \|\| todayKey\(\);\s*\}/);
  assert.ok(!/ui\.today/.test(v), '연 날짜를 들고 있는 곳이 없다');
  assert.match(v, /async function doFuse\(\) \{\s*if \(ui\.busy \|\| !ui\.a \|\| !ui\.b\) return;\s*const day = dayNow\(\);\s*if \(!stillOpen\(day\)\)/, '섞기 전에 지금 날짜로 장날 확인');
  assert.match(v, /const r = await fuseMons\(a, b, day\);/, '저장에도 그 날짜');
  assert.match(v, /const day = dayNow\(\);\s*if \(!stillOpen\(day\)\) \{ say\('🏪 장이 닫혔어요 — 다음 장날에 나눌 수 있어요'\)/, '나누기도 지금 날짜');
  assert.match(v, /ROSTER\.filter\(\(m\) => m\.id !== other && haveCount\(m\.id\) > 0\)/, '데리고 있는 것만, 다른 칸 종은 빼고');
  assert.match(v, /b\.addEventListener\('click', async \(\) => \{\s*if \(ui\.busy\) return;\s*if \(!\(ui\.splitArm && ui\.splitArm\.fid === f\.fid && Date\.now\(\) - ui\.splitArm\.at < 5000\)\) \{\s*ui\.splitArm = \{ fid: f\.fid, at: Date\.now\(\) \};/, '나누기는 5초 안에 두 번 — 누르는 곳의 판정 (같은 조건이 버튼 글자에도 있어 그쪽만 보면 변이가 지나갔다)');
  assert.match(v, /const r = await unfuseMon\(f\.fid, day\);/);
  assert.match(v, /const close = \(\) => \{ if \(!ui\.busy\) closeMarket\(\); \};/, '저장 중에는 닫지 않는다');
  assert.match(v, /try \{ await putFusionArt\(fid, blob\); \}/, '만든 그림은 이 기기에 둔다');
  assert.match(v, /const F = recolor\(A, B\);/, '그림은 fusion.recolor (모양 A + 색 B)');
  assert.match(v, /input\.maxLength = NAME_MAX;/);
  assert.match(v, /const iga = \(w\) => \(jong\(w\) > 0 \? '이' : '가'\);/);
  assert.match(v, /const euro = \(w\) => \(jong\(w\) > 0 && jong\(w\) !== 8 \? '으로' : '로'\);/, 'ㄹ 받침은 "로"');
  const pd = src('js/pokedex.js');
  assert.match(pd, /openMarket\(\{ onClose: \(\) => \{ if \(!\$\('view-pokedex'\)\.hidden\) openPokedex\(\{ keepBack: true \}\); \} \}\);/, '닫으면 도감을 다시 그린다 (돌아갈 화면은 그대로)');
  assert.match(pd, /if \(!\(opts && opts\.keepBack\)\) backTo = visibleView\(\);/);
  assert.match(pd, /fusedOf\(p\.mons\[m\.id\]\) > 0 \? '🔀' : fledOf\(p\.mons\[m\.id\]\) > 0 \? '💨' : '🧬'/, '퓨전에 들어간 종은 🔀, 배틀에서 떠난 종은 💨');
  assert.match(pd, /initMarket\(\);/);
  assert.match(src('js/shop.js'), /fusedCount\(mon\.id\) > 0 \? '🔀 퓨전에 들어가 있어요 — 🏪 5일장에서 나누면 돌아와요'/);
  assert.match(src('index.html'), /<div id="market" class="modal" hidden>/);
  const sw = src('sw.js');
  for (const f of ['./js/fusion.js', './js/marketview.js']) assert.ok(sw.includes(`'${f}'`), `APP_SHELL에 ${f}`);
});

test('🔍 Codex 30차 — ② 배틀에서 떠난 수는 단조 카운터 · ③ 원래 이름으로 되돌린 때도 남는다 · ④ 나누면 파트너 다시 · ⑤ 입력칸은 누른 곳에만 · ⑥ 그림은 섞은 것만 기기에, 미리 보기는 8장', () => {
  // ② Codex 재현: 꼬부기 둘 + 파이리 → 꼬부기 하나를 퓨전 → 백업 → 남은 꼬부기가 배틀에서 떠남 → 그 백업을 합친다
  const p = prof({ caught: { 7: 2, 4: 1 }, items: { stone_math: 1, stone_english: 1 }, updatedAt: 1 });
  fuseRule(p, 7, 4, OPEN);
  p.updatedAt = 2;
  const backup = cloneProfile(p);
  battleLossRule(p, 7, 1);
  p.updatedAt = 3;
  assert.equal(haveOf(p.caught[7], p.mons[7]), 0);
  for (const [cur, rec] of [[p, backup], [backup, p]]) {
    const m = mergeStatRecord('profile', cur, rec);
    assert.equal(haveOf(m.caught[7], m.mons[7]), 0, '떠난 꼬부기가 옛 백업으로 돌아오지 않는다');
    assert.equal(fusionHeld(m.fusions['7-4']), 1, '퓨전은 그대로');
  }
  // ③ 이름 "old"(20) → 원래 이름으로(30) → 옛 백업을 두 번 합쳐도 원래 이름
  const named = { '1-2': { made: 1, split: 0, at: 1, name: 'old', nameAt: 20 } };
  const reset = { '1-2': { made: 1, split: 0, at: 1, nameAt: 30 } };
  const once = mergeFusions(reset, named);
  assert.deepEqual([once['1-2'].name, once['1-2'].nameAt], [undefined, 30], '되돌린 때를 남긴다');
  const twice = mergeFusions(once, named);
  assert.equal(twice['1-2'].name, undefined, '두 번째로 합쳐도 옛 이름이 안 돌아온다');
  assert.deepEqual(mergeFusions(once, once)['1-2'], once['1-2'], '같은 것끼리 합쳐도 그대로');
  // ④ 나눈 뒤에도 파트너를 다시 정한다
  assert.match(src('js/xp.js'), /applyUnfuse\(fid, dateKey\), \(\) => \(\{ ok: false, why: 'save' \}\)\);\s*if \(r && r\.ok\) ensurePartner\(\);/);
  // ⑤ 이름 입력칸은 누른 자리(결과/도감)에만
  const v = src('js/marketview.js');
  assert.match(v, /nameRow\(f, 'result'\)/);
  assert.match(v, /nameRow\(f, 'dex'\)/);
  assert.match(v, /if \(ui\.renaming && ui\.renaming\.fid === f\.fid && ui\.renaming\.where === where\)/);
  assert.match(v, /input\.id = `market-rename-\$\{where\}`;/, '입력칸 id가 겹치지 않는다');
  // ⑥ 그림: 섞은 퓨전만 기기에, 미리 보기는 메모리에 8장(오래된 주소는 돌려준다), 한 장씩 차례로, 저장 이름에 판 번호
  assert.match(v, /const PREVIEW_MAX = 8;/);
  assert.match(v, /while \(previews\.size > PREVIEW_MAX\) \{[\s\S]{0,160}URL\.revokeObjectURL\(rec\.url\);/);
  assert.match(v, /fusionFigure\(ui\.a, ui\.b, ui\.urlById, 'fz-art big', false\)/, '미리 보기는 저장하지 않는다');
  assert.match(v, /if \(!made\) \{\s*const blob = await makeArt\(a, b, urlById\);\s*return blob \? keepPreview\(fid, blob\) : null;\s*\}/, '미리 보기 길에는 putFusionArt가 없다');
  assert.match(v, /const job = artQueue\.then\(/, '한 장씩');
  assert.match(src('js/db.js'), /export const fusionArtKey = \(fid\) => `fusion:v1:\$\{fid\}`;/, '판 번호');
});
