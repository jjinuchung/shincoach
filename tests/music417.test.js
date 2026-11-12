// 👨‍👩‍👦 v417 (2026-11-12 아버님 「추천대로」) — node --test tests/music417.test.js
//   「✋ 피아노로 다 쳤어요」를 누르면 아빠·엄마가 부모 비밀번호로 확인해야 ♪ 칸 — 앱은 진짜 피아노 소리를 못 듣는다
//   📤 하루 줄: 누름 · 어른 확인 · 비밀번호 틀림 (옛 날 줄 그대로) · 화면 흐름(취소·틀림·맞음·저장 실패·판 바뀜)은 pianoflow402
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PIANO_DAILY, pianoDayLine, pianoMd } from '../js/piano.js';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('📤 하루 줄 — 누른 날은 「누름 · 어른 확인 · 비밀번호 틀림」 · 옛 날은 옛 줄 · 누르기만 한 날도', () => {
  for (const k of ['pnListenAsk', 'pnPinBad']) assert.ok(PIANO_DAILY.includes(k), k);
  assert.match(src('js/db.js'), /\.\.\.PIANO_DAILY/, '하루 칸(maxOf 병합)에 그대로 들어간다');
  assert.equal(pianoDayLine({ pnListenAsk: 3, pnListenN: 1, pnNotes: 1, pnPinBad: 2 }),
    '🎧 듣고 따라 치기 「다 쳤어요」 누름 3번 · 어른 확인 1번(음표 칸 1) · 비밀번호 틀림 2번');
  assert.equal(pianoDayLine({ pnListenAsk: 2 }), '🎧 듣고 따라 치기 「다 쳤어요」 누름 2번 · 어른 확인 0번(음표 칸 0) · 비밀번호 틀림 0번', '확인을 못 받은 날도 남는다');
  assert.equal(pianoDayLine({ pnPinBad: 1 }), '🎧 듣고 따라 치기 「다 쳤어요」 누름 0번 · 어른 확인 0번(음표 칸 0) · 비밀번호 틀림 1번');
  assert.equal(pianoDayLine({ pnListenN: 2, pnNotes: 2 }), '🎧 듣고 따라 치기 「다 쳤어요」 2번(음표 칸 2)', '옛 날 줄 그대로');
  assert.equal(pianoDayLine({}), '');
});

test('📤 읽는 법 — usage·music.md에 v417 확인 · 아이 화면 말에 셈 없음', () => {
  assert.match(src('js/upload.js'), /v417부터 누름 = 단추를 누른 번 · 어른 확인 = 아빠·엄마가 부모 비밀번호를 넣어 칸이 찬 번 · 비밀번호 틀림 = 그 확인 창에서 틀린 번/);
  assert.match(pianoMd({ log: [{ at: Date.now(), m: 'l', s: 'ode' }] }, '2026-11-12'), /v417부터는 누른 뒤 아빠·엄마가 부모 비밀번호로 확인한 것만 이 줄에 남는다/);
  const v = src('js/pianoview.js');
  assert.match(v, /title: '👨‍👩‍👦 아빠나 엄마에게 확인을 받아요'/);
  assert.match(v, /아빠·엄마 확인을 받아요/, '끝까지 연주한 알림');
  assert.match(v, /\['아빠·엄마 확인', true\]/, '🐾 안내 창');
  for (const s of ['비밀번호 틀림', '누름 ', '어른 확인 ']) assert.ok(!new RegExp(`(toast|textContent)\\([^)]*${s}`).test(v), `${s}은 📤에만`);
});

