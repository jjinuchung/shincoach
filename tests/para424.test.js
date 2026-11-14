// ⏳ 패러독스 등급 칸 (v424 — 진우 신청 · 아버님 「추천대로」): node --test tests/para424.test.js
// 🌌처럼 ⭐ 밖에 선 칸이지만 **보여 주는 칸** — 아빠가 옮긴 포켓몬만(mons[id].para) · 잡기 확률·값·교환·배틀은 원래 ⭐(rarityOf) 그대로
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { cloneProfile, emptyProfile, mergeStatRecord } from '../js/db.js';
import {
  initProfile, flushProfile, reloadProfile, RARITY, RARITY_UB, RARITY_PARA, rarityOf, rarityIn, shownRarity, shownIn, catchChance,
  askRarity, rarityAskOf, listRarityAsks, decideRarity, resetRarity,
} from '../js/xp.js';
import { ROSTER } from '../js/pokemon.js';
import { APP_VERSION } from '../js/version.js';

const src = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const stored = () => fakeIdb.get('profile', 'me');
const VALIANT = 1006; // 무쇠무인 — 원작 패러독스 · 앱 ⭐⭐⭐ 희귀(🎹 음악)
const KORAIDON = 1007; // 코라이돈 — 앱 ⭐⭐⭐⭐ 전설(🔢 수학)
const BULBA = 1; // 이상해씨 — ⭐ 흔함

test('⏳ 등급 표 — RARITY[6] 패러독스 · 셈 값(base) 없음 · rarityOf는 6을 안 돌려준다 · 처음엔 아무도 ⏳가 아니다', async () => {
  await initProfile();
  resetRarity();
  assert.equal(RARITY_UB, 5);
  assert.equal(RARITY_PARA, 6);
  assert.deepEqual(RARITY[RARITY_PARA], { stars: '⏳', label: '패러독스', para: true });
  assert.equal(RARITY[RARITY_PARA].base, undefined, '셈에 안 쓴다');
  for (const m of ROSTER) {
    const r = rarityOf(m.id);
    assert.ok(r >= 1 && r <= RARITY_UB, `${m.id} ${r}`);
    assert.equal(shownRarity(m.id), r, `${m.id} — 아빠가 옮기기 전엔 보여 주는 등급 = 셈 등급`);
  }
  assert.deepEqual([rarityOf(VALIANT), rarityOf(KORAIDON), rarityOf(BULBA)], [3, 4, 1]);
});

test('⏳ 신청 → 아빠 승인 — 보여 주는 칸만 ⏳ · 셈(잡기 확률)은 원래 ⭐ 그대로 · 거절하면 신청만 사라짐 · ⏳에서 ⏳를 고르면 신청 취소', async () => {
  await initProfile();
  resetRarity();
  assert.equal(askRarity(VALIANT, RARITY_PARA), RARITY_PARA);
  assert.equal(rarityAskOf(VALIANT), RARITY_PARA);
  assert.equal(shownRarity(VALIANT), 3, '신청만으로는 안 옮겨진다');
  assert.deepEqual(listRarityAsks().find((a) => a.id === VALIANT), { id: VALIANT, from: 3, to: RARITY_PARA });
  assert.equal(decideRarity(VALIANT, false), null);
  assert.equal(rarityAskOf(VALIANT), null);
  assert.equal(shownRarity(VALIANT), 3);

  askRarity(VALIANT, RARITY_PARA);
  const chance = catchChance(rarityOf(VALIANT), 5);
  assert.equal(decideRarity(VALIANT, true), RARITY_PARA);
  assert.equal(shownRarity(VALIANT), RARITY_PARA, '도감 칸·이름표는 ⏳');
  assert.equal(rarityOf(VALIANT), 3, '셈 등급은 ⭐⭐⭐ 그대로');
  assert.equal(catchChance(rarityOf(VALIANT), 5), chance, '잡기 확률 그대로');
  assert.equal(rarityAskOf(VALIANT), null);

  askRarity(KORAIDON, RARITY_PARA);
  decideRarity(KORAIDON, true);
  assert.deepEqual([shownRarity(KORAIDON), rarityOf(KORAIDON)], [RARITY_PARA, 4], '전설을 옮겨도 3% 그대로 — 옮기기만으로 쉬워지지 않는다');

  assert.equal(askRarity(VALIANT, RARITY_PARA), null, '지금 칸과 같으면 신청 취소');
  assert.equal(rarityAskOf(VALIANT), null);
  assert.equal(listRarityAsks().some((a) => a.id === VALIANT), false);
  assert.equal(resetRarity(), 2, '⏳만 든 둘(옮긴 ⭐ 없음)도 초기화에 센다');
  assert.deepEqual([shownRarity(VALIANT), shownRarity(KORAIDON)], [3, 4], '⏳만 들었던 것도 원래 칸으로');
});

