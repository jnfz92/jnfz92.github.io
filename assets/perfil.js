/* Lógica de la cuenta, inicio de sesión, lecturas y progreso del perfil. */
(()=>{
'use strict';
const $=id=>document.getElementById(id), key='easyEnglish.blogProfile.v1';
let user=null,articles=[],articleView='all',loading=false,articlesLoaded=false,cloudUserId=null,suggestedHref=null;
const READING_PAGE_SIZE=10;
const readingPages={read:1,pending:1};
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
const highlights=document.createElement('div');
highlights.className='profile-highlights';
highlights.append(
 $('streakTitle').closest('.panel'),
 $('examHistory').closest('.panel'),
 $('readMeter').closest('.panel')
);
$('privateDashboard').replaceChildren(
 dashboardStatus,
 document.querySelector('.ee-reading-pick'),
 $('nameTitle').closest('.panel'),
 document.querySelector('#reviewPreferencesTitle').closest('.panel'),
  document.querySelector('.ee-learning-overview'),
 highlights,
 $('articleList').closest('.panel'),
 document.querySelector('a[href="comunidad.html"]').closest('.panel'),
 $('resetProfile').closest('.panel'),
 $('accountActions')
);
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
function header(){$('studentName').value=profile.name;$('greeting').textContent=profile.name?'¡Hola, '+profile.name+'!':'Añade tu nombre para personalizar tu espacio.'}
function render(){
 header();
 const total=articles.length,done=articles.filter(a=>profile.read[a.href]).length,pending=total-done;
 const ready=articlesLoaded&&(!user||cloudUserId===user.id);
 const pct=total?Math.round(done/total*100):0;
 $('readStat').textContent=ready?String(done):'—';
 $('learningReads').textContent=cloudUserId===user?.id?String(done):'—';
 $('totalStat').textContent=articlesLoaded?String(total):'—';
 $('percentageStat').textContent=ready?pct+'%':'—';
 $('readBar').style.width=ready?pct+'%':'0%';
 $('readMeter').setAttribute('aria-valuenow',String(ready?pct:0));
 $('readProgressText').textContent=ready?done+' de '+total+' artículos completados ('+pct+'%).':
  'Consultando tus lecturas guardadas…';
 $('readArticlesCount').textContent=ready?String(done):'—';
 $('pendingArticlesCount').textContent=ready?String(pending):'—';
 for(const [id,view] of [['showAllArticles','all'],['onlyPending','pending'],['onlyRead','read']])
  $(id).setAttribute('aria-pressed',String(articleView===view));
 const root=$('articleList');root.replaceChildren();
 if(!ready){
  $('articleBrowseCount').textContent='Cargando tu biblioteca…';
  const wait=document.createElement('p');wait.className='muted';
  wait.textContent='Comprobando qué artículos has leído.';
  root.append(wait);updateSuggestedReading();return;
 }
 const term=$('articleSearch').value.trim().toLocaleLowerCase('es');
 const filtered=articles.filter(a=>!term||a.title.toLocaleLowerCase('es').includes(term));
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
   small.textContent=completed?'✓ Leído'+(date?' · '+date:''):'◯ Pendiente de leer';
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
   row.append(detail,btn);list.append(row);
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
async function loadCloud(){if(!user)return;const activeId=user.id;const [p,l]=await Promise.all([eeDb.from('perfiles').select('nombre').eq('usuario_id',activeId).maybeSingle(),eeDb.from('lecturas').select('articulo_url,leido_en').eq('usuario_id',activeId)]);if(!user||user.id!==activeId)return;if(p.error)throw p.error;if(l.error)throw l.error;profile={name:p.data?.nombre||'',read:Object.fromEntries((l.data||[]).map(r=>[r.articulo_url,r.leido_en]))};cloudUserId=activeId;render();await Promise.all([results(),loadStreak(),loadLearningOverview(),loadActivityCalendar(activeId)])}
async function loadLearningOverview(){
 if(!user)return;
 const owner=user.id,box=$('learningActivityHistory');
 $('learningExams').textContent='—';$('learningActivities').textContent='—';
 $('learningErrors').textContent='—';box.textContent='Consultando actividades…';
 $('learningStatus').textContent='Consultando tu progreso en exámenes, actividades y errores…';
 const [exams,activityCount,attempts,classicErrors,activityErrors,available]=await Promise.all([
   eeDb.from('resultados').select('id',{count:'exact',head:true}).eq('usuario_id',owner),
   eeDb.from('actividad_intentos').select('id',{count:'exact',head:true}).eq('usuario_id',owner),
   eeDb.from('actividad_intentos').select('actividad_id,aciertos,evaluables,pendientes_revision,fecha')
     .eq('usuario_id',owner).order('fecha',{ascending:false}).limit(8),
   eeDb.from('preguntas_falladas').select('pregunta_id',{count:'exact',head:true})
     .eq('usuario_id',owner).eq('dominada',false),
   eeDb.from('actividad_fallos').select('pregunta_id',{count:'exact',head:true})
     .eq('usuario_id',owner).eq('dominada',false),
   eeDb.from('actividades').select('id,titulo,slug')
 ]);
 if(!user||user.id!==owner)return;
 const errors=[exams.error,activityCount.error,attempts.error,classicErrors.error,activityErrors.error,available.error].filter(Boolean);
 if(errors.length){
   $('learningStatus').textContent='No se pudo obtener todo tu progreso: '+errors[0].message;
   box.textContent='Vuelve a cargar tu perfil para consultar tus actividades.';
   return;
 }
 $('learningExams').textContent=String(exams.count??0);
 $('learningActivities').textContent=String(activityCount.count??0);
 const pending=(classicErrors.count??0)+(activityErrors.count??0);
 $('learningErrors').textContent=String(pending);
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
 if(!(attempts.data||[]).length)box.textContent='Todavía no has entregado actividades interactivas.';
}
async function loadStreak(){if(!user)return;const {data,error}=await eeDb.rpc('racha_actual');if(error){$('streakMessage').textContent='No se pudo cargar la racha: '+error.message;return}const r=Array.isArray(data)?data[0]:data;if(!r)return;$('streakCurrent').textContent=String(r.racha||0);$('streakBest').textContent=String(r.mejor_racha||0);$('streakDays').textContent=String(r.dias_total||0);$('streakMessage').textContent=r.hoy_completado?'✅ ¡Has cumplido tu objetivo de hoy!':'Completa hoy una lección o un examen para mantener tu racha.'}
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
  if(heading==='Lo que debo corregir'){const a=profileNode('a','Generar examen de '+v.topic);a.href='practicar.html?repaso=fallos&tema='+encodeURIComponent(v.topic);a.style.cssText='display:inline-block;margin:8px 0 4px;color:#176449;font-size:14px;font-weight:800;text-decoration:underline';wrap.append(a)}
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
 if(!document.getElementById('calendar-style')){const css=profileNode('style');css.id='calendar-style';css.textContent='.calendar-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px;max-width:400px;margin:15px 0}.calendar-day{height:25px;border:1px solid #d9e6dc;border-radius:6px;background:#e6ede7}.calendar-active{background:#278458;border-color:#278458}';document.head.append(css)}
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
 ring.style.cssText='margin:12px auto;width:135px;height:135px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(#278458 '+accuracy+'%,#dce8de '+accuracy+'%);position:relative';
 const middle=profileNode('strong',accuracy+'%');
 middle.style.cssText='background:white;border-radius:50%;width:100px;height:100px;display:grid;place-items:center;font-size:28px;color:#176449';
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
  progress.style.width=priority.percent+'%';progress.style.background='#278458';goal.append(progress);
  objective.append(goal,profileNode('p','Objetivo recomendado: alcanzar al menos el 70 % de aciertos en este tema.','muted'));
 }
 const action=profileNode('a','Practicar ahora ↗');action.href='practicar.html';objective.append(action);panel.append(objective);
 panel.append(profileNode('p','Análisis de '+attempts+' intentos recientes con clasificación de temas revisada. Solo se clasifican las preguntas verificadas; no se infieren categorías ambiguas. Mínimo 3 respuestas por tema para valorar fortalezas y dificultades.','muted'));
 profileBars(panel,'Mis puntos fuertes',strengths,'#278458');
 profileBars(panel,'Lo que debo corregir',improve,'#c77d3d');
 const cssId='skill-profile-styles';
 if(!document.getElementById(cssId)){const css=profileNode('style');css.id=cssId;css.textContent='.skill-trend-chart{height:135px;display:flex;align-items:end;gap:7px;border-bottom:1px solid #bfd5c6;padding:7px 0}.skill-trend-bar{flex:1;min-width:8px;border-radius:5px 5px 0 0;background:#23845e}.skill-trend,.skill-objective{background:#f0f7f1;border-radius:15px;padding:17px;margin:16px 0}.skill-objective a{color:#176449;font-weight:800;text-decoration:underline}.skill-row{margin:13px 0}.skill-head{display:flex;justify-content:space-between;gap:10px;font-size:14px}.skill-track{height:10px;background:#e2eae4;border-radius:20px;overflow:hidden;margin-top:6px}.skill-fill{height:100%;border-radius:20px}';document.head.append(css)}
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
 if(resultResponse.error){box.textContent='No se pudieron consultar tus notas: '+resultResponse.error.message;return}
 const scores=resultResponse.data||[],examNames=new Map((examResponse.data||[]).map(e=>[String(e.id),e.titulo]));
 const nums=scores.map(x=>Number(x.nota)).filter(Number.isFinite);
 $('examCount').textContent=String(scores.length);
 $('bestScore').textContent=nums.length?Math.max(...nums).toFixed(1).replace(/\\.0$/,'')+'%':'—';
 $('averageScore').textContent=nums.length?(nums.reduce((s,x)=>s+x,0)/nums.length).toFixed(1)+'%':'—';
 for(const r of scores.slice(0,30)){
  const el=document.createElement('div');el.className='item';
  const info=document.createElement('div'),name=document.createElement('strong'),detail=document.createElement('small');
  name.textContent=examNames.get(String(r.examen_id))||'Examen '+r.examen_id;
  const date=new Date(r.fecha);
  detail.textContent=(Number.isNaN(date.getTime())?'':date.toLocaleString('es-ES')+' · ')+r.aciertos+'/'+r.total+' aciertos';
  const grade=document.createElement('strong');grade.textContent=Number(r.nota).toFixed(1).replace(/\\.0$/,'')+'%';grade.className='exam-grade';
  info.append(name,detail);el.append(info,grade);box.append(el);
 }
 if(!scores.length)box.textContent='Aún no tienes resultados guardados. Empieza tu primer examen.';
 await loadLearningStrengths(scores,activeUserId);
 if(examResponse.error){const p=document.createElement('p');p.className='muted';p.textContent='No se pudieron cargar los títulos de los exámenes.';box.append(p)}
}
async function changeUser(next){
 readingPages.read=1;readingPages.pending=1;
 user=next;
 suggestedHref=null;cloudUserId=null;
 $('learningStatus').textContent='Consultando tu progreso…';$('learningActivityHistory').replaceChildren();
 $('learningReads').textContent='—';$('learningExams').textContent='—';$('learningActivities').textContent='—';$('learningErrors').textContent='—';
 $('authLayout').hidden=!!user;
  $('accountStatus').hidden=!!user;
  if(user)$('accountStatus').textContent='';
 $('privateDashboard').hidden=!user;
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
$('forgotPassword').onclick=async()=>{
  const email=$('authEmail').value.trim().toLowerCase();
  if(!email){$('authEmail').focus();authMessage('Indica tu correo en la casilla de acceso para recuperar la contraseña.',true);return}
  if(!$('authEmail').checkValidity()){$('authEmail').reportValidity();return}
  const button=$('forgotPassword');button.disabled=true;
  try{
    const {error}=await eeDb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/perfil.html'});
    if(error)throw error;
    authMessage('Si existe una cuenta con ese correo, recibirás un enlace de recuperación.');
  }catch(error){authMessage('No se pudo solicitar el enlace: '+readableAuthError(error),true)}
  finally{button.disabled=false}
};
$('passwordRecoveryForm').onsubmit=async e=>{
  e.preventDefault();
  if(!$('passwordRecoveryForm').reportValidity())return;
  const button=$('passwordRecoverySubmit');button.disabled=true;
  try{
    const {error}=await eeDb.auth.updateUser({password:$('passwordRecoveryValue').value});
    if(error)throw error;
    $('passwordRecoveryPanel').hidden=true;
    status('Contraseña actualizada correctamente.');
  }catch(error){authMessage('No se pudo cambiar la contraseña: '+readableAuthError(error),true)}
  finally{$('passwordRecoveryValue').value='';button.disabled=false}
};
async function logOut(){const {error}=await eeDb.auth.signOut();if(error)return status('Error: '+error.message);await changeUser(null);status('Has cerrado sesión.')}$('signout').onclick=logOut;
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
eeDb.from('articulos').select('ruta,slug,titulo').order('titulo').then(({data,error})=>{if(error)throw error;articles=(data||[]).filter(a=>/^post\/[a-z0-9-]+\.html$/.test(a.ruta)).map(a=>({href:a.ruta,link:'leer.html?slug='+encodeURIComponent(a.slug),title:(a.titulo||a.slug).replace(/\s*[·|–-]\s*Easy English\s*$/i,'')}));articlesLoaded=true;render()}).catch(e=>{$('readingPickStatus').textContent='No se pudo cargar el catálogo de artículos.';status('No se pudo cargar la biblioteca desde Supabase: '+e.message)});
// Renovaciones de token, cierres de sesión y cambios entre pestañas.
let authRevision=0;
eeDb.auth.onAuthStateChange((event)=>{
  if(event==='PASSWORD_RECOVERY'){
    $('passwordRecoveryPanel').hidden=false;
    $('passwordRecoveryValue').focus();
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
  changeUser(data?.user||null);
}).catch(error=>{changeUser(null);authMessage('No se pudo comprobar la sesión: '+readableAuthError(error),true)});
})();
