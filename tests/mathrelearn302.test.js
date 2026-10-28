// 📚 수학 v302 (2026-10-20, 아버님 "진행해") — 틀리면 배움 한 장
//  틀린 화면은 🔍 까닭 고르기·▶ 한 줄씩 열기·🙈 이유를 다 지나야 다음이 열려 틀린 순간이 길었다 →
//  처음 배우기·확인·연습·☀️ 편과 🎲 섞어 풀기에서 비슷한 문제가 나오는 문항을 틀리면 그 칸의 📚 배움 한 장(그 문제와 가장 닮은 장) →
//  바로 비슷한 문제 · 방금 문제 풀이는 접어 두고 열면 그대로 · ✋ 확인은 건너뛰어도 된다 · 일지에 rl · 📊·📤에 한 줄
import { fakeIdb } from './fakeidb.js'; // ★ db.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  STEMS, stemOf, relearnPage, relearnLine, RELEARN_MODES, applyRound, applyQuit, applyMixRound, mathReportText, GUARD_DAYS,
} from '../js/mathprog.js';
import { emptyMath, updateMath, getMath } from '../js/db.js';

void fakeIdb;
const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const content = (key) => JSON.parse(read(STEMS[key].file.replace('./', '')));
const T = '2026-10-20';
const body = (src, head) => { const i = src.indexOf(head); assert.ok(i >= 0, head); return src.slice(i, src.indexOf('\n}\n', i)); };

test('📚 relearnPage (순수): 장이 하나·없으면 첫 장 · 설명과 ✋ 확인 글 모두 · 가장 닮은 장 · 같으면 앞 장 · 하나도 없으면 첫 장 · 그림 표시는 빼고 굵게는 벗긴다', () => {
  for (const bad of [undefined, null, 5, 'x', [], [{ say: '수를 읽어요' }]]) assert.equal(relearnPage('수를 바르게 읽은 것은', bad), 0, JSON.stringify(bad));
  const pages = [
    { say: '10000이 10개면 십만이에요.', check: { q: '10000이 386개인 수는 얼마일까요?' } },
    { say: '큰 수는 네 자리씩 끊어 읽어요.', check: { q: '다음 수를 바르게 읽은 것은 어느 것일까요?' } },
    { say: '읽은 말을 수로 쓸 때도 네 자리씩.', check: { q: '다음을 수로 쓰면 얼마일까요?' } },
    { say: '숫자 3은 천만의 자리 숫자예요.', check: { q: '다음 수에서 숫자 9가 나타내는 값은 얼마일까요?' } },
  ];
  assert.equal(relearnPage('다음 수에서 숫자 7이 나타내는 값은 얼마일까요?', pages), 3);
  assert.equal(relearnPage('다음 수를 바르게 읽어 보면?', pages), 1);
  assert.equal(relearnPage('숫자가 나타내요', [{ say: '수를 써요' }, { say: '나타내는 값' }]), 1, '「나타내요」·「나타내는」처럼 끝이 달라도 두 글자 묶음(나타·타내)으로 맞는다 — 낱말 통째로는 못 맞힌다');
  assert.equal(relearnPage('10000이 52개인 수는?', pages), 0);
  assert.equal(relearnPage('사과와 배', pages), 0, '하나도 없으면 첫 장');
  assert.equal(relearnPage('읽고 쓰기', [{ say: '사과' }, { say: '읽고' }, { say: '쓰기' }]), 1, '같으면 앞 장');
  // 모든 장에 있는 말(칸 이름처럼)은 모든 장에 똑같이 더해져 가르는 말이 고른다
  assert.equal(relearnPage('큰수 쓰기', [{ say: '큰수 읽기' }, { say: '큰수 세기' }, { say: '큰수 쓰기' }]), 2);
  assert.equal(relearnPage('큰수', [{ say: '큰수 읽기' }, { say: '큰수 세기' }]), 0, '모든 장에 있는 말만 겹치면 첫 장');
  // 설명도 ✋ 확인 글도 본다
  assert.equal(relearnPage('사과', [{ say: '가나' }, { say: '다라', check: { q: '사과 세기' } }]), 1, '✋ 확인 글에만 있는 말');
  assert.equal(relearnPage('배추', [{ say: '사과' }, { say: '배추', check: { q: '감자' } }]), 1, '설명에만 있는 말');
  // 그림 표시 안의 글 · 굵게 표시
  assert.equal(relearnPage('[mark 나타내는] 읽은', pages), 1, '그림 표시 안의 글은 안 센다 — 세면 자리값 장(3)으로 간다');
  assert.equal(relearnPage('**큰**수', [{ say: '작은 수 세기' }, { say: '큰수 읽기' }]), 1, '굵게 표시를 벗겨 "큰수"로 센다 — 안 벗기면 한 글자씩 떨어져 첫 장');
});

