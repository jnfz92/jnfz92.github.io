/* Fuente de artículos: Supabase. El HTML del repositorio ya no contiene /post/. */
(()=>{'use strict';
const API='https://wnluofonzteaqtlfshgy.supabase.co/rest/v1/';
const KEY='sb_publishable_Ef-AXAapcwaPExEFS6kmug_tKLaulM8';
const categoryPage=location.pathname.includes('/category/');
const page=location.pathname.split('/').pop();
const group={'grammar.html':'grammar','lessons.html':'lesson','speaking.html':'speaking','tv-movies.html':'listening','vocabulary.html':'vocabulary'}[page];
const home=document.body.classList.contains('ee-home');
const library=document.body.classList.contains('ee-library')&&!categoryPage;
const grid=document.querySelector(library?'.blog .grid':home?'main .grid':'main .grid');
if(!grid || !(home||library||group))return;
const defaultNames={grammar:'Gramática',vocabulary:'Vocabulario',speaking:'Speaking y Writing',listening:'Listening',lesson:'Lecciones y exámenes'};
const apiFetch=async path=>{const res=await fetch(API+path,{cache:'default',headers:{apikey:KEY,Accept:'application/json'}});if(!res.ok)throw Error('Supabase: '+res.status);return res.json()};
function card(a,names){
 const item=document.createElement('article');item.className='card';const isExam=/^examen-ingles-b1-b2-/.test(a.slug);item.dataset.cat=isExam?'exam':(a.categoria_slug||'lesson');
 const meta=document.createElement('div');meta.className='meta';
 const tag=document.createElement('span');tag.className='tag';tag.textContent=isExam?'Examen':(names[item.dataset.cat]||defaultNames[item.dataset.cat]||'Lección');meta.append(tag);
 if(a.fecha_publicacion){const t=document.createElement('time');t.dateTime=a.fecha_publicacion;t.textContent=new Date(a.fecha_publicacion+'T12:00:00').toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'});meta.append(t)}
 const h=document.createElement('h2');h.textContent=(a.titulo||a.slug).replace(/\s*[·|–-]\s*Easy English\s*$/i,'');
 const p=document.createElement('p');p.textContent=a.descripcion||'Lección de inglés con ejemplos y ejercicios.';
 const link=document.createElement('a');link.className=categoryPage?'button':'read';
 link.href=(categoryPage?'../':'')+'leer.html?slug='+encodeURIComponent(a.slug);link.textContent=isExam?'Hacer examen clásico (sin guardar nota) →':'Leer artículo →';
 item.append(meta,h,p,link);return item;
}
async function load(){
 const categoriesPromise=apiFetch('categorias_blog?select=slug,nombre&order=orden.asc');
 const articles=await apiFetch('articulos?select=slug,titulo,descripcion,categoria_slug,fecha_publicacion&order=fecha_publicacion.desc.nullslast,titulo.asc&limit=1000');
 if(!Array.isArray(articles)||!articles.length)throw Error('Sin artículos en Supabase');
 let names={...defaultNames};
 try{const cats=await categoriesPromise;for(const cat of cats)names[cat.slug]=cat.nombre}catch(e){console.warn('Nombres de categorías de respaldo',e)}
 const shown=group?articles.filter(a=>a.categoria_slug===group&&!(group==='lesson'&&/^examen-ingles-b1-b2-/.test(a.slug))):home?articles.filter(a=>!/^examen-ingles-b1-b2-/.test(a.slug)).slice(0,6):articles;
 grid.replaceChildren(...shown.map(a=>card(a,names)));
 if(!shown.length){const p=document.createElement('p');p.textContent='Todavía no hay artículos en esta categoría.';grid.append(p)}
 if(library)document.dispatchEvent(new Event('easyenglish:articles-loaded'));
}
load().catch(e=>{console.error('No se pudo cargar el blog desde Supabase',e);const p=document.createElement('p');p.setAttribute('role','alert');p.textContent='No se pudo actualizar el catálogo. Se muestran las tarjetas disponibles como respaldo.';grid.before(p);if(library)document.dispatchEvent(new Event('easyenglish:articles-loaded'))});
})();