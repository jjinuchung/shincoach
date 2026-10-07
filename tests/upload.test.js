// 📤 Claude에게 기록 보내기 (2026-10-06): node --test tests/upload.test.js
// 왜: 아버님 "매번 사진을 찍어서 보여주는 거 말고 앱에서 바로 github에 올리고 니가 확인해서 피드백을 주는 방법" →
//     공개 저장소(신코치)가 아니라 비공개 저장소(shincoach-data)에, 아버님이 만든 열쇠(fine-grained token)로.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DATA_REPO, DATA_BRANCH, AUTO_GAP_MS, reportFiles, essayFiles, b64, hashOf, cleanToken, shouldAuto, whyOf, putFile } from '../js/upload.js';
import { collectTodo, essayNumbers } from '../js/stats.js';
import { essayKey } from '../js/essay.js';

const src = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const unb64 = (s) => new TextDecoder().decode(Uint8Array.from(atob(s), (c) => c.charCodeAt(0)));

test('📤 올릴 곳은 비공개 저장소 — 공개 저장소(신코치)가 아니다 · main 가지 · 10분에 한 번', () => {
  assert.equal(DATA_REPO, 'jjinuchung/shincoach-data');
  assert.notEqual(DATA_REPO, 'jjinuchung/shincoach');
  assert.equal(DATA_BRANCH, 'main');
  assert.equal(AUTO_GAP_MS, 600000);
});

test('📤 올릴 파일 — 날짜별 글(📋 수학 기록 + ❓ 질문) · 원본 전체 latest.json · 글은 앱의 복사 글 그대로', () => {
  const m = { concepts: { 'frac.add': { done: true } }, asks: [] };
  const f = reportFiles(m, '2026-10-06', '🔢 신코치 수학 기록 (2026-10-06)\n- 분수', '❓ 진우의 수학 질문 0개');
  assert.deepEqual(f.map((x) => x.path), ['math/2026-10-06.md', 'math/latest.json']);
  assert.equal(f[0].text, '🔢 신코치 수학 기록 (2026-10-06)\n- 분수\n\n❓ 진우의 수학 질문 0개\n');
  assert.deepEqual(JSON.parse(f[1].text), { day: '2026-10-06', math: m }, '원본 전체 (복사 글은 12개념까지라)');
  assert.deepEqual(JSON.parse(reportFiles(null, '2026-10-06', '', '')[1].text), { day: '2026-10-06', math: null });
});

test('📤 base64는 UTF-8로 — 한글·이모지·긴 글도 그대로 돌아온다 (GitHub contents API)', () => {
  for (const t of ['abc', '한글 ✅ 🔶 진우', '', 'x'.repeat(100000) + '끝🔚']) assert.equal(unb64(b64(t)), t);
  assert.equal(b64('한'), '7ZWc', '한 = ED 95 9C');
});

test('📤 내용 지문 — 같으면 같고, 한 글자만 달라도 다르다 (그대로면 또 안 올린다)', () => {
  const a = [{ path: 'math/a.md', text: '하나' }];
  assert.equal(hashOf(a), hashOf([{ path: 'math/a.md', text: '하나' }]));
  assert.notEqual(hashOf(a), hashOf([{ path: 'math/a.md', text: '하나.' }]));
  assert.notEqual(hashOf(a), hashOf([{ path: 'math/b.md', text: '하나' }]));
  assert.match(hashOf([]), /^[0-9a-f]{8}$/);
});

test('📤 열쇠 꼴 — 앞뒤 빈칸은 떼고, 짧거나 중간에 빈칸이 있으면 안 받는다', () => {
  const t = 'github_pat_11ABCD_fake'; // 가짜 — 진짜 열쇠 모양(40자 넘음)은 아래 검사가 막는다
  assert.equal(cleanToken(`  ${t}\n`), t);
  assert.equal(cleanToken('ghp_0123456789abcdefghij'), 'ghp_0123456789abcdefghij', 'classic도 받는다');
  for (const bad of [null, undefined, '', '   ', 'short', 'github_pat_ab cdefghijklmnopqrstuvwxyz']) assert.equal(cleanToken(bad), null, String(bad));
});

