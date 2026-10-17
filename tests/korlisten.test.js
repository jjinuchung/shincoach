// 🎧 듣고 답하기 (v245, 2026-10-12 아버님 "이대로 진행") — 듣기 카드 원고 · 검사가 잡는 것 · 읽는 차례·빠르기·높낮이 ·
// 차례대로 읽기(멈춤·소리 없음·끝 알림 없음) · 🟩는 듣고 풀 때만 · 화면 연결(글 대신 듣기 상자 · 들어야 물음 · 다 푼 뒤 들은 글 · 떠나면 멈춤)
// 🔍 Codex 57차 — 끝 알림이 빠지면 "끝까지 들렸나요?" ✅ · 지난 음성이 사라지면 다시 찾음 · 끝·멈춤만 알림 칸 · 🎯 잡기 창이면 멈춤
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TYPES, LISTEN_KIND, LISTEN_LINES, LISTEN_LINE_MAX, isListen, speakerOf, checkCard, checkListen, checkContent, korFinishRule, KOR_STONE } from '../js/korean.js';
import { RATE, PITCH, GAP, SLOW_GAP, listenPlan, scriptRows, runPlan, neverStarted, listenNote, fullyHeard, unsure, listenAnnounce } from '../js/korlisten.js';
import { emptyProfile, cloneProfile } from '../js/db.js';
import { initProfile, flushProfile, reloadProfile, korFinish } from '../js/xp.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const DATA = JSON.parse(read('coach/korean/reading.json'));
const UNITS = JSON.parse(read('coach/korean/units.json'));
const LISTEN = DATA.cards.filter((c) => c.listen);
const card = (id) => DATA.cards.find((c) => c.id === id);
const clone = (x) => JSON.parse(JSON.stringify(x));
const CIRC = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';

test('🎧 원고: 듣기 카드 여섯(K36 대화 · K37 안내 방송 · K38 발표 · K39 토의 · K40 전화 메시지 · K41 이야기) · 연습 카드 · 물음 셋씩 · 근거 잡기·문장 번호·낱말·쓰기 없음 · 수는 한글로 · 옮긴 말은 들은 글 그대로', () => {
  assert.deepEqual(checkContent(DATA), []);
  assert.deepEqual(LISTEN.map((c) => [c.id, c.genre]), [['K36', '대화'], ['K37', '안내 방송'], ['K38', '발표'], ['K39', '토의'], ['K40', '전화 메시지'], ['K41', '이야기']]);
  assert.deepEqual(LISTEN.map((c) => c.listen.who), [['민재', '소라'], [], [], ['사회자', '하은', '지호', '서아'], [], []]);
  for (const c of LISTEN) {
    assert.ok(isListen(c) && c.kind === 'practice' && !c.pre && !c.words && !c.write && !c.stanzas, c.id);
    assert.equal(c.qs.length, 3, c.id);
    assert.ok(c.lines.length >= LISTEN_LINES.min && c.lines.length <= LISTEN_LINES.max, c.id);
    assert.ok(c.skill.startsWith('🎧 '), c.id);
    const all = c.lines.map((l) => speakerOf(c, l).text).join(' ');
    for (const line of c.lines) {
      const s = speakerOf(c, line);
      assert.ok(!/[0-9·()~/]/.test(s.text), `${c.id} 읽을 말에 숫자·기호: ${s.text}`);
      assert.ok([...s.text].length <= LISTEN_LINE_MAX, `${c.id} 긴 줄`);
      if (c.listen.who.length) assert.ok(c.listen.who.includes(s.who), `${c.id} 말하는 사람: ${line}`);
    }
    for (const q of c.qs) {
      assert.equal(q.ev, null, q.id);
      assert.ok(q.doneNote && !q.evQ && !q.evNote, q.id);
      assert.equal(q.opts.filter((o) => o.ok).length, 1, q.id);
      const said = [q.q, q.doneNote, ...q.opts.flatMap((o) => [o.t, o.why || ''])].join(' ');
      assert.ok(![...said].some((ch) => CIRC.includes(ch)), `${q.id} 문장 번호`);
      // 물음이 따옴표로 옮긴 말 = 들은 글 그대로 (끝 문장부호 빼고)
      for (const m of q.q.matchAll(/"([^"]+)"/g)) assert.ok(all.includes(m[1].replace(/[.?!]$/, '')), `${q.id} 옮긴 말: ${m[1]}`);
    }
  }
  // 대화·토의는 모든 사람이 한 번 이상 말한다 · 수는 한글로(여덟 시 사십 분 · 스물네 명)
  assert.ok(card('K37').lines.some((l) => l.includes('여덟 시 사십 분')) && card('K38').lines.some((l) => l.includes('스물네 명')));
  // 성취기준은 2022 교육과정 원문 그대로
  const STD = {
    '[6국01-01]': '[6국01-01] 대화에서 생략된 내용을 추론하며 듣는다.',
    '[6국01-03]': '[6국01-03] 주제와 관련하여 궁금한 내용을 질문하며 적극적으로 듣고 말한다.',
    '[6국01-05]': '[6국01-05] 자료를 선별하여 핵심 정보를 중심으로 내용을 구성하고 매체를 활용하여 발표한다.',
    '[6국01-06]': '[6국01-06] 토의에 협력적으로 참여하며 서로의 의견을 비교하고 조정한다.',
    '[4국01-01]': '[4국01-01] 중요한 내용과 주제를 파악하며 듣고 그 내용을 요약한다.',
    '[6국05-03]': '[6국05-03] 소설이나 극을 읽고 인물, 사건, 배경을 파악한다.',
    '[6국02-05]': '[6국02-05] 긍정적인 읽기 동기를 형성하고 적극적으로 읽기에 참여하는 태도를 기른다.',
  };
  const want = { K36: ['[6국01-01]'], K37: ['[4국01-01]'], K38: ['[6국01-05]', '[6국01-03]'], K39: ['[6국01-06]'], K40: ['[6국01-01]', '[4국01-01]'], K41: ['[6국05-03]', '[6국02-05]'] };
  for (const c of LISTEN) {
    const meta = c.meta.join(' · ');
    for (const code of want[c.id]) assert.ok(meta.includes(STD[code]), `${c.id} ${code}`);
    assert.deepEqual([...meta.matchAll(/\[\d국\d\d-\d\d\]/g)].map((m) => m[0]).sort(), [...want[c.id]].sort(), `${c.id} 성취기준은 이것만`);
  }
});

