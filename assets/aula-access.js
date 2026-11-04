/* Navegación y puerta de entrada de Mi aula. La autorización de datos la aplica Supabase RLS. */
(()=>{
 'use strict';
 const links=()=>[...document.querySelectorAll('#ee-shared-header a[data-ee-private-link]')];
 const gate=document.getElementById('aulaAccessGate');
 const classroom=document.getElementById('aulaPrivateContent');
 // El menú puede insertarse después de cargar la página: no salir antes de comprobarlo.
 const SUPABASE_URL='https://wnluofonzteaqtlfshgy.supabase.co';
 const PUBLIC_KEY='sb_publishable_Ef-AXAapcwaPExEFS6kmug_tKLaulM8';
 let db=null,revision=0;
 function show(authorized,reason){
  links().forEach(link=>{link.hidden=!authorized});
  const profileLink=document.querySelector('#ee-shared-header a[data-ee-profile-entry]');
  if(profileLink)profileLink.href=authorized?'/perfil.html':'/login.html?next=%2Fperfil.html';
  if(classroom)classroom.hidden=!authorized;
  if(gate){
   gate.hidden=authorized;
   if(!authorized){
    const msg=gate.querySelector('[data-aula-access-message]');
    if(msg)msg.textContent=reason||'Inicia sesión en tu perfil para acceder a Mi aula.';
   }
  }
 }
 function sdk(){
  if(window.supabase?.createClient)return Promise.resolve(window.supabase);
  return new Promise((resolve,reject)=>{
   const existing=document.querySelector('script[data-aula-supabase-sdk]');
   if(existing){
    existing.addEventListener('load',()=>resolve(window.supabase),{once:true});
    existing.addEventListener('error',()=>reject(new Error('No se pudo cargar la autenticación')),{once:true});
    return;
   }
   const script=document.createElement('script');
   script.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
   script.dataset.aulaSupabaseSdk='true';
   script.onload=()=>window.supabase?.createClient?resolve(window.supabase):reject(new Error('SDK no disponible'));
   script.onerror=()=>reject(new Error('No se pudo cargar la autenticación'));
   document.head.append(script);
  });
 }
 async function refresh(){
  const ticket=++revision;
  show(false,'Comprobando tu sesión…');
  try{
   const {data,error}=await db.auth.getUser();
   if(ticket!==revision)return;
   if(error||!data?.user){show(false,'Inicia sesión en tu perfil para acceder a Mi aula.');return;}
   show(true);
  }catch(e){
   if(ticket===revision)show(false,'No se pudo comprobar la sesión. Revisa tu conexión e inténtalo desde el perfil.');
  }
 }
 async function init(){
  show(false,'Comprobando tu sesión…');
  try{
   const client=await sdk();
   db=window.eeDb||client.createClient(SUPABASE_URL,PUBLIC_KEY);
   db.auth.onAuthStateChange(event=>{
    if(event==='SIGNED_OUT'){revision++;show(false,'La sesión se ha cerrado. Inicia sesión para acceder a Mi aula.');}
    else if(event==='SIGNED_IN'||event==='USER_UPDATED'||event==='TOKEN_REFRESHED')Promise.resolve().then(refresh);
   });
   await refresh();
   // Al volver a una pestaña restaurada, no fiarse de la sesión anterior.
   window.addEventListener('pageshow',event=>{if(event.persisted)void refresh()});
   // El encabezado también puede insertarse de forma asíncrona en páginas antiguas.
   window.addEventListener('easyenglish:header-ready',()=>{void refresh()});
  }catch(e){show(false,'No se pudo comprobar el acceso. Abre Mi perfil para iniciar sesión.');}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else void init();
})();
