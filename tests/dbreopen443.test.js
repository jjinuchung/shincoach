// 🔌 저장소 다시 열기 (v443 · 2026-11-27 · 11-26 앱 점검 묶음 ①) — node --test tests/dbreopen443.test.js
// db.openDb는 약속 하나를 계속 돌려준다. 예전엔 ① 열기가 한 번 실패하면 그 거절을 ② 연결이 끊기면 닫힌 연결을 앱을 다시 켤 때까지 돌려줬다
// → 그 창은 아무것도 저장하지 못했다(화면에는 💰·포켓몬이 늘어 보이다가 닫을 때 사라진다 · 앱으로 돌아올 때의 다시 읽기도 같은 약속이라 못 고침).
// 고침: 실패(onerror)·끊김(onclose) 때 약속을 비워 다음 호출이 다시 연다 — 내가 만든 약속일 때만(늦게 온 닫힘이 새 연결을 지우지 않게).
// ★ 이 파일의 시험은 차례대로 이어진다(모듈의 연결 하나를 함께 쓴다) — 첫 시험이 「처음 열기 실패」라 다른 시험보다 앞에 둔다
import { fakeIdb } from './fakeidb.js'; // ★ db.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getMath, updateMath, listItems } from '../js/db.js';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const body = (s, name) => { const i = s.indexOf(`function ${name}(`); assert.ok(i >= 0, `${name} 없음`); return s.slice(i, s.indexOf('\n}\n', i)); };

test('🔌 처음 열기가 실패해도 다음 호출이 다시 연다 — 예전엔 같은 거절을 앱을 다시 켤 때까지 돌려줬다 · 열린 뒤에는 그 연결을 계속 쓴다', async () => {
  fakeIdb.failNextOpen();
  await assert.rejects(() => getMath(), /저장소 열기 실패/);
  assert.equal(fakeIdb.opens(), 1);
  const m = await getMath();
  assert.equal(fakeIdb.opens(), 2, '다시 열었다');
  assert.equal(m.rounds, 0);
  await getMath();
  await updateMath((s) => { s.rounds = 5; });
  assert.equal(fakeIdb.opens(), 2, '열린 뒤에는 다시 열지 않는다');
});

test('🔌 연결이 끊기면(onclose) 다음 저장이 다시 열어 이어진다 — 끊기기 전에 저장한 것도 그대로 · 예전엔 닫힌 연결을 계속 돌려줘 InvalidStateError만 났다', async () => {
  const before = fakeIdb.opens();
  assert.equal(fakeIdb.dropConnections(), 1, '열린 연결은 하나');
  const next = await updateMath((s) => { s.rounds += 1; });
  assert.equal(next.rounds, 6, '끊기기 전 5 + 1');
  assert.equal(fakeIdb.opens(), before + 1, '한 번 다시 열었다');
  assert.equal((await getMath()).rounds, 6);
  assert.equal(fakeIdb.opens(), before + 1);
});

test('🔌 끊긴 뒤 겹쳐 부른 호출은 한 번만 연다 · 늦게 온 닫힘 알림은 새 연결을 지우지 않는다', async () => {
  const before = fakeIdb.opens();
  assert.equal(fakeIdb.dropConnections(), 1);
  const [a, b] = await Promise.all([updateMath((s) => { s.rounds += 1; }), getMath(), getMath()]);
  assert.equal(a.rounds, 7);
  assert.ok(b);
  assert.equal(fakeIdb.opens(), before + 1, '셋이 한 연결로');
  fakeIdb.lateClose(); // 이미 끊긴 옛 연결들의 onclose가 한 번 더 온다
  assert.equal((await getMath()).rounds, 7);
  assert.equal(fakeIdb.opens(), before + 1, '새 연결은 그대로');
});

test('🔌 다시 여는 것도 실패하면 그 호출만 실패 — 그다음 호출이 또 연다(영영 막히지 않는다)', async () => {
  const before = fakeIdb.opens();
  fakeIdb.dropConnections();
  fakeIdb.failNextOpen();
  fakeIdb.failNextOpen();
  await assert.rejects(() => updateMath((s) => { s.rounds += 1; }), /저장소 열기 실패/);
  await assert.rejects(() => getMath(), /저장소 열기 실패/);
  assert.equal(fakeIdb.opens(), before + 2);
  const next = await updateMath((s) => { s.rounds += 1; });
  assert.equal(next.rounds, 8, '실패한 저장은 안 들어갔다');
  assert.equal(fakeIdb.opens(), before + 3);
});

