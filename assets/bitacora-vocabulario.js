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
 const searchEl=$('bitacoraVocabularySearch');
 searchEl.addEventListener('input',()=>{search=searchEl.value;page=1;draw()});
 void load();
})();
