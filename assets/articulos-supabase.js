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
const defaultNames={grammar:'Gramática',vocabulary:'Vocabulario',speaking:'Speaking',writing:'Writing',listening:'Listening',lesson:'Lecciones y lectura',exam:'Exámenes'};
const apiFetch=async path=>{const res=await fetch(API+path,{cache:'default',headers:{apikey:KEY,Accept:'application/json'}});if(!res.ok)throw Error('Supabase: '+res.status);return res.json()};
function card(a,names){
 const item=document.createElement('article');item.className='card';const isExam=/^examen-ingles-b1-b2-/.test(a.slug);item.dataset.cat=isExam?'exam':(a.categoria_slug||'lesson');item.dataset.level=a.nivel||'';
 const meta=document.createElement('div');meta.className='meta';
 const tag=document.createElement('span');tag.className='tag';tag.textContent=isExam?'Examen':(names[item.dataset.cat]||defaultNames[item.dataset.cat]||'Lección');meta.append(tag);
 const lvl=document.createElement('span');lvl.className='tag';lvl.textContent=a.nivel||'Nivel por determinar';meta.append(lvl);
 if(a.fecha_publicacion){const t=document.createElement('time');t.dateTime=a.fecha_publicacion;t.textContent=new Date(a.fecha_publicacion+'T12:00:00').toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'});meta.append(t)}
 const h=document.createElement('h2');h.textContent=(a.titulo||a.slug).replace(/\s*[·|–-]\s*Easy English\s*$/i,'');
 const p=document.createElement('p');p.textContent=a.descripcion||'Lección de inglés con ejemplos y ejercicios.';
 const link=document.createElement('a');link.className=categoryPage?'button':'read';
 link.href=(categoryPage?'../':'')+'leer.html?slug='+encodeURIComponent(a.slug);link.textContent=isExam?'Hacer examen clásico (sin guardar nota) →':'Leer artículo →';
 item.append(meta,h,p,link);return item;
}

const categoryOrder=['lesson','grammar','vocabulary','speaking','writing','listening','exam'];
const curriculum=[
 'leccion-1-saludos','leccion-2-to-be','leccion-3-preguntas','dictionary-word-reference-study','skimming-scanning-reading','protector-of-the-sea-vocabulary-tenses','indice-de-dificultad',
 'estructura-oracion-ingles','imperativo-ingles','preguntas-which-whose-how','respuestas-cortas-ingles','have-vs-have-got-ingles','countable-uncountable-nouns','ortografia-formas-verbales-ingles','50-verbos-irregulares-en-ingles',
 'guia-tiempos-verbales-ingles-presente-pasado-futuro-trucos-examen','todos-los-tiempos-de-presente-en-ingles','stative-verbs','todos-los-tiempos-de-pasado-en-ingles','pasados-vs-present-perfect-simple-continuous','present-perfect-never-yet','todos-los-tiempos-de-futuro-en-ingles','used-to-would-be-used-to-get-used-to',
 'modal-can-could','modal-may','modal-must-have-to','modal-should-ought-to','modal-verb-might','modal-will-would-shall','semimodales-dare-need-ought-to',
 'preguntas-sujeto-objeto','question-tags-ingles','gerund-infinitive','verbos-con-preposiciones-ingles','conditionals-ingles-guia-completa-ejercicios','second-conditional-guia-ejemplos-ejercicios','third-conditional-guia-ejemplos-ejercicios',
 'voz-pasiva-ingles','direct-reported-speech','relative-clauses-guia-completa-b1-b2','linking-words-of-contrast','in-which-y-conectores-adicion-causa-consecuencia','formacion-adjetivos-ingles','ingles-americano-vs-britanico-diferencias-verbos','fichas-tecnicas-gramatica-ingles',
 'past-tenses-ejercicios-resueltos-unidad-2','past-tenses-ejercicios-unidad-2-parte-2','revision-present-past-tenses-20-respuestas-explicadas','word-formation-ejercicios-b1-b2',
 'ingles-dia-a-dia-40-expresiones-utiles','make-vs-do-ingles','get-phrasal-verbs','phrasal-verbs-introduccion-gramatica','phrasal-verbs-particula-out','phrasal-verbs-verbo-take','phrasal-verb-take-off','trying-and-succeeding-phrasal-verbs','vocabulario-viajes-ingles-b1-b2','vocabulario-trafico-autopista-ingles','vocabulario-15-octubre-trabajo-personas','vocabulario-15-octubre-dinero-estudios','vocabulario-15-octubre-vida-cotidiana','vocabulario-ingles-clase-15-octubre-2026','useful-vocabulary-review','pollution-environment-vocabulary','police-and-crime-vocabulary','currently-meaning-use','inspire-people-collocation','revenue-office-supporters',
 'think-before-you-speak','to-be-honest-discourse-marker','expresiones-opiniones-no-quedarte-en-blanco','opinion-speculation-expressions','polite-disagreement','b2-first-speaking-outstanding-people-selfie','speaking-mi-rutina-jueves-fin-de-semana-b1-b2','political-english-vocabulary-debate-phrases','truco-boligrafo-examen-oral-ingles',
 'como-escribir-email-b2-first-fce','como-usar-tiempos-verbales-carta-email-writing-b1-b2','writing-b2-essay-guia','writing-b2-article-guia','writing-b2-review-guia','writing-b2-report-guia','writing-b2-formal-letter-guia','writing-b2-story-guia',
 'entretenimiento','the-rings-of-power-season-1-english-subtitles',
 'examen-ingles-b1-b2-2026-10-09','examen-ingles-b1-b2-2026-10-10','examen-ingles-b1-b2-2026-10-11','examen-ingles-b1-b2-2026-10-12','examen-ingles-b1-b2-2026-10-13'
];
const curriculumRank=new Map(curriculum.map((slug,i)=>[slug,i]));
const levelBounds={'A1-A2':[1,2],'A2-B1':[2,3],'B1-B2':[3,4],'B2':[4,4],'A2-B2':[2,4],'B2-C1':[4,5],'B1-C1':[3,5],'A1':[1,1],'A2':[2,2],'B1':[3,3],'C1':[5,5]};
const levelFloor=a=>(levelBounds[a.nivel]||[6])[0];
const categoryFor=a=>/^examen-ingles-b1-b2-/.test(a.slug)?'exam':a.categoria_slug||'lesson';
const collator=new Intl.Collator('es',{sensitivity:'base',numeric:true});
function compareCurriculum(a,b){
 const cat=categoryOrder.indexOf(categoryFor(a))-categoryOrder.indexOf(categoryFor(b));
 if(cat)return cat;
 const x=curriculumRank.get(a.slug),y=curriculumRank.get(b.slug);
 if(x!==undefined&&y!==undefined)return x-y;
 if(x!==undefined)return -1;
 if(y!==undefined)return 1;
 return levelFloor(a)-levelFloor(b)||collator.compare(a.titulo||a.slug,b.titulo||b.slug);
}
function sortArticles(items,mode){
 return [...items].sort(mode==='recent'
  ? (a,b)=>String(b.fecha_publicacion||'').localeCompare(String(a.fecha_publicacion||''))||collator.compare(a.titulo||a.slug,b.titulo||b.slug)
  :mode==='level'
   ? (a,b)=>levelFloor(a)-levelFloor(b)||compareCurriculum(a,b)
   :compareCurriculum);
}

async function load(){
 const categoriesPromise=home?Promise.resolve([]):apiFetch('categorias_blog?select=slug,nombre&order=orden.asc');
 const articles=await apiFetch('articulos?select=slug,titulo,descripcion,categoria_slug,nivel,fecha_publicacion&order=fecha_publicacion.desc.nullslast,titulo.asc&limit='+(home?25:1000));
 if(!Array.isArray(articles)||!articles.length)throw Error('Sin artículos en Supabase');
 let names={...defaultNames};
 try{const cats=await categoriesPromise;for(const cat of cats)names[cat.slug]=cat.nombre}catch(e){console.warn('Nombres de categorías de respaldo',e)}
 const mode=library?(document.getElementById('articleSort')?.value||'curriculum'):'curriculum';
 const shown=group?sortArticles(articles.filter(a=>a.categoria_slug===group&&!(group==='lesson'&&/^examen-ingles-b1-b2-/.test(a.slug))),'curriculum'):home?sortArticles(articles.filter(a=>!/^examen-ingles-b1-b2-/.test(a.slug)),'recent').slice(0,6):sortArticles(articles,mode);
 grid.replaceChildren(...shown.map(a=>card(a,names)));
 if(!shown.length){const p=document.createElement('p');p.textContent='Todavía no hay artículos en esta categoría.';grid.append(p)}
 if(library){window.easyEnglishSortArticles=(mode)=>{grid.replaceChildren(...sortArticles(articles,mode).map(a=>card(a,names)));document.dispatchEvent(new Event('easyenglish:articles-loaded'))};document.dispatchEvent(new Event('easyenglish:articles-loaded'));}
}
load().catch(e=>{console.error('No se pudo cargar el blog desde Supabase',e);const p=document.createElement('p');p.setAttribute('role','alert');p.textContent='No se pudo actualizar el catálogo. Se muestran las tarjetas disponibles como respaldo.';grid.before(p);if(library)document.dispatchEvent(new Event('easyenglish:articles-loaded'))});
})();