begin;

update public.paginas_blog
set html = regexp_replace(
      html,
      '<header class="ee-header"',
      '<header class="ee-header" id="ee-shared-header"',
      'i'
    ),
    actualizado_en = now()
where ruta in (
  'articulos.html',
  'comunidad.html',
  'downloads.html',
  'examenes.html',
  'index.html',
  'mensajes.html',
  'perfil.html',
  'practicar.html'
)
and html like '%<header class="ee-header"%'
and html not like '%id="ee-shared-header"%';

update public.paginas_blog
set html = regexp_replace(
      html,
      '(<a class="ee-logo"[^>]*>[\s\S]*?</a>)',
      E'\\1<button class="ee-nav-toggle" type="button" aria-label="Abrir menú de navegación" aria-expanded="false" aria-controls="ee-primary-navigation"><span></span><span></span><span></span></button>',
      'i'
    ),
    actualizado_en = now()
where ruta in (
  'articulos.html',
  'comunidad.html',
  'downloads.html',
  'examenes.html',
  'index.html',
  'mensajes.html',
  'perfil.html',
  'practicar.html'
)
and html like '%<a class="ee-logo"%'
and html not like '%ee-nav-toggle%';

update public.paginas_blog
set html = regexp_replace(
      html,
      '<nav class="ee-nav"',
      '<nav class="ee-nav" id="ee-primary-navigation"',
      'i'
    ),
    actualizado_en = now()
where ruta in (
  'articulos.html',
  'comunidad.html',
  'downloads.html',
  'examenes.html',
  'index.html',
  'mensajes.html',
  'perfil.html',
  'practicar.html'
)
and html like '%<nav class="ee-nav"%'
and html not like '%id="ee-primary-navigation"%';

update public.paginas_blog
set html = regexp_replace(
      html,
      '</head>',
      '<link rel="stylesheet" href="https://jnfz92.github.io/assets/navigation.css?v=20261017-bootstrap-menu1"><script src="https://jnfz92.github.io/assets/navigation.js?v=20261017-bootstrap-menu1" defer></script></head>',
      'i'
    ),
    actualizado_en = now()
where ruta in (
  'articulos.html',
  'comunidad.html',
  'downloads.html',
  'examenes.html',
  'index.html',
  'mensajes.html',
  'perfil.html',
  'practicar.html'
)
and html like '%</head>%'
and (
  html not like '%navigation.css?v=20261017-bootstrap-menu1%'
  or html not like '%navigation.js?v=20261017-bootstrap-menu1%'
);

commit;
