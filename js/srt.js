// 자막(SRT/VTT) 파서 + 영/한 자막 병합 + 문장 단위 합치기 + 단어 타이밍 추정
// 외부 의존성 없음. 브라우저와 Node 양쪽에서 동작.

/** "00:01:02,345" 또는 "01:02.345" → 초(number) */
export function parseTimestamp(str) {
  const m = str.trim().match(/^(?:(\d+):)?(\d{1,2}):(\d{1,2})[,.](\d{1,3})$/);
  if (!m) return NaN;
  const h = Number(m[1] || 0);
  const min = Number(m[2]);
  const s = Number(m[3]);
  const ms = Number(m[4].padEnd(3, '0'));
  return h * 3600 + min * 60 + s + ms / 1000;
}

/** 초 → "mm:ss" */
export function formatTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * 자막 텍스트 정리: <i> 등 태그, {\an8}, 엔티티 제거
 * + CC(청각장애인용) 자막의 효과음 설명 "(muffled shouting)" "[music]", 화자 표시 "WOODY:" 제거
 * 결과가 비면 호출 측에서 큐를 버림
 */
export function cleanText(text) {
  return text
    .replace(/<[^>]+>/g, '')          // HTML 태그
    .replace(/\{\\[^}]*\}/g, '')      // ASS 스타일 태그 {\an8}
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\([^)]*\)|\[[^\]]*\]/g, '')            // (효과음) [소리]
    .replace(/^[ \t]*[A-Z][A-Z0-9 .'\-]{0,24}:\s*/gm, '') // 줄 앞 화자 표시 "WOODY:" "MAN 2:"
    .replace(/[ \t]+/g, ' ')
    .replace(/^[ \t]*[-–—:]+[ \t]*/gm, '')    // 줄 앞 대사 표시 "- " 및 남은 ":"
    .replace(/^[ \t]*$\n?/gm, '')             // 빈 줄 제거
    .trim()
    // 두 화자가 같은 말을 동시에 하는 경우 "- 가자!\n- 가자!" → 한 줄로
    .split('\n').filter((line, i, arr) => i === 0 || line.trim() !== arr[i - 1].trim()).join('\n');
}

const TIME_LINE = /^(\S+)\s+-->\s+(\S+)(?:\s+.*)?$/;

/** 이 길이(초) 미만인 큐는 잘못된 타임코드로 보고 제외 */
const MIN_CUE_DURATION = 0.1;

/**
 * SRT 또는 VTT 텍스트 → [{ index, start, end, text }]
 * - BOM, CRLF 처리, 공백만 있는 구분 줄도 블록 경계로 인식
 * - 번호 줄(숫자) 또는 VTT 문자열 cue ID 줄은 있어도 없어도 됨
 * - 빈 텍스트 큐, end ≤ start 큐는 버림 (버린 개수는 반환 배열의 `skipped` 속성)
 */
export function parseSubtitle(text) {
  const normalized = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const blocks = normalized.split(/\n[ \t]*\n(?:[ \t]*\n)*/);
  const cues = [];
  let skipped = 0;

  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trimEnd()).filter((l, i, arr) => !(l === '' && i === arr.length - 1));
    if (lines.length === 0) continue;

    // VTT 헤더/NOTE/STYLE 블록 건너뛰기
    if (/^WEBVTT/.test(lines[0]) || /^NOTE(\s|$)/.test(lines[0]) || /^STYLE$/.test(lines[0]) || /^REGION$/.test(lines[0])) continue;

    let li = 0;
    // 첫 줄이 타임코드가 아니고 둘째 줄이 타임코드면 → 번호/ID 줄로 보고 건너뜀
    if (!TIME_LINE.test(lines[0]) && lines.length > 1 && TIME_LINE.test(lines[1])) li = 1;

    const tm = lines[li] && lines[li].match(TIME_LINE);
    if (!tm) continue;
    const start = parseTimestamp(tm[1]);
    const end = parseTimestamp(tm[2]);
    if (!Number.isFinite(start) || !Number.isFinite(end)) { skipped++; continue; }
    if (end - start < MIN_CUE_DURATION) { skipped++; continue; }

    const body = cleanText(lines.slice(li + 1).join('\n'));
    if (!body) continue;

    cues.push({ index: cues.length, start, end, text: body });
  }

  cues.sort((a, b) => a.start - b.start);
  cues.forEach((c, i) => { c.index = i; });
  cues.skipped = skipped;
  return cues;
}

/** 두 구간의 겹치는 길이(초) */
function overlap(a, b) {
  return Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start));
}

/**
 * 영어 큐에 한글 큐를 시간 겹침 기준으로 매칭
 * → [{ index, start, end, en, ko }]
 * 한글 큐가 영어 큐 하나에 여러 개 겹치면 이어 붙임.
 */
