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
  count.textContent=filtered.length+' artículo'+(filtered.length===1?'':'s')+' de vocabulario guardados en tu cuenta';
  list.replaceChildren();nav.replaceChildren();
  if(!filtered.length){
   const p=document.createElement('p');p.className='muted';
   p.textContent=loaded?(articles.length?'No hay artículos que coincidan con la búsqueda.':'No tienes artículos de vocabulario guardados en esta cuenta. Tus anotaciones personales están arriba.'): 'Cargando tus artículos…';list.append(p);
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
  count.textContent='Cargando tus artículos privados…';
  list.replaceChildren();
  const {data:{user},error:authError}=await db.auth.getUser();
  if(authError||!user){
   loaded=true;articles=[];count.textContent='Inicia sesión para consultar tus artículos privados.';
   return;
  }
  const {data:saved,error:savedError}=await db.from('recursos_guardados')
   .select('referencia').eq('usuario_id',user.id).eq('tipo','articulo').range(0,999);
  if(savedError){count.textContent='No se pudieron consultar tus artículos guardados.';return}
  const slugs=[...new Set((saved||[]).map(x=>x.referencia).filter(Boolean))];
  if(!slugs.length){loaded=true;articles=[];draw();return}
  const {data,error}=await db.from('articulos')
   .select('slug,titulo,descripcion').eq('categoria_slug','vocabulary').in('slug',slugs).order('titulo',{ascending:true});
  loaded=true;
  if(error){count.textContent='No se pudieron cargar tus artículos privados.';return}
  articles=data||[];
  draw();
 }
 const searchEl=$('bitacoraVocabularySearch');
 searchEl.addEventListener('input',()=>{search=searchEl.value;page=1;draw()});
 void load();
})();
