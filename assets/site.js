/* Progressive enhancement; content and navigation work without JavaScript. */
(()=>{'use strict';
 const root=document.documentElement;
 if(document.body.classList.contains('ee-lesson')){
  const track=document.createElement('div');track.className='ee-reading';track.setAttribute('aria-hidden','true');const fill=document.createElement('span');track.append(fill);document.body.prepend(track);
  let queued=false;function update(){const range=root.scrollHeight-root.clientHeight;fill.style.width=(range>0?Math.min(100,100*window.scrollY/range):0)+'%';queued=false;}
  window.addEventListener('scroll',()=>{if(!queued){queued=true;requestAnimationFrame(update)}},{passive:true});window.addEventListener('resize',update);update();
 }
 const up=document.createElement('button');up.className='ee-top';up.type='button';up.setAttribute('aria-label','Volver arriba');up.textContent='↑';up.hidden=true;
 up.addEventListener('click',()=>window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}));document.body.append(up);
 window.addEventListener('scroll',()=>{up.hidden=window.scrollY<650},{passive:true});
})();
