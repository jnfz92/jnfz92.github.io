/* Easy English · Exámenes conectados a Supabase. */
'use strict';
const $=id=>document.getElementById(id);
const articleLink=url=>{
  try{
    const u=new URL(url,location.href),m=u.pathname.match(/\/post\/([a-z0-9-]+)\.html$/);
    return m&&u.origin===location.origin?'leer.html?slug='+m[1]:url;
  }catch(e){return url}
};
let questions=[],examId=null,submitting=false,loadVersion=0,pendingResultId=null;
const message=s=>$('message').textContent=s;
const fail=e=>message('Error: '+(e?.message||String(e)));


/* Informe individual al finalizar: solo datos devueltos por la corrección autorizada. */
function topicForQuestion(q){
  const t=(q.enunciado||'').toLowerCase();
  if(/look after|look up|turn down|put off|give up|phrasal|look forward/.test(t))return 'Phrasal verbs y expresiones';
  if(/must|should|can |could |have to|ought|may |might /.test(t))return 'Verbos modales';
  if(/apologis|preposition|depend on|interested in/.test(t))return 'Preposiciones';
  if(/question tag|haven't|who called|who did|grammatically correct/.test(t))return 'Preguntas y question tags';
  if(/if |would |unless/.test(t))return 'Condicionales';
  if(/was sent|were sent|passive/.test(t))return 'Voz pasiva';
  if(/had |has |have |since |while |by the time|going to|yesterday/.test(t))return 'Tiempos verbales';
  return 'Gramática y vocabulario';
}
function renderExamReport(responses,solutions,correct){
  let section=$('detailedReport');
  if(!section){
    section=document.createElement('section');section.id='detailedReport';
    section.className='panel';section.setAttribute('aria-labelledby','reportTitle');
    $('scoreSummary').insertAdjacentElement('afterend',section);
  }
  section.replaceChildren();section.hidden=false;
  const download=document.createElement('button');
  download.type='button';
  download.className='exam-report-pdf-button';
  download.textContent='↓ Guardar informe en PDF';
  download.setAttribute('aria-label','Abrir impresión para guardar este informe en PDF');
  download.addEventListener('click',()=>{
    const report=$('detailedReport');
    const popup=window.open('','_blank');
    if(!popup){alert('Permite las ventanas emergentes para guardar el informe en PDF.');return}
    const copy=report.cloneNode(true);
    copy.querySelectorAll('button,a,.exam-report-print-hint').forEach(el=>el.remove());
    const styles='@page{size:A4;margin:14mm}*{box-sizing:border-box}body{font:12px/1.5 Arial,sans-serif;color:#17211c;margin:0}h2{font-size:23px;color:#17583c}h3{font-size:16px;margin:16px 0 8px}h4{font-size:13px;margin:0 0 5px}p{margin:5px 0 9px}.exam-report-error{padding:10px 12px;border:1px solid #d6e4d8;border-radius:8px;margin:9px 0;break-inside:avoid;page-break-inside:avoid}.exam-report-chosen{color:#a13232}.exam-report-correct{color:#176447;font-weight:bold}.exam-report-chart{padding:12px;border:1px solid #d7e5d9;border-radius:8px;break-inside:avoid}.exam-chart-item{margin:9px 0}.exam-chart-heading{display:flex;justify-content:space-between;gap:10px}.exam-chart-track{height:8px;background:#dce8de;border-radius:8px;overflow:hidden}.exam-chart-fill{height:100%;background:#c77d3d;border-radius:8px}';
    popup.document.open();
    popup.document.write('<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Informe Easy English - Examen '+Number(examId)+'</title><style>'+styles+'</style></head><body>'+copy.innerHTML+'</body></html>');
    popup.document.close();
    popup.focus();
    popup.onload=()=>popup.print();
    if(popup.document.readyState==='complete')popup.print();
  });
  section.append(download);
  const hint=document.createElement('p');
  hint.className='exam-report-print-hint';
  hint.textContent='Al abrir la ventana, elige «Guardar como PDF» como destino. Se incluirán el gráfico y las explicaciones.';
  section.append(hint);
  const h=document.createElement('h2');h.id='reportTitle';h.textContent='Tu informe personalizado';section.append(h);
  const total=questions.length,wrong=questions.filter(q=>responses[q.id]!==solutions.get(String(q.id)).respuesta_correcta);
  const intro=document.createElement('p');intro.textContent='Nota: '+(10*correct/total).toFixed(1).replace('.',',')+'/10 · '+correct+' aciertos · '+wrong.length+' fallos de '+total+'.';
  section.append(intro);
  const byTopic=new Map();
  for(const q of questions){
    const topic=topicForQuestion(q),entry=byTopic.get(topic)||{good:0,total:0};
    entry.total++;if(responses[q.id]===solutions.get(String(q.id)).respuesta_correcta)entry.good++;
    byTopic.set(topic,entry);
  }
  const strengths=[...byTopic].filter(([,v])=>v.good>0).sort((a,b)=>b[1].good/b[1].total-a[1].good/a[1].total);
  const strong=document.createElement('section');strong.className='exam-report-chart';
  const strongTitle=document.createElement('h3');strongTitle.textContent='Mis puntos fuertes';strong.append(strongTitle);
  const strongText=document.createElement('p');strongText.textContent=strengths.length?
    strengths.slice(0,4).map(([topic,v])=>topic+': '+v.good+'/'+v.total+' aciertos ('+Math.round(v.good/v.total*100)+'%)').join(' · '):
    'Todavía no hay aciertos por tema. Repasa las explicaciones y vuelve a intentarlo.';
  strong.append(strongText);section.append(strong);
  if(!wrong.length){const p=document.createElement('p');p.textContent='¡Enhorabuena! No has fallado ninguna pregunta.';section.append(p);return}
  const frequency=new Map();
  for(const q of wrong){const topic=topicForQuestion(q);frequency.set(topic,(frequency.get(topic)||0)+1)}
  const recommendation=document.createElement('p');recommendation.textContent='Prioridades de repaso: '+[...frequency].sort((a,b)=>b[1]-a[1]).map(([topic,n])=>topic+' ('+n+')').join(' · ')+'.';
  section.append(recommendation);
  const chart=document.createElement('section');
  chart.className='exam-report-chart';
  chart.setAttribute('aria-label','Gráfico de errores por tema');
  const chartTitle=document.createElement('h3');
  chartTitle.textContent='¿Qué necesito repasar más?';
  chart.append(chartTitle);
  const ranked=[...frequency].sort((a,b)=>b[1]-a[1]);
  const max=Math.max(...ranked.map(item=>item[1]));
  for(const [topic,count] of ranked){
    const item=document.createElement('div');item.className='exam-chart-item';
    const heading=document.createElement('div');heading.className='exam-chart-heading';
    const name=document.createElement('span');name.textContent=topic;
    const tally=document.createElement('strong');tally.textContent=count+' '+(count===1?'fallo':'fallos');
    heading.append(name,tally);
    const track=document.createElement('div');track.className='exam-chart-track';
    const fill=document.createElement('div');fill.className='exam-chart-fill';
    fill.style.width=(count/max*100)+'%';
    track.append(fill);
    item.append(heading,track);chart.append(item);
  }
  const foot=document.createElement('p');foot.className='exam-chart-note';
  foot.textContent='Barras ordenadas de más a menos fallos. El gráfico se calcula con las respuestas de este examen.';
  chart.append(foot);section.append(chart);
  const hh=document.createElement('h3');hh.textContent='Preguntas que debes repasar';section.append(hh);
  for(const q of wrong){
    const sol=solutions.get(String(q.id)),card=document.createElement('article');card.className='exam-report-error';
    const heading=document.createElement('h4');heading.textContent='Pregunta '+q.orden+' · '+topicForQuestion(q);
    const question=document.createElement('p');question.textContent=q.enunciado;
    const chosen=document.createElement('p');chosen.className='exam-report-chosen';chosen.textContent='✗ Tu respuesta: '+(responses[q.id]===undefined?'Sin responder':q.opciones[responses[q.id]]);
    const right=document.createElement('p');right.className='exam-report-correct';right.textContent='✓ Respuesta correcta: '+q.opciones[sol.respuesta_correcta];
    const why=document.createElement('p');why.textContent=sol.explicacion||'Repasa esta estructura en las lecciones.';
    card.append(heading,question,chosen,right,why);
    if(q.fuente_url){const a=document.createElement('a');a.href=articleLink(q.fuente_url);a.textContent='Repasar lección ↗';card.append(a)}
    section.append(card);
  }
  const review=document.createElement('a');review.href='#cuaderno-fallos';review.textContent='Practicar mis errores ↘';section.append(review);
}
(function(){
  const css=document.createElement('style');
  css.textContent='#detailedReport{margin:22px 0;padding:25px;border:1px solid #c6dfcd;border-radius:20px;background:#fff}#detailedReport h2{color:#18573c}#detailedReport .exam-report-error{border:1px solid #dae7de;border-radius:14px;padding:16px;margin:14px 0;background:#fafcf9}#detailedReport .exam-report-error h4{margin:0 0 8px}#detailedReport .exam-report-error p{margin:7px 0}#detailedReport .exam-report-chosen{color:#a13232}#detailedReport .exam-report-correct{color:#176447;font-weight:750}';
  css.textContent+="#detailedReport .exam-report-chart{margin:24px 0;padding:20px;border-radius:16px;background:#f4f8f4;border:1px solid #d7e5d9}#detailedReport .exam-report-chart h3{margin:0 0 15px}#detailedReport .exam-chart-item{margin:0 0 16px}#detailedReport .exam-chart-heading{display:flex;justify-content:space-between;align-items:baseline;gap:12px;font-size:14px;margin-bottom:6px}#detailedReport .exam-chart-heading strong{white-space:nowrap;color:#805020}#detailedReport .exam-chart-track{width:100%;height:11px;border-radius:99px;background:#dce8de;overflow:hidden}#detailedReport .exam-chart-fill{height:100%;border-radius:99px;background:#c77d3d}#detailedReport .exam-chart-note{color:#52695c;font-size:12px;margin:5px 0 0}";
  css.textContent+="@media print{@page{size:A4;margin:16mm}body{background:white!important;color:#17211c!important}body *{visibility:hidden!important}#detailedReport,#detailedReport *{visibility:visible!important}#detailedReport{position:absolute!important;inset:0 auto auto 0!important;width:100%!important;max-width:none!important;box-sizing:border-box!important;border:0!important;box-shadow:none!important;background:white!important;margin:0!important;padding:0!important}#detailedReport .exam-report-pdf-button,#detailedReport .exam-report-print-hint,#detailedReport a{display:none!important}#detailedReport .exam-report-error{break-inside:avoid;page-break-inside:avoid}#detailedReport .exam-report-chart{break-inside:avoid;page-break-inside:avoid;background:#f4f8f4!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}#detailedReport .exam-chart-track{background:#dce8de!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}#detailedReport .exam-chart-fill{background:#c77d3d!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}}#detailedReport .exam-report-pdf-button{padding:12px 17px;margin:4px 0 0;display:inline-block}#detailedReport .exam-report-print-hint{font-size:13px;color:#52695c;margin:4px 0 16px}";
  document.head.append(css);
})();

function clearExam(){
  loadVersion++;
  questions=[];examId=null;submitting=false;pendingResultId=null;
  $('exam').replaceChildren();
  $('examProgress').hidden=true;
  $('scoreSummary').hidden=true;
  if($('detailedReport'))$('detailedReport').hidden=true;
  $('loadedExam').hidden=true;
}

async function refreshSession(){
  const {data:{user},error}=await eeDb.auth.getUser();
  if(error)throw error;
  $('login').hidden=!!user;
  $('connected').hidden=!user;
  $('session').textContent=user?'Sesión iniciada: '+user.email:'';
  await history();
}

async function history(){
  const box=$('history');box.replaceChildren();
  const {data:{user}}=await eeDb.auth.getUser();
  if(!user){box.textContent='Inicia sesión para consultar tu historial.';return}
  const {data,error}=await eeDb.from('resultados')
    .select('id,examen_id,aciertos,total,nota,fecha')
    .order('fecha',{ascending:false}).limit(30);
  if(error){box.textContent='No se pudo consultar el historial: '+error.message;return}
  if(!data?.length){box.textContent='Todavía no tienes resultados guardados.';return}
  for(const r of data){
    const p=document.createElement('p');
    p.textContent=new Date(r.fecha).toLocaleString('es-ES')+
      ' · Examen '+r.examen_id+' · '+r.aciertos+'/'+r.total+' ('+r.nota+'%)';
    box.append(p);
  }
}

$('login').onsubmit=async e=>{
  e.preventDefault();
  const {error}=await eeDb.auth.signInWithPassword({email:$('email').value,password:$('password').value});
  if(error)return fail(error);
  $('password').value='';
  message('Sesión iniciada');
  await refreshSession().catch(fail);
};
$('signup').onclick=async()=>{
  const {data,error}=await eeDb.auth.signUp({email:$('email').value,password:$('password').value});
  if(error)return fail(error);
  message(data.session?'Registro completado.':'Revisa tu correo para confirmar tu cuenta.');
  await refreshSession().catch(fail);
};
$('logout').onclick=async()=>{
  const {error}=await eeDb.auth.signOut();
  if(error)return fail(error);
  clearExam();
  message('Has cerrado sesión.');
  await refreshSession().catch(fail);
};

function syncExamSelection(){
  const id=$('examlist').value;
  for(const button of $('examCards').querySelectorAll('button')){
    button.setAttribute('aria-pressed',String(button.dataset.id===id));
  }
}
async function list(){
  const {data,error}=await eeDb.from('examenes')
    .select('id,titulo,fecha,nivel').eq('publicado',true).order('fecha',{ascending:false});
  if(error)throw error;
  const sel=$('examlist'),cards=$('examCards');
  sel.replaceChildren();cards.replaceChildren();
  for(const ex of data){
    const option=document.createElement('option');
    option.value=ex.id;
    option.textContent=(ex.fecha||'Sin fecha')+' · '+ex.titulo+' ('+ex.nivel+')';
    sel.append(option);
    const button=document.createElement('button');
    button.type='button';button.className='exam-choice';button.dataset.id=String(ex.id);
    button.textContent=ex.titulo+' · '+(ex.fecha||'Sin fecha')+' · '+ex.nivel;
    button.onclick=()=>{sel.value=String(ex.id);syncExamSelection();load().catch(fail)};
    cards.append(button);
  }
  $('examCount').textContent=data.length+' exámenes disponibles · Selecciona cualquiera para comenzar.';
  $('load').disabled=!data.length;
  if(!data.length){message('Todavía no hay exámenes publicados.');return}
  const requested=new URLSearchParams(location.search).get('examen');
  if(requested&&data.some(ex=>String(ex.id)===requested))sel.value=requested;
  syncExamSelection();
  if(requested&&sel.value===requested)await load();
}

async function load(){
  if(submitting)throw new Error('Hay una entrega en curso. Espera a que termine antes de cambiar de examen.');
  const requestedId=Number($('examlist').value);
  if(!requestedId)throw new Error('Selecciona un examen válido.');
  const selectedTitle=$('examlist').selectedOptions[0]?.textContent||'Examen';
  const version=++loadVersion;
  const [questionResponse,examResponse]=await Promise.all([
    eeDb.from('preguntas')
      .select('id,orden,enunciado,opciones,fuente_url')
      .eq('examen_id',requestedId).order('orden'),
    eeDb.from('examenes').select('lectura').eq('id',requestedId).maybeSingle()
  ]);
  const {data,error}=questionResponse;
  if(error)throw error;
  if(examResponse.error)console.warn('No se pudo consultar el texto de lectura',examResponse.error);
  if(version!==loadVersion)return;
  if(!Array.isArray(data)||!data.length)throw new Error('Este examen no tiene preguntas publicadas.');
  examId=requestedId;questions=data;submitting=false;pendingResultId=null;
  $('scoreSummary').hidden=true;
  if($('detailedReport'))$('detailedReport').hidden=true;
  $('examProgress').hidden=false;
  $('loadedExam').hidden=false;
  $('loadedExam').textContent='Estás realizando: '+selectedTitle;
  const form=$('exam');form.replaceChildren();
  const readingText=examResponse.data?.lectura||null;
  const readingSource=questions.find(q=>q.orden>=17&&q.fuente_url&&
    /Swietenia|DCA|divers|marine|seabed|Protector of the Sea/i.test(q.enunciado))?.fuente_url;
  for(const q of questions){
    if(q.orden===17&&readingText){
      const section=document.createElement('section');section.className='exam-reading';
      const h=document.createElement('h3');h.textContent='Lectura para las preguntas 17–20';
      const p=document.createElement('p');p.textContent=readingText;
      section.append(h,p);form.append(section);
    }else if(q.orden===17&&readingSource){
      const section=document.createElement('section');section.className='exam-reading';
      const h=document.createElement('h3');h.textContent='Lectura necesaria para las preguntas 17–20';
      const p=document.createElement('p');p.textContent='Estas preguntas se basan en un artículo de lectura. Ábrelo en otra pestaña antes de responder.';
      const a=document.createElement('a');a.href=articleLink(readingSource);
      a.target='_blank';a.rel='noopener noreferrer';a.textContent='Leer Protector of the Sea ↗';
      section.append(h,p,a);form.append(section);
    }
    const fs=document.createElement('fieldset'),legend=document.createElement('legend');
    fs.id='pregunta-'+q.id;
    legend.textContent=q.orden+'. '+q.enunciado;fs.append(legend);
    // Se muestra un orden aleatorio, pero se envía a Supabase el índice ORIGINAL.
    q.displayOrder=q.opciones.map((_,i)=>i);
    for(let i=q.displayOrder.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [q.displayOrder[i],q.displayOrder[j]]=[q.displayOrder[j],q.displayOrder[i]];
    }
    q.displayOrder.forEach((originalIndex,displayIndex)=>{
      const label=document.createElement('label'),input=document.createElement('input');
      input.type='radio';input.name='question-'+q.id;input.value=String(originalIndex);
      label.append(input,document.createTextNode(' '+('ABCDEFGH'[displayIndex])+') '+q.opciones[originalIndex]));
      fs.append(label);
    });
    if(q.fuente_url){
      const a=document.createElement('a');a.href=articleLink(q.fuente_url);
      a.target='_blank';a.rel='noopener noreferrer';a.textContent='Repasar lección';fs.append(a);
    }
    const fb=document.createElement('div');
    fb.id='feedback-'+q.id;fb.className='feedback';fb.hidden=true;fs.append(fb);
    form.append(fs);
  }
  const submit=document.createElement('button');
  submit.type='submit';submit.textContent='Corregir y guardar resultado';form.append(submit);
  updateProgress();
  message('Examen preparado: '+questions.length+' preguntas.');
  const params=new URLSearchParams(location.search);
  const targetId=Number(params.get('pregunta'));
  const target=params.get('examen')===String(examId)&&targetId?
    document.getElementById('pregunta-'+targetId):null;
  if(target){
    target.classList.add('exam-review-target');
    target.scrollIntoView({behavior:'smooth',block:'center'});
  }else form.scrollIntoView({behavior:'smooth',block:'start'});
}
function updateProgress(){
  const n=questions.filter(q=>Boolean($('exam').querySelector('input[name=question-'+q.id+']:checked'))).length;
  const t=questions.length,percentage=t?Math.round(100*n/t):0;
  $('progressLabel').textContent=n+' / '+t+' preguntas respondidas';
  $('progressFill').style.width=percentage+'%';
  $('progressFill').setAttribute('aria-valuenow',String(percentage));
}
$('exam').addEventListener('change',updateProgress);
$('examlist').addEventListener('change',syncExamSelection);
$('load').onclick=()=>load().catch(fail);

$('exam').onsubmit=async e=>{
  e.preventDefault();
  if(submitting||!examId||!questions.length)return;
  const submit=$('exam').querySelector('button[type=submit]');
  if(!submit)return;
  const responses={};
  for(const q of questions){
    const marked=$('exam').querySelector('input[name=question-'+q.id+']:checked');
    if(marked)responses[q.id]=Number(marked.value);
  }
  const answered=Object.keys(responses).length;
  if(!pendingResultId){
    if(!answered){message('Contesta al menos una pregunta antes de entregar.');return}
    if(answered<questions.length&&!confirm('Has respondido '+answered+' de '+questions.length+
      ' preguntas. Las preguntas sin contestar contarán como falladas. ¿Entregar igualmente?'))return;
  }
  submitting=true;submit.disabled=true;
  try{
    const {data:{user},error:authError}=await eeDb.auth.getUser();
    if(authError)throw authError;
    if(!user)throw new Error('Inicia sesión para corregir y guardar tu nota. Tus respuestas siguen seleccionadas.');
    let result;
    if(!pendingResultId){
      const delivered=await eeDb.rpc('entregar_examen',{p_examen_id:examId,p_respuestas:responses});
      if(delivered.error)throw delivered.error;
      result=Array.isArray(delivered.data)?delivered.data[0]:delivered.data;
      if(!result||!result.resultado_id)throw new Error('El servidor no devolvió un resultado válido.');
      pendingResultId=result.resultado_id;
    }
    const correction=await eeDb.rpc('ver_correccion',{p_resultado_id:pendingResultId});
    if(correction.error)throw new Error('El resultado ya está guardado, pero no se pudo descargar la corrección: '+correction.error.message);
    const solutions=new Map((correction.data||[]).map(s=>[String(s.pregunta_id),s]));
    if(questions.some(q=>!solutions.has(String(q.id))))
      throw new Error('La nota está guardada, pero la corrección llegó incompleta. Puedes volver a pulsar corregir sin duplicar el intento.');
    let correct=0;
    for(const q of questions){
      const sol=solutions.get(String(q.id)),fb=$('feedback-'+q.id);
      const chosen=responses[q.id],ok=chosen===sol.respuesta_correcta;
      if(ok)correct++;
      const correctLetter='ABCDEFGH'[q.displayOrder.indexOf(sol.respuesta_correcta)]||'?';
      const chosenLetter=chosen===undefined?'Sin responder':('ABCDEFGH'[q.displayOrder.indexOf(chosen)]||'?');
      fb.hidden=false;
      fb.textContent=(ok?'✓ Correcta':'✗ Incorrecta')+
        '\nTu elección: '+chosenLetter+
        '\nRespuesta correcta: '+correctLetter+') '+q.opciones[sol.respuesta_correcta]+
        '\n'+(sol.explicacion||'');
    }
    for(const input of $('exam').querySelectorAll('input'))input.disabled=true;
    message('¡Examen corregido y guardado! Tus fallos se guardan en el cuaderno personal.');
    $('scoreSummary').hidden=false;
    const summary=$('scoreSummary');summary.replaceChildren();
    const label=document.createElement('span');label.className='exam-section-tag';label.textContent='RESULTADO GUARDADO';
    const score=document.createElement('strong');score.textContent=(100*correct/questions.length).toFixed(1)+'%';
    const explanation=document.createElement('p');explanation.textContent=correct+' de '+questions.length+' respuestas correctas. Tus fallos están guardados para repasarlos.';
    const link=document.createElement('a');link.href='perfil.html';link.textContent='Ver mi progreso ↗';
    const errorsLink=document.createElement('a');
    errorsLink.href='#cuaderno-fallos';
    errorsLink.textContent='Ir a mi cuaderno de errores ↘';
    summary.append(label,score,explanation,link,document.createTextNode(' · '),errorsLink);
    renderExamReport(responses,solutions,correct);
    await history();
    summary.scrollIntoView({behavior:'smooth',block:'center'});
  }catch(error){
    submit.disabled=false;
    fail(error);
  }finally{
    submitting=false;
  }
};
list().catch(fail);
refreshSession().catch(fail);
