// ✍️ v418 (2026-11-12 아버님 「낚시에서 나오는 수학 문제들을 주관식으로」 → 기본안 「추천대로」) — node --test tests/lakepad418.test.js
//   낚시터 수학은 보기 대신 숫자판으로 직접 쓴다 — 배운 칸은 계산 문제만(learnedPad) · 🐟 물고기 수학·📐 다지기는 답이 같은 단위의 수인 꼴만(numPad) ·
//   채점은 수학 과목과 같은 matchTyped · 🤷 모르겠어요 = 틀림 · 숫자로 낼 문제가 없을 때만 보기 그대로 · 쓰는 동안 낚시 시간이 안 감 · 📤 ✍️ 직접 쓰기 맞힘/낸 · 🤷
// ★ 씨앗은 PAD_SEEDS로 넓게 (기본 120)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { numUnit, numPad, shownTyped, lakeTyped, learnedPad } from '../js/lakepad.js';
import { readTyped, partsOf, textVal } from '../js/mathpad.js';
import { mathHint } from '../js/lakelevel.js';
import { STEMS, STEM_ORDER } from '../js/mathprog.js';
import { SPECIES, FISH_PAD_Q, FISH_MATH_AT, lakeDayLine } from '../js/fishing.js';
import { fishMathQ } from '../js/fishmath.js';
import { typedSrcs, typedFirst, padDelta, mathPadOn, mathMix, startOf, asker, askFrom } from '../js/lakeview.js';
import { orderOf } from '../js/journey.js';

