(()=>{'use strict';const A=window.EEAula,db=A.db,$=A.$;
function topic(text){
 const s=String(text||'').toLowerCase();
 if(/phrasal|look up|look after|put off|give up/.test(s))return 'Phrasal verbs';
 if(/conditional|unless|\bif\b|\bwish\b/.test(s))return 'Conditionals';
 if(/passive|\bwas\b|\bwere\b|been/.test(s))return 'Tiempos y pasiva';
 if(/should|must|might|could|would/.test(s))return 'Verbos modales';
 if(/relative|whose|which|who/.test(s))return 'Relative clauses';
 return 'Grammar y Use of English';
}
async function load(){
 const [classic,activity]=await Promise.all([
 db.from('preguntas_falladas').select('pregunta_id,veces_fallada,proximo_repaso').eq('usuario_id',A.user.id).eq('dominada',false).order('proximo_repaso').limit(100),
 db.from('actividad_fallos').select('pregunta_id,veces_fallada').eq('usuario_id',A.user.id).eq('dominada',false).limit(100)
 ]);
 if(classic.error||activity.error)throw classic.error||activity.error;
 const all=classic.data||[],activities=activity.data||[];
 const due=all.filter(x=>new Date(x.proximo_repaso).getTime()<=Date.now());
 const box=$('reviewSummary');box.replaceChildren();
 box.append(A.elt('p',all.length+' fallos de examen pendientes · '+due.length+' listos para revisar · '+activities.length+' errores de actividades.'));
 const root=$('reviewTasks');root.replaceChildren();
 if(!all.length&&!activities.length){root.append(A.elt('p','¡Sin errores pendientes! Haz un examen para obtener un nuevo objetivo.'));return}
 if(!due.length){root.append(A.elt('p','No hay repasos vencidos en este momento. Puedes practicar de manera voluntaria.'));return}
 const ids=[...new Set(due.slice(0,30).map(x=>x.pregunta_id))];
 const questionResponse=await db.from('preguntas').select('id,enunciado').in('id',ids);
 const map=new Map((questionResponse.data||[]).map(x=>[String(x.id),x.enunciado]));
 const counts=new Map();
 due.slice(0,30).forEach(e=>{const name=topic(map.get(String(e.pregunta_id)));counts.set(name,(counts.get(name)||0)+1)});
 for(const [name,count] of [...counts].sort((a,b)=>b[1]-a[1]).slice(0,5)){
  const row=A.elt('div',name+' · '+count+' ejercicios por revisar','aula-review');root.append(row)
 }
 root.append(A.elt('p','Las recomendaciones son aproximadas; el cuaderno de fallos original corrige cada respuesta.','aula-tiny'));
}
window.addEventListener('ee-aula-ready',()=>load().catch(e=>A.note('reviewSummary','No se pudieron cargar tus errores: '+e.message)));
})();