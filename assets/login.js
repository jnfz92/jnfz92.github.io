/* Iniciar sesión: formulario único, con recuperación de contraseña. */
(()=>{'use strict';
const $=id=>document.getElementById(id),db=window.eeDb;
const query=new URLSearchParams(location.search);
function next(){
 const raw=query.get('next');
 if(!raw)return '/perfil.html';
 try{const url=new URL(raw,location.origin);
  if(url.origin!==location.origin||!url.pathname.endsWith('.html')||
     ['/login.html','/registro.html'].includes(url.pathname))return '/perfil.html';
  return url.pathname+url.search+url.hash;
 }catch{return '/perfil.html'}
}
const destination=next();
$('registerLink').href='/registro.html?next='+encodeURIComponent(destination);
const status=(message,error=false)=>{const el=$('loginStatus');el.textContent=message;el.hidden=!message;el.classList.toggle('is-error',error)};
const readable=e=>{const m=String(e?.message||'');
 if(/invalid login credentials/i.test(m))return 'Correo o contraseña incorrectos.';
 if(/email not confirmed/i.test(m))return 'Confirma tu correo para iniciar sesión.';
 if(/rate limit|too many requests/i.test(m))return 'Demasiados intentos. Prueba más tarde.';
 return m||'No se ha podido completar la operación.';
};
function resetMode(on){
 $('loginForm').hidden=on;
 $('resetForm').hidden=!on;
 $('formTitle').textContent=on?'Recuperar contraseña':'¡Qué bueno verte de nuevo!';
 $('formSubtitle').textContent=on?'Te enviaremos un enlace para elegir una contraseña nueva.':'Inicia sesión para continuar aprendiendo.';
 status('');
}
$('forgotLink').addEventListener('click',()=>{resetMode(true);$('resetEmail').value=$('loginEmail').value});
$('backToLogin').addEventListener('click',()=>resetMode(false));
if(!db){status('No se pudo conectar. Actualiza la página.',true);return}
async function authenticated(){
 const {data,error}=await db.auth.getUser();
 if(error||!data?.user)return false;
 location.replace(destination);return true;
}
authenticated().catch(()=>{});
$('loginForm').addEventListener('submit',async e=>{
 e.preventDefault();if(!e.currentTarget.reportValidity())return;
 const button=$('loginSubmit');button.disabled=true;status('Comprobando tus datos…');
 try{const {error}=await db.auth.signInWithPassword({
   email:$('loginEmail').value.trim().toLowerCase(),password:$('loginPassword').value
  });
  if(error)throw error;
  if(!await authenticated())throw new Error('No se pudo confirmar la sesión.');
 }catch(error){status(readable(error),true)}
 finally{$('loginPassword').value='';button.disabled=false}
});
$('resetForm').addEventListener('submit',async e=>{
 e.preventDefault();if(!e.currentTarget.reportValidity())return;
 const button=$('resetSubmit');button.disabled=true;status('Enviando enlace…');
 try{const {error}=await db.auth.resetPasswordForEmail($('resetEmail').value.trim().toLowerCase(),{
   redirectTo:location.origin+'/perfil.html'
  });
  if(error)throw error;
  status('Si existe una cuenta con ese correo, recibirás el enlace. Revisa también spam.');
 }catch(error){status(readable(error),true)}
 finally{button.disabled=false}
});
})();