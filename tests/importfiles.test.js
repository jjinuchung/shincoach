// 📁 가져오기 파일 분류 테스트: node --test tests/importfiles.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyFiles, suggestTitle, langOf, isVideoFile, isSubtitleFile, describePick, belongsTo, listVideos } from '../js/importfiles.js';
import { LOCKED } from '../js/unlock.js';

/** File 흉내 (이름·크기·MIME만 본다) */
const f = (name, size = 1000, type = '') => ({ name, size, type });

test('📁 내가 만드는 자료 그대로 — 한 번에 고르면 셋으로 나뉜다', () => {
  const r = classifyFiles([f('iconic.mp4', 5e8, 'video/mp4'), f('iconic.en.srt'), f('iconic.ko.srt')]);
  assert.equal(r.video.name, 'iconic.mp4');
  assert.equal(r.en.name, 'iconic.en.srt');
  assert.equal(r.ko.name, 'iconic.ko.srt');
  assert.equal(r.ignored.length, 0);
});

test('📁 고르는 순서가 달라도 똑같이 나뉜다 (파일 선택기는 순서를 보장하지 않는다)', () => {
  const r = classifyFiles([f('wild2.ko.srt'), f('wild2.mp4', 1e8, 'video/mp4'), f('wild2.en.srt')]);
  assert.equal(r.video.name, 'wild2.mp4');
  assert.equal(r.en.name, 'wild2.en.srt');
  assert.equal(r.ko.name, 'wild2.ko.srt');
});

test('📁 언어 표시 방식이 달라도 알아본다', () => {
  assert.equal(langOf('a.en.srt'), 'en');
  assert.equal(langOf('a_eng.srt'), 'en');
  assert.equal(langOf('a-english.vtt'), 'en');
  assert.equal(langOf('b.ko.srt'), 'ko');
  assert.equal(langOf('b_kor.smi'), 'ko');
  assert.equal(langOf('b-korean.srt'), 'ko');
  assert.equal(langOf('모아나 한글.srt'), 'ko');
  assert.equal(langOf('toystory5.srt'), '', '표시가 없으면 미상');
});

test('📁 ★ 제목 안에 언어처럼 보이는 글자가 있어도 속지 않는다', () => {
  // 확장자를 뗀 **마지막 토큰**만 본다 — 'kong'은 'ko'로 시작하지만 언어 표시가 아니다
  assert.equal(langOf('kong.srt'), '');
  assert.equal(langOf('frozen.srt'), '');
  assert.equal(langOf('kong.ko.srt'), 'ko', '진짜 표시는 알아본다');
});

test('📁 영상·자막 구분', () => {
  assert.equal(isVideoFile(f('a.mp4', 1, 'video/mp4')), true);
  assert.equal(isVideoFile(f('a.mkv')), true, 'MIME이 비어도 확장자로');
  assert.equal(isVideoFile(f('a.srt')), false);
  assert.equal(isSubtitleFile(f('a.smi')), true);
  assert.equal(isSubtitleFile(f('a.mp4')), false);
  assert.equal(isVideoFile(null), false);
  assert.equal(isSubtitleFile(null), false);
});

test('📁 언어 표시가 없는 자막도 버리지 않는다 (영어부터 채운다)', () => {
  const one = classifyFiles([f('peppa.mp4', 1e7, 'video/mp4'), f('peppa.srt')]);
  assert.equal(one.en.name, 'peppa.srt', '하나뿐이면 영어 자리로 — 영어가 필수라서');
  assert.equal(one.ko, null);

  const two = classifyFiles([f('peppa.mp4', 1e7, 'video/mp4'), f('peppa1.srt'), f('peppa2.srt')]);
  assert.ok(two.en && two.ko, '둘이면 양쪽에 나눠 담는다 (거꾸로면 화면에서 바꾼다)');
});

test('📁 표시된 자막이 먼저, 미상은 남은 자리로', () => {
  const r = classifyFiles([f('m.mp4', 1e7, 'video/mp4'), f('m.srt'), f('m.ko.srt')]);
  assert.equal(r.ko.name, 'm.ko.srt', '표시가 있는 쪽은 제자리로');
  assert.equal(r.en.name, 'm.srt');
});

