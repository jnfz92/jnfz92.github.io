/* Easy English · Gestiona la clave OpenAI cifrada en el servidor. */
(()=>{
 'use strict';
 const db=window.eeDb,ai=window.eeAI,form=document.getElementById('openaiKeyForm');if(!db||!ai||!form)return;
 const input=document.getElementById('openaiApiKey'),status=document.getElementById('openaiKeyStatus'),sessionStatus=document.getElementById('openaiSessionStatus'),remove=document.getElementById('openaiDeleteKey'),save=form.querySelector('[type="submit"]');
 const back=document.getElementById('openaiReturnLink'),next=new URLSearchParams(location.search).get('next');
 if(back&&next&&next.startsWith('/')&&!next.startsWith('//')&&!next.includes('\\')){
  const url=new URL(next,location.origin);
  if(url.origin===location.origin&&['/writings.html','/aula-b2.html','/perfil.html'].includes(url.pathname)){back.href=url.pathname+url.search+url.hash;back.textContent='← Volver a '+(url.pathname==='/writings.html'?'Writing':url.pathname==='/aula-b2.html'?'Mi aula B2':'Mi perfil')}
 }
 let activeUser=null,busy=false;
 function setBusy(value){busy=value;save.disabled=value;remove.disabled=value}
 async function refresh(){
  try{
   const {data,error}=await db.auth.getUser(),user=error?null:data?.user;
   if(!user){activeUser=null;form.hidden=true;sessionStatus.textContent='Inicia sesión en Easy English para gestionar tu clave.';status.textContent='Inicia sesión para continuar.';return}
   activeUser=user.id;form.hidden=false;sessionStatus.textContent='Cuenta activa · Tu clave se guarda cifrada en el servidor y solo pertenece a esta cuenta.';
   const state=await ai.availability(db);
   status.textContent=state.reason?'No se pudo comprobar el estado de tu clave: '+state.reason:(state.ready?'✓ Tienes una clave OpenAI guardada de forma permanente para esta cuenta. Puedes sustituirla o eliminarla cuando quieras.':'Todavía no tienes una clave OpenAI guardada.');
   remove.disabled=!state.ready||busy;
  }catch(error){status.textContent=error.message||'No se pudo consultar el estado de la clave.'}
 }
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy||!activeUser)return;const key=input.value.trim();
  if(!/^sk-[A-Za-z0-9_-]{9,}$/.test(key)){status.textContent='La clave no parece tener un formato válido de OpenAI.';return}
  setBusy(true);status.textContent='Validando y guardando tu clave cifrada…';
  try{await ai.saveKey(db,key);input.value='';status.textContent='✓ Clave validada y guardada. Permanecerá en tu cuenta hasta que la sustituyas o elimines.'}
  catch(error){input.value='';status.textContent=error.message||'No se pudo guardar la clave.'}
  finally{setBusy(false);await refresh()}
 });
 remove.addEventListener('click',async()=>{
  if(busy||!activeUser)return;if(!confirm('¿Eliminar definitivamente tu clave OpenAI guardada?'))return;
  setBusy(true);status.textContent='Eliminando tu clave…';
  try{await ai.deleteKey(db);input.value='';status.textContent='Tu clave OpenAI se ha eliminado.'}
  catch(error){status.textContent=error.message||'No se pudo eliminar la clave.'}
  finally{setBusy(false);await refresh()}
 });
 db.auth.onAuthStateChange(event=>{if(event==='SIGNED_IN'||event==='SIGNED_OUT'||event==='USER_UPDATED')Promise.resolve().then(refresh)});
 void refresh();
})();