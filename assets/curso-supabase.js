/* Itinerario de Easy English; orden y contenidos editables en Supabase. */
(()=>{'use strict';
const API='https://wnluofonzteaqtlfshgy.supabase.co/rest/v1/';
const KEY='sb_publishable_Ef-AXAapcwaPExEFS6kmug_tKLaulM8';
const container=document.getElementById('courseUnits');
const status=document.getElementById('courseStatus');
if(!container)return;
const get=async path=>{const r=await fetch(API+path,{headers:{apikey:KEY,Accept:'application/json'}});if(!r.ok)throw Error('Supabase HTTP '+r.status);return r.json()};
function text(parent,tag,className,value){
 const n=document.createElement(tag);
 if(className)n.className=className;
 n.textContent=value;parent.append(n);return n;
}
async function load(){
 const [units,links,articles]=await Promise.all([
  get('unidades_curso?select=id,slug,titulo,descripcion,nivel,orden&publicado=eq.true&order=orden.asc&limit=200'),
  get('unidades_articulos?select=unidad_id,articulo_slug,orden&order=orden.asc&limit=1000'),
  get('articulos?select=slug,titulo,descripcion,nivel&order=titulo.asc&limit=1000')
 ]);
 if(!Array.isArray(units)||!units.length)throw Error('Sin unidades');
 const articleMap=new Map(articles.map(a=>[a.slug,a]));
 const byUnit=new Map();
 for(const member of links){
  const list=byUnit.get(member.unidad_id)||[];
  list.push(member);byUnit.set(member.unidad_id,list);
 }
 const fragment=document.createDocumentFragment();
 let total=0;
 for(const u of units){
  const members=(byUnit.get(u.id)||[]).sort((a,b)=>a.orden-b.orden).map(m=>articleMap.get(m.articulo_slug)).filter(Boolean);
  total+=members.length;
  const section=document.createElement('section');section.className='course-unit';
  const header=document.createElement('div');header.className='course-header';
  text(header,'span','course-level',u.nivel==='Sin especificar'?'Nivel por confirmar':u.nivel);
  text(header,'h2','',u.titulo);
  text(header,'p','',u.descripcion||'Sigue estas lecciones en orden.');
  section.append(header);
  if(!members.length){text(section,'p','course-empty','Próximamente habrá contenido en esta unidad.');}
  else{
   const list=document.createElement('ol');list.className='course-lessons';
   for(const a of members){
    const li=document.createElement('li');
    const link=document.createElement('a');link.href='leer.html?slug='+encodeURIComponent(a.slug);
    link.textContent=(a.titulo||a.slug).replace(/\s*[·|–-]\s*Easy English\s*$/i,'');
    li.append(link);
    if(a.descripcion)text(li,'p','course-desc',a.descripcion);
    list.append(li);
   }
   section.append(list);
  }
  fragment.append(section);
 }
 container.replaceChildren(fragment);
 status.textContent=units.length+' unidades y '+total+' lecciones en esta ruta orientativa. Otras lecciones están en la biblioteca.';
}
load().catch(err=>{console.warn('Curso: fallo de carga',err);status.textContent='No se pudo cargar la ruta ahora. Puedes consultar el índice anterior o la biblioteca de artículos.';container.hidden=true;document.getElementById('courseFallback').hidden=false;});
})();