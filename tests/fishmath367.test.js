// 🐟 물고기 수학 (v367 — 낚시 2단계 기본안 「이대로」) — node --test tests/fishmath367.test.js
// 그 기기 도감의 길이·무게로 낸 4학년 문제 — 정답을 시험이 따로 다시 셈(만드는 쪽을 베끼지 않게) · 무작위 도감 수천 개 · 틀린 보기마다 힌트 · 낚시터 카드 꼴
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SPECIES, weightOf } from '../js/fishing.js';
import { fishMathQ, makeFishQ, poolOf, fishMathReady, FM_KIND_LIST, FM_LABEL, tenth, hundredth } from '../js/fishmath.js';
import { mathMix, asker, startOf } from '../js/lakeview.js';

const src = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

// 시험 쪽 글자 만들기 (fishmath의 tenth·hundredth와 따로)
const t1 = (v) => (v / 10).toFixed(1).replace(/\.0$/, '');
const t2 = (v) => (v / 100).toFixed(2).replace(/0$/, '').replace(/\.0$/, '').replace(/\.$/, '');
// 가벼운 씨앗 난수 (시험용)
function lcg(seed) { let s = seed >>> 0 || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
/** 무작위 도감 — 종 2~16 · 가장 긴 cm는 그 종 길이 안(소수 한 자리) · 낚은 수 1~25 */
function randDex(r) {
  const n = 2 + Math.floor(r() * 15);
  const keys = SPECIES.map((s) => s.key).sort(() => r() - 0.5).slice(0, n);
  const dex = {};
  for (const k of keys) {
    const sp = SPECIES.find((s) => s.key === k);
    const best = Math.round((sp.min + (sp.max - sp.min) * r()) * 10) / 10;
    dex[k] = { n: 1 + Math.floor(r() * 25), best, d: '2026-10-30' };
  }
  return { dex };
}
const FACT = /^(.+) ([\d.]+) (cm|kg)$/;
const parseFacts = (facts) => facts.map((f) => { const m = FACT.exec(f); assert.ok(m, `사실 꼴 ${f}`); return { ko: m[1], v: m[2], u: m[3] }; });
const toT = (s) => Math.round(parseFloat(s) * 10);
const toH = (s) => Math.round(parseFloat(s) * 100);

test('🔢 글자 — 십분의 일 cm · 백분의 일 kg (끝의 0은 뗌)', () => {
  assert.deepEqual([tenth(312), tenth(300), tenth(5), tenth(90)], ['31.2', '30', '0.5', '9']);
  assert.deepEqual([hundredth(138), hundredth(130), hundredth(200), hundredth(105), hundredth(7)], ['1.38', '1.3', '2', '1.05', '0.07']);
  for (let v = 1; v < 3000; v += 7) { assert.equal(tenth(v), t1(v)); assert.equal(hundredth(v), t2(v)); }
});

test('🐟 문제에 쓰는 물고기 — 도감에서 낚은 종만 · 길이(십분의 일 cm)·무게(백분의 일 kg)는 도감 기록으로 · 두 종부터', () => {
  const raw = { dex: { bungeo: { n: 3, best: 31.2, d: '2026-10-30' }, megi: { n: 1, best: 71.8, d: '' }, gyarados: { n: 1, best: 5 } } };
  const pool = poolOf(raw);
  assert.deepEqual(pool.map((x) => x.key), ['bungeo', 'megi'], '모르는 종은 뺌 · SPECIES 차례');
  const megi = SPECIES.find((s) => s.key === 'megi');
  assert.deepEqual(pool[1], { key: 'megi', ko: '메기', L: 718, n: 1, H: Math.round(weightOf(megi, 71.8) / 10) });
  assert.equal(fishMathReady(raw), true);
  assert.equal(fishMathReady({ dex: { bungeo: { n: 1, best: 20 } } }), false, '한 종이면 안 냄');
  assert.equal(fishMathReady(null), false);
  assert.equal(fishMathQ({ dex: { bungeo: { n: 1, best: 20 } } }, 1), null);
  assert.equal(makeFishQ('cmp', pool, 1), null, '세 종이 있어야 견줌');
  assert.equal(makeFishQ('nope', pool, 1), null);
});

test('★ 정답을 따로 다시 셈 — 무작위 도감 4천 개 × 꼴 여섯 · 정답 하나 · 보기는 서로 다름 · 틀린 보기마다 힌트', () => {
  const r = lcg(367);
  const made = Object.fromEntries(FM_KIND_LIST.map((k) => [k, 0]));
  for (let i = 0; i < 4000; i++) {
    const pool = poolOf(randDex(r));
    for (const kind of FM_KIND_LIST) {
      const q = makeFishQ(kind, pool, 1 + Math.floor(r() * 2e9));
      if (!q) continue;
      made[kind] += 1;
      const ok = q.opts.filter((o) => o.ok);
      assert.equal(ok.length, 1, `${kind} 정답 하나`);
      assert.equal(new Set(q.opts.map((o) => o.t)).size, q.opts.length, `${kind} 보기 겹침 ${q.opts.map((o) => o.t)}`);
      assert.ok(q.opts.length >= 3, `${kind} 보기 수`);
      for (const o of q.opts.filter((x) => !x.ok)) assert.ok(q.hints[o.trap] && q.hints[o.trap].length > 5, `${kind} ${o.trap} 힌트`);
      const ans = ok[0].t;
      const f = parseFacts(q.facts);
      // 숫자로 같은 보기 없음 (2.5와 2.50 — Codex 171차)
      const nums = q.opts.map((o) => /^([\d.]+) /.exec(o.t)).filter(Boolean).map((m) => Math.round(parseFloat(m[1]) * 1000));
      if (nums.length) assert.equal(new Set(nums).size, nums.length, `${kind} 숫자로 같은 보기 ${q.opts.map((o) => o.t)}`);
      // 무게 합의 「소수점 안 맞춤」 보기·힌트 — 1.3을 0.13으로, 1을 0.01로 읽은 값 · 힌트는 1.30·1.00으로 (Codex 171차 — 「1도 10으로」)
      if (kind === 'wadd') {
        const al = q.opts.find((o) => o.trap === 'align');
        const one = f.find((x) => toH(x.v) % 10 === 0);
        if (one) {
          const H = toH(one.v);
          assert.match(q.hints.align, new RegExp(`${one.v.replace('.', '\\.')}도 ${(H / 100).toFixed(2).replace('.', '\\.')}으로 써서 맞춰요\\.$`));
          if (al) assert.equal(al.t, `${t2(toH(f[0].v) + toH(f[1].v) - H + (H % 100 === 0 ? H / 100 : H / 10))} kg`);
        } else assert.equal(al, undefined, '둘 다 두 자리면 자리 실수 보기 없음');
      }
      if (kind === 'cmp') {
        assert.equal(f.length, 3);
        assert.equal(new Set(f.map((x) => toT(x.v))).size, 3, '길이 셋은 서로 다름');
        const pickMax = /가장 긴/.test(q.text);
        assert.ok(pickMax || /가장 짧은/.test(q.text));
        const want = f.reduce((m, x) => ((pickMax ? toT(x.v) > toT(m.v) : toT(x.v) < toT(m.v)) ? x : m));
        assert.equal(ans, want.ko);
        assert.deepEqual(q.opts.map((o) => o.t).sort(), f.map((x) => x.ko).sort(), '보기는 그 세 물고기');
      } else if (kind === 'sub') {
        const [a, b] = f;
        assert.ok(toT(a.v) > toT(b.v), '긴 쪽이 앞');
        assert.ok(toT(a.v) % 10 || toT(b.v) % 10, '하나는 소수');
        assert.ok(q.text.startsWith(a.ko) && q.text.includes(`${b.ko}보다 몇 cm 더 길까요?`));
        assert.equal(ans, `${t1(toT(a.v) - toT(b.v))} cm`);
      } else if (kind === 'add') {
        const [a, b] = f;
        assert.ok(toT(a.v) % 10 || toT(b.v) % 10);
        assert.equal(ans, `${t1(toT(a.v) + toT(b.v))} cm`);
      } else if (kind === 'wadd') {
        const [a, b] = f;
        assert.ok(toH(a.v) >= 100 && toH(b.v) >= 100, '둘 다 1 kg 넘게');
        assert.equal(ans, `${t2(toH(a.v) + toH(b.v))} kg`);
      } else if (kind === 'unit') {
        const [a] = f;
        assert.equal(a.u, 'kg');
        assert.ok(toH(a.v) >= 100 && toH(a.v) % 100, '1 kg 넘고 소수 부분이 있게');
        assert.equal(ans, `${toH(a.v) * 10} g`);
        assert.equal(q.tip, '💡 1 kg = 1000 g · 0.01 kg = 10 g');
      } else if (kind === 'bar') {
        const bars = q.chart.bars;
        assert.equal(bars.length, 3);
        assert.ok([1, 2].includes(q.chart.unit));
        assert.match(q.text, new RegExp(`세로 눈금 한 칸은 ${q.chart.unit}마리예요`));
        for (const b of bars) { assert.ok(b.v >= 1 && b.v <= 20); assert.equal(b.v % q.chart.unit, 0, '눈금 사이에 걸치지 않음'); }
        if (/가장 많이/.test(q.text)) {
          const top = bars.reduce((m, x) => (x.v > m.v ? x : m));
          assert.equal(bars.filter((x) => x.v === top.v).length, 1);
          assert.equal(ans, top.ko);
        } else {
          const m = /^세로 눈금 한 칸은 \d마리예요\. (.+?)[은는] (.+)보다 몇 마리 더 낚았을까요\?$/.exec(q.text);
          assert.ok(m, q.text);
          const hi = bars.find((x) => x.ko === m[1]);
          const lo = bars.find((x) => x.ko === m[2]);
          assert.ok(hi && lo && hi.v > lo.v);
          assert.equal(ans, `${hi.v - lo.v}마리`);
        }
      }
      // 정답 길이는 소수 한 자리까지 · 무게는 두 자리까지 (틀린 보기 「소수점 자리 실수」는 일부러 한 자리 더) · 음수 없음
      if (/ cm$/.test(ans)) assert.match(ans, /^\d+(\.\d)? cm$/);
      if (/ kg$/.test(ans)) assert.match(ans, /^\d+(\.\d{1,2})? kg$/);
      for (const o of q.opts) {
        assert.doesNotMatch(o.t, /-/, '음수 없음');
        if (/ cm$/.test(o.t)) assert.match(o.t, /^\d+(\.\d{1,2})? cm$/);
        if (/ kg$/.test(o.t)) assert.match(o.t, /^\d+(\.\d{1,2})? kg$/);
      }
    }
  }
  for (const k of FM_KIND_LIST) assert.ok(made[k] > 500, `${k} 꼴이 충분히 나옴 (${made[k]})`);
});

test('🎯 실수 보기 — 받아내림 잊음·더함·소수점 안 맞춤이 그 값 그대로 · 힌트가 그 실수를 짚음', () => {
  const pool = poolOf({ dex: { bungeo: { n: 1, best: 31.2 }, ttokbung: { n: 1, best: 28.7 }, chambung: { n: 2, best: 9 } } });
  let saw = 0;
  for (let s = 1; s < 400 && saw < 3; s++) {
    const q = makeFishQ('sub', pool, s);
    if (!q || q.facts[0] !== '붕어 31.2 cm' || q.facts[1] !== '떡붕어 28.7 cm') continue;
    saw++;
    const by = Object.fromEntries(q.opts.filter((o) => !o.ok).map((o) => [o.trap, o.t]));
    assert.equal(q.opts.find((o) => o.ok).t, '2.5 cm');
    assert.equal(by.borrow, '3.5 cm', '소수 첫째 자리 받아내림 잊음');
    if (by.add) assert.equal(by.add, '59.9 cm');
    assert.match(q.hints.borrow, /받아내림/);
  }
  assert.ok(saw >= 1);
  // 정수 kg + 소수 두 자리 (Codex 171차 재현 — 붕어 41.0 cm → 1 kg · 잉어 48.5 cm → 1.94 kg)
  const wp = poolOf({ dex: { bungeo: { n: 1, best: 41 }, ingeo: { n: 1, best: 48.5 } } });
  assert.deepEqual(wp.map((x) => x.H), [100, 194]);
  const w = makeFishQ('wadd', wp, 1);
  assert.equal(w.opts.find((o) => o.ok).t, '2.94 kg');
  assert.equal(w.opts.find((o) => o.trap === 'align').t, '1.95 kg', '1을 0.01로 맞춘 실수');
  assert.equal(w.hints.align, '🤔 소수점을 맞춰서 세로로 써 볼까요? 1도 1.00으로 써서 맞춰요.');
  const u = makeFishQ('unit', poolOf({ dex: { megi: { n: 1, best: 71.8 }, ingeo: { n: 1, best: 48.5 } } }), 3);
  const by = Object.fromEntries(u.opts.filter((o) => !o.ok).map((o) => [o.trap, o.t]));
  const H = Math.round(parseFloat(u.facts[0].split(' ')[1]) * 100);
  assert.equal(by.small, `${H} g`);
  assert.equal(by.big, `${H * 100} g`);
  assert.equal(by.mix, `${Math.floor(H / 100) * 1000 + (H % 100)} g`);
});

test('🃏 낚시터 카드 꼴 — fm 표시 · 머리 줄 · 보기마다 { text, ok, hint } · 정답엔 힌트 없음 · 바로 앞 꼴은 뒤로', () => {
  const raw = { dex: { bungeo: { n: 7, best: 31.2 }, pirami: { n: 4, best: 14.2 }, ingeo: { n: 2, best: 48.5 }, megi: { n: 3, best: 71.8 }, gamulchi: { n: 1, best: 52.5 } } };
  const kinds = new Set();
  for (let s = 1; s <= 300; s++) {
    const q = fishMathQ(raw, s);
    assert.ok(q);
    kinds.add(q.kind);
    assert.equal(q.fm, true);
    assert.equal(q.label, FM_LABEL);
    assert.ok(q.text.length > 5);
    assert.equal(q.choices.filter((c) => c.ok).length, 1);
    for (const c of q.choices) { assert.equal(typeof c.text, 'string'); assert.equal(c.ok ? c.hint : 'x', c.ok ? '' : 'x'); if (!c.ok) assert.ok(c.hint.length > 5); }
    const next = fishMathQ(raw, s, q.kind);
    assert.notEqual(next.kind, q.kind, '바로 앞과 다른 꼴부터(만들 수 있으면)');
  }
  assert.equal(kinds.size, FM_KIND_LIST.length, '여섯 꼴이 다 나옴');
  // 아이 화면 글 — 남은 수 없음 · 5학년 셈(소수의 곱셈·나눗셈) 없음
  const fm = src('js/fishmath.js');
  assert.doesNotMatch(fm.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*\*)/.test(l)).join('\n'), /남은|몇 배|÷|×/);
});

