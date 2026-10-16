// 📚 v277 태블릿 영상 전체 목록 (2026-10-17 아버님 "이대로 해") 테스트: node --test tests/library277.test.js
// 영어 요약(english/날짜.md)은 최근에 연 10편뿐이라 오래 안 연 영상은 있는지 몰랐다 → english/library.md 한 파일에 전부(제목·파일 이름·넣은 날·길이·진도·마지막으로 연 날).
// Claude가 아빠 PC 자료 폴더와 파일 이름으로 맞춰 "만들었지만 태블릿에 없는 자료"·"교환권 후보"·"다 배운 영상"을 알린다. 아이 화면은 그대로
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { libraryFiles, gatherFiles, EN_VIDEOS } from '../js/upload.js';
import { contentSummary } from '../js/stats.js';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const T = '2026-10-17';
const at = (y, m, d) => new Date(y, m - 1, d, 12).getTime(); // 한낮 — 시간대 경계에 걸리지 않게

test('📚 한 줄 꼴: 「제목」 · 파일 · 넣은 날 · 길이 · 한 문장 · 🎤 말해 본 문장 · 마지막으로 연 날 — 넣은 차례(오래된 것부터) · 날짜 없는 한 파일', () => {
  const sums = [
    { id: 'b', title: '피카츄가 유력 용의자', videoName: 'prime_suspect.mp4', createdAt: at(2026, 10, 17), duration: 241, total: 65, done: 0, said: 0, saidPct: 0, lastAt: 0 },
    { id: 'a', title: '영상 가', videoName: 'ga.mp4', createdAt: at(2026, 9, 20), duration: 600, total: 8, done: 8, said: 4, saidPct: 50, lastAt: at(2026, 10, 14) }, // 숫자는 지어낸 것
    { id: 'c', title: '짧은 것', videoName: 'short.mp4', createdAt: at(2026, 9, 21), duration: 25, total: 3, done: 1, said: 1, saidPct: 33, lastAt: at(2026, 9, 22) },
  ];
  const [f] = libraryFiles(sums, T);
  assert.equal(f.path, 'english/library.md', '날짜 없이 늘 최신 한 파일');
  const lines = f.text.trim().split('\n');
  assert.equal(lines[0], `📚 태블릿 영상 전체 (${T}) — 3편 · 넣은 차례 · 파일 = 넣을 때 고른 영상 파일 이름`);
  // "수/수 (%)" 꼴은 tools/check.mjs가 공개 파일에서 아이 기록으로 막는다 — 시험에선 함수로 만들어 견준다 (숫자는 모두 지어낸 것)
  const said = (a, b, p) => `🎤 말해 본 문장 ${a}/${b} (${p}%)`;
  assert.deepEqual(lines.slice(2), [
    `- 「영상 가」 · 파일 ga.mp4 · 넣은 날 2026-09-20 · 10분 · 한 문장 8/8 · ${said(4, 8, 50)} · 마지막으로 연 날 2026-10-14`,
    `- 「짧은 것」 · 파일 short.mp4 · 넣은 날 2026-09-21 · 1분 안 · 한 문장 1/3 · ${said(1, 3, 33)} · 마지막으로 연 날 2026-09-22`,
    `- 「피카츄가 유력 용의자」 · 파일 prime_suspect.mp4 · 넣은 날 2026-10-17 · 4분 · 한 문장 0/65 · ${said(0, 65, 0)} · 마지막으로 연 날 안 엶`,
  ]);
  assert.ok(f.text.endsWith('\n'));
  assert.ok(!f.text.includes(String.fromCharCode(0xC9C4, 0xC6B0)), '아이 이름 없이');
});

test('📚 EN_VIDEOS편보다 많아도 전부 · 깨진 영상·모르는 값 · 빈 목록', () => {
  const many = Array.from({ length: EN_VIDEOS + 7 }, (_, i) => ({ id: `v${i}`, title: `영상${i}`, videoName: `v${i}.mp4`, createdAt: at(2026, 9, 1 + i), total: 10, done: 0, said: 0, saidPct: 0, lastAt: 0 }));
  const [f] = libraryFiles(many, T);
  assert.equal((f.text.match(/^- 「/gm) || []).length, EN_VIDEOS + 7, '오래 안 연 영상까지 전부');
  const [g] = libraryFiles([
    { id: 'x', title: '(읽을 수 없는 영상)', broken: true },
    { id: 'y', title: '옛 영상', total: 5, done: 5, said: 5, saidPct: 100, lastAt: 0 },
    null, { title: 'id 없음' },
  ], T);
  assert.ok(g.text.includes('- 「(읽을 수 없는 영상)」 (영상 정보를 못 읽음)'));
  assert.ok(g.text.includes('- 「옛 영상」 · 파일 (모름) · 넣은 날 (모름) · 한 문장 5/5'), '파일 이름·넣은 날이 없는 옛 기록');
  assert.ok(!g.text.includes('id 없음'));
  assert.ok(libraryFiles([], T)[0].text.includes('(영상 없음)'));
  assert.ok(libraryFiles(undefined, T)[0].text.includes('0편'));
});

test('📚 contentSummary가 파일 이름·넣은 때·길이를 넘긴다 (태블릿 영상 항목에 이미 있는 값 — db.addItem)', () => {
  const [s] = contentSummary([{ id: 'i', title: 't', videoName: 'wild2.mp4', createdAt: 123, duration: 540 }], [], () => 46);
  assert.deepEqual([s.videoName, s.createdAt, s.duration, s.total], ['wild2.mp4', 123, 540, 46]);
  const [o] = contentSummary([{ id: 'j', title: '옛' }], [], () => 0);
  assert.deepEqual([o.videoName, o.createdAt, o.duration], ['', 0, 0]);
  assert.match(src('js/db.js'), /videoName: videoFile\.name,[\s\S]{0,200}createdAt: Date\.now\(\),/, '넣을 때 저장하는 값');
});

test('📤 gatherFiles: 영어를 넘기면 english/library.md도 함께 · 안 넘기면 없음 · 영어를 못 읽으면 통째로 실패(그대로)', async () => {
  const base = { getMath: async () => null, listDaily: async () => [], mathReportText: () => '', asksText: () => '', collectTodo: () => [], today: T };
  assert.ok(!(await gatherFiles(base)).some((f) => f.path === 'english/library.md'));
  const files = await gatherFiles({ ...base, getEnglish: async () => [{ id: 'b', title: '영상', videoName: 'b.mp4', createdAt: at(2026, 9, 18), total: 4, done: 4, said: 2, saidPct: 50, lastAt: 3 }] });
  const lib = files.find((f) => f.path === 'english/library.md');
  assert.ok(lib && lib.text.includes('- 「영상」 · 파일 b.mp4 · 넣은 날 2026-09-18'));
  assert.ok(files.some((f) => f.path === `english/${T}.md`), '영어 요약도 그대로');
  await assert.rejects(gatherFiles({ ...base, getEnglish: async () => { throw new Error('idb'); } }));
  assert.match(src('js/upload.js'), /\.\.\.\(getEnglish \? libraryFiles\(en, today\) : \[\]\), \/\/ 📚/);
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(src('sw.js')) || [])[1]) >= 277, 'sw v277 이상');
});