test('📤 저절로 보낼 때 — 열쇠 · 인터넷 · 10분 · 내용이 바뀌었거나 지난번 실패', () => {
  const now = 1_000_000_000;
  const base = { token: 'tok', online: true, now, hash: 'h1' };
  assert.equal(shouldAuto({ ...base, state: null }), true, '처음');
  assert.equal(shouldAuto({ ...base, token: null, state: null }), false, '열쇠 없음');
  assert.equal(shouldAuto({ ...base, online: false, state: null }), false, '인터넷 없음');
  assert.equal(shouldAuto({ ...base, state: { at: now - AUTO_GAP_MS + 1, ok: true, hash: 'h0' } }), false, '10분 안');
  assert.equal(shouldAuto({ ...base, state: { at: now - AUTO_GAP_MS, ok: true, hash: 'h1' } }), false, '10분 지났어도 내용이 그대로');
  assert.equal(shouldAuto({ ...base, state: { at: now - AUTO_GAP_MS, ok: true, hash: 'h0' } }), true, '내용이 바뀜');
  assert.equal(shouldAuto({ ...base, state: { at: now - AUTO_GAP_MS, ok: false, hash: '' } }), true, '지난번 실패 — 10분 뒤 다시');
  assert.equal(shouldAuto({ ...base, state: { at: now - 1000, ok: false } }), false, '실패했어도 10분은 기다린다');
});

test('📤 못 보낸 까닭 — 아버님이 무엇을 고치면 되는지', () => {
  assert.match(whyOf(401), /열쇠가 틀렸거나 기한이 지났/);
  assert.match(whyOf(403), /Read and write/);
  assert.match(whyOf(404), /shincoach-data를 골라/);
  assert.match(whyOf(0), /인터넷/);
  assert.match(whyOf(500), /500/);
});

/** 가짜 GitHub — 파일 표 · 받은 요청 기록 · 상태를 바꿀 수 있다 */
function fakeGitHub({ files = {}, status = {}, conflictOnce = false } = {}) {
  const calls = [];
  let conflicted = false;
  const fetchFn = async (url, opt = {}) => {
    const method = opt.method || 'GET';
    calls.push({ method, url, headers: opt.headers, body: opt.body ? JSON.parse(opt.body) : null });
    const path = decodeURIComponent(url.split('/contents/')[1].split('?')[0]);
    const res = (code, body = {}) => ({ status: code, json: async () => body });
    if (status[method]) return res(status[method]);
    if (method === 'GET') return files[path] ? res(200, { sha: files[path].sha }) : res(404);
    const b = JSON.parse(opt.body);
    if (conflictOnce && !conflicted) { conflicted = true; files[path] = { sha: 'other', text: '다른 창' }; return res(409); }
    if (files[path] && b.sha !== files[path].sha) return res(409);
    if (!files[path] && b.sha) return res(422);
    const created = !files[path];
    files[path] = { sha: `s${calls.length}`, text: unb64(b.content) };
    return res(created ? 201 : 200, { content: { sha: files[path].sha } });
  };
  return { fetchFn, calls, files };
}

