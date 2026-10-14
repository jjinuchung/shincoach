// 🔤 v249 숫자 뒤 조사 (2026-10-13, 아버님 "4·5는 v249로" — Codex 60차 덤으로 찾은 "1예요·7가·−16는·5/8예요")
// 틀 글마다 조사를 손으로 맞추다 300가지가 틀렸다 → 화면에 그리기 직전(math.js richNode) fixNumJosa 한 곳에서 읽는 소리로.
// ★ 판정은 앱의 표(numTail)를 베끼지 않는다 — 여기서는 숫자를 한글로 읽어 보고(readKo) 그 끝 글자의 받침으로 정한다.
// ★ 숫자 찾기도 앱 정규식을 베끼지 않는다 — 조사 자리에서 거꾸로 숫자를 읽어 올라간다(numSpots). 베꼈을 때 쉼표 묶음의 끝 "000"만
//   읽는 구멍을 앱과 함께 가져서 못 잡았다 (Codex 61차 #3)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { josa, numJosa, numTail, fixNumJosa } from '../js/mathgen.js';
import { STEMS } from '../js/mathprog.js';
import { KIND_IDS as SP_KIND_IDS, makeSpecial } from '../js/mathspecial.js';
import { askCardLines } from '../js/stats.js';

const read = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const OPTS = { names: ['피카츄', '리자몽', '개굴닌자'], me: '아이', worlds: { pokemon: [], toystory: [], minions: [], moana: [] } };

