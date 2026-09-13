// 서비스워커: 앱 셸(HTML/CSS/JS/아이콘)을 버전별로 통째로 캐시 → 오프라인 실행 + 홈 화면 설치
// ★ 코드를 수정해 배포할 때마다 CACHE_VERSION을 올릴 것 (안 올리면 기기에 예전 코드가 남음)
// 전략: 앱 셸은 cache-first (한 버전의 파일이 항상 함께 제공되어 새 HTML + 옛 JS 섞임 방지)
const CACHE_VERSION = 'v23';
const CACHE_PREFIX = 'shincoach-';
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/app.js',
  './js/db.js',
  './js/srt.js',
  './js/sami.js',
  './js/library.js',
  './js/player.js',
  './js/vocab.js',
  './js/diag.js',
  './js/speak.js',
  './js/track.js',
  './js/stats.js',
  './js/puzzle.js',
  './js/pokemon.js',
  './js/xp.js',
  './js/catch.js',
  './js/pokedex.js',
  './vocab/basic.json',
  './vocab/words.json',
  './vocab/phrases.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      // cache: 'reload' → 브라우저 HTTP 캐시를 거치지 않고 서버의 최신 파일을 받음
      .then((cache) => cache.addAll(APP_SHELL.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      // 같은 origin(GitHub Pages)의 다른 앱 캐시는 건드리지 않도록 접두사로 제한
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;           // 외부 요청은 관여 안 함
  if (!url.protocol.startsWith('http')) return;         // blob: 등 (영상)은 관여 안 함

  // 페이지 이동(주소 입력/새로고침) → 캐시된 index.html, 없으면 네트워크
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then((hit) => hit || fetch(req))
    );
    return;
  }

  // 앱 셸 파일 → cache-first, 캐시에 없으면 네트워크에서 받아 캐시에 보관
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {}));
        }
        return res;
      });
    })
  );
});
