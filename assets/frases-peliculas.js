(()=>{'use strict';
const API='https://wnluofonzteaqtlfshgy.supabase.co/rest/v1/';
const KEY='sb_publishable_Ef-AXAapcwaPExEFS6kmug_tKLaulM8';
const PAGE_SIZE=36;
const $=id=>document.getElementById(id);
const els={search:$('phraseSearch'),movie:$('movieFilter'),tense:$('tenseFilter'),reset:$('resetMovieFilters'),count:$('phraseResults'),grid:$('moviePhrasesGrid'),status:$('moviePhrasesStatus'),pagination:$('moviePhrasesPagination'),prev:$('previousPhrases'),next:$('nextPhrases'),pageLabel:$('phrasePageLabel'),categoryStats:$('movieCategoryStats'),phraseCount:$('moviePhraseCount'),movieCount:$('movieCount'),tenseCount:$('tenseCount')};
let rows=[],filtered=[],page=1;
const normalizeCategory=value=>{
 const clean=value.trim();
 if(/^(fragment\\s*\\/\\s*other|fragmento\\s*\\/)/i.test(clean))return 'Fragment / Other';
 if(/^modal verbs?$/i.test(clean))return 'Modal Verbs';
 return clean;
};
const labels=row=>[...new Set((row.tense_labels||'').split(/[;,]/).map(normalizeCategory).filter(Boolean))];
const unique=values=>[...new Set(values)].sort((a,b)=>a.localeCompare(b,'en'));
function addOptions(select,values,firstLabel){select.replaceChildren();const first=document.createElement('option');first.value='all';first.textContent=firstLabel;select.append(first);values.forEach(value=>{const option=document.createElement('option');option.value=value;option.textContent=value;select.append(option)})}
function renderCategoryStats(movies){
 const totals=new Map(),byMovie=new Map();
 rows.forEach(row=>{
  const movie=row.movie_slug;
  labels(row).forEach(category=>{
   totals.set(category,(totals.get(category)||0)+1);
   if(!byMovie.has(category))byMovie.set(category,new Map());
   const counts=byMovie.get(category);counts.set(movie,(counts.get(movie)||0)+1);
  });
 });
 const categories=[...totals.keys()].sort((a,b)=>totals.get(b)-totals.get(a)||a.localeCompare(b,'en'));
 const table=document.createElement('table');table.className='ee-category-table';
 const thead=document.createElement('thead'),head=document.createElement('tr');
 ['Categoría','Total',...movies.map(movie=>movie[1])].forEach((label,index)=>{const th=document.createElement('th');th.scope='col';th.textContent=label;head.append(th)});
 thead.append(head);table.append(thead);
 const tbody=document.createElement('tbody');
 categories.forEach(category=>{
  const tr=document.createElement('tr');
  const name=document.createElement('td');name.textContent=category;tr.append(name);
  const total=document.createElement('td');total.className='ee-category-total';total.textContent=totals.get(category).toLocaleString('es-ES');tr.append(total);
  movies.forEach(([slug])=>{const td=document.createElement('td');td.textContent=(byMovie.get(category)?.get(slug)||0).toLocaleString('es-ES');tr.append(td)});
  tbody.append(tr);
 });
 table.append(tbody);els.categoryStats.replaceChildren(table);
}
function makeRow(row){
 const tr=document.createElement('tr');
 const add=(value,cls)=>{const td=document.createElement('td');td.className=cls||'';td.textContent=value??'';tr.append(td)};
 add(row.subtitle_number,'ee-table-number');
 add(row.movie_title||row.movie_slug,'ee-table-movie');
 add(row.phrase,'ee-table-phrase');
 add(row.translation_es||'No disponible en esta ficha','ee-table-translation');
 add(row.timecode||'—','ee-table-time');
 const td=document.createElement('td');td.className='ee-table-tenses';
 labels(row).forEach(label=>{const tag=document.createElement('span');tag.className='ee-phrase-tag';tag.textContent=label;td.append(tag)});
 tr.append(td);
 add(row.learning_note_es||'No hay explicación gramatical disponible para esta frase.','ee-table-note');
 return tr;
}
function applyFilters(){
 const query=els.search.value.trim().toLocaleLowerCase();
 const movie=els.movie.value,tense=els.tense.value;
 filtered=rows.filter(row=>{
  if(movie!=='all'&&row.movie_slug!==movie)return false;
  const rowLabels=labels(row);
  if(tense!=='all'&&!rowLabels.includes(tense))return false;
  if(query&&![(row.phrase||''),(row.translation_es||''),(row.learning_note_es||''),(row.movie_title||''),(row.tense_labels||'')].join(' ').toLocaleLowerCase().includes(query))return false;
  return true;
 });
 page=1;render();
}
function render(){
 const total=filtered.length,pages=Math.max(1,Math.ceil(total/PAGE_SIZE));
 const start=(page-1)*PAGE_SIZE,visible=filtered.slice(start,start+PAGE_SIZE);
 const table=document.createElement('table');table.className='ee-phrases-table';
 const thead=document.createElement('thead'),headRow=document.createElement('tr');
 ['N.º','Película','Frase original en inglés','Traducción al español','Código de tiempo','Tiempo / construcción verbal','Explicación gramatical'].forEach(label=>{const th=document.createElement('th');th.scope='col';th.textContent=label;headRow.append(th)});
 thead.append(headRow);table.append(thead);
 const tbody=document.createElement('tbody');visible.forEach(row=>tbody.append(makeRow(row)));table.append(tbody);
 els.grid.replaceChildren(table);
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
   const url=API+'movie_subtitle_phrases?select=id,movie_slug,movie_title,subtitle_number,timecode,phrase,tense_labels,notes,translation_es,learning_note_es&order=movie_title.asc,subtitle_number.asc';
   const response=await fetch(url,{headers:{apikey:KEY,Authorization:'Bearer '+KEY,Accept:'application/json','Range':from+'-'+to,'Range-Unit':'items'},cache:'no-store'});
   if(!response.ok)throw new Error('Supabase respondió con HTTP '+response.status);
   const batch=await response.json();if(!Array.isArray(batch))throw new Error('La respuesta de Supabase no tiene el formato esperado');
   all.push(...batch);if(batch.length<batchSize)break;from+=batchSize;
  }
  rows=all;
  const movies=[...new Map(rows.map(row=>[row.movie_slug,row.movie_title||row.movie_slug])).entries()].sort((a,b)=>a[1].localeCompare(b[1],'es'));
  const tenses=unique(rows.flatMap(labels));
  renderCategoryStats(movies);
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
  els.phraseCount.textContent='—';els.movieCount.textContent='—';els.tenseCount.textContent='—';if(els.categoryStats)els.categoryStats.textContent='No se ha podido calcular el recuento.';
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