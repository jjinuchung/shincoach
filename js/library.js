// 라이브러리 화면: 콘텐츠 가져오기(mp4 + srt) / 목록 / 삭제 / 저장 공간 표시
import { addItem, listItems, deleteItem, storageEstimate, getAllSentenceStats } from './db.js';
import { parseSubtitle } from './srt.js';
import { LOCKED, unlockState, nextLocked, ticketId, findLocked } from './unlock.js';
import { coins, inventory, buyTicket, initProfile } from './xp.js';
import { characterUrl, ensureCast, artUrl } from './pokemon.js';
import { sfx, unlock as unlockAudio } from './sfx.js';
import { parseSami, isSami, toSrt } from './sami.js';
import { openPlayer } from './player.js';
import { showLoading, hideLoading } from './app.js';

const $ = (id) => document.getElementById(id);

// 2GB(32비트 한계)를 넘는 영상은 코덱이 멀쩡해도 안드로이드 Chrome에서 안 열린다.
// 경계에 바로 붙은 파일도 위험해서 조금 낮춰 잡는다.
const BIG_FILE_BYTES = 1.9 * 1024 * 1024 * 1024;

let showView;
let opening = false;
// 목록 그리기 요청 번호. 앱을 켤 때 showView('library')와 initLibrary가 각각 그리는 등
// 두 번이 겹치면, 중간에 await가 있는 사이 둘 다 카드를 붙여 🎟️ 예고가 두 개로 보였다.
// (2026-09-17 아버님 신고: "팬텀 광고 문구가 두 번"). 마지막 요청만 화면에 남긴다.
let renderSeq = 0;

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

/** File → ArrayBuffer. file.arrayBuffer()는 Chrome 76+ 전용이라 구형 태블릿을 위해 FileReader 사용 */
function readArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject(fr.error || new Error('파일을 읽을 수 없어요'));
    fr.readAsArrayBuffer(file);
  });
}