test('⏳에서 ⭐로 — ⏳에 든 포켓몬이 ⭐를 고르면 빼 달라는 신청(셈 ⭐와 같아도) · 승인하면 para를 빼고 그 ⭐로 · 옮긴 ⭐는 ⏳로 가도 그대로 · ⚙ 초기화는 ⏳까지', async () => {
  await initProfile();
  resetRarity();
  askRarity(VALIANT, RARITY_PARA);
  decideRarity(VALIANT, true);
  assert.equal(askRarity(VALIANT, 3), 3, '셈 ⭐⭐⭐과 같아도 지금 칸(⏳)과 다르니 신청');
  assert.deepEqual(listRarityAsks().find((a) => a.id === VALIANT), { id: VALIANT, from: RARITY_PARA, to: 3 });
  assert.equal(decideRarity(VALIANT, true), 3);
  assert.deepEqual([shownRarity(VALIANT), rarityOf(VALIANT)], [3, 3]);

  askRarity(VALIANT, RARITY_PARA);
  decideRarity(VALIANT, true);
  askRarity(VALIANT, 1);
  assert.equal(decideRarity(VALIANT, false), null, '거절하면 ⏳ 그대로');
  assert.equal(shownRarity(VALIANT), RARITY_PARA);
  askRarity(VALIANT, 1);
  decideRarity(VALIANT, true);
  assert.deepEqual([shownRarity(VALIANT), rarityOf(VALIANT)], [1, 1], '다른 ⭐면 셈도 그 ⭐로(지금 등급 옮기기와 같다)');

  askRarity(VALIANT, RARITY_PARA);
  decideRarity(VALIANT, true);
  assert.deepEqual([shownRarity(VALIANT), rarityOf(VALIANT)], [RARITY_PARA, 1], '아빠가 옮긴 ⭐는 ⏳로 가도 셈에 남는다');

  askRarity(BULBA, RARITY_PARA); // 신청만 있는 것도
  assert.ok(resetRarity() >= 2);
  assert.deepEqual([shownRarity(VALIANT), rarityOf(VALIANT)], [3, 3], '명단 등급으로');
  assert.equal(rarityAskOf(BULBA), null);
});

test('⏳ 잘못된 값 — 🌌(5)·7·0·문자열·소수·null은 신청이 안 된다', async () => {
  await initProfile();
  resetRarity();
  for (const v of [0, RARITY_UB, 7, '6', 6.5, null, undefined]) assert.equal(askRarity(BULBA, v), null, String(v));
  assert.equal(rarityAskOf(BULBA), null);
  assert.equal(decideRarity(BULBA, true), null, '신청이 없으면 아무 일도 없다');
  assert.equal(shownRarity(BULBA), 1);
});

test('shownIn — 순수: para 1만 ⏳ · 옮긴 ⭐는 그 ⭐ · 없는 프로필은 명단 등급 · 셈(rarityIn)은 para를 모른다', () => {
  const pf = emptyProfile();
  assert.equal(shownIn(pf, VALIANT), 3);
  assert.equal(shownIn({ mons: { [VALIANT]: { para: 1 } } }, VALIANT), RARITY_PARA);
  assert.equal(rarityIn({ mons: { [VALIANT]: { para: 1 } } }, VALIANT), 3);
  assert.equal(shownIn({ mons: { [VALIANT]: { para: null, rarity: 2 } } }, VALIANT), 2);
  assert.equal(shownIn({ mons: { [VALIANT]: { para: true } } }, VALIANT), 3, '1만 ⏳');
  assert.equal(shownIn({ mons: { [VALIANT]: { para: 1, rarity: 1 } } }, VALIANT), RARITY_PARA);
  assert.equal(rarityIn({ mons: { [VALIANT]: { para: 1, rarity: 1 } } }, VALIANT), 1);
  assert.equal(shownIn(null, VALIANT), 3);
});

