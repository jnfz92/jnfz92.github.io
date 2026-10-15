/* Catálogo público de descargas; las tarjetas HTML siguen disponibles como respaldo. */
(()=>{'use strict';
const API='https://wnluofonzteaqtlfshgy.supabase.co/rest/v1/';
const KEY='sb_publishable_Ef-AXAapcwaPExEFS6kmug_tKLaulM8';
const grid=document.getElementById('downloadGrid'),status=document.getElementById('downloadStatus');
if(!grid||!status)return;
const dateLabel=s=>s?new Date(s+'T12:00:00').toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'}):'Recurso';
function createCard(item){
  const card=document.createElement('article');card.className='card';
  const tag=document.createElement('span');tag.className='tag';tag.textContent=dateLabel(item.fecha_publicacion);
  const h=document.createElement('h2');h.textContent=item.titulo;
  const p=document.createElement('p');p.textContent=item.descripcion||'Material de estudio de Easy English.';
  const download=document.createElement('a');download.className='download';download.textContent='Descargar PDF ↓';
  const path=item.url_archivo||'';
  const resolved=new URL(path,location.href);
  if(!['http:','https:'].includes(resolved.protocol))throw Error('URL de descarga inválida');
  download.href=resolved.href;download.setAttribute('download','');
  card.append(tag,h,p,download);
  if(item.url_lectura){
    const article=new URL(item.url_lectura,location.href);
    if(['http:','https:'].includes(article.protocol)){
      const a=document.createElement('a');a.className='back';a.style.marginTop='12px';
      a.href=article.href;a.textContent='Leer como artículo →';card.append(a);
    }
  }
  return card;
}
async function load(){
  const response=await fetch(API+'recursos_descargables?select=slug,titulo,descripcion,fecha_publicacion,url_archivo,url_lectura&publicado=eq.true&order=orden.asc,fecha_publicacion.desc&limit=1000',{headers:{apikey:KEY,Accept:'application/json'}});
  if(!response.ok)throw Error('Supabase HTTP '+response.status);
  const data=await response.json();
  if(!Array.isArray(data)||data.length===0)throw Error('Catálogo de descargas vacío');
  const cards=data.map(createCard);
  grid.replaceChildren(...cards);
  status.textContent=data.length+' recursos disponibles. Catálogo actualizado desde Supabase.';
}
load().catch(e=>{console.warn('Catálogo de descargas: usando tarjetas HTML de respaldo',e);status.textContent='No se pudo actualizar el catálogo. Mostrando los PDF disponibles como respaldo.'});
})();