const src = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const SEEDS = Number(process.env.PAD_SEEDS) || 120;
const OPTS = { names: ['피카츄', '리자몽', '개굴닌자'], me: '진우' };
/** 두 값이 같은가 (시험 쪽에서 따로 — mathpad의 견주기를 믿지 않고) · 수·분수·대분수는 유리수로 · 몫 … 나머지·비는 칸마다 */
function sameValue(a, b) {
  if (!a || !b) return false;
  if (a.v && b.v) return a.v.n * b.v.d === b.v.n * a.v.d;
  if (a.form === 'rem' && b.form === 'rem') return a.q === b.q && a.r === b.r;
  if (a.form === 'ratio' && b.form === 'ratio') return a.a.n * b.a.d === b.a.n * a.a.d && a.b.n * b.b.d === b.b.n * a.b.d;
  return false;
}
/** 보기 글을 그 꼴의 칸에 쳐 넣은 결과 */
const typeText = (text, spec) => { const t = partsOf(text); return t && readTyped(t.mode, t.p, spec); };
function lcg(seed) { let s = seed >>> 0 || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
/** 무작위 도감 — 종 2~16 · 가장 긴 cm는 그 종 길이 안(소수 한 자리) · 낚은 수 1~25 (fishmath367과 같은 꼴) */
function randDex(r) {
  const n = 2 + Math.floor(r() * 15);
  const keys = SPECIES.map((s) => s.key).sort(() => r() - 0.5).slice(0, n);
  const dex = {};
  for (const k of keys) {
    const sp = SPECIES.find((s) => s.key === k);
    dex[k] = { n: 1 + Math.floor(r() * 25), best: Math.round((sp.min + (sp.max - sp.min) * r()) * 10) / 10, d: '2026-10-30' };
  }
  return { dex };
}

test('📏 수와 단위 — 「12.3 cm」「1380 g」「3마리」「−5」 · 분수·몫 … 나머지·비·이름은 null', () => {
  assert.deepEqual(numUnit('12.3 cm'), { n: '12.3', u: 'cm' });
  assert.deepEqual(numUnit('1380 g'), { n: '1380', u: 'g' });
  assert.deepEqual(numUnit('3마리'), { n: '3', u: '마리' });
  assert.deepEqual(numUnit('1.38 kg'), { n: '1.38', u: 'kg' });
  assert.deepEqual(numUnit('−5'), { n: '−5', u: '' });
  for (const s of ['3/4', '2 1/6', '4 … 5', '2 : 4', '붕어', '', null, '12.3 cm 5 mm']) assert.equal(numUnit(s), null, String(s));
  assert.equal(shownTyped('12.3', 'cm'), '12.3 cm');
  assert.equal(shownTyped('3', '마리'), '3마리', '한글 단위는 붙여서');
  assert.equal(shownTyped('69%', '%'), '69%');
  assert.equal(shownTyped('7', ''), '7');
});

test('🐟 숫자판 꼴 — 같은 단위의 수 보기만 · 이름을 고르는 문제·단위가 섞인 보기·「다음 중」·정답이 하나가 아니면 null · 짐작엔 풀이 한 줄', () => {
  const q = { text: '붕어는 피라미보다 몇 cm 더 길까요?', solve: '31.2 − 12.5 = 18.7 (cm)', choices: [{ text: '18.7 cm', ok: true }, { text: '19.7 cm', ok: false, hint: '🤔 받아내림', trap: 'borrow' }, { text: '187 cm', ok: false }, { text: '43.7 cm', ok: false }] };
  const p = numPad(q);
  assert.deepEqual(p.spec, { modes: ['num'], start: 'num', unit: 'cm', signed: false, need: null, reduce: false });
  assert.deepEqual(p.texts, ['18.7', '19.7', '187', '43.7']);
  assert.equal(p.why, '풀이: 31.2 − 12.5 = 18.7 (cm)');
  assert.equal(numPad({ text: '가장 긴 물고기는 무엇일까요?', choices: [{ text: '붕어', ok: true }, { text: '잉어', ok: false }] }), null);
  assert.equal(numPad({ ...q, choices: [{ text: '1.3 kg', ok: true }, { text: '1300 g', ok: false }] }), null, '단위가 섞임');
  assert.equal(numPad({ ...q, text: '다음 중 가장 긴 길이는?' }), null);
  assert.equal(numPad({ ...q, choices: q.choices.map((c) => ({ ...c, ok: false })) }), null);
  // 채점 — 정답(끝의 0을 붙여도) · 오답 보기와 같은 값이면 그 실수의 한 줄과 trap · 어느 것과도 다르면 짐작(풀이 한 줄)
  const qq = { ...q, pad: p };
  const typed = (x) => readTyped('num', { x }, p.spec);
  assert.deepEqual(lakeTyped(qq, typed('18.7')), { ok: true, i: 0, hint: '', note: null, guess: false });
  assert.equal(lakeTyped(qq, typed('18.70')).ok, true);
  assert.deepEqual(lakeTyped(qq, typed('19.7')), { ok: false, i: 1, hint: '🤔 받아내림', note: null, trap: 'borrow', guess: false });
  assert.deepEqual(lakeTyped(qq, typed('187')), { ok: false, i: 2, hint: '풀이: 31.2 − 12.5 = 18.7 (cm)', note: null, guess: false }, '힌트 없는 오답 보기는 풀이 한 줄');
  assert.deepEqual(lakeTyped(qq, typed('5')), { ok: false, i: -1, hint: '풀이: 31.2 − 12.5 = 18.7 (cm)', note: null, guess: true });
  assert.equal(lakeTyped({ ...qq, pad: null }, typed('18.7')).ok, false, 'pad가 없으면 맞음으로 치지 않는다');
});

test('★ 🐟 물고기 수학 직접 쓰기 — 무작위 도감·단계·씨앗 넓게: 늘 숫자판 꼴 · 이름 고르기 없음 · 정답을 치면 맞음 · 오답 보기를 치면 그 보기 · 보기 꼴은 옛것 그대로', () => {
  const r = lcg(418);
  let made = 0;
  const kinds = new Set();
  for (let d = 0; d < 40; d++) {
    const raw = randDex(r);
    for (let s = 1; s <= SEEDS / 4; s++) {
      for (const lv of [1, 2, 3]) {
        const seed = d * 1000 + s;
        const plain = fishMathQ(raw, seed, '', lv, null);
        assert.deepEqual(plain, fishMathQ(raw, seed, '', lv, null, false), '직접 쓰기가 아니면 옛 문제 그대로');
        if (plain) assert.equal('pad' in plain, false);
        const q = fishMathQ(raw, seed, '', lv, null, true);
        if (!q) continue;
        made += 1;
        kinds.add(q.kind);
        assert.ok(q.pad && q.pad.spec, '숫자판 꼴');
        assert.notEqual(q.kind, 'cmp', '이름을 고르는 길이 비교는 안 낸다');
        assert.deepEqual(q.pad, numPad(q));
        const okC = q.choices.find((c) => c.ok);
        assert.equal(lakeTyped(q, readTyped('num', { x: numUnit(okC.text).n }, q.pad.spec)).ok, true, `정답 ${okC.text}`);
        q.choices.forEach((c, i) => {
          if (c.ok) return;
          const t = lakeTyped(q, readTyped('num', { x: numUnit(c.text).n }, q.pad.spec));
          assert.equal(t.ok, false);
          assert.equal(t.i, i, `오답 보기 ${c.text}`);
          assert.equal(t.hint, c.hint || q.pad.why);
        });
      }
    }
  }
  assert.ok(made > 300, `만든 수 ${made}`);
  for (const k of ['sub', 'add', 'wadd', 'unit', 'bar']) assert.ok(kinds.has(k), `${k} 꼴도 나온다(막대그래프는 「몇 마리 더」만)`);
});

test('📐 다지기 — 직접 쓰기에도 하루 몫이면 다지기 문제 · 숫자판 꼴', () => {
  const r = lcg(392);
  let n = 0;
  for (let d = 0; d < 30; d++) {
    const raw = randDex(r);
    for (const stage of [1, 2, 3]) {
      const q = fishMathQ(raw, 7 + d, '', 1, { stage, ask: true }, true);
      if (!q || !q.ud) continue;
      n += 1;
      assert.equal(q.kind, 'unit');
      assert.ok(q.pad, '숫자판');
      assert.ok(q.pad.spec.unit, `칸 옆 단위 ${q.choices[0].text}`);
    }
  }
  assert.ok(n > 20, `다지기 ${n}`);
});

test('★ 🔢 배운 칸 계산 문제 — 모든 줄기: 숫자판으로 받을 수 있으면 꼴 · 정답을 치면 맞음 · 오답 보기를 치면 그 보기(그 실수의 풀이 한 줄) · 짐작엔 어느 오답이든 같은 풀이', () => {
  let padded = 0;
  let all = 0;
  for (const key of STEM_ORDER) {
    const S = STEMS[key];
    for (const c of S.list) {
      const id = c.id;
      for (let seed = 1; seed <= Math.max(4, SEEDS / 20); seed++) {
        const q = S.gen.makeQuestion(id, 'calc', seed * 7919, OPTS);
        if (!q || !Array.isArray(q.choices)) continue;
        all += 1;
        const p = learnedPad(q, key);
        if (!p) continue;
        padded += 1;
        assert.deepEqual(p.texts, q.choices.map((x) => String(x.text)));
        assert.equal(p.why, mathHint(q, { ok: false }));
        // 낚시터 카드 꼴(math.journeyMathSource와 같게 — 틀린 보기엔 그 실수의 풀이)
        const lq = { choices: q.choices.map((x) => ({ text: String(x.text), ok: !!x.ok, ...(mathHint(q, x) ? { hint: mathHint(q, x) } : {}) })), pad: p };
        const okC = q.choices.find((x) => x.ok);
        const ty = typeText(okC.text, p.spec);
        assert.ok(ty, `정답을 칠 수 있다 ${id} ${okC.text}`);
        assert.equal(lakeTyped(lq, ty).ok, true, `${id} 정답 ${okC.text}`);
        lq.choices.forEach((x, i) => {
          if (x.ok) return;
          const tw = typeText(x.text, p.spec);
          if (!tw) return;
          const t = lakeTyped(lq, tw);
          if (t.ok) {
            // 맞음으로 받아도 되는 오답 보기는 「같은 값의 다른 꼴」뿐 — 값이 같고, 꼴을 묻는 문제면 꼴까지 · 약분을 묻는 문제면 약분까지 (Codex 221차 P3)
            assert.ok(sameValue(textVal(x.text), textVal(okC.text)), `${id} 값이 다른 오답 ${x.text}를 맞음으로 (정답 ${okC.text})`);
            if (p.spec.need) assert.equal(textVal(x.text).form, p.spec.need, `${id} 꼴을 묻는데 ${x.text}`);
            if (p.spec.reduce && textVal(x.text).form === 'frac') assert.ok(textVal(x.text).reduced, `${id} 약분을 묻는데 ${x.text}`);
            return;
          }
          assert.equal(t.ok, false, `${id} 오답 ${x.text}`);
          if (t.i === i) assert.equal(t.hint, x.hint || p.why);
        });
      }
    }
  }
  assert.ok(padded > all * 0.3, `숫자판으로 낼 수 있는 계산 문제 ${padded}/${all}`);
});

test('🎣 문제 고르기 — 직접 쓰기 원천은 make에 { typed: true } · 수학만 · 숫자로 낼 문제가 없으면 그때만 보기 그대로 · ⚙ 스위치', () => {
  const calls = [];
  const srcs = { math: { keys: ['a'], make: (id, seed, lv, opt) => { calls.push(opt); return null; } }, english: { keys: ['x'], make: () => 'E' } };
  const t = typedSrcs(srcs);
  assert.equal(t.english, srcs.english, '다른 과목은 그대로');
  t.math.make('a', 1, 2);
  assert.deepEqual(calls, [{ typed: true }]);
  assert.equal(typedSrcs(null), null);
  assert.deepEqual(typedSrcs({ english: srcs.english }), { english: srcs.english });
  // 직접 쓰기 먼저 · 수학이 비면 보기 그대로 · 다른 과목은 보기 그대로를 안 부른다
  const seen = [];
  const inner = (subj) => (subj === 'english' ? 'E' : null);
  const plain = (subj) => { seen.push(subj); return 'P'; };
  const f = typedFirst(inner, plain);
  assert.equal(f('math', 1, 1), 'P');
  assert.equal(f('english', 1, 1), 'E');
  assert.equal(f('korean', 1, 1), null);
  assert.deepEqual(seen, ['math']);
  assert.equal(typedFirst(() => 'T', plain)('math', 1, 1), 'T');
  assert.equal(typedFirst(inner, null)('math', 1, 1), null);
  // 섞기(mathMix)는 그대로 — 직접 쓰기 물고기 수학이 없으면 배운 칸
  const mix = mathMix((s) => (s === 'math' ? 'L' : null), () => null);
  assert.deepEqual([mix('math', 1, 1), mix('math', 2, 1)], ['L', 'L']);
  // ⚙ 「🔢 수학 숫자판」 — 기본 켬 · 끄면 보기
  const store = new Map();
  globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) };
  assert.equal(mathPadOn(), true);
  store.set('shincoach.settings', JSON.stringify({ mathPad: false }));
  assert.equal(mathPadOn(), false);
  store.set('shincoach.settings', '{깨짐');
  assert.equal(mathPadOn(), true);
  delete globalThis.localStorage;
  assert.equal(mathPadOn(), true, '저장소가 없어도 켬');
});

