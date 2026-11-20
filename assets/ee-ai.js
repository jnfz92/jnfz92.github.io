/* Easy English · BYOK persistente: la clave nunca se guarda en el navegador. */
(()=>{'use strict';
 const PROJECT='https://wnluofonzteaqtlfshgy.supabase.co',configuredUsers=new Set();
 async function request(db,action,payload={},functionName='easy-english-ai'){
  if(!db)throw Error('No se ha conectado tu cuenta de Easy English.');
  const {data:{user},error:userError}=await db.auth.getUser();if(userError||!user)throw Error('Inicia sesión antes de utilizar la IA.');
  const {data:{session},error:sessionError}=await db.auth.getSession();
  if(sessionError||!session?.access_token||session.user.id!==user.id)throw Error('No se pudo validar tu sesión.');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000);
  try{
   const response=await fetch(PROJECT+'/functions/v1/'+functionName,{method:'POST',signal:controller.signal,cache:'no-store',
    headers:{'Content-Type':'application/json','apikey':'sb_publishable_Ef-AXAapcwaPExEFS6kmug_tKLaulM8','Authorization':'Bearer '+session.access_token},
    body:JSON.stringify({action,...payload})});
   let result;try{result=await response.json()}catch{throw Error('No se recibió una respuesta válida del servidor.')}
   if(!response.ok)throw Error(result.error||'No se pudo completar la operación de IA.');return result;
  }catch(err){if(err.name==='AbortError')throw Error('La solicitud ha tardado demasiado. Puedes reintentarlo.');throw err}
  finally{clearTimeout(timer)}
 }
 async function availability(db){
  try{const result=await request(db,'key_status'),{data:{user}}=await db.auth.getUser();
   if(user&&result.configured)configuredUsers.add(user.id);else if(user)configuredUsers.delete(user.id);
   return {ready:!!result.configured,user};
  }catch(error){return {ready:false,reason:error.message,user:null}}
 }
 async function saveKey(db,apiKey){const result=await request(db,'key_save',{apiKey});const {data:{user}}=await db.auth.getUser();if(user)configuredUsers.add(user.id);return result}
 async function deleteKey(db){const result=await request(db,'key_delete');const {data:{user}}=await db.auth.getUser();if(user)configuredUsers.delete(user.id);return result}
 async function run(db,action,payload){
  if(!['writing','plan','speaking_turn','speaking_feedback'].includes(action))throw Error('Función de IA desconocida.');
  const state=await availability(db);if(!state.ready)throw Error(state.reason||'Guarda tu clave OpenAI en tu cuenta antes de utilizar la IA.');
  return (await request(db,action,{consent:true,...payload})).result;
 }
 async function speaking(db,action,payload){if(!['speaking_turn','speaking_feedback'].includes(action))throw Error('Acción de speaking desconocida.');const state=await availability(db);if(!state.ready)throw Error(state.reason||'Guarda tu clave OpenAI en tu perfil.');return (await request(db,action,{consent:true,...payload},'speaking-lab-ai')).result;}\n window.eeAI={keyFor:userId=>configuredUsers.has(userId),availability,saveKey,deleteKey,run,speaking};
})();