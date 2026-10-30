/* Menú único Easy English: sus enlaces se definen solo en _includes/header.html.
   Este archivo gestiona el menú móvil y reutiliza la cabecera publicada si falta. */
'use strict';
(()=>{
  const source=document.currentScript?.src||location.href;
  const root=new URL('../',source);
  const homeURL=new URL('index.html',root);

  async function ensureHeader(){
    if(document.getElementById('ee-shared-header'))return;
    // Compatibilidad con vistas previas que sirvan el HTML sin procesar Liquid.
    for(const node of [...document.body.childNodes]){
      if(node.nodeType!==Node.TEXT_NODE)continue;
      node.textContent=node.textContent.replace(/\{%\s*include\s+header\.html\s*%\}/g,'').trim();
      if(!node.textContent||/^---(?:\s+---)*$/.test(node.textContent))node.remove();
    }
    // Nunca construir una segunda lista de enlaces distinta de la de Jekyll.
    try{
      const response=await fetch(homeURL.href,{credentials:'same-origin'});
      if(!response.ok)throw new Error('No se puede recuperar la cabecera');
      const page=new DOMParser().parseFromString(await response.text(),'text/html');
      const shared=page.getElementById('ee-shared-header');
      if(!shared)throw new Error('No se encontró la cabecera compartida');
      const header=document.importNode(shared,true);
      header.classList.remove('ee-menu-open');
      const toggle=header.querySelector('.ee-nav-toggle');
      if(toggle){
        toggle.removeAttribute('data-menu-ready');
        toggle.setAttribute('aria-expanded','false');
      }
      // El estado activo se determina por la página, no por la portada recuperada.
      const current=location.pathname.split('/').pop()||'index.html';
      const paths={
        'leer.html':'articulos.html','grammar.html':'articulos.html',
        'lessons.html':'articulos.html','tv-movies.html':'articulos.html',
        'vocabulary.html':'articulos.html','actividades.html':'curso.html',
        'vocabulario.html':'curso.html','practicar.html':'examenes.html',
        'categorias-repaso.html':'examenes.html','mensajes.html':'perfil.html',
        'mi-vocabulario.html':'perfil.html'
      };
      const section=paths[current]||current;
      for(const link of header.querySelectorAll('.ee-nav a')){
        link.removeAttribute('aria-current');
        if(new URL(link.href,homeURL).pathname.endsWith('/'+section)){
          link.setAttribute('aria-current','page');
        }
      }
      document.body.prepend(header);
    }catch(error){
      console.warn('No se pudo recuperar la navegación compartida',error);
    }
  }

  function setupMenu(){
    const header=document.getElementById('ee-shared-header');
    const toggle=header?.querySelector('.ee-nav-toggle');
    const nav=header?.querySelector('#ee-primary-navigation');
    if(!header||!toggle||!nav||toggle.dataset.menuReady==='true')return;
    toggle.dataset.menuReady='true';
    toggle.removeAttribute('onclick');
    toggle.setAttribute('aria-controls',nav.id);
    const setOpen=open=>{
      header.classList.toggle('ee-menu-open',open);
      if(!open)header.querySelectorAll('.ee-more[open]').forEach(item=>item.open=false);
      toggle.setAttribute('aria-expanded',String(open));
      toggle.setAttribute('aria-label',open?'Cerrar menú de navegación':'Abrir menú de navegación');
    };
    setOpen(false);
    toggle.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();
      setOpen(!header.classList.contains('ee-menu-open'));
    });
    nav.addEventListener('click',event=>{
      if(event.target.closest('a'))setOpen(false);
    });
    const more=header.querySelector('.ee-more');
    document.addEventListener('click',event=>{
      if(more?.open&&!more.contains(event.target))more.open=false;
    });
    document.addEventListener('click',event=>{
      if(!header.contains(event.target))setOpen(false);
    });
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&header.classList.contains('ee-menu-open')){
        setOpen(false);
        toggle.focus();
      }
    });
    window.addEventListener('resize',()=>{
      if(window.innerWidth>900)setOpen(false);
    });
    window.addEventListener('pageshow',()=>setOpen(false));
  }


  function setupReadingTools(){
    if(!document.body.classList.contains('ee-unified-article'))return;
    const main=document.querySelector('body.ee-unified-article > main');
    if(!main||main.dataset.eeReadingReady==='true')return;
    main.dataset.eeReadingReady='true';
    const sections=[...main.querySelectorAll('h2')].filter(h=>
      !h.closest('#comentarios,nav,.ee-reading-toc,footer')&&h.textContent.trim().length>2
    );
    if(sections.length<5)return;
    const existing=new Set([...document.querySelectorAll('[id]')].map(n=>n.id));
    const slugify=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60);
    const toc=document.createElement('details');
    toc.className='ee-reading-toc';
    toc.id='ee-reading-index';
    const summary=document.createElement('summary');
    summary.textContent='Índice de contenidos · '+sections.length+' apartados';
    const list=document.createElement('ol');
    sections.forEach((h,i)=>{
      if(!h.id){
        const base='apartado-'+(slugify(h.textContent)||String(i+1));
        let id=base,n=2;
        while(existing.has(id)){id=base+'-'+n;n++}
        h.id=id;existing.add(id);
      }
      const li=document.createElement('li');
      const a=document.createElement('a');
      a.href='#'+encodeURIComponent(h.id);a.textContent=h.textContent.trim();
      li.append(a);list.append(li);
    });
    toc.append(summary,list);
    const first=main.querySelector('h2');
    const container=first?.closest('section,article')||first;
    // Place the index before the first substantial section, without splitting a heading from its section.
    if(container&&container!==main&&container.parentElement)container.before(toc);
    else main.prepend(toc);
    const bar=document.createElement('div');
    bar.className='ee-reading-progress';bar.setAttribute('aria-hidden','true');
    bar.innerHTML='<div class="ee-reading-progress-fill"></div>';
    document.body.append(bar);
    const back=document.createElement('a');
    back.className='ee-reading-top';back.href='#ee-reading-index';back.textContent='↑ Volver al índice';
    main.append(back);
    const fill=bar.firstElementChild;
    let scheduled=false;
    const update=()=>{
      const range=Math.max(1,document.documentElement.scrollHeight-window.innerHeight);
      const ratio=Math.max(0,Math.min(1,window.scrollY/range));
      fill.style.transform='scaleX('+ratio+')';
      back.classList.toggle('ee-reading-top-visible',window.scrollY>500);
      scheduled=false;
    };
    const schedule=()=>{if(!scheduled){scheduled=true;requestAnimationFrame(update)}};
    window.addEventListener('scroll',schedule,{passive:true});
    window.addEventListener('resize',schedule,{passive:true});
    update();
  }

  function ensureFooter(){
    if(document.getElementById('ee-shared-footer'))return;
    const footer=document.createElement('footer');
    footer.id='ee-shared-footer';
    footer.className='ee-footer';
    const description=document.createElement('p');
    description.className='ee-footer-description';
    description.textContent='Un poco de inglés. Un paso más cada día.';
    footer.append(description);
    const previous=document.querySelector('footer.ee-footer, footer.site-footer');
    if(previous)previous.replaceWith(footer);
    else document.body.append(footer);
  }

  async function attach(){
    await ensureHeader();
    setupMenu();
    ensureFooter();
    setupReadingTools();
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',attach,{once:true});
  }else{
    attach();
  }
})();
