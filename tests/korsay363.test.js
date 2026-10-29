// 📚 국어 v363 (2026-10-29 아버님 "이대로"): 📍 근거 줄 읽어 주기 — 답을 고르기 전에 근거를 찾으면(📍 근거부터 · 🔍 두 번 틀려 근거 먼저)
// 칠한 근거(글 차례)와 물음을 🔊 한 번 읽은 뒤 보기가 열린다 · 보기·잘못 누른 줄은 읽지 않는다 · 🔊 다시 듣기(잠그지 않음) ·
// 소리가 안 나면(읽기 없음·한국어 음성 없음·3초 안에 시작 안 함) 바로 연다 · 별·💰·🎯·🟩 그대로 · 📤 근거부터 줄에 u(끝까지 들었나)
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validCards, gateAtOf, lineText, readOf, readsOf, mergeReads, dayNum } from '../js/korean.js';
import { RATE, PITCH, EV_SAY_GAP, sayText, evSayPlan, fullyHeard } from '../js/korlisten.js';
import { readLines } from '../js/korreport.js';

void fakeIdb;
const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const DATA = JSON.parse(read('coach/korean/reading.json'));
const CARDS = validCards(DATA);
const card = (id) => CARDS.find((c) => c.id === id);
const hasEv = (q) => Array.isArray(q.ev) && q.ev.length > 0;
const T0 = new Date(2026, 9, 29, 12, 0, 0).getTime();
const D0 = dayNum(T0);

test('🔊 소리로 읽을 글 (sayText, 순수): 줄 번호 → "N번" · 범위 · 가운뎃점으로 이은 번호 · ㉠ → ㄱ · 화살표·줄표·띄운 빗금은 쉼표 · 낫표·대괄호는 떼고 안의 글만', () => {
  assert.equal(sayText('⑦처럼 펭귄들이 자리를 바꾸는 까닭은?'), '7번처럼 펭귄들이 자리를 바꾸는 까닭은?');
  assert.equal(sayText('①~③ 「하여가」에서 말하는 이가 바라는 것은?'), '1번부터 3번까지 하여가에서 말하는 이가 바라는 것은?');
  assert.equal(sayText('⑬ ~ ⑮에서'), '13번부터 15번까지에서');
  assert.equal(sayText('⑪·⑫에서 말하는 이가'), '11번, 12번에서 말하는 이가');
  assert.equal(sayText('발표는 표준어로 하고(⑩), 할머니 말은(⑪)'), '발표는 표준어로 하고(10번), 할머니 말은(11번)');
  assert.equal(sayText('⑳'), '20번');
  assert.equal(sayText('모은 자료 ㉣ — 자전거 바퀴'), '모은 자료 ㄹ, 자전거 바퀴');
  assert.equal(sayText('손바닥 → 손등 → 손가락 사이'), '손바닥, 손등, 손가락 사이');
  assert.equal(sayText("'하루 종일 글씨를 공부하여도 / 짹 자 한 자밖에는'"), "'하루 종일 글씨를 공부하여도, 짹 자 한 자밖에는'");
  assert.equal(sayText('3/4쯤'), '3/4쯤', '띄우지 않은 빗금(분수)은 그대로');
  assert.equal(sayText("첫째 결과는 '[광고] 겨울에도 쑥쑥!'였다."), "첫째 결과는 '광고 겨울에도 쑥쑥!'였다.");
  assert.equal(sayText('『곤충 기르기』라는 책'), '곤충 기르기라는 책');
  assert.equal(sayText('점(·)으로, 평평한 땅은 ㅡ로'), '점(·)으로, 평평한 땅은 ㅡ로', '번호 사이가 아닌 가운뎃점·자모는 그대로');
  assert.equal(sayText('  두   칸  '), '두 칸');
  for (const bad of [null, undefined, '']) assert.equal(sayText(bad), '');
  assert.equal(sayText(7), '7');
});