export function mergeSubtitles(enCues, koCues = []) {
  let kj = 0; // koCues는 정렬되어 있으므로 포인터 전진
  return enCues.map((en, i) => {
    const parts = [];
    // 겹칠 가능성 없는 앞쪽 한글 큐는 건너뜀
    while (kj < koCues.length && koCues[kj].end <= en.start) kj++;
    for (let j = kj; j < koCues.length && koCues[j].start < en.end; j++) {
      const ko = koCues[j];
      const ov = overlap(en, ko);
      const koDur = ko.end - ko.start;
      const enDur = en.end - en.start;
      // 한글 큐의 절반 이상 또는 영어 큐의 절반 이상이 겹치면 채택
      if (ov >= koDur * 0.5 || ov >= enDur * 0.5) parts.push(ko.text);
    }
    return { index: i, start: en.start, end: en.end, en: en.text, ko: parts.join(' ') };
  });
}

const SENTENCE_END = /[.!?…]["'”’)]*$/;

/**
 * 문장 끝(. ! ?)이 아닌 큐를 다음 큐와 합쳐 "문장 단위"로 만든다.
 * 입력/출력 모두 parseSubtitle 형식 ({ start, end, text }) — 한글 매칭(mergeSubtitles) **전에** 적용해야
 * 긴 한글 큐가 합쳐진 문장에 두 번 붙는 문제가 없다.
 * 조건: 다음 큐까지 간격이 -maxOverlap ~ maxGap 사이, 합친 길이 ≤ maxDuration
 * (크게 겹치는 큐는 다른 화자/화면 설명일 가능성이 높아 합치지 않음)
 */
export function mergeIntoSentences(cues, { maxGap = 0.7, maxOverlap = 0.3, maxDuration = 8 } = {}) {
  const out = [];
  let cur = null;
  for (const c of cues) {
    if (cur) {
      const gap = c.start - cur.end;
      const endsSentence = SENTENCE_END.test(cur.text.trim());
      const mergedEnd = Math.max(cur.end, c.end);
      const tooLong = mergedEnd - cur.start > maxDuration;
      if (!endsSentence && gap <= maxGap && gap >= -maxOverlap && !tooLong) {
        cur.end = mergedEnd;
        cur.text = joinText(cur.text, c.text);
        continue;
      }
      out.push(cur);
    }
    cur = { ...c };
  }
  if (cur) out.push(cur);
  out.forEach((c, i) => { c.index = i; });
  return out;
}

function joinText(a, b) {
  if (!a) return b || '';
  if (!b) return a;
  return `${a.replace(/\n/g, ' ')} ${b.replace(/\n/g, ' ')}`;
}

/**
 * 문장 안의 단어별 시작/끝 시간을 글자 수 비례로 추정 (노래방식 하이라이트용)
 * → [{ word, start, end }]
 */
export function estimateWordTimings(start, end, text) {
  const words = text.replace(/\n/g, ' ').split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  // 가중치: 글자 수 + 1 (짧은 단어도 최소 시간 확보), 문장부호는 약간의 여유
  const weights = words.map((w) => w.replace(/[^\p{L}\p{N}']/gu, '').length + 1 + (/[,.!?;:]$/.test(w) ? 1.5 : 0));
  const total = weights.reduce((a, b) => a + b, 0);
  const dur = Math.max(end - start, 0.1);
  let t = start;
  return words.map((word, i) => {
    const d = (weights[i] / total) * dur;
    const item = { word, start: t, end: t + d };
    t += d;
    return item;
  });
}

/**
 * 현재 시간을 포함하는 큐 인덱스 (없으면 -1).
 * 큐가 겹칠 수 있으므로 이진 탐색 대신 선형 탐색 — 가장 늦게 시작한(=가장 구체적인) 큐를 고른다.
 * 매 프레임이 아니라 위치가 어긋났을 때만 호출되므로 수백 개 큐에서도 충분히 빠름.
 */
export function findCueIndex(cues, time) {
  let found = -1;
  for (let i = 0; i < cues.length; i++) {
    const c = cues[i];
    if (c.start > time) break; // start 기준 정렬이므로 더 볼 필요 없음
    if (time < c.end) found = i;
  }
  return found;
}

/** 현재 시간 이후(또는 포함) 가장 가까운 큐 인덱스. 끝이면 마지막 인덱스. */
export function findNearestCueIndex(cues, time) {
  const exact = findCueIndex(cues, time);
  if (exact >= 0) return exact;
  for (let i = 0; i < cues.length; i++) {
    if (cues[i].start > time) return i === 0 ? 0 : i - 1;
  }
  return cues.length - 1;
}
