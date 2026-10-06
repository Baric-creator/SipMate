const CACHE="sipmate-site-v3";
const CORE=[
  "/",
  "/index.html",
  "/styles.css",
  "/script.js",
  "/site.webmanifest",
  "/favicon.svg",
  "/offline.html"
];

self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch",event=>{
  const req=event.request;
  if(req.method!=="GET")return;

  const url=new URL(req.url);
  if(url.origin!==location.origin)return;

  if(req.mode==="navigate"){
    event.respondWith(
      fetch(req)
        .then(res=>{
          const copy=res.clone();
          caches.open(CACHE).then(cache=>cache.put(req,copy));
          return res;
        })
        .catch(()=>caches.match(req).then(r=>r||caches.match("/offline.html")))
    );
    return;
  }

  if(url.pathname.endsWith("/styles.css")||url.pathname.endsWith("/script.js")){
    event.respondWith(
      fetch(req)
        .then(res=>{
          if(res&&res.ok){
            const copy=res.clone();
            caches.open(CACHE).then(cache=>cache.put(req,copy));
          }
          return res;
        })
        .catch(()=>caches.match(req))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached=>{
      const network=fetch(req).then(res=>{
        if(res&&res.ok){
          const copy=res.clone();
          caches.open(CACHE).then(cache=>cache.put(req,copy));
        }
        return res;
      }).catch(()=>cached);
      return cached||network;
    })
  );
});


self.addEventListener("push",event=>{
  let data={title:"SipMate Founder",body:"New SipMate activity.",url:"/admin.html"};
  try{if(event.data)data={...data,...event.data.json()}}catch{}
  event.waitUntil(self.registration.showNotification(data.title,{
    body:data.body,
    icon:"/favicon.svg",
    badge:"/favicon.svg",
    tag:"sipmate-founder-beta",
    renotify:true,
    data:{url:data.url||"/admin.html"}
  }));
});

self.addEventListener("notificationclick",event=>{
  event.notification.close();
  const target=new URL(event.notification.data?.url||"/admin.html",self.location.origin).href;
  event.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(list=>{
    for(const client of list){if("focus" in client){client.navigate(target);return client.focus()}}
    return clients.openWindow(target);
  }));
});
