// 🔢 수학 v364 (2026-10-29 아버님 「이대로」 — 기본안 YPhyv33x6uCnJd8H5n78x1): 🐾 포켓몬 수학 — 잡은 포켓몬의 도감 숫자(키·몸무게)와 가게 값으로 푸는 4학년 한 판
//  · 숫자 원고는 PokeAPI 그대로(몇 마리는 손으로 대조) · 정답은 문제 글·숫자 띠에서 숫자를 다시 읽어 **따로** 센다(생성기를 베끼지 않게)
//  · 4학년 범위(소수 한 자리 · (세 자리)×(두 자리) · (세 자리)÷(두 자리) · 1억 아래) · 보기는 서로 다르고 정답 하나 · 조사
//  · 장부: 그날 첫 판 💰10 · 처음 답이 다 맞으면 🎯(⚡와 같은 하루 몫) · 시계가 뒤로면 없음 · 개념 칸은 그대로 · 병합 · 📤·주간 표
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { POKE_N, POKE_KINDS, POKE_KIND_LIST, POKE_GOODS, POKE_FALLBACK, tenth, readKo, dataOf, poolOf, makeBoard, makePokeQ, colRows } from '../js/mathpoke.js';
import { POKE, pokeCommit, pokeReport, quickCatchOnly, quickRule, quickLeft, quickCommit, QUICK, REWARD, mathReportText, addPending, STEMS, STEM_ORDER, gradeOf } from '../js/mathprog.js';
import { mergeMath, emptyMath, updateMath, getMath, emptyProfile } from '../js/db.js';
import { initProfile, flushProfile, reloadProfile, commitChalRound } from '../js/xp.js';
import { ROSTER } from '../js/pokemon.js';
import { EVO } from '../js/evolve.js';
import { rng } from '../js/mathgen.js';

void fakeIdb;
const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const RAW = JSON.parse(read('coach/math/pokemath.json'));
const DATA = dataOf(RAW);
const NAMES = new Map(ROSTER.map((r) => [r.id, r.ko]));
const TODAY = '2026-10-29';

test('🐾 숫자 원고: 앱 명단 622마리가 다 있고 · PokeAPI 단위(키 dm · 몸무게 hg) 그대로 · 손으로 대조한 여덟 마리', () => {
  assert.equal(RAW.v, 1);
  assert.equal(DATA.size, ROSTER.length);
  for (const r of ROSTER) assert.ok(DATA.has(r.id), `${r.id} ${r.ko}`);
  // 기본안 때 PokeAPI에서 따로 받아 본 숫자 (scratchpad facts.txt)
  const hand = { 25: [4, 60], 26: [8, 300], 658: [15, 400], 656: [3, 70], 657: [6, 109], 6: [17, 905], 143: [21, 4600], 133: [3, 65], 235: [12, 580], 9: [16, 855] };
  for (const [id, [h, w]] of Object.entries(hand)) assert.deepEqual([DATA.get(Number(id)).h, DATA.get(Number(id)).w], [h, w], `${id}`);
  // 고쳐 읽기 — 깨진 줄은 뺀다
  assert.deepEqual([...dataOf({ mons: { 1: [7, 69], 2: [0, 5], 3: [1.5, 2], x: [1, 1], 4: 'a', 5: [3] } }).keys()], [1]);
  for (const bad of [null, undefined, 7, {}, { mons: 3 }]) assert.equal(dataOf(bad).size, 0);
});

test('🐾 글자 (순수): 십분의 일 → 소수 한 자리 · 1억 아래 수 읽기 · 판에 쓸 포켓몬(잡은 것 · 넷 아래면 흔한 포켓몬)', () => {
  assert.deepEqual([tenth(15), tenth(70), tenth(3), tenth(905), tenth(10), tenth(0)], ['1.5', '7', '0.3', '90.5', '1', '0']);
  const ko = { 460000: '사십육만', 58000: '오만 팔천', 10000: '만', 10900: '만 구백', 100000: '십만', 905000: '구십만 오천', 1234: '천이백삼십사', 11: '십일', 0: '영', 99999999: '구천구백구십구만 구천구백구십구' };
  for (const [n, s] of Object.entries(ko)) assert.equal(readKo(Number(n)), s, n);
  for (const bad of [-1, 100000000, NaN, 'x']) assert.equal(readKo(bad), '');
  const own = poolOf({ 25: 1, 658: 2, 143: 1, 6: 1, 9999: 1, 7: 0 }, DATA, NAMES);
  assert.deepEqual(own.map((x) => x.id), [6, 25, 143, 658], '잡은 것만 · 숫자 없는 것·0마리는 뺀다');
  const few = poolOf({ 658: 1 }, DATA, NAMES);
  assert.ok(few[0].id === 658 && few.length > 4 && few.slice(1).every((x) => POKE_FALLBACK.includes(x.id)), '넷 아래면 흔한 포켓몬으로 채움');
  assert.ok(poolOf(null, DATA, NAMES).length >= 4);
});

