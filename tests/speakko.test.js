// 🔊 한국어 읽어 주기 (v244) — 한국어 음성 고르기 · 음성 목록 늦게 오기 · 읽기 시작·끝 · 소리 없음 · ⚙ 확인 한 줄 · 설정 화면 연결
// 🔍 Codex 56차 — 시작한 뒤 멈춘 읽기를 ✅로 보이지 않음 · 끝 알림이 없으면 "끝났는지 모름" · 한국어 음성이 늦게 오면 끝까지 기다림 · 목록에 없음 ≠ 없음 · 겹친 확인
// 🔍 Codex 57차 — 시간이 다 되면 아직 마지막 말일 때만 기기에서도 지움(cancel) · 시작 기다림과 끝 기다림을 나눔 · 말하기가 멈추면 곧 끝
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { koVoicesOf, waitVoices, sayKo, ttsCheck, ttsCheckLine, CHECK_TEXT, START_MS, POLL_MS, endWaitMs } from '../js/speakko.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const V = (lang, name = lang) => ({ lang, name });

/**
 * 가짜 브라우저 — voices: 처음 목록 · later: [[ms, 목록]…] voiceschanged로 바뀌는 목록 ·
 * mode: 'ok'(시작·끝) | 'silent'(아무 소식 없음) | 'error'(시작 전 오류) | 'startErr'(시작 뒤 멈춤) | 'noend'(시작만) |
 *       'quiet'(시작하고 ms 뒤 말하기를 멈추지만 끝 알림 없음 — speaking으로만 안다) | 'nostart'(시작 알림 없이 말하다 ms 뒤 끝)
 */
function fakeWin({ voices = [], later = [], mode = 'ok', ms = 20 } = {}) {
  const said = [];
  let list = voices;
  const listeners = [];
  let cancels = 0;
  const synth = {
    getVoices: () => list,
    addEventListener: (ev, fn) => { if (ev === 'voiceschanged') listeners.push(fn); },
    removeEventListener: (ev, fn) => { const k = listeners.indexOf(fn); if (k >= 0) listeners.splice(k, 1); },
    speaking: mode === 'quiet' || mode === 'nostart' ? false : undefined, // 말하는 중인지 알려 주는 브라우저만
    cancel: () => { cancels++; },
    speak(u) {
      said.push({ text: u.text, lang: u.lang, voice: u.voice, rate: u.rate, pitch: u.pitch });
      if (mode === 'ok') setTimeout(() => { u.onstart(); u.onend(); }, 0);
      if (mode === 'error') setTimeout(() => u.onerror({ error: 'synthesis-failed' }), 0);
      if (mode === 'startErr') setTimeout(() => { u.onstart(); u.onerror({ error: 'interrupted' }); }, 0);
      if (mode === 'noend') setTimeout(() => u.onstart(), 0);
      if (mode === 'quiet') setTimeout(() => { synth.speaking = true; u.onstart(); setTimeout(() => { synth.speaking = false; }, ms); }, 0);
      if (mode === 'nostart') { synth.speaking = true; setTimeout(() => { synth.speaking = false; u.onend(); }, ms); }
    },
  };
  for (const [ms, l] of later) setTimeout(() => { list = l; [...listeners].forEach((f) => f()); }, ms);
  function Utter(text) { this.text = text; }
  return { win: { speechSynthesis: synth, SpeechSynthesisUtterance: Utter }, said, cancels: () => cancels, listeners };
}

