// ☁️ 태블릿 자동 백업 (v361) — 아버님 「백업에서 가장 중요한 것은 아이가 그동안 모아놓은 포켓몬스터들이야」
// ★ 맨 먼저: 백업 → 빈 기기(새 태블릿)에 되살리기 → 모은 포켓몬(도감·데리고 있는 수·레벨·이로치·알·코인·가방)이 그대로인가
// 그다음: ⚙ 켠 기기만 · 하루 한 번 · 바뀐 것이 없으면 안 올림 · 빈 기기는 안 올림 · 실패 뒤 30분 · 열쇠는 백업에 없음 · 👻 영상 자리
// 기록은 모두 지어낸 것 (공개 저장소 — 진우 기록 금지)
import { fakeIdb } from './fakeidb.js'; // ★ db.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); }, removeItem: (k) => { mem.delete(k); } };

const {
  runBackup, listBackups, loadBackup, restoreBackup, monCount, backupSummary, summaryLine, backupDue, newestFirst, dayOfName,
  backupPath, backupLine, backupFresh, isEmptyData, gunzipText, textHash, deviceOf, readBackupState, FAIL_GAP_MS, LIST_N, sizeText,
  backupAhead, SAME_GAP_MS, whyText,
} = await import('../js/cloudbackup.js');
const db = await import('../js/db.js');
const { readGhosts, pickGhost, addGhosts, ghostsOf, GHOST_MAX } = await import('../js/ghosts.js');

const TOKEN = 'github_pat_TEST_ONLY_not_a_real_key_1234567890';
const REPO = '/repos/jjinuchung/shincoach-data/contents/';
const at = (s) => new Date(s).getTime(); // 이 기기 시간대

/** 비공개 저장소 흉내 — contents API(GET JSON·GET raw·PUT)와 폴더 목록 */
function fakeGitHub({ failPut = 0 } = {}) {
  const files = new Map(); // 경로 → 바이트
  const calls = [];
  let fails = failPut;
  const fn = async (url, o = {}) => {
    const u = new URL(url);
    const path = decodeURIComponent(u.pathname.slice(REPO.length));
    const method = o.method || 'GET';
    calls.push({ method, path, auth: o.headers && o.headers.Authorization });
    if (method === 'PUT') {
      if (fails > 0) { fails--; return { status: 500, json: async () => ({}) }; }
      const body = JSON.parse(o.body);
      files.set(path, Uint8Array.from(atob(body.content), (c) => c.charCodeAt(0)));
      return { status: 201, json: async () => ({}) };
    }
    if (files.has(path)) {
      const b = files.get(path);
      if (o.headers && o.headers.Accept === 'application/vnd.github.raw') return { status: 200, headers: { get: () => String(b.length) }, blob: async () => new Blob([b]) };
      return { status: 200, json: async () => ({ sha: `sha-${path}`, size: b.length }) };
    }
    const kids = [...files.keys()].filter((k) => k.startsWith(`${path}/`));
    if (kids.length) return { status: 200, json: async () => kids.map((k) => ({ type: 'file', name: k.slice(path.length + 1), path: k, size: files.get(k).length })) };
    return { status: 404, json: async () => ({}) };
  };
  return { fn, files, calls, puts: () => calls.filter((c) => c.method === 'PUT') };
}

/** 지어낸 아이 기록 — 포켓몬은 진화·퓨전·이로치·레벨·알까지 */
function seedProfile() {
  return {
    ...db.emptyProfile(),
    xp: 12345, coins: 777, coinsEarned: 5000, throws: 90, catches: 40, stonesSpent: 12,
    caught: { 25: 3, 133: 2, 658: 1, 718: 1, 150: 1, 4: 0 },
    mons: { 25: { lv: 30, shiny: true, shinyAt: 5, gear: 'cap' }, 133: { evo: 1, lv: 12 }, 658: { lv: 50, rx: 3 }, 718: { lv: 5 }, 150: { fused: 0 } },
    items: { pokeball: 10, shiny_stone: 1, potion: 2 },
    partner: 658,
    eggs: [{ id: 'e1', mon: 7, days: ['2026-10-27'], hatchedAt: 0 }, { id: 'e0', mon: 1, days: ['2026-10-01'], hatchedAt: 123, seen: true }],
    letters: { start: at('2026-10-27T08:00:00'), seen: { 1: 1 }, sent: [], star: 0 },
    updatedAt: 1000,
  };
}

const MATH = { id: 'math', concepts: { 'frac.mean': { done: true } }, placed: {}, log: [] };
const ITEM = { id: 'old1', title: '지어낸 영상', videoName: 'made_up_1.mp4', videoType: 'video/mp4', videoSize: 9, duration: 600, thumb: '', enText: 'x', koText: '', lastCue: 7, createdAt: at('2026-09-01T10:00:00'), updatedAt: 1 };