test('🔊 읽을 차례 (evSayPlan, 순수): K1 근거부터 — 칠한 근거 ②·④(글 차례) → 물음 · 줄 번호(물음은 0) · 쉼 · 🎧 보통 빠르기 · 보기는 없음', () => {
  const k1 = card('K1');
  const q = k1.qs[gateAtOf(k1, 1)];
  assert.deepEqual(q.ev, [2, 4]);
  const plan = evSayPlan(k1, q);
  assert.deepEqual(plan.map((p) => p.i), [2, 4, 0]);
  assert.deepEqual(plan.map((p) => p.text), [lineText(k1, 2), lineText(k1, 4), q.q]);
  assert.deepEqual(plan.map((p) => p.gap), [0, EV_SAY_GAP.line, EV_SAY_GAP.ask]);
  assert.ok(plan.every((p) => p.rate === RATE.normal && p.pitch === PITCH[0] && p.who === ''), '🎧 보통 빠르기 · 보통 높이');
  for (const o of q.opts) assert.ok(!plan.some((p) => p.text.includes(o.t)), `보기는 읽지 않는다 — ${o.t}`);
  // 근거가 뒤섞여·겹쳐·글 밖 번호로 와도 글 차례로 한 번씩
  const mixed = evSayPlan(k1, { ...q, ev: [4, 2, 4, 0, 99, 2.5, '3', -1] });
  assert.deepEqual(mixed.map((p) => p.i), [2, 4, 0]);
  // 시(줄) — 연을 넘어 센 줄 번호
  const k3 = card('K3');
  const q3 = k3.qs[gateAtOf(k3, 1)];
  assert.ok(Array.isArray(k3.stanzas) && hasEv(q3));
  assert.deepEqual(evSayPlan(k3, q3).map((p) => p.text).slice(0, -1), q3.ev.slice().sort((a, b) => a - b).map((n) => sayText(lineText(k3, n))));
  // 읽을 근거가 없으면 아무것도 읽지 않는다(물음만 읽지 않는다)
  for (const ev of [null, undefined, [], [0, 99], 'x']) assert.deepEqual(evSayPlan(k1, { ...q, ev }), [], JSON.stringify(ev));
  assert.deepEqual(evSayPlan(null, q), []);
  assert.deepEqual(evSayPlan(k1, null), []);
  assert.deepEqual(evSayPlan(k1, { ...q, q: '' }).map((p) => p.i), [2, 4], '물음 글이 비면 근거만');
});

test('🔊 원고 전체: 근거가 있는 물음마다 근거 줄(하나 이상)과 물음이 비지 않고 · 읽는 글에 번호 기호·낫표·화살표가 남지 않는다 · 근거부터 물음 거의 넷 중 셋은 근거가 둘 이상', () => {
  let all = 0;
  let gated = 0;
  let multi = 0;
  for (const c of CARDS) {
    const gi = gateAtOf(c, 1);
    c.qs.forEach((q, i) => {
      if (!hasEv(q)) return;
      all++;
      const plan = evSayPlan(c, q);
      assert.ok(plan.length >= 2 && plan.at(-1).i === 0, `${c.id}-${i + 1} 근거와 물음`);
      assert.equal(plan.length - 1, new Set(q.ev).size, `${c.id}-${i + 1} 근거 줄마다 한 번`);
      for (const p of plan) {
        assert.ok(p.text.length > 0, `${c.id}-${i + 1} 빈 글`);
        assert.ok(!/[①-⑳㉠-㉭「」『』→—[\]]/.test(p.text), `${c.id}-${i + 1} 남은 기호: ${p.text}`);
      }
      if (i === gi) { gated++; if (new Set(q.ev).size > 1) multi++; }
    });
  }
  assert.ok(all >= 400, `근거 물음 ${all}`);
  assert.ok(gated >= 140, `근거부터 물음 ${gated}`);
  assert.ok(multi / gated > 0.6, `근거가 둘 이상 ${multi}/${gated}`);
});

