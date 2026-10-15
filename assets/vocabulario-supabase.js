(()=>{'use strict';
const API='https://wnluofonzteaqtlfshgy.supabase.co/rest/v1/';
const KEY='sb_publishable_Ef-AXAapcwaPExEFS6kmug_tKLaulM8';
const $=id=>document.getElementById(id);
let words=[];
const form=$('vocabularySearch'),cat=$('vocabularyCategory'),status=$('vocabularyStatus'),grid=$('vocabularyItems');
function render(){
 const term=form.value.trim().toLocaleLowerCase('es'),category=cat.value;
 const data=words.filter(v=>(!category||v.categoria===category)&&
 (!term||[v.termino_en,v.traduccion_es,v.categoria,v.ejemplo_en||''].some(x=>x.toLocaleLowerCase('es').includes(term))));
 const fragment=document.createDocumentFragment();
 for(const v of data){
  const card=document.createElement('article');card.className='vocab-card';
  const header=document.createElement('div');header.className='vocab-head';
  const name=document.createElement('h2');name.textContent=v.termino_en;
  const label=document.createElement('span');label.className='vocab-tag';label.textContent=v.categoria;
  header.append(name,label);
  const es=document.createElement('p');es.className='vocab-es';es.textContent=v.traduccion_es;
  const ex=document.createElement('p');ex.className='vocab-example';ex.textContent=v.ejemplo_en||'';
  card.append(header,es,ex);
  fragment.append(card);
 }
 grid.replaceChildren(fragment);
 status.textContent=data.length+' expresiones encontradas de '+words.length+' disponibles.';
}
async function init(){
 const r=await fetch(API+'vocabulario?select=termino_en,traduccion_es,categoria,ejemplo_en&publicado=eq.true&order=orden.asc&limit=1000',{headers:{apikey:KEY,Accept:'application/json'}});
 if(!r.ok)throw Error('Supabase HTTP '+r.status);
 words=await r.json();
 if(!Array.isArray(words)||!words.length)throw Error('No hay vocabulario publicado');
 const cats=[...new Set(words.map(v=>v.categoria))].sort((a,b)=>a.localeCompare(b,'es'));
 for(const c of cats){const opt=document.createElement('option');opt.value=c;opt.textContent=c;cat.append(opt)}
 form.addEventListener('input',render);cat.addEventListener('change',render);
 render();
}
init().catch(err=>{console.warn('No se pudo cargar vocabulario',err);status.textContent='No se pudo cargar el vocabulario en línea. Puedes consultar la lista en PDF.';$('vocabularyFallback').hidden=false;});
})();