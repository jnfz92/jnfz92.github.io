/* Easy English · Un mismo examen de errores para examenes y actividades. */
'use strict';
(()=>{
  const $=id=>document.getElementById(id);
  const start=$('reviewStart'),section=$('reviewSection'),form=$('reviewForm');
  const status=$('reviewStatus'),summary=$('reviewSummary'),progress=$('reviewProgress');
  const REVISAR=20;
  let items=[],answers=null,attempts=null,busy=false,finished=false,owner=null,requestVersion=0;

  function reset(){
    requestVersion++;
    items=[];answers=null;attempts=null;busy=false;finished=false;owner=null;
    form.replaceChildren();section.hidden=true;summary.hidden=true;
    status.textContent='';start.disabled=false;
  }
  function key(q){return 'repaso-'+q._kind+'-'+q.id}
  function mixedOrder(q){
    q.displayOrder=q.opciones.map((_,i)=>i);
    for(let i=q.displayOrder.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [q.displayOrder[i],q.displayOrder[j]]=[q.displayOrder[j],q.displayOrder[i]];
    }
  }
  function addMedia(parent,q){
    if(q._kind!=='activity'||!['audio','imagen'].includes(q.medio_tipo)
       ||!/^https:\/\/[^\s]+$/i.test(q.medio_url||''))return;
    const figure=document.createElement('figure');figure.className='review-media';
    const media=document.createElement(q.medio_tipo==='audio'?'audio':'img');
    media.src=q.medio_url;
    if(q.medio_tipo==='audio'){media.controls=true;media.preload='none';media.setAttribute('aria-label',q.medio_alt||'Audio de la actividad')}
    else{media.alt=q.medio_alt||'Imagen para resolver el ejercicio';media.loading='lazy'}
    figure.append(media);
    if(q.medio_alt){const small=document.createElement('figcaption');small.textContent=q.medio_alt;figure.append(small)}
    parent.append(figure);
  }
  function textField(group,name,placeholder){
    const input=document.createElement('input');input.type='text';input.name=name;
    input.required=true;input.maxLength=500;input.autocomplete='off';
    input.placeholder=placeholder;input.className='review-text';group.append(input);
    return input;
  }
  function answered(q){
    const tag=key(q);
    if(q._kind==='classic'||q.tipo==='seleccion')
      return !!form.querySelector('input[name="'+tag+'"]:checked');
    if(q.tipo==='huecos'){
      const fields=Array.isArray(q.configuracion?.campos)?q.configuracion.campos:[];
      return fields.length>0&&fields.every((_,i)=>(form.querySelector('[name="'+tag+'-h-'+i+'"]')?.value||'').trim());
    }
    return !!(form.querySelector('[name="'+tag+'"]')?.value||'').trim();
  }
  function updateProgress(){
    const count=items.filter(answered).length;
    progress.textContent='Respondidas '+count+' de '+items.length+' preguntas';
  }
  function renderExam(){
    form.replaceChildren();
    const insertedReadings=new Set();
    items.forEach((q,index)=>{
      const classic=q._kind==='classic';
      const source=classic?(q.examenes||{}):(q.actividades||{});
      if(classic&&q.orden>=17&&source.lectura&&!insertedReadings.has(q.examen_id)){
        insertedReadings.add(q.examen_id);
        const reading=document.createElement('section');reading.className='review-reading';
        const h=document.createElement('h3');h.textContent='Lectura del examen: '+(source.titulo||'Texto');
        const p=document.createElement('p');p.textContent=source.lectura;
        reading.append(h,p);form.append(reading);
      }
      const group=document.createElement('fieldset');group.className='review-question';
      group.id='repaso-'+q._kind+'-'+q.id;
      const label=document.createElement('legend');
      label.textContent=(index+1)+'. '+q.enunciado;
      group.append(label);
      if(!classic){
        const marker=document.createElement('small');marker.className='review-kind';
        marker.textContent='Actividad · '+(source.titulo||'Ejercicio')+' · '+(q.tipo||'');
        group.append(marker);
      }
      addMedia(group,q);
      if(classic||q.tipo==='seleccion'){
        q.opciones=classic?q.opciones:q.configuracion?.opciones;
        mixedOrder(q);
        q.displayOrder.forEach((originalIndex,i)=>{
          const el=document.createElement('label'),input=document.createElement('input');
          input.type='radio';input.name=key(q);input.value=String(originalIndex);
          el.append(input,document.createTextNode(' '+('ABCDEFGH'[i]||String(i+1))+') '+q.opciones[originalIndex]));
          group.append(el);
        });
      }else if(q.tipo==='huecos'){
        const fields=q.configuracion?.campos||[];
        fields.forEach((field,i)=>{
          const label=document.createElement('label');label.className='review-gap';
          const name=key(q)+'-h-'+i;
          label.textContent=String(field||'Hueco '+(i+1));
          const input=textField(label,name,'Completa el hueco');input.id=name;
          group.append(label);
        });
      }else if(q.tipo==='texto_corto'||q.tipo==='transformacion'){
        if(q.tipo==='transformacion'&&q.configuracion?.palabra_clave){
          const hint=document.createElement('p');hint.textContent='Palabra clave: '+q.configuracion.palabra_clave;
          hint.className='review-kind';group.append(hint);
        }
        textField(group,key(q),'Escribe tu respuesta');
      }
      if(classic&&q.fuente_url){
        const link=document.createElement('a');link.href=typeof articleLink==='function'?articleLink(q.fuente_url):q.fuente_url;
        link.target='_blank';link.rel='noopener noreferrer';link.textContent='Repasar la lección ↗';group.append(link);
      }
      const fb=document.createElement('div');
      fb.id='repaso-feedback-'+q._kind+'-'+q.id;fb.className='review-feedback';fb.hidden=true;
      group.append(fb);form.append(group);
    });
    const submit=document.createElement('button');submit.type='submit';submit.id='reviewSubmit';
    submit.textContent='Corregir mi examen de errores';form.append(submit);
    summary.hidden=true;section.hidden=false;updateProgress();
    section.scrollIntoView({behavior:'smooth',block:'start'});
  }
  async function startExam(){
    if(busy)return;
    const version=++requestVersion;
    start.disabled=true;
    status.textContent='Preparando tus preguntas falladas en exámenes y actividades…';
    try{
      const {data:{user},error:authError}=await eeDb.auth.getUser();
      if(authError)throw authError;
      if(!user)throw Error('Inicia sesión para hacer tu examen de errores.');
      const [c,a]=await Promise.all([
        eeDb.from('preguntas_falladas')
          .select('pregunta_id,preguntas(id,orden,enunciado,opciones,fuente_url,examen_id,examenes(titulo,lectura))')
          .eq('usuario_id',user.id).eq('dominada',false)
          .order('ultimo_fallo',{ascending:false}).limit(500),
        eeDb.from('actividad_fallos')
          .select('pregunta_id,actividad_preguntas(id,orden,tipo,enunciado,configuracion,medio_tipo,medio_url,medio_alt,actividad_id,actividades(titulo,publicado))')
          .eq('usuario_id',user.id).eq('dominada',false)
          .order('ultimo_fallo',{ascending:false}).limit(500)
      ]);
      if(c.error)throw c.error;if(a.error)throw a.error;
      if(version!==requestVersion)return;
      const classic=(c.data||[]).map(row=>row.preguntas).filter(q=>
        q&&Number.isSafeInteger(q.id)&&Array.isArray(q.opciones)&&q.opciones.length>=2)
        .map(q=>({...q,_kind:'classic'}));
      const activity=(a.data||[]).map(row=>row.actividad_preguntas).filter(q=>
        q&&Number.isSafeInteger(q.id)&&q.actividades?.publicado&&
        (['seleccion'].includes(q.tipo)?Array.isArray(q.configuracion?.opciones)&&q.configuracion.opciones.length>=2:
         ['texto_corto','transformacion'].includes(q.tipo)||
         (q.tipo==='huecos'&&Array.isArray(q.configuracion?.campos)&&q.configuracion.campos.length>0)))
        .map(q=>({...q,_kind:'activity'}));
      const available=[...classic,...activity];
      if(!available.length){
        reset();status.textContent='🎉 ¡No tienes preguntas falladas pendientes!';return;
      }
      for(let i=available.length-1;i>0;i--){
        const j=Math.floor(Math.random()*(i+1));
        [available[i],available[j]]=[available[j],available[i]];
      }
      items=available.slice(0,REVISAR);
      owner=user.id;attempts=null;answers=null;finished=false;
      start.disabled=false;
      status.textContent='Tu repaso: '+items.length+' de '+available.length+
        ' preguntas pendientes ('+classic.length+' de exámenes y '+activity.length+' de actividades).';
      renderExam();
    }catch(e){
      if(version!==requestVersion)return;
      status.textContent='No se pudo preparar el repaso: '+(e.message||String(e));
      start.disabled=false;
    }
  }
  function collect(){
    const classic={},activity={};
    for(const q of items){
      const target=q._kind==='classic'?classic:activity,tag=key(q);
      if(!answered(q)){
        status.textContent='Responde todas las preguntas antes de corregir.';
        document.getElementById('repaso-'+q._kind+'-'+q.id)?.scrollIntoView({behavior:'smooth',block:'center'});
        return null;
      }
      if(q._kind==='classic'||q.tipo==='seleccion'){
        target[q.id]=Number(form.querySelector('input[name="'+tag+'"]:checked').value);
      }else if(q.tipo==='huecos'){
        target[q.id]=q.configuracion.campos.map((_,i)=>
          form.querySelector('[name="'+tag+'-h-'+i+'"]').value.trim());
      }else{
        target[q.id]=form.querySelector('[name="'+tag+'"]').value.trim();
      }
    }
    return {classic,activity};
  }
  async function deliver(event){
    event.preventDefault();
    if(busy||finished||!items.length)return;
    if(!answers){
      answers=collect();if(!answers)return;
      attempts={classic:crypto.randomUUID(),activity:crypto.randomUUID()};
      for(const input of form.querySelectorAll('input'))input.disabled=true;
    }
    busy=true;
    const submit=$('reviewSubmit');submit.disabled=true;
    status.textContent='Corrigiendo y guardando el repaso de todos tus errores…';
    const version=requestVersion;
    try{
      const {data:{user},error:authError}=await eeDb.auth.getUser();
      if(authError)throw authError;
      if(!user||user.id!==owner)throw Error('La sesión ha cambiado. Vuelve a iniciar el repaso.');
      const actions=[];
      if(Object.keys(answers.classic).length)
        actions.push(eeDb.rpc('entregar_repaso_fallos',{
          p_intento_id:attempts.classic,p_respuestas:answers.classic
        }).then(r=>({kind:'classic',...r})));
      if(Object.keys(answers.activity).length)
        actions.push(eeDb.rpc('entregar_repaso_actividades',{
          p_intento_id:attempts.activity,p_respuestas:answers.activity
        }).then(r=>({kind:'activity',...r})));
      // Reutilizar los mismos UUID en cualquier reintento impide duplicar avances.
      const responses=await Promise.all(actions);
      if(version!==requestVersion)return;
      const combined={};
      let correct=0;
      for(const response of responses){
        if(response.error)throw response.error;
        const result=Array.isArray(response.data)?response.data[0]:response.data;
        const selected=answers[response.kind];
        if(!result||result.total!==Object.keys(selected).length
           ||Object.keys(result.correcciones||{}).length!==result.total)
          throw Error('La corrección del servidor llegó incompleta.');
        correct+=result.aciertos;
        for(const [id,value] of Object.entries(result.correcciones))
          combined[response.kind+':'+id]=value;
      }
      for(const q of items){
        const correction=combined[q._kind+':'+q.id];
        if(!correction)throw Error('Falta corregir una pregunta.');
        const box=$('repaso-feedback-'+q._kind+'-'+q.id);
        const passed=q._kind==='classic'?correction.correcta:correction.estado==='correcta';
        let solution='';
        if(q._kind==='classic'){
          const index=Number(correction.respuesta_correcta);
          solution=('ABCDEFGH'[q.displayOrder.indexOf(index)]||'?')+') '+q.opciones[index];
        }else if(q.tipo==='seleccion'){
          solution=q.opciones[Number(correction.solucion)]||'';
        }else{
          solution=Array.isArray(correction.solucion)?correction.solucion.join(' · '):
            String(correction.solucion||'');
        }
        box.textContent=(passed?'✓ Correcta':'✗ Pendiente de repasar')+
          '\nRespuesta correcta: '+solution+'\n'+(correction.explicacion||'');
        box.hidden=false;
      }
      finished=true;summary.replaceChildren();
      const score=document.createElement('strong');
      score.textContent=correct+' / '+items.length+' · '+(100*correct/items.length).toFixed(1)+'%';
      const detail=document.createElement('p');
      detail.textContent=correct+' preguntas superadas. '+(items.length-correct)+
        ' siguen pendientes. No cambian las notas de tus exámenes originales.';
      const next=document.createElement('button');
      next.type='button';next.textContent='Practicar otra tanda de errores';
      next.onclick=()=>startExam();
      summary.append(score,detail,next);summary.hidden=false;
      status.textContent='Repaso unificado corregido y guardado en Supabase.';
      submit.disabled=true;submit.textContent='Repaso terminado';
      summary.scrollIntoView({behavior:'smooth',block:'center'});
    }catch(e){
      if(version!==requestVersion)return;
      status.textContent='No se pudo confirmar todo el repaso: '+(e.message||String(e))+
        '. Puedes reintentar sin duplicar los intentos registrados.';
      submit.disabled=false;submit.textContent='Reintentar corrección';
    }finally{if(version===requestVersion)busy=false}
  }
  start.addEventListener('click',startExam);
  form.addEventListener('change',updateProgress);
  form.addEventListener('input',updateProgress);
  form.addEventListener('submit',deliver);
  eeDb.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT')reset()});
  if(new URLSearchParams(location.search).get('repaso')==='fallos')startExam();
})();