// 가짜 브라우저 음성 (korlisten.test.js와 같은 꼴) — 말마다 시작 → ms 뒤 끝 · cancel이면 지금 말에 interrupted · 'error' 시작 전 오류 · 'none' 음성 합성 없음 ·
// 'silent' 시작도 끝도 없음(speaking도 거짓 — 소리가 안 나는 기기) · events 창에 보낸 알림
function fakeSpeech({ mode = 'ok', ms = 3, voices = [{ lang: 'ko-KR', name: 'ko' }] } = {}) {
  const said = [];
  const events = [];
  let cur = null;
  let timer = null;
  let cuts = 0;
  const synth = {
    speaking: false,
    getVoices: () => voices.map((v) => ({ ...v })),
    addEventListener() {}, removeEventListener() {},
    cancel() { synth.speaking = false; if (cur) { const u = cur; cur = null; cuts++; clearTimeout(timer); u.onerror({ error: 'interrupted' }); } },
    speak(u) {
      said.push({ text: u.text, rate: u.rate, voice: u.voice && u.voice.name, lang: u.lang });
      if (mode === 'error') { setTimeout(() => u.onerror({ error: 'synthesis-failed' }), 0); return; }
      if (mode === 'silent') return;
      cur = u;
      setTimeout(() => { if (cur === u) { synth.speaking = true; u.onstart(); } }, 0);
      timer = setTimeout(() => { if (cur === u) { cur = null; synth.speaking = false; u.onend(); } }, ms);
    },
  };
  function Utter(text) { this.text = text; }
  globalThis.window = mode === 'none' ? {} : { speechSynthesis: synth, SpeechSynthesisUtterance: Utter, dispatchEvent: (e) => { events.push(e.type); return true; } };
  return { said, events, cuts: () => cuts };
}
const until = async (f, ms = 3000) => { const t0 = Date.now(); while (!f()) { if (Date.now() - t0 > ms) throw new Error('기다림 초과'); await new Promise((r) => setTimeout(r, 2)); } };

test('🔊 화면 쪽 읽기 (playEvSay): 근거 → 물음을 한국어 음성으로 · 🌿 음악에 먼저 알림 · 줄마다 onLine · 끝까지면 fullyHeard', async (t) => {
  const { playEvSay, sayReady } = await import('../js/korlistenview.js');
  t.after(() => { delete globalThis.window; });
  const k1 = card('K1');
  const q = k1.qs[gateAtOf(k1, 1)];
  const fs = fakeSpeech();
  assert.equal(sayReady(), true);
  const lines = [];
  const res = await playEvSay(k1, q, { alive: () => true, onLine: (p) => lines.push(p.i) });
  assert.deepEqual(fs.said.map((x) => x.text), evSayPlan(k1, q).map((p) => p.text));
  assert.ok(fs.said.every((x) => x.voice === 'ko' && x.lang === 'ko-KR' && x.rate === RATE.normal), '한국어 음성 · 보통 빠르기');
  assert.deepEqual(lines, [2, 4, 0]);
  assert.deepEqual(fs.events, ['shincoach:ttsstart'], '🌿 잔잔한 음악이 먼저 빠지게');
  assert.equal(fullyHeard(res), true);
});

