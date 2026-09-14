// 말하기 확인 흐름 테스트: 음성 인식 우선 → 안 되면 소리 에너지 폴백 (가짜 SpeechRecognition·getUserMedia로)
// node --test tests/speak.flow.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';

// speak.js는 호출 시점에만 window/navigator를 보므로 import 전에 전역을 만들어 둠
const recs = [];
class FakeSR {
  constructor() { this.started = false; recs.push(this); }
  start() { this.started = true; }
  stop() { if (this.onend) setTimeout(() => this.onend && this.onend(), 0); }
  abort() { this.aborted = true; }
  // 테스트 도우미
  result(text, isFinal = true) { this.onresult && this.onresult({ results: [Object.assign([{ transcript: text }], { isFinal })] }); }
  error(name) { this.onerror && this.onerror({ error: name }); }
  end() { this.onend && this.onend(); }
}
let micOk = true; // getUserMedia 성공 여부
let micOpens = 0;
globalThis.window = { webkitSpeechRecognition: FakeSR, AudioContext: class { constructor() { this.state = 'running'; } resume() { return Promise.resolve(); } createMediaStreamSource() { return { connect() {}, disconnect() {} }; } createAnalyser() { return { fftSize: 1024, getByteTimeDomainData(b) { b.fill(128); } }; } } };
// Node 21+는 globalThis.navigator가 getter라 defineProperty로 덮어씀
const fakeNav = { onLine: true, mediaDevices: { getUserMedia: async () => { micOpens++; if (!micOk) throw new Error('denied'); return { getAudioTracks: () => [{ readyState: 'live' }], getTracks: () => [{ stop() {} }] }; } } };
Object.defineProperty(globalThis, 'navigator', { value: fakeNav, configurable: true, writable: true });
globalThis.performance = globalThis.performance || { now: () => Date.now() };
globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 5);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

const { runSpeakCheck, resetRecognition, recognitionState, releaseMic } = await import('../js/speak.js');
const opts = () => ({ target: 'I love toys.', durationSec: 1.5 });
const tick = (ms = 10) => new Promise((r) => setTimeout(r, ms));

test('인식 우선: getUserMedia를 열지 않고 인식 결과로 판정', async () => {
  resetRecognition(); recs.length = 0; micOpens = 0;
  const h = runSpeakCheck(opts());
  const rec = recs[0];
  assert.ok(rec && rec.started, '인식 시작');
  assert.equal(micOpens, 0, '인식 방식에서는 마이크 스트림을 열지 않음 (안드로이드 동시 사용 문제)');
  rec.result('i love toys');
  rec.end();
  const r = await h.promise;
  assert.equal(r.method, 'speech'); assert.equal(r.passed, true); assert.equal(r.transcript, 'i love toys');
  assert.equal(r.srError, '');
});

test('인식 결과가 원문과 다르면 실패 (다시 말하기), 인식 자체는 계속 사용', async () => {
  resetRecognition(); recs.length = 0;
  const h = runSpeakCheck(opts());
  recs[0].result('banana'); recs[0].end();
  const r = await h.promise;
  assert.equal(r.method, 'speech'); assert.equal(r.passed, false);
  assert.equal(recognitionState().broken, false);
});

test('no-speech(말 안 함)는 실패이고 인식은 유지, 결과 없음이 2번 이어지면 에너지 방식으로 전환', async () => {
  resetRecognition(); recs.length = 0; micOpens = 0;
  let h = runSpeakCheck(opts());
  recs[0].error('no-speech'); recs[0].end();
  let r = await h.promise;
  assert.equal(r.passed, false); assert.equal(r.method, 'speech'); assert.equal(r.srError, 'no-speech');
  assert.equal(recognitionState().broken, false);
  // 오류 없이 결과만 없음 ×1 → 아직 인식 유지
  h = runSpeakCheck(opts());
  recs[1].end();
  r = await h.promise;
  assert.equal(r.srError, 'no-result'); assert.equal(recognitionState().broken, false);
  // ×2 → 이 문장부터 에너지 방식 (마이크 열림), 이후 문장도 에너지
  h = runSpeakCheck(opts());
  recs[2].end();
  await tick(30);
  assert.equal(recognitionState().broken, true);
  assert.ok(micOpens >= 1, '폴백에서 마이크를 엶');
  h.stop();
  r = await h.promise;
  assert.equal(r.method, 'energy'); assert.equal(r.srError, 'no-result');
  const n = recs.length;
  h = runSpeakCheck(opts());
  assert.equal(recs.length, n, '전환 뒤에는 인식을 시작하지 않음');
  h.stop();
  r = await h.promise;
  assert.equal(r.method, 'energy');
});

test('치명 오류(audio-capture·network…)는 바로 에너지 방식으로, 마이크도 안 되면 method none', async () => {
  resetRecognition(); recs.length = 0;
  const h = runSpeakCheck(opts());
  recs[0].error('audio-capture'); recs[0].end();
  await tick(30);
  assert.equal(recognitionState().broken, true);
  h.stop();
  let r = await h.promise;
  assert.equal(r.method, 'energy'); assert.equal(r.srError, 'audio-capture');
  micOk = false;
  releaseMic(); // 앞 테스트가 연 스트림을 놓아야 다시 getUserMedia를 시도함
  const h2 = runSpeakCheck(opts());
  r = await h2.promise;
  assert.equal(r.method, 'none', '마이크까지 안 되면 확인 없이 진행');
  assert.equal(r.passed, true);
  micOk = true;
});

test('오프라인이면 인식을 시도하지 않고 에너지 방식 (srError offline), 다시 온라인 + reset이면 인식', async () => {
  resetRecognition(); recs.length = 0;
  navigator.onLine = false;
  let h = runSpeakCheck(opts());
  assert.equal(recs.length, 0);
  h.stop();
  let r = await h.promise;
  assert.equal(r.method, 'energy'); assert.equal(r.srError, 'offline');
  navigator.onLine = true;
  resetRecognition();
  h = runSpeakCheck(opts());
  assert.equal(recs.length, 1, '온라인이면 다시 인식');
  recs[0].result('i love toys'); recs[0].end();
  r = await h.promise;
  assert.equal(r.method, 'speech');
});

test('cancel: 판정 없이 정리, stop: 마지막 결과를 기다렸다가 판정', async () => {
  resetRecognition(); recs.length = 0;
  let h = runSpeakCheck(opts());
  h.cancel();
  let r = await h.promise;
  assert.equal(r.method, 'cancelled');
  assert.ok(recs[0].aborted, '인식 중단');
  h = runSpeakCheck(opts());
  recs[1].result('i love', false); // 중간 결과
  h.stop(); // → rec.stop() → onend → 판정
  r = await h.promise;
  assert.equal(r.method, 'speech'); assert.equal(r.transcript, 'i love');
});
