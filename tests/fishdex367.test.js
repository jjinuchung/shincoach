// 📖 도감 · 🌦️ 날씨 · 잇기 (v367 — 낚시 2단계 기본안 「이대로」 · 원고 「이대로」) — node --test tests/fishdex367.test.js
// 날씨는 날짜로만(열흘마다 5·3·1·1) · 같은 별 안에서만 기울임(별 몫은 그대로) · 도감 칸(소개 한 줄·힌트 — 남은 수 없음) · 📤 🐟 몫 · 화면·창 잇기(소스)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  SPECIES, SPOTS, WEATHER, weatherOf, weatherTilt, nibbleExtra, BIG_KIND, rollFish, starOdds,
  INTRO, DEX_HINT, dexRows, lakeDayLine, FISH_FM_Q, lakeOf,
} from '../js/fishing.js';
import { emptyDaily, mergeStatRecord, mergeDailyDelta } from '../js/db.js';
import { OVERLAYS } from '../js/usage.js';

const src = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const code = (f) => src(f).split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*\*)/.test(l)).join('\n');
const DAY = 86400000;
const keyOf = (dn) => new Date(dn * DAY).toISOString().slice(0, 10);
// 씨앗 난수 (mulberry32 — 이웃 씨앗도 첫 값부터 고르게 퍼진다 · 처음엔 LCG였는데 씨앗 1~199의 첫 값이 0.24~0.31에 몰려 별이 늘 같았다: 변이 mut367a)
function lcg(seed) { let a = (Math.imul(seed >>> 0, 0x9e3779b1) ^ 0x2545f491) >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

test('🌦️ 날씨 — 날짜로만 · 같은 날은 늘 같음 · 열흘마다 맑음 5·흐림 3·비 1·바람 1 · 꼴이 틀리면 맑음', () => {
  assert.deepEqual(WEATHER.map((w) => [w.key, w.n]), [['sun', 5], ['cloud', 3], ['rain', 1], ['wind', 1]]);
  for (const w of WEATHER) { assert.ok(w.emoji && w.ko && w.line.startsWith(w.emoji)); }
  const start = Math.floor(Date.UTC(2026, 0, 1) / DAY / 10) * 10; // 열흘 묶음 첫날
  const seen = new Set();
  for (let b = 0; b < 200; b++) {
    const cnt = { sun: 0, cloud: 0, rain: 0, wind: 0 };
    for (let i = 0; i < 10; i++) cnt[weatherOf(keyOf(start + b * 10 + i)).key] += 1;
    assert.deepEqual(cnt, { sun: 5, cloud: 3, rain: 1, wind: 1 }, `묶음 ${b}`);
    seen.add(JSON.stringify(Array.from({ length: 10 }, (_, i) => weatherOf(keyOf(start + b * 10 + i)).key)));
  }
  assert.ok(seen.size > 100, '묶음마다 차례가 다름');
  assert.equal(weatherOf('2026-10-30'), weatherOf('2026-10-30'));
  for (const bad of ['', 'x', '2026-1-1', null, undefined, 20261030]) assert.equal(weatherOf(bad).key, 'sun');
});

test('🌦️ 날씨 기울임 — 같은 별 안에서만(별 몫·별 하나에 💰1 그대로) · 비 = 메기·뱀장어 · 흐림 = 깊은 곳에서 별마다 가장 큰 물고기 · 바람 = 속임 입질 한 번 더', () => {
  assert.deepEqual(BIG_KIND, ['bluegill', 'bungeo', 'ingeo', 'megi', 'jangeo']);
  assert.deepEqual(weatherTilt('rain', 'shore'), { megi: 2, jangeo: 2 });
  assert.deepEqual(weatherTilt('cloud', 'deep'), { bluegill: 2, bungeo: 2, ingeo: 2, megi: 2, jangeo: 2 });
  assert.equal(weatherTilt('cloud', 'weed'), null);
  assert.equal(weatherTilt('sun', 'deep'), null);
  assert.equal(weatherTilt('wind', 'deep'), null);
  assert.deepEqual(['sun', 'cloud', 'rain', 'wind', ''].map(nibbleExtra), [0, 0, 0, 1, 0]);
  // 같은 난수 줄이면 기울여도 별은 늘 같다 (별을 먼저 뽑음) — 씨앗마다 별이 고루 나오는지도
  const deep = SPOTS.find((s) => s.key === 'deep');
  const stars = new Set();
  for (let seed = 1; seed <= 300; seed++) stars.add(rollFish(deep, 2, 3, lcg(seed), null).star);
  assert.equal(stars.size, 5, '시험 난수가 별 다섯을 다 뽑음');
  for (let seed = 1; seed <= 3000; seed++) {
    for (const tilt of [weatherTilt('rain', 'deep'), weatherTilt('cloud', 'deep')]) {
      const a = rollFish(deep, 2, 3, lcg(seed), tilt);
      const b = rollFish(deep, 2, 3, lcg(seed), null);
      assert.equal(a.star, b.star, `씨앗 ${seed}`);
    }
  }
  // ★4 가운데 메기 몫 — 비 오는 날 3/7 → 6/10 쯤
  const r = lcg(9);
  let m0 = 0; let m1 = 0; let n4 = 0;
  for (let i = 0; i < 40000; i++) {
    const a = rollFish(deep, 0, 0, r, null); const b = rollFish(deep, 0, 0, r, { megi: 2, jangeo: 2 });
    if (a.star === 4) { n4 += 1; if (a.key === 'megi') m0 += 1; }
    if (b.star === 4 && b.key === 'megi') m1 += 1;
  }
  assert.ok(Math.abs(m0 / n4 - 3 / 7) < 0.04, `맑음 메기 ${m0 / n4}`);
  assert.ok(m1 / n4 > 0.52 && m1 / n4 < 0.68, `비 메기 ${m1 / n4}`);
  // 이상한 기울임은 무시(0·음수·글자·물려받은 키)
  const odd = { megi: 0, gamulchi: -3, gangjun: 'x', toString: 9 };
  let star4 = 0;
  for (let seed = 1; seed < 2000; seed++) {
    const a = rollFish(deep, 0, 0, lcg(seed), odd);
    assert.deepEqual(a, rollFish(deep, 0, 0, lcg(seed), null));
    if (a.star === 4) star4 += 1;
  }
  assert.ok(star4 > 200, `★4가 충분히 뽑힘 (${star4})`);
  assert.ok(starOdds(deep, 0)[4] > 0);
});

test('📖 도감 칸 — SPECIES 차례 16 · 낚은 칸(가장 긴 cm·처음 날·소개 한 줄·외래종) · 안 낚은 칸(별마다 힌트) · 남은 수 없음', () => {
  assert.deepEqual(Object.keys(INTRO).sort(), SPECIES.map((s) => s.key).sort(), '소개 한 줄 16');
  for (const [k, line] of Object.entries(INTRO)) { assert.ok(line.length >= 15 && line.length <= 80, k); assert.match(line, /요\.$/, `${k} 끝말`); }
  assert.deepEqual(DEX_HINT, { 1: '물가에서 자주 보여요.', 2: '물가와 수초 밭에서 보여요.', 3: '수초 밭이나 깊은 곳에서 만나요.', 4: '깊은 곳에 살아요.', 5: '깊은 곳에서 아주 가끔 나와요.' }, '원고 그대로 · 별마다');
  // 힌트는 지금 자리 몫(SPOTS.w)과 맞음 — 물가에서 안 나오는 별(★4·★5)은 「물가」라고 하지 않음
  for (const s of [1, 2, 3, 4, 5]) {
    const shore = SPOTS.find((p) => p.key === 'shore').w[s];
    assert.equal(/물가/.test(DEX_HINT[s]), shore >= 5, `★${s} 물가 몫 ${shore}`);
  }
  const all = [...Object.values(INTRO), ...Object.values(DEX_HINT)].join('\n');
  assert.doesNotMatch(all, /남은|몇 종|종 남|더 낚아야/, '남은 수 문구 없음');
  // 원고 그대로 (몇 줄)
  assert.equal(INTRO.napjaru, '민물조개 속에 알을 낳아요. 조개 안에서 알이 깨어나고, 어린 물고기로 자란 뒤 밖으로 나와요.', 'Codex 171차 — 기간(칼납자루 자료)은 뺌');
  assert.equal(INTRO.ssogari, '표범 같은 무늬가 있고 맑은 강에 살아요. 「한강의 황쏘가리」는 천연기념물이에요.', 'Codex 171차 — 지정 이름 그대로');
  assert.equal(INTRO.bungeo, '우리나라 어디서나 사는 민물고기예요. 한 자(30.3 cm)가 넘으면 「월척」이라고 불러요.');
  assert.match(INTRO.gangjun, /skygazer/);
  const rows = dexRows({ dex: { bungeo: { n: 3, best: 31.2, d: '2026-10-29' }, bluegill: { n: 1, best: 99, d: '' }, gyarados: { n: 1 } } });
  assert.deepEqual(rows.map((r) => r.key), SPECIES.map((s) => s.key));
  const bg = rows.find((r) => r.key === 'bungeo');
  assert.deepEqual(bg, { key: 'bungeo', ko: '붕어', star: 2, alien: false, caught: true, n: 3, best: 31.2, d: '2026-10-29', intro: INTRO.bungeo });
  const blue = rows.find((r) => r.key === 'bluegill');
  assert.equal(blue.caught, true);
  assert.equal(blue.alien, true);
  assert.equal(blue.best, SPECIES.find((s) => s.key === 'bluegill').max, '길이 끝 안으로');
  const unk = rows.find((r) => r.key === 'jangeo');
  assert.deepEqual(unk, { key: 'jangeo', ko: '뱀장어', star: 5, alien: false, caught: false, hint: DEX_HINT[5] });
  assert.equal(rows.filter((r) => r.caught).length, 2);
  assert.equal(dexRows(null).filter((r) => r.caught).length, 0);
  assert.equal(lakeOf({ dex: {} }).dex.bungeo, undefined);
});

test('📤 🎣 줄 — 수학 뒤에 (🐟 맞힘/낸) · 하루 칸 둘(빈 기록 0 · 증분 · 병합 큰 쪽)', () => {
  assert.deepEqual(FISH_FM_Q, ['fishFmQ', 'fishFmOk']);
  const d = { fishSec: 600, fishCatch: 4, fishMathQ: 6, fishMathOk: 4, fishFmQ: 3, fishFmOk: 2, fishEnQ: 2, fishEnOk: 2 };
  assert.equal(lakeDayLine(d, (s) => `${Math.round(s / 60)}분`), '🎣 낚시터 10분 · 물고기 4마리 · 맞힘/낸 문제 수학 4/6(🐟 2/3) · 영어 2/2');
  assert.equal(lakeDayLine({ ...d, fishFmQ: 0 }, (s) => `${Math.round(s / 60)}분`), '🎣 낚시터 10분 · 물고기 4마리 · 맞힘/낸 문제 수학 4/6 · 영어 2/2', '물고기 수학이 없으면 괄호 없음');
  const e = emptyDaily('2026-10-30');
  assert.deepEqual([e.fishFmQ, e.fishFmOk], [0, 0]);
  const m = mergeDailyDelta(e, '2026-10-30', { fishFmQ: 2, fishFmOk: 1 });
  assert.deepEqual([m.fishFmQ, m.fishFmOk], [2, 1]);
  const mm = mergeStatRecord('daily', { ...e, fishFmQ: 5 }, { ...e, fishFmQ: 3, fishFmOk: 3 });
  assert.deepEqual([mm.fishFmQ, mm.fishFmOk], [5, 3]);
  assert.match(src('js/upload.js'), /수학 뒤 \(🐟 맞힘\/낸\) = 그 가운데 낚은 물고기 길이·무게로 낸 물고기 수학\(v367부터\)/);
});

test('🔌 잇기 — 날씨 칩·도감 단추·💡·힌트 카드 · 도감 보는 동안 시간 멈춤 · 던지기 전에만 · 창 id · 겹침 목록 · 홈 띠 📖 · 서비스워커 · 판', () => {
  const fv = src('js/fishview.js');
  for (const c of ['lk-wx', 'lk-dexbtn', 'lk-tip', 'lk-hint', 'lk-go']) assert.match(fv, new RegExp(`class="${c}"`), c);
  assert.match(fv, /dexRoot\.id = 'lk-dex';/);
  assert.match(fv, /if \(!ui\.dexOpen\) ui\.used \+= activeStep\(/, '도감 보는 동안 하루 시간 안 셈');
  assert.match(fv, /const canDex = ui\.st === 'ready' && !ui\.busy && !ui\.paused && typeof ui\.host\.dexRows === 'function';/);
  assert.match(fv, /if \(!ui \|\| ui\.st !== 'ready' \|\| ui\.busy \|\| ui\.paused \|\| typeof ui\.host\.dexRows !== 'function'\) return;\n\s*const me = ui;[\s\S]{0,200}ui\.paused = true;\n\s*ui\.dexOpen = true;/);
  assert.match(fv, /h\.onAnswer && h\.onAnswer\(subj, ok, stage, q\)/);
  assert.match(fv, /if \(!ok && c\.hint\) \{/);
  assert.match(fv, /rollFish\(ui\.spot, ui\.chum, ui\.streak, Math\.random, weatherTilt\(ui\.wx, ui\.spot\.key\)\)/);
  assert.equal((fv.match(/weatherTilt\(ui\.wx, ui\.spot\.key\)/g) || []).length, 2, '입질·물속 그림자 둘 다');
  assert.match(fv, /const k = n \+ nibbleExtra\(ui\.wx\);/);
  assert.match(fv, /if \(ui\.wx === 'rain' && !ui\.lite\) drawRain\(/, '느린 기기면 빗줄기 끔');
  assert.match(fv, /paintStatic\(g, step \/ 100, v\.x0, v\.x1, v\.y0, v\.y1, ui\.wx\);/);
  assert.match(fv, /export function closeLake\(quiet\) \{\n\s*if \(!ui\) return;\n\s*closeDexView\(\);/);
  assert.match(fv, /export function openLake\(host\) \{\n\s*if \(!root\) build\(\);\n\s*closeDexView\(\);/, '홈에서 연 도감은 낚시터를 열 때 닫음 (Codex 171차)');
  assert.match(fv, /if \(go && !go\.hidden && \(e\.code === 'Space' \|\| e\.key === 'Enter'\)\) \{ e\.preventDefault\(\); if \(!e\.repeat\) \{ touch\(\); go\.click\(\); \} return; \}[^\n]*\n\s*if \(e\.code === 'Space'\)/, 'Space로 「알겠어요」 (Codex 171차)');
  assert.match(src('js/lakeview.js'), /const start = startOf\(d\);/);
  assert.match(src('js/fishart.js'), /export const RAIN_N = 40;/);
  const lv = src('js/lakeview.js');
  assert.match(lv, /weather: testWeather\(\) \|\| weatherOf\(today\),/);
  assert.match(lv, /if \(!\/\[\?&\]nosw=1\/\.test\(s\)\) return null;/, '시험 날씨는 nosw=1일 때만');
  assert.match(lv, /dexRows: \(\) => dexRows\(lakeRaw\(\)\),/);
  assert.match(lv, /\.\.\.\(q && q\.fm \? \{ \[FISH_FM_Q\[0\]\]: 1, \[FISH_FM_Q\[1\]\]: ok \? 1 : 0 \} : \{\}\)/);
  assert.match(lv, /const avail = SUBJECTS\.filter\(\(s\) => \(ui\.src && ui\.src\[s\]\) \|\| \(s === 'math' && fmOk\)\);/);
  assert.match(lv, /if \(done && dexRows\(lakeRaw\(\)\)\.some\(\(r\) => r\.caught\)\) \{/, '오늘 낚시가 끝난 날 홈 띠 📖');
  assert.doesNotMatch(src('index.html'), /id="lk-dex"/, '도감 창 id는 fishview가 만든다');
  for (const f of ['js/hatch.js', 'js/parcel.js', 'js/korbattleview.js']) assert.match(src(f), /'jr-trip', 'lk-lake', 'lk-dex'\]/, `${f} 겹침 목록`);
  assert.ok(OVERLAYS.some((o) => o.place === 'lake' && o.ids.includes('lk-dex')), '🕒 도감 창도 낚시터 자리');
  const css = src('css/style.css');
  assert.match(css, /^\.lk-dexv \{[^\n]*z-index: 67;/m, '낚시터(66) 위');
  assert.match(css, /^\.lk \{[^\n]*z-index: 66;/m);
  const sw = src('sw.js');
  assert.match(sw, /'\.\/js\/fishmath\.js',/);
  assert.match(sw, /const CACHE_VERSION = 'v367';/);
  assert.match(src('js/version.js'), /APP_VERSION = 'v367'/);
  // 아이 화면 — 남은 수·종 셈 문구 없음
  for (const f of ['js/fishview.js', 'js/lakeview.js']) assert.doesNotMatch(code(f).split('\n').filter((l) => !/lakeTodayLine|오늘 — 낚시/.test(l)).join('\n'), /남은 (시간|분|종)|몇 종|종 남/, f);
});
