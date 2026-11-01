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
let deadline=0,clock=null,busy=false,active=false;
function tick(){
 const left=Math.max(0,Math.ceil((deadline-Date.now())/1000));
 $('mockTimer').textContent=String(Math.floor(left/60)).padStart(2,'0')+':'+String(left%60).padStart(2,'0');
 if(!left){clearInterval(clock);void finish(true)}
}
$('mockStart').onclick=()=>{
 if(!A.check())return;
 if(clock)clearInterval(clock);
 A.makeQuestions($('mockQuestions'),bank,'mock');
 $('mockForm').hidden=false;$('mockStart').disabled=true;
 $('mockResult').replaceChildren();deadline=Date.now()+15*60000;active=true;
 tick();clock=setInterval(tick,1000);
};
$('mockForm').onsubmit=e=>{e.preventDefault();void finish(false)};
async function finish(expired){
 if(!active||busy||!A.user)return;busy=true;clearInterval(clock);
 const answers={},details={},used=Math.max(0,Math.min(900,900-Math.ceil((deadline-Date.now())/1000)));
 let correct=0,responded=0;
 bank.forEach((q,i)=>{
  const radio=document.querySelector('input[name="mock'+i+'"]:checked'),choice=radio?Number(radio.value):null;
  answers[i]=choice;if(choice!==null)responded++;
  const count=details[q.topic]||{aciertos:0,total:0};count.total++;
  if(choice===q.c){correct++;count.aciertos++}details[q.topic]=count
 });
 try{
  const {error}=await db.from('simulacros_b2').insert({
   usuario_id:A.user.id,modalidad:'use_of_english',aciertos:correct,total:bank.length,
   respuestas:answers,duracion_segundos:used
  });if(error)throw error;
  active=false;$('mockForm').hidden=true;
  const box=$('mockResult');box.replaceChildren();
  box.append(A.elt('p',correct+' de '+bank.length+' correctas · '+responded+' contestadas · '+Math.ceil(used/60)+' min.','aula-score'));
  if(expired)box.append(A.elt('p','Se ha agotado el tiempo del minisimulacro.'));
  box.append(A.elt('p','Resultado privado guardado. Esta actividad no sustituye un examen B2 oficial.','aula-tiny'));
  A.feedback(bank,answers,box)
 }catch(e){A.note('aulaStatus','No se pudo guardar el simulacro: '+e.message)}
 finally{busy=false;$('mockStart').disabled=false;$('mockStart').textContent='Repetir minisimulacro'}
}
window.addEventListener('pagehide',()=>{if(clock)clearInterval(clock)});
})();