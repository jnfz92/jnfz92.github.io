(()=>{'use strict';const $=id=>document.getElementById(id),db=window.eeDb;
let user=null;const msg=t=>$('adminStatus').textContent=t;
const elt=(tag,value,cls)=>{const n=document.createElement(tag);if(value!==undefined)n.textContent=String(value);if(cls)n.className=cls;return n};
function optionButton(label,onClick){const btn=elt('button',label);btn.type='button';btn.onclick=async()=>{
 btn.disabled=true;try{await onClick();msg('Cambio guardado correctamente.')}catch(e){msg('No se pudo guardar: '+e.message)}finally{btn.disabled=false}
};return btn}
async function catalog(table,container,fields){
 const {data,error}=await db.from(table).select(fields).order('id',{ascending:true}).limit(200);
 if(error)throw error;
 const box=$(container);box.replaceChildren();
 if(!data?.length){box.textContent='Todavía no hay contenido.';return}
 for(const item of data){
  const row=elt('div',undefined,'admin-row'),info=elt('div'),label=elt('strong',item.titulo||item.slug),tag=elt('small','ID '+item.id);
  info.append(label,tag);
  const badge=elt('span',item.publicado?'Publicada':'Oculta','admin-chip'+(item.publicado?'':' off'));
  const btn=optionButton(item.publicado?'Ocultar':'Publicar',async()=>{
   const result=await db.from(table).update({publicado:!item.publicado}).eq('id',item.id).select('id,publicado').single();
   if(result.error)throw result.error;item.publicado=result.data.publicado;
   badge.textContent=item.publicado?'Publicada':'Oculta';
   badge.className='admin-chip'+(item.publicado?'':' off');btn.textContent=item.publicado?'Ocultar':'Publicar'
  });
  row.append(info,badge,btn);box.append(row)
 }
}
async function suggestions(){
 const {data,error}=await db.from('sugerencias').select('id,titulo,descripcion,estado').order('id',{ascending:false}).limit(100);
 if(error)throw error;
 const box=$('adminSuggestions');box.replaceChildren();
 if(!data?.length){box.textContent='Sin sugerencias pendientes.';return}
 for(const item of data){
  const row=elt('div',undefined,'admin-row'),info=elt('div');
  info.append(elt('strong',item.titulo),elt('small',item.descripcion.slice(0,300)));
  const select=elt('select');
  ['pendiente','publicada','rechazada'].forEach(val=>{const o=elt('option',val);o.value=val;o.selected=item.estado===val;select.append(o)});
  select.onchange=async()=>{
   const next=select.value;select.disabled=true;
   const r=await db.from('sugerencias').update({estado:next}).eq('id',item.id).select('estado').single();
   if(r.error){select.value=item.estado;msg('Error: '+r.error.message)}else{item.estado=r.data.estado;msg('Sugerencia actualizada.')}
   select.disabled=false
  };row.append(info,select);box.append(row)
 }
}
async function comments(){
 const {data,error}=await db.from('comentarios_articulos').select('id,articulo_slug,contenido,oculto,eliminado').order('id',{ascending:false}).limit(100);
 if(error)throw error;
 const box=$('adminComments');box.replaceChildren();
 if(!data?.length){box.textContent='Sin comentarios.';return}
 for(const item of data){
  const row=elt('div',undefined,'admin-row'),info=elt('div');
  info.append(elt('strong',item.articulo_slug),elt('small',item.eliminado?'Comentario eliminado por su autor':item.contenido.slice(0,200)));
  const btn=optionButton(item.oculto?'Mostrar':'Ocultar',async()=>{
   const r=await db.from('comentarios_articulos').update({oculto:!item.oculto}).eq('id',item.id).select('oculto').single();
   if(r.error)throw r.error;item.oculto=r.data.oculto;btn.textContent=item.oculto?'Mostrar':'Ocultar'
  });
  row.append(info,btn);box.append(row)
 }
}
async function start(){
 const {data,error}=await db.auth.getUser();
 if(error&&error.name!=='AuthSessionMissingError')throw error;
 user=data?.user;
 if(!user){msg('Inicia sesión desde Mi perfil para acceder.');return}
 if(user.app_metadata?.ee_role!=='admin'){msg('Acceso restringido. Tu cuenta no tiene permisos de administración.');return}
 $('adminDashboard').hidden=false;msg('Permisos de administración verificados. Los cambios quedan sujetos a la seguridad de Supabase.');
 const jobs=[
  catalog('unidades_curso','adminUnits','id,slug,titulo,publicado'),
  catalog('actividades','adminActivities','id,slug,titulo,publicado'),
  suggestions(),comments()
 ];
 await Promise.all(jobs.map(p=>p.catch(e=>msg('Error al cargar una sección: '+e.message))))
}
start().catch(e=>msg('No se pudo comprobar la sesión: '+e.message))
})();