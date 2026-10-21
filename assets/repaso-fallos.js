/* Easy English · Un mismo examen de errores para examenes y actividades. */
'use strict';
(()=>{
  const $=id=>document.getElementById(id);
  const start=$('reviewStart'),section=$('reviewSection'),form=$('reviewForm');
  const status=$('reviewStatus'),summary=$('reviewSummary'),progress=$('reviewProgress');
  const REVISAR=20;
  const stats=$('reviewStats'),filter=$('reviewMode'),lengthSelect=$('reviewLength'),topicSelect=$('reviewTopic');
  const jump=$('reviewNextUnanswered');
  const notebook=$('cuaderno-fallos');
  const privateContent=$('reviewPrivateContent');
  const shortcut=document.querySelector('.review-aside-shortcut');
  const loginHint=$('reviewLoginHint');
  function showNotebook(signedIn){
    // El ancla #cuaderno-fallos permanece visible para invitados y usuarios.
    // Solo el contenido privado aparece tras validar la sesión en Supabase.
    const previouslyHidden=privateContent.hidden;
    privateContent.hidden=!signedIn;
    if(shortcut)shortcut.hidden=!signedIn;
    if(loginHint)loginHint.hidden=!!signedIn;
    if(signedIn&&previouslyHidden&&location.hash==='#cuaderno-fallos'){
      requestAnimationFrame(()=>notebook.scrollIntoView({block:'start'}));
    }
  }
  let statsRevision=0;
  const temaSolicitado=new URLSearchParams(location.search).get('tema');
  const temasValidos=['Tiempos verbales','Condicionales','Voz pasiva','Verbos modales','Phrasal verbs','Preposiciones','Preguntas','Question tags','Vocabulario'];
  const temasExamen8=['Tiempos verbales','Tiempos verbales','Tiempos verbales','Tiempos verbales','Condicionales','Condicionales','Voz pasiva','Verbos modales','Verbos modales','Verbos modales','Phrasal verbs','Phrasal verbs','Phrasal verbs','Phrasal verbs','Preposiciones','Phrasal verbs','Preguntas','Question tags','Vocabulario','Vocabulario'];
  let temaActivo=temasValidos.includes(temaSolicitado)?temaSolicitado:null;
  const temaPregunta=q=>Number(q.examen_id)===8&&Number(q.orden)>=1&&Number(q.orden)<=20?temasExamen8[Number(q.orden)-1]:null;

  let items=[],answers=null,attempts=null,busy=false,finished=false,owner=null,requestVersion=0,overviewLoaded=false;
  function topicFor(q){
    const source=String(q.fuente_url||q.actividades?.titulo||'').toLowerCase();
    if(Number(q.examen_id)===8)return temaPregunta(q)||'Otros temas';
    if(/adjetiv|adjectiv|negative-prefix|prefix/.test(source))return 'Adjetivos y prefijos';
    if(/adverbi|adverb/.test(source))return 'Adverbios';
    if(/sustantiv|noun/.test(source))return 'Sustantivos';
    if(/reported|direct-speech/.test(source))return 'Reported speech';
    if(/gerund|infinitive/.test(source))return 'Gerund e infinitivo';
    if(/condition|conditional/.test(source))return 'Condicionales';
    if(/modal|might/.test(source))return 'Verbos modales';
    if(/phrasal|get-phrasal/.test(source))return 'Phrasal verbs';
    if(/preposition/.test(source))return 'Preposiciones';
    if(/tenses|tiempos|past|present|future|perfect|used-to/.test(source))return 'Tiempos verbales';
    if(/vocab|environment|pollution|crime|word/.test(source))return 'Vocabulario';
    return 'Otros temas';
  }
  function reviewDue(q){
    return q._kind==='activity'||!q._next||new Date(q._next).getTime()<=Date.now();
  }
  function mostRecent(q){return new Date(q._last||0).getTime()||0}
  function rank(a,b){
    const score=q=>(reviewDue(q)?10000:0)+(Math.min(q._times||1,10)*700);
    return score(b)-score(a)||mostRecent(b)-mostRecent(a);
  }
  async function getPending(userId){
    const [c,a]=await Promise.all([
      eeDb.from('preguntas_falladas')
        .select('pregunta_id,veces_fallada,ultimo_fallo,proximo_repaso,preguntas(id,orden,enunciado,opciones,fuente_url,examen_id,examenes(titulo,lectura))')
        .eq('usuario_id',userId).eq('dominada',false)
        .order('ultimo_fallo',{ascending:false}).limit(500),
      eeDb.from('actividad_fallos')
        .select('pregunta_id,veces_fallada,ultimo_fallo,actividad_preguntas(id,orden,tipo,enunciado,configuracion,medio_tipo,medio_url,medio_alt,actividad_id,actividades(titulo,publicado))')
        .eq('usuario_id',userId).eq('dominada',false)
        .order('ultimo_fallo',{ascending:false}).limit(500)
    ]);
    if(c.error)throw c.error;if(a.error)throw a.error;
    const classic=(c.data||[]).filter(row=>row.preguntas&&Number.isSafeInteger(row.preguntas.id)
      &&Array.isArray(row.preguntas.opciones)&&row.preguntas.opciones.length>=2)
      .map(row=>({...row.preguntas,_kind:'classic',_times:row.veces_fallada||1,
        _last:row.ultimo_fallo,_next:row.proximo_repaso}));
    const activity=(a.data||[]).filter(row=>row.actividad_preguntas
      &&Number.isSafeInteger(row.actividad_preguntas.id)&&row.actividad_preguntas.actividades?.publicado
      &&(['seleccion'].includes(row.actividad_preguntas.tipo)
       ?Array.isArray(row.actividad_preguntas.configuracion?.opciones)
        &&row.actividad_preguntas.configuracion.opciones.length>=2
       :['texto_corto','transformacion'].includes(row.actividad_preguntas.tipo)
        ||(row.actividad_preguntas.tipo==='huecos'&&Array.isArray(row.actividad_preguntas.configuracion?.campos)
          &&row.actividad_preguntas.configuracion.campos.length>0)))
      .map(row=>({...row.actividad_preguntas,_kind:'activity',_times:row.veces_fallada||1,
        _last:row.ultimo_fallo,_next:null}));
    const all=[...classic,...activity];
    all.forEach(q=>q._topic=topicFor(q));
    return all;
  }
  function setOverview(all){
    overviewLoaded=true;
    const due=all.filter(reviewDue).length;
    const repeats=all.filter(q=>q._times>=2).length;
    stats.replaceChildren();
    for(const [num,label] of [[all.length,'Errores pendientes'],[due,'Para repasar hoy'],[repeats,'Fallados varias veces']]){
      const card=document.createElement('div');card.className='review-stat';
      const count=document.createElement('strong');count.textContent=String(num);
      const caption=document.createElement('span');caption.textContent=label;
      card.append(count,caption);stats.append(card);
    }
    const selected=topicSelect.value||temaActivo||'';
    const counts=new Map();
    for(const q of all)counts.set(q._topic,(counts.get(q._topic)||0)+1);
    topicSelect.replaceChildren();
    const first=document.createElement('option');first.value='';first.textContent='Todos los temas';topicSelect.append(first);
    for(const name of [...counts.keys()].sort((a,b)=>a.localeCompare(b,'es'))){
      const option=document.createElement('option');option.value=name;option.textContent=name+' ('+counts.get(name)+')';
      topicSelect.append(option);
    }
    if(counts.has(selected))topicSelect.value=selected;
    else {temaActivo=null;topicSelect.value='';}
  }
  async function refreshOverview(){
    const version=++statsRevision;
    let authenticated=false;
    try{
      const {data:{user},error}=await eeDb.auth.getUser();
      if(error)throw error;
      if(version!==statsRevision)return;
      if(!user){
        showNotebook(false);
        stats.replaceChildren();overviewLoaded=false;
        status.textContent='Inicia sesión para consultar y practicar tus errores guardados.';
        return;
      }
      authenticated=true;
      showNotebook(true);
      stats.textContent='Consultando tus fallos guardados…';
      const available=await getPending(user.id);
      if(version!==statsRevision)return;
      setOverview(available);
      if(!available.length)status.textContent='🎉 No tienes errores pendientes. ¡Sigue así!';
      else if(!items.length)status.textContent='Tienes '+available.length+' errores pendientes. Selecciona tu repaso y empieza.';
    }catch(e){
      if(version!==statsRevision)return;
      showNotebook(authenticated);
      stats.textContent='No se pudieron cargar las estadísticas.';
      status.textContent='No se pudo consultar el cuaderno: '+(e.message||String(e));
    }
  }

  function reset(){
    requestVersion++;
    items=[];answers=null;attempts=null;busy=false;finished=false;owner=null;
    form.replaceChildren();section.hidden=true;summary.hidden=true;
    status.textContent='';start.disabled=false;progress.textContent='';jump.hidden=true;
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
    jump.hidden=!!(finished||count===items.length);
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
      const priority=document.createElement('small');priority.className='review-priority';
      priority.textContent='📌 '+(q._topic||'Otros temas')+' · '+q._times+' fallo'+(q._times===1?'':'s')+
        (reviewDue(q)?' · Para repasar hoy':' · Programada para más adelante');
      group.append(priority);
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
    busy=true;start.disabled=true;jump.hidden=true;
    status.textContent='Buscando y ordenando tus errores por prioridad…';
    try{
      const {data:{user},error:authError}=await eeDb.auth.getUser();
      if(authError)throw authError;
      if(!user)throw Error('Inicia sesión para hacer tu examen de errores.');
      const available=await getPending(user.id);
      if(version!==requestVersion)return;
      setOverview(available);
      const requested=topicSelect.value||temaActivo||'';
      const mode=filter.value;
      let chosen=available.filter(q=>(!requested||q._topic===requested)&&
        (mode==='hoy'?reviewDue(q):mode==='reincidentes'?q._times>=2:true));
      if(!chosen.length){
        reset();
        status.textContent=available.length?'No hay errores para este filtro. Prueba «Repaso recomendado» o «Todos los errores».':
          '🎉 No tienes preguntas falladas pendientes. ¡Sigue practicando!';
        return;
      }
      // Se atienden primero los errores ya vencidos y los que más se repiten.
      chosen.sort(mode==='recientes'?(a,b)=>mostRecent(b)-mostRecent(a):rank);
      const target=Math.min(REVISAR,Number(lengthSelect.value)||10);
      const classics=chosen.filter(q=>q._kind==='classic'),activities=chosen.filter(q=>q._kind==='activity');
      const baseClassics=Math.min(classics.length,Math.ceil(target/2));
      const baseActivities=Math.min(activities.length,Math.floor(target/2));
      items=[...classics.slice(0,baseClassics),...activities.slice(0,baseActivities)];
      const reserved=new Set(items.map(q=>q._kind+':'+q.id));
      const remainder=chosen.filter(q=>!reserved.has(q._kind+':'+q.id)).sort(
        mode==='recientes'?(a,b)=>mostRecent(b)-mostRecent(a):rank);
      for(const q of remainder){if(items.length>=target)break;items.push(q);}
      items.sort(mode==='recientes'?(a,b)=>mostRecent(b)-mostRecent(a):rank);
      owner=user.id;attempts=null;answers=null;finished=false;
      status.textContent='Repaso listo: '+items.length+' de '+chosen.length+' preguntas del filtro seleccionado. '+
        'Priorizamos las que más fallas y las que toca repasar.';
      renderExam();
    }catch(e){
      if(version!==requestVersion)return;
      status.textContent='No se pudo preparar el repaso: '+(e.message||String(e));
    }finally{if(version===requestVersion){busy=false;start.disabled=false;}}
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
        const fieldset=$('repaso-'+q._kind+'-'+q.id);
        fieldset?.classList.add(passed?'review-correct':'review-incorrect');
        if((q._kind==='classic'||q.tipo==='seleccion')&&fieldset){
          const correctOption=q._kind==='classic'?Number(correction.respuesta_correcta):Number(correction.solucion);
          for(const input of fieldset.querySelectorAll('input[type="radio"]')){
            if(Number(input.value)===correctOption)input.closest('label')?.classList.add('review-right-choice');
          }
        }
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
      jump.hidden=true;
      refreshOverview();
      summary.scrollIntoView({behavior:'smooth',block:'center'});
    }catch(e){
      if(version!==requestVersion)return;
      status.textContent='No se pudo confirmar todo el repaso: '+(e.message||String(e))+
        '. Puedes reintentar sin duplicar los intentos registrados.';
      submit.disabled=false;submit.textContent='Reintentar corrección';
    }finally{if(version===requestVersion)busy=false}
  }
  start.addEventListener('click',startExam);
  jump.addEventListener('click',()=>{
    const missing=items.find(q=>!answered(q));
    if(!missing)return;
    const box=$('repaso-'+missing._kind+'-'+missing.id);
    box?.scrollIntoView({behavior:'smooth',block:'center'});
    box?.querySelector('input:not(:disabled)')?.focus({preventScroll:true});
  });
  topicSelect.addEventListener('change',()=>{temaActivo=topicSelect.value||null;});
  filter.addEventListener('change',()=>{
    if(items.length&&!finished)status.textContent='Filtro actualizado. Pulsa «Generar repaso» para aplicar los cambios.';
  });
  form.addEventListener('change',updateProgress);
  form.addEventListener('input',updateProgress);
  form.addEventListener('submit',deliver);
  eeDb.auth.onAuthStateChange(event=>{
    if(event==='SIGNED_OUT'){statsRevision++;reset();stats.replaceChildren();overviewLoaded=false;showNotebook(false);}
    if(event==='SIGNED_IN'||event==='SIGNED_OUT')setTimeout(refreshOverview,0);
  });
  showNotebook(false);
  refreshOverview();
  if(new URLSearchParams(location.search).get('repaso')==='fallos')startExam();
})();