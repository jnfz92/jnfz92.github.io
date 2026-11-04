/* Parallax real: fondos completos se desplazan a diferente velocidad que el contenido. */
(()=>{'use strict';
const sections=[...document.querySelectorAll('[data-ee-parallax]')];
if(!sections.length)return;
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
let pending=false;
const clamp=(n,low,high)=>Math.max(low,Math.min(high,n));
function render(){
 pending=false;
 if(reduced.matches){for(const el of sections)el.style.removeProperty('--ee-depth-shift');return;}
 const height=window.innerHeight||800;
 for(const el of sections){
  const rect=el.getBoundingClientRect();
  if(rect.bottom< -200||rect.top>height+200)continue;
  // Desplazamiento del FONDO (hasta +/-105px), no del contenido.
  const travel=clamp((height/2-(rect.top+rect.height/2))*0.24,-105,105);
  el.style.setProperty('--ee-depth-shift',Math.round(travel)+'px');
 }
}
function update(){if(!pending){pending=true;requestAnimationFrame(render);}}
window.addEventListener('scroll',update,{passive:true});
window.addEventListener('resize',update,{passive:true});
reduced.addEventListener?.('change',update);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)update();});
update();
})();
