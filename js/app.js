// 앱 진입점: 화면 전환, 서비스워커 등록, 모듈 초기화
import { initLibrary } from './library.js';
import { initPlayer, requirePin } from './player.js';
import { initStats } from './stats.js';
import { initPokedex } from './pokedex.js';
import { getDaily, syncCoachFixes } from './db.js';
import { todayKey, byeSummary, flush as flushTrack } from './track.js';

const views = {
  library: document.getElementById('view-library'),
  player: document.getElementById('view-player'),
  stats: document.getElementById('view-stats'),
  pokedex: document.getElementById('view-pokedex'),
};

/** 화면 전환 (library | player | stats | pokedex) */
export function showView(name) {
  for (const [key, el] of Object.entries(views)) {
    el.hidden = key !== name;
  }
  window.scrollTo(0, 0);
}

/** 전체 화면 로딩 표시 (영상 열기/저장처럼 수 초 이상 걸리는 작업용) */
export function showLoading(text = '불러오는 중...') {
  document.getElementById('loading-text').textContent = text;
  document.getElementById('loading').hidden = false;
}
export function hideLoading() {
  document.getElementById('loading').hidden = true;
}

/**
 * 🚪 종료 (시작 화면 맨 아래) — 인사 화면에서 한 번 더 확인한 뒤 창을 닫는다.
 * 홈 화면에 설치한 PWA는 window.close()로 닫히지만 일반 브라우저 탭은 무시하므로,
 * 잠시 뒤에도 살아 있으면 "홈 버튼으로 나가세요" 안내로 바꾼다.
 */
function initExit() {
  const bye = document.getElementById('bye');
  const title = document.getElementById('bye-title');
  const summary = document.getElementById('bye-summary');
  const hint = document.getElementById('bye-hint');
  const quit = document.getElementById('bye-quit');
  const back = document.getElementById('bye-back');
  if (!bye) return;

  document.getElementById('btn-exit').addEventListener('click', async () => {
    summary.textContent = '';
    hint.textContent = '내일 또 만나요';
    quit.hidden = false;
    quit.disabled = false;
    back.textContent = '← 더 할래요';
    bye.hidden = false;
    try {
      const text = byeSummary(await getDaily(todayKey()));
      title.textContent = text ? '오늘도 잘했어요!' : '또 만나요!';
      summary.textContent = text || '오늘은 아직 공부 기록이 없어요';
    } catch { /* 기록을 못 읽어도 종료는 되어야 함 */ }
  });

  back.addEventListener('click', () => { bye.hidden = true; });

  quit.addEventListener('click', async () => {
    quit.disabled = true;
    hint.textContent = '저장하는 중...';
    try { await flushTrack(); } catch { /* 저장에 실패해도 종료는 막지 않음 */ }
    window.close();
    setTimeout(() => {
      quit.hidden = true;
      quit.disabled = false;
      back.textContent = '← 다시 학습하기';
      hint.textContent = '이제 홈 버튼으로 나가면 돼요 (기록은 저장했어요)';
    }, 500);
  });
}

/** 서비스워커 등록 (PWA 오프라인/설치) — file:// 에서는 동작하지 않음 */
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol === 'file:') return;
  if (/[?&]nosw\b/.test(location.search)) return; // 개발용: ?nosw 로 열면 캐시 없이 항상 최신 파일 (헤드리스 테스트)
  try {
    await navigator.serviceWorker.register('./sw.js');
    // 새 버전 SW가 페이지를 넘겨받으면 안내 (학습 중 자동 새로고침은 하지 않음)
    let hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadController) document.getElementById('update-toast').hidden = false;
      hadController = true;
    });
    document.getElementById('update-reload').addEventListener('click', () => location.reload());
  } catch (err) {
    console.warn('서비스워커 등록 실패:', err);
  }
}

/** 브라우저가 저장 데이터를 임의로 지우지 않도록 영구 저장 요청 (결과를 기다리지 않음 — 일부 기기에서 응답이 없을 수 있음) */
function requestPersistentStorage() {
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist()
      .then((granted) => console.log('영구 저장:', granted ? '허용' : '거부'))
      .catch(() => {});
  }
}

/** 화면 상단에 오류를 표시 (태블릿 등 개발자 도구를 못 여는 기기에서 원인 파악용) */
export function showError(message) {
  const el = document.getElementById('error-banner');
  if (!el) return;
  el.textContent = `⚠️ ${message}`;
  el.hidden = false;
}

window.addEventListener('error', (e) => showError(`오류: ${e.message || e.type}`));
window.addEventListener('shincoach:dbblocked', () => showError('다른 창(또는 옛 버전 앱)이 저장소를 쓰고 있어요. 신코치 창을 모두 닫고 다시 열어 주세요'));
window.addEventListener('shincoach:dbversionchange', () => showError('새 버전이 열렸어요. 이 창은 닫고 새 창을 사용해 주세요'));
window.addEventListener('unhandledrejection', (e) => showError(`오류: ${(e.reason && e.reason.message) || e.reason}`));

async function main() {
  // 버튼 연결을 가장 먼저 — 뒤의 어떤 단계가 실패해도 UI는 동작해야 함
  initPlayer({ showView });
  initStats({ showView, requirePin });
  initPokedex({ showView });
  initExit();
  showView('library');
  window.__appReady = true; // index.html의 시작 감시 타이머 해제
  try {
    await initLibrary({ showView });
  } catch (err) {
    showError(`저장소를 열 수 없어요: ${err.message} (시크릿 모드이거나 저장 공간이 꺼져 있을 수 있어요)`);
  }
  // 👨‍👩‍👦 배포에 실려 온 아빠 교정문 반영 (실패해도 학습에는 영향 없음)
  syncCoachFixes().catch(() => {});
  import('./pokemon.js').then((m) => m.loadForms()).catch(() => {}); // ⭐ 받아둔 변신 그림 (오프라인에서도 보이게)
  requestPersistentStorage();
  registerServiceWorker();
}

main();
