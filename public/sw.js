const CACHE = 'chord-trainer-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/audio/piano/C2.m4a',
  '/audio/piano/Ds2.m4a',
  '/audio/piano/Fs2.m4a',
  '/audio/piano/A2.m4a',
  '/audio/piano/C3.m4a',
  '/audio/piano/Ds3.m4a',
  '/audio/piano/Fs3.m4a',
  '/audio/piano/A3.m4a',
  '/audio/piano/C4.m4a',
  '/audio/piano/Ds4.m4a',
  '/audio/piano/Fs4.m4a',
  '/audio/piano/A4.m4a',
  '/audio/piano/C5.m4a',
  '/audio/piano/Ds5.m4a',
  '/audio/piano/Fs5.m4a',
  '/audio/piano/A5.m4a',
  '/audio/piano/C6.m4a',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Network first, fall back to cache
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