test('🔊 소리가 안 날 때 (playEvSay): 읽기 없음·읽을 근거 없음은 바로 · 한국어 음성이 목록에 없으면 읽지 않음 · 시작 전 오류 · 시작하지 않으면 3초 남짓에 그만 — 모두 fullyHeard 아님', async (t) => {
  const { playEvSay, sayReady, EV_SAY_START_MS } = await import('../js/korlistenview.js');
  t.after(() => { delete globalThis.window; });
  const k1 = card('K1');
  const q = k1.qs[gateAtOf(k1, 1)];
  assert.equal(EV_SAY_START_MS, 3000);
  fakeSpeech({ mode: 'none' });
  assert.equal(sayReady(), false, '읽기가 없는 기기 — 화면은 보기를 잠그지 않는다');
  let t0 = Date.now();
  let res = await playEvSay(k1, q, {});
  assert.deepEqual([res.why, res.started, fullyHeard(res)], ['none', false, false]);
  assert.ok(Date.now() - t0 < 100, '기다리지 않는다');
  let fs = fakeSpeech();
  res = await playEvSay(k1, { ...q, ev: [] }, {});
  assert.deepEqual([res.why, fs.said.length, fs.events.length], ['none', 0, 0], '읽을 근거가 없으면 아무 소리도');
  fs = fakeSpeech({ voices: [{ lang: 'en-US', name: 'en' }] });
  res = await playEvSay(k1, q, {});
  assert.deepEqual([res.why, fs.said.length], ['none', 0], '영어 목소리로 한국어를 읽지 않는다');
  fs = fakeSpeech({ mode: 'error' });
  res = await playEvSay(k1, q, {});
  assert.deepEqual([res.done, res.why, res.started, fs.said.length], [false, 'synthesis-failed', false, 1], '첫 줄에서 그만');
  fs = fakeSpeech({ mode: 'silent' });
  t0 = Date.now();
  res = await playEvSay(k1, q, {});
  const took = Date.now() - t0;
  assert.deepEqual([res.done, res.why, res.started, fs.said.length], [false, 'silent', false, 1]);
  assert.ok(took >= EV_SAY_START_MS && took < EV_SAY_START_MS + 1500, `시작 기다림은 3초 남짓 (${took}ms — 🎧 듣기의 6초보다 짧게)`);
});

test('🔊 그만두기 (playEvSay): 물음이 바뀜(alive 거짓)·stopEvSay면 그 자리에서 · 다시 듣기를 거듭 누르면 앞 읽기는 그만 · stopEvSay는 🎧 듣기 읽기를 건드리지 않는다', async (t) => {
  const { playEvSay, stopEvSay, playListen, newListenState } = await import('../js/korlistenview.js');
  t.after(() => { delete globalThis.window; });
  const k1 = card('K1');
  const q = k1.qs[gateAtOf(k1, 1)];
  // 물음이 바뀌었다
  let fs = fakeSpeech({ ms: 20 });
  let alive = true;
  const lines = [];
  let p = playEvSay(k1, q, { alive: () => alive, onLine: (x) => lines.push(x.i) });
  await until(() => lines.length >= 1);
  alive = false;
  let res = await p;
  assert.equal(res.why, 'stop');
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(fs.said.length, 1, '다음 줄을 읽지 않는다');
  // 보기를 골랐다 — stopEvSay는 읽던 말을 끊는다
  fs = fakeSpeech({ ms: 40 });
  p = playEvSay(k1, q, {});
  await until(() => fs.said.length >= 1);
  await new Promise((r) => setTimeout(r, 5));
  stopEvSay();
  res = await p;
  assert.deepEqual([res.why, fs.cuts()], ['stop', 1]);
  // 다시 듣기를 거듭 — 앞 읽기는 그만, 뒤 읽기는 끝까지
  fs = fakeSpeech({ ms: 10 });
  const a = playEvSay(k1, q, {});
  await until(() => fs.said.length >= 1);
  const b = playEvSay(k1, q, {});
  assert.equal((await a).why, 'stop');
  assert.equal(fullyHeard(await b), true);
  // 🎧 듣기 읽기가 이어받았으면 stopEvSay는 아무것도 안 한다
  fs = fakeSpeech({ ms: 5 });
  await playEvSay(k1, q, {});
  const k40 = card('K40');
  const ls = newListenState();
  const lp = playListen(k40, ls, false, { alive: () => true, onChange: () => {}, onHeard: () => {} });
  await until(() => ls.at >= 1);
  stopEvSay();
  await lp;
  assert.equal(ls.heard, true, '🎧 듣기는 끝까지');
});

