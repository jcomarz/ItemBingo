// Spotted service worker — network-first app shell + Android share target
const CACHE='ib-v1.7';
const SHELL=['./','./index.html','./manifest.json','./icons/icon-192x192.png','./icons/icon-512x512.png'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).catch(()=>{}));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(n=>n.startsWith('ib-v')&&n!==CACHE).map(n=>caches.delete(n)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  // Android share sheet → "Spotted": stash the image, open the app on it
  if(e.request.method==='POST'&&url.pathname.endsWith('/share-target')){
    e.respondWith((async()=>{
      try{
        const fd=await e.request.formData();
        const f=fd.get('image');
        const c=await caches.open('ib-share');
        if(f&&f.size)await c.put('shared-image',new Response(f,{headers:{'Content-Type':f.type||'image/jpeg'}}));
        else{const link=fd.get('url')||fd.get('text')||'';if(link)await c.put('shared-url',new Response(String(link)));}
      }catch(err){}
      return Response.redirect('./index.html?shared=1',303);
    })());
    return;
  }
  if(e.request.method!=='GET'||url.origin!==location.origin)return;// Firebase, CDNs, AI APIs go straight to network
  e.respondWith(fetch(e.request).then(r=>{if(r.ok){const cp=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cp));}return r;}).catch(()=>caches.match(e.request).then(m=>m||caches.match('./index.html'))));
});
