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
// js 모듈을 새로 만들고 sw.js APP_SHELL에 안 넣으면, 인터넷이 없을 때 그 기능만 조용히 죽는다
// (기기에는 캐시된 옛 파일들만 있고 새 모듈은 받아올 데가 없다)
const sw = readFileSync('sw.js', 'utf8');
for (const f of readdirSync('js').filter((f) => f.endsWith('.js'))) {
  if (!sw.includes(`'./js/${f}'`)) {
    bad++;
    console.error(`sw.js APP_SHELL 누락: js/${f} — 오프라인에서 이 기능이 동작하지 않습니다`);
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
