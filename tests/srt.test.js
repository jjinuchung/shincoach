// 자막 파서/병합 단위 테스트: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  parseTimestamp, formatTime, cleanText, parseSubtitle,
  mergeSubtitles, mergeIntoSentences, estimateWordTimings,
  findCueIndex, findNearestCueIndex, parseKaraokeWords, wordTimings, countPlayableCues,
} from '../js/srt.js';

const en = readFileSync(new URL('../samples/sample.en.srt', import.meta.url), 'utf8');
const ko = readFileSync(new URL('../samples/sample.ko.srt', import.meta.url), 'utf8');

test('parseTimestamp: srt/vtt 형식', () => {
  assert.equal(parseTimestamp('00:01:02,345'), 62.345);
  assert.equal(parseTimestamp('00:01:02.345'), 62.345);
  assert.equal(parseTimestamp('01:02.5'), 62.5);
  assert.ok(Number.isNaN(parseTimestamp('abc')));
});

test('formatTime', () => {
  assert.equal(formatTime(62.9), '1:02');
  assert.equal(formatTime(0), '0:00');
});

test('cleanText: CC 효과음/화자 표시 제거', () => {
  assert.equal(cleanText('(muffled shouting)'), '');
  assert.equal(cleanText('(over speakers): sound.'), 'sound.');
  assert.equal(cleanText('WOODY: Hi, Buzz.\nBUZZ: Hello.'), 'Hi, Buzz.\nHello.');
  assert.equal(cleanText("[music playing]\nLet's go!"), "Let's go!");
  assert.equal(cleanText('MAN 2: Wait (laughs) for me.'), 'Wait for me.');
  assert.equal(cleanText("I'm fine."), "I'm fine.", '일반 문장은 그대로');
  assert.equal(cleanText('- 우주 사령부와 접선하라!\n- 우주 사령부와 접선하라!'), '우주 사령부와 접선하라!', '두 화자 동일 대사는 한 줄');
});

test('cleanText: 태그/대사 표시 제거', () => {
  assert.equal(cleanText('<i>Hello!</i> I\'m Peppa.'), 'Hello! I\'m Peppa.');
  assert.equal(cleanText('{\\an8}Top text'), 'Top text');
  assert.equal(cleanText('- Where?\n- Park!'), 'Where?\nPark!');
});

test('parseSubtitle: 샘플 srt 5개 큐, BOM/CRLF 처리', () => {
  const cues = parseSubtitle(en);
  assert.equal(cues.length, 5);
  assert.equal(cues[0].start, 1.0);
  assert.equal(cues[0].end, 2.8);
  assert.equal(cues[0].text, 'Hello! I\'m Peppa Pig.');
  assert.equal(cues[3].text, 'Where are we going today?\nTo the park!');

  const crlfBom = '\uFEFF' + en.replace(/\n/g, '\r\n');
  assert.equal(parseSubtitle(crlfBom).length, 5);
});

test('parseSubtitle: 번호 없는 블록, 빈 텍스트 무시, VTT 헤더', () => {
  const vtt = 'WEBVTT\n\nNOTE comment\n\n00:00.000 --> 00:01.000 align:start\nHi\n\n00:01.000 --> 00:02.000\n\n';
  const cues = parseSubtitle(vtt);
  assert.equal(cues.length, 1);
  assert.equal(cues[0].text, 'Hi');
});

test('mergeSubtitles: 타임코드 동일 → 1:1 매칭', () => {
  const merged = mergeSubtitles(parseSubtitle(en), parseSubtitle(ko));
  assert.equal(merged.length, 5);
  assert.equal(merged[0].ko, '안녕! 나는 페파 피그야.');
  assert.equal(merged[2].ko, '조지야.');
});

test('mergeSubtitles: 한글 자막 없으면 ko 빈 문자열', () => {
  const merged = mergeSubtitles(parseSubtitle(en), []);
  assert.equal(merged[0].ko, '');
});

test('mergeSubtitles: 타임코드 살짝 어긋나도 겹침으로 매칭', () => {
  const enC = [{ index: 0, start: 1, end: 3, text: 'A' }, { index: 1, start: 3.5, end: 5, text: 'B' }];
  const koC = [{ index: 0, start: 1.2, end: 3.1, text: '가' }, { index: 1, start: 3.4, end: 5.2, text: '나' }];
  const m = mergeSubtitles(enC, koC);
  assert.equal(m[0].ko, '가');
  assert.equal(m[1].ko, '나');
});

