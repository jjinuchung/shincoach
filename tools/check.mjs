// 커밋/배포 전 검사: 모든 JS 문법 + JSON 파싱 (heredoc 백슬래시 깨짐 같은 사고 방지)
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';

const jsFiles = [
  'sw.js',
  ...readdirSync('js').map((f) => 'js/' + f),
  ...readdirSync('tools').filter((f) => f.endsWith('.mjs')).map((f) => 'tools/' + f),
];
let bad = 0;
for (const f of jsFiles) {
  try {
    execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
  } catch (e) {
    bad++;
    console.error(`문법 오류: ${f}\n${e.stderr.toString().split('\n').slice(0, 4).join('\n')}`);
  }
}
for (const f of readdirSync('vocab').filter((f) => f.endsWith('.json'))) {
  try {
    JSON.parse(readFileSync('vocab/' + f, 'utf8'));
  } catch (e) {
    bad++;
    console.error(`JSON 오류: vocab/${f}: ${e.message}`);
  }
}
if (bad) {
  console.error(`검사 실패 ${bad}건`);
  process.exit(1);
}
console.log(`검사 통과: JS ${jsFiles.length}개, JSON OK`);
