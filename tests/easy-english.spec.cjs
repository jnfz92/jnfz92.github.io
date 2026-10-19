const { test, expect } = require('@playwright/test');
const items = [
  {slug:'como-escribir-email-b2-first-fce',titulo:'Cómo escribir un email en B2 First',descripcion:'Writing B2',categoria_slug:'speaking',fecha_publicacion:'2026-10-14'},
  {slug:'present-perfect-vs-past-simple',titulo:'Present Perfect vs Past Simple',descripcion:'Grammar B1',categoria_slug:'grammar',fecha_publicacion:'2026-10-13'},
  {slug:'polite-disagreement',titulo:'Polite Disagreement',descripcion:'Speaking B1',categoria_slug:'speaking',fecha_publicacion:'2026-10-12'}
];
const article = '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Prueba B2</title></head><body class="ee-site ee-lesson"><main><h1>Cómo escribir un email en B2 First</h1><p>Contenido de prueba automatizado.</p></main></body></html>';
async function stub(page, failure=false) {
  await page.route(/\/rest\/v1\/articulos\?/, async route => {
    if (failure) return route.abort('failed');
    const u = new URL(route.request().url()), slug=u.searchParams.get('slug')?.replace(/^eq\./,'');
    const fields=(u.searchParams.get('select')||'').split(',');
    const out=(slug?items.filter(x=>x.slug===slug):items).map(x =>
      Object.fromEntries(Object.entries({...x,html:article}).filter(([k])=>fields.includes(k))));
    await route.fulfill({status:200,json:out,headers:{'access-control-allow-origin':'*'}});
  });
  await page.route(/\/rest\/v1\/categorias_blog\?/,route=>route.fulfill({status:200,
    json:[{slug:'speaking',nombre:'Speaking',orden:1},{slug:'grammar',nombre:'Grammar',orden:2}],
    headers:{'access-control-allow-origin':'*'}}));
}
const mobile = p=>p.viewportSize().width<=900;
test('inicio y navegación real',async ({page})=>{
  await page.goto('/index.html');
  await expect(page.locator('#ee-shared-header')).toHaveCount(1);
  const nav=page.locator('#ee-primary-navigation');
  if(mobile(page)){
    await expect(nav).toBeHidden();
    await page.locator('.ee-nav-toggle').click();
    await expect(nav).toBeVisible();
    await expect(page.locator('.ee-nav-toggle')).toHaveAttribute('aria-expanded','true');
  }else await expect(nav).toBeVisible();
  await nav.getByRole('link',{name:/Artículos/i}).click();
  await expect(page).toHaveURL(/\/articulos\.html$/);
});
test('Escape cierra menú móvil',async ({page})=>{
  test.skip(!mobile(page),'Sólo móvil');
  await page.goto('/articulos.html');
  await page.locator('.ee-nav-toggle').click();
  await expect(page.locator('#ee-primary-navigation')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#ee-primary-navigation')).toBeHidden();
});
test('rutas HTML publicadas',async ({request})=>{
  for(const p of ['index.html','articulos.html','leer.html','curso.html','examenes.html','practicar.html','perfil.html','actividades.html','comunidad.html','mensajes.html','sugerencias.html']){
    const r=await request.get('/'+p);
    expect(r.status(),p+' => '+r.status()).toBe(200);
  }
});
test('sugerencias permite enviar y cambiar un voto sin escribir en producción',async ({page})=>{
  let vote=null;
  const calls=[];
  await page.route(/\/rest\/v1\/rpc\//,async route=>{
    const name=new URL(route.request().url()).pathname.split('/').pop();
    const body=route.request().postDataJSON();
    calls.push({name,body});
    if(name==='listar_sugerencias'){
      return route.fulfill({status:200,json:[{
        id:7,titulo:'Mejorar biblioteca',descripcion:'Añadir filtros por nivel.',
        me_gusta:4+(vote===1?1:0),no_me_gusta:1+(vote===-1?1:0),mi_voto:vote
      }]});
    }
    if(name==='votar_sugerencia'){
      vote=body.p_voto;
      return route.fulfill({status:200,json:[]});
    }
    if(name==='enviar_sugerencia')return route.fulfill({status:200,json:8});
    throw new Error('RPC inesperado: '+name);
  });
  await page.goto('/sugerencias.html');
  await expect(page.getByRole('heading',{name:'Mejorar biblioteca'})).toBeVisible();
  const dislike=page.locator('.suggestion-votes button').nth(1);
  await dislike.click();
  await expect(page.locator('.suggestion-votes button[aria-pressed="true"]')).toContainText('No me gusta · 2');
  await page.locator('#suggestionTitle').fill('Añadir audios');
  await page.locator('#suggestionDescription').fill('Incluir audio para practicar la pronunciación.');
  await page.locator('#suggestionForm button[type="submit"]').click();
  await expect(page.locator('#suggestionFormStatus')).toContainText('pendiente de revisión');
  expect(calls.map(call=>call.name)).toEqual([
    'listar_sugerencias','votar_sugerencia','listar_sugerencias','enviar_sugerencia'
  ]);
  expect(calls[1].body).toMatchObject({p_sugerencia_id:7,p_voto:-1});
  expect(calls[3].body).toMatchObject({
    p_titulo:'Añadir audios',
    p_descripcion:'Incluir audio para practicar la pronunciación.'
  });
});
test('catálogo Supabase simulado, filtros y búsqueda',async ({page})=>{
  await stub(page);
  await page.goto('/articulos.html');
  await expect(page.locator('.blog .grid .card')).toHaveCount(3);
  await page.locator('#articleSearch').fill('perfect');
  await expect(page.locator('.blog .grid .card:visible')).toHaveCount(1);
  await page.locator('#articleSearch').fill('');
  await page.locator('.filter[data-filter="speaking"]').click();
  await expect(page.locator('.blog .grid .card:visible')).toHaveCount(2);
});
test('abrir artículo conserva la navegación',async ({page})=>{
  await stub(page);
  await page.goto('/articulos.html');
  await page.locator('a[href*="como-escribir-email-b2-first-fce"]').first().click();
  await expect(page).toHaveURL(/\/leer\.html\?slug=como-escribir-email-b2-first-fce$/);
  await expect(page.getByRole('heading',{name:'Cómo escribir un email en B2 First'})).toBeVisible();
  await expect(page.locator('#ee-shared-header')).toHaveCount(1);
  if(mobile(page)){
    await page.locator('.ee-nav-toggle').click();
    await expect(page.locator('#ee-primary-navigation')).toBeVisible();
  }
});
test('catálogo conserva contenido de respaldo ante fallo API',async ({page})=>{
  await stub(page,true);
  await page.goto('/articulos.html');
  await expect(page.locator('.blog .grid .card').first()).toBeVisible();
  await expect(page.getByRole('alert').filter({hasText:'No se pudo actualizar'})).toBeVisible();
});
test('slug inválido muestra un error legible',async ({page})=>{
  await page.goto('/leer.html?slug=INVALID!');
  await expect(page.locator('#loading')).toContainText('no corresponde a un artículo válido');
});


test('la biblioteca busca sin tildes y permite limpiar la búsqueda',async ({page})=>{
  await stub(page);
  await page.goto('/articulos.html');
  await expect(page.locator('.blog .grid .card')).toHaveCount(3);
  const search=page.locator('#articleSearch');
  await search.fill('como escribir');
  await expect(page.locator('.blog .grid .card:visible')).toHaveCount(1);
  await expect(page.locator('#clearSearch')).toBeVisible();
  await page.locator('#clearSearch').click();
  await expect(search).toHaveValue('');
  await expect(page.locator('.blog .grid .card:visible')).toHaveCount(3);
});
