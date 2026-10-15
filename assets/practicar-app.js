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

function clearExam(){
  loadVersion++;
  questions=[];examId=null;submitting=false;pendingResultId=null;
  $('exam').replaceChildren();
  $('examProgress').hidden=true;
  $('scoreSummary').hidden=true;
  $('loadedExam').hidden=true;
}

async function refreshSession(){
  const {data:{user},error}=await eeDb.auth.getUser();
  if(error)throw error;
  $('login').hidden=!!user;
  $('connected').hidden=!user;
  $('session').textContent=user?'Sesión iniciada: '+user.email:'';
  await Promise.all([history(),failedReview()]);
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

async function failedReview(){
  const count=$('failedCount'),list=$('failedQuestions');
  list.replaceChildren();
  const {data:{user}}=await eeDb.auth.getUser();
  if(!user){count.textContent='Inicia sesión para ver tus preguntas pendientes.';return}
  const {data,error}=await eeDb.from('preguntas_falladas')
    .select('pregunta_id,veces_fallada,ultimo_fallo,preguntas(enunciado,fuente_url)')
    .eq('dominada',false).order('ultimo_fallo',{ascending:false}).limit(30);
  if(error){count.textContent='No se pudieron cargar las preguntas: '+error.message;return}
  count.textContent=data.length?
    'Tienes '+data.length+' preguntas pendientes'+(data.length===30?' (se muestran las 30 más recientes)':'')+'.':
    'No tienes preguntas falladas pendientes.';
  for(const item of data){
    const p=document.createElement('p');
    p.textContent=(item.preguntas?.enunciado||'Pregunta '+item.pregunta_id)+
      ' · Fallada '+item.veces_fallada+' vez/veces';
    if(item.preguntas?.fuente_url){
      const a=document.createElement('a');
      a.href=articleLink(item.preguntas.fuente_url);
      a.textContent=' · Repasar lección';p.append(a);
    }
    list.append(p);
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
  const requestedId=Number($('examlist').value);
  if(!requestedId)throw new Error('Selecciona un examen válido.');
  const selectedTitle=$('examlist').selectedOptions[0]?.textContent||'Examen';
  const version=++loadVersion;
  const {data,error}=await eeDb.from('preguntas')
    .select('id,orden,enunciado,opciones,fuente_url')
    .eq('examen_id',requestedId).order('orden');
  if(error)throw error;
  if(version!==loadVersion)return;
  if(!Array.isArray(data)||!data.length)throw new Error('Este examen no tiene preguntas publicadas.');
  examId=requestedId;questions=data;submitting=false;pendingResultId=null;
  $('scoreSummary').hidden=true;
  $('examProgress').hidden=false;
  $('loadedExam').hidden=false;
  $('loadedExam').textContent='Estás realizando: '+selectedTitle;
  const form=$('exam');form.replaceChildren();
  for(const q of questions){
    const fs=document.createElement('fieldset'),legend=document.createElement('legend');
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
      a.textContent='Repasar lección';fs.append(a);
    }
    const fb=document.createElement('div');
    fb.id='feedback-'+q.id;fb.className='feedback';fb.hidden=true;fs.append(fb);
    form.append(fs);
  }
  const submit=document.createElement('button');
  submit.type='submit';submit.textContent='Corregir y guardar resultado';form.append(submit);
  updateProgress();
  message('Examen preparado: '+questions.length+' preguntas.');
  form.scrollIntoView({behavior:'smooth',block:'start'});
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
    message('¡Examen corregido y guardado!');
    $('scoreSummary').hidden=false;
    const summary=$('scoreSummary');summary.replaceChildren();
    const label=document.createElement('span');label.className='exam-section-tag';label.textContent='RESULTADO GUARDADO';
    const score=document.createElement('strong');score.textContent=(100*correct/questions.length).toFixed(1)+'%';
    const explanation=document.createElement('p');explanation.textContent=correct+' de '+questions.length+' respuestas correctas. Revisa tus errores y explicaciones.';
    const link=document.createElement('a');link.href='perfil.html';link.textContent='Ver mi progreso ↗';
    summary.append(label,score,explanation,link);
    await Promise.all([history(),failedReview()]);
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
