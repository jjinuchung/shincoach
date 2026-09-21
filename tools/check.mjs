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
const { figureSvg } = await import('../js/mathdraw.js');
// ❓ 아빠 답장(coach/math/replies.json) — [{ no, text }], 그림 지시문은 앱이 아는 것만 (모르면 글자 그대로 아이 화면에 찍힌다)
try {
  const rep = JSON.parse(readFileSync('coach/math/replies.json', 'utf8'));
  if (!Array.isArray(rep)) { bad++; console.error('내용 오류: coach/math/replies.json: 배열이 아님'); }
  else rep.forEach((e, i) => {
    if (!e || !Number.isInteger(e.no) || e.no <= 0 || typeof e.text !== 'string' || !e.text.trim()) { bad++; console.error(`내용 오류: coach/math/replies.json[${i}]: { no: 양의 정수, text: 글 } 이어야 함`); return; }
    for (const m of e.text.matchAll(/\[([a-z]+) [^\]]*\]/g)) if (!figureSvg(m[0].slice(1, -1)).startsWith('<svg')) { bad++; console.error(`내용 오류: coach/math/replies.json[${i}] (💬${e.no}): 그림 지시문을 못 그림 ${m[0]} — 문법은 [bar 3/4] [pizza 1/4] [bars 1/4 1/6] [line -5..5] [walk -2 +5]`); }
  });
} catch (e) { bad++; console.error(`JSON 오류: coach/math/replies.json: ${e.message}`); }
if (bad) {
  console.error(`검사 실패 ${bad}건`);
  process.exit(1);
}
console.log(`검사 통과: JS ${jsFiles.length}개, JSON OK`);
