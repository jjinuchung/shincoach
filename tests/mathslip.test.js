// 🙈 노가다 탈출구 막기 4단계 (v251, 2026-10-13) — "실수"는 확인 대기: 같은 틀 쌍둥이를 맞혀야 노트·오개념에서 뺀다
//  · 새로 고른 실수는 sv(0 확인 전 · 1 쌍둥이를 맞힘)를 단다 — 면제는 sv 1일 때만, sv가 없는 옛 기록은 예전 뜻 그대로
//  · 쌍둥이가 없는 문제(③⭐·💎)·쌍둥이 전에 그만둠·쌍둥이를 틀림 → 노트에 남는다 · 점수·보상은 그대로
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  slipExempt, applyRound, applyQuit, applyNotesRound, applyMixRound, applySpecialRound, mathReportText, STEMS,
} from '../js/mathprog.js';
import { emptyMath } from '../js/db.js';

const T = '2026-10-13';
const ID = STEMS.fraction.list[0].id;
const read = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const TAG = '분모끼리 더함';
const wrong = (extra = {}) => ({ k: 'calc', ok: 0, key: 'K', tag: TAG, w: 's', ...extra });

test('🙈 slipExempt: 쌍둥이로 확인된 실수(sv 1)만 면제 · 확인 전(sv 0)은 틀린 것 · sv가 없는 옛 기록은 예전처럼 면제 · 맞힌 문항·다른 이유는 해당 없음', () => {
  assert.equal(slipExempt(wrong({ sv: 1 })), true);
  assert.equal(slipExempt(wrong({ sv: 0 })), false);
  assert.equal(slipExempt(wrong()), true, '옛 기록 — 소급하지 않는다');
  assert.equal(slipExempt(wrong({ ok: 1, sv: 1 })), false);
  assert.equal(slipExempt(wrong({ w: 'c', sv: 1 })), false);
  assert.equal(slipExempt(null), false);
});

test('🙈 개념 편(applyRound): 확인 전 실수는 노트·오개념에 남고, 확인된 실수는 안 남는다', () => {
  const run = (sv) => { const m = emptyMath(); applyRound(m, ID, { correct: 0, total: 1, missTags: [], qs: [wrong({ sv })], mode: 'learn' }, T); return m.concepts[ID]; };
  const pending = run(0);
  assert.deepEqual(pending.notes.map((n) => n.key), ['K']);
  assert.equal(pending.miss[TAG], 1);
  const ok = run(1);
  assert.deepEqual(ok.notes, []);
  assert.equal(ok.miss[TAG], undefined);
  assert.equal(ok.fails, 1, '점수는 그대로 — 원래 답은 틀린 것');
  const legacy = run(undefined);
  assert.deepEqual(legacy.notes, [], '옛 기록(sv 없음)은 예전처럼');
});

test('⏹ 그만둔 편(applyQuit): 쌍둥이 전에 나가 확인 전인 실수는 노트에 남는다 · 확인된 실수는 안 남는다', () => {
  const m = emptyMath();
  applyQuit(m, { rid: 1, id: ID, d: T, n: 3, qs: [wrong({ key: 'P', sv: 0 }), wrong({ key: 'V', sv: 1 })] }, T);
  assert.deepEqual(m.concepts[ID].notes.map((n) => n.key), ['P']);
});

test('🤔 노트 회차(applyNotesRound): 확인 전 실수는 또 틀린 것(또 틀림 +1·오늘로 미룸·오개념) · 확인된 실수는 노트를 그대로 둔다', () => {
  const setup = () => {
    const m = emptyMath();
    applyRound(m, ID, { correct: 0, total: 1, missTags: [], qs: [wrong({ w: 'c' })], mode: 'learn' }, '2026-10-10');
    return m;
  };
  const a = setup();
  applyNotesRound(a, [{ id: ID, ...wrong({ sv: 0 }) }], T);
  const na = a.concepts[ID].notes.find((n) => n.key === 'K');
  assert.deepEqual([na.again, na.d], [1, T]);
  assert.equal(a.miss[TAG], 1);
  const b = setup();
  applyNotesRound(b, [{ id: ID, ...wrong({ sv: 1 }) }], T);
  const nb = b.concepts[ID].notes.find((n) => n.key === 'K');
  assert.deepEqual([nb.again || 0, nb.d], [0, '2026-10-10'], '확인된 실수 — 노트는 그대로');
  assert.equal(b.miss[TAG], undefined);
});

