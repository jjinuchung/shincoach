// 📁 영상 가져오기: 한 번에 고른 파일들을 역할별로 나눈다 (순수 함수 — 테스트 가능)
//
// 왜 (2026-09-19, 아버님 요청): 영상·영어 자막·한글 자막을 **하나씩 세 번** 고르게 되어 있었다.
// 그런데 학습 자료는 늘 같은 폴더에 같은 이름 규칙으로 만들어 둔다:
//   iconic.mp4 · iconic.en.srt · iconic.ko.srt
// 한 번에 다 고르게 하고 이름으로 나누면 세 번이 한 번이 된다.
//
// 브라우저는 고른 파일 밖의 폴더를 들여다볼 수 없다(보안). 그래서 "mp4 하나만 고르면 자막이
// 딸려오는" 방식은 만들 수 없다. 대신 **폴더를 통째로 고르면** 그 안의 파일이 전부 들어온다
// (`webkitdirectory`). 안드로이드 Chrome은 147부터 폴더 고르기를 지원하고 태블릿은 152다.
// 태블릿에서 파일 여러 개를 길게 눌러 고르는 것보다 폴더 하나를 탭하는 쪽이 훨씬 쉽다.
//
// ★ 폴더를 고르면 다른 편의 자막·작업 파일까지 같이 들어온다
//   (260918 폴더에는 iconic·wild2·prime_suspect가 다 있고 whisper 초안·로그도 섞여 있다).
//   그래서 **영상 파일 이름과 짝이 맞는 자막을 먼저** 쓴다 — 아버님이 늘 같은 이름으로 만들어 두므로.

import { LOCKED } from './unlock.js';

const VIDEO_EXT = ['mp4', 'webm', 'm4v', 'mov', 'mkv', 'avi', 'ogv'];
const SUB_EXT = ['srt', 'vtt', 'smi', 'sami', 'ass', 'ssa'];

/** 파일명에서 확장자만 (소문자, 점 없음) */
export function extOf(name) {
  const m = String(name || '').match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : '';
}

/** 확장자를 뗀 이름 */
export function baseOf(name) {
  return String(name || '').replace(/\.[a-z0-9]+$/i, '');
}

export function isVideoFile(file) {
  if (!file) return false;
  if (String(file.type || '').startsWith('video/')) return true;
  return VIDEO_EXT.indexOf(extOf(file.name)) >= 0;
}

export function isSubtitleFile(file) {
  return !!file && SUB_EXT.indexOf(extOf(file.name)) >= 0;
}

/**
 * 자막 파일명이 어느 언어인지 (`iconic.en.srt` → 'en').
 * 확장자를 뗀 뒤 **마지막 토큰**만 본다 — 영상 이름 자체에 'ko'가 들어가도(예: `kong.srt`)
 * 언어로 오해하지 않게. 구분자는 . _ - 공백.
 */
export function langOf(name) {
  const base = baseOf(name).toLowerCase();
  const tail = base.split(/[._\-\s]+/).pop() || '';
  if (tail === 'en' || tail === 'eng' || tail === 'english') return 'en';
  if (tail === 'ko' || tail === 'kor' || tail === 'korean' || tail === 'kr') return 'ko';
  if (/한글|한국어/.test(base)) return 'ko';
  if (/영어/.test(base)) return 'en';
  return '';
}

/**
 * 고른 파일들을 역할별로 나눈다.
 *
 * 언어 표시가 없는 자막이 섞여 있어도 최대한 살린다:
 *  - 한쪽만 비어 있으면 그 자리에 넣는다 (영어 자막이 필수라 영어를 먼저 채운다)
 *  - 둘 다 차 있으면 남는 것으로 (호출부가 화면에 보여 주고 아버님이 바꿀 수 있다)
 *
 * @param {File[]|FileList} files
 * @returns {{video:File|null, en:File|null, ko:File|null, ignored:File[]}}
 */
export function belongsTo(subName, videoBase) {
  if (!videoBase) return false;
  const b = baseOf(subName).toLowerCase();
  if (b === videoBase) return true;
  // 경계를 봐야 한다 — 'iconic'으로 'iconic2.en.srt'까지 끌어오면 안 된다
  return b.startsWith(videoBase) && /[._\-\s]/.test(b.charAt(videoBase.length));
}

export function classifyFiles(files) {
  const list = Array.from(files || []).filter(Boolean);
  const videos = list.filter(isVideoFile);
  const subs = list.filter(isSubtitleFile);
  const others = list.filter((f) => !isVideoFile(f) && !isSubtitleFile(f));

  // 영상이 여러 개면 가장 큰 것 (자르다 만 조각보다 본편일 가능성이 높다)
  const video = videos.slice().sort((a, b) => (b.size || 0) - (a.size || 0))[0] || null;
  const vbase = video ? baseOf(video.name).toLowerCase() : '';

  // ★ 영상과 이름이 맞는 자막을 먼저 쓴다. 폴더를 통째로 골라 여러 편이 섞여도 짝이 안 어긋난다
  const mine = subs.filter((f) => belongsTo(f.name, vbase));
  const pool = mine.length ? mine : subs;

  const out = { video, en: null, ko: null, ignored: [] };
  const unlabeled = [];
  for (const f of pool) {
    const lang = langOf(f.name);
    if (lang === 'en' && !out.en) out.en = f;
    else if (lang === 'ko' && !out.ko) out.ko = f;
    else unlabeled.push(f);
  }
  // 언어 표시가 없는 자막도 버리지 않는다 (영어가 필수라 영어부터 채운다)
  for (const f of unlabeled) {
    if (!out.en) out.en = f;
    else if (!out.ko) out.ko = f;
  }

  const used = new Set([video, out.en, out.ko].filter(Boolean));
  for (const f of list) if (!used.has(f)) out.ignored.push(f);
  return out;
}

/**
 * 영상 파일명으로 제목 제안.
 *
 * ★ 🎟️ 교환권 목록에 있는 영상이면 **그 제목을 그대로** 쓴다. 배달 판정이 제목 일치라서,
 *   아버님이 한 글자라도 다르게 쓰면 "샀어요, 아빠에게 보여주세요" 카드가 안 사라진다
 *   (2026-09-19에 실제로 겪었다). 파일명 `iconic.mp4` → '지우와 피카츄 최고의 순간'.
 */
export function suggestTitle(videoName) {
  const base = baseOf(videoName).trim();
  if (!base) return '';
  const key = base.toLowerCase();
  const hit = LOCKED.find((c) => c.id.toLowerCase() === key);
  return hit ? hit.ko : base;
}

/** 화면에 보여 줄 한 줄 요약 (무엇이 빠졌는지 바로 알게) */
export function describePick(picked) {
  // 국기 이모지(🇬🇧🇰🇷)는 윈도우에서 'GB'·'KR' 글자로 나온다 — 아버님이 노트북에서 넣을 때
  // 깨져 보인다. 어디서나 같은 모양인 말풍선을 쓰고 구분은 라벨이 한다
  const rows = [
    { icon: '🎬', label: '영상', file: picked.video, need: true },
    { icon: '💬', label: '영어 자막', file: picked.en, need: true },
    { icon: '💭', label: '한글 자막', file: picked.ko, need: false },
  ];
  return rows.map((r) => ({
    ...r,
    name: r.file ? r.file.name : '',
    ok: !!r.file,
  }));
}