test('📚 relearnPage (원고): 큰 수 「만 단위」 칸 — 수 세기·읽기·쓰기·자리값 문제가 각자 그 장으로 · 모든 줄기·칸·틀에서 장 번호가 장 안에 있고 대부분 한 장으로 갈린다', () => {
  const big = STEMS.bignum;
  const opts = { content: content('bignum') };
  const L = big.gen.lessonOf('big.manunit', 12345, opts);
  assert.ok(L.pages.length >= 4);
  const want = [['개인 수는', 0], ['바르게 읽은', 1], ['수로 쓰면', 2], ['나타내는 값', 3]];
  const got = new Map();
  for (let s = 1; s <= 80 && got.size < want.length; s++) {
    const q = big.gen.makeQuestion('big.manunit', 'calc', s * 7919, opts);
    if (!q) continue;
    for (const [w, page] of want) if (String(q.q).includes(w) && !got.has(w)) got.set(w, [relearnPage(q.q, L.pages), page]);
  }
  assert.equal(got.size, want.length, [...got.keys()].join(','));
  for (const [w, [a, b]] of got) assert.equal(a, b, w);
  // 모든 줄기 — 장 번호가 장 안 · 갈리는 틀이 3분의 2 넘게 (지금 약 72% — 묶음 대신 늘 첫 장이 되면 여기서 떨어진다)
  let tot = 0; let off = 0;
  for (const st of Object.values(STEMS)) {
    if (!st.lesson || !st.gen.lessonOf) continue;
    const o = { content: content(st.key) };
    for (const c of st.list) {
      const LL = st.gen.lessonOf(c.id, 12345, o);
      if (!LL || LL.pages.length < 2) continue;
      const seen = new Set();
      for (const kind of ['calc', 'misread']) for (let s = 1; s <= 12; s++) {
        let q; try { q = st.gen.makeQuestion(c.id, kind, s * 7919, o); } catch { q = null; }
        if (!q || !q.key || seen.has(q.key)) continue;
        seen.add(q.key);
        const p = relearnPage(q.q, LL.pages);
        assert.ok(Number.isInteger(p) && p >= 0 && p < LL.pages.length, `${c.id} ${q.key} → ${p}`);
        tot += 1;
        if (p !== 0) off += 1;
      }
    }
  }
  assert.ok(tot > 600, `틀 ${tot}`);
  assert.ok(off / tot > 0.4, `첫 장이 아닌 장으로 간 틀 ${off}/${tot} — 늘 첫 장이면 고르기가 죽은 것`);
});

test('📚 배움 글 (원고 · Codex 108차 #2): 배움 줄기는 칸마다 lessonOf가 장 하나 이상 · 장마다 글 · 배움이 없는 줄기(A 분수)는 칸마다 📖 이야기 글 — 못 만들면 예전 풀이 길로 조용히 돌아가므로 칸마다 본다', () => {
  let n = 0;
  for (const st of Object.values(STEMS)) {
    const o = { content: content(st.key) };
    for (const c of st.list) {
      if (st.lesson) {
        assert.equal(typeof st.gen.lessonOf, 'function', `${st.key} lessonOf`);
        const L = st.gen.lessonOf(c.id, 12345, o);
        assert.ok(L && Array.isArray(L.pages) && L.pages.length >= 1, `${c.id} 배움 장 없음`);
        for (const p of L.pages) assert.ok(p && typeof p.say === 'string' && p.say.trim().length > 0, `${c.id} 빈 장`);
      } else {
        assert.equal(typeof st.gen.conceptStory, 'function', `${st.key} conceptStory`);
        const s = st.gen.conceptStory(c.id, 12345, o);
        assert.ok(s && typeof s.text === 'string' && s.text.trim().length > 0, `${c.id} 이야기 없음`);
      }
      n += 1;
    }
  }
  assert.ok(n > 200, `칸 ${n}`);
  assert.equal(STEMS.fraction.lesson, false, 'A 분수 줄기는 이야기 길을 탄다');
});

test('📚 배움 한 장이 나오는 편: 처음 배우기·확인·연습·🎲 섞어 풀기만 (🤔 노트 회차·💎·📏 진단·❓ 답장 뒤 풀기는 그대로)', () => {
  assert.deepEqual([...RELEARN_MODES].sort(), ['learn', 'mix', 'practice', 'quick', 'review']); // ⚡ 3문제 한 판도 섞인 연습 판 (v354)
  for (const m of ['notes', 'note', 'special', 'diag', 'ask', 'quit']) assert.ok(!RELEARN_MODES.has(m), m);
});

