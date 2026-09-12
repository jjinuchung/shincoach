// 앱 진입점: 화면 전환, 서비스워커 등록, 모듈 초기화
import { initLibrary } from './library.js';
import { initPlayer } from './player.js';

const views = {
  library: document.getElementById('view-library'),
  player: document.getElementById('view-player'),
};

/** 화면 전환 (library | player) */
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

/** 서비스워커 등록 (PWA 오프라인/설치) — file:// 에서는 동작하지 않음 */
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol === 'file:') return;
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
window.addEventListener('unhandledrejection', (e) => showError(`오류: ${(e.reason && e.reason.message) || e.reason}`));

async function main() {
  // 버튼 연결을 가장 먼저 — 뒤의 어떤 단계가 실패해도 UI는 동작해야 함
  initPlayer({ showView });
  showView('library');
  window.__appReady = true; // index.html의 시작 감시 타이머 해제
  try {
    await initLibrary({ showView });
  } catch (err) {
    showError(`저장소를 열 수 없어요: ${err.message} (시크릿 모드이거나 저장 공간이 꺼져 있을 수 있어요)`);
  }
  requestPersistentStorage();
  registerServiceWorker();
}

main();