test('★ 저장 — 신청·승인한 ⏳가 저장소(rarityAsk·para)에 · 앱을 다시 열어도 ⏳ · 저장된 프로필로 하는 셈은 ⭐ · 복사·옛 백업 병합이 안 지움 · 초기화도 저장소에서', async () => {
  await initProfile();
  resetRarity();
  await flushProfile();
  askRarity(VALIANT, RARITY_PARA);
  await flushProfile();
  assert.equal(stored().mons[VALIANT].rarityAsk, RARITY_PARA, '신청도 저장');
  decideRarity(VALIANT, true);
  await flushProfile();
  assert.equal(stored().mons[VALIANT].para, 1);
  assert.equal(stored().mons[VALIANT].rarityAsk, null);
  await reloadProfile();
  assert.equal(shownRarity(VALIANT), RARITY_PARA, '다시 열어도');
  assert.equal(rarityIn(stored(), VALIANT), 3, '저장된 프로필로 하는 셈(교환·로켓단·팔기)은 ⭐⭐⭐');
  assert.equal(shownIn(stored(), VALIANT), RARITY_PARA);
  assert.equal(cloneProfile(stored()).mons[VALIANT].para, 1, '프로필 복사가 지우지 않는다');
  const now = cloneProfile(stored());
  const older = { ...cloneProfile(stored()), mons: {}, updatedAt: 1 };
  assert.equal(mergeStatRecord('profile', older, now).mons[VALIANT].para, 1, '옛 백업과 합쳐도(최근 쪽 mons)');
  assert.equal(mergeStatRecord('profile', now, older).mons[VALIANT].para, 1, '차례가 바뀌어도');
  // ⏳에서 ⭐로 뺀 것도 저장소에서 — 다시 열었을 때 ⏳로 돌아오지 않게
  askRarity(VALIANT, 2);
  decideRarity(VALIANT, true);
  await flushProfile();
  assert.deepEqual([stored().mons[VALIANT].para, stored().mons[VALIANT].rarity], [null, 2]);
  await reloadProfile();
  assert.deepEqual([shownRarity(VALIANT), rarityOf(VALIANT)], [2, 2], '다시 열어도 ⭐⭐');
  askRarity(VALIANT, RARITY_PARA);
  decideRarity(VALIANT, true);
  await flushProfile();
  resetRarity();
  await flushProfile();
  assert.equal(stored().mons[VALIANT].para, null);
  await reloadProfile();
  assert.equal(shownRarity(VALIANT), 3);
});

test('★ 🔍 Codex 227차 P2-1 — 오래된 창의 결정은 바뀌는 칸만 저장: 다른 창이 승인한 ⏳·⭐를 늦은 거절이 되돌리지 않는다 · ⏳ 승인은 옮긴 ⭐를 안 건드림', async () => {
  await initProfile();
  resetRarity();
  await flushProfile();
  const otherWindow = (patch) => {
    const s = stored();
    fakeIdb.put('profile', { ...s, mons: { ...s.mons, [VALIANT]: { ...(s.mons[VALIANT] || {}), ...patch } }, updatedAt: (s.updatedAt || 0) + 1 });
  };
  // ① 이 창과 다른 창이 같은 ⏳ 신청을 본다 → 다른 창이 승인 → 이 창(옛 화면)이 거절
  askRarity(VALIANT, RARITY_PARA);
  await flushProfile();
  otherWindow({ para: 1, rarityAsk: null });
  assert.equal(rarityAskOf(VALIANT), RARITY_PARA, '이 창은 아직 신청을 들고 있다');
  decideRarity(VALIANT, false);
  await flushProfile();
  assert.equal(stored().mons[VALIANT].para, 1, '늦은 거절이 ⏳ 승인을 지우지 않는다');
  assert.equal(shownRarity(VALIANT), RARITY_PARA, '저장소를 받아 이 창도 ⏳');

  // ② ⭐ 신청 — 다른 창이 승인(⏳ 빼고 흔함) → 이 창이 거절해도 흔함 그대로 · ⏳가 되살아나지 않는다
  askRarity(VALIANT, 1);
  await flushProfile();
  otherWindow({ para: null, rarity: 1, rarityAsk: null });
  decideRarity(VALIANT, false);
  await flushProfile();
  assert.deepEqual([stored().mons[VALIANT].para, stored().mons[VALIANT].rarity], [null, 1], '늦은 거절이 ⭐ 승인을 되돌리지 않고 ⏳도 되살리지 않는다');
  assert.deepEqual([shownRarity(VALIANT), rarityOf(VALIANT)], [1, 1]);

  // ③ ⏳ 승인은 para만 — 그사이 다른 창이 옮긴 ⭐(보통)를 이 창의 옛 ⭐(흔함)로 덮지 않는다
  askRarity(VALIANT, RARITY_PARA);
  await flushProfile();
  otherWindow({ rarity: 2 });
  decideRarity(VALIANT, true);
  await flushProfile();
  assert.deepEqual([stored().mons[VALIANT].para, stored().mons[VALIANT].rarity], [1, 2]);
  assert.deepEqual([shownRarity(VALIANT), rarityOf(VALIANT)], [RARITY_PARA, 2]);
  resetRarity();
  await flushProfile();
});

