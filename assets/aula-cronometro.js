/* Cronómetro guiado B2 First: entrenamiento, no examen oficial */
(()=>{'use strict';const A=window.EEAula,$=A.$;
const durations={reading:75,writing:80,listening:40,speaking:14};
let state={phase:'reading',remaining:75*60000,deadline:null,running:false};
let key='';
function persist(){if(!key)return;try{localStorage.setItem(key,JSON.stringify(state))}catch(_){}}
function millis(){
 return state.running?Math.max(0,state.deadline-Date.now()):Math.max(0,state.remaining)
}
function render(){
 let left=millis();
 if(state.running&&left===0){
  state.running=false;state.remaining=0;state.deadline=null;persist();
  A.note('guidedStatus','Fin del tiempo. Revisa tu trabajo antes de continuar.');
 }
 const seconds=Math.ceil(left/1000);
 $('guidedTimer').textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
 $('guidedStart').textContent=state.running?'Pausar':'Iniciar / reanudar';
 $('guidedPhase').value=state.phase
}
$('guidedPhase').onchange=()=>{
 if(state.running&& !confirm('¿Cambiar de parte y reiniciar el tiempo?')){$('guidedPhase').value=state.phase;return}
 state.phase=$('guidedPhase').value;state.remaining=durations[state.phase]*60000;
 state.running=false;state.deadline=null;persist();render();A.note('guidedStatus','Cronómetro preparado para '+state.phase+'.')
};
$('guidedStart').onclick=()=>{
 if(!A.check())return;
 if(state.running){
  state.remaining=millis();state.running=false;state.deadline=null;A.note('guidedStatus','Cronómetro pausado.')
 }else{
  if(millis()===0)state.remaining=durations[state.phase]*60000;
  state.deadline=Date.now()+state.remaining;state.running=true;A.note('guidedStatus','Tiempo en marcha. Puedes navegar y regresar; se conserva la cuenta atrás.')
 }
 persist();render()
};
$('guidedReset').onclick=()=>{
 state.remaining=durations[state.phase]*60000;state.deadline=null;state.running=false;persist();render();
 A.note('guidedStatus','Cronómetro reiniciado.')
};
window.addEventListener('ee-aula-ready',()=>{
 key='ee-guided-b2-'+A.user.id;
 try{
 const saved=JSON.parse(localStorage.getItem(key)||'null');
 if(saved&&durations[saved.phase]&&typeof saved.remaining==='number'&&typeof saved.running==='boolean'){
  state={phase:saved.phase,remaining:Math.min(durations[saved.phase]*60000,Math.max(0,saved.remaining)),
  deadline:Number(saved.deadline)||null,running:saved.running};
  if(state.running&&!state.deadline){state.running=false}
 }
 }catch(_){}
 render()
});
setInterval(render,1000);
})();