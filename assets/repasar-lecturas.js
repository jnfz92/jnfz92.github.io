/* Easy English: examen basado en artículos leídos con corrección y fallos en Supabase. */
'use strict';
(()=>{
 const $=id=>document.getElementById(id);
 const message=$('lectureExamMessage');
 const button=$('lectureExamStart'),send=$('lectureExamSend'),reload=$('lectureExamAgain');
 const form=$('lectureExamForm'),summary=$('lectureExamSummary'),meta=$('lectureExamMeta'),history=$('lectureExamHistory');
 const account=$('lectureExamAccount'),count=$('lectureExamQuantity');
 let user=null,questions=[],attempt=null,working=false,finished=false;
 const say=(value,isError=false)=>{message.textContent=value;message.classList.toggle('error',isError);};
 const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;};
 const articleLink=(slug)=>'leer.html?slug='+encodeURIComponent(slug);
 function reset(){
  questions=[];attempt=null;finished=false;form.replaceChildren();form.hidden=true;summary.hidden=true;
  summary.replaceChildren();send.hidden=true;reload.hidden=true;meta.textContent='';
 }
 async function showHistory(){
  history.replaceChildren();
  if(!user){history.textContent='Inicia sesión para guardar y consultar tus resultados.';return;}
  const {data,error}=await eeDb.from('examenes_lecturas').select('id,creado_en,terminado_en,aciertos,total').eq('usuario_id',user.id).not('terminado_en','is',null).order('terminado_en',{ascending:false}).limit(8);
  if(error){history.textContent='No se pudo consultar el historial.';return;}
  if(!data?.length){history.textContent='Todavía no has hecho exámenes personalizados.';return;}
  for(const item of data){
   const p=node('p',new Date(item.terminado_en).toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric'})+' · '+item.aciertos+'/'+item.total+' correctas');
   history.append(p);
  }
 }
 async function checkAccount(){
  try{
   const {data,error}=await eeDb.auth.getUser();
   if(error&&error.name!=='AuthSessionMissingError')throw error;
   user=data?.user||null;
   if(user){
    account.textContent='✓ Cuenta conectada · tus resultados y errores se guardarán en tu perfil.';
    button.disabled=false;await showHistory();
    if(!attempt)say('Elige cuántas preguntas quieres y empieza tu examen.');
   }else{
    account.replaceChildren(node('span','Para crear un examen con tus lecturas, '));
    const a=node('a','inicia sesión desde tu perfil');a.href='perfil.html';account.append(a);
    button.disabled=true;reset();history.textContent='Inicia sesión para consultar tus resultados.';
    say('Se necesita una cuenta para identificar los artículos que has leído.');
   }
  }catch(err){button.disabled=true;say('No se pudo validar la sesión: '+err.message,true);}
 }
 function render(){
  form.replaceChildren();
  const intro=node('p','Las preguntas proceden de los artículos que has marcado como leídos. Pulsa «Corregir y guardar» para ver las soluciones.','hint');
  form.append(intro);
  questions.forEach((q,index)=>{
   const section=node('fieldset',undefined,'review-question');
   const legend=node('legend',(index+1)+'. '+q.enunciado);section.append(legend);
   const source=node('a','Repasar teoría: '+(q.articulo_titulo||q.articulo_slug),'source-link');
   source.href=articleLink(q.articulo_slug);source.target='_blank';source.rel='noopener';
   section.append(source);
   q.opciones.forEach((option,k)=>{
    const label=node('label',undefined,'review-option');
    const input=document.createElement('input');input.type='radio';input.name='answer-'+q.id;input.value=String(k);input.required=true;
    label.append(input,node('span',String(option)));section.append(label);
   });
   form.append(section);
  });
  form.hidden=false;send.hidden=false;
 }
 button.addEventListener('click',async()=>{
  if(working||!user)return;working=true;button.disabled=true;reset();say('Buscando preguntas de tus artículos leídos…');
  try{
   const {data,error}=await eeDb.rpc('iniciar_examen_lecturas',{p_cantidad:Number(count.value)});
   if(error)throw error;
   attempt=data.intento_id;questions=Array.isArray(data.preguntas)?data.preguntas:[];
   if(!attempt||!questions.length)throw new Error('No se encontraron preguntas disponibles');
   meta.textContent='Artículos leídos: '+data.articulos_leidos+' · Preguntas disponibles de '+data.articulos_con_preguntas+' artículos · Examen de '+questions.length+' preguntas.';
   render();say('Examen preparado. Las soluciones se mostrarán cuando lo entregues.');
   form.scrollIntoView({behavior:'smooth',block:'start'});
  }catch(err){say((err.message||'No se pudo generar el examen')+'. Puedes leer más artículos o consultar los exámenes de práctica.',true);}
  finally{working=false;button.disabled=!user;}
 });
 form.addEventListener('change',()=>{
  if(!questions.length)return;
  const n=questions.filter(q=>form.querySelector('input[name="answer-'+q.id+'"]:checked')).length;
  say('Respondidas: '+n+' de '+questions.length);
 });
 send.addEventListener('click',async()=>{
  if(working||finished||!attempt)return;
  const responses={};
  for(const q of questions){
   const selected=form.querySelector('input[name="answer-'+q.id+'"]:checked');
   if(!selected){say('Responde las '+questions.length+' preguntas antes de corregir.',true);form.querySelector('input[name="answer-'+q.id+'"]')?.focus();return;}
   responses[q.id]=Number(selected.value);
  }
  working=true;send.disabled=true;say('Corrigiendo y guardando los fallos…');
  try{
   const {data,error}=await eeDb.rpc('entregar_examen_lecturas',{p_intento_id:attempt,p_respuestas:responses});
   if(error)throw error;
   finished=true;send.hidden=true;
   summary.replaceChildren();
   summary.append(node('strong',data.aciertos+' / '+data.total+' aciertos','score'));
   summary.append(node('p','Nota: '+data.nota+' % · '+data.errores_guardados+' fallos guardados para próximos repasos.'));
   const link=node('a','📘 Practicar mis preguntas falladas →','review-errors-link');
   link.href='practicar.html#cuaderno-fallos';summary.append(link);
   const solutions=new Map((data.detalle||[]).map(item=>[String(item.pregunta_id),item]));
   for(const q of questions){
    const result=solutions.get(String(q.id));
    const fieldset=form.querySelector('input[name="answer-'+q.id+'"]')?.closest('fieldset');
    if(!result||!fieldset)continue;
    fieldset.classList.add(result.correcta?'right-answer':'wrong-answer');
    const correct=q.opciones[result.respuesta_correcta]||'Opción '+result.respuesta_correcta;
    fieldset.append(node('p',(result.correcta?'✓ Correcto. ':'✗ Incorrecto. ')+'Respuesta correcta: '+correct+'. '+result.explicacion,'explanation'));
    fieldset.querySelectorAll('input').forEach(input=>{input.disabled=true;});
   }
   summary.hidden=false;reload.hidden=false;say('Examen corregido. Se han guardado la nota y los errores en tu cuenta.');
   await showHistory();summary.scrollIntoView({behavior:'smooth',block:'start'});
  }catch(err){say('No se pudo guardar la corrección: '+err.message,true);send.disabled=false;}
  finally{working=false;}
 });
 reload.addEventListener('click',()=>{reset();button.click();});
 if(typeof eeDb==='undefined'){say('No se pudo cargar Supabase. Comprueba tu conexión a Internet.',true);button.disabled=true;return;}
 eeDb.auth.onAuthStateChange((event)=>{
  if(['SIGNED_IN','SIGNED_OUT','TOKEN_REFRESHED','USER_UPDATED'].includes(event))setTimeout(checkAccount,0);
 });
 checkAccount();
})();
