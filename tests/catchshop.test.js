// 🛒 잡기 화면에서 바로 볼 사기 (2026-10-04) 테스트: node --test tests/catchshop.test.js
//
// 진우 요청 → 아버님 "이대로 진행하자": 영어 퍼즐 뒤 잡기 화면에서 잡고 싶은 포켓몬이 나왔는데 더 좋은 볼이 필요할 때,
// 그 자리에서 「🛒 볼 사러 가기」 → 볼만 보이는 상점 → 사면 상점이 닫히고 잡기 화면에 그 볼이 골라져 있다.
// 던지기 전에만 · 영어·수학 잡기 둘 다 · ⚙ 잡기 연습은 빼고 · 안 사고 닫으면 그대로.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CATCH_SHOP, SHOP_BALLS, BALLS, BEASTBALL, POKEBALL, GOLDEN, canBuy, itemById } from '../js/items.js';
import { keepBall, ballTip } from '../js/catch.js';
import { gainCoins, addItem, buyItem, inventory, catchAttempt } from '../js/xp.js';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
/** 함수 하나의 본문 — 다음 최상위 function/export 앞까지 */
const body = (code, name) => {
  const at = code.search(new RegExp(`\\n(?:export )?(?:async )?function ${name}\\(`));
  assert.ok(at >= 0, `${name}이 있다`);
  const rest = code.slice(at + 1);
  const end = rest.slice(1).search(/\n(?:export )?(?:async )?function |\n\/\*\*|\nlet |\nconst /);
  return end < 0 ? rest : rest.slice(0, end + 1);
};

test('🛒 볼 상점 목록: 파는 볼 셋 + ⚪ 비스트볼 — 전부 잡기 화면에서 던질 수 있고 돈으로 살 수 있다', () => {
  assert.deepEqual(CATCH_SHOP.map((b) => b.id), ['greatball', 'ultraball', 'masterball', 'beastball']);
  for (const b of SHOP_BALLS) assert.ok(CATCH_SHOP.includes(b), `${b.id}: 상점에서 파는 볼은 볼 상점에도`);
  for (const b of CATCH_SHOP) {
    assert.equal(b.kind, 'ball', b.id);
    assert.ok(BALLS.includes(b), `${b.id}: 사도 볼 고르기에 안 나오면 못 던진다`);
    assert.ok(!b.free && b.id !== GOLDEN.id, `${b.id}: 몬스터볼(공짜)·🌟 황금 볼(복습으로만)은 팔지 않는다`);
    assert.ok(b.price > 0, b.id);
    assert.equal(itemById(b.id), b, `${b.id}: 카탈로그에 있어야 buyItem이 산다`);
    // 코인·스톤이 넉넉하면 살 수 있다 (비스트볼은 🔷 2개도)
    assert.equal(canBuy(b.id, 99999, { stone_math: 9, stone_english: 9 }).ok, true, b.id);
  }
  assert.equal(canBuy(BEASTBALL.id, 99999, {}).ok, false, '⚪ 비스트볼은 🔷 수학스톤 없이는 못 산다');
});

test('🛒 산 볼을 고른 채로 돌아온다 — 가방에 있으면 그 볼, 없으면 몬스터볼', () => {
  assert.equal(keepBall({ greatball: 1 }, 'greatball'), 'greatball', '방금 산 슈퍼볼');
  assert.equal(keepBall({ masterball: 2, greatball: 1 }, 'masterball'), 'masterball');
  assert.equal(keepBall({ beastball: 1 }, 'beastball'), 'beastball');
  assert.equal(keepBall({ goldenball: 1 }, 'goldenball'), 'goldenball', '🌟 황금 볼도 가방에 있으면 그대로');
  assert.equal(keepBall({}, 'greatball'), POKEBALL.id, '가방에 없으면 몬스터볼 — 없는 볼을 고른 채로 두면 던질 때 몬스터볼로 바뀐다');
  assert.equal(keepBall({ greatball: 0 }, 'greatball'), POKEBALL.id);
  assert.equal(keepBall({ greatball: 1 }, POKEBALL.id), POKEBALL.id, '몬스터볼을 고르고 있었으면 그대로');
  assert.equal(keepBall({ greatball: 1 }, 'nope'), POKEBALL.id);
  assert.equal(keepBall(null, undefined), POKEBALL.id);
});

test('🛒 볼 한마디 — 슈퍼볼 1.5배 · 마스터볼 반드시 · 비스트볼은 "1배"가 아니라 울트라비스트', () => {
  assert.equal(ballTip(POKEBALL), '');
  assert.match(ballTip(itemById('greatball')), /1\.5배/);
  assert.match(ballTip(itemById('ultraball')), /2배/);
  assert.match(ballTip(itemById('masterball')), /반드시 잡혀요/);
  assert.match(ballTip(BEASTBALL), /울트라비스트/);
  assert.doesNotMatch(ballTip(BEASTBALL), /1배/, '보통 포켓몬에겐 몬스터볼과 같아 "1배"라고 하면 왜 사나 헷갈린다');
  assert.match(ballTip(GOLDEN), /2배/);
});