test('📁 영상이 여러 개면 가장 큰 것 (조각보다 본편)', () => {
  const r = classifyFiles([f('a.mp4', 100, 'video/mp4'), f('b.mp4', 9e8, 'video/mp4'), f('a.en.srt')]);
  assert.equal(r.video.name, 'b.mp4');
  assert.equal(r.ignored.length, 1, '안 쓴 파일은 화면에 알려 준다');
});

test('📁 상관없는 파일은 조용히 무시하지 않고 "안 쓴 파일"로 남긴다', () => {
  const r = classifyFiles([f('a.mp4', 1e7, 'video/mp4'), f('a.en.srt'), f('메모.txt'), f('표지.png')]);
  assert.equal(r.ignored.length, 2);
  assert.ok(r.video && r.en);
});

test('📁 빈 선택도 안 터진다', () => {
  const r = classifyFiles(null);
  assert.deepEqual([r.video, r.en, r.ko], [null, null, null]);
  assert.equal(classifyFiles([]).ignored.length, 0);
});

test('🎟️ ★ 교환권 영상은 제목을 목록 그대로 채워 준다 (제목이 어긋나면 배달로 안 쳐진다)', () => {
  for (const c of LOCKED) {
    assert.equal(suggestTitle(`${c.id}.mp4`), c.ko, `${c.id} → ${c.ko}`);
  }
  assert.equal(suggestTitle('ICONIC.MP4'), LOCKED.find((c) => c.id === 'iconic').ko, '대소문자 무관');
});

test('📁 목록에 없는 영상은 파일 이름을 그대로 제목으로', () => {
  assert.equal(suggestTitle('peppa01.mp4'), 'peppa01');
  assert.equal(suggestTitle('토이스토리5.mp4'), '토이스토리5');
  assert.equal(suggestTitle(''), '');
});

test('📁 화면 요약: 빠진 필수 항목이 드러난다', () => {
  const rows = describePick(classifyFiles([f('a.mp4', 1e7, 'video/mp4')]));
  const en = rows.find((r) => r.label === '영어 자막');
  const ko = rows.find((r) => r.label === '한글 자막');
  assert.equal(en.ok, false);
  assert.equal(en.need, true, '영어 자막이 없으면 빨갛게 보여야 한다');
  assert.equal(ko.need, false, '한글 자막은 없어도 괜찮다');
});

// ── 📁 폴더를 통째로 고른 경우 (2026-09-20) ──
// 태블릿에서 파일 여러 개를 길게 눌러 고르기가 어렵다 → 폴더 하나만 탭하게 했다.
// 폴더에는 다른 편의 자막과 작업 파일(whisper 초안·로그·json)까지 들어 있으므로,
// **영상 이름과 짝이 맞는 자막**을 먼저 쓰지 않으면 엉뚱한 조합이 저장된다.

/** 실제 폴더 구성 그대로 (F:\per\mp3\260918\) */
function folderOf(bases, bigOne) {
  const out = [];
  for (const b of bases) {
    out.push(f(`${b}.mp4`, b === bigOne ? 9e8 : 1e8, 'video/mp4'));
    out.push(f(`${b}.en.srt`), f(`${b}.ko.srt`), f(`${b}.whisper.srt`));
    out.push(f(`${b}.whisper.words.json`), f('en_lines.txt'), f('ko_lines.txt'), f('whisper.log'));
  }
  return out;
}

test('📁 ★ 폴더를 통째로 골라 여러 편이 섞여도 짝이 안 어긋난다', () => {
  const r = classifyFiles(folderOf(['iconic', 'wild2', 'prime_suspect'], 'iconic'));
  assert.equal(r.video.name, 'iconic.mp4');
  assert.equal(r.en.name, 'iconic.en.srt', '다른 편 자막이 끼면 안 된다');
  assert.equal(r.ko.name, 'iconic.ko.srt');
  assert.ok(r.ignored.length > 10, '나머지는 안 쓴 파일로');
});

test('📁 작업용 초안(whisper)보다 완성 자막이 먼저', () => {
  const r = classifyFiles(folderOf(['iconic'], 'iconic'));
  assert.equal(r.en.name, 'iconic.en.srt');
  assert.equal(r.ko.name, 'iconic.ko.srt');
  assert.ok(r.ignored.some((x) => x.name === 'iconic.whisper.srt'), 'whisper 초안은 안 쓴다');
});

