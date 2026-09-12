// 영어 자막(srt)과 한글 자막(srt/smi)의 타이밍이 맞는지 확인
// 사용: node tools/synccheck.mjs <영어.srt> <한글.smi|srt> [라벨]
import fs from 'node:fs';
import { parseSubtitle } from '../js/srt.js';
import { parseSami, isSami } from '../js/sami.js';

function readTextSmart(p) {
  const buf = fs.readFileSync(p);
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch { return new TextDecoder('euc-kr').decode(buf); }
}

function loadCues(p, preferLang) {
  const text = readTextSmart(p);
  if (isSami(text)) {
    const { tracks } = parseSami(text);
    return tracks[preferLang] || Object.values(tracks)[0] || [];
  }
  return parseSubtitle(text);
}

const [enPath, koPath, label = ''] = process.argv.slice(2);
if (!enPath || !koPath) {
  console.error('사용: node tools/synccheck.mjs <영어.srt> <한글.smi|srt> [라벨]');
  process.exit(1);
}
const en = loadCues(enPath, 'en');
const ko = loadCues(koPath, 'ko');
console.log(`\n=== ${label} : 영어 ${en.length}큐, 한글 ${ko.length}큐 ===`);

// 영어 큐마다 시작 시각이 가장 가까운 한글 큐와의 차이(ko - en)
function nearestOffset(e) {
  let best = Infinity;
  for (const k of ko) {
    const d = k.start - e.start;
    if (Math.abs(d) < Math.abs(best)) best = d;
  }
  return best;
}
const median = (arr) => { const s = [...arr].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
// 앞뒤 10%(오프닝/엔딩 크레딧 노래 등 한쪽에만 있는 구간)는 제외하고 본편만 비교
const core = en.slice(Math.floor(en.length * 0.1), Math.ceil(en.length * 0.9));
const all = core.map(nearestOffset);
const head = core.slice(0, Math.floor(core.length / 3)).map(nearestOffset);
const tail = core.slice(-Math.floor(core.length / 3)).map(nearestOffset);
const within = (arr, s) => (arr.filter((d) => Math.abs(d) < s).length / arr.length * 100).toFixed(0);

console.log(`한글-영어 시작시각 차이 중앙값(본편 80%): 전체 ${median(all).toFixed(2)}s / 앞 1/3 ${median(head).toFixed(2)}s / 뒤 1/3 ${median(tail).toFixed(2)}s`);
console.log(`|차이| < 0.3s: ${within(all, 0.3)}%  |  < 1.0s: ${within(all, 1.0)}%`);
console.log('샘플:');
for (let i = 1; i <= 4; i++) {
  const e = en[Math.floor((en.length * i) / 5)];
  let b = ko[0];
  for (const k of ko) if (Math.abs(k.start - e.start) < Math.abs(b.start - e.start)) b = k;
  console.log(`  en ${e.start.toFixed(1)}s "${e.text.replace(/\n/g, ' ').slice(0, 42)}"`);
  console.log(`  ko ${b.start.toFixed(1)}s "${b.text.replace(/\n/g, ' ').slice(0, 30)}"  (차이 ${(b.start - e.start).toFixed(2)}s)`);
}
const drift = Math.abs(median(head) - median(tail));
const verdict = drift < 0.3 && Math.abs(median(all)) < 0.3
  ? '✅ 싱크 맞음 — 그대로 사용 가능'
  : drift < 0.3
    ? `⚠️ 일정한 오프셋 ${median(all).toFixed(2)}s — 앱의 겹침 매칭으로 대부분 흡수되지만, 크면 한쪽을 밀어서 맞출 수 있음`
    : '❌ 앞뒤 오프셋이 다름 (프레임레이트/편집 차이) — 다른 자막을 구하거나 Whisper 권장';
console.log(verdict);