test('🔊 한국어 음성 고르기 · 목록이 늦게 와도 기다림 · 읽기 시작·끝 · 소리 없음·오류 · 시작 뒤 멈춤 · 끝 알림 없음 · 읽어 주기가 없는 브라우저', async () => {
  assert.deepEqual(koVoicesOf([V('en-US'), V('ko-KR', 'a'), V('ko_KR', 'b'), V('ko', 'c'), V('kok-IN'), null]).map((v) => v.name), ['a', 'b', 'c'], 'kok(콘칸어)은 한국어가 아니다');
  const late = fakeWin({ voices: [], later: [[5, [V('ko-KR', 'late')]]] });
  assert.deepEqual((await waitVoices(late.win.speechSynthesis, 500)).map((v) => v.name), ['late'], 'voiceschanged를 기다린다');
  assert.equal(late.listeners.length, 0, '끝나면 듣기를 뗀다');
  const none = fakeWin({ voices: [] });
  assert.deepEqual(await waitVoices(none.win.speechSynthesis, 20), [], '끝내 없으면 빈 목록으로 끝난다(멈추지 않음)');
  // Codex 56차 — 영어가 먼저 오고 한국어가 뒤에 오면 첫 소식에 멈추지 않는다
  const enFirst = fakeWin({ voices: [], later: [[5, [V('en-US')]], [30, [V('en-US'), V('ko-KR', 'k')]]] });
  const got = await waitVoices(enFirst.win.speechSynthesis, 500, (l) => koVoicesOf(l).length > 0);
  assert.deepEqual(got.map((v) => v.name), ['en-US', 'k']);
  const ok = fakeWin({ voices: [V('ko-KR')] });
  assert.deepEqual(await sayKo('안녕', { win: ok.win, rate: 0.9, pitch: 1.2 }), { ok: true, started: true });
  assert.deepEqual(ok.said, [{ text: '안녕', lang: 'ko-KR', voice: undefined, rate: 0.9, pitch: 1.2 }], '말은 ko-KR로');
  const silent = fakeWin({ mode: 'silent' });
  assert.deepEqual(await sayKo('안녕', { win: silent.win, timeout: 30 }), { ok: false, started: false, why: 'silent' }, '소식이 없으면 기다리다 끝낸다');
  const err = fakeWin({ mode: 'error' });
  assert.deepEqual(await sayKo('안녕', { win: err.win }), { ok: false, started: false, why: 'synthesis-failed' });
  const startErr = fakeWin({ mode: 'startErr' });
  assert.deepEqual(await sayKo('안녕', { win: startErr.win }), { ok: false, started: true, why: 'interrupted' }, '시작 뒤 멈춤은 실패');
  const noend = fakeWin({ mode: 'noend' });
  assert.deepEqual(await sayKo('안녕', { win: noend.win, timeout: 30 }), { ok: false, started: true, why: 'noend' }, '끝 알림이 없으면 끝까지 읽었다고 하지 않는다');
  assert.deepEqual(await sayKo('안녕', { win: {} }), { ok: false, started: false, why: 'none' });
});

test('🔊 ⚙ 한국어 읽어 주기 확인 — 결과(음성 수·끝까지·시작) → 한 줄(시작 뒤 멈춤은 ✅ 아님 · 목록에 없음 ≠ 없음) · 읽기 바로 앞에서 한 번 더 cancel · 설정 화면 단추·결과 줄 · 겹친 확인 · sw', async () => {
  const good = fakeWin({ voices: [V('en-US'), V('ko-KR', 'Korean')] });
  const r = await ttsCheck(good.win);
  assert.deepEqual(r, { supported: true, total: 2, ko: 1, ok: true, started: true, why: undefined });
  assert.equal(good.said[0].text, CHECK_TEXT);
  assert.equal(good.said[0].voice.name, 'Korean', '한국어 음성으로 읽는다');
  assert.equal(good.cancels(), 2, '시작할 때 + 읽기 바로 앞에서(앞서 누른 확인이 넣은 말을 지운다)');
  assert.match(ttsCheckLine(r), /^✅ 한국어 음성 1개 · 끝까지 읽었어요/);
  // Codex 56차 — 시작 뒤 오류(interrupted)는 ✅가 아니다
  const se = await ttsCheck(fakeWin({ voices: [V('ko-KR')], mode: 'startErr' }).win);
  assert.deepEqual([se.ok, se.started, se.why], [false, true, 'interrupted']);
  assert.match(ttsCheckLine(se), /^⚠️ 한국어 음성 1개 · 읽다가 멈췄어요 \(interrupted\)/);
  assert.match(ttsCheckLine({ supported: true, total: 1, ko: 1, ok: false, started: true, why: 'noend' }), /^🔸 .+끝났는지 확인하지 못했어요/);
  // 한국어 음성이 목록에 늦게 오면 기다렸다가 그 음성으로
  const lateKo = fakeWin({ voices: [V('en-US')], later: [[20, [V('en-US'), V('ko-KR', 'lateKo')]]] });
  const rl = await ttsCheck(lateKo.win);
  assert.deepEqual([rl.ko, lateKo.said[0].voice.name], [1, 'lateKo']);
  // 목록에 없음 ≠ 없음 — 목록에 없어도 읽기가 끝까지 됐으면 그렇게 말한다
  assert.match(ttsCheckLine({ supported: true, total: 3, ko: 0, ok: true, started: true }), /^✅ 끝까지 읽었어요 — 다만 한국어 음성이 목록에 없어요\(음성 3개\)/);
  assert.match(ttsCheckLine({ supported: true, total: 3, ko: 0, ok: false, started: false, why: 'silent' }), /한국어 음성이 목록에 없어요\(음성 3개\) — 읽기도 시작되지 않았어요.+텍스트 음성 변환/);
  assert.match(ttsCheckLine({ supported: true, total: 3, ko: 1, ok: false, started: false, why: 'silent' }), /한국어 음성 1개가 있지만 읽기가 시작되지 않았어요 \(silent\)/);
  assert.deepEqual(await ttsCheck({}), { supported: false, total: 0, ko: 0, ok: false, started: false });
  assert.match(ttsCheckLine({ supported: false }), /소리 내어 읽기를 못 해요/);
  // 설정 화면 — 단추·결과 줄 · 누를 때만 모듈을 부름 · 확인하는 동안 단추 끔 · 마지막 확인만 결과 줄에 · 창을 열면 지난 결과를 지움
  const html = read('index.html');
  assert.ok(html.includes('id="set-tts-try"') && html.includes('id="set-tts-note"'));
  const pl = read('js/player.js');
  assert.ok(pl.includes("import('./speakko.js').then((m) => m.ttsCheck().then((r) => { if (mine()) note.textContent = m.ttsCheckLine(r); }))"));
  const tts = pl.slice(pl.indexOf("$('set-tts-try').addEventListener('click', () => {"), pl.indexOf("$('form-settings').addEventListener('submit'"));
  assert.ok(tts.length > 0 && tts.includes('const seq = ++ttsSeq;') && tts.includes('const mine = () => seq === ttsSeq;') && tts.includes("    btn.disabled = true;\n    note.textContent = '🔊 읽는 중…';") && tts.includes('.finally(() => { if (mine()) btn.disabled = false; });'), '겹친 확인 — 누르면 단추 끔 · 마지막 확인만(Codex 56차) — 이 단추의 처리 안에서');
  assert.ok(pl.includes("    ttsSeq++; // 🔊 아직 안 끝난 지난 확인은 결과를 적지 않는다\n    $('set-tts-note').textContent = '';"), '창을 열면 지난 확인을 무르고 결과를 지운다');
  assert.ok(!/^import .*speakko/m.test(pl), 'player.js 맨 위 import에 넣지 않는다(누를 때만)');
  assert.ok(read('sw.js').includes("'./js/speakko.js',"));
});

