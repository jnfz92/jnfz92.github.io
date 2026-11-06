/* Puerta común para páginas privadas. Ocultar el HTML no sustituye Supabase RLS. */
(()=>{'use strict';
 const privatePages=new Set([
  'perfil.html','aula-b2.html','examenes.html','practicar.html','repasar-leidos.html',
  'categorias-repaso.html','mi-vocabulario.html','comunidad.html','mensajes.html',
  'historial-bitacora.html','constancia-b2.html','administracion.html','clave-openai.html'
 ]);
 const page=location.pathname.split('/').pop();
 if(!privatePages.has(page)&&!location.pathname.startsWith('/dashboard/'))return;
 // Los enlaces enviados por Supabase necesitan abrir el formulario de recuperación original.
 const hash=new URLSearchParams(location.hash.slice(1));
 const query=new URLSearchParams(location.search);
 if(page==='perfil.html'&&(hash.has('access_token')||hash.has('refresh_token')||
    hash.get('type')==='recovery'||hash.get('type')==='signup'||
    query.get('type')==='recovery'||hash.has('error_description')||
    query.has('code')||query.has('token_hash')))return;
 const style=document.createElement('style');
 style.textContent='html.ee-auth-checking body main,html.ee-auth-checking body footer{visibility:hidden!important}';
 document.head.append(style);
 document.documentElement.classList.add('ee-auth-checking');
 const loginUrl=()=>{
  const next=location.pathname+location.search+location.hash;
  return '/login.html?next='+encodeURIComponent(next);
 };
 function toLogin(){location.replace(loginUrl())}
 function sdk(){
  if(window.eeDb)return Promise.resolve(window.eeDb);
  if(window.supabase?.createClient)return Promise.resolve(window.supabase.createClient(
   'https://wnluofonzteaqtlfshgy.supabase.co','sb_publishable_Ef-AXAapcwaPExEFS6kmug_tKLaulM8'
  ));
  return new Promise((resolve,reject)=>{
   const tag=document.createElement('script');
   tag.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
   tag.onload=()=>window.supabase?.createClient?resolve(window.supabase.createClient(
    'https://wnluofonzteaqtlfshgy.supabase.co','sb_publishable_Ef-AXAapcwaPExEFS6kmug_tKLaulM8'
   )):reject(new Error('Sin autenticación'));
   tag.onerror=()=>reject(new Error('No se pudo cargar la autenticación'));
   document.head.append(tag);
  });
 }
 async function init(){
  try{
   const db=await sdk();
   const {data,error}=await db.auth.getUser();
   if(error&&error.name!=='AuthSessionMissingError')throw error;
   if(!data?.user){toLogin();return}
   document.documentElement.classList.remove('ee-auth-checking');
   db.auth.onAuthStateChange(event=>{
    if(event==='SIGNED_OUT')toLogin();
   });
  }catch(err){
   // No mostrar información personal si no se puede verificar la sesión.
   document.documentElement.classList.remove('ee-auth-checking');
   const main=document.querySelector('main');
   if(main){
    main.replaceChildren();
    const message=document.createElement('section');
    message.style.cssText='width:min(750px,calc(100% - 32px));margin:65px auto;padding:30px;border-radius:18px;background:#fff;border:1px solid #d5e2f6;text-align:center;font:16px/1.6 system-ui,sans-serif';
    const heading=document.createElement('h1');heading.textContent='No podemos verificar tu sesión';
    const p=document.createElement('p');p.textContent='Comprueba tu conexión e inténtalo de nuevo desde la página de acceso.';
    const a=document.createElement('a');a.href=loginUrl();a.textContent='Ir a iniciar sesión →';
    message.append(heading,p,a);main.append(message);
   }
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else void init();
})();
