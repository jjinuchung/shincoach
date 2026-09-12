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

/** 브라우저가 저장 데이터를 임의로 지우지 않도록 영구 저장 요청 */
async function requestPersistentStorage() {
  if (navigator.storage && navigator.storage.persist) {
    try {
      const granted = await navigator.storage.persist();
      console.log('영구 저장:', granted ? '허용' : '거부');
    } catch { /* 무시 */ }
  }
}

async function main() {
  await requestPersistentStorage();
  initPlayer({ showView });
  await initLibrary({ showView });
  showView('library');
  registerServiceWorker();
}

main();
