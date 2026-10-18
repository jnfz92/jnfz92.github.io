(()=>{'use strict';
const endpoint='https://wnluofonzteaqtlfshgy.supabase.co/functions/v1/newsletter';
const form=document.getElementById('newsletterForm');
const pending=document.getElementById('newsletterPending');
const submit=document.getElementById('newsletterSubmit');
const status=document.getElementById('newsletterStatus');
const tokenPanel=document.getElementById('newsletter-token-section');
const tokenStatus=document.getElementById('newsletterTokenStatus');
const tokenDescription=document.getElementById('newsletterTokenDescription');
const tokenButton=document.getElementById('newsletterTokenButton');
function result(node,message,error=false){
 node.textContent=message;node.className=error?'newsletter-error':'newsletter-success';
}
async function request(body){
 const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify(body)});
 const payload=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(payload.error||'No se pudo completar. Inténtalo de nuevo.');
 return payload;
}
const fragment=new URLSearchParams(location.hash.slice(1));
const confirm=fragment.get('confirm'),baja=fragment.get('baja');
if(confirm||baja){
 history.replaceState(null,'',location.pathname+location.search);
 tokenPanel.hidden=false;
 const isConfirm=!!confirm;
 tokenDescription.textContent=isConfirm?'Confirma que quieres recibir las novedades de Easy English.':'Confirma que quieres dejar de recibir correos.';
 tokenButton.textContent=isConfirm?'Confirmar suscripción':'Darme de baja';
 document.getElementById('newsletter-subscription').hidden=true;
 tokenButton.addEventListener('click',async()=>{
   tokenButton.disabled=true;
   try{
     const [id,signature]=(baja||'').split('.');
     await request(isConfirm?{action:'confirm',token:confirm}:{action:'unsubscribe',id,token:signature});
     result(tokenStatus,isConfirm?'¡Suscripción confirmada! Recibirás los próximos artículos nuevos.':'Te has dado de baja. No recibirás más newsletters.');
     tokenButton.hidden=true;
   }catch(error){result(tokenStatus,error.message,true);tokenButton.disabled=false;}
 });
 document.getElementById('newsletter-subscription').hidden=true;
}
async function check(){
 try{
  const response=await fetch(endpoint,{method:'GET',cache:'no-store'});
  const data=await response.json();
  if(!response.ok||!data.enabled)throw new Error('El newsletter se está preparando. Vuelve pronto para suscribirte.');
  pending.hidden=true;
  if(!confirm&&!baja)form.hidden=false;
 }catch(error){
  result(pending,error.message||'Servicio temporalmente no disponible.',true);
 }
}
form.addEventListener('submit',async event=>{
 event.preventDefault();
 if(!document.getElementById('newsletterConsent').checked)return;
 const email=document.getElementById('newsletterEmail').value.trim().toLowerCase();
 submit.disabled=true;result(status,'Enviando enlace de confirmación…');
 try{
  const response=await request({action:'subscribe',email});
  result(status,response.message||'Revisa tu correo y confirma la suscripción.');
  form.reset();
 }catch(error){result(status,error.message,true);}
 finally{submit.disabled=false;}
});
check();
})();
