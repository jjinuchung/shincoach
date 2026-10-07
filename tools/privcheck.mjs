// 🔒 비공개 저장소(shincoach-data)에 올리기 전 검사 — node tools/check.mjs --private <폴더>
//   폴더 안의 essay/fixes.json(✍️ 아빠 교정) · math/replies.json(❓ 아빠 답장) 중 **있는 것**을 검사한다
//   (교정만 올릴 때는 답장 파일이 없어도 된다).
// ★ 없는 폴더·검사할 파일이 하나도 없는 폴더·폴더 이름 빠짐은 실패다 (Codex 36차 #5 — 전엔 "검사 통과"로 끝나
//   경로를 잘못 쳐도 검사한 줄 알았다). 검사한 파일 이름을 돌려줘 check.mjs가 찍는다.
import { readFileSync, existsSync, statSync } from 'node:fs';

export const PRIVATE_FILES = ['essay/fixes.json', 'math/replies.json'];

/** argv → { dir } (--private을 안 쓰면 dir null) · --private 뒤에 폴더 이름이 없으면 { error } */
export function privateArg(argv) {
  const i = argv.indexOf('--private');
  if (i < 0) return { dir: null };
  const d = argv[i + 1];
  if (!d || d.startsWith('--')) return { error: '--private 뒤에 폴더 이름을 써 주세요 (예: node tools/check.mjs --private <scratchpad>/priv)' };
  return { dir: d };
}

/**
 * 비공개 폴더 검사 → { errors: 글[], checked: 검사한 파일[] }
 * @param {string} dir
 * @param {(spec: string) => string} figureSvg ❓ 답장의 그림 지시문을 앱이 그릴 수 있는지 (못 그리면 글자 그대로 아이 화면에 찍힌다)
 */
export function checkPrivateDir(dir, figureSvg) {
  const errors = []; const checked = [];
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return { errors: [`비공개 폴더가 없음: ${dir}`], checked };
  for (const rel of PRIVATE_FILES) {
    const f = `${dir}/${rel}`;
    if (!existsSync(f)) continue;
    checked.push(rel);
    let list;
    try { list = JSON.parse(readFileSync(f, 'utf8')); } catch (e) { errors.push(`JSON 오류: ${f}: ${e.message}`); continue; }
    if (!Array.isArray(list)) { errors.push(`내용 오류: ${f}: 배열이 아님`); continue; }
    if (rel === 'essay/fixes.json') {
      list.forEach((e, i) => { if (!e || typeof e.fixed !== 'string' || !e.fixed.trim()) errors.push(`내용 오류: ${f}[${i}]: fixed(고친 글)가 있어야 함`); });
      continue;
    }
    // ❓ 아빠 답장 — [{ no, text }], 그림 지시문은 앱이 아는 것만
    list.forEach((e, i) => {
      if (!e || !Number.isInteger(e.no) || e.no <= 0 || typeof e.text !== 'string' || !e.text.trim()) { errors.push(`내용 오류: ${f}[${i}]: { no: 양의 정수, text: 글 } 이어야 함`); return; }
      for (const m of e.text.matchAll(/\[([a-z]+) [^\]]*\]/g)) if (!String(figureSvg(m[0].slice(1, -1))).startsWith('<svg')) errors.push(`내용 오류: ${f}[${i}] (💬${e.no}): 그림 지시문을 못 그림 ${m[0]} — 문법은 [bar 3/4] [pizza 1/4] [bars 1/4 1/6] [line -5..5] [walk -2 +5]`);
    });
  }
  if (!checked.length) errors.push(`검사할 파일이 없음: ${dir} 안에 ${PRIVATE_FILES.join(' · ')} 중 하나가 있어야 해요`);
  return { errors, checked };
}