test('화면 배선 — 도감 ⏳ 칸(비어도 보임 · 한 줄 안내) · 정보 창 신청 단추 · 이름표는 보여 주는 등급 · 셈 규칙 파일은 보여 주는 등급을 안 씀 · 📊 한 줄', () => {
  const dex = src('js/pokedex.js');
  assert.match(dex, /for \(const r of \[1, 2, 3, 4, RARITY_UB, RARITY_PARA\]\) \{\n    const list = unlocked\.filter\(\(m\) => shownRarity\(m\.id\) === r\);/);
  assert.match(dex, /if \(!list\.length && !para\) continue;/, '⏳ 칸은 비어도 보인다');
  assert.match(dex, /⏳ 고대·미래에서 온 포켓몬 칸이에요 — 포켓몬을 눌러 ⭐ 등급에서 ⏳ 패러독스를 고르면 아빠에게 보내져요/);
  assert.match(dex, /⏳ 고대·미래에서 온 포켓몬 칸이에요 — 아빠가 옮겨 준 포켓몬이 여기 모여요/);
  assert.match(src('css/style.css'), /\.pokedex-para \{[^}]+\}\n\.pokedex-para h2 \{[^}]+\}\n\.pokedex-para-note \{/);

  const shop = src('js/shop.js');
  assert.match(shop, /  const r = shownRarity\(mon\.id\);/);
  assert.match(shop, /for \(const want of \[1, 2, 3, 4, RARITY_PARA\]\) \{/);
  assert.match(shop, /const rar = toS === myS \? RARITY\[toS\]\.stars : `\$\{RARITY\[myS\]\.stars\}→\$\{RARITY\[toS\]\.stars\}`;/);
  assert.match(shop, /  const myS = shownRarity\(mon\.id\);/);
  assert.match(shop, /    const toS = shownRarity\(e\.to\);\n/);
  assert.match(shop, /'mon-evo-btn' \+ \(toR < myR \? ' evo-down' : ''\)/, '내려감 표시는 셈 등급으로');

  assert.match(src('js/catch.js'), /const r = shownRarity\(c\.id\);[^\n]*\n[\s\S]*?rr\.textContent = `\$\{RARITY\[r\]\.stars\} \$\{RARITY\[r\]\.label\}`;/);
  assert.match(src('js/pianoview.js'), /const rank = RARITY\[shownRarity\(id\)\] \|\| RARITY\[2\];/);
  assert.match(src('js/math.js'), /const rare = \(c\) => rarityOf\(c\.id\) >= 3;/, '레이더가 고르는 것은 셈 등급');
  assert.match(src('js/math.js'), /const rr = RARITY\[shownRarity\(pick\.id\)\];/);
  assert.match(src('js/battle.js'), /RARITY\[shownRarity\(o\.opponent\.id\)\]\.stars/);
  assert.match(src('js/battle.js'), /const w = \[0, 6, 4, 2, 1\]\[rarityOf\(m\.id\)\] \|\| 2;/, '배틀 상대 고르기는 셈 등급');
  const taken = src('js/taken.js');
  assert.equal((taken.match(/shownRarity\(id\)/g) || []).length, 2);
  assert.match(taken, /    const r = shownRarity\(id\);\n    if \(!byRarity\.has\(r\)\)/, '데려가기 칸 나누기');
  assert.match(taken, /const info = RARITY\[shownRarity\(id\)\] \|\| \{ stars: '' \};/, '정말 데려갈까요 목록');
  assert.doesNotMatch(taken, /rarityOf/);

  const stats = src('js/stats.js');
  assert.match(stats, /if \(asks\.some\(\(a\) => a\.to === RARITY_PARA\)\) cR\.appendChild\(el\('p', 'stats-note', '⏳ 패러독스는 도감에서 따로 모이는 칸이에요 — 옮겨도 잡기 확률·값·교환은 원래 ⭐ 등급 그대로예요\.'\)\);/);
  assert.match(stats, /const keep = a\.to === RARITY_PARA \? RARITY\[rarityOf\(a\.id\)\] : null;/);

  // 셈 규칙은 보여 주는 등급을 모른다 — 옮기기만으로 확률·값·교환·로켓단·알·대여행이 바뀌지 않게
  for (const f of ['js/rocket.js', 'js/sell.js', 'js/trade.js', 'js/egg.js', 'js/journey.js', 'js/moveday.js', 'js/journeyview.js', 'js/moveview.js', 'js/marketview.js', 'js/db.js']) {
    assert.doesNotMatch(src(f), /shownRarity|shownIn|RARITY_PARA/, f);
  }
  const xp = src('js/xp.js');
  assert.equal((xp.match(/shownRarity\(/g) || []).length, 3, 'xp 안에선 정의·신청·목록에만');
  assert.match(xp, /const chance = ballChance\(used\.id, rarityOf\(id\), level, isUltraBeast\(id\)\);/);
  assert.match(xp, /rarity: \(id\) => rarityIn\(pf, Number\(id\)\),/);
});

test('판 — v424 이상', () => {
  assert.ok(Number(APP_VERSION.slice(1)) >= 424, APP_VERSION);
  assert.match(src('sw.js'), /CACHE_VERSION = 'v4(2[4-9]|[3-9]\d)'/);
});
