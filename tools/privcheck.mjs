// 🔒 비공개 저장소(shincoach-data)에 올리기 전 검사 — node tools/check.mjs --private <폴더>
//   폴더 안의 essay/fixes.json(✍️ 아빠 교정) · math/replies.json(❓ 아빠 답장) · korean/replies.json(✍️ 국어 서술형 답장, v237) ·
//   letters/replies.json(📮 포켓몬 편지 답장 — fix 칸까지, v360) 중 **있는 것**을 검사한다
//   (교정만 올릴 때는 답장 파일이 없어도 된다).
// ★ 없는 폴더·검사할 파일이 하나도 없는 폴더·폴더 이름 빠짐은 실패다 (Codex 36차 #5 — 전엔 "검사 통과"로 끝나
//   경로를 잘못 쳐도 검사한 줄 알았다). 검사한 파일 이름을 돌려줘 check.mjs가 찍는다.
// 📰 신문 기사 원고 news/n1~n4.json(v428)도 있는 것만 — 앱이 받을 때와 같은 검사(news.js) · 겹친 id · NEWS_ORDER와 맞는지
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { checkReplies } from '../js/korwrite.js';
import { validCards, checkNewsCard } from '../js/korean.js';
import { nonsulWriteCards, nonsulReasonCards, checkNewsTopic } from '../js/nonsul.js';
import { PRIVATE_MAX_BYTES } from '../js/upload.js';
import { checkLetterReplies, lettersList } from '../js/letters.js';
import { NEWS_PATHS, newsFilesOf } from '../js/news.js';
import { NEWS_ORDER } from '../js/kordrip.js';

export const PRIVATE_FILES = ['essay/fixes.json', 'math/replies.json', 'korean/replies.json', 'letters/replies.json'];

/** 📰 공개 저장소에 있으면 안 되는 신문 경로인가 (v428) — 어느 깊이든 이름이 news인 폴더 안 (js/news.js 같은 파일 이름은 괜찮다) */
export function isNewsPath(p) {
  return /(^|\/)news\//.test(String(p).replace(/\\/g, '/'));
}
/** 📰 기사 원고를 둘 만한 공개 저장소 폴더 자리 — 빈 폴더는 git 목록에 안 나오니 따로 본다 */
export const PUBLIC_NEWS_DIRS = ['news', 'coach/news', 'coach/korean/news'];
/**
 * 📰 공개 저장소의 신문 원고 자리 (v428 — check.mjs가 부른다) → 걸린 경로 목록(비면 통과)
 * @param {string[]} files git이 올릴 수 있는 파일(git ls-files --cached --others --exclude-standard — .context처럼 무시하는 곳은 안 나온다)
 * @param {(p:string) => boolean} [exists] 폴더 자리가 있나 (시험용)
 */
export function publicNewsHits(files, exists = existsSync) {
  const hits = [...PUBLIC_NEWS_DIRS.filter((d) => exists(d)).map((d) => `${d}/`), ...(Array.isArray(files) ? files : []).filter(isNewsPath)];
  return [...new Set(hits)];
}

/**
 * 📰 신문 기사 원고 검사 (v428) — { 경로: 원고 배열 } (NEWS_PATHS 중 받은 것만) → 틀린 곳 글 목록
 *   줄마다 카드 checkNewsCard · 주제 checkNewsTopic(앱 news.newsOf와 같은 검사 — 앱은 깨진 줄·주제를 조용히 빼고 📥에 ⚠️만) ·
 *   앞 파일과 겹친 id(NEWS_PATHS 차례 — 앱은 앞 파일 것을 쓴다) · NEWS_ORDER에 없는 카드(앱이 열지 않는다) ·
 *   넷이 다 있으면 NEWS_ORDER의 기사가 모두 있는지 (한 파일만 고쳐 올릴 때는 빠진 것을 묻지 않는다)
 * @param {Object<string, Array>} files @param {(rel:string) => string} [nameOf] 글에 쓸 파일 이름
 */
