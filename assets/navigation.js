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
  function attach(){
    if(document.getElementById('ee-shared-footer'))return;
    const active=activeSection();
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
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});
  else attach();
})();