test('🛒 볼 상점에서 산 볼은 가방에 들어가고, 그 볼로 던지면 하나 쓴다', async () => {
  gainCoins(5000);
  addItem('stone_math', 2);
  const before = inventory().greatball || 0;
  assert.equal(await buyItem('greatball'), true);
  assert.equal(inventory().greatball, before + 1);
  assert.equal(keepBall(inventory(), 'greatball'), 'greatball', '돌아오면 슈퍼볼이 골라져 있다');
  const r = catchAttempt(25, () => 0.99, { ball: keepBall(inventory(), 'greatball') });
  assert.equal(r.ball, 'greatball', '고른 볼로 던졌다');
  assert.equal(inventory().greatball || 0, before, '던지면 없어진다');
  assert.equal(await buyItem('beastball'), true, '⚪ 비스트볼 (💰 + 🔷 2)');
  assert.equal(keepBall(inventory(), 'beastball'), 'beastball');
});

test('🛒 잡기 화면 연결 — 버튼은 던지기 전에만·연습 빼고, 사면 그 볼을 골라 "샀어요", 그냥 닫으면 고르던 볼 그대로', () => {
  const c = src('js/catch.js');
  const rb = body(c, 'renderBalls');
  assert.match(rb, /if \(!ui\.practice\) \{[\s\S]*catch-shop-btn[\s\S]*🛒 볼 사러 가기[\s\S]*openBallShop/, '⚙ 잡기 연습은 볼이 안 줄어서 버튼을 안 둔다');
  assert.match(rb, /ui\.ball = keepBall\(ui\.ballCounts, sel\)/, '다시 그릴 때 고른 볼을 지킨다');
  assert.match(rb, /b\.id === ui\.ball \? ' on' : ''/, '골라 둔 볼에 불');
  const ob = body(c, 'openBallShop');
  assert.match(ob, /\$\('catch-pick'\)\.hidden\) return/, '던진 뒤에는 상점을 안 연다');
  assert.match(ob, /openShop\(\{\s*balls: true,/);
  assert.match(ob, /onBought: \(id\) => \{[^}]*refreshBalls\(id, true\)/, '사면 그 볼을 골라 둔다');
  assert.match(ob, /onClose: \(\) => \{[^}]*refreshBalls\(ui\.ball\)/, '안 사고 닫으면 고르던 볼 그대로');
  assert.match(ob, /mine\(\)/, '그 사이 닫힌 잡기 화면은 건드리지 않는다');
  const rf = body(c, 'refreshBalls');
  assert.match(rf, /\$\('catch-pick'\)\.hidden\) return/, '던지는 중·던진 뒤에는 볼 줄을 안 바꾼다');
  assert.match(rf, /renderBalls\(inventory\(\), sel\)/, '가방에서 다시 읽는다 (잡기 화면을 열 때의 수는 낡았다)');
  assert.match(rf, /샀어요!/);
  const tb = body(c, 'throwBall');
  assert.match(tb, /\$\('catch-golden'\)\.hidden = true;/, '던지면 볼 줄과 🛒 버튼을 통째로 숨긴다');
  const cc = body(c, 'closeCatch');
  assert.match(cc, /if \(ui\.shop\) \{[^}]*isBallShopOpen\(\)\) closeShop\(\)/, '잡기 화면이 닫히면 그 볼 상점도 닫는다');
  assert.match(c, /addEventListener\('shincoach:profilechange', \(\) => \{ if \(ui\.open\) refreshBalls\(ui\.ball\); \}\)/, '다른 곳(⏳ 잠금 화면 상점)에서 사도 볼 줄이 맞는다');
  assert.match(c, /ui\.practice \? '\(🛒 상점\)' : '— 아래 🛒 볼 사러 가기'/, '🌌 비스트볼이 없으면 버튼으로 안내');
});

