/* Acceso centralizado a Easy English. Comparte la sesión de Supabase con Mi perfil. */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const params=new URLSearchParams(location.search);
 const validNext=()=>{
  const raw=params.get('next');
  if(!raw)return '/perfil.html';
  try{const url=new URL(raw,location.origin);
   if(url.origin!==location.origin||!url.pathname.endsWith('.html')||url.pathname==='/login.html')return '/perfil.html';
   return url.pathname+url.search+url.hash;
  }catch{return '/perfil.html'}
 };
 const target=validNext();
 const status=(message,error=false)=>{const node=$('loginStatus');node.textContent=message;node.hidden=!message;node.classList.toggle('is-error',error)};
 const labels={
  login:['¡Qué bueno verte de nuevo!','Inicia sesión para continuar aprendiendo.'],
  register:['Empieza hoy con Easy English.','Crea tu cuenta gratis y guarda tu progreso.'],
  reset:['Recuperar contraseña','Te enviaremos un enlace para elegir una contraseña nueva.']
 };
 const tabs=$('tabLogin'),registerTab=$('tabRegister');
 function mode(which){
  for(const kind of ['login','register','reset'])$(kind+'Form').hidden=kind!==which;
  tabs.setAttribute('aria-selected',String(which==='login'));
  registerTab.setAttribute('aria-selected',String(which==='register'));
  $('formTitle').textContent=labels[which][0];
  $('formSubtitle').textContent=labels[which][1];
  status('');
 }
 tabs.addEventListener('click',()=>mode('login'));
 registerTab.addEventListener('click',()=>mode('register'));
 $('forgotLink').addEventListener('click',()=>{mode('reset');$('resetEmail').value=$('loginEmail').value});
 $('backToLogin').addEventListener('click',()=>mode('login'));
 const friendly=(e)=>{
  const text=String(e?.message||'');
  if(/invalid login credentials/i.test(text))return 'Correo o contraseña incorrectos.';
  if(/email not confirmed/i.test(text))return 'Confirma tu correo antes de entrar. Revisa también spam.';
  if(/rate limit|too many requests/i.test(text))return 'Demasiados intentos. Prueba de nuevo más tarde.';
  if(/already registered|already exists/i.test(text))return 'Este correo ya tiene una cuenta. Prueba a iniciar sesión.';
  return text||'Se ha producido un error. Inténtalo de nuevo.';
 };
 const db=window.eeDb;
 if(!db){status('No se pudo conectar con el acceso. Actualiza la página.',true);return}
 const busy=(id,on)=>{$(id).disabled=on};
 async function redirectIfValid(){
  const {data,error}=await db.auth.getUser();
  if(error||!data?.user)return false;
  location.replace(target);
  return true;
 }
 // También detecta una sesión ya activa, sin solicitar otra contraseña.
 redirectIfValid().catch(()=>{});
 $('loginForm').addEventListener('submit',async event=>{
  event.preventDefault();
  const form=event.currentTarget;if(!form.reportValidity())return;
  busy('loginSubmit',true);status('Verificando tus datos…');
  try{
   const {error}=await db.auth.signInWithPassword({
    email:$('loginEmail').value.trim().toLowerCase(),password:$('loginPassword').value
   });
   if(error)throw error;
   const verified=await redirectIfValid();
   if(!verified)throw new Error('No se pudo confirmar la sesión. Inténtalo de nuevo.');
  }catch(e){status(friendly(e),true)}
  finally{$('loginPassword').value='';busy('loginSubmit',false)}
 });
 $('registerForm').addEventListener('submit',async event=>{
  event.preventDefault();
  const form=event.currentTarget;if(!form.reportValidity())return;
  const password=$('registerPassword').value;
  if(password!==$('registerConfirmation').value){
   status('Las contraseñas no coinciden.',true);$('registerConfirmation').focus();return;
  }
  busy('registerSubmit',true);status('Creando tu cuenta…');
  try{
   const {data,error}=await db.auth.signUp({
    email:$('registerEmail').value.trim().toLowerCase(),password,
    options:{emailRedirectTo:location.origin+'/perfil.html'}
   });
   if(error)throw error;
   if(data?.session){await redirectIfValid()}
   else{status('Registro recibido. Revisa tu correo y confirma tu cuenta para poder entrar. Comprueba también spam.');mode('login');status('Registro recibido. Revisa tu correo y confirma tu cuenta para poder entrar. Comprueba también spam.')}
  }catch(e){status(friendly(e),true)}
  finally{$('registerPassword').value='';$('registerConfirmation').value='';busy('registerSubmit',false)}
 });
 $('resetForm').addEventListener('submit',async event=>{
  event.preventDefault();if(!event.currentTarget.reportValidity())return;
  busy('resetSubmit',true);status('Enviando el enlace…');
  try{
   const {error}=await db.auth.resetPasswordForEmail($('resetEmail').value.trim().toLowerCase(),{
    redirectTo:location.origin+'/perfil.html'
   });
   if(error)throw error;
   status('Si existe una cuenta con ese correo, recibirás un enlace para cambiar la contraseña. Revisa también spam.');
  }catch(e){status(friendly(e),true)}
  finally{busy('resetSubmit',false)}
 });
 if(params.get('modo')==='registro')mode('register');
})();
