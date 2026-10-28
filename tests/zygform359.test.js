// 🟢 지가르데 1%폼 (v359, 2026-10-28 아버님 「이미 잡은 지가르데는 1%폼으로 · 큐브 코어+셀1은 남겨 두기」 → 기본안 「이대로」)
// 모습은 셀 수로만 — 1%(앱이 그린 코어 그림 · 처음부터) · 10%(셀 10) · 50%(셀 50 — 논술에서 잡았어도) · 그림은 진우가 가진 지가르데에만
// node --test tests/zygform359.test.js
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { zygOf, zygFormOf, zygFormOpen, zygFindRule, mergeZyg, zygLine, FORM_LIST, CORE_FORM_URL, STEP } from '../js/zygarde.js';
import { emptyProfile } from '../js/db.js';
import { initProfile, flushProfile, reloadProfile, getLook, zygForm } from '../js/xp.js';
import { ensureAnim } from '../js/sprite.js';
import { dayNum } from '../js/korean.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const DAY = 86400000;
const T0 = new Date(2026, 9, 28, 20).getTime();
const D0 = dayNum(T0);
/** 그날 진우와 같은 꼴 — 🔴 코어 + 셀 1(논술·국어) · 고른 모습 없음 */
const today = () => ({ core: T0 - 3600000, cells: 1, keys: [`${D0}:nonsul`, `${D0}:korean`], form: '', formAt: 0, gave: 0, seen: 0 });

test('🟢 이미 잡은 지가르데(코어 + 셀 1 · 고른 적 없음)는 1%폼 · 큐브 장부는 그대로', () => {
  const z = today();
  assert.equal(zygFormOf(z), '1', '전에는 50%');
  assert.deepEqual(zygOf(z), z, '코어·셀·찾은 열쇠는 한 칸도 안 바뀐다');
  assert.equal(zygLine(z, T0), '🟢 지가르데 큐브: 셀 1/100 · 오늘 찾은 곳 논술·국어 · 모습 1%');
  assert.deepEqual(FORM_LIST, ['1', '10', '50']);
  for (const f of FORM_LIST) assert.equal(zygFormOpen(z, { 718: 1 }, f), f === '1', `셀 1에서 ${f}%`);
});

test('🟢 지금 모습: 고른 모습이 열려 있으면 그것 · 아니면 열린 가장 큰 모습 (옛 백업의 50% 고름도 셀 수로)', () => {
  const at = (cells, form = '') => zygFormOf({ core: 1, cells, form });
  assert.deepEqual([at(0), at(9), at(10), at(49), at(50), at(100)], ['1', '1', '10', '10', '50', '50']);
  assert.equal(at(12, '50'), '10', '셀 50 전에 골라 둔 50%(v358까지 됨)는 10%로');
  assert.equal(at(3, '10'), '1');
  assert.equal(at(12, '1'), '1', '고른 1%는 셀이 늘어도 그대로(문턱을 넘을 때만 저절로)');
  assert.equal(at(70, '10'), '10');
  // 병합 — 나중에 바꾼 쪽의 고름이 이긴다
  const m = mergeZyg({ core: 1, cells: 12, form: '1', formAt: 9 }, { core: 1, cells: 8, form: '', formAt: 3 });
  assert.equal(zygFormOf(m), '1');
});

test('🟢 1%폼에서 셀 10 → 10%폼 → 셀 50 → 50%폼 (진우 장부로 하루 3개씩)', () => {
  const p = { caught: { 718: 1 }, partner: 25, zyg: today() };
  const evs = [];
  for (let d = 1; zygOf(p.zyg).cells < 50; d++) {
    for (const sub of ['english', 'math', 'korean']) {
      const r = zygFindRule(p, sub, T0 + d * DAY + 1000);
      if (r.ok && r.ev) evs.push([r.cells, r.ev, zygFormOf(p.zyg)]);
    }
  }
  assert.deepEqual(evs, [[10, 'ten', '10'], [50, 'fifty', '50']]);
  assert.equal(p.caught[718], 1, '도감 수는 그대로 (큐브가 또 주지 않는다)');
  assert.equal(p.zyg.gave, 0);
});

