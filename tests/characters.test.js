// 🎮 그림 저장소 읽기 — 한 장이 깨져도 나머지는 살린다 (2026-09-29)
// 태블릿에서 수학 "🎯 받은 몬스터볼 — 던지기"가 눌러도 아무 일이 없었다: characters의 getAll이
// 깨진 그림 한 장 때문에 통째로 실패 → 그림 목록 0마리 → 잡기 후보 0 → 조용히 사다리로.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readEach } from '../js/db.js';

test('readEach: 한 칸이 깨져도 나머지는 다 읽고, 깨진 키를 알려 준다', async () => {
  const data = { 1: { id: 1 }, 4: { id: 4 }, anim25: { id: 'anim25' }, '25:shiny': { id: '25:shiny' } };
  const readOne = async (k) => {
    if (k === 4) throw new DOMException('Data lost due to missing file', 'UnknownError');
    return data[k];
  };
  const { records, broken } = await readEach([1, 4, 'anim25', '25:shiny'], readOne);
  assert.deepEqual(records.map((r) => r.id), [1, 'anim25', '25:shiny']);
  assert.deepEqual(broken, [4]);
});

test('readEach: 전부 깨졌거나 비었으면 빈 목록 (예외를 던지지 않는다)', async () => {
  const bad = async () => { throw new Error('x'); };
  assert.deepEqual(await readEach([1, 2, 3], bad), { records: [], broken: [1, 2, 3] });
  assert.deepEqual(await readEach([], bad), { records: [], broken: [] });
  assert.deepEqual(await readEach(undefined, bad), { records: [], broken: [] });
});

test('readEach: 없는 칸(undefined)은 건너뛰되 깨진 것으로 세지 않는다', async () => {
  const { records, broken } = await readEach([1, 2], async (k) => (k === 1 ? { id: 1 } : undefined));
  assert.deepEqual(records, [{ id: 1 }]);
  assert.deepEqual(broken, []);
});

// 소스 검사 — getAll이 실패하면 한 장씩 읽는 길로 가고, 깨진 칸은 지운다 (지워야 다음 getAll이 다시 된다)
test('getCharacters: getAll 실패 → getAllKeys + readEach, 깨진 칸 delete', async () => {
  const src = await readFile(new URL('../js/db.js', import.meta.url), 'utf8');
  const body = src.slice(src.indexOf('export async function getCharacters'), src.indexOf('export async function readEach'));
  assert.match(body, /try\s*\{\s*return await promisify\(store\('readonly'\)\.getAll\(\)\)/);
  assert.match(body, /getAllKeys\(\)/);
  assert.match(body, /readEach\(keys/);
  assert.match(body, /\.delete\(k\)/);
});

// 소스 검사 — 그림이 없어 못 띄우면 사다리에 이유를 보여 준다 (조용히 끝나면 "눌러도 아무 일 없음")
test('수학 던지기 버튼: 후보가 없으면 onStop(nopool) → 사다리에 안내 한 줄', async () => {
  const src = await readFile(new URL('../js/math.js', import.meta.url), 'utf8');
  assert.match(src, /if \(!pool\.length\) \{[^}]*onStop\('nopool'\)/);
  assert.match(src, /onStop: \(why\) => \{ if \(why === 'nopool'\) ui\.pendNote = /);
  assert.match(src, /if \(ui\.pendNote\) \{[^}]*ui\.pendNote = null; \}/);
});