// ── 따로 만든 판정기: 숫자 글을 한글로 읽는다
const DIG = ['영', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
function readInt(s) {
  let n = BigInt(String(s).replace(/,/g, '')); // 1,000,000 — 쉼표는 묶음 표시
  if (n === 0n) return '영';
  const units = ['', '만', '억', '조', '경'];
  const out = [];
  for (let u = 0; n > 0n; u++) {
    const chunk = Number(n % 10000n);
    n /= 10000n;
    if (!chunk) continue;
    let w = '';
    [['천', 1000], ['백', 100], ['십', 10]].forEach(([name, v]) => { const d = Math.floor(chunk / v) % 10; if (d) w += (d === 1 ? '' : DIG[d]) + name; });
    if (chunk % 10) w += DIG[chunk % 10];
    out.unshift((u === 1 && chunk === 1 ? '' : w) + units[u]); // 10000은 "만"
  }
  return out.join(' ');
}
function readKo(numText) {
  let s = String(numText).replace(/[−–-]/g, '');
  const neg = s !== String(numText) ? '마이너스 ' : '';
  const readDec = (x) => { const [i, f] = x.split('.'); return f ? `${readInt(i)} 점 ${[...f].map((c) => DIG[+c]).join('')}` : readInt(i); };
  if (s.includes('/')) { const [a, b] = s.split('/'); return `${neg}${readInt(b)}분의 ${readDec(a)}`; }
  return neg + readDec(s);
}
const PAIRS = [['이에요', '예요'], ['이었', '였'], ['이랑', '랑'], ['으로', '로'], ['은', '는'], ['을', '를'], ['과', '와'], ['이', '가']];
const ALONE = new Set(['이랑', '랑', '으로', '로', '은', '는', '을', '를', '과', '와', '이', '가']);
/** 맞는 조사 — 읽은 소리의 끝 글자 받침으로 (ㄹ받침 뒤 '로') */
function wantJosa(numText, jo) {
  const last = readKo(numText).slice(-1);
  const pair = PAIRS.find((p) => p.includes(jo));
  if (pair[0] === '으로') { const code = last.charCodeAt(0) - 0xAC00; return code % 28 === 0 || code % 28 === 8 ? '로' : '으로'; }
  return josa(last, pair[0], pair[1]);
}
// ── 따로 만든 찾기: 조사 자리에서 거꾸로 숫자 글자(0-9 . , /)를 모아 올라간다 → 맞는 꼴인지는 따로 따진다
const JOSAS = PAIRS.flat().sort((a, b) => b.length - a.length);
/** 맞는 숫자 꼴인가 — 정수(세 자리 쉼표 묶음은 됨)·소수·분수 a/b, 앞에 − 하나. 아니면(12,34 · 1,2,3 · /3 · 2026.10.13) 고치면 안 되는 자리 */
function wellFormed(tok) {
  const parts = tok.replace(/^[−–-]/, '').split('/');
  if (parts.length > 2 || (parts.length === 2 && !/^\d+$/.test(parts[1]))) return false;
  const [ip, fp, more] = parts[0].split('.');
  if (more !== undefined || (fp !== undefined && !/^\d+$/.test(fp))) return false;
  const groups = ip.split(',');
  if (groups.length === 1) return /^\d+$/.test(ip);
  return /^\d{1,3}$/.test(groups[0]) && groups.slice(1).every((g) => /^\d{3}$/.test(g));
}
/** 글 속 "숫자 + 조사" 자리 — [{ tok, jo, ok }] · 조사 바로 앞(굵게 ** 건너)이 숫자일 때만 · 홀로 쓰는 조사 뒤에 한글이면 조사가 아니다 */
function numSpots(text) {
  const s = String(text);
  const out = [];
  for (let i = 1; i < s.length; i++) {
    const jo = JOSAS.find((x) => s.startsWith(x, i));
    if (!jo) continue;
    const end = s.slice(i - 2, i) === '**' ? i - 2 : i;
    if (!/[0-9]/.test(s[end - 1] || '')) continue;
    if (ALONE.has(jo) && /[가-힣]/.test(s[i + jo.length] || '')) continue; // 3가지·2과목·5이상
    let k = end;
    while (k > 0 && /[0-9.,/]/.test(s[k - 1])) k -= 1;
    if (k > 0 && /[−–-]/.test(s[k - 1])) k -= 1;
    const tok = s.slice(k, end);
    out.push({ tok, jo, ok: wellFormed(tok) });
  }
  return out;
}
function badJosa(text) {
  return numSpots(text).filter((p) => p.ok && wantJosa(p.tok, p.jo) !== p.jo).map((p) => `${p.tok}${p.jo} → ${p.tok}${wantJosa(p.tok, p.jo)}`);
}
/** 고치면 안 되는 자리(맞는 숫자 꼴이 아님)를 fixNumJosa가 건드렸나 — 고치기 전과 뒤의 자리를 차례로 맞춰 본다 */
function touchedOdd(before, after) {
  const a = numSpots(before);
  const b = numSpots(after);
  if (a.length !== b.length) return [`자리 수가 달라짐 ${a.length} → ${b.length}`];
  return a.flatMap((p, i) => (p.tok !== b[i].tok || (!p.ok && p.jo !== b[i].jo) ? [`${p.tok}${p.jo} → ${b[i].tok}${b[i].jo}`] : []));
}

test('🔤 판정기 맞춰 보기: 한글로 읽기 — 16.5 · 4/1 · −16 · 1000 · 10000 · 2 3/4는 분자 쪽', () => {
  assert.equal(readKo('16.5'), '십육 점 오');
  assert.equal(readKo('4/1'), '일분의 사');
  assert.equal(readKo('−16'), '마이너스 십육');
  assert.equal(readKo('1000'), '천');
  assert.equal(readKo('10000'), '만');
  assert.equal(readKo('120034'), '십이만 삼십사');
  assert.equal(readKo('121000000000000'), '백이십일조', '조로 끝나면 받침 없음');
  assert.equal(wantJosa('150000000000', '는'), '은', '1500억');
  assert.equal(wantJosa('8/2', '는'), '은', '2분의 팔');
  assert.equal(wantJosa('3', '로'), '으로');
  assert.equal(wantJosa('7', '으로'), '로', 'ㄹ받침 뒤는 로');
  assert.equal(wantJosa('10', '로'), '으로', '십');
});

test('🔤 numTail·numJosa: 정수는 예전과 같고 소수·분수(분자)·음수·대분수도 읽는 소리로', () => {
  for (let n = 0; n <= 120; n++) {
    for (const [a, b] of [['은', '는'], ['이', '가'], ['으로', '로']]) assert.equal(numJosa(n, a, b), wantJosa(String(n), b), `${n}${b}`);
  }
  assert.equal(numJosa(16.5, '이', '가'), '가', '예전엔 소수점 아래를 버려 "16.5이"');
  assert.equal(numJosa('4/1', '은', '는'), '는');
  assert.equal(numJosa('8/2', '은', '는'), '은');
  assert.equal(numJosa('2 3/4', '은', '는'), '은');
  assert.equal(numJosa('−16', '은', '는'), '은');
  assert.equal(numJosa(-3, '을', '를'), '을');
  assert.equal(numTail('x/3'), null);
  assert.equal(numTail('3가지'), null);
});

test('🔤 fixNumJosa: 숫자에 바로 붙은 조사만 고친다 · 3가지·2과목·5이상·x/3·그림 지시문은 그대로 · 굵게 사이도 · 두 번 해도 같다', () => {
  const cases = [
    ['3 × 2를 먼저 하면 5이 돼요.', '3 × 2를 먼저 하면 5가 돼요.'],
    ['왼쪽부터 하면 16.5이 나와요.', '왼쪽부터 하면 16.5가 나와요.'],
    ['(−24) − (−8) = −16는 뺀 거예요.', '(−24) − (−8) = −16은 뺀 거예요.'],
    ['4/1은 "통째로 4판"이에요. 8/2는', '4/1는 "통째로 4판"이에요. 8/2은'],
    ['3에서 왼쪽으로 2칸 가면 1예요.', '3에서 왼쪽으로 2칸 가면 1이에요.'],
    ['크기가 8가 아니라 7예요.', '크기가 8이 아니라 7이에요.'],
    ['약분하면 다시 7/8예요 · 5/8예요', '약분하면 다시 7/8이에요 · 5/8예요'],
    ['3로 나눠요 · 1으로 · 10로', '3으로 나눠요 · 1로 · 10으로'],
    ['1였어요 · 5이었어요', '1이었어요 · 5였어요'],
    ['**2**이 커요 · **3**가 커요', '**2**가 커요 · **3**이 커요'],
    ['2 3/4는 · 0.5은 · 1,000이', '2 3/4은 · 0.5는 · 1,000이'],
  ];
  for (const [a, b] of cases) assert.equal(fixNumJosa(a), b, a);
  for (const same of ['3가지 방법', '2과목', '5이상인 수', 'x/3은', '[bar 7/8]', '[ang 30/90/16@0]', '2x는', '1등이에요', '30°예요', '5 cm는']) assert.equal(fixNumJosa(same), same, same);
  for (const [, b] of cases) assert.equal(fixNumJosa(b), b, `두 번: ${b}`);
  assert.equal(fixNumJosa(null), '');
});

test('🔤 Codex 61차 #1: 쉼표 묶음은 수 전체로 읽는다(1조는·10조로·1조 5000억은·12,345가) · 묶음이 어긋나거나 숫자에 바로 붙지 않은 조사는 그대로', () => {
  assert.equal(readKo('1,000,000,000,000'), '일조');
  assert.equal(readKo('10,000,000,000,000'), '십조');
  assert.equal(readKo('1,500,000,000,000'), '일조 오천억');
  const cases = [
    ['1,000,000,000,000는 큰 수예요.', '1,000,000,000,000는 큰 수예요.'],
    ['10,000,000,000,000로 나눠요.', '10,000,000,000,000로 나눠요.'],
    ['1,500,000,000,000은 · 1조 5000억은', '1,500,000,000,000은 · 1조 5000억은'],
    ['12,345이 · 1,000,000이 · 3,000예요 · 1,234.5은 · −1,000는', '12,345가 · 1,000,000이 · 3,000이에요 · 1,234.5는 · −1,000은'],
  ];
  for (const [a, b] of cases) {
    assert.equal(fixNumJosa(a), b, a);
    assert.deepEqual(badJosa(b), [], `판정기도 맞다고: ${b}`);
  }
  assert.equal(badJosa(cases[3][0]).length, 4, '판정기가 고치기 전 틀린 곳 넷(1,000,000이는 맞음)을 본다');
  // 숫자에 바로 붙지 않았거나 맞는 숫자 꼴이 아니면 고치지 않는다 — 괄호 뒤 조사는 괄호 앞 말의 것일 수 있다("크기(분모 8)는")
  for (const same of ['(−3)는', '10²는', '"3"는', '‘3’는', '12,34는', '1,2,3는', '1234,567이', '2026.10.13은', '조각 크기(분모 8)는', 'x/3은']) {
    assert.equal(fixNumJosa(same), same, same);
    assert.ok(numSpots(same).every((p) => !p.ok), `판정기도 고칠 자리가 아니라고: ${same}`);
  }
  assert.deepEqual(touchedOdd('1,2,3는', '1,2,3은'), ['1,2,3는 → 1,2,3은'], '아래 전체 검사의 "고칠 자리가 아닌데 바뀐 곳" 찾기가 살아 있다');
  assert.equal(numJosa('1,000,000,000,000', '은', '는'), '는');
  assert.equal(numJosa('10,000,000,000,000', '으로', '로'), '로');
  assert.equal(numTail('12,34'), null);
  assert.equal(numTail('1,0000'), null);
});

test('★ 🔤 richNode로 그리는 글 전부 — 모든 줄기·개념 생성 문항(문제·보기·풀이·힌트) · 💎 · 원고 JSON을 고쳐 그리면 숫자 뒤 조사가 다 맞고, 고칠 자리가 아닌 곳은 그대로', () => {
  const left = new Map();
  const odd = new Map();
  let seen = 0;
  const walk = (where, v) => {
    if (typeof v === 'string') {
      seen += 1;
      const fixed = fixNumJosa(v);
      for (const x of badJosa(fixed)) left.set(`${where} ${x}`, 1);
      for (const x of touchedOdd(v, fixed)) odd.set(`${where} ${x}`, 1);
    }
    else if (Array.isArray(v)) v.forEach((x) => walk(where, x));
    else if (v && typeof v === 'object') for (const x of Object.values(v)) walk(where, x);
  };
  let before = 0;
  const count = (v) => { if (typeof v === 'string') before += badJosa(v).length; else if (v && typeof v === 'object') Object.values(v).forEach(count); };
  for (const st of Object.values(STEMS)) {
    let content = {};
    try { content = JSON.parse(read(st.file.replace('./', ''))); } catch { /* 줄기 원고 없음 */ }
    for (const c of st.list) {
      for (let s = 1; s <= 6; s++) {
        let qs = [];
        try { qs = st.gen.makeRound(c.id, s * 7919, { ...OPTS, content }); } catch { continue; }
        for (const q of qs) { const shown = { q: q.q, expr: q.expr, ch: (q.choices || []).map((x) => x.text), solve: q.solve, hint: q.hint }; count(shown); walk(`${st.code} ${c.id}`, shown); }
      }
    }
  }
  for (const id of SP_KIND_IDS) for (let t = 1; t <= 6; t++) { const q = makeSpecial(id, t * 7919, { cast: [] }); if (q) { count(q); walk(`💎 ${id}`, q); } }
  for (const f of fs.readdirSync(new URL('../coach/math/', import.meta.url))) if (f.endsWith('.json')) { const j = JSON.parse(read(`coach/math/${f}`)); count(j); walk(`원고 ${f}`, j); }
  assert.ok(seen > 20000, `글 ${seen}개`);
  assert.ok(before > 50, `고치기 전엔 틀린 조사 ${before}곳 — 검사가 살아 있다`);
  assert.deepEqual([...left.keys()].slice(0, 12), [], '고쳐 그린 뒤 남은 틀린 조사');
  assert.deepEqual([...odd.keys()].slice(0, 12), [], '고칠 자리가 아닌데 바뀐 곳');
});

test('🔤 배선: 수학 글은 richNode 한 곳에서 고쳐 그린다 · 🎯 감 잡기 "…이었어요"도 숫자면 읽는 소리로', () => {
  const math = read('js/math.js');
  const rn = math.slice(math.indexOf('function richNode(text) {'), math.indexOf('function partNode(p) {'));
  assert.ok(rn.includes('for (const p of fixNumJosa(text).split('), 'richNode가 글을 나누기 전에');
  assert.ok(math.includes("numTail(noun) ? numJosa(noun, '이었어요', '였어요') : josa(noun, '이었어요', '였어요')"));
  assert.ok(+(/const CACHE_VERSION = 'v(\d+)';/.exec(read('sw.js')) || [])[1] >= 249, 'sw v249 이상');
});

test('📝 v249 풀이 글 문구: 식 계산에 "남은을 물었으니" 없음 · □ 식에 "몇 m 더" 없음(이야기에는 그대로) · "각기둥이라고 했어요." 한마디 없음 · 분수÷자연수 ②에 "통분해요" 보기 없음 + 크기가 같은 분수로 나누기 한 줄', () => {
  const stem = (code) => Object.values(STEMS).find((s) => s.code === code);
  const gen = (code, id, seeds = 24) => {
    const st = stem(code);
    let content = {};
    try { content = JSON.parse(read(st.file.replace('./', ''))); } catch { /* 원고 없음 */ }
    const out = [];
    for (let s = 1; s <= seeds; s++) out.push(...st.gen.makeRound(id, s * 7919, { ...OPTS, content }));
    return out;
  };
  const whys = (q) => Object.values((q.solve && q.solve.why) || {});
  for (const q of gen('V', 'fadd.sub')) for (const w of whys(q)) assert.ok(!w.includes('"남은"을 물었으니'), w);
  let box = 0; let story = 0;
  for (const q of gen('V', 'fadd.apply')) {
    const said = whys(q).some((w) => w.includes('"몇 m 더"'));
    if (String(q.q).includes('□')) { box += 1; assert.ok(!said, `□ 식: ${q.q}`); }
    if (String(q.q).includes('몇 m 더')) { story += 1; }
  }
  assert.ok(box > 0 && story > 0, `□ ${box} · 이야기 ${story}`);
  for (const c of stem('P').list) for (const q of gen('P', c.id, 8)) for (const w of whys(q)) assert.ok(w !== '각기둥이라고 했어요.' && w !== '각뿔이라고 했어요.', `${c.id}: ${w}`);
  const mis = gen('A', 'frac.divnat').filter((q) => q.kind === 'misread');
  assert.ok(mis.length > 0);
  for (const q of mis) {
    assert.ok(!q.choices.some((x) => /통분/.test(x.text)), '★ 크기가 같은 분수로 바꿔 나누기는 맞는 방법 — "통분해요"를 틀린 보기로 내지 않는다');
    assert.ok(q.solve.steps.some((st) => st.includes('크기가 같은 분수로 바꿔 분자를 나눠요')));
  }
});

test('🔤 v256 📊 ❓ 질문 카드도 문제 화면·복사문처럼 — 문제·식·아이 답·정답의 숫자 뒤 조사를 고쳐 보이고(저장한 값은 그대로) · 굵게 뺌 · 빈 값 · 아이 말·답장은 쓴 그대로', () => {
  const a = { q: '어떤 수에 3을 곱하면 **15**이 돼요. 4/1은 얼마인가요?', expr: '□ × 3 = 15', my: '1예요', ans: '5', tag: '계산 실수', w: '' };
  const before = JSON.stringify(a);
  assert.deepEqual(askCardLines(a), {
    q: '문제: 어떤 수에 3을 곱하면 15가 돼요. 4/1는 얼마인가요? · 식: □ × 3 = 15',
    mine: '진우 답: 1이에요 ❌ (계산 실수) · 정답: 5',
  });
  assert.equal(JSON.stringify(a), before, '저장한 질문은 그대로');
  assert.equal(askCardLines({ q: '2이 되려면?', ans: '−16' }).mine, '진우 답: (없음) ❌ · 정답: −16');
  assert.deepEqual(askCardLines(null), { q: '문제: ', mine: '진우 답: (없음) ❌ · 정답: ' });
  // 복사문(asksText)과 같은 고침 — 같은 질문이면 문제 글이 같다
  assert.ok(askCardLines(a).q.startsWith(`문제: ${fixNumJosa(a.q).replace(/\*\*/g, '')}`));
  // 배선: 카드는 이 함수로 그리고, 아이 말·답장 줄은 고치지 않는다
  const st = read('js/stats.js');
  const card = st.slice(st.indexOf('// 3f) ❓'), st.indexOf("const closeB = el('button'", st.indexOf('// 3f) ❓')));
  assert.ok(card.includes('const ln = askCardLines(a);') && card.includes("el('p', 'q', ln.q)") && card.includes("el('p', '', ln.mine)"));
  assert.ok(card.includes('진우 말: "${a.kid}"') && card.includes('💬 답장 ${i + 1}: ${rp.text}'), '아이 말·답장은 쓴 그대로');
  assert.ok(!/fixNumJosa\(a\.kid|fixNumJosa\(rp/.test(st));
  assert.ok(+(/const CACHE_VERSION = 'v(\d+)';/.exec(read('sw.js')) || [])[1] >= 256, 'sw v256 이상 — 고친 stats.js를 받게');
});
