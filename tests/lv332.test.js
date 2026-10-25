// 🧬 포켓몬 만렙 12 → 100 · 🎖️ 축하 레벨 · 🎈 열기구 손질 (v332 · 2026-10-25 아버님 "100레벨이 만렙으로" · "열기구가 너무 쉬운 것 같으니" → 기본안 "이대로")
// node --test tests/lv332.test.js — 규칙 숫자는 evolve.test·candy275·minigame310이 보고, 여기서는 이어지는 길과 화면 연결을 본다
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MAX_LV, lvOf, nextCost, levelCapOf, lvMarkCrossed, lvMult } from '../js/evolve.js';
import { cloneProfile, emptyProfile, levelUpRule, mergeStatRecord } from '../js/db.js';
import { DAMAGE, BATTLE, attackMult, palDamage, damageForTier } from '../js/battle.js';
import { GAMES } from '../js/minigame.js';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const P = (over = {}) => cloneProfile({ ...emptyProfile(), ...over });
const SNORLAX = 143; // 잠만보 — 진화 없음 (영어 포켓몬 → 🔶)

test('🧬 옛 만렙 Lv12인 포켓몬이 그대로 이어서 큰다 — 저장된 레벨을 옮기지 않는다 · 한 칸씩 Lv100까지 · 그 위는 없음', () => {
  const p = P({ caught: { [SNORLAX]: 1 }, coins: 1e6, items: { stone_english: 1000 }, mons: { [SNORLAX]: { lv: 12 } } });
  const first = levelUpRule(p, SNORLAX, 'stone_english');
  assert.deepEqual(first, { ok: true, from: 12, to: 13, cost: { coins: 50, items: { stone_english: 1 } } });
  let n = 1;
  while (levelUpRule(p, SNORLAX, 'stone_english').ok) n += 1;
  assert.equal(n, 88, '13부터 100까지 88칸');
  assert.equal(p.mons[SNORLAX].lv, 100);
  assert.equal(1000 - p.items.stone_english, 258, '기본안 그대로 스톤 258');
  assert.equal(1e6 - p.coins, 10100, '💰 10,100');
  assert.equal(p.stonesSpent, 258, '📊 쓴 스톤도 그대로 센다');
  assert.deepEqual(levelUpRule(p, SNORLAX, 'stone_english'), { ok: false, why: 'max' });
});

test('🧬 진화하는 종은 예전처럼 진화 레벨(5·10)에서 멈춘다 — 마지막 모습만 100까지', () => {
  assert.deepEqual([levelCapOf(7), levelCapOf(8), levelCapOf(9)], [5, 10, MAX_LV], '꼬부기 · 어니부기 · 거북왕');
  assert.equal(nextCost(5, 7), null);
  assert.equal(nextCost(10, 8), null);
  assert.deepEqual(nextCost(12, 9), { toLv: 13, stones: 1, coins: 50 }, '거북왕 Lv12 → 13');
  assert.equal(lvOf({ lv: 12 }), 12, '저장된 12는 12로');
});

