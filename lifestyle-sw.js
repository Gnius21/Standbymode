/* Lifestyle standalone app — service worker.
   Cache-first for instant offline launch; notificationclick focuses the app. */
const CACHE = 'lifestyle-v1';
const ASSETS = [
  './lifestyle.html',
  './lifestyle.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ASSETS); }).then(function(){ return self.skipWaiting(); }));
});

self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});

self.addEventListener('notificationclick', function(e){
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list){
    for(var i=0;i<list.length;i++){ if('focus' in list[i]) return list[i].focus(); }
    if(self.clients.openWindow) return self.clients.openWindow('./lifestyle.html');
  }));
});

self.addEventListener('fetch', function(e){
  const url = new URL(e.request.url);
  if(e.request.method !== 'GET' || url.origin !== self.location.origin) return; // let ntfy/weather pass through
  e.respondWith(
    caches.match(e.request, {ignoreSearch:true}).then(function(hit){
      const net = fetch(e.request).then(function(resp){
        if(resp && resp.ok){ const copy = resp.clone(); caches.open(CACHE).then(function(c){ c.put(e.request, copy); }); }
        return resp;
      });
      if(hit){ net.catch(function(){}); return hit; }
      return net.catch(function(){ return caches.match('./lifestyle.html'); });
    })
  );
});