export function newsProblems(files, nameOf = (rel) => rel) {
  const errors = [];
  const ids = new Set();
  const order = new Set(NEWS_ORDER);
  for (const rel of NEWS_PATHS) {
    if (!files || !Array.isArray(files[rel])) continue;
    files[rel].forEach((row, i) => {
      const at = `${nameOf(rel)}[${i}]`;
      if (!row || typeof row !== 'object' || Array.isArray(row) || !row.card || typeof row.card !== 'object') { errors.push(`내용 오류: ${at}: 줄은 { card, topic? }`); return; }
      for (const k of Object.keys(row)) if (k !== 'card' && k !== 'topic') errors.push(`내용 오류: ${at}: 줄에는 card·topic만 — ${k}`);
      const errs = checkNewsCard(row.card, ids);
      for (const m of errs) errors.push(`내용 오류: ${at}: ${m}`);
      if (errs.length) return;
      if (!order.has(row.card.id)) errors.push(`내용 오류: ${at}: ${row.card.id}는 kordrip NEWS_ORDER에 없어 앱이 열지 않아요`);
      if (row.topic !== undefined) for (const m of checkNewsTopic(row.topic, row.card)) errors.push(`내용 오류: ${at}: 주제 ${m}`);
    });
  }
  // 앱이 실제로 쓰는 것과 같은지 (상한 MAX_NEWS 같은 위 검사 밖의 까닭도)
  const all = newsFilesOf(files);
  for (const [rel, n] of Object.entries(all.bad)) if (n && !errors.some((m) => m.includes(`${nameOf(rel)}[`))) errors.push(`내용 오류: ${nameOf(rel)}: 앱이 받지 않는 줄 ${n}`);
  if (NEWS_PATHS.every((rel) => files && Array.isArray(files[rel]))) {
    const have = new Set(all.cards.map((c) => c.id));
    const lost = NEWS_ORDER.filter((id) => !have.has(id));
    if (lost.length) errors.push(`내용 오류: news/: NEWS_ORDER의 기사 ${lost.length}편이 네 파일에 없어요 — ${lost.join(' ')}`);
  }
  return errors;
}

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
      list.forEach((e, i) => {
        if (!e || typeof e.fixed !== 'string' || !e.fixed.trim()) errors.push(`내용 오류: ${f}[${i}]: fixed(고친 글)가 있어야 함`);
        // 🤫 확인만(v409) — 앱은 true일 때만 알아듣는다 ("true" 글자·1은 진우 화면에 그대로 뜬다)
        else if ('quiet' in e && e.quiet !== true) errors.push(`내용 오류: ${f}[${i}]: quiet는 true만 써요 (확인만이 아니면 칸을 빼기)`);
      });
      continue;
    }
    // ❓ 아빠 답장 — [{ no, text }], 그림 지시문은 앱이 아는 것만
    list.forEach((e, i) => {
      if (!e || !Number.isInteger(e.no) || e.no <= 0 || typeof e.text !== 'string' || !e.text.trim()) { errors.push(`내용 오류: ${f}[${i}]: { no: 양의 정수, text: 글 } 이어야 함`); return; }
      for (const m of e.text.matchAll(/\[([a-z]+) [^\]]*\]/g)) if (!String(figureSvg(m[0].slice(1, -1))).startsWith('<svg')) errors.push(`내용 오류: ${f}[${i}] (💬${e.no}): 그림 지시문을 못 그림 ${m[0]} — 문법은 [bar 3/4] [pizza 1/4] [bars 1/4 1/6] [line -5..5] [walk -2 +5]`);
    });
  }
  // 📰 신문 기사 원고 (v428) — news/n1~n4.json 중 있는 것 · 앱은 NEWS_PATHS만 받는다(news/의 다른 파일은 안 받으니 이름을 바로잡게)
  const news = {};
  for (const rel of NEWS_PATHS) {
    const f = `${dir}/${rel}`;
    if (!existsSync(f)) continue;
    checked.push(rel);
    if (statSync(f).size > PRIVATE_MAX_BYTES) { errors.push(`크기 오류: ${f}: ${PRIVATE_MAX_BYTES} 바이트를 넘음 — 앱이 이 파일을 하나도 안 받는다(기사를 다른 파일로 나눌 것)`); continue; }
    let list;
    try { list = JSON.parse(readFileSync(f, 'utf8')); } catch (e) { errors.push(`JSON 오류: ${f}: ${e.message}`); continue; }
    if (!Array.isArray(list)) { errors.push(`내용 오류: ${f}: 배열이 아님`); continue; }
    news[rel] = list;
  }
  if (existsSync(`${dir}/news`) && statSync(`${dir}/news`).isDirectory()) {
    for (const x of readdirSync(`${dir}/news`)) if (!NEWS_PATHS.includes(`news/${x}`)) errors.push(`내용 오류: ${dir}/news/${x}: 앱은 ${NEWS_PATHS.join(' · ')}만 받아요`);
  }
  errors.push(...newsProblems(news, (rel) => `${dir}/${rel}`));
  if (!checked.length) errors.push(`검사할 파일이 없음: ${dir} 안에 ${[...PRIVATE_FILES, ...NEWS_PATHS].join(' · ')} 중 하나가 있어야 해요`);
  return { errors, checked };
}
