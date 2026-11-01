(()=>{'use strict';
const A=window.EEAula,db=A.db,$=A.$;
let busy=false;
function render(){
 const next=A.nextUnit();
 const available=[
 {key:'unidad',label:next?'Continuar unidad '+next.orden:'Repasar unidades',url:next?'/curso.html#unidad-'+String(next.orden).padStart(2,'0'):'/curso.html',minutes:15},
 {key:'repaso',label:'Repasar errores',url:'/practicar.html#cuaderno-fallos',minutes:10},
 {key:'vocabulario',label:'Repasar vocabulario',url:'/mi-vocabulario.html',minutes:5},
 {key:'reading',label:'Practicar Reading',url:'/articulos.html',minutes:15},
 {key:'writing',label:'Practicar Writing',url:'/writings.html#editor',minutes:15},
 {key:'listening',label:'Practicar Listening',url:'#practice',minutes:10},
 {key:'speaking',label:'Practicar Speaking',url:'/speaking-lab.html',minutes:10}
 ];
 const priority=A.focus(),budget=A.plan?.minutos_dia||40;
 const preferred=available.find(x=>x.key===priority);
 if(preferred&&priority!=='unidad'){
  const pos=available.indexOf(preferred);available.splice(pos,1);available.splice(1,0,preferred)
 }
 let used=0;
 const selected=available.filter(x=>{if(used+x.minutes>budget)return false;used+=x.minutes;return true});
 $('todayDate').textContent=new Date().toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'});
 const root=$('todayTasks');root.replaceChildren();
 selected.forEach(task=>{
  const row=A.elt('div',undefined,'aula-task'),check=A.elt('input');
  check.type='checkbox';check.checked=A.doneToday.has(task.key);check.onchange=()=>save(task.key,check);
  const info=A.elt('div',undefined,'aula-task-main');info.append(A.elt('strong',task.label),A.elt('small',task.minutes+' minutos'));
  const link=A.elt('a','Abrir →');link.href=task.url;
  if(check.checked)row.classList.add('is-done');
  row.append(check,info,link);root.append(row)
 });
 const completed=selected.filter(x=>A.doneToday.has(x.key)).length;
 const pct=selected.length?Math.round(100*completed/selected.length):0;
 $('todayBar').style.width=pct+'%';$('todayMeter').setAttribute('aria-valuenow',String(pct));
 A.note('todayProgress',completed+' de '+selected.length+' tareas completadas')
}
A.reloadToday=render;
async function save(key,check){
 if(busy||!A.check())return;busy=true;check.disabled=true;
 const owner=A.user.id,day=A.dateLocal(),was=A.doneToday.has(key);
 try{
  const q=db.from('sesiones_estudio_b2');
  const result=was?await q.delete().eq('usuario_id',owner).eq('dia',day).eq('tarea',key):await q.insert({usuario_id:owner,dia:day,tarea:key});
  if(result.error)throw result.error;
  if(was)A.doneToday.delete(key);else A.doneToday.add(key);
  A.note('todayMessage','Tu sesión se ha guardado.')
 }catch(e){A.note('todayMessage','No se pudo guardar: '+e.message)}
 finally{busy=false;render()}
}
window.addEventListener('ee-aula-ready',async()=>{
 try{
  const result=await db.from('sesiones_estudio_b2').select('tarea').eq('usuario_id',A.user.id).eq('dia',A.dateLocal());
  if(result.error)throw result.error;
  A.doneToday=new Set((result.data||[]).map(x=>x.tarea));render()
 }catch(e){A.note('todayMessage','No se pudo cargar: '+e.message)}
});
})();