// ── 따로 세는 판정 (생성기 코드를 쓰지 않는다) ──
const num = (s) => Number(String(s).replace(/[^\d.]/g, ''));
const valOf = (tag) => num(tag); // 「키 1.5 m」 → 1.5
const KO = { 일: 1, 이: 2, 삼: 3, 사: 4, 오: 5, 육: 6, 칠: 7, 팔: 8, 구: 9 };
const UNIT = { 십: 10, 백: 100, 천: 1000 };
function fromKo(s) {
  let total = 0;
  let sec = 0;
  let cur = 0;
  for (const ch of String(s).replace(/\s/g, '')) {
    if (KO[ch]) cur = KO[ch];
    else if (UNIT[ch]) { sec += (cur || 1) * UNIT[ch]; cur = 0; }
    else if (ch === '만') { total += (sec + cur || 1) * 10000; sec = 0; cur = 0; } else return NaN;
  }
  return total + sec + cur;
}
const near = (a, b) => Math.abs(a - b) < 1e-9;
/** 정답을 문제에서 다시 센다 → 맞는 보기 글이 그 값인가 */
function expectOk(q) {
  const right = q.opts.find((o) => o.ok).t;
  const v = q.mons.map((m) => valOf(m.tag));
  if (q.kind === 'cmp') {
    const big = /큰|무거운/.test(q.text);
    const best = big ? Math.max(...v) : Math.min(...v);
    return right === q.mons[v.indexOf(best)].ko;
  }
  if (q.kind === 'sub') return near(num(right), Math.round((v[0] - v[1]) * 10) / 10) && v[0] > v[1];
  if (q.kind === 'add') return near(num(right), Math.round((v[0] + v[1]) * 10) / 10);
  if (q.kind === 'unit') {
    const x = num(q.text.match(/([\d.]+) (m|kg)/)[1]);
    return /cm일까요/.test(q.text) ? near(num(right), Math.round(x * 100)) : near(num(right), Math.round(x * 1000));
  }
  if (q.kind === 'big') return fromKo(right) === Number(q.text.match(/(\d+) g이에요/)[1]) && Number(q.text.match(/(\d+) g이에요/)[1]) === Math.round(v[0] * 1000);
  if (q.kind === 'mul') { const [, P, k] = q.text.match(/💰(\d+)\D+?(\d+)개/); return num(right) === Number(P) * Number(k); }
  if (q.kind === 'div') { const [, P, N] = q.text.match(/💰(\d+)\D+?💰(\d+)/); return num(right) === Number(N) / Number(P); }
  if (q.kind === 'bar') {
    const bars = q.chart.bars.map((b) => ({ ko: b.ko, m: b.v / 10 }));
    let d;
    const evo = q.text.match(/\. (.+?)(?:이|가) (.+?)(?:으로|로) 진화할 때/);
    if (evo) {
      const x = bars.find((b) => b.ko === evo[1]);
      const y = bars.find((b) => b.ko === evo[2]);
      d = y.m - x.m;
    } else d = Math.max(...bars.map((b) => b.m)) - Math.min(...bars.map((b) => b.m));
    return near(num(right), Math.round(d * 10) / 10);
  }
  return false;
}
/** 받침 있나 (따로) */
const hasB = (w) => { const c = w.charCodeAt(w.length - 1); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0; };
const isL = (w) => { const c = w.charCodeAt(w.length - 1); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 === 8; };
function josaBad(text, names) {
  const bad = [];
  for (const n of names) {
    for (const m of text.matchAll(new RegExp(`${n}(으로|은|는|이|가|와|과|로)(?=[ .,?])`, 'g'))) {
      const j = m[1];
      const want = { 은: true, 는: false, 이: true, 가: false, 과: true, 와: false }[j];
      if (want !== undefined && want !== hasB(n)) bad.push(`${n}${j}`);
      if (j === '으로' && (!hasB(n) || isL(n))) bad.push(`${n}${j}`);
      if (j === '로' && hasB(n) && !isL(n)) bad.push(`${n}${j}`);
    }
  }
  return bad;
}

