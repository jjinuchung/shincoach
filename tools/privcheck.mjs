// 🔒 비공개 저장소(shincoach-data)에 올리기 전 검사 — node tools/check.mjs --private <폴더>
//   폴더 안의 essay/fixes.json(✍️ 아빠 교정) · math/replies.json(❓ 아빠 답장) · korean/replies.json(✍️ 국어 서술형 답장, v237) ·
//   letters/replies.json(📮 포켓몬 편지 답장 — fix 칸까지, v360) 중 **있는 것**을 검사한다
//   (교정만 올릴 때는 답장 파일이 없어도 된다).
// ★ 없는 폴더·검사할 파일이 하나도 없는 폴더·폴더 이름 빠짐은 실패다 (Codex 36차 #5 — 전엔 "검사 통과"로 끝나
//   경로를 잘못 쳐도 검사한 줄 알았다). 검사한 파일 이름을 돌려줘 check.mjs가 찍는다.
import { readFileSync, existsSync, statSync } from 'node:fs';
import { checkReplies } from '../js/korwrite.js';
import { validCards } from '../js/korean.js';
import { nonsulWriteCards, nonsulReasonCards } from '../js/nonsul.js';
import { PRIVATE_MAX_BYTES } from '../js/upload.js';
import { checkLetterReplies, lettersList } from '../js/letters.js';

export const PRIVATE_FILES = ['essay/fixes.json', 'math/replies.json', 'korean/replies.json', 'letters/replies.json'];

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
    if (statSync(f).size > PRIVATE_MAX_BYTES) { errors.push(`크기 오류: ${f}: ${PRIVATE_MAX_BYTES} 바이트를 넘음 — 앱이 하나도 안 받는다(오래된 줄을 지울 것)`); continue; }
    let list;
    try { list = JSON.parse(readFileSync(f, 'utf8')); } catch (e) { errors.push(`JSON 오류: ${f}: ${e.message}`); continue; }
    if (!Array.isArray(list)) { errors.push(`내용 오류: ${f}: 배열이 아님`); continue; }
    if (rel === 'korean/replies.json') {
      // ✍️ 국어 서술형 답장 — [{ card, id, at, v, grade, text }] · 앱이 받을 때와 같은 검사(korwrite.checkReplies) — 서술형 있는 카드·id·at·판(v)·등급·길이·같은 글에 다른 답장·줄 수 상한 (v237 · id v239 · v v243)
      // 🖊️ 논술 짧은 글(v304, N##)·💡 내 이유(v355, R##)도 같은 파일 — 논술 주제 카드를 함께
      const src = (p) => JSON.parse(readFileSync(new URL(`../coach/korean/${p}`, import.meta.url), 'utf8'));
      const nj = src('nonsul.json');
      const cards = [...validCards(src('reading.json')), ...nonsulWriteCards(nj), ...nonsulReasonCards(nj)];
      for (const b of checkReplies(list, cards).bad) errors.push(`내용 오류: ${b.i < 0 ? f : `${f}[${b.i}]`}: ${b.why}`);
      continue;
    }
    if (rel === 'letters/replies.json') {
      // 📮 포켓몬 편지 답장 — [{ mon, id, grade, en, ko, ps, psKo, fix }] · 앱이 받을 때와 같은 검사(letters.checkLetterReplies — 편지 포켓몬·id·등급·길이·fix·따라 읽을 문장 수 · v360 🔍 Codex 164차)
      const L = lettersList(JSON.parse(readFileSync(new URL('../coach/english/letters.json', import.meta.url), 'utf8')));
      for (const b of checkLetterReplies(list, L).bad) errors.push(`내용 오류: ${b.i < 0 ? f : `${f}[${b.i}]`}: ${b.why}`);
      continue;
    }
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