async function seedDevice() {
  await db.getProfile(); // 저장소를 연다 (fakeidb는 처음 열 때 만든다)
  fakeIdb.put('profile', seedProfile());
  fakeIdb.put('profile', MATH);
  fakeIdb.put('daily', { date: '2026-10-28', seconds: 1800, doneKeys: ['old1|123'] });
  fakeIdb.put('sentenceStats', { key: 'old1|123', itemId: 'old1', start: 12.3, done: 1, box: 2, dueAt: '2026-10-30' });
  fakeIdb.put('items', ITEM);
}

function newDevice() {
  fakeIdb.clear();
  for (const k of [...mem.keys()]) if (k !== 'shincoach.dataToken' && k !== 'shincoach.settings') mem.delete(k);
}

function setUp({ on = true, token = true } = {}) {
  mem.clear();
  fakeIdb.clear();
  if (token) mem.set('shincoach.dataToken', TOKEN);
  if (on) mem.set('shincoach.settings', JSON.stringify({ cloudBackup: true, timeWeekday: 60 }));
}

test('★ 백업 → 새 태블릿에 되살리기 → 모은 포켓몬이 그대로 (도감·가진 수·레벨·이로치·파트너·알·코인·가방)', async () => {
  setUp();
  await seedDevice();
  const gh = fakeGitHub();
  const now = at('2026-10-29T07:30:00');
  const r = await runBackup({ fetchFn: gh.fn, now, locks: null });
  assert.equal(r.ok, true, `올렸다 (${r.why || ''})`);
  assert.equal(r.path, 'backup/2026-10-29.json.gz', '날짜 이름 · 압축');
  const bytes = gh.files.get('backup/2026-10-29.json.gz');
  assert.equal(bytes[0], 0x1f); assert.equal(bytes[1], 0x8b); // gzip 머리
  const before = structuredClone(await db.getProfile()); // 저장된 그대로 (cloneProfile은 빈 칸을 채워 견줄 수 없다)

  newDevice(); // 태블릿이 망가져 새 태블릿 — 기록은 비고 열쇠만 다시 넣었다
  assert.equal(await db.getProfile(), undefined, '새 기기는 비어 있다');
  const list = await listBackups({ fetchFn: gh.fn });
  assert.equal(list.length, 1);
  const data = await loadBackup(list[0], { fetchFn: gh.fn });
  assert.equal(data.kind, 'cloud');
  const res = await restoreBackup(data);
  const after = await db.getProfile();
  assert.deepEqual(after, before, '프로필(포켓몬·코인·가방·알·편지…)이 한 칸도 다르지 않다');
  assert.deepEqual(monCount(after), { have: 7, species: 5, eggs: 1 }, '가진 7마리(이브이 하나는 진화로 나감) · 도감 5종 · 부화 전 알 1');
  assert.equal(res.same, true, '되살린 뒤 셈 = 백업 셈');
  assert.equal(res.lead, true, '빈 기기 — 백업이 앞선다');
  assert.deepEqual(res.got, res.want);
  assert.equal(after.mons[25].shiny, true, '🌈 이로치');
  assert.equal(after.mons[658].lv, 50, '⬆️ 레벨');
  assert.equal(after.partner, 658, '🤝 파트너');
  assert.equal(after.coins, 777); assert.equal(after.items.pokeball, 10);
  assert.deepEqual(await db.getMath(), MATH, '🔢 수학 진도');
  assert.equal((await db.getAllSentenceStats()).length, 1, '✍️ 문장 기록');
  assert.equal((await db.listDaily()).length, 1, '📚 하루 기록');
});

test('되살리기는 병합 — 이미 쓰던 기기에 옛 백업을 넣어도 지금 포켓몬이 줄지 않는다', async () => {
  setUp();
  await seedDevice();
  const gh = fakeGitHub();
  await runBackup({ fetchFn: gh.fn, now: at('2026-10-29T07:30:00'), locks: null });
  const p = await db.getProfile();
  fakeIdb.put('profile', { ...p, caught: { ...p.caught, 6: 1 }, coins: 900, updatedAt: 2000 }); // 그 뒤 리자몽을 잡고 코인을 씀·벌었다
  const data = await loadBackup((await listBackups({ fetchFn: gh.fn }))[0], { fetchFn: gh.fn });
  const res = await restoreBackup(data);
  const after = await db.getProfile();
  assert.equal(after.caught[6], 1, '그 뒤 잡은 포켓몬이 남는다');
  assert.equal(after.coins, 900, '코인은 나중에 저장된 쪽');
  assert.equal(res.lead, false, '쓰던 기기(도감이 백업보다 큼) — 지금 쪽이 앞선다');
  assert.equal(res.same, true, '백업의 포켓몬도 다 있다');
  assert.ok(res.got.have > res.want.have);
});

