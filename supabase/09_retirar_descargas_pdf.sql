begin;

update public.paginas_blog
set html = regexp_replace(
  regexp_replace(
    regexp_replace(
      html,
      '<section class="ee-resource">[\s\S]*?</section>',
      '',
      'gi'
    ),
    '<a[^>]*href=["''](?:\.\./)?downloads\.html["''][^>]*>[^<]*</a>',
    '',
    'gi'
  ),
  '<a[^>]*href=["''](?:\.\./)?pdfs/[^"'']+["''][^>]*>[^<]*</a>',
  '',
  'gi'
),
actualizado_en = now()
where ruta = 'index.html';

update public.paginas_blog
set titulo = 'Biblioteca · Easy English',
    descripcion = 'Artículos y lecciones de Easy English.',
    html = '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=articulos.html"><meta name="robots" content="noindex"><title>Biblioteca · Easy English</title><script>location.replace(''articulos.html'');</script></head><body><p>Abriendo la biblioteca de artículos de Easy English…</p><p><a href="articulos.html">Ir a la biblioteca</a></p></body></html>',
    actualizado_en = now()
where ruta = 'downloads.html';

commit;
