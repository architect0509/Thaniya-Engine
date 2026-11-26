/* Thaniya Engine은 서비스 워커를 쓰지 않습니다.
 * 이 파일은 엔진 폴더에 잘못 들어왔던 SoundLab 서비스 워커(tsl-*)를 지우기 위한 것입니다.
 * 브라우저가 이 파일을 새로 받으면 SoundLab 캐시를 지우고 스스로 등록을 해제합니다. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('tsl-')).map(k => caches.delete(k)));
    await self.registration.unregister();
  })());
});
