// 🔒 비공개 저장소에 올리기 전 검사 (node tools/check.mjs --private <폴더>) — Codex 36차 #5:
//   없는 폴더·빈 폴더·폴더 이름 빠짐이 "검사 통과"로 끝나면, 잘못 친 경로로도 검사한 줄 안다
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { privateArg, checkPrivateDir } from '../tools/privcheck.mjs';
import { figureSvg } from '../js/mathdraw.js';

test('🔒 --private 뒤에 폴더 이름이 없으면 실패 · 있으면 그 폴더 · 안 쓰면 비공개 검사 없음', () => {
  assert.deepEqual(privateArg(['node', 'check.mjs']), { dir: null });
  assert.ok(privateArg(['node', 'check.mjs', '--private']).error, '폴더 이름 빠짐');
  assert.ok(privateArg(['node', 'check.mjs', '--private', '--x']).error, '다음 옵션을 폴더로 읽지 않는다');
  assert.deepEqual(privateArg(['node', 'check.mjs', '--private', 'priv']), { dir: 'priv' });
});

test('🔒 없는 폴더·검사할 파일이 하나도 없는 폴더는 실패 · 검사한 파일 이름을 돌려준다 · 깨진 JSON·못 그리는 지시문은 오류', () => {
  const base = mkdtempSync(join(tmpdir(), 'priv-'));
  try {
    assert.ok(checkPrivateDir(join(base, 'nope'), figureSvg).errors.length, '없는 폴더');
    assert.ok(checkPrivateDir(base, figureSvg).errors.length, '빈 폴더');
    mkdirSync(join(base, 'essay'));
    writeFileSync(join(base, 'essay', 'fixes.json'), JSON.stringify([{ date: '2026-10-07', written: 'a', origin: 'b', fixed: 'c' }]));
    const r = checkPrivateDir(base, figureSvg);
    assert.deepEqual(r.errors, []);
    assert.deepEqual(r.checked, ['essay/fixes.json'], '있는 파일만 — 교정만 올릴 때는 답장 파일이 없어도 된다');
    mkdirSync(join(base, 'math'));
    writeFileSync(join(base, 'math', 'replies.json'), JSON.stringify([{ no: 1, text: '그림 [zzz 1/2]' }]));
    const r2 = checkPrivateDir(base, figureSvg);
    assert.deepEqual(r2.checked, ['essay/fixes.json', 'math/replies.json']);
    assert.ok(r2.errors.some((m) => /그림 지시문/.test(m)), '못 그리는 지시문');
    writeFileSync(join(base, 'math', 'replies.json'), JSON.stringify([{ no: 1, text: '[fmul rep 2/5 3] 이렇게 봐요' }]));
    assert.deepEqual(checkPrivateDir(base, figureSvg).errors, [], '앱이 아는 지시문');
    writeFileSync(join(base, 'essay', 'fixes.json'), '{');
    assert.ok(checkPrivateDir(base, figureSvg).errors.some((m) => /JSON/.test(m)), '깨진 JSON');
    writeFileSync(join(base, 'essay', 'fixes.json'), JSON.stringify([{ written: 'a' }]));
    assert.ok(checkPrivateDir(base, figureSvg).errors.some((m) => /fixed/.test(m)), '고친 글 없음');
  } finally { rmSync(base, { recursive: true, force: true }); }
});

// Codex 36차 #1 — 공개 앱 파일은 빌드 없이 주석까지 그대로 배포된다. 아이 기록의 점수("12/34(35%)")가 주석에 실렸다
test('🔒 공개 앱 파일(js·sw.js)에 아이 점수 꼴 "N/M(P%)"이 없다 · check.mjs가 다시 들어오는 것을 막는다', () => {
  const re = /\d+\/\d+\s*\(\d+(?:\.\d+)?%\)/;
  const files = ['sw.js', ...readdirSync('js').filter((f) => f.endsWith('.js')).map((f) => `js/${f}`)];
  for (const f of files) assert.ok(!re.test(readFileSync(f, 'utf8')), `${f}: ${(readFileSync(f, 'utf8').match(re) || [])[0]}`);
  assert.ok(files.length > 50);
  const chk = readFileSync('tools/check.mjs', 'utf8');
  assert.ok(chk.includes('SCORE_RE') && chk.includes(re.source), 'check.mjs가 같은 꼴로 막는다');
});

test('🔒 check.mjs --private <없는 폴더> → 실패로 끝나고 그 폴더 이름을 말한다 (전엔 "검사 통과")', () => {
  const r = spawnSync(process.execPath, ['tools/check.mjs', '--private', '__no_such_private_dir__'], { encoding: 'utf8' });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /__no_such_private_dir__/);
});