test('🔀 수학 차례에 섞기 — 배운 문제 → 물고기 → 배운 문제 … · 한쪽이 못 내면 다른 쪽 · 수학 아니면 그대로 · 바로 앞 꼴을 넘겨줌', () => {
  const calls = [];
  const base = (subj, seed) => { calls.push(['base', subj]); return subj === 'math' ? { q: `배움${seed}` } : { q: `${subj}${seed}` }; };
  let k = 0;
  const avoids = [];
  const fm = (seed, avoid) => { avoids.push(avoid); k += 1; return { q: `물고기${seed}`, fm: true, kind: k % 2 ? 'cmp' : 'sub' }; };
  const ask = mathMix(base, fm);
  const seq = [1, 2, 3, 4].map((s) => ask('math', s).q);
  assert.deepEqual(seq, ['배움1', '물고기2', '배움3', '물고기4'], '반쯤');
  assert.deepEqual(avoids, ['', 'cmp'], '바로 앞 물고기 꼴');
  assert.equal(ask('english', 9).q, 'english9', '수학이 아니면 그대로');
  const ask2 = mathMix(base, fm);
  assert.equal(ask2('math', 1).q, '배움1');
  assert.equal(ask2('korean', 2).q, 'korean2', '물고기 차례(홀수)여도 수학이 아니면 그 과목 그대로');
  assert.equal(ask2('math', 3).q, '물고기3', '수학 아닌 과목은 차례를 안 먹음');
  // 배운 수학이 없으면 물고기만 · 물고기를 못 내면 배운 문제만 · 둘 다 없으면 null
  const onlyFish = mathMix(() => null, (s) => ({ q: `물고기${s}`, kind: 'add' }));
  assert.deepEqual([1, 2, 3].map((s) => onlyFish('math', s).q), ['물고기1', '물고기2', '물고기3']);
  const onlyBase = mathMix((subj, s) => ({ q: `배움${s}` }), () => null);
  assert.deepEqual([1, 2, 3].map((s) => onlyBase('math', s).q), ['배움1', '배움2', '배움3']);
  assert.equal(mathMix(() => null, () => null)('math', 1), null);
});