test('📁 완성 자막이 없으면 초안이라도 쓴다 (빈손보다 낫다)', () => {
  const r = classifyFiles([f('g.mp4', 1e8, 'video/mp4'), f('g.whisper.srt')]);
  assert.equal(r.en.name, 'g.whisper.srt');
});

test('📁 ★ 이름 경계를 지킨다 — iconic이 iconic2를 끌어오지 않는다', () => {
  assert.equal(belongsTo('iconic.en.srt', 'iconic'), true);
  assert.equal(belongsTo('iconic.srt', 'iconic'), true);
  assert.equal(belongsTo('iconic2.en.srt', 'iconic'), false);
  assert.equal(belongsTo('iconicity.srt', 'iconic'), false);
  assert.equal(belongsTo('other.en.srt', 'iconic'), false);
  assert.equal(belongsTo('a.srt', ''), false);
});

test('📁 이름이 안 맞는 자막뿐이면 그거라도 쓴다 (이름 규칙을 안 지킨 자료)', () => {
  const r = classifyFiles([f('movie.mp4', 1e8, 'video/mp4'), f('sub.en.srt'), f('sub.ko.srt')]);
  assert.equal(r.en.name, 'sub.en.srt');
  assert.equal(r.ko.name, 'sub.ko.srt');
});

test('📁 폴더에 영상이 없으면 영상 자리가 빈 채로 알려 준다', () => {
  const r = classifyFiles([f('a.en.srt'), f('a.ko.srt'), f('읽어보기.txt')]);
  assert.equal(r.video, null);
  assert.equal(r.en.name, 'a.en.srt');
  const rows = describePick(r);
  assert.equal(rows.find((x) => x.label === '영상').ok, false);
});

// ── 📁 영상을 한 폴더에 몰아 둔 경우 (2026-09-20, 아버님 보관 방식) ──
// 아버님은 영상을 한 폴더에 몰아서 보관한다. 그래서 폴더를 고르면 여러 편이 들어오는데,
// 아이에게는 🎟️ 교환권으로 한 편씩 줘야 하므로 **무엇을 넣을지 아버님이 골라야** 한다.

test('📁 폴더에 여러 편이면 목록으로 (큰 것부터)', () => {
  const files = [
    f('small.mp4', 100, 'video/mp4'), f('big.mp4', 9e8, 'video/mp4'), f('mid.mp4', 5e8, 'video/mp4'),
    f('big.en.srt'), f('small.en.srt'),
  ];
  const vids = listVideos(files);
  assert.deepEqual(vids.map((v) => v.name), ['big.mp4', 'mid.mp4', 'small.mp4']);
  assert.equal(listVideos([f('a.srt')]).length, 0);
  assert.equal(listVideos(null).length, 0);
});

test('📁 ★ 고른 영상으로 짝을 맞춘다 (가장 큰 편이 아니어도)', () => {
  const files = [];
  for (const [b, sz] of [['toystory5', 4e9], ['wild2', 3e8], ['iconic', 9e8]]) {
    files.push(f(`${b}.mp4`, sz, 'video/mp4'), f(`${b}.en.srt`), f(`${b}.ko.srt`));
  }
  const r = classifyFiles(files, { videoName: 'wild2.mp4' });
  assert.equal(r.video.name, 'wild2.mp4');
  assert.equal(r.en.name, 'wild2.en.srt');
  assert.equal(r.ko.name, 'wild2.ko.srt', '다른 편 자막이 섞이면 안 된다');

  // 지정이 없으면 예전처럼 가장 큰 것
  assert.equal(classifyFiles(files).video.name, 'toystory5.mp4');
});

test('📁 없는 영상을 지정하면 가장 큰 것으로 돌아간다 (목록이 바뀐 뒤)', () => {
  const files = [f('a.mp4', 1e8, 'video/mp4'), f('a.en.srt')];
  const r = classifyFiles(files, { videoName: 'zzz.mp4' });
  assert.equal(r.video.name, 'a.mp4');
});
