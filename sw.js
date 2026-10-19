const CACHE="mi-despensa-shell-v7";
const SHELL=["./","./index.html","./styles.css","./config.js","./app.js","./local-db.js","./manifest.webmanifest","./icon.svg","./apple-touch-icon.png","./icon-192.png","./icon-512.png"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=="GET"||u.origin!==location.origin)return;
  // Red primero (siempre la versión más nueva); caché como respaldo sin internet
  e.respondWith(
    fetch(e.request).then(resp=>{
      if(resp.ok){const copy=resp.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));}
      return resp;
    }).catch(()=>caches.match(e.request).then(cached=>cached||caches.match("./index.html")))
  );
});
