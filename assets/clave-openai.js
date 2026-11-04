/* Clave OpenAI temporal: exclusivamente en sessionStorage, separada del perfil y de Supabase. */
(()=>{
 'use strict';
 const db=window.eeDb;
 const form=document.getElementById('openaiKeyForm');
 if(!db||!form)return;
 const input=document.getElementById('openaiApiKey');
 const status=document.getElementById('openaiKeyStatus');
 const sessionStatus=document.getElementById('openaiSessionStatus');
 const remove=document.getElementById('openaiDeleteKey');
 const STORAGE_KEY='easyenglish:openai:temporary:v1';
 const LIFETIME=30*60*1000;
 let activeUser=null;
 function clear(){try{sessionStorage.removeItem(STORAGE_KEY)}catch(e){}input.value=''}
 function getRecord(){
  let raw;
  try{raw=sessionStorage.getItem(STORAGE_KEY)}catch(e){return null}
  if(!raw)return null;
  try{
   const value=JSON.parse(raw);
   if(!value||!value.apiKey||!value.userId||!value.expiresAt||
       value.expiresAt<=Date.now()||value.expiresAt>Date.now()+LIFETIME+10000){
    clear();return null;
   }
   if(activeUser&&value.userId!==activeUser){clear();return null}
   return value;
  }catch(e){clear();return null}
 }
 function render(){
  const record=getRecord();
  status.textContent=record
   ?'✓ Hay una clave guardada temporalmente para esta cuenta. Caduca a las '+new Intl.DateTimeFormat('es-ES',{hour:'2-digit',minute:'2-digit'}).format(new Date(record.expiresAt))+'.'
   :'No hay ninguna clave guardada en esta sesión.';
  remove.disabled=!record;
 }
 async function checkSession(){
  let user=null;
  try{
   const {data,error}=await db.auth.getUser();
   if(!error)user=data.user||null;
  }catch(e){}
  if(!user){
   clear();activeUser=null;form.hidden=true;
   sessionStatus.textContent='Inicia sesión en Easy English para gestionar esta opción.';
   status.replaceChildren();
   const link=document.createElement('a');
   link.href='/perfil.html';
   link.textContent='Ir a iniciar sesión →';
   status.append(link);
   return;
  }
  activeUser=user.id;
  const record=getRecord();
  form.hidden=false;
  sessionStatus.textContent='Cuenta activa · Clave exclusiva de esta sesión del navegador';
  if(record&&record.userId!==activeUser)clear();
  render();
 }
 form.addEventListener('submit',e=>{
  e.preventDefault();
  if(!activeUser){status.textContent='Inicia sesión antes de guardar una clave.';return}
  const key=input.value.trim();
  if(!/^sk-[A-Za-z0-9_-]{9,}$/.test(key)){
   status.textContent='La clave no parece tener un formato válido de OpenAI. Compruébala.';
   return;
  }
  try{
   sessionStorage.setItem(STORAGE_KEY,JSON.stringify({apiKey:key,userId:activeUser,expiresAt:Date.now()+LIFETIME}));
   input.value='';
   render();
  }catch(e){
   input.value='';
   status.textContent='El navegador no permite guardar esta clave en la sesión. No se ha conservado.';
  }
 });
 remove.addEventListener('click',()=>{
  clear();
  render();
  input.focus();
 });
 db.auth.onAuthStateChange(event=>{
  if(event==='SIGNED_OUT'){clear();activeUser=null;form.hidden=true;sessionStatus.textContent='Sesión cerrada.';status.textContent='Se ha borrado la clave temporal.'}
  if(event==='SIGNED_IN'||event==='USER_UPDATED')Promise.resolve().then(checkSession);
 });
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&activeUser)render()});
 void checkSession();
})();
