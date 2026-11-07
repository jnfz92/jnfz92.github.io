(()=>{'use strict';
const API='https://wnluofonzteaqtlfshgy.supabase.co/rest/v1/';
const KEY='sb_publishable_Ef-AXAapcwaPExEFS6kmug_tKLaulM8';
const PAGE_SIZE=36;
const $=id=>document.getElementById(id);
const els={search:$('phraseSearch'),movie:$('movieFilter'),tense:$('tenseFilter'),reset:$('resetMovieFilters'),count:$('phraseResults'),grid:$('moviePhrasesGrid'),status:$('moviePhrasesStatus'),pagination:$('moviePhrasesPagination'),prev:$('previousPhrases'),next:$('nextPhrases'),pageLabel:$('phrasePageLabel'),phraseCount:$('moviePhraseCount'),movieCount:$('movieCount'),tenseCount:$('tenseCount')};
let rows=[],filtered=[],page=1;
const labels=row=>(row.tense_labels||'').split(';').map(x=>x.trim()).filter(Boolean);
const unique=values=>[...new Set(values)].sort((a,b)=>a.localeCompare(b,'en'));
const escapeText=value=>String(value??'');
function addOptions(select,values,firstLabel){select.replaceChildren();const first=document.createElement('option');first.value='all';first.textContent=firstLabel;select.append(first);values.forEach(value=>{const option=document.createElement('option');option.value=value;option.textContent=value;select.append(option)})}
function makeTag(text){const tag=document.createElement('span');tag.className='ee-phrase-tag';tag.textContent=text;return tag}
function makeCard(row){
 const card=document.createElement('article');card.className='ee-phrase-card';
 const meta=document.createElement('div');meta.className='ee-phrase-meta';
 const number=document.createElement('span');number.className='ee-phrase-number';number.textContent='Frase #'+row.subtitle_number;
 const movie=document.createElement('span');movie.textContent=row.movie_title||row.movie_slug;meta.append(number,movie);
 const phrase=document.createElement('p');phrase.className='ee-phrase-text';phrase.textContent=row.phrase;
 const tags=document.createElement('div');tags.className='ee-phrase-tags';labels(row).forEach(label=>tags.append(makeTag(label)));
 const time=document.createElement('div');time.className='ee-phrase-time';time.textContent=row.timecode||'Marca de tiempo no disponible';
 card.append(meta,phrase,tags,time);return card;
}
function applyFilters(){
 const query=els.search.value.trim().toLocaleLowerCase();
 const movie=els.movie.value,tense=els.tense.value;
 filtered=rows.filter(row=>{
  if(movie!=='all'&&row.movie_slug!==movie)return false;
  const rowLabels=labels(row);
  if(tense!=='all'&&!rowLabels.includes(tense))return false;
  if(query&&![(row.phrase||''),(row.movie_title||''),(row.tense_labels||'')].join(' ').toLocaleLowerCase().includes(query))return false;
  return true;
 });
 page=1;render();
}
function render(){
 const total=filtered.length,pages=Math.max(1,Math.ceil(total/PAGE_SIZE));
 const start=(page-1)*PAGE_SIZE,visible=filtered.slice(start,start+PAGE_SIZE);
 els.grid.replaceChildren(...visible.map(makeCard));
 els.count.textContent=total.toLocaleString('es-ES')+' frase'+(total===1?'':'s')+' encontrada'+(total===1?'':'s');
 els.pagination.hidden=total===0;
 els.prev.disabled=page<=1;els.next.disabled=page>=pages;
 els.pageLabel.textContent='Página '+page+' de '+pages;
 if(!total){els.status.hidden=false;els.status.textContent=rows.length?'No hay frases que coincidan con esos filtros. Prueba con otra búsqueda.':'Todavía no se han importado frases en esta biblioteca.'}
 else{els.status.hidden=true}
}
async function loadRows(){
 try{
  const all=[];let from=0,batchSize=1000;
  while(true){
   const to=from+batchSize-1;
   const url=API+'movie_subtitle_phrases?select=id,movie_slug,movie_title,subtitle_number,timecode,phrase,tense_labels,notes&order=movie_title.asc,subtitle_number.asc';
   const response=await fetch(url,{headers:{apikey:KEY,Authorization:'Bearer '+KEY,Accept:'application/json','Range':from+'-'+to,'Range-Unit':'items'},cache:'no-store'});
   if(!response.ok)throw new Error('Supabase respondió con HTTP '+response.status);
   const batch=await response.json();if(!Array.isArray(batch))throw new Error('La respuesta de Supabase no tiene el formato esperado');
   all.push(...batch);if(batch.length<batchSize)break;from+=batchSize;
  }
  rows=all;
  const movies=[...new Map(rows.map(row=>[row.movie_slug,row.movie_title||row.movie_slug])).entries()].sort((a,b)=>a[1].localeCompare(b[1],'es'));
  const tenses=unique(rows.flatMap(labels));
  els.movie.replaceChildren();
  const allMovies=document.createElement('option');allMovies.value='all';allMovies.textContent='Todas las películas';els.movie.append(allMovies);
  movies.forEach(([slug,title])=>{const option=document.createElement('option');option.value=slug;option.textContent=title;els.movie.append(option)});
  addOptions(els.tense,tenses,'Todos los tiempos verbales');
  els.phraseCount.textContent=rows.length.toLocaleString('es-ES');
  els.movieCount.textContent=movies.length.toLocaleString('es-ES');
  els.tenseCount.textContent=tenses.length.toLocaleString('es-ES');
  els.status.hidden=rows.length>0;
  if(!rows.length)els.status.textContent='La conexión con Supabase funciona, pero todavía no hay frases importadas.';
  applyFilters();
 }catch(error){
  console.error('Error al cargar frases de películas:',error);
  els.status.hidden=false;els.status.textContent='No se ha podido cargar la biblioteca. Comprueba la conexión con Supabase e inténtalo de nuevo.';
  els.count.textContent='No se pudo consultar el catálogo';
  els.phraseCount.textContent='—';els.movieCount.textContent='—';els.tenseCount.textContent='—';
 }
}
els.search.addEventListener('input',applyFilters);
els.movie.addEventListener('change',applyFilters);
els.tense.addEventListener('change',applyFilters);
els.reset.addEventListener('click',()=>{els.search.value='';els.movie.value='all';els.tense.value='all';applyFilters()});
els.prev.addEventListener('click',()=>{if(page>1){page--;render();window.scrollTo({top:els.grid.getBoundingClientRect().top+window.scrollY-110,behavior:'smooth'})}});
els.next.addEventListener('click',()=>{if(page<Math.ceil(filtered.length/PAGE_SIZE)){page++;render();window.scrollTo({top:els.grid.getBoundingClientRect().top+window.scrollY-110,behavior:'smooth'})}});
loadRows();
})();