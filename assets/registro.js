/* Registro en una página independiente, compartiendo la sesión con Easy English. */
(()=>{'use strict';
const $=id=>document.getElementById(id),db=window.eeDb,query=new URLSearchParams(location.search);
function next(){const raw=query.get('next');if(!raw)return '/perfil.html';try{const url=new URL(raw,location.origin);if(url.origin!==location.origin||!url.pathname.endsWith('.html')||['/login.html','/registro.html'].includes(url.pathname))return '/perfil.html';return url.pathname+url.search+url.hash}catch{return '/perfil.html'}}
const destination=next();$('loginLink').href='/login.html?next='+encodeURIComponent(destination);
const status=(message,error=false)=>{const el=$('loginStatus');el.textContent=message;el.hidden=!message;el.classList.toggle('is-error',error)};
const readable=e=>{const m=String(e?.message||'');if(/rate limit|too many requests/i.test(m))return 'Demasiados intentos. Prueba más tarde.';if(/already registered|already exists/i.test(m))return 'Ese correo ya tiene una cuenta. Inicia sesión.';return m||'No se pudo completar el registro.'};
if(!db){status('No se pudo conectar. Actualiza la página.',true);return}
async function authenticated(){const {data,error}=await db.auth.getSession();if(error||!data?.session?.user)return false;location.replace(destination);return true}
authenticated().catch(()=>{});
$('googleRegister').addEventListener('click',async()=>{const {error}=await db.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+'/login.html?next='+encodeURIComponent(destination)}});if(error)status(readable(error),true)});
$('registerForm').addEventListener('submit',async e=>{
 e.preventDefault();if(!e.currentTarget.reportValidity())return;
 const password=$('registerPassword').value;if(password!==$('registerConfirmation').value){status('Las contraseñas no coinciden.',true);$('registerConfirmation').focus();return}
 const button=$('registerSubmit');button.disabled=true;status('Creando tu cuenta…');
 try{
  const {data,error}=await db.auth.signUp({email:$('registerEmail').value.trim().toLowerCase(),password,options:{emailRedirectTo:location.origin+'/perfil.html'}});
  if(error)throw error;
  const newUser=data?.user;let welcomeSent=false;
  if(newUser?.id && Array.isArray(newUser.identities) && newUser.identities.length>0){
   try{
    const response=await fetch('https://wnluofonzteaqtlfshgy.supabase.co/functions/v1/email-bienvenida',{method:'POST',headers:{apikey:'sb_publishable_Ef-AXAapcwaPExEFS6kmug_tKLaulM8','Content-Type':'application/json'},body:JSON.stringify({type:'welcome_signup',user_id:newUser.id})});
    const result=await response.json();welcomeSent=response.ok&&result?.sent===true;
    if(!welcomeSent)console.error('No se pudo enviar el email de bienvenida:',result?.error||response.status);
   }catch(sendError){console.error('Error enviando bienvenida:',sendError)}
  }
  if(data?.session?.user){location.replace(destination)}else{status(welcomeSent?'Cuenta creada. Te hemos enviado el email de bienvenida y el enlace para confirmar tu cuenta. Revisa tu bandeja de entrada y spam.':'Cuenta creada. Revisa tu correo para confirmar la cuenta. El email de bienvenida no ha podido enviarse ahora.')}
 }catch(error){status(readable(error),true)}finally{$('registerPassword').value='';$('registerConfirmation').value='';button.disabled=false}
});
})();