test('mergeIntoSentences: 문장 끝 아니면 다음 큐와 합침 (영어 먼저 합치고 한글 매칭)', () => {
  const sent = mergeSubtitles(mergeIntoSentences(parseSubtitle(en)), parseSubtitle(ko));
  // "This is my little brother," + "George." → 하나
  assert.equal(sent.length, 4);
  assert.equal(sent[1].en, 'This is my little brother, George.');
  assert.equal(sent[1].ko, '얘는 내 남동생, 조지야.');
  assert.equal(sent[1].start, 3.0);
  assert.equal(sent[1].end, 5.9);
});

test('mergeIntoSentences: 간격이 크면 합치지 않음', () => {
  const cues = [
    { index: 0, start: 0, end: 1, text: 'I am' },
    { index: 1, start: 3, end: 4, text: 'here.' },
  ];
  assert.equal(mergeIntoSentences(cues).length, 2);
});

// ── Codex 리뷰 회귀 테스트 ──

test('#8 parseSubtitle: 공백만 있는 구분 줄도 블록 경계', () => {
  const spaced = '1\n00:00:01,000 --> 00:00:02,000\nHello.\n \n2\n00:00:03,000 --> 00:00:04,000\nBye.';
  const cues = parseSubtitle(spaced);
  assert.equal(cues.length, 2);
  assert.equal(cues[0].text, 'Hello.');
  assert.equal(cues[1].text, 'Bye.');
});

test('#8 parseSubtitle: VTT 문자열 cue ID 허용', () => {
  const vtt = 'WEBVTT\n\nintro\n00:01.000 --> 00:02.000\nHello.';
  const cues = parseSubtitle(vtt);
  assert.equal(cues.length, 1);
  assert.equal(cues[0].text, 'Hello.');
});

test('#8 parseSubtitle: end ≤ start 큐는 제외하고 skipped로 집계', () => {
  const bad = '1\n00:00:05,000 --> 00:00:04,000\nBroken\n\n2\n00:00:06,000 --> 00:00:06,050\nToo short\n\n3\n00:00:07,000 --> 00:00:08,000\nOK';
  const cues = parseSubtitle(bad);
  assert.equal(cues.length, 1);
  assert.equal(cues[0].text, 'OK');
  assert.equal(cues.skipped, 2);
});

test('#9 긴 한글 큐가 합쳐진 영어 문장에 한 번만 붙음', () => {
  const enC = [{ index: 0, start: 0, end: 2, text: 'This is' }, { index: 1, start: 2, end: 4, text: 'a test.' }];
  const koC = [{ index: 0, start: 0, end: 4, text: '이것은 시험입니다.' }];
  const sent = mergeSubtitles(mergeIntoSentences(enC), koC);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].en, 'This is a test.');
  assert.equal(sent[0].ko, '이것은 시험입니다.');
});

test('#10 mergeIntoSentences: 살짝 겹치면 합치되 end는 늦은 쪽 유지, 크게 겹치면 합치지 않음', () => {
  // 살짝 겹침(0.2s): 합침, end = max
  const slight = [{ start: 0, end: 2, text: 'I am' }, { start: 1.8, end: 3, text: 'here.' }];
  const s = mergeIntoSentences(slight);
  assert.equal(s.length, 1);
  assert.equal(s[0].end, 3);
  // 크게 겹침(6s, 다른 화자/화면 설명): 합치지 않음
  const big = [{ start: 0, end: 7, text: 'I am' }, { start: 1, end: 2, text: 'here.' }];
  const b = mergeIntoSentences(big);
  assert.equal(b.length, 2);
  assert.equal(b[0].end, 7);
});

test('#10 findCueIndex: 겹치는 큐에서도 포함 큐를 찾음', () => {
  const cues = [{ start: 0, end: 10 }, { start: 1, end: 2 }, { start: 3, end: 4 }];
  assert.equal(findCueIndex(cues, 5), 0);
  assert.equal(findCueIndex(cues, 1.5), 1); // 더 구체적인(늦게 시작한) 큐
  assert.equal(findCueIndex(cues, 11), -1);
});