test('🎧 단원 지도: 5-1 1단원(K36·K40) · 3단원(K38) · 5단원(K39) · 5-2 독서(K41 오디오북처럼) · 1단원(K41) · 5단원(K39) — K37(3~4학년 성취기준)은 단원 지도 밖', () => {
  const of = (id) => UNITS.units.find((u) => u.id === id).cards;
  assert.deepEqual(of('5-1-1'), ['K1', 'K4', 'K36', 'K40', 'K86']); // v281 K86 문자 대화
  assert.deepEqual(of('5-1-3'), ['K13', 'K21', 'K38', 'K81', 'K88']); // v267 K81 발표 준비 모둠 대화 · v281 K88 발표 준비 메모
  assert.deepEqual(of('5-1-5'), ['K15', 'K23', 'K39', 'K63', 'K73']); // v261 K63 두 관점의 글 · v265 K73 성수동·인사동(문제 해결에 쓰기)
  assert.deepEqual(of('5-2-독서'), ['K16', 'K24', 'K41', 'K84', 'K90']); // v267 K84 여러 가지 모습의 책 · v281 K90 만화 과학책과 글책
  assert.deepEqual(of('5-2-1'), ['K7', 'K19', 'K31', 'K41', 'K48', 'K53', 'K71', 'K72']); // v254 「토끼전」 독서 모임 · 「흥부와 놀부」 · v261 옛이야기 둘
  assert.deepEqual(of('5-2-5'), ['K5', 'K15', 'K23', 'K39', 'K92']); // v281 K92 청소 구역 토의
  assert.ok(!UNITS.units.some((u) => u.cards.includes('K37')));
});

