/* Mejora compatible con la navegación actual: fondo móvil, cierre y foco. */
(()=>{'use strict';
function activate(){
  const header=document.getElementById('ee-shared-header');
  if(!header||header.dataset.eeOptimized==='true')return;
  const nav=header.querySelector('#ee-primary-navigation');
  const toggle=header.querySelector('.ee-nav-toggle');
  const backdrop=header.querySelector('.ee-nav-backdrop');
  const more=header.querySelector('.ee-more');
  if(!nav||!toggle||!backdrop)return;
  header.dataset.eeOptimized='true';
  // Funciona incluso con la versión antigua del script de navegación en caché.
  function mainAnchor(){
    const main=document.querySelector('main');
    if(!main)return;
    if(!main.id)main.id='contenido-principal';
    if(main.id==='contenido-principal')main.setAttribute('tabindex','-1');
    const skip=document.querySelector('.ee-skip-link');
    if(skip)skip.href='#'+encodeURIComponent(main.id);
  }
  mainAnchor();
  window.addEventListener('easyenglish:article-rendered',mainAnchor);
  const isMobile=()=>window.matchMedia('(max-width: 900px)').matches;
  const sync=()=>{
    const open=isMobile()&&header.classList.contains('ee-menu-open');
    backdrop.hidden=!open;
    document.documentElement.classList.toggle('ee-nav-scroll-locked',open);
    if(!isMobile()&&header.classList.contains('ee-menu-open')){
      close();
    }
  };
  function close(){
    header.classList.remove('ee-menu-open');
    if(more)more.open=false;
    toggle.setAttribute('aria-expanded','false');
    toggle.setAttribute('aria-label','Abrir menú de navegación');
    sync();
  }
  // Abrir Recursos no debe dejar su primera opción oculta bajo la barra sticky.
  // El scroll ocurre dentro del panel móvil, manteniendo el primer enlace pulsable.
  if(more)more.addEventListener('toggle',()=>{
    if(!more.open||!isMobile()||!header.classList.contains('ee-menu-open'))return;
    requestAnimationFrame(()=>{
      if(!more.open||!header.classList.contains('ee-menu-open'))return;
      const menuTop=nav.getBoundingClientRect().top;
      const detailsTop=more.getBoundingClientRect().top;
      const offset=detailsTop-menuTop-12;
      if(Math.abs(offset)>2)nav.scrollTop+=offset;
    });
  });
  backdrop.addEventListener('click',close);
  nav.addEventListener('click',event=>{
    if(event.target.closest('a[href]'))close()
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&header.classList.contains('ee-menu-open')){
      close();toggle.focus();return
    }
    if(event.key!=='Tab'||!isMobile()||!header.classList.contains('ee-menu-open'))return;
    const visible=[toggle,...nav.querySelectorAll('a[href],summary,button:not([disabled])')]
      .filter(el=>el.getClientRects().length);
    if(!visible.length)return;
    const first=visible[0],last=visible[visible.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
  });
  const observer=new MutationObserver(sync);
  observer.observe(header,{attributes:true,attributeFilter:['class']});
  window.addEventListener('resize',sync);
  window.addEventListener('pagehide',()=>document.documentElement.classList.remove('ee-nav-scroll-locked'));
  window.addEventListener('pageshow',sync);
  sync();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',activate,{once:true});
else activate();
})();