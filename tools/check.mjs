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
// 🔢 사람이 쓴 수학 내용 — 배포로 실려 가므로 형식(정답·오답·자리표시)을 여기서 잡는다. 줄기마다 검사 모듈이 다르다
const MATH_CHECK = { 'coach/math/fraction.json': '../js/mathgen.js', 'coach/math/negative.json': '../js/mathneg.js' };
for (const f of [...Object.keys(MATH_CHECK), 'coach/fixes.json']) {
  try {
    const data = JSON.parse(readFileSync(f, 'utf8'));
    if (MATH_CHECK[f]) {
      const { checkContent } = await import(MATH_CHECK[f]);
      for (const msg of checkContent(data)) { bad++; console.error(`내용 오류: ${f}: ${msg}`); }
    }
  } catch (e) {
    bad++;
    console.error(`JSON 오류: ${f}: ${e.message}`);
  }
}
if (bad) {
  console.error(`검사 실패 ${bad}건`);
  process.exit(1);
}
console.log(`검사 통과: JS ${jsFiles.length}개, JSON OK`);