test('📚 일지 rl: 개념 편·그만둔 편·섞어 풀기 모두 남는다 · 없으면 열쇠도 없다', () => {
  const ID = STEMS.bignum.list[0].id;
  const ID2 = STEMS.angle.list[0].id;
  const m = emptyMath();
  applyRound(m, ID, { correct: 3, total: 4, missTags: [], mode: 'learn', rid: 1, day: T, qs: [{ k: 'calc', ok: 1 }, { k: 'calc', ok: 0, rl: 1, fx: 1 }, { k: 'calc', ok: 1 }, { k: 'calc', ok: 1 }] }, T);
  applyQuit(m, { rid: 2, id: ID, mode: 'learn', d: T, n: 4, qs: [{ k: 'calc', ok: 0, rl: 1 }] }, T);
  applyMixRound(m, [{ id: ID2, key: 'k1', k: 'calc', ok: 0, rl: 1, fx: 0 }, { id: ID, key: 'k2', k: 'calc', ok: 1 }], T);
  const [a, b, c] = m.log.slice(-3);
  assert.deepEqual(a.qs.map((q) => q.rl), [undefined, 1, undefined, undefined]);
  assert.ok(!('rl' in a.qs[0]), '없으면 열쇠도 없다');
  assert.equal(b.mode, 'quit');
  assert.equal(b.qs[0].rl, 1);
  assert.equal(c.mode, 'mix');
  assert.deepEqual(c.qs.map((q) => q.rl), [1, undefined]);
  const m2 = emptyMath();
  applyRound(m2, ID, { correct: 0, total: 1, missTags: [], mode: 'learn', rid: 9, day: T, qs: [{ k: 'calc', ok: 0, rl: 'yes' }, { k: 'calc', ok: 0, rl: 0 }] }, T);
  assert.deepEqual(m2.log.at(-1).qs.map((q) => q.rl), [1, undefined], '참이면 1 · 거짓이면 안 남긴다');
});

test('📚 relearnLine: 최근 7일 · 맞힘·또 틀림·비슷한 문제에 답하기 전에 그만둠·비슷한 문제가 안 나옴 · 섞어 풀기는 끝낸 편만이라고 밝힌다 · 맞힌 문항·옛 기록은 안 센다 · 같은 편은 한 번 · 📤 글과 일지 줄 표시', () => {
  const ID = STEMS.bignum.list[0].id;
  const m = emptyMath();
  assert.equal(relearnLine(m, T), `📚 틀린 뒤 배움 한 장 — 최근 ${GUARD_DAYS}일 아직 없음`);
  applyRound(m, ID, { correct: 2, total: 4, missTags: [], mode: 'review', rid: 11, day: T, qs: [{ k: 'calc', ok: 0, rl: 1, fx: 1 }, { k: 'calc', ok: 0, rl: 1, fx: 0 }, { k: 'calc', ok: 1, rl: 1 }, { k: 'calc', ok: 1 }] }, T);
  applyQuit(m, { rid: 12, id: ID, mode: 'learn', d: T, n: 4, qs: [{ k: 'calc', ok: 0, rl: 1 }] }, T);
  applyMixRound(m, [{ id: ID, key: 'k1', k: 'calc', ok: 0, rl: 1 }], T); // 비슷한 문제가 안 나온 문항
  applyRound(m, ID, { correct: 0, total: 1, missTags: [], mode: 'learn', rid: 13, day: '2026-10-01', qs: [{ k: 'calc', ok: 0, rl: 1, fx: 1 }] }, '2026-10-01'); // 기간 밖
  applyRound(m, ID, { correct: 0, total: 1, missTags: [], mode: 'learn', rid: 14, day: T, qs: [{ k: 'calc', ok: 0, fx: 1 }] }, T); // 배움 한 장 없이 (옛 길)
  assert.equal(relearnLine(m, T), `📚 틀린 뒤 배움 한 장 4번(최근 ${GUARD_DAYS}일 · 🎲 섞어 풀기는 끝낸 편만): 비슷한 문제 맞힘 1 · 또 틀림 1 · 비슷한 문제에 답하기 전에 그만둠 1 · 비슷한 문제가 안 나옴 1`);
  // 같은 편(rid)을 두 번 적었으면 한 번
  m.log.push({ ...m.log.find((e) => e.rid === 11) });
  assert.ok(relearnLine(m, T).startsWith('📚 틀린 뒤 배움 한 장 4번'), relearnLine(m, T));
  // "비슷한 문제가 안 나옴"은 있을 때만
  const m2 = emptyMath();
  applyRound(m2, ID, { correct: 0, total: 1, missTags: [], mode: 'learn', rid: 21, day: T, qs: [{ k: 'calc', ok: 0, rl: 1, fx: 1 }] }, T);
  assert.equal(relearnLine(m2, T), `📚 틀린 뒤 배움 한 장 1번(최근 ${GUARD_DAYS}일 · 🎲 섞어 풀기는 끝낸 편만): 비슷한 문제 맞힘 1 · 또 틀림 0 · 비슷한 문제에 답하기 전에 그만둠 0`);
  const txt = mathReportText(m2, T);
  assert.ok(txt.includes(`\n${relearnLine(m2, T)}\n`), '📤 글에 같은 줄');
  assert.ok(txt.includes('✘📚→고침'), '일지 줄에 📚 표시 — 고침 앞에');
  assert.ok(!mathReportText(emptyMath(), T).includes('✘📚'));
  const st = read('js/stats.js');
  assert.ok(st.includes("gl.appendChild(el('li', '', relearnLine(math, today)));"), '📊 꼼수 막기 목록 끝에 같은 줄');
  assert.ok(st.includes('restLine, relearnLine } from \'./mathprog.js\';'));
});