test('💾 백업 병합 (🔍 Codex 136차 #1): 깨진 레벨(무한대)이 정상 레벨을 덮지 않는다 — 어느 쪽이 최근이든 · 저장 값도 정상 숫자로', () => {
  for (const broken of ['1e309', Infinity]) {
    const good = P({ caught: { [SNORLAX]: 1 }, mons: { [SNORLAX]: { lv: 50 } }, updatedAt: 200 });
    const bad = P({ caught: { [SNORLAX]: 1 }, mons: { [SNORLAX]: { lv: broken } }, updatedAt: 100 });
    for (const [a, b, who] of [[good, bad, '정상이 먼저'], [bad, good, '깨진 것이 먼저']]) {
      const m = mergeStatRecord('profile', a, b);
      assert.equal(m.mons[SNORLAX].lv, 50, `${String(broken)} · ${who}: 스톤으로 키운 Lv50이 남는다`);
      assert.equal(lvOf(m.mons[SNORLAX]), 50);
    }
    // 깨진 것만 있으면 정상 숫자 1로 (다음 병합에서 다시 무한대가 이기지 않게)
    const only = mergeStatRecord('profile', P({ mons: { [SNORLAX]: { lv: broken } } }), P({ mons: { [SNORLAX]: { lv: broken } } }));
    assert.equal(only.mons[SNORLAX].lv, 1, `${String(broken)}만 있으면 1`);
  }
  // 예전 그대로: 큰 쪽 · 기록이 없는 쪽은 그대로 · 만렙 위는 만렙
  const m = mergeStatRecord('profile', P({ mons: { [SNORLAX]: { lv: 30 } } }), P({ mons: { [SNORLAX]: { lv: 70 } } }));
  assert.equal(m.mons[SNORLAX].lv, 70);
  const none = mergeStatRecord('profile', P({ mons: { [SNORLAX]: { gear: 'crown' } } }), P({ mons: { [SNORLAX]: { gear: 'crown' } } }));
  assert.equal(none.mons[SNORLAX].lv, undefined, '둘 다 레벨 기록이 없으면 그대로');
  assert.equal(mergeStatRecord('profile', P({ mons: { [SNORLAX]: { lv: 999 } } }), P({ mons: { [SNORLAX]: { lv: 20 } } })).mons[SNORLAX].lv, MAX_LV);
});

test('⚔️ 만렙 100이어도 배틀은 한 방에 안 끝난다 — 메가·거다이맥스 × 가장 센 공격 · 📣 동료도', () => {
  for (const form of [null, 'mega', 'gmax']) {
    const hit = Math.round(DAMAGE.strong.star * attackMult(form, 3, MAX_LV));
    assert.ok(hit < BATTLE.hp, `${form || '변신 없음'} 만렙 한 방 ${hit}`);
  }
  assert.equal(Math.round(DAMAGE.strong.star * attackMult('gmax', 3, MAX_LV)), 96);
  assert.ok(palDamage('star', MAX_LV) < BATTLE.hp);
  assert.equal(palDamage('star', MAX_LV), Math.round(damageForTier('safe', 'star') * lvMult(MAX_LV)));
});

test('🎖️ 💤 쉼으로 오를 때도 축하 줄 — 넘었을 때만 · 행운 레벨로 넘어도', async () => {
  const { claimLines } = await import('../js/houseview.js');
  const ko = () => '잠만보';
  const base = { ok: true, mon: SNORLAX, hp: { from: 50, to: 100 }, coins: 0 };
  const a = claimLines({ ...base, lv: { from: 24, to: 25 }, exp: { lvUp: 1 } }, ko);
  assert.ok(a.includes('Lv 24 → 25') && a.includes('🎖️ Lv25 축하해요!'), a.join(' | '));
  const b = claimLines({ ...base, lv: { from: 25, to: 26 }, exp: { lvUp: 1 } }, ko);
  assert.ok(!b.some((l) => l.includes('🎖️')), '이미 지난 25는 다시 축하하지 않는다');
  const multi = claimLines({ ...base, lv: { from: 23, to: 26 }, exp: { lvUp: 3 } }, ko);
  assert.ok(multi.includes('🎖️ Lv25 축하해요!'), '쌓인 💤로 여러 칸을 한 번에 넘어도 (옛 만렙에서 풀린 막대)');
  const c = claimLines({ ...base, lv: { from: 49, to: 50 }, exp: { lvUp: 0 } }, ko);
  assert.ok(c.includes('🍀 행운의 레벨 +1') && c.includes('🎖️ Lv50 축하해요!'), '행운으로 넘어도');
  const d = claimLines({ ...base, lv: { from: 100, to: 100 }, exp: { lvUp: 0 }, coins: 100, cap: 'max' }, ko);
  assert.ok(!d.some((l) => l.includes('🎖️')), '만렙에서 💰가 된 쉼은 축하 없음');
  const e = claimLines({ ok: true, mon: SNORLAX, gone: true }, ko);
  assert.equal(e.length, 1, '빈 캡슐은 그대로');
  // 연출 화면도 같은 말 — 행운 다음, 「그대로」 앞
  const show = src('js/restshow.js');
  const at = show.indexOf('const medal = lvMarkCrossed(r.lv.from, r.lv.to);');
  assert.ok(at > show.indexOf('// 5) 🍀 행운') && at < show.indexOf("if (r.kept) badge(badges"), '🍀 다음 · 🙂 앞');
  assert.match(show.slice(at, at + 260), /badge\(badges, `🎖️ Lv\$\{medal\} 축하해요!`, 'is-level'\);/);
});

