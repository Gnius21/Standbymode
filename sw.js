/* StandBy service worker — cache-first (stale-while-revalidate) for the
   app shell: launches render instantly from cache while a background
   fetch refreshes the copy; new deploys bump CACHE, and the page reloads
   itself on controllerchange when the new worker takes over. Cross-origin
   requests (weather APIs, CORS proxies) are passed through untouched so
   live data is never staled. */

const CACHE = 'standby-v57';
const ASSETS = [
  './',
  './index.html',
  './weather.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE)
      .then(function(c){ return c.addAll(ASSETS); })
      .then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; })
        .map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

// Tapping a Life reminder notification focuses the app (or opens it).
self.addEventListener('notificationclick', function(e){
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list){
      for(var i=0;i<list.length;i++){ if('focus' in list[i]) return list[i].focus(); }
      if(self.clients.openWindow) return self.clients.openWindow('./index.html');
    })
  );
});

self.addEventListener('fetch', function(e){
  const url = new URL(e.request.url);
  // Only handle same-origin GETs; let weather/proxy requests pass through.
  if(e.request.method !== 'GET' || url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(e.request, {ignoreSearch: true}).then(function(hit){
      const net = fetch(e.request).then(function(resp){
        if(resp && resp.ok){
          const copy = resp.clone();
          caches.open(CACHE).then(function(c){ c.put(e.request, copy); });
        }
        return resp;
      });
      if(hit){
        net.catch(function(){}); // background refresh; failure is fine
        return hit;
      }
      return net.catch(function(){ return caches.match('./index.html'); });
    })
  );
});
