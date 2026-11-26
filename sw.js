/* Thaniya-SoundLab 서비스 워커
 * - 오프라인에서도 열리도록 사이트 파일을 저장해 둠
 * - 이 파일은 사이트 전체를 다루려면 루트에 있어야 해서 install/ 폴더 밖에 둠
 * - VERSION 은 install/update/release.js 가 새 버전을 낼 때 자동으로 바꿔요
 * - 새 버전 알림은 install/update/ 의 Update Notifier 가 version.json 을 보고 띄워요
 */
const VERSION = 'v1.3.0-202611260559';
const CACHE = 'tsl-' + VERSION;
const FONT_CACHE = 'tsl-fonts';

const CORE = [
  './',
  './index.html',
  './edit.html',
  './mypage.html',
  './humming-composer.html',
  './css/app.css',
  './js/app.js',
  './js/mypage.js',
  './js/fullscreen.js',
  './js/store.js',
  './js/guide.js',
  './js/thaniya-intro.js',
  './js/lame.min.js',
  './js/loader.js',
  './baby/index.html',
  './baby/manifest.webmanifest',
  './Asset/icon.png',
  './Asset/ThaniyaLogo.png',
  './install/install.css',
  './install/install.js',
  './install/manifest.webmanifest',
  './install/icons/icon-192.png',
  './install/icons/icon-512.png',
  './install/icons/maskable-512.png',
  './install/icons/apple-touch-icon.png',
  './install/update/update-notifier.js',
  './install/update/update-notifier.css',
  './install/update/app-version.js',
  './install/update/changelog.json',
  './install/update/version-panel.js',
  './install/update/version-panel.css'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      // 파일 하나가 없어도 설치가 멈추지 않도록 하나씩 저장
      Promise.all(CORE.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})))
    )
  );
  // 파일은 인터넷 우선으로 받으니 새 서비스 워커는 바로 켜도 안전해요
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('tsl-') && k !== CACHE && k !== FONT_CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Google Fonts: 저장해 둔 걸 먼저 쓰고 뒤에서 갱신
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONT_CACHE).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('/install/downloads/')) return; // 설치 파일은 저장하지 않음
  if (url.pathname.endsWith('/version.json')) return;        // 새 버전 정보는 항상 인터넷에서

  // 같은 사이트 파일: 인터넷이 되면 항상 최신, 안 되면 저장본
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    try {
      // 브라우저 캐시에 남은 옛 파일 대신 서버에 새 파일이 있는지 확인하고 받아요
      const res = await fetch(req.mode === 'navigate' ? req : new Request(req, { cache: 'no-cache' }));
      if (res.ok && res.type === 'basic') c.put(req, res.clone());
      return res;
    } catch (err) {
      const hit = await c.match(req) || await c.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === 'navigate') return (await c.match('./index.html')) || Response.error();
      throw err;
    }
  })());
});
