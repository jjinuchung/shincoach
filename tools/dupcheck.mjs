// 새 영상이 기존 학습 자료와 겹치는지 검사한다.
//
// 포켓몬 "모음" 클립들은 제목이 달라도 같은 장면을 돌려쓴다 (예: "Epic Battle Moments" ↔ "ICONIC Moments").
// 제목·길이로는 못 가르므로 **대사를 맞춰 본다**. 겹치는 영상을 그대로 넣으면
// 아이가 같은 문장을 두 번 배우고, 🎟️ 진도 분모만 늘어난다.
//
// 사용: node tools/dupcheck.mjs <새.srt> <기존1.srt> [기존2.srt ...]
import { readFileSync } from 'node:fs';
import path from 'node:path';

/** SRT → 대사 줄 배열 (번호·타임코드 제거) */
function lines(file) {
  const text = readFileSync(file, 'utf8').replace(/^﻿/, '');
  const out = [];
  for (const block of text.trim().split(/\r?\n\r?\n+/)) {
    const rows = block.split(/\r?\n/);
    const body = rows.slice(rows.findIndex((r) => r.includes('-->')) + 1).join(' ');
    if (body.trim()) out.push(body.trim());
  }
  return out;
}

/** 비교용으로 다듬기 — 대소문자·문장부호·홑따옴표 모양 차이는 무시 */
function norm(s) {
  return s.replace(/[‘’ʼ´`]/g, "'").toLowerCase().replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

/** 내용이 거의 없는 줄(감탄사·이름 한 마디)은 겹쳐도 "같은 장면"의 근거가 못 된다 */
function trivial(n) {
  return n.split(' ').filter(Boolean).length < 4;
}

/**
 * 줄 단위 비교만 하면, 같은 장면이라도 인식기가 줄을 다르게 끊었을 때 못 잡는다.
 * 그래서 전체 대사를 한 줄로 이어 붙여 **연속된 8단어 묶음**이 얼마나 겹치는지도 본다.
 */
const SHINGLE = 8;
function shingles(lineList) {
  const words = lineList.map(norm).join(' ').split(' ').filter(Boolean);
  const set = new Set();
  for (let i = 0; i + SHINGLE <= words.length; i++) set.add(words.slice(i, i + SHINGLE).join(' '));
  return set;
}

function shingleOverlap(a, b) {
  const sa = shingles(a);
  const sb = shingles(b);
  if (!sa.size) return { pct: 0, same: 0, total: 0 };
  let same = 0;
  for (const s of sa) if (sb.has(s)) same++;
  return { pct: Math.round((same / sa.size) * 100), same, total: sa.size };
}

function compare(newFile, oldFile) {
  const a = lines(newFile).map(norm);
  const b = lines(oldFile).map(norm);
  const bSet = new Set(b.filter((s) => !trivial(s)));
  const meaningful = a.filter((s) => !trivial(s));
  const hits = meaningful.filter((s) => bSet.has(s));

  // 연속으로 몇 줄이나 같은지 (한 장면을 통째로 가져왔으면 길게 이어진다)
  let run = 0;
  let runStart = -1;
  let best = 0;
  let bestAt = -1;
  for (let i = 0; i < a.length; i++) {
    if (a[i] && !trivial(a[i]) && bSet.has(a[i])) {
      if (run === 0) runStart = i; // 감탄사 줄을 건너뛰며 세므로 시작 위치를 따로 기억한다
      run++;
      if (run > best) { best = run; bestAt = runStart; }
    } else if (!trivial(a[i])) {
      run = 0;
    }
  }
  return {
    old: path.basename(oldFile),
    newLines: a.length,
    compared: meaningful.length,
    same: hits.length,
    pct: meaningful.length ? Math.round((hits.length / meaningful.length) * 100) : 0,
    longestRun: best,
    runAt: bestAt,
    samples: hits.slice(0, 5),
    shingle: shingleOverlap(lines(newFile), lines(oldFile)),
  };
}

const [newFile, ...olds] = process.argv.slice(2);
if (!newFile || !olds.length) {
  console.error('사용: node tools/dupcheck.mjs <새.srt> <기존1.srt> [기존2.srt ...]');
  process.exit(2);
}

console.log(`새 자료: ${path.basename(newFile)} (${lines(newFile).length}줄)\n`);
let worst = 0;
for (const old of olds) {
  const r = compare(newFile, old);
  const score = Math.max(r.pct, r.shingle.pct);
  worst = Math.max(worst, score);
  const mark = score >= 30 || r.longestRun >= 5 ? '⚠️ 겹침' : score >= 10 ? '· 조금 겹침' : '✅ 다름';
  console.log(`${mark}  ${r.old}`);
  console.log(`   같은 대사 ${r.same}/${r.compared}줄 (${r.pct}%) · 연속 최대 ${r.longestRun}줄${r.runAt >= 0 ? ` (새 자료 ${r.runAt + 1}번째 줄부터)` : ''}`);
  console.log(`   말뭉치 ${SHINGLE}단어 묶음 ${r.shingle.same}/${r.shingle.total} (${r.shingle.pct}%) — 줄 나눔이 달라도 잡는다`);
  for (const s of r.samples) console.log(`     "${s}"`);
}
process.exit(worst >= 30 ? 1 : 0);
