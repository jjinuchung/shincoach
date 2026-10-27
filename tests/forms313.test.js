// ⭐ 변신(메가·거다이맥스) 모든 과목 (v313 · 2026-10-21 진우 발견 — "영어 포켓몬만 다이스프 메뉴가 있다") — node --test tests/forms313.test.js
// 원인 둘: ① 변신 표 FORMS 30종이 모두 영어(명단 100마리 때 표) ② 수학 화면 배틀은 변신을 늘 꺼 둠(math.js myBattleMons)
// 아버님 결정: 거다이맥스·메가 모두(최신작 메가 포함) · 수학 배틀 켜기 — 아래 44종은 PokeAPI 실측(.context/v313/forms_pokeapi.tsv · 공식 그림 있음 확인)
// 🔍 Codex 119차 → 아버님 "빼기": 플라엣테(670)·지가르데(718) 메가는 원작에서 영원의 꽃·퍼펙트폼만 → 일반 모습인 앱의 둘은 안 넣는다
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { FORMS, formsOf, ROSTER, subjectOf } from '../js/pokemon.js';
import { gainMushroom, makeSoup, hasGmax, itemCount } from '../js/xp.js';

const src = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

/** PokeAPI 실측 — 명단에 있는데 v312까지 표에 없던 변신 (종: [종류, 모습 id, 과목]) */
const ADDED = {
  15: ['mega', 10090, 'korean'], 36: ['mega', 10278, 'math'], 71: ['mega', 10279, 'nonsul'], 99: ['gmax', 10203, 'nonsul'],
  115: ['mega', 10039, 'math'], 127: ['mega', 10040, 'math'], 160: ['mega', 10283, 'math'], 181: ['mega', 10045, 'math'],
  208: ['mega', 10072, 'math'], 214: ['mega', 10047, 'english'], 227: ['mega', 10284, 'nonsul'], 229: ['mega', 10048, 'math'],
  254: ['mega', 10065, 'math'], 306: ['mega', 10053, 'math'], 308: ['mega', 10054, 'nonsul'], 310: ['mega', 10055, 'nonsul'],
  319: ['mega', 10070, 'math'], 323: ['mega', 10087, 'nonsul'], 334: ['mega', 10067, 'nonsul'], 354: ['mega', 10056, 'nonsul'],
  359: ['mega', 10057, 'english'], 460: ['mega', 10060, 'korean'], 491: ['mega', 10312, 'math'], 500: ['mega', 10286, 'math'],
  545: ['mega', 10288, 'korean'], 604: ['mega', 10290, 'korean'], 652: ['mega', 10292, 'korean'], 655: ['mega', 10293, 'math'],
  701: ['mega', 10300, 'math'], 719: ['mega', 10075, 'nonsul'],
  801: ['mega', 10317, 'korean'], 807: ['mega', 10319, 'math'], 812: ['gmax', 10209, 'korean'], 815: ['gmax', 10210, 'math'],
  818: ['gmax', 10211, 'math'], 823: ['gmax', 10212, 'math'], 826: ['gmax', 10213, 'korean'], 839: ['gmax', 10215, 'korean'],
  841: ['gmax', 10216, 'korean'], 842: ['gmax', 10217, 'korean'], 849: ['gmax', 10219, 'math'], 861: ['gmax', 10222, 'korean'],
  884: ['gmax', 10225, 'math'], 998: ['mega', 10325, 'math'],
};
/** 원작 거다이맥스 종(소드·실드 · 전국도감) — 명단에 있으면 표에 있어야 한다 */
const GMAX_REAL = [3, 6, 9, 12, 25, 52, 68, 94, 99, 131, 133, 143, 569, 809, 812, 815, 818, 823, 826, 834, 839, 841, 842, 844, 849, 851, 858, 861, 869, 879, 884, 892];

test('⭐ v313 변신 표 — PokeAPI 실측 44종이 그 모습 id로 · 명단에 있는 종만 · 과목도 실측대로 · 특별한 모습만 되는 플라엣테·지가르데 메가는 없음', () => {
  assert.equal(Object.keys(ADDED).length, 44);
  assert.equal(formsOf(670), null, '플라엣테 — 원작에선 영원의 꽃 플라엣테만 메가진화 (🔍 Codex 119차 #1)');
  assert.equal(formsOf(718), null, '지가르데 — 원작에선 퍼펙트폼만 메가진화');
  assert.equal(Object.keys(FORMS).length, 74);
  for (const [id, [kind, form, subj]] of Object.entries(ADDED)) {
    const n = Number(id);
    assert.equal(formsOf(n) && formsOf(n)[kind], form, `${n} ${kind}`);
    assert.ok(ROSTER.some((r) => r.id === n), `${n}는 명단에`);
    assert.equal(subjectOf(n), subj, `${n} 과목`);
  }
  assert.deepEqual(FORMS[849], { gmax: 10219 }, '스트린더는 하이한 모습(기본) 하나');
  assert.deepEqual(FORMS[359], { mega: 10057 }, '앱솔은 기본 메가 하나');
  assert.deepEqual(FORMS[801], { mega: 10317 }, '마기아나는 기본 메가 하나');
  for (const f of Object.values(FORMS)) for (const v of Object.values(f)) assert.ok(Number.isInteger(v) && v > 10000, `폼 그림 id ${v}`);
});

test('⭐ 원작 거다이맥스 종은 명단에 있으면 모두 거다이맥스할 수 있다 (과목 상관없이)', () => {
  for (const id of GMAX_REAL) {
    if (!ROSTER.some((r) => r.id === id)) continue;
    assert.ok(formsOf(id) && formsOf(id).gmax, `${id} — 명단에 있는 거다이맥스 종`);
  }
});

