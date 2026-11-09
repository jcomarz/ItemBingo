// Spotted service worker — network-first app shell + Android share target (→ 📥 Tray)
const CACHE='ib-v2.8';
const SHELL=['./','./index.html','./manifest.json','./icons/icon-192x192.png','./icons/icon-512x512.png'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).catch(()=>{}));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(n=>n.startsWith('ib-v')&&n!==CACHE).map(n=>caches.delete(n)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  // Android share sheet → "Spotted": stash every shared picture (+ any title/text/link), then open the tray
  if(e.request.method==='POST'&&url.pathname.endsWith('/share-target')){
    e.respondWith((async()=>{
      try{
        const fd=await e.request.formData();
        const files=fd.getAll('image').filter(f=>f&&f.size);
        const c=await caches.open('ib-share');
        const stamp=Date.now();
        for(let i=0;i<files.length;i++){const f=files[i];await c.put('img-'+stamp+'-'+i,new Response(f,{headers:{'Content-Type':f.type||'image/jpeg','X-Name':encodeURIComponent(f.name||'')}}));}
        const meta={title:fd.get('title')||'',text:fd.get('text')||'',url:fd.get('url')||'',files:files.length};
        await c.put('meta-'+stamp,new Response(JSON.stringify(meta),{headers:{'Content-Type':'application/json'}}));
      }catch(err){}
      return Response.redirect('./index.html?shared=1',303);
    })());
    return;
  }
  if(e.request.method!=='GET'||url.origin!==location.origin)return;// Firebase, CDNs, AI APIs go straight to network
  e.respondWith(fetch(e.request).then(r=>{if(r.ok){const cp=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cp));}return r;}).catch(()=>caches.match(e.request).then(m=>m||caches.match('./index.html'))));
});
