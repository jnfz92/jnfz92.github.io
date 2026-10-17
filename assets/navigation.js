/* Navegación global única de Easy English: web, WebView de Android y lector. */
'use strict';
(()=>{
  const source=document.currentScript?.src||location.href;
  const root=new URL('../',source);
  const to=page=>new URL(page,root).href;
  const items=[
    {page:'index.html',title:'Inicio',icon:'⌂'},
    {page:'articulos.html',title:'Artículos',icon:'▤'},
    {page:'curso.html',title:'Curso',icon:'▧'},
    {page:'examenes.html',title:'Exámenes',icon:'✎'},
    {page:'perfil.html',title:'Perfil',icon:'♙'}
  ];
  const resources=[
    {page:'actividades.html',title:'Actividades'},
    {page:'vocabulario.html',title:'Vocabulario'},
    {page:'downloads.html',title:'Apuntes PDF'},
    {page:'comunidad.html',title:'Comunidad'},
    {page:'mensajes.html',title:'Mensajes'}
  ];
  function activeSection(){
    const path=location.pathname.toLowerCase().split('/').pop()||'index.html';
    if(['index.html',''].includes(path))return 'index.html';
    if(['articulos.html','leer.html','grammar.html','lessons.html','speaking.html','tv-movies.html','vocabulary.html'].includes(path))return 'articulos.html';
    if(['curso.html','actividades.html','vocabulario.html','downloads.html'].includes(path))return 'curso.html';
    if(['examenes.html','practicar.html'].includes(path))return 'examenes.html';
    if(['perfil.html','comunidad.html','mensajes.html'].includes(path))return 'perfil.html';
    return null;
  }
  function text(tag,cls,value){
    const e=document.createElement(tag);
    if(cls)e.className=cls;
    if(value!==undefined)e.textContent=value;
    return e;
  }
  // El único header está en _includes/header.html; JS solo activa el botón móvil.
  function attachHeaderControls(){
    const h=document.getElementById('ee-shared-header');
    const button=h?.querySelector('.ee-menu-toggle');
    const nav=h?.querySelector('.ee-primary-nav');
    if(!button||!nav)return;
    button.addEventListener('click',()=>{
      const opened=button.getAttribute('aria-expanded')!=='true';
      button.setAttribute('aria-expanded',String(opened));
      button.setAttribute('aria-label',opened?'Cerrar menú principal':'Abrir menú principal');
      nav.classList.toggle('is-open',opened);
    });
    h.addEventListener('keydown',e=>{
      if(e.key==='Escape'){
        button.setAttribute('aria-expanded','false');
        button.setAttribute('aria-label','Abrir menú principal');
        nav.classList.remove('is-open');
        button.focus();
      }
    });
    nav.addEventListener('click',e=>{
      if(e.target.closest('a')){
        button.setAttribute('aria-expanded','false');
        nav.classList.remove('is-open');
      }
    });
  }
  function attach(){
    if(document.getElementById('ee-bottom-nav'))return;
    attachHeaderControls();
    const active=activeSection();
    // La misma barra que el curso incluido en la APK, pero mediante enlaces reales.
    const bottom=text('nav','ee-bottom-nav');
    bottom.id='ee-bottom-nav';bottom.setAttribute('aria-label','Menú inferior');
    for(const item of items){
      const link=text('a','ee-bottom-link');
      link.href=to(item.page);
      const symbol=text('span','ee-bottom-icon',item.icon);
      symbol.setAttribute('aria-hidden','true');
      link.append(symbol,document.createTextNode(item.title));
      if(active===item.page){
        link.classList.add('active');link.setAttribute('aria-current','page');
      }
      bottom.append(link);
    }
    // Sustituye los pies incompletos o antiguos y también añade pie a las páginas nuevas.
    const footer=text('footer','ee-footer');
    footer.id='ee-shared-footer';
    const inner=text('div','ee-footer-inner');
    const brand=text('div','ee-footer-brand');
    brand.append(text('strong','','Easy English'),
      text('p','','Un poco de inglés. Un paso más cada día.'),
      text('p','','© 2026 Easy English'));
    const links=text('nav','ee-footer-links');
    links.setAttribute('aria-label','Enlaces del pie');
    for(const item of [...items,...resources]){
      const link=text('a','',item.title);link.href=to(item.page);
      if(active===item.page)link.setAttribute('aria-current','page');
      links.append(link);
    }
    inner.append(brand,links);footer.append(inner);
    const oldFooter=document.querySelector('footer.ee-footer, footer.site-footer');
    if(oldFooter)oldFooter.replaceWith(footer);
    else document.body.append(footer);
    document.body.append(bottom);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});
  else attach();
})();
