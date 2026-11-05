/* Avisos de mensajes nuevos en el menú.
   Cuenta mensajes recibidos desde la última visita a Mensajes + solicitudes pendientes
   (función contar_mensajes_nuevos en Supabase; la seguridad la aplica RLS). */
(()=>{
 'use strict';
 const SUPABASE_URL='https://wnluofonzteaqtlfshgy.supabase.co';
 const PUBLIC_KEY='sb_publishable_Ef-AXAapcwaPExEFS6kmug_tKLaulM8';
 const INTERVAL=60000;
 const onMessagesPage=/\/mensajes\.html$/.test(location.pathname);
 let db=null,user=null,timer=null,revision=0;

 const header=()=>document.getElementById('ee-shared-header');
 const badges=()=>[...document.querySelectorAll('[data-ee-notif-badge]')];
 const links=()=>[...document.querySelectorAll('#ee-shared-header .ee-notif-link')];

 function paint(count){
  const n=Math.max(0,Number(count)||0);
  const label=n>99?'99+':String(n);
  badges().forEach(b=>{b.textContent=label;b.hidden=n===0});
  links().forEach(a=>a.setAttribute('aria-label',n?`Mensajes: ${n} ${n===1?'novedad':'novedades'}`:'Mensajes'));
  header()?.classList.toggle('ee-has-notif',n>0);
 }

 function toast(count){
  // Un solo aviso por sesión de navegador y por cifra, para no repetirlo en cada página.
  const key='ee-notif-toast:'+user.id+':'+count;
  try{if(sessionStorage.getItem(key))return;sessionStorage.setItem(key,'1')}catch{}
  document.querySelector('.ee-notif-toast')?.remove();
  const box=document.createElement('div');
  box.className='ee-notif-toast';
  box.setAttribute('role','status');
  const text=document.createElement('span');
  text.textContent=count===1?'Tienes 1 mensaje nuevo':`Tienes ${count} mensajes nuevos`;
  const go=document.createElement('a');
  go.href='/mensajes.html';go.textContent='Ver mensajes';
  const close=document.createElement('button');
  close.type='button';close.className='ee-notif-close';close.setAttribute('aria-label','Cerrar aviso');close.textContent='×';
  close.onclick=()=>box.remove();
  box.append(text,go,close);
  document.body.append(box);
  setTimeout(()=>box.remove(),9000);
 }

 async function markSeen(){
  const {error}=await db.from('mensajes_vistos').upsert({usuario_id:user.id,visto_en:new Date().toISOString()},{onConflict:'usuario_id'});
  if(error)throw error;
 }

 async function check(){
  if(!user||document.hidden)return;
  const ticket=revision;
  try{
   if(onMessagesPage)await markSeen();
   const {data,error}=await db.rpc('contar_mensajes_nuevos');
   if(error)throw error;
   if(ticket!==revision)return;
   paint(data);
   if(data>0&&!onMessagesPage)toast(data);
  }catch(e){console.warn('No se pudieron comprobar los mensajes nuevos',e)}
 }

 function stop(){revision++;user=null;clearInterval(timer);timer=null;paint(0)}
 function start(u){
  if(user?.id===u.id)return;
  revision++;user=u;
  clearInterval(timer);timer=setInterval(check,INTERVAL);
  void check();
 }

 function sdk(){
  if(window.supabase?.createClient)return Promise.resolve(window.supabase);
  return new Promise((resolve,reject)=>{
   const tag=document.querySelector('script[data-aula-supabase-sdk]')||document.querySelector('script[src*="supabase-js@2"]');
   if(tag){
    tag.addEventListener('load',()=>resolve(window.supabase),{once:true});
    tag.addEventListener('error',()=>reject(new Error('Sin autenticación')),{once:true});
    return;
   }
   reject(new Error('Sin autenticación'));
  });
 }

 async function init(){
  try{
   // Esperar a que aula-access.js o la página carguen el SDK, para no duplicar la descarga.
   if(!window.supabase?.createClient)await new Promise(r=>setTimeout(r,0));
   const lib=await sdk();
   db=window.eeDb||lib.createClient(SUPABASE_URL,PUBLIC_KEY);
   db.auth.onAuthStateChange((event,session)=>{
    // No llamar a Supabase dentro del callback síncrono.
    setTimeout(()=>{
     if(event==='SIGNED_OUT'||!session?.user)stop();
     else start(session.user);
    },0);
   });
   const {data}=await db.auth.getSession();
   if(data?.session?.user)start(data.session.user);
   document.addEventListener('visibilitychange',()=>{if(!document.hidden)void check()});
   window.addEventListener('easyenglish:header-ready',()=>{if(user)void check()});
  }catch(e){/* Sin SDK no hay sesión: no se muestra nada. */}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else void init();
})();