test('🔌 잇기 — 확인 창 없이는 안 셈 · app.js가 requirePin을 준다 · 비밀번호 창 머리 글·틀림 알림 · sw·앱 판 v417', () => {
  const v = src('js/pianoview.js');
  // 누름 → (확인 받은 판이면 바로) → 확인 창이 없으면 세지 않고 끝 → 확인 뒤에만 saveListen
  const body = v.slice(v.indexOf('function sendListen()'), v.indexOf('function saveListen()'));
  assert.ok(body.indexOf("pnListenAsk: 1") < body.indexOf('if (S.pinPass === pass)'), '누름은 먼저 센다');
  assert.match(body, /if \(!S\.askPin\) \{ toast\([^)]*\); return; \}/, '확인 창이 없으면 세지 않는다');
  assert.match(body, /const pass = S\.passNo;\n\s+if \(S\.pinPass === pass\) \{ saveListen\(\); return; \}/, '확인은 끝낸 판 번호에 (Codex 221차 P2-1)');
  assert.match(body, /S\.askPin\(\(\) => \{\n\s+if \(gen !== S\.gen \|\| pass !== S\.passNo \|\| !S\.passDone \|\| S\.saving\) return;[^\n]*\n\s+S\.pinPass = pass;\n\s+saveListen\(\);/);
  assert.match(v, /S\.passNo \+= 1;[^\n]*\n\s+S\.passDone = true;/, '🎧 판이 끝날 때마다 새 번호');
  assert.match(body, /onBad: \(\) => \{ applyDailyDelta\(clockDay\(\), \{ pnPinBad: 1 \}\)/);
  assert.equal((v.match(/saveListen\(\)/g) || []).length, 3, '부르는 곳은 확인 뒤·확인 받은 판 둘뿐(+정의)');
  assert.equal((v.match(/'btn pn-done', \(\) => sendListen\(\)\)/g) || []).length, 1, '버튼은 sendListen으로');
  assert.match(v, /S\.passDone = false;\n\s+S\.pinPass = 0;/, '곡·줄이 바뀌면 확인도 처음부터');
  assert.match(v, /if \(r && r\.ok\) S\.pinPass = 0;/, '저장되면 확인을 씀');
  assert.match(src('js/app.js'), /initMusic\(\{ showView, requirePin \}\)/);
  const pl = src('js/player.js');
  assert.match(pl, /export function requirePin\(onOk, opt = \{\}\)/);
  assert.match(pl, /\$\('pin-title'\)\.textContent = opt\.title \|\| PIN_TITLE;/, '다른 곳(⚙ 설정 등)은 옛 머리 글로 돌아간다');
  assert.match(pl, /if \(bad\) \{ try \{ bad\(\); \}/);
  // Codex 221차 P2-2 — 요청 번호: 견주는 사이 취소·Esc·다른 요청이면 옛 결과는 버림 · 두 번 눌러도 한 번
  assert.match(pl, /export function requirePin\(onOk, opt = \{\}\) \{\n\s+pinReq \+= 1;/);
  assert.match(pl, /\$\('pin-cancel'\)\.addEventListener\('click', \(\) => \{ pinReq \+= 1; \$\('dlg-pin'\)\.close\(\); \}\);/);
  assert.match(pl, /\$\('dlg-pin'\)\.addEventListener\('cancel', \(\) => \{ pinReq \+= 1; \}\);/);
  assert.match(pl, /const req = pinReq;\n\s+const cb = pinCallback;\n\s+const bad = pinBad;\n\s+const ok = await checkPin\(input\.value\.trim\(\)\);\n\s+if \(req !== pinReq \|\| !\$\('dlg-pin'\)\.open\) return;/);
  assert.match(pl, /pinReq \+= 1;\n\s+pinCallback = null;\n\s+pinBad = null;\n\s+\$\('dlg-pin'\)\.close\(\);\n\s+if \(cb\) cb\(\);/);
  const h = src('index.html');
  assert.match(h, /<h2 id="pin-title">🔒 부모님 비밀번호<\/h2>\s*<p id="pin-lead" class="pin-lead" hidden><\/p>/);
  assert.ok(Number((/CACHE_VERSION = 'v(\d+)'/.exec(src('sw.js')) || [])[1]) >= 417, 'sw v417 이상');
  assert.ok(Number((/APP_VERSION = 'v(\d+)'/.exec(src('js/version.js')) || [])[1]) >= 417, '앱 판 v417 이상');
});