test('★ 새 태블릿에서 첫 선물(💰·스타터)을 받은 뒤 되살려도 — 💰·가방·알·파트너는 백업 쪽 (진짜 화면에서 찾음)', async () => {
  setUp();
  await seedDevice();
  const gh = fakeGitHub();
  await runBackup({ fetchFn: gh.fn, now: at('2026-10-29T07:30:00'), locks: null });
  const before = structuredClone(await db.getProfile());
  newDevice();
  // 새 태블릿 — 처음 켜서 선물을 받았다(지금 저장 · 백업보다 나중)
  fakeIdb.put('profile', { ...db.emptyProfile(), coins: 400, items: { pokeball: 3 }, partner: 25, updatedAt: 9e12 });
  const res = await restoreBackup(await loadBackup((await listBackups({ fetchFn: gh.fn }))[0], { fetchFn: gh.fn }));
  const after = await db.getProfile();
  assert.equal(res.lead, true, '도감이 백업보다 작다 — 백업이 앞선다');
  assert.equal(after.coins, 777, '💰 백업 쪽 (400이 아니다)');
  assert.deepEqual(after.items, before.items, '🎒 가방 백업 쪽');
  assert.equal(after.partner, 658, '🤝 파트너 백업 쪽');
  const egg = (l) => l.map((e) => ({ id: e.id, mon: e.mon, days: e.days, hatchedAt: e.hatchedAt, seen: !!e.seen })); // 병합이 seen: false를 채운다(같은 뜻)
  assert.deepEqual(egg(after.eggs), egg(before.eggs), '🥚 알 그대로');
  assert.deepEqual(after.mons, before.mons, '레벨·이로치·꾸밈 그대로');
  assert.deepEqual(monCount(after), monCount(before));
  assert.equal(res.same, true);
  assert.equal(after.updatedAt, 9e12 + 1, '저장 시각이 새 기기 것보다 뒤 — 다음 병합에서도 되살린 쪽이 이긴다');
});

test('새 태블릿에서 몇 마리 잡은 뒤 되살려도 — 그 포켓몬도 남고 백업 쪽이 앞선다', async () => {
  setUp();
  await seedDevice();
  const gh = fakeGitHub();
  await runBackup({ fetchFn: gh.fn, now: at('2026-10-29T07:30:00'), locks: null });
  newDevice();
  fakeIdb.put('profile', { ...db.emptyProfile(), coins: 50, caught: { 1: 1, 4: 1 }, mons: { 1: { lv: 3 } }, updatedAt: Date.now() + 5000 });
  const res = await restoreBackup(await loadBackup((await listBackups({ fetchFn: gh.fn }))[0], { fetchFn: gh.fn }));
  const after = await db.getProfile();
  assert.equal(res.lead, true, '도감 2종 < 백업 5종');
  assert.equal(after.coins, 777);
  assert.equal(after.caught[1], 1, '새 기기에서 잡은 이상해씨도 남는다');
  assert.equal(after.mons[1].lv, 3, '그 레벨도');
  assert.equal(monCount(after).have, 9, '백업 7 + 새로 잡은 2');
  assert.equal(res.same, true);
});

test('🔍 165차 #1 — 새 기기의 도감 종 수가 백업과 같아도 백업이 앞선다 · 쓰던 태블릿은 코인을 쓰고 알을 깨도 그대로', async () => {
  setUp();
  await seedDevice();
  const gh = fakeGitHub();
  await runBackup({ fetchFn: gh.fn, now: at('2026-10-29T07:30:00'), locks: null });
  const bk = structuredClone(await db.getProfile());
  const load = async () => loadBackup((await listBackups({ fetchFn: gh.fn }))[0], { fetchFn: gh.fn });
  // (가) 새 기기 — 같은 다섯 종을 한 마리씩 잡았지만 XP·번 코인은 작다
  newDevice();
  fakeIdb.put('profile', { ...db.emptyProfile(), caught: { 25: 1, 133: 1, 658: 1, 718: 1, 150: 1 }, coins: 400, coinsEarned: 400, xp: 300, catches: 5, updatedAt: 9e12 });
  const a = await restoreBackup(await load());
  assert.equal(a.lead, true, '도감은 같아도 XP·번 코인이 작다 — 이은 기기가 아니다');
  assert.equal((await db.getProfile()).coins, 777, '💰 백업 쪽');
  assert.equal(monCount(await db.getProfile()).eggs, 1, '🥚 백업 쪽');
  // (나) 쓰던 태블릿 — 백업 뒤에 코인을 쓰고 알을 깼다(줄지 않는 수는 그대로거나 큼)
  newDevice();
  fakeIdb.put('profile', { ...bk, coins: 100, eggs: [{ ...bk.eggs[0], hatchedAt: 456 }, bk.eggs[1]], caught: { ...bk.caught, 7: 1 }, catches: bk.catches + 1, updatedAt: 9e12 });
  const b = await restoreBackup(await load());
  assert.equal(b.lead, false, '쓰던 기기 — 지금 쪽이 앞선다');
  const after = await db.getProfile();
  assert.equal(after.coins, 100, '쓴 코인이 옛 백업으로 되살아나지 않는다');
  assert.equal(after.eggs.find((e) => e.id === 'e1').hatchedAt, 456, '깬 알이 다시 알로 돌아가지 않는다');
  assert.equal(b.same, true);
  assert.equal(backupAhead(null, bk), true);
  assert.equal(backupAhead(bk, bk), false, '같으면 이은 기기');
  for (const k of ['coinsEarned', 'xp', 'catches']) assert.equal(backupAhead({ ...bk, [k]: bk[k] - 1 }, bk), true, `${k}가 작으면`);
  assert.equal(backupAhead({ ...bk, caught: { 25: 9 } }, bk), true, '도감이 작으면');
});

