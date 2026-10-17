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
  const headerItems=[
    {page:'index.html',title:'Inicio',icon:'home'},
    {page:'articulos.html',title:'Artículos',icon:'book'},
    {page:'curso.html',title:'Curso',icon:'graduate'},
    {page:'examenes.html',title:'Exámenes',icon:'exam'},
    {page:'perfil.html',title:'Perfil',icon:'person'},
    {page:'comunidad.html',title:'Comunidad',icon:'people'}
  ];
  const paths={
    home:'<path d="M3 10 12 3l9 7v11h-6v-7H9v7H3z"/>',
    book:'<path d="M4 4h16v17H6a2 2 0 0 1-2-2V4zm0 14a2 2 0 0 1 2-2h14M8 8h8m-8 4h6"/>',
    graduate:'<path d="m3 8 9-5 9 5-9 5-9-5zm4 3v7c3 3 7 3 10 0v-7m4-3v8"/>',
    exam:'<path d="M7 3h10v3H7zM7 4H4v17h16V4h-3M8 8h8m-8 5h5"/>',
    person:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v2"/>',
    people:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v1"/>'
  };
  function renderHeader(){
    if(document.getElementById('ee-shared-header'))return;
    const page=location.pathname.toLowerCase().split('/').pop()||'index.html';
    const active=page==='comunidad.html'?'comunidad.html':activeSection();
    const header=text('header','ee-header ee-shared-header');
    header.id='ee-shared-header';
    const bar=text('div','ee-bar');
    const logo=text('a','ee-logo');logo.href=to('index.html');
    logo.setAttribute('aria-label','Easy English · Inicio');
    const mark=text('b','','ee.');mark.setAttribute('aria-hidden','true');
    logo.append(mark,document.createTextNode('Easy English'));
    const button=text('button','ee-menu-toggle','☰ Menú');
    button.type='button';button.setAttribute('aria-controls','ee-primary-links');
    button.setAttribute('aria-expanded','false');button.setAttribute('aria-label','Abrir menú principal');
    const nav=text('nav','ee-primary-nav');
    nav.id='ee-primary-links';nav.setAttribute('aria-label','Navegación principal');
    for(const item of headerItems){
      const a=text('a','ee-primary-link');a.href=to(item.page);
      const svg=text('svg','');
      svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');
      svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.7');
      svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');
      svg.setAttribute('aria-hidden','true');svg.innerHTML=paths[item.icon];
      a.append(svg,text('span','',item.title));
      if(active===item.page)a.setAttribute('aria-current','page');
      nav.append(a);
    }
    button.addEventListener('click',()=>{
      const open=button.getAttribute('aria-expanded')!=='true';
      button.setAttribute('aria-expanded',String(open));
      button.setAttribute('aria-label',open?'Cerrar menú principal':'Abrir menú principal');
      nav.classList.toggle('is-open',open);
    });
    header.addEventListener('keydown',e=>{
      if(e.key==='Escape'){
        button.setAttribute('aria-expanded','false');nav.classList.remove('is-open');
        button.focus();
      }
    });
    bar.append(logo,nav,button);header.append(bar);
    const old=document.querySelector('body > header.ee-header, body > header.site-header');
    if(old)old.replaceWith(header);
    else document.body.prepend(header);
  }
  function attach(){
    if(document.getElementById('ee-bottom-nav'))return;
    renderHeader();
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
