// 라이브러리 화면: 콘텐츠 가져오기(mp4 + srt) / 목록 / 삭제 / 저장 공간 표시
import { addItem, listItems, deleteItem, storageEstimate } from './db.js';
import { parseSubtitle } from './srt.js';
import { parseSami, isSami, toSrt } from './sami.js';
import { openPlayer } from './player.js';
import { showLoading, hideLoading } from './app.js';

const $ = (id) => document.getElementById(id);

let showView;
let opening = false;

export async function initLibrary(ctx) {
  showView = ctx.showView;

  $('btn-import').addEventListener('click', () => {
    $('form-import').reset();
    $('imp-status').textContent = '';
    $('dlg-import').showModal();
  });
  $('imp-cancel').addEventListener('click', () => $('dlg-import').close());
  $('form-import').addEventListener('submit', onImportSubmit);

  await refreshList();
}

/** 파일 → 텍스트. UTF-8 우선, 실패하면 EUC-KR(CP949)로 재시도 (국내 smi/srt는 CP949가 많음) */
async function readTextSmart(file) {
  const buf = await file.arrayBuffer();
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder('euc-kr').decode(buf);
  }
}

/**
 * 자막 파일(srt/vtt/smi) → 언어별 SRT 텍스트
 * → { en?: srtText, ko?: srtText, single?: srtText(언어 미상 1개), count: number }
 * smi는 영·한이 한 파일에 있으면 둘 다 나옴. srt/vtt는 single로 나옴(원문 유지).
 */
async function loadSubtitleFile(file) {
  const text = await readTextSmart(file);
  if (isSami(text)) {
    const { tracks } = parseSami(text);
    const out = { count: 0 };
    for (const [lang, cues] of Object.entries(tracks)) {
      out[lang] = toSrt(cues);
      out.count++;
    }
    return out;
  }
  const cues = parseSubtitle(text);
  return cues.length > 0 ? { single: text, count: 1, skipped: cues.skipped } : { count: 0 };
}

/** 트랙 묶음에서 원하는 언어의 SRT 텍스트 고르기 (없으면 single, 그것도 없으면 유일한 트랙) */
function pickTrack(tracks, lang) {
  if (tracks[lang]) return tracks[lang];
  if (tracks.single) return tracks.single;
  const langs = Object.keys(tracks).filter((k) => !['count', 'skipped'].includes(k));
  return langs.length === 1 ? tracks[langs[0]] : '';
}

/**
 * 영상 메타데이터(길이) + 썸네일(JPEG dataURL) 추출
 * → { status: 'ok' | 'error' | 'timeout', duration, thumb }
 *   error   = 이 브라우저가 열 수 없는 파일 (저장하면 안 됨)
 *   timeout = 메타데이터 로드가 8초 넘게 걸림 (큰 파일/느린 기기 — 저장은 진행)
 */
function probeVideo(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.muted = true;
    v.playsInline = true;
    v.preload = 'metadata';
    let done = false;
    const finish = (result) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      // 미디어 리소스 해제 (URL만 지우면 디코더/버퍼가 남을 수 있음)
      v.pause();
      v.removeAttribute('src');
      v.load();
      URL.revokeObjectURL(url);
      resolve(result);
    };
    const timer = setTimeout(() => finish({ status: 'timeout', duration: 0, thumb: '' }), 8000);

    v.addEventListener('loadedmetadata', () => {
      const duration = Number.isFinite(v.duration) ? v.duration : 0;
      // 10% 지점(최대 5초)으로 이동해 프레임 캡처
      v.currentTime = Math.min(duration * 0.1, 5);
      v.addEventListener('seeked', () => {
        let thumb = '';
        try {
          const canvas = document.createElement('canvas');
          const w = 192;
          const h = Math.round((v.videoHeight / v.videoWidth) * w) || 108;
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d').drawImage(v, 0, 0, w, h);
          thumb = canvas.toDataURL('image/jpeg', 0.7);
        } catch { /* 썸네일만 실패 — 저장은 진행 */ }
        finish({ status: 'ok', duration, thumb });
      }, { once: true });
    }, { once: true });
    v.addEventListener('error', () => finish({ status: 'error', duration: 0, thumb: '' }), { once: true });
    v.src = url;
  });
}