test('🔍 165차 #2 — 되살린 뒤 영상을 다 넣기 전에 다시 백업해도 영상 자리가 이어진다 (다음 기기에서 진도·🏁 보상 기록)', async () => {
  setUp();
  await seedDevice();
  const p0 = await db.getProfile();
  fakeIdb.put('profile', { ...p0, parcels: { 'video:old1': '2026-10-20' } }); // 🏁 이 영상 보상은 이미 받았다
  const gh = fakeGitHub();
  await runBackup({ fetchFn: gh.fn, now: at('2026-10-29T07:30:00'), locks: null });
  const load = async () => loadBackup((await listBackups({ fetchFn: gh.fn }))[0], { fetchFn: gh.fn });
  newDevice(); // 새 태블릿 A — 되살리고 영상은 아직 안 넣었다
  await restoreBackup(await load());
  const r = await runBackup({ fetchFn: gh.fn, now: at('2026-10-30T07:30:00'), locks: null });
  assert.equal(r.ok, true);
  const data = await load();
  assert.equal(data.items.find((it) => it.id === 'old1').videoName, 'made_up_1.mp4', 'A의 백업에도 영상 자리');
  newDevice(); // 또 새 태블릿 B
  await restoreBackup(data);
  const id = await db.addItem({ title: '지어낸 영상', videoFile: { name: 'made_up_1.mp4', type: 'video/mp4', size: 9 }, enText: 'x' });
  assert.equal(id, 'old1', '옛 id로');
  assert.equal((await db.getAllSentenceStats()).filter((x) => x.itemId === id).length, 1, '문장 기록이 붙는다');
  assert.equal((await db.getProfile()).parcels['video:old1'], '2026-10-20', '🏁 받은 기록도 같은 id — 또 받지 않는다');
  const again = await db.exportStats();
  assert.equal(again.items.filter((it) => it.id === 'old1').length, 1, '넣은 뒤엔 진짜 영상 하나만(자리 중복 없음)');
  assert.equal(again.items[0].ghost, undefined);
});

test('🔍 165차 B — 도감이 지난 백업보다 작아지면(기록이 깨짐) 올리지 않는다 · 📊에 까닭 · 지난 백업은 그대로', async () => {
  setUp();
  await seedDevice();
  const gh = fakeGitHub();
  await runBackup({ fetchFn: gh.fn, now: at('2026-10-29T07:30:00'), locks: null });
  assert.equal(readBackupState().ok.species, 5);
  const p = await db.getProfile();
  fakeIdb.put('profile', { ...p, caught: { 25: 3, 133: 2 }, updatedAt: 3000 }); // 깨진 프로필
  const r = await runBackup({ fetchFn: gh.fn, now: at('2026-10-30T07:30:00'), locks: null });
  assert.equal(r.why, 'shrink');
  assert.equal((await runBackup({ force: true, fetchFn: gh.fn, now: at('2026-10-30T09:00:00'), locks: null })).why, 'shrink', '「지금 백업하기」도');
  assert.deepEqual([...gh.files.keys()], ['backup/2026-10-29.json.gz'], '지난 백업만');
  const st = readBackupState();
  assert.equal(st.try.from, 5); assert.equal(st.try.to, 2);
  assert.match(backupLine(st, { on: true, token: true }, () => 't'), /도감이 지난 백업보다 작아졌어요\(5종 → 2종\)/);
  assert.match(whyText('shrink', { from: 9, to: 1 }), /9종 → 1종/);
  fakeIdb.put('profile', { ...p, caught: { ...p.caught, 6: 1 }, updatedAt: 4000 }); // 되살려 고쳤다 — 다시 올라간다
  assert.equal((await runBackup({ force: true, fetchFn: gh.fn, now: at('2026-10-30T10:00:00'), locks: null })).ok, true);
  assert.equal(readBackupState().ok.species, 6);
});

test('열쇠·⚙ 설정은 백업에 들어가지 않는다 · 기기 이름만 짧게', async () => {
  setUp();
  await seedDevice();
  const gh = fakeGitHub();
  await runBackup({ fetchFn: gh.fn, now: at('2026-10-29T07:30:00'), locks: null });
  const text = await gunzipText(gh.files.get('backup/2026-10-29.json.gz'));
  assert.ok(!text.includes(TOKEN), '열쇠 없음');
  assert.ok(!text.includes('github_pat_'), '열쇠 꼴도 없음');
  assert.ok(!text.includes('cloudBackup'), '설정 없음');
  const data = JSON.parse(text);
  assert.equal(data.app, 'shincoach');
  assert.ok(['PC', 'Android', 'iPhone', 'iPad'].includes(data.device));
  assert.equal(data.items[0].videoName, 'made_up_1.mp4', '영상 파일 이름은 들어간다(👻 다시 이어 붙이기)');
  assert.equal(data.items[0].enText, undefined, '자막 전문은 안 들어간다');
  assert.ok(gh.calls.every((c) => c.auth === `Bearer ${TOKEN}`), '열쇠는 머리글로만');
});

