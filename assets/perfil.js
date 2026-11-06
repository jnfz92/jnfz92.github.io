/* Lógica de la cuenta, inicio de sesión, lecturas y progreso del perfil. */
(()=>{
'use strict';
const $=id=>document.getElementById(id), key='easyEnglish.blogProfile.v1';
let user=null,articles=[],articleView='all',loading=false,articlesLoaded=false,cloudUserId=null,suggestedHref=null;
let savedFavorites=new Set(),favoritesReady=false;
let achievementProgress={reads:null,course:null,exams:null,streak:null};
const READING_PAGE_SIZE=10;

function profilePaginate(root,items,pageSize=8){
 if(!root)return;
 root.parentElement?.querySelectorAll(':scope > .profile-list-pagination').forEach(old=>old.remove());
 let page=1;
 const nav=document.createElement('nav');nav.className='profile-list-pagination';
 nav.setAttribute('aria-label','Paginación de '+(root.id||'resultados'));root.after(nav);
 function draw(){
  const total=Math.max(1,Math.ceil(items.length/pageSize));page=Math.min(page,total);
  root.replaceChildren(...items.slice((page-1)*pageSize,page*pageSize));
  nav.replaceChildren();nav.hidden=total===1;if(total===1)return;
  const info=document.createElement('span');info.textContent='Página '+page+' de '+total+' · '+items.length+' elementos';
  const prev=document.createElement('button');prev.type='button';prev.textContent='← Anterior';prev.disabled=page===1;
  const next=document.createElement('button');next.type='button';next.textContent='Siguiente →';next.disabled=page===total;
  prev.onclick=()=>{page--;draw()};next.onclick=()=>{page++;draw()};
  nav.append(prev,info,next);
 }
 draw();
}

const readingPages={read:1,pending:1};
// Equivalencias de artículos consolidados: conservar el historial sin dar por leída
// una guía completa cuando solo se leyó uno de sus capítulos anteriores.
function canonicalArticleSlug(slug){
 if(slug.startsWith('verbos-preposicion-'))return 'verbos-con-preposiciones-ingles';
 if(slug.startsWith('phrasal-verbs-particula-'))return 'phrasal-verbs-particula-out';
 if(slug.startsWith('phrasal-verbs-verbo-'))return 'phrasal-verbs-verbo-take';
 const merged={
  'despite-vs-in-spite-of':'linking-words-of-contrast',
  'nonetheless-contrast':'linking-words-of-contrast',
  'negative-prefixes':'formacion-adjetivos-ingles',
  'formacion-sustantivos-ingles':'formacion-adjetivos-ingles',
  'formacion-adverbios-ingles':'formacion-adjetivos-ingles',
  'english-tenses-overview':'guia-tiempos-verbales-ingles-presente-pasado-futuro-trucos-examen',
  'future-going-to-present-continuous':'todos-los-tiempos-de-futuro-en-ingles',
  'present-perfect-vs-past-simple':'pasados-vs-present-perfect-simple-continuous',
  'trucos-tiempos-verbales-writing-b2':'como-usar-tiempos-verbales-carta-email-writing-b1-b2'
 };
 return merged[slug]||slug;
}
function historicReadMap(){
 const mapped=new Map();
 for(const [route,date] of Object.entries(profile.read)){
  const slug=String(route).match(/(?:^|\/)post\/([a-z0-9-]+)\.html$/)?.[1];
  if(!slug)continue;
  const canonical=canonicalArticleSlug(slug);
  if(canonical===slug)continue;
  const key='post/'+canonical+'.html';
  if(!mapped.has(key))mapped.set(key,[]);
  mapped.get(key).push({slug,date});
 }
 return mapped;
}
function normalizeSearch(text){
 return String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');
}
function readLocal(){try{const v=JSON.parse(localStorage.getItem(key)||'{}');return v&&typeof v==='object'?v:{}}catch{return {}}}
const old=readLocal();
let profile={name:typeof old.name==='string'?old.name:'',read:old.read&&typeof old.read==='object'&&!Array.isArray(old.read)?{...old.read}:{}};
function status(s){
 const target=user?$('dashboardStatus'):$('accountStatus');
 target.textContent=s;
 target.hidden=!s;
}
const dashboardStatus=document.createElement('p');
dashboardStatus.id='dashboardStatus';dashboardStatus.className='muted';dashboardStatus.setAttribute('role','status');dashboardStatus.setAttribute('aria-live','polite');dashboardStatus.hidden=true;
$('privateDashboard').prepend(dashboardStatus);
$('accountActions').querySelector('.section-kicker').textContent='SEGURIDAD DE LA CUENTA';
const accountActions=$('accountActions').querySelector('.account-actions');
accountActions.prepend($('signout'));
// Mantener pestañas, secciones y desplegables del HTML.
function localSave(){try{localStorage.setItem(key,JSON.stringify(profile))}catch{status('No se pudieron guardar los cambios en este navegador.')}}
// El artículo recomendado depende únicamente de las lecturas confirmadas en Supabase.
// No declarar "todo leído" hasta disponer tanto del catálogo como del progreso del alumno.
function updateSuggestedReading(chooseAnother=false){
 const article=$('readingPickArticle'),message=$('readingPickStatus'),actions=$('readingPickActions');
 actions.hidden=true;
 if(!user){suggestedHref=null;article.textContent='';message.textContent='Inicia sesión para recibir una recomendación.';return}
 if(!articlesLoaded||cloudUserId!==user.id){
  article.textContent='';message.textContent='Consultando los artículos y tus lecturas guardadas…';return
 }
 if(!articles.length){
  article.textContent='';message.textContent='Todavía no hay artículos disponibles para leer.';return
 }
 const unread=articles.filter(a=>!profile.read[a.href]);
 if(!unread.length){
  suggestedHref=null;
  article.textContent='🎉 ¡Enhorabuena! Has leído todos los artículos disponibles.';
  message.textContent='¡Has completado las '+articles.length+' lecturas! Sigue practicando para mantener tu progreso.';
  return
 }
 let next=unread.find(a=>a.href===suggestedHref);
 if(!next||chooseAnother){
  const candidates=chooseAnother&&unread.length>1?unread.filter(a=>a.href!==suggestedHref):unread;
  next=candidates[Math.floor(Math.random()*candidates.length)];
  suggestedHref=next.href;
 }
 article.textContent=next.title;
 message.textContent='Te quedan '+unread.length+' '+(unread.length===1?'artículo pendiente':'artículos pendientes')+'. Aquí tienes uno elegido al azar.';
 $('readingPickLink').href=next.link||next.href;
 $('readingPickAnother').hidden=unread.length<2;
 actions.hidden=false;
}
function header(){
 $('studentName').value=profile.name;
 $('greeting').textContent=profile.name?'¡Hola, '+profile.name+'!':'Añade tu nombre para personalizar tu espacio.';
 $('learningHomeGreeting').textContent=profile.name?'¡Hola, '+profile.name+'! Aquí tienes tu ruta y tus próximos pasos.':'Consulta tu avance y continúa tu aprendizaje B2.';
}
function render(){
 header();
 const total=articles.length,done=articles.filter(a=>profile.read[a.href]).length,pending=total-done;
 const ready=articlesLoaded&&(!user||cloudUserId===user.id);
 const pct=total?Math.round(done/total*100):0;
 $('readStat').textContent=ready?String(done):'—';
 $('homeReadingCount').textContent=ready?String(done):'—';
 achievementProgress.reads=user&&ready?done:null;
 renderAchievements();
 $('learningReads').textContent=cloudUserId===user?.id?String(done):'—';
 $('totalStat').textContent=articlesLoaded?String(total):'—';
 $('percentageStat').textContent=ready?pct+'%':'—';
 $('readBar').style.width=ready?pct+'%':'0%';
 $('readMeter').setAttribute('aria-valuenow',String(ready?pct:0));
 $('readProgressText').textContent=ready?done+' de '+total+' artículos completados ('+pct+'%).':
  'Consultando tus lecturas guardadas…';
 $('readArticlesCount').textContent=ready?String(done):'—';
 $('pendingArticlesCount').textContent=ready?String(pending):'—';
 const historic=historicReadMap();
 const partlyRead=articles.filter(a=>!profile.read[a.href]&&historic.has(a.href)).length;
 const pendingLabel=$('pendingReadHelp');
 if(pendingLabel)pendingLabel.textContent=ready&&partlyRead?
   partlyRead+' '+(partlyRead===1?'guía pendiente incluye':'guías pendientes incluyen')+' lecturas de capítulos anteriores a la unificación. No se marcarán como completadas hasta que leas la guía actual.':'';
 for(const [id,view] of [['showAllArticles','all'],['onlyPending','pending'],['onlyRead','read']])
  $(id).setAttribute('aria-pressed',String(articleView===view));
 const root=$('articleList');root.replaceChildren();
 if(!ready){
  $('articleBrowseCount').textContent='Cargando tu biblioteca…';
  const wait=document.createElement('p');wait.className='muted';
  wait.textContent='Comprobando qué artículos has leído.';
  root.append(wait);updateSuggestedReading();return;
 }
 const term=normalizeSearch($('articleSearch').value.trim());
 const filtered=articles.filter(a=>!term||normalizeSearch(a.title).includes(term));
 const prior=historicReadMap();
 const doneList=filtered.filter(a=>profile.read[a.href]).sort((a,b)=>
  new Date(profile.read[b.href]).getTime()-new Date(profile.read[a.href]).getTime());
 const pendingList=filtered.filter(a=>!profile.read[a.href]);
 const shown=articleView==='read'?doneList.length:articleView==='pending'?pendingList.length:filtered.length;
 $('articleBrowseCount').textContent='Mostrando '+shown+' de '+total+' artículos'+(term?' que coinciden con la búsqueda':'')+'.';
 function group(type,title,entries){
  const box=document.createElement('section');box.className='reading-group '+type+'-group';
  const head=document.createElement('div');head.className='reading-group-header';
  const h=document.createElement('h3');h.textContent=title;
  const counter=document.createElement('span');counter.className='reading-group-count';
  counter.textContent=entries.length+' artículo'+(entries.length===1?'':'s');
  head.append(h,counter);box.append(head);
  const list=document.createElement('div');list.className='reading-group-list';
  const pages=Math.max(1,Math.ceil(entries.length/READING_PAGE_SIZE));
  readingPages[type]=Math.min(Math.max(readingPages[type],1),pages);
  const page=readingPages[type],start=(page-1)*READING_PAGE_SIZE;
  if(!entries.length){
   const p=document.createElement('p');p.className='reading-group-empty';
   p.textContent=term?'Ningún artículo coincide con la búsqueda.':
    type==='read'?'Todavía no has marcado artículos como leídos.':'No hay artículos pendientes.';
   list.append(p);
  }
  for(const a of entries.slice(start,start+READING_PAGE_SIZE)){
   const completed=Boolean(profile.read[a.href]);
   const row=document.createElement('div');row.className='item';
   const detail=document.createElement('div'),heading=document.createElement('strong');
   const link=document.createElement('a'),small=document.createElement('small');
   link.href=a.link||a.href;link.textContent=a.title;heading.append(link);
   const date=completed&&profile.read[a.href]?new Date(profile.read[a.href]).toLocaleDateString('es-ES'):'';
   const previousChapters=prior.get(a.href)||[];
   small.textContent=completed?'✓ Leído'+(date?' · '+date:''):
     previousChapters.length?'◐ Pendiente · '+previousChapters.length+' '+(previousChapters.length===1?'apartado leído antes de la unificación':'apartados leídos antes de la unificación'):
     '◯ Pendiente de leer';
   detail.append(heading,small);
   const btn=document.createElement('button');btn.type='button';
   btn.textContent=completed?'↩ Marcar como pendiente':'✓ Marcar como leído';
   btn.setAttribute('aria-pressed',String(completed));
   btn.setAttribute('aria-label',(completed?'Marcar como pendiente: ':'Marcar como leído: ')+a.title);
   btn.onclick=async()=>{
    if(loading||!user||cloudUserId!==user.id)return;
    const owner=user.id,previous=profile.read[a.href];loading=true;btn.disabled=true;
    try{
     if(previous){
      const {error}=await eeDb.from('lecturas').delete().eq('usuario_id',owner).eq('articulo_url',a.href);
      if(error)throw error;
     }else{
      const now=new Date().toISOString();
      const {error}=await eeDb.from('lecturas').upsert({usuario_id:owner,articulo_url:a.href,leido_en:now});
      if(error)throw error;
     }
     if(!user||user.id!==owner)return;
     if(previous)delete profile.read[a.href];
     else profile.read[a.href]=new Date().toISOString();
     render();
    }catch(error){status('No se pudo guardar el cambio: '+error.message);}
    finally{loading=false;btn.disabled=false}
   };
   const controls=document.createElement('div');controls.className='ee-reading-item-actions';
   const savedButton=document.createElement('button');savedButton.type='button';
   const isSaved=savedFavorites.has('articulo:'+a.slug);
   savedButton.textContent=isSaved?'★ Guardado':'☆ Guardar';
   savedButton.setAttribute('aria-pressed',String(isSaved));
   savedButton.setAttribute('aria-label',(isSaved?'Quitar de favoritos: ':'Guardar en favoritos: ')+a.title);
   savedButton.disabled=!user||!favoritesReady;
   savedButton.onclick=()=>{void toggleSavedResource('articulo',a.slug)};
   controls.append(btn,savedButton);row.append(detail,controls);list.append(row);
  }
  box.append(list);
  if(entries.length){
    const pagination=document.createElement('nav');
    pagination.className='reading-pagination';
    pagination.setAttribute('aria-label','Páginas de '+(type==='read'?'artículos leídos':'artículos pendientes'));
    const info=document.createElement('span');info.className='reading-page-info';
    info.textContent='Mostrando '+(start+1)+'–'+Math.min(start+READING_PAGE_SIZE,entries.length)+
      ' de '+entries.length+' · Página '+page+' de '+pages;
    pagination.append(info);
    if(pages>1){
      const controls=document.createElement('div');controls.className='reading-page-buttons';
      function moveTo(target){
        readingPages[type]=target;
        render();
        const section=$('articleList').querySelector('.'+type+'-group');
        if(section)section.scrollIntoView({block:'nearest',behavior:'auto'});
      }
      function pageButton(label,target,kind,disabled=false){
        const button=document.createElement('button');button.type='button';
        button.className='reading-page-button '+kind;
        button.textContent=label;button.disabled=disabled;
        button.setAttribute('aria-label',kind==='number'?'Página '+target+' de '+(type==='read'?'leídos':'pendientes'):label);
        if(kind==='number'&&target===page)button.setAttribute('aria-current','page');
        button.onclick=()=>moveTo(target);
        controls.append(button);
      }
      pageButton('‹ Anterior',Math.max(1,page-1),'previous',page===1);
      // Primera, última y hasta cinco páginas cercanas para no desbordar en móvil.
      const numbers=new Set([1,pages]);
      for(let p=Math.max(1,page-2);p<=Math.min(pages,page+2);p++)numbers.add(p);
      let last=0;
      for(const p of [...numbers].sort((a,b)=>a-b)){
        if(p-last>1){
          const dots=document.createElement('span');dots.className='reading-page-dots';
          dots.textContent='…';dots.setAttribute('aria-hidden','true');controls.append(dots);
        }
        pageButton(String(p),p,'number');
        last=p;
      }
      pageButton('Siguiente ›',Math.min(pages,page+1),'next',page===pages);
      pagination.append(controls);
    }
    box.append(pagination);
  }
  root.append(box);
 }
 if(articleView!=='pending')group('read','✓ Artículos leídos',doneList);
 if(articleView!=='read')group('pending','📖 Artículos pendientes de leer',pendingList);
 updateSuggestedReading();
}
async function loadCloud(){if(!user)return;const activeId=user.id;const [p,l]=await Promise.all([eeDb.from('perfiles').select('nombre').eq('usuario_id',activeId).maybeSingle(),eeDb.from('lecturas').select('articulo_url,leido_en').eq('usuario_id',activeId)]);if(!user||user.id!==activeId)return;if(p.error)throw p.error;if(l.error)throw l.error;profile={name:p.data?.nombre||'',read:Object.fromEntries((l.data||[]).map(r=>[r.articulo_url,r.leido_en]))};cloudUserId=activeId;render();await Promise.all([results(),loadStreak(),loadLearningOverview(),loadActivityCalendar(activeId),loadWeeklyFollowup(activeId)])}
function classifyLearningQuestion(q){
 const url=String(q.fuente_url||'').toLowerCase(),text=String(q.enunciado||'').toLowerCase();
 const slug=(url.match(/[?&]slug=([^&]+)/)?.[1]||url.split('/').pop()||'').replace(/\.html.*/,'');
 const rules=[
  [/gerund-infinitive|used-to-would|verb-pattern/,'Gerundio e infinitivo','stop doing / stop to do; remember doing / remember to do; be used to + -ing'],
  [/linking-words-of-contrast|despite|contrast/,'Conectores de contraste','although + oración; despite + sustantivo o -ing; however conecta dos oraciones'],
  [/stative-verbs/,'Verbos estáticos y tiempos','belong, know, believe y otros verbos que normalmente no van en continuous'],
  [/voz-pasiva|passive/,'Voz pasiva','be + past participle; identificar el tiempo verbal y el agente'],
  [/todos-los-tiempos-de-pasado|past-simple|past-continuous|pasados-vs-present-perfect/,'Tiempos de pasado y present perfect','past simple, past continuous, past perfect y contraste con present perfect'],
  [/todos-los-tiempos-de-presente|present-perfect/,'Tiempos de presente','present simple/continuous y present perfect simple/continuous'],
  [/todos-los-tiempos-de-futuro|future-going-to|future-forms/,'Formas de futuro','will, going to, present continuous y present simple para futuro'],
  [/direct-reported-speech|reported-speech/,'Estilo indirecto','cambios de tiempo, pronombres, expresiones temporales y reported questions'],
  [/formacion-adverbios|formacion-adjetivos|negative-prefixes/,'Formación de palabras','sufijos y prefijos; distinguir sustantivo, adjetivo y adverbio'],
  [/protector-of-the-sea-vocabulary-tenses|environment-vocabulary/,'Vocabulario en contexto','colocaciones y elección léxica dentro de un texto'],
  [/make-vs-do/,'Colocaciones make/do','aprender combinaciones frecuentes como make a decision y do homework'],
  [/adverbs-of-frequency/,'Adverbios de frecuencia','posición del adverbio con verbos principales y auxiliares'],
  [/conditionals/,'Condicionales','first, second, third y mixed conditionals; concordancia temporal'],
  [/modal-/,'Verbos modales','obligación, deducción, posibilidad y prohibición'],
  [/skimming-scanning/,'Reading: skimming y scanning','skimming para idea general; scanning para localizar datos concretos'],
  [/countable-uncountable/,'Contables e incontables','much/many, few/little y sustantivos no contables'],
  [/phrasal-verbs/,'Phrasal verbs','aprender verbo + partícula dentro de una frase y por significado'],
  [/conditional/,'Condicionales','estructura temporal de cada parte y third/mixed conditionals'],
  [/preposition/,'Preposiciones y colocaciones','memorizar combinaciones completas, no traducir palabra por palabra'],
  [/modal/,'Verbos modales','deducción, obligación, posibilidad y prohibición']
 ];
 const found=rules.find(([re])=>re.test(slug));
 if(found)return {category:found[1],tip:found[2],slug};
 if(/remember|stop|used to|look forward/.test(text))return {category:'Gerundio e infinitivo',tip:'Distingue el significado del verbo según vaya seguido de -ing o infinitivo',slug};
 if(/although|despite|whereas|nevertheless|however/.test(text))return {category:'Conectores de contraste',tip:'Distingue conector + oración de conector + sustantivo/-ing',slug};
 if(/must|should|might|could|can't|have to/.test(text))return {category:'Verbos modales',tip:'Revisa el grado de certeza, obligación o posibilidad',slug};
 return {category:'Otras estructuras y vocabulario',tip:'Revisar el enunciado y su explicación individual',slug};
}
async function renderDetailedLearningDiagnosis(owner,root,make){
 const {data:failures,error}=await eeDb.from('preguntas_falladas')
  .select('pregunta_id,veces_fallada,dominada,ultimo_fallo')
  .eq('usuario_id',owner);
 if(!user||user.id!==owner)return;
 if(error){root.prepend(make('p','No se pudo cargar el análisis por categorías: '+error.message,'ee-followup-analysis'));return}
 const ids=[...new Set((failures||[]).map(x=>x.pregunta_id).filter(Boolean))];
 if(!ids.length){
  const empty=make('section',undefined,'ee-teacher-report');
  empty.append(make('p','INFORME DEL PROFESOR · DIAGNÓSTICO INDIVIDUAL','section-kicker'));
  empty.append(make('h3','Aún no hay errores registrados para evaluar'));
  empty.append(make('p','Cuando completes ejercicios y se registren preguntas falladas, este informe identificará los contenidos que conviene reforzar.','ee-teacher-intro'));
  root.prepend(empty);return;
 }
 const {data:questions,qError}=await eeDb.from('preguntas')
  .select('id,enunciado,fuente_url').in('id',ids);
 if(!user||user.id!==owner)return;
 if(qError){root.prepend(make('p','No se pudieron consultar los temas de las preguntas: '+qError.message,'ee-followup-analysis'));return}
 const byId=new Map((questions||[]).map(q=>[q.id,q]));
 const groups=new Map();
 let unclassified=0;
 for(const failure of failures||[]){
  const q=byId.get(failure.pregunta_id);if(!q)continue;
  const c=classifyLearningQuestion(q);
  if(!groups.has(c.category))groups.set(c.category,{...c,questions:0,attempts:0,pending:0,examples:[],last:null});
  const g=groups.get(c.category);g.questions++;g.attempts+=Number(failure.veces_fallada)||1;
  if(!failure.dominada)g.pending++;
  if(g.examples.length<4&&q.enunciado)g.examples.push(q.enunciado);
  if(failure.ultimo_fallo&&(!g.last||failure.ultimo_fallo>g.last))g.last=failure.ultimo_fallo;
  if(c.category==='Otras estructuras y vocabulario')unclassified++;
 }
 const ranked=[...groups.values()].sort((a,b)=>b.pending-a.pending||b.attempts-a.attempts);
 const pending=(failures||[]).filter(x=>!x.dominada).length;
 const accumulated=(failures||[]).reduce((n,x)=>n+(Number(x.veces_fallada)||1),0);
 const diagnosed=ranked.reduce((n,g)=>n+g.questions,0);
 const pendingShare=g=>pending?Math.round(g.pending/pending*100):0;
 const lessons={
  'Tiempos de pasado y present perfect':{
   level:'Prioridad alta',why:'Es el bloque con mayor volumen de preguntas pendientes. El reto no es memorizar una tabla: es elegir el tiempo según el orden de los acontecimientos, la duración y si el periodo sigue conectado con el presente.',
   lesson:'Past simple presenta un hecho terminado; past continuous sitúa una acción en desarrollo; past perfect marca qué ocurrió antes de otro momento pasado. Present perfect conecta una experiencia o resultado con el presente y no suele acompañarse de un tiempo pasado terminado.',
   trap:'Confundir una fecha terminada (yesterday, in 2022, last week) con un periodo que llega hasta ahora (since, for, so far). También olvidar el past perfect cuando hay dos momentos pasados.',
   drill:'Escribe una línea temporal para cada frase, subraya el marcador temporal y explica por qué el otro tiempo no encaja.',
   target:'Elegir el tiempo correcto y justificarlo en 8 de cada 10 frases nuevas.'
  },
  'Voz pasiva':{
   level:'Prioridad alta',why:'Hay un bloque amplio de errores pendientes. La dificultad suele estar en conservar el tiempo verbal original mientras se cambia el foco de la oración al objeto que recibe la acción.',
   lesson:'La estructura central es BE + past participle. El auxiliar BE lleva el tiempo: is made, was made, has been made, will be made. El complemento con by solo se añade si el agente aporta información.',
   trap:'Usar el participio sin BE, conjugar el verbo principal en pasado simple después de BE o cambiar el tiempo al transformar la oración.',
   drill:'Transforma 10 frases activas a pasiva y marca en color el tiempo de BE antes de escribir el participio.',
   target:'Transformar correctamente 8/10 frases en al menos dos sesiones separadas.'
  },
  'Tiempos de presente':{
   level:'Prioridad alta',why:'Necesitas afinar la diferencia entre rutina, situación temporal, experiencia y actividad que continúa. En B2 importa el significado, no solo reconocer el adverbio.',
   lesson:'Present simple expresa hábitos y estados; present continuous, situaciones temporales o cambios; present perfect simple suele destacar resultado o experiencia; present perfect continuous, duración o actividad reciente.',
   trap:'Usar continuous con verbos de estado como know, believe o belong; confundir how long con una acción terminada.',
   drill:'Compara pares mínimos: I have worked / I have been working; I live / I am living. Explica qué cambia en el significado.',
   target:'Explicar la diferencia de significado en 6 pares de frases.'
  },
  'Tiempos de presente y verbos estáticos':{
   level:'Prioridad alta',why:'Los verbos estáticos exigen atender al significado: algunos verbos cambian de sentido y admiten continuous solo en uno de sus usos.',
   lesson:'Know, believe, own y belong suelen describir estados. Think puede significar opinión (I think) o actividad mental temporal (I am thinking).',
   trap:'Aplicar la regla de añadir -ing de forma mecánica sin comprobar si el verbo describe estado o acción.',
   drill:'Clasifica 12 verbos en estado/acción y redacta dos frases con verbos que cambian de significado.',
   target:'No usar continuous automáticamente; justificar el uso por el significado.'
  },
  'Formas de futuro':{
   level:'Prioridad media-alta',why:'Las formas de futuro se eligen por intención comunicativa: decisión espontánea, plan previo, evidencia o calendario.',
   lesson:'Will suele expresar decisión espontánea, promesa o predicción; going to, intención previa o evidencia; present continuous, acuerdo organizado; present simple, horarios.',
   trap:'Elegir will para todos los futuros y no distinguir predicción basada en evidencia de opinión.',
   drill:'Escribe 4 predicciones, 4 planes y 4 acuerdos; explica qué pista justifica cada forma.',
   target:'Acertar 9/12 situaciones y explicar la intención.'
  },
  'Conectores de contraste':{
   level:'Prioridad alta',why:'Este bloque afecta tanto a Use of English como a Writing: una idea puede ser correcta, pero la estructura posterior al conector puede hacer que la frase sea incorrecta.',
   lesson:'Although/whereas/even though introducen una oración; despite/in spite of van seguidos de sustantivo, pronombre o -ing; however suele conectar dos oraciones y necesita puntuación adecuada.',
   trap:'Escribir despite + sujeto + verbo sin una estructura que lo permita, o usar although + nombre sin convertirlo en oración.',
   drill:'Transforma 10 pares de frases usando although, despite, however y whereas sin cambiar el sentido.',
   target:'Hacer 8/10 transformaciones sin errores de estructura ni puntuación.'
  },
  'Gerundio e infinitivo':{
   level:'Prioridad alta',why:'No basta con aprender que un verbo va seguido de -ing o to + infinitive: en algunos casos cambia el significado.',
   lesson:'Enjoy, avoid y suggest suelen ir con -ing; decide, hope y plan con to-infinitive. Remember doing = recordar algo vivido; remember to do = acordarse de hacer algo. Stop doing = dejar una actividad; stop to do = detenerse para hacer otra.',
   trap:'Traducir literalmente desde el español y olvidar patrones como look forward to + -ing, donde to es preposición.',
   drill:'Crea una ficha verbo + patrón + ejemplo propio. Practica especialmente remember, forget, stop, try y used to/be used to.',
   target:'Reconocer el patrón y el significado correcto en 8/10 frases.'
  },
  'Vocabulario en contexto':{
   level:'Prioridad media-alta',why:'El vocabulario debe aprenderse por colocaciones y contexto, no como equivalencias aisladas. Esto es especialmente importante en cloze y reading.',
   lesson:'Observa qué tipo de palabra falta, qué palabras suelen acompañarla y si el contexto exige un matiz positivo, negativo, formal o específico.',
   trap:'Escoger una palabra porque su traducción parece correcta aunque no forme una colocación natural.',
   drill:'Por cada palabra nueva, anota colocación, familia léxica y una frase propia; después tapa la palabra y recupérala por contexto.',
   target:'Aprender 12 colocaciones y recuperarlas correctamente en frases nuevas.'
  },
  'Reading: skimming y scanning':{
   level:'Prioridad media-alta',why:'La comprensión lectora requiere dos estrategias distintas: captar la idea global y localizar información concreta. Leer cada palabra puede hacerte perder tiempo.',
   lesson:'Skimming: título, primera frase y organización para identificar tema e intención. Scanning: buscar nombres, fechas, cifras o sinónimos de la pregunta. Después confirma leyendo el contexto.',
   trap:'Elegir una respuesta por coincidencia literal sin comprobar si responde a la pregunta completa.',
   drill:'Haz dos lecturas cronometradas: resume cada párrafo en una línea y localiza después 5 datos específicos.',
   target:'Justificar cada respuesta con una evidencia concreta del texto.'
  },
  'Phrasal verbs':{
   level:'Prioridad media',why:'Los phrasal verbs suelen tener varios significados. Memorizar solo verbo + partícula no garantiza reconocerlos en contexto.',
   lesson:'Aprende cada combinación dentro de una frase y clasifica si es separable, inseparable o intransitiva cuando corresponda.',
   trap:'Traducir literalmente la partícula o colocar el objeto en una posición incorrecta.',
   drill:'Crea tarjetas con significado contextual, ejemplo y una frase propia; contrasta carry on, put off y take up.',
   target:'Recuperar 10 combinaciones en contexto y usarlas en 5 frases propias.'
  },
  'Condicionales':{
   level:'Prioridad media',why:'La clave es relacionar el tiempo de la condición con el resultado, especialmente en third y mixed conditionals.',
   lesson:'Second conditional: situación hipotética presente/futura. Third: pasado imposible de cambiar. Mixed: condición pasada con resultado presente, o viceversa.',
   trap:'Mezclar tiempos sin identificar primero si hablamos de realidad, hipótesis presente o arrepentimiento pasado.',
   drill:'Dibuja la línea temporal antes de completar 10 condicionales y explica qué parte es real o hipotética.',
   target:'Distinguir los tres tipos y resolver 8/10 ejercicios.'
  },
  'Verbos modales':{
   level:'Prioridad media',why:'Los modales expresan grados distintos de obligación, posibilidad y deducción. En B2 también debes reconocer sus formas perfectas.',
   lesson:'Must/have to expresan obligación con matices; mustn't es prohibición y don't have to ausencia de obligación. Might/could expresan posibilidad; must + have + participle, deducción sobre el pasado.',
   trap:'Confundir mustn't con don't have to y olvidar have + participio al deducir sobre el pasado.',
   drill:'Reescribe situaciones usando must, might, can't, have to y should; explica el grado de certeza.',
   target:'Diferenciar obligación, prohibición y ausencia de obligación en 9/10 casos.'
  }
 };
 const panel=make('section',undefined,'ee-teacher-report');
 panel.append(make('p','EASY ENGLISH · INFORME DE PROGRESO INDIVIDUAL','section-kicker'));
 const hero=make('div',undefined,'ee-teacher-hero');
 const heroText=make('div');heroText.append(make('span','EVALUACIÓN FORMATIVA · NIVEL OBJETIVO B2','ee-teacher-eyebrow'),make('h3','Tu diagnóstico de aprendizaje'),make('p','No vamos a medir solo si apruebas. Vamos a localizar qué estructuras te están frenando, por qué suelen fallar y qué debes demostrar para considerarlas dominadas.','ee-teacher-intro'));
 const heroTag=make('span','PLAN DE RECUPERACIÓN','ee-teacher-tag');hero.append(heroText,heroTag);panel.append(hero);
 const metrics=make('div',undefined,'ee-teacher-kpis');
 [[String(failures.length),'preguntas registradas'],[String(pending),'pendientes de consolidar'],[String(accumulated),'fallos acumulados'],[String(ranked.length),'bloques detectados']].forEach(([v,l])=>{const m=make('div',undefined,'ee-teacher-kpi');m.append(make('strong',v),make('span',l));metrics.append(m)});
 panel.append(metrics);
 const interpretation=make('div',undefined,'ee-teacher-observation');
 interpretation.append(make('strong','Lectura del profesor'),make('p',pending+' preguntas siguen marcadas como no dominadas. La prioridad es reducir esos errores con recuperación activa y práctica espaciada, no repetir tests sin analizar la causa. Los bloques se ordenan por preguntas pendientes, no por una supuesta nota de gramática.'));
 panel.append(interpretation);
 panel.append(make('h4','01 · Mapa de tus necesidades'),make('p','La barra indica el peso de cada bloque dentro de tus preguntas pendientes; no es un porcentaje de acierto ni una nota. Abre cada ficha para ver la explicación, el error típico y el ejercicio recomendado.','ee-teacher-muted'));
 const list=make('div',undefined,'ee-teacher-subjects');
 for(const [index,g] of ranked.entries()){
  const info=lessons[g.category]||{
   level:g.pending>=5?'Prioridad alta':'Prioridad media',
   why:'Hay preguntas pendientes asociadas a este contenido. Conviene revisar la regla y comprobar que puedes aplicarla en un ejemplo distinto, sin memorizar la respuesta.',
   lesson:g.tip,
   trap:'Responder por intuición o traducción literal sin identificar primero la estructura que exige la frase.',
   drill:'Revisa los ejemplos registrados, escribe la regla con tus palabras y resuelve 8 preguntas nuevas explicando cada elección.',
   target:'Resolver 8/10 preguntas nuevas y repetir la prueba en otra sesión.'
  };
  const card=make('details',undefined,'ee-teacher-subject');
  if(index<3)card.open=true;
  const head=make('summary',undefined,'ee-teacher-subject-head');
  const rank=make('span',String(index+1).padStart(2,'0'),'ee-teacher-rank');
  const name=make('span',undefined,'ee-teacher-subject-name');name.append(make('strong',g.category),make('small',info.level+' · '+g.questions+' preguntas vinculadas'));
  const count=make('span',g.pending+' pendientes','ee-teacher-count');
  head.append(rank,name,count);card.append(head);
  const bar=make('div',undefined,'ee-teacher-bar');const fill=make('span');fill.style.width=Math.min(100,pendingShare(g))+'%';bar.append(fill);card.append(bar);
  const body=make('div',undefined,'ee-teacher-subject-body');
  const columns=make('div',undefined,'ee-teacher-explanation');
  [['Qué revela tu historial',info.why],['La regla que debes dominar',info.lesson],['Error que debes evitar',info.trap],['Cómo lo vamos a trabajar',info.drill],['Criterio para darlo por consolidado',info.target]].forEach(([label,txt])=>{const box=make('div');box.append(make('strong',label),make('p',txt));columns.append(box)});
  body.append(columns);
  const stats=make('p','Evidencia: '+g.questions+' preguntas distintas · '+g.attempts+' fallos acumulados · '+g.pending+' pendientes. Peso dentro de pendientes: '+pendingShare(g)+'%.','ee-teacher-evidence');body.append(stats);
  if(g.examples.length){const details=make('details',undefined,'ee-teacher-examples');details.append(make('summary','Ver enunciados de tu historial'));const ul=make('ul');g.examples.forEach(x=>ul.append(make('li',x)));details.append(ul);body.append(details)}
  card.append(body);list.append(card);
 }
 panel.append(list);
 const plan=make('section',undefined,'ee-teacher-plan');
 plan.append(make('p','02 · ITINERARIO DE INTERVENCIÓN','section-kicker'),make('h4','Plan de estudio de cuatro semanas'));
 plan.append(make('p','Cinco sesiones semanales de 40 minutos. Cada semana tiene un objetivo observable y una pequeña prueba de salida. Si una prueba no alcanza el criterio, esa materia pasa a la siguiente semana como repaso prioritario.','ee-teacher-muted'));
 const weeks=[
  ['Semana 1','Reparar la base verbal','Tiempos de pasado y present perfect; tiempos de presente; verbos estáticos.','Lunes: línea temporal de past simple/continuous/perfect. Martes: present perfect simple vs continuous. Miércoles: estados vs acciones. Jueves: 15 preguntas mezcladas y corrección razonada. Viernes: mini-test de 20 preguntas y registro de errores.','Criterio: 16/20 y explicación correcta de al menos 4 errores.'],
  ['Semana 2','Construir frases con precisión','Voz pasiva; gerundio e infinitivo; patrones verbales.','Lunes: pasiva en presente y pasado. Martes: pasiva en perfect y future. Miércoles: verb + -ing / to-infinitive. Jueves: remember, stop, try, used to y be used to. Viernes: 15 transformaciones y 10 frases propias.','Criterio: 8/10 transformaciones y 8/10 patrones.'],
  ['Semana 3','Mejorar cohesión y elección léxica','Conectores de contraste; preposiciones y colocaciones; formación de palabras; vocabulario en contexto.','Lunes: although / despite / however. Martes: preposiciones dependientes y collocations. Miércoles: prefijos, sufijos y categoría gramatical. Jueves: cloze contextual. Viernes: mini-writing de 140–190 palabras revisando conectores y vocabulario.','Criterio: 8/10 transformaciones y texto sin errores repetidos de conector.'],
  ['Semana 4','Aplicar la gramática en tareas B2','Reading; phrasal verbs; condicionales; modales; estilo indirecto y repaso acumulativo.','Lunes: skimming/scanning con evidencia textual. Martes: phrasal verbs en contexto. Miércoles: second, third y mixed conditionals. Jueves: modales y reported speech. Viernes: simulacro mixto, análisis de errores y nuevo orden de prioridades.','Criterio: 80% en dos bloques separados; si no, repetir el bloque débil.']
 ];
 const weekGrid=make('div',undefined,'ee-teacher-weeks');
 weeks.forEach(([label,title,focus,days,target])=>{const w=make('article',undefined,'ee-teacher-week');w.append(make('span',label,'ee-teacher-week-label'),make('h5',title),make('p',focus,'ee-teacher-week-focus'),make('p',days,'ee-teacher-week-days'),make('strong',target));weekGrid.append(w)});
 plan.append(weekGrid);
 const routine=make('div',undefined,'ee-teacher-routine');
 routine.append(make('h5','Estructura fija de cada sesión · 40 minutos'));
 [['08 min','Recuperación activa','Intenta recordar la regla sin mirar apuntes.'],['17 min','Práctica focalizada','Resuelve ejercicios del tema de la semana y marca por qué descartas las otras opciones.'],['10 min','Producción','Escribe 4–5 frases propias o un párrafo breve usando la estructura.'],['05 min','Diario de errores','Anota error, causa, regla correcta y una frase nueva.']].forEach(([time,title,desc])=>{const step=make('div');step.append(make('strong',time),make('b',title),make('span',desc));routine.append(step)});
 plan.append(routine);
 const schedule=make('p','Repaso espaciado obligatorio: vuelve a intentar cada error al día siguiente, a los 3 días y a los 7 días. No marques una estructura como dominada por acertar una vez: debe salir bien en dos sesiones distintas y en frases que no hayas memorizado.','ee-teacher-footnote');
 plan.append(schedule);panel.append(plan);
 const note=make('p','Nota de rigor: las cifras describen el cuaderno de preguntas falladas y su estado de dominio. No equivalen a porcentajes de acierto por categoría. El sistema no conserva una clave de corrección comparable para todos los intentos; por eso este informe no inventa notas ni atribuye errores que no constan. '+(unclassified?'Hay '+unclassified+' registros que todavía requieren una clasificación temática más precisa.':''),'ee-teacher-method');
 panel.append(note);
 root.prepend(panel);
}
async function loadWeeklyFollowup(owner){
 const status=$('followupStatus'),root=$('followupReports'),summary=$('followupSummary');
 if(!status||!root||!summary)return;
 status.textContent='Cargando tus informes guardados…';root.replaceChildren();summary.replaceChildren();
 const {data,error}=await eeDb.from('seguimiento_semanal')
  .select('semana_inicio,semana_fin,informe,generado_en')
  .eq('usuario_id',owner).order('semana_inicio',{ascending:false});
 if(!user||user.id!==owner)return;
 if(error){status.textContent='No se pudo cargar el seguimiento: '+error.message;return}
 if(!data?.length){status.textContent='Todavía no hay informes semanales guardados.';return}
 const make=(tag,txt,cls)=>{const n=document.createElement(tag);if(txt!==undefined)n.textContent=txt;if(cls)n.className=cls;return n};
 await renderDetailedLearningDiagnosis(owner,root,make);
 if(!user||user.id!==owner)return;
 const totals=data.reduce((acc,row)=>{const r=row.informe||{};for(const k of ['active_days','readings','units','exams','mock_tests'])acc[k]=(acc[k]||0)+(Number(r[k])||0);return acc},{});
 [['active_days','Días activos'],['readings','Lecturas'],['units','Unidades'],['exams','Exámenes'],['mock_tests','Simulacros B2']].forEach(([key,label])=>{const item=make('div',undefined,'ee-followup-total');item.append(make('strong',String(totals[key]||0)),make('span',label));summary.append(item)});
 status.textContent='Historial desde tu registro · 13 de octubre de 2026. Hay 2 semanas completas, una primera semana parcial y una semana en curso (hasta el 6 de noviembre).';
 for(const row of data){
  const r=row.informe||{},card=make('article',undefined,'ee-followup-report');
  const head=make('div',undefined,'ee-followup-report-head');
  const title=make('h3','Semana del '+new Date(row.semana_inicio+'T12:00:00').toLocaleDateString('es-ES',{day:'numeric',month:'long'}));
  const end=make('span',r.period_status||'');
  head.append(title,end);card.append(head);
  const metrics=make('div',undefined,'ee-followup-metrics');
  const vals=[['active_days','Días activos'],['readings','Lecturas'],['units','Unidades'],['exams','Exámenes'],['average_exam_score','Media de nota'],['mock_tests','Simulacros'],['diagnostics','Diagnósticos']];
  for(const [key,label] of vals){if(r[key]===undefined||r[key]===null)continue;const m=make('div',undefined,'ee-followup-metric');m.append(make('strong',key==='average_exam_score'?r[key]+'%':String(r[key])),make('span',label));metrics.append(m)}
  card.append(metrics);
  if(r.analysis)card.append(make('p',r.analysis,'ee-followup-analysis'));
  for(const [label,key] of [['Puntos fuertes','strengths'],['A mejorar','focus']]){
   if(!Array.isArray(r[key])||!r[key].length)continue;
   const section=make('div',undefined,'ee-followup-detail'),h=make('strong',label),ul=make('ul');
   r[key].forEach(x=>ul.append(make('li',x)));section.append(h,ul);card.append(section);
  }
  if(r.next_week){const goal=make('p',undefined,'ee-followup-goal');goal.append(make('strong','Objetivo siguiente: '),document.createTextNode(r.next_week));card.append(goal)}
  root.append(card);
 }
 const first=data[data.length-1]?.informe;
 if(first?.average_exam_score!==undefined){
  const lastComplete=[...data].reverse().filter(x=>x.informe?.period_status==='Semana completa.');
  if(lastComplete.length>=2){
   const a=Number(lastComplete[0].informe.average_exam_score),b=Number(lastComplete[lastComplete.length-1].informe.average_exam_score);
   const delta=(b-a).toFixed(1);
   status.textContent+=' En las semanas completas, tu media pasó del '+a+'% al '+b+'% ('+(delta>0?'+':'')+delta+' puntos).';
  }
 }
}
async function loadLearningOverview(){
 if(!user)return;
 const owner=user.id,box=$('learningActivityHistory');
 $('learningExams').textContent='—';$('learningActivities').textContent='—';
 $('learningErrors').textContent='—';box.textContent='Consultando actividades…';
 $('learningStatus').textContent='Consultando tu progreso en exámenes, actividades y errores…';
 const [exams,activityCount,attempts,classicErrors,activityErrors,available,activityRecent]=await Promise.all([
   eeDb.from('resultados').select('id',{count:'exact',head:true}).eq('usuario_id',owner),
   eeDb.from('actividad_intentos').select('id',{count:'exact',head:true}).eq('usuario_id',owner),
   eeDb.from('actividad_intentos').select('actividad_id,aciertos,evaluables,pendientes_revision,fecha')
     .eq('usuario_id',owner).order('fecha',{ascending:false}).limit(8),
   eeDb.from('preguntas_falladas').select('pregunta_id',{count:'exact',head:true})
     .eq('usuario_id',owner).eq('dominada',false),
   eeDb.from('actividad_fallos').select('pregunta_id',{count:'exact',head:true})
     .eq('usuario_id',owner).eq('dominada',false),
   eeDb.from('actividades').select('id,titulo,slug'),
   eeDb.from('actividad_intentos').select('id',{count:'exact',head:true}).eq('usuario_id',owner).gte('fecha',new Date(Date.now()-30*86400000).toISOString())
 ]);
 if(!user||user.id!==owner)return;
 const errors=[exams.error,activityCount.error,attempts.error,classicErrors.error,activityErrors.error,available.error,activityRecent.error].filter(Boolean);
 if(errors.length){
   $('learningStatus').textContent='No se pudo obtener todo tu progreso: '+errors[0].message;
   box.textContent='Vuelve a cargar tu perfil para consultar tus actividades.';
   return;
 }
 $('learningExams').textContent=String(exams.count??0);
 $('recentActivities30').textContent=String(activityRecent.count??0);
 $('homeExamCount').textContent=String(exams.count??0);
 $('learningActivities').textContent=String(activityCount.count??0);
 const pending=(classicErrors.count??0)+(activityErrors.count??0);
 $('learningErrors').textContent=String(pending);
 $('homeErrorCount').textContent=String(pending);
 $('learningStatus').textContent=pending?
   'Tienes '+pending+' preguntas pendientes de repaso: '+(classicErrors.count??0)+
   ' de exámenes y '+(activityErrors.count??0)+' de actividades. Puedes repasarlas juntas.':
   '🎉 ¡No tienes errores pendientes! Sigue practicando para consolidar lo aprendido.';
 box.replaceChildren();
 const names=new Map((available.data||[]).map(a=>[String(a.id),a]));
 for(const r of attempts.data||[]){
   const item=document.createElement('div');item.className='item';
   const info=document.createElement('div'),title=document.createElement('strong');
   const record=names.get(String(r.actividad_id));
   if(record?.slug){const a=document.createElement('a');a.href='actividades.html?actividad='+encodeURIComponent(record.slug);a.textContent=record.titulo;title.append(a)}
   else title.textContent='Actividad '+r.actividad_id;
   const detail=document.createElement('small');
   const dt=new Date(r.fecha),date=Number.isNaN(dt.getTime())?'':dt.toLocaleDateString('es-ES')+' · ';
   detail.textContent=date+(r.evaluables?r.aciertos+'/'+r.evaluables+' correctas':'Entregada')+
     (r.pendientes_revision?' · '+r.pendientes_revision+' en revisión':'');
   info.append(title,detail);item.append(info);box.append(item);
 }
 if((attempts.data||[]).length)profilePaginate(box,[...box.children],5);
 if(!(attempts.data||[]).length)box.textContent='Todavía no has entregado actividades interactivas.';
}
async function loadStreak(){if(!user)return;const {data,error}=await eeDb.rpc('racha_actual');if(error){$('streakMessage').textContent='No se pudo cargar la racha: '+error.message;return}const r=Array.isArray(data)?data[0]:data;if(!r)return;$('streakCurrent').textContent=String(r.racha||0);$('streakBest').textContent=String(r.mejor_racha||0);$('streakDays').textContent=String(r.dias_total||0);$('streakMessage').textContent=r.hoy_completado?'✅ ¡Has cumplido tu objetivo de hoy!':'Completa hoy una lección o un examen para mantener tu racha.';achievementProgress.streak=Number(r.mejor_racha)||0;renderAchievements()}
/* Estadísticas de fortalezas y dificultades de los exámenes guardados.
   Las soluciones solo se solicitan con ver_correccion para intentos propios. */
function profileQuestionTopic(q){
 const t=(q.enunciado||'').toLowerCase();
 if(/look after|look up|turn down|put off|give up|phrasal|look forward|turn into/.test(t))return 'Phrasal verbs';
 if(/must|should|can |could |have to|ought|may |might /.test(t))return 'Verbos modales';
 if(/apologis|preposition|depend on|interested in/.test(t))return 'Preposiciones';
 if(/question tag|haven't|who called|who did|grammatically correct/.test(t))return 'Preguntas y question tags';
 if(/if |would |unless/.test(t))return 'Condicionales';
 if(/was sent|were sent|passive/.test(t))return 'Voz pasiva';
 if(/had |has |have |since |while |by the time|going to|yesterday/.test(t))return 'Tiempos verbales';
 return 'Gramática y vocabulario';
}
const reviewedTopics=['Tiempos verbales','Tiempos verbales','Tiempos verbales','Tiempos verbales','Condicionales','Condicionales','Voz pasiva','Verbos modales','Verbos modales','Verbos modales','Phrasal verbs','Phrasal verbs','Phrasal verbs','Phrasal verbs','Preposiciones','Phrasal verbs','Preguntas','Question tags','Vocabulario','Vocabulario'];
function trustedExamTopic(q){
 // Taxonomía revisada manualmente para el examen 008. No atribuir etiquetas dudosas a otros exámenes.
 if(Number(q.examen_id)===8&&Number(q.orden)>=1&&Number(q.orden)<=20)return reviewedTopics[Number(q.orden)-1];
 return null;
}
function profileNode(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n}
function profileBars(panel,heading,items,color){
 panel.append(profileNode('h3',heading));
 if(!items.length){panel.append(profileNode('p','Todavía no hay suficientes respuestas clasificadas.'));return}
 for(const v of items){
  const wrap=profileNode('div',undefined,'skill-row'),head=profileNode('div',undefined,'skill-head');
  head.append(profileNode('span',v.topic),profileNode('strong',v.percent+'% · '+v.hits+'/'+v.total+' aciertos'));
  const track=profileNode('div',undefined,'skill-track'),bar=profileNode('div',undefined,'skill-fill');
  bar.style.width=v.percent+'%';bar.style.background=color;track.append(bar);wrap.append(head,track);
  if(heading==='Lo que debo corregir'){const a=profileNode('a','Generar examen de '+v.topic);a.href='practicar.html?repaso=fallos&tema='+encodeURIComponent(v.topic);a.style.cssText='display:inline-block;margin:8px 0 4px;color:#1e5eff;font-size:14px;font-weight:800;text-decoration:underline';wrap.append(a)}
  panel.append(wrap);
 }
}
async function loadActivityCalendar(owner){
 let panel=document.getElementById('learningCalendar');
 if(!panel){panel=document.createElement('section');panel.id='learningCalendar';panel.className='panel';$('examHistory').closest('.panel').insertAdjacentElement('afterend',panel)}
 panel.replaceChildren(profileNode('h2','Mi constancia · últimos 28 días'));
 const since=new Date();since.setDate(since.getDate()-27);
 const sinceISO=[since.getFullYear(),String(since.getMonth()+1).padStart(2,'0'),String(since.getDate()).padStart(2,'0')].join('-');
 const {data,error}=await eeDb.from('actividad_diaria').select('dia').eq('usuario_id',owner).gte('dia',sinceISO);
 if(!user||user.id!==owner)return;
 if(error){panel.append(profileNode('p','No se pudo consultar la actividad: '+error.message));return}
 const days=new Set((data||[]).map(r=>r.dia)),calendar=profileNode('div',undefined,'calendar-grid');
 for(let i=27;i>=0;i--){
  const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-i);
  const key=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
  const active=days.has(key),cell=profileNode('div',undefined,'calendar-day'+(active?' calendar-active':''));
  cell.title=key+(active?' · actividad registrada':' · sin actividad registrada');
  cell.setAttribute('aria-label',cell.title);calendar.append(cell);
 }
 panel.append(profileNode('p',days.size+' días con actividad registrada de los últimos 28.','muted'),calendar);
 if(!document.getElementById('calendar-style')){const css=profileNode('style');css.id='calendar-style';css.textContent='.calendar-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px;max-width:400px;margin:15px 0}.calendar-day{height:25px;border:1px solid #d9e4ff;border-radius:6px;background:#e8f0ff}.calendar-active{background:#2a6fe0;border-color:#2a6fe0}';document.head.append(css)}
}
async function loadLearningStrengths(scores,owner){
 let panel=document.getElementById('learningStrengths');
 if(!panel){panel=document.createElement('section');panel.id='learningStrengths';panel.className='panel';$('examHistory').closest('.panel').insertAdjacentElement('afterend',panel)}
 panel.replaceChildren(profileNode('h2','Mi evolución y mi plan de estudio'));
 if(!scores.length){panel.append(profileNode('p','Completa un examen para ver tu evolución y tus prioridades.'));return}
 const trend=profileNode('section',undefined,'skill-trend');
 trend.append(profileNode('h3','Evolución de mis notas'));
 const latest=scores.slice(0,12).reverse(),max=latest.length;
 const chart=profileNode('div',undefined,'skill-trend-chart');
 for(const [i,r] of latest.entries()){
  const b=profileNode('div',undefined,'skill-trend-bar');
  const v=Math.max(0,Math.min(100,Number(r.nota)||0));
  b.style.height=Math.max(2,v)+'%';b.title='Examen '+(i+1)+': '+v.toFixed(1)+'%';
  b.setAttribute('aria-label',b.title);b.setAttribute('role','img');chart.append(b);
 }
 trend.append(chart,profileNode('p','Últimos '+max+' intentos · de izquierda a derecha, del más antiguo al más reciente. Altura de las barras: nota sobre 100 %','muted'));
 panel.append(trend);
 const allCorrect=scores.reduce((n,r)=>n+(Number(r.aciertos)||0),0);
 const allQuestions=scores.reduce((n,r)=>n+(Number(r.total)||0),0);
 const accuracy=allQuestions?Math.round(allCorrect/allQuestions*100):0;
 const gauge=profileNode('section',undefined,'skill-objective');
 gauge.append(profileNode('h3','Precisión global de mis exámenes'));
 const ring=profileNode('div',undefined,'global-accuracy-ring');
 ring.style.cssText='margin:12px auto;width:135px;height:135px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(#2a6fe0 '+accuracy+'%,#d9e4ff '+accuracy+'%);position:relative';
 const middle=profileNode('strong',accuracy+'%');
 middle.style.cssText='background:white;border-radius:50%;width:100px;height:100px;display:grid;place-items:center;font-size:28px;color:#1e5eff';
 ring.append(middle);gauge.append(ring,profileNode('p',allCorrect+' respuestas correctas de '+allQuestions+' en '+scores.length+' intentos','muted'));
 panel.append(gauge);
 const recent=scores.slice(0,30);
 const examIds=[...new Set(recent.map(r=>r.examen_id))];
 const {data:questionRows,error}=await eeDb.from('preguntas').select('id,examen_id,orden').in('examen_id',examIds);
 if(!user||user.id!==owner)return;
 if(error){panel.append(profileNode('p','No se pudo cargar el desglose por temas: '+error.message));return}
 const byExam=new Map();
 for(const q of questionRows||[]){if(!trustedExamTopic(q))continue;const arr=byExam.get(String(q.examen_id))||[];arr.push(q);byExam.set(String(q.examen_id),arr)}
 const eligible=recent.filter(r=>byExam.has(String(r.examen_id)));
 if(!eligible.length){panel.append(profileNode('p','Aún no hay exámenes con temas revisados para comparar. La evolución de notas sí está disponible.'));return}
 const results=await Promise.all(eligible.map(async r=>{
  const {data,error}=await eeDb.rpc('ver_correccion',{p_resultado_id:r.id});
  return error?null:{r,solutions:data||[]};
 }));
 if(!user||user.id!==owner)return;
 const totals=new Map();let attempts=0;
 for(const item of results){
  if(!item)continue;attempts++;
  const corr=new Map(item.solutions.map(c=>[String(c.pregunta_id),c.respuesta_correcta]));
  for(const q of byExam.get(String(item.r.examen_id))||[]){
   if(!corr.has(String(q.id)))continue;
   const topic=trustedExamTopic(q),stat=totals.get(topic)||{hits:0,total:0};
   stat.total++;
   if(Object.prototype.hasOwnProperty.call(item.r.respuestas||{},String(q.id))&&Number(item.r.respuestas[q.id])===corr.get(String(q.id)))stat.hits++;
   totals.set(topic,stat);
  }
 }
 if(!totals.size){panel.append(profileNode('p','No se pudieron recuperar las correcciones de tus exámenes.'));return}
 const rows=[...totals].map(([topic,v])=>({topic,...v,percent:Math.round(v.hits/v.total*100)}));
 const solid=rows.filter(v=>v.total>=3);
 const strengths=solid.filter(v=>v.percent>=70).sort((a,b)=>b.percent-a.percent).slice(0,4);
 const improve=solid.filter(v=>v.percent<70).sort((a,b)=>a.percent-b.percent).slice(0,5);
 const priority=improve[0];
 const objective=profileNode('section',undefined,'skill-objective');
 objective.append(profileNode('h3','Mi objetivo recomendado'));
 objective.append(profileNode('p',priority?'Esta semana practica '+priority.topic.toLowerCase()+': '+priority.hits+' de '+priority.total+' respuestas correctas ('+priority.percent+'%).':'Sigue haciendo exámenes: necesitas al menos 3 preguntas por tema para identificar prioridades fiables.'));
 if(priority){
  const goal=profileNode('div',undefined,'skill-track'),progress=profileNode('div',undefined,'skill-fill');
  progress.style.width=priority.percent+'%';progress.style.background='#2a6fe0';goal.append(progress);
  objective.append(goal,profileNode('p','Objetivo recomendado: alcanzar al menos el 70 % de aciertos en este tema.','muted'));
 }
 const action=profileNode('a','Practicar ahora ↗');action.href='practicar.html';objective.append(action);panel.append(objective);
 panel.append(profileNode('p','Análisis de '+attempts+' intentos recientes con clasificación de temas revisada. Solo se clasifican las preguntas verificadas; no se infieren categorías ambiguas. Mínimo 3 respuestas por tema para valorar fortalezas y dificultades.','muted'));
 profileBars(panel,'Mis puntos fuertes',strengths,'#2a6fe0');
 profileBars(panel,'Lo que debo corregir',improve,'#c77d3d');
 const cssId='skill-profile-styles';
 if(!document.getElementById(cssId)){const css=profileNode('style');css.id=cssId;css.textContent='.skill-trend-chart{height:135px;display:flex;align-items:end;gap:7px;border-bottom:1px solid #ccdcfa;padding:7px 0}.skill-trend-bar{flex:1;min-width:8px;border-radius:5px 5px 0 0;background:#2a6fe0}.skill-trend,.skill-objective{background:#eef4ff;border-radius:15px;padding:17px;margin:16px 0}.skill-objective a{color:#1e5eff;font-weight:800;text-decoration:underline}.skill-row{margin:13px 0}.skill-head{display:flex;justify-content:space-between;gap:10px;font-size:14px}.skill-track{height:10px;background:#e8f0ff;border-radius:20px;overflow:hidden;margin-top:6px}.skill-fill{height:100%;border-radius:20px}';document.head.append(css)}
}
async function results(){
 const box=$('examHistory');box.replaceChildren();
 if(!user){$('examCount').textContent='—';$('bestScore').textContent='—';$('averageScore').textContent='—';return}
 const activeUserId=user.id;
 box.textContent='Cargando resultados…';
 const [resultResponse,examResponse]=await Promise.all([
  eeDb.from('resultados').select('id,examen_id,aciertos,total,nota,fecha,respuestas').eq('usuario_id',activeUserId).order('fecha',{ascending:false}).limit(1000),
  eeDb.from('examenes').select('id,titulo,fecha')
 ]);
 if(!user||user.id!==activeUserId)return;
 box.replaceChildren();
 if(resultResponse.error){box.textContent='No se pudieron consultar tus notas: '+resultResponse.error.message;$('recentStudyStatus').textContent='No se pudieron consultar las estadísticas: '+resultResponse.error.message;return}
 const scores=resultResponse.data||[],examNames=new Map((examResponse.data||[]).map(e=>[String(e.id),e.titulo]));
 const now=Date.now(),weekStart=now-7*86400000,monthStart=now-30*86400000;
 const last7=scores.filter(x=>new Date(x.fecha).getTime()>=weekStart);
 const last30=scores.filter(x=>new Date(x.fecha).getTime()>=monthStart);
 const last30Nums=last30.map(x=>Number(x.nota)).filter(Number.isFinite);
 achievementProgress.exams=scores.length;renderAchievements();
 $('recentExam7').textContent=String(last7.length);
 $('recentExam30').textContent=String(last30.length);
 $('recentAverage30').textContent=last30Nums.length?(last30Nums.reduce((sum,x)=>sum+x,0)/last30Nums.length).toFixed(1)+'%':'—';
 $('recentStudyStatus').textContent='Datos de los últimos 7 y 30 días. El gráfico de evolución y los temas más difíciles aparecen debajo.';
 const nums=scores.map(x=>Number(x.nota)).filter(Number.isFinite);
 $('examCount').textContent=String(scores.length);
 $('bestScore').textContent=nums.length?Math.max(...nums).toFixed(1).replace(/\\.0$/,'')+'%':'—';
 $('averageScore').textContent=nums.length?(nums.reduce((s,x)=>s+x,0)/nums.length).toFixed(1)+'%':'—';
 for(const r of scores){
  const el=document.createElement('div');el.className='item';
  const info=document.createElement('div'),name=document.createElement('strong'),detail=document.createElement('small');
  name.textContent=examNames.get(String(r.examen_id))||'Examen '+r.examen_id;
  const date=new Date(r.fecha);
  detail.textContent=(Number.isNaN(date.getTime())?'':date.toLocaleString('es-ES')+' · ')+r.aciertos+'/'+r.total+' aciertos';
  const grade=document.createElement('strong');grade.textContent=Number(r.nota).toFixed(1).replace(/\\.0$/,'')+'%';grade.className='exam-grade';
  info.append(name,detail);el.append(info,grade);box.append(el);
 }
 if(scores.length)profilePaginate(box,[...box.children],8);
 if(!scores.length)box.textContent='Aún no tienes resultados guardados. Empieza tu primer examen.';
 await loadLearningStrengths(scores,activeUserId);
 if(examResponse.error){const p=document.createElement('p');p.className='muted';p.textContent='No se pudieron cargar los títulos de los exámenes.';box.append(p)}
}
function renderAchievements(){
 const definitions=[
  {name:'Primera lectura',icon:'📖',key:'reads',target:1,description:'Leer un artículo'},
  {name:'Lector constante',icon:'📚',key:'reads',target:10,description:'Completar 10 lecturas'},
  {name:'Primer paso B2',icon:'🧩',key:'course',target:1,description:'Estudiar una unidad'},
  {name:'Diez unidades',icon:'🎯',key:'course',target:10,description:'Marcar 10 unidades'},
  {name:'Ruta B2 completa',icon:'🏆',key:'course',target:44,description:'Marcar 44 unidades'},
  {name:'Primer examen',icon:'✎',key:'exams',target:1,description:'Realizar un examen'},
  {name:'Experiencia en exámenes',icon:'💡',key:'exams',target:10,description:'Realizar 10 exámenes'},
  {name:'Semana constante',icon:'🔥',key:'streak',target:7,description:'Mantener 7 días seguidos'}
 ];
 const container=$('achievementList');container.replaceChildren();
 let unlocked=0;
 for(const item of definitions){
  const value=achievementProgress[item.key];
  const ready=typeof value==='number';
  const done=ready&&value>=item.target;
  if(done)unlocked++;
  const card=document.createElement('div');card.className='ee-achievement'+(done?' is-unlocked':'');
  const symbol=document.createElement('span');symbol.className='ee-achievement-symbol';symbol.textContent=item.icon;symbol.setAttribute('aria-hidden','true');
  const body=document.createElement('div'),name=document.createElement('strong'),hint=document.createElement('small'),count=document.createElement('span');
  name.textContent=item.name;hint.textContent=item.description;
  count.className='ee-achievement-count';count.textContent=ready?(done?'✓ Conseguido':value+' / '+item.target):'Consultando…';
  body.append(name,hint,count);card.append(symbol,body);container.append(card);
 }
 $('achievementStatus').textContent=unlocked+' de '+definitions.length+' logros conseguidos. La finalización de unidades se marca manualmente.';
 $('personalCertificate').hidden=achievementProgress.course===null||achievementProgress.course<44;
}
function weeklyMonday() {
 const monday=new Date();
 monday.setHours(0,0,0,0);
 monday.setDate(monday.getDate()-((monday.getDay()+6)%7));
 return monday.toISOString();
}
function resetWeeklyGoal() {
 $('weeklyGoalType').value='unidades';$('weeklyGoalTarget').value='3';
 $('weeklyGoalScore').textContent='—';
 $('weeklyGoalLabel').textContent='Elige una meta semanal';
 $('weeklyGoalBar').style.width='0%';
 $('weeklyGoalMeter').setAttribute('aria-valuenow','0');
 $('weeklyGoalStatus').textContent='Puedes guardar tu meta personal para empezar.';
 $('homeWeeklyGoal').textContent='Configurar mi objetivo semanal →';
}
async function loadWeeklyGoal(owner) {
 resetWeeklyGoal();
 $('weeklyGoalStatus').textContent='Consultando tu objetivo semanal…';
 const {data,error}=await eeDb.from('objetivos_semanales').select('tipo,cantidad').eq('usuario_id',owner).maybeSingle();
 if(!user||user.id!==owner)return;
 if(error)throw error;
 if(!data){$('weeklyGoalStatus').textContent='No has definido un objetivo. Elige una meta y pulsa «Guardar objetivo».';return;}
 $('weeklyGoalType').value=data.tipo;
 $('weeklyGoalTarget').value=String(data.cantidad);
 const table=data.tipo==='unidades'?'progreso_curso':data.tipo==='examenes'?'resultados':'actividad_intentos';
 const dateField=data.tipo==='unidades'?'completada_en':'fecha';
 let query=eeDb.from(table).select('*',{count:'exact',head:true}).eq('usuario_id',owner).gte(dateField,weeklyMonday());
 if(data.tipo==='unidades')query=query.eq('estado','completada');
 const result=await query;
 if(!user||user.id!==owner)return;
 if(result.error)throw result.error;
 const count=result.count??0;
 const percentage=Math.min(100,Math.round(count/data.cantidad*100));
 $('weeklyGoalScore').textContent=count+' / '+data.cantidad;
 $('weeklyGoalLabel').textContent=data.tipo==='unidades'?'Unidades esta semana':data.tipo==='examenes'?'Exámenes esta semana':'Actividades esta semana';
 $('weeklyGoalBar').style.width=percentage+'%';
 $('weeklyGoalMeter').setAttribute('aria-valuenow',String(percentage));
 $('weeklyGoalStatus').textContent=count>=data.cantidad?'¡Objetivo semanal alcanzado!':'Te quedan '+(data.cantidad-count)+' para completar tu meta. Se reinicia cada lunes.';
 $('homeWeeklyGoal').textContent='Objetivo semanal: '+count+' de '+data.cantidad+' →';
}
$('weeklyGoalForm').onsubmit=async event=>{
 event.preventDefault();
 if(!user||!$('weeklyGoalForm').reportValidity())return;
 const owner=user.id,button=$('weeklyGoalSave');
 const tipo=$('weeklyGoalType').value,cantidad=Number($('weeklyGoalTarget').value);
 if(!['unidades','examenes','actividades'].includes(tipo)||!Number.isInteger(cantidad)||cantidad<1||cantidad>20)return;
 button.disabled=true;
 $('weeklyGoalStatus').textContent='Guardando tu objetivo…';
 try{
  const {error}=await eeDb.from('objetivos_semanales').upsert({usuario_id:owner,tipo,cantidad,actualizado_en:new Date().toISOString()},{onConflict:'usuario_id'});
  if(error)throw error;
  if(user?.id===owner)await loadWeeklyGoal(owner);
 }catch(error){if(user?.id===owner)$('weeklyGoalStatus').textContent='No se pudo guardar el objetivo: '+error.message}
 finally{button.disabled=false}
};
async function loadSavedResources(owner) {
 favoritesReady=false;
 const list=$('favoritesList');
 list.textContent='Consultando tus guardados…';
 const [saved,units,posts]=await Promise.all([
  eeDb.from('recursos_guardados').select('tipo,referencia,guardado_en').eq('usuario_id',owner).order('guardado_en',{ascending:false}).limit(200),
  eeDb.from('unidades_curso').select('slug,titulo,orden').eq('publicado',true),
  eeDb.from('articulos').select('slug,titulo')
 ]);
 if(!user||user.id!==owner)return;
 if(saved.error)throw saved.error;
 if(units.error)throw units.error;
 if(posts.error)throw posts.error;
 savedFavorites=new Set((saved.data||[]).map(x=>x.tipo+':'+x.referencia));
 favoritesReady=true;
 const unitMap=new Map((units.data||[]).map(x=>[x.slug,x]));
 const articleMap=new Map((posts.data||[]).map(x=>[x.slug,x]));
 const records=saved.data||[];
 $('favoritesCount').textContent=String(records.length);
 list.replaceChildren();
 for(const row of records) {
  const item=document.createElement('div');item.className='item ee-saved-item';
  const desc=document.createElement('div');
  const link=document.createElement('a');
  const catalog=row.tipo==='unidad'?unitMap.get(row.referencia):articleMap.get(row.referencia);
  const label=catalog?.titulo||row.referencia;
  link.textContent=(row.tipo==='unidad'?'📘 ':'📖 ')+label;
  link.href=row.tipo==='unidad'?(catalog?'/curso.html#unidad-'+String(catalog.orden).padStart(2,'0'):'/curso.html'):'/leer.html?slug='+encodeURIComponent(row.referencia);
  const hint=document.createElement('small');hint.textContent=row.tipo==='unidad'?'Unidad B2':'Artículo';
  desc.append(link,hint);
  const remove=document.createElement('button');remove.type='button';
  remove.textContent='Quitar';remove.setAttribute('aria-label','Quitar de favoritos: '+label);
  remove.onclick=()=>{void toggleSavedResource(row.tipo,row.referencia)};
  item.append(desc,remove);list.append(item);
 }
 if(records.length)profilePaginate(list,[...list.children],8);
 $('favoritesStatus').textContent=records.length
  ?'Tienes '+records.length+' recursos guardados. Puedes abrirlos o quitarlos cuando quieras.'
  :'Todavía no has guardado recursos. Usa ☆ Guardar en las unidades o los artículos.';
 render();
}
async function toggleSavedResource(tipo,referencia) {
 if(!user||!favoritesReady||!referencia)return;
 const owner=user.id,key=tipo+':'+referencia,already=savedFavorites.has(key);
 favoritesReady=false;
 try{
  const query=eeDb.from('recursos_guardados');
  const {error}=already
   ?await query.delete().eq('usuario_id',owner).eq('tipo',tipo).eq('referencia',referencia)
   :await query.insert({usuario_id:owner,tipo,referencia});
  if(error)throw error;
  if(user?.id===owner)await loadSavedResources(owner);
 }catch(error){
  if(user?.id===owner)$('favoritesStatus').textContent='No se pudo actualizar el favorito: '+error.message;
 }finally{
  if(user?.id===owner){favoritesReady=true;render()}
 }
}
async function loadCourseProgress(userId) {
 const statusBox=$('courseProfileStatus');
 statusBox.textContent='Consultando las unidades y tu progreso guardado…';
 const [catalog,marked]=await Promise.all([
  eeDb.from('unidades_curso').select('slug,orden,titulo').eq('publicado',true).order('orden'),
  eeDb.from('progreso_curso').select('unidad_slug,estado').eq('usuario_id',userId)
 ]);
 if(catalog.error)throw catalog.error;
 if(marked.error)throw marked.error;
 if(!user||user.id!==userId)return;
 const units=catalog.data||[];
 const completed=new Set((marked.data||[]).filter(row=>row.estado==='completada').map(row=>row.unidad_slug));
 const started=new Set((marked.data||[]).filter(row=>row.estado==='en_curso').map(row=>row.unidad_slug));
 const done=units.filter(row=>completed.has(row.slug)).length;
 const inProgress=units.filter(row=>started.has(row.slug)).length;
 const pct=units.length?Math.round(100*done/units.length):0;
 $('courseProfileDone').textContent=String(done);
 $('courseProfileStarted').textContent=String(inProgress);
 $('courseProfilePending').textContent=String(units.length-done-inProgress);
 $('courseProfilePercent').textContent=pct+'%';
 $('homeCoursePercent').textContent=pct+'%';
 achievementProgress.course=done;renderAchievements();
 $('courseProfileBar').style.width=pct+'%';
 $('courseProfileMeter').setAttribute('aria-valuenow',String(pct));
 statusBox.textContent=units.length
  ?done+' completadas · '+inProgress+' en curso · '+(units.length-done-inProgress)+' pendientes. No es una nota de examen.'
  :'Todavía no hay unidades publicadas.';
 const next=units.find(row=>started.has(row.slug))||units.find(row=>!completed.has(row.slug));
 $('homeNextTitle').textContent=next?(started.has(next.slug)?'En curso: unidad ':'Siguiente: unidad ')+String(next.orden).padStart(2,'0'):'¡Ruta B2 completada!';
 $('homeNextDescription').textContent=next?String(next.titulo||'Continúa donde lo dejaste.'):'Has marcado todas las unidades como estudiadas. Puedes repasarlas cuando quieras.';
 $('homeContinue').href=next?'/curso.html#unidad-'+String(next.orden).padStart(2,'0'):'/curso.html';
 $('homeContinue').textContent=next?'Continuar curso →':'Repasar unidades →';
 $('courseProfileContinue').href=next?'/curso.html#unidad-'+String(next.orden).padStart(2,'0'):'/curso.html';
 $('courseProfileContinue').textContent=next?'Continuar: unidad '+String(next.orden).padStart(2,'0')+' →':'Revisar todas las unidades ✓';
}
async function changeUser(next){
 readingPages.read=1;readingPages.pending=1;
 user=next;
 suggestedHref=null;cloudUserId=null;
 savedFavorites=new Set();favoritesReady=false;
 achievementProgress={reads:null,course:null,exams:null,streak:null};renderAchievements();
 $('favoritesCount').textContent='0';$('favoritesList').replaceChildren();
 $('favoritesStatus').textContent='Consultando tus recursos guardados…';
 $('learningStatus').textContent='Consultando tu progreso…';$('learningActivityHistory').replaceChildren();
 $('learningReads').textContent='—';$('learningExams').textContent='—';$('learningActivities').textContent='—';$('learningErrors').textContent='—';
 $('courseProfileDone').textContent='—';$('courseProfileStarted').textContent='—';$('courseProfilePending').textContent='—';$('courseProfilePercent').textContent='—';
 $('homeCoursePercent').textContent='—';$('homeExamCount').textContent='—';$('homeErrorCount').textContent='—';$('homeReadingCount').textContent='—';
 $('homeNextTitle').textContent='Tu próxima unidad';$('homeNextDescription').textContent='Buscando dónde continuar en el curso…';
 $('homeContinue').href='/curso.html#unidad-01';$('homeContinue').textContent='Continuar curso →';
 resetWeeklyGoal();
 $('recentExam7').textContent='—';$('recentExam30').textContent='—';$('recentAverage30').textContent='—';$('recentActivities30').textContent='—';
 $('courseProfileBar').style.width='0%';$('courseProfileMeter').setAttribute('aria-valuenow','0');
 $('authLayout').hidden=!!user||recoveryLinkVerified;
  $('accountStatus').hidden=!!user||recoveryLinkVerified;
  if(user)$('accountStatus').textContent='';
 $('privateDashboard').hidden=!user||recoveryLinkVerified;
 $('continueLink').hidden=!user;
 $('authForm').hidden=!!user;
 $('signout').hidden=!user;
 $('accountActions').hidden=!user;
 dashboardStatus.hidden=true;dashboardStatus.textContent='';
 $('accountHint').textContent='Inicia sesión para sincronizar tu nombre, lecturas y resultados entre dispositivos.';
 if(!user){$('deleteAccountPanel').hidden=true;$('deleteConfirm').value='';$('confirmDeleteAccount').disabled=true;}
 if(user){
   profile={name:'',read:{}};
   render();
   const courseUserId=user.id;
   void loadSavedResources(courseUserId).catch(e=>{if(user?.id===courseUserId)$('favoritesStatus').textContent='No se pudieron cargar los favoritos: '+e.message});
   void loadWeeklyGoal(courseUserId).catch(e=>{if(user?.id===courseUserId)$('weeklyGoalStatus').textContent='No se pudo cargar el objetivo: '+e.message});
   void loadCourseProgress(courseUserId).catch(e=>{
    if(user?.id===courseUserId)$('courseProfileStatus').textContent='No se pudo cargar el progreso del curso: '+e.message;
   });
   try{await loadCloud()}catch(e){$('readingPickStatus').textContent='No se pudieron consultar tus lecturas guardadas.';status('Conectado, pero no se pudo cargar tu perfil: '+e.message)}
 }else{
   // No mostrar datos privados ni lecturas locales en ausencia de sesión.
   profile={name:'',read:{}};
   render();
   status('Inicia sesión para ver tus estadísticas, lecturas y resultados.');
 }
}


/* Supabase JS gestiona la persistencia y renovación de los tokens.
   Nunca almacenamos access_token, refresh_token o contraseñas por nuestra cuenta. */
function authMessage(message,isError=false){
  const box=$('accountStatus');
  box.textContent=message;
  box.dataset.error=String(isError);
  box.hidden=false;
}
function readableAuthError(err){
  const m=String(err?.message||'No se pudo conectar con el servicio de acceso.');
  if(/invalid login credentials/i.test(m))return 'Correo o contraseña incorrectos, o correo sin confirmar.';
  if(/email not confirmed/i.test(m))return 'Confirma tu correo electrónico antes de entrar.';
  if(/rate limit|too many requests/i.test(m))return 'Demasiados intentos. Inténtalo más tarde.';
  return m;
}
async function verifiedUser(){
  const {data,error}=await eeDb.auth.getUser();
  if(error)throw error;
  if(!data?.user)throw new Error('No se pudo verificar el token de sesión.');
  if(user?.id!==data.user.id)await changeUser(data.user);
}
$('authForm').onsubmit=async e=>{
  e.preventDefault();
  if(!$('authForm').reportValidity())return;
  const button=$('loginSubmit');button.disabled=true;
  authMessage('Comprobando credenciales…');
  try{
    const {error}=await eeDb.auth.signInWithPassword({
      email:$('authEmail').value.trim().toLowerCase(),password:$('authPass').value
    });
    if(error)throw error;
    await verifiedUser();
    status('Sesión iniciada correctamente.');
  }catch(error){authMessage('No se pudo iniciar sesión: '+readableAuthError(error),true)}
  finally{$('authPass').value='';button.disabled=false}
};
$('registerForm').onsubmit=async e=>{
  e.preventDefault();
  if(!$('registerForm').reportValidity())return;
  const password=$('registerPass').value;
  if(password!==$('registerConfirm').value){
    $('registerConfirm').setCustomValidity('Las contraseñas no coinciden.');
    $('registerConfirm').reportValidity();return;
  }
  const button=$('register');button.disabled=true;
  authMessage('Registrando cuenta…');
  try{
    const {data,error}=await eeDb.auth.signUp({
      email:$('registerEmail').value.trim().toLowerCase(),
      password,
      options:{emailRedirectTo:location.origin+'/perfil.html'}
    });
    if(error)throw error;
    if(data?.session){
      await verifiedUser();
      status('Cuenta creada y sesión iniciada.');
    }else authMessage('Solicitud recibida. Si se requiere confirmación, revisa tu correo electrónico, incluido spam.');
  }catch(error){authMessage('No se pudo completar el registro: '+readableAuthError(error),true)}
  finally{$('registerPass').value='';$('registerConfirm').value='';button.disabled=false}
};
$('registerConfirm').addEventListener('input',()=> $('registerConfirm').setCustomValidity(''));
$('registerPass').addEventListener('input',()=> $('registerConfirm').setCustomValidity(''));
// Flujo de recuperación separado del acceso y con mensajes dentro del formulario.
const recoveryRequest=$('passwordResetRequest'), recoveryRequestStatus=$('passwordResetRequestStatus');
$('forgotPassword').onclick=()=>{
 const opening=recoveryRequest.hidden;
 recoveryRequest.hidden=!opening;
 $('forgotPassword').setAttribute('aria-expanded',String(opening));
 if(opening){
  const previous=$('authEmail').value.trim();
  if(previous&&!$('passwordResetEmail').value)$('passwordResetEmail').value=previous;
  $('passwordResetEmail').focus();
 }
};
$('passwordResetRequestForm').onsubmit=async e=>{
 e.preventDefault();
 if(!$('passwordResetRequestForm').reportValidity())return;
 const email=$('passwordResetEmail').value.trim().toLowerCase();
 const button=$('passwordResetRequestSubmit');
 button.disabled=true;recoveryRequestStatus.textContent='Enviando enlace de recuperación…';
 try{
  const {error}=await eeDb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/perfil.html'});
  if(error)throw error;
  recoveryRequestStatus.textContent='Si existe una cuenta con ese correo, recibirás un enlace para cambiar la contraseña. Revisa también la carpeta de spam. El enlace puede caducar; utiliza el más reciente.';
 }catch(error){
  recoveryRequestStatus.textContent='No se pudo enviar el correo: '+readableAuthError(error);
 }finally{button.disabled=false}
};
let recoveryLinkVerified=false;
const recoveryPanel=$('passwordRecoveryPanel'), recoveryStatus=$('passwordRecoveryStatus');
function showRecovery(){
 recoveryLinkVerified=true;
 recoveryPanel.hidden=false;
 $('authLayout').hidden=true;
 $('privateDashboard').hidden=true;
 $('accountStatus').hidden=true;
 recoveryStatus.textContent='Enlace comprobado. Escribe y confirma tu nueva contraseña.';
 $('passwordRecoveryValue').focus();
 recoveryPanel.scrollIntoView({block:'start',behavior:'smooth'});
}
// El enlace puede llegar con type=recovery en hash, o el evento PASSWORD_RECOVERY.
const hashParams=new URLSearchParams(location.hash.slice(1));
const queryParams=new URLSearchParams(location.search);
const recoveryLink=hashParams.get('type')==='recovery'||queryParams.get('type')==='recovery';
const linkError=hashParams.get('error_description')||queryParams.get('error_description');
if(linkError){
 recoveryRequest.hidden=false;
 $('forgotPassword').setAttribute('aria-expanded','true');
 recoveryRequestStatus.textContent='El enlace de recuperación ha caducado o no es válido. Solicita otro desde aquí.';
}
$('passwordRecoveryForm').onsubmit=async e=>{
 e.preventDefault();
 if(!recoveryLinkVerified){
  recoveryStatus.textContent='Primero abre el enlace de recuperación que recibiste por correo.';
  return;
 }
 const pass=$('passwordRecoveryValue').value;
 const confirmation=$('passwordRecoveryConfirm').value;
 if(pass!==confirmation){
  recoveryStatus.textContent='Las contraseñas no coinciden.';
  $('passwordRecoveryConfirm').focus();
  return;
 }
 if(!$('passwordRecoveryForm').reportValidity())return;
 const button=$('passwordRecoverySubmit');
 button.disabled=true;recoveryStatus.textContent='Guardando la nueva contraseña…';
 try{
  const {error}=await eeDb.auth.updateUser({password:pass});
  if(error)throw error;
  recoveryLinkVerified=false;
  recoveryPanel.hidden=true;
  $('passwordRecoveryValue').value='';
  $('passwordRecoveryConfirm').value='';
  history.replaceState(null,'',location.pathname);
  // Evita dejar al navegador mostrando el formulario de acceso previo tras el cambio.
  const {data}=await eeDb.auth.getUser();
  if(data?.user)await changeUser(data.user);
  status('Contraseña actualizada correctamente. Ya puedes acceder con tu nueva contraseña.');
  // La contraseña nueva no debe permanecer en un campo oculto.
 }catch(error){recoveryStatus.textContent='No se pudo actualizar la contraseña: '+readableAuthError(error);}
 finally{button.disabled=false}
};
$('passwordRecoveryConfirm').addEventListener('input',()=>{if(recoveryStatus.textContent==='Las contraseñas no coinciden.')recoveryStatus.textContent=''});
$('exportAccountData').onclick=async()=>{
 if(!user)return;
 const owner=user.id,button=$('exportAccountData'),label=$('exportAccountStatus');
 button.disabled=true;
 label.textContent='Preparando tu historial de aprendizaje…';
 try {
  const {data:auth,error:authError}=await eeDb.auth.getUser();
  if(authError)throw authError;
  if(!auth?.user||auth.user.id!==owner)throw new Error('Inicia sesión de nuevo para exportar los datos.');
  // Cada consulta está restringida al usuario y se aplica la seguridad RLS de Supabase.
  const tables=[
   ['perfiles','usuario_id'],['lecturas','usuario_id'],['resultados','usuario_id'],
   ['preguntas_falladas','usuario_id'],['actividad_diaria','usuario_id'],
   ['actividad_intentos','usuario_id'],['actividad_fallos','usuario_id'],
   ['examenes_lecturas','usuario_id'],['writing_borradores','usuario_id'],
   ['progreso_curso','usuario_id'],['objetivos_semanales','usuario_id'],
   ['recursos_guardados','usuario_id'],['vocabulario_preferencias','user_id'],
   ['vocabulario_progreso','user_id'],['perfiles_publicos','usuario_id'],
   ['diagnosticos_b2','usuario_id'],['planes_estudio_b2','usuario_id'],
   ['sesiones_estudio_b2','usuario_id'],['simulacros_b2','usuario_id']
  ];
  const datos={};
  for(const [name,ownerColumn] of tables){
   const values=[];
   for(let start=0;;start+=1000){
    const {data,error}=await eeDb.from(name).select('*').eq(ownerColumn,owner).range(start,start+999);
    if(error)throw new Error('No se pudo exportar '+name+': '+error.message);
    values.push(...(data||[]));
    if((data||[]).length<1000)break;
   }
   datos[name]=values;
   if(!user||user.id!==owner)throw new Error('La sesión cambió durante la exportación.');
  }
  const today=new Date().toISOString().slice(0,10);
  const payload={servicio:'Easy English',tipo:'Exportación personal de aprendizaje',
   exportado_en:new Date().toISOString(),usuario_id:owner,datos};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;link.download='easyenglish-aprendizaje-'+today+'.json';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),3000);
  label.textContent='Archivo preparado. Comprueba la carpeta de descargas de tu navegador. Guárdalo en un lugar privado.';
 }catch(error){
  label.textContent='No se pudo exportar el historial: '+error.message;
 }finally{button.disabled=false}
};
async function logOut(){const {error}=await eeDb.auth.signOut();if(error)return status('Error: '+error.message);try{sessionStorage.removeItem('easyenglish:openai:temporary:v1')}catch(e){}await changeUser(null);status('Has cerrado sesión.')}$('signout').onclick=logOut;
$('showDeleteAccount').onclick=()=>{$('deleteAccountPanel').hidden=false;$('deleteConfirm').value='';$('confirmDeleteAccount').disabled=true;$('deleteAccountPanel').scrollIntoView({behavior:'smooth',block:'nearest'})};
$('cancelDeleteAccount').onclick=()=>{$('deleteAccountPanel').hidden=true;$('deleteConfirm').value='';$('deleteAccountStatus').textContent=''};
$('deleteConfirm').oninput=()=>{$('confirmDeleteAccount').disabled=$('deleteConfirm').value.trim()!=='ELIMINAR MI CUENTA'};
$('confirmDeleteAccount').onclick=async()=>{if(!user||$('deleteConfirm').value.trim()!=='ELIMINAR MI CUENTA')return;if(!confirm('Vas a borrar tu cuenta, tus lecturas y todas tus notas definitivamente. ¿Continuar?'))return;const button=$('confirmDeleteAccount');button.disabled=true;$('deleteAccountStatus').textContent='Eliminando cuenta…';try{const {data,error}=await eeDb.functions.invoke('eliminar-mi-cuenta',{body:{confirmation:'ELIMINAR MI CUENTA'}});if(error)throw error;if(!data?.success)throw Error(data?.error||'No se ha confirmado la eliminación');await eeDb.auth.signOut();$('deleteAccountPanel').hidden=true;$('deleteConfirm').value='';await changeUser(null);status('Tu cuenta se ha eliminado definitivamente.')}catch(e){$('deleteAccountStatus').textContent='No se pudo eliminar la cuenta: '+e.message;button.disabled=false}};
$('saveName').onclick=async()=>{const name=$('studentName').value.trim().slice(0,50);try{if(user){const {error}=await eeDb.from('perfiles').upsert({usuario_id:user.id,nombre:name,actualizado_en:new Date().toISOString()});if(error)throw error}else{profile.name=name;localSave()}profile.name=name;render();status(user?'Nombre guardado en Supabase.':'Nombre guardado en este navegador.')}catch(e){status('Error al guardar: '+e.message)}};
$('studentName').onkeydown=e=>{if(e.key==='Enter')$('saveName').click()};
$('articleSearch').oninput=()=>{readingPages.read=1;readingPages.pending=1;render();};
for(const [id,view] of [['showAllArticles','all'],['onlyPending','pending'],['onlyRead','read']])
 $(id).onclick=()=>{articleView=view;render()};
$('readingPickAnother').onclick=()=>updateSuggestedReading(true);
$('readingPickMark').onclick=async()=>{
 if(!user||!suggestedHref||loading)return;
 const activeId=user.id,href=suggestedHref,button=$('readingPickMark');
 loading=true;button.disabled=true;
 try{
  const when=new Date().toISOString();
  const {error}=await eeDb.from('lecturas').upsert({usuario_id:activeId,articulo_url:href,leido_en:when});
  if(error)throw error;
  if(!user||user.id!==activeId)return;
  profile.read[href]=when;
  suggestedHref=null;
  render();
 }catch(e){status('No se pudo guardar la lectura: '+e.message)}
 finally{loading=false;button.disabled=false}
};
$('resetProfile').onclick=async()=>{if(!confirm('¿Eliminar tu nombre y progreso de lectura? Las notas no se borrarán.'))return;try{if(user){const a=await eeDb.from('lecturas').delete().eq('usuario_id',user.id);if(a.error)throw a.error;const b=await eeDb.from('perfiles').upsert({usuario_id:user.id,nombre:''});if(b.error)throw b.error;await loadCloud();status('Perfil sincronizado reiniciado.')}else{profile={name:'',read:{}};localSave();render()}}catch(e){status('Error al reiniciar: '+e.message)}};
eeDb.from('articulos').select('ruta,slug,titulo').order('titulo').then(({data,error})=>{if(error)throw error;articles=(data||[]).filter(a=>/^post\/[a-z0-9-]+\.html$/.test(a.ruta)).map(a=>({href:a.ruta,link:'leer.html?slug='+encodeURIComponent(a.slug),title:(a.titulo||a.slug).replace(/\s*[·|–-]\s*Easy English\s*$/i,''),slug:a.slug}));articlesLoaded=true;render()}).catch(e=>{$('readingPickStatus').textContent='No se pudo cargar el catálogo de artículos.';status('No se pudo cargar la biblioteca desde Supabase: '+e.message)});
// Renovaciones de token, cierres de sesión y cambios entre pestañas.
let authRevision=0;
eeDb.auth.onAuthStateChange((event)=>{
  if(event==='PASSWORD_RECOVERY'){
    showRecovery();
    return;
  }
  if(recoveryLink&&event==='SIGNED_IN'){
    showRecovery();
    return;
  }
  if(recoveryLinkVerified&&event==='SIGNED_OUT'){
    recoveryLinkVerified=false;
    recoveryPanel.hidden=true;
    authMessage('El enlace ha caducado. Solicita uno nuevo desde «¿Has olvidado tu contraseña?».',true);
  }
  if(!['SIGNED_IN','SIGNED_OUT','TOKEN_REFRESHED','USER_UPDATED'].includes(event))return;
  const version=++authRevision;
  // No llamar a getUser dentro del callback síncrono de Supabase Auth.
  setTimeout(async()=>{
    try{
      const {data,error}=await eeDb.auth.getUser();
      if(version!==authRevision)return;
      if(error&&error.name!=='AuthSessionMissingError')throw error;
      if((user?.id||null)!==(data?.user?.id||null))await changeUser(data?.user||null);
    }catch(error){
      if(version!==authRevision)return;
      await changeUser(null);
      authMessage('Tu sesión ha expirado o no se ha podido validar. Vuelve a entrar.',true);
    }
  },0);
});
eeDb.auth.getUser().then(({data,error})=>{
  if(error&&error.name!=='AuthSessionMissingError'){
    changeUser(null);authMessage('No se pudo comprobar la sesión: '+readableAuthError(error),true);return;
  }
  changeUser(data?.user||null).then(()=>{
    if(recoveryLink&&data?.user)showRecovery();
  });
}).catch(error=>{changeUser(null);authMessage('No se pudo comprobar la sesión: '+readableAuthError(error),true)});
})();
