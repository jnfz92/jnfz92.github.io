/* Minisimulacro de Use of English y Reading: práctica propia, no examen oficial */
(()=>{'use strict';const A=window.EEAula,$=A.$,db=A.db;
const bank=[
['grammar','Hardly _____ home when the phone rang.',['I had arrived','had I arrived','I arrived','have I arrived'],1,'Hardly al comienzo exige inversión: had I arrived.'],
['grammar','The manager suggested _____ the meeting until Tuesday.',['to postpone','postponing','postpone','to postponing'],1,'Suggest seguido de -ing.'],
['grammar','I wish I _____ about the change yesterday.',['knew','would know','had known','know'],2,'I wish + past perfect para un arrepentimiento.'],
['grammar','The more you practise, _____ confident you become.',['more','the most','the more','much'],2,'The more..., the more... indica relación de progreso.'],
['vocabulary','We have run _____ milk. Could you buy some?',['into','out of','across','away'],1,'Run out of significa quedarse sin.'],
['vocabulary','Her experience will _____ her an advantage.',['put','give','make','take'],1,'Give someone an advantage.'],
['vocabulary','His comments were completely _____ to the discussion.',['irrelevant','unlikely','impatient','unclearance'],0,'Irrelevant to = sin relación.'],
['vocabulary','The team managed to _____ the challenge.',['come over','overcome','take after','put through'],1,'Overcome a challenge = superar.'],
['reading','“Customers can return unused goods within 28 days, provided they keep the receipt.” What is required?',['Original packaging only','A receipt','A reason for return','An online account'],1,'Provided they keep the receipt.'],
['reading','“The proposal is promising; nevertheless, it needs further research.” The writer is...',['Fully opposed','Cautiously positive','Uninterested','Certain it will fail'],1,'Promising, pero necesita más investigación.'],
['reading','“Most commuters preferred the express bus, whereas residents near the stops reported more noise.” Who was less satisfied?',['Commuters','Drivers','Nearby residents','All passengers'],2,'Los residentes informaron de ruido.'],
['reading','“Applications received after midnight will not be considered.” Applicants should...',['Send their form before the deadline','Apply only at midnight','Call next morning','Submit without documents'],0,'No se aceptan solicitudes posteriores a la medianoche.']
].map(([topic,q,a,c,why])=>({topic,q,a,c,why}));

const LENGTH_MS=15*60*1000;
const DRAFT_PREFIX='ee-b2-mock-draft-v2:';
let clock=null,busy=false,draft=null,storageAvailable=true;
const form=$('mockForm'),start=$('mockStart'),retry=$('mockSaveRetry');
const discard=$('mockDiscard'),note=$('mockDraftStatus');
function draftKey(){return A.user?.id?DRAFT_PREFIX+A.user.id:null}
function newUUID(){
 if(window.crypto?.randomUUID)return window.crypto.randomUUID();
 const b=new Uint8Array(16);window.crypto.getRandomValues(b);
 b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;
 const s=[...b].map(n=>n.toString(16).padStart(2,'0')).join('');
 return s.slice(0,8)+'-'+s.slice(8,12)+'-'+s.slice(12,16)+'-'+s.slice(16,20)+'-'+s.slice(20);
}
function info(message){note.textContent=message}
function validAnswers(answers){
 const safe={};
 if(!answers||typeof answers!=='object'||Array.isArray(answers))return safe;
 for(let i=0;i<bank.length;i++){
  const value=answers[i];
  if(Number.isInteger(value)&&value>=0&&value<bank[i].a.length)safe[i]=value
 }
 return safe
}
function readDraft(){
 const key=draftKey();if(!key)return null;
 try{
  const raw=localStorage.getItem(key);
  if(!raw)return null;
  const item=JSON.parse(raw);
  if(item?.v!==2||item.owner!==A.user.id||
    !/^[a-f0-9-]{36}$/i.test(item.attemptId)||
    !Number.isFinite(item.deadline)||item.deadline<=0||
    !['active','pending'].includes(item.phase))return null;
  item.answers=validAnswers(item.answers);
  return item
 }catch(_){storageAvailable=false;return null}
}
function saveDraft(){
 const key=draftKey();if(!key||!draft)return;
 try{localStorage.setItem(key,JSON.stringify(draft));storageAvailable=true}
 catch(_){storageAvailable=false;info('Tu navegador no permite guardar el borrador. No cierres la pestaña.')}
}
function clearDraft(){
 const key=draftKey();
 if(key)try{localStorage.removeItem(key)}catch(_){}
 draft=null
}
function collected(){
 const answers={};
 for(let i=0;i<bank.length;i++){
  const marked=form.querySelector('input[name="mock'+i+'"]:checked');
  if(marked)answers[i]=Number(marked.value)
 }
 return validAnswers(answers)
}
function restoreInputs(){
 form.querySelectorAll('input[type=radio]').forEach(input=>{input.disabled=draft.phase==='pending'});
 for(const [index,value] of Object.entries(draft.answers)){
  const input=form.querySelector('input[name="mock'+index+'"][value="'+value+'"]');
  if(input)input.checked=true
 }
}
function renderDraft(restored=false){
 A.makeQuestions($('mockQuestions'),bank,'mock');
 restoreInputs();
 form.hidden=false;start.disabled=true;discard.hidden=draft.phase!=='active';
 retry.hidden=draft.phase!=='pending';
 form.querySelector('[type=submit]').disabled=draft.phase!=='active';
 $('mockResult').replaceChildren();
 if(draft.phase==='pending'){
  $('mockTimer').textContent='00:00';
  info('Las respuestas están protegidas. Pulsa «Reintentar guardado» para confirmar el resultado sin crear un segundo intento.');
  return
 }
 info(restored
  ?'Intento recuperado de este navegador. El tiempo continúa desde que empezaste.'
  :storageAvailable?'Respuestas guardadas automáticamente en este navegador.':'Mantén abierta esta pestaña para conservar las respuestas.');
 tick();if(draft?.phase==='active'&&!clock)clock=setInterval(tick,1000)
}
function tick(){
 if(!draft||draft.phase!=='active')return;
 const left=Math.max(0,Math.ceil((draft.deadline-Date.now())/1000));
 $('mockTimer').textContent=String(Math.floor(left/60)).padStart(2,'0')+':'+String(left%60).padStart(2,'0');
 if(!left){clearInterval(clock);clock=null;void finish(true)}
}
start.onclick=()=>{
 if(!A.check()||draft||busy)return;
 const now=Date.now();
 draft={v:2,owner:A.user.id,attemptId:newUUID(),deadline:now+LENGTH_MS,
   answers:{},phase:'active',finishedAt:null,expired:false};
 saveDraft();renderDraft()
};
form.addEventListener('change',()=>{
 if(!draft||draft.phase!=='active')return;
 draft.answers=collected();saveDraft();
 if(storageAvailable)info('Borrador actualizado automáticamente. Puedes salir y volver a este navegador.')
});
form.onsubmit=event=>{event.preventDefault();void finish(false)};
retry.onclick=()=>{if(draft?.phase==='pending')void finish(Boolean(draft.expired))};
discard.onclick=()=>{
 if(!draft||busy||draft.phase!=='active')return;
 if(!confirm('¿Descartar este intento y todas las respuestas guardadas?'))return;
 if(clock)clearInterval(clock);clock=null;
 clearDraft();form.hidden=true;start.disabled=false;
 discard.hidden=true;retry.hidden=true;$('mockResult').replaceChildren();
 info('Borrador descartado. Puedes comenzar un nuevo minisimulacro.')
};
function snapshot(item){
 const answers=validAnswers(item.answers),details={};
 let correct=0,responded=0;
 bank.forEach((question,i)=>{
  const choice=answers[i];
  if(Number.isInteger(choice))responded++;
  const group=details[question.topic]||{aciertos:0,total:0};
  group.total++;
  if(choice===question.c){correct++;group.aciertos++}
  details[question.topic]=group
 });
 const started=item.deadline-LENGTH_MS;
 const ended=Number(item.finishedAt)||Date.now();
 const elapsed=Math.max(0,Math.min(900,Math.ceil((ended-started)/1000)));
 return {answers,correct,responded,details,elapsed}
}
async function finish(expired){
 if(busy||!A.user||!draft||draft.owner!==A.user.id)return;
 if(draft.phase==='active'){
  draft.answers=collected();
  draft.expired=expired||Date.now()>=draft.deadline;
  draft.finishedAt=Date.now();
  draft.phase='pending';
  saveDraft()
 }
 const pending=draft;
 busy=true;clearInterval(clock);clock=null;
 form.querySelectorAll('input').forEach(input=>{input.disabled=true});
 form.querySelector('[type=submit]').disabled=true;
 discard.hidden=true;retry.hidden=true;
 info('Guardando el resultado…');
 const score=snapshot(pending);
 try{
  // La clave única (usuario_id,intento_id) impide duplicados también si se
  // pierde la respuesta HTTP después de que Supabase haya guardado el registro.
  const result=await db.from('simulacros_b2').upsert({
   usuario_id:pending.owner,intento_id:pending.attemptId,
   modalidad:'use_of_english',aciertos:score.correct,total:bank.length,
   respuestas:score.answers,duracion_segundos:score.elapsed
  },{onConflict:'usuario_id,intento_id',ignoreDuplicates:true});
  if(result.error)throw result.error;
  clearDraft();form.hidden=true;start.disabled=false;
  retry.hidden=true;discard.hidden=true;
  $('mockResult').replaceChildren();
  const box=$('mockResult');
  box.append(A.elt('p',score.correct+' de '+bank.length+' correctas · '+score.responded+
    ' contestadas · '+Math.ceil(score.elapsed/60)+' min.','aula-score'));
  if(pending.expired)box.append(A.elt('p','Se ha agotado el tiempo del minisimulacro.'));
  box.append(A.elt('p','Resultado privado guardado. Esta actividad no sustituye un examen B2 oficial.','aula-tiny'));
  A.feedback(bank,score.answers,box);
  info('Resultado confirmado. El borrador local se ha eliminado.');
  try{await loadHistory()}catch(e){A.note('mockHistory','Resultado guardado, pero no se pudo actualizar el historial: '+e.message)}
 }catch(e){
  // No eliminar el intento: el servidor podría haberlo recibido. Reenviar el
  // mismo intento es seguro gracias a la restricción UNIQUE de Supabase.
  info('No se pudo confirmar el guardado: '+(e.message||String(e))+
    '. Conservamos las respuestas. Pulsa «Reintentar guardado» cuando tengas conexión.');
  retry.hidden=false;
  saveDraft()
 }finally{busy=false}
}
async function loadHistory(){
 const result=await db.from('simulacros_b2').select('modalidad,aciertos,total,creado_en,duracion_segundos').eq('usuario_id',A.user.id).order('creado_en',{ascending:false}).limit(10);
 if(result.error)throw result.error;
 const root=$('mockHistory');root.replaceChildren();
 if(!result.data?.length){root.textContent='Todavía no has realizado prácticas cronometradas o de Listening.';return}
 result.data.forEach(item=>{
  const date=new Date(item.creado_en).toLocaleDateString('es-ES');
  const label=item.modalidad==='listening'?'🎧 Listening':'✎ Use of English / Reading';
  root.append(A.elt('div',label+' · '+item.aciertos+'/'+item.total+' correctas · '+date,'aula-review'))
 })
}
window.addEventListener('ee-aula-ready',()=>{
 draft=readDraft();
 if(draft)renderDraft(true);
 else info('Las respuestas se guardarán automáticamente al empezar el minisimulacro.');
 loadHistory().catch(e=>A.note('mockHistory','No se pudo cargar el historial: '+e.message))
});
window.addEventListener('pagehide',()=>{if(clock)clearInterval(clock);clock=null;if(draft)saveDraft()});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&draft)saveDraft()});
})();
