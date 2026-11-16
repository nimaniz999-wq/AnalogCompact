const V='analog-v9',RT=V+'-rt',CORE=["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "icon-512-maskable.png", "lib/html-to-image.js", "lib/export-shim.js", "lib/jszip.min.js", "assets/analog-logo.png", "assets/nima-logo.png", "assets/nima-logo.jpg", "audio/track1.mp3", "audio/track2.mp3", "audio/track3.mp3", "audio/track4.mp3"];
async function rr(r,m){const b=await m.blob(),h=r.headers.get('range'),x=/bytes=(\d*)-(\d*)/.exec(h)||[];let s=x[1]?+x[1]:0,e=x[2]?+x[2]:b.size-1;if(!x[1]&&x[2]){s=Math.max(0,b.size-(+x[2]));e=b.size-1}e=Math.min(e,b.size-1);return new Response(b.slice(s,e+1),{status:206,statusText:'Partial Content',headers:{'Content-Type':m.headers.get('Content-Type')||'audio/mpeg','Content-Range':'bytes '+s+'-'+e+'/'+b.size,'Content-Length':String(e-s+1),'Accept-Ranges':'bytes'}})}
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V&&x!==RT).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  if(new URL(r.url).origin===location.origin){
    const u=new URL(r.url);if(u.pathname.includes('/apps/')){e.respondWith(fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(V).then(c=>c.put(r,cp))}return res}).catch(()=>caches.match(r,{ignoreSearch:true})));return}
    e.respondWith(caches.match(r,{ignoreSearch:true}).then(m=>m&&r.headers.has('range')?rr(r,m):m||fetch(r).catch(()=>r.mode==='navigate'?caches.match('index.html'):Response.error())));return}
  e.respondWith(caches.open(RT).then(c=>c.match(r).then(m=>{
    const f=fetch(r).then(res=>{if(res&&(res.ok||res.type==='opaque'))c.put(r,res.clone());return res}).catch(()=>m);
    return m||f})));
});