test('🔌 indexedDB.open이 그 자리에서 던져도(onerror를 안 거침) 그 호출만 실패 — 다음 호출이 다시 연다 (Codex 252차 #4)', async () => {
  const was = (await getMath()).rounds; // 앞 시험들이 남긴 값(이 파일의 시험은 차례대로 이어진다)
  const before = fakeIdb.opens();
  fakeIdb.dropConnections();
  fakeIdb.throwNextOpen();
  await assert.rejects(() => getMath(), (e) => e.name === 'SecurityError');
  assert.equal(fakeIdb.opens(), before + 1);
  assert.equal((await getMath()).rounds, was, '다시 열어 읽는다');
  assert.equal(fakeIdb.opens(), before + 2);
  // 겹쳐 부른 호출은 같은 거절을 받고, 그 뒤 한 번만 다시 연다
  fakeIdb.dropConnections();
  fakeIdb.throwNextOpen();
  const both = await Promise.allSettled([getMath(), getMath()]);
  assert.deepEqual(both.map((r) => r.status), ['rejected', 'rejected']);
  assert.equal(fakeIdb.opens(), before + 3, '던진 열기는 한 번');
  await Promise.all([getMath(), getMath()]);
  assert.equal(fakeIdb.opens(), before + 4);
});

test('🔌 영상 목록을 읽는 도중 끊긴 것은 「깨진 영상」이 아니다 — 깨짐으로 적으면 🗑로 지우라고 하고, 다시 열린 연결로 멀쩡한 영상이 진짜 지워진다 · 진짜 깨진 한 편은 예전처럼 그 편만', async () => {
  await getMath(); // 저장소를 연다
  for (const id of ['v1', 'v2', 'v3']) fakeIdb.put('items', { id, title: `영상 ${id}`, enText: '', koText: '', thumb: '', duration: 1, videoSize: 1, lastCue: 0, createdAt: Number(id.slice(1)) });
  assert.deepEqual((await listItems()).map((x) => x.id), ['v3', 'v2', 'v1']);
  for (const name of ['InvalidStateError', 'AbortError']) {
    fakeIdb.failNextGet('items', 'v2', name);
    await assert.rejects(() => listItems(), (e) => e.name === name, `${name} — 목록 읽기 한 번이 실패할 뿐 깨짐 표시는 없다`);
    assert.equal(fakeIdb.failsLeft(), 0);
  }
  assert.ok((await listItems()).every((x) => !x.broken), '다음 읽기는 멀쩡');
  // 진짜 깨진 한 편(읽기 오류 — 파일이 사라짐 등)은 그 편만 깨짐으로, 나머지는 그대로 (2026-09-17 사고 — 목록 전체가 멎지 않게)
  for (const name of ['NotReadableError', undefined]) {
    fakeIdb.failNextGet('items', 'v2', name);
    const out = await listItems();
    assert.deepEqual(out.map((x) => [x.id, !!x.broken]).sort(), [['v1', false], ['v2', true], ['v3', false]], String(name));
    assert.equal(out.find((x) => x.id === 'v2').errorName, name || 'Error');
  }
});

test('🔌 코드 — 실패·끊김에서 약속을 비우되 내가 만든 약속일 때만 · 새 판이 열릴 때 닫는 줄(v429)은 그대로 · 판', () => {
  const d = src('js/db.js');
  const fn = d.slice(d.indexOf('function openDb() {'), d.indexOf('/** 트랜잭션 요청을 Promise로 감싸기 */'));
  assert.match(fn, /req\.onerror = \(\) => \{ if \(dbPromise === mine\) dbPromise = null; reject\(req\.error\); \};/);
  assert.match(fn, /db\.onclose = \(\) => \{ if \(dbPromise === mine\) dbPromise = null; \};/);
  assert.match(fn, /db\.onversionchange = \(\) => \{ db\.close\(\); dbPromise = null; window\.dispatchEvent\(new CustomEvent\('shincoach:dbversionchange'\)\); \};/);
  assert.match(fn, /dbPromise = mine;\n[^\n]*\n {2}mine\.catch\(\(\) => \{ if \(dbPromise === mine\) dbPromise = null; \}\);\n {2}return mine;/);
  assert.match(body(d, 'listItems'), /if \(err && \(err\.name === 'InvalidStateError' \|\| err\.name === 'AbortError'\)\) throw err;/);
  const ver = Number((/const CACHE_VERSION = 'v(\d+)';/.exec(src('sw.js')) || [])[1]);
  assert.ok(ver >= 443);
  assert.match(src('js/version.js'), new RegExp(`APP_VERSION = 'v${ver}'`));
});