test('🔊 Codex 167차: 끊은 알림이 늦게 오는 기기에서 다시 듣기 — 앞 읽기는 새 읽기가 시작된 뒤에야 끝나도 「그만」 · 새 읽기는 끊기지 않고 끝까지 · 준비 0.25초 사이에 앱을 내리면 소리 0번', async (t) => {
  const { playEvSay, TTS_LEAD_MS } = await import('../js/korlistenview.js');
  t.after(() => { delete globalThis.window; });
  const k1 = card('K1');
  const q = k1.qs[gateAtOf(k1, 1)];
  const plan = evSayPlan(k1, q);
  // 끊긴 말의 오류 알림이 늦다(새 읽기의 첫 줄보다 뒤 · 그동안 speaking도 참) — 테두리는 화면 쪽 읽기 번호(sayTok)가 지킨다
  let late = 0;
  let cur = null;
  const synth = {
    speaking: false,
    getVoices: () => [{ lang: 'ko-KR', name: 'ko' }],
    addEventListener() {}, removeEventListener() {},
    cancel() { if (!cur) return; const u = cur; cur = null; late++; setTimeout(() => u.onerror({ error: 'interrupted' }), TTS_LEAD_MS + 150); },
    speak(u) {
      cur = u;
      setTimeout(() => { if (cur === u) { synth.speaking = true; u.onstart(); } }, 0);
      setTimeout(() => { if (cur === u) { cur = null; synth.speaking = false; u.onend(); } }, 15);
    },
  };
  globalThis.window = { speechSynthesis: synth, SpeechSynthesisUtterance: function Utter(text) { this.text = text; } };
  const order = [];
  const a = playEvSay(k1, q, { onLine: (p) => order.push(`a${p.i}`) }).then((res) => { order.push('a끝'); return res; });
  await until(() => order.length >= 1 && synth.speaking);
  const b = playEvSay(k1, q, { onLine: (p) => order.push(`b${p.i}`) });
  const [ra, rb] = await Promise.all([a, b]);
  assert.equal(late, 1, '읽던 말을 끊었다');
  assert.equal(ra.why, 'stop');
  assert.ok(order.indexOf('a끝') > order.indexOf('b2'), `앞 읽기는 새 읽기의 첫 줄 뒤에 끝났다 (${order.join(' ')})`);
  assert.equal(fullyHeard(rb), true, '새 읽기는 끝까지');
  assert.deepEqual(order.filter((x) => x.startsWith('b')), plan.map((p) => `b${p.i}`));
  // 준비(TTS_LEAD_MS) 사이에 앱을 내렸다 — 한 마디도 안 하고 그만
  const fs2 = fakeSpeech();
  let alive = true;
  const c = playEvSay(k1, q, { alive: () => alive });
  setTimeout(() => { alive = false; }, Math.floor(TTS_LEAD_MS / 2));
  const rc = await c;
  assert.deepEqual([rc.why, rc.started, fs2.said.length, fullyHeard(rc)], ['stop', false, 0, false]);
});

test('🔍 물음 아래 말 (qFeedback): 🔊 읽는 중은 파란 안내 「찾은 문장을 읽어 줄게요」(시는 줄) · 셈 말 없이 · 맞힘이 먼저 · 읽는 중엔 「찾았어요!」 대신', async () => {
  const { qFeedback } = await import('../js/koreanview.js');
  const q = { ev: [3, 5], opts: [{ ok: true, t: '맞음' }, { ok: false, type: 'detail', t: '틀림1' }, { ok: false, type: 'make', t: '틀림2' }, { ok: false, type: 'detail', t: '틀림3' }] };
  const st = (o) => ({ wrong: [], answered: false, evDone: false, evWrong: [], evFirst: false, hint2: false, sayOn: false, said: -1, gate: false, from: -1, evAt: -1, wrongAtEv: -1, ...o });
  const r = { ls: null };
  const found = { gate: true, evFirst: true, evDone: true, wrongAtEv: 0 };
  assert.deepEqual(qFeedback(q, st({ ...found, sayOn: true }), '문장', r), { cls: 'is-say', text: '🔊 찾은 문장을 읽어 줄게요. 다 들으면 보기가 열려요.' });
  assert.equal(qFeedback(q, st({ ...found, sayOn: true }), '줄', r).text, '🔊 찾은 줄을 읽어 줄게요. 다 들으면 보기가 열려요.');
  assert.ok(!/\d/.test(qFeedback(q, st({ ...found, sayOn: true }), '문장', r).text), '수가 없다');
  assert.equal(qFeedback(q, st({ wrong: [1, 2], evFirst: true, evDone: true, wrongAtEv: 2, sayOn: true }), '문장', r).cls, 'is-say', '두 번 틀려 근거 먼저로 찾았을 때도');
  assert.equal(qFeedback(q, st({ ...found, sayOn: true, answered: true }), '문장', r).cls, 'is-ok', '맞힘이 먼저');
  assert.equal(qFeedback(q, st(found), '문장', r).text, '찾았어요! 칠한 문장(③, ⑤)을 다시 읽고 보기에서 골라 봐요.', '다 들은 뒤는 예전 말');
});

