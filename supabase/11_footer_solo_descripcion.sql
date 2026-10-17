begin;

update public.paginas_blog
set html = regexp_replace(
      html,
      '<footer\b[^>]*>[\s\S]*?</footer>',
      '<footer class="ee-footer"><p>Un poco de inglés. Un paso más cada día.</p></footer>',
      'gi'
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
and html like '%<footer%';

commit;
