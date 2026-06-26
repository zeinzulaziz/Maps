const CACHE_NAME = 'jed-map-v5';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.min.css',
  '/js/main.min.js',
  '/data/bali.geojson',
  '/asset/community.svg',
  '/asset/Nyambu.svg',
  '/asset/Pedawa.svg',
  '/asset/Dukuh,_Sibetan.svg',
  '/asset/Kiadan,_Pelaga.svg',
  '/asset/Nusa_Penida.svg',
  '/asset/Adat_Dalem_Tamblingan.svg',
  '/asset/Perancak.svg',
  '/asset/airport.svg',
  '/asset/Tenganan_Pegringsingan.svg'
];

const CDN_ASSETS = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_ASSETS.concat(CDN_ASSETS));
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);

  if (e.request.method !== 'GET') return;

  if (url.pathname.startsWith('/wp-json/')) {
    e.respondWith(staleWhileRevalidate(e.request));
    return;
  }

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request).then(function(response) {
        if (response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      });
    }).catch(function() {
      if (e.request.destination === 'image') {
        return new Response(
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60"><rect fill="#f0ece4" width="100" height="60"/><text x="50" y="33" text-anchor="middle" fill="#8a7a68" font-size="10" font-family="sans-serif">Image offline</text></svg>',
          { headers: { 'Content-Type': 'image/svg+xml' } }
        );
      }
    })
  );
});

function staleWhileRevalidate(request) {
  return caches.open(CACHE_NAME).then(function(cache) {
    return cache.match(request).then(function(cached) {
      var networkFetch = fetch(request).then(function(response) {
        if (response.ok) {
          cache.put(request, response.clone());
        }
        return response;
      }).catch(function() {
        return cached;
      });

      return cached || networkFetch;
    });
  });
}