test('🔊 Codex 57차: 시간이 다 되면 그 말이 아직 마지막 말일 때만 cancel(늦게 소리가 나지 않게 · 새 말은 안 끊음) · 시작 기다림 6초와 끝 기다림(글자 수·빠르기) · 시작 뒤 말하기가 멈추면 끝 알림을 기다리지 않음 · 시작 알림 없이 말하는 기기', async () => {
  assert.equal(START_MS, 6000);
  assert.ok(POLL_MS > 0 && POLL_MS <= 500);
  const long = '가'.repeat(40);
  assert.ok(endWaitMs(long, 0.7) > endWaitMs(long, 0.9) && endWaitMs(long, 0.9) > endWaitMs('가', 0.9), '천천히·긴 줄은 더 기다린다');
  assert.equal(endWaitMs(long, 0), endWaitMs(long, 1), '빠르기가 이상하면 1로');
  // 소식 없음 — 기다림 끝에 줄에서 지운다(전엔 cancel 0번, 줄에 남아 늦게 소리가 날 수 있었다)
  const silent = fakeWin({ mode: 'silent' });
  assert.deepEqual(await sayKo('안녕', { win: silent.win, startMs: 20 }), { ok: false, started: false, why: 'silent' });
  assert.equal(silent.cancels(), 1, '시간이 다 되면 cancel');
  // 시작만 하고 끝 알림이 없음 — 끝 기다림 뒤 cancel
  const noend = fakeWin({ mode: 'noend' });
  assert.deepEqual(await sayKo('안녕', { win: noend.win, endMs: 20 }), { ok: false, started: true, why: 'noend' });
  assert.equal(noend.cancels(), 1);
  // 옛 말의 시간이 다 됐을 때 그 사이 새 말을 넣었으면 cancel하지 않는다(새 읽기를 끊지 않게 — 번호로 확인)
  const old = fakeWin({ mode: 'silent' });
  const pOld = sayKo('옛 말', { win: old.win, startMs: 30 });
  const fresh = fakeWin({ mode: 'ok' });
  assert.deepEqual(await sayKo('새 말', { win: fresh.win }), { ok: true, started: true });
  assert.deepEqual(await pOld, { ok: false, started: false, why: 'silent' });
  assert.equal(old.cancels(), 0, '옛 말은 마지막 말이 아니다 — cancel하지 않음');
  // 시작 뒤 말하기가 멈췄는데 끝 알림이 없다 — 끝 기다림(수 초)까지 가지 않고 곧 noend · 이미 끝난 말이라 cancel 없음
  const quiet = fakeWin({ mode: 'quiet', ms: 10 });
  const t0 = Date.now();
  assert.deepEqual(await sayKo(long, { win: quiet.win, rate: 0.7 }), { ok: false, started: true, why: 'noend' });
  assert.ok(Date.now() - t0 < 2000, `곧 끝 (${Date.now() - t0}ms)`);
  assert.equal(quiet.cancels(), 0);
  // 시작 알림 없이 말하는 기기 — 시작 기다림 끝에 말하는 중이면 시작한 것으로, 끝 알림까지 기다린다
  const nostart = fakeWin({ mode: 'nostart', ms: 60 });
  assert.deepEqual(await sayKo('안녕', { win: nostart.win, startMs: 15 }), { ok: true, started: true });
  assert.equal(nostart.cancels(), 0, '말하는 중이면 지우지 않는다');
});