test('📤 직접 쓰기 칸 — 수학 숫자판 답만 · 🤷은 틀림 + 모르겠어요 · 낚시 줄 수학 뒤 (✍️ 직접 쓰기 맞힘/낸 · 🤷 N)', () => {
  assert.deepEqual(FISH_PAD_Q, ['fishPadQ', 'fishPadOk', 'fishPadIdk']);
  assert.deepEqual(padDelta('math', true, { how: 'typed' }), { fishPadQ: 1, fishPadOk: 1 });
  assert.deepEqual(padDelta('math', false, { how: 'typed' }), { fishPadQ: 1, fishPadOk: 0 });
  assert.deepEqual(padDelta('math', false, { how: 'idk' }), { fishPadQ: 1, fishPadOk: 0, fishPadIdk: 1 });
  assert.deepEqual(padDelta('math', true, {}), {}, '보기를 누른 답은 안 셈');
  assert.deepEqual(padDelta('english', true, { how: 'typed' }), {});
  assert.deepEqual(padDelta('math', true, null), {});
  for (const k of FISH_PAD_Q) assert.match(src('js/db.js'), new RegExp(`'${k}'`), `${k} 하루 칸(maxOf 병합)`);
  const d = { fishSec: 600, fishCatch: 3, fishMathQ: 6, fishMathOk: 4, fishFmQ: 2, fishFmOk: 1, fishPadQ: 5, fishPadOk: 3, fishPadIdk: 1 };
  assert.match(lakeDayLine(d), /맞힘\/낸 문제 수학 4\/6\(🐟 1\/2 · ✍️ 직접 쓰기 3\/5 · 🤷 1\)/);
  assert.match(lakeDayLine({ ...d, fishFmQ: 0, fishFmOk: 0 }), /수학 4\/6\(✍️ 직접 쓰기 3\/5 · 🤷 1\)/);
  assert.match(lakeDayLine({ ...d, fishPadQ: 0 }), /수학 4\/6\(🐟 1\/2\)( |$)/, '옛 날 줄 그대로');
  assert.match(src('js/upload.js'), /✍️ 직접 쓰기 맞힘\/낸 · 🤷 N = 그 가운데 보기 없이 숫자판으로 답을 쓴 문제\(v418부터/);
});

test('🔌 잇기 — 카드는 pad면 숫자판 · 🤷·틀림은 정답과 한 줄을 「알겠어요」까지 · 쓰는 동안 시간 안 감 · 배운 칸 원천 · 물고기 수학 · sw·판 v418', () => {
  const fv = src('js/fishview.js');
  assert.match(fv, /import \{ padBox, padAnswered \} from '\.\/padview\.js';/);
  assert.match(fv, /const pad = !!\(q\.pad && q\.pad\.spec\);/);
  assert.match(fv, /ui\.padOpen = pad;/);
  assert.match(fv, /if \(ui !== me\) return;\n\s+ui\.padOpen = false;/, '닫을 때 끈다');
  assert.match(fv, /if \(!ui\.dexOpen && !ui\.shopOpen && !ui\.padOpen\) ui\.used \+= activeStep\(/);
  assert.match(fv, /onSubmit: \(typed\) => \{ const r = lakeTyped\(q, typed\); settle\(r\.ok, shownTyped\(typed\.text, unit\), r\); \},/);
  assert.match(fv, /onIdk: \(\) => settle\(false, '🤷 모르겠어요', null\),/);
  assert.match(fv, /answered\(ok, \{ trap: r && r\.trap, how: r \? 'typed' : 'idk' \}\);/);
  assert.match(fv, /const right = el\('b', 'lk-hint-ans', '정답: '\);/, '틀리면 정답을 보여 준다');
  assert.match(fv, /\.\.\.\(info\.how \? \{ how: info\.how \} : \{\}\)/);
  const lk = src('js/lakeview.js');
  assert.match(lk, /const typed = mathPadOn\(\);/);
  assert.match(lk, /const plain = typed \? mathMix\(asker\(\{ math: ui\.src && ui\.src\.math \}, day, start\), fm\(false\)\) : null;/);
  assert.match(lk, /const inner = mathMix\(asker\(srcs, day, start, 'lake', atStep, typed \? \['math'\] : \[\]\), fm\(typed\)\);/);
  assert.match(lk, /const atStep = \(subj, step\) => \{ if \(subj === 'math' && alive\(\)\) log\.put\(\{ \[FISH_MATH_AT\]: step \}\); \};/);
  assert.match(lk, /const atGap = start\.math - nz\(d && d\[FISH_MATH_AT\]\);\n\s+if \(atGap > 0\) log\.put\(\{ \[FISH_MATH_AT\]: atGap \}\);/, '연 때 자리에 맞춤');
  assert.match(lk, /const base = typedFirst\(inner, plain\);/);
  assert.match(lk, /return redoAsker\(\(subj, seed, lv\) => base\([^\n]*\), srcs && srcs\.math, rq, alive\);/, '🔁 다시 풀기도 직접 쓰기 원천으로');
  assert.match(lk, /fishMathQ\(lakeRaw\(\), seed, avoid, lv, ut\.now\(\), only\)/);
  const mj = src('js/math.js');
  assert.match(mj, /make\(id, seed, lv = 1, opt = \{\}\) \{/);
  assert.match(mj, /for \(const kind of typed \? \['calc'\] : mathKinds\(lv\)\)/);
  assert.match(mj, /const pad = typed \? learnedPad\(q, sx\.key\) : null;[^\n]*\n\s+if \(typed && !pad\) continue;/);
  assert.match(mj, /\.\.\.\(pad \? \{ pad \} : \{\}\) \};/);
  assert.match(src('js/tourview.js'), /fishMathQ\(raw, sd, avoid, lv, null\)/, '🎒 대여행은 그대로(보기)');
  assert.match(src('css/style.css'), /\.lk-choices\.is-pad \{ display: block; \}/);
  assert.match(src('sw.js'), /'\.\/js\/lakepad\.js',/);
  assert.ok(Number((/CACHE_VERSION = 'v(\d+)'/.exec(src('sw.js')) || [])[1]) >= 418, 'sw v418 이상');
  assert.ok(Number((/APP_VERSION = 'v(\d+)'/.exec(src('js/version.js')) || [])[1]) >= 418, '앱 판 v418 이상');
});

// ───────────────────── Codex 221차 고침 ─────────────────────

test('🔢 같은 값의 다른 꼴 (Codex 221차 P3) — 1/2 ↔ 0.50은 맞음 · 0.6은 틀림 · 「분수로」를 물으면 0.5는 틀림(꼴 안내) · 「소수로」를 물으면 1/2은 틀림', () => {
  const mk = (ask, okText, wrong) => {
    const q = { kind: 'calc', q: ask, choices: [{ text: okText, ok: true }, ...wrong.map((t) => ({ text: t, ok: false }))] };
    const p = learnedPad(q, 'fraction');
    assert.ok(p, `숫자판 꼴 ${ask}`);
    return { choices: q.choices, pad: p };
  };
  const plain = mk('피자 한 판의 반은 얼마일까요?', '1/2', ['1/3', '2/3', '3/4']);
  const typeAs = (q, mode, parts) => lakeTyped(q, readTyped(mode, parts, q.pad.spec));
  assert.equal(typeAs(plain, 'num', { x: '0.50' }).ok, true, '0.50 = 1/2');
  assert.equal(typeAs(plain, 'num', { x: '0.6' }).ok, false, '0.6 ≠ 1/2');
  assert.equal(typeAs(plain, 'frac', { n: '2', d: '4' }).ok, true, '2/4 = 1/2 (약분 안내와 함께)');
  assert.match(typeAs(plain, 'frac', { n: '2', d: '4' }).note || '', /약분/);
  const asFrac = mk('0.5를 분수로 나타내면 얼마일까요?', '1/2', ['1/5', '5/10', '2/5']);
  assert.equal(asFrac.pad.spec.need, 'frac');
  const r = typeAs(asFrac, 'num', { x: '0.5' });
  assert.equal(r.ok, false, '분수로 물었는데 0.5');
  assert.match(r.hint, /분수로 나타내야 해요/);
  const asDec = mk('1/2을 소수로 나타내면 얼마일까요?', '0.5', ['0.2', '1.2', '0.12']);
  assert.equal(typeAs(asDec, 'frac', { n: '1', d: '2' }).ok, false, '소수로 물었는데 1/2');
  assert.equal(typeAs(asDec, 'num', { x: '0.5' }).ok, true);
});

test('↩️ 다시 열면 넘긴 자리 뒤부터 (Codex 221차 P2-3) — 숫자로 못 내 건너뛴 칸까지 fishMathAt에 · startOf는 답한 수와 넘긴 자리 중 큰 쪽', () => {
  assert.equal(FISH_MATH_AT, 'fishMathAt');
  assert.match(src('js/db.js'), /'fishMathAt',/, '하루 칸(maxOf 병합)');
  assert.equal(startOf({ fishMathQ: 1 }).math, 1, '옛 날은 답한 수');
  assert.equal(startOf({ fishMathQ: 1, fishMathAt: 2 }).math, 2);
  assert.equal(startOf({ fishMathQ: 5, fishFmQ: 1, fishMathAt: 2 }).math, 4, '답한 수가 더 크면 그것');
  assert.equal(startOf({ fishEnQ: 3, fishMathAt: 9 }).english, 3, '수학만');
  // 그날 줄 [A(숫자로 못 냄), B, C] — B를 낸 뒤 넘긴 자리 2 → 다시 열면 C
  const day = '2026-11-12';
  const line = orderOf(['a', 'b', 'c'], `lake:${day}`, 'math');
  const src3 = { keys: ['a', 'b', 'c'], make: (k) => (k === line[0] ? null : { q: k, choices: [{ text: '1', ok: true }, { text: '2', ok: false }] }) };
  const steps = [];
  const ask1 = asker({ math: src3 }, day, startOf({}), 'lake', (s, n) => steps.push([s, n]));
  assert.equal(ask1('math', 1, 1).q, line[1]);
  assert.deepEqual(steps, [['math', 2]], '건너뛴 칸까지 둘');
  const d = { fishMathQ: 1, fishMathAt: 2 };
  const ask2 = asker({ math: src3 }, day, startOf(d), 'lake');
  assert.equal(ask2('math', 1, 1).q, line[2], '다시 열면 C (전엔 B를 또 냈다)');
});

test('🔎 직접 쓰기 수학은 줄을 한 바퀴 다 본다 (Codex 221차 P2-4) — 앞 열두 칸이 숫자로 못 내는 칸이어도 열셋째를 낸다 · 다른 과목·옛 길은 열둘까지', () => {
  const keys = Array.from({ length: 14 }, (_, i) => `k${String(i).padStart(2, '0')}`);
  const day = '2026-11-12';
  const line = orderOf(keys, `lake:${day}`, 'math');
  const good = line[12];
  const src14 = { keys, make: (k) => (k === good ? { q: k, choices: [{ text: '1', ok: true }, { text: '2', ok: false }] } : null) };
  assert.deepEqual(askFrom(src14, 'math', day, 0, 1, 1, 'lake'), { q: null, step: 12 }, '옛 길은 열둘까지');
  assert.equal(askFrom(src14, 'math', day, 0, 1, 1, 'lake', Infinity).q.q, good);
  assert.equal(asker({ math: src14 }, day, {}, 'lake', null, ['math'])('math', 1, 1).q, good, '넓게 보면 낸다');
  assert.equal(asker({ math: src14 }, day, {}, 'lake')('math', 1, 1), null);
  // 그래서 보기 그대로(plain)는 안 부른다
  let plainCalls = 0;
  const f = typedFirst(mathMix(asker({ math: src14 }, day, {}, 'lake', null, ['math']), () => null), () => { plainCalls += 1; return 'P'; });
  assert.equal(f('math', 1, 1).q, good);
  assert.equal(plainCalls, 0);
});