test('🛒 상점 연결 — 볼 상점은 볼만, 사면 닫고 onBought, 한 번에 하나만, 다른 곳에서 열면 늘 전체 상점', () => {
  const s = src('js/shop.js');
  const os = body(s, 'openShop');
  assert.match(os, /ballCtx = opts && opts\.balls \? opts : null/, '도감·⏳ 잠금 화면에서 열면 전체 상점');
  assert.match(os, /'🛒 볼 상점' : '🛒 상점'/);
  const cs = body(s, 'closeShop');
  assert.match(cs, /ballCtx = null;[\s\S]*ctx\.onClose\(\)/);
  const rs = body(s, 'renderShop');
  assert.match(rs, /if \(ballCtx\) \{[\s\S]*CATCH_SHOP[\s\S]*return;\s*\}/, '볼 상점은 볼 칸만 그리고 끝');
  const bu = body(s, 'buy');
  assert.match(bu, /if \(ctx && ctx\.busy\) return;/, '저장이 끝나기 전에 또 누르면 무시 — 상점이 바로 닫혀서 두 번 산 줄 모른다');
  assert.match(bu, /finally \{ if \(ctx\) ctx\.busy = false; \}/, '못 샀을 때도 다시 누를 수 있게');
  assert.match(bu, /if \(ctx && ctx === ballCtx && it\.kind === 'ball'\) \{[\s\S]*ballCtx = null;[\s\S]*\$\('shop'\)\.hidden = true;[\s\S]*ctx\.onBought\(id\)/, '사면 닫고 잡기 화면으로');
  assert.match(src('index.html'), /id="shop-title"/);
  assert.match(src('css/style.css'), /\.catch-golden \{[^}]*flex-wrap: wrap/, '볼 종류 + 🛒가 폰 폭을 넘으면 다음 줄로');
});

test('🛒 Codex 28차 #2 — 던질 때 고른 볼로 판정한다: 연출 중 볼 줄을 눌러도 다른 볼이 쓰이지 않는다', () => {
  const tb = body(src('js/catch.js'), 'throwBall');
  const grab = tb.indexOf('const ballId = ui.ball;');
  assert.ok(grab > 0, '던지는 순간 고른 볼을 붙잡는다');
  assert.ok(grab < tb.indexOf('await sleep('), '연출(기다림)보다 먼저');
  assert.match(tb, /ui\.attempt\(c\.id, \{ ball: ballId \}\)/, '판정은 붙잡은 볼로');
  assert.ok(!/ball: ui\.ball/.test(tb), '판정이 연출 뒤의 ui.ball을 읽지 않는다');
  assert.match(body(src('js/catch.js'), 'pickBall'), /if \(!ui\.open \|\| \$\('catch-pick'\)\.hidden\) return;/, '던진 뒤에는 볼을 못 바꾼다 (불·말도 그대로)');
});

test('🛒 Codex 28차 #6 — 울트라비스트가 없는 잡기에서 비스트볼은 "몬스터볼과 확률이 같아요" (참말인지 확률로 확인)', async () => {
  const { ballChance } = await import('../js/xp.js');
  assert.match(ballTip(BEASTBALL, false), /울트라비스트가 없어서 몬스터볼과 확률이 같아요/);
  assert.match(ballTip(BEASTBALL, true), /울트라비스트에게 아주 잘 들어요/);
  assert.match(ballTip(BEASTBALL), /울트라비스트에게 아주 잘 들어요/, '후보를 모르면 원래 한마디');
  assert.match(ballTip(itemById('greatball'), false), /1\.5배/, '다른 볼은 후보와 상관없다');
  for (let r = 1; r <= 4; r++) for (let lv = 1; lv <= 60; lv++) {
    assert.equal(ballChance('beastball', r, lv, false), ballChance('pokeball', r, lv, false), `등급 ${r}·Lv${lv}: 보통 포켓몬에겐 정말 같다`);
  }
  const c = src('js/catch.js');
  assert.match(body(c, 'pickBall'), /ballTip\(b, candHasUb\(\)\)/);
  assert.match(body(c, 'refreshBalls'), /ballTip\(b, candHasUb\(\)\)/);
  assert.match(c, /const candHasUb = \(\) => ui\.candidates\.some\(\(c\) => isUltraBeast\(c\.id\)\);/, '🧭 레이더가 바꾼 후보까지 (ui.candidates)');
});

test('🛒 Codex 28차 #3 — 볼 상점에서 사는 중에는 ✕·바깥으로 못 닫는다 ("사는 중…", 끝나면 저절로 닫히고 그 볼이 골라짐)', () => {
  const s = src('js/shop.js');
  assert.match(s, /const userClose = \(\) => \{ if \(ballCtx && ballCtx\.busy\) return; closeShop\(\); \};/);
  assert.match(s, /\$\('shop-close'\)\.addEventListener\('click', userClose\);/);
  assert.match(s, /if \(e\.target === \$\('shop'\)\) userClose\(\);/);
  assert.ok(!/addEventListener\('click', closeShop\)/.test(s), '✕가 바로 closeShop을 부르지 않는다');
  assert.match(body(s, 'buy'), /ctx\.busy = true; \$\('shop-msg'\)\.textContent = `🛒 \$\{it \? it\.ko : ''\} 사는 중…`;/);
});
