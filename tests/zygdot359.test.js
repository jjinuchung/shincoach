// 🟢 v359 Codex 163차 #4 — 지가르데 도트를 받는 사이 1%폼이 되면(지가르데가 도감에 들어옴) 늦게 온 50%폼 도트를 주지 않는다
// (sprite.js는 실패한 id를 5분 동안 다시 받지 않아서 — 받기를 일부러 실패시키는 zygform359와 따로 · 깨끗한 모듈 상태에서)
// node --test tests/zygdot359.test.js
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyProfile } from '../js/db.js';
import { initProfile, flushProfile, reloadProfile, getLook } from '../js/xp.js';
import { ensureAnim, animUrl } from '../js/sprite.js';
import { CORE_FORM_URL } from '../js/zygarde.js';

async function seed(p) {
  await initProfile();
  await flushProfile();
  const cur = fakeIdb.get('profile', 'me') || emptyProfile();
  fakeIdb.put('profile', { ...cur, ...p, id: 'me', updatedAt: (cur.updatedAt || 0) + 1 });
  await reloadProfile();
}

test('🟢 받는 사이 1%폼이 되면 늦은 도트는 null · 그 뒤로도 animUrl은 null (도감에서 50%가 되면 다시 도트)', async () => {
  const realFetch = globalThis.fetch;
  let arrive = null;
  globalThis.fetch = () => new Promise((res) => { arrive = res; });
  try {
    await seed({ caught: { 25: 1 }, zyg: { core: 1, cells: 1, keys: [] } });
    assert.equal(getLook(718).formUrl, null, '도감에 없으면 원작 그림·도트');
    const p = ensureAnim(718);
    for (let i = 0; i < 40 && !arrive; i++) await new Promise((r) => setTimeout(r, 5));
    assert.ok(arrive, '받기 시작함');
    await seed({ caught: { 25: 1, 718: 1 } }); // 받는 사이 논술에서 잡음 → 1%폼
    assert.equal(getLook(718).formUrl, CORE_FORM_URL);
    arrive({ ok: true, status: 200, blob: async () => new Blob(['GIF89a'], { type: 'image/gif' }) });
    assert.equal(await p, null, '늦은 50%폼 도트가 1%폼 그림을 덮지 않는다');
    assert.equal(animUrl(718), null);
    // 셀 50 → 50%폼이면 받아 둔 도트를 다시 쓴다 (받은 것은 버리지 않았다)
    await seed({ zyg: { core: 1, cells: 50, keys: [], seen: 50 } });
    assert.equal(getLook(718).formUrl, null);
    assert.ok(String(animUrl(718)).startsWith('blob:'), '50%폼은 도트');
  } finally {
    globalThis.fetch = realFetch;
  }
});