test('⭐ 과목마다 변신할 포켓몬이 있다 — 거다이맥스는 영어·수학·국어·논술 모두 · 메가도 모두', () => {
  const by = { gmax: {}, mega: {} };
  for (const [id, f] of Object.entries(FORMS)) {
    const s = subjectOf(Number(id));
    for (const k of ['gmax', 'mega']) if (f[k]) by[k][s] = (by[k][s] || 0) + 1;
  }
  for (const s of ['english', 'math', 'korean', 'nonsul']) {
    assert.ok(by.gmax[s] >= 1, `${s} 거다이맥스`);
    assert.ok(by.mega[s] >= 1, `${s} 메가`);
  }
  assert.deepEqual(by.gmax, { english: 11, nonsul: 1, korean: 6, math: 5 }, '거다이맥스 23종');
});

test('🍲 다이스프는 과목을 안 따진다 — 수학 에이스번 · 국어 고릴타 · 논술 킹크랩도 먹고 거다이맥스', async () => {
  for (const id of [815, 812, 99]) {
    gainMushroom(10);
    assert.equal(await makeSoup(id), true, `${id} 다이스프`);
    assert.equal(hasGmax(id), true);
  }
  assert.equal(itemCount('mushroom'), 0, '버섯은 열 개씩');
  assert.ok(!/subjectOf|forSubject/.test(src('js/xp.js').slice(src('js/xp.js').indexOf('export async function makeSoup('), src('js/xp.js').indexOf('export function resetRarity('))), '다이스프에 과목 거르기 없음');
});

test('⚔️ 수학 화면 배틀도 변신 — 영어 배틀(player.js)과 같은 규칙(메가는 키스톤+메가스톤 · 거다이는 다이스프) · 변신 그림 주소도', () => {
  const pick = (file) => {
    const s = src(file);
    const a = s.indexOf('function myBattleMons(');
    return s.slice(a, s.indexOf('\n}\n', a));
  };
  // v352: 메가 판정은 xp.megaReady 한 곳으로(변신 표 + 🔑 + 💠 — 🟢 지가르데는 셀 100일 때만) · 세 벌이 같이 부른다
  const rule = /const f = formsOf\(id\) \|\| \{\};\n\s+const canMega = megaReady\(id\);[^\n]*\n\s+const canGmax = !!\(f\.gmax && hasGmax\(id\)\);/;
  assert.match(src('js/xp.js'), /const f = formsOf\(id\);\n\s+const has = f && f\.mega \? true : Number\(id\) === ZYG_ID && zygPerfect\(profile\.zyg\);\n\s+return !!\(has && hasKeystone\(\) && hasMegaStone\(id\)\);/, '메가는 키스톤+메가스톤 그대로');
  for (const file of ['js/math.js', 'js/player.js']) {
    const body = pick(file);
    assert.match(body, rule, `${file}: 같은 규칙`);
    assert.match(body, /megaUrl: canMega \? formUrl\(id, 'mega'\) : null,/);
    assert.match(body, /gmaxUrl: canGmax \? formUrl\(id, 'gmax'\) : null,/);
  }
  assert.ok(!/canMega: false, canGmax: false/.test(pick('js/math.js')), '늘 꺼 두지 않는다');
  const m = src('js/math.js');
  assert.match(m, /import \{[^}]*\bhasKeystone, hasMegaStone, hasGmax \} from '\.\/xp\.js';/);
  assert.match(m, /import \{[^}]*\bmegaReady, zygBattle \} from '\.\/xp\.js';/, 'v352 — 메가 판정 한 곳 · 🟢 지가르데 칸');
  assert.match(m, /import \{[^}]*\bformsOf, formUrl \} from '\.\/pokemon\.js';/);
});

test('🎒 도감 창 「⭐ 변신」 칸은 변신 표에 있는 잡은 포켓몬이면 과목 상관없이 (shop.js renderForms)', () => {
  const s = src('js/shop.js');
  const body = s.slice(s.indexOf('function renderForms('), s.indexOf('function option('));
  // v352: 🟢 지가르데만 변신 표 밖에서 따로(셀로 바뀌는 모습 칸 · 셀 100 뒤 💠) — 나머지는 그대로 변신 표
  assert.match(body, /const forms = isZyg \? \{ mega: zygPerfect\(z\) \? ZYG_FORMS\.mega : 0 \} : mon && mon\.caught !== false \? formsOf\(mon\.id\) : null;/);
  const head = body.slice(0, body.indexOf('if (!forms)'));
  assert.ok(!/subjectOf|forSubject|english/.test(head), '변신 칸을 보일지는 과목으로 거르지 않는다');
  assert.match(body, /if \(!isZyg && \(subj === 'korean' \|\| subj === 'nonsul'\)\) notes\.push\('⚔️ 변신은 영어·수학 배틀에서 쓸 수 있어요'\);/, '국어·논술 포켓몬엔 어디서 쓰는지 한 줄 (🔍 Codex 119차) — 과목은 이 안내에만');
  assert.ok(formsOf(815).gmax && formsOf(812).gmax && formsOf(99).gmax && formsOf(36).mega, '수학·국어·논술 포켓몬도 표에');
});

test('🎮 서비스워커 v313 이상 (바뀐 pokemon.js·math.js를 받게)', () => {
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(src('sw.js')) || [])[1]) >= 313, 'sw v313 이상');
});