test('🎲 섞어 풀기·💎 스페셜: 확인 전 실수는 오개념에 쌓이고 확인된 실수는 안 쌓인다 (💎는 쌍둥이가 없어 늘 확인 전)', () => {
  const mix = (sv) => {
    const m = emptyMath();
    applyRound(m, ID, { correct: 1, total: 1, missTags: [], qs: [{ k: 'calc', ok: 1 }], mode: 'learn' }, '2026-10-10');
    applyMixRound(m, [{ id: ID, ...wrong({ sv }) }], T);
    return m;
  };
  assert.equal(mix(0).miss[TAG], 1);
  assert.equal(mix(0).concepts[ID].notes.some((n) => n.key === 'K'), true);
  assert.equal(mix(1).miss[TAG], undefined);
  assert.equal(mix(1).concepts[ID].notes.some((n) => n.key === 'K'), false);
  const sp = emptyMath();
  applySpecialRound(sp, [{ kind: 'findok', ok: false, tag: TAG, w: 's', sv: 0 }, { kind: 'findok', ok: false, tag: TAG, w: 'c' }], T);
  assert.equal(sp.miss[TAG], 2);
  // Codex 63차 #1: 💎 일지도 실수·확인 표시를 남긴다 — 📊가 {실수✗}로 보여 줄 수 있게
  assert.deepEqual(sp.log.at(-1).qs.map((q) => [q.w, q.sv]), [['s', 0], ['c', undefined]]);
  assert.ok(mathReportText(sp, T).includes('{실수✗}'));
});

test('📊 일지·기록 글: 실수에 확인 표시 — {실수✓} 확인됨 · {실수✗} 확인 안 됨 · 옛 기록은 {실수}', () => {
  const m = emptyMath();
  applyRound(m, ID, { correct: 0, total: 3, missTags: [], qs: [wrong({ key: 'A', sv: 1 }), wrong({ key: 'B', sv: 0 }), wrong({ key: 'C' })], mode: 'learn' }, T);
  assert.deepEqual(m.log.at(-1).qs.map((q) => q.sv), [1, 0, undefined]);
  const txt = mathReportText(m, T);
  assert.ok(txt.includes('{실수✓}') && txt.includes('{실수✗}') && txt.includes('{실수}'), txt);
});

