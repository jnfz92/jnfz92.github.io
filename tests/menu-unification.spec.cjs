'use strict';
const {test,expect}=require('@playwright/test');

// Una sola fuente: _includes/header.html. Pruebas para el menú real, no para la estructura retirada.
const topPaths=['/index.html','/curso.html','/aula-b2.html','/examenes.html','/perfil.html'];
const resourcePaths=['/articulos.html','/vocabulario.html','/curso.html','/repasar-leidos.html',
  '/actividades.html','/writings.html','/speaking-lab.html','/comunidad.html',
  '/sugerencias.html','/mi-vocabulario.html'];

async function checkMenu(page){
  const header=page.locator('body > #ee-shared-header');
  await expect(header).toHaveCount(1);
  const top=header.locator('#ee-primary-navigation > a');
  expect(await top.evaluateAll(items=>items.map(a=>new URL(a.href).pathname))).toEqual(topPaths);
  const resources=header.locator('details.ee-more');
  await expect(resources).toHaveCount(1);
  await expect(resources.locator('summary')).toContainText('Recursos');
  await expect(resources.locator('.ee-menu-group')).toHaveCount(3);
  const paths=await resources.locator('.ee-menu-group a').evaluateAll(items=>
    items.map(a=>new URL(a.href).pathname));
  for(const path of resourcePaths)expect(paths).toContain(path);
  await expect(header.locator('.ee-nav-toggle')).toHaveCount(1);
  await expect(header.locator('.ee-nav-backdrop')).toHaveCount(1);
}

test('El menú es único y tiene los mismos enlaces en todas las secciones',async({page})=>{
  for(const route of ['/index.html','/articulos.html','/curso.html','/examenes.html',
    '/aula-b2.html','/perfil.html','/mi-vocabulario.html','/writings.html',
    '/speaking-lab.html','/comunidad.html','/sugerencias.html']){
    await page.goto(route,{waitUntil:'domcontentloaded'});
    await checkMenu(page);
  }
});

test('Marcar sección actual de perfil, repaso y categorías',async({page})=>{
  await page.goto('/mi-vocabulario.html');
  await expect(page.locator('#ee-primary-navigation > a[aria-current="page"]')).toHaveAttribute('href','/perfil.html');
  await page.goto('/repasar-leidos.html');
  await expect(page.locator('.ee-more-panel a[aria-current="page"]')).toHaveAttribute('href','/repasar-leidos.html');
  await page.goto('/category/grammar.html');
  await expect(page.locator('.ee-more-panel a[aria-current="page"]')).toHaveAttribute('href','/articulos.html');
  await page.goto('/aula-b2.html');
  await expect(page.locator('#ee-primary-navigation > a[aria-current="page"]')).toHaveAttribute('href','/aula-b2.html');
});

test('Artículo dinámico conserva la misma cabecera y los recursos del menú',async({page})=>{
  await page.goto('/leer.html?slug=present-perfect-vs-past-simple');
  await expect(page.locator('body.ee-unified-article')).toBeVisible({timeout:30000});
  await checkMenu(page);
  await expect(page.locator('#ee-shared-header')).toHaveCount(1);
  await expect(page.locator('#ee-primary-navigation .ee-more-panel a[aria-current="page"]')).toHaveAttribute('href','/articulos.html');
});

test('El menú móvil se abre, se cierra con Escape y con el fondo',async({page,isMobile})=>{
  test.skip(!isMobile,'Sólo para dispositivos móviles');
  await page.goto('/curso.html');
  const toggle=page.locator('#ee-shared-header .ee-nav-toggle');
  const nav=page.locator('#ee-primary-navigation');
  const backdrop=page.locator('#ee-shared-header .ee-nav-backdrop');
  await expect(nav).toBeHidden();
  await toggle.click();
  await expect(nav).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded','true');
  await expect(backdrop).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(nav).toBeHidden();
  await toggle.click();
  await backdrop.click({position:{x:5,y:page.viewportSize().height-20}});
  await expect(nav).toBeHidden();
});