test('🎧 원고 검사가 잡는다 — 한 곳만 틀리게 바꾼 듣기 카드마다 그 오류 하나', () => {
  const one = (id, fix) => { const c = clone(card(id)); fix(c); return checkCard(c); };
  const cases = [
    ['근거 잡기', 'K36', (c) => { c.qs[0].ev = [1]; c.qs[0].evQ = 'x'; c.qs[0].evNote = 'x'; delete c.qs[0].doneNote; delete c.qs[0].hint2; }, /근거 잡기\(ev\) 없이/], // v258: 근거가 있으면 둘째 힌트는 없이
    ['물음에 문장 번호', 'K36', (c) => { c.qs[1].q = '② 소라는 왜 그랬나요?'; }, /문장 번호/],
    ['풀이에 문장 번호', 'K37', (c) => { c.qs[0].doneNote += ' ③을 보세요.'; }, /문장 번호/],
    ['보기 까닭에 문장 번호', 'K38', (c) => { c.qs[0].opts[0].why = '⑦에 있어요.'; }, /문장 번호/],
    ['낱말 풀이', 'K37', (c) => { c.words = [['강당', '모이는 큰 방']]; }, /words가 없어요/],
    ['쓰기', 'K41', (c) => { c.write = clone(card('K15').write); }, /write가 없어요/],
    ['미리보기', 'K41', (c) => { c.pre = '중학교'; }, /pre가 없어요/],
    ['명작', 'K41', (c) => { c.kind = 'classic'; c.author = 'x'; c.facts = [['저작권', 'x']]; }, /연습 카드\(practice\)만/],
    ['who 밖 이름', 'K36', (c) => { c.lines[2] = '준호: 그럼 내일은 어때?'; }, /who에 없는 이름/],
    ['이름 없는 줄', 'K39', (c) => { c.lines[3] = '저는 교실에서만 읽으면 좋겠습니다.'; }, /"이름: 말" 꼴이 아니거나/],
    ['한 사람 글에 이름', 'K37', (c) => { c.lines[1] = '교감: 현장 체험 학습은 다음 주 수요일입니다.'; }, /한 사람 글인데/],
    ['숫자', 'K37', (c) => { c.lines[3] = '그날 아침에는 강당으로 8시 40분까지 모여 주세요.'; }, /숫자·가운뎃점/],
    ['가운뎃점', 'K39', (c) => { c.lines[1] = '하은: 월·수·금요일에는 이름을 적으면 좋겠습니다.'; }, /숫자·가운뎃점/],
    ['괄호', 'K41', (c) => { c.lines[3] = '그런데 바람이 (한 점도) 불지 않았다.'; }, /숫자·가운뎃점/],
    ['긴 줄', 'K41', (c) => { c.lines[3] = '그런데 바람이 '.repeat(13); }, new RegExp(`${LISTEN_LINE_MAX}자까지`)],
    ['줄이 적음', 'K40', (c) => { c.lines = c.lines.slice(0, 5); }, /6~16줄/],
    ['말 안 한 사람', 'K36', (c) => { c.listen.who = ['민재', '소라', '준호']; }, /"준호"가 한 번도 말하지 않아요/],
    ['who 겹침', 'K36', (c) => { c.listen.who = ['민재', '민재']; }, /서로 다른 이름/],
    ['listen 다른 키', 'K37', (c) => { c.listen.rate = 0.5; }, /listen에는 who만/],
    ['listen이 객체가 아님', 'K37', (c) => { c.listen = true; }, /listen은 \{ who/],
  ];
  for (const [name, id, fix, re] of cases) {
    const errs = one(id, fix);
    assert.equal(errs.length, 1, `${name}: ${errs.join(' / ')}`);
    assert.match(errs[0], re, name);
  }
  // 듣기 카드가 아니면 검사하지 않는다 · checkListen 바로 부르기
  assert.deepEqual(checkCard(clone(card('K15'))), []);
  assert.deepEqual(checkListen(card('K36')), []);
});

test('🎧 읽는 차례: 줄마다 · 이름은 빼고 말만 · 사람마다 높낮이(who 차례) · 보통 0.9 · 🐢 0.7 · 줄 사이 쉼(사람이 바뀌면 길게, 🐢는 1.5배) · 들은 글은 이름과 함께', () => {
  assert.deepEqual(RATE, { normal: 0.9, slow: 0.7 });
  const k36 = card('K36');
  const p = listenPlan(k36);
  assert.equal(p.length, k36.lines.length);
  assert.deepEqual(p.slice(0, 3).map((x) => [x.i, x.who, x.rate, x.pitch, x.gap]), [[0, '민재', 0.9, PITCH[0], 0], [1, '소라', 0.9, PITCH[1], GAP.change], [2, '민재', 0.9, PITCH[0], GAP.change]]);
  assert.equal(p[0].text, '소라야, 오늘 수업 끝나고 놀이터에서 같이 줄넘기 연습할래?', '"민재: "는 읽지 않는다');
  const k39 = listenPlan(card('K39'));
  assert.deepEqual([...new Set(k39.map((x) => `${x.who}:${x.pitch}`))], ['사회자:1', `하은:${PITCH[1]}`, `지호:${PITCH[2]}`, `서아:${PITCH[3]}`], '네 사람 네 높낮이');
  assert.equal(new Set(PITCH).size, PITCH.length);
  assert.equal(k39[2].gap, GAP.same, '하은이 이어서 말하면 짧게');
  const slow = listenPlan(card('K37'), true);
  assert.ok(slow.every((x) => x.rate === 0.7 && x.pitch === PITCH[0] && x.who === ''), '한 사람 글은 보통 높이');
  assert.ok(slow.slice(1).every((x) => x.gap === Math.round(GAP.same * SLOW_GAP)), '한 사람 글은 줄 사이가 모두 짧은 쉼(🐢 1.5배)');
  assert.deepEqual(scriptRows(k36)[1], { who: '소라', text: '아, 나 오늘 피아노 학원 가는 날이야.' });
  assert.deepEqual(scriptRows(card('K41'))[5], { who: '', text: '"이럴 줄 알았으면 안 나올 걸 그랬어요." 서진이는 입을 삐죽 내밀었다.' });
  assert.deepEqual(speakerOf(card('K37'), '안내: 이름처럼 보여도'), { who: '', text: '안내: 이름처럼 보여도' }, 'who에 없는 이름은 가르지 않는다');
});

test('🎧 차례대로 읽기: 다 읽음 · 첫 줄부터 소리 없음 · 시작한 뒤 멈춤 · 끝 알림 없는 줄은 끝까지 가되 끝났는지 모름(✅ 물음) · 멈춤(alive) · 말 바꾸기 · 오류 던짐', async () => {
  const plan = listenPlan(card('K36'));
  const run = (fn, o = {}) => {
    const seen = [];
    return runPlan(plan, { say: fn, onLine: (x) => seen.push(x.i), wait: async () => {}, ...o }).then((r) => ({ r, seen }));
  };
  const ok = await run(async () => ({ ok: true, started: true }));
  assert.deepEqual(ok.r, { done: true, started: true, noend: 0 });
  assert.equal(ok.seen.length, plan.length);
  const silent = await run(async () => ({ ok: false, started: false, why: 'silent' }));
  assert.deepEqual(silent.r, { done: false, why: 'silent', at: 0, started: false, noend: 0 });
  assert.ok(neverStarted(silent.r));
  let n = 0;
  const mid = await run(async () => (++n < 3 ? { ok: true, started: true } : { ok: false, started: true, why: 'interrupted' }));
  assert.deepEqual(mid.r, { done: false, why: 'interrupted', at: 2, started: true, noend: 0 });
  assert.ok(!neverStarted(mid.r), '소리가 났던 기기 — 글로 읽기는 작게');
  const noend = await run(async () => ({ ok: false, started: true, why: 'noend' }));
  assert.deepEqual(noend.r, { done: true, started: true, noend: plan.length }, '시작만 하고 끝 알림이 없던 줄은 넘어간다');
  // Codex 57차 #1 — 끝 알림이 하나라도 빠졌으면 다 들었다고 하지 않는다(시작만 하고 잘렸을 수 있다)
  assert.equal(fullyHeard(ok.r), true);
  assert.deepEqual([fullyHeard(noend.r), unsure(noend.r)], [false, true], '끝 알림이 모두 없으면 끝났는지 모름');
  let m = 0;
  const oneMiss = await run(async () => (++m === 3 ? { ok: false, started: true, why: 'noend' } : { ok: true, started: true }));
  assert.deepEqual([oneMiss.r.done, oneMiss.r.noend, fullyHeard(oneMiss.r), unsure(oneMiss.r)], [true, 1, false, true], '한 줄만 빠져도');
  assert.deepEqual([unsure(ok.r), unsure(silent.r), unsure(null), fullyHeard(null), fullyHeard(silent.r)], [false, false, false, false, false]);
  let live = true;
  let k = 0;
  const stop = await run(async () => { if (++k === 4) live = false; return { ok: true, started: true }; }, { alive: () => live });
  assert.deepEqual(stop.r, { done: false, why: 'stop', at: 3, started: true, noend: 0 });
  assert.ok(!neverStarted(stop.r), '멈춘 것은 소리 없음이 아니다');
  const thrown = await run(async () => { throw new Error('boom'); });
  assert.deepEqual(thrown.r, { done: false, why: 'boom', at: 0, started: false, noend: 0 });
  // 상자 아래 말
  assert.equal(listenNote(null, false), '끝까지 들으면 물음이 나와요');
  assert.equal(listenNote(null, true), '');
  assert.equal(listenNote(ok.r, true), '');
  assert.match(listenNote(noend.r, false), /^끝났는지 확인하지 못했어요 — 끝까지 들렸나요\?/);
  assert.equal(listenNote(noend.r, true), '', '이미 들은 카드는 묻지 않는다');
  assert.match(listenNote(stop.r, false), /처음부터 끝까지 들으면 물음이 나와요/);
  assert.equal(listenNote(stop.r, true), '');
  assert.match(listenNote({ done: false, why: 'none', started: false }, false), /이 기기는 소리 내어 읽기를 못 해요/);
  assert.match(listenNote(silent.r, false), /소리가 시작되지 않았어요/);
  assert.match(listenNote(mid.r, false), /읽다가 멈췄어요 \(interrupted\)/);
  // 알림 칸(.kor-live)에 한 번 — 처음 다 들음 · 다시 다 들음 · 끝났는지 모름 · 멈춤 · 실패
  assert.equal(listenAnnounce(ok.r, true, true, 3), '다 들었어요 — 물음 3개가 나왔어요');
  assert.equal(listenAnnounce(ok.r, true, false, 3), '다 들었어요');
  assert.match(listenAnnounce(noend.r, false, false, 3), /^끝났는지 확인하지 못했어요/);
  assert.equal(listenAnnounce(noend.r, true, false, 3), '다 들었어요');
  assert.equal(listenAnnounce(stop.r, false), '멈췄어요');
  assert.match(listenAnnounce(silent.r, false), /소리가 시작되지 않았어요/);
  assert.equal(listenAnnounce(null, false), '');
});

// 가짜 브라우저 음성 — 말마다 시작 → ms 뒤 끝 · cancel이면 지금 말에 interrupted · mode 'error'면 시작 전 오류 · 'none'이면 음성 합성 없음 ·
// 'noend'면 시작하고 ms 뒤 말하기를 멈추지만 끝 알림이 없다(speaking으로만 안다) · 'voiceErr'면 시작 전 voice-unavailable · voices 음성 목록
function fakeSpeech({ mode = 'ok', ms = 3, voices = [{ lang: 'ko-KR', name: 'ko' }] } = {}) {
  const said = [];
  let cur = null;
  let timer = null;
  let cuts = 0; // 읽던 말을 끊은 수
  const synth = {
    speaking: false,
    getVoices: () => voices.map((v) => ({ ...v })), // 부를 때마다 새 객체 — 이름으로 같은 음성을 알아본다
    addEventListener() {}, removeEventListener() {},
    cancel() { synth.speaking = false; if (cur) { const u = cur; cur = null; cuts++; clearTimeout(timer); u.onerror({ error: 'interrupted' }); } },
    speak(u) {
      said.push({ text: u.text, rate: u.rate, pitch: u.pitch, voice: u.voice && u.voice.name });
      if (mode === 'error') { setTimeout(() => u.onerror({ error: 'synthesis-failed' }), 0); return; }
      if (mode === 'voiceErr') { setTimeout(() => u.onerror({ error: 'voice-unavailable' }), 0); return; }
      cur = u;
      setTimeout(() => { if (cur === u) { synth.speaking = true; u.onstart(); } }, 0);
      timer = setTimeout(() => { if (cur === u) { cur = null; synth.speaking = false; if (mode !== 'noend') u.onend(); } }, ms);
    },
  };
  function Utter(text) { this.text = text; }
  globalThis.window = mode === 'none' ? {} : { speechSynthesis: synth, SpeechSynthesisUtterance: Utter };
  return { said, cuts: () => cuts };
}
const until = async (f, ms = 3000) => { const t0 = Date.now(); while (!f()) { if (Date.now() - t0 > ms) throw new Error('기다림 초과'); await new Promise((r) => setTimeout(r, 2)); } };

test('🎧 화면 쪽 읽기(playListen): 처음 끝까지 들으면 heard · 한국어 음성으로 · 🐢 · ⏹ 멈추면 그 자리에서 그만(heard 아님) · 새로 누르면 앞 읽기는 그만 · 음성 합성이 없거나 소리가 시작되지 않으면 글로 읽기를 크게', async (t) => {
  const { playListen, haltListen, newListenState } = await import('../js/korlistenview.js');
  t.after(() => { delete globalThis.window; });
  const k40 = card('K40');
  const hooks = (o = {}) => { const h = { changes: 0, heard: 0, alive: () => true, onChange: () => { h.changes++; }, onHeard: () => { h.heard++; }, ...o }; return h; };
  // 처음 끝까지
  let fs = fakeSpeech();
  let ls = newListenState();
  let h = hooks();
  await playListen(k40, ls, false, h);
  assert.deepEqual([ls.heard, ls.playing, ls.res.done, h.heard], [true, false, true, 1]);
  assert.deepEqual(fs.said.map((x) => x.text), k40.lines);
  assert.ok(fs.said.every((x) => x.rate === RATE.normal && x.voice === 'ko'), '한국어 음성으로');
  // 🐢 다시 — heard는 그대로, onHeard는 다시 안 부름
  fs = fakeSpeech();
  await playListen(k40, ls, true, h);
  assert.ok(fs.said.every((x) => x.rate === RATE.slow) && h.heard === 1);
  // ⏹ 멈추기 — 셋째 줄에서
  fs = fakeSpeech({ ms: 15 });
  ls = newListenState();
  h = hooks();
  const p = playListen(k40, ls, false, h);
  await until(() => ls.at >= 2);
  assert.equal(haltListen(ls), true);
  assert.equal(fs.cuts(), 1, '읽던 말을 그 자리에서 끊는다(cancel)');
  await p;
  assert.deepEqual([ls.heard, ls.playing, ls.res.why, h.heard], [false, false, 'stop', 0]);
  const n = fs.said.length;
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(fs.said.length, n, '멈춘 뒤 다음 줄을 읽지 않는다');
  assert.equal(haltListen(ls), false, '읽는 중이 아니면 멈춘 것 없음');
  // 새로 누르면 — 앞 읽기는 상태를 건드리지 않는다
  fs = fakeSpeech({ ms: 5 });
  ls = newListenState();
  h = hooks();
  const a = playListen(k40, ls, false, h);
  await until(() => ls.at >= 1);
  const b = playListen(k40, ls, true, h);
  await a;
  assert.deepEqual([ls.playing, ls.slow, ls.res], [true, true, null], '앞 읽기가 그만둬도 새 읽기의 상태를 덮지 않는다');
  await b;
  assert.deepEqual([ls.heard, ls.slow, h.heard], [true, true, 1]);
  // 카드를 닫았다(alive 거짓) — 끝까지 가지 않고 heard 아님
  fs = fakeSpeech({ ms: 5 });
  ls = newListenState();
  let open = true;
  h = hooks({ alive: () => open });
  const c = playListen(k40, ls, false, h);
  await until(() => ls.at >= 1);
  open = false;
  await c;
  assert.equal(ls.heard, false);
  // 음성 합성 없음 · 시작 전 오류 → 글로 읽기를 크게
  fakeSpeech({ mode: 'none' });
  ls = newListenState();
  await playListen(k40, ls, false, hooks());
  assert.deepEqual([ls.heard, ls.res.why, neverStarted(ls.res)], [false, 'none', true]);
  fakeSpeech({ mode: 'error' });
  ls = newListenState();
  await playListen(k40, ls, false, hooks());
  assert.deepEqual([ls.heard, ls.res.why, neverStarted(ls.res)], [false, 'synthesis-failed', true]);
});

test('🎧 Codex 57차: 끝 알림 없이 끝난 줄은 기다리지 않고 다음 줄 · 다 가도 heard 아님 → ✅ 끝까지 들렸어요(confirmHeard)로만 · 끝 알림 한 번 · 지난 음성이 목록에서 사라지거나 voice-unavailable이면 다시 찾음', async (t) => {
  const { playListen, newListenState, confirmHeard, voiceListed } = await import('../js/korlistenview.js');
  t.after(() => { delete globalThis.window; });
  const tiny = { id: 'T1', lines: ['첫 줄이에요.', '둘째 줄이에요.'], listen: { who: [] }, qs: [{}, {}, {}] };
  const hooks = () => { const h = { heard: 0, ends: [], alive: () => true, onChange: () => {}, onHeard: () => { h.heard++; }, onEnd: (say) => { h.ends.push(say); } }; return h; };
  // 끝 알림 없는 기기 — speaking이 거짓이 되면 곧 다음 줄(전엔 줄마다 글자 수만큼 기다렸다)
  const fs = fakeSpeech({ mode: 'noend', ms: 5 });
  let ls = newListenState();
  let h = hooks();
  const t0 = Date.now();
  await playListen(tiny, ls, false, h);
  const took = Date.now() - t0;
  assert.ok(took < 3000, `기다리지 않는다 (${took}ms)`);
  assert.deepEqual(fs.said.map((x) => x.text), tiny.lines);
  assert.equal(fs.cuts(), 0, '이미 끝난 말은 끊지 않는다');
  assert.deepEqual([ls.heard, h.heard, ls.res.done, ls.res.noend, unsure(ls.res)], [false, 0, true, 2, true], '끝까지 갔지만 다 들었다고 하지 않는다');
  assert.equal(h.ends.length, 1);
  assert.match(h.ends[0], /^끝났는지 확인하지 못했어요 — 끝까지 들렸나요\?/);
  // ✅ 끝까지 들렸어요 — 한 번만 · 읽는 중이거나 끝까지 못 갔으면 안 됨
  assert.equal(confirmHeard({ ...newListenState(), res: { done: false, why: 'interrupted', started: true, noend: 1 } }), false);
  assert.equal(confirmHeard({ ...newListenState(), playing: true, res: ls.res }), false);
  assert.equal(confirmHeard({ ...newListenState(), res: { done: true, started: true, noend: 0 } }), false, '다 들었으면 확인할 것 없음');
  assert.equal(confirmHeard(null), false);
  assert.equal(confirmHeard(ls), true);
  assert.equal(ls.heard, true);
  assert.equal(confirmHeard(ls), false, '두 번은 아님');
  // 다 들음 — 끝 알림 "물음 N개"
  fakeSpeech();
  ls = newListenState();
  h = hooks();
  await playListen(tiny, ls, false, h);
  assert.deepEqual([ls.heard, h.heard, h.ends], [true, 1, ['다 들었어요 — 물음 3개가 나왔어요']]);
  // 지난 음성이 목록에서 사라졌다 → 지금 목록의 한국어 음성으로
  let f2 = fakeSpeech({ voices: [{ lang: 'ko-KR', name: 'ko' }] });
  await playListen(tiny, newListenState(), false, hooks());
  assert.equal(f2.said[0].voice, 'ko');
  f2 = fakeSpeech({ voices: [{ lang: 'en-US', name: 'en' }, { lang: 'ko-KR', name: 'ko2' }] });
  await playListen(tiny, newListenState(), false, hooks());
  assert.equal(f2.said[0].voice, 'ko2', '사라진 음성을 붙잡지 않는다');
  // 목록에는 있지만 voice-unavailable — 다음엔 다시 찾는다(목록 첫 한국어 음성)
  f2 = fakeSpeech({ mode: 'voiceErr', voices: [{ lang: 'ko-KR', name: 'ko3' }, { lang: 'ko-KR', name: 'ko2' }] });
  ls = newListenState();
  await playListen(tiny, ls, false, hooks());
  assert.deepEqual([f2.said[0].voice, ls.res.why], ['ko2', 'voice-unavailable'], '아직 목록에 있으니 지난 음성으로');
  f2 = fakeSpeech({ voices: [{ lang: 'ko-KR', name: 'ko3' }, { lang: 'ko-KR', name: 'ko2' }] });
  await playListen(tiny, newListenState(), false, hooks());
  assert.equal(f2.said[0].voice, 'ko3', 'voice-unavailable 뒤에는 다시 찾는다');
  assert.equal(voiceListed({ getVoices: () => [{ lang: 'ko-KR', name: 'a' }] }, { lang: 'ko-KR', name: 'a' }), true);
  assert.equal(voiceListed({ getVoices: () => [{ lang: 'ko-KR', name: 'a' }] }, null), false);
  assert.equal(voiceListed({ getVoices: () => { throw new Error('x'); } }, { name: 'a' }), false);
});

test('🎧 🟩는 듣고 풀 때만 — 글로 읽고 풀면(noStone) 별·💰·🎯는 같고 🟩 없음 · 저장 경로도 opts를 넘긴다', async () => {
  const ids = DATA.cards.map((c) => c.id);
  const now = new Date(2026, 9, 12, 12).getTime();
  const pf = () => cloneProfile({ ...emptyProfile(), coins: 0, coinsEarned: 0 });
  const a = pf();
  const ra = korFinishRule(a, 'K36', now, {}, ids, 0);
  const b = pf();
  const rb = korFinishRule(b, 'K36', now, {}, ids, 0, { noStone: true });
  assert.deepEqual([ra.star, ra.coins, ra.stone], [1, 12, 1]);
  assert.deepEqual([rb.star, rb.coins, rb.stone, rb.throws], [1, 12, 0, ra.throws]);
  assert.equal((a.items || {})[KOR_STONE], 1);
  assert.equal((b.items || {})[KOR_STONE], undefined);
  assert.deepEqual(a.korDone, b.korDone);
  // 진짜 저장 경로
  await initProfile();
  await flushProfile();
  fakeIdb.put('profile', { ...emptyProfile(), id: 'me', updatedAt: 1, coins: 0, coinsEarned: 0 });
  await reloadProfile();
  const r1 = await korFinish('K37', {}, ids, 0, { noStone: true });
  assert.deepEqual([r1.ok, r1.star, r1.stone], [true, 1, 0]);
  const r2 = await korFinish('K38', {}, ids, 0);
  assert.deepEqual([r2.ok, r2.star, r2.stone], [true, 1, 1]);
  assert.equal(fakeIdb.get('profile', 'me').items[KOR_STONE], 1);
});

test('🎧 힌트 말투: 듣고 풀면 "들은 말" (hintL — 여덟 가지 모두) · 글로 읽고 풀면 글 말투 · 도감 칸·끝 카드는 "들으면"', async () => {
  for (const [k, t] of Object.entries(TYPES)) assert.ok(t.hintL && t.hintL !== t.hint && !/글에|글을|글의/.test(t.hintL), k);
  const v = await import('../js/koreanview.js');
  const ls = { text: false };
  assert.equal(v.hintOf('make', { ls }), TYPES.make.hintL);
  assert.equal(v.hintOf('make', { ls: { text: true } }), TYPES.make.hint);
  assert.equal(v.hintOf('make', { ls: null }), TYPES.make.hint);
  assert.equal(v.statusOf({}, 'K36', Date.now(), true).text, '새 듣기 · 다 들으면 ★ 💰12');
  assert.equal(v.statusOf({}, 'K1', Date.now()).text, '새 글 · 다 읽으면 ★ 💰12');
  assert.match(v.finishText({ ok: true, star: 1, coins: 12, stone: 0, stars: 1 }, true).lines[1], /^내일 다시 들으면 ★★/);
  assert.equal(v.finishText({ ok: true, star: 0, wait: 'wait', next: 2, days: 1 }, true).title, '오늘도 잘 들었어요');
  assert.equal(v.finishText({ ok: true, star: 0, wait: 'full' }, true).title, '또 들어 줘서 고마워요');
  assert.equal(v.groupOf(card('K41')), 'listen');
  assert.equal(LISTEN_KIND, '🎧 듣기 카드');
});

test('🎧 화면 연결: 듣기 카드는 글 대신 듣기 상자 · 처음 끝까지 들어야 물음 · 📄 글로 읽기(🟩 없음) · 다 푼 뒤 📜 들은 글 · 카드·화면을 떠나거나 앱을 내리면 멈춤 · 도감 묶음 · 오프라인 목록 v245', () => {
  const view = read('js/koreanview.js');
  const body = (head) => { const i = view.indexOf(head); assert.ok(i >= 0, head); return view.slice(i, view.indexOf('\n}\n', i)); };
  assert.ok(body('function openCard(id) {').includes('ls: isListen(card) ? newListenState() : null,') && body('function openCard(id) {').includes('stopListening();'));
  assert.ok(body('function backToList() {').includes('haltListen(ui.read.ls)'));
  const rr = body('function renderRead() {');
  assert.ok(rr.includes('if (r.ls && !r.ls.text) body.appendChild(listenBoxEl(r.card, r.ls, listenAct));'), '글 대신 듣기 상자');
  assert.ok(rr.includes("el('p', 'kor-listen-textnote'"), '글로 읽을 때 🟩 안내');
  const rq = body('function renderQ() {');
  assert.ok(rq.indexOf('if (r.ls && !r.ls.heard && !r.ls.text) {') >= 0 && rq.indexOf('if (r.ls && !r.ls.heard && !r.ls.text) {') < rq.indexOf('const q = r.card.qs[r.qi];'), '들어야 물음');
  assert.ok(rq.indexOf('if (r.qi >= r.card.qs.length) {') < rq.indexOf('if (r.ls && !r.ls.heard'), '끝 카드는 그대로');
  assert.ok(rq.includes('const said = qFeedback(q, st, unit, r);') && body('export function qFeedback(q, st, unit, r) {').includes("return { cls: 'is-no', text: `🤔 ${hintOf(lastWrong.type, r)}` };"), '틀린 보기 힌트는 hintOf(🎧 말투) — 물음 아래 말은 qFeedback에서 (v273)');
  const fe = body('function finishEl() {');
  assert.ok(fe.includes('if (r.ls && !r.ls.text) box.appendChild(scriptEl(r.card));') && fe.includes('finishText(res, !!r.ls)'));
  assert.ok(view.includes("onHeard: () => { if (ui.read === r) { r.focus = 'head'; renderQ(); bringQ(); } }"), '들으면 물음이 나온다(화면 밖이면 데려온다)');
  // Codex 57차 — ✅ 끝까지 들렸어요 · 줄마다는 상자를 새로 그리지 않음 · 끝·멈춤은 알림 칸에 · 🎯 잡기 창이면 멈춤
  const heard = view.slice(view.indexOf('  heard: () => {'), view.indexOf('  },', view.indexOf('  heard: () => {')));
  assert.ok(heard.includes('if (!r || !r.ls || !confirmHeard(r.ls)) return;') && heard.includes('renderQ();') && heard.includes('bringQ();'));
  assert.ok(view.includes("onLine: () => { if (ui.read === r) tickListenBox(); },") && body('function tickListenBox() {').includes('if (!syncListenBox(box, r.card, r.ls)) refreshListenBox();'));
  assert.ok(view.includes("onEnd: (say) => { if (ui.read === r) sayLive(say); },") && body('function sayLive(text) {').includes("querySelector('#korean-main .kor-live')"));
  assert.ok(body('export async function runKorCatch() {').startsWith('export async function runKorCatch() {\n  leaveKorean();'), '🎯 잡기 창을 열기 전에 멈춘다');
  assert.ok(body('function bringQ() {').includes('top > window.innerHeight - 96'), '물음이 화면 아래 밖이어도');
  assert.ok(view.includes('alive: () => ui.read === r && koreanVisible(),'), '다른 카드·화면이면 그만');
  assert.ok(body('export function leaveKorean() {').includes('haltListen(r.ls)'));
  assert.ok(view.includes("document.addEventListener('visibilitychange', () => { if (document.hidden) leaveKorean(); else lastAct = Date.now(); });"), '앱을 내리면 멈춤 (v258: 돌아오면 ⏱️ 읽는 시계가 바로 센다)');
  const toText = view.slice(view.indexOf('  toText: () => {'), view.indexOf('};', view.indexOf('  toText: () => {')));
  assert.ok(toText.includes('haltListen(r.ls);') && toText.includes('r.ls.text = true;') && toText.includes('renderRead();'));
  const app = read('js/app.js');
  assert.ok(app.includes("if (name !== 'korean') leaveKorean();") && app.includes('import { initKorean, enterKorean, leaveKorean }'));
  // 화면 조각
  const lv = read('js/korlistenview.js');
  assert.ok(!/from '\.\/koreanview\.js'/.test(lv), '서로 import하지 않는다');
  assert.ok(lv.includes("const big = neverStarted(ls.res);"), '소리가 시작되지 않았으면 글로 읽기를 크게');
  assert.ok(lv.includes('const first = fullyHeard(res) && !ls.heard;') && lv.includes('if (first) { ls.heard = true; hooks.onHeard(); }'), '끝 알림이 다 왔을 때만 들은 것');
  assert.ok(lv.includes("yes.dataset.act = 'heard';") && lv.includes('if (!ls.heard && unsure(ls.res)) {'), '끝났는지 모르면 ✅ 단추');
  assert.ok(lv.includes('if (VOICE_GONE.has(res.why)) voiceP = null;'));
  // speakko — 읽는 말을 끝까지 붙잡아 둔다(크롬이 치우면 끝 알림이 안 온다)
  const sk = read('js/speakko.js');
  assert.ok(sk.includes('KEEP.add(u);') && sk.includes('if (u) KEEP.delete(u);'));
  // 오프라인 목록 · 판
  const sw = read('sw.js');
  assert.ok(+(/const CACHE_VERSION = 'v(\d+)';/.exec(sw) || [])[1] >= 245, 'sw 버전 v245 이상');
  assert.ok(sw.includes("'./js/korlisten.js',") && sw.includes("'./js/korlistenview.js',"));
  assert.ok(read('css/style.css').includes('.kor-listen {'));
});

test('🎧 Codex 57차 원고: K37-2 도시락은 "안 가져와도 됨"이지 틀린 것이 아니다(활동지를 빠뜨린 보기로) · K38-3 물음에 "아직 설명하지 않은 점" · 틀린 보기 종류 넷', () => {
  const q = (id) => DATA.cards.flatMap((c) => c.qs).find((x) => x.id === id);
  const opt = (id, t) => q(id).opts.find((o) => o.t === t);
  assert.ok(!q('K37-2').opts.some((o) => !o.ok && /도시락/.test(o.t)), '도시락을 챙긴 것을 틀렸다고 하지 않는다');
  assert.deepEqual([opt('K37-2', '물병과 필기도구만 챙겨 8시 40분까지 강당으로 간다').type, /활동지/.test(opt('K37-2', '물병과 필기도구만 챙겨 8시 40분까지 강당으로 간다').why)], ['detail', true]);
  assert.match(q('K37-2').doneNote, /도시락은 가져오지 않아도 된다고 했으니 챙기지 않아도 돼요/);
  assert.equal(q('K38-3').q, '발표에서 아직 설명하지 않은 점을 더 알아보려는 질문으로 가장 알맞은 것은 무엇인가요?');
  assert.equal(opt('K38-3', '쉬는 시간에 가장 많이 하는 일은 무엇인가요?').type, 'link');
  assert.match(opt('K38-3', '쉬는 시간에 가장 많이 하는 일은 무엇인가요?').why, /확인하는 질문도 좋지만/);
  assert.deepEqual([
    opt('K37-1', '이번 주 수요일').type,
    opt('K38-2', '보드게임을 하는 친구가 가장 많았다').type,
    opt('K40-1', '하준이가 전화를 받지 않아서').type,
    opt('K41-2', '바람이 부는 날에는 연을 날리면 안 된다').type,
  ], ['time', 'make', 'link', 'flip']);
});