test('🙈 화면 배선(math.js): 고를 때 확인 대기(sv 0, 이름표 그대로) · 쌍둥이를 맞히면 sv 1 + 이름표 거둠 · 틀리면 sv 0 · 쌍둥이 유무에 맞춘 말 · 일지에 sv · ❓ 후보는 확인된 실수만 뺀다', () => {
  const src = read('js/math.js');
  const fn = (name) => { const i = src.indexOf(`function ${name}(`); assert.ok(i >= 0, name); return src.slice(i, src.indexOf('\n}\n', i)); };
  const wb = fn('whyBlock');
  assert.ok(wb.includes("if (code === 's') a.sv = 0; else delete a.sv;"), '실수는 확인 대기');
  assert.ok(!wb.includes('missTags'), '고를 때는 오개념 이름표를 거두지 않는다');
  assert.ok(wb.includes("`🙈 왜 틀렸을까요? 솔직하게 골라요${SLIP_HEAD[way] || ''}`"));
  assert.ok(src.includes("const SLIP_HEAD = { twin: ' — 실수라면 비슷한 문제로 확인해요', twinNote: ' — 실수라면 비슷한 문제로 확인해요', note: ' — 실수여도 노트에 남겨 다음에 다시 물어볼게요', log: '' };"), '💎(log)는 노트를 약속하지 않는다 (Codex 63차 #4)');
  assert.ok(wb.includes('box.replaceWith(whyPicked(a, way));') && wb.includes('saveLive();'));
  assert.ok(src.includes("a.w === 's' ? (SLIP_SAID[way] || SLIP_SAID.twin) : (WHY_SAID[a.w] || '')"));
  assert.ok(src.includes("twin: '🙈 실수라고 했어요 — 비슷한 문제를 맞히면 오답 노트에 안 남겨요.'") && src.includes("twinNote: '🙈 실수라고 했어요 — 비슷한 문제로 확인해 봐요.'"));
  assert.ok(src.includes("note: '🙈 실수라고 했어요 — 이 문제는 비슷한 문제가 없어서 노트에 남겨 두고 다음에 다시 물어볼게요.'") && src.includes("log: '🙈 실수라고 했어요 — 이번 답은 기록에 남겨 둘게요. 풀이를 한 번 더 읽어 봐요.'"));
  const sw = fn('slipWayOf');
  assert.ok(sw.includes("if (canTwin) return q.fromNote ? 'twinNote' : 'twin';") && sw.includes("return r.mode === 'special' || !q.key ? 'log' : 'note';"), '쌍둥이 → 노트 문제 → 💎·틀 없음 순');
  const pa = fn('paintAnswer');
  assert.ok(pa.includes('const way = slipWayOf(r, q, canTwin);') && pa.includes('slot.appendChild(whyPicked(a, way));') && pa.includes('if (offer) next.before(offer); }, way));'), '실수를 어떻게 확인하나(way)를 넘긴다');
  assert.ok(fn('askOffer').includes("(a.w === 's' && a.sv !== 0)"), '❓ 문제 아래 단추: 확인 전 실수는 그대로 (Codex 63차 #2 — 노트 회차는 결과 카드에 ❓가 없다)');
  const at = fn('answerTwin');
  assert.ok(at.includes("if (a && a.w === 's') {\n    a.sv = ch.ok ? 1 : 0;\n    if (ch.ok && a.tag) { const k = r.missTags.lastIndexOf(a.tag); if (k >= 0) r.missTags.splice(k, 1); }\n  }"));
  assert.ok(at.indexOf('a.sv = ch.ok ? 1 : 0;') < at.indexOf('saveLive();'), '확인 결과를 적은 뒤에 저장');
  const pt = fn('paintTwin');
  assert.ok(pt.includes("const slip = (r.answers[t.of] || {}).w === 's';"), '원래 문항에서 실수라고 했는지로 말을 고른다');
  assert.ok(pt.includes("const noteQ = !!(r.qs[t.of] && r.qs[t.of].fromNote);"));
  assert.ok(pt.includes("noteQ ? `🙈 확인 문제를 맞혔어요! ⚡+${REWARD.fix.xp} — 이번에는 '또 틀림'으로 세지 않아요` : `🙈 확인 문제를 맞혔어요! ⚡+${REWARD.fix.xp} — 실수로 보고 오답 노트에 안 남겨요`"), '노트 문제는 노트가 남는다 (Codex 63차 #4)');
  assert.ok(pt.includes("slip ? slipOk :") && pt.includes("slip ? '🙈 확인 문제도 틀렸어요 — 노트에 남겨 두고 다음에 다시 풀어 봐요. 풀이를 한 번 더 읽어요.'"), '결과만 말하고 마음은 넘겨짚지 않는다');
  assert.ok(src.includes("...(a.w === 's' && a.sv !== undefined ? { sv: a.sv ? 1 : 0 } : {}),"), 'extraQ가 확인 표시를 넘긴다 — 개념 편·노트·섞어·💎·푸는 중 기록 모두');
  assert.ok(src.includes("x.a && !x.a.correct && !(x.a.w === 's' && x.a.sv !== 0) && !x.a.asked"), '❓ 결과 카드 후보: 확인 못 한 실수는 넣는다');
  assert.ok(+(/const CACHE_VERSION = 'v(\d+)';/.exec(read('sw.js')) || [])[1] >= 251, 'sw v251 이상');
});
