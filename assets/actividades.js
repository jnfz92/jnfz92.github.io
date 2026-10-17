/* Easy English · Motor universal de actividades. Las soluciones solo viven en Supabase. */
'use strict';
(()=>{
  const $=id=>document.getElementById(id);
  const skillNames={reading:'Reading',use_of_english:'Use of English',writing:'Writing',
    listening:'Listening',speaking:'Speaking',vocabulary:'Vocabulario',grammar:'Gramática'};
  let activities=[],questions=[],chosen=null,user=null,attempts=[],busy=false,submitted=false;
  let pending=null,loadVersion=0;

  const setText=(id,s)=>{$(id).textContent=s};
  function element(tag,className,txt){
    const n=document.createElement(tag);
    if(className)n.className=className;
    if(txt!==undefined)n.textContent=txt;
    return n;
  }
  function media(q){
    if(!['audio','imagen'].includes(q.medio_tipo)||!/^https:\/\/[^\s]+$/i.test(q.medio_url||''))return null;
    const fig=element('figure','activity-media');
    if(q.medio_tipo==='audio'){
      const a=element('audio');a.controls=true;a.preload='none';a.src=q.medio_url;
      a.setAttribute('aria-label',q.medio_alt||'Audio de la actividad');
      fig.append(a);
    }else{
      const img=element('img');img.src=q.medio_url;img.alt=q.medio_alt||'Imagen para resolver el ejercicio';
      img.loading='lazy';fig.append(img);
    }
    if(q.medio_alt)fig.append(element('figcaption','',q.medio_alt));
    return fig;
  }
  function addInput(parent,name,placeholder,max=500){
    const input=element('input','activity-text');
    input.type='text';input.name=name;input.maxLength=max;input.required=true;
    input.autocomplete='off';input.placeholder=placeholder||'Escribe tu respuesta';
    parent.append(input);return input;
  }
  function renderQuestion(q,index){
    const fs=element('fieldset','activity-question'),legend=element('legend','',(index+1)+'. '+q.enunciado);
    fs.id='activity-q-'+q.id;fs.append(legend);
    const asset=media(q);if(asset)fs.append(asset);
    const cfg=q.configuracion||{};
    if(q.tipo==='seleccion'){
      const opts=Array.isArray(cfg.opciones)?cfg.opciones:[];
      const container=element('div','activity-options');
      opts.forEach((option,i)=>{
        const label=element('label'),input=element('input');
        input.type='radio';input.name='act-'+q.id;input.value=String(i);
        input.required=true;
        label.append(input,document.createTextNode(' '+('ABCDEFGH'[i]||String(i+1))+') '+String(option)));
        container.append(label);
      });
      if(!opts.length)container.append(element('p','activity-muted','Pregunta sin opciones configuradas.'));
      fs.append(container);
    }else if(q.tipo==='huecos'){
      const fields=Array.isArray(cfg.campos)?cfg.campos:[];
      fields.forEach((f,i)=>{
        const group=element('div','activity-gap');
        const label=element('label','',String(f||'Hueco '+(i+1)));
        const name='act-'+q.id+'-h-'+i;
        label.htmlFor=name;group.append(label);
        const input=addInput(group,name,'Completa el hueco '+(i+1));
        input.id=name;fs.append(group);
      });
      if(!fields.length)fs.append(element('p','activity-muted','Pregunta sin huecos configurados.'));
    }else if(q.tipo==='texto_corto'||q.tipo==='transformacion'){
      if(q.tipo==='transformacion'&&cfg.palabra_clave)
        fs.append(element('p','activity-hint','Palabra clave: '+cfg.palabra_clave));
      addInput(fs,'act-'+q.id,'Escribe la frase o respuesta');
    }else if(q.tipo==='redaccion'){
      const textarea=element('textarea','activity-essay');
      textarea.name='act-'+q.id;textarea.maxLength=10000;textarea.required=true;
      textarea.placeholder='Escribe tu redacción aquí…';
      textarea.rows=9;fs.append(textarea);
      const hint=element('p','activity-hint');
      const lo=Number(cfg.min_palabras),hi=Number(cfg.max_palabras);
      const limit=(lo>0&&hi>=lo)?' · Orientación: '+lo+'–'+hi+' palabras':'';
      hint.textContent='0 palabras'+limit+' · Pendiente de revisión, no se puntúa automáticamente.';
      textarea.addEventListener('input',()=>{
        const words=textarea.value.trim()?textarea.value.trim().split(/\s+/).length:0;
        hint.textContent=words+' palabras'+limit+' · Pendiente de revisión, no se puntúa automáticamente.';
      });
      fs.append(hint);
    }else{
      fs.append(element('p','activity-muted','Tipo de pregunta aún no reconocido.'));
    }
    const fb=element('div','activity-feedback');
    fb.id='activity-fb-'+q.id;fb.hidden=true;fs.append(fb);
    return fs;
  }
  function latestAttempt(id){
    return attempts.find(x=>String(x.actividad_id)===String(id));
  }
  function renderCatalog(){
    const list=$('activityList');list.replaceChildren();
    const query=new URLSearchParams(location.search),unit=query.get('unidad');
    const visible=unit?activities.filter(a=>String(a.unidad_id)===unit):activities;
    if(!visible.length){
      setText('activityCatalogStatus',activities.length&&unit?
        'Todavía no hay actividades publicadas para esta unidad. Puedes ver el catálogo completo.':
        'Aún no hay actividades publicadas. El motor está preparado para incorporarlas desde Supabase.');
      if(unit){
        const a=element('a','activity-back','Ver todas las actividades →');
        a.href='actividades.html';list.append(a);
      }
      return;
    }
    setText('activityCatalogStatus',visible.length+' '+(visible.length===1?'actividad publicada':'actividades publicadas')+
      '. Elige una para comenzar.');
    visible.forEach(a=>{
      const card=element('article','activity-card');
      card.append(element('small','',skillNames[a.destreza]||'Actividad'));
      card.append(element('h3','',a.titulo));
      if(a.descripcion)card.append(element('p','',a.descripcion));
      const last=latestAttempt(a.id);
      if(last)card.append(element('small','',last.evaluables?
        'Tu último resultado: '+last.aciertos+'/'+last.evaluables+
        (last.pendientes_revision?' · '+last.pendientes_revision+' pendiente(s) de revisión':''):
        'Ya entregaste esta actividad · '+last.pendientes_revision+' pendiente(s) de revisión'));
      const button=element('button','','Empezar →');
      button.type='button';button.addEventListener('click',()=>openActivity(a));
      card.append(button);list.append(card);
    });
  }
  async function loadAttempts(){
    if(!user){attempts=[];renderCatalog();return}
    const owner=user.id;
    const {data,error}=await eeDb.from('actividad_intentos')
      .select('id,actividad_id,aciertos,evaluables,pendientes_revision,fecha')
      .eq('usuario_id',owner).order('fecha',{ascending:false}).limit(250);
    if(!user||user.id!==owner)return;
    if(error){console.warn('No se pudo cargar el historial de actividades',error);return}
    attempts=data||[];renderCatalog();
  }
  async function loadCatalog(){
    const {data,error}=await eeDb.from('actividades')
      .select('id,slug,titulo,descripcion,destreza,unidad_id,orden')
      .eq('publicado',true).order('orden',{ascending:true}).order('id',{ascending:true}).limit(250);
    if(error)throw error;
    activities=data||[];
    renderCatalog();
    const slug=new URLSearchParams(location.search).get('actividad');
    if(slug){
      const item=activities.find(a=>a.slug===slug);
      if(item)await openActivity(item);
      else setText('activityCatalogStatus','La actividad solicitada no está publicada.');
    }
  }
  async function openActivity(a){
    if(busy)return;
    const version=++loadVersion;
    pending=null;submitted=false;chosen=null;questions=[];
    $('activitySummary').hidden=true;
    $('activitySessionPanel').hidden=false;
    $('activityCatalogPanel').hidden=true;
    setText('activitySkill',skillNames[a.destreza]||'Actividad');
    setText('activitySessionTitle',a.titulo);
    setText('activityDescription',a.descripcion||'Responde las preguntas y guarda tu intento.');
    setText('activitySessionStatus','Preparando los ejercicios…');
    $('activitySubmit').disabled=false;
    $('activitySubmit').textContent='Corregir y guardar actividad';
    $('activityQuestions').replaceChildren();
    try{
      const {data,error}=await eeDb.from('actividad_preguntas')
        .select('id,orden,tipo,enunciado,configuracion,medio_tipo,medio_url,medio_alt')
        .eq('actividad_id',a.id).order('orden',{ascending:true}).limit(51);
      if(error)throw error;
      if(version!==loadVersion)return;
      if(!data?.length||data.length>50)throw Error('Esta actividad no tiene entre 1 y 50 preguntas.');
      chosen=a;questions=data;
      questions.forEach((q,i)=>$('activityQuestions').append(renderQuestion(q,i)));
      setText('activitySessionStatus','Actividad preparada: '+data.length+' '+(data.length===1?'pregunta':'preguntas')+'.');
      $('activitySessionPanel').scrollIntoView({behavior:'smooth',block:'start'});
    }catch(e){
      if(version!==loadVersion)return;
      setText('activitySessionStatus','No se pudo cargar la actividad: '+(e.message||String(e)));
      $('activitySubmit').disabled=true;
    }
  }
  function collectAnswers(){
    const answers={};
    for(const q of questions){
      const fs=$('activity-q-'+q.id);
      if(q.tipo==='seleccion'){
        const selected=fs.querySelector('input[name="act-'+q.id+'"]:checked');
        if(!selected){fs.scrollIntoView({behavior:'smooth',block:'center'});throw Error('Elige una opción en la pregunta '+q.orden+'.')}
        answers[q.id]=Number(selected.value);
      }else if(q.tipo==='huecos'){
        const fields=Array.isArray(q.configuracion?.campos)?q.configuracion.campos:[];
        if(!fields.length)throw Error('Falta configurar los huecos de la pregunta '+q.orden+'.');
        answers[q.id]=fields.map((_,i)=>{
          const input=fs.querySelector('[name="act-'+q.id+'-h-'+i+'"]');
          const value=(input?.value||'').trim();
          if(!value){fs.scrollIntoView({behavior:'smooth',block:'center'});throw Error('Completa todos los huecos de la pregunta '+q.orden+'.')}
          return value;
        });
      }else if(['texto_corto','transformacion','redaccion'].includes(q.tipo)){
        const value=(fs.querySelector('[name="act-'+q.id+'"]')?.value||'').trim();
        if(!value){fs.scrollIntoView({behavior:'smooth',block:'center'});throw Error('Responde la pregunta '+q.orden+'.')}
        answers[q.id]=value;
      }else throw Error('Tipo no compatible en la pregunta '+q.orden+'.');
    }
    return answers;
  }
  function feedbackFor(q,grading){
    const box=$('activity-fb-'+q.id),fs=$('activity-q-'+q.id);
    if(!grading)throw Error('Corrección incompleta.');
    const state=grading.estado;
    const heading=state==='correcta'?'✓ Correcta':
      state==='incorrecta'?'✗ Incorrecta':'✎ Entregada · pendiente de revisión';
    fs.classList.add(state==='correcta'?'is-correct':state==='incorrecta'?'is-incorrect':'is-review');
    let solution='';
    if(state!=='revision'&&grading.solucion!==null&&grading.solucion!==undefined){
      if(q.tipo==='seleccion')solution=(q.configuracion?.opciones||[])[Number(grading.solucion)]||'';
      else if(Array.isArray(grading.solucion))solution=grading.solucion.join(' · ');
      else solution=String(grading.solucion);
      if(solution)solution='\nSolución de referencia: '+solution;
    }
    box.textContent=heading+solution+(grading.explicacion?'\n'+grading.explicacion:'');
    box.hidden=false;
  }
  function showResult(data){
    if(!data||typeof data.detalle!=='object'||questions.some(q=>!data.detalle[q.id]))
      throw Error('El servidor no devolvió toda la corrección.');
    submitted=true;
    questions.forEach(q=>feedbackFor(q,data.detalle[q.id]));
    for(const field of $('activityForm').querySelectorAll('input,textarea'))field.disabled=true;
    const summary=$('activitySummary');summary.replaceChildren();
    const heading=element('strong','',data.evaluables?
      data.aciertos+' de '+data.evaluables+' autocorregibles correctas':
      'Actividad entregada');
    const details=element('p','',data.pendientes_revision?
      'Hay '+data.pendientes_revision+' respuesta(s) escrita(s) pendiente(s) de revisión. No se les ha asignado nota automática.':
      'Tu intento y las correcciones se han guardado en Supabase.');
    const again=element('button','activity-btn secondary','Volver a practicar');
    again.type='button';again.onclick=()=>openActivity(chosen);
    summary.append(heading,details,again);summary.hidden=false;
    $('activitySubmit').disabled=true;$('activitySubmit').textContent='Actividad terminada';
    setText('activitySessionStatus','Intento registrado correctamente.');
    summary.scrollIntoView({behavior:'smooth',block:'center'});
    loadAttempts().catch(e=>console.warn(e));
  }
  async function submit(event){
    event.preventDefault();
    if(busy||submitted||!chosen||!questions.length)return;
    try{
      if(!pending)pending={id:crypto.randomUUID(),answers:collectAnswers(),actividad:chosen.id};
    }catch(e){setText('activitySessionStatus',e.message||String(e));return}
    const version=loadVersion;
    busy=true;$('activitySubmit').disabled=true;
    setText('activitySessionStatus','Guardando y corrigiendo en Supabase…');
    try{
      const {data:{user:current},error:authError}=await eeDb.auth.getUser();
      if(authError)throw authError;
      if(!current)throw Error('Inicia sesión desde el perfil para entregar y guardar esta actividad.');
      if(user&&user.id!==current.id)throw Error('La sesión ha cambiado; vuelve a abrir la actividad.');
      const {data,error}=await eeDb.rpc('entregar_actividad',{
        p_actividad_id:pending.actividad,p_respuestas:pending.answers,p_intento_id:pending.id
      });
      if(error)throw error;
      if(version!==loadVersion)return;
      showResult(data);
    }catch(e){
      if(version!==loadVersion)return;
      setText('activitySessionStatus','No se pudo confirmar la entrega: '+(e.message||String(e))+
        '. Puedes reintentar: no se registrará dos veces.');
      $('activitySubmit').disabled=false;$('activitySubmit').textContent='Reintentar la entrega';
    }finally{
      if(version===loadVersion)busy=false;
    }
  }
  function back(){
    if(busy)return;
    ++loadVersion;chosen=null;questions=[];pending=null;submitted=false;
    $('activitySessionPanel').hidden=true;$('activityCatalogPanel').hidden=false;
    $('activityQuestions').replaceChildren();renderCatalog();
  }
  $('activityForm').addEventListener('submit',submit);
  $('activityBack').addEventListener('click',back);
  async function refreshUser(){
    const {data:{user:current},error}=await eeDb.auth.getUser();
    user=error?null:current;
    setText('activityAuthStatus',user?'Sesión iniciada: '+user.email+'. Los intentos se guardan en tu cuenta.':
      'No has iniciado sesión. Puedes ver las preguntas pero no entregar tus respuestas.');
    await loadAttempts();
  }
  eeDb.auth.onAuthStateChange(event=>{
    if(event==='SIGNED_OUT'){user=null;attempts=[];back();renderCatalog();
      setText('activityAuthStatus','Sin sesión. Inicia sesión desde el perfil para guardar tus intentos.');}
  });
  Promise.all([loadCatalog(),refreshUser()]).catch(e=>
    setText('activityCatalogStatus','Error al cargar actividades: '+(e.message||String(e))));
})();