(() => {
  const ENDPOINT='https://poatmbsfglhrcdbosinb.supabase.co/functions/v1/public-web-event';
  const SOURCE_KEY='sipmate_marketing_source';
  const SOURCE_TS_KEY='sipmate_marketing_source_ts';
  const VISITOR_KEY='sipmate_visitor_id';
  const SESSION_KEY='sipmate_session_id';
  const SOURCE_TTL=30*24*60*60*1000;
  const nativeFetch=window.fetch.bind(window);

  function uuid(){
    if(crypto?.randomUUID)return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0,v=c==='x'?r:(r&3|8);return v.toString(16)});
  }
  function getStorage(store,key,fallback){try{return store.getItem(key)||fallback}catch{return fallback}}
  function setStorage(store,key,value){try{store.setItem(key,value)}catch{}}
  function visitorId(){let v=getStorage(localStorage,VISITOR_KEY,'');if(!v){v=uuid();setStorage(localStorage,VISITOR_KEY,v)}return v}
  function sessionId(){let v=getStorage(sessionStorage,SESSION_KEY,'');if(!v){v=uuid();setStorage(sessionStorage,SESSION_KEY,v)}return v}
  function cleanSource(value){return String(value||'').trim().toLowerCase().replace(/[^a-z0-9._-]/g,'').slice(0,100)}
  function resolveSource(){
    const p=new URLSearchParams(location.search);
    const incoming=cleanSource(p.get('src')||p.get('utm_source')||'');
    if(incoming){setStorage(localStorage,SOURCE_KEY,incoming);setStorage(localStorage,SOURCE_TS_KEY,String(Date.now()));return incoming}
    const saved=cleanSource(getStorage(localStorage,SOURCE_KEY,''));
    const ts=Number(getStorage(localStorage,SOURCE_TS_KEY,'0'));
    if(saved&&ts&&Date.now()-ts<SOURCE_TTL)return saved;
    return 'direct';
  }
  function referrerHost(){try{if(!document.referrer)return null;const u=new URL(document.referrer);if(u.hostname===location.hostname)return null;return u.hostname.slice(0,160)}catch{return null}}
  function device(){const ua=navigator.userAgent||'';if(/ipad|tablet|playbook|silk/i.test(ua)||(/android/i.test(ua)&&!/mobile/i.test(ua)))return 'tablet';if(/mobile|iphone|ipod|android/i.test(ua))return 'mobile';return 'desktop'}
  function payload(type){return {event_id:uuid(),visitor_id:visitorId(),session_id:sessionId(),event_type:type,path:(location.pathname||'/').slice(0,220),source:resolveSource(),referrer_host:referrerHost(),locale:(navigator.language||'').slice(0,24),device_type:device()}}
  function send(type){
    const body=JSON.stringify(payload(type));
    try{
      if(navigator.sendBeacon){const blob=new Blob([body],{type:'application/json'});if(navigator.sendBeacon(ENDPOINT,blob))return}
    }catch{}
    nativeFetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body,keepalive:true}).catch(()=>{});
  }

  window.fetch=async function(input,init){
    const response=await nativeFetch(input,init);
    try{
      const url=typeof input==='string'?input:input?.url||'';
      if(url.includes('/functions/v1/join-waitlist')&&response.ok){
        const copy=response.clone();
        copy.json().then(data=>{if(data?.ok===true&&!data?.already)send('waitlist_signup')}).catch(()=>{});
      }
    }catch{}
    return response;
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>send('page_view'),{once:true});else send('page_view');
})();
