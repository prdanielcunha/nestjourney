const CACHE='nestjourney-static-v2';
const STATIC=['/manifest.webmanifest','/icon.svg'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(STATIC)));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;

  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  // Never cache HTML navigations or SSO handoff URLs. This prevents stale app shells
  // and avoids persisting ecosystem_ctx tokens in Cache Storage.
  if(request.mode==='navigate'||url.searchParams.has('ecosystem_ctx')){
    event.respondWith(fetch(request));
    return;
  }

  if(url.pathname.startsWith('/assets/')){
    event.respondWith(
      caches.match(request).then(cached=>cached||fetch(request).then(response=>{
        if(response.ok){
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(request,copy));
        }
        return response;
      }))
    );
    return;
  }

  if(STATIC.includes(url.pathname)){
    event.respondWith(
      fetch(request).then(response=>{
        if(response.ok){
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(request,copy));
        }
        return response;
      }).catch(()=>caches.match(request))
    );
  }
});
