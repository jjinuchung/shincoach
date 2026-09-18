// 말하기 확인 흐름 테스트: 음성 인식 우선 → 안 되면 소리 에너지 폴백 (가짜 SpeechRecognition·getUserMedia로)
// node --test tests/speak.flow.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';

// speak.js는 호출 시점에만 window/navigator를 보므로 import 전에 전역을 만들어 둠
const recs = [];
class FakeSR {
  constructor() { this.started = false; this.startCount = 0; recs.push(this); }
  start() { this.started = true; this.startCount++; }
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
let micDelay = 0;   // 권한 대기·기기 지연 흉내
let micStopped = 0; // 받자마자 꺼진 스트림 수
const fakeNav = { onLine: true, mediaDevices: { getUserMedia: async () => { micOpens++; if (micDelay) await new Promise((r) => setTimeout(r, micDelay)); if (!micOk) throw new Error('denied'); return { getAudioTracks: () => [{ readyState: 'live' }], getTracks: () => [{ stop() { micStopped++; } }] }; } } };
Object.defineProperty(globalThis, 'navigator', { value: fakeNav, configurable: true, writable: true });
globalThis.performance = globalThis.performance || { now: () => Date.now() };
globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 5);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

const { runSpeakCheck, resetRecognition, recognitionState, releaseMic, speakLog, prepareMic, micFailReason } = await import('../js/speak.js');
const opts = () => ({ target: 'I love toys.', durationSec: 1.5 });
const tick = (ms = 10) => new Promise((r) => setTimeout(r, ms));

/**
 * 아무것도 못 들은 채 인식이 끝나는 상황.
 * 한 문장 안에서 2번 더 다시 듣기 때문에(SR_RESTARTS), 판정까지 가려면 3번 끝나야 한다.
 */
async function endEmpty(rec, err) {
  for (let i = 0; i < 3; i++) {
    if (err) rec.error(err);
    rec.end();
    await tick();
  }
}

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

