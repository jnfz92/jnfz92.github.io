/* Biblioteca permanente de artículos de vocabulario dentro de la bitácora. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const box=$('bitacoraVocabulary');
 if(!box||!window.eeDb)return;
 const db=window.eeDb, pageSize=8;
 let articles=[],page=1,search='',loaded=false;
 const list=$('bitacoraVocabularyItems'),count=$('bitacoraVocabularyCount'),nav=$('bitacoraVocabularyPagination');
 const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 function draw(){
  const filtered=articles.filter(a=>norm([a.titulo,a.descripcion,a.slug].join(' ')).includes(norm(search)));
  const pages=Math.max(1,Math.ceil(filtered.length/pageSize));
  page=Math.min(Math.max(1,page),pages);
  count.textContent=filtered.length+' artículo'+(filtered.length===1?'':'s')+' de vocabulario';
  list.replaceChildren();nav.replaceChildren();
  if(!filtered.length){
   const p=document.createElement('p');p.className='muted';
   p.textContent=loaded?'No hay artículos que coincidan con la búsqueda.':'Cargando artículos de vocabulario…';list.append(p);
  }
  filtered.slice((page-1)*pageSize,page*pageSize).forEach(a=>{
   const card=document.createElement('article');card.className='bitacora-vocab-card';
   const h=document.createElement('h4');h.textContent=a.titulo||a.slug;
   const d=document.createElement('p');d.textContent=a.descripcion||'Artículo de vocabulario en Easy English.';
   const actions=document.createElement('div');actions.className='bitacora-vocab-actions';
   const link=document.createElement('a');link.href='/leer.html?slug='+encodeURIComponent(a.slug);link.textContent='Leer artículo →';link.className='primary';
   const note=document.createElement('button');note.type='button';note.textContent='Añadir mis apuntes';note.className='secondary';
   note.onclick=()=>{
    window.dispatchEvent(new CustomEvent('easyenglish:bitacora-prefill',{detail:{title:a.titulo||a.slug,slug:a.slug}}));
   };
   actions.append(link,note);card.append(h,d,actions);list.append(card);
  });
  nav.hidden=pages<=1;
  if(pages>1){
   const prev=document.createElement('button');prev.type='button';prev.textContent='← Anterior';prev.disabled=page===1;
   const next=document.createElement('button');next.type='button';next.textContent='Siguiente →';next.disabled=page===pages;
   const label=document.createElement('span');label.textContent='Página '+page+' de '+pages;
   prev.onclick=()=>{page--;draw()};next.onclick=()=>{page++;draw()};
   nav.append(prev,label,next);
  }
 }
 async function load(){
  count.textContent='Cargando artículos…';
  const {data,error}=await db.from('articulos').select('slug,titulo,descripcion').eq('categoria_slug','vocabulary').order('titulo',{ascending:true}).range(0,999);
  loaded=true;
  if(error){count.textContent='No se pudieron cargar los artículos de vocabulario.';list.replaceChildren();return}
  articles=(data||[]).filter(a=>a.slug);
  draw();
 }
 const importBtn=$('bitacoraImportVocabulary');
 const importStatus=$('bitacoraImportStatus');
 if(importBtn)importBtn.addEventListener('click',async()=>{
  importBtn.disabled=true;
  importStatus.textContent='Guardando artículos en tu cuenta…';
  try{
   const {data:{user},error:authError}=await db.auth.getUser();
   if(authError||!user)throw Error('Inicia sesión en tu perfil para guardar artículos.');
   if(!loaded||!articles.length)throw Error('Todavía no se ha cargado el vocabulario.');
   const {data:existing,error:existingError}=await db.from('bitacora_anotaciones').select('contenido').eq('usuario_id',user.id).range(0,999);
   if(existingError)throw existingError;
   const saved=new Set((existing||[]).map(n=>String(n.contenido||'').match(/^Artículo de vocabulario: (https?:\/\/\S+)/)?.[1]).filter(Boolean));
   const records=articles.map(a=>({
    usuario_id:user.id,
    contenido:'Artículo de vocabulario: '+location.origin+'/leer.html?slug='+encodeURIComponent(a.slug)+'\n'+(a.titulo||a.slug)
   })).filter(n=>!saved.has(n.contenido.split('\n')[0].slice('Artículo de vocabulario: '.length)));
   if(records.length){
    const {error}=await db.from('bitacora_anotaciones').insert(records);
    if(error)throw error;
    window.dispatchEvent(new Event('easyenglish:bitacora-refresh'));
   }
   importStatus.textContent=records.length?'Guardados '+records.length+' artículos en tus anotaciones. Los demás ya estaban guardados.':'Todos los artículos ya estaban guardados en tus anotaciones.';
  }catch(error){importStatus.textContent='No se pudieron guardar: '+error.message}
  finally{importBtn.disabled=false}
 });
 const searchEl=$('bitacoraVocabularySearch');
 searchEl.addEventListener('input',()=>{search=searchEl.value;page=1;draw()});
 void load();
})();
