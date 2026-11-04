/* Easy English · Solo habilita IA para una sesión autenticada con clave temporal. */
(()=>{'use strict';
 const STORAGE_KEY='easyenglish:openai:temporary:v1';
 const PROJECT='https://wnluofonzteaqtlfshgy.supabase.co';
 function keyFor(userId){
   if(!userId)return null;
   try{
     const record=JSON.parse(sessionStorage.getItem(STORAGE_KEY)||'null');
     if(!record||typeof record.apiKey!=='string'||record.userId!==userId||
        !Number.isFinite(record.expiresAt)||record.expiresAt<=Date.now()||
        record.expiresAt>Date.now()+1800000+10000){
       if(record)sessionStorage.removeItem(STORAGE_KEY);
       return null;
     }
     return record.apiKey;
   }catch{return null}
 }
 async function availability(db){
   if(!db)return {ready:false,reason:'No se ha conectado la cuenta.'};
   const {data,error}=await db.auth.getUser();
   const user=error?null:data?.user;
   if(!user)return {ready:false,reason:'Debes iniciar sesión.',user:null};
   return {ready:!!keyFor(user.id),reason:'Configura tu clave temporal de OpenAI.',user};
 }
 async function run(db,action,payload){
   if(!['writing','plan'].includes(action))throw Error('Función de IA desconocida.');
   const {data:{user},error}=await db.auth.getUser();
   if(error||!user)throw Error('Inicia sesión antes de utilizar la IA.');
   const key=keyFor(user.id);
   if(!key)throw Error('La clave de OpenAI no está guardada o ha caducado. Configúrala en tu perfil.');
   const {data:{session},error:sessionError}=await db.auth.getSession();
   if(sessionError||!session?.access_token||session.user.id!==user.id)throw Error('No se pudo validar tu sesión.');
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000);
   try{
     const response=await fetch(PROJECT+'/functions/v1/easy-english-ai',{
       method:'POST',signal:controller.signal,cache:'no-store',
       headers:{'Content-Type':'application/json','apikey':'sb_publishable_Ef-AXAapcwaPExEFS6kmug_tKLaulM8','Authorization':'Bearer '+session.access_token},
       body:JSON.stringify({action,apiKey:key,consent:true,...payload})
     });
     let result;try{result=await response.json()}catch{throw Error('No se recibió una respuesta válida del servidor.')}
     if(!response.ok)throw Error(result.error||'No se pudo completar la solicitud de IA.');
     if(!result.result||typeof result.result!=='object')throw Error('La respuesta de OpenAI no es válida.');
     return result.result;
   }catch(err){if(err.name==='AbortError')throw Error('La solicitud ha tardado demasiado. Puedes reintentarlo.');throw err}
   finally{clearTimeout(timer)}
 }
 window.eeAI={keyFor,availability,run};
})();