test('no-speech(말 안 함)는 실패이고 인식은 유지, 결과 없음이 3번 이어지면 에너지 방식으로 전환', async () => {
  resetRecognition(); recs.length = 0; micOpens = 0;
  let h = runSpeakCheck(opts());
  await endEmpty(recs[0], 'no-speech');
  let r = await h.promise;
  assert.equal(r.passed, false); assert.equal(r.method, 'speech'); assert.equal(r.srError, 'no-speech');
  assert.equal(recognitionState().broken, false);
  // 오류 없이 결과만 없음 ×1 → 아직 인식 유지
  h = runSpeakCheck(opts());
  await endEmpty(recs[1]);
  r = await h.promise;
  assert.equal(r.srError, 'no-result'); assert.equal(recognitionState().broken, false);
  // ×2 → 아직 유지 (아이가 두 번 조용했을 뿐일 수 있다)
  h = runSpeakCheck(opts());
  await endEmpty(recs[2]);
  r = await h.promise;
  assert.equal(recognitionState().broken, false, '2번으로는 폴백하지 않는다');
  // ×3 → 이 문장부터 에너지 방식 (마이크 열림), 이후 문장도 에너지
  h = runSpeakCheck(opts());
  await endEmpty(recs[3]);
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

test('폴백은 영구가 아니다 — 시간이 지나면 인식을 다시 시도한다', async () => {
  resetRecognition(); recs.length = 0; micOpens = 0;
  // 결과 없음 3번 → 폴백
  for (let i = 0; i < 3; i++) {
    const h = runSpeakCheck(opts());
    recs[i].end();
    if (i < 2) await h.promise; else { await tick(30); h.stop(); await h.promise; }
  }
  assert.equal(recognitionState().broken, true, '폴백 상태');
  assert.ok(recognitionState().retryInSec > 0, '언제 다시 시도하는지 알 수 있어야 함');

  // 아직 시간이 안 됐으면 계속 에너지
  const before = recs.length;
  let h = runSpeakCheck(opts());
  assert.equal(recs.length, before, '아직은 인식을 안 씀');
  h.cancel(); await h.promise;

  // 시간이 지난 것처럼 만들면 다시 인식 (앱을 껐다 켜지 않아도 복구)
  const RETRY_MS = 3 * 60 * 1000;
  const realNow = Date.now;
  Date.now = () => realNow() + RETRY_MS + 1000;
  try {
    h = runSpeakCheck(opts());
    assert.equal(recs.length, before + 1, '시간이 지나면 인식을 다시 시도');
    assert.equal(recognitionState().broken, false);
    recs[recs.length - 1].result('i love toys');
    recs[recs.length - 1].end();
    const r = await h.promise;
    assert.equal(r.method, 'speech', '복구 후에는 다시 단어로 판정');
  } finally {
    Date.now = realNow;
  }
});

test('일시적 오류(network·start-failed)는 한 번으로 폴백하지 않는다', async () => {
  resetRecognition(); recs.length = 0; micOpens = 0;
  // network 오류 1번 → 그 문장만 실패, 인식은 유지
  let h = runSpeakCheck(opts());
  recs[0].error('network'); recs[0].end();
  let r = await h.promise;
  assert.equal(r.method, 'speech', '이번 문장은 인식 결과(실패)로');
  assert.equal(recognitionState().broken, false, '한 번으로는 안 막힘');
  assert.equal(recognitionState().failStreak, 1);

  // 그 뒤에 잘 들리면 스트릭이 풀린다
  h = runSpeakCheck(opts());
  recs[1].result('i love toys'); recs[1].end();
  r = await h.promise;
  assert.equal(r.method, 'speech');
  assert.equal(recognitionState().failStreak, 0, '한 번이라도 들리면 초기화');
});

test('아이가 조용한 문장이 이어져도(no-speech) 인식을 유지한다', async () => {
  resetRecognition(); recs.length = 0;
  for (let i = 0; i < 4; i++) {
    const h = runSpeakCheck(opts());
    await endEmpty(recs[i], 'no-speech');
    const r = await h.promise;
    assert.equal(r.method, 'speech');
    assert.equal(r.srError, 'no-speech');
  }
  assert.equal(recognitionState().broken, false, '말을 안 한 것은 기기 문제가 아니다');
  assert.equal(recognitionState().failStreak, 0);
});

// 2026-09-17 아버님 신고: 아이가 따라 말하는데 중간중간 인식을 못 한다.
// 안드로이드 인식기는 말 시작 전 침묵(약 5초)이나 첫 쉼에서 스스로 끝난다 —
// 아이가 문장을 읽고 숨 고르는 사이 끝나면 정작 말할 때는 듣는 사람이 없다.
test('🎤 아이가 말하기 전에 인식이 끝나면 같은 문장에서 다시 듣는다', async () => {
  resetRecognition(); recs.length = 0;
  const h = runSpeakCheck(opts());
  const rec = recs[0];
  assert.equal(rec.startCount, 1);

  rec.error('no-speech'); rec.end(); await tick();
  assert.equal(rec.startCount, 2, '아직 아무 말도 못 들었으니 다시 듣는다');
  assert.equal(recs.length, 1, '새 인식기를 만들지 않고 같은 것을 다시 켠다');

  // 이제 아이가 말한다 → 제대로 인식된다 (예전에는 이 말을 아무도 듣지 않았다)
  rec.result('i love toys'); rec.end();
  const r = await h.promise;
  assert.equal(r.method, 'speech');
  assert.equal(r.passed, true);
  assert.equal(r.transcript, 'i love toys');
});

test('🎤 다시 듣기는 2번까지만 (무한정 붙잡고 있지 않는다)', async () => {
  resetRecognition(); recs.length = 0;
  const h = runSpeakCheck(opts());
  const rec = recs[0];
  await endEmpty(rec, 'no-speech');
  assert.equal(rec.startCount, 3, '처음 1번 + 다시 듣기 2번');
  const r = await h.promise;
  assert.equal(r.srError, 'no-speech');
  assert.equal(r.passed, false);
});

test('🎤 들은 말이 있으면 다시 듣지 않고 바로 판정한다', async () => {
  resetRecognition(); recs.length = 0;
  const h = runSpeakCheck(opts());
  const rec = recs[0];
  rec.result('banana'); rec.end();
  const r = await h.promise;
  assert.equal(rec.startCount, 1, '들은 게 있으면 그걸로 판정 (아이를 기다리게 하지 않는다)');
  assert.equal(r.passed, false);
  assert.equal(r.transcript, 'banana');
});

test('🎤 "다 말했어요"를 누른 뒤에는 다시 듣지 않는다', async () => {
  resetRecognition(); recs.length = 0;
  const h = runSpeakCheck(opts());
  const rec = recs[0];
  h.stop();
  rec.end();
  const r = await h.promise;
  assert.equal(rec.startCount, 1);
  assert.equal(r.method, 'speech');
});

test('🎤 권한·마이크 문제는 다시 들어도 같으므로 바로 넘어간다', async () => {
  resetRecognition(); recs.length = 0;
  const h = runSpeakCheck(opts());
  const rec = recs[0];
  rec.error('not-allowed'); rec.end();
  await tick(30);
  assert.equal(rec.startCount, 1, '다시 듣지 않는다');
  assert.equal(recognitionState().broken, true);
  h.stop();
  const r = await h.promise;
  assert.equal(r.srError, 'not-allowed');
});

// 권한 대기가 길면(아이가 "허용"을 늦게 누르거나 기기가 느릴 때) 그 사이 문장이 끝나
// 인식이 시작되며 releaseMic()을 부른다. 늦게 도착한 스트림을 그대로 쓰면
// **인식이 도는 동안 마이크가 열려 있어** 안드로이드에서 인식이 소리를 못 받는다.
test('🎤 인식에 마이크를 넘기는 사이 늦게 도착한 스트림은 버린다', async () => {
  releaseMic(); micOpens = 0; micStopped = 0; micDelay = 40;
  const p = prepareMic();  // 권한 대기 중
  releaseMic();            // 그 사이 인식이 시작되며 마이크를 놓음
  const stream = await p;
  micDelay = 0;
  assert.equal(stream, null, '늦게 온 스트림은 쓰지 않는다');
  assert.equal(micFailReason(), 'released', '거부가 아니라 "넘겨주느라 취소됨" — 말하기 확인을 꺼서는 안 된다');
  assert.equal(micStopped, 1, '받자마자 꺼야 인식이 소리를 받는다');
});

test('🎤 평소에는 마이크가 정상으로 열린다 (위 방어가 막아서면 안 됨)', async () => {
  releaseMic(); micOpens = 0;
  const stream = await prepareMic();
  assert.ok(stream, '평소에는 그대로 열림');
  assert.equal(micFailReason(), '');
  releaseMic();
});

test('말하기 기록이 남아 무엇 때문에 막혔는지 볼 수 있다', async () => {
  resetRecognition(); recs.length = 0;
  let h = runSpeakCheck(opts());
  recs[0].result('i love toys'); recs[0].end();
  await h.promise;
  h = runSpeakCheck(opts());
  recs[1].error('network'); recs[1].end();
  await h.promise;
  const log = speakLog();
  assert.ok(log.length >= 2);
  assert.equal(log[log.length - 2].ok, true);
  assert.equal(log[log.length - 1].srError, 'network');
  assert.ok(log.every((e) => typeof e.at === 'number'));
});

// 2026-09-18: "잘 되다가 어느 순간부터 인식이 안 되고, 앱을 껐다 켜면 된다"의 또 다른 경로.
// 소리 길이 판정(에너지)은 마이크를 열어 둔 채 끝난다. 그 직후 인식을 바로 켜면 안드로이드가
// 아직 마이크를 안 놓아 소리를 못 받고, 세 번 이어지면 다시 에너지로 빠져 **영영 돌아오지 못한다**.
test('🎤 소리 길이 판정 뒤에는 마이크를 놓아줄 틈을 두고 인식을 켠다', async () => {
  resetRecognition(); recs.length = 0; micOpens = 0;
  releaseMic();

  // ① 에너지 방식으로 한 문장 (마이크가 열린 채 끝난다)
  navigator.onLine = false;
  let h = runSpeakCheck(opts());
  await tick(30);
  h.stop();
  await h.promise;
  assert.ok(micOpens >= 1, '에너지 판정은 마이크를 연다');

  // ② 다음 문장은 인식 — 마이크를 놓자마자 시작하지 않는다
  navigator.onLine = true;
  h = runSpeakCheck(opts());
  assert.equal(recs.length, 1, '인식기는 만들어 두고');
  assert.equal(recs[0].startCount, 0, '바로 start 하지 않는다 (기기가 마이크를 놓을 틈)');
  await tick(400);
  assert.equal(recs[0].startCount, 1, '잠깐 뒤에 시작한다');

  recs[0].result('i love toys'); recs[0].end();
  const r = await h.promise;
  assert.equal(r.method, 'speech', '에너지 뒤에도 인식으로 돌아온다');
  assert.equal(r.passed, true);
});

test('🎤 마이크가 열려 있지 않았으면 기다리지 않고 바로 시작한다 (평소 속도 그대로)', async () => {
  resetRecognition(); recs.length = 0;
  releaseMic();
  const h = runSpeakCheck(opts());
  assert.equal(recs[0].startCount, 1, '지체 없이 시작');
  recs[0].result('i love toys'); recs[0].end();
  await h.promise;
});
