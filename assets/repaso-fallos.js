/* Easy English · Examen personal con las preguntas falladas (solo Supabase Auth). */
'use strict';
(()=>{
  const $=id=>document.getElementById(id);
  const start=$('reviewStart'),section=$('reviewSection'),form=$('reviewForm');
  const status=$('reviewStatus'),summary=$('reviewSummary'),progress=$('reviewProgress');
  const REVISAR=20;
  let items=[],answers=null,attemptId=null,busy=false,finished=false,owner=null,requestVersion=0;

  function reset(){
    requestVersion++;
    items=[];answers=null;attemptId=null;busy=false;finished=false;owner=null;
    form.replaceChildren();
    section.hidden=true;summary.hidden=true;
    status.textContent='';
    start.disabled=false;
  }
  function shuffledOptions(q){
    q.order=q.opciones.map((_,i)=>i);
    for(let i=q.order.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [q.order[i],q.order[j]]=[q.order[j],q.order[i]];
    }
  }
  function updateProgress(){
    const answered=items.filter(q=>Boolean(form.querySelector('input[name="repaso-'+q.id+'"]:checked'))).length;
    progress.textContent='Respondidas '+answered+' de '+items.length+' preguntas';
  }
  function renderExam(){
    form.replaceChildren();
    const insertedReadings=new Set();
    items.forEach((q,index)=>{
      const source=q.examenes||{};
      if(q.orden>=17&&source.lectura&&!insertedReadings.has(q.examen_id)){
        insertedReadings.add(q.examen_id);
        const reading=document.createElement('section');
        reading.className='review-reading';
        const title=document.createElement('h3');title.textContent='Lectura del examen: '+(source.titulo||'Texto');
        const para=document.createElement('p');para.textContent=source.lectura;
        reading.append(title,para);
        form.append(reading);
      }
      const group=document.createElement('fieldset');
      group.className='review-question';
      group.id='repaso-'+q.id;
      const title=document.createElement('legend');
      title.textContent=(index+1)+'. '+q.enunciado;
      group.append(title);
      shuffledOptions(q);
      q.order.forEach((originalIndex,i)=>{
        const label=document.createElement('label'),input=document.createElement('input');
        input.type='radio';input.name='repaso-'+q.id;
        input.value=String(originalIndex);
        label.append(input,document.createTextNode(' '+('ABCDEFGH'[i])+') '+q.opciones[originalIndex]));
        group.append(label);
      });
      if(q.fuente_url){
        const link=document.createElement('a');
        link.href=typeof articleLink==='function'?articleLink(q.fuente_url):q.fuente_url;
        link.target='_blank';link.rel='noopener noreferrer';link.textContent='Repasar la lección ↗';
        group.append(link);
      }
      const feedback=document.createElement('div');
      feedback.id='repaso-feedback-'+q.id;
      feedback.className='review-feedback';feedback.hidden=true;
      group.append(feedback);
      form.append(group);
    });
    const submit=document.createElement('button');
    submit.type='submit';
    submit.id='reviewSubmit';
    submit.textContent='Corregir mi examen de errores';
    form.append(submit);
    summary.hidden=true;section.hidden=false;
    updateProgress();
    section.scrollIntoView({behavior:'smooth',block:'start'});
  }

  async function startExam(){
    if(busy)return;
    const version=++requestVersion;
    start.disabled=true;
    status.textContent='Preparando el examen con tus preguntas falladas…';
    try{
      const {data:{user},error:authError}=await eeDb.auth.getUser();
      if(authError)throw authError;
      if(!user)throw new Error('Inicia sesión para hacer tu examen de errores.');
      const {data,error}=await eeDb.from('preguntas_falladas')
        .select('pregunta_id,preguntas(id,orden,enunciado,opciones,fuente_url,examen_id,examenes(titulo,lectura))')
        .eq('usuario_id',user.id).eq('dominada',false)
        .order('ultimo_fallo',{ascending:false}).limit(500);
      if(error)throw error;
      if(version!==requestVersion)return;
      const available=(data||[]).map(row=>row.preguntas).filter(q=>
        q&&Number.isSafeInteger(q.id)&&Array.isArray(q.opciones)&&q.opciones.length>=2);
      if(!available.length){
        reset();status.textContent='¡No tienes preguntas falladas pendientes!';return;
      }
      // Variar las preguntas entre intentos, sin repetir preguntas dentro del mismo.
      for(let i=available.length-1;i>0;i--){
        const j=Math.floor(Math.random()*(i+1));
        [available[i],available[j]]=[available[j],available[i]];
      }
      items=available.slice(0,REVISAR);
      owner=user.id;attemptId=null;answers=null;finished=false;
      start.disabled=false;
      status.textContent='Tu examen de repaso: '+items.length+' de '+available.length+
        ' preguntas pendientes. Solo se incluyen preguntas que has fallado.';
      renderExam();
    }catch(e){
      if(version!==requestVersion)return;
      status.textContent='No se pudo preparar el repaso: '+(e.message||String(e));
      start.disabled=false;
    }
  }

  async function deliver(event){
    event.preventDefault();
    if(busy||finished||!items.length)return;
    if(!answers){
      const submitted={};
      for(const q of items){
        const selected=form.querySelector('input[name="repaso-'+q.id+'"]:checked');
        if(!selected){
          status.textContent='Responde a todas las preguntas antes de corregir.';
          document.getElementById('repaso-'+q.id)?.scrollIntoView({behavior:'smooth',block:'center'});
          return;
        }
        submitted[q.id]=Number(selected.value);
      }
      answers=submitted;
      attemptId=crypto.randomUUID();
      for(const input of form.querySelectorAll('input'))input.disabled=true;
    }
    busy=true;
    const submit=$('reviewSubmit');
    submit.disabled=true;
    status.textContent='Corrigiendo el examen de repaso en Supabase…';
    const version=requestVersion;
    try{
      const {data:{user},error:authError}=await eeDb.auth.getUser();
      if(authError)throw authError;
      if(!user||user.id!==owner)throw new Error('La sesión ha cambiado. Vuelve a iniciar el repaso.');
      const {data,error}=await eeDb.rpc('entregar_repaso_fallos',{
        p_intento_id:attemptId,p_respuestas:answers
      });
      if(error)throw error;
      if(version!==requestVersion)return;
      const result=Array.isArray(data)?data[0]:data;
      if(!result||result.total!==items.length||Object.keys(result.correcciones||{}).length!==items.length)
        throw new Error('El resultado recibido no está completo. Pulsa de nuevo para recuperarlo.');
      finished=true;
      for(const q of items){
        const sol=result.correcciones[q.id],box=$('repaso-feedback-'+q.id);
        const correct=Number(sol.respuesta_correcta);
        const displayed='ABCDEFGH'[q.order.indexOf(correct)]||'?';
        box.textContent=(sol.correcta?'✓ Correcta':'✗ Pendiente de repasar')+
          '\nRespuesta correcta: '+displayed+') '+q.opciones[correct]+
          '\n'+(sol.explicacion||'');
        box.hidden=false;
      }
      summary.replaceChildren();
      const score=document.createElement('strong');
      score.textContent=result.aciertos+' / '+result.total+' · '+(100*result.aciertos/result.total).toFixed(1)+'%';
      const detail=document.createElement('p');
      detail.textContent=result.aciertos+' preguntas superadas. '+(result.total-result.aciertos)+
        ' siguen pendientes en tu cuaderno. Tu nota del examen original no cambia.';
      const next=document.createElement('button');
      next.type='button';next.textContent='Practicar otra tanda de fallos';
      next.onclick=()=>startExam();
      summary.append(score,detail,next);summary.hidden=false;
      status.textContent='Repaso corregido y guardado en Supabase.';
      submit.disabled=true;submit.textContent='Repaso terminado';
      summary.scrollIntoView({behavior:'smooth',block:'center'});
    }catch(e){
      if(version!==requestVersion)return;
      status.textContent='No se pudo confirmar la corrección: '+(e.message||String(e))+
        '. Puedes reintentar sin registrar el intento dos veces.';
      submit.disabled=false;
      submit.textContent='Reintentar corrección';
    }finally{
      if(version===requestVersion)busy=false;
    }
  }

  start.addEventListener('click',startExam);
  form.addEventListener('change',updateProgress);
  form.addEventListener('submit',deliver);
  eeDb.auth.onAuthStateChange(event=>{
    if(event==='SIGNED_OUT')reset();
  });
  if(new URLSearchParams(location.search).get('repaso')==='fallos')startExam();
})();