/** 파일 → 텍스트. UTF-8 우선, 실패하면 EUC-KR(CP949)로 재시도 (국내 smi/srt는 CP949가 많음) */
async function readTextSmart(file) {
  const buf = await readArrayBuffer(file);
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
      // 파일이 2GB를 넘으면 코덱이 멀쩡해도 태블릿에서 열리지 않는다(안드로이드 Chrome은 32비트인 기기가 많다).
      // "H.264로 변환하라"고만 하면 이미 H.264인 파일 앞에서 원인을 못 찾는다 (2026-09-17 모아나 2.24GB)
      status.textContent = videoFile.size > BIG_FILE_BYTES
        ? `영상이 너무 커요 (${formatBytes(videoFile.size)}). 태블릿 브라우저는 2GB가 넘는 영상을 열지 못해요 — 1GB 정도로 줄여서 넣어 주세요.`
        : '이 브라우저에서 열 수 없는 영상이에요. mp4(H.264 + AAC) 파일로 변환해 주세요.';
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
  const seq = ++renderSeq;
  const items = await listItems();
  if (seq !== renderSeq) return; // 더 최신 요청이 시작됐으면 이 결과는 버린다
  const list = $('library-list');
  list.innerHTML = '';
  $('library-empty').hidden = items.length > 0;

  for (const item of items) {
    const li = document.createElement('li');
    li.className = 'library-item';
    li.dataset.id = item.id;

    const thumb = item.broken
      ? `<div class="library-thumb">⚠️</div>`
      : item.thumb
        ? `<img class="library-thumb" src="${item.thumb}" alt="">`
        : `<div class="library-thumb">🎬</div>`;
    const cueCount = item.broken ? 0 : parseSubtitle(item.enText).length;
    const meta = item.broken
      ? '저장이 깨졌어요 — 🗑로 지우고 다시 가져와 주세요 (공부한 기록은 그대로 있어요)'
      : [formatDuration(item.duration), `${cueCount}문장`, formatBytes(item.videoSize), item.koText ? '영·한' : '영어만'].filter(Boolean).join(' · ');

    if (item.broken) li.classList.add('broken');
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
      // 깨진 영상은 열 수 없다 — 열려고 하면 플레이어까지 같은 오류로 죽는다
      if (item.broken) {
        alert('이 영상은 저장이 깨져서 열 수 없어요.\n🗑로 지운 다음 다시 가져와 주세요.\n(공부한 기록·코인·포켓몬은 그대로 있어요)');
        return;
      }
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

  await renderNextVideo(items, seq);
  updateStorageText();
}

// ───────────────────── 🎟️ 다음 영상 ─────────────────────

/**
 * 아직 태블릿에 없는 영상을 "예고편"처럼 보여주고, 조건을 채우면 아이가 직접 연다.
 * 산다고 파일이 생기지는 않는다 — 아빠가 넣어 준다는 것을 화면에 분명히 적는다.
 */
async function renderNextVideo(items, seq = renderSeq) {
  const box = $('library-next');
  if (!box) return;
  box.innerHTML = '';

  await initProfile().catch(() => {});
  if (seq !== renderSeq) return; // 겹쳐 불린 옛 요청 — 카드를 붙이면 예고가 두 개가 된다
  const bag = inventory();
  const bought = LOCKED.filter((c) => (bag[ticketId(c.id)] || 0) > 0);

  // 이미 산 것 중 아직 안 들어온 영상부터 (아이가 "샀는데 왜 없어?" 하지 않게)
  const haveTitles = new Set(items.map((it) => String(it.title)));
  const waiting = bought.filter((c) => !haveTitles.has(c.ko));
  for (const c of waiting) box.appendChild(waitingCard(c));

  const next = nextLocked(bought.map((c) => c.id));
  if (!next) { box.hidden = !waiting.length; return; }

  const st = await currentState(next.price);
  if (seq !== renderSeq) return;
  const card = lockedCard(next, st);
  box.appendChild(card);
  box.hidden = false;
  // 나오는 포켓몬 그림은 없으면 받아 온다 (인터넷이 없으면 이모지로 남는다)
  ensureCast((next.cast || []).map((c) => c.id)).then(() => fillCast(card, next)).catch(() => {});
}

/** 받아 온 그림을 자리에 끼운다 (아직 없으면 ❔ 그대로) */
function fillCast(root, c) {
  for (const m of (c.cast || [])) {
    const fig = root.querySelector(`.next-cast-mon[data-id="${m.id}"]`);
    if (!fig || fig.querySelector('img')) continue;
    const url = artUrl(m.id) || characterUrl(m.id);
    if (!url) continue;
    const img = document.createElement('img');
    img.src = url;
    img.alt = m.ko;
    fig.replaceChild(img, fig.querySelector('.ph'));
  }
}

/**
 * 지금 조건 현황을 저장소에서 새로 계산한다 (화면 표시와 구매 판정이 같은 값을 쓰게).
 * 조건이 비율이 아니라 **끝낸 문장 개수**라 영상 목록은 필요 없다 — 영상을 넣거나 지워도 진도가 안 흔들린다.
 */
async function currentState(price) {
  const records = await getAllSentenceStats().catch(() => []);
  return unlockState({ coins: coins(), records, price });
}

function waitingCard(c) {
  const el = document.createElement('div');
  el.className = 'next-card waiting';
  el.innerHTML = `
    <div class="next-poster">🎟️</div>
    <div class="next-body">
      <p class="next-title"></p>
      <p class="next-msg">🎟️ 샀어요! <b>아빠에게 보여주세요</b> — 아빠가 영상을 넣어 주면 볼 수 있어요</p>
    </div>`;
  el.querySelector('.next-title').textContent = `${c.emoji} ${c.ko}`;
  return el;
}

function lockedCard(c, st) {
  const el = document.createElement('div');
  el.className = 'next-card' + (st.ready ? ' ready' : '');
  const url = characterUrl(c.poster);
  el.innerHTML = `
    <div class="next-poster">${url ? `<img src="${url}" alt="">` : c.emoji}</div>
    <div class="next-body">
      <p class="next-kicker">🎟️ 다음 영상</p>
      <p class="next-title"></p>
      <p class="next-blurb"></p>
      <p class="next-teaser"></p>
      <p class="next-cast-label">이 포켓몬들이 나와요</p>
      <div class="next-cast"></div>
      <div class="next-needs"></div>
      <p class="next-note">🎟️ 이건 <b>교환권</b>이에요. 바꾸면 아빠가 영상을 넣어 줘요.</p>
      <button class="btn next-buy"></button>
    </div>`;
  el.querySelector('.next-title').textContent = `${c.emoji} ${c.ko}`;
  el.querySelector('.next-blurb').textContent = `${c.blurb} · ${c.minutes}분 · ${c.sentences}문장`;
  const tz = el.querySelector('.next-teaser');
  tz.textContent = c.teaser ? `“${c.teaser}”` : '';
  tz.hidden = !c.teaser;

  const cast = el.querySelector('.next-cast');
  for (const m of (c.cast || [])) {
    const fig = document.createElement('span');
    fig.className = 'next-cast-mon';
    fig.dataset.id = String(m.id);
    fig.innerHTML = `<span class="ph">❔</span><span class="n"></span>`;
    fig.querySelector('.n').textContent = m.ko;
    cast.appendChild(fig);
  }
  fillCast(el, c);

  const needs = el.querySelector('.next-needs');
  for (const it of st.items) {
    const row = document.createElement('div');
    row.className = 'next-need' + (it.ok ? ' ok' : '');
    row.innerHTML = `<span class="l"></span><span class="v"></span><span class="bar"><i></i></span>`;
    row.querySelector('.l').textContent = `${it.ok ? '✅' : '⬜'} ${it.label}`;
    row.querySelector('.v').textContent = `${it.have.toLocaleString()} / ${it.need.toLocaleString()}`;
    row.querySelector('.bar i').style.width = `${it.pct}%`;
    needs.appendChild(row);
  }

  const btn = el.querySelector('.next-buy');
  btn.textContent = st.ready ? `🎟️ ${c.price.toLocaleString()}코인으로 교환권 받기!` : '아직 못 바꿔요 — 조금만 더!';
  btn.disabled = !st.ready;
  btn.classList.toggle('btn-primary', st.ready);
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    unlockAudio();
    // 화면 상태만 믿지 않고 저장소에서 다시 판정한다 (버튼을 억지로 켜도 조건은 지켜진다).
    // 판정은 buyTicket 안에서도 한 번 더 돈다 — 구매 경로를 직접 불러도 통과 못 하게
    const ready = async () => (await currentState(c.price)).ready;
    if (!await ready()) {
      btn.disabled = false;
      btn.textContent = '아직 조건이 안 됐어요';
      await refreshList();
      return;
    }
    if (await buyTicket(c.id, ready)) {
      sfx.levelUp();
      await refreshList();
    } else {
      btn.disabled = false;
      btn.textContent = '코인이 조금 모자라요';
    }
  });
  return el;
}

async function updateStorageText() {
  const est = await storageEstimate();
  const el = $('storage-text');
  if (!est) { el.textContent = ''; return; }
  el.textContent = `사용 중 ${formatBytes(est.usage)} / 사용 가능 ${formatBytes(est.quota)}`;
}