test('estimateWordTimings: 단어 수 만큼, 시간 연속', () => {
  const w = estimateWordTimings(10, 12, 'I love muddy puddles.');
  assert.equal(w.length, 4);
  assert.equal(w[0].start, 10);
  assert.ok(Math.abs(w[3].end - 12) < 1e-9);
  assert.ok(w[0].end - w[0].start < w[2].end - w[2].start, '긴 단어가 더 긴 시간');
});

test('findCueIndex / findNearestCueIndex', () => {
  const cues = parseSubtitle(en);
  assert.equal(findCueIndex(cues, 1.5), 0);
  assert.equal(findCueIndex(cues, 2.9), -1);   // 큐 사이 간격
  assert.equal(findNearestCueIndex(cues, 2.9), 0);
  assert.equal(findNearestCueIndex(cues, 0.2), 0);
  assert.equal(findNearestCueIndex(cues, 99), 4);
});

test('parseKaraokeWords: VTT 노래방 태그 → 단어별 시간, 태그 없는 단어는 보간', () => {
  const raw = '<00:00:10.000>I <00:00:10.500>was a <00:00:11.500>ghost,';
  const w = parseKaraokeWords(raw, 10, 12);
  assert.deepEqual(w.map((x) => x.word), ['I', 'was', 'a', 'ghost,']);
  assert.equal(w[0].start, 10);
  assert.equal(w[1].start, 10.5);
  assert.ok(w[2].start > 10.5 && w[2].start < 11.5, '"a"는 was~ghost 사이에서 보간');
  assert.equal(w[3].start, 11.5);
  assert.equal(w[3].end, 12);
  assert.equal(w[1].end, w[2].start);
  assert.equal(parseKaraokeWords('no tags here', 0, 1), null);
});

test('parseSubtitle: VTT 노래방 태그가 있으면 cue.words, 텍스트는 태그 제거', () => {
  const vtt = 'WEBVTT\n\n1\n00:00:10.000 --> 00:00:12.000\n<00:00:10.000>Oh, <00:00:10.800>up, <00:00:11.300>up.\n\n2\n00:00:12.000 --> 00:00:13.000\nPlain line.\n';
  const cues = parseSubtitle(vtt);
  assert.equal(cues.length, 2);
  assert.equal(cues[0].text, 'Oh, up, up.');
  assert.equal(cues[0].words.length, 3);
  assert.equal(cues[0].words[1].start, 10.8);
  assert.equal(cues[1].words, undefined);
  // 병합 결과에도 전달, 단어 수가 맞으면 wordTimings가 그대로 사용
  const merged = mergeSubtitles(mergeIntoSentences(cues), []);
  assert.equal(merged[0].words.length, 3);
  assert.equal(wordTimings(merged[0])[1].start, 10.8);
  assert.equal(wordTimings(merged[1]).length, 2, '태그 없으면 글자 수 비례 추정');
  // 문장 합치기: 태그 있는 큐 + 없는 큐 → 추정으로
  const cues2 = parseSubtitle(vtt.replace('up.\n', 'up\n'));
  const merged2 = mergeIntoSentences(cues2);
  assert.equal(merged2.length, 1);
  assert.equal(merged2[0].words, undefined);
});

test('countPlayableCues: 플레이어와 같은 규칙 (합치기 설정 + 영상 길이 밖 제외)', () => {
  const srt = [1, 2, 3, 4].map((i) => `${i}\n00:00:${String(i * 10).padStart(2, '0')},000 --> 00:00:${String(i * 10 + 3).padStart(2, '0')},000\nLine ${i} here.\n`).join('\n');
  assert.equal(countPlayableCues(srt, { merge: false }), 4, '자막 줄 수');
  assert.equal(countPlayableCues(srt, { merge: false, duration: 25 }), 2, '25초 뒤에 시작하는 큐(30·40초)는 뺀다');
  assert.equal(countPlayableCues(srt, { merge: false, duration: 0 }), 4, '길이를 모르면 전부');
  assert.equal(countPlayableCues('', { merge: true }), 0);
  assert.equal(countPlayableCues(null), 0);
  // 합치기를 켜면 줄어들 수 있다 (같은 문장이 여러 줄로 쪼개진 경우)
  const split = '1\n00:00:00,000 --> 00:00:02,000\nI think\n\n2\n00:00:02,100 --> 00:00:04,000\nthat is fine.\n';
  assert.ok(countPlayableCues(split, { merge: true }) <= countPlayableCues(split, { merge: false }));
});