test('📤 u (readLog): 근거부터 물음의 첫 읽기가 끝까지면 1 · 아니면 0 · 안 읽었으면(-1 · 읽기가 없는 기기) 없음 · 근거부터가 아닌 물음의 읽기는 안 적는다', async () => {
  const { readLog } = await import('../js/koreanview.js');
  const cardX = { qs: [{ opts: [1, 2, 3, 4] }, { opts: [1, 2, 3, 4] }] };
  const st = (o) => ({ wrong: [], answered: true, evDone: true, evWrong: [], evFirst: false, hint2: false, sayOn: false, said: -1, gate: false, from: -1, evAt: -1, wrongAtEv: -1, ...o });
  const r = (gate, other) => ({ card: cardX, t0: 5000, sec: 200, firstSec: 60, askAt: 20, ls: null, qs: [st({ gate: true, evFirst: true, from: 20, evAt: 40, wrongAtEv: 0, ...gate }), st(other || {})] });
  assert.equal(readLog(r({ said: 1 })).u, 1);
  assert.equal(readLog(r({ said: 0 })).u, 0);
  assert.ok(!('u' in readLog(r({ said: -1 }))), '안 읽었으면 없음');
  assert.ok(!('u' in readLog(r({}, { evFirst: true, wrong: [0, 1], said: 1 }))), '두 번 틀린 물음의 읽기는 근거부터 줄이 아니다');
  assert.ok(!('u' in readLog(r({ evAt: -1, said: 1 }))) && !('v' in readLog(r({ evAt: -1, said: 1 }))), '근거를 못 찾았으면 v·u 없음');
  assert.deepEqual(Object.keys(readLog(r({ said: 1 }))).slice(-4), ['v', 'w', 'k', 'u']);
});

test('📤 u (readOf · 병합): v가 있고 0·1일 때만 남는다 · 옛 앱이 u를 지운 사본과 합쳐도 남는다(차례 상관없이) · 옛 줄은 꼴 그대로', () => {
  const base = { c: 'K1', t: T0, d: D0, s: 120, a: 70, n: 3, f: 2, x: 0, e: 0, h: 0, g: 1, m: '', q: 30 };
  assert.deepEqual(readOf({ ...base, v: 25, w: 1, k: 1, u: 1 }), { ...base, v: 25, w: 1, k: 1, u: 1 });
  assert.equal(readOf({ ...base, v: 25, w: 1, k: 0, u: 0 }).u, 0);
  for (const bad of [2, -1, '1', true, null, 0.5, NaN]) assert.ok(!('u' in readOf({ ...base, v: 25, u: bad })), `u ${String(bad)} — 뺀다`);
  assert.ok(!('u' in readOf({ ...base, u: 1 })), '근거부터 칸(v)이 없으면 u도 없다');
  assert.deepEqual(Object.keys(readOf({ ...base, v: 25, w: 1, k: 1 })), ['c', 't', 'd', 's', 'a', 'n', 'f', 'x', 'e', 'h', 'g', 'm', 'q', 'v', 'w', 'k'], 'v362까지의 줄은 꼴 그대로');
  const full = readOf({ ...base, v: 25, w: 1, k: 1, u: 1 });
  const old = readOf({ ...base, v: 25, w: 1, k: 1 }); // v362 앱이 다시 저장한 사본
  assert.deepEqual(mergeReads([full], [old]), [full]);
  assert.deepEqual(mergeReads([old], [full]), [full]);
  assert.deepEqual(readsOf([old, full, old]), readsOf([full, old]));
});