test('★ 🔁 다시 열어도 배운 수학 차례가 이어짐 — 진짜 asker + mathMix + startOf · 하루 칸을 낚시터처럼 셈 (Codex 171차 재현 c → 물고기 → 다시 열면 d로 건너뜀)', () => {
  const keys = ['a', 'b', 'c', 'd', 'e', 'f'];
  const src4 = { keys, make: (k) => ({ q: k, choices: [{ text: '1', ok: true }, { text: '2', ok: false }] }) };
  const fm = () => ({ q: '🐟', fm: true, kind: 'cmp', choices: [] });
  const day = { fishMathQ: 0, fishFmQ: 0 };
  const count = (q) => { day.fishMathQ += 1; if (q.fm) day.fishFmQ += 1; return q.q; };
  // 한 번 연 동안: 배움 → 물고기 → 배움 → 물고기 → 배움(이어서 갔다면 나올 것)
  const one = mathMix(asker({ math: src4 }, '2026-10-30', startOf(day)), fm);
  const first = [1, 2, 3, 4].map((s) => count(one('math', s)));
  assert.deepEqual(first.map((x) => (x === '🐟' ? '🐟' : '배움')), ['배움', '🐟', '배움', '🐟']);
  const snap = { ...day };
  const cont = one('math', 5).q;
  // 같은 기록으로 닫았다 다시 열면 — 첫 문제는 배운 문제이고, 이어서 갔을 때와 같은 자리
  assert.deepEqual(startOf(snap), { math: 2, english: 0, korean: 0, nonsul: 0 }, '물고기 수학 수는 뺌');
  const again = mathMix(asker({ math: src4 }, '2026-10-30', startOf(snap)), fm);
  assert.equal(again('math', 5).q, cont);
  // 다른 과목은 그날 낸 수 그대로 · 이상한 기록은 0 아래로 안 감
  assert.deepEqual(startOf({ fishEnQ: 4, fishKorQ: 2, fishNsQ: 1, fishMathQ: 1, fishFmQ: 3 }), { math: 0, english: 4, korean: 2, nonsul: 1 });
  assert.deepEqual(startOf(null), { math: 0, english: 0, korean: 0, nonsul: 0 });
});