async function onImportSubmit(e) {
  e.preventDefault();
  const status = $('imp-status');
  const submit = $('imp-submit');
  const title = $('imp-title').value.trim();
  const videoFile = $('imp-video').files[0];
  const enFile = $('imp-sub-en').files[0];
  const koFile = $('imp-sub-ko').files[0];

  if (!title || !videoFile || !enFile) {
    status.textContent = '제목, 영상, 영어 자막은 꼭 필요해요.';
    return;
  }

  submit.disabled = true;
  try {
    status.textContent = '자막 읽는 중...';
    const enTracks = await loadSubtitleFile(enFile);
    if (enTracks.count === 0) {
      status.textContent = '영어 자막을 읽을 수 없어요. srt/smi 파일이 맞는지 확인해 주세요.';
      submit.disabled = false;
      return;
    }
    // 영어 칸에 한글만 있는 smi를 넣은 경우
    if (!enTracks.en && !enTracks.single && enTracks.ko && enTracks.count === 1) {
      status.textContent = '이 파일에는 한글 자막만 있어요. 영어 자막 칸에는 영어가 들어 있는 파일을 넣어 주세요.';
      submit.disabled = false;
      return;
    }
    const enText = pickTrack(enTracks, 'en');
    const enCues = parseSubtitle(enText);

    let koText = '';
    if (koFile) {
      const koTracks = await loadSubtitleFile(koFile);
      koText = pickTrack(koTracks, 'ko');
      if (!koText) {
        status.textContent = '한글 자막을 읽을 수 없어요. (비워두고 저장할 수 있어요)';
        submit.disabled = false;
        return;
      }
    } else if (enTracks.ko) {
      koText = enTracks.ko; // smi 한 파일에 영·한이 같이 있는 경우 자동 사용
    }

    status.textContent = '영상 확인 중...';
    const probe = await probeVideo(videoFile);
    if (probe.status === 'error') {
      status.textContent = '이 브라우저에서 열 수 없는 영상이에요. mp4(H.264) 파일로 변환해 주세요.';
      submit.disabled = false;
      return;
    }
    if (enCues.skipped > 0) console.warn(`영어 자막 ${enCues.skipped}개는 타임코드가 잘못되어 제외됨`);

    status.textContent = '저장 중... (영상 크기에 따라 시간이 걸릴 수 있어요)';
    await addItem({ title, videoFile, enText, koText, duration: probe.duration, thumb: probe.thumb });

    $('form-import').reset(); // 선택한 File 참조 해제
    $('dlg-import').close();
    await refreshList();
  } catch (err) {
    console.error(err);
    status.textContent = `저장 실패: ${err.name === 'QuotaExceededError' ? '저장 공간이 부족해요' : err.message}`;
  } finally {
    submit.disabled = false;
  }
}

function formatBytes(n) {
  if (!n) return '0 MB';
  const mb = n / (1024 * 1024);
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(0)} MB`;
}

function formatDuration(sec) {
  if (!sec) return '';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}분 ${s}초`;
}

export async function refreshList() {
  const items = await listItems();
  const list = $('library-list');
  list.innerHTML = '';
  $('library-empty').hidden = items.length > 0;

  for (const item of items) {
    const li = document.createElement('li');
    li.className = 'library-item';
    li.dataset.id = item.id;

    const thumb = item.thumb
      ? `<img class="library-thumb" src="${item.thumb}" alt="">`
      : `<div class="library-thumb">🎬</div>`;
    const cueCount = parseSubtitle(item.enText).length;
    const meta = [formatDuration(item.duration), `${cueCount}문장`, formatBytes(item.videoSize), item.koText ? '영·한' : '영어만'].filter(Boolean).join(' · ');

    li.innerHTML = `
      ${thumb}
      <div class="library-info">
        <p class="library-name"></p>
        <p class="library-meta">${meta}</p>
      </div>
      <button class="btn library-delete" aria-label="삭제">🗑</button>
    `;
    li.querySelector('.library-name').textContent = item.title;

    li.addEventListener('click', async (e) => {
      if (e.target.closest('.library-delete')) return;
      if (opening) return; // 큰 영상은 몇 초 걸리므로 중복 탭 방지
      opening = true;
      showLoading('영상 불러오는 중...');
      try {
        await openPlayer(item.id);
      } finally {
        hideLoading();
        opening = false;
      }
    });
    li.querySelector('.library-delete').addEventListener('click', async () => {
      if (!confirm(`"${item.title}" 영상을 지울까요?`)) return;
      await deleteItem(item.id);
      await refreshList();
    });
    list.appendChild(li);
  }

  updateStorageText();
}

async function updateStorageText() {
  const est = await storageEstimate();
  const el = $('storage-text');
  if (!est) { el.textContent = ''; return; }
  el.textContent = `사용 중 ${formatBytes(est.usage)} / 사용 가능 ${formatBytes(est.quota)}`;
}