test('📚 진짜 저장 경로(fakeidb): rl이 있는 편을 적고 다시 읽으면 남아 있다', async () => {
  const ID = STEMS.bignum.list[0].id;
  await updateMath((s) => { applyRound(s, ID, { correct: 3, total: 4, missTags: [], mode: 'learn', rid: 31, day: T, qs: [{ k: 'calc', ok: 0, rl: 1, fx: 1 }, { k: 'calc', ok: 1 }, { k: 'calc', ok: 1 }, { k: 'calc', ok: 1 }] }, T); });
  const s = await getMath();
  const e = s.log.find((x) => x.rid === 31);
  assert.ok(e && e.qs[0].rl === 1 && !('rl' in e.qs[1]));
  assert.ok(relearnLine(s, T).startsWith('📚 틀린 뒤 배움 한 장 1번'));
});

test('🔁 비슷한 문제는 문항의 칸에서 줄기를 찾는다 (Codex 108차 F): 지금 줄기 만들기로는 다른 줄기 칸이 null → 그 칸의 줄기로 만들면 같은 틀 · 지금은 편·노트 회차·섞어 풀기가 모두 지금 줄기 것만 내 실제로 생기지는 않는다', () => {
  const id = STEMS.angle.list[0].id;
  const o = { content: content('angle') };
  const q = STEMS.angle.gen.makeQuestion(id, 'calc', 7919, o);
  assert.ok(q && q.key);
  assert.equal(STEMS.bignum.gen.makeQuestion(id, 'calc', 17, { content: content('bignum'), want: { k: 'calc', key: q.key } }), null);
  const sx = stemOf(id);
  assert.equal(sx.key, 'angle');
  const tw = sx.gen.makeQuestion(id, 'calc', 17, { ...o, want: { k: 'calc', key: q.key } });
  assert.ok(tw && tw.key === q.key, '그 칸의 줄기로 만들면 같은 틀');
  // 사다리의 🤔 노트 단추는 지금 줄기 노트만 연다 — 그래서 지금 앱에서는 다른 줄기 칸이 노트 회차에 안 온다(안전장치일 뿐 동작은 그대로)
  assert.ok(read('js/math.js').includes('const notesDue = dueNotes(state, today).filter((x) => { const s = stemOf(x.id); return s && s.key === ui.stem; });'));
});