test('🎖️ 도감 화면 — 레벨 옆에 닿은 만큼 🎖️ · 스톤·🍬로 올려 넘으면 「🎖️ LvN 축하해요!」와 축하 소리', () => {
  const shop = src('js/shop.js');
  assert.match(shop, /import \{ costBetween, baseOf, lvMarkCrossed, lvMarksOf \} from '\.\/evolve\.js';/);
  assert.match(shop, /const marks = lvMarksOf\(g\.lv\);[^\n]*\n {2}\$\('mon-lv-text'\)\.textContent = `Lv\$\{g\.lv\}\$\{g\.lv >= g\.max \? ' · 만렙!' : ` \/ \$\{g\.max\}`\}\$\{marks \? ` \$\{'🎖️'\.repeat\(marks\)\}` : ''\}`;/);
  const up = shop.slice(shop.indexOf('async function doLevelUp('), shop.indexOf('async function doEvolve('));
  assert.match(up, /const medal = lvMarkCrossed\(r\.from, r\.to\);/);
  assert.match(up, /if \(medal\) sfx\.success\(\);/);
  assert.match(up, /`\$\{mark\}Lv\$\{r\.from\} → Lv\$\{r\.to\}!\$\{medal \? ` 🎖️ Lv\$\{medal\} 축하해요!` : ''\}`/);
  assert.ok(up.indexOf('const medal') > up.indexOf('if (r && r.ok) {'), '올라간 뒤에만');
  // 진화할 수 있게 된 칸(5·10)은 축하 레벨(25~)과 겹치지 않는다 — 진화 문구를 그대로 둔다
  assert.equal(lvMarkCrossed(4, 5), null);
  assert.equal(lvMarkCrossed(9, 10), null);
  // 도감 막대의 끝은 만렙 100
  assert.match(src('js/xp.js'), /lv, max: MAX_LV, cap: levelCapOf\(id\),/);
});

test('🎈 게임기 설명 — 숫자 없이 꼬마·큰 열기구를 알려 준다 · css 거대·꼬마 · 판 v332', () => {
  const g = GAMES.find((x) => x.id === 'balloon');
  assert.equal(g.how, '톡! 파트너 기술로 열기구를 터뜨려요 · 클수록 여러 번 · 꼬마 열기구는 빨라요');
  assert.ok(!/\d/.test(g.how));
  const css = src('css/style.css');
  assert.match(css, /\.gl-bal\.is-huge \.gl-env \{ background-color: #fcd34d; border-width: 4px; \}/);
  assert.match(css, /\.gl-bal\.is-tiny \.gl-meowth-alt \{ font-size: 1\.1rem; \}/);
  assert.match(css, /\.gl-bal\.is-huge \.gl-hp \{ top: 3%; z-index: 1;/, '거대 열기구의 ❤️는 안쪽 위 — 하늘 맨 위에서도 안 잘린다(헤드리스에서 찾음)');
  const bal = src('js/gameballoon.js');
  assert.match(bal, /if \(it\.hp > 1\) b\.appendChild\(el\('span', 'gl-hp', '❤️'\.repeat\(it\.hp\)\)\);/, '❤️는 여러 번 맞히는 열기구에');
  assert.match(bal, /if \(r\.it\.kind === 'big' \|\| r\.it\.kind === 'huge'\) \{ fly\(BLAST/);
  const sw = src('sw.js');
  const v = Number((/const CACHE_VERSION = 'v(\d+)';/.exec(sw) || [])[1]);
  assert.ok(v >= 332, 'sw v332 이상');
  assert.match(src('js/version.js'), new RegExp(`export const APP_VERSION = 'v${v}';`));
});
