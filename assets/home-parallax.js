/* Desplazamiento suave, con límite de movimiento y respeto a accesibilidad. */
(()=>{'use strict';
const sections=[...document.querySelectorAll('[data-ee-parallax]')];
if(!sections.length||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
let ticking=false;
const limit=(v,low,high)=>Math.min(high,Math.max(low,v));
function paint(){
 ticking=false;
 const view=window.innerHeight||800;
 for(const el of sections){
  const r=el.getBoundingClientRect();
  if(r.bottom< -120||r.top>view+120)continue;
  const progress=limit((view/2-(r.top+r.height/2))/(view+r.height)*2,-1,1);
  el.style.setProperty('--ee-parallax-back',Math.round(progress*-34)+'px');
  el.style.setProperty('--ee-parallax-middle',Math.round(progress*23)+'px');
  el.style.setProperty('--ee-parallax-front',Math.round(progress*37)+'px');
  el.style.setProperty('--ee-parallax-card',Math.round(progress*-12)+'px');
 }
}
const schedule=()=>{if(!ticking){ticking=true;requestAnimationFrame(paint)}};
window.addEventListener('scroll',schedule,{passive:true});
window.addEventListener('resize',schedule,{passive:true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});
schedule();
})();