test('🟢 1%폼 그림: 앱이 그린 SVG(data: · 밖에서 받는 것 없음) · 코어 육각형 + 붉은 핵 + 셀', () => {
  assert.ok(CORE_FORM_URL.startsWith('data:image/svg+xml;charset=utf-8,'));
  assert.ok(!/[#<>"\s]/.test(CORE_FORM_URL.slice(CORE_FORM_URL.indexOf(',') + 1)), '색 #·꺾쇠·빈칸이 날것이면 주소가 끊긴다 — 모두 %로');
  const svg = decodeURIComponent(CORE_FORM_URL.slice(CORE_FORM_URL.indexOf(',') + 1));
  assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"'));
  assert.ok(svg.endsWith('</svg>'));
  assert.ok(!/href|<image|<script|url\(/i.test(svg), '밖의 그림·스크립트를 부르지 않는다');
  assert.equal(svg.replace('http://www.w3.org/2000/svg', '').includes('http'), false);
  assert.ok(svg.includes('M20 3L35 11.5V28.5L20 37L5 28.5V11.5Z') && svg.includes('#ef4444'), '코어 (끝 화면 그림과 같은 꼴)');
  assert.ok(svg.includes('M20 4C30 4 36 12 35 21'), '셀');
  const zv = read('js/zygview.js');
  assert.ok(zv.includes("['path', { d: 'M20 3L35 11.5V28.5L20 37L5 28.5V11.5Z', fill: '#14532d'"), '끝 화면 코어 그림이 그대로라 두 그림이 같은 꼴');
});

// ── 저장소를 지나는 길 (가짜 IndexedDB) ──
let initDone = false;
async function seed(p) {
  if (!initDone) { await initProfile(); initDone = true; }
  await flushProfile();
  const cur = fakeIdb.get('profile', 'me') || emptyProfile();
  fakeIdb.put('profile', { ...cur, ...p, id: 'me', updatedAt: (cur.updatedAt || 0) + 1 });
  await reloadProfile();
}

test('🟢 그림 길: 가진 지가르데만 모습 그림 · 도감에 없으면(야생·상대) 원작 50% 그대로 · 1%·10%면 도트 안 받음', async () => {
  const realFetch = globalThis.fetch;
  let fetched = 0;
  globalThis.fetch = async () => { fetched++; throw new Error('시험에선 받지 않는다'); };
  try {
    await seed({ caught: { 718: 1 }, partner: 718, mons: {}, zyg: today() });
    assert.equal(getLook(718).formUrl, CORE_FORM_URL, '1%폼 그림');
    assert.equal(getLook(25).formUrl, null, '다른 포켓몬은 그대로');
    assert.equal(await ensureAnim(718), null);
    assert.equal(fetched, 0, '1%폼이면 50%폼 도트를 받으러 가지 않는다');
    // 도감에 없으면 — 큐브가 있어도 야생 지가르데는 원작 모습(그림 칸 없음 · 도트 받으러 감)
    await seed({ caught: {}, partner: null });
    assert.equal(getLook(718).formUrl, null);
    assert.equal(await ensureAnim(718), null);
    assert.equal(fetched, 1, '도트를 받으러 간다(시험에선 실패)');
    // 셀 50 넘은 가진 지가르데 — 50%폼은 원래 그림·도트
    await seed({ caught: { 718: 1 }, zyg: { ...today(), cells: 60, seen: STEP.fifty } });
    assert.equal(getLook(718).formUrl, null);
    // 셀 12 — 10%폼(받아 둔 10%폼 그림이 없으면 null → 50%폼 그림 + 다시 받기 · v352 그대로)
    await seed({ zyg: { ...today(), cells: 12, seen: STEP.ten } });
    assert.equal(getLook(718).formUrl, null);
    // 도감에서 1%폼으로 돌아가기 → 그림이 바로 바뀐다
    const r = await zygForm('1');
    assert.equal(r.ok, true);
    assert.equal(fakeIdb.get('profile', 'me').zyg.form, '1');
    assert.equal(getLook(718).formUrl, CORE_FORM_URL);
    assert.deepEqual(await zygForm('50').then((x) => ({ ok: x.ok, why: x.why })), { ok: false, why: 'locked' }, '셀 50 전엔 50%폼 잠김');
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('🟢 Codex 163차: 🚀 로켓단 그림도 지금 모습 (받는 사이 늦은 도트는 tests/zygdot359.test.js)', async () => {
  const { monView } = await import('../js/rocketplay.js');
  const chars = [{ id: 718, url: 'BASE718' }, { id: 25, url: 'BASE25' }];
  await seed({ caught: { 25: 1, 718: 1 }, zyg: today() });
  assert.equal(monView(718, chars).url, CORE_FORM_URL, '파트너·구출 목록의 내 지가르데');
  assert.equal(monView(25, chars).url, 'BASE25');
  await seed({ caught: { 25: 1 } });
  assert.equal(monView(718, chars).url, 'BASE718', '도감에 없으면 원래 그림');
});

test('🟢 배선: 도감 모습 칸 셋 · 이로치를 따로 고르는 일곱 곳도 모습 그림이 먼저 · 🐣 글 · sw', () => {
  // Codex 163차 #1·#2 — 🛒 5일장 판매 목록 · 데려간 포켓몬 알림 · 처음 잡은 「잡았다!」 화면
  assert.ok(read('js/marketview.js').includes('const u = getLook(m.id).formUrl || ui.urlById.get(m.id);'));
  assert.ok(read('js/taken.js').includes('const url = getLook(id).formUrl || characterUrl(id);'));
  const ca = read('js/catch.js');
  const at = ca.indexOf("mon.classList.remove('captured');");
  assert.ok(at > 0 && ca.indexOf('if (!ui.practice) setFigure(mon, c.url, getLook(c.id));', at) > at, '잡은 뒤 새 모습으로 다시 그림(연습 빼고)');
  assert.ok(ca.indexOf('if (!ui.practice) setFigure(mon, c.url, getLook(c.id));') < ca.indexOf("mon.classList.add('caughtpop');"), '뿅 나타나기 전에');
  const sp = read('js/sprite.js');
  assert.equal(sp.split('return noDot(key) ? null : url;').length - 1, 2, '저장된 것·새로 받은 것 둘 다');
  const shop = read('js/shop.js');
  assert.ok(shop.includes("[['1', 0, '코어에 셀이 붙은 첫 모습'], ['10', ZYG_STEP.ten, '빠른 모습'], ['50', ZYG_STEP.fifty, '균형 잡힌 모습']]"));
  const sites = [
    ['js/home.js', "url: (look && (look.formUrl || look.shinyUrl)) || characterUrl(p.id)", 1],     // 🏠 파트너
    ['js/home.js', 'return (l && (l.formUrl || l.shinyUrl)) || null;', 1],                       // 🏠 과목 카드 마스코트
    ['js/journeyview.js', 'if (look && (look.formUrl || look.shinyUrl)) return look.formUrl || look.shinyUrl;', 1], // 🎒 대여행
    ['js/korcheer.js', 'const shiny = look && (look.formUrl || look.shinyUrl);', 1],             // 📣 국어·논술 응원
    ['js/korcheer.js', '!(m.look && (m.look.formUrl || m.look.shinyUrl))', 1],
    ['js/math.js', 'const shiny = look && (look.formUrl || look.shinyUrl);', 1],                 // ✨ 수학 응원
    ['js/math.js', '!(m.look && (m.look.formUrl || m.look.shinyUrl))', 1],
    ['js/kordayview.js', "if (look && look.formUrl) return { id, ko: c ? c.ko : '', art: look.formUrl, anim: null };", 1], // 🔤 무대
    ['js/player.js', "if (look.formUrl) return { id, ko: ch ? ch.ko : '', art: look.formUrl, anim: null };", 1],          // 🎤 무대
    ['js/player.js', 'if (look && look.formUrl) return { ...m, art: look.formUrl, anim: null };', 1],
  ];
  for (const [f, needle, n] of sites) assert.equal(read(f).split(needle).length - 1, n, `${f} ${needle}`);
  // 모습 그림 줄이 이로치 줄보다 먼저
  for (const f of ['js/kordayview.js', 'js/player.js']) {
    const s = read(f);
    assert.ok(s.indexOf('look.formUrl) return') < s.indexOf('look.shiny) return'), f);
  }
  // 이로치 그림을 따로 고르는 곳이 새로 생기면 여기서 걸린다 (모습 그림도 함께 보라고)
  const loose = [];
  for (const f of ['js/home.js', 'js/journeyview.js', 'js/korcheer.js', 'js/math.js', 'js/kordayview.js', 'js/player.js', 'js/shop.js', 'js/pokedex.js', 'js/hatch.js', 'js/korbattleview.js', 'js/nonsulview.js', 'js/koreanview.js']) {
    for (const line of read(f).split('\n')) if (/look\.shinyUrl/.test(line) && !/formUrl/.test(line) && !/retryShinyArt|이로치예요/.test(line)) loose.push(`${f}: ${line.trim()}`);
  }
  assert.deepEqual(loose, ['js/kordayview.js: if (look && look.shiny) return { id, ko: c ? c.ko : \'\', art: look.shinyUrl || (c && c.url) || \'\', anim: null };',
    'js/player.js: if (look.shiny) return { id, ko: ch ? ch.ko : \'\', art: look.shinyUrl || (ch && ch.url) || \'\', anim: null };',
    'js/player.js: if (look && look.shiny) return { ...m, art: look.shinyUrl || m.art, anim: null };'], '남은 셋은 모습 그림 줄 바로 다음');
  const zv = read('js/zygview.js');
  assert.ok(zv.includes("title = '🟢 셀 10개! 10%폼이 됐어요';"));
  assert.ok(zv.includes('도감에서 1%폼·10%폼으로 바꿀 수도 있어요.'));
  assert.ok(read('sw.js').includes("'./js/zygarde.js'"));
});
