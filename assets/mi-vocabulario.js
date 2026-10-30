/* Tarjetas de traducción con repaso espaciado; el servidor (RLS) protege datos de usuario. */
(()=>{'use strict';
const $=id=>document.getElementById(id),db=window.eeDb||(typeof eeDb!=='undefined'?eeDb:null);
const levels=['A1','A2','B1','B2','C1'],today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
let user=null,settings=null,queue=[],position=0,progress=[],vocabulary=[],answered=false,selectedGrade=null,saving=false;
const status=msg=>{$('vocab-status').textContent=msg};
function validate(s){const included=Array.isArray(s.levels)?s.levels.filter(x=>levels.includes(x)):levels;return {new_per_day:Math.max(5,Math.min(50,Number(s.new_per_day)||10)),levels:included.length?included:levels,priority:included.includes(s.priority)?s.priority:(included.includes('B2')?'B2':included[0]),direction:['en-es','es-en','mixed'].includes(s.direction)?s.direction:'en-es'}}
function direction(item,index){return settings.direction==='mixed'?(index%2?'es-en':'en-es'):settings.direction}
function shuffle(array){
 const copy=[...array];
 for(let i=copy.length-1;i>0;i--){
  const j=Math.floor(Math.random()*(i+1));
  [copy[i],copy[j]]=[copy[j],copy[i]];
 }
 return copy;
}
function getChoices(item,reverse){
 const field=reverse?'en':'es';
 const correct=String(item[field]||'').trim();
 const used=new Set([correct.toLocaleLowerCase('es')]);
 const wrong=[];
 // Distintas respuestas reales del catálogo, sin duplicar la traducción correcta.
 for(const candidate of shuffle(vocabulary)){
  if(candidate.id===item.id)continue;
  const option=String(candidate[field]||'').trim();
  const key=option.toLocaleLowerCase('es');
  if(!option||used.has(key))continue;
  used.add(key);
  wrong.push(option);
  if(wrong.length===2)break;
 }
 if(wrong.length!==2)return null;
 return shuffle([correct,...wrong]).map(value=>({value,correct:value===correct}));
}
function showCard(){
 const item=queue[position];
 $('vocab-card').hidden=!item;
 $('vocab-complete').hidden=!!item;
 if(!item)return;
 answered=false;selectedGrade=null;
 const reverse=direction(item,position)==='es-en';
 const options=getChoices(item,reverse);
 if(!options){$('vocab-card').hidden=true;status('Necesitamos al menos tres palabras con respuestas diferentes para practicar.');return}
 $('vocab-position').textContent=(position+1)+' / '+queue.length;
 $('vocab-level').textContent=item.level;
 $('vocab-front').textContent=reverse?item.es:item.en;
 $('vocab-back').textContent=reverse?item.en:item.es;
 $('vocab-example').textContent=item.example||'';
 $('vocab-result').textContent='';
 $('vocab-answer').hidden=true;
 $('vocab-next').hidden=true;
 const list=$('vocab-option-list');
 list.replaceChildren();
 options.forEach((choice,index)=>{
  const btn=document.createElement('button');
  btn.type='button';
  btn.className='ee-vocab-option';
  btn.dataset.correct=String(choice.correct);
  btn.textContent=choice.value;
  btn.setAttribute('aria-label','Opción '+(index+1)+': '+choice.value);
  list.append(btn);
 });
}
function chooseAnswer(button){
 if(answered||saving||!button)return;
 answered=true;
 const correct=button.dataset.correct==='true';
 selectedGrade=correct?2:0;
 const buttons=$('vocab-option-list').querySelectorAll('button');
 buttons.forEach(btn=>{
  btn.disabled=true;
  if(btn.dataset.correct==='true')btn.classList.add('is-correct');
  if(btn===button&&!correct)btn.classList.add('is-incorrect');
 });
 $('vocab-result').textContent=correct?'¡Correcto! Muy bien.':'No es esa. La respuesta correcta es:';
 $('vocab-answer').hidden=false;
 $('vocab-next').hidden=false;
 $('vocab-next').focus();
}
async function refresh(){status('Cargando tus tarjetas…');const [a,b,c]=await Promise.all([db.from('vocabulario_preferencias').select('*').eq('user_id',user.id).maybeSingle(),db.from('vocabulario_progreso').select('*').eq('user_id',user.id),db.from('vocabulario_items').select('id,en,es,example,level').limit(1000)]);for(const r of [a,b,c])if(r.error)throw r.error;settings=validate(a.data||{});progress=b.data||[];const form=$('vocab-settings-form');form.querySelector('#vocab-count').value=settings.new_per_day;form.querySelector('#vocab-priority').value=settings.priority;form.querySelector('#vocab-direction').value=settings.direction;form.querySelectorAll('[name=vocab-level]').forEach(el=>{el.checked=settings.levels.includes(el.value)});const byId=new Map(progress.map(p=>[p.item_id,p]));const vocab=(c.data||[]).filter(x=>settings.levels.includes(x.level));vocabulary=vocab;const due=vocab.filter(x=>{const p=byId.get(x.id);return p&&p.next_review_at<=new Date().toISOString()}).sort((x,y)=>byId.get(x.id).next_review_at.localeCompare(byId.get(y.id).next_review_at));const seenToday=progress.filter(p=>p.first_seen_day===today()).length;const allowance=Math.max(0,settings.new_per_day-seenToday);const fresh=vocab.filter(x=>!byId.has(x.id)).sort((a,b)=>Number(b.level===settings.priority)-Number(a.level===settings.priority)).slice(0,allowance);queue=[...due,...fresh];position=0;$('vocab-due').textContent=due.length;$('vocab-new').textContent=fresh.length;$('vocab-learned').textContent=progress.length;$('vocab-start').disabled=!queue.length||new Set(vocab.map(x=>String(x.es).trim().toLowerCase())).size<3||new Set(vocab.map(x=>String(x.en).trim().toLowerCase())).size<3;$('vocab-card').hidden=true;$('vocab-complete').hidden=!!queue.length;status($('vocab-start').disabled&&queue.length?'Se necesitan al menos tres traducciones diferentes para ofrecer las tres opciones.':queue.length?'Hay '+queue.length+' preguntas de tres opciones disponibles.':'Todo al día. ¡Buen trabajo!')}
async function rate(grade){
 if(saving||!answered||position>=queue.length)return;
 saving=true;
 const card=queue[position],old=progress.find(p=>p.item_id===card.id);
 const correct=grade===2;
 const streak=correct?(old?.streak||0)+1:0;
 const minutes=correct?[0,3,7,14,30,60,120][Math.min(streak,6)]*1440:10;
 const next=new Date(Date.now()+minutes*60000).toISOString();
 const payload={user_id:user.id,item_id:card.id,streak,next_review_at:next,last_grade:grade,first_seen_day:old?.first_seen_day||today()};
 $('vocab-next').disabled=true;
 let result;
 try{result=await db.from('vocabulario_progreso').upsert(payload,{onConflict:'user_id,item_id'});}
 catch(e){result={error:e};}
 if(result.error){
  $('vocab-next').disabled=false;
  saving=false;
  status('No se ha podido guardar: '+(result.error.message||'error de conexión')+'. Vuelve a pulsar Siguiente palabra.');
  return;
 }
 progress=progress.filter(p=>p.item_id!==card.id);
 progress.push(payload);
 position++;
 saving=false;
 $('vocab-next').disabled=false;
 showCard();
 status(position<queue.length?'Respuesta guardada. Continúa con la siguiente palabra.':'¡Sesión completada y respuestas guardadas!');
}
async function init(){if(!db){status('No se ha podido iniciar Supabase. Comprueba que tu navegador permite cargar los scripts de cdn.jsdelivr.net y vuelve a intentarlo.');return}const {data,error}=await db.auth.getUser();if(error||!data?.user){status('Inicia sesión para repasar y guardar tus palabras.');$('vocab-login').hidden=false;return}user=data.user;$('vocab-app').hidden=false;try{await refresh()}catch(e){status('Falta configurar la base de datos o ha ocurrido un error: '+e.message)}}
$('vocab-settings-form').addEventListener('submit',async e=>{e.preventDefault();const checked=[...document.querySelectorAll('[name=vocab-level]:checked')].map(x=>x.value);if(!checked.length){status('Selecciona al menos un nivel.');return}const value=validate({new_per_day:$('vocab-count').value,levels:checked,priority:$('vocab-priority').value,direction:$('vocab-direction').value});const result=await db.from('vocabulario_preferencias').upsert({user_id:user.id,...value},{onConflict:'user_id'});if(result.error){status('No se han guardado los ajustes: '+result.error.message);return}await refresh();status('Preferencias guardadas.')});
$('vocab-start').addEventListener('click',showCard);$('vocab-reload').addEventListener('click',()=>refresh().catch(e=>status(e.message)));$('vocab-option-list').addEventListener('click',e=>chooseAnswer(e.target.closest('button.ee-vocab-option')));$('vocab-next').addEventListener('click',()=>{if(selectedGrade!==null)rate(selectedGrade)});init();
})();