test('⚙ 꺼짐(처음 그대로)·열쇠 없음·인터넷 없음이면 아무것도 안 보낸다 — 어머님 아이폰은 꺼 둔 채', async () => {
  setUp({ on: false });
  await seedDevice();
  const gh = fakeGitHub();
  assert.equal((await runBackup({ fetchFn: gh.fn, now: at('2026-10-29T07:30:00'), locks: null })).why, 'off');
  assert.equal((await runBackup({ force: true, fetchFn: gh.fn, now: at('2026-10-29T07:30:00'), locks: null })).why, 'off', '「지금 백업하기」도 켠 기기만');
  setUp({ token: false });
  await seedDevice();
  assert.equal((await runBackup({ fetchFn: gh.fn, now: at('2026-10-29T07:30:00'), locks: null })).why, 'token');
  assert.equal(gh.calls.length, 0, '저장소에 묻지도 않는다');
  const src = readFileSync(new URL('../js/player.js', import.meta.url), 'utf8');
  assert.match(src, /cloudBackup: false/, '⚙ 기본값은 꺼짐');
});

test('하루 한 번 — 같은 날 다시 부르면 안 올림 · 다음 날 바뀌었으면 새 파일 · 안 바뀌었으면 안 올림', async () => {
  setUp();
  await seedDevice();
  const gh = fakeGitHub();
  assert.equal((await runBackup({ fetchFn: gh.fn, now: at('2026-10-29T07:30:00'), locks: null })).ok, true);
  assert.equal((await runBackup({ fetchFn: gh.fn, now: at('2026-10-29T21:00:00'), locks: null })).why, 'done');
  assert.equal(gh.puts().length, 1);
  // 다음 날 — 아무것도 안 바뀜 → 한 시간 동안은 다시 보지 않는다
  const t1 = at('2026-10-30T07:30:00');
  assert.equal((await runBackup({ fetchFn: gh.fn, now: t1, locks: null })).why, 'same');
  assert.equal(readBackupState().sameAt, t1);
  const p = await db.getProfile();
  fakeIdb.put('profile', { ...p, caught: { ...p.caught, 6: 1 }, updatedAt: 3000 }); // 그 뒤 리자몽을 잡았다
  assert.equal((await runBackup({ fetchFn: gh.fn, now: t1 + SAME_GAP_MS - 1, locks: null })).why, 'same', '한 시간 안은 내보내지도 않는다');
  assert.equal(readBackupState().sameAt, t1);
  assert.equal(gh.puts().length, 1);
  // 🔍 Codex 165차 #4 — 한 시간 뒤 다시 보면 바뀐 것을 그날 올린다 (전에는 그날 종일 안 봐 다음 날까지 기다렸다)
  const r = await runBackup({ fetchFn: gh.fn, now: t1 + SAME_GAP_MS, locks: null });
  assert.equal(r.ok, true);
  assert.equal((await runBackup({ fetchFn: gh.fn, now: at('2026-10-30T21:00:00'), locks: null })).why, 'done', '올린 날은 끝');
  assert.deepEqual([...gh.files.keys()].sort(), ['backup/2026-10-29.json.gz', 'backup/2026-10-30.json.gz'], '날마다 다른 파일 — 앞날 백업은 그대로');
  // 📊 「지금 백업하기」(force)는 같은 날도 다시
  assert.equal((await runBackup({ force: true, fetchFn: gh.fn, now: at('2026-10-30T22:00:00'), locks: null })).ok, true);
  assert.equal(gh.puts().length, 3);
});

test('빈 기기(새 태블릿·지워진 기록)는 올리지 않는다 — 빈 기록이 백업을 덮지 않게', async () => {
  setUp();
  await db.getProfile();
  fakeIdb.put('profile', db.emptyProfile());
  const gh = fakeGitHub();
  const r = await runBackup({ force: true, fetchFn: gh.fn, now: at('2026-10-29T07:30:00'), locks: null });
  assert.equal(r.why, 'empty');
  assert.equal(gh.puts().length, 0);
  assert.equal(readBackupState().try.why, 'empty', '📊에 까닭');
  assert.equal(isEmptyData({ app: 'shincoach', profile: [{ id: 'math', concepts: { a: {} } }], sentenceStats: [] }), false, '수학 진도만 있어도 빈 기기가 아니다');
});

test('못 올리면 까닭을 적고 30분 뒤 다시 — 그동안은 묻지 않는다', async () => {
  setUp();
  await seedDevice();
  const gh = fakeGitHub({ failPut: 1 });
  const t0 = at('2026-10-29T07:30:00');
  const r = await runBackup({ fetchFn: gh.fn, now: t0, locks: null });
  assert.equal(r.ok, false);
  assert.match(readBackupState().try.why, /GitHub가 받지 않았어요/);
  assert.equal((await runBackup({ fetchFn: gh.fn, now: t0 + FAIL_GAP_MS - 1, locks: null })).why, 'wait');
  assert.equal((await runBackup({ fetchFn: gh.fn, now: t0 + FAIL_GAP_MS, locks: null })).ok, true);
  assert.equal(readBackupState().ok.day, '2026-10-29');
});