test('📤 국어 요약: 머리말에 🔊 뜻(v363 · 들음/못 들음 · 첫 답까지가 길어짐) · 모은 줄에 🔊 끝까지 들음(적은 줄만) · 줄마다 🔊 들음/못 들음 · 적은 줄이 없으면 🔊 말 없음', () => {
  const row = (o) => ({ c: 'K1', t: T0, d: D0, s: 90, a: 50, n: 3, f: 2, x: 0, e: 0, h: 0, g: 1, m: '', q: 20, ...o });
  const L = readLines([row({ v: 30, w: 0, k: 1, u: 1 }), row({ t: T0 + 1, v: 50, w: 3, k: 0, u: 0 }), row({ t: T0 + 2, v: 10, w: 0, k: 1 })], DATA.cards, '2026-10-29');
  assert.ok(L[1].includes('🔊 v363부터 답을 고르기 전에 근거를 찾으면(📍 근거부터·🔍 근거 먼저) 칠한 근거와 물음을 소리로 한 번 읽은 뒤 보기가 열림 — 🔊 들음 = 그 읽기가 끝까지 · 🔊 못 들음 = 소리가 안 났거나 중간에 멈춰 바로 열림 · 끝 알림이 없어 끝까지 읽었는지 확인하지 못한 기기도 못 들음(📍 근거부터 줄만 적음) · 그만큼 첫 답까지가 길어짐(찾기까지는 누른 때라 그대로) · 🔍 두 줄로 좁히기'));
  assert.match(L[2], / · 📍 근거부터 3번\(찾기까지 평균 30초 · 잘못 누른 줄 3 · 찾은 뒤 첫 번에 2\/3 · 🔊 끝까지 들음 1\/2\)$/);
  const lines = L.slice(3);
  assert.equal(lines.filter((x) => x.endsWith(' · 📍 근거부터 찾기까지 30초 · 🔊 들음')).length, 1);
  assert.equal(lines.filter((x) => x.endsWith(' · 📍 근거부터 찾기까지 50초(잘못 누른 줄 3) · 🔊 못 들음 · 찾은 뒤에도 틀림')).length, 1);
  assert.equal(lines.filter((x) => x.endsWith(' · 📍 근거부터 찾기까지 10초')).length, 1, 'u가 없는 줄(읽기가 없는 기기 · 옛 줄)');
  const M = readLines([row({ v: 30, w: 0, k: 1 })], DATA.cards, '2026-10-29');
  assert.ok(!M[2].includes('🔊') && !M[3].includes('🔊'), 'u를 적은 줄이 없으면 🔊 말 없음');
});

