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
for (const f of readdirSync('vocab').filter((f) => f.endsWith('.json'))) {
  try {
    JSON.parse(readFileSync('vocab/' + f, 'utf8'));
  } catch (e) {
    bad++;
    console.error(`JSON 오류: vocab/${f}: ${e.message}`);
  }
}
// 🔢 사람이 쓴 수학 내용 — 배포로 실려 가므로 형식(정답·오답·자리표시)을 여기서 잡는다. 줄기마다 검사 모듈이 다르다
const MATH_CHECK = { 'coach/math/fraction.json': '../js/mathgen.js', 'coach/math/negative.json': '../js/mathneg.js', 'coach/math/mixed.json': '../js/mathmix.js', 'coach/math/decimal.json': '../js/mathdec.js', 'coach/math/ratio.json': '../js/mathrat.js', 'coach/math/factor.json': '../js/mathfac.js', 'coach/math/correspond.json': '../js/mathcor.js', 'coach/math/area.json': '../js/matharea.js', 'coach/math/shape.json': '../js/mathshape.js', 'coach/math/data.json': '../js/mathdata.js', 'coach/math/range.json': '../js/mathrange.js', 'coach/math/sym.json': '../js/mathsym.js', 'coach/math/circle.json': '../js/mathcircle.js', 'coach/math/cuboid.json': '../js/mathcuboid.js', 'coach/math/solid.json': '../js/mathsolid.js', 'coach/math/expr.json': '../js/mathexpr.js', 'coach/math/equation.json': '../js/mathequ.js', 'coach/math/coord.json': '../js/mathcoord.js', 'coach/math/space.json': '../js/mathspace.js', 'coach/math/fracdiv.json': '../js/mathfdiv.js', 'coach/math/fracmul.json': '../js/mathfmul.js' };
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
// 비공개 저장소에 올리기 전 검사: node tools/check.mjs --private <폴더> (그 안의 essay/fixes.json · math/replies.json)
const pi = process.argv.indexOf('--private');
const privDir = pi > 0 ? process.argv[pi + 1] : null;
if (privDir) {
  const fx = `${privDir}/essay/fixes.json`;
  try {
    const list = JSON.parse(readFileSync(fx, 'utf8'));
    if (!Array.isArray(list)) { bad++; console.error(`내용 오류: ${fx}: 배열이 아님`); }
    else list.forEach((e, i) => { if (!e || typeof e.fixed !== 'string' || !e.fixed.trim()) { bad++; console.error(`내용 오류: ${fx}[${i}]: fixed(고친 글)가 있어야 함`); } });
  } catch (e) { if (existsSync(fx)) { bad++; console.error(`JSON 오류: ${fx}: ${e.message}`); } }
  // ❓ 아빠 답장 — [{ no, text }], 그림 지시문은 앱이 아는 것만 (모르면 글자 그대로 아이 화면에 찍힌다)
  const rp = `${privDir}/math/replies.json`;
  try {
    const rep = JSON.parse(readFileSync(rp, 'utf8'));
    if (!Array.isArray(rep)) { bad++; console.error(`내용 오류: ${rp}: 배열이 아님`); }
    else rep.forEach((e, i) => {
      if (!e || !Number.isInteger(e.no) || e.no <= 0 || typeof e.text !== 'string' || !e.text.trim()) { bad++; console.error(`내용 오류: ${rp}[${i}]: { no: 양의 정수, text: 글 } 이어야 함`); return; }
      for (const m of e.text.matchAll(/\[([a-z]+) [^\]]*\]/g)) if (!figureSvg(m[0].slice(1, -1)).startsWith('<svg')) { bad++; console.error(`내용 오류: ${rp}[${i}] (💬${e.no}): 그림 지시문을 못 그림 ${m[0]} — 문법은 [bar 3/4] [pizza 1/4] [bars 1/4 1/6] [line -5..5] [walk -2 +5]`); }
    });
  } catch (e) { if (existsSync(rp)) { bad++; console.error(`JSON 오류: ${rp}: ${e.message}`); } }
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
