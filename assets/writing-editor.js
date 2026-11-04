(()=>{'use strict';
const $=id=>document.getElementById(id), db=window.eeDb;
const type=$('wtipo'),title=$('wtitulo'),body=$('wtexto'),list=$('wlista'),count=$('wcount'),status=$('westado');
let user=null,currentId=null,dirty=false;
const GUEST_DRAFT='ee:writing-login-draft:v1',DRAFT_TTL=60*60*1000;
const destination='/writings.html#editor';
function draftSnapshot(){try{sessionStorage.setItem(GUEST_DRAFT,JSON.stringify({time:Date.now(),type:type.value,title:title.value,body:body.value}))}catch(e){message('No se pudo guardar temporalmente el texto. Cópialo antes de salir.');return false}return true}
function restoreDraft(){try{const raw=sessionStorage.getItem(GUEST_DRAFT);if(!raw)return;const data=JSON.parse(raw);
 if(!data||Date.now()-data.time>DRAFT_TTL){sessionStorage.removeItem(GUEST_DRAFT);return}
 if(!['essay','article','review','email_informal','email_formal','report','story'].includes(data.type))return;
 type.value=data.type;title.value=String(data.title||'Mi writing B2').slice(0,120);body.value=String(data.body||'').slice(0,15000);
 sessionStorage.removeItem(GUEST_DRAFT);dirty=true;updateCount();message('Hemos recuperado tu texto de esta pestaña. Revisa y pulsa Guardar borrador.');
 }catch(e){console.warn('No se pudo recuperar el writing',e)}}
function guestNotice(){const n=$('writingLoginNotice');if(n)n.hidden=!!user}
function gotoAccess(path){if(!draftSnapshot())return;dirty=false;location.assign(path+'?next='+encodeURIComponent(destination))}
$('writingLoginLink')?.addEventListener('click',e=>{e.preventDefault();gotoAccess('/login.html')});
$('writingRegisterLink')?.addEventListener('click',e=>{e.preventDefault();gotoAccess('/registro.html')});
const words=()=>body.value.trim()?body.value.trim().split(/\s+/u).length:0;
function updateCount(){const n=words();count.textContent=n+' palabras · '+(n<140?'faltan '+(140-n)+' para el mínimo':n>190?'sobran '+(n-190)+' sobre el máximo':'dentro del rango de 140–190');count.style.color=n>=140&&n<=190?'#1e5eff':'#9b5c10'}
function message(s){status.textContent=s}
function reset(){currentId=null;title.value='Mi writing B2';body.value='';type.value='essay';list.value='';dirty=false;updateCount();message(user?'Nuevo borrador sin guardar.':'Puedes escribir y revisar gratis. Para guardar necesitarás iniciar sesión.')}
async function load(){if(!user)return;const {data,error}=await db.from('writing_borradores').select('id,titulo,tipo,contenido,actualizado_en').eq('usuario_id',user.id).order('actualizado_en',{ascending:false}).limit(100);if(error){message('No se pudieron cargar los borradores: '+error.message);return}list.replaceChildren(new Option('Nuevo writing',''));for(const row of data){const opt=new Option(row.titulo+' · '+new Date(row.actualizado_en).toLocaleDateString('es-ES'),row.id);list.add(opt)}if(currentId)list.value=currentId;window.eeWritingRows=data}
async function save(){if(!user){gotoAccess('/login.html');return}const nombre=title.value.trim()||'Mi writing B2';const payload={usuario_id:user.id,tipo:type.value,titulo:nombre,contenido:body.value};$('wguardar').disabled=true;message('Guardando…');try{let result;if(currentId){result=await db.from('writing_borradores').update(payload).eq('id',currentId).eq('usuario_id',user.id).select('id').single()}else{result=await db.from('writing_borradores').insert(payload).select('id').single()}if(result.error)throw result.error;currentId=result.data.id;dirty=false;await load();message('Borrador guardado en tu cuenta.')}catch(e){message('No se ha guardado: '+e.message)}finally{$('wguardar').disabled=false}}
async function remove(){if(!currentId){reset();return}if(!user||!confirm('¿Eliminar definitivamente este borrador?'))return;const {error}=await db.from('writing_borradores').delete().eq('id',currentId).eq('usuario_id',user.id);if(error){message('No se pudo eliminar: '+error.message);return}reset();await load();message('Borrador eliminado.')}
for(const field of [type,title,body])field.addEventListener('input',()=>{dirty=true;updateCount()});
list.addEventListener('change',()=>{if(dirty&&!confirm('Hay cambios sin guardar. ¿Descartarlos?')){list.value=currentId||'';return}const row=(window.eeWritingRows||[]).find(x=>x.id===list.value);if(!row){reset();return}currentId=row.id;title.value=row.titulo;type.value=row.tipo;body.value=row.contenido;dirty=false;updateCount();message('Borrador cargado. Puedes editarlo y guardarlo.')});
$('wguardar').addEventListener('click',save);$('wnuevo').addEventListener('click',()=>{if(dirty&&!confirm('¿Descartar los cambios no guardados?'))return;reset()});$('wborrar').addEventListener('click',remove);
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});
updateCount();
if(!db){message('No se ha podido conectar con Supabase.');return}
(async()=>{
 let current=null;
 try{const {data,error}=await db.auth.getUser();if(error&&error.name!=='AuthSessionMissingError')throw error;current=data?.user||null}
 catch(e){message('No se pudo verificar tu sesión. Puedes seguir escribiendo y revisar el texto localmente.');return}
 user=current;guestNotice();
 $('wborrar').disabled=!user;
 if(!user){message('Puedes escribir y revisar gratis. Inicia sesión para guardar en tu cuenta.');return}
 message('Sesión iniciada. Tus borradores son privados.');await load();
})().finally(restoreDraft);
})();