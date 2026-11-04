/* Registro en una página independiente, compartiendo la sesión con Easy English. */
(()=>{'use strict';
const $=id=>document.getElementById(id),db=window.eeDb,query=new URLSearchParams(location.search);
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
$('loginLink').href='/login.html?next='+encodeURIComponent(destination);
const status=(message,error=false)=>{const el=$('loginStatus');el.textContent=message;el.hidden=!message;el.classList.toggle('is-error',error)};
const readable=e=>{const m=String(e?.message||'');
 if(/rate limit|too many requests/i.test(m))return 'Demasiados intentos. Prueba más tarde.';
 if(/already registered|already exists/i.test(m))return 'Ese correo ya tiene una cuenta. Inicia sesión.';
 return m||'No se pudo completar el registro.';
};
if(!db){status('No se pudo conectar. Actualiza la página.',true);return}
async function authenticated(){
 const {data,error}=await db.auth.getUser();
 if(error||!data?.user)return false;
 location.replace(destination);return true;
}
authenticated().catch(()=>{});
$('registerForm').addEventListener('submit',async e=>{
 e.preventDefault();if(!e.currentTarget.reportValidity())return;
 const password=$('registerPassword').value;
 if(password!==$('registerConfirmation').value){
  status('Las contraseñas no coinciden.',true);
  $('registerConfirmation').focus();return;
 }
 const button=$('registerSubmit');button.disabled=true;status('Creando tu cuenta…');
 try{
  const {data,error}=await db.auth.signUp({
   email:$('registerEmail').value.trim().toLowerCase(),password,
   options:{emailRedirectTo:location.origin+'/perfil.html'}
  });
  if(error)throw error;
  if(data?.session){
   if(!await authenticated())throw new Error('No se pudo confirmar la sesión.');
  }else{
   status('Solicitud recibida. Revisa tu correo para confirmar la cuenta. Después, inicia sesión.');
  }
 }catch(error){status(readable(error),true)}
 finally{$('registerPassword').value='';$('registerConfirmation').value='';button.disabled=false}
});
})();