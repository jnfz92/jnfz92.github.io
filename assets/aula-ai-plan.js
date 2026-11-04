/* Easy English · plan semanal B2 con IA, opt-in y almacenamiento privado. */
(()=>{'use strict';
 const $=id=>document.getElementById(id),A=window.EEAula,ai=window.eeAI,db=window.eeDb;
 const go=$('aulaAiGenerate');if(!go||!A||!db||!ai)return;
 const status=$('aulaAiStatus'),access=$('aulaAiAccess'),consent=$('aulaAiConsent'),
   output=$('aulaAiResult'),weeks=$('aulaAiWeeks'),keyLink=$('aulaAiKeyLink'),remove=$('aulaAiDelete'),
   next=$('aulaAiNext'),back=$('aulaAiBack'),stepLabel=$('aulaAiStepLabel'),progressBar=$('aulaAiProgressBar'),review=$('aulaAiReview');
 let currentStep=1;
 const steps=[...document.querySelectorAll('[data-ai-step]')];
 function showStep(n){currentStep=Math.max(1,Math.min(3,n));steps.forEach(s=>s.hidden=Number(s.dataset.aiStep)!==currentStep);stepLabel.textContent='Paso '+currentStep+' de 3';progressBar.style.width=(currentStep/3*100)+'%';back.hidden=currentStep===1;next.hidden=currentStep===3;next.textContent=currentStep===2?'Ver resumen →':'Continuar →';if(currentStep===3)updateReview();refresh();}
 function updateReview(){const days=[...document.querySelectorAll('[name=aulaAiDay]:checked')].map(x=>x.value);const names=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];review.textContent='Días: '+(days.length?days.map(x=>names[Number(x)]).join(', '):'ninguno')+' · '+$('aulaAiMinutes').selectedOptions[0].textContent+' por sesión · '+weeks.selectedOptions[0].textContent+' · Prioridad: '+$('aulaAiFocus').selectedOptions[0].textContent;}
 const DOW=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
 const el=(tag,content,cls)=>{const n=document.createElement(tag);if(content!==undefined)n.textContent=String(content);if(cls)n.className=cls;return n};
 let busy=false,available=false,lastPlan=null;
 async function refresh(){
  if(!A.user){access.textContent='Inicia sesión para crear un plan con IA.';available=false;go.disabled=true;return}
  available=!!ai.keyFor(A.user.id);
  access.textContent=available?'✓ Clave de OpenAI disponible. Autoriza el uso del resumen de aprendizaje para continuar.':'Primero guarda una clave temporal de OpenAI en tu cuenta.';
  keyLink.textContent=available?'Administrar clave temporal':'🔑 Configurar clave OpenAI';
  go.disabled=busy||!available||!consent.checked||!A.units.length||currentStep!==3;
  if(!available){output.replaceChildren();remove.hidden=true}
 }
 function makeRoadmap(profile){
   const unfinished=profile.units.filter(u=>u.state!=='completed');
   const goal=Math.max(4,Number(profile.weeks)||12);
   const totalMinutes=profile.days.length*profile.minutes*goal;
   const minutesPerUnit=unfinished.length?Math.floor(totalMinutes/unfinished.length):0;
   const weeks=Array.from({length:goal},(_,i)=>({
     week:i+1,slugs:unfinished.filter((u,index)=>Math.floor(index*goal/Math.max(1,unfinished.length))===i).map(u=>u.slug)
   }));
   return {weeks,remaining:unfinished.length,totalMinutes,minutesPerUnit};
 }
 function paint(plan){
   output.replaceChildren();
   if(!plan||typeof plan!=='object')return;
   const root=el('div',undefined,'aula-ai-result');
   root.append(el('h4','Tu semana personalizada'),el('p',String(plan.overview||'').slice(0,900)));
   if(plan.weeklyGoal)root.append(el('p','Objetivo semanal: '+String(plan.weeklyGoal).slice(0,450)));
   const known=new Map(A.units.map(u=>[u.slug,u]));
   const sessions=Array.isArray(plan.sessions)?plan.sessions.slice(0,7):[];
   for(const s of sessions){
    const day=Number(s.day);if(!Number.isInteger(day)||day<0||day>6)continue;
    const block=el('div',undefined,'aula-ai-day');
    block.append(el('h5',DOW[day]+' · '+String(s.minutes||'')+' minutos · '+String(s.title||'').slice(0,180)));
    const ul=el('ul');
    for(const t of (Array.isArray(s.tasks)?s.tasks:[]).slice(0,9)){
      const li=el('li',String(t.label||'').slice(0,350)+' · '+String(t.minutes||'')+' min');
      const slug=String(t.unitSlug||'');
      const unit=known.get(slug);
      if(unit){li.append(' · ');const a=el('a','Abrir unidad →');a.href='/curso.html#unidad-'+String(unit.orden).padStart(2,'0');li.append(a)}
      ul.append(li);
    }
    block.append(ul);root.append(block);
   }
   if(plan.roadmap&&Array.isArray(plan.roadmap.weeks)){
     const roadmap=plan.roadmap;
     root.append(el('h4','Ruta completa de unidades pendientes'));
     root.append(el('p',roadmap.remaining+' unidades por distribuir · '+roadmap.weeks.length+
       ' semanas · '+roadmap.totalMinutes+' minutos disponibles en total.'));
     if(roadmap.remaining&&roadmap.minutesPerUnit<55){
       root.append(el('p','Tu disponibilidad deja aproximadamente '+roadmap.minutesPerUnit+
         ' minutos por unidad pendiente. Puede que necesites ampliar el plazo, dedicar más días o priorizar temas para estudiar y practicar cada unidad con suficiente profundidad.'));
     }
     const knownRoadmap=new Map(A.units.map(u=>[u.slug,u]));
     for(const week of roadmap.weeks.slice(0,52)){
       const details=el('details',undefined,'aula-ai-day');
       details.append(el('summary','Semana '+week.week+' · '+week.slugs.length+' unidades pendientes'));
       const list=el('ul');
       if(!week.slugs.length)list.append(el('li','Semana para repaso, Writing y Speaking.'));
       for(const slug of week.slugs.slice(0,20)){
         const unit=knownRoadmap.get(slug);if(!unit)continue;
         const li=el('li',String(unit.titulo||unit.slug).slice(0,180)+' · ');
         const a=el('a','Abrir unidad →');a.href='/curso.html#unidad-'+String(unit.orden).padStart(2,'0');li.append(a);list.append(li);
       }
       details.append(list);root.append(details);
     }
   }
   if(Array.isArray(plan.strategy)){
    root.append(el('h4','Estrategia de estudio'));const ul=el('ul');
    for(const tip of plan.strategy.slice(0,7))ul.append(el('li',String(tip).slice(0,500)));
    root.append(ul);
   }
   if(plan.nextReview)root.append(el('p','Próximo repaso: '+String(plan.nextReview).slice(0,450)));
   root.append(el('p','Plan orientativo creado con OpenAI; no equivale a una evaluación oficial ni garantiza aprobar el FCE.'));
   output.append(root);
 }
 async function loadSaved(){
   if(!A.user||!available)return;
   const {data,error}=await db.from('planes_ia_b2').select('semanas,plan').eq('usuario_id',A.user.id).maybeSingle();
   if(error){status.textContent='No se pudo cargar tu último plan IA: '+error.message;return}
   if(data?.plan){lastPlan=data.plan;weeks.value=String(data.semanas);paint(lastPlan);remove.hidden=false;status.textContent='Se ha recuperado tu último plan IA guardado.'}
 }
 async function gather(){
   const days=[...document.querySelectorAll('[name=aulaAiDay]:checked')].map(x=>Number(x.value));
   if(!days.length)throw Error('Selecciona al menos un día de estudio.');
   if(!A.units.length)throw Error('No se ha podido cargar el catálogo B2.');
   const completed=new Set(A.progress.filter(p=>p.estado==='completada').map(p=>p.unidad_slug));
   const started=new Set(A.progress.filter(p=>p.estado==='en_curso').map(p=>p.unidad_slug));
   return {days,minutes:Number($('aulaAiMinutes').value),weeks:Number(weeks.value),
    focus:$('aulaAiFocus').value,examDate:$('aulaAiExamDate').value,
    units:A.units.map(u=>({slug:u.slug,title:u.titulo,state:completed.has(u.slug)?'completed':started.has(u.slug)?'started':'pending'})),
    diagnostic:A.diagnostic?.desglose||null,reviewCount:A.reviewCount||0};
 }
 next.addEventListener('click',()=>{if(currentStep===1&&!document.querySelector('[name=aulaAiDay]:checked')){status.textContent='Elige al menos un día para estudiar.';return}status.textContent='';showStep(currentStep+1)});
 back.addEventListener('click',()=>{status.textContent='';showStep(currentStep-1)});
 document.querySelectorAll('[name=aulaAiDay],#aulaAiMinutes,#aulaAiWeeks,#aulaAiExamDate,#aulaAiFocus').forEach(x=>x.addEventListener('change',()=>{updateReview();refresh()}));
 go.addEventListener('click',async()=>{
   if(busy)return;
   await refresh();
   if(!available||!consent.checked){status.textContent='Debes guardar tu clave y dar permiso para generar el plan.';return}
   let profile;try{profile=await gather()}catch(e){status.textContent=e.message;return}
   busy=true;go.disabled=true;status.textContent='Preparando tu semana de estudio según tu progreso…';
   try{
     const result=await ai.run(db,'plan',{profile});
     if(!Array.isArray(result.sessions)||!result.sessions.length)throw Error('OpenAI no devolvió sesiones de estudio válidas.');
     // La ruta completa usa exclusivamente las unidades reales del curso.
     result.roadmap=makeRoadmap(profile);
     // No almacenar nunca una clave ni los textos de las solicitudes.
     const {error}=await db.from('planes_ia_b2').upsert({
       usuario_id:A.user.id,semanas:profile.weeks,plan:result,actualizado_en:new Date().toISOString()
     },{onConflict:'usuario_id'});
     lastPlan=result;paint(result);remove.hidden=false;
     status.textContent=error?'Plan generado, pero no se pudo guardar en tu cuenta: '+error.message:'✓ Plan personalizado generado y guardado en tu cuenta.';
   }catch(e){status.textContent=e.message||'No se pudo generar tu plan.'}
   finally{busy=false;refresh()}
 });
 remove.addEventListener('click',async()=>{
   if(!A.user||!available)return;
   if(!confirm('¿Eliminar tu planificación de IA guardada?'))return;
   const {error}=await db.from('planes_ia_b2').delete().eq('usuario_id',A.user.id);
   if(error){status.textContent='No se pudo eliminar el plan: '+error.message;return}
   lastPlan=null;output.replaceChildren();remove.hidden=true;status.textContent='Plan IA eliminado de tu cuenta.';
 });
 consent.onchange=refresh;
 showStep(1);
 window.addEventListener('pageshow',()=>{refresh()});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
 window.addEventListener('ee-aula-ready',async()=>{await refresh();await loadSaved()});
 if(A.ready){refresh().then(loadSaved)}
})();
