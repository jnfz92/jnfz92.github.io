(()=>{'use strict';
const API='https://wnluofonzteaqtlfshgy.supabase.co/rest/v1/';
const KEY='sb_publishable_Ef-AXAapcwaPExEFS6kmug_tKLaulM8';
const host=document.getElementById('ee-favorites-list');
if(!host)return;
const status=document.getElementById('ee-favorites-status');
const login=document.getElementById('ee-favorites-login');
const empty=document.getElementById('ee-favorites-empty');
const card=(a)=>{
 const item=document.createElement('article');item.className='card';
 const h=document.createElement('h2');h.textContent=a.titulo||a.slug;
 const p=document.createElement('p');p.textContent=a.descripcion||'Artículo guardado en tus favoritos.';
 const link=document.createElement('a');link.className='read';link.href='/leer.html?slug='+encodeURIComponent(a.slug);link.textContent='Leer artículo →';
 const remove=document.createElement('button');remove.type='button';remove.textContent='★ Quitar de favoritos';remove.className='ee-favorite-remove';
 remove.addEventListener('click',async()=>{
  remove.disabled=true;
  const {error}=await window.eeDb.from('favoritos_articulos').delete().eq('articulo_slug',a.slug);
  if(error){status.textContent='No se pudo quitar el favorito. Inténtalo de nuevo.';remove.disabled=false;return}
  item.remove();status.textContent='Artículo quitado de tus favoritos.';
  if(!host.children.length)empty.hidden=false;
 });
 item.append(h,p,link,remove);return item;
};
async function init(){
 try{
  const {data:{session},error:authError}=await window.eeDb.auth.getSession();
  if(authError)throw authError;
  if(!session){status.textContent='Inicia sesión para ver los artículos que has guardado.';login.hidden=false;return}
  const {data:saved,error}=await window.eeDb.from('favoritos_articulos').select('articulo_slug,creado_en').order('creado_en',{ascending:false});
  if(error)throw error;
  if(!saved?.length){status.textContent='Todavía no has guardado artículos.';empty.hidden=false;return}
  const slugs=saved.map(x=>x.articulo_slug);
  const {data:articles,error:articleError}=await window.eeDb.from('articulos_catalogo').select('slug,titulo,descripcion').in('slug',slugs);
  if(articleError)throw articleError;
  const bySlug=new Map((articles||[]).map(a=>[a.slug,a]));
  for(const savedItem of saved){const a=bySlug.get(savedItem.articulo_slug);if(a)host.append(card(a))}
  if(!host.children.length)empty.hidden=false;
  status.textContent=host.children.length+' artículo(s) guardado(s).';
 }catch(error){console.error(error);status.textContent='No se pudieron cargar tus favoritos. Recarga la página e inténtalo de nuevo.'}
}
if(window.eeDb)init();else window.addEventListener('load',()=>window.eeDb&&init(),{once:true});
})();