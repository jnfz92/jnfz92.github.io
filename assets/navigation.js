/* Navegación global única de Easy English: web, WebView de Android y lector. */
'use strict';
(()=>{
  const source=document.currentScript?.src||location.href;
  const root=new URL('../',source);
  const to=page=>new URL(page,root).href;
  const headerItems=[
    {page:'index.html',title:'Inicio',icon:'<path d="M3 10 12 3l9 7v11h-6v-7H9v7H3z"/>'},
    {page:'articulos.html',title:'Artículos',icon:'<path d="M4 4h16v17H6a2 2 0 0 1-2-2V4zm0 14a2 2 0 0 1 2-2h14M8 8h8m-8 4h6"/>'},
    {page:'curso.html',title:'Curso',icon:'<path d="m3 8 9-5 9 5-9 5-9-5zm4 3v7c3 3 7 3 10 0v-7m4-3v8"/>'},
    {page:'examenes.html',title:'Exámenes',icon:'<path d="M7 3h10v3H7zM7 4H4v17h16V4h-3M8 11h8m-8 5h5"/>'},
    {page:'perfil.html',title:'Perfil',icon:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v2"/>'},
    {page:'comunidad.html',title:'Comunidad',icon:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v1"/>'},
    {page:'sugerencias.html',title:'Sugerencias',icon:'<path d="M9 18h6m-5 4h4m-2-21a7 7 0 0 0-4 12.75c.62.43 1 1.05 1 1.75h6c0-.7.38-1.32 1-1.75A7 7 0 0 0 12 1z"/>'}
  ];
  function ensureHeader(){
    if(document.getElementById('ee-shared-header'))return;
    for(const node of [...document.body.childNodes]){
      if(node.nodeType!==Node.TEXT_NODE)continue;
      node.textContent=node.textContent.replace(/\{%\s*include\s+header\.html\s*%\}/g,'').trim();
      if(!node.textContent||/^---(?:\s+---)*$/.test(node.textContent))node.remove();
    }
    const header=text('header','ee-header');
    header.id='ee-shared-header';
    const bar=text('div','ee-bar');
    const logo=text('a','ee-logo');
    logo.href=to('index.html');logo.setAttribute('aria-label','Easy English · Inicio');
    const mark=document.createElement('img');mark.src=to('favicon.svg?v=20261017-ee');mark.width=39;mark.height=39;mark.alt='';mark.setAttribute('aria-hidden','true');
    logo.append(mark,document.createTextNode('Easy English'));
    const toggle=text('button','ee-nav-toggle');
    toggle.type='button';
    toggle.setAttribute('aria-label','Abrir menú de navegación');
    toggle.setAttribute('aria-expanded','false');
    toggle.setAttribute('aria-controls','ee-primary-navigation');
    toggle.innerHTML='<span></span><span></span><span></span>';
    const nav=text('nav','ee-nav');nav.setAttribute('aria-label','Navegación principal');
    nav.id='ee-primary-navigation';
    const path=location.pathname.toLowerCase().split('/').pop()||'index.html';
    const active=path==='comunidad.html'?'comunidad.html':activeSection();
    for(const item of headerItems){
      const link=text('a');link.href=to(item.page);
      if(active===item.page)link.setAttribute('aria-current','page');
      const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');
      icon.setAttribute('class','ee-nav-icon');icon.setAttribute('width','20');icon.setAttribute('height','20');
      icon.setAttribute('viewBox','0 0 24 24');icon.setAttribute('fill','none');
      icon.setAttribute('stroke','currentColor');icon.setAttribute('stroke-width','1.7');
      icon.setAttribute('stroke-linecap','round');icon.setAttribute('stroke-linejoin','round');
      icon.setAttribute('aria-hidden','true');icon.innerHTML=item.icon;
      link.append(icon,text('span','',item.title));nav.append(link);
    }
    bar.append(logo,toggle,nav);
    header.append(bar);document.body.prepend(header);
  }
  function setupMenu(){
    const header=document.getElementById('ee-shared-header');
    const toggle=header?.querySelector('.ee-nav-toggle');
    const nav=header?.querySelector('.ee-nav');
    if(!header||!toggle||!nav||toggle.dataset.menuReady==='true')return;
    toggle.dataset.menuReady='true';
    const setOpen=open=>{
      header.classList.toggle('ee-menu-open',open);
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
    document.addEventListener('click',event=>{
      if(!header.contains(event.target))setOpen(false);
    });
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&header.classList.contains('ee-menu-open')){
        setOpen(false);
        toggle.focus();
      }
    });
    window.addEventListener('pageshow',()=>setOpen(false));
  }
  function activeSection(){
    const path=location.pathname.toLowerCase().split('/').pop()||'index.html';
    if(['index.html',''].includes(path))return 'index.html';
    if(['articulos.html','leer.html','grammar.html','lessons.html','speaking.html','tv-movies.html','vocabulary.html'].includes(path))return 'articulos.html';
    if(['curso.html','actividades.html','vocabulario.html'].includes(path))return 'curso.html';
    if(['examenes.html','practicar.html'].includes(path))return 'examenes.html';
    if(['perfil.html','comunidad.html','mensajes.html'].includes(path))return 'perfil.html';
    if(path==='sugerencias.html')return 'sugerencias.html';
    return null;
  }
  function text(tag,cls,value){
    const e=document.createElement(tag);
    if(cls)e.className=cls;
    if(value!==undefined)e.textContent=value;
    return e;
  }
  function attach(){
    ensureHeader();
    setupMenu();
    if(document.getElementById('ee-shared-footer'))return;
    // Replace old or incomplete footers and add the description when missing.
    const footer=text('footer','ee-footer');
    footer.id='ee-shared-footer';
    footer.append(text('p','ee-footer-description','Un poco de inglés. Un paso más cada día.'));
    const oldFooter=document.querySelector('footer.ee-footer, footer.site-footer');
    if(oldFooter)oldFooter.replaceWith(footer);
    else document.body.append(footer);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});
  else attach();
})();
