/* Plan privado, calendarios y aviso opcional */
(()=>{'use strict';const A=window.EEAula,$=A.$,db=A.db;
async function load(){
 const {data,error}=await db.from('planes_estudio_b2').select('*').eq('usuario_id',A.user.id).maybeSingle();
 if(error)throw error;A.plan=data||null;
 if(A.plan){
 $('planDate').value=A.plan.fecha_examen||'';$('planMinutes').value=String(A.plan.minutos_dia);
 $('planPriority').value=A.plan.prioridad;$('planTime').value=A.plan.hora_recordatorio?.slice(0,5)||'18:00';
 $('planReminder').checked=Boolean(A.plan.recordatorio_activo);
 document.querySelectorAll('[name=planDay]').forEach(x=>x.checked=A.plan.dias_semana.includes(Number(x.value)))
 }render()
}
function render(){
 const box=$('planSummary');box.replaceChildren();
 if(!A.plan){box.append(A.elt('p','Configura tu plan para organizar las sesiones.'));return}
 box.append(A.elt('p',A.plan.minutos_dia+' minutos · '+A.plan.dias_semana.length+' días por semana · prioridad '+(A.topic[A.focus()]||'Grammar')+'.'));
 if(A.plan.fecha_examen){
 const days=Math.max(0,Math.ceil((new Date(A.plan.fecha_examen+'T12:00:00')-new Date())/86400000));
 box.append(A.elt('p','Examen previsto: '+A.plan.fecha_examen+' · faltan unos '+days+' días.'))
 const remainingUnits=Math.max(0,A.units.length-A.progress.filter(x=>x.estado==='completada').length);
 const plannedDays=[];
 const cursor=new Date();
 while(cursor<=new Date(A.plan.fecha_examen+'T12:00:00')&&plannedDays.length<365){
  if(A.plan.dias_semana.includes(cursor.getDay()))plannedDays.push(cursor.toDateString());
  cursor.setDate(cursor.getDate()+1)
 }
 if(A.units.length&&plannedDays.length){
  const pace=(remainingUnits/Math.max(1,plannedDays.length)).toFixed(2);
  box.append(A.elt('p','Quedan '+remainingUnits+' unidades y aproximadamente '+plannedDays.length+' sesiones previstas: necesitarías estudiar '+pace+' unidades por sesión para completar el temario antes de la fecha.'))
 }

 }
 if(!A.plan.dias_semana.includes(new Date().getDay()))box.append(A.elt('p','Hoy es día de descanso según tu plan.','aula-notice'))
}
A.reloadPlan=render;
$('planForm').onsubmit=async e=>{
 e.preventDefault();if(!A.check())return;
 const days=[...document.querySelectorAll('[name=planDay]:checked')].map(x=>Number(x.value));
 if(!days.length){A.note('planStatus','Selecciona al menos un día.');return}
 const next={usuario_id:A.user.id,fecha_examen:$('planDate').value||null,minutos_dia:Number($('planMinutes').value),
 dias_semana:days,prioridad:$('planPriority').value,hora_recordatorio:$('planTime').value||null,
 recordatorio_activo:$('planReminder').checked,actualizado_en:new Date().toISOString()};
 const btn=$('planForm').querySelector('[type=submit]');btn.disabled=true;
 try{const {error}=await db.from('planes_estudio_b2').upsert(next,{onConflict:'usuario_id'});if(error)throw error;
 A.plan=next;render();A.reloadToday();A.note('planStatus','Tu plan se ha guardado en Supabase.')
 }catch(error){A.note('planStatus','No se pudo guardar: '+error.message)}finally{btn.disabled=false}
};
function stamp(date){
 const pad=v=>String(v).padStart(2,'0');
 return date.getFullYear()+pad(date.getMonth()+1)+pad(date.getDate())+'T'+pad(date.getHours())+pad(date.getMinutes())+'00'
}
$('calendarDownload').onclick=()=>{
 const days=[...document.querySelectorAll('[name=planDay]:checked')].map(x=>Number(x.value));
 if(!days.length){A.note('planStatus','Selecciona algún día de estudio.');return}
 const [hour,minute]=($('planTime').value||'18:00').split(':').map(Number),start=new Date();
 start.setHours(hour,minute,0,0);
 for(let i=0;i<8;i++){
  if(days.includes(start.getDay())&&start.getTime()>Date.now())break;
  start.setDate(start.getDate()+1)
 }

 const names=days.map(x=>['SU','MO','TU','WE','TH','FR','SA'][x]).join(',');
 const now=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Easy English//Plan B2//ES','BEGIN:VEVENT',
 'UID:ee-b2-'+Date.now()+'@jnfz92.github.io','DTSTAMP:'+now,'DTSTART:'+stamp(start),
 'DURATION:PT'+Number($('planMinutes').value)+'M','RRULE:FREQ=WEEKLY;BYDAY='+names+';COUNT=52',
 'SUMMARY:Easy English - Sesion de estudio B2','DESCRIPTION:Abre https://jnfz92.github.io/aula-b2.html',
 'BEGIN:VALARM','TRIGGER:-PT10M','ACTION:DISPLAY','DESCRIPTION:Tu sesion B2 comienza pronto',
 'END:VALARM','END:VEVENT','END:VCALENDAR'];
 const blob=new Blob([lines.join(String.fromCharCode(13,10))],{type:'text/calendar;charset=utf-8'});
 const url=URL.createObjectURL(blob),a=A.elt('a');a.href=url;a.download='easyenglish-plan-b2.ics';
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
 A.note('planStatus','Calendario descargado; impórtalo para recibir avisos cuando no tengas abierta esta web.')
};
$('testNotification').onclick=async()=>{
 if(!('Notification'in window)){A.note('planStatus','Tu navegador no permite notificaciones. Puedes usar el calendario.');return}
 try{
 const permission=await Notification.requestPermission();
 if(permission!=='granted'){A.note('planStatus','No se concedió el permiso.');return}
 new Notification('Easy English',{body:'Aviso de prueba: los recordatorios de esta web requieren dejar el aula abierta.'});
 A.note('planStatus','Aviso enviado. Para alertas sin la web abierta usa el calendario.')
 }catch(e){A.note('planStatus',e.message)}
};
function reminder(){
 if(!A.plan?.recordatorio_activo||!A.plan.hora_recordatorio||!A.plan.dias_semana.includes(new Date().getDay())||!('Notification'in window)||Notification.permission!=='granted')return;
 const d=new Date(),time=String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
 if(time!==A.plan.hora_recordatorio.slice(0,5))return;
 const key='ee-b2-reminder-'+A.dateLocal();
 try{if(localStorage.getItem(key))return;localStorage.setItem(key,'1');
 new Notification('Tu sesión de Easy English B2',{body:'¡Es momento de repasar!'})}catch(_){}
}
window.addEventListener('ee-aula-ready',()=>{load().catch(e=>A.note('planStatus','No se pudo cargar el plan: '+e.message));reminder()});
setInterval(reminder,30000);
})();