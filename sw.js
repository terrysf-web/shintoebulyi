// 온라인이면 항상 최신 파일을 받고, 오프라인이면 저장해 둔 파일로 엽니다.
const CACHE = 'stby-pos-v3';
const PRECACHE = ['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];
const OPTIONAL = ['config.js', 'sync.bundle.js', 'kitchen.html'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache =>
        cache.addAll(PRECACHE.map(url => new Request(url, { cache: 'reload' })))
          .then(() => Promise.allSettled(OPTIONAL.map(url => cache.add(new Request(url, { cache: 'reload' })))))
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;
  event.respondWith(
    fetch(request, { cache: 'no-cache' })
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy));
        }
        return response;
      })
      .catch(() =>
        caches.match(request, { ignoreSearch: true }).then(hit =>
          hit || (request.mode === 'navigate' ? caches.match('index.html') : Response.error())
        )
      )
  );
});