test('다른 창이 백업 중이면 이번엔 그만 (Web Locks ifAvailable)', async () => {
  setUp();
  await seedDevice();
  const gh = fakeGitHub();
  let opts = null;
  const locks = { request: (name, o, cb) => { opts = { name, ...o }; return cb(null); } };
  const r = await runBackup({ fetchFn: gh.fn, now: at('2026-10-29T07:30:00'), locks });
  assert.equal(r.why, 'busy');
  assert.deepEqual(opts, { name: 'shincoach-backup', ifAvailable: true });
  assert.equal(gh.calls.length, 0);
});

test('👻 되살린 뒤 같은 영상 파일을 다시 넣으면 옛 id로 — 끝낸 문장·🔁 복습·이어 보기가 이어진다', async () => {
  setUp();
  await seedDevice();
  const gh = fakeGitHub();
  await runBackup({ fetchFn: gh.fn, now: at('2026-10-29T07:30:00'), locks: null });
  newDevice();
  const res = await restoreBackup(await loadBackup((await listBackups({ fetchFn: gh.fn }))[0], { fetchFn: gh.fn }));
  assert.equal(res.ghosts, 1, '다시 넣으면 이어질 영상 1편');
  assert.equal(res.already, 0);
  assert.equal(readGhosts()[0].id, 'old1');
  const other = await db.addItem({ title: '다른 영상', videoFile: { name: 'other.mp4', type: 'video/mp4', size: 3 }, enText: 'y' });
  assert.notEqual(other, 'old1', '다른 파일은 새 id');
  const id = await db.addItem({ title: '이름을 바꿔 넣음', videoFile: { name: 'made_up_1.mp4', type: 'video/mp4', size: 9 }, enText: 'x', duration: 600 });
  assert.equal(id, 'old1', '같은 파일 이름 → 옛 id');
  const it = (await db.listItems()).find((x) => x.id === 'old1');
  assert.equal(it.lastCue, 7, '보던 자리');
  assert.equal(it.createdAt, ITEM.createdAt, '넣은 차례');
  assert.equal((await db.getAllSentenceStats()).filter((s) => s.itemId === id).length, 1, '문장 기록이 그 영상에 붙는다');
  assert.equal(readGhosts().length, 0, '쓴 자리는 지운다');
  const again = await db.addItem({ title: '이름을 바꿔 넣음', videoFile: { name: 'made_up_1.mp4', type: 'video/mp4', size: 9 }, enText: 'x' });
  assert.notEqual(again, 'old1', '두 번째는 새 id (같은 id로 덮지 않는다)');
});

test('👻 영상을 먼저 넣고 되살렸으면 — 몇 편이 안 이어졌는지 알려 주고, 지우고 다시 넣으면 이어진다', async () => {
  setUp();
  await seedDevice();
  const gh = fakeGitHub();
  await runBackup({ fetchFn: gh.fn, now: at('2026-10-29T07:30:00'), locks: null });
  newDevice();
  const early = await db.addItem({ title: '지어낸 영상', videoFile: { name: 'made_up_1.mp4', type: 'video/mp4', size: 9 }, enText: 'x' });
  const res = await restoreBackup(await loadBackup((await listBackups({ fetchFn: gh.fn }))[0], { fetchFn: gh.fn }));
  assert.equal(res.already, 1, '같은 이름의 영상이 이미 다른 id로');
  await db.deleteItem(early);
  assert.equal(await db.addItem({ title: '지어낸 영상', videoFile: { name: 'made_up_1.mp4', type: 'video/mp4', size: 9 }, enText: 'x' }), 'old1');
});

test('받은 파일 꼴 — 신코치 백업이 아니면 안 받음 · 압축 안 한 .json도 읽음 (압축이 없는 브라우저)', async () => {
  setUp();
  const gh = fakeGitHub();
  const put = (path, text) => gh.files.set(path, new TextEncoder().encode(text));
  put('backup/2026-10-30.json', JSON.stringify({ app: 'other', profile: [] }));
  put('backup/2026-10-31.json', JSON.stringify({ app: 'shincoach', version: 1, profile: [seedProfile()], daily: [], sentenceStats: [] }));
  const list = await listBackups({ fetchFn: gh.fn });
  assert.deepEqual(list.map((f) => f.name), ['2026-10-31.json', '2026-10-30.json']);
  const ok = await loadBackup(list[0], { fetchFn: gh.fn });
  assert.equal(monCount(ok.profile[0]).have, 7, '압축 안 한 백업');
  await assert.rejects(loadBackup(list[1], { fetchFn: gh.fn }), /신코치 백업이 아니에요/);
  put('backup/2026-11-01.json.gz', 'not gzip');
  await assert.rejects(loadBackup({ name: '2026-11-01.json.gz', path: 'backup/2026-11-01.json.gz' }, { fetchFn: gh.fn }), /못 읽었어요/);
});

