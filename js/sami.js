// SAMI(.smi) 자막 파서 — 한국에서 흔한 형식. 영어/한글이 한 파일에 클래스(ENCC/KRCC)로 함께 들어 있는 경우가 많다.
// parseSami(text) → { tracks: { en: cues[], ko: cues[], ... }, classes: [...] }
// 각 큐는 parseSubtitle과 같은 형식 { index, start, end, text } (초 단위)
import { cleanText } from './srt.js';

/** 다음 SYNC가 없거나 너무 늦으면 큐 길이를 이 값(초)으로 제한 */
const MAX_CUE_DURATION = 10;
const MIN_CUE_DURATION = 0.1;

/** 텍스트가 SAMI 형식인지 */
export function isSami(text) {
  return /<SAMI[\s>]/i.test(text) || /<SYNC\s+Start\s*=/i.test(text);
}

/** HTML 엔티티 일부 디코딩 */
function decodeEntities(s) {
  return s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

/** <STYLE> 블록에서 .CLASS { Lang: ko-KR } 매핑 추출 → { CLASS: 'ko' } */
function parseStyleLangs(text) {
  const map = {};
  const style = text.match(/<STYLE[^>]*>([\s\S]*?)<\/STYLE>/i);
  if (!style) return map;
  const body = style[1].replace(/<!--|-->/g, '');
  const re = /\.([A-Za-z0-9_-]+)\s*\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(body))) {
    const lang = m[2].match(/lang\s*:\s*([A-Za-z]{2})/i);
    const name = m[2].match(/name\s*:\s*([^;]+)/i);
    let code = lang ? lang[1].toLowerCase() : '';
    if (!code && name) {
      const n = name[1].toLowerCase();
      if (/korea|한국/.test(n)) code = 'ko';
      else if (/english|영어/.test(n)) code = 'en';
    }
    if (code) map[m[1].toUpperCase()] = code;
  }
  return map;
}

/** 클래스 이름 → 언어 코드 추정 (스타일 정보 없을 때) */
function guessLangFromClass(cls) {
  const c = (cls || '').toUpperCase();
  if (/^(KR|KO|KOR|KRCC|KOCC|KOKR)/.test(c)) return 'ko';
  if (/^(EN|ENG|ENUS|ENCC|ENUSCC)/.test(c)) return 'en';
  if (/^(JA|JP|JPN)/.test(c)) return 'ja';
  if (/^(ZH|CN|CH)/.test(c)) return 'zh';
  return '';
}

/** 내용으로 언어 추정: 한글이 있으면 ko, 아니면 en */
function guessLangFromText(cues) {
  const sample = cues.slice(0, 50).map((c) => c.text).join(' ');
  const hangul = (sample.match(/[가-힣]/g) || []).length;
  const latin = (sample.match(/[A-Za-z]/g) || []).length;
  if (hangul === 0 && latin === 0) return 'en';
  return hangul > latin * 0.3 ? 'ko' : 'en';
}

/**
 * SAMI 파싱. 반환: { tracks: { [lang]: cues[] }, classes: string[] }
 * - 빈 SYNC(&nbsp;)는 이전 큐의 종료 표시
 * - 큐 종료 시각 = 같은 클래스의 다음 SYNC 시작 (최대 MAX_CUE_DURATION초)
 */
export function parseSami(text) {
  const src = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const styleLangs = parseStyleLangs(src);
  const bodyMatch = src.match(/<BODY[^>]*>([\s\S]*?)(<\/BODY>|$)/i);
  const body = bodyMatch ? bodyMatch[1] : src;

  // SYNC 블록 분할
  const syncRe = /<SYNC\s+[^>]*?Start\s*=\s*"?(-?\d+)"?[^>]*>/gi;
  const syncs = [];
  let m;
  const starts = [];
  while ((m = syncRe.exec(body))) starts.push({ ms: Number(m[1]), at: m.index, len: m[0].length });
  for (let i = 0; i < starts.length; i++) {
    const s = starts[i];
    const contentEnd = i + 1 < starts.length ? starts[i + 1].at : body.length;
    syncs.push({ start: Math.max(0, s.ms) / 1000, html: body.slice(s.at + s.len, contentEnd) });
  }

  // SYNC 안의 <P Class=...> 세그먼트 → 클래스별 원시 항목
  const raw = {}; // class → [{start, text}]
  const pRe = /<P\b([^>]*)>/gi;
  for (const sync of syncs) {
    const parts = [];
    let last = null;
    let pm;
    pRe.lastIndex = 0;
    while ((pm = pRe.exec(sync.html))) {
      if (last) parts.push({ attrs: last.attrs, html: sync.html.slice(last.end, pm.index) });
      last = { attrs: pm[1], end: pm.index + pm[0].length };
    }
    if (last) parts.push({ attrs: last.attrs, html: sync.html.slice(last.end) });
    else parts.push({ attrs: '', html: sync.html }); // <P> 없이 텍스트만 있는 경우

    for (const part of parts) {
      const cm = part.attrs.match(/class\s*=\s*"?([A-Za-z0-9_-]+)"?/i);
      const cls = cm ? cm[1].toUpperCase() : 'DEFAULT';
      const textHtml = part.html
        .replace(/<\/P>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n');
      const txt = cleanText(decodeEntities(textHtml)).replace(/[ \t]*\n[ \t]*/g, '\n').trim();
      (raw[cls] ||= []).push({ start: sync.start, text: txt });
    }
  }

  // 클래스별로 종료 시각 계산 + 빈 항목 제거
  const tracks = {};
  const classes = Object.keys(raw);
  for (const cls of classes) {
    const items = raw[cls].sort((a, b) => a.start - b.start);
    const cues = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.text) continue;
      const nextStart = i + 1 < items.length ? items[i + 1].start : it.start + MAX_CUE_DURATION;
      const end = Math.min(nextStart, it.start + MAX_CUE_DURATION);
      if (end - it.start < MIN_CUE_DURATION) continue;
      cues.push({ index: cues.length, start: it.start, end, text: it.text });
    }
    if (cues.length === 0) continue;

    let lang = styleLangs[cls] || guessLangFromClass(cls) || guessLangFromText(cues);
    if (tracks[lang]) lang = `${lang}-${cls.toLowerCase()}`; // 같은 언어 클래스가 둘이면 구분
    tracks[lang] = cues;
  }

  return { tracks, classes };
}

/** 초 → "00:00:01,000" */
function srtTime(sec) {
  const ms = Math.round(sec * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const r = ms % 1000;
  const p = (n, w) => String(n).padStart(w, '0');
  return `${p(h, 2)}:${p(m, 2)}:${p(s, 2)},${p(r, 3)}`;
}

/** 큐 배열 → SRT 텍스트 (저장/번역용 공통 포맷) */
export function toSrt(cues) {
  return cues.map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.text}\n`).join('\n');
}