test('📤 파일 올리기 — 없으면 새로(sha 없이) · 있으면 sha를 받아 덮어쓰기 · 열쇠는 Bearer 머리글 · main 가지', async () => {
  const gh = fakeGitHub();
  const r1 = await putFile({ fetchFn: gh.fetchFn, token: 'tok123', path: 'math/2026-10-06.md', text: '첫 글', message: 'm1' });
  assert.deepEqual(r1, { created: true });
  assert.equal(gh.files['math/2026-10-06.md'].text, '첫 글');
  const put1 = gh.calls.find((c) => c.method === 'PUT');
  assert.equal(put1.url, 'https://api.github.com/repos/jjinuchung/shincoach-data/contents/math/2026-10-06.md');
  assert.equal(put1.headers.Authorization, 'Bearer tok123');
  assert.equal(put1.body.branch, 'main');
  assert.equal(put1.body.sha, undefined, '새 파일은 sha 없이');
  assert.match(gh.calls[0].url, /\?ref=main$/);
  const r2 = await putFile({ fetchFn: gh.fetchFn, token: 'tok123', path: 'math/2026-10-06.md', text: '고친 글', message: 'm2' });
  assert.deepEqual(r2, { created: false });
  assert.equal(gh.files['math/2026-10-06.md'].text, '고친 글', '같은 날은 덮어쓴다');
  assert.ok(gh.calls.filter((c) => c.method === 'PUT')[1].body.sha, '덮어쓸 때는 sha');
});

test('📤 겹치면(다른 창이 먼저 올림) sha를 다시 받아 한 번 더 · 못 받는 열쇠·권한·저장소는 까닭과 함께 실패 · 인터넷이 끊기면 0', async () => {
  const gh = fakeGitHub({ files: { 'math/latest.json': { sha: 'a', text: '옛' } }, conflictOnce: true });
  await putFile({ fetchFn: gh.fetchFn, token: 't', path: 'math/latest.json', text: '새', message: 'm' });
  assert.equal(gh.files['math/latest.json'].text, '새');
  assert.equal(gh.calls.filter((c) => c.method === 'PUT').length, 2, '한 번 더');
  for (const [where, st, re] of [['GET', 401, /열쇠가 틀렸/], ['PUT', 403, /Read and write/], ['GET', 500, /500/]]) {
    const g = fakeGitHub({ status: { [where]: st } });
    await assert.rejects(putFile({ fetchFn: g.fetchFn, token: 't', path: 'math/x.md', text: 'x', message: 'm' }), (e) => re.test(e.message) && e.status === st);
  }
  const off = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(putFile({ fetchFn: off, token: 't', path: 'math/x.md', text: 'x', message: 'm' }), (e) => e.status === 0 && /인터넷/.test(e.message));
});

test('📤 화면 연결 — 홈으로 올 때·앱을 내릴 때 저절로 · 📊 카드(열쇠 넣기·지금 보내기·마지막으로 보낸 때) · 앱 셸 · ★ 코드에 열쇠가 없다', () => {
  const a = src('js/app.js');
  assert.match(a, /import \{ autoSend \} from '\.\/upload\.js';/);
  assert.match(a, /if \(name === 'home'\) setTimeout\(\(\) => \{ autoSend\(\); \}, 3000\);/, '홈으로 올 때(앱을 열 때 포함)');
  assert.match(a, /if \(document\.hidden\) \{ autoSend\(\); return; \}/, '앱을 내릴 때');
  const s = src('js/stats.js');
  assert.match(s, /renderUploadCard\(main\); \/\/ 📤/);
  assert.match(s, /const r = await sendReport\(\{ force: true \}\)/, '열쇠를 넣으면 바로 보내 본다');
  assert.match(s, /if \(!r\.ok\) \{ clearToken\(\);/, '보내 보기에 실패한 열쇠는 남기지 않는다');
  assert.match(s, /input\.type = 'password';/, '열쇠가 화면에 그대로 안 보인다');
  const u = src('js/upload.js');
  assert.match(u, /localStorage\.setItem\(TOKEN_KEY, t\)/, '열쇠는 이 기기에만');
  assert.match(u, /if \(running\) return running;/, '두 번 눌러도·겹쳐도 한 번');
  assert.match(u, /\}\)\(\)\.finally\(\(\) => \{ running = null; \}\);/, '끝나면 반드시 풀린다 (껐다 켜야 낫는 전역 플래그가 되지 않게)');
  assert.ok(src('sw.js').includes("'./js/upload.js'"), '앱 셸');
  // ★ 공개 저장소에 열쇠가 들어가면 누구나 진우 기록을 읽고 쓴다 — js·tests·tools·index.html 어디에도 진짜 열쇠 모양이 없다
  for (const dir of ['js', 'tests', 'tools']) {
    for (const f of fs.readdirSync(new URL(`../${dir}/`, import.meta.url))) {
      if (!/\.(m?js|html)$/.test(f)) continue;
      const t = src(`${dir}/${f}`);
      assert.ok(!/github_pat_[A-Za-z0-9_]{40,}|ghp_[A-Za-z0-9]{30,}|gho_[A-Za-z0-9]{30,}/.test(t), `${dir}/${f}: 열쇠 모양`);
    }
  }
  assert.ok(!/github_pat_[A-Za-z0-9_]{40,}|ghp_[A-Za-z0-9]{30,}/.test(src('index.html')));
});