test('👻 자리의 id로 이미 영상이 있으면(다른 창이 먼저 넣음) 새 id — 덮지 않는다', async () => {
  setUp();
  await seedDevice(); // old1 영상이 이 기기에 있다
  mem.set('shincoach.ghostItems', JSON.stringify([{ id: 'old1', title: '지어낸 영상', videoName: 'made_up_1.mp4', lastCue: 3 }]));
  const ex = await db.exportStats();
  assert.equal(ex.items.filter((it) => it.id === 'old1').length, 1, '내보내기에서도 진짜 영상 하나 — 남은 자리와 겹치지 않는다');
  assert.equal(ex.items[0].lastCue, 7, '진짜 영상 쪽');
  const id = await db.addItem({ title: '지어낸 영상', videoFile: { name: 'made_up_1.mp4', type: 'video/mp4', size: 9 }, enText: 'x' });
  assert.notEqual(id, 'old1');
  assert.equal((await db.listItems()).find((x) => x.id === 'old1').lastCue, 7, '있던 영상은 그대로');
  assert.equal(readGhosts().length, 0, '못 쓰는 자리도 지운다');
});

test('👻 자리 목록 규칙 (순수)', () => {
  assert.deepEqual(ghostsOf([{ id: 'a', title: 't', videoName: 'v.mp4', lastCue: 2.5, createdAt: -1 }, { id: 'a' }, { id: 3 }, null]),
    [{ id: 'a', title: 't', videoName: 'v.mp4', duration: 0, lastCue: 0, createdAt: 0 }], '같은 id는 하나 · id가 글자가 아니면 뺌 · 이상한 수는 0');
  const l = addGhosts([{ id: 'x', title: 'X' }], [{ id: 'a', videoName: 'a.mp4' }, { id: 'b', title: 'B' }], ['b']);
  assert.deepEqual(l.map((g) => g.id), ['a', 'x'], '이 기기에 있는 영상(b)은 빼고 새것이 앞');
  assert.equal(pickGhost(l, 'a.mp4', '').id, 'a', '파일 이름');
  assert.equal(pickGhost(l, 'zzz.mp4', ' X ').id, 'x', '파일 이름을 모르는 자리(옛 백업)는 제목으로');
  // 🔍 165차 #3 — 파일 이름이 다르면 제목이 같아도 안 맞춘다 · 같은 이름이 둘이면 안 맞춘다
  assert.equal(pickGhost([{ id: 'e1', title: 'Lesson', videoName: 'episode1.mp4' }], 'episode2.mp4', 'Lesson'), null, '다른 화');
  assert.equal(pickGhost([{ id: 'p', videoName: 'same.mp4' }, { id: 'q', videoName: 'same.mp4' }], 'same.mp4', ''), null, '같은 이름 둘');
  assert.equal(pickGhost([{ id: 'u', title: 'T' }, { id: 'v', title: 'T' }], 'n.mp4', 'T'), null, '같은 제목 둘');
  assert.equal(pickGhost([{ id: 'w', title: 'T', videoName: 'w.mp4' }, { id: 'z', title: 'T' }], 'w.mp4', 'T').id, 'w', '파일 이름이 먼저');
  assert.equal(pickGhost(l, '', ''), null, '빈 이름·빈 제목으로는 안 맞춘다');
  assert.equal(pickGhost([{ id: 'n', title: '', videoName: '' }], '', ''), null);
  assert.equal(addGhosts([], Array.from({ length: GHOST_MAX + 5 }, (_, i) => ({ id: `g${i}` })), []).length, GHOST_MAX, '상한');
});