test('🔊 화면 배선 (v363): 답을 고르기 전에 찾으면(reopen) 읽기가 있는 기기만 잠그고 읽음 · 끝나면 그 물음일 때만 다시 그려 엶 · said는 첫 읽기만 · 다시 듣기 단추 · 고르면 소리 그만 · 떠나면 그만 · css · sw', () => {
  const src = read('js/koreanview.js');
  const body = (head) => { const i = src.indexOf(head); assert.ok(i >= 0, head); return src.slice(i, src.indexOf('\n}\n', i)); };
  assert.ok(src.includes("import { newListenState, playListen, haltListen, stopListening, listenBoxEl, scriptEl, confirmHeard, syncListenBox, sayReady, playEvSay, stopEvSay } from './korlistenview.js';"));
  assert.ok(body('function openCard(id) {').includes('pair: null, sayOn: false, said: -1, gate: i === gateAt,'), '물음마다 sayOn·said');
  const ev = body('function evPick(n) {');
  const lock = 'if (reopen && sayReady()) st.sayOn = true;';
  assert.ok(ev.includes(lock) && ev.indexOf(lock) < ev.indexOf('renderQ();'), '그리기 전에 잠금 — 보기가 한 번도 열려 보이지 않게');
  assert.ok(ev.indexOf('if (st.sayOn) sayEvidence(r, r.qi, true);') > ev.indexOf('renderQ();'), '그린 뒤 읽기 (읽는 줄 테두리를 그린 글 상자에)');
  const se = body('function sayEvidence(r, qi, first) {');
  assert.ok(se.includes('alive: () => ui.read === r && r.qi === qi && koreanVisible()'), '글을 닫거나 물음이 바뀌거나 화면을 떠나면 그만');
  assert.ok(se.includes('if (!first) return;'), '다시 듣기는 잠금·기록을 건드리지 않는다');
  assert.ok(se.includes('if (st.said < 0) st.said = fullyHeard(res) ? 1 : 0;'), '📤 u는 첫 읽기만');
  const open = se.indexOf('st.sayOn = false;');
  assert.ok(open >= 0 && open < se.indexOf('if (ui.read !== r || r.qi !== qi) return;') && se.indexOf('if (ui.read !== r || r.qi !== qi) return;') < se.indexOf('renderQ();'), '잠금은 늘 풀고 · 그 물음이 떠 있을 때만 다시 그림');
  assert.ok(se.includes('.then(done, () => done(null));'), '읽기가 오류로 끝나도 연다');
  assert.ok(se.includes("main.querySelectorAll('.kor-read-body .is-say')") && se.includes('t.classList.add(\'is-say\')'), '읽는 줄 테두리 · 끝나면 지움');
  // 🔍 Codex 167차 P2-2 — 테두리는 마지막 읽기만 (앞 읽기의 늦은 끝이 새 읽기 테두리를 지우지 않게) · 잠금 풀기·첫 기록은 늦어도 한다
  assert.ok(se.includes('const tok = (r.sayTok = (r.sayTok || 0) + 1);') && se.includes('if (!main || r.sayTok !== tok) return;'), '읽기 번호로 테두리를 지킨다');
  assert.ok(se.indexOf('if (!main || r.sayTok !== tok) return;') < se.indexOf('const done = (res) => {') && !se.slice(se.indexOf('const done = (res) => {')).includes('r.sayTok !== tok'), '번호 확인은 테두리에만 — done의 잠금 풀기는 늘');
  const rq = body('function renderQ() {');
  assert.ok(rq.includes('if (q.ev && st.evFirst && !st.answered && !st.sayOn && sayReady()) card.appendChild(sayAgainEl(r));'), '🔊 다시 듣기 — 찾은 뒤·고르기 전·첫 읽기가 끝난 뒤·읽기가 있는 기기');
  const again = body('function sayAgainEl(r) {');
  assert.ok(again.includes("'🔊 다시 듣기'") && again.includes('sayEvidence(r, r.qi, false)'), '다시 듣기는 잠그지 않는 읽기');
  const pick = body('function pick(k) {');
  assert.ok(pick.indexOf('stopEvSay();') > pick.indexOf('|| st.sayOn) return;') && pick.indexOf('stopEvSay();') < pick.indexOf('sfx.ding()'), '고르는 순간 소리 그만 (잠긴 보기를 눌렀을 땐 그대로)');
  assert.ok(body('function closeRead() {').includes('if (ui.read) haltListen(ui.read.ls);') && body('export function leaveKorean() {').includes('else stopListening();'), '글을 닫거나 화면을 떠나면 읽기 그만');
  const css = read('css/style.css');
  assert.ok(css.includes('.kor-fb.is-say {') && css.includes('.kor-sent.is-say, .kor-line.is-say {') && css.includes('.kor-say-btn {'));
  const sw = Number((/const CACHE_VERSION = 'v(\d+)';/.exec(read('sw.js')) || [])[1]);
  assert.ok(sw >= 363, 'sw는 v363 이상');
  assert.equal(read('js/version.js').match(/APP_VERSION = 'v(\d+)'/)[1], String(sw), '앱 판 = sw');
});