test('🐾 판 쓸기 (씨앗 3000 · 잡은 포켓몬 4~60마리 무작위 · 파트너): 판마다 3~5문제·꼴이 겹치지 않음 · 정답은 하나이고 따로 센 값 · 보기 서로 다름 · 4학년 범위 · 틀린 보기마다 힌트 · 조사 · 빈 글 없음', () => {
  const r = rng(364);
  const ids = ROSTER.map((x) => x.id);
  const seen = {};
  let qn = 0;
  let evoN = 0;
  for (let s = 1; s <= 3000; s++) {
    const n = 4 + Math.floor(r() * 57);
    const caught = {};
    while (Object.keys(caught).length < n) caught[ids[Math.floor(r() * ids.length)]] = 1;
    const pool = poolOf(caught, DATA, NAMES);
    const partner = r() < 0.5 ? Number(Object.keys(caught)[0]) : 0;
    const board = makeBoard(pool, s, { evo: EVO, partner });
    assert.ok(board.length >= 3 && board.length <= POKE_N, `씨앗 ${s} 문제 ${board.length}`);
    assert.equal(new Set(board.map((q) => q.kind)).size, board.length, `씨앗 ${s} 꼴 겹침`);
    for (const q of board) {
      qn++;
      seen[q.kind] = (seen[q.kind] || 0) + 1;
      const where = `씨앗 ${s} [${q.kind}] ${q.text}`;
      assert.ok(POKE_KINDS[q.kind], where);
      assert.equal(q.opts.filter((o) => o.ok).length, 1, `${where} 정답 하나`);
      assert.equal(q.opts.length, q.kind === 'cmp' ? 3 : 4, `${where} 보기 수`);
      assert.equal(new Set(q.opts.map((o) => o.t)).size, q.opts.length, `${where} 보기 겹침 ${q.opts.map((o) => o.t)}`);
      if (q.kind !== 'cmp' && q.kind !== 'big') assert.equal(new Set(q.opts.map((o) => num(o.t))).size, q.opts.length, `${where} 값이 같은 보기 ${q.opts.map((o) => o.t)}`);
      if (q.kind === 'big') assert.equal(new Set(q.opts.map((o) => fromKo(o.t))).size, q.opts.length, `${where} 값이 같은 읽기`);
      assert.ok(expectOk(q), `${where} 정답 ${q.opts.find((o) => o.ok).t}`);
      for (const o of q.opts.filter((x) => !x.ok)) assert.ok(o.trap && q.hints[o.trap], `${where} 힌트 없음 ${o.t}`);
      const all = [q.text, q.solve, q.tip || '', ...Object.values(q.hints), ...q.opts.map((o) => o.t), ...q.mons.map((m) => m.tag)].join(' | ');
      // 💡 단위 사이는 단위 바꾸기에만 (Codex 168차 — 소수 kg → g는 처음부터 0.1 kg = 100 g)
      assert.equal(q.tip, q.kind === 'unit' ? (/cm일까요/.test(q.text) ? '💡 1 m = 100 cm' : '💡 1 kg = 1000 g · 0.1 kg = 100 g') : undefined, `${where} 💡`);
      // 세로 셈 두 줄 — 띠의 두 수 그대로 · 소수 자리 수가 같다(수 칸 오른쪽 맞춤이면 소수점이 한 줄, Codex 168차 #1)
      if (q.col) {
        const rows = colRows(q.col);
        assert.deepEqual(rows.map((x) => x.n.split('.')[1].length), [1, 1], `${where} 세로 셈 ${rows.map((x) => x.n)}`);
        assert.deepEqual(rows.map((x) => Number(x.n)), q.mons.map((mo) => valOf(mo.tag)), `${where} 세로 셈 수`);
        assert.deepEqual(rows.map((x) => x.op), ['', q.col.op]);
      }
      assert.ok(!/undefined|NaN|null|\[object/.test(all), `${where} 빈 글 ${all}`);
      // 4학년 범위
      for (const m of q.mons) if (/^(키|몸무게)/.test(m.tag)) assert.match(m.tag, /^(키|몸무게) \d+(\.\d)? (m|kg)$/, where);
      if (['sub', 'add', 'bar'].includes(q.kind)) assert.match(q.opts.find((o) => o.ok).t, /^\d+(\.\d)? (m|kg)$/, `${where} 정답은 소수 한 자리까지`);
      if (q.kind === 'mul') { const [, P, k] = q.text.match(/💰(\d+)\D+?(\d+)개/); assert.ok(P.length === 3 && k.length === 2 && Number(k) % 10 !== 0, `${where} (세 자리)×(두 자리)`); }
      if (q.kind === 'div') { const [, P, N] = q.text.match(/💰(\d+)\D+?💰(\d+)/); const k = Number(N) / Number(P); assert.ok(P.length === 2 && N.length === 3 && Number.isInteger(k) && k >= 10 && k <= 99, `${where} (세 자리)÷(두 자리)`); }
      if (q.kind === 'big') { const g = Number(q.text.match(/(\d+) g이에요/)[1]); assert.ok(g >= 10000 && g < 100000000, `${where} 큰 수는 만 이상 1억 아래`); }
      if (q.kind === 'sub' || q.kind === 'add') assert.ok(q.mons.some((mo) => /\.\d/.test(mo.tag)), `${where} 둘 다 자연수면 소수 셈이 아니다`);
      const carry = q.opts.find((o) => o.trap === 'carry');
      if (carry) { const [x, y] = q.mons.map((mo) => Math.round(valOf(mo.tag) * 10) % 10); assert.ok(x + y >= 10, `${where} 받아올림이 없는데 받아올림 실수 보기`); }
      if (q.kind === 'unit' && /cm일까요/.test(q.text)) assert.ok(num(q.text.match(/([\d.]+) m는/)[1]) >= 1, `${where} 1 m 이상`);
      if (q.kind === 'bar') { assert.ok(q.chart.bars.length === 3 && q.chart.bars.every((b) => b.v > 0 && b.v <= 20), where); if (/진화할 때/.test(q.text)) evoN++; }
      assert.deepEqual(josaBad(`${q.text} ${Object.values(q.hints).join(' ')} ${q.solve}`, [...q.mons.map((m) => m.ko), ...(q.chart ? q.chart.bars.map((b) => b.ko) : [])]), [], where);
    }
  }
  for (const k of POKE_KIND_LIST) assert.ok(seen[k] > 200, `꼴 ${k} ${seen[k] || 0}번 나옴`);
  assert.ok(evoN > 5, `진화 막대 ${evoN}번 (무작위로 고른 잡은 포켓몬엔 진화 셋이 다 있는 일이 드물다 — 진화 물음은 아래 막대그래프 시험이 따로)`);
  assert.ok(qn > 13000, `문제 ${qn}`);
});

test('🐾 수 뒤 조사 (읽는 소리로): 💰25예요 · 💰600이에요 · 💰750으로 · 13은 · 12는 · 3이에요', () => {
  const pool = poolOf({ 25: 1, 133: 1, 4: 1, 5: 1, 6: 1, 658: 1 }, DATA, NAMES);
  const mk = (kind, items, seed) => makePokeQ(kind, pool, seed, { items });
  const d = mk('div', [{ ko: '큰 물약', emoji: '⚗️', price: 25 }], 7);
  assert.match(d.text, /⚗️ 큰 물약은 하나에 💰25예요\. 💰(\d+)(으로|로) /);
  const N = Number(d.text.match(/💰(\d+)(으로|로) /)[1]);
  assert.equal(d.text.includes(`💰${N}으로`), hasB(readKo(N)) && !isL(readKo(N)), `💰${N} 「${readKo(N)}」`);
  const m = mk('mul', [{ ko: '하이퍼볼', emoji: '🟡', price: 600 }], 3);
  assert.match(m.text, /🟡 하이퍼볼은 하나에 💰600이에요\./);
  for (let s = 1; s < 200; s++) {
    const q = mk('mul', [{ ko: '왕관', emoji: '👑', price: 150 }], s);
    const k = Number(q.text.match(/(\d+)개/)[1]);
    const ones = k % 10;
    assert.ok(q.hints.place.startsWith(`🤔 ${k}${hasB(readKo(k)) ? '은' : '는'} `), q.hints.place);
    assert.ok(q.hints.place.includes(`${ones}${hasB(readKo(ones)) ? '이에요' : '예요'} —`) && q.hints.place.includes(`× ${ones}${hasB(readKo(ones)) ? '을' : '를'} 더해요`), q.hints.place);
  }
  assert.ok(POKE_GOODS.every((g) => g.price > 0 && g.ko) && !POKE_GOODS.some((g) => /파랑|분|알|스톤/.test(g.ko)), '💰로 사는 볼·물약·꾸미기만');
  // 가게 목록이 바뀌어도 4학년 범위 — 곱셈은 세 자리 값만 · 나눗셈은 두 자리 값만
  const odd = [{ ko: '마스터볼', emoji: '🟣', price: 1200 }, { ko: '사탕', emoji: '🍬', price: 5 }, { ko: '왕관', emoji: '👑', price: 100 }, { ko: '리본', emoji: '🎀', price: 30 }];
  for (let s = 1; s < 300; s++) {
    assert.match(mk('mul', odd, s).text, /왕관은 하나에 💰100/);
    assert.match(mk('div', odd, s).text, /리본은 하나에 💰30/);
  }
});

test('🐾 판이 짧으면: 문제를 셋도 못 만들면 판을 열지 않는다(빈 판) · 가게 물건이 없으면 곱셈·나눗셈은 빠진다', () => {
  const one = [{ id: 6, ko: '리자몽', h: 17, w: 905 }];
  for (let s = 1; s < 50; s++) assert.deepEqual(makeBoard(one, s, { items: [] }), [], '한 마리로는 단위·큰 수 둘뿐');
  const pool = poolOf({ 25: 1, 133: 1, 4: 1, 5: 1, 6: 1 }, DATA, NAMES);
  for (let s = 1; s < 50; s++) assert.ok(makeBoard(pool, s, { items: [] }).every((q) => q.kind !== 'mul' && q.kind !== 'div'));
});

test('🐾 실수 보기 (헷갈리기 쉬운 셈): 개굴닌자−개구마르 1.2 m에 1.8(더함)·12(소수점)·0.12 · 피카츄+이브이 12.5 kg에 7.1(끝자리 맞춤) · 리자몽 1.7 m = 170 cm에 107 cm', () => {
  const two = (a, b) => [a, b].map((id) => ({ id, ko: NAMES.get(id), h: DATA.get(id).h, w: DATA.get(id).w }));
  const find = (kind, pool, want) => { for (let s = 1; s < 3000; s++) { const q = makePokeQ(kind, pool, s); if (q && want(q)) return q; } return null; };
  const sub = find('sub', two(658, 656), (q) => /키가/.test(q.text));
  assert.deepEqual(sub.opts.map((o) => o.t).sort(), ['0.12 m', '1.2 m', '1.8 m', '12 m'].sort());
  assert.deepEqual(Object.fromEntries(sub.opts.filter((o) => !o.ok).map((o) => [o.t, o.trap])), { '1.8 m': 'add', '12 m': 'dot', '0.12 m': 'shift' });
  const add = find('add', two(25, 133), () => true);
  assert.equal(add.opts.find((o) => o.ok).t, '12.5 kg');
  assert.equal(add.opts.find((o) => o.trap === 'align').t, '7.1 kg', '6을 0.6으로 — 끝자리를 맞춰 더함');
  assert.match(add.hints.align, /6은 6\.0과 같아요/);
  const unit = find('unit', two(6, 4), (q) => /리자몽의 키/.test(q.text));
  assert.deepEqual([unit.opts.find((o) => o.ok).t, unit.opts.find((o) => o.trap === 'mix').t], ['170 cm', '107 cm']);
  const div = makePokeQ('div', two(25, 133), 11, { items: [{ ko: '슈퍼볼', emoji: '🔵', price: 25 }] });
  const k = div.opts.find((o) => o.ok).t;
  assert.equal(div.opts.find((o) => o.trap === 'tens').t, `${Math.floor(num(k) / 10)}개`);
});

test('🐾 받아올림 경계·세로 셈 (Codex 168차 #1·#2): 저리더프 80.5 kg + 파이리 8.5 kg = 89 kg · 받아올림 실수 88 kg에 「10이 되거나 넘으면」(5 + 5 = 10) · 세로 셈은 80.5 / 8.5 — 기호 칸 따로 · 수 칸 오른쪽 맞춤', () => {
  const pool = [604, 4].map((id) => ({ id, ko: NAMES.get(id), h: DATA.get(id).h, w: DATA.get(id).w }));
  assert.deepEqual(pool.map((x) => x.w), [805, 85]);
  let q = null;
  for (let s = 1; s < 3000 && !q; s++) { const t = makePokeQ('add', pool, s); if (t && t.opts.some((o) => o.trap === 'carry')) q = t; }
  assert.ok(q, '받아올림 실수 보기가 나오는 판');
  assert.equal(q.opts.find((o) => o.ok).t, '89 kg');
  assert.equal(q.opts.find((o) => o.trap === 'carry').t, '88 kg');
  assert.match(q.hints.carry, /10이 되거나 넘으면/);
  const rows = colRows(q.col);
  assert.deepEqual(rows.map((x) => x.n).sort(), ['8.5', '80.5']);
  const tail = (x) => x.n.length - x.n.indexOf('.');
  assert.equal(tail(rows[0]), tail(rows[1]), '소수점 뒤 길이가 같다');
  assert.deepEqual(colRows({ a: '6', b: '0.5', op: '+' }).map((x) => x.n), ['6.0', '0.5'], '자연수엔 .0');
  const v = read('js/mathpokeview.js');
  assert.ok(v.includes("for (const r of colRows(col)) row(r.op, r.n, '');") && v.includes("box.appendChild(el('span', `mpk-col-op${cls}`, op));"), '기호 칸·수 칸 따로');
  const css = read('css/style.css');
  assert.ok(/\.mpk-col \{[^}]*display: grid; grid-template-columns: auto auto;/.test(css) && css.includes('.mpk-col-num { text-align: right; }'), '수 칸 오른쪽 맞춤');
});

test('🐾 막대그래프: 진화 셋(파이리·리자드·리자몽)이 다 있으면 대개 진화 물음 · 그 셋의 차이 · 없으면 가장 큰−가장 작은', () => {
  const pool = [4, 5, 6, 25, 133, 39].map((id) => ({ id, ko: NAMES.get(id), h: DATA.get(id).h, w: DATA.get(id).w }));
  let evo = 0;
  for (let s = 1; s <= 400; s++) {
    const q = makePokeQ('bar', pool, s, { evo: EVO });
    assert.ok(q && expectOk(q));
    if (/진화할 때/.test(q.text)) { evo++; assert.deepEqual(q.chart.bars.map((b) => b.ko), ['파이리', '리자드', '리자몽']); }
  }
  assert.ok(evo > 200 && evo < 360, `진화 물음 ${evo}/400 (70% 안팎)`);
  const none = makePokeQ('bar', pool.filter((x) => x.id !== 5), 3, { evo: EVO });
  assert.ok(none && /가장 큰 포켓몬은 가장 작은/.test(none.text), '진화 셋이 다 없으면');
});

const st = () => ({ ...emptyMath(), concepts: { A1: { done: true, box: 2, lastAt: 5 } } });
const recs = (oks) => oks.map((ok, i) => ({ k: POKE_KIND_LIST[i], ok: ok ? 1 : 0, ...(ok ? {} : { tag: 'add' }) }));

test('🐾 판 끝 (pokeCommit, 순수): 일지 한 줄 · 그날 첫 판만 💰10 · 처음 답이 다 맞으면 🎯(⚡와 같은 하루 몫 · ⚡ 판 수는 그대로) · 문항 정답 💰·XP · 개념 칸 그대로', () => {
  const m = st();
  const a = pokeCommit(m, recs([1, 1, 1, 1, 1]), TODAY);
  assert.deepEqual(a.result, { ok: 5, total: 5, perfect: true, first: true, catch: 1 });
  assert.deepEqual(a.reward, { xp: 5 * REWARD.q.xp, coin: 5 * REWARD.q.coin + POKE.coin, items: {} });
  assert.deepEqual(m.poke, { d: TODAY, n: 1 });
  assert.deepEqual(m.quick, { d: TODAY, n: 0, c: 1 }, '🎯 몫만 · ⚡ 판 수 0');
  assert.equal(addPending(m, 0), 1, '🎯 예약');
  const e = m.log.at(-1);
  assert.deepEqual([e.id, e.mode, e.ok, e.n, e.d], ['poke', 'poke', 5, 5, TODAY]);
  assert.deepEqual(e.qs[0], { k: 'cmp', ok: 1 });
  assert.deepEqual(m.concepts, { A1: { done: true, box: 2, lastAt: 5 } }, '개념 칸 그대로');
  // 둘째 판 — 💰10 없음 · 틀린 문제가 있으면 🎯 없음 · 틀린 실수는 일지에
  const b = pokeCommit(m, recs([1, 0, 1, 1, 1]), TODAY);
  assert.deepEqual([b.result.first, b.result.perfect, b.result.catch, b.reward.coin], [false, false, 0, 4 * REWARD.q.coin]);
  assert.deepEqual(m.log.at(-1).qs[1], { k: 'sub', ok: 0, tag: 'add' });
  // ⚡ 첫 판은 🐾와 상관없이 첫 판 (판 수가 따로)
  assert.deepEqual(quickRule(m, TODAY, false), { first: true, catch: 0, coin: QUICK.coin });
  // 🎯 하루 몫은 ⚡와 합쳐 QUICK.catchMax까지
  quickRule(m, TODAY, true);
  quickRule(m, TODAY, true);
  assert.equal(quickLeft(m, TODAY), 0);
  assert.equal(pokeCommit(m, recs([1, 1, 1, 1, 1]), TODAY).result.catch, 0, '⚡와 합쳐 셋을 다 받았으면 🐾도 없음');
  assert.equal(quickCatchOnly(m, TODAY, true), 0);
});

test('🐾 판 끝 가장자리: 시계가 뒤로(장부가 오늘보다 뒤)면 💰10·🎯 없음 · 문제가 셋 아래면 🎯 없음 · 모르는 꼴 줄은 뺌 · 빈 판은 일지에 안 적음 · 다음 날은 다시 첫 판', () => {
  const m = st();
  m.poke = { d: '2026-10-30', n: 2 };
  const a = pokeCommit(m, recs([1, 1, 1, 1, 1]), TODAY);
  assert.deepEqual([a.result.first, a.result.catch, a.reward.coin], [false, 0, 5 * REWARD.q.coin]);
  assert.deepEqual(m.poke, { d: '2026-10-30', n: 2 }, '장부를 되돌리지 않는다');
  const m2 = st();
  m2.quick = { d: '2026-10-30', n: 1, c: 0 };
  assert.equal(pokeCommit(m2, recs([1, 1, 1, 1, 1]), TODAY).result.catch, 0, '⚡ 장부가 앞날이어도 🎯 없음');
  const m3 = st();
  assert.equal(pokeCommit(m3, recs([1, 1]), TODAY).result.catch, 0, `${POKE.min}문제 아래`);
  assert.equal(pokeCommit(m3, recs([1, 1, 1]), TODAY).result.catch, 1, '셋이면 됨');
  const m4 = st();
  const c = pokeCommit(m4, [{ k: 'nope', ok: 1 }, { k: 'cmp', ok: 1 }, null, { k: 'sub', ok: 1 }, { k: 'add', ok: 1 }], TODAY);
  assert.deepEqual([c.result.total, c.result.ok], [3, 3]);
  const m5 = st();
  pokeCommit(m5, [], TODAY);
  assert.equal((m5.log || []).length, 0);
  const m6 = st();
  pokeCommit(m6, recs([1, 1, 1]), TODAY);
  assert.equal(pokeCommit(m6, recs([1, 1, 1]), '2026-10-30').result.first, true, '다음 날 첫 판');
});

/** 가짜 IndexedDB 장부 — 💰 0 · 4학년 아는 칸 셋(⚡용) · 일지·🎯 비움 · ⚡·🐾 장부는 주는 대로 */
const G4 = STEM_ORDER.flatMap((k) => (STEMS[k] ? STEMS[k].list : [])).map((c) => c.id).filter((id) => gradeOf(id) === 4).slice(0, 3);
let profReady = false;
async function seedLedger({ quick, poke } = {}) {
  if (!profReady) { await initProfile(); profReady = true; }
  await flushProfile();
  const cur = fakeIdb.get('profile', 'me') || emptyProfile();
  fakeIdb.put('profile', { ...cur, coins: 0, coinsEarned: 0, id: 'me', updatedAt: (cur.updatedAt || 0) + 1 });
  await reloadProfile();
  await updateMath((s) => {
    s.concepts = Object.fromEntries(G4.map((id, i) => [id, { done: true, box: 1, lastAt: i + 1, kinds: {} }]));
    s.log = [];
    s.throws = { earned: 0, used: 0, refunded: 0 };
    if (quick) s.quick = { d: TODAY, ...quick }; else delete s.quick;
    if (poke) s.poke = { d: TODAY, ...poke }; else delete s.poke;
  });
}
const commitPoke = () => commitChalRound((s) => pokeCommit(s, recs([1, 1, 1, 1, 1]), TODAY));
const commitQuick = () => commitChalRound((s) => quickCommit(s, G4.map((id, i) => ({ id, key: `k${i}`, k: 'calc', ok: 1 })), TODAY, { correct: 3 }));
const coinsNow = () => fakeIdb.get('profile', 'me').coins;
const earnedOf = (m) => (m.throws && m.throws.earned) || 0;

test('★ 🐾 저장 흐름 (가짜 IndexedDB · Codex 168차): 프로필 쓰기가 깨지면 일지·💰·🎯 다 없던 일 → 💾 다시 저장하면 한 번씩 · 두 창이 같이 끝내도 💰10·🎯 한 창만 · 🐾·⚡가 같이 끝나면 남은 🎯 하나는 한쪽만 · 판 수는 따로', async () => {
  assert.equal(G4.length, 3);
  const P5 = 5 * REWARD.q.coin;
  await seedLedger();
  fakeIdb.failNext('profile');
  const bad = await commitPoke();
  assert.equal(bad.ok, false);
  const m0 = await getMath();
  assert.deepEqual([m0.poke, m0.log.length, earnedOf(m0), coinsNow()], [undefined, 0, 0, 0], '깨진 저장은 아무것도 안 남김');
  const ok = await commitPoke();
  assert.ok(ok.ok);
  assert.deepEqual([ok.result.first, ok.result.catch, ok.reward.coin], [true, 1, P5 + POKE.coin]);
  const m1 = await getMath();
  assert.deepEqual([m1.poke, m1.quick, m1.log.length, earnedOf(m1), coinsNow()], [{ d: TODAY, n: 1 }, { d: TODAY, n: 0, c: 1 }, 1, 1, P5 + POKE.coin], '💾 다시 저장하면 한 번씩');
  // 두 창 — 오늘 🎯가 하나 남았다
  await seedLedger({ quick: { n: 0, c: QUICK.catchMax - 1 } });
  const [a, b] = await Promise.all([commitPoke(), commitPoke()]);
  assert.ok(a.ok && b.ok);
  assert.deepEqual([a.result.catch, b.result.catch].sort(), [0, 1], '🎯 한 창만');
  assert.deepEqual([a.reward.coin, b.reward.coin].sort((x, y) => x - y), [P5, P5 + POKE.coin], '💰10 한 창만');
  const m2 = await getMath();
  assert.deepEqual([m2.poke, m2.quick, m2.log.length, earnedOf(m2), coinsNow()], [{ d: TODAY, n: 2 }, { d: TODAY, n: 0, c: QUICK.catchMax }, 2, 1, 2 * P5 + POKE.coin]);
  // 🐾와 ⚡가 같이 — 🎯 몫은 하나를 나눠 쓰고 💰10은 저마다 그날 첫 판
  await seedLedger({ quick: { n: 0, c: QUICK.catchMax - 1 } });
  const [p, k] = await Promise.all([commitPoke(), commitQuick()]);
  assert.ok(p.ok && k.ok);
  assert.equal(p.result.catch + k.result.quick.catch, 1, '남은 🎯 하나는 한쪽만');
  assert.deepEqual([p.reward.coin, k.reward.coin], [P5 + POKE.coin, 3 * REWARD.q.coin + QUICK.coin], '💰10은 저마다 첫 판');
  const m3 = await getMath();
  assert.deepEqual([m3.poke, m3.quick, earnedOf(m3), m3.log.map((e) => e.mode).sort()], [{ d: TODAY, n: 1 }, { d: TODAY, n: 1, c: QUICK.catchMax }, 1, ['poke', 'quick']]);
  assert.equal(coinsNow(), P5 + POKE.coin + 3 * REWARD.q.coin + QUICK.coin);
});

test('🐾 병합 (db.mergeMath): 🐾 판 수는 늦은 날짜 쪽 · 같은 날이면 큰 쪽 · 차례 상관없이 · 🎯 몫(quick.c)도 큰 쪽', () => {
  const a = { ...emptyMath(), poke: { d: TODAY, n: 1 }, quick: { d: TODAY, n: 0, c: 1 } };
  const b = { ...emptyMath(), poke: { d: TODAY, n: 3 }, quick: { d: TODAY, n: 1, c: 0 } };
  const c = { ...emptyMath(), poke: { d: '2026-10-28', n: 9 } };
  for (const [x, y] of [[a, b], [b, a]]) {
    const o = mergeMath(x, y);
    assert.deepEqual([o.poke, o.quick], [{ d: TODAY, n: 3 }, { d: TODAY, n: 1, c: 1 }]);
  }
  assert.deepEqual(mergeMath(c, a).poke, { d: TODAY, n: 1 });
  assert.deepEqual(mergeMath(a, c).poke, { d: TODAY, n: 1 });
  assert.equal(mergeMath(emptyMath(), { poke: { d: 7 } }).poke, undefined, '깨진 장부는 안 받음');
});

test('🐾 📤 요약 (아버님만): 최근 7일 판·다 맞힘·꼴마다 처음 답·자주 고른 실수 · 수학 요약 글에 줄과 일지 「🐾포켓몬수학」', () => {
  const m = st();
  assert.equal(pokeReport(m, TODAY), '🐾 포켓몬 수학 (최근 7일): 아직 없음');
  pokeCommit(m, recs([1, 0, 1, 1, 1]), TODAY);
  pokeCommit(m, recs([1, 0, 0, 1, 1]), '2026-10-28');
  pokeCommit(m, recs([1, 1, 1, 1, 1]), '2026-10-20'); // 8일 전 — 안 셈
  const line = pokeReport(m, TODAY);
  assert.match(line, /^🐾 포켓몬 수학 \(최근 7일\): 2판 · 다 맞힘 0 · 처음 답 📏소수 크기 비교 2\/2 · ➖소수의 뺄셈 0\/2 · ➕소수의 덧셈 1\/2/);
  assert.match(line, /자주 고른 실수 sub:add 2 · add:add 1$/);
  const t = mathReportText(m, TODAY);
  assert.ok(t.includes(line), '수학 요약에');
  assert.match(t, /2026-10-29 🐾포켓몬수학 poke 4\/5 📏○ ➖✘\(add\) ➕○/);
});

test('🐾 화면 배선 (v364): ⚡ 아래·줄기 고르기에 단추 · 🎒에서 돌아오면 이어서 · 사다리·홈으로 나가면 판을 버림 · 판 끝은 commitChalRound(pokeCommit) 뒤 하루 기록 · 처음 답만 · 두 번 틀리면 풀이 · ☀️ 잇기 · sw·css·판', () => {
  const math = read('js/math.js');
  const body = (src, head) => { const i = src.indexOf(head); assert.ok(i >= 0, head); return src.slice(i, src.indexOf('\n}\n', i)); };
  assert.ok(math.includes("import { pokeButton, pokeActive, resumePoke, endPoke } from './mathpokeview.js';"));
  const lad = body(math, 'function renderLadder(state) {');
  const qb = lad.indexOf('if (qb) head.appendChild(qb);');
  assert.ok(qb > 0 && lad.indexOf('head.appendChild(pokeButton(puzzleCtx()));') > qb && lad.indexOf('head.appendChild(pokeButton(puzzleCtx()));') < lad.indexOf('head.appendChild(puzzleButton(puzzleCtx()));'), '⚡ 아래 · 🧩 위');
  assert.ok(lad.includes('endPoke();'), '사다리로 나오면 판을 버림');
  assert.ok(math.includes('card.appendChild(pokeButton(puzzleCtx())); // 🐾'), '줄기 고르기에도');
  assert.ok(body(math, 'export async function renderMath() {').includes('if (pokeActive()) { ui.run++; resumePoke(puzzleCtx()); return; }'), '🎒에서 돌아오면 그 판');
  assert.ok(math.includes('ui.round = null; endPoke(); ui.daily = null;'), '← 홈도 판을 버림');
  const v = read('js/mathpokeview.js');
  const fin = body(v, 'async function finish(ctx) {');
  assert.ok(fin.includes('saved = await commitChalRound((s) => pokeCommit(s, recs, today));'), '한 트랜잭션');
  const gone = fin.indexOf('if (S.ps !== ps) return;');
  const day = fin.indexOf('applyDailyDelta(today, { mathQ: recs.length, mathOk: ok, mathRounds: 1 })');
  assert.ok(fin.includes('const good = !!(saved && saved.ok);') && day > fin.indexOf('if (good) {') && fin.indexOf('if (good) {') > 0, '저장된 뒤에만 하루 기록');
  assert.ok(day < gone && fin.indexOf('ctx.setState(saved.math);') < gone, '화면을 떠났어도 하루 기록·수학 기록 (Codex 168차 #3)');
  assert.equal(fin.split('applyDailyDelta(').length - 1, 1, '하루 기록은 한 번');
  assert.ok(fin.includes("ok: ps.first[i] ? 1 : 0, ...(ps.trap[i] ? { tag: ps.trap[i] } : {})"), '처음 답·처음 실수');
  const pk = body(v, 'function pick(ctx, o) {');
  assert.ok(pk.includes('if (firstTry) ps.first[ps.i] = true;') && pk.includes("if (firstTry) { ps.first[ps.i] = false; ps.trap[ps.i] = o.trap || ''; }"), '처음 고른 답만 센다');
  assert.ok(pk.includes('if (wrong.length >= 2) ps.solved = true;'), '두 번 틀리면 풀이');
  assert.ok(pk.includes('if (wrong.includes(o.t)) return;') && pk.includes('if (!ps || ps.solved || ps.i >= ps.qs.length) return;'), '꺼진 보기·푼 뒤는 무시');
  const rd = body(v, 'function render(ctx) {');
  assert.ok(rd.includes("h.appendChild(el('p', '', q.hints[last.trap] || '🤔 다시 한 번 생각해 볼까요?'));"), '방금 고른 실수의 힌트');
  assert.ok(rd.includes("if (q.col && ['align', 'dot', 'shift', 'near', 'carry'].includes(last.trap)) h.appendChild(colEl(q.col));"), '세로 셈');
  assert.ok(rd.includes("card.appendChild(el('div', 'math-eyebrow', `🐾 포켓몬 수학 · ${k.icon} ${k.ko}`));") && !/\$\{ps\.i \+ 1\}|\$\{ps\.qs\.length\}/.test(rd), '몇째 문제인지 안 보임 (Codex 168차 #4)');
  assert.ok(rd.includes("if (q.tip) card.appendChild(el('p', 'mpk-tip', q.tip));"), '💡 단위 사이');
  assert.ok(rd.includes("if (q.kind !== 'mul' && q.kind !== 'div') card.appendChild(el('p', 'mpk-src', '📖 키·몸무게는 기본 모습의 도감 숫자예요'));"), '기본 모습 (메가·폼 숫자와 헷갈리지 않게)');
  assert.ok(rd.indexOf("focusOn(card.querySelector('.mpk-done button'));") > 0 && rd.indexOf("focusOn(card.querySelector('.mpk-done button'));") < rd.indexOf('const q = ps.qs[ps.i];'), '끝 화면·다시 저장하기 초점');
  const mi = body(v, 'function monImg(id, ko) {');
  assert.ok(mi.includes("img.addEventListener('error', paw, { once: true });") && mi.includes('.catch(paw)') && mi.includes("el('span', 'mpk-img mpk-img-paw', '🐾')"), '그림을 못 받으면 🐾');
  assert.ok(!/남은|\d+번 남|점수/.test(v.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')), '아이 화면에 셈 문구 없음');
  assert.ok(body(v, 'function finishEl(ctx) {').includes("ctx.sunEl('poke', () => { S.ps = null; })"), '☀️ 잇기 — 누른 곳 poke');
  const sw = read('sw.js');
  for (const f of ['./js/mathpoke.js', './js/mathpokeview.js', './coach/math/pokemath.json']) assert.ok(sw.includes(`'${f}'`), f);
  const ver = Number(sw.match(/CACHE_VERSION = 'v(\d+)'/)[1]);
  assert.ok(ver >= 364);
  assert.equal(read('js/version.js').match(/APP_VERSION = 'v(\d+)'/)[1], String(ver));
  const css = read('css/style.css');
  for (const c of ['.mpk-btn {', '.mpk-opt.is-no {', '.mpk-hint {', '.mpk-col {', '.mpk-bar {']) assert.ok(css.includes(c), c);
  assert.ok(read('js/weekly.js').includes("row('🐾 포켓몬 수학 판', '판', 'up', weeks.map((w) => cnt(w, (e) => e.mode === 'poke')))"), '주간 표 줄');
});
