/* Vocabulary Battle · paso 1: interfaz y puerta de autenticación.
   No habilitar creación real hasta desplegar RPC y RLS del juego. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const params=new URLSearchParams(location.search);
const invite=params.get('room')||params.get('code');
if(invite && /^[a-z0-9-]{3,30}$/i.test(invite)) $('battleCode').value=invite.toUpperCase();
const setStatus=(id,message)=>{$(id).textContent=message};
async function init(){
  const db=window.eeDb;
  if(!db){setStatus('authStatus','No se ha podido conectar con la cuenta de Easy English.');return;}
  try{
    const {data:{user},error}=await db.auth.getUser();
    if(error)throw error;
    $('authStatus').textContent=user?'Sesión iniciada. Puedes configurar tu sala.':'Necesitas una cuenta para organizar una sala.';
    $('loginNotice').hidden=!!user;
    $('battleCreateForm').hidden=!user;
  }catch{setStatus('authStatus','No se pudo comprobar tu sesión. Inténtalo de nuevo.');$('loginNotice').hidden=false}
}
$('battleCreateForm').addEventListener('submit',e=>{
e.preventDefault();
setStatus('createMessage','La configuración está preparada. La creación real se activará cuando estén instaladas las tablas y las funciones seguras de Supabase.');
});
$('battleJoinForm').addEventListener('submit',e=>{
e.preventDefault();
setStatus('joinMessage','Solicitud preparada. Aún falta conectar el sistema de invitaciones y aprobación del anfitrión en Supabase.');
});
init();
})();