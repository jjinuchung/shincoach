// 커밋/배포 전 검사: 모든 JS 문법 + JSON 파싱 (heredoc 백슬래시 깨짐 같은 사고 방지)
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

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
// ★ 공개 저장소 파일(앱 js·sw.js는 빌드 없이 주석까지 그대로 배포되고, 도구·테스트·검수 페이지도 누구나 본다)에
//   아이 기록의 점수 꼴 "맞힌 수/푼 수(정답률%)"를 적지 않는다 (Codex 36차 #1) — 기록 수치는 비공개 저장소에만
//   수치가 없어도 기록을 옮겨 적는 말투(📊 기록 뒤에 "에서"나 쌍점, 첫 진단 뒤에 쌍점)는 그 아이의 성적 묘사다 — 진행 기록(process.md)·README도 본다 (Codex 37차 #1)
const SCORE_RE = /\d+\/\d+\s*\(\d+(?:\.\d+)?%\)/;
//   맞힌 수/푼 수 바로 뒤 괄호에 붙인 설명(찍기 확률과 견줌)과, 오답 개수를 가운뎃점으로 늘어놓은 분포도 그 아이의 기록이다 (Codex 38차 #1 — 옛 숫자판 주석)
//   괄호 대신 "="로 붙인 해석("N/M = 찍기")도 같다 (Codex 39차 #1 — 옛 process.md 줄)
const RECORD_RE = /📊 기록(?:에서|:)|첫 진단\s?:|(?<![\d/])\d+\/\d+\s*(?:\(|=\s*)(?:찍|정답률|맞[힌힘혔]|틀[린림렸])|오답이 \d+(?:·\d+){2,}/;
const PUBLIC_TEXT = [
  'sw.js', 'process.md', 'README.md', 'coach/README.md',
  ...readdirSync('js').filter((f) => f.endsWith('.js')).map((f) => 'js/' + f),
  ...readdirSync('tools').filter((f) => f.endsWith('.mjs')).map((f) => 'tools/' + f),
  ...readdirSync('tests').filter((f) => f.endsWith('.js')).map((f) => 'tests/' + f),
  ...readdirSync('coach/math').filter((f) => /\.(html|json)$/.test(f)).map((f) => 'coach/math/' + f),
];
for (const f of PUBLIC_TEXT) {
  const text = readFileSync(f, 'utf8');
  const hit = text.match(SCORE_RE) || text.match(RECORD_RE);
  if (hit) { bad++; console.error(`공개 저장소 파일에 아이 기록: ${f} "${hit[0]}" — 기록 수치·칸별 진단은 비공개 저장소(shincoach-data)에만 적어 주세요`); }
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
const MATH_CHECK = { 'coach/math/fraction.json': '../js/mathgen.js', 'coach/math/negative.json': '../js/mathneg.js', 'coach/math/mixed.json': '../js/mathmix.js', 'coach/math/decimal.json': '../js/mathdec.js', 'coach/math/ratio.json': '../js/mathrat.js', 'coach/math/factor.json': '../js/mathfac.js', 'coach/math/correspond.json': '../js/mathcor.js', 'coach/math/area.json': '../js/matharea.js', 'coach/math/shape.json': '../js/mathshape.js', 'coach/math/data.json': '../js/mathdata.js', 'coach/math/range.json': '../js/mathrange.js', 'coach/math/sym.json': '../js/mathsym.js', 'coach/math/circle.json': '../js/mathcircle.js', 'coach/math/cuboid.json': '../js/mathcuboid.js', 'coach/math/solid.json': '../js/mathsolid.js', 'coach/math/expr.json': '../js/mathexpr.js', 'coach/math/equation.json': '../js/mathequ.js', 'coach/math/coord.json': '../js/mathcoord.js', 'coach/math/space.json': '../js/mathspace.js', 'coach/math/fracdiv.json': '../js/mathfdiv.js', 'coach/math/fracmul.json': '../js/mathfmul.js', 'coach/math/fracadd.json': '../js/mathfadd.js', 'coach/math/decmul.json': '../js/mathdmul.js', 'coach/math/decdiv.json': '../js/mathddiv.js', 'coach/math/bignum.json': '../js/mathbig.js', 'coach/math/angle.json': '../js/mathangle.js', 'coach/math/muldiv.json': '../js/mathmuldiv.js', 'coach/math/move.json': '../js/mathmove.js' };
for (const f of Object.keys(MATH_CHECK)) {
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
// ★ 아이 기록(✍️ 아빠 교정·❓ 아빠 답장)은 공개 저장소에 두지 않는다 (2026-10-07 Codex 35차 #1) —
//   비공개 저장소 shincoach-data의 essay/fixes.json · math/replies.json에 올리고, 앱은 이 기기 📤 열쇠로 읽는다
const PUBLIC_PRIVATE = ['coach/fixes.json', 'coach/math/replies.json'];
for (const f of PUBLIC_PRIVATE) if (existsSync(f)) { bad++; console.error(`공개 저장소에 아이 기록: ${f} — 비공개 저장소(shincoach-data)에 올려 주세요`); }
// 비공개 저장소에 올리기 전 검사: node tools/check.mjs --private <폴더> (그 안의 essay/fixes.json · math/replies.json 중 있는 것)
// 없는 폴더·빈 폴더·폴더 이름 빠짐은 실패 (Codex 36차 #5) — tools/privcheck.mjs
const { privateArg, checkPrivateDir } = await import('./privcheck.mjs');
const priv = privateArg(process.argv);
if (priv.error) { bad++; console.error(priv.error); }
if (priv.dir) {
  const pr = checkPrivateDir(priv.dir, figureSvg);
  for (const msg of pr.errors) { bad++; console.error(msg); }
  if (pr.checked.length) console.log(`비공개 파일 검사: ${pr.checked.map((f) => `${priv.dir}/${f}`).join(' · ')}`);
}
// 📦 아빠의 구호품(coach/gifts.json) — [{ id, items: { 아이템id: 1~10 }, title?, text? }], 틀린 줄은 앱이 조용히 건너뛰므로 여기서 잡는다
try {
  const { parcelOf } = await import('../js/items.js');
  const gifts = JSON.parse(readFileSync('coach/gifts.json', 'utf8'));
  const ids = new Set();
  if (!Array.isArray(gifts)) { bad++; console.error('내용 오류: coach/gifts.json: 배열이 아님'); }
  else gifts.forEach((e, i) => {
    const pc = parcelOf(e);
    if (!pc) { bad++; console.error(`내용 오류: coach/gifts.json[${i}]: { id: 글(64자 안), items: { 가방 아이템id 또는 shiny_charge: 1~10 정수 } } 이어야 함 (🌕 같은 하나뿐인 물건은 못 보냄)`); return; }
    if (ids.has(pc.id)) { bad++; console.error(`내용 오류: coach/gifts.json[${i}]: id "${pc.id}"가 겹침 — 겹친 줄은 아이에게 안 간다`); }
    ids.add(pc.id);
  });
} catch (e) { bad++; console.error(`JSON 오류: coach/gifts.json: ${e.message}`); }
if (bad) {
  console.error(`검사 실패 ${bad}건`);
  process.exit(1);
}
console.log(`검사 통과: JS ${jsFiles.length}개, JSON OK`);
