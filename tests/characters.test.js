// 🎮 그림 저장소 읽기 — 한 장이 깨져도 나머지는 살린다 (2026-09-29, v141 · Codex 12차 반영 v142)
// 태블릿에서 수학 "🎯 받은 몬스터볼 — 던지기"가 눌러도 아무 일이 없었다: characters의 getAll이
// 깨진 그림 한 장 때문에 통째로 실패 → 그림 목록 0마리 → 잡기 후보 0 → 조용히 사다리로.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readEach, isCorruptReadError, deleteIfStillBroken } from '../js/db.js';

const MISSING = () => new DOMException('Data lost due to missing file', 'UnknownError');
const ABORT = () => new DOMException('Transaction was aborted', 'AbortError');

test('readEach: 한 칸이 실패해도 나머지는 다 읽고, 실패한 키와 까닭을 알려 준다', async () => {
  const data = { 1: { id: 1 }, 4: { id: 4 }, anim25: { id: 'anim25' }, '25:shiny': { id: '25:shiny' } };
  const readOne = async (k) => {
    if (k === 4) throw MISSING();
    return data[k];
  };
  const { records, failed } = await readEach([1, 4, 'anim25', '25:shiny'], readOne);
  assert.deepEqual(records.map((r) => r.id), [1, 'anim25', '25:shiny']);
  assert.deepEqual(failed.map((f) => f.key), [4]);
  assert.equal(failed[0].error.name, 'UnknownError');
});

test('readEach: 전부 실패했거나 비었으면 빈 목록 (예외를 던지지 않는다) · 없는 칸은 실패가 아니다', async () => {
  const bad = async () => { throw new Error('x'); };
  const r1 = await readEach([1, 2, 3], bad);
  assert.deepEqual(r1.records, []);
  assert.deepEqual(r1.failed.map((f) => f.key), [1, 2, 3]);
  assert.deepEqual(await readEach([], bad), { records: [], failed: [] });
  assert.deepEqual(await readEach(undefined, bad), { records: [], failed: [] });
  const r2 = await readEach([1, 2], async (k) => (k === 1 ? { id: 1 } : undefined));
  assert.deepEqual(r2, { records: [{ id: 1 }], failed: [] });
});

test('★ 확실한 깨짐만 "깨짐" — 곁 파일 사라짐은 지우고, 잠깐의 실패(Abort 등)는 지우지 않는다 (Codex 12차 #4)', () => {
  assert.equal(isCorruptReadError(MISSING()), true);
  assert.equal(isCorruptReadError(new DOMException('Could not read the blob', 'NotReadableError')), true);
  assert.equal(isCorruptReadError(ABORT()), false);
  assert.equal(isCorruptReadError(new DOMException('inactive', 'TransactionInactiveError')), false);
  assert.equal(isCorruptReadError(new DOMException('Internal error', 'UnknownError')), false, '까닭 없는 UnknownError는 단정하지 않는다');
  assert.equal(isCorruptReadError(null), false);
});

/** 쓰기 트랜잭션 하나를 흉내 — get의 결과(ok·missing·abort)를 정하고, preventDefault·delete를 기록한다 */
function fakeDb(outcome) {
  const log = [];
  const tx = { oncomplete: null, onabort: null };
  const st = {
    get(key) {
      const req = { result: undefined, error: null, onerror: null };
      setTimeout(() => {
        if (outcome === 'ok') { req.result = { id: key, fresh: true }; setTimeout(() => tx.oncomplete && tx.oncomplete()); return; }
        req.error = outcome === 'missing' ? MISSING() : ABORT();
        let prevented = false;
        if (req.onerror) req.onerror({ preventDefault: () => { prevented = true; log.push('prevent'); } });
        if (!prevented) { log.push('abort'); if (tx.onabort) tx.onabort(); return; }
        setTimeout(() => tx.oncomplete && tx.oncomplete());
      });
      return req;
    },
    delete(key) { log.push(`delete ${key}`); },
  };
  tx.objectStore = () => st;
  return { db: { transaction: () => tx }, log };
}

test('★ 지우기 직전에 한 트랜잭션 안에서 다시 읽는다 — 그 사이 새로 받은 그림은 남긴다 (Codex 12차 #3)', async () => {
  const fresh = fakeDb('ok');
  assert.equal(await deleteIfStillBroken(fresh.db, 1), false);
  assert.deepEqual(fresh.log, [], '읽히면 지우지 않는다');

  const broken = fakeDb('missing');
  assert.equal(await deleteIfStillBroken(broken.db, 1), true);
  assert.deepEqual(broken.log, ['prevent', 'delete 1'], '읽기 실패의 기본 동작(중단)을 막아야 delete가 산다');

  const flaky = fakeDb('abort');
  assert.equal(await deleteIfStillBroken(flaky.db, 1), false);
  assert.deepEqual(flaky.log, ['prevent'], '잠깐의 실패는 지우지 않는다');
});

// 소수 검사 — getAll이 실패하면 한 장씩 읽는 길로 가고, 일시적 실패는 다시 읽고, 확실히 깨진 칸만 트랜잭션 안에서 지운다
test('getCharacters: getAll 실패 → getAllKeys + readEach → 다시 읽기 → 깨진 것만 deleteIfStillBroken', async () => {
  const src = await readFile(new URL('../js/db.js', import.meta.url), 'utf8');
  const body = src.slice(src.indexOf('export async function getCharacters'), src.indexOf('export function isCorruptReadError'));
  assert.match(body, /try\s*\{\s*return await promisify\(store\('readonly'\)\.getAll\(\)\)/);
  assert.match(body, /getAllKeys\(\)/);
  assert.match(body, /readEach\(keys/);
  assert.match(body, /filter\(\(f\) => !isCorruptReadError\(f\.error\)\)/, '일시적 실패는 다시 읽는다');
  assert.match(body, /deleteIfStillBroken\(db, k\)/);
  assert.doesNotMatch(body, /\.delete\(k\)/, '따로 지우지 않는다 — 트랜잭션 안에서 다시 읽고 지운다');
});

// 소수 검사 — 조용히 끝나는 길마다 사다리에 이유 한 줄 (조용히 끝나면 "눌러도 아무 일 없음")
test('수학 던지기 버튼: 후보 없음(그림 없음·만날 포켓몬 없음)·저장 실패·화면 오류 → onStop → 사다리에 안내', async () => {
  const src = await readFile(new URL('../js/math.js', import.meta.url), 'utf8');
  assert.match(src, /const stop = \(why\) => \{ if \(typeof onStop === 'function'\) onStop\(why\); \}/);
  assert.match(src, /stop\(hasPics \? 'noavail' : 'nopics'\)/, '그림은 있는데 만날 포켓몬이 없는 것과 그림이 없는 것을 가른다');
  assert.match(src, /stop\('save'\)/, '던지기를 빼는 저장이 실패');
  assert.match(src, /stop\('error'\)/, '잡기 화면을 못 띄움');
  for (const why of ['nopics', 'noavail', 'save', 'error']) assert.match(src, new RegExp(`${why}: '🎯`), `${why} 안내 문구`);
  assert.match(src, /if \(ui\.pendNote\) \{[^}]*ui\.pendNote = null; \}/);
});
