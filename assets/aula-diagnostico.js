/* Diagnóstico orientativo de 12 preguntas, no equivale a certificación. */
(()=>{'use strict';const A=window.EEAula,$=A.$,db=A.db;
const BANK=[
['grammar','If I _____ more time, I would take an intensive course.',['have','had','will have','would have'],1,'Segundo condicional: if + pasado simple.'],
['grammar','She _____ here for five years when she moved abroad.',['worked','has worked','had been working','is working'],2,'Past perfect continuous indica duración anterior a otro hecho pasado.'],
['grammar','The report _____ by Friday, according to the manager.',['must finish','must be finished','must have finish','must finishing'],1,'Pasiva: modal + be + participio.'],
['grammar','He denied _____ the confidential document.',['to read','reading','read','to have readed'],1,'Deny va seguido de -ing.'],
['vocabulary','The company will _____ a new product next month.',['launch','throw','start up with','set in'],0,'Launch a product es la colocación adecuada.'],
['vocabulary','Despite the rain, they decided to _____ with the event.',['give in','carry on','look into','turn off'],1,'Carry on significa continuar.'],
['vocabulary','Her explanation was very _____, so everyone understood it.',['vague','straightforward','awkward','reluctant'],1,'Straightforward significa claro y fácil de entender.'],
['vocabulary','We need to _____ an agreement before the deadline.',['reach','win','arrive','come'],0,'Reach an agreement es la colocación correcta.'],
['reading','“Although the scheme was expensive initially, it saved money within two years.” What happened?',['It was abandoned','The cost was recovered through savings','It became more expensive','It lasted only two years'],1,'El ahorro posterior compensó el coste inicial.'],
['reading','“Visitors are advised to book in advance, particularly during school holidays.” Why?',['To get a discount','To avoid busy periods being fully booked','Because booking is always compulsory','To enter without tickets'],1,'Es una recomendación por la mayor demanda en vacaciones.'],
['reading','“Marta had intended to join the meeting but her train was delayed.” Did Marta attend?',['The text does not confirm attendance','Yes, early','No, because she forgot','Yes, online'],0,'Quería asistir, pero el texto no confirma si llegó.'],
['reading','“The new policy has been welcomed by staff, though managers remain cautious.” How do managers feel?',['Fully enthusiastic','Unaware','Somewhat uncertain','Angry at staff'],2,'Remain cautious indica prudencia o reservas.']
].map(([topic,q,a,c,why])=>({topic,q,a,c,why}));
async function show(){
 const box=$('diagnosticResult');box.replaceChildren();
 const r=await db.from('diagnosticos_b2').select('aciertos,total,desglose,creado_en').eq('usuario_id',A.user.id).order('creado_en',{ascending:false}).limit(1);
 if(r.error)throw r.error;A.diagnostic=r.data?.[0]||null;
 if(!A.diagnostic){box.append(A.elt('p','Aún no hay diagnóstico registrado.'));return}
 box.append(A.elt('p','Último diagnóstico: '+A.diagnostic.aciertos+' de '+A.diagnostic.total+' correctas.','aula-score'));
 for(const [topic,record] of Object.entries(A.diagnostic.desglose||{})){
  if(!record.total)continue;
  box.append(A.elt('p',(A.topic[topic]||topic)+' · '+record.aciertos+'/'+record.total+' ('+Math.round(100*record.aciertos/record.total)+' %).'))
 }
 box.append(A.elt('p','Te recomendamos reforzar '+(A.topic[A.focus()]||'Grammar')+'. No es una calificación oficial.','aula-tiny'));
 A.reloadToday();A.reloadPlan()
}
$('startDiagnostic').onclick=()=>{
 if(!A.check())return;
 A.makeQuestions($('diagnosticQuestions'),BANK,'diag');
 $('diagnosticForm').hidden=false;$('diagnosticIntro').hidden=true;$('diagnosticForm').scrollIntoView({block:'start'})
};
$('diagnosticForm').onsubmit=async e=>{
 e.preventDefault();if(!A.check())return;
 const result=A.score(BANK,'diag');
 if(result.missing){A.note('aulaStatus','Contesta la pregunta '+result.missing+' antes de corregir.');return}
 const button=$('diagnosticForm').querySelector('[type=submit]');button.disabled=true;
 try{
  const {error}=await db.from('diagnosticos_b2').insert({
   usuario_id:A.user.id,aciertos:result.aciertos,total:BANK.length,desglose:result.desglose
  });if(error)throw error;
  $('diagnosticForm').hidden=true;$('diagnosticIntro').hidden=false;
  $('startDiagnostic').textContent='Repetir diagnóstico';
  await show();A.feedback(BANK,result.answers,$('diagnosticResult'));
  A.note('aulaStatus','Diagnóstico guardado de forma privada.')
 }catch(error){A.note('aulaStatus','No se pudo guardar: '+error.message)}
 finally{button.disabled=false}
};
window.addEventListener('ee-aula-ready',()=>show().catch(e=>A.note('diagnosticResult','No se pudo cargar el diagnóstico: '+e.message)));
})();