test('때·이름·요약 규칙 (순수)', () => {
  const today = '2026-10-29';
  const base = { on: true, token: 't', online: true, today, now: 1e12 };
  assert.equal(backupDue({ ...base, state: null }), '');
  assert.equal(backupDue({ ...base, on: false, state: null }), 'off');
  assert.equal(backupDue({ ...base, token: null, state: null }), 'token');
  assert.equal(backupDue({ ...base, online: false, state: null }), 'offline');
  assert.equal(backupDue({ ...base, state: { ok: { day: today } } }), 'done');
  assert.equal(backupDue({ ...base, state: { ok: { day: '2026-10-28' } } }), '', '어제 것이면 오늘 또');
  assert.equal(backupDue({ ...base, state: { sameAt: 1e12 - 1000 } }), 'same', '바뀐 것 없음은 한 시간');
  assert.equal(backupDue({ ...base, state: { sameAt: 1e12 - SAME_GAP_MS } }), '', '한 시간 뒤 다시 본다');
  assert.equal(backupDue({ ...base, state: { same: today } }), '', '옛 칸(same)은 안 본다');
  assert.equal(backupDue({ ...base, state: { try: { at: 1e12 - 1000, ok: false } } }), 'wait');
  assert.equal(backupDue({ ...base, state: { try: { at: 1e12 - FAIL_GAP_MS, ok: false } } }), '');
  assert.equal(backupDue({ ...base, force: true, state: { ok: { day: today }, try: { at: 1e12, ok: false } } }), '', 'force는 하루 한 번·기다림을 건너뜀');
  assert.equal(backupDue({ ...base, force: true, on: false, state: null }), 'off', 'force도 켠 기기만');
  assert.equal(backupPath(today, true), 'backup/2026-10-29.json.gz');
  assert.equal(backupPath(today, false), 'backup/2026-10-29.json');
  assert.equal(dayOfName('2026-10-29.json.gz'), '2026-10-29');
  assert.equal(dayOfName('2026-10-29.json'), '2026-10-29');
  assert.equal(dayOfName('README.md'), '');
  assert.equal(dayOfName('x2026-10-29.json.gz'), '');
  const files = [{ name: '2026-10-27.json' }, { name: '2026-10-28.json' }, { name: '2026-10-28.json.gz' }, { name: 'notes.md' }, ...Array.from({ length: 9 }, (_, i) => ({ name: `2026-09-${String(10 + i)}.json.gz` }))];
  const nf = newestFirst(files);
  assert.equal(nf.length, LIST_N);
  assert.deepEqual(nf.slice(0, 2).map((f) => f.name), ['2026-10-28.json.gz', '2026-10-27.json'], '새것부터 · 같은 날은 압축한 쪽');
  assert.equal(textHash('a'), textHash('a')); assert.notEqual(textHash('a'), textHash('b'));
  assert.equal(deviceOf('Mozilla/5.0 (Linux; Android 14; SM-X200)'), 'Android');
  assert.equal(deviceOf('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)'), 'iPhone');
  assert.equal(sizeText(412345), '412 KB'); assert.equal(sizeText(1300000), '1.3 MB'); assert.equal(sizeText(10), '1 KB');
  const sum = backupSummary({ app: 'shincoach', profile: [seedProfile(), MATH], daily: [{ date: 'd', seconds: 5 }, { date: 'e', seconds: 0 }], sentenceStats: [{}, {}], items: [{}], device: 'Android' });
  assert.equal(sum.have, 7); assert.equal(sum.species, 5); assert.equal(sum.days, 1); assert.equal(sum.math, 1); assert.equal(sum.items, 13);
  assert.match(summaryLine(sum), /^🎒 포켓몬 7마리 \(도감 5종\) · 🥚 알 1개 · 💰 777코인/);
  assert.deepEqual(monCount({ caught: { 1: 4 }, mons: { 1: { evo: 1, fused: 1, traded: 1 } } }), { have: 1, species: 1, eggs: 0 }, '진화·퓨전·교환으로 나간 것은 뺀다');
  assert.deepEqual(monCount(null), { have: 0, species: 0, eggs: 0 });
});

test('📊·⚙ 한 줄 — 꺼짐·열쇠 없음·마지막 백업·실패 까닭', () => {
  const fmt = () => '10/29 07:30';
  assert.match(backupLine(null, { on: false, token: true }, fmt), /꺼짐 — ⚙ 설정에서/);
  assert.match(backupLine(null, { on: true, token: false }, fmt), /열쇠가 없어/);
  assert.match(backupLine({ ok: { at: 1, bytes: 412000, raw: 3100000 } }, { on: true, token: true }, fmt), /✅ 마지막 백업 10\/29 07:30 · 412 KB \(압축 전 3\.1 MB\)/);
  assert.match(backupLine({ ok: { at: 1, bytes: 1 }, try: { at: 2, ok: false, why: 'empty' } }, { on: true, token: true }, fmt), /❌ .*비어 있어/);
  assert.doesNotMatch(backupLine({ ok: { at: 3, bytes: 1 }, try: { at: 3, ok: true } }, { on: true, token: true }, fmt), /❌/);
  assert.equal(backupFresh({ ok: { at: 1000 } }, 1000 + 6 * 86400000), true);
  assert.equal(backupFresh({ ok: { at: 1000 } }, 1000 + 7 * 86400000), false);
  assert.equal(backupFresh({}, 5), false);
});

test('붙인 자리 — ⚙ 칸·저장 · 앱이 홈에서 부름 · 📊 되살리기는 확인 뒤 · 서비스워커 캐시', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /id="set-cloud"/);
  const pl = readFileSync(new URL('../js/player.js', import.meta.url), 'utf8');
  assert.match(pl, /settings\.cloudBackup = \$\('set-cloud'\)\.checked/);
  assert.match(pl, /\$\('set-cloud'\)\.checked = settings\.cloudBackup === true/);
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.match(app, /if \(name === 'home'\) setTimeout\(\(\) => \{ import\('\.\/cloudbackup\.js'\)\.then\(\(m\) => m\.autoBackup\(\)\)/, '홈에서');
  assert.equal(app.split('m.autoBackup()').length - 1, 2, '홈 · 다시 올라올 때');
  const st = readFileSync(new URL('../js/stats.js', import.meta.url), 'utf8');
  assert.match(st, /if \(!confirm\([\s\S]{0,300}?\)\) return;[\s\S]{0,200}restoreBackup\(/, '되살리기는 confirm 뒤');
  assert.match(st, /backupFresh\(/, '백업이 되고 있으면 💾 파일 알림을 안 띄움');
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.match(sw, /'\.\/js\/cloudbackup\.js'/);
  assert.match(sw, /'\.\/js\/ghosts\.js'/);
});
