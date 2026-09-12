// SAMI 파서 테스트: node --test tests/sami.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseSami, isSami, toSrt } from '../js/sami.js';
import { parseSubtitle } from '../js/srt.js';

const smi = readFileSync(new URL('../samples/sample.smi', import.meta.url), 'utf8');

test('isSami: SAMI/SRT 구분', () => {
  assert.equal(isSami(smi), true);
  assert.equal(isSami('1\n00:00:01,000 --> 00:00:02,000\nHi'), false);
});

test('parseSami: 영어/한글 트랙 분리, 시작/종료 시각, br→줄바꿈', () => {
  const { tracks } = parseSami(smi);
  assert.deepEqual(Object.keys(tracks).sort(), ['en', 'ko']);
  assert.equal(tracks.en.length, 4);
  assert.equal(tracks.ko.length, 4);
  assert.equal(tracks.en[0].start, 1.0);
  assert.equal(tracks.en[0].end, 2.8);              // &nbsp; SYNC가 종료
  assert.equal(tracks.en[0].text, "Hello! I'm Peppa Pig."); // <i> 제거
  assert.equal(tracks.en[1].text, 'This is my little brother,\nGeorge.');
  assert.equal(tracks.en[2].text, 'Where are we going today?\nTo the park!'); // "- " 제거
  assert.equal(tracks.ko[3].text, '나는 진흙 웅덩이에서 뛰는 걸 좋아해.');
  assert.equal(tracks.ko[3].end, 10.0);
});

test('parseSami: 종료 SYNC 없으면 다음 SYNC까지, 최대 10초', () => {
  const s = '<SAMI><BODY><SYNC Start=0><P Class=ENCC>A<SYNC Start=2000><P Class=ENCC>B<SYNC Start=30000><P Class=ENCC>C</BODY></SAMI>';
  const { tracks } = parseSami(s);
  assert.equal(tracks.en[0].end, 2);
  assert.equal(tracks.en[1].end, 12);   // 2 + 10 cap
  assert.equal(tracks.en[2].end, 40);   // 마지막: start + 10
});

test('parseSami: 스타일 없고 클래스명도 모호하면 내용(한글 여부)으로 언어 판단', () => {
  const s = '<SAMI><BODY><SYNC Start=0><P Class=SUBTTL>안녕하세요<SYNC Start=1000><P Class=SUBTTL>&nbsp;</BODY></SAMI>';
  const { tracks } = parseSami(s);
  assert.ok(tracks.ko);
  assert.equal(tracks.ko[0].text, '안녕하세요');
});

test('parseSami: 한글만 있는 단일 트랙 파일(P 태그 없음)', () => {
  const s = '<SAMI><BODY><SYNC Start=500>첫 대사<SYNC Start=1500>&nbsp;</BODY></SAMI>';
  const { tracks } = parseSami(s);
  assert.equal(tracks.ko.length, 1);
  assert.equal(tracks.ko[0].start, 0.5);
});

test('toSrt → parseSubtitle 왕복', () => {
  const { tracks } = parseSami(smi);
  const srt = toSrt(tracks.en);
  assert.match(srt, /^1\n00:00:01,000 --> 00:00:02,800\nHello! I'm Peppa Pig\.\n/);
  const back = parseSubtitle(srt);
  assert.equal(back.length, 4);
  assert.equal(back[1].text, 'This is my little brother,\nGeorge.');
  assert.equal(back[3].end, 10);
});