test('✍️ 고칠 에세이 글도 올린다 (v199) — 📊 "📮 고쳐 주세요"와 같은 글·같은 [번호](오래된 글이 [1]) · 고쳐 준 글은 빼고 · 날짜·배운 문장·앱 교정까지', () => {
  const days = [
    { date: '2026-10-05', essays: [{ id: 'b1', origin: 'I know, right?', written: 'I know right', fixed: 'I know, right?', notes: ['쉼표'] }, { id: 'b2', origin: 'x', written: 'done one', coachFix: 'Done one.' }] },
    { date: '2026-10-03', essays: [{ id: 'a1', origin: 'You look great.', written: 'you look grate' }, { id: 'a0', origin: 'y', written: '' }] },
    { date: '2026-10-06', essays: [{ id: 'c1', origin: 'Let us go.', written: 'Lets go' }] },
  ];
  const todo = collectTodo(days);
  assert.deepEqual(todo.map((e) => [e.id, e.date]), [['a1', '2026-10-03'], ['b1', '2026-10-05'], ['c1', '2026-10-06']], '오래된 날부터 · 고쳐 준 글·빈 글 빼고 · 날짜를 붙여');
  const nums = essayNumbers(days);
  const [md, js] = essayFiles(todo, '2026-10-06');
  assert.deepEqual([md.path, js.path], ['essay/todo.md', 'essay/todo.json']);
  const parsed = JSON.parse(js.text);
  assert.deepEqual(parsed.map((e) => [e.no, e.id]), todo.map((e) => [nums.get(essayKey(e.date, e.id)), e.id]), '번호가 📊 화면의 [번호]와 같다');
  assert.deepEqual(parsed[1], { no: 2, id: 'b1', date: '2026-10-05', origin: 'I know, right?', written: 'I know right', fixed: 'I know, right?', notes: ['쉼표'] });
  assert.match(md.text, /^✍️ 진우가 쓴 영어 문장 — 아직 아빠가 고쳐 주지 않은 글 3개 \(2026-10-06\)/);
  assert.match(md.text, /\[1\] 2026-10-03 배운 문장: You look great\.\n {4}진우: you look grate\n/);
  assert.match(md.text, /\[2\] 2026-10-05 배운 문장: I know, right\?\n {4}진우: I know right\n {4}앱 교정: I know, right\?\n {4}앱 메모: 쉼표/);
  assert.ok(!md.text.includes('done one'), '고쳐 준 글은 없다');
  assert.match(essayFiles([], '2026-10-06')[0].text, /고칠 글 없음/, '없으면 없다고 (안 올라온 것과 가른다)');
  assert.deepEqual(JSON.parse(essayFiles(null, 'd')[1].text), []);
  const u = src('js/upload.js');
  assert.match(u, /\.\.\.essayFiles\(collectTodo\(days \|\| \[\]\), today\)/, '보내는 파일에 에세이');
  assert.match(u, /collectTodo: st\.collectTodo/, '📊와 같은 목록');
});