test('📚 화면 연결: 틀린 화면 · 배움 한 장 · 비슷한 문제 · 기록 · sw', () => {
  const m = read('js/math.js');
  assert.ok(m.includes('  RELEARN_MODES, relearnPage, // 📚 틀리면 배움 한 장 (v302)\n} from \'./mathprog.js\';'));
  const pa = body(m, 'function paintAnswer(i, list, card, restoring) {');
  assert.ok(pa.includes('const relearn = canTwin && RELEARN_MODES.has(r.mode) ? relearnOf(q, r) : null;'), '비슷한 문제가 나오는 문항 · 그 편들에서만');
  const iRel = pa.indexOf('    if (relearn) {');
  const iOld = pa.indexOf('      rv = light(r) ? null : { st: a, seed: (r.seed || 0) + r.at * 7919 };');
  assert.ok(iRel >= 0 && iOld > iRel, '배움 한 장 길이 먼저 · 아니면 예전 풀이 길(🔍·한 줄씩)');
  const rel = pa.slice(iRel, iOld);
  assert.ok(rel.includes('if (!a.rl) { a.rl = 1; saveLive(); }'), '본 표시는 그 순간 적는다 — 그만둬도 남게');
  assert.ok(rel.includes('scrollTo = relearnBox(q, shown, a, relearn, kl);') && rel.includes('const offer = askOffer(q, a);'));
  assert.ok(!rel.includes('solveCard(q, shown, rv)') && !rel.includes('whyBlock'), '이 길엔 🔍·한 줄씩·🙈 없음');
  assert.ok(pa.includes("canTwin ? (relearn ? '비슷한 문제 풀어 볼게요 →' : '알겠어요, 비슷한 문제 하나 더 →')"), '단추 말');
  assert.ok(pa.includes('if (!ch.ok && !light(r) && !relearn) {'), '🙈 이유·다음 잠금은 예전 길에서만');
  assert.ok(pa.includes("const kl = canTwin && r.answers.slice(0, r.at).every((x) => x && x.correct)") && pa.indexOf('const kl = canTwin') < iRel, '💪 칸 지킴 말은 두 길 모두');
  // 배움 한 장
  const rb = body(m, 'function relearnBox(q, shown, a, L, kl) {');
  assert.ok(rb.includes("'아쉬워요 — 괜찮아요. 배운 것 한 장만 보고 비슷한 문제로 다시 해 봐요.'") && rb.includes("'괜찮아요 — 배운 것 한 장만 보고 비슷한 문제로 해 봐요.'"));
  assert.ok(rb.includes('if (!Number.isInteger(a.rp) || a.rp < 0 || a.rp >= n) a.rp = relearnPage(q.q, L.pages);'), '닮은 장부터 · 다녀와도 보던 장');
  assert.ok(rb.includes("checkBlock(p.check, ((ui.round && ui.round.seed) || 0) + a.rp * 31, () => {}, '✋ 해 볼래요? (건너뛰어도 돼요)')"), '✋ 확인은 건너뛰어도 — 아무것도 잠그지 않는다');
  assert.ok(rb.includes("'◀ 앞 장'") && rb.includes("'다음 장 ▶'") && rb.includes('prev.disabled = a.rp === 0;') && rb.includes('fwd.disabled = a.rp === n - 1;'));
  assert.ok(rb.includes("const t = el('button', 'btn math-solve-toggle', '📖 방금 문제 풀이 보기');") && rb.includes('t.replaceWith(solveCard(q, shown));'), '방금 문제 풀이는 접어 두고 열면 그대로(한 줄씩 없이)');
  assert.ok(!/\$\{a\.rp \+ 1\} \/ \$\{n\}/.test(rb), '아이 화면에 몇 장 중 몇째를 안 띄운다');
  const ro = body(m, 'function relearnOf(q, r) {');
  assert.ok(ro.includes('const sx = stemOf(q.concept);') && ro.includes('const opts = optsFor(sx.key);'), '줄기는 문항의 칸에서');
  assert.ok(ro.includes('sx.gen.lessonOf(q.concept, r.seed || 0, opts)') && ro.includes('sx.gen.conceptStory(q.concept, r.seed || 0, opts)'), '배움이 없는 줄기(A 분수)는 📖 이야기 한 장');
  assert.ok(body(m, 'function checkBlock(').includes('box.appendChild(el(\'div\', \'math-solve-h\', title));'));
  // 비슷한 문제는 그 칸의 줄기로 (🤔 노트 회차 — Codex 108차 F)
  const tw = body(m, 'function startTwin() {');
  assert.ok(tw.includes('const sx = stemOf(q.concept) || S();') && tw.includes('sx.gen.makeQuestion(q.concept, q.kind, base + i * 7919, { ...optsFor(sx.key), want: { k: q.kind, key: q.key } });'));
  assert.ok(!tw.includes('G().makeQuestion') && !tw.includes('...optsFor(),'), '지금 줄기 만들기·원고를 안 쓴다');
  // 기록 · 화면 꾸밈 · sw
  assert.ok(m.includes("...(a.pf ? { pf: a.pf } : {}), ...(a.rl ? { rl: 1 } : {}), ...(Number.isInteger(a.s)"), 'extraQ — 개념 편·섞어 풀기 기록 모두 (⏱ s는 끝에 그대로 — usage272)');
  assert.ok(read('css/style.css').includes('.math-relearn-page {') && read('css/style.css').includes('.math-relearn-nav {'));
  assert.ok(+(/const CACHE_VERSION = 'v(\d+)';/.exec(read('sw.js')) || [])[1] >= 302, 'sw v302 이상');
});
