'use strict';
const {test,expect}=require('@playwright/test');

// El HTML de _includes/header.html es la única fuente de enlaces.
const mainPaths=[
  '/index.html',
  '/articulos.html',
  '/curso.html',
  '/examenes.html',
  '/repasar-leidos.html',
  '/perfil.html'
];
const morePaths=[
  '/writings.html',
  '/speaking-lab.html',
  '/comunidad.html',
  '/sugerencias.html'
];
async function checkMenu(page){
  await expect(page.locator('body > #ee-shared-header')).toHaveCount(1);
  const items=page.locator('#ee-primary-navigation > a');
  await expect(items).toHaveCount(mainPaths.length);
  expect(await items.evaluateAll(nodes=>nodes.map(node=>new URL(node.href).pathname))).toEqual(mainPaths);
  const more=page.locator('#ee-primary-navigation > details.ee-more');
  await expect(more).toHaveCount(1);
  await expect(more.locator('summary')).toHaveText(/Más/);
  const secondary=more.locator('.ee-more-panel > a');
  await expect(secondary).toHaveCount(morePaths.length);
  expect(await secondary.evaluateAll(nodes=>nodes.map(node=>new URL(node.href).pathname))).toEqual(morePaths);
  await expect(page.locator('#ee-primary-navigation a[href="/mi-vocabulario.html"]')).toHaveCount(0);
  await expect(page.locator('.ee-nav-toggle')).toHaveCount(1);
}
test('Las secciones públicas comparten exactamente el mismo menú',async({page})=>{
  for(const route of ['/index.html','/articulos.html','/curso.html','/examenes.html',
                       '/perfil.html','/mi-vocabulario.html','/speaking-lab.html',
                       '/comunidad.html','/sugerencias.html']){
    await page.goto(route,{waitUntil:'domcontentloaded'});
    await checkMenu(page);
  }
});
test('Perfil concentra el acceso al vocabulario y marca la sección correcta',async({page})=>{
  await page.goto('/mi-vocabulario.html',{waitUntil:'domcontentloaded'});
  await checkMenu(page);
  await expect(page.locator('#ee-primary-navigation > a[aria-current="page"]')).toHaveAttribute('href','/perfil.html');
  await page.goto('/perfil.html',{waitUntil:'domcontentloaded'});
  await expect(page.locator('main .hero-actions a[href="/mi-vocabulario.html"]')).toBeVisible();
  await expect(page.locator('#ee-primary-navigation > a[aria-current="page"]')).toHaveAttribute('href','/perfil.html');
});
test('Repaso y categorías activan su sección de navegación',async({page})=>{
  await page.goto('/repasar-leidos.html',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#ee-primary-navigation > a[aria-current="page"]')).toHaveAttribute('href','/repasar-leidos.html');
  await page.goto('/category/grammar.html',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#ee-primary-navigation > a[aria-current="page"]')).toHaveAttribute('href','/articulos.html');
});
test('Los artículos de Supabase sustituyen la navegación antigua sin duplicados',async({page,isMobile})=>{
  await page.goto('/leer.html?slug=present-perfect-vs-past-simple');
  await expect(page.locator('body.ee-unified-article')).toBeVisible({timeout:30000});
  await checkMenu(page);
  await expect(page.locator('body > footer')).toHaveCount(1);
  const toggle=page.locator('#ee-shared-header .ee-nav-toggle');
  await expect(toggle).not.toHaveAttribute('onclick',/.+/);
  if(isMobile){
    const nav=page.locator('#ee-primary-navigation');
    await expect(nav).toBeHidden();
    await toggle.click();
    await expect(nav).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded','true');
    await page.keyboard.press('Escape');
    await expect(nav).toBeHidden();
  }
});