// ── 🔍 Codex 35차 (2026-10-07) ──
// #2 기기 기록을 못 읽으면 빈 기록을 올려 "성공"으로 적었다 → 비공개 저장소의 좋은 기록을 덮어씀
// #1 아빠 교정·❓ 답장이 공개 저장소(coach/fixes.json·replies.json)로 배포됐다 → 비공개 저장소에서 이 기기 열쇠로 읽는다
import * as UP from '../js/upload.js';

test('📤 기기 기록을 못 읽으면 올릴 파일을 만들지 않는다 (빈 기록으로 덮어쓰지 않게) · 읽었는데 없는 것은 "없음"으로', async () => {
  const ok = { getMath: async () => ({ concepts: {}, asks: [] }), listDaily: async () => [{ date: '2026-10-06', essays: [{ id: 'a', written: 'I go' }] }] };
  const fmt = { mathReportText: () => '보고', asksText: () => '질문', collectTodo: (days) => days.flatMap((d) => d.essays.map((e) => ({ ...e, date: d.date }))) };
  const files = await UP.gatherFiles({ ...ok, ...fmt, today: '2026-10-07' });
  assert.deepEqual(files.map((f) => f.path), ['math/2026-10-07.md', 'math/latest.json', 'essay/todo.md', 'essay/todo.json']);
  await assert.rejects(UP.gatherFiles({ ...ok, ...fmt, today: 'd', getMath: async () => { throw new Error('IDB 닫힘'); } }), '수학 기록을 못 읽으면 실패');
  await assert.rejects(UP.gatherFiles({ ...ok, ...fmt, today: 'd', listDaily: async () => { throw new Error('IDB 닫힘'); } }), '날짜 기록을 못 읽으면 실패');
  const none = await UP.gatherFiles({ ...fmt, getMath: async () => null, listDaily: async () => [], today: 'd' });
  assert.match(none[0].text, /수학 기록 없음/, '읽었는데 없으면 없다고');
  assert.deepEqual(JSON.parse(none[3].text), []);
  const u = src('js/upload.js');
  assert.ok(!/getMath\(\)\.catch\(/.test(u) && !/listDaily\(\)\.catch\(/.test(u), '실패를 빈 기록으로 바꾸지 않는다');
  assert.match(u, /try \{ files = await gatherFiles\(/, '보내기는 gatherFiles가 실패하면 아무것도 안 올린다');
});

/** 가짜 GitHub(읽기) — 파일 표 · 요청 기록 */
function fakeRead(files = {}, status = 0) {
  const calls = [];
  const fetchFn = async (url, opt = {}) => {
    calls.push({ url, headers: opt.headers || {} });
    const path = decodeURIComponent(url.split('/contents/')[1].split('?')[0]);
    if (status) return { status, json: async () => ({ message: 'Bad credentials' }) };
    if (!(path in files)) return { status: 404, json: async () => ({}) };
    return { status: 200, json: async () => ({ sha: 'x', encoding: 'base64', content: b64(files[path]).replace(/(.{60})/g, '$1\n') }) };
  };
  return { fetchFn, calls };
}

test('📥 비공개 저장소에서 아빠 교정·❓ 답장 읽기 — 이 기기 열쇠로 · 없거나 못 읽으면 빈 목록(앱은 그대로) · 열쇠가 없으면 묻지도 않는다', async () => {
  assert.equal(UP.PRIVATE_FIXES, 'essay/fixes.json');
  assert.equal(UP.PRIVATE_REPLIES, 'math/replies.json');
  const list = [{ date: '2026-10-07', written: '나는 진우 ✍️ I go', fixed: 'I went.' }];
  const gh = fakeRead({ 'essay/fixes.json': JSON.stringify(list) });
  assert.deepEqual(await UP.readPrivateList('essay/fixes.json', { fetchFn: gh.fetchFn, token: 'tok' }), list, '한글·이모지 그대로 (줄바꿈 섞인 base64)');
  assert.equal(gh.calls[0].url, 'https://api.github.com/repos/jjinuchung/shincoach-data/contents/essay/fixes.json?ref=main');
  assert.equal(gh.calls[0].headers.Authorization, 'Bearer tok');
  assert.deepEqual(await UP.readPrivateList('math/replies.json', { fetchFn: gh.fetchFn, token: 'tok' }), [], '파일이 없으면(404) 빈 목록');
  for (const st of [401, 403, 500]) assert.deepEqual(await UP.readPrivateList('essay/fixes.json', { fetchFn: fakeRead({}, st).fetchFn, token: 'tok' }), [], `${st}도 빈 목록`);
  const off = async () => { throw new TypeError('Failed to fetch'); };
  assert.deepEqual(await UP.readPrivateList('essay/fixes.json', { fetchFn: off, token: 'tok' }), [], '인터넷이 없으면 빈 목록');
  for (const bad of ['{not json', '{"a":1}', '"글"']) assert.deepEqual(await UP.readPrivateList('x.json', { fetchFn: fakeRead({ 'x.json': bad }).fetchFn, token: 'tok' }), [], `배열이 아니면 빈 목록: ${bad}`);
  let asked = 0;
  assert.deepEqual(await UP.readPrivateList('essay/fixes.json', { fetchFn: async () => { asked++; return { status: 200 }; }, token: null }), []);
  assert.equal(asked, 0, '열쇠 없으면 GitHub에 묻지 않는다');
});

// 🔍 Codex 36차 #4 — 인터넷 끊김·열쇠 문제·파일 없음·JSON 깨짐이 모두 "받을 것 없음"과 똑같이 빈 목록이라 아버님이 알 수 없었다.
//   아이 화면은 그대로 조용히, 받기 결과를 이 기기에 적어 📊 📤 카드에 한 줄로 보인다 (이미 붙은 교정·답장은 그대로)
test('📥 받기 결과를 파일마다 적는다 — 받음(개수)·아직 없음(404)·인터넷·열쇠·권한·깨진 JSON·목록 아님 · 열쇠가 없으면 적지 않는다', async () => {
  const mem = {}; const store = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); } };
  const at = (o) => ({ ...o, store, now: () => 1000 });
  const list = [{ no: 1, text: '답' }, { no: 2, text: '또' }];
  assert.deepEqual(await UP.readPrivateList('math/replies.json', at({ fetchFn: fakeRead({ 'math/replies.json': JSON.stringify(list) }).fetchFn, token: 'tok' })), list);
  assert.deepEqual(UP.readState(store)['math/replies.json'], { at: 1000, ok: true, n: 2 });
  await UP.readPrivateList('essay/fixes.json', at({ fetchFn: fakeRead({}).fetchFn, token: 'tok' }));
  assert.deepEqual(UP.readState(store)['essay/fixes.json'], { at: 1000, ok: true, n: 0, missing: true }, '404 = 아직 없음 (실패가 아니다)');
  assert.deepEqual(UP.readState(store)['math/replies.json'].n, 2, '다른 파일의 결과는 그대로');
  const cases = [
    [async () => { throw new TypeError('Failed to fetch'); }, /인터넷/],
    [fakeRead({}, 401).fetchFn, /열쇠가 틀렸거나 기한/],
    [fakeRead({}, 403).fetchFn, /읽을 수 없어요/],
    [fakeRead({ 'essay/fixes.json': '{not json' }).fetchFn, /깨져/],
    [fakeRead({ 'essay/fixes.json': '{"a":1}' }).fetchFn, /목록이 아님/],
  ];
  for (const [fetchFn, why] of cases) {
    assert.deepEqual(await UP.readPrivateList('essay/fixes.json', at({ fetchFn, token: 'tok' })), [], '실패해도 빈 목록 (앱은 그대로)');
    const s = UP.readState(store)['essay/fixes.json'];
    assert.equal(s.ok, false); assert.match(s.why, why);
  }
  const before = JSON.stringify(UP.readState(store));
  await UP.readPrivateList('essay/fixes.json', at({ fetchFn: async () => ({ status: 200 }), token: null }));
  assert.equal(JSON.stringify(UP.readState(store)), before, '열쇠가 없으면 묻지도 적지도 않는다');
  // 📊 한 줄 — 파일마다 받은 때·개수, 못 받았으면 까닭
  const line = UP.readSummary({ 'essay/fixes.json': { at: Date.UTC(2026, 9, 7, 1, 32), ok: true, n: 3 }, 'math/replies.json': { at: 1, ok: false, why: '인터넷이 안 돼요' } }, () => '10/07 10:32');
  assert.match(line, /✍️ 교정 ✅ 10\/07 10:32 \(3개\)/);
  assert.match(line, /❓ 답장 ❌ .*인터넷이 안 돼요/);
  assert.match(UP.readSummary({}, () => ''), /아직 받아 본 적이 없어요/);
  assert.match(UP.readSummary({ 'math/replies.json': { at: 5, ok: true, n: 0, missing: true } }, () => 't'), /❓ 답장 · 아직 없음/);
});

test('📥 받기 결과 화면 연결 — 📊 📤 카드에 한 줄 · 열쇠를 지우면 받기 결과도 지운다 · 아이 화면(수학·에세이)은 그대로 조용히', () => {
  const s = src('js/stats.js');
  const cardSrc = s.slice(s.indexOf('function renderUploadCard('), s.indexOf('function renderUploadCard(') + 4000);
  assert.match(cardSrc, /readSummary\(readState\(\)/, '📤 카드가 받기 결과를 보인다');
  const u = src('js/upload.js');
  const clr = u.slice(u.indexOf('export function clearToken'), u.indexOf('export function clearToken') + 300);
  assert.match(clr, /READ_KEY/, '열쇠 지우기 = 받기 결과도');
  assert.ok(!/readState|readSummary/.test(src('js/math.js') + src('js/db.js') + src('js/essay.js') + src('js/player.js')), '아이 화면엔 안 보인다');
});

test('📥 화면 연결 — 아빠 교정(db.syncCoachFixes)·❓ 답장(math.syncMathReplies)은 비공개 저장소에서 · ★ 공개 저장소엔 아이 글·답장 파일이 없다', () => {
  const d = src('js/db.js');
  const fx = d.slice(d.indexOf('export async function syncCoachFixes'), d.indexOf('/** 하루치 기록에서 에세이 하나에 readAt'));
  assert.match(fx, /readPrivateList\(PRIVATE_FIXES\)/, '교정은 비공개 저장소 essay/fixes.json');
  assert.ok(!/fetch\(/.test(fx), '공개 배포 파일을 읽지 않는다');
  const m = src('js/math.js');
  const rp = m.slice(m.indexOf('async function syncMathReplies'), m.indexOf('/** 📬 답장 화면'));
  assert.match(rp, /readPrivateList\(PRIVATE_REPLIES\)/, '답장은 비공개 저장소 math/replies.json');
  assert.ok(!/fetch\(/.test(rp), '공개 배포 파일을 읽지 않는다');
  const sw = src('sw.js');
  assert.ok(!sw.includes("'./coach/fixes.json'") && !sw.includes("'./coach/math/replies.json'"), '앱 셸에 없다');
  assert.ok(!fs.existsSync(new URL('../coach/fixes.json', import.meta.url)), '공개 저장소에 coach/fixes.json이 없다');
  assert.ok(!fs.existsSync(new URL('../coach/math/replies.json', import.meta.url)), '공개 저장소에 coach/math/replies.json이 없다');
  assert.match(src('tools/check.mjs'), /coach\/fixes\.json.*coach\/math\/replies\.json|PUBLIC_PRIVATE/, '검사가 다시 생기는 것을 막는다');
});
