/* Núcleo privado del aula B2 · Easy English */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const db=window.eeDb;
const A=window.EEAula={db,$,user:null,plan:null,diagnostic:null,units:[],progress:[],doneToday:new Set(),reviewCount:0,ready:false};
A.dateLocal=()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)};
A.elt=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=String(text);if(cls)e.className=cls;return e};
A.note=(id,text)=>{$(id).textContent=text};
A.topic={grammar:'Grammar',vocabulary:'Vocabulary',reading:'Reading',writing:'Writing',listening:'Listening',speaking:'Speaking'};
A.focus=()=>{
 if(A.plan?.prioridad&&A.plan.prioridad!=='auto')return A.plan.prioridad;
 const rows=Object.entries(A.diagnostic?.desglose||{}).filter(([,v])=>v?.total);
 return rows.length?rows.sort((a,b)=>(a[1].aciertos/a[1].total)-(b[1].aciertos/b[1].total))[0][0]:'grammar'
};
A.nextUnit=()=>{
 const started=new Set(A.progress.filter(x=>x.estado==='en_curso').map(x=>x.unidad_slug));
 const done=new Set(A.progress.filter(x=>x.estado==='completada').map(x=>x.unidad_slug));
 return A.units.find(u=>started.has(u.slug))||A.units.find(u=>!done.has(u.slug))
};
A.makeQuestions=(target,bank,prefix)=>{
 target.replaceChildren();
 bank.forEach((q,i)=>{const block=A.elt('fieldset',undefined,'aula-question'),heading=A.elt('legend',(i+1)+'. '+q.q);heading.style.fontWeight='750';block.append(heading);
 q.a.forEach((choice,j)=>{const label=A.elt('label'),input=A.elt('input');input.type='radio';input.name=prefix+i;input.value=String(j);label.append(input,document.createTextNode(choice));block.append(label)});
 target.append(block)})
};
A.score=(bank,prefix,allowBlank=false)=>{
 const answers={},desglose={};let aciertos=0;
 for(let i=0;i<bank.length;i++){
  const radio=document.querySelector('input[name="'+prefix+i+'"]:checked');
  if(!radio&&!allowBlank)return {missing:i+1};
  const value=radio?Number(radio.value):null;answers[i]=value;
  const q=bank[i],stat=desglose[q.topic]||{aciertos:0,total:0};stat.total++;
  if(value===q.c){aciertos++;stat.aciertos++}
  desglose[q.topic]=stat
 }
 return {answers,desglose,aciertos}
};
A.feedback=(bank,answers,where)=>{
 const details=A.elt('details');details.append(A.elt('summary','Ver soluciones y explicaciones'));
 bank.forEach((q,i)=>details.append(A.elt('p',(i+1)+'. '+(answers[i]===q.c?'✓ Correcta':'✗ Incorrecta')+' · '+q.why,'aula-review '+(answers[i]===q.c?'aula-correct':'aula-error'))));
 where.append(details)
};
A.check=()=>{if(A.user)return true;A.note('aulaStatus','Inicia sesión desde Mi perfil para guardar tus avances.');return false};
A.reloadToday=()=>{};A.reloadPlan=()=>{};
async function initialize(){
 if(!db){A.note('aulaStatus','No se ha podido iniciar Supabase.');return}
 const {data,error}=await db.auth.getUser();
 if(error&&error.name!=='AuthSessionMissingError')throw error;
 A.user=data?.user||null;
 if(!A.user){
  const box=$('aulaStatus');box.textContent='Para guardar el plan y las pruebas, inicia sesión. ';
  const link=A.elt('a','Ir a Mi perfil →');link.href='/perfil.html';box.append(link);
  document.querySelectorAll('.aula-card button').forEach(btn=>btn.disabled=true);
  return
 }
 $('adminLink').hidden=A.user.app_metadata?.ee_role!=='admin';
 A.ready=true;A.note('aulaStatus','Tu aula está conectada. Todo el progreso de esta página pertenece exclusivamente a tu cuenta.');
 await Promise.all([
  db.from('unidades_curso').select('slug,orden,titulo,nivel').eq('publicado',true).order('orden').then(r=>{if(r.error)throw r.error;A.units=r.data||[]}),
  db.from('progreso_curso').select('unidad_slug,estado').eq('usuario_id',A.user.id).then(r=>{if(r.error)throw r.error;A.progress=r.data||[]})
 ].map(p=>p.catch(e=>A.note('todayMessage','No se pudo cargar el curso: '+e.message))));
 A.reloadToday();A.reloadPlan();
 window.dispatchEvent(new Event('ee-aula-ready'))
}
initialize().catch(e=>A.note('aulaStatus','Error de sesión: '+e.message))
})();
